// Settings › Account: the vendor logo (a brand-logos.mjs key) shown beside a sign-in option or an API key type.
//
// A core's descriptor lists its sign-ins by provider or template id (core-registry.mjs `login`): OpenCode's "openai",
// "claude-agent", "github-copilot"; Qwen Code's "alibabaStandard:cn-beijing", "zai:coding-plan". The id decides the
// logo; an option may name one itself (`brand`), which wins when brand-logos.mjs has it. A descriptor is untrusted
// input (an Extension Pack's is copied as written), so nothing here is rendered: the answer is only ever a key
// brand-logos.mjs owns, or null.
import { BRAND_SVGS } from "./brand-logos.mjs";

const known = (brand) => typeof brand === "string" && Object.hasOwn(BRAND_SVGS, brand);

// Matched against the lower-cased id from its start, first hit wins.
const RULES = [
  [/^(openai|chatgpt)\b/, "openai"],
  [/^poe\b/, "poe"],
  [/^claude\b/, "claude"],
  [/^anthropic\b/, "anthropic"],
  [/^github-copilot\b/, "githubcopilot"],
  [/^google\b/, "google"],
  [/^gemini\b/, "gemini"],
  [/^grok\b/, "grok"],
  [/^xai\b/, "xai"],
  [/^kimi\b/, "kimi"],
  [/^moonshot/, "moonshot"],
  [/^(xiaomi|mimo)\b/, "mimo"],
  [/^zai\b/, "zai"],
  [/^bigmodel\b/, "zhipu"],
  // Qwen Code's Alibaba Cloud plans: "alibabaStandard:<region>", "coding-plan:<site>", "token-plan:<region>".
  [/^(alibaba|coding-plan:|token-plan:)/, "alibabacloud"],
  [/^deepseek\b/, "deepseek"],
  [/^minimax\b/, "minimax"],
  [/^modelscope\b/, "modelscope"],
  [/^openrouter\b/, "openrouter"],
];
// A subscription sign-in is the product, not the API platform: SuperGrok signs in to Grok.
const SIGN_IN_RULES = [[/^xai\b/, "grok"], ...RULES];

const match = (text, rules) => {
  for (const [pattern, brand] of rules) if (pattern.test(text)) return brand;
  return null;
};
const idOf = (option) => String(option?.provider ?? option?.template ?? "").toLowerCase();

/**
 * The logo of a browser or device-code sign-in: the option's own brand, else its provider's, else the core's own
 * (a core's account with no provider named, e.g. "Sign in with your MiniMax account").
 * @param {{brand?: string, provider?: string, label?: string} | null | undefined} option
 * @param {string | null | undefined} coreBrand - the running core's descriptor brand
 * @returns {string | null}
 */
export function signInBrand(option, coreBrand) {
  if (known(option?.brand)) return option.brand;
  const id = idOf(option);
  return (id && match(id, SIGN_IN_RULES)) || (known(coreBrand) ? coreBrand : null);
}

/**
 * The logo of an API key type: the option's own brand, else its template's, else what its label starts with (a single
 * key with no template, e.g. Codex's "OpenAI API key"). Never the core's: Qwen Code's Requesty key isn't Qwen's.
 * @param {{brand?: string, template?: string, label?: string} | null | undefined} option
 * @returns {string | null}
 */
export function keyBrand(option) {
  if (known(option?.brand)) return option.brand;
  const id = idOf(option);
  return (id && match(id, RULES)) || match(String(option?.label ?? "").toLowerCase(), RULES);
}
