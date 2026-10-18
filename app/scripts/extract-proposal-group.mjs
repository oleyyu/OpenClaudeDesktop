// R4f-proposal P1 (tasks-proposal-group-card WI-1; tasks-03 / tasks-04 / tasks-11 / toolcards-20 / transcript-03): extract
// the 2.42304.0 transcript proposal group card without executing any desktop runtime (decision D0: own generator, own
// output folder src/generated/proposal-group, own scripts/verify-gen-proposal-group.mjs).
//
//   c96d752d0 R$ / z$     the turn's suggested-task group (`turnSuggestions` feed row: H1e turns the turn's spawn_task /
//                          start_session calls into items, unavailable calls fall back to the tool card Uz) and the
//                          unplaced one (`unplacedSuggestions`: S$ over queued tasks no tool row carries); both render
//                          B$, the group card: "{count} suggested tasks" / "{count} started" / Start all (u0e's 400 ms
//                          guard after a new task joins), one c0e row per task (s0e: title → prompt preview popover, X,
//                          Options popover = c227f4d5e pq, Do it here / Start), Show {count} more past 6 (N$ = 5).
//   c96d752d0 qQ / h1e    the spawner context the card reads (the host provides an F1e-shaped spawner:
//                          src/proposal-spawner.mjs); g1e the inline-card gate; q1e "Sent to this session".
//   c96d752d0 pure parts  t$ / n$ / p$ / f$ / w1e / P1e (the spawner's key, offer test, mode keep, cross-repo cwd, the "Do it
//                          here" text, the start labels), pL / hL / gL / mL / PPe (which tool calls propose, their task ids),
//                          EQ / MQ / NQ (the per-parent outcome store the rows read).
//   c227f4d5e             zG / AI (start permission mode, consent), YW / JW / tG / nG (the spawning set) and, through the
//                          closure, pq / sq / cq / XG / ZG / kG / … (the Options form, its resolver and the row stores).
//   c8479260c / cb27dab29 the session tool names, task-id patterns and the tool predicates pL reads.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. Bindings are the reachable
// closure of the roots: a declaration's dependencies are its free variables (each declaration is parsed on its own and
// Babel's scope analysis names what it reads from outside). An import resolves, in this order, to: a host adapter in
// src/source-proposal-group-adapters.jsx (keyed by the imported chunk and export name; its original declaration must
// still carry `features`), a verified React export of vendor-frame, a semantic public name of the shared view-tabs graph
// (D1/D24: CdsButton, CdsIcon, CdsPopover, CdsSwitch, CdsShimmer, CdsDropdown, …), or the same original declaration
// sliced from its own chunk into this folder, one module per chunk (`<chunk>.js`, exported under the chunk's own export
// name). The closure may only enter the chunks listed in `files`; leaving them is an error, so a new dependency of the
// installed source is reviewed instead of silently copied. A React context (createContext) that view-tabs also holds is
// refused unless `contextCopies` says why a second instance is harmless, and an adapter, chunk adapter or context copy
// that the closure no longer reaches is an error too.
//
// Consumers import the semantic names from index.mjs (`publicNames` in the manifest), never the minified ones.
// `callSites` pin the original text the host wiring follows but cannot import: where the feed puts the two rows, the
// session pane's spawner provider (Lb / Ib) and the floating-card branch it replaces (Xx), and the spawner F1e itself
// (not extracted; the host's proposal-spawner.mjs keeps its local-parent behaviour).
//
// `node scripts/extract-proposal-group.mjs` writes the folder, `--check` compares it (scripts/verify-gen-proposal-group.mjs),
// `--explore` lists the closure and every problem at once without writing (for a version bump).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/proposal-group');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-proposal-group-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';

// Every chunk the closure may enter (besides the adapters, React and the view-tabs names it resolves to). Leaving it is
// an error, and so is a listed chunk the closure no longer enters.
const files = new Set([
  // The card (c96d752d0), the Options form and its stores (c227f4d5e), the tool names / predicates (c8479260c, cb27dab29).
  'c96d752d0-BOCqU7c2.js', 'c227f4d5e-Ba-r--Rl.js', 'c8479260c-DaoJ9_2S.js', 'cb27dab29-_H2_XKli.js',
  // Pure helpers, message tables and the small stores those read (zustand from vendor-all-0, defineMessages from
  // vendor-intl, the design tokens c25d7186f, the prompt preview text c5b9e310e / ca0294fab, the session row parts
  // cce2a382f / c5ef5b59f / c425fb3cf, the state labels and F5 of shared-19, …).
  'shared-0-ByI5P0CP.js', 'shared-2-Cb74JByF.js', 'shared-3-DnHYUZdJ.js', 'shared-8-B5lJ8U5C.js', 'shared-10-THQui8pC.js', 'shared-11-BuQ3CK5I.js',
  'shared-14-u0TSV9dR.js', 'shared-18-D4XxL6Tg.js', 'shared-19-CkPOiIKm.js', 'shared-20-B7UqYfsi.js', 'shared-25-DP8p7i1Z.js', 'shared-28-DcgD7xXH.js',
  'shared-52-DGviI8xb.js', 'shared-78-D6VXYXaQ.js', 'shared-104-Cqo2-vQh.js', 'shared-156-Bikz018e.js', 'shared-182-eT1kXtya.js',
  'shared-frame-BfjMqbuN.js', 'vendor-all-0-CTKbbUUg.js', 'vendor-intl-Db7hDWRO.js',
  'c02b04696-cOrTvyA6.js', 'c0fbbe82d-BOWKSems.js', 'c1014d784-CjhgsLFi.js', 'c19e90103-muBq-gyt.js', 'c25d7186f-CHE_J2eY.js', 'c261da744-C3mLYxc0.js',
  'c30607cef-BIoa7ymu.js', 'c425fb3cf-CEgSkv8l.js', 'c5b9e310e-Dljk8moA.js', 'c5ef5b59f-KVN_22_J.js', 'c63c52947-BXzWWrtE.js', 'c81ea1931-ChuE7vym.js',
  'c8f38bf1f-D_EZalnr.js', 'ca0294fab-CYDhVWyX.js', 'cce2a382f-BE7lq0In.js', 'ce2d07062-DyoM1ZV4.js',
]);

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  [VENDOR_FRAME]: {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], Ba: ['react', 'Fragment'], Ja: ['react', 'Fragment'], eo: ['react', 'createContext'],
    do: ['react', 'useContext'], lo: ['react', 'use'], go: ['react', 'useId'], ro: ['react', 'forwardRef'], wo: ['react', 'useSyncExternalStore'],
    to: ['react', 'createElement'], io: ['react', 'isValidElement'], xo: ['react', 'useReducer'], co: ['react', 'startTransition'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
    // `s=o.default`: the React namespace zustand's useStore reads useSyncExternalStore / useDebugValue from.
    so: ['react', 'default'], ho: ['react', 'useEffectEvent'],
  },
};

// Host dependencies, keyed by the imported chunk and export name. `local` is the declaration the export must still name;
// `features` must appear in that declaration's prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  // ---- what the card reads from the host (ProposalHost, the toasts, the intl catalog)
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-Db7hDWRO.js:p': { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'],
    also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
  'vendor-intl-Db7hDWRO.js:l': { name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'],
    also: { Wt: ['let { formatMessage: r, textComponent: i = n } = q(),'] } },
  // shared-8 Q / xm: the session store (hook and getState) and its session patch. Host: ProposalHost.sessions; no stored
  // queue order to patch.
  'shared-8-B5lJ8U5C.js:Wd': { name: 'useSessionsStore', local: 'Q',
    features: ['name: "ccd-sessions-filter",', 'sessions: [],', 'partialize: (e) => ({ selectedProjects: e.selectedProjects }),'] },
  'shared-8-B5lJ8U5C.js:hd': { name: 'updateSession', local: 'xm',
    features: ['let n = Q.getState().sessions.findIndex((t) => t.sessionId === e);', 'let r = { ...e.sessions[n], ...t };'] },
  // shared-11 Vm: the sessions waiting on the user (pending permission requests). Host: ProposalHost.needsInput.
  'shared-11-BuQ3CK5I.js:Un': { name: 'useSessionsNeedingInput', local: 'Vm', features: ['.filter((e) => e.isRunning)', 'a.status === "pending" &&'] },
  // shared-52 Sj: the ErrorsProvider (B$'s addInfo for "start-all-left-out"). Host: source-toast.jsx.
  'shared-52-DGviI8xb.js:Ya': { name: 'useErrors', local: 'Sj', features: ['Error("Must be called within ErrorsProvider")'] },
  // shared-52 $p: the guarded localStorage kQ persists sent_here in. Host: a window-lifetime storage (the outcomes
  // persist in the host config, R4f-proposal P4).
  'shared-52-DGviI8xb.js:up': { name: 'sentHereStorage', local: '$p', features: ['$p = Qp(() => On("localStorage"), "local_storage", Zp)'] },
  // shared-78 uH / dH / fH: the appFeatures sideSessionProposalPicks / WorktreePick / OfferCloudStart.
  'shared-78-D6VXYXaQ.js:fs': { name: 'useProposalPicks', local: 'uH', features: ['return Z()?.sideSessionProposalPicks?.status === "supported";'] },
  'shared-78-D6VXYXaQ.js:ps': { name: 'useProposalWorktreePick', local: 'dH', features: ['return Z()?.sideSessionProposalWorktreePick?.status === "supported";'] },
  'shared-78-D6VXYXaQ.js:ds': { name: 'useOfferCloudStart', local: 'fH', features: ['return Z()?.sideSessionOfferCloudStart?.status === "supported";'] },
  // c26fb8b6b xn: open a session (BQ, the started task's row). Host: ProposalHost.openSession.
  'c26fb8b6b-DfPeiuGP.js:o': { name: 'useOpenSession', local: 'xn', features: ['let u = { kind: "code", id: l.id };', 'entryPoint: "cmd_click",'] },
  // c19e90103 Ix: the epitaxy Markdown (the prompt preview popover). Host: ProposalHost.renderMarkdown.
  'c19e90103-muBq-gyt.js:t': { name: 'TaskPromptMarkdown', local: 'Ix', features: ['componentName: "EpitaxyAlluviumMarkdown",', 'typography: s = "epitaxy",'] },
  // ---- the Options form's model, effort and mode sources
  // shared-1 FP: the model catalog (nameFor / hasModel / effortOptionsFor / requiresAutoMode). Host: model/list.
  'shared-1-CAAiD7E3.js:Yr': { name: 'useModelCatalog', local: 'FP', features: ['storedModel: o,', 'resolvedModel: s,', 'setStoredModel: a.setModel,'] },
  // shared-6 $j / mj: auto mode availability, and the official effort ids filter. Host: the kernel's auto, its own levels.
  'shared-6-Cby4X-ms.js:pa': { name: 'useAutoModeAvailability', local: '$j',
    features: ['i = us().permission_modes.available;', 'return t ? n : i === void 0 ? r : i.includes("auto") ? n : Qj;'] },
  'shared-6-Cby4X-ms.js:xa': { name: 'supportedEffortOptions', local: 'mj', features: ['let t = lj.safeParse(e.id);', '(t.data === "xhigh" && !aj())'] },
  // c74045701 o: the effort labels (Low … Max); the host's other levels are named as its composer names them.
  'c74045701--mqv8P-_.js:n': { name: 'effortMessages', local: 'o', features: ['low: { defaultMessage: "Low", id: "477I0ggSYe" },',
    'medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },', 'high: { defaultMessage: "High", id: "AxMhQrcUDC" },',
    'xhigh: { defaultMessage: "Extra high", id: "kDEj60CmLq" },', 'max: { defaultMessage: "Max", id: "kkjl2vQekD" },'] },
  // shared-7 Tx: the CDS ModelSelector parts fq renders (Trigger / Popup / Effort). Host: CdsDropdown menus (with LK).
  'shared-7-B8UIMGDr.js:Bi': { name: 'ModelSelectorParts', local: 'Tx', features: ['Root: bx,', 'Trigger: xx,', 'Popup: Sx,', 'List: gx,', 'Effort: Cx,'] },
  // shared-52 RP / zP: the desktop config (remote permission_modes, error vocabulary). Host: none narrowed.
  'shared-52-DGviI8xb.js:Fi': { name: 'useDesktopConfig', local: 'RP', features: ['return IP(PP(St(), e), !ei(), AP());'] },
  'shared-52-DGviI8xb.js:Mi': { name: 'getDesktopConfig', local: 'zP', features: ['return LP(PP(Jt(), e), !ln(), e ? xP() : void 0);'] },
  // shared-25 Zs: a GrowthBook feature (ccr_plan_mode_enabled; c5ef5b59f's __gb__3627956258). Host: off (D29 / D31).
  'shared-25-DP8p7i1Z.js:Th': { name: 'useGrowthBookFlag', local: 'Zs', features: ['return Rs(I(e)).on;'] },
  // shared-25 ml: the Claude desktop client test (tK's "ccd" surface). Host: yes.
  'shared-25-DP8p7i1Z.js:Rm': { name: 'isDesktopClient', local: 'ml', features: ['let a = se(window.navigator.userAgent, { version: e, platform: t });'] },
  // ---- account, cloud and side-session services the host does not have (inert answers)
  // shared-25 cV: the claude.ai account context (c1014d784's environment scope). Host: none.
  'shared-25-DP8p7i1Z.js:ur': { name: 'useAccount', local: 'cV', features: ['cV = () => g(Qz)'], also: { Qz: ['Qz = _(null)'] } },
  // shared-19 cV: star a cloud environment (the cloud submenu). No cloud environments.
  'shared-19-CkPOiIKm.js:al': { name: 'toggleStarredEnvironment', local: 'cV', features: ['let { starredIds: n, toggleStarred: r } = XB.getState();'],
    also: { XB: ['XB = Rl("epitaxy-starred-environments", { maxIds: 10 })'] } },
  // shared-0 Ix: globalThis["claude.web"]?.LocalSessions, which g1e asks for popBackgroundTaskSuggestionById. Host: the
  // capability marker (the host spawner pops through proposal-launch.mjs).
  'shared-0-ByI5P0CP.js:Om': { name: 'desktopBridge', local: 'Ix', features: ['Ix = globalThis["claude.web"]?.LocalSessions'] },
  // c856385e2 Qt: the split view's side-session opener. None here.
  'c856385e2-DVsjb2QL.js:rt': { name: 'useSideSessionOpener', local: 'Qt', features: ['return l(Xt);'], also: { Xt: ['Xt = c(null)'] } },
  // cbb72cde9 Rn / shared-18 eO / shared-20 LE, tD / shared-14 Ft: the started session's chip, PR state, PR and cloud
  // environment chips, error copy. The host has none of these for a session row.
  'cbb72cde9-Rl7dDg4Y.js:A': { name: 'useSessionChip', local: 'Rn', features: ['r = t?.signals.working === !0 && t.signals.machine !== "disconnected",', 'explicitUnread: w,'] },
  'shared-18-D4XxL6Tg.js:rs': { name: 'useSessionPrState', local: 'eO', features: ['prState: ZT({ aggregated: h, type: t, cachedPrState: d?.prState }),', 'reportedByList: a = !1,'] },
  'shared-20-B7UqYfsi.js:Pt': { name: 'SessionPrChip', local: 'LE', features: ['f(ZE, { pr: e, place: "word" }),', '"flex shrink-0 items-center gap-1 whitespace-nowrap"'] },
  'shared-20-B7UqYfsi.js:Ht': { name: 'SessionEnvChip', local: 'tD', features: ['children: f(QE, { env: e, named: !0 }),'] },
  'shared-14-u0TSV9dR.js:M': { name: 'errorCopy', local: 'Ft', features: ['title: e.formatMessage(B.generic),', 'isKnownCategory: !1,'] },
  // shared-78 CJ / shared-25 sm: the session's route href and its hover preload handlers. No routes here.
  'shared-78-D6VXYXaQ.js:dr': { name: 'useSessionHref', local: 'CJ', features: ['return w((t, n) => `${e}/${encodeURIComponent(t)}`, [e]);'] },
  'shared-25-DP8p7i1Z.js:_f': { name: 'routePreloadProps', local: 'sm', features: ['if (e === null && t === void 0) return om;'],
    also: { om: ['onPointerEnter: () => void 0,', 'onBlur: () => void 0,'] } },
  // shared-frame Ya / Xa: the CDS layer's owner window, and whether it is another window. The current window.
  'shared-frame-BfjMqbuN.js:mu': { name: 'useLayerOwnerWindow', local: 'Ya', features: ['return Ji(W(Oa));'] },
  'shared-frame-BfjMqbuN.js:bu': { name: 'useLayerInOtherWindow', local: 'Xa', features: ['let e = Ya();', 'return e !== void 0 && e !== globalThis.window;'] },
  // ---- start_session offers only (D29: off here, unreachable from a spawn_task card)
  // shared-25 na / Jf, shared-156 Qf: AppPreferences ("Don't ask again"), the router and the settings page store.
  'shared-25-DP8p7i1Z.js:mg': { name: 'appPreferences', local: 'na', features: ['na = globalThis["claude.settings"]?.AppPreferences'] },
  'shared-25-DP8p7i1Z.js:Wf': { name: 'useAppRouter', local: 'Jf', features: ['push: (n, i) => {', 'replace: (n, i) => {', 'back: () => (r ? r.back() : window.history.back()),'] },
  'shared-156-Bikz018e.js:Ch': { name: 'settingsPageStore', local: 'Qf', features: ['highlightLabel: void 0,', 'open: (n = bf("untargeted"), r, i) => {'] },
  // ccbc7e432 O / ccae33cda Dt: the offer card's keyboard chords and their own-composer test.
  'ccbc7e432-DL0JgV8Z.js:t': { name: 'useOfferChords', local: 'O', features: ['let { enabled: k, cardRootRef: A, escapeOnly: j, armKey: M } = O,', 'if (n.key === "Escape") {'] },
  'ccae33cda-DCEu0VuC.js:y': { name: 'isOwnComposer', local: 'Dt', features: ['return !e || e.closest(".epitaxy-prompt") === null ? !1 : Tt(e) === Tt(t);'] },
  // ---- telemetry (D17: nothing is sent)
  'c68c4283d-CPuRD0vx.js:Dd': { name: 'logProposalStart', local: 'kd', features: ['"claudeai.code.side_session.proposal_card_started",'] },
  'c68c4283d-CPuRD0vx.js:Ed': { name: 'logProposalImpression', local: 'Od', features: ['"claudeai.code.side_session.proposal_card_shown",'] },
  'c68c4283d-CPuRD0vx.js:Td': { name: 'logProposalDismiss', local: 'Ad', features: ['"claudeai.code.side_session.proposal_card_dismissed",'] },
  'shared-1-CAAiD7E3.js:rc': { name: 'useExposureOnce', local: 'Tw', features: ['i.current || ((i.current = !0), t());', 'if (!r.getState().hidden) {'] },
};
// Same-chunk declarations the host answers (the declaration itself must carry `features`).
const chunkAdapters = {
  // Uz: the transcript's generic tool row (JIe through the engine row override `epitaxyEngineToolRow`), what a proposal
  // that cannot be a card falls back to. Here: the host's own tool row (ProposalHost.renderToolFallback).
  'c96d752d0-BOCqU7c2.js#Uz': { name: 'ProposalToolFallback', features: ['(e) => e.epitaxyEngineToolRow,', '(e) => M(e, $Ie),'] },
  // LK: the epitaxy CDS model selector (shared-8 WF over the official model catalog, shared-7 Tx parts) the Options form's
  // Model / Effort rows (fq) render through `children(parts)`. Here: the host's model list and effort levels.
  'c227f4d5e-Ba-r--Rl.js#LK': { name: 'ProposalModelSelector', features: ['"data-testid": "epitaxy-cds-model-selector",', 'return D(Xu, {', 'triggerVariant: "pill",', 'children: te,'] },
};
// React contexts view-tabs also instantiates that this graph may own a second instance of, with the reason.
const contextCopies = {};

// Roots, each exported under a semantic name from index.mjs. `export` (when the chunk exports it) must name `local`;
// `features` pin the declaration's prettier form.
const roots = [
  // The turn's group (feed `turnSuggestions` row) and the unplaced one (feed tail `unplacedSuggestions`).
  { source: 'c96d752d0-BOCqU7c2.js', local: 'R$', name: 'TurnProposalGroup',
    features: ['cardKey: `${t.id}:${e[0]?.id ?? ""}`,', 'r.state === "unavailable" && r.tool !== void 0', 'i.map((e) => b(Uz, { tool: e }, e.id)),'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'z$', export: 'rt', name: 'UnplacedProposalGroup',
    features: ['cardKey: `${t.id}:unplaced:${e[0]?.id ?? ""}`,', 'let n = S$(e, t.id),'] },
  // The spawner context the card reads (h1e) and the inline-card gate (presets main && local session && the bridge can pop by id).
  { source: 'c96d752d0-BOCqU7c2.js', local: 'qQ', export: 'mt', name: 'ProposalSpawnerContext',
    features: ['qQ = E(null)'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'h1e', name: 'useProposalSpawner',
    features: ['return T(qQ);'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'g1e', export: 'ht', name: 'inlineSpawnerGate',
    features: ['e && t?.type === "local" && $e?.popBackgroundTaskSuggestionById !== void 0'] },
  // "Sent to this session" / "Still suggested" announcement of the spawner's lastSentHere.
  { source: 'c96d752d0-BOCqU7c2.js', local: 'q1e', export: 'it', name: 'SentHereNotice',
    features: ['e.back ? w$.stillSuggested : w$.sentHere', 'b(E$, { regionRef: n })'] },
  // Pure parts of the spawner F1e (src/proposal-spawner.mjs takes them as `official`).
  { source: 'c96d752d0-BOCqU7c2.js', local: 't$', export: 'ct', name: 'proposalKey',
    features: ['return e.id ?? e.prompt;'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'n$', name: 'isOfferProposal',
    features: ['return e.offer === !0 && e.autoStart !== "cloud";'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'p$', name: 'keepSessionMode',
    features: ['if (!(t && !j1e.has(e ?? ""))) return e;'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'f$', export: 'st', name: 'crossRepoCwdOf',
    features: ['i !== "" && i !== r(t) && i !== r(n ?? "")'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'w1e', name: 'proposalHereText',
    features: ['return n(e.formatMessage(C1e.turn, { title: n(r) }));', 'XQ(t.title) ||'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'P1e', name: 'proposalStartLabels',
    features: ['defaultMessage: "Start with worktree", id: "i/rNItpPCW",', 'defaultMessage: "Start locally", id: "HlsEbl3CKu",', 'defaultMessage: "Send to cloud", id: "VfdzzfbVPP",', 'defaultMessage: "Do it here", id: "qNy7sbs812",'] },
  // Which tool calls propose a task and their task ids (the feed builder's PPe / hL / gL; pL / mL the row state reads).
  { source: 'c96d752d0-BOCqU7c2.js', local: 'PPe', name: 'proposingTools',
    features: ['return n === void 0 ? NPe : { tools: t ?? SL, firstProposingCallId: n };'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'hL', name: 'isProposingTool',
    features: ['e.input.initiation === "own_initiative" &&'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'gL', name: 'isPlacedProposal',
    features: ['return hL(e) && pL(e) !== void 0;'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'pL', name: 'proposalTaskId',
    features: ['return w_(e.name) ? Nh(e.output) : T_(e) || R_(e) ? Ph(e.output) : void 0;'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'mL', name: 'proposalToolFailed',
    features: ['e.status === "error" ||', 'e.interrupted === !0'] },
  // The per-parent outcome store (dismissed / kept_here / sent_here / start_failed) the rows read; MQ / NQ write it.
  { source: 'c96d752d0-BOCqU7c2.js', local: 'EQ', name: 'proposalOutcomeStore',
    features: ['EQ = pc(() => ({ byParent: {} }))'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'MQ', export: 'gt', name: 'recordProposalOutcome',
    features: ['n === "sent_here" ? AQ(e, (e) => ({ ...e, [t]: n })) : jQ(e, t)'] },
  { source: 'c96d752d0-BOCqU7c2.js', local: 'NQ', name: 'clearProposalOutcome',
    features: ['if (r?.[t] === void 0) return n;'] },
  // c227f4d5e: the start's permission mode (zG, imported by F1e as ff) and its consent test (AI, as Jf); the spawning
  // set (YW / JW / tG / nG, as cde / lle / mf / rue) the rows read to show "Starting…".
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'zG', export: 'In', name: 'resolveStartPermissionMode',
    features: ['let i = e?.permissionMode,', 'if (i === void 0 || !t) return i ?? r;'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'AI', export: 'ro', name: 'startModeNeedsConsent',
    features: ['return e === "bypassPermissions" || (e === "auto" && !0);'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'YW', export: 'tr', name: 'visibleProposalQueue',
    features: ['return t.size === 0 ? n : n.filter((e) => e.id === void 0 || !t.has(e.id));'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'JW', export: 'Gn', name: 'spawningTaskIds',
    features: ['let t = GW.getState().byParent[e];'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'tG', export: 'Jn', name: 'markProposalSpawning',
    features: ['KW(e, (e) => (e.includes(t) ? e : [...e, t]));'] },
  { source: 'c227f4d5e-Ba-r--Rl.js', local: 'nG', export: 'Zn', name: 'clearProposalSpawning',
    features: ['backgroundTaskSuggestions: [...n.slice(0, r), ...n.slice(r + 1), n[r]],'] },
  // c8479260c: the session tool names and task-id patterns.
  { source: 'c8479260c-DaoJ9_2S.js', local: 'e', export: 't', name: 'PROPOSAL_SESSION_SERVER',
    features: ['e = "ccd_session"'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'r', export: 'l', name: 'SPAWN_TASK_TOOL',
    features: ['r = `mcp__${e}__${t}`'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'i', export: 'r', name: 'DISMISS_TASK_TOOL',
    features: ['i = `mcp__${e}__${n}`'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 's', export: 'u', name: 'START_SESSION_TOOL',
    features: ['s = `mcp__${e}__${a}`'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'h', export: 's', name: 'TASK_ID_PATTERN',
    features: ['h = /^task_[0-9a-f]{8}$/'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'C', export: 'm', name: 'taskIdFromResult',
    features: ['return e?.match(S)?.[1];'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'd', export: 'p', name: 'lastTaskIdFromResult',
    features: ['for (let n of e.matchAll(u)) t = n[1];'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'x', export: 'g', name: 'taskIdLine',
    features: ['return `task_id: ${e}`;'] },
  { source: 'c8479260c-DaoJ9_2S.js', local: 'b', export: 'h', name: 'quotedTaskTitle',
    features: ['.replace(/task_id/gi, "task id")', '.slice(0, 120);'] },
  // cb27dab29: spawn_task, and the start_session calls pL reads a task id from.
  { source: 'cb27dab29-_H2_XKli.js', local: 'W', export: 'S', name: 'isSpawnTaskTool',
    features: ['return e === Ge;'] },
  { source: 'cb27dab29-_H2_XKli.js', local: 'K', export: 'T', name: 'isOwnStartSessionProposal',
    features: ['(e.input.initiation === "own_initiative" ||', 'c(e.output) === void 0'] },
  { source: 'cb27dab29-_H2_XKli.js', local: 'Je', export: 'l', name: 'isCloudStartSessionHandOff',
    features: ['e.input.target === "cloud" &&', 'ie(e.output) !== void 0 &&'] },
];

// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration); `imports`
// pin what a local of that declaration must still resolve to.
const callSites = [
  // cf74bc599 Lb: the session pane's proposal provider — its host context (Sc), the spawner context (qQ, null while the
  // pane is inactive), "Sent to this session" (q1e) under the children, and Ib for the session. The host writes this
  // provider itself (ProposalHostProvider + ProposalSpawnerContext.Provider around the transcript).
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'Lb', role: 'Session pane proposal provider: host context, spawner context (qQ), SentHereNotice (q1e), Ib',
    features: ['u(Sc.Provider, {', 'o(mc.Provider, {', 'u(nc, { task: c?.lastSentHere }),', 'captureGuardedSnapToBottom: t.captureGuardedSnapToBottom,', 'onSpawner: s,'],
    imports: { mc: ['c96d752d0-BOCqU7c2.js', 'qQ'], nc: ['c96d752d0-BOCqU7c2.js', 'q1e'] } },
  // cf74bc599 Ib: F1e (dc) for the session with the inline cards on, handed to Lb; its mode-consent dialog (host:
  // proposal-spawner.mjs confirmMode). The pane gates the inline branch with g1e over the presets flag (Zs(cr, t), cr =
  // to() = shared-11 Qo, claudeai_cc_epitaxy_session_presets_main; D10 on) and mounts z$ (Dc) for the unplaced tasks.
  { source: 'cf74bc599-D9NZWRyl.js', binding: 'Ib', role: 'Spawner host: F1e with inlineCards on; the inline gate g1e, the unplaced group z$ and the presets flag it reads',
    features: ['inlineCards: !0,', 'n(s);', 'c.confirming === null'],
    imports: { dc: ['c96d752d0-BOCqU7c2.js', 'F1e'], Zs: ['c96d752d0-BOCqU7c2.js', 'g1e'], Dc: ['c96d752d0-BOCqU7c2.js', 'z$'], to: ['shared-11-BuQ3CK5I.js', 'Qo'] } },
];
// Pinned on the minified bytes (each must occur exactly once in the chunk).
const rawCallSites = [
  // The feed (c96d752d0): a turn's proposing calls become one `turnSuggestions` row at the turn's end (none when the only
  // call was sent here); the queue's leftovers one `unplacedSuggestions` row at the tail; with turnSuggestions on, the
  // proposing calls leave their tool rows (CL; the host: proposal-group-model.mjs proposalCardToolIds); the row
  // renderer mounts R$ / z$ in a data-find-omitted wrapper. F1e is the spawner the host replaces (proposal-spawner.mjs).
  { source: 'c96d752d0-BOCqU7c2.js', role: 'Feed rows: turnSuggestions at the turn end, unplacedSuggestions at the tail, proposing calls hidden, R$ / z$ mounted; F1e',
    features: [
      'let i=PPe(n.items);le??=i.firstProposingCallId,ce.push(...i.tools),le!==void 0&&ce.length>0&&tf(e,r,!1,I)&&((ce.length!==1||t.sentHereSuggestionIds?.includes(pL(ce[0])??"")!==!0)&&s.push({kind:"turnSuggestions",id:`turnSuggestions:${le}`,tools:ce})',
      'k!==void 0&&k.length>0&&s.push({kind:"unplacedSuggestions",id:`unplacedSuggestions:${k[0].id}`,tasks:k})',
      'case"tools":return!(a.turnSuggestions===!0&&CL(e,a.hideThinkingItems!==!0))',
      't.hostDrawsTurnSuggestions===!0&&gL(e)',
      'children:b(R$,{sessionRef:n,tools:e.tools})',
      'children:b(z$,{sessionRef:n,tasks:e.tasks})',
      'function F1e({sessionRef:e,hasSuggestions:t,captureGuardedSnapToBottom:n,inlineCards:i=!1}){',
    ] },
  // The session pane (cf74bc599 Xx): the inline gate over the presets flag; the floating suggested-task card (lb) only
  // while the gate is off (transcript-03: with presets on it never mounts); z$ for the unplaced tasks.
  { source: 'cf74bc599-D9NZWRyl.js', role: 'Session pane: lr = g1e(presets, session); floating card lb only when !lr; z$ (Dc) for unplaced tasks',
    features: ['cr=to(),lr=Zs(cr,t)', 'Or&&t&&dr&&!lr&&u(lb,{sessionRef:t,scrollRef:r,captureGuardedSnapToBottom:x},`chip-${e}`)',
      't&&Ci.length>0?u(Dc,{sessionRef:t,tasks:Ci}):null'] },
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
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
// D1: the shared view-tabs graph publishes semantic names for (file, local); `held` is every binding it slices.
async function viewTabsGraph() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map(Object.entries(manifest.publicNames ?? {}).map(([name, entry]) => [`${entry.file}#${entry.local}`, name]));
  const held = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b}`)));
  return { published, held };
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'JSON', 'Symbol', 'Promise', 'RegExp', 'Reflect', 'globalThis', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'parseFloat', 'parseInt',
  'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'isNaN', 'encodeURIComponent', 'window', 'document', 'performance',
  'Uint8Array', 'console']);

export async function extractProposalGroup({ check = false, explore = false } = {}) {
  const cache = new Map();
  const { published, held } = await viewTabsGraph();
  const modules = new Map();
  const used = { adapters: new Set(), chunkAdapters: new Set(), contextCopies: new Set() };
  const problems = [];
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
    if (!files.has(file) || file === VENDOR_FRAME) {
      m.imports.set(name, { from: '?', name: alias, via: key, kind: 'missing' });
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
    if (entry.kind === 'pattern') return fail(`${key}: destructuring declaration (${chain(key)})`);
    const text = declarationText(src, entry);
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
      const count = text.split(feature).length - 1;
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
