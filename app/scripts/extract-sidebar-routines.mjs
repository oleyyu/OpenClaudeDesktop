// Code sidebar Routines section (W14-code r4 sidebar-new, fr4-06 / fr3-10 / fr2-03): the 3.6556.2 section the Code
// session list shows between Pinned and Sessions once Show › Routines is on — one row per local scheduled task (the
// task's newest run as its status, "{count} new" read state, the row menu Edit / Mark as read / Delete), the section
// header with its collapsed status dot and "Mark all as read" — sliced without executing any desktop runtime (decision
// D0: own generator, own output folder src/generated/sidebar-routines, own scripts/verify-gen-sidebar-routines.mjs). The
// machinery is the working line's runSlicer (scripts/extract-working-line.mjs).
//
// Where it sits in the desktop (pinned below as call sites):
//   shared-22 (session list)  `t === "code" ? o(wy, {kind: "code", presentation: bo, onOpenTask: gi, onOpenSession: bi,
//                  onOpenRemoteRoutine: xi, renderGroup: Oi})` (wy = shared-21 p4, exported ht).
//   shared-21 p4 → m4   `wp() === null ? Q4 : g4`: inside the session list (shared-18 qO, the list-view context code-current
//                  exports as SidebarStatusLayout) g4 reads the routines section of the sections store (Ux: shown /
//                  collapsed; h4 toggles collapsed) and renders Q4 only while it is shown.
//   shared-21 Q4   the section: the CCD scheduled tasks (Ql) over the routine session groups of the list (JK), the rows
//                  v4 ranks by recency (flat task rows y3, a group for a task the list holds but the enabled list does not),
//                  the header s3 (Gm label, closed status dot MQ, the "Mark all as read" context menu o3), delete through
//                  the confirmation dialog (G4 → shared-46 vo) and the scheduler (cn.updateScheduledTaskStatus "deleted").
//   shared-21 y3   the routine row: in the session list the CDS sidebar row (shared-18 Ak, code-current CurrentSidebarRow)
//                  with the status decoration V$, the overflow menu B4 (Edit / Mark as read / Delete) and the context menu
//                  F4 over L4's groups.
//   shared-21 JK   the session list's routine groups: CCD sessions with a scheduledTaskId, grouped per task (MK), kept
//                  while the task is enabled or a run is live (BK); hJ (Show › Routines while a local routine runs) reads it.
//   shared-22 Oi   renderGroup: a group the enabled list does not hold (a disabled task with a live run) drawn as the
//                  list draws a scheduled-task session (xC → vC → _C → pC: the CDS row, leading icon shared-21 $1 →
//                  shared-20 YT over the newest run → shared-18 sj). pC itself (every row kind's drag / pane / hover
//                  machinery) is not sliced: the host's SidebarRoutineGroupRow (src/source-sidebar-routines.jsx) is pC's
//                  scheduled-task branch over the sliced row Ak and icon YT (W14-code r4 gen-final-4).
//
// What is not the original, and why (adapters in src/source-sidebar-routines-adapters.jsx, each pinned by features):
//   - the CCD scheduled task list (shared-4 la / z_) and its gate (shared-78 Yo / WK): the host scheduler's Code tasks
//     (electron/local-routines.mjs, kind "code"), loaded and kept current at app level (src/source-sidebar-routines.jsx);
//     the event subscription L2 is that app-level store's;
//   - the scheduler bridge (shared-0 Om, window["claude.web"].CCDScheduledTasks): code-routine-model's bridge over
//     local-routines;
//   - the routine sessions of the list (shared-21 NG, the session list's CCD sessions; shared-11 ot / xC, a session's list
//     item; Db / V_ / qy / zb / $b, its live facts): the host's routine runs (code-routine-model codeRoutineSessions)
//     as list items (src/sidebar-routines-model.mjs);
//   - the unread store (shared-11 Xb) and the explicit-unread read state (shared-2 iK): the host's session metadata unread
//     flag (btw-read-state unreadStore); the engine error / verdict reads (shared-11 Fb, shared-3 w6): the run's facts;
//   - the router (shared-25 hd / _d / md / up / fd, shared-21 X4): no router here — the host's current route as a path
//     and its own navigation after a delete;
//   - the delete confirmation (shared-46 vo / dO): the host's confirmation dialog;
//   - cloud routines (shared-4 Ga / Ch, shared-1 tc / xO, shared-21 p3 / m3 / j3 / k3 / O3, shared-4 Bh / zh): none
//     (E59: no claude.ai account);
//   - the recents-row and inline presentations (shared-21 H2 / c4 / v0 / h0, shared-18 tj): the Code sidebar mounts the
//     section presentation inside the session list only;
//   - the environment filter (shared-20 BS / ZS, shared-21 MG, shared-78 yQ): the host lists the local environment only;
//   - pins / seen state / multi-select / telemetry (shared-11 Nw, shared-17 va, shared-6 rA, shared-8 Kb / rx / sx,
//     shared-2 UG / JG): pins and seen state are unreachable in the section placement, selection is the host's, D17.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const S21 = 'shared-21-R7LldJ05.js', S11 = 'shared-11-_AVGLHEz.js', S18 = 'shared-18-D3y8YMFN.js';

const adapters = {
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'useGrowthBookFlag', local: 'fs', features: ['.on;'] },
    // The router's current location, read through selectors (hd / fd: the pathname; md: (href, pathname)), _d (a cowork
    // trigger route) and up (a link's prefetch props): the host's current route as a path (SidebarRoutinesHost pathname).
    Up: { name: 'useRouteSelect', local: 'hd', features: ['return wd(Cd, e);'] },
    qp: { name: 'useRouteSelect', local: 'fd', features: ['return wd(yd, e);'] },
    Yp: { name: 'useRouteLocationSelect', local: 'md', features: ['e(Sd(t), t.pathname)'] },
    Wp: { name: 'useCoworkTriggerRoute', local: '_d', features: ['gd(n, bd(n), t) === e'] },
    Kf: { name: 'useRouteLinkProps', local: 'up', features: ['if (e === null && t === void 0) return lp;'] },
    zr: { name: 'useCurrentAccount', local: 'Z', features: ['"Must call inside CurrentAccountProvider"'] },
  },
  'shared-78-D5Fw2h0a.js': {
    Yo: { name: 'useCcdScheduledTasksGate', local: 'WK', features: ['"chilling_sloth_clocks"', 'hE("ccdScheduledTasksEnabled", i)'] },
    Dr: { name: 'environmentShown', local: 'yQ', features: ['return _Q().includes(t) && (e.length === 0 || e.includes(t));'] },
    // W14-code r4 gen-final-4 (renderGroup): shared-18 sj's kind-glyph switch (`f = xs()`), the original `(Ty(), !1)`:
    // always false; Ty is a store read the host does not have.
    lS: { name: 'useKindGlyphStatus', local: 'zy', features: ['return (Ty(), !1);'] },
  },
  'shared-4-DUB1Oi0O.js': {
    la: { name: 'useCodeScheduledTasks', local: 'z_', features: ['return Eg(e, jt, t);'] },
    Tr: { name: 'useCodeNavState', local: 'cS', features: ['"yukon_silver_dramatic_shrimp_clocks"'] },
    Ga: { name: 'useRemoteRoutinesAvailable', local: 'Ch', features: ['zr("claude_code_routines")', 'routines.enabled'] },
    pi: { name: 'useSidebarListStore', local: 'db', features: ['expandedIds: [],', 'starredIds: [],', 'toggleExpanded: (t, n) =>'] },
    ja: { name: 'remoteRoutineDeleteBody', local: 'Bh', features: ['delete_removes_runs'] },
    Na: { name: 'remoteRoutinePersists', local: 'zh', features: ['!!e?.persist_session && !!e.persistent_session_id'] },
  },
  // mJ's inputs (Show › Routines offered): the Code nav state (cS: Code on and its gate settled — this host is the Code
  // app), the account (no organization) and the org's Code routines latch (yv: navHasCodeRoutinesByOrg, no org → false).
  'shared-1-BJhqMmkf.js': {
    tc: { name: 'useRemoteTriggers', local: 'eO', features: ['excludeTags: t,', 'includeSessionBoundOneShots: a,'] },
    Ys: { name: 'useDeleteRemoteTrigger', local: 'xO', features: ['n.getQueriesData(HD)'] },
  },
  'shared-20-mUr7IqZY.js': {
    Kr: { name: 'useEnvironmentFilter', local: 'BS', features: ['c.filter(VS)', 'Dd("code")'] },
    Lr: { name: 'useEnvironmentFilterOverride', local: 'ZS', features: ['return id();'] },
  },
  'shared-52-uHFNjl7C.js': {
    ha: { name: 'useErrors', local: 'cB', features: ['"Must be called within ErrorsProvider"'] },
    Ld: { name: 'useAnalytics', local: 'wT', features: ['return Ly;'] },
    mh: { name: 'useOrgHasCodeRoutines', local: 'yv', features: ['t.navHasCodeRoutinesByOrg[e] === !0'] },
    // The frame store's sections slice (sidebar-sections maps the same declaration to the same host store).
    ah: { name: 'useSidebarSectionsStore', local: 'q', features: ['setSectionView: (t, n) =>', 'routinesSidebarPlacement'] },
  },
  'shared-0-DDOOdL6P.js': {
    Om: { name: 'CCDScheduledTasks', local: 'xC', features: ['globalThis["claude.web"]?.CCDScheduledTasks'] },
  },
  'shared-2-TF8v67kg.js': {
    ld: { name: 'assertScheduledTaskChanged', local: 'UM', features: ['if (e === !1) throw new HM();'] },
    eo: { name: 'useRemoteExplicitUnread', local: 'iK', features: ['!!t.readState?.explicitUnread?.[e]'] },
    qa: { name: 'markCoworkRunsRead', local: 'UG', features: ['GG(e, Date.now());'] },
    Ka: { name: 'markCoworkRunUnread', local: 'JG', features: ['explicitUnread: { ...t.explicitUnread, [e]: !0 },'] },
  },
  [S18]: {
    ks: { name: 'useSidebarColumn', local: 'gk', features: ['return D(hk);'] },
    Uo: { name: 'ScheduledTaskStatusIcon', local: 'tj', features: ['isScheduledTask: c,', 'enableMarkUnread: d,'] },
  },
  'shared-8-Db1QN4mf.js': {
    gu: { name: 'trackGroupToggled', local: 'Kb', features: ['"claudeai.desktop.sidebar.group_toggled"'] },
    ou: { name: 'trackScheduledRowClicked', local: 'rx', features: ['"claudeai.desktop.sidebar.scheduled_row_clicked"'] },
    su: { name: 'trackRunOutputOpened', local: 'sx', features: ['"claudeai.cowork.scheduled_task.run_output_opened"'] },
  },
  [S11]: {
    Mn: { name: 'useSessionEngineError', local: 'Fb', features: ['eb.errorCategory(e)', 'eb.isResponding(e)'] },
    X: { name: 'toggleSidebarPin', local: 'Nw', features: ['maybeShowDragPinHint()'] },
    // JK's live facts of the list's sessions (HS's arguments) and HS itself: the host's run items carry them.
    On: { name: 'useRespondingSessions', local: 'Db', features: ['return sb(e ? Tb : ib, e ? Eb : lb);'] },
    ar: { name: 'useLiveApprovalSessions', local: 'V_', features: ['t.requestsBySession'] },
    In: { name: 'useAckedSessions', local: 'qy', features: ['e = Ky(Jy),'] },
    kn: { name: 'useLiveErrorSessions', local: 'zb', features: ['return sb(ab, Rb);'] },
    Tn: { name: 'useExplicitUnreadSessions', local: '$b', features: ['e = Xb(ex);'] },
    ot: { name: 'routineSessionListItem', local: 'xC', features: ['ref: { kind: "code", id: e.id },', 'pendingPermissions: +(p === "awaiting"),'] },
  },
  'shared-3-BCEbd8Fv.js': {
    Ct: { name: 'useSessionAwaitingVerdict', local: 'w6', features: ['C6(t, e.verdictsByToolUseId)'] },
  },
  'shared-6-sd9jbJqs.js': {
    io: { name: 'clearSidebarSelection', local: 'rA', features: ['nA.getState().clear();'] },
  },
  'shared-17-COtqou4I.js': {
    D: { name: 'markRoutineSeen', local: 'va', features: ['seen: { ...n.seen, [e]: r }'] },
  },
  'shared-46-BIbZBGFq.js': {
    Ei: { name: 'confirmRoutineDelete', local: 'dO', features: ['sessionTitle: e,', 'ownerWindow: globalThis.window,'] },
  },
};

// Host stand-ins (keyed chunk#local), each answering the original's contract from the host's data or its "nothing" branch.
const localAdapters = {
  // shared-11 Xb: the renderer's unread store (unreadIds / explicitUnreadIds, markManyRead, markUnreadExplicit, …): the
  // host's session metadata unread flag (an explicit mark is one main did not set automatically).
  [`${S11}#Xb`]: { name: 'useRoutineUnreadStore', features: ['unreadIds: [],', 'explicitUnreadIds: [],', 'markUnreadExplicit: (t) =>'] },
  // The session list's CCD sessions (a context the list provides): the host's routine runs (SidebarRoutinesHost).
  [`${S21}#NG`]: { name: 'RoutineSessionsContext', features: ['NG = k([])'] },
  // The environment selection of the list (zs: "all environments" → jG): the host lists local only, no filter.
  [`${S21}#MG`]: { name: 'environmentSelection', features: ['selectedEnvironments: zs(e.selectedEnvironments) ? jG : e.defaultEnvironmentSelection'] },
  // The scheduler's event subscription (once per app): the app-level store subscribes (source-sidebar-routines.jsx).
  [`${S21}#L2`]: { name: 'subscribeScheduledTaskEvents', features: ['cn?.onOnScheduledTaskEvent?.(N2)'] },
  // After a delete, leave the deleted task's route (the router's replace / push): the host clears its routines selection.
  [`${S21}#X4`]: { name: 'useLeaveDeletedRoutine', features: ['new URLSearchParams(window.location.search).get("trigger")', 'e === "code" ? h3 : Y4'] },
  // Mark runs read (b2: the remote read state too): the local unread store only (E59).
  [`${S21}#y2`]: { name: 'useMarkRunsRead', features: ['GS([...o].map((t) => ({ orgUuid: e, sessionId: t, eventId: "" })));'] },
  // Cloud routines (E59): no remote rows, no remote row components, no recents-row rollup.
  [`${S21}#p3`]: { name: 'remoteRoutineRows', features: ['claudeMinted: i'] },
  [`${S21}#m3`]: { name: 'listedRemoteRoutines', features: ['awaitingTriggerIds: r = u3'] },
  [`${S21}#j3`]: { name: 'RemoteRoutineRow', features: ['onMarkRunsRead: i'] },
  [`${S21}#k3`]: { name: 'RemoteRoutineRunsProbe', features: ['r.some(f6)'] },
  [`${S21}#O3`]: { name: 'RemoteRoutineStatusProbe', features: ['userAction: o, errorCategory: s, unreadRunIds: i'] },
  [`${S21}#H2`]: { name: 'RoutinesRecentsRow', features: ['rollupState: r, children: i'] },
  [`${S21}#c4`]: { name: 'routinesRollup', features: ['return l4(e, t, n).state;'] },
  // The inline / pinned presentations (Q = inline or pinned): not mounted in the Code session list.
  [`${S21}#v0`]: { name: 'RoutineInlineRowCard', features: ['K$.handle'] },
  [`${S21}#h0`]: { name: 'RoutineInlineRow', features: ['trailingGlyph: r,', 'kindCue: o,'] },
  // W14-code r4 gen-final-4 (renderGroup, shared-22 Oi): the group row's icon is shared-20 YT (sliced) over the newest
  // run, i.e. shared-18 sj (sliced). Two of sj's inputs are host services:
  //   oj  the code session's display state (PR / forge state, the unread store): the run's facts through the original
  //       state priority (shared-8 pb, code-current resolveSessionDisplayState); routine runs carry no PRs (prState none);
  //   WA  the error mark: the host's code error glyph, as code-current maps the same declaration.
  [`${S18}#oj`]: { name: 'useRoutineRunDisplayState', features: ['respondingNow: d,', 'prState: y,'] },
  [`${S18}#WA`]: { name: 'SidebarCodeErrorGlyph', features: ['{ effectiveCategory: c } = ag(n ?? void 0)', 'u = t === "code" ? _O(n) : null'] },
};

// Pure bindings a linked area slices without exporting, sliced again here.
const linkedCopies = {
  // W14-code r8 R8DC-01: shared-18 BC (the status-look context), KC and PA are linked from cowork-scheduled now (it exports
  // them), so they are no longer sliced again here.
  // W14-code r4 gen-final-4 (D1): EC is linked from the Sessions page's pure-shared-11 (reconcileRows), which slices
  // its default comparator TC without exporting it.
  [`${S11}#TC`]: 'pure: two list items equal but for ref / source (EC\'s default comparator)',
};

const stateCopies = {};

const CODE_CURRENT = ['sidebar-row-view.mjs', 'sidebar-status-glyph.mjs', 'sidebar-menu-groups.mjs', 'sidebar-menu-order.mjs',
  'sidebar-group-view.mjs', 'sidebar-fade-label.mjs', 'sidebar-row-primitive.mjs', 'sidebar-row-control.mjs', 'sidebar-details-view.mjs',
  'sidebar-details-model.mjs', 'sidebar-pr-card.mjs', 'sidebar-pr-icon.mjs', 'sidebar-pr-model.mjs', 'string-count.mjs', 'sidebar-nav-badge.mjs',
  'sidebar-running-mark.mjs', 'nested-session-parts.mjs', 'sidebar-session-state.mjs', 'sidebar-session-priority.mjs'];

const modules = [
  { target: 'routines-section.mjs', source: S21, internal: true,
    exports: { m4: 'CodeSidebarRoutines', Q4: 'RoutinesSection', g4: 'RoutinesSectionShown', y3: 'SidebarRoutineRow', JK: 'useRoutineSessionGroups',
      hJ: 'useLocalRoutineRunning', VJ: 'useRoutinesShowToggle', HJ: 'SidebarShowToggleItem', i4: 'routineRowMessages' },
    features: {
      m4: ['return wp() === null ? u(Q4, { ...e }) : u(g4, { ...e });'],
      Q4: ['p = oc().enabled ?? !1,', '{ scheduledTasks: m } = Ql(p),', 'm.filter(N3)', 'cn.updateScheduledTaskStatus(e, "deleted")',
        '"claudeai.desktop.code.scheduled_task.deleted"', 'renderOverflowMenu: B4,', 'u(s3, {'],
      g4: ['{ collapsed: t, shown: n } = Ux(),', 'onToggleCollapsed: h4'],
      y3: ['u(xf, { ...i4.newRuns, values: { count: A } })', 'variant: "session",', 'u(F4, { rowKey: _e, pin: ye, onEdit: Ne, onDelete: R ? Pe : void 0, readState: Ee, children: et })'],
      JK: ['if (!n.scheduledTaskId || n.isArchived) continue;', 'BK(!1, e.isRunning, n.scheduledTaskId, l) !== "group"', 'return pu(h, FK);'],
      hJ: ['return JK().some(gJ) && ys(e, "local");'],
      VJ: ['o = mJ(i)', 'e && o && !s ? c(!0) : !e && s && c(!1);', 'filter: "show_routines", value: String(!i)', '{ offered: u, checked: i, label: d, onToggle: l }'],
      HJ: ['s = mJ(!1, hJ()),', 'c = cl(s);', 'if (!t && !c) return null;', 'u(H.Item, { checked: n, keepOpen: !0, onClick: i, children: r })'],
      i4: ['defaultMessage: "{count} new", id: "bS10BvoB3g"', 'defaultMessage: "Mark all as read", id: "/af+jQ8xvW"'],
    } },
  // The small originals the closure reaches in other chunks, each chunk's slice in a module of its own.
  { target: 'shared-18.mjs', source: S18 },
  { target: 'shared-46.mjs', source: 'shared-46-BIbZBGFq.js' },
  // shared-20 YT (exported wn, imported by shared-21 as Sv): a scheduled-task group's icon, the newest run's status
  // (shared-21 $1 `case "scheduled-task": … return Sv(e.source.data)`), the icon shared-22 pC gives the group row.
  { target: 'shared-20.mjs', source: 'shared-20-mUr7IqZY.js', exports: { YT: 'routineGroupIcon' },
    features: { YT: ['let t = e.children[0];', 'sessionType: t.source.data.type,', 'serverUnread: t.isUnread,'] } },
  { target: 'shared-frame.mjs', source: 'shared-frame-6jtSkIit.js' },
  // W14-code r7 R7DC-03: no shared-104 module any more (nx, all it reached there, is the Code transcript renderer's).
  { target: 'shared-6.mjs', source: 'shared-6-sd9jbJqs.js' },
  { target: 'shared-11.mjs', source: S11 },
  { target: 'shared-78.mjs', source: 'shared-78-D5Fw2h0a.js' },
  { target: 'shared-16.mjs', source: 'shared-16-ByfgAyLr.js' },
  { target: 'shared-2.mjs', source: 'shared-2-TF8v67kg.js' },
  { target: 'shared-8.mjs', source: 'shared-8-Db1QN4mf.js' },
  { target: 'shared-4.mjs', source: 'shared-4-DUB1Oi0O.js' },
];

const callSites = [
  { source: 'shared-22-Bwn3sJTG.js', binding: '$N', role: 'The Code session list mounts the routines section (shared-21 p4, exported ht) with the section presentation, its open handlers and the group renderer (host: SidebarRoutinesSection, mounted by source-sidebar.jsx)',
    features: ['kind: "code",', 'onOpenRemoteRoutine: xi,', 'renderGroup: Oi,'] },
];

export const SIDEBAR_ROUTINES = {
  name: 'sidebar routines', generator: 'extract-sidebar-routines.mjs', output: path.join(root, 'src/generated/sidebar-routines'),
  adapterModule: '../../source-sidebar-routines-adapters.jsx', adapterFile: 'src/source-sidebar-routines-adapters.jsx',
  adapters, localAdapters, modules, callSites, linkedCopies, stateCopies,
  // Linked, not sliced again (D1): the routines copy (shared-18 fH and the shared-4 routines tables) from routines-shared,
  // the section label / reorder pieces and the sections model from sidebar-sections, the CDS sidebar row, its status glyph,
  // menu rows and list contexts from code-current (so the host sidebar's providers reach these rows too).
  linkedAreas: [
    // W14-code r8 R8DC-01 (D1): the Cowork Scheduled page (extract-cowork-scheduled.mjs) slices shared-18's status-look
    // contexts and hooks (IC / RC / BC, LC / zC / VC / HC), the routine row pieces (AA … QA) and exports every binding it
    // holds; linked from there, not sliced a second time. Listed first, so an area listed below that exports the same
    // binding (routines-shared, code-current, sidebar-sections, code-transcript) keeps answering for it.
    { area: 'cowork-scheduled', modules: ['shared-18-D3y8YMFN.mjs'] },
    'routines-shared',
    // W14-code r4 gen-final-4 (D1): shared-11 EC (reconcileRows) is held by the Sessions page (extract-sessions-page.mjs,
    // pure-shared-11.mjs), the area that sliced it first; linked from there, not sliced a second time.
    { area: 'sessions-page', modules: ['pure-shared-11.mjs'] },
    { area: 'sidebar-sections', modules: ['zustand.mjs', 'sections-model.mjs', 'group-label.mjs', 'group-reorder.mjs', 'status-dot.mjs', 'section-status.mjs', 'section-badge.mjs', 'menu-press.mjs', 'menu-triggers.mjs', 'lazy-menu.mjs', 'section-focus.mjs', 'session-ref-key.mjs', 'session-keys.mjs', 'direction.mjs', 'icon-nudge.mjs', 'rising-count.mjs', 'panel-chrome.mjs', 'dialog-presence.mjs', 'debounced-callback.mjs',
      // W14-code r5 R5DC-09 (D1): the pure group / hover / blank-area pieces sidebar-sections slices and exports.
      'group-mode.mjs', 'group-copy.mjs', 'section-hover.mjs', 'blank-area-menu.mjs'] },
    { area: 'code-current', modules: CODE_CURRENT },
    // W14-code r5 R5DC-09 (D1): app-switch's frame pieces it exports.
    { area: 'app-switch', modules: ['app-switch-frame.mjs'] },
    // W14-code r6 R6DC-06 (D1): the Routines page (extract-code-routines.mjs) slices and exports the same pure helpers of
    // shared-1 / -2 / -25 / -26 / -52 (schedule math, cron text, labels); linked from there, not sliced a second time.
    { area: 'code-routines', modules: ['shared-1-BJhqMmkf.mjs', 'shared-2-TF8v67kg.mjs', 'shared-25-DOWZRSlq.mjs', 'shared-26-CGuBxVt9.mjs', 'shared-52-uHFNjl7C.mjs'] },
    // W14-code r7 R7DC-03 (D1): what the Code transcript renderer already slices from the same chunks — shared-104 nx,
    // shared-11 tx / nx, shared-6 eA / tA / nA, shared-18 RA / KA — exported by it (scripts/code-transcript-links.json
    // `linkExports['code-transcript']`) and linked here, not sliced again; the renderer's chunks import no sidebar area.
    { area: 'code-transcript', modules: ['shared-104-CTONUSaz.mjs', 'shared-11-_AVGLHEz.mjs', 'shared-6-sd9jbJqs.mjs', 'shared-18-D3y8YMFN.mjs'] },
  ],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractSidebarRoutines(options) {
  return runSlicer(SIDEBAR_ROUTINES, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSidebarRoutines({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
