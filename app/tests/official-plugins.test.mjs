import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { customizeCore, localizedMetaText, pluginRows } from '../src/customize-model.mjs';

const deepseekCopy = customizeCore({ engine: 'deepseek-harness', capabilities: { pluginManage: true } });

// Customize › Plugins on the DeepSeek core: the Harness "Official" bundles
// (dsh-app-boot OPTIONAL_BUNDLES) as Claude Directory cards above the installed table.
let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

const icon = 'data:image/svg+xml;base64,PHN2Zy8+';
const summary = (id, codeDesktop, extra = {}) => ({ id, name: id, version: '0.2.0', installed: true, enabled: false, source: { type: 'local' }, interface: { displayName: id, shortDescription: 'raw' }, codeDesktop, ...extra });
const response = { marketplaces: [{ name: 'deepseek-harness', path: '/p', interface: { displayName: 'DeepSeek Harness profile' }, plugins: [
  summary('@deepseek-ai/dsh-experimental-auto-review', { optional: true, held: false, experimental: true, removable: false, readOnlyReason: null, loadError: null, title: { en: 'Auto review', zh: '自动审查' }, description: { en: 'Reviews tools', zh: '审查工具' }, icon, components: 3 }),
  summary('dsh-plugin-whale', { optional: false, held: true, experimental: false, removable: true, readOnlyReason: null, loadError: null, title: null, description: null, icon: null, components: 1 }, { enabled: true }),
  summary('@deepseek-ai/dsh-base', { optional: false, held: false, experimental: false, removable: false, readOnlyReason: 'management-required', loadError: null }),
] }] };

test('plugin rows: Official bundles, localized meta, icon and the core layers', () => {
  const rows = pluginRows(response);
  const review = rows.find(row => row.id.endsWith('auto-review'));
  assert.deepEqual([review.name, review.description, review.official, review.experimental, review.icon, review.components, review.manageable], ['Auto review', 'Reviews tools', true, true, icon, 3, true]);
  const whale = rows.find(row => row.id === 'dsh-plugin-whale');
  assert.deepEqual([whale.name, whale.official, whale.core], ['dsh-plugin-whale', false, false]);
  assert.equal(rows.find(row => row.id === '@deepseek-ai/dsh-base').core, true);
  assert.equal(localizedMetaText({ en: 'A', zh: '甲' }, 'zh-CN'), '甲');
  assert.equal(localizedMetaText({ en: 'A', zh: '甲' }, 'en-US'), 'A');
  assert.equal(localizedMetaText({ fr: 'Seulement' }, 'zh-CN'), 'Seulement');
  assert.equal(localizedMetaText(null), '');
  // A bundle the person installed is never Official, whatever else the core reports (a bridge marking every plugin optional).
  const own = pluginRows({ marketplaces: [{ name: 'local', plugins: [summary('my-plugin', { optional: true, held: false, removable: true, readOnlyReason: null })] }] });
  assert.equal(own[0].official, false);
});

test('Official cards: Claude Directory card with icon, by DeepSeek · version, Experimental and a switch', () => {
  const rows = pluginRows(response).filter(row => row.official);
  const store = { setPluginEnabled() { throw Error('SSR'); } };
  const html = renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows, store, manage: true, onOpen() {}, copy: deepseekCopy }));
  assert.match(html, /<section class="cz-official" aria-label="Official" data-cz-official="">/);
  assert.match(html, /data-official-plugin="@deepseek-ai\/dsh-experimental-auto-review" data-plugin-enabled="false"/);
  assert.match(html, /aria-label="View Auto review"/);
  assert.match(html, new RegExp(`<img src="${icon.replace(/[+/]/g, '\\$&')}" alt="" draggable="false"/>`));
  assert.match(html, /<span>Ships with DeepSeek Harness, off until you turn it on\.<\/span>/);
  assert.match(html, /<span class="cz-official-meta">by DeepSeek · v0\.2\.0<\/span>/);
  // Another core's Official bundles name that core and its vendor.
  const zcode = renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows, store, copy: customizeCore({ engine: 'zcode', capabilities: { pluginManage: true } }) }));
  assert.match(zcode, /<span>Ships with ZCode, off until you turn it on\.<\/span>/);
  assert.match(zcode, /<span class="cz-official-meta">by Z\.ai \(Zhipu\) · v0\.2\.0<\/span>/);
  assert.doesNotMatch(zcode, /DeepSeek/);
  assert.match(html, />Experimental</);
  assert.match(html, /aria-label="Enable plugin" aria-checked="false"/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows, store, manage: false })), /role="switch"|cz-official-open/, 'no switch without plugin management, no open button without onOpen');
  assert.equal(renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows: [], store })), '');
});

test('the Plugins page puts Official cards above the installed table, and the detail shows icon, badges and version', () => {
  const rows = pluginRows(response);
  const store = {
    getSnapshot: () => ({ skills: { skills: [], errors: [], status: 'ready', cwd: '/f' }, plugins: { rows, status: 'ready', cwd: '/f' }, mcp: { rows: [], status: 'ready', cwd: '/f', threadId: null }, pluginOps: { install: null, restartRequired: false } }),
    subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {},
  };
  const core = { engine: 'deepseek-harness', capabilities: { pluginManage: true } };
  const html = renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-plugins', store, cwd: '/f', call() { throw Error('SSR'); }, core }));
  assert.ok(html.indexOf('data-cz-official') < html.indexOf('data-plugin-id="dsh-plugin-whale"'));
  assert.doesNotMatch(html, /data-plugin-id="@deepseek-ai\/dsh-experimental-auto-review"/, 'an Official bundle is not repeated in the table');
  // B24: the rest is the c6a2a31c4 "Your plugins" list (section header with its count), not an "Installed" table.
  assert.match(html, /data-testid="plugins-tabbed-list-mine"><section class="flex flex-col" data-cz-list-section="marketplaces"><div [^>]*data-testid="yours-section-marketplaces-header"[^>]*><span class="text-body-medium text-primary">From marketplaces you added<\/span><span class="text-footnote text-muted">· 1<\/span>/);
  assert.doesNotMatch(html, /<h3>Installed<\/h3>|<table/);
  assert.doesNotMatch(html, /data-plugin-id="@deepseek-ai\/dsh-base"/, 'the profile core layers are hidden, like the Harness Plugins page');
  const review = rows.find(row => row.official);
  const detail = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: review, detail: { description: 'Reviews tools' }, error: '', skills: [], view: null, onView() {}, onBack() {}, onSkill() {} }));
  assert.match(detail, /<header class="cz-plugin-head"><span class="cz-plugin-icon cz-plugin-icon-lg"/);
  assert.match(detail, /<h2 class="text-heading-semibold">Auto review<\/h2><span[^>]*>Official<\/span><span[^>]*>Experimental<\/span><span[^>]*>Disabled<\/span>/);
  assert.match(detail, /<p class="cz-plugin-byline">@deepseek-ai\/dsh-experimental-auto-review · 3 components<\/p>/);
  assert.match(detail, /<div><span>Version<\/span><div class="cz-tabular">0\.2\.0<\/div><\/div>/);
});

test('the install form offers the Harness install sources on the DeepSeek core only', () => {
  const html = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store: {}, install: null, onClose() {}, copy: deepseekCopy }));
  assert.match(html, /Install a plugin into DeepSeek Harness from npm, a local folder \(absolute path\), a git URL or a tarball\./);
  assert.match(html, /placeholder="@scope\/dsh-plugin or \/path\/to\/plugin"/);
  assert.match(html, /role="radiogroup" aria-label="Install source"/);
  for (const label of ['Automatic', 'Official npm registry', 'Mainland China mirror']) assert.match(html, new RegExp(`aria-label="${label}"`));
  assert.deepEqual(M.PLUGIN_REGISTRY_OPTIONS.map(option => option.value), ['', 'https://registry.npmjs.org/', 'https://registry.npmmirror.com/']);
  // A bridge's plugin manager ignores npm registries: no source picker, no Harness copy or placeholder. The format
  // and placeholder come from the core's descriptor (plugins.format / plugins.placeholder).
  for (const [engine, format, placeholder] of [
    ['zcode', 'A local folder with .zcode-plugin/plugin.json, or name@marketplace.', '/path/to/plugin or name@marketplace'],
    ['opencode', 'An npm package name or the path to a plugin folder.', 'package-name or /path/to/plugin-folder'],
    ['mimo', 'An npm package name or a file path to a plugin module.', 'package-name or /path/to/plugin.js'],
    ['kimi', 'A local plugin folder, a .zip URL, or a GitHub repository URL.', '/path/to/plugin or https://github.com/owner/repo']]) {
    const bridge = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store: {}, install: null, onClose() {}, copy: customizeCore({ engine, capabilities: { pluginManage: true } }) }));
    assert.doesNotMatch(bridge, /Install source|DeepSeek|dsh-plugin/, engine);
    assert.match(bridge, /Install a plugin into (ZCode|OpenCode|MiMo Code|Kimi Code)\. Plugins run inside \1 with your user permissions/);
    assert.ok(bridge.includes(format), engine);
    assert.ok(bridge.includes(`placeholder="${placeholder}"`), engine);
  }
  // A plugin-managing core whose descriptor names no format gets the generic placeholder.
  const generic = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store: {}, install: null, onClose() {}, copy: customizeCore({ engine: 'qwen', capabilities: { pluginManage: true } }) }));
  assert.match(generic, /placeholder="Plugin name or path"/);
});

// ZCode's built-in plugins (zcode-bridge catalog.js pluginSummary): installPolicy INSTALLED_BY_DEFAULT, on by default,
// optional and not removable, with readOnlyReason 'Built into ZCode: turn it off instead.'. They stay Official, say they
// are on until turned off, and keep their switch (codeDesktop/plugin/setEnabled works for them); Remove is not offered.
test('ZCode built-in plugins: Official, on by default, switchable, never removable', () => {
  const zcodeCopy = customizeCore({ engine: 'zcode', capabilities: { pluginManage: true } });
  const builtIn = (id, enabled) => summary(id, { optional: true, held: false, experimental: false, removable: false, readOnlyReason: 'Built into ZCode: turn it off instead.', loadError: null, title: id, description: '', icon: null, components: ['skill', 'command'] }, { enabled, installPolicy: 'INSTALLED_BY_DEFAULT', source: { type: 'marketplace' } });
  const rows = pluginRows({ marketplaces: [{ name: 'zcode', plugins: [builtIn('glm-search', true), builtIn('glm-vision', false),
    summary('my-zcode-plugin', { optional: true, held: false, removable: true, readOnlyReason: null, components: ['skill'] }, { enabled: true, installPolicy: 'AVAILABLE' })] }] });
  const search = rows.find(row => row.id === 'glm-search');
  assert.deepEqual([search.official, search.manageable, search.removable, search.installPolicy, search.components], [true, true, false, 'INSTALLED_BY_DEFAULT', 2]);
  assert.deepEqual(rows.find(row => row.id === 'my-zcode-plugin').official, false, 'a plugin the person installed is never Official');
  const official = rows.filter(row => row.official);
  const store = { setPluginEnabled() { throw Error('SSR'); } };
  const html = renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows: official, store, manage: true, copy: zcodeCopy }));
  assert.match(html, /<span>Ships with ZCode, on until you turn it off\.<\/span>/);
  assert.match(html, /data-official-plugin="[^"]*glm-search[^"]*"[^]*?aria-label="Enable plugin" aria-checked="true"/);
  assert.match(html, /data-official-plugin="[^"]*glm-vision[^"]*"[^]*?aria-label="Enable plugin" aria-checked="false"/);
  const controls = renderToStaticMarkup(React.createElement(M.PluginManageControls, { plugin: search, store, copy: zcodeCopy }));
  assert.match(controls, /aria-label="Enable plugin" aria-checked="true"/);
  assert.doesNotMatch(controls, />Remove</);
  // Mixed groups get the plain subtitle; the DeepSeek core's optional bundles keep "off until you turn it on".
  const mixed = renderToStaticMarkup(React.createElement(M.OfficialPlugins, { rows: [...official, { ...pluginRows(response).find(row => row.official) }], store, copy: zcodeCopy }));
  assert.match(mixed, /<span>Ships with ZCode\.<\/span>/);
  // A bundle the core locks (readOnlyReason, not optional) still gets no controls.
  assert.equal(pluginRows(response).find(row => row.id === '@deepseek-ai/dsh-base').manageable, false);
});
