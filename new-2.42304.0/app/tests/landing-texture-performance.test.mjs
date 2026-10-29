import test from 'node:test';
import assert from 'node:assert/strict';
import { landingRenderViewport, configureLandingPerformance, createLandingFrameLoop } from '../src/landing-texture-performance.mjs';

test('Retina and large displays keep their CSS extent within the pixel budget', () => {
  for (const [width, height, dpr] of [[1200, 800, 1], [1470, 923, 2], [2560, 1440, 2], [3840, 2160, 2], [800, 600, 3]]) {
    const view = landingRenderViewport({ deviceWidth: width * dpr, deviceHeight: height * dpr, devicePixelRatio: dpr }, 2_073_600);
    assert.ok(view.deviceWidth * view.deviceHeight <= 2_073_600);
    assert.ok(view.devicePixelRatio <= 1.5);
    assert.ok(Math.abs(view.deviceWidth / view.devicePixelRatio - width) < 2);
    assert.ok(Math.abs(view.deviceHeight / view.devicePixelRatio - height) < 2);
  }
});

test('ambient and ripple schedules share a budget, with a short idle settling period', () => {
  const config = configureLandingPerformance({ grid: {}, power: { frameMs: 40 } });
  assert.equal(config.power.rippleFrameMs, 1000 / 60);
  assert.equal(config.power.budgetS, 30);
});

test('60 Hz and 120 Hz displays draw 60 evenly spaced frames per second without timer drift', () => {
  for (const hz of [60, 120]) {
    let now = 0, next = 0;
    const frames = new Map(), times = [], events = new Map();
    const target = { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
    const doc = { ...target, hidden: false, hasFocus: () => true };
    const win = { ...target, document: doc, performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id) };
    const loop = createLandingFrameLoop(win, () => { times.push(now); now += 3; });
    loop.setRunning(true);
    for (let i = 1; i <= hz; i++) {
      now = i * 1000 / hz;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(fn => fn(now));
    }
    assert.equal(times.length, 60);
    for (let i = 1; i < times.length; i++) assert.ok(Math.abs(times[i] - times[i - 1] - 1000 / 60) < .001);
    doc.hidden = true; events.get('visibilitychange')();
    assert.equal(frames.size, 0);
    loop.destroy();
    assert.equal(events.size, 0);
  }
});
