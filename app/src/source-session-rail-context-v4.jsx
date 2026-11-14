// account2 batch 6, region session-rail-context (4.16336.0, staged): the host stand-in for c227f4d5e w3 (export L; the
// 3.6556.2 F3 that src/source-session-rail-context.jsx stands in for), the context usage panel, in the one presentation
// the session rail renders: c73f45bc3 iC's `r(Es, { presentation: "inline", contextOnly: !0, inlineOpen, inlineIntentRef,
// sessionRef, modelId, onCompact, openRequest })`. w3's closure (the /context report query and its prefetch, plan meters,
// the model catalog's served windows, the ring popover, telemetry) is not sliced (scripts/extract-session-rail-context-v4.mjs
// re-measures it, MEASURED); this component follows w3's expressions for `P === !0` (pinned as raw call sites in the
// area's manifest) over the same host context source as the 3.6556.2 stand-in and renders the generated T3.
//
// w3, inline, over the host (local names are w3's; the host data plane is source-session-rail-context-adapters.jsx):
//   z  = Lv(t.id)            live context tokens (railLiveContextTokens)
//   se = K.data, q = se?.usage   the /context report (useRailContextReport / host.report; built live, never stale:
//                            se.stale === !1, no fetchedAt, no midTurn, no resets; xe = q !== null)
//   ce = Av(t.id, qv)        the live window facts (railWindowFacts)
//   le = q === null && z !== null && !ie ? ce ?? null : null     (ie: no killed mid-turn ask here)
//   We = X4({ usage: q, windowFacts: le, liveModel: ze, pickedModel: He, servedWindows: Re, engineVersion: Pe,
//             catalogSupports1m: Ue, surfaceAutoCompactWindow: Le })   no model catalog / served windows / engine here
//   Ge = We.max, Ke = We.kind === "staleEngine" ? We : null, { usage: qe, windowFacts: Je } = Q4(We, q, le)
//   Ye = z ?? (qe ? av(qe) : null), Xe = Ye ?? 0
//   Ze = Ke ? { remedy: t?.type === "local" ? "local" : "remote", enforced: Ke.enforced } : null
//   J  = ue || he            responding (he: a mid-turn ask, none here)
//   Qe = Bv(t.id) spawned fresh, $e = !L && !xe && (t === null || Qe), rt = xe || $e || le !== null (L: no plan section)
//   pt = i !== void 0 && !L && (q !== null || le !== null) && !ft   (ft: a stale reset, never)
//   mt = z === null && (se?.stale === !0 || …) → !1;  ge (staleSince) → null
//   { summary: gt, contextPct: ht } = lc(Xe, Ge, z === null && se?.stale === !1, !P)
//   Ot (cold) needs Rk's floor, null while the stale compact band (GrowthBook) is off: !1
//   Ut = P ? nt || !rt : …  (nt: a remote no-data branch, never here),  Wt = K.isFetching && … → !1,  Kt = Gt || Wt → !1
//   n  = i !== void 0 && Ke === null && _4(q, { onThisComputer: !0 }) !== null
//   r  = ht ?? ($e && Ye === null ? 0 : null),  a = le !== null
//   be = () => te(A3)        the breakdown toggle;  ye = hS() (memory file links: the path hover card and "open in
//                            editor") is not sliced: undefined, so the breakdown's memory rows show the plain path
// and then `p(T3, { sessionRef: t, onCompact: pt ? st : void 0, autoCompactSettable: n, contextTokens: Ye, … })`.
import { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { RailContextPanel, contextWindowMax, contextWindowView, autoCompactWindowOption } from "./generated/session-rail-context-v4/c227f4d5e.mjs";
import { contextSummary } from "./generated/session-rail-context-v4/shared-8.mjs";
import { contextUsedTokens } from "./generated/session-rail-context-v4/c2d611398.mjs";
import { useRailContextHost, railWindowFacts, railLiveContextTokens, useRailContextReport } from "./source-session-rail-context-adapters.jsx";

const NO_SERVED_WINDOWS = Object.freeze({});

// c91b6e9db N: the StackedMeter's readout card loader (`M ??= m("cds_stacked_meter_readout", () => t(() =>
// import("./c6b47b88e-…"), …)).then((e) => ({ default: e?.ReadoutCard ?? j }), () => ({ default: j }))`, `j = () => null`).
// The readout chunk c6b47b88e is the graph's ReadoutCard root; a failed load keeps the original's failure branch.
const NO_READOUT = () => null;
let readout;
export function loadStackedMeterReadout() {
  return (readout ??= import("./generated/session-rail-context-v4/c6b47b88e.mjs").then(
    (e) => ({ default: e?.ReadoutCard ?? NO_READOUT }),
    () => ({ default: NO_READOUT }),
  ));
}

export function RailContextUsage({ sessionRef: t, modelId: n, onCompact: i, presentation: u = "ring", inlineOpen: d = true, inlineIntentRef: f }) {
  const host = useRailContextHost();
  // The ring presentation is the composer's own usage popover here (source-composer.jsx); the rail asks only for inline.
  const P = u === "inline";
  const x = d;
  // w3 `ee(f, () => re, [re])`: the report prefetch owed on the card's intent. No report query here: nothing to prefetch.
  useImperativeHandle(f, () => undefined, []);
  // w3 `[H, te] = S(!1)` and `be = () => te(A3)` (A3: `!e`): the breakdown toggle T3 is handed.
  const [, te] = useState(false);
  const be = useCallback(() => te((e) => !e), []);
  const z = railLiveContextTokens(host);
  const ce = useMemo(() => railWindowFacts(host), [host]);
  // w3 K = Ym(t, { breakdownOpen: P ? x : B, … }).query: the host's categories report while the card is open.
  const report = useRailContextReport(host, P && x);
  const q = report ?? host?.report ?? null;
  const xe = q !== null;
  const le = q === null && z !== null ? ce ?? null : null;
  const We = useMemo(() => contextWindowMax({ usage: q, windowFacts: le, liveModel: host?.modelId ?? null, pickedModel: null, servedWindows: NO_SERVED_WINDOWS,
    engineVersion: null, catalogSupports1m: false, surfaceAutoCompactWindow: undefined }), [q, le, host?.modelId]);
  const Ge = We.max;
  const Ke = We.kind === "staleEngine" ? We : null;
  const { usage: qe, windowFacts: Je } = useMemo(() => contextWindowView(We, q, le), [We, q, le]);
  const Ye = z ?? (qe ? contextUsedTokens(qe) : null);
  const Xe = Ye ?? 0;
  const Ze = Ke ? { remedy: t?.type === "local" ? "local" : "remote", enforced: Ke.enforced } : null;
  const J = host?.running === true;
  const Qe = host?.fresh === true;
  const $e = !xe && (t === null || Qe);
  const rt = xe || $e || le !== null;
  const pt = i !== undefined && (q !== null || le !== null);
  const st = useCallback(() => { i?.(); }, [i]);
  // w3 `Ot`: a cold session (idle past Lk.minAgeMinutes, over Rk's token floor). Rk's floor is null while the stale
  // compact band (GrowthBook) is off, which it is here, so the session is never cold; tA reads the same Rk.
  const Ot = false;
  const { summary: gt, contextPct: ht } = contextSummary(Xe, Ge, z === null && q !== null, !P);
  const Ut = !rt;
  const autoCompactSettable = i !== undefined && Ke === null && autoCompactWindowOption(q, { onThisComputer: true }) !== null;
  const r = ht ?? ($e && Ye === null ? 0 : null);
  const a = le !== null;
  if (!P || !host) return null;
  return <RailContextPanel sessionRef={t} onCompact={pt ? st : undefined} autoCompactSettable={autoCompactSettable} contextTokens={Ye}
    contextTokensOutdated={false} cold={Ot} summary={gt} contextPct={r} contextUsage={qe} windowFacts={Je} isFetching={false} staleSince={null}
    turnRunning={J} noData={Ut} reportDue={false} windowOnly={a} staleEngineNotice={Ze} expanded={x} onToggle={be} memoryFileLink={undefined} />;
}
