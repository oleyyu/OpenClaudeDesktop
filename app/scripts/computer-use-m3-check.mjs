// The no_press_action raw click on a real Finder list row, against the real native module. Closed in reason-policy.cjs
// since 2026-10-19 (Finder drops CGEventPostToPid mouse events; see PLANNED_M3.no_press_action.live): this check opens
// the reason for itself and is the acceptance for the M4 authenticated mouse-event path. Until then it fails at
// "AXSelected read back" with raw_click_ineffective — which is the readback doing its job. Run under Electron as Node, with Finder's front window on the current Space in LIST view:
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/computer-use-m3-check.mjs
// Needs Accessibility and Screen Recording for the process that runs it. Do not type or move the mouse while it runs:
// the raw rung refuses during user input (user_actively_typing) and only backs off 3 × 200 ms.
//
// Checks
//   1. a listed content-area AXRow (not the sidebar) answers a dry run with dryRun + reasonCode no_press_action
//   2. app_click on that row goes AX → policy fallback → rawClick: path "cgevent", outcome ok, verified by AXSelected,
//      one [cu policy] log line
//   3. the row's pixels change (selection highlight) and the frontmost app is the same before and after (no fronting)
//   4. a click on plain text in a row still comes back canvas and blocked (the fallback did not widen to blind clicks)
// The only side effect is the Finder selection moving to that row. Evidence goes to
// analysis/batch-20260920/computer-use-m3-<time>/.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { meanAbsDiff, saveDataUrl } from './computer-use-check-helpers.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { decide } = require('../electron/computer-use/reason-policy.cjs');
const openNoPress = (result, options) => (result?.reasonCode === 'no_press_action' ? { action: 'fallback', reason: 'no_press_action' } : decide(result, options));
const { createNative } = require('../electron/computer-use/native.cjs');
const directory = path.join(root, '../analysis/batch-20260920', `computer-use-m3-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(directory, { recursive: true });
const report = { at: new Date().toISOString(), runtime: process.versions.electron ? `electron ${process.versions.electron}` : `node ${process.version}`, checks: [], metrics: {}, passed: false };
const FINDER = 'com.apple.finder', S = 'm3';
const settle = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const front = () => { try { return /bundleID="([^"]*)"/.exec(execFileSync('lsappinfo', ['info', '-only', 'bundleID', execFileSync('lsappinfo', ['front'], { encoding: 'utf8' }).trim()], { encoding: 'utf8' }))?.[1] ?? null; } catch { return null; } };
let step = 0;
const logs = [];
const log = { info: (m) => logs.push(m), warn: (m) => logs.push(m) };
const shoot = async (cu, name) => { const shot = await cu.appScreenshot(S, { bundleId: FINDER, windowId: report.metrics.windowId }); shot.file = await saveDataUrl(path.join(directory, `${String(++step).padStart(2, '0')}-${name}.jpg`), shot.dataUrl); return shot; };

try {
  const native = createNative(), cu = createComputerUse({ native, log, decide: openNoPress });
  const probe = await native.call('probe');
  report.metrics.probe = probe;
  assert.equal(probe.axTrusted, true, 'Accessibility is not granted to the process running this check');
  assert.equal(probe.screenCapture, true, 'Screen Recording is not granted to the process running this check');
  assert.equal(probe.eventSource, true, `no event source: ${probe.eventSourceError}`);
  cu.grantsFor(S).grant([FINDER]);

  // As in the M2 check: the window must be on the ACTIVE Space (kAXWindows lists only those). When this terminal is
  // full-screen or on another desktop, switch to the Finder window after starting: it waits up to 60 s.
  const onActiveSpace = (w) => !w.is_auxiliary && w.is_off_space === false && w.is_minimized === false && !w.is_hidden;
  let windows = [], target;
  for (let waited = 0; ; waited += 1) {
    ({ windows } = await cu.listWindows(S, { bundleId: FINDER }));
    target = windows.find((w) => onActiveSpace(w) && w.is_main === true) ?? windows.find(onActiveSpace);
    if (target || waited >= 60) break;
    if (waited === 0) console.log('Waiting up to 60 s for a Finder window on the active Space: switch to it now (then hands off).');
    await settle(1000);
  }
  report.metrics.windows = windows.filter((w) => !w.is_auxiliary);
  assert.ok(target, 'No Finder window on the current Space: open one here in list view');
  // Let a Space switch finish, and the user's last input age past the 200 ms gate.
  await settle(1500);
  report.metrics.windowId = target.window_id;

  const first = await shoot(cu, 'first');
  // Content rows: AXRow right of the sidebar (sidebar rows sit at x 0 with the sidebar's width).
  const sidebarRight = Math.max(0, ...first.elements.filter((e) => e.role === 'AXRow' && e.frame.x === 0).map((e) => e.frame.width));
  const rows = first.elements.filter((e) => e.role === 'AXRow' && e.frame.x >= sidebarRight && e.frame.height > 0);
  report.metrics.contentRows = rows.slice(0, 12);
  assert.ok(rows.length >= 2, `two content-area AXRows (found ${rows.length}): put the front Finder window in list view on a folder with files`);

  // 1. Dry run on each candidate: the first that answers no_press_action is the one.
  let row = null;
  report.metrics.dryRuns = [];
  for (const candidate of rows.slice(1, 8)) {
    const dry = await native.call('axClick', { bundleId: FINDER, windowId: target.window_id, elementIndex: candidate.index, expectRole: 'AXRow', dryRun: true });
    report.metrics.dryRuns.push({ index: candidate.index, outcome: dry.outcome, reasonCode: dry.reasonCode, noPressRole: dry.noPressRole, pressedRole: dry.pressedRole });
    if (dry.outcome === 'dryRun' && dry.reasonCode === 'no_press_action') { row = candidate; break; }
  }
  assert.ok(row, `a content AXRow answering no_press_action (dry runs: ${JSON.stringify(report.metrics.dryRuns)})`);
  report.checks.push(`Dry run: listed AXRow [${row.index}] → dryRun, would be no_press_action`);

  // 2–3. The real click through the service: AX → policy → rawClick.
  const frontBefore = front();
  const before = await shoot(cu, 'before-row-click');
  const clicked = await cu.appClick(S, { bundleId: FINDER, element_index: row.index });
  report.metrics.rowClick = clicked;
  report.metrics.policyLog = logs.slice();
  await settle();
  const frontAfter = front();
  const after = await shoot(cu, 'after-row-click');
  assert.equal(clicked.outcome, 'ok', `raw click: ${clicked.reasonCode} (readback ${clicked.readback})`);
  assert.equal(clicked.path, 'cgevent');
  assert.equal(clicked.axReason, 'no_press_action');
  assert.equal(clicked.verified, true, `AXSelected read back (readback: ${clicked.readback})`);
  assert.equal(clicked.readback, 'selected');
  assert.ok(logs.some((m) => m.startsWith('[cu policy] fallback reasonCode="no_press_action"')), 'the policy hit is logged');
  const k = before.width / before.frameWidth;
  const band = { x: Math.round(row.frame.x * k), y: Math.round(row.frame.y * k), w: Math.round(row.frame.width * k), h: Math.round(row.frame.height * k) };
  const rowDiff = await meanAbsDiff(before.file, after.file, band);
  report.metrics.rowDiff = rowDiff;
  report.metrics.front = { before: frontBefore, after: frontAfter };
  assert.ok(rowDiff > 2, `the row's pixels changed (selection; mean abs diff ${rowDiff.toFixed(2)})`);
  assert.equal(frontAfter, frontBefore, 'the frontmost app did not change');
  report.checks.push(`Row [${row.index}]: AX no_press_action → [cu policy] fallback → rawClick ok, AXSelected read back true, path cgevent; row diff ${rowDiff.toFixed(1)}; frontmost stayed ${frontAfter}`);

  // 4. Plain text inside a row is still canvas.
  const fresh = await shoot(cu, 'before-text');
  const other = fresh.elements.find((e) => e.role === 'AXRow' && e.frame.x >= sidebarRight && e.index !== row.index);
  let text = null;
  for (let fx = 0.05; other && fx < 0.6 && !text; fx += 0.05) {
    const winLocalPt = { x: (other.frame.x + other.frame.width * fx) / fresh.scaleFactor, y: (other.frame.y + other.frame.height / 2) / fresh.scaleFactor };
    const dry = await native.call('axClick', { bundleId: FINDER, windowId: target.window_id, winLocalPt, dryRun: true });
    if (dry.reasonCode === 'canvas') text = { winLocalPt, role: dry.role, path: dry.descentPath };
  }
  if (text) {
    const coordinate = [Math.round(text.winLocalPt.x * fresh.scaleFactor), Math.round(text.winLocalPt.y * fresh.scaleFactor)];
    const refused = await cu.appClick(S, { bundleId: FINDER, coordinate });
    report.metrics.textClick = { coordinate, ...refused };
    assert.equal(refused.reasonCode, 'canvas');
    assert.equal(refused.blocked, true);
    assert.equal(refused.path, 'unavailable');
    report.checks.push(`Plain ${text.role} in a row at (${coordinate}): canvas, blocked, no raw click — hit path ${(text.path ?? []).join(' < ')}`);
  } else {
    report.checks.push('Plain text in a row: no canvas point found in the first row (check 4 not applicable)');
  }
  report.passed = true;
} catch (error) {
  report.error = `${error.code ? `[${error.code}] ` : ''}${error.stack}`;
  process.exitCode = 1;
}
await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, error: report.error?.split('\n')[0], directory: path.relative(process.cwd(), directory) }, null, 2));
