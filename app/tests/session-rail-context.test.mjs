// R4i-rail RL3 (3.6556.2 since w3-rail-context): the Session rail's Context card.
//   cf74bc599 TN     `contextSection: l ? void 0 : s(L_, { scopeStore, sessionRef, openConnectors, openSkills, openMemory,
//                    mcpToolOpener })` (c73f45bc3 p = Lx).
//   c73f45bc3 Lx/Rx  _b's composer footer bridge, then the kit's RailCard "Context" (folded by default, `rollup: Ix`, the row
//                    actions Fx in c2d611398's ne context) around c227f4d5e F (F3) as `presentation: "inline", contextOnly: !0`.
//   c227f4d5e F3     not sliced (re-measured); its inline branch is the host's RailContextUsage, which renders the generated
//                    L3: _W's Compact session action and c2d611398 Le's rail layout.
// Nothing here launches Electron or a browser: the fake DOM is tests/fixtures/preview-r3b-dom.mjs, the desktop bridge a
// stub that answers from tables (no processes, no ports, no network, no real config).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;
const manifest = JSON.parse(read('src/generated/session-rail-context/manifest.json'));

let server, Rail, Compact, Tokens, Adapters, Shown, Breadcrumb, Card, Readout, Usage;
const ROOTS = new Set();
let savedWindow, savedDocument;
before(async () => {
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { document: globalThis.document, localStorage: undefined, addEventListener() {}, removeEventListener() {}, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Rail = await server.ssrLoadModule('/src/source-session-rail.jsx');
  Compact = await server.ssrLoadModule('/src/generated/session-rail-context/context-compact.mjs');
  Tokens = await server.ssrLoadModule('/src/generated/session-rail-context/context-tokens.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-context-adapters.jsx');
  Shown = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-shown-store.mjs');
  Card = await server.ssrLoadModule('/src/generated/session-rail-context/context-card.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  Readout = await server.ssrLoadModule('/src/generated/session-rail-context/chart-readout.mjs');
  Usage = await server.ssrLoadModule('/src/source-session-rail-context.jsx');
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});
after(async () => {
  for (const root of ROOTS) { try { root.unmount(); } catch { /* its DOM is gone */ } }
  Breadcrumb?.fileBrowserQueryClient.clear();
  await server?.close(); globalThis.window = savedWindow; globalThis.document = savedDocument;
});

// ---------------------------------------------------------------------------------------------------------------
test('official 3.6556.2: TN hands the rail L_ with the row openers, Lx / Rx / Ix / Fx, F3\'s inline branch, L3 / _W and Le\'s rail layout', () => {
  pin(official('cf74bc599-CRYqipWN.js'), ['l?void 0:s(L_,{scopeStore:n,sessionRef:t,openConnectors:Ue?qe:g,openSkills:Je?Ye:null,openMemory:v,mcpToolOpener:Ze})', 'p as L_']);
  const card = official('c73f45bc3-B7hbL7H9.js');
  pin(card, ['Lx as p', 'presentation:"inline",contextOnly:!0,inlineOpen:d,inlineIntentRef:g,sessionRef:a,modelId:s,onCompact:c,openRequest:l',
    'data-rail-context-pct', 'modelId:t.modelId,onShowUsageReport:t.onShowUsageReport,onCompact:t.onCompact,openRequest:n,creditOffered:r',
    'defaultMessage:"Manage connectors",id:"cqx+RdJnHp"', 'defaultMessage:"View memory files",id:"uGAx8N52ZS"', 'reveals:"agents"']);
  // "Context" is the card title (Rx) and the kit's section title table
  assert.equal(count(card, 'defaultMessage:"Context",id:"V2qutIKrxy"'), 2);
  const panel = official('c227f4d5e-B-FYKrwT.js');
  pin(panel, ['F3 as L', 'ce=oe===null&&L!==null&&!re?se??null:null', 'nt=ye||Qe||ce!==null', 'Wt=M?tt||!nt:tt||v&&!nt',
    'dt=i!==void 0&&!F&&(oe!==null||ce!==null)&&!ut', 'Mf(Ye,We,L===null&&ae?.stale===!1,!M)', 'r=pt??(Qe&&Je===null?0:null),a=ce!==null', 'y(L3,{sessionRef:t,onCompact:e,autoCompactSettable:n,',
    'y(S_,{...o,layout:"rail",liveTokens:r,compactAction:u,railSetting:g})', 'rW="__gb__4236285942"', 'S4="__gb__2706548410"',
    'defaultMessage:"Available when Claude finishes this turn",id:"tZl2bQVjIE"']);
  const le = official('c2d611398-Y2NVtf8_.js');
  pin(le, ['Fe="data-rail-context-summary"', 'defaultMessage:"Send a message to see context usage.",id:"4XCjSHnPX/"',
    'defaultMessage:"Send a message to see the breakdown.",id:"lKin9Ues9t"', 'defaultMessage:"Since last update",id:"aG22T1eEpE"',
    'defaultMessage:"{percent} used",id:"fNzhJnomJo"', 'Le as t', 'ne as c']);
});

test('generator: the modules, roots and adapters; F3 re-measured and stood in for; one copy of the kit\'s card', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.modules.map((m) => m.target), ['context-tokens.mjs', 'context-usage-shape.mjs', 'mcp-names.mjs', 'cds-frame-helpers.mjs',
    'idle-callback.mjs', 'chart-kit.mjs', 'chart-legend.mjs', 'chart-meter.mjs', 'chart-motion-value.mjs', 'chart-spring.mjs',
    'grapheme-split.mjs', 'chart-tooltip.mjs', 'chart-readout.mjs', 'version-compare.mjs', 'stale-engine-window.mjs', 'usage-fill.mjs',
    'focus-hand-off.mjs', 'telemetry-session-type.mjs', 'compact-messages.mjs', 'context-panel.mjs', 'context-compact.mjs', 'context-card.mjs']);
  const card = manifest.modules.find((m) => m.target === 'context-card.mjs');
  assert.deepEqual(card.exports, { Lx: 'SessionRailContext', Rx: 'RailContextCard', Ix: 'railContextRollup', Fx: 'railContextRowActions' });
  const via = (m, local) => m.imports.find((i) => i.local === local);
  assert.deepEqual([via(card, 'xx').kind, via(card, 'xx').name], ['session-rail-kit', 'RailCard']);
  assert.deepEqual([via(card, 'Po').kind, via(card, 'Po').name, via(card, 'Po').from], ['adapter', 'RailContextUsage', '../../source-session-rail-context.jsx']);
  assert.deepEqual([via(card, '_b').kind, via(card, '_b').name], ['adapter', 'useRailContextBridge']);
  assert.deepEqual([via(card, 'mo').kind, via(card, 'mo').name], ['generated', 'ContextRowActionsContext']);
  assert.deepEqual([via(card, 'bo').name, via(card, 'wi').name], ['RailPressRowButton', 'useCustomizeNouns']);
  const compact = manifest.modules.find((m) => m.target === 'context-compact.mjs');
  assert.equal(via(compact, 'S_').name, 'ContextUsagePanel');
  assert.equal(via(compact, 'yW').name, 'useCompactSendState');
  assert.equal(via(compact, 'vt').from, '../../source-session-rail-sections-adapters.jsx');
  for (const [local, name] of [['E4', 'useAutoCompactWindowConfig'], ['A4', 'useRunsOnThisComputer'], ['P4', 'AutoCompactWindowRow']])
    assert.deepEqual([via(compact, local).kind, via(compact, local).name], ['adapter', name]);
  // V3-w6-rail-host: pV's press mark EB is the kit's own export (one wB with TB), no longer a host no-op
  assert.deepEqual([via(compact, 'EB').kind, via(compact, 'EB').name, via(compact, 'EB').from], ['session-rail-kit', 'markRailPointerPress', '../session-rail-kit/rail-rows.mjs']);
  assert.ok(!/markRailPointerPress/.test(read('src/source-session-rail-context-adapters.jsx').replace(/^\/\/.*$/gm, '')), 'no host stand-in for EB');
  assert.ok(!compact.bindings.some((b) => b.name === 'F3'), 'F3 is not sliced');
  assert.ok(!compact.bindings.some((b) => b.name === 'EB' || b.name === 'wB'), 'the kit\'s press flag stays one copy');
  // view-tabs: the CDS components and the React Compiler helpers by their semantic names (E3)
  const panel = manifest.modules.find((m) => m.target === 'context-panel.mjs');
  assert.ok(panel.bindings.some((b) => b.name === 'J'));
  for (const [local, name] of [['v', 'CdsIcon'], ['_', 'CdsDisabledReason'], ['p', 'CdsButton'], ['D', 'CdsRelativeTime'], ['g', 'CdsSpinner'], ['J9', 'reactMemoCache']])
    assert.deepEqual([via(panel, local).kind, via(panel, local).name], ['view-tabs', name]);
  for (const m of manifest.modules) for (const i of m.imports.filter((i) => i.kind === 'view-tabs')) assert.ok(!/BfjMqbuN|DfPJ1QmD/.test(i.from), `${m.target}: ${i.from}`);
  const helpers = manifest.modules.find((m) => m.target === 'cds-frame-helpers.mjs');
  assert.deepEqual([via(helpers, 'jn').kind, via(helpers, 'ud').kind], ['view-tabs', 'view-tabs']);
  assert.equal(manifest.adapted.binding, 'F3');
  assert.ok(manifest.adapted.declarations >= 100 && manifest.adapted.imports >= 100, JSON.stringify(manifest.adapted));
  // the host modules never import each other back (no cycle with the generated area)
  assert.ok(!/from "\.\/generated\/session-rail-context\//.test(read('src/source-session-rail-context-adapters.jsx')));
  // the chart kit / meter and the panel own their contexts (no other area slices those chunks); every other module reads theirs
  // (w10-ccres-rail-readout: vendor-motion's MotionConfigContext Zc is working-line's one instance, imported)
  assert.deepEqual(manifest.modules.filter((m) => m.contexts).map((m) => [m.target, m.contexts]),
    [['chart-kit.mjs', ['S', 'b']], ['chart-meter.mjs', ['de']], ['context-panel.mjs', ['ne']]]);
  for (const target of manifest.modules.map((m) => m.target).filter((t) => !['chart-kit.mjs', 'chart-meter.mjs', 'context-panel.mjs'].includes(t)))
    assert.ok(!read(`src/generated/session-rail-context/${target}`).includes('createContext'), target);
  // E13: the GrowthBook keys stay in the pins and constants, never read through a GrowthBook client here
  assert.ok(read('src/source-session-rail-context-adapters.jsx').includes('enabled: false, armed: false'));
});

test('pure originals and host facts: qV, eB / tB, Jz / Yz, KX\'s engine branch, the host\'s window facts', () => {
  assert.deepEqual(Tokens.contextSummary(120000, 200000, false, false), { summary: '120k / 200k', contextPct: 60 });
  assert.deepEqual(Tokens.contextSummary(120000, 200000), { summary: '120k / 200k (60%)', contextPct: 60 });
  assert.deepEqual(Tokens.contextSummary(0, null, false, false), { summary: '0', contextPct: null });
  // the host's facts: the report's window, the core's auto-compact limit (Codex: 90%)
  const host = { usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x' };
  const facts = Adapters.railWindowFacts(host);
  assert.deepEqual(facts, { rawMaxTokens: 200000, liveModel: 'gpt-x', autoCompactThreshold: 180000, isAutoCompactEnabled: true });
  assert.equal(Adapters.railLiveContextTokens(host), 120000);
  assert.equal(Adapters.railWindowFacts({ usage: { last: { totalTokens: 5 } } }), null);
  assert.deepEqual(Adapters.railWindowFacts({ usage: { modelContextWindow: 1000 }, core: { engine: 'opencode' } }), { rawMaxTokens: 1000, liveModel: null });
  assert.deepEqual(Compact.autoCompactHint({ usage: facts, used: 120000, refType: 'local' }), { kind: 'left', tokens: 60000 });
  assert.deepEqual(Compact.autoCompactHint({ usage: facts, used: 160000, refType: 'local' }), { kind: 'soon' });
  assert.deepEqual(Compact.autoCompactHint({ usage: { rawMaxTokens: 1000 }, used: 5, refType: 'local' }), { kind: 'none' });
  const send = { hasHandler: true, owned: true, reach: 'live', turnArmed: false, responding: false, workerSaysWorking: false, compacting: false };
  assert.deepEqual(Compact.compactAvailability({ ...send, contextPct: 60, minPct: 50, contextTokens: 120000, minTokens: null }), { kind: 'enabled' });
  assert.deepEqual(Compact.compactAvailability({ ...send, contextPct: 40, minPct: 50, contextTokens: 80000, minTokens: null }), { kind: 'hidden' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, responding: true }), { kind: 'disabled', reason: 'replying' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, reach: 'detached' }), { kind: 'disabled', reason: 'reconnect' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, compacting: true }), { kind: 'hidden' });
  assert.deepEqual(Compact.contextWindowMax({ usage: null, windowFacts: facts, liveModel: 'gpt-x', pickedModel: null, servedWindows: {}, engineVersion: null }),
    { kind: 'engine', max: 200000 });
  assert.deepEqual(Compact.contextWindowView({ kind: 'engine', max: 200000 }, null, facts), { usage: null, windowFacts: facts });
  assert.equal(Compact.STALE_COMPACT_DEFAULTS.minContextPct, 75);
});

// L3 / Le / J rendered on their own (react-dom/server), without the rail mount: the 3.6556.2 rail layout markup.
test('SSR (3.6556.2): L3 over Le\'s rail layout — headline, bar, Compact session, window-only text, a fresh 0%, J with "Since last update"', () => {
  const host = { usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x', running: false, connected: true };
  const facts = Adapters.railWindowFacts(host);
  const render = (props) => renderToString(h(Adapters.SessionRailContextHostContext.Provider, { value: host }, h(Compact.RailContextPanel, props)));
  const base = { sessionRef: { id: 's1', type: 'local' }, onCompact: () => {}, autoCompactSettable: false, contextTokens: 120000, contextTokensOutdated: false, cold: false,
    summary: '120k / 200k', contextPct: 60, contextUsage: null, windowFacts: facts, isFetching: false, staleSince: null, turnRunning: false, noData: false,
    reportDue: false, windowOnly: true, staleEngineNotice: null, expanded: true, onToggle() {}, memoryFileLink: undefined };
  const html = render(base);
  // Be: the headline (data-rail-context-summary / -pct on the summary), ze: the bar over the chart reference tint
  assert.ok(html.includes('class="flex min-w-0 items-baseline justify-between gap-sm text-body"'), html);
  assert.ok(html.includes('60% used'), html);
  assert.match(html, /data-rail-context-summary="" data-rail-context-pct="60"[^>]*>120k \/ 200k</);
  assert.match(html, /class="h-\[4px\] rounded-full overflow-hidden" style="background-color:var\(--cds-chart-reference-tint\)" role="progressbar" aria-label="Context window" aria-valuenow="60"/);
  // Ve: _W's enabled action with uW's hint ("{tokens} until auto-compact": 180000 - 120000)
  assert.ok(html.includes('60k until auto-compact'), html);
  assert.ok(html.includes('Compact session'), html);
  // Le, window-only (a count over the live window, no /context report): "Send a message to see the breakdown." (lKin9Ues9t)
  assert.ok(html.includes('Send a message to see the breakdown.'), html);
  assert.ok(!render({ ...base, windowOnly: false }).includes('Send a message to see the breakdown.'));
  // E4 off (E13): no auto-compact window row
  assert.ok(!html.includes('hkc1yt'));
  // a fresh session: F3 hands contextPct 0 (r = pt ?? (Qe && Je === null ? 0 : null)), so Be reads 0% used
  const fresh = render({ ...base, contextTokens: null, summary: '0', contextPct: 0, windowFacts: null, windowOnly: false, onCompact: undefined });
  assert.ok(fresh.includes('0% used'), fresh);
  assert.ok(!fresh.includes('Compact session'), fresh);
  // no data: Le's text
  assert.ok(render({ ...base, noData: true, windowOnly: false }).includes('Send a message to see context usage.'));
  // J (te): live tokens beyond the report's used rows get a "Since last update" row
  const report = { categories: [{ name: 'System prompt', tokens: 6000, kind: 'used', color: 'promptBorder' }, { name: 'Messages', tokens: 14000, kind: 'used', color: 'purple_FOR_SUBAGENTS_ONLY' },
    { name: 'Free space', tokens: 180000, kind: 'free', color: 'promptBorder' }], totalTokens: 20000, rawMaxTokens: 200000, maxTokens: 200000, percentage: 10, mcpTools: [], memoryFiles: [], agents: [] };
  const breakdown = render({ ...base, contextUsage: report, contextTokens: 30000, summary: '30k / 200k', contextPct: 15, windowOnly: false });
  assert.ok(breakdown.includes('data-cds="StackedMeter"'), breakdown);
  assert.ok(breakdown.includes('Since last update'), breakdown);
  assert.ok(!render({ ...base, contextUsage: report, contextTokens: 20000, summary: '20k / 200k', contextPct: 10, windowOnly: false }).includes('Since last update'));
});

// w10-ccres-rail-readout: c91b6e9db M's success branch. The StackedMeter's readout card (c6b47b88e o, exported ReadoutCard)
// over the chart tooltip kit cddbfc1b6 (J: the popover on two springs, X: heading over the row grid, Z: the rows).
test('readout card (3.6556.2): the generator slices c6b47b88e / cddbfc1b6 / c0ce8f953 / ca74e9c4f; M\'s loader resolves to ReadoutCard', async () => {
  const S = (name) => official(name);
  const readoutChunk = S('c6b47b88e-C-bftS07.js');
  pin(readoutChunk, ['export{o as ReadoutCard}', 'e.key==="Escape"&&!e.isComposing', 'plotLeft:0,domainAxis:"y",crosshairPx:C,domainHalfExtentPx:w']);
  pin(S('c91b6e9db-0Cdn02JS.js'), ['"cds_stacked_meter_readout"', 'default:e?.ReadoutCard??j']);
  pin(S('cddbfc1b6-D5UtgtfD.js'), ['popover:"manual"', 'stiffness:950,damping:55,mass:.85']);
  // L shows (and warms) the card only for a "lg" meter: E = size === "lg", q = K && E. The rail's breakdown J (c2d611398)
  // groups its meters at "sm" or the default size, so in the rail the per-segment tooltips stay, as in the original.
  pin(S('c91b6e9db-0Cdn02JS.js'), ['E=S.size==="lg"', 'q=K&&E', 'J=()=>q?re(ye,{timeout:2e3,fallbackDelay:200}):void 0']);
  pin(S('c2d611398-Y2NVtf8_.js'), ['X=_?"sm":void 0']);
  assert.equal(count(S('c2d611398-Y2NVtf8_.js'), '"lg"'), 0);
  const mod = (target) => manifest.modules.find((m) => m.target === target);
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  for (const [target, source, exports] of [
    ['chart-readout.mjs', 'c6b47b88e-C-bftS07.js', { o: 'ReadoutCard' }],
    ['chart-tooltip.mjs', 'cddbfc1b6-D5UtgtfD.js', { Z: 'ChartTooltipRow', X: 'ChartTooltipBody', J: 'ChartTooltip' }],
    ['chart-spring.mjs', 'c0ce8f953-DPnHAvZz.js', { k: 'useSpring' }],
    ['chart-motion-value.mjs', 'ca74e9c4f-Bd6thou8.js', { o: 'useMotionValue' }],
    ['grapheme-split.mjs', 'shared-2-TF8v67kg.js', { Sp: 'graphemeSegments' }],
  ]) {
    const m = mod(target);
    assert.equal(m.source, source, target);
    assert.deepEqual(m.exports, exports, target);
    assert.equal(m.referenceVersion, '3.6556.2', target);
    assert.equal(m.sourceSha256, sha(fs.readFileSync(path.join(v1, source))), target);
    assert.equal(m.sha256, sha(read(`src/generated/session-rail-context/${target}`)), target);
  }
  const via = (m, local) => m.imports.find((i) => i.local === local);
  const readout = mod('chart-readout.mjs');
  // the card's three tooltip parts come from chart-tooltip, the mark kinds from the chart kit (one context instance)
  assert.deepEqual(['r', 'i', 'a', 'n'].map((l) => [via(readout, l).from, via(readout, l).name]), [['./chart-tooltip.mjs', 'ChartTooltipRow'],
    ['./chart-tooltip.mjs', 'ChartTooltipBody'], ['./chart-tooltip.mjs', 'ChartTooltip'], ['./chart-kit.mjs', 'useChartMarkKinds']]);
  const tooltip = mod('chart-tooltip.mjs');
  assert.deepEqual([via(tooltip, 'm').name, via(tooltip, 'd').kind, via(tooltip, 'd').name, via(tooltip, 'p').kind, via(tooltip, 'p').name,
    via(tooltip, '_').name, via(tooltip, 'C').name, via(tooltip, 'S').name],
  ['useSpring', 'session-rail-kit', 'useReducedMotion', 'code-composer', 'textDirectionOf', 'CHART_TOOLTIP_BAND_FRACTION', 'CHART_DIMMED_OPACITY', 'ChartSwatchMark']);
  // D1: framer-motion exists once. The motion values, frame loop, spring generator and MotionConfigContext the card's
  // springs reach are working-line/vendor-motion.mjs's (its linkExports); this area slices none of vendor-motion.
  assert.ok(!manifest.modules.some((m) => m.source === 'vendor-motion-DlXQpU4V.js'), 'no vendor-motion slice here');
  assert.ok(!fs.existsSync(path.join(app, 'src/generated/session-rail-context/chart-motion.mjs')));
  assert.ok(!manifest.modules.some((m) => 'pendingLink' in m));
  const motionImports = manifest.modules.flatMap((m) => m.imports.filter((i) => i.original?.startsWith('vendor-motion-DlXQpU4V.js:')).map((i) => [m.target, i]));
  assert.deepEqual([...new Set(motionImports.map(([, i]) => i.original.split(':')[1]))].sort(),
    ['En', 'F', 'G', 'K', 'M', 'N', 'Qr', 'S', 'Sn', 'Zc', 'hn', 'un', 'vn', 'x']);
  for (const [target, i] of motionImports) assert.deepEqual([i.kind, i.from, i.name], ['working-line', '../working-line/vendor-motion.mjs', i.original.split(':')[1]], target);
  const workingLine = JSON.parse(read('src/generated/working-line/manifest.json')).modules.find((m) => m.target === 'vendor-motion.mjs');
  for (const [, i] of motionImports) assert.ok(workingLine.linkExports.includes(i.name) && workingLine.bindings.some((b) => (b.name ?? b) === i.name), i.name);
  // what the generator's own feature pins checked before (the original declarations, now sliced once in working-line)
  pin(S('vendor-motion-DlXQpU4V.js'), ['isStatic:!1,', 'reducedMotion:"never"']);
  pin(S('vendor-motion-DlXQpU4V.js'), ['performance.now()', 'this.isResolved=!1'], 2);
  pin(S('vendor-motion-DlXQpU4V.js'), ['canTrackVelocity'], 4);
  assert.ok(manifest.callSites.some((c) => c.source === 'c6b47b88e-C-bftS07.js'));
  // the host loader takes M's success branch (no longer the fixed failure branch)
  const host = read('src/source-session-rail-context.jsx');
  assert.ok(host.includes('import("./generated/session-rail-context/chart-readout.mjs").then('), host);
  assert.ok(host.includes('(e) => ({ default: e?.ReadoutCard ?? NO_READOUT })') && host.includes('() => ({ default: NO_READOUT })'));
  assert.ok(!host.includes('Promise.resolve({ default: NO_READOUT })'));
  const loaded = await Usage.loadStackedMeterReadout();
  assert.equal(loaded.default, Readout.ReadoutCard);
  assert.equal(await Usage.loadStackedMeterReadout(), loaded, 'le ??= …: one load');
});

const READOUT_ROWS = [
  { id: 'messages', label: 'Messages', paint: 'var(--cds-chart-categorical-1)', amount: '14k', share: '7%' },
  { id: 'system', label: 'System prompt', paint: 'var(--cds-chart-categorical-2)', amount: '6k', share: '3%' },
];
test('SSR (3.6556.2): ReadoutCard — the popover, the <bdi> heading, the notes grid and the pointed row emphasized', () => {
  const html = renderToString(h(Readout.ReadoutCard, { barRef: { current: null }, width: 240, thickness: 8, x: 40, heading: 'Context window',
    rows: READOUT_ROWS, pointedId: 'messages', above: false, onDismiss() {} }));
  // J: the manual popover, aria-hidden, the CDS tooltip surface
  assert.match(html, /^<div popover="manual" aria-hidden="true" style="box-sizing:border-box" class="pointer-events-none absolute left-0 top-0 z-10 m-0 block w-max overflow-visible rounded border bg-surface-popover px-sm py-xs font-normal shadow-popover \[inset:0_auto_auto_0\]">/, html);
  // X: the heading (the card's <bdi>) over the four-column notes grid
  assert.ok(html.includes('<div class="text-caption text-secondary"><bdi>Context window</bdi></div>'), html);
  assert.ok(html.includes('<div class="grid grid-cols-[auto_auto_auto_1fr] items-center gap-x-xs gap-y-xs pt-xs">'), html);
  // Z per row: the swatch (O, a bar mark without a mark kind: 10×2), value, share, label; the pointed one emphasized
  assert.ok(html.includes('<span aria-hidden="true" class="shrink-0 forced-color-adjust-none" style="width:10px;height:2px;border-radius:1px;background:var(--cds-chart-categorical-1);display:inline-block"></span>'), html);
  assert.ok(html.includes('<span class="text-footnote font-medium tabular-nums text-primary"><bdi>14k</bdi></span><span class="text-footnote tabular-nums text-secondary"><bdi>7%</bdi></span>'), html);
  assert.ok(html.includes('<span dir="auto" data-emphasized="true" class="truncate max-w-[240px] justify-self-start text-footnote text-primary">Messages</span>'), html);
  assert.ok(html.includes('<span dir="auto" class="truncate max-w-[240px] justify-self-start text-footnote text-secondary">System prompt</span>'), html);
  // no heading: X still draws its heading div, empty (the card hands it `void 0`, no <bdi>)
  const bare = renderToString(h(Readout.ReadoutCard, { barRef: { current: null }, width: 240, thickness: 8, x: 40, rows: READOUT_ROWS, pointedId: null, above: false, onDismiss() {} }));
  assert.ok(bare.includes('<div class="text-caption text-secondary"></div>'), bare);
  assert.ok(!bare.includes('data-emphasized'), bare);
});

test('ReadoutCard mounted: J places it across the bar by crosshairPx (thickness / 2) and the bar\'s half extent; Escape dismisses it', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    for (const [key, value] of [['clientWidth', 1200], ['clientHeight', 800]]) Object.defineProperty(dom.document.documentElement, key, { value, configurable: true });
    const mount = async (above) => {
      const bar = dom.document.body.appendChild(dom.document.createElement('div'));
      bar.getBoundingClientRect = () => ({ x: 0, y: 100, top: 100, left: 0, right: 240, bottom: 108, width: 240, height: 8 });
      const container = dom.document.body.appendChild(dom.document.createElement('div'));
      const root = createRoot(container);
      ROOTS.add(root);
      let dismissed = 0;
      await act(async () => { root.render(h(Readout.ReadoutCard, { barRef: { current: bar }, width: 240, thickness: 8, x: 40, heading: 'Context window',
        rows: READOUT_ROWS, pointedId: 'messages', above, onDismiss: () => { dismissed += 1; } })); });
      const card = container.querySelector('[popover="manual"]');
      return { card, dismissed: () => dismissed, root };
    };
    // below the bar (`preferredSide` unset, "after"): crosshairPx 4 + domainHalfExtentPx 4 + 8 past the bar's top edge
    const below = await mount(false);
    assert.equal(below.card.style.transform, 'translate3d(40px, 16px, 0)');
    // a touch ("finger", `above`): the "before" side, 4 - 4 - 8 - its height above the bar's top edge
    const above = await mount(true);
    assert.equal(above.card.style.transform, 'translate3d(40px, -8px, 0)');
    // Escape on the bar's document (captured keydown) calls onDismiss; other keys and composition do not
    const key = (k, extra = {}) => { let prevented = false; dom.document.dispatchEvent({ type: 'keydown', key: k, isComposing: false, preventDefault() { prevented = true; }, stopPropagation() {}, ...extra }); return prevented; };
    assert.equal(key('ArrowDown'), false);
    assert.equal(below.dismissed() + above.dismissed(), 0);
    key('Escape', { isComposing: true });
    assert.equal(below.dismissed() + above.dismissed(), 0);
    assert.equal(key('Escape'), true);
    assert.equal(below.dismissed(), 1);
    assert.equal(above.dismissed(), 1);
    for (const m of [below, above]) { await act(async () => { m.root.unmount(); }); ROOTS.delete(m.root); }
    assert.equal(dom.document.listeners('keydown'), 0, 'the listener goes with the card');
  });
});

// Lx / Rx on their own (react-dom/server), the kit's RailCard around F3's stand-in, without the rail mount.
test('SSR (3.6556.2): Lx renders the kit\'s "Context" card only with a bridge; Rx folded keeps the rail layout mounted', () => {
  const state = { openComposerMenu: null };
  const scope = { getState: () => state, getInitialState: () => state, subscribe: () => () => {}, setState() {} };
  const host = { usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x', running: false, connected: true, onCompact() {} };
  const render = (value) => renderToString(h(Adapters.SessionRailContextHostContext.Provider, { value }, h(Card.SessionRailContext, { scopeStore: scope, sessionRef: { id: 's1', type: 'local' } })));
  assert.equal(render(null), '', '_b: no bridge, no card');
  const folded = render(host);
  // the kit's RailCard (c73f45bc3 xx): the header div, the "Context" trigger folded by default (o6), the panel kept hidden
  assert.match(folded, /<div id="[^"]+" class="flex min-w-0 flex-1 rounded group-data-\[rail-menu-open\]\/railtop:bg-alpha-1"><button [^>]*aria-expanded="false"/);
  assert.ok(folded.includes('<span class="shrink-0">Context</span>'), folded);
  assert.match(folded, /<div data-closed="" hidden=""[^>]*data-rail-panel=""/);
  assert.ok(!folded.includes('Send a message to see the breakdown.'), 'Le: the window-only text waits for the card to open');
  // the panel stays mounted while folded (hidden): Rx's F3 stand-in already reads the host (Be / ze / Ve under it)
  assert.ok(folded.includes('60% used'), folded);
  assert.match(folded, /data-rail-context-summary="" data-rail-context-pct="60"/);
  assert.ok(folded.includes('Compact session'), folded);
});

// ---------------------------------------------------------------------------------------------------------------
const ROOT = '/Users/me/widgets';
function desktopFor(records = {}) {
  return createDesktop({
    'session-rail-meta': ({ sessionId }) => records[sessionId] ?? null,
    'monitor-state': () => [], 'schedule-state': () => [],
    'repo-identities': ({ cwds }) => Object.fromEntries(cwds.map((cwd) => [cwd, { isRepo: true, toplevel: ROOT, owner: 'me', name: 'widgets' }])),
  });
}
function hostFor(desktop, over = {}) {
  return {
    call: desktop.call, desktop, cwd: ROOT, recordKey: 'live', mountKey: 's1', isPanelActive: true, readOnly: false, transcriptRef: { current: null },
    items: [], gitStatus: { isRepo: true, cwd: ROOT, branch: 'main', hasChanges: false, added: 0, removed: 0 },
    changes: { diffOpenable: false, onOpen() {}, onToggle() {}, hasChord: true, verb: null },
    preview: { available: false, snapshot: null }, openPanes: new Set(['chat']), openPane() {},
    tasks: [], stopTask: async () => {}, openTasks() {}, openFile() {}, revealFolder() {}, copyText() {}, openTerminal() {},
    environmentId: undefined, savedEnvironments: [], recentFolders: [], openLocalEnvironment() {},
    ...over,
  };
}
function Tile({ host }) {
  const rail = Rail.useSessionRail({ enabled: true, sessionId: 's1' });
  return h('div', { className: 'source-chat-tile-content' },
    h('button', { ref: rail.railToggleRef, type: 'button', onClick: rail.railToggle?.onToggle }, 'toggle'),
    h(Rail.SessionRailRow, { rail, host },
      h('div', { className: 'conversation' }, h(Rail.SessionRailChatBody, null, h('div', null, 'transcript'))),
      h(Rail.SessionRailColumn)));
}
const flush = async (times = 6) => { for (let i = 0; i < times; i++) await act(async () => { await new Promise((resolve) => setImmediate(resolve)); }); };
function prepare(dom) {
  if (dom.__railPrepared) return;
  dom.__railPrepared = true;
  const style = dom.window.getComputedStyle;
  dom.window.getComputedStyle = (node) => ({ ...style(node), animationName: 'none', animationDuration: '0s', transitionDuration: '0s' });
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  if (typeof dom.document.getElementById !== 'function') dom.document.getElementById = (id) => dom.document.querySelector(`[id="${id}"]`);
  Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
  const rect = dom.Element.prototype.getBoundingClientRect;
  dom.Element.prototype.getBoundingClientRect = function () {
    return (this.getAttribute('class') ?? '').split(/\s+/).includes('@container') ? { x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600 } : rect.call(this);
  };
}
async function mountTile(dom, host) {
  prepare(dom);
  Shown.sessionRailShownStore.setState({ shown: true });
  const container = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(container);
  ROOTS.add(root);
  await act(async () => { root.render(h(Tile, { host })); });
  await flush();
  return { container, root, rerender: async (next) => { await act(async () => { root.render(h(Tile, { host: next })); }); await flush(); } };
}
const aside = (container) => container.querySelector('aside[aria-label="Session details"]');
const contextCard = (container) => aside(container)?.querySelector('[data-rail-card="context"]') ?? null;
// fO always hands the rail the cg element; without a bridge iy renders nothing inside the slot (as the original). Never
// pass a DOM node to assert: node:assert would inspect the whole fake document.
const cardText = (container) => contextCard(container)?.textContent ?? '';
const click = async (node) => { await act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, nativeEvent: {} }); }); await flush(); };
const contextOf = (over = {}) => ({ usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x',
  running: false, connected: true, compacting: false, fresh: false, onCompact: undefined, ...over });

test('fO stand-in: the Context card (folded by default), its headline, bar, Compact session and auto-compact hint', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const compacts = [];
    const { container, root, rerender } = await mountTile(dom, hostFor(desktop, { context: contextOf({ onCompact: () => compacts.push('compact') }) }));
    const card = contextCard(container);
    assert.ok(card !== null, aside(container)?.textContent);
    assert.ok(card.textContent.includes('Context'), card.textContent);
    const fold = [...card.querySelectorAll('[aria-expanded]')][0];
    assert.equal(fold?.getAttribute('aria-expanded'), 'false', 'kZ folds Context by default');
    await click(fold);
    const open = contextCard(container);
    assert.ok(open.textContent.includes('60% used'), open.textContent);
    assert.ok(open.textContent.includes('120k / 200k'), open.textContent);
    assert.ok(!open.textContent.includes('(60%)'), 'td(…, !w): the inline summary has no percent');
    const summary = open.querySelector('[data-rail-context-summary]');
    assert.equal(summary?.getAttribute('data-rail-context-pct'), '60');
    const bar = open.querySelector('[role="progressbar"]');
    assert.equal(bar?.getAttribute('aria-valuenow'), '60');
    assert.equal(bar?.getAttribute('aria-label'), 'Context window');
    assert.ok(open.textContent.includes('60k until auto-compact'), open.textContent);
    const button = [...open.querySelectorAll('button')].find((b) => b.textContent.includes('Compact session'));
    assert.ok(button, open.textContent);
    assert.equal(button.disabled, false);
    await click(button);
    assert.deepEqual(compacts, ['compact']);
    // a running turn: Yz "replying" (lB keeps the original "Claude", D23)
    await rerender(hostFor(desktop, { context: contextOf({ onCompact: () => {}, running: true }) }));
    const busy = [...contextCard(container).querySelectorAll('button')].find((b) => b.textContent.includes('Compact session'));
    assert.equal(busy?.disabled, true);
    assert.equal(Compact.compactDisabledReason({ formatMessage: (m) => m.defaultMessage }, 'replying'), 'Available when Claude finishes this turn');
    // below oB's minPct 50: no compact row
    await rerender(hostFor(desktop, { context: contextOf({ onCompact: () => {}, usage: { last: { totalTokens: 40000 }, modelContextWindow: 200000 } }) }));
    assert.ok(![...contextCard(container).querySelectorAll('button')].some((b) => b.textContent.includes('Compact session')));
    assert.ok(contextCard(container).textContent.includes('20% used'));
    // no session handler: qe false, no row
    await rerender(hostFor(desktop, { context: contextOf() }));
    assert.ok(![...contextCard(container).querySelectorAll('button')].some((b) => b.textContent.includes('Compact session')));
    // no report yet: og's noData text
    await rerender(hostFor(desktop, { context: contextOf({ usage: null }) }));
    assert.ok(contextCard(container).textContent.includes('Send a message to see context usage.'), contextCard(container).textContent);
    // a fresh session (Ie): context mode with nothing used and no window
    await rerender(hostFor(desktop, { context: contextOf({ usage: null, fresh: true }) }));
    const fresh = contextCard(container);
    assert.ok(!fresh.textContent.includes('Send a message'), fresh.textContent);
    assert.equal(fresh.querySelector('[data-rail-context-summary]')?.textContent, '0');
    // F3 `r = pt ?? (Qe && Je === null ? 0 : null)`: a fresh session's headline reads 0% used (3.6556.2)
    assert.ok(fresh.textContent.includes('0% used'), fresh.textContent);
    // no context source: Q_ has no bridge, the card renders nothing
    await rerender(hostFor(desktop));
    assert.equal(cardText(container), '');
    assert.equal(contextCard(container)?.querySelector('[data-rail-context-summary]') ?? null, null);
    // read-only: fO passes no contextSection
    await rerender(hostFor(desktop, { readOnly: true, context: contextOf() }));
    assert.equal(cardText(container), '');
    await act(async () => { root.unmount(); });
  });
});

test('main and the host view wire the card; zh-CN covers its copy', () => {
  const main = read('src/main.jsx');
  pin(main, ['context: current ? { usage: state.usage[current] ?? null, core: boot?.core, modelId: model || null,',
    'onCompact: !session?.archived && !unsupportedMethods?.includes("thread/compact/start") ? () => executeCommand("compact") : undefined } : undefined,']);
  const view = read('src/source-session-rail.jsx');
  // V3-w6-rail-host: TN's L_ openers (openConnectors: Ue ? qe : g; openSkills: Je ? Ye : null; openMemory: v; mcpToolOpener: Ze)
  // (w10-ccres-rail-openers: openSkills is the host's Customize › Skills opener, null without it — TN's `Je ? Ye : null`)
  pin(view, ['contextSection={o ? undefined : <SessionRailContext scopeStore={t} sessionRef={e} openConnectors={p} openSkills={host.openSkills ?? null} openMemory={v} mcpToolOpener={NO_MCP_TOOL_OPENER} />}',
    'const v = useStore(t, (state) => state.openMemoryDialog);',
    '<SessionRailContextHostContext.Provider value={host.context ?? null}>{wt}</SessionRailContextHostContext.Provider>']);
  assert.equal(count(view, 'contextSection={undefined}'), 0);
  const zh = read('electron/i18n/zh-CN/session.mjs');
  pin(zh, ['// R4i-rail RL3:', '"Available when Claude finishes this turn": "Claude 完成本轮后可用",', '"{percent} used": "已用 {percent}",',
    '"Send a message to see context usage.": "发送一条消息即可查看上下文用量。",']);
});

// context-breakdown: c2d611398 H in og's rail layout over the host's categories report (main's "context-usage", read
// while the card is open): the StackedMeter replaces the plain bar, then H's ue rows (used rows by size, the buffer, Free
// space), the MCP tools / Memory files sub-lists.
test('context-breakdown: the unfolded card reads the categories and draws H\'s meter and rows', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const reads = [];
    const counts = { categories: { systemPrompt: { tokens: 6000 }, systemTools: { tokens: 12000 }, mcpTools: { tokens: 3000 }, memoryFiles: { tokens: 1500 }, skills: { tokens: 900 }, mcpServerInstructions: { tokens: 600 } },
      memoryFiles: [{ path: '/Users/me/widgets/AGENTS.md', type: 'Project', tokens: 1500 }], mcpTools: [{ name: 'update_plan', serverName: 'code_desktop', tokens: 3000, isLoaded: true }], agents: [] };
    const context = contextOf({ usage: { last: { totalTokens: 64400 }, modelContextWindow: 262100 }, core: { engine: 'deepseek-harness' }, contextUsageId: 's1',
      readContextUsage: async (id) => { reads.push(id); return counts; } });
    const { container, root } = await mountTile(dom, hostFor(desktop, { context }));
    // the card's fold is the rail's per-session section state (an earlier test may have unfolded it): read only once open
    const fold = [...contextCard(container).querySelectorAll('[aria-expanded]')][0];
    if (fold.getAttribute('aria-expanded') === 'false') {
      assert.deepEqual(reads, [], 'nothing is read while the card is folded');
      await click(fold);
    }
    await flush();
    assert.deepEqual(reads, ['s1']);
    const card = contextCard(container);
    const text = card.textContent;
    assert.ok(text.includes('25% used'), text);
    const meter = card.querySelector('[data-cds="StackedMeter"]');
    assert.ok(meter, 'the StackedMeter replaces je');
    assert.ok((meter.getAttribute('aria-label') ?? '').startsWith('Context window: '), meter.getAttribute('aria-label'));
    // ue rows: used categories by size (Messages = 64400 - 24000 = 40400 first), then Free space (no threshold: no buffer);
    // MCP server instructions is Claude Code 2.1.299's row
    const order = ['Messages', 'System tools', 'System prompt', 'MCP tools', 'Memory files', 'Skills', 'MCP server instructions', 'Free space'];
    let at = -1;
    for (const name of order) { const next = text.indexOf(name, at + 1); assert.ok(next > at, `${name} after the previous row: ${text}`); at = next; }
    assert.ok(text.includes('40.4k'), text);
    assert.ok(text.includes('15.4%'), text);
    assert.ok(!text.includes('Autocompact buffer'), text);
    // de's sub-lists (q, rail): MCP tools and Memory files toggles with their counts
    const toggles = [...card.querySelectorAll('button[aria-expanded]')].map((b) => b.textContent);
    assert.ok(toggles.some((label) => label.includes('MCP tools1')), JSON.stringify(toggles));
    assert.ok(toggles.some((label) => label.includes('Memory files1')), JSON.stringify(toggles));
    // no session MCP opener on the scope store: Fx gives the MCP tools row no action (a plain row, no press)
    assert.ok(!text.includes('Manage connector'), text);
    await act(async () => { root.unmount(); });
  });
});

// V3-w6-rail-host: TN hands L_ `openConnectors: Ue ? qe : g` (a local session: the scope store's openSessionMcpDialog),
// `openSkills: Je ? Ye : null` (this host passes no openSkills, i.e. main's opener while the core is disconnected: null;
// the connected opener is tests/rail-openers-w10.test.mjs), `openMemory: v` (openMemoryDialog, null here) and
// `mcpToolOpener: PA(…)` (no connector directory: every tool answers undefined). Fx then makes the MCP tools category row
// se's press row (Y over pV: EB marks the pointer press, then the opener) with the sr-only "Manage connectors" hint.
test('context openers: the MCP tools row opens the session MCP opener; tool rows and Skills stay plain; memory reveals', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const counts = { categories: { systemPrompt: { tokens: 6000 }, mcpTools: { tokens: 3000 }, memoryFiles: { tokens: 1500 }, skills: { tokens: 900 } },
      memoryFiles: [{ path: '/Users/me/widgets/AGENTS.md', type: 'Project', tokens: 1500 }], mcpTools: [{ name: 'update_plan', serverName: 'code_desktop', tokens: 3000, isLoaded: true }], agents: [] };
    const context = contextOf({ usage: { last: { totalTokens: 64400 }, modelContextWindow: 262100 }, core: { engine: 'deepseek-harness' }, contextUsageId: 's1',
      readContextUsage: async () => counts });
    const opened = [];
    const { container, root } = await mountTile(dom, hostFor(desktop, { context, openSessionMcpDialog: (...args) => { opened.push(args); } }));
    try {
      const fold = [...contextCard(container).querySelectorAll('[aria-expanded]')][0];
      if (fold.getAttribute('aria-expanded') === 'false') await click(fold);
      await flush();
      const card = contextCard(container);
      const hints = [...card.querySelectorAll('button .sr-only')].map((n) => n.textContent);
      assert.equal(hints.filter((t) => t === 'Manage connectors').length, 1, JSON.stringify(hints));
      // the Skills row has no opener (this host's openSkills is absent, so null), no MCP tool row has one (PA without a directory)
      assert.ok(!hints.includes('Manage skills'), JSON.stringify(hints));
      assert.ok(!hints.includes('Manage connector'), JSON.stringify(hints));
      // openMemory null: the Memory files row keeps its reveal ("View memory files")
      assert.ok(hints.includes('View memory files'), JSON.stringify(hints));
      const row = [...card.querySelectorAll('button')].find((b) => b.querySelector('.sr-only')?.textContent === 'Manage connectors');
      assert.ok(row.textContent.startsWith('MCP tools'), row.textContent);
      await click(row);
      assert.equal(opened.length, 1);
    } finally { await act(async () => { root.unmount(); }); }
  });
});
