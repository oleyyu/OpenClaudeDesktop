// Sidebar row drag (Claude Desktop 2.31226.0 shared-19 DY / QJ / LY, readable 20352-21700; shared-22 YO/XO
// 10403-10440). A row picked up with the pointer can be dropped into the Pinned list (pin at a slot, or reorder a
// pinned row), below it (Release to unpin), onto a custom group section (Move to {label} / Ungroup), onto the session
// area (Open in split view) or outside the window (tear-off into a new window at the cursor). The DOM geometry is
// read once when the drag starts (the "snapshot"); everything here is pure so the intent and the row shifts can be
// tested without a renderer.

/** rJ: the pointer travel before a press becomes a drag (and that arms the auto-scroll edges). */
export const DRAG_THRESHOLD = 4;
/** nJ: the row step before the list's --df-row-h / --df-row-stack-gap are read (27 = 26px row + 1px gap). */
export const DEFAULT_ROW_STEP = 27;
/** iJ / aJ: the auto-scroll band at either edge of the list and the speed at the very edge (px per second). */
export const SCROLL_EDGE = 36;
export const SCROLL_MAX_SPEED = 840;
/** dY: a multi-selection companion row stays in place at this opacity while the dragged row is lifted. */
export const COMPANION_OPACITY = 0.4;
/** PY = shared-frame Ju (9e3) + 1: the ghost sits above every layer but the tear-off halo. */
export const GHOST_Z_INDEX = 9001;
/** H(): a torn-off session's window opens with its top-left this far up and left of the cursor. */
export const TEAR_OFF_OFFSET = Object.freeze({ x: 120, y: 14 });

/** oJ: negative scrolls up near the top edge, positive scrolls down near the bottom edge, 0 elsewhere. */
export function autoScrollSpeed(fromTop, fromBottom) {
  if (fromTop >= 0 && fromTop < SCROLL_EDGE) return -SCROLL_MAX_SPEED * (1 - fromTop / SCROLL_EDGE);
  if (fromBottom >= 0 && fromBottom < SCROLL_EDGE) return SCROLL_MAX_SPEED * (1 - fromBottom / SCROLL_EDGE);
  return 0;
}

/** KJ: `keys` with `moving` taken out and put back at `slot` (a slot counted over the original list). */
export function reorderKeys(keys, slot, moving) {
  const set = new Set(moving);
  let at = slot;
  for (let index = 0; index < slot && index < keys.length; index++) if (set.has(keys[index])) at--;
  const rest = keys.filter((key) => !set.has(key));
  rest.splice(at, 0, ...moving);
  return rest;
}

/** qJ: dropping `moving` at `slot` leaves the order as it is. */
export function keepsOrder(keys, slot, moving) {
  const next = reorderKeys(keys, slot, moving);
  return next.length === keys.length && next.every((key, index) => key === keys[index]);
}

/** zJ: the rows that move a step to open the gap for a pin slot. A pinned source moves the rows between its old and
 * new place; an outside row pushes the pinned rows from the slot down, and the rows above it (whose space it leaves)
 * down with them. 1 = down a step, -1 = up a step. */
export function pinShifts({ slot, srcPinned, srcY, pinnedKeys = [], pinnedTops = [], belowKeys = [], belowTops = [] }) {
  const shifts = new Map();
  const slotTop = slot < pinnedTops.length ? pinnedTops[slot] : Infinity;
  if (srcPinned) {
    const low = Math.min(slotTop, srcY), high = Math.max(slotTop, srcY), step = slotTop < srcY ? 1 : -1;
    for (let index = 0; index < pinnedKeys.length; index++) {
      const top = pinnedTops[index];
      if (top >= low && top < high) shifts.set(pinnedKeys[index], step);
    }
    return shifts;
  }
  if (pinnedKeys.length === 0) return shifts;
  for (let index = slot; index < pinnedKeys.length; index++) shifts.set(pinnedKeys[index], 1);
  for (let index = 0; index < belowKeys.length; index++) if (belowTops[index] < srcY) shifts.set(belowKeys[index], 1);
  return shifts;
}

/** BJ: every row whose top lies between `from` and `to` moves one step toward `from`'s side. */
export function rangeShifts(from, to, keys = [], tops = []) {
  const shifts = new Map();
  const low = Math.min(from, to), high = Math.max(from, to), step = from < to ? 1 : -1;
  for (let index = 0; index < keys.length; index++) {
    const top = tops[index];
    if (top >= low && top < high) shifts.set(keys[index], step);
  }
  return shifts;
}

/** VJ: an ordered zone's highlight grows a step toward the source when the source sits outside it. */
export function zoneExtension(zone, srcY, step) {
  if (!zone?.ordered) return { top: 0, bottom: 0 };
  return { top: srcY < zone.top ? step : 0, bottom: srcY >= zone.bottom ? step : 0 };
}

/** HJ: the group section under `y` (zones below the Pinned list follow its live growth) and the slot in it; a pinned
 * source never drops onto the ungrouped section (id null). */
export function zoneAt(zones = [], y, growth = 0, srcPinned = false) {
  const at = (zone) => y - (zone.shiftsWithPinned ? growth : 0);
  const zone = zones.find((entry) => {
    const point = at(entry), edge = entry.slotEdgePx ?? 0;
    return point >= entry.top + edge && point < entry.bottom - edge;
  });
  if (zone === undefined || !zone.accepts || (srcPinned && zone.id === null)) return null;
  const point = at(zone);
  let slotIdx = zone.mids.length;
  for (let index = 0; index < zone.mids.length; index++) if (point < zone.mids[index]) { slotIdx = index; break; }
  return { zone, slotIdx };
}

/** JJ: the intent before the pointer has moved. */
export const IDLE_INTENT = Object.freeze({
  slot: null, unpin: false, pane: null, group: null, tearOff: false, newWindow: false,
  scrollSpeed: 0, inScrollRegion: false, topArmed: false, botArmed: false, liveBottomMax: -Infinity,
});

/** ZJ: how far past the Pinned list's bottom a row from outside still drops into it (up to the next section, at most
 * a step; a step more once the slot is the last one and the source sits below). */
export function pinSlack(snapshot, floor, growth, previousSlot) {
  const { nextSectionTop, pinnedKeys = [], rowStep, srcY } = snapshot;
  if (!Number.isFinite(floor) || !Number.isFinite(nextSectionTop)) return 0;
  return Math.min(Math.max(nextSectionTop + growth - floor, 0), rowStep)
    + (pinnedKeys.length > 0 && previousSlot === pinnedKeys.length && nextSectionTop < srcY ? rowStep : 0);
}

/**
 * QJ: the drop the pointer points at. `pointer` = { x, y, scrollTop (the list's, or null), innerWidth, innerHeight,
 * liveBottom (the Pinned list's live bottom while it reveals from empty, else null), paneSlot (the split target under
 * the pointer when the drag can split, else null) }. Returns the next intent; `previous` carries the armed edges and
 * the live bottom across moves.
 */
export function nextIntent(snapshot, pointer, previous = IDLE_INTENT) {
  const s = snapshot;
  const scrollDelta = pointer.scrollTop === null || pointer.scrollTop === undefined ? 0 : pointer.scrollTop - s.scrollTopAtCross;
  const y = pointer.y + scrollDelta;
  const outside = pointer.x < 0 || pointer.y < 0 || pointer.x > pointer.innerWidth || pointer.y > pointer.innerHeight;
  if (s.canTearOff && outside) {
    return { ...previous, slot: null, unpin: false, pane: null, group: null, tearOff: true, newWindow: false, scrollSpeed: 0, inScrollRegion: false };
  }
  const topArmed = previous.topArmed || pointer.y < s.startY - DRAG_THRESHOLD || (pointer.y <= s.scrollViewTop && pointer.y < s.startY);
  const botArmed = previous.botArmed || pointer.y > s.startY + DRAG_THRESHOLD || (pointer.y >= s.scrollViewBottom && pointer.y > s.startY);
  const pastSidebar = pointer.x > s.sidebarRight;
  const inScrollRegion = pointer.scrollTop !== null && pointer.scrollTop !== undefined && !pastSidebar && pointer.x >= 0;
  let scrollSpeed = 0;
  if (inScrollRegion) {
    const speed = autoScrollSpeed(pointer.y - s.scrollViewTop, s.scrollViewBottom - pointer.y);
    scrollSpeed = (speed < 0 && !topArmed) || (speed > 0 && !botArmed) ? 0 : speed;
  }
  const newWindow = pastSidebar && s.canTearOff && s.alreadyOpenSession;
  let growth = 0, liveBottomMax = previous.liveBottomMax;
  if (pointer.liveBottom !== null && pointer.liveBottom !== undefined) {
    const bottom = pointer.liveBottom + scrollDelta;
    liveBottomMax = Math.max(liveBottomMax, bottom);
    growth = bottom - s.pinnedBottomAtCross;
  }
  const floor = Math.max(s.pinnedBottomFloor, liveBottomMax);
  const belowPinned = y >= (s.srcPinned ? floor : floor + pinSlack(s, floor, growth, previous.slot));
  const paneSlot = pointer.paneSlot ?? null;
  const hit = !pastSidebar && s.acceptsGroupDrop && !(s.multi && outside) ? zoneAt(s.groupZones, y, growth, s.srcPinned) : null;
  let slot = null, unpin = false, group = null;
  if (paneSlot !== null || pastSidebar) { /* no list target */ }
  else if (hit) {
    const same = hit.zone === s.srcGroupZone, index = hit.slotIdx;
    const noop = same && (index === s.srcGroupIdx || index === s.srcGroupIdx + 1 || (s.multi && keepsOrder(hit.zone.keys, index, s.keys)));
    if (!noop && !(same && !hit.zone.ordered)) {
      const extend = zoneExtension(hit.zone, s.groupSrcY, s.rowStep);
      group = { groupId: hit.zone.id, slotIdx: index, label: hit.zone.label, verb: hit.zone.verb ?? "move",
        extendTopPx: extend.top, extendBottomPx: extend.bottom, zone: hit.zone };
    }
  } else if (!s.pinSlots || s.multi) { /* pin slots off */ }
  else if (s.allowUnpin && belowPinned) unpin = !!s.srcPinned;
  else {
    let at = s.midpoints.length;
    for (let index = 0; index < s.midpoints.length; index++) if (y < s.midpoints[index]) { at = index; break; }
    slot = s.srcPinned && (at === s.srcPinnedIdx || at === s.srcPinnedIdx + 1) ? null : at;
  }
  return { slot, unpin, pane: paneSlot, group, tearOff: false, newWindow, scrollSpeed, inScrollRegion, topArmed, botArmed, liveBottomMax };
}

// A split target is { key: "col:row", pos } (source-split-view.jsx sessionPaneDropHost().at).
const paneKey = (pane) => (pane ? pane.key ?? `${pane.mode}:${pane.side}` : "");

/** $J: whether the drop target changed (scrolling alone does not re-render the list). */
export function intentChanged(previous, next) {
  return next.slot !== previous.slot || next.unpin !== previous.unpin || paneKey(next.pane) !== paneKey(previous.pane)
    || next.group?.groupId !== previous.group?.groupId || next.group?.slotIdx !== previous.group?.slotIdx
    || next.newWindow !== previous.newWindow || next.tearOff !== previous.tearOff;
}

const NO_SHIFTS = new Map();
/** eY: the row shifts for an intent (an unordered group section opens no gap). */
export function intentShifts(snapshot, intent) {
  const { pinnedKeys, pinnedTops, belowKeys, belowTops, srcY, groupSrcY, srcPinned, rowStep } = snapshot;
  if (intent.group !== null) {
    const { zone, slotIdx } = intent.group;
    if (!zone.ordered) return NO_SHIFTS;
    const at = zone.mids[slotIdx] === undefined ? zone.bottom : zone.mids[slotIdx] - rowStep / 2;
    return srcPinned ? rangeShifts(at, groupSrcY, [...pinnedKeys, ...belowKeys], [...pinnedTops, ...belowTops]) : rangeShifts(at, groupSrcY, belowKeys, belowTops);
  }
  if (intent.slot === null) return NO_SHIFTS;
  return pinShifts({ slot: intent.slot, srcPinned, srcY, pinnedKeys, pinnedTops, belowKeys, belowTops });
}

/** aY + the style table (oY … mY): the dragged row is hidden in place, rows in the gap move a step (a pinned family
 * moves the source's family height too), multi-selection companions dim. */
export function dragRowStyle(drag, key) {
  if (!drag) return undefined;
  if (drag.key === key) return { visibility: "hidden" };
  const companion = drag.companions?.has(key) ?? false;
  const shift = drag.shifts?.get(key);
  if (shift === undefined) return companion ? { opacity: COMPANION_OPACITY } : undefined;
  const step = companion || !(drag.blockShift && drag.groupIntent === null) ? drag.rowStep : drag.familyStep;
  const transform = `translateY(${shift === 1 ? "" : "-"}${step}px)`;
  return companion ? { opacity: COMPANION_OPACITY, transform } : { transform };
}

/** LY k: the text the ghost shows for the current target ({ message, values } in English; null shows the row). */
export function dragLabel(drag) {
  if (!drag) return null;
  if (drag.paneIntent) return { message: "Open in split view" };
  if (drag.newWindowIntent) return { message: "Open in new window" };
  const groupId = drag.groupIntent ? drag.groupIntent.groupId : false;
  if (groupId === false) return drag.unpinIntent ? { message: "Release to unpin" } : null;
  const label = (groupId === null ? drag.srcGroupLabel : drag.groupIntent.label) ?? "";
  // shared-18 lE (code custom groups, pE without the environments overlay): dragRemove and dragRemoveSeveral are both
  // "Ungroup" (DEIry5ZK1b); LY picks dragRemoveSeveral for a multi drag or an unlabeled source, with the same text.
  if (groupId === null) return { message: "Ungroup" };
  return { message: "Move to {label}", values: { label } };
}

/** H(true): what releasing the pointer does. `pane` is the split target the drop lands on (the live intent, else the
 * last point re-read by the caller). */
export function dropOutcome(drag, snapshot, { pane = drag?.paneIntent ?? null, screen = null } = {}) {
  if (!drag || !snapshot) return null;
  if ((drag.tearOffIntent || drag.newWindowIntent) && drag.canTearOff) {
    return { type: "window", entryPoint: drag.newWindowIntent ? "drag_new_window" : "drag_tear_off", position: screen ? tearOffPosition(screen) : null };
  }
  if (pane && drag.canSplit) return { type: "pane", pane, draft: !!drag.paneDraft };
  if (drag.groupIntent) return { type: "group", groupId: drag.groupIntent.groupId, keys: drag.keys };
  if (drag.unpinIntent) return { type: "unpin", key: drag.key };
  if (drag.slotIdx !== null && !drag.srcPinned) return { type: "pin", key: drag.key, at: drag.slotIdx, before: snapshot.pinnedKeys[drag.slotIdx] ?? null };
  if (drag.slotIdx !== null && drag.srcPinned) {
    const from = snapshot.srcPinnedIdx;
    return { type: "reorder", key: drag.key, from, to: drag.slotIdx > from ? drag.slotIdx - 1 : drag.slotIdx, before: snapshot.pinnedKeys[drag.slotIdx] ?? null };
  }
  return null;
}

/** H(): initialPosition of the torn-off window, from the pointer's last screen point. */
export function tearOffPosition(screen) {
  return { x: Math.round(screen.x - TEAR_OFF_OFFSET.x), y: Math.round(screen.y - TEAR_OFF_OFFSET.y) };
}

/** The persisted Pinned order after dropping `id` before `before` (null: at the end). `order` is the shown order. */
export function pinnedOrderAfterDrop(order = [], id, before = null) {
  const rest = order.filter((entry) => entry !== id);
  const at = before === null ? -1 : rest.indexOf(before);
  if (at === -1) rest.push(id); else rest.splice(at, 0, id);
  return rest;
}

