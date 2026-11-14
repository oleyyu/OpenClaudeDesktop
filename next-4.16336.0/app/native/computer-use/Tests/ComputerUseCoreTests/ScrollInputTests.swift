import XCTest
@testable import ComputerUseCore

/// app_scroll's arithmetic and scroll-bar choice (official 2.42304.0 §1.6.2). No app is touched.
final class ScrollInputTests: XCTestCase {
    func testStepAndSaturation() {
        XCTAssertEqual(ScrollInput.next(current: 0, dy: 3), 0.15, accuracy: 1e-9)
        XCTAssertEqual(ScrollInput.next(current: 0.5, dy: -2), 0.4, accuracy: 1e-9)
        XCTAssertEqual(ScrollInput.next(current: 0.9, dy: 5), 1)
        XCTAssertEqual(ScrollInput.next(current: 0.1, dy: -5), 0)
        XCTAssertEqual(ScrollInput.next(current: 0.3, dy: 0.5), 0.325, accuracy: 1e-9)
        XCTAssertEqual(ScrollInput.limit(current: 1, dy: 2), "bottom")
        XCTAssertEqual(ScrollInput.limit(current: 0, dy: -1), "top")
        XCTAssertNil(ScrollInput.limit(current: 0.99, dy: 1))
        XCTAssertNil(ScrollInput.limit(current: 0.5, dy: 0))
        XCTAssertEqual(ScrollInput.limit(current: 0, dy: 0), "top")
        XCTAssertEqual(ScrollInput.shown(0.15), "0.15")
        XCTAssertEqual(ScrollInput.shown(1), "1.00")
    }

    func testPickClimbsToTheFirstVerticalBar() {
        typealias N = ScrollInput.Node
        // TextEdit: AXTextArea ▸ AXScrollArea (with a vertical bar) ▸ AXWindow.
        XCTAssertEqual(ScrollInput.pick([N(role: "AXTextArea"), N(role: "AXScrollArea", hasVerticalBar: true), N(role: "AXWindow")]), .areaBar(1))
        // Finder list: AXStaticText ▸ AXCell ▸ AXRow ▸ AXOutline ▸ AXScrollArea.
        XCTAssertEqual(ScrollInput.pick([N(role: "AXStaticText"), N(role: "AXCell"), N(role: "AXRow"), N(role: "AXOutline"),
                                         N(role: "AXScrollArea", hasVerticalBar: true), N(role: "AXSplitGroup"), N(role: "AXWindow")]), .areaBar(4))
        // A scroll area that cannot scroll vertically is passed for the one around it.
        XCTAssertEqual(ScrollInput.pick([N(role: "AXTable"), N(role: "AXScrollArea"), N(role: "AXGroup"), N(role: "AXScrollArea", hasVerticalBar: true)]), .areaBar(3))
        // The vertical bar itself; a horizontal one climbs on to its scroll area.
        XCTAssertEqual(ScrollInput.pick([N(role: "AXScrollBar", orientation: "AXVerticalOrientation"), N(role: "AXScrollArea", hasVerticalBar: true)]), .bar(0))
        XCTAssertEqual(ScrollInput.pick([N(role: "AXScrollBar", orientation: "AXHorizontalOrientation"), N(role: "AXScrollArea", hasVerticalBar: true)]), .areaBar(1))
        // Nothing before the window (or a sheet): no bar, even if one is further up.
        XCTAssertNil(ScrollInput.pick([N(role: "AXButton"), N(role: "AXWindow"), N(role: "AXScrollArea", hasVerticalBar: true)]))
        XCTAssertNil(ScrollInput.pick([N(role: "AXTextField"), N(role: "AXSheet"), N(role: "AXScrollArea", hasVerticalBar: true)]))
        XCTAssertNil(ScrollInput.pick([N(role: "AXButton"), N(role: "AXGroup")]))
    }
}
