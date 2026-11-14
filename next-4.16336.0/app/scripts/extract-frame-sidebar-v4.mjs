// Production generator of the frame-sidebar surface (OpenClaude v0.3 → Claude Desktop 4.16336.0; productionPlan step 2 of
// analysis/claude-4.16336.0-migrate-20261104/surface-pilots/frame-sidebar/report.json). Slices, with runSlicer
// (scripts/extract-working-line.mjs) and the finalized cds-core shared graph (sharedGraph 'cds-core'):
//   shared-22 vB  DesktopFrame (.dframe-root, export s), KR DesktopSidebar (the aside), shared-21 fO SidebarCollapsedTrigger
//   and the frame layout calculations (cB window border, shared-140 za title-row floor, shared-21 Fw content gutter,
//   shared-92 Tg / wg / Sg narrow viewport and width limits, shared-11 pn useWindowChrome).
// Child surfaces, stores and desktop services stop at `boundaries` below: each official declaration (chunk#local) becomes a
// named host capability of src/frame-sidebar-adapter.mjs (written here, deterministic; --check compares it), answered by
// src/frame-sidebar-host.jsx installFrameSidebarHost. A capability the host does not provide throws at use.
//
// Pins (scripts/frame-sidebar-v4.pins.json, written once by --pin-init, then reviewed and fixed): the snapshot chunk sha256
// of every listed module, each root's and boundary's declaration sha256 (+ head line), the old 3.6556.2 counterparts, and the
// finalized cds-core (manifest + adapter sha256). Any drift stops generation; a changed pin is a review decision.
//
//   node --max-old-space-size=4096 scripts/extract-frame-sidebar-v4.mjs [--check | --dry-run | --pin-init]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const sha = b => createHash('sha256').update(b).digest('hex');
export const generatedRoot = path.join(app, 'src/generated');
export const output = path.join(generatedRoot, 'frame-sidebar');
export const adapterPath = path.join(app, 'src/frame-sidebar-adapter.mjs');
export const pinsPath = path.join(import.meta.dirname, 'frame-sidebar-v4.pins.json');
const cdsCoreAdapterPath = path.join(app, 'src/cds-core-adapter.mjs');
export const S22 = 'shared-22-BACJUrcb.js', S21 = 'shared-21-CuohtEoj.js';

// Roots: semantic name, AST-unique features (prettier form), official export alias (null: chunk-internal), and the old
// 3.6556.2 counterpart (surfaces-evidence/root-deltas.json), re-checked at --pin-init.
export const roots = [
  { semantic: 'DesktopFrame', file: S22, local: 'vB', export: 's',
    features: ['"dframe-root draggable-none"', '"data-sidebar-density": "comfortable"', '"--df-traffic-light-spacer": V', '"data-lights-follow": z', '"dframe-content-inner"', 'o(KR, { narrow: C })'],
    old: { file: 'shared-22-Bwn3sJTG.js', local: 'oR', export: 's' } },
  { semantic: 'DesktopSidebar', file: S22, local: 'KR', export: null,
    features: ['"data-density": "comfortable"', 'defaultMessage: "Navigation"', '"data-traffic-light-spacer": !0', 'density: "comfortable"', 'componentName: "FrameSidebarNav"', '"df-titlebar draggable h-11 shrink-0 flex items-center px-2"'],
    old: { file: 'shared-22-Bwn3sJTG.js', local: 'GI', export: null } },
  { semantic: 'SidebarCollapsedTrigger', file: S21, local: 'fO', export: null,
    features: ['defaultMessage: "Show sidebar"', '"Restart needed. Show sidebar for details."', 'shortcut: "cmd+b"', '"data-testid": "sidebar-compact-trigger"', '"df-compact-trigger draggable-none"', '"aria-expanded": r'],
    old: { file: 'shared-21-R7LldJ05.js', local: 'gI', export: null } },
  // frame layout calculation (pure): the window border, title-row minimum width, content gutter, narrow-viewport query.
  { semantic: 'frameWindowBorder', file: S22, local: 'cB', export: null, features: ['macAppInWindow: e, zoomFactor: t', '`${1 / t}px` : "0px"'] },
  { semantic: 'sidebarTitleRowMinWidth', file: 'shared-140-DfG6VwpK.js', local: 'za', export: 'Qi', features: ['trafficLightSpacerPx: e,', 'hasChromeBarSwitcher: s = !1,', 'iconShiftPx: l = 0,'] },
  { semantic: 'contentGutterStyle', file: S21, local: 'Fw', export: 'qr', features: ['"--df-content-gutter": "0px"', '"--df-ceded-gutter": "8px"'] },
  { semantic: 'narrowViewportQuery', file: 'shared-92-BOgyxePb.js', local: 'Tg', export: 'Gy', features: ['`(max-width: ${wg(e)}px)`'] },
  { semantic: 'narrowViewportMaxWidth', file: 'shared-92-BOgyxePb.js', local: 'wg', export: 'Wy', features: ['Math.max(700, Math.ceil(e) + 330 - 1)'] },
  { semantic: 'SIDEBAR_WIDTH_LIMITS', file: 'shared-92-BOgyxePb.js', local: 'Sg', export: 'zy', features: ['{ MIN: 200, MAX: 420, DEFAULT: 288 }'] },
  { semantic: 'useWindowChrome', file: 'shared-11-CNsu0Zu8.js', local: 'pn', export: 'Wr', features: ['onFullscreenChanged', 'onZoomFactorChanged', 'Math.round(fn / Math.min(i, 1))', 'trafficLightSpacerWidth: d,', 'needsTrafficLightPadding: u,'] },
  // surfaces-prod-3 sidebar lane, nav-plan step 2: _B's glass layer (always mounted by _B as `o(Yz, { rootRef: t, docked: n })`).
  // Yz asks the desktop for the official default material { material: "appkit-glass", behind: "flat" } when the Mac bridge
  // globalThis["claude.windowVibrancy"].WindowVibrancy (rz) is there; Kz calls rz.showUnderSidebar, falls back to "sidebar"
  // when appkit-glass is refused, writes html[data-sidebar-vibrancy] / [data-sidebar-vibrancy-behind] (the shared-styles
  // rules that clear the sidebar's paint) and the --sidebar-vibrancy-seam; vz feeds the sidebar's --df-sidebar-tint-mixed to
  // rz.tintUnderSidebar. The bridge is the preload's (electron/preload.cjs), answered by electron/window-vibrancy.cjs and the
  // native sidebar-glass addon (surfaces-prod-3 glass-native lane). The host's FrameSidebarDock answer mounts it as _B does.
  { semantic: 'SidebarGlassLayer', file: S22, local: 'Yz', export: null,
    features: ['{ platform: "mac" }', 'e.ask ?? az', 'rz?.showUnderSidebar', '`${r} ${i}`'] },
  { semantic: 'SidebarVibrancy', file: S22, local: 'Kz', export: null,
    features: ['o.material !== "sidebar" && o.behind !== "clear"', 's === "appkit-glass" ? Fz : Pz', 'underBootPlaceholder: !0', '"under-placeholder"', '((s = "sidebar"), h(Jz), v(null), l());'] },
  { semantic: 'useSidebarTintUnderSidebar', file: S22, local: 'vz', export: null,
    features: ['typeof rz?.tintUnderSidebar != "function"', 'rz.clearTintUnderSidebar?.()?.catch(xz)', 'n.setAttribute(mz, "")', '"data-cds-fizzy-lake"'] },
  // round-4 wave 8c sidebar lane, H12: _B's root marks (always mounted by _B as `o(hB, { rootRef: t })`). hB writes
  // data-hovering / data-peeked / data-resizing / data-session-dragging on the frame root from the official stores (shared-92
  // Y: BS hovering, HS peeked, XS isResizing, FS; the session-dragging store shared-55 gL over eL, this graph's), marks
  // data-strip-lined (shared-31 nu over Y's stripLineClaims) and holds the cursor lock (shared-26 UH over BH, cds-core
  // store_shared26_BH, wave 8c) while the peeked sidebar is hovered or a session is dragged. It replaces the host's
  // FrameRootMarks (frame-sidebar-host.jsx), which kept only the host-only marks (the desktop-app class, data-frame-mode).
  { semantic: 'SidebarDockRootMarks', file: S22, local: 'hB', export: null,
    features: ['e.toggleAttribute("data-session-dragging", a)', 'ta(o && n),', 'Xu(t);'] },
];

const targets = {
  [S22]: 'frame.mjs', [S21]: 'frame-chrome.mjs', 'shared-140-DfG6VwpK.js': 'sidebar-layout.mjs', 'shared-92-BOgyxePb.js': 'sidebar-store.mjs',
  'shared-11-CNsu0Zu8.js': 'window-chrome.mjs', [official.vendorFrame]: 'vendor-frame.mjs', [official.sharedFrame]: 'shared-frame.mjs',
  'rolldown-runtime-C3OYiQ02.js': 'rolldown-runtime.mjs',
};
// Every chunk the bounded closure enters (the slicer fails on an unlisted or unused chunk).
export const chunks = [S22, S21, 'shared-140-DfG6VwpK.js', 'shared-92-BOgyxePb.js', 'shared-11-CNsu0Zu8.js', 'shared-0-CnnWnVrT.js', 'shared-25-D-aF0gt9.js',
  'shared-1-D1bGaTaN.js', 'shared-20-DUEo90UF.js', 'shared-19-UalAfDtn.js', 'shared-212-BHMAi0oa.js', 'shared-62-DoCqVpIq.js', 'shared-4-C_EiQb9h.js',
  'shared-55-BRv2XBP7.js', 'shared-33-DtdykY0y.js', 'shared-31-C9BqSSuD.js', 'shared-123-1Hc1RTKl.js', 'shared-18-Cfqwgjc5.js', 'shared-8-BqfCbkJd.js',
  'shared-183-B2N6Zy4J.js', 'shared-39-ZCs0lAwB.js', 'shared-5-u8kha2eH.js', 'vendor-all-0-uUCo-eCX.js',
  official.vendorIntl, 'shared-26-B-POtn5S.js',
  'shared-120-DCdTP1_5.js', official.sharedFrame];
// (shared-38 / shared-120: the closure held shared-38 vi..Ei and shared-120 Er / Dr there; since cds-core wave 7 the
// closure reaches them only through cds-core publicNames (cds-integrate/wave7: shared-120 Er / Dr published, their
// shared-38 readers held by cds-core), so the chunks are no longer entered.)
// (vendor-intl: the closure copies only tn, react-intl defineMessages (the identity, pure), reached from shared-21 Uf; its
// useIntl q / FormattedMessage Gt are boundaries answered by the host catalog.)
// (shared-6: the closure read only qD there (the frame content context, frame.mjs lm), which cds-core publishes since
// wave 5b (InDesktopFrameContentContext), so it is a cds-core link and the chunk is no longer entered.)
// (vendor-frame / rolldown-runtime: the pilot cut 88 + 8 pure held copies of them; on the finalized cds-core the closure
// reaches neither: every binding it needs there is a cds-core publicName.)

// cds-wave6 (cds-wave6/survey/closure.json a-titlebar needOneOwner): module state this graph owns that the titlebar frame
// (shared-20 o_ / s_) also reaches; exported under its own local so the titlebar graph (linkedAreas frame-sidebar) links
// this one copy: the zustand slot store shared-31 Kl (`Kl = Gl()`), its store factory Gl (official export Ao) and shared-92
// cS. cds-core does not hold them (cds-wave6/run/tools/iterate.mjs keeps them out of the owner).
// surfaces-prod-3 sidebar lane (nav-plan wave6-requests.json route "linkedAreas frame-sidebar"): bindings this graph slices
// that the sidebar nav body (shared-22 PI, scripts/extract-frame-sidebar-nav.mjs, linkedAreas frame-sidebar) also reaches:
// module state (the D1 gate counts them: shared-21 nD / tD / XO contexts, eD / fj / pj, shared-55 eL zustand store / $I /
// DR / mL, shared-4 wy / Ay, shared-212 $p) and the pure helpers next to them (shared-21 mj / hj, shared-4 Cy, shared-212
// nm), exported under their own locals so the nav graph imports this one copy.
// D1 (cds-integrate wave 8s, W8S-M5): cds-core now holds and publishes five of the shared-123 ones (settings_shared123_<local>:
// the zustand store J, the collection hb, the reassigned iI and the W7-D1 writers cI / lI; pins.merge.wave8s), so this graph
// links them from cds-core like the nav graph does and no longer exports them (CV / SV / bV / xV stay here: wave 8s holds
// them back, W8S-H4); the shared-123 list was ['cI', 'lI', 'AV', 'Ax', 'CV', 'E_', 'FV', 'HC', 'J', 'JB', 'JF', 'PV', 'SV',
// 'TV', 'VC', 'YF', 'ZF', '_u', 'bV', 'b_', 'cb', 'dI', 'eI', 'fI', 'hb', 'iI', 'kx', 'nI', 'oI', 'q', 'qB', 'rI', 'tI', 'uI',
// 'vu', 'xV', 'y_'] through wave 8.
// (cds-wave8 W8-R1 / addendum W8A-M1, real-tree replay over wave 8s: shared-92 cS, the load-time constant, is published by
// cds-core since the wave-8 addendum (identity_shared92_cS, stage 11a), so the closure links that one copy and this graph no
// longer exports it; no consumer imported it from sidebar-store.mjs. Was: 'shared-92-BOgyxePb.js': ['cS'].)
export const linkExportsByChunk = {
  'shared-31-C9BqSSuD.js': ['Kl', 'Gl'],
  [S21]: ['XO', 'eD', 'fj', 'hj', 'mj', 'nD', 'pj', 'tD'],
  'shared-55-BRv2XBP7.js': ['$I', 'AR', 'BI', 'DR', 'JI', 'KL', 'LR', 'OR', 'WI', 'WL', 'eL', 'kR', 'mL', 'qI'], 'shared-39-ZCs0lAwB.js': ['qc'],
  'shared-123-1Hc1RTKl.js': ['AV', 'Ax', 'CV', 'E_', 'FV', 'HC', 'JB', 'JF', 'PV', 'SV', 'TV', 'VC', 'YF', 'ZF', '_u', 'bV', 'b_', 'cb', 'dI', 'eI', 'fI', 'kx', 'nI', 'oI', 'q', 'qB', 'rI', 'tI', 'uI', 'vu', 'xV', 'y_'], 'shared-120-DCdTP1_5.js': ['I', 'L'],
  'shared-4-C_EiQb9h.js': ['Ay', 'Cy', 'wy'],
  'shared-212-BHMAi0oa.js': ['$p', 'nm'],
};
export const modules = chunks.map(source => {
  const mine = roots.filter(r => r.file === source);
  const spec = { source, target: targets[source] ?? `${source.replace(/-[\w-]{8}\.js$/, '')}.mjs` };
  if (linkExportsByChunk[source]) spec.linkExports = [...linkExportsByChunk[source]];
  if (mine.length) {
    spec.internal = true;
    spec.exports = Object.fromEntries(mine.map(r => [r.local, r.semantic]));
    spec.features = Object.fromEntries(mine.map(r => [r.local, r.features]));
  }
  return spec;
});

// Host boundaries: official declarations (chunk#local of the 4.16336.0 snapshot) the slice does not copy; each resolves to a
// named host capability through src/frame-sidebar-adapter.mjs. `kind`:
//   component  a child surface the host mounts in this slot (an existing host region or a later slice)
//   hook       a hook whose answer is host state / a gate (report.json gatedBranchDecisions records the fixed answers)
//   store      official module state the host owns (one instance, the host's), zustand-compatible
//   effect     a side-effect hook (desktop bridge / global listener) the host performs or declares as a gap
//   render     a render function the official code calls directly (not as a component): the adapter passes the call through
//   bridge     a module-level desktop bridge object (globalThis["claude.web"].X); the adapter exposes the methods named in
//              `reads` as getters over the host's object, so a method the host lacks reads undefined (the official
//              absent-bridge path), while a missing bridge object throws.
// Wave-4 cds-core publishes CdsTooltip (shared-frame Kp), useCdsOwnerWindow (mo) and useCdsIconSize (qu): the pilot's
// cdsLink adapters and the dO cdsPending slot are gone; the slicer imports those names from ../cds-core.
export const boundaries = [
  // ---- frame root vB (shared-22 export s)
  { key: `${S22}#_B`, name: 'FrameSidebarDock', kind: 'component', reads: ['rootRef', 'sidebarDocked'], host: 'frame dock layer (_B: drag ghost hB, gm/dm platform layers) — later slice; host sidebar-resize/sidebar-reorder regions' },
  { key: `${S22}#fB`, name: 'FrameChromeBar', kind: 'component', reads: [], host: 'gap: Windows/Linux chrome bar (dB mounts it only when me() = Windows || Linux; dB itself is sliced)' },
  { key: `${S21}#qC`, name: 'FrameIdleWork', kind: 'component', reads: [], host: 'gap: recent-session idle enqueue (RC.hasRecent / Jr.enqueueIdle) — official service' },
  { key: `${S22}#bB`, name: 'frameMountResets', kind: 'effect', reads: [], host: 'effect callback (vB `useEffect(bB, [])`): official bB resets the fd / ai / Bt stores the host does not have; gap' },
  { key: 'shared-92-BOgyxePb.js#CC', name: 'useCdsInterfaceFont', kind: 'hook', reads: ['cdsFont'], host: 'host interface font preference (settings appearance)' },
  { key: 'shared-39-ZCs0lAwB.js#Oh', name: 'useReducedMotionSync', kind: 'effect', reads: [], host: 'gap: official reduced-motion store subscription (zo.subscribe)' },
  { key: 'shared-20-DUEo90UF.js#$T', name: 'useMemoryPressureBridge', kind: 'effect', reads: ['enabled'], host: 'official Ce.onOnEvent memory_pressure → cache trims; the host preload has no such event: gap' },
  { key: 'shared-55-BRv2XBP7.js#UV', name: 'useIsSidebarless', kind: 'hook', reads: ['sidebarlessClaims > 0 (shared-55 WV)'], host: 'host: popout / pane / incognito windows have no sidebar (main.jsx NO_SIDEBAR, frameShellMounted)' },
  { key: 'shared-55-BRv2XBP7.js#zV', name: 'useIsFullBleedBody', kind: 'hook', reads: ['fullBleedBodyClaims > 0 (shared-55 BV)'], host: 'host route state (full-bleed pages)' },
  { key: 'shared-19-UalAfDtn.js#sR', name: 'useIsFocusMode', kind: 'hook', reads: [], host: 'host focus/zen mode (none: answers false)' },
  // SB-0 / H11 (round4 wave8b sidebar): shared-92 Y (the official frame store, official export qg) is no longer a host
  // boundary: cds-core publishes it (store_shared92_Y, wave 8 W8-M4) and this graph links it like the nav body does (one
  // instance per window). main.jsx drives Y through Y's own actions (setCollapsedPref / commitSidebarWidth / setHovering /
  // closePeek / setIsNarrowViewport / setIsCuDocked / setSidebarFloor / resetTransients) and follows the changes the sliced
  // frame makes to it. Was: { key: 'shared-92-BOgyxePb.js#Y', name: 'frameStore', kind: 'store', reads: [collapsed,
  // sidebarWidth, sidebarFloor, hovering, isNarrowViewport, setIsNarrowViewport, resetTransients, setSidebarFloor,
  // overflowMenuOpen, closePeek, composedSidebarOpen, isRouteDrilldown], host: the host sidebar model as a zustand-shaped store }.
  { key: 'shared-31-C9BqSSuD.js#Gd', name: 'useContentGutterZero', kind: 'hook', reads: [], host: 'host route state' },
  { key: `${S21}#LC`, name: 'useCmdArrowHistoryKeys', kind: 'effect', reads: [], host: '⌘←/⌘→ goBack / goForward through the official Ke bridge; host history keys stay main.jsx (travel): gap here' },
  { key: 'shared-31-C9BqSSuD.js#Xd', name: 'useRouteGutter', kind: 'hook', reads: [], host: 'host route state' },
  { key: `${S21}#vw`, name: 'useFindInPage', kind: 'effect', reads: ['ref', 'popout', 'enabled'], host: 'host find-in-page (source-find?) — official qe.offerFindInPageInPopout bridge absent' },
  { key: `${S21}#cw`, name: 'useLinuxTitlebarMenu', kind: 'effect', reads: [], host: 'gap: Linux only' },
  { key: 'shared-0-CnnWnVrT.js#FH', name: 'useIsDesktopApp', kind: 'hook', reads: ['platform', 'version'], host: 'host: Electron desktop on process.platform (always desktop; platform from preload)' },
  // review P1 (surface-pilots/frame-sidebar/review): shared-11 pn (useWindowChrome) reads shared-0 uO, the module-level
  // `globalThis["claude.web"]?.WindowState` bridge. The host has no claude.web global; frame-sidebar-host.jsx answers it from
  // the preload's boot fullScreen / zoomFactor and its onEvent kinds window / zoom-factor (the four methods pn calls).
  { key: 'shared-0-CnnWnVrT.js#uO', name: 'WindowState', kind: 'bridge', reads: ['getFullscreen', 'onFullscreenChanged', 'getZoomFactor', 'onZoomFactorChanged'], host: 'host window state (main.jsx fullScreen / zoomFactor over the preload boot and onEvent window / zoom-factor)' },
  // ---- sidebar KR (shared-22, no export; rendered by vB)
  { key: `${S22}#PI`, name: 'SidebarNavBody', kind: 'component', reads: ['coworkChecklistMounted', 'codeSessionListChrome', 'classicSearchRow'], host: 'source-sidebar.jsx sections (sidebar-sections / sidebar-reorder / sidebar-hover-card / sidebar-routines areas)' },
  { key: `${S21}#bA`, name: 'SidebarDesktopUpdateLayer', kind: 'component', reads: [], host: 'host update/restart indicator (gap: official update service)' },
  { key: `${S22}#GR`, name: 'SidebarChromeBarCluster', kind: 'component', reads: ['onPointerEnter', 'onPointerLeave'], host: 'source-titlebar.jsx SourceCollapsedChrome cluster' },
  { key: `${S21}#S_`, name: 'SidebarModeSwitchRow', kind: 'component', reads: [], host: 'source-app-switch.jsx (app-switch area)' },
  { key: `${S21}#eA`, name: 'SidebarModeScope', kind: 'component', reads: ['frameMode', 'children'], host: 'host mode provider (mode prop) — must render children' },
  { key: `${S21}#yO`, name: 'SidebarCollapsedChrome', kind: 'component', reads: ['withNavButtons', 'onPointerEnter', 'onClusterPointerEnter'], host: 'source-titlebar.jsx SourceCollapsedChrome' },
  { key: `${S21}#qE`, name: 'SidebarChatPromo', kind: 'component', reads: ['isExpanded'], host: 'gap: web chat only (m false)' },
  { key: `${S22}#tL`, name: 'SidebarDesktopDialogs', kind: 'component', reads: [], host: 'host dialogs (desktop only)' },
  { key: `${S22}#HL`, name: 'useSidebarHotkeys', kind: 'effect', reads: [], host: 'host keyboard (source-sidebar.jsx key handling)' },
  { key: `${S21}#dA`, name: 'SidebarCommandPalette', kind: 'component', reads: [], host: 'host palette (paletteCommands)' },
  { key: `${S21}#uj`, name: 'SidebarSearchButton', kind: 'component', reads: ['size'], host: 'source-sidebar.jsx Search row/button' },
  { key: `${S21}#cv`, name: 'SidebarSetupCardScope', kind: 'component', reads: ['children'], host: 'cv: the setup-Claude-card live-probe verdict provider (sv.Provider) around the nav; host has no setup card: renders children' },
  { key: `${S21}#s_`, name: 'useWordmarkRowCollapse', kind: 'hook', reads: [], host: 'gate' },
  { key: `${S21}#o_`, name: 'useTitlebarSwitcher', kind: 'hook', reads: [], host: 'gate' },
  { key: `${S21}#l_`, name: 'useChromeBarSwitcher', kind: 'hook', reads: [], host: 'gate' },
  // QE is always mounted by KR (`o(QE, { hubWordmark })`) and renders null: idle-scheduled GrowthBook exposure logging (Lh) of
  // sidebar_app_switcher and two more features, and yg(hub wordmark shown) -- analytics, not a hub rail (pilot name corrected).
  { key: `${S21}#QE`, name: 'SidebarSwitcherExposure', kind: 'component', reads: ['hubWordmark'], host: 'gap: GrowthBook exposure / hub-wordmark telemetry (no analytics on the host); renders null officially' },
  { key: `${S21}#p_`, name: 'useHubSwitcherInTitlebar', kind: 'hook', reads: [], host: 'gate' },
  { key: `${S21}#cD`, name: 'SidebarToasts', kind: 'component', reads: [], host: 'host toasts' },
  { key: `${S21}#n_`, name: 'useSwitcherHidden', kind: 'hook', reads: [], host: 'gate' },
  { key: `${S21}#qM`, name: 'SidebarSettingsSync', kind: 'component', reads: [], host: 'qM: syncs the tabs / openBehavior settings into the sidebar stores (xt(BM, …)); host settings stay main.jsx: renders nothing' },
  { key: `${S22}#zL`, name: 'SidebarGlobalShortcuts', kind: 'component', reads: [], host: 'host shortcuts' },
  { key: `${S21}#JA`, name: 'SidebarNarrowHeader', kind: 'component', reads: ['mark'], host: 'host narrow header (narrow prop)' },
  { key: `${S21}#_O`, name: 'SidebarHistoryNav', kind: 'component', reads: [], host: 'source-titlebar.jsx back/forward (historyAt/travel)' },
  { key: 'shared-20-DUEo90UF.js#$k', name: 'SidebarCodeSessionsPrefetch', kind: 'component', reads: [], host: 'gap: official code sessions service' },
  { key: `${S22}#WR`, name: 'SidebarInstallUpsell', kind: 'component', reads: [], host: 'gap: install upsell (web only)' },
  { key: `${S21}#fE`, name: 'SidebarBottomRail', kind: 'component', reads: ['hubRail'], host: 'host bottom tray (hub rail gate)' },
  { key: 'shared-26-B-POtn5S.js#Ds', name: 'SidebarErrorBoundary', kind: 'component', reads: ['componentName', 'fallback', 'children'], host: 'main.jsx SourceSidebarBoundary (must render children)' },
  { key: `${S21}#lj`, name: 'SidebarNewChatButton', kind: 'component', reads: ['sm'], host: 'source-sidebar.jsx New session' },
  { key: 'shared-140-DfG6VwpK.js#Wh', name: 'useSidebarRowActionKeys', kind: 'effect', reads: [], host: 'Wh: the Code row keyboard action (archive / delete of the focused row); host rows own their keys' },
  { key: `${S21}#sT`, name: 'TitlebarHipaaBadge', kind: 'component', reads: ['wrapClassName'], host: 'sT: the titlebar HIPAA badge (data-testid titlebar-hipaa-badge) for HIPAA orgs; host has no org: renders nothing' },
  { key: 'shared-140-DfG6VwpK.js#Zp', name: 'useSidebarCycleKeys', kind: 'effect', reads: [], host: 'Zp: session cycling chords over the sidebar rows; host: main.jsx session chords' },
  { key: `${S22}#IR`, name: 'SidebarDesktopMenus', kind: 'component', reads: [], host: 'host menus' },
  { key: 'shared-57-grpFrBWt.js#sw', name: 'useSidebarSessionsPrefetch', kind: 'effect', reads: [], host: 'gap: official sessions query' },
  { key: `${S22}#rR`, name: 'useSidebarRowJumpKeys', kind: 'effect', reads: [], host: '⌘1…9 row jump (rR); the host sidebar body owns its jump hints (source-sidebar.jsx useJumpHints): host' },
  { key: `${S22}#XI`, name: 'SidebarDesktopOverlays', kind: 'component', reads: [], host: 'host overlays' },
  { key: `${S22}#zR`, name: 'useNativeSidebarMenuToggle', kind: 'effect', reads: ['expanded'], host: 'zR(expanded): native View-menu onToggleSidebar + reportSidebarMenuState; host: main.jsx onEvent toggle-sidebar (no report): gap for the report' },
  { key: `${S22}#LL`, name: 'SidebarAnnouncer', kind: 'component', reads: [], host: 'main.jsx SourceLiveAnnouncer' },
  { key: `${S21}#ub`, name: 'useSidebarToggleCommand', kind: 'hook', reads: ['source'], host: 'host expand/collapse (expandSidebar / collapse)' },
  { key: 'shared-8-BqfCbkJd.js#$S', name: 'useSidebarRouteSync', kind: 'effect', reads: [], host: 'host route state' },
  { key: 'shared-123-1Hc1RTKl.js#EV', name: 'useFrameMode', kind: 'hook', reads: [], host: 'host mode (chat | cowork | code)' },
  { key: `${S21}#zA`, name: 'SidebarNarrowSheet', kind: 'component', reads: ['label'], host: 'zA: the narrow-viewport phone-sheet controller (data-phone-sheet, role dialog on #frame-peek-popover) with its close button' },
  { key: `${S21}#HE`, name: 'useBouncingLogo', kind: 'hook', reads: [], host: 'gap: logo easter egg — host answers inactive' },
  { key: 'shared-140-DfG6VwpK.js#Km', name: 'usePeekHover', kind: 'hook', reads: ['onEnter', 'onLeave'], host: 'host peek model (peekEnter / peekLeave)' },
  { key: `${S21}#jA`, name: 'SidebarPeekInertSync', kind: 'component', reads: [], host: 'jA: inert on #frame-peek-popover only while the chrome-bar switcher hides it (Wc() && !Lc()); host gate Wc false; renders nothing: gap' },
  { key: `${S21}#u_`, name: 'useHubSwitcherPinned', kind: 'hook', reads: [], host: 'gate' },
  { key: `${S21}#ZE`, name: 'useDesktopNavButtons', kind: 'hook', reads: [], host: 'host history nav availability (historyLength)' },
  { key: 'shared-20-DUEo90UF.js#XT', name: 'SidebarModeWordmark', kind: 'component', reads: ['mode', 'height'], host: 'source-app-switch.jsx wordmark' },
  { key: 'shared-8-BqfCbkJd.js#_C', name: 'trackSidebarLogoClick', kind: 'hook', reads: [], host: '_C: telemetry tm(…, "home.sidebar.logo"); host sends no telemetry' },
  { key: 'shared-1-D1bGaTaN.js#Tb', name: 'ClaudeLogo', kind: 'component', reads: ['variant', 'height', 'className'], host: 'host brand asset (wordmark svg)' },
  { key: 'shared-25-D-aF0gt9.js#Ky', name: 'RouterLink', kind: 'component', reads: ['href', 'onClick', 'className', 'aria-label', 'children'], host: 'host navigation (navigate / onNew)' },
  { key: `${S21}#JT`, name: 'useSidebarBootPlaceholderReport', kind: 'effect', reads: ['ref'], host: 'JT: reports the sidebar skeleton / colours to the native boot placeholder (Ge.reportSidebarPlaceholder); host has none: gap' },
  { key: 'shared-55-BRv2XBP7.js#tM', name: 'useMobileUpsellEnabled', kind: 'hook', reads: ['mode'], host: 'gate (false)' },
  // ---- collapsed trigger fO (shared-21, no export)
  { key: `${S21}#lO`, name: 'useSidebarAttentionIndicator', kind: 'hook', reads: [], host: 'host unread / update dot (sessions unread)' },
  { key: `${S21}#ZD`, name: 'runSidebarViewTransition', kind: 'hook', reads: ['callback'], host: 'host view transition (calls callback synchronously when unsupported)' },
  { key: 'shared-8-BqfCbkJd.js#ZS', name: 'useSidebarToggle', kind: 'hook', reads: ['source'], host: 'host expandSidebar' },
  { key: `${S21}#mE`, name: 'useRestartRequired', kind: 'hook', reads: [], host: 'host update state (restartRequired) + gate __gb__976857019' },
  // ---- sidebar-body (surfaces-prod-2): ZA (the resize handle) and cj (Hide sidebar) are sliced; they stop here
  { key: 'shared-8-BqfCbkJd.js#XS', name: 'trackSidebarStateSet', kind: 'hook', reads: ['wasCollapsed', 'source'], host: 'XS(e, t): analytics only (Fo "claudeai.desktop.sidebar.state_set" + tm "home.sidebar.toggle", true when the state changed); host sends no telemetry: gap (answers whether the collapsed state changed, as the official return value)' },
  // x_ (the Chat / Code app switch, shared-21, KR's titlebar switcher Nv) is sliced; its mode routing, entitlement and
  // telemetry stop here. The segments (v_), indicator (b_ / Rg) and the SegmentedControl are official.
  { key: `${S21}#f_`, name: 'useHomeMode', kind: 'hook', reads: [], host: 'f_ = Wi() ? "cowork" : "chat": the home segment\'s mode; host homeModeFor({ coworkEnabled }) (app-switch-model.mjs)' },
  { key: `${S21}#Xg`, name: 'useCoworkHomeName', kind: 'hook', reads: [], host: 'Xg: "Claude" unless the account qualifies for "Chat and Cowork" (er/$i/ka/is account and org conditions the host does not have): host answers "Claude" (D11, homeNameFor)' },
  { key: `${S21}#Lg`, name: 'useUnifiedHomeTooltip', kind: 'hook', reads: [], host: 'Lg = Mg("tabTooltip"): the unified Chat-and-Cowork tooltip detail behind __gb__4201401477 (Tg default false); host GrowthBook does not serve it: gate { unified: null, detail: undefined }' },
  { key: `${S21}#t_`, name: 'useCodeModeAvailability', kind: 'hook', reads: [], host: 't_: Code entitlement / discovery upsell. On the desktop (Z() true) with "code" among the enabled modes it is { reason: null }; the host always has the local Code core: host answer { reason: null }' },
  { key: 'shared-33-DtdykY0y.js#yb', name: 'useUnsupportedModeCopy', kind: 'hook', reads: ['intl', 'mode', 'code', 'reason'], host: 'yb: the disabled-segment title/description (org policy popover config, entitlement copy); only shown while t_ gives a reason, which the host never does: host answers the official no_entitlement shape with empty copy' },
  { key: 'shared-6-2QYRw_Wv.js#EE', name: 'usePrefetchMode', kind: 'hook', reads: ['mode', 'what'], host: 'EE: route prefetch of a mode (Hi[mode] chunk / data); the host bundles every page: gap (prefetch does nothing)' },
  { key: 'shared-6-2QYRw_Wv.js#TE', name: 'useNavigateToMode', kind: 'hook', reads: ['mode', 'via'], host: 'TE: press -> pressedMode (Bi) now, pendingMode (ps) after 0ms, then navigate to Hi[mode]; host: the same press model (app-switch-model.mjs createAppSwitchPress) over main.jsx switchMode' },
  { key: 'shared-6-2QYRw_Wv.js#DE', name: 'useModeHoverRoute', kind: 'hook', reads: ['mode'], host: 'DE: the route to prefetch on hover (null when current); the host prefetches nothing: answers null for every mode' },
  { key: 'shared-123-1Hc1RTKl.js#MV', name: 'useSelectedMode', kind: 'hook', reads: [], host: 'MV: AV.pressedMode ?? route mode, clamped to the enabled modes; host: pressed ?? pending ?? main.jsx mode' },
  { key: 'shared-123-1Hc1RTKl.js#tV', name: 'useEnabledModes', kind: 'hook', reads: [], host: 'tV = j(YB) ?? qB: the enabled frame modes; host: [homeMode, "code"]' },
  { key: 'shared-8-BqfCbkJd.js#WS', name: 'useModeActivityDot', kind: 'hook', reads: ['mode'], host: 'WS: RS.byMode[mode] (the tab activity store the official session services write); host: main.jsx app-switch attention by mode (none passed today: undefined)' },
  { key: 'shared-8-BqfCbkJd.js#HS', name: 'modeActivityTelemetry', kind: 'hook', reads: ['to', 'from'], host: 'HS: telemetry fields { to_tab_activity, from_tab_activity } read from RS; host sends no telemetry: gap ({})' },
  { key: 'shared-8-BqfCbkJd.js#KS', name: 'sidebarStateForTelemetry', kind: 'hook', reads: [], host: 'KS: "peek" | "collapsed" | "expanded" for telemetry; answered from the host frame store' },
  { key: 'shared-62-DoCqVpIq.js#OT', name: 'useAnalytics', kind: 'hook', reads: [], host: 'OT: { track } analytics; host sends no telemetry: gap (track does nothing)' },
  { key: 'shared-212-BHMAi0oa.js#rk', name: 'trackFeatureOk', kind: 'hook', reads: ['track', 'feature', 'props'], host: 'rk: telemetry "claudeai.feature_ok"; gap' },
  { key: 'shared-25-D-aF0gt9.js#vf', name: 'useRoutePrefetchHandlers', kind: 'hook', reads: ['route', 'onPress'], host: 'vf: pointer/focus handlers that prefetch a route on hover / press (shared-25 yf timers); the host prefetches nothing (DE answers null, EE is a gap): the official handler set for nothing to prefetch (_f shape)' },
  { key: 'shared-25-D-aF0gt9.js#vu', name: 'subscribePathname', kind: 'hook', reads: ['listener'], host: 'vu = yu(nu.subscribe, listener): calls listener(pathname, previous) when the official router pathname changes; host: main.jsx route (mode / section) changes, notified from FrameSidebarHost' },
  { key: 'shared-55-BRv2XBP7.js#HS', name: 'DiscoveryUpsellCards', kind: 'component', reads: ['feature', 'copy', 'cta', 'variant', 'onClose'], host: 'unreachable: drawn only for a t_ discovery upsell, which the host never answers (absent from the host table: reaching it throws)' },
  // QL (KR's account tray, shared-22) is sliced: the account button QF (shared-19 lt), the Code settings gear qL, the Chat
  // apps button nR, the cowork feedback button tR and the tray search $L. Account data and the account menu are the host's.
  { key: 'shared-123-1Hc1RTKl.js#TC', name: 'isWebBuild', kind: 'constant', value: false, reads: [], host: 'TC = wC(): true on claude.ai in a browser; wC tests the desktop user agent and window.claudeAppBindings, which the host renderer does not carry, so the copied expression would answer "web". The host is the desktop app: constant false' },
  { key: 'shared-123-1Hc1RTKl.js#cf', name: 'useFeedbackHiddenForOrg', kind: 'hook', reads: [], host: 'cf: (__gb__2142364912 || feature-flag org differs from the active org) && ks(); host GrowthBook does not serve the flag and has no organisations: gate false' },
  { key: 'shared-5-u8kha2eH.js#uJ', name: 'useFeedbackAvailable', kind: 'hook', reads: [], host: 'uJ: the cowork in-app feedback reporter is available (official feedback service); host has none: gap false (tR returns null)' },
  { key: 'shared-5-u8kha2eH.js#gJ', name: 'useOpenFeedback', kind: 'hook', reads: [], host: 'gJ: opens the official feedback reporter; unreachable while uJ is false (answers a function that throws)' },
  { key: 'shared-21-CuohtEoj.js#cO', name: 'useInstallHubDot', kind: 'hook', reads: [], host: 'cO: the "install hub" dot on the apps button (official install-hub layout + dismissals); host has no install hub: gap { show: false, dismiss }' },
  { key: `${S22}#ZL`, name: 'useAppsButtonEnabled', kind: 'hook', reads: ['notCode'], host: 'ZL: whether the Chat tray shows "Get apps and extensions" (install hub enabled, persisted verdict); it opens the official /downloads page, which the host does not have: gate false (nR returns null)' },
  { key: 'shared-8-BqfCbkJd.js#jC', name: 'trackDownloadsClick', kind: 'hook', reads: [], host: 'jC: telemetry home.sidebar.downloads; gap' },
  { key: 'shared-8-BqfCbkJd.js#MC', name: 'trackProfileMenuOpened', kind: 'hook', reads: [], host: 'MC: telemetry claudeai.desktop.sidebar.profile_menu_opened; gap' },
  { key: 'shared-25-D-aF0gt9.js#$u', name: 'useRouter', kind: 'hook', reads: ['push', 'replace', 'back', 'forward', 'refresh', 'prefetch'], host: 'the official router ($u: push / replace / back / forward / refresh / prefetch); host: main.jsx navigation (settings paths open the settings dialog page, history back / forward)' },
  { key: 'shared-55-BRv2XBP7.js#Hh', name: 'useClaudeCodeAvailable', kind: 'hook', reads: [], host: 'Hh = ls("claude_code").isAvailable; the host always runs the local Code core: true' },
  { key: 'shared-18-Cfqwgjc5.js#TS', name: 'useSettingsPagePrefetch', kind: 'hook', reads: ['page', 'options'], host: 'TS: pointer/focus handlers that prefetch a settings page chunk (120ms debounce); host bundles the settings pages: gap handler set' },
  { key: 'shared-183-B2N6Zy4J.js#Sg', name: 'useSettingsOpensAsDialog', kind: 'hook', reads: [], host: 'Sg = yg(Cg): settings open as the in-app dialog (not the /settings route); host settings are a dialog: true' },
  { key: 'shared-183-B2N6Zy4J.js#jg', name: 'openSettingsPage', kind: 'hook', reads: ['section', 'subpath', 'options'], host: 'jg = yg.getState().open(section): opens the settings dialog on a page; host: main.jsx setSettings over settings-tab-compat.mjs OFFICIAL_TO_HOST' },
  { key: 'shared-123-1Hc1RTKl.js#bC', name: 'useAccountReady', kind: 'hook', reads: [], host: 'bC: account / organisation data settled (gates qL\'s Code-availability check); host local account is always ready: true' },
  { key: 'shared-19-UalAfDtn.js#BF', name: 'AccountMenu', kind: 'component', reads: ['trigger', 'align', 'className', 'onOpenChange', 'inOrganizationSettings'], host: 'BF: the official account dropdown around QF\'s trigger; host: the trigger opens main.jsx\'s account menu (local accounts, Settings, Language, Codex)' },
  { key: 'shared-19-UalAfDtn.js#NP', name: 'OrganizationAvatar', kind: 'component', reads: [], host: 'unreachable: drawn only with inOrganizationSettings (organisation settings page); absent from the host table' },
  { key: 'shared-1-D1bGaTaN.js#fee', name: 'usePendingInviteCount', kind: 'hook', reads: [], host: 'fee: pending organisation invites (official invites query); host has no organisations: 0' },
  { key: 'shared-80-BDW2YKDx.js#De', name: 'useAccountIdentity', kind: 'hook', reads: ['provider'], host: 'De(provider) -> { identity, orgPrimary, orgSecondary }: the tray name and plan suffix; host: main.jsx accountButton (name, plan) from the local account model' },
  { key: 'shared-1-D1bGaTaN.js#c5', name: 'useLoginProvider', kind: 'hook', reads: [], host: 'c5: the SSO / 3P login result (getLoginDesktop3pStatus); host local accounts have none: undefined' },
  { key: 'shared-25-D-aF0gt9.js#eV', name: 'usePlanTier', kind: 'hook', reads: [], host: 'eV: "raven" | "claude_pro" | "claude_max" | "free" from the account stores; QF calls it for its hooks only (result unused); host: "free" (no claude.ai subscription)' },
  { key: 'shared-25-D-aF0gt9.js#Z', name: 'useCurrentAccount', kind: 'hook', reads: ['account', 'activeOrganization'], host: 'Z: the CurrentAccountProvider value; host: the local account model ({ account: { display_name, full_name, email_address }, activeOrganization: undefined })' },
  { key: 'shared-19-UalAfDtn.js#jP', name: 'useAccountAvatar', kind: 'hook', reads: [], host: 'jP: { name, src, isLoading } (avatar query); FP calls it but draws the Spark (the avatar branch is compiled out behind __gb__496524976); host: the local account name, no src' },
  { key: 'shared-25-D-aF0gt9.js#Mo', name: 'useGrowthBookFlagWhen', kind: 'hook', reads: ['flag', 'enabled'], host: 'Mo(flag, enabled): GrowthBook flag when enabled and a client exists; host: HOST_GROWTHBOOK (no client: off)' },
  // rT (FrameEdgePeek, shared-21) is sliced: the collapsed sidebar's edge handle (Xw dframe-sidebar-edge) and hint. The
  // edge-magnet peek itself is a lazily loaded official chunk (tT, sidebar_edge_magnet_peek, loaded only when md() / ES
  // __gb__741807810 is on, which the host GrowthBook does not serve).
  { key: `${S21}#tT`, name: 'EdgeMagnetPeekEntry', kind: 'bridge', reads: ['handle', 'Component'], host: 'tT = ji({ entry: sidebar_edge_magnet_peek, load: eT }): the lazy chunk entry; host: the entry is never loaded (gate off), handle null, Component unreachable' },
  { key: `${S21}#eT`, name: 'loadEdgeMagnetPeekChunk', kind: 'hook', reads: [], host: 'eT: import("./cec084e62-J0y7N9Mv.js"); not sliced (gate off): rejects if called' },
  { key: 'shared-3-IQTrO7Gx.js#Gb', name: 'useLazyEntryState', kind: 'hook', reads: ['handle', 'load', 'enabled'], host: 'Gb(handle, load, enabled).state: the lazy-entry load state; host loads no lazy official chunk here: "idle" while disabled (the only case the host reaches)' },
  // ---- glass layer telemetry (Kz / Hz / Vz): the official desktop_sidebar_material{,_arm,_reason} tags go to the Datadog
  // RUM global context (shared-92 zu / Bu over tt = datadogRum) and the crash-report tag map (shared-0 nj / rj, ZA). The host
  // sends no telemetry and has no crash reporter: gap (the calls do nothing).
  { key: 'shared-92-BOgyxePb.js#zu', name: 'setRumGlobalContext', kind: 'hook', reads: ['key', 'value'], host: 'zu: datadogRum.setGlobalContextProperty (or the pre-init map); host sends no telemetry: gap' },
  { key: 'shared-92-BOgyxePb.js#Bu', name: 'removeRumGlobalContext', kind: 'hook', reads: ['key'], host: 'Bu: datadogRum.removeGlobalContextProperty; host sends no telemetry: gap' },
  { key: 'shared-0-CnnWnVrT.js#nj', name: 'setCrashReportTag', kind: 'hook', reads: ['key', 'value'], host: 'nj: ZA.set + fj (crash reporter tags); host has no crash reporter: gap' },
  { key: 'shared-0-CnnWnVrT.js#rj', name: 'removeCrashReportTag', kind: 'hook', reads: ['key'], host: 'rj: ZA.delete + pj; host has no crash reporter: gap' },
  // ---- GrowthBook (the host has no GrowthBook client: app/src/host-growthbook.mjs HOST_GROWTHBOOK is the one answer table)
  { key: 'shared-25-D-aF0gt9.js#go', name: 'useGrowthBookFeature', kind: 'hook', reads: ['flag key'], host: 'HOST_GROWTHBOOK: listed flag -> { value, on }, unlisted -> { value: null, on: false } (D29/D31); replaces the vendor-flags Vt context copy' },
  { key: 'shared-0-CnnWnVrT.js#Ku', name: 'growthBookValue', kind: 'hook', reads: ['flag key', 'fallback'], host: 'HOST_GROWTHBOOK listed value, else the official no-client fallback argument (ju() null in the 3P desktop)' },
  // ---- i18n and CDS links
  { key: 'vendor-intl-BJgYK7RA.js#q', name: 'useIntl', kind: 'hook', reads: ['formatMessage'], host: 'host i18n (react-intl compatible useIntl over the zh-CN catalog; source-code-start-adapters.jsx useStartIntl pattern)' },
  // sidebar-body (surfaces-prod-2): shared-21 Cj (the nav fallback, now sliced) renders react-intl FormattedMessage (Gt).
  { key: 'vendor-intl-BJgYK7RA.js#Gt', name: 'FormattedMessage', kind: 'component', reads: ['defaultMessage', 'id', 'values'], host: 'host i18n FormattedMessage (source-code-start-adapters.jsx StartMessage over the same catalog as useIntl)' },
];

export function localAdapters(pins) {
  return {
    [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
    [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
    [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
    ...Object.fromEntries(boundaries.map(b => [b.key, { name: b.name, features: [pins.boundaries[b.key].head] }])),
  };
}
export function sliceConfig(pins) {
  return {
    name: 'frame-sidebar 4.16336.0', generator: 'extract-frame-sidebar-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../frame-sidebar-adapter.mjs', adapterFile: 'src/frame-sidebar-adapter.mjs',
    adapters: {}, localAdapters: localAdapters(pins), sharedGraph: 'cds-core', modules,
    // D1 (analysis/.../d1): shared-183 HW / UW (the per-document "menu pending" hold, a WeakMap counter that shared-8 JI takes
    // while the sliced ZA drag claims Escape) is stateful and already sliced by files-changes-v4 (menu-pending.mjs, which
    // reads it as menuPending): linked, one instance, not cut again (sidebar-body lane, surfaces-prod-2).
    linkedAreas: [{ area: 'files-changes-v4', modules: ['menu-pending.mjs'] }],
  };
}

export async function readPins() { return JSON.parse(await fs.readFile(pinsPath, 'utf8')); }

export async function preflight(pins) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('pins are for another snapshot');
  for (const m of modules) {
    const want = pins.sources[m.source];
    if (!want) throw Error(`${m.source} is not pinned`);
    if (sha(await fs.readFile(path.join(official.ionSource, m.source))) !== want) throw Error(`${m.source} drifted from the pins`);
  }
  if (Object.keys(pins.sources).length !== modules.length) throw Error('pins list a chunk the generator no longer slices');
  const cache = new Map();
  const check = async (file, local, want, label, features) => {
    const src = await readSource(file, cache, official.ionSource), e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${label}: ${file}#${local} is not a declaration`);
    if (sha(src.code.slice(e.node.start, e.node.end)) !== want) throw Error(`${label}: ${file}#${local} declaration drifted`);
    if (features) assertFeatures(label, await featureText(src, e), features);
  };
  for (const r of roots) {
    const p = pins.roots[r.semantic];
    if (!p || p.file !== r.file || p.local !== r.local) throw Error(`root ${r.semantic} differs from the pins`);
    await check(r.file, r.local, p.declarationSha256, `root ${r.semantic}`, r.features);
  }
  if (Object.keys(pins.roots).length !== roots.length) throw Error('pins list a root the generator no longer has');
  for (const b of boundaries) {
    const p = pins.boundaries[b.key];
    if (!p || p.name !== b.name || p.kind !== b.kind) throw Error(`boundary ${b.key} differs from the pins`);
    const [f, l] = b.key.split('#'); await check(f, l, p.declarationSha256, `boundary ${b.name}`);
  }
  if (Object.keys(pins.boundaries).length !== boundaries.length) throw Error('pins list a boundary the generator no longer has');
  // the finalized cds-core (wave 4 apply, cds-integrate/wave4/wave4-merged.json): this surface links its publicNames only.
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('src/generated/cds-core/manifest.json differs from pins.cdsCore (cds-core changed: re-run and re-pin after review)');
  if (sha(await fs.readFile(cdsCoreAdapterPath)) !== pins.cdsCore.adapterSha256) throw Error('src/cds-core-adapter.mjs differs from pins.cdsCore');
}

// The host adapter: framework identity (one React, the host's) and one dispatch export per boundary. Host capabilities come
// from installFrameSidebarHost(table); a missing one throws.
export function adapterSource() {
  const lines = [
    '// Generated by scripts/extract-frame-sidebar-v4.mjs from its boundaries; edit those, never this file.',
    '// Framework identity: the host React / JSX runtime / ReactDOM (one instance, shared with cds-core-adapter.mjs).',
    "import * as React from 'react';", "import * as JSX from 'react/jsx-runtime';", "import * as ReactDOM from 'react-dom';",
    'export function loadHostReact() { return React; }', 'export const hostJsxRuntime = JSX;', 'export const hostReactDom = ReactDOM;',
    'let host = null;',
    'export function installFrameSidebarHost(table) { host = table; }',
    'export function frameSidebarHost() { return host; }',
    'function cap(name) {',
    '  if (!host || !Object.hasOwn(host, name)) throw Error(`frame-sidebar host capability ${name} is not provided (scripts/extract-frame-sidebar-v4.mjs boundaries)`);',
    '  return host[name];',
    '}',
  ];
  for (const b of boundaries) {
    const where = `${b.key} (${b.kind})`, n = JSON.stringify(b.name);
    if (b.kind === 'component')
      lines.push(`export function ${b.name}(props) { return React.createElement(cap(${n}), props); } // ${where}`);
    else if (b.kind === 'store')
      lines.push(`export const ${b.name} = Object.assign((...args) => cap(${n})(...args), { getState: () => cap(${n}).getState(), setState: (...a) => cap(${n}).setState(...a), subscribe: (...a) => cap(${n}).subscribe(...a) }); // ${where}`);
    else if (b.kind === 'bridge')
      lines.push(`export const ${b.name} = Object.freeze({ ${b.reads.map(m => `get ${m}() { return cap(${n})[${JSON.stringify(m)}]; }`).join(', ')} }); // ${where}`);
    else if (b.kind === 'constant')
      lines.push(`export const ${b.name} = ${JSON.stringify(b.value)}; // ${where}: the host's fixed answer (boundary value)`);
    else if (b.kind === 'hook' || b.kind === 'effect' || b.kind === 'render')
      lines.push(`export function ${b.name}(...args) { return cap(${n})(...args); } // ${where}`);
    else throw Error(`boundary ${b.name}: unknown kind ${b.kind}`);
  }
  return lines.join('\n') + '\n';
}

export async function pinInit() {
  if (await fs.stat(pinsPath).catch(() => null)) throw Error(`${pinsPath} exists; review and delete it by hand to re-pin`);
  const cache = new Map(), oldCache = new Map();
  const decl = async (dir, c, f, local) => {
    const src = await readSource(f, c, dir); const e = src.top.get(local);
    if (!e || e.kind === 'import') throw Error(`${f}#${local} is not a declaration`);
    const exportAlias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    return { sha256: sha(src.code.slice(e.node.start, e.node.end)), exportAlias, head: (await featureText(src, e)).split('\n')[0].trim() };
  };
  const pins = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, sources: {}, roots: {}, boundaries: {} };
  for (const m of modules) pins.sources[m.source] = sha(await fs.readFile(path.join(official.ionSource, m.source)));
  for (const r of roots) {
    const d = await decl(official.ionSource, cache, r.file, r.local);
    if (d.exportAlias !== r.export) throw Error(`${r.semantic}: export ${d.exportAlias}, expected ${r.export}`);
    pins.roots[r.semantic] = { file: r.file, local: r.local, export: r.export, declarationSha256: d.sha256, features: r.features };
    if (r.old) {
      const o = await decl(official.previousIonSource, oldCache, r.old.file, r.old.local);
      if (o.exportAlias !== r.old.export) throw Error(`${r.semantic} old: export ${o.exportAlias}`);
      pins.roots[r.semantic].old = { version: official.previousVersion, ...r.old, declarationSha256: o.sha256, sourceSha256: sha(await fs.readFile(path.join(official.previousIonSource, r.old.file))) };
    }
  }
  for (const b of boundaries) {
    const [f, local] = b.key.split('#');
    const d = await decl(official.ionSource, cache, f, local);
    pins.boundaries[b.key] = { name: b.name, kind: b.kind, export: d.exportAlias, declarationSha256: d.sha256, head: d.head,
      sourceSha256: sha(await fs.readFile(path.join(official.ionSource, f))) };
  }
  pins.cdsCore = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))), adapterSha256: sha(await fs.readFile(cdsCoreAdapterPath)) };
  await fs.writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
  return pins;
}

export async function extractFrameSidebar(options = {}) {
  const pins = await readPins();
  await preflight(pins);
  const adapter = adapterSource();
  if (options.check) { if (await fs.readFile(adapterPath, 'utf8').catch(() => null) !== adapter) throw Error('src/frame-sidebar-adapter.mjs differs from the generator boundaries'); }
  else if (!options.dryRun) await fs.writeFile(adapterPath, adapter);
  return runSlicer({ ...sliceConfig(pins),
    artifacts: async m => ({ 'provenance.json': JSON.stringify({
      referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
      pins: 'scripts/frame-sidebar-v4.pins.json', roots: pins.roots, boundaries: pins.boundaries, cdsCore: pins.cdsCore, adapterSha256: sha(adapter),
      sharedGraphImports: [...new Set(m.modules.flatMap(x => x.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name} <- ${i.via}`)))].sort(),
      heldByCdsCore: Object.fromEntries(m.modules.filter(x => x.heldByViewTabs.length).map(x => [x.target, x.heldByViewTabs.length])),
      initializers: Object.fromEntries(m.modules.filter(x => x.initializers.length).map(x => [x.target, x.initializers])),
    }, null, 2) + '\n' }) }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--pin-init')) { const p = await pinInit(); console.log('pinned', Object.keys(p.sources).length, 'sources', Object.keys(p.roots).length, 'roots', Object.keys(p.boundaries).length, 'boundaries'); }
  else await extractFrameSidebar({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
