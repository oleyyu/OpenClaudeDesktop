// Local services for the original 3.6556.2 Code transcript renderer that scripts/extract-code-transcript.mjs emits
// (generated/code-transcript: c96d752d0 R3 CodeTranscriptRenderer, its parts f8e / X7e / y8e, e7e / l3 rows, the live
// text store LSe / S2e, and the originals they reach). Each export replaces one import (or one declaration) of the
// originals, feature-checked by the extractor. This module must not import generated/code-transcript.
//
// The transcript rows' services are the same ones (one host adapter each, re-exported from
// source-transcript-rows-adapters.jsx: intl, GrowthBook, the request store, the tool scope, the transcript view, …).
// The rest are services of the desktop this host does not have (E59: no claude.ai account, no API, no telemetry), each
// answering the original's own "nothing" branch:
//
//   useApiFetcher / useApiFetch / useApiGetter / fetchAsDocumentAccount
//                          shared-0 y3 / _3 / Q3 / a1: the claude.ai API fetchers. Nothing is fetched: they reject.
//   useApiQueryOptions     shared-0 q3: the API query options, disabled (react-query never runs the fetcher).
//   useApiMutation / useAccountQuery / useApiInfiniteQuery
//                          shared-0 z3 / d6 / e6: an idle mutation, an idle account read, an empty paged query.
//   useBootstrap           shared-25 kB: the claude.ai bootstrap (account, org flags): no data.
//   sessionBucketsStore    c06cf64bb iD (Et): the desktop's session engine store — no bucket for any session (the
//                          host's sessions reach the renderer as entries, src/code-transcript-entries.mjs).
//   usePaneStore / usePaneStoreContext
//                          c03935b01 Q / fu: the session pane store; the host lays out its own panes: the original's
//                          fallback outside a pane host (an empty pane state).
//   useOpenTaskInPane      c227f4d5e mQ: the Background tasks pane opener, the host's (TaskPaneOpenerContext).
//   useMcpAppToolMatcher   cef1e6037 dt: the session's MCP App tool matcher, the host's (McpAppToolMatcherContext).
//   desktopInfo            shared-25 Ki: the DesktopInfo preload, getSystemInfo over the host's facts (setDesktopSystemInfo).
//   reportHandledError / recordHealthMetric / probeFrameRate / startNavigationTiming / releaseNavigationTiming
//                          telemetry (D17): nothing is reported or measured.
//   the lazy feature chunks (turn outcome classifier, stacked meter readout, emoji table, public suffix list, project
//   skill menu, code session menu, sidebar actions, emoji field, read-aloud engine, connector suggestion, image preview
//   modal): the host serves none of them, so each answers its loader's failure / empty branch.
import React from "react";
export * from "./source-transcript-rows-adapters.jsx";
// W14-code r4 ct-feed: the feed slices' host side (the Workflow tool row F$, the workflow card N$).
export * from "./source-code-feed-adapters.jsx";

const never = () => new Promise(() => {});
const unavailable = (what) => () => Promise.reject(Object.assign(new Error(`${what} is not available in OpenClaude Desktop`), { name: "Unavailable" }));

// ---- shared-0: the claude.ai API client.
export function useApiFetcher() { return unavailable("The claude.ai API"); }
export function useApiFetch() { return unavailable("The claude.ai API"); }
export function useApiGetter() { return unavailable("The claude.ai API"); }
export const fetchAsDocumentAccount = unavailable("The claude.ai API");
// q3 (url, options, params) → react-query options: the same query key, never enabled.
export function useApiQueryOptions(url, options, params) {
  const { queryKey, body, forceExplicitCache, additionalPermittedStatusCode, responseType, headers, custom3pCompatible, method, timeoutMs,
    rawFetchOverride, redactResponseBodyInReports, yieldToPaint, oneReadAtATime, strongReadWhenInvalidated, ...rest } = options ?? {};
  return { ...rest, queryKey: queryKey ?? (body === undefined ? [url, params] : [url, body, params]), queryFn: never, enabled: false };
}
const IDLE_QUERY = Object.freeze({ data: undefined, error: null, status: "pending", fetchStatus: "idle", isPending: true, isLoading: false,
  isFetching: false, isSuccess: false, isError: false, isFetched: false, isPlaceholderData: false, refetch: async () => IDLE_QUERY });
const IDLE_INFINITE = Object.freeze({ ...IDLE_QUERY, hasNextPage: false, hasPreviousPage: false, isFetchingNextPage: false,
  isFetchingPreviousPage: false, fetchNextPage: async () => IDLE_INFINITE, fetchPreviousPage: async () => IDLE_INFINITE });
const IDLE_MUTATION = Object.freeze({ data: undefined, error: null, status: "idle", isIdle: true, isPending: false, isSuccess: false, isError: false,
  variables: undefined, mutate() {}, mutateAsync: unavailable("The claude.ai API"), reset() {} });
export function useApiMutation() { return IDLE_MUTATION; }
export function useAccountQuery() { return IDLE_QUERY; }
export function useApiInfiniteQuery() { return IDLE_INFINITE; }

// ---- shared-25 kB: the claude.ai bootstrap.
export function useBootstrap() { return IDLE_QUERY; }

// ---- c06cf64bb iD (Et): the session engine store, read as `Et.getState().buckets[id]` and as a selector hook.
const noop = () => {};
const NO_BUCKETS = Object.freeze({ buckets: Object.freeze({}), retryGapFills: noop, beginPendingTurn: noop, clearError: noop,
  clearPendingTurn: noop, dropFailedSendEcho: noop, dropQueuedMessage: noop, echoPending: noop, failPendingTurn: noop,
  hasEchoedUuid: () => false, markCompacting: noop, noteQueuedSend: noop, openUserEnterWindow: noop, recordRejectedPrompt: noop, wakeSession: noop });
export function sessionBucketsStore(selector) { return typeof selector === "function" ? selector(NO_BUCKETS) : NO_BUCKETS; }
sessionBucketsStore.getState = () => NO_BUCKETS;
sessionBucketsStore.getInitialState = () => NO_BUCKETS;
sessionBucketsStore.setState = noop;
sessionBucketsStore.subscribe = () => noop;

// ---- c03935b01 Q / fu: the session pane store (outside a pane host).
const NO_PANE_STATE = Object.freeze({ mcpAppView: undefined, tileLayout: undefined, expandedTile: null, currentSessionId: undefined, hasSidePanes: false });
export function usePaneStore(selector) { return typeof selector === "function" ? selector(NO_PANE_STATE) : NO_PANE_STATE; }
export function usePaneStoreContext() { return null; }

// ---- shared-52 _z (W14-code r7 R7T-02): the desktop's link opener `({href, features, webBehavior, desktopBehavior})`,
// called by c96d752d0 DA's "Open in {browser}" (`oi({href: e, features: "noopener,noreferrer"})`). The desktop opens
// the URL in the system browser (`window.open(vz(e), "_blank", t)`, which its shell routes out); OpenClaude Desktop's
// windows deny window.open, so the URL goes to the host's "external" call (http / https / mailto / tel), as the host's
// message menu opened a link. "navigate" keeps the original's in-window navigation.
export function openDesktopHref({ href, desktopBehavior = "open-in-browser" } = {}) {
  if (typeof window === "undefined" || typeof href !== "string" || href === "") return null;
  if (desktopBehavior === "navigate") {
    window.location.href = href;
    return window;
  }
  const call = window.desktop?.call;
  if (typeof call === "function") void Promise.resolve(call("external", { url: href })).catch(() => {});
  return null;
}

// ---- c227f4d5e mQ (W14-code r2 R2T-11): the Background tasks pane opener a task chip / task row calls (dX's onClick,
// R3's onOpenTask): `{taskId, agent, finished}` → the host's pane opener (SourceCodeTranscript host.openTask), or null
// (dX then draws its plain div) when the host offers none, as mQ answers null without side panes.
export const TaskPaneOpenerContext = React.createContext(null);
export function useOpenTaskInPane() { return React.useContext(TaskPaneOpenerContext); }

// ---- cef1e6037 dt (W14-code r3 R3T-REG-01): the session's MCP App tool matcher c96d752d0 o9e reads (`u = dp(l,
// t.sessionRef?.id)`: the tool names of the entries whose server serves a ui:// resource, over the desktop's app
// features and its per-session MCP server store) and hands the renderer's rows as `isMcpAppTool` (K1e's `o && i?.(name)`
// → lY, the MCP App card). The host's matcher is its own (source-mcp-app.jsx useMcpAppTranscript over the session's MCP
// server state), provided by the Code transcript (SourceCodeTranscript host.isMcpAppTool); without one no tool is an App.
export const McpAppToolMatcherContext = React.createContext(null);
const NO_MCP_APP_TOOL = () => false;
export function useMcpAppToolMatcher() { return React.useContext(McpAppToolMatcherContext) ?? NO_MCP_APP_TOOL; }

// ---- shared-25 Ki (W14-code r5 R5T-01): globalThis["claude.settings"].DesktopInfo, the preload the Session info card's
// Desktop app row reads (shared-26 LD: `fe?.getSystemInfo && fe.getSystemInfo().then(…)`, once per window). The host's
// answer is its app version and boot host facts (code-session-info-model desktopSystemInfo), set by main.jsx once known;
// getSystemInfo waits for them. No getDefaultBrowserName (c8ae173c6 reads it with `?.`: nothing).
let desktopSystem = null;
const desktopSystemWaiters = [];
export function setDesktopSystemInfo(info) {
  if (!info || desktopSystem) return;
  desktopSystem = Object.freeze({ ...info });
  for (const resolve of desktopSystemWaiters.splice(0)) resolve(desktopSystem);
}
export const desktopInfo = Object.freeze({
  getSystemInfo: () => (desktopSystem ? Promise.resolve(desktopSystem) : new Promise((resolve) => desktopSystemWaiters.push(resolve))),
});

// ---- telemetry (D17).
export function reportHandledError() {}
export function recordHealthMetric() {}
export function probeFrameRate() {}
export function startNavigationTiming() {}
export function releaseNavigationTiming() {}

// ---- lazy feature chunks the host does not serve.
export const loadTurnOutcomeClassifier = () => Promise.resolve(null);
export const loadStackedMeterReadout = () => Promise.resolve({ default: () => null });
export const loadEmojiTable = () => Promise.resolve([]);
export const loadPublicSuffixList = () => Promise.resolve();
const lazyEntry = (id, tier, extra = {}) => Object.freeze({ id, tier, ...extra, load: never });
export const CODE_SIDEBAR_ACTIONS_ENTRY = lazyEntry("code_sidebar_actions", "T1", { priority: 35 });
export const READ_ALOUD_ENGINE_ENTRY = lazyEntry("read_aloud_engine", "T2");
export const CONNECTOR_SUGGESTION_ENTRY = lazyEntry("tool_cell_connector_suggestion", "T1", { when: () => false });
// W14-code r2 R2T-07: DI's lazy pieces. The reaction picker body (c96d752d0 Kk): its loader's failure branch. The
// seeded-summon parser entry (cb231ff8d c, a shared-104 co handle read by shared-156 SK and cb231ff8d d): a failed
// handle, so SK answers "failed" and d answers `{status: "unparsed"}`.
export const loadEmojiPickerBody = () => Promise.resolve(null);
// W14-code r4 ct-feed R4T-09: c4a9ee384 Kp (chat_tab_entry_landing): not served, its failure branch.
export const loadTabEntryLanding = () => Promise.resolve(null);
export const SEEDED_SUMMON_PARSER_ENTRY = Object.freeze({ id: "epitaxy_seeded_summon_parser", tier: "T3", state: "failed", source: "none",
  resident: false, pending: false, module: null, lastOutcome: "failed", preload: () => false, onSettled: () => noop, load: never });
// W14-code r2 R2T-TS8: cb6930dae's lazy pieces of the sent files' block (Xu): "As Claude sent it" (the sent copy dialog's
// body, `ga`, for a file the desktop uploaded: file_uuid, never here) and the file save controls (`ba`). Not served: the
// sent copy body draws nothing and its handle never loads (t3 only preloads it); the save controls draw nothing.
export function CodeSessionSentCopyBody() { return null; }
CodeSessionSentCopyBody.handle = Object.freeze({ id: "code_session_sent_copy", tier: "T2", state: "failed", source: "none", resident: false,
  pending: false, module: null, lastOutcome: "failed", preload: () => false, onSettled: () => noop, load: never });
export function CodeSessionFileSaveControls() { return null; }
export function ProjectSkillFileMenuControls() { return null; }
export function CodeSessionMenuItems() { return null; }
export function EmojiShortcodeFieldEnhancer() { return null; }
// W14-code r6 R6T-02: no ImagePreviewModal stand-in — shared-10 jT is the original lazy handle (`jT.Component`), loading
// the sliced cb1b78cfa dialog (generated/code-transcript/cb1b78cfa-VqsYNxqp.js).
void React;
// ---- vendor-markdown T: decode-named-character-reference (chat-renderer's adapter, the npm package).
export { decodeNamedCharacterReference } from "./source-chat-renderer-adapters.jsx";
// ---- vendor-growthbook Ht: no GrowthBook client here (flags: host-growthbook.mjs through the flag hooks).
export function useGrowthBookClient() { return null; }
// ---- shared-25 Ho: a feature evaluation `{ on, off, value, source }` from the host's flag table (host-growthbook.mjs).
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
// ---- shared-0 Ko: a feature read outside render, from the same table (W14-code r2 gates-r2-01).
export function readGrowthBookFlag(key) { return hostGrowthBookFlag(key); }
export function evaluateHostFeature(_context, key) {
  const on = hostGrowthBookFlag(key);
  return on ? { on: true, off: false, value: true, source: "force" } : { on: false, off: true, value: null, source: "unknownFeature" };
}
// ---- shared-25 Z: the CurrentAccountProvider value with no claude.ai account (E59).
const NO_ACCOUNT = Object.freeze({ account: undefined, activeOrganization: undefined, isLoading: false });
export function useCurrentAccount() { return NO_ACCOUNT; }
// ---- shared-10 qy / By: mermaid and its preflight are not served (the fence's failure state).
export const loadMermaid = unavailable("Mermaid");
export const loadMermaidPreflight = () => Promise.resolve(undefined);
// ---- vendor-router Ar / Kn: no router here — the app root's location; a navigation goes nowhere.
const ROOT_LOCATION = Object.freeze({ pathname: "/", search: Object.freeze({}), searchStr: "", hash: "", href: "/", state: Object.freeze({}) });
const ROUTER_STATE = Object.freeze({ location: ROOT_LOCATION, resolvedLocation: ROOT_LOCATION, matches: Object.freeze([]), status: "idle", isLoading: false });
export function useRouterState(options) { return typeof options?.select === "function" ? options.select(ROUTER_STATE) : ROUTER_STATE; }
export function useNavigate() { return noop; }
// ---- shared-0 AQ: the boot configuration of the claude.ai app the desktop hosts (applicationType "claude-dot").
const APP_CONFIGURATION = Object.freeze({ applicationType: "claude-dot" });
export function useAppConfiguration() { return APP_CONFIGURATION; }

// c96d752d0 kI → DI (the user entry rows of `code.user.bash` / `code.user.event` / …, o2) is sliced in this area since
// W14-code r2 R2T-07 (scripts/extract-code-transcript.mjs): the user's own `!` command is DI's `ii === "bash"` branch
// itself (c19e90103 Dg), no host stand-in.

// c26fb8b6b xn (useOpenLinkedSession): `(event, {id, type, isSsh, title}) => …` opens a linked session (the fork rows'
// titles, a session chip). The host opens its sessions itself: CodeTranscriptSessionLinks carries its navigation
// (W14-code transcript-rest TM-1; source-code-transcript.jsx provides it). No provider: nothing opens.
export const CodeTranscriptSessionLinks = React.createContext(null);
export function useOpenLinkedSession() {
  const open = React.useContext(CodeTranscriptSessionLinks);
  return React.useCallback((event, ref) => { if (typeof open === "function" && ref?.id) open(ref.id, event ?? null); }, [open]);
}
