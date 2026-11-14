// w2-cds-followup (plan §3 w2-cds-followup, E20/E30/E37): what the 3.6556.2 CDS graph (view-tabs) draws for the host,
// rendered with react-dom/server from the generated modules and checked against the official 3.6556.2 / 2.42304.0
// chunks (read as text, never run). Nothing opens a window.
//  - cds:C1  Menu scroll area: `relative … overflow-x-hidden` (shared-frame QC; 2.42304.0 Lx had neither).
//  - cds:C2  neutral Banner icon: `stacks:text-secondary` only (kO), so with fizzy-lake off it inherits text-primary.
//  - cds:C5  Button: the radius-add / pad-max classes only under fizzy-lake panels; the host button has neither.
//  - cds:C8  Toolbar root: data-cds="Toolbar" role="toolbar" (published root only, E32/E37).
//  - cds:C4/W6 Banner end margins: -mr → -me (LTR-equal); the one new value, "-me-[2px]", is the panels-only branch.
//  - cds:C20 Sessions table loading: aria-busy and nine shared-46 skeleton rows (moved from 2.42304.0 shared-19).
//  - cds:C21 Sessions page header: "sticky top-0 bg-page"; page-header-ground needs translucentHeader + panels.
// E37: cds:C11 (tab list draggable-none) and cds:C13 (Pulse 0.5px ring) were already in 2.42304.0; not asserted as new.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup as renderServerMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const v2 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const noop = () => {};
// The Sessions table's selection cell reads useSyncExternalStore without a server snapshot (c9c7785eb-D_0oAvkh
// `return i(n,r)`): client-only in the app. Rendered here as a client's first render reads it (getSnapshot).
const renderToStaticMarkup = (element) => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = (d) => {
    if (!d?.useSyncExternalStore) return d;
    if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (subscribe, get, server) => d.useSyncExternalStore(subscribe, get, server ?? get) });
    return wrapped.get(d);
  };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: (d) => { raw = d; } });
  try { return renderServerMarkup(element); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};
const classesOf = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1]);
const tokens = (cls) => cls.split(/\s+/).filter(Boolean);

let server, VT, Primitives, Sessions;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  VT = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  Primitives = await server.ssrLoadModule('/src/source-sessions-primitives.jsx');
  Sessions = await server.ssrLoadModule('/src/source-sessions-page.jsx');
});
after(() => server?.close());

test('view-tabs is the 3.6556.2 graph the checks below read', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  for (const name of ['cdsMenuScrollAreaClass', 'CdsBanner', 'CdsButton', 'CdsToolbar', 'CdsSelectableTable', 'CdsPage'])
    assert.ok(manifest.publicNames[name] && VT[name] !== undefined, name);
});

test('cds:C1: the menu scroll area adds relative and overflow-x-hidden', () => {
  const frame = official(v3, 'shared-frame-6jtSkIit.js'), old = official(v2, 'shared-frame-BfjMqbuN.js');
  assert.equal(count(frame, 'QC="relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y '), 1);
  assert.equal(count(old, 'Lx="min-h-0 overflow-y-auto scroll-fade-y '), 1);
  assert.ok(VT.cdsMenuScrollAreaClass.startsWith('relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y '));
  assert.ok(frame.includes(`QC=${JSON.stringify(VT.cdsMenuScrollAreaClass)}`), 'the generated class is the official literal');
});

test('cds:C2: the neutral Banner icon only carries stacks:text-secondary (fizzy-lake off → inherits text-primary)', () => {
  assert.equal(count(official(v3, 'shared-frame-6jtSkIit.js'), 'kO={neutral:"stacks:text-secondary"'), 1);
  assert.equal(count(official(v2, 'shared-frame-BfjMqbuN.js'), 'fT={neutral:"text-secondary"'), 1);
  const html = renderToStaticMarkup(h(VT.CdsBanner, { variant: 'neutral' }, 'Note'));
  const icon = classesOf(html, /<span class="([^"]*)"><span data-cds="Icon"/g);
  assert.equal(icon.length, 1, html);
  assert.ok(tokens(icon[0]).includes('stacks:text-secondary'), icon[0]);
  assert.ok(!tokens(icon[0]).includes('text-secondary'), icon[0]);
  // Non-neutral variants keep their colour classes (kO.warning etc. are not stacks-only).
  assert.match(renderToStaticMarkup(h(VT.CdsBanner, { variant: 'warning' }, 'Careful')), /data-cds="Icon"/);
});

test('cds:C5: the default Button has no radius-add / pad-max class (panels only)', () => {
  const frame = official(v3, 'shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('"rounded-[calc(var(--cds-radius)+var(--cds-button-radius-add,0px))]"'));
  const html = renderToStaticMarkup(h(VT.CdsButton, { variant: 'secondary' }, 'Run'));
  assert.match(html, /data-cds="Button"/);
  assert.doesNotMatch(html, /--cds-button-radius-add|--cds-button-pad-max/);
  assert.ok(tokens(classesOf(html, /<button[^>]* class="([^"]*)"/g)[0]).includes('rounded'), html);
});

test('cds:C8: the Toolbar root renders data-cds="Toolbar" with role="toolbar" and its label', () => {
  const frame = official(v3, 'shared-frame-6jtSkIit.js');
  for (const needle of ['H_=Object.assign(B_,{Title:V_})', 'H_ as ll', '"data-cds":"Toolbar"', 'role:"toolbar"']) assert.equal(count(frame, needle), 1, needle);
  const html = renderToStaticMarkup(h(VT.CdsToolbar, { label: 'Pane tools' }, h(VT.CdsToolbar.Title, null, 'Files')));
  assert.match(html, /<div[^>]*data-cds="Toolbar"[^>]*>/);
  const root = html.match(/<div[^>]*data-cds="Toolbar"[^>]*>/)[0];
  assert.match(root, /role="toolbar"/);
  assert.match(root, /aria-label="Pane tools"/);
  assert.match(html, />Files</);
});

test('cds:C4/W6: Banner end margins are logical; -me-[2px] alone is the fizzy-lake panels branch the host never takes', () => {
  const frame = official(v3, 'shared-frame-6jtSkIit.js'), old = official(v2, 'shared-frame-BfjMqbuN.js');
  // The calibration tables: -mr → -me / -ml → -ms with the same values (2.42304.0 aT/iT → 3.6556.2 yO/vO).
  assert.equal(count(old, 'aT={glyph:"-mr-[4px]",text:"-mr-[2px] compact:-mr-[2px] comfortable:-mr-[4px]"}'), 1);
  assert.equal(count(frame, 'yO={glyph:"-me-[4px]",text:"-me-[2px] compact:-me-[2px] comfortable:-me-[4px]"}'), 1);
  // The new value: C = er("panels"); the action span and the dismiss span take "-me-[2px]" (and the -6px end) only then.
  for (const needle of ['C=er("panels")', 'A!==void 0&&!u&&(C?"-me-[2px]":bO[A])', 'className:`${A===void 0?q:C?"-me-[2px]":yO[A]} flex h-[1lh] shrink-0 items-center`',
    'q=C?CO:SO', 'SO="-me-[calc(var(--cds-pad-md)-2px)]"', 'CO="-me-[calc(var(--cds-pad-md)-6px)]"']) assert.equal(count(frame, needle), 1, needle);
  // 2.42304.0's dismiss span (the element the W6 note asked about) used the same -2px end without calibration.
  assert.equal(count(old, 'className:`${S===void 0?"-me-[calc(var(--cds-pad-md)-2px)]":aT[S]} flex h-[1lh] shrink-0 items-center`'), 1);
  const dismiss = (props) => classesOf(renderToStaticMarkup(h(VT.CdsBanner, { variant: 'neutral', onDismiss: noop, ...props }, 'Note')),
    /<span[^>]*\sclass="([^"]*flex h-\[1lh\] shrink-0 items-center)"><button/g);
  assert.deepEqual(dismiss({}), ['-me-[calc(var(--cds-pad-md)-2px)] flex h-[1lh] shrink-0 items-center']);
  assert.deepEqual(dismiss({ composerCalibration: 'text' }), ['-me-[2px] compact:-me-[2px] comfortable:-me-[4px] flex h-[1lh] shrink-0 items-center']);
  assert.deepEqual(dismiss({ composerCalibration: true }), ['-me-[4px] flex h-[1lh] shrink-0 items-center']);
  // The action span with calibration takes bO (me-[calc(8px-…)]), not the panels -me-[2px].
  const withAction = renderToStaticMarkup(h(VT.CdsBanner, { variant: 'neutral', composerCalibration: true, action: h(VT.CdsButton, { variant: 'secondary' }, 'Retry') }, 'Note'));
  const actionSpan = classesOf(withAction, /<span[^>]*\sclass="(flex shrink-0 items-center gap-xs[^"]*)"/g);
  assert.equal(actionSpan.length, 1, withAction);
  assert.ok(actionSpan[0].includes('me-[calc(8px-var(--cds-pad-md))]'), actionSpan[0]);
  assert.ok(!tokens(actionSpan[0]).includes('-me-[2px]'), actionSpan[0]);
  for (const html of [withAction, renderToStaticMarkup(h(VT.CdsBanner, { variant: 'neutral', onDismiss: noop }, 'Note'))]) {
    assert.doesNotMatch(html, /(?:^|[\s"])-?m[lr]-\[/, 'no physical left/right margins left');
    assert.doesNotMatch(html, /-me-\[calc\(var\(--cds-pad-md\)-6px\)\]/, 'the panels end (CO) stays off');
  }
});

test('cds:C20: the Sessions table loads with aria-busy and nine shared-46 skeleton rows', () => {
  const row = 'box-content flex min-h-9 items-center justify-between gap-md border-b border-alpha-1 py-sm last:border-b-0';
  assert.equal(count(official(v3, 'shared-46-BIbZBGFq.js'), `className:"${row}"`), 1);
  assert.equal(count(official(v2, 'shared-19-CkPOiIKm.js'), row), 1, '2.42304.0 drew the same row from shared-19');
  const table = official(v3, 'c9c7785eb-D_0oAvkh.js');
  for (const needle of ['isLoading:h,skeletonRowCount:_', 'D=_===void 0?9:_', 'A=h&&n.length===0', 'A&&r(g,{count:D})', '"aria-busy":I']) assert.equal(count(table, needle), 1, needle);
  // w10-ccres-hf-host: the page view is 3.6556.2 Hf itself (sessions-page-view.mjs re-exports the sliced Hf). The host's
  // loading is Hf's code list loading; Hf hands the table `isLoading: Zi` (Zi = ot || zn.held || …, slot 460).
  assert.match(fs.readFileSync(path.join(app, 'src/generated/code-current/sessions-page-view.mjs'), 'utf8'), /export \{ SessionsPageHf as SessionsPageView \} from "\.\.\/sessions-page\/sessions-page-hf\.mjs";/);
  const hf = fs.readFileSync(path.join(app, 'src/generated/sessions-page/sessions-page-hf.mjs'), 'utf8');
  assert.match(hf, /isLoading: Zi,/);
  assert.equal(count(official(v3, 'cbd6c85c8-D1xuycDy.js'), 'emptyState:so,isLoading:Zi,'), 1);
  const pending = renderToStaticMarkup(h(Sessions.SourceSessionsPage, { loading: true }));
  assert.match(pending, /aria-busy="true"/);
  assert.equal(count(pending, `class="${row}"`), 9);
  const loaded = renderToStaticMarkup(h(Sessions.SourceSessionsPage, { sessions: [{ id: 'live', name: 'Live task', updatedAtMs: Date.now() }] }));
  assert.doesNotMatch(loaded, /aria-busy="true"/);
  assert.equal(count(loaded, `class="${row}"`), 0);
});

test('cds:C21: the Sessions page header stays "sticky top-0 bg-page"; page-header-ground needs translucentHeader + panels', () => {
  const page = official(v3, 'c193cfc9b-C3NZYkrZ.js');
  for (const needle of ['E=d("panels")', 'D=me&&E', 'className:D?"sticky top-0":"sticky top-0 bg-page"', 'D?n("div",{"aria-hidden":!0,"data-cds-part":"page-header-ground"}):null'])
    assert.equal(count(page, needle), 1, needle);
  assert.equal(count(official(v2, 'c193cfc9b-DSvIG0kE.js'), 'page-header-ground'), 0);
  const html = renderToStaticMarkup(h(Primitives.SessionsPageShell, { header: { title: 'Sessions' } }, h('p', null, 'rows')));
  assert.match(html, /<div class="sticky top-0 bg-page"/);
  assert.doesNotMatch(html, /page-header-ground/);
  const translucent = renderToStaticMarkup(h(Primitives.SessionsPageShell, { header: { title: 'Sessions' }, translucentHeader: true }, h('p', null, 'rows')));
  assert.match(translucent, /<div class="sticky top-0 bg-page"/, 'translucentHeader alone does not drop the ground (panels off, E12)');
  assert.doesNotMatch(translucent, /page-header-ground/);
});
