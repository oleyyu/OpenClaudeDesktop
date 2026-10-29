// w11-e31-diff-cont (E31 diff browser, continued): the Commits toolbar and Changed files tree keys (c44d00c7f Oi / rs /
// Ci, shared-18 ok / sk, c82eca2bd Se / B), the folder menu's isDirectory (cs / ss), the gutter "+" (Uc), the image
// figure (nl), the scope arrow (cccc2cf0a $S) and the ⌥F9 match / IME split (ca6e98a55, Jd Qn). Official chunks are read
// as text, never executed; host components render through Vite SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official3 from '../scripts/official-3.6556.2.mjs';
import { ENTER_PICK_ENABLED, ENTER_PICK_GATE, commitsAltIgnored, enterPick, pickOnEnterKeyUp } from '../src/diff-commits-model.mjs';
import { prCommentComposing, prCommentMatch, prCommentStep } from '../src/diff-pr-comment-nav-model.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const official = (name) => fs.readFileSync(path.join(official3.ionSource, name), 'utf8');
const officialPrefix = (prefix) => official(fs.readdirSync(official3.ionSource).find((name) => name.startsWith(prefix)));
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DIFF = 'c44d00c7f-Cr1FDL2F.js';

let server, D;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  D = await server.ssrLoadModule('/src/source-diff.jsx');
  // As tests/diff-e31-v3.test.mjs: settle the session graph before the server closes.
  await server.ssrLoadModule('/src/source-session.jsx');
});
after(async () => { await server?.close(); });

test('official 3.6556.2 keys: Ci / Oi / rs, the Rn gate, requestDiffFocus, shared-18 sk', () => {
  const text = official(DIFF);
  for (const feature of [
    'function Ci(e,t,n){!t||!n||e.key!=="Enter"||e.repeat||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey||!Rn()||(e.preventDefault(),t.click(),er(e.currentTarget,n))}',
    'e.altKey&&!(e.key==="Tab"&&Ie())',
    'case"Enter":Ci(e,o??null,t)',
    's&&!s.hasAttribute("aria-expanded")&&Ci(e,s,t)',
    'onKeyDown:S,onKeyDownCapture:Z,onFocus:Di',
    'onKeyDownCapture:Z,onFocus:ns,onScroll:M,onContextMenu:V',
  ]) assert.ok(text.includes(feature), feature);
  const gate = officialPrefix('c82eca2bd-');
  assert.ok(gate.includes('function Se(){return te(z)??!0}') && gate.includes('z="__gb__2263689058"'));
  const tile = officialPrefix('cccc2cf0a-');
  for (const feature of ['Ze=J2($,64,Xe,r)?K2($,64,Xe,r,()=>Xe(r)):$[66]', 'function YO(e){return e.requestDiffFocus}',
    `HO='[role="group"][tabindex="0"]',UO={preventScroll:!0,focusVisible:!1}`]) assert.ok(tile.includes(feature), feature);
  assert.ok(official('shared-18-D3y8YMFN.js').includes(`function sk(e){rk(e)&&K(e.target)?.matches('[role^="menuitem"]')===!0&&e.preventDefault()}`));
  assert.equal(ENTER_PICK_GATE, '__gb__2263689058');
  assert.equal(ENTER_PICK_ENABLED, true, 'no GrowthBook client: Zo answers null, so Se is true');
});

function fakeWindow() {
  const listeners = [];
  const view = {
    addEventListener(type, fn, options) {
      const entry = { type, fn };
      listeners.push(entry);
      options?.signal?.addEventListener('abort', () => { listeners.splice(listeners.indexOf(entry), 1); });
    },
    fire(type, event = {}) { for (const entry of [...listeners]) if (entry.type === type) entry.fn({ type, ...event }); },
    count: () => listeners.length,
  };
  return view;
}

test('Ci: a plain Enter clicks the row, then the matching keyup runs onEnterPick while focus stays in the list', () => {
  const view = fakeWindow();
  const doc = { defaultView: view, body: { id: 'body' }, activeElement: null };
  const inside = { id: 'row' };
  const list = { ownerDocument: doc, contains: (node) => node === inside };
  let clicks = 0, picks = 0, prevented = 0;
  const row = { click: () => { clicks += 1; } };
  const key = (extra = {}) => ({ key: 'Enter', currentTarget: list, preventDefault: () => { prevented += 1; }, ...extra });
  assert.equal(enterPick(key(), row, () => { picks += 1; }), true);
  assert.deepEqual([clicks, prevented, picks], [1, 1, 0]);
  doc.activeElement = inside;
  view.fire('keyup', { key: 'Shift' });
  assert.equal(picks, 0, 'only the Enter keyup');
  view.fire('keyup', { key: 'Enter' });
  assert.equal(picks, 1);
  view.fire('keyup', { key: 'Enter' });
  assert.equal(picks, 1, 'once');
  assert.equal(view.count(), 0);
  // Focus moved elsewhere by the click: no pick. A window blur drops the wait.
  enterPick(key(), row, () => { picks += 1; });
  doc.activeElement = { id: 'elsewhere' };
  view.fire('keyup', { key: 'Enter' });
  assert.equal(picks, 1);
  enterPick(key(), row, () => { picks += 1; });
  view.fire('blur');
  doc.activeElement = doc.body;
  view.fire('keyup', { key: 'Enter' });
  assert.equal(picks, 1);
  pickOnEnterKeyUp(list, () => { picks += 1; });
  view.fire('keyup', { key: 'Enter' });
  assert.equal(picks, 2, 'focus on the body counts');
  // No row, no onEnterPick, a repeat, a modifier, or the gate off: nothing.
  for (const [event, target, pick, enabled] of [[key(), null, () => {}, true], [key(), row, undefined, true], [key({ repeat: true }), row, () => {}, true],
    [key({ shiftKey: true }), row, () => {}, true], [key({ metaKey: true }), row, () => {}, true], [key({ key: 'a' }), row, () => {}, true], [key(), row, () => {}, false]]) {
    assert.equal(enterPick(event, target, pick, enabled), false);
  }
  assert.equal(clicks, 3);
});

test('Oi: an Alt chord is ignored except Alt+Tab on macOS', () => {
  assert.equal(commitsAltIgnored({ altKey: false, key: 'ArrowDown' }, false), false);
  assert.equal(commitsAltIgnored({ altKey: true, key: 'ArrowDown' }, true), true);
  assert.equal(commitsAltIgnored({ altKey: true, key: 'Tab' }, true), false);
  assert.equal(commitsAltIgnored({ altKey: true, key: 'Tab' }, false), true);
});

test('host wiring: Commits toolbar and Changed files tree carry Oi / rs, sk, ok and onEnterPick; rows have no key handler', () => {
  const commits = source('src/source-diff-commits.jsx');
  assert.match(commits, /onKeyDown=\{\(event\) => commitsKeyDown\(event, onEnterPick\)\} onKeyDownCapture=\{preventMenuItemEnterRepeat\} onFocus=\{commitsFocus\} onContextMenu=\{preventNativeMenu\}/);
  assert.match(commits, /if \(!toolbar\.contains\(event\.target\) \|\| commitsAltIgnored\(event, isMacUserAgent\(\)\)\) return;/);
  assert.match(commits, /if \(openContextMenuFromKey\(event, current\?\.dataset\.commitRow === "commit" \? current : null\)\) return;/);
  assert.match(commits, /if \(event\.key === "Enter"\) \{ enterPick\(event, current \?\? null, onEnterPick\); return; \}/);
  assert.doesNotMatch(commits, /event\.key === "ContextMenu"/, 'Ni has no key handler of its own');
  const diff = source('src/source-diff.jsx');
  assert.match(diff, /onKeyDown=\{\(event\) => diffTreeKeyDown\(event, onEnterPick\)\}\s+onKeyDownCapture=\{preventMenuItemEnterRepeat\} onFocus=\{diffTreeFocus\} onScroll=\{onScroll\} onContextMenu=\{preventNativeMenu\}/);
  assert.match(diff, /if \(openContextMenuFromKey\(event, row\)\) return;/);
  assert.match(diff, /else if \(row && !row\.hasAttribute\('aria-expanded'\)\) enterPick\(event, row, onEnterPick\);/);
  assert.match(diff, /onEnterPick=\{enterPick\} actions=\{actions\} \/>/);
  assert.match(diff, /onEnterPick=\{enterPick\} collapsed=\{!!commits\.collapsed\}/);
  assert.match(diff, /\(body\.querySelector\('\[role="group"\]\[tabindex="0"\]'\) \?\? body\)\.focus\(\{ preventScroll: true, focusVisible: false \}\)/);
});

test('cs / ss: a folder whose files are all removed is not a directory for its menu (isDirectory = !allRemoved)', () => {
  const text = official(DIFF);
  assert.ok(text.includes('function ss(e){return e.children.every(e=>e.kind==="dir"?ss(e):e.removed)}'));
  assert.ok(text.includes('E=!r,D=J3($,31,s,u,E)?K3($,31,s,u,E,n(_s,{path:u,isDirectory:E,...s,onOpenFile:void 0})):$[34]'));
  const tree = (children) => ({ kind: 'dir', path: 'a', children });
  assert.equal(D.diffTreeAllRemoved(tree([{ kind: 'file', removed: true }, tree([{ kind: 'file', removed: true }])])), true);
  assert.equal(D.diffTreeAllRemoved(tree([{ kind: 'file', removed: true }, tree([{ kind: 'file', removed: false }])])), false);
  // c856385e2 hn `!!c && (s || ee(c))`: a folder that still holds files opens in an editor whatever its name; an
  // all-removed folder (or a file) is asked like a file (canOpenFileInEditor).
  const actions = { root: '/repo', onCopy() {}, onOpenInEditor() {}, editors: [{ name: 'Zed', type: 'zed' }], onRevealFile() {}, revealRoot: '/repo' };
  const labels = (entries) => entries.map((entry) => entry.kind === 'separator' ? '---' : entry.label);
  assert.deepEqual(labels(D.changedFileEntries(actions, 'assets.zip', { directory: true, isDirectory: true })), ['Copy', '---', 'Open in', 'Show in Finder']);
  assert.deepEqual(labels(D.changedFileEntries(actions, 'assets.zip', { directory: true, isDirectory: false })), ['Copy', '---', 'Show in Finder']);
  assert.deepEqual(labels(D.changedFileEntries({ ...actions, onRevealFile: undefined }, 'assets.zip', { directory: true, isDirectory: true })), ['Copy', '---', 'Open in']);
  assert.deepEqual(labels(D.changedFileEntries(actions, 'src', { directory: true, isDirectory: true })), ['Copy', '---', 'Open in', 'Show in Finder']);
  assert.match(source('src/source-diff.jsx'), /useTreeRowMenu\(ref, actions, node\.path, \{ directory: true, isDirectory: !diffTreeAllRemoved\(node\) \}\)/);
});

const PATCH = 'diff --git a/src/app.js b/src/app.js\nindex 1..2 100644\n--- a/src/app.js\n+++ b/src/app.js\n@@ -1,2 +1,2 @@\n keep\n-a\n+b\n';
test('Uc: the gutter "+" is the official button (cda9b4504 Pn, Hc, CdsIcon Add sm bold)', () => {
  const text = official(DIFF);
  assert.ok(text.includes('className:`-left-0.5 ${Pn}`'));
  assert.ok(text.includes('Hc={...Et,top:"calc((var(--diffs-line-height, 1lh) - 1rem) / 2)",bottom:"auto"}'));
  assert.ok(text.includes('n(B,{name:"Add",size:"sm",bold:!0})'));
  assert.ok(officialPrefix('cda9b4504-').includes('var e="flex size-4 items-center justify-center rounded bg-fill-accent text-on-accent hover:bg-fill-accent-hover"'));
  assert.ok(officialPrefix('c64baa838-').includes('un={position:"absolute",top:0,bottom:0,textAlign:"center",whiteSpace:"normal",touchAction:"none"}'));
  const html = renderToStaticMarkup(React.createElement(D.SourceDiff, { value: PATCH, placement: 'changes', commentScope: '["s","/repo"]', fileActions: { root: '/repo', onCopy() {} } }));
  const buttons = html.match(/<button type="button" style="[^"]*" class="sdiff-gutter-add [^"]*" aria-label="Add comment on this line">/g) ?? [];
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0], '<button type="button" style="position:absolute;top:calc((var(--diffs-line-height, 1lh) - 1rem) / 2);bottom:auto;text-align:center;white-space:normal;touch-action:none" class="sdiff-gutter-add -left-0.5 flex size-4 items-center justify-center rounded bg-fill-accent text-on-accent hover:bg-fill-accent-hover" aria-label="Add comment on this line">');
  assert.match(html, /aria-label="Add comment on this line"><span data-cds="Icon"[^>]*>/);
  // source-diff.css keeps only the hover reveal for it.
  assert.match(source('src/source-diff.css'), /\.sdiff-gutter-add \{ z-index: 1; opacity: 0; pointer-events: none; \}/);
  assert.doesNotMatch(source('src/source-diff.css'), /\.sdiff-gutter-add:hover|\.sdiff-gutter-add \{ position: absolute/);
});

test('nl: the image figure meta and "Image not available" are text-muted-as-secondary; loading is the CDS Skeleton', () => {
  const text = official(DIFF);
  assert.ok(text.includes('className:"flex min-w-0 gap-sm text-footnote tabular-nums text-muted-as-secondary"'));
  assert.ok(text.includes('"text-body text-muted-as-secondary",children:n(J,{defaultMessage:"Image not available"'));
  assert.ok(text.includes('n(U,{className:"size-full animate-placeholder-reveal"})'));
  const loading = renderToStaticMarkup(React.createElement(D.DiffImageFigure, { label: 'Before', alt: 'a.png before the change', src: undefined }));
  assert.match(loading, /^<figure class="sdiff-image-figure flex min-w-0 flex-col gap-sm"><figcaption class="flex items-baseline justify-between gap-md text-body"><span class="text-secondary">Before<\/span><\/figcaption><div class="flex h-80 items-center justify-center overflow-hidden rounded bg-surface-1 p-sm shadow-card-ring"><div data-cds="Skeleton"[^>]*class="[^"]*size-full animate-placeholder-reveal[^"]*"/);
  const missing = renderToStaticMarkup(React.createElement(D.DiffImageFigure, { label: 'After', alt: 'x', src: null }));
  assert.match(missing, /<span class="text-body text-muted-as-secondary">Image not available<\/span>/);
  assert.match(source('src/source-diff.jsx'), /<span className="flex min-w-0 gap-sm text-footnote tabular-nums text-muted-as-secondary">/);
});

test('scope trigger arrow and the Open file reveal follow 3.6556.2', () => {
  assert.ok(officialPrefix('cccc2cf0a-').includes('name:"ArrowRight",size:"xs",alt:ee,className:"text-muted-as-secondary"'));
  // W12: the arrow is the official CdsIcon (shared-frame od) with alt "to"; no local .sds-arrow rule.
  assert.match(source('src/source-diff-scope.jsx'), /<CdsIcon name="ArrowRight" size="xs" alt=\{DIFF_SCOPE_LABELS\.to\} className="text-muted-as-secondary" \/>/);
  assert.doesNotMatch(source('src/source-diff-scope.css'), /\.sds-arrow/);
  // _a's own utilities do the reveal; no unlayered opacity restatement is left.
  assert.doesNotMatch(source('src/source-diff.css'), /\.sdiff-open-file \{ opacity|\.sdiff-open-file \{ opacity: 1|:focus-within\) \.sdiff-open-file/);
});

test('ca6e98a55 / Qn: a ⌥F9 match is prevented even while an IME composes; only the step is held back', () => {
  assert.ok(officialPrefix('ca6e98a55-').includes('n=e=>!g.getState().hidden&&!e.defaultPrevented&&a(e,{isClaudeApp:h})===u,r=e=>{e.preventDefault(),e.repeat||v(e)}'));
  assert.ok(official(DIFF).includes('onMatch:t=>{!t.isComposing&&t.keyCode!==229&&Lt(e)}'));
  const key = (extra) => ({ key: 'F9', code: 'F9', altKey: true, shiftKey: false, metaKey: false, ctrlKey: false, defaultPrevented: false, isComposing: false, keyCode: 120, ...extra });
  assert.equal(prCommentMatch(key({ isComposing: true }), { mac: true, linux: false }), 1);
  assert.equal(prCommentComposing(key({ isComposing: true })), true);
  assert.equal(prCommentComposing(key({ keyCode: 229 })), true);
  assert.equal(prCommentStep(key({ isComposing: true }), { mac: true, linux: false }), 0);
  assert.equal(prCommentMatch(key({}), { mac: true, linux: false, hidden: true }), 0, 'not while the window is hidden');
  assert.equal(prCommentMatch(key({ defaultPrevented: true }), { mac: true, linux: false }), 0);
  const hook = source('src/source-diff-comments.jsx');
  assert.match(hook, /const delta = prCommentMatch\(event, \{ hidden: !!target\.ownerDocument\?\.hidden/);
  assert.match(hook, /event\.preventDefault\(\);\n\s+if \(event\.repeat \|\| prCommentComposing\(event\)\) return;/);
});
