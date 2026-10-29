// w13-chatfn-tools: electron/chat-context/tools.mjs (Research's instructions on a Chat thread/start|resume, Codex's
// per-conversation web_search, main.cjs "chat-tools") and its wiring in main.cjs / main.jsx (the Chat + menu as
// c752b32f8 Js on source-chat-tools-menu.jsx).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { applyChatContext } from '../electron/chat-context.mjs';
import * as tools from '../electron/chat-context/tools.mjs';
import os from 'node:os';
import { localProjects } from '../electron/local-projects.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { chatThinkingSection, thinkingModeMessages, toggleThinking, webSearchNudge } from '../src/chat-tools-model.mjs';
import { chatToolSlots, chatToolsMessages, RESEARCH_INSTRUCTIONS, searchSupport } from '../src/chat-tools-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const quiet = { warn() {}, log() {} };
const research = { chatTools: { defaults: {}, threads: { 'chat-1': { compass_mode: 'advanced', enabled_web_search: true } } } };
const config = (extra = {}) => ({ threadIds: ['chat-1', 'chat-2', 'code-1'], archivedThreadIds: ['chat-old'],
  sessionMetadata: { 'chat-1': { surface: 'chat' }, 'chat-2': { surface: 'chat' }, 'code-1': { surface: 'code' }, 'chat-old': { surface: 'chat' } }, ...extra });

let server, M, P, A, MM, PP, MW;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-chat-tools-menu.jsx');
  P = await server.ssrLoadModule('/src/generated/chat-projects/index.mjs');
  A = await server.ssrLoadModule('/src/source-project-v3-adapters.jsx');
  MM = await server.ssrLoadModule('/src/source-model-menu.jsx');
  PP = await server.ssrLoadModule('/src/source-chat-project-popup.jsx');
  MW = await server.ssrLoadModule('/src/generated/chat-messages/message-warning.mjs');
});
after(() => server?.close());

test('the contributor: Research adds its instructions to a Chat conversation only', async () => {
  assert.equal(tools.id, 'tools');
  assert.deepEqual(tools.surfaces, ['chat']);
  const c = config(research);
  assert.equal(await tools.apply({ config: c, method: 'thread/resume', params: { threadId: 'chat-1' }, surface: 'chat', threadId: 'chat-1' }), RESEARCH_INSTRUCTIONS);
  assert.equal(await tools.apply({ config: c, method: 'thread/resume', params: { threadId: 'chat-2' }, surface: 'chat', threadId: 'chat-2' }), null);
  assert.equal(await tools.apply({ config: c, method: 'thread/start', params: {}, surface: 'chat', threadId: null }), null, 'the New chat has no Research');
  assert.equal(await tools.apply({ config: config({ chatTools: { defaults: { compass_mode: 'advanced' } } }), method: 'thread/start', params: {}, surface: 'chat', threadId: null }), RESEARCH_INSTRUCTIONS);
  assert.equal(await tools.apply({ config: c, method: 'thread/resume', params: { threadId: 'chat-1' }, surface: 'cowork', threadId: 'chat-1' }), null);
});

test('the real contributor directory: a Research chat gets the block, a Code session stays byte-identical', async () => {
  const c = config(research);
  const chat = { threadId: 'chat-1', developerInstructions: 'Surface.' };
  const result = await applyChatContext(c, 'thread/resume', chat, null, { logger: quiet });
  assert.ok(result.contributors.includes('tools'), JSON.stringify(result));
  assert.ok(chat.developerInstructions.startsWith('Surface.\n\n') && chat.developerInstructions.includes(RESEARCH_INSTRUCTIONS));
  const code = { threadId: 'code-1', developerInstructions: 'Code.' };
  const before = JSON.stringify(code);
  await applyChatContext(config({ chatTools: { defaults: { compass_mode: 'advanced' }, threads: { 'code-1': { compass_mode: 'advanced' } } } }), 'thread/resume', code, null, { logger: quiet });
  assert.equal(JSON.stringify(code), before);
});

test('Codex’s web_search: the Chat conversation’s choice, else null (the global setting stays)', () => {
  const c = config({ codexWebSearch: 'cached', chatTools: { defaults: { enabled_web_search: false }, threads: { 'chat-1': { enabled_web_search: true }, 'code-1': { enabled_web_search: false } } } });
  assert.equal(tools.codexWebSearchFor(c, 'thread/start', {}, 'chat'), 'disabled', 'a new chat: the New chat’s');
  assert.equal(tools.codexWebSearchFor(c, 'thread/resume', { threadId: 'chat-1' }, null), 'cached', 'resume: the session’s surface and its own choice');
  assert.equal(tools.codexWebSearchFor(c, 'thread/resume', { threadId: 'chat-2' }, null), null, 'a conversation without its own: the global setting, not the New chat’s');
  assert.equal(tools.codexWebSearchFor(c, 'thread/resume', { threadId: 'code-1' }, null), null, 'Code keeps the global setting');
  assert.equal(tools.codexWebSearchFor(c, 'thread/start', {}, 'code'), null);
  assert.equal(tools.codexWebSearchFor(c, 'thread/start', {}, 'cowork'), null);
  assert.equal(tools.codexWebSearchFor(c, 'turn/start', { threadId: 'chat-1' }, null), null);
  assert.equal(tools.codexWebSearchFor(config({ chatTools: { threads: { 'chat-1': { compass_mode: 'advanced' } } } }), 'thread/resume', { threadId: 'chat-1' }, null), 'live');
  assert.equal(tools.codexWebSearchFor(config(), 'thread/resume', { threadId: 'chat-1' }, null), null, 'never chose');
});

test('main.cjs "chat-tools": the New chat’s or a known conversation’s switches; forget; read', () => {
  const c = config();
  assert.deepEqual(tools.chatToolsAction(c, { op: 'set', threadId: null, settings: { enabled_web_search: false } }), { defaults: { enabled_web_search: false }, threads: {} });
  assert.deepEqual(tools.chatToolsAction(c, { op: 'set', threadId: 'chat-old', settings: { compass_mode: 'advanced', junk: 1 } }).threads['chat-old'],
    { compass_mode: 'advanced' }, 'an archived conversation is known; it starts from what it showed (the global defaults, not the New chat’s)');
  assert.deepEqual(c.chatTools, tools.chatToolsAction(c, { op: 'read' }));
  assert.throws(() => tools.chatToolsAction(c, { op: 'set', threadId: 'nope', settings: { enabled_web_search: true } }), /Unknown session\./);
  assert.throws(() => tools.chatToolsAction(c, { op: 'set', threadId: null, settings: { junk: 1 } }), /Unsupported operation\./);
  assert.throws(() => tools.chatToolsAction(c, { op: 'drop' }), /Unsupported operation\./);
  assert.deepEqual(tools.chatToolsAction(c, { op: 'forget', threadId: 'chat-old' }).threads, {});
});

test('the New chat’s switches stay with the conversation started from it, and reach no other (review 1)', async () => {
  const c = config({ codexWebSearch: 'disabled' });
  c.sessionMetadata.old1 = { surface: 'chat' }; c.threadIds.push('old1');
  tools.chatToolsAction(c, { op: 'set', threadId: null, settings: { enabled_web_search: true, compass_mode: 'advanced' } });
  assert.equal(tools.codexWebSearchFor(c, 'thread/resume', { threadId: 'old1' }, null), null, 'an older conversation keeps the global setting');
  assert.equal(await tools.apply({ config: c, method: 'thread/resume', params: { threadId: 'old1' }, surface: 'chat', threadId: 'old1' }), null, 'and gets no Research');
  assert.equal(tools.codexWebSearchFor(c, 'thread/start', {}, 'chat'), 'live', 'the New chat searches');
  // thread/start succeeded: main.cjs seeds the new conversation where it records surface "chat".
  c.sessionMetadata.new1 = { surface: 'chat' }; c.threadIds.push('new1');
  assert.equal(tools.chatToolsStarted(c, 'new1'), true);
  assert.equal(tools.chatToolsStarted(c, 'new1'), false, 'once');
  assert.deepEqual(c.chatTools.threads.new1, { enabled_web_search: true, compass_mode: 'advanced' });
  tools.chatToolsAction(c, { op: 'set', threadId: null, settings: { enabled_web_search: false, compass_mode: null } });
  assert.equal(tools.codexWebSearchFor(c, 'thread/resume', { threadId: 'new1' }, null), 'live', 'a later New chat change doesn’t reach it');
  assert.equal(await tools.apply({ config: c, method: 'thread/resume', params: { threadId: 'new1' }, surface: 'chat', threadId: 'new1' }), RESEARCH_INSTRUCTIONS);
  const bare = config();
  assert.equal(tools.chatToolsStarted(bare, 'new2'), false);
  assert.equal(bare.chatTools, undefined, 'no switches chosen: nothing stored');
});

test('main.cjs: the Codex decoration asks the conversation first; "chat-tools" saves', () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  const line = main.split('\n').find(text => text.includes('codexWebSearchFor('));
  assert.ok(line, 'one decoration line');
  assert.match(line, /const search = \(await import\('\.\/chat-context\/tools\.mjs'\)\)\.codexWebSearchFor\(config, p\.method, params, requestedSurface\) \?\? \(\["disabled", "cached", "live"\]\.includes\(config\.codexWebSearch\) \? config\.codexWebSearch : null\);/);
  const at = main.indexOf(line);
  assert.ok(main.indexOf('if (search && p.method !== "turn/start") params.config = {', at) - at < 400, 'the override goes where the global one went');
  assert.ok(main.lastIndexOf('const requestedSurface = takeSurface(params);', at) > 0);
  const seed = main.indexOf('if (requestedSurface === "chat" && (await import(\'./chat-context/tools.mjs\')).chatToolsStarted(config, result.thread.id)) emitConfig();');
  assert.ok(seed > 0 && seed > main.indexOf('surface: requestedSurface, ...(project ? { projectId: project.id } : {})') && seed < main.indexOf('config.threadIds = [', seed),
    'thread/start seeds the conversation where it records its surface');
  assert.match(main, /case "chat-tools": \{ const store = \(await import\('\.\/chat-context\/tools\.mjs'\)\)\.chatToolsAction\(config, p\); if \(p\.op !== "read"\) \{ save\(\); emitConfig\(\); \} return store; \}/);
});

test('main.jsx: Chat’s + menu is Js with the conversation’s switches, a gated-off Plugins row and Memory', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const add = main.indexOf('case "add": {');
  const start = main.indexOf('if (mode === "chat") {', add), end = main.indexOf('return <ChatAddMenuItems entries={chatAddMenuEntries(slots)} />;', add);
  assert.ok(add > 0 && start > add && end > start && end < main.indexOf('case "titlebar":'));
  const chat = main.slice(start, end);
  for (const piece of ['searchSupport({ codexNative, toolSelection, catalog: toolsCatalog })', 'chatSettingsFor(boot?.config?.chatTools, current || null)',
    'selection: sessionTools', 'call("chat-tools", { op: "set", threadId: current || null, settings: result.settings })', 'setSessionTools(result.selection)',
    'toggleWebSearch({ ...toolsInput, on: !toolSlots.webSearch.checked })', 'toggleResearch({ ...toolsInput, on: !toolSlots.research.checked })',
    't(chatToolsMessages.webSearchAutoEnabled.defaultMessage)', 'teach: addTeachRow, skills: addSkillsRow', 'connectors: addConnectorsRow',
    'plugins: { type: "button", label: t(chatToolsMessages.plugins.defaultMessage), icon: "Plugin", disabled: true, tooltip: t(chatToolsMessages.pluginsUnavailableInChat.defaultMessage) }',
    'memory: { type: "checkbox", label: t("Memory"), icon: "Memory", checked: memoryOn, closeOnClick: true']) assert.ok(chat.includes(piece), piece);
  assert.doesNotMatch(chat, /addFolder|github|Slash commands|add-tools/, 'no Add folder / GitHub / Slash commands / Tools in Chat');
  // The Code menu still renders the same host rows.
  const code = main.slice(end, main.indexOf('case "titlebar":'));
  for (const row of ['{addTeachRow}', '{addSkillsRow}', '{addConnectorsRow}', '{t("Slash commands")}', 'data-testid="add-tools"']) assert.ok(code.includes(row), row);
  assert.ok(code.indexOf('{addTeachRow}') < code.indexOf('{addSkillsRow}') && code.indexOf('{addSkillsRow}') < code.indexOf('{addConnectorsRow}'));
  assert.doesNotMatch(code, /mode === "chat"/, 'the Chat-only rows moved to the Chat branch');
});

test('the Chat menu as main.jsx composes it: Js order, testids, the Plugins reason, the switches’ handlers', () => {
  const calls = [];
  const row = name => React.createElement('span', { 'data-row': name });
  const support = searchSupport({ codexNative: true });
  const slotsFor = toolSlots => ({
    ...M.chatAddMenuSlots({ attach: () => calls.push('attach'), attachShortcut: 'cmd+u', screenshot: () => calls.push('shot'), teach: row('teach'), skills: row('skills'),
      connectors: row('connectors'),
      webSearch: toolSlots.webSearch && { ...toolSlots.webSearch, onToggle: () => calls.push('web') },
      research: toolSlots.research && { ...toolSlots.research, tooltip: toolSlots.research.tooltip?.defaultMessage, onToggle: () => calls.push('research') } }),
    plugins: { type: 'button', label: 'Plugins', icon: 'Plugin', disabled: true, tooltip: chatToolsMessages.pluginsUnavailableInChat.defaultMessage },
    memory: { type: 'checkbox', label: 'Memory', icon: 'Memory', checked: true, closeOnClick: true, onAction: () => calls.push('memory') },
  });
  const entries = M.chatAddMenuEntries(slotsFor(chatToolSlots({ support, settings: { compass_mode: 'advanced' } })));
  assert.deepEqual(entries.map(e => e.testId ?? e.label), ['add-menu-upload-file', 'teach', 'add-menu-screenshot', 'separator-tools', 'skills', 'connectors',
    'add-menu-plugins', 'separator-modes', 'add-menu-research', 'add-menu-web-search', 'Memory']);
  const byId = id => entries.find(e => (e.testId ?? e.label) === id);
  assert.deepEqual([byId('add-menu-plugins').disabled, byId('add-menu-plugins').tooltip], [true, chatToolsMessages.pluginsUnavailableInChat.defaultMessage]);
  assert.deepEqual([byId('add-menu-research').checked, byId('add-menu-web-search').checked, byId('Memory').checked], [true, true, true]);
  byId('add-menu-web-search').onAction(); byId('add-menu-research').onAction(); byId('Memory').onAction();
  assert.deepEqual(calls, ['web', 'research', 'memory']);
  const html = renderToStaticMarkup(React.createElement(M.ChatAddMenuItems, { entries }));
  const order = ['Add files or photos', 'data-row="teach"', 'Take a screenshot', 'data-row="skills"', 'data-row="connectors"', 'data-testid="add-menu-plugins"',
    'data-testid="add-menu-research"', 'data-testid="add-menu-web-search"', '>Memory<'].map(s => html.indexOf(s));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), `row order ${order}`);
  assert.equal(html.split('role="separator"').length - 1, 2);
  // A core without web search: no Web search row, Research disabled with yz's reason.
  const none = M.chatAddMenuEntries(slotsFor(chatToolSlots({ support: searchSupport({}) })));
  assert.equal(none.some(e => e.testId === 'add-menu-web-search'), false);
  assert.deepEqual([none.find(e => e.testId === 'add-menu-research').disabled, none.find(e => e.testId === 'add-menu-research').tooltip],
    [true, chatToolsMessages.researchNeedsSearchIntegration.defaultMessage]);
});

// ── chatfn-23 (the review's 补做): a project's recommended tools ──────────────────────────────────────────────────
test('local-projects update keeps the project’s recommended tools (c9b54eb90 _e settings), validated and merged', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w13-tools-'));
  try {
    const c = { localProjects: [] };
    const project = await localProjects(c, { action: 'create', name: 'Billing' }, { dataDir });
    await localProjects(c, { action: 'update', id: project.id, settings: { enabled_web_search: true, recommended_mcp_servers: ['github'] } }, { dataDir });
    const next = await localProjects(c, { action: 'update', id: project.id, settings: { compass_mode: 'advanced', recommended_mcp_servers: [] } }, { dataDir });
    assert.deepEqual(next.settings, { enabled_web_search: true, compass_mode: 'advanced', recommended_mcp_servers: [] });
    for (const settings of [{ enabled_web_search: 1 }, { anything: true }, null, { recommended_mcp_servers: [''] }])
      await assert.rejects(localProjects(c, { action: 'update', id: project.id, settings }, { dataDir }), /Invalid project settings\./);
    assert.equal(c.chatTools, undefined, 'recommending switches no conversation');
  } finally { fs.rmSync(dataDir, { recursive: true, force: true }); }
});

const h = React.createElement;
const stripTools = (extra = {}) => ({ support: { kind: 'codex' }, thinking: true, connectors: [{ name: 'github', title: 'GitHub', connected: true, enabled: false }],
  settings: { enabled_web_search: false }, selection: null, globalMode: null, apply() {}, ...extra });
const withProject = (project, toolsHost, element) => {
  const Recommendations = ({ children }) => h(A.ProjectRecommendationsContext.Provider, { value: P.useProjectRecommendations(project) }, children);
  return h(A.LocalProjectContext.Provider, { value: { tools: toolsHost, update: async () => {}, save: async () => {} } }, h(Recommendations, null, element));
};

test('SSR: the rail slots the recommended tools (De) under the instructions; kG (haystack) off renders nothing there (E69)', () => {
  const project = { uuid: 'p1', name: 'Billing', prompt_template: '', settings: { enabled_web_search: true, compass_mode: null, recommended_mcp_servers: ['github'] } };
  const html = renderToStaticMarkup(withProject(project, stripTools(), h(P.ProjectInstructionsSection, { project, canEditKnowledgeBase: true, isProjectShared: false, onConnectorClick() {} })));
  assert.ok(html.indexOf('>Instructions</h3>') < html.indexOf('<div class="mt-2"></div>'), 'ri’s empty slot under the instructions');
  // w13-close-chat-project-rows (E69): De's first line is `if (!Z() || …) return null`, Z = shared-182 kG
  // (va("haystack").isAvailable), off without an account (E49): no tiles, no “Some tools are off · Turn on”.
  assert.equal(A.HAYSTACK_AVAILABLE, false);
  assert.ok(!html.includes('Some tools are off') && !html.includes('bg-surface-3 justify-center rounded-md'));
  const generated = fs.readFileSync(path.join(app, 'src/generated/chat-projects/c9b54eb90-C9rXk4ZP.mjs'), 'utf8');
  assert.ok(generated.includes('useIntegrationsAvailable as Z,') && generated.includes('if (!Z() || (!n && x.length === 0)) return null;'));
  const on = renderToStaticMarkup(withProject(project, stripTools({ settings: { enabled_web_search: true }, connectors: [{ name: 'github', title: 'GitHub', connected: true, enabled: true }] }),
    h(P.ProjectInstructionsSection, { project, canEditKnowledgeBase: true, isProjectShared: false, onConnectorClick() {} })));
  assert.ok(!on.includes('Some tools are off') && !on.includes('opacity-30'));
  const none = { ...project, settings: {} };
  const bare = renderToStaticMarkup(withProject(none, stripTools(), h(P.ProjectInstructionsSection, { project: none, canEditKnowledgeBase: true, isProjectShared: false, onConnectorClick() {} })));
  assert.ok(!bare.includes('bg-surface-3 justify-center rounded-md') && !bare.includes('Some tools are off'));
});

test('ye’s handlers switch the New chat and the connector, never the project; je lists the switches and saves _e’s settings', async () => {
  const project = { uuid: 'p1', name: 'Billing', prompt_template: '', settings: { enabled_web_search: true, recommended_mcp_servers: ['github'] } };
  const applied = [], updates = [];
  let strip;
  const Probe = () => { strip = A.useRecommendedToolConfigs({ project, source: 'recommendedToolsSection' }); return null; };
  renderToStaticMarkup(withProject(project, stripTools({ apply: change => applied.push(change) }), h(Probe)));
  assert.deepEqual(strip.toolConfigs.map(c => [c.tool.id, c.isEnabled]), [['builtin:web-search', false], ['mcp:github', false]]);
  strip.enableAllTools();
  strip.disableTool('builtin:web-search');
  assert.deepEqual(applied, [{ settings: { enabled_web_search: true }, connectors: [{ name: 'github', on: true }] }, { settings: { enabled_web_search: false }, connectors: [] }]);
  // je: Tools (the builtins pe offers) and Connectors as CDS switches, the recommended ones checked; Save → _e update → local-projects settings.
  let mutation;
  const MutationProbe = () => { mutation = A.useProjectMutation('p1'); return null; };
  renderToStaticMarkup(h(A.LocalProjectContext.Provider, { value: { update: async patch => { updates.push(patch); return patch; } } }, h(MutationProbe)));
  mutation.mutate({ settings: { enabled_web_search: false, recommended_mcp_servers: [] } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(updates, [{ settings: { enabled_web_search: false, recommended_mcp_servers: [] } }]);
  const view = renderToStaticMarkup(withProject(project, stripTools(), h(P.ProjectToolsView, { project, onClose() {} })));
  assert.match(view, /<h2 class="text-title font-semibold font-header text-primary">Power your project with tools<\/h2>/);
  assert.ok(view.indexOf('>Tools</h3>') > 0 && view.indexOf('>Connectors</h3>') > view.indexOf('>Tools</h3>'));
  for (const name of ['Web search', 'Research', 'GitHub']) assert.ok(view.includes(`aria-label="${name}"`), name);
  assert.ok(!view.includes('aria-label="Extended thinking"'), '_e skips builtin:extended-thinking');
  assert.ok(view.includes('>Save<') && view.includes('>Cancel<'));
  const unsearchable = renderToStaticMarkup(withProject(project, stripTools({ support: { kind: 'none' }, connectors: [] }), h(P.ProjectToolsView, { project, onClose() {} })));
  assert.ok(unsearchable.includes('No available tools.'), 'a core without search and no connectors: nothing to recommend');
});

test('the host page feeds the strip: no hideRecommendedTools, _e once, main.jsx’s New chat tools', () => {
  const page = fs.readFileSync(path.join(app, 'src/source-projects.jsx'), 'utf8');
  assert.doesNotMatch(page, /<ProjectInstructionsSection[^>]*hideRecommendedTools/);
  assert.ok(page.includes('<ProjectRecommendations project={record}>') && page.includes('const value = useProjectRecommendations(project);'));
  assert.ok(page.includes('tools: projectTools,'));
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /<SourceProjects call=\{call\} [^\n]*projectTools=\{projectTools\} \/>/);
  const block = main.slice(main.indexOf('const projectTools = section === "projects" ? {'), main.indexOf('} : undefined;', main.indexOf('const projectTools = section === "projects" ? {')));
  for (const piece of ['settings: chatSettingsFor(boot?.config?.chatTools, null)', 'call("chat-tools", { op: "set", threadId: null, settings: change.settings })',
    'customizeStore.setMcpEnabled(name, on)', 'setDraftTools(normalizeSelection(change.selection))']) assert.ok(block.includes(piece), piece);
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/chat-projects/manifest.json'), 'utf8'));
  const adapted = Object.fromEntries(manifest.adapters.map(entry => [entry.original, entry.name]));
  assert.equal(adapted['c9b54eb90-C9rXk4ZP.js#pe'], 'useProjectToolOptions');
  assert.equal(adapted['c9b54eb90-C9rXk4ZP.js#ye'], 'useRecommendedToolConfigs');
  assert.equal(adapted['c9b54eb90-C9rXk4ZP.js#De'], undefined, 'De is sliced now');
  const generated = fs.readFileSync(path.join(app, 'src/generated/chat-projects/c9b54eb90-C9rXk4ZP.mjs'), 'utf8');
  for (const copy of ['defaultMessage: "Recommended Tools:"', 'defaultMessage: "Add tools"', 'defaultMessage: "Some tools are off"', 'defaultMessage: "Turn on"']) assert.ok(generated.includes(copy), copy);
});

// ── chatfn-39 (the review's 补做): Extended thinking in Chat's model menu ─────────────────────────────────────────
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const rawChunk = name => fs.readFileSync(path.join(snapshot, 'assets/v1', name), 'utf8');
function renderOnce(component, props) {
  const hooks = { useContext: context => context._currentValue, useId: () => ':menu:', useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: initial => ({ current: initial }), useMemo: fn => fn(), useCallback: fn => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)() };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
function findAll(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { for (const node of tree) findAll(node, predicate, out); return out; }
  if (tree.props && predicate(tree)) out.push(tree);
  findAll(tree.props?.children, predicate, out);
  return out;
}

test('the thinking switch is the 3.6556.2 model selector’s (shared-7 vw / _w, shared-8 submenu style, shared-50 copy)', () => {
  const selector = rawChunk('shared-7-DBAgAi5H.js'), chat = rawChunk('shared-8-Db1QN4mf.js'), copy = rawChunk('shared-50-DopKwmK0.js');
  for (const pin of ['return e?.thinking?.always_on||!t.some(e=>e.id==="off")?[]:t.filter(e=>e.id!=="off")', 'let t=a===e.id,n=t?"off":e.id;return h(_w,{name:e.name,description:e.description',
    'z.length>0&&R.length===0', 'h(q.SubmenuTrigger,{hint:G?.name,children:b})', 'n?h("span",{className:"mt-1 block text-footnote text-muted",children:n}):null', '{role:"menuitemcheckbox","aria-checked":a}'])
    assert.equal(selector.split(pin).length - 1, 1, pin);
  assert.ok(chat.includes('{overflowStyle:"submenu",thinkingStyle:"submenu"'));
  for (const message of [thinkingModeMessages.extendedTitle, thinkingModeMessages.extendedDescription, thinkingModeMessages.off])
    assert.ok(copy.includes(`defaultMessage:"${message.defaultMessage}",id:"${message.id}"`), message.id);
  assert.ok(copy.includes('thinking_mode_extended_title:p(Z,{defaultMessage:"Extended thinking",id:"u8n5HzNZ2R"})'));
});

test('Chat’s model menu: an “Effort” submenu with the Extended thinking switch; toggling sets paprika_mode and the effort', () => {
  const levels = ['low', 'medium', 'high'].map(reasoningEffort => ({ reasoningEffort }));
  assert.equal(chatThinkingSection({ levels: [] }), null, 'no effort levels: nothing to switch');
  const section = chatThinkingSection({ levels, settings: { paprika_mode: 'extended' } });
  assert.deepEqual(section, { value: 'extended', options: [{ id: 'off', name: 'Off' }, { id: 'extended', name: 'Extended thinking', description: 'Think longer for complex tasks' }] });
  assert.deepEqual(toggleThinking({ levels, mode: 'off' }), { settings: { paprika_mode: null }, effort: 'low' });
  assert.deepEqual(toggleThinking({ levels, mode: 'extended' }), { settings: { paprika_mode: 'extended' }, effort: 'high' });
  // w13-close-chat-composer: the rows moved with the Chat menu to source-chat-model-menu.jsx (shared-8 $H → KH, shared-28
  // wE / gE / hE); tests/w13-close-chat-composer.test.mjs renders them. Code's SourceModelMenu no longer takes `thinking`.
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/source-model-menu.jsx'), 'utf8'), /ThinkingSection|thinking = null/);
  // main.jsx: Chat passes it, toggling persists paprika_mode and picks the effort.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('const chatThinking = mode === "chat" ? chatThinkingSection({ levels: efforts, settings: chatSettingsFor(boot?.config?.chatTools, current || null)'));
  assert.ok(main.includes('thinking={chatThinking && { ...chatThinking, onToggle: toggleChatThinking }}'));
  const toggle = main.slice(main.indexOf('function toggleChatThinking(next) {'), main.indexOf('function applyToolProfile(profile) {'));
  for (const piece of ['toggleThinking({ levels: efforts, mode: next })', 'pickEffort(change.effort)', 'call("chat-tools", { op: "set", threadId: current || null, settings: change.settings })'])
    assert.ok(toggle.includes(piece), piece);
});

// ── The + menu's Add to project (the review's 补做): c752b32f8 ks → As → Ms over Es, Ns ─────────────────────────────
test('Add to project: Es’s literals (generated), the local projects as its rows, Ns’s move / remove, the slot in Chat', async () => {
  const add = rawChunk('c752b32f8-mYZAs6yC.js');
  for (const pin of ['t?{type:"submenu",icon:"Projects",label:o,onOpenChange:js,renderPopup:As}:null', 'function As(e){return n(Ms,{popup:e})}',
    't({search:n,items:r,leadingRows:i,rows:a,maxVisibleItems:Sn})', 'icon:"Projects",checked:e.project.uuid===t,closeOnClick:!0',
    'e===a?t?await i([t],{showSuccess:!1}):n(void 0):t&&a?await r([t],a,o,{enableNavigation:!0}):n(a)}):$[5]}function Ps('])
    assert.equal(add.split(pin).length - 1, 1, pin);
  assert.ok(rawChunk('shared-8-Db1QN4mf.js').includes('typeof e=="string"&&e.startsWith("/project/")'), 'EP hides it on a project page (wP)');
  const { chatAddMenu, chatAddMenuMessages } = await import('../src/generated/chat-composer-menus/add-menu.mjs');
  assert.deepEqual(chatAddMenu.items.project, { type: 'submenu', icon: 'Projects', maxVisibleItems: 8.5 });
  assert.deepEqual(chatAddMenu.items.projectRow, { type: 'checkbox', icon: 'Projects', closeOnClick: true });
  for (const key of ['searchProjects', 'noMatches', 'noProjectsYet']) assert.ok(chatAddMenuMessages[key].id, key);
  const projects = [{ id: 'a', name: 'Billing', updatedAt: '2026-10-01T00:00:00Z' }, { id: 'b', name: 'Design', updatedAt: '2026-10-20T00:00:00Z' }];
  assert.deepEqual(PP.chatProjectRows({ projects, currentProjectId: 'a' }), [{ id: 'b', label: 'Design', checked: false }, { id: 'a', label: 'Billing', checked: true }]);
  assert.deepEqual(PP.chatProjectRows({ projects, query: 'BILL' }).map(row => row.id), ['a']);
  assert.deepEqual([PP.chatProjectPick('a', 'a'), PP.chatProjectPick('b', 'a')], [{ action: 'remove', projectId: 'a' }, { action: 'move', projectId: 'b' }]);
  const picks = [];
  const popup = renderOnce(PP.ChatProjectPopup, { projects, currentProjectId: 'a', onPick: pick => picks.push(pick) });
  assert.equal(popup.props.searchLabel, 'Search projects');
  assert.equal(popup.props.maxVisibleItems, 8.5);
  // G5: the popup body is Es's [leadingRows, items, rows] (no create rows without onCreate).
  const parts = body => body.props.children;
  const [leading, rows, trailing] = parts(popup.props.children('', ''));
  assert.equal(leading, null); assert.equal(trailing, null);
  assert.deepEqual(rows.map(row => [row.props.children, row.props.icon, row.props.checked]), [['Design', 'Projects', false], ['Billing', 'Projects', true]]);
  rows[1].props.onClick(); rows[0].props.onClick();
  assert.deepEqual(picks, [{ action: 'remove', projectId: 'a' }, { action: 'move', projectId: 'b' }]);
  assert.equal(parts(popup.props.children('zzz', 'zzz'))[1].props.children, 'No matches');
  assert.equal(parts(renderOnce(PP.ChatProjectPopup, { projects: [] }).props.children('', ''))[1].props.children, 'No projects yet');
  // G5: Es's create branch (onCreate): "Search or create a project", Enter creates, Yr's New project / Create {name} rows,
  // no "No matches" while a name is typed.
  const created = [];
  const creating = renderOnce(PP.ChatProjectPopup, { projects, currentProjectId: 'a', onPick() {}, onCreate: name => created.push(name) });
  assert.equal(creating.props.searchLabel, 'Search or create a project');
  creating.props.onSubmitQuery('  Launch  ');
  const [newRow] = parts(creating.props.children('', ''));
  const [newProjectRow, separator] = parts(newRow);
  assert.equal(newProjectRow.props.name, undefined, 'nf without a name: "New project"');
  assert.ok(separator);
  newProjectRow.props.onClick();
  const [lead, none, typedRow] = parts(creating.props.children('zzz', 'Zzz'));
  assert.equal(lead, null); assert.equal(none, null);
  assert.equal(typedRow.props.name, 'Zzz');
  assert.deepEqual(created, ['Launch', '']);
  assert.ok(add.includes('defaultMessage:"Search or create a project",id:"x1GW6kgtFG"') && add.includes('l({isOpen:!0,initialName:e})'));
  // The Chat branch passes the slot (not on the projects page) and Ns goes to local-projects / the draft.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const chat = main.slice(main.indexOf('if (mode === "chat") {', main.indexOf('case "add": {')), main.indexOf('return <ChatAddMenuItems entries={chatAddMenuEntries(slots)} />;'));
  for (const piece of ['const projectSlot = section !== "projects" ? { popup: <ChatProjectPopup projects={boot?.config?.localProjects ?? []} currentProjectId={currentProjectId} onPick={pickChatProject}',
    'onCreate={(name) => setNewProjectFor(current ? { sessionId: current, name } : { draft: true, name })} /> } : undefined;',
    'sessionAction(action === "remove" ? "remove-from-project" : "move-to-project", { id: current }, { projectId })', 'setProjectDraftId(next);', 'project: projectSlot,'])
    assert.ok(chat.includes(piece), piece);
  const entries = M.chatAddMenuEntries(M.chatAddMenuSlots({ attach() {}, project: { popup: h('i', { 'data-popup': '' }) } }));
  assert.deepEqual(entries.map(entry => entry.testId), ['add-menu-upload-file', 'add-menu-project']);
  assert.match(renderToStaticMarkup(h(M.ChatAddMenuItems, { entries })), /data-testid="add-menu-project"[^>]*>[\s\S]*Add to project/);
});

// ── C9 (the review's 补做): the web search nudge under a Chat reply (cc1aae219 fP → rP → tP → eP) ───────────────────────
test('C9: a reply with a web link while the conversation doesn’t search shows eP’s “Turn on web search…” banner', () => {
  const view = rawChunk('cc1aae219-CeSwM-tp.js');
  for (const pin of ['let S=i===!0&&!l&&!u;', 'm=!a.isAvailable||!!s||!!c||o||u', 'defaultMessage:"Turn on web search in Search and tools menu. Otherwise, links provided may not be accurate or up to date.",id:"uUjlNFGg26"'])
    assert.equal(view.split(pin).length - 1, 1, pin);
  const links = rawChunk('shared-130-dWztbTO1.js');
  assert.ok(links.includes('function tJ(e){if(!e||e.sender==="human"||!e.content)return Iq;'), 'a human message never has a link');
  const codex = { kind: 'codex' };
  assert.equal(webSearchNudge({ text: 'Docs: https://example.com/a', support: codex, settings: { enabled_web_search: false } }), true);
  assert.equal(webSearchNudge({ text: 'See [the docs](https://example.com)', support: codex, settings: {}, globalMode: 'disabled' }), true, 'unset follows the global setting');
  assert.equal(webSearchNudge({ text: 'https://example.com', support: codex, settings: { enabled_web_search: true } }), false, 'searching: no nudge');
  assert.equal(webSearchNudge({ text: 'https://example.com', support: { kind: 'none' }, settings: {} }), false, 'no web search on the core: suppressed (fP m)');
  assert.equal(webSearchNudge({ text: 'Run `curl https://example.com`\n\n```sh\ncurl https://example.org\n```', support: codex, settings: { enabled_web_search: false } }), false, 'code is not a link');
  assert.equal(webSearchNudge({ text: 'No links here.', support: codex, settings: { enabled_web_search: false } }), false);
  const html = renderToStaticMarkup(h(MW.ChatMessageWarning, { showWebSearchNudge: true }));
  assert.match(html, /data-testid="message-warning"/);
  assert.ok(html.includes('Turn on web search in Search and tools menu. Otherwise, links provided may not be accurate or up to date.'));
  assert.equal(renderToStaticMarkup(h(MW.ChatMessageWarning, {})), '', 'nothing to say: null');
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const at = main.indexOf('const chatNudge = webSearchNudge({ text: footer.text, settings: chatSettingsFor(boot?.config?.chatTools, current)');
  assert.ok(at > 0 && main.indexOf('{chatNudge && <ChatMessageWarning showWebSearchNudge />}<SourceChatMessageActions conversationUuid={current}', at) > at, 'before the toolbar, as r1 puts fP before it');
});
