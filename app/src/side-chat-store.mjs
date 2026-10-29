// /btw side chat state, per session (original ca2ef848d Cs store:
// messagesByConversation, status, error). Lives for the app's lifetime only:
// nothing here is written to the session or to disk.
//
// Each thread keeps messages, status/error/request, interruption state and its own
// unsent draft. Drafts survive navigation/unmount, but are never written to disk.
// A question whose answer failed stays as the last message (no answer after it) and
// `retry` holds its text while asking again could help; it travels with the popout hand-over. The panel shows neither
// a Retry button (cccc2cf0a UF Ze is a bare error p) nor an empty-answer notice (CF sets no error for an empty response).
const EMPTY = Object.freeze({ messages: Object.freeze([]), status: 'idle', thinkingSince: null, progress: null, error: null, requestId: null, retry: null, draft: '', draftMentions: Object.freeze([]), interrupting: false, stagedContext: null, started: false });

export function createSideChatStore({ now = () => Date.now() / 1000 } = {}) {
  const threads = new Map(), listeners = new Set();
  const emit = () => { for (const listener of listeners) listener(); };
  const get = id => threads.get(id) ?? EMPTY;
  const set = (id, patch) => { threads.set(id, { ...get(id), ...patch }); emit(); };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get,
    setDraft(id, draft) { if (id && get(id).draft !== draft) set(id, { draft, ...(draft ? {} : { draftMentions: [] }) }); },
    rememberMention(id, option) {
      if (!id || !option?.path || get(id).draftMentions.some(entry => entry.path === option.path)) return;
      set(id, { draftMentions: [...get(id).draftMentions, { path: option.path }] });
    },
    markStarted(id) { if (id && !get(id).started) set(id, { started: true }); },
    stageContext(id, text) { if (id && text) set(id, { stagedContext: text }); },
    clearStagedContext(id) { if (get(id).stagedContext !== null) set(id, { stagedContext: null }); },
    interrupt(id, requestId) {
      const state = get(id);
      if (state.requestId !== requestId || state.interrupting || state.status !== 'thinking') return false;
      set(id, { interrupting: true }); return true;
    },
    interruptFailed(id, requestId, error) {
      if (get(id).requestId === requestId) set(id, { interrupting: false, error });
    },
    /** Q&A pairs before the pending question, for the next request's history. */
    history(id) {
      const out = [], messages = get(id).messages;
      for (let index = 0; index + 1 < messages.length; index += 2)
        if (messages[index].role === 'user' && messages[index + 1].role === 'assistant' && messages[index + 1].text) out.push({ question: messages[index].text, answer: messages[index + 1].text });
      return out;
    },
    ask(id, question, requestId) {
      const messages = [...get(id).messages];
      // A question whose answer never started is replaced (Bw popLastIfUser).
      if (messages.at(-1)?.role === 'user') messages.pop();
      set(id, { messages: [...messages, { role: 'user', text: question }, { role: 'assistant', text: '' }], status: 'thinking', thinkingSince: now(), progress: null, error: null, requestId, retry: null, interrupting: false, started: true });
    },
    progress(id, requestId, { stage, activity = null } = {}) {
      const state = get(id);
      if (state.requestId !== requestId || state.status !== 'thinking' || state.interrupting || !['forking', 'waiting', 'tools', 'responding'].includes(stage)) return;
      const value = { stage, activity: stage === 'tools' && typeof activity?.tool === 'string' ? { tool: activity.tool, detail: typeof activity.detail === 'string' ? activity.detail : null } : null };
      if (JSON.stringify(state.progress) !== JSON.stringify(value)) set(id, { progress: value });
    },
    delta(id, requestId, text) {
      const state = get(id);
      if (state.requestId !== requestId || !text) return;
      const messages = [...state.messages], last = messages.at(-1);
      if (last?.role !== 'assistant') return;
      messages[messages.length - 1] = { ...last, text: last.text + text };
      set(id, { messages });
    },
    /**
     * The final text wins over the streamed deltas. With no answer only the empty answer is
     * dropped: the question stays on screen beside the error, and `retryable` (default true)
     * keeps its text. The next ask replaces it (popLastIfUser above).
     */
    finish(id, requestId, { text, error, retryable = true, closed = false } = {}) {
      const state = get(id);
      if (state.requestId !== requestId) return;
      if (state.interrupting || closed) { retryable = false; error = null; }
      let messages = [...state.messages], retry = null;
      const last = messages.at(-1);
      if (last?.role === 'assistant') {
        const answer = typeof text === 'string' && text ? text : last.text;
        messages = answer ? [...messages.slice(0, -1), { ...last, text: answer }] : messages.slice(0, -1);
        if (!answer && retryable && messages.at(-1)?.role === 'user') retry = messages.at(-1).text;
      }
      set(id, { messages, status: 'idle', thinkingSince: null, progress: null, error: error ?? null, requestId: null, retry, interrupting: false, started: closed ? false : state.started });
    },
    /**
     * B27 side chat window (cd377abb5 _i shares one store; here each window has its own renderer): the thread's
     * conversation as plain data, moved into the popped-out window (popout-state seed) and back (popout-dock handback).
     * A response still streaming stays with the window that asked, so only a settled conversation moves.
     */
    exportThread(id) {
      const state = get(id);
      if (!id || state.status === 'thinking') return null;
      return { messages: state.messages.map(message => ({ role: message.role === 'user' ? 'user' : 'assistant', text: String(message.text ?? '') })),
        error: state.error ?? null, retry: state.retry ?? null, draft: state.draft ?? '', draftMentions: state.draftMentions.map(entry => ({ path: String(entry.path) })),
        stagedContext: typeof state.stagedContext === 'string' ? state.stagedContext : null, started: state.started === true };
    },
    importThread(id, data) {
      if (!id || !data || typeof data !== 'object' || get(id).status === 'thinking') return false;
      const text = value => (typeof value === 'string' ? value : '');
      const messages = (Array.isArray(data.messages) ? data.messages : []).filter(message => message && (message.role === 'user' || message.role === 'assistant'))
        .slice(-400).map(message => ({ role: message.role, text: text(message.text) }));
      threads.set(id, { ...EMPTY, messages, error: typeof data.error === 'string' ? data.error : null, retry: typeof data.retry === 'string' ? data.retry : null,
        draft: text(data.draft), draftMentions: (Array.isArray(data.draftMentions) ? data.draftMentions : []).filter(entry => typeof entry?.path === 'string').map(entry => ({ path: entry.path })),
        stagedContext: typeof data.stagedContext === 'string' ? data.stagedContext : null, started: data.started === true });
      emit();
      return true;
    },
    clear(id, { keepDraft = false, keepContext = false, keepStarted = false } = {}) {
      const previous = get(id), draft = keepDraft ? previous.draft : '';
      const stagedContext = keepContext ? previous.stagedContext : null, started = keepStarted && previous.started;
      threads.delete(id);
      if (draft || stagedContext !== null || started) threads.set(id, { ...EMPTY, draft, draftMentions: keepDraft ? previous.draftMentions : [], stagedContext, started });
      emit();
    },
  };
}

export const sideChatStore = createSideChatStore();
