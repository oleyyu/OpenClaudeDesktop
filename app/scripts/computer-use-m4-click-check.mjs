// M4 experiment 1 (docs/computer-use-handoff-20261020.md「实验一」): does a pid-targeted mouse click select a row of a
// BACKGROUND Finder list view, ten times in a row, without fronting Finder, moving the real cursor or raising the window?
//
// Setup it does itself: a temp folder with 14 empty files, opened in a new Finder window with `open -g` (Finder stays in
// the background), set to list view. Then, per attempt: a fresh capture, the next content AXRow, an idle wait (the
// native gates refuse within 200 ms of user input), the facts before (frontmost app, cursor, the window's z-order),
// native rawClick with the delivery under test, the same facts after. The window is closed and the folder removed at the
// end; nothing else is touched. Needs Accessibility + Screen Recording for the process that runs it.
//
//   CU_LIVE=1 node scripts/computer-use-m4-click-check.mjs                   # delivery "pid" (the default)
//   CU_LIVE=1 CU_M4_DELIVERY=<name> node scripts/computer-use-m4-click-check.mjs
//   CU_M4_ATTEMPTS=10 (default) · CU_M4_KEEP=1 keeps the evidence folder's screenshots
//
// Pass: every attempt reads back AXSelected false → true, the frontmost app, the cursor (±0.5 pt) and the window's
// z-order index are unchanged. Anything else is reported attempt by attempt; nothing is retried into a pass.
// Skipped (the reason printed) unless CU_LIVE=1, and while the screen is locked or someone used this Mac in the last
// 120 s (tests/computer-use-live-helpers.mjs presenceSkip; CU_LIVE_FORCE=1 runs it anyway).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { presenceSkip } from '../tests/computer-use-live-helpers.mjs';

const skipped = await presenceSkip();
if (skipped) { console.log(JSON.stringify({ skipped })); process.exit(0); }

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createNative } = require('../electron/computer-use/native.cjs');

const FINDER = 'com.apple.finder', S = 'm4';
const delivery = process.env.CU_M4_DELIVERY || 'pid';
const attempts = Number(process.env.CU_M4_ATTEMPTS || 10);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-m4-tools-'));
const factsBin = path.join(work, 'cu-pointer-facts');
execFileSync('swiftc', ['-O', path.join(root, 'tests/fixtures/cu-pointer-facts.swift'), '-o', factsBin], { stdio: 'pipe' });
const facts = (windowId) => JSON.parse(execFileSync(factsBin, [String(windowId)], { encoding: 'utf8' }));

const native = createNative();
const cu = createComputerUse({ native, log: { info() {}, warn() {} } });
cu.grantsFor(S).grant([FINDER]);
const report = { at: new Date().toISOString(), delivery, attempts: [], passed: false };

async function waitIdle(min = 0.6, maxMs = 20_000) {
  for (let waited = 0; waited < maxMs; waited += 100) {
    if ((await native.call('probe')).secondsSinceUserInput >= min) return true;
    await sleep(100);
  }
  return false;
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-m4-click-')), title = path.basename(dir);
for (let i = 0; i < 14; i += 1) fs.writeFileSync(path.join(dir, `file-${String(i).padStart(2, '0')}.txt`), '');
let windowId = null;
try {
  const frontAtStart = facts(0).front;
  report.frontAtStart = frontAtStart;
  execFileSync('open', ['-g', dir]);
  for (let i = 0; i < 50 && !windowId; i += 1) {
    await sleep(100);
    const w = (await native.call('listWindows', { bundleId: FINDER })).windows.find((x) => x.title === title);
    if (w && w.is_off_space === false) windowId = w.window_id;
  }
  if (!windowId) throw new Error('the Finder window did not open on the current Space');
  execFileSync('osascript', ['-e', `tell application "Finder" to set current view of Finder window "${title}" to list view`]);
  await sleep(800);
  report.windowId = windowId;
  report.frontAfterSetup = facts(windowId).front;

  for (let n = 0; n < attempts; n += 1) {
    const shot = await cu.appScreenshot(S, { bundleId: FINDER, windowId });
    const sidebarRight = Math.max(0, ...shot.elements.filter((e) => e.role === 'AXRow' && e.frame.x === 0).map((e) => e.frame.width));
    const rows = shot.elements.filter((e) => e.role === 'AXRow' && e.frame.x >= sidebarRight && e.frame.height > 0);
    const row = rows[(n + 1) % rows.length];
    const winLocalPt = { x: (row.frame.x + row.frame.width * 0.75) / shot.scaleFactor, y: (row.frame.y + row.frame.height / 2) / shot.scaleFactor };
    const screenPt = { x: shot.bounds.x + winLocalPt.x, y: shot.bounds.y + winLocalPt.y };
    const idle = await waitIdle();
    const before = facts(windowId);
    let result;
    try {
      result = await native.call('rawClick', { bundleId: FINDER, windowId, winLocalPt, screenPt, grantedBundleIds: [FINDER], delivery });
    } catch (error) { result = { error: error.code, message: error.message }; }
    await sleep(250);
    const after = facts(windowId);
    const cursorStill = Math.abs(before.cursor[0] - after.cursor[0]) <= 0.5 && Math.abs(before.cursor[1] - after.cursor[1]) <= 0.5;
    const entry = {
      n: n + 1, row: row.index, rowTitle: row.title ?? null, idle, outcome: result.outcome, reasonCode: result.reasonCode ?? result.error ?? null,
      readback: result.readback ?? null, delivery: result.delivery ?? null, front: [before.front, after.front], zIndex: [before.zIndex, after.zIndex],
      cursorStill, pass: result.readback === 'selected' && before.front === after.front && after.front !== FINDER && cursorStill && before.zIndex === after.zIndex,
    };
    report.attempts.push(entry);
    console.log(JSON.stringify(entry));
  }
  report.passed = report.attempts.length === attempts && report.attempts.every((a) => a.pass);
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  try { execFileSync('osascript', ['-e', `tell application "Finder" to if exists Finder window "${title}" then close Finder window "${title}"`]); } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
}
console.log(JSON.stringify({ delivery, passed: report.passed, selected: report.attempts.filter((a) => a.readback === 'selected').length,
  of: attempts, frontAtStart: report.frontAtStart, error: report.error?.split('\n')[0] }));
if (!report.passed) process.exitCode = 1;
