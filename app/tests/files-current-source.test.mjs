// R3-files FT-03 / FT-05: the 2.42304.0 Files pane and Changes tree originals in src/generated/files-changes
// (scripts/extract-files-changes.mjs) — generator check and provenance, then each new export by pure calls, controlled
// events or a hook dispatcher (no DOM, no desktop): content results, editor path, selection store, tree pointer, drag,
// frontmatter, diff navigation / tree expansion / whitespace pause, tree row classes, the gone hook and the menu gate.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractFilesChanges } from '../scripts/extract-files-changes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
let server;
const load = (file) => server.ssrLoadModule(`/src/generated/files-changes/${file}`);
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

const NEW = {
  'vanilla-store.mjs': ['vendor-all-0-CTKbbUUg.js', { v: 'createStore' }],
  'windows-path.mjs': ['shared-26-CgdP_nTj.js', { Wb: 'windowsAbsolutePath' }],
  'path-absolute.mjs': ['shared-28-DcgD7xXH.js', { ak: 'isAbsolutePathFor' }],
  'image-path.mjs': ['shared-104-Cqo2-vQh.js', { bP: 'isImagePath', dP: 'rasterImageExtensions' }], // dP: R3-files FT-16 (shared-9 cg)
  'file-editor-path.mjs': ['shared-28-DcgD7xXH.js', { Fk: 'canOpenFileInEditor' }],
  'promise-timeout.mjs': ['shared-104-Cqo2-vQh.js', { Nl: 'withTimeout' }],
  'windows-platform.mjs': ['shared-78-D6VXYXaQ.js', { qa: 'isWindowsPlatform' }],
  'session-context.mjs': ['c9b8e0296-Bo59dZrJ.js', { r: 'CurrentSessionIdContext' }],
  'file-gone-check.mjs': ['c856385e2-DVsjb2QL.js', { V: 'useFileGone', qe: 'goneCheckablePath', Ke: 'cloudStoragePath', We: 'fileGoneKillSwitch', Ge: 'fileGoneDeadlineMs' }],
  'file-selection.mjs': ['c856385e2-DVsjb2QL.js', { $e: 'createFileSelectionStore', et: 'selectFileRange', tt: 'selectAllFiles', it: 'inMultiSelection' }],
  'file-content-results.mjs': ['cccc2cf0a-B0D--VZp.js', { oS: 'groupContentResults', uS: 'collapseContentWhitespace', pS: 'contentSnippetLayout' }],
  'file-tree-pointer.mjs': ['cccc2cf0a-B0D--VZp.js', { Ux: 'isBlankTreeTarget', Wx: 'isBlankTreePress' }],
  'coarse-pointer.mjs': ['shared-frame-BfjMqbuN.js', { Qt: 'isCoarsePointer' }],
  'file-context-drag.mjs': ['cd06fb298-BHzAz0jN.js', { c: 'fileContextDragType', d: 'fileContextDragEnabled', f: 'beginFileContextDrag', p: 'isFileContextDrag', m: 'draggedFilePaths', h: 'commitFileContextDrag', u: 'clearFileContextDrag' }],
  'error-text.mjs': ['preload-helper-D0dM6GpB.js', { e: 'withErrorText' }],
  'array-min.mjs': ['cf80fba0c-CT5qqVq9.js', { e: 'iterableMin' }],
  'file-frontmatter.mjs': ['c3fde7009-BbbO5TX9.js', { ki: 'splitFrontmatter', Li: 'frontmatterFields', Oi: 'emptyFrontmatterBlock', Di: 'frontmatterBlock' }],
  // R3-files FT-07 adds pi (the anchors of one file; changes-tree-current.test.mjs).
  'diff-change-nav.mjs': ['c44d00c7f-zUAG9XyS.js', { hi: 'adjacentChange', mi: 'sameChangeAnchor', pi: 'changeAnchors' }],
  'diff-tree-expand.mjs': ['c44d00c7f-zUAG9XyS.js', { kc: 'revealExpandedSubtree', Oc: 'diffTreeRowLevel', Dc: 'diffTreeRowSelector' }],
  'diff-whitespace-pause.mjs': ['c44d00c7f-zUAG9XyS.js', { Ca: 'whitespaceHidingPaused' }],
  'file-tree-row-classes.mjs': ['ca7840910-DSVFtTw1.js', { N: 'fileTreePadding', M: 'fileTreeRowGap', A: 'fileTreeGroup', j: 'fileTreeKeptGuides', P: 'fileTreeCompactRow', I: 'fileTreeRowCurrent', F: 'fileTreeRowIdle' }],
  'menu-pending.mjs': ['shared-156-Bikz018e.js', { dV: 'holdMenuPending', fV: 'menuPending' }],
  'escape-repeat.mjs': ['shared-19-CkPOiIKm.js', { pZ: 'suppressEscapeRepeat' }],
  'event-element.mjs': ['shared-frame-BfjMqbuN.js', { lc: 'elementTarget' }],
  'menu-open-gate.mjs': ['c0cdf4a08-h228IL-P.js', { h: 'openAfterCheck', g: 'useMenuOpenGate' }],
};

test('generator: check mode passes; every new module names its 2.42304.0 chunk, roots and resolved imports', async () => {
  await extractFilesChanges({ check: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/files-changes/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  const byTarget = Object.fromEntries(manifest.modules.map((entry) => [entry.target, entry]));
  for (const [target, [source, exports]] of Object.entries(NEW)) {
    assert.equal(byTarget[target]?.source, source, target);
    assert.deepEqual(byTarget[target].exports, exports, target);
    assert.equal(byTarget[target].sourceSha256, (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(path.join(OFFICIAL, source))).digest('hex'), `${target} source bytes`);
    for (const root of Object.keys(exports)) assert.ok(byTarget[target].bindings.some((binding) => binding.name === root), `${target}: ${root} emitted`);
  }
  assert.deepEqual(byTarget['owner-window.mjs'].exports, { up: 'ownerWindow', dp: 'ownerWindowOrGlobal' });
  const imports = (target) => Object.fromEntries(byTarget[target].imports.map((entry) => [entry.local, `${entry.kind}:${entry.from}:${entry.name}`]));
  assert.deepEqual(imports('file-gone-check.mjs'), {
    t: 'react:react:useState', i: 'react:react:useRef', l: 'react:react:use', d: 'react:react:useCallback',
    m: 'adapter:../../source-files-changes-adapters.jsx:LocalSessions', B: 'adapter:../../source-files-changes-adapters.jsx:localSessionTarget',
    _: 'adapter:../../source-files-changes-adapters.jsx:growthBookOn', b: 'generated:./windows-platform.mjs:isWindowsPlatform',
    te: 'generated:./promise-timeout.mjs:withTimeout', F: 'generated:./session-context.mjs:CurrentSessionIdContext',
    ve: 'generated:./path-absolute.mjs:isAbsolutePathFor',
  });
  assert.deepEqual(imports('file-selection.mjs'), { Ce: 'generated:./vanilla-store.mjs:createStore' });
  assert.deepEqual(imports('file-context-drag.mjs'), { n: 'adapter:../../source-files-changes-adapters.jsx:growthBookValue', i: 'generated:./coarse-pointer.mjs:isCoarsePointer' });
  assert.deepEqual(imports('file-tree-pointer.mjs'), { R: 'generated:./owner-window.mjs:ownerWindowOrGlobal' });
  assert.deepEqual(imports('diff-tree-expand.mjs'), { r: 'react:react-dom:flushSync' });
  assert.deepEqual(imports('file-frontmatter.mjs'), { e: 'generated:./error-text.mjs:withErrorText', rt: 'generated:./array-min.mjs:iterableMin' });
  assert.deepEqual(imports('menu-open-gate.mjs'), { s: 'generated:./owner-window.mjs:ownerWindow', c: 'generated:./menu-pending.mjs:holdMenuPending',
    l: 'generated:./escape-repeat.mjs:suppressEscapeRepeat', n: 'react:react:useState', o: 'react:react:useCallback', d: 'generated:./event-element.mjs:elementTarget' });
  // Feature strings in the shipped (minified) chunks.
  const gone = official('c856385e2-DVsjb2QL.js');
  assert.match(gone, /var We=`__gb__3212098161`,Ge=150|We=`__gb__3212098161`|We="__gb__3212098161"/);
  assert.match(gone, /isSessionPathGone/);
  assert.match(gone, /The desktop did not answer in time/);
  assert.match(official('cccc2cf0a-B0D--VZp.js'), /\{gone:\w+,beforeOpen:\w+\}=Kf\(/);
  assert.match(official('c0cdf4a08-h228IL-P.js'), /addEventListener\(`pointerdown`,o,\{capture:!0,signal:a\}\)|addEventListener\("pointerdown",o,\{capture:!0,signal:a\}\)/);
  assert.match(official('ca7840910-DSVFtTw1.js'), /bg-\(image:--file-tree-kept-guides\) group-hover\/file-tree:bg-\(image:--file-tree-guides\)/);
});

test('content results, editor path and tree pointer: the 2.42304.0 bindings answer as the 2.31226.0 adapters did', async () => {
  const current = await load('file-content-results.mjs');
  const previous = await server.ssrLoadModule('/src/generated/code-editor/file-content-results.mjs');
  const matches = [
    { relativePath: 'src/a.ts', absPath: '/r/src/a.ts', line: 1, preview: 'x', matches: [] },
    { relativePath: 'src/a.ts', absPath: '/r/src/a.ts', line: 2, preview: 'y', matches: [] },
    { relativePath: 'src/a.ts', absPath: '/r/src/a.ts', line: 3, preview: 'z', matches: [] },
    { relativePath: 'b.md', absPath: '/r/b.md', line: 9, preview: 'w', matches: [] },
  ];
  for (const args of [[matches, 10, 10, 2], [matches, 4, 2, 5], [matches, 3, 1, 1]])
    assert.deepEqual(current.groupContentResults(...args), previous.groupContentResults(...args));
  for (const [text, ranges] of [['a  b\t\tc', [{ start: 3, end: 6 }]], ['   ', undefined], ['abc', [{ start: 0, end: 1 }]]])
    assert.deepEqual(current.collapseContentWhitespace(text, ranges), previous.collapseContentWhitespace(text, ranges));
  const long = 'const someVeryLongIdentifierName = anotherFunction(argumentOne, argumentTwo) + targetMatch;';
  const at = long.indexOf('targetMatch');
  for (const ranges of [undefined, [{ start: 2, end: 5 }], [{ start: at, end: at + 11 }, { start: at + 2, end: at + 4 }]])
    assert.deepEqual(current.contentSnippetLayout(long, ranges), previous.contentSnippetLayout(long, ranges));
  assert.equal(current.contentSnippetLayout(long, [{ start: at, end: at + 11 }]).lead.startsWith('\u2026'), true);

  const { isBlankTreeTarget, isBlankTreePress } = await load('file-tree-pointer.mjs');
  const tree = (direction, clientLeft) => ({ nodeType: 1, contains: () => true, getBoundingClientRect: () => ({ left: 0, top: 0 }),
    offsetWidth: 110, clientWidth: 100, clientLeft, offsetHeight: 50, clientHeight: 50, clientTop: 0,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ direction }) } } });
  const blank = { closest: () => null }, row = { closest: (selector) => (selector === '[data-tree-row]' ? {} : null) };
  const press = (currentTarget, clientX, target = blank, button = 0) => isBlankTreePress({ button, target, currentTarget, clientX, clientY: 5 });
  assert.equal(isBlankTreeTarget({ target: row, currentTarget: tree('ltr', 0) }), false, 'a row is not blank');
  assert.equal(press(tree('ltr', 0), 50), true);
  assert.equal(press(tree('ltr', 0), 105), false, 'LTR: the scrollbar on the right');
  assert.equal(press(tree('ltr', 0), 50, blank, 2), false, 'not the primary button');
  assert.equal(press(tree('rtl', 10), 5), false, 'RTL (Gx): the scrollbar on the left');
  assert.equal(press(tree('rtl', 10), 50), true);
});

test('selection store (c856385e2 $e over zustand createStore): select, toggle, range, retain, reorder, clear; inMultiSelection', async () => {
  const { createFileSelectionStore, selectFileRange, selectAllFiles, inMultiSelection } = await load('file-selection.mjs');
  const store = createFileSelectionStore();
  const entry = (absPath) => ({ absPath, relativePath: absPath });
  const rows = ['a', 'b', 'c', 'd'].map(entry);
  const nav = { count: rows.length, entryAt: (index) => rows[index], indexOfKey: (key) => rows.findIndex((row) => row.absPath === key) };
  const empty = store.getState().selected;
  assert.equal(empty.size, 0);
  let notified = 0;
  const stop = store.subscribe(() => { notified += 1; });
  store.getState().selectOnly(rows[1]);
  assert.deepEqual([...store.getState().selected.keys()], ['b']);
  store.getState().selectOnly(rows[1]);
  assert.equal(notified, 1, 'selecting the only row again changes nothing');
  selectFileRange(store, nav, 3, 3);
  assert.deepEqual([...store.getState().selected.keys()], ['b', 'c', 'd']);
  assert.equal(store.getState().anchor, 'b');
  assert.equal(inMultiSelection(store, 'c', true), true);
  assert.equal(inMultiSelection(store, 'c', false), false, 'not a selectable list');
  assert.equal(inMultiSelection(store, 'a', true), false, 'outside the selection');
  store.getState().toggle(rows[2]);
  assert.deepEqual([...store.getState().selected.keys()], ['b', 'd']);
  store.getState().reorder((key) => -nav.indexOfKey(key));
  assert.deepEqual([...store.getState().selected.keys()], ['d', 'b']);
  store.getState().retain((key) => key !== 'b');
  assert.deepEqual([...store.getState().selected.keys()], ['d']);
  assert.equal(store.getState().anchor, 'c', 'toggle moves the anchor to the toggled row; retain keeps it while it is kept');
  selectAllFiles(store, nav);
  assert.deepEqual([...store.getState().selected.keys()].sort(), ['a', 'b', 'c', 'd']);
  store.getState().clear();
  assert.equal(store.getState().selected, empty, 'clear restores the shared empty map');
  stop();
});

test('file-context drag (cd06fb298): the "__gb__3508862586" rollout stays on without GrowthBook; a coarse pointer turns it off', async () => {
  const drag = await load('file-context-drag.mjs');
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(drag.fileContextDragEnabled(), true);
    const data = new Map(), listeners = [];
    const event = { dataTransfer: { setData: (type, value) => data.set(type, value), types: [] }, preventDefault() { this.prevented = true; },
      currentTarget: { addEventListener: (type, fn, options) => listeners.push([type, fn, options]) } };
    let attached = 0;
    drag.beginFileContextDrag(event, 'owner-1', () => { attached += 1; }, ['/r/a.ts']);
    assert.equal(data.get('application/x-claude-file-context'), '1');
    assert.equal(event.dataTransfer.effectAllowed, 'copy');
    assert.deepEqual(listeners.map(([type, , options]) => [type, options]), [['dragend', { once: true }]]);
    assert.deepEqual(drag.draggedFilePaths('owner-1'), ['/r/a.ts']);
    assert.equal(drag.draggedFilePaths('owner-2'), undefined);
    assert.equal(drag.isFileContextDrag({ dataTransfer: { types: ['application/x-claude-file-context'] } }), true);
    drag.commitFileContextDrag();
    assert.equal(attached, 1);
    assert.equal(drag.draggedFilePaths('owner-1'), undefined);
    globalThis.window = { matchMedia: (query) => ({ matches: query === '(pointer: coarse), (hover: none)' }) };
    assert.equal(drag.fileContextDragEnabled(), false);
    const refused = { dataTransfer: { setData: () => assert.fail('no data on a coarse pointer') }, preventDefault() { this.prevented = true; } };
    drag.beginFileContextDrag(refused, 'owner-1', () => {}, []);
    assert.equal(refused.prevented, true);
  } finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});

test('frontmatter (c3fde7009 ki/Li, cov9-01): an empty block keeps the Markdown; the Markdown model reads the generated original', async () => {
  const { splitFrontmatter, frontmatterFields, emptyFrontmatterBlock } = await load('file-frontmatter.mjs');
  // R3-files FT-18: the hand copy is gone; file-markdown-model.mjs re-exports ki and Ti (one module graph under Vite).
  const local = await server.ssrLoadModule('/src/file-markdown-model.mjs');
  assert.equal(local.splitFrontmatter, splitFrontmatter);
  assert.equal(local.frontmatterLabel, (await load('file-frontmatter-view.mjs')).frontmatterLabel);
  assert.deepEqual(splitFrontmatter('---\n---\n# Title\n'), { fields: [], body: '# Title\n' });
  assert.deepEqual(splitFrontmatter('---\n---'), { fields: [], body: '' });
  assert.equal(splitFrontmatter('---\n---\n---\nx: 1\n---\n'), null, 'an empty block followed by another fence is not frontmatter');
  assert.equal(emptyFrontmatterBlock.test('---\r\n---  \r\nbody'), true);
  assert.deepEqual(splitFrontmatter('---\ntitle: Hello\ntags: [a, b]\n---\nBody'), { fields: [{ key: 'title', value: 'Hello' }, { key: 'tags', value: 'a, b', items: ['a', 'b'] }], body: 'Body' });
  assert.deepEqual(splitFrontmatter('---\n: bad\n---\nBody'), { fields: [], body: 'Body' }, 'unsupported frontmatter: no fields, body kept');
  assert.throws(() => frontmatterFields(': bad'), /Unsupported frontmatter/);
  const corpus = ['# No frontmatter', '---\n---\nA', '---\n---', '---\n---\n---\n', '\uFEFF---\na: 1\n---\nB', '---\na: 1\nb: two words\n---\nC',
    '---\nlist:\n  - one\n  - two\n---\nD', '---\nmulti: |\n  line one\n  line two\n---\nE', '---\nq: "quoted: value"\n---\nF', '---\na: 1\na: 2\n---\nG',
    '---\nobj: {x: 1}\n---\nH', '---\r\nwin: yes\r\n---\r\nI', '---\n# comment\nk: v # trailing\n---\nJ', '---\nnested:\n  key: v\n---\nK'];
  // Every corpus entry splits (or not) through the model's plan exactly as through ki; a list keeps its `items` (read by
  // the gated document variant, cov9-02; the pane <dl>, c3fde7009 Ei variant "pane", shows key and value).
  for (const text of corpus) assert.deepEqual(local.markdownFilePlan(text).frontmatter, splitFrontmatter(text), JSON.stringify(text));
  assert.deepEqual(splitFrontmatter('---\nlist:\n  - one\n  - two\n---\nD').fields[0].items, ['one', 'two']);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/file-markdown-model.mjs'), 'utf8'), /Unsupported frontmatter|function frontmatterFields|FRONTMATTER =/);
});

test('Changes: F7 below-pane anchor (hi), subtree reveal on expand (kc), whitespace pause (Ca)', async () => {
  const { adjacentChange, sameChangeAnchor } = await load('diff-change-nav.mjs');
  const changes = [
    { id: 'f1', side: 'additions', lineNumber: 3, newLine: 3, removes: false },
    { id: 'f1', side: 'additions', lineNumber: 10, newLine: 10, removes: false },
    { id: 'f2', side: 'deletions', lineNumber: 4, oldLine: 4, removes: true },
  ];
  const order = ['f1', 'f2'];
  assert.equal(adjacentChange([], order, {}, 1), null);
  assert.equal(adjacentChange(changes, order, {}, 1), changes[0], 'no anchor: first');
  assert.equal(adjacentChange(changes, order, { last: changes[0] }, 1), changes[1]);
  assert.equal(adjacentChange(changes, order, { last: changes[1] }, -1), changes[0]);
  const viewport = { id: 'f1', side: 'additions', lineNumber: 10 };
  assert.equal(adjacentChange(changes, order, { viewport }, 1), changes[2], 'the change at the anchor line is behind the anchor');
  assert.equal(adjacentChange(changes, order, { viewport: { ...viewport, belowPane: true } }, 1), changes[1], 'diffgit-09: below the pane it is next');
  assert.equal(sameChangeAnchor(changes[0], { id: 'f1', side: 'additions', lineNumber: 3 }), true);

  const { revealExpandedSubtree, diffTreeRowLevel, diffTreeRowSelector } = await load('diff-tree-expand.mjs');
  assert.equal(diffTreeRowSelector, '[data-diff-tree-row]');
  const rowAt = (level, top, height = 20) => ({ getAttribute: (name) => (name === 'aria-level' ? String(level) : null), getBoundingClientRect: () => ({ top, bottom: top + height }) });
  const folder = rowAt(1, 40), child1 = rowAt(2, 60), child2 = rowAt(2, 80), after1 = rowAt(1, 100);
  const container = { scrollTop: 0, clientHeight: 70, getBoundingClientRect: () => ({ top: 0 }), querySelectorAll: (selector) => { assert.equal(selector, '[data-diff-tree-row]'); return [folder, child1, child2, after1]; } };
  folder.closest = (selector) => { assert.equal(selector, '[role="tree"]'); return container; };
  let expanded = 0;
  revealExpandedSubtree(folder, true, () => { expanded += 1; });
  assert.equal(expanded, 1, 'the expansion is flushed first');
  // Last subtree row bottom 100 + 5 - (0 + 70) = 35; folder top 40 - 5 - 0 = 35 → scroll 35.
  assert.equal(container.scrollTop, 35);
  revealExpandedSubtree(folder, false, () => { expanded += 1; });
  assert.equal(expanded, 2);
  assert.equal(container.scrollTop, 35, 'collapsing does not scroll');
  assert.equal(diffTreeRowLevel(rowAt(3, 0)), 3);

  const { whitespaceHidingPaused } = await load('diff-whitespace-pause.mjs');
  const none = { annotations: [], prComments: [], findings: [], drafts: {} };
  assert.equal(whitespaceHidingPaused(none), false);
  assert.equal(whitespaceHidingPaused({ ...none, annotations: [{ source: 'file' }] }), false, 'diffgit-11: a Files annotation does not pause');
  assert.equal(whitespaceHidingPaused({ ...none, drafts: { a: { source: 'file' } } }), false);
  assert.equal(whitespaceHidingPaused({ ...none, annotations: [{ source: 'diff' }] }), true);
  assert.equal(whitespaceHidingPaused({ ...none, findings: [{}] }), true);
  assert.equal(whitespaceHidingPaused({ ...none, prComments: [{}], annotations: [{ source: 'file' }] }), true);
});

test('tree row classes (ca7840910): the official strings, and their utilities are in the 2.42304.0 CSS', async () => {
  const classes = await load('file-tree-row-classes.mjs');
  assert.equal(classes.fileTreeGroup, 'group/file-tree [&:where(:root[dir=rtl]_:dir(rtl))]:[--file-tree-guides-to:to_left]');
  assert.match(classes.fileTreeKeptGuides, /^bg-\(image:--file-tree-kept-guides\) group-hover\/file-tree:bg-\(image:--file-tree-guides\) group-focus-within\/file-tree:bg-\(image:--file-tree-guides\)/);
  assert.equal(classes.fileTreeCompactRow, 'flex items-center gap-1 h-control app-list-row pe-md rounded text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus');
  assert.equal(classes.fileTreeRowCurrent, 'bg-fill-control hover:bg-fill-control text-primary');
  assert.equal(classes.fileTreeRowIdle, 'bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-[pressed]:bg-fill-ghost-hover');
  assert.equal(classes.fileTreePadding, 'px-xs py-1.25');
  const css = fs.readdirSync(OFFICIAL).filter((name) => name.endsWith('.css')).map((name) => fs.readFileSync(path.join(OFFICIAL, name), 'utf8')).join('\n');
  // app-list-row is a marker class with no rule of its own (shared-6 / ca7840910 / cccc2cf0a use it as a hook).
  assert.equal(css.includes('.app-list-row'), false);
  for (const selector of ['.h-control', '.bg-fill-control', '.hover\\:bg-fill-ghost-hover', '.data-\\[pressed\\]\\:bg-fill-ghost-hover', '.hide-focus-ring', '.group\\/file-tree',
    '.bg-\\(image\\:--file-tree-kept-guides\\)', '.group-hover\\/file-tree\\:bg-\\(image\\:--file-tree-guides\\)'])
    assert.ok(css.includes(selector), selector);
});

// A hook dispatcher with state that persists across calls of one component (no React DOM).
function harness(component, { session = null } = {}) {
  const slots = [];
  let index = 0;
  const hooks = {
    use: (usable) => (usable === harness.context ? session : usable._currentValue),
    useState: (initial) => { const at = index++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], (value) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef: (initial) => { const at = index++; if (!(at in slots)) slots[at] = { current: initial }; return slots[at]; },
    useCallback: (fn) => { index++; return fn; },
  };
  return (...args) => {
    index = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return component(...args); } finally { internal.H = old; }
  };
}

test('gone hook (c856385e2 V): asks the desktop once per path, only for a local session and a checkable absolute path', async () => {
  const { useFileGone, goneCheckablePath, fileGoneDeadlineMs, fileGoneKillSwitch } = await load('file-gone-check.mjs');
  harness.context = (await load('session-context.mjs')).CurrentSessionIdContext;
  assert.equal(fileGoneDeadlineMs, 150);
  assert.equal(fileGoneKillSwitch, '__gb__3212098161');
  const previousWindow = globalThis.window;
  const calls = [];
  let answer = () => true;
  const install = (userAgent = 'Mozilla/5.0 (Macintosh) Electron') => {
    globalThis.window = { navigator: { userAgent }, desktop: { call: (action, params) => { calls.push([action, params]); return answer(params); } } };
  };
  try {
    install();
    const row = harness(useFileGone, { session: 's1' });
    let { gone, beforeOpen } = row('/repo/src/a.ts', '/repo/src/a.ts');
    assert.equal(gone, false);
    const pending = beforeOpen();
    assert.ok(pending instanceof Promise, 'a promise the menu waits for');
    await pending;
    assert.deepEqual(calls, [['file:gone', { sessionId: 's1', path: '/repo/src/a.ts' }]], 'one ask for the same path twice (Set)');
    ({ gone } = row('/repo/src/a.ts', '/repo/src/a.ts'));
    assert.equal(gone, true);
    ({ gone } = row('/repo/src/b.ts', '/repo/src/b.ts'));
    assert.equal(gone, false, 'another path is not the one judged gone');

    answer = () => false;
    calls.length = 0;
    ({ beforeOpen } = row('/repo/src/a.ts', '/repo/src/a.ts'));
    await beforeOpen();
    assert.equal(row('/repo/src/a.ts', '/repo/src/a.ts').gone, false, 'present now');

    for (const [label, session, absolute, ua] of [
      ['no session', null, '/repo/a', undefined], ['relative path', 's1', 'src/a.ts', undefined], ['iCloud Drive', 's1', '/Users/me/Library/Mobile Documents/com~apple~CloudDocs/a.md', undefined],
      ['CloudStorage', 's1', '/Users/me/Library/CloudStorage/Dropbox/a.md', undefined], ['Windows', 's1', '/repo/a', 'Mozilla/5.0 (Windows NT 10.0; Win64)'], ['no path', 's1', undefined, undefined]]) {
      install(ua);
      calls.length = 0;
      const check = harness(useFileGone, { session })(absolute, absolute).beforeOpen();
      assert.equal(check, undefined, `${label}: nothing to wait for`);
      assert.equal(calls.length, 0, `${label}: no ask`);
    }
    assert.equal(goneCheckablePath('~/notes.md'), true);
    assert.equal(goneCheckablePath('C:\\x'), false, 'a posix check only');

    delete globalThis.window;
    assert.equal(harness(useFileGone, { session: 's1' })('/repo/a', '/repo/a').beforeOpen(), undefined, 'no desktop bridge');

    install();
    answer = () => new Promise(() => {});
    const slow = harness(useFileGone, { session: 's1' });
    const started = Date.now();
    await slow('/repo/a', '/repo/a').beforeOpen();
    assert.ok(Date.now() - started >= 140, 'the 150 ms deadline');
    assert.equal(slow('/repo/a', '/repo/a').gone, false, 'no answer in time is not gone');

    let resolveFirst;
    answer = (params) => (params.path === '/repo/first' ? new Promise((resolve) => { resolveFirst = resolve; }) : true);
    const latest = harness(useFileGone, { session: 's1' });
    const first = latest('/repo/first', '/repo/first').beforeOpen();
    await latest('/repo/second', '/repo/second').beforeOpen();
    resolveFirst(true);
    await first;
    assert.equal(latest('/repo/first', '/repo/first').gone, false, 'only the latest ask may answer');
    assert.equal(latest('/repo/second', '/repo/second').gone, true);
  } finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});

test('menu open gate (c0cdf4a08 h): opens when the check settles; a press, a key or a newer request cancels; Escape is swallowed', async () => {
  const { openAfterCheck } = await load('menu-open-gate.mjs');
  const { menuPending } = await load('menu-pending.mjs');
  const view = new EventTarget();
  view.document = {};
  const element = { nodeType: 1, ownerDocument: { defaultView: view } };
  const settle = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  let opened = [];

  const a = settle();
  openAfterCheck(element, a.promise, () => opened.push('a'));
  assert.equal(menuPending(view.document), true, 'the document knows a menu is waiting');
  a.resolve();
  await tick();
  assert.deepEqual(opened, ['a']);
  assert.equal(menuPending(view.document), false);

  const b = settle();
  openAfterCheck(element, b.promise, () => opened.push('b'));
  view.dispatchEvent(new Event('pointerdown'));
  b.resolve();
  await tick();
  assert.deepEqual(opened, ['a'], 'a press first: no menu');

  const c = settle();
  openAfterCheck(element, c.promise, () => opened.push('c'));
  const escape = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape', repeat: false });
  view.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true, 'Escape cancels and is swallowed');
  const repeat = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape', repeat: true });
  view.dispatchEvent(repeat);
  assert.equal(repeat.defaultPrevented, true, 'its held repeats too');
  c.resolve();
  await tick();
  assert.deepEqual(opened, ['a']);

  const d = settle(), e = settle();
  openAfterCheck(element, d.promise, () => opened.push('d'));
  openAfterCheck(element, e.promise, () => opened.push('e'));
  d.resolve(); e.resolve();
  await tick();
  assert.deepEqual(opened, ['a', 'e'], 'only the latest request opens');

  opened = [];
  openAfterCheck({ nodeType: 1, ownerDocument: { defaultView: null } }, Promise.reject(new Error('x')), () => opened.push('f'));
  await tick();
  assert.deepEqual(opened, ['f'], 'no window: it opens once the check settles, even when it fails');
});

function sameDeps(prev, next) {
  if (!prev || !next || prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) if (!Object.is(prev[i], next[i])) return false;
  return true;
}

function createHostHarness(component, { contexts = new Map() } = {}) {
  const slots = [];
  let index = 0;
  let lastProps;
  let lastTree;
  const pendingLayout = [];
  const pendingPassive = [];
  const hooks = {
    use: (usable) => (contexts.has(usable) ? contexts.get(usable) : usable._currentValue),
    useContext: (ctx) => (contexts.has(ctx) ? contexts.get(ctx) : ctx._currentValue),
    useState: (initial) => {
      const at = index++;
      if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial;
      const set = (value) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; };
      return [slots[at], set];
    },
    useRef: (initial) => {
      const at = index++;
      if (!(at in slots)) slots[at] = { current: initial };
      return slots[at];
    },
    useMemo: (fn, deps) => {
      const at = index++;
      if (!(at in slots) || !sameDeps(slots[at].deps, deps)) slots[at] = { value: fn(), deps };
      return slots[at].value;
    },
    useCallback: (fn, deps) => {
      const at = index++;
      if (!(at in slots) || !sameDeps(slots[at].deps, deps)) slots[at] = { value: fn, deps };
      return slots[at].value;
    },
    useSyncExternalStore: (subscribe, getSnapshot) => { index++; return getSnapshot(); },
    useId: () => { const at = index++; return slots[at] ??= `:r${at}:`; },
    useImperativeHandle: () => { index++; },
    useLayoutEffect: (fn, deps) => {
      const at = index++;
      if (!(at in slots) || !sameDeps(slots[at].deps, deps)) pendingLayout.push({ at, fn, deps });
    },
    useEffect: (fn, deps) => {
      const at = index++;
      if (!(at in slots) || !sameDeps(slots[at].deps, deps)) pendingPassive.push({ at, fn, deps });
    },
  };
  function flushEffects(queue) {
    while (queue.length) {
      const { at, fn, deps } = queue.shift();
      slots[at]?.cleanup?.();
      const cleanup = fn();
      slots[at] = { deps, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
    }
  }
  function render(props = lastProps) {
    lastProps = props;
    for (let pass = 0; pass < 6; pass++) {
      index = 0;
      pendingLayout.length = 0;
      pendingPassive.length = 0;
      const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      const old = internal.H;
      internal.H = hooks;
      try { lastTree = component(props); } finally { internal.H = old; }
      if (!pendingLayout.length && !pendingPassive.length) break;
      flushEffects(pendingLayout);
      flushEffects(pendingPassive);
    }
    return lastTree;
  }
  return { render, get tree() { return lastTree; } };
}

function findElements(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const item of node) findElements(item, predicate, out); return out; }
  if (predicate(node)) out.push(node);
  if (node.props?.children) findElements(node.props.children, predicate, out);
  return out;
}

test('host wiring (Y1-R3-files-2): tree rows and search results ask isSessionPathGone before opening single-row menus, skip multi-selection, and pass gone to menu entries', async () => {
  const ssr = (mod) => server.ssrLoadModule(mod);
  const { CurrentSessionIdContext } = await ssr('/src/file-gone-menu.mjs');
  const { SourceFilePanel, SourceFileTree, SourceFileTreeNode } = await ssr('/src/source-session.jsx');
  const { SourceFilesSearch } = await ssr('/src/source-files-search.jsx');
  const { SourceMenu } = await ssr('/src/source-menu.jsx');
  const { createFileTreeSelection } = await ssr('/src/file-tree-selection.mjs');
  const { FILE_MENU_LABELS } = await ssr('/src/file-context-menu-model.mjs');

  const previousWindow = globalThis.window;
  const previousObserver = globalThis.MutationObserver;
  const view = new EventTarget();
  view.document = {};
  const goneCalls = [];
  let goneAnswer = () => false;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.window = {
    navigator: { userAgent: 'Mozilla/5.0 (Macintosh) Electron' },
    desktop: {
      call: (action, params) => {
        if (action === 'file:gone') { goneCalls.push(params); return goneAnswer(params); }
        return Promise.resolve(null);
      },
    },
    addEventListener() {},
    removeEventListener() {},
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const editors = [{ type: 'vscode', name: 'VS Code' }];

  try {
    // 1. SourceFilePanel provides CurrentSessionIdContext and FilePane builds fileMenu that forwards gone to fileContextMenu.
    const panelTree = SourceFilePanel({
      sessionId: 'session-panel',
      tab: 'files',
      cwd: '/repo',
      fileActions: { onAttachFile() {}, onAttachFiles() {}, onRevealFile() {}, onOpenInEditor() {}, onOpenInTerminal() {}, editors },
      call: async () => [],
    });
    const queryScopeTree = panelTree.type(panelTree.props);
    const queryProvider = createHostHarness(queryScopeTree.type).render(queryScopeTree.props);
    const QueryContext = queryProvider.type._context ?? queryProvider.type;
    const sessionProvider = findElements(queryProvider, (el) => el.type === CurrentSessionIdContext.Provider)[0];
    assert.ok(sessionProvider, 'SourceFilePanel wraps FilePane in FilesQueryScope and CurrentSessionIdContext.Provider');
    assert.equal(sessionProvider.props.value, 'session-panel');
    const filePaneEl = sessionProvider.props.children;
    const paneHarness = createHostHarness(filePaneEl.type, {
      contexts: new Map([[QueryContext, queryProvider.props.value], [CurrentSessionIdContext, 'session-panel']]),
    });
    const paneRendered = paneHarness.render(filePaneEl.props);
    const searchInPane = findElements(paneRendered, (el) => el.type === SourceFilesSearch)[0];
    assert.ok(searchInPane?.props?.fileMenu, 'FilePane passes fileMenu to SourceFilesSearch');
    const realFileMenu = searchInPane.props.fileMenu;

    const liveItems = realFileMenu.entries('src/a.ts', { gone: false });
    assert.equal(liveItems.some((item) => item.label === FILE_MENU_LABELS.openIn), true, 'gone=false keeps Open in submenu');
    assert.equal(liveItems.some((item) => item.action === 'show-in-finder'), true, 'gone=false keeps Show in Finder');
    const goneItems = realFileMenu.entries('src/a.ts', { gone: true });
    assert.equal(goneItems.some((item) => item.label === FILE_MENU_LABELS.openIn), false, 'gone=true omits Open in submenu');
    assert.equal(goneItems.some((item) => item.action === 'show-in-finder'), false, 'gone=true omits Show in Finder');
    assert.equal(goneItems.some((item) => item.action === 'attach'), true, 'gone=true keeps Attach as context');
    assert.equal(goneItems.some((item) => item.label === FILE_MENU_LABELS.copy), true, 'gone=true keeps Copy submenu');

    const menuRecord = { lastSingle: null, lastMulti: null };
    const trackedFileMenu = {
      ...realFileMenu,
      entries: (filePath, opts = {}) => {
        const items = realFileMenu.entries(filePath, opts);
        menuRecord.lastSingle = { path: filePath, opts, items };
        return items;
      },
      multiEntries: (paths, opts = {}) => {
        const items = realFileMenu.multiEntries(paths, opts);
        menuRecord.lastMulti = { paths, opts, items };
        return items;
      },
    };

    // 2. SourceFileTree + SourceFileTreeNode right-click behavior.
    const treeStore = createFileTreeSelection();
    const treeHarness = createHostHarness(SourceFileTree);
    const treeRoot = treeHarness.render({ selectionStore: treeStore, children: null });
    const SelectionContext = treeRoot.type._context ?? treeRoot.type;
    const selection = treeRoot.props.value;
    const rowPaths = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    const domRows = rowPaths.map((p) => {
      const rowEl = {
        nodeType: 1,
        getAttribute: (name) => (name === 'role' ? 'treeitem' : name === 'aria-level' ? '1' : null),
        hasAttribute: () => false,
        setAttribute: () => {},
        removeAttribute: () => {},
        closest: (sel) => (sel === '[role="treeitem"]' ? rowEl : null),
        querySelector: (sel) => (sel === '[data-tree-primary]' ? { dataset: { filePath: p } } : null),
        getBoundingClientRect: () => ({ left: 12, bottom: 28 }),
        ownerDocument: { activeElement: null, body: {}, defaultView: view },
      };
      return rowEl;
    });
    treeRoot.props.children.props.ref({
      querySelectorAll: (sel) => (sel === '[data-tree-row]' || sel.includes('[role="treeitem"]') ? domRows : []),
    });
    for (const p of rowPaths) selection.entries.set(p, { name: path.basename(p), path: p, absPath: p, relativePath: p, directory: false });

    const makeNodeHarness = (entry, domRow) => {
      const contexts = new Map([[CurrentSessionIdContext, 's1'], [SelectionContext, selection]]);
      const hNode = createHostHarness(SourceFileTreeNode, { contexts });
      const props = { entry, cwd: '/repo', activePath: null, onOpen() {}, level: 0, call: async () => [], expandedPaths: new Set(), onExpandedChange() {}, fileMenu: trackedFileMenu };
      const renderNode = () => {
        const tree = hNode.render(props);
        const body = findElements(tree, (el) => el.props?.['data-tree-row-body'] !== undefined)[0];
        if (body?.props?.ref) body.props.ref.current = domRow;
        return tree;
      };
      renderNode();
      return { renderNode, rightClick: (extra = {}) => hNode.tree.props.onContextMenu({ preventDefault() {}, stopPropagation() {}, target: domRow, currentTarget: domRow, type: 'contextmenu', clientX: 24, clientY: 36, ...extra }) };
    };

    const nodeA = makeNodeHarness({ name: 'a.ts', path: 'src/a.ts', directory: false }, domRows[0]);
    const nodeB = makeNodeHarness({ name: 'b.ts', path: 'src/b.ts', directory: false }, domRows[1]);
    const nodeC = makeNodeHarness({ name: 'c.ts', path: 'src/c.ts', directory: false }, domRows[2]);

    // (2a) Single tree row: pending gone check holds menu closed; pointerdown cancels before settle.
    let resolveGone;
    goneAnswer = () => new Promise((r) => { resolveGone = r; });
    menuRecord.lastSingle = null;
    nodeA.rightClick();
    assert.deepEqual(goneCalls, [{ sessionId: 's1', path: '/repo/src/a.ts' }]);
    assert.deepEqual([...treeStore.getState().selected.keys()], ['src/a.ts']);
    assert.equal(findElements(nodeA.renderNode(), (el) => el.type === SourceMenu.Popup).length, 0, 'menu does not open while gone check is pending');
    view.dispatchEvent(new Event('pointerdown'));
    resolveGone(true);
    await tick();
    assert.equal(findElements(nodeA.renderNode(), (el) => el.type === SourceMenu.Popup).length, 0, 'pointerdown during pending check cancels menu open');

    // (2b) Single tree row: gone=true settles -> menu opens with gone=true (Open in & Show in Finder omitted).
    goneCalls.length = 0;
    goneAnswer = () => new Promise((r) => { resolveGone = r; });
    nodeA.rightClick();
    assert.equal(findElements(nodeA.renderNode(), (el) => el.type === SourceMenu.Popup).length, 0);
    resolveGone(true);
    await tick();
    const openTreeA = nodeA.renderNode();
    assert.equal(findElements(openTreeA, (el) => el.type === SourceMenu.Popup).length, 1, 'menu opens after gone check settles');
    assert.equal(openTreeA.props['data-popup-open'], '');
    assert.equal(menuRecord.lastSingle?.path, 'src/a.ts');
    assert.equal(menuRecord.lastSingle?.opts.gone, true);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.label === FILE_MENU_LABELS.openIn), false);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.action === 'show-in-finder'), false);

    // (2c) Multi-selected tree row: right-clicking a row in a >=2 selection does NOT call isSessionPathGone, reorders selection, and opens immediately.
    goneCalls.length = 0;
    menuRecord.lastMulti = null;
    treeStore.getState().selectOnly(selection.entries.get('src/b.ts'));
    treeStore.getState().toggle(selection.entries.get('src/a.ts'));
    assert.deepEqual([...treeStore.getState().selected.keys()], ['src/b.ts', 'src/a.ts']);
    nodeB.rightClick();
    assert.equal(goneCalls.length, 0, 'multi-selected row never asks isSessionPathGone');
    assert.deepEqual([...treeStore.getState().selected.keys()], ['src/a.ts', 'src/b.ts'], 'reordered to tree visual order');
    assert.equal(findElements(nodeB.renderNode(), (el) => el.type === SourceMenu.Popup).length, 1, 'multi-selection menu opens synchronously');
    assert.deepEqual(menuRecord.lastMulti?.paths, ['src/a.ts', 'src/b.ts']);

    // (2d) Multi-selection active, right-clicking an unselected third row asks beforeOpen BEFORE collapsing selection to that row.
    let selectedAtCallTime;
    goneAnswer = () => { selectedAtCallTime = [...treeStore.getState().selected.keys()]; return Promise.resolve(false); };
    nodeC.rightClick();
    assert.deepEqual(selectedAtCallTime, ['src/a.ts', 'src/b.ts'], 'beforeOpen is called before selectOnly mutates selection');
    assert.deepEqual([...treeStore.getState().selected.keys()], ['src/c.ts']);
    await tick();
    assert.equal(findElements(nodeC.renderNode(), (el) => el.type === SourceMenu.Popup).length, 1);
    assert.equal(menuRecord.lastSingle?.path, 'src/c.ts');
    assert.equal(menuRecord.lastSingle?.opts.gone, false);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.label === FILE_MENU_LABELS.openIn), true);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.action === 'show-in-finder'), true);

    // 3. SourceFilesSearch filename & content result right-click behavior.
    const searchMatches = [
      { path: 'src/a.ts', name: 'a.ts', directory: false, positions: [] },
      { path: 'src/b.ts', name: 'b.ts', directory: false, positions: [] },
      { path: 'src/c.ts', name: 'c.ts', directory: false, positions: [] },
    ];
    const contentMatches = [
      { path: 'src/a.ts', name: 'a.ts', directory: false, line: 12, column: 7, preview: 'const needle = 1;', ranges: [{ start: 6, end: 12 }] },
    ];
    let onSearchReply;
    const waitSearchReply = () => new Promise((r) => { onSearchReply = r; });
    const searchHarness = createHostHarness(SourceFilesSearch, { contexts: new Map([[CurrentSessionIdContext, 's1']]) });
    const searchProps = {
      sessionId: 's1',
      cwd: '/repo',
      activePath: null,
      onOpen() {},
      fileMenu: trackedFileMenu,
      call: async (action, request) => {
        const reply = {
          requestId: request.requestId,
          query: request.query,
          requestedRoot: '/repo',
          root: '/repo',
          matches: action === 'files:content-search' ? contentMatches : searchMatches,
          complete: true,
          truncated: false,
          truncationReasons: [],
        };
        setTimeout(() => onSearchReply?.(), 0);
        return reply;
      },
    };
    searchHarness.render(searchProps);
    const inputEl = () => findElements(searchHarness.tree, (el) => el.type === 'input')[0];
    let replied = waitSearchReply();
    inputEl().props.onChange({ target: { value: 'src' } });
    searchHarness.render(searchProps);
    await replied;
    await tick();
    searchHarness.render(searchProps);
    const resultRows = () => findElements(searchHarness.tree, (el) => el.props?.className === 'sfs-result-row');
    assert.equal(resultRows().length, 3);

    // (3a) Single search result: pending gone check holds menu closed; pointerdown cancels.
    goneCalls.length = 0;
    goneAnswer = () => new Promise((r) => { resolveGone = r; });
    resultRows()[0].props.onContextMenu({ preventDefault() {}, stopPropagation() {}, currentTarget: domRows[0], type: 'contextmenu', clientX: 16, clientY: 20 });
    searchHarness.render(searchProps);
    assert.deepEqual(goneCalls, [{ sessionId: 's1', path: '/repo/src/a.ts' }]);
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 0, 'search menu waits while gone check is pending');
    view.dispatchEvent(new Event('pointerdown'));
    resolveGone(true);
    await tick();
    searchHarness.render(searchProps);
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 0, 'pointerdown cancels pending search menu');

    // (3b) Single search result: gone=true settles -> menu opens with gone=true.
    goneCalls.length = 0;
    goneAnswer = () => new Promise((r) => { resolveGone = r; });
    resultRows()[0].props.onContextMenu({ preventDefault() {}, stopPropagation() {}, currentTarget: domRows[0], type: 'contextmenu', clientX: 16, clientY: 20 });
    searchHarness.render(searchProps);
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 0);
    resolveGone(true);
    await tick();
    searchHarness.render(searchProps);
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 1);
    assert.equal(resultRows()[0].props['data-popup-open'], '');
    assert.equal(menuRecord.lastSingle?.path, 'src/a.ts');
    assert.equal(menuRecord.lastSingle?.opts.gone, true);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.label === FILE_MENU_LABELS.openIn), false);
    assert.equal(menuRecord.lastSingle?.items.some((i) => i.action === 'show-in-finder'), false);

    // (3c) Multi-selected filename results: right-click skips isSessionPathGone and reorders selection to visual order.
    goneCalls.length = 0;
    menuRecord.lastMulti = null;
    findElements(resultRows()[1], (el) => el.type === 'button')[0].props.onClick({ detail: 1 });
    searchHarness.render(searchProps);
    findElements(resultRows()[0], (el) => el.type === 'button')[0].props.onClick({ metaKey: true, detail: 1 });
    searchHarness.render(searchProps);
    resultRows()[1].props.onContextMenu({ preventDefault() {}, stopPropagation() {}, currentTarget: domRows[1], type: 'contextmenu', clientX: 16, clientY: 20 });
    searchHarness.render(searchProps);
    assert.equal(goneCalls.length, 0, 'multi-selected search row skips isSessionPathGone');
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 1);
    assert.deepEqual(menuRecord.lastMulti?.paths, ['src/a.ts', 'src/b.ts']);

    // (3c2) Multi-selection active in search results, right-clicking an unselected third row asks isSessionPathGone and collapses selection to that row.
    goneAnswer = () => false;
    resultRows()[2].props.onContextMenu({ preventDefault() {}, stopPropagation() {}, currentTarget: domRows[2], type: 'contextmenu', clientX: 16, clientY: 20 });
    searchHarness.render(searchProps);
    assert.deepEqual(goneCalls, [{ sessionId: 's1', path: '/repo/src/c.ts' }]);
    await tick();
    searchHarness.render(searchProps);
    assert.equal(menuRecord.lastSingle?.path, 'src/c.ts');
    assert.equal(menuRecord.lastSingle?.opts.gone, false);

    // (3d) Content search result (?needle): always checks isSessionPathGone and forwards line + gone to menu entries.
    goneCalls.length = 0;
    goneAnswer = () => true;
    replied = waitSearchReply();
    inputEl().props.onChange({ target: { value: '?needle' } });
    searchHarness.render(searchProps);
    await replied;
    await tick();
    searchHarness.render(searchProps);
    const contentRow = resultRows().find((el) => el.props['data-content-match'] === 12);
    assert.ok(contentRow, 'content match row rendered');
    contentRow.props.onContextMenu({ preventDefault() {}, stopPropagation() {}, currentTarget: domRows[0], type: 'contextmenu', clientX: 16, clientY: 20 });
    searchHarness.render(searchProps);
    assert.deepEqual(goneCalls, [{ sessionId: 's1', path: '/repo/src/a.ts' }]);
    await tick();
    searchHarness.render(searchProps);
    assert.equal(findElements(searchHarness.tree, (el) => el.type === SourceMenu.Popup).length, 1);
    assert.equal(menuRecord.lastSingle?.path, 'src/a.ts');
    assert.equal(menuRecord.lastSingle?.opts.line, 12);
    assert.equal(menuRecord.lastSingle?.opts.gone, true);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousObserver === undefined) delete globalThis.MutationObserver; else globalThis.MutationObserver = previousObserver;
  }
});
