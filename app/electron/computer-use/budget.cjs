// Screenshot size budget and the coordinate chain (BIHZCoding/claude-cu-spec docs/06). Mirrors
// native/computer-use/Sources/ComputerUseCore/Capture.swift TokenBudget: the native side sizes the capture, this side
// checks it and converts the model's coordinates.
//
//   var iH  = { pxPerToken: 28, maxTargetPx: 1568, maxTargetTokens: 1568 }   (default)
//   var Hsr = { pxPerToken: 28, maxTargetPx: 2576, maxTargetTokens: 4784 }   (high budget)
//   jpegQuality 0.75, hard-coded
//
// Coordinates the model passes are pixels of the screenshot's full-resolution frame (frameWidth × frameHeight),
// never of the scaled image: frame px ÷ scaleFactor = window-local point; + window origin = global screen point
// (top-left origin, multi-display global space).
const BUDGET = Object.freeze({ pxPerToken: 28, maxTargetPx: 1568, maxTargetTokens: 1568 });
const HIGH_BUDGET = Object.freeze({ pxPerToken: 28, maxTargetPx: 2576, maxTargetTokens: 4784 });
const JPEG_QUALITY = 0.75;

const tokens = (w, h, budget = BUDGET) => Math.ceil(w / budget.pxPerToken) * Math.ceil(h / budget.pxPerToken);
const fits = (w, h, budget = BUDGET) => w <= budget.maxTargetPx && h <= budget.maxTargetPx && tokens(w, h, budget) <= budget.maxTargetTokens;

/** aH(w, h, budget): as is when it fits; portrait swaps; else the largest long edge whose aspect-kept size fits. */
function fit(width, height, budget = BUDGET) {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  if (fits(w, h, budget)) return [w, h];
  if (h > w) { const [b, a] = fit(h, w, budget); return [a, b]; }
  const short = (long) => Math.max(1, Math.round((long * h) / w));
  let lo = 1, hi = w;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (fits(mid, short(mid), budget)) lo = mid; else hi = mid - 1;
  }
  return [lo, short(lo)];
}

/** oH([w, h], scale): the returned image only. */
const scaled = ([w, h], scale = 1) => [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];

/** A frame point of a window capture → window-local point (points). */
function frameToWindowLocal([x, y], shot) {
  const factor = shot.scaleFactor > 0 ? shot.scaleFactor : shot.frameWidth / shot.bounds.width;
  return { x: x / factor, y: y / factor };
}

/** Window-local point → global screen point. */
const windowLocalToScreen = (point, bounds) => ({ x: bounds.x + point.x, y: bounds.y + point.y });

/** Whether a frame point lies inside the capture's frame. */
const inFrame = ([x, y], shot) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < shot.frameWidth && y < shot.frameHeight;

/**
 * The display-scope coordinate frame (official §1.1 "pixels" mode, BEf0UhNC R()): the pixels of the last full-screen
 * screenshot's image at scale 1 — fit(frame) — never the physical pixels, and never the scaled image when scale < 1
 * (the official frameWidth). A screenshot at scale 0.5 still answers in this frame.
 */
const displayCoordFrame = (shot) => { const [width, height] = fit(shot.frameWidth, shot.frameHeight); return { width, height }; };

/**
 * An image point of the last display screenshot → a global screen point (points, top-left origin), official R():
 * X = round(x · displayWidth / frameW) + originX, clamped to the display. null when the point is outside the frame.
 */
function imageToDisplayPoint([x, y], shot) {
  const frame = displayCoordFrame(shot), b = shot.displayBounds;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > frame.width || y > frame.height || !b) return null;
  const clamp = (v, lo, size) => Math.min(lo + size - 1, Math.max(lo, v));
  return { x: clamp(Math.round((x * b.width) / frame.width) + b.x, b.x, b.width), y: clamp(Math.round((y * b.height) / frame.height) + b.y, b.y, b.height) };
}

/** A global point → that screenshot's image pixels, or null when the point is on another display (cursor_position). */
function displayPointToImage({ x, y }, shot) {
  const frame = displayCoordFrame(shot), b = shot.displayBounds;
  if (!b || x < b.x || y < b.y || x >= b.x + b.width || y >= b.y + b.height) return null;
  return { x: Math.round(((x - b.x) * frame.width) / b.width), y: Math.round(((y - b.y) * frame.height) / b.height) };
}

/**
 * zoom's region [x0, y0, x1, y1] in the screenshot's image pixels → a display-local rect in points (captureScreen region).
 * The scale rarely divides evenly (1512×982 points in a 1372×891 frame), so a region at the right or bottom edge can
 * come out a rounding ulp past the display; the edges are clamped to the display, and the size taken from the clamped
 * edges, so a region inside the frame always lies inside the display.
 */
function imageRegionToDisplayRect([x0, y0, x1, y1], shot) {
  const frame = displayCoordFrame(shot), b = shot.displayBounds;
  const sx = b.width / frame.width, sy = b.height / frame.height;
  const clamp = (v, size) => Math.min(size, Math.max(0, v));
  const left = clamp(x0 * sx, b.width), top = clamp(y0 * sy, b.height);
  const right = clamp(x1 * sx, b.width), bottom = clamp(y1 * sy, b.height);
  let width = right - left, height = bottom - top;
  // left + width can still exceed the edge by an ulp after the subtraction: take it off the size.
  if (left + width > b.width) width = b.width - left;
  if (top + height > b.height) height = b.height - top;
  return { x: left, y: top, width, height };
}

module.exports = { BUDGET, HIGH_BUDGET, JPEG_QUALITY, tokens, fits, fit, scaled, frameToWindowLocal, windowLocalToScreen, inFrame, displayCoordFrame, imageToDisplayPoint, displayPointToImage, imageRegionToDisplayRect };
