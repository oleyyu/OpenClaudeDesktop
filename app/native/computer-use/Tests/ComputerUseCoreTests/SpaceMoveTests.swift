import XCTest
@testable import ComputerUseCore

/// app_bring_to_current_space's pure decisions (official 2.42304.0 §1.6.3) and app_list_windows' layer filter.
/// Nothing is moved, shown or raised.
final class SpaceMoveTests: XCTestCase {
    func testDryRunVerdict() {
        // Already on the active Space (a window on every Space included).
        XCTAssertEqual(Spaces.verdict(windowSpaces: [1], active: 1, activeType: 0), .alreadyHere)
        XCTAssertEqual(Spaces.verdict(windowSpaces: [1, 10, 33], active: 33, activeType: 4), .alreadyHere)
        // Elsewhere, the user on a desktop Space: movable.
        XCTAssertEqual(Spaces.verdict(windowSpaces: [10], active: 1, activeType: 0), .movable)
        // The user on a full-screen app's Space: a window can't be moved into it.
        XCTAssertEqual(Spaces.verdict(windowSpaces: [1], active: 33, activeType: 4), .fullscreenSpace)
        // Nothing to go on, or a Space of another kind.
        XCTAssertEqual(Spaces.verdict(windowSpaces: nil, active: 1, activeType: 0), .spaceUnclassifiable)
        XCTAssertEqual(Spaces.verdict(windowSpaces: [], active: 1, activeType: 0), .spaceUnclassifiable)
        XCTAssertEqual(Spaces.verdict(windowSpaces: [10], active: nil, activeType: nil), .spaceUnclassifiable)
        XCTAssertEqual(Spaces.verdict(windowSpaces: [10], active: 1, activeType: nil), .spaceUnclassifiable)
        XCTAssertEqual(Spaces.verdict(windowSpaces: [10], active: 1, activeType: 2), .spaceUnclassifiable)
    }

    func testOffSpace() {
        XCTAssertEqual(Spaces.isOffSpace(windowSpaces: [1], current: [33]), true)
        XCTAssertEqual(Spaces.isOffSpace(windowSpaces: [1], current: [1, 33]), false) // shown on a second display
        XCTAssertEqual(Spaces.isOffSpace(windowSpaces: [10, 33], current: [33]), false)
        XCTAssertNil(Spaces.isOffSpace(windowSpaces: nil, current: [33]))
        XCTAssertNil(Spaces.isOffSpace(windowSpaces: [1], current: nil))
        XCTAssertNil(Spaces.isOffSpace(windowSpaces: [1], current: []))
    }

    func testParkedFromTags() {
        // The tags seen live on the fixture window (macOS 27.2): shown, minimized, and this process's own shown window.
        XCTAssertEqual(Spaces.isParked(tags: 0x100482001), false)
        XCTAssertEqual(Spaces.isParked(tags: 0x1000000100480001), true)
        XCTAssertEqual(Spaces.isParked(tags: 0x200100482001), false)
        XCTAssertNil(Spaces.isParked(tags: 0x100480001))
        XCTAssertNil(Spaces.isParked(tags: nil))
    }

    func testFrontWindowOrderAndRaise() {
        XCTAssertEqual(WindowShow.isAbove(5, 7, in: [5, 7, 9]), true)
        XCTAssertEqual(WindowShow.isAbove(9, 7, in: [5, 7, 9]), false)
        XCTAssertNil(WindowShow.isAbove(4, 7, in: [5, 7, 9]))
        // The user's window can be kept on top: it offers AXRaise and holds the app's keyboard focus.
        XCTAssertTrue(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: true, focusedWindowId: 7, focusedSubrole: "AXStandardWindow"))
        XCTAssertTrue(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: true, focusedWindowId: nil, focusedSubrole: nil))
        // No AXRaise, the keyboard in another window, or in a dialog / panel: refused before anything changes.
        XCTAssertFalse(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: false, focusedWindowId: 7, focusedSubrole: nil))
        XCTAssertFalse(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: true, focusedWindowId: 8, focusedSubrole: "AXStandardWindow"))
        XCTAssertFalse(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: true, focusedWindowId: 7, focusedSubrole: "AXDialog"))
        XCTAssertFalse(WindowShow.canKeepOnTop(frontWindowId: 7, frontHasRaise: true, focusedWindowId: 7, focusedSubrole: "AXFloatingWindow"))
    }

    func testOnlyAppWindowLayersAreListed() {
        XCTAssertTrue(WindowList.isAppWindow(layer: 0, windowlessShell: false))
        XCTAssertTrue(WindowList.isAppWindow(layer: 3, windowlessShell: false))   // floating panel
        XCTAssertTrue(WindowList.isAppWindow(layer: 8, windowlessShell: false))   // modal panel
        XCTAssertFalse(WindowList.isAppWindow(layer: 24, windowlessShell: false)) // menu bar
        XCTAssertFalse(WindowList.isAppWindow(layer: 25, windowlessShell: false)) // status item
        XCTAssertFalse(WindowList.isAppWindow(layer: 101, windowlessShell: false)) // pop-up menu
        XCTAssertFalse(WindowList.isAppWindow(layer: -20, windowlessShell: false))
        XCTAssertTrue(WindowList.isAppWindow(layer: 20, windowlessShell: true))   // the Dock's strip
    }
}
