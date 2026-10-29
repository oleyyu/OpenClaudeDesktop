// Local services for the original 3.6556.2 Context section of the session rail that scripts/extract-session-rail-context.mjs
// emits (src/generated/session-rail-context, R4i-rail RL3; 3.6556.2 since w3-rail-context). Each export replaces one binding of the original, and the
// extractor checks the declaration it stands for (file:local, with feature strings) before it accepts the import. react-intl
// comes from the kit's adapters, the GrowthBook `.on` from the sections' adapters.
//
// The official data plane is the session's live store (context tokens, window facts, responding, armed turn, compaction
// status, connection), the session meta query and the composer footer bridge in the session scope store. Here the rail's
// mount (source-session-rail.jsx SessionRailHostView) provides SessionRailContextHostContext from main's `context` source:
//
//   report      a ready /context categories report (context-breakdown-model shape), used when no read is wired (tests)
//   contextUsageId / readContextUsage(id)   the session the categories are read for, and the read (main's
//               "context-usage": electron/context-usage-service.cjs — the core's own counts, else the host's estimates)
//   usage       the session's thread tokenUsage report (thread/tokenUsage/updated: last.totalTokens over
//               modelContextWindow), the same report the composer's usage ring reads; null / undefined: none yet
//   core        the running core (context-usage-model autoCompactLimit: the core's reported auto-compact limit, else
//               Codex's 90% rule, else none)
//   modelId     the session's model
//   running     a turn is running (or another session operation than compact is pending)
//   connected   the core is connected
//   compacting  a compact is in flight
//   fresh       the session has no turn and no report yet (c06cf64bb Sy spawnedFresh)
//   onCompact   compact the session (main's executeCommand("compact")), undefined when the session cannot compact
//
// Without a provider there is no bridge, so the card is not rendered (as the original without a composer footer).
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./generated/session-rail-kit/react-store.mjs";
import { useIntl } from "./source-session-rail-kit-adapters.jsx";
import { autoCompactLimit } from "./context-usage-model.mjs";
import { buildContextUsageReport } from "./context-breakdown-model.mjs";

export const SessionRailContextHostContext = createContext(null);
export const useRailContextHost = () => useContext(SessionRailContextHostContext);
const NO_SCOPE_STATE = Object.freeze({});
const NO_SCOPE = Object.freeze({ getState: () => NO_SCOPE_STATE, getInitialState: () => NO_SCOPE_STATE, subscribe: () => () => {} });

// shared-25 Rs (exported Vh; 2.42304.0 bc): a GrowthBook dynamic config parsed by its schema, else the fallback. No GrowthBook here (D29 / D31).
export function useGrowthBookValue(name, fallback) {
  return fallback;
}
// shared-28 Kp (exported zc; 2.42304.0 ep): `[value, set]` of an account / device scoped preference. Only eW reads one (the stale compact opt-out), and
// only while its GrowthBook band is on, which it is not here: the default, and no write.
export function useScopedPreference(key, initial) {
  return [initial, noop];
}
function noop() {}
// shared-28 Mp (exported Rc; 2.42304.0 Hf): the account preferences have loaded. Local preferences only: settled.
export function usePreferencesSettled() {
  return true;
}
// c227f4d5e $U (2.42304.0 Wz): the zod schema of the band's GrowthBook value; with no GrowthBook nothing parses against it.
export const STALE_COMPACT_BAND_SCHEMA = null;

// c227f4d5e yW(session, hasHandler) (2.42304.0 cB): `{ send: { hasHandler, owned, reach, turnArmed, responding, workerSaysWorking,
// compacting }, isSsh }`. Host: a local session the user owns; `reach` is oW's local branch over the core's connection
// (connected: "live", otherwise "detached"; no session: "dormant", as Xz without a session type); responding is the running
// turn; no armed turn, no remote worker, no SSH.
export function useCompactSendState(session, hasHandler) {
  const host = useRailContextHost();
  const id = session?.id ?? null;
  const reach = id === null || !host ? "dormant" : host.connected === false ? "detached" : "live";
  const responding = id !== null && host?.running === true;
  const compacting = id !== null && host?.compacting === true;
  const send = useMemo(() => ({ hasHandler, owned: true, reach, turnArmed: false, responding, workerSaysWorking: false, compacting }),
    [hasHandler, reach, responding, compacting]);
  return { send, isSsh: false };
}

// c06cf64bb CO (exported ut; 2.42304.0 Vv): the session has a pending turn or held input, so a compact press waits. The host sends a
// compact only while idle (the running turn disables it above): never pending here.
export function useSessionTurnPending() {
  return false;
}

// c68c4283d Sn (exported Ft; 2.42304.0 gn): the "claudeai.code.context_ring.compact_clicked" event. Nothing is sent (D17).
export function logCompactClicked() {}

// c227f4d5e E4: the context card's auto-compact window setting (`{ recommendedTokens, offerMinTokens, enabled, armed, windows }`),
// behind GrowthBook __gb__2706548410 (E13: off here). Not enabled, so L3 never offers the row and A4 is asked for nothing.
const AUTO_COMPACT_WINDOW_CONFIG = Object.freeze({ recommendedTokens: 4e5, offerMinTokens: 2e5, enabled: false, armed: false, windows: Object.freeze([1e6, 5e5, 4e5, 3e5]) });
export function useAutoCompactWindowConfig() {
  return AUTO_COMPACT_WINDOW_CONFIG;
}
// c227f4d5e A4(session): the session runs on this computer (its meta query has no `remote`). Only asked while E4 is
// enabled (never here); every host session is local.
export function useRunsOnThisComputer(session) {
  return session?.type === "local";
}
// c227f4d5e P4: the auto-compact window row (N4's window select, sendAutoCompactWindow). L3 renders it only with a setting
// from O4, which needs E4 enabled: never here.
export function AutoCompactWindowRow() {
  return null;
}
// c227f4d5e EB (pV's pointer-press mark for the kit's aside click guard TB over wB) is no longer stood in for here: the kit
// exports it (src/generated/session-rail-kit/rail-rows.mjs markRailPointerPress, V3-w6-rail-host), one copy of wB.
// shared-12 Te (exported i): the Customize nouns (`Q(intl, plugins)`): skills, or plugins behind a GrowthBook gate
// (shared-52 YL). No GrowthBook here: the skills nouns; Fx reads `manage` ("Manage skills") for the Skills row hint.
export function useCustomizeNouns() {
  const intl = useIntl();
  return useMemo(() => ({ manage: intl.formatMessage({ defaultMessage: "Manage skills", id: "OodrbpaVPv" }) }), [intl]);
}

// shared-156 iw (exported qp; 2.42304.0 Pb): the connected claude.ai MCP servers c2d611398 J's MCP tool rows label from (K,
// through shared-26 Ux). The host has no connector registry, so Ux finds nothing and K takes the original's own fallback:
// "{server} · {tool}" from shared-130 xz / Sz (both generated).
export function useMcpServerRegistry() {
  return null;
}
// shared-26 Ux (exported gl; 2.42304.0 ob): the registry entry of an MCP tool for its label. No registry: none.
export function findMcpToolForLabel() {
  return null;
}
// shared-8 mT (exported wc): a remote MCP server's display words for a tool row; K reads it only with a registry entry.
export function remoteMcpServerLabel() {
  return undefined;
}

// c73f45bc3 _b (2.42304.0 Q_): the composer footer bridge `{ modelId, onShowUsageReport, onCompact, openRequest, creditOffered }`, null
// without a footer. Host: the rail's context source is the footer; openRequest is the scope store's openComposerMenu (as
// the original); no usage report page and no credit offer here.
export function useRailContextBridge(scopeStore) {
  const host = useRailContextHost();
  const openRequest = useStore(scopeStore ?? NO_SCOPE, (e) => e.openComposerMenu ?? null);
  const modelId = host?.modelId, onCompact = host?.onCompact, on = !!host;
  return useMemo(() => (on ? { modelId, onShowUsageReport: undefined, onCompact, openRequest, creditOffered: false } : null),
    [on, modelId, onCompact, openRequest]);
}

// c06cf64bb Og: the live session's context window facts (`contextWindowFacts`, matching the live model). Host: the
// report's model context window, with the auto-compact threshold the host knows (context-usage-model autoCompactLimit),
// in the facts' shape (rawMaxTokens / autoCompactThreshold / isAutoCompactEnabled / liveModel). None without a window.
export function railWindowFacts(host) {
  const usage = host?.usage, window = usage?.modelContextWindow;
  if (!(Number.isFinite(window) && window > 0)) return null;
  const limit = autoCompactLimit(host?.core, usage);
  return { rawMaxTokens: window, liveModel: host?.modelId ?? null, ...(limit === null ? {} : { autoCompactThreshold: limit, isAutoCompactEnabled: true }) };
}
// c06cf64bb Pt (local by, hZ's Zg): the live context tokens. Host: the report's last request total.
export function railLiveContextTokens(host) {
  const used = host?.usage?.last?.totalTokens;
  return Number.isFinite(used) ? used : null;
}

// c227f4d5e hZ's report query, Bp(e, { breakdownOpen: w ? u : N, … }) → R.data.usage: the /context report is asked for
// while the breakdown is open (the rail card unfolded), again when a turn has moved the context, never mid-turn (the
// last one stays, as the original keeps its snapshot). Host: main's "context-usage" categories, made into the report's
// shape over the live tokenUsage report (context-breakdown-model buildContextUsageReport). None while closed, without a
// read, without categories, or for another session.
export function useRailContextReport(host, open) {
  const id = host?.contextUsageId ?? null, usage = host?.usage ?? null;
  const total = usage?.last?.totalTokens, running = host?.running === true;
  const read = useRef(host?.readContextUsage);
  read.current = host?.readContextUsage;
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!open || !id || running || typeof read.current !== "function" || !Number.isFinite(total)) return undefined;
    let live = true;
    Promise.resolve(read.current(id)).then((value) => { if (live) setCounts({ id, value: value ?? null }); }, () => { if (live) setCounts({ id, value: null }); });
    return () => { live = false; };
  }, [open, id, running, total]);
  const core = host?.core, modelId = host?.modelId ?? null;
  return useMemo(() => {
    const value = counts?.id === id ? counts.value : null;
    if (!value || !value.categories || Object.keys(value.categories).length === 0) return null;
    return buildContextUsageReport({ ...value, totalTokens: Number.isFinite(total) ? total : null, window: usage?.modelContextWindow,
      autoCompactThreshold: autoCompactLimit(core, usage), model: modelId });
  }, [counts, id, total, usage, core, modelId]);
}
