// U-04 (ui-display-bugs-20261116): a Customize page inside the Settings shell has one scroller. The page brings its
// own fixed header + scrolling body (.cz-page / .cz-page-body / .cz-drill-scroll); the content box around it becomes a
// flex column that does not scroll, and in a short window the page's scrollers size to content so the box scrolls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(app, 'src/settings-lite.css'), 'utf8').replace(/\s+/g, ' ');
const block = (query) => { const at = css.indexOf(`@media (${query})`); assert.ok(at >= 0, query); return css.slice(at, css.indexOf('} }', at) + 3); };

test('tall window: the content box is a non-scrolling flex column and the Customize page fills it', () => {
  const tall = block('min-height:561px');
  assert.match(tall, /\.ss-content\.sl-content:has\(> \.cz-page\) \{ display:flex; flex-direction:column; overflow:hidden; padding-bottom:0; \}/);
  assert.match(tall, /\.sl-content:has\(> \.cz-page\) > \* \{ flex-shrink:0; \}/);
  assert.match(tall, /\.sl-content:has\(> \.cz-page\) > \.cz-page \{ flex:1 1 0; height:auto; min-height:0; \}/);
});

test('short window: the page scrollers size to content, leaving the content box as the one scroller', () => {
  const short = block('max-height:560px');
  assert.match(short, /\.sl-content > \.cz-page \{ height:auto; \}/);
  assert.match(short, /\.sl-content > \.cz-page :is\(\.cz-page-body,\.cz-drill,\.cz-drill-scroll,\.skf-card,\.skf-scroll\) \{ flex:none; height:auto; min-height:0; \}/);
  assert.doesNotMatch(short, /overflow:hidden/);
});

test('every Customize page renders as a direct .cz-page child of the content box (hostBody fragment)', () => {
  for (const file of ['src/source-customize.jsx', 'src/source-hooks-settings.jsx'])
    assert.match(fs.readFileSync(path.join(app, file), 'utf8'), /className="cz-page[ "]/, file);
});
