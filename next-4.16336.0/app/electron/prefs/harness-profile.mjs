// harnessProfile preference (C6) and the pure rules behind Settings › Harness.
// Renderer-safe: no node:* imports. main (harness-profile.cjs) imports this
// module for the overlay grammar and the safety rule; the renderer imports it
// for the same safety rule, so a switch is never offered that main refuses.
//
// The overlay's content is not a preference. It is app-managed state in
// <userData>/harness/overlay.json, rendered to overlay.patch.yml (JSON text,
// which is valid YAML) in the loader patch grammar the Harness applies after
// the app-owned profile (harness/profile/cordis.patch.yml).

import { t } from '../i18n/index.mjs';
export const HARNESS_PROFILE_DEFAULT = Object.freeze({ overlayEnabled: true });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeHarnessProfile(value) {
  return { overlayEnabled: !(object(value) && value.overlayEnabled === false) };
}

export function validateHarnessProfile(value) {
  if (value === null) return null;
  if (!object(value)) throw new Error(t('Invalid Harness profile setting.'));
  const { overlayEnabled = true } = value;
  if (typeof overlayEnabled !== 'boolean') throw new Error(t('Invalid Harness overlay setting.'));
  return { overlayEnabled };
}

// ------------------------------------------------------------------ safety

/** Rows the OpenClaude Desktop bundle inserts (harness/packages/code-desktop-app/cordis.patch.yml). */
export const APP_BUNDLE_IDS = Object.freeze(['tool-ask-user', 'code-desktop-startup', 'codex-app-server']);
/** Modules a person may switch off without breaking the core. */
export const TOGGLE_SAFE_MODULE = /dsh-(tool-(?!ask-user)|mcp-client|skill-(?!filesystem)|web-search|hooks-|experimental-|repeat-tool-reminder|time-context|tmux-context)/;
const PROTECTED_ID = /^(codex-app-server|code-desktop-startup|system-prompt|llm(-|$)|credentials|session(-|$)|agents?(-|$)|approval|permission)/;

/**
 * Whether one profile/read entry may get a switch.
 * @param {{id?: string, module?: string}} entry
 */
export function toggleSafe(entry) {
  const id = typeof entry?.id === 'string' ? entry.id : '';
  const module = typeof entry?.module === 'string' ? entry.module : '';
  if (!id || !module) return false;
  if (APP_BUNDLE_IDS.includes(id) || PROTECTED_ID.test(id)) return false;
  return TOGGLE_SAFE_MODULE.test(module);
}

// ----------------------------------------------------------------- overlay

export const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client';
export const MCP_ROW_PREFIX = 'cd-mcp-';
export const HOOK_ROW_PREFIX = 'cd-hooks-';
export const HOOK_MODULES = Object.freeze({ 'claude-code': '@deepseek-ai/dsh-hooks-claude-code', codex: '@deepseek-ai/dsh-hooks-codex' });
export const SKILL_ROW = 'skill-filesystem';
const ROW_ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,128}$/;
const absolute = value => typeof value === 'string' && value.startsWith('/') && value.length <= 1024 && !value.includes('\0');
const MAX_ROWS = 200, MAX_INSERTS = 50, MAX_DIRS = 32;

export const EMPTY_OVERLAY = Object.freeze({ rows: Object.freeze({}), inserts: Object.freeze([]) });

/** Lenient read of overlay.json: drops anything malformed. */
export function normalizeOverlay(value) {
  const rows = {}, inserts = [];
  if (object(value?.rows)) for (const [id, row] of Object.entries(value.rows).slice(0, MAX_ROWS)) {
    if (!ROW_ID.test(id) || !object(row)) continue;
    const next = {};
    if (typeof row.disabled === 'boolean') next.disabled = row.disabled;
    if (object(row.config)) next.config = row.config;
    if (Object.keys(next).length) rows[id] = next;
  }
  const seen = new Set();
  if (Array.isArray(value?.inserts)) for (const item of value.inserts.slice(0, MAX_INSERTS)) {
    if (!object(item) || !ROW_ID.test(item.id ?? '') || seen.has(item.id) || typeof item.name !== 'string' || !item.name) continue;
    seen.add(item.id);
    inserts.push({ id: item.id, name: item.name, ...(object(item.config) ? { config: item.config } : {}), ...(item.disabled === true ? { disabled: true } : {}) });
  }
  return { rows, inserts };
}

export const overlayEmpty = state => Object.keys(state?.rows ?? {}).length === 0 && (state?.inserts ?? []).length === 0;

/**
 * overlay.patch.yml: the loader patch list for the state, as an array. Inserts
 * come first so nothing later can miss them; the row patches follow.
 */
export function renderOverlay(state) {
  const { rows, inserts } = normalizeOverlay(state);
  const patches = [];
  if (inserts.length) patches.push({ insert: inserts.map(item => ({ id: item.id, name: item.name, ...(item.disabled ? { disabled: true } : {}), ...(item.config ? { config: item.config } : {}) })) });
  for (const [id, row] of Object.entries(rows)) patches.push({ id, ...(typeof row.disabled === 'boolean' ? { disabled: row.disabled } : {}), ...(row.config ? { config: row.config } : {}) });
  return patches;
}

/**
 * The overlay state after switching one row. Rows the overlay inserts carry
 * their own flag; every other row gets a `disabled: true|false` patch.
 * `entries` is the last profile/read; a row not in it, or unsafe, throws.
 */
export function setRowEnabled(state, { id, enabled }, entries = []) {
  const current = normalizeOverlay(state);
  if (typeof enabled !== 'boolean') throw new Error(t('Choose on or off.'));
  const insert = current.inserts.find(item => item.id === id);
  if (insert) {
    if (!toggleSafe({ id, module: insert.name })) throw new Error(t('This plugin can’t be turned off here.'));
    return { ...current, inserts: current.inserts.map(item => item.id !== id ? item : enabled ? (({ disabled, ...rest }) => rest)(item) : { ...item, disabled: true }) };
  }
  const entry = entries.find(candidate => candidate?.id === id);
  if (!entry || !toggleSafe(entry)) throw new Error(t('This plugin can’t be turned off here.'));
  // An explicit `disabled: false` also turns on a row an earlier layer disabled.
  return { ...current, rows: { ...current.rows, [id]: { ...current.rows[id], disabled: !enabled } } };
}

/** Strict MCP server row from the Add server dialog. */
export function mcpInsert(params, state) {
  const current = normalizeOverlay(state);
  const serverName = typeof params?.serverName === 'string' ? params.serverName.trim() : '';
  if (!SERVER_NAME.test(serverName)) throw new Error(t('Use 1–32 letters, digits, - or _ for the server name.'));
  const id = MCP_ROW_PREFIX + serverName;
  if (current.inserts.some(item => item.id === id) || (params?.existingNames ?? []).includes(serverName)) throw new Error(t('A server named {name} already exists.', { name: serverName }));
  let config;
  if (params?.transport === 'stdio') {
    const command = typeof params.command === 'string' ? params.command.trim() : '';
    if (!command || command.length > 1024 || command.includes('\0')) throw new Error(t('Enter the command that starts the server.'));
    const args = Array.isArray(params.args) ? params.args : [];
    if (args.length > 64 || args.some(arg => typeof arg !== 'string' || arg.length > 4096 || arg.includes('\0'))) throw new Error(t('Check the server arguments.'));
    const env = object(params.env) ? params.env : {};
    const entries = Object.entries(env);
    if (entries.length > 64 || entries.some(([key, value]) => !ENV_NAME.test(key) || typeof value !== 'string' || value.length > 8192)) throw new Error(t('Environment variables need NAME=value lines.'));
    // dsh-mcp-client stdio `cwd` (README config table): an absolute folder, optional.
    const cwd = typeof params.cwd === 'string' ? params.cwd.trim() : '';
    if (cwd && !absolute(cwd)) throw new Error(t('Enter the full path of the working folder.'));
    config = { transport: 'stdio', serverName, command, args: [...args], env: Object.fromEntries(entries), ...(cwd ? { cwd } : {}) };
  } else if (params?.transport === 'streamable-http') {
    let url;
    try { url = new URL(String(params.url ?? '').trim()); } catch { throw new Error(t('Enter an http or https URL.')); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(t('Enter an http or https URL.'));
    // dsh-mcp-client `headers`: the only way to authenticate a remote server (it has no OAuth), e.g. Authorization.
    const headers = object(params.headers) ? Object.entries(params.headers) : [];
    if (headers.length > 32 || headers.some(([key, value]) => !HEADER_NAME.test(key) || typeof value !== 'string' || value.length > 8192 || /[\r\n\0]/.test(value))) throw new Error(t('Headers need Name: value lines.'));
    config = { transport: 'streamable-http', serverName, url: url.href, ...(headers.length ? { headers: Object.fromEntries(headers) } : {}) };
  } else throw new Error(t('Choose stdio or HTTP.'));
  // dsh-mcp-client toolCallTimeoutMs, optional: seconds in the form.
  if (params?.toolCallTimeoutMs !== undefined && params.toolCallTimeoutMs !== null) {
    const ms = params.toolCallTimeoutMs;
    if (!Number.isInteger(ms) || ms < 1000 || ms > 3_600_000) throw new Error(t('Enter a tool timeout between 1 and 3600 seconds.'));
    config.toolCallTimeoutMs = ms;
  }
  return { ...current, inserts: [...current.inserts, { id, name: MCP_CLIENT, config }] };
}

/** Remove one row the overlay inserted (MCP servers, hook configs). */
export function removeInsert(state, id) {
  const current = normalizeOverlay(state);
  if (!current.inserts.some(item => item.id === id)) throw new Error(t('Only items added in OpenClaude Desktop can be removed here.'));
  return { ...current, inserts: current.inserts.filter(item => item.id !== id) };
}

/** Short stable hash (FNV-1a, 32-bit hex) so each hooks file gets its own row id. */
function pathHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

/**
 * Insert a hooks bridge reading a Claude Code or Codex hooks file. The row id
 * comes from the format and the file path, so several files can be added;
 * adding the same file again replaces its row.
 */
export function hooksInsert(state, { format, configPath } = {}) {
  const current = normalizeOverlay(state);
  const name = HOOK_MODULES[format];
  if (!name) throw new Error(t('Choose Claude Code or Codex hooks.'));
  if (!absolute(configPath) || !/\.json$/i.test(configPath)) throw new Error(t('Choose a hooks .json file.'));
  const id = `${HOOK_ROW_PREFIX}${format}-${pathHash(configPath)}`;
  return { ...current, inserts: [...current.inserts.filter(item => item.id !== id), { id, name, config: { configPath } }] };
}

/**
 * customSkillDirs on the skill-filesystem row. The loader's row patch replaces
 * the row's whole `config`, so the base profile's own config for that row (none
 * today) is dropped while this patch is set; only keys kept here survive.
 */
export function setSkillDirs(state, dirs) {
  const current = normalizeOverlay(state);
  if (!Array.isArray(dirs) || dirs.length > MAX_DIRS || dirs.some(dir => !absolute(dir))) throw new Error(t('Choose absolute skill folders.'));
  const unique = [...new Set(dirs.map(dir => dir.replace(/\/+$/, '') || '/'))];
  const rows = { ...current.rows };
  const { config, ...rest } = rows[SKILL_ROW] ?? {};
  const nextConfig = { ...(object(config) ? config : {}) };
  if (unique.length) nextConfig.customSkillDirs = unique; else delete nextConfig.customSkillDirs;
  const next = { ...rest, ...(Object.keys(nextConfig).length ? { config: nextConfig } : {}) };
  if (Object.keys(next).length) rows[SKILL_ROW] = next; else delete rows[SKILL_ROW];
  return { ...current, rows };
}

/**
 * Set or clear one managed row for other features (C5's provider rows).
 * `row.config` REPLACES the row's whole base config (the loader assigns
 * `config` as one value, no deep merge): pass the complete config the row
 * needs, e.g. the base config from profile/read merged with your keys.
 */
export function setManagedRow(state, id, row) {
  const current = normalizeOverlay(state);
  if (!ROW_ID.test(id ?? '')) throw new Error(t('Invalid profile row id.'));
  if (APP_BUNDLE_IDS.includes(id)) throw new Error(t('This row belongs to OpenClaude Desktop.'));
  const rows = { ...current.rows };
  if (row === null || row === undefined) delete rows[id];
  else rows[id] = normalizeOverlay({ rows: { [id]: row } }).rows[id] ?? {};
  if (rows[id] && !Object.keys(rows[id]).length) delete rows[id];
  return { ...current, rows };
}

/** Parse the Add server dialog's env textarea (NAME=value per line). */
export function parseEnvLines(text) {
  const env = {};
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at <= 0) throw new Error(t('Use NAME=value: {line}', { line: line.slice(0, 40) }));
    env[line.slice(0, at).trim()] = line.slice(at + 1);
  }
  return env;
}

/** Split an argument line like a shell would for simple quoting ("a b" 'c d' e). */
export function splitArgs(text) {
  const args = [], value = String(text ?? '');
  let current = '', quote = null, started = false;
  for (const char of value) {
    if (quote) { if (char === quote) quote = null; else current += char; continue; }
    if (char === '"' || char === "'") { quote = char; started = true; continue; }
    if (/\s/.test(char)) { if (started) { args.push(current); current = ''; started = false; } continue; }
    current += char; started = true;
  }
  if (quote) throw new Error(t('Close the quote in the arguments.'));
  if (started) args.push(current);
  return args;
}

export { HARNESS_PROFILE_DEFAULT as DEFAULT, normalizeHarnessProfile as normalize, validateHarnessProfile as validate };

/** Header lines from the Add server form ('Name: value' per line, blank lines skipped). */
export function parseHeaderLines(text) {
  const headers = {};
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const at = line.indexOf(':');
    if (at <= 0) throw new Error(t('Headers need Name: value lines.'));
    headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return headers;
}
