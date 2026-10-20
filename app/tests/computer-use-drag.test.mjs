import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { dragCoordinates } = require('../electron/computer-use/service.cjs');
const shot = { frameWidth: 1800, frameHeight: 1000, width: 450, height: 250, scaleFactor: 2,
  bounds: { x: -1200, y: 80, width: 900, height: 500 } };

test('drag uses full-resolution pixels on a Retina secondary display, independent of image scaling', () => {
  assert.deepEqual(dragCoordinates(shot, [20, 40], [800, 400], [[100, 200], [200, 300]]), {
    pixelScale: 2,
    points: [
      { winLocalPt: { x: 10, y: 20 }, screenPt: { x: -1190, y: 100 } },
      { winLocalPt: { x: 50, y: 100 }, screenPt: { x: -1150, y: 180 } },
      { winLocalPt: { x: 100, y: 150 }, screenPt: { x: -1100, y: 230 } },
      { winLocalPt: { x: 400, y: 200 }, screenPt: { x: -800, y: 280 } },
    ],
  });
  assert.deepEqual(dragCoordinates({ ...shot, scaleFactor: undefined }, [20, 40], [800, 400]),
    dragCoordinates(shot, [20, 40], [800, 400]));
});

test('drag refuses missing endpoints, malformed or out-of-frame vertices before delivery', () => {
  for (const point of [undefined, null, [1], [1, 2, 3], [-1, 0], [1800, 0], [0, 1000], [NaN, 1], [Infinity, 1], ['1', 2]]) {
    assert.throws(() => dragCoordinates(shot, point, [20, 40]), { code: 'invalid_params' });
    assert.throws(() => dragCoordinates(shot, [20, 40], point), { code: 'invalid_params' });
    assert.throws(() => dragCoordinates(shot, [20, 40], [40, 60], [[10, 20], point]), { code: 'invalid_params' });
  }
  for (const path of [null, [], [[0, 0]], Array(21).fill([0, 0]), 'bad']) {
    assert.throws(() => dragCoordinates(shot, [20, 40], [40, 60], path), { code: 'invalid_params' });
  }
});
