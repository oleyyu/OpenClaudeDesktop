import { normalizeCodeThemes } from "./code-theme-catalog.mjs";
import { BUNDLED_LANGUAGES } from "./highlight-languages.mjs";

// Local resource limits, deliberately stricter than the official file viewer.
export const HIGHLIGHT_LIMITS = Object.freeze({
  maxCodeUnits: 100_000, maxLines: 2_000, maxLineUnits: 1_000,
  maxTokens: 16_000, maxResultBytes: 2_000_000,
  deadlineMs: 1_500, maxQueued: 8, maxCacheEntries: 16, maxCacheBytes: 1_000_000,
  idleMs: 30_000,
});
// code-language-current.js:18-28 (`s`, `c`) and :62-81 (h): a label is trimmed
// and lowercased (empty reads as text), mapped through the extra alias table,
// then either a reserved plain language ('text', 'ansi') or one of the 235
// bundled grammars by id or alias (c5a058668 bundledLanguagesInfo). Anything
// else is unknown (null) and stays plain. Aliases resolve to the grammar id,
// so the worker loads and caches one grammar per id.
const EXTRA_ALIASES = Object.freeze({ env: "dotenv", fortran: "fortran-free-form", golang: "go", pwsh: "powershell",
  svg: "xml", systemverilog: "system-verilog", txt: "text", vba: "vb", vbnet: "vb" });
export const PLAIN_LANGUAGES = Object.freeze(["text", "ansi"]);
const bundled = new Map();
for (const [id, ...names] of BUNDLED_LANGUAGES) { bundled.set(id, id); for (const name of names) bundled.set(name, id); }
export function normalizeLanguage(language) {
  if (language != null && typeof language !== "string") return null;
  const label = (language ?? "").trim().toLowerCase() || "text";
  const name = Object.hasOwn(EXTRA_ALIASES, label) ? EXTRA_ALIASES[label] : label;
  if (PLAIN_LANGUAGES.includes(name)) return name;
  return bundled.get(name) ?? null;
}
export const isPlainLanguage = (language) => PLAIN_LANGUAGES.includes(language);
export const plainResult = (reason) => ({ status: "plain", reason });

// `themes` is the selected {light, dark} catalog pair; it is part of the
// service cache key so a theme change re-requests tokens instead of reusing
// colors computed for another theme. Unknown ids fall back to the Claude pair.
export function prepareHighlight({ text, language, isFrontier = false, languageSettled = true, themes } = {}) {
  if (isFrontier) return plainResult("streaming");
  if (!languageSettled) return plainResult("unsettled-language");
  if (typeof text !== "string") return plainResult("invalid-text");
  if (!text) return plainResult("empty");
  const normalized = normalizeLanguage(language);
  if (!normalized) return plainResult("unknown-language");
  if (isPlainLanguage(normalized)) return plainResult("plain-language");
  if (text.length > HIGHLIGHT_LIMITS.maxCodeUnits) return plainResult("code-limit");
  // An entire long-line block stays plain. Skipping a line inside a grammar may
  // lose a multiline string/comment boundary and color subsequent lines wrongly.
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.length > HIGHLIGHT_LIMITS.maxLines) return plainResult("line-count-limit");
  if (lines.some((line) => line.length > HIGHLIGHT_LIMITS.maxLineUnits)) return plainResult("line-length-limit");
  return { status: "eligible", language: normalized, text, themes: normalizeCodeThemes(themes) };
}
export function highlightKey(prepared) {
  return `${prepared.language}\0${prepared.themes.light}\0${prepared.themes.dark}\0${prepared.text}`;
}

const colorPattern = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
function validStyle(style) {
  return style && typeof style === "object" && typeof style.color === "string" && colorPattern.test(style.color)
    && Number.isInteger(style.fontStyle) && style.fontStyle >= 0 && style.fontStyle <= 15
    && Object.keys(style).every((key) => key === "color" || key === "fontStyle");
}
export function validateTokens(tokens, original) {
  if (!Array.isArray(tokens) || tokens.length > HIGHLIGHT_LIMITS.maxTokens) return false;
  let offset = 0;
  for (const token of tokens) {
    if (!token || typeof token.text !== "string" || !token.text.length
      || !validStyle(token.light) || !validStyle(token.dark)
      || !Object.keys(token).every((key) => key === "text" || key === "light" || key === "dark")
      || !original.startsWith(token.text, offset)) return false;
    offset += token.text.length;
    if (offset > original.length) return false;
  }
  return offset === original.length && JSON.stringify(tokens).length * 2 <= HIGHLIGHT_LIMITS.maxResultBytes;
}

export function tokenCSS(token) {
  const values = {};
  for (const theme of ["light", "dark"]) {
    const { color, fontStyle } = token[theme];
    values[`--sch-${theme}`] = color;
    values[`--sch-${theme}-style`] = fontStyle & 1 ? "italic" : "normal";
    values[`--sch-${theme}-weight`] = fontStyle & 2 ? "bold" : "normal";
    values[`--sch-${theme}-decoration`] = [fontStyle & 4 ? "underline" : "", fontStyle & 8 ? "line-through" : ""].filter(Boolean).join(" ") || "none";
  }
  return values;
}
