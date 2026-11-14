// w13-chatfn-tools: src/chat-tools-model.mjs — a Chat conversation's Web search / Research / Extended thinking
// switches (3.6556.2 conversation settings enabled_web_search / compass_mode / paprika_mode, shared-5 mz / Tz / yz,
// c9b54eb90 _e) and what each kind of local core gets for them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  chatSettingsFor, chatToolSlots, chatToolsMessages, codexWebSearchMode, EXTENDED_THINKING, forgetChatTools, normalizeChatSettings,
  normalizeChatTools, normalizeProjectSettings, offRecommendedToolIds, patchChatTools, projectToolMessages, projectToolOptions, recommendedToolConfigs,
  recommendedToolsChange, RESEARCH_INSTRUCTIONS, RESEARCH_MODE, searchSupport, seedChatTools, thinkingEffort, toggleResearch,
  toggleWebSearch, webSearchOn, withWebTools,
} from '../src/chat-tools-model.mjs';
import { chatAddMenuMessages } from '../src/generated/chat-composer-menus/add-menu.mjs';
import { isToolOff } from '../electron/prefs/tool-profiles.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(v1, 'assets/v1', name), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(v1, 'i18n/en-US.json'), 'utf8'));
const literal = message => `defaultMessage:"${message.defaultMessage.replace(/’/g, '\\u2019')}",id:"${message.id}"`;

test('the copy and switch rules are the 3.6556.2 originals, and the copy has zh-CN', () => {
  const add = official('c752b32f8-mYZAs6yC.js'), menus = official('shared-5-Bg6ZMqvt.js'), project = official('c9b54eb90-C9rXk4ZP.js');
  // c752b32f8 gs: Chat gates plugins off as a disabled "Plugins" row with the reason.
  assert.ok(add.includes(literal(chatToolsMessages.pluginsUnavailableInChat)));
  assert.ok(add.includes(literal(chatToolsMessages.plugins)));
  assert.ok(add.includes('isChatModeGatedOff:c}=gr()') && add.includes('{type:"button",label:e,icon:"Plugin",disabled:!0,tooltip:t}'));
  // na: the two switches' testids.
  assert.ok(add.includes('research:"add-menu-research",webSearch:"add-menu-web-search"'));
  // shared-5 mz / bz / yz.
  assert.ok(menus.includes(literal(chatToolsMessages.webSearchAutoEnabled)));
  assert.ok(menus.includes(literal(chatToolsMessages.researchNeedsSearchIntegration)));
  assert.ok(menus.includes('cz="advanced",lz=["enabled_web_search","enabled_bananagrams","enabled_sourdough","enabled_foccacia"]'));
  assert.ok(menus.includes('enabled_web_search:!0,compass_mode:cz'), 'Research on turns web search on with it');
  assert.ok(menus.includes('compass_mode:null,[e]:!1'), 'the last search tool off clears Research');
  assert.ok(menus.includes('t!=="blocked_by_platform"'), 'the Web search row hides when the platform blocks it');
  assert.ok(menus.includes('if(!u&&!d)'), 'Research is disabled without a search tool on or one to turn on');
  // c9b54eb90 _e: the three conversation settings and their values.
  for (const key of ['t=!!r?.enabled_web_search', 'r?.compass_mode==="advanced"', 'r?.paprika_mode==="extended"']) assert.ok(project.includes(key), key);
  assert.equal(RESEARCH_MODE, 'advanced');
  assert.equal(EXTENDED_THINKING, 'extended');
  assert.equal(chatToolsMessages.researchNeedsSearchIntegration.defaultMessage, chatAddMenuMessages.researchNeedsSearchIntegration.defaultMessage);
  for (const message of Object.values(chatToolsMessages)) {
    assert.equal(enUS[message.id], message.defaultMessage, message.id);
    assert.equal(typeof zh[message.defaultMessage], 'string', message.defaultMessage);
  }
});

test('settings keep the official keys only; the store keeps the New chat’s and each conversation’s', () => {
  assert.deepEqual(normalizeChatSettings({ enabled_web_search: true, compass_mode: 'advanced', paprika_mode: 'deep', other: 1 }),
    { enabled_web_search: true, compass_mode: 'advanced', paprika_mode: null });
  assert.deepEqual(normalizeChatSettings({ enabled_web_search: 'yes' }), {});
  assert.deepEqual(normalizeChatTools(null), { defaults: {}, threads: {} });
  let store = patchChatTools(undefined, null, { enabled_web_search: false });
  assert.deepEqual(store, { defaults: { enabled_web_search: false }, threads: {} });
  assert.deepEqual(chatSettingsFor(store, null), { enabled_web_search: false }, 'the New chat’s');
  assert.deepEqual(chatSettingsFor(store, 'old'), {}, 'a conversation without its own: the global defaults, never the New chat’s');
  store = patchChatTools(store, 'old', { compass_mode: 'advanced' });
  assert.deepEqual(store.threads.old, { compass_mode: 'advanced' }, 'starts from what it showed (the global defaults)');
  // A conversation started from the New chat takes its switches as its own (main.cjs thread/start).
  store = seedChatTools(store, 't1');
  assert.deepEqual(store.threads.t1, { enabled_web_search: false });
  assert.deepEqual(seedChatTools(store, 't1').threads.t1, { enabled_web_search: false });
  assert.deepEqual(seedChatTools({ defaults: {}, threads: {} }, 't2'), { defaults: {}, threads: {} }, 'no New chat switches: no entry');
  store = patchChatTools(store, 't1', { compass_mode: 'advanced' });
  assert.deepEqual(store.threads.t1, { enabled_web_search: false, compass_mode: 'advanced' });
  store = patchChatTools(store, null, { enabled_web_search: true, compass_mode: 'advanced' });
  assert.deepEqual(chatSettingsFor(store, 't1'), { enabled_web_search: false, compass_mode: 'advanced' }, 'its own stays');
  assert.deepEqual(chatSettingsFor(store, 'never'), {}, 'a New chat change never reaches a conversation without its own');
  assert.deepEqual(forgetChatTools(store, 't1').threads, { old: { compass_mode: 'advanced' } });
});

const catalog = { tools: [{ name: 'read' }, { name: 'web_search' }, { name: 'web_fetch' }, { name: 'bash' }] };

test('three kinds of core: Codex (thread web_search), a tool-selection core (its web tools), none (no row)', () => {
  // Codex.
  const codex = searchSupport({ codexNative: true });
  assert.deepEqual(codex, { kind: 'codex' });
  assert.deepEqual(chatToolSlots({ support: codex, settings: {}, globalMode: null }), { webSearch: { checked: true, disabled: false }, research: { checked: false, disabled: false } });
  assert.equal(webSearchOn({ support: codex, settings: {}, globalMode: 'disabled' }), false, 'unset follows Settings › Code › Web search');
  assert.equal(webSearchOn({ support: codex, settings: { enabled_web_search: true }, globalMode: 'disabled' }), true, 'the conversation’s own wins');
  assert.deepEqual(toggleWebSearch({ support: codex, settings: {}, on: false }), { settings: { enabled_web_search: false } });
  assert.equal(codexWebSearchMode({}, 'cached'), null, 'never chose: the global setting stays');
  assert.equal(codexWebSearchMode({ enabled_web_search: false }, 'live'), 'disabled');
  assert.equal(codexWebSearchMode({ enabled_web_search: true }, 'cached'), 'cached');
  assert.equal(codexWebSearchMode({ enabled_web_search: true }, 'disabled'), 'live');
  assert.equal(codexWebSearchMode({ compass_mode: 'advanced' }, null), 'live', 'Research searches');

  // A tool-selection core (the DeepSeek harness: web_search / web_fetch in codeDesktop/tools/list).
  const tools = searchSupport({ toolSelection: true, catalog });
  assert.deepEqual(tools, { kind: 'tools', search: ['web_search'], fetch: ['web_fetch'] });
  assert.deepEqual(searchSupport({ toolSelection: true, catalog: { tools: ['WebSearch', 'WebFetch'] } }), { kind: 'tools', search: ['WebSearch'], fetch: ['WebFetch'] });
  assert.equal(webSearchOn({ support: tools, selection: null }), true);
  const off = toggleWebSearch({ support: tools, settings: {}, selection: { disabled: ['bash'], disabledServers: [] }, on: false });
  assert.deepEqual(off, { settings: { enabled_web_search: false }, selection: { disabled: ['bash', 'web_search', 'web_fetch'], disabledServers: [] } });
  assert.ok(isToolOff('web_search', off.selection) && isToolOff('web_fetch', off.selection));
  assert.equal(webSearchOn({ support: tools, selection: off.selection }), false);
  assert.equal(chatToolSlots({ support: tools, selection: off.selection }).webSearch.checked, false);
  assert.deepEqual(toggleWebSearch({ support: tools, settings: {}, selection: off.selection, on: true }).selection, { disabled: ['bash'], disabledServers: [] });
  assert.equal(withWebTools({ disabled: ['web_search', 'web_fetch'], disabledServers: [] }, tools, true), null, 'nothing left off');

  // No search: no Web search row (Tz's hidden branch), Research disabled with yz's reason; before the list is read, neither.
  for (const none of [searchSupport({}), searchSupport({ toolSelection: true, catalog: { tools: [{ name: 'read' }] } })]) {
    assert.deepEqual(none, { kind: 'none' });
    assert.deepEqual(chatToolSlots({ support: none, settings: { compass_mode: 'advanced' } }),
      { webSearch: null, research: { checked: false, disabled: true, tooltip: chatToolsMessages.researchNeedsSearchIntegration } });
    assert.deepEqual(toggleResearch({ support: none, settings: {}, on: true }), { settings: { compass_mode: 'advanced' }, autoEnabledWebSearch: false });
  }
  assert.deepEqual(chatToolSlots({ support: searchSupport({ toolSelection: true, catalog: null }) }), { webSearch: null, research: null });
});

test('Research: on turns web search on (and says so), off clears it; web search off while Research is on clears both', () => {
  const tools = searchSupport({ toolSelection: true, catalog });
  const offSelection = { disabled: ['web_search', 'web_fetch'], disabledServers: [] };
  assert.deepEqual(toggleResearch({ support: tools, settings: {}, selection: offSelection, on: true }),
    { settings: { enabled_web_search: true, compass_mode: 'advanced' }, selection: null, autoEnabledWebSearch: true });
  assert.deepEqual(toggleResearch({ support: tools, settings: {}, selection: null, on: true }), { settings: { compass_mode: 'advanced' }, autoEnabledWebSearch: false });
  const codex = { kind: 'codex' };
  assert.deepEqual(toggleResearch({ support: codex, settings: { enabled_web_search: false }, on: true }),
    { settings: { enabled_web_search: true, compass_mode: 'advanced' }, autoEnabledWebSearch: true });
  assert.deepEqual(toggleResearch({ support: codex, settings: { compass_mode: 'advanced' }, on: false }), { settings: { compass_mode: null }, autoEnabledWebSearch: false });
  assert.deepEqual(toggleWebSearch({ support: codex, settings: { compass_mode: 'advanced', enabled_web_search: true }, on: false }),
    { settings: { compass_mode: null, enabled_web_search: false } });
  assert.equal(chatToolSlots({ support: codex, settings: { compass_mode: 'advanced' } }).research.checked, true);
  assert.match(RESEARCH_INSTRUCTIONS, /^Research mode is on for this conversation\./);
  assert.match(RESEARCH_INSTRUCTIONS, /Cite every source/);
});

test('Extended thinking as an effort of the model’s levels', () => {
  const levels = ['low', 'medium', 'high', 'xhigh'].map(reasoningEffort => ({ reasoningEffort }));
  assert.equal(thinkingEffort(levels, true), 'high');
  assert.equal(thinkingEffort(levels, false), 'low');
  assert.equal(thinkingEffort(['minimal', 'low', 'medium'], true), 'medium', 'no high: the highest under it');
  assert.equal(thinkingEffort(['xhigh', 'max'], true), 'xhigh');
  assert.equal(thinkingEffort([], true), null);
  assert.equal(thinkingEffort(null, false), null);
});

test('chatfn-23: a project’s recommended tools — pe’s options, _e’s settings, ye’s configs and switches (c9b54eb90)', () => {
  const project = official('c9b54eb90-C9rXk4ZP.js');
  for (const message of Object.values(projectToolMessages)) {
    assert.ok(project.includes(literal(message)), message.id);
    assert.equal(enUS[message.id], message.defaultMessage);
  }
  for (const key of ['id:"builtin:web-search"', 'id:"builtin:research"', 'id:"builtin:extended-thinking"', 'id:`mcp:${t.uuid}`', 'e.id==="builtin:extended-thinking"||',
    'o.recommended_mcp_servers=Array.from(s),n({settings:o})', 'O("enabled_web_search",!0)', 'O("compass_mode","advanced")', 'if(!r.isConnected||r.isEnabled)return']) assert.ok(project.includes(key), key);
  // _e's settings: the four keys, validated (local-projects update).
  assert.deepEqual(normalizeProjectSettings({ enabled_web_search: true, compass_mode: null, recommended_mcp_servers: ['github', 'github'] }),
    { enabled_web_search: true, compass_mode: null, recommended_mcp_servers: ['github'] });
  for (const bad of [null, [], { other: 1 }, { enabled_web_search: 'yes' }, { compass_mode: 'basic' }, { paprika_mode: true }, { recommended_mcp_servers: [1] }, { recommended_mcp_servers: 'github' }])
    assert.equal(normalizeProjectSettings(bad), null, JSON.stringify(bad));
  // pe: Web search and Research by the core's search, Extended thinking, then the connectors by name.
  const connectors = [{ name: 'zed', connected: true }, { name: 'github', title: 'GitHub', connected: false, connecting: true, enabled: false }];
  const options = projectToolOptions({ support: { kind: 'codex' }, thinking: true, connectors });
  assert.deepEqual(options.map(tool => [tool.id, tool.name, tool.enabledForOrg]), [['builtin:web-search', 'Web search', true], ['builtin:research', 'Research', true],
    ['builtin:extended-thinking', 'Extended thinking', true], ['mcp:github', 'GitHub', true], ['mcp:zed', 'zed', true]]);
  assert.deepEqual(options[3].connector, { uuid: 'github', name: 'GitHub', url: undefined, tools: [{ enabledKey: 'github' }], isConnected: false, isConnecting: true, enabled: false });
  assert.deepEqual(projectToolOptions({ support: { kind: 'none' } }).map(tool => tool.enabledForOrg), [false, false, false], 'no search: neither switch can be recommended');
  // ye: the recommended ones against the New chat; a connector by its customize switch.
  const recommendations = [{ tool: options[0], recommended: true }, { tool: options[1], recommended: false }, { tool: options[3], recommended: true }];
  const input = { support: { kind: 'codex' }, settings: { enabled_web_search: false }, selection: null, globalMode: null };
  const configs = recommendedToolConfigs({ ...input, recommendations });
  assert.deepEqual(configs.map(c => [c.tool.id, c.isConnected, c.isEnabled, c.isLoading]), [['builtin:web-search', true, false, false], ['mcp:github', false, false, true]]);
  assert.deepEqual(offRecommendedToolIds(configs), ['builtin:web-search'], '“Turn on” skips what isn’t connected');
  assert.deepEqual(recommendedToolsChange({ ...input, configs }, ['builtin:web-search', 'mcp:github'], true), { settings: { enabled_web_search: true }, connectors: [{ name: 'github', on: true }] });
  const tools = { kind: 'tools', search: ['web_search'], fetch: ['web_fetch'] };
  const researchConfigs = recommendedToolConfigs({ support: tools, settings: {}, selection: null, recommendations: [{ tool: options[0], recommended: true }, { tool: options[1], recommended: true }] });
  assert.deepEqual(researchConfigs.map(c => c.isEnabled), [true, false], 'a tool-selection core: web search is its web tools');
  assert.deepEqual(recommendedToolsChange({ support: tools, settings: { compass_mode: 'advanced' }, selection: null, configs: researchConfigs }, ['builtin:web-search'], false),
    { settings: { compass_mode: null, enabled_web_search: false }, connectors: [], selection: { disabled: ['web_search', 'web_fetch'], disabledServers: [] } });
  assert.deepEqual(recommendedToolsChange({ support: tools, settings: {}, configs: researchConfigs }, ['builtin:research'], true), { settings: { compass_mode: 'advanced' }, connectors: [] });
});
