// C5 model parameters and pricing (preferences.json key `modelSettings`).
// Pure: imported by the main process (settingsPatch, model-settings.cjs) and
// the renderer (Settings → Models, withEffortDefaults for the model menus).
//
//   params   {['<coreId>:<modelId>' | modelId]: {maxTokens?, temperature?, contextWindow?, effort?, images?}}
//            Keys carry the core id (electron/cores/<id>.mjs) since Settings › Models › per-model options, so two
//            cores' same-named models keep their own values; a bare modelId is an entry saved before that, read for
//            every core until a core edits it (setModelParam with a coreId moves it under that core's key).
//            maxTokens / temperature / contextWindow travel to the core as
//            params.codeDesktop.customization.modelParams (model-params.js);
//            contextWindow replaces the model's context capacity, which the core compacts by (and reports back as
//            the usage meter's modelContextWindow and auto-compact limit);
//            effort only replaces the catalog's defaultReasoningEffort here;
//            images: false turns image input off for the model in the composer (withModelOverrides), even where
//            the catalog accepts images. Only false is stored: the catalog decides otherwise.
//   prices   null (the official table) | {[modelId]: {displayName?, offPeak, peak}}
//            CNY per 1M tokens; account/usage/read gets it as
//            params.codeDesktop.prices (bridge pricing.js priceTable).
// top_p is not offered: no Harness LlmCallConfig field carries it.
// i18n is loaded lazily: model-settings.cjs require()s this module while its own
// import() of it may still be in flight, which any static dependency would break.
// provider-presets.mjs is a leaf module (no imports), so loading it statically is safe.
import { isReasoningPresetEndpoint } from './provider-presets.mjs';
import { modelFamily, modelDisplayName } from './model-families.mjs';
let translate = null;
import('../i18n/index.mjs').then(module => { translate = module.t; }, () => {});
const t = (source, values) => translate ? translate(source, values)
  : values ? source.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match) : source;
export const MODEL_SETTINGS_DEFAULT = Object.freeze({ params: Object.freeze({}), prices: null });
export const DEFAULT = MODEL_SETTINGS_DEFAULT;
export const MAX_TOKENS_MIN = 256;
export const MAX_TOKENS_MAX = 1000000;
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 2;
export const PRICE_MAX = 10000;
export const MAX_ENTRIES = 50;
// Per-model parameter entries (one per core and model since keys carry the core id).
export const PARAMS_MAX_ENTRIES = 200;
export const DISPLAY_NAME_MAX = 60;
export const PRICE_TIERS = Object.freeze(['offPeak', 'peak']);
export const PRICE_FIELDS = Object.freeze(['cacheHit', 'cacheMiss', 'output']);
// The ids cores really list: Qwen suffixes its auth type (`qwen3-coder-plus(openai)`), OpenCode's models.dev ids
// may carry `@`, and a custom provider's model ids (PROVIDER_MODEL below) `@` or `+`. Keys are only ever own properties of plain records; __proto__ is refused below.
const MODEL_ID = /^[A-Za-z0-9_.:/()@+-]{1,128}$/;
const EFFORT = /^[a-z0-9_-]{1,32}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

export const isModelId = value => typeof value === 'string' && value !== '__proto__' && MODEL_ID.test(value);

/**
 * Whether a core reads per-model max tokens / temperature (codeDesktop.customization.modelParams), from its
 * coreCapabilities(). An explicit `modelParams` capability decides; a core that doesn't declare it falls back to
 * `customization` (every customization bridge but one reads modelParams; that one declares modelParams: false).
 * Settings › Models shows the rows and main's decorate() sends the values on exactly this check.
 */
export const coreTakesModelParams = capabilities => capabilities?.modelParams !== undefined && capabilities?.modelParams !== null
  ? capabilities.modelParams === true : capabilities?.customization === true;

/** One parameter's user-facing error, or null when the value is valid (undefined = unset). */
export function modelParamError(field, value) {
  if (value === undefined) return null;
  if (field === 'maxTokens') {
    if (!Number.isInteger(value) || value < MAX_TOKENS_MIN || value > MAX_TOKENS_MAX)
      return t('Max output tokens must be a whole number from {min} to {max}.', { min: MAX_TOKENS_MIN, max: MAX_TOKENS_MAX.toLocaleString('en-US') });
    return null;
  }
  if (field === 'temperature') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < TEMPERATURE_MIN || value > TEMPERATURE_MAX)
      return t('Temperature must be a number from {min} to {max}.', { min: TEMPERATURE_MIN, max: TEMPERATURE_MAX });
    return null;
  }
  if (field === 'contextWindow') {
    if (!Number.isInteger(value) || value < CONTEXT_WINDOW_MIN || value > CONTEXT_WINDOW_MAX)
      return t('Context window must be a whole number of tokens from {min} to {max}, such as 128K or 1M.', { min: CONTEXT_WINDOW_MIN.toLocaleString('en-US'), max: CONTEXT_WINDOW_MAX.toLocaleString('en-US') });
    return null;
  }
  if (field === 'effort') return typeof value === 'string' && EFFORT.test(value) ? null : t('Choose a reasoning effort.');
  if (field === 'images') return value === false ? null : t('Image input can only be turned off here.');
  return t('Unknown model parameter.');
}

/** One price's user-facing error, or null. */
export function priceError(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= PRICE_MAX ? null
    : t('Prices must be numbers from 0 to {max} CNY per 1M tokens.', { max: PRICE_MAX.toLocaleString('en-US') });
}

const PARAM_FIELDS = ['maxTokens', 'temperature', 'contextWindow', 'effort', 'images'];
function paramsEntry(value, strict) {
  if (!isRecord(value)) { if (strict) throw new Error(t('Invalid model parameters.')); return null; }
  const entry = {};
  for (const field of PARAM_FIELDS) {
    const raw = value[field];
    if (raw === undefined || raw === null || raw === '' || (field === 'images' && raw === true)) continue;
    const error = modelParamError(field, raw);
    if (error) { if (strict) throw new Error(error); continue; }
    entry[field] = field === 'temperature' ? round(raw, 2) : raw;
  }
  if (strict) for (const key of Object.keys(value)) if (!PARAM_FIELDS.includes(key)) throw new Error(t('Unknown model parameter.'));
  return Object.keys(entry).length ? entry : null;
}

function priceEntry(value, strict) {
  const fail = message => { if (strict) throw new Error(message); return null; };
  if (!isRecord(value)) return fail(t('Invalid price.'));
  const entry = {};
  if (value.displayName !== undefined && value.displayName !== '') {
    const name = typeof value.displayName === 'string' ? value.displayName.trim() : null;
    if (name === null || name.length > DISPLAY_NAME_MAX || CONTROL.test(name)) {
      if (strict) throw new Error(t('Model names must be {max} characters or fewer.', { max: DISPLAY_NAME_MAX }));
    } else if (name) entry.displayName = name;
  }
  for (const tier of PRICE_TIERS) {
    if (!isRecord(value[tier])) return fail('Every price needs off-peak and peak values.');
    const prices = {};
    for (const field of PRICE_FIELDS) {
      const error = priceError(value[tier][field]);
      if (error) return fail(error);
      prices[field] = round(value[tier][field], 6);
    }
    entry[tier] = prices;
  }
  return entry;
}

function modelMap(value, entryOf, strict, label) {
  if (!isRecord(value)) { if (strict) throw new Error(label === 'prices' ? t('Invalid prices.') : t('Invalid model parameters.')); return {}; }
  const keys = Object.keys(value), max = label === 'prices' ? MAX_ENTRIES : PARAMS_MAX_ENTRIES;
  if (strict && keys.length > max) throw new Error(t('Use {max} models or fewer.', { max }));
  const out = {};
  for (const key of keys) {
    if (Object.keys(out).length >= max) break;
    if (!isModelId(key)) { if (strict) throw new Error(t('Model ids may use letters, digits and . _ : / ( ) @ + - only (128 characters at most).')); continue; }
    const entry = entryOf(value[key], strict);
    if (entry) out[key] = entry;
  }
  return out;
}

/** Lenient read: always a valid {params, prices}. */
export function normalize(value) {
  const input = isRecord(value) ? value : {};
  const prices = isRecord(input.prices) ? modelMap(input.prices, priceEntry, false, 'prices') : null;
  return { params: modelMap(input.params, paramsEntry, false, 'model parameters'), prices: prices && Object.keys(prices).length ? prices : null };
}

/** Strict write check: throws a user-facing Error; null resets to the default. */
export function validate(value) {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error(t('Invalid model settings.'));
  for (const key of Object.keys(value)) if (key !== 'params' && key !== 'prices') throw new Error(t('Invalid model settings.'));
  const params = value.params === undefined ? {} : modelMap(value.params, paramsEntry, true, 'model parameters');
  const prices = value.prices === undefined || value.prices === null ? null : modelMap(value.prices, priceEntry, true, 'prices');
  return { params, prices: prices && Object.keys(prices).length ? prices : null };
}
export const validateModelSettings = validate;
export const normalizeModelSettings = normalize;

/**
 * Catalog models with the user's default effort: an entry's
 * defaultReasoningEffort becomes params[m.model].effort when that effort is
 * one of its supportedReasoningEfforts. Unchanged entries keep their identity.
 */
export function withEffortDefaults(models, modelSettings, coreId = null) {
  const list = Array.isArray(models) ? models : [];
  const params = normalize(modelSettings).params;
  if (!Object.keys(params).length) return list;
  return list.map(model => {
    const effort = model ? paramsEntryFor(params, coreId, model.model)?.effort : undefined;
    if (!effort || effort === model.defaultReasoningEffort) return model;
    const supported = (model.supportedReasoningEfforts || []).some(item => (item?.reasoningEffort ?? item) === effort);
    return supported ? { ...model, defaultReasoningEffort: effort } : model;
  });
}

// ---- Keys with the core id: '<coreId>:<modelId>', and a bare modelId saved before them.
const CORE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** The params key of a core's model: '<coreId>:<modelId>', or the bare modelId without a (valid) core id. */
export function modelParamsKey(coreId, modelId) {
  return typeof coreId === 'string' && CORE_ID.test(coreId) ? `${coreId}:${modelId}` : modelId;
}
/** One model's params for a core: its own (prefixed) entry, else one saved before core ids, else undefined. */
function paramsEntryFor(params, coreId, modelId) {
  if (typeof modelId !== 'string') return undefined;
  const key = modelParamsKey(coreId, modelId);
  if (key !== modelId && Object.hasOwn(params, key)) return params[key];
  return Object.hasOwn(params, modelId) ? params[modelId] : undefined;
}
/** The {maxTokens?, temperature?, contextWindow?, effort?, images?} a core's model has (an empty record when none). */
export function modelParamsFor(modelSettings, coreId, modelId) {
  return { ...(paramsEntryFor(normalize(modelSettings).params, coreId, modelId) ?? {}) };
}
/**
 * Catalog models with the user's per-model options for a core: the default effort (withEffortDefaults) and image
 * input turned off (images: false → inputModalities without 'image', which the composer's modelAcceptsImages reads).
 * Unchanged entries keep their identity.
 */
export function withModelOverrides(models, modelSettings, coreId = null) {
  const list = withEffortDefaults(models, modelSettings, coreId), params = normalize(modelSettings).params;
  if (!Object.keys(params).length) return list;
  let changed = list !== models;
  const out = list.map(model => {
    if (!model || paramsEntryFor(params, coreId, model.model)?.images !== false) return model;
    const modalities = Array.isArray(model.inputModalities) ? model.inputModalities.filter(item => item !== 'image') : ['text'];
    changed = true;
    return { ...model, inputModalities: modalities.length ? modalities : ['text'], imagesOff: true };
  });
  return changed ? out : list;
}

/**
 * {[wireModelId]: {maxTokens?, temperature?, contextWindow?}} for the core, or null when nothing applies. With a
 * coreId, that core's own entries (keys '<coreId>:<modelId>') win over ones saved before core ids. Another core's
 * prefixed keys can't be told from a model id with a colon (Ollama's 'qwen3:8b'), so they go along as bare ids, which
 * match no model the running core lists.
 */
export function modelParamsForCore(modelSettings, coreId = null) {
  const out = {}, params = normalize(modelSettings).params, prefix = typeof coreId === 'string' && CORE_ID.test(coreId) ? `${coreId}:` : null;
  const own = prefix ? Object.keys(params).filter(key => key.startsWith(prefix)) : [];
  const legacy = Object.keys(params).filter(key => !own.includes(key));
  for (const [id, entry, mine] of [...legacy.map(key => [key, params[key], false]), ...own.map(key => [key.slice(prefix.length), params[key], true])]) {
    if (mine) delete out[id];
    const core = {};
    if (entry.maxTokens !== undefined) core.maxTokens = entry.maxTokens;
    if (entry.temperature !== undefined) core.temperature = entry.temperature;
    if (entry.contextWindow !== undefined) core.contextWindow = entry.contextWindow;
    if (Object.keys(core).length) out[id] = core;
  }
  return Object.keys(out).length ? out : null;
}

/** The price overrides for account/usage/read, or null for the official table. */
export function pricesForCore(modelSettings) {
  return normalize(modelSettings).prices;
}

/** A copy of an official table ({[id]: {displayName?, offPeak, peak}}) in the prefs shape. */
export function pricesFromOfficial(official) {
  return modelMap(official, priceEntry, false, 'prices');
}

// ---- Settings → Models edits (pure; each returns the next modelSettings or null for the default)

const compact = settings => {
  const next = normalize(settings);
  return Object.keys(next.params).length || next.prices ? next : null;
};

/** Text of a number field → number, undefined (empty) or NaN (not a number). */
export function parseNumberInput(text) {
  const value = String(text ?? '').trim();
  if (!value) return undefined;
  return /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(value) ? Number(value) : NaN;
}

/**
 * Set or clear (undefined) one parameter of one model; throws a user-facing Error when invalid. With a coreId the value
 * is saved under that core's key ('<coreId>:<modelId>'), and an entry saved for the bare modelId before core ids moves
 * there with it. images takes false (off) or true / undefined (the catalog decides).
 */
export function setModelParam(settings, modelId, field, value, coreId = null) {
  if (!isModelId(modelId)) throw new Error(t('Invalid model.'));
  if (field === 'images' && value === true) value = undefined;
  const error = modelParamError(field, value);
  if (error) throw new Error(error);
  const current = normalize(settings), key = modelParamsKey(coreId, modelId);
  if (!isModelId(key)) throw new Error(t('Invalid model.'));
  const entry = { ...(paramsEntryFor(current.params, coreId, modelId) || {}) };
  if (value === undefined || value === '') delete entry[field];
  else entry[field] = field === 'temperature' ? round(value, 2) : value;
  // The core keeps max output tokens of the window free for the reply: a window no larger leaves nothing to read.
  if (entry.maxTokens !== undefined && entry.contextWindow !== undefined && entry.maxTokens >= entry.contextWindow)
    throw new Error(t('Max output tokens must be smaller than the context window.'));
  const params = { ...current.params };
  if (key !== modelId) delete params[modelId];
  if (Object.keys(entry).length) params[key] = entry; else delete params[key];
  return compact({ ...current, params });
}

/** The price table the page shows: the overrides, else a copy of the official table. */
export function effectivePrices(settings, official) {
  return normalize(settings).prices ?? pricesFromOfficial(official);
}

/** Change one price; the first edit copies the official table into prices. */
export function setPrice(settings, official, modelId, tier, field, value) {
  if (!PRICE_TIERS.includes(tier) || !PRICE_FIELDS.includes(field)) throw new Error(t('Invalid price.'));
  const error = priceError(value);
  if (error) throw new Error(error);
  const prices = effectivePrices(settings, official);
  if (!prices[modelId]) throw new Error(t('Invalid model.'));
  const entry = prices[modelId];
  return compact({ ...normalize(settings), prices: { ...prices, [modelId]: { ...entry, [tier]: { ...entry[tier], [field]: round(value, 6) } } } });
}

/** Add a model with zero prices (to be edited); throws a user-facing Error. */
export function addPrice(settings, official, modelId, displayName = '') {
  const id = String(modelId ?? '').trim();
  if (!isModelId(id)) throw new Error(t('Model ids may use letters, digits and . _ : / ( ) @ + - only (128 characters at most).'));
  const prices = effectivePrices(settings, official);
  if (prices[id]) throw new Error(t('That model already has a price.'));
  if (Object.keys(prices).length >= MAX_ENTRIES) throw new Error(t('Use {max} models or fewer.', { max: MAX_ENTRIES }));
  const name = String(displayName ?? '').trim();
  if (name.length > DISPLAY_NAME_MAX || CONTROL.test(name)) throw new Error(t('Model names must be {max} characters or fewer.', { max: DISPLAY_NAME_MAX }));
  const zero = { cacheHit: 0, cacheMiss: 0, output: 0 };
  return compact({ ...normalize(settings), prices: { ...prices, [id]: { ...(name ? { displayName: name } : {}), offPeak: { ...zero }, peak: { ...zero } } } });
}

/** Remove one model's price. */
export function removePrice(settings, official, modelId) {
  const prices = { ...effectivePrices(settings, official) };
  delete prices[modelId];
  return compact({ ...normalize(settings), prices });
}

/** Back to the official table (prices null). */
export function resetPrices(settings) {
  return compact({ ...normalize(settings), prices: null });
}

/** Whether a model's prices differ from the official entry (an added model always does). */
export function priceEdited(prices, official, modelId) {
  const entry = prices?.[modelId], base = official?.[modelId];
  if (!entry) return false;
  if (!base) return true;
  return PRICE_TIERS.some(tier => PRICE_FIELDS.some(field => entry[tier]?.[field] !== base[tier]?.[field]));
}

// ---- Custom OpenAI-compatible providers (DeepSeek core only)
// The Harness already ships the dormant `llm-pi-ai` adapter row (dsh-base);
// its config `providers: {[route]: {displayName, api, baseURL, apiKeyEnv, models}}`
// turns routes on. OpenClaude Desktop writes that one row through Settings › Harness's
// managed overlay (harness-profile.cjs) and exports each key to the core
// process as CODE_DESKTOP_PROVIDER_KEY_<ROUTE>; the key itself is stored
// encrypted (Electron safeStorage), never in preferences.json or ~/.dsh.
export const PROVIDER_PROTOCOLS = Object.freeze(['openai-completions', 'openai-responses', 'anthropic-messages']);
export const PROVIDER_ROW_ID = 'llm-pi-ai';
export const MAX_PROVIDERS = 8;
const ROUTE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const PROVIDER_MODEL = /^[A-Za-z0-9_.:/@+-]{1,128}$/;
const RESERVED_ROUTES = new Set(['deepseek']);

// A model's context window (custom providers and relay models carry no such fact; the cores assume 262,144 tokens and
// compact by it): an optional per-model token count, written into the catalog row as contextWindow.
export const CONTEXT_WINDOW_MIN = 1024;
export const CONTEXT_WINDOW_MAX = 100_000_000;
/**
 * A token count as people write it: 131072, 131,072, 128K (128,000), 1M or 1.5M (K and M are thousands and
 * millions). null for an empty value, NaN for anything else.
 */
export function parseTokenCount(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isInteger(value) ? value : NaN;
  const text = String(value).trim().replace(/[,_\s]/g, '');
  if (!text) return null;
  const match = /^(\d+(?:\.\d+)?)([kKmM]?)$/.exec(text);
  if (!match) return NaN;
  const scale = { '': 1, k: 1000, m: 1000000 }[match[2].toLowerCase()];
  const count = Number(match[1]) * scale;
  return Number.isInteger(count) ? count : Math.round(count);
}
/** The {id: tokens} context windows for the listed ids (strict: throws a user-facing Error on a bad entry). */
export function contextWindowsFor(value, ids) {
  const out = {};
  if (!isRecord(value)) return out;
  for (const id of ids) {
    if (!Object.hasOwn(value, id)) continue;
    const count = parseTokenCount(value[id]);
    if (count === null) continue;
    if (!Number.isInteger(count) || count < CONTEXT_WINDOW_MIN || count > CONTEXT_WINDOW_MAX) throw new Error(t('Invalid context window for {id}. Use a number such as 131072, 128K or 1M.', { id: id.slice(0, 40) }));
    out[id] = count;
  }
  return out;
}
/** The context windows a /models listing reports (context_length, context_window, max_input_tokens, limit.context). */
export function listedContextWindows(list) {
  const out = {};
  for (const item of Array.isArray(list) ? list : []) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' ? item.id.replace(/^models\//, '') : typeof item.name === 'string' ? item.name.replace(/^models\//, '') : null;
    const count = [item.contextWindow, item.context_window, item.context_length, item.max_input_tokens, item.inputTokenLimit, item.limit?.context].find(value => Number.isInteger(value));
    if (id && Number.isInteger(count) && count >= CONTEXT_WINDOW_MIN && count <= CONTEXT_WINDOW_MAX) out[id] = count;
  }
  return out;
}
const withContextWindows = windows => (Object.keys(windows).length ? { contextWindows: windows } : {});

/** The env var the core reads a route's key from. */
export const providerKeyEnv = route => `CODE_DESKTOP_PROVIDER_KEY_${String(route).toUpperCase().replace(/-/g, '_')}`;

/** Strict check of one provider definition (no key); throws a user-facing Error. */
export function validateProvider(value) {
  if (!isRecord(value)) throw new Error(t('Invalid provider.'));
  const route = String(value.route ?? '').trim();
  if (!ROUTE.test(route)) throw new Error(t('Provider ids use lowercase letters, digits and - (32 characters at most).'));
  if (RESERVED_ROUTES.has(route)) throw new Error(t('“deepseek” is reserved for the built-in DeepSeek API. Choose another id.'));
  const displayName = String(value.displayName ?? '').trim();
  if (displayName.length > DISPLAY_NAME_MAX || CONTROL.test(displayName)) throw new Error(t('Provider names must be {max} characters or fewer.', { max: DISPLAY_NAME_MAX }));
  const api = value.api ?? PROVIDER_PROTOCOLS[0];
  if (!PROVIDER_PROTOCOLS.includes(api)) throw new Error(t('Choose a protocol.'));
  const baseURL = String(value.baseURL ?? '').trim();
  let url;
  try { url = new URL(baseURL); } catch { throw new Error(t('Enter the endpoint URL, e.g. https://api.example.com/v1.')); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(t('The endpoint must be an http(s) URL without credentials.'));
  const models = (Array.isArray(value.models) ? value.models : String(value.models ?? '').split(/[\s,]+/))
    .map(id => String(id).trim()).filter(Boolean);
  if (!models.length) throw new Error(t('List at least one model id.'));
  if (models.length > MAX_ENTRIES) throw new Error(t('Use {max} models or fewer.', { max: MAX_ENTRIES }));
  for (const id of models) if (!PROVIDER_MODEL.test(id)) throw new Error(t('Invalid model id: {id}', { id: id.slice(0, 40) }));
  // imageModels: the user's marks (an empty list included, = none); absent until they choose, so the family decides.
  const unique = [...new Set(models)], imageModels = imageSubset(value.imageModels, unique);
  return { route, ...(displayName ? { displayName } : {}), api, baseURL, models: unique, ...(imageModels.length || Array.isArray(value.imageModels) ? { imageModels } : {}), ...withContextWindows(contextWindowsFor(value.contextWindows, unique)) };
}

// Which of a model list accept image input. The cores only send images to a model whose catalog entry says so
// (text-only otherwise), and a relay's or custom provider's ids carry no such facts, so the user marks them.
// Ids not in the list are dropped.
export const IMAGE_MODALITIES = Object.freeze(['text', 'image']);
export function imageSubset(value, ids) {
  const wanted = new Set((Array.isArray(value) ? value : []).map(id => String(id).trim()));
  return ids.filter(id => wanted.has(id));
}
// DeepSeek's own image-capable models (dsh-llm-deepseek's catalog: deepseek-flash takes images, deepseek-v4-pro
// doesn't), as relays usually name them. A relay saved before images could be marked starts with these on.
const DEEPSEEK_IMAGE_MODEL = /^deepseek-(?:v4(?:\.\d+)?-)?flash$/i;
export const defaultRelayImageModels = ids => ids.filter(id => DEEPSEEK_IMAGE_MODEL.test(id));

/** Lenient read of the stored provider list. */
export function normalizeProviders(value) {
  const out = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (out.length >= MAX_PROVIDERS) break;
    try { const provider = validateProvider(item); if (!out.some(other => other.route === provider.route)) out.push(provider); } catch {}
  }
  return out;
}

// A thinking model (GLM, Kimi, Qwen, Claude, GPT…, also through a relay) offers Low/Medium/High; without the declaration the core treats a
// hand-declared route's models as non-reasoning and the composer's effort picker stays on "Model default".
// Anthropic-protocol routes turn the level into a thinking budget, OpenAI-protocol ones send it as reasoning_effort.
export const PRESET_REASONING_EFFORTS = Object.freeze({ off: null, low: 'low', medium: 'medium', high: 'high' });
// A family's levels as the core's reasoningEfforts: each level sent under its own name; `off` sends nothing.
const effortMap = (levels) => ({ off: null, ...Object.fromEntries(levels.map(level => [level, level])) });

/**
 * One overlay model entry. The id's family (model-families.mjs) supplies what a bare relay id lacks: the vendor's
 * name ("GLM 5.3"), thinking levels and image input; the user's marks (images, context window) win.
 */
export function providerModelEntry(provider, id) {
  // Also on the Claude and OpenAI presets' routes: the core's catalog there lags the vendors (no gpt-6.1-sol), and an
  // entry it doesn't describe would otherwise be a nameless text-only model; the family's levels match the vendor's.
  const family = modelFamily(id);
  const images = provider.imageModels ? provider.imageModels.includes(id) : family?.image === true;
  const reasoning = family ? family.reasoning : isReasoningPresetEndpoint(provider.baseURL);
  return {
    id,
    ...(family?.name ? { name: family.name } : {}),
    ...(images ? { input: [...IMAGE_MODALITIES] } : {}),
    ...(provider.contextWindows?.[id] ? { contextWindow: provider.contextWindows[id] } : {}),
    ...(reasoning ? { reasoningEfforts: family ? effortMap(family.efforts) : { ...PRESET_REASONING_EFFORTS } } : {}),
  };
}

/** The managed `llm-pi-ai` overlay row for the providers, or null to remove it. */
export function providerOverlayRow(providers) {
  const list = normalizeProviders(providers);
  if (!list.length) return null;
  return { config: { providers: Object.fromEntries(list.map(provider => [provider.route, {
    ...(provider.displayName ? { displayName: provider.displayName } : {}),
    api: provider.api, baseURL: provider.baseURL, apiKeyEnv: providerKeyEnv(provider.route),
    models: provider.models.map(id => providerModelEntry(provider, id)),
  }])) } };
}

// ---- API connection (DeepSeek core): the official API or a third-party relay
// The relay must speak Anthropic Messages (the llm-deepseek adapter appends
// /v1/messages) and serve DeepSeek's model ids. The main process
// (model-settings.cjs) stores each mode's key under these reserved names.
export const CONNECTION_MODES = Object.freeze(['official', 'relay']);
export const CONNECTION_KEY_OFFICIAL = '@official';
export const CONNECTION_KEY_RELAY = '@relay';
export const OFFICIAL_BASE_URL = 'https://api.deepseek.com/anthropic';

/** The relay base URL's user-facing error, or null. */
export function relayBaseURLError(value) {
  const text = String(value ?? '').trim();
  if (!text) return t('Enter the relay’s base URL.');
  let url;
  try { url = new URL(text); } catch { return t('Enter a URL such as https://relay.example.com/anthropic.'); }
  if (!['https:', 'http:'].includes(url.protocol)) return t('The base URL must start with https:// or http://.');
  if (url.username || url.password || url.search || url.hash) return t('The base URL can’t contain credentials, a query or a fragment.');
  return null;
}

/**
 * The relay's model ids from text (one per line, or comma/space separated) or
 * an array; throws a user-facing Error. Empty keeps DeepSeek's own ids.
 */
export function parseRelayModels(value) {
  const ids = (Array.isArray(value) ? value : String(value ?? '').split(/[\s,]+/)).map(id => String(id).trim()).filter(Boolean);
  if (ids.length > MAX_ENTRIES) throw new Error(t('Use {max} models or fewer.', { max: MAX_ENTRIES }));
  for (const id of ids) if (!PROVIDER_MODEL.test(id)) throw new Error(t('Invalid model id: {id}', { id: id.slice(0, 40) }));
  return [...new Set(ids)];
}

/**
 * The managed `llm-deepseek` overlay row that replaces the adapter's model
 * catalog with the relay's ids, or null to keep the built-in catalog.
 */
export function relayCatalogRow(connection) {
  if (connection?.mode !== 'relay' || !connection.relayModels?.length) return null;
  const images = new Set(connection.relayImageModels ?? defaultRelayImageModels(connection.relayModels));
  return { config: { models: connection.relayModels.map(id => ({ id, name: modelDisplayName(id), ...(images.has(id) ? { inputModalities: [...IMAGE_MODALITIES] } : {}), ...(connection.relayContextWindows?.[id] ? { contextWindow: connection.relayContextWindows[id] } : {}) })) } };
}
export const DEEPSEEK_ROW_ID = 'llm-deepseek';

/** Strict check of {mode, relayBaseURL, relayModels}; throws a user-facing Error. */
export function validateConnection(value) {
  const input = isRecord(value) ? value : {};
  const mode = input.mode ?? 'official';
  if (!CONNECTION_MODES.includes(mode)) throw new Error(t('Choose the official API or a relay.'));
  const relayBaseURL = String(input.relayBaseURL ?? '').trim().replace(/\/+$/, '');
  const error = relayBaseURL || mode === 'relay' ? relayBaseURLError(relayBaseURL) : null;
  if (error && mode === 'relay') throw new Error(error);
  const relayModels = parseRelayModels(input.relayModels);
  // relayImageModels: absent on a connection saved before it existed → DeepSeek's image models among the ids.
  const relayImageModels = Array.isArray(input.relayImageModels) ? imageSubset(input.relayImageModels, relayModels) : defaultRelayImageModels(relayModels);
  const windows = contextWindowsFor(input.relayContextWindows, relayModels);
  return { mode, relayBaseURL: error ? '' : relayBaseURL, relayModels, relayImageModels, ...(Object.keys(windows).length ? { relayContextWindows: windows } : {}) };
}

/** Lenient read of connection.json: always a valid {mode, relayBaseURL, relayModels}. */
export function normalizeConnection(value) {
  try { return validateConnection(value); } catch { return { mode: 'official', relayBaseURL: '', relayModels: [], relayImageModels: [] }; }
}
