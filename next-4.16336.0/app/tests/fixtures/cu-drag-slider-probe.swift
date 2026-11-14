// Read-only brightness geometry probe. Setup, test and restoration drags all use the production native bridge.
import AppKit
import ApplicationServices
let bundleId = CommandLine.arguments[1]
guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first else { fatalError("App missing") }
func value(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var raw: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &raw) == .success ? raw : nil
}
func find(_ element: AXUIElement, depth: Int = 0) -> AXUIElement? {
    let label = [kAXTitleAttribute, kAXDescriptionAttribute].compactMap { value(element, $0) as? String }.joined(separator: " ").lowercased()
    if value(element, kAXRoleAttribute) as? String == "AXSlider", label.contains("brightness") || label.contains("亮度") { return element }
    if depth > 30 { return nil }
    for child in value(element, kAXChildrenAttribute) as? [AXUIElement] ?? [] {
        if let found = find(child, depth: depth + 1) { return found }
    }
    return nil
}
guard let slider = find(AXUIElementCreateApplication(app.processIdentifier)) else { fatalError("Brightness slider missing") }
var names: CFArray?
AXUIElementCopyAttributeNames(slider, &names)
var result: [String: Any] = ["attributes": names as? [String] ?? []]
var rawValue: CFTypeRef?
result["valueError"] = AXUIElementCopyAttributeValue(slider, kAXValueAttribute as CFString, &rawValue).rawValue
result["description"] = value(slider, kAXDescriptionAttribute) as? String

for key in [kAXValueAttribute, kAXMinValueAttribute, kAXMaxValueAttribute] { result[key] = value(slider, key) }
func describe(_ element: AXUIElement, _ depth: Int = 0) -> [String: Any] {
    var out: [String: Any] = [:]
    for key in [kAXRoleAttribute, kAXDescriptionAttribute, kAXValueAttribute, kAXMinValueAttribute, kAXMaxValueAttribute] {
        if let raw = value(element, key), raw is String || raw is NSNumber { out[key] = raw }
    }
    if let raw = value(element, kAXPositionAttribute), CFGetTypeID(raw) == AXValueGetTypeID() {
        var point = CGPoint.zero
        if AXValueGetValue(raw as! AXValue, .cgPoint, &point) { out["position"] = ["x": point.x, "y": point.y] }
    }
    if let raw = value(element, kAXSizeAttribute), CFGetTypeID(raw) == AXValueGetTypeID() {
        var size = CGSize.zero
        if AXValueGetValue(raw as! AXValue, .cgSize, &size) { out["size"] = ["width": size.width, "height": size.height] }
    }
    if depth < 3 { out["children"] = (value(element, kAXChildrenAttribute) as? [AXUIElement] ?? []).map { describe($0, depth + 1) } }
    return out
}
result["tree"] = describe(slider)
print(String(data: try! JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
