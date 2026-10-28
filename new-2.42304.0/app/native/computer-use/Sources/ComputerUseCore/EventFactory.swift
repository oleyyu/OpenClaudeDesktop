import Foundation
import CoreGraphics

/// The one place raw input is built (M3): the event source, the Target — pid, window, screen point and window-local
/// point — and every CGEvent. Dispatcher.swift only sequences and posts what this returns. The coordinates come from
/// the main process (budget.cjs: frame px → windowLocal → screenPoint against the screenshot's bounds); this side
/// checks them against the window as it is now. Routing is applied here once per event: the target pid, and for mouse
/// and scroll events the window number (fields 91 / 92, which AppKit uses to pick the window of a background app) and
/// the window-local point.
///
/// CGEventSource's initializer is failable — a nil source is a refusal with `scgevent_unavailable`, never a crash or a
/// thrown exception — and it is checked before any gate, so a missing source refuses the whole path.
public enum EventFactory {
    /// Fault injection for the refusal path (tests only): CU_TEST_FAIL_EVENT_SOURCE=1 makes source() fail.
    static let forcedFailure = ProcessInfo.processInfo.environment["CU_TEST_FAIL_EVENT_SOURCE"] == "1"

    /// How far the given screen point may sit from the live window origin + window-local point (points). More means
    /// the window moved since the screenshot: the model's coordinate no longer means what it saw.
    static let movedTolerance: CGFloat = 1

    public static func source() -> Result<CGEventSource, CUError> {
        guard !forcedFailure, let source = CGEventSource(stateID: .hidSystemState) else {
            return .failure(CUError("scgevent_unavailable", "A HID-state CGEventSource could not be created; raw input is unavailable."))
        }
        return .success(source)
    }

    /// For probe: {eventSource: true} or {eventSource: false, eventSourceError: "scgevent_unavailable"}.
    public static var probe: [String: Any] {
        switch source() {
        case .success: return ["eventSource": true]
        case .failure(let error): return ["eventSource": false, "eventSourceError": error.code]
        }
    }

    public struct Target {
        public let pid: pid_t
        public let windowId: UInt32
        public let screenPoint: CGPoint
        public let windowLocal: CGPoint

        /// The same window at another point (drag steps).
        func moved(screenPoint: CGPoint, windowLocal: CGPoint) -> Target {
            Target(pid: pid, windowId: windowId, screenPoint: screenPoint, windowLocal: windowLocal)
        }
    }

    // MARK: events

    /// Undocumented field the reference helper sets to the target pid (kept from cu-probe's Dispatcher).
    static let helperPidField = CGEventField(rawValue: 143)!
    /// kCGMouseEventWindowUnderMousePointer / …ThatCanHandleThisEvent.
    static let windowUnderPointerField = CGEventField(rawValue: 91)!
    static let windowThatCanHandleField = CGEventField(rawValue: 92)!
    /// NSEvent.windowNumber, distinct from the hit-test hints 91/92. Without it AppKit receives window 0.
    static let windowNumberField = CGEventField(rawValue: 51)!

    static func route(_ event: CGEvent, pid: pid_t) {
        event.setIntegerValueField(.eventTargetUnixProcessID, value: Int64(pid))
        event.setIntegerValueField(helperPidField, value: Int64(pid))
    }

    static func route(_ event: CGEvent, _ target: Target) {
        route(event, pid: target.pid)
        event.setIntegerValueField(windowNumberField, value: Int64(target.windowId))
        event.setIntegerValueField(windowUnderPointerField, value: Int64(target.windowId))
        event.setIntegerValueField(windowThatCanHandleField, value: Int64(target.windowId))
        SkyLight.attachWindowLocation(event, target.windowLocal)
    }

    static func mouse(_ source: CGEventSource, _ type: CGEventType, _ target: Target, button: CGMouseButton,
                      clickState: Int = 1, flags: CGEventFlags = []) -> CGEvent? {
        guard let event = CGEvent(mouseEventSource: source, mouseType: type, mouseCursorPosition: target.screenPoint,
                                  mouseButton: button) else { return nil }
        event.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))
        event.flags = flags
        route(event, target)
        return event
    }

    static func scroll(_ source: CGEventSource, _ target: Target, dy: Int32, dx: Int32) -> CGEvent? {
        guard let event = CGEvent(scrollWheelEvent2Source: source, units: .line, wheelCount: 2, wheel1: dy, wheel2: dx,
                                  wheel3: 0) else { return nil }
        event.location = target.screenPoint
        route(event, target)
        return event
    }

    static func key(_ source: CGEventSource, pid: pid_t, code: CGKeyCode, down: Bool, flags: CGEventFlags) -> CGEvent? {
        guard let event = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: down) else { return nil }
        event.flags = flags
        route(event, pid: pid)
        return event
    }

    /// One key event carrying `units` as its Unicode string (the caller keeps it ≤ 20 UTF-16 units, pairs whole).
    static func unicode(_ source: CGEventSource, pid: pid_t, units: [UInt16], down: Bool) -> CGEvent? {
        guard let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: down) else { return nil }
        var units = units
        event.keyboardSetUnicodeString(stringLength: units.count, unicodeString: &units)
        route(event, pid: pid)
        return event
    }
}

/// The one private symbol raw input uses: CGEventSetWindowLocation (window-local point carried on a mouse event),
/// looked up at run time and skipped when absent. Nothing else from cu-probe's SkyLight.swift is brought in — in
/// particular not SLPSSetFrontProcess*: raw input must never front the app.
enum SkyLight {
    typealias SetWindowLocationFn = @convention(c) (CGEvent, CGPoint) -> Void
    private static let setWindowLocation: SetWindowLocationFn? = {
        guard let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "CGEventSetWindowLocation") else { return nil }
        return unsafeBitCast(sym, to: SetWindowLocationFn.self)
    }()

    static func attachWindowLocation(_ event: CGEvent, _ point: CGPoint) {
        setWindowLocation?(event, point)
    }
}

extension EventFactory {

    /// The pid comes from the resolved window (the probe context), never from the caller.
    public static func target(window: WindowInfo, winLocalPt: CGPoint, screenPt: CGPoint) -> Result<Target, CUError> {
        guard CGRect(origin: .zero, size: window.bounds.size).contains(winLocalPt) else {
            return .failure(CUError("invalid_params", "The point is outside the window."))
        }
        let live = CGPoint(x: window.bounds.minX + winLocalPt.x, y: window.bounds.minY + winLocalPt.y)
        guard abs(live.x - screenPt.x) <= movedTolerance, abs(live.y - screenPt.y) <= movedTolerance else {
            return .failure(CUError("window_moved", "Window \(window.windowId) moved since the screenshot; take a new app_screenshot."))
        }
        return .success(Target(pid: window.pid, windowId: window.windowId, screenPoint: live, windowLocal: winLocalPt))
    }
}
