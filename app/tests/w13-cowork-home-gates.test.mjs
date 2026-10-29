import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-home-gates (cwui-07 / cwui-08): the gate stand-ins src/source-cowork-home-v3-adapters.jsx gives the
// generated 3.6556.2 home (shared-78 hT / QJ / GT / FC, shared-130 JO, shared-5 kw, shared-21 yT, shared-156 pU,
// ce266b9be Oe / ke / Ae), each checked against what the official desktop answers for a user without an admin policy,
// GrowthBook or a claude.ai account. Source only: official text features (renderer chunks and the asar main process),
// the adapter values, and SSR of the generated Ideas list.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const v1 = name => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
const asar = name => fs.readFileSync(path.join(snapshot, 'asar/.vite/build', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const once = (source, feature, label) => assert.equal(source.split(feature).length - 1, 1, `${label}: ${feature}`);

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-home/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-cowork-home-v3-adapters.jsx');
  await adapters.preloadHomeIdeas();
});
after(() => server?.close());

const home = element => h(adapters.CoworkHomeV3Context.Provider, { value: { surface: 'cowork', rows: [], readState: { initializedAt: 0, sessions: {} },
  ready: true, attentionIds: new Set(), permissions: new Map(), scheduledTasks: [], sidebarCollapsed: false, ideas: null } }, element);

test('cwui-07: the official desktop answers desktopHome "unavailable" unless an admin desktopHome policy grants a surface', () => {
  const main = asar('index.chunk-jPKPzV-P.js');
  // The appFeatures entry the renderer's hT reads.
  once(main, 'desktopHome:RMe(K())===void 0?{status:"unavailable"}:RU', 'main process desktopHome feature');
  once(main, 'var RU={status:"supported"}', 'RU');
  // RMe is the surface grant of the chatSurface policy fields that carry surfaceGrants (desktopHome is one).
  once(main, 'function RMe(e){return LMe(e)?.grant}', 'RMe');
  once(main, 'function LMe(e){let t=e.chatSurface??{};for(let e of IMe){let n=sTe(e.grants,t[e.key]);if(n)return{field:e,grant:n}}}', 'LMe');
  // An unset value gives no grant, so no policy means "unavailable".
  once(main, 'function sTe(e,t){if(t!=null&&t!=="")return(typeof t=="string"&&Object.hasOwn(e,t)?e[t]:void 0)??oTe}', 'sTe');
  // The policy is a 3p (admin) / self-hosted setting, not a default.
  once(main, 'desktopHome:U(Gn(["standard","simple","no-vm","off"]).optional(),{flatKey:"desktopHome",support:{enabled:{scopes:["3p"]', 'desktopHome policy');
  // The renderer gate and what it changes in the Ideas list (label and the hover surface badge).
  const s78 = v1('shared-78-D5Fw2h0a.js');
  once(s78, 'function hT(){return K()?.desktopHome?.status==="supported"}', 'shared-78 hT');
  const ideas = v1('ce266b9be-B5g-KDni.js');
  assert.ok(ideas.includes('defaultMessage:"Customize Claude for me",id:"D77R0VtWBc"'));
  assert.ok(ideas.includes('defaultMessage:"Customize Cowork for me",id:"6vxCyHtxqT"'));
  // Locally: no such policy (no 3p config, no session host), so the official answer is false.
  assert.equal(adapters.useDesktopHomeSupported(), false);
});

test('cwui-08: server gates and the browser-tools preference are loaded states the official desktop reaches (true)', () => {
  const s78 = v1('shared-78-D5Fw2h0a.js');
  once(s78, 'function QJ(){let{serverGateNames:e}=hr(),t=Ci($J);return e&&e.length>0?!0:t}', 'shared-78 QJ');
  once(s78, 'function $J(e){return e.isLoaded}', 'shared-78 $J');
  once(s78, 'FC=NC.useIsInitialized', 'shared-78 FC');
  once(s78, 'NC=MC("coworkBrowserToolsEnabled",!0)', 'shared-78 NC');
  // MC initializes without a bridge preference store, or once the bridge answers.
  assert.ok(s78.includes(':e._setInitialized()'));
  assert.ok(s78.includes('_hydrate:(t,n)=>e({isEnabled:t,hydratedEnabled:t,isInitialized:!0,hasKey:n,loadAttempted:!0})'));
  assert.equal(adapters.useHomeServerGates(), true);
  assert.equal(adapters.useHomeBrowserInitialized(), true);
  // Where the generated Ideas list reads them: QJ only through `ae`, which matters with chalk_teacher (S) on; FC only
  // next to GT (`ue && de`), which is off. So the loaded answers change nothing visible here.
  const out = local('src/generated/cowork-home/ce266b9be-B5g-KDni.mjs');
  for (const feature of ['ae = !te && ie,', '} = Fe(S && (b || !ae)),', 'let qe = x === void 0 || (S && !ae),', 'xe = (ue && de) || (w && (ge || (ve && ye === !0))),'])
    assert.equal(out.split(feature).length - 1, 1, feature);
});

test('cwui-08: browser pairing, browser ideas, remote devices, plugins in chat, chalk and remote Cowork stay off (official defaults)', () => {
  const s78 = v1('shared-78-D5Fw2h0a.js');
  // GT needs appFeatures.coworkBrowser "supported", which the main process ties to GrowthBook gate 3990395613.
  assert.ok(s78.includes('return!t||!Sn||n?!1:e?.coworkBrowser?.status==="supported"'));
  const main = asar('index.chunk-jPKPzV-P.js');
  once(main, 'function WFr(){return dP()?{status:"supported"}', 'main process coworkBrowser');
  once(main, 'function dP(){return cP()?Pb("3990395613"):!1}', 'coworkBrowser gate');
  // Oe (browser ideas): the chrome_ext_mcp_integration gate and the account's claude_browser_extension feature.
  assert.ok(s78.includes('O("chrome_ext_mcp_integration")'));
  assert.ok(s78.includes('V("claude_browser_extension")'));
  const ideas = v1('ce266b9be-B5g-KDni.js');
  once(ideas, 'return!e||t?!1:n?r&&i:a&&!o&&!s', 'ce266b9be Oe');
  // ke: the account's remote devices.
  assert.ok(ideas.includes('C(i.data.devices).length>0'));
  // The chips experiment's default arm, and the control arm ignores browserAvailable entirely.
  once(ideas, 'P="claudified_cowork_home_chips"', 'chips experiment');
  assert.ok(ideas.includes('d(P,"variant","control",j,e)'));
  once(ideas, 'h=p?a:s!=="control"', 'Me needsCatalog');
  assert.ok(local('src/generated/cowork-home/ce266b9be-B5g-KDni.mjs').includes('h = p ? a : s !== "control",'));
  // GrowthBook gates (no client here: their defaults).
  assert.ok(v1('shared-130-dWztbTO1.js').includes('Me("claude_ai_plugins_in_chat")'));
  assert.ok(v1('shared-21-R7LldJ05.js').includes('Xs("proj-chalk-sidebar")'));
  assert.ok(v1('shared-156-BLTosN8U.js').includes('return at("chalk_teacher")'));
  // shared-5 kw: a remote Cowork session not on this device (there are only local sessions).
  assert.ok(v1('shared-5-Bg6ZMqvt.js').includes('let{isRemoteCoworkSession:e}=Pl(),{onThisDevice:t}=Ur();return!t&&e'));
  for (const name of ['useHomeBrowserPaired', 'useHomeBrowserIdeas', 'useHomePluginsInChat', 'useHomeRemoteCoworkSession', 'useHomeChalkSidebar', 'useHomeChalkTeacher'])
    assert.equal(adapters[name](), false, name);
  assert.equal(adapters.useHomeBrowserDevices(true), false);
  assert.equal(adapters.useHomeChipsVariant(true), 'control');
});

test('the adapter table still feature-checks every gate it replaces', () => {
  const extractor = local('scripts/extract-cowork-home.mjs');
  for (const [original, name] of [['hT', 'useDesktopHomeSupported'], ['QJ', 'useHomeServerGates'], ['GT', 'useHomeBrowserPaired'], ['FC', 'useHomeBrowserInitialized'],
    ['JO', 'useHomePluginsInChat'], ['kw', 'useHomeRemoteCoworkSession'], ['yT', 'useHomeChalkSidebar'], ['pU', 'useHomeChalkTeacher'],
    ['Oe', 'useHomeBrowserIdeas'], ['ke', 'useHomeBrowserDevices'], ['Ae', 'useHomeChipsVariant']])
    assert.match(extractor, new RegExp(`\\b${original.replace('$', '\\$')}: \\{ name: '${name}'`), `${original} -> ${name}`);
  const manifest = JSON.parse(local('src/generated/cowork-home/manifest.json'));
  const adapted = new Map(manifest.adapters.map(a => [a.original, a.name]));
  assert.equal(adapted.get('shared-78-D5Fw2h0a.js#hT'), 'useDesktopHomeSupported');
  assert.equal(adapted.get('shared-78-D5Fw2h0a.js#QJ'), 'useHomeServerGates');
  assert.equal(adapted.get('shared-78-D5Fw2h0a.js#GT'), 'useHomeBrowserPaired');
  assert.equal(adapted.get('shared-78-D5Fw2h0a.js#FC'), 'useHomeBrowserInitialized');
});

test('SSR: the desktop Ideas list (control arm, no desktopHome policy) is the official one', () => {
  const html = renderToStaticMarkup(home(h(gen.ChorusCoworkSuggestions, { standalone: true })));
  const shown = text(html);
  assert.match(shown, /^Ideas for you Send me a daily briefing Cowork Organize my inbox Cowork Customize Cowork for me Cowork$/);
  assert.doesNotMatch(shown, /Customize Claude for me/);
  // The hover surface badge (rendered while desktopHome is not "supported") and the standalone row padding.
  assert.equal(html.split('relative flex items-center gap-1.5').length - 1, 3);
  assert.equal(html.split('group relative flex w-full items-center gap-4 rounded-lg text-start hover:bg-fill-ghost-hover py-2 ps-5 pe-2').length - 1, 3);
  // The gates set to their loaded state change nothing visible: the same list the cowork home's empty fallback shows.
  assert.ok(text(renderToStaticMarkup(home(h(gen.CoworkHome)))).endsWith(shown));
});
