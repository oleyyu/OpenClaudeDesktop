import Foundation
import AppKit
import CoreGraphics
import ApplicationServices

/// The display-scope layer (official §1.1 / §1.4.6): the displays, who owns the point under the pointer, the frontmost
/// app, and input posted to the global HID stream — the real cursor moves, as the official full-screen tools do.
///
/// Telling our own events from the user's (the user_actively_typing gate): every event here comes from a
/// `.privateState` event source. Measured on this Mac (2026-10-21, scratchpad probe): a mouse move posted to the HID tap
/// from a private-state source moves the cursor, and refreshes neither `secondsSinceLastEventType(.hidSystemState)` nor
/// `(.combinedSessionState)`; the same event from a `.hidSystemState` source resets both to 0. So the idle timers the
/// gates read keep measuring the user's own input only, and the gate needs no exclusion of ours. Each event also carries
/// `eventSourceUserData = marker` (diagnostics; anything tapping events can recognize ours), and the time of our last
/// post is kept for the probe (`secondsSinceOwnInput`).
public enum Displays {
    public struct Info {
        public let displayId: UInt32
        public let bounds: CGRect        // global points, top-left origin (CGDisplayBounds)
        public let pixelWidth: Int
        public let pixelHeight: Int
        public let isMain: Bool
        public let name: String?

        public var scaleFactor: Double { bounds.width > 0 ? Double(pixelWidth) / Double(bounds.width) : 1 }

        public var json: [String: Any] {
            ["displayId": Int(displayId), "bounds": rectJSON(bounds), "pixelWidth": pixelWidth, "pixelHeight": pixelHeight,
             "scaleFactor": scaleFactor, "isMain": isMain, "name": name ?? NSNull()]
        }
    }

    static func names() -> [UInt32: String] {
        var out: [UInt32: String] = [:]
        for screen in NSScreen.screens {
            if let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber {
                out[number.uint32Value] = screen.localizedName
            }
        }
        return out
    }

    /// The active displays, the main one first.
    public static func list() -> [Info] {
        var count: UInt32 = 0
        guard CGGetActiveDisplayList(0, nil, &count) == .success, count > 0 else { return [] }
        var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
        guard CGGetActiveDisplayList(count, &ids, &count) == .success else { return [] }
        let names = names(), main = CGMainDisplayID()
        return ids.prefix(Int(count)).map { id in
            let bounds = CGDisplayBounds(id)
            let mode = CGDisplayCopyDisplayMode(id)
            return Info(displayId: id, bounds: bounds, pixelWidth: mode?.pixelWidth ?? Int(bounds.width),
                        pixelHeight: mode?.pixelHeight ?? Int(bounds.height), isMain: id == main, name: names[id])
        }.sorted { a, b in a.isMain && !b.isMain }
    }

    /// The display a global point lies on, or nil (official ft(): hit_test_off_display).
    public static func containing(_ point: CGPoint, in displays: [Info] = list()) -> Info? {
        displays.first { $0.bounds.contains(point) }
    }
}

public enum PointOwner {
    /// The frontmost app through Accessibility (NSWorkspace's cache does not refresh off the main run loop).
    public static func frontmost() -> [String: Any] {
        guard let pid = WindowShow.frontmostPid() else { return ["pid": NSNull(), "bundleId": NSNull()] }
        return ["pid": Int(pid), "bundleId": WindowList.bundleId(pid: pid) ?? NSNull()]
    }

    /// The topmost on-screen window at a global point, front to back, skipping fully transparent windows and the ones
    /// in `ignoring` (the app's own click-through overlays: the glow and the pointer). {windowId, pid, bundleId, layer,
    /// ownerName} or nil when nothing is there.
    public static func at(_ point: CGPoint, ignoring: Set<UInt32>) -> [String: Any]? {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] else { return nil }
        for info in list {
            guard let number = info[kCGWindowNumber as String] as? NSNumber else { continue }
            let windowId = number.uint32Value
            if ignoring.contains(windowId) { continue }
            if let alpha = info[kCGWindowAlpha as String] as? NSNumber, alpha.doubleValue <= 0 { continue }
            guard let boundsDict = info[kCGWindowBounds as String] as? NSDictionary,
                  let bounds = CGRect(dictionaryRepresentation: boundsDict), bounds.contains(point) else { continue }
            let pid = (info[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value ?? 0
            return ["windowId": Int(windowId), "pid": Int(pid), "bundleId": WindowList.bundleId(pid: pid) ?? NSNull(),
                    "layer": (info[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0,
                    "ownerName": info[kCGWindowOwnerName as String] as? String ?? NSNull()]
        }
        return nil
    }
}

public enum GlobalInput {
    /// eventSourceUserData on every event posted here ("CUOC").
    public static let marker: Int64 = 0x4355_4F43

    private static let lock = NSLock()
    nonisolated(unsafe) private static var lastPost: Date?

    /// Seconds since this module last posted an event, or nil if it never has (probe: secondsSinceOwnInput).
    public static var secondsSinceOwnInput: Double? {
        lock.lock(); defer { lock.unlock() }
        return lastPost.map { Date().timeIntervalSince($0) }
    }

    static func source() throws -> CGEventSource {
        guard !EventFactory.forcedFailure, let source = CGEventSource(stateID: .privateState) else {
            throw CUError("scgevent_unavailable", "A private-state CGEventSource could not be created; display input is unavailable.")
        }
        return source
    }

    static func post(_ event: CGEvent) {
        event.setIntegerValueField(.eventSourceUserData, value: marker)
        event.post(tap: .cghidEventTap)
        lock.lock(); lastPost = Date(); lock.unlock()
    }

    /// The real cursor, global points.
    public static var cursor: CGPoint { CGEvent(source: nil)?.location ?? .zero }

    /// The gates re-read at the moment of posting (the main process already checked a probe): secure input, the user's
    /// own input in the last 200 ms (hardware, see above), the lock.
    public static func refusal() -> String? {
        if SessionState.secureInputPid != 0 { return "secure_input_active" }
        if SessionState.secondsSinceUserInput < SessionState.typingWindow { return "user_actively_typing" }
        if SessionState.screenLocked { return "screen_locked" }
        return nil
    }

    static func checked(_ point: CGPoint) throws {
        guard Displays.containing(point) != nil else {
            throw CUError("hit_test_off_display", "The point (\(point.x), \(point.y)) is not on any display.")
        }
    }

    /// Interpolated cursor path for a visible move (official mouseAnimation, default on): ≤ 10 steps, ≈ 8 ms apart.
    public static func path(from: CGPoint, to: CGPoint, steps fixed: Int? = nil) -> [CGPoint] {
        let distance = hypot(to.x - from.x, to.y - from.y)
        let steps = fixed.map { max(1, $0) } ?? max(1, min(10, Int((distance / 40).rounded(.up))))
        return (1...steps).map { i in
            let t = CGFloat(i) / CGFloat(steps)
            return CGPoint(x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t)
        }
    }

    /// The left button this module pressed (left_mouse_down) and has not released yet: moves while it is down are drags
    /// (leftMouseDragged), as the official module flag Q.
    nonisolated(unsafe) private static var held = false
    public static var isHeld: Bool { lock.lock(); defer { lock.unlock() }; return held }
    static func setHeld(_ value: Bool) { lock.lock(); held = value; lock.unlock() }

    static func moveEvents(_ source: CGEventSource, to point: CGPoint, animate: Bool, steps: Int? = nil) {
        let points = animate ? path(from: cursor, to: point, steps: steps) : [point]
        let type: CGEventType = isHeld ? .leftMouseDragged : .mouseMoved
        for p in points {
            if let e = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: p, mouseButton: .left) {
                if type == .leftMouseDragged { e.setIntegerValueField(.mouseEventClickState, value: 1) }
                post(e)
            }
            if points.count > 1 { usleep(8_000) }
        }
    }

    /// mouse_move: {from, to, dragging}. While the left button is held (left_mouse_down) the move is a drag.
    public static func move(to point: CGPoint, animate: Bool = true) throws -> [String: Any] {
        try checked(point)
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false] }
        let source = try source()
        let from = cursor
        moveEvents(source, to: point, animate: animate)
        return ["outcome": "ok", "delivered": true, "dragging": isHeld, "from": ["x": from.x, "y": from.y], "to": ["x": point.x, "y": point.y]]
    }

    /// left_mouse_down: press the left button at the real cursor and keep it down (official Ri()). Already held →
    /// state_conflict, nothing posted.
    public static func mouseDown() throws -> [String: Any] {
        if isHeld { return ["outcome": "unsupported", "reasonCode": "state_conflict", "delivered": false, "held": true] }
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false] }
        let source = try source()
        let at = cursor
        guard let e = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: at, mouseButton: .left) else {
            throw CUError("scgevent_unavailable", "A mouse event could not be created.")
        }
        e.setIntegerValueField(.mouseEventClickState, value: 1)
        post(e)
        setHeld(true)
        return ["outcome": "ok", "delivered": true, "held": true, "at": ["x": at.x, "y": at.y]]
    }

    /// left_mouse_up: release the left button at the real cursor (official zi()). Not held → nothing posted, still ok
    /// ("safe to call"). Never gated: a held button must always be releasable.
    public static func mouseUp() throws -> [String: Any] {
        let at = cursor
        guard isHeld else { return ["outcome": "ok", "delivered": false, "wasHeld": false, "at": ["x": at.x, "y": at.y]] }
        let source = try source()
        guard let e = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: at, mouseButton: .left) else {
            throw CUError("scgevent_unavailable", "A mouse event could not be created.")
        }
        e.setIntegerValueField(.mouseEventClickState, value: 1)
        post(e)
        setHeld(false)
        return ["outcome": "ok", "delivered": true, "wasHeld": true, "at": ["x": at.x, "y": at.y]]
    }

    /// left_click_drag (official vi() → executor.drag): move to `from` (when given), press, wait 50 ms, move to `to`
    /// along an animated path of drag events, release. The gates are re-read before the press and before the release
    /// path; the button is released on every exit once pressed.
    public static func drag(from: CGPoint?, to: CGPoint) throws -> [String: Any] {
        if let from { try checked(from) }
        try checked(to)
        if isHeld { return ["outcome": "unsupported", "reasonCode": "state_conflict", "delivered": false, "held": true] }
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false] }
        let source = try source()
        if let from { moveEvents(source, to: from, animate: true) }
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false, "moved": from != nil] }
        let start = cursor
        guard let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: start, mouseButton: .left) else {
            throw CUError("scgevent_unavailable", "A mouse event could not be created.")
        }
        down.setIntegerValueField(.mouseEventClickState, value: 1)
        post(down)
        setHeld(true)
        var interrupted: String?
        defer {
            let end = cursor
            if let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: end, mouseButton: .left) {
                up.setIntegerValueField(.mouseEventClickState, value: 1)
                post(up)
            }
            setHeld(false)
        }
        usleep(50_000)
        let points = path(from: start, to: to, steps: 20)
        for p in points {
            if let reason = refusal() { interrupted = reason; break }
            if let e = CGEvent(mouseEventSource: source, mouseType: .leftMouseDragged, mouseCursorPosition: p, mouseButton: .left) {
                e.setIntegerValueField(.mouseEventClickState, value: 1)
                post(e)
            }
            usleep(10_000)
        }
        if let interrupted {
            return ["outcome": "unsupported", "reasonCode": interrupted, "delivered": true, "partial": true,
                    "from": ["x": start.x, "y": start.y], "to": ["x": cursor.x, "y": cursor.y]]
        }
        usleep(30_000)
        return ["outcome": "ok", "delivered": true, "from": ["x": start.x, "y": start.y], "to": ["x": to.x, "y": to.y]]
    }

    static func buttonTypes(_ button: String) -> (CGMouseButton, CGEventType, CGEventType)? {
        switch button {
        case "left": return (.left, .leftMouseDown, .leftMouseUp)
        case "right": return (.right, .rightMouseDown, .rightMouseUp)
        case "middle": return (.center, .otherMouseDown, .otherMouseUp)
        default: return nil
        }
    }

    /// left/right/middle click, count 1–3, modifier flags held for the click: the cursor moves there first.
    public static func click(at point: CGPoint, button: String, count: Int, flags: CGEventFlags = [], animate: Bool = true) throws -> [String: Any] {
        guard let (mouseButton, downType, upType) = buttonTypes(button) else { throw CUError.invalidParams("button must be left, right or middle") }
        guard (1...3).contains(count) else { throw CUError.invalidParams("count must be 1, 2 or 3") }
        try checked(point)
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false] }
        let source = try source()
        // A button still held by left_mouse_down is released first (official mi()).
        if isHeld { _ = try mouseUp() }
        moveEvents(source, to: point, animate: animate)
        for click in 1...count {
            // The gate is re-read before every press: the user may have started typing during the move.
            if let reason = refusal() {
                return ["outcome": "unsupported", "reasonCode": reason, "delivered": click > 1, "clicksDelivered": click - 1]
            }
            for type in [downType, upType] {
                guard let e = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: point, mouseButton: mouseButton) else {
                    throw CUError("scgevent_unavailable", "A mouse event could not be created.")
                }
                e.setIntegerValueField(.mouseEventClickState, value: Int64(click))
                e.flags = flags
                post(e)
                usleep(10_000)
            }
            if click < count { usleep(40_000) }
        }
        return ["outcome": "ok", "delivered": true, "clicksDelivered": count, "at": ["x": point.x, "y": point.y]]
    }

    /// scroll at a point, in wheel lines (official scroll_amount "clicks"); dy > 0 is down, dx > 0 is right.
    public static func scroll(at point: CGPoint, dx: Int32, dy: Int32, animate: Bool = true) throws -> [String: Any] {
        try checked(point)
        if let reason = refusal() { return ["outcome": "unsupported", "reasonCode": reason, "delivered": false] }
        let source = try source()
        moveEvents(source, to: point, animate: animate)
        // CGEvent wheel: positive wheel1 scrolls content up (toward the top), so "down" is negative.
        guard let e = CGEvent(scrollWheelEvent2Source: source, units: .line, wheelCount: 2, wheel1: -dy, wheel2: -dx, wheel3: 0) else {
            throw CUError("scgevent_unavailable", "A scroll event could not be created.")
        }
        e.location = point
        post(e)
        return ["outcome": "ok", "delivered": true, "at": ["x": point.x, "y": point.y], "dx": Int(dx), "dy": Int(dy)]
    }

    /// A global key event (display-scope key / hold_key / type, DisplayKeys.swift). Built here so this file stays the
    /// one place the display scope constructs events.
    static func keyEvent(_ source: CGEventSource, _ code: CGKeyCode, down: Bool, flags: CGEventFlags) throws -> CGEvent {
        guard let e = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: down) else {
            throw CUError("scgevent_unavailable", "A key event could not be created.")
        }
        e.flags = flags
        return e
    }

    /// A modifier key's flagsChanged event carrying the accumulated flags.
    static func flagsChangedEvent(_ source: CGEventSource, _ code: CGKeyCode, flags: CGEventFlags) throws -> CGEvent {
        let e = try keyEvent(source, code, down: true, flags: flags)
        e.type = .flagsChanged
        return e
    }

    /// Modifier names (keys.cjs normalized) → flags.
    public static func flags(_ names: [String]) throws -> CGEventFlags {
        var flags: CGEventFlags = []
        for name in names {
            switch name {
            case "cmd": flags.insert(.maskCommand)
            case "shift": flags.insert(.maskShift)
            case "alt": flags.insert(.maskAlternate)
            case "ctrl": flags.insert(.maskControl)
            case "fn": flags.insert(.maskSecondaryFn)
            default: throw CUError.invalidParams("unknown modifier \(name)")
            }
        }
        return flags
    }
}
