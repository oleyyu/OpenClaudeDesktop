// Transcript rows (turnStatusRows): the 2.42304.0 Code transcript's status rows in the gate-on branch of GrowthBook
// `__gb__2846116625`, without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/transcript-rows, own scripts/verify-gen-transcript-rows.mjs). User ruling: the host opens the flag (and
// the clay mark `__gb__507049721`) and follows the desktop everywhere the flag is read.
//
// It reuses the working line's area (src/generated/working-line, extract-working-line.mjs): the CDS TurnStatus / Step
// (c734f318c jt), the gate (c26fb8b6b We / He), the clay mark, the spinner face, the clock and the motion are imported
// from there, never sliced twice (`linkedAreas`; a binding the working line slices without exporting stops generation).
// The session rail (src/generated/session-rail) is linked the same way: shared-25 $U (displayPath, with its YU), shared-78
// YD / sN and shared-130 Y are its copies (2026-10-18: they were sliced twice).
//
//   group-status.mjs   c96d752d0 XAe: a tool group's status row (v2e's turnStatusRows branch): ZM decides whether the
//                      row holds the turn's mark (the running tool candidate, the tail hold, the parked / blocked
//                      state), then TurnStatus with the clay mark leading, the clock, "Needs your input" when blocked.
//                      ZAe: a single running tool's row (e0): while the row holds the mark it is a busy TurnStatus with
//                      the mark and clock, else its own Step. GM / KM / qM / WM / ww / YM / JM / QM are the shared
//                      pieces (from the working line where it already slices them).
//   turn-mark.mjs      cb6930dae La (the mark broker the transcript scope provides, Fa), Ba (the outlet before the
//                      working line where the mark rests), Ra (tv: a row asks to hold the mark), Wa (sv: the row's mark
//                      box carried from the outlet), Ya (xv: the wire-running hold) and _o / oo (av: the transcript live
//                      scope — sessionId, turnLive, liveRunningToolIds). The last tool's activity kind (ro) is the working
//                      line's (morph.mjs TurnActivityContext).
//   tool-activity.mjs  c77e464d3 X (Rde): the activity kind of a tool for the clay mark (think / read / search / code /
//                      write / compose …) from its name and input.
//   diff-counts.mjs    c227f4d5e bC (np): the "+N −M" DiffIndicator a finished group shows trailing.
//
//   group-status.mjs   (continued) the tool rows themselves, by SDK tool name (user ruling: "the transcript follows the
//                      desktop, no host trade-off"):
//                        n0 (v2e behind the engine-surface mount mM): a tool group — the coalesced runs (cd57a9664 q),
//                          the group status (R / L), the summary (c24951e9f ve / P / D / E / O / te: "Edited a.js, ran
//                          2 commands"), the held running label (uM with the rest key cv), XAe over the members, the
//                          single-run row (aG → p2e → m2e's tool cards, else the tool row);
//                        e0: one run inside a group (its tool card by name, else the tool row inGroup / inCard);
//                        Uz (JIe behind mM): the tool row — the label / verb / meta of c52b02f3f fn by SDK tool name
//                          (Ran / Read / Edited / Searched / Fetched / Ran agent / Used … ), the turnStatusRows branch
//                          UIe (TurnStatus.Step, its trailing diff counts, "View live output", ZAe while it holds the
//                          turn's mark), the classic branch for the gate off;
//                        HZ: the thinking step ("Thought process").
//                      The host converts its engine items to SDK tool calls first (src/transcript-sdk-tools.mjs) and
//                      renders n0 for every tool run (src/source-transcript-tool-rows.jsx).
//   rows-<chunk>.mjs   the originals those reach in every other chunk, one module per chunk.
//
// What is not the original, and why (adapters in src/source-transcript-rows-adapters.jsx; each pinned by features):
//   (2026-10-18, user ruling "照官方原样": the tool result body — c96d752d0 KIe → GIe → cb6930dae Tu with the command
//     output / terminal card, pierre's File and FileDiff, Shiki and its lazily loaded grammars / themes / inlined
//     oniguruma wasm, the search listings — and the file link c856385e2 In are originals now; the host gives the engine
//     surface an identity epitaxyEngineToolResult and provides the session's file contexts. What stays the host's
//     around them: the transcript markdown for text a body shows as a message (c19e90103 Ix), the file menu
//     (c0cdf4a08 _ / c856385e2 Q → the transcript's delegated [data-file-ref] menu), the request store (shared-11 X),
//     the settings navigation (shared-5 V_), the code theme pair (shared-14 Ue / We), datadog (shared-0 LA / V, D17),
//     and the bodies of desktop-only results (cb6930dae Vs session rename, bs Slack inbox): see the adapters.)
//   fM (the engine surface the desktop mounts for an alternative engine): the host's surface, whose tool row renders the
//     host's own cards for the items the host has cards for (agents, MCP apps, computer use, findings, question
//     receipts, deliverables, workflows) and the original row for everything else;
//   the output images (cb6930dae Hu), the attached files (cb6930dae iu: the host's deliverables), "View live output" (xM / _M over the desktop's tasks pane store), the verbose / thinking views
//     (cd4f82e77), the queued-approval store (c5da7eb42 My), the project settings opener (cd8aaaf0e N): the host's;
//   the desktop's toasts (shared-52 Sj, ErrorsProvider): the host's toasts;
//   telemetry (c68c4283d Uu, OM, l2e): nothing is sent (D17);
//   the tool cards of features the host does not have — peer messages (oQ = O$e), coordinator send_message (Q$ =
//     g0e), cloud environment setup (NW = VUe), side sessions (R$, $$, Y1, c$e, g2e), skill / plugin / artifact cards
//     (EZ, DZ, cQ, r1, t1, E$e, VV, HV, c1, V1, tQ), event entries, held notices and notes (mz, _z, RZ, sF), the
//     coordinator's add_repo error (u$e / cb1a6e506 A): their predicates key on tool names no host core calls; the
//     adapter renders the card's own fallback (the original tool row).
//   the MCP App card (VX), the findings card (X$), the workflow card (j1) and the question receipt (x$e): the host's
//     migrated cards (generated/mcp-app-card, generated/r4e-findings, the host workflow card, the receipt).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const adapterModule = '../../source-transcript-rows-adapters.jsx';

const adapters = {
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'] },
  },
  // shared-11 Im (exported Jn): the session waits on an approval / question (the desktop's request store). Host: the
  // transcript rows host's awaiting flag (pending approvals of this session).
  'shared-11-BuQ3CK5I.js': {
    Jn: { name: 'useSessionAwaitsRequest', local: 'Im', features: ['let n = e === void 0 ? void 0 : t.requestsBySession[e];', 'return n ? Object.values(n).some(Am) : !1;'] },
    // X (exported Wn): the desktop's permission request store. Read by cb6930dae yo (a running Bash call is live only
    // while no request of the session waits on it): the host's pending approvals of the transcript's session, as
    // requestsBySession (source-transcript-rows-adapters.jsx).
    Wn: { name: 'useRequestStore', local: 'X', features: ['requestsBySession: {},', 'approvedPlans: {},'] },
  },
  // c06cf64bb: the desktop's per-session turn stores (see the working line's adapters): the host passes no desktop
  // session id, so they answer the empty session.
  'c06cf64bb-BE5q2vSr.js': {
    yn: { name: 'useTurnStartTime', local: 'Cy', features: ['function Cy(e) {'] },
    In: { name: 'sessionActivityStore', local: 'G', features: ['W.set(e, xp("requesting", "sending"))', 'return W.get(e) ?? null;'] },
    Jr: { name: 'sessionActivityEvents', local: 'tc', features: ['ec.add(e),', 'for (let t of ec) t(e);'] },
  },
};

// The tool rows' boundary (see the header): adapters by chunk export, then the local declarations of c96d752d0 the host
// stands in for (localAdapters, keyed chunk#local).
Object.assign(adapters, {
  'shared-25-DP8p7i1Z.js': {
    Th: { name: 'useGrowthBookFlag', local: 'Zs', features: ['return Rs(I(e)).on;'] },
    Nh: { name: 'useGrowthBookFlagWhen', local: 'ec', features: ['return !t || !n?.growthbook ? !1 : As(n, I(e)).on;'] },
  },
  // shared-14: the desktop's editor preferences store (epitaxy-editor-prefs, persisted by the renderer). Ge: the chat
  // text size; Ue / We (exported Q / Z): the code theme pair the tool bodies' Shiki / pierre renderers use (c5d464fa3 j).
  // Host: the code theme pair Settings › Appearance keeps (src/code-theme-store.mjs, the same official ids).
  'shared-14-u0TSV9dR.js': {
    Y: { name: 'useChatTextSize', local: 'Ge', features: ['return L((e) => e.chatTextSize);'] },
    Q: { name: 'useCodeThemeLight', local: 'Ue', features: ['return L((e) => e.codeThemeLight);'] },
    Z: { name: 'useCodeThemeDark', local: 'We', features: ['return L((e) => e.codeThemeDark);'] },
  },
  'cd4f82e77-BZMvPH7p.js': {
    r: { name: 'useVerboseTranscript', local: '_n', features: ['return Q((e) => e === "verbose");'] },
    n: { name: 'useCompactTranscript', local: 'vn', features: ['return !_n() && e;'] },
    a: { name: 'useShowThinking', local: 'yn', features: ['return Q(fe);'] },
  },
  'c5da7eb42-B8cTG8SI.js': { tr: { name: 'useQueuedBehindApproval', local: 'My', features: ['let r = n.requestsBySession[e];', 'return o !== void 0 && o !== a;'] } },
  'c68c4283d-CPuRD0vx.js': { mf: { name: 'logToolRowExpanded', local: 'Uu', features: ['u("claudeai.epitaxy.tool_row.expanded", e);'] } },
  // c856385e2 In (the file link) and Rn / W / q / J / Yt are the originals (2026-10-18, user ruling "照官方原样"): they read
  // the session's file contexts, which the host provides (src/source-transcript-tool-rows.jsx): the Files opener and the
  // Changes diff opener through r3b-transcript's session-file-access.mjs (linked, one copy), the path resolver here
  // (rows-c856385e2 PathResolverProvider / usePathResolver), no remote URL, no links block, no read refusal.
  // The two desktop services the link reaches past its contexts are the host's:
  // c0cdf4a08 _ (exported t): the CDS context menu around the link's trigger, whose items are c856385e2 Q (Attach as
  // context / Copy path / Reveal / Open in <editor>, over the desktop pane store, TanStack Query and the LocalSessions
  // bridge's editor list). The host's file menu is source-transcript.jsx's delegated [data-file-ref] menu (the same one
  // r3b-transcript's FilePathMenu and review-findings use): the trigger carries the path and line.
  'c0cdf4a08-h228IL-P.js': { t: { name: 'FileMenuTrigger', local: '_', features: ['nativeMenuWhen: l,', 'beforeOpen: _,', 'popupProps: v,', 'e(s, { onContextMenu: w }),'] } },
  // shared-52 Sj (exported Ya): the desktop's ErrorsProvider (its toasts: addSuccess "Copied", addError). The host's toasts.
  'shared-52-DGviI8xb.js': { Ya: { name: 'useErrors', local: 'Sj', features: ['Error("Must be called within ErrorsProvider"),'] } },
  'cd8aaaf0e-CDszl29d.js': { n: { name: 'useOpenProjectSettings', local: 'N', features: ['return e(j);'] } },
  'cb6930dae-BD0W5ZM9.js': {
    i: { name: 'ToolOutputImages', local: 'Hu', features: ['url: `data:${e.mimeType};base64,${e.data}`,', 'defaultMessage: "Screenshot",'] },
    a: { name: 'ToolAttachedFiles', local: 'iu', features: ['function iu({ tool: e, placement: a = "under-row" }) {'] },
  },
  // The tool result body (cb6930dae Tu) and what it draws are the originals; these are the services it reaches:
  // c19e90103 Ix (exported t): EpitaxyAlluviumMarkdown, the desktop's streaming markdown renderer (about 11 900 bindings:
  // remark / rehype, KaTeX, mermaid, its own code blocks). A tool body renders markdown only for text a tool returns as a
  // message (cb6930dae au / Ss); the host renders it with the transcript's own markdown (the renderer of every assistant
  // message here, source-session.jsx).
  'c19e90103-muBq-gyt.js': { t: { name: 'TranscriptMarkdown', local: 'Ix', features: ['componentName: "EpitaxyAlluviumMarkdown",', 'isStreaming: t = !1,'] } },
  // shared-0 LA (exported Ju) / V (exported A_): the datadog error report and RUM action (B = datadogRum, the
  // rumEncoder worker). Nothing is sent (D17). Pinned as the area's datadog boundary: with the adapters below no sliced
  // code reaches them today (the file link's open-in-editor error log and the MCP menu's settings link were the paths).
  'shared-0-ByI5P0CP.js': {
    Ju: { name: 'reportError', local: 'LA', features: ['L(RA, I.O11Y_INTERNALS)'], also: { mC: ['B.addError(typeof e == "function" ? e() : e, n);'] } },
    A_: { name: 'trackAction', local: 'V', features: ['L(l_, I.O11Y_INTERNALS)'], also: { l_: ['B.addAction(e, s),'] } },
  },
  // shared-5 V_ (exported Va): the desktop's settings navigation (in-place settings sections over the router). Read by
  // cb6930dae Sl, the "Manage connectors" button of an MCP server that needs auth: the host's settings (its MCP page).
  'shared-5-kdJVRUsT.js': { Va: { name: 'useOpenSettingsHref', local: 'V_', features: ['visibleSections: s,', 'requestInPlaceOpen: c,'] } },
  'cb1a6e506-k1NHY4-j.js': { t: { name: 'ErrorCard', local: 'A', features: ['headline: n,', 'findOmittedDetails: N = !1,', 'onDismiss: P,'] } },
});
const C96 = 'c96d752d0-BOCqU7c2.js';
const CB6 = 'cb6930dae-BD0W5ZM9.js';
const localAdapters = {
  [`${C96}#fM`]: { name: 'useEngineSurface', features: ['let e = T(dM) ?? Lve(),', 'return e ? t : null;'] },
  [`${C96}#xM`]: { name: 'LiveOutputButton', features: ['let t = Yh((e) => e.openTasksPaneAtTask),', 'defaultMessage: "View live output",'] },
  [`${C96}#_M`]: { name: 'useLiveOutputTask', features: ['return t !== void 0 && n && Qve(t) ? t.taskId : void 0;'] },
  [`${C96}#OM`]: { name: 'useModelFallbackTelemetry', features: ['original_model: n.originalModel,', 'api_refusal_category: n.apiRefusalCategory,'] },
  [`${C96}#l2e`]: { name: 'preloadToolIntent', features: ['c2e(e)?.preload("intent");'] },
  [`${C96}#_z`]: { name: 'HeldNoticeRow', features: ['return e.kind === "hook_notice"', 'b(n ? jM : AM, { preTokens: e.preTokens, postTokens: e.postTokens })'] },
  [`${C96}#mz`]: { name: 'EventEntryRow', features: ['n = GCe(e.entry.items),'] },
  [`${C96}#R$`]: { name: 'InlineSideSessions', features: ['let n = H1e(e, t.id),'] },
  [`${C96}#g2e`]: { name: 'RemoteTriggerName', features: ['let n = bR(e)?.name;'] },
  [`${C96}#c$e`]: { name: 'useStartedSessionTools', features: ['t.spawnedFrom?.sessionId === e'] },
  [`${C96}#u$e`]: { name: 'FindOmittedBlock', features: ['return b("div", { className: e, [Fu]: "", children: t });'] },
  [`${C96}#sF`]: { name: 'SessionNoteRow', features: ['return b(cF, { rowKey: ZP(e, t), note: e });'] },
  [`${C96}#RZ`]: { name: 'TaskEventChips', features: ['i = C(() => wL(e, r), [e, r]);'] },
  [`${C96}#VX`]: { name: 'McpAppToolCard', features: ['VX = M(kQe)'] },
  [`${C96}#j1`]: { name: 'WorkflowToolCard', features: ['let { setSidePane: n, openTasksPaneAtTask: r } = qh(),'] },
  [`${C96}#$$`]: { name: 'SideSessionResultCard', features: ['let { inline: n } = KQ(),', 'r = n && R_(e) ? Ph(e.output) : void 0,'] },
  [`${C96}#X$`]: { name: 'FindingsToolCard', features: ['onPrefillComposer: r,'] },
  [`${C96}#V1`]: { name: 'SessionToolCard', features: ['V1 = M(i2e)'] },
  [`${C96}#x$e`]: { name: 'QuestionReceiptCard', features: ['return a_() ? b(y$e, { tool: e }) : b(b$e, { tool: e });'] },
  [`${C96}#EZ`]: { name: 'ArtifactToolCard', features: ['EZ = M(e$e)'] },
  [`${C96}#DZ`]: { name: 'ArtifactLabelCard', features: ['return t ? b(TZ, { label: t.label }) : null;'] },
  [`${C96}#c1`]: { name: 'CoordinatorToolCard', features: ['c1 = M(C0e)'] },
  [`${C96}#Q$`]: { name: 'CoordinatorMessageCard', features: ['Q$ = M(g0e)'] },
  [`${C96}#oQ`]: { name: 'PeerSendCard', features: ['oQ = M(O$e)'] },
  [`${C96}#Y1`]: { name: 'PreviewToolCard', features: ['? b(eG, { tool: e, sessionRef: t })', ': b(XW, { tool: e, sessionRef: t });'] },
  [`${C96}#tQ`]: { name: 'SessionMgmtCard', features: ['let { addError: r } = Pa(),'] },
  [`${C96}#cQ`]: { name: 'PluginSuggestionCard', features: ['return !sQ(e) || typeof e.output != "string"'] },
  [`${C96}#r1`]: { name: 'SkillSuggestionCard', features: ['return !n1(e) || typeof e.output != "string"'] },
  [`${C96}#t1`]: { name: 'SkillProposalCard', features: ['let i = fi("skill_creation").isAvailable;'] },
  [`${C96}#E$e`]: { name: 'RegistryToolCard', features: ['let r = C_(e, t?.type),'] },
  [`${C96}#VV`]: { name: 'ScopeStubCard', features: ['let s = Yd(e.output ?? "{}");'] },
  [`${C96}#HV`]: { name: 'VerificationCodeCard', features: ['b(RBe, { sessionId: i, fallback: r });'] },
  [`${C96}#NW`]: { name: 'EnvironmentSetupSteps', features: ['NW = M(VUe)'] },
  // The tool result body's branches for features the host has no data for (their predicates key on a desktop-only result):
  // Vs, the session rename receipt with Undo (c52b02f3f Dt: a completed rename tool whose result carries the desktop's
  // `_meta` rename record, then a react-query title mutation); bs, a Slack inbox message (c52b02f3f _t: FetchInboxMessage).
  // No host core produces either result, so Tu never reaches them; the stand-ins render nothing.
  [`${CB6}#Vs`]: { name: 'SessionRenameBody', features: ['{ sessionId: f, title: p, previousTitle: m, previousTitleSource: h } = e,', 's({ ref: { id: a, type: "local" }, title: m, via: "undo" }),'] },
  [`${CB6}#bs`]: { name: 'InboxMessageBody', features: ['r = Cr(e, Lo());', 'l(Ss, { message: e }),'] },
  // c856385e2 Q: the file menu's items (see c0cdf4a08 FileMenuTrigger above): the host's delegated menu draws them.
  ['c856385e2-DVsjb2QL.js#Q']: { name: 'FilePathMenuItems', features: ['defaultMessage: "Attach as context",', 'extraTargets: T,'] },
};
// Every other chunk the tool rows reach: one module each (rows-<chunk>.mjs).
const ROW_CHUNKS = [
  'c05b96c7f-DklIyA-P.js', 'c06cf64bb-BE5q2vSr.js', 'c0fbbe82d-BOWKSems.js', 'c12c146ad-CuJdg7K3.js', 'c12ef874d-Ci3rzoMb.js',
  'c19cfecfb-DUAekdaq.js', 'c21994603-z0ve8JgL.js', 'c24951e9f-Z0jxt9H6.js', 'c254f7f8c-CoDAsZtv.js', 'c25d7186f-CHE_J2eY.js',
  'c261da744-C3mLYxc0.js', 'c29e43645-Dek8X6M0.js', 'c425fb3cf-CEgSkv8l.js', 'c4a9ee384-ZZIKqgNM.js',
  'c4acc1503-B_cdqucS.js', 'c4d199b75-BCsc0Miu.js', 'c52b02f3f-DUwt0Dsx.js', 'c62da1b56-4Yslp259.js',
  'c6438c669-CeVpGyFN.js', 'c6d94f705-D3VTogam.js', 'c70db48e3-BhPEwiDG.js', 'c7407a74b-CeQLL5tW.js', 'c76ea0beb-CU4sD99o.js',
  'c7d4a4512-B5-cT4Zn.js', 'c80ec48f8-BoiZeyal.js', 'c8187a2dc-Dp9Zia_4.js', 'c8479260c-DaoJ9_2S.js',
  'c9081d688-Blaoes4B.js', 'c93fb40ec-DqA5LwgW.js', 'c966e2bd9-DuJ2TLm_.js', 'c9848762b-C_fm-iRF.js',
  'c9c0413df-CmRvoL-H.js', 'ca0294fab-CYDhVWyX.js', 'cb27dab29-_H2_XKli.js', 'cbe9ab01c-BTrRO0l3.js', 'cc4053f14-C-Zim30y.js',
  'cc6e9624e-Dw5fc5HL.js', 'cc850ce48-yFOuSY5t.js', 'cd4f82e77-BZMvPH7p.js', 'cd57a9664-BUM4bG19.js', 'cd96b5fdc-ByQr-Uye.js',
  'ce8202212-HhVfjzAx.js', 'cea7057eb-p4xbrGBz.js', 'cebf3a30d-DvqKBtcj.js', 'cf3dc8013-CrUQOWn2.js', 'cf9114ae4-BrXIon58.js',
  'cfb444e1a-C6ExxC04.js', 'shared-0-ByI5P0CP.js', 'shared-104-Cqo2-vQh.js', 'shared-11-BuQ3CK5I.js', 'shared-156-Bikz018e.js',
  'shared-18-D4XxL6Tg.js', 'shared-19-CkPOiIKm.js', 'shared-25-DP8p7i1Z.js', 'shared-26-CgdP_nTj.js', 'shared-28-DcgD7xXH.js',
  'shared-5-kdJVRUsT.js', 'shared-78-D6VXYXaQ.js', 'shared-8-B5lJ8U5C.js', 'shared-frame-BfjMqbuN.js', 'vendor-all-0-CTKbbUUg.js',
  'vendor-motion-DKLOEafD.js', 'vendor-zod-fszujTq6.js',
  // 2026-10-18: the tool result body (cb6930dae Tu) and the file link (c856385e2 In): the pierre File / FileDiff renderers
  // (c19e90103 el, c64baa838, ca7ba268c, cc8da1d42, c53a94863, ca817835b), Shiki (c68fd9df8 highlighter, c2a6d07ee core,
  // ce7d378c5 oniguruma loader, c2ad856dc themes, c5a058668 bundled languages), the CDS Table (c51c45b79), the terminal
  // output's ANSI parser and the rest of what they read.
  'c26fb8b6b-DfPeiuGP.js', 'c4c0784b6-Dlhp3pgf.js', 'c93fb40ec-CmGPilXJ.js', 'ce8acc63b--p2KTarf.js', 'vendor-markdown-g03xKyml.js',
  'c2a6d07ee-BsCuu8dD.js', 'c5a058668-DBnBP7Qc.js', 'ce7d378c5-DW6-PXsP.js', 'c298f6a9f-BrOoQvZD.js', 'c2ad856dc-oSxvHlRe.js',
  'c68fd9df8-vaHpH2eK.js', 'cb971281b-Dn4DFuqh.js', 'c49d7f557-BzsUo6sq.js', 'c64baa838-Dmxf9-qc.js', 'c3668fcde-B9_9KkQN.js',
  'shared-4-CJsHhp5n.js', 'shared-10-THQui8pC.js', 'c5d464fa3-CyJQSWsU.js', 'cdb0de22b-Zz7YWxhn.js',
  'c8a544a8c-CD0GHG_t.js', 'c476e9be4-Cymx2Vii.js', 'shared-1-CAAiD7E3.js', 'ccd4c05b4-6AnWM1iT.js', 'c53aca076-CXqftCeu.js',
  'c19ad462c-Z3P--eUg.js', 'c6e1d8764-BhyeDbzJ.js', 'c51596d2b-Dr10h3fs.js', 'c856385e2-DVsjb2QL.js', 'c7146e7f4-KXnBQ5wj.js',
  'c81ea1931-ChuE7vym.js', 'cbb72cde9-Rl7dDg4Y.js', 'c03935b01-CyJKQj4N.js', 'c51c45b79-BdxchTZz.js', 'c6e73333a-HHjd1vH0.js',
  'cc47d1870-DfC8yeOG.js', 'cc8da1d42-BHUuvGrf.js', 'ca7ba268c-BWAjIZ0x.js', 'ca817835b-Bg5Vd_ul.js', 'c53a94863-DILC8--H.js',
  'ce574895a-h0uyeRAC.js', 'c784da984-B4E9BLV6.js', 'ce38f2fa6-ko5MqySn.js', 'shared-182-eT1kXtya.js', 'cdf1f82f6-Ia25v78k.js',
  'ca54a4b2d-r0yOTu4C.js', 'c7fb5ec3d-7YZv_wms.js', 'cd902d735-DUvLyT6a.js', 'c78205843-BpG8Heii.js', 'cb1a6e506-k1NHY4-j.js',
  'cf6524bd5-DsyIc5iM.js',
];

// Roots the host itself reads in a row chunk. cd96b5fdc l: the session the rows render in (a_ / o_ read it: "in a
// session" picks the session form of "Needs approval" and of the question receipt); the host provides its session.
// vendor-zod's two global initializers (its config and registry on globalThis, read by the selected schemas).
const ROW_EXTRAS = {
  // Top-level statements the selected code relies on that assign to nothing it selects:
  // c64baa838: the diffs-container custom element (its shadow root adopts pierre's base stylesheet);
  // c68fd9df8: the oniguruma binding's static fields and the bundled themes registered into the highlighter;
  // c2a6d07ee: property-information's Info prototypes (hast attribute metadata, read by hastToHtml).
  'c64baa838-Dmxf9-qc.js': { carryStatements: ['if(typeof HTMLElement<"u"&&customElements.get("diffs-container")==null)'] },
  'c68fd9df8-vaHpH2eK.js': { carryStatements: ['w(O,"LAST_ID",0),w(O,"_sharedPtr",0),w(O,"_sharedPtrInUse",!1)', 'for(let e of _e.getThemes())h.registerThemeIfAbsent(e.name,e.load)'] },
  // c2a6d07ee: Shiki's core. c5d464fa3 m also loads it lazily for its namespace (`import("./c2a6d07ee-BsCuu8dD.js").then(e
  // => e.r)`, normalizeTheme), so it is emitted under its own name with that namespace (In) exported as r.
  'c2a6d07ee-BsCuu8dD.js': { target: 'c2a6d07ee-BsCuu8dD.js', internal: true,
    carryStatements: ['O.prototype.normal={}', 'k.prototype.attribute=""', 'Ct.prototype.defined=!0'], exports: { In: 'r' }, features: { In: ['createHighlighterCore: () => Yr,', 'codeToHast: () => Y,'] } },
  // c5d464fa3: the code themes the bodies highlight with register themselves when the chunk loads — Claude Light / Dark
  // (E / D over the CDS palette) and every bundled Shiki theme by its lazy loader (v) — into c2ad856dc's registry.
  'c5d464fa3-CyJQSWsU.js': { carryStatements: ['m(y,()=>Promise.resolve(structuredClone(E))),m(b,()=>Promise.resolve(structuredClone(D)))',
    'for(let[e,t]of Object.entries(v))m(e,async()=>structuredClone((await t()).default))'] },
  'vendor-zod-fszujTq6.js': { carryStatements: ['__zod_globalConfig??', '__zod_globalRegistry??'] },
  'cd96b5fdc-ByQr-Uye.js': { internal: true, exports: { l: 'SessionScopeContext' }, features: { l: ['l = n(null)'] } },
  // c856385e2 dt / ft / mt: the session's path resolver (toAbs / toRel against the session folder) the file link checks a
  // path with and resolves it by; the host builds it with the original mt over the session's cwd and provides it.
  'c856385e2-DVsjb2QL.js': { internal: true, exports: { ft: 'PathResolverProvider', mt: 'usePathResolver' },
    features: { ft: ['ft = dt.Provider'], mt: ['windowsRoot: r !== null && C(r),', 'toRel(e) {'] } },
};

const modules = [
  { target: 'find-omitted.mjs', source: 'shared-15-Cc9xvKlF.js' },
  { target: 'outside-handlers.mjs', source: 'c19e90103-muBq-gyt.js' },
  { target: 'shared-130.mjs', source: 'shared-130-DnUXVlYq.js' },
  { target: 'shared-6.mjs', source: 'shared-6-Cby4X-ms.js' },
  { target: 'shared-52.mjs', source: 'shared-52-DGviI8xb.js' },
  { target: 'shared-2.mjs', source: 'shared-2-Cb74JByF.js' },
  { target: 'tool-activity.mjs', source: 'c77e464d3-DX-yStHg.js', exports: { X: 'toolActivity' },
    features: { X: ['function X('] } },
  { target: 'diff-counts.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { bC: 'DiffIndicator' },
    features: { bC: ['variant: n = "pill",', '"data-cds": "DiffIndicator",', 'yo("diffIndicator", "{additions} added, {deletions} removed", {'] } },
  { target: 'turn-mark.mjs', source: 'cb6930dae-BD0W5ZM9.js', internal: true,
    exports: { La: 'TurnMarkBroker', Ba: 'TurnMarkOutlet', Ra: 'useHoldsTurnMark', Wa: 'TurnMarkBox', Ya: 'useWireRunningHold', _o: 'useTranscriptLiveScope',
      oo: 'TranscriptLiveScopeContext', Za: 'HELD_KEY_REST' },
    features: { La: ['let [t] = r(() => new Fa());', 'return l(Ia.Provider, { value: t, children: e });'],
      Ba: ['"data-turn-mark-outlet": "",', 'i?.setOutlet(e), o(e));'], Ra: ['i = y(r?.subscribeYield ?? Ga, r?.yields ?? Ka, Ka),'],
      Wa: ['e.setAttribute("data-turn-mark-box", o),', '"data-turn-mark-home": o,'], Ya: ['let t = e !== void 0 && e.wireRunning && e.live,'],
      _o: ['return f(oo);'], oo: ['oo = p(no)'], Za: ['Za = { restKey: Xa, fallHoldMs: 650 }'] } },
  { target: 'group-status.mjs', source: 'c96d752d0-BOCqU7c2.js', internal: true,
    exports: { XAe: 'GroupStatusRow', ZAe: 'RunningToolRow', ZM: 'useTurnMarkHold', QM: 'markActivity',
      n0: 'ToolGroupRows', e0: 'ToolGroupMember', Uz: 'ToolRow', HZ: 'ThoughtProcessStep' },
    features: {
      XAe: ['} = ZM(e, t),', 'm = p ? "blocked" : f ? "busy" : n,', 'return b(sv, {', 'leading: o && !v ? x : null,', 'trailing: typeof i == "function" ? i(m) : i,'],
      ZAe: ['step: n,', 'runningLabel: r,', 'busyTrailing: a,', 'state: f ? "blocked" : "busy",', ': n;'],
      ZM: ['let { sessionId: n, turnLive: r, liveRunningToolIds: i } = av(),', 'tailHeld: p && !o && !u,', 'showsBlocked: m && !h,'],
      QM: ['Rde(r.name, r.input, { running: e !== void 0 && !n })'],
      n0: ['n0 = mM(', 'v2e,', '(e) => e.withEngineSurfaceScope,', '(e) => M(e),'],
      e0: ['slotRows: t,', 'b(f.Row, {', 'coalescedRun: e.tools.length > 1 ? e.tools : void 0,'],
      Uz: ['JIe,', '(e) => e.epitaxyEngineToolRow,', '(e) => M(e, $Ie),'],
      HZ: ['defaultMessage: "Thought process",', 'defaultMessage: "Thinking actions",'],
    } },
  // rolldown's runtime (its __export helper) as the language / theme chunks import it, byte for byte (see lazyVerbatim).
  { target: 'rolldown-runtime-C3OYiQ02.js', source: 'rolldown-runtime-C3OYiQ02.js', verbatim: true },
  // cce0118b1: the highlighter entry c6e73333a loads lazily (re-exports c68fd9df8 / c2ad856dc), under its own name.
  { target: 'cce0118b1-C3VutHRy.js', source: 'cce0118b1-C3VutHRy.js', reexport: true },
  ...ROW_CHUNKS.filter(chunk => !['shared-130-DnUXVlYq.js', 'shared-6-Cby4X-ms.js', 'shared-52-DGviI8xb.js', 'shared-2-Cb74JByF.js'].includes(chunk))
    .map(chunk => ({ target: `rows-${chunk.replace(/\.js$/, '')}.mjs`, source: chunk, ...ROW_EXTRAS[chunk] })),
];

// Module state view-tabs also holds without a public name, copied here with why a second copy cannot split anything.
const stateCopies = {
  // The CDS Table's divider and section contexts (c51c45b79 O / Z): the listing tables of a tool body (cb6930dae Do over
  // sn / cn / dn / un / ln / fn) are all this area's copy, so each provider and its readers are one copy.
  'c51c45b79-BdxchTZz.js#O': 'CDS Table dividers context; every Table part this area draws is this copy',
  'c51c45b79-BdxchTZz.js#Z': 'CDS Table section context; every Table part this area draws is this copy',
};
// The lazily loaded data chunks Shiki asks for (c5a058668 bundledLanguages' 235 grammar imports, c68fd9df8's inlined
// oniguruma wasm, c2ad856dc / c68fd9df8's two themes) and the grammar chunks those import, copied byte for byte under
// their own names next to the modules that import them (the desktop's lazy chunks; a grammar loads when a file of its
// language is first highlighted).
const lazyVerbatim = { importers: ['c5a058668-DBnBP7Qc.js', 'c68fd9df8-vaHpH2eK.js', 'c2ad856dc-oSxvHlRe.js', 'c5d464fa3-CyJQSWsU.js'], count: 248 };

const callSites = [
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'v2e', role: 'The tool group: with turnStatusRows (ye = m_()) its status row is XAe over the members as steps (e0), the summary label (up.Phrases / cw), the diff counts trailing (np), open / onOpenChange; the running label holds 650 ms with the rest key (uM(Ve, 650, ye ? cv : void 0)). Host: source-tool-group.jsx',
    features: ['ye = m_(),', 'He = uM(Ve, 650, ye ? cv : void 0),', 'b(XAe, {', 'candidate: F,', 'failedLabel: "",', '? b(np, { additions: be.additions, deletions: be.deletions })'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'qP', role: 'A tool row with turnStatusRows: up.Step with label (verb), meta (title), blocked label and the disclosure. Host: source-session.jsx SourceStep',
    features: ['if (u)', 'return b(up.Step, {', '...(r === void 0 ? {} : { state: "blocked", blockedLabel: r }),', 'meta: n === void 0 ? t : d,'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'HZ', role: 'The thinking row with turnStatusRows: an up.Step "Thought process", open by default, copy action "Thinking actions". Host: source-session.jsx reasoning',
    features: ['defaultMessage: "Thought process",', 'actionsLabel: n.formatMessage({', 'defaultMessage: "Thinking actions",'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'UZ', role: 'Thinking: HZ with turnStatusRows, the classic italic block (zZ) without', features: ['? b(HZ, { text: t, expansionKey: e })'] },
  { source: 'c96d752d0-BOCqU7c2.js', binding: 'f9', role: 'The transcript tail: the mark outlet (Y_e = Ba) shares a grid cell with the working line (Fit → T8)',
    features: ['b(Y_e, {', 'className: "empty:hidden",', '[&>[data-turn-mark-outlet]]:[grid-area:1/1]'] },
  { source: 'cb6930dae-BD0W5ZM9.js', binding: 'ho', role: 'The transcript live scope: so {sessionId, turnLive, liveRunningToolIds, liveRunningShellCalls}, the last tool activity and the mark broker La around the rows. Host: source-transcript-rows.jsx TranscriptRowsScope',
    features: ['turnLive: v,', 'liveRunningToolIds: fo(E),', 'l(io, { value: D, children: l(La, { children: f }) }),'] },
];

export const TRANSCRIPT_ROWS = {
  name: 'transcript rows', generator: 'extract-transcript-rows.mjs', output: path.join(root, 'src/generated/transcript-rows'),
  adapterModule, adapterFile: 'src/source-transcript-rows-adapters.jsx', adapters, localAdapters, modules, callSites, stateCopies, lazyVerbatim,
  // r3b-transcript's session file contexts and files-changes' gone check / session id context are linked module by module:
  // the file link reads the same contexts the Turn edits card and the Files pane do (one copy of each).
  linkedAreas: ['working-line', 'session-rail', { area: 'r3b-transcript', modules: ['session-file-access.mjs'] },
    { area: 'files-changes', modules: ['file-gone-check.mjs', 'session-context.mjs'] }],
  gate: { flag: '__gb__2846116625', name: 'turnStatusRows', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK; c26fb8b6b He at the transcript root (source-transcript.jsx)' },
};
export function extractTranscriptRows(options) {
  return runSlicer(TRANSCRIPT_ROWS, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractTranscriptRows({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
