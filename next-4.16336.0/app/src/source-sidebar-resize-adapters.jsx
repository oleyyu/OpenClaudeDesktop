// Host answers for the imports scripts/extract-sidebar-resize.mjs maps to this module (cov8-01). The sidebar handle
// itself is the original 3.6556.2 shared-21 Sz over shared-9 bm (src/generated/sidebar-resize; 2.42304.0 shared-21 DF
// over shared-15 Jt); this module only supplies what the official chunks read from the desktop frame store, GrowthBook,
// telemetry, react-intl, the CDS Tooltip and the CDS/Base UI React contexts. Each export names the original binding it
// stands in for (3.6556.2 local, with the 2.42304.0 one in parentheses).
//
// Nothing here re-creates a view-tabs React context: the two context reads (Direction, CDS features) are answered from
// the same host facts the view-tabs consumers are fed from. The React Compiler helpers, tailwind-merge (cdsClassNames)
// and the fizzy-lake part gate are the generated modules' own imports of the view-tabs public names, not answered here.
import { useCallback, useSyncExternalStore } from 'react';
import { SourceTooltip } from './source-tooltip.jsx';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
// The host's width model (the clamp main.jsx persists with), not generated/sidebar-resize/sidebar-width.mjs: that module
// imports this one (its selectors read the store), and a top-level read across the cycle would depend on load order.
import { SIDEBAR_WIDTH, clampSidebarWidth } from './sidebar-width-model.mjs';
import { useIsomorphicLayoutEffect } from './generated/sidebar-resize/layout-effect.mjs';

// ---------------------------------------------------------------- shared-52 q (exported `ah`; old G / `If`): the frame store
// The official store is a module-level zustand store; Sz reads it both as a hook (`Y(selector)`) and statically
// (`Y.getState()`, `Y.subscribe((state, previous) => …)`). The host keeps one module-level store of the same shape for
// the fields Sz and its helpers read, fed from SourceSidebar's props by useSidebarResizeHost, and answers the actions
// with the host callbacks (main.jsx saveWidth / setSidebarCollapsed, which persist to settings).
// Host differences: `collapsed` is the host's effective collapsed state (preference || narrow viewport, the computer-use
// side-panel dock included (main.jsx cuDocked) || no sidebar), which shared-52 l_ (old rh) folds the same way (collapsed ||
// isCuDocked || isNarrowViewport || isRouteDrilldown); there is no route drilldown, composed-artifact sidebar or
// experiment frame here, so those, and the separate isCuDocked / isNarrowViewport flags, stay false.
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
  // when the press starts: Sz drops the tooltip content while resizing, and SourceTooltip only wraps (and refs) a
  // trigger that has content, so the handle reference is gone by the time the press ends.
  setIsResizing(value) {
    setState({ isResizing: value });
    if (value) host.resizingRoot = host.handle?.closest('.dframe-root') ?? host.resizingRoot;
    host.resizingRoot?.toggleAttribute('data-resizing', value);
    if (!value) host.resizingRoot = null;
  },
  // `commitSidebarWidth: (t) => e({ sidebarWidth: Xd(t) })` (Xd = the same 200..420 clamp as the host's), persisted by
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
  // hidden whenever the sidebar is collapsed (3.6556.2 shared-styles `.dframe-root[data-collapsed] .dframe-resize-handle{display:none}`).
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
/** Fb (exported `Cu`; old J_ / `Wl`): the Hide sidebar intent `nn(() => { Nb(e) })`, where Nb toggles the store and reports
 *  `claudeai.desktop.sidebar.state_set` with the given source. The toggle is kept; the telemetry is not migrated (D17). */
export function useHideSidebarIntent(_source) {
  return useCallback(() => { state.toggleCollapsed(); }, []);
}
/** fb (exported `Iu`; old w_ / `iu`): `En("__gb__3775304746", !0) !== !1`, a GrowthBook gate that defaults on; there is no
 *  GrowthBook here, so the default holds (the drag hides the sidebar below half the minimum width). */
export function sidebarCanHide() {
  return true;
}
/** Pb (exported `Ql`; old q_ / `xl`): reports `claudeai.desktop.sidebar.state_set` / `home.sidebar.toggle` when the collapsed state
 *  changed and returns whether it reported. Telemetry is not migrated (D17): nothing is sent, so it returns false. */
export function reportSidebarStateSet(_wasCollapsed, _source) {
  return false;
}

// ---------------------------------------------------------------- vendor-intl p: react-intl useIntl
/** Messages resolve through the local catalog (electron/i18n, zh-CN sidebar.mjs has Resize sidebar / Drag to resize). */
export const useIntl = useStartIntl;

// ---------------------------------------------------------------- vendor-frame un (exported `Ia`; old Td / `Wn`): useDirection
// `F(ln)?.direction ?? "ltr"` reads Base UI's DirectionContext. The host provides that context only around the view
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
/** Xm (exported `Kl`; old Zp / `Oc`): the CDS Tooltip. Sz passes side (already physical), trackCursorAxis "y", hoverable false,
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
/** er (exported `hf`; old vr / `Uu`): `$n(Qn(), e)`, whether the space-separated CDS features string of the CDS
 *  features context (set by the CDS Root) names `e`. This host mounts no CDS Root and no module provides that context
 *  (view-tabs exports it, nothing renders its provider), so the original returns false for every name here; bm's
 *  `xe("panels")` is false and it keeps the pill styles (vm), not the panels line (ym). When a host provider of the
 *  context appears, this must read it instead. */
export function useCdsFeature(_name) {
  return false;
}

// ---------------------------------------------------------------- the Changes pane's Changed files column (W12 diff-main)
// generated/sidebar-resize/diff-tree-column.mjs (c219730b0 Sn) and diff-tree-resize-handle.mjs (c44d00c7f Ir / Lr / Rr)
// render the same ResizeHandle as the sidebar; these answer their host reads.
/** c44d00c7f `M` (shared-frame Kl, the CDS Tooltip) for Ir: side, trackCursorAxis "y", hoverable false, content (the
 *  actionLabel "Hide files" / "Show files", undefined while resizing), shortcut and detail "Drag to resize". The plain
 *  SourceTooltip: SidebarResizeTooltip would also register the column handle as the sidebar's handle. */
export function DiffTreeResizeTooltip(props) {
  return <SourceTooltip {...props} />;
}
/** c219730b0 un: `!S("__gb__91451196")`, whether the column can be hidden by dragging it closed (and shown from the
 *  edge). Answered from the host GrowthBook table; the flag is not listed there, so it is off and the column hides. */
export function diffTreeCanHide() {
  return !hostGrowthBookFlag('__gb__91451196');
}
/** c219730b0 gn: the column on the right, only while `S("__gb__2446046106")` is on (then the "epitaxy-nifty-pudding"
 *  preference, "auto" following the Rt context). The flag is not in the host GrowthBook table (a test pins that), so gn
 *  answers false and the column stays on the left (inline-start); the host stores no side preference. */
export function useDiffTreeOnRight() {
  return false;
}
