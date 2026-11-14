// settings-desktop-v4 (4.16336.0, scripts/extract-settings-desktop-v4.mjs): the official Settings › Desktop page
// (c71860c77-B4INzBZs default Vs › xs) generated over the cds-core shared graph with settings-nav linked, its bytes against
// the manifest and pins, D1 (the stock desktop-prefs store, Browser use's zustand store, the local sessions store, the
// react-intl provider and the ancient-journal writer are cut, never sliced; the settings modal store is settings-nav's
// one copy), the adapter's fail-loud contract and its bridges over the host value, the host server render of the
// official skeleton (xs before AppFeatures settles), and SourceSettings' System page wiring. Fixture data only.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
require('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = path.join(app, 'src/generated/settings-desktop-v4');
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const pins = JSON.parse(fs.readFileSync(path.join(app, 'scripts/settings-desktop-v4-pins.json'), 'utf8'));
let page, adapter, core, shell, query, routes;
before(async () => {
  page = await import('../src/generated/settings-desktop-v4/desktop-page.mjs');
  adapter = await import('../src/settings-desktop-adapter.mjs');
  core = await import('../src/generated/cds-core/shared-frame.mjs');
  shell = await import('../src/settings-shell-model.mjs');
  query = await import('../src/generated/files-changes-v4/file-browser-query.mjs');
  routes = await import('../src/settings-routes-desktop.mjs');
});

const FixtureStorage = ({ onClose }) => h('div', { 'data-fixture-storage': '', onClick: onClose });
const FixtureSites = ({ isOpen }) => h('div', { 'data-fixture-sites': String(isOpen) });
const host = (patch = {}) => ({ account: adapter.desktopPageAccount(shell.LOCAL_PROFILE_ACCOUNT), version: '0.3.0-fixture', runOnStartup: false, setRunOnStartup: async v => v,
  menuBarEnabled: true, setMenuBarEnabled: async () => undefined, storage: { call: async () => ({}), settingsRoot: { current: null }, Dialog: FixtureStorage },
  errors: { addError() {}, addSuccess() {} }, allowedSites: { call: async () => null, Dialog: FixtureSites }, ...patch });
const render = (value = host(), node = h(page.DesktopSettingsPage)) => renderToStaticMarkup(h(core.CdsRoot, {}, h(query.QueryClientProvider, { client: new query.QueryClient() }, h(adapter.SettingsDesktopHostProvider, { value }, node))));

test('generated graph: every module equals its manifest hash; 4.16336.0; cds-core shared graph, settings-nav linked; pins match', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  // settings-pages-v4's shared-26 module linked for DF / EF (wave 8s real tree: cds-core does not publish them, settings-pages-v4 owns them)
  assert.deepEqual(manifest.linkedAreas, ['settings-nav', { area: 'settings-pages-v4', modules: ['shared-26.mjs'] }]);
  assert.equal(manifest.modules.length, 51);
  for (const m of manifest.modules) assert.equal(sha(fs.readFileSync(path.join(out, m.target))), m.sha256, m.target);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), pins.cdsCore.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/settings-nav/manifest.json'))), pins.settingsNav.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/settings-pages-v4/manifest.json'))), pins.settingsPages.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/settings-desktop-adapter.mjs'))), pins.hostAdapterSha256);
  assert.deepEqual(Object.entries(pins.roots).map(([name, r]) => `${name}=${r.file}#${r.local}`), ['DesktopSettingsPage=c71860c77-B4INzBZs.js#Vs']);
  assert.match(fs.readFileSync(path.join(out, 'desktop-page.mjs'), 'utf8'), /^export \{[^}]*\bVs as DesktopSettingsPage\b[^}]*\};$/m);
});

test('D1: held-elsewhere state is cut, never sliced; the settings modal store is the settings-nav copy', () => {
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const key of ['shared-183-B2N6Zy4J.js#yg', 'shared-183-B2N6Zy4J.js#X', 'shared-25-D-aF0gt9.js#Uy', 'shared-25-D-aF0gt9.js#Vy', 'shared-25-D-aF0gt9.js#Dz',
    'vendor-intl-BJgYK7RA.js#F', 'shared-123-1Hc1RTKl.js#_x'])
    assert.equal(sliced.has(key), false, key);
  assert.equal(manifest.modules.some(m => m.source === 'c6673aecb-B-t_VQzj.js'), false, 'the stock desktop prefs store chunk is not entered');
  // The GrowthBook provider reader (vendor-flags Ht, throws without a GrowthBookProvider) is not entered: shared-25 Go / is /
  // go are cut to the host table.
  assert.equal(manifest.modules.some(m => m.source === 'vendor-flags-BSWGVdqu.js'), false, 'vendor-flags Ht not sliced');
  for (const key of ['shared-25-D-aF0gt9.js#Go', 'shared-25-D-aF0gt9.js#is', 'shared-25-D-aF0gt9.js#go', 'shared-25-D-aF0gt9.js#sd', 'shared-25-D-aF0gt9.js#ts'])
    assert.equal(sliced.has(key), false, key);
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked'));
  assert.ok(linked.some(i => i.from === '../settings-nav/settings-store.mjs' && i.name === 'settingsModalStore'), 'yg from settings-nav');
  // shared-26 DF (getSystemInfo once per window) and its cache EF are settings-pages-v4's (it cuts the DesktopInfo preload read
  // shared-25 Hi): linked from that one module, never sliced here, and the preload read is not sliced either.
  for (const key of ['shared-26-B-POtn5S.js#DF', 'shared-26-B-POtn5S.js#EF', 'shared-25-D-aF0gt9.js#Hi']) assert.equal(sliced.has(key), false, key);
  assert.ok(linked.some(i => i.from === '../settings-pages-v4/shared-26.mjs' && i.name === 'DF'), 'DF from settings-pages-v4');
  // No module assigns a binding it imports from cds-core (W7-D1 write integrity) — the cut Mo (shared-25 Uy) is the one
  // official writer of cds-core's Vy on this page.
  assert.equal(manifest.modules.some(m => m.source === 'shared-25-D-aF0gt9.js' && m.bindings.some(b => b.name === 'Uy')), false);
});

test('adapter: one export per pinned cut, unreachable cuts throw, a missing or incomplete host value throws', () => {
  const cuts = Object.entries(pins.cuts);
  assert.equal(cuts.length, 28);
  for (const [name] of cuts) assert.ok(name in adapter, name);
  const adapterImports = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const name of adapterImports) assert.ok(name in adapter, name);
  assert.deepEqual(cuts.filter(([, c]) => c.unreachable).map(([n]) => n).sort(), ['AncientJournalNotice', 'BrowserUseSection', 'EffortControlSlot', 'IntlProviderOverlay', 'StockDesktopPrefSetting']);
  for (const [name, c] of cuts) if (c.unreachable) assert.throws(() => adapter[name]({}), /unreachable on the desktop page/, name);
  assert.throws(() => renderToStaticMarkup(h(page.DesktopSettingsPage)), /SettingsDesktopHostProvider/);
  const { errors, ...noErrors } = host();
  assert.throws(() => render(noErrors), /does not answer errors/);
  assert.throws(() => render(host({ setRunOnStartup: true })), /setters must be functions/);
  assert.throws(() => render(host({ storage: { call: null } })), /storage must be/);
  // The official no-organization encoding is undefined (shared-123 bC `r !== void 0`, c71860c77 Un `e === void 0`).
  assert.throws(() => render(host({ account: shell.LOCAL_PROFILE_ACCOUNT })), /no organization = undefined activeOrganization/);
  assert.equal(adapter.desktopPageAccount(shell.LOCAL_PROFILE_ACCOUNT).activeOrganization, undefined);
  assert.equal(adapter.desktopPageAccount(shell.LOCAL_PROFILE_ACCOUNT).account, shell.LOCAL_PROFILE_ACCOUNT.account);
});

test('official skeleton (xs before AppFeatures settles): main.flex flex-col › System group, three skeleton rows', () => {
  const html = render();
  assert.match(html, /^<div class="cds-root[^"]*"[^>]*><main class="flex flex-col"><section data-settings-section-titled="" class="mb-xl last:mb-0 ">/);
  assert.match(html, /<h3 data-settings-group-title="" class="text-heading-semibold text-primary settings-row-title self-start outline-none">System<\/h3>/);
  assert.equal([...html.matchAll(/<div data-cds="Skeleton" role="status"[^>]*h-6 w-10 rounded-full"/g)].length, 3);
  assert.equal([...html.matchAll(/h-5 w-36"/g)].length, 3);
  // Io reads the version through shared-25 Ti (`xi()` false while server rendering): no version row in the server markup.
  assert.doesNotMatch(html, /Desktop app version/);
  // Browser use / Computer use / Extensions are not in the skeleton (and are closed branches on this host).
  assert.doesNotMatch(html, /Browser use|Computer use|Extensions/);
});

test('Startup bridge: reads wait for the desktop snapshot; writes go to the host setters', async () => {
  const writes = [];
  render(host({ runOnStartup: null }));
  let settled = false;
  const pending = adapter.hostStartup.isStartupOnLoginEnabled().then(v => { settled = true; return v; });
  await new Promise(r => setTimeout(r, 5));
  assert.equal(settled, false, 'null runOnStartup (snapshot loading) holds the read');
  render(host({ runOnStartup: true, setRunOnStartup: async v => { writes.push(['startup', v]); return v; }, menuBarEnabled: false, setMenuBarEnabled: async v => { writes.push(['menu', v]); } }));
  assert.equal(await pending, true);
  assert.equal(await adapter.hostStartup.isMenuBarEnabled(), false);
  assert.equal(await adapter.hostStartup.setStartupOnLoginEnabled(true), true);
  await adapter.hostStartup.setMenuBarEnabled(true);
  assert.deepEqual(writes, [['startup', true], ['menu', true]]);
  assert.equal(adapter.desktopAppVersion(), '0.3.0-fixture');
});

test('AppFeatures / GlobalShortcut / AppPreferences / GrowthBook answers', async () => {
  const features = await adapter.hostAppFeatures.getSupportedFeatures();
  assert.deepEqual(features.nativeQuickEntry, { status: 'unavailable' });
  assert.deepEqual(features.quickEntryDictation, { status: 'unavailable' });
  assert.deepEqual(features.quickEntryGlobalShortcut, { status: 'unsupported' });
  assert.deepEqual(features.trayIcon, { status: 'supported' });
  assert.equal(await adapter.hostGlobalShortcut.getGlobalShortcut(), '');
  await assert.rejects(adapter.hostGlobalShortcut.setGlobalShortcut('Alt+Space'), /no Quick Entry shortcut/);
  const prefs = await adapter.hostAppPreferences.getPreferences();
  assert.deepEqual(Object.keys(prefs).filter(k => k !== 'keepAwakeEnabled'), []);
  await assert.rejects(adapter.hostAppPreferences.setPreference('quickEntryShortcut', 'off'), /keeps no desktop preference quickEntryShortcut/);
  const unsubscribe = adapter.hostAppPreferences.onPreferencesChanged(() => {});
  assert.equal(typeof unsubscribe, 'function');
  unsubscribe();
  assert.deepEqual(adapter.useGrowthBookFeature('__gb__never_listed_fixture'), { value: null, on: false, off: true, source: 'unknownFeature' });
  assert.equal(adapter.useGrowthBookFeatureValue('__gb__never_listed_fixture'), undefined);
  const fallback = { fixture: true };
  assert.equal(adapter.useDynamicConfig('yukon_silver_config', fallback), fallback);
  assert.equal(adapter.useSearchParams().toString(), '');
  assert.equal(adapter.useSearchParams(), adapter.useSearchParams(), 'one stable value');
  assert.equal(adapter.useDispatchAllowed(), false);
  assert.deepEqual(adapter.useAppConfiguration(), {});
});

test('host dialogs: the official Storage dialog and Allowed sites modal render the host components', () => {
  const closed = [];
  const html = render(host(), h(adapter.StorageDialog, { open: true, onOpenChange: v => closed.push(v) }));
  assert.match(html, /data-fixture-storage=""/);
  assert.doesNotMatch(render(host(), h(adapter.StorageDialog, { open: false, onOpenChange() {} })), /data-fixture-storage/);
  assert.match(render(host(), h(adapter.PreviewAllowedSitesModal, { isOpen: true, onClose() {} })), /data-fixture-sites="true"/);
  assert.throws(() => render(host({ allowedSites: null }), h(adapter.PreviewAllowedSitesModal, { isOpen: true, onClose() {} })), /needs the host allowedSites/);
});

test('routes seam and SourceSettings wiring: desktop → official page on the System tab; closed branches listed', () => {
  assert.equal(routes.DESKTOP_SETTINGS_ROUTES.desktop.hostTab, 'general');
  assert.equal(routes.DESKTOP_SETTINGS_ROUTES.desktop.official, 'c71860c77-B4INzBZs.js#Vs');
  assert.deepEqual(routes.DESKTOP_SETTINGS_CLOSED, ['desktop/extensions', 'desktop/extensions/advanced', 'desktop/extensions/manage-directory', 'desktop/extensions/$extensionId', 'desktop/browser-extensions']);
  const settings = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.match(settings, /\{tab:'general',title:'System',official:DESKTOP_PAGE_GROUP,/);
  assert.match(settings, /group\.official===DESKTOP_PAGE_GROUP\?<CdsLayerProvider [^>]*base=\{500\}><SettingsDesktopPage /);
  assert.match(settings, /desktopCall\('desktop-startup',\{enabled\}\)/);
  const wrapper = fs.readFileSync(path.join(app, 'src/source-settings-desktop.jsx'), 'utf8');
  assert.match(wrapper, /<QueryClientProvider client=\{desktopQueryClient\}><SettingsDesktopHostProvider value=\{value\}><DesktopSettingsPage\/>/);
});
