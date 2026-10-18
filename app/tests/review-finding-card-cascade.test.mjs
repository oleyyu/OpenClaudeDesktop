import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, declarations, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

// R3-terminal FT-09 (diffgit-01): the 2.42304.0 finding card (c44d00c7f ya) renders inside the Changes diff, whose root
// is `.source-diff.diff.sdiff-view`. Its layout lives in the official @layer utilities (c6a992d55); message-style.css's
// unlayered `.diff span { display: block; white-space: pre-wrap }` would beat it (D26's class of bug), so
// source-pane-review.css reverts the card's spans to the layers. Resolved through every sheet the renderer loads.
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
const REVERT = '.diff .spr-card-slot span { display: revert-layer; white-space: revert-layer; }';

test('real cascade: the card keeps its official layout inside the .diff root', () => {
  const doc = tree();
  assert.ok(find(doc, (n) => hasClass(n, 'diff') && hasClass(n, 'source-diff')), 'the card sits under the .source-diff.diff root');
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
  // The winning declaration is the revert; it resolves to the official utility below it.
  assert.equal(declarations(cascade, badge, DISPLAY)[0].sheet, 'src/source-pane-review.css');
  const from = computed(cascade, badge, DISPLAY).from;
  assert.match(from?.sheet ?? '', /c6a992d55/, `the badge's display comes from the official utilities, not ${from?.sheet}`);
  assert.match(from?.layer?.join?.('.') ?? String(from?.layer), /utilities/);
  // Without the revert, message-style.css's unlayered `.diff span` wins: this is what the rule is for.
  const review = fs.readFileSync(path.join(ROOT, 'src/source-pane-review.css'), 'utf8');
  assert.ok(review.includes(REVERT));
  const without = loadCascade(sheets({ 'src/source-pane-review.css': review.replace(REVERT, '') }));
  assert.equal(computed(without, badge, DISPLAY).value, 'block');
  assert.equal(declarations(without, badge, DISPLAY)[0].sheet, 'src/message-style.css');
  // white-space (also set by `.diff span`, to pre-wrap) is reverted by the same rule, for the same spans.
  assert.match(fs.readFileSync(path.join(ROOT, 'src/message-style.css'), 'utf8'), /\.diff span \{\s*display: block;\s*white-space: pre-wrap;\s*\}/);
});
