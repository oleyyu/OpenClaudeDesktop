import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncAnswerText, asyncQuestionsOf, settledQuestionIds } from '../src/async-questions-model.mjs';

test('asyncQuestionsOf keeps titled questions and bounds their options as the TUI does', () => {
  const options = Array.from({ length: 40 }, (_, index) => `o${index}`);
  const questions = asyncQuestionsOf({ type: 'agentMessage', delivery: 'async', questions: [{ title: ' Which DB? ', options: ['Postgres', 'x'.repeat(513), '', 'SQLite'] }, { title: '' }, { title: 'Many', options }, { title: 'Free' }] });
  assert.deepEqual(questions[0], { title: 'Which DB?', options: ['Postgres', 'SQLite'] });
  assert.equal(questions.length, 3);
  assert.equal(questions[1].options.length, 32);
  assert.deepEqual(questions[2].options, []);
  assert.deepEqual(asyncQuestionsOf({ type: 'userMessage', questions: [{ title: 'x' }] }), []);
});

test('settledQuestionIds: a later user message settles earlier questions', () => {
  const items = [
    { id: 'a', type: 'agentMessage', questions: [{ title: 'q' }] },
    { id: 'u', type: 'userMessage' },
    { id: 'b', type: 'agentMessage', questions: [{ title: 'q2' }] },
    { id: 'c', type: 'agentMessage', text: 'no questions' },
  ];
  assert.deepEqual([...settledQuestionIds(items)], ['a']);
  assert.deepEqual([...settledQuestionIds(null)], []);
});

test('asyncAnswerText names a single question and lists several, skipping unanswered ones', () => {
  const questions = [{ title: 'Which DB?' }, { title: 'Port?' }];
  assert.equal(asyncAnswerText(questions, ['Postgres', '  ']), 'Answer to your question "Which DB?":\nPostgres');
  assert.equal(asyncAnswerText(questions, ['Postgres', '5432']), 'Answers to your questions:\n- "Which DB?": Postgres\n- "Port?": 5432');
  assert.equal(asyncAnswerText(questions, []), null);
});
