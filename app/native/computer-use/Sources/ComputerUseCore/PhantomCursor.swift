import AppKit
import CoreGraphics
import QuartzCore

/// The phantom cursor (official 2.42304.0 `ComputerUseSwift.PhantomCursor`, docs/computer-use-official-spec-20261021.md
/// §2.6.2): while a session controls a window in the background, a clay arrow sits on that window at the point of the
/// last app_* action. It is drawing only — the real pointer never moves.
///
/// One non-activating NSPanel per target window (keyed by CGWindowID; 0 = no window, a floating one), 56×56 pt, the
/// arrow's tip at its centre. It ignores the mouse, is transparent and shadowless, and its collection behaviour is
/// 0x150 = stationary | ignoresCycle | fullScreenAuxiliary (never canJoinAllSpaces / moveToActiveSpace): it stays on the
/// Space where it was ordered in, can sit over a full-screen app, stays put in Mission Control, is out of ⌘`.
///
/// Stacking: the panel takes the target window's layer and is ordered directly above it (orderWindow(.above,
/// relativeTo:)), so windows in front of the target cover it as they cover the target. A target that is not on screen
/// (minimized, hidden, on another Space) puts it away. With no window id: the floating level, ordered front.
///
/// AppKit wants the main thread. The N-API calls run on a libuv worker; every call hops to the main queue and waits
/// (MainThread.run). In Electron's main process the main thread runs the Cocoa run loop, so the hop completes; in a
/// process without one (ELECTRON_RUN_AS_NODE, plain node) the main queue is never drained and the call fails with
/// `main_thread_unavailable` instead of hanging — the JS side then falls back to its web pointer.
public enum PhantomCursorGeometry {
    public static let size: CGFloat = 56
    public static let half: CGFloat = 28
    /// The official arrow outline, y down from the tip (the tip is (0, 0)).
    public static let outline: [CGPoint] = [
        CGPoint(x: 0, y: 0), CGPoint(x: 0, y: 18), CGPoint(x: 4.5, y: 14), CGPoint(x: 7.5, y: 21.5),
        CGPoint(x: 11, y: 20), CGPoint(x: 8, y: 13), CGPoint(x: 14, y: 13),
    ]
    /// .stationary (0x10) | .ignoresCycle (0x40) | .fullScreenAuxiliary (0x100).
    public static let collectionBehaviorRaw: UInt = 0x150
    /// Clay #D97757 and the stroke #FAF9F5, sRGB.
    public static let clay = (r: 0.851, g: 0.467, b: 0.341)
    public static let paper = (r: 0.980, g: 0.976, b: 0.961)

    /// The outline in the layer's coordinates (origin bottom-left, 56×56), the tip on the centre: (28 + x, 28 − y).
    public static func layerPoints() -> [CGPoint] {
        outline.map { CGPoint(x: half + $0.x, y: half - $0.y) }
    }

    /// A global CG point (top-left origin of the primary display, y down; negative left of / above it) → the panel's
    /// Cocoa frame (bottom-left origin of the primary screen, y up), the tip (the frame's centre) on the point.
    /// `primaryHeight` is NSScreen.screens[0].frame.height. Works on any display, whatever its position.
    public static func frame(screenX: Double, screenY: Double, primaryHeight: Double) -> CGRect {
        CGRect(x: screenX - Double(half), y: primaryHeight - screenY - Double(half), width: Double(size), height: Double(size))
    }

    /// The inverse of `frame`: the CG global point under the tip of a panel at this Cocoa frame.
    public static func tip(of frame: CGRect, primaryHeight: Double) -> CGPoint {
        CGPoint(x: frame.midX, y: primaryHeight - frame.midY)
    }

    public enum Placement: Equatable {
        /// On screen: the target's layer, ordered directly above it.
        case aboveTarget(layer: Int)
        /// No target window: the floating level (3), ordered front.
        case floating
        /// The target is not on screen (minimized, hidden, another Space) or gone: put away.
        case away
    }

    /// Where a panel goes, from the target's kCGWindowLayer / kCGWindowIsOnscreen (nil: no such window).
    public static func placement(windowId: UInt32?, layer: Int?, onScreen: Bool?) -> Placement {
        guard let windowId, windowId != 0 else { return .floating }
        guard let layer, onScreen == true else { return .away }
        return .aboveTarget(layer: layer)
    }
}

/// Runs AppKit work on the main thread from any thread, waiting for it.
public enum MainThread {
    private final class Box<T>: @unchecked Sendable {
        let lock = NSLock()
        var started = false, cancelled = false
        var result: Result<T, Error>?
    }

    /// `body` on the main queue; the caller waits. When the main queue has not started it within `timeout` (no run loop
    /// drains it), the work is cancelled and `main_thread_unavailable` thrown; once started it is always waited for.
    public static func run<T>(timeout: TimeInterval = 2, _ body: @escaping @MainActor () throws -> T) throws -> T {
        if Thread.isMainThread { return try MainActor.assumeIsolated { try body() } }
        let box = Box<T>()
        let done = DispatchSemaphore(value: 0)
        DispatchQueue.main.async {
            box.lock.lock()
            if box.cancelled { box.lock.unlock(); return }
            box.started = true
            box.lock.unlock()
            box.result = Result { try MainActor.assumeIsolated { try body() } }
            done.signal()
        }
        if done.wait(timeout: .now() + timeout) == .timedOut {
            box.lock.lock()
            if !box.started {
                box.cancelled = true
                box.lock.unlock()
                throw CUError("main_thread_unavailable", "The phantom cursor needs the app's main run loop (an AppKit panel), and this process has none.")
            }
            box.lock.unlock()
            done.wait()
        }
        return try box.result!.get()
    }
}

@MainActor
final class PhantomCursorPanel {
    let windowId: UInt32
    let panel: NSPanel
    private let pulseLayer = CALayer()
    /// Shown by setPhantomCursor and not hidden since: restacking keeps it on its target (and brings it back when the
    /// target comes on screen again).
    var wanted = false
    var tip = CGPoint.zero
    /// Counts moves, so a settle check from an earlier slide does not undo a later one.
    private var moves: UInt = 0

    /// An animation needs an awake display to run on (with the screen locked and dark there is none).
    static func displaysAwake() -> Bool {
        var count: UInt32 = 0
        return CGGetActiveDisplayList(0, nil, &count) == .success && count > 0
    }

    init(windowId: UInt32) {
        self.windowId = windowId
        let size = PhantomCursorGeometry.size
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: size, height: size), styleMask: [.nonactivatingPanel],
                        backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.ignoresMouseEvents = true
        panel.isReleasedWhenClosed = false
        // An NSPanel hides when its app deactivates by default; this one belongs to a background app by design.
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = NSWindow.CollectionBehavior(rawValue: PhantomCursorGeometry.collectionBehaviorRaw)
        panel.title = "Claude cursor"

        let view = NSView(frame: NSRect(x: 0, y: 0, width: size, height: size))
        view.wantsLayer = true
        let path = CGMutablePath()
        path.addLines(between: PhantomCursorGeometry.layerPoints())
        path.closeSubpath()
        let scale = NSScreen.screens.map(\.backingScaleFactor).max() ?? 2
        let clay = CGColor(srgbRed: PhantomCursorGeometry.clay.r, green: PhantomCursorGeometry.clay.g, blue: PhantomCursorGeometry.clay.b, alpha: 1)
        let paper = CGColor(srgbRed: PhantomCursorGeometry.paper.r, green: PhantomCursorGeometry.paper.g, blue: PhantomCursorGeometry.paper.b, alpha: 1)
        // Layer 1, the glow: nothing filled or stroked, only the clay shadow of the outline.
        let glow = CAShapeLayer()
        glow.frame = view.bounds
        glow.path = path
        glow.shadowPath = path
        glow.fillColor = .clear
        glow.strokeColor = .clear
        glow.shadowColor = clay.copy(alpha: 0.45)
        glow.shadowOpacity = 1
        glow.shadowRadius = 10
        glow.shadowOffset = .zero
        glow.contentsScale = scale
        // Layer 2, the arrow.
        let arrow = CAShapeLayer()
        arrow.frame = view.bounds
        arrow.path = path
        arrow.fillColor = clay
        arrow.strokeColor = paper
        arrow.lineWidth = 3
        arrow.lineJoin = .round
        arrow.shadowColor = clay.copy(alpha: 0.9)
        arrow.shadowOpacity = 1
        arrow.shadowRadius = 4
        arrow.shadowOffset = .zero
        arrow.contentsScale = scale
        // Both in one layer centred on the tip, so the pulse scales about the point.
        pulseLayer.frame = view.bounds
        pulseLayer.addSublayer(glow)
        pulseLayer.addSublayer(arrow)
        view.layer?.addSublayer(pulseLayer)
        panel.contentView = view
    }

    static func targetInfo(_ windowId: UInt32) -> (layer: Int?, onScreen: Bool?) {
        guard windowId != 0 else { return (nil, nil) }
        var values: [UnsafeRawPointer?] = [UnsafeRawPointer(bitPattern: UInt(windowId))]
        guard let ids = values.withUnsafeMutableBufferPointer({ CFArrayCreate(nil, $0.baseAddress, 1, nil) }),
              let list = CGWindowListCreateDescriptionFromArray(ids) as? [[String: Any]], let info = list.first else { return (nil, nil) }
        return ((info[kCGWindowLayer as String] as? NSNumber)?.intValue, (info[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false)
    }

    /// Takes its place by the target: level and order (or away). Returns the placement used.
    @discardableResult
    func stack() -> PhantomCursorGeometry.Placement {
        let info = Self.targetInfo(windowId)
        let placement = PhantomCursorGeometry.placement(windowId: windowId, layer: info.layer, onScreen: info.onScreen)
        switch placement {
        case .away:
            panel.orderOut(nil)
        case .floating:
            panel.level = .floating
            panel.orderFrontRegardless()
        case .aboveTarget(let layer):
            panel.level = NSWindow.Level(rawValue: layer)
            if !panel.isVisible { panel.orderFrontRegardless() }
            panel.order(.above, relativeTo: Int(windowId))
        }
        return placement
    }

    func move(to point: CGPoint, pulse: Bool) -> PhantomCursorGeometry.Placement {
        let primary = Double(NSScreen.screens.first?.frame.height ?? 0)
        let frame = PhantomCursorGeometry.frame(screenX: point.x, screenY: point.y, primaryHeight: primary)
        tip = point
        wanted = true
        if panel.isVisible && panel.frame != frame && Self.displaysAwake() {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.18
                context.allowsImplicitAnimation = true
                context.timingFunction = CAMediaTimingFunction(controlPoints: 0.2, 0, 0, 1)
                panel.animator().setFrame(frame, display: true)
            }
            // The slide is driven by the display; should it not finish (a display going to sleep meanwhile), the
            // panel still ends where it belongs.
            let target = frame, generation = moves &+ 1
            moves = generation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                MainActor.assumeIsolated {
                    guard let self, self.moves == generation, self.panel.frame != target else { return }
                    self.panel.setFrame(target, display: true)
                }
            }
        } else if panel.frame != frame {
            // Hidden, or no display awake to drive an animation: straight there.
            moves &+= 1
            panel.setFrame(frame, display: true)
        }
        let placement = stack()
        if pulse, placement != .away {
            let animation = CABasicAnimation(keyPath: "transform.scale")
            animation.fromValue = 1.0
            animation.toValue = 1.25
            animation.duration = 0.12
            animation.autoreverses = true
            animation.timingFunction = CAMediaTimingFunction(name: .easeOut)
            pulseLayer.add(animation, forKey: "pulse")
        }
        return placement
    }

    func hide() {
        wanted = false
        pulseLayer.removeAnimation(forKey: "pulse")
        panel.orderOut(nil)
    }

    /// Hidden for good: the panel's window goes (its lock went), not just ordered out.
    func close() {
        hide()
        panel.close()
    }

    var json: [String: Any] {
        let primary = Double(NSScreen.screens.first?.frame.height ?? 0)
        let visibleTip = PhantomCursorGeometry.tip(of: panel.frame, primaryHeight: primary)
        // Read-only stacking facts (live checks): front-to-back positions among the on-screen windows.
        let order = (CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? [])
            .compactMap { ($0[kCGWindowNumber as String] as? NSNumber)?.uint32Value }
        let own = panel.windowNumber > 0 ? order.firstIndex(of: UInt32(panel.windowNumber)) : nil
        let target = windowId != 0 ? order.firstIndex(of: windowId) : nil
        let info = Self.targetInfo(windowId)
        return [
            "zIndex": own.map { $0 as Any } ?? NSNull(), "targetZIndex": target.map { $0 as Any } ?? NSNull(),
            "targetLayer": info.layer.map { $0 as Any } ?? NSNull(), "targetOnScreen": info.onScreen.map { $0 as Any } ?? NSNull(),
            "windowId": Int(windowId), "visible": panel.isVisible, "wanted": wanted,
            "tip": ["x": tip.x, "y": tip.y], "frameTip": ["x": visibleTip.x, "y": visibleTip.y],
            "frame": rectJSON(panel.frame), "level": panel.level.rawValue, "windowNumber": panel.windowNumber,
            "collectionBehavior": Int(panel.collectionBehavior.rawValue), "styleMask": Int(panel.styleMask.rawValue),
            "ignoresMouseEvents": panel.ignoresMouseEvents, "isOpaque": panel.isOpaque, "hasShadow": panel.hasShadow,
            "canBecomeKey": panel.canBecomeKey, "isKeyWindow": panel.isKeyWindow, "onActiveSpace": panel.isOnActiveSpace,
            "hidesOnDeactivate": panel.hidesOnDeactivate,
        ]
    }
}

/// The panels by target window, and the restacking that keeps each on its window.
@MainActor
public final class PhantomCursors {
    public static let shared = PhantomCursors()
    private var panels: [UInt32: PhantomCursorPanel] = [:]
    private var timer: Timer?
    private var observers: [NSObjectProtocol] = []

    /// setPhantomCursor(screenX, screenY, windowId?, pulse?): show the window's cursor with its tip at a global point.
    public func set(x: Double, y: Double, windowId: UInt32?, pulse: Bool) -> [String: Any] {
        let key = windowId ?? 0
        let cursor = panels[key] ?? PhantomCursorPanel(windowId: key)
        panels[key] = cursor
        let placement = cursor.move(to: CGPoint(x: x, y: y), pulse: pulse)
        watch()
        var out = cursor.json
        out["placement"] = Self.name(placement)
        return out
    }

    /// hidePhantomCursor(windowId, release?): that window's cursor goes (orderOut); no window id: all of them.
    /// release: the panel is closed and forgotten too (the lock went), so panels don't pile up over the process's life.
    public func hide(windowId: UInt32?, release: Bool = false) -> [String: Any] {
        let targets = windowId.map { id in panels[id].map { [$0] } ?? [] } ?? Array(panels.values)
        for cursor in targets {
            if release {
                cursor.close()
                panels[cursor.windowId] = nil
            } else {
                cursor.hide()
            }
        }
        watch()
        return ["hidden": targets.map { Int($0.windowId) }]
    }

    public func state() -> [String: Any] {
        ["cursors": panels.keys.sorted().compactMap { panels[$0]?.json },
         "primaryHeight": Double(NSScreen.screens.first?.frame.height ?? 0),
         "screens": NSScreen.screens.map { rectJSON($0.frame) }]
    }

    /// Every wanted cursor back on its target (or away while the target is off screen).
    public func restack() {
        for cursor in panels.values where cursor.wanted { cursor.stack() }
    }

    /// While any cursor is wanted: restack on app activation, Space changes, and twice a second (a window of the
    /// target's app raised over the cursor, the target moved between Spaces). Nothing runs once all are hidden.
    private func watch() {
        let active = panels.values.contains { $0.wanted }
        if active, timer == nil {
            let timer = Timer(timeInterval: 0.5, repeats: true) { _ in MainActor.assumeIsolated { PhantomCursors.shared.restack() } }
            RunLoop.main.add(timer, forMode: .common)
            self.timer = timer
            let center = NSWorkspace.shared.notificationCenter
            for name in [NSWorkspace.didActivateApplicationNotification, NSWorkspace.activeSpaceDidChangeNotification] {
                observers.append(center.addObserver(forName: name, object: nil, queue: .main) { _ in
                    MainActor.assumeIsolated { PhantomCursors.shared.restack() }
                })
            }
        } else if !active, let timer {
            timer.invalidate()
            self.timer = nil
            for observer in observers { NSWorkspace.shared.notificationCenter.removeObserver(observer) }
            observers = []
        }
    }

    static func name(_ placement: PhantomCursorGeometry.Placement) -> String {
        switch placement {
        case .aboveTarget: return "above_target"
        case .floating: return "floating"
        case .away: return "away"
        }
    }
}
