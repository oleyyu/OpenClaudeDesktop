import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const skip = (await liveSkip()) ?? false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('live TextEdit drag selects exactly characters 10 through 40', { skip }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-drag-text-'));
  const name = `${path.basename(dir)}.txt`, file = path.join(dir, name), probe = path.join(dir, 'probe');
  fs.writeFileSync(file, '0123456789'.repeat(8) + '\n');
  execFileSync('swiftc', ['-o', probe, path.join(import.meta.dirname, 'fixtures/cu-drag-probe.swift')]);
  let opened = false;
  const bundleId = 'com.apple.TextEdit';
  try {
    execFileSync('open', ['-a', 'TextEdit', file]);
    opened = true;
    let window;
    for (let i = 0; i < 50 && !window; i += 1) {
      await sleep(100);
      window = (await native().call('listWindows', { bundleId })).windows.find((w) => w.title?.includes(name) && !w.is_off_space);
    }
    assert.ok(window, 'test document must be on the current Space');
    await sleep(500);
    const cu = createComputerUse({ native: native() });
    cu.grantsFor('drag-live').grant([bundleId]);
    const shot = await cu.appScreenshot('drag-live', { bundleId, windowId: window.window_id });
    const read = () => JSON.parse(execFileSync(probe, [execFileSync('pgrep', ['-x', 'TextEdit'], { encoding: 'utf8' }).trim(), name], { encoding: 'utf8' }));
    const before = read();
    assert.equal(before.points.length, 2, 'AXBoundsForRange must expose insertion points');
    const toFrame = (p) => [(p.x - shot.bounds.x) * shot.scaleFactor, (p.y - shot.bounds.y) * shot.scaleFactor];
    for (let i = 0; i < 100 && (await native().call('probe')).secondsSinceUserInput < 0.5; i += 1) await sleep(100);
    const result = await cu.appDrag('drag-live', { bundleId, coordinate: toFrame(before.points[0]), to_coordinate: toFrame(before.points[1]) });
    await sleep(150);
    const after = read();
    t.diagnostic(JSON.stringify({ result, before, after }));
    assert.equal(result.mouseUpSent, true);
    assert.deepEqual(after.range, { location: 10, length: 30 });
    assert.equal(result.outcome, 'ok');
  } finally {
    // Close only the uniquely named test document; never quit TextEdit or touch existing documents.
    if (opened) execFileSync('osascript', ['-e', `tell application "TextEdit" to close (every document whose name is "${name}") saving no`]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
