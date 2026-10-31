import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, idleSeconds, buildFixture, launchFixture, FIXTURE } from './computer-use-live-helpers.mjs';

// app_key live (official 2.42304.0 §1.6.1), CU_LIVE=1 only. Opens ONE uniquely named temp document in TextEdit in the
// background (open -g; TextEdit may already be running with the user's documents — those are never looked at, typed
// into or closed, and TextEdit is never quit), then presses keys through the agent tool and reads the text area of that
// one window back through Accessibility (tests/fixtures/cu-ax-text.swift). The frontmost app and the cursor must be
// the same before and after. The document window is closed through its own close button at the end. When the current
// Space is a full-screen one, a background window can't be on it (it opens on another Space: window_off_space, and
// Accessibility can't reach it there to close it), so the TextEdit part is skipped; the fixture part (a window that
// joins every Space, launched without activating) runs either way.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-key-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');
const skip = (await liveSkip()) ?? false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TEXTEDIT = 'com.apple.TextEdit';
const fixtures = path.resolve(import.meta.dirname, 'fixtures');

/** Whether the main display's current Space is a full-screen (tiled) one (com.apple.spaces, read only). */
function fullScreenSpace() {
  try {
    const xml = execFileSync('defaults', ['export', 'com.apple.spaces', '-']);
    const json = JSON.parse(String(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml })));
    return json.SpacesDisplayConfiguration['Management Data'].Monitors.some((m) => m['Current Space']?.type === 4);
  } catch { return false; }
}
const textEditSkip = skip || (fullScreenSpace() && 'the current Space is a full-screen Space: a background TextEdit window would open on another Space (window_off_space)');

function compile(dir, name) {
  const out = path.join(dir, name);
  execFileSync('swiftc', ['-O', path.join(fixtures, `${name}.swift`), '-o', out], { stdio: 'pipe' });
  return out;
}

test('app_key on a background TextEdit document: AX for backspace / return / cmd+a, keystrokes for arrows and tab, AXValue read back', { skip: textEditSkip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-key-live-'));
  const name = `cu-key-${process.pid}-${Date.now()}.txt`, file = path.join(dir, name);
  fs.writeFileSync(file, 'hello world');
  const axText = compile(dir, 'cu-ax-text'), facts = compile(dir, 'cu-pointer-facts');
  const n = native();
  const service = createComputerUse({ native: n, log: { info() {}, warn() {} } });
  const ctx = { sessionId: 'key-live', computerUse: { service } };
  const tool = (toolName) => cu.tools.find((entry) => entry.name === toolName).handler;
  const call = async (toolName, args) => {
    const result = await tool(toolName)(args, ctx);
    const text = typeof result === 'string' ? result : result.content.find((part) => part.type === 'text').text;
    try { return JSON.parse(text); } catch { return { text }; }
  };
  service.grantsFor('key-live').grant([{ bundleId: TEXTEDIT, displayName: 'TextEdit' }]);
  const log = [];
  let windowId, pid;
  try {
    execFileSync('open', ['-g', '-a', 'TextEdit', file]);
    for (let i = 0; i < 50 && !windowId; i += 1) {
      await sleep(200);
      try { windowId = (await n.call('listWindows', { bundleId: TEXTEDIT })).windows.find((w) => w.title === name)?.window_id; } catch {}
    }
    assert.ok(windowId, 'the temp document window appeared');
    pid = Number(String(execFileSync('pgrep', ['-x', 'TextEdit'])).trim().split('\n')[0]);
    await sleep(500);
    const before = JSON.parse(String(execFileSync(facts, [String(windowId)])));
    const read = () => JSON.parse(String(execFileSync(axText, [String(pid), name])));
    const until = async (check) => { let state; for (let i = 0; i < 20; i += 1) { state = read(); if (check(state)) break; await sleep(50); } return state; };
    const shot = await service.appScreenshot('key-live', { bundleId: TEXTEDIT, windowId });
    const area = shot.elements.find((e) => e.role === 'AXTextArea');
    assert.ok(area, 'the text area is listed');
    const coordinate = [Math.round(area.frame.x + area.frame.width / 2), Math.round(area.frame.y + Math.min(area.frame.height / 2, 40))];
    const key = async (combo, extra = {}) => {
      const idle = await idleSeconds();
      const result = await call('app_key', { app: TEXTEDIT, window_id: windowId, combo, ...extra });
      log.push({ combo, idle: Number(idle.toFixed(2)), ok: result.ok, path: result.path, reasonCode: result.reasonCode, message: result.message });
      return result;
    };
    assert.equal(read().value, 'hello world');

    // cmd+a: AX selects all (set AXSelectedTextRange=all).
    const all = await key('cmd+a', { coordinate });
    assert.equal(all.ok, true, JSON.stringify(all));
    assert.equal(all.path, 'ax');
    assert.match(all.message, /^ok \(set AXSelectedTextRange=all on AXTextArea/);
    assert.deepEqual((({ location, length }) => ({ location, length }))(read()), { location: 0, length: 11 });
    // right: a keystroke to the window's focus collapses the selection to its end.
    const right = await key('right');
    assert.equal(right.ok, true, JSON.stringify(right));
    assert.equal(right.path, 'cgevent');
    assert.match(right.message, /^ok \(delivered via raw input on AXTextArea.*so this is unverified — confirm the effect with app_screenshot\)$/);
    let state = await until((s) => s.length === 0);
    assert.deepEqual([state.location, state.length], [11, 0], 'right arrow reached the background window');
    // backspace: AX deletes the character before the caret.
    const back = await key('backspace');
    assert.equal(back.path, 'ax', JSON.stringify(back));
    assert.match(back.message, /^ok \(set AXSelectedText="" \(delete\) on AXTextArea/);
    assert.equal((await until((s) => s.value === 'hello worl')).value, 'hello worl');
    // return: a new line through AXSelectedText in a multi-line text.
    const ret = await key('return');
    assert.equal(ret.path, 'ax', JSON.stringify(ret));
    assert.match(ret.message, /^ok \(set AXSelectedText="\\n" on AXTextArea/);
    assert.equal((await until((s) => s.value === 'hello worl\n')).value, 'hello worl\n');
    // left, shift+left: keystrokes; then backspace over a selection is refused (would_replace_content), nothing changes.
    await key('left');
    state = await until((s) => s.location === 10);
    assert.deepEqual([state.location, state.length], [10, 0]);
    await key('shift+left');
    state = await until((s) => s.length === 1);
    assert.deepEqual([state.location, state.length], [9, 1]);
    const replace = await key('backspace');
    assert.equal(replace.reasonCode, 'would_replace_content', JSON.stringify(replace));
    assert.equal(read().value, 'hello worl\n');
    // right collapses; tab inserts a tab; forward_delete removes the new line after it.
    await key('right');
    state = await until((s) => s.length === 0);
    assert.deepEqual([state.location, state.length], [10, 0]);
    const tab = await key('tab');
    assert.equal(tab.path, 'cgevent', JSON.stringify(tab));
    assert.equal((await until((s) => s.value === 'hello worl\t\n')).value, 'hello worl\t\n');
    await key('forward_delete');
    assert.equal((await until((s) => s.value === 'hello worl\t')).value, 'hello worl\t');
    // cmd+left: a navigation key with cmd goes to the start of the line.
    await key('cmd+left');
    state = await until((s) => s.location === 0);
    assert.deepEqual([state.location, state.length], [0, 0]);
    // Refused before anything: letters, a clipboard combo.
    assert.equal((await key('x')).reasonCode, 'key_not_mapped');
    assert.equal((await key('cmd+v')).reasonCode, 'state_conflict');
    assert.equal(read().value, 'hello worl\t');

    const after = JSON.parse(String(execFileSync(facts, [String(windowId)])));
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    assert.deepEqual(after.cursor, before.cursor, 'the cursor did not move');
    console.log(JSON.stringify({ front: before.front === after.front, cursorStill: true, log }, null, 1));
  } finally {
    // Close only this document's window, by its own close button (autosave keeps it from asking; a sheet is answered).
    try {
      if (windowId) {
        const shot = await service.appScreenshot('key-live', { bundleId: TEXTEDIT, windowId });
        const close = shot.elements.find((e) => e.subrole === 'AXCloseButton');
        if (close) await service.appClick('key-live', { bundleId: TEXTEDIT, windowId, element_index: close.index, axOnly: true });
        await sleep(800);
        const still = (await n.call('listWindows', { bundleId: TEXTEDIT })).windows.find((w) => w.window_id === windowId);
        if (still) {
          const sheet = await service.appScreenshot('key-live', { bundleId: TEXTEDIT, windowId });
          const button = sheet.elements.find((e) => e.role === 'AXButton' && /^(Delete|Don.t Save|Revert|删除|不存储)$/.test(e.title ?? ''));
          if (button) await service.appClick('key-live', { bundleId: TEXTEDIT, windowId, element_index: button.index, axOnly: true });
        }
      }
    } catch (error) { console.log(`cleanup: ${error.message}`); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('app_key on the background fixture: AXConfirm on a field, a text that ignores AX writes falls to a keystroke, element_index cannot aim a keystroke', { skip }, async () => {
  const build = buildFixture();
  const fixture = await launchFixture(build, { focus: 'locked', background: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-key-fixture-'));
  const facts = compile(dir, 'cu-pointer-facts');
  try {
    const before = JSON.parse(String(execFileSync(facts, [String(fixture.windowId)])));
    assert.notEqual(before.front, FIXTURE, 'the fixture did not take the front');
    const service = createComputerUse({ native: native(), log: { info() {}, warn() {} } });
    const ctx = { sessionId: 'key-fixture', computerUse: { service } };
    service.grantsFor('key-fixture').grant([{ bundleId: FIXTURE, displayName: 'CU Text Fixture' }]);
    const appKey = cu.tools.find((entry) => entry.name === 'app_key').handler;
    const key = async (args) => JSON.parse((await appKey({ app: FIXTURE, window_id: fixture.windowId, ...args }, ctx)).content[0].text);
    const shot = await service.appScreenshot('key-fixture', { bundleId: FIXTURE, windowId: fixture.windowId });
    const named = (title) => shot.elements.find((e) => e.title === title);
    const center = (e) => [Math.round(e.frame.x + e.frame.width / 2), Math.round(e.frame.y + e.frame.height / 2)];
    // The locked view holds the focus and ignores AX writes: type into it as the app would, then backspace.
    await service.appType('key-fixture', { bundleId: FIXTURE, windowId: fixture.windowId, text: 'abc', element_index: named('locked').index });
    assert.equal((await fixture.dump()).locked, 'abc');
    const back = await key({ combo: 'backspace', coordinate: center(named('locked')) });
    assert.equal(back.ok, true, JSON.stringify(back));
    assert.equal(back.path, 'cgevent', 'the AX write was ignored, so the keystroke went');
    assert.match(back.message, /the accessibility write was ignored by the app so this is unverified/);
    await sleep(200);
    assert.equal((await fixture.dump()).locked, 'ab');
    // element_index on a key with no AX action: no keystroke (key_cannot_be_aimed).
    const aimed = await key({ combo: 'tab', element_index: named('field').index });
    assert.equal(aimed.reasonCode, 'key_cannot_be_aimed', JSON.stringify(aimed));
    // return on the one-line field: AXConfirm (no keystroke; the locked view keeps the focus and its text).
    const confirm = await key({ combo: 'return', coordinate: center(named('field')) });
    assert.equal(confirm.path, 'ax', JSON.stringify(confirm));
    assert.match(confirm.message, /^ok \(AXConfirm on AXTextField 'field'/);
    const state = await fixture.dump();
    assert.deepEqual([state.locked, state.focus], ['ab', 'locked']);
    const after = JSON.parse(String(execFileSync(facts, [String(fixture.windowId)])));
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    assert.deepEqual(after.cursor, before.cursor, 'the cursor did not move');
    console.log(JSON.stringify({ back: back.message, aimed: aimed.reasonCode, confirm: confirm.message }));
  } finally {
    await fixture.quit();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
