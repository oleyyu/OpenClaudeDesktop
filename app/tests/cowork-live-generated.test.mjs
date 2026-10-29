import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCoworkLive } from '../scripts/extract-cowork-live.mjs';

// w13-coworkui-panel-live (research/w13-coworkui.md §1.2 rows 6-8, cwui-23 / cwui-24): the 3.6556.2 live sections of the
// Cowork session activity panel (scripts/extract-cowork-live.mjs: c21f11e6d hb Claude in Chrome, bb / xb Computer use,
// kb / Ab the in-app browser, pb the running signal) over src/source-cowork-live-adapters.jsx. Source only: manifest,
// the generator's --check, the official chunk text and SSR. No browser, no network; the official chunks are read, never
// executed.
// Scope (review fix): this is component-level evidence only. Nothing in main.jsx / source-surfaces.jsx renders these
// sections yet (wiring belongs to w13-coworkui-panel), so cwui-23 / cwui-24 stay partial until that lane wires them.
// The in-app browser part of cwui-23 (kb / Ab) has negative evidence only: cr (appFeatures.coworkBrowser) is off and
// the local Launch bridge has no getPreviewTabs, so no tab ever reaches Ab; there is no positive render here.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(snapshot, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const manifest = JSON.parse(local('src/generated/cowork-live/manifest.json'));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

// The official app is client-rendered: its stores call useSyncExternalStore without getServerSnapshot (c21f11e6d $y,
// the Claude in Chrome picture view). SSR here takes the client snapshot as the server one: the server dispatcher's
// useSyncExternalStore is wrapped once (captured from a first render).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(h(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, gen, live, progress;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-live/index.mjs');
  live = await server.ssrLoadModule('/src/source-cowork-live-adapters.jsx');
  progress = await server.ssrLoadModule('/src/generated/cowork-progress/index.mjs');
});
after(() => server?.close());

test('manifest: 3.6556.2 snapshot and chunk hashes, the roots, their adapters, the linked graphs', async () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.generator, 'scripts/extract-cowork-live.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-live-adapters.jsx');
  for (const mod of manifest.modules) {
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(snapshot, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`src/generated/cowork-live/${mod.target}`)), mod.target);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.publicNames).map(([name, e]) => [name, `${e.file}#${e.local}`])), {
    CoworkBrowserSection: 'c21f11e6d-Cyd8_HO8.js#hb', CoworkComputerUseSection: 'c21f11e6d-Cyd8_HO8.js#bb', CoworkComputerUseCard: 'c21f11e6d-Cyd8_HO8.js#xb',
    CoworkInAppBrowserTabsProbe: 'c21f11e6d-Cyd8_HO8.js#kb', CoworkInAppBrowserSection: 'c21f11e6d-Cyd8_HO8.js#Ab', useCoworkToolRunning: 'c21f11e6d-Cyd8_HO8.js#pb',
    useCoworkBrowserActivityText: 'c21f11e6d-Cyd8_HO8.js#db', useCoworkBrowserScreenshot: 'c21f11e6d-Cyd8_HO8.js#sb' });
  assert.deepEqual(manifest.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'ca2ef848d#L1=unavailableActivityDetail', 'c5f921d63#ae=useLivePreviewFps', 'c96143e67#l=useConnectedBrowsers', 'c17c38211#d=useSwitchBrowser',
    'shared-0#KS=ComputerUseLivePreview', 'shared-1#Hu=ComputerUseLivePreview']);
  // D1: the panel's Section, row classes and layout context are cowork-progress's (one copy, one context instance).
  const c21 = local('src/generated/cowork-live/c21f11e6d-Cyd8_HO8.mjs');
  assert.match(c21, /import \{\s*L as tg,\s*T as Jh,\s*w as Gh,?\s*\} from "\.\.\/cowork-progress\/cc5a62f6f-CwJjes2b\.mjs";/);
  assert.ok(!manifest.modules.some(m => m.source === 'cc5a62f6f-CwJjes2b.js'), 'cc5a62f6f is not sliced again');
  const held = new Set(['cowork-progress', 'cowork-scheduled', 'mcp-app-card'].flatMap(dir => JSON.parse(local(`src/generated/${dir}/manifest.json`)).modules
    .flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`))));
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(key => held.has(key)).sort(), manifest.pendingDedupe.map(d => d.original), 'only unexported held bindings are copied');
  // D1 (w13-close-rail-regen): the pure bindings other areas sliced first are imported from them, never copied here:
  // sessions-page shared-52 OT, session-rail-kit shared-5 Cy and shared-frame co, sidebar-resize shared-130 Ef.
  const linkedFrom = Object.fromEntries(manifest.linkedImports.map(l => [l.original, `${l.from}#${l.name}`]));
  assert.equal(linkedFrom['shared-52-uHFNjl7C.js#OT'], '../sessions-page/pure-shared-52.mjs#useLatchedValue');
  assert.equal(linkedFrom['shared-5-Bg6ZMqvt.js#Cy'], '../session-rail-kit/element-size.mjs#useElementSize');
  assert.equal(linkedFrom['shared-frame-6jtSkIit.js#co'], '../session-rail-kit/window-actions.mjs#useInOtherWindow');
  assert.equal(linkedFrom['shared-130-dWztbTO1.js#Ef'], '../sidebar-resize/clamp.mjs#clamp');
  for (const gone of ['shared-52-uHFNjl7C.js', 'shared-5-Bg6ZMqvt.js', 'shared-frame-6jtSkIit.js'])
    assert.ok(!manifest.modules.some(m => m.source === gone), `${gone} is not sliced again`);
  // shared-130 is sliced for db's Dd (WK and its closure), but not Ef.
  assert.ok(!manifest.modules.some(m => m.source === 'shared-130-dWztbTO1.js' && m.bindings.some(b => b.name === 'Ef')), 'shared-130 Ef is not sliced again');
  // The linked modules import only view-tabs, React and their own area's pure modules (no host adapter enters, E41).
  assert.equal(linkedFrom['shared-0-DDOOdL6P.js#sW'], '../session-rail-kit/plain-object.mjs#isPlainObject');
  for (const file of ['sessions-page/pure-shared-52.mjs', 'session-rail-kit/element-size.mjs', 'session-rail-kit/window-actions.mjs', 'sidebar-resize/clamp.mjs',
    'session-rail-kit/plain-object.mjs'])
    for (const [, from] of local(`src/generated/${file}`).matchAll(/from "([^"]+)"/g))
      assert.ok(/^(react|react-dom|\.\.\/view-tabs\/|\.\/)/.test(from), `${file} imports ${from}`);
  // The kept copies, each with its reason: transcript-rows' shared-0 tool-name prefixes and shared-78 iB (its modules
  // import the transcript host adapter or do not export them), session-rail-sections' c155b6b71 preview tab hooks.
  assert.deepEqual(manifest.keptCopies.map(k => `${k.area}:${k.originals.map(o => o.split('#')[1]).join(',')}`),
    ['transcript-rows:_a,va,Ca,wa,iB', 'session-rail-sections:l,d,f,p,m,h,g']);
  for (const kept of manifest.keptCopies) assert.match(kept.reason, /E41/);
  assert.deepEqual(manifest.contexts.map(c => c.replace(/-[\w-]{8}\.js#/, '#')), ['c21f11e6d#Xy']);
  // The adapters import no generated graph except cowork-progress' adapter module (the shared no-op detail handle).
  const adapterImports = [...local('src/source-cowork-live-adapters.jsx').matchAll(/^(?:import|export)\b[^;]*?from "([^"]+)"/gm)].map(m => m[1]);
  assert.deepEqual(adapterImports.filter(f => f.includes('generated/')), []);
  await extractCoworkLive({ check: true });
});

test('the official text: the live sections, the server identities and the gate AT reads for the computer-use card', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js'), s78 = official('shared-78-D5Fw2h0a.js');
  for (const s of ['{defaultMessage:"Claude in Chrome",id:"1XvgYxOFV4"}', 'defaultMessage:"Claude is working in Chrome. You\\u2019ll see updates here as Claude makes progress.",id:"2mDc1tSBbk"',
    'defaultMessage:"Open browser activity",id:"3x+WPYpgig"', 'defaultMessage:"Computer use",id:"RfG2KsHAez"', 'defaultMessage:"Live",id:"FAq+HlOlG7"',
    'defaultMessage:"Background \\u00B7 {target}",id:"bv0sdNmu+s"', 'defaultMessage:"Full control \\u00B7 {target}",id:"YOk6ErXGPY"',
    'defaultMessage:"Open computer use activity",id:"YsvDvI5YpB"', 'defaultMessage:"Switch browser",id:"vYgbMZsxpj"',
    'defaultMessage:"Browser listing requires a newer version of the desktop app.",id:"lq3UeNBmbU"'])
    assert.ok(c21.includes(s), s);
  // AT's order and conditions (readable :12929-12968): in-app browser (cr), Claude in Chrome (always mounted), computer use (Vn).
  assert.match(c21, /cr&&o&&p\(kb,\{previewId:sr,onHasTabsChange:fr\}\),cr&&!o&&p\(Ab,\{/);
  assert.match(c21, /p\(hb,\{hasBrowserActivity:Rr,/);
  assert.match(c21, /Vn&&p\(bb,\{hasComputerUseActivity:Br,/);
  assert.ok(c21.includes('Vn=vr()'), 'Vn is shared-78 bR');
  assert.ok(s78.includes('vR="cowork_computer_use_side_panel_card";function yR(){return Ze(vR)}function bR(){return O(vR)}'));
  assert.ok(s78.includes('e==="a8f3c7e2-4b9d-4f1a-8c3e-9d2a5b7f8e1c"||e==="claude-in-chrome"'));
  assert.equal(live.CHROME_SERVER, 'claude-in-chrome');
  assert.equal(live.COMPUTER_USE_SERVER, 'computer-use');
  assert.equal(live.COMPUTER_USE_CARD_GATE, 'cowork_computer_use_side_panel_card');
  // The live frame card's fps config and its default (c5f921d63 re / E), and the generated text carries the row classes.
  const c5f = official('c5f921d63-DIIF0_s9.js');
  assert.ok(c5f.includes('re="cowork_activity_panel_live_preview"') && c5f.includes('E={fps:1}'));
  assert.equal(live.LIVE_PREVIEW_CONFIG_KEY, 'cowork_activity_panel_live_preview');
  const out = local('src/generated/cowork-live/c21f11e6d-Cyd8_HO8.mjs');
  for (const s of ['"flex items-center gap-2.5 py-1.5"', '"block py-1.5 text-caption text-muted-as-secondary"', '"text-muted-as-secondary font-small"',
    '"can-focus -mx-2 -my-1 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded px-2 py-1.5 text-start"'])
    assert.ok(out.includes(s), s);
});

function inPanel(child, flat = true) {
  return renderToStaticMarkup(h(progress.CoworkPanelMergedContext.Provider, { value: true },
    h(progress.CoworkPanelLayoutContext.Provider, { value: flat ? progress.coworkPanelFlatLayout : progress.coworkPanelCardLayout },
      h(progress.CoworkPanel, { shrinkSections: true }, child))));
}
const browserProps = extra => ({ hasBrowserActivity: true, conversationUuid: 's1', isSessionActive: true, isBrowserToolRunning: true, collapsible: true, panelShown: true, ...extra });

test('SSR: no browser and no computer-use activity — neither section renders (official `visible` false)', () => {
  assert.equal(inPanel(h(gen.CoworkBrowserSection, browserProps({ hasBrowserActivity: false, isBrowserToolRunning: false }))).includes('Claude in Chrome'), false);
  assert.equal(renderToStaticMarkup(h(gen.CoworkBrowserSection, browserProps({ hasBrowserActivity: false }))), '');
  assert.equal(renderToStaticMarkup(h(gen.CoworkComputerUseSection, { hasComputerUseActivity: false, previewSessionId: 's1', isSessionActive: true })), '');
  // The in-app browser: no Launch bridge here (no getPreviewTabs), so no tabs and Ab renders nothing; kb never renders.
  // Negative evidence only — the kb / Ab part of cwui-23 is not restored (see the scope note at the top).
  assert.equal(renderToStaticMarkup(h(gen.CoworkInAppBrowserSection, { previewId: 'p1', isPaneOpen: false, onTogglePane() {}, collapsible: true })), '');
  assert.equal(renderToStaticMarkup(h(gen.CoworkInAppBrowserTabsProbe, { previewId: 'p1', onHasTabsChange() {} })), '');
});

test('SSR: a Chrome tool running without a page yet — "Claude in Chrome" and the official working copy (flat and card)', () => {
  for (const flat of [true, false]) {
    const html = inPanel(h(gen.CoworkBrowserSection, browserProps()), flat);
    const words = text(html);
    assert.ok(words.startsWith('Claude in Chrome'), words);
    assert.ok(words.includes('Claude is working in Chrome. You’ll see updates here as Claude makes progress.'), words);
    assert.ok(html.includes('aria-label="Switch browser"'), 'ib: the official Switch browser trigger');
    assert.ok(html.includes('data-section-header=""'), 'the panel Section header');
    assert.ok(html.includes(flat ? 'block py-1.5 text-caption text-muted-as-secondary' : 'text-muted-as-secondary font-small'), flat ? 'flat empty copy' : 'card empty copy');
  }
});

test('SSR: a page in Chrome — the domain and the latest action replace the working copy', () => {
  const html = inPanel(h(gen.CoworkBrowserSection, browserProps({ currentDomain: 'example.com', latestActionText: 'Read page' })));
  const words = text(html);
  assert.ok(words.includes('example.com') && words.includes('Read page'), words);
  assert.ok(!words.includes('Claude is working in Chrome.'), words);
  assert.ok(html.includes('flex items-center gap-2.5 py-1.5'), 'flat row');
});

test('SSR: computer use in progress — "Computer use", "Live" and "Background · {target}" / "Full control · {target}"', () => {
  const frame = 'data:image/png;base64,AAAA';
  const card = preview => inPanel(h(gen.CoworkComputerUseCard, { hasComputerUseActivity: true, previewSessionId: 's1', activityKey: 'c1', preview,
    isSessionActive: true, isComputerUseToolRunning: true, collapsible: true, panelShown: true }));
  const background = card({ sessionId: 's1', active: true, mode: 'app', targetLabel: 'Finder', frame });
  const words = text(background);
  assert.ok(words.startsWith('Computer use'), words);
  assert.ok(words.includes('Live') && words.includes('Background · Finder'), words);
  assert.ok(background.includes(frame), 'the live frame');
  const full = text(card({ sessionId: 's1', active: true, mode: 'display', targetLabel: 'Display 1', frame }));
  assert.ok(full.includes('Full control · Display 1') && full.includes('Live'), full);
  // No live preview (main is not capturing): the official working copy, no Live badge.
  const idle = text(card(undefined));
  assert.ok(idle.includes('Claude is working on your computer. You’ll see updates here as Claude makes progress.') && !idle.includes('Live'), idle);
  // bb itself reads the preview store; without the host bridge (no window.desktop here) it is "missing" and bb passes no preview.
  assert.equal(live.ComputerUseLivePreview, undefined);
  assert.ok(text(inPanel(h(gen.CoworkComputerUseSection, { hasComputerUseActivity: true, previewSessionId: 's1', isSessionActive: true }))).startsWith('Computer use'));
});

test('the live preview bridge over the host channel: setSubscribed, the store and its events', async () => {
  const calls = [], handlers = new Set();
  const desktop = { call: (action, params) => { calls.push([action, params]); return Promise.resolve(); },
    onEvent: cb => { handlers.add(cb); return () => handlers.delete(cb); } };
  const bridge = live.createComputerUseLivePreview(desktop);
  bridge.setSubscribed('s1', true, true);
  bridge.setSubscribed('s1', false, true);
  assert.deepEqual(calls, [['computer-use:preview', { sessionId: 's1', on: true }], ['computer-use:preview', { sessionId: 's1', on: false }]]);
  const store = bridge.computerUsePreviewStore;
  assert.deepEqual(await store.getState(), { sessionId: undefined, active: false });
  const seen = [];
  const off = store.onStateChange(state => seen.push(state));
  for (const cb of handlers) cb({ kind: 'computer-use-preview', sessionId: 's1', active: true, mode: 'app', targetLabel: 'Notes', frame: 'data:image/png;base64,QQ' });
  for (const cb of handlers) cb({ kind: 'other' });
  assert.deepEqual(seen, [{ sessionId: 's1', active: true, mode: 'app', targetLabel: 'Notes', frame: 'data:image/png;base64,QQ' }]);
  assert.deepEqual(await store.getState(), seen[0]);
  off();
  assert.equal(handlers.size, 0, 'the last listener leaving unsubscribes');
  assert.equal(bridge.browserPreviewStore, undefined, 'no Chrome live frames: hb reads "missing"');
  assert.equal(live.createComputerUseLivePreview(undefined), undefined);
});

test('coworkLiveActivity: Chrome bridge calls and computer-use calls → AT\'s resource activity and the sections\' props (AT :12110-12144)', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const items = [
    { id: 'u1', type: 'userMessage', content: [] },
    { id: 'c1', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_navigate', arguments: { url: 'https://www.example.com/a' }, status: 'completed', result: { content: [] } },
    { id: 'c2', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_browser_batch', status: 'completed',
      arguments: { actions: [{ name: 'chrome_navigate', input: { url: 'docs.example.org/x' } }] }, result: { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] } },
    { id: 'c3', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_read_page', arguments: {}, status: 'inProgress' },
  ];
  const a = live.coworkLiveActivity(items);
  // W: the extension's tool names (the chrome_ prefix off, batch steps too); mcpToolResult once finished.
  assert.deepEqual(a.resourceActivity.map(e => [e.id, e.operation, e.mcpServerUuid, e.mcpToolName, !!e.mcpToolResult]),
    [['c1', 'mcp_tool', 'claude-in-chrome', 'navigate', true], ['c2', 'mcp_tool', 'claude-in-chrome', 'browser_batch', true], ['c3', 'mcp_tool', 'claude-in-chrome', 'read_page', false]]);
  assert.equal(a.resourceActivity[1].mcpToolInput.actions[0].name, 'navigate');
  assert.equal(a.hasBrowserActivity, true);
  assert.equal(a.isBrowserToolPending, true);
  assert.equal(a.newestBrowserActivityId, 'c2', 'the newest finished Chrome call');
  // w13-close-cowork-ui (panel-live-02): the screenshot is the generated sb (AT `n = sb(W)`) over the official result
  // blocks the adapter builds; the host reader is gone.
  assert.equal(a.browserScreenshotSrc, undefined);
  assert.deepEqual(a.resourceActivity[1].mcpToolResult, { content: [{ type: 'image', source: { type: 'base64', data: 'iVBORw0KGgo=', media_type: 'image/png' } }] });
  let shot;
  const Shot = ({ events }) => { shot = gen.useCoworkBrowserScreenshot(events); return null; };
  renderToStaticMarkup(h(Shot, { events: a.resourceActivity }));
  assert.equal(shot, png);
  // ob: the newest Chrome result image wins; another server's images and unsupported media types never do.
  renderToStaticMarkup(h(Shot, { events: [...a.resourceActivity,
    { id: 'z', operation: 'mcp_tool', mcpServerUuid: 'computer-use', mcpToolName: 'screenshot', mcpToolResult: { content: [{ type: 'image', source: { type: 'base64', data: 'QUJD', media_type: 'image/png' } }] } },
    { id: 'y', operation: 'mcp_tool', mcpServerUuid: 'claude-in-chrome', mcpToolName: 'computer', mcpToolResult: { content: [{ type: 'image', source: { type: 'base64', data: 'QUJD', media_type: 'image/svg+xml' } }] } }] }));
  assert.equal(shot, png);
  const c21 = official('c21f11e6d-Cyd8_HO8.js');
  assert.ok(c21.includes('function sb(e){return ob(e,Qn)}') && c21.includes('let e=Im(Lm(n.mcpToolResult),r);e&&(i=e)'));
  assert.equal(live.coworkLiveSectionProps(a, { sessionId: 's', browserScreenshot: png }).browser.screenshotSrc, png);
  assert.equal(a.hasComputerUseActivity, false);
  const none = live.coworkLiveActivity([{ id: 'x', type: 'mcpToolCall', server: 'code_desktop', tool: 'preview_start', status: 'completed' }]);
  assert.equal(none.hasBrowserActivity, false);
  assert.equal(none.hasComputerUseActivity, false);
  // Every computer-use call counts, request_access included (AT: any mcp_tool of the computer-use server).
  const cu = live.coworkLiveActivity([
    { id: 's', type: 'mcpToolCall', server: 'code_desktop', tool: 'app_screenshot', arguments: { app: 'Finder' }, status: 'completed',
      result: { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] } },
    { id: 't', type: 'mcpToolCall', server: 'code_desktop', tool: 'app_click', arguments: { app: 'Finder', element_index: 3 }, status: 'completed' },
    { id: 'r', type: 'mcpToolCall', server: 'code_desktop', tool: 'request_access', arguments: { apps: ['Finder'] }, status: 'inProgress' }]);
  assert.equal(cu.hasComputerUseActivity, true);
  assert.equal(cu.isComputerUseToolPending, true, 'a pending request_access is a pending computer-use call');
  assert.equal(cu.newestComputerUseActivityId, 'r');
  assert.equal(cu.computerUseScreenshotSrc, png);
  const props = live.coworkLiveSectionProps(cu, { sessionId: 's1', isSessionActive: true, panelShown: true, browserText: { latestActionText: 'x', currentDomain: 'y' } });
  assert.equal(props.computerUse.previewSessionId, 's1');
  assert.equal(props.computerUse.activityKey, 'r');
  assert.equal(props.browser.conversationUuid, 's1');
  assert.equal(props.browser.hasBrowserActivity, false);
  assert.deepEqual([props.browser.latestActionText, props.browser.currentDomain], ['x', 'y']);
  // AT `activityKey: D === void 0 ? void 0 : (Ur ?? "")`: no computer-use session, no key; one without a call yet, "".
  assert.equal(live.coworkLiveSectionProps(cu, {}).computerUse.activityKey, undefined);
  assert.equal(live.coworkLiveSectionProps(none, { sessionId: 's1' }).computerUse.activityKey, '');
});

test('useCoworkBrowserActivityText (db): the official Dd titles and the domain, batch names of lb included', () => {
  let out;
  const Probe = ({ events }) => { out = gen.useCoworkBrowserActivityText(events); return null; };
  const run = items => { renderToStaticMarkup(h(Probe, { events: live.coworkLiveActivity(items).resourceActivity })); return out; };
  const call = (id, tool, args, status = 'completed') => ({ id, type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args, status, result: { content: [] } });
  assert.deepEqual(run([]), { latestActionText: undefined, currentDomain: undefined });
  const nav = run([call('a', 'chrome_navigate', { url: 'https://www.example.com/a' })]);
  assert.equal(nav.currentDomain, 'www.example.com');
  assert.equal(typeof nav.latestActionText, 'string');
  assert.ok(nav.latestActionText.includes('example.com'), nav.latestActionText);
  for (const batch of ['chrome_browser_batch'])
    assert.equal(run([call('b', batch, { actions: [{ name: 'navigate', input: { url: 'docs.example.org/x' } }] })]).currentDomain, 'docs.example.org');
  assert.equal(run([call('c', 'chrome_navigate', { url: 'back' })]).currentDomain, undefined, 'ub: back / forward are not places');
  assert.equal(run([call('d', 'chrome_read_page', {}, 'inProgress')]).latestActionText, 'Reading page');
  // lb is the official set (batch / browser_batch / computer_batch).
  assert.ok(official('c21f11e6d-Cyd8_HO8.js').includes('lb=new Set(["batch","browser_batch","computer_batch"])'));
});
