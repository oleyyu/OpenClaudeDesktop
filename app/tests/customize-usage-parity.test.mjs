// Customize / Usage parity with Claude Desktop 2.2553.1: the assistant named in ported copy follows the running core,
// the Add skill / Add plugin menus, the custom connector and marketplace dialogs, the plugin detail header, the Hooks
// page in the Customize page shell, the single search focus ring and the Usage page's daily-usage note.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { customizeCore } from '../src/customize-model.mjs';
import { setLocale } from '../electron/i18n/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
let server, M, H, U, I;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-customize.jsx');
  H = await server.ssrLoadModule('/src/source-hooks-settings.jsx');
  U = await server.ssrLoadModule('/src/source-usage.jsx');
  I = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => { setLocale('en-US'); return server?.close(); });
const el = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const noBackend = () => { throw Error('SSR may not call the backend'); };
const readyStore = ({ skills = [], plugins = [], mcp = [] } = {}) => ({ getSnapshot: () => ({ skills: { skills, errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: plugins, status: 'ready', cwd: '/fixture' }, mcp: { rows: mcp, status: 'ready', cwd: '/fixture', threadId: null } }),
  subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} });

test('copy ported from Claude names the running core’s assistant, never a hard-coded DeepSeek', () => {
  const codex = customizeCore({ engine: 'codex', capabilities: {} });
  assert.equal(codex.skillsEmpty, 'Add skills to extend Codex’s capabilities.');
  assert.equal(codex.connectorsEmpty, 'Unlock more with Codex when you connect your team’s tools.');
  assert.equal(codex.pluginsEmpty, 'Give Codex role-level expertise with plugins');
  assert.equal(codex.skillDescriptionTooltip, 'Codex uses these descriptions when deciding which skills to use in chat.');
  assert.equal(codex.skillTriggerTooltips.auto, 'Codex runs this skill automatically when it’s relevant to your request.');
  assert.equal(codex.pluginTabDescriptions.skills, 'Invoke by typing / in chat, or let Codex use them automatically for relevant tasks.');
  assert.equal(codex.connectorRemoveNote, 'However, Codex won’t be able to access new content or perform new tasks.');
  for (const engine of ['codex', 'zcode', 'opencode', 'kimi', 'gemini', 'qwen'])
    assert.doesNotMatch(JSON.stringify(customizeCore({ engine, capabilities: {} })), /extend DeepSeek|with DeepSeek|let DeepSeek|so DeepSeek|DeepSeek won’t|DeepSeek uses|DeepSeek runs|DeepSeek can/, engine);
  assert.equal(customizeCore({ engine: 'deepseek-harness', capabilities: {} }).skillsEmpty, 'Add skills to extend DeepSeek’s capabilities.');
  setLocale('zh-CN');
  try {
    const zh = customizeCore({ engine: 'codex', capabilities: {} });
    assert.equal(zh.pluginTabDescriptions.skills, '在聊天中输入 / 调用，或让 Codex 在相关任务中自动使用。');
    assert.equal(zh.skillsEmpty, '添加技能以扩展 Codex 的能力。');
  } finally { setLocale('en-US'); }
});

test('Skills: the header and the empty state hold the Add skill menu; the folders are a footnote without a New skill… button', () => {
  const listed = el(M.SourceCustomize, { section: 'customize-skills', store: readyStore({ skills: [{ id: 's', name: 'pdf', skillName: 'pdf', path: '/x/pdf/SKILL.md', scope: 'user', enabled: true, group: 'personal', description: 'PDF', updatedAt: 1 }] }), cwd: '/fixture', call: noBackend, core: { engine: 'codex', capabilities: {} } });
  assert.match(listed, /<div class="cz-actions"><button aria-label="Add skill" aria-haspopup="menu" aria-expanded="false"[^>]*data-variant="primary"[^>]*>.*?>Add<\/span><\/button><\/div>/);
  assert.match(listed, /data-cz-skill-roots=""><p class="cz-muted">To add your own skill/);
  assert.doesNotMatch(listed, /New skill…|cz-new-skill/);
  // A core without skill folders or installs draws no menu.
  assert.doesNotMatch(el(M.SourceCustomize, { section: 'customize-skills', store: readyStore(), cwd: '/fixture', call: noBackend, core: { engine: 'nothing', capabilities: {} } }), /aria-label="Add skill"/);
  const form = el(M.CreateSkillForm, { root: '~/.codex/skills', call: noBackend, onClose() {} });
  assert.match(form, /<form class="cz-dialog-form" aria-label="Create a skill"/);
  assert.match(form, /placeholder="Skill name"/);
  assert.match(form, /Creates ~\/\.codex\/skills\/&lt;name&gt;\/SKILL\.md and opens it\./);
  assert.match(form, /<footer class="sdlg-footer[^"]*">.*?>Cancel<.*?<button disabled="" type="submit"[^>]*data-variant="primary"[^>]*>.*?>Create skill</);
  assert.equal(M.skillOwnRoot(['<project>/.dsh/skills', '~/.dsh/skills']), '~/.dsh/skills');
});

test('Add custom connector is the official dialog body: stacked placeholder-label fields with hints, Advanced settings, Cancel / Add', () => {
  const form = el(M.AddConnectorForm, { onSubmit() {}, onCancel() {}, busy: false, existingNames: [], copy: customizeCore({ engine: 'codex', capabilities: {} }) });
  assert.match(form, /^<form class="cz-dialog-form" aria-label="Add custom connector">/);
  assert.match(form, /role="radiogroup" aria-label="Connector type"/);
  assert.match(form, /aria-label="Connector name" placeholder="Name"/);
  assert.match(form, /Shown in the connectors list\./);
  assert.match(form, /aria-label="URL" placeholder="MCP server URL"/);
  assert.match(form, /The HTTPS address where the server accepts MCP requests/);
  assert.match(form, /Advanced settings/);
  assert.match(form, /<p class="cz-dialog-note">Saved to ~\/\.codex\/config\.toml, shared with the Codex CLI\.<\/p>/);
  assert.match(form, /<footer class="sdlg-footer[^"]*">.*?>Cancel<.*?<button disabled="" type="submit"[^>]*data-variant="primary"[^>]*>.*?>Add<\/span><\/button><\/footer>/);
  assert.doesNotMatch(form, /cz-field|cz-form|<h3/, 'no inline two-column card');
  const page = el(M.SourceCustomize, { section: 'customize-connectors', store: readyStore(), cwd: '/fixture', call: noBackend });
  assert.doesNotMatch(page, /cz-form/);
});

test('plugin detail header: only the ⋯ menu and the switch beside the title; sharing is the notice row below', () => {
  const plugin = { id: 'tool@local', name: 'Code Review Toolkit', pluginName: 'tool', enabled: true, source: 'local', sourcePath: '/p/tool' };
  const manage = el(M.PluginManageControls, { plugin, store: {}, actions: { canToggle: true, canRemove: true, toggle() {}, remove() {} } });
  const notices = React.createElement(M.PluginShareControls, { plugin, store: {} });
  const html = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin, detail: { description: 'x' }, error: '', skills: [], view: null, onView() {}, onBack() {}, onSkill() {},
    manage: React.createElement('span', { 'data-manage': '' }), notices }));
  const head = html.match(/<header class="cz-plugin-head">.*?<\/header>/)[0];
  assert.doesNotMatch(head, /data-plugin-share|Share this plugin/);
  assert.match(html, /<\/header><div class="cz-plugin-notices" data-plugin-notices=""><div class="cz-plugin-share" data-plugin-share="">/);
  assert.match(manage, /^<div class="cz-plugin-manage" data-plugin-manage=""><button aria-label="More options for Code Review Toolkit" aria-haspopup="menu"/);
  assert.doesNotMatch(manage, />Remove</);
  const css = readFileSync(path.join(app, 'src/source-customize.css'), 'utf8');
  assert.match(css, /\.cz-plugin-manage \{ display:flex; flex-shrink:0;/);
  assert.match(css, /\.cz-plugin-notices:empty \{ display:none; \}/);
});

test('Plugins on a native core: the header action is the Add plugin menu; the marketplace form is a dialog body', () => {
  const page = el(M.SourceCustomize, { section: 'customize-plugins', store: { ...readyStore(), loadPluginCatalog() {}, loadMarketplaces() {} }, cwd: '/fixture', call: noBackend, core: { engine: 'codex', capabilities: {} } });
  assert.match(page, /aria-label="Add plugin" aria-haspopup="menu"/);
  assert.doesNotMatch(page, />Add marketplace<|cz-form/);
});

test('Hooks: the Customize page shell — header with search and a Refresh tooltip, ListTable rows and the shared Badge', () => {
  const view = { total: 2, needsReview: 1, warnings: [], errors: [], groups: [
    { event: 'preToolUse', name: 'PreToolUse', description: 'Before a tool runs', hooks: [
      { key: 'a', matcher: 'Bash', what: 'echo guard', async: false, source: 'Your config', sourcePath: '~/.codex/hooks.json', pluginId: null, enabled: true, managed: false, trust: 'untrusted', needsReview: true, active: false },
      { key: 'b', matcher: null, what: 'audit', async: true, source: 'Managed by your organization', sourcePath: '', pluginId: null, enabled: true, managed: true, trust: 'managed', needsReview: false, active: true }] }] };
  const html = el(H.SourceHooksSettings, { boot: { connected: true }, engine: 'codex', customize: { call: noBackend }, cwd: '/w', initialState: { status: 'ready', view, error: '' } });
  assert.match(html, /<header class="cz-header"><h2 class="cz-title text-heading-medium">Hooks<\/h2><div class="cz-header-controls"><button type="button" class="cz-search-toggle"[^>]*aria-label="Search hooks"/);
  assert.match(html, /aria-label="Refresh"/);
  assert.match(html, /<table class="cz-table" data-cds="Table" aria-label="Hooks"><thead><tr><th scope="col" class="cz-col-40">Event<\/th><th scope="col" class="cz-col-20">Matcher<\/th><th scope="col">Command<\/th><th scope="col" class="cz-col-32">Source<\/th>/);
  assert.match(html, /<tr data-hook="a" data-hook-active="false">/);
  assert.match(html, /<span class="cz-badge" data-variant="default" data-size="xs" title="New: review it before it runs">Needs review<\/span>/);
  assert.match(html, /<span class="cz-badge" data-variant="default" data-size="xs">Managed<\/span>/);
  assert.match(html, />Trust<\/span><\/button><button class="ss-switch/);
  assert.doesNotMatch(html, /hk-badge|Loading hooks…|SettingsGroup|ss-group/);
  const loading = el(H.SourceHooksSettings, { boot: { connected: true }, engine: 'codex', customize: { call: noBackend }, cwd: '/w', initialState: { status: 'loading', view: null, error: '' } });
  assert.match(loading, /data-cz-skeleton="hooks"/);
  const empty = el(H.SourceHooksSettings, { boot: { connected: true }, engine: 'kimi', customize: { call: noBackend }, cwd: '/w', initialState: { status: 'ready', view: { total: 0, needsReview: 0, warnings: [], errors: [], groups: [] }, error: '' } });
  assert.match(empty, /data-cds="Pictogram"[\s\S]*<p class="max-w-xs text-pretty text-body text-secondary">Kimi Code has no hooks for this folder\.<\/p>/);
  assert.deepEqual(H.hookRows(view, 'guard').map((row) => row.key), ['a']);
  assert.deepEqual(H.hookRows(view, 'pretooluse').map((row) => row.key), ['a', 'b']);
  assert.doesNotMatch(readFileSync(path.join(app, 'src/hooks-settings.css'), 'utf8'), /9999px/);
});

test('one focus ring on search fields: the dialog’s generic input outline skips the nav and Customize search inputs', () => {
  const settings = readFileSync(path.join(app, 'src/source-settings.css'), 'utf8');
  assert.match(settings, /\.ss-dialog :is\(button:not\(\.ss-switch\):not\(\.source-settings-button\),input:not\(:where\(\.ss-search,\.cz-search\) input\),select\):focus-visible/);
  assert.match(readFileSync(path.join(app, 'src/source-customize.css'), 'utf8'), /\.ss-dialog \.cz-page \.cz-search\[role=search\] input:focus-visible \{ outline:none;box-shadow:none; \}/);
});

test('clicking the current Customize nav entry returns a drill-in to its list', () => {
  const source = readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.match(source, /const customizeNavFocus = entry => entry\.customize&&entry\.id===tab\?\{reset:Date\.now\(\)\}:null;/);
  assert.match(source, /setFocus\(customizeNavFocus\(t\)\)/);
});

test('Usage: the daily-usage failure is one translated line only when no daily view is drawn; local bars share one grid', () => {
  assert.equal(el(U.TokenUsageNote, { error: 'No settings fixture response', shown: true, engine: 'codex' }), '');
  assert.equal(el(U.TokenUsageNote, { error: 'No settings fixture response', shown: false, engine: 'codex' }),
    '<p class="su-note" title="No settings fixture response">Couldn’t load daily usage from Codex.</p>');
  // The SSR module graph has its own i18n instance.
  I.setLocale('zh-CN');
  try { assert.match(el(U.TokenUsageNote, { error: 'x', shown: false, engine: 'codex' }), />无法从 Codex 加载每日用量。</); } finally { I.setLocale('en-US'); }
  const local = { models: [{ model: 'm1', share: 1, tokens: 1000 }, { model: 'm2', share: 0.25, tokens: 250 }], daily: [], dailyLabel: 'Last 30 days', total: 1250 };
  const html = el(U.LocalUsage, { local, modelNames: new Map([['m1', 'Test model'], ['m2', 'Test model 2']]) });
  assert.match(html, /<span class="su-meter" aria-hidden="true"><span class="su-indicator" style="--usage-percent:25\.0%"><\/span><\/span>/);
  assert.doesNotMatch(html, /su-bar/);
  assert.match(readFileSync(path.join(app, 'src/source-usage.css'), 'utf8'), /\.su-models\.su-local-models\{[^}]*display:grid;grid-template-columns:max-content minmax\(0,1fr\) auto/);
});
