// Sessions page, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 5, region sessions-page):
// the same semantic roots scripts/extract-sessions-page.mjs cuts from 3.6556.2 into src/generated/sessions-page (cbd6c85c8
// Hf, the whole Sessions page shell, and the sidebar message tables), cut from the frozen 4.16336.0 snapshot into the
// isolated graph src/generated/sessions-page-v4. The 3.6556.2 output is untouched (staged double output; no production
// switch: src/source-sessions-page.jsx keeps rendering src/generated/code-current/sessions-page-view.mjs).
//
//   cbd6c85c8-CxDdK_2w  hm  SessionsPage            (3.6556.2 cbd6c85c8 Hf; chunk-internal, rendered by the route page)
//   shared-123-1Hc1RTKl Ch  sidebarListMessages     (3.6556.2 shared-78 hv)
//                       Ah  sidebarMessages         (3.6556.2 shared-78 Sv; `return id() ? kh : Oh`, id = cds-core useHubLook)
//   shared-22-BACJUrcb  CD  sidebarOlderMessages    (3.6556.2 shared-22 CT)
//   c39a247c4-BgnGWMne  $t  sidebarBulkModelMessages (3.6556.2 c39a247c4 Bt)
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2/plan.json sessions-page `linked`, plus the code-current-v4 modules that already cut the
//     Sessions page's own pieces from cbd6c85c8: load hold, copy, selection bar, bulk actions, row): every binding one of
//     them holds and exports is imported from it, never cut again;
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts (now in their
//     4.16336.0 chunks/locals; account2/sessions-page/logs/match-hm.json) and the 4.16336.0-only seams (the voluntary
//     account-migration banner, the served-recents-search lazy chunk). src/source-sessions-page-v4-adapters.jsx answers
//     them, re-exporting the 3.6556.2 host adapter where the official contract is unchanged. Each original is pinned by
//     features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256 pinned
// (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const SESSIONS_PAGE_V4_OUTPUT = 'src/generated/sessions-page-v4';
const ADAPTER_FILE = 'src/source-sessions-page-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const PAGE = 'cbd6c85c8-CxDdK_2w.js';
const S0 = 'shared-0-CnnWnVrT.js', S1 = 'shared-1-D1bGaTaN.js', S2 = 'shared-2-CsjIBQD8.js', S3 = 'shared-3-IQTrO7Gx.js', S8 = 'shared-8-BqfCbkJd.js';
const S18 = 'shared-18-Cfqwgjc5.js', S20 = 'shared-20-DUEo90UF.js', S25 = 'shared-25-D-aF0gt9.js', S26 = 'shared-26-B-POtn5S.js', S39 = 'shared-39-ZCs0lAwB.js';
const S62 = 'shared-62-DoCqVpIq.js', S92 = 'shared-92-BOgyxePb.js', S123 = 'shared-123-1Hc1RTKl.js', S140 = 'shared-140-DfG6VwpK.js', S153 = 'shared-153-DMw2VzSq.js';
const S183 = 'shared-183-B2N6Zy4J.js', S212 = 'shared-212-BHMAi0oa.js', S22 = 'shared-22-BACJUrcb.js', S33 = 'shared-33-DtdykY0y.js';
const INTL = official.vendorIntl, QUERY = 'vendor-query-Bl2Kfzgk.js', MENU = 'cc18d27d7-CJQ6OnqZ.js', MOVE = 'cd540469d-CDk6ufaF.js';
const MIGRATION = 'cbf576839-Bj8Ku-Zr.js', MIGRATION_QUERY = 'c24d8b988-CZipWU6K.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [PAGE]: {
    hm: { name: 'SessionsPage', export: null, probe: 'reportsRecentsLoad:t,codeScoped:n',
      features: ['let $ = J9(616),', 'reportsRecentsLoad: t,', 'codeScoped: n,', 'renderCodeRowActions: r,', 'codeRowLinkComponent: u,',
        'j = p ? "code" : "all",', 'se = J0($, 2) ? K0($, 2, ["code", "archived"]) : $[2];', 'Ne && _f.preload("open_idle");'] },
  },
  // The sidebar message tables the host's sidebar / chats page read (3.6556.2 pure-shared-78 / pure-shared-22 /
  // pure-c39a247c4 of the same area).
  [S123]: {
    Ch: { name: 'sidebarListMessages', export: 'MS', probe: 'id:"knhVwvlQOb"', features: ['newChat: { defaultMessage: "New chat", id: "knhVwvlQOb" },'] },
    Ah: { name: 'sidebarMessages', export: 'jS', probe: 'return id()?kh:Oh', features: ['return id() ? kh : Oh;'] },
  },
  [S22]: {
    CD: { name: 'sidebarOlderMessages', export: null, probe: 'id:"MyneLjoq5y"', features: ['defaultMessage: "Bulk actions for older sessions",', 'id: "mQXVaIKxH7",'] },
  },
  'c39a247c4-BgnGWMne.js': {
    $t: { name: 'sidebarBulkModelMessages', export: null, probe: 'id:"H9CZcZ7FTW"', features: ['id: "H9CZcZ7FTW",', 'id: "72nFwMY5yl",', 'bulkModelSetFailed: {'] },
  },
};
// 3.6556.2 outputs of this area with no 4.16336.0 counterpart cut here (provenance.json `notPorted`).
export const NOT_PORTED = [
  { previous: 'messages-shared-22.mjs archivedWithChangesMessages (97BfxO8deN / XtKbRXFQoE / JdaR4uyvoG)',
    why: 'none of the three ids occurs in any 4.16336.0 chunk: the archive-kept-a-dirty-worktree toast copy changed upstream; its new descriptors belong to the toast\'s own region' },
  { previous: 'messages-shared-20.mjs nestedSessionsMessages (sRMUaFT32i / ORGsUuPnMo absent; rRvonVlblb / RbpU5T0BsV / wCLSAv7FiB / G1uB+fnj7o in shared-20-DUEo90UF)',
    why: 'the nested-sessions confirm copy changed upstream (two descriptors removed); the confirm dialog is not part of SessionsPage hm' },
  { previous: 'messages-c48ea26ad.mjs nestedMoveFailedMessages (3A4UmmpZB2 / d8suG8Ad49 in c48ea26ad-DTl74jog)', why: 'not part of SessionsPage hm; left to the nested-sessions consumer' },
  { previous: '3.6556.2 pure-* helper modules (setUnion, servedRecentsSearchKey, …)', why: 'sliced inside the closure under their original locals; this graph exports only the semantic roots' },
];
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cbd6c85c8-CxDdK_2w.js#hm': '3fb4c43f629991d2b75395cb9237841d58f0b42ecd9044111fda5b1ac80c7464',
  'shared-123-1Hc1RTKl.js#Ch': '3433c81facb778309c683de298a24508c743e64d71e847cedaad15c6cf7f6752',
  'shared-123-1Hc1RTKl.js#Ah': '27c25896f909051f80181ae753fa6f21b170292e2363e5135448aba3cd50fb32',
  'shared-22-BACJUrcb.js#CD': 'dde11dae698208d9292f31edd7526a43ad58335fba5998203a48412f779f00a1',
  'c39a247c4-BgnGWMne.js#$t': '8fe8ec9b558245a937da4e030278b46d96d7a07c51469c664283735487c682bf',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (host module it re-exports, or null
// when the adapter module answers it itself), features, why } ──────────────────────────────────────────────────────────
const HF = 'src/source-sessions-page-hf-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // Router (3.6556.2 shared-25 nf / Zd / Jd / Cx): search params, pathname, router, router link.
  [`${S25}#sd`]: { name: 'useSessionsSearchParams', from: HF, features: ['t = e === null ? null : e.searchParamsString,'] },
  [`${S25}#nd`]: { name: 'useSessionsPathname', from: HF, features: ['? (t.resolvedLocation ?? t.location).pathname'] },
  [`${S25}#$u`]: { name: 'useSessionsRouter', from: HF, features: ['t = J0($, 0) ? K0($, 0, { warn: !1 }) : $[0],', 'prefetch: ed,'] },
  [`${S25}#Z`]: { name: 'useSessionsAccount', from: HF, features: ['Error("Must call inside CurrentAccountProvider"),'] },
  [`${S25}#Ky`]: { name: 'SessionsRouterLink', from: HF, features: ['r === !1 && { "data-no-intent-warm": "" }'] },
  // 3.6556.2 shared-0 fZ / B: the desktop store switch, the O11Y logger.
  [`${S0}#L0`]: { name: 'useSessionsDesktopSwitch', from: HF, features: ['L0 = (e) => A(S0, I0) || !!e'] },
  [`${S0}#H`]: { name: 'sessionsObservability', from: HF, features: ['H = P(Zw, N.O11Y_INTERNALS)'] },
  // Errors / analytics (3.6556.2 shared-52 cB / ZN / QN; routines-shared-v4 adapts shared-62 OT).
  [`${S62}#rP`]: { name: 'useSessionsErrors', from: HF, features: ['Error("Must be called within ErrorsProvider"),'] },
  [`${S62}#Xm`]: { name: 'trackConversationSearch', from: HF, features: ['R("conversationSearch", e, { variant: t, ...I(n) }, i, r);'] },
  [`${S62}#Zm`]: { name: 'trackConversationSearchHandoff', from: HF, features: ['{ variant: "recents", error_code: e },'] },
  [`${S62}#OT`]: { name: 'useAnalytics', from: RS, features: ['return ZS;'] },
  // 3.6556.2 shared-78 w0 / qY.
  [`${S123}#Gq`]: { name: 'useQueryKeyFetching', from: HF, features: ['r.isFetching({ queryKey: e, exact: n }) > 0,'] },
  // shared-123 vc (exported Xw; 3.6556.2 shared-52 Xi): the sign-out reset registry the page's top-level
  // `St(()=>Xp.clear())` registers its remembered-search store with (PAGE_CARRY). Same host registry as the 3.6556.2 page.
  [`${S123}#vc`]: { name: 'registerSessionsReset', from: HF, features: ['{ durable: t = !1 } = {}', 'fc.add(e)'] },
  [`${S123}#EV`]: { name: 'useLiveMode', from: HF, features: ['return OV("live");'] },
  // 3.6556.2 shared-26 Vk / qk / OA / DA / CA.
  [`${S26}#PL`]: { name: 'useChatsPageSwitch', from: HF, features: ['t = Wa("dramatic_shrimp");'] },
  [`${S26}#BL`]: { name: 'useSessionsPageVariant', from: HF, features: ['return zL(LL());'] },
  [`${S26}#xR`]: { name: 'invalidateRecents', from: HF, features: ['e.invalidateQueries({ queryKey: [st] });'] },
  [`${S26}#bR`]: { name: 'patchRecents', from: HF, features: ['e.state.fetchMeta?.fetchMore === void 0,'] },
  [`${S26}#gR`]: { name: 'ServedSearchChatDegraded', from: HF, features: ['"served recents search: chat sou'] },
  // 3.6556.2 shared-26 aE / shared-52 $_ / dv.
  [`${S92}#QW`]: { name: 'countDeletedChats', from: HF, features: ['let t = { deleted: 0, unknown: 0 };'] },
  [`${S92}#wC`]: { name: 'useCustomGroupAssign', from: HF, features: ['return Y(hh(J1($, 0, e) ? K1($, 0, e, (t) => zx(t, e)) : $[1]));'] },
  [`${S92}#FC`]: { name: 'useCustomGroupAssignment', from: HF, features: ['(t) => Lx(t).assignments[e]'] },
  // 3.6556.2 shared-2 OX / D2 / pG / aJ, shared-2 ih (now shared-140 Ta).
  [`${S2}#Fq`]: { name: 'markPageLoad', from: HF, features: ['renderMode: i,', 'artifactType: a,', 'armPaintWaitInLayout: re = !1,'] },
  [`${S2}#E4`]: { name: 'findCachedChat', from: HF, features: ['function E4(e, t, n) {'] },
  [`${S2}#cH`]: { name: 'useHubEligible', from: HF, features: ['{ orgAvailable: e } = eu(),'] },
  [`${S2}#eG`]: { name: 'useChatsViewCount', from: HF, features: ['t = e === void 0 || e;'] },
  [`${S140}#Ta`]: { name: 'useIdleReady', from: HF, features: ['function Ta(e) {'] },
  // 3.6556.2 shared-16 Bp / al / Lf (now shared-140 Zu / Ha / Il).
  [`${S140}#Zu`]: { name: 'useDeleteChatsToast', from: HF, features: ['let { deleted: a, unknown: o } = e;'] },
  [`${S140}#Ha`]: { name: 'useSessionsRowHref', from: HF, features: ['{ haystackProject: i } = ai(),'] },
  [`${S140}#Il`]: { name: 'SessionsChatRowMenu', from: HF, features: ['n = J(e.onSelectForBulk),', 'i = J(e.onRenameStart);'] },
  // 3.6556.2 vendor-intl Gt / q.
  [`${INTL}#Gt`]: { name: 'SessionsMessage', from: HF, features: ['var Gt = a(Wt, Ut);'] },
  [`${INTL}#q`]: { name: 'useSessionsIntl', from: HF, features: ['return (Mt(e), e);'] },
  // 3.6556.2 vendor-query J / st: the Sessions page has no react-query client of its own (the adapter's inert client).
  [`${QUERY}#J`]: { name: 'useSessionsQueryClient', from: HF, features: ['No QueryClient set, use QueryClientProvider to set one'] },
  [`${QUERY}#st`]: { name: 'useSessionsInfiniteQuery', from: HF, features: ['return et(e, Me, t);'] },
  // 3.6556.2 shared-3 Ky / shared-18 qC / shared-182 NB.
  [`${S3}#vx`]: { name: 'useDelayedFlag', from: HF, features: ['let n = setTimeout(() => i(!0), t);'] },
  [`${S18}#SO`]: { name: 'SessionsSelectionProviders', from: HF, features: ['{ active: t, children: n } = e,', 'j(_O.Provider, { value: t }, j(hO.Provider, { value: r }, n)),'] },
  [`${S212}#Wq`]: { name: 'useWindowFocused', from: HF, features: ['return v(Hq, Uq, Uq);'] },
  // 3.6556.2 shared-130 Bh / Qv / Dg / $$ / Qc (now shared-153).
  [`${S153}#Cy`]: { name: 'useTrimChatPages', from: HF, features: ['"infinite"'] },
  [`${S153}#RS`]: { name: 'useUpdateChat', from: HF, features: ['(e) => MS(t, n, e.conversationUuid)'] },
  [`${S153}#ub`]: { name: 'useChatProjects', from: HF, features: ['r ? ["quiet"] : []'] },
  [`${S153}#X1`]: { name: 'useChatArtifacts', from: HF, features: ['"include_deleted_artifacts"'] },
  [`${S153}#Yl`]: { name: 'useChatPendingDelete', from: HF, features: ['return _(Fl.subscribe, t, Xl);'] },
  // 3.6556.2 shared-8 __ / XC.
  [`${S8}#My`]: { name: 'loadArchivedSessions', from: HF, features: ['ut.loadArchivedSessions().catch(() => {'] },
  [`${S8}#SD`]: { name: 'useSessionsHistoryKey', from: HF, features: ['SD = bD ?? xD'] },
  // 3.6556.2 shared-11 (now shared-39).
  [`${S39}#gE`]: { name: 'useSessionsPageList', from: null, features: ['n = _E(e),', '} = ts(t && !!e.searchQuery, n.hasRemoteCoworkMore),'] },
  [`${S39}#vk`]: { name: 'useChatMutation', from: HF, features: ['{ addError: i, addApiError: a } = _r(),'] },
  [`${S39}#yk`]: { name: 'applyChatBulk', from: HF, features: ['await js(e, 2, async (e) => {'] },
  [`${S39}#tk`]: { name: 'userFacingLoadError', from: HF, features: ['k(e) === "user_facing"'] },
  [`${S39}#VE`]: { name: 'isHiddenCoworkRow', from: HF, features: ['return e.source.kind === "cowork" && xn(e.source.data);'] },
  [`${S39}#Af`]: { name: 'useSessionsNavigate', from: HF, features: ['(t) => e.push(`${t}${kf()}`)'] },
  [`${S39}#PT`]: { name: 'usePendingChats', from: HF, features: ['a?.pendingAmong(e) ?? kT'] },
  [`${S39}#GT`]: { name: 'codeSearchRow', from: HF, features: ['let s = (e.isUnread ?? !1) || (o?.has(e.id) ?? !1),', 'u = Date.parse(e.timestamp),'] },
  [`${S39}#IT`]: { name: 'coworkSearchRow', from: HF, features: ['ref: { kind: "cowork", id: e.sessionId },'] },
  [`${S39}#Ch`]: { name: 'useCustomGroupKeyOf', from: HF, features: ['(a) => gh(mh(a.sessions, n, r, i), e, t)'] },
  [`${S39}#rk`]: { name: 'useBulkDeleteTracker', from: HF, features: ['o = I(navigator.userAgent) ? void 0 : KO(),'] },
  [`${S39}#xk`]: { name: 'useSessionsDesktopBridge', from: HF, features: ['return Ke(bk);'] },
  // 3.6556.2 cc18d27d7 j / M / L / N (the shared row menu module).
  [`${MENU}#M`]: { name: 'isRowReadOnly', from: HF, features: ['? t?.cloudReadOnly === !0', ': t?.localReadOnly === !0 && !m(e);'] },
  [`${MENU}#N`]: { name: 'useSessionsRowActions', from: null, features: ['byHref: t,', 'enterSelectionMode: n,', 'linkItemsFor: r,'] },
  [`${MENU}#R`]: { name: 'SessionsCoworkRow', from: HF, features: ['t(O, { children: t(L, { session: n }) })'] },
  [`${MENU}#P`]: { name: 'closeRowPanes', from: HF, features: ['extraPanesByMode[r]', 'S.getState().closePopout(w(e.id))'] },
  // 3.6556.2 shared-20 jA, cd540469d d / f, shared-156 _m (now shared-183 Lh).
  [`${S20}#sL`]: { name: 'isRowPinnable', from: HF, features: ['{ markedTemporary: t, whenUnpinned: n = !1 }'] },
  [`${MOVE}#p`]: { name: 'moveRowsToGroup', from: HF, features: ['groupId: i,', 'overlayEnabled: d,'] },
  [`${MOVE}#m`]: { name: 'moveRowsToNewGroup', from: HF, features: ['name: s,', 'overlayEnabled: u,'] },
  [`${S183}#Lh`]: { name: 'markNavigation', from: HF, features: ['performance.mark(Cn);'] },
  // 4.16336.0 only: the chat / cowork row menus and the custom-group pieces. The page reaches them only for chat rows (Vm
  // -> dp -> fp, pp -> hp) and cowork rows (pm -> lp -> cp -> tp -> ep); the Code page (codeScoped) lists code rows only,
  // so the adapters fail loudly if a future change reaches them (as the 3.6556.2 SessionsCoworkRow / SessionsChatRowMenu).
  [`${MENU}#F`]: { name: 'SessionsRowMenu', from: null, features: ['ctx: r,', 'trigger: i,', 'contextMenuTrigger: a,', 'renderContextMenu: o,'] },
  [`${S140}#vd`]: { name: 'useSessionsChatRowMenuItems', from: null, features: ['let $ = J9(97),', 'sessionTitle: t,'] },
  [`${S140}#Za`]: { name: 'useSessionsRowContextMenu', from: null, features: ['K0($, 0, { x: 0, y: 0, size: 0, event: null, doc: null })'] },
  // c4acc1503 m: the desktop reroute target of a web URL, read only by the chat row's "Open in browser" item (cbd6c85c8 Cp,
  // remote "ccr" chats only).
  ['c4acc1503-BXsdaWDM.js#m']: { name: 'desktopRerouteTarget', from: null, features: ['return t.kind === "reroute" ? t.target : null;'] },
  [`${S140}#Qf`]: { name: 'useSessionsGroupOverlayEnabled', from: null, features: ['return $f().overlayEnabled;'] },
  [`${S20}#uD`]: { name: 'SessionsCustomGroupMenu', from: null, features: ['customGroups: t,', 'currentGroupId: n,', 'showUngrouped: r,'] },
  [`${S20}#sD`]: { name: 'SessionsNewGroupDialog', from: null, features: ['sD = f(aD)'] },
  // 4.16336.0 only: the voluntary account-migration hint under the list (cbd6c85c8 ff). Its eligibility, preview query,
  // plan nudge and dismissal are claude.ai account services (GrowthBook invite_triggered_account_migration_enabled /
  // voluntary_migration_enterprise_banner_enabled); the host has no organization migration: the official ineligible /
  // disabled answers. shared-1 S2 (the nudge store) is reached only from that hint's settings link (cbd6c85c8 mf).
  [`${MIGRATION}#I`]: { name: 'useAccountMigrationEligibility', from: null, features: ['let r = l("invite_triggered_account_migration_enabled"),'] },
  [`${MIGRATION}#B`]: { name: 'useMigrationNudgePlan', from: null, features: ['r = d("voluntary_migration_enterprise_banner_enabled", e),', 'nudgesAllowedForPlan:'] },
  [`${MIGRATION}#z`]: { name: 'useMigrationNudgeDismissal', from: null, features: ['let { isDismissed: i, dismiss: a } = O(),', 'e.dismissedNudges[o] === !0'] },
  [`${MIGRATION_QUERY}#M`]: { name: 'useMigrationPreview', from: null, features: ['/api/account/migration_preview?source_organization_uuid=${e}'] },
  [`${S1}#S2`]: { name: 'sessionsNudgeStore', from: null, features: ['efSuppressorCount: 0,', 'settingsRowOpenRequested: !1,'] },
  // Module state the sidebar nav graph (frame-sidebar-nav) slices as well; the page only reads / writes it through these
  // hooks, so they are host boundaries here (one instance, D1):
  //   shared-123 d_  (3.6556.2 shared-78 zy useCoworkOnlyMode): subscribes the cowork-only closure store (Zg / Jg) and
  //                  always answers false — the official value;
  //   shared-2 Ly    the conversation-navigation intent mark (writes Iy for the conversation-load timing) a row click
  //                  leaves; host: no conversation-load timing;
  //   shared-2 aw    the hub's locally marked session uuids (zustand KC .uuids); host: no hub marks.
  [`${S123}#d_`]: { name: 'useCoworkOnlyMode', from: null, features: ['return (Zg(), !1);'] },
  [`${S2}#Ly`]: { name: 'markConversationNavigationIntent', from: null, features: ['Gu(e) === "conversation" &&', 'byGesture: navigator.userActivation?.isActive === !0,'] },
  [`${S2}#aw`]: { name: 'useHubMarkedUuids', from: null, features: ['return KC(ow);'] },
  // 4.16336.0 only: the served-recents-search lazy chunk (3.6556.2 shared-104 co's entry). Its loader dynamically imports
  // cf9da38bc (not shipped); the adapter is the official registry entry that never loads.
  [`${PAGE}#_f`]: { name: 'servedRecentsSearchChunk', from: null, features: ['id: "served_recents_search",', 'tier: "T2",'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-123-1Hc1RTKl.js#vc': '4bdf83ceb03569afb270eeeb69f1976d7a14ce5828651a5d66528059bbec84f1',
  'shared-25-D-aF0gt9.js#sd': '0f326b89607e78107652d0641d79f8e75e4b457a3ab1bf6990d4acd6d62be524',
  'shared-25-D-aF0gt9.js#nd': '31d12c86e529cf8c4f5482f63ee4dea62026e22a821df743d618e5d82480d66e',
  'shared-25-D-aF0gt9.js#$u': 'bca1b5a89e27f3817348b46b7fa0b6a3c14e1c60511c35cab275c6c0bfd2d2f7',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'shared-25-D-aF0gt9.js#Ky': '4884879fdd5f05cd45263c786ab487acc75ba4998798ae34e579b75402024130',
  'shared-0-CnnWnVrT.js#L0': '88cf0bf1bf85c0efbf946520561d3c867846b34225f5ceba938af1204da800cf',
  'shared-0-CnnWnVrT.js#H': 'e13bfb51ca0c80f098c73bedd739282ad7ea49e70db956178d06103fc7ca872b',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-62-DoCqVpIq.js#Xm': '6dfbfeeb6256e9f8ef98a5931a515d6521954cde2e0334439e0ffaa51d2bd4f4',
  'shared-62-DoCqVpIq.js#Zm': 'd45c075ed9762a801a088cf1780af1f196831a2c59f87a34a805aeea147cfa60',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-123-1Hc1RTKl.js#Gq': '4f900f644734bfa3f944d931ef59b3912b0cd6e1176031d14a992749a8baf104',
  'shared-123-1Hc1RTKl.js#EV': '5657da3497d803ca09cb4948809ee7449a9da858fda337740ea9425abe53c378',
  'shared-26-B-POtn5S.js#PL': 'c06f8e27257762223613885c41d2c8a93149fba246cc3355e5f4e338ccca429c',
  'shared-26-B-POtn5S.js#BL': '052eba25a30f912a8d5783ada6275d69166a226938f6dc72785e030a0d672031',
  'shared-26-B-POtn5S.js#xR': 'bb1d3e1b751d7a38389b49e98d3d8e300c8e7e651a9d94ac83731339b2d0442c',
  'shared-26-B-POtn5S.js#bR': '307beeba5a2a5f1eb9a2bcc283f7e3e7e6ac9d9a91f782aed1b83ad378dc24a1',
  'shared-26-B-POtn5S.js#gR': 'af097bf46b6fa0acf893febd76717af23e66ca5c0788456a81a43c652d959746',
  'shared-92-BOgyxePb.js#QW': '25f790821496bd30bd0b8927e0d2bd7dca8f16140d9fd9459be72a93e6c4ec3b',
  'shared-92-BOgyxePb.js#wC': '27cd940ea89122f23cf7a901a15e81e07eb2cd025af6ce4fdbc8c1ffc2f9c6c4',
  'shared-92-BOgyxePb.js#FC': '1022dfa9b925592766d5bbedc265a6ef13e478ef22ac1bb4c6017dece3a7d68f',
  'shared-2-CsjIBQD8.js#Fq': '378a07bcaf2b1e39e815b58beced9e3f35643c67a43bb9b4135f9340d6d352a5',
  'shared-2-CsjIBQD8.js#E4': '0f5d73af98f0b065558ec14e8b05a8070b259546ad2eb47ab0e0c2726f74706b',
  'shared-2-CsjIBQD8.js#cH': 'a2b5b377799d5975b7db5525c74bf259ddbe5b3212dcba1e1a33a623f0524f8d',
  'shared-2-CsjIBQD8.js#eG': '02872ecc056a01cad3e9979caf720f06aa0fcde8a68f22c68512b01f1c90cf95',
  'shared-140-DfG6VwpK.js#Ta': '4379017c278bcc18adce2002129a707ecfdf1032e229fbc38071db76770c60d7',
  'shared-140-DfG6VwpK.js#Zu': '5c7419f2a3a95c268818f678c6e9aa85a7b8ebbf0cb0ca560e9bc020211cdff6',
  'shared-140-DfG6VwpK.js#Ha': '6d2b7c26095c656ea392b2898c0c2d4a63a60438d0f7ecf0b28ca942e40150a3',
  'shared-140-DfG6VwpK.js#Il': 'ba5a2bf5a662f69e97c76620e46a5b6f8c491b476dc4d71839df214751eed99b',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-query-Bl2Kfzgk.js#J': 'b652c920065319f48f18f05f98b39dea44d10fe1641c124529c1d611126d4c70',
  'vendor-query-Bl2Kfzgk.js#st': '84a3a81c16806dbb8675b7b122c046feafb644606dee48774373b42618522f4a',
  'shared-3-IQTrO7Gx.js#vx': '8b61da512995fe1527c27d8af0e1754a5accb1ad8cdf0d02e65daab1d5548f51',
  'shared-18-Cfqwgjc5.js#SO': '38e9343d12e7c65f05560415fea4a0fcf06f5e24773ba44e5c5eb41659c2e18f',
  'shared-212-BHMAi0oa.js#Wq': '14e5537355c595f62ed2d75fb11ba33894cddbadf572d517df6b9317bf187689',
  'shared-153-DMw2VzSq.js#Cy': '1bada9b0eb89dfec0ef49c45fb13679483d43903f5d544437a8c5e1be5c1b2ed',
  'shared-153-DMw2VzSq.js#RS': 'a796fba605c64a91ffb6d9bed12a1843c23be8ee1e2d27e2647fd84cecd7ef76',
  'shared-153-DMw2VzSq.js#ub': '0bd214fac0b2d7354821a6ee306dcb83e505a71efb5f3e60ca457d0d62a81ffa',
  'shared-153-DMw2VzSq.js#X1': 'ad3332c574544a87d07e5845789e052cbdeed70b923029c29203d6e1e6145462',
  'shared-153-DMw2VzSq.js#Yl': 'ee219208ae4135fccdbf71e5d8309ef76a730cb39881e36be9e3560627876fce',
  'shared-8-BqfCbkJd.js#My': 'fc5148637e52ab083120651244487bed4d2f6cca2b9893e27ffa7f835aa18d9c',
  'shared-8-BqfCbkJd.js#SD': '38ab9bbc08be97a15c6804b12e1ed9fedc2d2ecc8b028570700b29d2e46c633f',
  'shared-39-ZCs0lAwB.js#gE': '65dddb851b88afb9af0435972db488753112a01a19c08608de7c809444175ee5',
  'shared-39-ZCs0lAwB.js#vk': 'dade5be1ebd664e30ad7f57192ef545571fd7b0d7c358c16da55afad8fef134a',
  'shared-39-ZCs0lAwB.js#yk': '8ae625cc6675a6442057b929959c36d8ac39167412260546a1efd1c64ce7543f',
  'shared-39-ZCs0lAwB.js#tk': '6f2f9e84d350873d8455cdf575e96fe5e418c0f0da6a1892a1ce20de8d420ed6',
  'shared-39-ZCs0lAwB.js#VE': 'fdc091929fe6d8e736187c42d7c9d30deae2b2c5eb88b53f50c101c358b58d6d',
  'shared-39-ZCs0lAwB.js#Af': '4530485819a3edb66fa228af62fa9aad24a2eb71c0372331174ade642d40d15d',
  'shared-39-ZCs0lAwB.js#PT': '4205772511484b224ae4810fc8dc2edce8baf24d357366617a87134e16474d7d',
  'shared-39-ZCs0lAwB.js#GT': 'cbcd7dba36cfb5be999cc428c43bafc27e5664de8150e7e6e957cf561117e4ee',
  'shared-39-ZCs0lAwB.js#IT': 'd12c17a5d4a12fe589f2dacdf2097386f177122fdd3ffa84a797bd3bc5ba7764',
  'shared-39-ZCs0lAwB.js#Ch': '39ca29403ba3e3e79d90ae0916393eb4787395e2f77a788230310902a2054879',
  'shared-39-ZCs0lAwB.js#rk': 'd0e9c7b3974e1ad53dce9e10e6e994a16a3902fe0b708581b23f8f70cb29bd0d',
  'shared-39-ZCs0lAwB.js#xk': '71043b4387d74401dcbfe1728b46153937017131f0e7ad21a5fbf81abc44a6af',
  'cc18d27d7-CJQ6OnqZ.js#M': 'db65e0c0566720b28705e62f030e40f2980ffd1da8ccef4717e6182d8ac2d929',
  'cc18d27d7-CJQ6OnqZ.js#N': 'd9b3b6830785d1fcd1f4ed68636b6dcfd0adc8ba99e3c6301c82929668e314d7',
  'cc18d27d7-CJQ6OnqZ.js#R': '01579973acf631c77fb40ec298310c42d09fb585cf5ae15ea6dcfc79415f1f86',
  'cc18d27d7-CJQ6OnqZ.js#P': '6aa87567c416824dd03cdf60bc859140748f668d8cad6dd9e5c2fbeeb011469f',
  'shared-20-DUEo90UF.js#sL': '5b48076f0cff0a2e8c2a9ddfaecb5a9f6c2a001a5cdb3aaf2b8453d609eb1aae',
  'cd540469d-CDk6ufaF.js#p': '8b49e7f36c274519a851aaa1db3741e82fa75bbef56f4a90802867a4d8963cce',
  'cd540469d-CDk6ufaF.js#m': '8c3c07cf33c29a6a61c76510dad303ef97651d4627d8e26ffe5bbc1ab035a929',
  'shared-183-B2N6Zy4J.js#Lh': 'a49e5bc888633cc9f6ecffeceaec30ae58e94b145945991006c56425cb061a9f',
  'cc18d27d7-CJQ6OnqZ.js#F': 'bbc7a1c7d8d1e0771abf12d5fa3aed2126cbe5edf6d0feecff02feab8cf218a3',
  'shared-140-DfG6VwpK.js#vd': '1e5e87b4d33acdaa59fcb4810b27e175d8b1294ee1a99e7935405ff291ab53f7',
  'shared-140-DfG6VwpK.js#Za': '67d88d2f05d281e809370ded2269fb87cb3b56d7c3f1dd23c55dd9c1ba722836',
  'c4acc1503-BXsdaWDM.js#m': '79ffa4a7a92142ea5c69d34a9a617d558f6f3d3d6cd46558d3e67cc800d54e39',
  'shared-140-DfG6VwpK.js#Qf': '16f8204408590cfb970196eaab60a0519a4fe5d06afd295e0c75f1e059630d7a',
  'shared-20-DUEo90UF.js#uD': 'f04d292d8b055e75557e24512ba9d9880c68000178c9810dd558fa909edb8017',
  'shared-20-DUEo90UF.js#sD': '4b6b3cd3e81163b43fbbddad68aa03e54005fdbaa86830d351e12907efedeb46',
  'cbf576839-Bj8Ku-Zr.js#I': 'c11d13c4e901537b9cdd0d007dc8d1d10dce037da602996b0b5e9cd0f455d782',
  'cbf576839-Bj8Ku-Zr.js#B': '871081358843df850d66578938dadcc15f07771b85a84a0cc95ffc2021ee7d1e',
  'cbf576839-Bj8Ku-Zr.js#z': '3a842d063ae6392a270fe84bb239752741e3eabda82e40ec868d353a4ba8b583',
  'c24d8b988-CZipWU6K.js#M': 'c9bed63d9974ff588260eece1b2e272f9f0e2e31f07494d4bd1b344a7deed200',
  'shared-1-D1bGaTaN.js#S2': '21344f9beba9672ab5b839ffb15b195a4448964ea462a723594a6157e44c301b',
  'shared-123-1Hc1RTKl.js#d_': '18a5ea3e62d6516898c1a759a203ae2f3b5acbebe2d9da17592eb3b93a70e075',
  'shared-2-CsjIBQD8.js#Ly': 'c585df371a4918a63ce998eec5c5e49619716b1fcea1a57266915e3dea3f9e3d',
  'shared-2-CsjIBQD8.js#aw': 'ce6ac179427c0e33ceda990e5786f207a225a663b00ad6cfd9c391c7cddd954f',
  'cbd6c85c8-CxDdK_2w.js#_f': 'df58afb1d3c0671576bfc928330b3e79d7d18215d94cde0c1029f9624c738338',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

const LINKED_AREAS = ['code-routines-v4', 'cowork-scheduled-v4', 'files-changes-v4', 'r3b-transcript-v4', 'routines-shared-v4', 'working-line-v4',
  { area: 'approval-landing-v4', modules: ['focus-ring.mjs', 'focus-name.mjs'] },
  { area: 'code-current-v4', modules: ['sessions-page-load-hold.mjs', 'sessions-page-copy.mjs', 'sessions-page-selection-bar.mjs', 'sessions-page-bulk-actions.mjs', 'sessions-page-row.mjs'] }];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z0-9]+|c[0-9a-f]+|preload-helper|rolldown-runtime)-/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CHUNKS = [
  'cb5a8eb56-BN1EPnKZ.js', 'c36a59cfe-BszmBAXl.js', 'ccd3f66ef-CKxySLVC.js', S0, S2, S8, S25, S26, S33, S39, 'shared-5-u8kha2eH.js', S62, S92,
  S153, official.sharedFrame, QUERY,
];
// Official top-level statements of the page chunk that touch a selected binding without assigning it (runSlicer carries
// assigning ones by itself): `var Xp=new Map;St(()=>Xp.clear());` registers the remembered-search store (Zp) with the
// sign-out reset, as the 3.6556.2 Hf's `var Tf=new Map;J(()=>Tf.clear());` (scripts/extract-sessions-page.mjs statements).
export const PAGE_CARRY = ['St(()=>Xp.clear())'];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: file === PAGE ? 'sessions-page.mjs' : target(file), internal: Object.values(roots).some(r => r.export === null),
    ...(file === PAGE ? { carryStatements: PAGE_CARRY } : {}),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map(), { report = false } = {}) {
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
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (!report) {
        if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
        if (!pin) throw Error(`${file}#${local}: no reviewed pin`);
        if (pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      }
      found.push({ file, local, name: spec.name, export: alias, declarationSha256 });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map(), { report = false } = {}) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (!report) {
      if (!pin) throw Error(`adapter ${key}: no reviewed pin`);
      if (pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    }
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256 });
  }
  return out;
}

// The host adapter module exports exactly the adapted names: re-exported from the host adapter that documents it, or
// (from: null) declared by the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const reexported = new Map(), own = new Set();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) reexported.set(part.split(/\s+as\s+/).pop(), `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function|async function|class) ([\w$]+)/gm)) own.add(m[1]);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) {
    if (from === null ? !own.has(name) : reexported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not ${from === null ? 'declared' : `re-exported from ${from}`}`);
  }
  for (const name of [...reexported.keys(), ...own]) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (from === null) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function|class) ${name.replace('$', '\\$')}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the sessions-page-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function sessionsPageV4Config() {
  return {
    name: 'sessions page (4.16336.0)', generator: 'extract-sessions-page-v4.mjs', output: path.join(root, SESSIONS_PAGE_V4_OUTPUT),
    adapterModule: '../../source-sessions-page-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites: [], linkedCopies: {}, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/sessions-page/prestage/tools/probe.mjs) explores the same configuration.
export const probeConfig = sessionsPageV4Config;

export async function extractSessionsPageV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const l of LINKED_AREAS) { const area = typeof l === 'string' ? l : l.area; linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'))); }
  const cfg = {
    ...sessionsPageV4Config(),
    async artifacts(m) {
      // Every adapter is used (an unused entry would hide a binding that moved).
      const used = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.includes('#') ? i.via.split('#')[0] : i.via.split(':')[0]}#${i.original}`)));
      const unused = Object.keys(HOST_ADAPTERS).filter(k => !used.has(k));
      if (unused.length) throw Error(`unused adapters: ${unused.join(', ')}`);
      return {
        'index.mjs': `// Semantic names for the sessions-page roots (${official.referenceVersion}); generated by extract-sessions-page-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${file === PAGE ? 'sessions-page.mjs' : target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-sessions-page-v4.mjs',
          previous: { generator: 'scripts/extract-sessions-page.mjs', output: 'src/generated/sessions-page', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, roots, adapters, notPorted: NOT_PORTED,
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots(new Map(), { report: true })) console.log('root', `${f.file}#${f.local}`, f.export, f.declarationSha256);
    for (const a of await pinAdapters(new Map(), { report: true })) console.log('adapter', a.original, a.declarationSha256);
  } else await extractSessionsPageV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
