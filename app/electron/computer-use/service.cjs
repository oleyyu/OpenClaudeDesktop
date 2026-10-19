// Computer use in the main process, per app session: the session's grants (grants.cjs) gate every native call.
// M1: window lists and captures. An app outside the session's grants is never listed or captured; a screen capture's
// SCContentFilter (native side) includes only the granted apps and the wallpaper, so other apps' pixels — and the
// menu bar, which WindowServer draws with every app's menus and status items — never exist.
//
// IPC (main.cjs "desktop:call", actions "computer-use:*", sessionId required) answers
// {ok: true, result} | {ok: false, error: {code, message}} so the reason code survives the IPC boundary.
// There is deliberately no IPC action that adds a grant.
const { createNative, coded } = require("./native.cjs");
const { createGrants, validBundleId } = require("./grants.cjs");
const { fit, scaled } = require("./budget.cjs");

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

function createComputerUse({ native = createNative() } = {}) {
  const sessions = new Map();   // sessionId → grants
  const grantsFor = (sessionId) => {
    if (typeof sessionId !== "string" || !sessionId) throw coded("invalid_params", "sessionId is required.");
    if (!sessions.has(sessionId)) sessions.set(sessionId, createGrants());
    return sessions.get(sessionId);
  };
  const granted = (sessionId, bundleId) => {
    if (!validBundleId(bundleId)) throw coded("invalid_params", "bundleId is required.");
    if (!grantsFor(sessionId).has(bundleId)) throw coded("app_not_granted", `${bundleId} is not in this session’s granted applications. Call request_access first.`);
  };

  const service = {
    grantsFor,
    forgetSession: (sessionId) => sessions.delete(sessionId),
    probe: () => native.call("probe"),
    async listWindows(sessionId, { bundleId } = {}) {
      granted(sessionId, bundleId);
      return native.call("listWindows", { bundleId });
    },
    async captureWindow(sessionId, { bundleId, windowId, scale } = {}) {
      granted(sessionId, bundleId);
      const params = { bundleId, windowId: checkId(windowId, "windowId"), scale: checkScale(scale) };
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

module.exports = { createComputerUse, checkBudget };
