import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// app_scroll (official 2.42304.0 §1.6.2): vertical only, through Accessibility, with no event posted.
///
/// From the element at the address (a window point, an element_index of the last summary, or the app's focused
/// element) the climb goes up to the window and takes the first vertical scroll bar it meets: the element itself when
/// it is a vertical AXScrollBar, else the AXVerticalScrollBar of an AXScrollArea on the way. The bar's AXValue (0 = top,
/// 1 = bottom) is moved by dy × 5 % of the scroll range and clamped to [0, 1], written, and read back:
///
///   value changed            → ok, axOp "set scrollbar AXValue=0.35", before / after
///   already at that end      → ineffective scrollbar_unchanged with atLimit "top" | "bottom" (nothing is written)
///   written, reads back same → ineffective scrollbar_unchanged
///   AXValue unreadable / write errors → ineffective ax_error with axError and axOp "read scrollbar AXValue" /
///                              "set scrollbar AXValue" (official op strings)
///   no vertical scroll bar up to the window → unsupported canvas
///
/// Window states (hidden, minimized, off Space) and the lock refuse first, as for every app_* action; ownership of the
/// element (this app, this window, inside a sheet when there is one) is checked as app_key checks it. The official
/// build skips its target precheck for scroll (`Ut()` in `ir()`) and gates neither on secure input nor on user input:
/// setting a scroll bar types nothing and moves no pointer.
public enum ScrollInput {
    /// One dy unit: this share of the full scroll range (official "~5% … it sets the scrollbar value, not pixels").
    public static let unit = 0.05
    /// The readback: up to 500 ms, every 50 ms.
    static let polls = 10, pollMicros: useconds_t = 50_000

    /// The bar value after scrolling by dy from `current`: clamped to [0, 1] (saturates at the top / bottom).
    public static func next(current: Double, dy: Double) -> Double {
        min(max(current + dy * unit, 0), 1)
    }

    /// "0.35": how the axOp shows a value (official "set scrollbar AXValue=" + %.2f).
    public static func shown(_ value: Double) -> String { String(format: "%.2f", value) }

    /// Which end a scroll that cannot move has reached, or nil when it can move.
    public static func limit(current: Double, dy: Double) -> String? {
        let target = next(current: current, dy: dy)
        guard abs(target - current) < 1e-9 else { return nil }
        if dy > 0 { return "bottom" }
        if dy < 0 { return "top" }
        return current >= 1 ? "bottom" : current <= 0 ? "top" : nil
    }

    /// One node of the climb, as the pure choice below sees it.
    public struct Node: Equatable {
        public var role: String?
        public var orientation: String?
        public var hasVerticalBar: Bool
        public init(role: String?, orientation: String? = nil, hasVerticalBar: Bool = false) {
            self.role = role; self.orientation = orientation; self.hasVerticalBar = hasVerticalBar
        }
    }
    public enum Pick: Equatable { case bar(Int), areaBar(Int) }

    /// The first node (hit first, then its parents up to the window) that gives a vertical scroll bar: a vertical
    /// AXScrollBar itself, or an AXScrollArea with an AXVerticalScrollBar. Climbing stops at a window / sheet / app.
    public static func pick(_ chain: [Node]) -> Pick? {
        for (index, node) in chain.enumerated() {
            if let role = node.role, AXLadder.climbStops.contains(role) { return nil }
            if node.role == "AXScrollBar", node.orientation == (kAXVerticalOrientationValue as String) { return .bar(index) }
            if node.role == "AXScrollArea", node.hasVerticalBar { return .areaBar(index) }
        }
        return nil
    }

    static func refused(_ reason: String, _ extra: [String: Any] = [:]) -> [String: Any] {
        ["outcome": "unsupported", "reasonCode": reason].merging(extra) { a, _ in a }
    }

    static func number(_ element: AXUIElement) -> Double? {
        (AXLadder.value(element, kAXValueAttribute) as? NSNumber)?.doubleValue
    }

    public static func axScroll(bundleId: String, windowId: UInt32?, address: TextInput.Address, dy: Double) throws -> [String: Any] {
        guard dy.isFinite else { throw CUError.invalidParams("dy must be a finite number") }
        if SessionState.screenLocked { return refused("screen_locked") }
        let info = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state, ["windowId": Int(info.windowId)]) }
        _ = AXLadder.setUp
        guard AXIsProcessTrusted() else { return refused("ax_untrusted_cannot_verify") }
        guard let window = AXLadder.windowElement(pid: info.pid, windowId: info.windowId) else { return refused("window_off_space") }
        let hit: AXUIElement
        switch KeyInput.start(address, pid: info.pid, window: window, bounds: info.bounds) {
        case .success(let element): hit = element
        case .failure(let error): return refused(error.code, ["windowId": Int(info.windowId)])
        }
        var out = KeyInput.describe(hit)
        out["windowId"] = Int(info.windowId)

        let chain = AXLadder.ancestry(hit)
        let nodes = chain.map { node -> Node in
            let role = AXLadder.role(node)
            return Node(role: role, orientation: role == "AXScrollBar" ? AXLadder.string(node, kAXOrientationAttribute) : nil,
                        hasVerticalBar: role == "AXScrollArea" && AXLadder.element(node, kAXVerticalScrollBarAttribute) != nil)
        }
        let owner: AXUIElement, bar: AXUIElement
        switch pick(nodes) {
        case .bar(let index)?:
            bar = chain[index]
            owner = chain.dropFirst(index + 1).first { AXLadder.role($0) == "AXScrollArea" } ?? bar
        case .areaBar(let index)?:
            owner = chain[index]
            guard let found = AXLadder.element(owner, kAXVerticalScrollBarAttribute) else { return refused("canvas", out) }
            bar = found
        case nil:
            return refused("canvas", out.merging(["noVerticalScrollBar": true]) { a, _ in a })
        }
        out.merge(KeyInput.describe(owner)) { _, b in b }

        guard let before = number(bar) else {
            return out.merging(["outcome": "ineffective", "reasonCode": "ax_error", "axOp": "read scrollbar AXValue",
                                "axError": AXLadder.axErrorName(.noValue), "verified": false]) { _, b in b }
        }
        let target = next(current: before, dy: dy)
        let op = "set scrollbar AXValue=\(shown(target))"
        out["before"] = before
        if let end = limit(current: before, dy: dy) {
            // Saturated: the bar is already at that end, so the value cannot change (official: ineffective).
            return out.merging(["outcome": "ineffective", "reasonCode": "scrollbar_unchanged", "axOp": op, "after": before,
                                "atLimit": end, "verified": true]) { _, b in b }
        }
        let error = AXUIElementSetAttributeValue(bar, kAXValueAttribute as CFString, NSNumber(value: target))
        guard error == .success else {
            return out.merging(["outcome": "ineffective", "reasonCode": "ax_error", "axOp": "set scrollbar AXValue",
                                "axError": AXLadder.axErrorName(error), "verified": false]) { _, b in b }
        }
        var after = number(bar)
        for _ in 0..<polls where after.map({ abs($0 - before) < 1e-6 }) ?? true {
            usleep(pollMicros)
            after = number(bar)
        }
        guard let after else {
            return out.merging(["outcome": "ok", "reasonCode": NSNull(), "axOp": op, "verified": false]) { _, b in b }
        }
        out["after"] = after
        if abs(after - before) < 1e-6 {
            return out.merging(["outcome": "ineffective", "reasonCode": "scrollbar_unchanged", "axOp": op, "axError": "success",
                                "verified": true]) { _, b in b }
        }
        return out.merging(["outcome": "ok", "reasonCode": NSNull(), "axOp": op, "verified": true]) { _, b in b }
    }
}
