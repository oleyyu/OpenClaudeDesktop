// Pure Spark sprite arithmetic (shared-frame uv/dv). No DOM, no timers.
// A strip is {viewBox, path, width, height, frameCount, speed}; the wrapper
// shows one frame and the strip slides by whole frames with a step easing.
const ONCE_STATES = new Set(["entrance", "exit", "tickle"]);

export function isOnceState(state) {
  return ONCE_STATES.has(state);
}

export function sparkKeyframes(frameCount) {
  const count = Math.max(1, Math.trunc(frameCount));
  return Array.from({ length: count }, (_, index) => ({ transform: `translateY(-${(100 / count) * index}%)` }));
}

export function sparkTiming({ frameCount, speed, once = false }) {
  const count = Math.max(1, Math.trunc(frameCount));
  return {
    duration: speed * count,
    iterations: once ? 1 : Infinity,
    easing: `steps(${count}, jump-none)`,
    fill: "forwards",
  };
}

// Wi(n) = calc(n/16 rem * rem-scale). The strip is `width` wide and shows one
// `height`-tall frame, so the wrapper height keeps the frame aspect ratio.
const rem = (px) => `calc(${px / 16}rem * var(--cds-rem-scale, 1))`;
export function sparkBox(size, { width, height }) {
  return { width: rem(size), height: rem((height / width) * size) };
}

// 'static': idle/undefined state uses the plain Spark svg.
// 'static-fallback': a busy state that cannot animate (reduced motion, strip
// still loading, or the strip module failed) keeps the plain svg.
// 'sprite': the animated strip.
export function resolveSparkRendering({ state, reducedMotion = false, strip = null } = {}) {
  if (state === undefined || state === null || state === "idle") return "static";
  if (reducedMotion || !strip || strip === "failed") return "static-fallback";
  return "sprite";
}

export function validateSparkStrip(strip) {
  return Boolean(strip && typeof strip === "object"
    && typeof strip.viewBox === "string" && /^0 0 \d+ \d+$/.test(strip.viewBox)
    && typeof strip.path === "string" && strip.path.length > 0 && /^[mMlLhHvVcCsSqQtTaAzZ0-9 .,-]+$/.test(strip.path)
    && Number.isInteger(strip.width) && strip.width > 0 && Number.isInteger(strip.height) && strip.height > 0
    && Number.isInteger(strip.frameCount) && strip.frameCount > 0 && Number.isFinite(strip.speed) && strip.speed > 0);
}
