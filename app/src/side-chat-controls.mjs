import { sideChatContextQuestion } from './generated/code-editor/side-chat-context.mjs';
import { sideChatStore } from './side-chat-store.mjs';
import { isSideChatReset } from './side-chat-command.mjs';
import { t } from '../electron/i18n/index.mjs';

const METHOD_NOT_FOUND = -32601, INVALID_REQUEST = -32600;

/**
 * Whether a codeDesktop/sideQuestion failure means the core has no side questions: JSON-RPC method not found, or
 * the invalid request a native Codex app-server answers for a method it doesn't know ("unknown variant
 * `codeDesktop/sideQuestion`, expected one of …", a list of every method it serves).
 */
export function sideQuestionUnsupported(error) {
  if (error?.code === METHOD_NOT_FOUND) return true;
  return error?.code === INVALID_REQUEST && /unknown (?:variant|method)|method not found|not supported/i.test(String(error?.message ?? ''));
}

// 3.6556.2 cccc2cf0a SF over vF: the error row shows a fixed sentence per status, never the core's raw message. A host
// session is never a bridge session (`t.type === "bridge"`), so "unsupported" is vF.unsupported (outbound_only too) and
// not_connected is vF.unreachable, never the *Host variants; CF's `.catch(()=>({status:"failed"}))` turns any other
// failure into "failed" (vF.failed, also SF's "timeout"). W14-code r6-composer-06: a result's `status` (CF `r.status`)
// is read too — the Codex /side fork answers not_connected when the core goes away mid-question (native-side-chat.cjs).
// rate_limited needs scope / retryAfterSeconds no host core reports, so it stays the generic sentence.
export function sideQuestionErrorText(status) {
  switch (status) {
    case 'unsupported': case 'outbound_only': return t('Side chat isn’t supported in this session’s environment yet.');
    case 'no_answer': return t('No answer yet. Send a message in the main chat first, then ask again.');
    case 'not_connected': return t('Couldn’t connect to this session’s environment. Try again in a moment.');
    default: return t('Couldn’t get an answer. Try again.');
  }
}
const UNANSWERED = new Set(['unsupported', 'outbound_only', 'no_answer', 'not_connected', 'rate_limited', 'timeout', 'failed']);

export function clearSideChat({ rpc, threadId, keepDraft = false }) {
  const requestId = sideChatStore.get(threadId).requestId;
  if (requestId) void rpc('codeDesktop/sideQuestion/cancel', { requestId }).catch(() => {});
  // Original kT clearMessages/restart leaves staged context intact.
  sideChatStore.clear(threadId, { keepDraft, keepContext: true, keepStarted: true });
}

export async function stopSideQuestion({ rpc, threadId }) {
  const requestId = sideChatStore.get(threadId).requestId;
  if (!requestId || !sideChatStore.interrupt(threadId, requestId)) return;
  try {
    await rpc('codeDesktop/sideQuestion/cancel', { requestId });
    sideChatStore.finish(threadId, requestId, { retryable: false });
  } catch (error) {
    // W14-code r6-composer-06: official Stop only aborts the local request (cccc2cf0a `e.setInterrupting(m, !0), … :
    // Uc.interrupt(m)`), with no failure branch, so a failed cancel still ends the question here (no error row, no
    // Retry); a late answer for this request is ignored by the store's requestId check. The reason is only logged.
    console.warn('side question cancel failed', error);
    sideChatStore.finish(threadId, requestId, { retryable: false });
  }
}

/** Ask one side question for `threadId`; resolves when the answer settles. */
export async function askSideQuestion({ rpc, threadId, question, useStagedContext = false, subscribe = handler => globalThis.desktop?.onEvent?.(handler) }) {
  const text = String(question ?? '').trim();
  if (!text || !threadId) return;
  if (isSideChatReset(text)) { clearSideChat({ rpc, threadId }); return; }
  const previous = sideChatStore.get(threadId);
  if (previous.requestId) void rpc('codeDesktop/sideQuestion/cancel', { requestId: previous.requestId }).catch(() => {});
  const wireText = useStagedContext && previous.stagedContext !== null ? sideChatContextQuestion(text, previous.stagedContext) : text;
  if (useStagedContext) sideChatStore.clearStagedContext(threadId);
  const history = sideChatStore.history(threadId);
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  sideChatStore.ask(threadId, wireText, requestId);
  let unsubscribe;
  try {
    // The request owns its stream, independently of mounted panels/split views.
    unsubscribe = subscribe(event => {
      const params = event?.params;
      if (params?.threadId !== threadId || params.requestId !== requestId) return;
      if (event?.method === 'codeDesktop/sideQuestion/delta') sideChatStore.delta(threadId, requestId, params.text);
      else if (event?.method === 'codeDesktop/sideQuestion/progress') sideChatStore.progress(threadId, requestId, params);
    });
    const result = await rpc('codeDesktop/sideQuestion', { threadId, question: wireText, history, requestId });
    // CF: `r.status === "answered" ? appendMessage… : r.status !== "cancelled" && setError(o, SF(r, n, a))`.
    if (UNANSWERED.has(result?.status)) sideChatStore.finish(threadId, requestId, { error: sideQuestionErrorText(result.status), retryable: result.status !== 'unsupported' && result.status !== 'outbound_only' });
    else sideChatStore.finish(threadId, requestId, { text: result?.text, closed: result?.closed === true });
  } catch (error) {
    // The question stays on screen with the error; Retry is offered unless the core has no side questions at all.
    const unsupported = sideQuestionUnsupported(error);
    const message = sideQuestionErrorText(unsupported ? 'unsupported' : 'failed');
    sideChatStore.finish(threadId, requestId, { error: message, retryable: !unsupported });
  } finally {
    try { unsubscribe?.(); } catch {}
  }
}

