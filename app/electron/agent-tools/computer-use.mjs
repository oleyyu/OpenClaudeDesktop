// Computer use for the app's sessions: the app-scoped tools that act on one granted app's window in the background
// (electron/computer-use/service.cjs; field names from docs/02-tools.live.json). Working without anything from M4:
// request_access, app_list_windows, app_screenshot, app_ax_find, app_click (Accessibility only: left, right, double and triple click),
// app_type (Accessibility first, then the reason policy's raw rung), app_release, app_focus and app_menu (Accessibility
// in the native module, through ax-helper.cjs), app_zoom (a crop of the last screenshot), list_apps, list_granted_applications and app_batch
// (the tools above in order), app_key (official §1.6.1: Accessibility for return / escape / backspace / cmd+a, else one
// keystroke to the window's keyboard focus), app_scroll (official §1.6.2: the vertical scroll bar's AXValue through
// Accessibility, dy only), app_bring_to_current_space (official §1.6.3: a minimized / hidden window back behind the
// user's window, an off-Space window moved here), request_full_control / release_full_control (official §1.4), and the
// screen-wide tools of official §1.1 on the real cursor (screenshot, zoom, cursor_position, mouse_move, the five clicks,
// left_mouse_down / up, left_click_drag, scroll: service.cjs displayPointer, native DisplayInput.swift; type, key,
// hold_key: service.cjs displayKeyboard, native DisplayKeys.swift; open_application, switch_display, wait and
// computer_batch, the screen-wide actions in a row), and teach mode (official §1.3 / §2.2: request_teach_access,
// teach_step, teach_batch — tooltips on the overlay of electron/computer-use/teach.cjs, each step's actions run on Next
// through the screen-wide tools). read_clipboard / write_clipboard (official §1.5) need the clipboardRead /
// clipboardWrite flag and take the screen like the screen-wide tools; with clipboardWrite, type pastes text with a new
// line (service.cjs pasteText, clipboard.cjs).
// ctx.computerUse: { service (createComputerUse), resolveApps(names) → [{requested, bundleId, displayName, path,
//   installed}], listApps({query, runningFirst, limit, cursor}) → {apps, total, nextCursor?} (apps.cjs),
//   ask({reason, flags, apps, toolParams}) → "accept" | "decline" | "unavailable" }  (main.cjs)
//
// request_access asks with the access card (src/computer-use-approval-card.jsx) and records the answer in the session's
// grants; every other tool checks the grants first and answers a missing grant, like any refusal, in the one refusal
// shape ({ok: false, outcome, reasonCode, message, next_step}, isError) instead of throwing, so the agent knows what to
// do next.
import { t } from "../i18n/index.mjs";
import grantsModule from "../computer-use/grants.cjs";
import fullControlModule from "../computer-use/full-control.cjs";
import serviceModule from "../computer-use/service.cjs";
import clickThroughModule from "../computer-use/click-through.cjs";

const { tierFor, validBundleId } = grantsModule;
const { CU_LOCK_HELD_MESSAGE } = fullControlModule;
const { displayLabels } = serviceModule;
export const group = "computer-use";

const FLAGS = ["clipboardRead", "clipboardWrite", "systemKeyCombos"];
const MAX_APPS = 32;
const MAX_BATCH = 20;

function service(ctx) {
  const cu = ctx?.computerUse;
  if (!cu?.service) throw new Error("Computer use isn’t available here.");
  return cu;
}
const json = (value) => JSON.stringify(value, null, 2);
/**
 * A refusal the agent reads, in the one shape every tool refuses with: {ok: false, outcome: "unsupported", reasonCode,
 * message, next_step} (+ details such as closestMatch) and isError. Never thrown.
 */
function failure(code, message, nextStep, details) {
  const extra = details && typeof details === "object" ? Object.fromEntries(Object.entries(details).filter(([key]) => !["ok", "outcome", "reasonCode", "message", "next_step"].includes(key))) : {};
  return { content: [{ type: "text", text: json({ ok: false, outcome: "unsupported", reasonCode: code, message, ...extra, ...(nextStep ? { next_step: nextStep } : {}) }) }], isError: true };
}
const requestAccessStep = (app) => `Call request_access with apps: [${JSON.stringify(app)}] and a one-line reason, wait for the user's answer, then retry this call.`;
// save_panel_restricted: the same step whichever way the refusal arrives (a coded error, an app_* outcome, an app_key
// result, a screen-wide refusal).
const SAVE_PANEL_STEP = "Do what the message allows (a save sheet's Cancel always works), or ask the user to do it; don't try to reach the file another way.";
// What to do after each coded error from the service (native.cjs / service.cjs codes).
const NEXT_STEPS = {
  save_panel_restricted: SAVE_PANEL_STEP,
  app_not_granted: null, // requestAccessStep(app)
  screenshot_required: "Call app_screenshot for this app first; coordinate and element_index refer to that screenshot.",
  invalid_params: "Fix the arguments as the message says and call again.",
  window_not_found: "Call app_list_windows to see this app's windows, then pass one of their window_id values.",
  no_window: "The app has no window to use. Ask the user to open one, then call app_list_windows.",
  app_not_running: "The app isn't running. Ask the user to open it, then call app_list_windows.",
  listed_element_gone: "The window changed since the screenshot. Call app_screenshot again and use the new [N].",
  window_moved: "The window moved since the screenshot. Call app_screenshot again and use its coordinates.",
  screen_capture_denied: "Screen Recording permission is off for this app. Ask the user to turn it on in System Settings › Privacy & Security; don't retry until they do.",
  ax_untrusted_cannot_verify: "Accessibility permission is off for this app. Ask the user to turn it on in System Settings › Privacy & Security; don't retry until they do.",
  native_unavailable: "Computer use can't run on this computer right now. Tell the user; don't retry.",
  tier_refused: "This app is granted with fewer abilities (view only or click only). Use another way, or tell the user.",
  menu_item_not_found: "Check the titles: use closestMatch if it is what you meant, or call app_menu with list to see what is there.",
  no_menu_bar: "This app has no menu bar to use; work in its window instead.",
  helper_unavailable: "Computer use's Accessibility helper isn't available in this build. Tell the user; don't retry.",
  helper_timeout: "The app didn't answer through Accessibility in time (it may be busy). Try once more; if it fails again, tell the user.",
  zoom_unavailable: "Zooming isn't available here; use app_screenshot (scale 1) instead.",
};
// What to do after an outcome's reasonCode, where the general next step doesn't fit.
const REASON_STEPS = {
  save_panel_restricted: SAVE_PANEL_STEP,
  drag_ineffective: "The drag was released but the readable state did not change. Inspect a fresh app_screenshot before trying an alternative.",
  drag_timeout: "The drag exceeded 3000 ms and the mouse button was released. Inspect the app before retrying.",
  drag_in_progress: "Another drag is still running. Wait for it to finish before starting another.",
  menu_item_disabled: "The item is disabled right now (the app's state doesn't allow it, e.g. nothing is selected). Change that first, or tell the user.",
  menu_press_failed: "The item was found, but the app refused the press (it is probably disabled for now, e.g. no document is open or nothing is selected). Check the app's state with app_screenshot before trying again.",
  app_is_frontmost: "The app is in front and the user is working in it, so its focus isn't moved. Address the element with element_index instead, or ask the user.",
  window_minimized: "The window is minimized. Ask the user to restore it, or pick another window from app_list_windows.",
  focus_refused: "The app didn't take the focus change. Take an app_screenshot to see its state, or address elements with element_index.",
  no_menu_action: "This element has no context menu that Accessibility can open (nor do its two parents). Right-click the item itself (its element_index), use app_menu for the command, or tell the user.",
  canvas: "Nothing at that point has an Accessibility action (no press, nothing to select). Take a fresh app_screenshot and use the control's element_index, target \"focused\" for the app's own text cursor, or app_menu for a command.",
  select_refused: "This row can't be selected through Accessibility. Take a fresh app_screenshot and click a specific cell of it, or use the app's keyboard navigation (app_key up / down).",
  selection_not_confirmed: "The app accepted the selection but the row didn't read back as selected. Take a fresh app_screenshot to see what is selected before trying again.",
  popup_menu: "This is a pop-up or pull-down menu control: opening it in the background would take the keyboard from the user or bring the app forward, so it wasn't clicked. Use app_menu if the same command is in the menu bar, or tell the user.",
  no_range_for_position: "This text can't say which character is at that point, so no word or line was selected. app_type still inserts at the field's own cursor.",
  caret_not_placed: "The word or line selection couldn't be confirmed. Take a fresh app_screenshot to see the selection.",
  menu_not_shown: "The app didn't show a context menu. Take an app_screenshot to see its state; use app_menu for the command instead.",
};
/** A coded service error → a structured failure. */
function serviceFailure(error, app) {
  const code = typeof error?.code === "string" ? error.code : "internal";
  const next = code === "app_not_granted" ? requestAccessStep(app) : NEXT_STEPS[code] ?? null;
  return failure(code, t(String(error?.message || error)), next, error?.details && typeof error.details === "object" ? error.details : undefined);
}

/** The grant check every tool but request_access and app_release starts with: null when the app may be used. */
function checkGrant(ctx, app) {
  if (typeof app !== "string" || !validBundleId(app)) {
    return failure("invalid_params", "app must be a bundle identifier, such as com.apple.finder.",
      "Use the bundleId request_access returned for the app (call request_access with the app's name if you don't have it).");
  }
  if (!service(ctx).service.grantsFor(ctx.sessionId).has(app)) {
    return failure("app_not_granted", `${app} isn't one of this session's granted apps.`, requestAccessStep(app));
  }
  // Official §1.4.3: another session's full-screen control blocks background app control too (app_release excepted).
  const locked = service(ctx).service.displayLockedByOther?.(ctx.sessionId);
  if (locked) return notYet(locked.reasonCode, locked.message, CU_LOCK_HELD_STEP);
  return null;
}
const CU_LOCK_HELD_STEP = "Wait for the other session to finish (the user can stop it from the \"Claude is using your computer\" strip or with Esc), or find a way that doesn't need computer use. Don't retry in a loop.";
/** coordinate / element_index / target: at most one; `required` (app_click): exactly one. */
function checkAddressing(args, { required = false } = {}) {
  const given = ["coordinate", "element_index", "target"].filter((key) => args[key] !== undefined);
  if (given.length > 1) {
    return failure("invalid_params", `Give only one of coordinate, element_index and target (got ${given.join(" and ")}).`,
      "Pick one way to address the target: element_index from app_screenshot's summary is the most reliable.");
  }
  if (required && !given.length) {
    return failure("invalid_params", "Say what to click: give one of coordinate, element_index or target.",
      "Take an app_screenshot and pass the control's element_index (or target \"focused\"); a call never repeats the previous click by itself.");
  }
  return null;
}
/** A capability this build doesn't have yet: a reason code the agent can act on, not a missing tool. */
function notYet(reasonCode, message, nextStep) {
  return { content: [{ type: "text", text: json({ ok: false, outcome: "unsupported", reasonCode, message, next_step: nextStep }) }], isError: true };
}
/** A picture and its caption, as app_screenshot and app_zoom answer. */
function imageResult(text, dataUrl) {
  const match = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(String(dataUrl ?? ""));
  if (!match) return null;
  return { content: [{ type: "text", text }, { type: "image", data: match[2], mimeType: match[1] }] };
}
/** A step's outcome ({outcome, path, reasonCode?, …}): an error result unless it took effect. */
function outcomeResult(result, nextStep) {
  const ok = result?.outcome === "ok";
  nextStep = t(REASON_STEPS[result?.reasonCode] ?? nextStep);
  return { content: [{ type: "text", text: json({ ok, ...result, ...(ok || !nextStep ? {} : { next_step: nextStep }) }) }], ...(ok ? {} : { isError: true }) };
}
const windowId = (args) => (args.window_id === undefined ? undefined : args.window_id);

// The shared properties (docs/02-tools.live.json "shared"), described in our own words.
const APP = { type: "string", description: "The app's bundle identifier, e.g. com.apple.finder. It must be granted to this session (request_access)." };
const WINDOW_ID = { type: "integer", minimum: 1, description: "Which window of the app (a window_id from app_list_windows). Leave it out for the window you last took an app_screenshot of (or focused with app_focus), else the app's main window." };
const SCALE = { type: "number", minimum: 0.1, maximum: 1, default: 1, description: "0.1–1 (default 1): the size of the returned picture. Coordinates are unaffected." };
const COORDINATE = { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2,
  description: "[x, y] in pixels of the last app_screenshot of this window (full-resolution frame, top-left is 0,0). Needs that screenshot. Don't combine with element_index or target." };
const ELEMENT_INDEX = { type: "integer", minimum: 0, description: "An [N] from the last app_screenshot's element summary (or app_ax_find); aims at that element's center. Don't combine with coordinate or target." };
const TARGET = { type: "string", enum: ["focused"], description: "\"focused\": the element that has keyboard focus in the window, with no hit-testing. Don't combine with coordinate or element_index." };
const ACTION_SUMMARY = { type: "string", description: "A few words on what this does, for the user's transcript. No reasons, no secrets." };

/** app_screenshot, and app_batch's "screenshot" step (keepReference: the batch's coordinates stay on the earlier one). */
async function screenshot(args, ctx, { keepReference = false } = {}) {
  const refused = checkGrant(ctx, args.app);
  if (refused) return refused;
  const scale = args.scale === undefined ? 1 : args.scale;
  if (typeof scale !== "number" || !(scale >= 0.1 && scale <= 1)) return failure("invalid_params", "scale must be a number from 0.1 to 1.", "Leave scale out, or pass a value from 0.1 to 1.");
  try {
    const shot = await service(ctx).service.appScreenshot(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), scale, ...(keepReference ? { keepReference: true } : {}) });
    return imageResult(shot.summary, shot.dataUrl)
      ?? failure("capture_failed", "The capture came back without a picture.", "Call app_screenshot again; if it keeps failing, tell the user.");
  } catch (error) { return serviceFailure(error, args.app); }
}

// ── Screen-wide (display-scope) tools: shared pieces ─────────────────────────────────────────────────────────────────
const DISPLAY_COORDINATE = { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2,
  description: "[x, y] in pixels of the last full-screen screenshot as returned at scale 1 (top-left is 0,0)." };
const DISPLAY_SCALE = { type: "number", minimum: 0.1, maximum: 1, description: "0.1–1 (default 1): a smaller picture costs fewer tokens (0.5 is half as wide and high). Coordinates always stay in the scale-1 picture's pixels." };
const MODIFIERS = { type: "string", description: "Modifier keys to hold during the click, in key syntax: cmd, shift, alt (option), ctrl, fn, joined with + (\"cmd\", \"shift+cmd\")." };
const DISPLAY_GATE = "It takes full-screen control (approved once per session). The app in front must be one granted to this session at a level that allows the action, and the point must land on a granted app's window (the desktop and the Dock count as Finder); otherwise nothing is pressed and the reason comes back.";
const KEYBOARD_GATE = "It takes full-screen control (approved once per session). The app in front must be granted to this session at the full level (not a browser, terminal or code editor) and must stay in front: if another app comes forward partway, the rest is not sent and the reason comes back.";
const KEY_SYNTAX = "Key names: return (enter), tab, escape, space, backspace, delete (forward_delete), up, down, left, right, home, end, pageup, pagedown, f1–f20, letters, digits and punctuation; modifiers cmd, shift, alt (option), ctrl, fn; joined with +, e.g. \"cmd+shift+a\".";
const DISPLAY_DONE = Object.freeze({ mouse_move: "Moved.", left_click: "Clicked.", double_click: "Clicked.", triple_click: "Clicked.", right_click: "Clicked.",
  middle_click: "Clicked.", scroll: "Scrolled.", left_click_drag: "Dragged.", left_mouse_down: "Mouse button pressed.", left_mouse_up: "Mouse button released." });
// What the native gates mean when they refuse at posting time (they come back without a message).
const DISPLAY_MESSAGES = {
  secure_input_active: "Secure text entry is on (a password field has the keyboard), so no input was sent.",
  user_actively_typing: "The user is using the mouse or keyboard right now, so nothing was sent.",
  screen_locked: "The screen is locked, so nothing was sent.",
  hit_test_off_display: "That point isn't on any display.",
  state_conflict: "The left mouse button is already held down.",
  aborted: "It was stopped before it finished (user interrupt).",
  delivery_focus_check_failed: "Another app came to the front while the keys were being sent, so the rest was not sent.",
};
const DISPLAY_STEPS = {
  save_panel_restricted: SAVE_PANEL_STEP,
  allowlist_empty: "Call request_access with the apps you need, wait for the user's answer, then retry.",
  takeover_required: "Call request_full_control and wait for the user's answer, then retry.",
  takeover_unavailable: "Call request_full_control (the user approves it on a card), then retry; or keep working with the app_* tools.",
  takeover_declined: "The user kept you in the background: keep working app by app with the app_* tools, or ask the user how to proceed.",
  cu_lock_held: CU_LOCK_HELD_STEP,
  app_not_granted: "Call request_access for that app (\"Finder\" covers the desktop and the Dock), or bring a granted app to the front, then take a fresh screenshot.",
  tier_insufficient: "Use what that app's level allows (a plain left click or scroll in a terminal or editor; the browser tools for web pages; the Bash tool for commands), or tell the user.",
  unattributed_window: "Act on a window that belongs to an app, or ask the user to move or close the one in the way.",
  hit_test_self_intercept: "This app's own window is at that point. Take a fresh screenshot and aim at the target app's window.",
  self_frontmost: "Click the target app first, then retry.",
  grant_flag_required: "Call request_access with systemKeyCombos: true, or do it without that shortcut.",
  delivery_focus_check_failed: "Take a fresh screenshot to see where the keyboard focus is and what arrived, then retry in the app you meant.",
  aborted: "The user stopped it. Don't retry unless they ask you to.",
  app_not_installed: "Check the app's name or bundle identifier (list_apps), or tell the user it isn't installed.",
  open_failed: "Tell the user the app couldn't be opened; don't retry in a loop.",
  open_timeout: "Take a screenshot to see whether it opened; don't retry in a loop.",
  display_error: "Take a screenshot instead; switch_display can't list the monitors right now.",
  executor_threw: "Take a fresh screenshot to see the state, then continue from the failed action.",
  secure_input_active: "Ask the user to finish with the password field (or leave it), then retry.",
  user_actively_typing: "Wait a moment for the user to stop, then retry once; don't loop.",
  screen_locked: "Ask the user to unlock the screen; don't retry until they do.",
  hit_test_off_display: "Take a new screenshot and use its pixels.",
  bad_args: "Fix the arguments as the message says and call again.",
  screenshot_required: "Take a screenshot first and use its pixels.",
  display_not_found: "Take a screenshot to see which display is in use.",
  scgevent_unavailable: "Input can't be sent on this computer right now. Tell the user; don't retry.",
  native_unavailable: "Computer use can't run on this computer right now. Tell the user; don't retry.",
  screen_capture_denied: NEXT_STEPS.screen_capture_denied,
};
/** A screen-wide refusal in the one shape every tool refuses with: {ok:false, outcome, reasonCode, message, next_step} + isError. */
function displayRefusal(result) {
  const reasonCode = typeof result?.reasonCode === "string" ? result.reasonCode : "internal";
  const message = t(result?.message || DISPLAY_MESSAGES[reasonCode] || `The action was refused (${reasonCode}).`);
  const appLocked = reasonCode === "state_conflict" && Array.isArray(result?.appLockHeld);
  const next = typeof result?.next_step === "string" && result.next_step ? result.next_step
    : appLocked ? "Keep using the app_* tools, or call app_release for those windows first, then retry."
    : DISPLAY_STEPS[reasonCode] ?? (reasonCode === "state_conflict" ? "Take a fresh screenshot and retry once the state allows it." : "Take a fresh screenshot and try another way, or tell the user.");
  const { outcome = "unsupported", message: _m, ...rest } = result && typeof result === "object" ? result : {};
  return { content: [{ type: "text", text: json({ ok: false, ...rest, outcome: outcome === "ok" ? "unsupported" : outcome, reasonCode, message, next_step: t(next) }) }], isError: true };
}
/** A coded service error (bad_args, screenshot_required, a native failure) as a screen-wide refusal. */
const displayError = (error) => displayRefusal({ outcome: "unsupported", reasonCode: typeof error?.code === "string" ? error.code : "internal",
  errorKind: typeof error?.code === "string" ? error.code : "internal", message: String(error?.message || error) });

/**
 * Before a screen-wide action (official ta() + ua()): the precheck (nothing granted, another session's lock, this
 * session's app windows), then full-screen approval: already approved or the preferred mode is Full control → go on;
 * else the "Take over the screen?" card. null when the action may go ahead, else a refusal result.
 */
async function displayTakeover(ctx, { appLocksAllowed = false } = {}) {
  const cu = service(ctx), svc = cu.service;
  const pre = svc.displayPrecheck(ctx.sessionId, { appLocksAllowed });
  if (pre) return displayRefusal(pre);
  if (svc.fullControl.isApproved(ctx.sessionId)) return null;
  let answer = "unavailable";
  try { answer = await cu.askTakeover({ becausePreferredBackground: false }); } catch { answer = "unavailable"; }
  if (answer === "unavailable") {
    return displayRefusal({ reasonCode: "takeover_unavailable", errorKind: "takeover_unavailable",
      message: "This needs full-screen control, which the user approves on a card, and the card can't be shown here right now." });
  }
  if (answer !== "accept") {
    return displayRefusal({ reasonCode: "takeover_declined", errorKind: "takeover_declined",
      message: "The user kept you in the background, so full-screen control wasn't granted. This is separate from app access (request_access can't grant it)." });
  }
  const late = svc.displayLockedByOther?.(ctx.sessionId);
  if (late) return displayRefusal({ ...late, message: CU_LOCK_HELD_MESSAGE });
  svc.requestFullControl(ctx.sessionId, { approved: true });
  return null;
}
const scaleArg = (scale) => {
  if (scale === undefined) return 1;
  if (typeof scale !== "number" || !(scale >= 0.1 && scale <= 1)) throw Object.assign(new Error("scale must be a number from 0.1 to 1."), { code: "bad_args" });
  return scale;
};
/** The picture of a screen-wide capture, with the official notes: the scaled view's frame, which display it is. */
function displayImage(shot, notes = []) {
  const match = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(String(shot?.dataUrl ?? ""));
  if (!match) return displayRefusal({ reasonCode: "capture_failed", errorKind: "capture_failed", message: "The capture came back without a picture." });
  const text = notes.filter(Boolean).join("\n");
  return { content: [...(text ? [{ type: "text", text }] : []), { type: "image", data: match[2], mimeType: match[1] }] };
}
const scaleNote = (scale, frame) => (scale < 1 ? `${scale}-scale view; coordinate frame: ${frame.width}x${frame.height}.` : null);
/**
 * Which monitor a screenshot is of, when there are several (official ci()): said on the first screenshot and when the
 * monitor changed since the previous one, with the others' names for switch_display.
 */
function displayNote(displays, displayId, previousId) {
  if (displays.length < 2) return null;
  const labels = displayLabels(displays), label = (id) => labels.get(id) ?? `display ${id}`;
  const others = displays.filter((d) => d.displayId !== displayId).map((d) => `"${label(d.displayId)}"`);
  const rest = others.length ? ` Other attached monitors: ${others.join(", ")}. Use switch_display to capture a different monitor.` : "";
  if (previousId === null || previousId === undefined || previousId === 0) return `This screenshot was taken on monitor "${label(displayId)}".${rest}`;
  if (previousId !== displayId) return `This screenshot was taken on monitor "${label(displayId)}", which is not the one your previous screenshot was taken on ("${label(previousId)}").${rest}`;
  return null;
}
/**
 * hideBeforeAction inside computer_batch and a teach step (official Zi() / ti(): the options forced to
 * {hideBeforeAction: false} for each action): the apps were hidden once before the first action instead.
 */
const hideOption = (ctx) => (ctx?.cuHideDone === true ? { hide: false } : {});
/** The batch / step's actions run with hiding done: one prepareForAction before them (official Zi() / ti()). */
async function hideOnce(ctx) {
  try { await service(ctx).service.prepareForAction?.(ctx.sessionId); } catch {}
  return Object.assign(Object.create(Object.getPrototypeOf(ctx ?? {})), ctx, { cuHideDone: true });
}
/** screenshot, and computer_batch's "screenshot" step (keepReference: it becomes the reference when the batch ends). */
async function displayScreenshotTool(args, ctx, { keepReference = false } = {}) {
  const refused = await displayTakeover(ctx);
  if (refused) return refused;
  try {
    const scale = scaleArg(args.scale);
    const svc = service(ctx).service;
    const shot = await svc.displayScreenshot(ctx.sessionId, { scale, ...(keepReference ? { keepReference: true } : {}), ...hideOption(ctx) });
    if (shot?.outcome === "unsupported") return displayRefusal(shot);
    const displays = (await svc.listDisplays().catch(() => null))?.displays ?? [];
    // Official ui(): the monitor note, the apps hidden before it (oi()), the scale note, then the picture.
    const result = displayImage(shot, [displayNote(displays, shot.displayId, shot.previousDisplayId), shot.hiddenNote ?? null, scaleNote(scale, shot.coordFrame)]);
    return keepReference && !result.isError ? { ...result, reference: shot.reference } : result;
  } catch (error) { return displayError(error); }
}
async function displayZoomTool(args, ctx) {
  const refused = await displayTakeover(ctx);
  if (refused) return refused;
  try {
    const scale = scaleArg(args.scale);
    const zoomed = await service(ctx).service.displayZoom(ctx.sessionId, { region: args.region, scale });
    if (zoomed?.outcome === "unsupported") return displayRefusal(zoomed);
    return displayImage(zoomed, [scaleNote(scale, { width: zoomed.width / scale, height: zoomed.height / scale })]);
  } catch (error) { return displayError(error); }
}
async function displayCursorTool(ctx) {
  const pre = service(ctx).service.displayPrecheck(ctx.sessionId, { appLocksAllowed: true });
  if (pre) return displayRefusal(pre);
  try {
    return { content: [{ type: "text", text: json(await service(ctx).service.displayCursor(ctx.sessionId)) }] };
  } catch (error) { return displayError(error); }
}
async function displayPointerTool(kind, args, ctx) {
  const refused = await displayTakeover(ctx);
  if (refused) return refused;
  try {
    const result = await service(ctx).service.displayPointer(ctx.sessionId, { kind, ...args, signal: ctx.signal, ...hideOption(ctx) });
    if (result?.outcome === "ok") return DISPLAY_DONE[kind];
    return displayRefusal(result);
  } catch (error) { return displayError(error); }
}
/** type / key / hold_key (official hi() / gi() / Li()): service.cjs displayKeyboard, after the takeover. */
async function displayKeyboardTool(kind, args, ctx) {
  const refused = await displayTakeover(ctx);
  if (refused) return refused;
  try {
    const result = await service(ctx).service.displayKeyboard(ctx.sessionId, { kind, text: args.text, repeat: args.repeat, duration: args.duration, signal: ctx.signal, ...hideOption(ctx) });
    if (result?.outcome === "ok") return result.text;
    return displayRefusal(result);
  } catch (error) { return displayError(error); }
}
/** The one check wait and switch_display make (official ta(): they don't take the screen): some app is granted. */
function allowlistRefusal(ctx) {
  const pre = service(ctx).service.displayPrecheck(ctx.sessionId, { appLocksAllowed: true });
  return pre?.reasonCode === "allowlist_empty" ? displayRefusal(pre) : null;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** wait (official ji()): 0–100 seconds, checking every 50 ms whether the call was stopped. */
async function waitTool(args, ctx) {
  const refused = allowlistRefusal(ctx);
  if (refused) return refused;
  const duration = args.duration;
  const bad = (message) => displayRefusal({ reasonCode: "bad_args", errorKind: "bad_args", message });
  if (typeof duration !== "number" || !Number.isFinite(duration)) return bad("duration must be a number of seconds.");
  if (duration < 0) return bad("duration can't be negative.");
  if (duration > 100) return bad("duration is too long: it is in seconds, at most 100.");
  const until = Date.now() + duration * 1000;
  while (Date.now() < until) {
    if (ctx.signal?.aborted) return displayRefusal({ reasonCode: "aborted", errorKind: "aborted", message: "Wait aborted (user interrupt)." });
    await sleep(Math.min(50, until - Date.now()));
  }
  return `Waited ${duration}s.`;
}
/** switch_display (official Si()): pin the monitor the screen-wide tools capture and aim at, or "auto". */
async function switchDisplayTool(args, ctx) {
  const refused = allowlistRefusal(ctx);
  if (refused) return refused;
  try { return (await service(ctx).service.switchDisplay(ctx.sessionId, { display: args.display })).text; } catch (error) { return displayError(error); }
}
/**
 * open_application (official xi(), and ua()'s background branch): the app must be granted; any tier may be opened.
 * Holding app windows → it opens in the background. Nobody holding the screen with the preferred mode Background →
 * no takeover: point at the app_* tools, or launch it in the background. Otherwise it takes the screen and opens the
 * app in front.
 */
async function openApplicationTool(args, ctx) {
  const svc = service(ctx).service, sessionId = ctx.sessionId;
  const pre = svc.displayPrecheck(sessionId, { appLocksAllowed: true });
  if (pre) return displayRefusal(pre);
  try {
    const bundleId = svc.grantedAppFor(sessionId, args.app);
    if (typeof bundleId !== "string") return displayRefusal(bundleId);
    const name = String(args.app).trim();
    if (svc.appLockBundles(sessionId).length) {
      const opened = await svc.openApplication(sessionId, { bundleId, activates: false });
      return `Opened "${name}" in the background${opened.firstWindowId !== null ? ` (window_id ${opened.firstWindowId})` : ""} — the app in front wasn't disturbed. Act on it with app_list_windows or app_screenshot.`;
    }
    if (!svc.fullControl.holder() && svc.fullControl.preferredMode() === "background") {
      return (await svc.openApplicationInBackground(sessionId, { bundleId })).text;
    }
    const refused = await displayTakeover(ctx);
    if (refused) return refused;
    const lock = svc.acquireDisplayLock(sessionId);
    if (lock) return displayRefusal(lock);
    await svc.openApplication(sessionId, { bundleId, activates: true });
    const displays = (await svc.listDisplays().catch(() => null))?.displays ?? [];
    return displays.length >= 2 ? `Opened "${name}". If the next screenshot doesn't show it, it may have opened on another monitor — check with switch_display.` : `Opened "${name}".`;
  } catch (error) { return displayError(error); }
}

// computer_batch (official Zi() / Xi() / Ki() / Yi()): the screen-wide actions in a row, each through the tool that does
// it alone (the gates run again before every action).
const BATCH_ACTIONS = Object.freeze(["key", "type", "mouse_move", "left_click", "left_click_drag", "right_click", "middle_click", "double_click",
  "triple_click", "scroll", "hold_key", "screenshot", "zoom", "cursor_position", "left_mouse_down", "left_mouse_up", "wait"]);
// The pause before an action (official Ki() on macOS): 10 ms, plus this per pointer action, plus 50 after a mouse_move.
const BATCH_SETTLE = Object.freeze({ left_click: 150, right_click: 150, middle_click: 150, double_click: 150, triple_click: 150, scroll: 100,
  left_click_drag: 100, left_mouse_down: 50, left_mouse_up: 50 });
const batchPause = (action, previous) => 10 + (BATCH_SETTLE[action] ?? 0) + (previous === "mouse_move" ? 50 : 0);
function runBatchAction(action, step, ctx) {
  const { action: _a, ...args } = step;
  switch (action) {
    case "screenshot": return displayScreenshotTool(args, ctx, { keepReference: true });
    case "zoom": return displayZoomTool(args, ctx);
    case "cursor_position": return displayCursorTool(ctx);
    case "type": case "key": case "hold_key": return displayKeyboardTool(action, args, ctx);
    case "wait": return waitTool(args, ctx);
    default: return displayPointerTool(action, args, ctx);
  }
}
/** One action's lines (official Yi()): "[i/N] action: <its text, or ok>", "FAILED — " on an error; pictures after. */
function batchLines(index, total, action, result, omitImages) {
  const content = typeof result === "string" ? [{ type: "text", text: result }] : Array.isArray(result?.content) ? result.content : [];
  const texts = content.filter((part) => part.type === "text").map((part) => part.text.trim()).filter(Boolean);
  const images = content.filter((part) => part.type === "image");
  const line = { type: "text", text: `[${index + 1}/${total}] ${action}: ${result?.isError ? "FAILED — " : ""}${texts.length ? texts.join("\n") : "ok"}${omitImages && images.length ? " [Image omitted due to error]" : ""}` };
  return omitImages ? [line] : [line, ...images];
}
async function computerBatch(args, ctx) {
  const actions = args.actions;
  const bad = (message) => displayRefusal({ reasonCode: "bad_args", errorKind: "bad_args", message });
  if (!Array.isArray(actions) || !actions.length) return bad("actions must be a non-empty array.");
  for (const [index, step] of actions.entries()) {
    if (!step || typeof step !== "object" || Array.isArray(step)) return bad(`actions[${index}] must be an object.`);
    if (typeof step.action !== "string") return bad(`actions[${index}].action must be a string.`);
    if (!BATCH_ACTIONS.includes(step.action)) return bad(`actions[${index}].action "${step.action}" can't be part of a batch. Allowed: ${BATCH_ACTIONS.join(", ")}.`);
  }
  const svc = service(ctx).service;
  // Only waits: nothing on the screen is touched, so no takeover (official Ar()).
  const refused = actions.every((step) => step.action === "wait") ? allowlistRefusal(ctx) : await displayTakeover(ctx);
  if (refused) return refused;
  // Official Zi(): the apps outside the allowlist are hidden once, before the first action (not for a batch of waits).
  const inner = actions.every((step) => step.action === "wait") ? ctx : await hideOnce(ctx);
  // Official Gi(): the pointer actions in a row are one input burst (click-through.cjs).
  return withBurst(svc, (burst) => runBatch(actions, burst, svc, inner));
}
/** Official Gi() around a batch / teach step body: beforeAction(action) opens or closes the input burst. */
const withBurst = (svc, body) => clickThroughModule.withInputBurst(() => (typeof svc.beginInputBurst === "function" ? svc.beginInputBurst() : () => {}), body);
async function runBatch(actions, burst, svc, ctx) {
  const total = actions.length, done = [];
  let reference = null;
  const releaseHeld = async () => { try { await svc.releaseHeldMouse(); } catch {} };
  for (const [index, step] of actions.entries()) {
    if (ctx.signal?.aborted) {
      await releaseHeld();
      return displayRefusal({ reasonCode: "aborted", errorKind: "aborted", message: `Batch aborted after ${done.length} of ${total} actions (user interrupt).` });
    }
    burst.beforeAction(step.action);
    if (index > 0) await sleep(batchPause(step.action, actions[index - 1].action));
    let result;
    try { result = await runBatchAction(step.action, step, ctx); } catch (error) {
      result = displayRefusal({ reasonCode: "executor_threw", errorKind: "executor_threw", message: `${step.action} threw: ${error?.message ?? error}` });
    }
    if (result && typeof result === "object" && result.reference) { reference = result.reference; result = { ...result, reference: undefined }; }
    done.push({ action: step.action, result });
    if (result?.isError) {
      await releaseHeld();
      let failed = {};
      try { failed = JSON.parse(result.content.find((part) => part.type === "text")?.text ?? "{}"); } catch {}
      const lines = done.flatMap((entry, i) => batchLines(i, total, entry.action, entry.result, true));
      const stop = { ok: false, outcome: failed.outcome ?? "unsupported", reasonCode: failed.reasonCode ?? "internal",
        message: `Batch stopped at actions[${index}] (${step.action}). ${done.length - 1} completed, ${total - done.length} remaining.`,
        stoppedAt: index, completed: done.length - 1, remaining: total - done.length,
        next_step: t(`Fix actions[${index}] as its line says (take a fresh screenshot if the screen changed), then send the remaining actions again.`) };
      return { content: [...lines, { type: "text", text: json(stop) }], isError: true };
    }
  }
  // The batch's last full-screen screenshot is the next call's coordinate reference (official Zi()).
  if (reference) svc.setDisplayReference(ctx.sessionId, reference);
  return { content: done.flatMap((entry, i) => batchLines(i, total, entry.action, entry.result, false)) };
}

// ── Teach mode (official §1.3 / §2.2: Fe(), $r(), ei(), ti(), ri(), ii()) ─────────────────────────────────────────────
// request_teach_access asks with the teach card (src/computer-use-approval-card.jsx ComputerUseTeachCard); on Start
// guide the apps are granted, full-screen control is approved and the display lock taken for the tour, and teach mode
// starts (electron/computer-use/teach.cjs). Each step shows a tooltip on the overlay and waits for Next, then runs its
// actions through the same tools computer_batch uses (the gates run again before each), then one fresh screenshot.
// ctx.computerUse.teach: { isActive(), activate(), showStep(payload) → {action}, working(), beforeAction(),
// afterAction(), cancelStep() } for the calling session; ctx.computerUse.askTeach({reason, apps}) → "accept" |
// "decline" | "unavailable" (main.cjs).
const TEACH_ACTIONS = Object.freeze(BATCH_ACTIONS.filter((action) => action !== "zoom"));
const TEACH_STEP = {
  explanation: { type: "string", description: "The tooltip's text: what the user is looking at and why it matters. It is the only text the user sees during the tour — complete, but short." },
  next_preview: { type: "string", description: "One line on exactly what happens when the user clicks Next, e.g. \"Next: I'll click New Document and type the title.\" Shown under the explanation in smaller type (may be empty)." },
  anchor: { ...DISPLAY_COORDINATE, description: "[x, y] the tooltip's arrow points at, in pixels of the last full-screen screenshot as returned at scale 1. Leave it out for a centered tooltip without an arrow (for a general step)." },
  actions: { type: "array", description: "What to do when the user clicks Next, in order, as computer_batch's actions (zoom isn't one). An empty list is a step that only explains. The first action that fails stops the step.",
    items: { type: "object", properties: {
      action: { type: "string", enum: TEACH_ACTIONS },
      coordinate: DISPLAY_COORDINATE,
      start_coordinate: { ...DISPLAY_COORDINATE, description: "left_click_drag: where to press (default: the cursor)." },
      scale: DISPLAY_SCALE,
      text: { type: "string", description: "type: the text; key / hold_key: the key or shortcut; clicks: modifier keys to hold." },
      scroll_direction: { type: "string", enum: ["up", "down", "left", "right"] },
      scroll_amount: { type: "integer", minimum: 0, maximum: 100 },
      duration: { type: "number", minimum: 0, maximum: 100, description: "hold_key / wait: seconds." },
      repeat: { type: "integer", minimum: 1, maximum: 100, description: "key: how many presses." },
    }, required: ["action"], additionalProperties: false } },
};
const TEACH_STEPS = {
  feature_unavailable: "Teach mode can't run in this session. Explain the steps in the chat instead, or do the task with request_access.",
  teach_mode_conflict: "Finish the current tour (or let the turn end) first, then ask again with the full list of apps.",
  teach_mode_not_active: "Call request_teach_access first and wait for the user to start the guide.",
  teach_declined: "Don't ask again for this walkthrough. Ask the user how to go on — for example whether you should just do the task for them.",
  self_app_denied: "Leave this app out of the list: its own window can't be taught or controlled.",
  approval_unavailable: "Tell the user the walkthrough needs the app's session window to ask them, and to try again there.",
  bad_args: "Fix the step as the message says and call again; no tooltip was shown.",
  cu_lock_held: "Ask the user to try again once the other session is done with the computer.",
};
/** A teach refusal in the one shape every tool refuses with: {ok:false, outcome, reasonCode, message, next_step} + isError. */
function teachRefusal(reasonCode, message, extra = {}) {
  return { content: [{ type: "text", text: json({ ok: false, outcome: "unsupported", reasonCode, errorKind: reasonCode, message: t(message), ...extra,
    next_step: t(TEACH_STEPS[reasonCode] ?? "Take a fresh screenshot and try another way, or tell the user.") }) }], isError: true };
}
const teachOf = (ctx) => service(ctx).teach ?? null;
/**
 * What the card says about hiding (official Wr() previewHideSet → willHide, getAutoUnhideEnabled): the apps the next
 * full-screen action would hide with these apps allowed too, and whether they come back at the end.
 */
async function hideFacts(cu, ctx, apps) {
  let willHide = [];
  try { willHide = await cu.service.previewHideSet?.(ctx.sessionId, apps.map((entry) => entry.bundleId).filter(Boolean)) ?? []; } catch { willHide = []; }
  if (!willHide.length) return {};
  let autoUnhideEnabled = true;
  try { autoUnhideEnabled = cu.autoUnhideEnabled?.() !== false; } catch {}
  return { willHide, autoUnhideEnabled };
}

async function requestTeachAccess(args, ctx) {
  const cu = service(ctx), svc = cu.service, teach = teachOf(ctx);
  if (!teach || typeof cu.askTeach !== "function") return teachRefusal("feature_unavailable", "Teach mode isn't available in this session.");
  if (teach.isActive()) return teachRefusal("teach_mode_conflict", "Teach mode is already on. To add apps, end this tour first, then call request_teach_access again with every app it needs.");
  const reason = typeof args.reason === "string" ? args.reason.trim() : "";
  if (!reason) return teachRefusal("bad_args", "reason is required: the user reads it on the card.");
  if (!Array.isArray(args.apps) || !args.apps.every((app) => typeof app === "string")) return teachRefusal("bad_args", "\"apps\" must be an array of strings.");
  const names = [...new Set(args.apps.map((app) => app.trim()).filter(Boolean))];
  if (names.length > MAX_APPS) return teachRefusal("bad_args", `Ask for at most ${MAX_APPS} apps at a time.`);
  const grants = svc.grantsFor(ctx.sessionId);
  const resolved = names.length ? await cu.resolveApps(names) : [];
  if (resolved.some((entry) => entry.bundleId && svc.isSelfApp?.(entry.bundleId))) {
    return teachRefusal("self_app_denied", "This app can't be part of a walkthrough: it can't see or control its own window.");
  }
  const apps = resolved.map((entry) => ({ ...entry, tier: entry.bundleId ? tierFor(entry.bundleId) : null, alreadyGranted: !!entry.bundleId && grants.has(entry.bundleId) }));
  const grantedNow = () => apps.filter((entry) => entry.installed && grants.has(entry.bundleId))
    .map((entry) => ({ app: entry.requested, bundleId: entry.bundleId, name: entry.displayName, tier: grants.tierOf(entry.bundleId) }));
  const base = { screenshotFiltering: "granted_apps_only" };
  // Official $r(): an app that isn't installed ends the request before any card (nothing is asked).
  const missing = apps.filter((entry) => !entry.installed);
  if (missing.length) {
    return json({ granted: grantedNow(), denied: [], notInstalled: { apps: missing.map((entry) => entry.requested),
      guidance: t("These apps aren't installed on this Mac, so the walkthrough wasn't offered. Check the names (list_apps shows what is installed), or ask the user which app they mean, then call request_teach_access again.") },
      teachModeActive: false, ...base });
  }
  if (!apps.length) return json({ granted: [], denied: [], teachModeActive: false, ...base });
  const asking = apps.filter((entry) => !entry.alreadyGranted);
  let answer = "unavailable";
  try { answer = await cu.askTeach({ reason, apps: apps.map(({ requested, ...entry }) => entry), ...(await hideFacts(cu, ctx, apps)) }); } catch { answer = "unavailable"; }
  if (answer === "unavailable") return teachRefusal("approval_unavailable", "The walkthrough card can't be shown in this session right now, so teach mode didn't start.");
  if (answer !== "accept") return teachRefusal("teach_declined", "The user declined the guided walkthrough (teach mode), so it didn't start.");
  grants.grant(asking.map((entry) => ({ bundleId: entry.bundleId, displayName: entry.displayName })), {});
  const granted = grantedNow();
  const denied = apps.filter((entry) => !grants.has(entry.bundleId)).map((entry) => ({ app: entry.requested, bundleId: entry.bundleId, reason: "not_grantable" }));
  let active = false;
  if (granted.length) {
    // Official acquireTeachLockPostConsent: the display lock for the tour, and full-screen control approved ("teach").
    const holder = svc.fullControl.holder();
    if (holder && holder !== ctx.sessionId) {
      return teachRefusal("cu_lock_held", "Another session started using the computer while the card was waiting, so teach mode couldn't start.");
    }
    svc.requestFullControl(ctx.sessionId, { approved: true });
    if (svc.fullControl.acquireLock(ctx.sessionId) !== "ok") return teachRefusal("cu_lock_held", "Another session started using the computer while the card was waiting, so teach mode couldn't start.");
    teach.activate();
    active = true;
  }
  try { cu.toolsChanged?.(); } catch {}
  return json({ granted, denied, teachModeActive: active, ...base,
    ...(active ? { next_step: t("Take a screenshot, then show the first step with teach_step or teach_batch (anchor it on that screenshot).") } : {}) });
}

/** Official ei(): one step's fields checked, its anchor placed (an anchor that can't be placed centers the tooltip). */
async function teachStepOf(step, ctx, where) {
  if (!step || typeof step !== "object" || Array.isArray(step)) return new Error(`${where} must be an object.`);
  if (typeof step.explanation !== "string") return new Error(`${where}: "explanation" must be a string.`);
  if (typeof step.next_preview !== "string") return new Error(`${where}: "next_preview" must be a string.`);
  if (!Array.isArray(step.actions)) return new Error(`${where}: "actions" must be an array (empty is allowed).`);
  for (const [index, item] of step.actions.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return new Error(`${where}: actions[${index}] must be an object.`);
    if (typeof item.action !== "string") return new Error(`${where}: actions[${index}].action must be a string.`);
    if (!TEACH_ACTIONS.includes(item.action)) return new Error(`${where}: actions[${index}].action="${item.action}" isn't allowed. Allowed: ${TEACH_ACTIONS.join(", ")}.`);
  }
  let anchorLogical;
  if (step.anchor !== undefined) {
    const anchor = step.anchor;
    if (!Array.isArray(anchor) || anchor.length !== 2 || !anchor.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return new Error(`${where}: "anchor" must be an [x, y] pair of numbers, or left out.`);
    }
    anchorLogical = (await service(ctx).service.displayAnchor?.(ctx.sessionId, anchor)) ?? undefined;
  }
  return { explanation: step.explanation, nextPreview: step.next_preview, anchorLogical, actions: step.actions };
}
/** A teach action through the tool that does it alone (a screenshot in a step becomes the reference at once, official $i()). */
function runTeachAction(action, step, ctx) {
  const { action: _a, ...args } = step;
  return action === "screenshot" ? displayScreenshotTool(args, ctx) : runBatchAction(action, step, ctx);
}
const firstText = (result) => (typeof result === "string" ? result : result?.content?.[0]?.type === "text" ? result.content[0].text : "");
/**
 * Official ti(): show the tooltip and wait; Exit (or the call stopped) → exit; Next → Working…, then the actions in
 * order with computer_batch's pauses, the overlay click-through around each; the first error stops the step.
 */
async function runTeachStep(step, ctx) {
  const teach = teachOf(ctx), svc = service(ctx).service;
  const releaseHeld = async () => { try { await svc.releaseHeldMouse(); } catch {} };
  const onAbort = () => teach.cancelStep();
  ctx.signal?.addEventListener?.("abort", onAbort, { once: true });
  let answer;
  try {
    answer = ctx.signal?.aborted ? { action: "exit" } : await teach.showStep({ explanation: step.explanation, nextPreview: step.nextPreview, anchorLogical: step.anchorLogical });
  } finally { ctx.signal?.removeEventListener?.("abort", onAbort); }
  if (answer?.action !== "next") { await releaseHeld(); return { kind: "exit" }; }
  teach.working();
  if (!step.actions.length) return { kind: "ok", results: [] };
  // Official ti(): the apps outside the allowlist are hidden once before the step's actions.
  const inner = await hideOnce(ctx);
  // Official ri() / ii(): each step's actions run inside Gi(), so its pointer actions in a row are one input burst.
  return withBurst(svc, (burst) => runTeachActions(step, burst, teach, inner, releaseHeld));
}
async function runTeachActions(step, burst, teach, ctx, releaseHeld) {
  const results = [];
  for (const [index, item] of step.actions.entries()) {
    if (ctx.signal?.aborted) { await releaseHeld(); return { kind: "exit" }; }
    burst.beforeAction(item.action);
    if (index > 0) await sleep(batchPause(item.action, step.actions[index - 1].action));
    teach.beforeAction();
    let result;
    try { result = await runTeachAction(item.action, item, ctx); } catch (error) {
      result = displayRefusal({ reasonCode: "executor_threw", errorKind: "executor_threw", message: `${item.action} threw: ${error?.message ?? error}` });
    } finally { teach.afterAction(); }
    const entry = { action: item.action, ok: !result?.isError, output: firstText(result) };
    results.push(entry);
    if (result?.isError) {
      await releaseHeld();
      let failed = {};
      try { failed = JSON.parse(entry.output); } catch {}
      return { kind: "action_error", executed: results.length - 1, failed: entry, remaining: step.actions.length - results.length,
        outcome: failed.outcome ?? "unsupported", reasonCode: failed.reasonCode ?? "internal" };
    }
  }
  return { kind: "ok", results };
}
/** Official ni(): the answer plus one fresh screenshot (only the answer when the capture fails). */
async function withScreenshot(body, ctx) {
  const shot = await displayScreenshotTool({}, ctx);
  if (shot?.isError) return json(body);
  return { content: [{ type: "text", text: json(body) }, ...(shot?.content ?? [])] };
}
/** A failed action, in the refusal shape: the official fields plus what to do next. */
function teachActionFailure(outcome, extra, where) {
  return { content: [{ type: "text", text: json({ ok: false, outcome: outcome.outcome, reasonCode: outcome.reasonCode,
    message: `${where} stopped at its action ${outcome.executed} (${outcome.failed.action}): ${outcome.executed} done, ${outcome.remaining} not run.`, ...extra,
    executed: outcome.executed, failed: outcome.failed, remaining: outcome.remaining,
    next_step: t("Read the failed action's output, take a fresh screenshot, then show the step again with what is left (or explain it in a tooltip without actions).") }) }], isError: true };
}
/** The checks before any step (official ta() + ri()): teach mode on, some app granted, nobody else holding the screen. */
function teachPrecheck(ctx) {
  const teach = teachOf(ctx);
  if (!teach || !teach.isActive()) return teachRefusal("teach_mode_not_active", "Teach mode is not active. Call request_teach_access first.");
  const pre = service(ctx).service.displayPrecheck(ctx.sessionId, { appLocksAllowed: true });
  return pre ? displayRefusal(pre) : null;
}
async function teachStepTool(args, ctx) {
  const refused = teachPrecheck(ctx);
  if (refused) return refused;
  const step = await teachStepOf(args, ctx, "teach_step");
  if (step instanceof Error) return teachRefusal("bad_args", step.message);
  const outcome = await runTeachStep(step, ctx);
  if (outcome.kind === "exit") return json({ exited: true });
  if (outcome.kind === "action_error") return teachActionFailure(outcome, {}, "The step");
  if (!step.actions.length) return json({ executed: 0, results: [] });
  return withScreenshot({ executed: outcome.results.length, results: outcome.results }, ctx);
}
async function teachBatchTool(args, ctx) {
  const refused = teachPrecheck(ctx);
  if (refused) return refused;
  if (!Array.isArray(args.steps) || !args.steps.length) return teachRefusal("bad_args", "\"steps\" must be a non-empty array.");
  // Official ii(): every step is checked first — a mistake in the fifth step shows no tooltip at all.
  const steps = [];
  for (const [index, item] of args.steps.entries()) {
    const step = await teachStepOf(item, ctx, `steps[${index}]`);
    if (step instanceof Error) return teachRefusal("bad_args", step.message);
    steps.push(step);
  }
  const results = [];
  for (const [index, step] of steps.entries()) {
    const outcome = await runTeachStep(step, ctx);
    if (outcome.kind === "exit") return json({ exited: true, stepsCompleted: index });
    if (outcome.kind === "action_error") return teachActionFailure(outcome, { stepsCompleted: index, stepFailed: index, results }, `steps[${index}]`);
    results.push(outcome.results);
  }
  const body = { stepsCompleted: steps.length, results };
  return steps.some((step) => step.actions.length > 0) ? withScreenshot(body, ctx) : json(body);
}

export const tools = [
  {
    name: "request_access",
    title: "Request computer access",
    description: "Ask the user to let this session see and operate the listed Mac apps. The user gets one card for the whole request and answers it all at once; nothing is granted until they allow it, and an app they allowed earlier in this session isn't asked about again. Apps can be named as the user would (\"Finder\", \"TextEdit\") or by bundle identifier. Each granted app gets a level by its kind: browsers can only be looked at, terminals and code editors can be looked at and clicked, other apps can be fully operated. Call this before any other computer-use tool, and again when you need another app.\n\nReturns granted (each with its bundleId, which the other tools take as `app`, and its level) and denied (each with why: the user declined, the app isn't installed, or it can't be granted). If the card can't be shown, returns an error saying so.",
    inputSchema: {
      type: "object",
      properties: {
        apps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: MAX_APPS, description: "The apps to ask for, by name or bundle identifier." },
        reason: { type: "string", description: "One sentence the user reads on the card: what you will do with these apps." },
        clipboardRead: { type: "boolean", description: "Also ask to read the clipboard (read_clipboard). It is a row on the same card." },
        clipboardWrite: { type: "boolean", description: "Also ask to write to the clipboard (write_clipboard). With it, type enters text that has a new line by pasting it — the clipboard's text is put back right after. It is a row on the same card." },
        systemKeyCombos: { type: "boolean", description: "Also ask to use system shortcuts such as ⌘Q or ⌘Tab." },
      },
      required: ["apps", "reason"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cu = service(ctx);
      // Official Hr(): in teach mode the main window is hidden, so the card would be too.
      if (cu.teach?.isActive?.()) {
        return teachRefusal("teach_mode_conflict", "Can't ask for more access during teach mode: the card would be hidden with this app's window. End the tour (or let the turn end), then call request_access, then start a new tour.");
      }
      const names = Array.isArray(args.apps) ? [...new Set(args.apps.filter((app) => typeof app === "string" && app.trim()).map((app) => app.trim()))] : [];
      if (!names.length) return failure("invalid_params", "apps must list at least one app name or bundle identifier.", "Call again with the apps you need, e.g. apps: [\"Finder\"].");
      if (names.length > MAX_APPS) return failure("invalid_params", `Ask for at most ${MAX_APPS} apps at a time.`, "Ask only for the apps this task needs.");
      const reason = typeof args.reason === "string" ? args.reason.trim() : "";
      if (!reason) return failure("invalid_params", "reason is required: the user reads it on the card.", "Call again with a one-sentence reason.");
      const flags = Object.fromEntries(FLAGS.map((key) => [key, args[key] === true]));
      const grants = cu.service.grantsFor(ctx.sessionId);
      const resolved = await cu.resolveApps(names);
      const apps = resolved.map((entry) => ({ ...entry, tier: entry.bundleId ? tierFor(entry.bundleId) : null,
        alreadyGranted: !!entry.bundleId && grants.has(entry.bundleId) }));
      const asking = apps.filter((entry) => entry.installed && !entry.alreadyGranted);
      const flagsHeld = grants.flags();
      const flagsAsking = FLAGS.filter((key) => flags[key] && !flagsHeld[key]);
      let answer = "accept";
      // Everything already granted (or nothing installed to ask about): no card.
      if (asking.length || flagsAsking.length) {
        // Only the flags not granted yet go on the card (official requestedFlags, L4076–4078).
        const asked = Object.fromEntries(FLAGS.map((key) => [key, flagsAsking.includes(key)]));
        answer = await cu.ask({ reason, flags: asked, apps: apps.map(({ requested, ...entry }) => entry), toolParams: args, ...(await hideFacts(cu, ctx, apps)),
          // Official: the card's Background line unless full-screen control is approved already.
          preferredModeDefault: cu.service.fullControl.isApproved(ctx.sessionId) ? undefined : cu.service.fullControl.preferredMode() });
        if (answer === "unavailable") {
          return failure("approval_unavailable", "The access card can't be shown in this session right now, so nothing was granted.",
            "Tell the user you need access to these apps and ask them to try again in the app's session window.");
        }
        if (answer === "accept") {
          grants.grant(asking.map((entry) => ({ bundleId: entry.bundleId, displayName: entry.displayName })), Object.fromEntries(flagsAsking.map((key) => [key, true])));
          // With full-screen approval, the screen-wide screenshot / scroll are this session's now (main.cjs).
          try { cu.toolsChanged?.(); } catch {}
        }
      }
      const granted = [], denied = [];
      for (const entry of apps) {
        const item = { app: entry.requested, ...(entry.bundleId ? { bundleId: entry.bundleId } : {}) };
        if (!entry.installed) denied.push({ ...item, reason: "not_installed" });
        else if (grants.has(entry.bundleId)) granted.push({ ...item, name: entry.displayName, tier: grants.tierOf(entry.bundleId) });
        else denied.push({ ...item, reason: answer === "accept" ? "not_grantable" : "user_denied" });
      }
      return json({
        granted, denied, flags: grants.flags(),
        // What a screenshot shows: only granted apps' windows are ever captured (service.cjs captureWindow / captureScreen).
        screenshotFiltering: "granted_apps_only",
        ...(answer !== "accept" ? { next_step: "The user declined. Don't ask again for the same apps unless they tell you to; continue without them or ask how they want to proceed." } : {}),
      });
    },
  },
  {
    name: "app_list_windows",
    title: "List app windows",
    description: "List the windows of one granted app: each window's window_id, title, frame on screen, and whether it is the main window, minimized, hidden, on another Space, or an auxiliary panel or dialog. Read-only; nothing in the app changes. Use it to pick a window_id for app_screenshot.\n\nNeeds the app granted with request_access. When it isn't, or the app isn't running, returns an error with what to do next.",
    inputSchema: { type: "object", properties: { app: APP }, required: ["app"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try { return json(await service(ctx).service.listWindows(ctx.sessionId, { bundleId: args.app })); }
      catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_screenshot",
    title: "Capture app window",
    description: "Take a picture of one window of a granted app, even when it is behind other windows, minimized or on another Space, and list its interactive elements, each as \"[N] role \"title\" (x, y, w×h)\" in the picture's pixels. That [N] is what element_index means in app_click and app_type, and the picture's pixels are what coordinate means. Read-only. Only the granted app's window is ever captured.\n\nNeeds the app granted with request_access. scale (0.1–1, default 1) shrinks only the returned picture; coordinates stay in full-size pixels. Returns the picture and the element list; if the window can't be captured, an error saying why (and without Accessibility permission the element list says it is missing).",
    inputSchema: {
      type: "object",
      properties: { app: APP, window_id: WINDOW_ID, scale: SCALE },
      required: ["app"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: (args = {}, ctx) => screenshot(args, ctx),
  },
  {
    name: "app_ax_find",
    title: "Find in app window",
    description: "Search the element list of your last app_screenshot of a window, by role (\"button\" or \"AXButton\") and/or by text in the title, and get the matching [N] indexes to use as element_index. Read-only: it searches what that screenshot saw and doesn't look at the app again, so take a fresh app_screenshot after the window changes.\n\nNeeds the app granted with request_access and an app_screenshot of the window. Returns the matches (possibly none); without a screenshot, an error saying to take one.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID,
        role: { type: "string", description: "The role to match, with or without the AX prefix, any case: \"button\", \"AXTextField\"." },
        title_contains: { type: "string", description: "Text the element's title contains (any case)." },
      },
      required: ["app"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        const found = service(ctx).service.axFind(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), role: args.role, titleContains: args.title_contains });
        const head = `${found.matches.length} of ${found.total} elements in window ${found.windowId} match.`;
        return [head, ...found.lines].join("\n");
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_click",
    title: "Click in app window",
    description: "Press a control in a granted app's window without bringing the app forward, through macOS Accessibility (the control's own press action). Give exactly one of element_index (an [N] from app_screenshot, the most reliable), coordinate (pixels of that screenshot) or target \"focused\"; a call without one is an error, never a repeat of the last click. button \"right\" opens the element's context menu through the Accessibility action AXShowMenu (on the element or one of its two parents) and lists the menu's items as menuItems; an element without one comes back with reasonCode no_menu_action, and the open menu is closed with app_menu close. count 2 is a double click: on text (static text, a text field or text area) it selects the word at the point through the Accessibility attribute AXSelectedTextRange, on a control it is two press actions 80 ms apart. count 3 is a triple click: on text it selects the line at the point the same way. A list or table row (a Finder list row, its name or another of its cells) is selected through the Accessibility attribute AXSelected and read back; a double click opens it through the action AXOpen when the row offers one, and otherwise only selects it (openUnavailable: true — open it with app_menu, e.g. File ▸ Open). An element with nothing to press but a selectable container (an icon-view item) selects that container the same way. A Dock item (app com.apple.dock, its window from app_list_windows) is pressed like a button, which opens or switches to that app. Something Accessibility can't press or select is refused with a reason (canvas, select_refused, popup_menu, …), not clicked blindly.\n\nNeeds the app granted with request_access (and allowed to click: browsers are view only), and an app_screenshot of the window for element_index or coordinate. Returns ok with how it was done; otherwise ok: false with a reasonCode (for example the point has no pressable control, the screen is locked, or secure input is on) and what to try next.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID, coordinate: COORDINATE, element_index: ELEMENT_INDEX, target: TARGET,
        button: { type: "string", enum: ["left", "right"], description: "\"left\" (default): the control's press action. \"right\": its context menu (Accessibility AXShowMenu); no_menu_action when it has none." },
        count: { type: "integer", enum: [1, 2, 3], description: "1 (default). 2: double click — opens a row (AXOpen), selects the word on text (AXSelectedTextRange), presses twice on a control. 3: triple click — selects the line on text (AXSelectedTextRange)." },
        action_summary: ACTION_SUMMARY,
      },
      required: ["app"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app) ?? checkAddressing(args, { required: true });
      if (refused) return refused;
      try {
        const result = await service(ctx).service.appClick(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), coordinate: args.coordinate,
          element_index: args.element_index, target: args.target, ...(args.button !== undefined ? { button: args.button } : {}), ...(args.count !== undefined ? { count: args.count } : {}), axOnly: true });
        const answer = outcomeResult(result, "Take a fresh app_screenshot and try an element_index for the control (or target \"focused\"); if Accessibility can't press it, tell the user this control can't be clicked yet.");
        // A double click that could only select (official: no AXOpen on the row): say how to open it.
        if (result?.outcome === "ok" && result.openUnavailable === true) {
          const body = JSON.parse(answer.content[0].text);
          answer.content[0].text = json({ ...body, note: t("The row has no Accessibility open action, so it was only selected. To open it, use app_menu (for example File ▸ Open).") });
        }
        return answer;
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_type",
    title: "Type in app window",
    description: "Enter text into a text field of a granted app's window without bringing the app forward. It writes the field's value through macOS Accessibility and reads it back; when a field doesn't take that, it may fall back to typing the text as key events, and checks the result again. Address the field one way only: element_index or coordinate (from app_screenshot), or target \"focused\" (the default when none is given). mode \"insert\" (default) puts the text at the cursor, replacing any selection; \"replace\" selects the field's whole content first and replaces it.\n\nNeeds the app granted with full access via request_access (browsers, terminals and code editors can't be typed into), and an app_screenshot for element_index or coordinate. Returns ok with how it was done; otherwise ok: false with a reasonCode (for example no_text_target for something that isn't a text field — a password field counts as one and is never typed into or selected —, secure input on, the user is typing) and, if only part got in, how much (deliveredPrefixChars).",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID,
        text: { type: "string", minLength: 1, description: "The text to enter." },
        mode: { type: "string", enum: ["insert", "replace"], description: "\"insert\" (default) at the cursor / over the selection; \"replace\" the field's whole content." },
        coordinate: COORDINATE, element_index: ELEMENT_INDEX, target: TARGET, action_summary: ACTION_SUMMARY,
      },
      required: ["app", "text"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app) ?? checkAddressing(args);
      if (refused) return refused;
      try {
        const result = await service(ctx).service.appType(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), text: args.text,
          ...(args.mode !== undefined ? { mode: args.mode } : {}), coordinate: args.coordinate, element_index: args.element_index, target: args.target });
        return outcomeResult(result, result?.secureTextField
          ? "That is a password field: passwords are never typed. Ask the user to enter it themselves."
          : "Take a fresh app_screenshot, check the field, and address it with element_index; for a partial delivery, type only the rest.");
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_release",
    title: "Release app",
    description: "Say you are done with an app's window: this session forgets its last screenshot and click point there, and the live preview stops following it. Give app (and optionally window_id) for one app or window, or nothing for every app. The apps stay granted for this session, so you can come back with a new app_screenshot without asking again.\n\nNeeds no grant. Returns which windows were released (an empty list when there was nothing to release); window_id without app is an error.",
    inputSchema: {
      type: "object",
      properties: { app: { type: "string", description: "The app's bundle identifier. Leave it out to release every app." }, window_id: WINDOW_ID },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      try { return json(service(ctx).service.release(ctx.sessionId, { bundleId: args.app, windowId: windowId(args) })); }
      catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_focus",
    title: "Focus app window",
    description: "Give keyboard focus to one window of a granted app without raising it or bringing the app forward: the window becomes the app's main and focused window through macOS Accessibility, so that target \"focused\" in app_type and app_click means the element that window's focus is on. No click is sent. It is refused while the app is the frontmost app (the user is working in it) and for a minimized window. The window becomes this app's default window for later calls, as after an app_screenshot.\n\nNeeds the app granted with request_access (view-only apps such as browsers can't be focused). Returns outcome \"ok\" with focused (whether the app now reports this window as its focused window), main and window_id; otherwise ok: false with a reasonCode and what to do instead.",
    inputSchema: { type: "object", properties: { app: APP, window_id: WINDOW_ID }, required: ["app"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        const result = await service(ctx).service.appFocus(ctx.sessionId, { bundleId: args.app, windowId: windowId(args) });
        return outcomeResult(result, "Take an app_screenshot to see the window's state, then try again or address elements with element_index.");
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_menu",
    title: "Use app menu",
    description: "Use a granted app's menu bar through macOS Accessibility: no mouse event is sent and the app stays where it is, so prefer this over clicking for anything the menus offer — in Finder and similar apps it is the reliable way to run a command. Give exactly one of: path, the titles from the menu bar down to an item, e.g. [\"File\", \"New Folder\"] (any case; a trailing \"…\" can be left out) — a command item runs, a menu title opens that menu and returns its items; list, to read items without pressing anything (true for the menu bar's titles, or a title / path for the items under it); or close: true, to close a menu of this app that is open (as Escape would).\n\nNeeds the app granted with request_access; running a command needs full access, listing works at any level. Returns the resolved path and, for an opened menu or a list, the items (title, enabled, submenu, shortcut, checked). A title that doesn't match returns menu_item_not_found with closestMatch and the titles that are there; a disabled item returns menu_item_disabled; an item the app won't let Accessibility press returns menu_press_failed.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP,
        path: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 8, description: "Menu titles from the menu bar down: [\"File\", \"New Folder\"]. Presses the last one." },
        list: { anyOf: [{ type: "boolean" }, { type: "string" }, { type: "array", items: { type: "string" }, maxItems: 8 }, { type: "null" }],
          description: "Read-only: true (or null) for the menu bar's titles; a title or a path of titles for the items under it." },
        close: { type: "boolean", const: true, description: "true: close the app's open menu (Escape)." },
        action_summary: ACTION_SUMMARY,
      },
      required: ["app"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      const given = ["path", "list", "close"].filter((key) => Object.hasOwn(args, key) && (key !== "close" || args.close !== undefined));
      if (given.length !== 1) {
        return failure("invalid_params", `Give exactly one of path, list and close${given.length ? ` (got ${given.join(" and ")})` : ""}.`,
          "Use list: true to see the menu bar, then path with the titles down to the item.");
      }
      try {
        const result = await service(ctx).service.appMenu(ctx.sessionId, { bundleId: args.app, path: args.path, list: args.list, close: args.close });
        if (given[0] === "list") return json({ ok: true, ...result });
        return outcomeResult(result, "Call app_menu with list to check the titles and whether the item is enabled.");
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_zoom",
    title: "Zoom into app window",
    description: "Enlarge part of your last app_screenshot of a window to read small text or icons. region is [x0, y0, x1, y1] in that screenshot's pixels (the same pixels coordinate uses). The picture is cut from that screenshot, not captured again, so it can't show more detail than the screenshot held and doesn't show changes since; take a new app_screenshot first if the window may have changed. Read-only, no element list; coordinates in other tools keep referring to the screenshot, not to the zoomed picture.\n\nNeeds the app granted with request_access and an app_screenshot of the window; without one it returns an error saying to take one. scale (0.1–1, default 1) shrinks the returned picture.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID,
        region: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4, description: "[x0, y0, x1, y1] in the last app_screenshot's pixels, x0 < x1 and y0 < y1." },
        scale: SCALE,
      },
      required: ["app", "region"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        const zoom = await service(ctx).service.appZoom(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), region: args.region, scale: args.scale });
        const caption = `Zoom of window ${zoom.windowId} of ${zoom.bundleId}, region [${zoom.region.join(", ")}] of the last app_screenshot → ${zoom.width}×${zoom.height} (from ${zoom.sourcePixels.width}×${zoom.sourcePixels.height} screenshot pixels). Coordinates still refer to the app_screenshot.`;
        return imageResult(caption, zoom.dataUrl) ?? failure("zoom_failed", "The zoom came back without a picture.", "Use app_screenshot instead.");
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "list_apps",
    title: "List apps",
    description: "List the Mac's apps: the ones running (first by default, each with its pid) and the ones installed in the usual application folders, each with its name and bundle identifier, and whether this session has it granted. Use it to find the exact name or bundle identifier to pass to request_access. query narrows the list by name or bundle identifier (any case); a query that matches nothing listed is also looked up with Spotlight. Read-only and needs no grant.\n\nReturns apps, total and, when there are more, nextCursor to pass as cursor for the next page (limit 1–200, default 25).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part of the app's name or bundle identifier, any case." },
        running_first: { type: "boolean", default: true, description: "Running apps first (default true); false sorts all by name." },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 25, description: "How many per page (default 25)." },
        cursor: { type: "string", description: "nextCursor from the previous page." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cu = service(ctx);
      if (typeof cu.listApps !== "function") return failure("helper_unavailable", "Listing apps isn't available here.", NEXT_STEPS.helper_unavailable);
      try {
        const page = await cu.listApps({ query: args.query, runningFirst: args.running_first !== false, limit: args.limit ?? 25, cursor: args.cursor });
        const grants = cu.service.grantsFor(ctx.sessionId);
        return json({ ...page, apps: page.apps.map((app) => ({ ...app, granted: grants.has(app.bundleId), ...(grants.has(app.bundleId) ? { tier: grants.tierOf(app.bundleId) } : {}) })) });
      } catch (error) { return serviceFailure(error); }
    },
  },
  {
    name: "app_batch",
    title: "Run app actions",
    description: t("Run several actions on one granted app's window in order, in one call: click, type, drag, screenshot and zoom work as app_click, app_type, app_drag, app_screenshot and app_zoom do (same fields, without app and window_id, which the batch gives); key and scroll work as app_key and app_scroll do (a key or scroll without coordinate, element_index or target uses the point of the action before it). It stops at the first action that fails or doesn't take effect, except a scroll that couldn't move (already at the end), which is reported and the batch goes on; the actions after a stop don't run. Coordinates and element_index in every action refer to the app_screenshot taken before this call — a screenshot inside the batch is only a picture for you to check progress and doesn't change that.\n\nNeeds the app granted with request_access and, for coordinates or element_index, an app_screenshot before the call. Returns each action's result in order, how many completed, and where it stopped if it did; pictures from screenshot and zoom actions follow."),
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID,
        actions: {
          type: "array", minItems: 1, maxItems: MAX_BATCH,
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["click", "type", "key", "scroll", "screenshot", "zoom", "drag"] },
              coordinate: COORDINATE, element_index: ELEMENT_INDEX, target: TARGET,
              button: { type: "string", enum: ["left", "right"] }, count: { type: "integer", enum: [1, 2, 3] },
              text: { type: "string" }, mode: { type: "string", enum: ["insert", "replace"] },
              combo: { type: "string" }, dy: { type: "number" },
              path: { type: "array", items: { type: "array", items: { type: "number" } } }, to_coordinate: { type: "array", items: { type: "number" } },
              region: { type: "array", items: { type: "number" } }, scale: SCALE, action_summary: ACTION_SUMMARY,
            },
            required: ["action"],
            additionalProperties: false,
          },
          description: "The actions, in order: {action: \"click\", element_index: 3}, {action: \"type\", text: \"…\", target: \"focused\"}, {action: \"screenshot\"}, …",
        },
      },
      required: ["app", "actions"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: (args = {}, ctx) => batch(args, ctx),
  },
  {
    name: "list_granted_applications",
    title: "List granted apps",
    description: "Show what this session may use right now: the apps granted with request_access (each with its bundle identifier and level — view only, click, or full), the extra permissions granted (clipboard read and write, system shortcuts), and how coordinates work in this build (pixels of an app window's last app_screenshot; there is no full-screen coordinate mode). Read-only; nothing is asked of the user.\n\nNeeds no grant. Returns apps (possibly empty), flags and coordinateMode.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cu = service(ctx).service;
      const grants = cu.grantsFor(ctx.sessionId);
      const fullControl = cu.fullControl.isApproved(ctx.sessionId);
      return json({ apps: grants.list().map((app) => ({ bundleId: app.bundleId, ...(app.displayName ? { name: app.displayName } : {}), tier: app.tier })),
        flags: grants.flags(), preferredMode: cu.fullControl.preferredMode(), fullControlApproved: fullControl,
        coordinateMode: fullControl ? "display" : "app_window" });
    },
  },
  // ── Registered with a reason code until the capability exists (docs/computer-use-handoff-20261020.md, M4 list). Seeing
  // the tool and its reason, the agent turns to the Accessibility tools or tells the user, instead of inventing a way.
  {
    name: "app_key",
    title: "Press key in app window",
    description: "Press one key, with or without modifiers, in a window of a granted app while the app stays in the background. For return, escape, backspace (also spelled delete or del) and cmd+a the element at the point is acted on through macOS Accessibility when it can be: return confirms a field or starts a new line in a multi-line text, escape cancels, backspace removes the character before the caret, cmd+a selects all of a text; these are read back where they can be. Every other key — tab and shift+tab, up / down / left / right (alone or with shift, option or cmd), home, end, pageup, pagedown, space, forward_delete — and any of the four where Accessibility can't do it, is sent as a keystroke to whatever holds the keyboard focus in that window. That keystroke can't be checked, so give the field or list focus first (app_click it) and look at an app_screenshot afterwards. Letters and other shortcuts aren't sent: type text with app_type and run ⌘ commands with app_menu. cmd+a is not sent to a background app whose Select All is disabled, since it would be ignored. Press escape once; a second one with nothing to cancel only makes the alert sound.\n\nThe point is coordinate (pixels of the last app_screenshot of the window); without it, the point of your last action in this window. Needs full access via request_access; system shortcuts (⌘Q, ⌘Tab …) also need systemKeyCombos, and shortcuts that use the clipboard (⌘C, ⌘V, ⌘X) are refused. Returns ok with what was done (an Accessibility action, or an unverified keystroke); otherwise ok: false with a reasonCode — key_not_mapped, would_replace_content (text is selected), focus_in_sibling_window, menu_command_disabled, window_minimized, app_hidden, window_off_space, secure_input_active, user_actively_typing … — and what to do next.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID, coordinate: COORDINATE,
        combo: { type: "string", minLength: 1, description: "One key and its modifiers, joined with +: \"return\", \"escape\", \"backspace\", \"cmd+a\", \"tab\", \"shift+tab\", \"down\", \"shift+right\", \"pagedown\". \"delete\" / \"del\" remove the character before the caret, \"forward_delete\" the one after it." },
        action_summary: ACTION_SUMMARY,
      },
      required: ["app", "combo"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        const cu = service(ctx).service;
        const result = await cu.appKey(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), combo: args.combo,
          coordinate: args.coordinate, element_index: args.element_index, target: args.target });
        return keyResult(result, appName(cu.grantsFor(ctx.sessionId), args.app));
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_scroll",
    title: "Scroll app window",
    description: "Move the content of a list, text or page in one window of a granted app up or down while the app stays in the background. It works through macOS Accessibility: the vertical scroll bar of the scroll area at the point (or around the element there) is set, so nothing is clicked and no key or wheel event is sent. dy is in steps of about 5% of the whole scrollable length (not pixels or lines): positive moves toward the bottom, negative toward the top, and it stops at either end. Small steps (2 to 5) followed by a fresh app_screenshot work best. Only vertical scrolling is possible here; a dx other than 0 is refused.\n\nThe point is coordinate (pixels of the last app_screenshot of the window); without it, the point of your last action in this window. Needs click access or more via request_access. Returns ok with the scroll bar's value before and after; ineffective when the value didn't change (atLimit says when it was already at the top or bottom); otherwise ok: false with a reasonCode — canvas (no vertical scroll bar there), window_minimized, app_hidden, window_off_space, screen_locked … — and what to do next.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID, coordinate: COORDINATE,
        dy: { type: "number", description: "How far, in steps of about 5% of the scrollable length: positive toward the bottom, negative toward the top. Stops at either end; 2 to 5 is a good step, then look again." },
        action_summary: ACTION_SUMMARY,
      },
      required: ["app", "dy"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        const cu = service(ctx).service;
        const result = await cu.appScroll(ctx.sessionId, { bundleId: args.app, windowId: windowId(args), dy: args.dy, dx: args.dx,
          coordinate: args.coordinate, element_index: args.element_index, target: args.target });
        return scrollResult(result, appName(cu.grantsFor(ctx.sessionId), args.app));
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_drag",
    title: t("Drag in app window"),
    description: t("Drag inside one granted app window from coordinate to to_coordinate, optionally through 2–20 path waypoints. Requires full access via request_access and a prior app_screenshot; all points use that screenshot's full-resolution pixels. button defaults to left. Uses targeted mouse events with continuous safety checks and a 3000 ms limit. Returns before/after readback when available; verified:false means delivery could not be checked. Failures include drag_ineffective (the same for every app, Finder and the Dock included: look at a fresh app_screenshot, then try app_menu or another Accessibility action), drag_timeout, screen_locked, secure_input_active and user_actively_typing."),
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID, coordinate: COORDINATE,
        to_coordinate: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2, description: t("Drag endpoint in full-resolution screenshot pixels.") },
        path: { type: "array", items: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, minItems: 2, maxItems: 20, description: t("Optional 2–20 waypoints between coordinate and to_coordinate.") },
        button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
        action_summary: ACTION_SUMMARY,
      },
      required: ["app", "coordinate", "to_coordinate"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      try {
        const denied = checkGrant(ctx, args.app);
        if (denied) return denied;
        return outcomeResult(await service(ctx).service.appDrag(ctx.sessionId, {
          bundleId: args.app, windowId: windowId(args), coordinate: args.coordinate,
          to_coordinate: args.to_coordinate, path: args.path, button: args.button,
        }), t("Take a fresh app_screenshot to inspect the result before retrying, or use app_menu for an equivalent command."));
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "app_bring_to_current_space",
    title: "Bring window to this Space",
    description: "Make one window of a granted app reachable for the app_* tools again: a window on another desktop Space is moved onto the Space the user is on, a minimized window comes back out of the Dock, and a hidden app is shown again (then all its windows come back). The app is never brought to the front: a minimized or hidden window reappears behind the window the user is working in, and that window is kept on top. Call it when another app_* call said the window is minimized, hidden or on another Space; a window already on this Space is left as it is. The user can see the window once it is here, so tell them first if they are at the computer: they may have put it away on purpose. Take a fresh app_screenshot afterwards.\n\nNeeds the app granted with request_access (any access level) and a window_id from app_list_windows. Returns ok with how the window got here (how: moved, already_here or the shown_* code; tellUser: true when the user's window ended up behind it or the app came to the front). Otherwise ok: false with a reasonCode — screen_locked, window_not_in_app, still_parked, user_is_in_the_app (the user is in that app), front_window_cannot_be_raised, fullscreen_space (the user is on a full-screen app's Space), space_unclassifiable, op_unavailable (this Mac doesn't let the window be moved), move_not_confirmed … — and what to do next.",
    inputSchema: {
      type: "object",
      properties: { app: APP, window_id: { type: "integer", minimum: 1, description: "The window to bring here: a window_id from app_list_windows." } },
      required: ["app", "window_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const refused = checkGrant(ctx, args.app);
      if (refused) return refused;
      try {
        return bringResult(await service(ctx).service.appBringToCurrentSpace(ctx.sessionId, { bundleId: args.app, windowId: args.window_id }));
      } catch (error) { return serviceFailure(error, args.app); }
    },
  },
  {
    name: "request_full_control",
    title: "Request full control",
    description: "Ask the user to let you control the whole screen — their mouse and keyboard, across every app — for the rest of this session, instead of working app by app in the background. If the user's preferred mode is already Full control, this is granted without a card; otherwise they get a \"Take over the screen?\" card and can deny it. It only records the approval: the screen itself is taken by your next screen-wide action, and a turn ending hands it back while the approval stays until the session ends. Use it when background app_* work can't do the task — a drag across apps, a hover menu, a canvas. Returns ok when approved (or already approved), or a reason code when not.\n\nOnce this session has granted apps, its tool list carries the screen-wide tools, which work on the real cursor: screenshot (the whole screen), zoom, cursor_position, mouse_move, left_click / double_click / triple_click / right_click / middle_click, left_mouse_down / left_mouse_up, left_click_drag, scroll, type, key and hold_key. The first of them you use asks for this same approval when it isn't given yet. A screenshot, scroll or type whose arguments are the preview's (quality; direction and amount; ref or selector) is the preview pane's tool, not the screen's: if those are the ones in your tool list, the screen-wide versions aren't available to you in this session.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cu = service(ctx);
      const fc = cu.service.fullControl;
      // Another session holds the display lock: every tool refuses with cu_lock_held (official §1.4.2 step 5), before any card.
      const lockedOut = () => {
        const locked = cu.service.displayLockedByOther?.(ctx.sessionId);
        return locked ? notYet("cu_lock_held", CU_LOCK_HELD_MESSAGE, CU_LOCK_HELD_STEP) : null;
      };
      const early = lockedOut();
      if (early) return early;
      // Approved: only the approval is recorded (official Ln() → approveTakeover). The display lock — the glow, the strip,
      // the notification and the global Esc — is taken by the next screen-wide action (displayTakeover → the service's
      // acquireDisplayLock), not here.
      const granted = (base, message) => {
        const held = cu.service.appLockBundles?.(ctx.sessionId) ?? [];
        const next = !cu.service.hasGrants?.(ctx.sessionId)
          ? " No app is granted yet: call request_access for the apps you need; after that the screen-wide tools (screenshot, left_click, type, …) go ahead without asking for full-screen control again."
          : held.length ? ` You are still working in ${held.join(", ")} in the background: call app_release first, then the screen-wide tools (screenshot, left_click, type, …) go ahead.`
            : " The screen-wide tools (screenshot, left_click, type, …) now go ahead.";
        return { content: [{ type: "text", text: json({ ok: true, ...base, ...(held.length ? { appLockHeld: held } : {}), message: `${message}${next}` }) }] };
      };
      if (fc.isApproved(ctx.sessionId)) {
        return granted({ outcome: "ok", mode: fc.preferredMode(), alreadyApproved: true }, "Full-screen control is already approved for this session; it doesn't need approving again.");
      }
      if (fc.preferredMode() === "full_control") {
        const result = cu.service.requestFullControl(ctx.sessionId, { approved: true });
        return granted(result, "Full-screen control approved (your preferred mode is Full control). This lasts until the session ends.");
      }
      // Background mode: ask with the takeover card. askTakeover returns "accept" | "decline" | "unavailable".
      let answer = "decline";
      try { answer = await cu.askTakeover({ becausePreferredBackground: true }); } catch { answer = "unavailable"; }
      if (answer === "unavailable") {
        return displayRefusal({ reasonCode: "takeover_unavailable", errorKind: "takeover_unavailable",
          message: "The \"Take over the screen?\" card can't be shown in this session right now, so full-screen control wasn't granted.",
          next_step: "Keep working with the app_* tools; ask the user to switch Settings › Computer use to Full control if they want you to take over by default." });
      }
      if (answer !== "accept") {
        return notYet("takeover_declined", "The user kept you in the background, so full-screen control wasn't granted. This is separate from app access (request_access can't grant it).",
          "Keep working app by app with the app_* tools, or ask the user how they want to proceed.");
      }
      // Another session may have taken the screen while the card was up: refuse without recording the approval.
      const late = lockedOut();
      if (late) return late;
      const result = cu.service.requestFullControl(ctx.sessionId, { approved: true });
      return granted({ ...result, approved: true }, "Full-screen control approved for this session. The approval lasts until the session ends.");
    },
  },
  {
    name: "release_full_control",
    title: "Release full control",
    description: "Hand the whole screen back and drop the full-screen approval: the control overlay and the \"Claude is using your computer\" strip go away, and the next time you need the screen you'll ask again. Call it as soon as you no longer need full-screen control. To be done with one app's window instead, use app_release.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const result = service(ctx).service.releaseFullControl(ctx.sessionId);
      return { content: [{ type: "text", text: json({ ok: true, ...result,
        message: result.wasHolding ? "Released full-screen control. The overlay is off." : "Full-screen control was not held; nothing to release." }) }] };
    },
  },
  // ── Screen-wide (display-scope) tools, official §1.1: the real cursor on the global HID stream ────────────────────
  {
    name: "screenshot",
    title: "Screenshot",
    // preview.mjs serves a screenshot too: a session is listed this one once it has granted apps (agent-tools-host.cjs
    // sharesName / calledEntry, main.cjs computerUseServesDisplayTools).
    sharesName: true,
    description: `Take a picture of the whole screen (the selected display) for full-screen control. Only the apps granted to this session and the desktop show in it; every other app is left out. The picture is the reference for every screen-wide pointer tool that follows: their coordinates are pixels of this picture as returned at scale 1 — top-left is 0,0 — even when you ask for a smaller one. Taking it takes full-screen control: the first time in a session the user approves that on a "Take over the screen?" card, unless their preferred mode is Full control. To work inside one app without taking the screen, use app_screenshot and the other app_* tools instead; they act in the background but can't reach hover states or right-click menus.`,
    inputSchema: { type: "object", properties: { scale: DISPLAY_SCALE }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => displayScreenshotTool(args, ctx),
  },
  {
    name: "zoom",
    title: "Zoom",
    description: "Look closer at part of the last full-screen screenshot: region [x0, y0, x1, y1] in that screenshot's pixels comes back as a sharper picture. It only reads the screen; the pointer tools keep using the full screenshot's coordinates afterwards, never the zoomed picture's. Needs a screenshot first.",
    inputSchema: { type: "object", properties: {
      region: { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4, description: "[x0, y0, x1, y1]: the top-left and bottom-right corners in the last screenshot's pixels." },
      scale: DISPLAY_SCALE,
    }, required: ["region"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => displayZoomTool(args, ctx),
  },
  ...[["left_click", "Left click", "Click the left mouse button at a point on the screen."],
    ["double_click", "Double click", "Double-click the left mouse button at a point on the screen."],
    ["triple_click", "Triple click", "Triple-click the left mouse button at a point on the screen (selects a line or paragraph of text)."],
    ["right_click", "Right click", "Click the right mouse button at a point on the screen, usually to open a context menu."],
    ["middle_click", "Middle click", "Click the middle mouse button at a point on the screen."]].map(([name, title, lead]) => ({
    name, title,
    description: `${lead} The real cursor moves there first, so the click lands as a person's would. ${DISPLAY_GATE} ${name === "left_click" ? "A plain left click is allowed in apps granted at the click level (terminals and code editors); with modifier keys it needs the full level." : "It needs the app at that point granted at the full level."} If a button is still held from left_mouse_down it is let go first.`,
    inputSchema: { type: "object", properties: { coordinate: DISPLAY_COORDINATE, text: MODIFIERS }, required: ["coordinate"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool(name, args, ctx),
  })),
  {
    name: "scroll",
    title: "Scroll",
    sharesName: true,
    description: `Scroll with the mouse wheel at a point on the screen: the real cursor moves there and the wheel turns scroll_amount notches in scroll_direction, so whatever is under the point scrolls. ${DISPLAY_GATE}`,
    inputSchema: { type: "object", properties: {
      coordinate: DISPLAY_COORDINATE,
      scroll_direction: { type: "string", enum: ["up", "down", "left", "right"], description: "Which way the content moves into view." },
      scroll_amount: { type: "integer", minimum: 0, maximum: 100, description: "How many wheel notches to turn." },
    }, required: ["coordinate", "scroll_direction", "scroll_amount"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool("scroll", args, ctx),
  },
  {
    name: "left_click_drag",
    title: "Drag",
    description: `Press the left button at start_coordinate (or where the cursor is now), move to coordinate with the button held, and let go — dragging a file, a slider, a selection or a shape on a canvas. ${DISPLAY_GATE} Where it is dropped must be in an app granted at the full level.`,
    inputSchema: { type: "object", properties: {
      coordinate: { ...DISPLAY_COORDINATE, description: "Where to let go: [x, y] in pixels of the last screenshot." },
      start_coordinate: { ...DISPLAY_COORDINATE, description: "Where to press: [x, y] in pixels of the last screenshot. Leave it out to start from the cursor's current position." },
    }, required: ["coordinate"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool("left_click_drag", args, ctx),
  },
  {
    name: "mouse_move",
    title: "Move mouse",
    description: "Move the real cursor to a point on the screen without clicking — to show a tooltip, open a hover menu, or reveal controls that appear under the pointer. While a button is held from left_mouse_down the move drags, and is then checked like the end of a drag. Take a screenshot afterwards to see what appeared.",
    inputSchema: { type: "object", properties: { coordinate: DISPLAY_COORDINATE }, required: ["coordinate"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool("mouse_move", args, ctx),
  },
  {
    name: "cursor_position",
    title: "Cursor position",
    description: "Where the cursor is. After a full-screen screenshot it answers in that screenshot's pixels (coordinateSpace image_pixels); with no screenshot, or with the cursor on another display, in screen points (logical_points). While this session is working in an app window in the background it answers with the point of your last app_* action there (app_screenshot_pixels), since background work moves no cursor.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => displayCursorTool(ctx),
  },
  {
    name: "left_mouse_down",
    title: "Mouse down",
    description: `Press the left button where the cursor is and keep it held, for a drag you build step by step with mouse_move. Call left_mouse_up to let go. ${DISPLAY_GATE} Refused while the button is already held.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool("left_mouse_down", args, ctx),
  },
  {
    name: "left_mouse_up",
    title: "Mouse up",
    description: "Let go of the left button where the cursor is, ending a drag built with left_mouse_down and mouse_move. After a move with the button held it is checked like the end of a drag (the app there needs the full level), otherwise like a click. Safe to call when nothing is held.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayPointerTool("left_mouse_up", args, ctx),
  },
  {
    name: "type",
    title: "Type",
    // preview.mjs serves a type too: the same per-session choice as screenshot / scroll.
    sharesName: true,
    description: `Type text where the keyboard focus is — the app in front — one character at a time, as a person types; a new line presses return and a tab presses tab. When the session holds the clipboardWrite permission (request_access) and the text has a new line, it is pasted instead — put on the clipboard, ⌘V, and the clipboard's previous text put back — and the result says "Typed (via clipboard)."; never while a password field has the keyboard. For shortcuts and single keys use key. ${KEYBOARD_GATE}`,
    inputSchema: { type: "object", properties: { text: { type: "string", description: "The text to type." } }, required: ["text"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayKeyboardTool("type", args, ctx),
  },
  {
    name: "key",
    title: "Key",
    description: `Press a key or a shortcut where the keyboard focus is (the app in front), and let go — optionally several times in a row. ${KEY_SYNTAX} One key besides the modifiers per call (several arrow-type keys under shift alone are fine). System-wide shortcuts such as cmd+q, cmd+tab or cmd+space need the systemKeyCombos permission from request_access. ${KEYBOARD_GATE}`,
    inputSchema: { type: "object", properties: {
      text: { type: "string", description: "The key or shortcut, e.g. \"return\", \"cmd+s\", \"shift+cmd+down\"." },
      repeat: { type: "integer", minimum: 1, maximum: 100, description: "How many times to press it (default 1), 8 ms apart." },
    }, required: ["text"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayKeyboardTool("key", args, ctx),
  },
  {
    name: "hold_key",
    title: "Hold key",
    description: `Hold a key or a shortcut down for a number of seconds, then let go — for apps that react to a held key. The keys are always released at the end, also when the call is stopped. Same key names as key; one key besides the modifiers. ${KEYBOARD_GATE}`,
    inputSchema: { type: "object", properties: {
      text: { type: "string", description: "The key or shortcut to hold, e.g. \"shift\" or \"right\"." },
      duration: { type: "number", minimum: 0, maximum: 100, description: "How long to hold it, in seconds (0–100)." },
    }, required: ["text", "duration"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => displayKeyboardTool("hold_key", args, ctx),
  },
  {
    name: "open_application",
    title: "Open application",
    description: "Open a granted app, or make sure it is running. The app must be granted to this session (request_access); any level will do. While you work in the background (the preferred mode is Background and nobody holds the screen) it doesn't take the screen: it tells you whether the app has a window the app_* tools can reach, or launches it in the background and gives its window_id. While this session holds app windows it opens in the background too. Otherwise it takes full-screen control and brings the app to the front; take a screenshot afterwards.",
    inputSchema: { type: "object", properties: { app: { type: "string", description: "The app's name as granted (\"TextEdit\") or its bundle identifier." } }, required: ["app"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => openApplicationTool(args, ctx),
  },
  {
    name: "switch_display",
    title: "Switch display",
    description: "Choose which monitor the screen-wide tools capture and aim at, by the name a screenshot note gives (\"display <id>\" for one without a name), or \"auto\" to let it follow the granted apps again. Take a new screenshot afterwards: coordinates refer to it. With one monitor there is nothing to switch to.",
    inputSchema: { type: "object", properties: { display: { type: "string", description: "A monitor name from a screenshot note, or \"auto\"." } }, required: ["display"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => switchDisplayTool(args, ctx),
  },
  {
    name: "wait",
    title: "Wait",
    description: "Wait a number of seconds (0–100) without doing anything — for an app to finish loading or an animation to end — then take a screenshot to see the result. It doesn't take the screen, but needs at least one app granted to this session. Returns \"Waited Ns.\"; if the call is stopped meanwhile it ends early with reasonCode aborted.",
    inputSchema: { type: "object", properties: { duration: { type: "number", minimum: 0, maximum: 100, description: "Seconds to wait." } }, required: ["duration"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => waitTool(args, ctx),
  },
  {
    name: "computer_batch",
    title: "Computer batch",
    description: `Run several screen-wide actions in one call, in order, with a short pause between them. Each action does what the tool of the same name does and is checked the same way right before it runs; the first one that fails stops the batch (a held mouse button is let go) and the result says which one and how many ran. Coordinates and zoom regions refer to the last screenshot taken before the batch; the last screenshot inside the batch becomes the reference for the next call. Results come back one line per action ("[i/N] action: …"), with pictures in between. ${DISPLAY_GATE}`,
    inputSchema: { type: "object", properties: {
      actions: { type: "array", minItems: 1, description: "The actions, in order.", items: { type: "object", properties: {
        action: { type: "string", enum: BATCH_ACTIONS },
        coordinate: DISPLAY_COORDINATE,
        start_coordinate: { ...DISPLAY_COORDINATE, description: "left_click_drag: where to press (default: the cursor)." },
        region: { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4, description: "zoom: [x0, y0, x1, y1] in the last screenshot before this batch." },
        scale: DISPLAY_SCALE,
        text: { type: "string", description: "type: the text; key / hold_key: the key or shortcut; clicks: modifier keys to hold." },
        scroll_direction: { type: "string", enum: ["up", "down", "left", "right"] },
        scroll_amount: { type: "integer", minimum: 0, maximum: 100 },
        duration: { type: "number", minimum: 0, maximum: 100, description: "hold_key / wait: seconds." },
        repeat: { type: "integer", minimum: 1, maximum: 100, description: "key: how many presses." },
      }, required: ["action"], additionalProperties: false } },
    }, required: ["actions"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => computerBatch(args, ctx),
  },
  {
    name: "read_clipboard",
    title: "Read clipboard",
    description: `Read the text on the Mac's clipboard; returns {"text": "…"} (only text: an image or a file on the clipboard reads as empty). It needs the clipboardRead permission from request_access — without it, reasonCode grant_flag_required — and it counts as full-screen control: it takes the screen like the other screen-wide tools (approved once per session), and while this session holds app windows from app_screenshot it is refused (state_conflict) until app_release. While a terminal or code editor is in front, the clipboard is put aside and emptied (it comes back when another app is in front, or when the turn ends), so the text read then is empty.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => clipboardTool("read", args, ctx),
  },
  {
    name: "write_clipboard",
    title: "Write clipboard",
    description: `Put text on the Mac's clipboard, replacing what was there; returns "Clipboard written.". It needs the clipboardWrite permission from request_access — without it, reasonCode grant_flag_required — and it counts as full-screen control: it takes the screen like the other screen-wide tools (approved once per session), and while this session holds app windows from app_screenshot it is refused (state_conflict) until app_release. With a terminal or code editor in front it is refused (tier_insufficient): their Paste can't be used to enter text. To enter text, type (or app_type) is usually what you want; with clipboardWrite granted, type already pastes text that has a new line.`,
    inputSchema: { type: "object", properties: { text: { type: "string", description: "The text to put on the clipboard." } }, required: ["text"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => clipboardTool("write", args, ctx),
  },
  {
    name: "request_teach_access",
    title: "Request teach mode",
    description: "Ask the user to start a guided walkthrough (teach mode) in the listed Mac apps. Use it instead of request_access when the user wants to learn to do something themselves (\"teach me\", \"show me how\", \"walk me through\"). The user answers one card; with Start guide the apps are granted for this session the way request_access grants them (no clipboard or system-shortcut permissions here), this app's window hides, and a layer for tooltips covers the screen. Then show the walkthrough with teach_step or teach_batch: each tooltip waits for the user's Next before its actions run. Teach mode ends when your turn ends, or when the user clicks Exit; while it is on, request_access is refused (the card would be hidden).\n\nReturns granted / denied as request_access does, and teachModeActive. A declined card comes back as reasonCode teach_declined: don't ask again for the same walkthrough. If an app isn't installed, nothing is asked and notInstalled says which.",
    inputSchema: {
      type: "object",
      properties: {
        apps: { type: "array", items: { type: "string" }, maxItems: MAX_APPS, description: "The apps the walkthrough uses, named as the user would (\"TextEdit\") or by bundle identifier." },
        reason: { type: "string", description: "What you will teach, in a few words; the user reads it on the card." },
      },
      required: ["apps", "reason"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => requestTeachAccess(args, ctx),
  },
  {
    name: "teach_step",
    title: "Teach step",
    description: "Show one tooltip of the walkthrough and wait until the user clicks Next; then run the step's actions (the items computer_batch takes, without zoom) and come back with what each did and a fresh full-screen screenshot, so no separate screenshot is needed between steps: aim the next step at that picture. In teach mode the user sees only the tooltips, so everything you want to tell them goes in explanation (text you write outside the tooltips shows only after the tour). Put as much as you can into one step's actions: the user waits through every round trip. Take a screenshot before the first step so its anchor and coordinates have a reference.\n\nReturns {executed, results} and the screenshot ({executed: 0, results: []} without a picture for a step with no actions); {exited: true} when the user clicks Exit (end the tour then, don't show more steps); an action that fails stops the step: ok: false with its reasonCode, executed, failed and remaining. Needs teach mode (request_teach_access) — otherwise reasonCode teach_mode_not_active.",
    inputSchema: { type: "object", properties: TEACH_STEP, required: ["explanation", "next_preview", "actions"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => teachStepTool(args, ctx),
  },
  {
    name: "teach_batch",
    title: "Teach steps",
    description: "Queue several tooltips of the walkthrough in one call. Each one still waits for the user's Next and then runs its own actions, but you don't wait for a round trip between them. All steps are checked before the first tooltip shows. Anchors and coordinates in every step refer to the screenshot taken before the batch, as in computer_batch: for the later steps leave anchor out (a centered tooltip) or aim only at things that won't have moved. A batch per page or screen works well; the returned screenshot (after the last step's actions) is the reference for the next batch. Use single teach_step calls when you need to look at the screen after each step.\n\nReturns {stepsCompleted, results} and the screenshot (no picture when no step had actions); {exited: true, stepsCompleted} when the user clicks Exit (end the tour then); an action that fails stops the batch: ok: false with its reasonCode, stepsCompleted, stepFailed, executed, failed, remaining and the earlier steps' results. Needs teach mode (request_teach_access) — otherwise reasonCode teach_mode_not_active.",
    inputSchema: {
      type: "object",
      properties: {
        steps: { type: "array", minItems: 1, description: "The steps in order, each as teach_step takes it. All are checked before the first tooltip shows.",
          items: { type: "object", properties: TEACH_STEP, required: ["explanation", "next_preview", "actions"], additionalProperties: false } },
      },
      required: ["steps"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => teachBatchTool(args, ctx),
  },
];

// app_batch: each action runs through the tool that does it alone, so a batch can't do anything the tools can't.
const BATCH_TOOLS = { click: "app_click", type: "app_type", key: "app_key", scroll: "app_scroll", drag: "app_drag", zoom: "app_zoom" };
/** A tool result's parts: its JSON body (or text) and its pictures. */
function partsOf(result) {
  const content = typeof result === "string" ? [{ type: "text", text: result }] : Array.isArray(result?.content) ? result.content : [];
  const text = content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
  let body;
  try { body = JSON.parse(text); } catch { body = { text }; }
  return { body: body && typeof body === "object" && !Array.isArray(body) ? body : { text }, images: content.filter((part) => part.type === "image") };
}
async function batch(args, ctx) {
  const refused = checkGrant(ctx, args.app);
  if (refused) return refused;
  const steps = Array.isArray(args.actions) ? args.actions : [];
  if (!steps.length || steps.length > MAX_BATCH) return failure("invalid_params", `actions must list 1–${MAX_BATCH} actions.`, "Split longer work into several app_batch calls.");
  const results = [], pictures = [];
  let stoppedAt = null;
  for (const [index, step] of steps.entries()) {
    const { action, ...fields } = step && typeof step === "object" ? step : {};
    const input = { ...fields, app: args.app, ...(args.window_id !== undefined ? { window_id: args.window_id } : {}) };
    let result;
    if (action === "screenshot") result = await screenshot(input, ctx, { keepReference: true });
    else if (Object.hasOwn(BATCH_TOOLS, action)) {
      const tool = tools.find((entry) => entry.name === BATCH_TOOLS[action]);
      result = tool ? await tool.handler(input, ctx) : failure("internal", `No tool runs the ${action} action.`, "Tell the user; don't retry.");
    } else result = failure("invalid_params", `actions[${index}].action must be one of click, type, key, scroll, screenshot, zoom, drag.`, "Fix the action and run the batch again from this step.");
    const { body, images } = partsOf(result);
    results.push({ index, action: action ?? null, ...(images.length && !result?.isError ? { ok: true, text: body.text } : body) });
    for (const image of images) pictures.push({ type: "text", text: `actions[${index}] (${action}):` }, image);
    if (result?.isError) { stoppedAt = index; break; }
  }
  const summary = { ok: stoppedAt === null, completed: stoppedAt ?? steps.length, total: steps.length, results,
    ...(stoppedAt !== null ? { stoppedAt, next_step: `actions[${stoppedAt}] didn't work (see its result); the ones after it didn't run. Fix it, take a new app_screenshot if the window changed, and continue from there.` } : {}) };
  return { content: [{ type: "text", text: json(summary) }, ...pictures], ...(stoppedAt !== null ? { isError: true } : {}) };
}
// ── app_bring_to_current_space results (official §1.6.3): the official wording in `message` (service.cjs), this
// build's shape {ok, outcome, reasonCode, how?, message, next_step?} + isError on a refusal.
const BRING_STEPS = {
  screen_locked: "Wait until the user unlocks the screen; app_screenshot still works on the window where it is.",
  bad_args: "Pass window_id as an integer from app_list_windows.",
  window_not_in_app: "Call app_list_windows for this app and use one of its window_id values.",
  owner_mismatch: "Call app_list_windows for this app and use one of its window_id values.",
  window_changed: "Call app_list_windows again and retry with the window if it is still needed.",
  still_parked: "Check is_minimized and is_hidden in a fresh app_list_windows; if the window stays away, ask the user to bring it back.",
  user_is_in_the_app: "Work on something else and retry once the user is in another app, or ask them to bring the window back.",
  front_window_cannot_be_raised: "Retry later, or ask the user to bring the window back.",
  unavailable: "Ask the user to bring the window back.",
  space_unclassifiable: "Call app_list_windows again, then retry once.",
  fullscreen_space: "Ask the user to switch to a regular desktop Space, or to bring the window there themselves; app_screenshot still works on it where it is.",
  op_unavailable: "Ask the user to bring the window to this Space themselves; app_screenshot still works on it where it is.",
  move_not_confirmed: "Take a fresh app_list_windows / app_screenshot to see where the window is before trying again.",
};
/** One appBringToCurrentSpace service result → the tool result. */
function bringResult(result) {
  const ok = result?.outcome === "ok";
  const body = { ok, outcome: result?.outcome, reasonCode: result?.reasonCode ?? null,
    ...(result?.how ? { how: result.how } : {}), ...(result?.windowId !== undefined ? { windowId: result.windowId } : {}),
    ...(result?.errorKind ? { errorKind: result.errorKind } : {}), ...(result?.tellUser ? { tellUser: true } : {}),
    ...(result?.offSpace ? { offSpace: true } : {}), message: result?.message };
  if (!ok) body.next_step = t(BRING_STEPS[result?.reasonCode] ?? "Take a fresh app_list_windows to see the window's state, or ask the user to bring it here.");
  return { content: [{ type: "text", text: json(body) }], ...(ok ? {} : { isError: true }) };
}
/**
 * read_clipboard / write_clipboard (official Oi() / Ai()): the flag, write's text and the session's app windows are
 * checked first (official jr() / Di()), then the takeover like any screen-wide tool, then the service.
 */
async function clipboardTool(kind, args, ctx) {
  const svc = service(ctx).service;
  try {
    const pre = svc.clipboardPrecheck(ctx.sessionId, kind, args);
    if (pre) return clipboardRefusal(pre);
    const refused = await displayTakeover(ctx);
    if (refused) return refused;
    const result = kind === "read" ? await svc.readClipboard(ctx.sessionId) : await svc.writeClipboard(ctx.sessionId, { text: args.text });
    if (result?.outcome !== "ok") return clipboardRefusal(result);
    return kind === "read" ? json({ text: result.text }) : result.text;
  } catch (error) { return displayError(error); }
}
const CLIPBOARD_STEPS = {
  grant_flag_required: (flag) => `Call request_access with ${flag}: true (and the apps you need) and a one-line reason; the user decides on the card.`,
  state_conflict: () => "Finish the background work and call app_release for those windows first, then retry (the next screen-wide call asks to take over the screen).",
  tier_insufficient: () => "Bring an app granted at the full level to the front first (open_application or a click), or enter the text with type / app_type instead.",
  clipboard_unavailable: () => "Tell the user the clipboard can't be used here; enter text with type or app_type instead.",
};
function clipboardRefusal(result) {
  const step = CLIPBOARD_STEPS[result?.reasonCode];
  if (!step) return displayRefusal(result);
  const { outcome = "unsupported", message, ...rest } = result;
  return { content: [{ type: "text", text: json({ ok: false, ...rest, outcome, message: t(message), next_step: t(step(result.flag)) }) }], isError: true };
}

// ── app_key results, worded as the official build words them (docs/computer-use-official-spec-20261021.md §1.6.1;
// BEf0UhNC ir() / Qn()), in this build's refusal shape {ok: false, outcome, reasonCode, message, next_step} + isError.
/** A name or title as a result line shows it: no quotes, angle brackets or control characters, at most 80 characters. */
const shown = (text) => (typeof text === "string" && text.trim() ? text.replace(/[\u0000-\u001f\u007f"<>]/g, " ").trim().slice(0, 80) : null);
// Official `$e`: an Accessibility operation name is shown only when it is short and made of these characters.
const AX_OP_CHARS = /^[\p{L}\p{N}_ .,;:=(){}"'\xa7\xd7%/\\+-]+$/u;
const shownOp = (op) => { const text = typeof op === "string" ? op.trim() : ""; return text && text.length <= 120 && AX_OP_CHARS.test(text) ? text : "(withheld)"; };
const appName = (grants, bundleId) => shown(grants.list().find((app) => app.bundleId === bundleId)?.displayName) ?? bundleId;
// Official `mn`: how to select one text box on a canvas without selecting a whole document.
const CANVAS_SELECT = "For ONE text box on a Keynote-style canvas, while it is being edited, select its text with cmd+up then shift+cmd+down and type without a mode; in a document body those keys select the WHOLE document";
/** "AXTextArea 'Notes'" and " via AXWindow>AXScrollArea>AXTextArea" (the last six roles, repeats folded). */
function keyElement(result) {
  const title = shown(result?.title);
  const roles = (Array.isArray(result?.descentPath) ? result.descentPath : []).slice(-6).map((role) => shown(role) ?? "(role withheld)")
    .reduce((acc, role) => { const last = acc.at(-1); if (last?.role === role) last.n += 1; else acc.push({ role, n: 1 }); return acc; }, [])
    .map(({ role, n }) => (n > 1 ? `${role}×${n}` : role));
  return { element: `${shown(result?.role) ?? "(role withheld)"}${title ? ` '${title}'` : ""}`, via: roles.length ? ` via ${roles.join(">")}` : "" };
}
const KEY_REASONS = {
  key_not_mapped: "neither accessibility nor a background keystroke could deliver it. Background keystrokes cover return, escape, backspace, tab, up, down, left, right, home, end, pageup, pagedown, space, forward_delete and cmd+a (backspace is also spelled delete or del; the navigation keys also take shift, option or cmd); if you sent one of those, app_click the target so it holds keyboard focus and retry once. For menu commands use app_menu",
  key_cannot_be_aimed: "accessibility could not deliver this key here, and the only other way is a real keystroke, which goes to whatever holds keyboard focus: an element_index cannot aim it. No keystroke was sent. app_click the element by its element_index first (a click moves keyboard focus there), check a fresh app_screenshot, then send the key without element_index",
  would_replace_content: "text is selected here and this key would replace the selection. Collapse the selection first (app_click a point in the field), or, if you mean to replace the field's entire content, use app_type with mode \"replace\"",
  focus_in_sibling_window: "the app's text cursor is in a DIFFERENT window of this app, and this operation may route there instead of here. Target that other window (the one holding focus) with your app_type/app_key call instead",
  window_minimized: "the window is minimized, so nothing was sent. To act on it, call app_bring_to_current_space with its window_id: the window comes back behind the window the user is working in, and the app does not take keyboard focus. If the user is at the computer, tell them first: they may have put it away on purpose",
  app_hidden: "the app is hidden, so nothing was sent. To act on it, call app_bring_to_current_space with its window_id: the window comes back behind the window the user is working in, and the app does not take keyboard focus. If the user is at the computer, tell them first: they may have put it away on purpose",
  window_off_space: "this window is on another Space, and delivering this action would need the app briefly frontmost (which would flash on-screen), so it can't be controlled there in the background. You can still app_screenshot it, though its image may be stale for this app. To interact, call app_bring_to_current_space to bring the window here",
  foreign_pid: "this element belongs to a system panel owned by another process (an Open/Save or similar sheet), not to this app — the whole window is blocked while that panel is up, and it can't be driven from the background. Ask the user to complete or dismiss it",
  screen_locked: "the screen is locked, so nothing was sent. You can still app_screenshot the window. To act on it, wait until the user unlocks the screen",
  sheet_or_modal_on_target_window: "the window has a modal sheet open and this point is in the dimmed area behind it. Take a fresh app_screenshot (the sheet is now composited into it) and aim at a coordinate inside the sheet, or dismiss it first",
  anotherWindowIsOnTopAtThePressPoint: "another window is on top of this one at that point, so the key could land there",
  listed_element_gone: "the window changed since the screenshot, so this element_index no longer names what it did",
  no_focused_element: "the app reports no element with keyboard focus",
  ax_untrusted_cannot_verify: "Accessibility permission is off, so the target cannot be checked and nothing was sent",
};
const KEY_STEPS = {
  save_panel_restricted: SAVE_PANEL_STEP,
  key_not_mapped: "Type text with app_type and run ⌘ commands with app_menu; app_key sends only the keys the message lists.",
  key_cannot_be_aimed: "app_click the element by its element_index, check a fresh app_screenshot, then send the key without element_index.",
  would_replace_content: "Collapse the selection first (app_click a point in the field), or replace the whole text with app_type mode \"replace\".",
  focus_in_sibling_window: "Send the key to the window that holds the app's keyboard focus (app_list_windows), or app_focus this window first.",
  menu_command_disabled: "Select the text another way (app_click with count 3 selects a line), or replace the whole field with app_type mode \"replace\".",
  window_minimized: "Call app_bring_to_current_space with this window_id, then take a fresh app_screenshot.",
  app_hidden: "Call app_bring_to_current_space with this window_id, then take a fresh app_screenshot.",
  window_off_space: "Call app_bring_to_current_space with this window_id, then take a fresh app_screenshot.",
  user_actively_typing: "Wait a moment and retry; steps that don't need the keyboard (app_screenshot, a press by element_index) still work meanwhile.",
  secure_input_active: "Ask the user to dismiss the password field, or try again shortly.",
  screen_locked: "Wait until the user unlocks the screen; app_screenshot still works.",
  bad_args: "Fix the arguments as the message says and call again.",
  grant_flag_required: "Call request_access with systemKeyCombos: true (and this app) and a one-line reason; the user decides on the card.",
  state_conflict: "Use app_type to enter text, and app_menu for the Edit menu's clipboard commands.",
  listed_element_gone: "Take a fresh app_screenshot and use its [N] or a coordinate.",
};
const KEY_DEFAULT_STEP = "Take a fresh app_screenshot and try another way (app_click, app_menu, app_type), or tell the user.";
/** One app_key service result → the tool result. */
function keyResult(result, app) {
  const { element, via } = keyElement(result);
  const base = { outcome: result?.outcome, reasonCode: result?.reasonCode ?? null, path: result?.path, combo: result?.combo,
    ...(result?.windowId !== undefined ? { windowId: result.windowId } : {}) };
  if (result?.outcome === "ok") {
    let message;
    if (result.path === "cgevent") {
      const why = result.axWriteIgnored ? "the accessibility write was ignored by the app" : "there is no accessibility action for this key";
      const selectAll = result.cmdASentAsKeystroke ? `; this sent cmd+a as a keystroke. If the app ignored it, as a native app in the background can, nothing was selected and old text may remain. ${CANVAS_SELECT}` : "";
      message = `ok (delivered via raw input on ${element}${via}; ${why} so this is unverified — confirm the effect with app_screenshot${selectAll})`;
    } else {
      message = `ok (${shownOp(result.axOp)} on ${element}${via})${result.nothingToDelete ? " — the caret is at the start of the text, so there was nothing before it to delete" : ""}`;
    }
    return { content: [{ type: "text", text: json({ ok: true, ...base, verified: result.verified === true, message }) }] };
  }
  const reason = result?.reasonCode ?? null;
  let message, errorKind = result?.errorKind ?? "feature_unavailable";
  if (typeof result?.message === "string" && result.message) message = result.message;
  else if (reason === "menu_command_disabled") {
    message = `cmd+a was NOT sent: Select All is disabled in ${app} while it is in the background, so the app would ignore the key, select nothing, and the user would hear an alert sound. ${CANVAS_SELECT}.`;
  } else if (reason === "user_actively_typing") {
    message = "The key was NOT performed — the user is actively typing right now. This action can briefly take keyboard focus away from the app they are typing in, which would lose their keystrokes or send them into the target. The action was NOT performed. Wait a moment and retry — a natural pause in their typing unblocks it.";
  } else if (result?.outcome === "ineffective") {
    message = `${result.axOp ? shownOp(result.axOp) : "The key"} on ${element}${via} changed the text, but not as expected. Take a fresh app_screenshot and look at the field before anything else.`;
  } else {
    message = `This element (${element} at ${result?.aimed ?? "the target"}${via}) cannot be sent that key while ${app} is in the background — ${KEY_REASONS[reason] ?? "this action is not supported in the background"}.`;
  }
  const nextStep = t(KEY_STEPS[reason] ?? KEY_DEFAULT_STEP);
  return { content: [{ type: "text", text: json({ ok: false, ...base, errorKind, message, next_step: nextStep }) }], isError: true };
}

// ── app_scroll results (official §1.6.2), worded as the official ir() words them: "ok (<axOp> on …)", "ineffective: …"
// (not an error: official app_batch goes on after it), or "This element (…) cannot be scrolled while X is in the
// background — <reason>." in this build's refusal shape {ok: false, outcome, reasonCode, message, next_step} + isError.
const SCROLL_REASONS = {
  canvas: "nothing at that point, nor anything around it up to the window, is a scroll area with a vertical scroll bar that accessibility can set. Aim inside the list, text or page that should move (a coordinate in it, or its element_index), or reach what you need with app_ax_find or app_menu",
  horizontal_scroll: "horizontal scroll isn't available via accessibility, and the raw-input fallback did not apply here",
  anotherWindowIsOnTopAtThePressPoint: "another window is on top of this one at that point",
  focus_in_sibling_window: "the app's keyboard focus is in a DIFFERENT window of this app, so its focused element is not in this window. Aim with a coordinate in this window instead",
};
const SCROLL_STEPS = {
  canvas: "Take a fresh app_screenshot and give a coordinate inside the scrollable list or text (or its element_index).",
  horizontal_scroll: "Scroll vertically with dy only; content further to the side is out of reach here, so tell the user if it is needed.",
  anotherWindowIsOnTopAtThePressPoint: "Take a fresh app_screenshot and aim at a part of this window that nothing covers.",
  focus_in_sibling_window: "Give a coordinate in this window instead of target \"focused\".",
  bad_args: "Fix the arguments as the message says and call again.",
};
const SCROLL_DEFAULT_STEP = "Take a fresh app_screenshot and try another way (app_ax_find for something out of view, app_menu, app_key pagedown on a focused list), or tell the user.";
const scrollValue = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : undefined);
/** One app_scroll service result → the tool result. */
function scrollResult(result, app) {
  const { element, via } = keyElement(result);
  const op = shownOp(result?.axOp);
  const base = { outcome: result?.outcome, reasonCode: result?.reasonCode ?? null, path: result?.path, dy: result?.dy,
    ...(result?.windowId !== undefined ? { windowId: result.windowId } : {}),
    ...(scrollValue(result?.before) !== undefined ? { before: scrollValue(result.before) } : {}),
    ...(scrollValue(result?.after) !== undefined ? { after: scrollValue(result.after) } : {}),
    ...(result?.atLimit ? { atLimit: result.atLimit } : {}) };
  const reply = (body, isError) => ({ content: [{ type: "text", text: json(body) }], ...(isError ? { isError: true } : {}) });
  if (result?.outcome === "ok") {
    return reply({ ok: true, ...base, verified: result.verified === true, message: `ok (${op} on ${element}${via})` }, false);
  }
  const reason = result?.reasonCode ?? null;
  if (result?.outcome === "ineffective") {
    if (result.axError && result.axError !== "success") {
      return reply({ ok: false, ...base, errorKind: "feature_unavailable", axError: shown(result.axError),
        message: `${op} on ${element}${via} failed (AXError: ${shown(result.axError)}). Take a fresh app_screenshot — the element may have moved or been removed since the last capture.`,
        next_step: t("Take a fresh app_screenshot and aim at the scrollable content again.") }, true);
    }
    const message = result.atLimit
      ? `ineffective: ${op} on ${element}${via} — the scroll bar is already at the ${result.atLimit === "top" ? "top" : "bottom"}, so the content can't move further that way.`
      : `ineffective: ${op} on ${element}${via} returned success but the app has not visibly responded yet. Take a fresh app_screenshot to confirm before assuming it failed.`;
    return reply({ ok: false, ...base, message }, false);
  }
  let message, errorKind = result?.errorKind ?? "feature_unavailable";
  if (typeof result?.message === "string" && result.message) message = result.message;
  else {
    message = `This element (${element} at ${result?.aimed ?? "the target"}${via}) cannot be scrolled while ${app} is in the background — ${SCROLL_REASONS[reason] ?? KEY_REASONS[reason] ?? "this action is not supported in the background"}.`;
  }
  return reply({ ok: false, ...base, errorKind, message, next_step: t(SCROLL_STEPS[reason] ?? KEY_STEPS[reason] ?? SCROLL_DEFAULT_STEP) }, true);
}
