// w13-chatfn-tools: a Chat conversation's Web search / Research switches on its thread/start|resume
// (src/chat-tools-model.mjs has the official shape, c9b54eb90 _e / shared-5 mz). claude.ai reads the conversation's
// enabled_web_search / compass_mode at completion time; locally:
//   · Research adds the research developer instructions (this contributor);
//   · Codex's thread config web_search comes from codexWebSearchFor (main.cjs's Codex decoration, ahead of the global
//     Settings › Code › Web search) — not a contributor config key, which every core would get;
//   · a tool-selection core's web tools are in the session's tool selection (config.threadTools), sent by main.
// chatToolsAction is main.cjs's "chat-tools" request: the + menu's switches, saved in config.chatTools.
import { contextSurface } from '../chat-context.mjs';
import { chatSettingsFor, codexWebSearchMode, forgetChatTools, normalizeChatSettings, normalizeChatTools, patchChatTools, RESEARCH_INSTRUCTIONS, RESEARCH_MODE, seedChatTools } from '../chat-tools-store.mjs';

export const id = 'tools';
export const surfaces = ['chat'];

const threadOf = (method, params) => (method === 'thread/resume' && typeof params?.threadId === 'string' && params.threadId ? params.threadId : null);

export async function apply({ config, method, params, surface, threadId }) {
  if (surface !== 'chat') return null;
  const settings = chatSettingsFor(config?.chatTools, threadId ?? threadOf(method, params));
  return settings.compass_mode === RESEARCH_MODE ? RESEARCH_INSTRUCTIONS : null;
}

/**
 * Codex's web_search for a Chat thread/start|resume: the conversation's choice (thread/start: the New chat's), or null
 * to keep the global setting. Any other surface or method: null. `surface` is takeSurface's (null on thread/resume).
 */
export function codexWebSearchFor(config, method, params, surface) {
  // thread/start names its surface (takeSurface); thread/resume's is the session's (sessionMetadata).
  if (!['thread/start', 'thread/resume'].includes(method) || contextSurface(config, method, params, surface) !== 'chat') return null;
  const globalMode = ['disabled', 'cached', 'live'].includes(config?.codexWebSearch) ? config.codexWebSearch : null;
  return codexWebSearchMode(chatSettingsFor(config?.chatTools, threadOf(method, params)), globalMode);
}

/**
 * main.cjs thread/start of a Chat conversation (where sessionMetadata gets surface "chat"): the New chat's switches
 * become the conversation's own (config.chatTools in place; the caller saves). Conversations that never got an entry
 * keep the global defaults on resume (chatSettingsFor answers {} for them). → whether it stored anything (the caller
 * then tells the windows, so the + menu shows the conversation's switches).
 */
export function chatToolsStarted(config, threadId) {
  if (!config?.chatTools || typeof threadId !== 'string' || !threadId) return false;
  const store = seedChatTools(config.chatTools, threadId);
  const seeded = !Object.hasOwn(normalizeChatTools(config.chatTools).threads, threadId) && Object.hasOwn(store.threads, threadId);
  config.chatTools = store;
  return seeded;
}

/**
 * main.cjs "chat-tools": { op: "set", threadId: string|null, settings } patches one conversation's (null: the New
 * chat's) switches; { op: "forget", threadId } drops a deleted one; { op: "read" }. Changes config.chatTools in place
 * (the caller saves) and answers the clean store.
 */
export function chatToolsAction(config, p = {}) {
  const store = normalizeChatTools(config.chatTools);
  const threadId = typeof p.threadId === 'string' && p.threadId ? p.threadId : null;
  if (p.op === 'read') return store;
  if (p.op === 'forget') {
    if (!threadId) throw new Error('Unknown session.');
    config.chatTools = forgetChatTools(store, threadId);
    return config.chatTools;
  }
  if (p.op !== 'set') throw new Error('Unsupported operation.');
  if (threadId && ![...(config.threadIds ?? []), ...(config.archivedThreadIds ?? [])].includes(threadId)) throw new Error('Unknown session.');
  const patch = normalizeChatSettings(p.settings);
  if (!Object.keys(patch).length) throw new Error('Unsupported operation.');
  config.chatTools = patchChatTools(store, threadId, patch);
  return config.chatTools;
}
