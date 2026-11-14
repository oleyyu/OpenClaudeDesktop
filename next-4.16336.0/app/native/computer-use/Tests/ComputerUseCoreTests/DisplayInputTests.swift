import XCTest
import CoreGraphics
@testable import ComputerUseCore

/// The pure parts of the display-scope layer (DisplayInput.swift): the cursor-move path, the modifier flags, and the
/// display-containment hit test. Nothing here posts an event or touches the window server.
final class DisplayInputTests: XCTestCase {
    func testPathStartsPastTheOriginAndEndsAtTheTarget() {
        let from = CGPoint(x: 0, y: 0), to = CGPoint(x: 400, y: 0)
        let path = GlobalInput.path(from: from, to: to)
        XCTAssertFalse(path.isEmpty)
        XCTAssertLessThanOrEqual(path.count, 10)
        XCTAssertNotEqual(path.first, from, "the first sample moves past the origin")
        XCTAssertEqual(path.last, to, "the last sample is the target")
    }

    func testShortMoveIsOneStep() {
        XCTAssertEqual(GlobalInput.path(from: .zero, to: CGPoint(x: 5, y: 5)).count, 1)
    }

    func testFlagsMapNamesAndRejectUnknown() throws {
        let flags = try GlobalInput.flags(["cmd", "shift"])
        XCTAssertTrue(flags.contains(.maskCommand))
        XCTAssertTrue(flags.contains(.maskShift))
        XCTAssertFalse(flags.contains(.maskControl))
        XCTAssertThrowsError(try GlobalInput.flags(["hyper"]))
    }

    func testContainingPicksTheDisplayAroundThePoint() {
        let a = Displays.Info(displayId: 1, bounds: CGRect(x: 0, y: 0, width: 1000, height: 800), pixelWidth: 2000, pixelHeight: 1600, isMain: true, name: "A")
        let b = Displays.Info(displayId: 2, bounds: CGRect(x: 1000, y: 0, width: 800, height: 600), pixelWidth: 800, pixelHeight: 600, isMain: false, name: "B")
        XCTAssertEqual(Displays.containing(CGPoint(x: 500, y: 400), in: [a, b])?.displayId, 1)
        XCTAssertEqual(Displays.containing(CGPoint(x: 1400, y: 300), in: [a, b])?.displayId, 2)
        XCTAssertNil(Displays.containing(CGPoint(x: 5000, y: 5000), in: [a, b]))
        XCTAssertEqual(a.scaleFactor, 2, accuracy: 0.0001)
    }

    func testButtonTypesMapAndRejectUnknown() {
        XCTAssertNotNil(GlobalInput.buttonTypes("left"))
        XCTAssertNotNil(GlobalInput.buttonTypes("right"))
        XCTAssertNotNil(GlobalInput.buttonTypes("middle"))
        XCTAssertNil(GlobalInput.buttonTypes("back"))
    }

    func testDragPathHasTheFixedStepCountAndEndsAtTheTarget() {
        let path = GlobalInput.path(from: .zero, to: CGPoint(x: 300, y: 120), steps: 20)
        XCTAssertEqual(path.count, 20)
        XCTAssertEqual(path.last, CGPoint(x: 300, y: 120))
        XCTAssertEqual(GlobalInput.path(from: .zero, to: CGPoint(x: 3, y: 0), steps: 20).count, 20, "a drag path keeps its samples even when short")
    }

    func testMouseUpWithoutAHeldButtonPostsNothing() throws {
        XCTAssertFalse(GlobalInput.isHeld)
        let result = try GlobalInput.mouseUp()
        XCTAssertEqual(result["outcome"] as? String, "ok")
        XCTAssertEqual(result["delivered"] as? Bool, false)
        XCTAssertEqual(result["wasHeld"] as? Bool, false)
    }
}
