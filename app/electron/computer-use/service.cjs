// Computer use in the main process, per app session: the session's grants (grants.cjs) gate every native call.
// M1: window lists and captures. An app outside the session's grants is never listed or captured; a screen capture's
// SCContentFilter (native side) includes only the granted apps and the wallpaper, so other apps' pixels — and the
// menu bar, which WindowServer draws with every app's menus and status items — never exist.
//
// M2: app_screenshot (image + AX summary in the same frame pixels) and app_click on the AX rung: AXPress on the
// element under the point after climbing at most four parents; anything else is refused with a reason code, never
// clicked blindly (executor.cjs + reason-policy.cjs, fail-closed). A right click is AXShowMenu on the element or one of
// its two parents (no_menu_action otherwise); it has no raw rung.
//
// M3: app_type on the AX rung (AXValue written and read back) with the raw rung behind the reason policy (Unicode
// key events of ≤ 20 UTF-16 units, read back again), and app_key as keystrokes; both natively gated (secure input,
// user input, foreground app, screen lock). System combos (quit / switch / lock) are refused this round.
//
// Accessibility without input (agent tools app_focus / app_menu): window focus and the menu bar through ax-helper.cjs,
// a separate helper process, because the native module doesn't expose them yet. app_zoom crops the last app_screenshot
// with `image` (main.cjs: Electron's nativeImage); it never captures again.
//
// `pointer` (main.cjs: cursor.cjs) shows where a click landed: beforeClick() just before the native call — the pointer
// window must never be under an Accessibility hit test — and clicked({x, y}) in global screen points after it took effect.
//
// IPC (main.cjs "desktop:call", actions "computer-use:*", sessionId required) answers
// {ok: true, result} | {ok: false, error: {code, message}} so the reason code survives the IPC boundary.
// There is deliberately no IPC action that adds a grant.
const { createNative, coded } = require("./native.cjs");
const { createGrants, validBundleId } = require("./grants.cjs");
const { fit, scaled, frameToWindowLocal, windowLocalToScreen, inFrame } = require("./budget.cjs");
const { actionGate, checkTier } = require("./guards.cjs");
const { execute, deliver } = require("./executor.cjs");
const { createAxHelper } = require("./ax-helper.cjs");
const { isDeepStrictEqual } = require("node:util");

// How many summary lines app_screenshot shows inline; app_ax_find searches the rest.
const SUMMARY_LINES = 40;
// app_type: at most this many UTF-16 units per call (≈ 3 ms per 20-unit event on the raw rung).
const MAX_TYPE_UNITS = 10000;
// System-level combos (quit, app switch, lock, force quit, Spotlight, Mission Control): not this round (M3 brief).
const SYSTEM_COMBOS = new Set(["cmd+q", "cmd+tab", "cmd+shift+tab", "cmd+`", "cmd+ctrl+q", "cmd+option+escape", "cmd+space",
  "ctrl+space", "ctrl+up", "ctrl+down", "ctrl+left", "ctrl+right", "cmd+option+d", "cmd+h", "cmd+option+h", "cmd+shift+q"]);
const MODIFIER_ORDER = ["cmd", "ctrl", "option", "shift", "fn"];
const MODIFIER_ALIASES = { command: "cmd", meta: "cmd", control: "ctrl", alt: "option", esc: "escape" };
// app_menu: how deep a path may go (menu bar ▸ menu ▸ submenus).
const MAX_MENU_DEPTH = 8;

/** "Command+Shift+Q" → "cmd+shift+q" with modifiers in a fixed order, for the system-combo check only. */
function normalizeCombo(combo) {
  const parts = combo.toLowerCase().split("+").map((p) => MODIFIER_ALIASES[p.trim()] ?? p.trim());
  const key = parts.pop();
  return [...MODIFIER_ORDER.filter((m) => parts.includes(m)), key].join("+");
}

function checkScale(scale) {
  if (scale === undefined) return undefined;
  if (typeof scale !== "number" || !(scale >= 0.1 && scale <= 1)) throw coded("invalid_params", "scale must be a number in [0.1, 1].");
  return scale;
}
function checkId(value, name) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value <= 0 || value > 0xffffffff) throw coded("invalid_params", `${name} must be a positive integer.`);
  return value;
}

/** One "[N] AXButton "Back" (x, y, w×h)" line in frame pixels. */
const elementLine = (e) => `[${e.index}] ${e.role}${e.subrole ? `/${e.subrole}` : ""}${e.title ? ` ${JSON.stringify(e.title)}` : ""} (${e.frame.x}, ${e.frame.y}, ${e.frame.width}×${e.frame.height})${e.checked === true ? " checked" : ""}${e.enabled === false ? " disabled" : ""}`;

/** The summary lines of a shot, the first `limit` of them. */
function summaryText(shot, limit = SUMMARY_LINES) {
  const elements = Array.isArray(shot.elements) ? shot.elements : [];
  const lines = elements.slice(0, limit).map(elementLine);
  const head = `Window ${shot.windowId} of ${shot.bundleId}: ${shot.frameWidth}×${shot.frameHeight} frame px${shot.width !== shot.frameWidth ? ` (image ${shot.width}×${shot.height})` : ""}.`;
  if (shot.axTrusted === false) return `${head}\nNo element summary: Accessibility is not granted.`;
  if (!elements.length) return `${head}\nNo actionable elements reported.`;
  return [head, ...lines, ...(elements.length > limit ? [`… ${elements.length - limit} more: use app_ax_find.`] : [])].join("\n");
}

const SECURE_FIELD = "AXSecureTextField";
const isSecure = (e) => e?.role === SECURE_FIELD || e?.subrole === SECURE_FIELD;
/** The summary element a coordinate lands on: the smallest listed frame containing it, or null. */
function elementAt(shot, [x, y]) {
  const elements = Array.isArray(shot?.elements) ? shot.elements : [];
  let best = null;
  for (const e of elements) {
    const f = e.frame;
    if (!f || x < f.x || y < f.y || x >= f.x + f.width || y >= f.y + f.height) continue;
    if (!best || f.width * f.height < best.frame.width * best.frame.height) best = e;
  }
  return best;
}
/** A password field is not a text target: refused before anything is written or selected. */
const secureFieldRefusal = (extra = {}) => ({ outcome: "unsupported", reasonCode: "no_text_target", secureTextField: true,
  path: "unavailable", blocked: true, ...extra });

/** All drag vertices use the same full-resolution screenshot reference, including optional waypoints. */
function dragCoordinates(shot, coordinate, toCoordinate, path) {
  if (path !== undefined && (!Array.isArray(path) || path.length < 2 || path.length > 20)) {
    throw coded("invalid_params", "path must contain 2–20 [x, y] waypoints.");
  }
  const vertices = [coordinate, ...(path ?? []), toCoordinate];
  if (vertices.some((p) => !Array.isArray(p) || p.length !== 2 || !inFrame(p, shot))) {
    throw coded("invalid_params", "coordinate, to_coordinate and every path point must be inside the screenshot's full-resolution frame.");
  }
  return {
    points: vertices.map((p) => {
      const winLocalPt = frameToWindowLocal(p, shot);
      return { winLocalPt, screenPt: windowLocalToScreen(winLocalPt, shot.bounds) };
    }),
    pixelScale: shot.scaleFactor > 0 ? shot.scaleFactor : shot.frameWidth / shot.bounds.width,
  };
}

const POSTED_EVENT_SYSTEM_APPS = new Set(["com.apple.finder", "com.apple.dock", "com.apple.systemuiserver"]);
/** Native supplies snapshots of the SAME retained element. Delivery alone cannot verify acceptance. */
function dragReadback(result, bundleId) {
  if (result?.outcome !== "ok" || result.delivered !== true) return result;
  const before = result.before ?? {}, after = result.after ?? {};
  const keys = ["AXValue", "AXSelectedTextRange", "AXPosition"].filter((key) => Object.hasOwn(before, key));
  const common = keys.filter((key) => Object.hasOwn(after, key));
  if (common.some((key) => !isDeepStrictEqual(before[key], after[key]))) {
    return { ...result, verified: true, readback: "changed" };
  }
  if (!keys.length || common.length !== keys.length) {
    return { ...result, verified: false, readback: "unavailable" };
  }
  return { ...result, outcome: "ineffective", verified: true, blocked: true, readback: "unchanged",
    reasonCode: POSTED_EVENT_SYSTEM_APPS.has(bundleId) ? "system_app_ignores_posted_events" : "drag_ineffective" };
}

/**
 * selfBundleIds: the app's own bundle ids, which no session can grant (grants.cjs `refuse`).
 * axHelper: ax-helper.cjs (focus, menus). image: {crop({dataUrl, rect, width, height}) → Promise<{dataUrl}>} for app_zoom.
 * pointer: {beforeClick(), clicked({sessionId, bundleId, windowId, x, y})} (cursor.cjs), optional.
 */
function createComputerUse({ native = createNative(), axHelper = createAxHelper(), image = null, pointer = null, log = console, wait, decide, selfBundleIds = [] } = {}) {
  const sessions = new Map();   // sessionId → grants
  const windows = new Map();    // sessionId → { shots: Map("bundle:window" → shot), last: Map(bundle → windowId) }
  const stateFor = (sessionId) => {
    if (!windows.has(sessionId)) windows.set(sessionId, { shots: new Map(), last: new Map() });
    return windows.get(sessionId);
  };
  const grantsFor = (sessionId) => {
    if (typeof sessionId !== "string" || !sessionId) throw coded("invalid_params", "sessionId is required.");
    if (!sessions.has(sessionId)) sessions.set(sessionId, createGrants({ refuse: selfBundleIds }));
    return sessions.get(sessionId);
  };
  const granted = (sessionId, bundleId) => {
    if (!validBundleId(bundleId)) throw coded("invalid_params", "bundleId is required.");
    if (!grantsFor(sessionId).has(bundleId)) throw coded("app_not_granted", `${bundleId} is not in this session’s granted applications. Call request_access first.`);
  };

  const service = {
    grantsFor,
    /** Native owns the entire held-button interval, including continuous guards and unconditional release. */
    async appDrag(sessionId, { bundleId, windowId, coordinate, to_coordinate: toCoordinate, path, button = "left" } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "drag");
      if (!["left", "right", "middle"].includes(button)) throw coded("invalid_params", "button must be left, right or middle.");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = state.shots.get(`${bundleId}:${wid}`);
      if (!shot) throw coded("screenshot_required", "Take an app_screenshot of this app before dragging.");
      const coordinates = dragCoordinates(shot, coordinate, toCoordinate, path);
      // The drag-specific main-process check follows the native secure → typing → focused → lock order.
      const probe = await native.call("probe");
      const gate = actionGate(probe, "drag");
      if (gate && gate !== "user_actively_typing") {
        return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true, delivered: false };
      }
      try { pointer?.beforeClick?.(); } catch {}
      const result = await deliver(() => native.call("drag", {
        bundleId, windowId: wid, ...coordinates, button, grantedBundleIds: grantsFor(sessionId).allowedBundleIds(),
      }), wait ? { wait } : {});
      return { ...dragReadback(result, bundleId), windowId: wid };
    },
    forgetSession: (sessionId) => { sessions.delete(sessionId); windows.delete(sessionId); },
    /** The window the session last looked at (app_screenshot), with its app's granted name: the live preview's target. */
    lastTarget(sessionId) {
      const target = windows.get(sessionId)?.target;
      if (!target || !sessions.get(sessionId)?.has(target.bundleId)) return null;
      const name = sessions.get(sessionId).list().find((app) => app.bundleId === target.bundleId)?.displayName;
      return { ...target, name: name || target.bundleId };
    },
    probe: () => native.call("probe"),
    async listWindows(sessionId, { bundleId } = {}) {
      granted(sessionId, bundleId);
      return native.call("listWindows", { bundleId });
    },
    async captureWindow(sessionId, { bundleId, windowId, scale, listsElements } = {}) {
      granted(sessionId, bundleId);
      const params = { bundleId, windowId: checkId(windowId, "windowId"), scale: checkScale(scale), ...(listsElements === true ? { listsElements: true } : {}) };
      const shot = await native.call("captureWindow", params);
      // Belt and braces: the native side resolved the window inside this app; never pass on anything else.
      if (shot?.bundleId !== bundleId) throw coded("foreign_pid", "The captured window does not belong to the granted app.");
      return checkBudget(shot, params.scale);
    },
    async captureScreen(sessionId, { displayId, scale } = {}) {
      const allowedBundleIds = grantsFor(sessionId).allowedBundleIds();
      const params = { displayId: checkId(displayId, "displayId"), allowedBundleIds, scale: checkScale(scale) };
      const shot = await native.call("captureScreen", params);
      // Nothing granted may leak in: every running app outside the grants must have been excluded.
      if (Array.isArray(shot?.excludedBundleIds) && shot.excludedBundleIds.some((id) => allowedBundleIds.includes(id))) {
        throw coded("internal", "A granted app was excluded from the capture.");
      }
      return checkBudget(shot, params.scale);
    },
    /**
     * app_screenshot: one window, image + AX summary; it becomes the coordinate reference for that window.
     * keepReference (app_batch's mid-batch screenshot): a picture only — no summary, nothing stored, and the native
     * element cache untouched — so the batch's coordinates and element_index keep meaning the screenshot before it.
     */
    async appScreenshot(sessionId, { bundleId, windowId, scale, keepReference = false } = {}) {
      granted(sessionId, bundleId);
      const state = stateFor(sessionId);
      const target = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      if (keepReference === true) {
        const shot = await service.captureWindow(sessionId, { bundleId, windowId: target, scale });
        return { ...shot, summary: `Window ${shot.windowId} of ${bundleId}, mid-batch: a picture only. Coordinates and element_index in this batch still refer to the app_screenshot taken before it.` };
      }
      const shot = await service.captureWindow(sessionId, { bundleId, windowId: target, scale, listsElements: true });
      const key = `${bundleId}:${shot.windowId}`;
      state.shots.set(key, shot);
      state.last.set(bundleId, shot.windowId);
      state.target = { bundleId, windowId: shot.windowId };
      return { ...shot, summary: summaryText(shot) };
    },
    /**
     * app_ax_find: the elements of the last app_screenshot of one window whose role (with or without "AX", any case)
     * and title (a case-insensitive substring) match. Nothing is read from the app again: [N] stays the screenshot's.
     */
    axFind(sessionId, { bundleId, windowId, role, titleContains } = {}) {
      granted(sessionId, bundleId);
      if (role !== undefined && typeof role !== "string") throw coded("invalid_params", "role must be a string.");
      if (titleContains !== undefined && typeof titleContains !== "string") throw coded("invalid_params", "title_contains must be a string.");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = wid === undefined ? undefined : state.shots.get(`${bundleId}:${wid}`);
      if (!shot) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId}${windowId ? ` window ${windowId}` : ""} first: app_ax_find searches its element summary.`);
      const wanted = role?.trim().toLowerCase().replace(/^ax/, "") || null, needle = titleContains?.trim().toLowerCase() || null;
      const roleOf = (value) => (typeof value === "string" ? value.toLowerCase().replace(/^ax/, "") : "");
      const elements = Array.isArray(shot.elements) ? shot.elements : [];
      const matches = elements.filter((e) => (!wanted || roleOf(e.role) === wanted || roleOf(e.subrole) === wanted)
        && (!needle || (typeof e.title === "string" && e.title.toLowerCase().includes(needle))));
      return { windowId: shot.windowId, total: elements.length, matches, lines: matches.map(elementLine) };
    },
    /**
     * app_release: forget what this session holds on an app's window (its last screenshot, the live preview's target), or on every window with no bundleId. The grants stay: releasing is not revoking.
     */
    release(sessionId, { bundleId, windowId } = {}) {
      if (bundleId !== undefined && !validBundleId(bundleId)) throw coded("invalid_params", "bundleId must be a bundle identifier.");
      if (windowId !== undefined && bundleId === undefined) throw coded("invalid_params", "window_id requires app.");
      const wid = checkId(windowId, "windowId");
      const state = windows.get(sessionId);
      if (!state) return { released: [] };
      const matches = (key) => bundleId === undefined || (wid === undefined ? key.startsWith(`${bundleId}:`) : key === `${bundleId}:${wid}`);
      const released = [...state.shots.keys()].filter(matches);
      for (const key of released) state.shots.delete(key);
      for (const [app, last] of [...state.last]) if (matches(`${app}:${last}`)) state.last.delete(app);
      if (state.target && matches(`${state.target.bundleId}:${state.target.windowId}`)) delete state.target;
      return { released };
    },
    /**
     * app_click on the AX rung. Refusals come back as {outcome: "unsupported", reasonCode, blocked: true}.
     * button "right" is AXShowMenu (the context menu, read back as menuItems); only a single left click has a raw rung.
     * axOnly: no raw rung behind the reason policy (a fallback reason is refused), as the agent tool asks until M4.
     * One of coordinate / element_index / target is required: there is no implicit "the same point as last time" (in a
     * form that is a second submit).
     */
    async appClick(sessionId, { bundleId, windowId, coordinate, element_index: elementIndex, target, count = 1, button = "left", dryRun = false, axOnly = false } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), button === "right" ? "right_click" : "left_click");
      if (button !== "left" && button !== "right") throw coded("invalid_params", "button must be \"left\" or \"right\".");
      if (![1, 2, 3].includes(count)) throw coded("invalid_params", "count must be 1, 2 or 3.");
      const given = [coordinate !== undefined, elementIndex !== undefined, target !== undefined].filter(Boolean).length;
      if (given > 1) throw coded("invalid_params", "coordinate, element_index and target are mutually exclusive.");
      if (given === 0) throw coded("invalid_params", "Give one of coordinate, element_index or target.");
      if (target !== undefined && target !== "focused") throw coded("invalid_params", "target must be \"focused\".");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = state.shots.get(`${bundleId}:${wid}`);
      const params = { bundleId, windowId: wid, count, button, dryRun: dryRun === true };
      let point = null;
      if (target === "focused") {
        if (wid === undefined) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId} first.`);
        params.focused = true;
      } else {
        if (!shot) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId}${windowId ? ` window ${windowId}` : ""} first: coordinates and element_index refer to it.`);
        if (elementIndex !== undefined) {
          if (!Number.isInteger(elementIndex) || elementIndex < 0 || elementIndex >= (shot.elements?.length ?? 0)) {
            throw coded("invalid_params", `element_index must be one of the [N] of the last app_screenshot (0–${(shot.elements?.length ?? 0) - 1}).`);
          }
          params.elementIndex = elementIndex;
          // The native cache is per window, not per session: it checks the element is still the one listed here.
          params.expectRole = shot.elements[elementIndex].role;
          const f = shot.elements[elementIndex].frame;
          point = frameToWindowLocal([f.x + f.width / 2, f.y + f.height / 2], shot);
        } else {
          if (!Array.isArray(coordinate) || coordinate.length !== 2 || !inFrame(coordinate, shot)) {
            throw coded("invalid_params", `coordinate must be [x, y] inside the screenshot's ${shot.frameWidth}×${shot.frameHeight} frame.`);
          }
          point = frameToWindowLocal(coordinate, shot);
          params.winLocalPt = point;
        }
      }
      const gate = actionGate(await native.call("probe"), "left_click");
      if (gate) return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true };
      // The raw rung (reason-policy FALLBACK only): a coordinate click at the same point, both forms from budget.cjs.
      const raw = point && shot && axOnly !== true && button === "left" && count === 1 ? () => native.call("rawClick", {
        bundleId, windowId: wid, count, button, winLocalPt: point, screenPt: windowLocalToScreen(point, shot.bounds),
        grantedBundleIds: grantsFor(sessionId).allowedBundleIds(),
      }) : null;
      try { pointer?.beforeClick?.(); } catch {}
      const result = await execute({ ax: () => native.call("axClick", params), raw, focusedPointer: target === "focused", log,
        context: { op: button === "right" ? "right_click" : "left_click", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}) });
      if (result.outcome === "ok" && point && shot?.bounds) {
        try { pointer?.clicked?.({ sessionId, bundleId, windowId: wid, ...windowLocalToScreen(point, shot.bounds) }); } catch {}
      }
      return { ...result, windowId: wid };
    },
    /**
     * app_type: AX rung (AXValue written and read back), then — only for a reason in the policy's FALLBACK — the raw rung.
     * Addressing: element_index or coordinate (of the last app_screenshot) or target "focused" (the default).
     * Partial delivery comes back ineffective with deliveredPrefixChars (UTF-16 units of `text` the field now holds).
     *
     * A password field (AXSecureTextField) is no_text_target, read before anything is written or selected: from the
     * screenshot's summary for element_index / coordinate, and for "focused" from the native refusal — the native target
     * resolution refuses a secure field as secure_input_active before it selects anything, which read like the session
     * gate misfiring; it is remapped when a fresh probe shows no secure input is actually on.
     */
    async appType(sessionId, { bundleId, windowId, text, mode = "insert", coordinate, element_index: elementIndex, target } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "type");
      if (typeof text !== "string" || !text) throw coded("invalid_params", "text must be a non-empty string.");
      if (text.length > MAX_TYPE_UNITS) throw coded("invalid_params", `text is limited to ${MAX_TYPE_UNITS} UTF-16 units per call.`);
      if (mode !== "insert" && mode !== "replace") throw coded("invalid_params", "mode must be \"insert\" or \"replace\".");
      const given = [coordinate !== undefined, elementIndex !== undefined, target !== undefined].filter(Boolean).length;
      if (given > 1) throw coded("invalid_params", "coordinate, element_index and target are mutually exclusive.");
      if (target !== undefined && target !== "focused") throw coded("invalid_params", "target must be \"focused\".");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      if (wid === undefined) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId} first.`);
      const shot = state.shots.get(`${bundleId}:${wid}`);
      const params = { bundleId, windowId: wid, text, mode };
      if (elementIndex !== undefined || coordinate !== undefined) {
        if (!shot) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId} first: coordinates and element_index refer to it.`);
        if (elementIndex !== undefined) {
          if (!Number.isInteger(elementIndex) || elementIndex < 0 || elementIndex >= (shot.elements?.length ?? 0)) {
            throw coded("invalid_params", `element_index must be one of the [N] of the last app_screenshot (0–${(shot.elements?.length ?? 0) - 1}).`);
          }
          if (isSecure(shot.elements[elementIndex])) return secureFieldRefusal({ windowId: wid });
          params.elementIndex = elementIndex;
          params.expectRole = shot.elements[elementIndex].role;
        } else {
          if (!Array.isArray(coordinate) || coordinate.length !== 2 || !inFrame(coordinate, shot)) {
            throw coded("invalid_params", `coordinate must be [x, y] inside the screenshot's ${shot.frameWidth}×${shot.frameHeight} frame.`);
          }
          if (isSecure(elementAt(shot, coordinate))) return secureFieldRefusal({ windowId: wid });
          params.winLocalPt = frameToWindowLocal(coordinate, shot);
        }
      } else {
        params.focused = true;
      }
      const gate = actionGate(await native.call("probe"), "type");
      if (gate) return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true };
      const raw = (axResult) => native.call("rawType", { ...params, axReason: axResult?.reasonCode, grantedBundleIds: grantsFor(sessionId).allowedBundleIds() });
      const ax = async () => {
        const result = await native.call("axType", params);
        if (result?.reasonCode !== "secure_input_active" || (await native.call("probe"))?.secureInput === true) return result;
        return { ...result, reasonCode: "no_text_target", secureTextField: true };
      };
      const result = await execute({ ax, raw, log,
        context: { op: "type", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}) });
      return { ...result, windowId: wid };
    },
    /**
     * app_focus: make a window the app's main and focused window (AXMain + AXFocused), so target "focused" means
     * something in it. No AXRaise, no activation. Refused while the app is frontmost: the user is working in it.
     * The focused window becomes the app's default window, as an app_screenshot does.
     */
    async appFocus(sessionId, { bundleId, windowId } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "left_click");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const gate = actionGate(await native.call("probe"), "left_click");
      if (gate) return { outcome: "unsupported", reasonCode: gate, focused: false, blocked: true };
      const result = await axHelper.call("focus", { bundleId, ...(wid !== undefined ? { windowId: wid } : {}) });
      if (result?.outcome === "ok" && Number.isInteger(result.window_id)) state.last.set(bundleId, result.window_id);
      return result;
    },
    /**
     * app_menu: one of
     *   path  [title, …]   walk the menu bar by titles (any case, trailing … ignored) and press the last item: a command
     *                      runs; a menu title opens that menu and lists its items
     *   list  true | null | title | [title, …]   the items under that path (the menu bar titles for true / null); read-only
     *   close true         cancel any open menu of the app (what Escape does)
     * Accessibility only (AXPress / AXCancel): no mouse event, the app is not brought forward.
     */
    async appMenu(sessionId, { bundleId, path, list, close } = {}) {
      granted(sessionId, bundleId);
      const modes = [path !== undefined, list !== undefined, close !== undefined].filter(Boolean).length;
      if (modes !== 1) throw coded("invalid_params", "Give exactly one of path, list or close.");
      const titles = (value, name) => {
        if (!Array.isArray(value) || value.length > MAX_MENU_DEPTH || !value.every((t) => typeof t === "string" && t.trim())) {
          throw coded("invalid_params", `${name} must be an array of at most ${MAX_MENU_DEPTH} menu titles.`);
        }
        return value.map((t) => t.trim());
      };
      if (list !== undefined) {
        checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "see");
        const under = list === true || list === null ? [] : typeof list === "string" ? titles([list], "list") : titles(list, "list");
        return axHelper.call("menuList", { bundleId, path: under });
      }
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "menu");
      if (close !== undefined && close !== true) throw coded("invalid_params", "close must be true.");
      const steps = close ? null : titles(path, "path");
      if (steps && !steps.length) throw coded("invalid_params", "path must name at least the menu bar title, e.g. [\"File\", \"New Folder\"].");
      const gate = actionGate(await native.call("probe"), "menu");
      if (gate) return { outcome: "unsupported", reasonCode: gate, blocked: true };
      if (close) return { outcome: "ok", ...(await axHelper.call("menuClose", { bundleId })) };
      return axHelper.call("menu", { bundleId, path: steps });
    },
    /**
     * app_zoom: region [x0, y0, x1, y1] of the last app_screenshot of a window (frame pixels), cropped from that
     * screenshot and enlarged up to the region's frame size (the screenshot's budget). Nothing is captured again, so the
     * detail is what that screenshot holds; coordinates keep referring to the screenshot.
     */
    async appZoom(sessionId, { bundleId, windowId, region, scale } = {}) {
      granted(sessionId, bundleId);
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = wid === undefined ? undefined : state.shots.get(`${bundleId}:${wid}`);
      if (!shot) throw coded("screenshot_required", `Take an app_screenshot of ${bundleId}${windowId ? ` window ${windowId}` : ""} first: app_zoom enlarges part of it.`);
      if (!Array.isArray(region) || region.length !== 4 || !region.every((v) => typeof v === "number" && Number.isFinite(v))) {
        throw coded("invalid_params", "region must be [x0, y0, x1, y1] in the screenshot's frame pixels.");
      }
      const [x0, y0, x1, y1] = region;
      if (!(x0 >= 0 && y0 >= 0 && x1 > x0 && y1 > y0 && x1 <= shot.frameWidth && y1 <= shot.frameHeight)) {
        throw coded("invalid_params", `region must satisfy 0 ≤ x0 < x1 ≤ ${shot.frameWidth} and 0 ≤ y0 < y1 ≤ ${shot.frameHeight} (the screenshot's frame).`);
      }
      const factor = checkScale(scale) ?? 1;
      if (!image?.crop) throw coded("zoom_unavailable", "Zooming isn't available in this build.");
      const kx = shot.width / shot.frameWidth, ky = shot.height / shot.frameHeight;
      const rect = { x: Math.floor(x0 * kx), y: Math.floor(y0 * ky) };
      rect.width = Math.max(1, Math.min(shot.width - rect.x, Math.round((x1 - x0) * kx)));
      rect.height = Math.max(1, Math.min(shot.height - rect.y, Math.round((y1 - y0) * ky)));
      const [width, height] = scaled(fit(x1 - x0, y1 - y0), factor);
      const out = await image.crop({ dataUrl: shot.dataUrl, rect, width, height });
      return { dataUrl: out.dataUrl, width, height, region: [x0, y0, x1, y1], windowId: shot.windowId, bundleId,
        sourcePixels: { width: rect.width, height: rect.height } };
    },
    /** app_key: one combo ("cmd+a", "return", "shift+tab"), `repeat` times, as keystrokes; there is no AX rung. */
    async appKey(sessionId, { bundleId, windowId, combo, repeat = 1 } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "key");
      if (typeof combo !== "string" || !combo.trim()) throw coded("invalid_params", "combo must be a non-empty string.");
      if (!Number.isInteger(repeat) || repeat < 1 || repeat > 100) throw coded("invalid_params", "repeat must be an integer 1–100.");
      if (SYSTEM_COMBOS.has(normalizeCombo(combo))) {
        return { outcome: "unsupported", reasonCode: "system_key_combo_refused", path: "unavailable", blocked: true };
      }
      const wid = checkId(windowId, "windowId") ?? stateFor(sessionId).last.get(bundleId);
      const gate = actionGate(await native.call("probe"), "key");
      if (gate) return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true };
      const result = await deliver(() => native.call("rawKey", { bundleId, ...(wid !== undefined ? { windowId: wid } : {}), combo, repeat,
        grantedBundleIds: grantsFor(sessionId).allowedBundleIds() }), wait ? { wait } : {});
      return result;
    },
    /**
     * Settings › Computer use: every session's granted apps, by app — {apps: [{bundleId, displayName, tier, sessionIds}]}.
     * Grants live in memory per session, so this is what is granted right now, until the app quits.
     */
    allGrants() {
      const byApp = new Map();
      for (const [sessionId, grants] of sessions) {
        for (const app of grants.list()) {
          const entry = byApp.get(app.bundleId) ?? { bundleId: app.bundleId, displayName: app.displayName, tier: app.tier, sessionIds: [] };
          entry.displayName ??= app.displayName;
          entry.sessionIds.push(sessionId);
          byApp.set(app.bundleId, entry);
        }
      }
      return { apps: [...byApp.values()].sort((a, b) => (a.displayName ?? a.bundleId).localeCompare(b.displayName ?? b.bundleId)) };
    },
    /**
     * Revoke an app (Settings): from one session, or from every session without sessionId. What the session held on
     * its windows goes too (app_release), so nothing keeps pointing at it; the agent has to request_access again.
     */
    revoke({ bundleId, sessionId } = {}) {
      if (!validBundleId(bundleId)) throw coded("invalid_params", "bundleId is required.");
      const revoked = [];
      for (const [id, grants] of sessions) {
        if (sessionId !== undefined && id !== sessionId) continue;
        if (grants.revoke(bundleId)) { service.release(id, { bundleId }); revoked.push(id); }
      }
      return { bundleId, revoked };
    },
    /** desktop:call "computer-use:*" → envelope. */
    async call(action, p = {}) {
      try {
        const sessionId = p?.sessionId;
        switch (action) {
          case "computer-use:probe": return { ok: true, result: await service.probe() };
          case "computer-use:grants": return { ok: true, result: { apps: grantsFor(sessionId).list(), flags: grantsFor(sessionId).flags() } };
          case "computer-use:list-windows": return { ok: true, result: await service.listWindows(sessionId, p) };
          case "computer-use:capture-window": return { ok: true, result: await service.captureWindow(sessionId, p) };
          case "computer-use:capture-screen": return { ok: true, result: await service.captureScreen(sessionId, p) };
          case "computer-use:app-screenshot": return { ok: true, result: await service.appScreenshot(sessionId, p) };
          case "computer-use:all-grants": return { ok: true, result: service.allGrants() };
          case "computer-use:revoke": return { ok: true, result: service.revoke({ bundleId: p.bundleId, ...(typeof sessionId === "string" ? { sessionId } : {}) }) };
          default: throw coded("unknown_action", `Unknown action ${action}.`);
        }
      } catch (error) {
        return { ok: false, error: { code: error.code || "internal", message: error.message } };
      }
    },
  };
  return service;
}

/** The native side sized the image; refuse one that breaks the docs/06 budget rather than pass it on. */
function checkBudget(shot, scale = 1) {
  const expected = scaled(fit(shot.frameWidth, shot.frameHeight), scale);
  if (shot.width !== expected[0] || shot.height !== expected[1] || shot.jpegQuality !== 0.75) {
    throw coded("internal", `Capture size ${shot.width}×${shot.height} breaks the budget (expected ${expected.join("×")}).`);
  }
  return shot;
}

module.exports = { createComputerUse, checkBudget, summaryText, normalizeCombo, SYSTEM_COMBOS, MAX_TYPE_UNITS, MAX_MENU_DEPTH, dragCoordinates, dragReadback };
