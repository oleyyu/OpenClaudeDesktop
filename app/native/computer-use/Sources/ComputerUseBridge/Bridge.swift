import Foundation
import ComputerUseCore

/// The C entry the N-API glue calls on a libuv worker thread: `cu_call(method, paramsJson)` returns a strdup'd JSON
/// string, always `{"ok": true, "result": …}` or `{"ok": false, "error": {"code", "message"}}`. The caller owns it and
/// must release it with `cu_free` (one strdup per call, one free per call: no leak per screenshot).
///
/// Methods (camelCase, docs/03 naming):
///   probe                                    → session gates + capabilities
///   listWindows   {bundleId}                 → {windows: [WindowInfo]}
///   captureWindow {bundleId, windowId?, scale?}
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
        let windowId = params.uint32("windowId"), scale = try scale(params)
        return try blockingAwait { try await Capture.window(bundleId: bundleId, windowId: windowId, scale: scale) }
    case "captureScreen":
        guard let allowed = params.strings("allowedBundleIds") else { throw CUError.invalidParams("allowedBundleIds must be an array of strings") }
        if params.raw["displayId"] != nil, params.uint32("displayId") == nil { throw CUError.invalidParams("displayId must be a display id") }
        let displayId = params.uint32("displayId"), scale = try scale(params)
        return try blockingAwait { try await Capture.screen(displayId: displayId, allowedBundleIds: allowed, scale: scale) }
    default:
        throw CUError("unknown_method", "Unknown method \(method).")
    }
}
