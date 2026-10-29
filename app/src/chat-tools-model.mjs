// w13-chatfn-tools (research/w13-chatfn.md C1–C3, C7, P3; chatfn-23/39/41/42/54): a Chat conversation's Web search,
// Research and Extended thinking switches, and what each local core gets for them. Pure: main.jsx (the + menu) and
// electron/chat-context/tools.mjs (thread/start|resume) both read it.
//
// Official 3.6556.2 shape: claude.ai keeps three conversation settings beside the request body —
//   enabled_web_search (boolean), compass_mode ("advanced" = Research, else null), paprika_mode ("extended" = Extended
//   thinking, else null) — read by c9b54eb90 _e (`t=!!r?.enabled_web_search`, `r?.compass_mode==="advanced"`,
//   `r?.paprika_mode==="extended"`) and switched by shared-5 mz:
//     · Web search off while Research is on and no other search tool is left (fz: remaining 0 && compass "advanced")
//       → `{compass_mode:null,[e]:!1}`; otherwise just the tool's key.
//     · Research on without a search tool on, web search available (pz) → `{enabled_web_search:!0,compass_mode:cz}`
//       and the toast "Web search enabled automatically for Research"; Research off → `compass_mode: null`.
//   The + menu rows: shared-5 Tz (Web search: checkbox Globe, closes on click; hidden when the platform blocks web
//   search, bz `t !== "blocked_by_platform"`) and yz (Research: checkbox Research; disabled with "Enable a search
//   integration to use research" when no search tool is on and web search can't be turned on, `!u && !d`).
// Local equivalents (E59, no claude.ai): the same three keys are kept per conversation in config.chatTools
// ({ defaults, threads: { [threadId]: settings } }; `defaults` is the New chat's, as the official composer keeps the
// switches of a conversation not created yet, copied into the conversation when it starts), and reach the core as
//   · Codex (native) — its thread config `web_search` ("live" / "disabled"; the global Settings › Code › Web search
//     value is the fallback, main.cjs's Codex decoration), set at thread/start|resume;
//   · a core with tool selection (the DeepSeek harness, capabilities.toolSelection) — its own web tools turned on or
//     off in the session's tool selection (config.threadTools, the Add › Tools mechanism), from the next message;
//   · any other core — no web search: the row is not shown (the blocked_by_platform branch) and Research is disabled.
// Research: web search forced on plus research developer instructions (electron/chat-context/tools.mjs). Extended
// thinking: the model's effort (thinkingEffort); its switch is the model selector's thinking mode (shared-50
// thinking_mode_extended_title), not a + menu row.
import { isToolOff, normalizeSelection } from '../electron/prefs/tool-profiles.mjs';
import { messageTextFeatures } from './generated/chat-messages/message-links.mjs';
// w13-close-main-process (closeout chatfn-branches-02, packaging): the main process reads a conversation's switches too
// (electron/chat-context/tools.mjs, electron/local-projects.mjs), and the package script ships no src/*.mjs outside its
// whitelist, so that part lives in electron/chat-tools-store.mjs and is re-exported here unchanged.
export * from '../electron/chat-tools-store.mjs';
import { EXTENDED_THINKING, RESEARCH_MODE } from '../electron/chat-tools-store.mjs';


/** Official literals this host shows next to the generated + menu (chat-composer-menus/add-menu.mjs). */
export const chatToolsMessages = Object.freeze({
  // c752b32f8 gs (Js's plugins slot): `isChatModeGatedOff` → {type:"button",label:"Plugins",icon:"Plugin",disabled:!0,tooltip}.
  plugins: Object.freeze({ defaultMessage: 'Plugins', id: 'QJAllUAc2k' }),
  pluginsUnavailableInChat: Object.freeze({ defaultMessage: 'Plugins run locally and aren’t available in Chat. Switch to Cowork or Code to use plugins.', id: 'DD4hxrkFe6' }),
  // shared-5 mz toggleResearchMode / autoEnableWebSearchForResearch.
  webSearchAutoEnabled: Object.freeze({ defaultMessage: 'Web search enabled automatically for Research', id: 'ss4xBdPHtN' }),
  // shared-5 yz `!u && !d`.
  researchNeedsSearchIntegration: Object.freeze({ defaultMessage: 'Enable a search integration to use research', id: 'WyiVeak7w5' }),
});

/** The web tools a tool-selection core lists (harness codex-app-server web_search/web_fetch, ACP WebSearch/WebFetch, OpenCode websearch/webfetch). */
export const WEB_SEARCH_TOOLS = Object.freeze(['web_search', 'WebSearch', 'websearch']);
export const WEB_FETCH_TOOLS = Object.freeze(['web_fetch', 'WebFetch', 'webfetch']);

const toolNames = catalog => (Array.isArray(catalog?.tools) ? catalog.tools : []).map(tool => (typeof tool === 'string' ? tool : tool?.name)).filter(name => typeof name === 'string');

/**
 * How the running core can search the web.
 *   codexNative: Codex without permission hints (main.cjs's Codex decoration);
 *   toolSelection: capabilities.toolSelection; catalog: codeDesktop/tools/list ({ tools }), null while not read yet.
 * → { kind: 'codex' } | { kind: 'tools', search: [...], fetch: [...] } | { kind: 'loading' } | { kind: 'none' }
 */
export function searchSupport({ codexNative = false, toolSelection = false, catalog = null } = {}) {
  if (codexNative) return { kind: 'codex' };
  if (!toolSelection) return { kind: 'none' };
  if (!catalog) return { kind: 'loading' };
  const names = toolNames(catalog);
  const search = WEB_SEARCH_TOOLS.filter(name => names.includes(name));
  return search.length ? { kind: 'tools', search, fetch: WEB_FETCH_TOOLS.filter(name => names.includes(name)) } : { kind: 'none' };
}

const searchAvailable = support => support?.kind === 'codex' || support?.kind === 'tools';

/** Whether the conversation searches the web now (globalMode: config.codexWebSearch). */
export function webSearchOn({ support, settings = {}, selection = null, globalMode = null } = {}) {
  if (support?.kind === 'codex') return typeof settings.enabled_web_search === 'boolean' ? settings.enabled_web_search : globalMode !== 'disabled';
  if (support?.kind === 'tools') return support.search.some(name => !isToolOff(name, normalizeSelection(selection)));
  return false;
}

/** A tool selection with the core's web tools (search and fetch, as claude.ai's one switch) on or off. */
export function withWebTools(selection, support, on) {
  const clean = normalizeSelection(selection) ?? { disabled: [], disabledServers: [] };
  const names = [...(support?.search ?? []), ...(support?.fetch ?? [])];
  const disabled = on ? clean.disabled.filter(name => !names.includes(name)) : [...new Set([...clean.disabled, ...names])];
  return normalizeSelection({ ...clean, disabled });
}

/**
 * The + menu's Web search and Research slots (source-chat-tools-menu.jsx chatAddMenuSlots input), without handlers.
 * webSearch: null when the core can't search (Tz's hidden branch); research: disabled with yz's reason then (its
 * tooltip a message descriptor for the caller to translate).
 */
export function chatToolSlots(input = {}) {
  const { support, settings = {} } = input;
  // The core's tool list not read yet: neither row until it is (both hooks answer null before they know).
  if (support?.kind === 'loading') return { webSearch: null, research: null };
  const available = searchAvailable(support);
  const searching = webSearchOn(input);
  return {
    webSearch: available ? { checked: searching, disabled: false } : null,
    research: available
      ? { checked: settings.compass_mode === RESEARCH_MODE, disabled: false }
      : { checked: false, disabled: true, tooltip: chatToolsMessages.researchNeedsSearchIntegration },
  };
}

/**
 * Switch Web search (mz toggleSearchTool). → { settings: patch, selection?: the tool selection to save, }
 * Turning it off while Research is on clears Research too: web search is the only local search tool (fz).
 */
export function toggleWebSearch({ support, settings = {}, selection = null, on }) {
  const patch = !on && settings.compass_mode === RESEARCH_MODE ? { compass_mode: null, enabled_web_search: false } : { enabled_web_search: !!on };
  return support?.kind === 'tools' ? { settings: patch, selection: withWebTools(selection, support, !!on) } : { settings: patch };
}

/**
 * Switch Research (mz toggleResearchMode). → { settings: patch, selection?, autoEnabledWebSearch: boolean }
 * On without web search on (and web search available): both on, and the official toast.
 */
export function toggleResearch(input) {
  const { support, selection = null, on } = input;
  if (!on) return { settings: { compass_mode: null }, autoEnabledWebSearch: false };
  if (searchAvailable(support) && !webSearchOn(input)) {
    const settings = { enabled_web_search: true, compass_mode: RESEARCH_MODE };
    return support.kind === 'tools' ? { settings, selection: withWebTools(selection, support, true), autoEnabledWebSearch: true } : { settings, autoEnabledWebSearch: true };
  }
  return { settings: { compass_mode: RESEARCH_MODE }, autoEnabledWebSearch: false };
}

const EFFORT_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const effortOf = level => (typeof level === 'string' ? level : level?.reasoningEffort);

/**
 * Extended thinking as an effort of the model's levels (supportedReasoningEfforts): on → "high", else the highest
 * listed level under it; off → the lowest listed level. null when the model lists none.
 */
export function thinkingEffort(levels, on) {
  const listed = (Array.isArray(levels) ? levels : []).map(effortOf).filter(value => EFFORT_ORDER.includes(value))
    .sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b));
  if (!listed.length) return null;
  if (!on) return listed[0];
  if (listed.includes('high')) return 'high';
  const below = listed.filter(value => EFFORT_ORDER.indexOf(value) < EFFORT_ORDER.indexOf('high'));
  return below.at(-1) ?? listed[0];
}

// ── chatfn-23: a project's recommended tools (c9b54eb90 pe / _e / ye, w13-chatfn-tools review 补做) ──────────────────
// claude.ai keeps them in the project's settings (enabled_web_search / compass_mode / paprika_mode and
// recommended_mcp_servers, `n({settings:o})`); _e lists the tools pe offers with a `recommended` flag (skipping
// builtin:extended-thinking), ye turns them into the strip's configs (isConnected / isEnabled against the conversation
// the composer starts) and its handlers. Recommending never switches anything by itself: only the strip's "Turn on" or
// a click does, as on claude.ai. Locally the tools are this machine's (searchSupport, the customize connectors) and the
// conversation is the project page's New chat (config.chatTools defaults).

/** pe's builtin tool names (c9b54eb90 formatMessage descriptors). */
export const projectToolMessages = Object.freeze({
  webSearch: Object.freeze({ defaultMessage: 'Web search', id: '0/w13aoHrd' }),
  research: Object.freeze({ defaultMessage: 'Research', id: 'C5I8J3lxs3' }),
  extendedThinking: Object.freeze({ defaultMessage: 'Extended thinking', id: '5j4WakKa2u' }),
});
/**
 * pe's `tools` on this machine: Web search and Research (enabledForOrg when the running core can search), Extended
 * thinking (enabledForOrg: the model has thinking levels), then the customize connectors by name (pe `e.sort(me)`).
 * connectors: [{ name, title?, url?, connected, connecting?, enabled }] — the MCP server name is the connector's uuid.
 * label: a message descriptor → its text (the caller's t()).
 */
export function projectToolOptions({ support, thinking = false, connectors = [], label = message => message.defaultMessage } = {}) {
  const search = searchAvailable(support);
  const builtin = (id, message, enabledForOrg) => ({ id, name: label(message), type: 'builtin', availableToOrg: true, enabledForOrg });
  const mcp = (Array.isArray(connectors) ? connectors : []).filter(row => typeof row?.name === 'string' && row.name).map(row => {
    const name = typeof row.title === 'string' && row.title ? row.title : row.name;
    return { id: `mcp:${row.name}`, name, type: 'mcp', availableToOrg: true, enabledForOrg: true,
      connector: { uuid: row.name, name, url: typeof row.url === 'string' && row.url ? row.url : undefined, tools: [{ enabledKey: row.name }],
        isConnected: row.connected === true, isConnecting: row.connecting === true, enabled: row.enabled !== false } };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return [builtin('builtin:web-search', projectToolMessages.webSearch, search), builtin('builtin:research', projectToolMessages.research, search),
    builtin('builtin:extended-thinking', projectToolMessages.extendedThinking, !!thinking), ...mcp];
}

/**
 * ye's toolConfigs for the recommended tools (_e's `recommendations`, recommended only): a builtin is connected and on
 * when the New chat has it on (web search as the + menu reads it: webSearchOn), a connector is connected / loading as
 * customize reports it and on when its switch is.
 */
export function recommendedToolConfigs({ recommendations = [], support, settings = {}, selection = null, globalMode = null } = {}) {
  return recommendations.filter(entry => entry?.recommended).map(({ tool }) => {
    if (tool.type === 'builtin') {
      const isEnabled = tool.id === 'builtin:web-search' ? webSearchOn({ support, settings, selection, globalMode })
        : tool.id === 'builtin:research' ? settings.compass_mode === RESEARCH_MODE : settings.paprika_mode === EXTENDED_THINKING;
      return { tool, isConnected: true, isEnabled, isLoading: false, toolKeys: undefined };
    }
    const connector = tool.connector ?? {};
    return { tool, isConnected: connector.isConnected === true, isEnabled: connector.enabled !== false, isLoading: connector.isConnecting === true,
      toolKeys: { [connector.uuid]: connector.enabled !== false } };
  });
}

/**
 * ye's enableTool / disableTool / enableAllTools as one change: { settings: the New chat's patch, selection?: a
 * tool-selection core's web tools, connectors: [{ name, on }] }. ids: the tools to switch (enableAllTools: every
 * connected config that is off, ye's `!r.isConnected || r.isEnabled` skip).
 */
export function recommendedToolsChange({ configs = [], support, settings = {}, selection = null } = {}, ids, on) {
  const out = { settings: {}, connectors: [] };
  for (const config of configs) {
    const { tool } = config;
    if (!ids.includes(tool.id)) continue;
    if (tool.type === 'builtin') {
      if (tool.id === 'builtin:web-search') {
        const result = toggleWebSearch({ support, settings: { ...settings, ...out.settings }, selection, on });
        Object.assign(out.settings, result.settings);
        if (result.selection !== undefined) out.selection = result.selection;
      } else if (tool.id === 'builtin:research') out.settings.compass_mode = on ? RESEARCH_MODE : null;
      else if (tool.id === 'builtin:extended-thinking') out.settings.paprika_mode = on ? EXTENDED_THINKING : null;
    } else if (tool.type === 'mcp' && tool.connector?.uuid) out.connectors.push({ name: tool.connector.uuid, on: !!on });
  }
  return out;
}

/** enableAllTools' ids: the connected recommended tools that are off. */
export const offRecommendedToolIds = configs => configs.filter(config => config.isConnected && !config.isEnabled).map(config => config.tool.id);

// ── chatfn-39: Extended thinking in Chat's model menu (the review's 补做) ─────────────────────────────────────────────
// claude.ai's model selector (shared-8, thinkingStyle "submenu") shows a model's thinking.mode_options with an "off"
// option as switch rows (shared-7 AC → vw → _w: name, description, menuitemcheckbox), in the Effort popup after its
// levels, or — no effort levels, as Chat's menu here — after a separator in a submenu labelled "Effort" whose hint is
// the current option's name. The server names the options with shared-50 _v's messages: thinking_mode_extended_title /
// _description, and "Off". Locally a conversation's paprika_mode is that switch (config.chatTools), and it reaches the
// core as the model's effort (thinkingEffort).
export const thinkingModeMessages = Object.freeze({
  extendedTitle: Object.freeze({ defaultMessage: 'Extended thinking', id: 'u8n5HzNZ2R' }),
  extendedDescription: Object.freeze({ defaultMessage: 'Think longer for complex tasks', id: 'aWuhH8qI9/' }),
  off: Object.freeze({ defaultMessage: 'Off', id: 'PLBs+fqKwX' }),
  effort: Object.freeze({ defaultMessage: 'Effort' }),
});

/**
 * The model menu's thinking section for a Chat conversation, or null when the model lists no effort levels (no
 * thinking to switch): { options: [off, extended], value: 'extended' | 'off' }. label: a descriptor → its text.
 */
export function chatThinkingSection({ levels, settings = {}, label = message => message.defaultMessage } = {}) {
  if (thinkingEffort(levels, true) === null) return null;
  return {
    options: [{ id: 'off', name: label(thinkingModeMessages.off) },
      { id: EXTENDED_THINKING, name: label(thinkingModeMessages.extendedTitle), description: label(thinkingModeMessages.extendedDescription) }],
    value: settings.paprika_mode === EXTENDED_THINKING ? EXTENDED_THINKING : 'off',
  };
}

/** vw's toggle (`n = t ? "off" : e.id`) as a change: the conversation's paprika_mode and the model effort it means. */
export function toggleThinking({ levels, mode }) {
  const on = mode === EXTENDED_THINKING;
  return { settings: { paprika_mode: on ? EXTENDED_THINKING : null }, effort: thinkingEffort(levels, on) };
}

// ── C9: the web search nudge under a Chat reply (the review's 补做) ─────────────────────────────────────────────────
// cc1aae219 fP / rP: `S = hasLink === true && !webSearchEnabled && !suppressWebSearchNudge`; hasLink is shared-130 xZ →
// tJ (a human message never has one; a reply's text parts through Gq: fenced and inline code and images stripped, then a
// URL, www. host or markdown link), suppress is fP's `m = !web_search.isAvailable || hideWebSearchToggle || …`. Then eP
// shows "Turn on web search in Search and tools menu. …" (uUjlNFGg26) as the message-warning banner before the toolbar.
/** Whether a Chat reply (its text) shows the nudge: it has a web link, the core can search, and this conversation doesn't. */
export function webSearchNudge({ text, support, settings = {}, selection = null, globalMode = null } = {}) {
  if (typeof text !== 'string' || !text || !searchAvailable(support)) return false;
  if (webSearchOn({ support, settings, selection, globalMode })) return false;
  return messageTextFeatures(text).hasWebLink === true;
}
