// titlebar-frame 4.16336.0 (scripts/extract-titlebar-frame-v4.mjs, src/titlebar-frame-host.jsx): the Code titlebar frame
// shared-20 o_ / s_ (TitlebarFrame) over the cds-core CdsToolbar and the shared-120 Ke panels scope, linked to frame-sidebar
// for the shared-31 slot store Kl (D1), with frame-sidebar's own useIsDesktopApp boundary re-exported (the frame store
// shared-92 Y is linked from cds-core since SB-0; was: "frameStore / useIsDesktopApp boundaries re-exported").
// SSR through Vite's module graph; no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { boundaries, extractTitlebarFrame, linkedAreas, pinsPath, adapterSource } from '../scripts/extract-titlebar-frame-v4.mjs';
import { boundaries as frameSidebarBoundaries } from '../scripts/extract-frame-sidebar-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const manifest = JSON.parse(read('src/generated/titlebar-frame/manifest.json'));
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const v4 = (name) => fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1', name), 'utf8');
const imports = manifest.modules.flatMap((module) => (module.imports ?? []).map((entry) => ({ module: module.target, ...entry })));
const bound = manifest.modules.flatMap((module) => module.bindings.map((binding) => `${module.source}#${binding.name ?? binding}`));

let server, Host, FrameAdapter, SidebarAdapter, Cds;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/titlebar-frame-host.jsx');
  FrameAdapter = await server.ssrLoadModule('/src/titlebar-frame-adapter.mjs');
  SidebarAdapter = await server.ssrLoadModule('/src/frame-sidebar-adapter.mjs');
  Cds = await server.ssrLoadModule('/src/cds-core.mjs');
});
after(async () => { await server?.close(); });

test('generator: --check reproduces the pinned modules from the pinned 4.16336.0 chunks', async () => {
  await extractTitlebarFrame({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph?.area ?? manifest.sharedGraph, 'cds-core');
  assert.deepEqual(Object.keys(pins.roots).sort(), ['TitlebarFrame', 'TitlebarLiftedHiddenContext', 'titleBleedPanels', 'titleGroupPanelsClass', 'titlebarLeadClipClass', 'titlebarLeadNoOriginPanelsClass', 'titlebarLeadRowClass', 'titlebarTextVars', 'useTitlebarPanelsScope']);
  assert.equal(pins.roots.titlebarLeadNoOriginPanelsClass.export, 'Zn');
  assert.equal(pins.roots.titleBleedPanels.export, 'Rf');
  assert.equal(pins.roots.titleGroupPanelsClass.export, 'xf');
  assert.deepEqual(Object.keys(pins.also).sort(), ['TitlebarDensityRoot', 'TitlebarRow']);
  assert.equal(pins.roots.TitlebarFrame.export, 'Uc');
  assert.equal(pins.roots.useTitlebarPanelsScope.export, '_n');
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-titlebar-frame.mjs')));
  // The official call: cc43287c9 RX hands the frame to shared-20's export Uc (xp) with the "Session tools" label.
  const cc = v4('cc43287c9-dzfX-J5i.js');
  assert.ok(cc.includes('Uc as xp'));
  assert.ok(cc.includes('W90cZ2JcPO'));
});

test('D1: cds-core holds Ke / Tu (wave 6), frame-sidebar holds Kl; Rg is held only here; no second frame store', () => {
  assert.deepEqual(linkedAreas, ['frame-sidebar', 'titlebar']);
  const shared = imports.filter((entry) => entry.kind === 'shared-graph').map((entry) => `${entry.name} <- ${entry.via}`);
  assert.ok(shared.includes('Ke <- shared-120-DCdTP1_5.js#Ke'));
  assert.ok(shared.includes('Tu <- shared-31-C9BqSSuD.js#Tu'));
  assert.ok(shared.some((line) => line.startsWith('CdsToolbar <- ')));
  assert.ok(shared.some((line) => line.startsWith('CdsRoot <- ')));
  const linked = imports.filter((entry) => entry.kind === 'linked').map((entry) => `${entry.module} ${entry.name} ${entry.from}`);
  assert.ok(linked.includes('titlebar-lane.mjs Kl ../frame-sidebar/shared-31.mjs'));
  for (const key of ['shared-120-DCdTP1_5.js#Ke', 'shared-31-C9BqSSuD.js#Tu', 'shared-31-C9BqSSuD.js#Kl', 'shared-31-C9BqSSuD.js#Gl',
    'shared-0-CnnWnVrT.js#jH', 'shared-0-CnnWnVrT.js#PH', 'shared-0-CnnWnVrT.js#FH', 'shared-92-BOgyxePb.js#Y'])
    assert.ok(!bound.includes(key), `${key} is not sliced into generated/titlebar-frame`);
  assert.ok(bound.includes('shared-20-DUEo90UF.js#Rg'));
  assert.ok(bound.includes('shared-20-DUEo90UF.js#s_'));
});

// SB-0 (round4 wave8b sidebar): shared-92 Y is no longer a host boundary of either graph; both link cds-core's one Y
// (store_shared92_Y). Was: `assert.equal(FrameAdapter.frameStore, SidebarAdapter.frameStore)` and
// `assert.ok(adapters.includes('frameStore <- shared-92-BOgyxePb.js:qg'))`.
test('boundaries are frame-sidebar\'s own, re-exported: one desktop answer per window; the frame store is cds-core\'s Y', () => {
  for (const b of boundaries) {
    const theirs = frameSidebarBoundaries.find((x) => x.key === b.key);
    assert.ok(theirs, b.key);
    assert.equal(theirs.name, b.name);
    assert.equal(theirs.kind, b.kind);
  }
  assert.deepEqual(boundaries.map((b) => b.key), ['shared-0-CnnWnVrT.js#FH']);
  assert.ok(!frameSidebarBoundaries.some((b) => b.key === 'shared-92-BOgyxePb.js#Y' || b.name === 'frameStore'));
  assert.equal(read('src/titlebar-frame-adapter.mjs'), adapterSource());
  assert.equal(FrameAdapter.frameStore, undefined);
  assert.equal(SidebarAdapter.frameStore, undefined);
  assert.equal(FrameAdapter.useIsDesktopApp, SidebarAdapter.useIsDesktopApp);
  assert.equal(FrameAdapter.loadHostReact().createElement, React.createElement);
  const adapters = imports.filter((entry) => entry.kind === 'adapter').map((entry) => `${entry.name} <- ${entry.via}`).sort();
  assert.ok(!adapters.some((line) => line.startsWith('frameStore <- ')));
  assert.ok(adapters.some((line) => line.startsWith('useIsDesktopApp <- shared-0-CnnWnVrT.js:')));
  const shared = imports.filter((entry) => entry.kind === 'shared-graph').map((entry) => `${entry.module} ${entry.name} ${entry.from} <- ${entry.via}`);
  assert.ok(shared.includes('titlebar-lane.mjs Y ../cds-core/shared-92.mjs <- shared-92-BOgyxePb.js:qg'));
  assert.ok(!Object.hasOwn(pins.boundaries, 'shared-92-BOgyxePb.js#Y') && !Object.hasOwn(pins.sources, 'shared-92-BOgyxePb.js'));
});

const frame = (props, wrap = (node) => node) => renderToStaticMarkup(wrap(React.createElement(Host.TitlebarFrame, {
  lifted: false, label: 'Session tools', paneAtEnd: false, seeThrough: false, grip: null,
  lead: React.createElement('div', { className: Host.TITLEBAR_LEAD_CLASS }, 'lead'),
  cluster: React.createElement('button', { type: 'button' }, 'toggle'),
  'data-top-left': true, ...Host.perfRegion('header'), style: { ...Host.titlebarTextVars }, ...props,
})));
const toolbarClass = (html) => /<div[^>]*data-cds="Toolbar"[^>]*>/.exec(html)?.[0] ?? '';

test('start screen: comfortable CdsRoot + panels scope, CdsToolbar divider false (gv.never), static title in the ps-md row', () => {
  const title = React.createElement('h1', { 'data-pane-title': '' }, 'New session');
  const html = frame({ startScreen: true, staticTitle: title, lead: null });
  assert.match(html, /^<div class="cds-root [^"]*\bcontents"[^>]*data-density="comfortable"/);
  assert.match(html, /data-perf-region="header"/);
  assert.match(html, /data-top-left="true"/);
  assert.match(html, /--titlebar-text-primary:var\(--cds-text-primary\)/);
  const bar = toolbarClass(html);
  assert.match(bar, /role="toolbar"/);
  assert.match(bar, /aria-label="Session tools"/);
  assert.match(bar, /pb-\[var\(--cds-toolbar-pad-block,0\.25rem\)\]/);
  assert.doesNotMatch(bar, /border-b-\[length:var\(--cds-toolbar-line,0px\)\]/);
  // t_ (staticTitle row): Qg + ps-[calc(0.5rem*var(--cds-rem-scale,1))]; the static title sits in s_'s ps-md row.
  assert.match(html, /class="epitaxy-titlebar relative flex items-center [^"]*ps-\[calc\(0\.5rem\*var\(--cds-rem-scale,1\)\)\]/);
  assert.match(html, /<div class="flex min-w-0 items-center ps-md"><h1 data-pane-title="">New session<\/h1><\/div>/);
  // The drag backdrop XS (`draggable absolute inset-0 -z-[1]`) replaces the host window-drag header.
  assert.match(html, /class="draggable absolute inset-0 -z-\[1\][^"]*" aria-hidden="true"/);
  assert.doesNotMatch(html, /st-toolbar|window-drag/);
});

test('session: divider undefined → CdsToolbar look (border-b) without fizzy-lake parts, inside (::after) with them', () => {
  const plain = toolbarClass(frame({ startScreen: false }));
  assert.match(plain, /border-b-\[length:var\(--cds-toolbar-line,0px\)\]/);
  assert.doesNotMatch(plain, /after:border-b-/);
  const parts = (node) => React.createElement(Cds.CdsRoot, { className: 'contents', experimental: { fizzyLake: { parts: ['color', 'panels', 'type'] } } }, node);
  const inside = toolbarClass(frame({ startScreen: false }, parts));
  assert.match(inside, /after:border-b-\[length:var\(--cds-toolbar-line,0px\)\]/);
  assert.match(inside, /after:border-\[color:var\(--cds-border-line,var\(--cds-border\)\)\]/);
  // The lead wrapper is RX's: group/lead relative z-[1] ${fn} ${En} draggable-none.
  assert.equal(Host.TITLEBAR_LEAD_CLASS, 'group/lead relative z-[1] flex min-w-0 items-center [[data-tile-overflow-anchor]_&]:[@container_tile-slot_(max-width:320px)]:[clip-path:inset(-32px_-12px)] draggable-none');
  assert.ok(frame({ startScreen: false }).includes(`<div class="${Host.TITLEBAR_LEAD_CLASS.replaceAll('&', '&amp;')}">lead</div>`));
});

test('titlebar relink T1: under the window root\'s fizzy-lake parts the session Toolbar is gv.inside whole, the start screen stays gv.never', () => {
  // Official CdsToolbar (shared-frame Cv): S = or("panels"); C = divider === void 0 ? (S ? "inside" : "look") : divider ? "always" : "never".
  const sf = v4('shared-frame-CJdE5Ria.js');
  assert.ok(sf.includes('S=or("panels"),C=a===void 0?S?"inside":"look":a?"always":"never"'));
  const gvInside = /inside:"([^"]+)"\}/.exec(sf.slice(sf.indexOf(',gv={look:')))[1];
  const lookPb = 'pb-[calc(var(--cds-toolbar-pad-block,0.25rem)_-_var(--cds-toolbar-line,0px))]';
  assert.ok(sf.includes(`gv={look:\`\${mv} \${hv} border-b-[length:var(--cds-toolbar-line,0px)] ${lookPb}\``));
  const never = 'pb-[var(--cds-toolbar-pad-block,0.25rem)]';
  assert.ok(sf.includes(`never:"${never}"`));
  // Fixture parts (the value index.html / ion-dist index.html carry); main.jsx passes readFizzyLakeParts() (shared-92 ib).
  const root = (node) => React.createElement(Cds.CdsRoot, { className: 'contents', pageBackground: 'surface-1', platform: 'desktop', experimental: { fizzyLake: { parts: ['color', 'panels', 'type'] } } }, node);
  const session = toolbarClass(frame({ startScreen: false }, root));
  const cls = /class="([^"]*)"/.exec(session)[1].replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.ok(cls.includes(gvInside), cls);
  assert.ok(!cls.includes(lookPb), cls);
  assert.doesNotMatch(cls, /(^|\s)border-b-\[length:var\(--cds-toolbar-line,0px\)\]/);
  assert.ok(!cls.split(' ').includes(never), cls);
  const start = /class="([^"]*)"/.exec(toolbarClass(frame({ startScreen: true, staticTitle: React.createElement('h1', null, 'New session'), lead: null }, root)))[1].replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.ok(start.split(' ').includes(never), start);
  assert.ok(!start.includes('after:border-b-') && !start.includes(lookPb), start);
  // Without the root's parts (regression pin of the pre-T1 branch): look.
  const plain = /class="([^"]*)"/.exec(toolbarClass(frame({ startScreen: false })))[1].replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.ok(plain.includes(lookPb) && !plain.includes(gvInside), plain);
});

test('panels scope: qe is true only inside the frame (OS provides Ke = !lifted); outside it is false', () => {
  let inside, outside;
  const Probe = ({ into }) => { into(Host.useTitlebarPanelsScope()); return null; };
  renderToStaticMarkup(React.createElement(Probe, { into: (value) => { outside = value; } }));
  frame({ startScreen: false, cluster: React.createElement(Probe, { into: (value) => { inside = value; } }) });
  assert.equal(outside, false);
  assert.equal(inside, true);
  // lifted is never set by the host: no strip-line claim (shared-31 ru) and no separate ws row class.
  const html = frame({ startScreen: false });
  assert.doesNotMatch(html, /data-strip-line/);
});

test('SourceTitlebar: the Code New section is RX over the frame; other surfaces and the session popout keep the host header', async () => {
  const T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  const render = (props) => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', onRename() {}, terminalAvailable: true, ...props }));
  const home = render({ session: null });
  assert.match(home, /^<div class="cds-root [^"]*\bcontents" data-density="comfortable"/);
  assert.match(toolbarClass(home), /aria-label="Session tools"/);
  assert.match(toolbarClass(home), /pb-\[var\(--cds-toolbar-pad-block,0\.25rem\)\]/, 'start screen: divider false');
  assert.match(home, /<div class="flex min-w-0 items-center ps-md"><h1 data-pane-title="" class="draggable truncate ps-2\.5 text-body font-medium font-control text-muted-as-secondary">New session<\/h1><\/div>/);
  assert.doesNotMatch(home, /st-toolbar|st-trailing|window-drag/);
  const session = render({ session: { id: 'a', name: 'A title', cwd: '/tmp/work' } });
  assert.match(toolbarClass(session), /border-b-\[length:var\(--cds-toolbar-line,0px\)\]/, 'session: divider undefined');
  assert.ok(session.includes(`<div class="${Host.TITLEBAR_LEAD_CLASS.replaceAll('&', '&amp;')}"`), 'RX gt lead box');
  // The cluster is the frame's box; the toggle group, then View options, in RX Pt's order.
  const cluster = session.slice(session.indexOf('<div class="relative z-[1] epitaxy-titlebar-end '));
  assert.ok(cluster.indexOf('<div class="flex items-center gap-1 empty:hidden"') >= 0);
  assert.ok(cluster.indexOf('aria-label="Terminal"') < cluster.indexOf('aria-label="View options"'));
  for (const other of [render({ surface: 'cowork', session: { id: 'a', name: 'A title' } }), render({ session: { id: 'a', name: 'A title' }, popoutWindow: { alwaysOnTop: false, onDock() {}, onTogglePin() {} } })]) {
    assert.match(other, /^<header class="workspace-toolbar st-toolbar window-drag"/);
    assert.doesNotMatch(other, /data-cds="Toolbar"/);
  }
  // The split view's unfocused-pane step-back also reaches the frame's cluster (the box before s_'s end clearance IS).
  assert.match(read('src/source-split-view.css'), /\.split-pane:not\(\[data-focused\]\) \[data-perf-region="header"\] \[data-cds="Toolbar"\] :has\(\+ \[data-lined-row-end-clearance\]\) \{\n\s+opacity: 0;/);
});

test('session lead inside the frame: the panels no-origin box (Qb bi), the title bleed (FX Pd) and group (FX Df) of 4.16336.0', async () => {
  // Official evidence: c73f45bc3 Qb reads Ei() (shared-120 _n = qe) for the no-origin box; cc43287c9 FX reads jb() (the same qe)
  // for the bleed and the group; c9543da06 pp falls back to fp without a bleed; shared-38 / shared-18 hold the strings.
  const qb = v4('c73f45bc3-C7dtUSq8.js'), rx = v4('cc43287c9-dzfX-J5i.js'), pp = v4('c9543da06-DHwxxZai.js'), s18 = v4('shared-18-Cfqwgjc5.js'), s38 = v4('shared-38-DyF0_Fim.js');
  assert.ok(qb.includes('t===null?r("span",{className:l?bi:Ci})'));
  assert.match(qb, /\b_n as Ei\b/);
  assert.ok(rx.includes('bleed:w?Pd:void 0'));
  assert.ok(rx.includes('A=w?Df:jf'));
  assert.match(rx, /\b_n as jb\b/);
  assert.ok(pp.includes('let c=a===void 0?fp:a'));
  assert.ok(pp.includes('var fp={pad:"px-xs",style:{"--cds-outset-x":"var(--cds-pad-xs)"}}'));
  assert.ok(s18.includes('Fw="px-md",Iw={pad:Fw,style:{"--cds-outset-x":"var(--cds-pad-md)"}}'));
  assert.ok(s38.includes('gn="ps-md shrink-0"'));
  assert.equal(Host.titlebarLeadNoOriginPanelsClass, 'ps-md shrink-0');
  assert.deepEqual(Host.titleBleedPanels, { pad: 'px-md', style: { '--cds-outset-x': 'var(--cds-pad-md)' } });
  assert.equal(Host.titleGroupPanelsClass, 'cc-lined-title-group flex items-center gap-[calc(var(--cds-pad-md)_-_--spacing(1.5))] min-w-[calc(32px+var(--cds-h-control,24px)+var(--cds-pad-md)_-_--spacing(1.5))] group-data-[pills-compact]/lead:min-w-[calc(8px+var(--cds-h-control,24px)+var(--cds-pad-md)_-_--spacing(1.5))]');
  const T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  const render = (props) => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', onRename() {}, railMode: true, session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, ...props }));
  const esc = (value) => value.replaceAll('&', '&amp;');
  const framed = render({});
  const leadBox = framed.slice(framed.indexOf(`<div class="${esc(Host.TITLEBAR_LEAD_CLASS)}"`));
  assert.ok(leadBox.startsWith(`<div class="${esc(Host.TITLEBAR_LEAD_CLASS)}"><span class="ps-md shrink-0"></span>`), leadBox.slice(0, 400));
  assert.ok(framed.includes(`<div class="${Host.titleGroupPanelsClass}"><span class="flex items-center min-w-[32px] group-data-[pills-compact]/lead:min-w-[8px]">`), framed);
  assert.match(framed, /aria-label="A title, rename session" class="[^"]* mx-outset h-control px-md rounded [^"]*" style="--cds-outset-x:var\(--cds-pad-md\)">A title<\/button>/);
  // Outside the frame (the session popout keeps the host header) qe is false: Ci, fp and the 3.6556.2 group stay.
  const popout = render({ popoutWindow: { alwaysOnTop: false, onDock() {}, onTogglePin() {} } });
  assert.ok(popout.includes('<span class="w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0"></span>'), popout);
  assert.doesNotMatch(popout, /cc-lined-title-group|ps-md shrink-0|--cds-outset-x:var\(--cds-pad-md\)/);
  assert.match(popout, /aria-label="A title, rename session" class="[^"]* mx-outset h-control px-xs rounded [^"]*" style="--cds-outset-x:var\(--cds-pad-xs\)">A title<\/button>/);
});
