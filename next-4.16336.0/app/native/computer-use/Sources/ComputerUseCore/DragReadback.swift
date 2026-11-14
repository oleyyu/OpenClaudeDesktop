import Foundation
import ApplicationServices

/// Retain the starting AX element across delivery. Never hit-test the endpoint as a substitute: that could report
/// the destination's value/position as a successful change even when the source did not move.
struct DragReadback {
    let element: AXUIElement
    let before: [String: Any]

    static func capture(pid: pid_t, point: CGPoint) -> DragReadback? {
        var found: AXUIElement?
        guard AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(pid), Float(point.x), Float(point.y), &found) == .success,
              let hit = found, AXLadder.pid(hit) == pid else { return nil }
        let chain = AXLadder.ancestry(hit, limit: AXLadder.climbLevels + 1)
        // A slider's thumb or a tab's label may be the hit. Read the control whose state the drag changes.
        let roles = ["AXTextArea", "AXTextField", "AXSlider", "AXTab", "AXRow"]
        let semantic = chain.first { node in
            roles.contains(AXLadder.role(node) ?? "")
        }
        var control = semantic ?? hit
        if semantic == nil {
            // Remote SwiftUI views (System Settings) can hit-test as the host window even though its AX children
            // expose the slider. Search only that already ownership-checked window, before pressing.
            var queue = AXLadder.children(control)[...], visited = 0
            var best: (element: AXUIElement, area: CGFloat)?
            while let node = queue.popFirst(), visited < AXLadder.maxVisited {
                visited += 1
                if roles.contains(AXLadder.role(node) ?? ""), let frame = AXLadder.frame(node), frame.contains(point) {
                    let area = frame.width * frame.height
                    if best == nil || area < best!.area { best = (node, area) }
                }
                queue.append(contentsOf: AXLadder.children(node))
            }
            if let best { control = best.element }
            else if ["AXWindow", "AXApplication", "AXGroup", "AXSplitGroup"].contains(AXLadder.role(control) ?? "") { return nil }
        }
        if AXLadder.role(control) == "AXSecureTextField"
            || AXLadder.string(control, kAXSubroleAttribute) == "AXSecureTextField" { return nil }
        if AXLadder.role(control) == "AXSlider", AXLadder.value(control, kAXValueAttribute) == nil {
            // SwiftUI's Displays brightness slider exposes its moving thumb, but no AXValue on the wrapper.
            // The wrapper's fixed AXPosition cannot verify a slider operation.
            guard let thumb = AXLadder.children(control).first(where: { AXLadder.role($0) == "AXValueIndicator" }) else { return nil }
            control = thumb
        }
        return DragReadback(element: control, before: snapshot(control))
    }

    static func snapshot(_ element: AXUIElement) -> [String: Any] {
        var result: [String: Any] = [:]
        if let value = AXLadder.value(element, kAXValueAttribute) {
            if let string = value as? String { result["AXValue"] = string }
            else if let number = value as? NSNumber { result["AXValue"] = number }
        }
        if let raw = AXLadder.value(element, kAXSelectedTextRangeAttribute), CFGetTypeID(raw) == AXValueGetTypeID() {
            var range = CFRange()
            if AXValueGetValue(raw as! AXValue, .cfRange, &range) {
                result["AXSelectedTextRange"] = ["location": range.location, "length": range.length]
            }
        }
        if let raw = AXLadder.value(element, kAXPositionAttribute), CFGetTypeID(raw) == AXValueGetTypeID() {
            var point = CGPoint.zero
            if AXValueGetValue(raw as! AXValue, .cgPoint, &point) {
                result["AXPosition"] = ["x": point.x, "y": point.y]
            }
        }
        return result
    }

    /// AX may lag behind event delivery. Poll after release, never with the mouse held.
    func after() -> [String: Any] {
        if before.isEmpty { return [:] }
        var result: [String: Any] = [:]
        var previous: [String: Any]?
        for _ in 0..<RawInput.readbackPolls {
            usleep(RawInput.readbackIntervalUs)
            result = Self.snapshot(element)
            // A changed intermediate drag step is not the final result. Require two equal post-release samples.
            if let previous, NSDictionary(dictionary: previous).isEqual(to: result),
               !NSDictionary(dictionary: before).isEqual(to: result) { break }
            previous = result
        }
        return result
    }
}
