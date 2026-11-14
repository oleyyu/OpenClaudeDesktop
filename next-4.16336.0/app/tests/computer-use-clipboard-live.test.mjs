// Live: the screen-wide type's paste path (official hi() + DPr()) on this Mac (CU_LIVE=1 only), against a uniquely named
// temporary TextEdit document, compared with typing the same text grapheme by grapheme.
//   CU_LIVE=1 ELECTRON_RUN_AS_NODE=1 node --test --test-concurrency=1 tests/computer-use-clipboard-live.test.mjs
// The user's clipboard is saved first in full (tests/fixtures/cu-pasteboard-snapshot.swift: every item and type, to a
// 0600 temp file that is deleted afterwards; its contents are never printed) and put back at the end. During the test
// a sentinel text is on the clipboard: the paste must leave exactly that text behind. The document is saved, read
// back, closed with ⌘W (TextEdit itself keeps running), and deleted; the app that was in front is brought back.
// While the screen is locked only the gates are checked: nothing is posted and the clipboard is never touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const TEXTEDIT = 'com.apple.TextEdit';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const skip = await liveSkip();
const locked = skip ? null : (await native().call('probe')).screenLocked === true;
const UTF8 = { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' };
// The clipboard as text, through pbcopy / pbpaste (Electron's clipboard in the app; this runs as plain Node).
const pb = {
  readText: () => execFileSync('/usr/bin/pbpaste', [], { env: UTF8, encoding: 'utf8' }),
  writeText: (text) => { execFileSync('/usr/bin/pbcopy', [], { env: UTF8, input: text }); },
};
const counted = () => { const log = []; return { log, readText: () => { log.push('read'); return pb.readText(); }, writeText: (t) => { log.push('write'); pb.writeText(t); } }; };

function snapshotTool() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-pb-'));
  const bin = path.join(dir, 'cu-pasteboard-snapshot');
  execFileSync('/usr/bin/swiftc', ['-O', path.join(import.meta.dirname, 'fixtures/cu-pasteboard-snapshot.swift'), '-o', bin], { stdio: 'ignore' });
  return { dir, run: (...args) => execFileSync(bin, args, { encoding: 'utf8' }).trim() };
}

function setup({ clipboard, flags }) {
  const fullControl = createFullControl();
  const service = createComputerUse({ native: native(), log: { log() {}, warn() {}, info() {}, debug() {} }, fullControl, clipboard });
  service.grantsFor('live').grant([{ bundleId: TEXTEDIT, displayName: 'TextEdit' }], flags);
  service.requestFullControl('live', { approved: true });
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-clip-live-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service, askTakeover: async () => 'accept' }));
  return { service, fullControl, call: (name, args = {}) => host.call('live', { name, arguments: args }) };
}
const text = (result) => result.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');

// Mixed Chinese and English over many lines, no quotes or dashes (TextEdit's substitutions would change typed ones).
const LINES = [
  'Computer use paste test 电脑使用粘贴测试 line one',
  '第二行 包含中文标点，以及 English words mixed in.',
  'The quick brown fox jumps over the lazy dog 敏捷的棕色狐狸',
  '数字 0123456789 and symbols such as plus + equals = percent %',
  'Emoji 🙂 and accented letters café naïve résumé',
  '最后一行 the last line of the block 结束',
];
const BLOCK = Array.from({ length: 3 }, (_, i) => LINES.map((line) => `${i + 1}. ${line}`).join('\n')).join('\n');

test('locked screen: type with clipboardWrite is refused before the clipboard is read or written, and nothing is posted', { skip: skip ?? (locked ? false : 'the screen is not locked (the TextEdit test runs instead)') }, async () => {
  const n = native();
  const ownBefore = (await n.call('probe')).secondsSinceOwnInput;
  const clip = counted();
  // Through the tool: the lock screen (loginwindow) is in front and not granted.
  const { call, service } = setup({ clipboard: clip, flags: { clipboardWrite: true } });
  assert.equal(service.pastesText('live', 'a\nb'), true, 'the paste path applies to this text');
  const refused = JSON.parse((await call('type', { text: 'a\nb' })).content.at(-1).text);
  assert.deepEqual([refused.ok, refused.reasonCode], [false, 'app_not_granted']);
  // With the lock screen's app granted in memory (this test only), the gate passes and secure input decides: the
  // text never goes through the clipboard, and the grapheme path is refused before its first keystroke.
  const front = await n.call('frontmostApp');
  service.grantsFor('live').grant([{ bundleId: front.bundleId, displayName: 'loginwindow' }]);
  const secure = await service.displayKeyboard('live', { kind: 'type', text: 'a\nb' });
  assert.equal(secure.outcome, 'unsupported');
  assert.ok(['secure_input_active', 'screen_locked'].includes(secure.reasonCode), secure.reasonCode);
  assert.equal(secure.delivered, false);
  assert.deepEqual(clip.log, [], 'the clipboard was never read or written');
  assert.equal((await n.call('probe')).secondsSinceOwnInput, ownBefore, 'not one event was posted');
});

test('the real clipboard (no events): the paste order writes the text, reads it back, and puts the previous text back; the user\'s clipboard is restored exactly', { skip: skip ?? false }, async () => {
  const { createClipboard } = require('../electron/computer-use/clipboard.cjs');
  const tool = snapshotTool();
  const saved = path.join(tool.dir, 'board.plist');
  const originalHash = tool.run('save', saved);
  try {
    const sentinel = `cu-live-sentinel-${crypto.randomUUID()}`;
    pb.writeText(sentinel);
    const waits = [];
    let seen = null;
    const clip = createClipboard({ clipboard: pb, wait: async (ms) => { waits.push(ms); }, log: {} });
    // The press stands in for ⌘V and posts nothing: it only looks at what is on the clipboard at that moment.
    const pressed = await clip.paste(BLOCK, async () => { seen = pb.readText(); return { outcome: 'ok', delivered: true }; });
    assert.equal(pressed.outcome, 'ok');
    assert.equal(seen, BLOCK, 'the multi-line Chinese / English text round-trips through the real clipboard');
    assert.deepEqual(waits, [100]);
    assert.equal(pb.readText(), sentinel, 'the previous text is back');
  } finally {
    const restoredHash = tool.run('restore', saved);
    fs.rmSync(tool.dir, { recursive: true, force: true });
    assert.equal(restoredHash, originalHash, 'the user\'s clipboard is back exactly as it was');
  }
});

test('TextEdit: a multi-line Chinese / English text is pasted (official DPr()), reads back identical, the clipboard keeps its text; typing it is slower', { skip: skip ?? (locked ? 'the screen is locked' : false), timeout: 180000 }, async (t) => {
  const n = native();
  const front = await n.call('frontmostApp');
  const tool = snapshotTool();
  const saved = path.join(tool.dir, 'board.plist');
  const originalHash = tool.run('save', saved);
  const sentinel = `cu-live-sentinel-${crypto.randomUUID()}`;
  const doc = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cu-paste-')), `cu-paste-live-${crypto.randomUUID().slice(0, 8)}.txt`);
  fs.writeFileSync(doc, '');
  let closeDoc = async () => {};
  try {
    pb.writeText(sentinel);
    execFileSync('/usr/bin/open', ['-a', 'TextEdit', doc]);
    // Wait for the document's window to be in front.
    let ready = false;
    for (let i = 0; i < 40 && !ready; i += 1) {
      await sleep(250);
      const now = await n.call('frontmostApp');
      const windows = now.bundleId === TEXTEDIT ? (await n.call('listWindows', { bundleId: TEXTEDIT })).windows ?? [] : [];
      ready = windows.some((w) => String(w.title ?? '').includes(path.basename(doc)));
    }
    assert.ok(ready, 'the TextEdit document came to the front');
    await sleep(500);
    const retry = async (call, name, args) => {
      let result;
      for (let i = 0; i < 5; i += 1) {
        result = await call(name, args);
        const body = result.isError ? JSON.parse(result.content.at(-1).text) : null;
        if (body?.reasonCode !== 'user_actively_typing') return result;
        await sleep(1500);
      }
      return result;
    };
    const save = async (call) => { assert.equal(text(await retry(call, 'key', { text: 'cmd+s' })), 'Key pressed.'); await sleep(800); return fs.readFileSync(doc, 'utf8'); };

    // 1. Pasted.
    const pasting = setup({ clipboard: pb, flags: { clipboardWrite: true } });
    closeDoc = async () => { await retry(pasting.call, 'key', { text: 'cmd+w' }); await sleep(500); };
    const t0 = performance.now();
    const pasted = await retry(pasting.call, 'type', { text: BLOCK });
    const pasteMs = performance.now() - t0;
    assert.equal(text(pasted), 'Typed (via clipboard).', text(pasted));
    assert.equal(pb.readText(), sentinel, 'the clipboard holds its text again');
    const afterPaste = await save(pasting.call);
    assert.equal(afterPaste, BLOCK, 'the document reads back identical');

    // 2. The same text typed grapheme by grapheme (no clipboardWrite), over a cleared document.
    const typing = setup({ clipboard: counted(), flags: {} });
    assert.equal(text(await retry(typing.call, 'key', { text: 'cmd+a' })), 'Key pressed.');
    assert.equal(text(await retry(typing.call, 'key', { text: 'backspace' })), 'Key pressed.');
    const t1 = performance.now();
    const typed = await retry(typing.call, 'type', { text: BLOCK });
    const typeMs = performance.now() - t1;
    assert.match(text(typed), /^Typed \d+ grapheme\(s\)\.$/, text(typed));
    const afterType = await save(typing.call);
    t.diagnostic(`graphemes ${[...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(BLOCK)].length}, UTF-16 units ${BLOCK.length}, lines ${BLOCK.split('\n').length}`);
    t.diagnostic(`paste ${pasteMs.toFixed(0)} ms vs typed ${typeMs.toFixed(0)} ms (${(typeMs / pasteMs).toFixed(1)}x); typed text identical: ${afterType === BLOCK}`);
    assert.equal(pb.readText(), sentinel, 'typing never touched the clipboard');
    assert.ok(pasteMs < typeMs, 'the paste is faster');
  } finally {
    try { await closeDoc(); } catch {}
    try { fs.rmSync(path.dirname(doc), { recursive: true, force: true }); } catch {}
    const restoredHash = tool.run('restore', saved);
    fs.rmSync(tool.dir, { recursive: true, force: true });
    if (front?.bundleId && front.bundleId !== TEXTEDIT) { try { execFileSync('/usr/bin/open', ['-b', front.bundleId]); } catch {} }
    assert.equal(restoredHash, originalHash, 'the user\'s clipboard is back exactly as it was');
  }
});
