// Simulated user input for the user_actively_typing live test: <count> zero-distance HID mouse moves at the cursor,
// <intervalMs> apart. Moves nothing, clicks nothing, types nothing — it only keeps the system's last-input time fresh.
import CoreGraphics
import Foundation
let count = Int(CommandLine.arguments[1]) ?? 10, interval = useconds_t((Int(CommandLine.arguments[2]) ?? 50) * 1000)
for _ in 0..<count {
    let at = CGEvent(source: nil)!.location
    CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: at, mouseButton: .left)!.post(tap: .cghidEventTap)
    usleep(interval)
}
