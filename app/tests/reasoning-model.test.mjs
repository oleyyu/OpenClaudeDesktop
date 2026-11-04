import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { reasoningPlacement, thinkingQuote } from '../src/reasoning-model.mjs';

// scroll-messages-current.js B2 :44440-44448, H2/U2/oue :44449-44545 and the
// precedingThinking split (u8 :53187-53196, i8 :53030-53060).
test('thinkingQuote is the B2 quote: header with ~length/4 tokens, blank lines as bare ">"', () => {
  assert.equal(thinkingQuote('a\n\nb'), '> **Thinking** (~1 tok)\n>\n> a\n>\n> b');
  assert.equal(thinkingQuote('Check the config first.'), '> **Thinking** (~6 tok)\n>\n> Check the config first.');
  assert.equal(thinkingQuote('x'.repeat(10)), `> **Thinking** (~3 tok)\n>\n> ${'x'.repeat(10)}`, 'Math.round(2.5) rounds up');
  assert.equal(thinkingQuote(''), '> **Thinking** (~0 tok)\n>\n>');
});

test('placement: a thought before a tool of the same turn precedes tools; prose, another turn or the end is standalone', () => {
  const thought = (id, turnId = 't', text = 'Think') => ({ id, type: 'reasoning', turnId, summary: [text] });
  const command = { id: 'c', type: 'commandExecution', turnId: 't' };
  const answer = { id: 'a', type: 'agentMessage', turnId: 't', text: 'Answer' };
  assert.equal(reasoningPlacement([thought('r'), command], 0), 'preceding-tools');
  assert.equal(reasoningPlacement([thought('r'), answer], 0), 'standalone');
  assert.equal(reasoningPlacement([thought('r')], 0), 'standalone');
  assert.equal(reasoningPlacement([thought('r'), { ...command, turnId: 'u' }], 0), 'standalone');
  // Every tool row counts, including the grouped card.
  for (const type of ['fileChange', 'webSearch', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall', 'fileToolGroup'])
    assert.equal(reasoningPlacement([thought('r'), { id: 'x', type, turnId: 't' }], 0), 'preceding-tools', type);
  // Hidden rows (blank prose, roll-ups) and further thoughts are skipped.
  const blank = { id: 'b', type: 'agentMessage', turnId: 't', text: ' \n' };
  const rollup = { id: 's', type: 'subAgentActivity', turnId: 't' };
  assert.equal(reasoningPlacement([thought('r'), blank, rollup, thought('r2'), command], 0), 'preceding-tools');
  assert.equal(reasoningPlacement([thought('r'), thought('r2'), answer], 0), 'standalone');
  // A hidden row of another turn is still a turn boundary.
  assert.equal(reasoningPlacement([thought('r'), { ...blank, turnId: 'u' }, { ...command, turnId: 'u' }], 0), 'standalone');
  // Local rows (no turn) end the run.
  assert.equal(reasoningPlacement([thought('r'), { id: 'local', localCommand: true }, command], 0), 'standalone');
  // The index addresses the thought inside a longer list.
  assert.equal(reasoningPlacement([answer, thought('r'), command], 1), 'preceding-tools');
});

let server, S;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
});
after(() => server?.close());

test('SSR: thinking before tools is an open "Thought process" step; other thinking is a plain italic block', () => {
  const thought = { id: 'r', type: 'reasoning', turnId: 't', summary: ['Look at **this**\n\nthen go'] };
  const render = (props) => renderToStaticMarkup(React.createElement(S.SourceMessage, { item: thought, sessionKey: 's', transcriptView: 'thinking', ...props }));
  const step = render({ reasoningPlacement: 'preceding-tools' });
  assert.match(step, /data-cds="TurnStatusStep"/);
  assert.match(step, /aria-expanded="true"[^>]*><span class="source-step-label ">Thought process<\/span>/);
  // Plain text body (no Markdown, its emphasis markers dropped), beside the "Thinking actions" toolbar with Copy as quote.
  assert.match(step, /<div class="source-reasoning-step-text"><bdi>Look at this\n\nthen go<\/bdi><\/div>/);
  assert.match(step, /<div class="source-step-actions" role="toolbar" aria-label="Thinking actions"><button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="xs" [^>]*aria-label="Copy as quote"/);
  assert.doesNotMatch(step, /<strong>|source-markdown/);
  const block = render({});
  assert.match(block, /^<div class="source-message source-reasoning source-reasoning-block" data-transcript-item-id="r"><div class="source-reasoning-text">Look at this\n\nthen go<\/div>/);
  assert.match(block, /<div class="source-reasoning-copy"><button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" class="[^"]* source-reasoning-copy-button" aria-label="Copy as quote"/);
  // W14-code r6: shared-frame CdsButton (c96d752d0 cXe `f(J,{variant:"ghost",size:"base",icon:c,…,iconOnly:!0})`), not the replica.
  assert.doesNotMatch(block, /TurnStatusStep| aria-expanded="|<strong>|source-markdown/);
  // Normal view hides both; Verbose forces the step open.
  assert.equal(render({ transcriptView: 'normal', reasoningPlacement: 'preceding-tools' }), '');
  assert.equal(render({ transcriptView: 'normal' }), '');
  assert.match(render({ transcriptView: 'verbose', reasoningPlacement: 'preceding-tools' }), /aria-expanded="true"/);
  // Blank thoughts render nothing.
  assert.equal(render({ item: { ...thought, summary: [' \n'] } }), '');
});
