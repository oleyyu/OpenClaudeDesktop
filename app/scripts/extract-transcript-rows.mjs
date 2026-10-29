// Transcript rows (turnStatusRows): the 3.6556.2 Code transcript's status rows and tool rows in the gate-on branch of
// GrowthBook `__gb__2846116625`, without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/transcript-rows, own scripts/verify-gen-transcript-rows.mjs). Migrated from 2.42304.0 in wave 6 of the
// 3.6556.2 migration (lanes w6-transcript-rows / w6-transcript-rows-cont; transcript research §1.2, §2.1 T5/T6/T14, §3.2).
// User ruling: the host opens the flag and follows the desktop everywhere the flag is read.
//
// It reuses the working line's area (src/generated/working-line, extract-working-line.mjs): the CDS TurnStatus / Step
// (c734f318c It), the gate (c26fb8b6b Xe / Je), the clay mark, the spinner face, the clock, the motion and the turn mark
// broker's context (cb6930dae $a) are imported from there, never sliced twice (`linkedAreas`; a binding the working
// line slices without exporting stops generation, unless it is a pure copy listed in `linkedCopies`; a binding it needs
// without a semantic name is a `linkExports` entry of extract-working-line.mjs, imported under its own 3.6556.2 name,
// never under an E34 legacy name, so the wave 7 shim removal leaves this area untouched). The session rail, r3b-transcript's session file access and files-changes' gone check / session id
// context are linked the same way (all on 3.6556.2: the frozen 2.42304.0 views of w6-transcript-rows are gone).
//
//   group-status.mjs   c96d752d0 VCe (2.42304.0 XAe): a tool group's status row (Z1e's turnStatusRows branch): sD (ZM)
//                      decides whether the row holds the turn's mark, then TurnStatus with the clay mark leading, the
//                      clock, "Needs your input" when blocked. HCe (ZAe): a single running tool's busy row. cD (QM): the
//                      mark's activity. The tool rows themselves, by SDK tool name:
//                        i1 (n0; Z1e = v2e behind the engine-surface mount AE): a tool group — coalesced runs, the group
//                          status, the summary, the held running label (EE with the rest key), VCe over the members, the
//                          single-run row (G1e → K1e's tool cards, else the tool row);
//                        n1 (e0): one run inside a group (its tool card by name, else the tool row inGroup / inCard);
//                        iL (Uz; BOe = JIe behind AE): the tool row — label / verb / meta of c52b02f3f Hn by SDK tool name,
//                          the TurnStatus.Step branch, its trailing diff counts, "View live output", HCe while it holds
//                          the turn's mark. 3.6556.2: the Agent row's "· {toolCallCount}" is its own shrink-0 span (T6),
//                          several muted texts are text-muted-as-secondary (T5);
//                        gX (HZ): the thinking step ("Thought process").
//                      The host converts its engine items to SDK tool calls first (src/transcript-sdk-tools.mjs) and
//                      renders i1 for every tool run (src/source-transcript-tool-rows.jsx).
//   turn-mark.mjs      cb6930dae to (La: the mark broker, now with the session's waiting state), po (Ba: the outlet), ro
//                      (Ra), _o (Wa), Co (Ya), Wo / Po (_o / oo: the transcript live scope and its context), To (Za).
//   tool-activity.mjs  c77e464d3 X: the activity kind of a tool for the clay mark.
//   diff-counts.mjs    c227f4d5e ET (bC): the "+N −M" DiffIndicator (3.6556.2: dir="ltr", T14).
//   rows-<chunk>.mjs   the originals those reach in every other chunk, one module per chunk. rows-cd96b5fdc-ByQr-Uye.mjs
//                      and rows-c856385e2-DVsjb2QL.mjs keep their 2.42304.0 target names (R4: the host imports them).
//
// What is not the original, and why (adapters in src/source-transcript-rows-adapters.jsx; each pinned by features): the
// same boundary as in 2.42304.0 (see that file's header): the engine surface (OE, the host's), the transcript markdown
// (c19e90103 Ux), the file menu (c0cdf4a08 g / c856385e2 Un), the request store (shared-11 w_ / P_ / N_, shared-3 aq),
// the code theme pair (shared-7 Pg / Ig), datadog (shared-0 z / B / bN, D17), the toasts (shared-52 cB), the transcript
// view store (cd4f82e77), "View live output" (PE / ME), telemetry (Nd, zE, B1e), the tool cards of features the host has
// its own card for or no data for (lY, EQ, F$, EZe, W$, kQ, _Z, RQ, OQ, jZ, Q$, EZ, NZ, NQ, jQ, MZe, yz, bz, eX, tX, OH)
// and the rows of desktop-only data (MI, kI, Y1e, yk, fX), the bodies of desktop-only results (cb6930dae bc, Qs). mQ
// (TurnProposalGroup, drawn inline by Z1e under the pane context PZ) is generated/proposal-group's copy through the
// adapter; PZ is exported (ProposalPaneContext) for the host's provider (source-proposal-host.jsx ProposalTranscriptScope).
// kQ stays the host's side-session card: its inline branch (mQ / aZe) is for a cloud start_session hand-off (cb27dab29 Ye,
// `target: "cloud"`), which this host never makes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const adapterModule = '../../source-transcript-rows-adapters.jsx';
const C96 = 'c96d752d0-CWv_7-n9.js', CB6 = 'cb6930dae-Dw_4c1QI.js';

const adapters = {
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
  'shared-11-_AVGLHEz.js': {
    ur: { name: 'useSessionAwaitsRequest', local: 'P_', features: ['t.requestsBySession[e];', 'Object.values(n).some(D_)'] },
    tr: { name: 'pendingRequestSince', local: 'N_', features: ['w_.getState().requestsBySession[e]', 'createdAt'] },
    or: { name: 'useRequestStore', local: 'w_', features: ['requestsBySession: {},', 'approvedPlans: {},'] },
  },
  'c06cf64bb-CdJdJuVd.js': {
    xn: { name: 'useTurnStartTime', local: 'bk', features: ['function bk(e) {'] },
    Bn: { name: 'sessionActivityStore', local: 'K', features: ['awaitsInit(e) {'] },
    ni: { name: 'sessionActivityEvents', local: 'a_', features: ['subscribe(e) {', 'notify(e) {'] },
  },
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'useGrowthBookFlag', local: 'fs', features: ['.on;'] },
    rg: { name: 'useGrowthBookFlagWhen', local: 'hs', features: ['!t || !n?.growthbook', '.on;'] },
  },
  'shared-0-DDOOdL6P.js': { Id: { name: 'reportError', local: 'bN', features: ['O11Y_INTERNALS'], also: { qw: ['.addError(typeof e == "function" ? e() : e, n)'] } }, Rv: { name: 'datadogRum', local: 'z', features: ['datadogRum:', 'rumEncoder.worker'] }, xv: { name: 'trackAction', local: 'B', features: ['O11Y_INTERNALS'], also: { Nv: ['attributesAtSend:', 'performance.timeOrigin'] } } },
  // shared-46 YC (exported Ja): the Shiki highlight worker (/assets/highlightWorker-*.js, an asset this host does not
  // serve). The host answers null, the original's own no-Worker branch: pierre highlights on the main thread.
  'shared-46-BIbZBGFq.js': { Ja: { name: 'createHighlightWorker', local: 'YC', features: ['typeof Worker > "u"', 'name: "shiki-highlight"'] } },
  'shared-3-BCEbd8Fv.js': { ta: { name: 'subscribePendingRequests', local: 'aq', features: ['rq.add(e)', 'rq.delete(e)'] } },
  'cd4f82e77-CAMIsQ30.js': {
    r: { name: 'useVerboseTranscript', local: 'Nn', features: ['return Q(Pn);'], also: { Pn: ['e === "verbose"'] } },
    n: { name: 'useCompactTranscript', local: 'Fn', features: ['return !Nn() && e;'] },
    a: { name: 'useShowThinking', local: 'In', features: ['return Q(ue);'] },
  },
  'shared-7-DBAgAi5H.js': {
    rs: { name: 'useCodeThemeLight', local: 'Pg', features: ['return jg(Fg);'], also: { Fg: ['return e.codeThemeLight;'] } },
    ns: { name: 'useCodeThemeDark', local: 'Ig', features: ['return jg(Lg);'], also: { Lg: ['return e.codeThemeDark;'] } },
  },
  'c5da7eb42-XijZdwf1.js': { mr: { name: 'useQueuedBehindApproval', local: 'cC', features: ['requestsBySession[e]'] } },
  'c68c4283d-CWbOoVxS.js': { $f: { name: 'logToolRowExpanded', local: 'Nd', features: ['"claudeai.epitaxy.tool_row.expanded"'] } },
  'c0cdf4a08-C69Ng1c8.js': { t: { name: 'FileMenuTrigger', local: 'g', features: ['nativeMenuWhen:', 'beforeOpen:', 'popupProps:'] } },
  'shared-52-uHFNjl7C.js': { ha: { name: 'useErrors', local: 'cB', features: ['Error("Must be called within ErrorsProvider")'] } },
  [CB6]: {
    i: { name: 'ToolOutputImages', local: 'Ud', features: ['url: `data:${e.mimeType};base64,${e.data}`,', 'defaultMessage: "Screenshot",'] },
    a: { name: 'ToolAttachedFiles', local: 'Xu', features: ['placement:'] },
  },
  'c19e90103-BQFzF8EA.js': { t: { name: 'TranscriptMarkdown', local: 'Ux', features: ['componentName: "EpitaxyAlluviumMarkdown",'] } },
  // w12b-transcript: the terminal's inline-run store (ca41b3815 X, exported s), read by c19e90103 Bh under UserBashRun (Dg);
  // the host has no tracked terminal run for a '!' command (source-transcript-rows-adapters.jsx).
  'ca41b3815-CD1z-rIH.js': { s: { name: 'useTerminalInlineRunStore', local: 'X', features: ['inlineRun: null,', 'runInline: (n, i, o, s, c = !1) => {'] } },
  'shared-5-Bg6ZMqvt.js': { ra: { name: 'useOpenSettingsHref', local: 'pw', features: ['visibleSections:', 'requestInPlaceOpen:'] } },
  'cb1a6e506-CGO9mb0Y.js': { t: { name: 'ErrorCard', local: 'j', features: ['headline:', 'findOmittedDetails:', 'onDismiss:'] } },
};
const localAdapters = {
  [`${C96}#OE`]: { name: 'useEngineSurface', features: ['return e ? t : null;'] },
  [`${C96}#PE`]: { name: 'LiveOutputButton', features: ['defaultMessage: "View live output",'] },
  [`${C96}#ME`]: { name: 'useLiveOutputTask', features: ['.taskId : void 0'] },
  [`${C96}#zE`]: { name: 'useModelFallbackTelemetry', features: ['original_model:', 'fallback_model:'] },
  [`${C96}#B1e`]: { name: 'preloadToolIntent', features: ['?.preload("intent");'] },
  [`${C96}#MI`]: { name: 'HeldNoticeRow', features: ['"hook_notice"', 'preTokens:', 'postTokens:'] },
  [`${C96}#kI`]: { name: 'EventEntryRow', features: ['e.entry.items'] },
  // mQ (TurnProposalGroup): a run of proposing calls drawn inline where the tool group stands (Z1e's `de` branch,
  // `FZ().inline && s?.type === "local"` over calls that all pass cb27dab29 Je). generated/proposal-group slices it
  // (its publicNames), so the adapter hands that one copy over (w10-trans-proposal-inline).
  [`${C96}#mQ`]: { name: 'TurnProposalGroupRow', features: ['failedCalls:', 'cardKey:', 'statusRegionRef:'] },
  [`${C96}#Y1e`]: { name: 'RemoteTriggerName', features: ['onName:', '?.name'] },
  [`${C96}#yk`]: { name: 'SessionNoteRow', features: ['note:', 'runMessageUuid:'] },
  [`${C96}#fX`]: { name: 'TaskEventChips', features: ['events:', 'inGroup:'] },
  [`${C96}#lY`]: { name: 'McpAppToolCard', features: ['lY = M(lYe)'] },
  [`${C96}#F$`]: { name: 'WorkflowToolCard', features: ['setSidePane:', 'openTasksPaneAtTask:'] },
  [`${C96}#kQ`]: { name: 'SideSessionResultCard', features: ['{ inline: r }'] },
  [`${C96}#_Z`]: { name: 'RemoteSessionToolCard', features: ['fallback:', 'inGroup:'] },
  [`${C96}#EQ`]: { name: 'FindingsToolCard', features: ['onPrefillComposer:'] },
  [`${C96}#W$`]: { name: 'SessionToolCard', features: ['W$ = M(F1e)'] },
  [`${C96}#EZe`]: { name: 'QuestionReceiptCard', features: ['f(SZe, { tool: t })', 'f(TZe, { tool: t })'] },
  [`${C96}#eX`]: { name: 'ArtifactToolCard', features: ['eX = M(tXe)'] },
  [`${C96}#tX`]: { name: 'ArtifactLabelCard', features: ['label:'] },
  [`${C96}#RQ`]: { name: 'CoordinatorToolCard', features: ['RQ = M(c$e)'] },
  [`${C96}#OQ`]: { name: 'CoordinatorMessageCard', features: ['OQ ='] },
  [`${C96}#jZ`]: { name: 'PeerSendCard', features: ['jZ ='] },
  [`${C96}#Q$`]: { name: 'PreviewToolCard', features: ['"remote"', 'sessionRef:'] },
  [`${C96}#EZ`]: { name: 'SessionMgmtCard', features: ['addError:'] },
  [`${C96}#NZ`]: { name: 'PluginSuggestionCard', features: ['typeof'] },
  [`${C96}#NQ`]: { name: 'SkillSuggestionCard', features: ['typeof'] },
  [`${C96}#jQ`]: { name: 'SkillProposalCard', features: ['"skill_creation"'] },
  [`${C96}#MZe`]: { name: 'RegistryToolCard', features: ['situation === "blocked"'] },
  [`${C96}#yz`]: { name: 'ScopeStubCard', features: ['t.output ?? "{}"'] },
  [`${C96}#bz`]: { name: 'VerificationCodeCard', features: ['t.status !== "running"'] },
  [`${C96}#OH`]: { name: 'EnvironmentSetupSteps', features: ['OH = M(eRe)'] },
  ['shared-0-DDOOdL6P.js#z']: { name: 'datadogRum', features: ['datadogRum:', 'rumEncoder.worker'] },
  [`${CB6}#Qs`]: { name: 'InboxMessageBody', features: ['{ message: t }', '"shrink-0 whitespace-pre"'] },
  [`${CB6}#bc`]: { name: 'SessionRenameBody', features: ['previousTitle:', 'previousTitleSource:'] },
  ['c856385e2-aEyDzrcK.js#Un']: { name: 'FilePathMenuItems', features: ['defaultMessage: "Attach as context",'] },
};
// Every other chunk the tool rows reach: one module each (rows-<chunk>.mjs).
const ROW_CHUNKS = [
  'c02b04696-DqOSbQOq.js', // w12b-transcript: reached by c19e90103 Dg
'c03935b01-yhcY34vt.js', 'c05b96c7f-MPVkefMW.js', 'c06cf64bb-CdJdJuVd.js', 'c0fbbe82d-COsmfHJY.js', 'c12ef874d-Ci3rzoMb.js',
  'c19ad462c-BZ8PamUY.js', 'c19cfecfb-DUAekdaq.js', 'c21994603-DTxXhEjc.js', 'c24951e9f-JzS5EfmT.js', 'c254f7f8c-BfWrXYyi.js',
  'c25d7186f-CHE_J2eY.js', 'c261da744-qOYw9vlH.js', 'c26fb8b6b-B7Friu61.js', 'c298f6a9f-BrOoQvZD.js', 'c29e43645-BW07mfxa.js',
  'c2ad856dc-Nk1Q0wdk.js', 'c2d1aeb56-BwMYdDs2.js', 'c3668fcde-B9_9KkQN.js', 'c425fb3cf-B-SGR6Na.js', 'c476e9be4-DlarndnK.js',
  'c49d7f557-BzsUo6sq.js', 'c4a9ee384-RLCjceOL.js', 'c4acc1503-CtuKkx7L.js', 'c4c0784b6-CCx7qaGJ.js', 'c4d199b75-D3cQB-UP.js',
  'c51596d2b-Dy8p_zYF.js', 'c51c45b79-DNX9mtgl.js', 'c52b02f3f-BejopSz8.js', 'c53a94863-9HC3yAe9.js', 'c53aca076-P4raFWSk.js',
  'c5a058668-DBnBP7Qc.js', 'c5d464fa3-Bot02AbX.js', 'c60636ac6-xYOM0GQX.js', 'c62da1b56-Dx0Af4Pv.js', 'c6438c669-CeVpGyFN.js',
  'c64baa838-cddTLIc9.js', 'c650084fd-BlejO2XR.js', 'c68fd9df8-CJ4k-Myz.js', 'c6d45d17b-bR_1FuVS.js', 'c6d94f705-BMClskyL.js',
  'c6dc54e94-E5GA6ry5.js', 'c6e1d8764-DFfMO0Bg.js', 'c6e73333a-DjPHi7Jv.js', 'c70db48e3-DVXxzomO.js', 'c7146e7f4-CrJX0VkU.js',
  'c7407a74b-C6T6reA_.js', 'c76ea0beb-CU4sD99o.js', 'c78205843-CtmOrj4s.js', 'c784da984-Bk3OYRhM.js', 'c7fb5ec3d-B51eEW6X.js',
  'c80ec48f8-D2IVcRNS.js', 'c8187a2dc-Dp9Zia_4.js', 'c81ea1931-ChuE7vym.js', 'c81f2e888-BQnCEVOd.js', 'c8479260c-D5Ma9EoG.js',
  'c86240138-Cq_NwsO0.js', 'c8a544a8c-D-YE3_A6.js', 'c9081d688-d6gSB2Ai.js', 'c91a5e4a6-xMjQN7Gn.js', 'c93fb40ec-CmGPilXJ.js',
  'c93fb40ec-DqA5LwgW.js', 'c966e2bd9-DuJ2TLm_.js', 'c9848762b-C_fm-iRF.js', 'c9c0413df-IGmtINHW.js', 'ca0294fab-CNhQR9_1.js',
  'ca54a4b2d-D6nY1AX1.js', 'ca7ba268c-B3JMi1tw.js', 'ca817835b-DnsxSu9V.js', 'cb1a6e506-CGO9mb0Y.js', 'cb27dab29-B4WyL7_M.js',
  'cb8c5a88f-h6ooJ7Al.js', 'cb971281b-Dn4DFuqh.js', 'cbe9ab01c-BTrRO0l3.js', 'cc4053f14-O0GG4ZBy.js', 'cc47d1870-DfC8yeOG.js',
  'cc6e9624e-CoHywWvV.js', 'cc850ce48-yFOuSY5t.js', 'cc8da1d42-BHUuvGrf.js', 'ccd4c05b4-D6NGJKbe.js', 'ccd826b4b-DBMSNLXR.js',
  'cced621b6-BqCKLL3Y.js', 'cd4f82e77-CAMIsQ30.js', 'cd8aaaf0e-uoqFmWIk.js', 'cdb0de22b-BK_K6iwX.js', 'cdf1f82f6-DKXF-DDI.js',
  'ce38f2fa6-DZTvfIaH.js', 'ce574895a-sBAnWI9w.js', 'ce7d378c5-DW6-PXsP.js', 'ce8202212-BBYeHXBi.js', 'ce8acc63b--p2KTarf.js',
  'cea7057eb-De2BQu3K.js', 'cebf3a30d-gH9G-OpX.js', 'cf6524bd5-0fIL9m-2.js', 'cf9114ae4-DwYC2AWQ.js', 'cfb444e1a-BRpWdvVa.js',
  'shared-0-DDOOdL6P.js', 'shared-1-BJhqMmkf.js', 'shared-10-D6FXWZph.js', 'shared-104-CTONUSaz.js', 'shared-11-_AVGLHEz.js',
  'shared-156-BLTosN8U.js', 'shared-18-D3y8YMFN.js', 'shared-182-BI1KJccu.js', 'shared-25-DOWZRSlq.js', 'shared-26-CGuBxVt9.js',
  'shared-28-DNYlf4wu.js', 'shared-3-BCEbd8Fv.js', 'shared-46-BIbZBGFq.js', 'shared-5-Bg6ZMqvt.js',
  'shared-78-D5Fw2h0a.js', 'shared-8-Db1QN4mf.js', 'shared-9-CM21XrJw.js', 'shared-frame-6jtSkIit.js', 'vendor-all-0-DXM0MGjZ.js',
  'vendor-intl-DYfox5Co.js', 'vendor-markdown-CTRWgQFt.js', 'vendor-motion-DlXQpU4V.js', 'vendor-zod-fszujTq6.js',
];
const ROW_EXTRAS = {
  // Top-level statements the selected code relies on that assign to nothing it selects:
  // c64baa838: the diffs-container custom element (its shadow root adopts pierre's base stylesheet);
  // c68fd9df8: the oniguruma binding's static fields and the bundled themes registered into the highlighter;
  // vendor-markdown: property-information's Info prototypes (hast attribute metadata, read by hastToHtml; in c2a6d07ee
  // in 2.42304.0); c5d464fa3: the code themes registering themselves; vendor-zod: its global config and registry.
  'c64baa838-cddTLIc9.js': { carryStatements: ['if(typeof HTMLElement<"u"&&customElements.get("diffs-container")==null)'] },
  'c68fd9df8-CJ4k-Myz.js': { carryStatements: ['"LAST_ID",0),', '.registerThemeIfAbsent(e.name,e.load)'] },
  'vendor-markdown-CTRWgQFt.js': { carryStatements: ['.prototype.normal={}', '.prototype.attribute=""', '.prototype.defined=!0'] },
  'c5d464fa3-Bot02AbX.js': { carryStatements: ['()=>Promise.resolve(structuredClone(', 'async()=>structuredClone((await t()).default)'] },
  'vendor-zod-fszujTq6.js': { carryStatements: ['__zod_globalConfig??', '__zod_globalRegistry??'] },
  // W13 G11 (D1, cowork-approval pendingDedupe): shared-78's known-connector URL table sH and its URL normalisers (lU / uU /
  // dU / fU strict parse, pU normalise, gU the normalised table, _U lookup, yU same connector) are exported under their own
  // names, so cowork-approval links this one copy.
  'shared-78-D5Fw2h0a.js': { linkExports: ['sH', 'lU', 'uU', 'dU', 'fU', 'pU', 'gU', '_U', 'yU'] },
};
const NAMED = { 'shared-15-BvlV43cI.js': 'find-omitted.mjs', 'c19e90103-BQFzF8EA.js': 'outside-handlers.mjs', 'shared-130-dWztbTO1.js': 'shared-130.mjs',
  'shared-6-sd9jbJqs.js': 'shared-6.mjs', 'shared-52-uHFNjl7C.js': 'shared-52.mjs', 'shared-2-TF8v67kg.js': 'shared-2.mjs' };

// w12b-transcript (W12b-TR-4): the user's own '!' command is c96d752d0's user entry `ii === "bash"` branch, each item
// `f(dfe, {command, output, error, runId, kept, commandOnly})` with dfe = c19e90103 Dg (exported `et`): the command in a
// bash-highlighted fence and the 160px output box under it. Host: source-user-shell.jsx.
const NAMED_ROOTS = {
  'c19e90103-BQFzF8EA.js': { internal: true, exports: { Dg: 'UserBashRun' },
    features: { Dg: ['defaultMessage: "(no output)", id: "pndT4iky5F"', '"relative epitaxy-diff epitaxy-fence rounded-lg overflow-clip"',
      'overflow-clip max-h-[160px] overflow-y-auto px-md py-1.25', 'defaultMessage: "Running\\u2026", id: "Vebvte+Plj"'] } },
};
const modules = [
  ...Object.entries(NAMED).map(([source, target]) => ({ target, source, ...NAMED_ROOTS[source] })),
  { target: 'tool-activity.mjs', source: 'c77e464d3-B6HExtAy.js', exports: { X: 'toolActivity' }, features: { X: ['function X('] } },
  { target: 'diff-counts.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { ET: 'DiffIndicator' },
    features: { ET: ['"{additions} added, {deletions} removed"'] } },
  { target: 'turn-mark.mjs', source: CB6, internal: true,
    exports: { to: 'TurnMarkBroker', po: 'TurnMarkOutlet', ro: 'useHoldsTurnMark', _o: 'TurnMarkBox', Co: 'useWireRunningHold', Wo: 'useTranscriptLiveScope',
      Po: 'TranscriptLiveScopeContext', To: 'HELD_KEY_REST' },
    features: { to: ['sessionId:'], po: ['"data-turn-mark-outlet": "",'], ro: ['subscribeYield'], _o: ['"data-turn-mark-box"', '"data-turn-mark-home":'],
      Co: ['wireRunning'], Wo: ['function Wo() {'], Po: ['var Po ='], To: ['fallHoldMs: 650'] } },
  { target: 'group-status.mjs', source: C96, internal: true,
    exports: { VCe: 'GroupStatusRow', HCe: 'RunningToolRow', sD: 'useTurnMarkHold', cD: 'markActivity',
      i1: 'ToolGroupRows', n1: 'ToolGroupMember', iL: 'ToolRow', gX: 'ThoughtProcessStep', PZ: 'ProposalPaneContext' },
    features: {
      VCe: ['statusAnnouncement:', 'holds:', '"tool-use"'], HCe: ['busyTrailing:', 'silentUnmarked: !0,'],
      sD: ['liveRunningToolIds:', 'tailHeld:', 'showsBlocked:'], cD: ['running:'],
      i1: ['(e) => e.withEngineSurfaceScope,'], n1: ['slotRows:', 'coalescedRun:'], iL: ['(e) => e.epitaxyEngineToolRow,'],
      gX: ['defaultMessage: "Thought process",', 'defaultMessage: "Thinking actions",'],
      PZ: ['{ inline: !1, captureGuardedSnapToBottom:'],
    } },
  { target: 'rolldown-runtime-C3OYiQ02.js', source: 'rolldown-runtime-C3OYiQ02.js', verbatim: true },
  { target: 'c3ffe0a17-BkUIZcqx.js', source: 'c3ffe0a17-BkUIZcqx.js', reexport: true },
  { target: 'ca8d8998b-C02dXuja.js', source: 'ca8d8998b-C02dXuja.js', reexport: true },
  { target: 'cce0118b1-Dt55hA5t.js', source: 'cce0118b1-Dt55hA5t.js', reexport: true },
  { target: 'rows-cd96b5fdc-ByQr-Uye.mjs', source: 'cd96b5fdc-B3bjGiE4.js', internal: true, exports: { c: 'SessionScopeContext' }, features: { c: ['n(null)'] } },
  { target: 'rows-c856385e2-DVsjb2QL.mjs', source: 'c856385e2-aEyDzrcK.js', internal: true, exports: { ot: 'PathResolverProvider', lt: 'usePathResolver' },
    features: { ot: ['ot = at.Provider'], lt: ['windowsRoot:', 'toRel(e) {'] } },
  { target: 'c2a6d07ee-DkjXJxV2.js', source: 'c2a6d07ee-DkjXJxV2.js', internal: true, exports: { un: 'r' }, features: { un: ['createHighlighterCore: () =>', 'codeToHast: () =>'] } },
  ...ROW_CHUNKS.map(chunk => ({ target: `rows-${chunk.replace(/\.js$/, '')}.mjs`, source: chunk, ...ROW_EXTRAS[chunk] })),
];

const stateCopies = {
  // The CDS Table's divider and section contexts (c51c45b79 O / X): the listing tables of a tool body are all this
  // area's copy, so each provider and its readers are one copy.
  'c51c45b79-DNX9mtgl.js#O': 'CDS Table dividers context; every Table part this area draws is this copy',
  'c51c45b79-DNX9mtgl.js#X': 'CDS Table section context; every Table part this area draws is this copy',
};
// Pure bindings the working line slices without exporting (shared-frame's invisible-characters regex), sliced again here.
const linkedCopies = {
  'shared-frame-6jtSkIit.js#pn': 'the invisible-characters regex getter (pure; its cache fn is per copy)',
  'shared-frame-6jtSkIit.js#fn': 'that regex cache',
  'shared-frame-6jtSkIit.js#mn': 'the replacement string "$1"',
  // w11-sweep-rest: code-current file-output-paths.mjs now exports ZV / XV too, so they come from it like WV / zH (D1).
};
// Shiki's lazily loaded data chunks (c5a058668's grammar imports, c68fd9df8's oniguruma wasm, the themes), copied byte
// for byte under their own names (the desktop's lazy chunks).
const lazyVerbatim = { importers: ['c5a058668-DBnBP7Qc.js', 'c68fd9df8-CJ4k-Myz.js', 'c2ad856dc-Nk1Q0wdk.js', 'c5d464fa3-Bot02AbX.js'], count: 248 };

const callSites = [
  { source: C96, binding: 'Z1e', role: 'The tool group (v2e): with turnStatusRows (Pv) its status row is VCe over the members, the summary, the diff counts trailing, open / onOpenChange; the running label holds 650 ms with the rest key. Host: source-tool-group.jsx',
    features: ['EE(ut, 650, Ne ? qv : void 0)', 'f(VCe, {', 'candidate: F,', 'failedLabel: "",', 'runningIds: t.flatMap(e0e),'] },
  { source: C96, binding: 'ak', role: 'A tool row with turnStatusRows (qP): gf.Step with label (verb), meta (title), blocked label and the disclosure. Host: source-session.jsx SourceStep',
    features: ['{ state: "blocked", blockedLabel: i }', 'f(gf.Step, {', 'metaTitle: n,'] },
  { source: C96, binding: 'gX', role: 'The thinking row with turnStatusRows (HZ): a gf.Step "Thought process", open by default, copy action "Thinking actions". Host: source-session.jsx reasoning',
    features: ['defaultMessage: "Thought process",', 'defaultMessage: "Thinking actions",', 'actionsLabel:'] },
  { source: C96, binding: '_X', role: 'Thinking (UZ): gX with turnStatusRows, the classic italic block without', features: ['f(gX, { text: n, expansionKey: t })'] },
  { source: C96, binding: 'R7', role: 'The transcript tail (f9): the mark outlet shares a grid cell with the working line',
    features: ['className: "empty:hidden",', '[&>[data-turn-mark-outlet]]:[grid-area:1/1]', 'onPressOrKey:'] },
  { source: CB6, binding: 'Ho', role: 'The transcript live scope (ho): {sessionId, turnLive, liveRunningToolIds, liveRunningShellCalls}, the last tool activity and the mark broker `to` (with the session id) around the rows. Host: source-transcript-rows.jsx TranscriptRowsScope',
    features: ['turnLive: b,', 'liveRunningToolIds: j,', 'liveRunningShellCalls: M,', 'i(to, { sessionId: x, children: f })'] },
];

// Call sites pinned through looseFeature() (R2) where the stable strings alone cannot tell the structure: each `{ loose }`
// pattern must match exactly once in the minified declaration, and the match is the call site's feature (checked again
// on the formatted declaration by the slicer, recorded in the manifest). `provider` names the element the pattern
// mounts with `value: !0`; its import must resolve to c26fb8b6b's turnStatusRows provider (the context c26fb8b6b Xe —
// Z1e's `Pv` — reads).
//   Aat (2.42304.0 nat, pinned by extract-r3b-transcript.mjs until wave 6; L94): the Next renderer feed mounts its rows
//   under c26fb8b6b Ye with `value: !0` — turnStatusRows forced on, whatever __gb__2846116625 says.
const looseCallSites = [
  { source: C96, binding: 'Aat', role: 'The Next renderer feed (2.42304.0 nat): its rows under the turnStatusRows provider forced on (c26fb8b6b Ye, value: !0) inside the "Chat messages" list. Host: source-transcript.jsx (c26fb8b6b Je at the transcript root)',
    features: ['defaultMessage: "Chat messages",', 'defaultMessage: "Currently streaming message",',
      'defaultMessage: "Use the up and down arrow keys to move between messages.",',
      { loose: 'f(Jm.Provider, { value: An, children: f(Nv, { value: !0, children: Pn }) })', provider: /children:[\w$]{1,3}\(([\w$]{1,3}),\{value:!0,children:/ }] },
];
function resolveLooseCallSites(sites) {
  const { parseAst } = createRequire(path.join(root, 'package.json'))('rolldown/parseAst');
  const chunks = new Map();
  const chunk = (file) => {
    if (!chunks.has(file)) {
      const text = fs.readFileSync(path.join(v3.ionSource, file), 'utf8'), ast = parseAst(text), top = new Map(), imports = new Map(), exports = new Map();
      for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration' && node.id) top.set(node.id.name, text.slice(node.start, node.end));
        if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') top.set(d.id.name, text.slice(d.start, d.end));
        if (node.type === 'ImportDeclaration') for (const sp of node.specifiers) imports.set(sp.local.name, [node.source.value.replace(/^\.\//, ''), sp.imported?.name ?? 'default']);
        if (node.type === 'ExportNamedDeclaration' && !node.source) for (const sp of node.specifiers) exports.set(sp.exported.name ?? sp.exported.value, sp.local.name);
      }
      chunks.set(file, { top, imports, exports });
    }
    return chunks.get(file);
  };
  const statusRows = 'c26fb8b6b-B7Friu61.js';
  const rows = chunk(statusRows), reader = rows.top.get(rows.exports.get('T'));
  const context = /return [\w$]+\(([\w$]+)\) \?\? !1|return [\w$]+\(([\w$]+)\)\?\?!1/.exec(reader ?? '');
  if (!context) throw Error(`${statusRows} T no longer reads the turnStatusRows context`);
  const ctx = context[1] ?? context[2];
  return sites.map(({ source, binding, role, features }) => {
    const { top, imports } = chunk(source), decl = top.get(binding);
    if (!decl) throw Error(`loose call site ${source}:${binding} is not a declaration`);
    return { source, binding, role, features: features.map((feature) => {
      if (typeof feature === 'string') return feature;
      const found = [...decl.matchAll(v3.looseFeature(feature.loose, { flags: 'g' }))];
      if (found.length !== 1) throw Error(`call site ${source}:${binding}: ${JSON.stringify(feature.loose)} matches ${found.length} times, expected 1`);
      const local = feature.provider.exec(found[0][0])?.[1], [from, name] = imports.get(local) ?? [];
      const provider = from === statusRows ? rows.top.get(rows.exports.get(name)) : undefined;
      if (!provider || !provider.includes(`${ctx}.Provider,{value:`) || !/\{value:[\w$]+,children:[\w$]+\}=e/.test(provider))
        throw Error(`call site ${source}:${binding}: ${local} (${from}:${name}) is not c26fb8b6b's turnStatusRows provider`);
      return found[0][0];
    }) };
  });
}

export const TRANSCRIPT_ROWS = {
  name: 'transcript rows', generator: 'extract-transcript-rows.mjs', output: path.join(root, 'src/generated/transcript-rows'),
  adapterModule, adapterFile: 'src/source-transcript-rows-adapters.jsx', adapters, localAdapters, modules,
  callSites: [...callSites, ...resolveLooseCallSites(looseCallSites)], stateCopies, linkedCopies, lazyVerbatim,
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
  linkedAreas: ['working-line', 'session-rail', { area: 'r3b-transcript', modules: ['session-file-access.mjs'] },
    { area: 'files-changes', modules: ['file-gone-check.mjs', 'session-context.mjs'] }, { area: 'code-current', modules: ['file-output-paths.mjs'] },
    // w13-close-gen-dedup (w12-carry-01, D1): shared-156's display-safety helpers (OX / kX / AX … VX / qX, invisible and
    // bidi characters made visible) are code-routines' one copy, which exports all of them and imports only
    // routines-shared's shared-0 (plain, no host adapter).
    { area: 'code-routines', modules: ['shared-156-BLTosN8U.mjs'] },
    // shared-0's plain-object check sW (G1 review, D1) is session-rail-kit's plain-object.mjs (no imports), the copy
    // cowork-live imports too.
    { area: 'session-rail-kit', modules: ['plain-object.mjs'] },
    // w13-close-gen-dedup review 1 (D1): shared-0's Pa (lazyInit), jL / ML, Vy … hb and the other bindings routines-shared
    // slices are its one copy (no import at all, plain node loads it; code-routines' shared-156 above already reads it),
    // so rows-shared-0 keeps only the shared-0 bindings routines-shared does not hold.
    { area: 'routines-shared', modules: ['shared-0-DDOOdL6P.mjs'] }],
  gate: { flag: '__gb__2846116625', name: 'turnStatusRows', host: 'src/host-growthbook.mjs HOST_GROWTHBOOK; c26fb8b6b Je at the transcript root (source-transcript.jsx)' },
};
export function extractTranscriptRows(options) {
  return runSlicer(TRANSCRIPT_ROWS, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractTranscriptRows({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
