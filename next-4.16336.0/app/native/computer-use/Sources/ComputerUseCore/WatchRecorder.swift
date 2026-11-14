import Foundation
import CoreGraphics
import AppKit
import ScreenCaptureKit

/// Watch-record's recorder (docs/computer-use-official-spec-20261021.md §2.4.3): the user's clicks, drags, scrolls and
/// key presses while they demonstrate a workflow, and the screen frames the main process samples meanwhile. The
/// 2.42304.0 original is @ant/claude-swift's WatchRecorder (swift_addon.node: "WatchRecorder monitors installed",
/// `watchRecordInput` events with kind / t / x / y / modifiers / keyCode / chars / charsIgnoringModifiers / secureInput
/// / scrollDX / scrollDY, `nowT`).
///
/// Here the input comes from a **listen-only** CGEventTap (kCGEventTapOptionListenOnly) on its own thread: it observes,
/// never blocks, alters or injects anything. The original's NSEvent global monitors are the same kind of passive tap;
/// a CGEventTap works without the Cocoa main run loop, which this module's N-API calls do not have. The events wait in
/// a buffer the main process drains (`watchRecordDrain`, every 100 ms) — this module's calls are request / reply only.
///
/// Secure input (a password field or anything else holding secure event input, kCGSSessionSecureInputPID or
/// IsSecureEventInputEnabled): a key press is recorded as `{kind: "key", t, secureInput: true}` with no key code and no
/// characters, so nothing typed into it is ever kept; the trajectory shows "[secure input]" (watch-record-trajectory.cjs
/// typingActions, the original's BIa).
public final class WatchRecorder: @unchecked Sendable {
    public static let shared = WatchRecorder()

    // NSEvent / CGEventFlags modifier bits the recorder keeps (the original's KLa: shift | control | option | command).
    public static let keptModifiers: UInt64 = CGEventFlags.maskShift.rawValue | CGEventFlags.maskControl.rawValue
        | CGEventFlags.maskAlternate.rawValue | CGEventFlags.maskCommand.rawValue
    // A recording is at most 10 minutes (the main process stops it); this only bounds an undrained buffer.
    static let maxBuffered = 50_000

    private let lock = NSLock()
    private var buffer: [[String: Any]] = []
    private var startedAt: TimeInterval = 0
    private var recording = false
    private var tap: CFMachPort?
    private var runLoop: CFRunLoop?
    private var thread: Thread?
    private var dropped = 0

    /// Milliseconds since `start` on the monotonic clock (the original's nowT).
    public func nowT() -> Double {
        lock.lock(); defer { lock.unlock() }
        return recording || startedAt > 0 ? (ProcessInfo.processInfo.systemUptime - startedAt) * 1000 : 0
    }

    public var isRecording: Bool { lock.lock(); defer { lock.unlock() }; return recording }

    /// Install the tap and start the clock. Throws `already_recording`, or `input_monitoring_denied` when the system
    /// refuses the tap (Accessibility / Input Monitoring not granted).
    public func start() throws -> [String: Any] {
        lock.lock()
        if recording { lock.unlock(); throw CUError("already_recording", "WatchRecorder.start called while already recording") }
        buffer = []
        dropped = 0
        startedAt = ProcessInfo.processInfo.systemUptime
        recording = true
        lock.unlock()

        let ready = DispatchSemaphore(value: 0)
        var installed = false
        let worker = Thread { [weak self] in
            guard let self else { ready.signal(); return }
            let mask = [CGEventType.leftMouseDown, .leftMouseUp, .rightMouseDown, .rightMouseUp, .scrollWheel, .keyDown]
                .reduce(CGEventMask(0)) { $0 | (CGEventMask(1) << $1.rawValue) }
            let info = Unmanaged.passUnretained(self).toOpaque()
            guard let port = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .tailAppendEventTap, options: .listenOnly,
                                               eventsOfInterest: mask, callback: watchRecordTapCallback, userInfo: info) else {
                ready.signal()
                return
            }
            let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
            let loop = CFRunLoopGetCurrent()
            CFRunLoopAddSource(loop, source, .commonModes)
            CGEvent.tapEnable(tap: port, enable: true)
            self.lock.lock(); self.tap = port; self.runLoop = loop; self.lock.unlock()
            installed = true
            ready.signal()
            CFRunLoopRun()
            CFRunLoopRemoveSource(loop, source, .commonModes)
        }
        worker.name = "watch-record-input"
        worker.start()
        ready.wait()
        if !installed {
            lock.lock(); recording = false; startedAt = 0; lock.unlock()
            throw CUError("input_monitoring_denied", "The system refused the input listener (Accessibility / Input Monitoring is not granted).")
        }
        lock.lock(); thread = worker; lock.unlock()
        WatchRecorderLog.write("WatchRecorder monitors installed")
        return ["started": true]
    }

    /// Remove the tap; what is still buffered stays for a last drain.
    public func stop() -> [String: Any] {
        lock.lock()
        let wasRecording = recording
        recording = false
        let port = tap, loop = runLoop
        tap = nil; runLoop = nil; thread = nil
        lock.unlock()
        if let port { CGEvent.tapEnable(tap: port, enable: false); CFMachPortInvalidate(port) }
        if let loop { CFRunLoopStop(loop) }
        if wasRecording { WatchRecorderLog.write("WatchRecorder monitors removed") }
        return ["stopped": wasRecording]
    }

    /// The events since the last drain (oldest first) and the clock now.
    public func drain() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        let events = buffer
        buffer = []
        let now = startedAt > 0 ? (ProcessInfo.processInfo.systemUptime - startedAt) * 1000 : 0
        let lost = dropped
        dropped = 0
        return ["events": events, "nowT": now, "dropped": lost]
    }

    /// Drop everything buffered (a discarded recording).
    public func clear() {
        lock.lock(); buffer = []; dropped = 0; startedAt = 0; lock.unlock()
    }

    fileprivate func handle(_ type: CGEventType, _ event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            lock.lock(); let port = tap; lock.unlock()
            if let port { CGEvent.tapEnable(tap: port, enable: true) }
            return
        }
        lock.lock()
        guard recording else { lock.unlock(); return }
        let t = (ProcessInfo.processInfo.systemUptime - startedAt) * 1000
        lock.unlock()
        let payload: [String: Any]?
        switch type {
        case .leftMouseDown, .leftMouseUp, .rightMouseDown, .rightMouseUp:
            payload = Self.pointerPayload(kind: Self.kindName(type), t: t, location: event.location, flags: event.flags.rawValue)
        case .scrollWheel:
            payload = Self.scrollPayload(t: t, location: event.location, flags: event.flags.rawValue,
                                         dx: event.getDoubleValueField(.scrollWheelEventPointDeltaAxis2),
                                         dy: event.getDoubleValueField(.scrollWheelEventPointDeltaAxis1))
        case .keyDown:
            let secure = SessionState.secureInputPid != 0 || IsSecureEventInputEnabledShim()
            if secure {
                payload = Self.keyPayload(t: t, flags: event.flags.rawValue, keyCode: nil, chars: nil, charsIgnoringModifiers: nil, secure: true)
            } else {
                // NSEvent's characters, as the original's NSEvent monitor reports them: function keys (arrows, F1–F12, Home…)
                // come as their private-use characters, which the trajectory names (watch-record-trajectory.cjs EIa).
                let ns = NSEvent(cgEvent: event)
                payload = Self.keyPayload(t: t, flags: event.flags.rawValue,
                                          keyCode: Int(event.getIntegerValueField(.keyboardEventKeycode)),
                                          chars: ns?.characters, charsIgnoringModifiers: ns?.charactersIgnoringModifiers, secure: false)
            }
        default:
            payload = nil
        }
        guard let payload else { return }
        lock.lock()
        if recording {
            if buffer.count < Self.maxBuffered { buffer.append(payload) } else { dropped += 1 }
        }
        lock.unlock()
    }

    static func kindName(_ type: CGEventType) -> String {
        switch type {
        case .leftMouseDown: return "leftMouseDown"
        case .leftMouseUp: return "leftMouseUp"
        case .rightMouseDown: return "rightMouseDown"
        case .rightMouseUp: return "rightMouseUp"
        case .scrollWheel: return "scrollWheel"
        default: return "key"
        }
    }

    /// A press or release at a global point (top-left origin, points: Electron's screen coordinates).
    public static func pointerPayload(kind: String, t: Double, location: CGPoint, flags: UInt64) -> [String: Any] {
        ["kind": kind, "t": t, "x": Double(location.x), "y": Double(location.y), "modifiers": Int(flags & keptModifiers)]
    }

    /// A wheel event: dy > 0 is the wheel turned up (the trajectory says "scrolled up").
    public static func scrollPayload(t: Double, location: CGPoint, flags: UInt64, dx: Double, dy: Double) -> [String: Any] {
        ["kind": "scrollWheel", "t": t, "x": Double(location.x), "y": Double(location.y), "modifiers": Int(flags & keptModifiers),
         "scrollDX": dx, "scrollDY": dy]
    }

    /// A key press. Under secure input only the moment and the modifiers are kept: no key code, no characters.
    public static func keyPayload(t: Double, flags: UInt64, keyCode: Int?, chars: String?, charsIgnoringModifiers: String?, secure: Bool) -> [String: Any] {
        var payload: [String: Any] = ["kind": "key", "t": t, "modifiers": Int(flags & keptModifiers)]
        if secure {
            payload["secureInput"] = true
            return payload
        }
        if let keyCode { payload["keyCode"] = keyCode }
        if let chars { payload["chars"] = chars }
        if let charsIgnoringModifiers { payload["charsIgnoringModifiers"] = charsIgnoringModifiers }
        return payload
    }

    /// One screen frame for the trajectory (the original's cIa: the display under the cursor, every app's windows but
    /// this app's own — the chooser, the pill and the glow never show — scaled to the screenshot token budget, JPEG 0.75),
    /// with the frontmost app at that moment.
    public static func frame(displayId: UInt32?) async throws -> [String: Any] {
        try Capture.ensureAccess()
        let content = try await Capture.content()
        let display: SCDisplay
        if let displayId, let found = content.displays.first(where: { $0.displayID == displayId }) {
            display = found
        } else {
            guard let main = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) ?? content.displays.first else {
                throw CUError("display_not_found", "No display.")
            }
            display = main
        }
        let ownPid = ProcessInfo.processInfo.processIdentifier
        let ownBundle = Bundle.main.bundleIdentifier
        let own = content.applications.filter { $0.processID == ownPid || (ownBundle != nil && $0.bundleIdentifier == ownBundle) }
        let filter = SCContentFilter(display: display, excludingApplications: own, exceptingWindows: [])
        let factor = Double(filter.pointPixelScale)
        let frame = (Int((Double(display.width) * factor).rounded()), Int((Double(display.height) * factor).rounded()))
        let (w, h) = TokenBudget.fit(width: frame.0, height: frame.1)
        let dataUrl = try await Capture.shoot(filter, w, h, singleWindow: false)
        let base64 = dataUrl.components(separatedBy: ",").last ?? ""
        let front = NSWorkspace.shared.frontmostApplication
        return [
            "base64": base64, "width": w, "height": h,
            "displayId": Int(display.displayID), "displayWidth": display.width, "displayHeight": display.height,
            "frontmost": front.map { ["bundleId": $0.bundleIdentifier ?? NSNull(), "appName": $0.localizedName ?? ""] as [String: Any] } ?? NSNull(),
        ]
    }
}

private func watchRecordTapCallback(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent, info: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
    if let info { Unmanaged<WatchRecorder>.fromOpaque(info).takeUnretainedValue().handle(type, event) }
    // Listen-only: the return value is ignored by the system; the event passes untouched.
    return Unmanaged.passUnretained(event)
}

// HIToolbox's IsSecureEventInputEnabled, looked up at run time (Carbon is not otherwise linked).
private let secureEventInputFn: (@convention(c) () -> DarwinBoolean)? = {
    guard let handle = dlopen("/System/Library/Frameworks/Carbon.framework/Carbon", RTLD_LAZY),
          let symbol = dlsym(handle, "IsSecureEventInputEnabled") else { return nil }
    return unsafeBitCast(symbol, to: (@convention(c) () -> DarwinBoolean).self)
}()
func IsSecureEventInputEnabledShim() -> Bool { secureEventInputFn?().boolValue ?? false }

enum WatchRecorderLog {
    static func write(_ line: String) {
        FileHandle.standardError.write(Data("[watch-record] \(line)\n".utf8))
    }
}
