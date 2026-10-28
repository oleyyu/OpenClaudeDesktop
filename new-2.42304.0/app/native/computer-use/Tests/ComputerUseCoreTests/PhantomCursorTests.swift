import XCTest
@testable import ComputerUseCore

/// The phantom cursor's geometry and stacking decisions (official 2.42304.0 §2.6.2). No panel is shown: `swift test`
/// has no Cocoa run loop on its main thread to order windows in (the live check runs inside the app).
final class PhantomCursorTests: XCTestCase {
    func testCollectionBehaviourIsTheOfficialOne() {
        let behaviour = NSWindow.CollectionBehavior(rawValue: PhantomCursorGeometry.collectionBehaviorRaw)
        XCTAssertEqual(PhantomCursorGeometry.collectionBehaviorRaw, 0x150)
        XCTAssertTrue(behaviour.contains(.stationary))
        XCTAssertTrue(behaviour.contains(.ignoresCycle))
        XCTAssertTrue(behaviour.contains(.fullScreenAuxiliary))
        XCTAssertFalse(behaviour.contains(.canJoinAllSpaces))
        XCTAssertFalse(behaviour.contains(.moveToActiveSpace))
    }

    func testTheTipIsThePanelCentreOnAnyDisplay() {
        // Primary display 956 pt high. A point on it, one on a display to the left (negative x), one above (negative y),
        // one below the primary.
        for (x, y) in [(400.0, 300.0), (-1200.0, 200.0), (300.0, -700.0), (100.0, 1500.0)] {
            let frame = PhantomCursorGeometry.frame(screenX: x, screenY: y, primaryHeight: 956)
            XCTAssertEqual(frame.size, CGSize(width: 56, height: 56))
            XCTAssertEqual(frame.origin.x, x - 28)
            XCTAssertEqual(frame.origin.y, 956 - y - 28)
            let tip = PhantomCursorGeometry.tip(of: frame, primaryHeight: 956)
            XCTAssertEqual(tip.x, x, accuracy: 1e-9)
            XCTAssertEqual(tip.y, y, accuracy: 1e-9)
        }
    }

    func testTheArrowStartsAtTheCentreAndPointsDownRight() {
        let points = PhantomCursorGeometry.layerPoints()
        XCTAssertEqual(points.count, 7)
        XCTAssertEqual(points[0], CGPoint(x: 28, y: 28))
        XCTAssertEqual(points[1], CGPoint(x: 28, y: 10))       // (0, 18): straight down on screen
        XCTAssertEqual(points[3], CGPoint(x: 35.5, y: 6.5))    // the tail (7.5, 21.5)
        XCTAssertEqual(points[6], CGPoint(x: 42, y: 15))       // (14, 13)
        XCTAssertTrue(points.allSatisfy { $0.x >= 28 && $0.y <= 28 && $0.x <= 56 && $0.y >= 0 }, "inside the panel, below-right of the tip")
    }

    func testPlacementFollowsTheTargetWindow() {
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: 42, layer: 0, onScreen: true), .aboveTarget(layer: 0))
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: 42, layer: 3, onScreen: true), .aboveTarget(layer: 3))
        // Minimized, hidden, on another Space: not on screen.
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: 42, layer: 0, onScreen: false), .away)
        // Gone.
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: 42, layer: nil, onScreen: nil), .away)
        // No window: floating, ordered front.
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: nil, layer: nil, onScreen: nil), .floating)
        XCTAssertEqual(PhantomCursorGeometry.placement(windowId: 0, layer: nil, onScreen: nil), .floating)
    }

    func testWithoutAMainRunLoopTheCallFailsInsteadOfHanging() throws {
        // XCTest's main thread is busy running this test (on the main thread `run` runs inline), so ask from another
        // thread while the main thread is blocked: the hop cannot start and must time out.
        let blocker = DispatchSemaphore(value: 0)
        let finished = expectation(description: "worker")
        var code: String?
        var ran = false
        DispatchQueue.global().async {
            do { _ = try MainThread.run(timeout: 0.2) { ran = true } } catch let error as CUError { code = error.code } catch {}
            blocker.signal()
            finished.fulfill()
        }
        blocker.wait()   // the main thread is held until the worker has given up
        wait(for: [finished], timeout: 1)
        XCTAssertEqual(code, "main_thread_unavailable")
        // The cancelled block does nothing once the main queue drains.
        RunLoop.main.run(until: Date().addingTimeInterval(0.05))
        XCTAssertFalse(ran)
        // On the main thread itself it runs inline.
        XCTAssertEqual(try MainThread.run { 7 }, 7)
    }
}
