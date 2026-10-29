// R4i-rail RL3: extract the Code session rail's Context section, without executing any desktop runtime (decision D0: own
// generator, own output folder src/generated/session-rail-context, own scripts/verify-gen-session-rail-context.mjs).
// Ledger: layout-session-rail-context. The section was deferred by R4f SR-3 (extract-session-rail-sections.mjs pinned the
// card and re-measured its panel); this generator emits it.
// w3-rail-context (2026-10-26): the originals are Claude Desktop 3.6556.2 (analysis/claude-3.6556.2-migrate-20261025,
// research/panes.md §1.3 / §2.1 C1-10, C1-11, §3.2; plan R1–R15, E3/E5/E13). Export names and target files are those of
// 2.42304.0 (R4/E7); new exports: ContextRowActionsContext, railContextRowActions, autoCompactWindowOption,
// COMPACT_SETTING_FLAG.
//
//   context-card.mjs        c73f45bc3 Lx (exported as p, cf74bc599 TN's `contextSection: l ? void 0 : s(L_, { scopeStore,
//                           sessionRef, openConnectors, openSkills, openMemory, mcpToolOpener })`): _b (the composer footer
//                           bridge; null without a footer, and then no card) and Rx (the kit's RailCard "Context", folded by
//                           default, `rollup: Ix` reading the panel's data-rail-context-summary / -pct, opened by a composer
//                           request for the "context" menu, the row actions Fx in c2d611398's ne context) around c227f4d5e F
//                           (local F3) as `presentation: "inline", contextOnly: !0`.
//   context-compact.mjs     c227f4d5e L3 (F3's inline branch: _W's compact action, the auto-compact window row P4 behind
//                           GrowthBook __gb__2706548410, off here, then S_ = c2d611398 Le with `layout: "rail"`), _W (the
//                           Compact session action), eW (the stale-session compact band: GrowthBook, off), iW / aW / oW / uW /
//                           sW / lW / dW / xW, O4, and c3 / l3 (the context window the panel shows).
//   context-panel.mjs       c2d611398 Le (exported as t): the context usage panel. Rail layout: Be's "{percent} used"
//                           headline over the summary, ze's progress bar, Ve's Compact session row, ke's stale-engine notice,
//                           "Last updated …", Re "Loading context breakdown…", "Send a message to see context usage." with no
//                           data, "Send a message to see the breakdown." for a window-only count; J (exported as s) the
//                           /context categories breakdown with its rows (te: "Since last update", the row actions of ne).
//   context-tokens.mjs      shared-8 DX / cX (the "used / max (pct%)" summary and the compact token format).
//   context-usage-shape.mjs shared-104 yC / CC (a categories report flattened; a report clamped to a window) and the
//                           category predicates lC / uC / fC (free space, buffer, deferred).
//   chart-kit.mjs, chart-meter.mjs, chart-legend.mjs  c389a02dd / c91b6e9db: the CDS StackedMeter, its group, the chart kit
//                           and the legend with its Swatch (c50772270 is gone: ChartLegend j moved into c389a02dd).
//   cds-frame-helpers.mjs   shared-frame jn / ud (merged refs; the owner window's ResizeObserver): view-tabs publishes both
//                           in 3.6556.2 (useCdsMergedRefs / getResizeObserverClass), so they are re-exported (one copy).
//   mcp-names.mjs           shared-130 xz / Sz (the MCP server / tool names of J's MCP tool rows).
//   compact-messages.mjs    ce660512f t (the shared "Compact session" message).
//   version-compare.mjs     cf97b43fb t (the engine version comparison of the stale-engine check).
//   telemetry-session-type.mjs  c68c4283d x (the session type a compact press reports; the event itself is not sent).
//   chart-readout.mjs       c6b47b88e o (exported ReadoutCard; w10-ccres-rail-readout): the StackedMeter's readout card
//                           c91b6e9db M loads lazily (host loader loadStackedMeterReadout imports this module), over
//   chart-tooltip.mjs       cddbfc1b6 Z / X / J (the chart tooltip kit's row, body and positioned popover), on
//   chart-spring.mjs, chart-motion-value.mjs  c0ce8f953 useSpring and ca74e9c4f useMotionValue; the vendor-motion
//                           bindings they and the tooltip kit reach are imported from working-line/vendor-motion.mjs
//                           (its linkExports; one framer-motion frame loop and MotionConfigContext), and
//                           grapheme-split.mjs (shared-2 Sp).
//
// F3 itself (c227f4d5e F) is not sliced: its closure is well over 100 declarations reaching over 100 bindings of ~35
// chunks — the /context report query and its prefetch, the account plan meters, the model catalog's served windows, the
// ring popover with its motion, telemetry. Its inline branch (the only one the rail renders) is the host adapter
// RailContextUsage (src/source-session-rail-context.jsx): it follows F3's expressions for `M === !0` over the host's
// context source and renders the generated L3. `measured` in the manifest re-measures F3 on every run.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk; resolution follows
// extract-session-rail-kit.mjs: a host adapter (feature-checked against the original it replaces), an earlier module of
// this area, a public name of the session rail kit, a semantic public name of view-tabs (D1/D24; the React Compiler
// helpers by their E3 names), React (a vendor-frame export alias of official.reactAliases), or the export of another
// generated area that already slices the same 3.6556.2 binding. A root view-tabs publishes is re-exported (R4).
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { turnBoxManifestFor, turnBoxExportsFor } from './turn-box-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// w3-rail-context: 3.6556.2 (R1/E6). The constants come from official-3.6556.2.mjs.
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/session-rail-context');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-context-adapters.jsx';
const kitAdapterModule = '../../source-session-rail-kit-adapters.jsx';
const sectionsAdapterModule = '../../source-session-rail-sections-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;

// Host dependencies, keyed by the original binding (file:local) an import or same-chunk reference resolves to.
// `features` must appear in that binding's prettier form (`closure: true`: in its same-chunk closure, raw text).
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters).
  'vendor-intl-DYfox5Co.js:q': { name: 'useIntl', module: kitAdapterModule, features: ['return (Mt(e), e);'] },
  'vendor-intl-DYfox5Co.js:Gt': { name: 'FormattedMessage', module: kitAdapterModule, features: ['var Gt = c(Wt, Ut);'] },
  // c91b6e9db M: the StackedMeter's lazy readout card (`b("cds_stacked_meter_readout", () => import("./c6b47b88e-…"))`,
  // the pointed segment's card). No dynamic import here: the host loader (see the adapter).
  'c91b6e9db-0Cdn02JS.js:M': { name: 'loadStackedMeterReadout', module: '../../source-session-rail-context.jsx',
    features: ['"cds_stacked_meter_readout"', 'default: e?.ReadoutCard ?? j', '() => ({ default: j })'] },
  // shared-25 fs (exported Yh): a GrowthBook feature's `.on`. No GrowthBook here (D29 / D31): off (the sections' adapter).
  'shared-25-DOWZRSlq.js:fs': { name: 'useGrowthBookFeature', module: sectionsAdapterModule, features: [').on;'] },
  // shared-25 Rs (exported Vh): a GrowthBook dynamic config parsed by a schema, or the fallback. No GrowthBook: the fallback.
  'shared-25-DOWZRSlq.js:Rs': { name: 'useGrowthBookValue', closure: true, features: ['function Rs(e,t,n){', 'type:"dynamic_config",name:e'] },
  // shared-28 Kp (exported zc): an account / device scoped local preference `[value, set]`. eW reads the stale compact
  // opt-out; its band is off here, so the value is never consulted: the default, and no write.
  'shared-28-DNYlf4wu.js:Kp': { name: 'useScopedPreference', features: ['a = n?.scope === "account",'] },
  // shared-28 Mp (exported Rc): whether the account preferences have loaded. Local preferences: always settled.
  'shared-28-DNYlf4wu.js:Mp': { name: 'usePreferencesSettled', features: ['return e && t?.uuid !== void 0;'] },
  // c227f4d5e $U: the zod schema of the stale compact band's GrowthBook value (read only with GrowthBook, which is off).
  'c227f4d5e-B-FYKrwT.js:$U': { name: 'STALE_COMPACT_BAND_SCHEMA', features: ['minAgeMinutes: c().int().min(1).default(QU.minAgeMinutes),', '.transform(() => QU),'] },
  // c227f4d5e yW: the compact action's send state from the session meta query, the live session store (responding,
  // armed turn, compaction status, connection) and the session's ownership. Host: the rail's context source.
  'c227f4d5e-B-FYKrwT.js:yW': { name: 'useCompactSendState', features: ['hasHandler: t,', 'turnArmed: o,', 'responding: a,', 'workerSaysWorking: c,', 'compacting: l,', '?.remote?.kind === "ssh";'] },
  // c06cf64bb CO (exported ut): the session has a pending turn or held input (a compact then waits). Host: never.
  'c06cf64bb-CdJdJuVd.js:CO': { name: 'useSessionTurnPending', features: ['return t !== void 0 && (t.pendingTurn !== null || t.heldInput.length > 0);'] },
  // c68c4283d Sn (exported Ft): the context ring's compact_clicked event. Nothing is sent (D17).
  'c68c4283d-CWbOoVxS.js:Sn': { name: 'logCompactClicked', features: ['"claudeai.code.context_ring.compact_clicked"'] },
  // c227f4d5e E4: the auto-compact window setting of the context card, behind GrowthBook __gb__2706548410 (wt / gt). No
  // GrowthBook here (E13): its config with `enabled: !1, armed: !1`, so L3 never offers the row (P4).
  'c227f4d5e-B-FYKrwT.js:E4': { name: 'useAutoCompactWindowConfig', closure: true, features: ['"__gb__2706548410"', 'recommendedTokens:4e5,offerMinTokens:2e5', 'windows:'] },
  // c227f4d5e A4: the session runs on this computer (its meta has no `remote`). Asked only while E4 is enabled: never here.
  'c227f4d5e-B-FYKrwT.js:A4': { name: 'useRunsOnThisComputer', features: ['e?.type === "local" ? e : null', 'r.remote === void 0'] },
  // c227f4d5e P4: the auto-compact window row (N4's select, sendAutoCompactWindow). Rendered only with E4 enabled: none.
  'c227f4d5e-B-FYKrwT.js:P4': { name: 'AutoCompactWindowRow', features: ['"steady_goblet_row"', 'surface: "context_card",'] },
  // c227f4d5e EB (pV's pointer-press mark for the kit's aside click guard TB / wB) is no adapter: since V3-w6-rail-host the
  // kit exports it (session-rail-kit/rail-rows.mjs markRailPointerPress), so pV shares the kit's one wB.
  // c227f4d5e F (local F3): the context usage panel (see the header). Host: RailContextUsage, F3's inline branch.
  'c227f4d5e-B-FYKrwT.js:F3': { name: 'RailContextUsage', module: '../../source-session-rail-context.jsx',
    features: ['inComposerRow: h,', 'restoresKeptWindow: M', '"rail_card"', 'autoCompactSettable: n,', 'windowOnly: a,', 'y(L3, {'] },
  // c73f45bc3 _b: the composer footer bridge (Qy / tb over the scope store's footer, plus openComposerMenu and the credit
  // offer). Host: the rail's context source; null without one (no card, as without a footer).
  'c73f45bc3-B7hbL7H9.js:_b': { name: 'useRailContextBridge', features: ['t = Qy(e, tb),', 'onCompact: t.onCompact,', 'openRequest: n,', 'creditOffered: r,'] },
  // shared-12 Te (exported i): the Customize nouns (skills, or plugins behind a GrowthBook gate). Fx reads `manage` for
  // the Skills row hint. No GrowthBook here: the skills nouns ("Manage skills").
  'shared-12-Dro5Rhl0.js:Te': { name: 'useCustomizeNouns', closure: true, features: ['manage:{defaultMessage:"Manage skills",id:"OodrbpaVPv"}', 'manage:{defaultMessage:"Manage plugins",id:"EXoZxGhXPy"}'] },
  // shared-156 iw (exported qp): the connected claude.ai MCP servers J's MCP tool rows label from (K). The host has no
  // claude.ai connector registry: null, so K takes its own fallback (server name · prettified tool name).
  'shared-156-BLTosN8U.js:iw': { name: 'useMcpServerRegistry', closure: true, features: ['nonInternalClaimedNames:e.nonInternalClaimedNames', 'internalToolsOnlyNames:e.internalToolsOnlyNames'] },
  // shared-26 Ux (exported gl): an MCP tool's registry entry for its label. No registry here: none.
  'shared-26-CGuBxVt9.js:Ux': { name: 'findMcpToolForLabel', features: ['"forLabel"'] },
  // shared-8 mT (exported wc): a remote MCP server's display words for a tool row, read only with a registry entry. None.
  'shared-8-Db1QN4mf.js:mT': { name: 'remoteMcpServerLabel', features: ['if (n?.server.type !== "remote") return;', 't.startsWith("mcp__")'] },
};

// Original bindings another importable area slices without exporting that this area may slice again (stateless only).
const duplicates = {
  // w10-ccres-rail-readout: shared-2's grapheme split (code-current attachment-file-name.mjs, code-composer slice it
  // unexported) and its lazily made Intl.Segmenter.
  'shared-2-TF8v67kg.js:Sp': 'stateless grapheme split',
  'shared-2-TF8v67kg.js:xp': 'the grapheme split\'s cached Intl.Segmenter',
  // shared-frame Nn: the RTL script regex cds-frame-helpers' In reads; code-composer chat-composer-frame.mjs slices it for
  // its exported Fn (textDirectionOf, which the tooltip kit's H imports from there) without exporting Nn itself.
  'shared-frame-6jtSkIit.js:Nn': 'stateless RTL script regex',
  // shared-8 uX: the pure token-count scaler cX (formatContextTokens) and working-line token-format.mjs's lX both call;
  // working-line slices it unexported (found once working-line became importable for vendor-motion).
  'shared-8-Db1QN4mf.js:uX': 'stateless token-count scaler',
};
// Generated areas whose 3.6556.2 exports this generator imports (one copy of a binding they already slice).
// working-line: its vendor-motion slice (framer-motion as the desktop ships it) lists the motion bindings the chart
// tooltip kit reaches in linkExports (D1).
const importableAreas = ['code-current', 'turn-box', 'routines-shared', 'code-composer', 'working-line'];

const modules = [
  { target: 'context-tokens.mjs', source: 'shared-8-Db1QN4mf.js', exports: { DX: 'contextSummary', cX: 'formatContextTokens' },
    features: { DX: ['if (t === null || (e > t && !n)) return { summary: cX(e), contextPct: null };', 'summary: r ? `${cX(e)} / ${cX(t)} (${i}%)` : `${cX(e)} / ${cX(t)}`,'],
      cX: ['return uX(e, dX);'] } },
  { target: 'context-usage-shape.mjs', source: 'shared-104-CTONUSaz.js',
    exports: { yC: 'flattenContextUsage', CC: 'clampContextUsage', lC: 'isFreeSpaceCategory', uC: 'isBufferCategory', fC: 'isDeferredCategory',
      pC: 'isMcpToolsCategory', mC: 'isSkillsCategory', hC: 'isMemoryFilesCategory', gC: 'isCustomAgentsCategory' },
    features: { yC: ['rawMaxTokens: e.rawMaxTokens,', 'autocompactSource: e.autocompactSource,'], CC: ['rawMaxTokens: t,', 'tokens: Math.max(0, t - e.totalTokens)'],
      lC: ['return e.kind === "free" || e.name === "Free space";'],
      uC: ['e.kind === "buffer" ||', 'e.name === "Autocompact buffer" ||', 'e.name === "Compact buffer"'],
      pC: ['(e.name === "MCP tools" || e.name === "MCP server instructions") && !fC(e)'], mC: ['return e.name === "Skills";'],
      hC: ['return e.name === "Memory files";'], gC: ['return e.name === "Custom agents";'],
      fC: ['return e.kind === "deferred" || /\\(deferred\\)$/i.test(e.name);'] } },
  // shared-130 xz / Sz: the MCP server and tool names the breakdown's MCP tool rows fall back to.
  { target: 'mcp-names.mjs', source: 'shared-130-dWztbTO1.js', exports: { xz: 'humanizeServerName', Sz: 'mcpToolShortName' },
    features: { xz: ['return e.replace(/_+/g, " ");'], Sz: ['.split("__")', '.filter(Boolean)', 'return t.replace(/^_+/, "") || t;'] } },
  // shared-frame jn / ud: the merged-ref hook and the owner window's ResizeObserver the chart meter / kit read. view-tabs
  // publishes both in 3.6556.2, so this module only re-exports them under their 2.42304.0 names (R4, one copy).
  // io / In (the CDS direction hook over vendor-frame useDirection; an RTL text test) are stateless and unpublished: sliced.
  { target: 'cds-frame-helpers.mjs', source: official.sharedFrame,
    exports: { jn: 'useCdsMergedRefs', ud: 'elementResizeObserverClass', io: 'useCdsDirection', In: 'hasRtlText' },
    features: { ud: ['return e?.ownerDocument.defaultView?.ResizeObserver;'], In: ['return Nn.test(e) || Pn.test(e);'] } },
  // shared-28 Cb: requestIdleCallback with a timeout, else a timer (the StackedMeter warms its readout card through it).
  { target: 'idle-callback.mjs', source: 'shared-28-DNYlf4wu.js', exports: { Cb: 'scheduleIdleCallback' },
    features: { Cb: ['typeof window.requestIdleCallback == "function"', 'let r = setTimeout(e, n);'] } },
  // c389a02dd: the CDS chart kit the breakdown's StackedMeter and legend share (series paints from the categorical /
  // reference / muted chart tokens, the legend and mark-kind contexts, the swatch, the element width hook). This area is
  // the only one slicing the chunk, so its two contexts have one instance (contexts: the group provides, Swatch reads).
  { target: 'chart-kit.mjs', source: 'c389a02dd-8DAFcbV_.js', contexts: ['b', 'S'],
    exports: { Te: 'resolveSeriesPaints', ye: 'seriesInk', pe: 'axisNumberFormat', Y: 'compactNumberFormat', de: 'useElementWidth', C: 'ChartLegendProvider',
      ce: 'ChartMarkKindsProvider', w: 'useChartLegend', x: 'useChartMarkKinds', O: 'ChartSwatchMark', re: 'CHART_CHROME_KEY', G: 'elementBox',
      // w10-ccres-rail-readout: the tooltip kit cddbfc1b6 reads I (exported C: J's default bandFraction) and F (exported y:
      // the opacity of a dimmed tooltip).
      I: 'CHART_TOOLTIP_BAND_FRACTION', F: 'CHART_DIMMED_OPACITY' },
    features: { Te: ['? (n = "context-gray")', '(n = "ghost")', '(n = "unknown")', 'paints: i, overflowed: i.some('], re: ['re = "__cdsChartChrome"'],
      O: ['=== "scatter"', '"shrink-0 forced-color-adjust-none"'], G: ['e.getBoundingClientRect()'], I: ['I = 0.3'], F: ['F = 0.5'] } },
  // c389a02dd j (moved from the gone c50772270): the CDS ChartLegend and its Swatch (the breakdown's row swatches).
  { target: 'chart-legend.mjs', source: 'c389a02dd-8DAFcbV_.js', exports: { j: 'ChartLegend' },
    features: { j: ['"legend"', 'Swatch:'] } },
  // c91b6e9db: the CDS StackedMeter (fe: StackedMeterGroup declaring the categories, L: the meter with per-segment tooltips).
  { target: 'chart-meter.mjs', source: 'c91b6e9db-0Cdn02JS.js', contexts: ['de'], exports: { fe: 'StackedMeterGroup', L: 'StackedMeter' },
    features: { fe: ['value: c.markKinds,', 'value: c.legend,'], L: ['"data-cds": "StackedMeter",', 'readout:', '"<StackedMeter> must be rendered inside a <StackedMeterGroup>, which declares its categories."'] } },
  // w10-ccres-rail-readout: c91b6e9db M's readout card (c6b47b88e, loaded by the host's loadStackedMeterReadout) and what
  // it reaches. The vendor-motion bindings (the motion values, the frame loop and the spring generator the card's tooltip
  // springs on) resolve to working-line/vendor-motion.mjs, which exports them (linkExports; D1, one copy).
  // ca74e9c4f t: the motion value hook (useMotionValue) the spring and the tooltip's springs hold.
  { target: 'chart-motion-value.mjs', source: 'ca74e9c4f-Bd6thou8.js', exports: { o: 'useMotionValue' },
    features: { o: ['.on("change", e)', 'isStatic'] } },
  // c0ce8f953 t: useSpring (k over O / T: a motion value following its source on a spring; the tooltip's x / y).
  { target: 'chart-spring.mjs', source: 'c0ce8f953-DPnHAvZz.js', exports: { k: 'useSpring' },
    features: { k: ['type: "spring"'] }, closureFeatures: { k: ['skipInitialAnimation', 'restDelta:.001', 'restSpeed:.01'] } },
  // shared-2 Sp (exported uy): a string's graphemes (Intl.Segmenter). code-current / code-composer slice it without
  // exporting it; stateless (its segmenter cache xp aside), so it is sliced again here (see `duplicates`).
  { target: 'grapheme-split.mjs', source: 'shared-2-TF8v67kg.js', exports: { Sp: 'graphemeSegments' },
    features: { Sp: ['granularity: "grapheme"', 'return Array.from(e);'] } },
  // cddbfc1b6: the CDS chart tooltip kit. Z (exported i: a readout row: swatch, value, note, label), X (exported n: the
  // heading over the row grid) and J (exported r: the positioned popover tooltip on two springs).
  { target: 'chart-tooltip.mjs', source: 'cddbfc1b6-D5UtgtfD.js', exports: { Z: 'ChartTooltipRow', X: 'ChartTooltipBody', J: 'ChartTooltip' },
    features: {
      Z: ['"text-footnote font-medium tabular-nums text-primary"', '"text-footnote tabular-nums text-secondary"', 'markKind:'],
      X: ['"text-caption text-secondary"', 'grid-cols-[auto_auto_auto_1fr]', 'grid-cols-[auto_auto_1fr]'],
      J: ['popover: "manual",', '"aria-hidden": "true",', 'showPopover', 'crosshairPx:', 'domainHalfExtentPx:', 'valueExtentPx:',
        '"pointer-events-none absolute left-0 top-0 z-10 m-0 block w-max overflow-visible rounded border bg-surface-popover px-sm py-xs font-normal shadow-popover [inset:0_auto_auto_0]"'] },
    closureFeatures: { J: ['stiffness:950,damping:55,mass:.85', 'translate3d('], Z: ['max-w-[240px] justify-self-start text-footnote'] } },
  // c6b47b88e o (exported ReadoutCard): the StackedMeter's readout card, Escape dismissing it.
  { target: 'chart-readout.mjs', source: 'c6b47b88e-C-bftS07.js', exports: { o: 'ReadoutCard' },
    features: { o: ['e.key === "Escape" && !e.isComposing', 'barRef:', 'pointedId:', 'onDismiss:', '"bdi"', 'notes: !0', 'domainAxis: "y",',
      'crosshairPx:', 'domainHalfExtentPx:', 'preferredSide:', '"finger"', '"before"'] } },
  { target: 'version-compare.mjs', source: 'cf97b43fb-D15FhRmS.js', exports: { t: 'compareVersions' },
    features: { t: ['parseInt(e, 10) || 0'] } },
  // c5da7eb42 uh (moved from c227f4d5e HX): the stale-engine context window clamp (off: `enabled = ah = !1`).
  { target: 'stale-engine-window.mjs', source: 'c5da7eb42-XijZdwf1.js', exports: { uh: 'staleEngineWindow' },
    features: { uh: ['if (!i || e === null || e.rawMaxTokens !== sh) return null;', 'e.autocompactSource === "unknown-model"'] } },
  // c1564829c b: the usage bar's fill class (shared-8 vX over hX, the kit's severityFillClass / usageSeverity).
  { target: 'usage-fill.mjs', source: 'c1564829c-BSRgPrB2.js', exports: { b: 'usageFillClass' }, features: {},
    closureFeatures: {} },
  // ceeeccbd9 t: hands focus to the parent while a control is disabled, and back (Ve's Compact session button).
  { target: 'focus-hand-off.mjs', source: 'ceeeccbd9-3K6sIGaz.js', exports: { t: 'useDisabledFocusHandOff' },
    features: { t: ['r?.focus({ preventScroll: !0 })', 'e?.focus({ preventScroll: !0 })'] } },
  // c68c4283d x: the session type a compact press reports ("local" / "ssh" / "remote").
  { target: 'telemetry-session-type.mjs', source: 'c68c4283d-CWbOoVxS.js', exports: { x: 'telemetrySessionType' },
    features: { x: ['return e?.type === "local" ? (t ? "ssh" : "local") : "remote";'] } },
  { target: 'compact-messages.mjs', source: 'ce660512f-BUC2eeZ7.js', exports: { t: 'compactMessages' },
    features: { t: ['compactSession: { defaultMessage: "Compact session", id: "ccakFk0PFz" }'] } },
  { target: 'context-panel.mjs', source: 'c2d611398-Y2NVtf8_.js', contexts: ['ne'],
    exports: { Le: 'ContextUsagePanel', J: 'ContextBreakdown', W: 'contextUsedTokens', Be: 'RailContextHeadline', ze: 'ContextProgressBar', Ve: 'CompactActionRow',
      Re: 'ContextBreakdownLoading', ke: 'StaleEngineNotice', Fe: 'RAIL_CONTEXT_SUMMARY_ATTR', Ie: 'RAIL_CONTEXT_PCT_ATTR', ne: 'ContextRowActionsContext' },
    features: {
      Le: ['defaultMessage: "Send a message to see context usage.", id: "4XCjSHnPX/"', 'defaultMessage: "Send a message to see the breakdown.", id: "lKin9Ues9t"',
        'defaultMessage: "Last updated {time}. Refreshes when this turn ends.",', 'defaultMessage: "Last updated {time}. Send a message to refresh.",',
        'defaultMessage: "Context window", id: "4JvX9ZTEQB"', 'railSetting:', 'windowOnly:', 'liveTokens:'],
      J: ['railHeadline:', 'railSetting:', 'meterValues:', '"p-3 rounded-lg bg-alpha-1 max-w-[520px]"'],
      W: ['e.categories.reduce(', ': (e.totalTokens ?? null);'],
      Be: ['defaultMessage: "{percent} used",', 'id: "fNzhJnomJo"', '"flex min-w-0 items-baseline justify-between gap-sm text-body"'],
      ze: ['role: "progressbar",', '{ backgroundColor: "var(--cds-chart-reference-tint)" }', '"h-[4px] rounded-full overflow-hidden"'],
      Ve: ['wrapperClassName: "min-w-0 shrink-0"', '"flex-1 min-w-0 truncate text-secondary"'],
      Re: ['defaultMessage: "Loading context breakdown\\u2026", id: "HOtJEySUMV"'],
      ke: ['id: "6glOI9RqFv"', 'id: "0aOMM5IR2M"', 'id: "2OBkwXmF8p"', 'id: "VXumwRvnwB"'],
      Fe: ['Fe = "data-rail-context-summary"'], Ie: ['Ie = "data-rail-context-pct"'],
    },
    closureFeatures: { J: ['sinceLabel:n="Since last update"', 'otherLabel:t="Other"'] } },
  { target: 'context-compact.mjs', source: 'c227f4d5e-B-FYKrwT.js',
    exports: { L3: 'RailContextPanel', _W: 'useCompactAction', eW: 'useStaleCompactBand', iW: 'compactAvailability', aW: 'compactSendAvailability',
      oW: 'compactReach', uW: 'autoCompactHint', sW: 'autoCompactThreshold', dW: 'autoCompactHintText', xW: 'compactDisabledReason',
      c3: 'contextWindowMax', l3: 'contextWindowView', rW: 'COMPACT_HIDDEN_FLAG', QU: 'STALE_COMPACT_DEFAULTS', O4: 'autoCompactWindowOption', S4: 'COMPACT_SETTING_FLAG',
      pV: 'RailPressRowButton', vB: 'RAIL_PRESS_CLASS' },
    features: {
      L3: ['layout: "rail",', '"hkc1yt"', 'autoCompactSettable:', 'railSetting:', 'liveTokens:'],
      _W: ['minPct: u,', 'session_type:', 'absolute_floor_tokens:', 'ring_amber:', 'disabledReason:'],
      eW: ['{ scope: "account" }', 'thresholds:', 'floor:', 'bandOn:', 'optedOut:', 'prefsSettled:'],
      iW: ['{ kind: "hidden" }'],
      aW: ['{ kind: "disabled", reason: "reconnect" }', '{ kind: "disabled", reason: "replying" }', '{ kind: "enabled" }'],
      oW: ['"connecting"', '"reconnecting"', 'bridgeCliConnected:', 'hostHolding:', '"dormant"'],
      uW: ['autocompactSource === "auto"', '{ kind: "soon" }', '{ kind: "left", tokens:'],
      sW: ['e.isAutoCompactEnabled === !1', 'e.autocompactBufferTokens ?? 0'],
      dW: ['defaultMessage: "{tokens} until auto-compact", id: "cVtWA7bvp3"', 'defaultMessage: "Auto-compacts soon", id: "7P8kz5gafY"'],
      xW: ['defaultMessage: "Available when Claude finishes this turn", id: "tZl2bQVjIE"', 'defaultMessage: "Available when reconnected", id: "wt9nviDhan"'],
      c3: ['{ kind: "served", max: s }', 'kind: "staleEngine"', '{ kind: "engine", max: e?.rawMaxTokens ?? t?.rawMaxTokens ?? null }'],
      l3: ['e.kind === "staleEngine"', 'autocompactBufferTokens: null'],
      rW: ['rW = "__gb__4236285942"'], QU: ['QU = { minAgeMinutes: 70, minContextPct: 75, minContextTokens: 3e5 }'],
      O4: ['r === "env" || r === "unknown-model"', 'userSet:'], S4: ['S4 = "__gb__2706548410"'],
    },
    closureFeatures: { pV: ['(wB=!0)'], vB: ['"rounded focus-visible:outline-hidden focus-visible:shadow-focus"'] } },
  { target: 'context-card.mjs', source: 'c73f45bc3-B7hbL7H9.js', exports: { Lx: 'SessionRailContext', Rx: 'RailContextCard', Ix: 'railContextRollup', Fx: 'railContextRowActions' },
    features: {
      Lx: ['scopeStore:', 'bridge:'],
      Rx: ['id: "context",', 'defaultMessage: "Context", id: "V2qutIKrxy"', 'rollup: Ix,', 'presentation: "inline",', 'contextOnly: !0,', '?.menu === "context" &&',
        'openComposerMenu: null'],
      Ix: ['"data-rail-context-pct"', 'pct: Number.isFinite(n) ? n : null'],
      Fx: ['defaultMessage: "Manage connector", id: "KwN+nYX98p"', 'defaultMessage: "Manage connectors", id: "cqx+RdJnHp"',
        'defaultMessage: "Edit memory files", id: "E5D1fbsFcT"', 'defaultMessage: "View memory files", id: "uGAx8N52ZS"',
        'defaultMessage: "View custom agents", id: "ehjv6hrVDx"', 'reveals: "memory"', 'reveals: "agents"', 'mcpToolActionOf:', 'actionOf:'],
    } },
];

// Original text the rail's mount follows but cannot import (matched through official.looseFeature, R2).
const rawCallSites = [
  { source: 'cf74bc599-CRYqipWN.js', role: 'TN gives the rail its Context section with the row openers, not while read-only (c73f45bc3 p = Lx; host: SessionRailHostView)', keep: ['p', 'L_'],
    features: ['l?void 0:s(L_,{scopeStore:n,sessionRef:t,openConnectors:Ue?qe:g,openSkills:Je?Ye:null,openMemory:v,mcpToolOpener:Ze})', 'p as L_'] },
  { source: 'c73f45bc3-B7hbL7H9.js', role: 'Lx is the chunk\'s export p (TN\'s L_)', keep: ['Lx', 'p'], features: ['Lx as p'] },
  // w10-ccres-rail-readout: c91b6e9db M reads `e?.ReadoutCard` off this chunk (host: loadStackedMeterReadout's import of
  // chart-readout.mjs), and the card hands the tooltip kit's r / n / i its props.
  { source: 'c6b47b88e-C-bftS07.js', role: 'the readout chunk exports o as ReadoutCard (c91b6e9db M; host: loadStackedMeterReadout)', keep: ['o', 'ReadoutCard'],
    features: ['export{o as ReadoutCard}', 'plotLeft:0,domainAxis:"y",crosshairPx:C,domainHalfExtentPx:w,anchorPx:u,valueExtentPx:c,preferredSide:T'] },
  // F3's expressions RailContextUsage follows for the inline branch (M === !0), and the branch itself.
  { source: 'c227f4d5e-B-FYKrwT.js', role: 'F3 (export L): the inline branch the rail card renders (host: RailContextUsage)', keep: ['F3', 'L', 'L3', 'M'],
    features: ['F3 as L', 'M=b==="inline"', 'ce=oe===null&&L!==null&&!re?se??null:null', 'me=Y||pe,X=ae?.stale||M&&ae?.midTurn&&me?ae.fetchedAt:null',
      'L??(Ke?y_(Ke):null)', 'Qe=!F&&!ye&&(t===null||Ze)', 'nt=ye||Qe||ce!==null', 'dt=i!==void 0&&!F&&(oe!==null||ce!==null)&&!ut',
      'ft=L===null&&(ae?.stale===!0||ae?.resets!==void 0&&ae.resets<lt)', 'Mf(Ye,We,L===null&&ae?.stale===!1,!M)', 'Wt=M?tt||!nt:tt||v&&!nt',
      'Gt=q.isFetching&&(!q.isFetched||me),Kt=Ey(M?t?.id??null:null),qt=Kt||Gt', 'Xt=M?"rail_card":"ring_popover"', 'r=pt??(Qe&&Je===null?0:null),a=ce!==null',
      'y(L3,{sessionRef:t,onCompact:e,autoCompactSettable:n,contextTokens:Je,contextTokensOutdated:ft,cold:kt,summary:mt,contextPct:r,contextUsage:Ke,windowFacts:qe,isFetching:Gt,staleSince:X,turnRunning:me,noData:Wt,reportDue:qt,windowOnly:a,staleEngineNotice:Xe,expanded:x,onToggle:ve,memoryFileLink:_e})'] },
];
// F3, re-measured on every run: the adapter stands in for it while its closure stays this large.
const measured = { source: 'c227f4d5e-B-FYKrwT.js', export: 'L', local: 'F3', minLocals: 100, minImports: 100 };

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
// have none, or its slice would miss what they set — unless its module carries them (`carryWriters`: a module that
// declares it carries such statements, e.g. vendor-motion's `sn.applyToOptions = …`, verbatim and in their original place).
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
        if (id && !p.scope.hasBinding(id.name) && src.top.has(id.name)) {
          if (!src.writers.has(id.name)) src.writers.set(id.name, []);
          if (!src.writers.get(id.name).includes(node)) src.writers.get(id.name).push(node);
        }
      },
    });
  }
  return src.writers;
}
// The top-level bindings a carried statement reads.
function statementDeps(src, node) {
  const ast = babel.babelParse(src.code.slice(node.start, node.end), `${src.name}@${node.start}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  return globals.filter(n => src.top.has(n));
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
// An importable area's manifest for this release, or null while that area is still on another one (its modules then
// slice nothing of 3.6556.2).
async function areaManifest(area) {
  try {
    if (area === 'turn-box') return await turnBoxManifestFor(referenceVersion);
    if (area === 'routines-shared') return await routinesSharedManifestFor(referenceVersion);
  } catch (error) {
    if (/ is .*, expected /.test(error.message)) return null;
    throw error;
  }
  return readJson(path.join(generatedRoot, area, 'manifest.json'));
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const viewTabsByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) viewTabsByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const viewTabsBindings = new Map();
  for (const m of viewTabs.modules) viewTabsBindings.set(m.source, new Set(m.bindings));
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames)) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // file#local -> [{ area, target }] for every 3.6556.2 binding the importable areas slice (code-current mixes versions;
  // only its modules sliced from this snapshot count).
  const sliced = new Map();
  for (const area of importableAreas) {
    const manifest = await areaManifest(area);
    if (!manifest) continue;
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
  areas = { viewTabsByLocal, viewTabsBindings, kitByLocal, sliced };
  return areas;
}
const exportCache = new Map();
async function areaExports(area, target) {
  const key = `${area}/${target}`;
  if (!exportCache.has(key)) exportCache.set(key, area === 'turn-box' ? await turnBoxExportsFor(referenceVersion, target) : exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return exportCache.get(key);
}

// vendor-frame: the export alias of `local` that official.reactAliases lists, proved once (R3).
const provedAliases = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const alias = [...src.exported].find(([name, l]) => l === local && Object.hasOwn(official.reactAliases, name))?.[0];
  if (!alias) return null;
  if (!provedAliases.has(alias)) { official.assertVendorAlias(src.code, alias); provedAliases.add(alias); }
  const [module, member] = official.reactAliases[alias];
  return { from: module, name: member };
}
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailContext({ check = false, explore = null } = {}) {
  const { viewTabsByLocal, viewTabsBindings, kitByLocal, sliced } = await loadAreas();
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
      try {
        assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'ADAPTER-FEATURE', local, size: error.message });
      }
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
    const selected = new Map(), imports = new Map(), seen = new Set(), contexts = [], carried = new Map();
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
      } else {
        if (adapters[`${spec.source}:${name}`] || kitByLocal.has(`${spec.source}#${name}`)) throw Error(`${spec.target}: root ${name} is provided elsewhere`);
        // R4: a root view-tabs publishes in 3.6556.2 keeps this area's export name as a re-export of the one view-tabs copy.
        if (viewTabsByLocal.has(`${spec.source}#${name}`)) {
          imports.set(name, await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`));
          return;
        }
      }
      // A destructuring declarator (vendor-motion `var { schedule: M, cancel: N, state: P, steps: Fe } = Pe(…)`) is emitted
      // once for every name it binds; only a module that declares `patterns` may slice one.
      const supported = entry.kind === 'function' || entry.kind === 'var' || (entry.kind === 'class' && spec.classes) || (entry.kind === 'pattern' && spec.patterns);
      if (!supported) throw Error(`${spec.target}: unsupported declaration ${name} (${entry.kind})`);
      if (writers.has(name) && !spec.carryWriters)
        throw Error(`${spec.target}: ${spec.source}:${name} is also written by the top-level statement at ${writers.get(name).map(n => n.start).join(', ')}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
      for (const node of writers.get(name) ?? []) {
        if (carried.has(node)) continue;
        if (/\bimport\s*\(/.test(src.code.slice(node.start, node.end))) throw Error(`${spec.target}: dynamic import in the statement at ${node.start}`);
        carried.set(node, name);
        for (const dep of statementDeps(src, node)) await add(dep);
      }
      // A context (its creator resolves to React's createContext): only the chart kit / meter / panel own one, and none
      // that view-tabs already instantiates (one instance each).
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
        const callee = imports.get(init.callee.name);
        if (callee?.kind === 'react' && callee.name === 'createContext') {
          const message = !spec.contexts?.includes(name) ? `${spec.target}: ${spec.source}:${name} is a context this module does not declare in \`contexts\``
            : viewTabsBindings.get(spec.source)?.has(name) ? `${spec.target}: context ${spec.source}:${name} already lives in view-tabs` : null;
          if (message) {
            if (!explore) throw Error(message);
            explore.push({ target: spec.target, via: 'CONTEXT', local: name, size: message });
          }
          contexts.push(name);
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        assertFeatures(`${spec.target}: root ${name} (closure)`, closureText(src, name), spec.closureFeatures?.[name]);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'FEATURE', local: name, size: error.message });
      }
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    // One block per declaration node (a destructuring declarator binds several names), and the carried statements in
    // their original place.
    const nodes = new Map();
    for (const [, entry] of order) if (!nodes.has(entry.node)) nodes.set(entry.node, emittedText(src, entry));
    for (const node of carried.keys()) nodes.set(node, src.code.slice(node.start, node.end).replace(/;?$/, ';'));
    const blocks = [...nodes].sort((a, b) => a[0].start - b[0].start).map(([, text]) => text);
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
        'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'URL', 'BigInt', 'Boolean', 'window',
        'document', 'parseInt', 'parseFloat', 'isNaN', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'WeakMap', 'console',
]);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
      ...(contexts.length ? { contexts } : {}),
      ...(carried.size ? { carried: [...carried].sort((a, b) => a[0].start - b[0].start)
        .map(([node, writes]) => ({ writes, sha256: sha(src.code.slice(node.start, node.end)) })) } : {}),
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
      const count = [...text.matchAll(official.looseFeature(feature, { flags: 'g', keep: site.keep ?? [] }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, loose: true, features: site.features });
  }
  {
    const src = await readSource(measured.source);
    const local = src.exported.get(measured.export);
    if (local !== measured.local) throw Error(`${measured.source} exports ${measured.export} as ${local}, not ${measured.local}`);
    const size = closure(src, local);
    const chunks = new Set([...size.imports].map(i => i.split(':')[0]));
    // The adapter stands in for F3 while it stays this large; a much smaller F3 would be sliced instead.
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
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings [${m.bindings.map(b => b.name).join(' ')}]\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailContext({ check: process.argv.includes('--check') });
}
