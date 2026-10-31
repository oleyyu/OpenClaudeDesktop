// Computer use M1 acceptance on this Mac, against the real native module (native/computer-use/build/computer_use.node)
// and real Finder windows. Run under Electron as Node so the module loads in Electron's own Node-API host:
//   CU_LIVE=1 ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/computer-use-m1-check.mjs
// Needs Screen Recording for the process that runs it (and Accessibility for is_main / is_minimized).
//
// Checks
//   1. a Finder window capture is sized by the docs/06 budget: width × height = fit(frame), frame = bounds × scaleFactor,
//      the JPEG really is that size, quality 0.75; scale 0.5 halves the image and keeps the frame
//   2. Finder outside the grants: list and capture refused (app_not_granted)
//   3. screen capture without Finder in the allowlist: Finder is in excludedBundleIds and its window's pixels are the
//      desktop, not Finder (compared with a capture that allows only Finder)
//   4. screen capture with an empty allowlist returns an image (the fixed contract), no error
// Evidence (report.json, the JPEGs) goes to analysis/batch-20260920/computer-use-m1-<time>/.
// Skipped (the reason printed) unless CU_LIVE=1, and while the screen is locked or someone used this Mac in the last
// 120 s (tests/computer-use-live-helpers.mjs presenceSkip; CU_LIVE_FORCE=1 runs it anyway).
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { jpegSize, meanRGB } from './computer-use-check-helpers.mjs';
import { presenceSkip } from '../tests/computer-use-live-helpers.mjs';

const skipped = await presenceSkip();
if (skipped) { console.log(JSON.stringify({ skipped })); process.exit(0); }

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const directory = path.join(root, '../analysis/batch-20260920', `computer-use-m1-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(directory, { recursive: true });
const report = { at: new Date().toISOString(), runtime: process.versions.electron ? `electron ${process.versions.electron}` : `node ${process.version}`, checks: [], metrics: {}, passed: false };
const FINDER = 'com.apple.finder';

const unwrap = async (promise) => { const envelope = await promise; if (!envelope.ok) throw Object.assign(new Error(envelope.error.message), { code: envelope.error.code }); return envelope.result; };
const save = async (name, dataUrl) => { const file = path.join(directory, name); await fs.writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64')); return file; };

try {
  const cu = createComputerUse();
  const probe = await unwrap(cu.call('computer-use:probe'));
  report.metrics.probe = probe;
  assert.equal(probe.screenCapture, true, 'Screen Recording is not granted to the process running this check');

  // Finder needs a window to capture. Only when it has none, open one on the home folder.
  cu.grantsFor('m1').grant([FINDER]);
  let windows = (await unwrap(cu.call('computer-use:list-windows', { sessionId: 'm1', bundleId: FINDER }))).windows;
  if (!windows.some((w) => !w.is_auxiliary)) {
    execFileSync('open', ['-a', 'Finder', process.env.HOME]);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    windows = (await unwrap(cu.call('computer-use:list-windows', { sessionId: 'm1', bundleId: FINDER }))).windows;
    report.openedFinderWindow = true;
  }
  report.metrics.windows = windows;
  const target = windows.find((w) => !w.is_auxiliary && w.is_main) ?? windows.find((w) => !w.is_auxiliary);
  assert.ok(target, 'Finder has a regular window');

  // 1. Window capture sized by the budget.
  const shot = await unwrap(cu.call('computer-use:capture-window', { sessionId: 'm1', bundleId: FINDER, windowId: target.window_id }));
  const file = await save('finder-window.jpg', shot.dataUrl);
  const actual = jpegSize(await fs.readFile(file));
  report.metrics.windowShot = { width: shot.width, height: shot.height, frameWidth: shot.frameWidth, frameHeight: shot.frameHeight, scaleFactor: shot.scaleFactor, bounds: shot.bounds, jpeg: actual, targetUsesChromium: shot.targetUsesChromium };
  assert.deepEqual([shot.width, shot.height], fit(shot.frameWidth, shot.frameHeight), 'window image = fit(frame)');
  assert.ok(Math.abs(shot.frameWidth - shot.bounds.width * shot.scaleFactor) <= 1 && Math.abs(shot.frameHeight - shot.bounds.height * shot.scaleFactor) <= 1, 'frame = bounds × scaleFactor');
  assert.deepEqual([actual.width, actual.height], [shot.width, shot.height], 'the JPEG is the reported size');
  assert.ok(shot.width <= 1568 && shot.height <= 1568 && Math.ceil(shot.width / 28) * Math.ceil(shot.height / 28) <= 1568, 'within 1568 px / 1568 tokens');
  assert.equal(shot.jpegQuality, 0.75);
  const half = await unwrap(cu.call('computer-use:capture-window', { sessionId: 'm1', bundleId: FINDER, windowId: target.window_id, scale: 0.5 }));
  assert.deepEqual([half.frameWidth, half.frameHeight], [shot.frameWidth, shot.frameHeight], 'scale keeps the frame');
  assert.deepEqual([half.width, half.height], scaled(fit(half.frameWidth, half.frameHeight), 0.5), 'scale 0.5 halves the image');
  report.checks.push(`Finder window ${target.window_id}: frame ${shot.frameWidth}×${shot.frameHeight} (×${shot.scaleFactor}) → ${shot.width}×${shot.height}, JPEG ${actual.width}×${actual.height}, q 0.75; scale 0.5 → ${half.width}×${half.height}`);

  // 2. Not granted: refused before any native call.
  for (const action of ['computer-use:list-windows', 'computer-use:capture-window']) {
    const answer = await cu.call(action, { sessionId: 'ungranted', bundleId: FINDER });
    assert.equal(answer.error?.code, 'app_not_granted', action);
  }
  report.checks.push('Finder outside the grants: list-windows and capture-window answer app_not_granted');

  // 3. Screen with and without Finder in the allowlist; compare the Finder window's region.
  cu.grantsFor('finder-only').grant([FINDER]);
  const withFinder = await unwrap(cu.call('computer-use:capture-screen', { sessionId: 'finder-only' }));
  const withoutFinder = await unwrap(cu.call('computer-use:capture-screen', { sessionId: 'nothing-granted' }));
  const withFile = await save('screen-finder-only.jpg', withFinder.dataUrl), withoutFile = await save('screen-empty-allowlist.jpg', withoutFinder.dataUrl);
  assert.ok(withoutFinder.excludedBundleIds.includes(FINDER), 'Finder excluded when not granted');
  assert.ok(!withFinder.excludedBundleIds.includes(FINDER), 'Finder kept when granted');
  assert.deepEqual([withFinder.width, withFinder.height], fit(withFinder.frameWidth, withFinder.frameHeight), 'screen image = fit(frame)');
  const display = withFinder.displayBounds, k = withFinder.width / withFinder.displayWidth;
  const b = target.bounds, inset = 0.2;
  const region = { x: Math.round((b.x - display.x + b.width * inset) * k), y: Math.round((b.y - display.y + b.height * inset) * k), w: Math.round(b.width * (1 - 2 * inset) * k), h: Math.round(b.height * (1 - 2 * inset) * k) };
  // An off-Space window is capturable by id but not part of this Space's screen image.
  const onDisplay = target.is_off_space !== true && b.x >= display.x && b.y >= display.y && b.x + b.width <= display.x + display.width && b.y + b.height <= display.y + display.height;
  report.metrics.screen = { displayId: withFinder.displayId, size: [withFinder.width, withFinder.height], frame: [withFinder.frameWidth, withFinder.frameHeight], region, onDisplay, excludedWithout: withoutFinder.excludedBundleIds.length };
  if (onDisplay) {
    const [a, c] = [await meanRGB(withFile, region), await meanRGB(withoutFile, region)];
    const distance = Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    report.metrics.screen.meanRGB = { finderOnly: a, emptyAllowlist: c, distance };
    assert.ok(distance > 12, `Finder's window region differs between the two captures (distance ${distance.toFixed(1)})`);
    report.checks.push(`Screen: Finder window region mean RGB distance ${distance.toFixed(1)} between "Finder only" and "empty allowlist"; Finder in excludedBundleIds only when not granted`);
  } else {
    report.checks.push("Screen: Finder in excludedBundleIds only when not granted (its window is not on this display's active Space, pixel comparison skipped)");
  }

  // 4. Empty allowlist: an image, not an error (fixed contract) — and it is the desktop: the wallpaper is kept.
  assert.ok(withoutFinder.dataUrl.startsWith('data:image/jpeg;base64,') && withoutFinder.width > 0, 'empty allowlist returns an image');
  assert.ok(withoutFinder.desktopWindowIds.length > 0, 'the wallpaper window is in the filter');
  const kk = withoutFinder.width / withoutFinder.displayWidth, W = withoutFinder.width, H = withoutFinder.height;
  const centre = await meanRGB(withoutFile, { x: Math.round(W * 0.3), y: Math.round(H * 0.3), w: Math.round(W * 0.4), h: Math.round(H * 0.4) });
  report.metrics.desktopCentre = centre;
  assert.ok(Math.max(...centre) > 8, `the desktop is visible, not black (centre mean ${centre.map(Math.round)})`);
  report.checks.push(`Empty allowlist: image ${withoutFinder.width}×${withoutFinder.height}, ${withoutFinder.excludedBundleIds.length} apps excluded, wallpaper kept (centre mean RGB ${centre.map(Math.round)}), no error`);

  // 5. The menu bar (WindowServer's own window: every app's menus and status items) is never captured: its band
  //    matches the wallpaper just below it, in both captures. Left half only, clear of desktop icons on the right.
  const band = (y0, y1) => ({ x: 0, y: Math.round(y0 * kk), w: Math.round(W / 2), h: Math.round((y1 - y0) * kk) });
  for (const [name, file] of [['empty allowlist', withoutFile], ['Finder only', withFile]]) {
    const [bar, below] = [await meanRGB(file, band(2, 22)), await meanRGB(file, band(40, 60))];
    const distance = Math.hypot(bar[0] - below[0], bar[1] - below[1], bar[2] - below[2]);
    report.metrics[`menuBand ${name}`] = { bar, below, distance };
    assert.ok(distance < 30, `${name}: the menu-bar band looks like the wallpaper below it (distance ${distance.toFixed(1)})`);
  }
  report.checks.push('Menu bar absent from both screen captures: the top band matches the wallpaper below it');
  report.passed = true;
} catch (error) {
  report.error = `${error.code ? `[${error.code}] ` : ''}${error.stack}`;
  process.exitCode = 1;
}
await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, error: report.error, directory: path.relative(process.cwd(), directory) }, null, 2));
