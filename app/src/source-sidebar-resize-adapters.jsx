// Host answers for the imports scripts/extract-sidebar-resize.mjs maps to this module (cov8-01). The sidebar handle
// itself is the original 2.42304.0 shared-21 DF over shared-15 Jt (src/generated/sidebar-resize); this module only
// supplies what the official chunks read from the desktop frame store, GrowthBook, telemetry, react-intl, the CDS
// Tooltip and the CDS/Base UI React contexts. Each export names the original binding it stands in for.
//
// Nothing here imports src/generated/view-tabs (being rebuilt in round R1) and nothing here re-creates one of its
// React contexts: the two context reads (Direction, CDS features) are answered from the same host facts the view-tabs
// consumers are fed from, and tailwind-merge is not copied (see cdsClassNames).
import { useCallback, useSyncExternalStore } from 'react';
import { SourceTooltip } from './source-tooltip.jsx';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { clsx } from './generated/sidebar-resize/class-names.mjs';
// The host's width model (the clamp main.jsx persists with), not generated/sidebar-resize/sidebar-width.mjs: that module
// imports this one (its selectors read the store), and a top-level read across the cycle would depend on load order.
import { SIDEBAR_WIDTH, clampSidebarWidth } from './sidebar-width-model.mjs';
import { useIsomorphicLayoutEffect } from './generated/sidebar-resize/layout-effect.mjs';

// ---------------------------------------------------------------- shared-52 G (exported `If`): the frame store
// The official store is a module-level zustand store; DF reads it both as a hook (`Y(selector)`) and statically
// (`Y.getState()`, `Y.subscribe((state, previous) => …)`). The host keeps one module-level store of the same shape for
// the fields DF and its helpers read, fed from SourceSidebar's props by useSidebarResizeHost, and answers the actions
// with the host callbacks (main.jsx saveWidth / setSidebarCollapsed, which persist to settings).
// Host differences: `collapsed` is the host's effective collapsed state (preference || narrow viewport || no sidebar),
// which shared-52 rh folds the same way (collapsed || isCuDocked || isNarrowViewport || isRouteDrilldown); there is no
// computer-use dock, route drilldown, composed-artifact sidebar or experiment frame here, so those stay false.
const host = { handle: null, resizingRoot: null, commit: null, collapse: null, setCollapsed: null };
const listeners = new Set();
let state;
function setState(partial) {
  const previous = state;
  if (Object.keys(partial).every(key => Object.is(previous[key], partial[key]))) return;
  state = { ...previous, ...partial };
  for (const listener of [...listeners]) listener(state, previous);
}
state = {
  sidebarWidth: SIDEBAR_WIDTH.DEFAULT,
  isResizing: false,
  collapsed: false,
  isCuDocked: false,
  isNarrowViewport: false,
  isRouteDrilldown: false,
  experimentFrameActive: false,
  // `(t) => e((e) => (e.isResizing === t ? e : { isResizing: t }))`. The frame root mirrors isResizing as
  // [data-resizing] (sidebar-main.js dR); the host root is rendered by main.jsx, so the attribute is set on the
  // .dframe-root that holds the handle (the stylesheet turns the sidebar transition off under it). The root is taken
  // when the press starts: DF drops the tooltip content while resizing, and SourceTooltip only wraps (and refs) a
  // trigger that has content, so the handle reference is gone by the time the press ends.
  setIsResizing(value) {
    setState({ isResizing: value });
    if (value) host.resizingRoot = host.handle?.closest('.dframe-root') ?? host.resizingRoot;
    host.resizingRoot?.toggleAttribute('data-resizing', value);
    if (!value) host.resizingRoot = null;
  },
  // `commitSidebarWidth: (t) => e({ sidebarWidth: Xu(t) })` (Xu = the same 200..420 clamp as the host's), persisted by
  // the host (main.jsx saveWidth: one settings write per commit).
  commitSidebarWidth(width) {
    setState({ sidebarWidth: clampSidebarWidth(width) });
    host.commit?.(width);
  },
  // `setCollapsedPref: (t) => … { collapsed: t, isRouteDrilldown: !1 }`, persisted by the host like ⌘B.
  setCollapsedPref(value) {
    setState({ collapsed: value });
    host.setCollapsed?.(value);
  },
  // toggleCollapsed's expanded branch (`collapsed: !e.isRouteDrilldown && !e.collapsed`); the host's Hide sidebar.
  // The forced-closed branch (narrow viewport -> open/close the peek) cannot be reached from the handle: the handle is
  // hidden whenever the sidebar is collapsed (style.css .sidebar-collapsed .dframe-resize-handle).
  toggleCollapsed() {
    setState({ collapsed: !state.collapsed });
    host.collapse?.();
  },
};
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useSidebarFrameStore(selector) {
  const read = () => selector(state);
  return useSyncExternalStore(subscribe, read, read);
}
useSidebarFrameStore.getState = () => state;
useSidebarFrameStore.setState = setState;
useSidebarFrameStore.subscribe = subscribe;

/** Feeds the store from SourceSidebar: the stored width (main.jsx sidebarWidth), the effective collapsed state and the
 *  callbacks that persist a committed width / collapsed preference and toggle the sidebar (Hide sidebar). */
export function useSidebarResizeHost({ width, collapsed, onCommit, onCollapse, onCollapsedChange }) {
  useIsomorphicLayoutEffect(() => {
    host.commit = onCommit;
    host.collapse = onCollapse;
    host.setCollapsed = onCollapsedChange;
  });
  useIsomorphicLayoutEffect(() => {
    setState({ sidebarWidth: Number.isFinite(width) ? width : SIDEBAR_WIDTH.DEFAULT, collapsed: !!collapsed });
  }, [width, collapsed]);
}

// ---------------------------------------------------------------- shared-8
/** J_ (exported `Wl`): the Hide sidebar intent `Vt(() => { K_(e) })`, where K_ toggles the store and reports
 *  `claudeai.desktop.sidebar.state_set` with the given source. The toggle is kept; the telemetry is not migrated (D17). */
export function useHideSidebarIntent(_source) {
  return useCallback(() => { state.toggleCollapsed(); }, []);
}
/** w_ (exported `iu`): `St("__gb__3775304746", !0) !== !1`, a GrowthBook gate that defaults on; there is no
 *  GrowthBook here, so the default holds (the drag hides the sidebar below half the minimum width). */
export function sidebarCanHide() {
  return true;
}
/** q_ (exported `xl`): reports `claudeai.desktop.sidebar.state_set` / `home.sidebar.toggle` when the collapsed state
 *  changed and returns whether it reported. Telemetry is not migrated (D17): nothing is sent, so it returns false. */
export function reportSidebarStateSet(_wasCollapsed, _source) {
  return false;
}

// ---------------------------------------------------------------- vendor-intl p: react-intl useIntl
/** Messages resolve through the local catalog (electron/i18n, zh-CN sidebar.mjs has Resize sidebar / Drag to resize). */
export const useIntl = useStartIntl;

// ---------------------------------------------------------------- vendor-frame Td (exported `Wn`): useDirection
// `N(wd)?.direction ?? "ltr"` reads Base UI's DirectionContext. The host provides that context only around the view
// tab bar (source-view-tabs.jsx), from the root's dir attribute; the sidebar sits outside it, so the same fact is read
// here directly instead of mounting (or copying) the context.
const directionSnapshot = () => (globalThis.document?.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr');
const serverDirection = () => 'ltr';
function observeDirection(callback) {
  const doc = globalThis.document, Observer = doc?.defaultView?.MutationObserver;
  if (!Observer) return () => {};
  const observer = new Observer(callback);
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['dir'] });
  return () => observer.disconnect();
}
export function useDirection() {
  return useSyncExternalStore(observeDirection, directionSnapshot, serverDirection);
}

// ---------------------------------------------------------------- shared-frame
/** Zp (exported `Oc`): the CDS Tooltip. DF passes side (already physical), trackCursorAxis "y", hoverable false,
 *  content (undefined while resizing, so no tooltip during a drag), shortcut "cmd+b" and detail "Drag to resize";
 *  SourceTooltip takes the same props. Its trigger is the handle, whose .dframe-root the store marks [data-resizing]
 *  (SourceTooltip calls triggerRef only while it has content, i.e. while not resizing). */
export function SidebarResizeTooltip({ triggerRef, children, ...props }) {
  const register = useCallback(node => {
    host.handle = node;
    if (typeof triggerRef === 'function') triggerRef(node);
    else if (triggerRef) triggerRef.current = node;
  }, [triggerRef]);
  return <SourceTooltip {...props} triggerRef={register}>{children}</SourceTooltip>;
}
/** vr (exported `Uu`): `_r(gr(), e)`, whether the space-separated CDS features string of the `hr` context (set by the
 *  CDS Root) names `e`. This host mounts no CDS Root and no module provides `hr` (view-tabs exports it, nothing renders
 *  its provider), so the original returns false for every name here; Jt's `st("panels")` is false and it keeps the
 *  pill styles (Kt), not the panels line (qt). When a host provider of `hr` appears, this must read it instead. */
export function useCdsFeature(_name) {
  return false;
}
/** X (exported `xd`): `Gt(Y(e))`, tailwind-merge over clsx. The one tailwind-merge instance lives in the view-tabs
 *  graph (`cdsClassNames`), which this lane may not import this round, and a second 50 KB copy is not made: this is the
 *  original clsx (vendor-frame ge) without the merge step. Its only caller is Jt's root className with DF's props, whose
 *  utilities do not conflict, so the merge is the identity there; tests/sidebar-resize-current.test.mjs runs the
 *  original tailwind-merge sliced from the reference on that exact input and asserts equality. */
export function cdsClassNames(...values) {
  return clsx(...values);
}
