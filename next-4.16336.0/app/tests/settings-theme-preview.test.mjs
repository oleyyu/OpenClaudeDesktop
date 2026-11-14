import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Fidelity F14: the Settings › Code appearance preview (c71860c77-yvGrrWO9.js:2504-2600 hi/Bt) renders greet.ts with the
// @pierre/diffs default lineDiffType 'word-alt' (ca7ba268c getOptionsWithDefaults), so the paired removed/added rows carry
// the changed-fragment emphasis; it goes through SourceHighlightedLine ([data-diff-span], source-diff-code.css).
const app = path.resolve(import.meta.dirname, '..');
let server, preview, words;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  preview = await server.ssrLoadModule('/src/source-code-theme-preview.jsx');
  words = await server.ssrLoadModule('/src/word-diff-model.mjs');
});
after(() => server?.close());

const rows = (html) => [...html.matchAll(/<div class="sdiff-row (\w+)" data-diff-row="\w+" data-kind="(\w+)">([\s\S]*?)<\/code><\/div><\/div>/g)]
  .map(([, type, kind, body]) => ({ type, kind, body, spans: [...body.matchAll(/<span data-diff-span="">([\s\S]*?)<\/span>/g)].map(match => match[1].replace(/<[^>]+>/g, '')) }));
const decode = (text) => text.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");

test('the removed and added preview rows carry word-alt [data-diff-span] emphasis; context rows carry none', () => {
  for (const mode of ['light', 'dark']) {
    const html = renderToStaticMarkup(React.createElement(preview.SourceCodeThemePreview, { mode, theme: mode === 'light' ? 'claude-light' : 'claude-dark' }));
    assert.match(html, new RegExp(`data-mode="${mode}"`));
    const list = rows(html);
    assert.deepEqual(list.map(row => [row.type, row.kind]), [['context', 'context'], ['removed', 'removed'], ['added', 'added'], ['context', 'context']]);
    assert.ok(list.every(row => row.body.includes('class="sdiff-line-content scb-code source-diff-code"')));
    const expected = words.wordDiffRanges(preview.GREET_BEFORE.split('\n')[1], preview.GREET_AFTER.split('\n')[1]);
    assert.deepEqual(preview.GREET_WORD_RANGES, expected);
    const before = preview.GREET_BEFORE.split('\n')[1], after = preview.GREET_AFTER.split('\n')[1];
    assert.deepEqual(list[1].spans.map(decode), expected.before.map(([start, end]) => before.slice(start, end)));
    assert.deepEqual(list[2].spans.map(decode), expected.after.map(([start, end]) => after.slice(start, end)));
    assert.ok(list[1].spans.length >= 1 && list[2].spans.length >= 1);
    assert.equal(list[0].spans.length + list[3].spans.length, 0);
    // The full line text survives the split into emphasis spans.
    assert.equal(decode(list[1].body.replace(/^[\s\S]*?<code[^>]*>/, '').replace(/<[^>]+>/g, '')), before);
    assert.equal(decode(list[2].body.replace(/^[\s\S]*?<code[^>]*>/, '').replace(/<[^>]+>/g, '')), after);
  }
});
