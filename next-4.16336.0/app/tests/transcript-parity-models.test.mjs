import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedSend, failedSend, notDeliveredLabel, pendingSend, pendingStillShown, pendingUserRow, retriedSend, withKnownItems } from '../src/pending-send-model.mjs';
import { userMessageActions } from '../src/message-actions-model.mjs';
import { plainReasoningText } from '../src/reasoning-model.mjs';
import { linkTarget, messageMenu } from '../src/transcript-context-menu-model.mjs';
import { fileGroupPresentation, groupFileTools } from '../src/file-tool-model.mjs';

const user = (id, text, turnId = 't1') => ({ id, turnId, type: 'userMessage', content: [{ type: 'text', text, text_elements: [] }] });

test('optimistic send: sending row, echo hand-over, refusal keeps Retry / Discard', () => {
  const before = [user('u0', 'earlier')];
  const entry = withKnownItems(pendingSend({ threadId: 'th', text: 'hello', now: 1000, id: 'local-1' }), before);
  assert.equal(entry.status, 'sending');
  assert.deepEqual(entry.knownItemIds, ['u0']);
  const row = pendingUserRow(entry);
  assert.equal(row.type, 'userMessage');
  assert.equal(row.localDelivery.status, 'sending');
  assert.equal(row.localDelivery.onRetry, null);
  assert.deepEqual(row.content, [{ type: 'text', text: 'hello', text_elements: [] }]);
  // Older rows and a non-matching new row do not end it; the echo does.
  assert.equal(pendingStillShown(entry, before), true);
  assert.equal(pendingStillShown(entry, [...before, user('u1', 'other')]), true);
  assert.equal(pendingStillShown(entry, [...before, user('u1', 'hello')]), false);
  // Once turn/start answered, any new row hands over (a rewritten echo, or an answer without one).
  const accepted = acceptedSend(entry);
  assert.equal(accepted.accepted, true);
  assert.equal(pendingStillShown(accepted, before), true);
  assert.equal(pendingStillShown(accepted, [...before, { id: 'a1', type: 'agentMessage', text: 'hi' }]), false);
  // Refused: stays whatever arrives; Retry / Discard are offered.
  const failed = failedSend(accepted, new Error('boom'));
  assert.equal(failed.status, 'failed');
  assert.equal(failed.accepted, false);
  assert.equal(failed.error, 'boom');
  assert.equal(pendingStillShown(failed, [...before, user('u1', 'hello')]), true);
  const retry = () => {}, discard = () => {};
  const failedRow = pendingUserRow(failed, { onRetry: retry, onDiscard: discard });
  assert.equal(failedRow.localDelivery.onRetry, retry);
  assert.equal(failedRow.localDelivery.onDiscard, discard);
  // Retry: 'Sending…' again, against the rows there now.
  const again = retriedSend(failed, [...before, user('u2', 'x')], 2000);
  assert.equal(again.status, 'sending');
  assert.equal(again.sentAt, 2000);
  assert.deepEqual(again.knownItemIds, ['u0', 'u2']);
  assert.match(notDeliveredLabel(1000), /^Not delivered · /);
  assert.equal(notDeliveredLabel(null), 'Not delivered');
});

test('optimistic send keeps image and file attachments in the bubble', () => {
  const entry = pendingSend({ text: '', attachments: [{ kind: 'image', path: '/w/a.png', previewUrl: 'blob:x' }, { name: 'b.ts', path: '/w/b.ts' }] });
  const row = pendingUserRow(entry);
  assert.deepEqual(row.content, [{ type: 'localImage', path: '/w/a.png', imageUrl: 'blob:x' }, { type: 'mention', name: 'b.ts', path: '/w/b.ts' }]);
});

test('user message toolbar: Rewind / Fork offered as the session can', () => {
  const onRewindTo = () => {}, onForkFrom = () => {};
  assert.equal(userMessageActions({ turnId: null }), null);
  const idle = userMessageActions({ turnId: 't1', rewindServed: true, onRewindTo, onForkFrom });
  assert.equal(typeof idle.rewind.onClick, 'function');
  assert.equal(typeof idle.fork, 'function');
  const busy = userMessageActions({ turnId: 't1', running: true, activeTurnId: 't2', rewindServed: true, busyReason: 'Rewind is unavailable while Codex is working', onRewindTo: null, onForkFrom });
  assert.deepEqual(busy.rewind, { disabledReason: 'Rewind is unavailable while Codex is working' });
  assert.equal(busy.fork, null);
  assert.equal(userMessageActions({ turnId: 't1', rewindServed: false, onForkFrom: null }), null);
});

test('reasoning drops Markdown title markers and inline emphasis', () => {
  assert.equal(plainReasoningText('**Planning the refactor**\n\nI will split the module.'), 'Planning the refactor\nI will split the module.');
  assert.equal(plainReasoningText('Use **bold** and *it* and _em_ here'), 'Use bold and it and em here');
  assert.equal(plainReasoningText('keep snake_case and __init__ and a*b'), 'keep snake_case and __init__ and a*b');
  assert.equal(plainReasoningText(null), '');
});

test('links: loopback pages can open in the Browser pane; rewind / fork in the message menu', () => {
  assert.equal(linkTarget('http://localhost:5173/').canOpenInPreview, true);
  assert.equal(linkTarget('http://127.0.0.1:3000').canOpenInPreview, true);
  assert.equal(linkTarget('http://[::1]:8080/').canOpenInPreview, true);
  assert.equal(linkTarget('https://example.com').canOpenInPreview, false);
  assert.equal(linkTarget('mailto:a@b.c').canOpenInPreview, false);
  const ids = messageMenu({ linkHref: 'http://localhost:5173/', canOpenInBrowser: true, canOpenInPreview: true, messageText: 'x' })
    .filter((entry) => entry.type === 'item').map((entry) => entry.id);
  assert.deepEqual(ids.slice(0, 3), ['open-link', 'open-in-preview', 'copy-link']);
  const menu = messageMenu({ messageText: 'x', canRewind: true, canFork: true }).filter((entry) => entry.type === 'item').map((entry) => entry.id);
  assert.deepEqual(menu.slice(-2), ['rewind', 'fork']);
});

test('viewed images, generated images and sleeps stay inside the tool group', () => {
  const items = [
    { id: 'c1', turnId: 't', type: 'commandExecution', status: 'completed', command: 'ls', commandActions: [] },
    { id: 'v1', turnId: 't', type: 'imageView', path: '/w/shot.png' },
    { id: 's1', turnId: 't', type: 'sleep', durationMs: 30000 },
    { id: 'g1', turnId: 't', type: 'imageGeneration', status: 'completed' },
  ];
  const rows = groupFileTools(items);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'fileToolGroup');
  assert.deepEqual(rows[0].toolGroup.map((item) => item.id), ['c1', 'v1', 's1', 'g1']);
  const summary = JSON.stringify(fileGroupPresentation(items));
  assert.match(summary, /read/);
  assert.match(summary, /waited/);
  assert.match(summary, /30s/);
  assert.match(summary, /generated/);
});
