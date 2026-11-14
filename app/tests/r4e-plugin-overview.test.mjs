import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pluginDetailTabList, pluginDetailTabs, pluginDetailView, pluginOverview } from '../src/plugin-detail-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// R4e-plugin (settings-14): the 4.16336.0 plugin page tab list (c24c8737b pu; 3.6556.2 ol) and the Overview
// (c12456454 oo; 3.6556.2 ya) over plugin/read's data. The generated parts are React Compiler output (cae01a6fc
// U/W/X/J/ie, shared-19 iv/av/rv), so the shallow dispatcher carries useMemoCache (R5); their CDS primitives are cds-core's.
// SSR in Vite middleware mode plus controlled events on the real elements; no browser, Electron or core.
let server, Overview, Sections, Layout, M, Cds;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Overview = await server.ssrLoadModule('/src/source-r4e-plugin-overview.jsx');
  Sections = await server.ssrLoadModule('/src/generated/r4e-plugin/overview-sections.mjs');
  Layout = await server.ssrLoadModule('/src/generated/r4e-plugin/overview-layout.mjs');
  M = await server.ssrLoadModule('/src/source-customize.jsx');
  Cds = await server.ssrLoadModule('/src/cds-core.mjs');
});
after(() => server?.close());

// Calls a function component once with a hook dispatcher, so its returned element tree (and the handlers on it) can be
// inspected and fired directly.
function shallow(component, props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = withMemoCache({
    useId: () => `:r${id++}:`, useRef: value => ({ current: value }), useMemo: create => create(), useCallback: fn => fn,
    useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect() {}, useLayoutEffect() {},
    useContext: context => context._currentValue, useSyncExternalStore: (subscribe, get) => get(),
  });
  try { return component(props); } finally { internal.H = old; }
}
function findAll(node, predicate, out = []) {
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (!node || typeof node !== 'object') return out;
  if (predicate(node)) out.push(node);
  if (node.props) for (const value of Object.values(node.props)) if (value && typeof value === 'object') findAll(value, predicate, out);
  return out;
}

test('settings-14 Kt: Overview first and unconditional, then the content tabs in their order', () => {
  assert.deepEqual(pluginDetailTabList([]).map(tab => tab.id), ['overview'], 'a plugin with no contents still has its Overview');
  const detail = { skills: [{ name: 'review' }, { name: 'ship', type: 'command' }], mcpServers: ['gh'], hooks: [{ key: 'h', eventName: 'Stop' }],
    monitors: [{ command: 'tail' }], agents: [{ name: 'a' }], tools: [{ name: 'grep' }] };
  const tabs = pluginDetailTabList(pluginDetailTabs(detail, 'p'));
  assert.deepEqual(tabs.map(tab => tab.id), ['overview', 'skills', 'commands', 'connectors', 'tools', 'hooks', 'monitors', 'agents']);
  assert.deepEqual(tabs[0], { id: 'overview', label: 'Overview', description: '', items: [] });
  // qt: Overview is the initial and the fallback tab; it has no rows, so no search.
  assert.equal(pluginDetailView(tabs, undefined).tab.id, 'overview');
  assert.equal(pluginDetailView(tabs, 'language-servers').tab.id, 'overview');
  assert.deepEqual(pluginDetailView(tabs, 'overview', 'x'), { tab: tabs[0], searchable: false, items: [] });
  assert.equal(pluginDetailView(tabs, 'hooks').tab.id, 'hooks');
  // A second list call never duplicates the fixed tabs.
  assert.deepEqual(pluginDetailTabList(tabs).map(tab => tab.id), tabs.map(tab => tab.id));
});

test('settings-14 Kt / xs: Tool permissions is pushed only for a non-empty resolved list, which needs the unified plugins UI', () => {
  const servers = [{ uuid: 's1', name: 'Gmail' }];
  assert.deepEqual(pluginDetailTabList([], { permissionServers: servers }).map(tab => [tab.id, tab.label]), [['overview', 'Overview'], ['permissions', 'Tool permissions']]);
  assert.equal(pluginDetailTabList([], { permissionServers: servers })[1].servers, servers);
  assert.deepEqual(pluginDetailTabList([], { permissionServers: [] }).map(tab => tab.id), ['overview']);
  const content = pluginDetailTabs({ skills: [{ name: 's' }] }, 'p');
  assert.deepEqual(pluginDetailTabList(content, { permissionServers: servers }).map(tab => tab.id), ['overview', 'permissions', 'skills']);
});

test('settings-14 ni / ae: the Overview data is plugin/read’s description and one Connectors & tools row per server, in its order', () => {
  assert.equal(pluginOverview(null, {}), null);
  const detail = { description: 'From plugin/read', mcpServers: ['z-gh', 'a-local', ''], mcpServerStates: [{ name: 'a-local', runtimeName: 'plugin-p:a-local' }] };
  const rows = [{ name: 'z-gh', title: 'GitHub', kind: 'connected' }, { name: 'plugin-p:a-local', title: 'plugin-p:a-local', kind: 'signIn' }];
  const overview = pluginOverview(detail, { description: 'Localized meta' }, { mcpRows: rows });
  assert.equal(overview.description, 'Localized meta', 'the row’s localized meta wins, as on the page before');
  assert.equal(pluginOverview(detail, {}).description, 'From plugin/read');
  assert.deepEqual(overview.connectorRows, [
    { key: 'mcp:0:z-gh', label: 'GitHub', note: 'z-gh', connectorName: 'z-gh' },
    { key: 'mcp:1:a-local', label: 'plugin-p:a-local', note: 'a-local', connectorName: 'plugin-p:a-local' },
  ], 'declared order (the Connectors tab sorts, ae does not); the server’s own name is the note when the label differs');
  assert.deepEqual(pluginOverview({ mcpServers: ['fx​'] }, {}).connectorRows, [{ key: 'mcp:0:fx​', label: 'fx', note: undefined, connectorName: 'fx​' }],
    'kV strips format characters from the label and the note');
});

test('settings-14 overview DOM: the original iv layout, W Description and the av rail card with ie rows', () => {
  const overview = { description: 'Line one\nline​ two', connectorRows: [{ key: 'mcp:0:gh', label: 'GitHub', note: 'gh' }, { key: 'mcp:1:fx', label: 'fx' }] };
  const html = renderToStaticMarkup(React.createElement(Overview.PluginOverview, { overview, onOpenConnectors() {} }));
  assert.match(html, /^<div class="-mx-6" data-plugin-overview=""><div class="flex flex-col gap-lg px-xl md:flex-row"><div class="flex min-w-0 flex-1 flex-col gap-lg">/);
  // W: the classic heading (unified UI closed) and the sanitized description paragraph.
  assert.match(html, /<section class="flex flex-col gap-sm"><h3 class="text-caption text-secondary">Description<\/h3><p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">Line one\nline two<\/p><\/section>/);
  // iv rail → av (cds-core CdsCard = shared-frame Bh, bg-surface-1 outside pageLayout, gap-md, ring removed by rv) → ie.
  assert.match(html, /<aside class="flex w-full shrink-0 flex-col gap-md md:w-60"><div data-cds="Card" class="group\/card relative isolate flex flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-\[inherit\] after:content-\[&#x27;&#x27;\] has-\[\[data-cds=CardLink\]:focus-visible\]:after:shadow-focus [^"]*after:shadow-none gap-md"><span aria-hidden="true" class="cds-card-fill pointer-events-none absolute inset-0 -z-\[1\] m-0 rounded-\[inherit\] bg-surface-1"><\/span><div data-cds-card-body="" class="cds-card-body [^"]*p-lg">/);
  assert.doesNotMatch(html, /after:shadow-card-ring/, 'rv’s after:shadow-none replaces the card ring');
  assert.match(html, /<div class="flex flex-col gap-xs pt-md first:pt-0"><h3 class="text-caption text-secondary">Connectors &amp; tools<\/h3>/);
  // X rows with onClick: the cds-core CdsButton itself (shared-frame Xu, exported Id), ghost xs flush-both
  // ("data-cds-ghost", "mx-outset" and `--cds-outset-x: var(--cds-pad-md)`) with its "cds-btn-squish" paint layer,
  // holding the size-5 tile, the label and " · note".
  const buttons = [...html.matchAll(/<button [^>]*data-cds="Button"[^>]*>/g)].map(match => match[0]);
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.match(button, /^<button type="button" data-cds="Button" data-cds-ghost="" data-size="xs" class="cds-reset group\/btn [^"]* mx-outset w-full justify-start" style="--cds-outset-x:var\(--cds-pad-md\)">$/);
    assert.doesNotMatch(button, /source-settings-button|data-variant|data-flush/, 'no host SourceSettingsButton stand-in');
  }
  assert.match(html, /<span aria-hidden="true" class="absolute -z-\[1\] rounded-\[inherit\] inset-0 cds-btn-squish /);
  assert.doesNotMatch(html, /ssb-content/);
  // The tile glyph: c28f9f509 u's `e(t, { name: s, customSize: i, className: "text-muted-as-secondary" })` with t = lf, the
  // cds-core CdsIcon — the Anthropicons "Connectors" glyph (a private-use code point) at customSize 12.
  assert.match(html, /<span class="flex min-w-0 flex-1 gap-xs items-center"><span aria-hidden="true" class="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-chip text-secondary bg-fill-control"><span data-cds="Icon" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*" class="text-muted-as-secondary" aria-hidden="true">[\u{E000}-\u{F8FF}]<\/span><\/span>/u);
  const glyph = renderToStaticMarkup(React.createElement(Cds.CdsIcon, { name: 'Connectors', customSize: 12, className: 'text-muted-as-secondary' }));
  assert.ok(html.includes(glyph), 'the tile glyph is cds-core CdsIcon itself');
  // The label: the cds-core CdsOverflowTooltip (shared-frame dm, exported sd), a base-ui tooltip trigger span.
  assert.match(html, /<span data-cds="OverflowTooltip" class="block overflow-x-clip text-ellipsis whitespace-nowrap min-w-0 flex-1 text-footnote text-secondary" id="[^"]+" data-base-ui-tooltip-trigger="">GitHub<span class="text-muted-as-secondary"> · gh<\/span><\/span>/, 'menus C7: the note is text-muted-as-secondary');
  assert.match(html, />fx<\/span>/); assert.doesNotMatch(html, />fx<span class="text-muted/, 'no note when the label is the server name');
  // Without onOpenConnectors (no Connectors tab) the rows are plain.
  const plain = renderToStaticMarkup(React.createElement(Overview.PluginOverview, { overview }));
  assert.doesNotMatch(plain, /data-cds="Button"/); assert.match(plain, /<div class="flex gap-xs items-center"><span aria-hidden="true" class="flex size-5/);
  // No rows: no rail; no description: no Description section.
  const bare = renderToStaticMarkup(React.createElement(Overview.PluginOverview, { overview: { description: '', connectorRows: [] } }));
  assert.equal(bare, '<div class="-mx-6" data-plugin-overview=""><div class="flex flex-col gap-lg px-xl md:flex-row"><div class="flex min-w-0 flex-1 flex-col gap-lg"></div></div></div>');
  // Closed branches: Try it (and its "…or type {command}" line), org usage, what's new, categories, Added by.
  for (const text of [html, plain]) assert.doesNotMatch(text, /Try it|or type|in any chat|Usage in your organization|Adoption|What’s new|Categories|Added by|Tool permissions/);
});

test('settings-14 controlled events: a Connectors & tools row opens the Connectors tab through onOpenConnectors', () => {
  const opened = [];
  const onOpenConnectors = () => opened.push('connectors');
  const tree = shallow(Overview.PluginOverview, { overview: { description: 'd', connectorRows: [{ key: 'mcp:0:gh', label: 'GitHub', note: 'gh' }] }, onOpenConnectors });
  const [layout] = findAll(tree, node => node.type === Layout.PluginOverviewLayout);
  const [group] = findAll(layout.props.rail, node => node.type === Sections.OverviewConnectorsAndTools);
  assert.deepEqual(group.props.rows.map(row => [row.key, row.label, row.note, row.onClick === onOpenConnectors]), [['mcp:0:gh', 'GitHub', 'gh', true]]);
  // The original X row: with onClick it is the cds-core CdsButton, ghost xs flush-both, whose onClick is that handler.
  const row = shallow(Sections.OverviewRow, group.props.rows[0]);
  assert.equal(row.type, Cds.CdsButton);
  assert.equal(row.props.variant, 'ghost'); assert.equal(row.props.size, 'xs'); assert.equal(row.props.flush, 'both'); assert.equal(row.props.className, 'w-full justify-start');
  row.props.onClick({ type: 'click' });
  assert.deepEqual(opened, ['connectors']);
});

const detailProps = (extra = {}) => ({ plugin: { id: 'p', name: 'Plugin', enabled: true, source: 'local', description: 'Reviews code' },
  detail: { description: 'x', skills: [{ name: 'audit' }], mcpServers: ['gh'], hooks: [{ key: 'h', eventName: 'Stop' }] },
  error: '', skills: [], view: null, onView() {}, onBack() {}, onSkill() {}, mcp: { rows: [{ name: 'gh', title: 'GitHub', kind: 'connected' }], loading: false }, ...extra });

test('settings-14 PluginDetail: Overview is the first and initial tab and holds the Description; content tabs keep their panels', () => {
  const html = renderToStaticMarkup(React.createElement(M.PluginDetail, detailProps()));
  const tabs = [...html.matchAll(/<button type="button" role="tab" id="[^"]*-([a-z-]+)"[^>]*aria-selected="(true|false)"[^>]*>([^<]*)<\/button>/g)].map(m => [m[1], m[2], m[3]]);
  assert.deepEqual(tabs, [['overview', 'true', 'Overview'], ['skills', 'false', 'Skills'], ['connectors', 'false', 'Connectors'], ['hooks', 'false', 'Hooks']]);
  assert.match(html, /role="tabpanel"[^>]*><div class="-mx-6" data-plugin-overview="">/);
  assert.doesNotMatch(html, /cz-plugin-tab-description|cz-plugin-description/, 'no tab description on the Overview; the Description left the header');
  assert.equal(html.split('Reviews code').length - 1, 1, 'the description is drawn once, in the Overview');
  assert.match(html, /<h3 class="text-caption text-secondary">Description<\/h3><p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">Reviews code<\/p>/);
  assert.match(html, /Connectors &amp; tools<\/h3><button type="button" data-cds="Button"[^>]*>.*GitHub<span class="text-muted-as-secondary"> · gh<\/span>/);
  assert.doesNotMatch(html, /Try it|in any chat|Tool permissions|data-plugin-empty|Search overview/);
  // Another tab keeps its own panel; the Overview is not drawn there.
  const skills = renderToStaticMarkup(React.createElement(M.PluginDetail, detailProps({ view: { tab: 'skills', query: '' } })));
  assert.match(skills, /<p class="cz-plugin-tab-description">Invoke by typing/); assert.match(skills, /data-plugin-skills=""/);
  assert.doesNotMatch(skills, /data-plugin-overview|Reviews code/);
  // A plugin with nothing but a description still has its Overview.
  const bare = renderToStaticMarkup(React.createElement(M.PluginDetail, detailProps({ detail: {} })));
  assert.deepEqual([...bare.matchAll(/role="tab"[^>]*>([^<]*)</g)].map(m => m[1]), ['Overview']);
  assert.match(bare, /data-plugin-overview=""/); assert.doesNotMatch(bare, /aside|Connectors &amp; tools/);
});

// 4.16336.0 (region batch 2a): the production folder moved in place from 3.6556.2 (no generated consumer links it). The
// parts link cds-core by publicName (CdsButton, CdsIcon, CdsOverflowTooltip, CdsInfoTooltip, CdsCard, CdsTextLink, clsx),
// slice the React Compiler helpers cds-core holds without a public name as the very declarations it holds, and never
// reach view-tabs, routines-shared or a 3.6556.2 / 2.42304.0 chunk.
test('settings-14 the generated plugin parts are 4.16336.0, link cds-core by publicName and nothing of 3.6556.2', async () => {
  const fs = await import('node:fs/promises');
  const app = path.resolve(import.meta.dirname, '..');
  const dir = path.join(app, 'src/generated/r4e-plugin');
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.modules.map(m => m.target), ['text-sanitize.mjs', 'overview-layout.mjs', 'overview-sections.mjs', 'linkify.mjs', 'link-text.mjs',
    'url-safety.mjs', 'external-link.mjs', 'preload-helper.mjs', 'shared-frame.mjs']);
  const cds = JSON.parse(await fs.readFile(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const linked = new Set();
  // A link names the cds-core module export: the semantic name, or the raw local of a wave-5 binding (shared-62 oL).
  const byExport = new Map(Object.entries(cds.publicNames).map(([name, pub]) => [`../cds-core/${pub.target}:${pub.exportName}`, { name, ...pub }]));
  for (const module of manifest.modules) {
    assert.equal(module.referenceVersion, '4.16336.0', module.target);
    for (const entry of module.imports) {
      assert.notEqual(entry.kind, 'view-tabs', module.target); assert.notEqual(entry.kind, 'routines-shared', module.target);
      if (entry.kind === 'shared-graph') {
        const pub = byExport.get(`${entry.from}:${entry.name}`);
        assert.ok(pub, `${module.target}: ${entry.name} is a cds-core publicName`);
        assert.equal(entry.original, pub.local);
        linked.add(pub.name);
      }
    }
    const text = await fs.readFile(path.join(dir, module.target), 'utf8');
    assert.equal(/view-tabs|routines-shared|shared-frame-6jtSkIit|vendor-frame-CnSY1sxv|BfjMqbuN|3\.6556\.2|2\.42304\.0/.test(text), false, module.target);
    // Every held copy is cds-core's own declaration, byte for byte.
    const held = cds.modules.find(m => path.basename(m.source) === module.source);
    for (const name of module.heldByCdsCore) {
      const ours = module.bindings.find(b => b.name === name), theirs = held?.bindings.find(b => b.name === name);
      assert.equal(ours.sha256, theirs?.sha256, `${module.target}: ${name}`);
    }
  }
  // cdsOpenWindow (shared-frame ya, cds-wave4/utils) is a cds-core publicName since wave 4, and sanitizeTextKeptChars
  // (shared-62 oL) / semverSatisfiesCache (shared-0 SI) since wave 5: linked, no longer cut (nor owned) here. Since wave 5b
  // the URL-safety host and query-key sets (shared-0 tn / rn / kn / hn / mn / eee / Jr) and the link-text host sets
  // (shared-62 MM / NM) are cds-core publicNames too: linked, not cut again.
  // W8A (cds-wave8 addendum): the module-load values these parts cut as cds-core-held copies (shared-0 / shared-62 literal
  // tables and call results) are cds-core publicNames since the addendum: linked, not cut again. Was the list below alone.
  const W8A_LINKED = ['identity_shared0_AF', 'identity_shared0_EF', 'identity_shared0_Gr', 'identity_shared0_Kr', 'identity_shared0_Qr', 'identity_shared0_Ur',
    'identity_shared0_Wr', 'identity_shared0_ZF', 'identity_shared0__r', 'identity_shared0_br', 'identity_shared0_bt', 'identity_shared0_jF', 'identity_shared0_kF',
    'identity_shared0_qr', 'identity_shared0_xt', 'identity_shared0_yt', 'identity_shared62_Aj', 'identity_shared62_CM', 'identity_shared62_Dj', 'identity_shared62_Gj',
    'identity_shared62_Kj', 'identity_shared62_Mj', 'identity_shared62_Pj', 'identity_shared62_Rj', 'identity_shared62_Sj', 'identity_shared62_TM', 'identity_shared62_Uj',
    'identity_shared62_bj', 'identity_shared62_kj', 'identity_shared62_wj'];
  assert.deepEqual([...linked].sort(), ['CdsButton', 'CdsCard', 'CdsIcon', 'CdsInfoTooltip', 'CdsOverflowTooltip', 'CdsTextLink', 'anthropicConsoleHostnames',
    'anthropicPlatformHosts', 'anthropicPortalHostnames', 'cdsOpenWindow', 'claudeHostnames', 'claudeSiblingAppHosts', 'clsx', 'coworkNonSessionRouteSegments',
    'destinationQueryKeys', 'oauthAuthorizePaths', 'returnToQueryKeys', 'sanitizeTextKeptChars', 'semverSatisfiesCache', ...W8A_LINKED].sort());
  for (const name of W8A_LINKED) {
    const pub = cds.publicNames[name];
    assert.ok(pub, `${name} is a cds-core publicName`);
    assert.ok(!manifest.modules.some(m => m.source === pub.file && m.bindings.some(b => b.name === pub.local)), `${pub.file}#${pub.local} is not cut here`);
  }
  const wave5b = { 'shared-0-CnnWnVrT.js': ['tn', 'rn', 'kn', 'hn', 'mn', 'eee', 'Jr'], 'shared-62-DoCqVpIq.js': ['MM', 'NM'] };
  for (const [source, locals] of Object.entries(wave5b)) for (const local of locals) {
    assert.ok(Object.values(cds.publicNames).some(pub => pub.file === source && pub.local === local), `${source}#${local} is a cds-core publicName`);
    assert.ok(!manifest.modules.some(m => m.source === source && m.bindings.some(b => b.name === local)), `${source}#${local} is not cut here`);
  }
  assert.ok(!Object.hasOwn(manifest.ownedStateReasons, 'shared-62-DoCqVpIq.js#oL') && !Object.hasOwn(manifest.ownedStateReasons, 'shared-0-CnnWnVrT.js#SI'));
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules))
    assert.equal(digest, cds.modules.find(m => m.target === target).sha256, target);
  // D46: no module state cds-core holds is copied; what this graph owns is listed with a reason.
  const owned = manifest.modules.flatMap(m => m.ownedState.map(name => `${m.source}#${name}`)).sort();
  assert.deepEqual(owned, Object.keys(manifest.ownedStateReasons).sort());
  // The compiler helpers: shared-frame.mjs exports them under the names official-4.16336.0.mjs proves.
  const frame = manifest.modules.find(m => m.target === 'shared-frame.mjs');
  for (const name of ['J9', 'J0', 'J1', 'J2', 'J3', 'J4', 'K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'I1']) assert.ok(frame.heldByCdsCore.includes(name), name);
  assert.equal(frame.exports.J9, 'reactMemoCache');
  // Settings tab (menus N2): pinned on the 4.16336.0 page, asked only for an added plugin; its data needs the bridge's
  // getPluginOptions (the host answers it: electron/plugin-options.cjs).
  const site = (source, binding) => manifest.callSites.find(entry => entry.source === source && entry.binding === binding);
  assert.ok(site('c24c8737b-CApeZDrg.js', 'pu').features.some(f => f.loose === 'tt = E && !Xe,'));
  // The Settings tab itself: pu pushes it (3.6556.2 ol `t.push({ id: "settings", href: se("settings"), label: e })`).
  assert.ok(site('c24c8737b-CApeZDrg.js', 'pu').features.some(f => f.loose === 't.push({ id: "settings", href: B("settings"), label: e });'));
  const { ionSource } = await import('../scripts/official-4.16336.0.mjs');
  const page = await fs.readFile(path.join(ionSource, 'c24c8737b-CApeZDrg.js'), 'utf8');
  assert.equal(page.split('t.push({id:"settings",href:B("settings"),label:e})').length, 2, 'the official 4.16336.0 page pushes the Settings tab once');
  assert.ok(site('shared-123-1Hc1RTKl.js', 'h4').features.some(f => f.loose === 'let a = t && n && !!z?.getPluginOptions,'));
  // The host adapter file serves only intl, the GrowthBook gate and pageLayout; no CDS stand-in, no 3.6556.2 graph.
  const Adapters = await server.ssrLoadModule('/src/source-r4e-plugin-adapters.jsx');
  assert.deepEqual(Object.keys(Adapters).sort(), ['FormattedMessage', 'useIntl', 'usePageLayout', 'useUnifiedPluginsUi']);
  assert.equal(Adapters.useUnifiedPluginsUi(), false, '__gb__2406162393 is not served by host-growthbook.mjs');
  const adapterText = await fs.readFile(path.join(app, 'src/source-r4e-plugin-adapters.jsx'), 'utf8');
  assert.doesNotMatch(adapterText, /view-tabs|source-settings-button|source-tooltip|source-infotip|icons\.jsx/);
  const ids = [...server.moduleGraph.idToModuleMap.keys()];
  assert.ok(ids.some(id => id.endsWith('/src/source-customize.jsx')));
});

// cae01a6fc X renders `f&&t(a,{size:b?void 0:"xs",content:f,"aria-label":p?.(y)})`; plugin/read never sends the reach
// rows that carry a hint, so the row is fed one directly.
test('settings-14 X with a hint: the InfoTip is the cds-core CdsInfoTooltip (shared-frame eN), xs, labelled', async () => {
  const fs = await import('node:fs/promises');
  const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
  assert.equal((await fs.readFile(path.join(v1, 'cae01a6fc-t1NhdR7u.js'), 'utf8')).split('f&&t(a,{size:b?void 0:"xs",content:f,"aria-label":p?.(y)})').length - 1, 1);
  // The InfoTip literals occur once in the 4.16336.0 shared-frame (eN's data-cds, XM its class), and eN is the cds-core
  // publicName CdsInfoTooltip the generated row links.
  const frame = await fs.readFile(path.join(v1, 'shared-frame-CJdE5Ria.js'), 'utf8');
  assert.equal(frame.split('"data-cds":"InfoTip"').length - 1, 1);
  assert.equal(frame.split('XM="cds-reset inline-flex shrink-0 items-center justify-center rounded p-1 -m-1 text-muted outline-none').length - 1, 1);
  const cds = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, '../src/generated/cds-core/manifest.json'), 'utf8'));
  assert.deepEqual([cds.publicNames.CdsInfoTooltip.file, cds.publicNames.CdsInfoTooltip.local], ['shared-frame-CJdE5Ria.js', 'eN']);
  const h = React.createElement, noId = html => html.replace(/ id="[^"]*"/g, '');
  const row = renderToStaticMarkup(h(Sections.OverviewRow, { icon: 'Connectors', label: 'Remote', hint: 'Can send data.', hintButtonLabel: () => 'About Remote' }));
  const tip = renderToStaticMarkup(h(Cds.CdsInfoTooltip, { size: 'xs', content: 'Can send data.', 'aria-label': 'About Remote' }));
  assert.match(tip, /^<button type="button"[^>]*data-cds="InfoTip" aria-label="About Remote" class="cds-reset inline-flex shrink-0 items-center justify-center rounded p-1 -m-1 text-muted /);
  assert.ok(noId(row).includes(noId(tip)), row);
  // No hint: no InfoTip (`f&&…`).
  assert.doesNotMatch(renderToStaticMarkup(h(Sections.OverviewRow, { icon: 'Connectors', label: 'Remote' })), /data-cds="InfoTip"/);
});

// 4.16336.0 W always runs the description through c79fa23ba t (3.6556.2 gated it behind GrowthBook 1063785924): an
// allowed http(s) URL becomes the cds-core CdsTextLink (external, ltr, noopener) with c4acc1503's click / drag guards,
// trailing punctuation stays text, and a claude.ai page with a query the linkifier refuses stays plain text.
test('settings-14 W linkifies the description through the original c79fa23ba linkifier', () => {
  const h = React.createElement;
  const html = renderToStaticMarkup(h(Sections.OverviewDescription, { description: 'See https://example.com/docs. And https://claude.ai/settings?x=1' }));
  assert.match(html, /^<section class="flex flex-col gap-sm"><h3 class="text-caption text-secondary">Description<\/h3><p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">See <a data-cds="TextLink" dir="ltr" [^>]*href="https:\/\/example\.com\/docs" target="_blank" rel="noopener noreferrer" class="cds-reset cds-text-link[^"]*">https:\/\/example\.com\/docs<span [^>]*class="sr-only">\(opens in new tab\)<\/span><\/a>\. And https:\/\/claude\.ai\/settings\?x=1<\/p><\/section>$/);
  // Plain text stays a string (no link, no wrapper).
  assert.equal(renderToStaticMarkup(h(Sections.OverviewDescription, { description: 'No links here' })),
    '<section class="flex flex-col gap-sm"><h3 class="text-caption text-secondary">Description</h3><p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">No links here</p></section>');
  // The link element is the original b's: cds-core CdsTextLink with the c4acc1503 handlers.
  const tree = shallow(Sections.OverviewDescription, { description: 'https://example.com' });
  const [link] = findAll(tree, node => node.type === Cds.CdsTextLink);
  assert.ok(link, 'the URL is a CdsTextLink');
  assert.deepEqual([link.props.href, link.props.external, link.props.rel, link.props.dir], ['https://example.com', true, 'noopener noreferrer', 'ltr']);
  assert.equal(typeof link.props.onClick, 'function'); assert.equal(link.props.onClick, link.props.onAuxClick); assert.equal(typeof link.props.onDragStart, 'function');
});

// The host windows deny window.open and in-window navigation, so the Overview wrapper (bubble phase, after c4acc1503 g)
// hands a native http(s) description link to the host's "external" call; a link g prevented, a non-link click, a
// right click and a refused claude.ai URL (plain text) open nothing.
test('settings-14 W links open through the host "external" call after the original c4acc1503 guard', async () => {
  const h = React.createElement;
  const calls = [], host = { call: (op, payload) => { calls.push([op, payload]); return true; } };
  const tree = shallow(Overview.PluginOverview, { overview: { description: 'See https://example.com/docs and https://claude.ai/settings?x=1', connectorRows: [] } });
  const [wrapper] = findAll(tree, node => node.type === 'div' && node.props['data-plugin-overview'] === '');
  assert.equal(typeof wrapper.props.onClick, 'function'); assert.equal(wrapper.props.onClick, wrapper.props.onAuxClick);
  assert.equal(wrapper.props.onClickCapture, undefined, 'bubble phase: the link’s own guard runs first');
  const html = renderToStaticMarkup(h(Overview.PluginOverview, { overview: { description: 'See https://example.com/docs and https://claude.ai/settings?x=1' } }));
  assert.deepEqual([...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(m => m[1]), ['https://example.com/docs'], 'the refused claude.ai URL stays plain text');
  const desc = shallow(Sections.OverviewDescription, { description: 'https://example.com/docs' });
  const [link] = findAll(desc, node => node.type === Cds.CdsTextLink);
  const anchor = { getAttribute: name => name === 'href' ? link.props.href : null };
  const event = (extra = {}) => ({ button: 0, defaultPrevented: false, target: { closest: () => anchor }, currentTarget: { contains: node => node === anchor },
    preventDefault() { this.defaultPrevented = true; }, ...extra });
  // The original g first (on the anchor), then the wrapper, as the click bubbles.
  const click = event();
  link.props.onClick({ ...click, currentTarget: anchor, preventDefault: () => click.preventDefault() });
  assert.equal(click.defaultPrevented, false, 'g leaves an ordinary https link native');
  assert.equal(Overview.openOverviewExternalLink(click, host), true);
  assert.equal(click.defaultPrevented, true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, [['external', { url: 'https://example.com/docs' }]]);
  // Middle click opens it too; a right click, a prevented click, a non-link click and a non-http(s) href do not.
  assert.equal(Overview.openOverviewExternalLink(event({ button: 1 }), host), true);
  assert.equal(Overview.openOverviewExternalLink(event({ button: 2 }), host), false);
  assert.equal(Overview.openOverviewExternalLink(event({ defaultPrevented: true }), host), false);
  assert.equal(Overview.openOverviewExternalLink(event({ target: { closest: () => null } }), host), false);
  const script = { getAttribute: () => 'javascript:alert(1)' };
  assert.equal(Overview.openOverviewExternalLink(event({ target: { closest: () => script }, currentTarget: { contains: () => true } }), host), false);
  // An anchor outside the wrapper is not the Overview's.
  assert.equal(Overview.openOverviewExternalLink(event({ currentTarget: { contains: () => false } }), host), false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls.map(([, payload]) => payload.url), ['https://example.com/docs', 'https://example.com/docs']);
  // A rejected host call is reported, never thrown.
  const errors = [];
  Overview.openOverviewExternalLink(event(), { call: () => { throw new Error('Unsupported URL.'); }, error: message => errors.push(message) });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(errors, ['Unsupported URL.']);
  // Without a host bridge (SSR / tests) nothing is called and nothing throws.
  assert.equal(Overview.openOverviewExternalLink(event(), undefined), true);
});

test('settings-14 text-sanitize: the 4.16336.0 shared-62 sL / lL the host model and the plugin settings tab import', async () => {
  const T = await server.ssrLoadModule('/src/generated/r4e-plugin/text-sanitize.mjs');
  assert.equal(T.sanitizeText('a​b\u0007c‍d\tz'), 'abc‍dz', 'format and control characters go, ZWJ stays, a tab goes on one line');
  assert.equal(T.sanitizeMultilineText('a\tb‮\r\nc\u0000d'), 'a\tb\ncd', 'per line: tabs stay, CRLF reads as one line break');
});

test('settings-14 PluginDetail controlled events: tab clicks and the Overview rows change the controlled view', () => {
  const views = [];
  const tree = shallow(M.PluginDetail, detailProps({ onView: value => views.push(value) }));
  const tabs = findAll(tree, node => node.type === 'button' && node.props.role === 'tab');
  assert.deepEqual(tabs.map(node => [node.key, node.props['aria-selected']]), [['overview', true], ['skills', false], ['connectors', false], ['hooks', false]]);
  tabs[0].props.onClick(); assert.deepEqual(views, [], 'the selected tab does not re-select');
  tabs[3].props.onClick(); assert.deepEqual(views, [{ tab: 'hooks', query: '' }]);
  const [overview] = findAll(tree, node => node.type === Overview.PluginOverview);
  assert.deepEqual(overview.props.overview.connectorRows.map(row => row.label), ['GitHub']);
  overview.props.onOpenConnectors();
  assert.deepEqual(views.at(-1), { tab: 'connectors', query: '' }, 'pc Dn: a Connectors & tools row opens the Connectors tab');
  // Without a Connectors tab the rows have nothing to open.
  const plain = shallow(M.PluginDetail, detailProps({ detail: { description: 'x', skills: [{ name: 'audit' }] } }));
  assert.equal(findAll(plain, node => node.type === Overview.PluginOverview)[0].props.onOpenConnectors, undefined);
  // A stale or removed tab falls back to the Overview, which the effect would write back.
  const stale = shallow(M.PluginDetail, detailProps({ view: { tab: 'agents', query: 'q' } }));
  assert.equal(findAll(stale, node => node.type === 'button' && node.props.role === 'tab' && node.props['aria-selected'])[0].key, 'overview');
});
