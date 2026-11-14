// Sidebar row drag (Claude Desktop 2.31226.0 shared-19 DY / LY / MY, readable 20352-21700; shared-22 YO/XO pinned drop
// row 10403-10440, group drop band 4490-4503). A pointer drag, not native drag-and-drop: the row lifts into a ghost
// that follows the cursor and says what releasing it does, rows slide open a gap in the Pinned list, a custom group
// section lights up under it, the session area shows the split drop target and outside the window the ghost turns into
// a small window that opens where it is let go. The geometry and the intent are sidebar-drag-model.mjs.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { t } from "../electron/i18n/index.mjs";
import { sessionPaneDropHost } from "./source-split-view.jsx";
// 3.6556.2 shared-46 `O` (shared-frame Hf) and `T` (shared-frame Al): the ghost's class merge and its neutral-tone surface;
// `F` (shared-frame Vo = vE, CdsCounter) the multi-row count and `s` (vendor-frame Ia, useDirection) its side.
import { CdsCounter, cdsClassNames, cdsSurfaceClass, useDirection } from "./generated/view-tabs/index.js";
import {
  DEFAULT_ROW_STEP, DRAG_THRESHOLD, GHOST_Z_INDEX, IDLE_INTENT, dragLabel, dropOutcome, intentChanged, intentShifts, nextIntent,
} from "./sidebar-drag-model.mjs";

/** The last pointer position (xY): the ghost follows it on every frame without re-rendering. */
const pointerAt = { x: -1000, y: -1000 };
const EMPTY = new Set();

/** bY: presses on a field, on a row's action button, or that started outside the row are never drags. */
function ignoredPress(target, row) {
  return target instanceof HTMLInputElement || (target instanceof Element && !!target.closest("[data-row-action]"))
    || (target instanceof Node && !row.contains(target));
}

/** SY (3.6556.2 shared-46 dj): the ghost's copy of the row, without the keys, ids and drag classes, its geometry
 * variables copied from the source row, inert. */
function cloneRow(row) {
  const clone = row.cloneNode(true);
  for (const node of [clone, ...clone.querySelectorAll("[data-drag-key], [data-row-key], [data-jump-hint-row], [id], .df-drag-shiftable")]) {
    node.removeAttribute("data-drag-key"); node.removeAttribute("data-row-key"); node.removeAttribute("data-jump-hint-row");
    node.removeAttribute("id"); node.classList.remove("df-drag-shiftable");
  }
  clone.removeAttribute("style");
  const style = getComputedStyle(row);
  for (const name of ["--df-row-indent", "--df-described-trim", "--df-row-h", "--df-row-ctl", "--df-heading-pitch", "--df-described-line", "--df-rail-shift"])
    clone.style.setProperty(name, style.getPropertyValue(name));
  clone.style.paddingLeft = style.paddingLeft;
  clone.setAttribute("inert", "");
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

const rectOf = (node) => node.getBoundingClientRect();

/**
 * DY's snapshot (readable 20990-21245): the Pinned list's top-level rows, the shiftable rows and headings below it,
 * the custom group sections, the list's scroll band and the sidebar's right edge, read once when the drag starts.
 */
function readSnapshot({ nav, key, draft, multiKeys, pointer, startY }) {
  const sidebar = nav?.closest(".dframe-sidebar") ?? document.querySelector(".dframe-sidebar");
  const sidebarRight = sidebar ? rectOf(sidebar).right : Infinity;
  const scroller = draft ? null : nav;
  let scrollTopAtCross = 0, scrollViewTop = 0, scrollViewBottom = 0;
  if (scroller) { scrollTopAtCross = scroller.scrollTop; const rect = rectOf(scroller); scrollViewTop = rect.top; scrollViewBottom = rect.bottom; }
  const pinnedList = draft ? null : nav?.querySelector("[data-pinned-list]") ?? null;
  const pinnedKeys = [], pinnedTops = [], midpoints = [], belowKeys = [], belowTops = [], groupZones = [];
  let srcPinnedIdx = -1, familyHeight = 0, srcGroupZone = null, srcGroupIdx = -1;
  let pinnedBottomFloor = -Infinity, pinnedBottomAtCross = -Infinity, pinnedEmptyAtStart = false, nextSectionTop = Infinity;
  const style = getComputedStyle(nav ?? document.documentElement);
  const rowHeight = parseInt(style.getPropertyValue("--df-row-h"), 10), stackGap = parseInt(style.getPropertyValue("--df-row-stack-gap"), 10);
  const rowStep = Number.isNaN(rowHeight) ? DEFAULT_ROW_STEP : rowHeight + (Number.isNaN(stackGap) ? 1 : stackGap);
  if (pinnedList) {
    pinnedBottomFloor = pinnedBottomAtCross = rectOf(pinnedList).bottom;
    for (const row of pinnedList.querySelectorAll("[data-pinned-rows] > [data-drag-key]")) {
      const id = row.getAttribute("data-drag-key");
      const rect = rectOf(row);
      if (id.startsWith("label:")) { belowKeys.push(id); belowTops.push(rect.top); continue; }
      pinnedKeys.push(id); pinnedTops.push(rect.top); midpoints.push(rect.top + rect.height / 2);
      if (id === key) {
        srcPinnedIdx = pinnedKeys.length - 1;
        // uJ: the nested family under a pinned head moves with it, so the rows past it step by its height too.
        let next = row.nextElementSibling;
        while (next && !next.hasAttribute("data-pinned-family") && !next.hasAttribute("data-drag-key")) next = next.nextElementSibling;
        if (next?.hasAttribute("data-pinned-family")) familyHeight = Math.max(0, rectOf(next).bottom - rect.bottom);
      }
    }
    if (pinnedKeys.length === 0) { pinnedBottomFloor += rowStep; pinnedEmptyAtStart = true; }
    let nextSection = null;
    for (const node of nav.querySelectorAll("[data-drag-key]")) {
      const rect = rectOf(node), top = rect.top;
      if (top >= pinnedBottomAtCross && top < nextSectionTop && rect.height > 0 && !pinnedList.contains(node)) { nextSectionTop = top; nextSection = node; }
      if (pinnedList.contains(node) || top < pinnedBottomFloor) continue;
      const parent = node.parentElement?.closest("[data-drag-key]");
      if (parent && nav.contains(parent)) continue;
      belowKeys.push(node.getAttribute("data-drag-key")); belowTops.push(top);
    }
    const label = nextSection?.matches("[data-sidebar-group-label]") ? nextSection : nextSection?.querySelector("[data-sidebar-group-label]") ?? null;
    if (label && rectOf(label).top <= nextSectionTop + 1) nextSectionTop += parseFloat(getComputedStyle(label).paddingTop) || 0;
  }
  if (!draft && nav) for (const section of nav.querySelectorAll("[data-group-list]")) {
    const rect = rectOf(section), raw = section.getAttribute("data-group-list");
    const zone = { id: raw === "" ? null : raw, label: section.getAttribute("data-group-label") ?? "", top: rect.top, bottom: rect.bottom,
      keys: [], mids: [], accepts: true, verb: "move", ordered: section.hasAttribute("data-group-ordered"),
      shiftsWithPinned: rect.top >= pinnedBottomAtCross, slotEdgePx: 0 };
    for (const row of section.querySelectorAll("[data-drag-key]")) {
      const id = row.getAttribute("data-drag-key");
      if (id.startsWith("label:")) continue;
      const box = rectOf(row);
      if (box.height === 0) continue;
      zone.keys.push(id); zone.mids.push(box.top + box.height / 2);
      if (id === key) { srcGroupZone = zone; srcGroupIdx = zone.keys.length - 1; }
    }
    groupZones.push(zone);
  }
  let keys = multiKeys ?? [key], multi = keys.length > 1;
  // u && !j.some(…): a selection with no section to go to drags as the one row.
  if (multi && !groupZones.some((zone) => zone.accepts && !(zone === srcGroupZone && !zone.ordered) && !(srcPinnedIdx !== -1 && zone.id === null))) { keys = [key]; multi = false; }
  const srcPinned = srcPinnedIdx !== -1;
  const srcY = srcPinned ? pinnedTops[srcPinnedIdx] : srcGroupZone && srcGroupIdx >= 0 ? srcGroupZone.mids[srcGroupIdx] - rowStep / 2 : (belowTops[belowKeys.indexOf(key)] ?? 0);
  return {
    pinnedKeys, pinnedTops, midpoints, belowKeys, belowTops, groupZones, srcY, groupSrcY: srcPinned && pinnedKeys.length === 1 ? Infinity : srcY,
    srcPinnedIdx, srcGroupZone, srcGroupIdx, pinnedBottomAtCross, pinnedBottomFloor, pinnedEmptyAtStart, nextSectionTop, sidebarRight,
    scrollTopAtCross, scrollViewTop, scrollViewBottom, rowStep, familyStep: rowStep + familyHeight, familyHeight, startY,
    srcPinned, keys, multi, scroller, pinnedList, pointerStart: pointer,
  };
}

/**
 * DY: the pointerdown handler factory for rows (and MY for the New session row). `context.current` is read when the
 * drag starts and ends: { selectionKeys(key) → keys | null, isShown(id), canTearOff(session), canSplit(session), splitOpen(),
 * onDrop(outcome, drag) }.
 */
export function useSidebarRowDrag({ navRef, context }) {
  const [drag, setDragState] = useState(null);
  const dragRef = useRef(null);
  const cleanup = useRef(null);
  const setDrag = useCallback((next) => {
    dragRef.current = typeof next === "function" ? next(dragRef.current) : next;
    setDragState(dragRef.current);
  }, []);
  useEffect(() => () => cleanup.current?.(), []);
  const begin = useCallback((event, { key, session = null, label = "", draft = false }) => {
    if (event.button !== 0 || cleanup.current) return;
    const row = event.currentTarget;
    if (!draft && ignoredPress(event.target, row)) return;
    const ctx = context.current;
    const pointerId = event.pointerId, startX = event.clientX, startY = event.clientY;
    const rowEl = draft ? null : row.closest("[data-drag-key]");
    const multiKeys = draft ? null : ctx.selectionKeys?.(key) ?? null;
    let snapshot = null, intent = IDLE_INTENT, latest = null, releaseTimer, scrollFrame = 0, scrollRest = 0, scrollAt = 0;
    const screen = { x: 0, y: 0 }, client = { x: 0, y: 0 };
    const paneHost = () => sessionPaneDropHost();
    // What the session area needs to pick a cell for this row (shared-19 SJ / canOpenLeft).
    const paneDrag = { id: draft ? null : session?.id ?? null, draft };
    const stopScroll = () => { scrollRest = 0; scrollAt = 0; if (scrollFrame) { cancelAnimationFrame(scrollFrame); scrollFrame = 0; } };
    // R(): the list scrolls at the intent's speed while the pointer rests in an edge band, re-reading the target.
    const scrollStep = () => {
      scrollFrame = 0;
      const scroller = snapshot?.scroller;
      if (intent.scrollSpeed === 0 || !scroller || !latest) return;
      const now = performance.now(), elapsed = scrollAt === 0 ? 16 : Math.min(50, now - scrollAt);
      scrollAt = now; scrollRest += (intent.scrollSpeed * elapsed) / 1000;
      const delta = Math.trunc(scrollRest);
      if (delta !== 0) {
        scrollRest -= delta;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + delta;
        if (scroller.scrollTop === before) { stopScroll(); return; }
      }
      move(latest);
    };
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      // A release outside the window can arrive as a move with no buttons: finish once it settles (200ms).
      if (moveEvent.buttons === 0 || releaseTimer !== undefined) { if (releaseTimer === undefined) releaseTimer = setTimeout(() => finish(true), 200); return; }
      latest = moveEvent;
      pointerAt.x = moveEvent.clientX; pointerAt.y = moveEvent.clientY;
      if (snapshot === null) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD && Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD) return;
        snapshot = readSnapshot({ nav: draft ? null : navRef.current, key, draft, multiKeys, pointer: { x: startX, y: startY }, startY });
        const alreadyOpen = !draft && !!ctx.isShown?.(key);
        const canPin = !draft && snapshot.pinnedList !== null;
        const canTearOff = !draft && !snapshot.multi && !!ctx.canTearOff?.(session);
        // shared-19 me: a New session row can always add a pane (xa); a session row when it can split and is not a
        // shown session that could pin or tear off instead (Sa).
        const canSplit = snapshot.multi ? false : draft ? true : !!ctx.canSplit?.(session) && !(alreadyOpen && (canPin || canTearOff));
        Object.assign(snapshot, { canTearOff, alreadyOpenSession: alreadyOpen, canSplit, acceptsGroupDrop: !draft, pinSlots: !draft, allowUnpin: true });
        let rowGhost = null;
        const sidebar = rowEl?.isConnected ? rowEl.closest(".dframe-sidebar") : null;
        if (rowEl && sidebar) {
          const rect = rectOf(rowEl), h = Math.min(rect.height, snapshot.rowStep - 1);
          rowGhost = { h, w: rect.width, dx: Math.min(Math.max(moveEvent.clientX - rect.left, 4), rect.width - 4),
            dy: Math.min(Math.max(moveEvent.clientY - rect.top, 2), h - 2), portal: sidebar, clone: cloneRow(rowEl) };
        }
        document.getSelection()?.removeAllRanges();
        document.documentElement.setAttribute("data-sidebar-row-dragging", "");
        setDrag({
          key, session, keys: snapshot.keys, companions: snapshot.keys.length > 1 ? new Set(snapshot.keys.filter((entry) => entry !== key)) : EMPTY,
          label, srcPinned: snapshot.srcPinned, blockShift: snapshot.familyHeight > 0, srcGroupLabel: snapshot.srcGroupZone?.id ? snapshot.srcGroupZone.label : "",
          slotIdx: null, shifts: new Map(), unpinIntent: false, paneIntent: null, groupIntent: null, tearOffIntent: false, newWindowIntent: false,
          canTearOff, canSplit, paneDraft: draft, canPin, rowGhost, rowStep: snapshot.rowStep, familyStep: snapshot.familyStep,
        });
        // qQ: a row that can split shows where it would open (dimmed) from the start of the drag.
        if (canSplit) paneHost()?.show(null);
        return;
      }
      if (dragRef.current === null) return;
      screen.x = moveEvent.screenX; screen.y = moveEvent.screenY; client.x = moveEvent.clientX; client.y = moveEvent.clientY;
      const past = moveEvent.clientX > snapshot.sidebarRight;
      const next = nextIntent(snapshot, {
        x: moveEvent.clientX, y: moveEvent.clientY, scrollTop: snapshot.scroller ? snapshot.scroller.scrollTop : null,
        innerWidth: window.innerWidth, innerHeight: window.innerHeight,
        liveBottom: snapshot.pinnedEmptyAtStart && snapshot.pinnedList?.isConnected ? rectOf(snapshot.pinnedList).bottom : null,
        paneSlot: past && snapshot.canSplit ? paneHost()?.at(moveEvent.clientX, moveEvent.clientY, paneDrag) ?? null : null,
      }, intent);
      if (intentChanged(intent, next)) {
        const shifts = intentShifts(snapshot, next);
        setDrag((current) => current && { ...current, slotIdx: next.slot, shifts, unpinIntent: next.unpin, paneIntent: next.pane,
          groupIntent: next.group, tearOffIntent: next.tearOff, newWindowIntent: next.newWindow });
        // qQ: the cell under the pointer, else the default cell dimmed; no badge while the row tears off.
        if (snapshot.canSplit && ((next.pane?.key ?? null) !== (intent.pane?.key ?? null) || next.tearOff !== intent.tearOff)) paneHost()?.show(next.pane, { tearOff: next.tearOff });
      }
      if (next.tearOff) { if (!intent.tearOff) stopScroll(); }
      else if (next.inScrollRegion) {
        if (next.scrollSpeed !== 0 && scrollFrame === 0) scrollFrame = requestAnimationFrame(scrollStep);
        else if (next.scrollSpeed === 0 && scrollFrame !== 0) stopScroll();
      } else if (intent.scrollSpeed !== 0) stopScroll();
      intent = next;
    };
    // H(completed): tear-off / new window, split, group, unpin, pin, reorder, or nothing.
    const finish = (completed) => {
      const current = dragRef.current, started = snapshot !== null;
      teardown();
      if (!started || current === null) return;
      // The click that ends a drag is not a row click (nx session end).
      const swallow = (click) => { click.preventDefault(); click.stopPropagation(); };
      document.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", swallow, true), 0);
      setDrag(null);
      if (!completed) return;
      const pane = current.paneIntent ?? (current.canSplit && client.x > snapshot.sidebarRight ? paneHost()?.at(client.x, client.y, paneDrag) ?? null : null);
      const outcome = dropOutcome(current, snapshot, { pane, screen });
      if (outcome) context.current.onDrop?.(outcome, current, snapshot);
    };
    const up = (upEvent) => { if (upEvent.pointerId === pointerId) finish(true); };
    const cancel = (cancelEvent) => { if (cancelEvent.pointerId === pointerId) finish(false); };
    const key_ = (keyEvent) => {
      if (keyEvent.key !== "Escape") return;
      if (dragRef.current !== null) { keyEvent.preventDefault(); keyEvent.stopPropagation(); }
      finish(false);
    };
    function teardown() {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("keydown", key_, true);
      clearTimeout(releaseTimer);
      stopScroll();
      document.documentElement.removeAttribute("data-sidebar-row-dragging");
      if (snapshot?.canSplit) paneHost()?.clear?.();
      cleanup.current = null;
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("keydown", key_, true);
    cleanup.current = () => { teardown(); if (dragRef.current) setDrag(null); };
  }, [context, navRef, setDrag]);
  return { drag, begin };
}

/** shared-22 XO: the Pinned list's drop row: 'Drag to pin', 'Drop here' while a row that can pin is dragged, 'Let go'
 * while the pointer is on a pin slot. */
export function PinnedDropRow({ hot = false, dragging = false }) {
  return <div className={"flex h-[var(--df-row-h)] items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] px-[var(--df-row-px)] text-[length:var(--df-row-font)] transition-colors "
    + (hot ? "bg-neutral-30 text-secondary" : "text-muted opacity-80")} data-pinned-drop-row="">
    <span className="df-leading-slot source-leading-slot"><Icon name="Pin" size={16} className={"transition-transform " + (dragging ? "rotate-6 scale-105" : "")} /></span>
    <span>{hot ? t("Let go") : dragging ? t("Drop here") : t("Drag to pin")}</span>
  </div>;
}

/** 3.6556.2 shared-46 Dj / Oj: the ghost row's tone surface. Without a label (and in the danger tone) it keeps the
 * sidebar background and float shadow; a neutral label sits on the popover surface (`Oj=T("popover")`). */
const GHOST_ROW_SURFACE = "bg-[var(--df-web-sidebar-bg,var(--df-sidebar-bg))] [background-image:var(--df-web-sidebar-bg-image,none)] shadow-[var(--df-shadow-float)]";
const GHOST_ROW_NEUTRAL = cdsSurfaceClass("popover");

/** LY (3.6556.2 shared-46 Mj): the ghost. With a row: the row's copy (or, over a target, the target's label centred
 * and shrunk to it; data-tone "danger" over Release to unpin and Ungroup, else "neutral"), a count badge for a
 * multi-row drag; with no row (the New session row): a small label bubble. Outside the window (tear-off) it fades into
 * a little window card titled with the session; a native-halo tear-off (`d`, drag.nativeHalo) shrinks further and
 * shows no card. */
export function SidebarDragGhost({ drag }) {
  const outer = useRef(null), cloneHost = useRef(null), measure = useRef(null), rtl = useDirection() === "rtl";
  const [kept, setKept] = useState(null), [labelWidth, setLabelWidth] = useState(null), [narrowed, setNarrowed] = useState(false);
  const active = drag !== null;
  const ghost = drag?.rowGhost ?? null, hasRow = ghost !== null;
  const tearOff = !!drag?.tearOffIntent, nativeHalo = !!drag?.nativeHalo;
  // Mj `M=r||p===null`: Release to unpin, or a group drop that removes the rows from their group. `p` is pA:
  // `e.drag?.groupIntent&&!e.drag.groupIntent.reorder?e.drag.groupIntent.groupId:!1` (a reorder inside the group is no drop).
  const groupId = drag?.groupIntent && !drag.groupIntent.reorder ? drag.groupIntent.groupId : false;
  const danger = !!drag?.unpinIntent || groupId === null;
  const label = dragLabel(drag);
  const text = label ? t(label.message, label.values) : null;
  const showsLabel = text !== null;
  const tone = showsLabel ? (danger ? "danger" : "neutral") : undefined;
  if (showsLabel && text !== kept) setKept(text);
  const shown = text ?? kept;
  useLayoutEffect(() => { if (measure.current) setLabelWidth(Math.ceil(measure.current.offsetWidth)); }, [shown, active, hasRow]);
  const wantNarrow = showsLabel && labelWidth !== null;
  if (!tearOff && narrowed !== wantNarrow) setNarrowed(wantNarrow);
  const narrow = tearOff ? narrowed : wantNarrow;
  useLayoutEffect(() => {
    const node = outer.current;
    if (!active || !node) return undefined;
    let frame = 0;
    const follow = () => { node.style.transform = `translate(${pointerAt.x}px, ${pointerAt.y}px)`; frame = requestAnimationFrame(follow); };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [active]);
  const clone = ghost?.clone ?? null;
  useLayoutEffect(() => {
    const host = cloneHost.current;
    if (!host || !clone) return undefined;
    host.appendChild(clone);
    return () => clone.remove();
  }, [clone]);
  if (!active) return null;
  const hidden = nativeHalo ? " opacity-0 scale-[0.35]" : " opacity-0 scale-75";
  const box = ghost ?? { dx: 0, dy: 0, w: 0, h: 0 };
  const width = narrow ? Math.min(labelWidth ?? box.w, box.w) : box.w;
  const left = narrow ? Math.round(width / 2) : box.dx, top = narrow ? Math.round(box.h / 2) : box.dy;
  const name = drag.label || t("Untitled");
  const font = "font-medium text-[length:var(--df-row-font)]";
  return createPortal(<div ref={outer} aria-hidden="true" className="fixed top-0 left-0 pointer-events-none will-change-transform source-drag-ghost" style={{ zIndex: GHOST_Z_INDEX }}>
    {hasRow && <div data-tone={tone} className={cdsClassNames(tone === "neutral" ? GHOST_ROW_NEUTRAL : GHOST_ROW_SURFACE,
      "absolute overflow-hidden rounded-[var(--df-radius-pill)] transition-[opacity,transform,width,left,top,background-color] duration-150 ease-out motion-reduce:transition-none",
      tearOff ? hidden : showsLabel ? "opacity-100" : "opacity-90 dark:ring-1 dark:ring-alpha-2", "source-drag-ghost-row")}
      style={{ left: -left, top: -top, width, height: box.h, transformOrigin: `${left}px ${top}px` }}>
      <div ref={cloneHost} className={"absolute inset-0 transition-opacity duration-150 ease-out motion-reduce:transition-none" + (showsLabel ? " opacity-0" : " opacity-100")} />
      <div className={"absolute inset-0 rounded-[inherit] bg-danger shadow-ring-danger stacks:shadow-none transition-opacity duration-150 ease-out motion-reduce:transition-none" + (tone === "danger" ? " opacity-100" : " opacity-0")} />
      <div className={`absolute inset-0 flex items-center justify-center px-2 ${font} transition-[opacity,color] duration-150 ease-out motion-reduce:transition-none`
        + (showsLabel ? " opacity-100" : " opacity-0") + (tone === "danger" ? " text-danger" : " text-primary")}>
        <span className="min-w-0 truncate" data-drag-label="">{shown}</span>
      </div>
      {shown !== null && <span ref={measure} aria-hidden="true" className={`invisible absolute w-max px-3 whitespace-nowrap ${font}`}>{shown}</span>}
    </div>}
    {/* Mj `n&&v>1?o(F,{value:v,variant:"accent",size:"xs",className:…,style:{left:y?-ie+4:re-ie-4,top:-Y+2}}):null` (y = rtl). */}
    {hasRow && drag.keys.length > 1 && <CdsCounter value={drag.keys.length} variant="accent" size="xs"
      className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-150 ease-out motion-reduce:transition-none"
      style={{ left: rtl ? -left + 4 : width - left - 4, top: -top + 2 }} />}
    {!hasRow && <div className={"absolute bottom-4 left-0 -translate-x-1/2 px-2 py-1 rounded-md text-[13px] whitespace-nowrap transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none origin-[50%_42px] "
      + (tearOff ? "" : "backdrop-blur-md ")
      + (danger ? "bg-danger text-danger border-[0.5px] border-danger stacks:border-transparent font-medium" : "bg-[color-mix(in_srgb,var(--cds-surface-3)_80%,transparent)] text-primary border-[0.5px] shadow-sm")
      + (tearOff ? hidden : " opacity-100 scale-100")} data-drag-label="">{text ?? name}</div>}
    <div aria-hidden="true" className={"absolute left-0 -translate-x-1/2 -top-[26px] w-[224px] h-[148px] rounded-lg bg-[color-mix(in_srgb,var(--cds-surface-3)_70%,transparent)] backdrop-blur-md border border-alpha-4 shadow-lg flex flex-col items-center justify-center gap-3 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none origin-top "
      + (tearOff && !nativeHalo ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none")} data-tear-off-card={tearOff && !nativeHalo ? "" : undefined}>
      <div className="relative w-[52px] h-[44px]">
        <div className="absolute right-0 bottom-0 w-[44px] h-[34px] rounded border-[1.5px] border-alpha-3" />
        <div className="absolute left-0 top-0 w-[44px] h-[34px] rounded bg-[color-mix(in_srgb,var(--cds-surface-3)_90%,transparent)] border-[1.5px] border-alpha-4">
          <div className="h-[7px] border-b-[1.5px] border-alpha-3" />
        </div>
      </div>
      <span className="px-4 text-[10.5px] text-secondary truncate max-w-full">{name}</span>
    </div>
  </div>, ghost?.portal ?? document.body);
}

