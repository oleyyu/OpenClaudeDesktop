import XCTest
@testable import ComputerUseCore

/// The app_menu / app_focus / list_apps calls folded in from helpers/cu-ax (MenuBar.swift): title matching, closestMatch,
/// the AX budget and the refusals that need no other app. Nothing is pressed, focused or read from another app.
final class MenuBarTests: XCTestCase {
    func testTitlesMatchInAnyCaseWithoutTheTrailingEllipsis() {
        XCTAssertEqual(MenuBar.norm("Save As…"), "save as")
        XCTAssertEqual(MenuBar.norm(" save as... "), "save as")
        XCTAssertEqual(MenuBar.norm("Save As"), "save as")
        XCTAssertEqual(MenuBar.norm("Share…"), MenuBar.norm("share"))
    }

    func testClosestMatchDistance() {
        XCTAssertEqual(MenuBar.distance("fiel", "file"), 2)
        XCTAssertEqual(MenuBar.distance("", "edit"), 4)
        XCTAssertEqual(MenuBar.distance("new foldr", "new folder"), 1)
        XCTAssertEqual(MenuBar.distance("view", "view"), 0)
    }

    func testASpentBudgetAnswersHelperTimeoutAndSendsNothing() {
        let ax = AXQuery(budget: 0)
        XCTAssertTrue(ax.expired)
        XCTAssertThrowsError(try ax.checkTime()) { XCTAssertEqual(($0 as? CUError)?.code, "helper_timeout") }
        let element = AXUIElementCreateApplication(getpid())
        XCTAssertNil(ax.value(element, kAXRoleAttribute))
        XCTAssertEqual(ax.actions(element), [])
        XCTAssertEqual(ax.perform(element, kAXPressAction), .cannotComplete)
    }

    func testAnAppThatIsNotRunningIsRefusedBeforeAnyAccessibilityMessage() throws {
        try XCTSkipUnless(AXIsProcessTrusted(), "app_not_running is checked after the Accessibility check")
        for call in [{ try MenuBar.list(bundleId: "com.example.cu-not-running", path: []) },
                     { try MenuBar.press(bundleId: "com.example.cu-not-running", path: ["File", "New"]) },
                     { try AppFocus.focus(bundleId: "com.example.cu-not-running", windowId: nil) }] {
            XCTAssertThrowsError(try call()) { XCTAssertEqual(($0 as? CUError)?.code, "app_not_running") }
        }
    }

    func testAPathEndingAtAMenuPressesNothing() {
        // A menu-bar title or an item with a submenu: path_ends_at_submenu (official), never opened.
        XCTAssertTrue(MenuBar.endsAtSubmenu(role: "AXMenuBarItem", childItems: 0))
        XCTAssertTrue(MenuBar.endsAtSubmenu(role: "AXMenuBarItem", childItems: 12))
        XCTAssertTrue(MenuBar.endsAtSubmenu(role: "AXMenuItem", childItems: 3))
        // A command item: pressed.
        XCTAssertFalse(MenuBar.endsAtSubmenu(role: "AXMenuItem", childItems: 0))
        XCTAssertFalse(MenuBar.endsAtSubmenu(role: nil, childItems: 0))
    }

    func testCUErrorCarriesDetails() {
        var error = CUError("menu_item_not_found", "No menu item")
        XCTAssertNil(error.details)
        error.details = ["closestMatch": "File"]
        XCTAssertEqual(error.details?["closestMatch"] as? String, "File")
    }

    func testListAppsReadsOnlyTheGivenFolders() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("cu-menubar-\(UUID().uuidString)")
        let bundle = dir.appendingPathComponent("Fixture.app/Contents")
        try FileManager.default.createDirectory(at: bundle, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let plist: [String: Any] = ["CFBundleIdentifier": "local.cu.menubar-fixture", "CFBundlePackageType": "APPL"]
        try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0).write(to: bundle.appendingPathComponent("Info.plist"))
        try Data().write(to: dir.appendingPathComponent("notes.txt"))
        let result = AppList.apps(folders: [dir.path, dir.appendingPathComponent("missing").path])
        let installed = try XCTUnwrap(result["installed"] as? [[String: Any]])
        XCTAssertEqual(installed.count, 1)
        XCTAssertEqual(installed.first?["bundleId"] as? String, "local.cu.menubar-fixture")
        XCTAssertEqual(installed.first?["name"] as? String, "Fixture")
        XCTAssertNotNil(result["running"] as? [[String: Any]])
    }
}
