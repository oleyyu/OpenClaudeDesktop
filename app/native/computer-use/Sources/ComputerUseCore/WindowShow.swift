import Foundation
import AppKit
import ApplicationServices
import CoreGraphics

/// app_bring_to_current_space's first half (official 2.42304.0 §1.6.3, computer_use.node
/// showWindowBehindTheFrontWindow): a minimized window (AXMinimized = false) or a hidden app (unhide) comes back
/// without the app being activated, and the window the user is working in is kept on top of it (AXRaise on that
/// window of the frontmost app). The answer is one of the official result codes:
///   shown_behind_the_front_window   back, below the user's window
///   shown_above_the_front_window    back, but the user's window could not be put back on top of it
///   shown_with_no_front_window      back; the frontmost app had no window on screen to keep on top
///   shown_and_now_in_front          back, and the app came to the front with it (the user's app is asked back)
///   still_parked                    did not come back in time
///   user_is_in_the_app              the target app is frontmost: the window would take the keyboard from the user
///   front_window_cannot_be_raised   the user's window could not be put back on top (no AXRaise, or the keyboard is in
///                                   another of its windows, a panel or a dialog): nothing changed
///   unavailable                     Accessibility is off, or the window has no AX element: nothing changed
public enum WindowShow {
    static let showPolls = 40, showPollMicros: useconds_t = 50_000
    static let orderPolls = 10, orderPollMicros: useconds_t = 50_000

    /// The user's front window: the frontmost app's topmost on-screen window of the normal layer.
    struct FrontWindow { let pid: pid_t; let windowId: UInt32; let element: AXUIElement? }

    /// On-screen layer-0 window ids, front to back.
    static func onScreenOrder() -> [UInt32] {
        guard let raw = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
        return raw.compactMap { entry in
            guard (entry[kCGWindowLayer as String] as? NSNumber)?.intValue == 0,
                  let id = (entry[kCGWindowNumber as String] as? NSNumber)?.uint32Value else { return nil }
            var bounds = CGRect.zero
            if let dict = entry[kCGWindowBounds as String] as? NSDictionary { CGRectMakeWithDictionaryRepresentation(dict as CFDictionary, &bounds) }
            let alpha = (entry[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1
            return bounds.width >= 1 && bounds.height >= 1 && alpha > 0 ? id : nil
        }
    }

    static func ownerPid(_ windowId: UInt32) -> pid_t? { Spaces.owner(windowId: windowId)?.pid }

    /// Pure: is `target` above `front` in a front-to-back order? nil when either is not in it.
    public static func isAbove(_ target: UInt32, _ front: UInt32, in order: [UInt32]) -> Bool? {
        guard let t = order.firstIndex(of: target), let f = order.firstIndex(of: front) else { return nil }
        return t < f
    }

    /// Pure: may the user's front window be put back on top? Its AX window must offer AXRaise, and the app's keyboard
    /// focus must be in that window (raising it would otherwise take the keyboard out of a panel or dialog).
    public static func canKeepOnTop(frontWindowId: UInt32, frontHasRaise: Bool, focusedWindowId: UInt32?, focusedSubrole: String?) -> Bool {
        guard frontHasRaise else { return false }
        if let focusedWindowId, focusedWindowId != frontWindowId { return false }
        if let focusedSubrole, ["AXDialog", "AXSystemDialog", "AXFloatingWindow", "AXSystemFloatingWindow"].contains(focusedSubrole) { return false }
        return true
    }

    static func axWindowId(_ element: AXUIElement) -> UInt32? {
        var id: UInt32 = 0
        return _AXUIElementGetWindow(element, &id) == .success && id != 0 ? id : nil
    }

    static func frontWindow(of app: NSRunningApplication) -> FrontWindow? {
        let pid = app.processIdentifier
        let order = onScreenOrder()
        guard let id = order.first(where: { ownerPid($0) == pid }) else { return nil }
        return FrontWindow(pid: pid, windowId: id, element: AXLadder.windowElement(pid: pid, windowId: id))
    }

    /// The frontmost app, read fresh: Accessibility's focused application, else NSWorkspace (whose cached answer is only
    /// refreshed by a main run loop, which the N-API worker thread and a plain node process don't run).
    static func frontmostPid() -> pid_t? {
        if let app = AXLadder.element(AXUIElementCreateSystemWide(), kAXFocusedApplicationAttribute), let pid = AXLadder.pid(app) { return pid }
        return NSWorkspace.shared.frontmostApplication?.processIdentifier
    }
    /// Whether the app is hidden now (a fresh NSRunningApplication: a kept one is refreshed only by a main run loop).
    static func isHidden(_ pid: pid_t) -> Bool { NSRunningApplication(processIdentifier: pid)?.isHidden ?? false }

    static func minimized(_ element: AXUIElement) -> Bool? { (AXLadder.value(element, kAXMinimizedAttribute) as? NSNumber)?.boolValue }

    public static func showBehindTheFrontWindow(pid: pid_t, windowId: UInt32) -> String {
        _ = AXLadder.setUp
        guard AXIsProcessTrusted(), let app = NSRunningApplication(processIdentifier: pid) else { return "unavailable" }
        let previous = frontmostPid().flatMap { NSRunningApplication(processIdentifier: $0) }
        if previous?.processIdentifier == pid { return "user_is_in_the_app" }
        // The window to keep on top, checked before anything changes (official: "so nothing was changed").
        let front = previous.flatMap(frontWindow(of:))
        if let front {
            let appElement = AXUIElementCreateApplication(front.pid)
            let focused = AXLadder.element(appElement, kAXFocusedWindowAttribute)
            guard let element = front.element,
                  canKeepOnTop(frontWindowId: front.windowId, frontHasRaise: AXLadder.actions(element).contains(kAXRaiseAction as String),
                               focusedWindowId: focused.flatMap(axWindowId), focusedSubrole: focused.flatMap { AXLadder.string($0, kAXSubroleAttribute) })
            else { return "front_window_cannot_be_raised" }
        }
        let wasHidden = isHidden(pid)
        // Hidden comes first: unhiding brings every window of the app back (official), a minimized one stays minimized.
        if wasHidden { _ = app.unhide() }
        var element = AXLadder.windowElement(pid: pid, windowId: windowId)
        if !wasHidden, element == nil { return "unavailable" }
        if element == nil {
            for _ in 0..<showPolls where element == nil { usleep(showPollMicros); element = AXLadder.windowElement(pid: pid, windowId: windowId) }
        }
        if let element, minimized(element) == true {
            guard AXUIElementSetAttributeValue(element, kAXMinimizedAttribute as CFString, kCFBooleanFalse) == .success else {
                return wasHidden ? "still_parked" : "unavailable"
            }
        }
        // Back when it is on screen and AX no longer says minimized.
        var back = false
        for _ in 0..<showPolls {
            usleep(showPollMicros)
            if let element, minimized(element) == true { continue }
            if !isHidden(pid), onScreenOrder().contains(windowId) { back = true; break }
        }
        guard back else { return "still_parked" }
        // The user's window back on top.
        guard let front else {
            return frontmostPid() == pid ? putBack(previous, "shown_and_now_in_front") : "shown_with_no_front_window"
        }
        var above = true
        for attempt in 0..<orderPolls {
            if isAbove(windowId, front.windowId, in: onScreenOrder()) != true { above = false; break }
            if attempt % 3 == 0, let raise = front.element { _ = AXUIElementPerformAction(raise, kAXRaiseAction as CFString) }
            usleep(orderPollMicros)
        }
        if frontmostPid() == pid { return putBack(previous, "shown_and_now_in_front") }
        return above ? "shown_above_the_front_window" : "shown_behind_the_front_window"
    }

    /// The app came to the front with its window: ask the app the user was in to come back (official: "normally put
    /// back within 3 seconds"). The answer stays shown_and_now_in_front either way: the user has to be told.
    static func putBack(_ previous: NSRunningApplication?, _ code: String) -> String {
        if let previous, !previous.isTerminated { _ = previous.activate(options: []) }
        return code
    }
}
