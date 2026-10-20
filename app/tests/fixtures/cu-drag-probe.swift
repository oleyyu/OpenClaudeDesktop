// Read-only TextEdit acceptance probe: exact insertion-point geometry and AX selection.
import Foundation
import ApplicationServices
let pid = pid_t(CommandLine.arguments[1])!
let app = AXUIElementCreateApplication(pid)
func value(_ e: AXUIElement, _ key: String) -> CFTypeRef? {
    var result: CFTypeRef?
    return AXUIElementCopyAttributeValue(e, key as CFString, &result) == .success ? result : nil
}
func textArea(_ e: AXUIElement, _ depth: Int = 0) -> AXUIElement? {
    if value(e, kAXRoleAttribute) as? String == "AXTextArea" { return e }
    if depth >= 12 { return nil }
    for child in value(e, kAXChildrenAttribute) as? [AXUIElement] ?? [] {
        if let found = textArea(child, depth + 1) { return found }
    }
    return nil
}
let title = CommandLine.arguments[2]
let windows = value(app, kAXWindowsAttribute) as? [AXUIElement] ?? []
guard let window = windows.first(where: { (value($0, kAXTitleAttribute) as? String ?? "").contains(title) }),
      let area = textArea(window) else { fatalError("Text area missing") }
var result: [String: Any] = [:]
var points: [[String: Double]] = []
for index in [10, 40] {
    var range = CFRange(location: index, length: 0)
    let parameter = AXValueCreate(.cfRange, &range)!
    var out: CFTypeRef?
    if AXUIElementCopyParameterizedAttributeValue(area, kAXBoundsForRangeParameterizedAttribute as CFString, parameter, &out) == .success,
       let out, CFGetTypeID(out) == AXValueGetTypeID() {
        var rect = CGRect.zero
        if AXValueGetValue(out as! AXValue, .cgRect, &rect) {
            points.append(["x": rect.midX, "y": rect.midY])
        }
    }
}
result["points"] = points
if let raw = value(area, kAXSelectedTextRangeAttribute), CFGetTypeID(raw) == AXValueGetTypeID() {
    var range = CFRange()
    if AXValueGetValue(raw as! AXValue, .cfRange, &range) {
        result["range"] = ["location": range.location, "length": range.length]
    }
}
print(String(data: try! JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
