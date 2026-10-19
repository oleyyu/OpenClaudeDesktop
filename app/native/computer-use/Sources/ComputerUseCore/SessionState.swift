import Foundation
import CoreGraphics
import ApplicationServices

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
