import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractChatMessagesV4, ROOTS, ROOT_PINS, INNER, HOST_ADAPTERS, ADAPTER_PINS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-chat-messages-v4.mjs';

// claude-4.16336.0-migrate round 2, unit chat-messages: the 4.16336.0 chat message parts (scripts/extract-chat-messages-v4.mjs ->
// src/generated/chat-messages-v4), staged next to the 3.6556.2 src/generated/chat-messages the host still renders.
// Source checks: manifest, the generator's --check, AST-located pinned roots, adapters, D1 links and the official text.
// SSR: the graph links frame-sidebar-nav (D1 owner of shared-26 AG / MG, shared-153 qh, shared-33 zG, shared-62 iP,
// shared-92 F_), and every one of those modules imports frame-sidebar-nav shared-62, whose top-level zod schemas cannot
// evaluate in an isolated load yet (frame-sidebar-nav vendor-zod lacks the official __zod_globalConfig initializer, and
// vendor-zod k writes cds-core's Me; tests/frame-sidebar-nav-v4.test.mjs and tests/approval-elicitation-v4.test.mjs record
// the same blocker). Wave 7 cleared that load (W7-D2): rl-main-entry turned the render tests from `todo` into real
// checks, and a failed load of the graph now fails the file instead of marking them todo.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/chat-messages-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/cowork-progress-v4.test.mjs.
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

const server = await createServer({ configFile: false, root: app, plugins: [react()],
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'silent' });
after(async () => { await closeWhenSettled(server); await server.close(); });
const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
i18n.setLocale('en-US');
// Wave 7: frame-sidebar-nav loads in isolation now (the vendor-zod state unit is cds-core's), so the SSR tests run; the
// frame-sidebar capabilities its shared-26 rows read (useIntl …) are answered by the app's own host table, installed when
// src/frame-sidebar-host.jsx evaluates, as in the app.
await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
let gen = null, loadError = null;
try { gen = await server.ssrLoadModule(`/${out}/index.mjs`); } catch (error) { loadError = error; }

test('SSR load: the graph and its linked frame-sidebar-nav modules evaluate in isolation (wave 7, W7-D2)', () => {
  assert.equal(loadError, null, `chat-messages-v4 (with frame-sidebar-nav linked, D1) must load: ${String(loadError?.message).slice(0, 300)}`);
  for (const name of ['ChatMessageFeedback', 'MESSAGE_ACTIONS_INSET', 'ChatRetryAction', 'MessageContextMenu', 'ChatDisclaimer', 'ChatFeedbackDialog', 'ChatVersionSelector', 'ChatMessageWarning', 'messageTextFeatures'])
    assert.ok(name in gen, name);
});

test('manifest: 4.16336.0 snapshot, cds-core shared graph, targeted linked modules, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-chat-messages-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-chat-messages-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, LINKED_AREAS);
  assert.deepEqual(LINKED_AREAS.map(l => l.area), ['frame-sidebar-nav', 'routines-shared-v4', 'working-line-v4', 'session-rail-kit-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractChatMessagesV4({ check: true });
});

test('roots: the 3.6556.2 semantic names, AST-located under their reviewed locals and pinned', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c49573414-CW4mWVDA.js#rt=ChatMessageFeedback/c', 'cc1aae219-BbSf__8R.js#xM=ChatVersionSelector', 'cc1aae219-BbSf__8R.js#tM=MESSAGE_ACTIONS_INSET/qr',
    'cc1aae219-BbSf__8R.js#Vj=ChatMessageWarning',
    // chat-conversation r3-02: ele's footer spark (Zce around W$), new in this graph.
    'ca2ef848d-DA54buzo.js#Zce=ChatFooterSpark', 'ca2ef848d-DA54buzo.js#H9=ChatDisclaimer', 'c79f7d2ef-snkGFUaN.js#w=MessageContextMenu/MessageContextMenu',
    'shared-6-2QYRw_Wv.js#k_=ChatFeedbackDialog/Da', 'shared-4-C_EiQb9h.js#ev=ChatRetryAction', 'shared-153-DMw2VzSq.js#Kq=messageTextFeatures',
    // chat-conversation r2-02: the classic assistant message (cc1aae219 kw / jw) and the Chat column's msg-* insets (shared-2 vJ's _J),
    // new 4.16336.0 roots with no 3.6556.2 counterpart in src/generated/chat-messages.
    'c7dd2633f-CvrjtTGG.js#re=AssistantMessageRoot/N', 'c7dd2633f-CvrjtTGG.js#y=AssistantMessageText/P',
    // chat-conversation r3-01: the Chat page's jump-to-latest button (cf854d0e8 t, ca2ef848d JO).
    'cf854d0e8-YPmDYG3q.js#c=ChatJumpToLatest/t', 'shared-2-CsjIBQD8.js#_J=CHAT_COLUMN_MESSAGE_INSETS/Ea']);
  assert.ok(provenance.roots.every(r => r.pinned && ROOT_PINS[`${r.file}#${r.local}`] === r.declarationSha256), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  assert.deepEqual(provenance.inner.map(i => i.key), Object.keys(INNER));
  // The 3.6556.2 graph's roots, all present under the same names (its support exports are internal here).
  const old = JSON.parse(local('src/generated/chat-messages/manifest.json'));
  const oldRoots = ['ChatMessageFeedback', 'MESSAGE_ACTIONS_INSET', 'messageTextFeatures', 'ChatMessageWarning', 'ChatVersionSelector', 'ChatDisclaimer',
    'MessageContextMenu', 'ChatFeedbackDialog', 'ChatRetryAction'];
  for (const name of oldRoots) assert.ok(old.modules.some(m => Object.values(m.exports).includes(name)), `3.6556.2 ${name}`);
  assert.deepEqual(provenance.roots.map(r => r.name).sort(), [...oldRoots, 'AssistantMessageRoot', 'AssistantMessageText', 'CHAT_COLUMN_MESSAGE_INSETS', 'ChatFooterSpark', 'ChatJumpToLatest'].sort());
  const index = local(`${out}/index.mjs`);
  for (const name of oldRoots) assert.match(index, new RegExp(`\\b${name}\\b`));
});

test('host boundaries: each adapted original pinned and used; re-exported from the documented host adapter', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  assert.ok(provenance.adapters.every(a => a.pinned && ADAPTER_PINS[a.original] === a.declarationSha256));
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.via.includes('#') ? i.via : null)).filter(Boolean));
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) {
    assert.equal(i.from, '../../source-chat-messages-v4-adapters.jsx');
    assert.ok(Object.values(HOST_ADAPTERS).some(a => a.name === i.name), `${m.target} ${i.name}`);
  }
  for (const key of used) assert.ok(HOST_ADAPTERS[key], key);
  const names = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  assert.deepEqual([...names].sort(), [...new Set(Object.values(HOST_ADAPTERS).map(a => a.name))].sort(), 'every adapter is used');
  const adapterText = local('src/source-chat-messages-v4-adapters.jsx');
  assert.deepEqual([...adapterText.matchAll(/from ["']([^"']+)["']/g)].map(m => m[1]),
    ['./generated/working-line-v4/shared-2.mjs', './source-chat-messages-adapters.jsx', './source-routines-shared-adapters.jsx']);
  // The names defined here: shared-3 Bd's .RetryAction (working-line-v4 m7.RetryAction), shared-7 HF's default, and
  // (chat-conversation r3-02) the footer spark's two load-time warm-ups (shared-33 KH, shared-100 _r).
  assert.deepEqual([...adapterText.matchAll(/^export (?:const|function) (\w+)/gm)].map(m => m[1]), ['ChatMessageRetryParts', 'useChatComposerLayout', 'preloadChatActivitySprites', 'preloadChatSparkSprites']);
  assert.ok(official('shared-7-D2e77H6v.js').includes('BF=c(!1)') || /BF=\w+\(!1\)/.test(official('shared-7-D2e77H6v.js')), 'shared-7 BF = createContext(!1)');
  assert.ok(official('shared-3-IQTrO7Gx.js').includes('RetryAction:Ts.RetryAction'), 'shared-3 Bd.RetryAction = Ts.RetryAction');
});

test('D1: bindings the linked modules hold are imported from them, never cut again; useEventCallback from cds-core', () => {
  const held = new Map();
  for (const { area, modules } of LINKED_AREAS) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) if (modules.includes(mod.target)) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'no binding of a linked module is cut again');
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => `${i.from.replace('../', '')}:${i.name}`));
  for (const want of ['frame-sidebar-nav/shared-26.mjs:AG', 'frame-sidebar-nav/shared-26.mjs:MG', 'frame-sidebar-nav/shared-153.mjs:qh', 'frame-sidebar-nav/shared-33.mjs:zG',
    'frame-sidebar-nav/shared-62.mjs:iP', 'frame-sidebar-nav/shared-92.mjs:F_', 'routines-shared-v4/shared-25-D-aF0gt9.mjs:VB', 'routines-shared-v4/shared-25-D-aF0gt9.mjs:eV',
    'working-line-v4/shared-2.mjs:m7', 'session-rail-kit-v4/shared-38-DyF0_Fim.mjs:oo'])
    assert.ok(linked.includes(want), want);
  const form = manifest.modules.find(m => m.target === 'feedback-form.mjs');
  assert.ok(form.imports.some(i => i.kind === 'shared-graph' && i.name === 'useEventCallback' && i.from === '../cds-core/shared-0.mjs'));
  // The 3.6556.2 sidebar-sections $L (dialog presence) is now frame-sidebar-nav shared-33 zG.
  assert.ok(form.imports.some(i => i.kind === 'linked' && i.name === 'zG' && i.from === '../frame-sidebar-nav/shared-33.mjs'));
  // No other 4.16336.0 graph cuts a chunk-local binding this graph cuts from the root chunks (shared-frame helpers aside).
  const roots = new Set(Object.keys(ROOTS));
  const mine = new Set(manifest.modules.filter(m => roots.has(m.source)).flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'chat-messages-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of m.modules ?? []) for (const b of mod.bindings ?? []) assert.ok(!mine.has(`${path.basename(mod.source ?? '')}#${typeof b === 'string' ? b : b.name}`), `${dir} ${mod.source}`);
  }
});

test('the official text: where the app renders the roots, and their copy', () => {
  const row = official('cc1aae219-BbSf__8R.js'), page = official('ca2ef848d-DA54buzo.js'), form = official('shared-6-2QYRw_Wv.js');
  for (const site of manifest.callSites) for (const f of site.features) assert.equal(official(site.source).split(f).length - 1, 1, f);
  assert.ok(row.includes('{defaultMessage:"Previous version",id:"nZObrEhD3u"}') && row.includes('"data-testid":"message-warning"'));
  assert.ok(page.includes('"https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on"'));
  assert.ok(form.includes('{defaultMessage:"Give negative feedback",id:"jOz9SoiS5x"}'));
  const generated = local(`${out}/feedback-form.mjs`);
  for (const s of ['defaultMessage: "Please provide details: (optional)"', '"What type of issue do you wish to report? (optional)"',
    'h(V.Popup, { size: "md", initialFocus: Qe, children: [$e, et, Xe] })', 'if (q) q(n, r, e || void 0);']) assert.ok(generated.includes(s), s);
  assert.ok(local(`${out}/message-row.mjs`).includes('"ms-[calc(var(--msg-text-inset,0.5rem)_-_6px)] touch:ms-[calc(var(--msg-text-inset,0.5rem)_-_0.625rem*var(--cds-rem-scale,1))]"'));
});

test('SSR: version selector, retry, feedback pair and warning', () => {
  assert.ok(gen, 'graph loads');
  const v = renderToStaticMarkup(h(gen.ChatVersionSelector, { message: { uuid: 'a', sender: 'assistant', selectedOption: 1, nOptions: 3 }, changeDisplayedConversationPath() {} }));
  assert.match(v, /data-testid="action-bar-previous-version"/);
  assert.match(text(v), /2 \/ 3/);
  const r = renderToStaticMarkup(h(gen.ChatRetryAction, { 'data-testid': 'action-bar-retry', blocked: false, onRetry() {} }));
  assert.match(r, /aria-label="Retry"|Retry/);
  const f = renderToStaticMarkup(h(gen.ChatMessageFeedback, { conversationUuid: 't1', message: { uuid: 'm1', sender: 'assistant' }, cdsPresets: true }));
  assert.match(f, /action-bar-thumbs-up/);
  assert.match(f, /Good response/);
  const w = renderToStaticMarkup(h(gen.ChatMessageWarning, { showWebSearchNudge: true }));
  assert.match(w, /data-testid="message-warning"/);
  assert.equal(typeof gen.MESSAGE_ACTIONS_INSET, 'string');
  assert.deepEqual(gen.messageTextFeatures('plain words'), { hasCodeBlock: false, hasWebLink: false });
});

test('SSR: disclaimer', () => {
  assert.ok(gen, 'graph loads');
  const d = renderToStaticMarkup(h(gen.ChatDisclaimer, { conversationUuid: 't1', isTemporary: false, hasWebSearchResponse: false }));
  assert.match(d, /data-disclaimer/);
  // fix-r2 U-14 (E83): the disclaimer names the running assistant (DeepSeek by default), not Claude.
  assert.match(text(d), /DeepSeek is AI and can make mistakes\. Please double-check responses\./);
  assert.match(d, /href="https:\/\/support\.anthropic\.com\/en\/articles\/8525154/);
});

// Round 4 switch lane (prestage-r5/switch, on the wave-8 cds-core 9203795f): d1-gate --app-only reports 0 import writes, so the
// writer rows the reachability below walked to are gone (round4/prestage/switch/logs/reach-chatmsg.json: 0 writers reached),
// and S11 is switched: the host files import the 4.16336.0 roots from generated/chat-messages-v4/index.mjs. The test that
// pinned the staged state (kept below as a comment) is now the post-switch assertion: every host consumer imports the -v4
// graph and none imports a 3.6556.2 chat-messages module.
// was: rl-main-entry S11 (round3 relink): the production switch waits for wave 8. Static reachability
// (round3/relink/rl-main-entry/tools/writer-reach.mjs over the wave-7 d1-gate import-write rows) finds frame-sidebar-nav
// writers behind a host-used root: ChatFeedbackDialog (shared-6 k_) -> shared-92 F_ -> P_ -> E_ -> i_ -> r_ -> shared-0 gte
// -> Y9 -> A9 -> H / K$ (writers mC, bC, K$). Until wave 8 clears them the host keeps the 3.6556.2 graph.
// was: test('staged (S11 not switched): the host imports no chat-messages-v4 module; the 3.6556.2 graph stays the production one', () => {
//   for (const file of ['src/main.jsx', 'src/source-chat-message-actions.jsx', 'src/source-user-actions.jsx', 'src/chat-tools-model.mjs'])
//     assert.doesNotMatch(local(file), /generated\/chat-messages-v4\//, file);
//   assert.match(local('src/source-chat-message-actions.jsx'), /from '\.\/generated\/chat-messages\/feedback-form\.mjs'/);
//   assert.match(local('src/main.jsx'), /import \{ ChatMessageWarning \} from "\.\/generated\/chat-messages\/message-warning\.mjs";/);
// });
test('S11 switched: every host consumer imports the chat-messages-v4 roots; no host file imports a 3.6556.2 chat-messages module', async () => {
  const uses = {
    'src/main.jsx': ['ChatMessageWarning'],
    'src/source-chat-message-actions.jsx': ['ChatMessageFeedback, MESSAGE_ACTIONS_INSET', 'ChatRetryAction', 'MessageContextMenu', 'ChatDisclaimer', 'ChatFeedbackDialog', 'ChatVersionSelector'],
    'src/source-user-actions.jsx': ['ChatVersionSelector'],
    'src/chat-tools-model.mjs': [],
  };
  for (const [file, names] of Object.entries(uses)) {
    const text = local(file);
    assert.doesNotMatch(text, /from ['"]\.\/generated\/chat-messages\//, file);
    for (const name of names) assert.match(text, new RegExp(`import \\{ ${name} \\} from ['"]\\./generated/chat-messages-v4/index\\.mjs['"];`), `${file}: ${name}`);
  }
  // chat-tools-model.mjs (also loaded under plain node) takes messageTextFeatures from the import-free module itself
  assert.match(local('src/chat-tools-model.mjs'), /\nimport \{ messageTextFeatures \} from '\.\/generated\/chat-messages-v4\/message-links\.mjs';\n/);
  assert.equal(gen.messageTextFeatures, (await server.ssrLoadModule(`/${out}/message-links.mjs`)).messageTextFeatures);
  // the roots the host imports are all exported by the generated index (the semantic names of the manifest roots)
  for (const name of [...Object.values(uses).flat().flatMap((n) => n.split(', ')), 'messageTextFeatures']) assert.ok(name in gen, name);
  // the host table of the frame-sidebar-nav boundaries the feedback form reaches is installed by main.jsx (one table).
  // Real tree (round4 real-b): main.jsx imports the nav host module itself (installFrameSidebarNavHost at load) and the SB-1
  // nav body module (which imports that host before generated nav-body.mjs), so no side-effect-only import is added
  // (sandbox form: /\nimport "\.\/frame-sidebar-nav-host\.jsx";\n/).
  assert.match(local('src/main.jsx'), /\nimport \{[^}\n]+\} from "\.\/frame-sidebar-nav-host\.jsx";/);
  assert.match(local('src/main.jsx'), /\nimport \{ HostSidebarNavBody \} from "\.\/frame-sidebar-nav-body\.jsx";/);
  assert.match(local('src/frame-sidebar-nav-host.jsx'), /\ninstallFrameSidebarNavHost\(/);
});
