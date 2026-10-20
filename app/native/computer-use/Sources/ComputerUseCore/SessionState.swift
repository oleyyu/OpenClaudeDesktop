import Foundation
import CoreGraphics
import ApplicationServices
import AppKit

/// The three runtime gates outside grants (docs/02 §权限之外的三道运行时闸门). Shared by the in-process module and
/// the helper so both refuse on the same facts.
public enum SessionState {
    static func session() -> [String: Any] {
        (CGSessionCopyCurrentDictionary() as? [String: Any]) ?? [:]
    }

    /// kCGSSessionSecureInputPID ≠ 0: some process holds secure input (a password field).
    public static var secureInputPid: Int32 {
        (session()["kCGSSessionSecureInputPID"] as? NSNumber)?.int32Value ?? 0
    }

    /// Screenshots stay available while locked; actions are refused (docs/02).
    public static var screenLocked: Bool {
        (session()["CGSSessionScreenIsLocked"] as? NSNumber)?.boolValue ?? false
    }

    /// Seconds since the user's last input event of any kind.
    public static var secondsSinceUserInput: Double {
        CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: CGEventType(rawValue: ~0)!)
    }

    /// user_actively_typing: any input event of the user's this recent (kCGAnyInputEventType, combined session state).
    public static let typingWindow: Double = 0.2

    /// The raw-input gates (M3), in this order, read here at the moment of delivery — a main-process view of the same
    /// facts is one IPC round trip old:
    ///   1. secure input held by any process       → secure_input_active  (refused outright)
    ///   2. user input within the last 200 ms      → user_actively_typing (the main process backs off 3 × 200 ms)
    ///   3. target "focused": the frontmost app's pid must belong to a granted app → else foreign_pid
    ///   4. screen locked                          → screen_locked        (actions refused; screenshots stay available)
    public static func rawInputRefusal(focused: Bool, grantedBundleIds: Set<String>) -> String? {
        if secureInputPid != 0 { return "secure_input_active" }
        if secondsSinceUserInput < typingWindow { return "user_actively_typing" }
        if focused {
            guard let front = NSWorkspace.shared.frontmostApplication, let bundleId = front.bundleIdentifier,
                  grantedBundleIds.contains(bundleId) else { return "foreign_pid" }
        }
        if screenLocked { return "screen_locked" }
        return nil
    }

    /// The gates an AX write (AXValue / AXSelectedText) shares with raw input: a password field anywhere, a locked
    /// screen. User typing does not misdirect an AX write, so it is not a gate here.
    public static func axInputRefusal() -> String? {
        if secureInputPid != 0 { return "secure_input_active" }
        if screenLocked { return "screen_locked" }
        return nil
    }

    /// Whether `pid` is the frontmost app (keyboard events posted to a background app may be dropped; docs/05).
    public static func isFrontmost(_ pid: pid_t) -> Bool {
        NSWorkspace.shared.frontmostApplication?.processIdentifier == pid
    }

    public static var json: [String: Any] {
        [
            "axTrusted": AXIsProcessTrusted(),
            "screenCapture": CGPreflightScreenCaptureAccess(),
            "screenLocked": screenLocked,
            "secureInput": secureInputPid != 0,
            "secondsSinceUserInput": secondsSinceUserInput,
        ]
    }
}
