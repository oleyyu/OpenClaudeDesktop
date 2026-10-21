// Live-check helper (computer-use-window-highlight-live.mjs): the Accessibility hit test the AX ladder does
// (AXUIElementCopyElementAtPosition on the target app's element), at one global point, as one JSON line — the hit's
// pid, role and the window id of its AXWindow. Read only: nothing is pressed, posted or moved.
//   swiftc -O tests/fixtures/cu-ax-hit.swift -o <tmp>/cu-ax-hit && <tmp>/cu-ax-hit <pid> <x> <y>
import ApplicationServices
import Foundation

@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ id: UnsafeMutablePointer<UInt32>) -> AXError

let args = CommandLine.arguments.dropFirst().map { $0 }
guard args.count == 3, let pid = Int32(args[0]), let x = Float(args[1]), let y = Float(args[2]) else {
    print(#"{"error":"usage: cu-ax-hit <pid> <x> <y>"}"#)
    exit(2)
}
var out: [String: Any] = ["trusted": AXIsProcessTrusted()]
var found: AXUIElement?
let error = AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(pid), x, y, &found)
out["axError"] = Int(error.rawValue)
if error == .success, let found {
    var hitPid: pid_t = 0
    AXUIElementGetPid(found, &hitPid)
    out["pid"] = Int(hitPid)
    var role: CFTypeRef?
    if AXUIElementCopyAttributeValue(found, kAXRoleAttribute as CFString, &role) == .success { out["role"] = role as? String }
    var window: CFTypeRef?
    if AXUIElementCopyAttributeValue(found, kAXWindowAttribute as CFString, &window) == .success, let window {
        var id: UInt32 = 0
        if _AXUIElementGetWindow(window as! AXUIElement, &id) == .success { out["windowId"] = Int(id) }
    }
}
print(String(decoding: try JSONSerialization.data(withJSONObject: out), as: UTF8.self))
