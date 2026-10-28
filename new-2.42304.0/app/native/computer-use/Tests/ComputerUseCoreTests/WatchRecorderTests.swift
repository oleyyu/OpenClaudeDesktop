import XCTest
import CoreGraphics
@testable import ComputerUseCore

/// Watch-record's recorder payloads (WatchRecorder.swift): what one observed event becomes. Nothing is listened to here
/// (no tap is installed); the payload builders are pure.
final class WatchRecorderTests: XCTestCase {
    func testKeptModifiersAreShiftControlOptionCommand() {
        // The original's KLa: 1<<17 | 1<<18 | 1<<19 | 1<<20.
        XCTAssertEqual(WatchRecorder.keptModifiers, UInt64((1 << 17) | (1 << 18) | (1 << 19) | (1 << 20)))
    }

    func testSecureInputKeepsNoKeyAndNoCharacters() {
        let flags = CGEventFlags.maskCommand.rawValue | CGEventFlags.maskNumericPad.rawValue
        let payload = WatchRecorder.keyPayload(t: 12.5, flags: flags, keyCode: 0, chars: "a", charsIgnoringModifiers: "a", secure: true)
        XCTAssertEqual(payload["kind"] as? String, "key")
        XCTAssertEqual(payload["secureInput"] as? Bool, true)
        XCTAssertNil(payload["keyCode"])
        XCTAssertNil(payload["chars"])
        XCTAssertNil(payload["charsIgnoringModifiers"])
        XCTAssertEqual(payload["modifiers"] as? Int, Int(CGEventFlags.maskCommand.rawValue))
    }

    func testKeyPayloadOutsideSecureInput() {
        let payload = WatchRecorder.keyPayload(t: 3, flags: CGEventFlags.maskShift.rawValue, keyCode: 0, chars: "A", charsIgnoringModifiers: "a", secure: false)
        XCTAssertEqual(payload["keyCode"] as? Int, 0)
        XCTAssertEqual(payload["chars"] as? String, "A")
        XCTAssertEqual(payload["charsIgnoringModifiers"] as? String, "a")
        XCTAssertNil(payload["secureInput"])
        XCTAssertEqual(payload["modifiers"] as? Int, 1 << 17)
    }

    func testPointerAndScrollPayloads() {
        let click = WatchRecorder.pointerPayload(kind: "leftMouseDown", t: 1, location: CGPoint(x: -120.5, y: 40), flags: 0)
        XCTAssertEqual(click["kind"] as? String, "leftMouseDown")
        XCTAssertEqual(click["x"] as? Double, -120.5)
        XCTAssertEqual(click["y"] as? Double, 40)
        let scroll = WatchRecorder.scrollPayload(t: 2, location: .zero, flags: CGEventFlags.maskAlphaShift.rawValue, dx: 0, dy: 3)
        XCTAssertEqual(scroll["scrollDY"] as? Double, 3)
        XCTAssertEqual(scroll["scrollDX"] as? Double, 0)
        XCTAssertEqual(scroll["modifiers"] as? Int, 0)   // caps lock is not kept
    }

    func testDrainWithoutRecordingIsEmpty() {
        let drained = WatchRecorder.shared.drain()
        XCTAssertEqual((drained["events"] as? [Any])?.count, 0)
        XCTAssertFalse(WatchRecorder.shared.isRecording)
    }
}
