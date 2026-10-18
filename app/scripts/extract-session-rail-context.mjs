// R4i-rail RL3: extract the 2.42304.0 Code session rail's Context section, without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/session-rail-context, own
// scripts/verify-gen-session-rail-context.mjs). Ledger: layout-session-rail-context. The section was deferred by R4f SR-3
// (extract-session-rail-sections.mjs pinned the card and re-measured its panel); this generator emits it.
//
//   context-card.mjs        c73f45bc3 iy (exported as p, fO's `contextSection: o ? void 0 : u(cg, { scopeStore,
//                           sessionRef })`): Q_ (the composer footer bridge: modelId / onCompact / openRequest; null
//                           without a footer, and then no card) and ay (the kit's RailCard "Context", folded by default,
//                           `rollup: ry` reading the panel's data-rail-context-summary / -pct, opened by a composer
//                           request for the "context" menu) around `ui` (c227f4d5e F, local hZ) as `presentation:
//                           "inline", contextOnly: !0`.
//   context-compact.mjs     c227f4d5e gZ (hZ's inline branch: oB's compact action, then og with `layout: "rail"`), oB
//                           (the Compact session action: hidden below 50% / without a handler / while compacting /
//                           dormant; "Available when reconnected" / "Available when Claude finishes this turn"; the
//                           "{tokens} until auto-compact" / "Auto-compacts soon" hint), Gz (the stale-session compact band:
//                           GrowthBook, off here, so no floor), Jz / Yz / Xz / eB / Zz / $z / tB / lB, and KX / qX (the
//                           context window the panel shows: a served window, a stale-engine clamp or the engine's own).
//   context-panel.mjs       c2d611398 ke (exported as t, og): the context usage panel. Rail layout: Me's "{percent}
//                           used" headline over the summary, je's progress bar, Ne's Compact session row, xe's
//                           stale-engine notice, "Last updated …", Ae "Loading context breakdown…", or "Send a message to
//                           see context usage." with no data.
//   context-tokens.mjs      shared-8 qV / kV (the "used / max (pct%)" summary and the compact token format).
//   context-usage-shape.mjs shared-104 Gx / qx (a categories report flattened; a report clamped to a window) and the
//                           category predicates Bx / Vx / Ux (free space, buffer, deferred).
//   chart-kit.mjs, chart-meter.mjs, chart-legend.mjs  c389a02dd / c91b6e9db / c50772270: the CDS StackedMeter, its group and
//                           the legend swatch H draws (series paints from the chart tokens, per-segment tooltips).
//   cds-frame-helpers.mjs   shared-frame Dn / bu (merged refs; the owner window's ResizeObserver).
//   mcp-names.mjs           shared-130 rF / iF (the MCP server / tool names of H's MCP tool rows).
//   compact-messages.mjs    ce660512f t (the shared "Compact session" message).
//   version-compare.mjs     cf97b43fb t (the engine version comparison of the stale-engine check).
//   telemetry-session-type.mjs  c68c4283d g (the session type a compact press reports; the event itself is not sent).
//
// hZ itself (c227f4d5e F) is not sliced: its closure is ~115 declarations / ~29 KB reaching ~130 bindings of ~35 chunks —
// the /context report query and its prefetch, the account plan meters, the model catalog's served windows, the ring
// popover with its motion, telemetry. Its inline branch (the only one the rail renders) is the host adapter
// RailContextUsage (src/source-session-rail-context-adapters.jsx): it follows hZ's expressions for `w === !0` over the
// host's context source (the thread tokenUsage report the composer's usage ring reads) and renders the generated gZ (in
// its own module src/source-session-rail-context.jsx, so the adapters this area imports never import it back). The
// panel's breakdown H (c2d611398 c, the /context categories: StackedMeter, category rows, MCP tools / memory files /
// custom agents) is sliced with its chart kit (chart-kit / chart-meter / chart-legend, cds-frame-helpers, mcp-names);
// RailContextUsage hands it the host's categories report (src/context-breakdown-model.mjs, the get_context_usage shape).
// `measured` in the manifest re-measures hZ on
// every run, so the decision stays checked against the installed original.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk; resolution follows
// extract-session-rail-sections.mjs: a host adapter (feature-checked), an earlier module of this area, a public name of
// the session rail kit, a semantic public name of view-tabs (D1/D24), React, or the export of another generated area that
// already slices the same original binding.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/session-rail-context');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-context-adapters.jsx';
const kitAdapterModule = '../../source-session-rail-kit-adapters.jsx';
const sectionsAdapterModule = '../../source-session-rail-sections-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';

const reactNamespaces = {
  o: { module: 'react', features: ['.useSyncExternalStore=function', '.forwardRef=function', '.useEffectEvent=function'] },
  fe: { module: 'react/jsx-runtime', features: ['.jsxs='] },
  Ln: { module: 'react-dom', features: ['.createPortal=function', '.flushSync=function'] },
};

const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters).
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', module: kitAdapterModule, features: ['let e = o(K);', 'return (Mt(e), e);'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', module: kitAdapterModule, features: ['var Gt = u(Wt, Ut);'] },
  // shared-25 Th (local Zs): a GrowthBook feature's `.on`. No GrowthBook here (D29 / D31): off (the sections' adapter).
  'shared-25-DP8p7i1Z.js:Zs': { name: 'useGrowthBookFeature', module: sectionsAdapterModule, features: ['return Rs(I(e)).on;'] },
  // shared-25 bc: a GrowthBook feature's value parsed by a schema, or the fallback. No GrowthBook: the fallback.
  'shared-25-DP8p7i1Z.js:bc': { name: 'useGrowthBookValue', closure: true, features: ['function bc(e,t,n){let r=ks(),{value:i}=Ls(r,I(e))', 'type:"dynamic_config",name:e'] },
  // shared-28 ep: an account / device scoped local preference `[value, set]`. Gz reads the stale compact opt-out; its
  // band is off here, so the value is never consulted: the default, and no write.
  'shared-28-DcgD7xXH.js:ep': { name: 'useScopedPreference', closure: true, features: ['function ep(e,t,n){', 'a=n?.scope==="account"', 'defaultValue:f,sync:!0'] },
  // shared-28 Hf: whether the account preferences have loaded. Local preferences: always settled.
  'shared-28-DcgD7xXH.js:Hf': { name: 'usePreferencesSettled', closure: true, features: ['function Hf(){let e=zf(),{account:t}=Ee();return e&&t?.uuid!==void 0}'] },
  // c227f4d5e Wz: the zod schema of the stale compact band's GrowthBook value (read only with GrowthBook, which is off).
  'c227f4d5e-Ba-r--Rl.js:Wz': { name: 'STALE_COMPACT_BAND_SCHEMA', features: ['minAgeMinutes: c().int().min(1).default(Uz.minAgeMinutes),', 't([i(), o()]).transform(() => Uz),'] },
  // c227f4d5e cB: the compact action's send state from the session meta query, the live session store (responding,
  // armed turn, compaction status, connection) and the session's ownership. Host: the rail's context source.
  'c227f4d5e-Ba-r--Rl.js:cB': { name: 'useCompactSendState', features: ['hasHandler: t,', 'owned: u,', 'reach: l,', 'turnArmed: a,', 'workerSaysWorking: s,', 'compacting: c,', 'isSsh: r?.remote?.kind === "ssh",'] },
  // c06cf64bb ut (local Vv): the session has a pending turn or held input (a compact then waits). Host: the source's flag.
  'c06cf64bb-BE5q2vSr.js:Vv': { name: 'useSessionTurnPending', features: ['return t !== void 0 && (t.pendingTurn !== null || t.heldInput.length > 0);'] },
  // c68c4283d Pt (local gn): the context ring's compact_clicked event. Nothing is sent (D17).
  'c68c4283d-CPuRD0vx.js:gn': { name: 'logCompactClicked', closure: true, features: ['function gn(t){', '"claudeai.code.context_ring.compact_clicked"'] },
  // c2d611398 H (exported as c): the /context categories breakdown (meter chart, category rows, MCP tools / memory files /
  // custom agents). The host has no categories report (contextUsage is always null), so og never renders it.
  // shared-156 Pb (exported as Qf): the connected MCP servers context the breakdown's MCP tool rows label from (oe). The
  // host has no claude.ai connector registry: null, so oe takes its own fallback (server name · prettified tool name).
  'shared-156-Bikz018e.js:Pb': { name: 'useMcpServerRegistry', closure: true, features: ['function Pb(){return X(Nb)}'] },
  // shared-26 ob (exported as gc): an MCP tool's registry entry for its label. No registry here: none.
  'shared-26-CgdP_nTj.js:ob': { name: 'findMcpToolForLabel', closure: true, features: ['function ob(e,t){return Ut(e,t,"forLabel")}'] },
  // c73f45bc3 Q_: the composer footer bridge (F_ / R_ over the scope store's footer, plus openComposerMenu and the
  // credit offer). Host: the rail's context source; null without one (no card, as without a footer).
  'c73f45bc3-CFrHin0p.js:Q_': { name: 'useRailContextBridge', features: ['let t = F_(e, R_),', 'n = Kn(e, (e) => e.openComposerMenu),', 'onCompact: t.onCompact,', 'openRequest: n,'] },
  // c227f4d5e hZ (exported as F): the context usage panel (see the header). Host: RailContextUsage, hZ's inline branch.
  'c227f4d5e-Ba-r--Rl.js:hZ': { name: 'RailContextUsage', module: '../../source-session-rail-context.jsx', features: ['presentation: l = "ring",', 'inlineOpen: u = !0,', 'return D(gZ, {', 'reportDue: Mt,', 'expanded: u,'] },
};

// Original bindings another importable area slices without exporting that this area may slice again.
const duplicates = {
  // Dn's stateless ref-merge helpers (cds-frame-helpers.mjs), sliced by code-current/environment-field-controls.mjs unexported.
  'shared-frame-BfjMqbuN.js:En': true, 'shared-frame-BfjMqbuN.js:Tn': true,
};
// Generated areas whose exports this generator imports (one copy of a binding they already slice).
const importableAreas = ['code-current', 'turn-box', 'routines-shared'];

const modules = [
  { target: 'context-tokens.mjs', source: 'shared-8-B5lJ8U5C.js', exports: { qV: 'contextSummary', kV: 'formatContextTokens' },
    features: { qV: ['if (t === null || (e > t && !n)) return { summary: kV(e), contextPct: null };', 'summary: r ? `${kV(e)} / ${kV(t)} (${i}%)` : `${kV(e)} / ${kV(t)}`,'],
      kV: ['return jV(e, MV);'] } },
  { target: 'context-usage-shape.mjs', source: 'shared-104-Cqo2-vQh.js',
    exports: { Gx: 'flattenContextUsage', qx: 'clampContextUsage', Bx: 'isFreeSpaceCategory', Vx: 'isBufferCategory', Ux: 'isDeferredCategory' },
    features: { Gx: ['rawMaxTokens'], qx: ['rawMaxTokens'], Bx: ['return e.kind === "free" || e.name === "Free space";'],
      Vx: ['e.kind === "buffer" ||', 'e.name === "Autocompact buffer" ||'], Ux: ['return e.kind === "deferred" || /\\(deferred\\)$/i.test(e.name);'] } },
  // shared-130 rF / iF: the MCP server and tool names the breakdown's MCP tool rows fall back to.
  { target: 'mcp-names.mjs', source: 'shared-130-DnUXVlYq.js', exports: { rF: 'humanizeServerName', iF: 'mcpToolShortName' },
    features: { rF: ['return e.replace(/_+/g, " ");'], iF: ['.split("__")', '.pop() ?? e;'] } },
  // shared-frame Dn ($u) / bu (al): the merged-ref hook and the owner window's ResizeObserver the chart meter / kit read.
  // view-tabs holds both under pending names (useCdsMergedRefs / elementResizeObserverClass, D46) and code-current slices
  // its own copies without exporting; these stateless helpers are sliced here too until view-tabs publishes them.
  { target: 'cds-frame-helpers.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Dn: 'useCdsMergedRefs', bu: 'elementResizeObserverClass' },
    features: { Dn: ['return U(() => En(e, t, n), [e, t, n]);'], bu: ['return e?.ownerDocument.defaultView?.ResizeObserver;'] } },
  // c389a02dd: the CDS chart kit the breakdown's StackedMeter and legend swatches share (series paints from the categorical
  // / reference / muted chart tokens, the legend and mark-kind contexts, the swatch, the element width hook). This area is
  // the only one slicing the chunk, so its two contexts have one instance (contexts: the group provides, Swatch reads).
  { target: 'chart-kit.mjs', source: 'c389a02dd-q1NLRpaV.js', contexts: ['m', '_'],
    exports: { le: 'resolveSeriesPaints', re: 'seriesInk', H: 'axisNumberFormat', J: 'compactNumberFormat', R: 'useElementWidth', v: 'ChartLegendProvider',
      h: 'ChartMarkKindsProvider', y: 'useChartLegend', g: 'useChartMarkKinds', S: 'ChartSwatchMark', f: 'CHART_CHROME_KEY' },
    features: { le: ['? (n = "context-gray")', 'paints: i, overflowed: i.some(se)'], S: ['t === "bar" || t === "area" ? b : t === "scatter" ? x : ne'],
      f: ['f = "__cdsChartChrome"'] } },
  // c91b6e9db: the CDS StackedMeter (O: StackedMeterGroup declaring the categories, M: the meter with per-segment tooltips).
  { target: 'chart-meter.mjs', source: 'c91b6e9db-BH3ya6oe.js', contexts: ['T'], exports: { O: 'StackedMeterGroup', M: 'StackedMeter' },
    features: { O: ['value: c.legend,'], M: ['"data-cds": "StackedMeter",', '"<StackedMeter> must be rendered inside a <StackedMeterGroup>, which declares its categories."'] } },
  // c50772270: the CDS ChartLegend and its Swatch (the breakdown's row swatches).
  { target: 'chart-legend.mjs', source: 'c50772270-BKebDpNN.js', exports: { d: 'ChartLegend' },
    features: { d: ['Swatch: l'] } },
  { target: 'version-compare.mjs', source: 'cf97b43fb-BkLgyu5g.js', exports: { t: 'compareVersions' }, features: { t: ['function t('] } },
  // c68c4283d g: the session type a compact press reports ("local" / "ssh" / "remote").
  { target: 'telemetry-session-type.mjs', source: 'c68c4283d-CPuRD0vx.js', exports: { g: 'telemetrySessionType' },
    features: { g: ['return e?.type === "local" ? (t ? "ssh" : "local") : "remote";'] } },
  { target: 'compact-messages.mjs', source: 'ce660512f-DsMrnGjx.js', exports: { t: 'compactMessages' },
    features: { t: ['compactSession: { defaultMessage: "Compact session", id: "ccakFk0PFz" }'] } },
  { target: 'context-panel.mjs', source: 'c2d611398-D9vRECA9.js',
    exports: { ke: 'ContextUsagePanel', H: 'ContextBreakdown', B: 'contextUsedTokens', Me: 'RailContextHeadline', je: 'ContextProgressBar', Ne: 'CompactActionRow', Ae: 'ContextBreakdownLoading',
      xe: 'StaleEngineNotice', De: 'RAIL_CONTEXT_SUMMARY_ATTR', Oe: 'RAIL_CONTEXT_PCT_ATTR' },
    features: {
      ke: ['layout: g = "popover",', 'y = g === "rail",', 'defaultMessage: "Send a message to see context usage.",', 'h !== void 0 && !d && i(Ne, { action: h, inset: b }),',
        'defaultMessage: "Last updated {time}. Refreshes when this turn ends.",', 'defaultMessage: "Last updated {time}. Send a message to refresh.",'],
      Me: ['defaultMessage: "{percent} used",', 'o = { [De]: "", [Oe]: r ?? void 0 };'],
      je: ['role: "progressbar",', 'style: { backgroundColor: "var(--cds-chart-reference-tint)" },'],
      Ne: ['let { onCompact: a, disabledReason: o, hint: s, hintId: c } = e,', 'children: i(N, { ...ae.compactSession }),'],
      Ae: ['defaultMessage: "Loading context breakdown\\u2026",'],
      xe: ['e.enforced', 'e.remedy === "local"'],
      B: ['e.categories.some(E)', ': (e.totalTokens ?? null);'],
      H: ['layout: s = "card",', 'railHeadline: c,', 'if (m) {', 'defaultMessage: "{used} / {max} ({pct}%)",'],
      De: ['De = "data-rail-context-summary"'], Oe: ['Oe = "data-rail-context-pct"'],
    } },
  { target: 'context-compact.mjs', source: 'c227f4d5e-Ba-r--Rl.js',
    exports: { gZ: 'RailContextPanel', oB: 'useCompactAction', Gz: 'useStaleCompactBand', Jz: 'compactAvailability', Yz: 'compactSendAvailability',
      Xz: 'compactReach', eB: 'autoCompactHint', Zz: 'autoCompactThreshold', tB: 'autoCompactHintText', lB: 'compactDisabledReason',
      KX: 'contextWindowMax', qX: 'contextWindowView', qz: 'COMPACT_HIDDEN_FLAG', Uz: 'STALE_COMPACT_DEFAULTS' },
    features: {
      gZ: ['let s = oB(e, {', 'return D(og, { ...o, layout: "rail", compactAction: s });'],
      oB: ['minPct: l = 50,', 'p = t !== void 0 && !f,', 'Jz({ ...g, contextPct: n, minPct: l, contextTokens: r, minTokens: y }),', 'eB({ usage: a ?? o, used: i ? null : r, refType: x }),',
        '(y_(h) ||', 'disabledReason: lB(u, b.reason)'],
      Gz: ['let e = Me(Bz, Uz, Wz),', 'a = n && t && i && !r ? e.minContextTokens : null;'],
      Jz: ['? Yz(a)', ': { kind: "hidden" };'],
      Yz: ['return !t || !n || r === "dormant" || s', '? { kind: "disabled", reason: "reconnect" }', '? { kind: "disabled", reason: "replying" }'],
      Xz: ['return t === "local"', ': "dormant";'],
      eB: ['r.autocompactSource === "auto" &&', '? { kind: "soon" }', ': { kind: "left", tokens: $z(a) }'],
      Zz: ['e.isAutoCompactEnabled === !1', 'return !(t > 0) || t >= e.rawMaxTokens ? null : e.rawMaxTokens - t;'],
      tB: ['defaultMessage: "{tokens} until auto-compact", id: "cVtWA7bvp3"', 'defaultMessage: "Auto-compacts soon",'],
      lB: ['defaultMessage: "Available when Claude finishes this turn",', 'defaultMessage: "Available when reconnected",'],
      KX: ['if (s !== null) return { kind: "served", max: s };', ': { kind: "engine", max: e?.rawMaxTokens ?? t?.rawMaxTokens ?? null };'],
      qX: ['if (e.kind === "engine") return { usage: t, windowFacts: n };'],
      qz: ['qz = "__gb__4236285942"'], Uz: ['Uz = { minAgeMinutes: 70, minContextPct: 75, minContextTokens: 3e5 }'],
    } },
  { target: 'context-card.mjs', source: 'c73f45bc3-CFrHin0p.js', exports: { iy: 'SessionRailContext', ay: 'RailContextCard', ry: 'railContextRollup' },
    features: {
      iy: ['let n = Q_(e);', 'return n ? c(ay, { scopeStore: e, sessionRef: t, bridge: n }) : null;'],
      ay: ['id: "context",', 'defaultMessage: "Context", id: "V2qutIKrxy"', 'rollup: ry,', 'presentation: "inline",', 'contextOnly: !0,', 'i?.menu === "context" &&',
        'e.getState().openComposerMenu === i &&'],
      ry: ['n = Number(t?.getAttribute("data-rail-context-pct") ?? NaN);', 'return { text: t?.textContent ?? "", pct: Number.isFinite(n) ? n : null };'],
    } },
];

// Original text the rail's mount follows but cannot import: fO hands the Context section to the rail view.
const rawCallSites = [
  { source: "cf74bc599-D9NZWRyl.js", role: "fO gives the rail its Context section, not while read-only (c73f45bc3 p = iy; host: SessionRailHostView)",
    features: ["contextSection:o?void 0:u(cg,{scopeStore:t,sessionRef:e})", "p as cg"] },
  { source: "c73f45bc3-CFrHin0p.js", role: "iy is the chunk's export p (fO's cg)", features: ["iy as p"] },
  // hZ's expressions RailContextUsage follows for the inline branch (w === !0), and the branch itself.
  { source: "c227f4d5e-Ba-r--Rl.js", role: "hZ (export F): the inline branch the rail card renders (host: RailContextUsage)",
    features: ["hZ as F", "G=U===null&&A!==null&&!te?W??null:null", "Me=A??(Ae?rg(Ae):null)", "Ie=!O&&!fe&&(e===null||Fe)", "Be=fe||Ie||G!==null",
      "He=Y(()=>{Ve(),r?.()})", "qe=r!==void 0&&!O&&(U!==null||G!==null)&&!Ke", "Je=A===null&&(V?.stale===!0||V?.resets!==void 0&&V.resets<Ge)",
      "td(Ne,Oe,A===null&&V?.stale===!1,!w)", "se=V?.stale||w&&V?.midTurn&&oe?V.fetchedAt:null", "oe=ne||ae", "kt=w?ze||!Be:ze||c&&!Be",
      "surface:w?\"rail_card\":\"ring_popover\"", "return D(gZ,",
      "contextUsage:Ae,windowFacts:je,isFetching:At,staleSince:se,turnRunning:oe,noData:kt,reportDue:Mt,staleEngineNotice:Pe,expanded:u,onToggle:de,memoryFileLink:ue"] },
];
// hZ, re-measured on every run: the adapter stands in for it while its closure stays this large.
const measured = { source: 'c227f4d5e-Ba-r--Rl.js', export: 'F', minLocals: 100, minImports: 100 };

const cache = new Map();
async function readSource(name) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map(), writers: null };
  cache.set(name, record);
  return record;
}
// Top-level statements that assign to a top-level binding (`X.displayName = …`, an enum body): a sliced binding must
// have none, or its slice would miss what they set.
function topLevelWriters(src) {
  if (src.writers) return src.writers;
  src.writers = new Map();
  for (const node of src.ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue;
    const parsed = babel.babelParse(src.code.slice(node.start, node.end), `${src.name}@${node.start}`, true);
    babel.traverse(parsed, {
      AssignmentExpression(p) {
        const left = p.node.left;
        const id = left.type === 'Identifier' ? left : left.type === 'MemberExpression' && left.object.type === 'Identifier' ? left.object : null;
        if (id && !p.scope.hasBinding(id.name) && src.top.has(id.name)) src.writers.set(id.name, node.start);
      },
    });
  }
  return src.writers;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
// The raw text of a binding's same-chunk closure (imports excluded), and its size.
function closure(src, name) {
  const seen = new Set(), parts = [], imports = new Set();
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const entry = src.top.get(n);
    if (!entry) return;
    if (entry.kind === 'import') { imports.add(`${entry.file}:${entry.alias}`); return; }
    parts.push(declarationText(src, entry));
    for (const dep of declarationDeps(src, n)) visit(dep);
  };
  visit(name);
  return { text: parts.join('\n'), locals: parts.length, imports };
}
const closureText = (src, name) => closure(src, name).text;
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

// ---- other generated areas ------------------------------------------------------------------------------------------
const jsonCache = new Map();
async function readJson(file) {
  if (!jsonCache.has(file)) jsonCache.set(file, JSON.parse(await fs.readFile(file, 'utf8')));
  return jsonCache.get(file);
}
function exportedNames(text) {
  const out = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      out.set(local, [...(out.get(local) ?? []), as ?? local]);
    }
  return out;
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await readJson(path.join(generatedRoot, 'view-tabs/manifest.json'));
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const viewTabsByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) viewTabsByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames)) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // file#local -> [{ area, target }] for every 2.42304.0 binding the importable areas slice (code-current mixes versions;
  // only its modules sliced from this snapshot count).
  const sliced = new Map();
  for (const area of importableAreas) {
    const manifest = await readJson(path.join(generatedRoot, area, 'manifest.json'));
    for (const m of manifest.modules) {
      const version = m.referenceVersion ?? manifest.referenceVersion;
      if (version !== referenceVersion) continue;
      if (m.source.includes('/') && !m.source.includes(`/${referenceSnapshot}/`)) continue;
      const file = path.basename(m.source);
      for (const b of m.bindings ?? []) {
        const key = `${file}#${typeof b === 'string' ? b : b.name}`;
        if (!sliced.has(key)) sliced.set(key, []);
        sliced.get(key).push({ area, target: m.target });
      }
    }
  }
  areas = { viewTabsByLocal, kitByLocal, sliced };
  return areas;
}
const exportCache = new Map();
async function areaExports(area, target) {
  const key = `${area}/${target}`;
  if (!exportCache.has(key)) exportCache.set(key, exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return exportCache.get(key);
}

// vendor-frame `var X = ns.member` with ns a proved React namespace.
const provedNamespaces = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const entry = src.top.get(local);
  if (entry?.kind !== 'var') return null;
  const init = entry.node.init;
  if (init?.type !== 'MemberExpression' || init.computed || init.object.type !== 'Identifier' || init.property.type !== 'Identifier') return null;
  const ns = reactNamespaces[init.object.name];
  if (!ns) return null;
  if (!provedNamespaces.has(init.object.name)) {
    assertFeatures(`React namespace ${init.object.name}`, closureText(src, init.object.name), ns.features);
    provedNamespaces.add(init.object.name);
  }
  const react = await import(ns.module === 'react/jsx-runtime' ? 'react/jsx-runtime' : ns.module);
  if (!(init.property.name in react)) throw Error(`${ns.module} has no ${init.property.name} (vendor-frame ${local})`);
  return { from: ns.module, name: init.property.name };
}
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailContext({ check = false, explore = null } = {}) {
  const { viewTabsByLocal, kitByLocal, sliced } = await loadAreas();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail-context.mjs',
    adapterModule: 'src/source-session-rail-context-adapters.jsx', modules: [], publicNames: {}, callSites: [], adapted: null,
  };
  const files = {};
  const owner = (file, local) => emitted.find(m => m.spec.source === file && Object.hasOwn(m.spec.exports, local));
  // Resolves the original binding file:local to an import, or null when it is to be sliced (same chunk only).
  const resolveBinding = async (spec, file, local, via) => {
    const self = path.join(output, spec.target);
    const adapter = adapters[`${file}:${local}`];
    if (adapter) {
      const dep = await readSource(file);
      const original = dep.top.get(local);
      if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration of ${file}`);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      return { from: adapter.module ?? adapterModule, name: adapter.name, via, kind: 'adapter', original: `${file}:${local}` };
    }
    const mine = owner(file, local);
    if (mine) return { from: `./${mine.spec.target}`, name: mine.spec.exports[local], via, kind: 'generated', original: `${file}:${local}` };
    const kit = kitByLocal.get(`${file}#${local}`);
    if (kit) return { from: rel(self, path.join(generatedRoot, 'session-rail-kit', kit.target)), name: kit.name, via, kind: 'session-rail-kit', original: `${file}:${local}` };
    const pub = viewTabsByLocal.get(`${file}#${local}`);
    if (pub) return { from: rel(self, path.join(generatedRoot, 'view-tabs', pub.file)), name: pub.name, via, kind: 'view-tabs', original: `${file}:${local}` };
    const react = await reactMember(file, local);
    if (react) return { ...react, via, kind: 'react' };
    const elsewhere = sliced.get(`${file}#${local}`);
    if (elsewhere) {
      for (const { area, target } of elsewhere) {
        const names = (await areaExports(area, target)).get(local);
        if (names?.length) return { from: rel(self, path.join(generatedRoot, area, target)), name: names[0], via, kind: area, original: `${file}:${local}` };
      }
      if (!duplicates[`${file}:${local}`]) {
        const message = `${spec.target}: ${via} (${local}) is sliced by ${elsewhere.map(e => `${e.area}/${e.target}`).join(', ')} but not exported; it must not be sliced twice`;
        if (!explore) throw Error(message);
        explore.push({ target: spec.target, via: 'DUPLICATE', local: `${file}:${local}`, size: message });
      }
    }
    return null;
  };
  for (const spec of modules) {
    const src = await readSource(spec.source);
    const writers = topLevelWriters(src);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const dep = await readSource(entry.file);
        const local = dep.exported.get(entry.alias);
        const via = `${entry.file}:${entry.alias}`;
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const resolved = await resolveBinding(spec, entry.file, local, via);
        if (resolved) { imports.set(name, resolved); return; }
        if (explore) {
          explore.push({ target: spec.target, via, local, size: closureText(dep, local).length });
          imports.set(name, { from: '__unresolved__', name: local, via, kind: 'unresolved' });
          return;
        }
        throw Error(`${spec.target}: unresolved import ${via} (${local})`);
      }
      const isRoot = Object.hasOwn(spec.exports, name);
      if (!isRoot) {
        const resolved = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (resolved) { imports.set(name, resolved); return; }
      } else if (adapters[`${spec.source}:${name}`] || kitByLocal.has(`${spec.source}#${name}`) || viewTabsByLocal.has(`${spec.source}#${name}`))
        throw Error(`${spec.target}: root ${name} is provided elsewhere`);
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name} (${entry.kind})`);
      if (writers.has(name)) throw Error(`${spec.target}: ${spec.source}:${name} is also written by the top-level statement at ${writers.get(name)}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
      // No context is sliced here: the rail's contexts are the kit's (one instance each).
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
        const callee = imports.get(init.callee.name);
        if (callee?.kind === 'react' && callee.name === 'createContext' && !spec.contexts?.includes(name)) {
          const message = `${spec.target}: ${spec.source}:${name} is a context; a section must read the kit's instance, not slice one`;
          if (!explore) throw Error(message);
          explore.push({ target: spec.target, via: 'CONTEXT', local: name, size: message });
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'FEATURE', local: name, size: error.message });
      }
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail-context.mjs.\n// Edit the extractor or src/source-session-rail-context-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    if (!explore) {
      // The module must be closed: every identifier it reads is imported or declared in it.
      const closed = babel.babelParse(text, spec.target, true);
      let globals;
      babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
      const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
        'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'URL', 'BigInt', 'Boolean', 'window', 'document', 'parseInt', 'parseFloat']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
    for (const [local, name] of Object.entries(spec.exports)) {
      if (manifest.publicNames[name]) throw Error(`public name ${name} is used twice`);
      manifest.publicNames[name] = { file: spec.source, local, target: spec.target };
    }
  }
  if (explore) return manifest;
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  {
    const src = await readSource(measured.source);
    const local = src.exported.get(measured.export);
    if (local !== 'hZ') throw Error(`${measured.source} exports ${measured.export} as ${local}, not hZ`);
    const size = closure(src, local);
    const chunks = new Set([...size.imports].map(i => i.split(':')[0]));
    // The adapter stands in for hZ while it stays this large; a much smaller hZ would be sliced instead.
    if (size.locals < measured.minLocals || size.imports.size < measured.minImports)
      throw Error(`${measured.source}:${local} is down to ${size.locals} declarations / ${size.imports.size} imports; slice it instead of RailContextUsage`);
    manifest.adapted = { source: measured.source, binding: local, export: measured.export, adapter: 'RailContextUsage', sourceSha256: sha(src.bytes),
      declarations: size.locals, bytes: size.text.length, imports: size.imports.size, chunks: chunks.size };
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session rail context output set changed: ${present.join(',')}. Run scripts/extract-session-rail-context.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session rail context source mismatch: ${name}. Run scripts/extract-session-rail-context.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail context modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    const manifest = await extractSessionRailContext({ explore: found });
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailContext({ check: process.argv.includes('--check') });
}
