// Standalone helpers for the 2.2553.1 CDS Tooltip reimplementation. No official
// business JS is imported or executed. Source lineage is in INTEGRATION.md.
export const TOOLTIP_TIMING = Object.freeze({
  open: 300,
  groupOpen: 600,
  groupClose: 200,
  warm: 400,
  transition: 120,
});

export function emptyTooltipContent(value) {
  return (
    value == null ||
    value === "" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every(emptyTooltipContent))
  );
}

export function createTooltipGroupState({
  closeDelay = TOOLTIP_TIMING.groupClose,
  schedule = setTimeout,
  cancel = clearTimeout,
} = {}) {
  let current = null,
    warm = false,
    timer = null;
  return {
    closeDelay,
    openingDelay(requested = TOOLTIP_TIMING.open) {
      return warm ? 0 : requested;
    },
    opened(id) {
      if (timer != null) cancel(timer);
      timer = null;
      current = id;
      warm = true;
    },
    closed(id) {
      if (current !== id) return;
      current = null;
      if (timer != null) cancel(timer);
      timer = schedule(() => {
        timer = null;
        if (current == null) warm = false;
      }, TOOLTIP_TIMING.warm);
    },
    removed(id) {
      if (current !== id) return;
      current = null;
      warm = false;
      if (timer != null) cancel(timer);
      timer = null;
    },
    dispose() {
      if (timer != null) cancel(timer);
      timer = null;
      current = null;
      warm = false;
    },
  };
}

export function createTooltipRegistry() {
  let owner = null;
  return {
    claim(next) {
      const previous = owner;
      owner = next;
      if (previous && previous !== next) previous.closeInstant("other-tooltip");
    },
    release(expected) {
      if (owner === expected) owner = null;
    },
    isCurrent(expected) {
      return owner === expected;
    },
  };
}

export function normalizePadding(value = 5) {
  return typeof value === "number"
    ? { top: value, right: value, bottom: value, left: value }
    : {
        top: value?.top ?? 0,
        right: value?.right ?? 0,
        bottom: value?.bottom ?? 0,
        left: value?.left ?? 0,
      };
}

const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
const clamp = (value, min, max) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

export function computeTooltipPosition(
  anchor,
  popup,
  bounds,
  {
    side = "top",
    align = "center",
    sideOffset = 4,
    collisionPadding = 5,
    referenceBounds = bounds,
  } = {},
) {
  const pad = normalizePadding(collisionPadding);
  const clip = {
    left: bounds.left + pad.left,
    right: bounds.right - pad.right,
    top: bounds.top + pad.top,
    bottom: bounds.bottom - pad.bottom,
  };
  const available = {
    top: anchor.top - sideOffset - clip.top,
    bottom: clip.bottom - anchor.bottom - sideOffset,
    left: anchor.left - sideOffset - clip.left,
    right: clip.right - anchor.right - sideOffset,
  };
  const primarySize =
    side === "top" || side === "bottom" ? popup.height : popup.width;
  let actualSide = side;
  if (
    available[side] < primarySize &&
    available[opposite[side]] > available[side]
  )
    actualSide = opposite[side];
  const vertical = actualSide === "top" || actualSide === "bottom";
  const cross = vertical
    ? align === "start"
      ? anchor.left
      : align === "end"
        ? anchor.right - popup.width
        : (anchor.left + anchor.right - popup.width) / 2
    : align === "start"
      ? anchor.top
      : align === "end"
        ? anchor.bottom - popup.height
        : (anchor.top + anchor.bottom - popup.height) / 2;
  let x = vertical
    ? cross
    : actualSide === "left"
      ? anchor.left - sideOffset - popup.width
      : anchor.right + sideOffset;
  let y = !vertical
    ? cross
    : actualSide === "top"
      ? anchor.top - sideOffset - popup.height
      : anchor.bottom + sideOffset;
  x = clamp(x, clip.left, clip.right - popup.width);
  y = clamp(y, clip.top, clip.bottom - popup.height);
  const anchorHidden =
    anchor.bottom <= referenceBounds.top ||
    anchor.top >= referenceBounds.bottom ||
    anchor.right <= referenceBounds.left ||
    anchor.left >= referenceBounds.right;
  const originX = clamp((anchor.left + anchor.right) / 2 - x, 0, popup.width);
  const originY = clamp((anchor.top + anchor.bottom) / 2 - y, 0, popup.height);
  return {
    x,
    y,
    side: actualSide,
    anchorHidden,
    origin: vertical
      ? `${originX}px ${actualSide === "top" ? `calc(100% + ${sideOffset}px)` : `${-sideOffset}px`}`
      : `${actualSide === "left" ? `calc(100% + ${sideOffset}px)` : `${-sideOffset}px`} ${originY}px`,
  };
}

// vendor-frame-BmPfNbgY.js:16554-16602 js (floating-ui useClientPoint virtual
// element) for Nu trackCursorAxis (shared-frame-C_2npUJq.js:4592 -> Bu Ns):
// axis "y" keeps the trigger's x-range at the pointer's clientY with zero
// height, "x" the y-range at clientX with zero width, "both" is the point.
// Without a pointer (keyboard focus) the trigger rect is the anchor.
export function cursorAnchorRect(rect, point, axis = "none") {
  if (!point || !["x", "y", "both"].includes(axis)) return rect;
  const trackX = axis === "x" || axis === "both",
    trackY = axis === "y" || axis === "both";
  const left = trackX ? point.x : rect.left,
    top = trackY ? point.y : rect.top;
  const width = axis === "y" ? rect.width : 0,
    height = axis === "x" ? rect.height : 0;
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
}

export function intersectRect(a, b) {
  return {
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

function cross(origin, a, b) {
  return (
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
  );
}
export function safeHoverHull(origin, target, buffer = 1) {
  const points = [
    origin,
    { x: target.left - buffer, y: target.top - buffer },
    { x: target.right + buffer, y: target.top - buffer },
    { x: target.right + buffer, y: target.bottom + buffer },
    { x: target.left - buffer, y: target.bottom + buffer },
  ].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower = [],
    upper = [];
  for (const point of points) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0)
      lower.pop();
    lower.push(point);
  }
  for (const point of [...points].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0)
      upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function insideHoverHull(point, polygon) {
  if (polygon.length < 3) return false;
  let direction = 0;
  for (let index = 0; index < polygon.length; index++) {
    const value = cross(
      polygon[index],
      polygon[(index + 1) % polygon.length],
      point,
    );
    if (Math.abs(value) < 0.01) continue;
    const next = Math.sign(value);
    if (direction && direction !== next) return false;
    direction = next;
  }
  return true;
}

// A pointerleave event reports the new cursor coordinates, which may already
// be far outside both elements after one native mouse move. Making that point
// the corridor origin would include it forever until another movement occurs.
export function hoverExitCorridor(point, source, destination) {
  const origin = {
    x: clamp(point.x, source.left, source.right),
    y: clamp(point.y, source.top, source.bottom),
  };
  return insideHoverHull(point, safeHoverHull(origin, destination))
    ? origin
    : null;
}

export function isDismissalInput(event) {
  return (
    event.type === "pointerdown" ||
    (event.type === "keydown" &&
      !event.isComposing &&
      ["Escape", "Enter", " "].includes(event.key))
  );
}

export function isHandedBackFocus(event, history) {
  return (
    event.relatedTarget == null &&
    !!history?.observedInput &&
    !!history?.lastInputDismissing
  );
}
