import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { lightTheme, darkTheme, streamLightTheme, streamDarkTheme } from "./highlight-themes.mjs";
import { grammarLoaders } from "./highlight-grammar-loaders.mjs";

// One shiki core per worker, shared by the settled tokenizer and the stream
// session handler. Every bundled grammar (code-language-current.js:62-81 over
// the c5a058668 table) is a lazy per-language chunk behind grammarLoaders; the
// JavaScript regex engine runs in forgiving mode, so a pattern it cannot
// translate is skipped instead of failing the grammar (no WASM, no theme
// directory).
let highlighter = null;
export function getHighlighter() {
  return highlighter ??= createHighlighterCore({
    themes: [lightTheme, darkTheme, streamLightTheme, streamDarkTheme].map((theme) => structuredClone(theme)),
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
}

// Original `u` map (code-language-current.js:33-56): a grammar whose module or
// registration failed stays plain until reload; it is never retried.
export function createGrammarLoader({ loaders, getInstance, warn = (message) => console.warn(message) }) {
  const failed = new Map(), pending = new Map();
  async function load(language) {
    const loader = typeof language === "string" && Object.hasOwn(loaders, language) ? loaders[language] : null;
    if (!loader || failed.has(language)) return null;
    const instance = await getInstance();
    if (instance.getLoadedLanguages().includes(language)) return instance;
    let loading = pending.get(language);
    if (!loading) {
      loading = (async () => {
        const module = await loader();
        if (module?.default === undefined) throw new TypeError(`Grammar module for "${language}" resolved empty`);
        await instance.loadLanguage(module.default);
      })();
      pending.set(language, loading);
      loading.catch(() => {}).finally(() => { if (pending.get(language) === loading) pending.delete(language); });
    }
    try {
      await loading;
      return instance;
    } catch (error) {
      if (!failed.has(language)) {
        failed.set(language, error);
        warn(`[highlight] Grammar for "${language}" failed to load \u2014 rendering as plain text until reload`);
      }
      return null;
    }
  }
  return { load, failed: (language) => failed.has(language) };
}

const grammars = createGrammarLoader({ loaders: grammarLoaders, getInstance: getHighlighter });
export const loadGrammar = grammars.load;
export const grammarFailed = grammars.failed;
