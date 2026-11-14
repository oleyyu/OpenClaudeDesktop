// w13-close-main-process (closeout chatfn-branches-02, packaging): the part of the Chat tools model the main process
// needs — a conversation's Web search / Research / Extended thinking settings as config.chatTools keeps them, the Codex
// web_search value and the Research instructions (electron/chat-context/tools.mjs), and a project's settings patch
// (electron/local-projects.mjs). The package script ships no src/*.mjs outside its whitelist, so it lives here;
// src/chat-tools-model.mjs re-exports it (official shapes: c9b54eb90 _e, shared-5 mz — see that file's header). Pure.

export const RESEARCH_MODE = 'advanced';
export const EXTENDED_THINKING = 'extended';
export const MAX_THREADS = 5000;

/** One conversation's settings with only the official keys and values; unset keys are left out. */
export function normalizeChatSettings(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  if (typeof value.enabled_web_search === 'boolean') out.enabled_web_search = value.enabled_web_search;
  if (Object.hasOwn(value, 'compass_mode')) out.compass_mode = value.compass_mode === RESEARCH_MODE ? RESEARCH_MODE : null;
  if (Object.hasOwn(value, 'paprika_mode')) out.paprika_mode = value.paprika_mode === EXTENDED_THINKING ? EXTENDED_THINKING : null;
  return out;
}

/** config.chatTools, cleaned: { defaults, threads }. */
export function normalizeChatTools(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const threads = {};
  const entries = source.threads && typeof source.threads === 'object' && !Array.isArray(source.threads) ? Object.entries(source.threads) : [];
  for (const [id, settings] of entries.slice(-MAX_THREADS)) {
    if (typeof id === 'string' && id && id.length <= 256) threads[id] = normalizeChatSettings(settings);
  }
  return { defaults: normalizeChatSettings(source.defaults), threads };
}

/**
 * A conversation's settings: threadId null → the New chat's (defaults); a conversation → its own, or {} (the global
 * defaults) when it has none — the New chat's switches are copied into a conversation once, when it starts
 * (seedChatTools), never read through later, so a later New chat choice can't reach older conversations.
 */
export function chatSettingsFor(store, threadId = null) {
  const clean = normalizeChatTools(store);
  if (typeof threadId === 'string' && threadId) return Object.hasOwn(clean.threads, threadId) ? clean.threads[threadId] : {};
  return clean.defaults;
}

/** The store with a just-started conversation holding the New chat's switches as its own (main.cjs thread/start). */
export function seedChatTools(store, threadId) {
  const clean = normalizeChatTools(store);
  if (typeof threadId !== 'string' || !threadId || Object.hasOwn(clean.threads, threadId) || !Object.keys(clean.defaults).length) return clean;
  return { defaults: clean.defaults, threads: { ...clean.threads, [threadId]: { ...clean.defaults } } };
}

/** The store with one conversation's (or, threadId null, the New chat's) settings patched. */
export function patchChatTools(store, threadId, patch) {
  const clean = normalizeChatTools(store);
  const next = normalizeChatSettings({ ...chatSettingsFor(clean, threadId), ...normalizeChatSettings(patch) });
  if (typeof threadId === 'string' && threadId) return { defaults: clean.defaults, threads: { ...clean.threads, [threadId]: next } };
  return { defaults: next, threads: clean.threads };
}

/** The store without a conversation (deleted). */
export function forgetChatTools(store, threadId) {
  const clean = normalizeChatTools(store);
  if (!Object.hasOwn(clean.threads, threadId)) return clean;
  const { [threadId]: _gone, ...threads } = clean.threads;
  return { defaults: clean.defaults, threads };
}

/**
 * Codex's thread config `web_search` for a Chat conversation: "disabled" when its Web search is off, the global mode
 * (live / cached) or "live" when it is on or Research is on, null when the conversation never chose (the global
 * setting stays).
 */
export function codexWebSearchMode(settings = {}, globalMode = null) {
  const on = settings.compass_mode === RESEARCH_MODE ? true : settings.enabled_web_search;
  if (on === true) return globalMode === 'live' || globalMode === 'cached' ? globalMode : 'live';
  if (on === false) return 'disabled';
  return null;
}

/** The developer instructions Research adds (the local stand-in for claude.ai's extended search task, compass). */
export const RESEARCH_INSTRUCTIONS = [
  'Research mode is on for this conversation. Treat each request as a research task:',
  '- Plan the questions to answer first, then search the web several times with different queries, opening and reading the most relevant sources instead of relying on search snippets.',
  '- Prefer primary and recent sources; cross-check important facts across more than one source and say where sources disagree.',
  '- Cite every source you rely on with its title and URL.',
  '- End with a structured report: a short summary, the findings under headings, and a list of the sources used.',
].join('\n');

export const PROJECT_SETTINGS_KEYS = Object.freeze(['enabled_web_search', 'compass_mode', 'paprika_mode', 'recommended_mcp_servers']);
export const MAX_RECOMMENDED_SERVERS = 200;

/** A project's settings patch with only pe / _e's keys and values (local-projects update), or null when it isn't one. */
export function normalizeProjectSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const key of Object.keys(value)) if (!PROJECT_SETTINGS_KEYS.includes(key)) return null;
  if (Object.hasOwn(value, 'enabled_web_search')) { if (typeof value.enabled_web_search !== 'boolean') return null; out.enabled_web_search = value.enabled_web_search; }
  if (Object.hasOwn(value, 'compass_mode')) { if (![RESEARCH_MODE, null].includes(value.compass_mode)) return null; out.compass_mode = value.compass_mode; }
  if (Object.hasOwn(value, 'paprika_mode')) { if (![EXTENDED_THINKING, null].includes(value.paprika_mode)) return null; out.paprika_mode = value.paprika_mode; }
  if (Object.hasOwn(value, 'recommended_mcp_servers')) {
    const list = value.recommended_mcp_servers;
    if (!Array.isArray(list) || list.length > MAX_RECOMMENDED_SERVERS || list.some(name => typeof name !== 'string' || !name || name.length > 256)) return null;
    out.recommended_mcp_servers = [...new Set(list)];
  }
  return out;
}
