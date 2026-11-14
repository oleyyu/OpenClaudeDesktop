import XCTest
import CoreGraphics
import AppKit
@testable import ComputerUseCore

final class DragTests: XCTestCase {
    let targets = (0...12).map { i in
        EventFactory.Target(pid: 123, windowId: 456, screenPoint: CGPoint(x: 100 + i * 10, y: 200),
                            windowLocal: CGPoint(x: i * 10, y: 20))
    }

    func testSamplingUsesFullResolutionDistanceAndPreservesCorners() {
        let first = targets[0]
        let corner = first.moved(screenPoint: CGPoint(x: 100, y: 350), windowLocal: CGPoint(x: 0, y: 170))
        let end = first.moved(screenPoint: CGPoint(x: 250, y: 350), windowLocal: CGPoint(x: 150, y: 170))
        let samples = Dispatcher.dragSamples(vertices: [first, first, corner, corner, end], pixelScale: 2)
        XCTAssertEqual(samples.count, 61) // 300 screen points × 2 / 10 = 60 drag events
        XCTAssertEqual(samples[30].screenPoint, corner.screenPoint)
        XCTAssertEqual(samples.last?.screenPoint, end.screenPoint)
        for point in samples {
            XCTAssertEqual(point.screenPoint.x - point.windowLocal.x, 100, accuracy: 0.0001)
            XCTAssertEqual(point.screenPoint.y - point.windowLocal.y, 180, accuracy: 0.0001)
        }
        XCTAssertEqual(Dispatcher.dragSamples(vertices: [first, targets[1]], pixelScale: 1).count, 13)
        XCTAssertTrue(Dispatcher.dragSamples(vertices: [first, first], pixelScale: 2).isEmpty)
        let far = first.moved(screenPoint: CGPoint(x: 10000, y: 200), windowLocal: CGPoint(x: 9900, y: 20))
        XCTAssertEqual(Dispatcher.dragSamples(vertices: [first, far], pixelScale: 2).count, 61)
    }

    func testShortWaypointDetoursAreNotSkipped() {
        let first = targets[0]
        var vertices: [EventFactory.Target] = [first]
        for i in 1...20 {
            let x = CGFloat(i), y = CGFloat(i % 2)
            vertices.append(first.moved(screenPoint: CGPoint(x: 100 + x, y: 200 + y),
                                        windowLocal: CGPoint(x: x, y: 20 + y)))
        }
        let samples = Dispatcher.dragSamples(vertices: vertices, pixelScale: 1)
        XCTAssertEqual(samples.count, 21)
        XCTAssertEqual(samples.map(\.screenPoint), vertices.map(\.screenPoint))
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

    func testGateAfterPrepareAndAlternateButtons() {
        var events: [CGEventType] = []
        let refused = Dispatcher.dragSequence(targets: targets, buttonName: "left",
            refusal: { events.isEmpty ? nil : "screen_locked" }, pause: { _ in }) { kind, _ in events.append(kind) }
        XCTAssertEqual(events, [.mouseMoved])
        XCTAssertFalse(refused.pressed)
        let buttons: [(String, CGEventType, CGEventType, CGEventType)] = [
            ("right", .rightMouseDown, .rightMouseDragged, .rightMouseUp),
            ("middle", .otherMouseDown, .otherMouseDragged, .otherMouseUp),
        ]
        for (name, down, dragged, up) in buttons {
            events = []
            let result = Dispatcher.dragSequence(targets: targets, buttonName: name, refusal: { nil },
                pause: { _ in }) { kind, _ in events.append(kind) }
            XCTAssertTrue(result.released)
            XCTAssertEqual(events, [.mouseMoved, down] + Array(repeating: dragged, count: 12) + [up, .mouseMoved])
        }
    }

    func testFactorySetsPidClickStateAndWindowFieldsForEveryDragEvent() throws {
        let source = try EventFactory.source().get()
        typealias GetLocation = @convention(c) (CGEvent) -> CGPoint
        let symbol = try XCTUnwrap(dlsym(UnsafeMutableRawPointer(bitPattern: -2), "CGEventGetWindowLocation"))
        let local = unsafeBitCast(symbol, to: GetLocation.self)
        for kind: CGEventType in [.mouseMoved, .leftMouseDown, .leftMouseDragged, .leftMouseUp] {
            let event = try XCTUnwrap(EventFactory.mouse(source, kind, targets[0], button: .left))
            XCTAssertEqual(event.getIntegerValueField(.eventTargetUnixProcessID), 123)
            XCTAssertEqual(event.getIntegerValueField(.mouseEventClickState), 1)
            XCTAssertEqual(event.getIntegerValueField(CGEventField(rawValue: 91)!), 456)
            XCTAssertEqual(event.getIntegerValueField(CGEventField(rawValue: 92)!), 456)
            XCTAssertEqual(NSEvent(cgEvent: event)?.windowNumber, 456)
            XCTAssertEqual(event.location, targets[0].screenPoint)
            XCTAssertEqual(local(event), targets[0].windowLocal)
        }
    }
}
