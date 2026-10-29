// w13-chatui-message-actions: the Chat surface's assistant-message toolbar and message context menu, built from the
// official 3.6556.2 parts in src/generated/chat-messages (scripts/extract-chat-messages.mjs) and the MessageActions
// compound working-line already holds (shared-2 R6). No view-tabs facade here: source-transcript.jsx (in the chat
// graph) imports this file, so it takes the concrete generated files (E41).
//
// cc1aae219 r1 (not sliced: 1300 lines over the claude.ai conversation store) draws, outside the stacked layout:
//   y("div", { className: "group group/message-row", children: [<assistant-message>, _n] }) with
//   _n = h(Dc, { "data-testid": "message-actions", className: p(n1, "-mt-1", streaming && "invisible"), children: S }),
//   S = [Dc.CopyAction { "data-testid": "action-bar-copy", getText, getRichText }, Q$ (null),
//        WF { conversationUuid, message, agentMode, cdsPresets: !0 } (showFeedback, not a local agent route),
//        yF (branch task, not offered), Ia { "data-testid": "action-bar-retry", blocked, onRetry } (showRetry), …].
// The host keeps that order: Copy, Good / Bad response, Retry.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { R6 } from './generated/working-line/shared-2.mjs';
import { ChatMessageFeedback, MESSAGE_ACTIONS_INSET } from './generated/chat-messages/feedback.mjs';
import { ChatRetryAction } from './generated/chat-messages/retry-action.mjs';
import { MessageContextMenu } from './generated/chat-messages/context-menu.mjs';
import { ChatDisclaimer } from './generated/chat-messages/disclaimer.mjs';
// w13-close-chat-messages (chatui-message-actions-02): shared-6 iT, the details form OF opens (ChatFeedbackForm adapter).
import { ChatFeedbackDialog } from './generated/chat-messages/feedback-form.mjs';
import { ChatFeedbackContext, ChatIncognitoContext, ChatLinkContext, incognitoNotice } from './source-chat-messages-adapters.jsx';
import { feedbackMessage, retryPrompt } from './chat-feedback-model.mjs';
import { markdownToClipboardHtml } from './rich-copy-html.mjs';
import { userMessageContent } from './composer-attachments-model.mjs';
import { getLocale } from '../electron/i18n/index.mjs';
// w13-close-gen-dedup (chatfn-branches-05, D1): the version switcher is the generated cc1aae219 lI.
import { ChatVersionSelector } from './generated/chat-messages/version-selector.mjs';
import { applyMetadataPatch, normalizeGroups, showVersionNav, turnIndexIn, versionsAt } from './chat-branches-model.mjs';

// One assistant reply's toolbar.
//   conversationUuid  the chat's thread id; itemId the reply's transcript item id; text its Markdown.
//   feedback          itemId -> { type } (chat-feedback list), so a kept rating stays pressed.
//   onFeedback        ({ itemId, type, reason }) => Promise: store the submitted rating and its optional details locally
//                     (the host toasts "Feedback sent"); the thumbs open shared-6 iT first, Cancel stores nothing.
//   onRetry           () => void, or null when this reply cannot be retried (not the last one, or the core is busy).
//   retryBlocked / retryBlockedReason  r1's `blocked: Ie, blockedReason: Y.orgSendBlockedReason`.
//   streaming         r1 hides the toolbar while the reply streams (`Y.isHiddenDuringStreaming && "invisible"`).
//   versions / onVersion  w13-chatfn-branches: this reply's { selectedOption, nOptions } (chat-branches-model versionsAt)
//                     and changeDisplayedConversationPath(message, ±1); the switcher shows past one version (tO).
//   createdAt         w13-close-chat-messages (chatui-message-actions-02): the reply's time (ms), r1's
//                     `x.created_at && h(Ic.Timestamp, { date: x.created_at, locale: Le.locale, revealOnHover: !0 })` —
//                     Ic.Timestamp is R6.Timestamp (shared-2 `i8=Object.assign(r8,{…,Timestamp:R6.Timestamp,…})`).
export function SourceChatMessageActions({ conversationUuid, itemId, text, feedback = null, onFeedback = null, onRetry = null,
  retryBlocked = false, retryBlockedReason, streaming = false, versions = null, onVersion = null, createdAt = null }) {
  const message = useMemo(() => feedbackMessage(itemId, feedback), [itemId, feedback]);
  const host = useMemo(() => ({
    onRatingClick: () => {},
    onSubmit: ({ type, reason }) => onFeedback?.({ itemId, type, reason }),
    Dialog: ChatFeedbackDialog,
  }), [itemId, onFeedback]);
  const className = [MESSAGE_ACTIONS_INSET, '-mt-1', streaming && 'invisible'].filter(Boolean).join(' ');
  return <ChatFeedbackContext.Provider value={host}>
    <R6 data-testid="message-actions" className={className}>
      <R6.CopyAction data-testid="action-bar-copy" getText={() => text ?? ''}
        getRichText={() => { try { return markdownToClipboardHtml(text ?? ''); } catch { return ''; } }} />
      {onFeedback && <ChatMessageFeedback conversationUuid={conversationUuid} message={message} agentMode={false} cdsPresets={true} />}
      {onRetry && <ChatRetryAction data-testid="action-bar-retry" blocked={retryBlocked} blockedReason={retryBlockedReason}
        onRetry={() => onRetry()} />}
      {/* w13-chatfn-branches: r1's next child `Y.showOptionSelector && t.changeDisplayedConversationPath && h(lI, …)`. */}
      {versions && onVersion && showVersionNav({ isStreaming: streaming, optionCount: versions.nOptions })
        && <SourceChatVersionNav message={{ ...versions, sender: 'assistant' }} changeDisplayedConversationPath={onVersion} />}
      {Number.isFinite(createdAt) && <R6.Timestamp date={createdAt} locale={getLocale()} revealOnHover={true} />}
    </R6>
  </ChatFeedbackContext.Provider>;
}

// c79f7d2ef MessageContextMenu as cc1aae219 mounts it on a right-click over a message:
// h(pM, { x, y, container, onAttach: B, onClose: te, asReply: j && w.fitsQuoteList }). B attaches the selection (kM),
// or the whole message (OM) when the selection is shorter than gM, to the prompt; the quote-list reply (j) is off here.
// cc1aae219 xM's right-click handler `z`: `r?.closest("button, a, input, textarea, [contenteditable='true'],
// [role='button'], [role='menuitem']")` returns without taking the event, and so does a message whose selection
// (kM) is shorter than gM with no text of its own (`kM(i).length < gM && !OM(i)`). What the handler would attach
// (`o.length >= gM ? o : OM(i)`), or null when the event is left to the row's own menu (Copy link / Copy code …).
export const CHAT_MENU_PASS_THROUGH = "button, a, input, textarea, [contenteditable='true'], [role='button'], [role='menuitem']";
export const CHAT_MENU_MIN_SELECTION = 2; // gM
export function chatMessageMenuAttach(target, text, selectionText = '') {
  if (!target || target.closest?.(CHAT_MENU_PASS_THROUGH)) return null;
  // kM returns the selection trimmed; `o.length >= gM ? o : OM(i)`.
  const selection = typeof selectionText === 'string' ? selectionText.trim() : '';
  if (selection.length >= CHAT_MENU_MIN_SELECTION) return selection;
  return typeof text === 'string' && text ? text : null;
}
// w13-close-chat-messages (chatui-message-actions-03): cc1aae219 kM — the selection counts for a message only when its
// range intersects the message and starts or ends inside it:
//   `let n=t.getRangeAt(0),r=n.startContainer.nodeType===Node.TEXT_NODE?n.startContainer.parentNode:n.startContainer,
//   i=…endContainer…,a=r!==null&&e.contains(r)||i!==null&&e.contains(i);return n.intersectsNode(e)&&a?t.toString().trim():""`.
// (TM's 1e4-character cap only decides `fitsQuoteList`, i.e. the quote-list reply, which the host does not offer.)
export function messageSelectionText(message) {
  const selection = message?.ownerDocument?.defaultView?.getSelection?.() ?? null;
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  const TEXT = 3; // Node.TEXT_NODE
  const start = range.startContainer?.nodeType === TEXT ? range.startContainer.parentNode : range.startContainer;
  const end = range.endContainer?.nodeType === TEXT ? range.endContainer.parentNode : range.endContainer;
  const inside = (start != null && message.contains(start)) || (end != null && message.contains(end));
  return range.intersectsNode(message) && inside ? selection.toString().trim() : '';
}

export function SourceChatMessageMenu({ point, container, onAttach, onClose }) {
  if (!point || !container) return null;
  return <MessageContextMenu x={point.x} y={point.y} container={container} onAttach={onAttach} onClose={onClose} asReply={false} />;
}

// ca2ef848d U9 where the conversation ends (the call `hn === void 0 && !go && !ce && X === null` passes no `inline`):
// `<div role="note" data-disclaimer class="pointer-events-auto relative z-0 -mt-10 bg-surface-1 pb-2 pt-12 text-center
// text-xs text-muted-as-secondary">` around the support-article link. onOpenLink opens it in the browser.
// w13-close-chat-messages: an incognito conversation (chat-incognito-model.mjs isIncognitoSession) is U9's temporary one —
// the caller passes `isTemporary: Ce` and `incognitoString: Et` (ca2ef848d), so U9 shows the incognito notice
// (`n ? r : …`) in place of the support link, and Vee (useIncognitoChat) reads true.
export function SourceChatDisclaimer({ conversationUuid, onOpenLink = null, incognito = false }) {
  return <ChatLinkContext.Provider value={onOpenLink}><ChatIncognitoContext.Provider value={!!incognito}>
    <ChatDisclaimer conversationUuid={conversationUuid} isTemporary={!!incognito} incognitoString={incognito ? incognitoNotice() : undefined} hasWebSearchResponse={false} />
  </ChatIncognitoContext.Provider></ChatLinkContext.Provider>;
}

// The conversation's locally kept ratings (electron/chat-feedback.mjs through the "chat-feedback" host call) and the
// settle step the toolbar calls. call(action, params) is the host IPC; onSent() runs after the rating is stored
// (frame-shell-chrome AZ: the "Feedback sent" toast), onError(error) when it is not.
export function useChatFeedback({ threadId, call, onSent, onError }) {
  const [state, setState] = useState({ threadId: null, feedback: null });
  useEffect(() => {
    if (!threadId || typeof call !== 'function') return undefined;
    let live = true;
    call('chat-feedback', { operation: 'list', threadId }).then(result => {
      if (live) setState({ threadId, feedback: result?.data ?? {} });
    }, () => { if (live) setState({ threadId, feedback: {} }); });
    return () => { live = false; };
  }, [threadId, call]);
  const rate = useCallback(({ itemId, type, reason }) => {
    if (!threadId || typeof call !== 'function') return Promise.resolve();
    return call('chat-feedback', { operation: 'put', threadId, itemId, type, ...(typeof reason === 'string' && reason ? { reason } : {}) }).then(result => {
      setState(current => current.threadId === threadId ? { threadId, feedback: result?.data ?? current.feedback } : current);
      onSent?.();
    }, error => { onError?.(error); });
  }, [threadId, call, onSent, onError]);
  return { feedback: state.threadId === threadId ? state.feedback : null, rate: threadId ? rate : null };
}

// w13-chatfn-branches: cc1aae219 lI, the version switcher of a message with siblings —
//   r=(t.selectedOption??0)+1, i=t.nOptions??0, a=r<=1, o=r>=i, s=t.sender==="human";
//   y("div",{className:"inline-flex items-center gap-1",children:[
//     h(R,{variant:"ghost",iconOnly:!0,className:"!text-muted-as-secondary hover:!text-primary !w-6",size:"xs",
//       icon:"CaretLeft","data-testid":s?"user-message-previous-version":"action-bar-previous-version",disabled:a,
//       "aria-label":"Previous version",onClick:()=>n(t,-1)}),
//     h("span",{className:"self-center shrink-0 select-none font-small text-muted-as-secondary",
//       children:"{selectedOption} / {totalOptions}"}),
//     h(R,{…,icon:"CaretRight","data-testid":s?"user-message-next-version":"action-bar-next-version",disabled:o,
//       "aria-label":"Next version",onClick:()=>n(t,1)})]})
export const VERSION_NAV_CLASS = 'inline-flex items-center gap-1';
export const VERSION_BUTTON_CLASS = '!text-muted-as-secondary hover:!text-primary !w-6';
export const VERSION_COUNT_CLASS = 'self-center shrink-0 select-none font-small text-muted-as-secondary';
// The component is lI itself (generated/chat-messages/version-selector.mjs); its strings go through the host intl adapter.
export const SourceChatVersionNav = ChatVersionSelector;

// w13-chatfn-branches: this chat's versions (electron/chat-branches.mjs through the "chat-branches" host call).
//   threadId    the open chat (null off Chat); call(action, params) the host IPC.
//   canBranch   the core forks at a turn (capabilities.forkAtTurn) and the chat is idle, live and not archived;
//               firstTurn: the core also serves thread/revert, which the first reply's version needs.
//   params()    the fork's { permission, expected, afterPlan } as the sidebar Fork sends them.
//   onChange({ metadata, thread, show })  apply the sessionMetadata patch, add the new version's thread to the list
//               and open `show` (the version now displayed). onError(error).
// retry(turnId, prompt) makes a version of the turn and leaves the prompt pending for that thread, which the host
// sends once the version is open (pendingFor / clearPending); select(message, ±1) is lI's changeDisplayedConversationPath.
export function useChatBranches({ threadId, call, canBranch = false, firstTurn = false, params = () => ({}), onChange, onError }) {
  const [state, setState] = useState({ threadId: null, group: null, turnIds: null });
  const [pending, setPending] = useState(null);
  const pruned = React.useRef(false);
  useEffect(() => {
    if (!threadId || typeof call !== 'function') return undefined;
    let live = true;
    const list = () => call('chat-branches', { operation: 'list', threadId }).then(result => {
      if (live) setState({ threadId, group: result?.group ?? null, turnIds: Array.isArray(result?.turnIds) ? result.turnIds : null });
    }, () => { if (live) setState({ threadId, group: null, turnIds: null }); });
    // Once per window: a deleted conversation's other versions go with it (the service's cascade).
    if (!pruned.current) { pruned.current = true; void call('chat-branches', { operation: 'prune' }).catch(() => {}).finally(list); }
    else void list();
    return () => { live = false; };
  }, [threadId, call]);
  const group = state.threadId === threadId ? state.group : null;
  const turnIds = state.threadId === threadId ? state.turnIds : null;
  const groups = useMemo(() => normalizeGroups(group ? { [group.root]: group } : {}), [group]);
  const versionsFor = useCallback((index, sender = 'assistant') => threadId ? versionsAt(groups, threadId, index, { sender }) : null, [groups, threadId]);
  const canRetry = useCallback((index) => !!threadId && canBranch && Number.isInteger(index) && (index > 0 || (index === 0 && firstTurn)),
    [threadId, canBranch, firstTurn]);
  // w13-close-chat-messages: kind "edit" (the edited prompt, a new human sibling) or a Retry; `attachments` are the
  // turn's own files and images, sent again with the prompt (pendingFor carries them to the host's send).
  const retry = useCallback((turnId, prompt, { kind, attachments = null } = {}) => {
    if (!threadId || !turnId || typeof prompt !== 'string' || !prompt.trim()) return Promise.resolve(null);
    return call('chat-branches', { operation: 'create-variant', threadId, turnId, ...(kind === 'edit' ? { kind } : {}), ...params() }).then(result => {
      const id = result?.thread?.id;
      if (!id) return null;
      setState({ threadId: id, group: result.group ?? null, turnIds: null });
      setPending({ threadId: id, text: prompt, attachments });
      onChange?.({ metadata: result.metadata, sessionMetadata: result.sessionMetadata, thread: result.thread, show: id });
      return result;
    }, error => { onError?.(error); return null; });
  }, [threadId, call, params, onChange, onError]);
  const select = useCallback((message, step) => {
    const versions = message && (step < 0 ? message.previous : message.next);
    if (!threadId || !versions) return Promise.resolve(null);
    return call('chat-branches', { operation: 'select', threadId: versions }).then(result => {
      setState({ threadId: versions, group: result?.group ?? null, turnIds: null });
      onChange?.({ metadata: result?.metadata, show: versions });
      return result;
    }, error => { onError?.(error); return null; });
  }, [threadId, call, onChange, onError]);
  // One reply's part: its versions and, where a version can be made, Retry (null leaves the host's own Retry).
  // attachmentsOf(items, turnId): the turn's files and images, resent with the prompt.
  const forTurn = (items, turnId, textOf, attachmentsOf = null) => {
    const index = turnIndexIn(turnIds, items, turnId);
    const prompt = canRetry(index) ? retryPrompt(items, turnId, textOf) : null;
    return { versions: versionsFor(index), onRetry: prompt ? () => void retry(turnId, prompt, { attachments: attachmentsOf?.(items, turnId) ?? null }) : null };
  };
  // w13-close-chat-messages (chatfn-branches-03): one prompt's part — cc1aae219 s4's `user-message-retry` (pn: Ia
  // with `je.onRetry("human_message_hover", k.uuid)` while `showHumanRetry`, i.e. the prompt is not the last message: it
  // has a reply), `user-message-edit` (hn: Ic.EditAction, `je.showEdit && ne`) and its lI with `sender: "human"` (yn).
  // onEdit opens the editor (the host's); edit(turnId, text) saves it as a new version of the prompt.
  const forUserTurn = (items, turnId, onEdit, textOf, attachmentsOf = null) => {
    const index = turnIndexIn(turnIds, items, turnId);
    const branchable = canRetry(index);
    const answered = branchable && Array.isArray(items) && items.some((item) => item?.turnId === turnId && item.type === 'agentMessage');
    const prompt = answered ? retryPrompt(items, turnId, textOf) : null;
    return { versions: versionsFor(index, 'human'), onEdit: branchable && typeof onEdit === 'function' ? onEdit : null, onVersion: select,
      onRetry: prompt ? () => void retry(turnId, prompt, { attachments: attachmentsOf?.(items, turnId) ?? null }) : null };
  };
  const edit = useCallback((turnId, text, attachments = null) => retry(turnId, text, { kind: 'edit', attachments }), [retry]);
  const pendingFor = useCallback((id) => pending && pending.threadId === id ? pending : null, [pending]);
  const clearPending = useCallback(() => setPending(null), []);
  return { group, versionsFor, canRetry, retry, edit, select, forTurn, forUserTurn, pending, pendingFor, clearPending };
}

// w13-close-chat-messages (chatui-message-actions-03): the turn's prompt files and images as ready composer entries
// (composer-attachments-model attachmentInputs reads kind / status / path / name), so a Retry or an edited prompt sends
// them again with the text — r1's Retry repeats the whole human message, not only its words. The transcript's own
// preview URLs are not handed over (the send revokes its entries' previews).
export function turnAttachments(items, turnId) {
  const user = Array.isArray(items) && turnId ? items.find((item) => item?.turnId === turnId && item.type === 'userMessage') : null;
  const entries = [];
  for (const part of userMessageContent(user?.content || [])) {
    if (typeof part?.path !== 'string' || !part.path) continue;
    const name = part.name || part.path.split(/[\\/]/).pop();
    const kind = part.type === 'localImage' || part.type === 'image' ? 'image' : part.type === 'mention' ? 'file' : null;
    if (kind) entries.push({ id: `resend:${turnId}:${entries.length}`, kind, status: 'ready', path: part.path, name });
  }
  return entries;
}

/** sessionMetadata after a "chat-branches" result (re-exported for the host's setSessionMetadata). */
export const withChatBranchMetadata = applyMetadataPatch;
