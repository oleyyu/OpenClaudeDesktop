// Host of the frame-sidebar surface on Claude Desktop 4.16336.0 (productionPlan step 3 of
// analysis/claude-4.16336.0-migrate-20261104/surface-pilots/frame-sidebar/report.json).
//
// The official frame is sliced, not written here: generated/frame-sidebar DesktopFrame (shared-22 vB, the .dframe-root),
// its DesktopSidebar (KR, the aside) and SidebarCollapsedTrigger (shared-21 fO). Every declaration the slice stops at is a
// named boundary of scripts/extract-frame-sidebar-v4.mjs, dispatched through the generated src/frame-sidebar-adapter.mjs to
// the capability table below (installFrameSidebarHost). This module only answers those boundaries from main.jsx's own
// state (FrameSidebarHost `value`); a capability left out of the table throws where the official code reaches it.
//
// Three kinds of answers, each named in HOST_ANSWERS (the report lists them):
//   host   the host region or host state that plays the official part (the sidebar body, history nav, error boundary,
//          announcer; WindowState from main.jsx's fullScreen / zoomFactor; the
//          account (main.jsx accountFooter) and its menu, the mode switch's press and navigation, the settings opener);
//   gate   a fixed answer of an official gate on this desktop (report gatedBranchDecisions);
//   gap    an official service the host does not have: the slot renders nothing / the effect does nothing. These are not
//          stand-ins for host features; each is the absent-service case and is listed as a difference.
// Unreachable slots under the gates are deliberately absent, so reaching one throws: KR's wordmark row (ClaudeLogo,
// RouterLink, SidebarModeWordmark, SidebarNewChatButton, trackSidebarLogoClick: drawn only when !isClaudeApp or with the
// wordmark-row collapse), SidebarChromeBarCluster (chrome-bar switcher off), SidebarModeSwitchRow (the titlebar switcher is
// on), SidebarSearchButton (KR's classicSearchRow nj() is always true: Search is a row of
// the nav body), SidebarChatPromo (web chat only), FrameChromeBar (Windows / Linux only), DiscoveryUpsellCards (x_ shows
// them only for a Code discovery upsell: useCodeModeAvailability answers none) and OrganizationAvatar (QF draws it only in
// organization settings).
//
// sidebar-body lane (surfaces-prod-2): the collapse button (shared-21 cj), the nav error fallback (Cj), the resize handle
// (ZA), the mode switch (x_), the account tray (shared-22 QL with shared-19 QF) and the collapsed edge strip (rT) are sliced
// now (generated/frame-sidebar); the hand-written stand-ins of cj / Cj and the 3.6556.2 switch / resize / account row
// slots are gone. The nav body (PI) and the dock layer (_B) are still host slots (report.json).
import React, { Component, cloneElement, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { installFrameSidebarHost } from "./frame-sidebar-adapter.mjs";
import { installHostWindowState } from "./host-window-state.mjs";
import { installHostSessionPresets } from "./host-session-presets.mjs";
import { DesktopFrame, SidebarDockRootMarks, SidebarGlassLayer } from "./generated/frame-sidebar/frame.mjs";
import { SidebarCollapsedTrigger } from "./generated/frame-sidebar/frame-chrome.mjs";
import { HOST_GROWTHBOOK, growthBookFlagKey } from "./host-growthbook.mjs";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
// shared-21 _O (SidebarHistoryNav) is sliced by the titlebar lane (scripts/extract-titlebar-v4.mjs), which also answers the
// official history store (BrowserNavigation) from main.jsx's history: this boundary links that slice.
import { SidebarHistoryNav } from "./titlebar-host.jsx";
import { SourceCollapsedChrome } from "./source-titlebar.jsx";
import { keyboardEntry } from "./source-sidebar.jsx";
import { menuTriggerProps } from "./source-menu.jsx";
import { useSurfaceChord } from "./source-app-switch.jsx";
import { createAppSwitchPress, homeNameFor } from "./app-switch-model.mjs";
import { OFFICIAL_ROUTES, hostTabForSection } from "./settings-tab-compat.mjs";
// cds-core wave 8 (W8-M4): the official frame store shared-92 Y (qg) is held by cds-core; the sliced nav body
// (generated/frame-sidebar-nav) links it and reads its frame fields (collapsed 18 reads, …).
import { store_shared92_Y as officialFrameStore, store_shared25_tu as officialPathnameStore } from "./cds-core.mjs";

export const FrameSidebarHostContext = createContext(null);
function useHost() {
  const host = useContext(FrameSidebarHostContext);
  if (!host) throw Error("frame-sidebar: FrameSidebarHost is not mounted above the official frame");
  return host;
}

// ---- the latest host value (event handlers and the store's actions read it) -------------------------------------------
let live = null;

// ---- the frame store: shared-92 Y (official export qg), held by cds-core (store_shared92_Y) -------------------------------
// SB-0 / H11 (round4 wave8b sidebar): the sliced frame (generated/frame-sidebar), the titlebar frame and the nav body all link
// the one official Y; there is no host store any more. main.jsx drives Y through Y's own actions (src/main.jsx "SB-0":
// setCollapsedPref, commitSidebarWidth, setHovering / closePeek / resetTransients, setIsNarrowViewport, setIsCuDocked,
// setSidebarFloor) from its sidebar model and follows the changes the sliced frame makes through Y (cj's toggleCollapsed,
// ZA / rT's commitSidebarWidth / setCollapsedPref) back into its settings. The transients the slices own (isResizing,
// peekSuppressedUntilLeave, overflowMenuOpen, discoveryPreviewFeature, sortMenuOpen) are Y's fields, as officially.
// The host reads Y only in event handlers and answers (getState); the root marks that subscribed it are the sliced hB now.

// ---- WindowState (shared-0 uO = globalThis["claude.web"].WindowState, read by shared-11 pn useWindowChrome) -----------
// Review P1: the host has no claude.web global. pn's four calls are answered from main.jsx's fullScreen / zoomFactor, which
// main.jsx keeps from the preload boot and its onEvent kinds window / zoom-factor.
const windowListeners = { fullScreen: new Set(), zoomFactor: new Set() };
let windowSeen = { fullScreen: undefined, zoomFactor: undefined };
const windowState = Object.freeze({
  getFullscreen: () => Promise.resolve(!!live?.fullScreen),
  onFullscreenChanged: (callback) => (windowListeners.fullScreen.add(callback), () => windowListeners.fullScreen.delete(callback)),
  getZoomFactor: () => Promise.resolve(live?.zoomFactor ?? 1),
  onZoomFactorChanged: (callback) => (windowListeners.zoomFactor.add(callback), () => windowListeners.zoomFactor.delete(callback)),
});

// ---- slots --------------------------------------------------------------------------------------------------------------
const renderNothing = () => null;
const renderChildren = ({ children }) => children ?? null;
const noEffect = () => undefined;

// shared-22 _B (FrameSidebarDock, always mounted by vB with the root's ref). Its root marks are the sliced official hB
// (generated/frame-sidebar SidebarDockRootMarks, H12, round-4 wave 8c sidebar lane): data-hovering / data-peeked /
// data-resizing / data-session-dragging from the official stores (cds-core Y, this frame's session-dragging store), the
// data-strip-lined mark (shared-31 nu) and the cursor lock (shared-26 UH over cds-core BH). _B's glass layer
// `o(Yz, { rootRef: t, docked: n })` is sliced too (generated/frame-sidebar SidebarGlassLayer: shared-22 Yz → Kz / vz over the
// preload's claude.windowVibrancy bridge). Both are mounted here as _B mounts them. _B's platform layers (gm / dm, Gp, gB, Id,
// D_, nc, bv, Cv, Mu and the rest) are a later slice (gap).
// The host adds only its own marks on the same element (review P2): the `desktop-app` class (style.css
// `.desktop-app.dframe-root`, source-split-view.css) and main.jsx's rootAttributes (data-frame-mode). CdsRoot rewrites the
// root's class when its merged class changes, so the class is re-added by an observer.
// (was FrameRootMarks: a host stand-in of hB writing data-hovering / data-peeked / data-resizing from Y.)
function FrameSidebarDock({ rootRef, sidebarDocked }) {
  return <><SidebarDockRootMarks rootRef={rootRef} /><HostRootMarks rootRef={rootRef} /><SidebarGlassLayer rootRef={rootRef} docked={sidebarDocked} /></>;
}
function HostRootMarks({ rootRef }) {
  const host = useHost();
  // vB's root is _B's parent, so its ref is attached after _B's layout effects on mount (React attaches refs in the
  // layout pass, children first): the mount-time marks go in on the passive effect (the GUI smoke caught the class
  // missing), later renders in the layout effect below.
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;
    const apply = () => { if (!root.classList.contains("desktop-app")) root.classList.add("desktop-app"); };
    apply();
    markRoot(root, live?.rootAttributes);
    const Observer = root.ownerDocument.defaultView?.MutationObserver;
    const observer = Observer ? new Observer(apply) : null;
    observer?.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time marks; the layout effect keeps them current
  }, [rootRef]);
  useLayoutEffect(() => {
    const root = rootRef?.current;
    if (root) markRoot(root, host.rootAttributes);
  });
  return null;
}
function markRoot(root, rootAttributes) {
  for (const [name, value] of Object.entries(rootAttributes ?? {})) {
    if (value === undefined || value === null || value === false) root.removeAttribute(name);
    else root.setAttribute(name, value === true ? "" : String(value));
  }
}

// shared-26 Ds (the FrameSidebarNav ErrorBoundary): renders its children, and on a render error `fallback(error, reset)`.
// The host boundary reports nothing (session metadata can carry user content), as SourceSidebarBoundary.
class FrameNavBoundary extends Component {
  state = { error: null, resetCount: 0 };
  static getDerivedStateFromError(error) { return { error }; }
  reset = () => this.setState((state) => ({ error: null, resetCount: state.resetCount + 1 }));
  render() {
    const { error, resetCount } = this.state;
    if (error) return typeof this.props.fallback === "function" ? this.props.fallback(error, this.reset) : this.props.fallback ?? null;
    return <React.Fragment key={resetCount}>{this.props.children}</React.Fragment>;
  }
}
// shared-21 yO, the collapsed chrome cluster, with the sliced 4.16336.0 compact trigger fO as its button.
function CollapsedChrome({ withNavButtons, onPointerEnter, onClusterPointerEnter }) {
  const host = useHost();
  return <SourceCollapsedChrome withNavButtons={withNavButtons} historyAt={host.history.at} historyLength={host.history.length} travel={host.history.travel}
    trafficLightSpacer={host.trafficLightSpacer} navSize="sm" peekOpen={!!onClusterPointerEnter} onPeekEnter={onClusterPointerEnter}
    trigger={<SidebarCollapsedTrigger onPointerEnter={onPointerEnter} />} />;
}
const fromHost = (key) => function HostSlot() { return useHost()[key] ?? null; };
// shared-22 KR (4.16336.0 shared-22-BACJUrcb.js) draws the SidebarNavBody boundary as
// `o(c_, { children: o(PI, { coworkChecklistMounted: _, codeSessionListChrome: u, classicSearchRow: de }) })`: the slot's props
// are PI's. The host navBody is an element (main.jsx's SourceSidebar body column, which takes none of them) or a render
// function of those props (frame-sidebar-nav-body.jsx HostSidebarNavBody, the sliced PI), which receives them unchanged.
function HostNavBody(props) {
  const nav = useHost().navBody;
  return typeof nav === "function" ? nav(props) : nav ?? null;
}

// shared-21 ub / shared-8 ZS: stable toggle callbacks (the official ones are useEventCallback-stable). ZS is YS:
// toggleCollapsed on the frame store (the collapsed trigger fO expands, the sliced ZA's press-without-drag hides).
const toggleBySource = new Map(), sidebarToggleBySource = new Map();
const stable = (map, source, make) => { if (!map.has(source)) map.set(source, make(source)); return map.get(source); };
// shared-140 Km (usePeekHover) over main.jsx's peek; the sliced cj (Hide sidebar with holdPeekOnCollapse) sets
// peekSuppressedUntilLeave so the pointer that pressed it does not reopen the peek until it leaves.
const peekHover = Object.freeze({
  onEnter: (event) => { if (!officialFrameStore.getState().peekSuppressedUntilLeave) live?.peekEnter(event); },
  onLeave: (event) => { officialFrameStore.getState().setPeekSuppressedUntilLeave(false); live?.peekLeave(event); },
});
const inactiveLogo = Object.freeze({ onLogoClick: () => undefined, isBouncingLogoActive: false, bouncingLogoElement: null });

// shared-25 go (useFeatureValue): a flag the host table does not list is not in the payload, `source: "unknownFeature"`,
// which shared-25 jo reads as inPayload false (shared-8 DS: the collapsed edge strip shows unless the flag says off).
const growthBookFeature = (key) => {
  const flag = growthBookFlagKey(key);
  if (!Object.hasOwn(HOST_GROWTHBOOK, flag)) return { value: null, on: false, off: true, source: "unknownFeature" };
  const value = HOST_GROWTHBOOK[flag];
  return { value, on: value === true, off: value !== true, source: "force" };
};
// wave 8d sidebar lane: the shared-25 go boundary is asked by payload key, not by name. Every official caller passes the
// feature through shared-0 yu first (shared-25 ko / jo / Ao / Do / Oo: `go(H(e))`, H = yu: `if(e.startsWith("__gb__"))return
// e.slice(6); … return ((t&4294967295)>>>0).toString()`), and go's own lookup is keyed by that id (shared-25 ho:
// `n.hashedKeys.has(t)`, then io(client, t) → evalFeature(t)). growthBookFlagKey would hash the bare id a second time and
// miss every listed flag (unknownFeature: the presets latch Pu read inPayload false and closed, so Iu was false), so this
// answer turns the id back into the table key `__gb__<id>` before the same lookup.
const growthBookPayloadFeature = (id) => {
  const key = String(id ?? "");
  return growthBookFeature(key.startsWith("__gb__") ? key : `__gb__${key}`);
};

// ---- the mode switch (shared-21 x_, sliced) -----------------------------------------------------------------------------
// The official pressed / pending mode (shared-6 TE over the shared-52 store) is the host press model (app-switch-model.mjs
// createAppSwitchPress, 3.6556.2 uM: drawn at once under flushSync, navigated after a 0ms tick, a refused switch springs
// back); the navigation is main.jsx switchMode (it keeps its `sending` guard). One instance, read by x_ (useSelectedMode)
// and by the ⌥⌘←/→ chord (SidebarGlobalShortcuts below).
let switchState = Object.freeze({ pressed: null, pending: null });
const switchListeners = new Set();
const setSwitch = (patch) => {
  if (Object.entries(patch).every(([key, value]) => Object.is(switchState[key], value))) return;
  switchState = Object.freeze({ ...switchState, ...patch });
  for (const listener of [...switchListeners]) listener();
};
const subscribeSwitch = (listener) => (switchListeners.add(listener), () => switchListeners.delete(listener));
const appSwitchPress = createAppSwitchPress({ setPressed: (pressed) => setSwitch({ pressed }), setPending: (pending) => setSwitch({ pending }) });
const navigateToMode = (mode) => appSwitchPress(mode, (value) => live?.switchMode(value));
function useSelectedMode() {
  const state = useSyncExternalStore(subscribeSwitch, () => switchState, () => switchState);
  const host = useHost();
  return state.pressed ?? state.pending ?? host.mode;
}
function useEnabledModes() {
  const { homeMode } = useHost();
  return useMemo(() => [homeMode, "code"], [homeMode]);
}
// shared-22 zL (SidebarGlobalShortcuts) mounts RL, the ⌥⌘←/→ surface chord: the host binds it with the same press.
function SurfaceChord() {
  const host = useHost();
  const current = useSelectedMode();
  const rtl = globalThis.document?.documentElement?.dir === "rtl";
  useSurfaceChord({ enabled: true, homeMode: host.homeMode, current, rtl, onChord: navigateToMode });
  return null;
}
// shared-25 vu: `vu(e) = yu(nu.subscribe, e)`, `yu(e, t) = e((e, n) => { e.pathname !== n.pathname && t(e.pathname, n.pathname) })`
// over nu = { ...tu, subscribe: Zl(tu) }: listener(pathname, previous) on an official pathname change (x_ closes its discovery
// card on one; the sliced nav's jI counts arrivals with it). tu is the official store cds-core holds (store_shared25_tu); the
// host route is written into it by frame-sidebar-nav-host.jsx publishPath, so the answer subscribes tu itself. Zl's ql.hold
// batching (shared-25 router transaction) is not reached: the host writes tu outside any router transaction.
// (was: a host Set notified with listener() on each main.jsx mode change; the nav's jI subscriber read undefined pathnames.)
const subscribePathname = (listener) =>
  officialPathnameStore.subscribe((state, previous) => { state.pathname !== previous.pathname && listener(state.pathname, previous.pathname); });
const noRoutePrefetch = Object.freeze({ onPointerEnter: () => undefined, onPointerLeave: () => undefined, onPointerDown: () => undefined, onFocus: () => undefined, onBlur: () => undefined });
const noAnalytics = Object.freeze({ track: () => undefined });
const unifiedHomeOff = Object.freeze({ unified: false, detail: undefined });
const codeModeAvailable = Object.freeze({ reason: null, discoveryUpsell: null });
const noUnsupportedCopy = Object.freeze({ title: undefined, description: undefined });

// ---- the account tray (shared-22 QL / shared-19 QF, sliced) -------------------------------------------------------------
// The account is main.jsx's (account-label-model.mjs accountFooter: name, plan, avatar name); QF shows identity · plan.
function useAccount() { return useHost().account; }
function useAccountIdentity() {
  const account = useAccount();
  return useMemo(() => ({ identity: account.name, orgPrimary: account.plan || undefined, orgSecondary: undefined }), [account.name, account.plan]);
}
// The official account record carries `memberships` (an array of organization memberships; shared-25 wV reads
// account.memberships.find(...) whenever an account is present). The local account belongs to no organization: [].
const NO_MEMBERSHIPS = Object.freeze([]);
function useCurrentAccount() {
  const account = useAccount();
  return useMemo(() => ({ account: { display_name: account.name, full_name: account.avatarName, memberships: NO_MEMBERSHIPS }, activeOrganization: null }), [account.name, account.avatarName]);
}
function useAccountAvatar() {
  const account = useAccount();
  return useMemo(() => ({ name: account.avatarName, src: undefined }), [account.avatarName]);
}
// shared-19 BF (the account menu): the trigger QF builds opens main.jsx's account menu (menu kind "account"); its open
// state goes back through onOpenChange (QF: setOverflowMenuOpen and the profile-menu telemetry).
function AccountMenu({ trigger, onOpenChange }) {
  const account = useAccount();
  const open = !!account.menuOpen;
  const seen = useRef(open);
  useEffect(() => {
    if (seen.current === open) return;
    seen.current = open;
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  return cloneElement(trigger, {
    ...menuTriggerProps({ open, onOpen: (entry, event) => account.openMenu(event, entry) }),
    onClick: (event) => account.openMenu(event, keyboardEntry(event)),
  });
}
// shared-183 jg (open the settings dialog at a section): the host page for the official section (settings-tab-compat).
function openHostSettings(section) {
  const target = hostTabForSection(section);
  if (target === null) throw Error(`frame-sidebar: the host has no settings page for ${JSON.stringify(section)}`);
  live?.openSettings(target.anchor ? `${target.tab}#${target.anchor}` : target.tab);
}
const settingsSectionByRoute = Object.freeze(Object.fromEntries(Object.entries(OFFICIAL_ROUTES).map(([section, href]) => [href, section])));
// The official router (shared-25 $u useRouter) is one boundary for the frame and its nav body (reuse): the frame pushes the
// settings routes, the sliced nav body pushes its own pathnames (shared-57 Ok: a Code session row `/epitaxy/${id}`, the
// destination rows, New). Those go back to main.jsx's routes through the nav host (frame-sidebar-nav-host.jsx
// navigateOfficialPathname over officialPathToHostRoute), handed over by frame-sidebar-nav-body.jsx as frameMountResets is.
// (round-4 wave 8c sidebar lane; was: every non-settings pathname threw 'the host has no route', so a session row never opened.)
let officialNavigation = null;
export function provideOfficialNavigation(navigate) { officialNavigation = navigate; }
function routeTo(href) {
  const section = settingsSectionByRoute[String(href).split(/[?#]/)[0]];
  if (section !== undefined) return openHostSettings(section);
  if (officialNavigation?.(String(href)) === true) return;
  throw Error(`frame-sidebar: the host has no route ${JSON.stringify(href)}`);
}
const hostRouter = Object.freeze({
  push: routeTo, replace: routeTo, back: () => live?.history?.travel(-1), forward: () => live?.history?.travel(1),
  refresh: () => undefined, prefetch: () => undefined,
});
const noSettingsPrefetch = Object.freeze({});
const noHubDot = Object.freeze({ show: false, dismiss: () => undefined });
const openFeedbackUnavailable = () => { throw Error("frame-sidebar: the host has no feedback service (useFeedbackAvailable answers false)"); };

// ---- the collapsed edge strip (shared-21 rT, sliced) --------------------------------------------------------------------
// rT draws the 8px edge strip (Xw) while collapsed; its edge-magnet peek (the lazy tT chunk) is behind shared-8 ES
// (__gb__741807810, not served), so the lazy entry stays "waiting" (shared-3 Hb with enabled false) and is never loaded.
const edgeMagnetPeekEntry = Object.freeze({ handle: Object.freeze({ id: "edge-magnet-peek" }) });
const edgeMagnetPeekNotSliced = () => { throw Error("frame-sidebar: the edge-magnet peek chunk is not sliced (shared-8 ES gate off)"); };
function useLazyEntryState(_handle, _load, enabled) {
  if (enabled) edgeMagnetPeekNotSliced();
  return "waiting";
}

// shared-22 bB (vB `useEffect(bB, [])`): the official effect boots the stores the nav body graph holds (shared-8 ky: the local
// session list; shared-123 _x; shared-1 o_). It is sliced by generated/frame-sidebar-nav (root frameMountResets, one holder of
// those stores) and handed over by frame-sidebar-nav-body.jsx, which evaluates the nav body after its host table.
let officialFrameMountResets = null;
export function provideFrameMountResets(effect) { officialFrameMountResets = effect; }
function mountResets() { return officialFrameMountResets?.(); }

// The capability table. Keys are the boundary names of scripts/extract-frame-sidebar-v4.mjs.
export const HOST_ANSWERS = {
  // frame root vB
  FrameSidebarDock: ["host", FrameSidebarDock], // _B: host root marks (hB's part) + the sliced glass layer Yz
  FrameIdleWork: ["gap", renderNothing], // qC: recent-session idle enqueue (RC / Jr official services)
  frameMountResets: ["host", mountResets], // bB: the sliced official bB (frame-sidebar-nav root frameMountResets) boots fd / ai / Bt
  useCdsInterfaceFont: ["host", () => useHost().cdsFont],
  useReducedMotionSync: ["gap", noEffect], // Oh: official reduced-motion store subscription
  useMemoryPressureBridge: ["gap", noEffect], // $T: Ce.onOnEvent memory_pressure (no such preload event)
  useIsSidebarless: ["host", () => useHost().sidebarless],
  useIsFullBleedBody: ["gap", () => false], // zV: no host page claims a full-bleed body
  useIsFocusMode: ["gate", () => false], // sR: no focus mode on the host
  useContentGutterZero: ["host", () => useHost().contentGutterZero],
  useRouteGutter: ["host", () => useHost().routeGutter],
  useCmdArrowHistoryKeys: ["gap", noEffect], // LC: ⌘←/⌘→ via the official Ke bridge; main.jsx owns history keys
  useFindInPage: ["gap", noEffect], // vw: qe.offerFindInPageInPopout bridge absent
  useLinuxTitlebarMenu: ["gate", noEffect], // cw: Linux only
  useIsDesktopApp: ["host", (options) => (options?.platform ? options.platform === live?.platform : true)],
  WindowState: ["host", windowState],
  // sidebar KR
  SidebarNavBody: ["host", HostNavBody],
  SidebarDesktopUpdateLayer: ["gap", renderNothing], // bA: update / restart service
  SidebarModeScope: ["host", renderChildren], // eA: official frame-mode providers; host regions read mode from props
  SidebarCollapsedChrome: ["host", CollapsedChrome],
  SidebarDesktopDialogs: ["gap", renderNothing], // tL QI(): official desktop dialogs; host dialogs are main.jsx's
  useSidebarHotkeys: ["host", noEffect], // HL: row press shortcuts; host rows own them (source-sidebar.jsx)
  SidebarCommandPalette: ["host", renderNothing], // dA: the host palette is SourceSidebar's (SourceSidebarPalette)
  SidebarSetupCardScope: ["host", renderChildren], // cv: setup-card probe verdict provider; host has no setup card
  useWordmarkRowCollapse: ["gate", () => false],
  useTitlebarSwitcher: ["gate", () => true],
  useChromeBarSwitcher: ["gate", () => false],
  useHubSwitcherInTitlebar: ["gate", () => false],
  SidebarToasts: ["gap", renderNothing], // cD: org-switch notices (no organisations)
  SidebarSwitcherExposure: ["gap", renderNothing], // QE (renders null officially): GrowthBook exposure + hub-wordmark telemetry
  useSwitcherHidden: ["gate", () => false],
  SidebarSettingsSync: ["host", renderNothing], // qM: tabs / openBehavior settings sync; host settings are main.jsx's
  SidebarGlobalShortcuts: ["host", SurfaceChord], // zL: RL's ⌥⌘←/→ chord (the rest of the host's shortcuts are main.jsx's)
  SidebarNarrowHeader: ["gap", renderNothing], // JA: phone-sheet header (narrow viewport)
  SidebarHistoryNav: ["host", SidebarHistoryNav], // shared-21 _O itself, sliced (generated/titlebar)
  SidebarCodeSessionsPrefetch: ["gap", renderNothing], // $k: official code sessions service
  SidebarInstallUpsell: ["gap", renderNothing], // WR: install upsells (lazy official chunk)
  SidebarBottomRail: ["gap", renderNothing], // fE: update strip (idle without an updater)
  SidebarErrorBoundary: ["host", FrameNavBoundary],
  useSidebarRowActionKeys: ["host", noEffect], // Wh: host rows own their keys
  TitlebarHipaaBadge: ["gap", renderNothing], // sT: HIPAA org badge
  useSidebarCycleKeys: ["host", noEffect], // Zp: main.jsx session chords
  SidebarDesktopMenus: ["gap", renderNothing], // IR PR(): official native menu sync
  useSidebarSessionsPrefetch: ["gap", noEffect], // sw: official sessions query
  useSidebarRowJumpKeys: ["host", noEffect], // rR: host jump hints (source-sidebar.jsx)
  SidebarDesktopOverlays: ["gap", renderNothing], // XI JI(): official overlays
  useNativeSidebarMenuToggle: ["host", noEffect], // zR: View › Toggle Sidebar is main.jsx's onEvent toggle-sidebar
  SidebarAnnouncer: ["host", fromHost("announcer")],
  useSidebarToggleCommand: ["host", (source) => stable(toggleBySource, source, () => () => live?.toggleSidebar(source))],
  useSidebarRouteSync: ["gap", noEffect], // $S: official route sync
  useFrameMode: ["host", () => useHost().mode],
  SidebarNarrowSheet: ["gap", renderNothing], // zA: phone-sheet controller
  useBouncingLogo: ["gap", () => inactiveLogo], // HE: logo easter egg (the logo row is not drawn on the desktop)
  usePeekHover: ["host", () => peekHover],
  SidebarPeekInertSync: ["gate", renderNothing], // jA: only with the chrome-bar switcher (gate off)
  useHubSwitcherPinned: ["gate", () => false],
  useDesktopNavButtons: ["gate", () => true],
  useSidebarBootPlaceholderReport: ["gap", noEffect], // JT: native boot placeholder report
  useMobileUpsellEnabled: ["gate", () => false],
  // collapsed trigger fO
  useSidebarAttentionIndicator: ["gap", () => false], // lO: update banner / unread counts of the official stores
  runSidebarViewTransition: ["host", (callback) => callback()],
  // fO's toggle: Y's own toggleCollapsed (narrow / docked: the peek; else the stored preference), which main.jsx follows.
  useSidebarToggle: ["host", (source) => stable(sidebarToggleBySource, source, () => () => officialFrameStore.getState().toggleCollapsed())],
  trackSidebarStateSet: ["gap", (collapsedBefore) => collapsedBefore !== !!officialFrameStore.getState().collapsed], // XS: state-set telemetry (none); returns whether it changed
  // mode switch x_
  useHomeMode: ["host", () => useHost().homeMode],
  useCoworkHomeName: ["host", () => homeNameFor("cowork", useStartIntl())], // Xg: "Claude" (D11)
  useUnifiedHomeTooltip: ["gate", () => unifiedHomeOff], // Lg: "Chat and Cowork" needs account / GrowthBook conditions
  useCodeModeAvailability: ["gate", () => codeModeAvailable], // t_: Code is always available locally, no discovery upsell
  useUnsupportedModeCopy: ["gate", () => noUnsupportedCopy], // yb: copy for an unavailable Code (never shown)
  usePrefetchMode: ["gap", () => () => undefined], // EE: official route-chunk prefetch
  useNavigateToMode: ["host", () => navigateToMode],
  useModeHoverRoute: ["gap", () => () => null], // DE: official hover prefetch route
  useSelectedMode: ["host", useSelectedMode],
  useEnabledModes: ["host", useEnabledModes],
  useModeActivityDot: ["gate", () => undefined], // WS: sidebar_tab_activity_dots off (app-switch-model.mjs SIDEBAR_TAB_ACTIVITY_DOTS)
  modeActivityTelemetry: ["gap", () => ({})],
  sidebarStateForTelemetry: ["gap", () => undefined],
  useAnalytics: ["gap", () => noAnalytics],
  trackFeatureOk: ["gap", () => undefined],
  useRoutePrefetchHandlers: ["gap", () => noRoutePrefetch], // vf: the official _f (no prefetch)
  subscribePathname: ["host", subscribePathname],
  // account tray QL / QF
  isWebBuild: ["gate", false], // TC: a constant boundary (the adapter exports `false`); listed for the contract
  useFeedbackHiddenForOrg: ["gate", () => false],
  useFeedbackAvailable: ["gate", () => false], // uJ: no feedback service (tR is web-only anyway)
  useOpenFeedback: ["gap", () => openFeedbackUnavailable],
  useInstallHubDot: ["gate", () => noHubDot],
  useAppsButtonEnabled: ["gate", () => false], // ZL: Get apps and extensions links /downloads, which the host has no page for
  trackDownloadsClick: ["gap", () => undefined],
  trackProfileMenuOpened: ["gap", () => undefined],
  useRouter: ["host", () => hostRouter],
  useClaudeCodeAvailable: ["gate", () => true],
  useSettingsPagePrefetch: ["gap", () => noSettingsPrefetch],
  useSettingsOpensAsDialog: ["host", () => true], // the host's settings are a dialog over the window
  openSettingsPage: ["host", openHostSettings],
  useAccountReady: ["host", () => true],
  AccountMenu: ["host", AccountMenu],
  usePendingInviteCount: ["gate", () => 0], // no organisations
  useAccountIdentity: ["host", useAccountIdentity],
  useLoginProvider: ["gap", () => undefined],
  usePlanTier: ["gap", () => undefined], // eV: read for its side effects only (QF ignores the value)
  useCurrentAccount: ["host", useCurrentAccount],
  useAccountAvatar: ["host", useAccountAvatar],
  useGrowthBookFlagWhen: ["host", (key, when) => (when ? growthBookFeature(key).on : false)],
  // collapsed edge strip rT
  EdgeMagnetPeekEntry: ["gate", edgeMagnetPeekEntry],
  loadEdgeMagnetPeekChunk: ["gate", edgeMagnetPeekNotSliced],
  useLazyEntryState: ["gate", useLazyEntryState],
  useRestartRequired: ["gap", () => false], // mE: no update service
  // glass layer Kz telemetry (desktop_sidebar_material tags): Datadog RUM global context and crash-report tags
  setRumGlobalContext: ["gap", noEffect], // zu: no telemetry on the host
  removeRumGlobalContext: ["gap", noEffect], // Bu
  setCrashReportTag: ["gap", noEffect], // nj: no crash reporter on the host
  removeCrashReportTag: ["gap", noEffect], // rj
  // GrowthBook / i18n
  useGrowthBookFeature: ["host", growthBookPayloadFeature], // shared-25 go: asked by payload key (yu id)
  growthBookValue: ["host", (key, fallback) => { const flag = growthBookFlagKey(key); return Object.hasOwn(HOST_GROWTHBOOK, flag) ? HOST_GROWTHBOOK[flag] : fallback; }],
  useIntl: ["host", () => useStartIntl()],
  FormattedMessage: ["host", StartMessage],
};
installFrameSidebarHost(Object.fromEntries(Object.entries(HOST_ANSWERS).map(([name, [, answer]]) => [name, answer])));
// cds-core wave 8: the same WindowState answer for cds-core's shared-0 uO readers (host-window-state.mjs, one answer).
installHostWindowState(windowState);
// cds-core wave 8d (stage 13, R4-Q1): the same useGrowthBookFeature / useCurrentAccount answers for cds-core's shared-25 go / Z,
// reached by the official session-presets latch shared-39 Pu that cds-core holds (host-session-presets.mjs, one answer each).
installHostSessionPresets({ useGrowthBookFeature: growthBookPayloadFeature, useCurrentAccount });

// main.jsx mounts the frame through this: `value` carries main.jsx's sidebar model, window state and the host regions for
// the slots. WindowState listeners are brought up to date in a layout effect; the frame store is Y (main.jsx drives it).
export function FrameSidebarHost({ value, children }) {
  live = value;
  useLayoutEffect(() => {
    // pM: once the route shows the pending mode the press hands it back.
    if (switchState.pending !== null && switchState.pending === value.mode) setSwitch({ pending: null });
    for (const key of ["fullScreen", "zoomFactor"]) {
      const next = key === "fullScreen" ? !!value.fullScreen : value.zoomFactor ?? 1;
      if (windowSeen[key] !== undefined && windowSeen[key] !== next) for (const listener of [...windowListeners[key]]) listener(next);
      windowSeen[key] = next;
    }
  });
  return <FrameSidebarHostContext.Provider value={value}>{children}</FrameSidebarHostContext.Provider>;
}

// main.jsx's frame root: the official DesktopFrame for the main window (value given), else the legacy host root (session
// popouts, pane windows and the secondary split side keep their own root until vB's sidebarless path is verified there).
export function HostFrameRoot({ value, legacy, children }) {
  if (!value) return <div {...legacy}>{children}</div>;
  return <FrameSidebarHost value={value}><DesktopFrame>{children}</DesktopFrame></FrameSidebarHost>;
}

// The content gutter of the official routes (shared-31 Gd / Xd over shared-21 Fw): the Code page is an epitaxy route (Hd:
// gutter zero); the list pages (Td: /recents /chats /projects /artifacts /scheduled-task …) cede it ("none"); the rest keep it.
export function hostRouteGutter({ mode, section }) {
  return { contentGutterZero: mode === "code", routeGutter: mode !== "code" && ["sessions", "projects", "artifacts", "routines"].includes(section) ? "none" : "kept" };
}
