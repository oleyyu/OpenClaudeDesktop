// w13-chatfn-history (research/w13-chatfn.md H7, chatfn-48): incognito chats, kept on this computer.
// Official 3.6556.2: the shortcut table's `incognito` command (shared-1 `$P` "Incognito chat" / "Incognito",
// group "chat", icon Ghost, href "/new?incognito=true", ⇧⌘I), the `?incognito` search parameter (shared-0 BR) and the
// "Incognito chats stay out of your history, memory, and search…" notices (shared-78). The official app keeps such a
// chat as a temporary claude.ai conversation (`incognito_temporary_conversation_uuid`). Here it is a core thread
// started with `codeDesktop.incognito`; main records `sessionMetadata[id].incognito = true`, the session lists
// (surface-policy.mjs surfaceSessions), memory, the history index and the export leave it out, and the thread is
// deleted once the chat is left (renderer) or, failing that, at the next launch (chat-history.mjs sweep).
//
// Pure: renderer (src/chat-incognito-model.mjs re-exports this file) and main both read it. The main process may not
// import src/ (package.json's electron-packager --ignore keeps only six src models), so the file lives here.

export const INCOGNITO_SEARCH_PARAM = 'incognito'; // shared-0 BR
// shared-1 `incognito:{description:$P.description,sessionDescription:$P.description_session,group:"chat",…,icon:Q("Ghost"),href:"/new?incognito=true"}`
export const INCOGNITO_COMMAND = Object.freeze({
  id: 'incognito', description: 'Incognito chat', sessionDescription: 'Incognito', group: 'chat', icon: 'Ghost',
  href: '/new?incognito=true', shortcut: Object.freeze({ key: 'i', modifiers: Object.freeze(['cmd', 'shift']) }),
});

/** Whether `id` is an incognito chat (sessionMetadata[id].incognito, written by main at thread/start). */
export function isIncognitoSession(id, metadata) {
  return typeof id === 'string' && metadata?.[id]?.incognito === true;
}

/** thread/start: whether the request starts an incognito chat (only a Chat may be incognito). */
export function incognitoStart(codeDesktop, surface) {
  return surface === 'chat' && codeDesktop?.incognito === true;
}

/** The codeDesktop of a new chat started from an incognito draft (and the plain one otherwise). */
export function withIncognito(codeDesktop, { surface, incognito } = {}) {
  const base = { ...(codeDesktop ?? {}) };
  delete base.incognito;
  return surface === 'chat' && incognito === true ? { ...base, incognito: true } : base;
}

/**
 * The incognito chat that is left when the window moves from `previous` to `next` (another session, Home, another
 * mode): it is deleted. null when nothing incognito is left behind.
 */
export function incognitoLeft(previous, next, metadata) {
  return previous && previous !== next && isIncognitoSession(previous, metadata) ? previous : null;
}

/** Incognito chats the app still remembers that no window has open this run (`live`): deleted by the sweep. */
export function incognitoLeftovers(config, live = new Set()) {
  const ids = [...new Set([...(config?.threadIds ?? []), ...(config?.archivedThreadIds ?? [])])];
  return ids.filter((id) => isIncognitoSession(id, config?.sessionMetadata) && !live.has(id));
}
