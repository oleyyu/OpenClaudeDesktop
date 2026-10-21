import Foundation
import AppKit
import CoreGraphics

/// hideBeforeAction (official 2.42304.0 computer_use.node prepareDisplay / previewHideSet / unhide; spec §1.4.5):
/// before a full-screen screenshot or action, the apps outside the session's allowlist that have a window on the
/// selected display are hidden (NSRunningApplication.hide — not quit, no window minimized), and the turn's end brings
/// them back (unhide). The allowlist, this app and the system's own UI are never hidden.
///
///   prepare   hide them now → {hidden: [{bundleId, name}], activated: bundleId | null}. When the app in front is not
///             allowed afterwards (it was hidden, or it is this app), the allowed app with the topmost window on the
///             display is activated, as the official prepareDisplay does ("activated").
///   preview   the same set without hiding anything (the access card's willHide)
///   unhide    every running app with these bundle ids that is hidden comes back
public enum AppHide {
    /// Never hidden: the desktop shell and the system's own UI processes (official prepareDisplay's list, read from
    /// computer_use.node next to "hidden" / "activated"), whatever the allowlist says.
    public static let systemBundleIds: Set<String> = [
        "com.apple.finder", "com.apple.dock", "com.apple.wallpaper.agent", "com.apple.controlcenter", "com.apple.SystemUIServer",
        "com.apple.TextInputSwitcher", "com.apple.wifi.WiFiAgent", "com.apple.AccessibilityUIServer", "com.apple.loginwindow",
        "com.apple.notificationcenterui", "pl.maketheweb.cleanshotx",
    ]
    public static let systemOwnerNames: Set<String> = ["Notification Center"]

    /// One on-screen window, as CGWindowList reports it.
    public struct Window: Equatable {
        public let pid: pid_t
        public let layer: Int
        public let alpha: Double
        public let bounds: CGRect
        public let ownerName: String?
        public init(pid: pid_t, layer: Int, alpha: Double, bounds: CGRect, ownerName: String? = nil) {
            self.pid = pid; self.layer = layer; self.alpha = alpha; self.bounds = bounds; self.ownerName = ownerName
        }
    }
    /// One running app.
    public struct App: Equatable {
        public let pid: pid_t
        public let bundleId: String?
        public let name: String?
        public let hidden: Bool
        public init(pid: pid_t, bundleId: String?, name: String?, hidden: Bool) {
            self.pid = pid; self.bundleId = bundleId; self.name = name; self.hidden = hidden
        }
    }

    /// Pure: the pids owning a visible normal-layer window (layer 0, not transparent, at least 1×1) on the display.
    public static func pidsOnDisplay(_ windows: [Window], display: CGRect) -> Set<pid_t> {
        Set(windows.filter { $0.layer == 0 && $0.alpha > 0 && $0.bounds.width >= 1 && $0.bounds.height >= 1
            && $0.bounds.intersects(display) && !systemOwnerNames.contains($0.ownerName ?? "") }.map(\.pid))
    }

    /// Pure: which running apps to hide — a window on the display, a bundle id, not hidden yet, and neither allowed,
    /// this app (exempt / selfPid) nor the system's UI. In the order the apps are given.
    public static func toHide(apps: [App], onDisplay: Set<pid_t>, exempt: Set<String>, selfPid: pid_t) -> [App] {
        apps.filter { app in
            guard let bundleId = app.bundleId, !bundleId.isEmpty, app.pid != selfPid, !app.hidden, onDisplay.contains(app.pid) else { return false }
            return !exempt.contains(bundleId) && !systemBundleIds.contains(bundleId)
        }
    }

    /// Pure: the allowed app to bring to the front after hiding — the owner of the topmost window on the display that
    /// belongs to an allowed app — when the app in front is not allowed. nil when nothing needs activating.
    public static func toActivate(windowsFrontToBack: [Window], display: CGRect, bundleOf: (pid_t) -> String?, allowed: Set<String>,
                                  frontBundleId: String?, selfPid: pid_t) -> pid_t? {
        if let front = frontBundleId, allowed.contains(front) { return nil }
        for window in windowsFrontToBack where window.layer == 0 && window.alpha > 0 && window.bounds.intersects(display) && window.pid != selfPid {
            if let bundleId = bundleOf(window.pid), allowed.contains(bundleId) { return window.pid }
        }
        return nil
    }

    static func onScreenWindows() -> [Window] {
        guard let raw = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
        return raw.compactMap { entry in
            guard let pid = (entry[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value else { return nil }
            var bounds = CGRect.zero
            if let dict = entry[kCGWindowBounds as String] as? NSDictionary { CGRectMakeWithDictionaryRepresentation(dict as CFDictionary, &bounds) }
            return Window(pid: pid, layer: (entry[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0,
                          alpha: (entry[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1, bounds: bounds,
                          ownerName: entry[kCGWindowOwnerName as String] as? String)
        }
    }

    /// The display's bounds (global points): the given display, else the main one.
    static func displayBounds(_ displayId: UInt32?) -> CGRect {
        if let displayId, displayId != 0 {
            let bounds = CGDisplayBounds(displayId)
            if bounds.width > 0, bounds.height > 0 { return bounds }
        }
        return CGDisplayBounds(CGMainDisplayID())
    }

    /// Running apps read fresh (a kept NSRunningApplication is refreshed only by a main run loop).
    static func runningApps() -> [App] {
        NSWorkspace.shared.runningApplications.map { app in
            let fresh = NSRunningApplication(processIdentifier: app.processIdentifier) ?? app
            return App(pid: app.processIdentifier, bundleId: app.bundleIdentifier, name: app.localizedName, hidden: fresh.isHidden)
        }
    }

    static func hideSet(exempt: Set<String>, displayId: UInt32?) -> [App] {
        let onDisplay = pidsOnDisplay(onScreenWindows(), display: displayBounds(displayId))
        return toHide(apps: runningApps(), onDisplay: onDisplay, exempt: exempt, selfPid: getpid())
    }

    static func json(_ app: App) -> [String: Any] { ["bundleId": app.bundleId ?? "", "name": (app.name as Any?) ?? NSNull()] }

    /// The access card's willHide: what prepare would hide now, nothing hidden.
    public static func preview(exempt: [String], displayId: UInt32?) -> [String: Any] {
        ["apps": hideSet(exempt: Set(exempt), displayId: displayId).map(json)]
    }

    public static func prepare(allowed: [String], host: [String], displayId: UInt32?) -> [String: Any] {
        let allowedSet = Set(allowed)
        let display = displayBounds(displayId)
        var hidden: [[String: Any]] = []
        for app in hideSet(exempt: allowedSet.union(host), displayId: displayId) {
            guard let running = NSRunningApplication(processIdentifier: app.pid), !running.isTerminated else { continue }
            if running.hide() || NSRunningApplication(processIdentifier: app.pid)?.isHidden == true { hidden.append(json(app)) }
        }
        // The app in front is not allowed (hidden just now, or this app): the topmost allowed window's app comes forward.
        var activated: Any = NSNull()
        let frontPid = WindowShow.frontmostPid()
        let frontBundle = frontPid.flatMap { WindowList.bundleId(pid: $0) }
        if !hidden.isEmpty || !(frontBundle.map(allowedSet.contains) ?? false) {
            if !hidden.isEmpty { usleep(50_000) }
            let now = WindowShow.frontmostPid().flatMap { WindowList.bundleId(pid: $0) }
            if let pid = toActivate(windowsFrontToBack: onScreenWindows(), display: display, bundleOf: { WindowList.bundleId(pid: $0) },
                                    allowed: allowedSet, frontBundleId: now, selfPid: getpid()),
               let app = NSRunningApplication(processIdentifier: pid), app.activate(options: []) {
                for _ in 0..<10 where WindowShow.frontmostPid() != pid { usleep(30_000) }
                if WindowShow.frontmostPid() == pid { activated = app.bundleIdentifier ?? NSNull() }
            }
        }
        return ["hidden": hidden, "activated": activated]
    }

    public static func unhide(bundleIds: [String]) -> [String: Any] {
        let wanted = Set(bundleIds)
        var unhidden: [String] = []
        for app in NSWorkspace.shared.runningApplications {
            guard let bundleId = app.bundleIdentifier, wanted.contains(bundleId),
                  let fresh = NSRunningApplication(processIdentifier: app.processIdentifier), fresh.isHidden else { continue }
            if fresh.unhide() { unhidden.append(bundleId) }
        }
        return ["unhidden": unhidden]
    }
}
