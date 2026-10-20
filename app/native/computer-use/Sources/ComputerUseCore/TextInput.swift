import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// app_type and app_key (M3). Two rungs for text, decided between by the main process's reason policy:
///
///   axType   the AX rung: write AXValue (or AXSelectedText) and read AXValue back. A text element whose value AX
///            cannot write is `text_not_writable` when it holds the keyboard focus, `no_focused_text` when it does not.
///   rawType  the raw rung (policy FALLBACK only): focus the element through AX first when it lacked focus, select all
///            for replace, then Unicode key events of ≤ 20 UTF-16 units (a surrogate pair is never split), 2–4 ms apart,
///            counting what was sent, and read AXValue back: delivery is not acceptance.
///   rawKey   one key combo to the app (there is no AX rung for keystrokes); key_not_mapped when it does not parse.
///
/// Readback outcomes: the expected text → ok, verified; unchanged → ineffective (text_unchanged); a prefix of the text
/// arrived → ineffective (partial_delivery) with deliveredPrefixChars; unreadable → ok, verified false.
public enum TextInput {
    static let textRoles: Set<String> = ["AXTextField", "AXTextArea", "AXComboBox", "AXSearchField"]
    public static let maxChunkUnits = 20
    /// How long a readback waits for the app to apply what it was sent.
    static let settlePolls = 10, settleIntervalUs: useconds_t = 50_000

    public enum Address {
        case focused
        case point(CGPoint)
        case index(Int, expectRole: String?)
    }

    public struct Request {
        public var bundleId: String
        public var windowId: UInt32
        public var text: String
        public var replace: Bool
        public var address: Address
        public var grantedBundleIds: Set<String>
        /// rawType only: the AX reason that led here (no_focused_text → focus first).
        public var axReason: String?
        public init(bundleId: String, windowId: UInt32, text: String, replace: Bool, address: Address,
                    grantedBundleIds: Set<String> = [], axReason: String? = nil) {
            self.bundleId = bundleId; self.windowId = windowId; self.text = text; self.replace = replace
            self.address = address; self.grantedBundleIds = grantedBundleIds; self.axReason = axReason
        }
    }

    static func refused(_ reason: String, _ extra: [String: Any] = [:]) -> [String: Any] {
        ["outcome": "unsupported", "reasonCode": reason].merging(extra) { a, _ in a }
    }

    // MARK: the element

    struct Target {
        let pid: pid_t
        let window: AXUIElement
        let element: AXUIElement
        var focused: Bool { TextInput.isFocused(element, pid: pid) }
    }

    static func isFocused(_ element: AXUIElement, pid: pid_t) -> Bool {
        guard let focus = AXLadder.element(AXUIElementCreateApplication(pid), kAXFocusedUIElementAttribute) else { return false }
        return CFEqual(focus, element)
    }

    static func isText(_ element: AXUIElement) -> Bool {
        (AXLadder.role(element).map(textRoles.contains) ?? false) || AXLadder.string(element, kAXSubroleAttribute) == "AXSearchField"
    }

    /// The text element the request means, owned by the target window, or a refusal.
    static func resolve(_ request: Request, window info: WindowInfo) -> Result<Target, CUError> {
        guard AXIsProcessTrusted() else { return .failure(CUError("ax_untrusted_cannot_verify")) }
        guard let window = AXLadder.windowElement(pid: info.pid, windowId: info.windowId) else { return .failure(CUError("window_off_space")) }
        var start: AXUIElement
        switch request.address {
        case .focused:
            guard let focus = AXLadder.element(AXUIElementCreateApplication(info.pid), kAXFocusedUIElementAttribute) else {
                return .failure(CUError("no_text_target", "The app reports no focused element."))
            }
            start = focus
        case .index(let index, let expectRole):
            guard let cached = SummaryCache.element(windowId: info.windowId, pid: info.pid, index: index),
                  expectRole == nil || AXLadder.role(cached) == expectRole else { return .failure(CUError("listed_element_gone")) }
            start = cached
        case .point(let local):
            var found: AXUIElement?
            let error = AXUIElementCopyElementAtPosition(AXUIElementCreateApplication(info.pid), Float(info.bounds.minX + local.x),
                                                         Float(info.bounds.minY + local.y), &found)
            guard error == .success, let found else { return .failure(CUError("no_text_target", AXLadder.axErrorName(error))) }
            start = found
        }
        guard let pid = AXLadder.pid(start), pid == info.pid else { return .failure(CUError("foreign_pid")) }
        // The hit itself or one of four parents (a click lands on the text inside a field's cell).
        guard let element = AXLadder.ancestry(start, limit: AXLadder.climbLevels + 1).first(where: isText) else {
            return .failure(CUError("no_text_target", "No text element at the target (\(AXLadder.role(start) ?? "?")): non-text targets are refused."))
        }
        // Passwords are never typed: a secure field is refused like secure input itself.
        if AXLadder.string(element, kAXSubroleAttribute) == "AXSecureTextField" { return .failure(CUError("secure_input_active")) }
        if (AXLadder.value(element, kAXEnabledAttribute) as? NSNumber)?.boolValue == false { return .failure(CUError("element_disabled")) }
        if let owner = AXLadder.ownershipRefusal(element, window: window) { return .failure(CUError(owner.reason)) }
        return .success(Target(pid: info.pid, window: window, element: element))
    }

    // MARK: text facts

    static func settable(_ element: AXUIElement, _ name: String) -> Bool {
        var ok: DarwinBoolean = false
        return AXUIElementIsAttributeSettable(element, name as CFString, &ok) == .success && ok.boolValue
    }

    static func text(_ element: AXUIElement) -> String? { AXLadder.value(element, kAXValueAttribute) as? String }

    static func selectedRange(_ element: AXUIElement) -> CFRange? {
        guard let ref = AXLadder.value(element, kAXSelectedTextRangeAttribute), CFGetTypeID(ref) == AXValueGetTypeID() else { return nil }
        var range = CFRange()
        return AXValueGetValue(ref as! AXValue, .cfRange, &range) ? range : nil
    }

    @discardableResult
    static func setSelectedRange(_ element: AXUIElement, _ range: CFRange) -> Bool {
        var range = range
        guard let value = AXValueCreate(.cfRange, &range) else { return false }
        return AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, value) == .success
            && selectedRange(element).map { $0.location == range.location && $0.length == range.length } == true
    }

    /// What the field should read after the write: the selection (or the end) replaced by `text`, in UTF-16 units.
    struct Expectation {
        let prefix: [UInt16], suffix: [UInt16], before: [UInt16]
        func full(_ text: [UInt16]) -> [UInt16] { prefix + text + suffix }
    }

    static func expectation(before: String, range: CFRange?) -> Expectation {
        let units = Array(before.utf16)
        let location = min(max(range?.location ?? units.count, 0), units.count)
        let end = min(location + max(range?.length ?? 0, 0), units.count)
        return Expectation(prefix: Array(units[..<location]), suffix: Array(units[end...]), before: units)
    }

    /// Readback after a write of `text`: how many leading UTF-16 units of it the field now holds where they belong.
    static func accepted(_ after: [UInt16], _ expect: Expectation, _ text: [UInt16]) -> Int? {
        guard after.count >= expect.prefix.count + expect.suffix.count,
              after.starts(with: expect.prefix), after.reversed().starts(with: expect.suffix.reversed()) else { return nil }
        let middle = after[expect.prefix.count..<(after.count - expect.suffix.count)]
        guard middle.count <= text.count, text.starts(with: middle) else { return nil }
        return middle.count
    }

    /// Polls AXValue until it reads `goal` or the settle time runs out; the last reading (nil = unreadable).
    static func settle(_ element: AXUIElement, until goal: [UInt16]) -> [UInt16]? {
        var reading = text(element).map { Array($0.utf16) }
        for _ in 0..<settlePolls where reading != goal {
            usleep(settleIntervalUs)
            reading = text(element).map { Array($0.utf16) }
        }
        return reading
    }

    static func verdict(after: [UInt16]?, expect: Expectation?, text: [UInt16], sent: Int, exited: Bool,
                        extra: [String: Any]) -> [String: Any] {
        var out = extra
        out["charsDelivered"] = sent
        out["textLength"] = text.count
        if exited {
            // The app is gone: what it accepted cannot be read; what was sent is the prefix it may have.
            return out.merging(["outcome": "ineffective", "reasonCode": "target_exited", "deliveredPrefixChars": sent, "verified": false]) { _, b in b }
        }
        guard let after, let expect else {
            if sent == text.count { return out.merging(["outcome": "ok", "reasonCode": NSNull(), "verified": false]) { _, b in b } }
            return out.merging(["outcome": "ineffective", "reasonCode": "partial_delivery", "deliveredPrefixChars": sent, "verified": false]) { _, b in b }
        }
        if after == expect.full(text) { return out.merging(["outcome": "ok", "reasonCode": NSNull(), "verified": true, "deliveredPrefixChars": text.count]) { _, b in b } }
        if after == expect.before { return out.merging(["outcome": "ineffective", "reasonCode": "text_unchanged", "verified": true, "deliveredPrefixChars": 0]) { _, b in b } }
        if let k = accepted(after, expect, text) {
            return out.merging(["outcome": "ineffective", "reasonCode": "partial_delivery", "verified": true, "deliveredPrefixChars": k]) { _, b in b }
        }
        return out.merging(["outcome": "ineffective", "reasonCode": "text_mismatch", "verified": true, "readbackLength": after.count]) { _, b in b }
    }

    // MARK: AX rung

    public static func axType(_ request: Request) throws -> [String: Any] {
        if let gate = SessionState.axInputRefusal() { return refused(gate) }
        let info = try WindowList.resolve(bundleId: request.bundleId, windowId: request.windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state) }
        let target: Target
        switch resolve(request, window: info) {
        case .success(let t): target = t
        case .failure(let error): return refused(error.code)
        }
        let element = target.element
        let units = Array(request.text.utf16)
        let describe: [String: Any] = ["role": AXLadder.role(element) ?? NSNull(), "focused": target.focused]
        guard settable(element, kAXValueAttribute) || settable(element, kAXSelectedTextAttribute) else {
            // Raw keystrokes go to the focused element: typing is only safe once this element holds the focus.
            return refused(target.focused ? "text_not_writable" : "no_focused_text", describe)
        }
        guard let before = text(element) else { return refused("text_not_writable", describe.merging(["valueUnreadable": true]) { a, _ in a }) }
        var range = selectedRange(element)
        var extra = describe
        if request.replace {
            let all = CFRange(location: 0, length: before.utf16.count)
            extra["selectAll"] = setSelectedRange(element, all) ? "ax" : "value"
            range = all
        }
        let expect = expectation(before: before, range: range)
        let goal = expect.full(units)
        // AXValue first (whole value, works without focus); AXSelectedText where only that is writable.
        let error: AXError
        if settable(element, kAXValueAttribute) {
            extra["axOp"] = "AXValue"
            error = AXUIElementSetAttributeValue(element, kAXValueAttribute as CFString, String(decoding: goal, as: UTF16.self) as CFString)
            if error == .success { setSelectedRange(element, CFRange(location: expect.prefix.count + units.count, length: 0)) }
        } else {
            extra["axOp"] = "AXSelectedText"
            if let range, !setSelectedRange(element, range) { return refused("text_not_writable", extra) }
            error = AXUIElementSetAttributeValue(element, kAXSelectedTextAttribute as CFString, request.text as CFString)
        }
        guard error == .success else { return refused(target.focused ? "text_not_writable" : "no_focused_text", extra.merging(["axError": AXLadder.axErrorName(error)]) { a, _ in a }) }
        let after = settle(element, until: goal)
        // Accepted by AX, ignored by the app (the value reads as before): the control does not take AX writes — the
        // same as not writable, so the raw rung may try typing (when policy allows).
        if after.map(Array.init) == expect.before, !units.isEmpty {
            extra["axWriteIgnored"] = true
            return ["outcome": "ineffective", "reasonCode": target.focused ? "text_not_writable" : "no_focused_text", "verified": true,
                    "deliveredPrefixChars": 0].merging(extra) { a, _ in a }
        }
        return verdict(after: after, expect: expect, text: units, sent: units.count, exited: false, extra: extra)
    }

    // MARK: raw rung

    /// UTF-16 chunks of at most `max` units; a chunk that would end on a lead surrogate ends one unit earlier.
    public static func chunks(_ text: String, max: Int = maxChunkUnits) -> [[UInt16]] {
        let units = Array(text.utf16)
        var out: [[UInt16]] = [], start = 0
        while start < units.count {
            var end = Swift.min(start + max, units.count)
            if end < units.count, UTF16.isLeadSurrogate(units[end - 1]), end - 1 > start { end -= 1 }
            out.append(Array(units[start..<end]))
            start = end
        }
        return out
    }

    static func processAlive(_ pid: pid_t) -> Bool {
        kill(pid, 0) == 0 || errno == EPERM
    }

    /// Edit ▸ Select All (⌘A) in the app's menu bar: true / false = its enabled state, nil = not found.
    static func selectAllEnabled(pid: pid_t) -> Bool? {
        guard let bar = AXLadder.element(AXUIElementCreateApplication(pid), kAXMenuBarAttribute) else { return nil }
        for top in AXLadder.children(bar) {
            for menu in AXLadder.children(top) {
                for item in AXLadder.children(menu) where AXLadder.string(item, "AXMenuItemCmdChar") == "A"
                    && (AXLadder.value(item, "AXMenuItemCmdModifiers") as? NSNumber)?.intValue == 0 {
                    return (AXLadder.value(item, kAXEnabledAttribute) as? NSNumber)?.boolValue ?? false
                }
            }
        }
        return nil
    }

    public static func rawType(_ request: Request) throws -> [String: Any] {
        if case .failure(let error) = EventFactory.source() { return refused(error.code) }
        let focusedMode: Bool
        if case .focused = request.address { focusedMode = true } else { focusedMode = false }
        if let gate = SessionState.rawInputRefusal(focused: focusedMode, grantedBundleIds: request.grantedBundleIds) { return refused(gate) }
        let info = try WindowList.resolve(bundleId: request.bundleId, windowId: request.windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state) }
        let target: Target
        switch resolve(request, window: info) {
        case .success(let t): target = t
        case .failure(let error): return refused(error.code)
        }
        let element = target.element
        var extra: [String: Any] = ["role": AXLadder.role(element) ?? NSNull(), "targetFrontmost": SessionState.isFrontmost(target.pid)]

        // 1. Focus: keystrokes go to the focused element, so it must be this one.
        if !target.focused {
            guard request.axReason == "no_focused_text" else { return refused("no_focused_text", extra) }
            AXUIElementSetAttributeValue(element, kAXFocusedAttribute as CFString, kCFBooleanTrue)
            for _ in 0..<6 where !target.focused { usleep(settleIntervalUs) }
            guard target.focused else { return refused("focus_refused", extra) }
            extra["focusedBy"] = "AXFocused"
        }

        // 2. Replace: select everything through AX; else the ⌘A keystroke; else write without clearing.
        let before = text(element)
        var range = selectedRange(element)
        if request.replace {
            let all = before.map { CFRange(location: 0, length: $0.utf16.count) }
            if let all, setSelectedRange(element, all) {
                extra["selectAll"] = "ax"; range = all
            } else if !SessionState.isFrontmost(target.pid) {
                extra["selectAll"] = "background_app"; extra["selectAllKeystrokeNotSent"] = true
            } else if selectAllEnabled(pid: target.pid) != true {
                extra["selectAll"] = "menu_command_disabled"; extra["selectAllKeystrokeNotSent"] = true
            } else if Dispatcher.key(pid: target.pid, keyName: "a", modifiers: ["cmd"]) == .ok {
                extra["selectAll"] = "keystroke"
                usleep(settleIntervalUs)
                range = selectedRange(element) ?? all
            } else {
                extra["selectAll"] = "keystroke_failed"; extra["selectAllKeystrokeNotSent"] = true
            }
        }
        let expect = before.map { expectation(before: $0, range: range) }

        // 3. Deliver: ≤ 20 UTF-16 units per event, 2–4 ms apart (Dispatcher.text waits 2 ms; 0–2 ms more here).
        let units = Array(request.text.utf16)
        var sent = 0, stopped: String?
        for chunk in chunks(request.text) {
            if SessionState.secureInputPid != 0 { stopped = "secure_input_active"; break }
            guard processAlive(target.pid) else { break }
            let (code, _) = Dispatcher.text(pid: target.pid, String(decoding: chunk, as: UTF16.self))
            guard code == .ok else { stopped = code.rawValue; break }
            sent += chunk.count
            usleep(useconds_t.random(in: 0...2_000))
        }
        let exited = !processAlive(target.pid)
        if let stopped { extra["stoppedBy"] = stopped }

        // 4. Read back.
        let after = exited ? nil : settle(element, until: expect?.full(units) ?? [])
        return verdict(after: after, expect: expect, text: units, sent: sent, exited: exited, extra: extra)
    }

    // MARK: keys

    static let modifierNames: Set<String> = ["cmd", "command", "meta", "shift", "option", "alt", "ctrl", "control", "fn"]

    /// "cmd+shift+a" → (["cmd", "shift"], "a"), or nil when any part is not a known modifier or key.
    public static func parseCombo(_ combo: String) -> (modifiers: [String], key: String)? {
        let parts = combo.lowercased().split(separator: "+", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        // "cmd++" means the plus key, which is not mapped: refuse it with the rest.
        guard let key = parts.last, !key.isEmpty, parts.dropLast().allSatisfy(modifierNames.contains),
              Dispatcher.keyCode(for: key) != nil else { return nil }
        return (Array(parts.dropLast()), key)
    }

    public static func rawKey(bundleId: String, windowId: UInt32?, combo: String, repeat times: Int,
                              grantedBundleIds: Set<String>) throws -> [String: Any] {
        if case .failure(let error) = EventFactory.source() { return refused(error.code) }
        guard let parsed = parseCombo(combo) else { return refused("key_not_mapped", ["combo": combo]) }
        // Keys go to whatever holds the app's focus: the focused-mode gate applies.
        if let gate = SessionState.rawInputRefusal(focused: true, grantedBundleIds: grantedBundleIds) { return refused(gate) }
        let info = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        if let state = RawInput.windowRefusal(info) { return refused(state) }
        let code = Dispatcher.key(pid: info.pid, keyName: parsed.key, modifiers: parsed.modifiers, repeat: times)
        if code != .ok { return refused(code.rawValue) }
        return ["outcome": "ok", "reasonCode": NSNull(), "verified": false, "delivered": true,
                "targetFrontmost": SessionState.isFrontmost(info.pid), "windowId": Int(info.windowId)]
    }
}
