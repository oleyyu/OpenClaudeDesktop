import { grammarFailed, loadGrammar } from "./highlight-engine.mjs";
import { ensureTheme } from "./highlight-theme-loaders.mjs";
import { HIGHLIGHT_LIMITS, plainResult, prepareHighlight, validateTokens } from "./highlight-model.mjs";

// The shiki core and the lazy per-language grammar imports live in
// highlight-engine.mjs so the settled and stream workers share one engine module. The two Claude
// themes are registered eagerly there; any other catalog theme is loaded on
// demand through the explicit loader map (never a theme directory).
const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
const fullHex = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
export function normalizeColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const short = value.match(shortHex);
  const color = short ? `#${short.slice(1, 5).filter(Boolean).map((digit) => digit + digit).join("")}` : value;
  return fullHex.test(color) ? color.toLowerCase() : fallback;
}
function foreground(instance, name) {
  const theme = instance.getTheme(name);
  return normalizeColor(theme.colors?.["editor.foreground"] ?? theme.fg, "#000000");
}
export function createTokenizer() {
  const style = (variant, fallback) => ({ color: normalizeColor(variant?.color, fallback), fontStyle: Math.max(0, variant?.fontStyle ?? 0) });
  return async (input) => {
    const prepared = prepareHighlight(input);
    if (prepared.status !== "eligible") return prepared;
    const { text, language, themes } = prepared;
    const instance = await loadGrammar(language);
    if (!instance) return plainResult(grammarFailed(language) ? "grammar-error" : "unknown-language");
    const [lightName, darkName] = await Promise.all([ensureTheme(instance, themes.light), ensureTheme(instance, themes.dark)]);
    const fallback = { light: foreground(instance, lightName), dark: foreground(instance, darkName) };
    const highlighted = instance.codeToTokensWithThemes(text.replace(/\r\n|\r/g, "\n"), {
      lang: language, themes: { light: lightName, dark: darkName },
      tokenizeMaxLineLength: HIGHLIGHT_LIMITS.maxLineUnits + 1,
      // A soft cutoff can return partially colored output without a signal.
      // The host's hard deadline terminates the worker and keeps all text plain.
      tokenizeTimeLimit: 0,
    });
    const parts = text.split(/(\r\n|\n|\r)/);
    const tokens = [];
    const push = (content, light, dark) => {
      if (!content) return true;
      if (tokens.length >= HIGHLIGHT_LIMITS.maxTokens) return false;
      tokens.push({ text: content, light, dark });
      return true;
    };
    if (highlighted.length !== (parts.length + 1) / 2) return plainResult("text-mismatch");
    for (let index = 0; index < highlighted.length; index += 1) {
      const line = highlighted[index];
      if (line.map((token) => token.content).join("") !== parts[index * 2]) return plainResult("text-mismatch");
      for (const token of line) if (!push(token.content,
        style(token.variants.light, fallback.light), style(token.variants.dark, fallback.dark))) return plainResult("output-limit");
      // Shiki line arrays omit separators. Reinsert the exact original CR/LF.
      if (parts[index * 2 + 1] && !push(parts[index * 2 + 1],
        style(null, fallback.light), style(null, fallback.dark))) return plainResult("output-limit");
    }
    return validateTokens(tokens, text) ? { status: "highlighted", language, tokens } : plainResult("output-limit");
  };
}
