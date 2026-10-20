import XCTest
import CoreGraphics
@testable import ComputerUseCore

final class DragTests: XCTestCase {
    let targets = (0...12).map { i in
        EventFactory.Target(pid: 123, windowId: 456, screenPoint: CGPoint(x: 100 + i * 10, y: 200),
                            windowLocal: CGPoint(x: i * 10, y: 20))
    }

    func testPreparePressReleaseSettleAndRouting() {
        var events: [CGEventType] = [], pauses: [useconds_t] = []
        let result = Dispatcher.dragSequence(targets: targets, buttonName: "left", refusal: { nil }, now: { 0 },
            pause: { pauses.append($0) }) { kind, target in
                events.append(kind)
                XCTAssertEqual(target.pid, 123)
                XCTAssertEqual(target.windowId, 456)
                XCTAssertEqual(target.screenPoint.x - target.windowLocal.x, 100)
            }
        XCTAssertNil(result.reason)
        XCTAssertTrue(result.released)
        XCTAssertEqual(events, [.mouseMoved, .leftMouseDown] + Array(repeating: .leftMouseDragged, count: 12) + [.leftMouseUp, .mouseMoved])
        XCTAssertEqual(pauses, [16_000, 20_000, 20_000, 20_000] + Array(repeating: 10_000, count: 9))
    }

    func testEveryMidDragGateReleasesAtLastDeliveredPoint() {
        for reason in ["secure_input_active", "user_actively_typing", "foreign_pid", "screen_locked"] {
            var events: [(CGEventType, CGPoint)] = []
            let result = Dispatcher.dragSequence(targets: targets, buttonName: "left",
                refusal: { events.count >= 5 ? reason : nil }, now: { 0 }, pause: { _ in }) {
                    events.append(($0, $1.screenPoint))
                }
            XCTAssertEqual(result.reason, reason)
            XCTAssertTrue(result.pressed)
            XCTAssertTrue(result.released)
            XCTAssertEqual(events.last?.0, .leftMouseUp)
            XCTAssertEqual(events.last?.1, events[events.count - 2].1)
            XCTAssertEqual(events.filter { $0.0 == .leftMouseUp }.count, 1)
            XCTAssertEqual(result.moved, 3)
        }
    }

    func testDeadlineAndPrePressRefusal() {
        var time = 0.0, events: [CGEventType] = []
        let timedOut = Dispatcher.dragSequence(targets: targets, buttonName: "right", refusal: { nil }, now: { time },
            pause: { _ in time += 1 }) { kind, _ in events.append(kind) }
        XCTAssertEqual(timedOut.reason, "drag_timeout")
        XCTAssertEqual(events, [.mouseMoved, .rightMouseDown, .rightMouseDragged, .rightMouseUp])
        XCTAssertTrue(timedOut.released)
        events = []
        let refused = Dispatcher.dragSequence(targets: targets, buttonName: "left", refusal: { "screen_locked" },
            pause: { _ in }) { kind, _ in events.append(kind) }
        XCTAssertFalse(refused.pressed)
        XCTAssertTrue(events.isEmpty)
    }

    func testFactorySetsPidClickStateAndWindowFieldsForEveryDragEvent() throws {
        let source = try EventFactory.source().get()
        for kind: CGEventType in [.mouseMoved, .leftMouseDown, .leftMouseDragged, .leftMouseUp] {
            let event = try XCTUnwrap(EventFactory.mouse(source, kind, targets[0], button: .left))
            XCTAssertEqual(event.getIntegerValueField(.eventTargetUnixProcessID), 123)
            XCTAssertEqual(event.getIntegerValueField(.mouseEventClickState), 1)
            XCTAssertEqual(event.getIntegerValueField(CGEventField(rawValue: 91)!), 456)
            XCTAssertEqual(event.getIntegerValueField(CGEventField(rawValue: 92)!), 456)
        }
    }
}
