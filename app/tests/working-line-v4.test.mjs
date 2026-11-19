// Region batch 2b (working-line, region-plan G6): the isolated 4.16336.0 graph of the Code transcript's working line
// (src/generated/working-line-v4, scripts/extract-working-line-v4.mjs over the shared runSlicer engine, sharedGraph
// cds-core). The 3.6556.2 graph (src/generated/working-line, scripts/extract-working-line.mjs) keeps serving the host and
// the ten 3.6556.2 consumers that link it by original identity until the batch-10 cutover; tests/working-line.test.mjs
// keeps pinning it. Official code is never executed: the generated modules are rendered, the chunks only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as v4 from '../scripts/official-4.16336.0.mjs';
import { WORKING_LINE } from '../scripts/extract-working-line.mjs';
import { extractWorkingLineV4, locateRootsV4, surveyWorkingLineV4, rootsV4, WORKING_LINE_V4, WORKING_LINE_V4_OUTPUT } from '../scripts/extract-working-line-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, WORKING_LINE_V4_OUTPUT);
const legacyDir = path.join(app, 'src/generated/working-line');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const roots = JSON.parse(fs.readFileSync(path.join(out, 'roots.json'), 'utf8'));
const cdsCore = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };

// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
// router store (reads window.location.pathname at load), as in the app.
globalThis.document ??= { cookie: '', createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, head: { appendChild() {} } };
// W8 stub contract (design class c): cds-core now holds shared-92 cS, which reads documentElement.hasAttribute at load.
globalThis.document.documentElement ??= { hasAttribute: () => false, getAttribute: () => null, setAttribute() {}, removeAttribute() {}, classList: { add() {}, remove() {}, contains: () => false }, style: {} };
const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const Line = await server.ssrLoadModule(`/${WORKING_LINE_V4_OUTPUT}/working-line.mjs`);
const Rows = await server.ssrLoadModule(`/${WORKING_LINE_V4_OUTPUT}/turn-status-rows.mjs`);
// The props X5 (the desktop's feed, pinned call site) always passes, with their empty values: the line itself has no
// defaults for them (`thinking === null`, `apiRetry !== null`).
const feed = { sessionId: null, turnStartTime: null, thinking: null, apiRetry: null, waiting: null };
const render = props => renderToStaticMarkup(React.createElement(Rows.TurnStatusRowsOverride, { value: true }, React.createElement(Line.WorkingLine, { ...feed, ...props })));

test('the 4.16336.0 contract regenerates byte for byte; the 3.6556.2 contract is untouched', async () => {
  const checked = await quiet(() => extractWorkingLineV4({ check: true }));
  assert.deepEqual(checked, manifest);
  assert.equal(WORKING_LINE.referenceVersion, '3.6556.2');
  assert.equal(WORKING_LINE.output, legacyDir);
  assert.equal(JSON.parse(fs.readFileSync(path.join(legacyDir, 'manifest.json'), 'utf8')).referenceVersion, '3.6556.2');
  assert.equal(WORKING_LINE_V4.sourceContract, v4);
  assert.equal(WORKING_LINE_V4.sharedGraph, 'cds-core');
});

test('manifest: version, snapshot, sharedGraph; every module hashes to its 4.16336.0 chunk, output and declarations', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.generator, 'scripts/extract-working-line-v4.mjs');
  for (const m of manifest.modules) {
    const bytes = fs.readFileSync(path.join(v4.ionSource, m.source));
    assert.equal(m.sourceSha256, sha(bytes), m.target);
    assert.equal(m.referenceVersion, '4.16336.0');
    assert.equal(sha(fs.readFileSync(path.join(out, m.target))), m.sha256, m.target);
  }
  const files = fs.readdirSync(out).filter(f => f !== 'public-assets').sort();
  assert.deepEqual(files, [...manifest.modules.map(m => m.target), 'manifest.json', 'roots.json'].sort());
});

test('roots are located by AST: every semantic export is the located declaration under its pinned export alias', async () => {
  const located = await locateRootsV4();
  assert.deepEqual(located.roots, roots.roots);
  for (const [name, root] of Object.entries(roots.roots)) {
    const m = manifest.modules.find(m => m.source === root.chunk);
    assert.equal(m.exports[root.local], name, name);
    assert.ok(m.bindings.some(b => b.name === root.local && b.sha256 === root.sha256), `${name} hash`);
  }
  assert.equal(roots.roots.WorkingLine.local, 'Y5');
  assert.equal(roots.roots.WorkingLine.alias, 'X');
  assert.deepEqual(roots.previous.callSites, { W6: 'X5', Jet: 's_t', B6: 'W5', Ket: 'a_t' });
  assert.equal(roots.isolatedGraph.productionGraph, 'src/generated/working-line');
});

test('a feature that no longer names exactly one declaration stops generation (no pin refresh)', async () => {
  const root = rootsV4['c96d752d0-D9VB6ArX.js'].rE, saved = root.features;
  root.features = ['mark: "clay"'];
  try { await assert.rejects(locateRootsV4(), /activityMark: 2 top-level declarations carry/); } finally { root.features = saved; }
  const flag = rootsV4['ca7b95e24-BFvFgBI_.js'].l, alias = flag.alias;
  flag.alias = 'l';
  try { await assert.rejects(locateRootsV4(), /TURN_STATUS_ROWS_FLAG: l is exported as \[i\], expected l/); } finally { flag.alias = alias; }
});

test('imports: siblings, React, the unchanged host adapter module and cds-core publicNames only (never a 3.6556.2 graph)', () => {
  const exportName = new Map(Object.values(cdsCore.publicNames).map(p => [`${p.target}#${p.exportName}`, p]));
  const adapterNames = new Set(['useIntl', 'FormattedMessage', 'useGrowthBookFlag', 'useGrowthBookFlagWhen', 'useChatTextSize', 'useTurnStartTime', 'sessionTokenCounter', 'sessionActivityStore', 'sessionActivityEvents']);
  const kinds = new Set();
  for (const m of manifest.modules) for (const i of m.imports) {
    kinds.add(i.kind);
    if (i.kind === 'shared-graph') { assert.match(i.from, /^\.\.\/cds-core\/[\w.-]+$/); assert.ok(exportName.has(`${i.from.slice('../cds-core/'.length)}#${i.name}`), `${m.target} ${i.name}`); }
    else if (i.kind === 'adapter') { assert.equal(i.from, '../../source-working-line-adapters.jsx'); assert.ok(adapterNames.has(i.name), i.name); }
    else if (i.kind === 'react') assert.match(i.from, /^react(-dom)?(\/(jsx|compiler)-runtime)?$/);
    else if (i.kind === 'generated') assert.match(i.from, /^\.\/[\w.-]+$/);
    // W8-RT (cds-integrate/wave8, extract-working-line-v4.mjs linkedAreas ['r3b-tasks']): shared-0 Tl (lazyValue) is linked
    // from the 4.16336.0 r3b-tasks graph, its single owner, instead of being cut again here.
    else if (i.kind === 'linked') assert.deepEqual([i.from, i.name, i.original], ['../r3b-tasks/lazy-value.mjs', 'lazyValue', 'Tl'], m.target);
    else assert.fail(`${m.target}: import kind ${i.kind}`);
  }
  // W8-RT: + 'linked' (was: ['adapter', 'generated', 'react', 'shared-graph']).
  assert.deepEqual([...kinds].sort(), ['adapter', 'generated', 'linked', 'react', 'shared-graph']);
  for (const m of manifest.modules) {
    const text = fs.readFileSync(path.join(out, m.target), 'utf8');
    assert.doesNotMatch(text, /from "\.\.\/(view-tabs|working-line)\//, m.target);
    assert.doesNotMatch(text, /cdsIconAliases/, m.target);
  }
  // The adapter module exports every name this graph imports.
  const adapter = fs.readFileSync(path.join(app, 'src/source-working-line-adapters.jsx'), 'utf8');
  for (const name of adapterNames) assert.match(adapter, new RegExp(`export (function|const) ${name}\\b`), name);
});

test('D46: no module state cds-core holds without a publicName is copied (engine and local-context / written-binding checks)', async () => {
  const survey = await surveyWorkingLineV4();
  assert.equal(survey.error, null);
  assert.deepEqual(survey.stateConflicts, []);
  // What is sliced again from cds-core-held chunks is pure (compiler helpers, preload helper, shared-frame utilities; since
  // cds-core wave 5 also shared-0 Tl lazyValue and vendor-intl tn, the defineMessages identity, which cds-core now holds;
  // since cds-core wave 6 also shared-0 T6 and vendor-motion Qn, pure helpers it holds without a publicName; since cds-core wave
  // cc2 also the shared-1 / shared-2 pure bindings the UserMessage closure brings into cds-core — m7 and its action-bar siblings,
  // the matchMedia helpers, the clipboard hook J$ — while the module state among them (X5 / Y5 / Q8 / W8 ...) is linked by
  // publicName, which survey.stateConflicts above proves; was: shared-frame / preload-helper / shared-183 only).
  const held = manifest.modules.flatMap(m => m.heldByViewTabs.map(b => `${m.source}#${b}`));
  assert.ok(held.length > 0);
  assert.ok(held.every(k => /^(shared-frame-CJdE5Ria|preload-helper-BBljBeZo|shared-183-B2N6Zy4J|shared-1-D1bGaTaN|shared-2-CsjIBQD8)\.js#/.test(k) || ['shared-0-CnnWnVrT.js#Tl', 'vendor-intl-BJgYK7RA.js#tn',
    'shared-0-CnnWnVrT.js#T6', 'vendor-motion-Ba5cqrBN.js#Qn'].includes(k)), held.join(' '));
});

test('lazy chunks and assets: the activity sheets load through a dependency-free preload; assets equal the production copies', () => {
  const sprites = fs.readFileSync(path.join(out, 'activity-sprites.mjs'), 'utf8');
  assert.match(sprites, /i\(\(\) => import\("\.\/c8677db5f-CJKAHncR\.js"\), \[\]\)/);
  assert.equal(fs.readFileSync(path.join(out, 'c8677db5f-CJKAHncR.js'), 'utf8').includes('new URL("assets/v1/'), true);
  const legacy = JSON.parse(fs.readFileSync(path.join(legacyDir, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.publicAssets, legacy.publicAssets);
  for (const { name, sha256 } of manifest.publicAssets) assert.equal(sha(fs.readFileSync(path.join(out, 'public-assets', name))), sha256);
  assert.notEqual(path.resolve(WORKING_LINE_V4.publicAssetsRoot), path.join(app, 'public/assets/v1'));
});

test('cutover not done: host and 3.6556.2 consumers still read src/generated/working-line; only 4.16336.0 graphs may import the v4 graph', () => {
  const hits = [];
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    // A 4.16336.0 graph may link this one (that is what it is staged for); the host and 3.6556.2 graphs may not.
    const v4Graph = e.isDirectory() && path.dirname(p) === path.join(app, 'src/generated') && fs.existsSync(path.join(p, 'manifest.json'))
      && JSON.parse(fs.readFileSync(path.join(p, 'manifest.json'), 'utf8')).referenceVersion === '4.16336.0';
    if (e.isDirectory()) { if (p !== out && !v4Graph) walk(p); } else if (/\.(m?js|jsx)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('working-line-v4/')) hits.push(path.relative(app, p));
  } };
  walk(path.join(app, 'src'));
  // round3 integrate-gates: a staged 4.16336.0 graph's own host adapter module (its manifest `adapterModule`) answers that
  // graph's boundaries and may link this graph when the manifest declares working-line-v4 in linkedAreas
  // (chat-messages-v4: src/source-chat-messages-v4-adapters.jsx reads m7.RetryAction from working-line-v4 shared-2, D1).
  // It is part of that graph, not the host: the cutover guard is that src/main.jsx does not reach it.
  const generatedDir = path.join(app, 'src/generated');
  const adapterOwners = new Map();
  for (const area of fs.readdirSync(generatedDir)) {
    const file = path.join(generatedDir, area, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.referenceVersion === '4.16336.0' && typeof m.adapterModule === 'string') adapterOwners.set(m.adapterModule, { area, m });
  }
  const linkedNames = m => { const la = m?.linkedAreas; return !la ? [] : Array.isArray(la) ? la.map(e => typeof e === 'string' ? e : e.area) : Object.keys(la); };
  const graphAdapters = hits.filter(file => adapterOwners.has(file));
  for (const file of graphAdapters) {
    const { area, m } = adapterOwners.get(file);
    assert.ok(linkedNames(m).includes('working-line-v4'), `${file}: ${area} declares working-line-v4 in linkedAreas`);
  }
  // chat-cowork 1:1 r1 (chat-conversation r1-01 / r1-03): the Chat message toolbar (shared-2 m7 = cc1aae219 Sd) and the
  // Chat thinking timeline (turn-status = c734f318c TurnStatus) are cut over to this graph; no other host file reads it.
  // r2 chat-conversation-r2-04: the user-message actions row is the same MessageActions compound (shared-2 m7) — was: the two above.
  assert.deepEqual(hits.filter(file => !adapterOwners.has(file)).sort(), ['src/source-chat-message-actions.jsx', 'src/source-chat-thinking.jsx', 'src/source-user-actions.jsx']);
  const reached = new Set(), stack = [path.join(app, 'src/main.jsx')];
  const specifiers = /(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
  const resolveFile = spec => [spec, ...['.jsx', '.mjs', '.js'].map(ext => spec + ext), ...['index.jsx', 'index.mjs', 'index.js'].map(name => path.join(spec, name))]
    .find(candidate => /\.(m?js|jsx)$/.test(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
  while (stack.length) {
    const file = resolveFile(stack.pop());
    if (!file || reached.has(file)) continue;
    reached.add(file);
    for (const m of fs.readFileSync(file, 'utf8').matchAll(specifiers)) stack.push(path.resolve(path.dirname(file), m[1] ?? m[2]));
  }
  // was: for (const file of graphAdapters) assert.ok(!reached.has(path.join(app, file)), `${file} is not reached from src/main.jsx (cutover not done)`);
  // Round 4 real-b switch lane (chat-messages S11 production cutover): the host's Chat message toolbar, version selector,
  // feedback dialog and warning are the 4.16336.0 chat-messages-v4 roots, so src/main.jsx reaches that graph's own adapter
  // (src/source-chat-messages-v4-adapters.jsx, which links working-line-v4 shared-2 m7.RetryAction, D1). That graph — and only
  // that one — is production now; every other 4.16336.0 graph adapter linking working-line-v4 stays unreached, and the host's
  // own working line is still the 3.6556.2 graph (asserted below).
  assert.deepEqual(graphAdapters.filter(file => reached.has(path.join(app, file))), ['src/source-chat-messages-v4-adapters.jsx']);
  assert.match(fs.readFileSync(path.join(app, 'src/source-working-line.jsx'), 'utf8'), /generated\/working-line\//);
});

test('render: busy row with the clay mark, clock and tokens; stopping names its state; idle keeps the empty row', () => {
  const busy = render({ isActuallyWorking: true, elapsedSeconds: 3, tokens: 21, hasTokens: true, waiting: 'model' });
  assert.match(busy, /^<div data-testid="code-working-line" data-turn-working="true"/);
  assert.match(busy, /data-cds="TurnStatus" data-state="busy"/);
  assert.match(busy, /data-cds="WorkingMark"/);
  assert.match(busy, /tabular-nums">3s</);
  // Y5's clock gate: a said tool label without its start time (toolLabelSince null) hides the clock (v = … && p !== null).
  assert.doesNotMatch(render({ isActuallyWorking: true, elapsedSeconds: 3, toolLabel: 'Read', toolLabelSince: null }), /tabular-nums">3s</);
  assert.match(busy, /21 tokens/);
  assert.match(busy, /role="status" aria-live="polite">Working…</);
  const stopping = render({ isActuallyWorking: true, isStopping: true, elapsedSeconds: 5 });
  assert.match(stopping, /Stopping…/);
  const idle = render({ isActuallyWorking: false });
  assert.match(idle, /^<div data-testid="code-working-line"/);
  assert.doesNotMatch(idle, /data-state="busy"/);
});
