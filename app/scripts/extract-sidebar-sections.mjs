// Extract the 2.42304.0 Code sidebar sections (research/sidebar-sections.md WI-1, work item sidebar-sections-extract):
// the shared-52 sections model and the custom-group store actions it is driven by, the shared-18 group/folder/section
// copy and group label row, the shared-19 disabled reasons and header-menu pieces, the shared-22 section view menu and
// visible-section rule, and the shared-20 header menu, new-section dialog and Move to menus. Nothing is executed.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source; each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. The store actions
// are the one exception to "top-level": they are object properties of the shared-52 zustand creator, sliced verbatim
// and wrapped in a `(e, t)` factory whose parameters are the creator's own (set, get), after asserting that nothing
// else from the creator's scope is read. Each dependency resolves to exactly one of:
//   - another module generated here (same run, same output tree);
//   - a React / ReactDOM export of vendor-frame, checked against its `local=<ns>.<member>` assignment;
//   - an already generated module that holds the *same original binding*: view-tabs by its public (semantic) name
//     (manifest.publicNames must name this file and local), sidebar-resize by its manifest exports, code-current by its
//     exports (a 2.42304.0 module must list this very binding; a 2.37337.1 one must be alpha-equivalent to it, i.e.
//     identical up to a consistent renaming of identifiers) -- never a second copy of a context or store;
//   - a named host adapter in src/source-sidebar-sections-adapters.jsx.
// Roots, adapters and externals all carry feature strings that must still appear in the original text, so a version
// bump that re-points a minified name fails here instead of silently binding the wrong value.
//
// D0: own generator, own output folder (src/generated/sidebar-sections) plus the main-process copy of the pure model
// (electron/generated/sidebar-sections-*.mjs, adapter-free), own scripts/verify-gen-sidebar-sections.mjs.
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
const previousSource = path.resolve(root, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const output = path.join(root, 'src/generated/sidebar-sections');
const generatedRoot = path.join(root, 'src/generated');
const adapterFile = path.join(root, 'src/source-sidebar-sections-adapters.jsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

// vendor-frame re-exports React / ReactDOM; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Ba: ['react', 'Fragment'], eo: ['react', 'createContext'], lo: ['react', 'use'], oo: ['react', 'memo'],
    _o: ['react', 'useImperativeHandle'], do: ['react', 'useContext'], bo: ['react', 'useMemo'], uo: ['react', 'useCallback'],
    Co: ['react', 'useState'], So: ['react', 'useRef'], mo: ['react', 'useEffect'], yo: ['react', 'useLayoutEffect'],
    ro: ['react', 'forwardRef'], go: ['react', 'useId'], xo: ['react', 'useReducer'], io: ['react', 'isValidElement'],
    $a: ['react', 'cloneElement'], co: ['react', 'startTransition'], po: ['react', 'useDeferredValue'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'], Ca: ['react-dom', 'flushSync'], Sa: ['react-dom', 'createPortal'],
    so: ['react', 'default'], Ja: ['react', 'Fragment'], wo: ['react', 'useSyncExternalStore'],
  },
};

// Original bindings (file:local) that already live in a generated module. `features` must appear in the binding's
// same-chunk closure. view-tabs is addressed only by its public names (D1); code-current and sidebar-resize by the
// export the module gives that binding.
const externals = {
  'shared-frame-BfjMqbuN.js:Jo': { area: 'view-tabs', name: 'CdsIcon', features: ['"data-cds": "Icon"'] },
  'shared-frame-BfjMqbuN.js:$l': { area: 'view-tabs', name: 'CdsButton', features: ['iconPosition: i = "start"'] },
  'shared-frame-BfjMqbuN.js:M_': { area: 'view-tabs', name: 'CdsConfirmationDialog', features: ['confirmLabel:', 'closeOnConfirm'] },
  'shared-frame-BfjMqbuN.js:la': { area: 'view-tabs', name: 'CdsDensityContext', features: ['("comfortable")'] },
  'vendor-frame-DfPJ1QmD.js:wd': { area: 'view-tabs', name: 'DirectionContext', features: ['wd = x(void 0)'] },
  'shared-4-CJsHhp5n.js:jf': { area: 'view-tabs', name: 'isFizzyLakePartEnabled', features: ['getAttribute('] },
  // R3-sections step 3: clsx is view-tabs' public one (vendor-frame ge, `za`), the copy the code-current filter controls
  // and every view-tabs CDS part already read (sidebar-resize/class-names.mjs is a second slice of the same declaration).
  'vendor-frame-DfPJ1QmD.js:ge': { area: 'view-tabs', name: 'clsx', features: ['arguments.length'] },
  // R3-sections step 3 (D24): the CDS parts the sections pieces render, by their view-tabs public names (R3-graph): the
  // Tooltip (Zp, `Oc`), the Dropdown (EC, `qa`) with its detached-trigger handle (vendor-frame bm, `Wt`, the same Base
  // UI instance), the Dialog (k_, `Js`), the TextInput (tx, `ho`) and the CDS root (Za, `tu`). The context menu (iD)
  // stays the host adapter: its items are code-current's sidebar menu rows (shared-16 au / lu, shared-19 MX / uZ), which
  // render through the host SourceMenu that the host's own row / blank-area / Older menus share (see the report).
  'shared-frame-BfjMqbuN.js:Zp': { area: 'view-tabs', name: 'CdsTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus: y = !1'] },
  'shared-frame-BfjMqbuN.js:EC': { area: 'view-tabs', name: 'CdsDropdown', features: ['SubmenuTrigger:', 'Popup: qS'] },
  'vendor-frame-DfPJ1QmD.js:bm': { area: 'view-tabs', name: 'CdsMenuCreateHandle', features: ['new ym()', 'super(Qp(), "Menu")'] },
  'shared-frame-BfjMqbuN.js:k_': { area: 'view-tabs', name: 'CdsDialog', features: ['Root: O_', 'Footer: D_'] },
  'shared-frame-BfjMqbuN.js:tx': { area: 'view-tabs', name: 'CdsTextInput', features: ['clearable: a = !1'] },
  'shared-frame-BfjMqbuN.js:Za': { area: 'view-tabs', name: 'CdsRoot', features: ['density: e', 'pageBackground: a'] },
  'shared-28-DcgD7xXH.js:Pm': { area: 'sidebar-resize', target: 'logical-side.mjs', name: 'physicalSide', features: ['"inline-start"'] },
  'shared-18-D4XxL6Tg.js:wE': { area: 'code-current', target: 'sidebar-row-primitive.mjs', name: 'sidebarHitRowClass', features: ['hit-row'] },
  'shared-18-D4XxL6Tg.js:PE': { area: 'code-current', target: 'sidebar-row-view.mjs', name: 'useSidebarRename', features: ['optimisticLabel'] },
  'shared-18-D4XxL6Tg.js:FE': { area: 'code-current', target: 'sidebar-row-view.mjs', name: 'SidebarRenameInput', features: ['onValueChange'] },
  'shared-18-D4XxL6Tg.js:aD': { area: 'code-current', target: 'sidebar-fade-label.mjs', name: 'SidebarFadeLabel', features: ['cleared'] },
  'shared-52-DGviI8xb.js:rh': { area: 'sidebar-resize', target: 'sidebar-width.mjs', name: 'sidebarHidden', features: ['composedSidebarOpen'] },
  'shared-25-DP8p7i1Z.js:up': { area: 'code-current', target: 'owner-window.mjs', name: 'ownerWindow', features: ['defaultView'] },
  // The sidebar menu rows register into the ordered groups' context (shared-16 ru): one instance, code-current's.
  'shared-16-B0xHzPjj.js:au': { area: 'code-current', target: 'sidebar-menu-groups.mjs', name: 'SidebarMenuItem', features: ['K.Item'] },
  'shared-16-B0xHzPjj.js:lu': { area: 'code-current', target: 'sidebar-menu-groups.mjs', name: 'OrderedSidebarMenuGroups', features: ['registerRow'] },
  'shared-19-CkPOiIKm.js:MX': { area: 'code-current', target: 'sidebar-menu-order.mjs', name: 'SidebarOrderedMenu', features: ['order: jX'] },
  // The sidebar list context (getList) the header menu's organize/view items read: one instance, code-current's.
  'shared-19-CkPOiIKm.js:nZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'SidebarListContext', features: ['nZ = O(null)'] },
  'shared-19-CkPOiIKm.js:oZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'sidebarGroupToggles', features: ['[data-group-toggle][aria-expanded='] },
  'shared-19-CkPOiIKm.js:cZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'sidebarToggleVisible', features: ['checkVisibility'] },
  'shared-19-CkPOiIKm.js:lZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'sidebarPrecedingToggles', features: ['DOCUMENT_POSITION_FOLLOWING'] },
  // R3-sections (WI-4): uZ (Collapse all / Expand all) and sZ (any folded toggle: the blank-area Select all's "Expand a
  // section…" reason) are code-current's too, so the header menus, the reorder menu and the blank-area menu share the
  // host list's one copy instead of a second slice of the same shared-19 declarations.
  'shared-19-CkPOiIKm.js:sZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'sidebarHasCollapsedGroups', features: ['oZ(e, "collapsed").length > 0'] },
  'shared-19-CkPOiIKm.js:uZ': { area: 'code-current', target: 'sidebar-group-view.mjs', name: 'SidebarGroupViewItems', features: ['"Collapse all"', '"Expand all"', 'canExpand: sZ(t)'] },
  // R4g-sidebar SB1 (X7-04): the folded section status badge draws the sidebar's own status dot and error mark. The
  // list-view context the dot reads (shared-18 uE, exported `Os`, shared-22 El = dE over it), its copy, error colours,
  // the plain dot (K_), the error icon (VD) and the infinite-animation sync (G_) are the instances the host rows already
  // use (code-current); the clay dot (xx) and its "needs you" mapping (Ax) are app-switch's; the CDS Pulse is view-tabs'.
  'shared-18-D4XxL6Tg.js:uE': { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'SidebarStatusLayout', features: ['uE = T(null)'] },
  'shared-18-D4XxL6Tg.js:DD': { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'sidebarStatusMessages', features: ['"Unread response"', '"Running"'] },
  'shared-18-D4XxL6Tg.js:MT': { area: 'code-current', target: 'sidebar-status-glyph.mjs', name: 'sidebarErrorColors', features: ['warning: "text-danger"'] },
  'shared-18-D4XxL6Tg.js:K_': { area: 'code-current', target: 'nested-session-parts.mjs', name: 'NestedStatusDot', features: ['className: "status-dot"'] },
  'shared-18-D4XxL6Tg.js:VD': { area: 'code-current', target: 'nested-session-parts.mjs', name: 'NestedErrorIcon', features: ['shape: t = "Warning"'] },
  'shared-18-D4XxL6Tg.js:G_': { area: 'code-current', target: 'nested-session-parts.mjs', name: 'synchronizeStatusAnimation', features: ['t.getAnimations()', 'performance.timeOrigin'] },
  'shared-18-D4XxL6Tg.js:xx': { area: 'app-switch', target: 'app-switch-frame.mjs', name: 'ClayStatusDot', features: ['"data-kind": "clay"'] },
  'shared-18-D4XxL6Tg.js:Ax': { area: 'app-switch', target: 'app-switch-frame.mjs', name: 'hubAttention', features: ['e === "awaiting" ? "ready" : e'] },
  'shared-frame-BfjMqbuN.js:eN': { area: 'view-tabs', name: 'CdsPulse', features: ['"data-cds": "Pulse"'] },
};

// Host dependencies: runtime services this app answers itself, keyed by the original binding (file:local) the import
// alias resolves to. `features` must appear in that binding's same-chunk closure.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (useStartIntl / StartMessage).
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', features: ['[React Intl]'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', features: ['formatMessage: r, textComponent: i = n', 'Gt = u(Wt, Ut)'] },
  // G: the frame zustand store; the sections/custom-group slice, the overflow-menu flag and the resolved mode.
  'shared-52-DGviI8xb.js:G': { name: 'useSidebarSectionsStore', features: ['addSection: (e) =>', 'setSectionView: (t, n) =>', 'setOverflowMenuOpen', 'resolvedMode'] },
  // Pp: the custom-group overlay gate (GrowthBook + presets gate): {overlayEnabled, environments}.
  'shared-16-B0xHzPjj.js:Pp': { name: 'useSidebarOverlayGate', features: ['overlayEnabled: e || t, environments: e'] },
  // shared-11 rc (exported `Ya`): the presets gate (`claudeai_cc_epitaxy_session_presets_main`); D10: on.
  'shared-11-BuQ3CK5I.js:rc': { name: 'usePresetsGate', features: ['b(Xs) ?? Zs ?? !1'] },
  // shared-25 ml (exported `Rm`): "running in the Claude desktop app" (user agent + claudeAppBindings).
  'shared-25-DP8p7i1Z.js:ml': { name: 'useIsDesktopApp', features: ['se(window.navigator.userAgent, { version: e, platform: t })'] },
  // shared-25 Z (exported `lr`): the current account (the archive rule exempts agent sessions you started).
  'shared-25-DP8p7i1Z.js:Z': { name: 'useCurrentAccount', features: ['"Must call inside CurrentAccountProvider"'] },
  // shared-19 e2 (exported `wr`): Status grouping offered (GrowthBook claudeai_session_state + account setting).
  'shared-19-CkPOiIKm.js:e2': { name: 'useStatusGrouping', features: ['"claudeai_session_state"', 'ccr_session_state_buckets'] },
  // Telemetry (D17): section_changed, custom_group_changed and the analytics client.
  'shared-8-B5lJ8U5C.js:iv': { name: 'trackSectionChange', features: ['"claudeai.epitaxy.sidebar.section_changed"'] },
  'shared-16-B0xHzPjj.js:dp': { name: 'trackCustomGroupChange', features: ['"claudeai.epitaxy.sidebar.custom_group_changed"'] },
  'shared-52-DGviI8xb.js:EO': { name: 'useAnalytics', features: ['return Qg;'] },
  // shared-11 Zu (exported `ji`): how many sessions (with their nested families) a group would release.
  'shared-11-BuQ3CK5I.js:Zu': { name: 'countGroupSessions', features: ['a.startsWith("code:")'] },
  // shared-6: the sidebar's row registry (rows by key, keys by bucket, visible keys) and the multi-select store.
  'shared-6-Cby4X-ms.js:uO': { name: 'sidebarBucketKeys', features: ['cO.get(e)'] },
  'shared-6-Cby4X-ms.js:mO': { name: 'sidebarVisibleKeys', features: ['oO.values()'] },
  'shared-6-Cby4X-ms.js:aO': { name: 'sidebarRowRecord', features: ['qD.get(e)'] },
  'shared-6-Cby4X-ms.js:PD': { name: 'useSidebarSelectionStore', features: ['selectedKeys:', 'selectRange:'] },
  // shared-19 Archive all: which rows can be archived (UX), the archive flow with its confirmations (YX), its gate (qX).
  // UX's inputs: the keys open in a pane, popout or as the current route (PX), and "started by this account" (of).
  'shared-19-CkPOiIKm.js:PX': { name: 'sidebarOpenSessionKeys', features: ['popoutWindows', 'extraPanesByMode'] },
  'shared-16-B0xHzPjj.js:of': { name: 'isStartedByAccount', features: ['Rt("user", e) ?? e'] },
  'shared-19-CkPOiIKm.js:YX': { name: 'useSidebarBulkArchive', features: ['beginBulkArchive', 'confirmArchive'] },
  'shared-19-CkPOiIKm.js:qX': { name: 'useArchiveAllEnabled', features: ['"__gb__873492543"'] },
  // shared-frame iD (exported `Ii`): the CDS context menu, answered over the host SourceMenu (its items are code-current's
  // SourceMenu rows; see the externals). The other CDS parts are view-tabs public names since R3-sections step 3.
  'shared-frame-BfjMqbuN.js:iD': { name: 'SidebarContextMenu', features: ['Root: tD', 'Popup: eD'] },
  // shared-11 ic (exported `Ja`, shared-16 Oi): the presets gate read outside render (shared-16 qf); D10: on.
  'shared-11-BuQ3CK5I.js:ic': { name: 'presetsGateNow', features: ['"claudeai_cc_epitaxy_session_presets_main"'] },
  // R3-sections (WI-4) the blank-area menu: shared-11 Qo (exported `do`) the presets gate New environment waits on (D10:
  // on); shared-6 iO (exported `So`) every registered row key (Select all's "Expand a section…" reason); its New
  // environment goes to the Code page (shared-16 zm the navigator, shared-78 wq the home routes, shared-20 ST the draft
  // reset + navigation) and asks for a new environment (shared-21 lB, the lazily loaded environment dialog).
  'shared-11-BuQ3CK5I.js:Qo': { name: 'usePresetsGate', features: ['"claudeai_cc_epitaxy_session_presets_main"'] },
  'shared-6-Cby4X-ms.js:iO': { name: 'sidebarRowKeys', features: ['[...qD.keys()]'] },
  'shared-16-B0xHzPjj.js:zm': { name: 'useSidebarNavigate', features: ['markCodeSessionOpenNavQueued'] },
  'shared-78-D6VXYXaQ.js:wq': { name: 'useHomeRoutes', features: ['code: e', 'cowork: "/new"'] },
  'shared-20-B7UqYfsi.js:ST': { name: 'startCodeDraft', features: ['setDraftCustomGroupId(n)', 'e(t, r)'] },
  'shared-21-IP-SVetq.js:lB': { name: 'requestNewEnvironment', features: ['"code_sidebar_environment_dialog"', 'requestNewEnvironment(e)'] },
};

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text. `selections` emits a factory around verbatim object
// properties of a nested creator (see storeActions).
const storeActionNames = ['toggleGroupCollapsed', 'expandGroup', 'addCustomGroup', 'keepGroupWhileEmpty', 'renameCustomGroup',
  'deleteCustomGroup', 'assignToCustomGroup', 'setCustomGroupOrder', 'moveCustomGroup', 'addSection', 'renameSection',
  'deleteSection', 'moveSection', 'setSectionView', 'assignToSection', 'setOverflowMenuOpen'];
const errorTextSpec = target => ({ target, source: 'preload-helper-D0dM6GpB.js', exports: { e: 'tagErrorText' },
  features: { e: ['Symbol.for("ant.o11y.errorText")', 'enumerable: !1'] } });
const modelSpec = target => ({
  target, source: 'shared-52-DGviI8xb.js',
  exports: {
    U: 'stringArray', W: 'isPlainRecord', np: 'sectionSchemaVersion', rp: 'sectionMetadataSchemaVersion', ip: 'sectionCarriesMetadata',
    ap: 'pinnedSectionId', op: 'routinesSectionId', sp: 'sessionsSectionId', cp: 'sectionViewDefaults', lp: 'routinesCollapsedByDefault',
    up: 'createSection', dp: 'defaultSections', fp: 'defaultSection', pp: 'defaultCodeSidebar', mp: 'sessionsGroupByFromLegacy',
    hp: 'legacyGroupByFromSessions', gp: 'sectionGroupBys', _p: 'sectionSortBys', vp: 'sectionKinds', yp: 'isSectionGroupBy',
    bp: 'isSectionSortBy', xp: 'normalizeSectionView', Sp: 'normalizeSections', Cp: 'normalizeCodeSidebarByScope', wp: 'withSectionId',
    Tp: 'dedupeSections', Ep: 'ensureFixedSections', Dp: 'customGroupMembers', Op: 'sameMembers', kp: 'reconcileSections',
    Ap: 'defaultSectionCollapsed', jp: 'resetSectionCollapse', Mp: 'restoreSectionCollapse', Np: 'migrateSectionMetadata',
    Pp: 'sectionsAtDefaults', Fp: 'sameSections', Ip: 'patchSectionView', Lp: 'setSectionView', Rp: 'inheritSessionsView',
    zp: 'moveSection', Bp: 'seedSectionPrefs', lm: 'customGroupKeyPrefix', um: 'customGroupKey', dm: 'emptyCustomGroups',
    fm: 'isEmptyCustomGroups', pm: 'normalizeCustomGroups', mm: 'normalizeCustomGroupsByScope', hm: 'nonEmptyCustomGroups',
    gm: 'selectCustomGroups', _m: 'findCustomGroupByName', wm: 'mergeCustomGroups', Tm: 'selectCodeSidebar',
    Em: 'reconcileCodeSidebar', Dm: 'reconcileCodeSidebarPatch', Om: 'updateCustomGroups', km: 'updateSections', Mm: 'keptWhileEmptyWith',
    _h: 'defaultGroupBy', vh: 'effectiveGroupBy', yh: 'groupByShowsCustom', jh: 'codeKeyPrefix',
    sectionsStoreActions: 'sectionsStoreActions',
  },
  features: {
    vp: ['["pinned", "routines", "manual", "sessions"]'], np: ['np = 2'], cp: ['emptyGroups: !1'], mp: ['case "coder":', '"environment"'],
    Sp: ['!vp.includes(n.kind)', 'v: np'], Tp: ['a ??= wp(s, sp)'], kp: ['2 ** 53 - 1', 'mp(t.codeGroupBy)'],
    Rp: ['"The section list has no Sessions section"', 'r === "environment"'], zp: ['e[r].kind === "sessions"', 'e.length - 2'],
    Lp: ['(n.sortBy === "alpha") != (r === "alpha")'], Bp: ['t.isManualCollapsed(e.id)', 'sessionsCollapsed'], lm: ['"custom-"'],
    um: ['"custom-ungrouped"'], Tm: ['codeSidebarByScope'], Em: ['migratedFrom'], Mm: ['groupsKeptWhileEmpty'],
  },
  selections: {
    sectionsStoreActions: { kind: 'storeActions', anchor: 'addSection', parameters: ['e', 't'], properties: storeActionNames,
      features: ['cg-${crypto.randomUUID()}', 'n.kind !== "manual"', 'km(e, (e) => zp(e, t, n))', 'km(e, (e) => Lp(e, t, n))'] },
  },
});
const rendererModules = [
  // vendor-intl tn (exported `f`): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { tn: 'defineMessages' }, features: { tn: ['return e;'] } },
  errorTextSpec('error-text.mjs'),
  // vendor-all-0 ee (exported `I`): zustand `create`, for the shared-21 new-section opener store (uB).
  { target: 'zustand.mjs', source: 'vendor-all-0-CTKbbUUg.js', exports: { ee: 'create' },
    features: { ee: ['(e ? x(e) : x)'] } },
  // vendor-all-0 ge (exported `T`): the debounced callback the header menu's Rename waits on (fx = 100ms).
  { target: 'debounced-callback.mjs', source: 'vendor-all-0-CTKbbUUg.js', exports: { ge: 'useDebouncedCallback' },
    features: { ge: ['flushOnUnmount', 'window.clearTimeout(c.current)'] } },
  // vendor-frame Td (exported `Wn`): Base UI useDirection over the view-tabs DirectionContext.
  { target: 'direction.mjs', source: 'vendor-frame-DfPJ1QmD.js', exports: { Td: 'useDirection' },
    features: { Td: ['?.direction ?? "ltr"'] } },
  // shared-frame ja (exported `su`): the CDS density hook over the view-tabs CdsDensityContext.
  { target: 'cds-helpers.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { ja: 'useCdsDensity', lc: 'elementOrNull' },
    features: { ja: ['return W(la)'], lc: ['e?.nodeType === 1 ? e : null'] } },
  // shared-5 XA (exported `V`): dialog presence (mounted / open on the next frame / unmount after the exit).
  { target: 'dialog-presence.mjs', source: 'shared-5-kdJVRUsT.js', exports: { XA: 'useDialogPresence' },
    features: { XA: ['requestAnimationFrame', 'onOpenChangeComplete: o'] } },
  // shared-78 U (exported `Ib`): the `${kind}:${id}` session key; Kd (exported `YS`): the panel-layout context eO reads.
  { target: 'session-keys.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { U: 'sessionRefKey', Kd: 'PanelLayoutContext' },
    features: { U: ['`${e.kind}:${e.id}`'], Kd: ['Kd = y(null)'] } },
  modelSpec('sections-model.mjs'),
  // shared-52 hooks over the frame store (renderer only): ih (exported `Rf`) whether the sidebar is hidden.
  // Its store is the frame store the width handle already answers (source-sidebar-resize-adapters useSidebarFrameStore).
  { target: 'sections-hooks.mjs', source: 'shared-52-DGviI8xb.js', exports: { ih: 'useSidebarHidden' }, features: { ih: ['G(rh)'] },
    adapters: { 'shared-52-DGviI8xb.js:G': { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing'] } } },
  // shared-18 vE/yE/bE/xE: the group, folder and section copy; SE picks one, CE (exported `Es`) for the current mode.
  { target: 'group-copy.mjs', source: 'shared-18-D4XxL6Tg.js',
    exports: { vE: 'groupMessages', yE: 'folderMessages', bE: 'sectionMessageCatalog', xE: 'sectionMessages', SE: 'groupCopyFor', CE: 'useGroupCopy' },
    features: { vE: ['"Move to group"', '"Create and group by custom"'], yE: ['"Move to folder"'], bE: ['"New section"', '"Create section"', '"Remove from {groupName}"'],
      xE: ['dragRemove: bE.removeFrom', 'waiting: vE.waiting'], SE: ['e ? (t ? xE : yE) : vE'], CE: ['e.resolvedMode === "code"', 'SE(e && t, n)'] } },
  // shared-18 uD (exported `gs`): the group / section label row; dD its inline rename, fD the row itself, lD the min height.
  { target: 'group-label.mjs', source: 'shared-18-D4XxL6Tg.js',
    exports: { uD: 'SidebarGroupLabel', dD: 'SidebarGroupRenameLabel', fD: 'renderSidebarGroupLabel', lD: 'sidebarGroupLabelMinHeight', TE: 'sidebarGroupToggleHitClass' },
    features: { uD: ['e.onRename === void 0'], dD: ['startRenameRef: i', 'onRenameEntered: a', 'o.formatMessage(s.rename)'],
      fD: ['"data-sidebar-group-label": ""', '"data-group-toggle": ""', '"data-group-name": ""', '"data-group-caret": ""', '"data-group-badge": ""',
        '"data-group-mark": ""', 'o === "group" ? "group" : void 0', 'group/labelrow df-label-inset', 'group-data-[hover-within]/section:opacity-100'],
      lD: ['min-h-[calc(var(--df-group-pt)+(var(--df-row-h)-8px)+4px)]'], TE: ['hit-row-main'] } },
  // shared-16: Np (exported `$`) overlayEnabled; cp (exported `mt`) whether a group-by shows custom groups; ep (exported
  // `yt`) the mode's effective group-by ($f reads the Sessions section's under the presets gate).
  // R3-sections step 3 (WI-5): Fp (exported `Q`, shared-21 jx) the group-by the session-list filter shows (custom reads as
  // project once the overlay is on), and the Sessions section writers its items call: ip (`_t`, shared-21 Vx) Group by,
  // op (`vt`, uS) Sort by, ap (`pt`, oS) the reset's cleared group-by.
  { target: 'group-mode.mjs', source: 'shared-16-B0xHzPjj.js',
    exports: { Np: 'useCustomGroupOverlay', cp: 'showsCustomGroups', ep: 'useEffectiveGroupBy', $f: 'useStoredGroupBy', Qf: 'sessionsGroupByAsLegacy', Gf: 'sectionOrDefault',
      Fp: 'groupByShown', ip: 'writeSessionsGroupBy', op: 'writeSessionsSortBy', ap: 'clearSessionsGroupBy' },
    features: { Np: ['Pp().overlayEnabled'], cp: ['(r && e === "code") || on(e, t, n)'], ep: ['Gt($f(e), e, t)'], $f: ['e === "code" && t ? Qf(n) : n.groupByByMode[e]'],
      Qf: ['Gf(e, sn)'], Gf: ['?? gn(t)'], Fp: ['t && e === "custom" ? "project" : e'],
      ip: ['n.setSectionView(sn, { groupBy: Wt(t) ?? "none" })'], op: ['n.setSectionView(sn, { sortBy: t })'], ap: ['t.setSectionView(sn, { groupBy: null })'] } },
  // R3-sections step 3 (WI-5): shared-20 ES (exported `Fr`'s writer, r_ = OS) the Sessions ascending and TS ($g = DS) its
  // Show › Metadata, as the session-list filter writes them.
  { target: 'sessions-view-writers.mjs', source: 'shared-20-B7UqYfsi.js', exports: { ES: 'writeSessionsAscending', TS: 'writeSessionsMetadata' },
    features: { ES: ['setSectionView(ga, { ascending: e })'], TS: ['setSectionView(ga, { show: { metadata: e } })'] } },
  // shared-21: section/group membership keys (sK scheduled tasks, QR side sessions).
  { target: 'section-membership.mjs', source: 'shared-21-IP-SVetq.js', exports: { sK: 'scheduledTaskGroup', QR: 'membershipKey', ZR: 'sideParentId' },
    features: { sK: ['"scheduled-task"'], QR: ['{ kind: "code", id: n }'], ZR: ['sideParentId'] } },
  // shared-21: the session-list filter controls the section view menu is made of (2.42304.0: Reset to defaults, View all,
  // Name sort), the new-section opener store (uB/dB) and the panel-chrome helpers eO reads. R3-sections step 3 (WI-5):
  // this is the one copy of them -- code-current's sidebar-filter-controls.mjs re-exports it for the Sessions list's own
  // Group and sort (shared-21 oU's sessionList branch) -- so KH (View all's context, HQ provides it around the list), hU /
  // gU (focus after a keyboard regroup, shared-21 _U) and aU (the Filter trigger iU / vU render) are roots here too.
  { target: 'section-filter-controls.mjs', source: 'shared-21-IP-SVetq.js',
    exports: { eU: 'sidebarFilterMessages', uU: 'SidebarOptionMenu', dU: 'SidebarSortMenu', lU: 'useSidebarSortOptions', sU: 'SidebarViewResetItems',
      cU: 'SidebarViewAllItem', qH: 'useSidebarViewAll', YH: 'sortAscendingShown', XH: 'sortAscendingStored', uB: 'newSectionOpener', dB: 'openNewSection',
      vB: 'useNewSectionOpener',
      kF: 'PanelChromeContext', OF: 'panelChromeActive', CB: 'trailingControlClass',
      KH: 'SidebarViewAllContext', hU: 'focusSidebarAfterRegroup', gU: 'useSidebarRegroupFocus', aU: 'SidebarFilterTrigger' },
    features: { sU: ['"Reset to defaults"', '"Grouping and sorting are already at their defaults."', 'onClick: dB'],
      KH: ['KH = C(null)'], hU: ['[data-group-toggle]', 't.closest(\'[role="menu"]\') !== null'], gU: ['r.current !== n', 'hU(e?.current ?? null)'],
      aU: ['icon: "Filter"', '"df-chrome-btn relative -my-1"', '"data-list-filter": o ? "" : void 0', 'open: !n && void 0'],
      cU: ['"There are no other sessions to view."', 't === "loading"'], lU: ['"alpha"'], uB: ['({ open: null })'], dB: ['uB.getState().open?.()'],
      YH: ['e === "alpha" ? !t : t'], OF: ['Ul("panels")'], CB: ['group-hover/labelrow:w-auto'],
      // vB: the list registers its new-section dialog as the opener tO's "New section…" (sU → dB) calls.
      vB: ['uB.setState({ open: n })', 't("header_menu")'] } },
  // shared-22 KO: which manual sections show (members, kept while empty, held rows); GO the code-key filter.
  { target: 'section-visibility.mjs', source: 'shared-22-HztmyUTM.js', exports: { KO: 'visibleCustomGroups', GO: 'keyInMode' },
    features: { KO: ['keptWhileEmpty: r', 'withUngrouped: c', '"scheduled-task:"'], GO: ['e !== "code" || t.startsWith(go)'] } },
  // shared-19 ZX (exported `Da`) the group menu kind, tZ (exported `Ea`) its disabled reasons, QX/$X their copy.
  { target: 'group-reasons.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { ZX: 'groupMenuKind', tZ: 'groupDisabledReasons', QX: 'groupReasonMessages', $X: 'newSessionReasonMessages', eZ: 'tooFewToSelectMessage' },
    features: { ZX: ['"hand-made"', '"preset"', '"worked-out"'], tZ: ['n === "hosts-loading"', 'reorder: QX.fixedAtEnd'],
      QX: ['"Select all needs at least two visible sessions in this group."', '"This group stays at the end of the list."'],
      $X: ['"place-unknown"', '"host-not-saved"', '"host-shared"', '"no-folder"'] } },
  // shared-19 menu plumbing: AX (exported `Ga`) close when the sidebar hides, kX (`Ka`) the overflow-menu flag, L$ (`Ti`)
  // the lazily mounted menu body, e2 (`wr`) whether Status grouping is offered.
  { target: 'menu-triggers.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { AX: 'useCloseWhenSidebarHides', kX: 'useOverflowMenuFlag', L$: 'useLazyMenu' },
    features: { AX: ['t && !n'], kX: ['e.setOverflowMenuOpen'], L$: ['openOnHover', 'requestBody: o'] } },
  // shared-19 organize items: aZ (exported `wa`) Select all (2.42304.0). Its view items uZ (`Sa`, Collapse all / Expand
  // all) and sZ resolve to code-current's sidebar-group-view (see externals), one instance with the host list.
  { target: 'group-organize.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { aZ: 'SidebarGroupSelectAll', rZ: 'selectableGroupKeys', iZ: 'tooFewToSelectReason' },
    features: { aZ: ['"Select all"', 'disabledReason: r ? void 0 : iZ', 'setSelection(n)'] } },
  // shared-19 XX (exported `Oa`): Archive all ({count}) for a group. R3-sections (WI-4): HX (exported `Ma`) the empty
  // bulk scope and KX (`ja`) the unloaded-rows hook, which the blank-area menu (shared-21 _B / bB) reads.
  { target: 'group-archive.mjs', source: 'shared-19-CkPOiIKm.js', exports: { XX: 'SidebarGroupArchiveAll', GX: 'UnloadedRowsContext', UX: 'archivableSessions',
    HX: 'emptyBulkScope', KX: 'useUnloadedRows' },
    features: { XX: ['"Archive all ({count})"', 'confirmArchive: { groupName: t }'], GX: ['GX = O(!1)'], UX: ['e.isPinned', 'archivable: r, deletable: i'],
      HX: ['keys: [], archivableCount: 0, deletableCount: 0'], KX: ['return D(GX)'] } },
  // shared-19 section reorder: d$ (exported `Mi`) the reorder context, m$ (`Ni`)/h$ Move up/Move down/Reset order or
  // Sort A to Z, p$ the Alt+Shift+Arrow handle and its header menu (g$).
  { target: 'group-reorder.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { d$: 'SectionReorderContext', m$: 'SectionReorderItems', h$: 'SectionReorderActions', p$: 'SectionReorderHandle', g$: 'SectionReorderMenu', PQ: 'insideRowAction',
      f$: 'SectionReorderGate' },
    features: { m$: ['fixedReason: e'], h$: ['"Reset order"', '"Sort A to Z"', '"Move up"', '"Move down"'], f$: ['o === null', 'x(p$, {', 'ctx: o'],
      p$: ['e.altKey', 'e.shiftKey', '"ArrowUp"', 'd(e.key === "ArrowUp" ? -1 : 1)', 'childOwnsMenu'], g$: ['organize: i &&', 'view: x(uZ, {})'] } },
  // R3-sections (sidebar-sections-layout): shared-11 Ub/Wb (exported `N`/`D`, shared-19 xx/dx) remember which section
  // header keeps the focus across a keyboard move; shared-19 x$ (exported `Li`) is the sortable section wrapper iO puts
  // around every manual section: it provides the reorder context (d$: Move up / Move down / Alt+Shift+Arrow) and, when
  // a drag bridge is mounted (S$ with the lazy dnd-kit chunk, WI-6), its drag state. y$/_$/v$ are the bridge it reads.
  // shared-21 Uk (exported `do`, shared-22 hv): the group/section hover-within and focus-within tracking every bucket
  // spreads on its section element (data-hover-within drives `group-data-[hover-within]/section`, e.g. uD's caret).
  { target: 'section-hover.mjs', source: 'shared-21-IP-SVetq.js', exports: { Uk: 'sectionHoverHandlers', jk: 'hoverWithinAttribute', Mk: 'focusWithinAttribute' },
    features: { Uk: ['onMouseOver: zk', 'onMouseOut: Bk', 'onFocus: Vk', 'onBlur: Hk'], jk: ['"data-hover-within"'], Mk: ['"data-focus-within"'] } },
  { target: 'section-focus.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { Ub: 'markSectionFocus', Wb: 'takeSectionFocus' },
    features: { Ub: ['Vb = e'], Wb: ['Vb === e && ((Vb = null), !0)'] } },
  { target: 'section-sortable.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { x$: 'SectionSortable', v$: 'SectionDragBridgeContext', _$: 'SectionDragBridge', y$: 'useSectionDrag' },
    features: { x$: ['sectionIndex: t', 'onMoveUp: t > 0 ? () => r(t, t - 1, "menu") : void 0', 'r(t, a, "keyboard")', '"[data-group-toggle]"', 'u?.isDragging ? "opacity-40" : void 0'],
      v$: ['v$ = O(null)'], _$: ['this.subscribers = new Map()'], y$: ['e.drag(t)'] } },
  // shared-22: the manual section's own Filter button (eO) and view menu (tO), its collapse toggle (aO), sortable id (rO).
  { target: 'section-view-menu.mjs', source: 'shared-22-HztmyUTM.js',
    exports: { eO: 'SectionViewButton', tO: 'SectionViewMenu', aO: 'toggleSectionCollapsed', rO: 'sectionSortableId', nO: 'noSections' },
    features: { eO: ['icon: "Filter"', '"df-chrome-btn relative -my-1"', '"data-row-action": ""'],
      tO: ['section_kind: "manual"', 'source: "header_menu"', 'groupBy: null, sortBy: "recency", ascending: !1', 'defaultMessage: "Metadata"'],
      aO: ['setSectionView(e.id, { collapsed: !e.collapsed })'], rO: ['`section:${e}`'] } },
  // shared-20 yx (exported `ui`): the group / section header menu (new, edit, organize, view, remove) and its rename timing.
  { target: 'group-menu.mjs', source: 'shared-20-B7UqYfsi.js',
    exports: { yx: 'SidebarGroupMenu', fx: 'renameDelayMs', mx: 'pressAboveGroupLabel', vx: 'BidiGroupName' },
    features: { yx: ['"Edit environment"', 'disabledReason: px(m?.rename)', 'organize: l !== void 0', 'confirmVariant: "danger"', 'density: "comfortable"'],
      fx: ['fx = 100'], mx: ['[data-sidebar-group-label]'] } },
  // shared-20 dx (exported `yi`): openCreate/openCreateFrom/createModal; bx/xx (`hi`) the new group / section dialog.
  { target: 'group-dialog.mjs', source: 'shared-20-B7UqYfsi.js', exports: { dx: 'useCreateGroupDialog', xx: 'CreateGroupDialog', bx: 'GroupNameDialog' },
    features: { dx: ['openCreateFrom: u', 'action: "create"'], bx: ['showClose: !1', 'initialFocus: v', 'children: f(J, { ...i.switchNote })', 'i.createAndSwitch', 'disabled: !m'] } },
  // shared-20 wx (exported `fi`) the row menu's Move to submenu, Cx (`pi`) its items, Sx (`gi`) the remove label.
  // R3-sections step 3: wx is the row menu's Move to submenu (officially inside the CDS row context menu). The host's row
  // menu is SourceMenu, so this module keeps the SourceMenu-based dropdown (a module-level adapter wins over the shared
  // CdsDropdown external); the section view menus and the session-list filter use the real CdsDropdown.
  { target: 'move-to-menu.mjs', source: 'shared-20-B7UqYfsi.js', exports: { wx: 'MoveToSubmenu', Cx: 'MoveToItems', Sx: 'RemoveFromGroupLabel' },
    adapters: { 'shared-frame-BfjMqbuN.js:EC': { name: 'SidebarSectionsMenu', features: ['SubmenuTrigger:', 'Popup: qS'] } },
    features: { wx: ['"move-to-group-trigger"', 'icon: o ? "Folder" : void 0'], Cx: ['"new-custom-group"', 'checkedRole: "radio"'], Sx: ['n.removeFromSeveral'] } },
  // R3-sections (sidebar-group-menus-current, WI-4): shared-21 _B (exported `Vr`, shared-22 v_) is the Code list's
  // blank-area context menu host: the list element is its ContextMenu trigger (onContextMenuCapture remembers a press
  // outside a row), it provides the list context (nZ: getList / onNewSession / onNewSection) to everything inside the
  // list, mounts its own new-section dialog (dx "whitespace_menu") and registers it as the "New section…" opener (vB).
  // bB is the menu body: yB's six ordered sections (session / create / select / fold / convert / bulk), mB New session,
  // hB New section…, New environment, Select all with its two disabled reasons, uZ Collapse all / Expand all.
  { target: 'blank-area-menu.mjs', source: 'shared-21-IP-SVetq.js',
    exports: { _B: 'SidebarBlankAreaHost', bB: 'SidebarBlankAreaMenu', mB: 'BlankAreaNewSessionItem', hB: 'BlankAreaNewSectionItem', yB: 'blankAreaMenuOrder' },
    features: { _B: ['U_("whitespace_menu")', 'vB(e && t, s)', 'onContextMenuCapture: x', '[data-jump-hint-row]', 'Nu.getState().setSelection(wu())', 'onNewSection: t ? o : void 0'],
      bB: ['order: yB', '"Expand a section to select its sessions."', '"You need at least 2 sessions that can be selected."', '"New environment"',
        'wu().length < 2', 'Vu().length >= 2 && mi(m?.() ?? null)', 'convert: !1', 'bulk: !1'],
      mB: ['e?.onNewSession'], hB: ['e?.onNewSection', 't.newEllipsis'], yB: ['["session", "create", "select", "fold", "convert", "bulk"]'] } },
  // R4g-sidebar SB1 (research-ext/X7-partial-gaps.md X7-04): the status a folded section shows on its heading (shared-22
  // bC `badge: (W ? Ee.length > 0 : Ee.some(Xv)) ? p($v, {sessions: Ee, onlyBlocked: !W})`, qk's Pinned the same).
  // shared-18 FD (exported `Qo`, shared-21 cm) is the status dot: the CDS Pulse under the sidebar's list-view context
  // (uE), otherwise ND (the plain / clay dot by the appearance look Ox); BD (`as`, shared-21 Om) the error ink. Ox is
  // the host's (no clay / blue appearance settings: kx(false, false)).
  { target: 'status-dot.mjs', source: 'shared-18-D4XxL6Tg.js', exports: { FD: 'SidebarStatusDot', BD: 'sidebarErrorInk' },
    adapters: { 'shared-18-D4XxL6Tg.js:Ox': { name: 'useStatusDotLook', module: 'src/source-sidebar-section-badge-adapters.jsx',
      features: ['working: e ? "clay" : "gray"', 'needsYou: t ? "blue" : "amber"', 'errorInk: t ? "neutral" : "surface"'] } },
    features: { FD: ['w(uE) === null', '"contents [--cds-page-bg:transparent]"', 'animate: !1', '"df-tab-dot-running"'], BD: ['Ox().errorInk === "neutral" ? zD : e'] } },
  // shared-21 HG (exported `kn`, shared-22 $v): the badge over a folded bucket's rows -- the first status of IG
  // (awaiting, error, ready, running) any row has (BG over zG), or with onlyBlocked only "awaiting" (LG); VG (`On`)
  // draws it (role img, the status copy as its label; the error mark in BD's ink). Rb (shared-11 n_, the responding
  // session ids) and th (shared-18 wD, the error title) are the host's.
  { target: 'section-badge.mjs', source: 'shared-21-IP-SVetq.js',
    exports: { HG: 'SectionStatusBadge', VG: 'SectionStatusGlyph', BG: 'sectionStatusKind', zG: 'rowStatusKind', LG: 'rowAwaitingYou', IG: 'sectionStatusOrder' },
    adapters: {
      'shared-11-BuQ3CK5I.js:n_': { name: 'useRespondingSessionIds', module: 'src/source-sidebar-section-badge-adapters.jsx', features: ['subscribeResponding', 'respondingJoined()'] },
      'shared-18-D4XxL6Tg.js:wD': { name: 'sidebarErrorTitle', module: 'src/source-sidebar-section-badge-adapters.jsx', features: ['Object.hasOwn(CD, t)', 'i.isKnownCategory || t === void 0'] },
    },
    features: { HG: ['onlyBlocked: t = !1', 'BG(e, Rb())', 'e.some(LG)', '_(VG, { kind: "awaiting" })'],
      VG: ['role: "img"', '"aria-label": i', 'Om(Xp.warning)', 'awaiting: t.formatMessage(n.waiting)', 'error: th(t, void 0)', 'e === "error" ? _(Jp, { color: r }) : _(cm, { kind: e })'],
      BG: ['IG.find((e) => n.has(e)) ?? null'], zG: ['e.source.data.isArchived', 'e.hasError && !t', 'e.liveStatus === "running" || t', 'e.isUnread'],
      LG: ['e.liveStatus === "awaiting" || e.pendingPermissions > 0'], IG: ['["awaiting", "error", "ready", "running"]'] } },
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
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !text.includes(f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

// Alpha-equivalence: the two declarations are the same program up to a consistent, bijective renaming of identifiers.
function shape(node, names, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { out.push(`[${node.length}`); node.forEach(n => shape(n, names, out)); out.push(']'); return; }
  if (typeof node.type !== 'string') return;
  out.push(node.type);
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
    if (!names.has(node.name)) names.set(node.name, names.size);
    out.push(`#${names.get(node.name)}`);
    return;
  }
  for (const key of ['value', 'operator', 'kind', 'computed', 'prefix', 'async', 'generator', 'shorthand', 'method', 'optional', 'raw'])
    if (key in node && (typeof node[key] !== 'object' || node[key] === null)) out.push(`${key}=${JSON.stringify(node[key])}`);
  for (const [key, value] of Object.entries(node)) {
    if (['type', 'start', 'end', 'loc', 'range', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    // Non-computed property keys and member properties are names in the program text, not bindings: keep them literal.
    if ((key === 'key' && !node.computed) || (key === 'property' && !node.computed && node.type.includes('MemberExpression'))) {
      if (value?.type === 'Identifier') { out.push(`.${value.name}`); continue; }
    }
    if (value && typeof value === 'object') { out.push(`:${key}`); shape(value, names, out); }
  }
}
const alphaShape = node => { const out = []; shape(node, new Map(), out); return out.join(' '); };
function declarationNode(src, local) {
  const p = src.program.scope.getBinding(local)?.path;
  if (!p || p.isImportSpecifier()) return null;
  return p.node;
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
// Proves `entry` (a generated module export) is the original binding file:local and returns the module path.
async function resolveExternal(file, local, entry) {
  const area = path.join(generatedRoot, entry.area);
  if (entry.area === 'view-tabs') {
    const manifest = await readJson(path.join(area, 'manifest.json'));
    const pub = manifest.publicNames?.[entry.name];
    if (manifest.referenceVersion !== referenceVersion || !pub || pub.file !== file || pub.local !== local)
      throw Error(`view-tabs public name ${entry.name} is not ${file}:${local}`);
    return path.join(area, pub.file);
  }
  const manifest = await readJson(path.join(area, 'manifest.json'));
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
  if (module.referenceVersion === referenceVersion) {
    if (sourceName !== file || theirs !== local) throw Error(`${entry.area}/${entry.target}: ${entry.name} is ${sourceName}:${theirs}, not ${file}:${local}`);
    return modulePath;
  }
  // An earlier-version module: its binding must be alpha-equivalent to this version's.
  const prefix = file.slice(0, -'-xxxxxxxx.js'.length); // build hashes are 8 characters and may contain '-'
  if (!sourceName.startsWith(`${prefix}-`)) throw Error(`${entry.area}/${entry.target} comes from ${sourceName}, not a ${prefix} chunk`);
  const [mine, old] = [await readSource(file), await readSource(sourceName, previousSource)];
  const a = declarationNode(mine, local), b = declarationNode(old, theirs);
  if (!a || !b || alphaShape(a) !== alphaShape(b)) throw Error(`${entry.area}/${entry.target}: ${sourceName}:${theirs} (${entry.name}) is not alpha-equivalent to ${file}:${local}`);
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
export async function sliceOriginalModules({ modules: specs, base = output, explore = null }) {
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
      const entry = externals[`${file}:${local}`];
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
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
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
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-sidebar-sections.mjs.\n// Edit the extractor or src/source-sidebar-sections-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifestModules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      ...(selections.size ? { sourceSelections: [...selections.values()].map(s => s.record) } : {}),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  return { files, modules: manifestModules };
}

export async function extractSidebarSections({ check = false, explore = null } = {}) {
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-sidebar-sections.mjs',
    adapterModule: 'src/source-sidebar-sections-adapters.jsx', modules: [],
  };
  const renderer = await sliceOriginalModules({ modules: rendererModules, explore });
  const electron = await sliceOriginalModules({ modules: electronModules, explore });
  for (const m of electron.modules) if (m.imports.some(i => i.kind !== 'generated')) throw Error(`${m.target} must stay self-contained`);
  manifest.modules = [...renderer.modules, ...electron.modules];
  const files = { ...renderer.files, ...electron.files, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' };
  if (explore) return manifest;
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
  } else await extractSidebarSections({ check: process.argv.includes('--check') });
}
