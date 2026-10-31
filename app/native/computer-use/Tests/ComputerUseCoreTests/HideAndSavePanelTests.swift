import XCTest
@testable import ComputerUseCore

/// hideBeforeAction's (AppHide.swift) and savePanelProbe's (SavePanel.swift) pure decisions. Nothing is hidden,
/// activated, pressed or read from another app.
final class HideAndSavePanelTests: XCTestCase {
    let display = CGRect(x: 0, y: 0, width: 1440, height: 900)
    let second = CGRect(x: 1440, y: 0, width: 1920, height: 1080)

    func testPidsOnDisplay() {
        let windows = [
            AppHide.Window(pid: 10, layer: 0, alpha: 1, bounds: CGRect(x: 100, y: 100, width: 800, height: 600)),
            AppHide.Window(pid: 11, layer: 0, alpha: 1, bounds: CGRect(x: 1500, y: 100, width: 800, height: 600)),   // other display
            AppHide.Window(pid: 12, layer: 3, alpha: 1, bounds: CGRect(x: 100, y: 100, width: 300, height: 300)),    // floating
            AppHide.Window(pid: 13, layer: 0, alpha: 0, bounds: CGRect(x: 100, y: 100, width: 300, height: 300)),    // transparent
            AppHide.Window(pid: 14, layer: 0, alpha: 1, bounds: CGRect(x: 1400, y: 10, width: 100, height: 100)),    // straddles
            AppHide.Window(pid: 15, layer: 0, alpha: 1, bounds: CGRect(x: 10, y: 10, width: 0, height: 100)),        // empty
            AppHide.Window(pid: 16, layer: 0, alpha: 1, bounds: CGRect(x: 0, y: 0, width: 400, height: 40), ownerName: "Notification Center"),
        ]
        XCTAssertEqual(AppHide.pidsOnDisplay(windows, display: display), [10, 14])
        XCTAssertEqual(AppHide.pidsOnDisplay(windows, display: second), [11, 14])
    }

    func testToHide() {
        let apps = [
            AppHide.App(pid: 10, bundleId: "com.example.other", name: "Other", hidden: false),
            AppHide.App(pid: 11, bundleId: "com.apple.TextEdit", name: "TextEdit", hidden: false),   // allowed
            AppHide.App(pid: 12, bundleId: "com.example.hidden", name: "Hidden", hidden: true),      // already hidden
            AppHide.App(pid: 13, bundleId: "com.apple.finder", name: "Finder", hidden: false),       // the desktop shell
            AppHide.App(pid: 14, bundleId: "com.example.host", name: "Host", hidden: false),         // this app
            AppHide.App(pid: 15, bundleId: nil, name: "helper", hidden: false),                       // no bundle id
            AppHide.App(pid: 16, bundleId: "com.example.elsewhere", name: "Elsewhere", hidden: false), // no window here
            AppHide.App(pid: 99, bundleId: "com.example.self", name: "Self", hidden: false),          // this process
            AppHide.App(pid: 17, bundleId: "com.apple.controlcenter", name: "Control Center", hidden: false),
        ]
        let hide = AppHide.toHide(apps: apps, onDisplay: [10, 11, 12, 13, 14, 15, 99, 17],
                                  exempt: ["com.apple.TextEdit", "com.example.host"], selfPid: 99)
        XCTAssertEqual(hide.map(\.pid), [10])
    }

    func testToActivate() {
        let order = [
            AppHide.Window(pid: 20, layer: 0, alpha: 1, bounds: CGRect(x: 0, y: 0, width: 500, height: 500)),     // not allowed
            AppHide.Window(pid: 21, layer: 0, alpha: 1, bounds: CGRect(x: 1500, y: 0, width: 500, height: 500)),  // allowed, other display
            AppHide.Window(pid: 22, layer: 0, alpha: 1, bounds: CGRect(x: 50, y: 50, width: 500, height: 500)),   // allowed, here
            AppHide.Window(pid: 23, layer: 0, alpha: 1, bounds: CGRect(x: 60, y: 60, width: 500, height: 500)),   // allowed, lower
        ]
        let bundles: [pid_t: String] = [20: "com.example.other", 21: "com.example.a", 22: "com.example.b", 23: "com.example.c"]
        let allowed: Set<String> = ["com.example.a", "com.example.b", "com.example.c"]
        // The app in front isn't allowed (this app, or nothing): the topmost allowed window on the display comes forward.
        XCTAssertEqual(AppHide.toActivate(windowsFrontToBack: order, display: display, bundleOf: { bundles[$0] }, allowed: allowed,
                                          frontBundleId: "com.example.host", selfPid: 99), 22)
        XCTAssertEqual(AppHide.toActivate(windowsFrontToBack: order, display: display, bundleOf: { bundles[$0] }, allowed: allowed,
                                          frontBundleId: nil, selfPid: 99), 22)
        // An allowed app is in front already: nothing.
        XCTAssertNil(AppHide.toActivate(windowsFrontToBack: order, display: display, bundleOf: { bundles[$0] }, allowed: allowed,
                                        frontBundleId: "com.example.c", selfPid: 99))
        // No allowed window on the display: nothing.
        XCTAssertNil(AppHide.toActivate(windowsFrontToBack: Array(order.prefix(2)), display: display, bundleOf: { bundles[$0] },
                                        allowed: allowed, frontBundleId: "com.example.other", selfPid: 99))
    }

    func testWherePopUp() {
        // The folder pop-up is the topmost (then leftmost) pop-up outside the file list; the format pop-up is below it.
        let candidates: [(frame: CGRect?, inList: Bool)] = [
            (CGRect(x: 200, y: 400, width: 200, height: 22), false),   // File Format
            (CGRect(x: 200, y: 120, width: 200, height: 22), false),   // Where
            (CGRect(x: 20, y: 60, width: 200, height: 22), true),      // inside the list
            (nil, false),
        ]
        XCTAssertEqual(SavePanel.wherePopUp(candidates), 1)
        XCTAssertEqual(SavePanel.wherePopUp([(CGRect(x: 300, y: 50, width: 10, height: 10), false), (CGRect(x: 100, y: 50.2, width: 10, height: 10), false)]), 1)
        XCTAssertNil(SavePanel.wherePopUp([(CGRect(x: 0, y: 0, width: 1, height: 1), true)]))
    }

    func testShownFolder() {
        let a = URL(fileURLWithPath: "/Users/me/Documents/a.txt"), b = URL(fileURLWithPath: "/Users/me/Documents/Sub", isDirectory: true)
        XCTAssertEqual(SavePanel.shownFolder(itemUrls: [a, b]), "file:///Users/me/Documents/")
        XCTAssertNil(SavePanel.shownFolder(itemUrls: []))
        XCTAssertNil(SavePanel.shownFolder(itemUrls: [URL(string: "https://example.com/x")!]))
        // Search results / Recents: items from several folders tell no single folder.
        let launchAgent = URL(fileURLWithPath: "/Users/me/Library/LaunchAgents/x.plist")
        XCTAssertNil(SavePanel.shownFolder(itemUrls: [a, launchAgent]))
        XCTAssertNil(SavePanel.shownFolder(itemUrls: [launchAgent, a, b]))
    }

    func testPathNames() {
        XCTAssertEqual(SavePanel.pathNames(menuTitles: ["Documents", "me", "Users", "Macintosh HD", nil, "Desktop", "Downloads"]),
                       ["Documents", "me", "Users", "Macintosh HD"])
        XCTAssertEqual(SavePanel.pathNames(menuTitles: ["Documents", "", "Recents"]), ["Documents"])
        XCTAssertEqual(SavePanel.pathNames(menuTitles: []), [])
    }
}
