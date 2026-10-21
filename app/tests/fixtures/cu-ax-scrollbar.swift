// Live-check helper (computer-use-scroll-live.test.mjs): reads the vertical scroll bars of ONE window, chosen by its
// exact AXTitle, of app <pid>, as one JSON line {bars: [{area: role of the scroll area's first child, value}]} in tree
// order. Read only: nothing is set, posted or moved, and no text content is read. Used on the test's own temp document,
// temp folder window and fixture only.
//   swiftc -O tests/fixtures/cu-ax-scrollbar.swift -o <tmp>/cu-ax-scrollbar && <tmp>/cu-ax-scrollbar <pid> <window title>
import ApplicationServices
import Foundation

func value(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var ref: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &ref) == .success ? ref : nil
}
func children(_ element: AXUIElement) -> [AXUIElement] { (value(element, kAXChildrenAttribute) as? [AXUIElement]) ?? [] }
func role(_ element: AXUIElement) -> String? { value(element, kAXRoleAttribute) as? String }
var bars: [[String: Any]] = []
func collect(_ element: AXUIElement, depth: Int = 0) {
    if role(element) == "AXScrollArea", let ref = value(element, kAXVerticalScrollBarAttribute), CFGetTypeID(ref) == AXUIElementGetTypeID() {
        let bar = ref as! AXUIElement
        bars.append(["area": children(element).first.flatMap(role) ?? NSNull(),
                     "value": (value(bar, kAXValueAttribute) as? NSNumber)?.doubleValue ?? NSNull()])
    }
    guard depth < 12 else { return }
    for child in children(element) { collect(child, depth: depth + 1) }
}

let args = CommandLine.arguments
guard args.count == 3, let pid = pid_t(args[1]) else { print(#"{"error":"usage"}"#); exit(2) }
let app = AXUIElementCreateApplication(pid)
let windows = (value(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
guard let window = windows.first(where: { (value($0, kAXTitleAttribute) as? String) == args[2] }) else {
    print(#"{"error":"not_found"}"#); exit(1)
}
collect(window)
print(String(decoding: try JSONSerialization.data(withJSONObject: ["bars": bars]), as: UTF8.self))
