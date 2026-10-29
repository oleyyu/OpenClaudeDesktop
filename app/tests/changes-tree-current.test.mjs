// R3-files FT-07: the Changes "Changed files" tree and body on their 3.6556.2 originals (c44d00c7f-Cr1FDL2F; w10 L38: the
// folder / kind-section caret turned by the CdsIcon rotate prop, no rotate-90 class; the section count text-muted) — rows at ca7840910 V(depth)
// (10px a level) with the official row classes and the kept guide of the active file's folder (c44d00c7f Fc, diffgit-03),
// expansion that scrolls the opened subtree into view (kc, diffgit-04), folder names as c784da984 path segments and the
// Jr tooltip that splits paths at "/" under a 480px cap (diffgit-05), F7's belowPane anchor (hi / Ds, diffgit-09) and the
// per-file whitespace pause (Ca, diffgit-11). Generator provenance, SSR, a hook dispatcher, controlled DOM stand-ins and
// the lightningcss cascade fixture; no browser, no Electron.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup, setState } from './fixtures/transcript-css-cascade.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import * as official3 from '../scripts/official-3.6556.2.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const h = React.createElement;
let server;
const ssr = (file) => server.ssrLoadModule(file);
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

// The minified import / export tables: `import{a as Ke,…}from"./x.js"` (alias -> exported name) and `export{N as a,…}`.
function importsOf(chunk, from) {
  const table = new Map();
  for (const [, list] of official(chunk).matchAll(new RegExp(`import\\{([^}]*)\\}from"\\./${from.replace(/[.$]/g, '\\$&')}"`, 'g')))
    for (const pair of list.split(',')) { const [name, alias = name] = pair.split(' as '); table.set(alias, name); }
  return table;
}
function exportsOf(chunk) {
  const list = [...official(chunk).matchAll(/export\{([^}]*)\}/g)].at(-1)[1];
  return new Map(list.split(',').map((pair) => { const [local, name = local] = pair.split(' as '); return [name, local]; }));
}
const DIFF = 'c44d00c7f-zUAG9XyS.js';
// c44d00c7f alias -> the original binding it names in its chunk.
const resolve = (alias, chunk) => exportsOf(chunk).get(importsOf(DIFF, chunk).get(alias));

// A hook dispatcher whose state persists across calls of one component (no React DOM).
function harness(component) {
  const slots = [];
  let index = 0;
  const hooks = {
    use: (usable) => usable._currentValue, useContext: (usable) => usable._currentValue,
    useState: (initial) => { const at = index++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], (value) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef: (initial) => { const at = index++; if (!(at in slots)) slots[at] = { current: initial }; return slots[at]; },
    useCallback: (fn) => { index++; return fn; },
    useMemo: (fn) => { index++; return fn(); },
    useEffect: () => { index++; }, useLayoutEffect: () => { index++; },
  };
  return (...args) => {
    index = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
    try { return component(...args); } finally { internal.H = old; }
  };
}
const patchOf = (file, body = '@@ -1 +1 @@\n-a\n+b\n') => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n${body}`;

// The 3.6556.2 chunks the generator now reads (W2 w2-files).
const OFFICIAL_V3 = official3.ionSource;
const officialV3 = (name) => fs.readFileSync(path.join(OFFICIAL_V3, name), 'utf8');
const DIFF_V3 = 'c44d00c7f-Cr1FDL2F.js';
function importsOfV3(chunk, from) {
  const table = new Map();
  for (const [, list] of officialV3(chunk).matchAll(new RegExp(`import\\{([^}]*)\\}from"\\./${from.replace(/[.$]/g, '\\$&')}"`, 'g')))
    for (const pair of list.split(',')) { const [name, alias = name] = pair.split(' as '); table.set(alias, name); }
  return table;
}
function exportsOfV3(chunk) {
  const list = [...officialV3(chunk).matchAll(/export\{([^}]*)\}/g)].at(-1)[1];
  return new Map(list.split(',').map((pair) => { const [local, name = local] = pair.split(' as '); return [name, local]; }));
}
const resolveV3 = (alias, chunk) => exportsOfV3(chunk).get(importsOfV3(DIFF_V3, chunk).get(alias));

test('FT-07 generator: the tree tooltip, the path forms and the F7 anchors are 3.6556.2 originals with their imports resolved', () => {
  const manifest = JSON.parse(source('src/generated/files-changes/manifest.json'));
  assert.equal(manifest.referenceVersion, official3.referenceVersion);
  const entry = (target) => manifest.modules.find((module) => module.target === target);
  const expected = {
    'diff-tree-tooltip.mjs': [DIFF_V3, { Si: 'DiffTreeRowTooltip', vi: 'rowNameClipped' }, ['vi', 'yi', 'bi', 'xi', 'Si']],
    // W13 G11 (assertion behind the generator): W12b cf-03 also publishes l (c784da984 `l as r`, cccc2cf0a Af) as LitText.
    'path-segments.mjs': ['c784da984-Bk3OYRhM.js', { u: 'PathSegments', f: 'NameThenFolder', l: 'LitText' }, ['l', 'u', 'd', 'f', 'p']],
    'diff-change-nav.mjs': [DIFF_V3, { Ui: 'adjacentChange', Hi: 'sameChangeAnchor', Vi: 'changeAnchors' }, ['Vi', 'Hi', 'Ui']],
  };
  for (const [target, [chunk, exports, bindings]] of Object.entries(expected)) {
    const module = entry(target);
    assert.ok(module, target);
    assert.equal(module.referenceVersion, official3.referenceVersion, target);
    assert.equal(module.source, chunk, target);
    assert.deepEqual(module.exports, exports, target);
    assert.deepEqual(module.bindings.map((binding) => binding.name), bindings, target);
    assert.equal(module.sourceSha256, createHash('sha256').update(fs.readFileSync(path.join(OFFICIAL_V3, chunk))).digest('hex'), target);
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/generated/files-changes', target))).digest('hex'), module.sha256, target);
  }
  const via = (target, local) => entry(target).imports.find((item) => item.local === local);
  // Si: the host tooltip (FilesTooltip adapter), React's cloneElement, cc5c56f5c n / t from code-current (E39).
  assert.deepEqual([via('diff-tree-tooltip.mjs', 'M').kind, via('diff-tree-tooltip.mjs', 'M').name], ['adapter', 'FilesTooltip']);
  assert.deepEqual([via('diff-tree-tooltip.mjs', 'f').from, via('diff-tree-tooltip.mjs', 'f').name], ['react', 'cloneElement']);
  assert.deepEqual([via('diff-tree-tooltip.mjs', 'In').from, via('diff-tree-tooltip.mjs', 'In').name, via('diff-tree-tooltip.mjs', 'Ln').name],
    ['../code-current/path-tooltip.mjs', 'pathTooltipContent', 'pathTooltipOptions']);
  // c784da984: shared-28 DM (code-current path-parts), ce574895a (code-current breadcrumb-measure), cdsClassNames (view-tabs).
  assert.deepEqual([via('path-segments.mjs', 'o').from, via('path-segments.mjs', 'o').name], ['../code-current/path-parts.mjs', 'splitPath']);
  assert.deepEqual([via('path-segments.mjs', 'c').name, via('path-segments.mjs', 's').name, via('path-segments.mjs', 'c').from],
    ['useHeadCut', 'observeWidth', '../code-current/breadcrumb-measure.mjs']);
  assert.deepEqual([via('path-segments.mjs', 'a').kind, via('path-segments.mjs', 'a').from, via('path-segments.mjs', 'a').name],
    ['view-tabs', '../view-tabs/shared-frame-6jtSkIit.js', 'cdsClassNames']);
  // What c44d00c7f's tree imports resolve to (minified import / export tables).
  assert.deepEqual([resolveV3('Wt', 'c784da984-Bk3OYRhM.js'), resolveV3('Gt', 'c784da984-Bk3OYRhM.js')], ['u', 'f']);
  assert.deepEqual([resolveV3('In', 'cc5c56f5c-BoRtnbt1.js'), resolveV3('Ln', 'cc5c56f5c-BoRtnbt1.js')], ['n', 't']);
  // The row classes / styles moved from ca7840910 to c621b1e2d (file-tree-row-classes + code-current file-tree-style).
  const tree = 'c621b1e2d-CU5cG_mP.js';
  assert.deepEqual(Object.fromEntries(['xt', 'bt', '_t', 'St', 'gt', 'ht', 'vt', 'Q', 'Ct', 'yt'].map((alias) => [alias, resolveV3(alias, tree)])),
    { xt: 'f', bt: 'l', _t: 'm', St: 'p', gt: 'y', ht: 'h', vt: '_', Q: 'i', Ct: 'c', yt: 'd' });
  const classes = entry('file-tree-row-classes.mjs');
  assert.equal(classes.source, tree);
  assert.deepEqual(['f', 'l', 'm', 'p', 'c', 'd'].map((local) => classes.exports[local]),
    ['fileTreeCompactRow', 'fileTreeKeptGuides', 'fileTreeRowCurrent', 'fileTreeRowIdle', 'fileTreeGroup', 'fileTreePadding']);
  // Stable strings of the compiled 3.6556.2 tree (R2): class literals, data-*, props.
  const text = officialV3(DIFF_V3);
  for (const feature of [
    'i.some(e=>e.kind==="file"&&e.path===r.activePath)?{"--file-tree-kept-guides":vt(t)}:void 0', 'n("div",{role:"none",className:"contents",style:a,children:o})',
    'className:`${xt} ${bt} ${St}`', 'A=`${xt} ${bt} ${f?_t:St}`', 'onClick:L,className:`${xt} ${St}`',
    // 3.6556.2 (panes:C3-1): the Commits section header's caret (s = collapsed) is CdsIcon CaretRight with the rotate prop,
    // no rotate-90 class; the tree's folder / section carets are pinned below (w10 L38).
    'm=s?0:90', 'name:"CaretRight",size:p,rotate:m,className:"shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none"',
    'n("span",{ref:m,className:"flex min-w-0",children:n(Wt,{path:c,title:"",posix:!0})})',
    'detailIsPath:!0', 'n(wt,{fileName:t,size:i,className:"shrink-0 text-muted-control"})', 'n(Gt,{path:a,title:"",posix:!0})',
    'style:ee,"data-diff-tree-row":"","data-diff-tree-section":s', 'ee=J0($,42)?K0($,42,ht(0)):$[42]',
    // 3.6556.2: the section header name is text-secondary and its count text-muted (2.42304.0: text-muted-as-secondary).
    'n("span",{className:"truncate min-w-0 flex-1 text-secondary",children:c})', 'n("span",{className:"shrink-0 text-footnote tabular-nums text-muted",children:i.length})',
    'className:`${Ct} h-full overflow-y-auto ${yt} outline-none hide-focus-ring`',
    'side:"bottom",align:"start",className:v,delay:700,hoverable:!1,lazy:!0',
    'We&&(Vn?"border-s":"border-e")', 'hideWhitespace:N&&!Dc({annotations:c,prComments:l,findings:u,drafts:d})',
    'belowPane:c.viewportOffset>=n.getBoundingClientRect().height',
  ]) assert.ok(text.includes(feature), feature);
  assert.match(text, /\w+,\{delay:700,children:\w+\}/);
  // w10 L38: the folder row (cs) and the kind section header (Xo) turn CaretRight with the rotate prop (folder: 0 collapsed
  // / 90 open; section: 90 open / 0 closed), the class without rotate-90; both rows' button attributes (R2: looseFeature).
  const caret = (size, rotate) => `n(B,{name:"CaretRight",size:${size},rotate:${rotate},className:"shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none"})`;
  assert.match(text, official3.looseFeature(`b=a?0:90,S=J1($,15,b)?K1($,15,b,${caret('y', 'b')})`));
  assert.match(text, official3.looseFeature(`R=v?90:0,z=J1($,46,R)?K1($,46,R,${caret('te', 'R')})`));
  assert.match(text, official3.looseFeature('o("button",{ref:F,type:"button",style:ee,"data-diff-tree-row":"","data-diff-tree-section":s,role:"treeitem",tabIndex:-1,"aria-level":1,"aria-expanded":v,onClick:L,className:`${xt} ${St}`,children:[z,ne,re]})'));
  assert.match(text, official3.looseFeature('o("button",{ref:d,type:"button",style:h,"data-diff-tree-row":"",role:"treeitem",tabIndex:-1,"aria-level":g,"aria-expanded":_,onClick:v,className:`${xt} ${bt} ${St}`,children:[S,C]})'));
  assert.doesNotMatch(text, /name:"CaretRight"[^)]*rotate-90/);
  // The host follows: the rotate prop on both tree carets, no rotate-90 class, the section count text-muted.
  const host = source('src/source-diff.jsx');
  assert.ok(host.includes('rotate={isCollapsed ? 0 : 90} className="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none"'));
  assert.ok(host.includes('rotate={open ? 90 : 0} className="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none"'));
  assert.ok(host.includes('<span className="shrink-0 text-footnote tabular-nums text-muted">{section.count}</span>'));
  assert.doesNotMatch(host, /"rotate-90"/);
  // The rows' style is gt(depth) (y) for folder and file rows, ht(0) (h) for a kind section's header.
  assert.deepEqual(text.match(/,gt\(\w\)\)/g), [',gt(i))', ',gt(u))']);
});

test('FT-07 SSR: rows at V(depth) with the ca7840910 classes, the c784da984 folder name, the file-type icon (diffgit-03/05)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const L = await ssr('/src/diff-file-list-model.mjs');
  const { parseUnifiedDiff } = await ssr('/src/diff-model.js');
  const classes = await ssr('/src/generated/files-changes/file-tree-row-classes.mjs');
  const style = await ssr('/src/generated/code-current/file-tree-style.mjs');
  const patch = ['src/lib/app.js', 'src/lib/b.js', 'src/lib/deep/c.js', 'src/d.js', 'README.md'].map((file) => patchOf(file)).join('');
  const entries = L.diffFileEntries(parseUnifiedDiff(patch).sections);
  const render = (activePath, tree = true) => renderToStaticMarkup(h(D.SourceDiffFileTree, { list: L.diffFileList(entries, { tree }), tree, activePath, onSelect() {}, onOpenFile: null, actions: null }));
  const html = render(null);
  assert.match(html, new RegExp(`^<div role="tree" aria-label="Changed files" tabindex="0" class="${classes.fileTreeGroup.replace(/[[\]().:&/]/g, (c) => (c === '&' ? '&amp;' : `\\${c}`))} h-full overflow-y-auto px-xs py-1\\.25 outline-none hide-focus-ring">`));
  const rows = [...html.matchAll(/<button[^>]*data-diff-tree-row=""[^>]*>.*?<\/button>/g)].map((match) => match[0]);
  const at = (name) => rows.find((row) => row.includes(`>${name}<`));
  // Folder rows: P j F at V(depth); the caret is CdsIcon CaretRight (xs, mirrored), rotated while open.
  const level = (row) => Number(row.match(/aria-level="(\d)"/)[1]);
  const styleOf = (depth) => renderToStaticMarkup(h('i', { style: style.fileTreeRowStyle(depth) })).match(/style="([^"]*)"/)[1];
  for (const row of rows) {
    const depth = level(row) - 1;
    assert.ok(row.includes(`style="${styleOf(depth)}"`), row.slice(0, 160));
  }
  assert.equal(styleOf(0), 'padding-inline-start:8px');
  assert.equal(styleOf(2), 'padding-inline-start:28px;--file-tree-guides:repeating-linear-gradient(var(--file-tree-guides-to, to right), var(--cds-border) 0 1px, transparent 1px 10px);--file-tree-guides-x:14px;background-position:14px 0;background-repeat:no-repeat;background-size:20px 100%');
  const src = at('src');
  assert.match(src, /aria-expanded="true"/);
  assert.ok(src.includes(`class="${`${classes.fileTreeCompactRow} ${classes.fileTreeKeptGuides} ${classes.fileTreeRowIdle}`.replace(/&/g, '&amp;')}"`));
  // 3.6556.2 cs: an open folder's caret is CdsIcon rotate 90 (shared-frame zo: data-cds-rotate + --cds-icon-rotate, which
  // c6a992d55 `[data-cds=Icon][data-cds-rotate]` turns), not a rotate-90 class.
  assert.match(src, /<span data-cds="Icon" data-cds-mirror="" data-cds-rotate="" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*;--cds-icon-rotate:90deg" class="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" aria-hidden="true">[^<]*<\/span>/);
  assert.doesNotMatch(html, /rotate-90/);
  // A collapsed folder: rotate 0, which zo renders as no rotate attribute or variable at all.
  const shutFolder = renderToStaticMarkup(h(D.SourceDiffTreeFolder, { node: { kind: 'dir', name: 'src', path: 'src', children: [] }, depth: 0, collapsed: new Set(['src']), onToggle() {}, actions: null, activePath: null, onSelect() {}, showDirectory: false }));
  assert.match(shutFolder, /aria-expanded="false"[^>]*><span data-cds="Icon" data-cds-mirror="" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*" class="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" aria-hidden="true">/);
  assert.doesNotMatch(shutFolder, /data-cds-rotate|--cds-icon-rotate|rotate-90/);
  assert.match(src, /<span class="flex min-w-0"><span dir="ltr" class="relative flex min-w-0 overflow-hidden whitespace-nowrap"><span class="min-w-0 truncate">src<\/span><\/span><\/span>/);
  // A file row: the c280f9bbb file-type icon (xs, text-muted-control), its name, the footnote counts.
  const app = at('app.js');
  assert.equal(level(app), 3);
  assert.ok(app.includes(`class="${`${classes.fileTreeCompactRow} ${classes.fileTreeKeptGuides} ${classes.fileTreeRowIdle}`.replace(/&/g, '&amp;')}"`));
  assert.match(app, /<span data-cds="Icon" style="[^"]*" class="shrink-0 text-muted-control" aria-hidden="true">[^<]*<\/span><span class="truncate min-w-0 flex-1">app\.js<\/span><span class="flex shrink-0 items-center gap-0\.5 text-footnote tabular-nums"><span class="text-git-added">\+1<\/span><span class="text-git-removed">−1<\/span><\/span>/);
  // The current file: I instead of F.
  const current = [...render('src/lib/app.js').matchAll(/<button[^>]*aria-current="true"[^>]*>/g)].map((match) => match[0]);
  assert.equal(current.length, 1);
  assert.ok(current[0].includes(`${classes.fileTreeKeptGuides} ${classes.fileTreeRowCurrent}`.replace(/&/g, '&amp;')));
  // A "/"-joined folder chain (single-child folders merged) is c784da984 d: the head, then the last segment, labelled.
  const chain = renderToStaticMarkup(h(D.SourceDiffFileTree, { list: L.diffFileList(L.diffFileEntries(parseUnifiedDiff(patchOf('pkg/core/x.js')).sections), { tree: true }), tree: true, activePath: null, onSelect() {} }));
  assert.match(chain, /<span class="flex min-w-0"><span dir="ltr" class="relative flex min-w-0 overflow-hidden whitespace-nowrap" aria-label="pkg\/core"><span class="min-w-0 truncate">pkg\/<\/span><span class="max-w-full shrink-0 truncate">core<\/span><\/span><\/span>/);
  // The flat list: c784da984 p, the name then its folder in footnote (fades out once clipped).
  const flat = render(null, false);
  assert.match(flat, /<span class="flex min-w-0 flex-1"><span dir="ltr" class="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap"><span class="max-w-full shrink-0 truncate">c\.js<\/span><span class="flex min-w-0 text-footnote text-muted-as-secondary data-\[clipped\]:opacity-0"><span dir="ltr" class="relative flex min-w-0 overflow-hidden whitespace-nowrap" aria-label="src\/lib\/deep"><span class="min-w-0 truncate">src\/lib\/<\/span><span class="max-w-full shrink-0 truncate">deep<\/span><\/span><\/span><\/span><\/span>/);
  assert.doesNotMatch(html + flat, /sdiff-tree-row|sdiff-tree-caret|sdiff-tree-counts|padding-left/);
});

test('FT-07 Fc: the folder holding the active file keeps its guide (z at its depth), inherited below it (diffgit-03)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const L = await ssr('/src/diff-file-list-model.mjs');
  const { parseUnifiedDiff } = await ssr('/src/diff-model.js');
  const { guideGradient } = await ssr('/src/generated/code-current/file-tree-style.mjs');
  const patch = ['src/lib/app.js', 'src/lib/b.js', 'src/lib/deep/c.js', 'src/d.js', 'README.md', 'src/app.test.js'].map((file) => patchOf(file)).join('');
  const entries = L.diffFileEntries(parseUnifiedDiff(patch).sections);
  const wrappers = (activePath, groupByKind = false) => {
    const html = renderToStaticMarkup(h(D.SourceDiffFileTree, { list: L.diffFileList(entries, { tree: true, groupByKind }), tree: true, activePath, onSelect() {} }));
    // Each Fc wrapper with the aria-level of its first row.
    return [...html.matchAll(/<div role="none" class="contents"(?: style="([^"]*)")?><button[^>]*aria-level="(\d)"/g)].map(([, kept, level]) => ({ kept: kept ?? null, level: Number(level) }));
  };
  const keptOf = (depth) => `--file-tree-kept-guides:${guideGradient(depth)}`;
  assert.equal(keptOf(1), '--file-tree-kept-guides:linear-gradient(var(--file-tree-guides-to, to right), transparent 10px, var(--cds-border) 10px 11px, transparent 11px)');
  // No active file: no wrapper keeps a guide.
  assert.ok(wrappers(null).every((wrapper) => wrapper.kept === null));
  // src/lib/app.js: lib's rows (level 3) keep lib's guide (depth 1); src's and deep's wrappers set none (deep's rows
  // inherit lib's from the DOM ancestor).
  const lib = wrappers('src/lib/app.js');
  assert.deepEqual(lib.filter((wrapper) => wrapper.kept).map((wrapper) => wrapper), [{ kept: keptOf(1), level: 3 }]);
  assert.equal(lib.length, 3);
  // A file directly under src: src's guide (depth 0).
  assert.deepEqual(wrappers('src/d.js').filter((wrapper) => wrapper.kept), [{ kept: keptOf(0), level: 2 }]);
  // A root file: no folder, no wrapper keeps a guide.
  assert.ok(wrappers('README.md').every((wrapper) => wrapper.kept === null));
  // A kind section's rows sit in an Fc at depth 0 (Ec): as a tree, the section's src folder (level 2) keeps its own guide
  // for the active file under it (z(1)); in the flat list the active file is a direct row, keeping the section's (z(0)).
  const grouped = renderToStaticMarkup(h(D.SourceDiffFileTree, { list: L.diffFileList(entries, { tree: true, groupByKind: true }), tree: true, activePath: 'src/app.test.js', onSelect() {} }));
  const test = grouped.slice(grouped.indexOf('data-diff-tree-section="test"'));
  assert.match(test, /<\/button><div role="none" class="contents"><button[^>]*aria-level="2" aria-expanded="true"[^>]*>.*?<\/button><div role="none" class="contents" style="--file-tree-kept-guides:linear-gradient\(var\(--file-tree-guides-to, to right\), transparent 10px, var\(--cds-border\) 10px 11px, transparent 11px\)"><button[^>]*aria-level="3" aria-current="true"/);
  const sections = renderToStaticMarkup(h(D.SourceDiffFileTree, { list: L.diffFileList(entries, { tree: false, groupByKind: true }), tree: false, activePath: 'src/app.test.js', onSelect() {} }));
  assert.match(sections, new RegExp(`<div role="none" class="mt-1 border-t pt-1" data-pane-line=""><button type="button" style="padding-inline-start:8px" data-diff-tree-row="" data-diff-tree-section="test"[^>]*aria-expanded="true" class="flex items-center gap-1 h-control app-list-row pe-md rounded text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-\\[pressed\\]:bg-fill-ghost-hover">`));
  // 3.6556.2 Xo: an open section's caret is CdsIcon rotate 90, the name text-secondary, the count text-muted.
  assert.match(sections, /data-diff-tree-section="test"[^>]*><span data-cds="Icon" data-cds-mirror="" data-cds-rotate="" style="[^"]*;--cds-icon-rotate:90deg" class="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" aria-hidden="true">[^<]*<\/span><span class="truncate min-w-0 flex-1 text-secondary">Test files<\/span><span class="shrink-0 text-footnote tabular-nums text-muted">1<\/span><\/button>/);
  assert.match(sections, /<span class="shrink-0 text-footnote tabular-nums text-muted">1<\/span><\/button><div role="none" class="contents" style="--file-tree-kept-guides:linear-gradient\(var\(--file-tree-guides-to, to right\), transparent 0px, var\(--cds-border\) 0px 1px, transparent 1px\)"><button[^>]*aria-level="2"/);
});

test('FT-07 kc: opening a folder or a section scrolls its subtree into view; closing does not scroll (diffgit-04)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  // A controlled tree: rows with aria-level and rectangles, the role="tree" scroller 200px tall at the top of the page.
  const tree = { clientHeight: 200, scrollTop: 0, rows: [], getBoundingClientRect: () => ({ top: 0 }), querySelectorAll(selector) { assert.equal(selector, '[data-diff-tree-row]'); return this.rows; } };
  const row = (level, top) => ({ level, top, getAttribute: (name) => (name === 'aria-level' ? String(level) : null), getBoundingClientRect() { return { top: this.top, bottom: this.top + 24 }; }, closest: (selector) => (selector === '[role="tree"]' ? tree : null) });
  const folder = row(1, 150), after = row(1, 174);
  tree.rows = [row(1, 126), folder, after];
  const node = { kind: 'dir', name: 'src', path: 'src', children: [{ kind: 'file', name: 'a.js', path: 'src/a.js' }] };
  const toggled = [];
  // The update runs before the scroll is measured (flushSync): here it inserts the opened folder's three rows.
  const onToggle = (path) => { toggled.push(path); tree.rows = [tree.rows[0], folder, row(2, 174), row(2, 198), row(2, 222), row(1, 246)]; };
  const button = (element) => element.props.children[0].props.children;
  const closed = harness(D.SourceDiffTreeFolder)({ node, depth: 0, collapsed: new Set(['src']), onToggle, actions: null, activePath: null, onSelect() {}, showDirectory: false });
  assert.equal(button(closed).props['aria-expanded'], false);
  assert.equal(button(closed).props.children[0].props.rotate, 0);
  button(closed).props.onClick({ currentTarget: folder });
  assert.deepEqual(toggled, ['src']);
  // kc: min(last row bottom + 5 - (tree top + height), row top - 5 - tree top) = min(246 + 5 - 200, 150 - 5) = 51.
  assert.equal(tree.scrollTop, 51);
  // Closing an open folder: the update only.
  const open = harness(D.SourceDiffTreeFolder)({ node, depth: 0, collapsed: new Set(), onToggle: (path) => toggled.push(path), actions: null, activePath: null, onSelect() {}, showDirectory: false });
  assert.equal(button(open).props.children[0].props.rotate, 90);
  button(open).props.onClick({ currentTarget: folder });
  assert.deepEqual(toggled, ['src', 'src']);
  assert.equal(tree.scrollTop, 51);
  // A kind section's header: kc(row, !open, toggle).
  let sectionToggles = 0;
  const header = row(1, 300);
  tree.rows = [header, row(2, 324), row(2, 348)];
  tree.scrollTop = 0;
  const section = harness(D.SourceDiffTreeSection)({ section: { kind: 'test', label: 'Test files', count: 2 }, open: false, onToggle: () => { sectionToggles++; } });
  assert.equal(section.props['data-diff-tree-section'], 'test');
  assert.equal(section.props.children[0].props.rotate, 0);
  section.props.onClick({ currentTarget: header });
  assert.equal(sectionToggles, 1);
  assert.equal(tree.scrollTop, Math.min(348 + 24 + 5 - 200, 300 - 5));
  const shut = harness(D.SourceDiffTreeSection)({ section: { kind: 'test', label: 'Test files', count: 2 }, open: true, onToggle: () => { sectionToggles++; } });
  assert.equal(shut.props.children[0].props.rotate, 90);
  shut.props.onClick({ currentTarget: header });
  assert.equal(sectionToggles, 2);
  assert.equal(tree.scrollTop, 177, 'closing does not scroll');
});

test('FT-07 Jr: clipped or pointed-at rows name themselves; "/" paths split under the 480px cap; a menu suppresses it (diffgit-05)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const { DiffTreeRowTooltip, rowNameClipped } = await ssr('/src/generated/files-changes/diff-tree-tooltip.mjs');
  const { FilesTooltip } = await ssr('/src/source-files-changes-adapters.jsx');
  const { SourceTooltip } = await ssr('/src/source-tooltip.jsx');
  assert.equal(FilesTooltip, SourceTooltip);
  const node = (clipped = false) => ({ scrollWidth: clipped ? 120 : 80, clientWidth: 100, querySelector: () => null, querySelectorAll: () => [] });
  const CAP = 'max-w-[min(480px,var(--available-width))]';
  const markup = (value) => renderToStaticMarkup(h('div', null, value));
  // A folder row ("/"-joined chain, no detail): the clipped name is c0fbbe82d hn's segment spans, with the cap.
  const folder = harness(DiffTreeRowTooltip)({ name: 'src/lib', nameRef: { current: node(true) }, suppressed: false, children: h('button') });
  assert.equal(folder.type, SourceTooltip);
  assert.deepEqual([folder.props.side, folder.props.align, folder.props.delay, folder.props.hoverable, folder.props.className, folder.props.detail],
    ['bottom', 'start', 700, false, CAP, null]);
  assert.equal(markup(folder.props.content()), '<div><span dir="ltr"><span class="inline-block max-w-full whitespace-pre-wrap">src/</span><span class="inline-block max-w-full whitespace-pre-wrap">lib</span></span></div>');
  // Not clipped and no detail: nothing to say.
  assert.equal(harness(DiffTreeRowTooltip)({ name: 'src/lib', nameRef: { current: node(false) }, suppressed: false, children: h('button') }).props.content(), null);
  // A nested file row (its folder is the detail path): its own name once the pointer is on it; the folder split at "/".
  const file = harness(DiffTreeRowTooltip);
  const props = { name: 'app.js', detail: 'src/lib', detailIsPath: true, nameRef: { current: node(false) }, detailInRow: false, suppressed: false, children: h('button', { onPointerEnter() {} }) };
  let tip = file(props);
  assert.equal(tip.props.className, CAP);
  assert.equal(markup(tip.props.detail), '<div><span dir="ltr"><span class="inline-block max-w-full whitespace-pre-wrap">src/</span><span class="inline-block max-w-full whitespace-pre-wrap">lib</span></span></div>');
  assert.equal(tip.props.content(), null, 'pointer not on the row yet');
  tip.props.children.props.onPointerEnter({});
  tip = file(props);
  assert.equal(tip.props.content(), 'app.js');
  // The flat list's row (folder shown in the row): only a clipped row names itself (Wr reads data-clipped too).
  const flat = harness(DiffTreeRowTooltip)({ ...props, detailInRow: true });
  assert.equal(flat.props.content(), null);
  assert.equal(rowNameClipped({ scrollWidth: 10, clientWidth: 10, querySelector: (selector) => (selector === '[data-clipped]' ? {} : null), querySelectorAll: () => [] }), true);
  assert.equal(rowNameClipped({ scrollWidth: 10, clientWidth: 10, querySelector: () => null, querySelectorAll: () => [{ clientWidth: 50, offsetWidth: 50, scrollWidth: 60 }] }), true);
  assert.equal(rowNameClipped(null), false);
  // Suppressed while the row's menu is open.
  const quiet = harness(DiffTreeRowTooltip)({ ...props, suppressed: true });
  assert.deepEqual([quiet.props.content, quiet.props.detail], [null, null]);
  // The rows hand Jr what c44d00c7f Rc / zc do.
  const tooltipOf = (element) => element.props.children[0];
  const dir = tooltipOf(harness(D.SourceDiffTreeFolder)({ node: { kind: 'dir', name: 'src/lib', path: 'src/lib', children: [] }, depth: 0, collapsed: new Set(), onToggle() {}, actions: null, activePath: null, onSelect() {} }));
  assert.deepEqual([dir.type, dir.props.name, dir.props.detail, dir.props.detailIsPath], [DiffTreeRowTooltip, 'src/lib', undefined, undefined]);
  const fileRow = tooltipOf(harness(D.SourceDiffTreeFile)({ node: { kind: 'file', name: 'app.js', path: 'src/lib/app.js' }, depth: 2, showDirectory: false, activePath: null, onSelect() {}, onOpenFile: null, actions: null }));
  assert.deepEqual([fileRow.type, fileRow.props.name, fileRow.props.detail, fileRow.props.detailIsPath, fileRow.props.detailInRow], [DiffTreeRowTooltip, 'app.js', 'src/lib', true, false]);
  // The host tooltip has no Floating UI size middleware: source-diff.css restates the cap for popups carrying mn's class.
  const css = source('src/source-diff.css');
  assert.match(css, /\.source-tooltip-positioner:has\(> \.source-tooltip-popup\[class~="max-w-\[min\(480px,var\(--available-width\)\)\]"\]\),\n\.source-tooltip-popup\[class~="max-w-\[min\(480px,var\(--available-width\)\)\]"\] \{ max-width: min\(480px, 100vw - 10px\); \}/);
  const cascade = loadCascade(appSheets(ROOT));
  const popup = element('div', { role: 'tooltip', class: `source-tooltip-popup source-tooltip-multiline ${CAP}` });
  const positioner = element('div', { 'data-cds': 'Tooltip', class: 'source-tooltip-positioner' }, [popup]);
  element('div', { class: 'cds-root source-tooltip-scope' }, [positioner]);
  for (const target of [popup, positioner]) {
    const width = computed(cascade, target, 'max-width');
    assert.match(width.value, /"min".*"px","value":480.*"vw","value":100.*"px","value":-10/, 'min(480px, 100vw - 10px)');
    assert.equal(width.from.sheet, 'src/source-diff.css');
  }
  const plain = element('div', { role: 'tooltip', class: 'source-tooltip-popup source-tooltip-single' });
  element('div', { class: 'source-tooltip-positioner' }, [plain]);
  assert.equal(computed(cascade, plain, 'max-width').value, '240px', 'other tooltips keep 240px');
});

test('FT-07 CSS: no unlayered rule restates the rows; the official utilities win the real cascade, guides included', async () => {
  const S = await ssr('/src/source-session.jsx');
  const css = source('src/source-diff.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.sdiff-tree-row|\.sdiff-file-list\s*\{|border-right/);
  // Every class of the column, the tree and its rows is in the loaded official CSS (app-list-row is a marker without rules).
  const twoFiles = patchOf('src/app.js') + patchOf('README.md');
  const html = renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'changes', diff: twoFiles + patchOf('src/app.test.js'),
    diffTree: { diffShowTree: true, diffTreeWidth: 300, diffFileTree: true, diffGroupByKind: true }, onDiffTreeChange() {} }));
  // The column ends where the main column starts (W12: the divider is c44d00c7f Ir inside the column, no host divider).
  const column = html.slice(html.indexOf('<div class="sdiff-file-list '), html.indexOf('<div class="sdiff-changes-main'));
  const loaded = fs.readdirSync(path.join(ROOT, 'public/assets/v1')).filter((name) => name.endsWith('.css')).map((name) => source(`public/assets/v1/${name}`)).join('\n');
  const escape = (name) => `.${name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`;
  const used = new Set([...column.matchAll(/class="([^"]*)"/g)].flatMap(([, list]) => list.replace(/&amp;/g, '&').split(/\s+/)).filter(Boolean));
  const host = new Set(['sdiff-file-list', 'app-list-row']);
  const missing = [...used].filter((name) => !host.has(name) && ![...'{:,. >)['].some((next) => loaded.includes(escape(name) + next)));
  assert.deepEqual(missing, []);
  // The real cascade (lightningcss over every sheet the renderer loads, in bundle order).
  const doc = element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable', 'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' },
    [element('body', {}, [element('div', { id: 'root' })])]);
  for (const part of parseMarkup(html)) append(doc.children[0].children[0], part);
  const cascade = loadCascade(appSheets(ROOT));
  const official = (result, label) => {
    assert.match(result.from?.sheet ?? '', /c6a992d55/, `${label}: ${result.from?.sheet} ${result.value}`);
    assert.match(result.from?.layer?.join?.('.') ?? String(result.from?.layer), /utilities/, label);
  };
  const isRow = (name) => (n) => n.tag === 'button' && n.attrs['data-diff-tree-row'] !== undefined && n.children.some((child) => (child.text ?? '').includes(name) || find(child.children, (c) => c.text === name));
  const folder = find(doc, isRow('src')), file = find(doc, isRow('app.js'));
  assert.ok(folder && file);
  for (const [property, value] of [['padding-right', 'var(--cds-pad-md)'], ['background-color', 'var(--cds-alpha-0)'], ['background-image', 'var(--file-tree-kept-guides)'], ['font-size', 'var(--cds-font-size-body)'], ['color', 'var(--cds-text-primary)']]) {
    const result = computed(cascade, file, property);
    official(result, `file row ${property}`);
    assert.equal(result.value, value, property);
  }
  // w10 L38: the open folder's caret turns by c6a992d55 `[data-cds=Icon][data-cds-rotate]{rotate:var(--cds-icon-rotate)}`
  // (CdsIcon rotate prop) and no host rule; the kind section's count is the official text-muted.
  // (The cascade fixture does not track `rotate`: the rule is checked in the loaded sheet, the attributes on the node.)
  const caretOf = (row) => row.children.find((child) => child.attrs?.['data-cds'] === 'Icon');
  assert.ok(loaded.includes('[data-cds=Icon][data-cds-rotate]{--cds-icon-rotate:0deg;rotate:var(--cds-icon-rotate)}'));
  assert.equal(caretOf(folder).attrs['data-cds-rotate'], '');
  assert.match(caretOf(folder).attrs.style, /--cds-icon-rotate:90deg/);
  assert.doesNotMatch(appSheets(ROOT).filter((sheet) => sheet.name.startsWith('src/')).map((sheet) => sheet.code).join('\n'), /data-cds-rotate|--cds-icon-rotate/);
  const section = find(doc, (n) => n.tag === 'button' && n.attrs['data-diff-tree-section'] === 'test');
  assert.ok(section);
  // No active file: the Test section is closed, rotate 0, so its caret carries no rotate attribute.
  assert.equal(section.attrs['aria-expanded'], 'false');
  assert.equal(caretOf(section).attrs['data-cds-rotate'], undefined);
  const count = section.children.at(-1);
  assert.equal(count.attrs.class, 'shrink-0 text-footnote tabular-nums text-muted');
  official(computed(cascade, count, 'color'), 'section count');
  assert.equal(computed(cascade, count, 'color').value, 'var(--cds-text-muted)');
  // The row's inline V(depth) padding (SSR above) is beaten by no !important rule.
  assert.ok(!computed(cascade, file, 'padding-left').from?.important);
  // Hover on the tree shows every row's guides; hover on a row paints it.
  setState(file, ['hover']);
  official(computed(cascade, file, 'background-image'), 'hovered tree guides');
  assert.equal(computed(cascade, file, 'background-image').value, 'var(--file-tree-guides)');
  official(computed(cascade, file, 'background-color'), 'hovered row');
  assert.equal(computed(cascade, file, 'background-color').value, 'var(--cds-fill-ghost-hover)');
  // The column's edge: c44d00c7f border-e (base-layer colour).
  const list = find(doc, (n) => (n.attrs?.class ?? '').split(/\s+/).includes('sdiff-file-list'));
  official(computed(cascade, list, 'border-right-width'), 'column border-e');
  assert.equal(computed(cascade, list, 'border-right-width').value, '1px');
  assert.equal(String(computed(cascade, list, 'border-right-color').from?.layer), 'base');
  assert.match(computed(cascade, list, 'border-right-color').from?.sheet ?? '', /c6a992d55/);
  // Why the old restatement had to go: put back, its unlayered background shorthand wipes the guides out.
  const restated = loadCascade(appSheets(ROOT, { 'src/source-diff.css': source('src/source-diff.css') + '\n.sdiff-tree-row{background:var(--cds-alpha-0)}' }));
  const tagged = find(doc, isRow('app.js'));
  tagged.attrs.class += ' sdiff-tree-row';
  tagged.state.clear();
  assert.notEqual(computed(restated, tagged, 'background-image').value, 'var(--file-tree-kept-guides)');
  assert.equal(computed(restated, tagged, 'background-image').from.sheet, 'src/source-diff.css');
});

test('FT-07 Ca: Hide whitespace pauses per file while a comment, a draft or a finding sits on it (diffgit-11)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const C = await ssr('/src/diff-comments-model.mjs');
  const { whitespaceHidingPaused } = await ssr('/src/generated/files-changes/diff-whitespace-pause.mjs');
  // The host's Ca inputs: saved comments are annotations, open or unsaved ones drafts; no PR comments; none from Files.
  const inputs = D.whitespacePauseInputs([{ id: 'additions:1', side: 'additions', start: 1, end: 1, body: 'x', savedBody: 'x' }, { id: 'additions:3', body: '' }], []);
  assert.deepEqual(Object.keys(inputs.drafts), ['additions:3']);
  assert.equal(inputs.annotations.length, 1);
  assert.deepEqual(inputs.prComments, []);
  assert.equal(whitespaceHidingPaused(inputs), true);
  assert.equal(whitespaceHidingPaused(D.whitespacePauseInputs([], [])), false);
  assert.equal(whitespaceHidingPaused(D.whitespacePauseInputs(undefined, [{ id: 'f' }])), true);
  // Ca itself: only Files-pane comments (source "file") do not pause.
  assert.equal(whitespaceHidingPaused({ annotations: [{ source: 'file' }], prComments: [], findings: [], drafts: { k: { source: 'file' } } }), false);
  // Two indent-only files under Hide whitespace: hidden ("Whitespace only", no body) until something sits on them.
  const indent = (file) => `diff --git a/${file} b/${file}\nindex 1111111..2222222 100644\n--- a/${file}\n+++ b/${file}\n@@ -1,3 +1,3 @@\n function a() {\n-return 1;\n+  return 1;\n }\n`;
  const value = indent('a.js') + indent('b.js');
  const render = (props = {}) => renderToStaticMarkup(h(D.SourceDiff, { value, placement: 'changes', hideWhitespace: true, ...props }));
  const shown = (html, file) => {
    const start = html.indexOf(`data-file-path="${file}"`), end = html.indexOf('</section>', start);
    return { body: html.slice(start, end).includes('class="sdiff-file-body"'), whitespaceOnly: html.slice(start, end).includes('Whitespace only') };
  };
  let html = render({ commentScope: 'ft07' });
  assert.deepEqual([shown(html, 'a.js'), shown(html, 'b.js')], [{ body: false, whitespaceOnly: true }, { body: false, whitespaceOnly: true }]);
  // A comment draft on a.js (the store its cards render from) pauses a.js only.
  const store = C.diffFileCommentsStore('ft07', 'a.js');
  const id = store.create('additions', 2, 2, '  return 1;');
  html = render({ commentScope: 'ft07' });
  assert.deepEqual([shown(html, 'a.js'), shown(html, 'b.js')], [{ body: true, whitespaceOnly: false }, { body: false, whitespaceOnly: true }]);
  assert.match(html, /data-new-line="2"/);
  // Another session's comments do not count; without Hide whitespace nothing is filtered.
  assert.deepEqual(shown(render({ commentScope: 'other' }), 'a.js'), { body: false, whitespaceOnly: true });
  assert.deepEqual(shown(renderToStaticMarkup(h(D.SourceDiff, { value, placement: 'changes', commentScope: 'ft07' })), 'b.js'), { body: true, whitespaceOnly: false });
  store.remove(id);
  assert.deepEqual(shown(render({ commentScope: 'ft07' }), 'a.js'), { body: false, whitespaceOnly: true });
  // A review finding on b.js pauses b.js.
  const review = { findings: [{ id: 'f1', file: 'b.js', line: 2, endLine: 2, summary: 'Indent', detail: null, category: null }], statuses: {}, currentId: null, onDismiss() {}, onFix: null, onNext: null };
  html = render({ commentScope: 'ft07', review });
  assert.deepEqual([shown(html, 'a.js'), shown(html, 'b.js')], [{ body: false, whitespaceOnly: true }, { body: true, whitespaceOnly: false }]);
  // Wiring: the list-level decision feeds the same sections the F7 targets read.
  const text = source('src/source-diff.jsx');
  assert.match(text, /return hideWhitespace \? ordered\.map\(\(section\) => \(paused\.has\(section\.path\) \? section : whitespaceHidden\(section\)\)\) : ordered;/);
  assert.match(text, /const changeFiles = useMemo\(\(\) => \(changes \? sections\.filter/);
  assert.match(source('src/source-diff-comments.jsx'), /const store = useMemo\(\(\) => \(enabled \? diffFileCommentsStore\(scope, file\.path\) : null\)/);
});

test('FT-07 F7: Ds anchors at the topmost line with its offset; past the bottom of the pane it is belowPane (diffgit-09)', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const N = await ssr('/src/diff-change-nav-model.mjs');
  const rowOf = (side, line, top, height = 17) => ({ dataset: side === 'additions' ? { kind: 'added', newLine: String(line) } : { kind: 'removed', oldLine: String(line) }, getBoundingClientRect: () => ({ top, bottom: top + height, height }) });
  const sectionOf = (id, top, bottom, rows) => ({ dataset: { filePath: id }, getBoundingClientRect: () => ({ top, bottom }), querySelectorAll: () => rows });
  const viewOf = (sections) => ({ querySelectorAll: (selector) => (selector === '.sdiff-file[data-file-path]' ? sections : []) });
  const scroller = { getBoundingClientRect: () => ({ top: 100, height: 300, bottom: 400 }) };
  // On screen: the first row below the 32px header, offset from the pane top, not below the pane.
  const visible = viewOf([sectionOf('a.txt', 100, 900, [rowOf('additions', 1, 110), rowOf('additions', 2, 140)])]);
  assert.deepEqual(D.diffChangeViewport(visible, scroller, 32), { id: 'a.txt', side: 'additions', lineNumber: 2, viewportOffset: 40, belowPane: false });
  // The pane shows only collapsed headers: the topmost line is past its bottom.
  const below = viewOf([sectionOf('a.txt', 100, 132, []), sectionOf('b.txt', 132, 1200, [rowOf('additions', 5, 420)])]);
  const viewport = D.diffChangeViewport(below, scroller, 32);
  assert.deepEqual(viewport, { id: 'b.txt', side: 'additions', lineNumber: 5, viewportOffset: 320, belowPane: true });
  // hi: the change that starts at that line is still ahead (without belowPane it would be skipped).
  const targets = [{ id: 'b.txt', side: 'additions', lineNumber: 5, oldLine: 5, newLine: 5, removes: false }, { id: 'b.txt', side: 'additions', lineNumber: 9, oldLine: 9, newLine: 9, removes: false }];
  assert.equal(N.pickDiffChange(targets, ['a.txt', 'b.txt'], { viewport }, 1), targets[0]);
  assert.equal(N.pickDiffChange(targets, ['a.txt', 'b.txt'], { viewport: { ...viewport, belowPane: false } }, 1), targets[1]);
  // No line rendered at all: Os, the first file still on screen at line 0.
  assert.deepEqual(D.diffChangeViewport(viewOf([sectionOf('a.txt', 50, 90, []), sectionOf('b.txt', 140, 180, [])]), scroller, 32), { id: 'b.txt', side: 'additions', lineNumber: 0 });
  assert.match(source('src/source-diff.jsx'), /pickDiffChange\(targets, order, \{ last, viewport: diffChangeViewport\(node, scroller, offset\) \}, direction\)/);
});

test('FT-07 pane body: the Changes view sits in the focusable [data-diff-pane-body] the finding card hands focus back to', async () => {
  const D = await ssr('/src/source-diff.jsx');
  const patch = 'diff --git a/src/a.js b/src/a.js\n--- a/src/a.js\n+++ b/src/a.js\n@@ -1,3 +1,4 @@\n one\n two\n+three\n four\n';
  const review = { findings: [{ id: 'f1', file: 'src/a.js', line: 3, endLine: 3, summary: 'On three', detail: null, category: null }], statuses: {}, currentId: 'f1', onDismiss() {}, onFix: null, onNext: null };
  const html = renderToStaticMarkup(h(D.SourceDiff, { value: patch, placement: 'changes', review,
    fileList: { shown: true, width: 240, tree: true, groupByKind: false, onShownChange() {}, onWidthChange() {}, onCanFitChange() {} } }));
  const doc = element('div', {});
  for (const part of parseMarkup(html)) append(doc, part);
  const card = find(doc, (n) => n.attrs?.['data-review-finding'] === 'f1');
  assert.ok(card);
  // cae42d46f Ue: `e?.closest('[data-diff-pane-body], [role="dialog"]')`.
  let body = card;
  while (body && body.attrs?.['data-diff-pane-body'] === undefined && body.attrs?.role !== 'dialog') body = body.parent;
  assert.ok(body, 'the card has a pane body ancestor');
  assert.deepEqual([body.attrs.class, body.attrs.tabindex], ['sdiff-changes-layout outline-none', '-1']);
  assert.ok(official('cccc2cf0a-B0D--VZp.js').includes('"data-diff-pane-body":"",tabIndex:-1,className:"flex h-full flex-col select-text outline-none"'));
  assert.ok(official('cae42d46f-8Va5mKUX.js').includes('[data-diff-pane-body], [role="dialog"]'));
});
