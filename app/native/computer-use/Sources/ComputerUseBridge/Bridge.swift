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
///   rawClick      {bundleId, windowId, winLocalPt {x,y}, screenPt {x,y}, count?, button?, focused?, grantedBundleIds}
///                 the raw rung, only after the main process's reason policy allowed the fallback (RawInput.swift)
///   axType        {bundleId, windowId, text, mode?, winLocalPt? | elementIndex? (+expectRole) | focused?}
///   rawType       axType's params + {grantedBundleIds, axReason}: the raw text rung, after a policy fallback
///   rawKey        {bundleId, windowId?, combo, repeat?, grantedBundleIds}   (TextInput.swift)
///   textChunks    {text} → {chunks: [[UTF-16 unit]]}: the raw rung's chunking (tests)
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
        return SessionState.json.merging(EventFactory.probe) { a, _ in a }
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
    case "rawClick":
        return try rawClick(params)
    case "axType":
        return try TextInput.axType(try typeRequest(params))
    case "rawType":
        return try TextInput.rawType(try typeRequest(params, raw: true))
    case "textChunks":
        // Tests: the raw rung's chunking of `text`, as UTF-16 unit arrays.
        guard let text = params.string("text") else { throw CUError.invalidParams("text is required") }
        return ["chunks": TextInput.chunks(text).map { $0.map(Int.init) }, "maxChunkUnits": TextInput.maxChunkUnits]
    case "rawKey":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
        guard let combo = params.string("combo"), !combo.isEmpty else { throw CUError.invalidParams("combo is required") }
        let times = params.raw["repeat"] == nil ? 1 : Int(params.double("repeat") ?? 0)
        guard (1...100).contains(times), params.raw["repeat"] == nil || params.double("repeat") == Double(times) else {
            throw CUError.invalidParams("repeat must be an integer 1–100")
        }
        guard let granted = params.strings("grantedBundleIds"), granted.contains(bundleId) else {
            throw CUError.invalidParams("grantedBundleIds must list the target app")
        }
        return try TextInput.rawKey(bundleId: bundleId, windowId: params.uint32("windowId"), combo: combo, repeat: times,
                                    grantedBundleIds: Set(granted))
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

func point(_ params: Params, _ key: String) throws -> CGPoint {
    guard let raw = params.raw[key] as? [String: Any], case let p = Params(raw), let x = p.double("x"), let y = p.double("y") else {
        throw CUError.invalidParams("\(key) must be {x, y}")
    }
    return CGPoint(x: x, y: y)
}

/// One coordinate click on the raw rung. Gates and ownership are re-checked inside RawInput.click.
func rawClick(_ params: Params) throws -> [String: Any] {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    guard let windowId = params.uint32("windowId") else { throw CUError.invalidParams("windowId is required") }
    guard let granted = params.strings("grantedBundleIds"), granted.contains(bundleId) else {
        throw CUError.invalidParams("grantedBundleIds must list the target app")
    }
    // The raw rung is only ever a single left click (service.cjs gives a right, double or triple click none).
    guard params.raw["count"] == nil || params.double("count") == 1 else { throw CUError.invalidParams("the raw click is a single click") }
    let count = 1
    let button = params.string("button") ?? "left"
    guard button == "left" else { throw CUError.invalidParams("the raw click is left-button only") }
    return try RawInput.click(.init(bundleId: bundleId, windowId: windowId, winLocalPt: try point(params, "winLocalPt"),
                                    screenPt: try point(params, "screenPt"), count: count, button: button,
                                    focused: params.raw["focused"] as? Bool ?? false, grantedBundleIds: Set(granted)))
}

/// axType / rawType params. Exactly one address; text non-empty; mode insert (default) or replace.
func typeRequest(_ params: Params, raw: Bool = false) throws -> TextInput.Request {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    guard let windowId = params.uint32("windowId") else { throw CUError.invalidParams("windowId is required") }
    guard let text = params.string("text"), !text.isEmpty else { throw CUError.invalidParams("text must be a non-empty string") }
    let mode = params.string("mode") ?? "insert"
    guard mode == "insert" || mode == "replace" else { throw CUError.invalidParams("mode must be insert or replace") }
    let index = params.double("elementIndex").flatMap { $0 >= 0 && $0 == $0.rounded() ? Int($0) : nil }
    if params.raw["elementIndex"] != nil, index == nil { throw CUError.invalidParams("elementIndex must be a non-negative integer") }
    let focused = params.raw["focused"] as? Bool ?? false
    let local = params.raw["winLocalPt"] != nil ? try point(params, "winLocalPt") : nil
    guard [local != nil, index != nil, focused].filter({ $0 }).count == 1 else {
        throw CUError.invalidParams("exactly one of winLocalPt, elementIndex, focused")
    }
    let address: TextInput.Address = focused ? .focused : index.map { .index($0, expectRole: params.string("expectRole")) } ?? .point(local!)
    var granted: Set<String> = []
    if raw {
        guard let list = params.strings("grantedBundleIds"), list.contains(bundleId) else {
            throw CUError.invalidParams("grantedBundleIds must list the target app")
        }
        granted = Set(list)
    }
    return TextInput.Request(bundleId: bundleId, windowId: windowId, text: text, replace: mode == "replace", address: address,
                             grantedBundleIds: granted, axReason: params.string("axReason"))
}
