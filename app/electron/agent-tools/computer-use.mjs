// Computer use for the app's sessions: the app-scoped tools that act on one granted app's window in the background
// (electron/computer-use/service.cjs; field names from docs/02-tools.live.json). Working without anything from M4:
// request_access, app_list_windows, app_screenshot, app_ax_find, app_click (Accessibility only: left, right, double and triple click),
// app_type (Accessibility first, then the reason policy's raw rung), app_release, app_focus and app_menu (Accessibility
// through ax-helper.cjs), app_zoom (a crop of the last screenshot), list_apps, list_granted_applications and app_batch
// (the tools above in order). The rest of the official names are registered and answer with a reason code instead of
// being missing: requires_raw_path (app_key, app_scroll, app_bring_to_current_space — M4), not_supported_in_build
// (full control, teach mode), permission_denied → request_access (the clipboard) (docs/computer-use-handoff-20261020.md).
// ctx.computerUse: { service (createComputerUse), resolveApps(names) → [{requested, bundleId, displayName, path,
//   installed}], listApps({query, runningFirst, limit, cursor}) → {apps, total, nextCursor?} (apps.cjs),
//   ask({reason, flags, apps, toolParams}) → "accept" | "decline" | "unavailable" }  (main.cjs)
//
// request_access asks with the access card (src/computer-use-approval-card.jsx) and records the answer in the session's
// grants; every other tool checks the grants first and answers a missing grant, like any refusal, with a structured
// error ({ok: false, error: {code, message, next_step}}, isError) instead of throwing, so the agent knows what to do next.
import { t } from "../i18n/index.mjs";
import grantsModule from "../computer-use/grants.cjs";

const { tierFor, validBundleId } = grantsModule;
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
/** A refusal the agent reads: what went wrong and what to do next. Never thrown. */
function failure(code, message, nextStep, details) {
  return { content: [{ type: "text", text: json({ ok: false, error: { code, message, ...(details ? details : {}), ...(nextStep ? { next_step: nextStep } : {}) } }) }], isError: true };
}
const requestAccessStep = (app) => `Call request_access with apps: [${JSON.stringify(app)}] and a one-line reason, wait for the user's answer, then retry this call.`;
// What to do after each coded error from the service (native.cjs / service.cjs codes).
const NEXT_STEPS = {
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
  helper_failed: "The app didn't answer through Accessibility. Try once more; if it fails again, tell the user.",
  helper_timeout: "The app didn't answer through Accessibility in time (it may be busy). Try once more; if it fails again, tell the user.",
  zoom_unavailable: "Zooming isn't available here; use app_screenshot (scale 1) instead.",
};
// What to do after an outcome's reasonCode, where the general next step doesn't fit.
const REASON_STEPS = {
  system_app_ignores_posted_events: "This system app ignored the posted drag. Use app_menu or another Accessibility action for the same task.",
  drag_ineffective: "The drag was released but the readable state did not change. Inspect a fresh app_screenshot before trying an alternative.",
  drag_timeout: "The drag exceeded 3000 ms and the mouse button was released. Inspect the app before retrying.",
  drag_in_progress: "Another drag is still running. Wait for it to finish before starting another.",
  menu_item_disabled: "The item is disabled right now (the app's state doesn't allow it, e.g. nothing is selected). Change that first, or tell the user.",
  app_is_frontmost: "The app is in front and the user is working in it, so its focus isn't moved. Address the element with element_index instead, or ask the user.",
  window_minimized: "The window is minimized. Ask the user to restore it, or pick another window from app_list_windows.",
  focus_refused: "The app didn't take the focus change. Take an app_screenshot to see its state, or address elements with element_index.",
  no_menu_action: "This element has no context menu that Accessibility can open (nor do its two parents). Right-click the item itself (its element_index), use app_menu for the command, or tell the user.",
  no_press_action: "Accessibility has no press or text selection for this. Take a fresh app_screenshot and use the control's element_index, app_menu for a command, or tell the user.",
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
  return null;
}
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
const RAW_PATH_STEP = "Do it through Accessibility instead (app_click with count 1 on an element_index, or app_menu for a command), or tell the user this needs input this build can't send yet.";
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
        clipboardRead: { type: "boolean", description: "Also ask to read the clipboard." },
        clipboardWrite: { type: "boolean", description: "Also ask to write to the clipboard." },
        systemKeyCombos: { type: "boolean", description: "Also ask to use system shortcuts such as ⌘Q or ⌘Tab." },
      },
      required: ["apps", "reason"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cu = service(ctx);
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
        answer = await cu.ask({ reason, flags, apps: apps.map(({ requested, ...entry }) => entry), toolParams: args });
        if (answer === "unavailable") {
          return failure("approval_unavailable", "The access card can't be shown in this session right now, so nothing was granted.",
            "Tell the user you need access to these apps and ask them to try again in the app's session window.");
        }
        if (answer === "accept") grants.grant(asking.map((entry) => ({ bundleId: entry.bundleId, displayName: entry.displayName })), flags);
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
    description: "Press a control in a granted app's window without bringing the app forward, through macOS Accessibility (the control's own press action). Give exactly one of element_index (an [N] from app_screenshot, the most reliable), coordinate (pixels of that screenshot) or target \"focused\"; a call without one is an error, never a repeat of the last click. button \"right\" opens the element's context menu through the Accessibility action AXShowMenu (on the element or one of its two parents) and lists the menu's items as menuItems; an element without one comes back with reasonCode no_menu_action, and the open menu is closed with app_menu close. count 2 is a double click: on text (static text, a text field or text area) it selects the word at the point through the Accessibility attribute AXSelectedTextRange, on a control it is two press actions 80 ms apart. count 3 is a triple click: on text it selects the line at the point the same way. When none of that works, reasonCode no_press_action. Something Accessibility can't press is refused with a reason, not clicked blindly.\n\nNeeds the app granted with request_access (and allowed to click: browsers are view only), and an app_screenshot of the window for element_index or coordinate. Returns ok with how it was done; otherwise ok: false with a reasonCode (for example the point has no pressable control, the screen is locked, or secure input is on) and what to try next.",
    inputSchema: {
      type: "object",
      properties: {
        app: APP, window_id: WINDOW_ID, coordinate: COORDINATE, element_index: ELEMENT_INDEX, target: TARGET,
        button: { type: "string", enum: ["left", "right"], description: "\"left\" (default): the control's press action. \"right\": its context menu (Accessibility AXShowMenu); no_menu_action when it has none." },
        count: { type: "integer", enum: [1, 2, 3], description: "1 (default). 2: double click — selects the word on text (AXSelectedTextRange), presses twice on a control. 3: triple click — selects the line on text (AXSelectedTextRange)." },
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
        return outcomeResult(result, "Take a fresh app_screenshot and try an element_index for the control (or target \"focused\"); if Accessibility can't press it, tell the user this control can't be clicked yet.");
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
    description: "Use a granted app's menu bar through macOS Accessibility: no mouse event is sent and the app stays where it is, so prefer this over clicking for anything the menus offer — in Finder and similar apps it is the reliable way to run a command. Give exactly one of: path, the titles from the menu bar down to an item, e.g. [\"File\", \"New Folder\"] (any case; a trailing \"…\" can be left out) — a command item runs, a menu title opens that menu and returns its items; list, to read items without pressing anything (true for the menu bar's titles, or a title / path for the items under it); or close: true, to close a menu of this app that is open (as Escape would).\n\nNeeds the app granted with request_access; running a command needs full access, listing works at any level. Returns the resolved path and, for an opened menu or a list, the items (title, enabled, submenu, shortcut, checked). A title that doesn't match returns menu_item_not_found with closestMatch and the titles that are there; a disabled item returns menu_item_disabled.",
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
    description: t("Run several actions on one granted app's window in order, in one call: click, type, drag, screenshot and zoom work as app_click, app_type, app_drag, app_screenshot and app_zoom do (same fields, without app and window_id, which the batch gives); key and scroll need the raw input path, which isn't enabled yet, and stop the batch with requires_raw_path. It stops at the first action that fails or doesn't take effect; the actions after it don't run. Coordinates and element_index in every action refer to the app_screenshot taken before this call — a screenshot inside the batch is only a picture for you to check progress and doesn't change that.\n\nNeeds the app granted with request_access and, for coordinates or element_index, an app_screenshot before the call. Returns each action's result in order, how many completed, and where it stopped if it did; pictures from screenshot and zoom actions follow."),
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
      const grants = service(ctx).service.grantsFor(ctx.sessionId);
      return json({ apps: grants.list().map((app) => ({ bundleId: app.bundleId, ...(app.displayName ? { name: app.displayName } : {}), tier: app.tier })),
        flags: grants.flags(), coordinateMode: "app_window" });
    },
  },
  // ── Registered with a reason code until the capability exists (docs/computer-use-handoff-20261020.md, M4 list). Seeing
  // the tool and its reason, the agent turns to the Accessibility tools or tells the user, instead of inventing a way.
  {
    name: "app_key",
    title: "Press key in app window",
    description: "Press a key or shortcut (\"return\", \"escape\", \"cmd+s\", \"shift+tab\") in a granted app's window without bringing it forward. Not available in this build: key presses to a background window need the raw input path, which isn't enabled yet, so every call returns reasonCode requires_raw_path. For a command, app_menu runs the same thing through Accessibility (Save is File ▸ Save); for text, use app_type; to close an open menu, app_menu with close.",
    inputSchema: {
      type: "object",
      properties: { app: APP, window_id: WINDOW_ID, combo: { type: "string", minLength: 1, description: "The key or combo: \"return\", \"cmd+a\", \"shift+tab\"." }, coordinate: COORDINATE, action_summary: ACTION_SUMMARY },
      required: ["app", "combo"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => rawPathRefusal("A key press"),
  },
  {
    name: "app_scroll",
    title: "Scroll app window",
    description: "Scroll part of a granted app's window up or down without bringing it forward (dy: positive scrolls toward the bottom). Not available in this build: scrolling needs the raw input path, which isn't enabled yet, so every call returns reasonCode requires_raw_path. To reach something off screen, look for it with app_ax_find (the element list covers more than what is visible), use app_menu (View, Go), or tell the user.",
    inputSchema: {
      type: "object",
      properties: { app: APP, window_id: WINDOW_ID, dy: { type: "number", description: "How far: positive toward the bottom, negative toward the top." }, coordinate: COORDINATE },
      required: ["app", "dy"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => rawPathRefusal("Scrolling"),
  },
  {
    name: "app_drag",
    title: t("Drag in app window"),
    description: t("Drag inside one granted app window from coordinate to to_coordinate, optionally through 2–20 path waypoints. Requires full access via request_access and a prior app_screenshot; all points use that screenshot's full-resolution pixels. button defaults to left. Uses targeted mouse events with continuous safety checks and a 3000 ms limit. Returns before/after readback when available; verified:false means delivery could not be checked. Failures include drag_ineffective, drag_timeout, screen_locked, secure_input_active, user_actively_typing and system_app_ignores_posted_events. For the last reason, use an Accessibility alternative such as app_menu."),
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
    description: "Move a granted app's window that is on another Space, minimized or hidden to where the user can see it, without the app taking focus. Not available in this build: it needs the raw input path's window handling, which isn't enabled yet, so every call returns reasonCode requires_raw_path. app_screenshot still captures such a window where it is; to act in it, ask the user to bring it here.",
    inputSchema: { type: "object", properties: { app: APP, window_id: WINDOW_ID }, required: ["app", "window_id"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => rawPathRefusal("Bringing a window to this Space"),
  },
  {
    name: "request_full_control",
    title: "Request full control",
    description: "Ask the user for control of the whole display — the screen-wide tools and the display lock — for the rest of the session. Not available in this build: it controls one granted app's window at a time, in the background, and has no display-scope tools, so every call returns reasonCode not_supported_in_build. Work app by app with request_access and the app_* tools.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => notInBuild("Full control of the display"),
  },
  {
    name: "release_full_control",
    title: "Release full control",
    description: "Give back control of the whole display and drop the full-control approval. Not available in this build: there is no full control to release (see request_full_control), so every call returns reasonCode not_supported_in_build. To be done with an app's window, use app_release.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => notInBuild("Releasing full control"),
  },
  {
    name: "read_clipboard",
    title: "Read clipboard",
    description: "Read the text on the Mac's clipboard. It needs the clipboard-read permission from request_access (clipboardRead: true); without it, it returns reasonCode permission_denied with the request_access call to make. Reading the clipboard is display-scope control, which this build doesn't have, so with the permission it returns not_supported_in_build. Ask the user to paste what you need into the chat instead.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => clipboardRefusal(ctx, "clipboardRead", "Reading the clipboard"),
  },
  {
    name: "write_clipboard",
    title: "Write clipboard",
    description: "Put text on the Mac's clipboard. It needs the clipboard-write permission from request_access (clipboardWrite: true); without it, it returns reasonCode permission_denied with the request_access call to make. Writing the clipboard is display-scope control, which this build doesn't have, so with the permission it returns not_supported_in_build. To get text into an app, use app_type.",
    inputSchema: { type: "object", properties: { text: { type: "string", description: "The text to put on the clipboard." } }, required: ["text"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => clipboardRefusal(ctx, "clipboardWrite", "Writing the clipboard"),
  },
  {
    name: "request_teach_access",
    title: "Request teach mode",
    description: "Ask the user to start teach mode with the listed apps: a guided walkthrough where each step explains what to do and shows it on screen, and the user moves on or exits. Not available in this build: teach mode comes after the raw input path, so every call returns reasonCode not_supported_in_build. Explain the steps in the chat instead, or do them with the app_* tools after request_access.",
    inputSchema: {
      type: "object",
      properties: { apps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: MAX_APPS, description: "The apps the walkthrough uses, by name or bundle identifier." }, reason: { type: "string", description: "One sentence the user reads: what you will show them." } },
      required: ["apps", "reason"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => notInBuild("Teach mode"),
  },
  {
    name: "teach_step",
    title: "Teach step",
    description: "Show one teach-mode step: an explanation, what comes next, and the actions that demonstrate it, then wait for the user to continue or exit. It would need teach access from request_teach_access and return whether the user exited. Not available in this build (teach mode needs the raw input path), so every call returns reasonCode not_supported_in_build; explain the step in the chat instead.",
    inputSchema: {
      type: "object",
      properties: {
        explanation: { type: "string", description: "What this step shows." },
        next_preview: { type: "string", description: "One line on the step after it." },
        actions: { type: "array", items: { type: "object" }, description: "The actions that demonstrate the step." },
        anchor: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2, description: "[x, y] the explanation points at." },
      },
      required: ["explanation", "next_preview", "actions"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => notInBuild("Teach mode"),
  },
  {
    name: "teach_batch",
    title: "Teach steps",
    description: "Show several teach-mode steps in a row, stopping when the user exits. It would need teach access from request_teach_access and return how many steps were completed and where it stopped. Not available in this build (teach mode needs the raw input path), so every call returns reasonCode not_supported_in_build; walk the user through the steps in the chat instead.",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "array", minItems: 1,
          items: {
            type: "object",
            properties: {
              explanation: { type: "string" }, next_preview: { type: "string" }, actions: { type: "array", items: { type: "object" } },
              anchor: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
            },
            required: ["explanation", "next_preview", "actions"],
            additionalProperties: false,
          },
          description: "The steps, each as teach_step takes it.",
        },
      },
      required: ["steps"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async () => notInBuild("Teach mode"),
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
      result = tool ? await tool.handler(input, ctx) : rawPathRefusal(action);
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
/** What app_key, app_scroll, app_drag and app_bring_to_current_space answer until M4's raw input path is enabled. */
function rawPathRefusal(what) {
  return notYet("requires_raw_path", `${what} needs the raw input path, which isn't enabled in this build yet.`, RAW_PATH_STEP);
}
// This branch's scope, for not_supported_in_build: what the build is, so the agent can say why.
const BUILD_SCOPE = "This build controls one granted app's window at a time, in the background, through Accessibility; display-scope control (the whole screen, the display lock, the clipboard) and teach mode aren't part of it.";
function notInBuild(what) {
  return { content: [{ type: "text", text: json({ ok: false, outcome: "unsupported", reasonCode: "not_supported_in_build", message: `${what} isn't part of this build.`,
    build: BUILD_SCOPE, next_step: "Work app by app with request_access and the app_* tools, or tell the user this needs a later build." }) }], isError: true };
}
/** read_clipboard / write_clipboard: the permission first (request_access), then the build's scope. */
function clipboardRefusal(ctx, flag, what) {
  if (!service(ctx).service.grantsFor(ctx.sessionId).flags()[flag]) {
    return notYet("permission_denied", `${what} needs the ${flag} permission, which this session doesn't have.`,
      `Call request_access with ${flag}: true (and the apps you need) and a one-line reason; the user decides on the card.`);
  }
  return notInBuild(what);
}
