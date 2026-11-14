// Host adapters for src/generated/chat-messages (scripts/extract-chat-messages.mjs; the generator checks each original
// declaration's features before it points the slice here). OpenClaude has no claude.ai account (plan-w13 E59): the
// rating stays on this computer, the composer is never locked by a claude.ai lock reason, and nothing paces a retry.
import { createContext, useContext } from 'react';
import { R6 } from './generated/working-line/shared-2.mjs';
import Markdown from 'react-markdown';
import { t } from '../electron/i18n/index.mjs';

// What the host does with a rating (source-chat-message-actions.jsx provides it per message row).
export const ChatFeedbackContext = createContext(null);

// cc1aae219 MF: the claudeai.message.feedback_clicked analytics callback UF calls with
// `{ conversationUuid, message, rating: "up" | "down", ratingSurface, renderer }` before it opens the details form.
// Here it is the moment the rating is known; the host records it once the form (below) settles the type.
export function useChatFeedbackRecorder() {
  const host = useContext(ChatFeedbackContext);
  return payload => host?.onRatingClick?.(payload);
}

// cc1aae219 OF: the details form UF mounts while `w || E` (open, or just closed). Outside the early-access model
// (SF, a claude.ai model experiment) OF renders `h(rs, { ...i, initialFeedbackInput: e, onKeepFeedbackInput: v,
// onSubmit: l }, t)` with e = formTexts.texts.get(formKey) (the details typed before, kept per message and thumb),
// v = formTexts.keep, and l = onSubmit plus the message_feedback_submitted analytics (none here).
// w13-close-chat-messages (chatui-message-actions-02): rs is shared-6 iT, generated as feedback-form.mjs
// ChatFeedbackDialog; the host provides it through ChatFeedbackContext (`Dialog`, so this module does not import the
// generated form that imports it). iT submits through `onMessageFeedback(message, type, reason)` when one is given
// (`ae ? ae(n, r, e || void 0) : me(…)`): the host stores the rating with its optional details on this computer.
export function ChatFeedbackForm({ byConversationModel, ratingSurface, formTexts, formKey, onSubmit, ...props }) {
  void byConversationModel; void ratingSurface;
  const host = useContext(ChatFeedbackContext);
  const Dialog = host?.Dialog;
  if (!Dialog) return null;
  const initialFeedbackInput = formKey === undefined ? undefined : formTexts?.texts?.get(formKey);
  const onKeepFeedbackInput = (text) => { if (formKey !== undefined) formTexts?.keep?.({ formKey, text }); };
  const onMessageFeedback = (message, type, reason) => host?.onSubmit?.({ conversationUuid: props.conversationUuid, message, type, reason });
  return <Dialog key={formKey} {...props} onMessageFeedback={onMessageFeedback} initialFeedbackInput={initialFeedbackInput}
    onKeepFeedbackInput={onKeepFeedbackInput} onSubmit={onSubmit} />;
}

// w13-close-chat-messages: shared-6 iT's claude.ai reads for a local chat. No account (eV plan, VB account: the privacy
// link is the consumer one, Qw), no server message tree (DS "restMessageTreeUnavailable" off, the Xh conversation query
// has no data, YJ finds no stored message), no feedback mutation (L_; the host's onMessageFeedback is used instead), no
// web-search setting from the server (gu, LC), and the message carries no files or artifacts (nW, NL, iz). Memory is a
// local feature (dA available; Rk the claude.ai memory mode off), which keeps iT's "Issue with memory" choice.
export function useAccountPlan() { return undefined; }
export function useChatAccount() { return undefined; }
export function useChatClientFlag() { return false; }
export function useChatFeatureAvailability() { return { isAvailable: false }; }
export function chatBackendVariant() { return undefined; }
export function useChatMemoryMode() { return false; }
export function useChatMemoryAvailability() { return { isAvailable: true }; }
// shared-182 Cj: the context iT reads `{ hideWebSearchToggle, hideMessageFeedbackComment }` from; nothing hides them.
export const ChatFeedbackFormSettings = createContext({});
export function useChatConversationQuery() { return { data: undefined }; }
export function useChatConversationSettings() { return null; }
export function useChatConversationMessage() { return undefined; }
export function useSubmitChatFeedback() { return { mutate() {} }; }
export function chatMessageFiles() { return []; }
// shared-130 LV over FV = ["web_search", "web_search_fast"].
const WEB_TOOLS = new Set(['web_search', 'web_search_fast']);
export function isChatWebTool(name) { return WEB_TOOLS.has(name); }
export function chatMessageArtifacts() { return []; }
export function useMessageArtifactKind() { return undefined; }

// shared-26 CF: the reason a locked composer gives. The lock context keeps its default `{ locked: !1 }` (nothing in the
// host provides it), and CF returns undefined whenever it is unlocked.
export function useComposerLockReason() { return undefined; }

// shared-4 Wv: the server's overload pacing for Retry; the local core reports none.
export function useRetryPacing() { return { overloaded: false, pacedLabel: undefined }; }

// shared-2 i8 (UserMessage with the Actions statics): Jv reads `.RetryAction`, the same R6.RetryAction.
export const ChatMessageRetryParts = { RetryAction: R6.RetryAction };

// ca2ef848d U9 (the disclaimer under a chat): its claude.ai hooks for a plain local chat. No question card, settings
// panel or free-limit notice (Bf / pT data stay empty), not a local agent route or agent-mode context (za / By / ta), not
// incognito (Vee / Yv), no "Give us feedback" link (GC / HC), never a stale server copy (Gz / aB / oB). The chin
// placement hooks (Xw / Yee) answer their context defaults; they only matter for the inline variant.
export function useChatQuestionCard() { return {}; }
export function useChatSettingsPanel() { return {}; }
export function useChatComposerLayout() { return undefined; }
// w13-close-chat-messages: Vee is shared-182's incognito flag for the open conversation; the host provides it per
// transcript (ChatIncognitoContext: main.jsx's isIncognitoSession(current, sessionMetadata), chat-incognito-model.mjs).
export const ChatIncognitoContext = createContext(false);
export function useIncognitoChat() { return useContext(ChatIncognitoContext); }
export function useIsLocalAgentModeContext() { return false; }
export function useAgentRoute() { return undefined; }
export function useChatRoute() { return { isLocalAgentRoute: false }; }
// Yv = shared-182 kA: the short incognito note (shared-78 yv; no organization account here, `DA()` false; memory is a
// local feature, `dA().isAvailable` true → `pa.memory`). Only the inline disclaimer reads it.
export function useIncognitoMemoryNotice() { return t('No history, memory, or Claude training.'); }
// The conversation-end call's `incognitoString` (ca2ef848d `incognitoString: Hr`, Hr = py() = shared-182 OA): shared-78
// gv.incognitoNotice for a personal account with memory available.
export function incognitoNotice() { return t('Incognito chats stay out of your history, memory, and search, and aren’t used to train Claude.'); }
export function useCanGiveChatFeedback() { return false; }
export function useOpenChatFeedback() { return () => {}; }
export function useModelControlsInChin(position) { return position === 'bottom'; }
export function useChatConversationStale() { return { stale: false }; }
export function useStaleBannerMessages() { return false; }
export function ChatStaleSharedBanner() { return null; }
export function ChatQuestionKeyHint() { return null; }
// shared-25 Cx (the router Link): the support article opens in the browser, as `target: "_blank"` asks. The window
// refuses new windows (setWindowOpenHandler deny), so the click goes to the host's external opener.
export const ChatLinkContext = createContext(null);
export function ChatDisclaimerLink({ href, replace, scroll, prefetch, onClick, ...props }) {
  const openLink = useContext(ChatLinkContext);
  return <a href={href} {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || !openLink) return;
    event.preventDefault();
    openLink(href);
  }} />;
}

// w13-chatfn-tools: vendor-markdown s (wo), react-markdown's Markdown, which cc1aae219 eP renders a message warning with
// (`h(__, { components: SN, children: f })`); the host's react-markdown package is the same library.
export const ChatWarningMarkdown = Markdown;
