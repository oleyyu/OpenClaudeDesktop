// Settings › Models on the Codex core: OpenAI (Codex's own sign-in) or a custom
// OpenAI Responses-compatible endpoint (a GPT relay / 中转站). Pure: the main
// process (model-settings.cjs) builds Codex's launch arguments from it, and the
// renderer can share the validation.
//
// Stored by the main process in <userData>/codex/provider.json as
//   {version: 1, mode: 'openai'|'custom', baseURL, models: [id...], webSearch}
// with the key encrypted in <userData>/harness/provider-keys.bin under CODEX_KEY_SLOT.
// Codex gets it all as `-c` overrides after `app-server --stdio` (never written into
// ~/.codex/config.toml, which is the user's own CLI config) and the key as
// CODE_DESKTOP_CODEX_API_KEY in the Codex child's environment only, never in argv.
//
// Once an endpoint is saved, the `codedesktop` provider table stays defined in both
// modes, so threads recorded under it still resume; the provider id is never renamed.
// Codex 0.155.1 speaks only the Responses API (`wire_api = "chat"` is rejected), so a
// Chat Completions-only relay belongs on DeepSeek Harness › Custom providers instead.
let translate = null;
import('../i18n/index.mjs').then(module => { translate = module.t; }, () => {});
const t = (source, values) => translate ? translate(source, values)
  : values ? source.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match) : source;

export const CODEX_PROVIDER_ID = 'codedesktop';
export const CODEX_KEY_ENV = 'CODE_DESKTOP_CODEX_API_KEY';
export const CODEX_KEY_SLOT = '@codex';
export const CODEX_MODES = Object.freeze(['openai', 'custom']);
export const CODEX_WIRE_API = 'responses';
export const CODEX_PROVIDER_DEFAULT = Object.freeze({ mode: 'openai', baseURL: '', models: Object.freeze([]), webSearch: false });
// The bundled catalog entry custom model ids are cloned from: its efforts stop at xhigh,
// which relays accept (gpt-6-astra's max/ultra would be rejected).
export const CODEX_CATALOG_TEMPLATE = 'gpt-5.5';
const MAX_MODELS = 50, MAX_URL = 512;
const MODEL = /^[A-Za-z0-9_.:/@+-]{1,128}$/;
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\x00-\x20\x7f"'\\<>`]/;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** The base URL's user-facing error, or null. */
export function codexBaseURLError(value) {
  const text = String(value ?? '').trim();
  if (!text) return t('Enter the API base URL.');
  if (text.length > MAX_URL || UNSAFE.test(text)) return t('Enter the endpoint URL, e.g. https://api.example.com/v1.');
  let url;
  try { url = new URL(text); } catch { return t('Enter the endpoint URL, e.g. https://api.example.com/v1.'); }
  if (!['https:', 'http:'].includes(url.protocol)) return t('The base URL must start with https:// or http://.');
  if (url.username || url.password || url.search || url.hash) return t('The base URL can’t contain credentials, a query or a fragment.');
  return null;
}

// A local model server on this Mac (LM Studio's :1234, Ollama's :11434, Codex's own oss providers): it needs no API key.
export const CODEX_LOCAL_SERVERS = Object.freeze([
  Object.freeze({ id: 'lmstudio', name: 'LM Studio', baseURL: 'http://127.0.0.1:1234/v1' }),
  Object.freeze({ id: 'ollama', name: 'Ollama', baseURL: 'http://127.0.0.1:11434/v1' }),
]);
/** Whether a base URL is on this Mac (127.0.0.1, localhost, ::1): a local model server, which takes no key. */
export function codexLocalEndpoint(value) {
  try { const host = new URL(String(value ?? '').trim()).hostname.replace(/^\[|\]$/g, ''); return host === '127.0.0.1' || host === 'localhost' || host === '::1'; }
  catch { return false; }
}

/** Model ids from text (one per line, or comma/space separated) or an array; throws a user-facing Error. */
export function parseCodexModels(value) {
  const ids = (Array.isArray(value) ? value : String(value ?? '').split(/[\s,]+/)).map(id => String(id).trim()).filter(Boolean);
  if (ids.length > MAX_MODELS) throw new Error(t('Use {max} models or fewer.', { max: MAX_MODELS }));
  for (const id of ids) if (!MODEL.test(id)) throw new Error(t('Invalid model id: {id}', { id: id.slice(0, 40) }));
  return [...new Set(ids)];
}

/**
 * Strict check of {mode, baseURL, models, webSearch, wireApi?}; throws a user-facing Error. A typed base URL is
 * checked in both modes (an empty one clears the endpoint): a typo never quietly erases the saved endpoint.
 */
export function validateCodexProvider(value) {
  return checkCodexProvider(value, false);
}
function checkCodexProvider(value, lenient) {
  const input = isRecord(value) ? value : {};
  const mode = input.mode ?? 'openai';
  if (!CODEX_MODES.includes(mode)) throw new Error(t('Choose OpenAI or a custom endpoint.'));
  if (input.wireApi !== undefined && input.wireApi !== CODEX_WIRE_API)
    throw new Error(t('Codex supports only the Responses API. Add a Chat Completions endpoint as a custom provider on DeepSeek Harness.'));
  const baseURL = String(input.baseURL ?? '').trim().replace(/\/+$/, '');
  const error = baseURL || mode === 'custom' ? codexBaseURLError(baseURL) : null;
  if (error && (mode === 'custom' || !lenient)) throw new Error(error);
  const models = parseCodexModels(input.models);
  if (mode === 'custom' && !models.length) throw new Error(t('List at least one model id.'));
  return { mode, baseURL: error ? '' : baseURL, models, webSearch: input.webSearch === true };
}

/** Lenient read of provider.json: always a valid state. */
export function normalizeCodexProvider(value) {
  // An older provider.json may hold an OpenAI-mode URL that no longer passes: read as no endpoint, not as an error.
  try { return checkCodexProvider(isRecord(value) ? { ...value, wireApi: undefined } : value, true); }
  catch { return { ...CODEX_PROVIDER_DEFAULT, models: [] }; }
}


/** The provider a resumed or forked thread runs on, or null when nothing was saved (Codex's own default). */
export function codexThreadProvider(state) {
  const provider = normalizeCodexProvider(state);
  if (!provider.baseURL) return null;
  return provider.mode === 'custom' ? CODEX_PROVIDER_ID : 'openai';
}

/** A TOML basic string. */
export function tomlString(value) {
  return `"${String(value).replace(/[\\"\x00-\x1f\x7f]/g, char => char === '\\' ? '\\\\' : char === '"' ? '\\"'
    : `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
}

/**
 * Codex's `-c` overrides for a saved state ([] when no endpoint was saved). The key never
 * appears here: Codex reads it from CODEX_KEY_ENV, which the agent's own shells see blank.
 */
export function codexLaunchArgs(state, { catalogPath, keyless = false } = {}) {
  const provider = normalizeCodexProvider(state);
  if (!provider.baseURL) return [];
  // keyless: a local model server saved without a key; Codex then sends no Authorization header (no env_key).
  const table = `{name=${tomlString('OpenClaude Desktop')},base_url=${tomlString(provider.baseURL)},${keyless ? '' : `env_key=${tomlString(CODEX_KEY_ENV)},`}wire_api=${tomlString(CODEX_WIRE_API)}}`;
  const args = ['-c', `model_providers.${CODEX_PROVIDER_ID}=${table}`, '-c', `shell_environment_policy.set.${CODEX_KEY_ENV}=""`];
  if (provider.mode !== 'custom' || !provider.models.length) return args;
  args.push('-c', `model_provider=${tomlString(CODEX_PROVIDER_ID)}`, '-c', `model=${tomlString(provider.models[0])}`);
  if (catalogPath) args.push('-c', `model_catalog_json=${tomlString(catalogPath)}`);
  if (!provider.webSearch) args.push('-c', 'web_search="disabled"');
  return args;
}

/**
 * The model catalog for custom mode, from `codex debug models --bundled`: every bundled
 * entry hidden (helpers such as codex-auto-review stay resolvable), then one listed entry
 * per id, cloned whole from gpt-5.5 (base_instructions and model_messages included, or
 * app-server exits) and ordered as listed, so model/list's default is the first id. An id
 * that names a bundled model keeps that entry's own metadata. Throws without a template.
 */
export function buildCodexCatalog(bundled, ids, { description = '' } = {}) {
  const list = (Array.isArray(bundled?.models) ? bundled.models : []).filter(model => isRecord(model) && typeof model.slug === 'string');
  const template = list.find(model => model.slug === CODEX_CATALOG_TEMPLATE)
    ?? list.filter(model => model.visibility === 'list').sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (!template || typeof template.base_instructions !== 'string') throw new Error('The bundled Codex model catalog has no usable template.');
  const wanted = parseCodexModels(ids);
  const clones = wanted.map((id, priority) => {
    const own = list.find(model => model.slug === id);
    return { ...(own ?? template), slug: id, display_name: own?.display_name ?? id, description: own?.description ?? description,
      visibility: 'list', priority, upgrade: null, availability_nux: null, service_tiers: [], additional_speed_tiers: [] };
  });
  return { models: [...list.filter(model => !wanted.includes(model.slug)).map(model => ({ ...model, visibility: 'hide' })), ...clones] };
}
