// Computer use in the main process, per app session: the session's grants (grants.cjs) gate every native call.
// M1: window lists and captures. An app outside the session's grants is never listed or captured; a screen capture's
// SCContentFilter (native side) includes only the granted apps and the wallpaper, so other apps' pixels — and the
// menu bar, which WindowServer draws with every app's menus and status items — never exist.
//
// M2: app_screenshot (image + AX summary in the same frame pixels) and app_click on the AX rung, in the official
// 2.42304.0 ladder's order: a row (AXRow / AXCell / AXColumn / AXOutlineRow, a Finder list row) is selected through
// AXSelected and opened through AXOpen on a double click; text takes a double / triple click as a word / line; else
// AXPress on the element under the point after climbing at most four parents; else the nearest
// selectable ancestor; anything else is refused with a reason code, never clicked blindly (executor.cjs +
// reason-policy.cjs, fail-closed). A right click is checked like any click and then refused (official: a context menu
// would bring the app to the front; reasonCode context_menu): nothing is sent to the app.
//
// Background, never the user's input (official): app_* never move the real cursor, post to the global HID stream,
// activate an app or open a menu that tracks the mouse. The Dock and the desktop are not app_* targets (official: only
// display-scope with Finder's grant reaches them; desktop_shell). Every app_* action that reaches the app is wrapped in
// the focus-steal guard (focus-guard.cjs, official armFocusStealGuard): a target that comes to the front is put behind
// the user's app again, and the result says so (focusNote).
//
// M3: app_type on the AX rung (AXValue written and read back) with the raw rung behind the reason policy (Unicode
// key events of ≤ 20 UTF-16 units, read back again), natively gated (secure input, user input, foreground app, lock).
//
// app_key (official §1.6.1): one normalized combo (keys.cjs); return / escape / backspace / cmd+a through
// Accessibility at the address (native axKey), anything else — or an element without that action — as one keystroke
// to the window's keyboard focus (native rawKey, policy FALLBACK no_ax_key_action). System combos need the
// systemKeyCombos flag; combos that touch the clipboard are refused (state_conflict → app_type).
//
// app_bring_to_current_space (official §1.6.3): a minimized window or a hidden app comes back behind the user's front
// window (native showWindowBehindTheFrontWindow: AXMinimized / unhide, never activating the app, AXRaise on the user's
// window); a window on another Space is moved after a dry run (native bringWindowToActiveSpace, SkyLight).
//
// app_scroll (official §1.6.2): dy only (a non-zero dx is horizontal_scroll); native axScroll sets the vertical scroll
// bar's AXValue of the scroll area at the address by dy × 5 % (clamped) and reads it back. No raw rung, no event.
//
// Accessibility without input (agent tools app_focus / app_menu): window focus and the menu bar through ax-helper.cjs,
// which routes them to the native module (focusWindow, menu {mode}). app_menu never opens a menu: a path presses its
// leaf item; a path that ends at a menu answers path_ends_at_submenu with that menu's items, read without opening it.
// app_zoom crops the last app_screenshot with `image` (main.cjs: Electron's nativeImage); it never captures again.
//
// `pointer` (main.cjs: cursor.cjs) is the phantom cursor (official §2.6.1): a window this session holds (app_screenshot,
// not app_release'd) shows it at the window's centre when the lock is taken (moved), then at the screen point of every
// app_* action that landed there — clicked (the pulse) for app_click, moved for app_type / app_key / app_scroll /
// app_drag (its end) —, and it goes when the lock goes (released). beforeClick({windowId}) is awaited just before
// every hit-tested native call: the cursor must never be what an Accessibility hit test finds; an action that did not
// land puts it back (restore). Actions on the focused element have no point: the cursor stays. Display-scope actions
// call beforeClick({scope: "display"}) and never show it (official: the real pointer moves there).
//
// `highlight` (optional; main.cjs passes none since the final review: official 2.42304.0 has no target-window highlight,
// spec §2.6.3) hears which window each session works on now: target({sessionId, bundleId, windowId}) on an
// app_screenshot (not a mid-batch picture) and after every app_* action on a window the session holds;
// released({sessionId, windowId}) when the session's lock on it goes. window-highlight.cjs createHighlightDriver fits it.
//
// The clipboard (official §1.5; clipboard.cjs): read_clipboard / write_clipboard need the clipboardRead /
// clipboardWrite flag and full-screen control, and refuse while the session holds app windows; the clipboard guard
// runs in the display-scope gates; the screen-wide type pastes text with a new line when clipboardWrite is granted.
// `clipboard` (main.cjs: Electron's clipboard) is {readText(), writeText(text)}; without one the clipboard tools refuse.
//
// hideBeforeAction (official sub-gate, on by default; spec §1.4.5): before a full-screen screenshot or action, the apps
// outside the session's allowlist with a window on the selected display are hidden (native prepareDisplay: not quit,
// no window minimized; this app and the system's UI never), once per computer_batch / teach step. What was hidden is
// said in the next screenshot's notes and comes back when the turn ends or the session is stopped (main.cjs
// restoreHiddenApps, Settings › "Unhide apps when Claude finishes"); release_full_control does not unhide (official Bn()).
//
// savePanelProbe (save-panel.cjs): every key, typed text, click, drag and held press — screen-wide and app_* — is
// judged against what the window shows (a save sheet, a document under a protected path, a rename popover, Move To);
// refusals are save_panel_restricted.
//
// IPC (main.cjs "desktop:call", actions "computer-use:*", sessionId required) answers
// {ok: true, result} | {ok: false, error: {code, message}} so the reason code survives the IPC boundary.
// There is deliberately no IPC action that adds a grant.
const { createNative, coded } = require("./native.cjs");
const { createGrants, validBundleId } = require("./grants.cjs");
const { fit, scaled, frameToWindowLocal, windowLocalToScreen, inFrame, displayCoordFrame, imageToDisplayPoint, displayPointToImage, imageRegionToDisplayRect } = require("./budget.cjs");
const { actionGate, checkTier } = require("./guards.cjs");
const { tierFor, allows } = require("./grants.cjs");
const { createFullControl, CU_LOCK_HELD_MESSAGE } = require("./full-control.cjs");
const { execute, deliver } = require("./executor.cjs");
const { createAxHelper } = require("./ax-helper.cjs");
const { isDeepStrictEqual } = require("node:util");
const { normalizeCombo, isSystemCombo, clipboardFlags, mainKeyCount, parseCombo, displayChord, chordProblem } = require("./keys.cjs");
const { createClipboard, CLIPBOARD_SUB_GATES, PASTE_CHORD } = require("./clipboard.cjs");
const { createSavePanelGuard, policy: { navigationOnly } } = require("./save-panel.cjs");
const { createFocusGuard, frontNote } = require("./focus-guard.cjs");

// How many summary lines app_screenshot shows inline; app_ax_find searches the rest.
const SUMMARY_LINES = 40;
// app_type: at most this many UTF-16 units per call (≈ 3 ms per 20-unit event on the raw rung).
const MAX_TYPE_UNITS = 10000;
// app_menu: how deep a path may go (menu bar ▸ menu ▸ submenus).
const MAX_MENU_DEPTH = 8;

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

/**
 * Native supplies snapshots of the SAME retained element. Delivery alone cannot verify acceptance. An unchanged readback
 * is drag_ineffective for every app, Finder included: the official build has no system-app reason and no
 * Accessibility equivalent for a drag, and a Finder file drag is seen working live (docs/computer-use-drag.md).
 */
function dragReadback(result) {
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
    reasonCode: "drag_ineffective" };
}

/**
 * highlight: {target({sessionId, bundleId, windowId}), released({sessionId, windowId})}, optional (see the header).
 * selfBundleIds: the app's own bundle ids, which no session can grant (grants.cjs `refuse`).
 * axHelper: ax-helper.cjs (focus, menus; native by default). image: {crop({dataUrl, rect, width, height}) → Promise<{dataUrl}>} for app_zoom.
 * pointer: {beforeClick({windowId} | {scope: "display"}), clicked(point), moved(point), restore({windowId}),
 *   released({windowId})} with point {sessionId, bundleId, windowId, x, y} in global screen points (cursor.cjs), optional.
 * clickThrough: click-through.cjs createClickThrough() — the app's own windows let a screen-wide pointer delivery
 *   through (official executor NG) and input bursts (official beginInputBurst), optional.
 * focusGuard: focus-guard.cjs createFocusGuard() (tests pass one with their own clock); by default one on `native`.
 */
function createComputerUse({ native = createNative(), axHelper = createAxHelper({ native }), image = null, pointer = null, highlight = null, log = console, wait, decide, selfBundleIds = [], fullControl = createFullControl(), overlayWindowIds = () => [], onDisplaySelected = () => {}, withOwnEscape = (run) => run(), clipboard = null, subGates = {}, clickThrough = null, savePanel = null, focusGuard = null } = {}) {
  const pause = wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  // Official executor NG: a click / press / release / drag / scroll runs with the app's windows near it letting it through.
  const throughOwnWindows = (points, run) => (typeof clickThrough?.around === "function" ? clickThrough.around(points.filter(Boolean), run) : run());
  let keyOperations = 0;   // the screen-wide keyboard's operation ids (native GlobalKeys opId)
  // Official vlr sub-gates (the ones used here): clipboardPasteMultiline, clipboardGuard, hideBeforeAction.
  const gates = { ...CLIPBOARD_SUB_GATES, hideBeforeAction: true, ...(subGates && typeof subGates === "object" ? subGates : {}) };
  // The save-panel guard (save-panel.cjs); off on another platform or without native savePanelProbe.
  const saveGuard = savePanel ?? createSavePanelGuard({ native, log, ...(wait ? { wait } : {}) });
  /** Official q(): an input delivery, its end marked for the save sheet's settle time. */
  const asInput = async (run) => { try { return await run(); } finally { saveGuard.inputDone?.(); } };
  /** Official Bt / zt: a gate run again after a save-panel settle / parents refusal. */
  const guarded = (run, options) => (typeof saveGuard.retrying === "function" ? saveGuard.retrying(run, options) : run());
  /**
   * The app_* tools' save-panel gate (official Ut): the window the action aims at, the action's screen point. null to go
   * on, else the refusal {outcome, reasonCode: save_panel_restricted, errorKind, message, blocked: true}.
   */
  const appSaveGate = async ({ bundleId, windowId, shot, framePt, action }) => {
    if (!saveGuard.available || windowId === undefined) return null;
    const point = Array.isArray(framePt) && shot?.bounds ? windowLocalToScreen(frameToWindowLocal(framePt, shot), shot.bounds) : undefined;
    const refused = await saveGuard.app({ windowId, bundleId, point, action });
    return refused ? { ...refused, path: "unavailable", blocked: true, delivered: false, windowId } : null;
  };
  // hideBeforeAction: per session, the apps hidden this turn (unhidden when it ends) and those the next screenshot names.
  const hiddenApps = new Map();   // sessionId → {turn: Map(bundleId → name), pending: Map(bundleId → name)}
  let hideAvailable = true;
  const clip = createClipboard({ clipboard, log, wait: pause });
  const sessions = new Map();   // sessionId → grants
  const windows = new Map();    // sessionId → { shots: Map("bundle:window" → shot), last: Map(bundle → windowId), display?: shot, selectedDisplay?, pinnedDisplay? }
  const stateFor = (sessionId) => {
    // points: "bundle:window" → the frame point of the last action there (rememberPoint; app_key without a target reuses it).
    if (!windows.has(sessionId)) windows.set(sessionId, { shots: new Map(), last: new Map(), points: new Map() });
    return windows.get(sessionId);
  };
  /**
   * The point an app_key without a target reuses (official §1.2: the last app_* action's point in this window). Every
   * action that ran (not refused) updates it: an explicit point is kept, target "focused" forgets it — the keyboard focus
   * is then not at any point we know, so an earlier one must not be reused.
   */
  const rememberPoint = (state, key, framePt, result) => {
    if (result?.outcome === "unsupported") return;
    if (Array.isArray(framePt)) { state.points.set(key, framePt); state.lastPoint = { key, point: framePt }; }
    else { state.points.delete(key); if (state.lastPoint?.key === key) delete state.lastPoint; }
  };
  // ── The phantom cursor (official §2.6.1) ──
  const holds = (sessionId, bundleId, windowId) => windows.get(sessionId)?.shots.has(`${bundleId}:${windowId}`) === true;
  const heldByAnyone = (windowId) => [...windows.values()].some((state) => [...state.shots.keys()].some((key) => key.endsWith(`:${windowId}`)));
  const callPointer = (name, arg) => { try { return pointer?.[name]?.(arg); } catch { return undefined; } };
  // ── The target window highlight (window-highlight.cjs) ──
  const callHighlight = (name, arg) => { try { highlight?.[name]?.(arg); } catch {} };
  /** A session's lock on these "bundle:window" keys went: its highlight target goes with them. */
  const highlightReleased = (sessionId, keys) => {
    for (const windowId of new Set(keys.map((key) => Number(key.slice(key.lastIndexOf(":") + 1))))) {
      if (Number.isInteger(windowId)) callHighlight("released", { sessionId, windowId });
    }
  };
  /** Before a hit-tested action: the window's cursor goes, and is off screen before the native call. */
  const pointerAside = async (windowId) => { try { await pointer?.beforeClick?.({ windowId }); } catch {} };
  /**
   * After an app_* action: a landed one (not refused, a point known) moves the cursor there — the pulse only for a
   * click —; one that did not land puts it back where it was (hid: it was hidden for this action).
   */
  const pointerLanded = (sessionId, bundleId, windowId, shot, framePt, result, { click = false, hid = true } = {}) => {
    if (windowId === undefined || !holds(sessionId, bundleId, windowId)) return;
    callHighlight("target", { sessionId, bundleId, windowId });
    if (!pointer) return;
    const point = result?.outcome !== "unsupported" && shot?.bounds && Array.isArray(framePt)
      ? windowLocalToScreen(frameToWindowLocal(framePt, shot), shot.bounds) : null;
    if (point) callPointer(click ? "clicked" : "moved", { sessionId, bundleId, windowId, ...point });
    else if (hid) callPointer("restore", { sessionId, bundleId, windowId });
  };
  /** Locks gone (app_release, a revoked app, a forgotten session): a window nobody holds any more loses its cursor. */
  const pointerReleased = (keys) => {
    for (const windowId of new Set(keys.map((key) => Number(key.slice(key.lastIndexOf(":") + 1))))) {
      if (Number.isInteger(windowId) && !heldByAnyone(windowId)) callPointer("released", { windowId });
    }
  };
  const grantsFor = (sessionId) => {
    if (typeof sessionId !== "string" || !sessionId) throw coded("invalid_params", "sessionId is required.");
    if (!sessions.has(sessionId)) sessions.set(sessionId, createGrants({ refuse: selfBundleIds }));
    return sessions.get(sessionId);
  };
  const granted = (sessionId, bundleId) => {
    if (!validBundleId(bundleId)) throw coded("invalid_params", "bundleId is required.");
    // Official: the Dock is not an app_* target (pressing it activates apps); display-scope + Finder's grant reach it.
    if (DESKTOP_SHELL_PROCESSES.has(bundleId)) throw coded("desktop_shell", DESKTOP_SHELL_REFUSAL);
    if (!grantsFor(sessionId).has(bundleId)) throw coded("app_not_granted", `${bundleId} is not in this session’s granted applications. Call request_access first.`);
  };
  // ── The focus-steal guard (official armFocusStealGuard; focus-guard.cjs) ──
  const guard = focusGuard ?? createFocusGuard({ native, log });
  /**
   * An app_* action that reaches the app, inside the guard: who is in front is read before it, the checks are armed
   * after it, and a target already in front by then is said in the result (cameToFront, tellUser, focusNote).
   */
  const withFocusGuard = async (sessionId, bundleId, run) => {
    const token = await guard.before(bundleId);
    let result, front = { cameToFront: false };
    try { result = await run(); }
    finally { front = await guard.after(token).catch(() => ({ cameToFront: false })); }
    if (!front.cameToFront || !result || typeof result !== "object") return result;
    return { ...result, cameToFront: true, tellUser: true, focusNote: frontNote(appName(sessionId, bundleId)) };
  };

  /**
   * The apps whose windows this session holds (its app locks: windows it took an app_screenshot of and has not
   * app_release'd), each bundle once (official appLockHeld).
   */
  const appLockBundles = (sessionId) => {
    const state = windows.get(sessionId);
    if (!state) return [];
    return [...new Set([...state.shots.keys()].map((key) => key.slice(0, key.lastIndexOf(":"))))];
  };
  const appName = (sessionId, bundleId) => sessions.get(sessionId)?.list().find((app) => app.bundleId === bundleId)?.displayName || bundleId;
  /** The granted tier of an app, or null when it isn't granted (official Ue()). */
  const grantedTier = (sessionId, bundleId) => {
    const grants = sessions.get(sessionId);
    return typeof bundleId === "string" && grants?.has(bundleId) ? grants.tierOf(bundleId) ?? tierFor(bundleId) : null;
  };
  /** Official ot() where the gates call it: a click-tier app in front (or under the point) empties the clipboard. */
  const clipboardGuard = async (sessionId, clickTier) => {
    if (gates.clipboardGuard !== false) await clip.guard(sessionId, clickTier);
  };

  /**
   * The screen-wide type's paste (official hi() + DPr()): the frontmost app checked once more before anything is
   * written (else delivery_focus_check_failed, "Paste aborted before delivery"), secure input checked (a password field:
   * never through the clipboard), then clipboard.cjs paste with ⌘V natively gated and aimed at the approved app.
   * {done: true, result} when the answer is final (pasted, the focus moved, stopped); {done: false, reasonCode} when
   * nothing reached the app and it may be typed instead.
   */
  /**
   * Screen-wide input of this session must stop: its tool call was aborted, or it no longer holds the display lock (the
   * strip's Stop, the user's Esc, the turn ending, release_full_control). executor.deliver asks it before every attempt.
   */
  const displayStopped = (sessionId, signal) => () => signal?.aborted === true || !fullControl.isHeldBy(sessionId);
  const pasteText = async (sessionId, text, front, signal) => {
    if (signal?.aborted) return { done: true, result: keyboardAborted("type", { typed: 0, total: segmentGraphemes(text).length }) };
    const now = await native.call("frontmostApp").catch(() => null);
    if (Number.isInteger(front?.pid) && now?.pid !== front.pid) {
      const who = typeof now?.bundleId === "string" ? `"${now.bundleId}" came to the front` : "no app was in front";
      return { done: true, result: refusal("delivery_focus_check_failed", "delivery_focus_check_failed",
        `Paste aborted before delivery: ${who} after the check. Keystrokes go wherever the keyboard focus is, and they were approved for "${front?.bundleId ?? "the app in front"}" only, so nothing was sent. Take a screenshot to see where the focus is before trying again.`,
        { delivered: false, frontmostBundleId: now?.bundleId ?? null }) };
    }
    const probe = await native.call("probe").catch(() => null);
    if (!probe || probe.secureInput === true) return { done: false, reasonCode: probe ? "secure_input_active" : "probe_failed" };
    const params = { ...PASTE_CHORD, repeat: 1, ...(Number.isInteger(front?.pid) ? { frontPid: front.pid } : {}) };
    let pressed;
    try { pressed = await clip.paste(text, () => deliver(() => native.call("hidKey", params), { ...(wait ? { wait } : {}), stopped: displayStopped(sessionId, signal) })); }
    catch (error) { return { done: false, reasonCode: typeof error?.code === "string" ? error.code : "paste_failed" }; }
    if (pressed?.outcome === "ok") return { done: true, result: { ...pressed, outcome: "ok", viaClipboard: true, text: "Typed (via clipboard)." } };
    if (pressed?.delivered === true) return { done: true, result: { ...pressed, viaClipboard: true } };
    if (pressed?.reasonCode === "delivery_focus_check_failed" || pressed?.reasonCode === "aborted") {
      const result = pressed.reasonCode === "aborted" ? keyboardAborted("type", { typed: 0, total: segmentGraphemes(text).length })
        : refusal("delivery_focus_check_failed", "delivery_focus_check_failed", `Paste aborted before delivery: ${typeof pressed.frontmostBundleId === "string" ? `"${pressed.frontmostBundleId}" came to the front` : "no app was in front"}, so nothing was sent. Take a screenshot to see where the focus is before trying again.`, { frontmostBundleId: pressed.frontmostBundleId ?? null });
      return { done: true, result: { ...result, delivered: false } };
    }
    return { done: false, reasonCode: pressed?.reasonCode ?? "paste_failed" };
  };

  /**
   * The right click's answer (official fr() after Y()): a locked screen is said as such, otherwise the fixed refusal.
   * Nothing is sent to the app.
   */
  const contextMenuRefusal = async (windowId) => {
    const base = { outcome: "unsupported", path: "unavailable", blocked: true, delivered: false, windowId };
    if ((await native.call("probe").catch(() => null))?.screenLocked === true) {
      return { ...base, reasonCode: "screen_locked", errorKind: "state_conflict", message: SCREEN_LOCKED_ACTION };
    }
    return { ...base, reasonCode: "context_menu", errorKind: "feature_unavailable", message: CONTEXT_MENU_REFUSAL };
  };

  const service = {
    grantsFor,
    appLockBundles,
    /** The sessions holding app locks (the Esc emergency stop stops them too, official qNr). */
    appLockSessions: () => [...windows.keys()].filter((id) => appLockBundles(id).length > 0),
    /**
     * Another session holds the display lock (official §1.4.3: app_* refuse with cu_lock_held while another session
     * has full-screen control; app_release excepted). null when this session's app_* tools may act.
     */
    displayLockedByOther(sessionId) {
      const holder = fullControl.holder();
      if (!holder || holder === sessionId) return null;
      return { outcome: "unsupported", reasonCode: "cu_lock_held", errorKind: "state_conflict",
        message: "Another Claude session has full-screen control of the computer right now, and that blocks background app control too: every app and window refuses the same way until it is done. Wait for that session to finish, or ask the user to stop it." };
    },
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
      const saveRefused = await appSaveGate({ bundleId, windowId: wid, shot, framePt: coordinate, action: { kind: "drag" } });
      if (saveRefused) return saveRefused;
      await pointerAside(wid);
      const result = await withFocusGuard(sessionId, bundleId, () => asInput(() => deliver(() => native.call("drag", {
        bundleId, windowId: wid, ...coordinates, button, grantedBundleIds: grantsFor(sessionId).allowedBundleIds(),
      }), wait ? { wait } : {})));
      // Official: where a drag may not start (a link / picture, a pop-up menu) is said in the official words.
      const start = DRAG_START_REFUSALS[result?.reasonCode];
      if (result?.outcome === "unsupported" && start) {
        rememberPoint(state, `${bundleId}:${wid}`, toCoordinate, result);
        pointerLanded(sessionId, bundleId, wid, shot, toCoordinate, result);
        return { ...result, errorKind: "feature_unavailable", message: start(appName(sessionId, bundleId)), blocked: true, windowId: wid };
      }
      const readback = dragReadback(result);
      rememberPoint(state, `${bundleId}:${wid}`, toCoordinate, readback);
      pointerLanded(sessionId, bundleId, wid, shot, toCoordinate, readback);
      return { ...readback, windowId: wid };
    },
    forgetSession: (sessionId) => {
      const held = [...(windows.get(sessionId)?.shots.keys() ?? [])];
      sessions.delete(sessionId); windows.delete(sessionId); fullControl.forget(sessionId);
      pointerReleased(held);
      highlightReleased(sessionId, held);
    },
    fullControl,
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
    async captureScreen(sessionId, { displayId, scale, region } = {}) {
      const allowedBundleIds = grantsFor(sessionId).allowedBundleIds();
      const params = { displayId: checkId(displayId, "displayId"), allowedBundleIds, scale: checkScale(scale), ...(region ? { region } : {}) };
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
      const locked = !state.shots.has(key);
      state.shots.set(key, shot);
      // Official IPa(): a newly held window shows the cursor at its centre.
      const b = shot.bounds;
      if (locked && b && [b.x, b.y, b.width, b.height].every(Number.isFinite)) {
        callPointer("moved", { sessionId, bundleId, windowId: shot.windowId, x: b.x + b.width / 2, y: b.y + b.height / 2 });
      }
      state.last.set(bundleId, shot.windowId);
      state.target = { bundleId, windowId: shot.windowId };
      callHighlight("target", { sessionId, bundleId, windowId: shot.windowId });
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
      pointerReleased(released);
      highlightReleased(sessionId, released);
      return { released };
    },
    /**
     * app_click on the AX rung. Refusals come back as {outcome: "unsupported", reasonCode, blocked: true}.
     * button "right" (official fr()): the target is checked as for any click (grant at the click tier, the arguments,
     * the screenshot, the screen lock, the window), then refused — context_menu, feature_unavailable, the official
     * message: a context menu would bring the app to the front. Nothing reaches the app. Only a single left click has a
     * raw rung. axOnly: no raw rung behind the reason policy (a fallback reason is refused), as the agent tool asks.
     * One of coordinate / element_index / target is required: there is no implicit "the same point as last time" (in a
     * form that is a second submit).
     */
    async appClick(sessionId, { bundleId, windowId, coordinate, element_index: elementIndex, target, count = 1, button = "left", dryRun = false, axOnly = false } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "left_click");
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
          // The native cache is per window, not per session: summaryId refuses an index from a summary another
          // screenshot has since replaced, and expectRole checks the element is still the one listed here.
          params.expectRole = shot.elements[elementIndex].role;
          if (Number.isInteger(shot.summaryId)) params.summaryId = shot.summaryId;
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
      if (button === "right") return contextMenuRefusal(wid);
      const gate = actionGate(await native.call("probe"), "left_click");
      if (gate) return { outcome: "unsupported", reasonCode: gate, path: "unavailable", blocked: true };
      const savePoint = target === "focused" ? null : elementIndex !== undefined ? elementCenter(shot.elements[elementIndex]) : coordinate;
      const saveRefused = await appSaveGate({ bundleId, windowId: wid, shot, framePt: savePoint, action: { kind: "click", button, count } });
      if (saveRefused) return saveRefused;
      // The raw rung (reason-policy FALLBACK only): a coordinate click at the same point, both forms from budget.cjs.
      const raw = point && shot && axOnly !== true && button === "left" && count === 1 ? () => native.call("rawClick", {
        bundleId, windowId: wid, count, button, winLocalPt: point, screenPt: windowLocalToScreen(point, shot.bounds),
        grantedBundleIds: grantsFor(sessionId).allowedBundleIds(),
      }) : null;
      if (target !== "focused") await pointerAside(wid);
      const result = await withFocusGuard(sessionId, bundleId, () => asInput(() => execute({ ax: () => native.call("axClick", params), raw, focusedPointer: target === "focused", log,
        context: { op: "left_click", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}) })));
      const framePt = target === "focused" ? null : elementIndex !== undefined ? elementCenter(shot.elements[elementIndex]) : coordinate;
      rememberPoint(state, `${bundleId}:${wid}`, framePt, result);
      pointerLanded(sessionId, bundleId, wid, shot, framePt, result, { click: true, hid: target !== "focused" });
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
          if (Number.isInteger(shot.summaryId)) params.summaryId = shot.summaryId;
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
      const typePoint = params.focused ? null : elementIndex !== undefined ? elementCenter(shot.elements[elementIndex]) : coordinate;
      const saveRefused = await appSaveGate({ bundleId, windowId: wid, shot, framePt: typePoint, action: { kind: "type", text } });
      if (saveRefused) return saveRefused;
      const raw = (axResult) => native.call("rawType", { ...params, axReason: axResult?.reasonCode, grantedBundleIds: grantsFor(sessionId).allowedBundleIds() });
      const ax = async () => {
        const result = await native.call("axType", params);
        if (result?.reasonCode !== "secure_input_active" || (await native.call("probe"))?.secureInput === true) return result;
        return { ...result, reasonCode: "no_text_target", secureTextField: true };
      };
      if (!params.focused) await pointerAside(wid);
      const result = await withFocusGuard(sessionId, bundleId, () => asInput(() => execute({ ax, raw, log,
        context: { op: "type", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}) })));
      const framePt = params.focused ? null : elementIndex !== undefined ? elementCenter(shot.elements[elementIndex]) : coordinate;
      rememberPoint(state, `${bundleId}:${result.windowId ?? wid}`, framePt, result);
      pointerLanded(sessionId, bundleId, wid, shot, framePt, result, { hid: !params.focused });
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
      const saveRefused = await appSaveGate({ bundleId, windowId: wid, action: { kind: "focus" } });
      if (saveRefused) return { ...saveRefused, focused: false };
      const result = await withFocusGuard(sessionId, bundleId, () => axHelper.call("focus", { bundleId, ...(wid !== undefined ? { windowId: wid } : {}) }));
      if (result?.outcome === "ok" && Number.isInteger(result.window_id)) state.last.set(bundleId, result.window_id);
      return result;
    },
    /**
     * app_menu (official Nn()): one of
     *   path  [title, …]   walk the menu bar by titles (any case, trailing … ignored) and press the leaf item (its
     *                      command runs). A path that ends at a menu-bar title or a submenu presses nothing and opens
     *                      nothing: path_ends_at_submenu (bad_args) with that menu's items, read without opening it
     *   list  true | null | title | [title, …]   the items under that path (the menu bar titles for true / null); read-only
     * Accessibility only (AXPress on the leaf): no mouse event, no menu opened (an open menu tracks the mouse and takes
     * the keyboard), the app is not brought forward.
     */
    async appMenu(sessionId, { bundleId, path, list } = {}) {
      granted(sessionId, bundleId);
      const modes = [path !== undefined, list !== undefined].filter(Boolean).length;
      if (modes !== 1) throw coded("invalid_params", "Give exactly one of path or list.");
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
      const steps = titles(path, "path");
      if (!steps.length) throw coded("invalid_params", "path must name the menu bar title and the item, e.g. [\"File\", \"New Folder\"].");
      const gate = actionGate(await native.call("probe"), "menu");
      if (gate) return { outcome: "unsupported", reasonCode: gate, blocked: true };
      // Official Ut {kind: "menu"}: the window the command acts on — the one this session works in, then the app's main.
      let menuWindow = windows.get(sessionId)?.last.get(bundleId);
      if (menuWindow === undefined && saveGuard.available) {
        const listed = (await native.call("listWindows", { bundleId }).catch(() => null))?.windows ?? [];
        menuWindow = (listed.find((w) => w && w.is_auxiliary !== true) ?? listed[0])?.window_id;
      }
      const saveRefused = await appSaveGate({ bundleId, windowId: menuWindow, action: { kind: "menu", window: "locked" } });
      if (saveRefused) return saveRefused;
      const result = await withFocusGuard(sessionId, bundleId, () => asInput(() => axHelper.call("menu", { bundleId, path: steps })));
      if (result?.reasonCode !== "path_ends_at_submenu") return result;
      // Official Nn(): "Menu path X(u) ends at a submenu, not a pressable item. Nothing was pressed." (bad_args); the titles
      // as JSON arrays, as official X() has them (they are the app's data, not instructions).
      const entries = (Array.isArray(result.items) ? result.items : []).map((item) => item?.title).filter((title) => typeof title === "string");
      return { ...result, errorKind: "bad_args", blocked: true,
        message: `Menu path ${JSON.stringify(steps)} ends at a submenu, not a pressable item. Nothing was pressed. Extend \`path\` with one of its entries: ${JSON.stringify(entries)}.` };
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
    /**
     * app_key (official §1.6.1): one combo. Refusals before anything is sent come back as {outcome: "unsupported",
     * reasonCode, errorKind, message, blocked: true}: bad_args (not exactly one key, a bad target), grant_flag_required
     * (a system combo without the systemKeyCombos flag), state_conflict (a clipboard combo: use app_type),
     * secure_input_active / screen_locked (the session gates). Then the AX rung (native axKey) and, for
     * no_ax_key_action, the raw rung (native rawKey, one keystroke to the window's keyboard focus, unverified).
     * Addressing: coordinate or element_index of the last app_screenshot, target "focused", or — none given — the
     * point of the last app_click / app_type / app_drag (its end) / app_key in this window that ran (rememberPoint;
     * official: no default without one, and none after a target "focused" action).
     */
    async appKey(sessionId, { bundleId, windowId, combo, coordinate, element_index: elementIndex, target } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "key");
      const refuse = (reasonCode, errorKind, message, extra = {}) => ({ outcome: "unsupported", reasonCode, errorKind, message,
        path: "unavailable", blocked: true, ...extra });
      if (typeof combo !== "string" || !combo.trim()) return refuse("bad_args", "bad_args", "\"combo\" must be a string.");
      const normalized = normalizeCombo(combo);
      if (mainKeyCount(normalized) !== 1) {
        return refuse("bad_args", "bad_args", "app_key: `combo` must name exactly one key (plus modifiers); send repeated keys as separate app_key calls.", { combo: normalized });
      }
      if (isSystemCombo(normalized) && grantsFor(sessionId).flags().systemKeyCombos !== true) {
        return refuse("grant_flag_required", "grant_flag_required", `"${normalized}" is a system key combo. The user has not granted the systemKeyCombos flag this session.`, { combo: normalized });
      }
      if (clipboardFlags(normalized).size > 0) {
        return refuse("state_conflict", "state_conflict", `"${normalized}" would touch the system clipboard. Use app_type for text entry.`, { combo: normalized });
      }
      const given = [coordinate !== undefined, elementIndex !== undefined, target !== undefined].filter(Boolean).length;
      if (given > 1) return refuse("bad_args", "bad_args", "Provide at most one of: coordinate, element_index, or target: \"focused\".");
      if (target !== undefined && target !== "focused") return refuse("bad_args", "bad_args", "`target` must be \"focused\" or omitted.");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = wid === undefined ? undefined : state.shots.get(`${bundleId}:${wid}`);
      const params = { bundleId, ...(wid !== undefined ? { windowId: wid } : {}), combo: normalized };
      let framePt = null, aimed;
      if (target === "focused") {
        params.focused = true;
        aimed = "the app's focused element";
      } else if (elementIndex !== undefined) {
        if (!shot) return refuse("bad_args", "bad_args", "element_index requires a prior app_screenshot of this window.");
        const element = Number.isInteger(elementIndex) ? shot.elements?.[elementIndex] : undefined;
        if (!element) return refuse("bad_args", "bad_args", `element_index ${elementIndex} is out of range (AX summary has ${shot.elements?.length ?? 0} elements).`);
        params.elementIndex = elementIndex;
        params.expectRole = element.role;
        if (Number.isInteger(shot.summaryId)) params.summaryId = shot.summaryId;
        framePt = elementCenter(element);
        aimed = `element_index ${elementIndex}`;
      } else {
        if (coordinate === undefined) framePt = wid === undefined ? undefined : state.points.get(`${bundleId}:${wid}`);
        else if (!shot) return refuse("bad_args", "bad_args", "coordinate values are pixels in the latest app_screenshot's coordinate frame — take an app_screenshot of this window first.");
        else framePt = coordinate;
        if (!framePt || !shot) {
          return refuse("bad_args", "bad_args", "No coordinate, element_index, or target given and no prior action on this window to default to. Provide a coordinate or take an app_screenshot first.");
        }
        if (!Array.isArray(framePt) || framePt.length !== 2 || !inFrame(framePt, shot)) {
          return refuse("bad_args", "bad_args", `coordinate must be [x, y] inside the screenshot's ${shot.frameWidth}×${shot.frameHeight} frame.`);
        }
        params.winLocalPt = frameToWindowLocal(framePt, shot);
        aimed = `(${Math.round(framePt[0])}, ${Math.round(framePt[1])})`;
      }
      const gate = actionGate(await native.call("probe"), "key");
      if (gate === "secure_input_active") {
        return refuse(gate, "state_conflict", "A password field has secure input active; keyboard actions are blocked. Ask the user to dismiss it, or try again shortly.", { aimed });
      }
      if (gate) return refuse(gate, "feature_unavailable", null, { aimed });
      const saveRefused = await appSaveGate({ bundleId, windowId: wid, shot, framePt: params.focused ? null : framePt, action: { kind: "key", combo: normalized } });
      if (saveRefused) return { ...saveRefused, combo: normalized, aimed };
      if (!params.focused) await pointerAside(wid);
      const result = await withFocusGuard(sessionId, bundleId, () => asInput(() => execute({
        ax: () => native.call("axKey", params),
        // A raw refusal before the native side looked at the target still names the element the AX rung saw.
        raw: async (axResult) => {
          const sent = await native.call("rawKey", { ...params, grantedBundleIds: grantsFor(sessionId).allowedBundleIds() });
          const seen = Object.fromEntries(["role", "subrole", "title", "descentPath"].filter((k) => axResult?.[k] !== undefined).map((k) => [k, axResult[k]]));
          return { ...(sent?.role === undefined ? seen : {}), ...(axResult?.axWriteIgnored ? { axWriteIgnored: true } : {}), ...sent };
        },
        log, context: { op: "key", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}),
      })));
      rememberPoint(state, `${bundleId}:${result.windowId ?? wid}`, framePt, result);
      pointerLanded(sessionId, bundleId, wid, shot, framePt, result, { hid: !params.focused });
      return { ...result, combo: normalized, aimed, ...(result.windowId === undefined && wid !== undefined ? { windowId: wid } : {}) };
    },
    /**
     * app_scroll (official §1.6.2): vertical only. A non-zero dx is refused before anything (feature_unavailable,
     * reasonCode horizontal_scroll, the official sentence). The native axScroll moves the vertical scroll bar of the
     * scroll area at the address by dy × 5 % of its range (clamped) and reads it back: ok, ineffective
     * (scrollbar_unchanged, atLimit at an end; ax_error with axError) or unsupported (canvas: no vertical scroll bar up
     * to the window; window states; ownership). There is no raw rung. Addressing as app_key (coordinate / element_index
     * / target "focused" / the last action's point, else the official bad_args). Official: scroll skips the target
     * precheck and is gated on neither secure input nor user input; the native side refuses a locked screen.
     */
    async appScroll(sessionId, { bundleId, windowId, dy, dx, coordinate, element_index: elementIndex, target } = {}) {
      granted(sessionId, bundleId);
      checkTier(bundleId, grantsFor(sessionId).tierOf(bundleId), "scroll");
      const refuse = (reasonCode, errorKind, message, extra = {}) => ({ outcome: "unsupported", reasonCode, errorKind, message,
        path: "unavailable", blocked: true, ...extra });
      // Official: a dx that is a number other than 0 is refused; dy that is not a number counts as 0.
      if (typeof dx === "number" && dx !== 0) {
        return refuse("horizontal_scroll", "feature_unavailable", "app_scroll only supports vertical (dy). Horizontal scroll is not implemented for the background AX path — use display-scope `scroll`, or scroll vertically and rely on the app's auto-scroll.");
      }
      const amount = typeof dy === "number" ? dy : 0;
      if (!Number.isFinite(amount)) return refuse("bad_args", "bad_args", "\"dy\" must be a finite number.");
      const given = [coordinate !== undefined, elementIndex !== undefined, target !== undefined].filter(Boolean).length;
      if (given > 1) return refuse("bad_args", "bad_args", "Provide at most one of: coordinate, element_index, or target: \"focused\".");
      if (target !== undefined && target !== "focused") return refuse("bad_args", "bad_args", "`target` must be \"focused\" or omitted.");
      const state = stateFor(sessionId);
      const wid = checkId(windowId, "windowId") ?? state.last.get(bundleId);
      const shot = wid === undefined ? undefined : state.shots.get(`${bundleId}:${wid}`);
      const params = { bundleId, ...(wid !== undefined ? { windowId: wid } : {}), dy: amount };
      let framePt = null, aimed;
      if (target === "focused") {
        params.focused = true;
        aimed = "the app's focused element";
      } else if (elementIndex !== undefined) {
        if (!shot) return refuse("bad_args", "bad_args", "element_index requires a prior app_screenshot of this window.");
        const element = Number.isInteger(elementIndex) ? shot.elements?.[elementIndex] : undefined;
        if (!element) return refuse("bad_args", "bad_args", `element_index ${elementIndex} is out of range (AX summary has ${shot.elements?.length ?? 0} elements).`);
        params.elementIndex = elementIndex;
        params.expectRole = element.role;
        if (Number.isInteger(shot.summaryId)) params.summaryId = shot.summaryId;
        framePt = elementCenter(element);
        aimed = `element_index ${elementIndex}`;
      } else {
        if (coordinate === undefined) framePt = wid === undefined ? undefined : state.points.get(`${bundleId}:${wid}`);
        else if (!shot) return refuse("bad_args", "bad_args", "coordinate values are pixels in the latest app_screenshot's coordinate frame — take an app_screenshot of this window first.");
        else framePt = coordinate;
        if (!framePt || !shot) {
          return refuse("bad_args", "bad_args", "No coordinate, element_index, or target given and no prior action on this window to default to. Provide a coordinate or take an app_screenshot first.");
        }
        if (!Array.isArray(framePt) || framePt.length !== 2 || !inFrame(framePt, shot)) {
          return refuse("bad_args", "bad_args", `coordinate must be [x, y] inside the screenshot's ${shot.frameWidth}×${shot.frameHeight} frame.`);
        }
        params.winLocalPt = frameToWindowLocal(framePt, shot);
        aimed = `(${Math.round(framePt[0])}, ${Math.round(framePt[1])})`;
      }
      if (!params.focused) await pointerAside(wid);
      const result = await withFocusGuard(sessionId, bundleId, () => execute({ ax: () => native.call("axScroll", params), log,
        context: { op: "scroll", bundleId, windowId: wid }, ...(wait ? { wait } : {}), ...(decide ? { decide } : {}) }));
      // Official ir(): the point is kept unless the action was refused or its Accessibility call errored.
      if (!(result.outcome === "ineffective" && result.axError && result.axError !== "success")) {
        rememberPoint(state, `${bundleId}:${result.windowId ?? wid}`, framePt, result);
      }
      // Official: a scroll whose Accessibility call errored did not land there.
      const landed = !(result.outcome === "ineffective" && result.axError && result.axError !== "success");
      pointerLanded(sessionId, bundleId, wid, shot, landed ? framePt : null, result, { hid: !params.focused });
      return { ...result, dy: amount, aimed, ...(result.windowId === undefined && wid !== undefined ? { windowId: wid } : {}) };
    },
    /**
     * app_bring_to_current_space (official §1.6.3, BEf0UhNC In()): a minimized window / hidden app comes back behind
     * the window the user is working in (native showWindowBehindTheFrontWindow), a window on another Space is moved
     * to the current one after a dry run (native bringWindowToActiveSpace). The app is never activated; should it come
     * to the front anyway, the focus-steal guard puts the user's app back (shown_and_now_in_front says so). Messages are
     * the official ones; refusals are {outcome: "unsupported", reasonCode, errorKind, message}.
     */
    async appBringToCurrentSpace(sessionId, { bundleId, windowId } = {}) {
      granted(sessionId, bundleId);
      const app = grantsFor(sessionId).list().find((entry) => entry.bundleId === bundleId)?.displayName || bundleId;
      const refuse = (reasonCode, errorKind, message, extra = {}) => ({ outcome: "unsupported", reasonCode, errorKind, message,
        blocked: true, ...(Number.isInteger(windowId) ? { windowId } : {}), ...extra });
      const done = (how, message, extra = {}) => ({ outcome: "ok", reasonCode: null, how, message, windowId, ...extra });
      const locked = async () => (await native.call("probe"))?.screenLocked === true;
      if (await locked()) {
        return refuse("screen_locked", "state_conflict", "The screen is locked. app_screenshot continues to work in background mode, but moving a window between Spaces needs the screen unlocked. Screenshot to observe; try again once the user returns.");
      }
      if (typeof windowId !== "number" || !Number.isInteger(windowId)) {
        return refuse("bad_args", "bad_args", "window_id (an integer from app_list_windows) is required.");
      }
      const find = async () => ((await native.call("listWindows", { bundleId }))?.windows ?? []).find((w) => w.window_id === windowId);
      const window = await find();
      if (!window) {
        return refuse("window_not_in_app", "app_not_granted", `Window ${windowId} doesn't belong to ${app} (or no longer exists). Take a fresh app_list_windows and pass one of that app's window ids.`);
      }
      const LOCKED_BEFORE_MOVE = "The screen locked before the move ran, so the window was not moved. app_screenshot continues to work in background mode; try again once the user returns and the screen is unlocked.";
      const parked = (w) => (w?.is_hidden === true ? "app_hidden" : w?.is_minimized === true ? "window_minimized" : undefined);
      const kind = parked(window);
      if (kind !== undefined) {
        if (await locked()) return refuse("screen_locked", "state_conflict", LOCKED_BEFORE_MOVE);
        // Official: a window shown from the Dock may bring its app to the front; the guard puts the user's app back.
        const shown = await withFocusGuard(sessionId, bundleId, () => native.call("showWindowBehindTheFrontWindow", { bundleId, windowId }));
        if (shown?.screenLocked === true) return refuse("screen_locked", "state_conflict", LOCKED_BEFORE_MOVE);
        const code = Object.hasOwn(SHOWN, shown?.code) ? shown.code : "unavailable";
        const back = SHOWN[code].cameBack ? await find() : undefined;
        if (back === undefined || parked(back) !== undefined) {
          const reason = SHOWN[code].cameBack ? "still_parked" : code;
          return refuse(reason, "state_conflict", `Window ${windowId} of ${app} was not brought back (the ${kind === "app_hidden" ? "app is hidden" : "window is minimized"}). ${SHOWN[reason].text}`, { shown: code });
        }
        if (back.is_off_space === true) {
          return done(code, `Window ${windowId} of ${app} is no longer put away, but it is on another Space. Call app_bring_to_current_space again to bring it here.`, { shown: code, offSpace: true });
        }
        return done(code, `Window ${windowId} of ${app} is back on screen, ${SHOWN[code].text}. Take a fresh app_screenshot next: the one you have may be out of date.`,
          { shown: code, ...(code === "shown_and_now_in_front" || code === "shown_above_the_front_window" ? { tellUser: true } : {}) });
      }
      const spaceRefusal = (answer) => {
        const code = answer?.code;
        if (code === undefined || code === "move_failed") return undefined;
        if (code === "owner_mismatch") return refuse(code, "app_not_granted", `That window no longer belongs to ${app}. Take a fresh app_list_windows and pass one of that app's window ids.`);
        if (code === "space_unclassifiable") return refuse(code, "state_conflict", "Couldn't determine which Space that window is on right now (a transient system query failure). Take a fresh app_list_windows and try again.");
        if (code === "fullscreen_space") return refuse(code, "state_conflict", "The user's current Space is a full-screen app, and a window can't be moved into a full-screen Space. Ask the user to switch to a regular desktop Space (or to bring the window there themselves).");
        return refuse("op_unavailable", "feature_unavailable", "Moving windows between Spaces isn't available on this macOS version. Ask the user to bring the window to the current Space themselves, or use open_application and then the display-scope tools.",
          answer?.windowServerIgnored ? { windowServerIgnored: true } : {});
      };
      const dry = await native.call("bringWindowToActiveSpace", { bundleId, windowId, dryRun: true });
      if (dry?.alreadyHere === true) {
        return done("already_here", `Window ${windowId} is already on the current Space — no move needed. Take a fresh app_screenshot and act on it directly.`);
      }
      const dryRefusal = spaceRefusal(dry);
      if (dryRefusal) return dryRefusal;
      if (await locked()) return refuse("screen_locked", "state_conflict", LOCKED_BEFORE_MOVE);
      const owner = (await native.call("windowOwner", { windowId }))?.owner;
      if (!owner || owner.bundleId !== bundleId) {
        return refuse("window_changed", "state_conflict", "That window changed before the move ran (it was closed, moved, or reused for different content), so nothing was moved. Take a fresh app_list_windows and try again if it's still needed.");
      }
      const moved = await withFocusGuard(sessionId, bundleId, () => native.call("bringWindowToActiveSpace", { bundleId, windowId }));
      if (moved?.screenLocked === true) return refuse("screen_locked", "state_conflict", LOCKED_BEFORE_MOVE);
      if (moved?.alreadyHere === true) {
        return done("already_here", `Window ${windowId} was already on the current Space by the time the move ran — take a fresh app_screenshot and act on it directly.`);
      }
      const movedRefusal = spaceRefusal(moved);
      // Read back: the window is listed and no longer off-Space.
      const after = moved?.moved === true && !movedRefusal ? await find() : undefined;
      if (movedRefusal || !after || after.is_off_space === true) {
        return movedRefusal ?? refuse("move_not_confirmed", "state_conflict", "The window did not appear on the current Space within the expected time. It may still be settling — take a fresh app_screenshot to check before assuming it failed.");
      }
      return done("moved", `Window ${windowId} of ${app} is now on the current Space (the app did not take focus). Take a fresh app_screenshot next — the window is here and actionable.`);
    },
    // ── Full control (official §1.4): request / release, and the display-scope common layer ────────────────────────
    /**
     * hideBeforeAction (official prepareForAction(allowedApps, selectedDisplayId), V() / ui() / Gi() / ti()): the apps
     * outside this session's allowlist with a window on the selected display are hidden (this app and the system's UI
     * never). What was hidden is remembered for the turn's end (restoreHiddenApps) and for the next screenshot's note.
     * Off with the hideBeforeAction sub-gate, or when the native module can't do it. Returns the bundle ids hidden now.
     */
    async prepareForAction(sessionId) {
      if (gates.hideBeforeAction === false || !hideAvailable) return [];
      let answer;
      try {
        answer = await native.call("prepareDisplay", { allowedBundleIds: grantsFor(sessionId).allowedBundleIds(), hostBundleIds: selfBundleIds,
          ...(Number.isInteger(service.selectedDisplay(sessionId)) ? { displayId: service.selectedDisplay(sessionId) } : {}) });
      } catch (error) {
        if (error?.code === "unknown_method" || error?.code === "native_unavailable" || typeof error?.code !== "string") hideAvailable = false;
        else log.warn?.("[computer-use] prepareForAction failed, continuing to action", error?.message ?? error);
        return [];
      }
      const hidden = (Array.isArray(answer?.hidden) ? answer.hidden : []).filter((app) => validBundleId(app?.bundleId));
      if (hidden.length) {
        const record = hiddenApps.get(sessionId) ?? { turn: new Map(), pending: new Map() };
        for (const app of hidden) {
          const name = typeof app.name === "string" ? app.name : null;
          record.turn.set(app.bundleId, name);
          record.pending.set(app.bundleId, name);
        }
        hiddenApps.set(sessionId, record);
      }
      return hidden.map((app) => app.bundleId);
    },
    /**
     * The screenshot's note on hidden apps (official oi() over ai()): the apps hidden since the last screenshot, said
     * once (the pending list is drained). null when none were.
     */
    hiddenNote(sessionId) {
      const record = hiddenApps.get(sessionId);
      if (!record?.pending.size) return null;
      const entries = [...record.pending];
      record.pending.clear();
      const named = [], unnamed = [];
      for (const [bundleId, name] of entries) {
        const clean = cleanName(name);
        if (clean) named.push(clean); else unnamed.push(cleanName(bundleId.split(".").pop()) ?? "(name withheld)");
      }
      const notes = [];
      if (named.length) {
        const one = named.length === 1;
        notes.push(`${named.map((n) => `"${n}"`).join(", ")} ${one ? "was" : "were"} open and got hidden before this screenshot (not in the session allowlist). If a previous action was meant to open ${one ? "it" : "one of them"}, that's why you don't see it — call request_access to add ${one ? "it" : "them"}.`);
      }
      if (unnamed.length) {
        const one = unnamed.length === 1;
        notes.push(`${unnamed.map((n) => `"${n}"`).join(", ")} ${one ? "was" : "were"} ${named.length ? "also " : ""}hidden. ${one ? "This process owns" : "These processes own"} the visible ${one ? "window" : "windows"} but ${one ? "isn't" : "aren't"} in the installed-apps list — likely a worker process spawned by a launcher you already granted. Pass the exact ${one ? "basename" : "basenames"} above to request_access.`);
      }
      return notes.join(" ");
    },
    /**
     * The turn ended or the session was stopped (official onResult / releaseTurnScopedState / leavingRunning): the apps
     * hidden during it come back when autoUnhide is on (Settings › "Unhide apps when Claude finishes", official
     * chicagoAutoUnhide), and the record is cleared either way. Returns the bundle ids asked to come back.
     */
    async restoreHiddenApps(sessionId, { autoUnhide = true } = {}) {
      const record = hiddenApps.get(sessionId);
      hiddenApps.delete(sessionId);
      if (!record?.turn.size || autoUnhide === false) return [];
      const bundleIds = [...record.turn.keys()];
      try { await native.call("unhideApps", { bundleIds }); } catch (error) { log.warn?.("[computer-use] auto-unhide at turn end failed", error?.message ?? error); }
      return bundleIds;
    },
    /** Every session with apps hidden this turn (a dropped connection restores them all). */
    sessionsWithHiddenApps: () => [...hiddenApps.keys()],
    /**
     * The access card's willHide (official previewHideSet over the granted + requested apps): what the next full-screen
     * action would hide, nothing hidden. [] when the sub-gate is off or the native module can't tell.
     */
    async previewHideSet(sessionId, bundleIds = []) {
      if (gates.hideBeforeAction === false || !hideAvailable) return [];
      try {
        const exempt = [...new Set([...grantsFor(sessionId).allowedBundleIds(), ...bundleIds.filter(validBundleId), ...selfBundleIds])];
        const answer = await native.call("previewHideSet", { exemptBundleIds: exempt,
          ...(Number.isInteger(service.selectedDisplay(sessionId)) ? { displayId: service.selectedDisplay(sessionId) } : {}) });
        return (Array.isArray(answer?.apps) ? answer.apps : []).filter((app) => validBundleId(app?.bundleId))
          .map((app) => ({ bundleId: app.bundleId, displayName: cleanName(app.name) ?? app.bundleId }));
      } catch (error) {
        log.warn?.(`[computer-use] previewHideSet failed: ${String(error?.message ?? error)}`);
        return [];
      }
    },
    /**
     * request_full_control: record the session's approval for full-screen control (official Ln()). It does not block
     * on a card here — main.cjs shows the takeover card and calls this only on consent (or when the preference is
     * full_control). The lock itself is taken when the session next uses a display-scope tool (acquireDisplayLock).
     * Returns {outcome, reasonCode?, mode, alreadyApproved}.
     */
    requestFullControl(sessionId, { approved = false } = {}) {
      if (typeof sessionId !== "string" || !sessionId) throw coded("invalid_params", "sessionId is required.");
      const alreadyApproved = fullControl.isApproved(sessionId);
      if (fullControl.preferredMode() === "full_control" || approved) {
        fullControl.approve(sessionId);
        return { outcome: "ok", mode: fullControl.preferredMode(), alreadyApproved };
      }
      return { outcome: "unsupported", reasonCode: "takeover_declined", mode: fullControl.preferredMode(), alreadyApproved };
    },
    /** release_full_control (official Bn()): drop the display lock and the approval; the next full-screen action asks again. */
    releaseFullControl(sessionId) {
      if (typeof sessionId !== "string" || !sessionId) throw coded("invalid_params", "sessionId is required.");
      const held = fullControl.releaseLock(sessionId, { revokeApproval: true });
      return { outcome: "ok", wasHolding: held };
    },
    /**
     * Take the display lock before a display-scope action (official §1.4.2): approval first, then the lock. Returns
     * null when this session may act, or a refusal {outcome, reasonCode, errorKind, message}.
     */
    acquireDisplayLock(sessionId) {
      // Official §1.4.3: while this session holds app locks, the display-scope tools refuse until app_release.
      const held = appLockBundles(sessionId);
      if (held.length) {
        return { outcome: "unsupported", reasonCode: "state_conflict", errorKind: "state_conflict", appLockHeld: held,
          message: `This session is currently controlling ${held.map((id) => appName(sessionId, id)).join(", ")} in the background. Keep using the app_* tools, or call app_release first to switch to full-screen control.` };
      }
      if (!fullControl.isApproved(sessionId)) {
        return { outcome: "unsupported", reasonCode: "takeover_required", errorKind: "takeover_unavailable",
          message: "Full-screen control isn't approved for this session yet. Call request_full_control first; the user approves it on a card." };
      }
      const lock = fullControl.acquireLock(sessionId);
      if (lock === "cu_lock_held") {
        return { outcome: "unsupported", reasonCode: "cu_lock_held", errorKind: "state_conflict",
          message: CU_LOCK_HELD_MESSAGE };
      }
      return null;
    },
    /** The frontmost app's tier decides a display-scope action (official V()): the real cursor acts on whatever is in front. */
    async frontmostTierGate(sessionId, op, { front: given } = {}) {
      const front = given ?? await native.call("frontmostApp");
      const bundleId = typeof front?.bundleId === "string" ? front.bundleId : null;
      // Official V(): the clipboard guard runs before the tier is judged (a click-tier app in front: put aside and emptied).
      await clipboardGuard(sessionId, grantedTier(sessionId, bundleId) === "click");
      // Official at(): "mouse_position" (a move with no button held) passes whatever is in front — an app that isn't
      // granted, one granted at any tier, the desktop shell, this app, or nothing at all. It presses nothing.
      if (op === "mouse_position") return null;
      // Official V() `if (!o) return st(null)`: no app in front at all lets the pointer on to the hit test (U()), which
      // judges the window under the point. Keyboard input would have nowhere approved to go, so it is still refused.
      if (!bundleId && !Number.isInteger(front?.pid) && op !== "type" && op !== "key") return null;
      if (!bundleId) {
        return { outcome: "unsupported", reasonCode: "unattributed_window", errorKind: "state_conflict",
          message: "The app in front has no bundle identifier, so its abilities can't be checked. Bring a known app to the front." };
      }
      if (selfBundleIds.includes(bundleId)) {
        // Official V(): this app in front lets the pointer through (the hit test still refuses a point on its own
        // window); keyboard input would land in it, so that is refused.
        if (op !== "type" && op !== "key") return null;
        return { outcome: "unsupported", reasonCode: "self_frontmost", errorKind: "state_conflict",
          message: "This app's own window is in front. Click the target app first." };
      }
      if (!grantsFor(sessionId).has(bundleId)) {
        return { outcome: "unsupported", reasonCode: "app_not_granted", errorKind: "app_not_granted", frontmostBundleId: bundleId,
          message: `${bundleId} is in front and isn't granted to this session. Call request_access for it (Finder's grant covers the desktop and the Dock).` };
      }
      const tier = tierFor(bundleId);
      if (!allows(tier, op)) {
        return { outcome: "unsupported", reasonCode: "tier_insufficient", errorKind: "tier_refused", tier, frontmostBundleId: bundleId,
          message: `${bundleId} is in front and is granted at tier "${tier}", which doesn't allow this. ${tier === "read" ? "Use the browser tools for web pages."
            : op === "type" || op === "key" ? "Typing and keys aren't allowed in terminals and IDEs; use the Bash tool."
              : "Only plain left clicks and scrolling are allowed there: right / middle clicks, clicks with modifier keys and drags need tier \"full\" (a context menu can paste)."}` };
      }
      return null;
    },
    /**
     * The hit test before a display-scope click or scroll (official U()): which app owns the window under the global
     * point. The app's own click-through overlays (the glow, the pointer: overlayWindowIds) are skipped. No bundle id →
     * unattributed_window; the menu bar passes when the frontmost app is granted (else it is the desktop shell's); the
     * app's own window → hit_test_self_intercept; nothing there or the desktop → Finder's grant; not granted →
     * app_not_granted; a tier that doesn't allow op → tier_insufficient. null when the action may go ahead.
     */
    async hitTest(sessionId, point, op, save) {
      let ignoreWindowIds = [];
      try { ignoreWindowIds = (overlayWindowIds() ?? []).filter((id) => Number.isInteger(id) && id > 0); } catch {}
      const found = (await native.call("pointOwner", { point, ignoreWindowIds }))?.owner ?? null;
      const grants = grantsFor(sessionId);
      // Official Vt() in U(): the window under the point against the save-panel guard (a save sheet, a protected
      // document, a rename popover), before the grant checks; a click that may confirm a save checks the sheet's folder
      // last (h() = Et()).
      let confirm = async () => null;
      const menuBar = !!found && MENU_BAR_LAYERS.has(found.layer);
      // (A window with no bundle id is refused below first, as official U() does before Vt().)
      if (save && saveGuard.available && !(found && !menuBar && typeof found.bundleId !== "string")) {
        const hit = await saveGuard.pointer({ bundleId: found?.bundleId ?? DESKTOP_SHELL, point, menuBar, ...save });
        if (hit.refusal) return hit.refusal;
        confirm = hit.confirm;
      }
      let target;
      if (found && MENU_BAR_LAYERS.has(found.layer)) {
        const front = await native.call("frontmostApp");
        if (typeof front?.bundleId === "string" && grants.has(front.bundleId)) return confirm();
        target = { bundleId: DESKTOP_SHELL, name: "Finder" };
      } else if (found && typeof found.bundleId !== "string") {
        const owner = typeof found.ownerName === "string" && found.ownerName ? found.ownerName : "an unknown process";
        return { outcome: "unsupported", reasonCode: "unattributed_window", errorKind: "app_not_granted", ownerName: found.ownerName ?? null,
          message: `The window at this point belongs to "${owner}", a process with no app bundle, so no grant can cover it and actions on it are refused. Act on a window that belongs to an app, or ask the user to close or move this one.` };
      } else if (found && DESKTOP_SHELL_PROCESSES.has(found.bundleId)) {
        // The Dock, Spotlight …: the desktop shell, Finder's grant (official: "that single grant covers all of them").
        target = { bundleId: DESKTOP_SHELL, name: "Finder" };
      } else {
        target = found ? { bundleId: found.bundleId, name: found.ownerName || found.bundleId } : { bundleId: DESKTOP_SHELL, name: "Finder" };
      }
      if (selfBundleIds.includes(target.bundleId)) {
        return { outcome: "unsupported", reasonCode: "hit_test_self_intercept", errorKind: "hit_test_self_intercept",
          message: "The click target couldn't be verified: this app's own window is at that point. Take a fresh screenshot and retry." };
      }
      if (!grants.has(target.bundleId)) {
        if (target.bundleId === DESKTOP_SHELL) {
          return { outcome: "unsupported", reasonCode: "app_not_granted", errorKind: "app_not_granted", hitBundleId: DESKTOP_SHELL,
            message: "That point is on the desktop shell (the desktop, the Dock, Spotlight), which can start apps outside the granted ones. To act there, call request_access with \"Finder\": that one grant covers all of them." };
        }
        return { outcome: "unsupported", reasonCode: "app_not_granted", errorKind: "app_not_granted", hitBundleId: target.bundleId,
          message: `That point is on "${target.name}", which isn't granted to this session. Call request_access for it, or act in a granted app.` };
      }
      const tier = grants.tierOf(target.bundleId) ?? tierFor(target.bundleId);
      // Official U(): a point on a click-tier app's window empties the clipboard too (its Paste can't inject text).
      if (tier === "click") await clipboardGuard(sessionId, true);
      if (!allows(tier, op)) {
        return { outcome: "unsupported", reasonCode: "tier_insufficient", errorKind: "tier_refused", tier, hitBundleId: target.bundleId,
          message: tier === "click"
            ? `That point is on "${target.name}", granted at tier "click": right / middle clicks and clicks with modifier keys need tier "full" (a context menu can paste). A plain left click is allowed there.`
            : `That point is on "${target.name}", granted at tier "${tier}", which doesn't allow this.${tier === "read" ? " Use the browser tools for web pages." : ""}` };
      }
      return confirm();
    },
    /** The displays (official switch_display / §1.4.6): native CGGetActiveDisplayList, main display first. */
    async listDisplays() { return native.call("listDisplays"); },
    /** The real cursor's global point. */
    async cursorPosition() { return native.call("cursorPosition"); },
    /** Whether the session has any granted app (official ta(): the screen-wide tools need a non-empty allowlist). */
    hasGrants: (sessionId) => !!sessions.get(sessionId)?.list().length,
    /** The display the session's screen-wide tools act on: pinned (switch_display), else the last screenshot's. */
    selectedDisplay: (sessionId) => windows.get(sessionId)?.pinnedDisplay ?? windows.get(sessionId)?.selectedDisplay ?? null,
    /**
     * Before any screen-wide tool (official ta() and §1.4.3), in this order: nothing granted → allowlist_empty; another
     * session's display lock → cu_lock_held; this session still holding app windows → state_conflict (unless
     * `appLocksAllowed`: cursor_position answers in the background then). null when the takeover / action may go ahead.
     */
    displayPrecheck(sessionId, { appLocksAllowed = false } = {}) {
      if (!service.hasGrants(sessionId)) {
        return refusal("allowlist_empty", "allowlist_empty", "No app is granted to this session yet, so the screen-wide tools have nothing they may act on. Call request_access with the apps you need first.");
      }
      const other = service.displayLockedByOther(sessionId);
      if (other) return { ...other, message: CU_LOCK_HELD_MESSAGE };
      const held = appLockBundles(sessionId);
      if (held.length && !appLocksAllowed) {
        return refusal("state_conflict", "state_conflict", `This session is currently controlling ${held.map((id) => appName(sessionId, id)).join(", ")} in the background. Keep using the app_* tools, or call app_release first to switch to full-screen control.`, { appLockHeld: held });
      }
      return null;
    },
    /**
     * A full-screen screenshot (official screenshot): only granted apps and the desktop are in it. It becomes the
     * coordinate reference of the screen-wide pointer tools: pixels of its image at scale 1 (coordFrame), whatever the
     * scale it was returned at. Takes over (approval + lock) like any display action.
     */
    async displayScreenshot(sessionId, { displayId, scale, keepReference = false, hide = true } = {}) {
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      // Official ui(): the apps outside the allowlist are hidden before the capture (not inside a batch / teach step).
      if (hide) await service.prepareForAction(sessionId);
      const state = stateFor(sessionId);
      const chosen = checkId(displayId, "displayId") ?? state.pinnedDisplay ?? state.selectedDisplay;
      const shot = await service.captureScreen(sessionId, { displayId: chosen, scale: checkScale(scale) });
      const coordFrame = displayCoordFrame(shot);
      // previousDisplayId: the display of the screenshot before this one (official ci(): say when it changed).
      const previousDisplayId = state.lastShotDisplay ?? null;
      state.lastShotDisplay = shot.displayId;
      const reference = { ...shot, dataUrl: undefined, coordFrame };
      const hiddenNote = service.hiddenNote(sessionId);
      const notes = hiddenNote ? { hiddenNote } : {};
      // computer_batch (official Zi()): a screenshot inside the batch becomes the reference only once the batch ends.
      if (keepReference) return { ...shot, coordFrame, previousDisplayId, reference, ...notes };
      service.setDisplayReference(sessionId, reference);
      return { ...shot, coordFrame, previousDisplayId, ...notes };
    },
    /**
     * A teach step's anchor (official ei(): R() on the selected display and the last screenshot): [x, y] in the last
     * full-screen screenshot's pixels → a global point, or null when it can't be placed (the tooltip is then centered,
     * not an error).
     */
    async displayAnchor(sessionId, coordinate) {
      try {
        const displays = (await native.call("listDisplays"))?.displays ?? [];
        return displayPointFor(stateFor(sessionId), coordinate, displays, "anchor");
      } catch { return null; }
    },
    /** Whether a bundle id is this app's own (never granted; teach access refuses it, official self_app_denied). */
    isSelfApp: (bundleId) => selfBundleIds.includes(bundleId),
    /** Make a full-screen screenshot the screen-wide tools' coordinate reference (and its display the selected one). */
    setDisplayReference(sessionId, reference) {
      if (!reference) return;
      const state = stateFor(sessionId);
      state.display = reference;
      state.selectedDisplay = reference.displayId;
      try { onDisplaySelected(sessionId, reference.displayId); } catch {}
    },
    /**
     * zoom (official pi()): a sharper picture of a region of the last full-screen screenshot, read-only; the pointer
     * tools keep using that screenshot's coordinates. region [x0, y0, x1, y1] in its image pixels.
     */
    async displayZoom(sessionId, { region, scale } = {}) {
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      if (!Array.isArray(region) || region.length !== 4 || !region.every((v) => Number.isInteger(v) && v >= 0)) {
        throw coded("bad_args", "region must be four non-negative integers [x0, y0, x1, y1] in the last screenshot's pixels.");
      }
      const [x0, y0, x1, y1] = region;
      if (!(x1 > x0 && y1 > y0)) throw coded("bad_args", "region needs x1 > x0 and y1 > y0.");
      const shot = windows.get(sessionId)?.display;
      if (!shot) return refusal("state_conflict", "state_conflict", "There is no full-screen screenshot to zoom into yet: take a screenshot before zooming.");
      const { width, height } = shot.coordFrame;
      if (x1 > width || y1 > height) throw coded("bad_args", `region [${region.join(", ")}] goes past the last screenshot's ${width}×${height} frame.`);
      const zoomed = await service.captureScreen(sessionId, { displayId: shot.displayId, scale: checkScale(scale), region: imageRegionToDisplayRect(region, shot) });
      return { ...zoomed, region, coordFrame: shot.coordFrame };
    },
    /**
     * cursor_position (official Mi() / Ii()): while this session holds app windows, the point of its last app_* action
     * (app_screenshot pixels of that window); else the real cursor in the last screenshot's image pixels, or in logical
     * points when there is no screenshot or the cursor is on another display.
     */
    async displayCursor(sessionId) {
      const state = windows.get(sessionId);
      if (appLockBundles(sessionId).length) {
        const last = state?.lastPoint;
        if (!last) return { coordinateSpace: "app_screenshot_pixels", x: null, y: null, note: "No app_* action of this session has aimed at a point yet." };
        const bundleId = last.key.slice(0, last.key.lastIndexOf(":")), windowId = Number(last.key.slice(last.key.lastIndexOf(":") + 1));
        return { coordinateSpace: "app_screenshot_pixels", app: bundleId, window_id: windowId, x: last.point[0], y: last.point[1],
          note: "Background control moves no cursor: this is where your last app_* action in that window aimed, in its app_screenshot's pixels." };
      }
      const pos = await native.call("cursorPosition");
      const shot = state?.display;
      const image = shot ? displayPointToImage(pos, shot) : null;
      if (image) return { ...image, coordinateSpace: "image_pixels", ...(shot.width !== shot.coordFrame.width ? { coordFrame: shot.coordFrame } : {}) };
      return { x: pos.x, y: pos.y, coordinateSpace: "logical_points" };
    },
    /**
     * switch_display (official Si()): pin the display the screen-wide tools capture and aim at, by the monitor name the
     * screenshot notes give (case-insensitive; displayLabels), or "auto" to go back to the automatic choice. One monitor
     * → bad_args; an unknown name → bad_args listing the names. The last screenshot no longer applies: take a new one.
     */
    async switchDisplay(sessionId, { display } = {}) {
      if (typeof display !== "string" || !display.trim()) throw coded("bad_args", "display is required: a monitor name from a screenshot's note, or \"auto\".");
      const state = stateFor(sessionId);
      if (display.trim().toLowerCase() === "auto") {
        delete state.pinnedDisplay;
        return { outcome: "ok", pinned: null, text: "Returned to automatic monitor selection. Call screenshot to continue." };
      }
      let displays;
      try { displays = (await native.call("listDisplays"))?.displays ?? []; } catch (error) { throw coded("display_error", `Failed to enumerate displays: ${error?.message ?? error}`); }
      if (displays.length < 2) throw coded("bad_args", "Only one monitor is connected. There is nothing to switch to.");
      const labels = displayLabels(displays);
      const wanted = display.trim().toLowerCase();
      const match = displays.find((d) => labels.get(d.displayId)?.toLowerCase() === wanted);
      if (!match) throw coded("bad_args", `No monitor named "${display}" is connected. Available monitors: ${displays.map((d) => `"${labels.get(d.displayId)}"`).join(", ")}.`);
      state.pinnedDisplay = match.displayId;
      if (state.display && state.display.displayId !== match.displayId) delete state.display;
      try { onDisplaySelected(sessionId, match.displayId); } catch {}
      return { outcome: "ok", pinned: match.displayId, text: `Switched to monitor "${labels.get(match.displayId)}". Call screenshot to see it.` };
    },
    /**
     * The screen-wide pointer tools (official mi() / _i() / vi() / yi() / Ri() / zi()), on the global HID stream — the
     * real cursor moves, so hover states, context menus and canvas drags work. kind: mouse_move, left_click,
     * right_click, middle_click, double_click, triple_click, left_mouse_down, left_mouse_up, left_click_drag, scroll.
     * Coordinates are the last screenshot's image pixels (official R(); without a screenshot, x / scaleFactor on the
     * selected display). Gates, in the official order: approval + display lock; the frontmost app's grant and tier
     * (V(), by the gate kind — official yi() / mi() / _i() / vi() / Ri() / zi():
     *     mouse_move, nothing held      frontmost "mouse_position" (passes whatever is in front), no hit test
     *     mouse_move, button held       frontmost "mouse",  hit test "mouse_full"
     *     plain left / double / triple  frontmost "mouse",  hit test "mouse"
     *     right / middle / modifiers    frontmost "mouse_full", hit test "mouse_full"
     *     scroll                        frontmost "mouse",  hit test "mouse" ("mouse_full" while held)
     *     left_click_drag               frontmost "mouse",  hit test start "mouse", end "mouse_full"
     *     left_mouse_down               frontmost "mouse",  hit test at the cursor "mouse"
     *     left_mouse_up                 frontmost "mouse",  hit test at the cursor "mouse" ("mouse_full" after a move);
     *                                   the button is let go even when refused);
     * the hit test on the window under the point (U()); natively at posting time secure input, the user's own input
     * (backed off 3 × 200 ms) and the lock. Each press / release / click / drag / scroll runs with the app's own windows
     * letting it through (throughOwnWindows, official executor NG). Returns the native outcome with `kind`, or a refusal
     * {outcome, reasonCode, errorKind, message}.
     */
    async displayPointer(sessionId, { kind, coordinate, start_coordinate: startCoordinate, text, scroll_direction: direction, scroll_amount: amount, animate = true, signal, hide = true } = {}) {
      if (!POINTER_KINDS.has(kind)) throw coded("bad_args", `Unknown pointer action ${kind}.`);
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      // Official V(): hideBeforeAction first (not inside a batch / teach step: done once before it).
      if (hide) await service.prepareForAction(sessionId);
      const state = stateFor(sessionId);
      const mouse = (state.mouse ??= { held: false, moved: false });
      const displays = (await native.call("listDisplays"))?.displays ?? [];
      const at = (c, name = "coordinate") => displayPointFor(state, c, displays, name);
      // Every posting re-checks the call's signal and the display lock first (a Stop during a back-off sends nothing).
      const post = (method, params = {}) => asInput(() => deliver(() => native.call(method, params), { ...(wait ? { wait } : {}), stopped: displayStopped(sessionId, signal) }));
      // Gate kinds (official at()): "mouse_position" ↔ mouse_position, "left_click" ↔ mouse, "modifier_click" ↔ mouse_full.
      // save: the save-panel guard's view of the action (official U()'s last argument); chord: modifiers held (St()).
      // A save-panel settle / parents refusal runs the gates again (official zt / Bt).
      const what = kind === "left_mouse_up" ? "Mouse release" : "Click";
      const frontGate = async (op, chord) => (await service.frontmostTierGate(sessionId, op))
        ?? (chord !== undefined && saveGuard.available ? await saveGuard.keyboard(op === "modifier_click" ? "mouse_full" : "mouse", { chord, signal, what }) : null);
      const gates = (op, point, save, chord) => guarded(async () => (await frontGate(op, chord)) ?? (point ? await service.hitTest(sessionId, point, op, save) : null), { signal, what });
      const hitGate = (point, op, save) => guarded(() => service.hitTest(sessionId, point, op, save), { signal, what });
      const releaseHeld = async () => { if (mouse.held) { await throughOwnWindows([], () => native.call("hidMouseUp")); mouse.held = false; mouse.moved = false; } };
      // Official: display-scope moves the real pointer and never uses the phantom cursor; the web fallback hides.
      const hidePointer = async () => { try { await pointer?.beforeClick?.({ scope: "display" }); } catch {} };
      if (CLICK_BUTTONS[kind]) {
        const mods = modifiersOf(text);
        if (mods.length && isSystemCombo(mods.join("+")) && !grantsFor(sessionId).flags().systemKeyCombos) {
          return refusal("grant_flag_required", "grant_flag_required", `Holding ${mods.join("+")} is a system shortcut, which needs the systemKeyCombos permission: call request_access with systemKeyCombos: true.`);
        }
        const to = at(coordinate);
        await releaseHeld();
        // Official mi(): the cursor goes to the target first (hover), then the gates; nothing is pressed if they refuse.
        const moved = await post("hidMove", { point: to, animate });
        if (moved.outcome !== "ok") return { ...moved, kind };
        const [button, count] = CLICK_BUTTONS[kind];
        const op = button === "left" && !mods.length ? "left_click" : "modifier_click";
        const front = mods.length ? (await native.call("frontmostApp"))?.bundleId ?? null : null;
        const refused = await gates(op, to, { kind: "click", button, count, ...(mods.length ? { chord: text } : {}) }, mods.length ? text : undefined);
        if (refused) return refused;
        if (mods.length && ((await native.call("frontmostApp"))?.bundleId ?? null) !== front) {
          return refusal("delivery_focus_check_failed", "delivery_focus_check_failed", "The app in front changed while the modifier click was being checked, so nothing was clicked. Take a fresh screenshot and retry.");
        }
        await hidePointer();
        return { ...(await throughOwnWindows([to], () => post("hidClick", { point: to, button, count, modifiers: mods, animate: false }))), kind, point: to };
      }
      switch (kind) {
        case "mouse_move": {
          const to = at(coordinate);
          // Official yi(): with nothing held the frontmost gate is "mouse_position" — it passes whatever app is in front
          // (not granted, any tier, the desktop shell, this app) — and there is no hit test: a move presses nothing.
          // With the button held it is part of a drag: the frontmost app at "mouse", the point under it at "mouse_full".
          const refused = mouse.held
            ? (await service.frontmostTierGate(sessionId, "left_click")) ?? (await hitGate(to, "modifier_click", { kind: "drag" }))
            : await service.frontmostTierGate(sessionId, "mouse_position");
          if (refused) return refused;
          const result = await post("hidMove", { point: to, animate });
          if (result.outcome === "ok" && mouse.held) mouse.moved = true;
          return { ...result, kind, point: to };
        }
        case "left_mouse_down": {
          if (mouse.held) return refusal("state_conflict", "state_conflict", "The left mouse button is already held down. Call left_mouse_up first.");
          const point = await native.call("cursorPosition");
          // Official Ri(): the frontmost app, then the held-press check (kt), then the point as a drag start.
          const refused = (await service.frontmostTierGate(sessionId, "left_click")) ?? (await saveGuard.heldPress?.() ?? null)
            ?? (await hitGate(point, "left_click", { kind: "drag" }));
          if (refused) return refused;
          await hidePointer();
          const result = await throughOwnWindows([point], () => post("hidMouseDown"));
          if (result.outcome === "ok") { mouse.held = true; mouse.moved = false; }
          return { ...result, kind, point };
        }
        case "left_mouse_up": {
          const point = await native.call("cursorPosition");
          // Official zi(): the frontmost app at "mouse", then the point under the cursor — after a move while held as the
          // end of a drag ("mouse_full"), else as a click. The button is let go even when a gate refuses (it is never
          // left down), and the refusal is the answer. Nothing held: the same checks, and the release changes nothing.
          const up = async () => { const r = await asInput(() => throughOwnWindows([point], () => native.call("hidMouseUp"))); mouse.held = false; mouse.moved = false; return r; };
          const moved = mouse.moved;
          const refused = await guarded(async () => (await service.frontmostTierGate(sessionId, "left_click"))
            ?? (await service.hitTest(sessionId, point, moved ? "modifier_click" : "left_click", moved ? { kind: "drag" } : { kind: "click", button: "left" })), { signal, what });
          if (refused) { await up(); return refused; }
          const result = await up();
          return { ...result, outcome: "ok", kind, point };
        }
        case "left_click_drag": {
          const to = at(coordinate);
          const from = startCoordinate === undefined || startCoordinate === null ? await native.call("cursorPosition") : at(startCoordinate, "start_coordinate");
          await releaseHeld();
          // Official vi(): the start is checked as a press, the end as mouse_full (dropping onto something).
          const refused = (await gates("left_click", from, { kind: "drag" })) ?? (await hitGate(to, "modifier_click", { kind: "drag" }));
          if (refused) return refused;
          await hidePointer();
          return { ...(await throughOwnWindows([from, to], () => post("hidDrag", { ...(startCoordinate === undefined || startCoordinate === null ? {} : { from }), to }))), kind, from, to };
        }
        case "scroll": {
          const to = at(coordinate);
          if (!SCROLL_DIRECTIONS.includes(direction)) throw coded("bad_args", "scroll_direction must be up, down, left or right.");
          if (!Number.isInteger(amount) || amount < 0 || amount > 100) throw coded("bad_args", "scroll_amount must be an integer from 0 to 100.");
          // Official _i(): the frontmost app at "mouse"; the point under it at "mouse", or with the button held as part of
          // a drag at "mouse_full" (and the drag then counts as moved, so the release is checked as a drop).
          const refused = (await service.frontmostTierGate(sessionId, "left_click"))
            ?? (await hitGate(to, mouse.held ? "modifier_click" : "left_click", mouse.held ? { kind: "drag" } : undefined));
          if (refused) return refused;
          const dx = direction === "left" ? -amount : direction === "right" ? amount : 0;
          const dy = direction === "up" ? -amount : direction === "down" ? amount : 0;
          const result = await throughOwnWindows([to], () => post("hidScroll", { point: to, dx, dy, animate }));
          if (result.outcome === "ok" && mouse.held) mouse.moved = true;
          return { ...result, kind, point: to };
        }
        default: throw coded("bad_args", `Unknown pointer action ${kind}.`);
      }
    },
    /**
     * The display lock went away (turn end, release_full_control, Esc): a button left down by left_mouse_down is let go,
     * and a hold_key / type still running is stopped (its keys are released natively).
     */
    /**
     * Official executor.beginInputBurst (Gi(), computer_batch / teach steps): the pointer actions that follow, until the
     * returned end is called, keep the app's windows letting the mouse through between them (click-through.cjs).
     * Gates, back-off and the cursor are not affected. A no-op end when there is no click-through.
     */
    beginInputBurst() {
      try { return clickThrough?.beginInputBurst?.() ?? (() => {}); } catch (error) { log.warn?.("[computer-use] beginInputBurst failed", error); return () => {}; }
    },
    async releaseHeldMouse() {
      let released = false;
      for (const state of windows.values()) {
        if (state.mouse?.held) { state.mouse.held = false; state.mouse.moved = false; released = true; }
      }
      if (released) { try { await native.call("hidMouseUp"); } catch {} }
      try { await native.call("hidKeyAbort"); } catch {}
      return released;
    },
    /**
     * The screen-wide keyboard (official gi() key, Li() hold_key, hi() type) on the global HID stream: keystrokes go to
     * whatever holds keyboard focus, i.e. the frontmost app, as a person's would. In the official order: the arguments;
     * a system shortcut without the systemKeyCombos flag → grant_flag_required; approval + display lock; the frontmost
     * app's grant and tier (keyboard needs "full"; this app in front → self_frontmost); the chord's shape (bad_args).
     * Natively, before every keystroke: the gates (secure input, the user's own input — backed off 3 × 200 ms here —,
     * the lock) and the approved frontmost app still in front (else delivery_focus_check_failed, the rest not sent).
     * `signal` (the tool call's) stops a running repeat / hold / type; a hold always lets its keys go.
     * Returns {outcome: "ok", text} with the official success text, or a refusal {outcome, reasonCode, errorKind, message}.
     */
    async displayKeyboard(sessionId, { kind, text, repeat, duration, signal, hide = true } = {}) {
      if (!KEYBOARD_KINDS.has(kind)) throw coded("bad_args", `Unknown keyboard action ${kind}.`);
      if (typeof text !== "string" || (kind !== "type" && !text.trim())) {
        throw coded("bad_args", kind === "type" ? "text must be the text to type." : "text is required: the key or chord, e.g. \"return\" or \"cmd+shift+a\".");
      }
      let times = 1, ms = 0;
      if (kind === "key" && repeat !== undefined && repeat !== null) {
        if (!Number.isInteger(repeat) || repeat < 1) throw coded("bad_args", "repeat must be a positive integer.");
        if (repeat > 100) throw coded("bad_args", "repeat can be at most 100.");
        times = repeat;
      }
      if (kind === "hold_key") {
        if (typeof duration !== "number" || !Number.isFinite(duration)) throw coded("bad_args", "duration must be a number of seconds.");
        if (duration < 0) throw coded("bad_args", "duration can't be negative.");
        if (duration > 100) throw coded("bad_args", "duration is too long: it is in seconds, at most 100.");
        ms = Math.round(duration * 1000);
      }
      if (kind === "type" && text.length > MAX_TYPE_UNITS) throw coded("bad_args", `text is too long: at most ${MAX_TYPE_UNITS} UTF-16 units per call. Split it into several calls.`);
      if (kind !== "type" && isSystemCombo(text) && !grantsFor(sessionId).flags().systemKeyCombos) {
        return refusal("grant_flag_required", "grant_flag_required", `"${text}" is a system-wide shortcut (quitting or switching apps, Spotlight, Mission Control and the like), which needs the systemKeyCombos permission: call request_access with systemKeyCombos: true.`);
      }
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      // Official V(): hideBeforeAction before the frontmost app is read (not inside a batch / teach step).
      if (hide) await service.prepareForAction(sessionId);
      const front = await native.call("frontmostApp");
      const gated = await service.frontmostTierGate(sessionId, kind === "type" ? "type" : "key", { front });
      if (gated) return gated;
      // Official St() in V(): the frontmost window against the save-panel guard (Bt retries a settle / parents refusal).
      const saveCheck = () => (saveGuard.available ? saveGuard.keyboard("keyboard", kind === "type"
        ? { typedText: text, signal, what: "Typing" } : { chord: text, held: kind === "hold_key", signal, what: kind === "hold_key" ? "Key hold" : "Key press" }) : null);
      const saveRefused = await saveCheck();
      if (saveRefused) return saveRefused;
      // Official hi(): text with a new line is pasted when clipboardWrite is granted (sub-gate clipboardPasteMultiline,
      // on by default). No length threshold. Not while secure input is on (a password field has the keyboard): the
      // text never goes through the clipboard then. A paste that never reached the app falls back to typing.
      let pasteFallback = null;
      if (kind === "type" && service.pastesText(sessionId, text)) {
        const pasted = await asInput(() => pasteText(sessionId, text, front, signal));
        if (pasted.done) return { ...pasted.result, kind };
        pasteFallback = pasted.reasonCode;
        log.info?.(`[computer-use] type: the clipboard paste didn't reach the app (${pasted.reasonCode}); typing grapheme by grapheme`);
      }
      let params;
      if (kind === "type") params = { text };
      else {
        const problem = chordProblem(text, kind);
        if (problem) throw coded("bad_args", problem);
        const chord = displayChord(text);
        if (chord.empty) throw coded("bad_args", `"${text}" names no key to press.`);
        if (chord.unknown.length) throw coded("bad_args", `${chord.unknown.map((key) => `"${key}"`).join(", ")} isn't a key name this tool knows. Use names such as return, tab, escape, space, backspace, delete, up, down, left, right, home, end, pageup, pagedown, f1–f20, letters and digits, with modifiers cmd, shift, alt (option), ctrl, fn.`);
        params = { modifiers: chord.modifiers, keys: chord.keys, ...(kind === "key" ? { repeat: times } : { durationMs: ms }) };
      }
      if (Number.isInteger(front?.pid)) params.frontPid = front.pid;
      const method = kind === "key" ? "hidKey" : kind === "hold_key" ? "hidKeyHold" : "hidType";
      if (signal?.aborted) return keyboardAborted(kind, { pressed: 0, times, typed: 0, total: kind === "type" ? segmentGraphemes(text).length : times });
      // One id for this call's delivery, the same on every retry: the native abort of it outlives a back-off.
      const opId = (keyOperations = (keyOperations % 2_000_000_000) + 1);
      params.opId = opId;
      const stop = () => { native.call("hidKeyAbort", { opId }).catch(() => {}); };
      signal?.addEventListener?.("abort", stop, { once: true });
      const stopped = displayStopped(sessionId, signal);
      // Official oPr / iPr: a lone Escape the model presses must reach the app in front, not the app's own Esc emergency
      // stop (main.cjs withOwnEscape: the global shortcut is let go for that one press, at most 500 ms, and taken back
      // right after; for a hold, once the key is down). Each press of a repeat is wrapped on its own, like official key().
      const loneEscape = kind !== "type" && params.modifiers.length === 0 && params.keys.length === 1 && params.keys[0] === "escape";
      const attempt = (call) => (loneEscape ? withOwnEscape(call, kind === "hold_key" ? { releaseAfterMs: 50 } : {}) : call());
      // Checked again once the Escape guard is set up (it may wait for an earlier press's guard to settle).
      const send = (p) => asInput(() => deliver(() => attempt(() => (stopped() ? { outcome: "unsupported", reasonCode: "aborted", delivered: false } : native.call(method, p))),
        { ...(wait ? { wait } : {}), stopped }));
      // Official gi(): with the save-panel guard, a repeated key that isn't plain navigation is checked before every press.
      const regate = kind === "key" && times > 1 && saveGuard.available && !navigationOnly(text);
      let result;
      try {
        if ((loneEscape || regate) && kind === "key" && times > 1) {
          let pressed = 0;
          for (let i = 0; i < times; i++) {
            if (i > 0) await pause(8);
            if (i > 0 && regate) {
              const again = await saveCheck();
              if (again) { result = { ...again, pressed, times, delivered: pressed > 0 }; break; }
            }
            result = await send({ ...params, repeat: 1 });
            if (result?.outcome !== "ok") { result = { ...result, pressed: pressed + (result?.pressed ?? 0), times, delivered: pressed > 0 || result?.delivered === true }; break; }
            pressed += 1;
          }
          if (result?.outcome === "ok") result = { ...result, pressed: times, times };
        } else result = await send(params);
      } finally { signal?.removeEventListener?.("abort", stop); }
      // A Stop wins over what the native call answered (it may have finished just as the user stopped it).
      if (result?.reasonCode === "aborted" || signal?.aborted) return { ...keyboardAborted(kind, result), delivered: result?.delivered === true };
      if (result?.outcome === "ok") {
        const textOut = kind === "key" ? (times > 1 ? `Key pressed ${times} times.` : "Key pressed.")
          : kind === "hold_key" ? "Key held." : `Typed ${result.typed ?? result.total ?? 0} grapheme(s).`;
        return { ...result, kind, text: textOut, ...(pasteFallback ? { pasteFallback } : {}) };
      }
      if (result?.reasonCode === "delivery_focus_check_failed") {
        const now = typeof result.frontmostBundleId === "string" ? `"${result.frontmostBundleId}" came to the front` : "no app was in front";
        const what = kind === "type" ? `Typing stopped after ${result.typed ?? 0} of ${result.total ?? "?"} graphemes`
          : kind === "key" ? `Key repeat stopped after ${result.pressed ?? 0} of ${times} presses` : "The key hold was not started";
        return { ...result, ...refusal("delivery_focus_check_failed", "delivery_focus_check_failed",
          `${what}: ${now} while the keys were being sent. Keystrokes go wherever the keyboard focus is, and they were approved for "${front?.bundleId ?? "the app in front"}" only, so the rest was NOT sent. Take a screenshot to see where the focus went and what arrived before trying again, and don't try to reach that app another way.`) };
      }
      return { ...result, kind };
    },
    /**
     * Whether the screen-wide type pastes this text (official hi() on macOS): it has a new line, the session holds
     * clipboardWrite, the clipboardPasteMultiline sub-gate is on, and there is a clipboard to use.
     */
    pastesText(sessionId, text) {
      return typeof text === "string" && text.includes("\n") && grantsFor(sessionId).flags().clipboardWrite === true
        && gates.clipboardPasteMultiline !== false && clip.available();
    },
    /**
     * read_clipboard / write_clipboard's checks before the takeover (official jr() / Ei() / ki() / Di()): the flag
     * (grant_flag_required), write's text (bad_args), the session's app windows (state_conflict). null to go on.
     */
    clipboardPrecheck(sessionId, kind, { text } = {}) {
      const flag = kind === "read" ? "clipboardRead" : "clipboardWrite";
      if (!grantsFor(sessionId).flags()[flag]) {
        return refusal("grant_flag_required", "grant_flag_required", `Clipboard ${kind} is not granted. Request \`${flag}\` via request_access.`, { flag });
      }
      if (kind === "write" && typeof text !== "string") return refusal("bad_args", "bad_args", "text is required: the text to put on the clipboard.");
      const held = appLockBundles(sessionId);
      if (held.length) {
        return refusal("state_conflict", "state_conflict", `Clipboard ${kind} is unavailable while you hold background app windows (${held.map((id) => appName(sessionId, id)).join(", ")}): the user keeps using their computer, and its clipboard, while you work in the background. If this needs the clipboard, app_release those windows, then use the screen-wide tools; the next one takes over the screen with the user's approval.`, { appLockHeld: held });
      }
      if (!clip.available()) return refusal("clipboard_unavailable", "feature_unavailable", "There is no clipboard to use here.");
      return null;
    },
    /** read_clipboard (official Oi()): {outcome: "ok", text} — after the precheck and the takeover (display lock). */
    async readClipboard(sessionId) {
      const pre = service.clipboardPrecheck(sessionId, "read");
      if (pre) return pre;
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      if (gates.clipboardGuard !== false) {
        const front = await native.call("frontmostApp").catch(() => null);
        await clipboardGuard(sessionId, grantedTier(sessionId, front?.bundleId) === "click");
      }
      try { return { outcome: "ok", text: await clip.readText() }; }
      catch { return refusal("clipboard_unavailable", "feature_unavailable", "The clipboard couldn't be read."); }
    },
    /**
     * write_clipboard (official Ai()): {outcome: "ok", text: "Clipboard written."}. With a click-tier app in front it is
     * refused (tier_insufficient): the guard would empty the clipboard before that app's Paste could use it anyway.
     */
    async writeClipboard(sessionId, { text } = {}) {
      const pre = service.clipboardPrecheck(sessionId, "write", { text });
      if (pre) return pre;
      const lock = service.acquireDisplayLock(sessionId);
      if (lock) return lock;
      if (gates.clipboardGuard !== false) {
        const front = await native.call("frontmostApp").catch(() => null);
        const tier = grantedTier(sessionId, front?.bundleId);
        if (front?.bundleId && tier === "click") {
          return refusal("tier_insufficient", "tier_insufficient", `"${appName(sessionId, front.bundleId)}" is a tier-"click" app and is in front. write_clipboard is refused because the next action would empty the clipboard anyway: a Paste button in this app can't be used to enter text. Bring a tier-"full" app to the front before writing to the clipboard, and don't try to get around this with scripts, automation or shell commands.`, { tier, frontmostBundleId: front.bundleId });
        }
        await clipboardGuard(sessionId, false);
      }
      try { await clip.writeText(text); } catch { return refusal("clipboard_unavailable", "feature_unavailable", "The clipboard couldn't be written."); }
      return { outcome: "ok", text: "Clipboard written." };
    },
    /** The turn ended (official onResult / finishTurnCleanup): the guard's stash goes back on the clipboard. */
    async restoreClipboardStash(sessionId) { if (typeof sessionId === "string" && sessionId) await clip.restoreStash(sessionId); },
    /**
     * open_application's target (official bi()): a granted bundle id as given, or a granted app's display name (any
     * case). Returns the bundle id, or a refusal (app_not_granted).
     */
    grantedAppFor(sessionId, app) {
      if (typeof app !== "string" || !app.trim()) throw coded("bad_args", "app is required: the app's name or bundle identifier.");
      const grants = grantsFor(sessionId), name = app.trim();
      const bundleId = validBundleId(name) && grants.has(name) ? name : grants.list().find((entry) => String(entry.displayName ?? "").toLowerCase() === name.toLowerCase())?.bundleId;
      if (!bundleId || !grants.has(bundleId)) {
        return refusal("app_not_granted", "app_not_granted", `"${name}" isn't granted to this session. Call request_access for it first.`);
      }
      return bundleId;
    },
    /**
     * Launch a granted app or make sure it runs (native openApp, NSWorkspace). activates false: in the background (the
     * user's frontmost app stays in front), then wait briefly for its first window. → {bundleId, pid, wasRunning,
     * firstWindowId}.
     */
    async openApplication(sessionId, { bundleId, activates = true } = {}) {
      granted(sessionId, bundleId);
      const opened = await native.call("openApp", { bundleId, activates });
      let firstWindowId = null;
      if (!activates) {
        for (let attempt = 0; attempt < 10 && firstWindowId === null; attempt += 1) {
          const list = (await native.call("listWindows", { bundleId }).catch(() => null))?.windows ?? [];
          const first = list.find((w) => w && w.is_auxiliary !== true) ?? list[0];
          if (first && Number.isInteger(first.window_id)) firstWindowId = first.window_id;
          else await pause(150);
        }
      }
      return { ...opened, firstWindowId };
    },
    /**
     * open_application while nobody holds the screen and the preferred mode is Background (official ua()): no
     * takeover. A reachable window → keep to the app_* tools; every window on another Space → app_bring_to_current_space;
     * minimized / hidden → how to bring it back; no window → launch it in the background. → {outcome: "ok", text}.
     */
    async openApplicationInBackground(sessionId, { bundleId } = {}) {
      granted(sessionId, bundleId);
      const name = appName(sessionId, bundleId);
      const list = (await native.call("listWindows", { bundleId }).catch(() => null))?.windows ?? [];
      const approved = fullControl.isApproved(sessionId);
      if (list.some((w) => w.is_hidden !== true && w.is_minimized !== true && w.is_off_space !== true)) {
        const others = appLockBundles(sessionId).filter((id) => id !== bundleId).map((id) => appName(sessionId, id));
        return { outcome: "ok", reachable: true, text: `${name} is already running with a window you can reach. Act on it in the background with the app_* tools. If they come back unsupported or ineffective for what you need, ${approved
          ? "the next screen-wide tool call takes over the screen (the user already approved that) — say why in your reply first so they know what to expect."
          : "the next screen-wide tool call asks the user to approve taking over the screen — say why in your reply first so they know what to expect."}${others.length ? ` (You also control ${others.join(", ")} in the background; the app_* tools work on ${others.length > 1 ? "all of them" : "both"}.)` : ""}` };
      }
      if (list.length) {
        const hidden = list.some((w) => w.is_hidden === true);
        if (!hidden && list.every((w) => w.is_off_space === true)) {
          return { outcome: "ok", offSpace: true, text: `${name} is running on another Space. app_screenshot works on it there, and most apps take app_* clicks and typing in the background; if an action is refused because the window is on another Space, call app_bring_to_current_space to bring it here, or use the screen-wide tools.` };
        }
        const how = hidden ? "hidden with its app" : list.every((w) => w.is_minimized === true) ? "minimized" : "minimized or on another Space";
        return { outcome: "ok", parked: true, text: `${name} is running (its window is ${how}). To act on it, call app_bring_to_current_space with its window_id: the window comes back behind the one the user is working in, and the app doesn't take the keyboard. If the user is at the computer, tell them first — they may have put it away on purpose. app_list_windows gives the window_id.` };
      }
      const opened = await service.openApplication(sessionId, { bundleId, activates: false });
      return { outcome: "ok", launched: true, firstWindowId: opened.firstWindowId, text: `Launched ${name} in the background${opened.firstWindowId !== null
        ? ` — window_id ${opened.firstWindowId} is ready for the app_* tools.` : ". Call app_list_windows to find its window (it can take a moment to appear)."}` };
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

// app_bring_to_current_space: native showWindowBehindTheFrontWindow's result codes and how the official build words
// them (BEf0UhNC Yn). cameBack: the window is expected back on screen (read back with listWindows).
const SHOWN = Object.freeze({
  shown_behind_the_front_window: { cameBack: true, text: "behind the window the user is working in (the app did not take focus)" },
  shown_above_the_front_window: { cameBack: true, text: "but IN FRONT of the window the user is working in, which could not be put back on top: tell the user (the app did not take focus)" },
  shown_with_no_front_window: { cameBack: true, text: "on top: the app in front had no window of its own on screen" },
  shown_and_now_in_front: { cameBack: true, text: "and the app came to the FRONT with it: either by itself when it was shown, or because the user switched to it. The app the user was in is normally put back within 3 seconds; some of their typing may have gone to this one meanwhile. Tell the user, and do not take it for their consent to work in front of them" },
  still_parked: { cameBack: false, text: "The window did not come back within the expected time. It may still be settling: check is_minimized and is_hidden in a fresh app_list_windows before assuming it failed. If it stays away, ask the user to bring it back." },
  user_is_in_the_app: { cameBack: false, text: "The user is working in another window of this app right now, and this one would take the keyboard from them, so nothing was changed. Retry once the user is in another app, or ask them to bring it back." },
  front_window_cannot_be_raised: { cameBack: false, text: "The window would come back on top of what the user is working in, and their window cannot be put back above it (not at all, or not without taking the keyboard out of the panel or dialog they are in), so nothing was changed. Retry later, or ask the user to bring it back." },
  unavailable: { cameBack: false, text: "Bringing a minimized or hidden window back isn't available in this build, so nothing was changed. Ask the user to bring it back." },
});

/** The centre of a summary element, in frame pixels. */
const elementCenter = (e) => [e.frame.x + e.frame.width / 2, e.frame.y + e.frame.height / 2];

/** The native side sized the image; refuse one that breaks the docs/06 budget rather than pass it on. */
// CGWindowLayer of the menu bar (kCGMainMenuWindowLevel, the Window Server's bar) and its status items
// (kCGStatusWindowLevel, MenuBarAgent): the official hit test's "systemMenuBar".
const MENU_BAR_LAYERS = new Set([24, 25]);
// The desktop shell (the desktop, the Dock, Spotlight) is Finder's grant (official Ie / He()).
const DESKTOP_SHELL = "com.apple.finder";
// The processes that draw the desktop shell (official computer_use.node: the Dock, SystemUIServer, Spotlight, Control
// Center — the hit test's window owners). A point on their windows is the desktop shell's, i.e. Finder's grant; and
// they are never app_* targets: pressing a Dock item activates an app (official: app_* can't reach them at all).
const DESKTOP_SHELL_PROCESSES = new Set(["com.apple.dock", "com.apple.systemuiserver", "com.apple.Spotlight", "com.apple.controlcenter"]);
const DESKTOP_SHELL_REFUSAL = "The Dock (and the rest of the desktop shell: the desktop, Spotlight, the menu bar extras) can't be used with the app_* tools: pressing a Dock item opens or switches apps and brings one to the front, which takes the keyboard from the app the user is working in. To use it, call request_access with \"Finder\" (that one grant covers the desktop, the Dock and Spotlight), then app_release and use the display-scope tools (screenshot, left_click), which take over the screen — or ask the user. To open an app, use open_application.";
// app_click button "right" (official fr(), BEf0UhNC L3684): checked like a click, then refused with these words.
const CONTEXT_MENU_REFUSAL = "Opening a context (right-click) menu would bring the app to the front, so it was NOT done. Use app_menu to run the equivalent menu bar command, or click the target directly. To use the context menu itself, call app_release and use the display-scope tools.";
// Official Y(): the screen is locked (actions refused, screenshots still work).
const SCREEN_LOCKED_ACTION = "The screen is locked. app_screenshot continues to work in background mode, but actions (click, type, key, scroll, drag) need the screen unlocked — macOS blocks window-level Accessibility while locked. Screenshot to observe; act once the user returns.";
// app_drag: where a drag may not start (official ir(), BEf0UhNC L3424–3436), by native reasonCode → message for the app.
const DRAG_START_REFUSALS = Object.freeze({
  system_drag_session: (app) => `The drag starts on a link or a picture, which ${app} would pick up and drag as an item. In the background that takes keyboard focus from the app the user is working in, so the drag was NOT sent. Look for another way first: start the drag just beside the link or picture, or reach the same result with a click, a menu command or the keyboard (app_click, app_menu, app_key). Only if the task cannot be done without dragging this item, call app_release and use full-screen control for that one step.`,
  popup_menu: () => "The drag starts on a pop-up menu (a dropdown). A press on it opens its menu, and in the background that menu takes the keyboard from the app the user is working in, so the drag was NOT sent. A drag cannot start on a pop-up menu: start it beside the control. To choose one of its options there is no dependable way in the background that leaves the user's keyboard alone: call app_release and use full-screen control for that one step, or ask the user.",
});

// The screen-wide pointer tools (displayPointer).
const POINTER_KINDS = new Set(["mouse_move", "left_click", "right_click", "middle_click", "double_click", "triple_click", "left_mouse_down", "left_mouse_up", "left_click_drag", "scroll"]);
const CLICK_BUTTONS = Object.freeze({ left_click: ["left", 1], double_click: ["left", 2], triple_click: ["left", 3], right_click: ["right", 1], middle_click: ["middle", 1] });
const SCROLL_DIRECTIONS = ["up", "down", "left", "right"];
const refusal = (reasonCode, errorKind, message, extra = {}) => ({ outcome: "unsupported", reasonCode, errorKind, message, ...extra });
/** An app name fit for a note to the model (official F()): control and format characters out, at most 100 characters. */
function cleanName(name) {
  if (typeof name !== "string") return null;
  const clean = name.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "").trim().slice(0, 100);
  return clean || null;
}

// The screen-wide keyboard (displayKeyboard).
const KEYBOARD_KINDS = new Set(["key", "hold_key", "type"]);
const GRAPHEMES = (() => { try { return new Intl.Segmenter(undefined, { granularity: "grapheme" }); } catch { return null; } })();
const segmentGraphemes = (text) => (GRAPHEMES ? Array.from(GRAPHEMES.segment(text), (part) => part.segment) : Array.from(text));
/** A keyboard action the tool call's cancel (or the Esc stop) cut short, worded as the official build words it. */
function keyboardAborted(kind, result = {}) {
  const message = kind === "type" ? `Typing aborted after ${result?.typed ?? 0} of ${result?.total ?? "?"} graphemes (user interrupt).`
    : kind === "key" ? `Key repeat aborted after ${result?.pressed ?? 0} of ${result?.times ?? "?"} presses (user interrupt).`
      : "Key hold aborted (user interrupt); the keys were released.";
  return refusal("aborted", "aborted", message);
}

/**
 * The monitor names switch_display takes and the screenshot notes give (official si()): each display's name, or
 * "display <id>" without one; a repeated name gets " (2)", " (3)" in display-id order. Map displayId → label.
 */
function displayLabels(displays) {
  const counts = new Map(), labels = new Map();
  for (const display of [...displays].sort((a, b) => a.displayId - b.displayId)) {
    const base = typeof display.name === "string" && display.name.trim() ? display.name.trim() : `display ${display.displayId}`;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    labels.set(display.displayId, n === 1 ? base : `${base} (${n})`);
  }
  return labels;
}

/** A click's `text` (keys to hold, "cmd" or "cmd+shift", key syntax) → native modifier names. Anything but modifiers → bad_args. */
function modifiersOf(text) {
  if (text === undefined || text === null || text === "") return [];
  if (typeof text !== "string") throw coded("bad_args", "text must be the modifier keys to hold, e.g. \"cmd\" or \"shift+cmd\".");
  const { mods, keys } = parseCombo(text);
  const others = keys.filter((key) => key !== "fn");
  if (others.length) throw coded("bad_args", `text names keys to hold during the click, and only modifiers (cmd, shift, alt/option, ctrl, fn): "${others.join("+")}" isn't one.`);
  return [...mods.map((m) => (m === "meta" ? "cmd" : m)), ...(keys.includes("fn") ? ["fn"] : [])];
}

/**
 * A screen-wide tool's coordinate → a global point (official R()). With a screenshot: its image pixels, outside the
 * frame → bad_args. Without one: x / scaleFactor on the selected display (the official fallback), off it → take a
 * screenshot first.
 */
function displayPointFor(state, coordinate, displays, name = "coordinate") {
  if (!Array.isArray(coordinate) || coordinate.length !== 2 || !coordinate.every((v) => typeof v === "number" && Number.isFinite(v))) {
    throw coded("bad_args", `${name} must be [x, y], two numbers.`);
  }
  const shot = state.display;
  if (shot) {
    const point = imageToDisplayPoint(coordinate, shot);
    if (!point) throw coded("bad_args", `${name} (${coordinate.join(", ")}) is outside the last screenshot's ${shot.coordFrame.width}×${shot.coordFrame.height} frame. Take a new screenshot and use its pixels.`);
    return point;
  }
  const wanted = state.pinnedDisplay ?? state.selectedDisplay;
  const display = displays.find((d) => d.displayId === wanted) ?? displays.find((d) => d.isMain) ?? displays[0];
  if (!display) throw coded("screenshot_required", "No display was found. Take a screenshot first.");
  const factor = display.scaleFactor > 0 ? display.scaleFactor : 1;
  const x = Math.round(coordinate[0] / factor), y = Math.round(coordinate[1] / factor);
  if (coordinate[0] < 0 || coordinate[1] < 0 || x >= display.bounds.width || y >= display.bounds.height) {
    throw coded("screenshot_required", `${name} (${coordinate.join(", ")}) has no screenshot to refer to and is off the display. Take a screenshot first and use its pixels.`);
  }
  return { x: display.bounds.x + x, y: display.bounds.y + y };
}

function checkBudget(shot, scale = 1) {
  const expected = scaled(fit(shot.frameWidth, shot.frameHeight), scale);
  if (shot.width !== expected[0] || shot.height !== expected[1] || shot.jpegQuality !== 0.75) {
    throw coded("internal", `Capture size ${shot.width}×${shot.height} breaks the budget (expected ${expected.join("×")}).`);
  }
  return shot;
}

module.exports = { createComputerUse, checkBudget, summaryText, normalizeCombo, MAX_TYPE_UNITS, MAX_MENU_DEPTH, dragCoordinates, dragReadback, displayLabels,
  DESKTOP_SHELL_PROCESSES, DESKTOP_SHELL_REFUSAL, CONTEXT_MENU_REFUSAL };
