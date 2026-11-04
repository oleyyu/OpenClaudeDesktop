// Sidebar session hover card (W14-code r4 sidebar-new, fr4-07 / gates-r4-01 / r4pa-c06): the 3.6556.2 hover card a
// Code sidebar row opens — for a session that waits on a permission, the awaiting card with its inline Deny / Allow once
// ("Quick reply and approval controls available") — sliced without executing any desktop runtime (decision D0: own
// generator, own output folder src/generated/sidebar-hover-card, own scripts/verify-gen-sidebar-hover-card.mjs). The
// machinery is the working line's runSlicer (scripts/extract-working-line.mjs: a closure of original top-level
// declarations across chunks, one module per chunk, host adapters at the service boundaries).
//
// Where it sits in the desktop (pinned below as call sites):
//   shared-22 pC   the Code sidebar row: `Q = !ce.isArchived && t.pendingPermissions > 0, he = L || !Q`, then
//                  `o(Wu, {row: Z, title: S, data: ce, awaiting: Q, summaryText: de, disabled: he})` (Wu = shared-20 QO,
//                  exported mt). A row that does not wait on anything has its card disabled.
//   shared-20 QO   the hover card (CDS preview card $c: Root delay `l ? 400 : 500`, closeDelay 200, interactive while
//                  awaiting, the "Quick reply and approval controls available" hint; Popup on the inline end, 440 px
//                  awaiting / 340 px summary), its lane jO (`live` from the session's request list xd(Pd(id)), `polled`
//                  from the session's pending_action BD), the eligibility wO / TO (uO: the tools whose input fits the
//                  card) and DO (`__gb__1002481325`: an edit-type tool shows its diff body), UO / GO (the summary body),
//                  NO (the skeleton) and XO (the attended row: pointer / focus).
//   ca0409d7c ge   AwaitingHoverCardBody (`code_session_awaiting_body`, loaded by PO): the awaiting body — H (the gate:
//                  the live approval or the decoded pending action), _e (tool_permission → he → the tool approval card
//                  with G's Deny / Allow once; ask_user_question → ye; exit_plan_mode → q; nothing → U "Awaiting input"
//                  or ve, the quick reply Z).
//   c009a87a0 f    SessionSummaryTooltipBody (MO / de): the summary text as inline markdown.
//
// The two dynamic imports become static slices here (PO's `import("./ca0409d7c-…")` and MO / de's
// `import("./c009a87a0-…")`): the host adapters FO / MO / de answer with the generated modules, and the residency
// trackers (LO / RO / IO / me) answer "resident" (nothing is loaded lazily).
//
// What is not the original, and why (adapters in src/source-sidebar-hover-card-adapters.jsx, each pinned by features):
//   - the session's live permission requests (shared-11 M_, the desktop's request store) and the live approval of a
//     session (c5da7eb42 KS): the host's pending approvals of that session (SidebarHoverCardHost), mapped to the
//     desktop's request / approval shapes (src/sidebar-hover-card-model.mjs);
//   - the tool approval card itself (shared-4 ks → cf74bc599 AD ToolApprovalHoverCard, not sliced: the tool card
//     renderer of the Code transcript): the host's approval card (SourceApprovalCardView) with G's decisions;
//   - the quick reply's send (c6b8adeaf g "hover_reply"), the error toast (shared-52 ha addError), the remote decision
//     mutation (shared-104 bo, E59: no claude.ai sessions), route prefetch (shared-25 Hf), telemetry (shared-8 xy,
//     c68c4283d df: D17);
//   - GrowthBook (shared-25 fs / Yh): the host's answers (host-growthbook.mjs; __gb__1002481325 is Uon `always !0`).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const S20 = 'shared-20-mUr7IqZY.js', CA04 = 'ca0409d7c-D6PQXChO.js', C009 = 'c009a87a0-VX6z_ojB.js';

const adapters = {
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'useGrowthBookFlag', local: 'fs', features: ['.on;'] },
  },
};

// Host stand-ins (keyed chunk#local), each answering the original's contract from the host's data or its "nothing"
// branch; the features pin the original's text.
const S11 = 'shared-11-_AVGLHEz.js', S104 = 'shared-104-CTONUSaz.js', C5DA = 'c5da7eb42-XijZdwf1.js';
const localAdapters = {
  // The two lazy bodies become the generated slices (static): PO (`code_session_awaiting_body`, ca0409d7c) is FO / IO,
  // MO and ca0409d7c de (c009a87a0 SessionSummaryTooltipBody) are the summary body.
  [`${S20}#FO`]: { name: 'AwaitingHoverCardBodySlice', features: ['FO = PO.Component'] },
  [`${S20}#IO`]: { name: 'awaitingHoverCardBodyHandle', features: ['IO = PO.handle'] },
  [`${S20}#MO`]: { name: 'SessionSummaryTooltipBodySlice', features: ['import("./c009a87a0-VX6z_ojB.js")', 'e.SessionSummaryTooltipBody'] },
  [`${CA04}#de`]: { name: 'SessionSummaryTooltipBodySlice', features: ['import("./c009a87a0-VX6z_ojB.js")', 'e.SessionSummaryTooltipBody'] },
  // The residency trackers of the lazily loaded tool approval card (shared-4 ks → cf74bc599) and the file change body
  // (RD, cd98a1763): nothing is loaded lazily here, so both are resident from the start.
  [`${S20}#LO`]: { name: 'toolApprovalCardResidency', features: ['LO = Ma(Sa)'] },
  [`${S20}#RO`]: { name: 'fileChangeBodyResidency', features: ['RO = Ma(RD)'] },
  [`${CA04}#me`]: { name: 'fileChangeBodyResidency', features: ['me = y(se)'] },
  // ca0409d7c fe / pe: the tool approval card (shared-4 ks, cf74bc599 AD ToolApprovalHoverCard, not sliced: the Code
  // transcript's tool card renderer) — the host's approval card with G's Deny / Allow once.
  [`${CA04}#fe`]: { name: 'ToolApprovalHoverCard', features: ['pick: (e) => e.ToolApprovalHoverCard,', 'overlayHost: "AwaitingHoverCardBody.ToolApprovalHoverCard"'] },
  [`${CA04}#pe`]: { name: 'toolApprovalHoverCardHandle', features: ['pick: (e) => e.ToolApprovalHoverCard,', 'options: { loading: U },'] },
  // ca0409d7c V (c272023bf i): the live approval store's provider (c5da7eb42 RN / EB); the live approval below is the
  // host's, so the provider passes its children through.
  ['c272023bf-7hvjxZo0.js#i']: { name: 'LiveApprovalStoreProvider', features: ['t(n) === null'] },
  // The session's permission requests (shared-11 M_: the desktop's request store by session) and its live approval
  // (c5da7eb42 KS): the host's pending approvals of the session (SidebarHoverCardHost, sidebar-hover-card-model.mjs).
  [`${S11}#M_`]: { name: 'useSessionPermissionRequests', features: ['return w_(St(t));'] },
  [`${C5DA}#KS`]: { name: 'useLivePendingApproval', features: ['engineOnHost === !0', 'toggleMcpToolAlwaysApproved'] },
  // The request store's answered-tool-use marks (shared-11 r_ / Qg / t_ / n_): the host clears an answered request
  // from its own list, so nothing is marked and nothing changes.
  [`${S11}#r_`]: { name: 'requestAnswered', features: ['return Yg.has(`${e}:${t}`) || Jg(e, t);'] },
  [`${S11}#Qg`]: { name: 'subscribeAnsweredRequests', features: ['return Zg.subscribe(e);'] },
  [`${S11}#t_`]: { name: 'markRequestAnswering', features: ['Yg.has(n) || (Yg.add(n), Zg.notify());'] },
  [`${S11}#n_`]: { name: 'unmarkRequestAnswering', features: ['Yg.delete(`${e}:${t}`) && ((Xg += 1), Zg.notify());'] },
  // c5da7eb42 ux / dx: the desktop's unsigned-decision hold handlers and its auth error handler (step-up): none here.
  [`${C5DA}#ux`]: { name: 'decisionHoldHandlers', features: ['ix(e.handlers, e.isGateActive, t.handlers, t.gateActive)'] },
  [`${C5DA}#dx`]: { name: 'handleDecisionAuthError', features: ['"stepup_retry"', '=== "modal"'] },
  // shared-104 qM: the claude.ai session decision mutation (a remote session's pending action, E59: no claude.ai
  // sessions) — rejects; every host request answers through the live lane.
  [`${S104}#qM`]: { name: 'useRemoteDecisionMutation', features: ['"ccr_per_message_attestation_web"'] },
  // vendor-query J (useQueryClient): the remote transcript's query is not the host's; invalidation does nothing.
  ['vendor-query-DVJ0goAF.js#J']: { name: 'useQueryClient', features: ['No QueryClient set, use QueryClientProvider to set one'] },
  // c06cf64bb iD: the desktop's session engine store (wakeSession / beginPendingTurn); the host's engine wakes itself.
  ['c06cf64bb-CdJdJuVd.js#iD']: { name: 'sessionEngineStore', features: ['protocolHandlers', 'evictTimer'] },
  // c6b8adeaf Xa ("hover_reply"): send a message to the session — the host's send (SidebarHoverCardHost sendReply).
  ['c6b8adeaf-bLEQVSWL.js#Xa']: { name: 'useHoverReplySender', features: ['noToast: i'] },
  // shared-52 cB: the ErrorsProvider (addError) — the host's toasts.
  ['shared-52-uHFNjl7C.js#cB']: { name: 'useHoverErrors', features: ['"Must be called within ErrorsProvider"'] },
  // shared-52 q: the sidebar store (overflowMenuOpen) — the host sidebar's own overlay state (source-sidebar-current-adapters).
  ['shared-52-uHFNjl7C.js#q']: { name: 'useSidebarOverlayState', features: ['collapsed: !1,', 'lastKnownMode: "chat",'] },
  // c139d9cdb a: run a reset when the account sweep epoch moves (logout); no account here, the epoch never moves.
  ['c139d9cdb-NjJxcxNH.js#a']: { name: 'useOnAccountSweep', features: ['e === s.current || c.current'] },
  // shared-25 Hf: prefetch a route (/code/<id>) on hover / focus; the host has no router.
  ['shared-25-DOWZRSlq.js#Hf']: { name: 'prefetchRoute', features: ['Kf(e, t, null, !1);'] },
  // Telemetry (D17): nothing is sent.
  ['shared-8-Db1QN4mf.js#xy']: { name: 'trackHoverCardOpened', features: ['"claudeai.epitaxy.sidebar.session_hover_card_opened"'] },
  ['c68c4283d-CWbOoVxS.js#eu']: { name: 'trackHoverQuickReply', features: ['"claudeai.epitaxy.sidebar.hover_quick_reply_sent"'] },
  // shared-104 fb: the claude.ai remote session query keys (read only for H's remote transcript invalidation, a no-op
  // here): keys of nothing.
  [`${S104}#fb`]: { name: 'remoteSessionQueryKeys', features: ['transcriptIsForSession: db,', 'contextUsage: nb,'] },
  // (shared-4 XT, the account's billing block, is read only by slices this area now links from code-transcript (r7
  // R7DC-03), which carry that area's adapter; W14-code r7 gen-final-7 dropped the unreached useBillingBlock stand-in.)
  // shared-25 cc: the desktop app at a minimum version (c009a87a0 s routes a link through shared-52 yz then); this host
  // is the desktop app. The hover bodies render without links (`links: !1`) anyway.
  ['shared-25-DOWZRSlq.js#cc']: { name: 'useDesktopAppAtVersion', features: ['{ version: t, platform: n }', 'sc.get(i)'] },
};

// W14-code r7 R7DC-03 (D1): shared-78 Oj (the clipped text) is no longer copied here: transcript-rows exports it
// (scripts/code-transcript-links.json `linkExports['transcript-rows']`) and this card links it.
const linkedCopies = {};

const stateCopies = {};

const modules = [
  { target: 'hover-card.mjs', source: S20, internal: true,
    exports: { QO: 'SidebarSessionHoverCard', jO: 'useHoverCardLane', wO: 'hoverCardToolEligible', EO: 'hoverCardChangeBody', DO: 'useHoverCardDiffBody',
      zD: 'pendingActionKind', BD: 'decodePendingAction', KD: 'usePendingActionAnswered', JD: 'clearAnsweredPendingActions', qD: 'markPendingActionAnswered' },
    features: {
      QO: ['defaultMessage: "Quick reply and approval controls available", id: "ynFeEyepCq"', 'Oe = l ? 400 : 500', 'closeDelay: 200,',
        '"epitaxy-root break-words [--preview-card-min-w:440px] [--preview-card-max-w:440px] !px-0 !py-0"', 've(KO)'],
      jO: ['lane: "live"', 'lane: "polled"', 'e?.type === "cli"'],
      wO: ['uO.get(e.toolName)', 'e.cdsRemPx ?? 16'],
      EO: ['changeSides !== void 0'],
      DO: ['"__gb__1002481325"'],
      zD: ['"ask_user_question"', '"exit_plan_mode"', '"tool_permission"'],
      BD: ['"Ready to start?"', '"Question"'],
      KD: ['GD(e, t)'],
      JD: ['VD.delete(e)'],
      qD: ['VD.set(e, n)'],
    } },
  { target: 'awaiting-body.mjs', source: CA04, exports: { ge: 'AwaitingHoverCardBody' },
    features: { ge: ['r(V, { children: r(_e, { ...e }) })'] } },
  // The small originals the closure reaches in other chunks, each chunk's slice in a module of its own (W14-code r7
  // R7DC-03: no shared-11 / shared-25 module any more — all it reached there is linked from the Code transcript
  // renderer and the transcript rows).
  { target: 'shared-26.mjs', source: 'shared-26-CGuBxVt9.js' },
  { target: 'shared-18.mjs', source: 'shared-18-D3y8YMFN.js' },
  { target: 'shared-78.mjs', source: 'shared-78-D5Fw2h0a.js' },
  { target: 'shared-5.mjs', source: 'shared-5-Bg6ZMqvt.js' },
  { target: 'shared-104.mjs', source: S104 },
  { target: 'shared-0.mjs', source: 'shared-0-DDOOdL6P.js' },
  { target: 'shared-130.mjs', source: 'shared-130-dWztbTO1.js' },
  { target: 'summary-tooltip-body.mjs', source: C009, exports: { f: 'SessionSummaryTooltipBody' },
    features: { f: ['remarkPlugins: o', 'unwrapDisallowed: !0'] } },
];

const callSites = [
  { source: 'shared-22-Bwn3sJTG.js', binding: 'pC', role: 'The Code sidebar row mounts QO (exported mt) around the row: awaiting = not archived and a pending permission; a row that is not awaiting has its card disabled (host: SidebarSessionHoverCard, mounted by source-sidebar.jsx)',
    features: ['let Q = !ce.isArchived && t.pendingPermissions > 0,', 'he = L || !Q;', 'o(Wu, { row: Z, title: S, data: ce, awaiting: Q, summaryText: de, disabled: he })'] },
];

export const SIDEBAR_HOVER_CARD = {
  name: 'sidebar hover card', generator: 'extract-sidebar-hover-card.mjs', output: path.join(root, 'src/generated/sidebar-hover-card'),
  adapterModule: '../../source-sidebar-hover-card-adapters.jsx', adapterFile: 'src/source-sidebar-hover-card-adapters.jsx',
  adapters, localAdapters, modules, callSites, linkedCopies, stateCopies,
  // Linked, not sliced again (D1): the code sidebar's PR card context (HE) and its fade label context (shared-18 Ik), so
  // the card's providers reach the rows' own readers; small pure slices other areas export.
  linkedAreas: [
    { area: 'code-current', modules: ['sidebar-pr-card.mjs', 'sidebar-fade-label.mjs', 'string-count.mjs'] },
    { area: 'turn-box', modules: ['strip-markup.mjs', 'shared-11.mjs', 'session-messages.mjs'] },
    { area: 'transcript-rows', modules: ['shared-130.mjs', 'shared-52.mjs',
      // W14-code r5 R5DC-09 (D1): the transcript rows' shared slices that export what this card reaches.
      'rows-shared-0-DDOOdL6P.mjs', 'rows-shared-5-Bg6ZMqvt.mjs', 'rows-shared-25-DOWZRSlq.mjs', 'rows-shared-78-D5Fw2h0a.mjs', 'rows-shared-156-BLTosN8U.mjs'] },
    // W14-code r5 R5DC-09 (D1): isPlainObject.
    { area: 'session-rail-kit', modules: ['plain-object.mjs'] },
    { area: 'files-changes', modules: ['path-basename.mjs'] },
    { area: 'sidebar-resize', modules: ['logical-side.mjs'] },
    { area: 'code-composer', modules: ['menu-collision-padding.mjs'] },
    // W14-code r8 R8DC-01 (D1): shared-5 NA (the question text's string coercion PA maps over) is question-card's
    // card-header.mjs copy, which that generator now exports (publishedAuto), not sliced again here.
    { area: 'question-card', modules: ['c53f67064.mjs', 'card-header.mjs'] },
    { area: 'r4e-findings', modules: ['send-stopped.mjs'] },
    { area: 'chat-renderer', modules: ['vendor-markdown-CTRWgQFt.mjs', 'shared-10-D6FXWZph.mjs', 'ce8acc63b-D6MJR1iY.mjs'] },
    // W14-code r6 R6DC-06 (D1): pure slices other areas already hold and export — the approval titles' shared-18 nq (tool
    // input summary) and shared-9 LO, the Routines page's shared-156 path / label helpers, routines-shared's shared-0
    // Pa / jL / ML, and cowork-progress's shared-78 fL (a module this card's closure already loads).
    { area: 'approval-titles', modules: ['shared-18-D3y8YMFN.mjs', 'shared-9-CM21XrJw.mjs'] },
    { area: 'code-routines', modules: ['shared-156-BLTosN8U.mjs'] },
    { area: 'routines-shared', modules: ['shared-0-DDOOdL6P.mjs'] },
    { area: 'cowork-progress', modules: ['shared-78-D5Fw2h0a.mjs'] },
    // W14-code r7 R7DC-03 (D1): what the Code transcript renderer already slices from the same chunks — shared-78 eA / tA
    // / nA / hN / YN, shared-11 j_, shared-104 xN / SN, shared-26 Tx … Mx, shared-20 kO / AO, shared-25 Fw / Lw — exported
    // by it (scripts/code-transcript-links.json `linkExports['code-transcript']`) and linked here, not sliced again; the
    // renderer's chunks import no sidebar area, so no cycle (main.jsx imports the renderer statically already).
    { area: 'code-transcript', modules: ['shared-78-D5Fw2h0a.mjs', 'shared-11-_AVGLHEz.mjs', 'shared-104-CTONUSaz.mjs', 'shared-26-CGuBxVt9.mjs',
      'shared-20-mUr7IqZY.mjs', 'shared-25-DOWZRSlq.mjs'] },
    { area: 'transcript-rows', modules: ['rows-shared-11-_AVGLHEz.mjs'] },
  ],
  gate: { flag: '__gb__1002481325', name: 'the hover card\'s edit-type diff body (shared-20 DO)', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK (Uon always !0, E81)' },
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractSidebarHoverCard(options) {
  return runSlicer(SIDEBAR_HOVER_CARD, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSidebarHoverCard({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
