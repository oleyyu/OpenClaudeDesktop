// The sliced 4.16336.0 sidebar nav body (shared-22 PI, scripts/extract-frame-sidebar-nav.mjs) under its host
// (src/frame-sidebar-nav-host.jsx) and the frame-sidebar host (the reused boundaries). SSR only: effects do not run, so the
// session list (shared-8 wy over LocalSessions.getSessionList) stays at its official initial state here.
//
// Wave 7 (cds-core 79b004e0, cds-integrate/wave7/apply-real.json): W7-D2 moved the whole vendor-zod state unit
// (Me / O / Ne / k / M / z) into cds-core, so the wave-6 load failure ("Cannot set property Me of [object Module] which has
// only a getter") is gone and the slice links that unit (tested below, real). Still BLOCKED until cds-core wave 8
// (analysis/claude-4.16336.0-migrate-20261104/round3/wave8-requests.json):
//   - 54 official writers in the slice assign module state the slice imports read-only (d1-gate --app-only, W7-D1): their
//     closures reach host adapter boundaries that cds-core does not answer yet (W7-D3: shared-0 H 25, qB 4, B 3, LL 3,
//     Ru 3, eP 2, shared-25 cy 2, vendor-zod cc / Ks, shared-120 U, shared-2 wH, shared-62 Qk, shared-92 Jo; load-time DOM
//     yM / XF), the official frame store shared-92 Y (W7-D4: xp, jk) and the frame-sidebar shared-55 unit (OR / LR);
//   - the nav reads ~37 fields of the official frame store Y; the hand-written frameStore of frame-sidebar-host.jsx has 11
//     (W7-D4 + sidebar-store unit; that shim is not to be extended);
//   - host order: src/frame-sidebar-nav-host.jsx imports generated nav-body.mjs before installFrameSidebarNavHost(...)
//     runs, and shared-140 calls the defineLazyEntry capability while it evaluates ("host capability defineLazyEntry is
//     not provided"); then the reused useCurrentAccount answer lacks the official memberships array (shared-25 wV) and
//     the framePathnameStore answer lacks zustand getInitialState (shared-25 ru) — host fixes of task SB-1.
// The writer contract stays `todo` until importWrites() is empty; meanwhile the residue is pinned (no new write may appear).
// cds-core wave 8 (cds-wave8/design/plan.json, W8-M1 / W8-M6; d1-gate --app-only: 0 import writes): importWrites() is empty,
// so the writer contract is a real test (was `{ todo: BLOCKED }`) and the residue pin asserts that nothing is left (was
// `assert.ok(hits.length > 0, …)`). Host order (SB-1) and the official frame store / account memberships stay todo.
// Sidebar line prestage-r4 (SB-1 host fixes): src/frame-sidebar-nav-body.jsx imports the host first, then generated
// nav-body.mjs (the table is installed before shared-140 evaluates); the reused useCurrentAccount answer and the nav's
// useOptionalCurrentAccount carry the official memberships array ([]: no organization). The host-answers contract is a real
// test now (was `{ todo: BLOCKED_ORDER }`). The SSR renders stay todo for a different reason: the official nav is
// client-rendered (shared-39 Xf and others call useSyncExternalStore without getServerSnapshot, which React's server
// renderer rejects), so it is verified in the isolated-profile Electron GUI instead (surfaces-prod-3/sidebar/prestage-r4).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { boundaries, linkedAreas, pinsPath, adapterSource } from '../scripts/extract-frame-sidebar-nav.mjs';
import { boundaries as frameBoundaries } from '../scripts/extract-frame-sidebar-v4.mjs';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const manifest = JSON.parse(read('src/generated/frame-sidebar-nav/manifest.json'));
const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
const el = React.createElement;

const BLOCKED = 'cds-core wave 8 (round3/wave8-requests.json W7-D3 / W7-D4 / shared-55): 54 writers still assign state the slice imports read-only';
// Not a cds-core wait: src/frame-sidebar-nav-host.jsx installs its table after generated nav-body.mjs evaluates, and shared-140
// calls defineLazyEntry while it loads (task SB-1 host fix; with the table installed first the answers match both ways).
const BLOCKED_ORDER = 'SB-1 host order: frame-sidebar-nav-host.jsx installs HOST_ANSWERS after nav-body.mjs evaluates (shared-140 defineLazyEntry at load)';
// was: const BLOCKED_HOST = 'wave 8 W7-D4 (official frame store Y: the nav reads ~37 of its fields, the frameStore shim has 11) + W7-D3 runtime writers, after the SB-1 host fixes (install order, official account memberships, framePathnameStore getInitialState; SSR needs the official ServerCookies context ctx_shared0_Do)';
const BLOCKED_HOST = 'client-only official nav: under node SSR without a document, shared-18 fE reads useCookies outside the official ServerCookies provider ("useCookies must be used within a ServerCookiesProvider"); with a DOM stub, shared-39 Xf (and others) call useSyncExternalStore without getServerSnapshot, which React SSR rejects ("Missing getServerSnapshot"); rendered and checked in the Electron GUI (surfaces-prod-3/sidebar/prestage-r4)';

// The import-write residue after wave 7 (this scan's form: module: written import <- source). 73 distinct rows; the d1-gate
// form of the same residue is 54 writers (cds-integrate/wave7/logs/apply-real/d1-gate-real-app-only.out). Wave 8 shrinks
// it to nothing; until then nothing may be added.
const WAVE7_IMPORT_WRITES = new Set([
  "shared-0.mjs: V$ <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: bL <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: cC <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: dL <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: lC <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: pL <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: sC <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: uC <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: uL <- ../cds-core/shared-0.mjs",
  "shared-0.mjs: vL <- ../cds-core/shared-0.mjs",
  "shared-120.mjs: cn <- ../cds-core/shared-120.mjs",
  "shared-120.mjs: ln <- ../cds-core/shared-120.mjs",
  "shared-120.mjs: sn <- ../cds-core/shared-120.mjs",
  "shared-183.mjs: ib <- ../cds-core/shared-183.mjs",
  "shared-2.mjs: kH <- ../cds-core/shared-2.mjs",
  "shared-212.mjs: DJ <- ../cds-core/shared-212.mjs",
  "shared-25-D-aF0gt9.js: DP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: EP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: K <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: OP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: PP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: Sj <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: TP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: Y <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: ZS <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: _P <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: dP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: fP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: gP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: gy <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: mP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: pP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: q <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: rP <- ../cds-core/shared-25.mjs",
  "shared-25-D-aF0gt9.js: vj <- ../cds-core/shared-25.mjs",
  "shared-31.mjs: mp <- ../cds-core/shared-31.mjs",
  "shared-39.mjs: fy <- ../cds-core/shared-39.mjs",
  "shared-55.mjs: DR <- ../frame-sidebar/shared-55.mjs",
  "shared-55.mjs: JB <- ../cds-core/shared-55.mjs",
  "shared-55.mjs: KB <- ../cds-core/shared-55.mjs",
  "shared-55.mjs: mL <- ../frame-sidebar/shared-55.mjs",
  "shared-62.mjs: DX <- ../cds-core/shared-62.mjs",
  "shared-62.mjs: Zk <- ../cds-core/shared-62.mjs",
  "shared-92.mjs: $d <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Ak <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Ap <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: ER <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Ep <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Hd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Jd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Ld <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Mp <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Pp <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Qd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Rd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Sm <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Ud <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Vd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Wd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: Yd <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: df <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: ef <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: ff <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: hf <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: jp <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: kp <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: lf <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: mf <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: pf <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: uf <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: vm <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: wp <- ../cds-core/shared-92.mjs",
  "shared-92.mjs: zd <- ../cds-core/shared-92.mjs",
]);
let server, FrameHost, NavHost, NavBody;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });
async function load() {
  FrameHost ??= await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  // SB-1 host order: the nav body module first (it imports the host table before generated nav-body.mjs).
  NavBody ??= await server.ssrLoadModule('/src/frame-sidebar-nav-body.jsx');
  NavHost ??= await server.ssrLoadModule('/src/frame-sidebar-nav-host.jsx');
}

// Every write in the generated modules to an imported binding (an ES live binding is read-only: the write throws).
function importWrites() {
  const babel = createRequire(import.meta.url)('../../tools/node_modules/playwright/lib/transform/babelBundle.js');
  const dir = path.join(app, 'src/generated/frame-sidebar-nav');
  const hits = [];
  for (const f of fs.readdirSync(dir).filter((f) => /\.m?js$/.test(f))) {
    const check = (p, name) => { const b = p.scope.getBinding(name); if (b?.kind === 'module') hits.push(`${f}: ${name} <- ${b.path.parent.source.value}`); };
    babel.traverse(babel.babelParse(fs.readFileSync(path.join(dir, f), 'utf8'), f, true), {
      AssignmentExpression(p) { for (const n of Object.keys(p.getBindingIdentifiers())) check(p, n); },
      UpdateExpression(p) { if (p.node.argument.type === 'Identifier') check(p, p.node.argument.name); },
    });
  }
  return hits;
}

function frameValue(mode) {
  return {
    mode, cdsFont: 'anthropic', platform: 'mac', sidebarless: false,
    collapsed: false, sidebarWidth: 288, sidebarFloor: 240, hovering: false, peeked: false, narrowViewport: false, cuDocked: false,
    setSidebarFloor() {}, setNarrowViewport() {}, resetTransients() {}, closePeek() {}, expandSidebar() {}, toggleSidebar() {}, collapseSidebar() {},
    peekEnter() {}, peekLeave() {}, fullScreen: false, zoomFactor: 1, trafficLightSpacer: 74,
    ...FrameHost.hostRouteGutter({ mode, section: mode }),
    history: { at: 0, length: 1, travel() {} },
    navBody: null, announcer: null,
    // Synthetic fixture account (no user data).
    account: { name: 'Fixture', plan: 'Plan', avatarName: 'Fixture Person', menuOpen: false, openMenu() {} },
    homeMode: 'chat', switchMode() {}, openSettings() {}, setCollapsedPref() {}, commitSidebarWidth() {},
    rootAttributes: { 'data-frame-mode': mode },
  };
}
function navValue(mode) {
  return { mode, section: null, current: null, localSessions: [], account: { display_name: 'Fixture', full_name: 'Fixture Person', email_address: 'fixture@example.invalid' },
    searchOpen: false, setSearchOpen() {}, navigateOfficial() {}, travel() {} };
}
const render = (mode, props = {}) => renderToStaticMarkup(el(FrameHost.FrameSidebarHost, { value: frameValue(mode) },
  el(NavBody.HostSidebarNavBody, { value: navValue(mode), coworkChecklistMounted: false, codeSessionListChrome: true, classicSearchRow: true, ...props })));

test('generator: manifest is the cds-core 4.16336.0 slice of shared-22 PI; pins cover every chunk and boundary', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(Object.keys(pins.sources).sort(), manifest.modules.map((m) => m.source).sort());
  assert.deepEqual(Object.keys(pins.boundaries).sort(), boundaries.map((b) => b.key).sort());
  assert.deepEqual(manifest.linkedAreas, linkedAreas);
  assert.equal(read('src/frame-sidebar-nav-adapter.mjs'), adapterSource());
});

test('adapter: reused boundaries are the frame-sidebar ones', () => {
  const frameKeys = new Map(frameBoundaries.map((b) => [b.key, b.name]));
  for (const b of boundaries.filter((x) => x.kind === 'reuse')) assert.equal(frameKeys.get(b.key), b.name, b.key);
});

test('D1 writer contract: no sliced binding writes another graph\'s module state', () => { // wave 8: was { todo: BLOCKED }
  assert.deepEqual(importWrites(), []);
});

test('D1 writer residue: no import write outside the wave-7 residue (no new writer)', () => {
  const hits = importWrites();
  assert.deepEqual([...new Set(hits)].filter((h) => !WAVE7_IMPORT_WRITES.has(h)), []);
  // wave 8: the residue is gone (wave 7: assert.ok(hits.length > 0, 'the residue is gone: turn the writer contract above into a
  // real test and drop this pin')); the pin now holds it at zero.
  assert.equal(hits.length, 0);
});

test('W7-D2: the vendor-zod state unit is linked from cds-core, not sliced, and the zod schemas evaluate in isolation', async () => {
  const zod = manifest.modules.find((m) => m.target === 'vendor-zod.mjs');
  assert.ok(zod, 'vendor-zod.mjs');
  const sliced = new Set(zod.bindings.map((b) => b.name));
  assert.deepEqual(['Me', 'O', 'Ne', 'k', 'M', 'z'].filter((n) => sliced.has(n)), []);
  const linked = new Set(zod.imports.filter((i) => i.from === '../cds-core/vendor-zod.mjs').map((i) => i.name));
  // W8A (cds-wave8 addendum): the zod schema values that read k / M / z are cds-core links themselves now
  // (identity_vendorzod_*, published from the one owner), so this closure no longer reaches the state unit at all.
  // Was: for (const n of ['k', 'M', 'z']) assert.ok(linked.has(n), `vendor-zod ${n} <- cds-core`);
  // Still strict: none of the unit is sliced (above), every vendor-zod binding this module imports comes from cds-core,
  // and so does each of k / M / z wherever this graph reads one.
  assert.deepEqual(zod.imports.filter((i) => String(i.via).startsWith('vendor-zod-') && i.from !== '../cds-core/vendor-zod.mjs'), []);
  assert.ok(linked.size > 0, 'vendor-zod <- cds-core');
  for (const n of ['k', 'M', 'z']) for (const m of manifest.modules) for (const i of m.imports ?? [])
    if (i.via === `vendor-zod-fszujTq6.js#${n}`) assert.equal(i.from, '../cds-core/vendor-zod.mjs', `vendor-zod ${n} <- cds-core (${m.target})`);
  for (const m of manifest.modules) if (m.source === 'vendor-zod-fszujTq6.js') assert.deepEqual(['Me', 'O', 'Ne', 'k', 'M', 'z'].filter((n) => m.bindings.some((b) => b.name === n)), [], m.target);
  // shared-62's top-level zod schemas were the wave-6 failure point; they evaluate now (frame-sidebar answers installed first).
  await server.ssrLoadModule('/src/frame-sidebar-host.jsx');
  const s62 = await server.ssrLoadModule('/src/generated/frame-sidebar-nav/shared-62.mjs');
  assert.ok(Object.keys(s62).length > 0);
});

test('host: every capability that is not reused / absent / linked has a host answer', async () => { // SB-1: was { todo: BLOCKED_ORDER }
  await load();
  const answered = new Set(Object.keys(NavHost.HOST_ANSWERS));
  const needed = boundaries.filter((b) => !['reuse', 'absent', 'link'].includes(b.kind)).map((b) => b.name);
  assert.deepEqual(needed.filter((n) => !answered.has(n)), []);
  assert.deepEqual([...answered].filter((n) => !needed.includes(n)), []);
});

test('Code: the official New row, Search row and destinations render under the host', { todo: BLOCKED_HOST }, async () => {
  await load();
  const html = render('code');
  assert.match(html, /df-new-circle/);
  assert.match(html, /Search/);
  assert.match(html, /Customize/);
});

test('Chat: the official nav body renders (New chat, Search, Customize)', { todo: BLOCKED_HOST }, async () => {
  await load();
  const html = render('chat');
  assert.match(html, /Search/);
  assert.match(html, /Customize/);
});

test('SB-1 host order: the nav body loads once the host table is installed (frame-sidebar-nav-body.jsx imports the host first)', async () => {
  await load();
  assert.equal(typeof NavBody.HostSidebarNavBody, 'function');
  const nav = await server.ssrLoadModule('/src/frame-sidebar-nav-adapter.mjs');
  assert.deepEqual(Object.keys(nav.frameSidebarNavHost()).sort(), Object.keys(NavHost.HOST_ANSWERS).sort());
  const body = read('src/frame-sidebar-nav-body.jsx');
  assert.ok(body.indexOf('from "./frame-sidebar-nav-host.jsx"') < body.indexOf('from "./generated/frame-sidebar-nav/nav-body.mjs"'));
  assert.doesNotMatch(read('src/frame-sidebar-nav-host.jsx'), /generated\/frame-sidebar-nav\/nav-body\.mjs/);
});

test('SB-1 account: the reused useCurrentAccount answer carries the official memberships array (shared-25 wV)', async () => {
  await load();
  let seen;
  function Probe() { seen = FrameHost.HOST_ANSWERS.useCurrentAccount[1](); return null; }
  renderToStaticMarkup(el(FrameHost.FrameSidebarHost, { value: frameValue('code') }, el(Probe)));
  assert.deepEqual(seen.account.memberships, []);
  assert.equal(seen.activeOrganization, null);
});

test('SB-1 routes: officialPathToHostRoute maps the official pathnames back to host routes', async () => {
  await load();
  const calls = [];
  const actions = Object.fromEntries(['openSurface', 'openRoutines', 'openSection', 'openSettings', 'showSessionsPage'].map((k) => [k, (...a) => calls.push([k, ...a])]));
  const go = (p, mode = 'code') => NavHost.officialPathToHostRoute(p, actions, { mode });
  assert.equal(go('/epitaxy'), true); assert.equal(go('/epitaxy/abc%20d'), true); assert.equal(go('/new', 'chat'), true); assert.equal(go('/chat/x1', 'chat'), true);
  assert.equal(go('/code/routines'), true); assert.equal(go('/code/routines/r1'), true); assert.equal(go('/epitaxy/scheduled'), true); assert.equal(go('/scheduled-task', 'chat'), true);
  assert.equal(go('/customize'), true); assert.equal(go('/projects', 'chat'), true); assert.equal(go('/artifacts', 'chat'), true); assert.equal(go('/code/artifacts'), true);
  assert.equal(go('/chats', 'chat'), true); assert.equal(go('/security'), false);
  assert.deepEqual(calls, [['openSurface', 'code', null], ['openSurface', 'code', 'abc d'], ['openSurface', 'chat', null], ['openSurface', 'chat', 'x1'],
    ['openRoutines', null], ['openRoutines', 'r1'], ['openRoutines', null], ['openRoutines', null],
    ['openSettings', 'customize-skills'], ['openSection', 'projects'], ['openSection', 'artifacts'], ['openSection', 'artifacts'], ['showSessionsPage', 'chat']]);
  // officialPathname round-trips through it for the host's own routes.
  for (const route of [{ mode: 'code' }, { mode: 'code', current: 's1' }, { mode: 'chat' }, { mode: 'chat', current: 'c1' }, { mode: 'code', section: 'routines', routineId: 'r2' }])
    assert.equal(go(NavHost.officialPathname(route), route.mode), true, JSON.stringify(route));
});

// round4 wave8b sidebar (W8A-6 host side): the LocalSessions bridge answers as the official LocalSessionManager
// (asar index.chunk-CqaSnEfn.js): getSessionList waits for the manager's initialization (main.jsx's list loaded) and carries
// the manager's loadGeneration, not one per call; the manager's events reach the sliced shared-8 store through onOnEvent
// ("initialized" when the list loads or loses rows, session_updated / archived / unarchived per record). Before, the bridge
// answered the empty pre-load list at once and had no onOnEvent, so the store's single boot read (ky) kept it empty.
test('LocalSessions: getSessionList waits for the loaded list; events follow main.jsx\'s list (official manager shape)', async () => {
  await load();
  const bridge = NavHost.HOST_ANSWERS.LocalSessions[1];
  assert.equal(NavHost.HOST_ANSWERS.LocalSessions[0], 'host');
  for (const member of ['getAll', 'getSessionList', 'getSession', 'onOnEvent']) assert.equal(typeof bridge[member], 'function', member);
  const record = (id, title, extra = {}) => NavHost.officialLocalSession({ id, cwd: '/fixture', name: title, createdAt: 1700000000, updatedAt: 1700000100, ...extra });
  const host = (state, localSessions) => { renderToStaticMarkup(el(NavHost.FrameSidebarNavHost, { value: { ...navValue('code'), localSessionsState: state, localSessions } }, null));
    return { ...navValue('code'), localSessionsState: state, localSessions }; };
  const events = [];
  const off = bridge.onOnEvent((event) => events.push(event));
  host('loading', []);
  let settled = null;
  const list = bridge.getSessionList().then((value) => (settled = value));
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(settled, null, 'getSessionList must wait for the manager initialization');
  const a = record('fx-a', 'Fixture A'), b = record('fx-b', 'Fixture B');
  NavHost.syncLocalSessions(host('loaded', [a, b]));
  await list;
  assert.deepEqual(settled.sessions.map((s) => s.sessionId), ['fx-a', 'fx-b']);
  assert.equal(settled.archivedPending, false);
  assert.deepEqual(events, [{ type: 'initialized', sessionId: '', loadGeneration: settled.loadGeneration }]);
  assert.equal((await bridge.getSessionList()).loadGeneration, settled.loadGeneration, 'one generation per load, not per call');
  assert.deepEqual((await bridge.getAll()).map((s) => s.sessionId), ['fx-a', 'fx-b']);
  assert.equal((await bridge.getSession('fx-b')).title, 'Fixture B');
  events.length = 0;
  NavHost.syncLocalSessions(host('loaded', [a, b])); // the same list again: no event
  assert.deepEqual(events, []);
  const renamed = record('fx-a', 'Fixture A2');
  NavHost.syncLocalSessions(host('loaded', [renamed, b]));
  assert.deepEqual(events, [{ type: 'session_updated', sessionId: 'fx-a', session: renamed }]);
  events.length = 0;
  const archived = { ...b, isArchived: true };
  NavHost.syncLocalSessions(host('loaded', [renamed, archived]));
  assert.deepEqual(events, [{ type: 'archived', sessionId: 'fx-b' }]);
  events.length = 0;
  NavHost.syncLocalSessions(host('loaded', [renamed, b]));
  assert.deepEqual(events, [{ type: 'unarchived', sessionId: 'fx-b', session: b }]);
  events.length = 0;
  NavHost.syncLocalSessions(host('loaded', [b])); // a row gone (delete or core switch): a reload, not the "deleted" tombstone
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'initialized');
  assert.ok(events[0].loadGeneration > settled.loadGeneration);
  assert.deepEqual((await bridge.getSessionList()).sessions.map((s) => s.sessionId), ['fx-b']);
  off();
  NavHost.syncLocalSessions(host('loaded', [b, a]));
  assert.equal(events.length, 1, 'an unsubscribed listener gets nothing');
  // main.jsx passes the Code sessions in every mode with their load state
  const main = read('src/main.jsx');
  assert.match(main, /localSessions: navLocalSessions,/);
  assert.match(main, /localSessionsState: sessionsLoaded \? "loaded" : initSettled && !loading \? "failed" : "loading",/);
  assert.match(main, /const navLocalSessions = useMemo\(\(\) => codeSessions\.map\(\(session\) => officialLocalSession\(session, sessionMetadata\[session\.id\], officialSessionLive\(session, \{ active: state\.active, approvals: state\.approvals, threadParents: state\.threadParents \}\)\)\),\n    \[codeSessions, sessionMetadata, state\.active, state\.approvals, state\.threadParents\]\);/);
});

// The row's status dot (shared-57 lC → shared-20 hN → SidebarStatusGlyph: .status-dot 6px, muted while running, warning while
// awaiting, accent when unread, nothing when idle) reads the record's isRunning / pendingToolPermissions (shared-39 dp / mp)
// and the official unread store (cds-core shared-8 Y_). The host fills them from the engine state and the session metadata.
test('session status: running, awaiting and unread reach the official record and unread store', async () => {
  await load();
  const session = { id: 's-1', cwd: '/fixture', name: 'One', createdAt: 1700000000, updatedAt: 1700000100 };
  const live = (state) => NavHost.officialSessionLive(session, state);
  assert.deepEqual(live({}), { running: false, pendingToolPermissions: undefined });
  assert.equal(live({ active: { 's-1': true } }).running, true);
  assert.equal(NavHost.officialSessionLive({ ...session, status: { type: 'active' } }, {}).running, true);
  assert.equal(live({ active: { 's-2': true } }).running, false);
  // An approval counts for the session that owns its thread (a sub-agent's for its parent); the list keeps its identity.
  const waiting = { active: { 's-1': true }, approvals: [{ id: 7, params: { threadId: 'child' } }, { id: 8, params: { threadId: 's-2' } }], threadParents: { child: 's-1' } };
  const first = live(waiting).pendingToolPermissions;
  assert.deepEqual(first, [{ requestId: '7' }]);
  assert.equal(live({ ...waiting }).pendingToolPermissions, first);
  assert.equal(live({ active: { 's-1': true }, approvals: [] }).pendingToolPermissions, undefined);
  // The official record: shared-39 dp reads isRunning, mp reads pendingToolPermissions.
  const idle = NavHost.officialLocalSession(session), running = NavHost.officialLocalSession(session, {}, live({ active: { 's-1': true } })), awaiting = NavHost.officialLocalSession(session, {}, live(waiting));
  assert.equal(idle.isRunning, false); assert.equal(idle.pendingToolPermissions, undefined);
  assert.equal(running.isRunning, true); assert.equal(running.turnRunning, true);
  assert.deepEqual(awaiting.pendingToolPermissions, [{ requestId: '7' }]);
  assert.match(read('src/generated/frame-sidebar-nav/shared-39.mjs'), /function dp\(e\) \{\n  return mp\(e\)\n    \? "requires_action"\n    : e\.isRunning \|\| e\.starting \|\| e\.awaitingBrief\n      \? "running"\n      : "idle";/);
  // Unread: the host's metadata is mirrored into the official store; a change made in the store is written back.
  const { store_shared8_Y_: unread } = await server.ssrLoadModule('/src/cds-core.mjs'); // the instance the host module links
  const writes = [];
  renderToStaticMarkup(el(NavHost.FrameSidebarNavHost, { value: { ...navValue('code'), updateSessionMetadata: (...args) => { writes.push(args); } } }, null));
  NavHost.syncUnread({ 's-1': { unread: true }, 's-2': { unread: true, explicitUnread: true }, 's-3': { unread: false } });
  assert.deepEqual(unread.getState().unreadIds, ['s-1', 's-2']);
  assert.deepEqual(unread.getState().explicitUnreadIds, ['s-2']);
  assert.deepEqual(writes, [], 'mirroring does not write back');
  unread.getState().markRead('s-1');
  unread.getState().markUnreadExplicit('s-3');
  unread.getState().markUnread('s-4');
  assert.deepEqual(writes, [['s-1', { unread: false }, undefined], ['s-3', { unread: true }, { automatic: false }], ['s-4', { unread: true }, { automatic: true }]]);
  NavHost.syncUnread({});
  assert.deepEqual(unread.getState().unreadIds, []);
  const main = read('src/main.jsx');
  assert.match(main, /sessionMetadata, updateSessionMetadata,\n/);
});

// round-4 wave 8c sidebar lane: a Code session row (shared-57 Ok) pushes `/epitaxy/${id}` through the reused router boundary;
// frame-sidebar-nav-body.jsx hands frame-sidebar-host.jsx this host's navigation, which answers whether main.jsx routed it.
test('session row route: the frame router reaches main.jsx through navigateOfficialPathname', async () => {
  await load();
  const seen = [];
  renderToStaticMarkup(el(NavHost.FrameSidebarNavHost, { value: { ...navValue('code'), navigateOfficial: (p) => (seen.push(p), p !== '/security') } }, null));
  FrameHost.HOST_ANSWERS.useRouter[1]().push('/epitaxy/fx-row');
  assert.deepEqual(seen, ['/epitaxy/fx-row']);
  assert.equal(NavHost.navigateOfficialPathname('/security'), false);
  assert.throws(() => FrameHost.HOST_ANSWERS.useRouter[1]().push('/security'), /the host has no route/);
  assert.match(read('src/frame-sidebar-nav-body.jsx'), /provideOfficialNavigation\(navigateOfficialPathname\);/);
  assert.match(read('src/main.jsx'), /navigateOfficial: \(pathname\) => \{ const routed = officialPathToHostRoute\(pathname, sidebarNavRoutes, \{ mode \}\); if \(!routed\) console\.warn\(`frame-sidebar-nav: no host route for \$\{pathname\}`\); return routed; \},/);
});

// round-4 wave 8c sidebar lane, Scheduled row: shared-21 qN shows "scheduled" when shared-31 Om().codeEnabled, which needs the
// official appFeatures (shared-123 lR `a = q()`; null keeps lR loading on the desktop). The official app root mounts shared-23 KA
// (Cc = shared-92 Uv: AppFeatures.getSupportedFeatures → app store appFeatures, re-read on onSupportedFeaturesChanged); it is a
// pinned root of this graph, mounted under the nav host. Runtime probe: round4/wave8c/sidebar/logs (gui-probe2 before, gui-probe3 after).
test('Scheduled gate: AppFeaturesBootstrap is the official shared-23 KA, mounted under the nav host; the bridge notifies changes', async () => {
  assert.deepEqual([pins.roots.AppFeaturesBootstrap.file, pins.roots.AppFeaturesBootstrap.local, pins.roots.AppFeaturesBootstrap.declarationSha256],
    ['shared-23-BRmsPtuN.js', 'KA', '27ad7e5fba02edeed9ec1c67804001a3cb0b5e3ff49d7d20b2537891d5c2a257']);
  assert.equal(read('src/generated/frame-sidebar-nav/shared-23.mjs').split('\n').slice(2).join('\n'),
    'import { Uv as Cc } from "./shared-92.mjs";\nfunction KA() {\n  return (Cc(), null);\n}\nexport { KA as AppFeaturesBootstrap };\n');
  const s92 = read('src/generated/frame-sidebar-nav/shared-92.mjs');
  assert.match(s92, /Wr\.getSupportedFeatures\(\)\.then\(/);
  assert.match(s92, /appFeatures: t,\s+resolution: "answered",/);
  assert.match(read('src/frame-sidebar-nav-body.jsx'), /<FrameSidebarNavHost value=\{value\}><AppFeaturesBootstrap \/><PerformanceMetricsProvider>/);
  assert.match(read('src/frame-sidebar-nav-adapter.mjs'), /get onSupportedFeaturesChanged\(\) \{ return cap\("AppFeatures"\)\["onSupportedFeaturesChanged"\]; \}/);
  await load();
  const bridge = NavHost.HOST_ANSWERS.AppFeatures[1];
  const features = { chillingSlothEnterprise: { status: 'supported' } };
  renderToStaticMarkup(el(NavHost.FrameSidebarNavHost, { value: { ...navValue('code'), supportedFeatures: features } }, null));
  assert.deepEqual(await bridge.getSupportedFeatures(), features);
  let changed = 0;
  const off = bridge.onSupportedFeaturesChanged(() => { changed += 1; });
  NavHost.syncSupportedFeatures(features); // the first committed answer: the resolver reads it itself
  NavHost.syncSupportedFeatures({ ...features }); // the same answer again: no event
  assert.equal(changed, 0);
  NavHost.syncSupportedFeatures({ ...features, btwChildSessions: { status: 'supported' } }); // the core connected
  assert.equal(changed, 1);
  off();
  NavHost.syncSupportedFeatures(features);
  assert.equal(changed, 1, 'an unsubscribed listener gets nothing');
});

// round-4 wave 8c sidebar lane: CCDScheduledTasks is the host's app-level local scheduler (source-sidebar-routines.jsx
// connectSidebarRoutines → code-routine-model.mjs createCodeRoutinesBridge); a member exists only when that bridge has it, so the
// official canList (cds-core shared-31 Qf `!!t?.getAllScheduledTasks`) and shared-57 Xy hasCodeRoutines read the host's facts.
test('CCDScheduledTasks: members follow the app-level scheduler bridge (absent before it connects)', async () => {
  await load();
  const bridge = NavHost.HOST_ANSWERS.CCDScheduledTasks[1];
  assert.equal(NavHost.HOST_ANSWERS.CCDScheduledTasks[0], 'host');
  const Routines = await server.ssrLoadModule('/src/source-sidebar-routines-adapters.jsx');
  Routines.sidebarRoutinesStore.reset();
  assert.equal(bridge.getAllScheduledTasks, undefined, 'no scheduler connected: canList false (the official absent member)');
  const tasks = [{ id: 'fx-task', enabled: true }];
  Routines.sidebarRoutinesStore.setState({ bridge: { getAllScheduledTasks: async () => tasks, updateScheduledTaskStatus: async () => true, onOnScheduledTaskEvent: () => () => {} } });
  assert.deepEqual(await bridge.getAllScheduledTasks(), tasks);
  assert.equal(await bridge.updateScheduledTaskStatus('fx-task', 'disabled'), true);
  assert.equal(bridge.createScheduledTask, undefined, 'a member the connected bridge lacks stays absent');
  for (const m of ['getAllScheduledTasks', 'updateScheduledTask']) assert.match(read('src/frame-sidebar-nav-adapter.mjs'), new RegExp(`get ${m}\\(\\) \\{ return cap\\("CCDScheduledTasks"\\)`));
  Routines.sidebarRoutinesStore.reset();
});
