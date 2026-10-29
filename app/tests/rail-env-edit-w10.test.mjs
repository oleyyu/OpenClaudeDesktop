// w10-ccres-rail-env-edit (3.6556.2, panes notdone:89 first half): the Environment row's "Edit environment" button for a
// local session's named environment, and the edit request's dialog.
//   c73f45bc3 Zx      the ghost, xs, icon-only "Settings" button (cf74bc599 M_), preloading its dialog on intent
//                     (shared-78 t3 over ou / cc5b397c6 l); generated/session-rail/environment-edit.mjs.
//   c73f45bc3 fu      a saved environment the rail edits in place: local, not WSL, no variant (cf74bc599 n_).
//   cf74bc599 TN      `xn = t.type === "local" && !l && n_(_e) ? _e.id : null`, `Sn` writes `editEnvironmentRequest: xn`,
//                     `kn = y ? M_({onOpen: y}) : xn === null ? void 0 : M_({kind: "local", onOpen: Sn})` → Zj's
//                     environmentAction (the environment row's mark slot).
//   c73f45bc3 pu      the dialog over the save / edit requests (`isOpen: a !== null || u !== void 0`, `editing: y`,
//                     `onUpdate: O`), host: source-session-rail.jsx SessionRailSaveEnvironment over the host's saved
//                     environment dialog and main's saved-environments.
// Source/AST pins, SSR renders and a fake-DOM mount (tests/fixtures/preview-r3b-dom.mjs): no browser, no Electron, no
// network, no real config.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;
const C73 = 'c73f45bc3-B7hbL7H9.js';
const RAIL = 'cf74bc599-CRYqipWN.js';

let server, Rail, Edit, View, Layout, Shown, Breadcrumb, CdsButton;
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
  Edit = await server.ssrLoadModule('/src/generated/session-rail/environment-edit.mjs');
  View = await server.ssrLoadModule('/src/generated/session-rail/rail-view.mjs');
  Layout = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-layout.mjs');
  Shown = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-shown-store.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  ({ CdsButton } = await server.ssrLoadModule('/src/generated/view-tabs/index.js'));
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});
after(async () => {
  for (const root of ROOTS) { try { root.unmount(); } catch { /* its DOM is gone */ } }
  Breadcrumb?.fileBrowserQueryClient.clear();
  await server?.close(); globalThis.window = savedWindow; globalThis.document = savedDocument;
});

// ---------------------------------------------------------------------------------------------------------------
test('official 3.6556.2: Zx, fu, pu and TN\'s environmentAction, read back literally', () => {
  const c73 = official(C73);
  pin(c73, [
    'function Zx(e){let $=J9(7),{kind:t,onOpen:n}=e,r=t===void 0?"cloud":t,a=Q(),o=yt(r==="local"?ou:ml),s=J2($,0,a,r)?K2($,0,a,r,r==="local"?a.formatMessage({defaultMessage:"Edit environment",id:"cfNkVEwvig"}):a.formatMessage({defaultMessage:"Edit cloud environment",id:"B2B5sIxbna"})):$[2];return J3($,3,o,n,s)?K3($,3,o,n,s,i(S,{...o,variant:"ghost",size:"xs",iconOnly:!0,flush:"end",icon:"Settings","aria-label":s,onClick:n})):$[6]}',
    'function fu(e){return e?.target.kind==="local"&&!e.target.wslDistro&&!e.target.variant}',
    'fu as Jn,', 'Zx as l,', 'ou=iu.handle', 'n as yt,',
    // pu: one dialog over both requests
    't.getState().editEnvironmentRequest!==null&&t.setState({editEnvironmentRequest:null})', 's!==null&&!u&&c()', 'qi(p,c)',
    't.setState({saveEnvironmentRequest:null,editEnvironmentRequest:null})', 'k=a!==null||u!==void 0',
    'lu(r,t,{source:"session_rail",touch:!1})', 'isOpen:k,onClose:E,editing:y,', 'focusName:j,', 'onCreate:D,onUpdate:O',
    'function gu(e){return e.editEnvironmentRequest}', 'function _u(e){return e.sessionRef?.id}',
  ]);
  pin(official('shared-78-D5Fw2h0a.js'), ['function t3(e){let $=J9(2),t;if(J1($,0,e)){let n=()=>{e?.preload("intent")};t={onPointerEnter:n,onFocus:n,onPointerDown:n},K1($,0,e,t)}else t=$[1];return t}', 't3 as n,']);
  pin(official('cc5b397c6-BgWEcD7A.js'), ['pick:e=>e.EpitaxyEditEnvironmentDialog', 'l=a.handle', 'l as r']);
  // c2934b6b4 d (pu's qi): the request is cleared on mount and on each change of the scope's session
  pin(official('c2934b6b4-VNp3DE8P.js'), ['function d(e,n){let $=J9(7),r=J1($,0,n)?K1($,0,n,()=>{n()}):$[1],i=J2($,2,n,e)?K2($,2,n,e,[e,n]):$[4];t(r,i);', 'd as i,']);
  const rail = official(RAIL);
  pin(rail, [
    'y=Xr(n,PN)', 'xn=J1($,241,l)||J2($,242,t.type,_e)?I2($,242,Z1($,241,t.type==="local"&&!l&&n_(_e)?_e.id:null,l),t.type,_e):$[244]',
    'Sn=J2($,245,xn,n)?K2($,245,xn,n,()=>n.setState({editEnvironmentRequest:xn})):$[247]',
    'kn=J3($,258,y,Sn,xn)?K3($,258,y,Sn,xn,y?s(M_,{onOpen:y}):xn===null?void 0:s(M_,{kind:"local",onOpen:Sn})):$[261]',
    'environmentAction:kn,saveEnvironment:An', 'function PN(e){return e.openEditEnvironment}', 'Jn as n_,', ',l as M_,',
  ]);
});

test('generator: environment-edit.mjs slices Zx and fu with the view-tabs CDS, the kit\'s t3 and null dialog handles', () => {
  const manifest = JSON.parse(read('src/generated/session-rail/manifest.json'));
  const entry = manifest.modules.find((m) => m.target === 'environment-edit.mjs');
  assert.ok(entry);
  assert.equal(entry.source, C73);
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(v1, C73))));
  assert.equal(entry.sha256, sha(read('src/generated/session-rail/environment-edit.mjs')));
  assert.deepEqual(entry.bindings.map((b) => b.name), ['fu', 'Zx']);
  assert.deepEqual(entry.exports, { Zx: 'RailEditEnvironmentButton', fu: 'isRailEditableEnvironment' });
  const imports = Object.fromEntries(entry.imports.map((i) => [i.local, `${i.kind}:${i.name}`]));
  assert.deepEqual(imports, {
    J9: 'view-tabs:reactMemoCache', Q: 'adapter:useIntl', yt: 'session-rail-kit:useLazyPreloadProps', ou: 'adapter:localEnvironmentDialogHandle',
    ml: 'adapter:cloudEnvironmentDialogHandle', J2: 'view-tabs:memoChanged2', K2: 'view-tabs:memoStore2', J3: 'view-tabs:memoChanged3',
    K3: 'view-tabs:memoStore3', S: 'view-tabs:CdsButton', i: 'react:jsx',
  });
  // each binding is the original declaration, byte for byte
  const c73 = official(C73);
  for (const binding of entry.bindings) {
    const start = c73.indexOf(`function ${binding.name}(`);
    assert.ok(start >= 0, binding.name);
    let depth = 0, end = c73.indexOf('{', start);
    for (; end < c73.length; end++) { if (c73[end] === '{') depth++; else if (c73[end] === '}' && --depth === 0) break; }
    assert.equal(binding.sha256, sha(c73.slice(start, end + 1)), binding.name);
  }
  // the TN call site pins the environmentAction wiring
  assert.ok(manifest.callSites.some((site) => site.raw && site.features.includes('y?s(M_,{onOpen:y}):xn===null?void 0:s(M_,{kind:"local",onOpen:Sn})')));
  const adapters = read('src/source-session-rail-adapters.jsx');
  pin(adapters, ['export const localEnvironmentDialogHandle = null;', 'export const cloudEnvironmentDialogHandle = null;']);
});

test('fu: local, not WSL, no variant', () => {
  const ok = Edit.isRailEditableEnvironment;
  assert.equal(ok({ id: 'e', target: { kind: 'local', cwd: '/w' } }), true);
  assert.equal(ok({ id: 'e', target: { kind: 'local', cwd: '/w', wslDistro: 'Ubuntu' } }), false);
  assert.equal(ok({ id: 'e', target: { kind: 'local', cwd: '/w', variant: 'x' } }), false);
  assert.equal(ok({ id: 'e', target: { kind: 'ssh', host: 'h' } }), false);
  assert.equal(ok(undefined), false);
});

test('Zx (SSR): the ghost xs icon-only Settings button, "Edit environment" locally and "Edit cloud environment" otherwise; in the row\'s mark slot', () => {
  const local = renderToStaticMarkup(h(Edit.RailEditEnvironmentButton, { kind: 'local', onOpen() {} }));
  assert.match(local, /^<button /);
  assert.match(local, /aria-label="Edit environment"/);
  assert.match(local, /data-cds="Button"/);
  const cloud = renderToStaticMarkup(h(Edit.RailEditEnvironmentButton, { onOpen() {} }));
  assert.match(cloud, /aria-label="Edit cloud environment"/);
  // the same markup as the view-tabs CdsButton with Zx's props (variant ghost, size xs, iconOnly, flush end, icon Settings)
  const direct = renderToStaticMarkup(h(CdsButton, { onPointerEnter() {}, onFocus() {}, onPointerDown() {}, variant: 'ghost', size: 'xs', iconOnly: true,
    flush: 'end', icon: 'Settings', 'aria-label': 'Edit environment', onClick() {} }));
  assert.equal(local, direct);
  assert.notEqual(local, renderToStaticMarkup(h(CdsButton, { variant: 'ghost', size: 'sm', iconOnly: true, flush: 'end', icon: 'Settings', 'aria-label': 'Edit environment' })));
  const session = { environment: { label: 'widgets', kind: 'Local session' }, folder: { name: 'widgets', path: '/w' }, extraFolders: [], branch: null,
    worktree: null, goal: null, isLocal: true };
  const html = renderToStaticMarkup(h(Layout.RailFlatContext.Provider, { value: true },
    h(View.SessionRail, { plan: [], artifacts: [], session, sessionKey: 's', environmentAction: h(Edit.RailEditEnvironmentButton, { kind: 'local', onOpen() {} }) })));
  assert.ok(html.includes(local), 'Zj puts environmentAction in the environment row');
  const without = renderToStaticMarkup(h(Layout.RailFlatContext.Provider, { value: true },
    h(View.SessionRail, { plan: [], artifacts: [], session, sessionKey: 's' })));
  assert.equal(count(without, 'aria-label="Edit environment"'), 0);
});

test('host source: TN\'s xn / Sn / kn in the stand-in, pu in SessionRailSaveEnvironment, main\'s update and delete', () => {
  const view = read('src/source-session-rail.jsx');
  pin(view, [
    'import { RailEditEnvironmentButton, isRailEditableEnvironment } from "./generated/session-rail/environment-edit.mjs";',
    'const y = useStore(t, (state) => state.openEditEnvironment);',
    'const xn = e.type === "local" && !o && isRailEditableEnvironment(K) ? K.id : null;',
    'const Sn = useCallback(() => t.setState({ editEnvironmentRequest: xn }), [t, xn]);',
    'const kn = y ? <RailEditEnvironmentButton onOpen={y} /> : xn === null ? undefined : <RailEditEnvironmentButton kind="local" onOpen={Sn} />;',
    'environmentAction={kn}',
    'useEffect(() => { s !== null && !u && c(); }, [s, u, c]);', 'useLayoutEffect(() => { c(); }, [p, c]);',
    'const close = () => { scopeStore.setState({ saveEnvironmentRequest: null, editEnvironmentRequest: null }); };',
    'if (y) { await host.updateEnvironment(y.id, value); return; }',
  ]);
  assert.equal(count(view, 'Zx is not sliced'), 0, 'the w6 "Not followed" note is gone');
  const main = read('src/main.jsx');
  pin(main, ["updateEnvironment: (id, value) => savedEnvironments.run({ op: 'save', id, value }),",
    "deleteEnvironment: (id) => savedEnvironments.run({ op: 'delete', id }),"]);
});

test('zh-CN: both labels are translated', async () => {
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh['Edit environment'], '编辑环境');
  assert.equal(zh['Edit cloud environment'], '编辑云端环境');
  const panes = read('electron/i18n/zh-CN/panes.mjs');
  pin(panes, ['// V3-w10-ccres-rail-env-edit:', '// V3-w10-ccres-rail-env-edit end.']);
});

// ---------------------------------------------------------------------------------------------------------------
const ROOT = '/Users/me/widgets';
const ENV = { id: 'env9', name: 'widgets', target: { kind: 'local', cwd: ROOT, additionalFolders: [] }, settings: {} };
function desktopFor(records = {}) {
  return createDesktop({
    'session-rail-meta': ({ sessionId }) => records[sessionId] ?? null,
    'monitor-state': () => [], 'schedule-state': () => [],
    'workspace-info': ({ cwd }) => ({ isRepo: false, cwd, branches: [] }),
    'repo-identities': ({ cwds }) => Object.fromEntries(cwds.map((cwd) => [cwd, { isRepo: true, toplevel: ROOT, owner: 'me', name: 'widgets' }])),
  });
}
function hostFor(desktop, over = {}) {
  const host = {
    call: desktop.call, desktop, cwd: ROOT, recordKey: 'live', mountKey: 's1', isPanelActive: true, readOnly: false, transcriptRef: { current: null },
    items: [], gitStatus: { isRepo: true, cwd: ROOT, branch: 'main', hasChanges: false, added: 0, removed: 0 },
    changes: { diffOpenable: false, onOpen() {}, onToggle() {}, hasChord: true, verb: null },
    preview: { available: false, snapshot: null }, openPanes: new Set(['chat']), openPane() {},
    tasks: [], stopTask: async () => {}, openTasks() {}, openFile() {}, revealFolder() {}, copyText() {}, openTerminal() {},
    environmentId: 'env9', savedEnvironments: [ENV], recentFolders: [], openLocalEnvironment() {},
    saveEnvironment: async () => { throw Error('not in this test'); },
    ...over,
  };
  return host;
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
const editButton = (container) => aside(container)?.querySelector('button[aria-label="Edit environment"]') ?? null;
const click = async (node) => {
  await act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, nativeEvent: {} }); });
  await flush();
};

test('TN stand-in + pu: the named local environment\'s Edit environment opens the editor on it; saving updates it in place', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const updated = [];
    let environments = [ENV];
    const make = (over = {}) => hostFor(desktop, { savedEnvironments: environments,
      updateEnvironment: async (id, value) => { updated.push([id, value]); environments = [{ ...ENV, ...value, id }]; },
      deleteEnvironment: async () => {}, ...over });
    const { container, root, rerender } = await mountTile(dom, make());
    assert.ok(aside(container).textContent.includes('widgets'), 'the environment row shows the named environment');
    const button = editButton(container);
    assert.ok(button, aside(container).innerHTML.slice(0, 400));
    assert.equal(button.getAttribute('data-cds'), 'Button');
    // Zj's mark slot: no Save link beside a named environment, so the button is the slot's only content
    assert.equal(aside(container).querySelector('[data-testid="rail-save-environment-link"]'), null);
    assert.equal(dom.document.body.querySelector('form'), null, 'no dialog before the click');
    await click(button);
    // Sn put the environment id on the scope store; pu opened the host dialog in its editing state
    const text = dom.document.body.textContent;
    assert.ok(text.includes('Edit environment'), 'the dialog title');
    assert.ok(text.includes('Delete environment'), 'editing offers Delete environment');
    const form = dom.document.body.querySelector('form');
    assert.ok(form, 'the dialog form');
    const name = form.querySelector('input');
    assert.equal(name.value ?? name.getAttribute('value'), 'widgets', 'the editor starts from the environment');
    await act(async () => { await reactProps(form).onSubmit?.({ preventDefault() {}, stopPropagation() {} }); });
    await flush();
    assert.equal(updated.length, 1, 'onUpdate');
    assert.equal(updated[0][0], 'env9');
    assert.equal(updated[0][1].name, 'widgets');
    assert.deepEqual(updated[0][1].target.cwd, ROOT);
    assert.equal(dom.document.body.querySelector('form'), null, 'the dialog closed and cleared the request');
    await rerender(make());
    assert.ok(editButton(container), 'the button stays');
    // pu drops a request whose environment is gone
    await click(editButton(container));
    assert.ok(dom.document.body.querySelector('form'));
    environments = [];
    await rerender(make());
    assert.equal(dom.document.body.querySelector('form'), null, 'the edited environment went away');
    assert.equal(editButton(container), null, 'no named environment, no button');
    await act(async () => { root.unmount(); });
    // fu: a WSL environment, a read-only session, and no named environment get no button
    for (const over of [{ savedEnvironments: [{ ...ENV, target: { ...ENV.target, wslDistro: 'Ubuntu' } }] }, { readOnly: true }, { environmentId: undefined }]) {
      environments = [ENV];
      const next = await mountTile(dom, make(over));
      assert.equal(editButton(next.container), null, JSON.stringify(over));
      await act(async () => { next.root.unmount(); });
    }
  });
});
