// First-run quick setup (src/source-onboarding.jsx): the official API of each
// vendor, as the connection the DeepSeek core can use. DeepSeek is the core's
// built-in provider (Settings › Models official connection); every other one
// becomes a custom provider (prefs/model-settings.mjs validateProvider), whose
// key the core reads from CODE_DESKTOP_PROVIDER_KEY_<ROUTE>.
//
// Base URLs follow each SDK's convention: anthropic-messages bases get
// /v1/messages appended, openai bases /chat/completions (or /responses).
// The core's Anthropic client sends the key as x-api-key, so a vendor whose
// Anthropic endpoint wants Bearer only (OpenRouter) uses its OpenAI endpoint.
// Endpoints and model ids from the vendors' docs, 2026-10-04
// (work/onboarding-reference/providers.md).

export const PRESETS = Object.freeze([
  {
    id: 'deepseek', brand: 'deepseek', name: 'DeepSeek', builtIn: true, api: 'anthropic-messages',
    variants: [{ id: 'official', label: 'Official API', baseURL: 'https://api.deepseek.com/anthropic', keyUrl: 'https://platform.deepseek.com/api_keys' }],
    models: ['deepseek-v4-pro', 'deepseek-flash'],
  },
  {
    id: 'glm', reasoning: true, brand: 'zhipu', name: 'GLM', vendor: 'Zhipu', api: 'anthropic-messages',
    variants: [
      { id: 'cn', label: 'China (bigmodel.cn)', baseURL: 'https://open.bigmodel.cn/api/anthropic', keyUrl: 'https://open.bigmodel.cn/' },
      { id: 'intl', label: 'International (Z.ai)', baseURL: 'https://api.z.ai/api/anthropic', keyUrl: 'https://z.ai/manage-apikey/apikey-list' },
    ],
    models: ['glm-5.3', 'glm-5.3-flash'],
    note: 'GLM Coding Plan keys work on the same endpoint.',
  },
  {
    id: 'kimi', reasoning: true, brand: 'kimi', name: 'Kimi', vendor: 'Moonshot', api: 'anthropic-messages',
    variants: [
      { id: 'cn', label: 'China (moonshot.cn)', baseURL: 'https://api.moonshot.cn/anthropic', keyUrl: 'https://platform.kimi.com/console/api-keys' },
      { id: 'intl', label: 'International (moonshot.ai)', baseURL: 'https://api.moonshot.ai/anthropic', keyUrl: 'https://platform.kimi.ai/console/api-keys' },
    ],
    models: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.7-code-highspeed'],
    note: 'A key only works on the platform it was created on.',
  },
  {
    id: 'qwen', reasoning: true, brand: 'qwen', name: 'Qwen', vendor: 'Alibaba Cloud', api: 'anthropic-messages',
    variants: [
      { id: 'cn', label: 'China (Bailian)', baseURL: 'https://dashscope.aliyuncs.com/apps/anthropic', keyUrl: 'https://bailian.console.aliyun.com/' },
      { id: 'coding', label: 'Coding Plan (China)', baseURL: 'https://coding.dashscope.aliyuncs.com/apps/anthropic', keyUrl: 'https://bailian.console.aliyun.com/' },
      { id: 'coding-intl', label: 'Coding Plan (International)', baseURL: 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic', keyUrl: 'https://modelstudio.console.alibabacloud.com/' },
    ],
    models: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash'],
    note: 'Keys are tied to their region; Coding Plan keys (sk-sp-…) only work on Coding Plan endpoints.',
  },
  {
    id: 'minimax', reasoning: true, brand: 'minimax', name: 'MiniMax', api: 'anthropic-messages',
    variants: [
      { id: 'cn', label: 'China (minimax.cn)', baseURL: 'https://api.minimax.cn/anthropic', keyUrl: 'https://platform.minimax.cn/user-center/basic-information/interface-key' },
      { id: 'intl', label: 'International (minimax.io)', baseURL: 'https://api.minimax.io/anthropic', keyUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key' },
    ],
    models: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.7-highspeed'],
  },
  {
    id: 'mimo', reasoning: true, brand: 'mimo', name: 'MiMo', vendor: 'Xiaomi', api: 'anthropic-messages',
    variants: [
      { id: 'official', label: 'Official API', baseURL: 'https://api.xiaomimimo.com/anthropic', keyUrl: 'https://platform.xiaomimimo.com/#/console/api-keys' },
      { id: 'token-plan', label: 'Token Plan', baseURL: 'https://token-plan-cn.xiaomimimo.com/anthropic', keyUrl: 'https://platform.xiaomimimo.com/' },
    ],
    models: ['mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed', 'mimo-v2.6-flash'],
  },
  {
    id: 'anthropic', brand: 'claude', name: 'Claude', vendor: 'Anthropic', api: 'anthropic-messages',
    variants: [{ id: 'official', label: 'Official API', baseURL: 'https://api.anthropic.com', keyUrl: 'https://platform.claude.com/' }],
    models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'],
  },
  {
    id: 'openai', brand: 'openai', name: 'OpenAI', api: 'openai-responses',
    variants: [{ id: 'official', label: 'Official API', baseURL: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys' }],
    models: ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-luna'],
  },
  {
    id: 'gemini', reasoning: true, brand: 'gemini', name: 'Gemini', vendor: 'Google', api: 'openai-completions',
    variants: [{ id: 'official', label: 'Official API', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', keyUrl: 'https://aistudio.google.com/apikey' }],
    models: ['gemini-3.8-flash', 'gemini-3.1-pro-preview'],
  },
  {
    id: 'openrouter', brand: 'openrouter', name: 'OpenRouter', api: 'openai-completions',
    variants: [{ id: 'official', label: 'Official API', baseURL: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/settings/keys' }],
    models: [],
    note: 'Model ids carry the vendor, e.g. qwen/qwen3.8-max. Use Fetch models to list them.',
  },
  {
    id: 'custom', name: 'Custom', api: 'anthropic-messages',
    variants: [{ id: 'custom', label: 'Any compatible endpoint', baseURL: '', keyUrl: null }],
    models: [],
  },
]);

// `reasoning: true`: the vendor's models think, but the core has no catalog for the route, so the provider overlay
// declares their effort levels (model-settings.mjs providerOverlayRow). Claude and OpenAI ride the core's own
// catalogs, which already carry each model's levels.
const REASONING_BASE_URLS = new Set(PRESETS.filter(preset => preset.reasoning).flatMap(preset => preset.variants.map(variant => normalizeBaseURL(variant.baseURL))));
function normalizeBaseURL(url) { return String(url ?? '').trim().replace(/\/+$/, '').toLowerCase(); }
/** Whether a provider endpoint is one of the thinking presets' official endpoints. */
export const isReasoningPresetEndpoint = (baseURL) => REASONING_BASE_URLS.has(normalizeBaseURL(baseURL));

export const presetById = (id) => PRESETS.find((preset) => preset.id === id) ?? null;

/** The provider id (route) a preset's custom provider is saved under. */
export function presetRoute(preset, variant) {
  if (!preset || preset.builtIn) return null;
  if (preset.id === 'custom') return 'custom';
  return variant && preset.variants.length > 1 ? `${preset.id}-${variant.id}`.slice(0, 32) : preset.id;
}

/** The display name of a preset's provider, e.g. "Kimi (International)". */
export function presetDisplayName(preset, variant) {
  if (!preset) return '';
  return preset.variants.length > 1 && variant ? `${preset.name} · ${variant.label}` : preset.name;
}

/**
 * The URL a 1-token connection test posts to, and how it authenticates — the
 * same way the core's client will (anthropic-messages: x-api-key; openai: Bearer).
 */
export function testRequest({ api, baseURL, model }) {
  const base = String(baseURL ?? '').trim().replace(/\/+$/, '');
  if (api === 'anthropic-messages') {
    return { url: `${base}/v1/messages`, auth: 'x-api-key', body: { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] } };
  }
  if (api === 'openai-responses') {
    return { url: `${base}/responses`, auth: 'bearer', body: { model, max_output_tokens: 16, input: 'ping' } };
  }
  return { url: `${base}/chat/completions`, auth: 'bearer', body: { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] } };
}

/** The models-list URL for an endpoint (anthropic-messages: /v1/models; openai: /models). */
export function modelsURL({ api, baseURL }) {
  const base = String(baseURL ?? '').trim().replace(/\/+$/, '');
  return api === 'anthropic-messages' ? `${base}/v1/models` : `${base}/models`;
}
