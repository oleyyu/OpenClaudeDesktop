import XCTest
@testable import ComputerUseCore

/// app_key's background key set and AX kinds (official 2.42304.0 §1.6.1). No event is posted.
final class KeyInputTests: XCTestCase {
    func testBackgroundKeySet() {
        for combo in ["return", "enter", "escape", "backspace", "delete", "tab", "up", "down", "left", "right", "home", "end",
                      "pageup", "pagedown", "space", "forward_delete", "cmd+a", "shift+tab", "shift+right", "alt+left",
                      "shift+cmd+down", "alt+shift+cmd+up", "cmd+home", "page_down", "esc", "del"] {
            XCTAssertNotNil(KeyInput.backgroundKey(combo), combo)
        }
        for combo in ["a", "cmd+s", "cmd+shift+a", "ctrl+tab", "cmd+return", "shift+escape", "fn+left", "cmd+", "cmd++", "hyper+a",
                      "shift+shift+tab", "cmd+bogus", "f5", "shift+space", "cmd+backspace"] {
            XCTAssertNil(KeyInput.backgroundKey(combo), combo)
        }
        XCTAssertEqual(KeyInput.backgroundKey("Shift+Cmd+Down")?.normalized, "shift+cmd+down")
        XCTAssertEqual(KeyInput.backgroundKey("del")?.key, "delete")
    }

    func testAXKinds() {
        func kind(_ combo: String) -> KeyInput.AXKind? { KeyInput.parse(combo).flatMap(KeyInput.axKind) }
        XCTAssertEqual(kind("return"), .confirm)
        XCTAssertEqual(kind("enter"), .confirm)
        XCTAssertEqual(kind("escape"), .cancel)
        XCTAssertEqual(kind("backspace"), .deleteBackward)
        XCTAssertEqual(kind("delete"), .deleteBackward)
        XCTAssertEqual(kind("cmd+a"), .selectAll)
        for combo in ["tab", "shift+return", "forward_delete", "cmd+shift+a", "a", "down"] { XCTAssertNil(kind(combo), combo) }
    }
}
