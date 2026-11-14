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
  const body = header('source-session.jsx', '<header className="source-pane-header" data-pane-header={tab}' /* W14-code r4 r4pa-c03: then {...paneWindowHeader} */);
  const handle = body.indexOf('{headerCenter}');
  assert.equal(body.split('{headerCenter}').length, 2, 'rendered once');
  // W12c files-tabbar: the strip is the ViewTabBar (<SourceFileTabs>, cccc2cf0a ND `ey`).
  assert.ok(body.indexOf('<SourceFileTabs ') > 0 && handle > body.indexOf('<SourceFileTabs '), 'after the tab strip');
  assert.ok(handle > body.indexOf('<span className="source-pane-title"'), 'after the title');
  assert.ok(body.indexOf('<span className="source-pane-title"') > 0, 'the title is span.source-pane-title');
  assert.ok(handle < body.indexOf('paneControls'), 'before trailing controls');
});

// session-page relink SP-2: the Background tasks pane is the 4.16336.0 pane frame c4db265df Tn (generated/session-panels-v4
// PaneFrame); its header order is Tn's own: in a tile the row is [b (window drag strip), S (the toolbar: title, then the
// actions with the trailing slot), C (center, the tile drag handle), w], so the handle follows the title and paints above
// the toolbar; the host passes the handle as center and its controls as trailing, nothing else orders them.
test('background tasks header: the official pane frame puts the drag handle after the title and its actions', () => {
  const c4d = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1'), 'c4db265df-CHyZjtsm.js'), 'utf8');
  assert.ok(c4d.includes('T=J4($,111,b,S,C,w)?K4($,111,b,S,C,w,n(i,{children:[b,S,C,w]})):$[115]'));
  assert.ok(c4d.includes('C=X===null&&_'));
  const text = fs.readFileSync(path.join(src, 'source-agent.jsx'), 'utf8');
  const call = text.slice(text.indexOf('<PaneFrame '), text.indexOf('>', text.indexOf('onBack={views.length>0 ? onBack : undefined}')));
  assert.equal(call.split('{headerCenter}').length, 2, 'rendered once');
  assert.match(call, /center=\{headerCenter\}/);
  // B21: rw "Clear finished tasks" leads the trailing controls through trailing(controls).
  assert.match(call, /trailing=\{trailing\(controls\)\}/);
  assert.match(call, /title=\{current\?\.description \|\| t\('Background tasks'\)\}/);
});
