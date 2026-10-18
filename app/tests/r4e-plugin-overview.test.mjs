import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { pluginDetailTabList, pluginDetailTabs, pluginDetailView, pluginOverview, pluginToolPermissionServers } from '../src/plugin-detail-model.mjs';

// R4e-plugin (settings-14): the 2.42304.0 plugin page tab list (c24c8737b pc Kt) and the Overview (c12456454 ni) over
// plugin/read's data. SSR in Vite middleware mode plus controlled events on the real elements; no browser, Electron or core.
let server, Overview, Sections, Layout, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Overview = await server.ssrLoadModule('/src/source-r4e-plugin-overview.jsx');
  Sections = await server.ssrLoadModule('/src/generated/r4e-plugin/overview-sections.mjs');
  Layout = await server.ssrLoadModule('/src/generated/r4e-plugin/overview-layout.mjs');
  M = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

// Calls a function component once with a hook dispatcher, so its returned element tree (and the handlers on it) can be
// inspected and fired directly.
function shallow(component, props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = {
    useId: () => `:r${id++}:`, useRef: value => ({ current: value }), useMemo: create => create(), useCallback: fn => fn,
    useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect() {}, useLayoutEffect() {},
    useContext: context => context._currentValue, useSyncExternalStore: (subscribe, get) => get(),
  };
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
  // xs: host servers count only with unifiedPluginsUi (GrowthBook __gb__2406162393, closed on the host).
  assert.deepEqual(pluginToolPermissionServers({ hostToolPermissionsServers: servers }), []);
  assert.deepEqual(pluginToolPermissionServers({ unifiedPluginsUi: true, hostToolPermissionsServers: [] }), []);
  assert.equal(pluginToolPermissionServers({ unifiedPluginsUi: true, hostToolPermissionsServers: servers }), servers);
  assert.deepEqual(pluginToolPermissionServers(), []);
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

test('settings-14 overview DOM: the original kD layout, W Description and the AD rail card with se rows', () => {
  const overview = { description: 'Line one\nline​ two', connectorRows: [{ key: 'mcp:0:gh', label: 'GitHub', note: 'gh' }, { key: 'mcp:1:fx', label: 'fx' }] };
  const html = renderToStaticMarkup(React.createElement(Overview.PluginOverview, { overview, onOpenConnectors() {} }));
  assert.match(html, /^<div class="-mx-6" data-plugin-overview=""><div class="flex flex-col gap-lg px-xl md:flex-row"><div class="flex min-w-0 flex-1 flex-col gap-lg">/);
  // W: the classic heading (unified UI closed) and the sanitized description paragraph.
  assert.match(html, /<section class="flex flex-col gap-sm"><h3 class="text-caption text-secondary">Description<\/h3><p dir="auto" class="whitespace-pre-wrap break-words text-primary text-body">Line one\nline two<\/p><\/section>/);
  // kD rail → AD (CDS Card, bg-surface-1 outside pageLayout, gap-md, ring removed) → se.
  assert.match(html, /<aside class="flex w-full shrink-0 flex-col gap-md md:w-60"><div data-cds="Card" class="group\/card relative isolate flex flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-\[inherit\] after:content-\[&#x27;&#x27;\] has-\[\[data-cds=CardLink\]:focus-visible\]:after:shadow-focus after:shadow-none gap-md"><span aria-hidden="true" class="cds-card-fill pointer-events-none absolute inset-0 -z-\[1\] m-0 rounded-\[inherit\] bg-surface-1"><\/span><div data-cds-card-body="" class="cds-card-body [^"]*p-lg">/);
  assert.doesNotMatch(html, /after:shadow-card-ring/, 'OD’s after:shadow-none replaces the card ring');
  assert.match(html, /<div class="flex flex-col gap-xs pt-md first:pt-0"><h3 class="text-caption text-secondary">Connectors &amp; tools<\/h3>/);
  // X rows with onClick: a ghost xs flush-both button (host SourceSettingsButton for the CDS Button: outset against
  // --cds-outset-x) holding the size-5 tile, the label and " · note".
  const buttons = [...html.matchAll(/<button [^>]*data-cds="Button"[^>]*>/g)].map(match => match[0]);
  assert.equal(buttons.length, 2);
  for (const button of buttons)
    assert.equal(button, '<button type="button" data-cds="Button" data-variant="ghost" data-flush="both" style="--cds-outset-x:var(--cds-pad-md)" data-size="xs" class="source-settings-button w-full justify-start">');
  assert.match(html, /<span class="ssb-content"><span class="flex min-w-0 flex-1 gap-xs items-center"><span aria-hidden="true" class="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-chip text-secondary bg-fill-control"><span aria-hidden="true" data-cds="Icon" class="text-muted-as-secondary" style="font-size:12px;/);
  assert.match(html, /<span data-cds="OverflowTooltip" class="block overflow-x-clip text-ellipsis whitespace-nowrap min-w-0 flex-1 text-footnote text-secondary"[^>]*>GitHub<span class="text-muted"> · gh<\/span><\/span>/);
  assert.match(html, />fx<\/span>/); assert.doesNotMatch(html, />fx<span class="text-muted">/, 'no note when the label is the server name');
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
  // The original X row: with onClick it is the (host) CDS Button, ghost xs flush-both, whose onClick is that handler.
  const row = shallow(Sections.OverviewRow, group.props.rows[0]);
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
  assert.match(html, /Connectors &amp; tools<\/h3><button type="button" data-cds="Button"[^>]*>.*GitHub<span class="text-muted"> · gh<\/span>/);
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

test('settings-14 the plugin page keeps the Settings import graph free of view-tabs preload-helper (document.createElement at evaluation)', () => {
  const ids = [...server.moduleGraph.idToModuleMap.keys()];
  assert.ok(ids.some(id => id.endsWith('/src/source-customize.jsx')));
  assert.deepEqual(ids.filter(id => /preload-helper|generated\/view-tabs\//.test(id)), []);
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
