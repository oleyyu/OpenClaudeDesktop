// The local environment's variables (Code › env pill › Local › settings → "Edit local environment"). Pure and
// renderer-safe: no node:* imports. Ported from the 2.31226.0 frontend:
// - cbd210f48 n/t: the dotenv parser (motdotla/dotenv's LINE regex) and the first line it can't read;
// - c66c54bc9 i/r/t: validate (KEY=value lines, identifier keys, no __proto__, managed variables refused),
//   parse (blank text → {}), serialize (quote a value that needs it);
// - c29df1c52 r: the textarea placeholder.
// Main (local-environment.cjs) stores the parsed object encrypted and hands it to every core it spawns
// (codex.cjs setLocalEnvironment); the dialog (source-local-environment-dialog.jsx) edits it as .env text.
import { t } from '../i18n/index.mjs';

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
const KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// c66c54bc9 r: the variables Claude Desktop sets for its sessions. Locally the app sets PATH, its own CODE_DESKTOP_*
// launch variables (agent tools, provider keys) and the DeepSeek connection (model-settings.cjs); the Claude ones
// stay refused so a variable meant for Claude Code never shadows what a core passes through.
export const MANAGED_ENV_KEYS = Object.freeze([
  'PATH',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_CUSTOM_HEADERS',
  'ANTHROPIC_BASE_URL',
  'DISABLE_AUTOUPDATER',
  'CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES',
  'CLAUDE_CODE_DISABLE_TERMINAL_TITLE',
  'CLAUDE_CODE_DISABLE_CRON',
  'CLAUDE_CODE_SIMPLE',
  'CLAUDE_AGENT_SDK_MCP_NO_PREFIX',
  'CLAUDE_CODE_PROCESS_WRAPPER',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
]);
const MANAGED_PREFIXES = Object.freeze(['CODE_DESKTOP_', 'ELECTRON_']);

// c29df1c52 f
export const ENVIRONMENT_PLACEHOLDER = `NODE_ENV=production
GIT_AUTHOR_NAME=Your Name

# Multiline values - wrap in quotes
CONFIG="key1=val1
key2=val2"`;

export function isManagedEnvKey(key) {
  const upper = String(key).toUpperCase();
  return MANAGED_ENV_KEYS.some((name) => name === upper) || MANAGED_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

// cbd210f48 t: KEY=value / KEY: value / export KEY=value, quoted ('…', "…", `…`) values may span lines; in a double-quoted
// value \n and \r are newlines. A later duplicate wins.
export function parseDotenv(text) {
  const values = Object.create(null);
  const source = String(text ?? '').replace(/\r\n?/gm, '\n');
  LINE.lastIndex = 0;
  let match;
  while ((match = LINE.exec(source)) !== null) {
    const key = match[1];
    let value = (match[2] ?? '').trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2');
    if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    values[key] = value;
  }
  return values;
}

// cbd210f48 n: the first non-blank, non-comment line the parser skipped. allowTrailingBareKey lets the line being typed
// (`FOO` or `FOO:` at the end) pass while the error under the field is computed.
export function unparseableLine(text, { allowTrailingBareKey = false } = {}) {
  const source = String(text ?? '');
  if (!source.trim()) return undefined;
  LINE.lastIndex = 0;
  const lines = source.replace(/\r\n?/g, '\n').replace(LINE, '').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) continue;
    if (allowTrailingBareKey && index === lines.length - 1 && /^(?:export\s+)?[\w.-]+:?$/.test(line)) continue;
    return line;
  }
  return undefined;
}

// c66c54bc9 i: the error for the text, or undefined when it saves. checkManagedVars refuses the app's own variables;
// reservedKeys (a scoped environment's CLAUDE_CONFIG_DIR…) has no local counterpart but keeps the source's option.
export function validateEnvironmentText(text, { allowTrailingBareKey = false, checkManagedVars = false, reservedKeys, skipKeys } = {}) {
  const source = String(text ?? '');
  if (!source.trim()) return undefined;
  const line = unparseableLine(source, { allowTrailingBareKey });
  if (line !== undefined) return t('Couldn’t parse "{line}". Use KEY=value format.', { line });
  for (const key of Object.keys(parseDotenv(source))) {
    if (skipKeys?.has?.(key)) continue;
    if (!KEY.test(key)) return t('Invalid key "{key}". Use letters, numbers, and underscores only.', { key });
    if (key === '__proto__') return t('"{key}" can’t be used as a variable name.', { key });
    if (checkManagedVars && isManagedEnvKey(key)) return t('"{key}" is managed by OpenClaude Desktop and cannot be overridden.', { key });
    if (reservedKeys?.some((name) => name.toUpperCase() === key.toUpperCase())) return t('"{key}" can only be set for all sessions, not for one environment.', { key });
  }
  return undefined;
}

// c66c54bc9 r
export function parseEnvironmentText(text) {
  return String(text ?? '').trim() ? { ...parseDotenv(text) } : {};
}

// c66c54bc9 t: a value with a newline, $, #, quotes or edge spaces is quoted: '…' unless it holds a single quote,
// then "…" with its double quotes escaped.
export function serializeEnvironment(values) {
  return Object.entries(values ?? {}).map(([key, value]) => {
    const text = String(value);
    const quoted = text.includes('\n') || text.includes('\r') || text.includes('$') || text.includes('#') || text.includes('"')
      || text.includes("'") || text.startsWith(' ') || text.endsWith(' ');
    if (!quoted) return `${key}=${text}`;
    return text.includes("'") ? `${key}="${text.replace(/"/g, '\\"')}"` : `${key}='${text}'`;
  }).join('\n');
}

// What main stores and hands a core: string values under valid, unmanaged keys (a hand-edited or older file loses the
// rest). Throws the validation message for anything the dialog would refuse.
export function normalizeEnvironment(values, { strict = false } = {}) {
  if (values === null || values === undefined) return {};
  if (typeof values !== 'object' || Array.isArray(values)) {
    if (strict) throw new Error(t('Invalid environment variables.'));
    return {};
  }
  const result = {};
  for (const [key, value] of Object.entries(values)) {
    const valid = KEY.test(key) && key !== '__proto__' && !isManagedEnvKey(key) && typeof value === 'string' && !value.includes('\0');
    if (valid) { result[key] = value; continue; }
    if (!strict) continue;
    if (!KEY.test(key) || key === '__proto__') throw new Error(t('Invalid key "{key}". Use letters, numbers, and underscores only.', { key }));
    if (isManagedEnvKey(key)) throw new Error(t('"{key}" is managed by OpenClaude Desktop and cannot be overridden.', { key }));
    throw new Error(t('Invalid environment variables.'));
  }
  return result;
}
