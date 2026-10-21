import Foundation
import CoreGraphics
import ApplicationServices
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
///   captureScreen {displayId?, allowedBundleIds, scale?, region? {x,y,width,height} display-local points}
///   listDisplays  → {displays: [{displayId, bounds, pixelWidth, pixelHeight, scaleFactor, isMain, name}]}
///   frontmostApp  → {pid, bundleId}
///   pointOwner    {point {x,y}, ignoreWindowIds?} → {owner: {windowId, pid, bundleId, layer, ownerName} | null}
///   cursorPosition → {x, y} (global points)
///   hidMove / hidClick / hidScroll  display-scope input on the global HID stream (DisplayInput.swift): the real
///                 cursor moves. {point {x,y}, animate?} + hidClick {button, count, modifiers?} / hidScroll {dx, dy}
///   hidMouseDown / hidMouseUp  the left button at the real cursor, held between the two (moves meanwhile are drags)
///   hidDrag       {from? {x,y}, to {x,y}}: press, 50 ms, animated drag path, release (always released once pressed)
///   hidState      → {held, cursor}
///   rawClick      {bundleId, windowId, winLocalPt {x,y}, screenPt {x,y}, count?, button?, focused?, grantedBundleIds}
///                 the raw rung, only after the main process's reason policy allowed the fallback (RawInput.swift)
///   drag          {bundleId, windowId, points: [{winLocalPt, screenPt}], pixelScale, button?, focused?, grantedBundleIds}
///                 owns prepare/press/move/release/settle and returns before/after AX readback
///   axType        {bundleId, windowId, text, mode?, winLocalPt? | elementIndex? (+expectRole) | focused?}
///   rawType       axType's params + {grantedBundleIds, axReason}: the raw text rung, after a policy fallback
///   axKey         {bundleId, windowId?, combo, winLocalPt? | elementIndex? (+expectRole) | focused?}: app_key's AX rung
///   rawKey        {bundleId, windowId?, combo, winLocalPt? | elementIndex? | focused?, grantedBundleIds}: one keystroke
///                 to the app's keyboard focus, after a policy fallback (KeyInput.swift)
///   textChunks    {text} → {chunks: [[UTF-16 unit]]}: the raw rung's chunking (tests)
///   windowOwner   {windowId} → {owner: {pid, bundleId} | null}
///   showWindowBehindTheFrontWindow {bundleId, windowId} → {code}: a minimized window / hidden app back, behind the
///                 user's front window, the app not activated (WindowShow.swift; official result codes)
///   bringWindowToActiveSpace {bundleId, windowId, dryRun?} → {moved, alreadyHere, code?} (Spaces.swift)
///   spaceState    {windowId?} → {available, activeSpace, activeSpaceType, currentSpaces, windowSpaces?}: read-only
///   setPhantomCursor  {screenX, screenY, windowId?, pulse?} → that window's cursor panel state (PhantomCursor.swift):
///                 the tip on a global point, stacked above the window; pulse only for a click. main_thread_unavailable
///                 in a process without a Cocoa main run loop (ELECTRON_RUN_AS_NODE)
///   hidePhantomCursor {windowId?} → {hidden: [windowId]}: orderOut that window's cursor, or every cursor
///   phantomCursorState → {cursors: [panel state], primaryHeight, screens}: read-only (tests, live checks)
///   showWindowHighlight {windowId, reduceMotion?} → that window's highlight state (WindowHighlight.swift): the glow
///                 page's clay rim on the window's frame, stacked directly above it, following it; main_thread_unavailable
///                 without a Cocoa main run loop
///   hideWindowHighlight {windowId?} → {hidden: [windowId]}: fade out that window's highlight, or every highlight
///   windowHighlightState → {highlights: [panel state], primaryHeight, screens}: read-only (tests, live checks)
///   windowHighlightSnapshot {windowId} → {width, height, png}: the rim rendered off screen at 1× (live checks)
///   prepareDisplay {allowedBundleIds, hostBundleIds?, displayId?} → {hidden: [{bundleId, name}], activated}: hide the
///                 apps outside the allowlist with a window on the display (official hideBeforeAction, AppHide.swift)
///   previewHideSet {exemptBundleIds, displayId?} → {apps: [{bundleId, name}]}: what prepareDisplay would hide
///   unhideApps    {bundleIds} → {unhidden: [bundleId]}: hidden apps with these bundle ids come back
///   savePanelProbe {windowId? | bundleId?, point? {x,y}, mainWindow?} → the probe object | null (SavePanel.swift):
///                 what the window shows that the save-panel guard judges input against; read only
///   watchRecordStart / watchRecordStop / watchRecordDrain → {events, nowT, dropped} / watchRecordClear / watchRecordNowT
///                 watch-record's listen-only input recorder (WatchRecorder.swift); watchRecordFrame {displayId?} → one
///                 frame of that display without this app's windows {base64, width, height, displayId, displayWidth,
///                 displayHeight, frontmost {bundleId, appName}}
///   voiceoverAvailability / voiceoverDevices / voiceoverStart {uid?, perTurn?} / voiceoverStop / voiceoverDrain →
///                 {narrations [{t, text}], micStates [{on, level, error?}]} / voiceoverPreviewStart {uid?} /
///                 voiceoverPreviewStop: on-device narration (WatchRecordVoiceover.swift)
///   requestScreenCapture / requestAccessibility → {granted}: the Screen Recording / Accessibility prompt
///                 (watch-record's permissions dialog)
///   saveSheetFolderAndParents {pid} → {names} | {menuWasOpen: true} | null: the save sheet's folder path, read from
///                 its folder pop-up's menu (opened and cancelled)
///   axProbe       → {axTrusted}
///   focusWindow   {bundleId, windowId?} → app_focus: AXMain + AXFocused on the window, read back (MenuBar.swift
///                 AppFocus); {outcome: "unsupported", reasonCode: "app_is_frontmost"} while the app is in front
///   menu          {bundleId, mode: "press" | "list" | "close", path?: [String]} (official menu(bundleId, {mode, path})):
///                 press walks the menu bar by titles and presses the last; list reads the items under path; close
///                 cancels the app's open menus. menu_item_not_found carries details {closestMatch, available, …}
///   listApps      {folders: [String]} → {running, installed}: list_apps' source
///                 These four were the separate helpers/cu-ax process; an app that stops answering ends the call with
///                 helper_timeout after 8 s (AXQuery).
@_cdecl("cu_call")
public func cuCall(_ method: UnsafePointer<CChar>, _ params: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar> {
    let envelope: [String: Any]
    do {
        envelope = ["ok": true, "result": try dispatch(String(cString: method), try decode(String(cString: params)))]
    } catch let error as CUError {
        var body: [String: Any] = ["code": error.code, "message": error.message]
        if let details = error.details { body["details"] = details }
        envelope = ["ok": false, "error": body]
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
    case "drag":
        return try drag(params)
    case "axType":
        return try TextInput.axType(try typeRequest(params))
    case "rawType":
        return try TextInput.rawType(try typeRequest(params, raw: true))
    case "textChunks":
        // Tests: the raw rung's chunking of `text`, as UTF-16 unit arrays.
        guard let text = params.string("text") else { throw CUError.invalidParams("text is required") }
        return ["chunks": TextInput.chunks(text).map { $0.map(Int.init) }, "maxChunkUnits": TextInput.maxChunkUnits]
    case "axKey":
        let (bundleId, windowId, combo) = try keyBasics(params)
        guard let address = try keyAddress(params) else { throw CUError.invalidParams("exactly one of winLocalPt, elementIndex, focused") }
        return try KeyInput.axKey(bundleId: bundleId, windowId: windowId, address: address, combo: combo)
    case "rawKey":
        let (bundleId, windowId, combo) = try keyBasics(params)
        guard params.raw["repeat"] == nil else { throw CUError.invalidParams("one key per call: send repeated keys as separate calls") }
        guard let granted = params.strings("grantedBundleIds"), granted.contains(bundleId) else {
            throw CUError.invalidParams("grantedBundleIds must list the target app")
        }
        return try KeyInput.rawKey(bundleId: bundleId, windowId: windowId, combo: combo, address: try keyAddress(params),
                                   grantedBundleIds: Set(granted))
    case "axScroll":
        // app_scroll (official §1.6.2): vertical only; the address defaults to nothing here (the main process passes
        // the last action's point when the model gave none).
        let (bundleId, windowId) = try scrollBasics(params)
        guard params.raw["dx"] == nil || params.double("dx") == 0 else { return ["outcome": "unsupported", "reasonCode": "horizontal_scroll"] }
        guard let dy = params.double("dy"), dy.isFinite else { throw CUError.invalidParams("dy must be a finite number") }
        guard let address = try keyAddress(params) else { throw CUError.invalidParams("exactly one of winLocalPt, elementIndex, focused") }
        return try ScrollInput.axScroll(bundleId: bundleId, windowId: windowId, address: address, dy: dy)
    case "windowOwner":
        guard let windowId = params.uint32("windowId"), windowId > 0 else { throw CUError.invalidParams("windowId must be a CGWindowID") }
        guard let owner = Spaces.owner(windowId: windowId) else { return ["owner": NSNull()] }
        return ["owner": ["pid": Int(owner.pid), "bundleId": (owner.bundleId as Any?) ?? NSNull()]]
    case "showWindowBehindTheFrontWindow":
        let (bundleId, windowId) = try windowTarget(params)
        // Re-checked here: the main process's view of the lock and the owner is one IPC round trip old.
        if SessionState.screenLocked { return ["code": "unavailable", "screenLocked": true] }
        guard let owner = Spaces.owner(windowId: windowId), owner.bundleId == bundleId else { return ["code": "still_parked", "ownerMismatch": true] }
        return ["code": WindowShow.showBehindTheFrontWindow(pid: owner.pid, windowId: windowId)]
    case "bringWindowToActiveSpace":
        let (bundleId, windowId) = try windowTarget(params)
        let dryRun = params.raw["dryRun"] as? Bool ?? false
        if !dryRun, SessionState.screenLocked { return ["moved": false, "alreadyHere": false, "screenLocked": true] }
        return Spaces.bringToActiveSpace(bundleId: bundleId, windowId: windowId, dryRun: dryRun)
    case "spaceState":
        let active = Spaces.activeSpace()
        var out: [String: Any] = ["available": Spaces.available, "activeSpace": active.map { NSNumber(value: $0) } ?? NSNull(),
                                  "activeSpaceType": active.flatMap { Spaces.type(of: $0) }.map { Int($0) } ?? NSNull(),
                                  "currentSpaces": (Spaces.currentSpaces() ?? []).sorted().map { NSNumber(value: $0) }]
        if let windowId = params.uint32("windowId") {
            out["windowSpaces"] = Spaces.spaces(of: windowId)?.map { NSNumber(value: $0) } ?? NSNull()
        }
        return out
    case "captureScreen":
        guard let allowed = params.strings("allowedBundleIds") else { throw CUError.invalidParams("allowedBundleIds must be an array of strings") }
        if params.raw["displayId"] != nil, params.uint32("displayId") == nil { throw CUError.invalidParams("displayId must be a display id") }
        let displayId = params.uint32("displayId"), scale = try scale(params)
        var region: CGRect?
        if let r = params.raw["region"] as? [String: Any] {
            let p = Params(r)
            guard let x = p.double("x"), let y = p.double("y"), let w = p.double("width"), let h = p.double("height") else {
                throw CUError.invalidParams("region must be {x, y, width, height}")
            }
            region = CGRect(x: x, y: y, width: w, height: h)
        } else if params.raw["region"] != nil { throw CUError.invalidParams("region must be {x, y, width, height}") }
        let shotRegion = region
        return try blockingAwait { try await Capture.screen(displayId: displayId, allowedBundleIds: allowed, scale: scale, region: shotRegion) }
    case "listDisplays":
        return ["displays": Displays.list().map(\.json)]
    case "frontmostApp":
        return PointOwner.frontmost()
    case "pointOwner":
        let point = try globalPoint(params)
        let ignore = Set((params.raw["ignoreWindowIds"] as? [NSNumber] ?? []).map(\.uint32Value))
        return ["owner": PointOwner.at(point, ignoring: ignore).map { $0 as Any } ?? NSNull()]
    case "cursorPosition":
        let p = GlobalInput.cursor
        return ["x": p.x, "y": p.y]
    case "hidMove":
        return try GlobalInput.move(to: try globalPoint(params), animate: params.raw["animate"] as? Bool ?? true)
    case "hidClick":
        let count = params.double("count").map { Int($0) } ?? 1
        let flags = try GlobalInput.flags(params.strings("modifiers") ?? [])
        return try GlobalInput.click(at: try globalPoint(params), button: params.string("button") ?? "left", count: count,
                                     flags: flags, animate: params.raw["animate"] as? Bool ?? true)
    case "hidMouseDown":
        return try GlobalInput.mouseDown()
    case "hidMouseUp":
        return try GlobalInput.mouseUp()
    case "hidDrag":
        let from = params.raw["from"] != nil ? try globalPoint(Params(["point": params.raw["from"] as Any])) : nil
        return try GlobalInput.drag(from: from, to: try globalPoint(Params(["point": params.raw["to"] as Any])))
    case "hidState":
        let p = GlobalInput.cursor
        return ["held": GlobalInput.isHeld, "keysHeld": GlobalKeys.held, "cursor": ["x": p.x, "y": p.y]]
    // The display-scope keyboard (DisplayKeys.swift): {modifiers, keys} as keys.cjs parsed the chord; frontPid: the
    // frontmost pid the main process approved (delivery stops when another app comes in front).
    case "hidKey":
        let times = params.double("repeat").map { Int($0) } ?? 1
        return try GlobalKeys.press(modifiers: params.strings("modifiers") ?? [], keys: params.strings("keys") ?? [], times: times,
                                    frontPid: params.double("frontPid").map { Int32($0) }, opId: params.double("opId").map { Int($0) })
    case "hidKeyHold":
        guard let ms = params.double("durationMs"), ms >= 0, ms <= 100_000 else { throw CUError.invalidParams("durationMs must be 0–100000") }
        return try GlobalKeys.hold(modifiers: params.strings("modifiers") ?? [], keys: params.strings("keys") ?? [],
                                   milliseconds: Int(ms.rounded()), frontPid: params.double("frontPid").map { Int32($0) },
                                   opId: params.double("opId").map { Int($0) })
    case "hidType":
        guard let text = params.string("text") else { throw CUError.invalidParams("text must be a string") }
        return try GlobalKeys.type(text, frontPid: params.double("frontPid").map { Int32($0) }, opId: params.double("opId").map { Int($0) })
    // opId: the operation to stop (now and on its retries); none: whatever runs now.
    case "hidKeyAbort":
        GlobalKeys.abort(params.double("opId").map { Int($0) })
        return ["aborted": true]
    case "keyCodeKnown":
        let names = params.strings("keys") ?? []
        return ["unknown": names.filter { GlobalKeys.keyCode($0) == nil && !["cmd", "shift", "alt", "ctrl", "fn"].contains($0.lowercased()) }]
    case "openApp":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        return try AppLauncher.open(bundleId: bundleId, activates: params.raw["activates"] as? Bool ?? true)
    case "setPhantomCursor":
        let usage = "setPhantomCursor: expected (screenX, screenY, windowId?, pulse?)"
        guard let x = params.double("screenX"), let y = params.double("screenY"), abs(x) < 1e6, abs(y) < 1e6 else { throw CUError.invalidParams(usage) }
        if params.raw["windowId"] != nil, params.raw["windowId"] is NSNull == false, params.uint32("windowId") == nil { throw CUError.invalidParams(usage) }
        if let pulse = params.raw["pulse"], !(pulse is NSNull), !((pulse as? NSNumber).map { CFGetTypeID($0) == CFBooleanGetTypeID() } ?? false) {
            throw CUError.invalidParams(usage)
        }
        let windowId = params.uint32("windowId"), pulse = params.raw["pulse"] as? Bool ?? false
        return try MainThread.run { PhantomCursors.shared.set(x: x, y: y, windowId: windowId, pulse: pulse) }
    case "hidePhantomCursor":
        if params.raw["windowId"] != nil, params.raw["windowId"] is NSNull == false, params.uint32("windowId") == nil {
            throw CUError.invalidParams("hidePhantomCursor: expected (windowId?)")
        }
        let windowId = params.uint32("windowId")
        return try MainThread.run { PhantomCursors.shared.hide(windowId: windowId) }
    case "phantomCursorState":
        return try MainThread.run { PhantomCursors.shared.state() }
    case "showWindowHighlight":
        let usage = "showWindowHighlight: expected (windowId, reduceMotion?)"
        guard let windowId = params.uint32("windowId"), windowId != 0 else { throw CUError.invalidParams(usage) }
        if let reduce = params.raw["reduceMotion"], !(reduce is NSNull), !((reduce as? NSNumber).map { CFGetTypeID($0) == CFBooleanGetTypeID() } ?? false) {
            throw CUError.invalidParams(usage)
        }
        let reduceMotion = params.raw["reduceMotion"] as? Bool ?? false
        return try MainThread.run { WindowHighlights.shared.show(windowId: windowId, reduceMotion: reduceMotion) }
    case "hideWindowHighlight":
        if params.raw["windowId"] != nil, params.raw["windowId"] is NSNull == false, params.uint32("windowId") == nil {
            throw CUError.invalidParams("hideWindowHighlight: expected (windowId?)")
        }
        let windowId = params.uint32("windowId")
        return try MainThread.run { WindowHighlights.shared.hide(windowId: windowId) }
    case "windowHighlightState":
        return try MainThread.run { WindowHighlights.shared.state() }
    case "windowHighlightSnapshot":
        guard let windowId = params.uint32("windowId"), windowId != 0 else { throw CUError.invalidParams("windowHighlightSnapshot: expected (windowId)") }
        return try MainThread.run { try WindowHighlights.shared.snapshot(windowId: windowId) }
    case "prepareDisplay":
        guard let allowed = params.strings("allowedBundleIds") else { throw CUError.invalidParams("prepareDisplay: expected (allowedBundleIds: string[], hostBundleIds?: string[], displayId?)") }
        return AppHide.prepare(allowed: allowed, host: params.strings("hostBundleIds") ?? [], displayId: params.uint32("displayId"))
    case "previewHideSet":
        guard let exempt = params.strings("exemptBundleIds") else { throw CUError.invalidParams("previewHideSet: expected exemptBundleIds: string[]") }
        return AppHide.preview(exempt: exempt, displayId: params.uint32("displayId"))
    case "unhideApps":
        guard let bundleIds = params.strings("bundleIds") else { throw CUError.invalidParams("unhide: expected bundleIds: string[]") }
        return AppHide.unhide(bundleIds: bundleIds)
    case "savePanelProbe":
        if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
        let at = params.raw["point"] != nil ? try globalPoint(params) : nil
        return ["probe": SavePanel.probe(windowId: params.uint32("windowId"), bundleId: params.string("bundleId"), point: at,
                                         mainWindow: params.raw["mainWindow"] as? Bool ?? false).map { $0 as Any } ?? NSNull()]
    case "saveSheetFolderAndParents":
        guard let pid = params.double("pid"), pid > 0, pid == pid.rounded() else { throw CUError.invalidParams("pid is required") }
        return ["answer": SavePanel.folderAndParents(pid: pid_t(pid)).map { $0 as Any } ?? NSNull()]
    case "hidScroll":
        guard let dx = params.double("dx"), let dy = params.double("dy"), abs(dx) <= 100, abs(dy) <= 100,
              dx == dx.rounded(), dy == dy.rounded() else { throw CUError.invalidParams("dx and dy must be integers in [-100, 100]") }
        return try GlobalInput.scroll(at: try globalPoint(params), dx: Int32(dx), dy: Int32(dy), animate: params.raw["animate"] as? Bool ?? true)
    // Watch-record (WatchRecorder.swift, WatchRecordVoiceover.swift): the listen-only input recorder, its frames and
    // the on-device narration. Events and narration wait in buffers the main process drains.
    case "watchRecordStart":
        return try WatchRecorder.shared.start()
    case "watchRecordStop":
        return WatchRecorder.shared.stop()
    case "watchRecordDrain":
        return WatchRecorder.shared.drain()
    case "watchRecordClear":
        WatchRecorder.shared.clear()
        return ["cleared": true]
    case "watchRecordNowT":
        return ["t": WatchRecorder.shared.nowT()]
    case "watchRecordFrame":
        if params.raw["displayId"] != nil, params.uint32("displayId") == nil { throw CUError.invalidParams("displayId must be a display id") }
        let displayId = params.uint32("displayId")
        return try blockingAwait { try await WatchRecorder.frame(displayId: displayId) }
    case "voiceoverAvailability":
        return WatchRecordVoiceover.availability()
    case "voiceoverDevices":
        return ["devices": WatchRecordVoiceover.listInputDevices()]
    case "voiceoverStart":
        try WatchRecordVoiceover.shared.start(uid: params.string("uid"), perTurn: params.raw["perTurn"] as? Bool ?? false)
        return ["started": true]
    case "voiceoverStop":
        WatchRecordVoiceover.shared.stop()
        return ["stopped": true]
    case "voiceoverDrain":
        return WatchRecordVoiceover.shared.drain()
    case "voiceoverPreviewStart":
        try WatchRecordVoiceover.shared.startPreview(uid: params.string("uid"))
        return ["started": true]
    case "voiceoverPreviewStop":
        WatchRecordVoiceover.shared.stopPreview()
        return ["stopped": true]
    // Watch-record's permissions dialog (official rj "Request" for Screen recording): the system's own prompt the first
    // time, then only the answer (granted or not) — System Settings is opened by the main process when it is not.
    case "requestScreenCapture":
        return ["granted": CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess()]
    case "requestAccessibility":
        let prompt = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        return ["granted": AXIsProcessTrustedWithOptions([prompt: true] as CFDictionary)]
    case "axProbe":
        return ["axTrusted": AXIsProcessTrusted()]
    case "focusWindow":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
        return try AppFocus.focus(bundleId: bundleId, windowId: params.uint32("windowId"))
    case "menu":
        guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
        if params.raw["path"] != nil, params.strings("path") == nil { throw CUError.invalidParams("path must be an array of menu titles") }
        let path = params.strings("path") ?? []
        switch params.string("mode") {
        case "press":
            guard !path.isEmpty else { throw CUError.invalidParams("bundleId and a non-empty path are required") }
            return try MenuBar.press(bundleId: bundleId, path: path)
        case "list": return try MenuBar.list(bundleId: bundleId, path: path)
        case "close": return try MenuBar.close(bundleId: bundleId)
        default: throw CUError.invalidParams("menu: expected (bundleId, {mode: press | list | close, path})")
        }
    case "listApps":
        if params.raw["folders"] != nil, params.strings("folders") == nil { throw CUError.invalidParams("folders must be an array of paths") }
        return AppList.apps(folders: params.strings("folders") ?? [])
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

func drag(_ params: Params) throws -> [String: Any] {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty,
          let windowId = params.uint32("windowId"), windowId > 0,
          let granted = params.strings("grantedBundleIds"), granted.contains(bundleId),
          let vertices = params.raw["points"] as? [[String: Any]], (2...22).contains(vertices.count),
          let pixelScale = params.double("pixelScale"), pixelScale > 0, pixelScale <= 16 else {
        throw CUError.invalidParams("drag requires an app, window, grants, 2–22 converted points and pixelScale in (0, 16]")
    }
    let button = params.raw["button"] == nil ? "left" : params.string("button")
    guard let button, ["left", "right", "middle"].contains(button) else {
        throw CUError.invalidParams("button must be left, right or middle")
    }
    let points = try vertices.map { vertex -> RawInput.DragPoint in
        let p = Params(vertex)
        return .init(local: try point(p, "winLocalPt"), screen: try point(p, "screenPt"))
    }
    return try RawInput.drag(bundleId: bundleId, windowId: windowId, points: points, pixelScale: pixelScale,
                            button: button, focused: params.raw["focused"] as? Bool ?? false, grantedBundleIds: Set(granted))
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

/// axKey / rawKey: the app, an optional window and a non-empty combo.
func windowTarget(_ params: Params) throws -> (String, UInt32) {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    guard let windowId = params.uint32("windowId"), windowId > 0 else { throw CUError.invalidParams("windowId must be a CGWindowID") }
    return (bundleId, windowId)
}

func keyBasics(_ params: Params) throws -> (String, UInt32?, String) {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
    guard let combo = params.string("combo"), !combo.isEmpty else { throw CUError.invalidParams("combo is required") }
    return (bundleId, params.uint32("windowId"), combo)
}

/// axScroll: the app and an optional window.
func scrollBasics(_ params: Params) throws -> (String, UInt32?) {
    guard let bundleId = params.string("bundleId"), !bundleId.isEmpty else { throw CUError.invalidParams("bundleId is required") }
    if params.raw["windowId"] != nil, params.uint32("windowId") == nil { throw CUError.invalidParams("windowId must be a CGWindowID") }
    return (bundleId, params.uint32("windowId"))
}

/// At most one of winLocalPt, elementIndex (+expectRole) and focused; nil when none is given.
func keyAddress(_ params: Params) throws -> TextInput.Address? {
    let index = params.double("elementIndex").flatMap { $0 >= 0 && $0 == $0.rounded() ? Int($0) : nil }
    if params.raw["elementIndex"] != nil, index == nil { throw CUError.invalidParams("elementIndex must be a non-negative integer") }
    let focused = params.raw["focused"] as? Bool ?? false
    let local = params.raw["winLocalPt"] != nil ? try point(params, "winLocalPt") : nil
    let given = [local != nil, index != nil, focused].filter { $0 }.count
    guard given <= 1 else { throw CUError.invalidParams("at most one of winLocalPt, elementIndex, focused") }
    if focused { return .focused }
    if let index { return .index(index, expectRole: params.string("expectRole")) }
    return local.map { .point($0) }
}

/// A global point {x, y} (top-left origin, points) under params.point.
func globalPoint(_ params: Params) throws -> CGPoint {
    guard let raw = params.raw["point"] as? [String: Any], let x = Params(raw).double("x"), let y = Params(raw).double("y") else {
        throw CUError.invalidParams("point must be {x, y} in global screen points")
    }
    return CGPoint(x: x, y: y)
}
