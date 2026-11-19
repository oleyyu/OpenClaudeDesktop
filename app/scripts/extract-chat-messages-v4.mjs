// Chat message parts, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 round 2, unit chat-messages): the
// same semantic roots scripts/extract-chat-messages.mjs cuts from 3.6556.2 into src/generated/chat-messages (the parts the
// desktop Chat conversation draws under an assistant reply and around the transcript), cut from the frozen 4.16336.0
// snapshot into the isolated graph src/generated/chat-messages-v4. The 3.6556.2 generator, output and tests are untouched
// (staged double output; no production switch this round: src/source-chat-message-actions.jsx, main.jsx,
// src/chat-tools-model.mjs and src/source-user-actions.jsx keep reading src/generated/chat-messages; region-plan
// cutover.productionSwitchNotBeforeBatch 9).
//
//   c49573414-CW4mWVDA  rt  ChatMessageFeedback   (export c; 3.6556.2 cc1aae219 WF = M(UF)): `var rt = s(nt)`, the
//                           Good / Bad response pair the assistant message row renders with `cdsPresets: !0`; nt is its
//                           body (INNER). qe (analytics, 3.6556.2 MF) and Ue (the details form, OF) are host adapters.
//   cc1aae219-BbSf__8R  xM  ChatVersionSelector   (3.6556.2 lI; chunk-internal)
//                       tM  MESSAGE_ACTIONS_INSET (3.6556.2 n1): the toolbar's inline-start inset class
//                       Vj  ChatMessageWarning    (3.6556.2 eP): the warning under a message (web search nudge, Drive
//                           images, and, new in 4.16336.0, the code-execution-off nudge and a parent warning)
//   ca2ef848d-DA54buzo  H9  ChatDisclaimer        (3.6556.2 U9; chunk-internal): "Claude is AI and can make mistakes."
//   c79f7d2ef-snkGFUaN  w   MessageContextMenu    (export MessageContextMenu; `w = o(S)`, S is its body, INNER)
//   shared-6-2QYRw_Wv   k_  ChatFeedbackDialog    (export Da; 3.6556.2 shared-6 iT): the details form Ue renders
//   shared-4-C_EiQb9h   ev  ChatRetryAction       (3.6556.2 Jv; chunk-internal): the Retry action Q_ (export Ui) draws
//                           without a quota hold
//   shared-153-DMw2VzSq Kq  messageTextFeatures   (3.6556.2 shared-130 Gq): a text's { hasCodeBlock, hasWebLink }
//   c7dd2633f-CvrjtTGG  re  AssistantMessageRoot  (export N; cc1aae219 kw): chat-conversation r2-02, the classic
//                           assistant message wrapper JY draws outside cdsAssistantMessageRoot (host gate off, D29/D31):
//                           `div.group.relative` + the caller's `relative pb-[var(--msg-assistant-pb,0.75rem)]`
//                       y   AssistantMessageText  (export P; cc1aae219 jw): the reply's text column (font-claude-response,
//                           leading-[1.65rem], the text / table insets v and g; stackBlocks adds shared-38 eo)
//   ca2ef848d-DA54buzo  Zce ChatFooterSpark       (chat-conversation r3-02; chunk-internal): ele's chat-footer-spark, the
//                           div[data-state] around W$ (the interactive spark, U$'s tooltip lines) or s$ (the footer dots,
//                           SU from working-line-v4's activity-sprites.mjs; shared-33 KH / shared-100 _r warm-ups are host
//                           hints)
//   cf854d0e8-YPmDYG3q  c   ChatJumpToLatest      (export t; chat-conversation r3-01): the Chat page's scroll-to-bottom
//                           button uL draws (ca2ef848d JO)
//   shared-2-CsjIBQD8   _J  CHAT_COLUMN_MESSAGE_INSETS (export Ea): the msg-* insets of the transcript column vJ
//                           (`[--msg-text-inset:0.25rem] [--msg-block-inset:0px]`, max-md `--msg-inset-end` 0)
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames: CdsButton, CdsIcon, CdsDialog, CdsTextArea, CdsBanner,
//     CdsComboboxField, CdsTextLink, useCdsLayerAwareZIndex, asElementNode, useCdsOwnerWindow, useEventCallback (shared-0
//     xe) and the shared-153 jC / shared-62 qN contexts; cds-core module state without a publicName stops generation, D46);
//     the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, round2/plan.json chat-messages): only the modules that hold a binding this closure reads —
//     frame-sidebar-nav (shared-26 AG / MG composer lock, shared-153 qh server message uuid, shared-33 zG dialog presence
//     (3.6556.2 sidebar-sections $L), shared-62 iP optional errors, shared-92 F_ feature availability), routines-shared-v4
//     (shared-25 VB / eV over the account context Dz), working-line-v4 (shared-2 m7, the MessageActions compound),
//     session-rail-kit-v4 (shared-38 oo, the class-unless-context helper): every binding they hold and export is imported
//     from them, never cut again;
//   - host boundaries as localAdapters (file#local), answered by src/source-chat-messages-v4-adapters.jsx: the claude.ai
//     services the 3.6556.2 graph adapts, now in their 4.16336.0 chunks / locals, re-exported unchanged from the host
//     adapter that documents each, plus shared-3 Bd (the UserMessage compound, answered with working-line-v4's m7) and
//     shared-7 HF (the composer layout context's default). Each original is pinned by features and by its raw declaration
//     sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local, with its export alias as reviewed and
// its raw declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_MESSAGES_V4_OUTPUT = 'src/generated/chat-messages-v4';
const ADAPTER_FILE = 'src/source-chat-messages-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, cds-integrate/wave6/apply-real.json).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const FEEDBACK = 'c49573414-CW4mWVDA.js';
export const ROW = 'cc1aae219-BbSf__8R.js';
export const PAGE = 'ca2ef848d-DA54buzo.js';
export const MENU = 'c79f7d2ef-snkGFUaN.js';
export const FORM = 'shared-6-2QYRw_Wv.js';
export const RETRY = 'shared-4-C_EiQb9h.js';
export const LINKS = 'shared-153-DMw2VzSq.js';
export const MESSAGE = 'c7dd2633f-CvrjtTGG.js';
export const COLUMN = 'shared-2-CsjIBQD8.js';
export const JUMP = 'cf854d0e8-YPmDYG3q.js';
const TARGETS = { [JUMP]: 'jump-to-latest.mjs', [FEEDBACK]: 'feedback.mjs', [ROW]: 'message-row.mjs', [PAGE]: 'disclaimer.mjs', [MENU]: 'context-menu.mjs',
  [FORM]: 'feedback-form.mjs', [RETRY]: 'retry-action.mjs', [LINKS]: 'message-links.mjs', [MESSAGE]: 'assistant-message.mjs',
  [COLUMN]: 'message-column.mjs' };
const target = file => TARGETS[file] ?? `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [FEEDBACK]: {
    rt: { name: 'ChatMessageFeedback', export: 'c', probe: 'rt=s(nt)', features: ['var rt = s(nt);'] },
  },
  [ROW]: {
    xM: { name: 'ChatVersionSelector', export: null, probe: 'id:"nZObrEhD3u"',
      features: ['{ message: t, changeDisplayedConversationPath: n } = e,', 'r = (t.selectedOption ?? 0) + 1,', 'i = t.nOptions ?? 0,', 's = t.sender === "human",',
        'd = s ? "user-message-previous-version" : "action-bar-previous-version",', 'g = s ? "user-message-next-version" : "action-bar-next-version",',
        'defaultMessage: "Previous version",', 'id: "nZObrEhD3u",', 'defaultMessage: "Next version", id: "vfItgW2tkJ"', 'defaultMessage: "{selectedOption} / {totalOptions}",',
        'className: "not-touch:!w-6",', 'icon: "CaretLeft",', 'icon: "CaretRight",',
        '"self-center shrink-0 select-none text-caption-regular font-sans text-muted-as-secondary",', 'className: "inline-flex items-center gap-1",'] },
    tM: { name: 'MESSAGE_ACTIONS_INSET', export: 'qr', probe: 'tM="ms-[calc(var(--msg-text-inset,0.5rem)_-_6px)]',
      features: ['"ms-[calc(var(--msg-text-inset,0.5rem)_-_6px)] touch:ms-[calc(var(--msg-text-inset,0.5rem)_-_0.625rem*var(--cds-rem-scale,1))]"'] },
    Vj: { name: 'ChatMessageWarning', export: null, probe: 'id:"uUjlNFGg26"',
      features: ['showWebSearchNudge: t,', 'showDriveImagesWarning: n,', 'showCodeExecutionOffNudge: r,', 'parentWarningMarkdown: i,',
        'defaultMessage:\n            "Turn on web search in Search and tools menu. Otherwise, links provided may not be accurate or up to date.",', 'id: "uUjlNFGg26",',
        'defaultMessage: "Claude cannot yet access images from Google Docs.",', 'id: "8Wb1yCJBBv",', 'id: "/uL1gF+0iz",', '(d = u.reverse().join(" ")),',
        'm(f_, { components: uj, children: f })', '"data-testid": "message-warning",'] },
  },
  [PAGE]: {
    // chat-conversation r3-02: ele's footer spark, `st("chat-footer-spark", …)` → Zce (div[data-testid][data-state] p-1
    // -translate-x-px) around W$ (the interactive spark: shared-frame Wa in a lazy cd tooltip, U$'s lines, tickle on press).
    Zce: { name: 'ChatFooterSpark', export: null, probe: 'Zce=b(function(e){let $=J9(33)',
      features: ['testId: t,', 'hidden: n,', 'collapsed: r,', 'atWorkingRow: i,', 'avatarState: a,', 'footerDots: o,', 'dotsActivity: s,',
        'T = S ? "collapsed" : n ? "hidden" : "shown",', 'E = C ? "working-row" : void 0,', '"data-testid": t,', '"data-state": T,', '"data-placement": E,'] },
    H9: { name: 'ChatDisclaimer', export: null, probe: 'id:"GjG77Kioid"',
      features: ['conversationUuid: t,', 'isTemporary: n,', 'incognitoString: r,', 'hasWebSearchResponse: i,', 'isMcpAppFullscreen: a,', 'inline: o,', 'concealed: s,',
        '"pointer-events-auto relative z-0 -mt-10 bg-page pb-2 pt-12 text-center text-xs text-muted-as-secondary",',
        'href: "https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on",',
        '"Claude is AI and can make mistakes. Please double-check responses.",', 'id: "Hz3uf5n9Ga",', '"Claude is AI and can make mistakes. Please double-check cited sources.",',
        'id: "FGmLea0H7Z",', 'defaultMessage: "Give us feedback",', 'source: "claude_chat",', '"not-hover:not-focus-visible:text-muted-as-tertiary hover:text-secondary transition",',
        'role: "note",', '"data-disclaimer": !0,', 'inert: B,'] },
  },
  [MENU]: {
    w: { name: 'MessageContextMenu', export: 'MessageContextMenu', probe: 'w=o(S)', features: ['var w = o(S);'] },
  },
  [FORM]: {
    k_: { name: 'ChatFeedbackDialog', export: 'Da', probe: 'id:"3eBGtYvhrI"',
      features: ['requestedFeedbackType: r,', 'setRequestedFeedbackType: i,', 'onMessageFeedback: f,', 'initialFeedbackInput: b,', 'onKeepFeedbackInput: x,',
        'K = Ts("restMessageTreeUnavailable"),', '{ onMessageFeedback: ie } = $g(),', 'q = f ?? ie,', 'if (q) q(n, r, e || void 0);',
        'defaultMessage: "Give positive feedback",', 'id: "3eBGtYvhrI",', 'defaultMessage: "Give negative feedback",', 'id: "jOz9SoiS5x",',
        'defaultMessage: "Please provide details: (optional)",', '"What type of issue do you wish to report? (optional)",', 'defaultMessage: "Submit", id: "wSZR47Y5kj"',
        'className: "mt-4 flex flex-col",', 'h(V.Popup, { size: "md", initialFocus: Qe, children: [$e, et, Xe] })'] },
  },
  [RETRY]: {
    ev: { name: 'ChatRetryAction', export: null, probe: 'quotaHoldReason:a,...o',
      features: ['blocked: t,', 'blockedReason: n,', 'onRetry: i,', 'className: r,', 'quotaHoldReason: a,', 'l = X_(Z_).pacedLabel !== void 0,',
        'u = s.formatMessage({ defaultMessage: "Retry", id: "62nsdyMyIO" });', 'B("aria-disabled:opacity-disabled", r)', 'y(d.RetryAction, {', '"aria-disabled": p,', 'label: m,'] },
  },
  [LINKS]: {
    Kq: { name: 'messageTextFeatures', export: null, probe: 'function Kq(e){let{hasCodeBlock:t,hasWebLink:n}=Gq(e,null)',
      features: ['let { hasCodeBlock: t, hasWebLink: n } = Gq(e, null);', 'return { hasCodeBlock: t, hasWebLink: n };'] },
  },
  // chat-conversation r2-02 (cc1aae219 JY classic branch): `_(kw, {"data-testid": "assistant-message", …, children: [h3, m(jw,
  // {id, ref, stackBlocks, children}), Mn, Pn]})`.
  [MESSAGE]: {
    re: { name: 'AssistantMessageRoot', export: 'N', probe: 'K1($,4,r,t("group relative",r))',
      features: ['({ className: r, ref: a, ...i } = e)', 't("group relative", r)', 'n("div", { ref: a, ...i, className: o })'] },
    y: { name: 'AssistantMessageText', export: 'P', probe: 'stackBlocks:o,cdsTextInset:s',
      features: ['stackBlocks: o,', 'cdsTextInset: s,', 'l = !(s !== void 0 && s) && v,', 'u = c && ee,',
        '"font-claude-response relative leading-[1.65rem] [&_pre>div]:bg-bg-000/50 [&_pre>div]:border-0.5 [&_pre>div]:border-border-400 [&_.ignore-pre-bg>div]:bg-transparent",',
        'n(f.Provider, { value: c, children: r })', 'n("div", { ...a, className: d, children: p })'] },
  },
  // chat-conversation r3-01: the Chat page's jump-to-latest control (ca2ef848d Yle → lL → uL renders `u(JO, {visible, onClick,
  // isStreaming, workingMark, placementClassName: "bottom-5 -translate-y-[var(--composer-banners-h,0px)]"})`, JO = t).
  [JUMP]: {
    c: { name: 'ChatJumpToLatest', export: 't', probe: '"data-testid":"jump-to-latest"',
      features: ['placementClassName: p,', 'defaultMessage: "Scroll to bottom",', '"z-[1] size-9 inline-flex items-center justify-center",', '"absolute left-1/2 -translate-x-1/2",',
        '"border-0.5 overflow-hidden !rounded-full p-1",', '"shadow-md hover:shadow-lg",', '"bg-bg-000/80",', '"data-testid": "jump-to-latest",'] },
  },
  [COLUMN]: {
    _J: { name: 'CHAT_COLUMN_MESSAGE_INSETS', export: 'Ea', probe: '_J=`max-md:[--msg-inset-end:0px] ${aJ}`',
      features: ['_J = `max-md:[--msg-inset-end:0px] ${aJ}`'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c49573414-CW4mWVDA.js#rt': '0b5bea178c56d9a6dce933497d4845a3f214a72c5c789585cdefe7a490e5fecd',
  'cc1aae219-BbSf__8R.js#xM': '7cc4a8baf526ba4e2aad4af46797fdba27238bf691704a6b36905a71e1f5259d',
  'cc1aae219-BbSf__8R.js#tM': '353e0258ba4acac83f6f418c85054fc6fb6637d263777fdefad837242de1bd91',
  'cc1aae219-BbSf__8R.js#Vj': '9f9c3d4cb566b46ba26de93eca2a0d0eea79e8c77bb25a2fd7914ca9b20782f8',
  'ca2ef848d-DA54buzo.js#H9': '31a9938c0ca0372ab2bef3772dab2d8bd7048d32c2c551c65385069c6f6885ec',
  'c79f7d2ef-snkGFUaN.js#w': '112933d2f3842cf82b90bec7763378bad076fa43fe748f39bb26f6aec5ecb03a',
  'shared-6-2QYRw_Wv.js#k_': '73361cacecebc494d1f28c4ca63ee1805fd3ff60ae0c4c1b78018078e0b67669',
  'shared-4-C_EiQb9h.js#ev': 'd068ca53e8378bc2d4f946e9363fbe7c6e8d39495c157dcd10f7b50e00484f40',
  'shared-153-DMw2VzSq.js#Kq': '8054c728dab64d80ac1cde796a2842e4d543062b11d2312ea9b1580456c7bccb',
  'c7dd2633f-CvrjtTGG.js#re': '793ba2b4b2fcd0bfe2107aff452053311a667baa360becfcf1fdb46376504dfa',
  'c7dd2633f-CvrjtTGG.js#y': 'a7bc5bc7556bf7342da1e0f2358a67dfa8a4f9f627a98c9b385b565fbaa5df02',
  'shared-2-CsjIBQD8.js#_J': '80b98a1a67fce44bec78f7d43c0e1d50b8d5c1e3377b6fad631a231d68b1cc98',
  'ca2ef848d-DA54buzo.js#Zce': '2b737ed03c5831ecb5aa9be5c26eb4bfacc9262a2023512c33f34f0562f909e0',
  'cf854d0e8-YPmDYG3q.js#c': 'f2e1b1313d2834b3332e71ee489fb2806ca31dd99262b68079a23a7be959e6b1',
};
// Feature checks on parts the roots reach (a reused minified name cannot pass): file#local -> features.
export const INNER = {
  // chat-conversation r3-02: W$, the footer spark Zce draws while the dots are off (CdsAnimatedSpark in a lazy CdsTooltip,
  // inline-end of the reading direction; a press tickles it and counts U$'s line), and U$ (literal English lines).
  'ca2ef848d-DA54buzo.js#W$': ['{ state: t, isInteractive: n } = e,', 'r = t === void 0 ? "idle" : t,', '[o, c] = s(G$, 0),', 'w(K$, f);',
    'g = !i || r === "thinking" || r === "writing",', 'x = l ? "tickle" : r,', 'u(de, { state: x, onEnd: _ })', 'className: "inline-flex",', 'onMouseDown: b,',
    'u(be, { content: v, side: y, lazy: !0, children: C })'],
  'ca2ef848d-DA54buzo.js#U$': ['return e > 24 && e < 32', 'e > 18 && e <= 24', '"Alright, alright, you have my attention!"', '"Are you still doing that?"', '"Yes, yes. What can I do for you?"'],
  // nt (3.6556.2 UF): the thumbs, pressed from the message's chat_feedback (or the type just submitted).
  'c49573414-CW4mWVDA.js#nt': ['conversationUuid: t,', 'message: o,', 'agentMode: s,', 'cdsPresets: l,', 'testIdPrefix: h,', 'T = h === void 0 ? "action-bar" : h,',
    'rating: e === "upvote" ? "up" : "down",', 'ratingSurface: x ?? "row",', 'renderer: "legacy",', 'G = le ?? o.chat_feedback?.type,',
    'n(ae.PositiveFeedbackAction, {', 'n(ae.NegativeFeedbackAction, {', '"data-testid": `${T}-thumbs-up`,', '"data-testid": `${T}-thumbs-down`,',
    'defaultMessage: "Good response",', 'id: "egSujeVZbJ",', 'defaultMessage: "Bad response", id: "7gPOUMZwkQ"', 'icon: n(p, { name: "ThumbsUp", bold: K, size: Y }),',
    'formKey: `${oe}:${D === y.UPVOTE ? "up" : "down"}`,', '(A || j) &&'],
  // S (3.6556.2 S): the right-click menu body.
  'c79f7d2ef-snkGFUaN.js#S': ['{ x: a, y: o, container: d, onAttach: g, onClose: _, asReply: v } = i,', 'role: "menuitem",', 'autoFocus: !0,',
    'e(y, { defaultMessage: "Reply", id: "jNnlTJdFg7" })', 'e(y, { defaultMessage: "Attach as context", id: "qkN7P8fxeY" }),', 'P = b ? "Reply" : "ArrowBendUpLeft",',
    '"min-w-[200px] rounded-lg border bg-surface-popover shadow-lg py-1",', 'role: "menu",', 't.addEventListener("contextmenu", r),'],
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ───────────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there); null:
// defined in the v4 adapter module itself.
const OWN = 'src/source-chat-messages-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 cc1aae219 MF: the claudeai.message.feedback_clicked analytics callback nt calls before opening the form.
  'c49573414-CW4mWVDA.js#qe': { name: 'useChatFeedbackRecorder', from: OWN,
    features: ['{ track: e } = D(),', 'event_key: "claudeai.message.feedback_clicked",', 'rating: n.rating,', 'rating_surface: n.ratingSurface,', 'renderer: n.renderer,'] },
  // 3.6556.2 cc1aae219 OF: the details form (outside the early-access model Le) renders `n(ce, { ...o, initialFeedbackInput: e,
  // onKeepFeedbackInput: y, onSubmit: d }, t)` with ce = shared-6 Da (k_, ChatFeedbackDialog, generated here).
  'c49573414-CW4mWVDA.js#Ue': { name: 'ChatFeedbackForm', from: OWN,
    features: ['byConversationModel: s,', 'ratingSurface: c,', 'formTexts: r,', 'formKey: t,', 'onSubmit: a,', '(a?.(e), ze(e, u));', 'r?.texts.get(t)',
      'initialFeedbackInput: e,', 'onKeepFeedbackInput: y,', 'n(\n                          Le.Component,'] },
  // 3.6556.2 shared-4 Wv: the server's overload pacing for Retry.
  'shared-4-C_EiQb9h.js#X_': { name: 'useRetryPacing', from: OWN,
    features: ['{ overloaded: n, secondsRemaining: r } = nd(e),', '{ overloaded: n, pacedLabel: i }'] },
  // 3.6556.2 shared-2 i8: the UserMessage compound whose `.RetryAction` ev reads (answered with working-line-v4 m7).
  'shared-3-IQTrO7Gx.js#Bd': { name: 'ChatMessageRetryParts', from: null,
    features: ['var Bd = Object.assign(zd, {', 'Actions: Ts,', 'RetryAction: Ts.RetryAction,', 'PositiveFeedbackAction: Ts.PositiveFeedbackAction,'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  // H9's claude.ai hooks (3.6556.2 ca2ef848d Gz / aB / oB / Nae and the shared reads U9 makes): a plain local chat.
  'ca2ef848d-DA54buzo.js#KB': { name: 'useChatConversationStale', from: OWN,
    features: ['{ fetch: n, held: r } = t,', '[u, d] = $v(e, WB),', '[f, p] = $v(e, GB),', 'stale: L,', 'pendingAccessRequests: R,'] },
  'ca2ef848d-DA54buzo.js#vV': { name: 'useStaleBannerMessages', from: OWN, features: ['tl(e.messages, "ea9v3k") && tl(e.messages, "wxq794")'] },
  'ca2ef848d-DA54buzo.js#yV': { name: 'ChatStaleSharedBanner', from: OWN, features: ['{ conversationUuid: t } = e,', '{ updateSharedChat: r, busy: i } = fV(t),'] },
  'ca2ef848d-DA54buzo.js#xle': { name: 'ChatQuestionKeyHint', from: OWN, features: ['yS()'] },
  'shared-33-DtdykY0y.js#VI': { name: 'useChatQuestionCard', from: OWN, features: ['return C(zI);'] },
  'shared-36-fqRFYwOb.js#QD': { name: 'useChatSettingsPanel', from: OWN, features: ['e = C(XD),', 't = C(ZD);', '{ ...e, ...t }'] },
  'shared-7-D2e77H6v.js#HF': { name: 'useChatComposerLayout', from: null, features: ['return N(BF);'] },
  'shared-36-fqRFYwOb.js#lC': { name: 'useIncognitoChat', from: OWN, features: ['let { isLocalAgentRoute: e } = du(),', 'return !e && t;'] },
  'shared-123-1Hc1RTKl.js#zS': { name: 'useIsLocalAgentModeContext', from: OWN, features: ['Qy().considerEnabledForNonUI ?? !1,', 'n === "cowork"', 'e.isLocalAgentModeContext'] },
  'shared-123-1Hc1RTKl.js#NS': { name: 'useAgentRoute', from: OWN, features: ['MS(jS(e.pathname), t, n)', 'e.agentRouteType'] },
  'shared-212-BHMAi0oa.js#xC': { name: 'useChatRoute', from: OWN, features: ['return T(gC);'] },
  'shared-212-BHMAi0oa.js#dB': { name: 'useIncognitoMemoryNotice', from: OWN, features: ['n = qz().isAvailable;', 'Ta.orgMemory', 'Ta.orgNoMemory', 'Ta.memory', 'Ta.noMemory'] },
  'shared-5-u8kha2eH.js#uJ': { name: 'useCanGiveChatFeedback', from: OWN, features: ['let e = cJ(),', 't = lJ();', 'return e && t;'] },
  'shared-5-u8kha2eH.js#gJ': { name: 'useOpenChatFeedback', from: OWN, features: ['e = uJ(),', 't = sJ(_J);', 'e && t(n);'] },
  'shared-25-D-aF0gt9.js#Ky': { name: 'ChatDisclaimerLink', from: OWN, features: ['href: t,', 'replace: a,', 'scroll: s,', 'prefetch: r,', 'onClick: n,', 'target: c,', 'ref: i,'] },
  // shared-6 k_'s claude.ai reads (3.6556.2 shared-6 iT's): no server message tree, conversation query or feedback mutation
  // (the rating and its details go to the host through onMessageFeedback), no artifacts or files on a local message.
  'shared-31-C9BqSSuD.js#Jm': { name: 'useChatClientFlag', from: OWN, features: ['return T(qm)[e] === !0;'] },
  'shared-153-DMw2VzSq.js#Ny': { name: 'useChatConversationQuery', from: OWN, features: ['suppressError: n,', 'enabled: r,', 'returnDanglingHumanMessage: i,', 'refetchOnMount: a,'] },
  'shared-153-DMw2VzSq.js#YJ': { name: 'useChatConversationMessage', from: OWN, features: ['n.getConversationMessages(e).find(t)'] },
  'shared-153-DMw2VzSq.js#bx': { name: 'useSubmitChatFeedback', from: OWN, features: ['preview_feature_uses_artifacts', '({ chatBackend: u, refetchConversation: f, ...d } = i),'] },
  'shared-153-DMw2VzSq.js#Ep': { name: 'useChatConversationSettings', from: OWN, features: ['let e = D(Tp);', 'return e === void 0 ? null : e;'] },
  'shared-212-BHMAi0oa.js#qz': { name: 'useChatMemoryAvailability', from: OWN, features: ['return Jz(rz());'] },
  'shared-212-BHMAi0oa.js#dz': { name: 'useChatMemoryMode', from: OWN, features: ['H("melange_enabled_for_chat")', 'W("claudified_melange_memory_migration_v2")'] },
  'shared-33-DtdykY0y.js#nq': { name: 'useMessageArtifactKind', from: OWN, features: ['{ activeOrganization: n } = Wn(),', 'type_slug'] },
  'shared-153-DMw2VzSq.js#ST': { name: 'chatMessageArtifacts', from: OWN, features: ['i.messageUuid === e.uuid &&', 'i.createdAt === e.created_at &&'] },
  'shared-153-DMw2VzSq.js#yW': { name: 'chatMessageFiles', from: OWN, features: ['serverFileUuid: e.serverFileUuid ?? (t ? void 0 : e.file_uuid),'] },
  'shared-123-1Hc1RTKl.js#Fm': { name: 'chatBackendVariant', from: OWN, features: ['return _m === "c1" || _m === "c2" ? _m : void 0;'] },
  // Vj's markdown renderer, react-markdown's Markdown (vendor-markdown c = ho); the host's react-markdown package is the
  // same library.
  'vendor-markdown-CoTLcoVs.js#ho': { name: 'ChatWarningMarkdown', from: OWN, features: ['return vo(t.runSync(t.parse(n), n), e);'] },
  // chat-conversation r3-02: Zce's s$ (footer dots) warms the clay activity sprites on mount (shared-33 KH = `PH(() => void
  // WH())`, an idle-time dynamic import of the sprite sheets). working-line-v4 holds the sprite players (SU) the dots draw;
  // the warm-up is a load-time hint only, answered by the host.
  'shared-33-DtdykY0y.js#KH': { name: 'preloadChatActivitySprites', from: null, features: ['return PH(() => void WH());'] },
  // W$'s mount effect K$ → shared-100 _r (export Pt): at idle time, warm the CDS spark sprites (gr: `Bg() ? resolve :
  // sM()`, shared-frame's reduced-motion probe and sprite loader, neither published by cds-core). CdsAnimatedSpark (dM)
  // loads the same sprites itself (lM's effect calls sM()), so the warm-up is a load-time hint only, answered by the host.
  'shared-100-BBQR7Gmd.js#_r': { name: 'preloadChatSparkSprites', from: null,
    features: ['let e = () => void gr();', 'typeof requestIdleCallback == "function"', 'requestIdleCallback(e, { timeout: 2e3 })', ': setTimeout(e, 2e3);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'c49573414-CW4mWVDA.js#qe': '229cd1de20a208b16ac4136633ce3cf42c4d12875eebae43f03eebb230aa13f3',
  'c49573414-CW4mWVDA.js#Ue': '8ada679ea42821083697c05325f6aa95b9a611876de450cbdba8f7a71c1fe085',
  'shared-4-C_EiQb9h.js#X_': '9e086f5e5d95b703048bef9a32fdd2dd94e7d1ddad9468ca290c5872aa7dedda',
  'shared-3-IQTrO7Gx.js#Bd': '3a400b7a657a5f15a2ce2000a499a531ce38b5731e68e687872eb7fd32454647',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'ca2ef848d-DA54buzo.js#KB': '61d0f6b0736c26d148d17904d6a7e5c47bc15c0324547d5dee4635ef5ac9da85',
  'ca2ef848d-DA54buzo.js#vV': '5321de1423766a5976542792a488fd264744cd1630bc373ba661ec1f5ccf5b6d',
  'ca2ef848d-DA54buzo.js#yV': '174dbcc6d71642646d62d8bdca4dea3444de0d71285fc9af88bcf3489cb91c61',
  'ca2ef848d-DA54buzo.js#xle': '60d55e45ca28fed0582841ba6d3693a62f0cf54128a0de89577eb1eac9bfaa5a',
  'shared-33-DtdykY0y.js#VI': '84511ff2ae2274f9c21bb788ecb8541d615c3cf5122bb3fe9677ab037afdfce2',
  'shared-36-fqRFYwOb.js#QD': '8fa37b6bfa9a1cf44cf7ebf9a99e29279a32d75ecbc2f1275ea7cb27b160cba4',
  'shared-7-D2e77H6v.js#HF': '207e89574bd9d992b8f331d26b19ac26681e827012d85bf96f4b0953343e3a33',
  'shared-36-fqRFYwOb.js#lC': 'e2f5a25fdc5d92068efa31f65dab0128f313d6623ba998199d7d3e3edf0982ba',
  'shared-123-1Hc1RTKl.js#zS': '4dd107d7b80d8760f79d3de0791b0721f48fd02825ac94137259938591faa549',
  'shared-123-1Hc1RTKl.js#NS': '1d6a2db05af914b5af8bf0986beb6457762b283fab00a1113afacc89ff839143',
  'shared-212-BHMAi0oa.js#xC': 'd63d76bb2d6a5596c05a63cb01ced711325785c383a810a8777f841fbef82a5d',
  'shared-212-BHMAi0oa.js#dB': '7affc388c6647f0ee30c425f83211803c69e1717c1fe1985d48bd4711edc14f8',
  'shared-5-u8kha2eH.js#uJ': '44946793e561138946a845d9d34fefa2fdfedc4e7d7132c9af84281b430da98d',
  'shared-5-u8kha2eH.js#gJ': '30bc2a469184ef525084f737ffb6c80ea149649ae1e0f8dbae844c0e5c7cbc4e',
  'shared-25-D-aF0gt9.js#Ky': '4884879fdd5f05cd45263c786ab487acc75ba4998798ae34e579b75402024130',
  'shared-31-C9BqSSuD.js#Jm': '2f6652b613dee4ff3af4fe067818447e3c3794a1d25f6444c2815a3964e71b77',
  'shared-153-DMw2VzSq.js#Ny': 'fabf96433a7436c08724bc887f686194a238dea125a4ea53abe58712a95e8ade',
  'shared-153-DMw2VzSq.js#YJ': '9a802187cea05b39fbade31e874ad1bc2916cd75b44b960b15c760d637988bb8',
  'shared-153-DMw2VzSq.js#bx': '34dc04e702afac7f404a8b06a89f726b931befa887043172971fc8a9a8ccc6e4',
  'shared-153-DMw2VzSq.js#Ep': '080b7fc9e7e8778296677accc9511caa4e06b8f79e9380689ccc8dc490ef3afc',
  'shared-212-BHMAi0oa.js#qz': '76a305bdb210c7f5949e38ae516b07d00b3783e6da6379f1a6cfe5696a7c7976',
  'shared-212-BHMAi0oa.js#dz': 'ebabe48ed51df9af11c276919c83a5e4405400173278d518208eda65d3625860',
  'shared-33-DtdykY0y.js#nq': 'd74993a35ba7010dd75c9740ba839c728550028ee54963042c694046f2f00533',
  'shared-153-DMw2VzSq.js#ST': '8906e70ba75335e778d18e2b7b63791cc27a463df2cfb45f4a1173beadc0135a',
  'shared-153-DMw2VzSq.js#yW': '5a4be3480166b4a04bd385754e2c76537cbc61e42300165f95ca54cf47f8e324',
  'shared-123-1Hc1RTKl.js#Fm': '64c0e106d278fab291feb7545e0cb285c1b22decadbd592c1cdde37198d7bc41',
  'vendor-markdown-CoTLcoVs.js#ho': '7c54d5b8ce16b5b6d65f10ed1e1ee7edb8580ce50a02e049cde0decb87e7aa85',
  'shared-33-DtdykY0y.js#KH': '2e70735b27f270a7dced3c0bab330d2128b6384f6734af007d616d755d6721f1',
  'shared-100-BBQR7Gmd.js#_r': '8e8dc6dc87fe0a00488909b7329d6a83f73840a3972d1557b687541ef76a6fd5',
};

// D1 (round2/plan.json chat-messages presentLinks / chunkOverlap): the modules of other 4.16336.0 graphs that hold a binding
// this closure reads; each is imported from there.
export const LINKED_AREAS = [
  { area: 'frame-sidebar-nav', modules: ['shared-26.mjs', 'shared-153.mjs', 'shared-33.mjs', 'shared-62.mjs', 'shared-92.mjs'] },
  { area: 'routines-shared-v4', modules: ['shared-25-D-aF0gt9.mjs'] },
  { area: 'working-line-v4', modules: ['shared-2.mjs', 'activity-sprites.mjs'] },
  { area: 'session-rail-kit-v4', modules: ['shared-38-DyF0_Fim.mjs'] },
];
// Pure bindings a linked module holds without exporting, cut again here (no module state).
const linkedCopies = {};

const SUPPORT = ['shared-frame-CJdE5Ria.js', 'shared-0-CnnWnVrT.js', 'shared-26-B-POtn5S.js', 'shared-183-B2N6Zy4J.js', 'shared-8-BqfCbkJd.js',
  'shared-33-DtdykY0y.js', 'shared-3-IQTrO7Gx.js', 'shared-38-DyF0_Fim.js'];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...SUPPORT.map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): where the official app renders the roots.
const rawCallSites = [
  { source: ROW, role: 'The assistant message row draws the feedback pair with CDS presets outside a local agent route (c49573414 c = rt)',
    features: ['Q.showFeedback&&(Q.isLocalAgentRoute?m(og,{message:S}):m(ig,{conversationUuid:t.conversationUuid,message:S,agentMode:Q.isAgentMode,cdsPresets:!0}))',
      'import{S as rg,c as ig,i as ag,s as og}from"./c49573414-CW4mWVDA.js"'] },
  { source: ROW, role: 'The row draws Retry (shared-4 Ui = Q_) and the version selector after it',
    features: ['m(om,{"data-testid":"action-bar-retry",blocked:st,blockedReason:Q.orgSendBlockedReason,onRetry:', 'Ui as om',
      'm(xM,{message:S,changeDisplayedConversationPath:t.changeDisplayedConversationPath})'] },
  { source: ROW, role: 'The toolbar inset class and the human-message warning', features: [
    'className:p("ms-[calc(var(--msg-text-inset,0.5rem)_-_6px)] touch:ms-[calc(var(--msg-text-inset,0.5rem)_-_0.625rem*var(--cds-rem-scale,1))]","-mt-1"',
    'm(Vj,{showWebSearchNudge:S,showDriveImagesWarning:o})', 'pick:e=>e.MessageContextMenu'] },
  { source: RETRY, role: 'Q_ (export Ui) renders ev without a quota hold when no quota store is mounted',
    features: ['function Q_(e){return Rn()===null?y(ev,{...e,quotaHoldReason:void 0}):y($_,{...e})}', 'Q_ as Ui'] },
  { source: FEEDBACK, role: 'The details form outside the early-access model renders shared-6 Da (k_)',
    features: ['n(ce,{...o,initialFeedbackInput:e,onKeepFeedbackInput:y,onSubmit:d},t)', 'Da as ce'] },
  { source: PAGE, role: 'The Chat page renders the disclaimer under the transcript',
    features: ['u(H9,{conversationUuid:t,isTemporary:De,incognitoString:Mt,hasWebSearchResponse:!!ho,isMcpAppFullscreen:At,concealed:qa})'] },
  { source: ROW, role: 'chat-conversation r2-02: JY (classic layout) draws the assistant message as kw (c7dd2633f N = re) around its sr-only h3 and jw (P = y)',
    features: ['_(kw,{"data-testid":"assistant-message","data-is-streaming":Tn,className:p("relative",!ie&&!(ae&&!i&&!In)&&"pb-[var(--msg-assistant-pb,0.75rem)]",q&&"message-fade-up")',
      'm("h3",{"data-find-omitted":"",className:"sr-only select-none","aria-hidden":!At||void 0,children:At}),m(jw,{id:Sn,ref:Lt,stackBlocks:wn,children:m(MP.Provider,{value:sn,children:Qt})}),Mn,Pn]',
      'N as kw', 'P as jw'] },
  { source: PAGE, role: 'chat-conversation r3-01: uL draws the jump-to-latest control (cf854d0e8 t = JO) in its `relative h-0` holder above the composer; Yle passes no working mark while turnStatusOwnsSpark is off',
    features: ['u(JO,{visible:L,onClick:D,isStreaming:d,workingMark:r,placementClassName:"bottom-5 -translate-y-[var(--composer-banners-h,0px)]"})',
      'import{t as JO}from"./cf854d0e8-YPmDYG3q.js"', 'r=Jd("turnStatusOwnsSpark"),i=n&&r?zP:void 0'] },
  { source: PAGE, role: 'chat-conversation r3-02: ele draws Zce as chat-footer-spark in the chat-footer-row (mt-6 when no status row) unless the turn status owns the spark',
    features: ['ye?null:st("chat-footer-spark",Ye?"idle":ue,Qe,Ve)', '"data-testid":"chat-footer-row",className:gt', 'mt=et?"mt-1":"mt-6"',
      'l(pt,"ms-[calc(var(--msg-text-inset,0.5rem)_-_0.25rem)] items-center transition-transform duration-300 ease-out",mt,ht)',
      'ge=Jd("turnStatusOwnsSpark"),_e=he&&ge&&!le'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// The parts the roots reach: each a declaration of its chunk carrying its features.
async function checkInner(cache) {
  const out = [];
  for (const [key, features] of Object.entries(INNER)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`inner ${key} is not a declaration`);
    assertFeatures(`inner ${key}`, await featureText(src, entry), features);
    out.push({ key, sha256: sha(rawText(src, entry)) });
  }
  return out;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin === undefined) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module answers exactly the adapted names: each re-exported from the host adapter that documents it,
// or (from: null) defined in the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:function|const) (\w+)/gm)) exported.set(m[1], null);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (!exported.has(name) || exported.get(name) !== from)
    throw Error(`${ADAPTER_FILE}: ${name} is not ${from ? `re-exported from ${from}` : 'defined here'}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (!from) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-messages-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function chatMessagesV4Config() {
  return {
    name: 'chat messages (4.16336.0)', generator: 'extract-chat-messages-v4.mjs', output: path.join(root, CHAT_MESSAGES_V4_OUTPUT),
    adapterModule: '../../source-chat-messages-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = chatMessagesV4Config;

export async function extractChatMessagesV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const inner = await checkInner(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const { area } of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...chatMessagesV4Config(),
    async artifacts(m) {
      for (const key of Object.keys(INNER)) {
        const [file, local] = key.split('#');
        if (!m.modules.some(mod => mod.source === file && mod.bindings.some(b => b.name === local))) throw Error(`inner ${key} is no longer reached`);
      }
      return {
        'index.mjs': `// Semantic names for the chat message roots (${official.referenceVersion}); generated by extract-chat-messages-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-messages-v4.mjs',
          previous: { generator: 'scripts/extract-chat-messages.mjs', output: 'src/generated/chat-messages', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, inner, adapters, linkedCopies,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const cache = new Map();
    for (const f of await locateRoots(cache)) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const i of await checkInner(cache)) console.log('inner', i.key, i.sha256);
    for (const a of await pinAdapters(cache)) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractChatMessagesV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
