import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isOnceState, resolveSparkRendering, sparkBox, sparkKeyframes, sparkTiming, validateSparkStrip } from "../src/spark-sprite-model.mjs";
import { transcriptStatusPresentation } from "../src/transcript-status-model.mjs";

const strip = JSON.parse(readFileSync(new URL("../src/generated/spark-thinking.json", import.meta.url), "utf8"));

test("extracted thinking strip is the classic row's single-path 9x90 strip", () => {
  assert.equal(validateSparkStrip(strip), true);
  assert.deepEqual([strip.name, strip.viewBox, strip.width, strip.height, strip.frameCount, strip.speed], ["thinking", "0 0 100 900", 100, 100, 9, 90]);
  assert.ok(!/[<>"'&]/.test(strip.path), "path is data only");
  assert.equal(validateSparkStrip({ ...strip, path: "<script>" }), false);
  assert.equal(validateSparkStrip({ ...strip, frameCount: 0 }), false);
  assert.equal(validateSparkStrip(null), false);
});

test("keyframes step through every frame by whole-frame translateY percentages", () => {
  const frames = sparkKeyframes(9);
  assert.equal(frames.length, 9);
  assert.equal(frames[0].transform, "translateY(-0%)");
  const values = frames.map((frame) => Number(/translateY\(-([\d.]+)%\)/.exec(frame.transform)[1]));
  for (let index = 0; index < 9; index += 1) assert.ok(Math.abs(values[index] - (100 / 9) * index) < 1e-9);
  assert.ok(Math.abs(values.at(-1) - 88.8888888) < 0.001);
  assert.deepEqual(sparkKeyframes(0), [{ transform: "translateY(-0%)" }]);
});

test("timing: 9 x 90ms = 810ms infinite steps for thinking; once for entrance/exit/tickle", () => {
  assert.deepEqual(sparkTiming({ frameCount: 9, speed: 90 }), { duration: 810, iterations: Infinity, easing: "steps(9, jump-none)", fill: "forwards" });
  assert.deepEqual(sparkTiming({ frameCount: 6, speed: 70, once: true }), { duration: 420, iterations: 1, easing: "steps(6, jump-none)", fill: "forwards" });
  for (const state of ["entrance", "exit", "tickle"]) assert.equal(isOnceState(state), true);
  for (const state of ["thinking", "writing", "idle", undefined]) assert.equal(isOnceState(state), false);
});

test("box keeps the frame aspect ratio at Wi(size)", () => {
  assert.deepEqual(sparkBox(18, strip), { width: "calc(1.125rem * var(--cds-rem-scale, 1))", height: "calc(1.125rem * var(--cds-rem-scale, 1))" });
  assert.deepEqual(sparkBox(16, { width: 100, height: 50 }), { width: "calc(1rem * var(--cds-rem-scale, 1))", height: "calc(0.5rem * var(--cds-rem-scale, 1))" });
});

test("rendering resolution: idle static, busy fallback while reduced/loading/failed, sprite otherwise", () => {
  assert.equal(resolveSparkRendering({ state: undefined }), "static");
  assert.equal(resolveSparkRendering({ state: "idle", strip }), "static");
  assert.equal(resolveSparkRendering({ state: "thinking" }), "static-fallback");
  assert.equal(resolveSparkRendering({ state: "thinking", strip: "failed" }), "static-fallback");
  assert.equal(resolveSparkRendering({ state: "thinking", strip, reducedMotion: true }), "static-fallback");
  assert.equal(resolveSparkRendering({ state: "thinking", strip }), "sprite");
});

