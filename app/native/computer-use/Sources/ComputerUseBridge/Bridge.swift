import Foundation
import CoreGraphics
import ComputerUseCore

/// The C entry the N-API glue calls on a libuv worker thread: `cu_call(method, paramsJson)` returns a strdup'd JSON
/// string, always `{"ok": true, "result": …}` or `{"ok": false, "error": {"code", "message"}}`. The caller owns it and
/// must release it with `cu_free` (one strdup per call, one free per call: no leak per screenshot).
///
/// Methods (camelCase, docs/03 naming):
///   probe                                    → session gates + capabilities
///   listWindows   {bundleId}                 → {windows: [WindowInfo]}
///   captureWindow {bundleId, windowId?, scale?, listsElements?}   (+ elements: AX summary in frame px)
///   axClick       {bundleId, windowId, winLocalPt? {x,y} | elementIndex? | focused?, count?, button?, dryRun?}
///   captureScreen {displayId?, allowedBundleIds, scale?}
@_cdecl("cu_call")
public func cuCall(_ method: UnsafePointer<CChar>, _ params: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar> {
    let envelope: [String: Any]
    do {
        envelope = ["ok": true, "result": try dispatch(String(cString: method), try decode(String(cString: params)))]
    } catch let error as CUError {
        envelope = ["ok": false, "error": ["code": error.code, "message": error.message]]
    } catch {
        envelope = ["ok": false, "error": ["code": "internal", "message": "\(error)"]]
    }
    let data = (try? JSONSerialization.data(withJSONObject: envelope, options: [.withoutEscapingSlashes]))
        ?? Data(#"{"ok":false,"error":{"code":"internal","message":"unserializable result"}}"#.utf8)
    return strdup(String(decoding: data, as: UTF8.self))!
}

@_cdecl("cu_free")
public func cuFree(_ pointer: UnsafeMutablePointer<CChar>?) {
    free(pointer)
}

func decode(_ json: String) throws -> Params {
    guard let object = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else {
        throw CUError.invalidParams("params must be a JSON object")
    }
    return Params(object)
}

func scale(_ params: Params) throws -> Double {
    guard params.raw["scale"] != nil else { return 1 }
    guard let value = params.double("scale"), value >= 0.1, value <= 1 else {
        throw CUError.invalidParams("scale must be a number in [0.1, 1]")
    }
    return value
}

func dispatch(_ method: String, _ params: Params) throws -> Any {
    switch method {
    case "probe":
        return SessionState.json
    case "listWindows":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        return ["windows": WindowList.windows(bundleId: bundleId).map(\.json)]
    case "captureWindow":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
        let windowId = params.uint32("windowId"), scale = try scale(params), lists = params.raw["listsElements"] as? Bool ?? false
        return try blockingAwait { try await Capture.window(bundleId: bundleId, windowId: windowId, scale: scale, listsElements: lists) }
    case "axClick":
        return try axClick(params)
    case "captureScreen":
        guard let allowed = params.strings("allowedBundleIds") else { throw CUError.invalidParams("allowedBundleIds must be an array of strings") }
        if params.raw["displayId"] != nil, params.uint32("displayId") == nil { throw CUError.invalidParams("displayId must be a display id") }
        let displayId = params.uint32("displayId"), scale = try scale(params)
        return try blockingAwait { try await Capture.screen(displayId: displayId, allowedBundleIds: allowed, scale: scale) }
    default:
        throw CUError("unknown_method", "Unknown method \(method).")
    }
}

/// One AX click. Window state refusals first (docs/04 reason codes), then the AX ladder; the session gates are
/// re-checked here so a stale main-process view cannot slip an action through.
func axClick(_ params: Params) throws -> [String: Any] {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    guard let windowId = params.uint32("windowId") else { throw CUError.invalidParams("windowId is required") }
    var local: CGPoint?
    if let point = params.raw["winLocalPt"] as? [String: Any] {
        let p = Params(point)
        guard let x = p.double("x"), let y = p.double("y") else { throw CUError.invalidParams("winLocalPt must be {x, y}") }
        local = CGPoint(x: x, y: y)
    }
    let index = params.double("elementIndex").flatMap { $0 >= 0 && $0 == $0.rounded() ? Int($0) : nil }
    if params.raw["elementIndex"] != nil, index == nil { throw CUError.invalidParams("elementIndex must be a non-negative integer") }
    let focused = params.raw["focused"] as? Bool ?? false
    guard [local != nil, index != nil, focused].filter({ $0 }).count == 1 else {
        throw CUError.invalidParams("exactly one of winLocalPt, elementIndex, focused")
    }
    let count = Int(params.double("count") ?? 1)
    guard (1...3).contains(count) else { throw CUError.invalidParams("count must be 1, 2 or 3") }
    let button = params.string("button") ?? "left"
    guard ["left", "right"].contains(button) else { throw CUError.invalidParams("button must be left or right") }

    if SessionState.screenLocked { return ["outcome": "unsupported", "reasonCode": "screen_locked"] }
    if SessionState.secureInputPid != 0 { return ["outcome": "unsupported", "reasonCode": "secure_input_active"] }
    let window = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
    if window.isHidden { return ["outcome": "unsupported", "reasonCode": "app_hidden"] }
    if window.isMinimized == true { return ["outcome": "unsupported", "reasonCode": "window_minimized"] }
    if window.isOffSpace == true { return ["outcome": "unsupported", "reasonCode": "window_off_space"] }
    if let local, !CGRect(origin: .zero, size: window.bounds.size).contains(local) {
        throw CUError.invalidParams("the point is outside the window")
    }
    return AXLadder.click(.init(pid: window.pid, windowId: window.windowId, bounds: window.bounds, winLocalPt: local,
                                elementIndex: index, focused: focused, count: count, button: button,
                                dryRun: params.raw["dryRun"] as? Bool ?? false, expectRole: params.string("expectRole")))
}
