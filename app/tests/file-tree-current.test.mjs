// R3-files FT-14 / FT-18: the Files tree on its 2.42304.0 originals — the rows and the subfolder error row carry the
// classes of cccc2cf0a NS / AS / Nx (ca7840910 A/j/N/I/F, shared-6 _h/vh, shared-frame Cx, cccc2cf0a dx/fx/px), the kept
// guides are cccc2cf0a xS / SS, a worktree session starts its tree at its origin folder (cccc2cf0a zx, files-10), and
// Escape on a multi-selection is c856385e2 nt (files-26). Generator provenance, SSR, a hook dispatcher, a real
// QueryClient and controlled stand-ins (no DOM, no desktop).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

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

// The minified import / export tables: `import{a as Nl,…}from"./x.js"` (alias -> exported name) and `export{N as a,…}`.
function importsOf(chunk, from) {
  const table = new Map();
  for (const [, list] of official(chunk).matchAll(new RegExp(`import\\{([^}]*)\\}from"\\./${from.replace(/[.$]/g, '\\$&')}"`, 'g')))
    for (const pair of list.split(',')) { const [name, alias = name] = pair.split(' as '); table.set(alias, name); }
  return table;
}
function exportsOf(chunk) {
  const list = official(chunk).match(/export\{([^}]*)\}\s*;?\s*(?:\/\/.*)?$/)?.[1] ?? [...official(chunk).matchAll(/export\{([^}]*)\}/g)].at(-1)[1];
  return new Map(list.split(',').map((pair) => { const [local, name = local] = pair.split(' as '); return [name, local]; }));
}
// cccc2cf0a alias -> the original binding it names in its chunk.
const resolve = (alias, chunk) => exportsOf(chunk).get(importsOf('cccc2cf0a-B0D--VZp.js', chunk).get(alias));

test('FT-14 / FT-18 generator: the step-3 modules are 2.42304.0 originals with their imports resolved', () => {
  const manifest = JSON.parse(source('src/generated/files-changes/manifest.json'));
  const entry = (target) => manifest.modules.find((module) => module.target === target);
  const expected = {
    'app-list-row.mjs': ['shared-6-Cby4X-ms.js', { _h: 'appListRow', vh: 'appListRowMin' }],
    'menu-item-classes.mjs': ['shared-frame-BfjMqbuN.js', { Cx: 'menuItemClasses' }],
    'file-tree-row.mjs': ['cccc2cf0a-B0D--VZp.js', { dx: 'fileTreeRowBase', fx: 'fileTreeRowSelected', px: 'fileTreeRowPrimary', xS: 'keptGuideFolders', SS: 'keptGuidesOfRow' }],
    'path-within.mjs': ['shared-28-DcgD7xXH.js', { GO: 'pathWithinRoot', RO: 'joinPath' }],
    'git-info-key.mjs': ['shared-0-ByI5P0CP.js', { jB: 'gitInfoQueryKey' }],
    'git-info-query.mjs': ['shared-11-BuQ3CK5I.js', { zd: 'gitInfoQuery' }],
    'file-tree-start-folder.mjs': ['cccc2cf0a-B0D--VZp.js', { zx: 'useWorktreeStartFolder', Vx: 'normalizeRevealPath', Rx: 'startRevealNonce' }],
    'file-selection-escape.mjs': ['c856385e2-DVsjb2QL.js', { nt: 'useMultiSelectionEscape' }],
    'file-frontmatter-view.mjs': ['c3fde7009-BbbO5TX9.js', { Ei: 'Frontmatter', Ti: 'frontmatterLabel' }],
  };
  for (const [target, [chunk, exports]] of Object.entries(expected)) {
    const module = entry(target);
    assert.ok(module, target);
    assert.equal(module.referenceVersion, '2.42304.0', target);
    assert.equal(module.source, chunk, target);
    assert.deepEqual(module.exports, exports, target);
    assert.equal(module.sourceSha256, createHash('sha256').update(fs.readFileSync(path.join(OFFICIAL, chunk))).digest('hex'), target);
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/generated/files-changes', target))).digest('hex'), module.sha256, target);
  }
  const via = (target, local) => entry(target).imports.find((item) => item.local === local);
  assert.deepEqual([via('file-tree-row.mjs', 'En').from, via('file-tree-row.mjs', 'Pl').name, via('file-tree-row.mjs', 'Il').from],
    ['./app-list-row.mjs', 'fileTreeRowGap', '../code-current/file-tree-style.mjs']);
  assert.deepEqual([via('menu-item-classes.mjs', 'g').kind, via('menu-item-classes.mjs', 'g').name], ['adapter', 'cva']);
  assert.deepEqual([via('git-info-query.mjs', 'V').kind, via('git-info-query.mjs', 'V').name], ['adapter', 'LocalSessions']);
  assert.deepEqual([via('file-tree-start-folder.mjs', 'yi').name, via('file-tree-start-folder.mjs', 'Ta').name, via('file-tree-start-folder.mjs', 'Zr').name, via('file-tree-start-folder.mjs', 'ti').name],
    ['useQuery', 'gitInfoQuery', 'pathWithinRoot', 'joinPath']);
  assert.deepEqual([via('file-selection-escape.mjs', 'p').name, via('file-selection-escape.mjs', 'v').name], ['ownerWindow', 'suppressEscapeRepeat']);
  // The view-tabs graph's cva is the one shared-frame Cx reads (`g`): same chunk, same local.
  const names = JSON.parse(source('src/generated/view-tabs/manifest.json')).publicNames;
  assert.deepEqual([names.cva.file, names.cva.local, names.cva.export], ['vendor-frame-DfPJ1QmD.js', 'In', 'Ea']);
  // Official minified text of the roots.
  const tree = official('cccc2cf0a-B0D--VZp.js');
  for (const text of ['dx=`relative ${En} py-0 focus-visible:outline-hidden focus-visible:shadow-focus`', 'fx=`bg-fill-ghost-selected hover:bg-fill-ghost-selected`',
    'Rx=-1', 't.hasDesktopWorktree===!0', 'select:e=>e?.root', '{absPath:Vx(j),nonce:Rx,start:!0}'])
    assert.ok(tree.includes(text) || tree.includes(text.replace(/`/g, '"')), text);
  assert.ok(official('shared-6-Cby4X-ms.js').includes('vh=`min-h-control app-list-row-min`') || official('shared-6-Cby4X-ms.js').includes('vh="min-h-control app-list-row-min"'));
  assert.match(official('c856385e2-DVsjb2QL.js'), /function nt\(e,t\)\{u\(\(\)=>\{if\(!e\)return;let n=n=>\{if\(n\.key!==`Escape`\|\||function nt\(e,t\)\{u\(\(\)=>\{if\(!e\)return;let n=n=>\{if\(n\.key!=="Escape"\|\|/);
  // Nx binds nt to its tree element: `If(z, H.store)` with If = c856385e2 dt (= nt).
  assert.match(tree, /If\(z,H\.store\)/);
  assert.equal(exportsOf('c856385e2-DVsjb2QL.js').get(importsOf('cccc2cf0a-B0D--VZp.js', 'c856385e2-DVsjb2QL.js').get('If')), 'nt');
});

test('FT-14 row classes: the host composes exactly Nx / NS / AS of cccc2cf0a, over the bindings their aliases name', async () => {
  const M = await ssr('/src/file-tree-row-model.mjs');
  const C = await ssr('/src/generated/files-changes/file-tree-row-classes.mjs');
  const R = await ssr('/src/generated/files-changes/file-tree-row.mjs');
  const L = await ssr('/src/generated/files-changes/app-list-row.mjs');
  const { menuItemClasses } = await ssr('/src/generated/files-changes/menu-item-classes.mjs');
  const { cdsClassNames } = await ssr('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  const tree = official('cccc2cf0a-B0D--VZp.js');
  // The aliases the templates read, resolved through the minified import / export tables.
  const ca = 'ca7840910-DSVFtTw1.js';
  assert.deepEqual(['Rl', 'Nl', 'zl', 'Ul', 'Wl', 'Bl', 'Vl', 'Fl', 'Pl', 'Ll'].map((alias) => resolve(alias, ca)), ['A', 'N', 'j', 'I', 'F', 'L', 'B', 'E', 'M', 'V']);
  assert.deepEqual([resolve('Dn', 'shared-6-Cby4X-ms.js'), resolve('En', 'shared-6-Cby4X-ms.js')], ['vh', '_h']);
  assert.deepEqual([resolve('Er', 'shared-frame-BfjMqbuN.js'), resolve('vr', 'shared-frame-BfjMqbuN.js'), resolve('Zn', 'shared-frame-BfjMqbuN.js')], ['X', 'Cx', 'Jo']);
  assert.equal(resolve('j', 'vendor-frame-DfPJ1QmD.js'), 'ge');
  assert.equal(resolve('Kl', 'c280f9bbb-Dw5U-PIG.js'), 'B');
  // Nx's tree element.
  assert.ok(tree.includes('className:`${Rl} flex-1 min-h-0 overflow-y-auto [contain:strict] ${Nl} outline-none hide-focus-ring`'));
  assert.equal(M.FILE_TREE_CONTAINER_CLASS, `${C.fileTreeGroup} flex-1 min-h-0 overflow-y-auto [contain:strict] ${C.fileTreePadding} outline-none hide-focus-ring`);
  // AS (a subfolder that could not be read).
  assert.ok(tree.includes('className:`flex items-center ${Dn} px-lg text-body text-muted-as-secondary outline-none ${zl}`,style:Ll(t)'));
  assert.equal(M.FILE_TREE_ERROR_ROW_CLASS, `flex items-center ${L.appListRowMin} px-lg text-body text-muted-as-secondary outline-none ${C.fileTreeKeptGuides}`);
  // NS: the row, its guide layer, its button, glyph and name.
  assert.ok(tree.includes('className:Er(vr(),dx,I?Ul:ee?fx:Wl,m!==void 0&&"transition-colors duration-300"),style:Bl(t),children:[t>0&&g("span",{"aria-hidden":"true",className:"pointer-events-none absolute inset-0 bg-(image:--file-tree-kept-guides)'));
  assert.equal(M.fileTreeRowClassName({}), cdsClassNames(menuItemClasses(), R.fileTreeRowBase, C.fileTreeRowIdle, false));
  assert.equal(M.fileTreeRowClassName({ current: true, selected: true }), cdsClassNames(menuItemClasses(), R.fileTreeRowBase, C.fileTreeRowCurrent, false));
  assert.equal(M.fileTreeRowClassName({ selected: true, revealing: true }), cdsClassNames(menuItemClasses(), R.fileTreeRowBase, R.fileTreeRowSelected, 'transition-colors duration-300'));
  const layer = tree.match(/t>0&&g\("span",\{"aria-hidden":"true",className:"([^"]+)",style:Vl\(t\)\}\)/)?.[1];
  assert.equal(M.FILE_TREE_GUIDE_LAYER_CLASS, layer);
  assert.ok(tree.includes('className:px,children:[A?g(Zn,{name:pe,size:Fl(),className:j("shrink-0 self-center",P&&!fe?"text-muted-control":"text-muted-as-secondary",fe&&"transition-transform duration-fast motion-reduce:transition-none",fe&&i&&"rotate-90")}):g(Kl,{fileName:E,size:Fl(),className:j("shrink-0 self-center",P?"text-muted-control":"text-muted-as-secondary")})'));
  assert.equal(M.fileTreeIconClassName({ directory: true, expanded: true }), 'shrink-0 self-center text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none rotate-90');
  assert.equal(M.fileTreeIconClassName({ directory: true }), 'shrink-0 self-center text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none');
  assert.equal(M.fileTreeIconClassName({ openable: true }), 'shrink-0 self-center text-muted-control');
  assert.equal(M.fileTreeIconClassName({ openable: false }), 'shrink-0 self-center text-muted-as-secondary');
  assert.ok(tree.includes('className:j("truncate",P?V?"text-secondary":"text-primary":"text-muted-as-secondary")'));
  assert.equal(M.fileTreeNameClassName(true), 'truncate text-primary');
  assert.equal(M.fileTreeNameClassName(false), 'truncate text-muted-as-secondary');
  assert.equal(M.fileTreeRowPrimary, R.fileTreeRowPrimary);
  // twMerge drops Cx's py-[calc(…)] for dx's py-0, as in the source.
  assert.doesNotMatch(M.fileTreeRowClassName({}), /py-\[calc/);
});

const store = async () => (await ssr('/src/file-tree-selection.mjs')).createFileTreeSelection();
async function renderTree(rows, { selected = [] } = {}) {
  const S = await ssr('/src/source-session.jsx');
  const selection = await store();
  for (const path of selected) selection.getState().toggle({ absPath: path });
  const node = ([entry, level, extra = {}]) => h(S.SourceFileTreeNode, { key: entry.path, entry, cwd: '/repo', activePath: 'src/a.ts', onOpen() {}, level, call: async () => [],
    expandedPaths: new Set(), onExpandedChange() {}, ...extra });
  return renderToStaticMarkup(h(S.SourceFileTree, { selectionStore: selection }, rows.map(node)));
}

test('FT-14 SSR: the tree, an idle folder, the current file, a selected file and an external link carry NS / Nx classes', async () => {
  const M = await ssr('/src/file-tree-row-model.mjs');
  const markup = await renderTree([
    [{ name: 'src', path: 'src', directory: true }, 0],
    [{ name: 'a.ts', path: 'src/a.ts', directory: false }, 1],
    [{ name: 'b.ts', path: 'src/b.ts', directory: false }, 1],
    [{ name: 'l', path: 'src/l', directory: false, link: { target: '../x', state: 'external' } }, 1],
  ], { selected: ['src/b.ts'] });
  const esc = (text) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
  assert.ok(markup.startsWith(`<div role="tree" aria-label="Project files" aria-multiselectable="true" tabindex="0" class="${esc(M.FILE_TREE_CONTAINER_CLASS)}">`));
  const items = [...markup.matchAll(/<div role="treeitem"([^>]*)><div data-tree-row-body="" class="([^"]+)" style="([^"]+)">/g)];
  assert.equal(items.length, 4);
  // The treeitem keeps the ARIA (NS: aria-current is a boolean, aria-selected the selection) and the focus host class.
  assert.match(items[0][1], /aria-level="1" aria-expanded="false" aria-selected="false" tabindex="-1" class="source-tree-item outline-none"/);
  assert.match(items[1][1], /aria-level="2" aria-selected="false" aria-current="true"/);
  assert.match(items[2][1], /aria-level="2" aria-selected="true" tabindex/);
  assert.match(items[3][1], /aria-disabled="true"/);
  assert.equal(items[0][2], esc(M.fileTreeRowClassName({})));
  assert.equal(items[1][2], esc(M.fileTreeRowClassName({ current: true })));
  assert.equal(items[2][2], esc(M.fileTreeRowClassName({ selected: true })));
  // Bl(t) = ca7840910 L: 8px + 10px per level (files-07).
  assert.deepEqual(items.map((item) => item[3]), ['padding-inline-start:8px', 'padding-inline-start:18px', 'padding-inline-start:18px', 'padding-inline-start:18px']);
  // Below the root, the guide layer (class j after the positioning) with Vl(t) = ca7840910 B.
  assert.equal((markup.match(new RegExp(`<span aria-hidden="true" class="${esc(M.FILE_TREE_GUIDE_LAYER_CLASS).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" style="--file-tree-guides:repeating-linear-gradient\\(var\\(--file-tree-guides-to, to right\\), var\\(--cds-border\\) 0 1px, transparent 1px 10px\\);--file-tree-guides-x:14px;background-position:14px 0;background-repeat:no-repeat;background-size:10px 100%"></span>`, 'g')) ?? []).length, 3);
  // The button (px), the glyphs (a folder's CaretRight, a file-type icon, xs) and the names.
  assert.equal((markup.match(/<button type="button" id="[^"]+" class="flex flex-1 min-w-0 items-baseline gap-1 text-start bg-transparent border-0 outline-none hide-focus-ring rounded-\[3px\] before:absolute before:inset-0 before:content-\[&#x27;&#x27;\]" data-tree-primary="" tabindex="-1"/g) ?? []).length, 4);
  // Host: the treeitem (which also wraps its children's group) is named by its row's button, as NS's treeitem is by its content.
  for (const item of markup.matchAll(/<div role="treeitem"[^>]*aria-labelledby="([^"]+)"/g)) assert.match(markup, new RegExp(`<button type="button" id="${item[1]}"`));
  assert.equal((markup.match(/aria-labelledby=/g) ?? []).length, 4);
  assert.match(markup, /data-file-path="src"><span data-cds="Icon" data-cds-mirror="" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)[^"]*" class="shrink-0 self-center text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" aria-hidden="true">/);
  assert.match(markup, /data-file-path="src\/a\.ts"><span data-cds="Icon"[^>]*class="shrink-0 self-center text-muted-control" aria-hidden="true">[^<]*<\/span><span class="truncate text-primary">a\.ts<\/span>/);
  assert.match(markup, /data-link-state="external"><span data-cds="Icon"[^>]*class="shrink-0 self-center text-muted-as-secondary"[^>]*>[^<]*<\/span><span class="truncate text-muted-as-secondary">l<\/span><span data-cds="Icon"[^>]*class="shrink-0 self-center text-muted-as-secondary" data-testid="file-tree-link-mark" role="img" aria-label="Link to \.\.\/x, outside the working directory">/);
  // No hand-written row classes, no menu open (data-pressed / data-popup-open only while the row's menu is open).
  assert.doesNotMatch(markup, /source-tree-(row|name|caret|guides|guided|content|link-mark)|data-pressed|data-popup-open/);
  // An expanded folder's caret turns (rotate-90).
  const open = await renderTree([[{ name: 'src', path: 'src', directory: true }, 0, { expandedPaths: new Set(['src']) }]]);
  assert.match(open, /aria-expanded="true"[\s\S]*class="shrink-0 self-center text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none rotate-90"/);
});

// A row stand-in for the DOM passes: attributes, style custom properties and closest().
function row(level, { selected, current, error = false, parent = null } = {}) {
  const attributes = new Map([['aria-level', String(level)]]);
  if (!error) attributes.set('aria-selected', selected ? 'true' : 'false');
  if (current) attributes.set('aria-current', 'true');
  const style = new Map();
  return {
    attributes, style: { setProperty: (name, value) => style.set(name, value), get: (name) => style.get(name) },
    hasAttribute: (name) => attributes.has(name), getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value), removeAttribute: (name) => attributes.delete(name),
    closest: () => null, parent,
  };
}

test('FT-14 files-08: data-row-index / data-parent-index for every row (the error row too), kept guides by xS / SS', async () => {
  const S = await ssr('/src/source-session.jsx');
  const M = await ssr('/src/file-tree-row-model.mjs');
  const { guideGradient } = await ssr('/src/generated/code-current/file-tree-style.mjs');
  // src/ (open) > lib/ (open) > a.ts (selected), lib/broken/ (open, failed: its AS row), b.ts; README (current, root).
  const rows = [row(1), row(2), row(3, { selected: true }), row(3), row(4, { error: true }), row(2), row(1, { current: true })];
  const tree = { querySelectorAll: () => rows };
  assert.equal(S.indexTreeRows(tree), 7);
  assert.deepEqual(rows.map((item) => [item.getAttribute('data-row-index'), item.getAttribute('data-parent-index')]),
    [['0', null], ['1', '0'], ['2', '1'], ['3', '1'], ['4', '3'], ['5', '0'], ['6', null]]);
  M.applyKeptGuides(rows);
  // xS keeps the guide of the folder holding a selected or current row (lib, depth 1; README's parent is the root, which
  // has none); SS paints it on every row below that folder, the AS error row included. Rows outside say none (the
  // property inherits through the nested DOM otherwise).
  const kept = rows.map((item) => item.style.get('--file-tree-kept-guides'));
  assert.deepEqual(kept, ['none', 'none', guideGradient(1), guideGradient(1), guideGradient(1), 'none', 'none']);
  // The same answers as the original over the flat model DS builds (kind, depth, parentIndex).
  const { keptGuideFolders, keptGuidesOfRow } = await ssr('/src/generated/files-changes/file-tree-row.mjs');
  const model = [[0, -1], [1, 0], [2, 1, true], [2, 1], [3, 3, false, 'error'], [1, 0], [0, -1, true]].map(([depth, parentIndex, keep = false, kind = 'entry']) => ({ kind, depth, parentIndex, entry: { keep } }));
  const folders = keptGuideFolders(model, (entry) => entry.keep);
  assert.deepEqual(model.map((_, index) => keptGuidesOfRow(model, folders, index) ?? 'none'), kept);
  // A selected open folder keeps its own guide for its children (xS: `e[i + 1]?.parentIndex === i ? i : …`).
  const folder = [row(1, { selected: true }), row(2)];
  S.indexTreeRows({ querySelectorAll: () => folder });
  M.applyKeptGuides(folder);
  assert.deepEqual(folder.map((item) => item.style.get('--file-tree-kept-guides')), ['none', guideGradient(0)]);
  // SourceTree runs both after every subtree change (MutationObserver on aria-level / aria-selected / aria-current …).
  const session = source('src/source-session.jsx');
  assert.match(session, /indexTreeRows\(tree\);\n\s*selection\.store\.getState\(\)\.retain\([^\n]*\n[^\n]*\n\s*applyKeptGuides\(treeRows\(tree\)\);/);
});

test('FT-14 CSS: the hand-written tree rules are gone, the official classes are in the loaded CSS, one host focus rule', async () => {
  const css = source('src/source-session.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.source-tree-(content|row|name|caret|guides|guided|error|link-mark)\b/);
  assert.doesNotMatch(css, /\.source-tree-item(?!:focus-visible > \[data-tree-row-body\])/);
  assert.match(css, /\.source-tree-item:focus-visible > \[data-tree-row-body\] \{\n  box-shadow: var\(--cds-focus-shadow\);\n\}/);
  // No other local stylesheet targets the tree's elements (an unlayered rule would beat the @layer utilities classes).
  for (const file of fs.readdirSync(path.join(ROOT, 'src')).filter((name) => name.endsWith('.css'))) {
    const text = source(`src/${file}`).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(text, /\[data-tree-row\]|\[data-tree-primary\]|\[role="?tree"?\]|\[data-tree-row-body\](?![^{]*\{\n  box-shadow)/, file);
  }
  // Every class the rows, the error row, the guide layer and the container use is an official rule (markers excepted).
  const M = await ssr('/src/file-tree-row-model.mjs');
  const loaded = fs.readdirSync(path.join(ROOT, 'public/assets/v1')).filter((name) => name.endsWith('.css')).map((name) => source(`public/assets/v1/${name}`)).join('\n');
  const classes = new Set([M.FILE_TREE_CONTAINER_CLASS, M.FILE_TREE_ERROR_ROW_CLASS, M.FILE_TREE_GUIDE_LAYER_CLASS, M.fileTreeRowClassName({}),
    M.fileTreeRowClassName({ current: true }), M.fileTreeRowClassName({ selected: true, revealing: true }), M.fileTreeRowPrimary,
    M.fileTreeIconClassName({ directory: true, expanded: true }), M.fileTreeIconClassName({ openable: true }), M.fileTreeNameClassName(false)].join(' ').split(/\s+/));
  const escape = (name) => `.${name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`;
  const missing = [...classes].filter((name) => !['app-list-row', 'app-list-row-min'].includes(name) && ![...'{:,. >)['].some((next) => loaded.includes(escape(name) + next)));
  assert.deepEqual(missing, []);
  // `app-list-row` / `app-list-row-min` are markers without rules in the source too.
  assert.equal(loaded.includes('.app-list-row{') || loaded.includes('.app-list-row-min{'), false);
  // The D26 layered reset: the row button's utilities are not beaten by an unlayered button rule.
  assert.match(source('src/style.css'), /@layer base \{\n  button,\n  input,\n  textarea,\n  select \{/);
});

test('FT-14 files-10: zx starts a worktree session at its origin folder inside the worktree (real QueryClient, SSR)', async () => {
  const { worktreeSessionOf, useTreeStartFolder, FilesQueryScope, startRevealNonce } = await ssr('/src/file-tree-start-folder.jsx');
  const { fileBrowserQueryClient } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const { gitInfoQueryKey } = await ssr('/src/generated/files-changes/git-info-key.mjs');
  const { normalizeRevealPath } = await ssr('/src/generated/files-changes/file-tree-start-folder.mjs');
  assert.equal(startRevealNonce, -1);
  assert.deepEqual(worktreeSessionOf('/wt', '/repo/app'), { sessionRef: { type: 'local' }, session: { workingDir: '/wt', hasDesktopWorktree: true, originCwd: '/repo/app' } });
  assert.deepEqual(worktreeSessionOf('/wt', null), { sessionRef: null, session: undefined });
  const start = (cwd, originCwd) => renderToStaticMarkup(h(FilesQueryScope, null, h(function Probe() { return String(useTreeStartFolder({ cwd, originCwd })); })));
  // The repository root of the origin, as the git info query (shared-11 zd, `select: root`) has it cached.
  fileBrowserQueryClient.setQueryData([gitInfoQueryKey, '/repo/packages/app', 'local'], { isRepo: true, root: '/repo', repo: 'o/repo' });
  fileBrowserQueryClient.setQueryData([gitInfoQueryKey, '/repo', 'local'], { isRepo: true, root: '/repo', repo: 'o/repo' });
  fileBrowserQueryClient.setQueryData([gitInfoQueryKey, '/elsewhere/x', 'local'], { isRepo: true, root: '/repo', repo: 'o/repo' });
  assert.equal(start('/wt', '/repo/packages/app'), 'packages/app');
  assert.equal(start('/wt/', '/repo/packages/app'), 'packages/app');
  assert.equal(start('/wt', '/repo'), 'null', 'an origin at the repository root: no start folder');
  assert.equal(start('/wt', '/elsewhere/x'), 'null', 'an origin outside its root');
  assert.equal(start('/wt', '/repo/unknown'), 'null', 'no git info (yet)');
  assert.equal(start('/wt', null), 'null', 'not a worktree session');
  assert.equal(start('/repo/packages/app', '/repo/packages/app'), 'null', 'originCwd === workingDir');
  assert.equal(normalizeRevealPath('/wt/./a/../b//c'), '/wt/b/c');
  // LocalSessions.getGitInfo (shared-11 Rd's local branch) answers from main's "repo-identities" (git-status.cjs).
  const { LocalSessions } = await ssr('/src/source-files-changes-adapters.jsx');
  const saved = globalThis.window;
  try {
    assert.equal(LocalSessions.getGitInfo, undefined, 'no desktop bridge: the query stays disabled');
    const calls = [];
    globalThis.window = { desktop: { call: async (action, params) => { calls.push([action, params]); return { [params.cwds[0]]: params.cwds[0] === '/repo/app' ? { isRepo: true, toplevel: '/repo', owner: 'o', name: 'repo' } : { isRepo: false, toplevel: null } }; } } };
    assert.deepEqual(await LocalSessions.getGitInfo('/repo/app'), { isRepo: true, root: '/repo', repo: 'o/repo' });
    assert.deepEqual(await LocalSessions.getGitInfo('/tmp/x'), { isRepo: false });
    assert.deepEqual(calls, [['repo-identities', { cwds: ['/repo/app'] }], ['repo-identities', { cwds: ['/tmp/x'] }]]);
  } finally { if (saved === undefined) delete globalThis.window; else globalThis.window = saved; }
});

// A hook dispatcher whose effects run at once (no React DOM).
function harness(component) {
  const slots = [];
  let index = 0;
  const hooks = {
    useState: (initial) => { const at = index++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], (value) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef: (initial) => { const at = index++; if (!(at in slots)) slots[at] = { current: initial }; return slots[at]; },
    useEffect: (effect) => { index++; effect(); },
  };
  return (...args) => {
    index = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return component(...args); } finally { internal.H = old; }
  };
}

test('FT-14 files-10: the start reveal expands the start folder and its ancestors, scrolls it to the top, reports it shown, no flash', async () => {
  const { useFileTreeReveal } = await ssr('/src/use-file-tree-reveal.js');
  const reveal = (entry, options) => {
    const expanded = [], scrolls = [];
    let shown = 0;
    const rowRef = { current: { isConnected: true, getClientRects: () => [1], closest: () => null, scrollIntoView: (value) => scrolls.push(value),
      ownerDocument: { defaultView: { requestAnimationFrame: (fn) => { fn(); return 1; }, cancelAnimationFrame() {} } } } };
    const result = harness(useFileTreeReveal)({ entry, treeVisible: true, expand: (value) => expanded.push(value), rowRef, onStartShown: () => { shown += 1; }, ...options });
    return { result, expanded, scrolls, shown };
  };
  const start = { revealPath: 'packages/app/', revealGeneration: -1, revealFollow: false, revealStart: true };
  const target = reveal({ path: 'packages/app', directory: true }, start);
  assert.deepEqual(target.expanded, [true], 'bS: the start folder itself is in the reveal chain');
  assert.deepEqual(target.scrolls, [{ block: 'start' }], 'DS: scrollToIndex(index, "start")');
  assert.equal(target.shown, 1, 'onStartFolderShown');
  assert.deepEqual(target.result, { highlighted: false, target: false }, 'no flash, no transition class');
  const ancestor = reveal({ path: 'packages', directory: true }, start);
  assert.deepEqual([ancestor.expanded, ancestor.scrolls, ancestor.shown], [[true], [], 0]);
  assert.deepEqual(reveal({ path: 'packages/other', directory: true }, start).expanded, []);
  // An explicit "Reveal in file tree" of a folder still centres it and flashes it, and does not expand it.
  const explicit = reveal({ path: 'packages/app', directory: true }, { revealPath: 'packages/app/', revealGeneration: 3, revealFollow: false });
  assert.deepEqual([explicit.expanded, explicit.scrolls, explicit.shown, explicit.result.target], [[], [{ block: 'center' }], 0, true]);
  // The pane: until the start folder was shown or another reveal arrived (Nx `r !== void 0 && !M && P(!0)`), the
  // reveal is the start folder's "dir/", nonce Rx, start; main.jsx passes the session's originCwd to the Files tile.
  const session = source('src/source-session.jsx');
  assert.match(session, /const treeStartFolder = useTreeStartFolder\(\{ cwd, originCwd: worktreeOrigin \}\);/);
  assert.match(session, /if \(treeReveal\.generation > 0 && !startFolderShown\) setStartFolderShown\(true\);/);
  assert.match(session, /\? \{ path: `\$\{treeStartFolder\}\/`, generation: startRevealNonce, follow: false, start: true \} : treeReveal;/);
  assert.match(session, /revealStart=\{shownReveal\.start === true\}\n\s*onStartShown=\{onStartFolderShown\}/);
  assert.match(session, /<FilesQueryScope><CurrentSessionIdContext\.Provider/);
  assert.match(source('src/main.jsx'), /worktreeOrigin=\{tileId === "files" && current \? sessionMetadata\[current\]\?\.originCwd \?\? null : null\}/);
});
