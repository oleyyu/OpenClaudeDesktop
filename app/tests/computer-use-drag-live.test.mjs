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
    assert.deepEqual(result.after.AXSelectedTextRange, { location: 10, length: 30 });
  } finally {
    // Close only the uniquely named test document; never quit TextEdit or touch existing documents.
    if (opened) execFileSync('osascript', ['-e', `tell application "TextEdit" to close (every document whose name is "${name}") saving no`]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('live Cocoa fixture accepts the routed text drag and receives mouseUp in its own window', { skip }, async (t) => {
  const { buildFixture, launchFixture } = await import('./computer-use-live-helpers.mjs');
  const built = buildFixture();
  const previous = process.env.CU_FIXTURE_LOG_POINTER;
  process.env.CU_FIXTURE_LOG_POINTER = '1';
  let fixture;
  try {
    fixture = await launchFixture(built, { focus: 'notes' });
    const probe = path.join(built.dir, 'drag-probe');
    execFileSync('swiftc', ['-o', probe, path.join(import.meta.dirname, 'fixtures/cu-drag-probe.swift')]);
    const bundleId = 'dev.openclaude.cu-text-fixture', cu = createComputerUse({ native: native() });
    cu.grantsFor('drag-live').grant([bundleId]);
    const shot = await cu.appScreenshot('drag-live', { bundleId, windowId: fixture.windowId });
    const notes = shot.elements.find((e) => e.title === 'notes');
    assert.ok(notes);
    await cu.appType('drag-live', { bundleId, element_index: notes.index, text: '0123456789'.repeat(8), mode: 'replace' });
    const before = JSON.parse(execFileSync(probe, [String(fixture.pid), 'CU Text Fixture'], { encoding: 'utf8' }));
    const toFrame = (p) => [(p.x - shot.bounds.x) * shot.scaleFactor, (p.y - shot.bounds.y) * shot.scaleFactor];
    for (let i = 0; i < 100 && (await native().call('probe')).secondsSinceUserInput < 0.5; i += 1) await sleep(100);
    const result = await cu.appDrag('drag-live', { bundleId, coordinate: toFrame(before.points[0]), to_coordinate: toFrame(before.points[1]) });
    const dump = await fixture.dump();
    t.diagnostic(JSON.stringify({ result, selection: dump.notesSelection, events: dump.mouseEvents.length }));
    assert.equal(result.outcome, 'ok');
    assert.equal(result.mouseUpSent, true);
    assert.deepEqual(result.after.AXSelectedTextRange, { location: 10, length: 30 });
    assert.deepEqual(dump.notesSelection, { location: 10, length: 30 });
    const posted = dump.mouseEvents.filter((e) => [1, 2, 6].includes(e.type));
    assert.ok(posted.some((e) => e.type === 2), 'the application received mouseUp');
    assert.ok(posted.every((e) => e.window === fixture.windowId), 'AppKit routed every press/drag/release to the window');
    const slider = shot.elements.find((e) => e.title === 'drag-slider');
    assert.ok(slider);
    const f = slider.frame, at = (fraction) => [f.x + f.height / 2 + (f.width - f.height) * fraction, f.y + f.height / 2];
    const slid = await cu.appDrag('drag-live', { bundleId, coordinate: at(0.3), to_coordinate: at(0.7) });
    const sliderDump = await fixture.dump();
    t.diagnostic(JSON.stringify({ slider: slid, sliderValue: sliderDump.sliderValue }));
    assert.equal(slid.outcome, 'ok');
    assert.ok(Math.abs(slid.before.AXValue - 0.3) < 0.01);
    assert.ok(Math.abs(slid.after.AXValue - 0.7) < 0.03);
    assert.ok(Math.abs(sliderDump.sliderValue - 0.7) < 0.03);
  } finally {
    if (fixture) await fixture.quit();
    if (previous === undefined) delete process.env.CU_FIXTURE_LOG_POINTER;
    else process.env.CU_FIXTURE_LOG_POINTER = previous;
    fs.rmSync(built.dir, { recursive: true, force: true });
  }
});

test('live System Settings brightness thumb drag 30% to 70%, restoring its original position', {
  skip: skip || (process.env.CU_LIVE_SYSTEM !== '1' && 'set CU_LIVE_SYSTEM=1 to test and restore real display brightness'),
}, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-drag-slider-')), probe = path.join(dir, 'probe');
  const bundleId = 'com.apple.systempreferences';
  execFileSync('swiftc', ['-o', probe, path.join(import.meta.dirname, 'fixtures/cu-drag-slider-probe.swift')]);
  const read = () => JSON.parse(execFileSync(probe, [bundleId], { encoding: 'utf8' }));
  const center = (thumb) => ({ x: thumb.position.x + thumb.size.width / 2, y: thumb.position.y + thumb.size.height / 2 });
  const thumbOf = (state) => state.tree.children.find((e) => e.AXRole === 'AXValueIndicator');
  let original, cu, toFrame;
  const dragFromCurrent = async (point) => {
    const current = center(thumbOf(read()));
    if (Math.abs(current.x - point.x) < 0.5) return null;
    for (let i = 0; i < 100 && (await native().call('probe')).secondsSinceUserInput < 0.5; i += 1) await sleep(100);
    return cu.appDrag('drag-live', { bundleId, coordinate: toFrame(current), to_coordinate: toFrame(point) });
  };
  try {
    const windows = await native().call('listWindows', { bundleId }).catch(() => ({ windows: [] }));
    if (!windows.windows.some((w) => /Displays|显示器/.test(w.title) && !w.is_off_space)) {
      execFileSync('open', ['x-apple.systempreferences:com.apple.Displays-Settings.extension']);
      await sleep(1500);
    }
    const initial = read(), thumb = thumbOf(initial);
    assert.ok(thumb?.position && thumb?.size, 'brightness thumb geometry must be readable before changing it');
    original = center(thumb);
    cu = createComputerUse({ native: native() });
    cu.grantsFor('drag-live').grant([bundleId]);
    const shot = await cu.appScreenshot('drag-live', { bundleId });
    toFrame = (p) => [(p.x - shot.bounds.x) * shot.scaleFactor, (p.y - shot.bounds.y) * shot.scaleFactor];
    const left = initial.tree.position.x + thumb.size.width / 2, travel = initial.tree.size.width - thumb.size.width;
    const point = (fraction) => ({ x: left + travel * fraction, y: original.y });
    const prepared = await dragFromCurrent(point(0.3));
    if (prepared) assert.equal(prepared.outcome, 'ok', JSON.stringify(prepared));
    assert.ok(Math.abs((center(thumbOf(read())).x - left) / travel - 0.3) < 0.05);
    const result = await dragFromCurrent(point(0.7)), after = read();
    const fraction = (center(thumbOf(after)).x - left) / travel;
    t.diagnostic(JSON.stringify({ result, fraction, valueError: after.valueError }));
    assert.equal(result.mouseUpSent, true);
    assert.equal(result.outcome, 'ok');
    assert.ok(Math.abs(fraction - 0.7) < 0.05, JSON.stringify(after));
  } finally {
    if (original && cu && toFrame) {
      await dragFromCurrent(original);
      assert.ok(Math.abs(center(thumbOf(read())).x - original.x) < 2, 'original brightness thumb position restored');
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('live Finder file drag either moves the test file or reports the system limitation, always released', { skip }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-drag-finder-')), name = path.basename(dir);
  fs.writeFileSync(path.join(dir, 'alpha.txt'), 'drag fixture');
  fs.mkdirSync(path.join(dir, 'destination'));
  const bundleId = 'com.apple.finder';
  try {
    execFileSync('open', [dir]);
    await sleep(700);
    execFileSync('osascript', ['-e', `tell application "Finder" to set current view of Finder window "${name}" to list view`]);
    await sleep(300);
    const windows = (await native().call('listWindows', { bundleId })).windows;
    const window = windows.find((w) => w.title === name);
    assert.ok(window);
    const cu = createComputerUse({ native: native() });
    cu.grantsFor('drag-live').grant([bundleId]);
    const shot = await cu.appScreenshot('drag-live', { bundleId, windowId: window.window_id });
    const file = shot.elements.find((e) => e.title === 'alpha.txt');
    const folder = shot.elements.find((e) => e.title === 'destination');
    assert.ok(file && folder);
    const center = (e) => [e.frame.x + e.frame.width / 2, e.frame.y + e.frame.height / 2];
    for (let i = 0; i < 100 && (await native().call('probe')).secondsSinceUserInput < 0.5; i += 1) await sleep(100);
    const result = await cu.appDrag('drag-live', { bundleId, coordinate: center(file), to_coordinate: center(folder) });
    await sleep(300);
    const moved = fs.existsSync(path.join(dir, 'destination', 'alpha.txt'));
    t.diagnostic(JSON.stringify({ result, moved }));
    assert.equal(result.mouseUpSent, true);
    if (moved) assert.equal(result.outcome, 'ok');
    else assert.equal(result.reasonCode, 'system_app_ignores_posted_events');
  } finally {
    try {
      execFileSync('osascript', ['-e', `tell application "Finder" to if exists Finder window "${name}" then close Finder window "${name}"`]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});
