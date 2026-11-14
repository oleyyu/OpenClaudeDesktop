// frame-sidebar 4.16336.0 (scripts/extract-frame-sidebar-v4.mjs, src/frame-sidebar-host.jsx): the official DesktopFrame
// (shared-22 vB) and DesktopSidebar (KR) sliced over the finalized cds-core, mounted through the production host with a
// synthetic fixture value (no user data). SSR through Vite's module graph (as app-switch-current); no browser, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { boundaries, extractFrameSidebar, pinsPath } from '../scripts/extract-frame-sidebar-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/frame-sidebar');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const manifest = JSON.parse(read('src/generated/frame-sidebar/manifest.json'));
const el = React.createElement;

// KR's slots that the gates on this desktop never reach; frame-sidebar-host.jsx leaves them out so reaching one throws.
const UNREACHABLE = ['ClaudeLogo', 'RouterLink', 'SidebarModeWordmark', 'SidebarNewChatButton', 'trackSidebarLogoClick', 'SidebarChromeBarCluster',
  'SidebarModeSwitchRow', 'SidebarSearchButton', 'SidebarChatPromo', 'FrameChromeBar', 'DiscoveryUpsellCards', 'OrganizationAvatar'];
// The host-only stand-ins the sidebar-body lane replaced with official slices (cj / Cj / ZA / x_ / QL / rT).
const REPLACED_SLOTS = ['SidebarAccountTray', 'SidebarAppSwitch', 'SidebarResizeHandle', 'SidebarCollapseButton', 'SidebarNavFallback', 'FrameEdgePeek'];

let server, Host, Adapter;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  Adapter = await server.ssrLoadModule('/src/frame-sidebar-adapter.mjs');
});
after(async () => { await server?.close(); });

const marker = (name) => el('div', { 'data-host-slot': name });
function hostValue(overrides = {}) {
  return {
    mode: 'code', cdsFont: 'anthropic', platform: 'mac', sidebarless: false,
    collapsed: false, sidebarWidth: 288, sidebarFloor: 240, hovering: false, peeked: false, narrowViewport: false, cuDocked: false,
    setSidebarFloor() {}, setNarrowViewport() {}, resetTransients() {}, closePeek() {}, expandSidebar() {}, toggleSidebar() {}, collapseSidebar() {},
    peekEnter() {}, peekLeave() {}, fullScreen: false, zoomFactor: 1, trafficLightSpacer: 74,
    ...Host.hostRouteGutter({ mode: 'code', section: 'code' }),
    history: { at: 0, length: 1, travel() {} },
    navBody: marker('navBody'), announcer: marker('announcer'),
    // Synthetic fixture account (no user data).
    account: { name: 'Fixture', plan: 'Plan', avatarName: 'Fixture Person', menuOpen: false, openMenu() {} },
    homeMode: 'chat', switchMode() {}, openSettings() {}, setCollapsedPref() {}, commitSidebarWidth() {},
    rootAttributes: { 'data-frame-mode': 'code' },
    ...overrides,
  };
}
// The host's frame store is module state seeded by the first FrameSidebarHost render and then updated in a layout effect
// (not run by SSR): a render with another seed loads a fresh module instance.
async function fresh() {
  server.moduleGraph.invalidateAll();
  Host = await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  Adapter = await server.ssrLoadModule('/src/frame-sidebar-adapter.mjs');
}
const frame = (value) => renderToStaticMarkup(el(Host.HostFrameRoot, { value, legacy: { className: 'legacy-root' } }, el('div', { id: 'route-body' }, 'body')));
const openTag = (html, tag) => { const match = new RegExp(`<${tag}\\b([^>]*)>`).exec(html); assert.ok(match, `no <${tag}>`); return match[1]; };

test('generator: --check reproduces the 27 pinned modules; manifest sources are the pinned 4.16336.0 chunks', async () => {
  await extractFrameSidebar({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  // 24 since cds-core wave 5b: shared-6 qD (the frame content context, the only binding read there) is the cds-core
  // publicName InDesktopFrameContentContext, linked instead of cut (one context instance); shared-6 is neither sliced nor pinned.
  // 27 since sidebar-body (surfaces-prod-2): cj / Cj / ZA / x_ / QL / rT are sliced, entering shared-38 (the CDS resize
  // handle Ei), shared-120 (Dr, the double-click guard) and vendor-intl (tn, defineMessages).
  // 28 since the surfaces-prod-3 sidebar lane: _B's glass layer Yz / Kz / vz is sliced, entering shared-26 (pB, the neutral-60
  // page colour Kz puts behind the glass as its "solid" window colour).
  // 26 since cds-core wave 7: cds-core publishes shared-38 Ei (CdsPanelResizeHandle) and shared-120 Dr (the double-click
  // guard) and what they reach, so both are linked from cds-core and neither chunk is sliced or pinned here.
  // 27 since cds-core wave 8 (W8-M5, option B): this graph holds shared-55 OR / LR with the shared-123 / shared-120 state their
  // closure brings (complete per-chunk linkExports for frame-sidebar-nav), so shared-120 is sliced again (its I / L);
  // shared-38 stays a cds-core link (wave 7: 26, neither chunk).
  assert.equal(manifest.modules.length, 27);
  assert.equal(manifest.modules.some((module) => module.source === 'shared-38-DyF0_Fim.js'), false);
  assert.deepEqual(manifest.modules.find((module) => module.source === 'shared-120-DCdTP1_5.js')?.linkExports, ['I', 'L']);
  for (const module of manifest.modules) assert.equal(module.sourceSha256, pins.sources[module.source], module.source);
  assert.deepEqual(Object.keys(pins.sources).sort(), manifest.modules.map((module) => module.source).sort());
  assert.equal(manifest.modules.some((module) => module.source === 'shared-6-2QYRw_Wv.js'), false);
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.deepEqual(core.publicNames.InDesktopFrameContentContext, { file: 'shared-6-2QYRw_Wv.js', local: 'qD', target: 'shared-6.mjs', exportName: 'qD' });
  assert.deepEqual(manifest.modules.flatMap((module) => module.imports.filter((entry) => entry.name === 'qD').map((entry) => [module.target, entry.kind, entry.from])),
    [['frame.mjs', 'shared-graph', '../cds-core/shared-6.mjs']]);
});

test('review P1 #2: the pins name the finalized cds-core (manifest and adapter bytes)', () => {
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), pins.cdsCore.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/cds-core-adapter.mjs'))), pins.cdsCore.adapterSha256);
  // The CDS names the pilot linked or left pending are cds-core imports now (shared graph), not frame-sidebar boundaries.
  const shared = manifest.modules.flatMap((module) => module.imports.filter((entry) => entry.kind === 'shared-graph').map((entry) => entry.name));
  for (const name of ['CdsRoot', 'CdsButton', 'CdsTooltipProvider', 'CdsTooltip', 'useCdsOwnerWindow']) assert.ok(shared.includes(name), name);
  assert.ok(!boundaries.some((boundary) => ['cdsLink', 'cdsPending'].includes(boundary.kind) || ['CdsTooltip', 'useCdsOwnerWindow', 'SidebarToggleIcon'].includes(boundary.name)));
});

test('review P1 #1: useWindowChrome reads WindowState through the host contract, answered by frame-sidebar-host', async () => {
  const bridge = boundaries.find((boundary) => boundary.name === 'WindowState');
  assert.equal(bridge?.kind, 'bridge');
  assert.deepEqual([...bridge.reads].sort(), ['getFullscreen', 'getZoomFactor', 'onFullscreenChanged', 'onZoomFactorChanged']);
  const windowChrome = read('src/generated/frame-sidebar/window-chrome.mjs');
  assert.match(windowChrome, /WindowState as \w+,?[\s\S]*?from "\.\.\/\.\.\/frame-sidebar-adapter\.mjs"/);
  for (const file of fs.readdirSync(generated).filter((name) => name.endsWith('.mjs')))
    assert.doesNotMatch(fs.readFileSync(path.join(generated, file), 'utf8'), /\.WindowState\b/, file);
  // The host answers from main.jsx's fullScreen / zoomFactor.
  assert.equal(Host.HOST_ANSWERS.WindowState[0], 'host');
  renderToStaticMarkup(el(Host.FrameSidebarHost, { value: hostValue({ fullScreen: true, zoomFactor: 1.25 }) }, null));
  assert.equal(await Adapter.WindowState.getFullscreen(), true);
  assert.equal(await Adapter.WindowState.getZoomFactor(), 1.25);
  const off = Adapter.WindowState.onZoomFactorChanged(() => {});
  assert.equal(typeof off, 'function');
  off();
});

test('host contract: every boundary is answered or deliberately unreachable; answers name their kind', () => {
  const names = boundaries.map((boundary) => boundary.name);
  assert.deepEqual(new Set(names).size, names.length);
  const answered = Object.keys(Host.HOST_ANSWERS);
  assert.deepEqual(answered.filter((name) => !names.includes(name)), []);
  assert.deepEqual(names.filter((name) => !answered.includes(name)).sort(), [...UNREACHABLE].sort());
  for (const [name, [kind, answer]] of Object.entries(Host.HOST_ANSWERS)) {
    assert.ok(['host', 'gate', 'gap'].includes(kind), name);
    assert.ok(answer !== undefined && answer !== null, name);
  }
  for (const name of UNREACHABLE)
    assert.throws(() => Adapter[name](), new RegExp(`frame-sidebar host capability ${name} is not provided`));
});

test('DesktopFrame through the host: one .dframe-root, density comfortable, five variables, content in main.dframe-content', () => {
  const html = frame(hostValue());
  const root = openTag(html, 'div');
  assert.match(root, /class="dframe-root draggable-none[^"]*"/);
  assert.match(root, /data-sidebar-density="comfortable"/);
  assert.match(root, /data-variant="web"/);
  assert.doesNotMatch(root, /data-collapsed|data-web=|data-wco|data-experiment|data-fullscreen/);
  assert.match(root, /--df-sidebar-width:288px;--df-sidebar-floor:240px;--df-traffic-light-spacer:max\(0px, calc\(74px - 1000 \* max\(0px, var\(--app-top-offset, 0px\) - 48px\)\)\);--df-window-border:1px;--df-drag-ghost-z:9001/);
  // Review P2: no wrapper between the host and the official root -- desktop-app is written onto vB's own root (FrameRootMarks,
  // a layout effect), so only one element is the .dframe-root and none carries desktop-app in the server markup.
  assert.equal(html.split('dframe-root').length - 1, 1);
  assert.doesNotMatch(html, /legacy-root|desktop-app/);
  assert.match(html, /<main class="dframe-content" data-perf-region="main"><div class="dframe-content-inner" style="--df-content-gutter:0px"><div class="dframe-content-banner"><\/div>/);
  assert.doesNotMatch(html, /dframe-content[^>]*data-focus-region/);
  assert.ok(html.indexOf('<div id="route-body">body</div>') > html.indexOf('class="dframe-content-inner"'));
  assert.ok(html.includes('<div class="dframe-peek-nodrag" aria-hidden="true"></div></main>'));
});

test('DesktopSidebar (KR): comfortable aside, Search is a nav-body row (no titlebar Search), host slots in the official order', () => {
  const html = frame(hostValue());
  assert.match(openTag(html, 'aside'), /class="dframe-sidebar[^"]*" data-density="comfortable"[^>]*aria-label="Sidebar"/);
  assert.match(html, /data-traffic-light-spacer="true"/);
  assert.match(html, /aria-label="Hide sidebar"/);
  assert.match(html, /<h2 class="sr-only">Navigation<\/h2>/);
  const order = ['aria-label="Hide sidebar"', 'data-compact-mode-switcher', 'id="frame-peek-popover"', 'data-host-slot="navBody"', 'df-bottom-tray', 'data-testid="user-menu-button"', 'dframe-resize-handle'];
  const at = order.map((needle) => html.indexOf(needle));
  assert.ok(at.every((index) => index > 0), order.filter((_, index) => at[index] < 0).join());
  assert.deepEqual([...at].sort((a, b) => a - b), at);
  assert.doesNotMatch(html, /aria-label="Search"/);
  assert.equal(html.split('data-host-slot="announcer"').length - 1, 1);
});

test('SidebarNavBody slot: a render-function navBody receives KR\'s PI props (coworkChecklistMounted / codeSessionListChrome / classicSearchRow)', () => {
  // shared-22 KR: o(c_, { children: o(PI, { coworkChecklistMounted: _, codeSessionListChrome: u, classicSearchRow: de }) }).
  const seen = [];
  const html = frame(hostValue({ navBody: (props) => { seen.push(props); return marker('navBodyFn'); } }));
  assert.equal(seen.length, 1);
  assert.deepEqual(Object.keys(seen[0]).sort(), ['classicSearchRow', 'codeSessionListChrome', 'coworkChecklistMounted']);
  assert.equal(html.split('data-host-slot="navBodyFn"').length - 1, 1);
  // An element navBody still draws as itself.
  assert.equal(frame(hostValue()).split('data-host-slot="navBody"').length - 1, 1);
});

test('collapsed: data-collapsed on the root, the peek bridge, and the collapsed chrome instead of the titlebar', async () => {
  await fresh();
  // The collapsed trigger fO is client-only (shared-33 lD reads document / location in a state initializer): an empty
  // fixture document, no static-composer boot element.
  globalThis.document = { documentElement: { hasAttribute: () => false, getAttribute: () => null }, getElementById: () => null };
  globalThis.window = { location: { pathname: '/host-fixture' }, navigator: { userAgent: 'host-fixture Macintosh', platform: 'MacIntel' } };
  let html;
  try { html = frame(hostValue({ collapsed: true })); }
  finally { delete globalThis.document; delete globalThis.window; }
  assert.match(html, /data-testid="sidebar-compact-trigger" aria-expanded="false" aria-controls="frame-peek-popover"/);
  assert.match(openTag(html, 'div'), /data-collapsed="true"/);
  assert.match(html, /class="dframe-peek-bridge"/);
  assert.match(html, /df-collapsed-chrome/);
  assert.doesNotMatch(html, /aria-label="Hide sidebar"/);
  // rT (sliced): the collapsed edge strip (Xw over the CDS resize handle), no edge-magnet hint (shared-8 ES off).
  assert.match(html, /class="[^"]*df-sidebar-edge-strip[^"]*dframe-sidebar-edge[^"]*"/);
  assert.doesNotMatch(html, /dframe-sidebar-edge-hint/);
});

test('sidebarless (incognito shell): vB drops KR and marks data-experiment', async () => {
  await fresh();
  const html = frame(hostValue({ sidebarless: true }));
  assert.match(openTag(html, 'div'), /data-experiment="true"/);
  assert.doesNotMatch(html, /<aside|data-host-slot="navBody"/);
  assert.ok(html.includes('<div id="route-body">body</div>'));
});

test('windows without a sidebar keep the legacy root; route gutters follow the official route kinds', () => {
  assert.equal(renderToStaticMarkup(el(Host.HostFrameRoot, { value: null, legacy: { className: 'legacy-root', 'data-variant': 'web' } }, 'x')),
    '<div class="legacy-root" data-variant="web">x</div>');
  assert.deepEqual(Host.hostRouteGutter({ mode: 'code', section: 'sessions' }), { contentGutterZero: true, routeGutter: 'kept' });
  assert.deepEqual(Host.hostRouteGutter({ mode: 'chat', section: 'projects' }), { contentGutterZero: false, routeGutter: 'none' });
  assert.deepEqual(Host.hostRouteGutter({ mode: 'chat', section: 'chat' }), { contentGutterZero: false, routeGutter: 'kept' });
});

test('one React: the adapter hands the slice the host React; bare imports of the slice are React only', async () => {
  assert.equal(Adapter.loadHostReact().useState, React.useState);
  const seen = new Set(), bare = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = fs.readFileSync(file, 'utf8');
    for (const node of parseAst(code, { lang: 'js' }, file).body) {
      const spec = node.type === 'ImportDeclaration' || ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source) ? node.source.value : null;
      if (!spec) continue;
      if (!spec.startsWith('.')) { bare.add(spec); continue; }
      const to = path.resolve(path.dirname(file), spec);
      if (to === path.join(app, 'src/frame-sidebar-adapter.mjs') || to.startsWith(path.join(app, 'src/generated/cds-core'))) continue;
      // D1 link (sidebar-body): shared-183 UW, held by files-changes-v4; since cds-core wave 6 its pending-count Map HW is
      // the cds-core publicName state_shared183_HW, which menu-pending imports (its only import).
      if (to === path.join(app, 'src/generated/files-changes-v4/menu-pending.mjs')) {
        const imports = fs.readFileSync(to, 'utf8').split('\n').filter((l) => /^import /.test(l));
        assert.deepEqual(imports, ['import { HW } from "../cds-core/shared-183.mjs";']);
        continue;
      }
      assert.ok(to.startsWith(generated), `${file} -> ${spec}`);
      visit(to);
    }
  };
  visit(path.join(generated, 'frame.mjs'));
  visit(path.join(generated, 'frame-chrome.mjs'));
  assert.deepEqual([...bare].filter((spec) => !['react', 'react/jsx-runtime', 'react/compiler-runtime', 'react-dom'].includes(spec)), []);
});

test('main.jsx: the main window mounts HostFrameRoot with the frame host; the legacy root and its sidebar are gone there', () => {
  const main = read('src/main.jsx');
  assert.equal(main.split('<HostFrameRoot value={frameHost} legacy={{').length - 1, 1);
  assert.equal(main.split('</HostFrameRoot>').length - 1, 1);
  assert.match(main, /const frameHost = side === 0 && !NO_SIDEBAR \? \{/);
  assert.match(main, /navBody: sidebarNavBody,/);
  // integration-3 (frame-sidebar review P2): the frame host answers useCdsInterfaceFont with the 4.16336.0 token.
  assert.match(main, /const cdsCoreFont = prefs\.interfaceFont === "anthropic" \? "anthropic" : "system";/);
  assert.match(main, /\n\s+mode, cdsFont: cdsCoreFont, platform: /);
  // was: assert.match(main, /\n\s+slot="nav-body"\n/);  (sidebar prestage-r4: SourceSidebar no longer draws the nav body
  // column; the sliced 4.16336.0 PI does, through frame-sidebar-nav-body.jsx; SourceSidebar keeps its menus / dialogs / palette.)
  assert.match(main, /\n\s+slot="overlays"\n/);
  assert.doesNotMatch(main, /\n\s+slot="nav-body"\n/);
  assert.match(main, /import \{ HostSidebarNavBody \} from "\.\/frame-sidebar-nav-body\.jsx";/);
  assert.match(main, /<HostSidebarNavBody value=\{sidebarNavValue\} \{\.\.\.navProps\} \/>/);
  assert.match(main, /\{side === 0 && !frameHost && <SourceLiveAnnouncer \/>\}/);
  assert.doesNotMatch(main, /SourceSidebarBoundary/);
  assert.match(main, /import \{ HostFrameRoot, hostRouteGutter \} from "\.\/frame-sidebar-host\.jsx";/);
});

// ---- sidebar-body lane (surfaces-prod-2): the slices that replaced host stand-ins ----------------------------------------
test('sidebar-body: cj / Cj / ZA / x_ / QL / rT are slices, not boundaries; the host stand-ins and their slots are gone', () => {
  const keys = boundaries.map((boundary) => boundary.key);
  for (const local of ['cj', 'Cj', 'ZA', 'x_', 'rT']) assert.ok(!keys.includes(`shared-21-CuohtEoj.js#${local}`), local);
  assert.ok(!keys.includes('shared-22-BACJUrcb.js#QL'));
  for (const name of REPLACED_SLOTS) assert.ok(!Object.hasOwn(Host.HOST_ANSWERS, name), name);
  const chrome = read('src/generated/frame-sidebar/frame-chrome.mjs'), frameCode = read('src/generated/frame-sidebar/frame.mjs');
  // D1: the menu-pending hold ZA's Escape claim takes is linked from files-changes-v4, not cut again.
  assert.deepEqual(manifest.linkedAreas, [{ area: 'files-changes-v4', modules: ['menu-pending.mjs'] }]);
  assert.doesNotMatch(read('src/generated/frame-sidebar/shared-183.mjs'), /\bHW\b/);
  for (const declaration of ['function cj(e)', 'function Cj(e, t)', 'function ZA(e)', 'var x_ = _(function ()', 'function rT()'])
    assert.ok(chrome.includes(declaration), declaration);
  assert.ok(frameCode.includes('function QL(e)'));
  assert.ok(read('src/generated/frame-sidebar/shared-19.mjs').includes('var QF = T(function (e)'));
  const host = read('src/frame-sidebar-host.jsx');
  assert.doesNotMatch(host, /Sidebar failed to load|function CollapseButton|SourceSidebarResizeHandle|function navFallback/);
});

test('sidebar-body: Cj is the official nav fallback (re-sanitise, then reset)', () => {
  const chrome = read('src/generated/frame-sidebar/frame-chrome.mjs');
  const at = chrome.indexOf('function Cj(e, t)');
  const body = chrome.slice(at, chrome.indexOf('\nfunction ', at + 10));
  assert.match(body, /defaultMessage: "Sidebar failed to load\."/);
  assert.match(body, /Q\.getState\(\)\.resanitizeIdArrays\(\);\s*\} finally \{\s*t\(\);/);
});

test('sidebar-body: the official tray shows the host account (identity · plan), Code settings in Code, no Devices (gate)', async () => {
  await fresh();
  const code = frame(hostValue());
  assert.match(code, /class="df-footer-row shrink-0 flex items-center gap-\[var\(--df-footer-gap\)\]"/);
  assert.match(code, /data-testid="user-menu-button"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/);
  assert.match(code, /<span class="df-footer-name whitespace-nowrap text-secondary max-w-full shrink-0">Fixture<\/span>/);
  assert.match(code, /df-footer-suffix-text min-w-0 whitespace-nowrap [^"]*">Plan<\/span>/);
  assert.match(code, /aria-label="Code settings"/);
  assert.doesNotMatch(code, /aria-label="Get apps and extensions"/);
  await fresh();
  const chat = frame(hostValue({ mode: 'chat', rootAttributes: { 'data-frame-mode': 'chat' } }));
  assert.doesNotMatch(chat, /aria-label="Code settings"/);
  assert.doesNotMatch(chat, /aria-label="Get apps and extensions"/);
  assert.match(chat, />Fixture<\/span>/);
  // No plan: no dot, no suffix.
  await fresh();
  const bare = frame(hostValue({ account: { name: 'Fixture', plan: '', avatarName: 'Fixture', menuOpen: false, openMenu() {} } }));
  assert.doesNotMatch(bare, /df-footer-suffix-text/);
});

test('sidebar-body: the official x_ mode switch (home + Code) selects by the host mode', async () => {
  await fresh();
  const code = frame(hostValue());
  assert.match(code, /data-compact-mode-switcher="true"[^>]*data-chorus-callout="pills"/);
  assert.match(code, /class="[^"]*df-app-switch[^"]*"/);
  const radios = [...code.matchAll(/<span[^>]*role="radio"[^>]*>/g)].map((match) => match[0]);
  assert.equal(radios.length, 2);
  assert.match(radios[1], /aria-checked="true"/);
  assert.match(radios[0], /aria-checked="false"/);
  await fresh();
  const chat = frame(hostValue({ mode: 'chat' }));
  const chatRadios = [...chat.matchAll(/<span[^>]*role="radio"[^>]*>/g)].map((match) => match[0]);
  assert.match(chatRadios[0], /aria-checked="true"/);
});

test('sidebar-body: ZA is the official resize handle (CDS handle, labels, bounds)', async () => {
  await fresh();
  const html = frame(hostValue());
  const handle = /<[^>]*class="dframe-resize-handle"[^>]*>/.exec(html)?.[0] ?? /<[^>]*dframe-resize-handle[^>]*>/.exec(html)?.[0];
  assert.ok(handle, 'no resize handle');
  assert.match(handle, /aria-label="Resize sidebar"/);
  assert.match(handle, /aria-valuemax="420"/);
  assert.match(handle, /aria-valuenow="288"/);
});

// SB-0 / H11 (round4 wave8b sidebar): the frame store is the official shared-92 Y held by cds-core (store_shared92_Y), linked
// by the sliced frame; the host table has no frameStore and the frame's actions are Y's own (main.jsx follows them). Was:
// `const store = Adapter.frameStore; …; store.getState().toggleCollapsed(); store.getState().setCollapsedPref(true);
// store.getState().commitSidebarWidth(300); …; assert.deepEqual(calls, ['collapse', ['pref', true], ['width', 300],
// ['settings', 'code']]);` (the host store routed toggleCollapsed / setCollapsedPref / commitSidebarWidth to main.jsx).
test('sidebar-body: the frame store is the official Y of cds-core; its actions are Y\'s own; listeners get (state, previous)', async () => {
  await fresh();
  const calls = [];
  const value = hostValue({ collapseSidebar: () => calls.push('collapse'), expandSidebar: () => calls.push('expand'),
    setCollapsedPref: (v) => calls.push(['pref', v]), commitSidebarWidth: (w) => calls.push(['width', w]), openSettings: (tab) => calls.push(['settings', tab]) });
  renderToStaticMarkup(el(Host.FrameSidebarHost, { value }, null));
  assert.equal(Adapter.frameStore, undefined);
  assert.ok(!boundaries.some((b) => b.key === 'shared-92-BOgyxePb.js#Y' || b.name === 'frameStore'));
  assert.ok(!Object.hasOwn(Host.HOST_ANSWERS, 'frameStore'));
  assert.ok(!Object.hasOwn(pins.boundaries, 'shared-92-BOgyxePb.js#Y'));
  for (const file of ['frame.mjs', 'frame-chrome.mjs', 'sidebar-layout.mjs', 'sidebar-store.mjs'])
    assert.match(read(`src/generated/frame-sidebar/${file}`), /import \{ Y(?: as [\w$]+)?[,} ][^\n]*from "\.\.\/cds-core\/shared-92\.mjs";/, file);
  const Core = await server.ssrLoadModule('/src/cds-core.mjs');
  const store = Core.store_shared92_Y;
  const seen = [];
  const off = store.subscribe((state, previous) => seen.push([state.isResizing, previous.isResizing]));
  store.getState().setIsResizing(true);
  assert.deepEqual(seen, [[true, false]]);
  assert.equal(store.getState().isResizing, true);
  store.getState().setIsResizing(false);
  off();
  store.getState().setIsNarrowViewport(false);
  const before = store.getState().collapsed;
  store.getState().toggleCollapsed();
  assert.equal(store.getState().collapsed, !before);
  store.getState().setCollapsedPref(true);
  assert.equal(store.getState().collapsed, true);
  store.getState().commitSidebarWidth(300);
  assert.equal(store.getState().sidebarWidth, 300);
  store.getState().commitSidebarWidth(1000);
  assert.equal(store.getState().sidebarWidth, 420); // shared-92 Cg: Math.min(Sg.MAX, Math.max(Sg.MIN, e))
  assert.equal(store.getState().experimentFrameActive, false);
  Adapter.openSettingsPage('claude-code');
  assert.deepEqual(calls, [['settings', 'code']]);
  // shared-25 go: an unlisted flag is not in the payload (jo reads inPayload false).
  assert.equal(Host.HOST_ANSWERS.useGrowthBookFeature[1]('__gb__741807810').source, 'unknownFeature');
  assert.equal(Adapter.isWebBuild, Host.HOST_ANSWERS.isWebBuild[1]);
});

// surfaces-prod-3 sidebar lane (nav-plan step 2): _B's glass layer. shared-22 Yz / Kz / vz are sliced (not written): Yz asks
// for the official default { material: "appkit-glass", behind: "flat" } through the preload's claude.windowVibrancy bridge,
// Kz falls back to "sidebar" when the glass is refused, vz tints the native layer from --df-sidebar-tint-mixed.
test('glass layer: Yz / Kz / vz are the pinned official declarations, mounted by the host dock answer as _B does', async () => {
  for (const [semantic, local] of [['SidebarGlassLayer', 'Yz'], ['SidebarVibrancy', 'Kz'], ['useSidebarTintUnderSidebar', 'vz']]) {
    assert.deepEqual([pins.roots[semantic].file, pins.roots[semantic].local], ['shared-22-BACJUrcb.js', local]);
  }
  const frameSource = read('src/generated/frame-sidebar/frame.mjs');
  assert.match(frameSource, /var rz = globalThis\["claude\.windowVibrancy"\]\?\.WindowVibrancy;/);
  assert.match(frameSource, /az = \{ material: "appkit-glass", behind: "flat" \}/);
  assert.match(frameSource, /oz = "--df-sidebar-tint-mixed"/);
  assert.match(frameSource, /Yz as SidebarGlassLayer/);
  // the telemetry the layer reports (desktop_sidebar_material tags) stops at named gap boundaries
  for (const name of ['setRumGlobalContext', 'removeRumGlobalContext', 'setCrashReportTag', 'removeCrashReportTag']) {
    assert.ok(boundaries.some((b) => b.name === name), name);
    assert.deepEqual(Host.HOST_ANSWERS[name][0], 'gap');
  }
  const hostSource = read('src/frame-sidebar-host.jsx');
  assert.match(hostSource, /<SidebarGlassLayer rootRef=\{rootRef\} docked=\{sidebarDocked\} \/>/);
  // the preload bridge the layer reads (official mainView.js shape)
  const preload = read('electron/preload.cjs');
  for (const method of ['showUnderSidebar', 'tintUnderSidebar', 'clearTintUnderSidebar']) assert.ok(preload.includes(`${method}:`), method);
  // without the bridge (SSR / web) Yz renders nothing and the frame still renders
  await fresh();
  assert.match(frame(hostValue()), /dframe-root/);
});

// round-4 wave 8c sidebar lane, H12: _B's root marks are the official hB (shared-22, pinned root SidebarDockRootMarks), not the
// host's FrameRootMarks stand-in: hB writes data-hovering / data-peeked / data-resizing / data-session-dragging from the
// official stores, data-strip-lined through shared-31 nu and the cursor lock through shared-26 UH over cds-core's BH.
test('H12 root marks: hB is the pinned official declaration, mounted by the host dock answer as _B does', async () => {
  assert.deepEqual([pins.roots.SidebarDockRootMarks.file, pins.roots.SidebarDockRootMarks.local, pins.roots.SidebarDockRootMarks.declarationSha256],
    ['shared-22-BACJUrcb.js', 'hB', 'bdeabc954a671afed28b271aedbe85614a59a9f1cde90dea9c84f358b0a60340']);
  const frameSource = read('src/generated/frame-sidebar/frame.mjs');
  assert.match(frameSource, /hB as SidebarDockRootMarks/);
  for (const mark of ['data-hovering', 'data-peeked', 'data-resizing', 'data-session-dragging']) assert.match(frameSource, new RegExp(`e\\.toggleAttribute\\("${mark}"`), mark);
  // D1: the cursor-lock store is cds-core's (store_shared26_BH, wave 8c), the session-dragging store this graph's shared-55 eL
  assert.match(read('src/generated/frame-sidebar/shared-26.mjs'), /import \{ BH \} from "\.\.\/cds-core\/shared-26\.mjs";/);
  assert.match(read('src/generated/frame-sidebar/shared-55.mjs'), /function gL\(\) \{\n  return eL\(_L\);/);
  assert.match(read('src/generated/frame-sidebar/shared-31.mjs'), /var \$l = "data-strip-lined";/);
  const hostSource = read('src/frame-sidebar-host.jsx');
  assert.match(hostSource, /<SidebarDockRootMarks rootRef=\{rootRef\} \/><HostRootMarks rootRef=\{rootRef\} \/><SidebarGlassLayer rootRef=\{rootRef\} docked=\{sidebarDocked\} \/>/);
  // the host stand-in is gone: the host writes only its own marks (desktop-app class, rootAttributes)
  assert.doesNotMatch(hostSource, /function FrameRootMarks|toggleAttribute\("data-(hovering|peeked|resizing)"/);
  await fresh();
  assert.match(frame(hostValue()), /dframe-root/);
});

// round-4 wave 8c sidebar lane: the router boundary both graphs reuse (shared-25 $u) takes the settings routes itself and
// hands every other pathname (the nav body's: shared-57 Ok `/epitaxy/${id}`, destinations, New) to the navigation the nav
// body module provides (frame-sidebar-nav-body.jsx provideOfficialNavigation); a pathname nobody routes still throws.
test('router: non-settings pathnames go to the provided official navigation; unknown ones throw', async () => {
  await fresh();
  const pushed = [];
  Host.provideOfficialNavigation((pathname) => (pushed.push(pathname), pathname.startsWith('/epitaxy/')));
  const router = Host.HOST_ANSWERS.useRouter[1]();
  router.push('/epitaxy/fx-1');
  assert.deepEqual(pushed, ['/epitaxy/fx-1']);
  assert.throws(() => router.push('/nowhere'), /frame-sidebar: the host has no route "\/nowhere"/);
  Host.provideOfficialNavigation(null);
  assert.throws(() => router.replace('/epitaxy/fx-2'), /the host has no route/);
});
