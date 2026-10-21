import Foundation
import AppKit
import CoreGraphics

/// The display-scope keyboard (official key / hold_key / type, §1.1) and open_application's launcher. Key events go to
/// the global HID stream from the same private-state source as GlobalInput, so they land wherever the keyboard focus is
/// — the frontmost app — as a person's keystrokes do, and (like GlobalInput's mouse events) they do not refresh the
/// user-input idle timers the user_actively_typing gate reads.
///
/// Every operation re-reads the gates before each keystroke (secure input, the user's own input in the last 200 ms,
/// the lock) and, when the caller names the frontmost pid it approved, stops as soon as another app is in front
/// (official H(): keystrokes follow key focus, so the rest is not sent). hold_key releases everything it pressed on
/// every exit. `abort()` (another thread: the call was cancelled) stops a running hold / type / repeat.
public enum GlobalKeys {
    /// Modifier names (keys.cjs normalized) → their key codes and flags, in the order they are pressed.
    static let modifiers: [String: (code: CGKeyCode, flag: CGEventFlags)] = [
        "ctrl": (59, .maskControl), "alt": (58, .maskAlternate), "shift": (56, .maskShift), "cmd": (55, .maskCommand),
        "fn": (63, .maskSecondaryFn),
    ]
    static let modifierOrder = ["ctrl", "alt", "shift", "cmd", "fn"]
    static let functionKeys: [CGKeyCode] = [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111, 105, 107, 113, 106, 64, 79, 80, 90]
    static let keypad: [String: CGKeyCode] = [
        "kp_0": 82, "kp_1": 83, "kp_2": 84, "kp_3": 85, "kp_4": 86, "kp_5": 87, "kp_6": 88, "kp_7": 89, "kp_8": 91, "kp_9": 92,
        "kp_decimal": 65, "kp_multiply": 67, "kp_add": 69, "kp_plus": 69, "kp_clear": 71, "kp_divide": 75, "kp_enter": 76,
        "kp_subtract": 78, "kp_minus": 78, "kp_equal": 81, "kp_equals": 81,
    ]
    static let aliases: [String: String] = [
        "minus": "-", "equal": "=", "equals": "=", "comma": ",", "period": ".", "slash": "/", "backslash": "\\",
        "semicolon": ";", "quote": "'", "apostrophe": "'", "grave": "`", "backtick": "`", "bracketleft": "[",
        "leftbracket": "[", "bracketright": "]", "rightbracket": "]", "forwarddelete": "forward_delete", "help": "insert",
        "arrowup": "up", "arrowdown": "down", "arrowleft": "left", "arrowright": "right", "pgup": "pageup", "pgdn": "pagedown",
        "spacebar": "space",
    ]

    /// The virtual key code of a (non-modifier) key name, or nil when it has none.
    public static func keyCode(_ raw: String) -> CGKeyCode? {
        let name = aliases[raw.lowercased()] ?? raw.lowercased()
        if let code = keypad[name] { return code }
        if name == "insert" { return 114 }
        if name.count >= 2, name.first == "f", let n = Int(name.dropFirst()), (1...functionKeys.count).contains(n) {
            return functionKeys[n - 1]
        }
        return Dispatcher.keyCode(for: name)
    }

    /// A chord's modifiers and keys → codes; unknown names are invalid_params (the caller validated them already).
    static func resolve(modifiers: [String], keys: [String]) throws -> (mods: [(CGKeyCode, CGEventFlags)], keys: [CGKeyCode]) {
        var seen = Set<String>(), mods: [(CGKeyCode, CGEventFlags)] = []
        for name in modifierOrder where modifiers.contains(name) && seen.insert(name).inserted {
            mods.append((Self.modifiers[name]!.code, Self.modifiers[name]!.flag))
        }
        if let unknown = modifiers.first(where: { Self.modifiers[$0] == nil }) { throw CUError.invalidParams("unknown modifier \(unknown)") }
        var codes: [CGKeyCode] = []
        for key in keys {
            if let mod = Self.modifiers[key.lowercased()] { if seen.insert(key.lowercased()).inserted { mods.append((mod.code, mod.flag)) }; continue }
            guard let code = keyCode(key) else { throw CUError.invalidParams("unknown key \(key)") }
            codes.append(code)
        }
        if mods.isEmpty && codes.isEmpty { throw CUError.invalidParams("the chord names no key") }
        return (mods, codes)
    }

    // MARK: cancellation

    // Cancellation is per operation: the main process gives each tool call's delivery an id (opId), the same id on every
    // retry of it (executor.cjs deliver backs off and calls again after user_actively_typing). An abort of that id stays
    // in force across the retries, so a Stop that lands between two attempts is not cleared by the next attempt's begin().
    private static let lock = NSLock()
    nonisolated(unsafe) private static var aborted = false
    nonisolated(unsafe) private static var currentOp: Int? = nil
    nonisolated(unsafe) private static var abortedOps: [Int] = []   // the last cancelled operation ids (bounded)
    nonisolated(unsafe) private static var heldKeys = 0
    /// An operation starts: cancelled already when its id was aborted before (between retries); without an id, uncancelled.
    static func begin(_ op: Int? = nil) {
        lock.lock(); currentOp = op; aborted = op.map { abortedOps.contains($0) } ?? false; lock.unlock()
    }
    static var isAborted: Bool { lock.lock(); defer { lock.unlock() }; return aborted }
    private static func remember(_ op: Int) {
        if !abortedOps.contains(op) { abortedOps.append(op); if abortedOps.count > 64 { abortedOps.removeFirst() } }
    }
    /// Stop a hold / type / repeat (the tool call was cancelled). With an id: that operation, now and on any later retry
    /// of it; without one: whatever runs now (and its later retries). Harmless when nothing runs.
    public static func abort(_ op: Int? = nil) {
        lock.lock()
        if let op {
            remember(op)
            if currentOp == op { aborted = true }
        } else {
            if let running = currentOp { remember(running) }
            aborted = true
        }
        lock.unlock()
    }
    /// How many keys a hold_key has down right now (hidState).
    public static var held: Int { lock.lock(); defer { lock.unlock() }; return heldKeys }
    static func setHeld(_ n: Int) { lock.lock(); heldKeys = n; lock.unlock() }

    // MARK: events

    // The events themselves are built by GlobalInput (DisplayInput.swift): one event construction point per scope.
    static func keyEvent(_ source: CGEventSource, _ code: CGKeyCode, down: Bool, flags: CGEventFlags) throws -> CGEvent {
        try GlobalInput.keyEvent(source, code, down: down, flags: flags)
    }

    static func modifierEvent(_ source: CGEventSource, _ code: CGKeyCode, flags: CGEventFlags) throws -> CGEvent {
        try GlobalInput.flagsChangedEvent(source, code, flags: flags)
    }

    /// Press the chord down: each modifier (flagsChanged, the flags accumulating), then each key. Returns the flags.
    static func pressDown(_ source: CGEventSource, _ chord: (mods: [(CGKeyCode, CGEventFlags)], keys: [CGKeyCode])) throws -> CGEventFlags {
        var flags: CGEventFlags = []
        for (code, flag) in chord.mods {
            flags.insert(flag)
            GlobalInput.post(try modifierEvent(source, code, flags: flags))
        }
        for code in chord.keys { GlobalInput.post(try keyEvent(source, code, down: true, flags: flags)) }
        return flags
    }

    /// Let the chord go: the keys in reverse, then the modifiers in reverse. Never throws: a release must always go out.
    static func releaseUp(_ source: CGEventSource, _ chord: (mods: [(CGKeyCode, CGEventFlags)], keys: [CGKeyCode]), flags start: CGEventFlags) {
        var flags = start
        for code in chord.keys.reversed() { if let e = try? keyEvent(source, code, down: false, flags: flags) { GlobalInput.post(e) } }
        for (code, flag) in chord.mods.reversed() {
            flags.remove(flag)
            if let e = try? modifierEvent(source, code, flags: flags) { GlobalInput.post(e) }
        }
    }

    /// The per-keystroke checks: cancelled, the gates, the frontmost app still the approved one. nil to go on.
    static func stop(frontPid: Int32?) -> [String: Any]? {
        if isAborted { return ["reasonCode": "aborted"] }
        if let reason = GlobalInput.refusal() { return ["reasonCode": reason] }
        if let frontPid {
            let now = PointOwner.frontmost()
            if (now["pid"] as? Int).map(Int32.init) != frontPid {
                return ["reasonCode": "delivery_focus_check_failed", "frontmostBundleId": now["bundleId"] ?? NSNull()]
            }
        }
        return nil
    }

    static func refused(_ stop: [String: Any], _ extra: [String: Any]) -> [String: Any] {
        ["outcome": "unsupported", "delivered": false].merging(stop) { _, b in b }.merging(extra) { _, b in b }
    }

    /// key: press and release the chord `times` times, 8 ms apart (official gi()).
    public static func press(modifiers: [String], keys: [String], times: Int, frontPid: Int32?, opId: Int? = nil) throws -> [String: Any] {
        guard (1...100).contains(times) else { throw CUError.invalidParams("repeat must be 1–100") }
        let chord = try resolve(modifiers: modifiers, keys: keys)
        let source = try GlobalInput.source()
        begin(opId)
        for i in 0..<times {
            if i > 0 { usleep(8_000) }
            if let stop = stop(frontPid: frontPid) { return refused(stop, ["delivered": i > 0, "pressed": i, "times": times]) }
            let flags = try pressDown(source, chord)
            releaseUp(source, chord, flags: flags)
        }
        return ["outcome": "ok", "delivered": true, "pressed": times, "times": times]
    }

    /// hold_key: press the chord, keep it down `milliseconds` (checking for a cancel every 50 ms), release it.
    public static func hold(modifiers: [String], keys: [String], milliseconds: Int, frontPid: Int32?, opId: Int? = nil) throws -> [String: Any] {
        guard (0...100_000).contains(milliseconds) else { throw CUError.invalidParams("duration must be 0–100 seconds") }
        let chord = try resolve(modifiers: modifiers, keys: keys)
        let source = try GlobalInput.source()
        begin(opId)
        if let stop = stop(frontPid: frontPid) { return refused(stop, ["heldMs": 0]) }
        let started = Date()
        let flags = try pressDown(source, chord)
        setHeld(chord.mods.count + chord.keys.count)
        defer { releaseUp(source, chord, flags: flags); setHeld(0) }
        let deadline = started.addingTimeInterval(Double(milliseconds) / 1000)
        var wasAborted = false
        while Date() < deadline {
            if isAborted { wasAborted = true; break }
            usleep(UInt32(min(50_000, max(1_000, deadline.timeIntervalSinceNow * 1_000_000))))
        }
        let heldMs = Int((Date().timeIntervalSince(started) * 1000).rounded())
        return ["outcome": wasAborted ? "unsupported" : "ok", "delivered": true, "heldMs": heldMs, "released": true,
                "reasonCode": wasAborted ? "aborted" : NSNull()]
    }

    /// type, one grapheme at a time (official hi() without typePaced): 8 ms before each; a newline is the return key,
    /// a tab the tab key, anything else a key event carrying the grapheme as its Unicode string.
    public static func type(_ text: String, frontPid: Int32?, opId: Int? = nil) throws -> [String: Any] {
        let graphemes = Array(text)
        let source = try GlobalInput.source()
        begin(opId)
        for (i, g) in graphemes.enumerated() {
            usleep(8_000)
            if let stop = stop(frontPid: frontPid) {
                return refused(stop, ["delivered": i > 0, "typed": i, "total": graphemes.count])
            }
            if g == "\n" || g == "\r" || g == "\r\n" || g == "\t" {
                let code: CGKeyCode = g == "\t" ? 48 : 36
                GlobalInput.post(try keyEvent(source, code, down: true, flags: []))
                GlobalInput.post(try keyEvent(source, code, down: false, flags: []))
                continue
            }
            let units = Array(String(g).utf16)
            var start = 0
            while start < units.count {
                var end = min(units.count, start + 20)
                if end < units.count, (0xD800...0xDBFF).contains(units[end - 1]) { end -= 1 }
                var chunk = Array(units[start..<end])
                for down in [true, false] {
                    let e = try keyEvent(source, 0, down: down, flags: [])
                    e.keyboardSetUnicodeString(stringLength: chunk.count, unicodeString: &chunk)
                    GlobalInput.post(e)
                }
                start = end
            }
        }
        return ["outcome": "ok", "delivered": !graphemes.isEmpty, "typed": graphemes.count, "total": graphemes.count]
    }
}

/// open_application (official xi() / openApp): launch or bring forward an installed app by bundle id.
public enum AppLauncher {
    public static func open(bundleId: String, activates: Bool) throws -> [String: Any] {
        guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else {
            throw CUError("app_not_installed", "No installed app has the bundle identifier \(bundleId).")
        }
        let wasRunning = !NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).isEmpty
        let config = NSWorkspace.OpenConfiguration()
        config.activates = activates
        config.addsToRecentItems = false
        let done = DispatchSemaphore(value: 0)
        let box = LaunchBox()
        NSWorkspace.shared.openApplication(at: url, configuration: config) { app, error in
            box.set(pid: app?.processIdentifier, error: error?.localizedDescription)
            done.signal()
        }
        guard done.wait(timeout: .now() + 15) == .success else {
            throw CUError("open_timeout", "\(bundleId) did not finish opening within 15 seconds.")
        }
        let (pid, error) = box.get()
        if let error { throw CUError("open_failed", "\(bundleId) could not be opened: \(error)") }
        return ["bundleId": bundleId, "pid": pid.map { Int($0) as Any } ?? NSNull(), "wasRunning": wasRunning, "activates": activates]
    }

    final class LaunchBox: @unchecked Sendable {
        private let lock = NSLock()
        private var pid: pid_t?
        private var error: String?
        func set(pid: pid_t?, error: String?) { lock.lock(); self.pid = pid; self.error = error; lock.unlock() }
        func get() -> (pid_t?, String?) { lock.lock(); defer { lock.unlock() }; return (pid, error) }
    }
}
