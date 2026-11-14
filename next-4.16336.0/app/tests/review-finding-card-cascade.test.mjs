import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, declarations, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

// R3-terminal FT-09 (diffgit-01): the 2.42304.0 finding card (c44d00c7f ya) renders inside the Changes diff
// (`.source-diff.sdiff-view`). Its layout lives in the official @layer utilities (c6a992d55). W14-code css-main-03
// removed message-style.css's legacy unlayered `.diff span { display: block; white-space: pre-wrap }` (and the `diff`
// root class it matched), so the card's spans keep the utilities with no revert-layer release. Resolved through every
// sheet the renderer loads.
const ROOT = path.resolve(import.meta.dirname, '..');
let server, D;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  D = await server.ssrLoadModule('/src/source-diff.jsx');
});
after(() => server?.close());

const patch = 'diff --git a/src/a.js b/src/a.js\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1,3 +1,4 @@\n one\n two\n+three\n four\n';
const findings = [{ id: 'f1', file: 'src/a.js', line: 3, endLine: 3, summary: 'On three', detail: 'Why it fails', category: 'Correctness' }];
function tree() {
  const html = renderToStaticMarkup(React.createElement(D.SourceDiff, { value: patch, placement: 'changes',
    review: { findings, statuses: {}, currentId: null, onDismiss() {}, onFix() {}, onNext() {} } }));
  const root = element('div', { id: 'root' });
  for (const node of parseMarkup(html)) append(root, node);
  return element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' }, [element('body', {}, [root])]);
}
const hasClass = (node, name) => (node.attrs.class ?? '').split(/\s+/).includes(name);
// The shared resolver (tests/fixtures/transcript-css-cascade.mjs) tracks no `display`. Every sheet's `display`
// declarations are renamed to the tracked, non-inherited -webkit-app-region (whose own declarations are moved out of
// the way first), so the resolver orders exactly the display declarations — same selectors, layers, importance and
// sheet order — and reports the winner under that name.
const asDisplay = (code) => code.replace(/(?<![\w-])(?:-webkit-)?app-region\s*:/g, '--r3t-app-region:').replace(/(?<![\w-])display\s*:/g, '-webkit-app-region:');
const DISPLAY = '-webkit-app-region';
const sheets = (replace = {}) => appSheets(ROOT, replace).map((sheet) => ({ ...sheet, code: asDisplay(sheet.code) }));

test('real cascade: the card keeps its official layout inside the Changes diff root', () => {
  const doc = tree();
  assert.ok(find(doc, (n) => hasClass(n, 'sdiff-view') && hasClass(n, 'source-diff') && !hasClass(n, 'diff')), 'the card sits under the .source-diff root, which has no legacy diff class');
  const cascade = loadCascade(sheets());
  const badge = find(doc, (n) => n.tag === 'span' && n.attrs['data-cds'] === 'Badge');
  const claude = find(doc, (n) => n.tag === 'span' && hasClass(n, 'text-body-medium'));
  const label = find(doc, (n) => n.tag === 'span' && hasClass(n, 'text-footnote'));
  const buttonLabel = find(doc, (n) => n.tag === 'span' && hasClass(n, 'inline-flex') && n.parent?.tag === 'button' && n.parent.attrs['data-size'] === 'sm');
  for (const node of [badge, claude, label, buttonLabel]) assert.ok(node);
  const value = (node) => computed(cascade, node, DISPLAY).value;
  assert.equal(value(badge), 'inline-flex', 'CdsBadge: inline-flex (@layer utilities)');
  assert.equal(value(buttonLabel), 'inline-flex', 'the Fix this one button label');
  assert.notEqual(value(label), 'block', 'the line label stays inline in the header row');
  assert.notEqual(value(claude), 'block');
  const from = computed(cascade, badge, DISPLAY).from;
  assert.match(from?.sheet ?? '', /c6a992d55/, `the badge's display comes from the official utilities, not ${from?.sheet}`);
  assert.match(from?.layer?.join?.('.') ?? String(from?.layer), /utilities/);
  // No legacy rule or release is left.
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/message-style.css'), 'utf8'), /\.diff (span|\.added|\.removed)\b/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/source-pane-review.css'), 'utf8'), /revert-layer/);
});
