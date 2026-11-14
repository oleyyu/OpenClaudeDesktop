import test from 'node:test';
import assert from 'node:assert/strict';
import chrome from '../electron/window-chrome.cjs';
const { windowBackground, WINDOW_BACKGROUND, trafficLightPosition, scaleTrafficLights, clampZoomFactor, zoomLevelAfter, ZOOM_LEVEL, ZOOM_STEP, ZOOM_HINT_KEY, zoomFactorHint } = chrome;

test('window background follows the resolved appearance (index.chunk-ChZ67Jhw.js ssn/jP)', () => {
  assert.deepEqual(WINDOW_BACKGROUND, { light: '#fcfcfb', dark: '#151515' });
  assert.equal(windowBackground(true), '#151515');
  assert.equal(windowBackground(false), '#fcfcfb');
});

test('traffic lights follow aun/run: {17,17} at 100% and the button centre scales with the zoom', () => {
  assert.deepEqual(trafficLightPosition(1), { x: 17, y: 17 });
  assert.deepEqual(trafficLightPosition(), { x: 17, y: 17 });
  // round((16.5 + 6) * z - 6)
  assert.deepEqual(trafficLightPosition(0.8), { x: 12, y: 12 });
  assert.deepEqual(trafficLightPosition(1.25), { x: 22, y: 22 });
  assert.deepEqual(trafficLightPosition(1.2), { x: 21, y: 21 });
  assert.deepEqual(trafficLightPosition(1 / 1.2), { x: 13, y: 13 });
  // CP clamps the factor to [0.25, 5]; coordinates never go negative.
  assert.deepEqual(trafficLightPosition(0.1), trafficLightPosition(0.25));
  assert.deepEqual(trafficLightPosition(9), trafficLightPosition(5));
  assert.deepEqual(scaleTrafficLights({ x: 0, y: 0 }, 0.25), { x: 0, y: 0 });
  // Pane windows keep their own origin, scaled the same way.
  assert.deepEqual(scaleTrafficLights({ x: 14, y: 12 }, 1), { x: 14, y: 12 });
  assert.deepEqual(scaleTrafficLights({ x: 14, y: 12 }, 1.25), { x: 19, y: 17 });
  assert.equal(clampZoomFactor(Number.NaN), 1);
});

test('zoom steps follow ONr/SNr: ±.5 levels clamped to the Kon range, reset to 0', () => {
  assert.equal(ZOOM_STEP, 0.5);
  assert.equal(zoomLevelAfter(0, { delta: ZOOM_STEP }), 0.5);
  assert.equal(zoomLevelAfter(0.5, { delta: -ZOOM_STEP }), 0);
  assert.equal(zoomLevelAfter(2, { reset: true }), 0);
  assert.equal(zoomLevelAfter(ZOOM_LEVEL.MAX, { delta: ZOOM_STEP }), ZOOM_LEVEL.MAX);
  assert.equal(zoomLevelAfter(ZOOM_LEVEL.MIN, { delta: -ZOOM_STEP }), ZOOM_LEVEL.MIN);
  assert.ok(Math.abs(1.2 ** ZOOM_LEVEL.MAX - 5) < 1e-9 && Math.abs(1.2 ** ZOOM_LEVEL.MIN - 0.25) < 1e-9);
  assert.equal(zoomLevelAfter(1, {}), 1);
  assert.equal(zoomLevelAfter(Number.NaN, { delta: 'x' }), 0);
});

test('iSi snaps a step back onto the 0.5 grid; a zero step only clamps (B38)', () => {
  // A level restored from a factor hint carries float noise: the next step lands on the grid again.
  const restored = Math.log(1.2 ** 0.5) / Math.log(1.2);
  assert.equal(zoomLevelAfter(restored, { delta: ZOOM_STEP }), 1);
  assert.equal(zoomLevelAfter(0.3, { delta: ZOOM_STEP }), 1);
  assert.equal(zoomLevelAfter(0.2, { delta: -ZOOM_STEP }), -0.5);
  assert.ok(Object.is(zoomLevelAfter(0.5, { delta: -ZOOM_STEP }), 0), '+0 turns -0 into 0');
  assert.ok(Object.is(zoomLevelAfter(-0.4, { delta: ZOOM_STEP }), 0));
  // iSi(0) (the main window's focus) keeps an off-grid level and only clamps it.
  assert.equal(zoomLevelAfter(0.3, { delta: 0 }), 0.3);
  assert.equal(zoomLevelAfter(40, { delta: 0 }), ZOOM_LEVEL.MAX);
});

test('pBn/mBn zoom factor hint: a finite number, clamped; anything else is 100%', () => {
  assert.equal(ZOOM_HINT_KEY, 'windowControlsZoomFactor');
  assert.equal(zoomFactorHint(1.2), 1.2);
  assert.equal(zoomFactorHint(undefined), 1);
  assert.equal(zoomFactorHint('1.5'), 1);
  assert.equal(zoomFactorHint(Number.POSITIVE_INFINITY), 1);
  assert.equal(zoomFactorHint(0.1), 0.25);
  assert.equal(zoomFactorHint(12), 5);
  // SBn(): the main window's first traffic-light position follows the hint.
  assert.deepEqual(trafficLightPosition(zoomFactorHint(1.25)), { x: 22, y: 22 });
});
