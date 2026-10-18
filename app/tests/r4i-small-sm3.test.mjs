// R4i-small SM3: the keyboard-shortcuts dialog lists Esc Esc rewind by the same per-session rule as the transcript
// (CW-0 codeRewindServed), and the Cowork slash-rewind refusal (2.42304.0 c21f11e6d lO Unsupported) has its zh-CN copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { shortcutsDialogSections } from '../src/shortcuts-dialog-model.mjs';
import { codeRewindServed } from '../src/cowork-session-capabilities.mjs';
import zhApp from '../electron/i18n/zh-CN/app.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const occurrences = (text, needle) => text.split(needle).length - 1;
const COWORK = 'cw-0123abcd-0123-4567-89ab-0123456789ab';
const REFUSAL = 'Messages in this task can’t be edited or restarted from. Send what you need as a new message instead.';
const hasRewind = (rewind) => shortcutsDialogSections({ rewind }).some((section) => section.rows.some((row) => row.command === 'rewind'));

test('shortcuts dialog: rewind is decided per session, like Rewind to here and Esc Esc (CW-0)', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
  const start = main.indexOf('<KeyboardShortcutsDialog key={`action-');
  assert.ok(start > 0);
  const dialog = main.slice(start, main.indexOf('/>}', start));
  assert.equal(occurrences(dialog, 'rewind={codeRewindServed(current, boot?.core?.capabilities)}'), 1);
  assert.equal(occurrences(dialog, 'thread/revert'), 0, 'no core-only capability check left in the dialog');
  // The same rule the transcript uses: a Cowork session never lists Esc Esc; a Code session follows thread/revert.
  for (const capabilities of [undefined, { unsupportedMethods: [] }]) {
    assert.equal(hasRewind(codeRewindServed(COWORK, capabilities)), false);
    assert.equal(hasRewind(codeRewindServed('thread-1', capabilities)), true);
  }
  assert.equal(hasRewind(codeRewindServed('thread-1', { unsupportedMethods: ['thread/revert'] })), false);
  assert.equal(hasRewind(codeRewindServed(null, undefined)), true, 'no session yet: the core capability alone, as before');
});

test('slash-rewind Cowork refusal: zh-CN copy in app.mjs // R4i-small, main.cjs throws it through i18n.t', () => {
  const view = fs.readFileSync(path.join(root, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c21f11e6d-Bd0v2A97.js'), 'utf8');
  assert.equal(occurrences(view, 'restarted from. Send what you need as a new message instead.",id:"SC1NI+O8Y4"'), 1);
  assert.equal(zhApp[REFUSAL], '此任务中的消息无法编辑，也无法从这里重新开始。请把需要的内容作为新消息发送。');
  assert.equal(zh[REFUSAL], zhApp[REFUSAL], 'no other area overrides it');
  const app = fs.readFileSync(path.join(root, 'electron/i18n/zh-CN/app.mjs'), 'utf8');
  const block = app.slice(app.indexOf('// R4i-small'), app.indexOf('// R4i-small end.'));
  assert.ok(block.includes(REFUSAL));
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  const caseStart = main.indexOf('case "slash-rewind": {');
  assert.equal(occurrences(main.slice(caseStart, main.indexOf('const owner=client', caseStart)), `throw new Error(i18n.t("${REFUSAL}"));`), 1);
});
