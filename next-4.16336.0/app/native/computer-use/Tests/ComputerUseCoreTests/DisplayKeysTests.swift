import XCTest
import CoreGraphics
@testable import ComputerUseCore

/// The display-scope keyboard's key names and chords (official key / hold_key, §1.1). No event is posted.
final class DisplayKeysTests: XCTestCase {
    func testKeyCodes() {
        let expected: [String: CGKeyCode] = ["a": 0, "z": 6, "return": 36, "enter": 36, "tab": 48, "space": 49, "backspace": 51,
            "delete": 51, "escape": 53, "forward_delete": 117, "forwarddelete": 117, "left": 123, "right": 124, "down": 125,
            "up": 126, "home": 115, "end": 119, "pageup": 116, "page_down": 121, "f1": 122, "f5": 96, "f12": 111, "f20": 90,
            "kp_enter": 76, "kp_0": 82, "kp_9": 92, "minus": 27, "-": 27, "comma": 43, "slash": 44, "1": 18, "0": 29, "`": 50,
            "insert": 114, "help": 114, "A": 0, "Return": 36]
        for (name, code) in expected { XCTAssertEqual(GlobalKeys.keyCode(name), code, name) }
        for name in ["f0", "f21", "bogus", "cmd", "shift", "", "volumeup", "!"] { XCTAssertNil(GlobalKeys.keyCode(name), name) }
    }

    func testChordResolution() throws {
        let chord = try GlobalKeys.resolve(modifiers: ["shift", "cmd"], keys: ["a"])
        XCTAssertEqual(chord.mods.map(\.0), [56, 55], "modifiers go down in the order ctrl, alt, shift, cmd")
        XCTAssertEqual(chord.keys, [0])
        let fn = try GlobalKeys.resolve(modifiers: [], keys: ["fn", "left"])
        XCTAssertEqual(fn.mods.map(\.0), [63])
        XCTAssertEqual(fn.keys, [123])
        let only = try GlobalKeys.resolve(modifiers: ["shift"], keys: [])
        XCTAssertEqual(only.mods.count, 1)
        XCTAssertEqual(only.keys, [])
        XCTAssertEqual(try GlobalKeys.resolve(modifiers: ["cmd"], keys: ["cmd", "s"]).mods.count, 1, "a modifier named twice is pressed once")
        XCTAssertThrowsError(try GlobalKeys.resolve(modifiers: [], keys: ["bogus"]))
        XCTAssertThrowsError(try GlobalKeys.resolve(modifiers: ["hyper"], keys: ["a"]))
        XCTAssertThrowsError(try GlobalKeys.resolve(modifiers: [], keys: []))
    }

    func testAbortFlag() {
        GlobalKeys.begin()
        XCTAssertFalse(GlobalKeys.isAborted)
        GlobalKeys.abort()
        XCTAssertTrue(GlobalKeys.isAborted)
        GlobalKeys.begin()
        XCTAssertFalse(GlobalKeys.isAborted, "each operation starts uncancelled")
        XCTAssertEqual(GlobalKeys.held, 0)
    }

    /// A Stop between two retries of one operation is not lost: the retry's begin() keeps that id cancelled.
    func testAbortByOperationSurvivesRetry() {
        GlobalKeys.begin(901)
        GlobalKeys.abort(901)
        XCTAssertTrue(GlobalKeys.isAborted)
        GlobalKeys.begin(901)
        XCTAssertTrue(GlobalKeys.isAborted, "the retry of a cancelled operation starts cancelled")
        GlobalKeys.begin(902)
        XCTAssertFalse(GlobalKeys.isAborted, "another operation is not cancelled by it")
        GlobalKeys.abort(903)
        XCTAssertFalse(GlobalKeys.isAborted, "an abort of an id that isn't running doesn't stop the running one")
        GlobalKeys.begin(903)
        XCTAssertTrue(GlobalKeys.isAborted, "… but that operation starts cancelled when it runs")
        GlobalKeys.begin(904)
        GlobalKeys.abort()
        XCTAssertTrue(GlobalKeys.isAborted, "an abort without an id stops what runs")
        GlobalKeys.begin(904)
        XCTAssertTrue(GlobalKeys.isAborted, "… and its retries")
        GlobalKeys.begin()
        XCTAssertFalse(GlobalKeys.isAborted)
    }
}
