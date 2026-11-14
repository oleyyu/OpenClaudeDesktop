// Settings › Harness view model (C6): the running profile (codeDesktop/profile/read)
// merged with the app overlay's desired state, so a change shows at once and
// says "Applies after restart" until the core restarts.
import { MCP_CLIENT, SKILL_ROW, toggleSafe } from '../electron/prefs/harness-profile.mjs';
import { t } from '../electron/i18n/index.mjs';

const kindOf = module => module === MCP_CLIENT ? 'mcp' : /dsh-hooks?-/.test(module) ? 'hook' : /dsh-(skill|tool-skill)(-|$|\/)/.test(module) ? 'skill' : /dsh-tool-/.test(module) ? 'tool' : 'core';
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];

/**
 * @param {{profile?: {entries?: object[], bundles?: {name: string, rowIds: string[], version?: string}[]}|null, overlay?: {rows?: object, inserts?: object[]}}} state
 */
export function harnessView(state) {
  const overlay = { rows: state?.overlay?.rows ?? {}, inserts: state?.overlay?.inserts ?? [] };
  const insertIds = new Set(overlay.inserts.map(item => item.id));
  const running = Array.isArray(state?.profile?.entries) ? state.profile.entries : [];
  const runningIds = new Set(running.map(entry => entry.id));
  const entries = running.map(entry => {
    const insert = overlay.inserts.find(item => item.id === entry.id);
    const row = overlay.rows[entry.id];
    const wanted = insert ? insert.disabled === true : typeof row?.disabled === 'boolean' ? row.disabled : entry.disabled === true;
    return { ...entry, added: insertIds.has(entry.id), disabled: wanted, pending: wanted !== (entry.disabled === true) };
  });
  for (const insert of overlay.inserts) if (!runningIds.has(insert.id)) entries.push({
    id: insert.id, module: insert.name, disabled: insert.disabled === true, phase: null, kind: kindOf(insert.name), added: true, pending: true,
    ...(insert.config?.serverName ? { serverName: insert.config.serverName } : {}),
    ...(insert.config?.transport ? { transport: insert.config.transport } : {}),
    ...(typeof insert.config?.configPath === 'string' ? { configPath: insert.config.configPath } : {}),
  });
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const bundles = [];
  const claimed = new Set();
  for (const bundle of state?.profile?.bundles ?? []) {
    const rows = (bundle.rowIds ?? []).map(id => byId.get(id)).filter(entry => entry && !claimed.has(entry.id));
    rows.forEach(entry => claimed.add(entry.id));
    if (rows.length) bundles.push({ name: bundle.name, version: bundle.version, entries: rows, switchable: rows.filter(toggleSafe).length });
  }
  const others = entries.filter(entry => !claimed.has(entry.id));
  if (others.length) bundles.push({ name: t('Other plugins'), entries: others, switchable: others.filter(entry => toggleSafe(entry) || entry.added).length });
  const skillRow = overlay.rows[SKILL_ROW];
  const runningSkill = running.find(entry => entry.id === SKILL_ROW);
  const skillDirs = skillRow?.config ? strings(skillRow.config.customSkillDirs) : strings(runningSkill?.customSkillDirs);
  return {
    insertIds,
    overlayEmpty: Object.keys(overlay.rows).length === 0 && overlay.inserts.length === 0,
    bundles,
    mcp: entries.filter(entry => entry.kind === 'mcp').sort((a, b) => String(a.serverName || a.id).localeCompare(String(b.serverName || b.id))),
    hooks: entries.filter(entry => entry.kind === 'hook'),
    skillDirs,
  };
}
