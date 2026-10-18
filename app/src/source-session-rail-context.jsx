// R4i-rail RL3: the host stand-in for c227f4d5e F (local hZ), the context usage panel, in the one presentation the session
// rail renders: c73f45bc3 ay's `u(ui, { presentation: "inline", contextOnly: !0, inlineOpen, inlineIntentRef, sessionRef,
// modelId, onCompact, openRequest })`. hZ's closure (~115 declarations over ~35 chunks: the /context report query, plan
// meters, the model catalog, the ring popover, telemetry) is not sliced (scripts/extract-session-rail-context.mjs re-measures
// it); this component follows hZ's expressions for `w === !0` (pinned as raw call sites in the area's manifest) over the
// host's context source and renders the generated gZ (oB's Compact session action around og's rail layout).
//
// hZ, inline, over the host (local names are hZ's):
//   A  = Zg(e.id)            live context tokens: the tokenUsage report's last request total (railLiveContextTokens)
//   V  = R.data, U = V?.usage the /context report: the host's (host.report, context-breakdown-model: built live from the
//                            core's thread/contextUsage counts and the tokenUsage report, so never stale: V.stale === !1,
//                            no fetchedAt, no midTurn; fe = U !== null)
//   W  = b_(e.id, d_)        the live window facts (railWindowFacts: the report's model context window)
//   G  = U === null && A !== null && !te ? W ?? null : null     (te: no mid-turn ask here)
//   De = KX({ usage: U, windowFacts: G, liveModel, pickedModel: null, servedWindows: {} … })   no served windows here
//   Oe = De.max, { usage: Ae, windowFacts: je } = qX(De, U, G), Me = A ?? (Ae ? rg(Ae) : null), Ne = Me ?? 0
//   ne = p_(k.id) responding, oe = ne || ae (ae: cZ's mid-turn ask, none here), Fe = __(k.id) spawned fresh
//   Ie = !O && !fe && (e === null || Fe), Be = fe || Ie || G !== null (ze: a remote no-data branch, never here)
//   qe = r !== void 0 && !O && (U !== null || G !== null) && !Ke, He = () => { Ve(); r?.() }
//   Me = A ?? (Ae ? rg(Ae) : null)   rg: c2d611398 B (contextUsedTokens, generated)
//   Je = A === null && (V?.stale === !0 || …)  → !1 (never stale);  se = V?.stale || … → null
//   { summary: Ye, contextPct: Xe } = td(Ne, Oe, A === null && V?.stale === !1, !w)
//   st (cold) needs Gz's floor, which is null with the stale compact band off (GrowthBook): !1
//   kt = w ? ze || !Be : …,  At = R.isFetching && … → !1,  Mt = jt (lv: a report due) || At → !1,  Pe (stale engine) null
//   ue = Ny() (memory file links of the breakdown: the path hover card and "open in editor"): not sliced (its file preview
//                            closure); undefined, so H's memory rows show the plain path (H's own `label === void 0` branch)
// and then `return D(gZ, { sessionRef: e, onCompact: qe ? He : void 0, contextTokens: Me, … })`.
import { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { RailContextPanel, contextWindowMax, contextWindowView } from "./generated/session-rail-context/context-compact.mjs";
import { contextSummary } from "./generated/session-rail-context/context-tokens.mjs";
import { contextUsedTokens } from "./generated/session-rail-context/context-panel.mjs";
import { useRailContextHost, railWindowFacts, railLiveContextTokens, useRailContextReport } from "./source-session-rail-context-adapters.jsx";

const NO_SERVED_WINDOWS = Object.freeze({});

export function RailContextUsage({ sessionRef: e, modelId: t, onCompact: r, presentation: l = "ring", inlineOpen: u = true, inlineIntentRef: d }) {
  const host = useRailContextHost();
  // The ring presentation is the composer's own usage popover here (source-composer.jsx); the rail asks only for inline.
  const w = l === "inline";
  // hZ `j(d, () => ee, [ee])`: the report prefetch owed on the card's intent. No report query here: nothing to prefetch.
  useImperativeHandle(d, () => undefined, []);
  // hZ `[F, I] = g(!1)` and `de = H(() => I(e => !e), [])`: the breakdown toggle og is handed (the inline card's own
  // expansion is `u`).
  const [, I] = useState(false);
  const de = useCallback(() => I((e) => !e), []);
  const A = railLiveContextTokens(host);
  const W = useMemo(() => railWindowFacts(host), [host]);
  // hZ V = R.data (Bp, asked while the breakdown is open): the host's categories report (useRailContextReport)
  const report = useRailContextReport(host, w && u);
  const U = report ?? host?.report ?? null;
  const G = U === null && A !== null ? W ?? null : null;
  const De = useMemo(() => contextWindowMax({ usage: U, windowFacts: G, liveModel: host?.modelId ?? null, pickedModel: null, servedWindows: NO_SERVED_WINDOWS,
    engineVersion: null, catalogSupports1m: false, surfaceAutoCompactWindow: undefined }), [U, G, host?.modelId]);
  const Oe = De.max;
  const { usage: Ae, windowFacts: je } = useMemo(() => contextWindowView(De, U, G), [De, U, G]);
  const Me = A ?? (Ae ? contextUsedTokens(Ae) : null);
  const Ne = Me ?? 0;
  const ne = host?.running === true;
  const oe = ne;
  const Fe = host?.fresh === true;
  const fe = U !== null;
  const Ie = !fe && (e === null || Fe);
  const Be = fe || Ie || G !== null;
  const He = useCallback(() => { r?.(); }, [r]);
  const qe = r !== undefined && (U !== null || G !== null);
  // hZ `st`: a cold session (idle past Gz's minAgeMinutes, over its token floor). Gz's floor is null while the stale
  // compact band (GrowthBook) is off, which it is here, so the session is never cold; oB reads the same Gz.
  const st = false;
  const { summary: Ye, contextPct: Xe } = contextSummary(Ne, Oe, A === null && U !== null, !w);
  const kt = !Be;
  if (!w || !host) return null;
  return <RailContextPanel sessionRef={e} onCompact={qe ? He : undefined} contextTokens={Me} contextTokensOutdated={false} cold={st}
    summary={Ye} contextPct={Xe} contextUsage={Ae} windowFacts={je} isFetching={false} staleSince={null} turnRunning={oe} noData={kt}
    reportDue={false} staleEngineNotice={null} expanded={u} onToggle={de} memoryFileLink={undefined} />;
}
