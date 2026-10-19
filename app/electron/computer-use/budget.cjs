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

module.exports = { BUDGET, HIGH_BUDGET, JPEG_QUALITY, tokens, fits, fit, scaled, frameToWindowLocal, windowLocalToScreen, inFrame };
