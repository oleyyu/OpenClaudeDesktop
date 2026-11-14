import XCTest
@testable import ComputerUseCore

/// The target window highlight's geometry and placement decisions (WindowHighlight.swift). No panel is shown: `swift
/// test` has no Cocoa run loop on its main thread to order windows in (the live check runs inside the app).
final class WindowHighlightTests: XCTestCase {
    func testCollectionBehaviourIsThePhantomCursorsOfficialOne() {
        XCTAssertEqual(WindowHighlightGeometry.collectionBehaviorRaw, PhantomCursorGeometry.collectionBehaviorRaw)
        let behaviour = NSWindow.CollectionBehavior(rawValue: WindowHighlightGeometry.collectionBehaviorRaw)
        XCTAssertTrue(behaviour.contains(.stationary))
        XCTAssertTrue(behaviour.contains(.ignoresCycle))
        XCTAssertTrue(behaviour.contains(.fullScreenAuxiliary))
        XCTAssertFalse(behaviour.contains(.canJoinAllSpaces))
        XCTAssertFalse(behaviour.contains(.moveToActiveSpace))
    }

    func testTheRimIsTheGlowPagesBoxShadow() {
        // glow-page.cjs #glow: inset 0 0 50px rgba(217,119,87,.5), 100px .3, 150px .1; glow-pulse 50 %: 65 .7, 115 .5, 165 .2.
        XCTAssertEqual(WindowHighlightGeometry.rest.map(\.blur), [50, 100, 150])
        XCTAssertEqual(WindowHighlightGeometry.rest.map(\.alpha), [0.5, 0.3, 0.1])
        XCTAssertEqual(WindowHighlightGeometry.peak.map(\.blur), [65, 115, 165])
        XCTAssertEqual(WindowHighlightGeometry.peak.map(\.alpha), [0.7, 0.5, 0.2])
        XCTAssertEqual(WindowHighlightGeometry.pulsePeriod, 2)
        XCTAssertEqual(WindowHighlightGeometry.fade, 0.3)
        XCTAssertEqual(WindowHighlightGeometry.hideAfter, 0.32)
        XCTAssertEqual(WindowHighlightGeometry.clay.r * 255, 217, accuracy: 1e-9)
        XCTAssertEqual(WindowHighlightGeometry.clay.g * 255, 119, accuracy: 1e-9)
        XCTAssertEqual(WindowHighlightGeometry.clay.b * 255, 87, accuracy: 1e-9)
    }

    func testTheFrameIsTheWindowsBoundsOnAnyDisplay() {
        // Primary display 956 pt high: a window on it, one on a display to the left (negative x), one above (negative
        // y), one below the primary.
        for bounds in [CGRect(x: 100, y: 80, width: 800, height: 600), CGRect(x: -1500, y: 200, width: 640, height: 480),
                       CGRect(x: 300, y: -900, width: 500, height: 400), CGRect(x: 10, y: 1200, width: 300, height: 200)] {
            let frame = WindowHighlightGeometry.frame(bounds: bounds, primaryHeight: 956)
            XCTAssertEqual(frame.size, bounds.size)
            XCTAssertEqual(frame.origin.x, bounds.minX)
            XCTAssertEqual(frame.origin.y, 956 - bounds.maxY)
            XCTAssertEqual(WindowHighlightGeometry.bounds(of: frame, primaryHeight: 956), bounds)
        }
    }

    func testPlacementFollowsTheTargetWindow() {
        let bounds = CGRect(x: 10, y: 20, width: 300, height: 200)
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: 0, onScreen: true, bounds: bounds), .aboveTarget(layer: 0, bounds: bounds))
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: 3, onScreen: true, bounds: bounds), .aboveTarget(layer: 3, bounds: bounds))
        // Minimized, hidden, on another Space: not on screen.
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: 0, onScreen: false, bounds: bounds), .away)
        // Gone, or nothing to cover.
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: nil, onScreen: nil, bounds: nil), .away)
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: 0, onScreen: true, bounds: CGRect(x: 0, y: 0, width: 0, height: 10)), .away)
    }

    func testTheRingCastsInwardOnly() {
        // The ring covers everything around the rect out to the reach and nothing inside it (non-zero winding, the
        // rule a shadowPath uses).
        let size = CGSize(width: 400, height: 300)
        let ring = WindowHighlightGeometry.ringPath(size: size, reach: 330)
        for inside in [CGPoint(x: 1, y: 1), CGPoint(x: 200, y: 150), CGPoint(x: 399, y: 299)] {
            XCTAssertFalse(ring.contains(inside, using: .winding), "\(inside) is in the hole")
        }
        for outside in [CGPoint(x: -1, y: 150), CGPoint(x: 401, y: 150), CGPoint(x: 200, y: -10), CGPoint(x: 200, y: 310), CGPoint(x: -329, y: -329)] {
            XCTAssertTrue(ring.contains(outside, using: .winding), "\(outside) casts")
        }
        XCTAssertFalse(ring.contains(CGPoint(x: -331, y: 0), using: .winding))
    }

    func testTheRimImageIsClayAtTheEdgesAndClearInside() throws {
        // The rest rim at 1×: a square of 2 × 170 + 1 pt, the 1 pt middle as the nine-slice centre.
        XCTAssertEqual(WindowHighlightGeometry.side, 341)
        XCTAssertEqual(WindowHighlightGeometry.contentsCenter.minX * 341, 170, accuracy: 1e-9)
        XCTAssertEqual(WindowHighlightGeometry.contentsCenter.width * 341, 1, accuracy: 1e-9)
        for (shadows, name) in [(WindowHighlightGeometry.rest, "rest"), (WindowHighlightGeometry.peak, "peak")] {
            let image = try XCTUnwrap(WindowHighlightGeometry.rimImage(shadows, scale: 1), name)
            XCTAssertEqual(image.width, 341)
            let pixel = try pixels(image)
            let edge = pixel(0, 170), inset60 = pixel(60, 170), middle = pixel(170, 170), corner = pixel(0, 0)
            // Premultiplied RGBA: clay hue (r > g > b), strong at the edge.
            // At the edge each inset shadow is half its alpha (half the blur falls outside): rest 1 − .75·.85·.95 ≈ .394
            // (100/255), peak 1 − .65·.75·.9 ≈ .561 (143/255), as the CSS shadows composite.
            XCTAssertEqual(Double(edge.a) / 255, name == "rest" ? 0.394 : 0.561, accuracy: 0.02, "\(name) edge \(edge)")
            XCTAssertTrue(edge.r > edge.g && edge.g > edge.b, "\(name) edge is clay \(edge)")
            XCTAssertGreaterThanOrEqual(corner.a, edge.a, "\(name) corner: two edges cast")
            XCTAssertLessThan(inset60.a, edge.a, "\(name) fades inward")
            XCTAssertLessThan(middle.a, 12, "\(name) the middle is (nearly) clear: \(middle)")
            // Symmetric on all four sides.
            for other in [pixel(340, 170), pixel(170, 0), pixel(170, 340)] { XCTAssertEqual(Int(other.a), Int(edge.a), accuracy: 2) }
        }
        // The peak is stronger than the rest at the same depth, as the keyframe's 50 %.
        let rest = try pixels(XCTUnwrap(WindowHighlightGeometry.rimImage(WindowHighlightGeometry.rest, scale: 1)))
        let peak = try pixels(XCTUnwrap(WindowHighlightGeometry.rimImage(WindowHighlightGeometry.peak, scale: 1)))
        XCTAssertGreaterThan(peak(30, 170).a, rest(30, 170).a)
        // 2×: the same picture at twice the pixels.
        let retina = try XCTUnwrap(WindowHighlightGeometry.rimImage(WindowHighlightGeometry.rest, scale: 2))
        XCTAssertEqual(retina.width, 682)
        XCTAssertEqual(Int(try pixels(retina)(120, 341).a), Int(rest(60, 170).a), accuracy: 6)
    }

    private func pixels(_ image: CGImage) throws -> (Int, Int) -> (r: UInt8, g: UInt8, b: UInt8, a: UInt8) {
        let width = image.width, height = image.height
        var data = [UInt8](repeating: 0, count: width * height * 4)
        let space = try XCTUnwrap(CGColorSpace(name: CGColorSpace.sRGB))
        let context = try XCTUnwrap(CGContext(data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                                              space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        let copy = data
        return { x, y in let i = (y * width + x) * 4; return (copy[i], copy[i + 1], copy[i + 2], copy[i + 3]) }
    }

    func testTargetInfoOfNoWindowIsEmpty() {
        let info = WindowHighlightGeometry.targetInfo(0)
        XCTAssertNil(info.layer)
        XCTAssertNil(info.onScreen)
        XCTAssertNil(info.bounds)
        // A window id nobody has.
        let gone = WindowHighlightGeometry.targetInfo(UInt32.max - 7)
        XCTAssertEqual(WindowHighlightGeometry.placement(layer: gone.layer, onScreen: gone.onScreen, bounds: gone.bounds), .away)
    }
}
