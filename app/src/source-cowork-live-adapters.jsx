// Host services of the 3.6556.2 live sections of the Cowork session activity panel (src/generated/cowork-live,
// scripts/extract-cowork-live.mjs; w13-coworkui-panel-live, cwui-23 / cwui-24): Claude in Chrome (c21f11e6d hb), the
// in-app browser (kb / Ab) and Computer use (bb over xb). Each export replaces one original declaration the generator
// pins by its features; coworkLiveActivity below derives the sections' props from this host's session items the way
// the official panel AT derives them (readable c21f11e6d :12095-12145). OpenClaude has no claude.ai account and no
// Claude in Chrome MCP client in the renderer (E59): those services answer the official "unavailable" branch. The
// computer-use live frames come from this host's own preview channel (electron/computer-use/preview.cjs, the same one
// the Code rail's computer-use card reads, src/source-session-rail-computer-use.jsx).
import { appToolCall } from "./agent-tool-titles.mjs";
import { computerUseAction, computerUseScreenshot } from "./computer-use-model.mjs";
import { toolOutputImages } from "./generic-tool-model.mjs";

// ca2ef848d L1 (the lazy browser extension activity detail the Claude in Chrome card preloads, `il(bp, …)`): not sliced,
// the progress graph's no-op handle.
export { unavailableActivityDetail } from "./source-cowork-progress-v3-adapters.jsx";

// c5f921d63 ae: the live frame card's capture rate, GrowthBook dynamic config cowork_activity_panel_live_preview with
// the official default `E = { fps: 1 }` (D29/D31: no GrowthBook client here, so the default). preview.cjs captures at
// the same 1 fps.
export const LIVE_PREVIEW_CONFIG_KEY = "cowork_activity_panel_live_preview";
export const useLivePreviewFps = () => 1;

// c96143e67 l: the browsers the Claude in Chrome MCP client lists (`list_connected_browsers` / `select_browser`). It
// reads shared-156's MCP store `localTools["claude-in-chrome"]`; this renderer has no such client (the Chrome bridge runs
// in the main process, electron/browser/chrome-bridge-service.cjs, one host connection), so the store is "unloaded":
// isSupported false, no browsers. The card's "Switch browser" popover then shows the official
// "Browser listing requires a newer version of the desktop app." branch, as the original does without the picker tools.
const NO_BROWSERS = Object.freeze([]);
const CONNECTED_BROWSERS = Object.freeze({ browsers: NO_BROWSERS, isLoading: false, isSupported: false, refresh: async () => {}, select: async () => {} });
export const useConnectedBrowsers = () => CONNECTED_BROWSERS;
// c17c38211 d: "Choose in Chrome" (`switch_browser`): offered only when the extension's tools include switch_browser;
// none here, so switchBrowser is undefined and the popover has no such row.
const NO_SWITCH = Object.freeze({ switchBrowser: undefined, isSwitching: false });
export const useSwitchBrowser = () => NO_SWITCH;

// shared-0 KS / shared-1 Hu (`globalThis["claude.web"]?.ComputerUseLivePreview`, the desktop live preview bridge):
//   computerUsePreviewStore { getState(), onStateChange(cb) } — the result bb / xb read: { sessionId, active, mode
//     ("app" | "display", shared-0 ux), targetLabel, frame }. Over the host's "computer-use-preview" events (the window
//     the session last looked at, mode "app": the app-scoped tools work in the background, "Background · {target}").
//   setSubscribed(sessionId, on, wantsCapture) — the frame card c5f921d63 D asks for captures while it is shown:
//     main "computer-use:preview" { sessionId, on } (it only captures while the session is using the computer).
//   setFps(fps) — main captures at a fixed 1 fps (preview.cjs), so it is a no-op.
//   browserPreviewStore — absent: the Chrome bridge sends no live frames, so the browser preview reads "missing" and the
//     Claude in Chrome card shows the transcript's last screenshot (hb `H = j ?? w ?? n`).
// Without the host bridge (window.desktop) the store is absent too and both readers stay "missing", as in the original.
const desktopOf = () => (typeof window === "undefined" ? undefined : window.desktop);
function createComputerUsePreviewStore(desktop) {
  let latest = { sessionId: undefined, active: false };
  const listeners = new Set();
  let off = null;
  const listen = () => {
    if (off || typeof desktop.onEvent !== "function") return;
    off = desktop.onEvent((event) => {
      if (event?.kind !== "computer-use-preview" || typeof event.sessionId !== "string") return;
      latest = event.active
        ? { sessionId: event.sessionId, active: true, mode: event.mode === "display" ? "display" : "app", targetLabel: event.targetLabel, frame: event.frame }
        : { sessionId: event.sessionId, active: false };
      for (const listener of [...listeners]) listener(latest);
    }) ?? null;
  };
  return Object.freeze({
    getState: () => Promise.resolve(latest),
    onStateChange(listener) {
      listeners.add(listener);
      listen();
      return () => {
        listeners.delete(listener);
        if (!listeners.size && off) { off(); off = null; }
      };
    },
  });
}
export function createComputerUseLivePreview(desktop = desktopOf()) {
  if (typeof desktop?.call !== "function") return undefined;
  return Object.freeze({
    computerUsePreviewStore: createComputerUsePreviewStore(desktop),
    setSubscribed(sessionId, on) {
      if (typeof sessionId === "string" && sessionId) Promise.resolve(desktop.call("computer-use:preview", { sessionId, on: on === true })).catch(() => {});
    },
    setFps() {},
  });
}
export const ComputerUseLivePreview = createComputerUseLivePreview();

// --- The sections' props (AT's derivation over this host's items) ---------------------------------------------------
// shared-78 iB / CR (the panel's server identities): an mcp_tool event of server uuid "claude-in-chrome" is Claude in
// Chrome, of "computer-use" is computer use. This host's engines report both as calls on its own server (code_desktop,
// electron/agent-tools-host.cjs): the chrome_ tools (agent-tools/browser.mjs) are Claude in Chrome, the computer-use
// tools (electron/computer-use/actions.mjs: computerUseAction) are computer use.
export const CHROME_SERVER = "claude-in-chrome";
export const COMPUTER_USE_SERVER = "computer-use";
// shared-78 bR: the gate AT reads as Vn for the computer-use card (`Vn && bb`); GrowthBook, decided by the panel.
export const COMPUTER_USE_CARD_GATE = "cowork_computer_use_side_panel_card";

const str = (value) => (typeof value === "string" ? value : "");
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const chromeCall = (item) => { const call = appToolCall(item); return call && call.tool.startsWith("chrome_") ? call : null; };
// An mcp_tool event has its mcpToolResult once the call finished (completed or failed).
const finished = (item) => item?.status === "completed" || item?.status === "failed" || item?.status === "declined";
// The Claude in Chrome tool names: this host's chrome_ tools are the extension's tools with a prefix (navigate, read_page,
// find, form_input, computer, javascript_tool, tabs_create_mcp, tabs_context_mcp; chrome_browser_batch is browser_batch,
// whose steps take either name), so Dd (shared-130 WK) and db's navigate / lb batch tests read them as the extension's.
const extensionTool = (name) => str(name).replace(/^chrome_/, "");
// w13-close-cowork-ui (coworkui-panel-live-02): a finished call's result in the shape AT's events carry (the tool result
// block: `content` blocks, an image as `{ type: "image", source: { type: "base64", data, media_type } }`), which the
// generated sb / ob reads (c82b159c8 o: the first image block; i: a data URL of image/jpeg|png|gif|webp). The host's
// result images are toolOutputImages' data URLs (an MCP image part, a dynamic tool's inputImage).
const DATA_IMAGE = /^data:([^;,]+);base64,(.+)$/;
function officialToolResult(item) {
  const images = toolOutputImages(item).map((url) => DATA_IMAGE.exec(url)).filter(Boolean)
    .map(([, mediaType, data]) => ({ type: "image", source: { type: "base64", data, media_type: mediaType } }));
  return { content: images, ...(item?.status === "failed" && { is_error: true }) };
}

/**
 * AT's resource activity W for a session's items (w13-close-rail-regen, coworkui-panel-live-02): one official mcp_tool
 * event `{ id, operation: "mcp_tool", mcpServerUuid, mcpToolName, mcpToolInput, mcpToolResult }` per Claude in Chrome
 * call and per computer-use call (every tool on the computer-use server counts, request_access / release included, as
 * AT's `Jr({ uuid: i.mcpServerUuid })` does); mcpToolResult is present once the call finished. `item` keeps the host
 * item for the screenshot readers.
 */
export function coworkLiveResourceActivity(items) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const chrome = chromeCall(item);
    const result = finished(item) ? officialToolResult(item) : undefined;
    if (chrome) {
      const args = record(chrome.args) ? chrome.args : {};
      const input = chrome.tool === "chrome_browser_batch" && Array.isArray(args.actions)
        ? { ...args, actions: args.actions.map((step) => (record(step) ? { ...step, name: extensionTool(step.name) } : step)) } : args;
      out.push({ id: item.id, operation: "mcp_tool", mcpServerUuid: CHROME_SERVER, mcpToolName: extensionTool(chrome.tool), mcpToolInput: input, mcpToolResult: result, item });
      continue;
    }
    const action = computerUseAction(item);
    if (action) out.push({ id: item.id, operation: "mcp_tool", mcpServerUuid: COMPUTER_USE_SERVER, mcpToolName: action.kind,
      mcpToolInput: record(item.arguments) ? item.arguments : {}, mcpToolResult: result, item });
  }
  return out;
}

/**
 * The live sections' activity for a session's items (AT :12110-12144 over its resource activity W):
 *   resourceActivity (W, coworkLiveResourceActivity) — the panel passes it to the generated useCoworkBrowserActivityText
 *     (c21f11e6d db: latestActionText through Dd = shared-130 WK, currentDomain through ub and the lb batch names);
 *   hasBrowserActivity / isBrowserToolPending / newestBrowserActivityId (the newest finished Chrome call),
 *   hasComputerUseActivity / isComputerUseToolPending / newestComputerUseActivityId (the newest computer-use call),
 *   computerUseScreenshotSrc (_b: the last step's screenshot). The Claude in Chrome screenshot is the generated sb
 *   (useCoworkBrowserScreenshot over resourceActivity, w13-close-cowork-ui), which the panel passes as browserScreenshot.
 */
export function coworkLiveActivity(items) {
  const resourceActivity = coworkLiveResourceActivity(items);
  const browser = { any: false, pending: false }, computer = { any: false, pending: false };
  let newestBrowserActivityId, newestComputerUseActivityId, computerUseScreenshotSrc;
  for (const event of resourceActivity) {
    let bucket;
    if (event.mcpServerUuid === CHROME_SERVER) {
      bucket = browser;
      if (event.mcpToolResult) newestBrowserActivityId = event.id;
    } else {
      bucket = computer;
      newestComputerUseActivityId = event.id;
      computerUseScreenshotSrc = computerUseScreenshot(event.item) ?? computerUseScreenshotSrc;
    }
    bucket.any = true;
    if (!event.mcpToolResult) bucket.pending = true;
  }
  return {
    resourceActivity,
    hasBrowserActivity: browser.any, isBrowserToolPending: browser.pending, newestBrowserActivityId,
    hasComputerUseActivity: computer.any, isComputerUseToolPending: computer.pending, newestComputerUseActivityId,
    computerUseScreenshotSrc,
  };
}

/**
 * The props AT gives hb and bb (readable c21f11e6d :12938-12968), for a session (`sessionId`, the official
 * conversationUuid q) whose turn is running (`isSessionActive`, Wr). `browserText` is db's `{ latestActionText,
 * currentDomain }` (the generated useCoworkBrowserActivityText over activity.resourceActivity). `computerUseSessionId` is
 * AT's D (the desktop session the computer-use preview belongs to): every session here is a local desktop session, so it
 * defaults to sessionId; bb gets `previewSessionId: D ?? q` and `activityKey: D === void 0 ? void 0 : (Ur ?? "")`.
 * The running flags (Gr / qr) go through the generated useCoworkToolRunning (pb) in the panel:
 * `pb(isBrowserToolPending, isSessionActive, sessionId)`.
 */
export function coworkLiveSectionProps(activity, { sessionId, isSessionActive = false, collapsible, panelShown, browserText, browserScreenshot, computerUseSessionId = sessionId } = {}) {
  return {
    browser: {
      hasBrowserActivity: activity.hasBrowserActivity, screenshotSrc: browserScreenshot, latestActionText: browserText?.latestActionText,
      newestActivityId: activity.newestBrowserActivityId, currentDomain: browserText?.currentDomain, conversationUuid: sessionId,
      isSessionActive, collapsible: collapsible ?? !!sessionId, panelShown,
    },
    computerUse: {
      hasComputerUseActivity: activity.hasComputerUseActivity, screenshotSrc: activity.computerUseScreenshotSrc, previewSessionId: computerUseSessionId ?? sessionId,
      activityKey: computerUseSessionId === undefined ? undefined : (activity.newestComputerUseActivityId ?? ""), isSessionActive,
      collapsible: collapsible ?? !!sessionId, panelShown,
    },
  };
}
