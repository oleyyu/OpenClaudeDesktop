// Live-check helper (computer-use-m4-click-check.mjs): prints the facts a background click must not change, as one JSON
// line — the real cursor position, the frontmost app, and the z-order index of window <id> among on-screen layer-0
// windows (0 = the frontmost normal window, -1 = not on screen). Read only: nothing is posted or moved.
//   swiftc -O tests/fixtures/cu-pointer-facts.swift -o <tmp>/cu-pointer-facts && <tmp>/cu-pointer-facts <windowId>
import AppKit
import CoreGraphics
import Foundation

let windowId = UInt32(CommandLine.arguments.dropFirst().first ?? "0") ?? 0
let cursor = CGEvent(source: nil)?.location ?? .zero
let list = (CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]]) ?? []
let normal = list.filter { ($0[kCGWindowLayer as String] as? Int) == 0 }
let zIndex = normal.firstIndex { ($0[kCGWindowNumber as String] as? UInt32) == windowId } ?? -1
let front = NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? ""
let facts: [String: Any] = ["cursor": [Double(cursor.x), Double(cursor.y)], "zIndex": zIndex, "front": front]
print(String(decoding: try JSONSerialization.data(withJSONObject: facts), as: UTF8.self))
