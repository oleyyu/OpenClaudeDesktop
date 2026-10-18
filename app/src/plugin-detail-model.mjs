// 2.2553.1 c36b3644c _e: populated tabs, >5 item search, stable hook order.
// Adapt only fields actually reported by Codex plugin/read and skills/list.
// 2.31226.0 c24c8737b (:5277-5440 tabs Skills / Commands / Connectors / Hooks / Monitors / Agents) and c99ed1520
// (:380-455 agent / monitor items): a plugin's commands are its plugin/read skills of type "command" (Aa) or a
// reported `commands` list, agents and monitors are listed when plugin/read reports them.
// 2.42304.0 c24c8737b pc Kt (R4e-plugin, settings-14): the page's tab list puts Overview first and unconditionally,
// Tool permissions next only for a non-empty resolved server list, then these content tabs (pluginDetailTabList);
// the Overview content is c12456454 ni over plugin/read's data (pluginOverview).
import { MCP_STATUS_LABELS, customizeCore } from './customize-model.mjs';
import { sanitizeText } from './generated/r4e-plugin/text-sanitize.mjs';
import { t } from '../electron/i18n/index.mjs';
const text = value => typeof value === 'string' ? value : '';
const list = value => Array.isArray(value) ? value : [];
// cd0c65b43 c / l: a monitor's label (its name, else "Monitor {number}") and when it starts.
const ON_SKILL_INVOKE = 'on-skill-invoke:';
export function monitorLabel(monitor, index) {
  return text(monitor?.name).trim() || t('Monitor {number}', { number: index + 1 });
}
export function monitorWhen(when) {
  if (when === undefined || when === null || when === 'always') return t('Every session, from session start');
  if (typeof when === 'string' && when.startsWith(ON_SKILL_INVOKE) && when.slice(ON_SKILL_INVOKE.length))
    return t('When the {skill} skill is first invoked', { skill: when.slice(ON_SKILL_INVOKE.length) });
  return text(when);
}
// A plugin's MCP servers in the order plugin/read reports them, each resolved through the Customize mcp rows.
// A core that runs a plugin's servers under their own names and switches each (Kimi: plugin-<id>:<server>,
// detail.mcpServerStates) names the connector by that runtime name and offers its switch.
function pluginConnectorItems(detail, mcpRows) {
  const states = list(detail?.mcpServerStates);
  return list(detail?.mcpServers).filter(name => text(name)).map((name, index) => {
    const state = states.find(entry => entry?.name === name);
    const connectorName = text(state?.runtimeName) || name;
    const row = list(mcpRows).find(entry => entry?.name === connectorName);
    return { key: `mcp:${index}`, name, label: text(row?.title) || name, description: row ? MCP_STATUS_LABELS[row.kind] ?? '' : state && state.enabled === false ? 'Off' : '', connected: row?.kind === 'connected', connectorName,
      ...(state && typeof state.enabled === 'boolean' ? { server: name, enabled: state.enabled } : {}) };
  });
}

// Tab descriptions come from customizeCore (Claude → DeepSeek); connector
// items resolve their title and status from the Customize mcp rows (c36b3644c
// fe: the server name, its status as the description, muted unless connected).
export function pluginDetailTabs(detail, pluginId, knownSkills = [], { descriptions = customizeCore().pluginTabDescriptions, mcpRows = [] } = {}) {
  if (!detail) return [];
  const isCommand = skill => skill?.type === 'command';
  const skillItem = (skill, index, prefix) => {
    const matches = knownSkills.filter(row => row.pluginId === pluginId && (skill.path ? row.path === skill.path : row.skillName === skill.name));
    return { key: `${prefix}:${index}`, name: skill.name, label: `/${skill.name}`, description: text(skill.description),
      disabled: skill.enabled === false, path: matches.length === 1 ? matches[0].path : null };
  };
  const reported = list(detail.skills).filter(skill => text(skill?.name));
  const skills = reported.filter(skill => !isCommand(skill)).map((skill, index) => skillItem(skill, index, 'skill'));
  // ccea1f474 Ks(e, "/"): commands read as /name; a command has no SKILL.md to open.
  const commands = [...reported.filter(isCommand), ...list(detail.commands).filter(command => text(command?.name))]
    .map((command, index) => ({ key: `command:${index}`, name: command.name, label: `/${command.name}`, description: text(command.description), disabled: command.enabled === false, path: null }));
  const connectors = pluginConnectorItems(detail, mcpRows);
  const hooks = list(detail.hooks).filter(hook => text(hook?.key)).map((hook, index) => ({ key: `hook:${index}`, name: hook.key, label: text(hook.eventName) || hook.key, description: text(hook.eventName) ? hook.key : '' }));
  // The plugin's own tools (OpenCode's plugin/read detail.tools [{name, description}]).
  const tools = list(detail.tools).filter(tool => text(tool?.name)).map((tool, index) => ({ key: `tool:${index}`, name: tool.name, label: tool.name, description: text(tool.description) }));
  // c99ed1520 ve: the agent's description, else "Model: {model}".
  const agents = list(detail.agents).filter(agent => text(agent?.name)).map((agent, index) => ({ key: `agent:${index}`, name: agent.name, label: agent.name,
    description: text(agent.description) || (text(agent.model) ? t('Model: {model}', { model: agent.model }) : '') }));
  // c99ed1520 xe / cd0c65b43 f: label, then when it runs (with its description) and the command.
  const monitors = list(detail.monitors).filter(monitor => monitor && typeof monitor === 'object').map((monitor, index) => {
    const when = monitorWhen(monitor.when);
    return { key: `monitor:${index}`, name: monitorLabel(monitor, index), label: monitorLabel(monitor, index),
      description: text(monitor.description) ? `${when} (${monitor.description})` : when, command: text(monitor.command) };
  });
  const tabs = [
    { id: 'skills', label: 'Skills', description: descriptions.skills, items: skills },
    { id: 'commands', label: 'Commands', description: descriptions.commands ?? '', items: commands },
    { id: 'connectors', label: 'Connectors', description: descriptions.connectors, items: connectors },
    { id: 'tools', label: 'Tools', description: descriptions.tools ?? '', items: tools },
    { id: 'hooks', label: 'Hooks', description: descriptions.hooks, items: hooks },
    { id: 'monitors', label: 'Monitors', description: descriptions.monitors ?? '', items: monitors },
    { id: 'agents', label: 'Agents', description: descriptions.agents ?? '', items: agents },
  ].filter(tab => tab.items.length);
  // Hooks and monitors keep the plugin's order (the source lists them as declared).
  for (const tab of tabs) if (tab.id !== 'hooks' && tab.id !== 'monitors') tab.items.sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return tabs;
}

// c24c8737b xs → uo: the Tool permissions servers. Only the unified plugins UI (shared-52 gk, GrowthBook
// gate 2406162393) uses a host's servers (and only c76f00e40 gr, the directory connector record page, passes any);
// otherwise uo is enabled for that UI only, so with the gate closed on the host the list is empty.
export function pluginToolPermissionServers({ unifiedPluginsUi = false, hostToolPermissionsServers } = {}) {
  return unifiedPluginsUi === true && Array.isArray(hostToolPermissionsServers) && hostToolPermissionsServers.length > 0 ? hostToolPermissionsServers : [];
}

// c24c8737b pc Kt: Overview first and unconditionally, Tool permissions next only when the resolved servers are
// non-empty (`Ut === !0 && e.push({id:"permissions"…})`), then the content tabs in their own order. Not reproduced:
// `contents` (w = a backend id, cloud-only), `language-servers` (plugin/read reports no lspServers) and the
// is/bt filters (sales cloud access check, unified UI + connector page style), all inactive here.
export function pluginDetailTabList(contentTabs = [], { permissionServers = [] } = {}) {
  const tabs = [{ id: 'overview', label: 'Overview', description: '', items: [] }];
  if (Array.isArray(permissionServers) && permissionServers.length > 0)
    tabs.push({ id: 'permissions', label: 'Tool permissions', description: '', items: [], servers: permissionServers });
  return [...tabs, ...list(contentTabs).filter(tab => tab && tab.id !== 'overview' && tab.id !== 'permissions')];
}

// c12456454 ni over plugin/read: the Description (ii without a directory listing or signed-in record: the item's own
// description; here the row's localized meta, else plugin/read's text) and the rail's Connectors & tools rows
// (cae01a6fc ae: one per MCP server in plugin/read's order, keyed `mcp:${index}:${name}`, labelled by the connector's
// display name — the Customize mcp row's title, else the server name — with the server's own sanitized name as the
// note when it differs). plugin/read reports no reach or CLI components, so ae's other rows never appear. Nothing
// else ni draws has data here: org usage (Dr), what's new (vt: backend release notes), categories, the "Added by"
// credit of shared plugins, and Try it (gn: curated or directory prompts only, so its "…or type {command} in any
// chat." line stays closed too).
export function pluginOverview(detail, plugin, { mcpRows = [] } = {}) {
  if (!detail) return null;
  const description = text(plugin?.description) || text(detail.description);
  const connectorRows = pluginConnectorItems(detail, mcpRows).map((item, index) => {
    const label = sanitizeText(item.label), own = sanitizeText(item.name);
    return { key: `mcp:${index}:${item.name}`, label, note: label === own ? undefined : own, connectorName: item.connectorName };
  });
  return { description, connectorRows };
}

export function pluginDetailView(tabs, selectedTab, query = '') {
  const tab = tabs.find(tab => tab.id === selectedTab) || tabs[0] || null;
  const searchable = !!tab && tab.items.length > 5;
  const term = searchable ? text(query).trim().toLowerCase() : '';
  const items = tab?.items.filter(item => !term || `${item.label}\n${item.name}\n${item.description || ''}`.toLowerCase().includes(term)) || [];
  return { tab, searchable, items };
}
