// R4f-proposal P1 (tasks-proposal-group-card WI-1; tasks-03 / tasks-04 / tasks-11 / toolcards-20 / transcript-03), migrated
// to 3.6556.2 (w2-tr-findings, R1/R2/R3): extract the transcript proposal group card without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/proposal-group, own scripts/verify-gen-proposal-group.mjs).
//
//   c96d752d0 mQ / hQ     the turn's suggested-task group (`turnSuggestions` feed row: nQe turns the turn's spawn_task /
//                          start_session calls into items, unavailable calls fall back to the tool card iL) and the
//                          unplaced one (`unplacedSuggestions`: QZ over queued tasks no tool row carries); both render
//                          gQ, the group card: "{count} suggested tasks" / "{count} started" / Start all (MQe's guard after
//                          a new task joins), one AQe row per task (kQe: title → prompt preview popover, X, Options popover
//                          = c227f4d5e h1, Do it here / Start), Show {count} more past 6. 2.42304.0: R$ / z$ / H1e / B$.
//   c96d752d0 IZ / BZe    the spawner context the card reads (the host provides a ZS-shaped spawner:
//                          src/proposal-spawner.mjs); VZe the inline-card gate; hQe "Sent to this session".
//   pure parts            c96d752d0 RZ / zZ (the spawner's key, offer test), c227f4d5e PQ (mode keep), cf74bc599 WS / TS / XS
//                          (cross-repo cwd, the "Do it here" text, the start labels; 3.6556.2 moved the spawner and these
//                          three into the session pane chunk), c96d752d0 NM / IM / LM / PM / XM (which tool calls propose,
//                          their task ids), ZX / PXe / FXe (the per-parent outcome store the rows read).
//   c227f4d5e FQ / cR     start permission mode and its consent test; c96d752d0 UX / HX / WX / GX the spawning set (moved
//                          from c227f4d5e) and, through the closure, c227f4d5e h1 / l1 / u1 / qQ / YQ / CQ / … (the Options
//                          form, its resolver and the row stores).
//   c8479260c / cb27dab29 the session tool names, task-id patterns and the tool predicates NM reads.
//
// 3.6556.2 differences the closure carries as is: React Compiler output (helpers from view-tabs by semantic name, E3); the
// started task's status icon is cce2a382f U / W (new optional runningSpinner / large props, W writes CheckCircle /
// text-success directly) and c5ef5b59f with its `__gb__3627956258` vocabulary gate is gone (T12, E14); the session status
// rows moved from shared-19 to shared-46, the auto mode / effort filters from shared-6 to shared-8, the starred cloud
// environment toggle from shared-19 to shared-46.
//
// Every emitted binding is an original top-level declaration sliced from the official chunk. Bindings are the reachable
// closure of the roots: a declaration's dependencies are its free variables (each declaration is parsed on its own and
// Babel's scope analysis names what it reads from outside). An import resolves, in this order, to: a host adapter in
// src/source-proposal-group-adapters.jsx (keyed by the imported chunk and export name; its original declaration must
// still carry `features`), a verified React export of vendor-frame (official.reactAliases, R3), a semantic public name of
// the shared view-tabs graph (D1/D24/E3: CdsButton, CdsIcon, CdsPopover, CdsDropdown, the compiler helpers, …), or the
// same original declaration sliced from its own chunk into this folder, one module per chunk (`<chunk>.js`, exported
// under the chunk's own export name). The closure may only enter the chunks listed in `files`; leaving them is an error,
// so a new dependency of the official source is reviewed instead of silently copied. A React context (createContext) that
// view-tabs also holds is refused unless `contextCopies` says why a second instance is harmless, and an adapter, chunk
// adapter or context copy that the closure no longer reaches is an error too. Features are stable strings, or {loose}
// (official.looseFeature, R2/E5) where the text names minified bindings.
//
// Consumers import the semantic names from index.mjs (`publicNames` in the manifest), never the minified ones.
// `callSites` pin the original text the host wiring follows but cannot import: where the feed puts the two rows, the
// session pane's spawner provider (tw / ew) and the floating-card branch it replaces, and the spawner ZS itself (not
// extracted; the host's proposal-spawner.mjs keeps its local-parent behaviour).
//
// `node scripts/extract-proposal-group.mjs` writes the folder, `--check` compares it (scripts/verify-gen-proposal-group.mjs),
// `--explore` lists the closure and every problem at once without writing (for a version bump; OPEN=1 lists the imports
// leaving the listed chunks instead of failing on them, LIST / ENTRY / DUMP=<chunk prefixes> print a module's bindings,
// where the closure entered it, or its imports).
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot, looseFeature } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/proposal-group');
const adapterModule = '../../source-proposal-group-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;
const loose = text => ({ loose: text });
const C96 = 'c96d752d0-CWv_7-n9.js', C227 = 'c227f4d5e-B-FYKrwT.js', CF74 = 'cf74bc599-CRYqipWN.js';

// Every chunk the closure may enter (besides the adapters, React and the view-tabs names it resolves to). Leaving it is
// an error, and so is a listed chunk the closure no longer enters.
const files = new Set([
  C96, C227, CF74, 'c8479260c-D5Ma9EoG.js', 'cb27dab29-B4WyL7_M.js',
  'shared-0-DDOOdL6P.js', 'shared-2-TF8v67kg.js', 'shared-3-BCEbd8Fv.js', 'shared-8-Db1QN4mf.js', 'shared-10-D6FXWZph.js', 'shared-11-_AVGLHEz.js',
  'shared-14-BP8q-CX5.js', 'shared-18-D3y8YMFN.js', 'shared-19-DIKJVT7c.js', 'shared-20-mUr7IqZY.js', 'shared-25-DOWZRSlq.js', 'shared-28-DNYlf4wu.js',
  'shared-52-uHFNjl7C.js', 'shared-78-D5Fw2h0a.js', 'shared-104-CTONUSaz.js', 'shared-156-BLTosN8U.js', 'shared-182-BI1KJccu.js',
  official.sharedFrame, 'vendor-all-0-DXM0MGjZ.js', official.vendorIntl,
  'c02b04696-DqOSbQOq.js', 'c1014d784-Dakawm5W.js', 'c19e90103-BQFzF8EA.js', 'c25d7186f-CHE_J2eY.js', 'c261da744-qOYw9vlH.js',
  'c30607cef-YKGa83RR.js', 'c425fb3cf-B-SGR6Na.js', 'c5b9e310e-C2XoQ1PW.js', 'c63c52947-vEHZCxml.js', 'c81ea1931-ChuE7vym.js',
  'c8f38bf1f-Ba2QaQov.js', 'ca0294fab-CNhQR9_1.js', 'cce2a382f-CejE_O_V.js', 'ce2d07062-uz1KiKuV.js',
  'shared-46-BIbZBGFq.js', 'c5da7eb42-XijZdwf1.js', 'c2b4a8f0b-Cu5nucru.js', 'cc5c56f5c-BoRtnbt1.js', 'cd4fb5ac7-BD73PU5C.js', 'cf0aa9840-A5pJHkLG.js',
]);

// vendor-frame re-exports React; each alias is checked against official.reactAliases (R3).
const vendor = { [VENDOR_FRAME]: official.reactAliases };

// Host dependencies, keyed by the imported chunk and export name. `local` is the declaration the export must still name;
// `features` must appear in that declaration's prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  // ---- what the card reads from the host (ProposalHost, the toasts, the intl catalog)
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  [`${official.vendorIntl}:p`]: { name: 'useIntl', local: 'q', features: [loose('let e = a(K);'), loose('return (Mt(e), e);')],
    also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
  [`${official.vendorIntl}:l`]: { name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = c(Wt, Ut);')],
    also: { Wt: [loose('let { formatMessage: i, textComponent: a = r } = q(),')] } },
  // shared-8 og / mg: the session store (hook and getState) and its session patch. Host: ProposalHost.sessions; no stored
  // queue order to patch.
  'shared-8-Db1QN4mf.js:Df': { name: 'useSessionsStore', local: 'og',
    features: ['name: "ccd-sessions-filter",', 'sessions: [],', 'partialize: (e) => ({ selectedProjects: e.selectedProjects }),'] },
  'shared-8-Db1QN4mf.js:Zd': { name: 'updateSession', local: 'mg',
    features: [loose('let n = og.getState().sessions.findIndex((t) => t.sessionId === e);'), loose('let r = { ...e.sessions[n], ...t };')] },
  // shared-11 V_: the sessions waiting on the user (pending permission requests). Host: ProposalHost.needsInput.
  'shared-11-_AVGLHEz.js:ar': { name: 'useSessionsNeedingInput', local: 'V_', features: ['.requestsBySession', 'a.status === "pending" &&'] },
  // shared-52 cB: the ErrorsProvider (gQ's addInfo for "start-all-left-out"). Host: source-toast.jsx.
  'shared-52-uHFNjl7C.js:ha': { name: 'useErrors', local: 'cB', features: ['Error("Must be called within ErrorsProvider")', loose('let e = w(Qz);')] },
  // shared-52 Qh: the guarded localStorage the sent_here outcomes persist in. Host: a window-lifetime storage (the outcomes
  // persist in the host config, R4f-proposal P4).
  'shared-52-uHFNjl7C.js:Ph': { name: 'sentHereStorage', local: 'Qh', features: [loose('Qh = Zh(() => cn("localStorage"), "local_storage", Xh)')] },
  // shared-78 Pw / Fw / Iw: the appFeatures sideSessionProposalPicks / WorktreePick / OfferCloudStart.
  'shared-78-D5Fw2h0a.js:Ly': { name: 'useProposalPicks', local: 'Pw', features: ['?.sideSessionProposalPicks?.status === "supported";'] },
  'shared-78-D5Fw2h0a.js:Ry': { name: 'useProposalWorktreePick', local: 'Fw', features: ['?.sideSessionProposalWorktreePick?.status === "supported";'] },
  'shared-78-D5Fw2h0a.js:Iy': { name: 'useOfferCloudStart', local: 'Iw', features: ['?.sideSessionOfferCloudStart?.status === "supported";'] },
  // c26fb8b6b xn: open a session (the started task's row). Host: ProposalHost.openSession.
  'c26fb8b6b-B7Friu61.js:o': { name: 'useOpenSession', local: 'xn', features: ['entryPoint: "cmd_click",', 'useOpenLinkedSession: the route built for a linked session'] },
  // c19e90103 Ux: the epitaxy Markdown (the prompt preview popover LZ). Host: ProposalHost.renderMarkdown.
  'c19e90103-BQFzF8EA.js:t': { name: 'TaskPromptMarkdown', local: 'Ux', features: ['paceReveal:', 'hangingQuotes:', 'bareFences:'] },
  // ---- the Options form's model, effort and mode sources
  // shared-1 ER: the model catalog (nameFor / hasModel / effortOptionsFor / requiresAutoMode). Host: model/list.
  'shared-1-BJhqMmkf.js:Ur': { name: 'useModelCatalog', local: 'ER', features: ['storedModel:', 'resolvedModel:', 'setStoredModel:'] },
  // shared-8 vK / Ov (3.6556.2 moved them from shared-6): auto mode availability, and the official effort ids filter.
  // Host: the kernel's auto, its own levels.
  'shared-8-Db1QN4mf.js:St': { name: 'useAutoModeAvailability', local: 'vK', features: [loose('i = Di().permission_modes.available;'), loose('i.includes("auto") ? n : _K')] },
  'shared-8-Db1QN4mf.js:Sd': { name: 'supportedEffortOptions', local: 'Ov', features: [loose('let t = Cv.safeParse(e.id);'), loose('(t.data === "xhigh" && !yv())')] },
  // c74045701 o: the effort labels (Low … Max); the host's other levels are named as its composer names them.
  'c74045701-0sFwdkS-.js:n': { name: 'effortMessages', local: 'o', features: ['low: { defaultMessage: "Low", id: "477I0ggSYe" },',
    'medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },', 'high: { defaultMessage: "High", id: "AxMhQrcUDC" },',
    'xhigh: { defaultMessage: "Extra high", id: "kDEj60CmLq" },', 'max: { defaultMessage: "Max", id: "kkjl2vQekD" },'] },
  // shared-7 Nw: the CDS ModelSelector parts h1 renders (Trigger / Popup / Effort). Host: CdsDropdown menus (with R$).
  'shared-7-DBAgAi5H.js:qa': { name: 'ModelSelectorParts', local: 'Nw', features: [loose('Root: Dw,'), loose('Trigger: Ow,'), loose('Popup: Aw,'), loose('Effort: jw,')] },
  // shared-52 qO: the desktop config (remote permission_modes, error vocabulary). Host: none narrowed.
  'shared-52-uHFNjl7C.js:zu': { name: 'useDesktopConfig', local: 'qO', features: [loose('return GO(UO(At(), e), !An(), LO());')] },
  'shared-52-uHFNjl7C.js:Iu': { name: 'getDesktopConfig', local: 'JO', features: [loose('return KO(UO(dr(), e), !er(), e ? CO() : void 0);')] },
  // shared-25 fs: a GrowthBook feature (c227f4d5e reads ccr_plan_mode_enabled, ccd_auto_default_mode, …). Host: the one
  // host table, every other flag off (D29 / D31).
  'shared-25-DOWZRSlq.js:Yh': { name: 'useGrowthBookFlag', local: 'fs', features: [loose('return $o(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;')] },
  // shared-25 cc: the Claude desktop client test (the "ccd" model surface). Host: yes.
  'shared-25-DOWZRSlq.js:vh': { name: 'isDesktopClient', local: 'cc', features: [loose('An(window.navigator.userAgent, { version: t, platform: n })')] },
  // ---- account, cloud and side-session services the host does not have (inert answers)
  // shared-25 VB: the claude.ai account context (c1014d784's organization capability test). Host: none.
  'shared-25-DOWZRSlq.js:Br': { name: 'useAccount', local: 'VB', features: [loose('VB = () => v(kz)')], also: { kz: [loose('kz = b(null)')] } },
  // shared-46 aS: star a cloud environment (the cloud submenu; 3.6556.2 moved it from shared-19). No cloud environments.
  'shared-46-BIbZBGFq.js:So': { name: 'toggleStarredEnvironment', local: 'aS', features: [loose('let { starredIds: n, toggleStarred: r } = Kx.getState();')] },
  // shared-0 pC: globalThis["claude.web"]?.LocalSessions, which VZe asks for popBackgroundTaskSuggestionById. Host: the
  // capability marker (the host spawner pops through proposal-launch.mjs).
  'shared-0-DDOOdL6P.js:dh': { name: 'desktopBridge', local: 'pC', features: ['globalThis["claude.web"]?.LocalSessions'] },
  // c856385e2 $t: the split view's side-session opener. None here.
  'c856385e2-aEyDzrcK.js:at': { name: 'useSideSessionOpener', local: '$t', features: [loose('return c(Zt);')] },
  // cb8c5a88f or / shared-18 nj / shared-20 eD, bD / shared-14 Ft: the started session's chip, PR state, PR and cloud
  // environment chips, error copy. The host has none of these for a session row.
  'cb8c5a88f-h6ooJ7Al.js:I': { name: 'useSessionChip', local: 'or', features: [loose('r = t?.signals.working === !0 && t.signals.machine !== "disconnected",'), 'explicitUnread:'] },
  'shared-18-D3y8YMFN.js:ns': { name: 'useSessionPrState', local: 'nj', features: ['reportedByList:', 'prState:'] },
  'shared-20-mUr7IqZY.js:Pt': { name: 'SessionPrChip', local: 'eD', features: [loose('i(gD, { pr: t, place: "word" })')] },
  'shared-20-mUr7IqZY.js:Ht': { name: 'SessionEnvChip', local: 'bD', features: [loose('children: i(_D, { env: e, named: !0 }),')] },
  'shared-14-BP8q-CX5.js:H': { name: 'errorCopy', local: 'Ft', features: [loose('title: e.formatMessage(U.generic),')] },
  // shared-78 cD / shared-25 up: the session's route href and its hover preload handlers. No routes here.
  'shared-78-D5Fw2h0a.js:X_': { name: 'useSessionHref', local: 'cD', features: ['`${e}/${encodeURIComponent(t)}`'] },
  'shared-25-DOWZRSlq.js:Kf': { name: 'routePreloadProps', local: 'up', features: [loose('if (e === null && t === void 0) return lp;')],
    also: { lp: ['onPointerEnter: () => void 0,', 'onBlur: () => void 0,'] } },
  // shared-frame co: whether the CDS layer is in another window. No.
  [`${official.sharedFrame}:zd`]: { name: 'useLayerInOtherWindow', local: 'co', features: [loose('return e !== void 0 && e !== globalThis.window;')] },
  // ---- start_session offers only (D29: off here, unreachable from a spawn_task card)
  // shared-25 Wi / Jd, shared-156 Qm: AppPreferences ("Don't ask again"), the router and the settings page store.
  'shared-25-DOWZRSlq.js:qg': { name: 'appPreferences', local: 'Wi', features: ['Wi = globalThis["claude.settings"]?.AppPreferences'] },
  'shared-25-DOWZRSlq.js:yp': { name: 'useAppRouter', local: 'Jd', features: ['push: a,', 'replace: o,', 'back: s,', '(i ? i.back() : window.history.back())'] },
  'shared-156-BLTosN8U.js:Ng': { name: 'settingsPageStore', local: 'Qm', features: ['highlightLabel: void 0,'] },
  // ccbc7e432 j / c2f6611a3 $t: the offer card's keyboard chords and their own-composer test.
  'ccbc7e432-DXuvQ274.js:t': { name: 'useOfferChords', local: 'j', features: [loose('{ enabled: M, cardRootRef: N, escapeOnly: P, armKey: F } = j,'), 'if (n.key === "Escape") {'] },
  'c2f6611a3-DBT6B0Bq.js:a': { name: 'isOwnComposer', local: '$t', features: [loose('return !e || e.closest(".epitaxy-prompt") === null ? !1 : q(e) === q(t);')] },
  // ---- telemetry (D17: nothing is sent)
  'c68c4283d-CWbOoVxS.js:lf': { name: 'logProposalStart', local: 'Tf', features: ['"claudeai.code.side_session.proposal_card_started",'] },
  'c68c4283d-CWbOoVxS.js:cf': { name: 'logProposalImpression', local: 'wf', features: ['"claudeai.code.side_session.proposal_card_shown",'] },
  'c68c4283d-CWbOoVxS.js:sf': { name: 'logProposalDismiss', local: 'Ef', features: ['"claudeai.code.side_session.proposal_card_dismissed",'] },
  'shared-1-BJhqMmkf.js:Sc': { name: 'useExposureOnce', local: 'DE', features: [loose('i.current || ((i.current = !0), t());'), 'if (!r.getState().hidden) {'] },
};
// Same-chunk declarations the host answers (the declaration itself must carry `features`).
const chunkAdapters = {
  [`${C96}#iL`]: { name: 'ProposalToolFallback', features: [loose('(e) => e.epitaxyEngineToolRow,'), loose('(e) => M(e, eke),')] },
  [`${C227}#R$`]: { name: 'ProposalModelSelector', features: ['"data-testid": "epitaxy-cds-model-selector",', 'triggerVariant: "pill",'] },
};
// React contexts view-tabs also instantiates that this graph may own a second instance of, with the reason.
const contextCopies = {};

// Roots, each exported under a semantic name from index.mjs. `export` (when the chunk exports it) must name `local`;
// `features` pin the declaration's prettier form.
const roots = [
  // The turn's group (feed `turnSuggestions` row) and the unplaced one (feed tail `unplacedSuggestions`).
  { source: C96, local: 'mQ', name: 'TurnProposalGroup',
    features: [loose('r = nQe(t, n.id),'), loose('n.state === "unavailable" && n.tool !== void 0'), loose('o.map(FQe)'), loose('statusRegionRef: s,')] },
  { source: C96, local: 'hQ', export: 'kt', name: 'UnplacedProposalGroup',
    features: [':unplaced:', loose('r = QZ(t, n.id),'), loose('statusRegionRef: a,')] },
  // The spawner context the card reads (BZe) and the inline-card gate (presets main && local session && the bridge can pop by id).
  { source: C96, local: 'IZ', export: 'zt', name: 'ProposalSpawnerContext',
    features: [loose('IZ = N(null)')] },
  { source: C96, local: 'BZe', name: 'useProposalSpawner',
    features: [loose('return T(IZ);')] },
  { source: C96, local: 'VZe', export: 'Bt', name: 'inlineSpawnerGate',
    features: [loose('e && t?.type === "local" && Fn?.popBackgroundTaskSuggestionById !== void 0')] },
  // "Sent to this session" / "Still suggested" announcement of the spawner's lastSentHere.
  { source: C96, local: 'hQe', export: 'At', name: 'SentHereNotice',
    features: [loose('e.back ? eQ.stillSuggested : eQ.sentHere'), loose('f(nQ, { regionRef: r })')] },
  // Pure parts of the spawner (cf74bc599 ZS; src/proposal-spawner.mjs takes them as `official`).
  { source: C96, local: 'RZ', export: 'It', name: 'proposalKey',
    features: [loose('return e.id ?? e.prompt;')] },
  { source: C96, local: 'zZ', export: 'Ft', name: 'isOfferProposal',
    features: [loose('return e.offer === !0 && e.autoStart !== "cloud";')] },
  { source: C227, local: 'PQ', export: 'Mn', name: 'keepSessionMode',
    features: [loose('if (!(t && !NQ.has(e ?? ""))) return e;')] },
  { source: CF74, local: 'WS', name: 'crossRepoCwdOf',
    features: [loose('i !== "" && i !== r(t) && i !== r(n ?? "")'), '.replace(/[/\\\\]+$/, "")'] },
  { source: CF74, local: 'TS', name: 'proposalHereText',
    features: [loose('return n(e.formatMessage(CS.turn, { title: n(r) }));'), loose('wS(t.title) ||')] },
  { source: CF74, local: 'XS', name: 'proposalStartLabels',
    features: ['defaultMessage: "Start with worktree",', 'id: "i/rNItpPCW",', 'defaultMessage: "Start locally",', 'id: "HlsEbl3CKu",',
      'defaultMessage: "Send to cloud",', 'id: "VfdzzfbVPP",', 'defaultMessage: "Do it here",', 'id: "qNy7sbs812",'] },
  // Which tool calls propose a task and their task ids (the feed builder's XM / IM / LM; NM / PM the row state reads).
  { source: C96, local: 'XM', name: 'proposingTools',
    features: [loose('return n === void 0 ? YM : { tools: t ?? JM, firstProposingCallId: n };')] },
  { source: C96, local: 'IM', name: 'isProposingTool',
    features: [loose('e.input.initiation === "own_initiative" &&'), loose('let t = e.input.proposal_id;')] },
  { source: C96, local: 'LM', name: 'isPlacedProposal',
    features: [loose('return IM(e) && NM(e) !== void 0;')] },
  { source: C96, local: 'NM', name: 'proposalTaskId',
    features: [loose('if (!(e.status !== "completed" || e.isError))')] },
  { source: C96, local: 'PM', name: 'proposalToolFailed',
    features: [loose('e.status === "error" ||'), loose('e.interrupted === !0')] },
  // The per-parent outcome store (dismissed / kept_here / sent_here / start_failed) the rows read; PXe / FXe write it.
  { source: C96, local: 'ZX', name: 'proposalOutcomeStore',
    features: [loose('ZX = oc(() => ({ byParent: {} }))')] },
  { source: C96, local: 'PXe', export: 'Ut', name: 'recordProposalOutcome',
    features: [loose('n === "sent_here" ? tZ(e, (e) => ({ ...e, [t]: n })) : nZ(e, t)')] },
  { source: C96, local: 'FXe', export: 'Ht', name: 'clearProposalOutcome',
    features: [loose('if (r?.[t] === void 0) return n;')] },
  // c227f4d5e: the start's permission mode (FQ) and its consent test (cR); c96d752d0 (moved from c227f4d5e in 3.6556.2):
  // the spawning set (UX / HX / WX / GX) the rows read to show "Starting…".
  { source: C227, local: 'FQ', export: 'Vn', name: 'resolveStartPermissionMode',
    features: [loose('let i = e?.permissionMode,'), loose('if (i === void 0 || !t) return i ?? r;')] },
  { source: C227, local: 'cR', export: 'fs', name: 'startModeNeedsConsent',
    features: [loose('return e === "bypassPermissions" || (e === "auto" && !0);')] },
  { source: C96, local: 'UX', export: 'rn', name: 'visibleProposalQueue',
    features: [loose('return t.size === 0 ? n : n.filter((e) => e.id === void 0 || !t.has(e.id));')] },
  { source: C96, local: 'HX', export: 'qt', name: 'spawningTaskIds',
    features: [loose('let t = zX.getState().byParent[e];')] },
  // W12b (w11-sweep-ccres #31, D1): JX (exported nn) is the subscribing hook over the same zX; cccc2cf0a imports it as ls
  // (`import{…nn as ls…}from"./c96d752d0-CWv_7-n9.js"`, read by cj's sj). Published so the turn box imports this one
  // copy (extract-turn-box.mjs `external`) instead of answering it from an adapter or cutting a second zX.
  { source: C96, local: 'JX', export: 'nn', name: 'useSpawningTaskIds',
    features: [loose('(t) => (e ? (t.byParent[e] ?? LX) : LX)'), loose('n = zX(Ar(t));'), loose('return J1($, 2, n) ? K1($, 2, n, n.length === 0 ? RX : new Set(n)) : $[3];')] },
  { source: C96, local: 'WX', export: 'Xt', name: 'markProposalSpawning',
    features: [loose('BX(e, (e) => (e.includes(t) ? e : [...e, t]));')] },
  { source: C96, local: 'GX', export: '$t', name: 'clearProposalSpawning',
    features: [loose('backgroundTaskSuggestions: [...n.slice(0, r), ...n.slice(r + 1), n[r]],')] },
  // c8479260c: the session tool names and task-id patterns.
  { source: 'c8479260c-D5Ma9EoG.js', local: 'e', export: 't', name: 'PROPOSAL_SESSION_SERVER',
    features: ['e = "ccd_session"'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'r', export: 'l', name: 'SPAWN_TASK_TOOL',
    features: ['r = `mcp__${e}__${t}`'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'i', export: 'r', name: 'DISMISS_TASK_TOOL',
    features: ['i = `mcp__${e}__${n}`'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 's', export: 'u', name: 'START_SESSION_TOOL',
    features: ['s = `mcp__${e}__${a}`'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: '_', export: 's', name: 'TASK_ID_PATTERN',
    features: ['_ = /^task_[0-9a-f]{8}$/'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'T', export: 'h', name: 'taskIdFromResult',
    features: [loose('return e?.match(w)?.[1];')] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'd', export: 'm', name: 'lastTaskIdFromResult',
    features: [loose('for (let n of e.matchAll(u)) t = n[1];')] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'C', export: '_', name: 'taskIdLine',
    features: ['return `task_id: ${e}`;'] },
  { source: 'c8479260c-D5Ma9EoG.js', local: 'S', export: 'g', name: 'quotedTaskTitle',
    features: ['.replace(/task_id/gi, "task id")', '.slice(0, 120);'] },
  // cb27dab29: spawn_task, and the start_session calls NM reads a task id from.
  { source: 'cb27dab29-B4WyL7_M.js', local: 'W', export: 'S', name: 'isSpawnTaskTool',
    features: [loose('return e === Ke;')] },
  { source: 'cb27dab29-B4WyL7_M.js', local: 'K', export: 'T', name: 'isOwnStartSessionProposal',
    features: [loose('(e.input.initiation === "own_initiative" ||'), loose('f(e.output) === void 0')] },
  { source: 'cb27dab29-B4WyL7_M.js', local: 'Ye', export: 'l', name: 'isCloudStartSessionHandOff',
    features: [loose('e.input.target === "cloud" &&'), loose('re(e.output) !== void 0 &&')] },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration); `imports`
// pin what a local of that chunk must still resolve to.
const callSites = [
  // cf74bc599 tw: the session pane's proposal provider — the pane's inline/snap context (PZ), the spawner context (IZ,
  // null while the pane is inactive), "Sent to this session" (hQe) under the children, and ew for the session. The host
  // writes this provider itself (ProposalHostProvider + ProposalSpawnerContext.Provider around the transcript).
  { source: CF74, binding: 'tw', role: 'Session pane proposal provider: pane context (PZ), spawner context (IZ), SentHereNotice (hQe), ew',
    features: [loose('s(cc.Provider, { value: n, children: p })'), loose('u(Yl.Provider, { value: c, children: [i, d, f] })'), loose('s(xs, { task: l })'),
      loose('sessionRef: r,'), loose('captureGuardedSnapToBottom: n.captureGuardedSnapToBottom,'), loose('onSpawner: o')],
    imports: { cc: [C96, 'PZ'], Yl: [C96, 'IZ'], xs: [C96, 'hQe'] } },
  // cf74bc599 ew: the spawner ZS for the session with the inline cards on, handed to tw; its mode-consent dialog (host:
  // proposal-spawner.mjs confirmMode). The pane gates the inline branch with VZe over the presets flag (Ts(Tr, n), Tr =
  // Bo() = shared-11 gc, claudeai_cc_epitaxy_session_presets_main; D10 on) and mounts hQ (ll) for the unplaced tasks.
  { source: CF74, binding: 'ew', role: 'Spawner host: ZS with inlineCards on; the inline gate VZe, the unplaced group hQ and the presets flag it reads',
    features: [loose('inlineCards: !0'), loose('v.confirming === null'), loose('r(d);')],
    imports: { Ts: [C96, 'VZe'], ll: [C96, 'hQ'], Bo: ['shared-11-_AVGLHEz.js', 'gc'] } },
  // cf74bc599 ZS (2.42304.0: c96d752d0 F1e): the spawner the host replaces (src/proposal-spawner.mjs), with the official
  // pure parts it reads (the roots above: proposalKey, isOfferProposal, the outcome writes, the start permission mode, its
  // consent test and the mode keep; crossRepoCwdOf / proposalHereText / proposalStartLabels are this chunk's own WS / TS / XS).
  { source: CF74, binding: 'ZS', role: 'Spawner (host: proposal-spawner.mjs) and the official helpers it reads',
    features: [loose('hasSuggestions: r,'), loose('inlineCards: a,'), loose('} = e,'), loose('s = a !== void 0 && a,'),
      '?.popBackgroundTaskSuggestionById', 'lastSentHere:'],
    imports: { zs: [C96, 'RZ'], Ms: [C96, 'zZ'], _c: [C96, 'PXe'], Ls: [C96, 'FXe'], zp: [C227, 'FQ'], om: [C227, 'cR'], _p: [C227, 'PQ'] } },
];
// Pinned on the minified bytes (each must occur exactly once in the chunk; {loose} features as a regular expression).
const rawCallSites = [
  // The feed (c96d752d0): a turn's proposing calls become one `turnSuggestions` row at the turn's end (none when the only
  // call was sent here); the queue's leftovers one `unplacedSuggestions` row at the tail; with turnSuggestions on, the
  // proposing calls leave their tool rows (ZM; the host: proposal-group-model.mjs proposalCardToolIds); the row
  // renderer mounts mQ / hQ in a data-find-omitted wrapper.
  { source: C96, role: 'Feed rows: turnSuggestions at the turn end, unplacedSuggestions at the tail, proposing calls hidden, mQ / hQ mounted',
    features: [
      loose('let i=XM(n.items);ue??=i.firstProposingCallId,le.push(...i.tools)'),
      'sentHereSuggestionIds?.includes(',
      's.push({kind:"turnSuggestions",id:`turnSuggestions:${',
      's.push({kind:"unplacedSuggestions",id:`unplacedSuggestions:${',
      loose('case"tools":return!(a.turnSuggestions===!0&&ZM(e,a.hideThinkingItems!==!0))'),
      loose('t.hostDrawsTurnSuggestions===!0&&LM(e)'),
      loose('f("div",{"data-find-omitted":"",className:"contents",children:f(hQ,{sessionRef:r,tasks:t.tasks})})'),
      loose('f(mQ,{sessionRef:r,tools:t.tools})'),
    ] },
  // The session pane (cf74bc599): the inline gate over the presets flag; the floating suggested-task card (CC) only while
  // the gate is off (transcript-03: with presets on it never mounts); hQ (ll) for the unplaced tasks.
  { source: CF74, role: 'Session pane: qr = VZe(presets, session); floating card CC only when !qr; hQ (ll) for unplaced tasks',
    features: [loose('K2($,162,Tr,n,Ts(Tr,n))'),
      loose('Si&&n&&Zr&&!qr&&s(CC,{sessionRef:n,scrollRef:i,captureGuardedSnapToBottom:b},`chip-${t}`)'),
      loose('n&&to.length>0?s(ll,{sessionRef:n,tasks:to}):null')] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default', form: s.type });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') { top.set(d.id.name, { kind: 'var', node: d }); continue; }
        const names = [];
        const walk = x => {
          if (!x) return;
          if (x.type === 'Identifier') names.push(x.name);
          else if (x.type === 'ObjectPattern') x.properties.forEach(p => walk(p.type === 'RestElement' ? p.argument : p.value));
          else if (x.type === 'ArrayPattern') x.elements.forEach(walk);
          else if (x.type === 'AssignmentPattern') walk(x.left);
          else if (x.type === 'RestElement') walk(x.argument);
        };
        walk(d.id);
        for (const n of names) top.set(n, { kind: 'pattern', node: d });
      }
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features) {
  if (!features?.length) throw Error(`${label} has no feature strings`);
  const flat = normalised(text);
  const missing = features.filter(f => (typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !looseFeature(f.loose).test(text)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  // R3: a top-level `local=<namespace>.<member>` of the module's own namespace (`Oo`: the compiler-runtime factory).
  official.assertVendorAlias(src.code, alias, target);
  return target;
}
// D1: the shared view-tabs graph publishes semantic names for (file, local); `held` is every binding it slices.
async function viewTabsGraph() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map(Object.entries(manifest.publicNames ?? {}).map(([name, entry]) => [`${entry.file}#${entry.local}`, name]));
  const held = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b}`)));
  return { published, held };
}
// W12 question-cont (D1): the window attention tracker of shared-10 (wx / Dx / Ix / Bx, read by Fx, which c30607cef i =
// the card's Start button hides its shortcut with) is approval-landing's (window-attention.mjs, window-attention-hook.mjs).
// Any binding a linked module exports is imported from it instead of being cut again; it must come from the very chunk
// bytes read here (sourceSha256) and the module must still match its manifest. A same-chunk binding a linked module holds
// unexported and that is state (a WeakMap / WeakSet / Map / Set) is refused: it would be a second instance.
const linkedDirs = ['approval-landing'];
async function linkedGraph(cache) {
  const exportsByKey = new Map(), heldByKey = new Map();
  for (const dir of linkedDirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} manifest is for another reference version`);
    for (const m of manifest.modules) {
      const src = await readSource(m.source, cache);
      if (sha(src.bytes) !== m.sourceSha256) throw Error(`${dir} ${m.target} was cut from other ${m.source} bytes`);
      if (sha(await fs.readFile(path.join(root, 'src/generated', dir, m.target), 'utf8')) !== m.sha256) throw Error(`${dir} ${m.target} differs from its manifest`);
      for (const [local, name] of Object.entries(m.exports)) exportsByKey.set(`${m.source}#${local}`, { from: `../${dir}/${m.target}`, name });
      for (const b of m.bindings) heldByKey.set(`${m.source}#${b.name}`, `${dir}/${m.target}`);
    }
  }
  // W13 G11 (D1): single modules of other generated graphs that hold originals this closure reaches and export them:
  // routines-shared's shared-0 (Pa lazyInit, AL / jL / ML the control/format character class; no imports, plain node)
  // and session-rail-kit's plain-object.mjs (shared-0 sW isPlainObject, the copy cowork-live and transcript-rows use), and
  // files-changes' loading-flag.mjs (shared-104 Cm).
  // Their manifests may lack `exports` (routines-shared) or list bindings by name: the module's export list names them.
  for (const { dir, target } of linkedModules) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} manifest is for another reference version`);
    const m = manifest.modules.find(x => x.target === target);
    if (!m) throw Error(`${dir} no longer has ${target}`);
    const src = await readSource(m.source, cache);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`${dir} ${target} was cut from other ${m.source} bytes`);
    const text = await fs.readFile(path.join(root, 'src/generated', dir, target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`${dir} ${target} differs from its manifest`);
    const exported = m.exports ?? Object.fromEntries([...text.matchAll(/^export \{([^}]*)\};/gm)].flatMap(x => x[1].split(',').map(v => v.trim()).filter(Boolean))
      .map(spec => { const [local, as] = spec.split(/\s+as\s+/); return [local, as ?? local]; }));
    const names = new Set(m.bindings.map(b => (typeof b === 'string' ? b : b.name)));
    for (const [local, name] of Object.entries(exported)) {
      if (!names.has(local)) continue;
      const key = `${m.source}#${local}`;
      if (!exportsByKey.has(key)) exportsByKey.set(key, { from: `../${dir}/${target}`, name });
    }
    for (const name of names) if (!heldByKey.has(`${m.source}#${name}`)) heldByKey.set(`${m.source}#${name}`, `${dir}/${target}`);
  }
  return { exportsByKey, heldByKey };
}
const linkedModules = [{ dir: 'routines-shared', target: 'shared-0-DDOOdL6P.mjs' }, { dir: 'session-rail-kit', target: 'plain-object.mjs' },
  // shared-104 Cm (withLoadingFlag) is files-changes' loading-flag.mjs (no imports), the copy sessions-page and cowork-progress use.
  { dir: 'files-changes', target: 'loading-flag.mjs' }];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'JSON', 'Symbol', 'Promise', 'RegExp', 'Reflect', 'globalThis', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'parseFloat', 'parseInt',
  'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'isNaN', 'encodeURIComponent', 'window', 'document', 'performance',
  'Uint8Array', 'console']);

export async function extractProposalGroup({ check = false, explore = false } = {}) {
  const cache = new Map();
  const { published, held } = await viewTabsGraph();
  const linked = await linkedGraph(cache);
  const modules = new Map();
  const used = { adapters: new Set(), chunkAdapters: new Set(), contextCopies: new Set() };
  const problems = [];
  const stops = new Map();
  const parents = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 14; k = parents.get(k)) out.push(k); return out.join(' <- '); };
  const fail = message => { if (explore) problems.push(message); else throw Error(message); };
  const moduleFor = file => {
    if (!modules.has(file)) modules.set(file, { file, seen: new Set(), selected: new Map(), imports: new Map(), exportsAs: new Map(), publicNames: new Map(), contexts: [] });
    return modules.get(file);
  };
  async function resolveImport(m, name, entry, via) {
    const { file, alias } = entry, key = `${file}:${alias}`;
    if (entry.form !== 'ImportSpecifier') return fail(`${m.file}#${name}: unsupported import form ${entry.form} of ${file}`);
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) return fail(`${m.file}#${name}: ${key} is not exported`);
    const adapter = adapters[key];
    if (adapter) {
      used.adapters.add(key);
      if (adapter.local !== local) { fail(`adapter ${key} is ${local}, expected ${adapter.local}`); if (!explore) return; }
      const original = dep.top.get(local);
      if (!original || original.kind === 'import') return fail(`adapter ${key} (${local}) is not a declaration`);
      try {
        assertFeatures(`adapter ${key} (${local})`, await featureText(dep, original), adapter.features);
        for (const [other, features] of Object.entries(adapter.also ?? {})) {
          const also = dep.top.get(other);
          if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
          assertFeatures(`adapter ${key} (${other})`, await featureText(dep, also), features);
        }
      } catch (error) {
        if (!explore) throw error;
        problems.push(`${error.message}\n${(await featureText(dep, original)).slice(0, 900)}`);
      }
      m.imports.set(name, { from: adapterModule, name: adapter.name, via: key, kind: 'adapter', original: local });
      return;
    }
    const react = vendorImport(file, alias, dep);
    if (react) { m.imports.set(name, { from: react[0], name: react[1], via: key, kind: 'react' }); return; }
    const shared = published.get(`${file}#${local}`);
    if (shared) { m.imports.set(name, { from: `../view-tabs/${file}`, name: shared, via: key, kind: 'view-tabs', original: local }); return; }
    const link = linked.exportsByKey.get(`${file}#${local}`);
    if (link) { m.imports.set(name, { from: link.from, name: link.name, via: key, kind: 'linked', original: local }); return; }
    if (!files.has(file) || file === VENDOR_FRAME) {
      m.imports.set(name, { from: '?', name: alias, via: key, kind: 'missing' });
      if (explore && process.env.OPEN === '1') {
        const decl = dep.top.get(local);
        const text = decl && decl.kind !== 'import' ? (await featureText(dep, decl)).slice(0, +(process.env.SNIP ?? 400)) : String(decl?.kind === 'import' ? `import ${decl.file}:${decl.alias}` : 'missing');
        if (!stops.has(key)) stops.set(key, { local, via: chain(`${m.file}#${name}`), text });
        return;
      }
      return fail(`${m.file}#${name} would enter ${file}: ${key} = ${local}; add an adapter or list the chunk (${chain(`${m.file}#${name}`)})`);
    }
    const target = moduleFor(file);
    if (target.exportsAs.has(local) && target.exportsAs.get(local) !== alias) return fail(`${file}#${local} exported twice`);
    target.exportsAs.set(local, alias);
    m.imports.set(name, { from: `./${file}`, name: alias, via: key, kind: 'generated', original: local });
    await add(target, local, `${m.file}#${name}`);
  }
  async function add(m, name, via) {
    if (m.seen.has(name)) return;
    m.seen.add(name);
    if (!parents.has(`${m.file}#${name}`)) parents.set(`${m.file}#${name}`, via);
    const src = await readSource(m.file, cache);
    const entry = src.top.get(name);
    if (!entry) return fail(`${m.file}: unbound ${name} (via ${via})`);
    if (entry.kind === 'import') return resolveImport(m, name, entry, via);
    const key = `${m.file}#${name}`;
    const own = chunkAdapters[key];
    if (own) {
      used.chunkAdapters.add(key);
      try { assertFeatures(`chunk adapter ${key}`, await featureText(src, entry), own.features); }
      catch (error) { if (!explore) throw error; problems.push(`${error.message}\n${(await featureText(src, entry)).slice(0, 900)}`); }
      m.imports.set(name, { from: adapterModule, name: own.name, via: key, kind: 'adapter', original: name });
      return;
    }
    const shared = published.get(key);
    if (shared) {
      if (m.publicNames.has(name)) return fail(`root ${key} is view-tabs ${shared}; import it from there`);
      m.imports.set(name, { from: `../view-tabs/${m.file}`, name: shared, via: key, kind: 'view-tabs', original: name });
      return;
    }
    const link = linked.exportsByKey.get(key);
    if (link) { m.imports.set(name, { from: link.from, name: link.name, via: key, kind: 'linked', original: name }); return; }
    if (entry.kind === 'pattern') return fail(`${key}: destructuring declaration (${chain(key)})`);
    const text = declarationText(src, entry);
    if (linked.heldByKey.has(key) && /\bnew (?:WeakMap|WeakSet|Map|Set)\b/.test(text))
      return fail(`${key}: state ${linked.heldByKey.get(key)} holds unexported would be a second instance (via ${via})`);
    if (/\bimport\s*\(/.test(text)) return fail(`${key}: dynamic import (via ${via})`);
    if (entry.kind === 'var' && entry.node.init?.type === 'CallExpression' && entry.node.init.callee.type === 'Identifier') {
      const callee = src.top.get(entry.node.init.callee.name);
      if (callee?.kind === 'import' && vendor[callee.file]?.[callee.alias]?.[1] === 'createContext') {
        m.contexts.push(name);
        if (held.has(key)) {
          if (!contextCopies[key]) fail(`${key}: context view-tabs also instantiates would be a second instance (via ${via}); list it in contextCopies with the reason, or adapt it`);
          else used.contextCopies.add(key);
        }
      }
    }
    m.selected.set(name, entry);
    for (const dep of declarationDeps(src, name)) await add(m, dep, key);
  }

  for (const r of roots) {
    const src = await readSource(r.source, cache);
    const entry = src.top.get(r.local);
    if (!entry || entry.kind === 'import' || entry.kind === 'pattern') { fail(`root ${r.name}: ${r.source}#${r.local} is not a declaration`); continue; }
    if (r.export !== undefined && src.exported.get(r.export) !== r.local) fail(`root ${r.name}: ${r.source} exports ${r.export} as ${src.exported.get(r.export)}, not ${r.local}`);
    try { assertFeatures(`root ${r.name} (${r.source}#${r.local})`, await featureText(src, entry), r.features); }
    catch (error) { if (!explore) throw error; problems.push(`${error.message}\n${(await featureText(src, entry)).slice(0, 600)}`); }
    const m = moduleFor(r.source);
    if (m.publicNames.has(r.local)) fail(`root ${r.name}: ${r.local} is already ${m.publicNames.get(r.local)}`);
    m.publicNames.set(r.local, r.name);
    await add(m, r.local, 'root');
  }
  for (const key of Object.keys(adapters)) if (!used.adapters.has(key)) fail(`adapter ${key} is no longer reached; drop it`);
  for (const key of Object.keys(chunkAdapters)) if (!used.chunkAdapters.has(key)) fail(`chunk adapter ${key} is no longer reached; drop it`);
  for (const key of Object.keys(contextCopies)) if (!used.contextCopies.has(key)) fail(`contextCopies ${key} is no longer copied; drop it`);
  for (const file of files) if (!modules.has(file)) fail(`chunk ${file} is listed but no longer entered; drop it`);

  if (explore) {
    let total = 0;
    for (const m of modules.values()) {
      const src = await readSource(m.file, cache);
      const bytes = [...m.selected].reduce((n, [, e]) => n + emittedText(src, e).length, 0);
      total += bytes;
      console.log(`${m.file}: ${m.selected.size} bindings, ${bytes} B${m.contexts.length ? `, contexts ${m.contexts.join(' ')}` : ''}`);
    }
    console.log(`total ${total} B in ${modules.size} modules`);
    // Diagnostics for a version bump: LIST=<chunk prefixes> prints a module's bindings with what reached each one,
    // ENTRY=<chunk prefixes> where the closure entered those chunks from.
    for (const f of (process.env.LIST ?? '').split(',').filter(Boolean))
      for (const m of modules.values()) if (m.file.startsWith(f)) console.log(`LIST ${m.file}: ${[...m.selected.keys()].map(n => `${n}<-${String(parents.get(`${m.file}#${n}`)).replace(m.file, '')}`).join(' ')}`);
    for (const f of (process.env.ENTRY ?? '').split(',').filter(Boolean))
      for (const [k, v] of parents) if (k.startsWith(f) && !String(v).startsWith(f) && modules.get(k.split('#')[0])?.selected.has(k.split('#')[1])) console.log(`ENTRY ${k} <- ${v}`);
    for (const f of (process.env.DUMP ?? '').split(',').filter(Boolean))
      for (const m of modules.values()) if (m.file.startsWith(f)) for (const [local, e] of m.imports) console.log(`DUMP ${m.file} ${local} <- ${e.kind} ${e.via} ${e.name}${e.original ? ` (${e.original})` : ''}`);
    for (const [key, s] of stops) console.log(`STOP ${key} = ${s.local}  (${s.via})\n${s.text}\n`);
    console.log(problems.join('\n---\n'));
    return null;
  }

  const files_ = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-proposal-group.mjs', adapterModule: 'src/source-proposal-group-adapters.jsx',
    publicNames: {}, modules: [], callSites: [],
  };
  const order = [...modules.values()].sort((a, b) => a.file.localeCompare(b.file));
  for (const m of order) {
    const src = await readSource(m.file, cache);
    const selected = [...m.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const groups = new Map();
    for (const [local, entry] of m.imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const exportNames = new Map();
    for (const [local, alias] of m.exportsAs) exportNames.set(alias, local);
    for (const [local, name] of m.publicNames) {
      if (exportNames.has(name) && exportNames.get(name) !== local) throw Error(`${m.file}: export ${name} collides`);
      exportNames.set(name, local);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${[...exportNames].map(([name, local]) => (name === local ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${m.file}; generated by extract-proposal-group.mjs.\n// Edit the extractor or src/source-proposal-group-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${selected.map(([, e]) => emittedText(src, e)).join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, m.file, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${m.file}: unbound ${unbound.join(', ')}`);
    files_[m.file] = text;
    for (const [local, name] of m.publicNames) {
      const r = roots.find(x => x.source === m.file && x.local === local);
      manifest.publicNames[name] = { file: m.file, local, ...(r.export ? { export: r.export } : {}) };
    }
    manifest.modules.push({
      source: m.file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: selected.map(([name, e]) => ({ name, sha256: sha(declarationText(src, e)) })),
      imports: [...m.imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: Object.fromEntries(m.exportsAs), publicNames: Object.fromEntries(m.publicNames), contexts: m.contexts,
    });
  }
  const byFile = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames)) {
    if (!byFile.has(entry.file)) byFile.set(entry.file, []);
    byFile.get(entry.file).push(name);
  }
  files_['index.mjs'] = await format(`// The proposal group card's public names (manifest publicNames); generated by extract-proposal-group.mjs.\n`
    + [...byFile].map(([file, names]) => `export { ${names.join(', ')} } from ${JSON.stringify(`./${file}`)};`).join('\n') + '\n', { parser: 'babel' });
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import' || entry.kind === 'pattern') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    const text = await featureText(src, entry);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const imp = src.top.get(local);
      if (imp?.kind !== 'import') throw Error(`call site ${site.source}:${site.binding}: ${local} is not an import`);
      const dep = await readSource(imp.file, cache);
      const target = dep.exported.get(imp.alias);
      if (imp.file !== file || target !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${imp.file}:${target}, expected ${file}:${expected}`);
      imports[local] = `${file}:${imp.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features, imports });
  }
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files_['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files_).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Proposal group output set changed: ${present.join(',')}. Run scripts/extract-proposal-group.mjs.`);
    for (const [name, text] of Object.entries(files_))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Proposal group source mismatch: ${name}. Run scripts/extract-proposal-group.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files_)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files_)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} proposal group modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} public names, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractProposalGroup({ check: process.argv.includes('--check'), explore: process.argv.includes('--explore') });
