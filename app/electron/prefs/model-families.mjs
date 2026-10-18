// What a model id says about the model, whoever serves it. A relay (中转站), OpenRouter or a custom endpoint
// serves `glm-5.3` under a route the core has no catalog for, so the core would see a bare id: no name, no
// thinking levels, text only. Recognising the family from the id lets the provider overlay
// (model-settings.mjs providerOverlayRow) describe it the way the vendor's own endpoint would: "GLM 5.3",
// Low/Medium/High, images where the family takes them.
//
// A leaf module (no imports): model-settings.mjs loads it statically and the renderer imports it too.

// Families, most specific first. `name` is the display prefix; the rest of the id becomes the suffix.
// reasoning: the family thinks; `older` names its generations that don't (GPT-4.1, Claude 3.5…), and a
// NON_REASONING id (…-instruct) opts out too.
// image: true = every model takes images, a RegExp = the ids that do, absent = unknown (text only).
// efforts: the levels the vendor offers (a list, or a function of the id); absent = Low/Medium/High.
const FAMILIES = Object.freeze([
  { family: 'claude', brand: 'claude', match: /^claude-/, name: 'Claude', strip: /^claude-/, reasoning: true, older: /^claude-(?:instant|[12](?:[-.]|$)|3-(?!7))/, image: true,
    // xhigh: Claude 5 and Opus 4.7+ (pi-ai anthropic-messages); max: every adaptive-thinking Claude.
    efforts: (id) => /^claude-(?:\w+-)?(?:5|[6-9])(?:[-.]|$)|^claude-opus-4-[7-9]/.test(id) ? ['low', 'medium', 'high', 'xhigh', 'max'] : ['low', 'medium', 'high', 'max'] },
  { family: 'gpt', brand: 'openai', match: /^gpt-/, name: 'GPT', strip: /^gpt-/, joiner: '-', reasoning: true, older: /^gpt-(?:3|4)/, image: true, efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
  { family: 'openai-o', brand: 'openai', match: /^o\d(?:-|$)/, name: '', strip: /^/, reasoning: true, image: true },
  { family: 'gemini', brand: 'gemini', match: /^gemini-/, name: 'Gemini', strip: /^gemini-/, reasoning: true, older: /^gemini-(?:1|2\.0)/, image: true },
  { family: 'deepseek', brand: 'deepseek', match: /^deepseek-/, name: 'DeepSeek', strip: /^deepseek-/, reasoning: true, older: /^deepseek-(?:chat|coder|v2|v3(?![.\d]))/, efforts: ['low', 'high', 'max'], image: /flash/ },
  // GLM's vision models (glm-4.5v, …-vision), and GLM-5.3-Flash/FlashX: natively multimodal, the first of GLM-5 (Z.ai docs).
  { family: 'glm', brand: 'zhipu', match: /^glm-/, name: 'GLM', strip: /^glm-/, reasoning: true, image: /^glm-[\d.]+v|(?:^|-)v(?:-|$)|vision|^glm-5\.3-flash/ },
  { family: 'kimi', brand: 'kimi', match: /^kimi-/, name: 'Kimi', strip: /^kimi-/, reasoning: true, image: /vl|vision/ },
  { family: 'qwen', brand: 'qwen', match: /^(?:qwen|qwq)/, name: 'Qwen', strip: /^qwen-?/, reasoning: true, older: /^qwen-?(?:1|2)(?:[.-]|$)/, image: /vl|omni|vision/ },
  { family: 'minimax', brand: 'minimax', match: /^minimax-/, name: 'MiniMax', strip: /^minimax-/, reasoning: true, image: /vl|vision/ },
  { family: 'mimo', brand: 'mimo', match: /^mimo-/, name: 'MiMo', strip: /^mimo-/, reasoning: true, image: /vl|omni|vision/ },
  { family: 'grok', brand: 'grok', match: /^grok-/, name: 'Grok', strip: /^grok-/, reasoning: true, image: true },
  { family: 'doubao', brand: 'doubao', match: /^doubao-/, name: 'Doubao', strip: /^doubao-/, reasoning: true, image: /vision|seed-[\d.]+(?:-|$)/ },
  { family: 'ernie', brand: 'ernie', match: /^ernie-/, name: 'ERNIE', strip: /^ernie-/, reasoning: true, image: /vl|vision/ },
  { family: 'hunyuan', brand: 'hunyuan', match: /^hunyuan-/, name: 'Hunyuan', strip: /^hunyuan-/, reasoning: true },
  { family: 'step', brand: 'stepfun', match: /^step-/, name: 'Step', strip: /^step-/, reasoning: true, image: /vision|-v(?:-|$)/ },
  { family: 'mistral', brand: 'mistral', match: /^(?:mistral|magistral|devstral|codestral)-/, name: '', strip: /^/, reasoning: false },
  { family: 'llama', brand: 'meta', match: /^llama-?/, name: 'Llama', strip: /^llama-?/, reasoning: false },
]);
const DEFAULT_EFFORTS = Object.freeze(['low', 'medium', 'high']);
// Ids that name a non-chat or non-thinking variant inside a thinking family.
const NON_REASONING = /(?:^|[-_])(?:instruct|non-?thinking|nothink|chat-v\d|embedding|embed|tts|asr|audio|image|ocr|rerank|moderation)(?:[-_.]|$)/;
// Words that keep a fixed spelling in names.
const WORDS = Object.freeze({ pro: 'Pro', max: 'Max', plus: 'Plus', flash: 'Flash', lite: 'Lite', mini: 'Mini', nano: 'Nano', turbo: 'Turbo', air: 'Air',
  opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', highspeed: 'Highspeed', ultraspeed: 'Ultraspeed', code: 'Code', coder: 'Coder', preview: 'Preview',
  thinking: 'Thinking', instruct: 'Instruct', vision: 'Vision', vl: 'VL', omni: 'Omni', fast: 'Fast', reasoner: 'Reasoner', chat: 'Chat', latest: 'Latest',
  exp: 'Exp', seed: 'Seed', codex: 'Codex', x: 'X' });

/** The model id without a vendor prefix (zhipu/glm-5.3), a `:free` tag, an `@date` pin or a `(authType)` suffix. */
export function bareModelId(id) {
  return String(id ?? '').trim().replace(/\([^)]*\)$/, '').replace(/[@:][^/]*$/, '').split('/').pop().toLowerCase();
}

function token(word) {
  if (WORDS[word]) return WORDS[word];
  if (/^\d+(?:\.\d+)*$/.test(word)) return word;
  if (/^o\d/.test(word)) return word; // OpenAI's o3, o4
  if (/^[a-z]\d/.test(word)) return word.toUpperCase(); // k3, m2.7, v2.6, r1
  if (/^\d+o$/.test(word)) return word; // GPT-4o
  if (/^\d+[a-z]+$/.test(word)) return word.toUpperCase(); // 235b, 5v
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** "opus-5-5" → "Opus 5.5": consecutive numbers join with dots (Claude's ids spell versions with dashes). */
function suffixName(rest) {
  const words = rest.split(/[-_]+/).filter(Boolean).filter(word => !/^\d{8}$/.test(word)); // drop 20250514-style dates
  const out = [];
  for (const word of words) {
    if (/^\d+$/.test(word) && out.length && /^\d+(?:\.\d+)*$/.test(out[out.length - 1]) && !out[out.length - 1].includes('.')) out[out.length - 1] += `.${word}`;
    else out.push(token(word));
  }
  return out.join(' ');
}

/**
 * What the id says about a model: { family, brand, name, reasoning, efforts, image } or null when no family matches.
 * `image` is true/false when the family says, undefined when it doesn't.
 */
export function modelFamily(id) {
  const bare = bareModelId(id);
  if (!bare) return null;
  const entry = FAMILIES.find(family => family.match.test(bare));
  if (!entry) return null;
  const rest = suffixName(bare.replace(entry.strip, ''));
  // GPT keeps its hyphen before the version (GPT-6.1 Sol); a family without a prefix (o3, Mistral) is the suffix alone.
  const name = !entry.name ? rest
    : entry.joiner && /^\d/.test(rest) ? `${entry.name}${entry.joiner}${rest}`
    : rest ? `${entry.name} ${rest}` : entry.name;
  const image = entry.image === true ? true : entry.image instanceof RegExp ? entry.image.test(bare) : undefined;
  const reasoning = entry.reasoning && !entry.older?.test(bare) && !NON_REASONING.test(bare);
  const efforts = !reasoning ? [] : typeof entry.efforts === 'function' ? entry.efforts(bare) : entry.efforts ?? DEFAULT_EFFORTS;
  return { family: entry.family, brand: entry.brand, name, reasoning, efforts, image };
}

/** The display name for a model id: the family's spelling ("GLM 5.3"), else the id as given. */
export const modelDisplayName = (id) => modelFamily(id)?.name || String(id ?? '');
