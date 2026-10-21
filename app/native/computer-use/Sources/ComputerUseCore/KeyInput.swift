import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// app_key (official 2.42304.0 §1.6.1). Two rungs, decided between by the main process's reason policy:
///
///   axKey    return / escape / backspace (delete) / cmd+a acted out through Accessibility on the element at the
///            address (or one of four parents): AXConfirm, a "\n" written as AXSelectedText in a multi-line text,
///            AXCancel, the character before the caret selected and written as "" (read back), the whole text
///            selected through AXSelectedTextRange (read back). Any other key, or an element with no such action:
///            `no_ax_key_action`, which the policy lets fall to the raw rung.
///   rawKey   one keystroke posted to the app's pid (CGEventPostToPid; the app is not brought forward). It lands on
///            whatever holds keyboard focus in the app, so it is refused when that focus is in another window of the
///            app (focus_in_sibling_window), aimed by element_index (key_cannot_be_aimed), outside the background key
///            set (key_not_mapped), or cmd+a while Edit ▸ Select All is disabled in a background app
///            (menu_command_disabled). Delivery is not acceptance: the result is unverified.
///
/// The combo arrives normalized by the main process (service.cjs normalizeCombo: modifiers ctrl, alt, shift, cmd in
/// that order, then exactly one key; "del" → "delete", "esc" → "escape").
public enum KeyInput {
    /// Keys a background keystroke may carry with no modifier (official key_not_mapped list). "delete" is backspace.
    static let plainKeys: Set<String> = ["return", "enter", "escape", "backspace", "delete", "tab", "up", "down", "left", "right",
                                         "home", "end", "pageup", "pagedown", "space", "forward_delete", "forwarddelete"]
    /// Navigation keys, which also take any of shift, option and cmd.
    static let navigationKeys: Set<String> = ["tab", "up", "down", "left", "right", "home", "end", "pageup", "pagedown"]
    static let navigationModifiers: Set<String> = ["shift", "alt", "cmd"]
    static let aliases: [String: String] = ["page_up": "pageup", "page_down": "pagedown", "arrow_up": "up", "arrow_down": "down",
                                            "arrow_left": "left", "arrow_right": "right", "esc": "escape", "del": "delete",
                                            "option": "alt", "command": "cmd", "meta": "cmd", "control": "ctrl"]

    public struct Combo: Equatable {
        public let modifiers: [String]
        public let key: String
        public var normalized: String { (modifiers + [key]).joined(separator: "+") }
    }

    /// "shift+cmd+down" → (["shift", "cmd"], "down"); nil when it is not one key with known modifiers.
    public static func parse(_ combo: String) -> Combo? {
        let parts = combo.lowercased().split(separator: "+", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }.map { aliases[$0] ?? $0 }
        guard let key = parts.last, !key.isEmpty else { return nil }
        let modifiers = Array(parts.dropLast())
        guard modifiers.allSatisfy(["ctrl", "alt", "shift", "cmd", "fn"].contains), Set(modifiers).count == modifiers.count else { return nil }
        return Combo(modifiers: modifiers, key: key)
    }

    /// The combo when a background keystroke may carry it, else nil (→ key_not_mapped).
    public static func backgroundKey(_ combo: String) -> Combo? {
        guard let c = parse(combo), Dispatcher.keyCode(for: c.key) != nil else { return nil }
        if c.modifiers.isEmpty { return plainKeys.contains(c.key) ? c : nil }
        if c.modifiers == ["cmd"], c.key == "a" { return c }
        if navigationKeys.contains(c.key), c.modifiers.allSatisfy(navigationModifiers.contains) { return c }
        return nil
    }

    enum AXKind { case confirm, cancel, deleteBackward, selectAll }
    static func axKind(_ c: Combo) -> AXKind? {
        if c.modifiers.isEmpty {
            switch c.key {
            case "return", "enter": return .confirm
            case "escape": return .cancel
            case "backspace", "delete": return .deleteBackward
            default: return nil
            }
        }
        return c.modifiers == ["cmd"] && c.key == "a" ? .selectAll : nil
    }

    static func refused(_ reason: String, _ extra: [String: Any] = [:]) -> [String: Any] {
        ["outcome": "unsupported", "reasonCode": reason].merging(extra) { a, _ in a }
    }

    /// An element's label for the result line: its title or description, never its value (a document's text).
    static func label(_ element: AXUIElement) -> Any {
        (AXLadder.string(element, kAXTitleAttribute) ?? AXLadder.string(element, kAXDescriptionAttribute)).map { String($0.prefix(80)) } as Any? ?? NSNull()
    }

    static func describe(_ element: AXUIElement) -> [String: Any] {
        let chain = AXLadder.ancestry(element)
        let path = chain.prefix { AXLadder.role($0) != "AXApplication" }.compactMap(AXLadder.role).reversed()
        return ["role": AXLadder.role(element) ?? NSNull(), "subrole": AXLadder.string(element, kAXSubroleAttribute) ?? NSNull(),
                "title": label(element), "descentPath": Array(path)]
    }

    /// The element the address means, checked to belong to `window` of `pid`, or a refusal.
    static func start(_ address: TextInput.Address, pid: pid_t, window: AXUIElement, bounds: CGRect) -> Result<AXUIElement, CUError> {
        let app = AXUIElementCreateApplication(pid)
        let found: AXUIElement
        switch address {
        case .focused:
            guard let focus = AXLadder.element(app, kAXFocusedUIElementAttribute) else { return .failure(CUError("no_focused_element")) }
            found = focus
        case .index(let index, let expectRole):
            guard let windowId = windowNumber(window),
                  let cached = SummaryCache.element(windowId: windowId, pid: pid, index: index),
                  expectRole == nil || AXLadder.role(cached) == expectRole else { return .failure(CUError("listed_element_gone")) }
            found = cached
        case .point(let local):
            var hit: AXUIElement?
            let error = AXUIElementCopyElementAtPosition(app, Float(bounds.minX + local.x), Float(bounds.minY + local.y), &hit)
            guard error == .success, let hit else { return .failure(CUError("canvas", AXLadder.axErrorName(error))) }
            found = hit
        }
        guard let owner = AXLadder.pid(found) else { return .failure(CUError("ax_untrusted_cannot_verify")) }
        if owner != pid { return .failure(CUError("foreign_pid")) }
        if let refusal = AXLadder.ownershipRefusal(found, window: window) {
            // The app's own focus in another of its windows: say so, as the official reason does.
            if case .focused = address { return .failure(CUError("focus_in_sibling_window")) }
            return .failure(CUError(refusal.reason))
        }
        return .success(found)
    }

    static func windowNumber(_ window: AXUIElement) -> UInt32? {
        var id: UInt32 = 0
        return _AXUIElementGetWindow(window, &id) == .success ? id : nil
    }

    // MARK: AX rung

    public static func axKey(bundleId: String, windowId: UInt32?, address: TextInput.Address, combo: String) throws -> [String: Any] {
        if let gate = SessionState.axInputRefusal() { return refused(gate) }
        guard let parsed = parse(combo) else { return refused("key_not_mapped", ["combo": combo]) }
        let info = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state) }
        guard AXIsProcessTrusted() else { return refused("ax_untrusted_cannot_verify") }
        guard let window = AXLadder.windowElement(pid: info.pid, windowId: info.windowId) else { return refused("window_off_space") }
        let hit: AXUIElement
        switch start(address, pid: info.pid, window: window, bounds: info.bounds) {
        case .success(let element): hit = element
        case .failure(let error): return refused(error.code)
        }
        var out = describe(hit)
        out["windowId"] = Int(info.windowId)
        guard let kind = axKind(parsed) else { return refused("no_ax_key_action", out) }
        let climb = Array(AXLadder.ancestry(hit, limit: AXLadder.climbLevels + 1).prefix { !(AXLadder.role($0).map(AXLadder.climbStops.contains) ?? false) })
        let textElement = climb.first(where: TextInput.isText)
        switch kind {
        case .cancel:
            guard let target = climb.first(where: { AXLadder.actions($0).contains(kAXCancelAction as String) }) else { return refused("no_ax_key_action", out) }
            let error = AXUIElementPerformAction(target, kAXCancelAction as CFString)
            guard error == .success else { out["axError"] = AXLadder.axErrorName(error); return refused("no_ax_key_action", out) }
            return acted(out, target, "AXCancel", ["verified": false])
        case .confirm:
            if let text = textElement, AXLadder.role(text) == "AXTextArea" {
                // A multi-line text takes return as a new line: written where the caret is, read back.
                return write(text, insert: "\n", op: "set AXSelectedText=\"\\n\"", base: out)
            }
            guard let target = climb.first(where: { AXLadder.actions($0).contains(kAXConfirmAction as String) }) else { return refused("no_ax_key_action", out) }
            let error = AXUIElementPerformAction(target, kAXConfirmAction as CFString)
            guard error == .success else { out["axError"] = AXLadder.axErrorName(error); return refused("no_ax_key_action", out) }
            return acted(out, target, "AXConfirm", ["verified": false])
        case .deleteBackward:
            guard let text = textElement else { return refused("no_ax_key_action", out) }
            return write(text, insert: nil, op: "set AXSelectedText=\"\" (delete)", base: out)
        case .selectAll:
            guard let text = textElement, let value = TextInput.text(text) else { return refused("no_ax_key_action", out) }
            guard TextInput.setSelectedRange(text, CFRange(location: 0, length: value.utf16.count)) else { return refused("no_ax_key_action", out) }
            return acted(out, text, "set AXSelectedTextRange=all", ["verified": true])
        }
    }

    /// An AX result that took effect on `element` (described in place of the hit).
    static func acted(_ base: [String: Any], _ element: AXUIElement, _ op: String, _ extra: [String: Any]) -> [String: Any] {
        base.merging(describe(element)) { _, b in b }.merging(["outcome": "ok", "reasonCode": NSNull(), "axOp": op]) { _, b in b }
            .merging(extra) { _, b in b }
    }

    /// Backspace (insert nil: the composed character before the caret) or a new line, written as AXSelectedText at
    /// the caret and read back. A selection would be replaced: would_replace_content. A write the app ignores leaves
    /// the selection as it was and falls to the raw rung (no_ax_key_action, axWriteIgnored).
    static func write(_ element: AXUIElement, insert: String?, op: String, base: [String: Any]) -> [String: Any] {
        let out = base.merging(describe(element)) { _, b in b }
        guard let before = TextInput.text(element), let range = TextInput.selectedRange(element),
              TextInput.settable(element, kAXSelectedTextAttribute) else { return refused("no_ax_key_action", out) }
        if range.length > 0 { return refused("would_replace_content", out) }
        let ns = before as NSString
        let caret = min(max(range.location, 0), ns.length)
        var target = CFRange(location: caret, length: 0)
        if insert == nil {
            if caret == 0 { return acted(base, element, "read AXSelectedTextRange", ["verified": true, "nothingToDelete": true]) }
            let composed = ns.rangeOfComposedCharacterSequence(at: caret - 1)
            target = CFRange(location: composed.location, length: composed.length)
        }
        let replacement = insert ?? ""
        let expected = ns.replacingCharacters(in: NSRange(location: target.location, length: target.length), with: replacement)
        if target.length > 0, !TextInput.setSelectedRange(element, target) { return refused("no_ax_key_action", out) }
        let error = AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, replacement as CFString)
        guard error == .success else {
            TextInput.setSelectedRange(element, range)
            return refused("no_ax_key_action", out.merging(["axError": AXLadder.axErrorName(error)]) { a, _ in a })
        }
        let goal = Array(expected.utf16)
        let after = TextInput.settle(element, until: goal)
        if after == goal { return acted(base, element, op, ["verified": true]) }
        if after == Array(before.utf16) {
            TextInput.setSelectedRange(element, range)
            return refused("no_ax_key_action", out.merging(["axWriteIgnored": true]) { a, _ in a })
        }
        return out.merging(["outcome": "ineffective", "reasonCode": "text_mismatch", "verified": true, "axOp": op]) { _, b in b }
    }

    // MARK: raw rung

    public static func rawKey(bundleId: String, windowId: UInt32?, combo: String, address: TextInput.Address?,
                              grantedBundleIds: Set<String>) throws -> [String: Any] {
        if case .failure(let error) = EventFactory.source() { return refused(error.code, ["delivered": false]) }
        guard let key = backgroundKey(combo) else { return refused("key_not_mapped", ["combo": combo, "delivered": false]) }
        // The target is a background window: the frontmost app need not be granted (official). Secure input, the
        // user's own input and the lock still gate.
        if let gate = SessionState.rawInputRefusal(focused: false, grantedBundleIds: grantedBundleIds) { return refused(gate, ["delivered": false]) }
        let info = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state, ["delivered": false]) }
        if case .index = address { return refused("key_cannot_be_aimed", ["delivered": false]) }
        guard AXIsProcessTrusted() else { return refused("ax_untrusted_cannot_verify", ["delivered": false]) }
        guard let window = AXLadder.windowElement(pid: info.pid, windowId: info.windowId) else { return refused("window_off_space", ["delivered": false]) }
        let app = AXUIElementCreateApplication(info.pid)
        // The keystroke goes to the app's keyboard focus: it must be in this window.
        if let focusedWindow = AXLadder.element(app, kAXFocusedWindowAttribute), !CFEqual(focusedWindow, window) {
            return refused("focus_in_sibling_window", ["delivered": false])
        }
        var extra: [String: Any] = ["windowId": Int(info.windowId), "targetFrontmost": SessionState.isFrontmost(info.pid)]
        let focus = AXLadder.element(app, kAXFocusedUIElementAttribute)
        if let focus { extra["keyboardFocusRole"] = AXLadder.role(focus) ?? NSNull() }
        switch address {
        case .point(let local)?:
            let screen = CGPoint(x: info.bounds.minX + local.x, y: info.bounds.minY + local.y)
            if let owner = AXLadder.pointOwnerRefusal(pid: info.pid, windowId: info.windowId, screenPt: screen) {
                return refused(owner.reason, owner.extra.merging(["delivered": false]) { a, _ in a })
            }
            var hit: AXUIElement?
            if AXUIElementCopyElementAtPosition(app, Float(screen.x), Float(screen.y), &hit) == .success, let hit {
                extra.merge(describe(hit)) { a, _ in a }
            }
        default:
            if let focus { extra.merge(describe(focus)) { a, _ in a } }
        }
        if key.normalized == "cmd+a" {
            // A background native app ignores ⌘A while Edit ▸ Select All is disabled: not sent (official).
            if !SessionState.isFrontmost(info.pid), TextInput.selectAllEnabled(pid: info.pid) != true {
                return refused("menu_command_disabled", extra.merging(["delivered": false]) { a, _ in a })
            }
            extra["cmdASentAsKeystroke"] = true
        }
        let code = Dispatcher.key(pid: info.pid, keyName: key.key, modifiers: key.modifiers)
        if code != .ok { return refused(code.rawValue, extra.merging(["delivered": false]) { a, _ in a }) }
        return ["outcome": "ok", "reasonCode": NSNull(), "verified": false, "delivered": true, "axOp": NSNull(),
                "combo": key.normalized].merging(extra) { a, _ in a }
    }
}
