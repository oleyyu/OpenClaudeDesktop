// Pure menu logic for the shared SourceMenu primitive (2.2553.1 CDS Menu
// B_/Wr over Base UI). Everything here is DOM-free so node:test can cover it:
// highlight movement, type-ahead, digit shortcuts, close-reason focus
// restoration, positioner math (root offset 6 / nested 2 / Filter 4 with
// collision shifting), the layer scheme (al: base + 100, menu offset 20),
// shortcut formatting and the PendingList skeleton plan.


export const TYPEAHEAD_TIMEOUT = 500;
export const LAYER_STEP = 100; // shared-frame Zc
export const MENU_LAYER_OFFSET = 20; // shared-frame tl.menu
export const CONTEXT_MENU_LAYER_OFFSET = 30; // shared-frame tl.contextmenu (l_: al('contextmenu') for a cursor-anchored root)
export const ROOT_SIDE_OFFSET = 6; // l_: root popups
export const NESTED_SIDE_OFFSET = 2; // l_: nested popups
export const CONTEXT_MENU_SIDE_OFFSET = -5; // Base UI positioner default for a context-menu anchor
export const CONTEXT_MENU_ALIGN_OFFSET = 2; // Base UI positioner default for a context-menu anchor
export const SUBMENU_HOVER_DELAY = 100; // Base UI SubmenuTrigger delay (open) and restMs
export const SAFE_POLYGON_BUFFER = 0.5; // floating-ui safePolygon buffer (px)
export const SAFE_POLYGON_LINGER = 40; // ms resting inside the polygon before it closes
export const SAFE_POLYGON_MIN_SPEED = 0.1; // px/ms; slower outside the popups counts as resting
export const SKELETON_ROW_ESTIMATE = 20; // shared-frame I_
export const SKELETON_WIDTHS_ICON = Object.freeze([160, 128, 144]); // shared-frame _c
export const SKELETON_WIDTHS_PLAIN = Object.freeze([120, 88, 104]); // shared-frame vc

const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/** al(): a popup layer inside a base layer. Root menus sit at 100 + 20, cursor-anchored context menus at 100 + 30. */
export function menuLayer(base = 0, offset = MENU_LAYER_OFFSET) {
  const layerBase = (Number.isFinite(base) ? base : 0) + LAYER_STEP;
  return { layerBase, z: layerBase + (Number.isFinite(offset) ? offset : MENU_LAYER_OFFSET) };
}

/** Next highlighted index for a navigation key; null when the key is not one. */
export function moveHighlight({ count, current = -1, key }) {
  if (!count) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return current < 0 ? 0 : (current + 1) % count;
  if (key === "ArrowUp") return current < 0 ? count - 1 : (current - 1 + count) % count;
  return null;
}

/** Type-ahead buffer: characters typed within the timeout accumulate. */
export function typeaheadState(previous, key, now, timeout = TYPEAHEAD_TIMEOUT) {
  const fresh = !previous || now - previous.at > timeout;
  return { text: (fresh ? "" : previous.text) + key.toLowerCase(), at: now };
}

/** First label after `from` (wrapping, then `from` itself) that starts with the buffer. */
export function typeaheadMatch(labels, from, text) {
  if (!text || !labels.length) return null;
  const order = [];
  for (let step = 1; step <= labels.length; step++) order.push((from + step + labels.length) % labels.length);
  for (const index of order) {
    const label = labels[index];
    if (typeof label === "string" && label.toLowerCase().startsWith(text)) return index;
  }
  return null;
}


/**
 * Where focus goes after a close (shared-frame Id + Cg close reasons).
 * - escape-key: back to the trigger.
 * - focus-out (Tab): nowhere; focus already moved.
 * - outside-press: back to the trigger only when focus is still inside the
 *   popup or on the body (skipRestoreOnOutsideFocus).
 * - item-click: the popup's finalFocus target when one exists, else the trigger;
 *   finalFocus === false suppresses restoration.
 */
export function restoreDecision({ reason, activeInsidePopup = false, activeIsBody = false, finalFocus }) {
  if (reason === "escape-key") return "trigger";
  if (reason === "focus-out" || reason === "trigger-press" || reason === "cancel-open") return "none";
  if (reason === "outside-press") return activeInsidePopup || activeIsBody ? "trigger" : "none";
  if (reason === "item-click") {
    if (finalFocus === false) return "none";
    return finalFocus === undefined || finalFocus === null ? "trigger" : "final";
  }
  return "none";
}

export function collisionInsets(padding = 8) {
  if (typeof padding === "number") return { top: padding, right: padding, bottom: padding, left: padding };
  return { top: padding?.top ?? 8, right: padding?.right ?? 8, bottom: padding?.bottom ?? 8, left: padding?.left ?? 8 };
}

/**
 * Positioner math: preferred side/align with Base UI style flip (only when the
 * opposite side has more room) and shift into the collision box.
 * `anchor` and `size` are rect-like objects in viewport pixels. `alignOffset`
 * moves the popup along the alignment axis (start: forward, end: backward).
 */
export function positionMenu({ anchor, size, viewport, side = "bottom", align = "start", sideOffset = ROOT_SIDE_OFFSET, alignOffset = 0, collisionPadding = 8 }) {
  const pad = collisionInsets(collisionPadding);
  const anchorWidth = anchor.width ?? anchor.right - anchor.left;
  const anchorHeight = anchor.height ?? anchor.bottom - anchor.top;
  const spaceBelow = viewport.height - pad.bottom - anchor.bottom - sideOffset;
  const spaceAbove = anchor.top - sideOffset - pad.top;
  const spaceRight = viewport.width - pad.right - anchor.right - sideOffset;
  const spaceLeft = anchor.left - sideOffset - pad.left;
  let resolved = side;
  if (side === "bottom" && size.height > spaceBelow && spaceAbove > spaceBelow) resolved = "top";
  else if (side === "top" && size.height > spaceAbove && spaceBelow > spaceAbove) resolved = "bottom";
  else if (side === "right" && size.width > spaceRight && spaceLeft > spaceRight) resolved = "left";
  else if (side === "left" && size.width > spaceLeft && spaceRight > spaceLeft) resolved = "right";
  const cross = (Number.isFinite(alignOffset) ? alignOffset : 0) * (align === "end" ? -1 : 1);
  let left, top, availableHeight;
  if (resolved === "top" || resolved === "bottom") {
    top = resolved === "bottom" ? anchor.bottom + sideOffset : anchor.top - sideOffset - size.height;
    left = (align === "end" ? anchor.right - size.width : align === "center" ? anchor.left + (anchorWidth - size.width) / 2 : anchor.left) + cross;
    availableHeight = resolved === "bottom" ? spaceBelow : spaceAbove;
  } else {
    left = resolved === "right" ? anchor.right + sideOffset : anchor.left - sideOffset - size.width;
    top = (align === "end" ? anchor.bottom - size.height : align === "center" ? anchor.top + (anchorHeight - size.height) / 2 : anchor.top) + cross;
    availableHeight = viewport.height - pad.top - pad.bottom;
  }
  return {
    left: Math.round(clamp(left, pad.left, viewport.width - pad.right - size.width) * 100) / 100,
    top: Math.round(clamp(top, pad.top, viewport.height - pad.bottom - size.height) * 100) / 100,
    side: resolved,
    align,
    availableHeight: Math.max(0, Math.floor(availableHeight)),
    availableWidth: Math.max(0, viewport.width - pad.left - pad.right),
  };
}

/** Jh(): a nested popup anchors to the parent popup's x/width and the trigger row's y/height. */
export function nestedAnchor(parentRect, rowRect) {
  const left = parentRect?.left ?? rowRect.left, width = parentRect?.width ?? rowRect.width;
  return { left, right: left + width, width, top: rowRect.top, bottom: rowRect.bottom, height: rowRect.height };
}

// Key specs ("cmd+shift+f", "escape", "p") and the older "Meta+Shift+F" / "⌘ N" forms both name keys.
const KEY_NAMES = { "⌘": "Meta", cmd: "Meta", command: "Meta", meta: "Meta", "⇧": "Shift", shift: "Shift", "⌥": "Alt", alt: "Alt", option: "Alt",
  "⌃": "Control", ctrl: "Control", control: "Control", esc: "Escape", escape: "Escape", enter: "Enter", return: "Enter" };

/** aria-keyshortcuts form: "Meta+," / "Shift+Enter" / "p". A spec keeps its key order and a chord's letter is
 *  upper-cased, so cmd+shift+f reads Meta+Shift+F as the older "Meta+Shift+F" props did. */
export function normalizeShortcut(keys) {
  if (!keys) return undefined;
  const parts = String(keys).trim().split(/[+\s]+/).filter(Boolean);
  const name = (part) => KEY_NAMES[part] ?? KEY_NAMES[part.toLowerCase()]
    ?? (part.length === 1 ? (parts.length > 1 ? part.toUpperCase() : part) : part[0].toUpperCase() + part.slice(1));
  return parts.map(name).join("+");
}


export const isNumericText = (text) => /^\d+$/.test(String(text ?? ""));

/** yc(): skeleton row plan; a number is one group (no separators), an array adds separators between groups. */
export function skeletonPlan(rows = 3, icon = false) {
  const widths = icon ? SKELETON_WIDTHS_ICON : SKELETON_WIDTHS_PLAIN;
  const groups = (Array.isArray(rows) ? rows : [rows]).filter((count) => count > 0);
  const plan = [];
  let index = 0;
  for (const [group, count] of (groups.length ? groups : [3]).entries()) {
    if (group > 0) plan.push({ separator: true });
    for (let end = index + count; index < end; index++) plan.push({ width: widths[index % widths.length], icon, first: index === 0 });
  }
  return plan;
}

/** R_: rows to draw while busy; retained height wins over the placeholder count. */
export function pendingRows({ retainedHeight = 0, placeholderRows = 3 }) {
  return retainedHeight > 0 ? Math.ceil(retainedHeight / SKELETON_ROW_ESTIMATE) : placeholderRows;
}

const withinBox = (px, py, x1, y1, x2, y2) => px >= Math.min(x1, x2) && px <= Math.max(x1, x2) && py >= Math.min(y1, y2) && py <= Math.max(y1, y2);
const withinRect = (px, py, rect) => px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
/** Ray-casting point-in-polygon over [x, y] vertices. */
export function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Safe-polygon corridor between a submenu trigger row and its child popup
 * (floating-ui safePolygon as used by Base UI SubmenuTrigger with closeDelay 0):
 * the quadrilateral from the point where the pointer left the trigger to the
 * child's near edge, plus the direct gap between the two rects.
 * Returns the polygon vertices for `side` (the child's side relative to the row).
 */
export function safePolygonPoints({ side, origin, reference, floating, buffer = SAFE_POLYGON_BUFFER }) {
  const wider = floating.width > reference.width, taller = floating.height > reference.height;
  const originRightHalf = origin.x > floating.right - floating.width / 2;
  const originBottomHalf = origin.y > floating.bottom - floating.height / 2;
  if (side === "top" || side === "bottom") {
    const spread = wider ? buffer / 2 : buffer * 4;
    const x1 = wider || originRightHalf ? origin.x + spread : origin.x - spread;
    const x2 = wider ? origin.x - spread : originRightHalf ? origin.x + spread : origin.x - spread;
    if (side === "top") {
      const y = origin.y + buffer + 1;
      const nearLeft = originRightHalf || wider ? floating.bottom - buffer : floating.top;
      const nearRight = originRightHalf ? (wider ? floating.bottom - buffer : floating.top) : floating.bottom - buffer;
      return [[x1, y], [x2, y], [floating.left, nearLeft], [floating.right, nearRight]];
    }
    const y = origin.y - buffer;
    const nearLeft = originRightHalf || wider ? floating.top + buffer : floating.bottom;
    const nearRight = originRightHalf ? (wider ? floating.top + buffer : floating.bottom) : floating.top + buffer;
    return [[x1, y], [x2, y], [floating.left, nearLeft], [floating.right, nearRight]];
  }
  const spread = taller ? buffer / 2 : buffer * 4;
  const y1 = taller || originBottomHalf ? origin.y + spread : origin.y - spread;
  const y2 = taller ? origin.y - spread : originBottomHalf ? origin.y + spread : origin.y - spread;
  if (side === "left") {
    const x = origin.x + buffer + 1;
    const nearTop = originBottomHalf || taller ? floating.right - buffer : floating.left;
    const nearBottom = originBottomHalf ? (taller ? floating.right - buffer : floating.left) : floating.right - buffer;
    return [[nearTop, floating.top], [nearBottom, floating.bottom], [x, y1], [x, y2]];
  }
  const x = origin.x - buffer;
  const nearTop = originBottomHalf || taller ? floating.left + buffer : floating.right;
  const nearBottom = originBottomHalf ? (taller ? floating.left + buffer : floating.right) : floating.left + buffer;
  return [[x, y1], [x, y2], [nearTop, floating.top], [nearBottom, floating.bottom]];
}

/**
 * One pointer sample after the pointer left a submenu trigger while its child
 * popup is open. `state` = { side, origin, reference, floating, landed };
 * `sample` = { x, y, leave, insideFloating, insideReference,
 * relatedInsideFloating, descendantOpen, speed }. `speed` is px/ms (Infinity
 * when unknown) or a function returning it, invoked only when the resting
 * check is actually reached so the caller records its previous sample the way
 * floating-ui does (never on the leave sample or on early returns).
 * Returns { verdict: "stay" | "close" | "linger", landed } where "linger" means
 * the pointer is inside the corridor but has not reached the child yet: close
 * after SAFE_POLYGON_LINGER ms unless another sample arrives.
 */
export function safePolygonStep(state, sample) {
  const { side, origin, reference, floating } = state;
  let landed = !!state.landed;
  const { x, y, leave = false, insideFloating = false, insideReference = false, relatedInsideFloating = false, descendantOpen = false, speed = Infinity } = sample;
  const stay = () => ({ verdict: "stay", landed });
  const close = () => ({ verdict: "close", landed });
  if (insideFloating) { landed = true; if (!leave) return stay(); }
  if (insideReference) { landed = false; if (!leave) { landed = true; return stay(); } }
  if (leave && relatedInsideFloating) return stay();
  if (descendantOpen) return stay();
  if (!reference || !floating || !origin || !side) return close();
  const escaped = (side === "top" && origin.y >= reference.bottom - 1) || (side === "bottom" && origin.y <= reference.top + 1)
    || (side === "left" && origin.x >= reference.right - 1) || (side === "right" && origin.x <= reference.left + 1);
  if (escaped) return close();
  const spanX = floating.width > reference.width ? reference : floating;
  const spanY = floating.height > reference.height ? reference : floating;
  const inGap = side === "top" ? withinBox(x, y, spanX.left, reference.top + 1, spanX.right, floating.bottom - 1)
    : side === "bottom" ? withinBox(x, y, spanX.left, floating.top + 1, spanX.right, reference.bottom - 1)
    : side === "left" ? withinBox(x, y, floating.right - 1, spanY.bottom, reference.left + 1, spanY.top)
    : withinBox(x, y, reference.right - 1, spanY.bottom, floating.left + 1, spanY.top);
  if (inGap) return stay();
  if (landed && !withinRect(x, y, reference)) return close();
  if (!leave && (typeof speed === "function" ? speed() : speed) < SAFE_POLYGON_MIN_SPEED) return close();
  if (!pointInPolygon(x, y, safePolygonPoints({ side, origin, reference, floating }))) return close();
  return landed ? stay() : { verdict: "linger", landed };
}

/** eh(): the sheet branch when the coarse-pointer query matches or the tree already is a sheet. */
export const sheetBranch = (coarsePointer, insideSheetTree = false) => Boolean(coarsePointer) || Boolean(insideSheetTree);
