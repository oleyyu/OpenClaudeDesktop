import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// round2 cowork-approval: the 4.16336.0 tool approval card (c96142a4d gt with c14f706e5 Zt), generated into
// src/generated/cowork-approval-v4 by scripts/extract-cowork-approval-v4.mjs (staged; the host still mounts the 3.6556.2
// graph). Source only: generator output, official chunk text and SSR of the v4 card fed with the approvalData the
// existing host builds from a local approval request (src/source-cowork-approval.jsx helpers); no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const OUT = 'src/generated/cowork-approval-v4';
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { cookie: '', body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, hasFocus: () => true, visibilityState: 'visible',
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh) Claude/4.16336.0' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

// The official app is client-rendered: stores read through useSyncExternalStore without getServerSnapshot. SSR here takes
// the client snapshot as the server one (as tests/cowork-approval.test.mjs does).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(h(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

// The card links frame-sidebar-nav shared-183.mjs (D1 owner of the claude.ai connector stores X / Z). Its zod schemas read
// globalThis.__zod_globalConfig, which the official vendor-zod initialises in a top-level statement
// (`(Le=globalThis).__zod_globalConfig??(Le.__zod_globalConfig={})`). Since cds-core wave 7 (W7-D5) that statement and the
// module state M are cds-core vendor-zod.mjs's and frame-sidebar-nav vendor-zod.mjs imports them, so the graph evaluates in
// an isolated load: the SSR tests below are regular tests (they were todo on the zod load error before) and any load error
// fails them.
let server, generated, genError, host, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  host = await server.ssrLoadModule('/src/source-cowork-approval.jsx');
  adapters = await server.ssrLoadModule('/src/source-cowork-approval-v4-adapters.jsx');
  try { generated = await server.ssrLoadModule(`/${OUT}/index.mjs`); } catch (error) { genError = error; }
});
const ssr = () => {
  assert.ifError(genError);
  assert.ok(generated, 'cowork-approval-v4 index.mjs evaluates');
  return true;
};
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

let instance = 0;
const request = (method, params, id = ++instance) => ({ id, method, bridgeApproval: { connectionId: 'c', instanceId: `i-${id}` },
  params: { threadId: 'T', turnId: 'turn-1', itemId: `item-${id}`, ...params } });
const command = (extra = {}) => request('item/commandExecution/requestApproval', { command: 'rm -rf build', cwd: '/Users/x/Docs', ...extra });
const render = (req, { scheduledRun = false } = {}) => {
  const decisions = host.coworkApprovalDecisions(req, null);
  const tool = host.coworkApprovalTool(req, null);
  const approvalData = host.coworkApprovalData(decisions, { scheduledRun, submit: async () => {} });
  return renderToStaticMarkup(h(generated.ToolApprovalCard, { toolName: tool.toolName, rawToolName: tool.rawToolName, integrationName: tool.integrationName,
    headline: tool.headline, input: tool.input, glyph: tool.glyph, approvalData, onCollapse() {} }));
};

test('the v4 graph pins the official 4.16336.0 roots, adapters, links and call sites; the 3.6556.2 graph is untouched', async () => {
  const manifest = JSON.parse(local(`${OUT}/manifest.json`));
  const provenance = JSON.parse(local(`${OUT}/provenance.json`));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(provenance.sharedGraph.manifestSha256, 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd');
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}/${r.export}`), [
    'c96142a4d-DqOQjECe.js#gt=ToolApprovalCard/i', 'c14f706e5-Bqtc_XFV.js#Zt=ToolApprovalActions/t']);
  assert.ok(provenance.roots.every(r => r.pinned) && provenance.adapters.every(a => a.pinned));
  assert.deepEqual(provenance.adapters.map(a => `${a.original}=>${a.name}`).sort(), [
    'c14f706e5-Bqtc_XFV.js#Vt=>ToolApprovalNotifyOptIn', 'c96142a4d-DqOQjECe.js#at=>GmailFileAskRows', 'cb3e475a7-DVRcQh8O.js#H=>useToolAppResource',
    'cc2d75ce6-7rduZGF6.js#u=>useToolApprovalComposer', 'shared-0-CnnWnVrT.js#H=>trackEvent', 'shared-0-CnnWnVrT.js#qB=>reportError',
    'shared-153-DMw2VzSq.js#$U=>useConversationRestrictionReason', 'shared-153-DMw2VzSq.js#ZU=>useConversationRestricts',
    'shared-183-B2N6Zy4J.js#GT=>useConnectorLookup', 'shared-25-D-aF0gt9.js#Vo=>useFeatureIsOn', 'shared-25-D-aF0gt9.js#ko=>useFeatureIsOn',
    'shared-26-B-POtn5S.js#Fw=>warmApprovalPlaceCheck', 'shared-26-B-POtn5S.js#Hw=>settleApprovalPlaceCheck',
    'shared-26-B-POtn5S.js#kw=>approvalPlaceCheckChunk', 'shared-36-fqRFYwOb.js#Db=>ConnectorServerIcon', 'shared-6-2QYRw_Wv.js#Sf=>useDownloadOutput',
    'shared-62-DoCqVpIq.js#Ha=>loadPublicSuffixList', 'shared-62-DoCqVpIq.js#OT=>useAnalytics', 'shared-62-DoCqVpIq.js#rP=>useErrors', 'vendor-intl-BJgYK7RA.js#Gt=>FormattedMessage', 'vendor-intl-BJgYK7RA.js#q=>useIntl']);
  for (const a of provenance.adapters) assert.ok(typeof adapters[a.name] === 'function' || typeof adapters[a.name] === 'object', a.name);
  // D1: the connector stores (shared-183 X / Z) and their readers (shared-1 fU, shared-183 dE), the grapheme limiter
  // (shared-2 eB over its qz state) are frame-sidebar-nav's, the render error boundary (shared-26 Ds) r3b-transcript-v4's,
  // the motion config reader (vendor-motion ol over the C context) working-line-v4's: imported, not cut again.
  const imports = manifest.modules.flatMap(m => m.imports ?? []).filter(i => i.kind === 'linked');
  for (const [original, from] of [['X', '../frame-sidebar-nav/shared-183.mjs'], ['Z', '../frame-sidebar-nav/shared-183.mjs'], ['dE', '../frame-sidebar-nav/shared-183.mjs'],
    ['fU', '../frame-sidebar-nav/shared-1.mjs'], ['eB', '../frame-sidebar-nav/shared-2.mjs'], ['Ds', '../r3b-transcript-v4/render-error-boundary.mjs'],
    ['ol', '../working-line-v4/vendor-motion.mjs']])
    assert.ok(imports.some(i => i.original === original && i.from === from), `${original} from ${from}`);
  const cut = new Set(manifest.modules.flatMap(m => (m.bindings ?? []).map(b => `${m.source}#${b.name}`)));
  for (const key of ['shared-183-B2N6Zy4J.js#X', 'shared-183-B2N6Zy4J.js#Z', 'shared-2-CsjIBQD8.js#qz', 'shared-153-DMw2VzSq.js#LU', 'vendor-motion-Ba5cqrBN.js#C', 'shared-26-B-POtn5S.js#Ds'])
    assert.ok(!cut.has(key), `${key} is not cut here`);
  // Nothing of c14f706e5 / c96142a4d (4.16336.0) is sliced by another graph.
  for (const dir of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (dir === 'cowork-approval-v4') continue;
    const other = (() => { try { return JSON.parse(local(`src/generated/${dir}/manifest.json`)); } catch { return null; } })();
    for (const mod of other?.modules ?? []) assert.ok(!['c14f706e5-Bqtc_XFV.js', 'c96142a4d-DqOQjECe.js'].includes(path.basename(`${mod.source}`)), `${dir} slices ${mod.source}`);
  }
  assert.equal(manifest.callSites.filter(c => c.raw).length, 3);
  // Wave 7 (W7-D5): shared-62 Ha is answered by the host (loadPublicSuffixList), so its loader Va and the verbatim
  // public-suffix chunk it imported are no longer reached; shared-26 Fw / Hw are host boundaries too. None of the four is
  // cut here, and no module of this graph assigns a binding it imports (W7-D1 write integrity, d1/import-writes.mjs).
  assert.equal(fs.existsSync(path.join(app, OUT, 'cd668e25e-CRav9CGS.js')), false);
  assert.ok(fs.existsSync(path.join(v1, 'cd668e25e-CRav9CGS.js')));
  for (const key of ['shared-62-DoCqVpIq.js#Va', 'shared-62-DoCqVpIq.js#Ha', 'shared-26-B-POtn5S.js#Fw', 'shared-26-B-POtn5S.js#Hw'])
    assert.ok(!cut.has(key), `${key} is not cut here`);
  const { scanImportWrites } = await import(path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/d1/import-writes.mjs'));
  assert.deepEqual(scanImportWrites([{ name: 'cowork-approval-v4', status: 'ok', dir: OUT }], app), []);
  // The 3.6556.2 graph keeps its version and roots.
  const old = JSON.parse(local('src/generated/cowork-approval/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  assert.deepEqual(Object.keys(old.publicNames), ['ToolApprovalCard', 'ToolApprovalActions']);
});

test('the official 4.16336.0 rungs and the desktop notify opt-in gate', () => {
  const zt = official('c14f706e5-Bqtc_XFV.js');
  for (const s of ['defaultMessage:"Allow for this task"', 'defaultMessage:"Allow once"', 'defaultMessage:"Deny"', 'defaultMessage:"More allow options"'])
    assert.ok(zt.includes(s), s);
  // Vt (the opt-in) returns null on the desktop client: `s = x()` (shared-0 FH) leads the null test.
  assert.ok(zt.includes('if(s||!c||u||!d)return null'));
  const out = local(`${OUT}/c14f706e5.mjs`).replace(/\s+/g, ' ');
  assert.ok(out.includes('ToolApprovalNotifyOptIn as Vt'), 'Vt answered by the host adapter');
  for (const s of ['defaultMessage: "Allow for this task",', 'defaultMessage: "More allow options",']) assert.ok(out.includes(s), s);
});

test('SSR: a Cowork command request on the 4.16336.0 card: Claude wants to use Bash, Allow for this task, Allow once, Deny', (t) => {
  if (!ssr(t)) return;
  const html = render(command());
  const words = text(html);
  assert.match(words, /DeepSeek wants to use Bash/); // fix-r2 U-14 (E83): the running assistant, was Claude
  assert.ok(words.indexOf('Allow for this task') >= 0, words);
  assert.match(words, /Allow once/);
  assert.match(words, /Deny/);
  assert.doesNotMatch(words, /Get notified|Allow for all scheduled runs/);
  assert.ok(html.includes('data-approval-card-root'), html.slice(0, 600));
});

test('SSR: no session offer leaves Allow once and Deny; a persistent offer goes under More allow options', (t) => {
  if (!ssr(t)) return;
  const plain = text(render(command({ availableDecisions: ['accept', 'decline'] })));
  assert.doesNotMatch(plain, /Allow for this task|More allow options/);
  assert.match(plain, /Allow once/);
  assert.match(plain, /Deny/);
  const persistent = render(command({ availableDecisions: ['accept', 'acceptForSession', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['git', 'status'] } }, 'decline'] }));
  assert.match(persistent, /More allow options/);
  assert.match(text(persistent), /Allow for this task/);
});

test('SSR: file changes name Edit / Write', (t) => {
  if (!ssr(t)) return;
  assert.match(text(render(request('item/fileChange/requestApproval', { changes: [{ path: '/Users/x/Docs/a.md', kind: { type: 'update' } }] }))), /DeepSeek wants to use Edit/);
  assert.match(text(render(request('item/fileChange/requestApproval', { changes: [{ path: '/Users/x/Docs/b.md', kind: { type: 'add' } }] }))), /DeepSeek wants to use Write/);
});
