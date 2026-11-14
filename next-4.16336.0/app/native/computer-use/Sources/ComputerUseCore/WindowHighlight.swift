import AppKit
import CoreGraphics
import QuartzCore
import ImageIO

/// The target window highlight: while a session works on a window in the background (app_* tools), that window carries
/// the clay rim of the official screen glow (2.42304.0 `cu-glow` page `#glow`, docs/computer-use-glow-design-20261020.md,
/// glow-page.cjs) on its own frame instead of a whole display's. Full-screen control keeps the display glow (glow.cjs).
///
/// 2.42304.0 itself has no window highlight (docs/computer-use-official-spec-20261021.md §2.6.3): what marks the
/// target window there is the phantom cursor, held on the window by its stacking (PhantomCursor.swift). This panel is
/// built from those two official pieces and invents nothing: the rim is the glow page's three inset box-shadows and
/// its 2 s pulse, the fade is the page's .3 s opacity transition, and the panel is stacked like the phantom cursor —
/// a non-activating, click-through, shadowless NSPanel with collection behaviour 0x150 (stationary | ignoresCycle |
/// fullScreenAuxiliary), at the target window's layer, ordered directly above it, put away while the target is not on
/// screen (minimized, hidden, on another Space).
///
/// The frame follows the target: while any highlight is wanted, a 50 ms timer reads the target's kCGWindowBounds and
/// moves / resizes the panel to it; app activation and Space changes restack at once.
///
/// Drawing: the three shadows are drawn by Core Graphics (setShadow, the way an inset box-shadow is drawn: the area
/// around the rect casts into it) once, into a small square image per state — rest and peak — and each image is
/// stretched over the window as a nine-slice (contentsCenter: the corners kept, the 1 pt middle stretched), so a resize
/// is only a frame change. The pulse crossfades the rest and peak images, 1 s each way, ease-in-out.
public enum WindowHighlightGeometry {
    /// .stationary (0x10) | .ignoresCycle (0x40) | .fullScreenAuxiliary (0x100), the phantom cursor's.
    public static let collectionBehaviorRaw: UInt = 0x150
    /// The glow page's `#glow` box-shadow, inset, clay rgba(217, 119, 87, α): (blur px, α) at rest (0 % / 100 %) and at
    /// the `glow-pulse` keyframe's 50 %.
    public static let rest: [(blur: Double, alpha: Double)] = [(50, 0.5), (100, 0.3), (150, 0.1)]
    public static let peak: [(blur: Double, alpha: Double)] = [(65, 0.7), (115, 0.5), (165, 0.2)]
    /// `glow-pulse 2s ease-in-out infinite`: rest → peak → rest, each half ease-in-out.
    public static let pulsePeriod: Double = 2
    /// `#overlay { transition: opacity 0.3s ease-in-out }`, and the page's hide delay ($Fr 320 ms).
    public static let fade: Double = 0.3
    public static let hideAfter: Double = 0.32
    /// How often the frame is matched to the target while a highlight is wanted.
    public static let followInterval: Double = 0.05
    /// Clay #D97757 in sRGB, the glow page's rgb(217, 119, 87).
    public static let clay = (r: 217.0 / 255, g: 119.0 / 255, b: 87.0 / 255)

    /// The nine-slice image's corner size (pt): past it an edge's shadow no longer depends on the other edge. The
    /// widest blur (165 px, a Gaussian of σ 82.5) has faded to ~2 % at 2σ = 165 pt.
    public static let cap: CGFloat = 170
    /// The image's side (pt): two corners and the 1 pt middle that stretches.
    public static var side: CGFloat { 2 * cap + 1 }
    /// The 1 pt middle, as the layer's contentsCenter (unit rect).
    public static var contentsCenter: CGRect { CGRect(x: cap / side, y: cap / side, width: 1 / side, height: 1 / side) }

    /// The rim of one state drawn into a square of `side` points at `scale`: for each shadow, the ring around the
    /// square (outside the canvas) is filled with a clay shadow of that blur and alpha, which falls inside — the inset
    /// box-shadow. Core Graphics shadows are not scaled by the CTM, so the blur is given in pixels (blur × scale);
    /// like CSS, a blur B is a Gaussian of σ ≈ B / 2.
    public static func rimImage(_ shadows: [(blur: Double, alpha: Double)], scale: CGFloat) -> CGImage? {
        let pixels = Int((side * scale).rounded())
        guard pixels > 0, let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(data: nil, width: pixels, height: pixels, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        let size = CGSize(width: pixels, height: pixels)
        let ring = ringPath(size: size, reach: CGFloat(shadows.map(\.blur).max() ?? 0) * 3 * scale)
        for shadow in shadows {
            context.saveGState()
            context.setShadow(offset: .zero, blur: CGFloat(shadow.blur) * scale,
                              color: CGColor(srgbRed: clay.r, green: clay.g, blue: clay.b, alpha: shadow.alpha))
            context.setFillColor(CGColor(srgbRed: clay.r, green: clay.g, blue: clay.b, alpha: 1))
            context.addPath(ring)
            context.fillPath(using: .winding)
            context.restoreGState()
        }
        return context.makeImage()
    }

    /// A window's kCGWindowBounds (global CG rect: top-left origin of the primary display, y down) → the panel's Cocoa
    /// frame (bottom-left origin of the primary screen, y up). `primaryHeight` is NSScreen.screens[0].frame.height.
    public static func frame(bounds: CGRect, primaryHeight: Double) -> CGRect {
        CGRect(x: bounds.minX, y: primaryHeight - bounds.maxY, width: bounds.width, height: bounds.height)
    }

    /// The inverse of `frame`: the CG rect a panel at this Cocoa frame covers.
    public static func bounds(of frame: CGRect, primaryHeight: Double) -> CGRect {
        CGRect(x: frame.minX, y: primaryHeight - frame.maxY, width: frame.width, height: frame.height)
    }

    public enum Placement: Equatable {
        /// On screen: the target's frame and layer, ordered directly above it.
        case aboveTarget(layer: Int, bounds: CGRect)
        /// Not on screen (minimized, hidden, another Space), zero-sized, or gone: put away.
        case away
    }

    /// Where the panel goes, from the target's kCGWindowLayer / kCGWindowIsOnscreen / kCGWindowBounds.
    public static func placement(layer: Int?, onScreen: Bool?, bounds: CGRect?) -> Placement {
        guard let layer, onScreen == true, let bounds, bounds.width >= 1, bounds.height >= 1 else { return .away }
        return .aboveTarget(layer: layer, bounds: bounds)
    }

    /// What casts an inset shadow into a rect of `size`: everything around it out to `reach`, as one non-zero-winding
    /// path (outer rect one way, the hole the other way; a shadowPath has no even-odd rule).
    public static func ringPath(size: CGSize, reach: CGFloat) -> CGPath {
        let path = CGMutablePath()
        let outer = CGRect(x: -reach, y: -reach, width: size.width + 2 * reach, height: size.height + 2 * reach)
        path.addLines(between: [CGPoint(x: outer.minX, y: outer.minY), CGPoint(x: outer.maxX, y: outer.minY),
                                CGPoint(x: outer.maxX, y: outer.maxY), CGPoint(x: outer.minX, y: outer.maxY)])
        path.closeSubpath()
        path.addLines(between: [CGPoint(x: 0, y: 0), CGPoint(x: 0, y: size.height),
                                CGPoint(x: size.width, y: size.height), CGPoint(x: size.width, y: 0)])
        path.closeSubpath()
        return path
    }

    /// The target window's facts from the window server (nil fields: no such window).
    public static func targetInfo(_ windowId: UInt32) -> (layer: Int?, onScreen: Bool?, bounds: CGRect?) {
        guard windowId != 0 else { return (nil, nil, nil) }
        var values: [UnsafeRawPointer?] = [UnsafeRawPointer(bitPattern: UInt(windowId))]
        guard let ids = values.withUnsafeMutableBufferPointer({ CFArrayCreate(nil, $0.baseAddress, 1, nil) }),
              let list = CGWindowListCreateDescriptionFromArray(ids) as? [[String: Any]], let info = list.first else { return (nil, nil, nil) }
        let bounds = (info[kCGWindowBounds as String] as? NSDictionary).flatMap { CGRect(dictionaryRepresentation: $0) }
        return ((info[kCGWindowLayer as String] as? NSNumber)?.intValue, (info[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false, bounds)
    }
}

@MainActor
final class WindowHighlightPanel {
    let windowId: UInt32
    let panel: NSPanel
    private let clip = CALayer()
    /// The rest and peak rims (nine-slice images), crossfaded by the pulse.
    private let restRim = CALayer(), peakRim = CALayer()
    /// Shown and not hidden since: following keeps it on its target and brings it back when the target is on screen again.
    var wanted = false
    var reduceMotion = false
    private(set) var placement: WindowHighlightGeometry.Placement = .away
    /// Counts shows and hides, so a fade-out finishing late does not put away a highlight shown again meanwhile.
    private var generation: UInt = 0
    private var laidOut = CGSize.zero

    init(windowId: UInt32) {
        self.windowId = windowId
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 1, height: 1), styleMask: [.nonactivatingPanel], backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.ignoresMouseEvents = true
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = NSWindow.CollectionBehavior(rawValue: WindowHighlightGeometry.collectionBehaviorRaw)
        panel.title = "Claude window highlight"
        panel.alphaValue = 0

        let view = NSView(frame: NSRect(x: 0, y: 0, width: 1, height: 1))
        view.wantsLayer = true
        view.autoresizingMask = [.width, .height]
        clip.masksToBounds = true
        let scale = NSScreen.screens.map(\.backingScaleFactor).max() ?? 2
        for (rim, shadows, opacity) in [(restRim, WindowHighlightGeometry.rest, Float(1)), (peakRim, WindowHighlightGeometry.peak, Float(0))] {
            rim.contents = WindowHighlightGeometry.rimImage(shadows, scale: scale)
            rim.contentsScale = scale
            rim.contentsCenter = WindowHighlightGeometry.contentsCenter
            rim.contentsGravity = .resize
            rim.opacity = opacity
            clip.addSublayer(rim)
        }
        view.layer?.addSublayer(clip)
        panel.contentView = view
    }

    /// The rim layers on a new size (no implicit animation: the frame follows a moving window).
    private func layout(_ size: CGSize) {
        guard size != laidOut else { return }
        laidOut = size
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        clip.frame = CGRect(origin: .zero, size: size)
        restRim.frame = clip.bounds
        peakRim.frame = clip.bounds
        CATransaction.commit()
    }

    /// `glow-pulse`: rest → peak → rest, 1 s each way, ease-in-out, forever, as a crossfade of the two rims (none with
    /// reduced motion, as the page's prefers-reduced-motion rule: the rest rim stays).
    private func pulse() {
        let reduce = reduceMotion || NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        if reduce { stopPulse(); return }
        guard restRim.animation(forKey: "glow-pulse") == nil else { return }
        for (rim, from, to) in [(restRim, 1.0, 0.0), (peakRim, 0.0, 1.0)] {
            let fade = CABasicAnimation(keyPath: "opacity")
            fade.fromValue = from
            fade.toValue = to
            fade.duration = WindowHighlightGeometry.pulsePeriod / 2
            fade.autoreverses = true
            fade.repeatCount = .infinity
            fade.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            fade.isRemovedOnCompletion = false
            rim.add(fade, forKey: "glow-pulse")
        }
    }

    private func stopPulse() {
        restRim.removeAnimation(forKey: "glow-pulse")
        peakRim.removeAnimation(forKey: "glow-pulse")
    }

    var pulsing: Bool { restRim.animation(forKey: "glow-pulse") != nil }

    /// The rim as drawn now (its rest state), rendered off screen at 1× into a PNG: the live check's evidence of what
    /// the panel shows when no display is awake to capture it.
    func snapshot() -> [String: Any]? {
        let size = clip.bounds.size
        let width = Int(size.width.rounded()), height = Int(size.height.rounded())
        guard width > 0, height > 0, let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        clip.render(in: context)
        guard let image = context.makeImage() else { return nil }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return ["width": width, "height": height, "png": (data as Data).base64EncodedString()]
    }

    /// Matches the target: frame, layer and order (or away). Returns the placement used.
    @discardableResult
    func follow(restack: Bool = true) -> WindowHighlightGeometry.Placement {
        let info = WindowHighlightGeometry.targetInfo(windowId)
        let next = WindowHighlightGeometry.placement(layer: info.layer, onScreen: info.onScreen, bounds: info.bounds)
        let changed = next != placement
        placement = next
        switch next {
        case .away:
            if panel.isVisible { panel.orderOut(nil) }
        case .aboveTarget(let layer, let bounds):
            let primary = Double(NSScreen.screens.first?.frame.height ?? 0)
            let frame = WindowHighlightGeometry.frame(bounds: bounds, primaryHeight: primary)
            if panel.frame != frame { panel.setFrame(frame, display: true) }
            layout(frame.size)
            guard changed || restack || !panel.isVisible || !panel.isOnActiveSpace else { break }
            panel.level = NSWindow.Level(rawValue: layer)
            // Ordered out first when it is still on another Space, so ordering in puts it on the target's (active) one.
            if panel.isVisible && !panel.isOnActiveSpace { panel.orderOut(nil) }
            if !panel.isVisible { panel.orderFrontRegardless() }
            panel.order(.above, relativeTo: Int(windowId))
        }
        return next
    }

    func show(reduceMotion: Bool) -> WindowHighlightGeometry.Placement {
        self.reduceMotion = reduceMotion
        wanted = true
        generation &+= 1
        let placement = follow()
        pulse()
        if panel.alphaValue < 1 {
            if PhantomCursorPanel.displaysAwake() && placement != .away {
                NSAnimationContext.runAnimationGroup { context in
                    context.duration = WindowHighlightGeometry.fade
                    context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                    panel.animator().alphaValue = 1
                }
            } else {
                panel.alphaValue = 1
            }
        }
        return placement
    }

    /// Fades out (.3 s), then orders out 320 ms later; at once when nothing is on screen to fade.
    func hide() {
        wanted = false
        generation &+= 1
        guard panel.isVisible, PhantomCursorPanel.displaysAwake() else {
            panel.alphaValue = 0
            panel.orderOut(nil)
            stopPulse()
            return
        }
        NSAnimationContext.runAnimationGroup { context in
            context.duration = WindowHighlightGeometry.fade
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            panel.animator().alphaValue = 0
        }
        let current = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + WindowHighlightGeometry.hideAfter) { [weak self] in
            MainActor.assumeIsolated {
                guard let self, self.generation == current, !self.wanted else { return }
                self.panel.alphaValue = 0
                self.panel.orderOut(nil)
                self.stopPulse()
            }
        }
    }

    var json: [String: Any] {
        let primary = Double(NSScreen.screens.first?.frame.height ?? 0)
        let order = (CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? [])
            .compactMap { ($0[kCGWindowNumber as String] as? NSNumber)?.uint32Value }
        let own = panel.windowNumber > 0 ? order.firstIndex(of: UInt32(panel.windowNumber)) : nil
        let target = order.firstIndex(of: windowId)
        let info = WindowHighlightGeometry.targetInfo(windowId)
        let placementName: String
        switch placement {
        case .aboveTarget: placementName = "above_target"
        case .away: placementName = "away"
        }
        return [
            "windowId": Int(windowId), "visible": panel.isVisible, "wanted": wanted, "placement": placementName,
            "frame": rectJSON(panel.frame), "bounds": rectJSON(WindowHighlightGeometry.bounds(of: panel.frame, primaryHeight: primary)),
            "targetBounds": info.bounds.map { rectJSON($0) as Any } ?? NSNull(),
            "targetLayer": info.layer.map { $0 as Any } ?? NSNull(), "targetOnScreen": info.onScreen.map { $0 as Any } ?? NSNull(),
            "zIndex": own.map { $0 as Any } ?? NSNull(), "targetZIndex": target.map { $0 as Any } ?? NSNull(),
            "level": panel.level.rawValue, "windowNumber": panel.windowNumber, "alpha": Double(panel.alphaValue),
            "collectionBehavior": Int(panel.collectionBehavior.rawValue), "styleMask": Int(panel.styleMask.rawValue),
            "ignoresMouseEvents": panel.ignoresMouseEvents, "isOpaque": panel.isOpaque, "hasShadow": panel.hasShadow,
            "canBecomeKey": panel.canBecomeKey, "isKeyWindow": panel.isKeyWindow, "onActiveSpace": panel.isOnActiveSpace,
            "hidesOnDeactivate": panel.hidesOnDeactivate, "pulsing": pulsing, "reduceMotion": reduceMotion,
        ]
    }
}

/// The highlights by target window, and the following that keeps each on its window.
@MainActor
public final class WindowHighlights {
    public static let shared = WindowHighlights()
    private var panels: [UInt32: WindowHighlightPanel] = [:]
    private var timer: Timer?
    private var ticks: UInt = 0
    private var observers: [NSObjectProtocol] = []

    /// showWindowHighlight(windowId, reduceMotion?): the rim on that window, following it.
    public func show(windowId: UInt32, reduceMotion: Bool) -> [String: Any] {
        let highlight = panels[windowId] ?? WindowHighlightPanel(windowId: windowId)
        panels[windowId] = highlight
        _ = highlight.show(reduceMotion: reduceMotion)
        watch()
        return highlight.json
    }

    /// hideWindowHighlight(windowId?): that window's highlight fades out; no window id: all of them.
    public func hide(windowId: UInt32?) -> [String: Any] {
        let targets = windowId.map { id in panels[id].map { [$0] } ?? [] } ?? Array(panels.values)
        for highlight in targets { highlight.hide() }
        watch()
        return ["hidden": targets.map { Int($0.windowId) }]
    }

    /// windowHighlightSnapshot(windowId): the rim rendered off screen (see WindowHighlightPanel.snapshot).
    public func snapshot(windowId: UInt32) throws -> [String: Any] {
        guard let highlight = panels[windowId], let image = highlight.snapshot() else {
            throw CUError("no_highlight", "No window highlight to render for window \(windowId).")
        }
        return image
    }

    public func state() -> [String: Any] {
        ["highlights": panels.keys.sorted().compactMap { panels[$0]?.json },
         "primaryHeight": Double(NSScreen.screens.first?.frame.height ?? 0),
         "screens": NSScreen.screens.map { rectJSON($0.frame) }]
    }

    /// Every wanted highlight on its target's frame. The order is redone on events and every fifth tick (250 ms: a
    /// window of the target's app raised over the highlight); a moved or resized target is followed every tick.
    public func follow(restack: Bool) {
        for highlight in panels.values where highlight.wanted { highlight.follow(restack: restack) }
    }

    private func watch() {
        let active = panels.values.contains { $0.wanted }
        if active, timer == nil {
            let timer = Timer(timeInterval: WindowHighlightGeometry.followInterval, repeats: true) { _ in
                MainActor.assumeIsolated {
                    let shared = WindowHighlights.shared
                    shared.ticks &+= 1
                    shared.follow(restack: shared.ticks % 5 == 0)
                }
            }
            RunLoop.main.add(timer, forMode: .common)
            self.timer = timer
            let center = NSWorkspace.shared.notificationCenter
            for name in [NSWorkspace.didActivateApplicationNotification, NSWorkspace.activeSpaceDidChangeNotification] {
                observers.append(center.addObserver(forName: name, object: nil, queue: .main) { _ in
                    MainActor.assumeIsolated { WindowHighlights.shared.follow(restack: true) }
                })
            }
        } else if !active, let timer {
            timer.invalidate()
            self.timer = nil
            for observer in observers { NSWorkspace.shared.notificationCenter.removeObserver(observer) }
            observers = []
        }
    }
}
