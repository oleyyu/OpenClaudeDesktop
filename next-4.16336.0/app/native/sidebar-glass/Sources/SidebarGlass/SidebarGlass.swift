// The glass under the sidebar, AppKit side. Written to the behaviour of the official 4.16336.0 add-on's
// ClaudeSwift/SidebarGlass/SidebarGlass.swift (swift_addon.node, text 0x11b18c–0x11e0f4); every step below names the
// official address it follows, and sidebar-glass-re.json holds the evidence. No official code is copied.
//
// One glass for the app at a time (the official state is a set of statics): a SidebarGlassHolder put at the bottom of
// the window's content view, holding either an NSGlassEffectView (corner radius 0) or, for AppKit's sidebar glass,
// the view of an NSSplitViewController whose one item is a sidebar item as wide as the strip. The window is made
// non-opaque and given the asked colour behind the glass; hide puts both back. A 0.25 s timer and a main run loop
// observer keep the holder the content view's bottom view. A tint is a layer-backed view over the glass.
import AppKit
import QuartzCore
import os

private let log = Logger(subsystem: "local.code-desktop", category: "sidebar-glass")
// SwiftLogger.debugEnabled stands in: the official debug reports (reportOrder 0x11d7ec) are built only when debug
// logging is on.
private let debugLog = OSLog(subsystem: "local.code-desktop", category: "sidebar-glass")

/// _TtC11ClaudeSwift18UnderSiblingsLayer: the holder's backing layer. Its zPosition stays -1000 whatever is written
/// (setter 0x11cb5c); a written value is reported once (debug, at most 20 distinct values), then ignored.
final class UnderSiblingsLayer: CALayer {
    static let pinnedZ: CGFloat = -1000
    private var reported = Set<CGFloat>()

    override init() { super.init() }
    override init(layer: Any) { super.init(layer: layer) }
    required init?(coder: NSCoder) { super.init(coder: coder) }

    override var zPosition: CGFloat {
        get { super.zPosition }
        set {
            if newValue != Self.pinnedZ, reported.count < 20, reported.insert(newValue).inserted {
                log.debug("sidebar glass: a zPosition of \(Double(newValue)) was written to the holder's layer and ignored")
            }
            super.zPosition = Self.pinnedZ
        }
    }
}

/// _TtC11ClaudeSwift18SidebarGlassHolder: a layer-backed view (initWithFrame: 0x11caa0) on an UnderSiblingsLayer
/// (makeBackingLayer 0x11cd04); it cannot be decoded (init?(coder:) 0x11cb24 gives nil).
final class SidebarGlassHolder: NSView {
    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
    }
    required init?(coder: NSCoder) { return nil }

    override func makeBackingLayer() -> CALayer {
        let layer = UnderSiblingsLayer()
        layer.zPosition = UnderSiblingsLayer.pinnedZ
        return layer
    }
}

@MainActor
enum SidebarGlass {
    // The official statics (data 0xb4a820–0xb4a878).
    private static var holder: SidebarGlassHolder?                  // 0xb4a820
    private static var tintView: NSView?                            // 0xb4a828
    private static weak var window: NSWindow?                       // 0xb4a830
    private static var found: (opaque: Bool, color: NSColor?)?      // 0xb4a838 / 0xb4a840: the window as found
    private static var timer: Timer?                                // 0xb4a848
    private static var observer: CFRunLoopObserver?                 // 0xb4a850
    private static var splitController: NSSplitViewController?      // 0xb4a870
    // 0xb4a858 (once 0x11c480): CLAUDE_DEV_SIDEBAR_GLASS_LEAVE_ORDER=1 reports a reordered holder but leaves it.
    private static let leaveOrder = ProcessInfo.processInfo.environment["CLAUDE_DEV_SIDEBAR_GLASS_LEAVE_ORDER"] == "1"
    // 0xb4a878 (once 0x11c5e8): AppKit's sidebar glass needs macOS 27 — _stdlib_isOSVersionAtLeast(27, 0, 0), which is
    // what `#available` compiles to (the same check as the macOS 26 gate at 0x11b1e0), not ProcessInfo.
    private static let appKitSidebarAvailable: Bool = { if #available(macOS 27, *) { return true } else { return false } }()
    // 0xb4a860 / 0xb4a868: the content view's subviews as last reported out of order, and how many reports were made.
    // A report repeating the last one is skipped, at most 200 are made per glass (both reset when a glass is put in,
    // 0x11c010; the list also after the holder is put back at the bottom, 0x11def8).
    private static var lastReportedOrder: [String] = []
    private static var orderReports = 0

    /// 0x11b18c. True when the glass is under the sidebar of the window numbered `windowNumber`; every refusal takes
    /// any glass out first (0x11c2f0).
    static func show(windowNumber: Int, width: Double, backing: Int?, systemBacking: Bool, appKitSidebar: Bool) -> Bool {
        guard #available(macOS 26, *) else { hide(); return false }
        guard windowNumber >= 1, width.isFinite else { hide(); return false }
        if let backing, backing & ~0xffffff != 0 || systemBacking { hide(); return false }
        if appKitSidebar && !appKitSidebarAvailable { hide(); return false }
        guard let window = NSApp.windows.first(where: { $0.windowNumber == windowNumber }), let contentView = window.contentView else {
            hide(); return false
        }
        // 0x11b35c / 0x11b844: keep the glass only when it is in this window's content view and of the asked kind.
        if !(Self.window === window && holder?.superview === contentView && (splitController == nil) != appKitSidebar) { hide() }

        let color: NSColor
        if let backing {
            color = NSColor(srgbRed: CGFloat((backing >> 16) & 0xff) / 255, green: CGFloat((backing >> 8) & 0xff) / 255,
                            blue: CGFloat(backing & 0xff) / 255, alpha: 1)
        } else {
            color = systemBacking ? .windowBackgroundColor : .clear
        }
        let bounds = contentView.bounds
        var stripWidth = min(bounds.width, max(width, 0))
        let least: CGFloat = appKitSidebar ? 1 : 0
        if stripWidth <= least { stripWidth = least }
        let frame = NSRect(x: 0, y: 0, width: stripWidth, height: bounds.height)

        if let holder {
            // 0x11b494: same window, same kind — follow the width (and, for AppKit's sidebar, its item's thickness).
            if let split = splitController, let item = split.splitViewItems.first, item.maximumThickness != frame.width {
                item.minimumThickness = min(frame.width, item.minimumThickness)
                item.maximumThickness = max(item.maximumThickness, frame.width)
                holder.frame = frame
                item.maximumThickness = frame.width
                item.minimumThickness = frame.width
            } else {
                holder.frame = frame
            }
            if window.backgroundColor != color { window.backgroundColor = color }   // 0x11c378
            return true
        }

        let holder = SidebarGlassHolder(frame: frame)
        holder.autoresizingMask = [.height]
        let glass: NSView
        if appKitSidebar {
            // 0x11b5c0: AppKit draws its own sidebar glass for a split view's sidebar item.
            let content = NSViewController()
            content.view = NSView()
            let item = NSSplitViewItem(sidebarWithViewController: content)
            item.canCollapse = false
            item.isSpringLoaded = false
            item.minimumThickness = min(frame.width, item.minimumThickness)
            item.maximumThickness = max(item.maximumThickness, frame.width)
            item.maximumThickness = frame.width
            item.minimumThickness = frame.width
            let split = NSSplitViewController()
            split.addSplitViewItem(item)
            split.view.frame = holder.bounds
            split.view.setAccessibilityElement(false)
            split.view.setAccessibilityChildren([])
            splitController = split
            glass = split.view
        } else {
            // 0x11b89c: a plain glass view.
            let plain = NSGlassEffectView(frame: holder.bounds)
            plain.cornerRadius = 0
            glass = plain
        }
        glass.autoresizingMask = [.width, .height]
        holder.addSubview(glass)

        let layerAlpha = contentView.layer?.backgroundColor.map { String(describing: Double($0.alpha)) } ?? "none"
        let foundText = "opaque=\(window.isOpaque), background colour \(window.backgroundColor?.description ?? "none"), content view layer background alpha=\(layerAlpha)"
        found = (window.isOpaque, window.backgroundColor)
        contentView.addSubview(holder, positioned: .below, relativeTo: nil)
        window.isOpaque = false
        window.backgroundColor = color
        let over = backing.map { String(format: "#%06lx", $0) } ?? (systemBacking ? "the system's window colour" : "a cleared window")
        let drawnBy = appKitSidebar ? "AppKit's sidebar" : "a plain glass view"
        let now = window.backgroundColor?.description ?? "none"
        let holds = subviewNames(contentView)
        log.info("sidebar glass put in over \(over, privacy: .public), drawn by \(drawnBy, privacy: .public); the NSWindow's background colour now reads \(now, privacy: .public); the window was found \(foundText, privacy: .public); the content view now holds \(holds, privacy: .public)")
        Self.window = window
        Self.holder = holder
        lastReportedOrder = []
        orderReports = 0

        // 0x11c018: keep the holder the bottom view — a 0.25 s timer (tolerance 0.1) and an observer before the main
        // run loop waits or exits (order 1999999), both in the common modes.
        let tick = Timer(timeInterval: 0.25, repeats: true) { _ in MainActor.assumeIsolated { keepAtBottom() } }
        tick.tolerance = 0.1
        RunLoop.main.add(tick, forMode: .common)
        timer = tick
        let watch = CFRunLoopObserverCreateWithHandler(kCFAllocatorDefault, CFRunLoopActivity([.beforeWaiting, .exit]).rawValue, true, 1_999_999) { _, _ in
            MainActor.assumeIsolated { keepAtBottom() }
        }
        if let watch { CFRunLoopAddObserver(CFRunLoopGetMain(), watch, .commonModes) }
        observer = watch
        return true
    }

    /// 0x11cfe0: stop watching, take the tint and the glass out, give the window back its opacity and colour.
    static func hide() {
        timer?.invalidate()
        timer = nil
        if let observer { CFRunLoopObserverInvalidate(observer) }
        observer = nil
        tintView?.removeFromSuperview()
        tintView = nil
        holder?.removeFromSuperview()
        holder = nil
        if let window, let found {
            window.isOpaque = found.opaque
            window.backgroundColor = found.color
        }
        window = nil
        found = nil
        splitController = nil
    }

    /// 0x11d408. `rgba` is 0xRRGGBBAA; true when the tint is over the glass, as wide as `width` (capped at the glass).
    static func setTint(rgba: Int, width: Double) -> Bool {
        guard let holder, UInt64(bitPattern: Int64(rgba)) >> 32 == 0, width.isFinite else { clearTint(); return false }
        let color = NSColor(srgbRed: CGFloat((rgba >> 24) & 0xff) / 255, green: CGFloat((rgba >> 16) & 0xff) / 255,
                            blue: CGFloat((rgba >> 8) & 0xff) / 255, alpha: CGFloat(rgba & 0xff) / 255)
        let frame = NSRect(x: 0, y: 0, width: min(holder.bounds.width, max(width, 0)), height: holder.bounds.height)
        let view: NSView
        if let existing = tintView, existing.superview === holder {
            view = existing
        } else {
            view = NSView(frame: frame)
            view.wantsLayer = true
            view.autoresizingMask = [.height]
            view.setAccessibilityElement(false)
            holder.addSubview(view, positioned: .above, relativeTo: nil)
            tintView = view
        }
        guard let layer = view.layer else { clearTint(); return false }
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        view.frame = frame
        layer.backgroundColor = color.cgColor
        CATransaction.commit()
        return true
    }

    /// clearTint closure 0x83b70.
    static func clearTint() {
        tintView?.removeFromSuperview()
        tintView = nil
    }

    /// 0x11dd7c: the holder gone from its window means the glass is gone (hide); not the bottom view means it is
    /// reported (debug) and put back at the bottom, unless CLAUDE_DEV_SIDEBAR_GLASS_LEAVE_ORDER=1.
    private static func keepAtBottom() {
        guard let holder else { return }
        guard let contentView = holder.superview else { hide(); return }
        if contentView.subviews.first === holder { return }
        reportOrder(contentView)
        if leaveOrder { return }
        contentView.addSubview(holder, positioned: .below, relativeTo: nil)
        lastReportedOrder = []
    }

    /// 0x11d7ec (debug only): skipped unless debug logging is on, after 200 reports, or when the order repeats the last report.
    private static func reportOrder(_ contentView: NSView) {
        guard debugLog.isEnabled(type: .debug), orderReports < 200 else { return }
        let sublayers = contentView.layer?.sublayers ?? []
        let views = contentView.subviews.map { view -> String in
            let name = view.className
            guard let layer = view.layer else { return "\(name) (no layer)" }
            guard let index = sublayers.firstIndex(where: { $0 === layer }) else {
                return "\(name) (not in the content view's layer, zPosition \(Double(layer.zPosition)))"
            }
            return "\(name) (sublayer index \(index), zPosition \(Double(layer.zPosition)))"
        }
        if views == lastReportedOrder { return }
        lastReportedOrder = views
        orderReports += 1
        let what = leaveOrder ? "left there" : "put back at the bottom"
        log.debug("sidebar glass was not the window's bottom view and was \(what, privacy: .public); the content view's layer has \(sublayers.count) sublayers; the content view's subviews, bottom first: \(views.joined(separator: ", "), privacy: .public)")
    }

    /// 0x11d158: the content view's subviews by class, bottom first.
    private static func subviewNames(_ view: NSView) -> String {
        let names = view.subviews.map { $0.className }
        return names.isEmpty ? "none" : names.joined(separator: ", ")
    }
}

// C entry points for napi.c (the official bindings call into SidebarGlass inside MainActor.assumeIsolated).
@_cdecl("sg_show")
public func sg_show(_ windowNumber: Int64, _ width: Double, _ backing: Int64, _ backingIsNil: Bool, _ systemBacking: Bool, _ appKitSidebar: Bool) -> Bool {
    MainActor.assumeIsolated {
        SidebarGlass.show(windowNumber: Int(windowNumber), width: width, backing: backingIsNil ? nil : Int(backing),
                          systemBacking: systemBacking, appKitSidebar: appKitSidebar)
    }
}

@_cdecl("sg_hide")
public func sg_hide() {
    MainActor.assumeIsolated { SidebarGlass.hide() }
}

@_cdecl("sg_set_tint")
public func sg_set_tint(_ rgba: Int64, _ width: Double) -> Bool {
    MainActor.assumeIsolated { SidebarGlass.setTint(rgba: Int(rgba), width: width) }
}

@_cdecl("sg_clear_tint")
public func sg_clear_tint() {
    MainActor.assumeIsolated { SidebarGlass.clearTint() }
}
