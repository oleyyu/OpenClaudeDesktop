import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { codeBlockLayout, controlsReserve } from '../src/code-block-layout-model.mjs';
import { filePreviewEmpty, fileTabReason } from '../src/file-unavailable-model.mjs';
import zhPanes from '../electron/i18n/zh-CN/panes.mjs';

// R4g-files FV1: toolcards-05 (c19e90103 Bg/Sg scroll + beside-actions), files-03 (cd2efac6e whitespace-only
// preview empty card), files-06 (cccc2cf0a jC "Auto save"), toolcards-09 (cb6930dae da [unicode-bidi:plaintext]).
const root = path.resolve(import.meta.dirname, '..');
let server, V, CB, L, MS;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V = await server.ssrLoadModule('/src/source-file-viewer.jsx');
  CB = await server.ssrLoadModule('/src/source-code-block.jsx');
  L = await server.ssrLoadModule('/src/code-block-layout-model.mjs');
  MS = await server.ssrLoadModule('/src/source-markdown-selection.jsx');
});
after(() => server?.close());
const h = React.createElement;
const text = (markup) => markup.replace(/<[^>]+>/g, '');

test('toolcards-05: codeBlockLayout follows Bg I/L/at/ot/st/ct', () => {
  // wrap + row (the defaults): no scroll, the dg reserve as end padding, one line centred.
  const wrap = codeBlockLayout({ language: 'bash', text: 'ls -la', controls: 2 });
  assert.deepEqual(wrap, { scroll: false, beside: false, singleLine: true, label: 'bash', endInset: null,
    paddingEnd: controlsReserve(2), centred: true });
  // F = P === "text": a text fence never scrolls.
  assert.equal(codeBlockLayout({ overflow: 'scroll', labelPlacement: 'beside-actions', language: ' Text ', text: 'x' }).scroll, false);
  // scroll + beside-actions, one line: endInset = calc(at - 0.75rem), no line padding, centred.
  const one = codeBlockLayout({ overflow: 'scroll', labelPlacement: 'beside-actions', language: 'bash', text: 'ls -la\n', controls: 1 });
  const at = `calc(${controlsReserve(1)} + ${4 * 0.8 + 1.5}ch)`;
  assert.deepEqual(one, { scroll: true, beside: true, singleLine: true, label: 'bash', endInset: `calc(${at} - 0.75rem)`, paddingEnd: '0px', centred: true });
  // Multi-line: st = at as the end reserve, no endInset.
  const many = codeBlockLayout({ overflow: 'scroll', labelPlacement: 'beside-actions', language: 'js', text: 'a\nb', controls: 1 });
  assert.equal(many.endInset, null);
  assert.equal(many.paddingEnd, `calc(${controlsReserve(1)} + ${2 * 0.8 + 1.5}ch)`);
  assert.equal(many.centred, false);
  // pg = 20: the label reserve stops growing at 20 characters.
  const long = codeBlockLayout({ overflow: 'scroll', labelPlacement: 'beside-actions', language: 'x'.repeat(40), text: 'a', controls: 1 });
  assert.match(long.endInset, new RegExp(`\\+ ${(20 * 0.8 + 1.5).toString().replace('.', '\\.')}ch\\)`));
  // scroll without beside-actions: rt = 0px, actions at mt-1.25 (not centred).
  const row = codeBlockLayout({ overflow: 'scroll', labelPlacement: 'row', language: 'py', text: 'print(1)' });
  assert.deepEqual([row.scroll, row.beside, row.endInset, row.paddingEnd, row.centred], [true, false, null, '0px', false]);
});

test('toolcards-05: the document typography puts a fence in scroll + beside-actions with endInset and fade', () => {
  // R4i-files FI1: the session's renderMarkdown is SourceMarkdown, whose root is SourceMarkdownSelection's
  // div.source-markdown; the fence CSS (.source-markdown .scb-pre, … [data-overflow="scroll"] .scb-pre) is scoped to it.
  const md = (source) => h(MS.SourceMarkdownSelection, { text: source },
    h(CB.SourceCodeBlock, { text: 'npm install', language: 'bash', isFrontier: false, languageSettled: true, scopeKey: source }));
  const view = (presentation) => renderToStaticMarkup(h(V.SourceFileViewer, { file: { path: 'README.md', text: '# Title\n' },
    presentation, renderMarkdown: md, showHeader: false }));
  const reading = view('reading');
  assert.match(reading, /data-overflow="scroll"/);
  assert.match(reading, /data-label="beside-actions"/);
  assert.match(reading, /<span data-code-label="bash" class="scb-code-label scb-single-line"><\/span>/);
  assert.match(reading, /class="epitaxy-code-scroll scb-scroller" style="margin-inline-end:calc\(/);
  assert.match(reading, /<div aria-hidden="true" class="scb-scroll-fade" style="inset-inline-end:calc\(/);
  assert.match(reading, /<div class="scb-scroll-content"><pre class="scb-pre">/);
  assert.match(reading, /--scb-line-end:0px/);
  assert.doesNotMatch(reading, /data-code-language=/, 'beside the actions there is no language header');
  assert.match(reading, /<div class="epitaxy-file-prose sfv-prose"><div class="source-markdown"><div class="scb-flow" data-not-prose="">/);
  assert.match(reading, /<div class="source-markdown">(?:(?!<\/div>).)*?<div class="scb-block"[^>]*data-overflow="scroll"[\s\S]*?<pre class="scb-pre">/,
    'the scrolling fence and its pre sit inside .source-markdown');
  const css = fs.readFileSync(path.join(root, 'src/source-code-block.css'), 'utf8');
  for (const selector of ['.source-markdown .scb-pre {', '.source-markdown .scb-block[data-overflow="scroll"] .scb-pre {', '.source-markdown .scb-flow {'])
    assert.ok(css.includes(selector), selector);
  // The pane presentation keeps the wrapped fence.
  const pane = view('pane');
  assert.doesNotMatch(pane, /data-overflow|epitaxy-code-scroll|data-code-label/);
  assert.match(pane, /<div class="scb-actions scb-single-line">/);
});

test('toolcards-05: scroll without beside-actions shows the language header; outside a provider nothing changes', () => {
  const block = (props) => h(CB.SourceCodeBlock, { text: 'a = 1\nb = 2', language: 'python', isFrontier: false, languageSettled: true, scopeKey: 'k', ...props });
  const row = renderToStaticMarkup(h(L.CodeBlockOverflowContext.Provider, { value: 'scroll' }, block()));
  assert.match(row, /<div dir="ltr" class="scb-language-row" style="padding-right:calc\(var\(--scb-control\) \* 3/);
  assert.match(row, /<span data-code-language="python" class="scb-language"><\/span>/);
  assert.doesNotMatch(row, /scb-scroll-fade|data-code-label/);
  assert.match(row, /<div class="scb-actions">/, 'I && !L: mt-1.25, not centred');
  const plain = renderToStaticMarkup(block());
  assert.doesNotMatch(plain, /data-overflow|scb-scroll-frame/);
  const css = fs.readFileSync(path.join(root, 'src/source-code-block.css'), 'utf8');
  for (const rule of ['.epitaxy-code-scroll { scrollbar-width: auto; scrollbar-color: auto; overflow-x: auto; }',
    '.scb-body:has(.epitaxy-code-scroll:focus-visible) { box-shadow: var(--cds-focus-shadow); }',
    '.scb-scroll-content { width: max-content; min-width: 100%; }'])
    assert.ok(css.includes(rule), rule);
  assert.match(css, /\[data-overflow="scroll"\] \.scb-pre \{\n  white-space: pre;/);
});

test('files-03: an untruncated whitespace-only Markdown preview shows This file is empty', () => {
  assert.equal(filePreviewEmpty('markdown', { text: '  \n\t' }), true);
  assert.equal(filePreviewEmpty('markdown', { text: '' , truncated: true }), true, 'contents === "" holds even when truncated');
  assert.equal(filePreviewEmpty('markdown', { text: '  \n', truncated: true }), false, 'Sc: a truncated body is not empty');
  assert.equal(filePreviewEmpty('text', { text: ' ' }), true);
  assert.equal(filePreviewEmpty('csv', { text: ' ' }), false);
  // Hu (the sandbox arm, html/svg): only an exactly empty body.
  assert.equal(filePreviewEmpty('html', { text: '' }), true);
  assert.equal(filePreviewEmpty('svg', { text: '' }), true);
  assert.equal(filePreviewEmpty('html', { text: ' \n' }), false);
  assert.equal(filePreviewEmpty(undefined, { text: ' ' }), false);
  assert.equal(filePreviewEmpty('markdown', { path: 'a.md' }), false, 'still loading');
  assert.equal(fileTabReason({ path: 'a.js', text: '  \n' }), null, 'fileTabReason keeps its meaning');
  const view = (file) => renderToStaticMarkup(h(V.SourceFileViewer, { file, renderMarkdown: (source) => h('p', null, source), showHeader: false }));
  assert.match(text(view({ path: 'notes.md', text: '  \n\n' })), /This file is empty/);
  assert.doesNotMatch(text(view({ path: 'notes.md', text: '  \n', truncated: true })), /This file is empty/);
  assert.doesNotMatch(text(view({ path: 'main.js', text: '  \n' })), /This file is empty/, 'a whitespace-only source file keeps its code view');
});

test('files-06: zh-CN translates the Auto save label the menu uses', () => {
  assert.equal(zhPanes['Auto save'], '自动保存');
  assert.equal(Object.hasOwn(zhPanes, 'Auto-save'), false);
  const settings = fs.readFileSync(path.join(root, 'src/file-view-settings.mjs'), 'utf8');
  assert.match(settings, /value:'files-thimble', label:t\('Auto save'\)/);
});

test('toolcards-09: question and answer carry unicode-bidi: plaintext', () => {
  const css = fs.readFileSync(path.join(root, 'src/source-question-receipt.css'), 'utf8');
  for (const selector of ['.sqr-question', '.sqr-answer']) {
    const rule = css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)));
    assert.match(rule, /unicode-bidi: plaintext;/, selector);
  }
});
