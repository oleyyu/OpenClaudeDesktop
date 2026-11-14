import test from "node:test";
import assert from "node:assert/strict";
import { SHRINK_WRAP_MAX_PROBES, acceptable, advanceProbe, createProbeState, initialCandidate, resizeWarrantsMeasure } from "../src/shrink-wrap-model.mjs";

const natural = { height: 60, overflow: 400, client: 400, spill: 0, clipped: 0, widths: [380.2, 371.9, 120.4] };

test("initial candidate is the inline span plus box extras, or null when nothing is saved", () => {
  assert.equal(initialCandidate({ boxWidth: 400, borderBox: true, extras: 24, left: 100, right: 470, scale: 1 }), 394);
  assert.equal(initialCandidate({ boxWidth: 400, borderBox: false, extras: 24, left: 100, right: 470, scale: 1 }), 370);
  assert.equal(initialCandidate({ boxWidth: 400, borderBox: true, extras: 24, left: 100, right: 476, scale: 1 }), null, "saves less than half a pixel");
  assert.equal(initialCandidate({ boxWidth: 400, borderBox: true, extras: 24, left: 100, right: 470, scale: 2 }), 209, "client rects are divided by the visual scale");
  assert.equal(initialCandidate({ boxWidth: 0, borderBox: true, extras: 0, left: 0, right: 10 }), null);
  assert.equal(initialCandidate({ boxWidth: 400, borderBox: true, extras: 0, left: Infinity, right: -Infinity }), null);
});

test("acceptance requires identical line rects and no new overflow, height, spill or clipping", () => {
  assert.equal(acceptable(natural, { ...natural }), true);
  assert.equal(acceptable(natural, { ...natural, widths: [380.6, 371.9, 120.4] }), true, "0.5px tolerance");
  assert.equal(acceptable(natural, { ...natural, widths: [380.8, 371.9, 120.4] }), false);
  assert.equal(acceptable(natural, { ...natural, widths: [380.2, 371.9] }), false, "line count changed");
  assert.equal(acceptable(natural, { ...natural, height: 61 }), false);
  assert.equal(acceptable(natural, { ...natural, overflow: 401 }), false, "horizontal overflow");
  assert.equal(acceptable(natural, { ...natural, spill: 1 }), false);
  assert.equal(acceptable(natural, { ...natural, clipped: 1 }), false);
});

test("verify, one-pixel and two-pixel nudges settle immediately when accepted", () => {
  let state = createProbeState({ boxWidth: 400, candidate: 370 });
  assert.deepEqual(advanceProbe(state, true), { settled: 370 });
  state = createProbeState({ boxWidth: 400, candidate: 370 });
  assert.deepEqual(advanceProbe(state, false), { probe: 371 });
  assert.deepEqual(advanceProbe(state, true), { settled: 371 });
  state = createProbeState({ boxWidth: 400, candidate: 370 });
  advanceProbe(state, false); advanceProbe(state, false);
  assert.deepEqual(advanceProbe(state, true), { settled: 372 });
});

test("bisection narrows between candidate+2 and the box width and settles on the tightest accepted width", () => {
  const state = createProbeState({ boxWidth: 400, candidate: 370 });
  advanceProbe(state, false); advanceProbe(state, false);
  let step = advanceProbe(state, false);
  assert.deepEqual(step, { probe: 386 }, "first midpoint of [372, 400]");
  const accepted = width => width >= 390;
  const trail = [];
  while ("probe" in step) { trail.push(step.probe); step = advanceProbe(state, accepted(step.probe)); }
  assert.deepEqual(step, { settled: 390 });
  assert.ok(trail.length <= SHRINK_WRAP_MAX_PROBES + 1);
  assert.deepEqual(trail, [386, 393, 389, 391, 390]);
});

test("bisection gives up when nothing tighter than the box exists or the probe budget is spent", () => {
  let state = createProbeState({ boxWidth: 400, candidate: 370 });
  advanceProbe(state, false); advanceProbe(state, false);
  let step = advanceProbe(state, false);
  while ("probe" in step) step = advanceProbe(state, false);
  assert.deepEqual(step, { settled: null });
  state = createProbeState({ boxWidth: 400, candidate: 398 });
  assert.deepEqual(advanceProbe(state, false), { probe: 399 });
  assert.deepEqual(advanceProbe(state, false), { settled: null }, "no 2px nudge or bisection range remains");
  state = createProbeState({ boxWidth: 4000, candidate: 10 });
  advanceProbe(state, false); advanceProbe(state, false);
  step = advanceProbe(state, false);
  let probes = 0;
  while ("probe" in step) { probes++; step = advanceProbe(state, probes % 2 === 0); }
  assert.ok(probes <= SHRINK_WRAP_MAX_PROBES, `bounded to ${SHRINK_WRAP_MAX_PROBES} probes, used ${probes}`);
  assert.deepEqual(advanceProbe(state, true), { settled: null }, "a settled state never re-probes");
});

test("self resizes that only echo the applied width do not re-measure; ancestor inline changes do", () => {
  assert.equal(resizeWarrantsMeasure({ self: true, inline: 371, block: 60, prevInline: 400, prevBlock: 60, applied: 370 }), false);
  assert.equal(resizeWarrantsMeasure({ self: true, inline: 371, block: 80, prevInline: 400, prevBlock: 60, applied: 370 }), true);
  assert.equal(resizeWarrantsMeasure({ self: true, inline: 300, block: 60, prevInline: 400, prevBlock: 60, applied: 370 }), true);
  assert.equal(resizeWarrantsMeasure({ self: true, inline: 300, block: 60, prevInline: 400, prevBlock: 60, applied: null }), true);
  assert.equal(resizeWarrantsMeasure({ self: false, inline: 800, block: 900, prevInline: 800.5, prevBlock: 100 }), false);
  assert.equal(resizeWarrantsMeasure({ self: false, inline: 700, block: 100, prevInline: 800, prevBlock: 100 }), true);
});
