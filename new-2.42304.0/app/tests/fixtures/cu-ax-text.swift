// Live-check helper (computer-use-key-live.test.mjs): reads back the first AXTextArea of ONE window, chosen by its exact
// AXTitle, of app <pid>, as one JSON line {value, location, length, focused, windowFocused}. Read only: nothing is
// set, posted or moved. Used on the test's own uniquely named TextEdit document only.
//   swiftc -O tests/fixtures/cu-ax-text.swift -o <tmp>/cu-ax-text && <tmp>/cu-ax-text <pid> <window title>
import ApplicationServices
import Foundation

func value(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var ref: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &ref) == .success ? ref : nil
}
func children(_ element: AXUIElement) -> [AXUIElement] { (value(element, kAXChildrenAttribute) as? [AXUIElement]) ?? [] }
func role(_ element: AXUIElement) -> String? { value(element, kAXRoleAttribute) as? String }
func firstTextArea(_ element: AXUIElement, depth: Int = 0) -> AXUIElement? {
    if role(element) == "AXTextArea" { return element }
    guard depth < 8 else { return nil }
    for child in children(element) { if let found = firstTextArea(child, depth: depth + 1) { return found } }
    return nil
}

let args = CommandLine.arguments
guard args.count == 3, let pid = pid_t(args[1]) else { print(#"{"error":"usage"}"#); exit(2) }
let app = AXUIElementCreateApplication(pid)
let windows = (value(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
guard let window = windows.first(where: { (value($0, kAXTitleAttribute) as? String) == args[2] }), let area = firstTextArea(window) else {
    print(#"{"error":"not_found"}"#); exit(1)
}
var range = CFRange()
if let ref = value(area, kAXSelectedTextRangeAttribute), CFGetTypeID(ref) == AXValueGetTypeID() { AXValueGetValue(ref as! AXValue, .cfRange, &range) }
let focus = value(app, kAXFocusedUIElementAttribute)
let focusedWindow = value(app, kAXFocusedWindowAttribute)
let facts: [String: Any] = ["value": (value(area, kAXValueAttribute) as? String) ?? NSNull(), "location": range.location, "length": range.length,
                            "focused": focus.map { CFEqual($0, area) } ?? false, "windowFocused": focusedWindow.map { CFEqual($0, window) } ?? false]
print(String(decoding: try JSONSerialization.data(withJSONObject: facts), as: UTF8.self))
