// w13-chatui-message-actions (research/w13-chatui.md chatui-C2/C5/C6/C7/C8/C18, plan-w13.md "w13-chatui-message-actions"):
// extract the 3.6556.2 Chat message-row parts the desktop Chat conversation draws under an assistant reply and around
// the transcript, so Chat stops borrowing the Code turn footer. Own generator, own output folder
// src/generated/chat-messages, own scripts/verify-gen-chat-messages.mjs (D0). Nothing here executes desktop runtime code.
//
//   cc1aae219 r1   the assistant message row. Its toolbar is `h(Dc, { "data-testid": "message-actions", className:
//                  p(n1, "-mt-1", …), children: S })` with S = [Dc.CopyAction "action-bar-copy", Q$ (null), WF feedback
//                  (`cdsPresets: !0` outside a local agent route), yF branch task, Ia "action-bar-retry", lI version
//                  selector, …]. r1 itself (1300 lines over the claude.ai conversation store) is not sliced; the host
//                  composes the same toolbar from the parts below (source-chat-message-actions.jsx).
//   cc1aae219 n1   the toolbar's inline-start inset class.
//   cc1aae219 WF   (export si) = M(UF): Good response / Bad response through Dc.PositiveFeedbackAction /
//                  NegativeFeedbackAction (`${testIdPrefix ?? "action-bar"}-thumbs-up|down`), pressed from
//                  message.chat_feedback.type; MF (analytics) and OF (the details form) are host adapters; OF draws
//                  shared-6 iT (rs), generated here too (w13-close-chat-messages).
//   shared-4 Jv    the Retry action Ia (shared-4 Kv → Jv without a quota hold): RetryAction labelled "Retry" (or the
//                  blocked reason), aria-disabled while paced; Wv (overload pacing) is a host adapter.
//   c79f7d2ef w    (export MessageContextMenu) the right-click menu over a message selection: one menuitem, "Reply" or
//                  "Attach as context" with ArrowBendUpLeft, portalled into the container and clamped to its window.
//   ca2ef848d U9   the disclaimer under the conversation ("Claude is AI and can make mistakes. Please double-check
//                  responses." linking the support article); its claude.ai hooks are host adapters.
//
// Imports resolve, in this order, to: a vendor-frame React alias (official.reactAliases, checked by assertVendorAlias),
// a view-tabs public name by its official file and export alias (compiler helpers and CDS parts, E3/R3), a host
// adapter of this graph (src/source-chat-messages-adapters.jsx; its original declaration must carry `features`), a host
// adapter routines-shared already answers the same binding with (vendor-intl useIntl / FormattedMessage), a binding a
// linked 3.6556.2 graph holds and exports (D1: working-line shared-2 R6, the MessageActions compound), or a module
// emitted earlier here. Anything else stops generation. Features are matched through looseFeature() (R2/E5).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const { referenceVersion, referenceSnapshot, ionSource: source, looseFeature } = official;
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/chat-messages');
const adapterModule = '../../source-chat-messages-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Math', 'document', 'Map', 'Set', 'Symbol', 'clearTimeout', 'setTimeout', 'RegExp', 'WeakMap']); // WeakMap: shared-5 dP's sP
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
// `byExport` names roots by the chunk's export alias; `internal: true` allows roots the chunk does not export.
// `adapters`: same-chunk original local -> { name, features } answered by the host adapter module (features on the
// prettier-formatted declaration).
const modules = [
  { target: 'feedback-type.mjs', source: 'shared-0-DDOOdL6P.js',
    byExport: { Ji: 'ChatFeedbackType', mS: 'NEW_HUMAN_MESSAGE_PREFIX', pS: 'NEW_ASSISTANT_MESSAGE_PREFIX' },
    features: { Ji: ['e.UPVOTE = "upvote"', 'e.FLAG = "flag"', 'e.FLAG_BUG = "flag/bug"'],
      mS: ['"new-human-message-uuid"'], pS: ['"new-assistant-message-uuid"'] } },
  { target: 'message-uuid.mjs', source: 'shared-130-dWztbTO1.js', byExport: { Bb: 'serverMessageUuid' },
    features: { Bb: ['e.startsWith("new-assistant-message-uuid-")', 'e.startsWith("new-human-message-uuid-")'] } },
  { target: 'composer-lock.mjs', source: 'shared-26-CGuBxVt9.js',
    byExport: { Qn: 'useComposerLock', Zn: 'useLockedLabel', Xn: 'lockedLabel' },
    features: { Qn: ['return _(bF);'], Zn: ['t = Ki(),', 'n = CF();'], Xn: ['defaultMessage: "{label}: {reason}"', 'id: "3bWl9QCEK/"'] },
    adapters: {
      // Why the composer is locked (voice session, earlier version, pending approval, page tools); undefined while the
      // lock context keeps its default `{ locked: !1 }`, which nothing in the host provides.
      CF: { name: 'useComposerLockReason', features: ['{ locked: t, reasonKind: n } = xF(),', 'if (t)', 'n === "voiceSessionActive"',
        'defaultMessage: "Respond to the prompt above to continue"'] } } },
  { target: 'user-message-row.mjs', source: 'shared-2-TF8v67kg.js', byExport: { $: 'useUserMessageRow' },
    features: { $: ['return x(z8);'] } },
  { target: 'retry-action.mjs', source: 'shared-4-DUB1Oi0O.js', internal: true,
    exports: { Jv: 'ChatRetryAction' },
    features: { Jv: ['{ blocked: t, blockedReason: n, onRetry: i, className: r, quotaHoldReason: a, ...o }',
      's.formatMessage({ defaultMessage: "Retry", id: "62nsdyMyIO" })', 'W("aria-disabled:opacity-disabled", r)',
      'S(d.RetryAction, { ...o, className: f, disabled: t, "aria-disabled": p, label: m, onClick: h'] },
    adapters: {
      // Overload pacing (`{ overloaded, pacedLabel }` from the model's server-side retry pacing).
      Wv: { name: 'useRetryPacing', features: ['{ overloaded: c, secondsRemaining: l } = wo(e, s)', '{ overloaded: c, pacedLabel: u }'] } } },
  { target: 'feedback.mjs', source: 'cc1aae219-CeSwM-tp.js', internal: true,
    exports: { WF: 'ChatMessageFeedback', n1: 'MESSAGE_ACTIONS_INSET' },
    features: {
      WF: ['WF = M(UF)'],
      n1: ['"ms-[calc(var(--msg-text-inset,0.5rem)_-_0.375rem)]"'] },
    adapters: {
      // claudeai.message.feedback_clicked analytics; the host records the rating locally instead (never uploaded).
      MF: { name: 'useChatFeedbackRecorder', features: ['event_key: "claudeai.message.feedback_clicked"', 'rating: n.rating',
        'rating_surface: n.ratingSurface'] },
      // The details form (rs, or the early-access modal SF) the thumbs open; the host renders rs (shared-6 iT, generated
      // below as feedback-form.mjs) and stores what it submits (w13-close-chat-messages).
      OF: { name: 'ChatFeedbackForm', features: ['byConversationModel: a,', 'ratingSurface: o,', 'formTexts: n,', 'formKey: t,',
        'wF(e, c)'] } } },
  // w13-chatfn-tools (the review's 补做, research/w13-chatfn.md C9): eP, the warning under a human message (rP: a message
  // with a link while web search is off — `S=i===!0&&!l&&!u` — shows "Turn on web search in Search and tools menu. …"
  // uUjlNFGg26 as the message-warning banner). rP itself reads the claude.ai message store; the host computes its three
  // inputs (src/chat-tools-model.mjs webSearchNudge) and renders eP.
  // shared-130 Gq: a text's { hasCodeBlock, hasWebLink } (fenced code and inline code / images stripped, then a bare URL,
  // www. host or markdown link) — the assistant reply's hasLink rP / fP read through tJ / eJ (a human message never has one).
  { target: 'message-links.mjs', source: 'shared-130-dWztbTO1.js', internal: true,
    exports: { Gq: 'messageTextFeatures' },
    features: { Gq: ['{ hasCodeBlock: t, hasWebLink: n } = Wq(e, null);', 'return { hasCodeBlock: t, hasWebLink: n };'] } },
  // shared-9 P (bO): a class unless the surrounding context (_O, a boolean createContext) drops it — CN's margin for eP.
  { target: 'context-class.mjs', source: 'shared-9-CM21XrJw.js', byExport: { P: 'classUnlessContext' },
    features: { P: ['return yO() ? void 0 : e;'] } },
  { target: 'message-warning.mjs', source: 'cc1aae219-CeSwM-tp.js', internal: true,
    exports: { eP: 'ChatMessageWarning' }, inner: [],
    features: { eP: ['showWebSearchNudge: t,', 'showDriveImagesWarning: n,', 'id: "uUjlNFGg26"', '"data-testid": "message-warning"', 'components: SN'] } },
  // w13-close-gen-dedup (chatfn-branches-05, D1): lI, the version selector r1 draws after Retry
  // (`Y.showOptionSelector&&t.changeDisplayedConversationPath&&h(lI,{message:x,changeDisplayedConversationPath:…})`), and the
  // user message row's; the host passes { selectedOption, nOptions, sender } from src/chat-branches-model.mjs.
  { target: 'version-selector.mjs', source: 'cc1aae219-CeSwM-tp.js', internal: true,
    exports: { lI: 'ChatVersionSelector' }, inner: [],
    features: { lI: ['r = (t.selectedOption ?? 0) + 1,', 'i = t.nOptions ?? 0,', 's = t.sender === "human",',
      '"user-message-previous-version" : "action-bar-previous-version"', '"user-message-next-version" : "action-bar-next-version"',
      'defaultMessage: "Previous version", id: "nZObrEhD3u"', 'defaultMessage: "Next version", id: "vfItgW2tkJ"',
      'defaultMessage: "{selectedOption} / {totalOptions}",', 'className: "!text-muted-as-secondary hover:!text-primary !w-6",',
      '"self-center shrink-0 select-none font-small text-muted-as-secondary"', 'className: "inline-flex items-center gap-1"'] } },
  { target: 'disclaimer-classes.mjs', source: 'shared-8-Db1QN4mf.js', byExport: { n: 'DISCLAIMER_PLACEMENT_CLASSES' },
    features: { n: ['cowork: "text-muted-as-secondary text-end [&_a]:text-inherit [&_:is(button,a):last-child:not(:first-child)]:ms-4"', 'besideControls: "text-muted-as-secondary [&_a]:text-inherit text-start @[24rem]:ps-md"', 'centred: "text-muted-as-secondary [&_a]:text-inherit text-center"'] } },
  { target: 'disclaimer.mjs', source: 'ca2ef848d-ChLvq6yZ.js', internal: true,
    exports: { U9: 'ChatDisclaimer' },
    features: { U9: ['inline: o,', 'incognitoString: r,', 'hasWebSearchResponse: i,', 'isMcpAppFullscreen: a,',
      '"pointer-events-auto relative z-0 -mt-10 bg-surface-1 pb-2 pt-12 text-center text-xs text-muted-as-secondary"',
      '"https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on"',
      'defaultMessage: "Claude is AI and can make mistakes. Please double-check responses."', 'id: "Hz3uf5n9Ga"',
      'defaultMessage: "Claude is AI and can make mistakes. Please double-check cited sources."', 'id: "FGmLea0H7Z"',
      'className: "hover:text-secondary transition"', 'role: "note",', '"data-disclaimer": !0'] },
    adapters: {
      // The stale-conversation probe (a newer server copy of this chat); a local chat is never behind a server copy.
      Gz: { name: 'useChatConversationStale', features: ['{ fetch: n, held: r } = t,', 'Iy(e, Uz)', 'Iy(e, Wz)'] },
      // Whether the stale banner's two strings ("ea9v3k", "wxq794") are in the loaded catalog.
      aB: { name: 'useStaleBannerMessages', features: ['oa(e.messages, "ea9v3k")', 'oa(e.messages, "wxq794")'] },
      // The stale shared-chat banner (Update shared chat); there is no shared chat here.
      oB: { name: 'ChatStaleSharedBanner', features: ['{ updateSharedChat: r, busy: i } = $z(t),', 'defaultMessage: "Sharing isn\\u2019t available."'] },
      // The question-card key hints (a claude.ai elicitation in the composer); none here.
      Nae: { name: 'ChatQuestionKeyHint', features: ['{ data: n, currentQuestionIndex: r } = Bf(),', 'i?.type === "multi_select"', 'defaultMessage: "{submit} to send"'] } } },
  { target: 'context-menu.mjs', source: 'c79f7d2ef-Dx3psRYW.js', byExport: { MessageContextMenu: 'MessageContextMenu' },
    features: { MessageContextMenu: ['w = s(S)'] } },
  // w13-close-chat-messages (chatui-message-actions-02): the details form the thumbs open. cc1aae219 OF renders, outside
  // the early-access model, `h(rs, { ...i, initialFeedbackInput: e, onKeepFeedbackInput: v, onSubmit: l }, t)` — rs is
  // shared-6 iT (export Hs): the CDS Dialog "Give positive / negative feedback" with the optional issue type (Select)
  // and details (TextArea), Cancel / Submit. Its pieces from shared-5 (the field's text direction dP / lP, the
  // artifact issue types ER) and shared-0 (the content-report form link zR) come first; shared-5 $L (dialog presence)
  // and shared-0 ve (useEvent) are linked from the graphs that already hold them (D1).
  { target: 'feedback-form-parts.mjs', source: 'shared-5-Bg6ZMqvt.js',
    byExport: { Fn: 'syncTextDirection', Nn: 'TEXT_DIRECTION_CLASSES', w: 'artifactFeedbackOptions' },
    features: { Fn: ['sP.set(e, { dir: t, paragraphs: n })', 'e.dataset.firstLetterDir = n'],
      Nn: ['"[&[dir=ltr][data-first-letter-dir=ltr]]:[unicode-bidi:plaintext] [&[dir=rtl][data-first-letter-dir=rtl]]:[unicode-bidi:plaintext]"'],
      w: ['if (t === void 0) return [];', 'defaultMessage: "Took too long"', 'id: "9XjnizZDac"', 't === "design"'] } },
  { target: 'content-report-link.mjs', source: 'shared-0-DDOOdL6P.js', byExport: { ou: 'CONTENT_REPORT_FORM_URL' },
    features: { ou: ['"https://claude.com/form/anthropic-content-reporting"'] } },
  { target: 'feedback-form.mjs', source: 'shared-6-sd9jbJqs.js', byExport: { Hs: 'ChatFeedbackDialog' },
    features: { Hs: ['requestedFeedbackType: r,', 'setRequestedFeedbackType: i,', 'onMessageFeedback: d,', 'initialFeedbackInput: h,',
      'onKeepFeedbackInput: g,', 'defaultMessage: "Give positive feedback"', 'id: "3eBGtYvhrI"', 'defaultMessage: "Give negative feedback"',
      'id: "jOz9SoiS5x"', 'defaultMessage: "Please provide details: (optional)"', 'defaultMessage: "What type of issue do you wish to report? (optional)"',
      'defaultMessage: "Submit"', 'className: "mt-4 flex flex-col"', 'b(ne.Popup, { size: "md", initialFocus: Ge, children: [Ke, qe, q] })'] } },
];
// Feature checks on roots reached through `byExport` whose declaration is a tiny wrapper (`w = s(S)`) also check the
// wrapped declaration, so a reused minified name cannot pass.
const innerFeatures = {
  'c79f7d2ef-Dx3psRYW.js#S': ['{ x: i, y: s, container: d, onAttach: g, onClose: v, asReply: y } = r,', 'role: "menuitem",',
    'defaultMessage: "Attach as context"', 'defaultMessage: "Reply"', 'name: "ArrowBendUpLeft"',
    '"min-w-[200px] rounded-lg border bg-surface-3 shadow-lg py-1"'],
  'cc1aae219-CeSwM-tp.js#UF': ['v = s === void 0 ? "action-bar" : s,', 'Dc.PositiveFeedbackAction', 'Dc.NegativeFeedbackAction',
    '"data-testid": `${v}-thumbs-up`', 'defaultMessage: "Good response"', 'defaultMessage: "Bad response"',
    'n.chat_feedback?.type'],
};
// Imports another chunk declares that the host answers: original chunk#local -> { name, features } (features on the
// original declaration's raw text through looseFeature).
const importAdapters = {
  // ca2ef848d U9's claude.ai hooks (no account, a plain chat that is not a local agent route, not incognito):
  'shared-5-Bg6ZMqvt.js#Cj': { name: 'useChatQuestionCard', features: ['function Cj(){return A(xj)}'] },
  'shared-7-DBAgAi5H.js#fI': { name: 'useChatSettingsPanel', features: ['e=O(uI),t=O(dI)', '{...e,...t}'] },
  'shared-7-DBAgAi5H.js#bC': { name: 'useChatComposerLayout', features: ['function bC(){return O(vC)}'] },
  'shared-7-DBAgAi5H.js#AM': { name: 'useIncognitoChat', features: ['{isLocalAgentRoute:e}=dm()', 'return!e&&t'] },
  'shared-78-D5Fw2h0a.js#QE': { name: 'useIsLocalAgentModeContext', features: ['considerEnabledForNonUI??!1', 'n==="cowork"', 'e.isLocalAgentModeContext'] },
  'shared-78-D5Fw2h0a.js#KE': { name: 'useAgentRoute', features: ['GE(WE(e.pathname),t,n)', 'e.agentRouteType'] },
  'shared-182-BI1KJccu.js#Pj': { name: 'useChatRoute', features: ['function Pj(){return S(kj)}'] },
  'shared-182-BI1KJccu.js#kA': { name: 'useIncognitoMemoryNotice', features: ['pa.orgMemory', 'pa.orgNoMemory', 'pa.memory', 'pa.noMemory'] },
  'shared-15-BvlV43cI.js#To': { name: 'useCanGiveChatFeedback', features: ['function To(){let e=Co(),t=wo();return e&&t}'] },
  'shared-15-BvlV43cI.js#Eo': { name: 'useOpenChatFeedback', features: ['e=To(),t=So(Do)', 'e&&t(n)'] },
  'shared-8-Db1QN4mf.js#TZ': { name: 'useModelControlsInChin', features: ['{modelControlsInChin:t}=k(cm)', 't??e==="bottom"'] },
  'shared-25-DOWZRSlq.js#Cx': { name: 'ChatDisclaimerLink', features: ['href:t,replace:a,scroll:s,prefetch:r,onClick:n,target:c,ref:i'] },
  // w13-chatfn-tools: eP's markdown renderer, react-markdown's Markdown (vendor-markdown s = wo); the host's
  // react-markdown package is the same library (main.jsx / source-chat-markdown.jsx use it).
  'vendor-markdown-CTRWgQFt.js#wo': { name: 'ChatWarningMarkdown', features: ['let t=To(e),n=Eo(e);return Do(t.runSync(t.parse(n),n),e)'] },
  // w13-close-chat-messages: shared-6 iT's claude.ai reads, answered for a local chat (no account, no server message tree,
  // no conversation query or feedback mutation: the rating and its details go to the host through onMessageFeedback).
  'shared-25-DOWZRSlq.js#eV': { name: 'useAccountPlan', features: ['e?"raven":t?"claude_pro":n?"claude_max":"free"'] },
  'shared-25-DOWZRSlq.js#VB': { name: 'useChatAccount', features: ['VB=()=>v(kz)'] },
  'shared-4-DUB1Oi0O.js#DS': { name: 'useChatClientFlag', features: ['function DS(e){return j(ES)[e]===!0}'] },
  'shared-78-D5Fw2h0a.js#V': { name: 'useChatFeatureAvailability', features: ['function V(e){return th[e].useAvailable()}'] },
  'shared-78-D5Fw2h0a.js#D_': { name: 'chatBackendVariant', features: ['l_==="c1"||l_==="c2"?l_:void 0'] },
  'shared-182-BI1KJccu.js#Rk': { name: 'useChatMemoryMode', features: ['L("melange_enabled_for_chat")', 'claudified_melange_memory_migration_v2'] },
  'shared-182-BI1KJccu.js#dA': { name: 'useChatMemoryAvailability', features: ['{settings:e,accessWith:t}=fA()'] },
  'shared-182-BI1KJccu.js#Cj': { name: 'ChatFeedbackFormSettings', features: ['Cj=T(xj)'] },
  'shared-130-dWztbTO1.js#Xh': { name: 'useChatConversationQuery', features: ['suppressError:n,enabled:r,returnDanglingHumanMessage:i,refetchOnMount:a'] },
  'shared-130-dWztbTO1.js#gu': { name: 'useChatConversationSettings', features: ['gu=()=>{let e=x(hu);return e===void 0?null:e}'] },
  'shared-130-dWztbTO1.js#YJ': { name: 'useChatConversationMessage', features: ['n.getConversationMessages(e).find(t)'] },
  'shared-130-dWztbTO1.js#L_': { name: 'useSubmitChatFeedback', features: ['preview_feature_uses_artifacts', '{chatBackend:u,refetchConversation:f,...d}=i'] },
  'shared-130-dWztbTO1.js#nW': { name: 'chatMessageFiles', features: ['serverFileUuid:e.serverFileUuid??e.file_uuid'] },
  'shared-130-dWztbTO1.js#LV': { name: 'isChatWebTool', features: ['function LV(e){return IV.has(e)}'] },
  'shared-104-CTONUSaz.js#NL': { name: 'chatMessageArtifacts', features: ['i.messageUuid===e.uuid&&i.createdAt===e.created_at'] },
  'shared-5-Bg6ZMqvt.js#iz': { name: 'useMessageArtifactKind', features: ['{activeOrganization:n}=un()', 'type_slug'] },
  // shared-2 i8 (UserMessage with its Actions statics): Jv reads only `.RetryAction`, which is R6.RetryAction.
  'shared-2-TF8v67kg.js#i8': { name: 'ChatMessageRetryParts', features: ['i8=Object.assign(r8,{', 'RetryAction:R6.RetryAction'] },
};
// Host adapters routines-shared already answers these bindings with (D1: one adapter per original binding).
const sharedAdapters = {
  'vendor-intl-DYfox5Co.js#q': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
  'vendor-intl-DYfox5Co.js#Gt': { graph: 'routines-shared', module: '../../source-routines-shared-adapters.jsx' },
};
// Bindings a linked 3.6556.2 graph holds and exports: original chunk#local -> graph directory.
const linkedBindings = {
  'shared-2-TF8v67kg.js#R6': 'working-line',
  // w13-close-chat-messages: shared-6 iT's dialog presence (shared-5 $L; shared-0 ve is view-tabs' useEventCallback).
  'shared-5-Bg6ZMqvt.js#$L': 'sidebar-sections',
};

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}
// A chunk read without formatting, for export tables and the raw text of one top-level declaration.
async function readRaw(name, cache) {
  const key = `raw:${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const declarations = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration') declarations.set(node.id.name, code.slice(node.start, node.end));
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (d.id.type === 'Identifier') declarations.set(d.id.name, code.slice(d.start, d.end));
  }
  const record = { name, bytes, code, exported, declarations };
  cache.set(key, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !looseFeature(f).test(text));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// local -> exported name of a generated module's `export { … }` lists.
async function moduleExports(file) {
  const text = await fs.readFile(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
const readManifest = async dir => JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));

export async function extractChatMessages({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const vendorText = (await readRaw(official.vendorFrame, cache)).code;
  official.assertCompilerHelpers((await readRaw(official.sharedFrame, cache)).code);
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  // official file:export alias -> view-tabs public name (compiler helpers and CDS parts alike).
  const viewTabsNames = new Map(Object.entries(viewTabs.publicNames ?? {}).filter(([, e]) => e.export).map(([name, e]) => [`${e.file}:${e.export}`, name]));
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-messages.mjs',
    adapterModule: 'src/source-chat-messages-adapters.jsx', modules: [], adapters: [], sharedAdapters: [], linked: [] };
  const adapterRecords = new Map();

  // An import specifier of `src` (file:alias) → { from, name, kind, original }.
  async function resolveImport(target, file, alias) {
    const via = `${file}:${alias}`;
    if (file === official.vendorFrame && !official.reactAliases[alias] && viewTabsNames.has(via))
      return { from: `../view-tabs/${file}`, name: viewTabsNames.get(via), kind: 'view-tabs', original: alias };
    if (file === official.vendorFrame) {
      const member = official.reactAliases[alias];
      if (!member || member[0] === 'react/compiler-runtime') throw Error(`${target}: no React alias for ${via}`);
      official.assertVendorAlias(vendorText, alias);
      return { from: member[0], name: member[1], kind: 'react', original: alias };
    }
    if (file === official.sharedFrame && official.compilerHelpers[alias]) {
      const helper = official.compilerHelpers[alias];
      const entry = viewTabs.publicNames?.[helper.name];
      if (entry?.file !== official.sharedFrame || entry.export !== alias) throw Error(`${target}: ${via} is not a view-tabs compiler helper`);
      return { from: `../view-tabs/${official.sharedFrame}`, name: helper.name, kind: 'view-tabs', original: helper.local };
    }
    if (viewTabsNames.has(via)) {
      const dep = await readRaw(file, cache);
      return { from: `../view-tabs/${file}`, name: viewTabsNames.get(via), kind: 'view-tabs', original: dep.exported.get(alias) ?? alias };
    }
    const dep = await readRaw(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${target}: ${via} is not exported`);
    const key = `${file}#${local}`;
    if (importAdapters[key]) {
      const { name, features } = importAdapters[key];
      const text = dep.declarations.get(local);
      if (!text) throw Error(`${target}: adapter original ${key} is not a top-level declaration`);
      assertFeatures(`${target}: adapter ${name} (${key})`, text, features);
      adapterRecords.set(key, { original: key, name, features });
      return { from: adapterModule, name, kind: 'adapter', original: local };
    }
    if (sharedAdapters[key]) {
      const { graph, module } = sharedAdapters[key];
      const linked = await readManifest(graph);
      const adapter = (linked.adapters ?? []).find(a => a.original === key);
      if (!adapter) throw Error(`${target}: ${graph} no longer answers ${key}`);
      if (!manifest.sharedAdapters.some(a => a.original === key)) manifest.sharedAdapters.push({ original: key, graph, name: adapter.name });
      return { from: module, name: adapter.name, kind: 'shared-adapter', original: local };
    }
    if (linkedBindings[key]) {
      const graph = linkedBindings[key];
      const linked = await readManifest(graph);
      if (linked.referenceVersion !== referenceVersion) throw Error(`${graph} is ${linked.referenceVersion}, expected ${referenceVersion}`);
      const mod = linked.modules.find(m => m.source === file && (m.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local));
      if (!mod) throw Error(`${target}: ${graph} no longer holds ${key}`);
      const exportName = (await moduleExports(path.join(root, 'src/generated', graph, mod.target))).get(local);
      if (!exportName) throw Error(`${target}: ${graph}/${mod.target} does not export ${local}`);
      if (!manifest.linked.some(l => l.original === key)) manifest.linked.push({ original: key, graph, target: mod.target, name: exportName });
      return { from: `../${graph}/${mod.target}`, name: exportName, kind: 'linked', original: local };
    }
    const owner = emitted.find(m => m.source === file && m.exports[local]);
    if (!owner) throw Error(`${target}: unresolved import ${via} (${local})`);
    return { from: `./${owner.target}`, name: owner.exports[local], kind: 'generated', original: local };
  }

  for (const raw of modules) {
    const src = await readSource(raw.source, cache);
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const spec = raw.byExport ? { ...raw,
      exports: Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])),
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([alias, list]) => [byLocal(alias), list])) } : raw;
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const adapter = spec.adapters?.[name];
      if (adapter) {
        if (p.isImportSpecifier()) throw Error(`${spec.target}: adapter ${name} is an import`);
        assertFeatures(`${spec.target}: adapter ${adapter.name} (${name})`, declarationText(src, p), adapter.features);
        const key = `${spec.source}#${name}`;
        adapterRecords.set(key, { original: key, name: adapter.name, features: adapter.features });
        imports.set(name, { from: adapterModule, name: adapter.name, via: key, kind: 'adapter', original: name });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
        imports.set(name, { ...await resolveImport(spec.target, file, alias), via: `${file}:${alias}` });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      const inner = innerFeatures[`${spec.source}#${name}`];
      if (inner) assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), inner);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.internal && ![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    // `inner`: the innerFeatures keys this module must reach (default: every key of its chunk).
    for (const key of spec.inner ?? Object.keys(innerFeatures))
      if (key.startsWith(`${spec.source}#`) && !selected.has(key.slice(spec.source.length + 1))) throw Error(`${spec.target}: ${key} is no longer reached`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of [...imports].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-chat-messages.mjs.\n// Edit the extractor or src/source-chat-messages-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, referenceVersion, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, original: e.original })),
      exports: spec.exports,
      features: spec.features,
    });
    emitted.push(spec);
  }
  manifest.adapters = [...adapterRecords.values()].sort((a, b) => (a.original < b.original ? -1 : 1));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat messages output set changed: ${present.join(',')}. Run scripts/extract-chat-messages.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat messages source mismatch: ${name}. Run scripts/extract-chat-messages.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat messages modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatMessages({ check: process.argv.includes('--check') });
