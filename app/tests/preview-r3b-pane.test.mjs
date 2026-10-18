// R3b-preview step 2 (renderer, 2.42304.0): preview-05 the no-entry notice after Run, preview-06 element picking exits
// when the page can't be picked (and the sketch's capture wait cap), preview-07 the pending Discard action, preview-08
// the sketch canvas labels, preview-13 the tab cap's disabled reason and focus return.
// The pane and the tab strip are mounted in a fake DOM (tests/fixtures/preview-r3b-dom.mjs) over a stub bridge: events
// reach React's own handlers, main's answers are scripted, nothing is started, opened or fetched.
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const v137 = path.resolve(app, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const official = (name, dir = v1) => fs.readFileSync(path.join(dir, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const local = file => fs.readFileSync(path.join(app, file), 'utf8');

let server, P, Tabs, M, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  P = await server.ssrLoadModule('/src/source-preview-pane.jsx');
  Tabs = await server.ssrLoadModule('/src/source-preview-tabs.jsx');
  M = await server.ssrLoadModule('/src/preview-model.mjs');
});
after(() => server?.close());

// Settles React work and the stub bridge's promises (frames run on setImmediate).
const flush = async (times = 6) => { for (let i = 0; i < times; i++) await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); };
const click = node => act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, detail: 1, defaultPrevented: false }); });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

const web = { name: 'web', port: 5173, url: 'http://localhost:5173', attach: false };
const base = { sessionId: 't1', cwd: '/work', url: '', title: '', loading: false, error: null, hasPage: false, canGoBack: false, canGoForward: false, devtools: false,
  viewport: { preset: 'responsive', width: null, height: null, colorScheme: 'system', setByAgent: false }, hostId: null, servers: [], consoleErrors: 0,
  selection: { enabled: false, busy: false }, tabs: [], activeTabId: 'tab-1',
  launch: { exists: true, error: null, problems: [], configs: [web], autoVerify: true } };
const page = { ...base, url: 'http://localhost:5173/', title: 'Web', hasPage: true, tabs: [{ id: 'tab-1', url: 'http://localhost:5173/', title: 'Web' }],
  servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'running', attach: false, startedAt: 1 }] };

async function mountPane(dom, { state = base, handlers = {}, props = {} } = {}) {
  const desktop = createDesktop({ 'preview-state': () => state, 'preview-attach': () => null, 'preview-occlude': () => ({}), ...handlers });
  const errors = [];
  const host = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(React.createElement(P.SourcePreviewPane, { sessionId: 't1', desktop, initialState: state, onError: message => errors.push(message), ...props })));
  await flush();
  const instanceId = desktop.calls.find(entry => entry.action === 'preview-attach')?.params.instanceId;
  return { desktop, errors, host, root, instanceId, unmount: () => act(async () => root.unmount()) };
}

// ---- preview-05 ----------------------------------------------------------------------------------------------------

test('preview-05 source: 2.42304.0 si/ui toast a Run with no usable launch.json entry (unchanged from 2.37337.1 Xr)', () => {
  const pane = official('cf580efe9-b-DCvKJg.js');
  for (const text of ['defaultMessage:"Couldn\\u2019t start {name}. Check that .claude/launch.json has a usable entry for it.",id:"uV3BfEC8hz"',
    '{messageForLogging:"preview_start_no_launch_entry"}', 'd&&!d.error&&!d.refused&&(yn(),u()&&l?.())', 'qe=li({sessionRef:L,boundPreviewId:F,activeTabId:Ke}),Je=ui(qe)',
    'go=li({sessionRef:F,boundPreviewId:e,activeTabId:U})', 'vo=ui(go)'])
    assert.equal(count(pane, text), 1, text);
  const old = official('cf580efe9-BNVXQZS1.js', v137);
  assert.equal(count(old, 'defaultMessage:"Couldn\\u2019t start {name}. Check that .claude/launch.json has a usable entry for it.",id:"uV3BfEC8hz"'), 1);
  // Main: startFromConfig answers {} when Y4i denies (no config, or no entry by that name).
  const main = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  assert.equal(count(main, 'if(Q("desktop_launch_button_clicked",{has_config:i.action!=="deny"}),i.action==="deny")return N.info("[Preview] No config resolved for %s (%s)",e,i.reason),{}'), 1);
  assert.equal(count(main, 'denyUnmatchedName:!0'), 1);
});

test('preview-05 model: no-config / no-server are the no-entry case and share the official copy (en, zh-CN)', () => {
  assert.equal(M.noLaunchEntry({ code: 'no-config' }), true);
  assert.equal(M.noLaunchEntry({ code: 'no-server' }), true);
  for (const code of ['error', 'exited', 'port-in-use', undefined]) assert.equal(M.noLaunchEntry({ code }), false, String(code));
  const text = 'Couldn’t start web. Check that .claude/launch.json has a usable entry for it.';
  assert.equal(M.launchEntryMissingText('web'), text);
  assert.equal(M.serverErrorText({ code: 'no-server' }, 'web'), text);
  assert.equal(M.serverErrorText({ code: 'no-config' }, 'web'), text);
  I18n.setLocale('zh-CN');
  try { assert.equal(M.launchEntryMissingText('web'), '无法启动 web。请检查 .claude/launch.json 中是否有可用的对应条目。'); }
  finally { I18n.setLocale('en-US'); }
});

test('preview-05: Run from the start page with no entry left refreshes the configurations and shows the notice', async () => {
  await withPreviewDom(async (dom) => {
    for (const code of ['no-server', 'no-config']) {
      const view = await mountPane(dom, { handlers: { 'preview-server-start': () => ({ ok: false, code, message: 'No server named “web” in .claude/launch.json.' }) } });
      const before = view.desktop.count('preview-state');
      const run = view.host.querySelector('button[aria-label="Run web"]');
      assert.ok(run, 'the server list offers Run web');
      await click(run);
      await flush();
      assert.deepEqual(view.desktop.last('preview-server-start'), { sessionId: 't1', name: 'web' });
      assert.deepEqual(view.errors, ['Couldn’t start web. Check that .claude/launch.json has a usable entry for it.'], code);
      assert.equal(view.desktop.count('preview-state'), before + 1, 'yn: the configurations are read again');
      assert.equal(view.host.querySelector('[data-preview-failure]'), null, 'no failure card');
      await view.unmount();
    }
  });
});

test('preview-05: the notice waits for the session (u()); other failures without a server stay a plain notice', async () => {
  await withPreviewDom(async (dom) => {
    const answer = deferred();
    const view = await mountPane(dom, { handlers: { 'preview-server-start': () => answer.promise } });
    await click(view.host.querySelector('button[aria-label="Run web"]'));
    await view.unmount(); // the session switched (main.jsx keys the pane by its owner)
    await act(async () => { answer.resolve({ ok: false, code: 'no-server', message: 'No server named “web”.' }); });
    await flush();
    assert.deepEqual(view.errors, [], 'no notice for a session that is no longer shown');

    const other = await mountPane(dom, { handlers: { 'preview-server-start': () => ({ ok: false, code: 'error', message: 'Dev servers are not available for this session.' }) } });
    const before = other.desktop.count('preview-state');
    await click(other.host.querySelector('button[aria-label="Run web"]'));
    await flush();
    assert.deepEqual(other.errors, ['Dev servers are not available for this session.']);
    assert.equal(other.desktop.count('preview-state'), before, 'only the no-entry case refreshes');
    await other.unmount();
  });
});

test('preview-05: the Dev servers menu and the pane share the wrapped start (Je = ui(qe), vo = ui(go))', () => {
  const pane = local('src/source-preview-pane.jsx');
  assert.equal(count(pane, '<SourcePreviewServerMenu rows={menuRows} loading={!state} onStart={start} onStop={stop}'), 1);
  assert.equal(count(pane, 'Promise.resolve(start(name, { inPlace: true }))'), 1, 'Restart / Try again go through start too');
  assert.equal(count(pane, 'if (noLaunchEntry(result)) {'), 1);
});

// ---- preview-06 ----------------------------------------------------------------------------------------------------

test('preview-06 source: ei = V || Y || !w turns picking off (rr(!1)); _a; the capture cap while picking (2.37337.1 same)', () => {
  const pane = official('cf580efe9-b-DCvKJg.js');
  for (const text of ['ei=V||Y||!w,[ti,ni]=n(ei);ei!==ti&&(ni(ei),ei&&rr(!1))', 'limits:nr?{awaitCaptureMs:Mn}:{beforeMs:ca,holdMs:la,awaitCaptureMs:Mn,retryMs:ua}',
    'function _a(e){if(!e)return!0;try{let t=new URL(e).protocol;return t!=="http:"&&t!=="https:"&&t!=="file:"}catch{return!0}}', 'Y=J&&Oe&&rt', 'rt=_a(tt)',
    'e&&E?.toggleSelectionMode?.(e,nr,U)'])
    assert.equal(count(pane, text), 1, text);
  const old = official('cf580efe9-BNVXQZS1.js', v137);
  for (const text of ['ti=B||X||!C,[ni,ri]=p(ti);ti!==ni&&(ri(ti),ti&&ar(!1))', 'limits:ir?{awaitCaptureMs:Sn}:{beforeMs:Ji,holdMs:Yi,awaitCaptureMs:Sn,retryMs:Xi}'])
    assert.equal(count(old, text), 1, text);
  const capture = official('cf550b864-DG_op2XB.js');
  for (const text of ['var M=250,ue=2e4;', 'n=e.limits?.awaitCaptureMs;t||n===void 0?a(t):s=setTimeout(()=>a(null),n)', 'ue as n'])
    assert.equal(count(capture, text), 1, text);
  assert.match(pane, /import\{[^}]*\bn as Mn\b[^}]*\}from"\.\/cf550b864-DG_op2XB\.js"/);
  assert.equal(M.SKETCH_AWAIT_CAPTURE_MS, 2e4);
});

test('preview-06 model: _a and the not-pickable flag', () => {
  for (const url of ['', null, undefined, 'about:blank', 'chrome://newtab', 'data:text/html,x', 'not a url']) assert.equal(M.startPageOrigin(url), true, String(url));
  for (const url of ['http://localhost:5173/', 'https://example.com', 'file:///tmp/a.html']) assert.equal(M.startPageOrigin(url), false, url);
  assert.equal(M.pickUnavailable(page, { surface: 'page' }), false);
  assert.equal(M.pickUnavailable(page, { surface: 'page', sendsToSession: false }), true, '!w');
  assert.equal(M.pickUnavailable(page, { surface: 'stopped' }), true, 'V');
  assert.equal(M.pickUnavailable({ ...page, url: 'about:blank', hasPage: false }, { surface: 'start' }), true, 'Y');
  assert.equal(M.pickUnavailable({ ...page, url: 'chrome-error://x' }, { surface: 'page' }), true, 'Y: not http/https/file');
  assert.equal(M.pickUnavailable(null, { surface: 'loading' }), true);
});

test('preview-06: picking turns off in main when the tab goes to the start page or its server stops, not on a plain navigation', async () => {
  await withPreviewDom(async (dom) => {
    const picking = { ...page, selection: { enabled: true, busy: false } };
    const view = await mountPane(dom, { state: picking, handlers: { 'preview-selection': () => picking }, props: { onAttachElement: () => {} } });
    assert.ok(view.instanceId, 'the pane attached');
    assert.equal(view.host.querySelector('aside').getAttribute('data-page-tools'), '', 'picking shows the page tools');
    assert.equal(view.desktop.count('preview-selection'), 0);
    // Another http page: still pickable, nothing sent.
    await act(async () => view.desktop.push({ kind: 'preview', sessionId: 't1', state: { ...picking, url: 'http://localhost:5173/about' } }));
    await flush();
    assert.equal(view.desktop.count('preview-selection'), 0);
    // about:blank (the start page): ei rises, rr(!1), toggleSelectionMode(…, false).
    await act(async () => view.desktop.push({ kind: 'preview', sessionId: 't1', state: { ...picking, url: 'about:blank', hasPage: false, tabs: [{ id: 'tab-1', url: 'about:blank', title: '' }] } }));
    await flush();
    assert.equal(view.desktop.count('preview-selection'), 1);
    assert.deepEqual(view.desktop.last('preview-selection'), { sessionId: 't1', instanceId: view.instanceId, enabled: false });
    await view.unmount();

    // The page's server stopped (V, the stopped card): picking exits too.
    const second = await mountPane(dom, { state: picking, handlers: { 'preview-selection': () => picking }, props: { onAttachElement: () => {} } });
    await act(async () => second.desktop.push({ kind: 'preview', sessionId: 't1', state: { ...picking, servers: [{ ...picking.servers[0], status: 'stopped' }] } }));
    await flush();
    assert.equal(second.host.querySelector('aside').getAttribute('data-preview-surface'), 'stopped');
    assert.deepEqual(second.desktop.last('preview-selection'), { sessionId: 't1', instanceId: second.instanceId, enabled: false });
    assert.equal(second.desktop.count('preview-selection'), 1);
    await second.unmount();
  });
});

test('preview-06: the sketch stops waiting for a hung capture after 20 s (also when it started from picking)', async () => {
  await withPreviewDom(async (dom) => {
    const picking = { ...page, selection: { enabled: true, busy: false } };
    const view = await mountPane(dom, { state: picking, handlers: { 'preview-selection': () => picking }, props: { onAttachElement: () => {}, onAttachScreenshot: () => {} } });
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      await act(async () => view.desktop.push({ kind: 'preview-shortcut', sessionId: 't1', instanceId: view.instanceId, action: 'sketch' }));
      await flush();
      assert.deepEqual(view.desktop.last('preview-selection'), { sessionId: 't1', instanceId: view.instanceId, enabled: false }, 'before: selection off first');
      assert.equal(view.desktop.count('preview-capture'), 1, 'the capture is in flight (never answered)');
      const layer = () => view.host.querySelector('[data-preview-sketch]');
      assert.ok(layer(), 'the sketch layer is up');
      assert.equal(layer().getAttribute('data-drawing'), null, 'still waiting for the backdrop');
      await act(async () => { mock.timers.tick(19999); });
      await flush();
      assert.equal(layer().getAttribute('data-drawing'), null);
      await act(async () => { mock.timers.tick(1); });
      await flush();
      assert.equal(layer().getAttribute('data-drawing'), '', 'awaitCaptureMs: drawing without a backdrop');
    } finally { mock.timers.reset(); }
    await view.unmount();
  });
});

// ---- preview-07 ----------------------------------------------------------------------------------------------------

test('preview-07 source: the pending Discard action (Kr) and why its Dock branch has no host', () => {
  const pane = official('cf580efe9-b-DCvKJg.js');
  for (const text of ['let[Kr,qr]=n(null),Jr=u(En);Kr!==null&&(!Q||V||Kr==="popOut"&&!C||Kr==="dock"&&!Jr)&&qr(null)',
    'Zr=p(e=>{(Ae(N)?.document)?.querySelector(\'[data-open][role="alertdialog"]\')||qr(e)},[N])', 'Ai=p(()=>{if(Si()){Zr("dock");return}Jr?.onDock()},[Si,Zr,Jr])',
    'ji=c(()=>Jr&&{...Jr,onDock:Ai},[Jr,Ai])', 'return o(En.Provider,{value:ji,children:Ss})', 'import{n as En}from"./c41956fd9-B53YzvK7.js"'])
    assert.equal(count(pane, text), 1, text);
  // The context's only provider is the pane pop-out window (c5638815a bt); a project window docks through paneHost.
  assert.equal(count(official('c41956fd9-B53YzvK7.js'), 'var s=r(null);function c(){let r=i(s);return r===null?null:t(e,{children:[n(a,{onDock:r.onDock}),n(o,{popoutId:r.popoutId})]})}'), 1);
  const popout = official('c5638815a-D1NXo6h5.js');
  assert.equal(count(popout, 'onDock:()=>{(!M||M.getState().requestDock())&&U()}}),[M,R,U]);return n(et.Provider,{value:W'), 1);
  const providers = fs.readdirSync(v1).filter(name => name.endsWith('.js') && /\.Provider,\{value:/.test(official(name)) && official(name).includes('from"./c41956fd9-B53YzvK7.js"'));
  assert.deepEqual(providers.sort(), ['c5638815a-D1NXo6h5.js', 'c58115fda-ngsZGdlI.js', 'cf580efe9-b-DCvKJg.js'], 'pop-out window, remote preview panel, Preview itself');
  assert.equal(count(official('c9c84d68b-DMgxSiTd.js'), 'title:n(d,{defaultMessage:"Discard your annotations?",id:"MfFrIX0mxC"})'), 1);
  // Here Preview never runs in a pane window: no pop-out kind, no pane-window kind, and its tile has no Pop out.
  // (R4i-transcript TR3 added the /btw side pane, "session"; Preview is still not among them.)
  assert.match(local('electron/main.cjs'), /const POPOUT_KINDS = new Set\(\["files", "changes", "plan", "tasks", "terminal", "side-chat", "session"\]\);/);
  assert.match(local('src/source-split-view.jsx'), /export const APP_PANE_WINDOW_KINDS = Object\.freeze\(\["tasks", "terminal", "side-chat", "session"\]\);/);
  const main = local('src/main.jsx');
  assert.match(main, /const displayLayout = useMemo\(\(\) => PANE_WINDOW && PANE_WINDOW\.pane !== "side-chat" \? fromSpec\(\{ direction: "row", children: \[PANE_WINDOW\.pane\] \}\)/);
  assert.match(main, /controls=\{<SourcePaneControls tileId="preview" paneName=\{PANE_NAMES\.preview\} layout=\{baseTileLayout\(tileEntry\)\} expanded=\{expandedTile === "preview"\}\s+onMoveToEdge=\{edge => moveTileEdge\("preview", edge\)\} onToggleExpand=\{\(\) => toggleExpandTile\("preview"\)\} onClose=\{\(\) => closePaneTile\("preview"\)\} \/>\}/);
});

test('preview-07: the pane keeps one pending action, guarded like Zr, dropped like Kr, run like si', () => {
  const pane = local('src/source-preview-pane.jsx');
  for (const text of [
    'const [pendingDiscard, setPendingDiscard] = useState(null);',
    'const askDiscard = (action) => { if (!pane.current?.ownerDocument?.querySelector(\'[data-open][role="alertdialog"]\')) setPendingDiscard(action); };',
    'if (sketch && sketchRef.current?.hasMarks()) { askDiscard("picking"); return; }',
    'if (pendingDiscard !== null && (!sketch || surface === "stopped")) setPendingDiscard(null);',
    'setPendingDiscard(null); closeSketch();',
    'if (action === "picking" && !pickBlocked) void beginPick();',
    'onCancel={() => setPendingDiscard(null)} onConfirm={discardAndContinue} />}',
  ]) assert.equal(count(pane, text), 1, text);
  assert.equal(count(pane, 'switchToPick'), 0);
});

// ---- preview-08 ----------------------------------------------------------------------------------------------------

test('preview-08: 2.37337.1+ format the canvas labels; the host passes its intl, zh-CN has both, and the generated canvas is the 2.42304.0 St', () => {
  for (const [name, dir, intl] of [['c467aa787-B4L-l_bi.js', v1, 'ce'], ['c467aa787-t1coKIFM.js', v137, 'se']]) {
    const chunk = official(name, dir);
    assert.equal(count(chunk, `"aria-label":${intl}.formatMessage({defaultMessage:"Sketch canvas",id:"jvMtXRguc4"})`), 1, name);
    assert.equal(count(chunk, `"aria-label":${intl}.formatMessage({defaultMessage:"Text label",id:"c29+YCh/oq"})`), 1, name);
  }
  assert.equal(count(official('c467aa787-B4L-l_bi.js'), 'let ce=me(),'), 1, '2.42304.0 St: ce = useIntl()');
  assert.equal(count(local('src/source-preview-sketch.jsx'), 'createPreviewSketchCanvas({ ownerWindow, optionalOwnerWindow, useToken, reducedMotion, useIntl: useRoutineIntl })'), 1);
  const generated = local('src/generated/code-editor/preview-sketch-canvas.mjs');
  // R4g SM2 (X7-13): extract-code-editor.mjs now slices the canvas from 2.42304.0 c467aa787-B4L-l_bi.js.
  assert.equal(count(generated, '"aria-label": "Sketch canvas"'), 0, 'no 2.31226.0 literal left');
  assert.equal(count(generated, 'id: "jvMtXRguc4"'), 1);
  assert.equal(count(generated, 'id: "c29+YCh/oq"'), 1);
  assert.equal(count(local('scripts/extract-code-editor.mjs'), "const sketchCanvasName='c467aa787-B4L-l_bi.js';"), 1);
  const zh = I18n.dictionary('zh-CN');
  assert.equal(zh['Sketch canvas'], '草图画布');
  assert.equal(zh['Text label'], '文本标签');
});

// ---- preview-13 ----------------------------------------------------------------------------------------------------

test('preview-13 source: createDisabled = lr(count) (U: > 8), the sr-only cap note, Qp around +, and the focus hand-off', () => {
  assert.equal(count(official('cf580efe9-b-DCvKJg.js'), 'newTabShortcut:i?"cmd+t":void 0,createDisabled:lr(w.length)'), 1);
  assert.equal(count(official('c224804cc-CT77R4xB.js'), 'function U(e){return e>8}'), 1);
  const strip = official('cfe7c4b3b-CP-IQXj8.js');
  for (const text of ['newTabAtCap:"Tab limit reached. Close a tab to open a new one."',
    '_e&&x&&i("span",{id:at,className:"sr-only",children:X.newTabAtCap}),_e&&i("span",{ref:vt,className:h("inline-flex shrink-0",B&&"w-10 items-center justify-center"),children:i(re,{reason:x?X.newTabAtCap:null,hoverable:!1,side:"bottom"',
    'i(ie,{content:S&&!x?X.newTab:null,shortcut:S,hoverable:!1,side:"bottom",children:Ht})',
    '"aria-describedby":x?at:void 0,"aria-label":X.newTab',
    'if(_t.current=t,e&&!t){let e=vt.current;e?.contains(e.ownerDocument.activeElement)&&e.querySelector("button")?.focus({preventScroll:!0});return}',
    'i!==r.body&&!vt.current?.contains(i)||n.querySelector(`[data-vtb-id="${CSS.escape(c)}"] [role="tab"]`)?.focus({preventScroll:!0})},[x,c])'])
    assert.equal(count(strip, text), 1, text);
  const frame = official('shared-frame-BfjMqbuN.js');
  for (const text of ['function Qp({reason:e,side:t,align:n,sideOffset:r,multiline:i=!0,delay:a,collisionPadding:o,hoverable:s,className:c,wrapperClassName:l,children:u}){let d=Pe();return H(Zp,{content:Wc(e)?e:void 0,side:t,align:n,sideOffset:r,multiline:i,delay:a,collisionPadding:o,hoverable:s,className:c,closeOnClick:!1,openOnHandedBackFocus:!0,children:T("span",{...Uc(e,d,l),children:[u,H(Yc,{id:d,reason:e})]})})}',
    'function Uc(e,t,n){let r=Wc(e);return{ref:Hc,tabIndex:r?0:-1,"aria-describedby":r?t:void 0,"data-cds-disabled-reason-wrapper":"",className:X("inline-flex",Vc,n)}}',
    'Vc=`rounded outline-none focus-visible:outline-hidden [&[data-initial-focus]:focus]:outline-hidden transition-shadow duration-fast ${dc}`',
    'dc="focus-visible:shadow-focus [&[data-initial-focus]:focus]:shadow-focus"',
    'H("span",{ref:n,id:e,hidden:!0,[Jc]:"",children:Wc(t)?t:null}'])
    assert.equal(count(frame, text), 1, text);
  assert.equal(M.previewTabCapReached(8), false);
  assert.equal(M.previewTabCapReached(9), true);
});

const tabsOf = n => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, url: `http://localhost:${3000 + i}/`, title: `Tab ${i + 1}` }));
const stripProps = (n, extra = {}) => ({ tabs: tabsOf(n), activeId: `t${n}`, onSelect() {}, onCreate() {}, onClose() {}, onCloseOthers() {}, onExternal() {}, onReorder() {}, ...extra });

test('preview-13: at the cap + keeps its slot, gains the sr-only note and a focusable reason wrapper (SSR)', () => {
  const open = renderToStaticMarkup(React.createElement(Tabs.SourcePreviewTabs, stripProps(8)));
  const wrapper = 'class="inline-flex rounded outline-none focus-visible:outline-hidden [&amp;[data-initial-focus]:focus]:outline-hidden transition-shadow duration-fast focus-visible:shadow-focus [&amp;[data-initial-focus]:focus]:shadow-focus"';
  assert.match(open, new RegExp(`<span class="inline-flex shrink-0" data-preview-new-tab=""><span tabindex="-1" data-cds-disabled-reason-wrapper="" ${wrapper.replace(/[[\]().*+?^$|]/g, '\\$&')}><button[^>]*aria-label="New tab"`));
  assert.doesNotMatch(open, /Tab limit reached/);
  assert.doesNotMatch(open, /<button[^>]*aria-label="New tab"[^>]*disabled/);
  const capped = renderToStaticMarkup(React.createElement(Tabs.SourcePreviewTabs, stripProps(9)));
  const note = /<span id="([^"]+)" class="sr-only">Tab limit reached\. Close a tab to open a new one\.<\/span><span class="inline-flex shrink-0" data-preview-new-tab="">/.exec(capped);
  assert.ok(note, 'the sr-only note sits right before the slot');
  const reason = new RegExp(`<span tabindex="0" aria-describedby="([^"]+)" data-cds-disabled-reason-wrapper="" ${wrapper.replace(/[[\]().*+?^$|]/g, '\\$&')}>`).exec(capped);
  assert.ok(reason, 'the wrapper is the focus stop, described by the hidden reason');
  assert.match(capped, new RegExp(`<button[^>]*aria-describedby="${note[1]}"[^>]*disabled=""[^>]*>|<button[^>]*disabled=""[^>]*aria-describedby="${note[1]}"[^>]*>`));
  assert.match(capped, /<button aria-label="New tab"[^>]*disabled=""/);
  assert.match(capped, new RegExp(`<span id="${reason[1]}" hidden="" data-cds-disabled-reason="">Tab limit reached\\. Close a tab to open a new one\\.</span></span></span>`));
});

test('preview-13: reaching the cap hands focus from + (or the body) to the open tab; lifting it returns focus to +', async () => {
  await withPreviewDom(async (dom) => {
    const host = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(host);
    const render = (n, extra) => act(async () => root.render(React.createElement(Tabs.SourcePreviewTabs, stripProps(n, extra))));
    const plus = () => host.querySelector('[data-preview-new-tab] button');
    const wrapper = () => host.querySelector('[data-cds-disabled-reason-wrapper]');
    const tab = id => host.querySelector(`[data-vtb-id="${id}"] [role="tab"]`);
    await render(8);
    await flush();
    plus().focus();
    assert.equal(dom.document.activeElement, plus());
    await render(9);
    await flush();
    assert.equal(plus().disabled, true);
    assert.equal(wrapper().getAttribute('tabindex'), '0');
    assert.equal(dom.document.activeElement, tab('t9'), 'focus moved to the open tab');
    // The reason wrapper took focus (Tab to it); a tab closes: focus returns to + itself.
    wrapper().focus();
    await render(8);
    await flush();
    assert.equal(plus().disabled, false);
    assert.equal(wrapper().getAttribute('tabindex'), '-1');
    assert.equal(dom.document.activeElement, plus(), 'focus back on +');
    // Focus elsewhere (another tab) is left alone when the cap comes back; the body hands over to the open tab.
    tab('t3').focus();
    await render(9);
    await flush();
    assert.equal(dom.document.activeElement, tab('t3'));
    await render(8);
    await flush();
    assert.equal(dom.document.activeElement, tab('t3'), 'not on the slot: nothing to return');
    dom.document.activeElement = dom.document.body;
    await render(9);
    await flush();
    assert.equal(dom.document.activeElement, tab('t9'));
    await act(async () => root.unmount());
  });
});
