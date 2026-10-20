// cu-ax-helper: the computer-use Accessibility calls that need no synthetic input and that the native module
// (native/computer-use, M1–M3) doesn't expose: window focus, the menu bar, and the app list. One request per process:
// a JSON object on stdin, one JSON line on stdout, always {"ok": true, "result": …} or {"ok": false, "error": {code, message}}.
// It runs as a child of the app, so macOS attributes its Accessibility use to the app (the responsible process).
// When M4 lands these belong in the native module's dispatcher; until then electron/computer-use/ax-helper.cjs runs it.
//
//   probe                                      → {axTrusted}
//   focus     {bundleId, windowId?}            AXMain + AXFocused on the window; never AXRaise, never activates the app;
//                                              refused while the app is frontmost (app_is_frontmost)
//   menu      {bundleId, path: [String]}       walk AXMenuBar by titles, AXPress the last one (a leaf runs its command;
//                                              a menu title opens that menu and lists its items)
//   menuList  {bundleId, path: [String]}       the items under path ([] = the menu bar titles); read-only
//   menuClose {bundleId}                       AXCancel on every open menu of the app (what Escape does)
//   apps      {folders: [String]}              running apps (regular, with pid) and the .app bundles in folders
import AppKit
import ApplicationServices
import Foundation

@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ id: UnsafeMutablePointer<UInt32>) -> AXError

struct Failure: Error { let code: String; let message: String; var details: [String: Any]? = nil }

func value(_ element: AXUIElement, _ name: String) -> AnyObject? {
    var out: AnyObject?
    return AXUIElementCopyAttributeValue(element, name as CFString, &out) == .success ? out : nil
}
func string(_ element: AXUIElement, _ name: String) -> String? { value(element, name) as? String }
func bool(_ element: AXUIElement, _ name: String) -> Bool? { (value(element, name) as? NSNumber)?.boolValue }
func children(_ element: AXUIElement) -> [AXUIElement] { (value(element, kAXChildrenAttribute) as? [AXUIElement]) ?? [] }
func windowId(_ element: AXUIElement) -> UInt32? { var id: UInt32 = 0; return _AXUIElementGetWindow(element, &id) == .success ? id : nil }
func actions(_ element: AXUIElement) -> [String] {
    var names: CFArray?
    return AXUIElementCopyActionNames(element, &names) == .success ? (names as? [String]) ?? [] : []
}

func runningApp(_ bundleId: String) throws -> NSRunningApplication {
    guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first(where: { !$0.isTerminated }) else {
        throw Failure(code: "app_not_running", message: "\(bundleId) is not running.")
    }
    return app
}
func trusted() throws { guard AXIsProcessTrusted() else { throw Failure(code: "ax_untrusted_cannot_verify", message: "Accessibility is not granted.") } }

// MARK: focus

func focus(_ p: [String: Any]) throws -> [String: Any] {
    try trusted()
    guard let bundleId = p["bundleId"] as? String else { throw Failure(code: "invalid_params", message: "bundleId is required") }
    let app = try runningApp(bundleId)
    // The user is working in it: moving its focus would move theirs.
    if app.isActive { return ["outcome": "unsupported", "reasonCode": "app_is_frontmost", "focused": false] }
    let axApp = AXUIElementCreateApplication(app.processIdentifier)
    let windows = (value(axApp, kAXWindowsAttribute) as? [AXUIElement]) ?? []
    let window: AXUIElement
    if let wanted = (p["windowId"] as? NSNumber)?.uint32Value {
        guard let hit = windows.first(where: { windowId($0) == wanted }) else {
            throw Failure(code: "window_not_found", message: "Window \(wanted) is not an Accessibility window of \(bundleId) (it may be on another Space).")
        }
        window = hit
    } else {
        guard let main = (value(axApp, kAXMainWindowAttribute) as! AXUIElement?) ?? windows.first else {
            throw Failure(code: "no_window", message: "\(bundleId) has no window.")
        }
        window = main
    }
    if bool(window, kAXMinimizedAttribute) == true { return ["outcome": "unsupported", "reasonCode": "window_minimized", "focused": false] }
    let id = windowId(window).map { Int($0) } as Any? ?? NSNull()
    let frontBefore = NSWorkspace.shared.frontmostApplication?.processIdentifier
    let mainError = AXUIElementSetAttributeValue(window, kAXMainAttribute as CFString, kCFBooleanTrue)
    let focusError = AXUIElementSetAttributeValue(window, kAXFocusedAttribute as CFString, kCFBooleanTrue)
    // Read back: the app's focused window is this one (some apps only take AXMain).
    let focusedWindow = value(axApp, kAXFocusedWindowAttribute).map { CFEqual($0, window) } ?? false
    let isMain = bool(window, kAXMainAttribute) == true
    var result: [String: Any] = ["outcome": focusedWindow || isMain ? "ok" : "ineffective", "focused": focusedWindow, "main": isMain,
                                 "window_id": id, "activated": NSWorkspace.shared.frontmostApplication?.processIdentifier != frontBefore]
    if !(focusedWindow || isMain) { result["reasonCode"] = "focus_refused"; result["axErrors"] = [mainError.rawValue, focusError.rawValue] }
    return result
}

// MARK: menus

/// "Save As…" / "save as..." / "Save As" all match: any case, trailing ellipsis ignored.
func norm(_ title: String) -> String {
    var t = title.trimmingCharacters(in: .whitespaces).lowercased()
    for suffix in ["…", "..."] where t.hasSuffix(suffix) { t = String(t.dropLast(suffix.count)).trimmingCharacters(in: .whitespaces) }
    return t
}
/// The items of a menu-bar item or menu item: its AXMenu child's children.
func menuItems(_ element: AXUIElement) -> [AXUIElement] {
    let role = string(element, kAXRoleAttribute)
    if role == "AXMenuBar" || role == "AXMenu" { return children(element) }
    return children(element).first(where: { string($0, kAXRoleAttribute) == "AXMenu" }).map(children) ?? []
}
func describe(_ item: AXUIElement) -> [String: Any]? {
    let title = string(item, kAXTitleAttribute) ?? ""
    if title.isEmpty { return nil } // separators
    var out: [String: Any] = ["title": title, "enabled": bool(item, kAXEnabledAttribute) ?? true]
    if !menuItems(item).isEmpty { out["submenu"] = true }
    if let key = string(item, "AXMenuItemCmdChar"), !key.isEmpty { out["shortcut"] = key }
    if let mark = string(item, "AXMenuItemMarkChar"), !mark.isEmpty { out["checked"] = true }
    return out
}
/// Levenshtein over normalized titles, for closestMatch.
func distance(_ a: String, _ b: String) -> Int {
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

func walk(_ bundleId: String, _ path: [String]) throws -> (element: AXUIElement, resolved: [String]) {
    try trusted()
    let app = try runningApp(bundleId)
    guard let bar = value(AXUIElementCreateApplication(app.processIdentifier), kAXMenuBarAttribute) else {
        throw Failure(code: "no_menu_bar", message: "\(bundleId) has no menu bar.")
    }
    var current = bar as! AXUIElement, resolved: [String] = []
    for (level, wanted) in path.enumerated() {
        let items = menuItems(current).filter { !(string($0, kAXTitleAttribute) ?? "").isEmpty }
        guard let hit = items.first(where: { norm(string($0, kAXTitleAttribute)!) == norm(wanted) }) else {
            let titles = items.map { string($0, kAXTitleAttribute)! }
            let closest = titles.min { distance(norm($0), norm(wanted)) < distance(norm($1), norm(wanted)) }
            throw Failure(code: "menu_item_not_found", message: "No menu item \"\(wanted)\" under \(resolved.isEmpty ? "the menu bar" : resolved.joined(separator: " ▸ ")).",
                          details: ["level": level, "wanted": wanted, "resolved": resolved, "closestMatch": closest as Any? ?? NSNull(), "available": titles])
        }
        resolved.append(string(hit, kAXTitleAttribute)!)
        current = hit
    }
    return (current, resolved)
}

func menu(_ p: [String: Any]) throws -> [String: Any] {
    guard let bundleId = p["bundleId"] as? String, let path = p["path"] as? [String], !path.isEmpty else {
        throw Failure(code: "invalid_params", message: "bundleId and a non-empty path are required")
    }
    let (item, resolved) = try walk(bundleId, path)
    if bool(item, kAXEnabledAttribute) == false {
        return ["outcome": "unsupported", "reasonCode": "menu_item_disabled", "path": resolved]
    }
    let opensMenu = string(item, kAXRoleAttribute) == "AXMenuBarItem" || !menuItems(item).isEmpty
    let action = actions(item).contains(kAXPressAction) ? kAXPressAction : actions(item).contains("AXPick") ? "AXPick" : nil
    guard let action else { return ["outcome": "unsupported", "reasonCode": "no_press_action", "path": resolved] }
    let error = AXUIElementPerformAction(item, action as CFString)
    guard error == .success else { return ["outcome": "ineffective", "reasonCode": "ax_press_failed", "axError": error.rawValue, "path": resolved] }
    var out: [String: Any] = ["outcome": "ok", "path": resolved, "opened": opensMenu]
    if opensMenu {
        out["items"] = menuItems(item).compactMap(describe)
        out["open"] = bool(item, kAXSelectedAttribute) == true
    }
    return out
}

func menuList(_ p: [String: Any]) throws -> [String: Any] {
    guard let bundleId = p["bundleId"] as? String else { throw Failure(code: "invalid_params", message: "bundleId is required") }
    let (element, resolved) = try walk(bundleId, (p["path"] as? [String]) ?? [])
    return ["path": resolved, "items": menuItems(element).compactMap(describe)]
}

func menuClose(_ p: [String: Any]) throws -> [String: Any] {
    guard let bundleId = p["bundleId"] as? String else { throw Failure(code: "invalid_params", message: "bundleId is required") }
    let (bar, _) = try walk(bundleId, [])
    var closed = 0
    for top in children(bar) {
        for menu in children(top) where string(menu, kAXRoleAttribute) == "AXMenu" && actions(menu).contains(kAXCancelAction) {
            if bool(top, kAXSelectedAttribute) == true || bool(menu, "AXVisible") == true {
                if AXUIElementPerformAction(menu, kAXCancelAction as CFString) == .success { closed += 1 }
            }
        }
    }
    return ["closed": closed]
}

// MARK: apps

func apps(_ p: [String: Any]) -> [String: Any] {
    let running = NSWorkspace.shared.runningApplications.filter { $0.activationPolicy == .regular && !$0.isTerminated }.compactMap { app -> [String: Any]? in
        guard let id = app.bundleIdentifier else { return nil }
        return ["bundleId": id, "name": app.localizedName ?? id, "pid": Int(app.processIdentifier), "path": app.bundleURL?.path as Any? ?? NSNull(),
                "active": app.isActive, "hidden": app.isHidden]
    }
    var installed: [[String: Any]] = []
    for folder in (p["folders"] as? [String]) ?? [] {
        guard let entries = try? FileManager.default.contentsOfDirectory(atPath: folder) else { continue }
        for entry in entries where entry.hasSuffix(".app") {
            let path = (folder as NSString).appendingPathComponent(entry)
            guard let id = Bundle(path: path)?.bundleIdentifier else { continue }
            installed.append(["bundleId": id, "name": (entry as NSString).deletingPathExtension, "path": path])
        }
    }
    return ["running": running, "installed": installed]
}

// MARK: main

func json(_ object: Any) -> String {
    let data = (try? JSONSerialization.data(withJSONObject: object, options: [.withoutEscapingSlashes, .sortedKeys]))
        ?? Data(#"{"ok":false,"error":{"code":"internal","message":"unserializable result"}}"#.utf8)
    return String(decoding: data, as: UTF8.self)
}

let input = FileHandle.standardInput.readDataToEndOfFile()
var envelope: [String: Any]
do {
    guard let request = try JSONSerialization.jsonObject(with: input) as? [String: Any], let method = request["method"] as? String else {
        throw Failure(code: "invalid_params", message: "expected {method, params}")
    }
    let params = request["params"] as? [String: Any] ?? [:]
    let result: [String: Any]
    switch method {
    case "probe": result = ["axTrusted": AXIsProcessTrusted()]
    case "focus": result = try focus(params)
    case "menu": result = try menu(params)
    case "menuList": result = try menuList(params)
    case "menuClose": result = try menuClose(params)
    case "apps": result = apps(params)
    default: throw Failure(code: "unknown_method", message: "Unknown method \(method).")
    }
    envelope = ["ok": true, "result": result]
} catch let failure as Failure {
    var error: [String: Any] = ["code": failure.code, "message": failure.message]
    if let details = failure.details { error["details"] = details }
    envelope = ["ok": false, "error": error]
} catch {
    envelope = ["ok": false, "error": ["code": "internal", "message": "\(error)"]]
}
print(json(envelope))
