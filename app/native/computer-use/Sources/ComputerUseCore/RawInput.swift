import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// Dispatcher.swift (copied unchanged from claude-cu-spec/src/cu-probe) returns these. The raw values are this
/// project's reason codes (the strings reason-policy.cjs and CUError carry), so no second vocabulary crosses the IPC.
enum DispatchCode: String {
    case ok
    case permissionDenied = "permission_denied"
    case invalidParams = "invalid_params"
    case foreignPid = "foreign_pid"
    case secureInputActive = "secure_input_active"
    case userActivelyTyping = "user_actively_typing"
    case windowGone = "window_gone"
    case keyNotMapped = "key_not_mapped"
    case axError = "ax_error"
    case scgeventUnavailable = "scgevent_unavailable"
    case typeBudgetExhausted = "type_budget_exhausted"
}

/// The raw rung (docs/04 判定树 7, dispatchRaw): reached only after the main process's reason policy allowed a
/// fallback for the AX result. Every entry re-runs, natively and in this order, the event-source check and the
/// session gates (SessionState.rawInputRefusal), re-resolves the window and re-checks who owns the point, then hands
/// one Target to Dispatcher. Result {outcome: ok | ineffective | unsupported, reasonCode, delivered, verified, readback}.
public enum RawInput {
    private static let dragLock = NSLock()

    public struct DragPoint {
        public let local: CGPoint
        public let screen: CGPoint
        public init(local: CGPoint, screen: CGPoint) { self.local = local; self.screen = screen }
    }

    /// A drag owns its press until cleanup completes. Re-resolve and validate all vertices before preparing.
    public static func drag(bundleId: String, windowId: UInt32, points: [DragPoint], pixelScale: Double,
                            button: String, focused: Bool, grantedBundleIds: Set<String>) throws -> [String: Any] {
        guard dragLock.try() else { return refused("drag_in_progress") }
        defer { dragLock.unlock() }
        if case .failure(let error) = EventFactory.source() { return refused(error.code) }
        let gate = { SessionState.rawInputRefusal(focused: focused, grantedBundleIds: grantedBundleIds) }
        if let reason = gate() { return refused(reason) }
        let window = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        if let reason = windowRefusal(window) { return refused(reason) }
        var targets: [EventFactory.Target] = []
        for point in points {
            let target: EventFactory.Target
            switch EventFactory.target(window: window, winLocalPt: point.local, screenPt: point.screen) {
            case .success(let t): target = t
            case .failure(let error): return refused(error.code)
            }
            if let owner = AXLadder.pointOwnerRefusal(pid: target.pid, windowId: windowId, screenPt: target.screenPoint) {
                return refused(owner.reason, owner.extra)
            }
            targets.append(target)
        }
        let samples = Dispatcher.dragSamples(vertices: targets, pixelScale: pixelScale)
        guard !samples.isEmpty else { return refused("invalid_params") }
        let readback = DragReadback.capture(pid: window.pid, point: samples[0].screenPoint)
        // Preflight AX calls may take time; Dispatcher rechecks all gates just before the first event.
        let dispatch = Dispatcher.drag(targets: samples, buttonName: button, refusal: gate)
        var result = dispatch.json
        result["before"] = readback?.before ?? [:]
        result["after"] = dispatch.pressed ? (readback?.after() ?? [:]) : (readback?.before ?? [:])
        result["readbackRole"] = readback.flatMap { AXLadder.role($0.element) } as Any? ?? NSNull()
        return result
    }

    static func refused(_ reason: String, _ extra: [String: Any] = [:]) -> [String: Any] {
        ["outcome": "unsupported", "reasonCode": reason, "delivered": false].merging(extra) { a, _ in a }
    }

    static func delivered(_ code: DispatchCode, _ extra: [String: Any] = [:]) -> [String: Any] {
        if code == .ok { return ["outcome": "ok", "reasonCode": NSNull(), "delivered": true, "verified": false].merging(extra) { a, _ in a } }
        return refused(code.rawValue, extra)
    }

    public struct Click {
        public var bundleId: String
        public var windowId: UInt32
        public var winLocalPt: CGPoint
        public var screenPt: CGPoint
        public var count: Int
        public var button: String
        public var focused: Bool
        public var grantedBundleIds: Set<String>
        public init(bundleId: String, windowId: UInt32, winLocalPt: CGPoint, screenPt: CGPoint, count: Int, button: String,
                    focused: Bool, grantedBundleIds: Set<String>) {
            self.bundleId = bundleId; self.windowId = windowId; self.winLocalPt = winLocalPt; self.screenPt = screenPt
            self.count = count; self.button = button; self.focused = focused; self.grantedBundleIds = grantedBundleIds
        }
    }

    /// A coordinate click on the target window (no_press_action fallback).
    public static func click(_ request: Click) throws -> [String: Any] {
        if case .failure(let error) = EventFactory.source() { return refused(error.code) }
        if let gate = SessionState.rawInputRefusal(focused: request.focused, grantedBundleIds: request.grantedBundleIds) {
            return refused(gate)
        }
        let window = try WindowList.resolve(bundleId: request.bundleId, windowId: request.windowId)
        if let state = windowRefusal(window) { return refused(state) }
        let target: EventFactory.Target
        switch EventFactory.target(window: window, winLocalPt: request.winLocalPt, screenPt: request.screenPt) {
        case .success(let t): target = t
        case .failure(let error): return refused(error.code)
        }
        if let owner = AXLadder.pointOwnerRefusal(pid: target.pid, windowId: target.windowId, screenPt: target.screenPoint) {
            return refused(owner.reason, owner.extra)
        }
        // Read back: a click on an unselected row must select it. Delivery alone is not acceptance.
        let row = AXLadder.selectable(pid: target.pid, screenPt: target.screenPoint)
        let before = row.flatMap(AXLadder.selected)
        let code = Dispatcher.mouse(target: target, buttonName: request.button, count: request.count)
        var extra: [String: Any] = ["axOp": NSNull(), "eventKind": "click"]
        guard code == .ok else { return delivered(code, extra) }
        guard let row, before == false else {
            extra["readback"] = before == true ? "already_selected" : "unavailable"
            return delivered(.ok, extra)
        }
        for _ in 0..<readbackPolls where AXLadder.selected(row) != true { usleep(readbackIntervalUs) }
        if AXLadder.selected(row) == true {
            extra["readback"] = "selected"
            return delivered(.ok, extra).merging(["verified": true]) { _, b in b }
        }
        extra["readback"] = "selection_unchanged"
        return ["outcome": "ineffective", "reasonCode": "raw_click_ineffective", "delivered": true, "verified": true].merging(extra) { a, _ in a }
    }

    /// AXSelected readback after a raw click: up to 500 ms, every 50 ms.
    static let readbackPolls = 10, readbackIntervalUs: useconds_t = 50_000

    /// The window-state refusals axClick also applies (docs/04): raw events at a window in any of these states land
    /// nowhere useful, or somewhere else.
    static func windowRefusal(_ window: WindowInfo) -> String? {
        if window.isHidden { return "app_hidden" }
        if window.isMinimized == true { return "window_minimized" }
        if window.isOffSpace == true { return "window_off_space" }
        return nil
    }
}
