// Local services for the original 2.42304.0 Context section of the session rail that scripts/extract-session-rail-context.mjs
// emits (src/generated/session-rail-context, R4i-rail RL3). Each export replaces one binding of the original, and the
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
import { autoCompactLimit } from "./context-usage-model.mjs";
import { buildContextUsageReport } from "./context-breakdown-model.mjs";

export const SessionRailContextHostContext = createContext(null);
export const useRailContextHost = () => useContext(SessionRailContextHostContext);
const NO_SCOPE = Object.freeze({ getState: () => ({}), subscribe: () => () => {} });

// shared-25 bc: a GrowthBook dynamic config parsed by its schema, else the fallback. No GrowthBook here (D29 / D31).
export function useGrowthBookValue(name, fallback) {
  return fallback;
}
// shared-28 ep: `[value, set]` of an account / device scoped preference. Only Gz reads one (the stale compact opt-out), and
// only while its GrowthBook band is on, which it is not here: the default, and no write.
export function useScopedPreference(key, initial) {
  return [initial, noop];
}
function noop() {}
// shared-28 Hf: the account preferences have loaded. Local preferences only: settled.
export function usePreferencesSettled() {
  return true;
}
// c227f4d5e Wz: the zod schema of the band's GrowthBook value; with no GrowthBook nothing parses against it.
export const STALE_COMPACT_BAND_SCHEMA = null;

// c227f4d5e cB(session, hasHandler): `{ send: { hasHandler, owned, reach, turnArmed, responding, workerSaysWorking,
// compacting }, isSsh }`. Host: a local session the user owns; `reach` is Xz's local branch over the core's connection
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

// c06cf64bb ut (local Vv): the session has a pending turn or held input, so a compact press waits. The host sends a
// compact only while idle (the running turn disables it above): never pending here.
export function useSessionTurnPending() {
  return false;
}

// c68c4283d Pt (local gn): the "claudeai.code.context_ring.compact_clicked" event. Nothing is sent (D17).
export function logCompactClicked() {}

// shared-156 Pb (exported as Qf): the connected claude.ai MCP servers c2d611398 H's MCP tool rows label from (oe, through
// shared-26 ob). The host has no connector registry, so ob finds nothing and oe takes the original's own fallback:
// "{server} · {tool}" from shared-130 rF / iF (both generated).
export function useMcpServerRegistry() {
  return null;
}
// shared-26 ob (exported as gc): the registry entry of an MCP tool for its label. No registry: none.
export function findMcpToolForLabel() {
  return null;
}

// c73f45bc3 Q_: the composer footer bridge `{ modelId, onShowUsageReport, onCompact, openRequest, creditOffered }`, null
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
