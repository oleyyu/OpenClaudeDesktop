// R4f-rail SR-7 (2.42304.0): the Code session rail mounted in the chat tile (src/source-session-rail.jsx).
//   cc43287c9 jre   the rail's state machine (Jt / Zt / Qt / en … cn, the raised overlay ln, fn / yn / vn / bn), the chat
//                   geometry (root Cy / Sy / Ty, body row yy + by + @container + data-session-rail-overflow, inner yy + Ey)
//                   and the mount points (DH and jH in the chat panel body, wH after it, bH after the body); Mte drops
//                   the composer's PR band in rail mode.
//   cf74bc599 fO    the rail's data assembly; SessionRailHostView is its host stand-in over the session record (SR-5),
//                   the folder's git status, the transcript, the Preview pane's servers and the Background tasks feeds.
//   cc5638815a lt   a session popout reads the session-only shown store (cc43287c9 PH).
// Nothing here launches Electron or a browser: the fake DOM is tests/fixtures/preview-r3b-dom.mjs, the desktop bridge a
// stub that answers from tables (no processes, no ports, no network, no real config).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;

let server, Rail, Order, Mention, Shown, Layout, Breadcrumb;
const ROOTS = new Set();
let savedWindow, savedDocument;
before(async () => {
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21).
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { document: globalThis.document, localStorage: undefined, addEventListener() {}, removeEventListener() {}, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Rail = await server.ssrLoadModule('/src/source-session-rail.jsx');
  Order = await server.ssrLoadModule('/src/generated/code-current/file-output-order.mjs');
  Mention = await server.ssrLoadModule('/src/mention-output-model.mjs');
  Shown = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-shown-store.mjs');
  Layout = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-layout.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});
// The rail's git-info queries live in the app's QueryClient (gcTime 10 min): clear it, and unmount what a failed test left.
after(async () => {
  for (const root of ROOTS) { try { root.unmount(); } catch { /* its DOM is gone */ } }
  Breadcrumb?.fileBrowserQueryClient.clear();
  await server?.close(); globalThis.window = savedWindow; globalThis.document = savedDocument;
});

// ---------------------------------------------------------------------------------------------------------------
test('official 2.42304.0: jre geometry and mount points, the band in rail mode, and the fO pieces the stand-in follows', () => {
  const cc = official('cc43287c9-DAfOi8yP.js');
  pin(cc, [
    // the state machine and the mount points (also pinned by the session-rail-kit manifest)
    'let Xt=AD($E),Zt=jp(Yt,Jt,Xt),{shown:Qt,setShown:$t}=FH(),en=Kt&&Jt&&!ae&&Qt&&Zt,tn=Jt&&(!Kt||en),nn=tn&&!Ee,rn=Jt&&!Ee,an=nn?ce:null,on=an!==null,sn=on&&Qt&&Zt,cn=(on||en||nn&&le==="spawning")&&Qt&&Zt;',
    'vn=A(e=>{if(fn){un(null),sn&&$t(!1);return}$t(!0),Zt||un(an?{id:an.id,focus:e?.detail===0}:null)},[fn,sn,Zt,an,$t]),yn=dn||!fn&&!Zt,bn=x(()=>({onScreen:fn,raises:yn,panelId:hn,onToggle:vn}),[fn,yn,hn,vn])',
    '(e.railMode!==on||e.railActive!==cn)&&U.setState({railMode:on,railActive:cn})',
    'on&&!ne&&v(DH,{model:bn,scopeRef:ft})',
    'dn&&an&&v(jH,{sessionRef:an,scopeStore:U,mountKey:e,isPanelActive:kt,onRequestComposerFocus:Nn,readOnly:Le||Rt,scrollRef:ut,panelId:hn,toggleRef:mn,focusOnMount:ln?.focus===!0,onDismiss:_n})',
    'an&&!fn&&v(wH,{sessionRef:an,scopeStore:U,isPanelActive:kt,readOnly:Le||Rt,pickersElsewhere:pn,onRaise:gn})',
    'cn?an?v(bH,{sessionRef:an,scopeStore:U,mountKey:e,isPanelActive:kt,onRequestComposerFocus:Nn,readOnly:Le||Rt,scrollRef:ut}):v("div",{ref:Wt,[Zc]:"",className:Gp}):null',
    // geometry: root, body row, inner box, chat panel body
    '${Jt?` ${gp}`:""}${nn?` ${Zp}`:""}${cn?` ${xp}`:""}',
    '...cn?{[mm]:""}:void 0',
    'className:Jt?`${Bp}${rn?` ${Cp}`:""}${nn?` ${Up}`:""}${qt?` ${Dl}`:""}`:qt?`${Bp} ${Dl}`:"contents"',
    'className:Jt?`${Bp}${cn?` ${Jp}`:""}`:"contents"',
    'className:`epitaxy-chat-panel-body flex-1 min-h-0 relative ${Kt?`w-full ${Lc}`:""}`',
    'p("div",{ref:ft,[Wc]:"",tabIndex:-1,className:"h-full isolate focus:outline-none",children:[', 'Hd as Wc',
    'Nd as Bp', 'Fd as Cp', 'Pd as Up', 'Ud as Jp', 'kd as mm', 'Bd as gp', 'Vd as Zp', 'Ed as xp', 'K as $E', 'pt as AD',
    'Ee=tp(U,e=>e.isSessionNotFound)',
    // Mte: no PR band while the session is in rail mode
    'mr=tp(Zn,e=>e.railMode)', 'tn||on||ua||mr?null:tr?v(Tee,{sessionRef:tr,onRequestComposerFocus:xo},',
    // wH
    'var SH=new Set(["model","mode","permissions","effort","context"])', 'Gd as Tp',
  ]);
  const s18 = official('shared-18-D4XxL6Tg.js');
  pin(s18, ['yy="relative flex min-h-0 flex-1 flex-col",by="pb-0.75"', 'yy as Nd', 'by as Fd', 'wy as Pd', 'Ey as Ud', 'xy as kd', 'Cy as Bd', 'Sy as Vd', 'Ty as Ed', 'Fy as Gd',
    'function VC(e){return e?.find(e=>e.isPrimary)}']);
  assert.equal(Rail.RAIL_BODY_ROW_CLASS, 'relative flex min-h-0 flex-1 flex-col');
  assert.equal(Rail.RAIL_BODY_ROW_INSET_CLASS, 'pb-0.75');
  assert.equal(Rail.CHAT_PANEL_BODY_CLASS, 'epitaxy-chat-panel-body flex-1 min-h-0 relative');
  assert.ok(Rail.TRANSCRIPT_REGION_CLASS.startsWith('h-full isolate focus:outline-none '));
  pin(official('c03935b01-CyJKQj4N.js'), ['function uo(e){return b(e.tileLayout).size>1}', 'uo as K', 'Q as pt']);
  // c5638815a lt: the session popout wraps its content in PH (exported p).
  pin(official('c5638815a-D1NXo6h5.js'), ['p as Me', 'n(Me,{children:n(dt,{sessionRef:g,']);
  // fO and the small originals the stand-in reproduces
  pin(official('cf74bc599-D9NZWRyl.js'), [
    'defaultMessage:"Local session",id:"c/uojv10Mk"', 'defaultMessage:"Cloud",id:"fiPvwYljok"', 'function dO({folder:e,target:t,trailing:n,after:r})',
    'Be=zd(e)', 'Ve=wg(e,"session_rail")', 'Re=Iu(e)(Pe.folder?.path)', 'ze=Pe.folder?.hidePath?void 0:Re',
    'labels:{local:je?.label??le,cloud:ue,bridge:de}', 'je=Zc(J==="local"?e.id:void 0)', 'Ae=J==="local"?oe:void 0', 'oe=fg()', 'le=ot(_)',
    'K=ey(e.id,ce)', 'named:K&&{name:K.name,icon:sa(K.target.kind)}',
    'pullRequests:o?void 0:u(Sh,{sessionRef:e,layout:"rail",onRequestComposerFocus:i},e.id)',
    'P=e.type==="local"?ji(E):E?.[0],F=P??E?.find(e=>!e.cwd)',
    '$e=f(()=>{if(!Re||!Ve)return;let e=V&&H.branch!==void 0?V:Re;', 'qe=jh(e,o||!C)',
  ]);
  pin(official('shared-20-B7UqYfsi.js'), ['function Hk(e){switch(e){case"local":return"Laptop";case"cloud":return"Cloud";case"ssh":return"CommandLine";case"bridge":return"Cursor"}}', 'Hk as O']);
  pin(official('shared-19-CkPOiIKm.js'), ['function j7(e){return e.formatMessage({defaultMessage:"This computer",id:"Red8UM0oCv"})}']);
  pin(official('c18ab0d94-Cs43UEnF.js'), ['function C(){let e=x();return p()?e.formatMessage({defaultMessage:"Show in Finder",id:"LVY6c4L1SF"}):f()?e.formatMessage({defaultMessage:"Show in Explorer",id:"ySAk9qhogV"}):e.formatMessage({defaultMessage:"Show in file manager",id:"3NCn5oLFoE"})}']);
  pin(official('shared-78-D6VXYXaQ.js'), ['Ka=/(win32|win64|windows|wince)/i', 'Wa as kw', 'qa as Pw']);
  pin(official('c3e58cab4-BWA3zrEt.js'), ['var f=/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u200e\\u200f\\u061c\\u202a-\\u202e\\u2066-\\u2069]/g;function p(e){return e.replace(f,"")}']);
  pin(official('c227f4d5e-Ba-r--Rl.js'), [
    'function mL(e){let t=[];for(let n of e)n.forEach((e,n)=>{t.push(n===0&&t.length>0?{...e,separatorBefore:!0}:e)});return t}',
    'defaultMessage:"Path copied to clipboard.",id:"hxPm8s77hY"', 'defaultMessage:"Branch name copied to clipboard.",id:"fgBg6M20SL"',
    'defaultMessage:"Copy",id:"4l6vz1/eZ5"', 'defaultMessage:"Path",id:"Qp1beM93yV"', 'defaultMessage:"Branch name",id:"aXh5Ujo5jI"',
    'defaultMessage:"Copy path",id:"Qask1i8TzH"', 'defaultMessage:"Copy branch name",id:"31wtg7KV1e"',
    // uL: no change-folder item without the desktop's changeCwd; Zc (= $t) is Dq, `() => void 0`.
    'return!o||!s?null:c', 'Dq=()=>void 0', 'Dq as $t',
  ]);
  pin(official('c73f45bc3-CFrHin0p.js'), [
    'function x_(e,t){let n=Qe().sessions.lists_repositories,r=nt();return e.type==="remote"&&!t&&(!n||r.state==="listed"&&r.repositories.length>0)}',
    'function Ty({snapshot:e,held:t,scopeStore:r,children:i}){return e!==null&&t?c(Sy,{snapshot:e,scopeStore:r}):c(n,{children:i})}',
  ]);
  pin(official('c5da7eb42-B8cTG8SI.js'), ['function QM(e){return e?{remote:e.remote}:null}']);
});

// ---------------------------------------------------------------------------------------------------------------
// Host data for one Code session, and a chat tile harness that mounts the rail as main.jsx does.
const ROOT = '/Users/me/widgets';
const WORKTREE = `${ROOT}/.claude/worktrees/feat`;
function desktopFor({ records = {}, jobs = [], monitors = [] } = {}) {
  return createDesktop({
    'session-rail-meta': ({ sessionId }) => records[sessionId] ?? null,
    'monitor-state': () => monitors,
    'schedule-state': () => jobs,
    'repo-identities': ({ cwds }) => Object.fromEntries(cwds.map((cwd) => [cwd, { isRepo: true, toplevel: ROOT, owner: 'me', name: 'widgets' }])),
    'preview-navigate': () => true, 'preview-server-stop': () => true, 'schedule-stop': () => true, 'monitor-stop': () => true,
  });
}
function hostFor(desktop, over = {}) {
  const calls = [];
  const log = (name) => (...args) => { calls.push([name, ...args]); };
  const host = {
    call: desktop.call, desktop, cwd: ROOT, recordKey: 'live', mountKey: 's1', isPanelActive: true, readOnly: false, transcriptRef: { current: null },
    items: [{ id: 'i1', type: 'fileChange', status: 'completed', changes: [{ path: 'docs/notes.md', kind: 'add' }] }],
    gitStatus: { isRepo: true, cwd: ROOT, branch: 'feat/rail', hasChanges: true, added: 12, removed: 3, comparison: { base: 'main' } },
    changes: { diffOpenable: true, onOpen: log('openChanges'), onToggle: log('toggleChanges'), hasChord: true, verb: { mode: 'commit', onClick: log('commit'), disabled: false } },
    preview: { available: true, snapshot: { sessionId: 's1', cwd: ROOT, url: 'http://localhost:5173/', servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'running', startedAt: 1 }] } },
    openPanes: new Set(['chat']), openPane: log('openPane'),
    tasks: [{ id: 'bash:1', kind: 'bash', processId: 7, status: 'running', description: 'npm test', startedAt: Date.now() - 5000 }],
    stopTask: async (task) => { calls.push(['stopTask', task.id]); }, openTasks: log('openTasks'), openFile: log('openFile'),
    revealFolder: log('reveal'), copyText: log('copy'), openTerminal: log('terminal'),
    environmentId: undefined, savedEnvironments: [],
    ...over,
  };
  return { host, calls };
}
const RAIL_SEEN = [];
function Tile({ sessionId = 's1', sessionNotFound = false, besidePane = false, host }) {
  const rail = Rail.useSessionRail({ enabled: true, sessionId, sessionNotFound, besidePane });
  RAIL_SEEN.push(rail);
  if (RAIL_SEEN.length > 3000) { RAIL_SEEN.length = 0; throw Error('render loop'); }
  return h('div', { className: 'source-chat-tile-content' },
    h('button', { ref: rail.railToggleRef, id: 'rail-toggle', type: 'button', onClick: rail.railToggle?.onToggle }, 'toggle'),
    h('div', { className: 'source-chat-body' },
      h(Rail.SessionRailRow, { rail, host },
        h('div', { className: `conversation ${rail.bandClassName}` },
          h(Rail.SessionRailChatBody, null, h('div', { className: 'source-transcript-frame' }, 'transcript')),
          h('div', { className: 'composer-zone' }, 'composer')),
        h(Rail.SessionRailColumn))));
}
const latest = () => RAIL_SEEN.at(-1);
const flush = async (times = 6) => { for (let i = 0; i < times; i++) await act(async () => { await new Promise((resolve) => setImmediate(resolve)); }); };

// The row measures with getBoundingClientRect / ResizeObserver: the row (the element with @container) is `width` wide.
function sizeRows(dom, width) {
  dom.__railWidth = width;
  if (!dom.__railSized) {
    dom.__railSized = true;
    const rect = dom.Element.prototype.getBoundingClientRect;
    dom.Element.prototype.getBoundingClientRect = function () {
      return (this.getAttribute('class') ?? '').split(/\s+/).includes('@container') ? { x: 0, y: 0, top: 0, left: 0, right: dom.__railWidth, bottom: 600, width: dom.__railWidth, height: 600 } : rect.call(this);
    };
  }
}
async function resize(dom, width) {
  sizeRows(dom, width);
  // Only the observers of a body row (the element with @container), from a snapshot: other observers may create more.
  const rows = [...dom.observers.resize].filter((observer) => observer.targets?.some((target) => (target.getAttribute?.('class') ?? '').split(/\s+/).includes('@container')));
  await act(async () => { for (const observer of rows) observer.callback([{ borderBoxSize: [{ inlineSize: width, blockSize: 600 }] }]); });
}
// What the CDS / Base UI parts read on top of the R3b fake DOM (as tests/session-rail-sections.test.mjs adds it).
function prepare(dom) {
  if (dom.__railPrepared) return;
  dom.__railPrepared = true;
  const style = dom.window.getComputedStyle;
  dom.window.getComputedStyle = (node) => ({ ...style(node), animationName: 'none', animationDuration: '0s', transitionDuration: '0s' });
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  const observe = dom.window.ResizeObserver.prototype.observe;
  dom.window.ResizeObserver.prototype.observe = function (target, options) { (this.targets ??= []).push(target); return observe.call(this, target, options); };
  Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
}
async function mountTile(dom, props, { width = 900, popout = false } = {}) {
  prepare(dom);
  sizeRows(dom, width);
  const container = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(container);
  ROOTS.add(root);
  const tree = h(Rail.SessionRailShownScope, { popout }, h(Tile, props));
  await act(async () => { root.render(tree); });
  await flush();
  return { container, root, rerender: async (next) => { await act(async () => { root.render(h(Rail.SessionRailShownScope, { popout }, h(Tile, { ...props, ...next }))); }); await flush(); } };
}
const resetShown = () => { Shown.sessionRailShownStore.setState({ shown: true }); };

// ---------------------------------------------------------------------------------------------------------------
test('jre on a wide session page: rail mode, the docked column with the geometry classes, a pressed toggle without overlay semantics', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop);
    const { container, root } = await mountTile(dom, { host }, { width: 900 });
    const rail = latest();
    assert.equal(rail.on, true); assert.equal(rail.fits, true); assert.equal(rail.active, true); assert.equal(rail.docked, true);
    assert.deepEqual({ onScreen: rail.railToggle.onScreen, raises: rail.railToggle.raises }, { onScreen: true, raises: false });
    assert.equal(rail.scopeStore.getState().railMode, true); assert.equal(rail.scopeStore.getState().railActive, true);
    const row = container.querySelector('[data-session-rail-overflow]');
    assert.ok(row, 'the body row carries data-session-rail-overflow while the rail is docked');
    const rowClass = row.getAttribute('class');
    for (const token of [Rail.RAIL_BODY_ROW_CLASS, 'pb-0.75', '@container', Layout.RAIL_TITLEBAR_INSET_CLASS, Layout.RAIL_GUTTER_CLASS, Layout.RAIL_CHAT_GEOMETRY_CLASS]) assert.ok(rowClass.includes(token), token.slice(0, 40));
    assert.equal(container.querySelector('.conversation').getAttribute('class'), `conversation ${Layout.RAIL_BAND_PADDING_CLASS}`);
    const region = container.querySelector('.source-transcript-frame').parentNode;
    assert.equal(region.getAttribute('class'), 'h-full isolate focus:outline-none flex flex-col');
    assert.equal(region.parentNode.getAttribute('class'), 'epitaxy-chat-panel-body flex-1 min-h-0 relative flex flex-col');
    const column = container.querySelector('[data-epitaxy-rail-column]');
    assert.ok(column, 'bH: div[data-epitaxy-rail-column]');
    assert.equal(column.parentNode === row, true, 'the docked column is the body row\'s last child, after the conversation');
    assert.equal(column.getAttribute('class'), Layout.RAIL_DOCKED_COLUMN_CLASS);
    const aside = column.querySelector('aside[aria-label="Session details"]');
    assert.ok(aside, 'the host stand-in renders rD inside the column');
    assert.equal(container.querySelector('[role="group"][aria-label="Session details"]') === null, true, 'no overlay while docked');
    await act(async () => { root.unmount(); });
  });
});

test('jre: the landing page and a missing session have no rail; the row and panel body stay display: contents', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop);
    for (const props of [{ sessionId: null, host }, { sessionId: 's1', sessionNotFound: true, host }]) {
      const { container, root } = await mountTile(dom, props, { width: 1200 });
      const rail = latest();
      assert.equal(rail.on, false); assert.equal(rail.railToggle, undefined); assert.equal(rail.active, false);
      assert.equal(container.querySelector('[data-epitaxy-rail-column]') === null, true);
      assert.equal(container.querySelector('.source-chat-body').firstChild.getAttribute('class'), 'contents');
      assert.equal(container.querySelector('.source-transcript-frame').parentNode.getAttribute('class'), 'contents');
      assert.equal(container.querySelector('.source-transcript-frame').parentNode.parentNode.getAttribute('class'), 'contents');
      assert.equal(container.querySelector('.conversation').getAttribute('class'), 'conversation ');
      assert.equal(desktop.count('session-rail-meta'), 0, 'no record read without a rail');
      await act(async () => { root.unmount(); });
    }
    // railMode (tn) follows the session view, rail on screen or not.
    const { root } = await mountTile(dom, { host }, { width: 400 });
    assert.equal(latest().railMode, true); assert.equal(latest().on, true); assert.equal(latest().active, false);
    await act(async () => { root.unmount(); });
  });
});

test('jre below 611 px: the toggle raises the overlay (focus in on a keyboard press); Escape and an outside press dismiss it back to the toggle', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop);
    const { container, root } = await mountTile(dom, { host }, { width: 610 });
    let rail = latest();
    assert.equal(rail.fits, false); assert.equal(rail.active, false);
    assert.deepEqual({ onScreen: rail.railToggle.onScreen, raises: rail.railToggle.raises }, { onScreen: false, raises: true });
    assert.equal(container.querySelector('[data-epitaxy-rail-column]') === null, true);
    const toggle = container.querySelector('#rail-toggle');
    toggle.focus();
    await act(async () => { rail.railToggle.onToggle({ detail: 0 }); });
    await flush();
    rail = latest();
    const overlay = container.querySelector('[role="group"][aria-label="Session details"]');
    assert.ok(overlay, 'jH');
    assert.equal(overlay.getAttribute('id'), rail.panelId);
    assert.equal(overlay.parentNode === container.querySelector('.source-transcript-frame').parentNode.parentNode, true, 'inside the chat panel body, after the isolated transcript region');
    assert.equal(overlay.firstChild.hasAttribute('data-session-rail-flat'), true);
    assert.equal(dom.document.activeElement === overlay, true, 'a keyboard press (detail 0) moves focus into the overlay');
    assert.deepEqual({ onScreen: rail.railToggle.onScreen, raises: rail.railToggle.raises }, { onScreen: true, raises: true });
    assert.equal(Shown.sessionRailShownStore.getState().shown, true);
    // Escape with focus inside: dismissed, focus back on the toggle.
    await act(async () => { dom.document.dispatchEvent({ type: 'keydown', key: 'Escape', defaultPrevented: false, preventDefault() {}, stopPropagation() {} }); });
    await flush();
    assert.equal(container.querySelector('[role="group"][aria-label="Session details"]') === null, true);
    assert.equal(dom.document.activeElement === toggle, true);
    // A mouse press opens it without moving focus; a press outside dismisses it.
    await act(async () => { latest().railToggle.onToggle({ detail: 1 }); });
    await flush();
    assert.ok(container.querySelector('[role="group"][aria-label="Session details"]'));
    assert.equal(dom.document.activeElement === toggle, true);
    // OH: a press outside the overlay but inside the app root dismisses it (a press in another top-level layer would not).
    const outside = container.querySelector('.composer-zone');
    await act(async () => { dom.document.dispatchEvent({ type: 'pointerdown', target: outside, pointerType: 'mouse', offsetX: 0, offsetY: 0 }); });
    await flush();
    assert.equal(container.querySelector('[role="group"][aria-label="Session details"]') === null, true);
    // Widening while shown docks it.
    await resize(dom, 900);
    await flush();
    assert.equal(latest().docked, true);
    assert.ok(container.querySelector('[data-epitaxy-rail-column]'));
    await act(async () => { root.unmount(); });
  });
});

test('jre beside a pane: 771 px are needed (My beside-pane); alone 611 px', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop);
    const { root, rerender } = await mountTile(dom, { host, besidePane: true }, { width: 770 });
    assert.equal(latest().fits, false);
    await resize(dom, 771); await flush();
    assert.equal(latest().fits, true);
    await rerender({ besidePane: false }); await resize(dom, 611); await flush();
    assert.equal(latest().fits, true);
    await act(async () => { root.unmount(); });
  });
});

test('the shown store: hiding the docked rail persists persisted.epitaxy.sessionRailShown; a session popout keeps its own, hidden at first', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop);
    const { container, root } = await mountTile(dom, { host }, { width: 900 });
    await act(async () => { latest().railToggle.onToggle({ detail: 1 }); });
    await flush();
    assert.equal(latest().onScreen, false); assert.equal(container.querySelector('[data-epitaxy-rail-column]') === null, true);
    assert.equal(Shown.sessionRailShownStore.getState().shown, false);
    const saved = JSON.parse(dom.window.localStorage.getItem('persisted.epitaxy.sessionRailShown') ?? globalThis.localStorage?.getItem?.('persisted.epitaxy.sessionRailShown') ?? 'null');
    assert.equal(saved?.state?.shown, false);
    await act(async () => { latest().railToggle.onToggle({ detail: 1 }); });
    await flush();
    assert.equal(latest().docked, true);
    await act(async () => { root.unmount(); });
    // popout: PH's store (shown false, not persisted)
    const before = Shown.sessionRailShownStore.getState().shown;
    const popout = await mountTile(dom, { host }, { width: 900, popout: true });
    assert.equal(latest().onScreen, false); assert.equal(popout.container.querySelector('[data-epitaxy-rail-column]') === null, true);
    await act(async () => { latest().railToggle.onToggle({ detail: 1 }); });
    await flush();
    assert.equal(latest().docked, true);
    assert.equal(Shown.sessionRailShownStore.getState().shown, before, 'the persisted store is untouched');
    await act(async () => { popout.root.unmount(); });
  });
});

test('fO stand-in: Environment (This computer · Local session), folder chip, branch, Outputs, Changes, Servers and Background tasks from host data', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } }, jobs: [{ id: 'job1', prompt: 'check CI', recurring: true, createdAt: Date.now() - 1000, nextFireAt: Date.now() + 60000 }] });
    dom.window.desktop = desktop;
    const { host, calls } = hostFor(desktop);
    const { container, root } = await mountTile(dom, { host }, { width: 900 });
    const aside = container.querySelector('aside[aria-label="Session details"]');
    const text = aside.textContent;
    for (const needle of ['Environment', 'This computer', 'widgets', 'feat/rail', 'Outputs', 'notes.md', 'Servers', 'web', 'Background tasks', '2 running'])
      assert.ok(text.includes(needle), needle);
    assert.equal(desktop.last('session-rail-meta').sessionId, 's1');
    assert.equal(desktop.last('session-rail-meta').cwd, ROOT);
    // the environment row's hint is the kind (Local session); no Worktree mark for a session in its own folder
    assert.ok(aside.querySelector('[data-rail-section="environment"]') || text.includes('Environment'));
    assert.equal(text.includes('Worktree'), false);
    // Changes: OLe's flat row with the counts; the counts open the Changes pane, the verb commits.
    const row = aside.querySelector('[data-rail-changes-row]');
    assert.ok(row, 'the Changes row');
    const counts = row.querySelector('button[aria-label="Open changes, 12 added, 3 removed"]');
    assert.ok(counts);
    await act(async () => { reactProps(counts).onClick?.({ preventDefault() {}, stopPropagation() {} }); });
    assert.deepEqual(calls.find((entry) => entry[0] === 'openChanges')?.[0], 'openChanges');
    const commit = [...aside.querySelectorAll('button')].find((button) => button.textContent === 'Commit changes');
    assert.ok(commit, 'the commit verb');
    // Servers: the row opens the server in the Preview pane (its address), then the pane.
    const serverRow = [...aside.querySelectorAll('button')].find((button) => (button.getAttribute('aria-label') ?? '').includes('Open web in Preview'));
    assert.ok(serverRow, 'an openable server row');
    await act(async () => { reactProps(serverRow).onClick?.({ altKey: false, preventDefault() {}, stopPropagation() {} }); });
    assert.equal(desktop.last('preview-navigate')?.url, 'http://localhost:5173');
    assert.deepEqual(calls.filter((entry) => entry[0] === 'openPane').map((entry) => entry[1]), ['preview']);
    await act(async () => { root.unmount(); });
  });
});

test('fO stand-in: a worktree session shows the Worktree mark; read-only drops Changes and every stop; a named environment shows its name', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const record = { cwd: WORKTREE, originCwd: ROOT, worktreePath: WORKTREE, startedWithWorktree: true, branch: 'claude/feat' };
    const desktop = desktopFor({ records: { s1: record } });
    dom.window.desktop = desktop;
    const { host } = hostFor(desktop, { cwd: WORKTREE, gitStatus: { isRepo: true, cwd: WORKTREE, branch: 'claude/feat', hasChanges: false, added: 0, removed: 0 },
      environmentId: 'env1', savedEnvironments: [{ id: 'env1', name: 'Widgets env', target: { kind: 'local', cwd: ROOT } }] });
    const { container, root } = await mountTile(dom, { host }, { width: 900 });
    let aside = container.querySelector('aside[aria-label="Session details"]');
    assert.ok(aside.textContent.includes('Worktree'), 'dR "Worktree"');
    assert.ok(aside.textContent.includes('claude/feat'));
    assert.ok(aside.textContent.includes('Widgets env'), 'GE named: the saved environment\'s name');
    assert.equal(aside.textContent.includes('This computer'), false);
    await act(async () => { root.unmount(); });
    const readOnly = hostFor(desktop, { readOnly: true }).host;
    const second = await mountTile(dom, { host: readOnly }, { width: 900 });
    aside = second.container.querySelector('aside[aria-label="Session details"]');
    assert.equal(aside.querySelector('[data-rail-changes-row]') === null, true, 'pullRequests: o ? void 0 : …');
    assert.equal([...aside.querySelectorAll('button')].some((button) => /^Stop/.test(button.getAttribute('aria-label') ?? '')), false);
    await act(async () => { second.root.unmount(); });
  });
});

test('fO stand-in: Background tasks list host tasks with Monitors (not unknown ones) and stop each through the host', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    resetShown();
    const desktop = desktopFor({ records: { s1: { cwd: ROOT, originCwd: ROOT } }, monitors: [{ id: 'm1', description: 'watch logs', status: 'running', startedAt: Date.now() - 1000 }] });
    dom.window.desktop = desktop;
    const tasks = [
      { id: 'bash:1', kind: 'bash', processId: 7, status: 'running', description: 'npm test', startedAt: Date.now() - 5000 },
      { id: 'agent:1', kind: 'agent', status: 'running', description: 'reviewer', startedAt: Date.now() - 4000 },
      { id: 'bash:2', kind: 'bash', status: 'unknown', description: 'lost', startedAt: Date.now() - 3000 },
    ];
    const { host } = hostFor(desktop, { tasks });
    const { container, root } = await mountTile(dom, { host }, { width: 900 });
    const aside = container.querySelector('aside[aria-label="Session details"]');
    // bash:1, agent:1 and the Monitor are running; the unknown task is neither running nor finished.
    assert.ok(aside.textContent.includes('3 running'), aside.textContent);
    assert.equal(aside.textContent.includes('finished'), false);
    await act(async () => { root.unmount(); });
  });
  assert.deepEqual(Rail.railSectionTasks([{ id: 'a', kind: 'bash', status: 'unknown' }, { id: 'b', kind: 'agent', status: 'completed', description: 'x' }]).map((row) => [row.taskId, row.status, row.taskType]),
    [['b', 'completed', 'local_agent']]);
  const desktop = createDesktop({ 'preview-server-stop': () => true, 'schedule-stop': () => true, 'monitor-stop': () => true });
  const stopped = [];
  const hostTasks = [{ id: 'bash:1', kind: 'bash' }, { id: 'agent:1', kind: 'agent' }, { id: 'agent:2', kind: 'agent', turnId: 't' },
    { id: 'bash:3', kind: 'bash', stoppable: false }, { id: 'monitor:m1', kind: 'bash', monitorId: 'm1' }, { id: 'workflow:w', kind: 'workflow' }];
  const stops = Rail.railSectionStops({ call: desktop.call, sessionId: 's1', tasks: () => hostTasks, stopTask: async (task) => { stopped.push(task.id); } });
  await stops.stopTask('bash:1'); await stops.stopTask('agent:2'); await stops.stopTask('workflow:w');
  assert.deepEqual(stopped, ['bash:1', 'agent:2', 'workflow:w']);
  await stops.stopTask('monitor:m1');
  assert.deepEqual(desktop.last('monitor-stop'), { sessionId: 's1', id: 'm1' });
  await assert.rejects(stops.stopTask('agent:1'), /not stoppable/);
  await assert.rejects(stops.stopTask('bash:3'), /not stoppable/);
  await assert.rejects(stops.stopTask('nope'), /unknown task/);
  await stops.stopLoop({ id: 'job1' });
  assert.deepEqual(desktop.last('schedule-stop'), { sessionId: 's1', id: 'job1' });
  await stops.stopServer({ name: 'web' });
  assert.deepEqual(desktop.last('preview-server-stop'), { sessionId: 's1', name: 'web' });
});

test('wH stand-in: a "context" request raises the off-screen flat rail; a picker request is released (Iy) without raising', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const store = Rail.createRailScopeStore();
    let raised = 0;
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    await act(async () => { root.render(h(Layout.RailFlatContext.Provider, { value: true }, h(Rail.SessionRailRaise, { scopeStore: store, onRaise: () => { raised++; } }))); });
    const model = { menu: 'model' };
    await act(async () => { store.setState({ openComposerMenu: model }); });
    assert.equal(raised, 0); assert.equal(store.getState().openComposerMenu, null, 'released: no picker row in the flat rail');
    await act(async () => { store.setState({ openComposerMenu: { menu: 'context' } }); });
    assert.equal(raised, 1);
    await act(async () => { root.unmount(); });
  });
});

// ---------------------------------------------------------------------------------------------------------------
test('pL / dn / mL: the folder chip menu groups reveal | copy | terminal; no change-folder item; Copy ▸ Path / Branch name with a branch', () => {
  const intl = { formatMessage: (message) => message.defaultMessage };
  const seen = [];
  const actions = { revealFolder: (dir) => seen.push(['reveal', dir]), copyText: (text, message) => seen.push(['copy', text, message]), openTerminal: (dir) => seen.push(['terminal', dir]) };
  const saved = globalThis.window;
  globalThis.window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' } };
  try {
    const primary = Rail.railRepoMenuItems(intl, { cwd: '/w\u202e', localCwd: '/w', terminalCwd: '/w' }, actions);
    assert.deepEqual(primary.map((item) => [item.label, item.separatorBefore === true]), [['Show in Finder', false], ['Copy path', true], ['Open in terminal', true]]);
    primary.forEach((item) => item.onSelect());
    assert.deepEqual(seen, [['reveal', '/w'], ['copy', '/w', 'Path copied to clipboard.'], ['terminal', '/w']]);
    const extra = Rail.railRepoMenuItems(intl, { cwd: '/x', branch: 'dev', terminalCwd: '/x' }, actions);
    assert.deepEqual(extra.map((item) => item.label), ['Copy', 'Open in terminal']);
    assert.deepEqual(extra[0].items.map((item) => item.label), ['Path', 'Branch name']);
    extra[0].items[1].onSelect();
    assert.deepEqual(seen.at(-1), ['copy', 'dev', 'Branch name copied to clipboard.']);
    assert.deepEqual(Rail.railRepoMenuItems(intl, { cwd: '/x' }, {}), [], 'no host actions, no items');
    globalThis.window = { navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' } };
    assert.equal(Rail.revealLabel(intl), 'Show in Explorer');
    globalThis.window = { navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } };
    assert.equal(Rail.revealLabel(intl), 'Show in file manager');
  } finally { globalThis.window = saved; }
  assert.deepEqual(['local', 'cloud', 'ssh', 'bridge', 'wsl'].map(Rail.environmentIcon), ['Laptop', 'Cloud', 'CommandLine', 'Cursor', undefined]);
});

test('railDiscovery / railOutputMessages: fO\'s E from the git status, and yE\'s messages agree with mention-output-model', () => {
  assert.equal(Rail.railDiscovery(null), undefined);
  assert.deepEqual(Rail.railDiscovery({ isRepo: false }), []);
  assert.deepEqual(Rail.railDiscovery({ isRepo: true, cwd: '/w', branch: 'main' }), [{ isPrimary: true, cwd: '/w', repo: undefined, currentBranch: 'main', branch: 'main' }]);
  assert.deepEqual(Rail.railDiscovery({ isRepo: true, cwd: '/w', branch: 'abc123', detached: true })[0].currentBranch, undefined);
  const items = [
    { id: 'a', type: 'fileChange', status: 'completed', changes: [{ path: 'docs/a.md', kind: 'add' }, { path: 'src/x.js', kind: { type: 'update' } }, { path: 'gone.md', kind: 'delete' }] },
    { id: 'b', type: 'fileChange', status: 'failed', changes: [{ path: 'b.md', kind: 'add' }] },
    { id: 'c', type: 'fileChange', status: 'completed', changes: [{ path: '/Users/me/.claude/projects/p/memory/note.md', kind: 'add' }, { path: 'report.pdf', kind: 'add' }] },
  ];
  const messages = Rail.railOutputMessages(items, '/w');
  assert.deepEqual(messages, [
    { author: 'assistant', outputFiles: [{ path: '/w/docs/a.md', written: true }, { path: '/w/src/x.js', written: true }] },
    { author: 'assistant', outputFiles: [{ path: '/w/report.pdf', written: true }] },
  ]);
  const railPaths = Order.recentOutputPaths(messages, ['/w'], null, ['/w']);
  const hostPaths = Mention.sessionOutputFiles(items, { workingDir: '/w' }).map((entry) => entry.path);
  assert.deepEqual(railPaths, hostPaths);
  assert.deepEqual(Rail.railOutputMessages(items, 'relative'), []);
  // One memory-folder rule: the rail's copy is textually the mention model's.
  const regex = (text, name) => text.match(new RegExp(`${name} = (\\/.+\\/);`))[1];
  assert.equal(regex(read('src/source-session-rail.jsx'), 'MEMORY_PATH'), regex(read('src/mention-output-model.mjs'), 'const memoryPath'));
});

// R4i-rail RL2: the SR-7 fallback (keep the band for a pull request) is retired; the band follows the scope store.
test('Mte in rail mode: `mr = tp(Zn, e => e.railMode)` hides the PR band whenever the scope store is in rail mode', async () => {
  const store = Rail.createRailScopeStore();
  const answers = [];
  const Probe = ({ rail }) => { answers.push(Rail.useSessionRailHidesBand(rail)); return null; };
  await withPreviewDom(async (dom) => {
    const host = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(host);
    await act(async () => { root.render(React.createElement(Probe, { rail: { scopeStore: store } })); });
    assert.equal(answers.at(-1), false, 'not in rail mode');
    await act(async () => { store.setState({ railMode: true }); });
    assert.equal(answers.at(-1), true, 'jre wrote railMode: on');
    await act(async () => { store.setState({ railMode: false }); });
    assert.equal(answers.at(-1), false);
    await act(async () => { root.render(React.createElement(Probe, { rail: undefined })); });
    assert.equal(answers.at(-1), false, 'no rail: the band stays');
    await act(async () => { root.unmount(); });
  });
  assert.equal(Rail.sessionRailHidesBand, undefined, 'the pull request fallback is gone');
});

// ---------------------------------------------------------------------------------------------------------------
test('main.jsx: the rail is wired into the chat tile (state, toggle, body row, panel body, docked column, band, popout store)', () => {
  const main = read('src/main.jsx');
  const ast = parseAst(main, { lang: 'jsx' }, 'src/main.jsx');
  const text = (node) => main.slice(node.start, node.end);
  const findAll = (root, predicate, out = []) => {
    if (!root || typeof root !== 'object') return out;
    if (Array.isArray(root)) { for (const child of root) findAll(child, predicate, out); return out; }
    if (typeof root.type === 'string' && predicate(root)) out.push(root);
    for (const key of Object.keys(root)) if (key !== 'parent') findAll(root[key], predicate, out);
    return out;
  };
  const jsxName = (node) => (node?.type === 'JSXElement' ? node.openingElement.name.name : null);
  const imports = ast.body.filter((node) => node.type === 'ImportDeclaration' && node.source.value === './source-session-rail.jsx');
  assert.deepEqual(imports.map((node) => node.specifiers.map((s) => s.imported.name)),
    [['useSessionRail', 'useSessionRailHidesBand', 'SessionRailShownScope', 'SessionRailRow', 'SessionRailChatBody', 'SessionRailColumn']]);
  assert.equal(count(main, 'const sessionRail = useSessionRail({ enabled: mode === "code" && !PANE_WINDOW, sessionId: section === "new" ? current : null,\n'
    + '    sessionNotFound: !!current && historyUnavailable === current, besidePane: openPanes.size > 1 });'), 1);
  assert.equal(count(main, 'const sessionRailToggle = sessionRail.railToggle;'), 1);
  assert.equal(count(main, 'const sessionRailToggle = undefined;'), 0);
  // after SR-6's pair (tests/titlebar-rail-toggle.test.mjs reads it), jre's `mn` as railToggleRef (shared with jH's toggleRef).
  assert.equal(count(main, 'railToggle={sessionRailToggle} onRailToggleFoldChange={setTitlebarRailFolded} railToggleRef={sessionRail.railToggleRef}\n'), 1);
  // R4f integration: jre railMode: tn reaches wW/w_ (cc43287c9 `railMode:tn,railToggle:on?bn:void 0`), so the titlebar drops the origin icon and folder pill while the rail is up.
  assert.equal(count(main, 'railToggleRef={sessionRail.railToggleRef}\n              railMode={sessionRail.railMode}\n'), 1);
  // the body row: one SessionRailRow, the only element child of div.source-chat-body (class literal kept), holding the
  // conversation (with Ey) and, last, the docked column.
  const bodies = findAll(ast, (node) => jsxName(node) === 'div' && node.openingElement.attributes.some((a) => a.name?.name === 'className' && a.value?.value === 'source-chat-body'));
  assert.equal(bodies.length, 1);
  const elementsOf = (node) => node.children.filter((child) => child.type === 'JSXElement' || (child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression'));
  const [row] = elementsOf(bodies[0]);
  assert.equal(elementsOf(bodies[0]).length, 1);
  assert.equal(jsxName(row), 'SessionRailRow');
  assert.deepEqual(row.openingElement.attributes.map((a) => [a.name.name, text(a.value.expression)]), [['rail', 'sessionRail'], ['host', 'sessionRailHost']]);
  const inside = elementsOf(row);
  assert.match(text(inside[0]), /^<div className=\{`conversation \$\{!current && mode !== 'code' && section === 'new' \? homeScrollClass : ''\} \$\{sessionRail\.bandClassName\}`\}>/);
  assert.equal(jsxName(inside.at(-1)), 'SessionRailColumn');
  // the chat panel body wraps the keyed transcript
  const panels = findAll(ast, (node) => jsxName(node) === 'SessionRailChatBody');
  assert.equal(panels.length, 1);
  assert.deepEqual(elementsOf(panels[0]).map(jsxName), ['SourceTranscript']);
  // the host data, defined once before the App's render
  assert.equal(count(main, 'const sessionRailHost = {'), 1);
  for (const field of ['call, desktop: api,', 'cwd: workdir', 'items: state.items[current]', 'transcriptRef,', 'readOnly: !!session?.archived', 'isPanelActive: splitActive',
    'gitStatus: bandStatus', 'gitError: !!gitStatusError', 'diffOpenable: canViewChanges', 'hasChord: !openPanes.has("changes")', 'onClick: sendCommitTurn',
    'preview: { snapshot: previewSnapshot, available: previewAvailable }', 'openPane: openPaneTile', 'tasks, stopTask: stopBackgroundTask',
    'environmentId: current ? sessionMetadata[current]?.environmentId : undefined', 'savedEnvironments: savedEnvironments.environments'])
    assert.ok(main.slice(main.indexOf('const sessionRailHost = {'), main.indexOf('const sessionRailHost = {') + 3600).includes(field), field);
  // Mte (R4i-rail RL2): the band yields to the rail's Changes card in rail mode, read from the scope store
  assert.equal(count(main, 'const railHidesBand = useSessionRailHidesBand(sessionRail);'), 1);
  assert.equal(count(main, "beforeComposer={mode === 'code' && current && !railHidesBand && (bandStatus ?"), 1);
  assert.equal(count(main, 'sessionRailHidesBand'), 0);
  // c5638815a lt: the session popout's own shown store, around the split root
  assert.equal(count(main, '<SessionRailShownScope popout={SESSION_POPOUT}><SourceSplitRoot renderSide={(side, secondary) => <App side={side} initialSession={secondary?.sessionId ?? null} />} /></SessionRailShownScope>'), 1);
  // the pane root and body keep their literal classes (landing-texture-host.test.mjs reads them)
  assert.equal(count(main, '<div className="source-chat-tile-content" data-surface={mode}'), 1);
});
