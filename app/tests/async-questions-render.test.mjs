import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Codex's asynchronous questions (agentMessage.questions, delivery 'async') render as a question card under the message.
let server, Q, S;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Q = await server.ssrLoadModule('/src/source-async-questions.jsx');
  S = await server.ssrLoadModule('/src/source-session.jsx');
});
after(() => server?.close());
const item = { id: 'm1', type: 'agentMessage', text: 'One question while I keep going.', delivery: 'async', questions: [{ title: 'Which database should I target?', options: ['Postgres', 'SQLite'] }] };
const render = (context, element) => renderToStaticMarkup(React.createElement(Q.AsyncQuestionsContext.Provider, { value: context }, element));

test('the card shows the question, its options, Other and Skip; Send waits for an answer', () => {
  const html = render({ settled: new Set(), canAnswer: true, answer: async () => {}, skip: () => {} }, React.createElement(Q.SourceAsyncQuestions, { item }));
  assert.match(html, /data-async-questions="m1"/);
  assert.match(html, /Which database should I target\?/);
  assert.match(html, />Postgres</);
  assert.match(html, />SQLite</);
  // W12: the question card's 3.6556.2 structure (c9ed5627b ut rows, the Other row, CdsButton footer).
  assert.match(html, /class="source-async-questions epitaxy-approval-card /);
  assert.match(html, /<span class="flex-1 select-text">Other<\/span>/);
  assert.match(html, />Skip</);
  const primary = html.slice(html.lastIndexOf('<button'));
  assert.match(primary, /^<button type="button" disabled="" data-cds="Button"/);
  assert.match(primary, />Send answer</);
  assert.doesNotMatch(html, /sq-/);
});

test('a settled question (answered, skipped, or followed by a user message) is not shown; nor without the session context', () => {
  assert.equal(render({ settled: new Set(['m1']), canAnswer: true, answer: async () => {}, skip: () => {} }, React.createElement(Q.SourceAsyncQuestions, { item })), '');
  assert.equal(renderToStaticMarkup(React.createElement(Q.SourceAsyncQuestions, { item })), '');
});

test('the assistant message renders its async questions once it is complete', () => {
  const context = { settled: new Set(), canAnswer: true, answer: async () => {}, skip: () => {} };
  assert.match(render(context, React.createElement(S.SourceMessage, { item, isStreaming: false })), /Which database should I target\?/);
  assert.doesNotMatch(render(context, React.createElement(S.SourceMessage, { item, isStreaming: true })), /data-async-questions/);
});

test('a Codex ::code-comment renders as a finding with its priority badge and a file link; git receipts are hidden', () => {
  const text = 'Review done.\n\n::code-comment{title="[P1] Unchecked input" body="Validate it first." file="/repo/src/a.js" start=4 end=6}\n::git-push{cwd="/repo" branch="fix"}';
  const html = renderToStaticMarkup(React.createElement(S.SourceMarkdown, { text, cwd: '/repo', onOpenFileRef: () => {} }));
  assert.match(html, /class="smd-priority" data-priority="1" role="img" aria-label="Priority 1">P1</);
  assert.match(html, /<strong>Unchecked input<\/strong>/);
  assert.match(html, /data-file-ref="\/repo\/src\/a\.js" data-file-line="4" data-file-end-line="6"/);
  assert.match(html, /Validate it first\./);
  assert.doesNotMatch(html, /::code-comment|::git-push/);
});
