import XCTest
@testable import ComputerUseCore

/// The official 2.42304.0 click ladder's decisions (computer_use.node; docs/computer-use-official-spec-20261021.md
/// §1.2.1) as pure data: which step a left click takes, and whether a row step opens or selects.
final class ClickLadderTests: XCTestCase {
    func testRowRolesAreTheOfficialSet() {
        XCTAssertEqual(AXLadder.rowRoles, ["AXRow", "AXCell", "AXColumn", "AXOutlineRow"])
        XCTAssertEqual(AXLadder.textFieldRoles, ["AXTextField", "AXTextArea", "AXSearchField"])
        XCTAssertTrue(AXLadder.actionableRoles.isSuperset(of: ["AXRow", "AXCell", "AXOutlineRow"]))
        // The Dock is not an app_* target (official: only display-scope with Finder's grant reaches it).
        XCTAssertFalse(AXLadder.actionableRoles.contains("AXDockItem"))
    }

    func testSummaryCacheRefusesAnIndexFromAReplacedSummary() {
        // One list per window: another session's screenshot replaces it, and the older summary's ids find nothing.
        let element = AXUIElementCreateApplication(getpid())
        let first = SummaryCache.store(windowId: 990_001, pid: 7, elements: [element])
        XCTAssertNotNil(SummaryCache.element(windowId: 990_001, pid: 7, index: 0, summaryId: first))
        let second = SummaryCache.store(windowId: 990_001, pid: 7, elements: [element, element])
        XCTAssertNotEqual(first, second)
        XCTAssertNil(SummaryCache.element(windowId: 990_001, pid: 7, index: 0, summaryId: first))
        XCTAssertNotNil(SummaryCache.element(windowId: 990_001, pid: 7, index: 1, summaryId: second))
        XCTAssertNotNil(SummaryCache.element(windowId: 990_001, pid: 7, index: 1))
    }

    func testLeftClickStep() {
        // A native row (a Finder list row: no AXPress) is selected or opened, at any count.
        for count in 1...3 {
            XCTAssertEqual(AXLadder.leftClickStep(role: "AXRow", count: count, inWebPage: false, hasPress: false, hasRowAncestor: false), .row)
            XCTAssertEqual(AXLadder.leftClickStep(role: "AXCell", count: count, inWebPage: false, hasPress: false, hasRowAncestor: true), .row)
        }
        // A native row is selected even when it offers AXPress; a web page's row with AXPress is pressed.
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXOutlineRow", count: 1, inWebPage: false, hasPress: true, hasRowAncestor: false), .row)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXRow", count: 1, inWebPage: true, hasPress: true, hasRowAncestor: false), .press)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXRow", count: 1, inWebPage: true, hasPress: false, hasRowAncestor: false), .row)
        // A text field inside a row (a Finder name field) means the row — single or double click.
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXTextField", count: 1, inWebPage: false, hasPress: false, hasRowAncestor: true), .rowOfText)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXTextField", count: 2, inWebPage: false, hasPress: false, hasRowAncestor: true), .rowOfText)
        // Text outside a row: a double / triple click selects a word / line; a single click goes to the press climb.
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXTextArea", count: 2, inWebPage: false, hasPress: false, hasRowAncestor: false), .text)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXStaticText", count: 3, inWebPage: false, hasPress: false, hasRowAncestor: false), .text)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXTextField", count: 1, inWebPage: false, hasPress: false, hasRowAncestor: false), .press)
        // Static text in a row climbs (press, then the ascended selection), never a word selection.
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXStaticText", count: 2, inWebPage: false, hasPress: false, hasRowAncestor: true), .press)
        // A button: the press climb.
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXButton", count: 1, inWebPage: false, hasPress: true, hasRowAncestor: false), .press)
        XCTAssertEqual(AXLadder.leftClickStep(role: "AXButton", count: 2, inWebPage: false, hasPress: true, hasRowAncestor: false), .press)
    }

    func testSelectOperation() {
        XCTAssertEqual(AXLadder.selectOperation(count: 1, actions: ["AXOpen", "AXShowMenu"]), .select)
        XCTAssertEqual(AXLadder.selectOperation(count: 2, actions: ["AXOpen", "AXShowMenu"]), .open)
        XCTAssertEqual(AXLadder.selectOperation(count: 3, actions: ["AXOpen"]), .open)
        // Nothing to open: a double click only selects (official), and the result says so (openUnavailable).
        XCTAssertEqual(AXLadder.selectOperation(count: 2, actions: ["AXShowMenu"]), .select)
    }

    func testDragStartReason() {
        // A link (the hit, or a parent within four levels) or a picture (the hit): a system drag session.
        XCTAssertEqual(AXLadder.dragStartReason(roles: ["AXLink", "AXGroup", "AXWebArea"]), "system_drag_session")
        XCTAssertEqual(AXLadder.dragStartReason(roles: ["AXStaticText", "AXLink", "AXGroup"]), "system_drag_session")
        XCTAssertEqual(AXLadder.dragStartReason(roles: ["AXImage", "AXGroup", "AXWebArea"]), "system_drag_session")
        // A pop-up / pull-down menu control: its menu would open.
        XCTAssertEqual(AXLadder.dragStartReason(roles: ["AXPopUpButton", "AXGroup", "AXWindow"]), "popup_menu")
        XCTAssertEqual(AXLadder.dragStartReason(roles: ["AXStaticText", "AXMenuButton", "AXToolbar"]), "popup_menu")
        // Text, a slider, a row: the drag may start.
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXTextArea", "AXScrollArea", "AXWindow"]))
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXSlider", "AXGroup", "AXWindow"]))
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXTextField", "AXCell", "AXRow", "AXOutline"]))
        // A picture that is not the hit (an image beside the text) does not count; the climb stops at the window.
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXStaticText", "AXImage", "AXGroup"]))
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXGroup", "AXWindow", "AXLink"]))
        // At most four parents above the hit.
        XCTAssertNil(AXLadder.dragStartReason(roles: ["AXStaticText", "AXGroup", "AXGroup", "AXGroup", "AXGroup", "AXLink"]))
        XCTAssertNil(AXLadder.dragStartReason(roles: []))
    }
}
