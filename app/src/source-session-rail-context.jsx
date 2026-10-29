// R4i-rail RL3 (3.6556.2 since w3-rail-context): the host stand-in for c227f4d5e F (local F3), the context usage panel, in
// the one presentation the session rail renders: c73f45bc3 Rx's `i(Po, { presentation: "inline", contextOnly: !0, inlineOpen,
// inlineIntentRef, sessionRef, modelId, onCompact, openRequest })`. F3's closure (over 100 declarations over ~35 chunks: the
// /context report query, plan meters, the model catalog, the ring popover, telemetry) is not sliced
// (scripts/extract-session-rail-context.mjs re-measures it); this component follows F3's expressions for `M === !0` (pinned
// as raw call sites in the area's manifest) over the host's context source and renders the generated L3 (_W's Compact
// session action and the auto-compact window row around c2d611398 Le's rail layout).
//
// F3, inline, over the host (local names are F3's):
//   L  = Z_(t.id)            live context tokens: the tokenUsage report's last request total (railLiveContextTokens)
//   ae = q.data, oe = ae?.usage   the /context report: the host's (useRailContextReport / host.report,
//                            context-breakdown-model: built live from the core's counts and the tokenUsage report, so never
//                            stale: ae.stale === !1, no fetchedAt, no midTurn; ye = oe !== null)
//   se = Ev(t.id, hv)        the live window facts (railWindowFacts: the report's model context window)
//   ce = oe === null && L !== null && !re ? se ?? null : null     (re: no killed mid-turn ask here)
//   Ue = c3({ usage: oe, windowFacts: ce, liveModel, pickedModel: null, servedWindows: {} … })   no served windows here
//   We = Ue.max, { usage: Ke, windowFacts: qe } = l3(Ue, oe, ce), Je = L ?? (Ke ? y_(Ke) : null), Ye = Je ?? 0
//   me = Y || pe             responding (pe: a mid-turn ask, none here)
//   Ze = mv(t.id) spawned fresh, Qe = !F && !ye && (t === null || Ze), nt = ye || Qe || ce !== null (tt: a remote no-data
//                            branch, never here)
//   dt = i !== void 0 && !F && (oe !== null || ce !== null) && !ut, at = () => { it(); i?.() }   (ut: a stale reset, never)
//   ft = L === null && (ae?.stale === !0 || …) → !1 (never stale);  X = ae?.stale || … → null
//   { summary: mt, contextPct: pt } = Mf(Ye, We, L === null && ae?.stale === !1, !M)
//   kt (cold) needs eW's floor, which is null with the stale compact band off (GrowthBook): !1
//   Wt = M ? tt || !nt : …,  Gt = q.isFetching && … → !1,  qt = Kt || Gt → !1 (Kt: a report due),  Xe (stale engine) null
//   n  = i !== void 0 && Ge === null && oe !== null && Fe(oe.model).supports_1m_context === !0: no model catalog here: !1
//   r  = pt ?? (Qe && Je === null ? 0 : null),  a = ce !== null (a window-only count)
//   _e = Ox() (memory file links of the breakdown: the path hover card and "open in editor"): not sliced (its file preview
//                            closure); undefined, so J's memory rows show the plain path (J's own `label === void 0` branch)
// and then `y(L3, { sessionRef: t, onCompact: dt ? ot : void 0, autoCompactSettable: n, contextTokens: Je, … })`.
import { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { RailContextPanel, contextWindowMax, contextWindowView } from "./generated/session-rail-context/context-compact.mjs";
import { contextSummary } from "./generated/session-rail-context/context-tokens.mjs";
import { contextUsedTokens } from "./generated/session-rail-context/context-panel.mjs";
import { useRailContextHost, railWindowFacts, railLiveContextTokens, useRailContextReport } from "./source-session-rail-context-adapters.jsx";

const NO_SERVED_WINDOWS = Object.freeze({});

// c91b6e9db M: the StackedMeter's readout card loader (`le ??= b("cds_stacked_meter_readout", () => import("./c6b47b88e-…"))
// .then((e) => ({ default: e?.ReadoutCard ?? j }), () => ({ default: j }))`, `j = () => null`). b is shared-frame Br, which
// runs the import itself while no host chunk loader is registered (none here). The readout chunk c6b47b88e and its chart
// tooltip kit cddbfc1b6 are sliced into chart-readout.mjs (w10-ccres-rail-readout); a failed load keeps the original's
// failure branch.
const NO_READOUT = () => null;
let readout;
export function loadStackedMeterReadout() {
  return (readout ??= import("./generated/session-rail-context/chart-readout.mjs").then(
    (e) => ({ default: e?.ReadoutCard ?? NO_READOUT }),
    () => ({ default: NO_READOUT }),
  ));
}

export function RailContextUsage({ sessionRef: t, modelId: n, onCompact: i, presentation: u = "ring", inlineOpen: d = true, inlineIntentRef: f }) {
  const host = useRailContextHost();
  // The ring presentation is the composer's own usage popover here (source-composer.jsx); the rail asks only for inline.
  const M = u === "inline";
  const x = d;
  // F3 `U(f, () => ne, [ne])`: the report prefetch owed on the card's intent. No report query here: nothing to prefetch.
  useImperativeHandle(f, () => undefined, []);
  // F3 `[V, H] = W(!1)` and `ve = () => H(H3)`: the breakdown toggle L3 is handed (the inline card's own expansion is `x`).
  const [, H] = useState(false);
  const ve = useCallback(() => H((e) => !e), []);
  const L = railLiveContextTokens(host);
  const se = useMemo(() => railWindowFacts(host), [host]);
  // F3 q = Qm(t, { breakdownOpen: M ? x : z, … }): the host's categories report while the card is open (useRailContextReport)
  const report = useRailContextReport(host, M && x);
  const oe = report ?? host?.report ?? null;
  const ye = oe !== null;
  const ce = oe === null && L !== null ? se ?? null : null;
  const Ue = useMemo(() => contextWindowMax({ usage: oe, windowFacts: ce, liveModel: host?.modelId ?? null, pickedModel: null, servedWindows: NO_SERVED_WINDOWS,
    engineVersion: null, catalogSupports1m: false, surfaceAutoCompactWindow: undefined }), [oe, ce, host?.modelId]);
  const We = Ue.max;
  const { usage: Ke, windowFacts: qe } = useMemo(() => contextWindowView(Ue, oe, ce), [Ue, oe, ce]);
  const Je = L ?? (Ke ? contextUsedTokens(Ke) : null);
  const Ye = Je ?? 0;
  const me = host?.running === true;
  const Ze = host?.fresh === true;
  const Qe = !ye && (t === null || Ze);
  const nt = ye || Qe || ce !== null;
  const dt = i !== undefined && (oe !== null || ce !== null);
  const ot = useCallback(() => { i?.(); }, [i]);
  // F3 `kt`: a cold session (idle past eW's minAgeMinutes, over its token floor). eW's floor is null while the stale
  // compact band (GrowthBook) is off, which it is here, so the session is never cold; _W reads the same eW.
  const kt = false;
  const { summary: mt, contextPct: pt } = contextSummary(Ye, We, L === null && oe !== null, !M);
  const Wt = !nt;
  const r = pt ?? (Qe && Je === null ? 0 : null);
  const a = ce !== null;
  if (!M || !host) return null;
  return <RailContextPanel sessionRef={t} onCompact={dt ? ot : undefined} autoCompactSettable={false} contextTokens={Je} contextTokensOutdated={false}
    cold={kt} summary={mt} contextPct={r} contextUsage={Ke} windowFacts={qe} isFetching={false} staleSince={null} turnRunning={me} noData={Wt}
    reportDue={false} windowOnly={a} staleEngineNotice={null} expanded={x} onToggle={ve} memoryFileLink={undefined} />;
}
