import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// One window as app_list_windows reports it (docs/02-tools.live.json):
/// {window_id, title, is_main, is_minimized, is_hidden, is_off_space, bounds, is_auxiliary}.
/// is_main / is_minimized come from Accessibility, is_off_space from SkyLight's Space membership (Spaces.swift; AX
/// listing as the fallback); what neither can say is null (unknown), never guessed. Only real app windows are listed:
/// the normal, floating and modal-panel layers (0…8), not the menu bar, status items, pop-up menus or overlays above it.
public struct WindowInfo {
    public let windowId: UInt32
    public let pid: pid_t
    public let bundleId: String?
    public let title: String
    public let bounds: CGRect
    public let layer: Int
    public let isOnScreen: Bool
    public var isMain: Bool?
    public var isMinimized: Bool?
    public var isHidden: Bool
    public var isOffSpace: Bool?
    public var isAuxiliary: Bool

    public var json: [String: Any] {
        [
            "window_id": Int(windowId),
            "title": title,
            "is_main": isMain ?? NSNull(),
            "is_minimized": isMinimized ?? NSNull(),
            "is_hidden": isHidden,
            "is_off_space": isOffSpace ?? NSNull(),
            "bounds": rectJSON(bounds),
            "is_auxiliary": isAuxiliary,
        ]
    }
}

@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ windowId: UnsafeMutablePointer<UInt32>) -> AXError

public enum WindowList {
    public static func runningPids(bundleId: String) -> [pid_t] {
        NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).map(\.processIdentifier)
    }

    public static func bundleId(pid: pid_t) -> String? {
        NSRunningApplication(processIdentifier: pid)?.bundleIdentifier
    }

    /// Window layers an app window lives on: normal (0), floating / torn-off menu (3), modal panel (8). The menu bar
    /// (24), status items (25), the Dock (20), pop-up menus (101) and overlays are not windows to act on.
    public static let appWindowLayers = 0...8

    /// Pure: is a CGWindowList entry one of the app's own windows? A windowless shell (the Dock) keeps its strips.
    public static func isAppWindow(layer: Int, windowlessShell: Bool) -> Bool {
        windowlessShell || appWindowLayers.contains(layer)
    }

    /// Every window of the app's processes, front to back (CGWindowList order).
    public static func windows(bundleId: String) -> [WindowInfo] {
        let pids = Set(runningPids(bundleId: bundleId))
        guard !pids.isEmpty,
              let raw = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
        let hidden = Dictionary(uniqueKeysWithValues: pids.map { ($0, NSRunningApplication(processIdentifier: $0)?.isHidden ?? false) })
        var out: [WindowInfo] = []
        for entry in raw {
            guard let owner = (entry[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value, pids.contains(owner),
                  let number = (entry[kCGWindowNumber as String] as? NSNumber)?.uint32Value else { continue }
            var bounds = CGRect.zero
            if let dict = entry[kCGWindowBounds as String] as? NSDictionary {
                CGRectMakeWithDictionaryRepresentation(dict as CFDictionary, &bounds)
            }
            // Zero-size and fully transparent windows are compositor plumbing, not something to act on.
            let alpha = (entry[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
            guard bounds.width >= 1, bounds.height >= 1, alpha > 0 else { continue }
            let layer = (entry[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
            guard isAppWindow(layer: layer, windowlessShell: AXLadder.windowlessShells.contains(bundleId)) else { continue }
            out.append(WindowInfo(
                windowId: number, pid: owner, bundleId: bundleId,
                title: entry[kCGWindowName as String] as? String ?? "",
                bounds: bounds, layer: layer,
                isOnScreen: (entry[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false,
                isMain: nil, isMinimized: nil, isHidden: hidden[owner] ?? false, isOffSpace: nil,
                isAuxiliary: layer != 0
            ))
        }
        // Space membership first (SkyLight answers without Accessibility, and while the screen is locked).
        let current = Spaces.currentSpaces()
        var parked: [UInt32: Bool] = [:]
        out = out.map { window in
            var window = window
            if window.layer == 0 {
                window.isOffSpace = Spaces.isOffSpace(windowSpaces: Spaces.spaces(of: window.windowId), current: current)
                if let tagged = Spaces.isParked(tags: Spaces.tags(of: window.windowId)) { parked[window.windowId] = tagged }
            }
            return window
        }
        guard AXIsProcessTrusted() else { return out.map { withTags($0, parked[$0.windowId]) } }
        var axWindows: [pid_t: [UInt32: AXUIElement]?] = [:]
        for pid in pids { axWindows[pid] = axWindowsById(pid: pid) }
        return out.map { enrich($0, axWindows[$0.pid] ?? nil, parked: parked[$0.windowId]) }
    }

    /// Without an answer from AX: a titled window of an app that is not hidden is minimized when SkyLight's tags say it
    /// is out of the window list, and not minimized when they say it is in it. Anything else stays null.
    private static func withTags(_ window: WindowInfo, _ parked: Bool?) -> WindowInfo {
        var window = window
        if let parked, !window.isHidden, !window.title.isEmpty { window.isMinimized = parked }
        return window
    }

    /// The app's AX windows by CGWindowID, or nil when AX did not answer (timeout, not ready): unknown, not empty.
    /// kAXWindows lists the windows of the CURRENT Space only (minimized ones included).
    private static func axWindowsById(pid: pid_t) -> [UInt32: AXUIElement]? {
        let app = AXUIElementCreateApplication(pid)
        AXUIElementSetMessagingTimeout(app, 0.25)
        var ref: CFTypeRef?
        guard AXUIElementCopyAttributeValue(app, kAXWindowsAttribute as CFString, &ref) == .success,
              let elements = ref as? [AXUIElement] else { return nil }
        var byId: [UInt32: AXUIElement] = [:]
        for element in elements {
            var id: UInt32 = 0
            if _AXUIElementGetWindow(element, &id) == .success { byId[id] = element }
        }
        return byId
    }

    /// AX facts for one window: main / minimized / standard-window subrole.
    /// A titled layer-0 window AX does not list is off-Space when SkyLight says so (or, without an answer from it, when
    /// it is not on screen and the app is not hidden), and minimized when SkyLight's tags say it is out of the window
    /// list. Anything else AX does not list is a palette or panel the app does not report (auxiliary). Unknown stays null.
    private static func enrich(_ window: WindowInfo, _ axWindows: [UInt32: AXUIElement]?, parked: Bool?) -> WindowInfo {
        var window = window
        guard let axWindows else { return withTags(window, parked) }
        guard let element = axWindows[window.windowId] else {
            // Untitled unlisted strips (Finder keeps several 33-pt ones) stay auxiliary: a title is the cheapest sign
            // of a real document window. AX does not list a window on another Space, minimized or not (seen live
            // 2026-10-21): SkyLight's tags say which (parked = minimized, since the app is not hidden).
            let offSpace = window.isOffSpace ?? (!window.isOnScreen && !window.isHidden)
            if window.layer == 0, offSpace || parked == true, !window.isHidden, !window.title.isEmpty {
                window.isOffSpace = offSpace
                window.isMinimized = parked ?? false
            } else {
                window.isAuxiliary = true
            }
            return window
        }
        func bool(_ name: String) -> Bool? {
            var value: CFTypeRef?
            guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
            return (value as? NSNumber)?.boolValue
        }
        var subrole: CFTypeRef?
        _ = AXUIElementCopyAttributeValue(element, kAXSubroleAttribute as CFString, &subrole)
        window.isMain = bool(kAXMainAttribute)
        window.isMinimized = bool(kAXMinimizedAttribute)
        if let subrole = subrole as? String, subrole != (kAXStandardWindowSubrole as String) { window.isAuxiliary = true }
        // Listed by AX: on the current Space, or minimized (AX lists those wherever they were) — SkyLight says which.
        if window.isOffSpace == nil { window.isOffSpace = false }
        return window
    }

    /// The window an app_* call means: the given id (which must belong to the app), else its main window.
    public static func resolve(bundleId: String, windowId: UInt32?) throws -> WindowInfo {
        let windows = windows(bundleId: bundleId)
        if runningPids(bundleId: bundleId).isEmpty { throw CUError("app_not_running", "\(bundleId) is not running.") }
        if let windowId {
            guard let window = windows.first(where: { $0.windowId == windowId }) else {
                // Either gone or owned by another app: never capture a window the grant does not cover.
                throw CUError("window_not_found", "Window \(windowId) is not a window of \(bundleId).")
            }
            return window
        }
        // A windowless shell (the Dock) has no regular window: its on-screen strip is the window it means.
        let regular = AXLadder.windowlessShells.contains(bundleId)
            ? windows.filter { $0.isOnScreen }.map { var w = $0; w.isAuxiliary = false; return w }
            : windows.filter { !$0.isAuxiliary }
        // Main on this Space, then any on screen, then any not known to be elsewhere, then whatever is left.
        guard let main = regular.first(where: { $0.isMain == true }) ?? regular.first(where: { $0.isOnScreen })
                ?? regular.first(where: { $0.isOffSpace != true && $0.isMinimized != true }) ?? regular.first else {
            throw CUError("no_window", "\(bundleId) has no window.")
        }
        return main
    }

    /// Chromium-family process (Electron, CEF, Chrome): its compositor pauses while occluded (docs/05 §4).
    public static func usesChromium(pid: pid_t) -> Bool {
        guard let url = NSRunningApplication(processIdentifier: pid)?.bundleURL else { return false }
        let frameworks = url.appendingPathComponent("Contents/Frameworks")
        let markers = ["Electron Framework.framework", "Chromium Embedded Framework.framework", "Google Chrome Framework.framework"]
        let names = (try? FileManager.default.contentsOfDirectory(atPath: frameworks.path)) ?? []
        return names.contains { name in markers.contains(name) || name.hasSuffix(" Framework.framework") && name.contains("Chrom") }
            || FileManager.default.fileExists(atPath: frameworks.appendingPathComponent("libcef.dylib").path)
    }
}
