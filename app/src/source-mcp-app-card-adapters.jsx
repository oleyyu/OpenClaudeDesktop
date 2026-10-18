// Host services for the generated MCP App / Visualize widget card (src/generated/mcp-app-card,
// scripts/extract-mcp-app-card.mjs, R4g-mcp MA-6). Each export answers one import (or one cut declaration) of the
// 2.42304.0 originals; the extractor pins the original declaration it replaces (chunk, export alias, local name and text
// features), so a changed original fails generation instead of silently binding this module.
//
// What the host feeds (the transcript mount, MA-7, owns the calls):
//   mcpAppCardHost.setSessionServers(sessionId, servers)  the session's MCP servers that can draw widgets: the built-in
//       visualize server and the session's own servers, each {uuid, name, type:"local", isBuiltIn?, url?,
//       sessionOwned?, normalizedServerSegment?, tools:[{name, _meta, …}], capabilities?} (MA-4 mcp-app:servers).
//   mcpAppCardHost.setToolApprovals(requestsBySession)     the pending tool permission requests,
//       {[sessionId]: {[requestId]: {status:"pending", toolName}}} (kQe waits while one matches the call).
//   mcpAppCardHost.setClientFactory(factory)               ({sessionId, server}) => MCP client, defaults to the bridge
//       client below (MA-4 mcp-app:* actions).
//   <McpAppToolRowFallback.Provider value={renderRow}>     the plain row kQe draws when no `fallback` is passed.
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useMcpAppIntl } from './source-mcp-app-host-adapters.jsx';
import { toolUiResourceUri } from './generated/mcp-app-host/sandbox-frame.mjs';
import { lf as mcpServerSegment } from './generated/mcp-app-card/tool-names.mjs';
import { downloadBlob } from './generated/mcp-app-card/file-save.mjs';
import { useOwnerWindow } from './generated/mcp-app-card/shared-frame.mjs';

// ---- a small external store (the originals read zustand stores through hooks and getState)
function createHostStore(initial) {
  let state = initial;
  const listeners = new Set();
  const store = selector => useSyncExternalStore(store.subscribe, () => selector(state), () => selector(state));
  store.getState = () => state;
  store.setState = next => { state = typeof next === 'function' ? next(state) : next; for (const listener of listeners) listener(); };
  store.subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  return store;
}
const EMPTY_SERVERS = Object.freeze([]);
const NO_REMOTE_SERVERS = Object.freeze({});
const sessionStates = createHostStore(new Map());
let clientFactory = null;
const clients = new Map();

export const mcpAppCardHost = {
  /** The session's widget-capable MCP servers (built-in visualize and the session's own servers). */
  setSessionServers(sessionId, servers) {
    if (typeof sessionId !== 'string' || !sessionId) return;
    sessionStates.setState(prev => {
      const next = new Map(prev);
      next.set(sessionId, Object.freeze({ sessionId, servers: Object.freeze([...(servers ?? [])]), remoteServers: NO_REMOTE_SERVERS }));
      return next;
    });
    for (const key of [...clients.keys()]) if (key.startsWith(`${sessionId}\0`)) clients.delete(key);
  },
  /** Pending tool permission requests by session ({[requestId]: {status, toolName}}). */
  setToolApprovals(requestsBySession) { toolApprovalStore.setState(state => ({ ...state, requestsBySession: { ...(requestsBySession ?? {}) } })); },
  /** ({sessionId, server}) => client; null restores the bridge client. */
  setClientFactory(factory) { clientFactory = typeof factory === 'function' ? factory : null; clients.clear(); },
  /** Tests: forget every session, request, client and remembered row. */
  reset() {
    sessionStates.setState(new Map());
    toolApprovalStore.setState({ requestsBySession: {} });
    clientFactory = null;
    clients.clear();
    rowExpansion.setState(new Map());
  },
};

// ---- shared-78
// oH (Ko): the renderer's epitaxyMcpApps switch. The main process answers it statically supported (gW
// epitaxyMcpApps:fW) and D35 turns MCP Apps on in the host.
export function useMcpAppsEnabled() { return true; }
// bJ (gr): whether the page is the Claude Code route; it only names the telemetry surface. The card lives in Code.
export function useInCodeRoute() { return true; }
// sH (Go): epitaxyMcpAppPane (main process GrowthBook 513873720). The host keeps the side pane off (D29/D31), so PQe's
// ze is null: inline only, no "Showing in another pane" / "Show here".
export function useMcpAppPaneSupported() { return false; }
// Wk (Kp): prefersBorder of a resource already in shared-78's cache Vk. MA-5's sandbox-frame keeps Vk without exporting
// it, so the card starts from undefined and takes the value from onresourcemeta once the resource is read, as the
// original does for an uncached resource.
export function cachedResourceMeta() { return undefined; }

// ---- shared-0
// zJ (Rt): the configuration context; the card reads mcpAppsSandboxProxyUrl, officially the remote
// https://sandbox.claudemcpcontent.com/mcp_apps (shared-23). The host's proxy page is the local oc-mcp-sandbox: scheme
// (MA-3, X1 G1); AppRenderer swaps the host label for the conversation hash (MA-5 withConversationOrigin), giving
// oc-mcp-sandbox://<32 hex>/mcp_apps.
export const MCP_APP_SANDBOX_PROXY_URL = 'oc-mcp-sandbox://sandbox/mcp_apps';
const HOST_CONFIGURATION = Object.freeze({ mcpAppsSandboxProxyUrl: MCP_APP_SANDBOX_PROXY_URL });
export function useHostConfiguration() { return HOST_CONFIGURATION; }

// ---- shared-11 X (Wn): the tool permission request store. Fed by mcpAppCardHost.setToolApprovals.
export const toolApprovalStore = createHostStore({ requestsBySession: {} });

// ---- cef1e6037 / shared-156 / shared-1: the session's MCP servers, tools and clients
// Vt (P): the session's MCP server state, read by the matchers below. Here: the servers the host fed for the session.
export function useSessionMcpState(sessionId) {
  return sessionStates(states => states.get(sessionId ?? '') ?? EMPTY_SESSION);
}
const EMPTY_SESSION = Object.freeze({ sessionId: undefined, servers: EMPTY_SERVERS, remoteServers: NO_REMOTE_SERVERS });
const segmentOf = server => server.normalizedServerSegment ?? mcpServerSegment(server.name);
// $b (Dd): the server and tool of an MCP tool name (mcp__<server segment>__<tool>), or undefined.
export function matchSessionMcpTool(name, state) {
  if (typeof name !== 'string' || !state?.servers) return undefined;
  for (const server of state.servers) {
    const segment = segmentOf(server);
    const prefix = `mcp__${segment}__`;
    if (!name.startsWith(prefix)) continue;
    const toolName = name.slice(prefix.length);
    const tool = server.tools?.find(entry => entry?.name === toolName);
    return {
      server: { type: server.type ?? 'local', name: server.name, uuid: server.uuid, isBuiltIn: server.isBuiltIn === true, url: server.url },
      tool, normalizedServerSegment: segment, toolsEnumerated: Array.isArray(server.tools),
    };
  }
  return undefined;
}
// dP (ni): {toolName, serverUuid} when the matched tool has a ui:// resource (MA-5 vC), else undefined.
export function findMcpAppToolServer(name, state) {
  const match = matchSessionMcpTool(name, state);
  let uri;
  try { uri = match?.tool ? toolUiResourceUri({ _meta: match.tool._meta }) : undefined; } catch { return undefined; }
  return typeof uri === 'string' && match?.server?.uuid ? { toolName: name, serverUuid: match.server.uuid } : undefined;
}
// Vb (tf): whether the server belongs to the session itself (the official Claude Code CLI servers). Here: the
// session's core servers (sessionOwned), not the host's built-in visualize server.
export function isSessionOwnedServer(state, uuid) {
  return state?.servers?.some(server => server.uuid === uuid && server.sessionOwned === true) === true;
}
// Bt (I): the CLI servers of a session (findServerTool, gated off by __gb__585138862).
export function useSessionCliMcpServers() { return undefined; }
// Ot (F): {held, sshHost}: whether an SSH session's bridge holds the server. The host has no SSH sessions (D37).
const NOT_HELD = Object.freeze({ held: false, sshHost: undefined });
export function useSshServerHold() { return NOT_HELD; }
// kt (j): whether a claude.ai connector's rows come from this client. The host has no claude.ai connectors (D17).
export function useConnectorRowsHere() { return true; }
// Ft (L): the proxied copy of a connector call that ran elsewhere (claude.ai connectors only, D17).
export function useProxiedConnectorCall() { return undefined; }
// yt (k): whether the CLI bridge holds the session. The host has no CLI bridge sessions.
export function isBridgeHeldSession() { return false; }
// _t (M): the session's local MCP client for a server segment.
export function useSessionMcpClient({ sessionId, serverSegment, sessionOwned = false }) {
  const state = useSessionMcpState(sessionId);
  return useMemo(() => {
    if (!sessionId || !serverSegment) return null;
    const server = state.servers.find(entry => segmentOf(entry) === serverSegment);
    if (!server) return null;
    const key = `${sessionId}\0${serverSegment}\0${sessionOwned ? 1 : 0}`;
    if (!clients.has(key)) clients.set(key, (clientFactory ?? createBridgeMcpAppClient)({ sessionId, server, sessionOwned }));
    return clients.get(key) ?? null;
  }, [state, sessionId, serverSegment, sessionOwned]);
}
// X (op): the desktop MCP client store ({localClients, remoteClients}). The host keeps clients per session above.
const NO_CLIENTS = Object.freeze({ localClients: Object.freeze({}), remoteClients: Object.freeze({}) });
export function mcpClientsStore(selector) { return selector(NO_CLIENTS); }
mcpClientsStore.getState = () => NO_CLIENTS;
// Ky (Td): connect a remote server. Only remote servers reach it; the host has none.
export function connectRemoteMcpServer() { return Promise.reject(Error('The host has no remote MCP servers.')); }
// Cb (Hd): whether a connector tool belongs to a first-party server (remote servers only).
export function isConnectorToolOfServer() { throw Error('isConnectorToolOfServer is read for remote MCP servers only; the host has none.'); }
// Jg (Sp): the remote server client class; the card only asks `client instanceof Jg` (sign-in parking).
export class RemoteMcpClient { constructor() { throw Error('The host has no remote MCP clients.'); } }

/** The bridge client: MCP requests of the widget go to the main process (MA-4 `mcp-app:*` desktop actions). */
export function createBridgeMcpAppClient({ sessionId, server }) {
  const call = globalThis.window?.desktop?.call;
  if (typeof call !== 'function') return null;
  const target = { sessionId, server: server.name, serverUuid: server.uuid };
  const capabilities = server.capabilities ?? { resources: {} };
  const readResource = params => call('mcp-app:read-resource', { ...target, uri: params?.uri });
  return {
    getServerCapabilities: () => capabilities,
    readResource,
    listTools: async () => ({ tools: server.tools ?? [] }),
    setNotificationHandler() {},
    async request({ method, params }) {
      if (method === 'resources/read') return readResource(params);
      if (method === 'resources/list') return call('mcp-app:list-resources', { ...target, cursor: params?.cursor });
      if (method === 'tools/call') return call('mcp-app:call-tool', { ...target, name: params?.name, arguments: params?.arguments ?? {}, _meta: params?._meta });
      throw Error(`Method not found: ${method}`);
    },
  };
}

// ---- cc6e9624e h (u): a transcript row's remembered open state ([value, setter]) for "mcpApp:<id>" and
// "mcpAppFull:<id>". Kept for the window's lifetime, as the official row store is for the page's.
const rowExpansion = createHostStore(new Map());
export function useTranscriptRowExpanded(key) {
  const value = rowExpansion(rows => rows.get(key));
  const set = useCallback(next => rowExpansion.setState(rows => new Map(rows).set(key, next)), [key]);
  return [value, set];
}

// ---- shared-104 Fo (fh) / shared-156 dB (Ir) / shared-10 Hr, zr / preload-helper s: the lazy chunk machinery.
// The official loader tiers and preloads chunks and reports its outcomes; the host keeps its contract: a handle with
// state / resident / preload / warm / enqueueIdle, a Component that renders nothing until the module is resident
// (ssr:false, loading "placeholder-would-mislead") and nothing when it failed (onChunkError "fail-open"), and the load
// state kQe reads ("resident" / "failed" / "pending").
export function defineLazyChunk({ entry, pick, options }) {
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const handle = {
    id: entry.id, ssr: options?.ssr !== false, state: 'idle', resident: false, pending: false, lastOutcome: undefined, error: undefined, module: undefined,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    preload: () => { start(); return true; },
    warm: () => { start(); },
    enqueueIdle: () => { setTimeout(start, 0); },
  };
  function start() {
    if (handle.pending || handle.resident) return;
    handle.pending = true; handle.state = 'loading'; notify();
    Promise.resolve().then(() => entry.load()).then(module => {
      handle.module = pick ? pick(module) : module;
      handle.resident = true; handle.pending = false; handle.state = 'loaded'; handle.lastOutcome = 'loaded'; notify();
    }, error => {
      handle.error = error; handle.pending = false; handle.state = 'failed'; handle.lastOutcome = 'failed'; notify();
    });
  }
  const residentComponent = () => (handle.resident ? handle.module : null);
  function Component(props) {
    const Loaded = useSyncExternalStore(handle.subscribe, residentComponent, () => (handle.ssr ? residentComponent() : null));
    useEffect(() => { if (!handle.resident) start(); }, []);
    return Loaded ? createElement(Loaded, props) : null;
  }
  return { Component, handle };
}
export function useLazyChunkState(handle, wanted) {
  const read = () => (!wanted ? 'pending' : handle.resident ? 'resident' : handle.state === 'failed' ? 'failed' : 'pending');
  const state = useSyncExternalStore(handle.subscribe, read, () => 'pending');
  useEffect(() => { if (wanted && handle.state === 'idle') handle.preload('open'); }, [handle, wanted]);
  return state;
}
export function chunkGateAttributes() { return {}; }
export const mcpAppRecentUse = Object.freeze({ hasRecent: () => false, note() {} });
export function preloadChunk(load) { return load(); }

// ---- c68c4283d / c8e12f1a8: telemetry (D17). The host sends none; these record nothing.
export function logWidgetFallback() {}
export function logWidgetMounted() {}
export function logSidePaneToggled() {}
export function logQuestionForm() {}
export function logSidePaneOpened() {}
export function startWidgetLoadTiming() {}
export function endWidgetLoadTiming() {}
export function markWidgetHandoff() {}
export function markWidgetResultClean() {}
export function cancelWidgetLoadTiming() {}
export function markWidgetInitialized() {}
export function markWidgetLoadError() {}
// ye (t): the renderer error report (Sentry / Datadog); here the console.
export function reportRendererError(error, source) { console.error('[MCP App]', source, error); }

// ---- c06cf64bb Jv (mt): the armed time of the session's pending turn (side pane auto-open bookkeeping only).
export function pendingTurnArmedAt() { return null; }

// ---- vendor-intl q (p): react-intl useIntl over the local catalog (MA-5's adapter, the start card's catalog).
export function useIntl() { return useMcpAppIntl(); }

// ---- c26fb8b6b We (T): turnStatusRows (GrowthBook __gb__2846116625, on: host-growthbook.mjs). With it the card's row is a
// CDS TurnStatus step (c734f318c jt). Both are the working line's generated originals, so the card reads the same
// context the transcript root provides (TurnStatusRowsProvider) and draws the same TurnStatus.
export { useTurnStatusRows as useInsideStepList } from "./generated/working-line/turn-status-rows.mjs";
export { TurnStatus as StepList } from "./generated/working-line/turn-status.mjs";
function unreachable(what) { return function Unreachable() { throw Error(`${what} is not drawn in this host.`); }; }

// ---- shared-25 Zs (Th) / ec (Nh): GrowthBook reads. The host has no GrowthBook (D29/D31): every gate is off
// (cai_keen_cookie sandbox retry, __gb__3756952893 shared model context, __gb__3106245306 server header,
// __gb__2398473450 auto pane, claudeai_mcp_apps_fs_capability).
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function readGrowthBookGate(flag) { return hostGrowthBookFlag(flag); }
export function readGrowthBookFlag(flag, enabled = true) { return enabled ? hostGrowthBookFlag(flag) : false; }

// ---- c9d6d9802 s (t): the approved frame domains of a remote server (mcp_apps_frame_domains, toolcards-12:
// not-applicable-host).
const NO_FRAME_DOMAINS = Object.freeze({ source: 'none' });
export function useApprovedFrameDomains() { return NO_FRAME_DOMAINS; }

// ---- c8e12f1a8 De / ue / fe: the sign-in parking of a claude.ai connector's tools/call. PQe passes
// onCallToolAuthRequired only for a RemoteMcpClient, which the host never has (D17), so nothing is ever parked.
const NOT_PARKED = Object.freeze({ parkedToolName: null, gate: undefined, unpark() {}, cancel() {} });
export function useAppSignInParking() { return NOT_PARKED; }
export const AppSignInPrompt = unreachable('The connector sign-in prompt');
export const AppSignInOverlay = unreachable('The connector sign-in overlay');

// ---- shared-52 Ff (zp): a dynamic config value (mcp_apps_telemetry_config, the load-timing deadline; telemetry only).
const NO_CONFIG = Object.freeze({ value: undefined });
export function useDynamicConfig() { return NO_CONFIG; }

// ---- c03935b01 / c87a7a2df / cd4f82e77 / c227f4d5e / ca5db7aaf / c5da7eb42 / shared-8: the session pane store and
// the side pane. The MCP App side pane is off (useMcpAppPaneSupported), so no pane store exists: the selectors read an
// empty pane state, as the original reads its fallback store outside a pane host.
const NO_PANE_STATE = Object.freeze({ mcpAppView: undefined, tileLayout: undefined, expandedTile: null, currentSessionId: undefined, hasSidePanes: false });
export function useMainPaneHost() { return false; }
export function usePaneStoreContext() { return null; }
export function usePaneStore(selector) { return selector(NO_PANE_STATE); }
export function useSidePanePortalHost() { return null; }
export function useSidePaneAutoOpen() { return false; }
export function keepSplitForTile() {}
export function canExpandTile() { return false; }
const NO_PROMPTS = Object.freeze({ promptsBySession: Object.freeze({}) });
export function questionPromptsStore(selector) { return selector(NO_PROMPTS); }
questionPromptsStore.getState = () => NO_PROMPTS;
const NO_SESSIONS = Object.freeze({ sessions: Object.freeze([]) });
export function sessionsStore(selector) { return selector(NO_SESSIONS); }
sessionsStore.getState = () => NO_SESSIONS;

// ---- cc6e65d4b m (r): open a confirmed link in the session's preview pane when it can, else the caller's
// window.open. The host's window.open is denied (main.cjs setWindowOpenHandler), so a confirmed link goes to its
// external-link action ("external": https / http / mailto / tel).
export function useOpenConfirmedLink() {
  return useCallback(url => {
    const call = globalThis.window?.desktop?.call;
    if (typeof call !== 'function') return false;
    void Promise.resolve(call('external', { url })).catch(error => console.warn('[MCP App] open-link failed', error));
    return true;
  }, []);
}

// ---- shared-3 QN (Ss): the composer's send-text cleaner, gated by __gb__3182548365 (off: the text as written).
export function cleanSendText(text) { return { text, removedCount: 0 }; }

// ---- shared-14 L (et): the appearance settings store; the card reads chatTextSize. The host has no chat text size
// preference, so it answers the official default "m".
const APPEARANCE = Object.freeze({ chatTextSize: 'm' });
export function appearanceSettingsStore(selector) { return selector(APPEARANCE); }
appearanceSettingsStore.getState = () => APPEARANCE;

// ---- c8748971a f (t): the resolved font stack of a theme token. Here the computed value of the host's own token on the
// document root (the loaded official CSS defines --font-sans / --font-mono); without one the card leaves the widget's
// own stack (JZe uX skips values that still hold var()).
export function useResolvedFontToken(name) {
  return useMemo(() => {
    const doc = globalThis.window?.document;
    const value = doc ? globalThis.window.getComputedStyle?.(doc.documentElement)?.getPropertyValue(`--${name}`)?.trim() : '';
    return value || `var(--${name})`;
  }, [name]);
}

// ---- cc61d0d63 st (i): the file save hook. Its content-signing path (download_sign) needs GrowthBook and an active
// organization; without them the original saves with its anchor download D, which is what the host does (D with the
// surface's owner window; Electron asks where to save).
export function useSaveFile() {
  const ownerWindow = useOwnerWindow();
  return useCallback(async ({ data, mimeType, filename }) => {
    downloadBlob(new Blob([data], { type: mimeType }), filename, ownerWindow);
  }, [ownerWindow]);
}

// ---- c96d752d0 local cuts
// Uz: the plain tool row kQe falls back to when no `fallback` is passed. The transcript passes the host's own row (MA-7);
// a provider can supply it for other mounts.
export const McpAppToolRowFallback = createContext(null);
export function ToolRowFallback({ tool }) {
  const render = useContext(McpAppToolRowFallback);
  return render ? render(tool) : null;
}
// zZe / BZe: the server header of a non-visualize card, drawn only while __gb__3106245306 (nQe) is on.
export const GatedServerToolLabel = unreachable('The MCP App server header (__gb__3106245306)');
export const GatedServerHeaderRow = unreachable('The MCP App server header row (__gb__3106245306)');
