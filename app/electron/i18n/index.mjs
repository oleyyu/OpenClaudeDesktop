// UI language. Shared by the renderer and the main process (src/ is not
// packaged, so the dictionaries live here like prefs/). Source strings are the
// English copy itself: t('Settings') returns it unchanged in en-US and looks it
// up in the active dictionary otherwise; a missing entry falls back to English.
//
// The renderer takes the locale once, before any module renders, from the
// preload's first-paint appearance (main.cjs desktop:appearance answers with
// preferences.json `locale`); changing the language saves the preference and
// reloads the window, like the original's "Changing the language will reload…".
// Module-level t() calls are therefore safe. The main process calls setLocale
// after reading preferences and rebuilds its menus.
import zhCN from './zh-CN/index.mjs';
import { CLAUDE_ACTOR } from './claude-actor.mjs';

export const DEFAULT_LOCALE = 'en-US';
// name: in English (the secondary line); localName: in the language itself.
export const LOCALES = Object.freeze([
  Object.freeze({ locale: 'en-US', name: 'English (United States)', localName: 'English (United States)' }),
  Object.freeze({ locale: 'zh-CN', name: 'Chinese (Simplified)', localName: '简体中文' }),
]);
export const LOCALE_CODES = Object.freeze(LOCALES.map(entry => entry.locale));
const DICTIONARIES = { 'zh-CN': zhCN };

export const isLocale = value => LOCALE_CODES.includes(value);
export const localePreference = value => isLocale(value) ? value : DEFAULT_LOCALE;

let current = (() => {
  try { return localePreference(globalThis.desktop?.appearance?.locale); } catch { return DEFAULT_LOCALE; }
})();
try { if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = current; } catch {}

export function getLocale() { return current; }
/** Main process / tests only; the renderer reloads instead. */
export function setLocale(locale) {
  current = localePreference(locale);
  try { if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = current; } catch {}
  return current;
}
export const dictionary = (locale = current) => DICTIONARIES[locale] ?? null;

const interpolate = (text, values) => values
  ? text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) && values[key] !== undefined && values[key] !== null ? String(values[key]) : match)
  : text;

/**
 * Translate one English source string. `values` fill {name} placeholders
 * (applied after the lookup, so translations may reorder them).
 */
// The assistant's name in the copy: "DeepSeek" in the source strings, the running core's assistant ("Codex",
// "GLM", …) otherwise (core descriptors' `assistant`). Like the locale, the renderer takes it once from the preload's
// first-paint appearance (main.cjs answers from config.core) and reloads after the core changes; the main process
// sets it with setAssistantName. Only the assistant-as-actor uses change: DeepSeek's own product and account terms
// (DeepSeek Harness, DeepSeek API, the Platform, official prices, its models and balance, "by DeepSeek") stay.
// A name, or a core descriptor: its `assistant`, else its own name (a core is never called DeepSeek by default).
const assistantOf = (value) => {
  const name = value && typeof value === 'object' ? (value.assistant || value.name) : value;
  return typeof name === 'string' && name.trim() ? name.trim() : 'DeepSeek';
};
let assistant = (() => {
  try { return assistantOf(globalThis.desktop?.appearance?.assistant); } catch { return 'DeepSeek'; }
})();
export function getAssistantName() { return assistant; }
/** Main process / tests only; the renderer reloads instead. A name or the running core's descriptor. */
export function setAssistantName(name) {
  assistant = assistantOf(name);
  return assistant;
}
const ASSISTANT_WORD = /(?<!by )DeepSeek(?!\s*(?:Harness|API|Platform|platform|official|balance|account|usage|provider|models|blue|平台|官方|余额|账户|账号|用量|模型|蓝|管理)|’s (?:official|models|balance|prices)|’s\.|')/g;
const named = (text) => (assistant === 'DeepSeek' || typeof text !== 'string' || !text.includes('DeepSeek') ? text : text.replace(ASSISTANT_WORD, assistant));

export function t(source, values) {
  if (typeof source !== 'string') return source;
  const table = DICTIONARIES[current];
  const text = table && Object.hasOwn(table, source) ? table[source] : Object.hasOwn(CLAUDE_ACTOR, source) ? CLAUDE_ACTOR[source] : source;
  return interpolate(named(text), values);
}

/** Singular/plural pick on the English side; both forms are dictionary keys. */
export function tn(count, one, other, values) {
  return t(count === 1 ? one : other, { count, ...values });
}
