import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { messageFeedbackParams, MESSAGE_FEEDBACK_METHODS } = createRequire(import.meta.url)('../electron/message-feedback.cjs');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const deepseek = { engine: 'deepseek-harness', capabilities: { messageFeedback: true } };
const known = ['t-open', 't-archived'];

test('messageFeedback params are rebuilt for a known session on a core that reports the capability', () => {
  assert.deepEqual(messageFeedbackParams('codeDesktop/messageFeedback/list', { threadId: 't-open', extra: 1 }, deepseek, known), { threadId: 't-open' });
  assert.deepEqual(messageFeedbackParams('codeDesktop/messageFeedback/put', { threadId: 't-archived', itemId: 'item-1', rating: 'positive', ifVersion: null, cwd: '/etc' }, deepseek, known),
    { threadId: 't-archived', itemId: 'item-1', ifVersion: null, rating: 'positive' });
  assert.deepEqual(messageFeedbackParams('codeDesktop/messageFeedback/put', { threadId: 't-open', itemId: 'item-1', rating: 'negative', ifVersion: 'v3', note: 'wrong file', category: 'bad_result' }, deepseek, known),
    { threadId: 't-open', itemId: 'item-1', ifVersion: 'v3', rating: 'negative', note: 'wrong file', category: 'bad_result' });
  assert.deepEqual(messageFeedbackParams('codeDesktop/messageFeedback/delete', { threadId: 't-open', itemId: 'item-1', rating: 'positive' }, deepseek, known),
    { threadId: 't-open', itemId: 'item-1', ifVersion: null });
});

test('messageFeedback refuses unknown sessions, bad fields and cores without the capability', () => {
  const put = (params, info = deepseek) => () => messageFeedbackParams('codeDesktop/messageFeedback/put', { threadId: 't-open', itemId: 'item-1', rating: 'positive', ...params }, info, known);
  assert.throws(put({ threadId: 'someone-else' }), /Unknown session/);
  assert.throws(put({ threadId: undefined }), /Unknown session/);
  assert.throws(put({ itemId: '' }), /Unsupported operation/);
  assert.throws(put({ itemId: 7 }), /Unsupported operation/);
  assert.throws(put({ rating: 'meh' }), /Unsupported operation/);
  assert.throws(put({ ifVersion: { $gt: 0 } }), /Unsupported operation/);
  assert.throws(put({ category: '../x' }), /Unsupported operation/);
  assert.throws(put({}, { engine: 'codex', capabilities: {} }), /Unsupported operation/, 'Codex has no message ratings');
  assert.throws(put({}, null), /Unsupported operation/, 'no core connected');
  assert.throws(() => messageFeedbackParams('codeDesktop/messageFeedback/purge', { threadId: 't-open' }, deepseek, known), /Unsupported operation/);
});

test('every literal rpc() method the renderer sends is in the main-process allowlist', () => {
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  const start = main.indexOf('const allowed = new Set([');
  assert.ok(start > 0, 'main.cjs keeps its rpc allowlist');
  const allowed = new Set([...main.slice(start, main.indexOf(']);', start)).matchAll(/^\s*"([^"]+)",/gm)].map((m) => m[1]));
  for (const method of MESSAGE_FEEDBACK_METHODS) assert.ok(allowed.has(method), method);
  assert.match(main, /if \(p\.method\.startsWith\("codeDesktop\/messageFeedback\/"\)\) \{\s*return client\.request\(p\.method, messageFeedbackParams\(/);
  const missing = [];
  for (const name of fs.readdirSync(path.join(root, 'src'))) {
    if (!/\.(jsx|mjs|js)$/.test(name)) continue;
    const text = fs.readFileSync(path.join(root, 'src', name), 'utf8');
    for (const m of text.matchAll(/\brpc\(\s*(["'`])([^"'`$]+)\1\s*[,)]/g)) if (!allowed.has(m[2])) missing.push(`${m[2]} (${name})`);
  }
  assert.deepEqual(missing, [], 'a renderer rpc() the main process would refuse with "Unsupported operation."');
});
