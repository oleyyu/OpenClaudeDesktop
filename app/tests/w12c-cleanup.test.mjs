// W12c cleanup: the rewind success feedback follows 3.6556.2 (no host-made "Rewound. {count} files were restored." toast).
// Source-only: pins on the official chunk / en-US.json and the host text of main.jsx's rewindConversation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SNAPSHOT = path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const chunk = name => fs.readFileSync(path.join(SNAPSHOT, 'assets/v1', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('rewind: official success feedback is a code-only "Code restored" or a skipped-file warning; a conversation rewind says nothing', () => {
  const cc = chunk('cc43287c9-Me-M2ucD.js');
  // Qme confirmRewind: after rewindFiles, skippedLinks > 0 warns (iVjBjhoPGU), else only choice "code" toasts success.
  assert.equal(count(cc, '{count:r.skippedLinks})):e==="code"&&c(a.formatMessage({defaultMessage:"Code restored",id:"qnOcSJx9vQ"}))'), 1);
  // $b runConversationRewind's success branch: resend, prefill and focus the composer, no toast.
  assert.equal(count(cc, 'getState().resend(q.id),Fr()&&(ac(e||t),Xo.current?.scheduleFocus())},e=>{'), 1);
  const en = JSON.parse(fs.readFileSync(path.join(SNAPSHOT, 'i18n/en-US.json'), 'utf8'));
  assert.ok(!Object.values(en).some(v => typeof v === 'string' && /^Rewound\.|files? (?:was|were) restored/.test(v)));
  for (const name of ['cc43287c9-Me-M2ucD.js', 'c227f4d5e-B-FYKrwT.js']) assert.equal(count(chunk(name), 'Rewound.'), 0, name);
});

test('rewind: the host rewindConversation adds no success toast and the old strings are gone (zh-CN too)', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  const start = main.indexOf('async function rewindConversation(');
  const end = main.indexOf('} catch (error) {', start);
  assert.ok(start > 0 && end > start);
  const success = main.slice(start, end);
  assert.doesNotMatch(success, /toasts\??\.add\(/);
  assert.doesNotMatch(success, /filesRestored\.length/);
  assert.match(success, /setDraft\(text\|\|''\);restoredTextFocus\(/);
  assert.equal(count(main, 'Rewound.'), 0);
  const zh = fs.readFileSync(path.join(ROOT, 'electron/i18n/zh-CN/session.mjs'), 'utf8');
  assert.equal(count(zh, '"Rewound. {count}'), 0);
});
