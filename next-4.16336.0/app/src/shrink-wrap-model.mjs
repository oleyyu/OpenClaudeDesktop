// Pure decision logic for the ordinary user-bubble shrink-wrap measurement.
// Independent local implementation of the audited behavior; see
// analysis/user-actions-20260920/source-contract.md. No DOM access here so
// the probe sequence and acceptance rules are unit-testable.
export const SHRINK_WRAP_MAX_PROBES = 12;
export const SHRINK_WRAP_MAX_ROUNDS = 16;
export const SHRINK_WRAP_ANCESTOR_LIMIT = 16;
export const SHRINK_WRAP_ATTRIBUTE = "data-shrinkwrap";
export const SHRINK_WRAP_FILL = "fill";
const TOLERANCE = 0.5;

/** First candidate: the actual inline span of visible content plus the box's
 * own horizontal padding/border when it is border-box sized. A candidate that
 * would not remove at least half a pixel yields null (natural layout). */
export function initialCandidate({ boxWidth, borderBox, extras, left, right, scale = 1 }) {
  if (!Number.isFinite(boxWidth) || boxWidth <= 0) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right) || right < left) return null;
  const span = (right - left) / (scale || 1);
  const content = borderBox ? span + extras : span;
  const candidate = Math.ceil(content - 0.001);
  return candidate >= boxWidth - TOLERANCE ? null : candidate;
}

/** A probe is acceptable only when it changes nothing observable: same line
 * rect count, every rect width within 0.5px, no added height, no new
 * horizontal overflow, and no extra clipped or spilled content. */
export function acceptable(natural, probe) {
  if (probe.height > natural.height) return false;
  if (probe.overflow > probe.client + TOLERANCE) return false;
  if (probe.spill > natural.spill + TOLERANCE) return false;
  if (probe.clipped > natural.clipped + TOLERANCE) return false;
  if (natural.widths.length !== probe.widths.length) return false;
  return natural.widths.every((width, index) => Math.abs(width - (probe.widths[index] ?? NaN)) <= TOLERANCE);
}

export function createProbeState({ boxWidth, candidate }) {
  return { stage: "verify", boxWidth, candidate, lo: 0, hi: 0, probes: 0 };
}

/** Feed the acceptance result of the previously applied probe. Returns either
 * { probe } (apply this max-width and measure again) or { settled } where
 * settled is the final inline max-width in px, or null for natural layout.
 * Sequence: verify candidate → +1px → +2px → bounded bisection. */
export function advanceProbe(state, ok) {
  const box = state.boxWidth;
  const settle = value => { state.stage = "settled"; return { settled: value }; };
  if (state.stage === "verify") {
    if (ok) return settle(state.candidate);
    state.stage = "nudge1";
    if (state.candidate + 1 < box) return { probe: state.candidate + 1 };
    state.stage = "bisect";
  } else if (state.stage === "nudge1") {
    if (ok) return settle(state.candidate + 1);
    state.stage = "nudge2";
    if (state.candidate + 2 < box) return { probe: state.candidate + 2 };
    state.stage = "bisect";
  } else if (state.stage === "nudge2") {
    if (ok) return settle(state.candidate + 2);
    state.stage = "bisect";
  } else if (state.stage === "bisect") {
    state.probes += 1;
    const mid = state.lo > 0 ? Math.floor((state.lo + state.hi) / 2) : NaN;
    if (ok) state.hi = mid; else state.lo = mid;
  } else {
    return { settled: null };
  }
  if (state.lo === 0) { state.lo = state.candidate + 2; state.hi = Math.ceil(box); }
  if (state.probes >= SHRINK_WRAP_MAX_PROBES || state.hi - state.lo <= 1)
    return settle(state.hi < box - TOLERANCE ? state.hi : null);
  return { probe: Math.floor((state.lo + state.hi) / 2) };
}

/** Whether an observed resize warrants a new measurement. A self resize that
 * merely reflects the width we applied must not re-trigger. */
export function resizeWarrantsMeasure({ self, inline, block, prevInline, prevBlock, applied }) {
  if (self) {
    const ours = applied !== null && applied !== undefined && Math.abs(inline - applied) <= 1;
    return Math.abs(block - prevBlock) > 1 || (!ours && Math.abs(inline - prevInline) > 1);
  }
  return Math.abs(inline - prevInline) > 1;
}
