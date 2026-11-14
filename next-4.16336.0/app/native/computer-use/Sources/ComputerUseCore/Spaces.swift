import Foundation
import ObjectiveC
import CoreGraphics

/// Space membership and app_bring_to_current_space's move (official 2.42304.0 §1.6.3). The official helper
/// (app-cu-helper) does the same through SkyLight: SLSGetActiveSpace, CGSCopySpacesForWindows, CGSSpaceGetType and
/// the bridged window-management operation SLSBridgedMoveWindowsToManagedSpaceOperation(initWithWindows:spaceID:).
/// Everything is looked up with dlsym / objc_getClass: a symbol that is missing makes the move op_unavailable (official
/// "skylight_symbols_missing"), never a crash.
///
/// Seen live 2026-10-21 (macOS 27.2): the operation moves a window of THIS process between Spaces, but a window of
/// another process stays where it is (the request is accepted and silently ignored; the legacy
/// SLSMoveWindowsToManagedSpace does the same). bringToActiveSpace reports that as op_unavailable.
public enum Spaces {
    /// CGSSpaceGetType: a user desktop, and a full-screen app's Space (a window can't be moved into one).
    public static let userSpaceType: Int32 = 0, fullscreenSpaceType: Int32 = 4
    /// CGSCopySpacesForWindows mask: current, other and every Space the window is on.
    static let allSpacesMask: Int32 = 7
    /// How long a move is given to show up in the window's Space list: polls × interval.
    static let movePolls = 30, movePollMicros: useconds_t = 50_000

    private typealias MainConnection = @convention(c) () -> Int32
    private typealias ActiveSpace = @convention(c) (Int32) -> UInt64
    private typealias SpacesForWindows = @convention(c) (Int32, Int32, CFArray) -> Unmanaged<CFArray>?
    private typealias SpaceType = @convention(c) (Int32, UInt64) -> Int32
    private typealias DisplaySpaces = @convention(c) (Int32) -> Unmanaged<CFArray>?
    private typealias LegacyMove = @convention(c) (Int32, CFArray, UInt64) -> Void
    private typealias WindowTags = @convention(c) (Int32, UInt32, UnsafeMutablePointer<UInt64>, Int32) -> Int32

    private struct API {
        let connection: Int32
        let activeSpace: ActiveSpace
        let spacesForWindows: SpacesForWindows
        let spaceType: SpaceType
        let displaySpaces: DisplaySpaces?
        let legacyMove: LegacyMove?
        let windowTags: WindowTags?
    }

    private static let api: API? = {
        guard let handle = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/Versions/A/SkyLight", RTLD_LAZY) else { return nil }
        func symbol(_ names: String...) -> UnsafeMutableRawPointer? { names.lazy.compactMap { dlsym(handle, $0) }.first }
        guard let main = symbol("SLSMainConnectionID", "CGSMainConnectionID"),
              let active = symbol("SLSGetActiveSpace", "CGSGetActiveSpace"),
              let copy = symbol("SLSCopySpacesForWindows", "CGSCopySpacesForWindows"),
              let type = symbol("SLSSpaceGetType", "CGSSpaceGetType") else { return nil }
        return API(
            connection: unsafeBitCast(main, to: MainConnection.self)(),
            activeSpace: unsafeBitCast(active, to: ActiveSpace.self),
            spacesForWindows: unsafeBitCast(copy, to: SpacesForWindows.self),
            spaceType: unsafeBitCast(type, to: SpaceType.self),
            displaySpaces: symbol("SLSCopyManagedDisplaySpaces").map { unsafeBitCast($0, to: DisplaySpaces.self) },
            legacyMove: symbol("SLSMoveWindowsToManagedSpace").map { unsafeBitCast($0, to: LegacyMove.self) },
            windowTags: symbol("SLSGetWindowTags", "CGSGetWindowTags").map { unsafeBitCast($0, to: WindowTags.self) }
        )
    }()

    public static var available: Bool { api != nil }

    /// The Space the user is on (the active display's), or nil.
    public static func activeSpace() -> UInt64? {
        guard let api else { return nil }
        let space = api.activeSpace(api.connection)
        return space == 0 ? nil : space
    }

    public static func type(of space: UInt64) -> Int32? {
        guard let api else { return nil }
        return api.spaceType(api.connection, space)
    }

    /// Every Space the window is on (a minimized window keeps its Space), or nil when SkyLight gives no answer.
    public static func spaces(of windowId: UInt32) -> [UInt64]? {
        guard let api, let list = api.spacesForWindows(api.connection, allSpacesMask, [NSNumber(value: windowId)] as CFArray)?
            .takeRetainedValue() as? [NSNumber] else { return nil }
        let spaces = list.map(\.uint64Value).filter { $0 != 0 }
        return spaces.isEmpty ? nil : spaces
    }

    /// The Space each display shows right now (one per display; the active one included), or nil.
    public static func currentSpaces() -> Set<UInt64>? {
        guard let api else { return nil }
        var current = Set<UInt64>()
        if let displaySpaces = api.displaySpaces, let displays = displaySpaces(api.connection)?.takeRetainedValue() as? [[String: Any]] {
            for display in displays {
                if let id = ((display["Current Space"] as? [String: Any])?["ManagedSpaceID"] as? NSNumber)?.uint64Value, id != 0 {
                    current.insert(id)
                }
            }
        }
        if let active = activeSpace() { current.insert(active) }
        return current.isEmpty ? nil : current
    }

    /// SLSGetWindowTags (the official helper imports it too). Seen live 2026-10-21 (macOS 27.2) on a fixture window:
    /// shown 0x100482001 (on another Space too), minimized 0x1000000100480001 — bit 60 set and bit 13 cleared when the
    /// window is out of the window list (minimized, or ordered out), bit 13 set while it is ordered in.
    public static let parkedTag: UInt64 = 1 << 60, orderedInTag: UInt64 = 1 << 13

    public static func tags(of windowId: UInt32) -> UInt64? {
        guard let api, let windowTags = api.windowTags else { return nil }
        var tags: UInt64 = 0
        return windowTags(api.connection, windowId, &tags, 64) == 0 && tags != 0 ? tags : nil
    }

    /// Pure: parked (true), ordered in (false), or neither said (nil), from a window's tags.
    public static func isParked(tags: UInt64?) -> Bool? {
        guard let tags else { return nil }
        if tags & parkedTag != 0, tags & orderedInTag == 0 { return true }
        return tags & orderedInTag != 0 ? false : nil
    }

    /// Whether a window on `windowSpaces` is off every display's current Space; nil when either side is unknown.
    public static func isOffSpace(windowSpaces: [UInt64]?, current: Set<UInt64>?) -> Bool? {
        guard let windowSpaces, !windowSpaces.isEmpty, let current, !current.isEmpty else { return nil }
        return current.isDisjoint(with: windowSpaces)
    }

    /// The dry run's verdict (official dryRun / Vn codes), pure so it can be tested.
    public enum Verdict: Equatable { case alreadyHere, movable, spaceUnclassifiable, fullscreenSpace }
    public static func verdict(windowSpaces: [UInt64]?, active: UInt64?, activeType: Int32?) -> Verdict {
        guard let active, let windowSpaces, !windowSpaces.isEmpty else { return .spaceUnclassifiable }
        if windowSpaces.contains(active) { return .alreadyHere }
        guard let activeType else { return .spaceUnclassifiable }
        if activeType == fullscreenSpaceType { return .fullscreenSpace }
        return activeType == userSpaceType ? .movable : .spaceUnclassifiable
    }

    /// The owner of a window by CGWindowID: {pid, bundleId}, or nil when the window is gone.
    public static func owner(windowId: UInt32) -> (pid: pid_t, bundleId: String?)? {
        guard let entry = (CGWindowListCopyWindowInfo([.optionIncludingWindow], CGWindowID(windowId)) as? [[String: Any]])?.first,
              (entry[kCGWindowNumber as String] as? NSNumber)?.uint32Value == windowId,
              let pid = (entry[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value else { return nil }
        return (pid, WindowList.bundleId(pid: pid))
    }

    /// app_bring_to_current_space's executor call: {moved, alreadyHere, code?} with the official codes owner_mismatch /
    /// space_unclassifiable / fullscreen_space / op_unavailable. dryRun answers without moving anything.
    public static func bringToActiveSpace(bundleId: String, windowId: UInt32, dryRun: Bool) -> [String: Any] {
        func answer(moved: Bool = false, alreadyHere: Bool = false, code: String? = nil, _ extra: [String: Any] = [:]) -> [String: Any] {
            var out: [String: Any] = ["moved": moved, "alreadyHere": alreadyHere]
            if let code { out["code"] = code }
            return out.merging(extra) { a, _ in a }
        }
        guard let owner = owner(windowId: windowId), owner.bundleId == bundleId else { return answer(code: "owner_mismatch") }
        guard available else { return answer(code: "op_unavailable", ["skylightSymbolsMissing": true]) }
        let before = spaces(of: windowId), active = activeSpace()
        switch verdict(windowSpaces: before, active: active, activeType: active.flatMap { type(of: $0) }) {
        case .alreadyHere: return answer(alreadyHere: true)
        case .spaceUnclassifiable: return answer(code: "space_unclassifiable")
        case .fullscreenSpace: return answer(code: "fullscreen_space")
        case .movable: break
        }
        if dryRun { return answer() }
        guard let active, let before, request(move: windowId, to: active) else {
            return answer(code: "op_unavailable", ["skylightSymbolsMissing": true])
        }
        var now = before
        for _ in 0..<movePolls {
            usleep(movePollMicros)
            now = spaces(of: windowId) ?? now
            if now.contains(active) { return answer(moved: true) }
        }
        // Accepted and ignored: WindowServer leaves another process's window where it was (seen live, macOS 27.2).
        if Set(now) == Set(before) { return answer(code: "op_unavailable", ["windowServerIgnored": true]) }
        return answer()
    }

    /// Asks WindowServer to move one window to a Space: the bridged operation, else the legacy call. false when neither exists.
    private static func request(move windowId: UInt32, to space: UInt64) -> Bool {
        let windows = [NSNumber(value: windowId)] as NSArray
        if let cls = objc_getClass("SLSBridgedMoveWindowsToManagedSpaceOperation") as? AnyClass,
           class_getInstanceMethod(cls, NSSelectorFromString("initWithWindows:spaceID:")) != nil,
           class_getInstanceMethod(cls, NSSelectorFromString("performWithWMBridgeDelegate")) != nil {
            // Through an @objc protocol, so Swift sends alloc / init / perform with the usual ownership rules.
            let operation = unsafeBitCast(cls, to: BridgedMoveOperation.Type.self).init(windows: windows, spaceID: space)
            operation.performWithWMBridgeDelegate()
            return true
        }
        guard let api, let legacyMove = api.legacyMove else { return false }
        legacyMove(api.connection, windows as CFArray, space)
        return true
    }
}

/// SkyLight's SLSBridgedMoveWindowsToManagedSpaceOperation, as far as this file uses it.
@objc private protocol BridgedMoveOperation {
    @objc(initWithWindows:spaceID:) init(windows: NSArray, spaceID: UInt64)
    @objc func performWithWMBridgeDelegate()
}
