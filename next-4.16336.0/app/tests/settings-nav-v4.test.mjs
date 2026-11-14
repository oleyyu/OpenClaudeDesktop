// settings-nav (4.16336.0, scripts/extract-settings-nav-v4.mjs): host React SSR of the official settings navigation over
// the production host value (src/settings-shell-model.mjs settingsNavHostValue), the host tab compatibility table, and the
// review P1 fixes of surface-pilots/settings-nav (initialSection undefined / '' opens; GrowthBook one answer source;
// claude_ai_plugins_in_chat answered from the host table without throwing — the official 3P value true since host-native; Platform link analytics/configuration cut).
// Fixture data only (no real account, no user profile, no session titles).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const out = path.join(app, 'src/generated/settings-nav');
let nav, store, adapter, core, compat, shell, gb, coreAdapter;
before(async () => {
  nav = await import('../src/generated/settings-nav/settings-nav.mjs');
  store = (await import('../src/generated/settings-nav/settings-store.mjs')).settingsModalStore;
  adapter = await import('../src/settings-nav-adapter.mjs');
  core = await import('../src/generated/cds-core/shared-frame.mjs');
  compat = await import('../src/settings-tab-compat.mjs');
  shell = await import('../src/settings-shell-model.mjs');
  gb = await import('../src/host-growthbook.mjs');
  coreAdapter = await import('../src/cds-core-adapter.mjs');
});

const host = (options = {}, capabilities = {}) => {
  const value = shell.settingsNavHostValue({ importAvailable: true, coworkEnabled: true, ...options });
  return { ...value, capabilities: { ...value.capabilities, ...capabilities } };
};
const Search = () => h('input', { 'data-fixture-search': '' });
const render = (node, value = host()) => renderToStaticMarkup(h(core.CdsRoot, {}, h(adapter.SettingsNavHostProvider, { value }, node)));
const rail = (value, props = {}) => render(h(nav.SettingsNavRail, { activeSection: 'general', SearchComponent: Search, ...props }), value);
const testIds = html => [...html.matchAll(/<li data-testid="([^"]+)"/g)].map(m => m[1]);
const labels = html => [...html.matchAll(/<span class="min-w-0 flex-1 truncate">([^<]+)<\/span>/g)].map(m => m[1]);
const titles = html => [...html.matchAll(/class="px-sm pt-md text-caption text-muted-as-secondary">([^<]+)</g)].map(m => m[1]);

test('official rail (shared-55 z_ over Kg) renders the host-gated groups and sections in official order', () => {
  const html = rail(host());
  assert.match(html, /^<div class="cds-root text-primary"/);
  assert.match(html, /<nav data-perf-region="settings_nav" aria-label="Settings"/);
  assert.match(html, /<input data-fixture-search=""\/>/);
  assert.deepEqual(titles(html), ['Preferences', 'This computer', 'Customize']);
  assert.deepEqual(labels(html), ['General', 'Privacy', 'Usage', 'Memory', 'Claude Code', 'Cowork', 'Import &amp; export', 'System', 'Developer', 'Skills', 'Connectors', 'Plugins']);
  assert.deepEqual(testIds(html), ['general-settings', 'data-privacy-controls', 'usage-settings', 'memory-settings', 'claude-code-settings', 'settings-nav-import',
    'customize-skills-settings', 'customize-connectors-settings', 'customize-plugins-settings']);
  assert.equal(html.match(/aria-current="page"/g).length, 1);
  assert.match(html, /<li data-testid="general-settings"><button type="button" aria-current="page"[^>]*bg-fill-ghost-selected font-medium text-primary/);
  assert.ok(html.includes(String.fromCodePoint(0xe0d6)), 'General icon is the CDS Settings glyph');
  // Local profile: no organization → no Organization / Admin; no api membership → no Platform API keys link.
  assert.doesNotMatch(html, /Organization|Admin settings|Platform|API keys|Billing|Notifications/);
});

test('host facts gate rows through the official branches (Cowork, Import & export, desktop groups)', () => {
  assert.ok(!labels(rail(host({ coworkEnabled: false }))).includes('Cowork'));
  assert.ok(!labels(rail(host({ importAvailable: false }))).includes('Import &amp; export'));
  const billing = labels(rail(host({}, { useBillingSection: true })));
  assert.deepEqual(billing.slice(0, 4), ['General', 'Privacy', 'Billing', 'Usage']);
  const web = rail(host({}, { useIsDesktopApp: false }));
  assert.deepEqual(titles(web), ['Preferences', 'Customize']);
  const extensions = labels(rail(host({}, { useExtensionsSection: true })));
  assert.deepEqual(extensions.slice(7, 10), ['System', 'Extensions', 'Developer']);
  assert.ok(!labels(rail(host({}, { useLocalDevMcpEnabled: false }))).includes('Developer'));
});

test('host-native: claude_ai_plugins_in_chat is the official 3P value (Wbn 1179150525 always true): Chat enables Plugins, no throw', () => {
  // 4.16336.0 asar index.chunk-Du-Wqi0E.js Wbn `1179150525:{rule:"always",value:!0}`; the host table serves it.
  assert.equal(gb.HOST_GROWTHBOOK.__gb__1179150525, true, 'host table lists __gb__1179150525: true');
  assert.equal(gb.hostGrowthBookFlag('claude_ai_plugins_in_chat'), true);
  assert.equal(gb.growthBookFlagKey('claude_ai_plugins_in_chat'), '__gb__1179150525');
  // The official gate stays in the generated slice (shared-55 `y = g === "chat" && !_ ? v : void 0`): only its answer changed.
  assert.match(fs.readFileSync(path.join(out, 'settings-nav.mjs'), 'utf8'), /_ = ht\("claude_ai_plugins_in_chat"\),[\s\S]{0,60}y = g === "chat" && !_ \? v : void 0/);
  let html;
  assert.doesNotThrow(() => { html = rail(host({ surface: 'chat' })); });
  const plugins = html.slice(html.indexOf('<li data-testid="customize-plugins-settings">'));
  assert.match(plugins, /^<li data-testid="customize-plugins-settings">/);
  assert.doesNotMatch(html, /disabled=""/);
  assert.ok(!html.includes('Plugins are only available in Cowork and Code'));
  for (const surface of ['code', 'cowork']) assert.doesNotMatch(rail(host({ surface })), /disabled=""/);
  assert.throws(() => shell.settingsNavHostValue({ surface: 'web' }), /unknown host surface/);
});

test('review P1: one GrowthBook answer source — hooks and the non-hook shared-0 Uu read the host table by growthBookFlagKey', () => {
  const key = Object.keys(gb.HOST_GROWTHBOOK).find(k => gb.HOST_GROWTHBOOK[k] === true);
  assert.equal(adapter.readGrowthBookValue(key), true);
  assert.equal(adapter.readGrowthBookValue('__gb__2406162393'), null, 'unlisted: null, as Uu without a client');
  assert.equal(adapter.useGrowthBookFlag('claude_ai_plugins_in_chat'), adapter.useGrowthBookFlag('__gb__1179150525'));
  assert.equal(adapter.useGrowthBookFeatureOn(key), true);
  assert.equal(adapter.useGrowthBookFlagWhen(key, false), false);
  assert.equal(adapter.readGrowthBookValue, coreAdapter.hostGrowthBookFeature);
  // Generated graph: Uu (shared-0 Rx) and Bg (shared-25) are adapter imports, never sliced (no module GrowthBook client).
  const s0 = fs.readFileSync(path.join(out, 'shared-0.mjs'), 'utf8'), s62 = fs.readFileSync(path.join(out, 'shared-62.mjs'), 'utf8');
  const s183 = fs.readFileSync(path.join(out, 'settings-store.mjs'), 'utf8'), s25 = fs.readFileSync(path.join(out, 'shared-25.mjs'), 'utf8');
  assert.doesNotMatch(s0, /function Uu\(|var ku = null|function y4|useConfiguration must be called/);
  assert.doesNotMatch(s25, /function Jo\(/);
  assert.match(s62, /readGrowthBookValue as xt/);
  assert.match(s62, /useGrowthBookFeatureOn as Fr/);
  assert.match(s183, /readGrowthBookValue as xt/);
  assert.match(s183, /useGrowthBookFeatureOn as or/);
  // unifiedPluginsUi / pluginsMergedSkills / simple nav are the official readers now (no host capability for them).
  assert.match(s62, /function bP\(\) \{\n  return Fr\(yP\);/);
  assert.match(s62, /function _P\(\) \{\n  return Fr\(gP\);/);
  assert.match(s183, /function Ch\(\) \{\n  return or\("__gb__2503656110"\) && mh;/);
  assert.match(s183, /var mh = !1;/, '4.16336.0 keeps the simple nav off whatever the flag answers');
  const caps = Object.keys(host().capabilities);
  for (const gone of ['useUnifiedPluginsUi', 'usePluginsMergedSkills', 'useSimpleSettingsNav']) assert.ok(!caps.includes(gone), gone);
});

test('review P1: the Platform link analytics (shared-62 OT) and configuration (shared-0 y4) are host contract cuts, unreachable for the host', () => {
  const generated = fs.readFileSync(path.join(out, 'settings-nav.mjs'), 'utf8');
  assert.match(generated, /useAnalytics as Ri/);
  assert.match(generated, /useConfiguration as Ue/);
  assert.throws(() => adapter.useAnalytics(), /useAnalytics entered/);
  assert.throws(() => adapter.useConfiguration(), /useConfiguration entered/);
  assert.throws(() => adapter.RouterLink({}), /RouterLink entered/);
  const s62 = fs.readFileSync(path.join(out, 'shared-62.mjs'), 'utf8');
  assert.doesNotMatch(s62, /function OT\(|AnalyticsBridge/);
  const provenance = JSON.parse(fs.readFileSync(path.join(out, 'provenance.json'), 'utf8'));
  const cut = name => provenance.cuts.find(c => c.name === name);
  assert.deepEqual([cut('useAnalytics').file, cut('useAnalytics').local, cut('useAnalytics').unreachable], ['shared-62-DoCqVpIq.js', 'OT', true]);
  assert.deepEqual([cut('useConfiguration').file, cut('useConfiguration').local, cut('useConfiguration').unreachable], ['shared-0-CnnWnVrT.js', 'y4', true]);
  assert.deepEqual([cut('readGrowthBookValue').file, cut('readGrowthBookValue').local], ['shared-0-CnnWnVrT.js', 'Uu']);
  assert.deepEqual([cut('useGrowthBookFeatureOn').file, cut('useGrowthBookFeatureOn').local], ['shared-25-D-aF0gt9.js', 'Jo']);
});

test('P0: cds-core names are linked (DisabledReason / Skeleton no longer unreachable cuts): no SearchComponent draws the official Skeleton', () => {
  const html = rail(host(), { SearchComponent: undefined });
  assert.match(html, /<div aria-hidden="true" class="flex h-control items-center">.*data-cds="Skeleton"/s);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const shared = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.from}:${i.name}`));
  // shared-62 kI (missingTranslationListeners) is a cds-core publicName since wave 5 (exported under its local); since
  // wave 6 also shared-183 L_ / Qg / Rh / gg / pg, shared-25 Dl / El, shared-62 Hs / Vs / ys and shared-92 Ub (module state
  // and readers the region graphs share, exported under their locals).
  assert.deepEqual([...new Set(shared)].sort(), ['../cds-core/shared-11.mjs:CdsTabs', '../cds-core/shared-183.mjs:L_', '../cds-core/shared-183.mjs:Qg',
    '../cds-core/shared-183.mjs:Rh', '../cds-core/shared-183.mjs:gg', '../cds-core/shared-183.mjs:pg', '../cds-core/shared-25.mjs:Dl', '../cds-core/shared-25.mjs:El',
    // cds-core wave 8s (W8S-T9): + shared-33 M_ (settings_shared33_M_; was: the list without it)
    '../cds-core/shared-33.mjs:M_',
    '../cds-core/shared-62.mjs:Hs', '../cds-core/shared-62.mjs:Vs', '../cds-core/shared-62.mjs:kI', '../cds-core/shared-62.mjs:ys', '../cds-core/shared-92.mjs:Ub',
    '../cds-core/shared-frame.mjs:CdsDisabledReason', '../cds-core/shared-frame.mjs:CdsIcon', '../cds-core/shared-frame.mjs:CdsSkeleton', '../cds-core/vendor-frame.mjs:clsx',
    '../cds-core/vendor-frame.mjs:useDirection']);
  const provenance = JSON.parse(fs.readFileSync(path.join(out, 'provenance.json'), 'utf8'));
  assert.equal(provenance.cuts.some(c => /^Cds/.test(c.name)), false);
});

test('stacked nav (shared-55 ev → rv) is the linked cds-core Tabs with one tab per official section', () => {
  const html = render(h(nav.SettingsNavStacked, { activeSection: 'desktop' }));
  assert.match(html, /data-cds="Tabs"/);
  assert.equal([...html.matchAll(/role="tab"/g)].length, 12);
  const selected = [...html.matchAll(/<button[^>]*role="tab"[^>]*>((?:(?!<\/button>).)*)<\/button>/gs)].filter(m => /aria-selected="true"/.test(m[0]));
  assert.equal(selected.length, 1);
  assert.match(selected[0][1], /^System</);
});

test('useSettingsSections (Kg, export Rl) returns the official shape and is not pending once host answers are in', () => {
  let seen;
  const Probe = () => { seen = nav.useSettingsSections({ forModal: true, forNav: true }); return null; };
  render(h(Probe));
  assert.equal(seen.isPending, false);
  assert.equal(seen.simpleNav, false);
  assert.equal(seen.adminLink, null);
  assert.deepEqual(seen.groups.map(g => g.sections.map(s => s.id)), [
    ['general', 'data-privacy-controls', 'usage', 'memory', 'claude-code', 'cowork', 'import'],
    ['desktop', 'desktop/developer'],
    ['customize-skills', 'customize-connectors', 'customize-plugins']]);
  for (const id of seen.groups.flatMap(g => g.sections.map(s => s.id))) assert.ok(compat.hostTabForSection(id), `host page for ${id}`);
  let pending;
  const Pending = () => { pending = nav.useSettingsSections({ forModal: true }); return null; };
  render(h(Pending), host({}, { useManagedConfig: { data: undefined } }));
  assert.equal(pending.isPending, true, 'managed config not loaded yet → official isPending');
});

test('branches the host contract excludes fail loud instead of rendering nothing', () => {
  assert.throws(() => rail(host({}, { useUnseenAnnouncements: [{ kind: 'skill' }] }), { activeSection: 'customize-skills' }), /SectionAnnouncementDot/);
  const value = host(); delete value.capabilities.useBillingSection;
  assert.throws(() => rail(value), /useBillingSection is not answered/);
  assert.throws(() => renderToStaticMarkup(h(nav.SettingsNavRail, { activeSection: 'general', SearchComponent: Search })), /SettingsNavHostProvider/);
});

test('official settings modal store (shared-183 yg): open() untargeted is General; timing goes to the host sink only', () => {
  globalThis.__settingsNavTelemetry = [];
  try {
    const before = store.getState().openCount;
    store.getState().open();
    assert.equal(store.getState().section, compat.UNTARGETED_SECTION);
    store.getState().open('desktop');
    assert.equal(store.getState().section, 'desktop');
    assert.equal(store.getState().openCount, before + 2);
    store.getState().close();
    assert.equal(store.getState().section, null);
    assert.ok(globalThis.__settingsNavTelemetry.some(e => e.kind === 'start' && e.name === 'settings_load'));
  } finally { delete globalThis.__settingsNavTelemetry; }
});

test('review P1: initialSection undefined / null / "" is the official untargeted open (Cmd+, and the user menu Settings)', () => {
  for (const value of [undefined, null, '']) assert.deepEqual(compat.resolveHostTab(value), { kind: 'official', section: 'general', href: '/settings/general', untargeted: true });
  assert.deepEqual(compat.hostTabForSection('general'), { tab: 'preferences' });
  // main.jsx: both entries call setSettings(true), and the mount passes a non-string as undefined.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /if \(command === "settings"\) \{[^\n]*setSettings\(true\);/);
  assert.match(main, /data-testid="user-menu-settings" onClick=\{\(\) => setSettings\(true\)\}/);
  assert.match(main, /initialSection=\{typeof settings === "string" \? settings : undefined\} surface=\{mode\}/);
});

test('old host tab ids map onto official sections and back; local extensions stay local and keep their ids', () => {
  const hostSource = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  const allHostIds = [...hostSource.slice(hostSource.indexOf('const tabs = ['), hostSource.indexOf('const baseNavTabs')).matchAll(/\{id:'([\w-]+)'/g)].map(m => m[1]);
  // U-SET-LITE (U-SET-HANDWRITE): Account and Notifications are new host pages of the hand-written nav with no official
  // section; they stay out of the compat table (and of the official store sync: officialSectionOf answers null for them).
  const handwritten = ['account', 'notifications'];
  for (const id of handwritten) {
    assert.ok(allHostIds.includes(id), `${id} is a host tab`);
    assert.throws(() => compat.resolveHostTab(id), /unknown host tab id/, id);
    assert.equal(compat.hostTabForSection(id), null, id);
    assert.equal(compat.isLocalSection(id), false, id);
  }
  assert.ok(hostSource.includes("const officialSectionOf = tab => { if(isLocalSection(tab)||!tabs.some(entry=>entry.id===tab))return null; try{return resolveHostTab(tab).section;}catch{return null;} };"));
  const hostIds = allHostIds.filter(id => !handwritten.includes(id));
  assert.deepEqual([...hostIds].sort(), [...compat.HOST_TAB_IDS].sort(), 'every other current host tab id has a mapping');
  for (const id of hostIds) {
    const r = compat.resolveHostTab(id);
    if (r.kind === 'official') { assert.equal(r.href, compat.OFFICIAL_ROUTES[r.section]); assert.equal(compat.hostTabForSection(r.section).tab, id, `${id} round trip`); }
    else { assert.equal(r.section, id); assert.deepEqual(compat.hostTabForSection(id), { tab: id }); }
  }
  assert.deepEqual(compat.resolveHostTab('general'), { kind: 'official', section: 'desktop', href: '/settings/desktop' });
  assert.deepEqual(compat.resolveHostTab('code#bypass'), { kind: 'official', section: 'claude-code', href: '/settings/claude-code#bypass', anchor: 'bypass' });
  assert.deepEqual(compat.resolveHostTab('general#open-storage'), { kind: 'official', section: 'desktop', action: 'open-storage', href: '/settings/desktop?open_storage=true' });
  assert.deepEqual(compat.resolveHostTab('customize-connectors#a%23b'), { kind: 'official', section: 'customize-connectors', href: '/customize/connectors#a%23b', anchor: 'a%23b' });
  assert.deepEqual(compat.resolveHostTab('harness#cordis'), { kind: 'local', section: 'harness', anchor: 'cordis' });
  // integration-3 review-1 P1: the official Import & export row lands on the host page that actually declares
  // Import from Claude Code (Claude Code › Model and permissions), and the anchor row must be declared in that tab's group.
  assert.deepEqual(compat.hostTabForSection('import'), { tab: 'code', anchor: 'codexImport' });
  for (const section of ['import']) {
    const target = compat.hostTabForSection(section);
    if (!target.anchor) continue;
    const at = hostSource.indexOf(`row('${target.anchor}',`);
    assert.ok(at > 0, `${section}: anchor row ${target.anchor} is declared`);
    assert.equal(hostSource.indexOf(`row('${target.anchor}',`, at + 1), -1, `${section}: anchor row ${target.anchor} is declared once`);
    const groups = [...hostSource.slice(0, at).matchAll(/\{tab:'([\w-]+)',title:/g)];
    assert.equal(groups.at(-1)?.[1], target.tab, `${section}: anchor row ${target.anchor} is declared in the {tab:'${target.tab}'} group`);
  }
  assert.throws(() => compat.resolveHostTab('nope'), /unknown host tab id/);
  assert.equal(compat.hostTabForSection('billing'), null);
  // Every local extension page (Codex rows live on Preferences/Code; MCP on Developer / Connectors; permission profiles,
  // hooks, harness, cores, models, commands, instructions, theme) stays reachable from the nav.
  for (const id of ['theme', 'instructions', 'commands', 'models', 'cores', 'advanced', 'harness', 'customize-hooks', 'profiles']) assert.ok(compat.isLocalSection(id), id);
});

test('local extension groups render through the official group/row components (J_ / q_), labelled as OpenClaude', () => {
  const entries = [{ id: 'theme', label: 'Theme', icon: 'Palette' }, { id: 'instructions', label: 'Instructions', icon: 'BookText' }, { id: 'cores', label: 'Cores', icon: 'Box' }];
  const groups = shell.localNavGroups(entries);
  assert.deepEqual(groups.map(g => [g.title, g.sections.map(s => s.testId)]), [['OpenClaude', ['openclaude-theme', 'openclaude-instructions']], ['OpenClaude · This computer', ['openclaude-cores']]]);
  const html = render(h(nav.SettingsNavGroup, { group: groups[0], mergedPageHere: false, labelledBy: 'openclaude-title', activeSection: 'instructions', onSelect() {}, onSelectYours() {} }));
  assert.match(html, /<ul aria-labelledby="openclaude-title" class="flex flex-col hit-gap-y-px">/);
  assert.deepEqual(testIds(html), ['openclaude-theme', 'openclaude-instructions']);
  assert.equal(html.match(/aria-current="page"/g).length, 1);
  assert.match(html, /<li data-testid="openclaude-instructions"><button type="button" aria-current="page" class="hit-row hit-row-main/);
});

test('generated graph: pinned provenance, sharedGraph cds-core, held copies pure, host React only', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const pins = JSON.parse(fs.readFileSync(path.join(app, 'scripts/settings-nav-v4-pins.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  for (const m of manifest.modules) {
    assert.equal(sha(fs.readFileSync(path.join(out, m.target))), m.sha256);
    assert.equal(m.sourceSha256, pins.sources[m.source]);
    for (const i of m.imports) assert.ok(['react', 'shared-graph', 'generated', 'adapter'].includes(i.kind), `${m.target}: ${i.kind}`);
  }
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), pins.cdsCore.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/settings-nav-adapter.mjs'))), pins.hostAdapterSha256);
  // Held copies of cds-core bindings: the React Compiler helpers (shared-frame I*/J*/K*/Z*) and shared-33 Cb, and since
  // cds-core wave 5 holds more of their chunks, shared-0 me / ve, vendor-intl tn (defineMessages identity) and
  // vendor-all-0's six helpers, and since cds-core wave 6 shared-0 _e / e_, shared-62 Ys / _s / xP / yP and shared-183
  // Um / Wm / Ym / ah / ih / nh / rh / th / z_, and since cds-core wave 8 (its closure now holds them) shared-0 ro and
  // shared-92 Ib: all pure, each byte for byte the declaration cds-core holds, none published.
  // (before wave 8: shared-0-CnnWnVrT\.js#(me|ve|_e|e_) and no shared-92 entry). Since cds-core wave 8s (W8S-T9, closure of its
  // wave-8s names) shared-0 iU / nU / rU / tU (capability predicates) and shared-183 ch / Th too (before: shared-0 (me|ve|_e|e_|ro),
  // shared-183 (Um|Wm|Ym|ah|ih|nh|rh|th|z_)).
  const held = manifest.modules.flatMap(m => m.heldByViewTabs.map(n => `${m.source}#${n}`));
  for (const entry of held) assert.match(entry, /^(shared-frame-CJdE5Ria\.js#[IJKZ]\d|shared-33-DtdykY0y\.js#Cb|shared-0-CnnWnVrT\.js#(me|ve|_e|e_|ro|iU|nU|rU|tU)|shared-92-BOgyxePb\.js#Ib|vendor-intl-BJgYK7RA\.js#tn|vendor-all-0-uUCo-eCX\.js#[_ghmpv]|shared-62-DoCqVpIq\.js#(Ys|_s|xP|yP)|shared-183-B2N6Zy4J\.js#(Um|Wm|Ym|ah|ih|nh|rh|th|z_|ch|Th))$/);
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  for (const m of manifest.modules) for (const name of m.heldByViewTabs) {
    assert.equal(m.bindings.find(b => b.name === name)?.sha256, core.modules.find(c => c.source === m.source)?.bindings.find(b => b.name === name)?.sha256, `${m.source}#${name}`);
    assert.ok(!Object.values(core.publicNames).some(e => e.file === m.source && e.local === name), `${m.source}#${name} is not published`);
  }
  // One React: no generated module bundles React; react imports are bare host specifiers.
  for (const m of manifest.modules) {
    const text = fs.readFileSync(path.join(out, m.target), 'utf8');
    assert.doesNotMatch(text, /react\.production|__SECRET_INTERNALS|createElement = function/);
    for (const spec of text.matchAll(/from "([^"]+)"/g)) assert.ok(/^(\.\.?\/|react(\/jsx-runtime|\/compiler-runtime|-dom)?$)/.test(spec[1]), `${m.target}: ${spec[1]}`);
  }
  // The official settings modal store has one copy: only this area slices shared-183 yg.
  const others = fs.readdirSync(path.join(app, 'src/generated')).filter(dir => dir !== 'settings-nav' && fs.existsSync(path.join(app, 'src/generated', dir, 'manifest.json')))
    .filter(dir => JSON.parse(fs.readFileSync(path.join(app, 'src/generated', dir, 'manifest.json'), 'utf8')).modules?.some(m => m.source === 'shared-183-B2N6Zy4J.js' && m.bindings.some(b => (b.name ?? b) === 'yg')));
  assert.deepEqual(others, []);
});

test('local group titles get the rail list\'s own title padding (shared-19 zv [&>.text-caption]:px-0) through their holder', () => {
  const zv = fs.readFileSync(path.join(out, 'shared-19.mjs'), 'utf8');
  assert.ok(zv.includes('[&>.text-caption]:px-0'), 'the official group list zeroes its direct title children\'s inline padding');
  const css = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/c6a992d55-_JRfOmTh.css'), 'utf8');
  assert.ok(css.includes('.\\[\\&\\>\\.text-caption\\]\\:px-0>.text-caption{padding-inline:0}'), 'official stylesheet rule');
  const source = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.ok(source.includes("Object.assign(document.createElement('div'),{style:'display:contents',className:'[&>.text-caption]:px-0'})"));
});
