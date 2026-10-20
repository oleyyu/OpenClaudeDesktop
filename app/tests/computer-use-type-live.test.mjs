import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { FIXTURE, buildFixture, launchFixture, liveSkip, native, summary, userInputFor, idleSeconds } from './computer-use-live-helpers.mjs';

// Computer use M3 acceptance, live on this Mac (CU_LIVE=1 only; skipped otherwise). Types into the M3 text fixture and
// into a TextEdit document it opens on a temp file; needs Accessibility + Screen Recording and no keyboard or mouse
// input while it runs (acceptance 3 makes its own). TextEdit is used only when it is not already running.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-type-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const skip = (await liveSkip()) ?? false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const build = skip ? null : buildFixture();

/** 2000 UTF-16 units: ASCII, Chinese, a ZWJ family, a flag, a skin tone, combining marks — pairs across chunk edges. */
function mixedText(units = 2000) {
  const pieces = ['Hello ', '世界，你好。', '👨‍👩‍👧', ' 🇨🇳 ', '👍🏽', 'é', ' naïve ', '😀😀😀', '\n'];
  let text = '';
  for (let i = 0; text.length < units; i += 1) text += pieces[i % pieces.length];
  while (text.length > units) text = [...text].slice(0, -1).join('');
  return text.padEnd(units, '.');
}

async function session(fixture) {
  const logs = [];
  const cu = createComputerUse({ native: native(), log: { info: (m) => logs.push(m), warn: (m) => logs.push(m) } });
  cu.grantsFor('live').grant([FIXTURE]);
  await cu.appScreenshot('live', { bundleId: FIXTURE, windowId: fixture.windowId });
  return { cu, logs, elements: await summary(fixture) };
}

test('acceptance 1a — TextEdit: 2000 units with emoji and Chinese, AX rung, saved file byte-identical', { skip: skip || (spawnSync('pgrep', ['-x', 'TextEdit']).status === 0 && 'TextEdit is running (not touching your documents)') }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-textedit-')), file = path.join(dir, 'm3.txt');
  fs.writeFileSync(file, '');
  execFileSync('open', ['-a', 'TextEdit', file]);
  try {
    const cu = createComputerUse({ native: native(), log: { info() {}, warn() {} } });
    cu.grantsFor('te').grant(['com.apple.TextEdit']);
    let shot;
    for (let i = 0; i < 50 && !shot?.elements?.some((e) => e.role === 'AXTextArea'); i += 1) {
      await sleep(200);
      try { shot = await cu.appScreenshot('te', { bundleId: 'com.apple.TextEdit' }); } catch {}
    }
    const area = shot.elements.find((e) => e.role === 'AXTextArea');
    assert.ok(area, 'TextEdit text area listed');
    const text = mixedText();
    assert.equal(text.length, 2000);
    const typed = await cu.appType('te', { bundleId: 'com.apple.TextEdit', text, element_index: area.index });
    assert.equal(typed.outcome, 'ok', JSON.stringify(typed));
    assert.equal(typed.verified, true);
    assert.equal(typed.deliveredPrefixChars, 2000);
    const saved = await cu.appKey('te', { bundleId: 'com.apple.TextEdit', combo: 'cmd+s' });
    assert.equal(saved.outcome, 'ok', JSON.stringify(saved));
    for (let i = 0; i < 40 && fs.statSync(file).size === 0; i += 1) await sleep(100);
    assert.equal(fs.readFileSync(file).equals(Buffer.from(text, 'utf8')), true, 'the saved file is the text, byte for byte');
  } finally {
    spawnSync('pkill', ['-x', 'TextEdit']);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('acceptance 1b — raw rung: 2000 units into a control that ignores AX writes, chunked, app state byte-identical', { skip }, async () => {
  const fixture = await launchFixture(build, { focus: 'locked' });
  try {
    const { cu, logs, elements } = await session(fixture);
    const text = mixedText();
    const typed = await cu.appType('live', { bundleId: FIXTURE, text, element_index: elements.locked.index });
    assert.equal(typed.outcome, 'ok', JSON.stringify(typed));
    assert.equal(typed.path, 'cgevent');
    assert.equal(typed.axReason, 'text_not_writable');
    assert.equal(typed.verified, true);
    assert.equal(typed.charsDelivered, 2000);
    assert.equal(typed.deliveredPrefixChars, 2000);
    assert.ok(logs.some((m) => m.startsWith('[cu policy] fallback reasonCode="text_not_writable" → cgevent op=type')));
    const state = await fixture.dump();
    assert.equal(Buffer.from(state.locked, 'utf8').equals(Buffer.from(text, 'utf8')), true);
    // replace: AX selects all, then the raw rung types over it.
    const replaced = await cu.appType('live', { bundleId: FIXTURE, text: '替换 ✓', element_index: elements.locked.index, mode: 'replace' });
    assert.equal(replaced.outcome, 'ok', JSON.stringify(replaced));
    assert.equal(replaced.selectAll, 'ax');
    assert.equal((await fixture.dump()).locked, '替换 ✓');
    // no_focused_text: the unfocused view is focused through AX first.
    const fresh = await launchFixture(build);
    try {
      const other = await session(fresh);
      const focused = await other.cu.appType('live', { bundleId: FIXTURE, text: 'focus first', element_index: other.elements.locked.index });
      assert.equal(focused.outcome, 'ok', JSON.stringify(focused));
      assert.equal(focused.axReason, 'no_focused_text');
      assert.equal(focused.focusedBy, 'AXFocused');
      assert.deepEqual([(await fresh.dump()).locked, (await fresh.dump()).focus], ['focus first', 'locked']);
    } finally { await fresh.quit(); }
    // app_key: three backspaces.
    assert.equal((await cu.appKey('live', { bundleId: FIXTURE, combo: 'backspace', repeat: 2 })).outcome, 'ok');
    await sleep(200);
    assert.equal((await fixture.dump()).locked, '替换');
  } finally { await fixture.quit(); }
});

test('acceptance 2 — a focused password field: secure_input_active, nothing written anywhere', { skip }, async () => {
  const fixture = await launchFixture(build, { focus: 'password' });
  try {
    await sleep(300);
    assert.equal((await native().call('probe')).secureInput, true, 'secure input is on while the password field has focus');
    const { cu, elements } = await session(fixture);
    for (const target of [{ element_index: elements.password?.index ?? elements.field.index }, { element_index: elements.field.index }, {}]) {
      const result = await cu.appType('live', { bundleId: FIXTURE, text: 'hunter2', ...target });
      assert.equal(result.reasonCode, 'secure_input_active', JSON.stringify(target));
      assert.equal(result.blocked, true);
    }
    const state = await fixture.dump();
    assert.deepEqual([state.password, state.field, state.locked, state.notes], ['', '', '', '']);
  } finally { await fixture.quit(); }
});

test('acceptance 3 — user typing: backs off and succeeds after the input stops; refuses while it goes on', { skip }, async () => {
  const fixture = await launchFixture(build, { focus: 'locked' });
  try {
    const { cu, elements } = await session(fixture);
    const waitForInput = async () => { for (let i = 0; i < 50 && (await idleSeconds()) > 0.15; i += 1) await sleep(20); };
    // Input for ~300 ms more once it registers: the first raw attempt is refused, a later one (≤ 3 × 200 ms) goes through.
    let input = userInputFor(build, 600);
    await waitForInput();
    const started = Date.now();
    const after = await cu.appType('live', { bundleId: FIXTURE, text: 'after you', element_index: elements.locked.index });
    await input;
    assert.equal(after.outcome, 'ok', JSON.stringify(after));
    assert.ok(Date.now() - started >= 200, 'it waited at least one back-off');
    assert.equal((await fixture.dump()).locked, 'after you');
    // Input that outlasts the back-off: refused, nothing typed.
    input = userInputFor(build, 3000);
    await waitForInput();
    const refused = await cu.appType('live', { bundleId: FIXTURE, text: ' never', element_index: elements.locked.index });
    await input;
    assert.equal(refused.reasonCode, 'user_actively_typing', JSON.stringify(refused));
    assert.equal(refused.blocked, true);
    assert.equal((await fixture.dump()).locked, 'after you');
  } finally { await fixture.quit(); }
});

test('acceptance 4 — a read-only label is not a text target: refused (no_text_target), label unchanged', { skip }, async () => {
  const fixture = await launchFixture(build);
  try {
    const { cu } = await session(fixture);
    // The label sits at y 80–104 (bottom-left origin) in a 420-pt-high content view: window-local y ≈ 420 − 92 + title bar.
    const shot = await native().call('captureWindow', { bundleId: FIXTURE, windowId: fixture.windowId });
    const titleBar = shot.bounds.height - 420;
    const coordinate = [Math.round(100 * shot.scaleFactor), Math.round((titleBar + 420 - 92) * shot.scaleFactor)];
    const result = await cu.appType('live', { bundleId: FIXTURE, text: 'overwrite', coordinate });
    assert.equal(result.reasonCode, 'no_text_target', JSON.stringify(result));
    assert.equal(result.blocked, true);
    assert.equal((await fixture.dump()).label, 'label text');
  } finally { await fixture.quit(); }
});

test('acceptance 6 — the app killed mid-write: ineffective, target_exited, deliveredPrefixChars on a chunk boundary', { skip }, async () => {
  const fixture = await launchFixture(build, { focus: 'locked' });
  const { cu, elements } = await session(fixture);
  const text = mixedText();
  const typing = cu.appType('live', { bundleId: FIXTURE, text, element_index: elements.locked.index });
  // Kill once the first characters have arrived.
  for (let i = 0; i < 200; i += 1) {
    await sleep(15);
    try { if ((await fixture.dump()).locked.length > 0) break; } catch {}
  }
  process.kill(fixture.pid, 'SIGKILL');
  const result = await typing;
  assert.equal(result.outcome, 'ineffective', JSON.stringify(result));
  assert.equal(result.reasonCode, 'target_exited');
  assert.equal(result.blocked, true);
  assert.ok(result.deliveredPrefixChars > 0 && result.deliveredPrefixChars < 2000, `deliveredPrefixChars ${result.deliveredPrefixChars}`);
  assert.equal(result.deliveredPrefixChars, result.charsDelivered);
  const { chunks } = await native().call('textChunks', { text });
  const boundaries = chunks.reduce((acc, c) => [...acc, acc.at(-1) + c.length], [0]);
  assert.ok(boundaries.includes(result.deliveredPrefixChars), 'a whole number of chunks');
  const last = text.charCodeAt(result.deliveredPrefixChars - 1);
  assert.ok(!(last >= 0xd800 && last <= 0xdbff), 'the prefix does not end inside a surrogate pair');
});
