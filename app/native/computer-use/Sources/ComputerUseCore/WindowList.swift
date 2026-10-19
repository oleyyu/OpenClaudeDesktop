import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// One window as app_list_windows reports it (docs/02-tools.live.json):
/// {window_id, title, is_main, is_minimized, is_hidden, is_off_space, bounds, is_auxiliary}.
/// is_main / is_minimized / is_off_space need Accessibility; without it they are null (unknown), never guessed.
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
            out.append(WindowInfo(
                windowId: number, pid: owner, bundleId: bundleId,
                title: entry[kCGWindowName as String] as? String ?? "",
                bounds: bounds, layer: layer,
                isOnScreen: (entry[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false,
                isMain: nil, isMinimized: nil, isHidden: hidden[owner] ?? false, isOffSpace: nil,
                isAuxiliary: layer != 0
            ))
        }
        guard AXIsProcessTrusted() else { return out }
        var axWindows: [pid_t: [UInt32: AXUIElement]?] = [:]
        for pid in pids { axWindows[pid] = axWindowsById(pid: pid) }
        return out.map { enrich($0, axWindows[$0.pid] ?? nil) }
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
    /// A titled layer-0 window AX does not list is off-Space when it is not on screen (and the app is not hidden),
    /// else a palette or panel the app does not report (auxiliary). Unknown stays null.
    private static func enrich(_ window: WindowInfo, _ axWindows: [UInt32: AXUIElement]?) -> WindowInfo {
        var window = window
        guard let axWindows else { return window }
        guard let element = axWindows[window.windowId] else {
            // Untitled unlisted strips (Finder keeps several 33-pt ones) stay auxiliary: without Space membership
            // (SkyLight, M4) a title is the cheapest sign of a real document window.
            if window.layer == 0, !window.isOnScreen, !window.isHidden, !window.title.isEmpty {
                window.isOffSpace = true
                window.isMinimized = false
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
        // Listed by AX, so on the current Space (or minimized, which AX lists wherever it was).
        window.isOffSpace = false
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
        let regular = windows.filter { !$0.isAuxiliary }
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
