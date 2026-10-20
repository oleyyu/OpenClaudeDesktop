// Computer use in the main process, per app session: the session's grants (grants.cjs) gate every native call.
// M1: window lists and captures. An app outside the session's grants is never listed or captured; a screen capture's
// SCContentFilter (native side) includes only the granted apps and the wallpaper, so other apps' pixels — and the
// menu bar, which WindowServer draws with every app's menus and status items — never exist.
//
// M2: app_screenshot (image + AX summary in the same frame pixels) and app_click on the AX rung: AXPress on the
// element under the point after climbing at most four parents; anything else is refused with a reason code, never
// clicked blindly (executor.cjs + reason-policy.cjs, fail-closed).
//
// IPC (main.cjs "desktop:call", actions "computer-use:*", sessionId required) answers
// {ok: true, result} | {ok: false, error: {code, message}} so the reason code survives the IPC boundary.
// There is deliberately no IPC action that adds a grant.
const { createNative, coded } = require("./native.cjs");
const { createGrants, validBundleId } = require("./grants.cjs");
const { fit, scaled, frameToWindowLocal, inFrame } = require("./budget.cjs");
const { actionGate, checkTier } = require("./guards.cjs");
const { execute } = require("./executor.cjs");

// How many summary lines app_screenshot shows inline; app_ax_find searches the rest.
const SUMMARY_LINES = 40;

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

/** "[N] AXButton "Back" (x, y, w×h)" lines in frame pixels, the first `limit` of them. */
function summaryText(shot, limit = SUMMARY_LINES) {
  const elements = Array.isArray(shot.elements) ? shot.elements : [];
  const lines = elements.slice(0, limit).map((e) => `[${e.index}] ${e.role}${e.subrole ? `/${e.subrole}` : ""}${e.title ? ` ${JSON.stringify(e.title)}` : ""} (${e.frame.x}, ${e.frame.y}, ${e.frame.width}×${e.frame.height})${e.checked === true ? " checked" : ""}${e.enabled === false ? " disabled" : ""}`);
  const head = `Window ${shot.windowId} of ${shot.bundleId}: ${shot.frameWidth}×${shot.frameHeight} frame px${shot.width !== shot.frameWidth ? ` (image ${shot.width}×${shot.height})` : ""}.`;
  if (shot.axTrusted === false) return `${head}\nNo element summary: Accessibility is not granted.`;
  if (!elements.length) return `${head}\nNo actionable elements reported.`;
  return [head, ...lines, ...(elements.length > limit ? [`… ${elements.length - limit} more: use app_ax_find.`] : [])].join("\n");
}

/** selfBundleIds: the app's own bundle ids, which no session can grant (grants.cjs `refuse`). */
function createComputerUse({ native = createNative(), log = console, wait, selfBundleIds = [] } = {}) {
  const sessions = new Map();   // sessionId → grants
  const windows = new Map();    // sessionId → { shots: Map("bundle:window" → shot), last: Map(bundle → windowId), points: Map("bundle:window" → winLocalPt) }
  const stateFor = (sessionId) => {
    if (!windows.has(sessionId)) windows.set(sessionId, { shots: new Map(), last: new Map(), points: new Map() });
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
    /** app_screenshot: one window, image + AX summary; it becomes the coordinate reference for that window. */
    async appScreenshot(sessionId, { bundleId, windowId, scale } = {}) {
      granted(sessionId, bundleId);
      const state = stateFor(sessionId);
      const target = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = await service.captureWindow(sessionId, { bundleId, windowId: target, scale, listsElements: true });
      const key = `${bundleId}:${shot.windowId}`;
      state.shots.set(key, shot);
      state.last.set(bundleId, shot.windowId);
      state.target = { bundleId, windowId: shot.windowId };
      state.points.delete(key);
      return { ...shot, summary: summaryText(shot) };
    },
    /** app_click on the AX rung. Refusals come back as {outcome: "unsupported", reasonCode, blocked: true}. */
    async appClick(sessionId, { bundleId, windowId, coordinate, element_index: elementIndex, target, count = 1, button = "left", dryRun = false } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), button === "right" ? "right_click" : "left_click");
      if (button !== "left" && button !== "right") throw coded("invalid_params", "button must be \"left\" or \"right\".");
      if (![1, 2, 3].includes(count)) throw coded("invalid_params", "count must be 1, 2 or 3.");
      const given = [coordinate !== undefined, elementIndex !== undefined, target !== undefined].filter(Boolean).length;
      if (given > 1) throw coded("invalid_params", "coordinate, element_index and target are mutually exclusive.");
      if (target !== undefined && target !== "focused") throw coded("invalid_params", "target must be \"focused\".");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const key = `${bundleId}:${wid}`, shot = state.shots.get(key);
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
        } else if (coordinate !== undefined) {
          if (!Array.isArray(coordinate) || coordinate.length !== 2 || !inFrame(coordinate, shot)) {
            throw coded("invalid_params", `coordinate must be [x, y] inside the screenshot's ${shot.frameWidth}×${shot.frameHeight} frame.`);
          }
          point = frameToWindowLocal(coordinate, shot);
          params.winLocalPt = point;
        } else {
          point = state.points.get(key);
          if (!point) throw coded("invalid_params", "Give coordinate, element_index or target: there is no previous action point on this window.");
          params.winLocalPt = point;
        }
      }
      const gate = actionGate(await native.call("probe"), "left_click");
      if (gate) return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true };
      const result = await execute({ ax: () => native.call("axClick", params), focusedPointer: target === "focused", log, ...(wait ? { wait } : {}) });
      if (result.outcome === "ok" && point) state.points.set(key, point);
      return { ...result, windowId: wid };
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

module.exports = { createComputerUse, checkBudget, summaryText };
