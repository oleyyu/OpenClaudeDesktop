// Extract the 3.6556.2 Code sidebar sections (3.6556.2 migration w3-sidebar-sections-gen; research/sidebar.md §3.2; first
// cut research/sidebar-sections.md WI-1): the shared-52 sections model and the custom-group store actions it is driven
// by, the shared-18 group/folder/section copy, group label row and status dot, the shared-46 disabled reasons, header-menu
// pieces, Archive all, section reorder and sortable wrapper (2.42304.0 shared-19), the shared-11 group-mode hooks (2.42304.0
// shared-16), the shared-21 filter controls, blank-area menu and section badge, the shared-22 section view menu and
// visible-section rule, and the shared-20 header menu, new-section dialog and Move to menus. Nothing is executed.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source; each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. The store actions
// are the one exception to "top-level": they are object properties of the shared-52 zustand creator, sliced verbatim
// and wrapped in a `(e, t)` factory whose parameters are the creator's own (set, get), after asserting that nothing
// else from the creator's scope is read. Each dependency resolves to exactly one of:
//   - another module generated here (same run, same output tree);
//   - a React / ReactDOM / react/compiler-runtime export of vendor-frame (official-3.6556.2.mjs reactAliases, checked
//     with assertVendorAlias / assertCompilerRuntime, R3);
//   - an already generated module that holds the *same original binding*: view-tabs by its public (semantic) name
//     (manifest.publicNames must name this file and local; the React Compiler helpers J9/J8/J0…Z5 are view-tabs' only,
//     E3), sidebar-resize by its manifest exports, code-current / app-switch by their exports (the module must be a
//     3.6556.2 slice listing this very binding) -- never a second copy of a context or store. Bindings without an explicit `externals` entry are
//     looked up in those areas automatically (same file, same local, exported), so a producer that already holds a
//     binding is always preferred over a second slice;
//   - a named host adapter in src/source-sidebar-sections-adapters.jsx.
// Roots, adapters and externals all carry feature strings that must still appear in the original text (R2: literals,
// keys, classes, i18n ids; minified statements only through looseFeature), so a version bump that re-points a minified
// name fails here instead of silently binding the wrong value.
//
// Targets whose original bindings now live in two chunks (session-keys, group-mode, menu-triggers, section-badge) keep
// their file and export names (R4/E7): the second chunk is its own target and the first re-exports it (`reexports`).
// Its consumer sidebar-reorder reads this manifest as 3.6556.2 through scripts/sidebar-sections-compat.mjs; the E34
// legacy['2.42304.0'] view and its frozen JSON are gone (w10-cleanup-sidebar-legacy).
//
// D0: own generator, own output folder (src/generated/sidebar-sections) plus the main-process copy of the pure model
// (electron/generated/sidebar-sections-*.mjs, adapter-free), own scripts/verify-gen-sidebar-sections.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { sidebarResizeManifestFor } from './sidebar-resize-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/sidebar-sections');
const generatedRoot = path.join(root, 'src/generated');
const adapterFile = path.join(root, 'src/source-sidebar-sections-adapters.jsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };
const loose = official.looseFeature;
const S18 = 'shared-18-D3y8YMFN.js', S46 = 'shared-46-BIbZBGFq.js', S52 = 'shared-52-uHFNjl7C.js', S21 = 'shared-21-R7LldJ05.js';
const S20 = 'shared-20-mUr7IqZY.js', S22 = 'shared-22-Bwn3sJTG.js', S11 = 'shared-11-_AVGLHEz.js', S16 = 'shared-16-ByfgAyLr.js';
const S19 = 'shared-19-DIKJVT7c.js', S26 = 'shared-26-CGuBxVt9.js', S6 = 'shared-6-sd9jbJqs.js', S8 = 'shared-8-Db1QN4mf.js';
const S25 = 'shared-25-DOWZRSlq.js', S78 = 'shared-78-D5Fw2h0a.js', SF = official.sharedFrame, VF = official.vendorFrame;

// vendor-frame re-exports React / ReactDOM / react/compiler-runtime (R3: every alias from official.reactAliases).
const vendor = { [VF]: official.reactAliases };

// Original bindings (file:local) that already live in a generated module. `features` must appear in the binding's
// same-chunk closure. view-tabs is addressed only by its public names (D1); code-current, app-switch and sidebar-resize
// by the export the module gives that binding. Bindings not listed here are still resolved to those areas when one of
// their modules holds and exports the same file:local (see autoExternal).
const externals = {
  // E3/R3: the React Compiler helpers are view-tabs' (one copy); their declarations are checked by assertCompilerHelpers.
  ...Object.fromEntries(Object.values(official.compilerHelpers).map(({ local, name }) => [`${SF}:${local}`, { area: 'view-tabs', name, features: [] }])),
  [`${SF}:us`]: { area: 'view-tabs', name: 'CdsIcon', features: ['"data-cds": "Icon"', '"data-cds-rotate"'] },
  [`${SF}:Uu`]: { area: 'view-tabs', name: 'CdsButton', features: ['iconPosition'] },
  [`${SF}:ab`]: { area: 'view-tabs', name: 'CdsConfirmationDialog', features: ['confirmLabel', 'closeOnConfirm'] },
  [`${SF}:ba`]: { area: 'view-tabs', name: 'CdsDensityContext', features: ['("comfortable")'] },
  [`${VF}:ln`]: { area: 'view-tabs', name: 'DirectionContext', features: [] },
  [`shared-4-DUB1Oi0O.js:lp`]: { area: 'view-tabs', name: 'isFizzyLakePartEnabled', features: ['getAttribute('] },
  [`${VF}:ve`]: { area: 'view-tabs', name: 'clsx', features: ['arguments.length'] },
  [`${SF}:Xm`]: { area: 'view-tabs', name: 'CdsTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus'] },
  [`${SF}:GT`]: { area: 'view-tabs', name: 'CdsDropdown', features: ['SubmenuTrigger:'] },
  [`${VF}:Sm`]: { area: 'view-tabs', name: 'CdsMenuCreateHandle', features: ['"Menu")'] },
  [`${SF}:nb`]: { area: 'view-tabs', name: 'CdsDialog', features: ['Root:', 'Footer:'] },
  [`${SF}:uC`]: { area: 'view-tabs', name: 'CdsTextInput', features: ['clearable'] },
  [`${SF}:lo`]: { area: 'view-tabs', name: 'CdsRoot', features: ['pageBackground'] },
  [`${SF}:mL`]: { area: 'view-tabs', name: 'CdsPulse', features: ['"data-cds": "Pulse"'] },
  // code-current (3.6556.2, w2-sidebar-current-a/b): the row primitives, rename field, fade label, sidebar menu rows and
  // ordered groups (shared-16 jl / Ll register into Al's context), the ordered menu (DO), the list context and group
  // toggles (YO, mk/gk/_k/hk), Collapse all / Expand all (vk) and the list-menu reasons (MO: Archive all's two).
  [`${S18}:_k`]: { area: 'code-current', target: 'sidebar-row-primitive.mjs', name: 'sidebarHitRowClass', features: ['hit-row'] },
  [`${S18}:Dk`]: { area: 'code-current', target: 'sidebar-row-view.mjs', name: 'useSidebarRename', features: ['optimisticLabel'] },
  [`${S18}:Ok`]: { area: 'code-current', target: 'sidebar-row-view.mjs', name: 'SidebarRenameInput', features: ['onValueChange'] },
  [`${S18}:$k`]: { area: 'code-current', target: 'sidebar-fade-label.mjs', name: 'SidebarFadeLabel', features: ['cleared'] },
  [`${S16}:jl`]: { area: 'code-current', target: 'sidebar-menu-groups.mjs', name: 'SidebarMenuItem', features: ['.Item, { ...e }'] },
  [`${S16}:Ll`]: { area: 'code-current', target: 'sidebar-menu-groups.mjs', name: 'OrderedSidebarMenuGroups', features: ['registerRow'] },
  [`${S46}:DO`]: { area: 'code-current', target: 'sidebar-menu-order.mjs', name: 'SidebarOrderedMenu', features: ['order:'] },
  [`${S46}:YO`]: { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'SidebarListContext', features: [] },
  [`${S46}:vk`]: { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'SidebarGroupViewItems', features: ['"Collapse all"', '"Expand all"'] },
  [`${S46}:MO`]: { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'sidebarListMenuReasons', features: ['"Nothing to archive right now."'] },
  [`${S18}:KO`]: { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'SidebarStatusLayout', features: [] },
  [`${S18}:OA`]: { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'sidebarStatusMessages', features: ['"Unread response"', '"Running"'] },
  [`${S18}:hO`]: { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'sidebarErrorColors', features: ['"text-danger"'] },
  // w10-ccres-nested-parts: the plain status dot, the hit-row main class and the error icon are code-current's one 3.6556.2
  // copy (nested-session-parts.mjs); status-dot.mjs and group-label.mjs re-export them under their own names (R4).
  [`${S18}:qv`]: { area: 'code-current', target: 'nested-session-parts.mjs', name: 'NestedStatusDot', features: ['"status-dot"', 'onAnimationStart: Kv'] },
  [`${S18}:vk`]: { area: 'code-current', target: 'nested-session-parts.mjs', name: 'sidebarHitRowMainClass', features: ['hit-row-main'] },
  [`${S18}:HA`]: { area: 'code-current', target: 'nested-session-parts.mjs', name: 'NestedErrorIcon', features: ['"Warning"', 'size: "sm"'] },
  // app-switch (3.6556.2): the clay dot, its "needs you" mapping and colour, the infinite-animation sync.
  [`${S18}:NC`]: { area: 'app-switch', target: 'app-switch-frame.mjs', name: 'ClayStatusDot', features: ['"clay"'] },
  [`${S18}:KC`]: { area: 'app-switch', target: 'app-switch-frame.mjs', name: 'hubAttention', features: ['"awaiting" ? "ready"'] },
  [`${S18}:WC`]: { area: 'app-switch', target: 'app-switch-frame.mjs', name: 'needsYouColor', features: [] },
};

// Host dependencies: runtime services this app answers itself, keyed by the original binding (file:local) the import
// alias resolves to. `features` must appear in that binding's same-chunk closure.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (useStartIntl / StartMessage).
  [`${official.vendorIntl}:q`]: { name: 'useIntl', features: ['[React Intl]'] },
  // q: the frame zustand store; the sections/custom-group slice, the overflow-menu flag and the resolved mode.
  [`${S52}:q`]: { name: 'useSidebarSectionsStore', features: ['addSection: (e) =>', 'setSectionView: (t, n) =>', 'setOverflowMenuOpen', 'resolvedMode'] },
  // shared-16 Fh (exported `Tt`; old Pp): the custom-group overlay gate (GrowthBook + presets gate): {overlayEnabled, environments}.
  [`${S16}:Fh`]: { name: 'useSidebarOverlayGate', features: ['overlayEnabled: n, environments: e'] },
  // shared-11 wl (exported `Jo`; old rc) the presets gate hook, Tl (old ic) the same read outside render; D10: on.
  [`${S11}:wl`]: { name: 'usePresetsGate', features: [loose('b(gl) ?? _l ?? !1')] },
  [`${S11}:Tl`]: { name: 'presetsGateNow', features: ['"claudeai_cc_epitaxy_session_presets_main"'] },
  // shared-25 cc (exported `vh`; old ml): "running in the Claude desktop app" (user agent + claudeAppBindings).
  [`${S25}:cc`]: { name: 'useIsDesktopApp', features: ['window.navigator.userAgent', 'version: t, platform: n'] },
  // shared-25 Z (exported `zr`): the current account (the archive rule exempts agent sessions you started).
  [`${S25}:Z`]: { name: 'useCurrentAccount', features: ['"Must call inside CurrentAccountProvider"'] },
  // shared-46 SN (exported `wn`; old shared-19 e2): Status grouping offered (GrowthBook claudeai_session_state + account setting).
  [`${S46}:SN`]: { name: 'useStatusGrouping', features: ['"claudeai_session_state"', 'ccr_session_state_buckets'] },
  // Telemetry (D17): section_changed, custom_group_changed.
  [`${S8}:qb`]: { name: 'trackSectionChange', features: ['"claudeai.epitaxy.sidebar.section_changed"'] },
  [`${S16}:zh`]: { name: 'trackCustomGroupChange', features: ['"claudeai.epitaxy.sidebar.custom_group_changed"'] },
  // shared-11 up (exported `da`; old Zu): how many sessions (with their nested families) a group would release.
  [`${S11}:up`]: { name: 'countGroupSessions', features: ['a.startsWith("code:")'] },
  // shared-46 Archive all inputs (old shared-19): FO (old PX) the keys open in a pane, popout or as the current route, tk
  // (exported `ei`; old YX) the archive flow with its confirmations, XO (old qX) its gate.
  [`${S46}:FO`]: { name: 'sidebarOpenSessionKeys', features: ['popoutWindows', 'extraPanesByMode'] },
  [`${S46}:tk`]: { name: 'useSidebarBulkArchive', features: ['beginBulkArchive', 'confirmArchive'] },
  [`${S46}:XO`]: { name: 'useArchiveAllEnabled', features: ['"__gb__873492543"'] },
  // The blank-area menu's New environment: the Code page navigator (shared-16 z_, old zm), the home routes (shared-78 FY,
  // old wq), the draft reset + navigation (shared-20 ET, old ST) and the lazily loaded environment dialog (shared-21 uG, old lB).
  [`${S16}:z_`]: { name: 'useSidebarNavigate', features: ['markCodeSessionOpenNavQueued'] },
  [`${S78}:FY`]: { name: 'useHomeRoutes', features: ['cowork: "/new"'] },
  [`${S20}:ET`]: { name: 'startCodeDraft', features: ['setDraftCustomGroupId(n)'] },
  [`${S21}:uG`]: { name: 'requestNewEnvironment', features: ['"code_sidebar_environment_dialog"'] },
  // react-intl FormattedMessage (vendor-intl Gt, exported `l`) over the local catalog.
  [`${official.vendorIntl}:Gt`]: { name: 'FormattedMessage', features: ['textComponent'] },
  // shared-11 gc (exported `us`; old Qo): the presets gate New environment waits on; D10: on.
  [`${S11}:gc`]: { name: 'usePresetsGate', features: [loose('L(hc)'), '"claudeai_cc_epitaxy_session_presets_main"'] },
  // shared-16 Hm (exported `Zt`; old of): "started by this account".
  [`${S16}:Hm`]: { name: 'isStartedByAccount', features: ['("user", e) ?? e) === t'] },
  // shared-52 wT (exported `Ld`; old EO): the analytics client.
  [`${S52}:wT`]: { name: 'useAnalytics', features: [loose('return Ly;')] },
  // shared-6: the sidebar's row registry (rows by key, keys by bucket, visible keys) and the multi-select store.
  [`${S6}:nA`]: { name: 'useSidebarSelectionStore', features: ['selectedKeys:', 'selectRange:'] },
  [`${S6}:IA`]: { name: 'sidebarBucketKeys', features: [loose('return PA.get(e)')] },
  [`${S6}:zA`]: { name: 'sidebarBucketScopeKeys', features: [loose('LA.get(e) ?? PA.get(e) ?? []')] },
  [`${S6}:BA`]: { name: 'sidebarVisibleKeys', features: [loose('e === void 0 ? MA.values() : [MA.get(e) ?? []]')] },
  [`${S6}:jA`]: { name: 'sidebarRowRecord', features: [loose('return yA.get(e)')] },
  [`${S6}:AA`]: { name: 'sidebarRowKeys', features: [loose('[...yA.keys()]')] },
  [`${S6}:VA`]: { name: 'sidebarPinnedKeys', features: ['e.isPinned'] },
  // shared-11 Db (exported `On`; old n_): the responding session ids (the folded section badge's running state).
  [`${S11}:Db`]: { name: 'useRespondingSessionIds', module: 'src/source-sidebar-section-badge-adapters.jsx', features: ['subscribeResponding'] },
  // shared-18 TA (exported `as`; old wD): the error title.
  [`${S18}:TA`]: { name: 'sidebarErrorTitle', module: 'src/source-sidebar-section-badge-adapters.jsx', features: ['Object.hasOwn(', 'isKnownCategory'] },
  // shared-21 HJ (exported `br`) a Show toggle item and VJ (`Tr`) the Routines toggle's state, which the manual section's
  // view menu (Kk) adds after Metadata: they read the side-chat capability (E16: off) and the routines navigation store.
  [`${S21}:HJ`]: { name: 'SidebarShowToggleItem', features: ['offered: t', 'keepOpen: !0'] },
  [`${S21}:VJ`]: { name: 'useSidebarRoutinesToggle', features: ['"show_routines"'] },
};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text (a string, or a looseFeature RegExp). `selections` emits a
// factory around verbatim object properties of a nested creator (see storeActions). `reexports` maps an export name to
// a target generated earlier in this run (a second chunk of the same target, R4/E7).
const storeActionNames = ['toggleGroupCollapsed', 'expandGroup', 'addCustomGroup', 'keepGroupWhileEmpty', 'renameCustomGroup',
  'renamePinnedSection', 'deleteCustomGroup', 'assignToCustomGroup', 'carryCustomGroupSlot', 'setCustomGroupOrder', 'setCustomGroupOrdered',
  'moveCustomGroup', 'addSection', 'renameSection', 'deleteSection', 'moveSection', 'setSectionView', 'assignToSection', 'setOverflowMenuOpen'];
const errorTextSpec = target => ({ target, source: 'preload-helper-D0dM6GpB.js', exports: { e: 'tagErrorText' },
  features: { e: ['Symbol.for("ant.o11y.errorText")', 'enumerable: !1'] } });
// shared-52 J (exported `ym`; 2.42304.0 shared-78 U): the `${kind}:${id}` session key.
const sessionRefKeySpec = target => ({ target, source: S52, exports: { J: 'sessionRefKey' }, features: { J: ['`${e.kind}:${e.id}`'] } });
const modelSpec = (target, refKey) => ({
  target, source: S52,
  // 2.42304.0 locals in order: U W np rp ip ap op sp cp lp up dp fp pp mp hp gp _p vp yp bp xp Sp Cp wp Tp Ep Dp Op kp Ap jp
  // Mp Np Pp Fp Ip Lp Rp zp Bp lm um dm fm pm mm hm gm _m wm Tm Em Dm Om km Mm _h vh yh jh (research/sidebar.md §3.2).
  exports: {
    im: 'stringArray', K: 'isPlainRecord', am: 'sectionSchemaVersion', om: 'sectionMetadataSchemaVersion', sm: 'sectionCarriesMetadata',
    cm: 'pinnedSectionId', lm: 'routinesSectionId', um: 'sessionsSectionId', dm: 'sectionViewDefaults', fm: 'routinesCollapsedByDefault',
    pm: 'createSection', mm: 'defaultSections', hm: 'defaultSection', gm: 'defaultCodeSidebar', _m: 'sessionsGroupByFromLegacy',
    vm: 'legacyGroupByFromSessions', ym: 'sectionGroupBys', bm: 'sectionSortBys', xm: 'sectionKinds', Sm: 'isSectionGroupBy',
    Cm: 'isSectionSortBy', wm: 'normalizeSectionGroupBy', Tm: 'normalizeSectionView', Em: 'normalizeSections', Dm: 'normalizeCodeSidebarByScope',
    Om: 'withSectionId', km: 'dedupeSections', Am: 'ensureFixedSections', jm: 'customGroupMembers', Mm: 'sameMembers', Nm: 'reconcileSections',
    Pm: 'defaultSectionCollapsed', Fm: 'resetSectionCollapse', Im: 'restoreSectionCollapse', Rm: 'migrateSectionMetadata',
    Bm: 'sectionsAtDefaults', Vm: 'sameSections', Hm: 'patchSectionView', Um: 'setSectionView', Wm: 'inheritSessionsView',
    Gm: 'moveSection', Km: 'seedSectionPrefs', ug: 'customGroupKeyPrefix', dg: 'customGroupKey', fg: 'emptyCustomGroups',
    pg: 'isEmptyCustomGroups', mg: 'normalizeCustomGroups', hg: 'normalizeCustomGroupsByScope', gg: 'nonEmptyCustomGroups',
    _g: 'selectCustomGroups', vg: 'findCustomGroupByName', Tg: 'mergeCustomGroups', Eg: 'selectCodeSidebar',
    Dg: 'reconcileCodeSidebar', Og: 'reconcileCodeSidebarPatch', kg: 'updateCustomGroups', Ag: 'updateSections', Ng: 'keptWhileEmptyWith',
    M_: 'defaultGroupBy', N_: 'effectiveGroupBy', F_: 'groupByShowsCustom', rv: 'codeKeyPrefix',
    sectionsStoreActions: 'sectionsStoreActions',
  },
  reexports: refKey ? { sessionRefKey: refKey } : undefined,
  features: {
    xm: ['["pinned", "routines", "manual", "sessions"]'], am: [loose('am = 2')], dm: ['emptyGroups: !1', 'sideChats: !1'],
    _m: ['case "coder":', 'return "savedEnvironment";', 'return "folder";'], vm: ['case "savedEnvironment":', 'return "environment";'],
    ym: ['["none", "folder", "savedEnvironment", "status", "date"]'], wm: ['e === "environment" ? "folder"'],
    Tm: ['sideChats:'], Em: ['!xm.includes(n.kind)', 'v: am'], km: ['a ??= Om(s, um)'], Nm: ['2 ** 53 - 1'],
    Rm: ['"metadata"'], Wm: ['"The section list has no Sessions section"', 'r === "folder" || r === "savedEnvironment"'],
    Gm: ['e[r].kind === "sessions"', 'e.length - 2'], Um: ['(n.sortBy === "alpha") != (r === "alpha")'],
    Km: ['t.isManualCollapsed(e.id)', 'sessionsCollapsed'], ug: ['"custom-"'], dg: ['"custom-ungrouped"'], Eg: ['codeSidebarByScope'],
    Dg: ['migratedFrom'], Ng: ['groupsKeptWhileEmpty'],
  },
  selections: {
    sectionsStoreActions: { kind: 'storeActions', anchor: 'addSection', parameters: ['e', 't'], properties: storeActionNames,
      features: ['cg-${crypto.randomUUID()}', 'r.kind !== "manual"', 'Ag(e, (e) => Gm(e, t, n))', 'Ag(e, (e) => Um(e, t, n))', 'pinnedName: t.trim()'] },
  },
});
const rendererModules = [
  // vendor-intl tn (exported `f`): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: official.vendorIntl, exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  errorTextSpec('error-text.mjs'),
  // vendor-all-0 v (exported `F`; old ee): zustand `create`, for the shared-21 new-section opener store (dG).
  { target: 'zustand.mjs', source: 'vendor-all-0-DXM0MGjZ.js', exports: { v: 'create' }, features: { v: [loose('(e) => (e ? _(e) : _)')] } },
  // vendor-all-0 fe (exported `w`; old ge): the debounced callback the header menu's Rename waits on (vw = 100ms).
  { target: 'debounced-callback.mjs', source: 'vendor-all-0-DXM0MGjZ.js', exports: { fe: 'useDebouncedCallback' },
    features: { fe: ['flushOnUnmount', 'window.clearTimeout(l.current)'] } },
  // vendor-frame un (exported `Ia`; old Td): Base UI useDirection over the view-tabs DirectionContext.
  { target: 'direction.mjs', source: VF, exports: { un: 'useDirection' }, features: { un: ['?.direction ?? "ltr"'] } },
  // shared-frame Ha (exported `Td`; old ja): the CDS density hook over the view-tabs CdsDensityContext; Uc the element guard.
  { target: 'cds-helpers.mjs', source: SF, exports: { Ha: 'useCdsDensity', Uc: 'elementOrNull' },
    features: { Ha: [loose('return J(ba)')], Uc: ['e?.nodeType === 1 ? e : null'] } },
  // shared-5 $L (exported `R`; old XA): dialog presence (mounted / open on the next frame / unmount after the exit).
  { target: 'dialog-presence.mjs', source: 'shared-5-Bg6ZMqvt.js', exports: { $L: 'useDialogPresence' },
    features: { $L: ['requestAnimationFrame', 'onOpenChangeComplete'] } },
  sessionRefKeySpec('session-ref-key.mjs'),
  // shared-78 Nf (old Kd, exported `YS`): the panel-layout context the section view button reads; sessionRefKey moved to
  // shared-52 J (session-ref-key.mjs).
  { target: 'session-keys.mjs', source: S78, exports: { Nf: 'PanelLayoutContext', $f: 'PanelChromeLayoutContext' }, reexports: { sessionRefKey: 'session-ref-key.mjs' },
    features: { Nf: [loose('Nf = T(null)')], $f: [loose('$f = T(null)')] } },
  // shared-9 Sw / yw (exported `Ct` / `wt`, new): the group label's icon nudge under the fizzy-lake icons part (off, E12).
  { target: 'icon-nudge.mjs', source: 'shared-9-CM21XrJw.js', exports: { Sw: 'iconNudgeStyle', yw: 'iconsPartValue' },
    features: { Sw: ['translate: "0 0.5px"'], yw: ['("icons") ? e : void 0'] } },
  // shared-19 Hj / Bj (exported `dn` / `pn`): a header menu's press guards (cancel a press that began elsewhere).
  { target: 'menu-press.mjs', source: S19, exports: { Hj: 'cancelForeignPress', Bj: 'recordPressInside' },
    features: { Hj: ['t.cancel()'], Bj: ['e.currentTarget.contains('] } },
  // shared-104 ff (exported `Sf`): a counter bumped each time a value turns truthy (the rename field's restart key).
  { target: 'rising-count.mjs', source: 'shared-104-CTONUSaz.js', exports: { ff: 'useRisingCount' }, features: { ff: ['e !== t'] } },
  // shared-18 hk (exported `Os`, a context read only under the fizzy-lake panels part) and tA (`Cs`, the panel chrome
  // icon props): the filter trigger's panels branch (off, E12). code-current's sidebar-row-view holds them unexported.
  { target: 'panel-chrome.mjs', source: S18, exports: { hk: 'PanelChromeRowContext', tA: 'panelChromeIconProps' },
    features: { hk: [loose('hk = M(null)')], tA: ['icon: eA(e)'] } },
  modelSpec('sections-model.mjs'),
  // shared-52 u_ (exported `sh`; old ih): whether the sidebar is hidden, over the frame store (the resize adapters').
  { target: 'sections-hooks.mjs', source: S52, exports: { u_: 'useSidebarHidden' }, features: { u_: [loose('return q(l_)')] },
    adapters: { [`${S52}:q`]: { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing'] } } },
  // shared-18 ck/lk/uk/dk (old vE yE bE xE): the group, folder and section copy; fk picks one, pk (exported `As`) for the
  // current mode (no longer reads resolvedMode).
  { target: 'group-copy.mjs', source: S18,
    exports: { ck: 'groupMessages', lk: 'folderMessages', uk: 'sectionMessageCatalog', dk: 'sectionMessages', fk: 'groupCopyFor', pk: 'useGroupCopy' },
    features: { ck: ['"Move to group"', '"Create and group by custom"'], lk: ['"Move to folder"'],
      uk: ['"Move to section"', '"Move {count} to section"', '"Remove from sections"', '"Create section"', '"Remove from {groupName}"'],
      dk: ['dragRemove: uk.removeFrom', 'waiting: ck.waiting'], fk: ['e ? (t ? dk : lk) : ck'], pk: ['e === "code" && t', 'overlayEnabled: t, environments: n'] } },
  // shared-18 oA (exported `vs`; old uD): the group / section label row; cA its inline rename, lA the row itself, aA the
  // min height, vk the toggle hit class.
  { target: 'group-label.mjs', source: S18,
    exports: { oA: 'SidebarGroupLabel', cA: 'SidebarGroupRenameLabel', lA: 'renderSidebarGroupLabel', aA: 'sidebarGroupLabelMinHeight', vk: 'sidebarGroupToggleHitClass' },
    features: { oA: ['e.onRename === void 0', 'label: e.children'], cA: ['startRenameRef: i', 'onRenameEntered: a', 'onRenameCleared: o', 'renameLabel: s'],
      lA: ['"data-sidebar-group-label": ""', '"data-group-toggle": ""', '"data-group-name": ""', '"data-group-mark": ""', '"data-no-row": h',
        'group/labelrow df-label-inset', 'text-muted-as-secondary'],
      aA: ['min-h-[calc(var(--df-group-pt)+(var(--df-row-h)-8px)+4px)]'], vk: ['hit-row-main'] } },
  // shared-16 Ph (exported `wt`; old Np) overlayEnabled, Ih (exported `Ct`; old Fp) the group-by the session-list filter
  // shows (custom reads as project once the overlay is on). The rest of group-mode moved to shared-11.
  { target: 'group-mode-overlay.mjs', source: S16, exports: { Ph: 'useCustomGroupOverlay', Ih: 'groupByShown' },
    features: { Ph: ['().overlayEnabled'], Ih: ['t && e === "custom" ? "project" : e'] } },
  // shared-11 (old shared-16): wf (exported `Ca`; old cp) whether a group-by shows custom groups; pf (`Aa`; old ep) the
  // mode's effective group-by (mf reads the Sessions section's under the presets gate); the Sessions section writers the
  // filter's items call: vf (`Da`; old ip) Group by, bf (`Oa`; old op) Sort by, yf (`xa`; old ap) the reset's group-by.
  { target: 'group-mode.mjs', source: S11, reexports: { useCustomGroupOverlay: 'group-mode-overlay.mjs', groupByShown: 'group-mode-overlay.mjs' },
    exports: { wf: 'showsCustomGroups', pf: 'useEffectiveGroupBy', mf: 'useStoredGroupBy', df: 'sessionsGroupByAsLegacy', Qd: 'sectionOrDefault',
      vf: 'writeSessionsGroupBy', bf: 'writeSessionsSortBy', yf: 'clearSessionsGroupBy' },
    features: { wf: [loose('(r && e === "code") || wt(e, t, n)')], mf: ['e === "code" &&', '.groupByByMode[e]'], df: ['{ groupBy: t }'],
      Qd: ['.sections.find((e) => e.id === t)'], vf: ['t !== "environment"', '{ groupBy: Ft(t) ?? "none" }'], bf: ['{ sortBy: t }'], yf: ['{ groupBy: null }'] } },
  // shared-20 tC / eC (old ES / TS): the Sessions ascending and Show › Metadata writers.
  { target: 'sessions-view-writers.mjs', source: S20, exports: { tC: 'writeSessionsAscending', eC: 'writeSessionsMetadata' },
    features: { tC: ['{ ascending: e }'], eC: ['{ show: { metadata: e } }'] } },
  // shared-21: section/group membership keys ($Q scheduled tasks, VU side sessions).
  { target: 'section-membership.mjs', source: S21, exports: { $Q: 'scheduledTaskGroup', VU: 'membershipKey', BU: 'sideParentId' },
    features: { $Q: ['"scheduled-task"'], VU: ['{ kind: "code", id: n }'], BU: ['sideParentId'] } },
  // shared-21: the session-list filter controls the section view menu is made of (Reset to defaults, View all, Name
  // sort), the new-section opener store (dG/fG), the panel-chrome helpers and the Filter trigger NJ (old aU). This is
  // the one copy of them -- code-current's sidebar-filter-controls.mjs re-exports it. SB-26: gU (focus after a keyboard
  // regroup, `keyRegroups`) is gone in 3.6556.2 (the menu's close calls nY with the trigger id instead). New: GJ (Group
  // by options: Date / Status / Folder / Environment / Custom / None). HJ (a Show toggle item: Side chats, Routines) and VJ
  // (the Routines toggle's state) read the side-chat capability and routines navigation stores: W4 (sidebar-filter).
  { target: 'section-filter-controls.mjs', source: S21,
    exports: { OJ: 'sidebarFilterMessages', qJ: 'SidebarOptionMenu', JJ: 'SidebarSortMenu', KJ: 'useSidebarSortOptions', UJ: 'SidebarViewResetItems',
      WJ: 'SidebarViewAllItem', vJ: 'useSidebarViewAll', xJ: 'sortAscendingShown', SJ: 'sortAscendingStored', dG: 'newSectionOpener', fG: 'openNewSection',
      yG: 'useNewSectionOpener', XB: 'PanelChromeContext', jz: 'panelChromeActive', OG: 'trailingControlClass',
      _J: 'SidebarViewAllContext', nY: 'focusSidebarAfterRegroup', NJ: 'SidebarFilterTrigger',
      GJ: 'useSidebarGroupByOptions', yJ: 'SidebarChromeButton', ZJ: 'menuAnchorFor', QJ: 'useMenuWheelGuard' },
    features: { UJ: ['"Reset to defaults"', '"Grouping and sorting are already at their defaults."'],
      _J: [loose('_J = k(null)')], nY: ['[data-group-toggle]', '\'[role="menu"]\''],
      NJ: ['icon: "Filter"', '"df-chrome-btn relative -my-1 aria-expanded:touch-none"', '"data-list-filter": i ? "" : void 0', '"data-held": a ? "" : void 0'],
      WJ: ['"There are no other sessions to view."'], KJ: ['"Last updated"', '"alpha"'], dG: ['({ open: null })'], fG: ['dG.getState().open?.()'],
      xJ: ['e === "alpha" ? !t : t'], jz: ['("panels")'], OG: ['group-hover/labelrow:w-auto'], OJ: ['"Side chats"', '"Group and sort"'],
      yG: ['dG.setState({ open: n })', 't("header_menu")'], GJ: ['"Environment"', '"bYA6fPCd5A"'] } },
  // shared-22 KA (old KO): which manual sections show (members, kept while empty, held rows); GA the code-key filter.
  { target: 'section-visibility.mjs', source: S22, exports: { KA: 'visibleCustomGroups', GA: 'keyInMode' },
    features: { KA: ['keptWhileEmpty: r', 'withUngrouped: c', '"scheduled-task:"'], GA: ['e !== "code" || t.startsWith('] } },
  // shared-46 (old shared-19) OO the group menu kind, NO its disabled reasons (new `day-or-status`), kO/AO their copy.
  { target: 'group-reasons.mjs', source: S46,
    exports: { OO: 'groupMenuKind', NO: 'groupDisabledReasons', kO: 'groupReasonMessages', AO: 'newSessionReasonMessages', jO: 'tooFewToSelectMessage' },
    features: { OO: ['"hand-made"', '"preset"', '"worked-out"'], NO: ['n === "hosts-loading"', 'reorder: kO.fixedAtEnd', 'case "day-or-status":'],
      kO: ['"You need at least 2 sessions here that can be selected."', '"This group stays at the end of the list."'],
      AO: ['"place-unknown"', '"host-not-saved"', '"host-shared"', '"no-folder"'] } },
  // shared-16 xl (exported `ui`; old shared-19 L$): the lazily mounted menu body.
  { target: 'lazy-menu.mjs', source: S16, exports: { xl: 'useLazyMenu' }, features: { xl: ['openOnHover', 'requestBody: u'] } },
  // shared-19 Lj (exported `mn`; old AX) close when the sidebar hides; Fj (`hn`; old kX) the overflow-menu flag.
  { target: 'menu-triggers.mjs', source: S19, exports: { Lj: 'useCloseWhenSidebarHides', Fj: 'useOverflowMenuFlag' },
    reexports: { useLazyMenu: 'lazy-menu.mjs' }, features: { Lj: [loose('i = t && !n')], Fj: [loose('e(!1)')] } },
  // shared-46 pk (exported `Qr`; old aZ) Select all, dk its keys, fk the too-few reason.
  { target: 'group-organize.mjs', source: S46,
    exports: { pk: 'SidebarGroupSelectAll', dk: 'selectableGroupKeys', fk: 'tooFewToSelectReason' },
    features: { pk: ['"Select all"', 'disabledReason: u', 'setSelection(e)'] } },
  // shared-46 lk (exported `$r`; old XX) Archive all ({count}), now kept and disabled with a reason (MO, code-current)
  // when nothing can be archived; its confirm title is `{section}: {heading}` inside a section. WO the empty bulk scope,
  // JO the unloaded-rows hook, GO the archivable rows.
  { target: 'group-archive.mjs', source: S46, exports: { lk: 'SidebarGroupArchiveAll', qO: 'UnloadedRowsContext', GO: 'archivableSessions',
    WO: 'emptyBulkScope', JO: 'useUnloadedRows' },
    features: { lk: ['"Archive all ({count})"', '"{section}: {heading}"', 'MO.archiveAllEmpty', 'disabled: !0'], qO: [loose('qO = x(!1)')], GO: ['e.isPinned', 'archivable: r, deletable: i'],
      WO: ['keys: [], archivableCount: 0, deletableCount: 0'], JO: [loose('return h(qO)')] } },
  // shared-46 section reorder (old shared-19): nM the reorder context, aM / oM Move up / Move down / Sort A to Z (Reset
  // order is gone), iM the Alt+Shift+Arrow handle and its header menu (sM), rM the gate.
  { target: 'group-reorder.mjs', source: S46,
    exports: { nM: 'SectionReorderContext', aM: 'SectionReorderItems', oM: 'SectionReorderActions', iM: 'SectionReorderHandle', sM: 'SectionReorderMenu', lj: 'insideRowAction',
      rM: 'SectionReorderGate' },
    features: { aM: ['fixedReason: t'], oM: ['"Sort A to Z"', '"Move up"', '"Move down"'], rM: ['ctx: l'],
      iM: ['e.altKey', 'e.shiftKey', '"ArrowUp"', 'childOwnsMenu'], sM: ['"New session"', 'view: w'] } },
  // shared-21 xN (exported `Vo`; old Uk): the group/section hover-within and focus-within tracking.
  { target: 'section-hover.mjs', source: S21, exports: { xN: 'sectionHoverHandlers', lN: 'hoverWithinAttribute', uN: 'focusWithinAttribute' },
    features: { xN: [loose('onMouseOver: _N, onMouseOut: vN, onFocus: yN, onBlur: bN')], lN: ['"data-hover-within"'], uN: ['"data-focus-within"'] } },
  // shared-11 Kw / qw (old Ub / Wb): which section header keeps the focus across a keyboard move.
  { target: 'section-focus.mjs', source: S11, exports: { Kw: 'markSectionFocus', qw: 'takeSectionFocus' },
    features: { Kw: [loose('Ww = e')], qw: [loose('Ww === e && ((Ww = null), !0)')] } },
  // shared-46 gM (exported `lr`; old shared-19 x$): the sortable section wrapper, uM / lM / dM the drag bridge it reads.
  { target: 'section-sortable.mjs', source: S46,
    exports: { gM: 'SectionSortable', uM: 'SectionDragBridgeContext', lM: 'SectionDragBridge', dM: 'useSectionDrag' },
    features: { gM: ['sectionIndex: n', '"menu"', '"keyboard"', '"[data-group-toggle]"'],
      uM: [loose('uM = x(null)')], lM: ['this.subscribers = new Map()'], dM: ['e.drag(t)'] } },
  // shared-22: the manual section's own Filter button (Gk) and view menu (Kk), its collapse toggle (tA), sortable id (Qk).
  { target: 'section-view-menu.mjs', source: S22,
    exports: { Gk: 'SectionViewButton', Kk: 'SectionViewMenu', tA: 'toggleSectionCollapsed', Qk: 'sectionSortableId', Xk: 'noSections' },
    features: { Gk: ['icon: "Filter"', '"df-chrome-btn relative -my-1 aria-expanded:touch-none"', '"data-row-action": ""'],
      Kk: ['"group_by"', '"sort_by"'], tA: ['{ collapsed: !e.collapsed }'], Qk: ['`section:${e}`'] } },
  // shared-20 Px (exported `ai`; old yx): the group / section header menu (new, edit, organize, view, staff, remove), now
  // with Save as environment.
  { target: 'group-menu.mjs', source: S20,
    exports: { Px: 'SidebarGroupMenu', vw: 'renameDelayMs', kx: 'pressAboveGroupLabel', Nx: 'BidiGroupName' },
    features: { Px: ['"Edit environment"', '"Save as environment"', 'onSaveAsEnvironment: s', 'confirmVariant: "danger"'],
      vw: [loose('vw = 100')], kx: ['[data-sidebar-group-label]'], Nx: ['"bdi"'] } },
  // shared-20 Tx (exported `mi`; old dx): openCreate/openCreateFrom/createModal; zx/Vx (old bx/xx) the dialog.
  { target: 'group-dialog.mjs', source: S20, exports: { Tx: 'useCreateGroupDialog', Vx: 'CreateGroupDialog', zx: 'GroupNameDialog' },
    features: { Tx: ['openCreateFrom: d', 'action: "create"'], zx: ['showClose: !1', 'onOpenChangeComplete'] } },
  // shared-20 Wx (old wx) the row menu's Move to submenu, Ux its items, Hx the remove label. The host's row menu is
  // SourceMenu, so this module keeps the SourceMenu-based dropdown (a module-level adapter wins over CdsDropdown).
  { target: 'move-to-menu.mjs', source: S20, exports: { Wx: 'MoveToSubmenu', Ux: 'MoveToItems', Hx: 'RemoveFromGroupLabel' },
    adapters: { [`${SF}:GT`]: { name: 'SidebarSectionsMenu', features: ['SubmenuTrigger:'] } },
    features: { Wx: ['"move-to-group-trigger"'], Ux: ['"new-custom-group"'], Hx: ['r.removeFromSeveral'] } },
  // shared-21 _G (exported `ci`; old _B) the Code list's blank-area context menu host, xG its body (bG's six ordered
  // sections), hG New session, gG New section…
  { target: 'blank-area-menu.mjs', source: S21,
    exports: { _G: 'SidebarBlankAreaHost', xG: 'SidebarBlankAreaMenu', hG: 'BlankAreaNewSessionItem', gG: 'BlankAreaNewSectionItem', bG: 'blankAreaMenuOrder' },
    features: { _G: ['"whitespace_menu"', '[data-jump-hint-row]'],
      xG: ['"Expand a section to select its sessions."', '"New environment"', loose('order: bG'), loose('convert: A, bulk: j')],
      hG: ['e?.onNewSession'], gG: ['e?.onNewSection', 't.newEllipsis'], bG: ['["session", "create", "select", "fold", "convert", "bulk"]'] } },
  // shared-18 IA (exported `Zo`; old FD): the status dot (CDS Pulse under the list-view context, otherwise PA); VA (`is`;
  // old BD) the error ink. VC (the appearance look) is the host's (no clay / blue appearance settings).
  { target: 'status-dot.mjs', source: S18, exports: { IA: 'SidebarStatusDot', VA: 'sidebarErrorInk', HA: 'SidebarErrorIcon', UC: 'useSidebarStatusLook' },
    adapters: { [`${S18}:VC`]: { name: 'useStatusDotLook', module: 'src/source-sidebar-section-badge-adapters.jsx',
      features: ['working: e ? "clay" : "gray"', 'needsYou: t ? "blue" : "amber"', 'errorInk: t ? "neutral" : "surface"'] } },
    features: { IA: ['"df-tab-dot-running"', 'FA['], VA: ['errorInk === "neutral" ? BA : e'], HA: ['"Warning"', 'size: "sm"'], UC: [loose('return GC()')] } },
  // shared-26 (new): the section status priorities (Nj; old IG's order) and "waiting on you" (Lj; old shared-21 LG).
  { target: 'section-status.mjs', source: S26, exports: { Lj: 'rowAwaitingYou', Pj: 'sectionStatusPriority', Fj: 'sectionStatusBlocks' },
    features: { Lj: ['e.liveStatus === "awaiting" || e.pendingPermissions > 0'], Pj: ['.priority'], Fj: ['e === "awaiting" || e === "error"'] } },
  // shared-21 NQ (exported `Wn`; old HG): the badge over a folded bucket's rows -- the highest-priority state any row has
  // (jQ over AQ), or with onlyBlocked only "awaiting"; MQ (`Un`; old VG) draws it.
  { target: 'section-badge.mjs', source: S21, reexports: { rowAwaitingYou: 'section-status.mjs' },
    exports: { NQ: 'SectionStatusBadge', MQ: 'SectionStatusGlyph', jQ: 'sectionStatusKind', AQ: 'rowStatusKind' },
    adapters: {},
    features: { NQ: ['onlyBlocked: n', 'kind: "awaiting"'],
      MQ: ['role: "img"', '"aria-label": l', 'Xp.warning'], jQ: ['(r === null ||'], AQ: ['e.source.data.isArchived', 'hasCompleted: !0'] } },
];
// The main process gets the same pure model, adapter-free (electron/main.cjs and its .mjs helpers cannot load src/).
const electronModules = [
  errorTextSpec('../../../electron/generated/sidebar-sections-error-text.mjs'),
  modelSpec('../../../electron/generated/sidebar-sections-model.mjs'),
];

const cache = new Map();
async function readSource(name, directory = source) {
  const key = `${directory}/${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(directory, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const aliases = new Map();
  for (const [alias, local] of exported) aliases.set(local, [...(aliases.get(local) ?? []), alias]);
  const record = { name, bytes, code, ast, program, exported, aliases };
  cache.set(key, record);
  return record;
}

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// Top-level bindings of the chunk that the node reads or writes (`x ??= …` only assigns x, yet needs it).
const nodeDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);

function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of nodeDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
let featureFailures = null; // --explore: collect instead of throwing
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (!missing.length) return;
  const message = `${label} lacks ${missing.map(f => (f instanceof RegExp ? String(f) : JSON.stringify(f))).join(', ')}`;
  if (featureFailures) featureFailures.push(message); else throw Error(message);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.bytes.toString(), alias, target); // R3 (react/compiler-runtime: assertCompilerRuntime)
  return target;
}

const manifestCache = new Map();
async function readJson(file) {
  if (!manifestCache.has(file)) manifestCache.set(file, JSON.parse(await fs.readFile(file, 'utf8')));
  return manifestCache.get(file);
}
function exportedLocal(text, name) {
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      if ((as ?? local) === name) return local;
    }
  return null;
}
// Areas that already hold 3.6556.2 originals; a binding they hold and export is never sliced a second time here.
const autoAreas = ['code-current', 'app-switch', 'sidebar-resize'];
let autoIndex = null;
async function autoExternal(file, local) {
  if (!autoIndex) {
    autoIndex = new Map();
    const viewTabs = await viewTabsManifestFor(referenceVersion);
    for (const [name, pub] of Object.entries(viewTabs.publicNames ?? {})) {
      const key = `${pub.file}:${pub.local}`;
      if (!autoIndex.has(key)) autoIndex.set(key, { area: 'view-tabs', name, features: [] });
    }
    for (const area of autoAreas) {
      const manifest = area === 'sidebar-resize' ? await sidebarResizeManifestFor(referenceVersion) : await readJson(path.join(generatedRoot, area, 'manifest.json'));
      for (const module of manifest.modules ?? []) {
        if ((module.referenceVersion ?? manifest.referenceVersion) !== referenceVersion || !module.source) continue;
        const file = path.basename(module.source);
        if (area === 'sidebar-resize') {
          for (const [l, name] of Object.entries(module.exports ?? {})) { const key = `${file}:${l}`; if (!autoIndex.has(key)) autoIndex.set(key, { area, target: module.target, name, features: [] }); }
          continue;
        }
        const names = new Set((module.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name)));
        const text = await fs.readFile(path.join(generatedRoot, area, module.target), 'utf8').catch(() => '');
        for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
          for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
            const [l, as] = part.split(/\s+as\s+/);
            const key = `${file}:${l}`;
            if (names.has(l) && !autoIndex.has(key)) autoIndex.set(key, { area, target: module.target, name: as ?? l, features: [] });
          }
      }
    }
  }
  return autoIndex.get(`${file}:${local}`) ?? null;
}

// Proves `entry` (a generated module export) is the original binding file:local and returns the module path.
async function resolveExternal(file, local, entry) {
  const area = path.join(generatedRoot, entry.area);
  if (entry.area === 'view-tabs') {
    const manifest = await viewTabsManifestFor(referenceVersion);
    const pub = manifest.publicNames?.[entry.name];
    if (manifest.referenceVersion !== referenceVersion || !pub || pub.file !== file || pub.local !== local)
      throw Error(`view-tabs public name ${entry.name} is not ${file}:${local}`);
    return path.join(area, pub.file);
  }
  const manifest = entry.area === 'sidebar-resize' ? await sidebarResizeManifestFor(referenceVersion) : await readJson(path.join(area, 'manifest.json'));
  const module = manifest.modules.find(m => m.target === entry.target);
  if (!module) throw Error(`${entry.area}/${entry.target} is not generated`);
  const modulePath = path.join(area, entry.target);
  if (entry.area === 'sidebar-resize') {
    if (module.source !== file || module.exports?.[local] !== entry.name) throw Error(`${entry.area}/${entry.target} does not export ${file}:${local} as ${entry.name}`);
    return modulePath;
  }
  const text = await fs.readFile(modulePath, 'utf8');
  const theirs = exportedLocal(text, entry.name);
  const names = module.bindings.map(b => (typeof b === 'string' ? b : b.name));
  if (!theirs || !names.includes(theirs)) throw Error(`${entry.area}/${entry.target} does not export ${entry.name}`);
  const sourceName = path.basename(module.source);
  // w10-ccres-nested-parts: every producer this tree imports from is 3.6556.2 (owner-window and nested-session-parts were
  // the last 2.42304.0 ones), so the earlier-release alpha-equivalence branch is gone.
  const version = module.referenceVersion ?? manifest.referenceVersion;
  if (version !== referenceVersion) throw Error(`${entry.area}/${entry.target} is ${version}, not ${referenceVersion}`);
  if (sourceName !== file || theirs !== local) throw Error(`${entry.area}/${entry.target}: ${entry.name} is ${sourceName}:${theirs}, not ${file}:${local}`);
  return modulePath;
}

// The store actions: properties of the one object literal returned by the `(e, t) => ({ …, <anchor>: … })` creator.
function storeActionsSelection(src, name, config) {
  const found = [];
  src.program.traverse({
    ObjectProperty(p) {
      if (p.node.key.type !== 'Identifier' || p.node.key.name !== config.anchor) return;
      const object = p.parentPath, creator = object.parentPath;
      if (creator.isArrowFunctionExpression() && creator.node.body === object.node) found.push({ object, creator });
    },
  });
  if (found.length !== 1) throw Error(`${name}: ${found.length} creators own "${config.anchor}"`);
  const { object, creator } = found[0];
  const params = creator.node.params.map(n => n.name);
  if (JSON.stringify(params) !== JSON.stringify(config.parameters)) throw Error(`${name}: creator parameters are (${params}), not (${config.parameters})`);
  const props = config.properties.map(key => {
    const matches = object.get('properties').filter(p => p.node.key?.type === 'Identifier' && p.node.key.name === key);
    if (matches.length !== 1) throw Error(`${name}: ${matches.length} "${key}" properties`);
    return matches[0];
  });
  // Program bindings become dependencies; the creator's own scope may only contribute its (set, get) parameters; any
  // binding of a scope between the creator and the program would be lost by slicing.
  const deps = new Set();
  const touches = (binding, prop) => binding.referencePaths.some(q => within(prop, q)) || binding.constantViolations.some(q => within(prop, q));
  for (const prop of props) {
    for (const dep of nodeDeps(src, prop)) deps.add(dep);
    for (const [local, binding] of Object.entries(creator.scope.bindings))
      if (touches(binding, prop) && !params.includes(local)) throw Error(`${name}: ${prop.node.key.name} reads creator local ${local}`);
    for (let scope = creator.scope.parent; scope && scope !== src.program.scope; scope = scope.parent)
      for (const [local, binding] of Object.entries(scope.bindings))
        if (touches(binding, prop)) throw Error(`${name}: ${prop.node.key.name} reads ${local} from an enclosing scope`);
  }
  const text = props.map(p => src.code.slice(p.node.start, p.node.end));
  return {
    deps: [...deps],
    block: `function ${name}(${params.join(', ')}) {\n  return {\n${text.join(',\n')}\n  };\n}`,
    record: { binding: name, kind: config.kind, anchor: config.anchor, parameters: params,
      properties: props.map((p, i) => ({ name: p.node.key.name, sha256: sha(text[i]) })) },
    features: text.join('\n'),
  };
}

// The slicing core: emits `specs` in order (targets relative to `base`) and returns their text plus manifest records.
export async function sliceOriginalModules({ modules: specs, base = output, explore = null, auto = true }) {
  const emitted = [];
  const manifestModules = [];
  const files = {};
  for (const spec of specs) {
    const src = await readSource(spec.source);
    const self = path.resolve(base, spec.target);
    const selected = new Map(), selections = new Map(), imports = new Map(), seen = new Set();
    const sibling = (file, local) => emitted.find(m => m.spec.source === file && m.spec.exports[local]);
    const fromSibling = (owner, local, via) => ({ from: rel(self, path.resolve(base, owner.spec.target)), name: owner.spec.exports[local], via, kind: 'generated' });
    const externalFor = async (file, local, via) => {
      if (spec.adapters?.[`${file}:${local}`]) return null; // a module-level adapter answers instead of the shared external
      const entry = externals[`${file}:${local}`] ?? (auto ? await autoExternal(file, local) : null);
      if (!entry) return null;
      const dep = await readSource(file);
      assertFeatures(`${spec.target}: external ${via} (${local})`, closureText(dep, local), entry.features);
      const target = await resolveExternal(file, local, entry);
      return { from: rel(self, target), name: entry.name, via, kind: 'external', area: entry.area, original: `${file}:${local}` };
    };
    const adapterFor = async (file, local, via) => {
      const entry = spec.adapters?.[`${file}:${local}`] ?? adapters[`${file}:${local}`];
      if (!entry) return null;
      const dep = await readSource(file);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), entry.features);
      return { from: rel(self, entry.module ? path.join(root, entry.module) : adapterFile), name: entry.name, via, kind: 'adapter', original: `${file}:${local}` };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const selection = spec.selections?.[name];
      if (selection) {
        const result = storeActionsSelection(src, name, selection);
        assertFeatures(`${spec.target}: selection ${name}`, result.features, selection.features);
        selections.set(name, result);
        for (const dep of result.deps) await add(dep);
        return;
      }
      const owner = sibling(spec.source, name);
      if (owner) { imports.set(name, fromSibling(owner, name, `${spec.source}:${name}`)); return; }
      const sameChunk = (await externalFor(spec.source, name, `${spec.source}:${name}`)) ?? (await adapterFor(spec.source, name, `${spec.source}:${name}`));
      if (sameChunk) { imports.set(name, sameChunk); return; }
      // A vendor-frame binding that is itself a React re-export (e.g. Td's `N = o.useContext`).
      const reexport = (src.aliases.get(name) ?? []).map(alias => vendorImport(spec.source, alias, src)).find(Boolean);
      if (reexport) { imports.set(name, { from: reexport[0], name: reexport[1], via: `${spec.source}:${name}`, kind: 'react' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const resolved = (await externalFor(file, local, via)) ?? (await adapterFor(file, local, via));
        if (resolved) { imports.set(name, resolved); return; }
        const generated = sibling(file, local);
        if (generated) { imports.set(name, fromSibling(generated, local, via)); return; }
        if (explore) { explore.push({ target: spec.target, via, local, size: closureText(dep, local).length }); imports.set(name, { from: '__unresolved__', name: local, via, kind: 'unresolved' }); return; }
        throw Error(`${spec.target}: unresolved import ${via} (${local})`);
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator() && !p.isClassDeclaration()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { const m = `${spec.target}: dynamic import inside ${name}`; if (featureFailures) featureFailures.push(m); else throw Error(m); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of nodeDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      if (spec.selections?.[name]) { await add(name); continue; }
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    for (const [, s] of selections) blocks.push(s.block);
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };` +
      Object.entries(spec.reexports ?? {}).map(([name, target]) => {
        if (!emitted.some(m => m.spec.target === target && Object.values(m.spec.exports).includes(name))) throw Error(`${spec.target}: re-export ${name} is not an export of ${target} (emitted earlier)`);
        return `\nexport { ${name} } from ${JSON.stringify(rel(self, path.resolve(base, target)))};`;
      }).join('');
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-sidebar-sections.mjs.\n// Edit the extractor or src/source-sidebar-sections-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifestModules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      ...(selections.size ? { sourceSelections: [...selections.values()].map(s => s.record) } : {}),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
      ...(spec.reexports ? { reexports: spec.reexports } : {}),
    });
    emitted.push({ spec });
  }
  return { files, modules: manifestModules };
}

export async function extractSidebarSections({ check = false, explore = null } = {}) {
  official.assertCompilerHelpers((await fs.readFile(path.join(source, SF))).toString()); // E3: the helpers externals name
  if (explore) featureFailures = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-sidebar-sections.mjs',
    adapterModule: 'src/source-sidebar-sections-adapters.jsx', modules: [],
  };
  const renderer = await sliceOriginalModules({ modules: rendererModules, explore });
  const electron = await sliceOriginalModules({ modules: electronModules, explore, auto: false });
  for (const m of electron.modules) if (m.imports.some(i => i.kind !== 'generated')) throw Error(`${m.target} must stay self-contained`);
  manifest.modules = [...renderer.modules, ...electron.modules];
  const files = { ...renderer.files, ...electron.files, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' };
  if (explore) { explore.features = featureFailures; return manifest; }
  const own = Object.keys(files).filter(n => !n.startsWith('../'));
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort();
    if (JSON.stringify(present) !== JSON.stringify(own.sort())) throw Error(`Sidebar sections output set changed: ${present.join(',')}. Run scripts/extract-sidebar-sections.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.resolve(output, name), 'utf8').catch(() => null) !== text) throw Error(`Sidebar sections source mismatch: ${name}. Run scripts/extract-sidebar-sections.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!own.includes(name)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.resolve(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} sidebar sections modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    await extractSidebarSections({ explore: found });
    for (const f of found) console.log(`${f.target}\t${f.via}\t${f.local}\t${f.size}`);
    for (const f of found.features ?? []) console.log(`FEATURE\t${f}`);
  } else await extractSidebarSections({ check: process.argv.includes('--check') });
}
