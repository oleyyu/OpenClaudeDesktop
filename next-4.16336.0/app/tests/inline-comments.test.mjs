import test from 'node:test';
import assert from 'node:assert/strict';
import { serializePlanComments, planFeedbackWithComments, serializeLineComment, planCommentsStore, addToPrompt, promptAdditions, ADD_TO_PROMPT_EVENT } from '../src/inline-comments.mjs';

test('plan comments serialize as the official "On selected text" blocks, before the typed feedback', () => {
  const comments = [{ quote: 'Step 2: drop the table\nand recreate it', text: 'Use a migration instead.' }, { quote: 'tests', text: '  ' }];
  assert.equal(serializePlanComments(comments), 'On selected text:\n> Step 2: drop the table\n> and recreate it\nUse a migration instead.');
  assert.equal(planFeedbackWithComments(' Also keep the old API. ', comments), 'On selected text:\n> Step 2: drop the table\n> and recreate it\nUse a migration instead.\n\nAlso keep the old API.');
  assert.equal(planFeedbackWithComments('only this', []), 'only this');
});

test('a changed-line comment names the file and lines, quotes the code', () => {
  assert.equal(serializeLineComment({ path: 'src/a.js', start: 12, code: 'const x = 1;', text: 'Use let.' }), 'In src/a.js, line 12:\n> const x = 1;\nUse let.');
  assert.equal(serializeLineComment({ path: 'b.py', start: 3, end: 5, code: 'a\nb', text: 'x' }), 'In b.py, lines 3–5:\n> a\n> b\nx');
});

test('the plan comment store is per session: add, edit, remove, clear', () => {
  const seen = [];
  const off = planCommentsStore.subscribe(() => seen.push(planCommentsStore.version()));
  planCommentsStore.add('s1', { quote: 'q', text: 'first' });
  planCommentsStore.add('s1', { quote: 'q2', text: '  ' });
  const [entry] = planCommentsStore.get('s1');
  assert.equal(planCommentsStore.get('s1').length, 1);
  planCommentsStore.edit('s1', entry.id, 'changed');
  assert.equal(planCommentsStore.get('s1')[0].text, 'changed');
  assert.deepEqual(planCommentsStore.get('s2'), []);
  planCommentsStore.remove('s1', entry.id);
  assert.deepEqual(planCommentsStore.get('s1'), []);
  planCommentsStore.add('s1', { quote: 'q', text: 'again' });
  planCommentsStore.clear('s1');
  assert.deepEqual(planCommentsStore.get('s1'), []);
  off();
  assert.ok(seen.length >= 5);
});

test('addToPrompt reports whether a listener took the text (B02 D1: nothing listening keeps the comment open)', () => {
  const target = new EventTarget();
  assert.equal(addToPrompt('note', target), false, 'no composer and no relay: not added');
  assert.equal(addToPrompt('   ', target), false);
  const seen = [];
  const passive = (event) => seen.push(['passive', event.detail.text]);
  const taker = (event) => { if (event.defaultPrevented) return; event.preventDefault(); seen.push(['taker', event.detail.text]); };
  const second = (event) => { if (!event.defaultPrevented) seen.push(['second', event.detail.text]); };
  target.addEventListener(ADD_TO_PROMPT_EVENT, passive);
  assert.equal(addToPrompt('only seen', target), false, 'a listener that does not take it does not count');
  target.addEventListener(ADD_TO_PROMPT_EVENT, taker);
  target.addEventListener(ADD_TO_PROMPT_EVENT, second);
  assert.equal(addToPrompt('  In a.js, line 1:\n> x\nfix  ', target), true);
  assert.deepEqual(seen, [['passive', 'only seen'], ['passive', 'In a.js, line 1:\n> x\nfix'], ['taker', 'In a.js, line 1:\n> x\nfix']], 'one taker; later sides skip it');
  assert.equal(addToPrompt('x', null), false);
});

test('promptAdditions queues relayed text per session until the side showing it takes it', () => {
  const heard = [];
  const off = promptAdditions.subscribe((sessionId) => heard.push(sessionId));
  assert.equal(promptAdditions.queue('', 'x'), false);
  assert.equal(promptAdditions.queue('s1', '  '), false);
  assert.equal(promptAdditions.queue('s1', ' first '), true);
  assert.equal(promptAdditions.queue('s1', 'second'), true);
  assert.equal(promptAdditions.queue('s2', 'other'), true);
  assert.deepEqual(heard, ['s1', 's1', 's2']);
  assert.equal(promptAdditions.has('s1'), true);
  assert.deepEqual(promptAdditions.take('s1'), ['first', 'second']);
  assert.equal(promptAdditions.has('s1'), false);
  assert.deepEqual(promptAdditions.take('s1'), []);
  assert.deepEqual(promptAdditions.take('s2'), ['other']);
  off();
  promptAdditions.queue('s3', 'quiet');
  assert.deepEqual(heard, ['s1', 's1', 's2']);
  promptAdditions.take('s3');
});
