import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ka (panes-toggle-current.js:1614-1632) renders a pane header as [H, t, o] then
// trailing pe: the tile's center drag handle o follows the header/title content,
// so the absolute 44x16 handle paints above the position:relative file tab strip.
// 0.2.119 offscreen pane-layout run: with the handle first, .source-file-tabs took
// the press at the handle center in an 800px window (tear-off never started).
const src = path.resolve(import.meta.dirname, '../src');
const header = (file, open) => {
  const text = fs.readFileSync(path.join(src, file), 'utf8');
  const start = text.indexOf(open);
  assert.ok(start >= 0, `${file}: header`);
  return text.slice(start, text.indexOf('</header>', start));
};

test('side panel header renders the drag handle after the tabs/title and before trailing controls', () => {
  const body = header('source-session.jsx', '<header className="source-pane-header" data-pane-header={tab}>');
  const handle = body.indexOf('{headerCenter}');
  assert.equal(body.split('{headerCenter}').length, 2, 'rendered once');
  // W12c files-tabbar: the strip is the ViewTabBar (<SourceFileTabs>, cccc2cf0a ND `ey`).
  assert.ok(body.indexOf('<SourceFileTabs ') > 0 && handle > body.indexOf('<SourceFileTabs '), 'after the tab strip');
  assert.ok(handle > body.indexOf('<span className="source-pane-title"'), 'after the title');
  assert.ok(body.indexOf('<span className="source-pane-title"') > 0, 'the title is span.source-pane-title');
  assert.ok(handle < body.indexOf('paneControls'), 'before trailing controls');
});

test('background tasks header renders the drag handle after its title and before controls', () => {
  const body = header('source-agent.jsx', '<header className="source-pane-header" data-pane-header="tasks">');
  const handle = body.indexOf('{headerCenter}');
  assert.ok(handle > body.indexOf('sag-pane-title'));
  // B21: rw "Clear finished tasks" leads the trailing controls through trailing(controls).
  assert.ok(handle < body.search(/\{(?:trailing\()?controls\)?\}/));
});
