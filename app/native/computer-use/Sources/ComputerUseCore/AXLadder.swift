import Foundation
import ApplicationServices
import CoreGraphics

/// The AX rung of the ladder (docs/04): summary of a window's actionable elements, hit-testing a point, climbing to
/// the element that can actually be pressed, and pressing it. Nothing here produces input events: when AX cannot do
/// the action the result is `unsupported` with a reason code, and the main process decides (fail-closed) what follows.
///
/// Result {outcome: ok | ineffective | unsupported | dryRun, reasonCode, role, subrole, title, pressedRole,
///         descentPath, axOp, axError, foreignPid, elementFrame}
public enum AXLadder {
    /// Climb at most this many parents from the hit element to a pressable one ("四层上溯").
    public static let climbLevels = 4
    /// A right click climbs at most this many parents to an element that answers AXShowMenu.
    public static let menuClimbLevels = 2
    /// A double click on anything but text is two AXPress this far apart (Accessibility has no double click).
    static let doublePressGapMicros: useconds_t = 80_000
    /// A double click on these selects the word at the point through AXSelectedTextRange (what a double click means in
    /// text), a triple click the line. AXTextArea is here too: a TextEdit document is one.
    static let textSelectRoles: Set<String> = ["AXStaticText", "AXTextField", "AXTextArea"]
    /// Summary bounds: what the walk visits and what it keeps.
    static let maxVisited = 4000, maxElements = 500

    /// Global AX messaging timeout for this process (a hung app must not hang the caller).
    static let setUp: Void = { AXUIElementSetMessagingTimeout(AXUIElementCreateSystemWide(), 0.25) }()

    static let actionableRoles: Set<String> = [
        "AXButton", "AXCheckBox", "AXRadioButton", "AXPopUpButton", "AXMenuButton", "AXComboBox", "AXTextField",
        "AXTextArea", "AXLink", "AXSlider", "AXIncrementor", "AXDisclosureTriangle", "AXMenuItem", "AXColorWell",
        "AXSearchField", "AXTab", "AXRow", "AXCell", "AXOutlineRow", "AXDockItem",
    ]
    /// Pressing these opens a menu: that would front the app or take the keyboard (live schema: refused).
    static let menuPresentingRoles: Set<String> = ["AXPopUpButton", "AXMenuButton"]
    /// The raw rung's readback (RawInput.rawClick, behind a reason the policy keeps closed): the rows a coordinate
    /// click would select.
    static let noPressFallbackRoles: Set<String> = ["AXRow", "AXCell"]
    /// Official 2.42304.0 (computer_use.node, the click ladder's row role set): a click on one of these is
    /// `set AXSelected=true`, a double click `AXOpen` when the element offers it (else it is selected too). AXPress
    /// only for a row inside a web page. A Finder list row is one, with no AXPress.
    static let rowRoles: Set<String> = ["AXRow", "AXCell", "AXColumn", "AXOutlineRow"]
    /// Official text role set: a text field inside a row means the row ("set AXSelected=true (row of the text)") — a
    /// Finder name field, which a real click on a selected row would start renaming.
    static let textFieldRoles: Set<String> = ["AXTextField", "AXTextArea", "AXSearchField"]
    /// Apps whose on-screen window has no AXWindow in their tree: the Dock (AXApplication ▸ AXList ▸ AXDockItem). The
    /// app element stands in for the window, limited to the window's bounds.
    static let windowlessShells: Set<String> = ["com.apple.dock"]
    /// How long a selection is read back: polls × interval.
    static let selectPolls = 10, selectPollMicros: useconds_t = 50_000
    /// The climb stops here: pressing a window or the app is never the intent.
    static let climbStops: Set<String> = ["AXWindow", "AXSheet", "AXApplication", "AXDrawer"]

    // MARK: attributes

    static func value(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        var ref: CFTypeRef?
        return AXUIElementCopyAttributeValue(element, name as CFString, &ref) == .success ? ref : nil
    }
    static func string(_ element: AXUIElement, _ name: String) -> String? {
        guard let text = value(element, name) as? String, !text.isEmpty else { return nil }
        return text
    }
    static func element(_ element: AXUIElement, _ name: String) -> AXUIElement? {
        guard let ref = value(element, name), CFGetTypeID(ref) == AXUIElementGetTypeID() else { return nil }
        return (ref as! AXUIElement)
    }
    static func children(_ element: AXUIElement) -> [AXUIElement] {
        (value(element, kAXChildrenAttribute) as? [AXUIElement]) ?? []
    }
    static func role(_ element: AXUIElement) -> String? { string(element, kAXRoleAttribute) }
    static func actions(_ element: AXUIElement) -> [String] {
        var names: CFArray?
        guard AXUIElementCopyActionNames(element, &names) == .success else { return [] }
        return (names as? [String]) ?? []
    }
    static func frame(_ element: AXUIElement) -> CGRect? {
        guard let p = value(element, kAXPositionAttribute), let s = value(element, kAXSizeAttribute),
              CFGetTypeID(p) == AXValueGetTypeID(), CFGetTypeID(s) == AXValueGetTypeID() else { return nil }
        var point = CGPoint.zero, size = CGSize.zero
        guard AXValueGetValue(p as! AXValue, .cgPoint, &point), AXValueGetValue(s as! AXValue, .cgSize, &size) else { return nil }
        return CGRect(origin: point, size: size)
    }
    static func title(_ element: AXUIElement) -> String? {
        let text = string(element, kAXTitleAttribute) ?? string(element, kAXDescriptionAttribute)
            ?? (value(element, kAXValueAttribute) as? String).flatMap { $0.isEmpty ? nil : $0 }
            ?? string(element, kAXHelpAttribute)
        return text.map { String($0.prefix(80)) }
    }
    static func pid(_ element: AXUIElement) -> pid_t? {
        var pid: pid_t = 0
        return AXUIElementGetPid(element, &pid) == .success ? pid : nil
    }
    static func axErrorName(_ error: AXError) -> String {
        switch error {
        case .success: return "success"
        case .failure: return "failure"
        case .illegalArgument: return "illegalArgument"
        case .invalidUIElement: return "invalidUIElement"
        case .cannotComplete: return "cannotComplete"
        case .attributeUnsupported: return "attributeUnsupported"
        case .actionUnsupported: return "actionUnsupported"
        case .notImplemented: return "notImplemented"
        case .apiDisabled: return "apiDisabled"
        case .noValue: return "noValue"
        default: return "axError(\(error.rawValue))"
        }
    }

    /// The app's AX window element for a CGWindowID (current Space only), or nil.
    static func windowElement(pid: pid_t, windowId: UInt32) -> AXUIElement? {
        _ = setUp
        let app = AXUIElementCreateApplication(pid)
        guard let windows = value(app, kAXWindowsAttribute) as? [AXUIElement] else { return nil }
        return windows.first { w in var id: UInt32 = 0; return _AXUIElementGetWindow(w, &id) == .success && id == windowId }
    }

    /// The element a window's actions resolve in: its AXWindow, or for a windowless shell (the Dock) the app element.
    static func root(pid: pid_t, windowId: UInt32) -> (element: AXUIElement, windowless: Bool)? {
        if let window = windowElement(pid: pid, windowId: windowId) { return (window, false) }
        guard let bundleId = WindowList.bundleId(pid: pid), windowlessShells.contains(bundleId) else { return nil }
        return (AXUIElementCreateApplication(pid), true)
    }

    // MARK: summary

    /// Frame in the capture's full-resolution coordinates: (screen − window origin) × scaleFactor.
    static func framePx(_ rect: CGRect, origin: CGPoint, scale: Double) -> [String: Any] {
        ["x": ((rect.minX - origin.x) * scale).rounded(), "y": ((rect.minY - origin.y) * scale).rounded(),
         "width": (rect.width * scale).rounded(), "height": (rect.height * scale).rounded()]
    }

    /// The window's actionable elements in document order (breadth-first), each with its [index]. The elements are
    /// cached (SummaryCache) so element_index addresses exactly what the model was shown.
    public static func summary(pid: pid_t, windowId: UInt32, bounds: CGRect, scaleFactor: Double) -> [[String: Any]] {
        guard AXIsProcessTrusted(), let window = root(pid: pid, windowId: windowId)?.element else {
            SummaryCache.store(windowId: windowId, pid: pid, elements: [])
            return []
        }
        var out: [[String: Any]] = [], kept: [AXUIElement] = []
        // A windowless shell's tree is the app's: only what lies inside this window's bounds is kept (below).
        var queue = children(window)[...], visited = 0
        while let node = queue.popFirst(), visited < maxVisited, kept.count < maxElements {
            visited += 1
            if let role = role(node), actionableRoles.contains(role) || string(node, kAXSubroleAttribute) == "AXSearchField",
               let full = frame(node), case let rect = full.intersection(bounds), !rect.isNull, rect.width >= 1, rect.height >= 1,
               bounds.contains(CGPoint(x: full.midX, y: full.midY)) || rect.width * rect.height >= 0.5 * full.width * full.height {
                // The visible part: what the model sees, and where element_index aims.
                var entry: [String: Any] = ["index": kept.count, "role": role, "frame": framePx(rect, origin: bounds.origin, scale: scaleFactor)]
                if let subrole = string(node, kAXSubroleAttribute) { entry["subrole"] = subrole }
                if let title = title(node) { entry["title"] = title }
                if (value(node, kAXEnabledAttribute) as? NSNumber)?.boolValue == false { entry["enabled"] = false }
                if role == "AXCheckBox" || role == "AXRadioButton", let on = value(node, kAXValueAttribute) as? NSNumber {
                    entry["checked"] = on.intValue != 0
                }
                out.append(entry)
                kept.append(node)
            }
            queue.append(contentsOf: children(node))
        }
        SummaryCache.store(windowId: windowId, pid: pid, elements: kept)
        return out
    }

    // MARK: click

    public struct Request {
        public var pid: pid_t
        public var windowId: UInt32
        public var bounds: CGRect
        public var winLocalPt: CGPoint?
        public var elementIndex: Int?
        public var focused: Bool
        public var count: Int
        public var button: String
        public var dryRun: Bool
        public var expectRole: String?
        public init(pid: pid_t, windowId: UInt32, bounds: CGRect, winLocalPt: CGPoint?, elementIndex: Int?, focused: Bool, count: Int, button: String, dryRun: Bool, expectRole: String? = nil) {
            self.pid = pid; self.windowId = windowId; self.bounds = bounds; self.winLocalPt = winLocalPt; self.expectRole = expectRole
            self.elementIndex = elementIndex; self.focused = focused; self.count = count; self.button = button; self.dryRun = dryRun
        }
    }

    static func unsupported(_ reason: String, _ extra: [String: Any] = [:]) -> [String: Any] {
        ["outcome": "unsupported", "reasonCode": reason].merging(extra) { a, _ in a }
    }

    /// Ancestors from `element` up (inclusive), at most `limit`.
    static func ancestry(_ element: AXUIElement, limit: Int = 64) -> [AXUIElement] {
        var chain: [AXUIElement] = [element], current = element
        while chain.count < limit, let parent = self.element(current, kAXParentAttribute) {
            chain.append(parent)
            current = parent
        }
        return chain
    }

    /// A left click: row selection / AXOpen, text selection, AXPress or an ascended selection (step 3); AXShowMenu for a
    /// right click. Order of refusals: window ownership, sheet, then the step.
    public static func click(_ request: Request) -> [String: Any] {
        _ = setUp
        guard AXIsProcessTrusted() else { return unsupported("ax_untrusted_cannot_verify") }
        guard let (window, windowless) = root(pid: request.pid, windowId: request.windowId) else {
            return unsupported("window_off_space")
        }

        // 1. The element the action is aimed at.
        var hit: AXUIElement
        var listed: AXUIElement?
        if request.focused {
            guard let focused = element(AXUIElementCreateApplication(request.pid), kAXFocusedUIElementAttribute) else {
                return unsupported("no_focused_element")
            }
            hit = focused
        } else {
            let screenPt: CGPoint
            if let index = request.elementIndex {
                guard let cached = SummaryCache.element(windowId: request.windowId, pid: request.pid, index: index),
                      case let rect = (frame(cached) ?? .null).intersection(request.bounds), !rect.isNull, !rect.isEmpty,
                      request.expectRole == nil || role(cached) == request.expectRole else { return unsupported("listed_element_gone") }
                listed = cached
                screenPt = CGPoint(x: rect.midX, y: rect.midY)
            } else if let local = request.winLocalPt {
                screenPt = CGPoint(x: request.bounds.minX + local.x, y: request.bounds.minY + local.y)
            } else {
                return unsupported("no_target")
            }
            var found: AXUIElement?
            let error = AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(request.pid), Float(screenPt.x), Float(screenPt.y), &found)
            guard error == .success, let found else { return unsupported("canvas", ["axError": axErrorName(error)]) }
            hit = found
        }

        // 2. Ownership: the hit belongs to the granted process and to the target window (not another one on top).
        guard let hitPid = pid(hit) else { return unsupported("ax_untrusted_cannot_verify") }
        if hitPid != request.pid { return unsupported("foreign_pid", ["foreignPid": Int(hitPid)]) }
        let chain = ancestry(hit)
        let path = chain.compactMap(role)
        // A windowless shell (the Dock): the hit hangs straight under the app, never in one of its AXWindows.
        let windowIndex = windowless ? (chain.firstIndex(where: { role($0) == "AXWindow" }) == nil ? chain.count - 1 : nil)
            : chain.firstIndex(where: { role($0) == "AXWindow" }).flatMap { CFEqual(chain[$0], window) ? $0 : nil }
        guard let windowIndex else {
            var extra: [String: Any] = ["descentPath": path]
            if let other = chain.first(where: { role($0) == "AXWindow" }) {
                var id: UInt32 = 0
                if _AXUIElementGetWindow(other, &id) == .success { extra["hitWindowId"] = Int(id) }
                if let name = string(other, kAXTitleAttribute) { extra["hitTitle"] = name }
            }
            return unsupported("anotherWindowIsOnTopAtThePressPoint", extra)
        }
        // A listed element must still be what is at its centre (the hit is it or inside it).
        if let listed, !chain.contains(where: { CFEqual($0, listed) }) {
            return unsupported("listed_element_covered", ["descentPath": path])
        }
        // A sheet on the window takes the clicks; outside it, nothing behind is clickable.
        let sheets = children(window).filter { role($0) == "AXSheet" }
        if !sheets.isEmpty, !chain.prefix(windowIndex).contains(where: { node in sheets.contains { CFEqual($0, node) } }) {
            return unsupported("sheet_or_modal_on_target_window", ["descentPath": path])
        }

        // 3. What the click means, in the official ladder's order (2.42304.0 computer_use.node, docs/computer-use-
        // official-spec-20261021.md §1.2.1): a row is selected (opened on a double click); a text field in a row means
        // that row; text takes a double / triple click as a word / line selection; otherwise the first element that
        // answers AXPress within four parents; otherwise the nearest selectable ancestor (selected, or opened).
        let start = listed ?? hit
        let describe: [String: Any] = ["role": role(hit) ?? NSNull(), "subrole": string(hit, kAXSubroleAttribute) ?? NSNull(),
                                       "title": title(hit) ?? NSNull(), "descentPath": path]
        if request.button == "right" { return showMenu(from: start, pid: request.pid, dryRun: request.dryRun, describe: describe) }
        let startRole = role(start) ?? ""
        let webPage = inWebArea(start)
        let row = webPage ? nil : rowAncestor(start)
        switch leftClickStep(role: startRole, count: request.count, inWebPage: webPage,
                             hasPress: actions(start).contains(kAXPressAction as String), hasRowAncestor: row != nil) {
        case .row:
            // A cell that cannot itself do what the click means (be opened on a double click, or be selected) stands for
            // its row (the official ascended selection).
            if let row, request.count >= 2 && !actions(start).contains("AXOpen") && actions(row).contains("AXOpen")
                || !settable(start, kAXSelectedAttribute) && settable(row, kAXSelectedAttribute) {
                return selectOrOpen(row, count: request.count, suffix: " (ascended)", request: request, dryRun: request.dryRun, describe: describe)
            }
            return selectOrOpen(start, count: request.count, suffix: "", request: request, dryRun: request.dryRun, describe: describe)
        case .rowOfText:
            return selectOrOpen(row!, count: request.count, suffix: " (row of the text)", request: request, dryRun: request.dryRun, describe: describe)
        case .text:
            let screenPt = request.focused ? nil : request.winLocalPt.map { CGPoint(x: request.bounds.minX + $0.x, y: request.bounds.minY + $0.y) }
                ?? frame(start).map { r in CGPoint(x: r.intersection(request.bounds).midX, y: r.intersection(request.bounds).midY) }
            return selectText(start, unit: request.count == 3 ? .line : .word, at: screenPt, dryRun: request.dryRun, describe: describe)
        case .press:
            break
        }
        // A triple click means "the line": outside text there is no line, and pressing three times is not it — only a
        // selectable ancestor can still take it (opened, as a double click).
        let climb = request.count == 3 ? [] : ancestry(start, limit: climbLevels + 1).prefix { !(role($0).map(climbStops.contains) ?? false) }
        guard let target = climb.first(where: { actions($0).contains(kAXPressAction as String) }) else {
            // Nothing to press: the nearest selectable ancestor (a row, or anything whose AXSelected is settable, such
            // as an icon-view item) is selected or opened — official "set AXSelected=true (ascended)". None: canvas,
            // never a blind click.
            if let selectable = webPage ? nil : selectableAncestor(start) {
                let suffix = CFEqual(selectable, start) ? "" : " (ascended)"
                return selectOrOpen(selectable, count: request.count, suffix: suffix, request: request, dryRun: request.dryRun, describe: describe)
            }
            return unsupported("canvas", describe)
        }
        var result = describe
        let targetRole = role(target) ?? ""
        result["pressedRole"] = targetRole
        result["pressedTitle"] = title(target) ?? NSNull()
        // Window-local points; the main process converts to the capture's frame pixels.
        if let rect = frame(target) { result["pressedLocalFrame"] = framePx(rect, origin: request.bounds.origin, scale: 1) }
        if menuPresentingRoles.contains(targetRole) { return unsupported("popup_menu", result) }
        if (value(target, kAXEnabledAttribute) as? NSNumber)?.boolValue == false { return unsupported("element_disabled", result) }
        result["axOp"] = "AXPress"
        if request.count == 2 { result["pressCount"] = 2 }
        if request.dryRun { result["outcome"] = "dryRun"; return result }

        // 4. Press (some controls only implement AXConfirm); a double click presses twice, 80 ms apart.
        for done in 0..<request.count {
            if done > 0 { usleep(doublePressGapMicros) }
            let (op, error) = press(target)
            guard let op else {
                result["outcome"] = "ineffective"
                result["reasonCode"] = "ax_press_failed"
                result["axError"] = axErrorName(error)
                if request.count == 2 { result["pressCount"] = done }
                return result
            }
            result["axOp"] = op
        }
        result["outcome"] = "ok"
        result["reasonCode"] = NSNull()
        return result
    }

    /// One AXPress, else AXConfirm: the action that took (nil when neither did) and AXPress's error.
    static func press(_ target: AXUIElement) -> (op: String?, error: AXError) {
        let error = AXUIElementPerformAction(target, kAXPressAction as CFString)
        if error == .success { return ("AXPress", error) }
        if actions(target).contains("AXConfirm"), AXUIElementPerformAction(target, "AXConfirm" as CFString) == .success { return ("AXConfirm", error) }
        return (nil, error)
    }
}

extension AXLadder {
    public enum TextUnit: String { case word, line }

    /// The UTF-16 index of the character at a screen point (AXRangeForPosition), or nil.
    static func index(of element: AXUIElement, at point: CGPoint) -> Int? {
        var point = point
        guard let value = AXValueCreate(.cgPoint, &point) else { return nil }
        var ref: CFTypeRef?
        guard AXUIElementCopyParameterizedAttributeValue(element, kAXRangeForPositionParameterizedAttribute as CFString, value, &ref) == .success,
              let ref, CFGetTypeID(ref) == AXValueGetTypeID() else { return nil }
        var range = CFRange()
        return AXValueGetValue(ref as! AXValue, .cfRange, &range) ? range.location : nil
    }

    /// The range of `unit` around UTF-16 index `index` of `text`: the word (ICU word boundaries, so CJK words too; off
    /// a word, the character there, as a text view does) or the line with its line break (what a triple click selects).
    public static func unitRange(_ unit: TextUnit, in text: String, at index: Int) -> NSRange? {
        let ns = text as NSString
        guard ns.length > 0 else { return nil }
        let i = min(max(index, 0), ns.length - 1)
        let line = ns.lineRange(for: NSRange(location: i, length: 0))
        if unit == .line { return line }
        var word: NSRange?
        ns.enumerateSubstrings(in: line, options: [.byWords, .substringNotRequired]) { _, range, _, stop in
            if NSLocationInRange(i, range) { word = range; stop.pointee = true }
        }
        return word ?? ns.rangeOfComposedCharacterSequence(at: i)
    }

    /// Double / triple click on text: select the word / line at the point (no point: around the insertion point) by
    /// writing AXSelectedTextRange, and read it back. Official reasons: not settable → canvas, no character at the point →
    /// no_range_for_position, not read back → caret_not_placed.
    static func selectText(_ element: AXUIElement, unit: TextUnit, at screenPt: CGPoint?, dryRun: Bool, describe: [String: Any]) -> [String: Any] {
        var result = describe
        result["axOp"] = "AXSelectedTextRange"
        result["selectUnit"] = unit.rawValue
        var settable: DarwinBoolean = false
        guard AXUIElementIsAttributeSettable(element, kAXSelectedTextRangeAttribute as CFString, &settable) == .success, settable.boolValue,
              let text = value(element, kAXValueAttribute) as? String, !text.isEmpty else {
            return unsupported("canvas", result.merging(["selectionNotSettable": true]) { a, _ in a })
        }
        let caret = (value(element, kAXSelectedTextRangeAttribute)).flatMap { ref -> Int? in
            guard CFGetTypeID(ref) == AXValueGetTypeID() else { return nil }
            var range = CFRange()
            return AXValueGetValue(ref as! AXValue, .cfRange, &range) ? range.location : nil
        }
        guard let index = screenPt.flatMap({ index(of: element, at: $0) }) ?? caret,
              let wanted = unitRange(unit, in: text, at: index) else {
            return unsupported("no_range_for_position", result.merging(["noTextIndex": true]) { a, _ in a })
        }
        result["selectedRange"] = ["location": wanted.location, "length": wanted.length]
        if dryRun { result["outcome"] = "dryRun"; return result }
        var range = CFRange(location: wanted.location, length: wanted.length)
        guard let axRange = AXValueCreate(.cfRange, &range) else { return unsupported("caret_not_placed", result) }
        let error = AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, axRange)
        var readBack = CFRange()
        guard error == .success, let ref = value(element, kAXSelectedTextRangeAttribute), CFGetTypeID(ref) == AXValueGetTypeID(),
              AXValueGetValue(ref as! AXValue, .cfRange, &readBack), readBack.location == range.location, readBack.length == range.length else {
            if error != .success { result["axError"] = axErrorName(error) }
            return unsupported("caret_not_placed", result.merging(["selectionNotReadBack": true]) { a, _ in a })
        }
        result["outcome"] = "ok"
        result["reasonCode"] = NSNull()
        result["selectedText"] = String((text as NSString).substring(with: wanted).prefix(200))
        return result
    }
}

extension AXLadder {
    /// How long a right click waits for the context menu to show up: polls × interval.
    static let menuPolls = 8, menuPollMicros: useconds_t = 40_000

    /// The app's on-screen pop-up menu windows (a context menu is one), by window number.
    static func popUpMenuWindows(pid: pid_t) -> Set<Int> {
        let level = Int(CGWindowLevelForKey(.popUpMenuWindow))
        let list = (CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]]) ?? []
        return Set(list.compactMap { info in
            guard (info[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == pid,
                  (info[kCGWindowLayer as String] as? NSNumber)?.intValue == level else { return nil }
            return (info[kCGWindowNumber as String] as? NSNumber)?.intValue
        })
    }

    /// Right click: AXShowMenu on `start`, else on one of its first `menuClimbLevels` parents. Nothing answers it →
    /// no_menu_action (never another way). The menu is read back: a new pop-up menu window of the app, or a new AXMenu
    /// under the element, an ancestor up to its window, or the app (live, Finder 2026-10-20: AXShowMenu on a list row's
    /// name field waits in the app's menu tracking — cannotComplete after the messaging timeout — and its AXMenu hangs
    /// under the AXOutline three levels up). Item titles come back as menuItems when the AXMenu is readable.
    /// No menu → ineffective menu_not_shown.
    static func showMenu(from start: AXUIElement, pid: pid_t, dryRun: Bool, describe: [String: Any]) -> [String: Any] {
        var result = describe
        let climb = ancestry(start, limit: menuClimbLevels + 1).prefix { !(role($0).map(climbStops.contains) ?? false) }
        guard let target = climb.first(where: { actions($0).contains(kAXShowMenuAction as String) }) else {
            return unsupported("no_menu_action", result)
        }
        result["menuRole"] = role(target) ?? NSNull()
        result["menuTitle"] = title(target) ?? NSNull()
        result["axOp"] = "AXShowMenu"
        if (value(target, kAXEnabledAttribute) as? NSNumber)?.boolValue == false { return unsupported("element_disabled", result) }
        if dryRun { result["outcome"] = "dryRun"; return result }

        var owners = [AXUIElement]()
        for node in ancestry(target) { owners.append(node); if role(node) == "AXWindow" { break } }
        owners.append(AXUIElementCreateApplication(pid))
        let menus = { owners.flatMap(children).filter { role($0) == "AXMenu" } }
        let menusBefore = menus(), windowsBefore = popUpMenuWindows(pid: pid)
        // An app that tracks the menu inside the action answers cannotComplete; the readback decides.
        let error = AXUIElementPerformAction(target, kAXShowMenuAction as CFString)
        if error != .success { result["axError"] = axErrorName(error) }
        if error == .success || error == .cannotComplete {
            for _ in 0..<menuPolls {
                usleep(menuPollMicros)
                let newMenu = { menus().first { m in !menusBefore.contains { CFEqual($0, m) } } }
                var menu = newMenu()
                guard menu != nil || !popUpMenuWindows(pid: pid).subtracting(windowsBefore).isEmpty else { continue }
                // The window can show before the AXMenu is in the tree: one more look for the items.
                if menu == nil { usleep(menuPollMicros); menu = newMenu() }
                result["outcome"] = "ok"
                result["reasonCode"] = NSNull()
                if let menu {
                    result["menuItems"] = children(menu).filter { role($0) == "AXMenuItem" }.compactMap { string($0, kAXTitleAttribute) }.prefix(40).map { $0 }
                }
                return result
            }
        }
        result["outcome"] = "ineffective"
        result["reasonCode"] = "menu_not_shown"
        return result
    }
}

extension AXLadder {
    /// Before a raw event at `screenPt`: the element there must belong to `pid` and to window `windowId` (not another
    /// window on top), and a sheet on the window must contain it — the same ownership checks click() makes, re-run at
    /// delivery time because the raw rung is a second call.
    static func pointOwnerRefusal(pid: pid_t, windowId: UInt32, screenPt: CGPoint) -> (reason: String, extra: [String: Any])? {
        _ = setUp
        guard AXIsProcessTrusted() else { return ("ax_untrusted_cannot_verify", [:]) }
        guard let window = windowElement(pid: pid, windowId: windowId) else { return ("window_off_space", [:]) }
        var found: AXUIElement?
        // App-scoped, as click() hit-tests: the event goes to this pid only (CGEventPostToPid), so what matters is which
        // of ITS elements and windows is at the point.
        let error = AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(pid), Float(screenPt.x), Float(screenPt.y), &found)
        guard error == .success, let hit = found, let hitPid = self.pid(hit) else {
            return ("ax_untrusted_cannot_verify", ["axError": axErrorName(error)])
        }
        if hitPid != pid { return ("foreign_pid", ["foreignPid": Int(hitPid)]) }
        return ownershipRefusal(hit, window: window)
    }

    /// `element` must sit in `window` (not another window of the app) and inside a sheet when the window has one.
    static func ownershipRefusal(_ element: AXUIElement, window: AXUIElement) -> (reason: String, extra: [String: Any])? {
        let chain = ancestry(element)
        guard let windowIndex = chain.firstIndex(where: { role($0) == "AXWindow" }), CFEqual(chain[windowIndex], window) else {
            return ("anotherWindowIsOnTopAtThePressPoint", ["descentPath": chain.compactMap(role)])
        }
        let sheets = children(window).filter { role($0) == "AXSheet" }
        if !sheets.isEmpty, !chain.prefix(windowIndex).contains(where: { node in sheets.contains { CFEqual($0, node) } }) {
            return ("sheet_or_modal_on_target_window", ["descentPath": chain.compactMap(role)])
        }
        return nil
    }
}

extension AXLadder {
    /// The selectable element a click at `screenPt` means (the hit or one of four parents with an actionable role and
    /// an AXSelected value, e.g. a Finder list AXRow), for reading the click back. Nil when there is none.
    static func selectable(pid: pid_t, screenPt: CGPoint) -> AXUIElement? {
        var found: AXUIElement?
        guard AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(pid), Float(screenPt.x), Float(screenPt.y), &found) == .success,
              let hit = found else { return nil }
        return ancestry(hit, limit: climbLevels + 1).first { node in
            (role(node).map(noPressFallbackRoles.contains) ?? false) && selected(node) != nil
        }
    }

    static func selected(_ element: AXUIElement) -> Bool? {
        (value(element, kAXSelectedAttribute) as? NSNumber)?.boolValue
    }
}

/// The elements behind the last summary of each window, so element_index means what the model saw. Guarded: N-API
/// work runs on several libuv threads.
public enum SummaryCache {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var byWindow: [UInt32: (pid: pid_t, elements: [AXUIElement])] = [:]

    static func store(windowId: UInt32, pid: pid_t, elements: [AXUIElement]) {
        lock.lock(); defer { lock.unlock() }
        byWindow[windowId] = (pid, elements)
    }
    static func element(windowId: UInt32, pid: pid_t, index: Int) -> AXUIElement? {
        lock.lock(); defer { lock.unlock() }
        guard let entry = byWindow[windowId], entry.pid == pid, entry.elements.indices.contains(index) else { return nil }
        return entry.elements[index]
    }
}

extension AXLadder {
    /// Whether an ancestor of `element` (inclusive) is an AXWebArea: rows of a web page are pressed, not selected.
    static func inWebArea(_ element: AXUIElement) -> Bool {
        ancestry(element, limit: 64).contains { role($0) == "AXWebArea" }
    }

    static func settable(_ element: AXUIElement, _ name: String) -> Bool {
        var settable: DarwinBoolean = false
        return AXUIElementIsAttributeSettable(element, name as CFString, &settable) == .success && settable.boolValue
    }

    /// The parents of `element` (not itself), up to the window and never across a web page's root.
    static func parents(_ element: AXUIElement, limit: Int) -> [AXUIElement] {
        Array(ancestry(element, limit: limit + 1).dropFirst()
            .prefix { node in !(role(node).map { climbStops.contains($0) || $0 == "AXWebArea" } ?? false) })
    }

    /// The row a text field (or text) sits in: the first parent within four levels with a row role and an AXSelected
    /// value (official "row of the text"). Nil when there is none.
    static func rowAncestor(_ element: AXUIElement) -> AXUIElement? {
        parents(element, limit: climbLevels).first { node in
            (role(node).map(rowRoles.contains) ?? false) && selected(node) != nil
        }
    }

    /// What a click with nothing to press selects: `element` or the nearest parent up to its window that has a row
    /// role with an AXSelected value, or whose AXSelected is settable (an icon-view item). Official "(ascended)".
    static func selectableAncestor(_ element: AXUIElement) -> AXUIElement? {
        ([element] + parents(element, limit: 16)).first { node in
            ((role(node).map(rowRoles.contains) ?? false) && selected(node) != nil) || settable(node, kAXSelectedAttribute)
        }
    }

    /// The official row step: a double click on an element that offers AXOpen performs it; otherwise (a single click,
    /// or nothing to open) `set AXSelected=true`, read back. Refused when AXSelected is not settable or the write
    /// errors (select_refused); written but not read back → ineffective selection_not_confirmed. Nothing else is sent.
    static func selectOrOpen(_ element: AXUIElement, count: Int, suffix: String, request: Request, dryRun: Bool, describe: [String: Any]) -> [String: Any] {
        var result = describe
        result["selectedRole"] = role(element) ?? NSNull()
        result["selectedTitle"] = title(element) ?? NSNull()
        if let rect = frame(element) { result["pressedLocalFrame"] = framePx(rect, origin: request.bounds.origin, scale: 1) }
        if (value(element, kAXEnabledAttribute) as? NSNumber)?.boolValue == false { return unsupported("element_disabled", result) }
        let op = selectOperation(count: count, actions: actions(element))
        if op == .open {
            result["axOp"] = "AXOpen" + suffix
            if dryRun { result["outcome"] = "dryRun"; return result }
            let error = AXUIElementPerformAction(element, "AXOpen" as CFString)
            guard error == .success else {
                result["outcome"] = "ineffective"
                result["reasonCode"] = "ax_press_failed"
                result["axError"] = axErrorName(error)
                return result
            }
            result["outcome"] = "ok"
            result["reasonCode"] = NSNull()
            return result
        }
        // A double click on something that cannot be opened through Accessibility only selects it (official): say so.
        if count >= 2 { result["openUnavailable"] = true }
        result["axOp"] = "set AXSelected=true" + suffix
        guard settable(element, kAXSelectedAttribute) else { return unsupported("select_refused", result) }
        if dryRun { result["outcome"] = "dryRun"; return result }
        let error = AXUIElementSetAttributeValue(element, kAXSelectedAttribute as CFString, kCFBooleanTrue)
        guard error == .success else {
            result["axError"] = axErrorName(error)
            return unsupported("select_refused", result)
        }
        for _ in 0..<selectPolls where selected(element) != true { usleep(selectPollMicros) }
        guard selected(element) == true else {
            result["outcome"] = "ineffective"
            result["reasonCode"] = "selection_not_confirmed"
            return result
        }
        result["outcome"] = "ok"
        result["reasonCode"] = NSNull()
        result["selected"] = true
        return result
    }

    public enum SelectOperation: String { case open, select }

    /// Official: AXOpen for a double (or triple) click when the element offers it, else selection.
    public static func selectOperation(count: Int, actions: [String]) -> SelectOperation {
        count >= 2 && actions.contains("AXOpen") ? .open : .select
    }

    /// The decision before the press climb, as pure data (tests): which step a left click on `role` takes.
    public enum LeftClickStep: String { case row, rowOfText, text, press }
    public static func leftClickStep(role: String, count: Int, inWebPage: Bool, hasPress: Bool, hasRowAncestor: Bool) -> LeftClickStep {
        if rowRoles.contains(role), !(inWebPage && hasPress) { return .row }
        if textFieldRoles.contains(role), hasRowAncestor, !inWebPage { return .rowOfText }
        if count >= 2, !(hasRowAncestor && !inWebPage), textSelectRoles.contains(role) { return .text }
        return .press
    }
}
