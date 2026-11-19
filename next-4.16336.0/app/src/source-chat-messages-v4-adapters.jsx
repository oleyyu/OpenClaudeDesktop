// Host adapters for the 4.16336.0 Chat message parts scripts/extract-chat-messages-v4.mjs emits
// (src/generated/chat-messages-v4; round 2 unit chat-messages). Each export answers one original declaration, which the
// extractor feature-checks and pins (HOST_ADAPTERS / ADAPTER_PINS). Staged only: the host still renders the 3.6556.2
// parts (src/source-chat-message-actions.jsx, main.jsx, chat-tools-model.mjs, source-user-actions.jsx read
// src/generated/chat-messages); see analysis/…/round2/chat-messages/report.json `cutover` for the switch points.
//
// Re-exported unchanged from the host adapter that documents each (the same claude.ai services the 3.6556.2 graph adapts,
// now in their 4.16336.0 chunks / locals; OpenClaude has no claude.ai account, the rating stays on this computer):
//   c49573414 qe / Ue (3.6556.2 cc1aae219 MF / OF), shared-4 X_ (Wv), ca2ef848d KB / vV / yV / xle (Gz / aB / oB / Nae),
//   shared-33 VI, shared-36 QD / lC, shared-123 zS / NS / Fm, shared-212 xC / dB / qz / dz, shared-5 uJ / gJ, shared-25 Ky,
//   shared-31 Jm, shared-153 Ny / YJ / bx / Ep / ST / yW, shared-33 nq, vendor-markdown ho
//                                                                -> source-chat-messages-adapters.jsx
//   vendor-intl q useIntl / Gt FormattedMessage                  -> source-routines-shared-adapters.jsx
// The host contexts those adapters read (ChatFeedbackContext, ChatIncognitoContext, ChatLinkContext) stay the ones of
// source-chat-messages-adapters.jsx, so a host provides them once for either graph.
import { m7 as MessageActions } from './generated/working-line-v4/shared-2.mjs';

export { useChatFeedbackRecorder, ChatFeedbackForm, useRetryPacing, useChatConversationStale, useStaleBannerMessages, ChatStaleSharedBanner, ChatQuestionKeyHint, useChatQuestionCard, useChatSettingsPanel, useIncognitoChat, useIsLocalAgentModeContext, useAgentRoute, useChatRoute, useIncognitoMemoryNotice, useCanGiveChatFeedback, useOpenChatFeedback, ChatDisclaimerLink, useChatClientFlag, useChatConversationQuery, useChatConversationMessage, useSubmitChatFeedback, useChatConversationSettings, useChatMemoryAvailability, useChatMemoryMode, useMessageArtifactKind, chatMessageArtifacts, chatMessageFiles, chatBackendVariant, ChatWarningMarkdown } from "./source-chat-messages-adapters.jsx";
export { useIntl, FormattedMessage } from "./source-routines-shared-adapters.jsx";

// shared-3 Bd (export vl; 3.6556.2 shared-2 i8): the UserMessage compound, `Object.assign(zd, { Attachments: jl,
// Actions: Ts, …, RetryAction: Ts.RetryAction, … })` with Ts = shared-2 m7, the MessageActions compound. shared-4 ev
// reads only `.RetryAction` (`d = Ad; y(d.RetryAction, …)`), which is m7.RetryAction: working-line-v4 holds and exports
// m7 (D1), so this answers it from there instead of cutting shared-3's UserMessage.
export const ChatMessageRetryParts = Object.freeze({ RetryAction: MessageActions.RetryAction });

// shared-7 HF (export T): `return N(BF)` with BF = createContext(!1) (vendor-frame C): whether the composer is laid out
// with the model controls in the chin. Nothing in the host provides BF, so the hook answers the context default.
// (3.6556.2 shared-7 bC read a context whose default was undefined; this one is false, so the disclaimer's inline
// placement takes `C = x && S === !1` as the official default does.)
export function useChatComposerLayout() { return false; }

// chat-conversation r3-02: shared-33 KH (export in) = `PH(() => void WH())`, s$'s mount effect (ca2ef848d c$ → a$ → DS):
// an idle-time dynamic import that warms the clay activity sprite sheets before the footer dots first draw. The sprite
// players themselves (SU) come from working-line-v4's activity-sprites.mjs (D1); the host bundles them with the app, so
// there is nothing to warm and the hint answers nothing.
export function preloadChatActivitySprites() {}

// chat-conversation r3-02: shared-100 _r (export Pt), W$'s mount effect (ca2ef848d K$ → Tb): at idle time it warms the
// CDS spark sprites (gr: shared-frame Bg reduced-motion probe, else sM's sprite import). cds-core's CdsAnimatedSpark (dM)
// loads those sprites itself when it first animates (lM's effect calls sM()), so this hint answers nothing.
export function preloadChatSparkSprites() {}
