import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// savePanelProbe (official 2.42304.0 claude-native cuSavePanelProbe / cuSavePanelProbeAtPoint / cuSavePanelProbeWindow /
/// cuSaveSheetFolderAndParents; the field names are the official ones): what a window shows that the main process's
/// save-panel guard (save-panel.cjs, official BEf0UhNC St / Ot / Ht / Ut) judges an input against — a save sheet and
/// what it would save where, the file the window edits, a title-bar rename popover, the Move To sheet. Read only,
/// except folderAndParents, which opens the save sheet's folder pop-up to read its path menu and closes it again.
///
/// The probe's object (null when there is no such app):
///   ownerPid, sheetIdentifiers (the window's own identifier when it is a save panel, then its sheets', outer first),
///   hitIdentifier / hitTestFellBack (what the point lands on, or the focus when it can't be read there),
///   focusRole / focusIdentifier, windowDocumentUrl / windowDocumentReadFailed, otherWindowDocumentUrls /
///   otherWindowHasSaveSheet, saveNameValue / saveWhereDisplayName / saveShownFolderUrl (the save sheet's name box,
///   folder pop-up and file list), moveSheetIsUp, popoverFolderMenuIsOpen / popoverTextFieldValues /
///   popoverPopUpValues / popoverTextFieldIsUnreadable / popoverHoldsTheFocus.
public enum SavePanel {
    // The AppKit identifiers the official guard keys on (muI2IV6k Rar / zar / Bar / Var / Har / Uar / War / Gar).
    public static let savePanelId = "save-panel", goToWindowId = "GoToWindow", nameFieldId = "saveAsNameTextField"
    public static let moveCancelId = "Cancel Button"
    static let listRoles: Set<String> = ["AXBrowser", "AXOutline", "AXTable", "AXList"]
    static let maxNodes = 3000, maxDepth = 40

    // MARK: AX reads (bounded; a hung app answers within the messaging timeout)

    static func read(_ element: AXUIElement, _ name: String) -> (value: CFTypeRef?, error: AXError) {
        var ref: CFTypeRef?
        let error = AXUIElementCopyAttributeValue(element, name as CFString, &ref)
        return (error == .success ? ref : nil, error)
    }
    static func identifier(_ element: AXUIElement) -> String? { AXLadder.string(element, "AXIdentifier") }
    static func role(_ element: AXUIElement) -> String? { AXLadder.role(element) }
    static func stringValue(_ element: AXUIElement) -> String? { AXLadder.value(element, kAXValueAttribute) as? String }
    static func url(_ element: AXUIElement, _ name: String = "AXURL") -> URL? {
        guard let ref = AXLadder.value(element, name) else { return nil }
        if CFGetTypeID(ref) == CFURLGetTypeID() { return (ref as! CFURL) as URL }
        if let text = ref as? String { return URL(string: text) }
        return nil
    }
    /// A document URL as the official probe passes it: a string ("file:///…"), nil when the window has none.
    static func document(_ window: AXUIElement) -> (url: String?, failed: Bool) {
        let (ref, error) = read(window, kAXDocumentAttribute)
        switch error {
        case .success:
            if let text = ref as? String { return (text.isEmpty ? nil : text, false) }
            if let ref, CFGetTypeID(ref) == CFURLGetTypeID() { return (((ref as! CFURL) as URL).absoluteString, false) }
            return (nil, false)
        case .noValue, .attributeUnsupported, .notImplemented: return (nil, false)
        default: return (nil, true)
        }
    }

    /// Breadth-first over a subtree, bounded; `visit` returns false to skip an element's children.
    static func walk(_ root: AXUIElement, maxNodes: Int = SavePanel.maxNodes, _ visit: (AXUIElement, [String]) -> Bool) {
        var queue: [(AXUIElement, [String])] = [(root, [])], index = 0
        while index < queue.count, index < maxNodes {
            let (node, ancestors) = queue[index]; index += 1
            let nodeRole = role(node) ?? ""
            guard visit(node, ancestors), ancestors.count < maxDepth else { continue }
            for child in AXLadder.children(node) { queue.append((child, ancestors + [nodeRole])) }
        }
    }

    /// The window's sheets, outer first: a save panel that is a window of its own first, then the window's AXSheet
    /// children and the sheets inside them (the Go To Folder sheet sits on the save sheet). Each with its identifier
    /// ("" when it has none). The window's own content is not searched: sheets are its direct children.
    static func sheets(of window: AXUIElement) -> [(element: AXUIElement, id: String)] {
        var out: [(AXUIElement, String)] = []
        if let id = identifier(window), id == savePanelId { out.append((window, id)) }
        // A save panel window: the sheets inside it are found by walking it; any other window: its AXSheet children.
        var pending = out.isEmpty ? AXLadder.children(window).filter { role($0) == "AXSheet" } : [window]
        var seen = 0
        while !pending.isEmpty, seen < 8 {
            let sheet = pending.removeFirst(); seen += 1
            if !CFEqual(sheet, window) { out.append((sheet, identifier(sheet) ?? "")) }
            walk(sheet, maxNodes: 1500) { node, ancestors in
                if ancestors.isEmpty { return true }
                if role(node) == "AXSheet" { pending.append(node); return false }
                return true
            }
        }
        return out
    }

    struct SaveSheet {
        var name: String?
        var whereName: String?
        var whereElement: AXUIElement?
        var shownFolder: String?
        var menuOpen = false
    }

    /// Pure: the folder pop-up among a save sheet's pop-ups — the topmost one (then leftmost) outside its file list.
    public static func wherePopUp(_ candidates: [(frame: CGRect?, inList: Bool)]) -> Int? {
        var best: (index: Int, frame: CGRect)?
        for (index, candidate) in candidates.enumerated() where !candidate.inList {
            guard let frame = candidate.frame else { continue }
            if best == nil || frame.minY < best!.frame.minY - 0.5 || (abs(frame.minY - best!.frame.minY) <= 0.5 && frame.minX < best!.frame.minX) {
                best = (index, frame)
            }
        }
        return best?.index
    }

    /// Pure: the folder a file list shows, from the URLs of the items it lists (their common parent folder), as a
    /// "file:///…/" string; nil when there is nothing to tell it by (an empty folder) or the items do not share one
    /// parent (search results, Recents): the background guard then refuses with confirm_folder_not_shown.
    public static func shownFolder(itemUrls: [URL]) -> String? {
        let parents = itemUrls.filter(\.isFileURL).map { $0.standardizedFileURL.deletingLastPathComponent().absoluteString }
        guard let first = parents.first, parents.allSatisfy({ $0 == first }) else { return nil }
        return first
    }

    static func saveSheet(_ root: AXUIElement) -> SaveSheet {
        var sheet = SaveSheet()
        var popUps: [(AXUIElement, CGRect?, Bool)] = []
        var lists: [AXUIElement] = []
        walk(root) { node, ancestors in
            let nodeRole = role(node) ?? ""
            let inList = ancestors.contains(where: listRoles.contains)
            if identifier(node) == nameFieldId { sheet.name = stringValue(node) ?? "" }
            if nodeRole == "AXPopUpButton" { popUps.append((node, AXLadder.frame(node), inList)) }
            if nodeRole == "AXMenu" { sheet.menuOpen = true }
            if listRoles.contains(nodeRole), !inList { lists.append(node); return false }
            return true
        }
        if let index = wherePopUp(popUps.map { ($0.1, $0.2) }) {
            let element = popUps[index].0
            sheet.whereElement = element
            sheet.whereName = stringValue(element) ?? AXLadder.string(element, kAXTitleAttribute)
            if let folder = url(element), folder.isFileURL { sheet.shownFolder = folder.absoluteString }
        }
        if sheet.shownFolder == nil {
            for list in lists {
                if let folder = shownFolder(itemUrls: itemUrls(list)) { sheet.shownFolder = folder; break }
            }
        }
        return sheet
    }

    /// The URLs of the items a file list shows: a column browser's last column, else its top-level rows.
    static func itemUrls(_ list: AXUIElement) -> [URL] {
        var scope = list
        if role(list) == "AXBrowser", let columns = AXLadder.value(list, "AXColumns") as? [AXUIElement], let last = columns.last { scope = last }
        var urls: [URL] = []
        walk(scope, maxNodes: 600) { node, ancestors in
            if urls.count >= 20 { return false }
            if let item = url(node), item.isFileURL { urls.append(item); return false }
            if role(node) == "AXRow", let level = (AXLadder.value(node, "AXDisclosureLevel") as? NSNumber)?.intValue, level > 0 { return false }
            return ancestors.count < 8
        }
        return urls
    }

    struct Popovers {
        var textValues: [String] = []
        var popUpValues: [String] = []
        var unreadable = false
        var menuOpen = false
        var elements: [AXUIElement] = []
    }

    static func popovers(window: AXUIElement?, app: AXUIElement) -> Popovers {
        var found = Popovers()
        var roots: [AXUIElement] = []
        if let window { roots.append(window) }
        roots += (AXLadder.value(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
        for root in roots {
            walk(root, maxNodes: 1500) { node, _ in
                if role(node) == "AXPopover" { found.elements.append(node); return false }
                return true
            }
        }
        for popover in found.elements {
            walk(popover, maxNodes: 600) { node, _ in
                switch role(node) {
                case "AXTextField":
                    let (ref, error) = read(node, kAXValueAttribute)
                    if error == .success, let text = ref as? String { found.textValues.append(text) }
                    else if error != .noValue { found.unreadable = true }
                case "AXPopUpButton":
                    if let text = stringValue(node) ?? AXLadder.string(node, kAXTitleAttribute) { found.popUpValues.append(text) }
                case "AXMenu": found.menuOpen = true
                default: break
                }
                return true
            }
        }
        return found
    }

    /// The first identifier at the element or up to two parents, stopping at a sheet or window.
    static func hitIdentifier(_ element: AXUIElement) -> String? {
        var node: AXUIElement? = element
        for _ in 0..<3 {
            guard let current = node else { return nil }
            let currentRole = role(current) ?? ""
            if ["AXSheet", "AXWindow", "AXApplication"].contains(currentRole) { return nil }
            if let id = identifier(current) { return id }
            node = AXLadder.element(current, kAXParentAttribute)
        }
        return nil
    }

    /// The AXWindow an element is in (a sheet's elements are in the window the sheet is on).
    static func windowOf(_ element: AXUIElement) -> AXUIElement? {
        var node: AXUIElement? = element
        for _ in 0..<64 {
            guard let current = node else { return nil }
            if role(current) == "AXWindow" { return current }
            node = AXLadder.element(current, kAXParentAttribute)
        }
        return nil
    }

    /// The app a probe is about. windowId → its owner; else a bundle id (the owner of the window at the point when it
    /// has that bundle id, else the first running app with it); else the frontmost app.
    static func target(windowId: UInt32?, bundleId: String?, point: CGPoint?) -> pid_t? {
        if let windowId { return Spaces.owner(windowId: windowId)?.pid }
        if let bundleId {
            if let point, let owner = PointOwner.at(point, ignoring: []), owner["bundleId"] as? String == bundleId,
               let pid = (owner["pid"] as? Int).map(pid_t.init) { return pid }
            return NSRunningApplication.runningApplications(withBundleIdentifier: bundleId).first?.processIdentifier
        }
        return WindowShow.frontmostPid()
    }

    /// The probe. windowId: that window (app_* tools); none: with a point, the window under it; else the app's focused
    /// window. mainWindow: the app's main window instead (a background menu command acts on it).
    public static func probe(windowId: UInt32?, bundleId: String?, point: CGPoint?, mainWindow: Bool = false) -> [String: Any]? {
        _ = AXLadder.setUp
        guard AXIsProcessTrusted(), let pid = target(windowId: windowId, bundleId: bundleId, point: point) else { return nil }
        let app = AXUIElementCreateApplication(pid)
        AXUIElementSetMessagingTimeout(app, 0.5)
        var window: AXUIElement?
        var hit: AXUIElement?
        var fellBack = false
        if let point {
            var element: AXUIElement?
            if AXUIElementCopyElementAtPosition(app, Float(point.x), Float(point.y), &element) == .success, let element { hit = element }
            else { fellBack = true }
        }
        if mainWindow { window = AXLadder.element(app, kAXMainWindowAttribute) }
        else if let windowId { window = AXLadder.windowElement(pid: pid, windowId: windowId) }
        else if let hit, let owner = windowOf(hit) { window = owner }
        if window == nil, !mainWindow, windowId == nil { window = AXLadder.element(app, kAXFocusedWindowAttribute) }
        if let hit, let window, let owner = windowOf(hit), !CFEqual(owner, window) { fellBack = true }
        let focus = AXLadder.element(app, kAXFocusedUIElementAttribute)

        var out: [String: Any] = ["ownerPid": Int(pid), "hitTestFellBack": fellBack]
        out["hitIdentifier"] = (fellBack ? focus : hit ?? (point == nil ? focus : nil)).flatMap(hitIdentifier) ?? NSNull()
        out["focusRole"] = focus.flatMap(role) ?? NSNull()
        out["focusIdentifier"] = focus.flatMap(identifier) ?? NSNull()

        var sheetIds: [String] = []
        var save: SaveSheet?
        var moveSheet = false
        if let window {
            let doc = document(window)
            out["windowDocumentUrl"] = doc.url ?? NSNull()
            out["windowDocumentReadFailed"] = doc.failed
            for sheet in sheets(of: window) {
                sheetIds.append(sheet.id)
                if sheet.id == savePanelId, save == nil { save = saveSheet(sheet.element) }
                else if sheet.id != goToWindowId, !moveSheet {
                    walk(sheet.element, maxNodes: 800) { node, _ in
                        if identifier(node) == moveCancelId { moveSheet = true }
                        return !moveSheet
                    }
                }
            }
        } else {
            out["windowDocumentUrl"] = NSNull()
            out["windowDocumentReadFailed"] = windowId != nil && AXLadder.value(app, kAXWindowsAttribute) == nil
        }
        out["sheetIdentifiers"] = sheetIds
        out["saveNameValue"] = save?.name ?? NSNull()
        out["saveWhereDisplayName"] = save?.whereName ?? NSNull()
        out["saveShownFolderUrl"] = save?.shownFolder ?? NSNull()
        out["moveSheetIsUp"] = moveSheet

        var otherUrls: [String] = [], otherSave = false
        for other in (AXLadder.value(app, kAXWindowsAttribute) as? [AXUIElement]) ?? [] where window.map({ !CFEqual($0, other) }) ?? true {
            if let url = document(other).url { otherUrls.append(url) }
            if !otherSave, sheets(of: other).contains(where: { $0.id == savePanelId }) { otherSave = true }
        }
        out["otherWindowDocumentUrls"] = otherUrls
        out["otherWindowHasSaveSheet"] = otherSave

        let pop = popovers(window: window, app: app)
        out["popoverTextFieldValues"] = pop.textValues
        out["popoverPopUpValues"] = pop.popUpValues
        out["popoverTextFieldIsUnreadable"] = pop.unreadable
        out["popoverFolderMenuIsOpen"] = pop.menuOpen
        var inPopover = false
        if let focus {
            var node: AXUIElement? = focus
            for _ in 0..<64 {
                guard let current = node else { break }
                if role(current) == "AXPopover" { inPopover = true; break }
                node = AXLadder.element(current, kAXParentAttribute)
            }
        }
        out["popoverHoldsTheFocus"] = inPopover
        return out
    }

    /// Pure: the folder and its parents from the folder pop-up's menu titles — the leading run before the first
    /// separator (an empty title), innermost first.
    public static func pathNames(menuTitles: [String?]) -> [String] {
        var names: [String] = []
        for title in menuTitles {
            guard let title, !title.isEmpty else { break }
            names.append(title)
        }
        return names
    }

    /// The save sheet's folder and its parents (official cuSaveSheetFolderAndParents): the folder pop-up is opened,
    /// its path read and the menu cancelled. {names: [String]} | {menuWasOpen: true} (a menu of the sheet was already
    /// open: nothing pressed) | nil (no save sheet, no pop-up, or the menu didn't open).
    public static func folderAndParents(pid: pid_t) -> [String: Any]? {
        _ = AXLadder.setUp
        guard AXIsProcessTrusted() else { return nil }
        let app = AXUIElementCreateApplication(pid)
        AXUIElementSetMessagingTimeout(app, 0.5)
        guard let window = AXLadder.element(app, kAXFocusedWindowAttribute),
              let root = sheets(of: window).first(where: { $0.id == savePanelId })?.element else { return nil }
        let sheet = saveSheet(root)
        if sheet.menuOpen { return ["menuWasOpen": true] }
        guard let popUp = sheet.whereElement, AXUIElementPerformAction(popUp, kAXPressAction as CFString) == .success else { return nil }
        var menu: AXUIElement?
        for _ in 0..<20 where menu == nil {
            usleep(25_000)
            menu = AXLadder.children(popUp).first { role($0) == "AXMenu" }
        }
        guard let menu else { return nil }
        let titles: [String?] = AXLadder.children(menu).map { item in
            role(item) == "AXMenuItem" ? AXLadder.string(item, kAXTitleAttribute) : nil
        }
        if AXUIElementPerformAction(menu, kAXCancelAction as CFString) != .success {
            _ = AXUIElementPerformAction(popUp, kAXCancelAction as CFString)
        }
        return ["names": pathNames(menuTitles: titles)]
    }
}
