// R4i-sidebar SI3: the Code list filter's Show › Routines item (ledger sidebar-17), the environment-grouped headings
// without a target icon for local folders (sidebar-18), and the two R4g-sidebar SB3 review lows (pending folds over an
// unrelated snapshot; a right-click inside an open heading menu reaching the blank-area menu), checked against
// 2.42304.0. Nothing opens a window: source locks, the pure model, SSR markup of the real SourceSidebar, and the pending
// fold overlay driven directly.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as Model from '../electron/generated/sidebar-sections-model.mjs';
import * as Filter from '../src/sidebar-filter-current-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
const count = (source, needle) => source.split(needle).length - 1;
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M.sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  M.sections = await server.ssrLoadModule('/src/source-sidebar-sections.jsx');
});
after(async () => {
  M.sections?.clearPendingSectionFolds?.();
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

test('sidebar-17 source: oU draws Show › Routines from se = GH(routines shown) || open && latch; Xe toggles the routines section', async () => {
  const shared21 = await read(path.join(reference, 'shared-21-IP-SVetq.js'));
  const shared16 = await read(path.join(reference, 'shared-16-B0xHzPjj.js'));
  const shared52 = await read(path.join(reference, 'shared-52-DGviI8xb.js'));
  for (const needle of [
    'function oU({mode:e,layout:t,handle:n,open:r,onOpenChange:i,onRegroup:a})',
    '[ne,re]=dS(),ie=GH(ne),[ae,oe]=u(!1);r&&ie&&!ae?oe(!0):!r&&ae&&oe(!1);let se=ie||r&&ae,ce=Zm()',
    'Xe=A(()=>{let e=!ne;re(e),We("show_routines",String(e))},[ne,re,We])',
    '(se||de)&&_(X.Separator,{}),se&&_(X.Item,{checked:ne,keepOpen:!0,onClick:Xe,children:q.formatMessage(ce.navLabel)})',
    'function GH(e){let{codeEnabled:t,ccdGateSettled:n}=Bl(),{activeOrganization:r}=Ke(),i=mc(r?.uuid);return(t||!n)&&(i||e)}',
    // wG: the org "has Code routines" while one is enabled (local scheduled task or remote trigger).
    'l=n&&(i?.data??[]).some(e=>e.enabled&&!rr(e))||s.some(e=>e.enabled)',
    // the routines section only renders while shown (gY over fx()).
    'function gY(e){let{collapsed:t,shown:n}=fx();return n?_(WY,{...e,collapsed:t,onToggleCollapsed:hY}):null}',
  ]) assert.equal(count(shared21, needle), 1, needle);
  assert.equal(count(shared16, 'function Xf(e){W.getState().setSectionView(cn,{shown:e})}function Zf(){return[Yf().shown,Xf]}'), 1);
  assert.equal(count(shared52, 'function Uh(e){return G(t=>e!==void 0&&t.navHasCodeRoutinesByOrg[e]===!0)}'), 1);
  // The host's copy of oU keeps the branch verbatim; the host does not offer it (no Code routines section yet).
  const view = await read(path.join(app, 'src/generated/code-current/sidebar-filter-view.mjs'));
  assert.equal(count(view, 'routinesAvailable: se = false'), 1);
  assert.equal(count(view, '(se || de) && _(X.Separator, {})'), 1);
  const host = await read(path.join(app, 'src/source-sidebar-filter-current.jsx'));
  assert.equal(count(host, 'routinesAvailable={CODE_ROUTINES_SECTION_HOST}'), 1);
  assert.equal(Filter.CODE_ROUTINES_SECTION_HOST, false);
});

test('sidebar-17 model: GH, the open latch and se, as oU computes them', () => {
  const { routinesItemOffered: offered, nextRoutinesLatch: latch, routinesItemShown: shown } = Filter;
  assert.equal(offered({ hasCodeRoutines: true }), true);
  assert.equal(offered({ shown: true }), true, 'a shown section keeps its item');
  assert.equal(offered({}), false);
  assert.equal(offered({ codeEnabled: false, hasCodeRoutines: true }), false, 'Code off once the gate settled');
  assert.equal(offered({ codeEnabled: false, gateSettled: false, hasCodeRoutines: true }), true, 'not settled yet');
  // Open with the item offered: latched; unticking (no routines, section hidden) keeps it until the menu closes.
  let latched = latch(true, true, false);
  assert.equal(latched, true);
  assert.equal(shown({ open: true, offered: false, latched }), true);
  latched = latch(false, false, latched);
  assert.equal(latched, false);
  assert.equal(shown({ open: false, offered: false, latched }), false);
  assert.equal(latch(true, false, false), false, 'never offered while open: no latch');
});

test('sidebar-18 source: sT draws the target icon only when not local in the session list (oe = !r || re !== "local")', async () => {
  const shared22 = await read(path.join(reference, 'shared-22-HztmyUTM.js'));
  for (const needle of [
    're=t?N?N.target.kind:e.unsaved?pT[e.unsaved.kind]:ne==="other"?void 0:mT(M??hT(A)):void 0',
    'oe=!r||re!=="local"',
    'Y=B!==void 0&&oe?p("span",{role:J?"img":void 0',
    'leading:r?void 0:X,trailingMark:r&&!se?X:void 0,nameMark:se?X:void 0',
  ]) assert.equal(count(shared22, needle), 1, needle);
  // mT: a folder bucket of local sessions is "local".
  assert.equal(count(shared22, 'return t.has("local")?"local":t.has("shell")?"ssh":t.has("bridge")?"bridge":t.size>0?"cloud":"local"'), 1);
});

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });

test('sidebar-18 SSR: environment-grouped Sessions headings (local folders) carry no target icon or colour', () => {
  const sections = Model.setSectionView([...Model.defaultSections], 'sessions', { groupBy: 'environment' });
  const html = renderToStaticMarkup(React.createElement(M.sidebar.SourceSidebar, {
    knownFolders: ['/fixture/work', '/fixture/other'],
    sessions: [thread('a'), thread('b', { cwd: '/fixture/other' })],
    sidebarSections: sections,
  }));
  const body = html.slice(html.indexOf('<div class="df-session-list'), html.indexOf('</nav>'));
  // Each Sessions folder bucket: its uD heading (data-sidebar-group-label) up to the rows container.
  const headings = [...body.matchAll(/data-sidebar-group-label=""[^]*?(?=data-group-rows|<div class="hidden")/g)].map((m) => m[0]);
  assert.equal(headings.length, 2, 'one heading per folder bucket (work, other)');
  assert.match(headings.join('\n'), />work</);
  assert.match(headings.join('\n'), />other</);
  for (const heading of headings) {
    assert.doesNotMatch(heading, /role="img"/, 'no target icon (sT Y)');
    assert.doesNotMatch(heading, /flex size-6 shrink-0 items-center justify-center/, 'no trailingMark wrapper (sessionList)');
    assert.doesNotMatch(heading, /style="[^"]*color:/, 'no environment colour');
  }
});

// The overlay as SourceSidebar reads it (useSyncExternalStore's snapshot; SSR does not run the prune effect, so the
// test prunes by hand, as usePendingSectionFolds' layout effect does after each snapshot).
function shownCollapsed(sections, id) {
  const Probe = () => String(M.sections.usePendingSectionFolds(sections).find((section) => section.id === id)?.collapsed);
  return renderToStaticMarkup(React.createElement(Probe));
}

test('SB3 low 1: a pending fold outlives unrelated snapshots until main answers; after the answer, main\'s snapshot decides', () => {
  const S = M.sections;
  S.clearPendingSectionFolds();
  const base = Model.setSectionView([...Model.defaultSections, Model.createSection('manual', 2)].map((section) => section.kind === 'manual' ? { ...section, id: 'g1', name: 'A', members: [] } : section), 'g1', { collapsed: false });
  const copy = (list, patch = {}) => list.map((section) => ({ ...section, ...(patch[section.id] ?? {}) }));
  S.prunePendingSectionFolds(base);
  const fold = S.beginPendingSectionFold('g1', true);
  assert.equal(shownCollapsed(base, 'g1'), 'true', 'the fold shows before main answers');
  // Unrelated snapshots (new lists: session metadata changed) before main answers: the fold stays.
  for (let i = 0; i < 3; i++) {
    const unrelated = copy(base);
    S.prunePendingSectionFolds(unrelated);
    assert.equal(shownCollapsed(unrelated, 'g1'), 'true');
  }
  // main.jsx sectionAction runs applySidebarState(answer) before the send promise settles; main's snapshots are
  // cumulative and applySidebarState drops lower revisions, so the next list rendered after settle() is main's answer
  // (or newer), carrying the fold: it is dropped as shown, and the list itself shows the fold.
  fold.settle();
  const answered = copy(base, { g1: { collapsed: true } });
  S.prunePendingSectionFolds(answered);
  assert.equal(shownCollapsed(answered, 'g1'), 'true');
  // A later snapshot where main (another window) unfolded it again: main decides, nothing pending overrides it.
  const reopened = copy(base, { g1: { collapsed: false } });
  S.prunePendingSectionFolds(reopened);
  assert.equal(shownCollapsed(reopened, 'g1'), 'false');
  // A refused fold goes at once.
  const refused = S.beginPendingSectionFold('g1', true);
  assert.equal(shownCollapsed(reopened, 'g1'), 'true');
  refused.cancel();
  assert.equal(shownCollapsed(reopened, 'g1'), 'false');
  S.clearPendingSectionFolds();
});

test('SB3 low 2 source: _B\'s trigger and Base UI\'s ContextMenuTrigger have no portal guard, as the host now renders them', async () => {
  const shared21 = await read(path.join(reference, 'shared-21-IP-SVetq.js'));
  // _B: the list is the blank-area ContextMenu trigger; its only capture handler records the event (x), no containment check.
  assert.equal(count(shared21, 'f(uf.Root,{onOpenChange:T,children:[_(uf.Trigger,{ref:y,render:i,onContextMenuCapture:x})'), 1);
  assert.equal(count(shared21, 'x=A(e=>{e.target.closest("[data-jump-hint-row]")||(m.current=e.nativeEvent)},[l])'), 1);
  // Base UI (view-tabs vendor-frame, the host's copy of the original): onContextMenu w only checks disabled, then ti stops it.
  const vendor = await read(path.join(app, 'src/generated/view-tabs/vendor-frame-DfPJ1QmD.js'));
  assert.equal(count(vendor, 'function w(e){if(g)return;d.current=!0,ti(e),C(e.clientX,e.clientY,e.nativeEvent)'), 1);
  assert.equal(count(vendor, 'function ti(e){e.preventDefault(),e.stopPropagation()}'), 1);
  // The host adapter is that trigger itself (no host Popup containment check is put back).
  const adapters = await read(path.join(app, 'src/source-sidebar-sections-adapters.jsx'));
  assert.equal(count(adapters, 'export const SidebarContextMenu = CdsContextMenu;'), 1);
});
