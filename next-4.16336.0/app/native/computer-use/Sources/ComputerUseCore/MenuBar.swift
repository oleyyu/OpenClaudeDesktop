import AppKit
import ApplicationServices
import Foundation

// The Accessibility calls without synthetic input behind app_focus, app_menu and list_apps (official computer_use.node
// exports menu(bundleId, {mode, path}) natively, spec §1.6.4). They used to run in a separate helper process
// (helpers/cu-ax, one process per call); the results are the same shapes it answered.
//
//   AXQuery.trusted                      → {axTrusted}
//   AppFocus.focus  {bundleId, windowId?}   AXMain + AXFocused on the window; never AXRaise, never activates the app;
//                                           refused while the app is frontmost (app_is_frontmost)
//   MenuBar.press   {bundleId, path}        walk AXMenuBar by titles and AXPress the leaf (its command runs). A path
//                                           that ends at a menu or submenu title presses nothing and opens nothing: it
//                                           answers path_ends_at_submenu with that menu's items, read from the AXMenu
//                                           child (official). No menu ever opens: an open menu tracks the mouse and
//                                           takes the keyboard from the app the user is working in.
//   MenuBar.list    {bundleId, path}        the items under path ([] = the menu bar titles); read-only
//   AppList.apps    {folders}               running apps (regular, with pid) and the .app bundles in folders

/// AX messaging with a budget: every message waits at most the time left (and at most the system's 6 s default), and
/// once the budget (the old helper process's 8 s) is spent no further message is sent — the caller answers
/// helper_timeout instead of holding the N-API worker thread on a hung app. The process-wide timeout AXLadder sets is
/// overridden per element, so these calls behave the same whether or not a click ran first.
final class AXQuery {
    static let budget: TimeInterval = 8
    static let longestMessage: TimeInterval = 6
    let deadline: Date
    init(budget: TimeInterval = AXQuery.budget) { deadline = Date().addingTimeInterval(budget) }

    var expired: Bool { Date() >= deadline }
    func checkTime() throws {
        if expired { throw CUError("helper_timeout", "The app didn't answer through Accessibility within \(Int(AXQuery.budget)) s.") }
    }
    /// Arms the element's timeout; false once the budget is spent.
    private func arm(_ element: AXUIElement) -> Bool {
        let left = deadline.timeIntervalSinceNow
        guard left > 0 else { return false }
        AXUIElementSetMessagingTimeout(element, Float(min(left, AXQuery.longestMessage)))
        return true
    }

    func value(_ element: AXUIElement, _ name: String) -> AnyObject? {
        guard arm(element) else { return nil }
        var out: AnyObject?
        return AXUIElementCopyAttributeValue(element, name as CFString, &out) == .success ? out : nil
    }
    func string(_ element: AXUIElement, _ name: String) -> String? { value(element, name) as? String }
    func bool(_ element: AXUIElement, _ name: String) -> Bool? { (value(element, name) as? NSNumber)?.boolValue }
    func element(_ element: AXUIElement, _ name: String) -> AXUIElement? {
        guard let raw = value(element, name), CFGetTypeID(raw) == AXUIElementGetTypeID() else { return nil }
        return (raw as! AXUIElement)
    }
    func children(_ element: AXUIElement) -> [AXUIElement] { (value(element, kAXChildrenAttribute) as? [AXUIElement]) ?? [] }
    func actions(_ element: AXUIElement) -> [String] {
        guard arm(element) else { return [] }
        var names: CFArray?
        return AXUIElementCopyActionNames(element, &names) == .success ? (names as? [String]) ?? [] : []
    }
    func set(_ element: AXUIElement, _ name: String, _ value: CFTypeRef) -> AXError {
        guard arm(element) else { return .cannotComplete }
        return AXUIElementSetAttributeValue(element, name as CFString, value)
    }
    func perform(_ element: AXUIElement, _ action: String) -> AXError {
        guard arm(element) else { return .cannotComplete }
        return AXUIElementPerformAction(element, action as CFString)
    }
    func windowId(_ element: AXUIElement) -> UInt32? {
        var id: UInt32 = 0
        return _AXUIElementGetWindow(element, &id) == .success ? id : nil
    }

    static func trusted() throws {
        guard AXIsProcessTrusted() else { throw CUError("ax_untrusted_cannot_verify", "Accessibility is not granted.") }
    }
    static func runningApp(_ bundleId: String) throws -> NSRunningApplication {
        guard let listed = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first(where: { !$0.isTerminated }) else {
            throw CUError("app_not_running", "\(bundleId) is not running.")
        }
        // A kept NSRunningApplication is refreshed only by a main run loop: read it fresh.
        return NSRunningApplication(processIdentifier: listed.processIdentifier) ?? listed
    }
}

public enum AppFocus {
    /// app_focus: the window becomes the app's main and focused window. Read back through kAXFocusedWindow / AXMain.
    public static func focus(bundleId: String, windowId wanted: UInt32?) throws -> [String: Any] {
        try AXQuery.trusted()
        let ax = AXQuery()
        let app = try AXQuery.runningApp(bundleId)
        let frontBefore = WindowShow.frontmostPid()
        // The user is working in it: moving its focus would move theirs.
        if frontBefore == app.processIdentifier { return ["outcome": "unsupported", "reasonCode": "app_is_frontmost", "focused": false] }
        let axApp = AXUIElementCreateApplication(app.processIdentifier)
        let windows = (ax.value(axApp, kAXWindowsAttribute) as? [AXUIElement]) ?? []
        let window: AXUIElement
        if let wanted {
            guard let hit = windows.first(where: { ax.windowId($0) == wanted }) else {
                try ax.checkTime()
                throw CUError("window_not_found", "Window \(wanted) is not an Accessibility window of \(bundleId) (it may be on another Space).")
            }
            window = hit
        } else {
            guard let main = ax.element(axApp, kAXMainWindowAttribute) ?? windows.first else {
                try ax.checkTime()
                throw CUError("no_window", "\(bundleId) has no window.")
            }
            window = main
        }
        if ax.bool(window, kAXMinimizedAttribute) == true { return ["outcome": "unsupported", "reasonCode": "window_minimized", "focused": false] }
        let id: Any = ax.windowId(window).map { Int($0) } ?? NSNull()
        let mainError = ax.set(window, kAXMainAttribute, kCFBooleanTrue)
        let focusError = ax.set(window, kAXFocusedAttribute, kCFBooleanTrue)
        // Read back: the app's focused window is this one (some apps only take AXMain).
        let focusedWindow = ax.value(axApp, kAXFocusedWindowAttribute).map { CFEqual($0, window) } ?? false
        let isMain = ax.bool(window, kAXMainAttribute) == true
        try ax.checkTime()
        var result: [String: Any] = ["outcome": focusedWindow || isMain ? "ok" : "ineffective", "focused": focusedWindow, "main": isMain,
                                     "window_id": id, "activated": WindowShow.frontmostPid() != frontBefore]
        if !(focusedWindow || isMain) { result["reasonCode"] = "focus_refused"; result["axErrors"] = [mainError.rawValue, focusError.rawValue] }
        return result
    }
}

public enum MenuBar {
    /// "Save As…" / "save as..." / "Save As" all match: any case, trailing ellipsis ignored.
    static func norm(_ title: String) -> String {
        var t = title.trimmingCharacters(in: .whitespaces).lowercased()
        for suffix in ["…", "..."] where t.hasSuffix(suffix) { t = String(t.dropLast(suffix.count)).trimmingCharacters(in: .whitespaces) }
        return t
    }
    /// Levenshtein over normalized titles, for closestMatch.
    static func distance(_ a: String, _ b: String) -> Int {
        let a = Array(a), b = Array(b)
        if a.isEmpty { return b.count }
        var row = Array(0...b.count)
        for i in 1...a.count {
            var prev = row[0]; row[0] = i
            for j in stride(from: 1, through: b.count, by: 1) {
                let cur = row[j]
                row[j] = min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] == b[j - 1] ? 0 : 1))
                prev = cur
            }
        }
        return row[b.count]
    }
    /// The items of a menu-bar item or menu item: its AXMenu child's children.
    static func items(_ ax: AXQuery, _ element: AXUIElement) -> [AXUIElement] {
        let role = ax.string(element, kAXRoleAttribute)
        if role == "AXMenuBar" || role == "AXMenu" { return ax.children(element) }
        return ax.children(element).first(where: { ax.string($0, kAXRoleAttribute) == "AXMenu" }).map(ax.children) ?? []
    }
    static func describe(_ ax: AXQuery, _ item: AXUIElement) -> [String: Any]? {
        let title = ax.string(item, kAXTitleAttribute) ?? ""
        if title.isEmpty { return nil } // separators
        var out: [String: Any] = ["title": title, "enabled": ax.bool(item, kAXEnabledAttribute) ?? true]
        if !items(ax, item).isEmpty { out["submenu"] = true }
        if let key = ax.string(item, "AXMenuItemCmdChar"), !key.isEmpty { out["shortcut"] = key }
        if let mark = ax.string(item, "AXMenuItemMarkChar"), !mark.isEmpty { out["checked"] = true }
        return out
    }

    static func walk(_ ax: AXQuery, _ bundleId: String, _ path: [String]) throws -> (element: AXUIElement, resolved: [String]) {
        try AXQuery.trusted()
        let app = try AXQuery.runningApp(bundleId)
        guard let bar = ax.element(AXUIElementCreateApplication(app.processIdentifier), kAXMenuBarAttribute) else {
            try ax.checkTime()
            throw CUError("no_menu_bar", "\(bundleId) has no menu bar.")
        }
        var current = bar, resolved: [String] = []
        for (level, wanted) in path.enumerated() {
            let titled = items(ax, current).compactMap { item in ax.string(item, kAXTitleAttribute).flatMap { $0.isEmpty ? nil : (item, $0) } }
            try ax.checkTime()
            guard let hit = titled.first(where: { norm($0.1) == norm(wanted) }) else {
                let titles = titled.map(\.1)
                let closest = titles.min { distance(norm($0), norm(wanted)) < distance(norm($1), norm(wanted)) }
                var error = CUError("menu_item_not_found", "No menu item \"\(wanted)\" under \(resolved.isEmpty ? "the menu bar" : resolved.joined(separator: " ▸ ")).")
                error.details = ["level": level, "wanted": wanted, "resolved": resolved, "closestMatch": closest.map { $0 as Any } ?? NSNull(), "available": titles]
                throw error
            }
            resolved.append(hit.1)
            current = hit.0
        }
        return (current, resolved)
    }

    /// app_menu path: press the leaf. A path that ends at a menu-bar title or a submenu is the official
    /// path_ends_at_submenu: nothing is pressed or opened, and the items under it come back (read from its AXMenu child,
    /// which Accessibility gives without opening the menu) so the path can be extended. A command item that is found but
    /// cannot be pressed — no AXPress / AXPick, or the action errors — is the official menu_press_failed (unsupported,
    /// with the AX error).
    public static func press(bundleId: String, path: [String]) throws -> [String: Any] {
        let ax = AXQuery()
        let (item, resolved) = try walk(ax, bundleId, path)
        let submenu = items(ax, item)
        if endsAtSubmenu(role: ax.string(item, kAXRoleAttribute), childItems: submenu.count) {
            let listed = submenu.compactMap { describe(ax, $0) }
            try ax.checkTime()
            return ["outcome": "unsupported", "reasonCode": "path_ends_at_submenu", "path": resolved, "items": listed]
        }
        if ax.bool(item, kAXEnabledAttribute) == false {
            try ax.checkTime()
            return ["outcome": "unsupported", "reasonCode": "menu_item_disabled", "path": resolved]
        }
        let names = ax.actions(item)
        try ax.checkTime()
        let action = names.contains(kAXPressAction) ? kAXPressAction : names.contains("AXPick") ? "AXPick" : nil
        guard let action else {
            return ["outcome": "unsupported", "reasonCode": "menu_press_failed", "axError": AXError.actionUnsupported.rawValue, "path": resolved]
        }
        let error = ax.perform(item, action)
        guard error == .success else {
            return ["outcome": "unsupported", "reasonCode": "menu_press_failed", "axError": error.rawValue, "path": resolved]
        }
        return ["outcome": "ok", "path": resolved]
    }

    /// Pure: a path that ends here names a menu, not a command (a menu-bar title, or an item with a submenu).
    public static func endsAtSubmenu(role: String?, childItems: Int) -> Bool {
        role == "AXMenuBarItem" || childItems > 0
    }

    public static func list(bundleId: String, path: [String]) throws -> [String: Any] {
        let ax = AXQuery()
        let (element, resolved) = try walk(ax, bundleId, path)
        let listed = items(ax, element).compactMap { describe(ax, $0) }
        try ax.checkTime()
        return ["path": resolved, "items": listed]
    }
}

public enum AppList {
    /// list_apps' source: the regular running apps (with pid) and the .app bundles directly in `folders`.
    public static func apps(folders: [String]) -> [String: Any] {
        let front = WindowShow.frontmostPid()
        let running = NSWorkspace.shared.runningApplications.compactMap { listed -> [String: Any]? in
            let app = NSRunningApplication(processIdentifier: listed.processIdentifier) ?? listed
            guard app.activationPolicy == .regular, !app.isTerminated, let id = app.bundleIdentifier else { return nil }
            return ["bundleId": id, "name": app.localizedName ?? id, "pid": Int(app.processIdentifier),
                    "path": app.bundleURL?.path as Any? ?? NSNull(), "active": app.processIdentifier == front, "hidden": app.isHidden]
        }
        var installed: [[String: Any]] = []
        for folder in folders {
            guard let entries = try? FileManager.default.contentsOfDirectory(atPath: folder) else { continue }
            for entry in entries where entry.hasSuffix(".app") {
                let path = (folder as NSString).appendingPathComponent(entry)
                guard let id = Bundle(path: path)?.bundleIdentifier else { continue }
                installed.append(["bundleId": id, "name": (entry as NSString).deletingPathExtension, "path": path])
            }
        }
        return ["running": running, "installed": installed]
    }
}
