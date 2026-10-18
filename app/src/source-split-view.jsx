// Split view (Claude Desktop 2.31226.0 shared-23 a1 "dframe-pane-host" / o1 extra panes, p$ / h$ / g$ resizers, c1
// grip, qQ drop overlay, B$ keys, J$ menu; shared-22 uN pane drag / fN drag label; shared-16 Q pane store): the
// window's session area is a CSS grid of up to 5 columns with 2 rows each. The primary pane (column 0, row 0) is
// the window's own <App side={0}>; every extra pane is its own <App side={i}> (transcript, composer, panes, model
// and permission state) that SourceSplitRoot portals into the pane's slot, so all panes share one DOM tree, one
// toast layer and the modal inertness of #root. The grid rules (.dframe-pane-host, .dframe-pane-col, resizers,
// grip, focus ring, drop overlay) come from the loaded reference stylesheet (index.html shared-styles); the local
// rules are in source-split-view.css. splitStore (split-view-store.mjs) is the window's pane state; main.cjs persists
// it per window ("window-layout") and builds View › Split View from it ("split-menu-state").
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { t } from "../electron/i18n/index.mjs";
import { SourceTooltip } from "./source-tooltip";
import { SourceResizeHandle } from "./source-resize-handle.jsx";
import { createSplitViewStore } from "./split-view-store.mjs";
import {
  LEFT_OF_PRIMARY, SESSION_DRAG_TYPE, SPLIT_COMMANDS, SPLIT_CONSTRAINED_QUERY, SPLIT_ROW, clampRowSplit, columnCount, columnTracks, columnWeights,
  dragAlt, dragColumns, dropBadgeBox, dropZone, hasBottom, insertLeftResult, isLeftTarget, maxColumnsFor, minWeight, paneDragHint, paneDrop,
  paneDropLabel, paneEntries, posKey, rowBounds, rowMovable, sessionDropBadge, sessionDropCell, splitShortcut,
} from "./split-view-model.mjs";
// shared-23 D2 / O2 (generated): which split hosts have a separator pointer drag running.
import { markSplitPointerDrag } from "./generated/code-current/split-drag-registry.mjs";
import { rowValueRange, splitDragRtl, splitKeyDelta } from "./split-resizer-keys.mjs";
import "./source-split-view.css";

export { SESSION_DRAG_TYPE };
// The window's session area as a pointer-drag drop target (registered by the primary pane's SourceSplitHost).
let paneDropHost = null;
export const sessionPaneDropHost = () => paneDropHost;
// shared-22 cN / qM: what a ⌘-press never turns into a pane drag, and the movement before it does.
const PANE_DRAG_IGNORED = "a,input,textarea,select,button,[role='button'],[role='separator'],[contenteditable]:not([contenteditable='false']),canvas,.monaco-editor,.cm-editor,.xterm";
const PANE_DRAG_THRESHOLD = 4;
// shared-23 YQ / XQ: the corner handle's per-axis 3px threshold and the 8px after which the move cursor shows.
const CORNER_AXIS_PX = 3, CORNER_CURSOR_PX = 8;
const desktop = () => (typeof window !== "undefined" ? window.desktop : undefined);
const isMac = () => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent || "");
// B27: a session popout (main.cjs openSessionPopout loads ?window=session) shows one session and never splits; nor does
// a pane window (main.cjs openPopout for Tasks, Terminal and Side chat loads ?window=pane&pane=…&popout=<session>).
const windowQuery = typeof window !== "undefined" ? new URLSearchParams(window.location?.search ?? "") : new URLSearchParams();
export const SESSION_POPOUT_WINDOW = windowQuery.get("window") === "session";
// R4i-transcript TR3 (layout-08): the /btw side pane ("session") pops out too (c03935b01 pa; src/popout-restore-btw.mjs).
export const APP_PANE_WINDOW_KINDS = Object.freeze(["tasks", "terminal", "side-chat", "session"]);
export const PANE_WINDOW = windowQuery.get("window") === "pane" && APP_PANE_WINDOW_KINDS.includes(windowQuery.get("pane")) && windowQuery.get("popout")
  ? Object.freeze({ pane: windowQuery.get("pane"), sessionId: windowQuery.get("popout"), cwd: windowQuery.get("cwd") || "" }) : null;
export const splitStore = createSplitViewStore({
  allowSplit: !SESSION_POPOUT_WINDOW && !PANE_WINDOW,
  report: ({ layout, menu }) => {
    const api = desktop();
    if (!api?.call) return;
    if (layout) api.call("window-layout", layout).catch(() => {});
    if (menu) api.call("split-menu-state", menu).catch(() => {});
  },
});
export function useSplitView(store = splitStore) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
// What a pane's App reads from the split: whether it is split, the focused pane and every pane's session. Weights,
// the row split and titles stay out of it, so resizing never re-renders an App.
const sidesKey = (state) => `${state.open ? 1 : 0}|${state.active}|${state.sides.map((side) => side.current ?? "").join(",")}`;
export function useSplitSides(store = splitStore) {
  const read = () => sidesKey(store.getState());
  useSyncExternalStore(store.subscribe, read, read);
  return store.getState();
}
/** Inside a pane that is not focused while split (main.jsx and pane key handlers stand down there). */
export function inInactiveSplitSide(node) {
  return !!node?.closest?.("[data-split-inactive]");
}

// splitShortcut (split-view-model.mjs): the official B$ chords, matched in this window's keydown first.
export { splitShortcut };

/** The window's Apps: the primary pane always, every extra pane (portaled into its slot) once its slot exists. */
export function SourceSplitRoot({ renderSide, store = splitStore }) {
  // Re-rendered only when a pane mounts, unmounts, moves index or gets a new slot.
  const portalKey = () => { const state = store.getState(); return `${state.slotVersion}|${state.panes.map((pane) => pane.key).join(",")}`; };
  useSyncExternalStore(store.subscribe, portalKey, portalKey);
  const split = store.getState();
  useEffect(() => {
    const api = desktop();
    const unsubscribe = api?.onEvent?.((event) => {
      if (event?.kind === "split-view" && SPLIT_COMMANDS.includes(event.command)) store.command(event.command);
    });
    // B$: a chord is taken only when it does something (no pane to focus, no room for a new one: left alone).
    const key = (event) => {
      const command = splitShortcut(event);
      if (!command || document.getElementById("root")?.inert === true) return;
      if (store.command(command)) event.preventDefault();
    };
    const flush = () => store.flushReport();
    // u1: a window ≤ 700px parks the extra panes and brings them back when it widens.
    const query = typeof window.matchMedia === "function" ? window.matchMedia(SPLIT_CONSTRAINED_QUERY) : null;
    const constrain = () => store.setConstrained(!!query?.matches);
    constrain();
    query?.addEventListener?.("change", constrain);
    store.reportNow();
    window.addEventListener("keydown", key);
    window.addEventListener("pagehide", flush);
    return () => {
      unsubscribe?.(); query?.removeEventListener?.("change", constrain);
      window.removeEventListener("keydown", key); window.removeEventListener("pagehide", flush);
    };
  }, [store]);
  return <>
    {renderSide(0, null)}
    {split.panes.map((pane, at) => {
      const slot = store.slotFor(pane.key);
      return slot ? createPortal(renderSide(at + 1, { sessionId: pane.initial, nonce: pane.key }), slot, `pane-${pane.key}`) : null;
    })}
  </>;
}

// The live value of a host CSS variable (a drag writes it before the store commits).
const hostVar = (host, name, fallback) => { const value = parseFloat(getComputedStyle(host).getPropertyValue(name)); return Number.isFinite(value) ? value : fallback; };
// Escape (shared-1 Mi) ends a resize without committing it.
function onEscape(run, signal) {
  const key = (event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); run(); } };
  document.addEventListener("keydown", key, { capture: true, signal });
}

/** p$ (2.42304.0 j2): the column boundary after `colIndex`; ⌥ while dragging resizes the column around it symmetrically.
 * A drag registers with the host (markSplitPointerDrag, keyed by the wrapper) from its start to its end, reads the
 * direction once (RTL mirrors the pointer and arrow deltas), and Home / End jump the boundary to either end. */
function ColumnResizer({ colIndex, weights, hostRef, store, tracks }) {
  const drag = useRef(null), wrapper = useRef(null), rtl = useRef(false);
  const end = () => { drag.current?.abort.abort(); };
  useEffect(() => end, []);
  const start = () => {
    const host = hostRef.current;
    if (!host) return;
    markSplitPointerDrag(host, wrapper, true);
    rtl.current = splitDragRtl(host);
    end();
    const width = Math.max(1, host.getBoundingClientRect().width), base = weights.slice(), total = base.reduce((sum, value) => sum + value, 0);
    const state = { alt: false, baseWeights: base, baseDelta: 0, lastDelta: 0, live: base.slice() };
    const abort = new AbortController(), signal = abort.signal;
    const alt = (event) => dragAlt(state, event.altKey);
    for (const type of ["mousemove", "keydown", "keyup"]) document.addEventListener(type, alt, { signal });
    drag.current = { state, scale: total / width, min: minWeight(width, total), cancelled: false, abort, base };
    onEscape(() => { if (drag.current) { drag.current.cancelled = true; host.style.setProperty("--df-col-tracks", tracks); } }, signal);
  };
  const resize = (delta) => {
    const host = hostRef.current, current = drag.current;
    if (!host || !current || current.cancelled) return;
    host.style.setProperty("--df-col-tracks", columnTracks(dragColumns(current.state, colIndex, delta, current.scale, current.min)));
  };
  // j2 `x`: what the handle reports (pointer and arrow keys) is mirrored in RTL; Home / End below are not.
  const handleResize = (delta) => resize(rtl.current ? -delta : delta);
  const finish = (moved) => {
    markSplitPointerDrag(hostRef.current, wrapper, false);
    const current = drag.current;
    drag.current = null;
    current?.abort.abort();
    const live = current?.state.live;
    if (moved && current && !current.cancelled && live.some((value, at) => value !== current.base[at])) { store.setColWeights(live); return; }
    hostRef.current?.style.setProperty("--df-col-tracks", tracks);
  };
  // j2 `w`: Home / End (no ⌘ ⌃ ⌥, no pointer drag on this host) move the boundary by the host's whole width.
  const keyDown = (event) => {
    const host = hostRef.current, sign = splitKeyDelta(event, host);
    if (sign === 0) return;
    event.preventDefault();
    start();
    resize(sign * host.getBoundingClientRect().width);
    finish(true);
  };
  const pair = weights[colIndex] + weights[colIndex + 1];
  return <div ref={wrapper} className="dframe-pane-resize-col">
    <SourceResizeHandle orientation="vertical" onResizeStart={start} onResize={handleResize} onResizeEnd={finish}
      onDoubleClick={() => store.setColWeights(weights.map(() => 1))} onKeyDown={keyDown}
      aria-label={t("Resize pane columns")} aria-valuenow={Math.round((100 * weights[colIndex]) / pair)} />
  </div>;
}

/** h$ (2.42304.0 N2): the row boundary of a column with a bottom pane (disabled while the host is too short to move it).
 * A drag registers with the host from its start to its end; Home / End jump the movable boundary to either end. */
function RowResizer({ hostRef, store, rowSplit, height }) {
  const drag = useRef(null), wrapper = useRef(null);
  useEffect(() => () => drag.current?.abort.abort(), []);
  const value = height === 0 ? rowSplit : clampRowSplit(rowSplit, height), movable = height === 0 || rowMovable(height, value);
  const range = height === 0 ? undefined : rowValueRange(height, movable);
  const start = () => {
    const host = hostRef.current;
    if (!host) return;
    markSplitPointerDrag(host, wrapper, true);
    drag.current?.abort.abort();
    const box = Math.max(1, host.getBoundingClientRect().height), from = hostVar(host, "--df-pane-row", SPLIT_ROW.DEFAULT);
    const abort = new AbortController();
    drag.current = { height: box, bounds: rowBounds(box), from, live: from, cancelled: false, abort };
    onEscape(() => { if (drag.current) { drag.current.cancelled = true; host.style.setProperty("--df-pane-row", String(from)); } }, abort.signal);
  };
  const resize = (delta) => {
    const host = hostRef.current, current = drag.current;
    if (!host || !current || current.cancelled) return;
    current.live = Math.min(current.bounds.max, Math.max(current.bounds.min, current.from + delta / current.height));
    host.style.setProperty("--df-pane-row", String(current.live));
  };
  const finish = (moved) => {
    markSplitPointerDrag(hostRef.current, wrapper, false);
    const current = drag.current;
    drag.current = null;
    current?.abort.abort();
    if (moved && current && !current.cancelled && current.live !== current.from) store.setRowSplit(current.live);
    else hostRef.current?.style.setProperty("--df-pane-row", String(value));
  };
  // N2 `C`: Home / End (a movable row, no ⌘ ⌃ ⌥, no pointer drag on this host) move the boundary by the host's height.
  const keyDown = (event) => {
    const host = hostRef.current, sign = movable ? splitKeyDelta(event, host) : 0;
    if (sign === 0) return;
    event.preventDefault();
    start();
    resize(sign * host.getBoundingClientRect().height);
    finish(true);
  };
  return <div ref={wrapper} className="dframe-pane-resize-row" style={movable ? undefined : { pointerEvents: "none" }}>
    <SourceResizeHandle orientation="horizontal" onResizeStart={start} onResize={resize} onResizeEnd={finish}
      onDoubleClick={() => { hostRef.current?.style.setProperty("--df-pane-row", String(SPLIT_ROW.DEFAULT)); store.setRowSplit(SPLIT_ROW.DEFAULT); }} onKeyDown={keyDown}
      aria-label={t("Resize pane rows")} aria-valuenow={Math.round(100 * value)} aria-valuemin={range?.min} aria-valuemax={range?.max} aria-disabled={!movable || undefined} />
  </div>;
}

/** g$ (2.42304.0 P2): where a column boundary meets a row boundary — one drag resizes both. The drag registers with the
 * host (keyed by its cancel ref) while it runs, and its column part is mirrored in RTL. */
function CornerResizer({ colIndex, weights, hostRef, store, tracks }) {
  const cancel = useRef(null);
  useEffect(() => () => cancel.current?.(), []);
  const mouseDown = (event) => {
    const host = hostRef.current;
    if (event.button !== 0 || !host) return;
    event.preventDefault();
    if (cancel.current) { cancel.current(true); return; }
    const handle = event.currentTarget, rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height), base = weights.slice(), total = base.reduce((sum, value) => sum + value, 0);
    const min = minWeight(width, total), bounds = rowBounds(height), fromRow = hostVar(host, "--df-pane-row", SPLIT_ROW.DEFAULT);
    const x = event.clientX, y = event.clientY, state = { alt: event.altKey, baseWeights: base, baseDelta: 0, lastDelta: 0, live: base };
    const mirror = splitDragRtl(host) ? -1 : 1;
    let row = fromRow, moved = false, movedX = false, movedY = false, cursor = false;
    const abort = new AbortController(), { signal } = abort;
    const move = (next) => {
      const dx = (next.clientX - x) * mirror, dy = next.clientY - y;
      if (Math.abs(dx) > CORNER_AXIS_PX) movedX = true;
      if (Math.abs(dy) > CORNER_AXIS_PX) movedY = true;
      if (movedX || movedY) moved = true;
      if (!cursor && Math.max(Math.abs(dx), Math.abs(dy)) > CORNER_CURSOR_PX) { cursor = true; document.body.style.cursor = "move"; }
      dragAlt(state, next.altKey);
      dragColumns(state, colIndex, movedX ? dx : 0, total / width, min);
      row = movedY ? Math.min(bounds.max, Math.max(bounds.min, fromRow + dy / height)) : fromRow;
      host.style.setProperty("--df-col-tracks", columnTracks(state.live));
      host.style.setProperty("--df-pane-row", String(row));
    };
    const alt = (next) => dragAlt(state, next.altKey);
    const finish = (completed = false) => {
      markSplitPointerDrag(host, cancel, false);
      abort.abort();
      handle.removeAttribute("data-dragging");
      document.body.style.cursor = "";
      cancel.current = null;
      if (completed && moved) {
        if (state.live.some((value, at) => value !== base[at])) store.setColWeights(state.live); else host.style.setProperty("--df-col-tracks", tracks);
        if (row !== fromRow) store.setRowSplit(row); else host.style.setProperty("--df-pane-row", String(fromRow));
        return;
      }
      host.style.setProperty("--df-col-tracks", tracks);
      host.style.setProperty("--df-pane-row", String(fromRow));
    };
    handle.setAttribute("data-dragging", "");
    document.addEventListener("mousemove", move, { signal });
    document.addEventListener("mouseup", () => finish(true), { signal });
    document.addEventListener("keydown", alt, { signal });
    document.addEventListener("keyup", alt, { signal });
    onEscape(() => finish(false), signal);
    cancel.current = finish;
    markSplitPointerDrag(host, cancel, true);
  };
  const reset = () => {
    hostRef.current?.style.setProperty("--df-pane-row", String(SPLIT_ROW.DEFAULT));
    store.setColWeights(weights.map(() => 1));
    store.setRowSplit(SPLIT_ROW.DEFAULT);
  };
  return <div className="dframe-pane-resize-corner" aria-hidden="true" onMouseDown={mouseDown} onDoubleClick={reset} />;
}

/** c1: the grip at a pane's top edge (tooltip "Move") that starts a pane drag without ⌘. */
function PaneGrip({ onGrip }) {
  return <SourceTooltip content={t("Move")} side="bottom">
    <button type="button" aria-hidden="true" tabIndex={-1} className="dframe-pane-grip draggable-none"
      onPointerDown={(event) => onGrip(event.nativeEvent)} onMouseDown={(event) => event.preventDefault()} />
  </SourceTooltip>;
}

/** fN: the dragged pane's title follows the pointer (kept 20px inside the window's height), portaled into the window's
 * .dframe-root (ZM labelRoot) so it draws above the sidebar rather than inside the host's isolated stacking context. */
function PaneDragLabel({ label, pointer, root }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (label === null) return undefined;
    let frame = 0;
    const step = () => {
      const node = ref.current;
      if (node) node.style.transform = `translate(${pointer.x}px, ${Math.max(20, Math.min(pointer.y, window.innerHeight - 20))}px)`;
      frame = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(frame);
  }, [label, pointer]);
  return label === null || !root ? null : createPortal(<div ref={ref} aria-hidden="true" className="dframe-pane-drag-label" style={{ zIndex: 1000 }}><span className="font-medium">{label}</span></div>, root);
}

// r1: a press or focus inside a pane (the portaled App's DOM sits in its slot) makes it the focused pane.
const paneOf = (host, node) => { const pane = node?.closest?.(".dframe-pane"); return pane && pane.parentElement === host ? pane : null; };
const paneIndexOf = (pane) => Number(pane?.getAttribute("data-pane-index") ?? NaN);
const columnRects = (host) => Array.from(host.querySelectorAll(":scope > .dframe-pane-col"), (column) => column.getBoundingClientRect());
// lN: a ⌘-press on a link, field, button, separator, editor or terminal (or one that holds pointer capture) is left alone.
function ignoredPress(event, pane) {
  if (!pane.contains(event.target) || event.defaultPrevented) return true;
  for (const node of event.composedPath?.() ?? []) {
    if (node === pane) break;
    if (node?.matches?.(PANE_DRAG_IGNORED) || node?.hasPointerCapture?.(event.pointerId)) return true;
  }
  return false;
}

/** The workspace area of the primary pane's App: its <main> in the primary pane and, while split, the extra panes'
 * slots, the column and row resizers and the drop overlay. Any other pane renders its children unchanged. */
export function SourceSplitHost({ side = 0, children, store = splitStore }) {
  const split = useSplitView(store);
  const hostRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // The overlay: { kind: "pane", target, above, hint } while a pane is dragged, { kind: "session", cell, hint } while
  // a session row is (shared-22 ZM / shared-19 paneIntent).
  const [drop, setDrop] = useState(null);
  const [dragLabel, setDragLabel] = useState(null);
  const pointer = useRef({ x: 0, y: 0 }).current;
  const slotRefs = useRef(new Map());
  const open = side === 0 && split.open;
  const entries = paneEntries(split), columns = columnCount(entries);
  const weights = columnWeights(split.colWeights, columns, box.width);
  const tracks = columnTracks(weights);
  const rowValue = box.height > 0 ? clampRowSplit(split.rowSplit, box.height) : split.rowSplit;
  const colSplit = Array.from({ length: columns }, (_, col) => hasBottom(entries, col));
  const primaryShown = split.sides[0].current !== null;
  // Stable per pane key, so React calls it only when that pane's slot mounts or unmounts.
  const slotRef = (key) => {
    if (!slotRefs.current.has(key)) slotRefs.current.set(key, (element) => store.setSlot(key, element));
    return slotRefs.current.get(key);
  };
  useEffect(() => {
    const live = new Set(split.panes.map((pane) => pane.key));
    for (const key of [...slotRefs.current.keys()]) if (!live.has(key)) slotRefs.current.delete(key);
  });
  // a1: the host's width sets how many columns fit (one per 360px); its size bounds the weights and the row split.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (side !== 0 || !host || typeof ResizeObserver !== "function") return undefined;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      store.setMaxColumns(maxColumnsFor(rect.width));
      setBox((previous) => previous.width === Math.round(rect.width) && previous.height === Math.round(rect.height) ? previous : { width: Math.round(rect.width), height: Math.round(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [side, store]);
  // A press or focus inside a pane makes it the focused pane (official onPointerDownCapture / onFocusCapture).
  useEffect(() => {
    const host = hostRef.current;
    if (side !== 0 || !host || !open) return undefined;
    const take = (event) => { const pane = paneOf(host, event.target); if (pane) store.focus(paneIndexOf(pane)); };
    host.addEventListener("pointerdown", take, true);
    host.addEventListener("focusin", take);
    return () => { host.removeEventListener("pointerdown", take, true); host.removeEventListener("focusin", take); };
  }, [side, open, store]);
  // V$: ⌘ (⌃ off macOS) held marks the host (the ring and move cursor over a pane after a short hold).
  useEffect(() => {
    const host = hostRef.current;
    if (side !== 0 || !host) return undefined;
    const mac = isMac();
    const update = (event) => host.toggleAttribute("data-cmd-held", mac ? !!event.metaKey : !!event.ctrlKey && !event.getModifierState?.("AltGraph"));
    const clear = () => host.removeAttribute("data-cmd-held");
    window.addEventListener("keydown", update);
    window.addEventListener("keyup", update);
    window.addEventListener("blur", clear);
    host.addEventListener("pointermove", update);
    return () => {
      window.removeEventListener("keydown", update); window.removeEventListener("keyup", update); window.removeEventListener("blur", clear);
      host.removeEventListener("pointermove", update); clear();
    };
  }, [side]);
  // uN: a ⌘-drag inside a pane (or a drag from its grip) moves the pane: past 4px the host is data-pane-dragging, the
  // title follows the pointer, and the cell under it (BM/UM) is outlined with Swap or Move here; with no cell, the
  // pane's first move target is hinted. Escape cancels; the click that ends a drag is swallowed.
  const cancelDrag = useRef(null);
  const startPaneDrag = useCallback((event, grip) => {
    const host = hostRef.current;
    if (!host || event.button !== 0) return;
    const mac = isMac();
    if ((!grip && !mac && event.getModifierState?.("AltGraph")) || !(grip || (mac ? event.metaKey : event.ctrlKey))) return;
    const pane = paneOf(host, event.target);
    if (!pane) return;
    const index = paneIndexOf(pane), state = store.getState();
    if (!state.open || !Number.isInteger(index) || (index === 0 && state.sides[0].current === null) || (!grip && ignoredPress(event, pane))) return;
    cancelDrag.current?.();
    const id = event.pointerId, origin = { x: event.clientX, y: event.clientY };
    let dragging = false, cancelled = false, latest = null, settle;
    const abort = new AbortController(), { signal } = abort;
    const finish = () => {
      abort.abort();
      clearTimeout(settle);
      host.removeAttribute("data-pane-dragging");
      document.body.style.cursor = "";
      setDrop((previous) => (previous?.kind === "pane" ? null : previous));
      setDragLabel(null);
      cancelDrag.current = null;
    };
    const release = () => {
      const moved = dragging, chosen = latest;
      finish();
      if (!moved) return;
      const swallow = (click) => { click.preventDefault(); click.stopPropagation(); };
      document.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", swallow, true), 0);
      if (!cancelled && chosen !== null) store.dropPane(index, chosen);
    };
    document.addEventListener("pointermove", (move) => {
      if (move.pointerId !== id) return;
      if (move.buttons === 0 || settle !== undefined) { if (settle === undefined) settle = setTimeout(release, 200); return; }
      if (cancelled) return;
      pointer.x = move.clientX; pointer.y = move.clientY;
      if (!dragging) {
        if (Math.abs(move.clientX - origin.x) < PANE_DRAG_THRESHOLD && Math.abs(move.clientY - origin.y) < PANE_DRAG_THRESHOLD) return;
        dragging = true;
        const current = store.getState().sides[index];
        // fN: the pane's header title ([data-pane-title]: the session's name, else "Untitled"), "New session" for a draft.
        setDragLabel(current?.title || (current?.current ? t("Untitled") : t("New session")));
        host.setAttribute("data-pane-dragging", String(index));
        document.body.style.cursor = "move";
        document.getSelection()?.removeAllRanges();
      }
      const now = store.getState(), list = paneEntries(now), primary = now.sides[0].current;
      const zone = dropZone(columnRects(host), hostVar(host, "--df-pane-row", SPLIT_ROW.DEFAULT), move.clientX, move.clientY);
      latest = paneDrop({ entries: list, dragIndex: index, max: now.maxColumns, primary, stackZones: true,
        leftOpen: () => index === 0 || (list[index - 1] !== undefined && list[index - 1].id !== null) }, zone);
      const shown = latest ?? paneDragHint(now, index);
      setDrop(shown === null ? null : { kind: "pane", target: shown.target, above: shown.above, hint: latest === null });
    }, { signal });
    document.addEventListener("pointerup", (up) => { if (up.pointerId === id) release(); }, { signal });
    document.addEventListener("pointercancel", (end) => { if (end.pointerId === id) finish(); }, { signal });
    document.addEventListener("keydown", (key) => {
      if (key.key !== "Escape" || key.defaultPrevented || key.isComposing || !dragging || cancelled) return;
      key.preventDefault(); key.stopImmediatePropagation();
      cancelled = true; latest = null;
      setDrop((previous) => (previous?.kind === "pane" ? null : previous));
      setDragLabel(null);
    }, { capture: true, signal });
    document.addEventListener("selectstart", (select) => { if (dragging) select.preventDefault(); }, { capture: true, signal });
    if (!grip) document.getSelection()?.removeAllRanges();
    cancelDrag.current = finish;
  }, [store, pointer]);
  useEffect(() => {
    const host = hostRef.current;
    if (side !== 0 || !host || !open) return undefined;
    const press = (event) => { if (!event.target.closest?.(".dframe-pane-grip")) startPaneDrag(event, false); };
    host.addEventListener("pointerdown", press);
    return () => { host.removeEventListener("pointerdown", press); cancelDrag.current?.(); };
  }, [side, open, startPaneDrag]);
  // A session row carried by the pointer (source-sidebar-drag.jsx, shared-19 xJ / paneIntent): the host says which
  // cell a point targets, outlines it (or hints the default cell) and takes the drop.
  const dropCell = (x, y, drag) => {
    const host = hostRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
    const state = store.getState(), primary = state.sides[0].current;
    const canOpenLeft = !!drag?.id && !drag.draft && primary !== null && drag.id !== primary && insertLeftResult(paneEntries(state), drag.id, primary, state.maxColumns) !== null;
    // xJ reads the rendered row split (--df-pane-row, clamped to the host height), not the stored one.
    return sessionDropCell({ ...state, rowSplit: hostVar(host, "--df-pane-row", state.rowSplit) }, columnRects(host), x, y, { canOpenLeft, drag });
  };
  const dropAt = (id, cell) => {
    if (cell === null) return;
    // shared-19 drop: left of the primary opens there (insertLeftOfPrimary), else the session opens in the default cell.
    if (isLeftTarget(cell)) { if (id && !store.openLeft(id)) store.open(id); return; }
    store.open(id ?? null, { target: cell });
  };
  // Native HTML5 drags carrying a session id (SESSION_DRAG_TYPE) take the same cells.
  useEffect(() => {
    const host = hostRef.current;
    if (side !== 0 || !host) return undefined;
    const carries = (event) => Array.from(event.dataTransfer?.types ?? []).includes(SESSION_DRAG_TYPE);
    const over = (event) => {
      if (!carries(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      const cell = dropCell(event.clientX, event.clientY, null);
      setDrop((previous) => previous?.kind === "session" && (previous.cell === null ? cell === null : cell !== null && posKey(previous.cell) === posKey(cell)) ? previous : { kind: "session", cell });
    };
    const leave = (event) => { if (!host.contains(event.relatedTarget)) setDrop(null); };
    const dropped = (event) => {
      if (!carries(event)) return;
      event.preventDefault();
      const id = event.dataTransfer.getData(SESSION_DRAG_TYPE), cell = dropCell(event.clientX, event.clientY, { id, draft: false });
      setDrop(null);
      if (id) dropAt(id, cell);
    };
    const end = () => setDrop((previous) => (previous?.kind === "session" ? null : previous));
    host.addEventListener("dragenter", over); host.addEventListener("dragover", over);
    host.addEventListener("dragleave", leave); host.addEventListener("drop", dropped);
    window.addEventListener("dragend", end);
    return () => {
      host.removeEventListener("dragenter", over); host.removeEventListener("dragover", over);
      host.removeEventListener("dragleave", leave); host.removeEventListener("drop", dropped);
      window.removeEventListener("dragend", end);
    };
  }, [side, store]);
  useEffect(() => {
    if (side !== 0) return undefined;
    const handle = {
      /** The target under (x, y) for the dragged row ({ id, draft }): { key, pos } or null. */
      at(x, y, drag = null) { const cell = dropCell(x, y, drag); return cell === null ? null : { key: posKey(cell), pos: cell }; },
      open: () => store.getState().open,
      /** While a row that can split is dragged: the target's cell, or the default cell dimmed (null), or no badge
       * (`tearOff`, the row is leaving the window). */
      show(target, { tearOff = false } = {}) {
        const next = { kind: "session", cell: target?.pos ?? null, tearOff };
        setDrop((previous) => previous?.kind === "pane" ? previous
          : previous?.kind === "session" && previous.tearOff === tearOff && (previous.cell === null ? next.cell === null : next.cell !== null && posKey(previous.cell) === posKey(next.cell)) ? previous : next);
      },
      clear() { setDrop((previous) => (previous?.kind === "session" ? null : previous)); },
      drop(id, target) {
        setDrop((previous) => (previous?.kind === "session" ? null : previous));
        if (!target?.pos) return;
        if (isLeftTarget(target.pos) && !id) return;
        dropAt(id, target.pos);
      },
    };
    paneDropHost = handle;
    return () => { if (paneDropHost === handle) paneDropHost = null; };
  }, [side, store]);
  if (side !== 0) return children;
  const paneProps = (index, pos, extra) => ({
    id: `split-pane-${index}`,
    // a1 / o1: every pane is a named region (the primary one too while unsplit); only the focus is split-only.
    role: "region",
    "aria-label": index === 0 ? t("Primary pane") : t("Secondary pane"),
    "aria-current": open && split.active === index ? "true" : undefined,
    "data-row": String(pos.row),
    "data-pos": posKey(pos),
    "data-split": colSplit[pos.col] || undefined,
    "data-col-last": pos.col === columns - 1 || undefined,
    "data-focused": open && split.active === index ? "" : undefined,
    "data-split-inactive": open && split.active !== index ? "" : undefined,
    "data-pane-index": String(index),
    style: { "--pane-col": pos.col + 1 },
    ...extra,
  });
  const grip = (index) => <PaneGrip onGrip={(event) => startPaneDrag(event, true)} key={`grip-${index}`} />;
  let overlay = null;
  if (drop?.kind === "pane") {
    const topOnly = drop.above || hasBottom(entries, drop.target.col);
    overlay = <span className="dframe-drop-overlay-badge" data-hint={drop.hint || undefined} style={dropBadgeBox(drop.target, weights, topOnly)}>
      <span className="dframe-drop-overlay-label">{t(paneDropLabel(split, drop))}</span>
    </span>;
  } else if (drop?.kind === "session" && !(drop.cell === null && drop.tearOff)) {
    const badge = sessionDropBadge(split, drop.cell);
    overlay = <span className="dframe-drop-overlay-badge" data-hint={badge.hint || undefined} style={dropBadgeBox(badge.pos, weights, hasBottom(entries, badge.pos.col))}>
      <span className="dframe-drop-overlay-label">{t(badge.label)}</span>
    </span>;
  }
  // ca1d33d05 Ht (kind "main", shared-22 main.dframe-content): the content area is the "main" F6 stop, which gives
  // way to the session title's "header" stop while a conversation shows (focus-region-model.mjs orderStops).
  return <div ref={hostRef} className="split-host dframe-pane-host" data-focus-region="main" data-split={open || undefined} data-pane-count={1 + split.panes.length}
    style={{ "--df-col-tracks": tracks, "--df-pane-row": String(rowValue) }}>
    <div className="split-pane split-pane-primary dframe-pane dframe-pane-primary" {...paneProps(0, { col: 0, row: 0 }, { "data-pane-immovable": !primaryShown || undefined })}>
      {children}
      {open && primaryShown && grip(0)}
    </div>
    {split.panes.map((pane, at) => <div key={pane.key} className="split-pane split-pane-secondary dframe-pane dframe-pane-extra" {...paneProps(at + 1, pane.pos)}>
      <div ref={slotRef(pane.key)} className="split-pane-slot" />
      {grip(at + 1)}
    </div>)}
    {colSplit.map((bottom, col) => <div key={`col-${col}`} className="dframe-pane-col" style={{ gridColumn: col + 1 }} data-col={col} data-split={bottom || undefined}>
      {bottom && <RowResizer hostRef={hostRef} store={store} rowSplit={split.rowSplit} height={box.height} />}
      {col < columns - 1 && <>
        <ColumnResizer colIndex={col} weights={weights} hostRef={hostRef} store={store} tracks={tracks} />
        {(bottom || colSplit[col + 1]) && <CornerResizer colIndex={col} weights={weights} hostRef={hostRef} store={store} tracks={tracks} />}
      </>}
    </div>)}
    {overlay !== null && <div className="dframe-drop-overlay" aria-hidden="true">{overlay}</div>}
    <PaneDragLabel label={dragLabel} pointer={pointer} root={dragLabel === null ? null : hostRef.current?.closest(".dframe-root") ?? document.body} />
  </div>;
}

export { LEFT_OF_PRIMARY };
// The separators on their own, for the controlled-event tests (tests/split-resizer-keys.test.mjs).
export { ColumnResizer as SplitColumnResizer, RowResizer as SplitRowResizer, CornerResizer as SplitCornerResizer };
