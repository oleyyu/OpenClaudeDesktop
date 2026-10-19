// Computer use M2 acceptance on this Mac: app_screenshot's AX summary and app_click on the AX rung, against the real
// native module and a real Finder window ON THE CURRENT SPACE (kAXWindows lists only those). Run under Electron as Node:
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/computer-use-m2-check.mjs
// Needs Accessibility and Screen Recording for the process that runs it.
//
// Checks
//   1. app_screenshot: image + summary; every element has its [index], a role and a frame inside the capture's frame
//   2. a Finder toolbar button works through AXPress: switch the view (a toolbar radio button), the radio state and
//      the window's pixels change; then switch back and the original view is checked again
//   3. a click on plain text (no element answers AXPress within four parents) comes back unsupported(canvas), blocked,
//      and the window is unchanged: no blind click
//   4. (when a second Finder window on this Space has its toolbar covered by the front one) a click on that covered
//      toolbar is refused as anotherWindowIsOnTopAtThePressPoint, naming the window on top, and nothing changes
// Evidence (report.json, the JPEGs) goes to analysis/batch-20260920/computer-use-m2-<time>/.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { meanAbsDiff, saveDataUrl } from './computer-use-check-helpers.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createNative } = require('../electron/computer-use/native.cjs');
const directory = path.join(root, '../analysis/batch-20260920', `computer-use-m2-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(directory, { recursive: true });
const report = { at: new Date().toISOString(), runtime: process.versions.electron ? `electron ${process.versions.electron}` : `node ${process.version}`, checks: [], metrics: {}, passed: false };
const FINDER = 'com.apple.finder', S = 'm2';
const settle = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
let step = 0;
const shoot = async (cu, name) => { const shot = await cu.appScreenshot(S, { bundleId: FINDER, windowId: report.metrics.windowId }); shot.file = await saveDataUrl(path.join(directory, `${String(++step).padStart(2, '0')}-${name}.jpg`), shot.dataUrl); return shot; };

try {
  const native = createNative(), cu = createComputerUse({ native });
  const probe = await native.call('probe');
  report.metrics.probe = probe;
  assert.equal(probe.axTrusted, true, 'Accessibility is not granted to the process running this check');
  assert.equal(probe.screenCapture, true, 'Screen Recording is not granted to the process running this check');
  cu.grantsFor(S).grant([FINDER]);

  // The window must be on the ACTIVE Space while this runs. When this terminal lives in a full-screen app, start the
  // check, then switch to the desktop holding the Finder window: it waits up to 60 s for one to be on the active Space.
  const onActiveSpace = (w) => !w.is_auxiliary && w.is_off_space === false && w.is_minimized === false && !w.is_hidden;
  let windows = [], target;
  for (let waited = 0; ; waited += 1) {
    ({ windows } = await cu.listWindows(S, { bundleId: FINDER }));
    // The front window (AX main): a window behind it may have its toolbar covered (check 4).
    target = windows.find((w) => onActiveSpace(w) && w.is_main === true) ?? windows.find(onActiveSpace);
    if (target || waited >= 60) break;
    if (waited === 0) console.log('Waiting up to 60 s for a Finder window on the active Space: switch to it now.');
    await settle(1000);
  }
  // Let the switch animation finish before the first capture.
  if (target) await settle(1500);
  report.metrics.windows = windows.filter((w) => !w.is_auxiliary);
  assert.ok(target, 'No Finder window on the current Space: open one here (kAXWindows lists the current Space only)');
  report.metrics.windowId = target.window_id;

  // 1. Summary.
  const first = await shoot(cu, 'first');
  report.metrics.summary = first.summary.split('\n');
  report.metrics.elements = first.elements;
  assert.ok(first.elements.length > 0, 'the summary lists elements');
  first.elements.forEach((e, i) => {
    assert.equal(e.index, i);
    assert.match(e.role, /^AX/);
    assert.ok(e.frame.x >= 0 && e.frame.y >= 0 && e.frame.x + e.frame.width <= first.frameWidth + 1 && e.frame.y + e.frame.height <= first.frameHeight + 1, `[${i}] frame inside the capture`);
  });
  report.checks.push(`app_screenshot: ${first.width}×${first.height} image, ${first.elements.length} elements with [index], role and frame in ${first.frameWidth}×${first.frameHeight} frame px`);

  // 2. Toolbar view buttons: the radio buttons in the toolbar band with a checked state.
  const band = first.frameHeight * 0.2;
  const views = first.elements.filter((e) => e.role === 'AXRadioButton' && typeof e.checked === 'boolean' && e.frame.y < band);
  report.metrics.viewButtons = views;
  const original = views.find((e) => e.checked), other = views.find((e) => !e.checked);
  assert.ok(original && other, `two toolbar view radio buttons, one checked (found ${views.length}; is the window wide enough to show the view control?)`);
  const switched = await cu.appClick(S, { bundleId: FINDER, element_index: other.index });
  report.metrics.switch = switched;
  assert.equal(switched.outcome, 'ok', `AXPress on "${other.title}": ${switched.reasonCode}`);
  assert.equal(switched.path, 'ax');
  await settle();
  const after = await shoot(cu, 'after-switch');
  const nowOther = after.elements.find((e) => e.role === 'AXRadioButton' && e.title === other.title);
  const nowOriginal = after.elements.find((e) => e.role === 'AXRadioButton' && e.title === original.title);
  const content = { x: 0, y: Math.round(after.height * 0.2), w: after.width, h: Math.round(after.height * 0.8) };
  const changed = await meanAbsDiff(first.file, after.file, content);
  report.metrics.switchDiff = changed;
  assert.equal(nowOther?.checked, true, `"${other.title}" is checked after the press`);
  assert.equal(nowOriginal?.checked, false, `"${original.title}" is no longer checked`);
  assert.ok(changed > 2, `the window content changed (mean abs diff ${changed.toFixed(2)})`);
  const back = await cu.appClick(S, { bundleId: FINDER, element_index: nowOriginal.index });
  assert.equal(back.outcome, 'ok');
  await settle();
  const restored = await shoot(cu, 'restored');
  assert.equal(restored.elements.find((e) => e.role === 'AXRadioButton' && e.title === original.title)?.checked, true, 'the original view is back');
  report.checks.push(`Toolbar: AXPress on "${other.title}" (${switched.pressedRole}) switched the view (content diff ${changed.toFixed(1)}), "${original.title}" restored it`);

  // 3. Plain text: find, by dry run, a point whose hit has no pressable element within four parents.
  const scan = [];
  for (let fy = 0.3; fy <= 0.95 && !scan.some((s) => s.role === 'AXStaticText'); fy += 0.08) {
    for (let fx = 0.3; fx <= 0.95; fx += 0.1) {
      const winLocalPt = { x: target.bounds.width * fx, y: target.bounds.height * fy };
      const r = await native.call('axClick', { bundleId: FINDER, windowId: target.window_id, winLocalPt, dryRun: true });
      if (r.outcome === 'unsupported' && r.reasonCode === 'canvas') scan.push({ ...winLocalPt, role: r.role, path: r.descentPath });
    }
  }
  report.metrics.canvasPoints = scan.slice(0, 10);
  const text = scan.find((s) => s.role === 'AXStaticText') ?? scan[0];
  assert.ok(text, 'a point with no pressable element (plain text or empty content)');
  const before = await shoot(cu, 'before-text-click');
  const coordinate = [Math.round(text.x * before.scaleFactor), Math.round(text.y * before.scaleFactor)];
  const refused = await cu.appClick(S, { bundleId: FINDER, coordinate });
  report.metrics.textClick = { coordinate, ...refused };
  assert.equal(refused.outcome, 'unsupported');
  assert.equal(refused.reasonCode, 'canvas');
  assert.equal(refused.blocked, true);
  await settle();
  const untouched = await shoot(cu, 'after-text-click');
  const unchanged = await meanAbsDiff(before.file, untouched.file);
  report.metrics.textDiff = unchanged;
  assert.ok(unchanged < 1.5, `the window did not change (mean abs diff ${unchanged.toFixed(2)})`);
  report.checks.push(`Plain ${text.role} at (${coordinate}): unsupported(canvas), blocked, path ${refused.path}, window unchanged (diff ${unchanged.toFixed(2)}) — hit path ${(refused.descentPath ?? []).join(' < ')}`);
  // 4. A second window whose toolbar sits under the front one.
  const behind = windows.find((w) => onActiveSpace(w) && w.window_id !== target.window_id);
  if (behind) {
    const covered = await cu.appScreenshot(S, { bundleId: FINDER, windowId: behind.window_id });
    const button = covered.elements.find((e) => e.role === 'AXRadioButton' && e.frame.y < covered.frameHeight * 0.2);
    const dry = button && await native.call('axClick', { bundleId: FINDER, windowId: behind.window_id, elementIndex: button.index, dryRun: true });
    report.metrics.behind = { windowId: behind.window_id, button, dry };
    if (dry?.reasonCode === 'anotherWindowIsOnTopAtThePressPoint') {
      const frontBefore = await shoot(cu, 'front-before-covered-click');
      const refusedCovered = await cu.appClick(S, { bundleId: FINDER, windowId: behind.window_id, element_index: button.index });
      assert.equal(refusedCovered.reasonCode, 'anotherWindowIsOnTopAtThePressPoint');
      assert.equal(refusedCovered.blocked, true);
      assert.equal(refusedCovered.hitWindowId, target.window_id, 'the refusal names the window on top');
      await settle();
      const frontAfter = await shoot(cu, 'front-after-covered-click');
      const diff = await meanAbsDiff(frontBefore.file, frontAfter.file);
      assert.ok(diff < 1.5, `the front window did not change (diff ${diff.toFixed(2)})`);
      report.checks.push(`Covered toolbar: "${button.title}" of window ${behind.window_id} under window ${target.window_id} → anotherWindowIsOnTopAtThePressPoint (hitWindowId ${refusedCovered.hitWindowId}), front window unchanged (diff ${diff.toFixed(2)})`);
    } else {
      report.checks.push(`Second window ${behind.window_id}: its toolbar is not covered (${dry?.outcome ?? 'no view button'}), check 4 not applicable`);
    }
  }
  report.passed = true;
} catch (error) {
  report.error = `${error.code ? `[${error.code}] ` : ''}${error.stack}`;
  process.exitCode = 1;
}
await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, error: report.error?.split('\n')[0], directory: path.relative(process.cwd(), directory) }, null, 2));
