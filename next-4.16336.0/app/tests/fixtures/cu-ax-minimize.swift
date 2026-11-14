// Live-check helper (computer-use-bring-space-live.test.mjs): minimizes ONE window, chosen by its exact AXTitle, of app
// <pid> through Accessibility (AXMinimized = true), and prints {minimized} as one JSON line. Nothing else is read or set.
// Used on the test's own uniquely named TextEdit document only.
//   swiftc -O tests/fixtures/cu-ax-minimize.swift -o <tmp>/cu-ax-minimize && <tmp>/cu-ax-minimize <pid> <window title>
import ApplicationServices
import Foundation

func value(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var ref: CFTypeRef?
    return AXUIElementCopyAttributeValue(element, name as CFString, &ref) == .success ? ref : nil
}
let args = CommandLine.arguments
guard args.count == 3, let pid = pid_t(args[1]) else { print(#"{"error":"usage"}"#); exit(2) }
let app = AXUIElementCreateApplication(pid)
let windows = (value(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
guard let window = windows.first(where: { (value($0, kAXTitleAttribute) as? String) == args[2] }) else { print(#"{"error":"not_found"}"#); exit(1) }
let error = AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, kCFBooleanTrue)
for _ in 0..<20 where (value(window, kAXMinimizedAttribute) as? Bool) != true { usleep(50_000) }
print("{\"minimized\":\((value(window, kAXMinimizedAttribute) as? Bool) == true),\"axError\":\(error.rawValue)}")
