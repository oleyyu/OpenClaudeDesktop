import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Computer use M1: the screenshot budget (BIHZCoding/claude-cu-spec docs/06) and the coordinate chain.
// electron/computer-use/budget.cjs mirrors native Capture.swift TokenBudget; service.cjs refuses a native capture whose
// size differs from fit() here, so this file pins the sizes both sides must produce.
const require = createRequire(import.meta.url);
const budget = require('../electron/computer-use/budget.cjs');
const { BUDGET, HIGH_BUDGET, JPEG_QUALITY, fit, fits, tokens, scaled, frameToWindowLocal, windowLocalToScreen, inFrame } = budget;

test('budget constants are docs/06 verbatim: 28 px per token, 1568 px, 1568 tokens; JPEG 0.75', () => {
  assert.deepEqual({ ...BUDGET }, { pxPerToken: 28, maxTargetPx: 1568, maxTargetTokens: 1568 });
  assert.deepEqual({ ...HIGH_BUDGET }, { pxPerToken: 28, maxTargetPx: 2576, maxTargetTokens: 4784 });
  assert.equal(JPEG_QUALITY, 0.75);
  assert.equal(tokens(28, 28), 1);
  assert.equal(tokens(29, 28), 2);
});

const SIZES = [[3024, 1964], [3456, 2234], [2560, 1600], [1920, 1080], [5120, 2880], [1000, 800], [1568, 1568], [800, 3000],
  [1, 1], [30000, 10], [10, 30000], [1372, 891], [1569, 100], [2048, 2048], [640, 4000]];

test('fit(): within budget, aspect kept to a pixel, and the largest such size', () => {
  for (const [w, h] of SIZES) {
    const [fw, fh] = fit(w, h);
    const label = `${w}×${h} → ${fw}×${fh}`;
    assert.ok(fw <= 1568 && fh <= 1568, `${label}: edge within 1568`);
    assert.ok(Math.ceil(fw / 28) * Math.ceil(fh / 28) <= 1568, `${label}: tokens within 1568`);
    if (fits(w, h)) { assert.deepEqual([fw, fh], [w, h], `${label}: a size that fits is returned as is`); continue; }
    const long = Math.max(w, h), short = Math.min(w, h), [fl, fs] = w >= h ? [fw, fh] : [fh, fw];
    assert.ok(Math.abs(fs - (fl * short) / long) <= 0.5 + 1e-9 || fs === 1, `${label}: aspect within 1px`);
    const next = fl + 1, nextShort = Math.max(1, Math.round((next * short) / long));
    assert.equal(fits(next, nextShort), false, `${label}: one more pixel on the long edge breaks the budget`);
  }
});

test('fit(): portrait is the landscape answer swapped', () => {
  for (const [w, h] of SIZES) assert.deepEqual(fit(h, w), fit(w, h).reverse(), `${w}×${h}`);
});

test('fit(): pinned sizes for common Mac frames', () => {
  assert.deepEqual(fit(3024, 1964), [1372, 891]);   // 14" MacBook Pro, Retina
  assert.deepEqual(fit(3456, 2234), [1372, 887]);   // 16" MacBook Pro, Retina
  assert.deepEqual(fit(2560, 1600), [1389, 868]);
  assert.deepEqual(fit(1920, 1080), [1456, 819]);
  assert.deepEqual(fit(1000, 800), [1000, 800]);
  assert.deepEqual(fit(800, 3000), [418, 1568]);    // portrait: limited by the 1568 px edge
});

test('scale only shrinks the returned image', () => {
  assert.deepEqual(scaled([1372, 891], 1), [1372, 891]);
  assert.deepEqual(scaled([1372, 891], 0.5), [686, 446]);
  assert.deepEqual(scaled([3, 3], 0.1), [1, 1]);
});

test('coordinate chain: frame px ÷ scaleFactor → window-local point → global screen point (negative origins kept)', () => {
  const shot = { frameWidth: 2400, frameHeight: 1600, scaleFactor: 2, bounds: { x: -1200, y: 40, width: 1200, height: 800 } };
  const local = frameToWindowLocal([600, 300], shot);
  assert.deepEqual(local, { x: 300, y: 150 });
  assert.deepEqual(windowLocalToScreen(local, shot.bounds), { x: -900, y: 190 });
  // Without a reported factor it is derived from the frame and the bounds.
  assert.deepEqual(frameToWindowLocal([600, 300], { ...shot, scaleFactor: 0 }), { x: 300, y: 150 });
  assert.equal(inFrame([2399, 1599], shot), true);
  assert.equal(inFrame([2400, 10], shot), false);
  assert.equal(inFrame([-1, 10], shot), false);
  assert.equal(inFrame([Number.NaN, 10], shot), false);
});
