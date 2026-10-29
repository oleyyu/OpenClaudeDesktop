// Work item sidebar-sections-extract (research/sidebar-sections.md WI-1): the Code sidebar sections model,
// copy, label row, section view menu, header menu, disabled reasons and new-section dialog, extracted verbatim by
// scripts/extract-sidebar-sections.mjs into src/generated/sidebar-sections (and the pure model into
// electron/generated). Nothing here opens a window: the generator contract, every binding against an independent parse
// of the original chunk, the pure model and store actions, SSR markup, and handlers taken from a controlled render.
// w3-sidebar-sections-gen (3.6556.2; research/sidebar.md §3.2 rename table): the tree is read from the 3.6556.2
// snapshot, its expectations are the 3.6556.2 originals (official copy, pure model and markup changes noted inline).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import { extractSidebarSections } from '../scripts/extract-sidebar-sections.mjs';
import * as Model from '../electron/generated/sidebar-sections-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { viewTabsManifestFor } from '../scripts/view-tabs-compat.mjs';
import * as official from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/sidebar-sections');
const reference = official.ionSource;
const sha = text => createHash('sha256').update(text).digest('hex');
const read = file => fs.readFile(file, 'utf8');

// D21: view-tabs' preload-helper (reached through shared-frame) calls document.createElement while it evaluates, and
// sidebar-resize's shared-52 Rm reads documentElement[data-artifact-composed].
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  for (const name of ['sections-model', 'group-copy', 'group-label', 'group-reasons', 'group-mode', 'section-visibility', 'section-filter-controls',
    'section-view-menu', 'group-menu', 'group-dialog', 'move-to-menu', 'group-reorder', 'group-organize', 'group-archive', 'menu-triggers'])
    M[name] = await server.ssrLoadModule(`/src/generated/sidebar-sections/${name}.mjs`);
  M.adapters = await server.ssrLoadModule('/src/source-sidebar-sections-adapters.jsx');
  // R4g-sidebar SB1 (X7-04): the folded section status badge and its host answers.
  M.badge = await server.ssrLoadModule('/src/generated/sidebar-sections/section-badge.mjs');
  M.statusDot = await server.ssrLoadModule('/src/generated/sidebar-sections/status-dot.mjs');
  M.badgeAdapters = await server.ssrLoadModule('/src/source-sidebar-section-badge-adapters.jsx');
  M.statusGlyph = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
  M.viewTabs = await server.ssrLoadModule(`/src/generated/view-tabs/${official.sharedFrame}`);
  M.viewTabsVendor = await server.ssrLoadModule(`/src/generated/view-tabs/${official.vendorFrame}`);
  M.filterView = await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-view.mjs');
  M.groupView = await server.ssrLoadModule('/src/generated/code-current/sidebar-group-view.mjs');
  M.filterControls = await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-controls.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

// ---------------------------------------------------------------- independent parse of the original chunks
const parsed = new Map();
async function original(file) {
  if (!parsed.has(file)) {
    const bytes = await fs.readFile(path.join(reference, file));
    const code = await format(bytes.toString(), { parser: 'babel' });
    parsed.set(file, { bytes, code, ast: parsers.babel.parse(code, {}) });
  }
  return parsed.get(file);
}
async function parseModule(file) {
  const code = await read(file);
  return { code, ast: parsers.babel.parse(code, {}) };
}
function topLevel(ast, name) {
  for (const node of ast.program.body) {
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id?.name === name) return node;
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id?.name === name) return d;
  }
  return null;
}
// AST without positions/comments/formatting, identifiers kept: the sliced binding must be the same program text.
function strip(node) {
  if (Array.isArray(node)) return node.map(strip);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'loc', 'range', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
    out[key] = strip(value);
  }
  return out;
}
const objectProperty = (object, name) => object.properties.filter(p => p.key?.type === 'Identifier' && p.key.name === name);

// ---------------------------------------------------------------- generator contract
test('generator --check passes; manifest pins 3.6556.2 sources, output files and every binding', async () => {
  const manifest = await extractSidebarSections({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, official.referenceSnapshot);
  // E34 is over (w10-cleanup-sidebar-legacy): sidebar-reorder reads this manifest as 3.6556.2, so there is no
  // legacy['2.42304.0'] view, no frozen JSON, and the compat helper serves 3.6556.2 only.
  assert.equal(Object.hasOwn(manifest, 'legacy'), false);
  assert.equal(await fs.access(path.join(app, 'scripts/sidebar-sections-legacy-2.42304.0.json')).then(() => true, () => false), false);
  const { sidebarSectionsManifestFor } = await import('../scripts/sidebar-sections-compat.mjs');
  assert.equal((await sidebarSectionsManifestFor('3.6556.2')).referenceVersion, '3.6556.2');
  await assert.rejects(sidebarSectionsManifestFor('2.42304.0'), /sidebar-sections is 3\.6556\.2, expected 2\.42304\.0/);
  assert.equal(manifest.generator, 'scripts/extract-sidebar-sections.mjs');
  const onDisk = JSON.parse(await read(path.join(generated, 'manifest.json')));
  assert.deepEqual(onDisk, manifest);
  const files = (await fs.readdir(generated)).filter(n => n !== 'manifest.json').sort();
  assert.deepEqual(files, manifest.modules.map(m => m.target).filter(t => !t.startsWith('../')).sort());
  for (const module of manifest.modules) {
    const source = await original(module.source);
    assert.equal(module.referenceVersion, '3.6556.2', module.target);
    assert.equal(module.sourceSha256, sha(source.bytes), `${module.target} source sha`);
    assert.equal(module.sha256, sha(await read(path.resolve(generated, module.target))), `${module.target} output sha`);
    // A module with no binding of its own re-exports one original binding held elsewhere (view-tabs / app-switch).
    assert.ok(module.bindings.length + (module.sourceSelections?.length ?? 0) + module.imports.length > 0, module.target);
    for (const binding of module.bindings) {
      const node = topLevel(source.ast, binding.name);
      assert.ok(node, `${module.source}:${binding.name} is a top-level declaration`);
      assert.equal(binding.sha256, sha(source.code.slice(node.start, node.end)), `${module.target}:${binding.name} sha`);
    }
  }
  // The work item's bindings are all extracted (shared-46 YO / hk / vk are code-current's sidebar-group-view, see below).
  // 3.6556.2 names (research/sidebar.md §3.2): shared-19's sections pieces moved to shared-46.
  const all = new Map();
  for (const m of manifest.modules) if (!m.target.startsWith('../')) for (const b of m.bindings) all.set(`${m.source}:${b.name}`, m.target);
  const wanted = {
    'shared-52-uHFNjl7C.js': 'im K am om sm cm lm um dm fm pm mm hm gm _m vm ym bm xm Sm Cm wm Tm Em Dm Om km Am jm Mm Nm Pm Fm Im Lm Rm Bm Vm Hm Um Wm Gm Km ug dg fg pg mg hg gg _g vg Tg Eg Dg Og kg Ag Ng',
    'shared-18-D3y8YMFN.js': 'lk uk dk fk pk aA oA cA lA',
    'shared-22-Bwn3sJTG.js': 'Gk Kk tA Qk Xk KA GA',
    'shared-46-BIbZBGFq.js': 'OO kO AO jO NO dk fk pk aM oM iM',
    'shared-20-mUr7IqZY.js': 'Px zx Vx Tx Hx Ux Wx',
  };
  for (const [file, names] of Object.entries(wanted)) for (const name of names.split(' ')) assert.ok(all.has(`${file}:${name}`), `${file}:${name} extracted`);
  // shared-18 ck (the group copy, old vE) is code-current's sidebar-group-copy.mjs, re-exported here (one copy).
  const groupCopy = manifest.modules.find(m => m.target === 'group-copy.mjs').imports.find(i => i.original === 'shared-18-D3y8YMFN.js:ck');
  assert.deepEqual([groupCopy.kind, groupCopy.from, groupCopy.name], ['external', '../code-current/sidebar-group-copy.mjs', 'sidebarGroupMessages']);
});

test('each generated declaration is the original AST, and nothing else is declared', async () => {
  const manifest = JSON.parse(await read(path.join(generated, 'manifest.json')));
  for (const module of manifest.modules) {
    const source = await original(module.source);
    const output = await parseModule(path.resolve(generated, module.target));
    const declared = output.ast.program.body.flatMap(n => n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name)
      : n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' ? [n.id.name] : []);
    const selections = (module.sourceSelections ?? []).map(s => s.binding);
    assert.deepEqual(declared.sort(), [...module.bindings.map(b => b.name), ...selections].sort(), `${module.target} declarations`);
    for (const binding of module.bindings)
      assert.deepEqual(strip(topLevel(output.ast, binding.name)), strip(topLevel(source.ast, binding.name)), `${module.target}:${binding.name} AST`);
    for (const selection of module.sourceSelections ?? []) {
      // The store actions are the creator's own object properties, in a factory over the creator's (set, get).
      const factory = topLevel(output.ast, selection.binding);
      assert.deepEqual(factory.params.map(p => p.name), selection.parameters);
      const returned = factory.body.body.at(-1).argument;
      const creators = [];
      const walk = node => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ArrowFunctionExpression' && node.body?.type === 'ObjectExpression' && objectProperty(node.body, selection.anchor).length) creators.push(node);
        for (const value of Object.values(node)) if (value && typeof value === 'object') Array.isArray(value) ? value.forEach(walk) : walk(value);
      };
      walk(source.ast.program);
      assert.equal(creators.length, 1, 'one store creator owns the anchor');
      assert.deepEqual(creators[0].params.map(p => p.name), selection.parameters);
      assert.deepEqual(returned.properties.map(p => p.key.name), selection.properties.map(p => p.name));
      for (const [i, property] of returned.properties.entries()) {
        const [theirs] = objectProperty(creators[0].body, property.key.name);
        assert.deepEqual(strip(property), strip(theirs), `${selection.binding}.${property.key.name}`);
        assert.equal(selection.properties[i].sha256, sha(source.code.slice(theirs.start, theirs.end)));
      }
    }
    // Imports are exactly the manifest's.
    const imports = output.ast.program.body.filter(n => n.type === 'ImportDeclaration')
      .flatMap(n => n.specifiers.map(s => `${s.local.name}=${n.source.value}#${s.imported.name ?? s.imported.value}`)).sort();
    assert.deepEqual(imports, module.imports.map(i => `${i.local}=${i.from}#${i.name}`).sort(), `${module.target} imports`);
  }
});

test('dependencies resolve only to React, this tree, the adapter, or the same original binding elsewhere (view-tabs by public name)', async () => {
  const manifest = JSON.parse(await read(path.join(generated, 'manifest.json')));
  // 3.6556.2 (w3-sidebar-sections-gen): this tree's view-tabs imports are the 3.6556.2 graph's own files and names (the
  // React Compiler helpers too, E3); no legacy shim is imported.
  const viewTabs = await viewTabsManifestFor('3.6556.2'), current = viewTabs;
  const adapterText = await read(path.join(app, 'src/source-sidebar-sections-adapters.jsx'));
  for (const module of manifest.modules) for (const entry of module.imports) {
    const label = `${module.target}:${entry.local}`;
    assert.ok(['react', 'generated', 'adapter', 'external'].includes(entry.kind), label);
    if (entry.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react-dom'].includes(entry.from), label);
    if (entry.kind === 'generated') assert.ok(!entry.from.includes('..') || module.target.startsWith('../'), label);
    if (entry.kind === 'adapter') {
      // R4g-sidebar SB1: the folded section badge's host answers live in their own adapter module.
      const badgeAdapter = entry.from === '../../source-sidebar-section-badge-adapters.jsx';
      assert.ok(badgeAdapter || entry.from === '../../source-sidebar-sections-adapters.jsx', label);
      if (badgeAdapter) assert.ok(['status-dot.mjs', 'section-badge.mjs'].includes(module.target), label);
      const value = (badgeAdapter ? M.badgeAdapters : M.adapters)[entry.name];
      // R4g-sidebar SB3 (X7-06): the context menu name is view-tabs CdsContextMenu itself (shared-frame iD).
      if (entry.name === 'SidebarContextMenu') assert.equal(value, M.viewTabs.CdsContextMenu, `adapter ${entry.name} is CdsContextMenu`);
      else if (entry.name === 'SidebarSectionsMenu') assert.ok(['Submenu', 'SubmenuTrigger', 'Popup', 'Item', 'Group', 'Separator'].every(part => typeof value[part] === 'function' || value[part]?.$$typeof !== undefined), `adapter ${entry.name} parts`);
      else assert.ok(typeof value === 'function' || value?.$$typeof !== undefined, `adapter ${entry.name}`);
    }
    if (entry.kind === 'external') {
      const [file, local] = entry.original.split(':');
      if (entry.from.startsWith('../view-tabs/')) {
        const pub = viewTabs.publicNames[entry.name];
        assert.ok(pub, `${label}: view-tabs ${entry.name} is a public name`);
        assert.deepEqual([pub.file, pub.local], [file, local], label);
        assert.equal(entry.from, `../view-tabs/${pub.file}`, label);
      } else assert.match(entry.from, /^\.\.\/(code-current|sidebar-resize|app-switch)\//, label);
    }
  }
  // No minified view-tabs name anywhere in this tree or its adapter.
  const publicNames = new Set([...Object.keys(viewTabs.publicNames), ...Object.keys(current.publicNames)]);
  for (const file of [...(await fs.readdir(generated)).filter(n => n.endsWith('.mjs')).map(n => path.join(generated, n)), path.join(app, 'src/source-sidebar-sections-adapters.jsx')]) {
    const text = await read(file);
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']*view-tabs\/[^"']+)["']/g))
      for (const spec of m[1].split(',').map(s => s.trim()).filter(Boolean)) assert.ok(publicNames.has(spec.split(/\s+as\s+/)[0]), `${path.basename(file)} imports view-tabs ${spec}`);
  }
  assert.doesNotMatch(adapterText, /createContext\((?:null|void 0|!1)?\)\s*;?\s*\/\/\s*copy/);
  // The contexts this tree reads from elsewhere are the very instances code-current / view-tabs hold.
  const label = manifest.modules.find(m => m.target === 'group-organize.mjs').imports.find(i => i.original === 'shared-46-BIbZBGFq.js:YO');
  assert.deepEqual([label.from, label.name], ['../code-current/sidebar-group-view.mjs', 'SidebarListContext']);
  // R3-sections (WI-4): Collapse all / Expand all (shared-46 vk, old uZ) and sidebarHasCollapsedGroups (hk, old sZ) are
  // code-current's one copy.
  const viewItems = manifest.modules.find(m => m.target === 'group-menu.mjs').imports.find(i => i.original === 'shared-46-BIbZBGFq.js:vk');
  assert.deepEqual([viewItems.kind, viewItems.from, viewItems.name], ['external', '../code-current/sidebar-group-view.mjs', 'SidebarGroupViewItems']);
  const folded = manifest.modules.find(m => m.target === 'blank-area-menu.mjs').imports.find(i => i.original === 'shared-46-BIbZBGFq.js:hk');
  assert.deepEqual([folded.kind, folded.from, folded.name], ['external', '../code-current/sidebar-group-view.mjs', 'sidebarHasCollapsedGroups']);
  // R3-sections step 3 (WI-5): View all's context (_J, old KH) and the rest of the session-list filter controls are one
  // copy, this tree's: code-current's sidebar-filter-controls.mjs only re-exports it (no binding of its own). 3.6556.2
  // names: hU nY, aU NJ, CB OG, sU UJ, cU WJ, lU KJ, uU qJ, dU JJ; SB-26: gU (useSidebarRegroupFocus) is deleted.
  const controls = manifest.modules.find(m => m.target === 'section-filter-controls.mjs');
  assert.ok(['_J', 'nY', 'NJ', 'OG', 'UJ', 'WJ', 'KJ', 'qJ', 'JJ'].every(name => controls.bindings.some(b => b.name === name)), 'filter controls');
  assert.ok(!Object.values(controls.exports).includes('useSidebarRegroupFocus'), 'SB-26: gU is gone');
  assert.ok(!controls.imports.some(i => i.from.includes('code-current/sidebar-filter-controls')), 'no import back from code-current');
  const codeCurrent = JSON.parse(await read(path.join(app, 'src/generated/code-current/manifest.json'))).modules.find(m => m.target === 'sidebar-filter-controls.mjs');
  assert.deepEqual([codeCurrent.referenceVersion, path.basename(codeCurrent.source), codeCurrent.bindings], ['3.6556.2', 'shared-21-R7LldJ05.js', []]);
  assert.match(await read(path.join(app, 'src/generated/code-current/sidebar-filter-controls.mjs')), /\} from "\.\.\/sidebar-sections\/section-filter-controls\.mjs";/);
  // R3-sections step 3 (D24): the CDS parts are view-tabs' (one Base UI instance with CdsMenuCreateHandle); since 3.6556.2
  // the header / blank-area context menu is view-tabs CdsContextMenu directly (shared-frame kA); move-to-menu's dropdown
  // is still the host adapter (the host row menu is SourceMenu). The menu handle moved with shared-16 xl to lazy-menu.mjs.
  const cds = new Map();
  for (const module of manifest.modules) for (const entry of module.imports) if (entry.original) cds.set(`${module.target}:${entry.original}`, [entry.kind, entry.name]);
  for (const [key, expected] of [
    ['section-view-menu.mjs:shared-frame-6jtSkIit.js:Xm', ['external', 'CdsTooltip']], ['section-view-menu.mjs:shared-frame-6jtSkIit.js:GT', ['external', 'CdsDropdown']],
    ['section-filter-controls.mjs:shared-frame-6jtSkIit.js:GT', ['external', 'CdsDropdown']], ['section-filter-controls.mjs:shared-frame-6jtSkIit.js:Xm', ['external', 'CdsTooltip']],
    ['section-filter-controls.mjs:vendor-frame-CnSY1sxv.js:ve', ['external', 'clsx']], ['lazy-menu.mjs:vendor-frame-CnSY1sxv.js:Sm', ['external', 'CdsMenuCreateHandle']],
    ['group-dialog.mjs:shared-frame-6jtSkIit.js:nb', ['external', 'CdsDialog']], ['group-dialog.mjs:shared-frame-6jtSkIit.js:uC', ['external', 'CdsTextInput']],
    ['group-dialog.mjs:shared-frame-6jtSkIit.js:lo', ['external', 'CdsRoot']], ['group-menu.mjs:shared-frame-6jtSkIit.js:lo', ['external', 'CdsRoot']],
    ['group-menu.mjs:shared-frame-6jtSkIit.js:kA', ['external', 'CdsContextMenu']], ['blank-area-menu.mjs:shared-frame-6jtSkIit.js:kA', ['external', 'CdsContextMenu']],
    ['move-to-menu.mjs:shared-frame-6jtSkIit.js:GT', ['adapter', 'SidebarSectionsMenu']],
  ]) assert.deepEqual(cds.get(key), expected, key);
  for (const gone of ['SidebarSectionsTooltip', 'createSidebarMenuHandle', 'SidebarSectionsDialog', 'SidebarSectionsInput', 'SidebarCdsScope']) {
    assert.equal(M.adapters[gone], undefined, `adapter ${gone} is gone`);
    assert.doesNotMatch(adapterText, new RegExp(`export (?:const|function) ${gone}\\b`), gone);
  }
});

test('the main process copy is the same pure model, self-contained', async () => {
  const manifest = JSON.parse(await read(path.join(generated, 'manifest.json')));
  const renderer = manifest.modules.find(m => m.target === 'sections-model.mjs');
  const electron = manifest.modules.find(m => m.target === '../../../electron/generated/sidebar-sections-model.mjs');
  assert.deepEqual(electron.bindings, renderer.bindings);
  assert.deepEqual(electron.sourceSelections, renderer.sourceSelections);
  const strip = text => text.replace(/^import .*$/m, '');
  assert.equal(strip(await read(path.join(app, 'electron/generated/sidebar-sections-model.mjs'))), strip(await read(path.join(generated, 'sections-model.mjs'))));
  for (const m of manifest.modules.filter(m => m.target.startsWith('../'))) for (const i of m.imports) assert.equal(i.kind, 'generated', `${m.target}:${i.local}`);
  assert.match(await read(path.join(app, 'electron/generated/sidebar-sections-model.mjs')), /from "\.\/sidebar-sections-error-text\.mjs"/);
});

// ---------------------------------------------------------------- pure model (main-process copy; same text as the renderer's)
const section = (id, kind, extra = {}) => ({ ...Model.createSection(kind === 'manual' ? 'sessions' : kind, 0), id, kind, ...(kind === 'manual' ? { name: id, members: [] } : {}), ...extra });
const list = () => Model.dedupeSections([Model.defaultSection('pinned'), Model.defaultSection('routines'), section('A', 'manual'), section('B', 'manual'), Model.defaultSection('sessions')]);

test('Em (old Sp) normalizes stored sections: unknown kinds dropped, v 2, members unique across sections, Sessions last', () => {
  const out = Model.normalizeSections([
    { id: 'sessions', kind: 'sessions', order: 0, groupBy: 'status', sortBy: 'alpha', ascending: true, show: { metadata: true, emptyGroups: true } },
    { id: 'x', kind: 'bogus' }, 'junk',
    { id: 'g1', kind: 'manual', name: 'A', order: 1, members: ['code:1', 'code:2', 'code:1'], v: 2, show: { metadata: true } },
    { id: 'g2', kind: 'manual', name: 'B', order: 2, members: ['code:2', 'code:3', 7] },
    { id: 'pinned', kind: 'pinned', order: 3 },
    { id: 'g1', kind: 'manual', name: 'duplicate', order: 4 },
  ]);
  assert.deepEqual(out.map(s => [s.id, s.order, s.v]), [['g1', 0, 2], ['g2', 1, 2], ['pinned', 2, 2], ['sessions', 3, 2]]);
  assert.deepEqual(out.map(s => s.members), [['code:1', 'code:2'], ['code:3'], undefined, undefined]);
  // metadata is only taken from a v>=2 record (Rm migrates older ones); emptyGroups always. 3.6556.2 (SB-10): every view
  // carries show.sideChats (dm: `show: { metadata: !1, emptyGroups: !1, sideChats: !1 }`).
  assert.equal(out[0].show.metadata, true);
  assert.deepEqual(out[3].show, { metadata: false, emptyGroups: true, sideChats: false });
  assert.deepEqual(Model.sectionViewDefaults.show, { metadata: false, emptyGroups: false, sideChats: false });
  assert.deepEqual([out[3].groupBy, out[3].sortBy, out[3].ascending], ['status', 'alpha', true]);
  assert.equal(Model.normalizeSections('nope'), null);
  assert.equal(Model.normalizeSections([]).at(-1).kind, 'sessions');
  assert.deepEqual(Model.sectionKinds, ['pinned', 'routines', 'manual', 'sessions']);
  assert.equal(Model.sectionSchemaVersion, 2);
});

test('Nm (old kp) merges custom groups into manual sections before Sessions; the first migration maps the legacy group-by', () => {
  const groups = { groups: [{ id: 'cg-a', name: 'Alpha' }, { id: 'cg-b', name: 'Beta' }], assignments: { 'code:1': 'cg-a', 'code:2': 'cg-b', 'code:3': 'cg-a' }, order: { 'cg-a': ['code:3', 'code:1'] } };
  const first = Model.reconcileSections(undefined, { groups, codeGroupBy: 'custom', codeSortBy: 'alpha', manualOrder: ['cg-b', 'cg-a'] });
  assert.deepEqual(first.map(s => s.id), ['pinned', 'routines', 'cg-b', 'cg-a', 'sessions']);
  assert.deepEqual(first.map(s => s.order), [0, 1, 2, 3, 4]);
  assert.deepEqual(first.find(s => s.id === 'cg-a').members, ['code:3', 'code:1']);
  assert.deepEqual([first.at(-1).groupBy, first.at(-1).sortBy], ['none', 'alpha']);
  // 3.6556.2 (SB-03): the section group-bys are ym = ["none", "folder", "savedEnvironment", "status", "date"]; _m maps
  // the legacy Code group-by to them (project → folder, coder → savedEnvironment), vm back, and wm normalizes a stored
  // view's group-by (the 2.42304.0 "environment" is the folder grouping).
  const legacy = { custom: 'none', none: 'none', project: 'folder', coder: 'savedEnvironment', state: 'status', date: 'date', other: 'date' };
  for (const [from, to] of Object.entries(legacy)) assert.equal(Model.sessionsGroupByFromLegacy(from), to, from);
  assert.equal(Model.sessionsGroupByFromLegacy(undefined), undefined);
  assert.deepEqual(Model.sectionGroupBys, ['none', 'folder', 'savedEnvironment', 'status', 'date']);
  assert.deepEqual(['none', 'folder', 'savedEnvironment', 'status', 'date'].map(Model.legacyGroupByFromSessions), ['none', 'project', 'environment', 'state', 'date']);
  assert.deepEqual(['environment', 'folder', 'savedEnvironment', 'date', 'none', 'project', 'bogus'].map(Model.normalizeSectionGroupBy),
    ['folder', 'folder', 'savedEnvironment', 'date', 'none', undefined, undefined]);
  // Later passes keep the list: renames sync, removed groups drop, new groups go before Sessions, no group-by mapping.
  const next = Model.reconcileSections(first, { groups: { ...groups, groups: [{ id: 'cg-a', name: 'Alfa' }, { id: 'cg-c', name: 'Gamma' }] }, codeGroupBy: 'project' });
  assert.deepEqual(next.map(s => [s.id, s.name]), [['pinned', ''], ['routines', ''], ['cg-a', 'Alfa'], ['cg-c', 'Gamma'], ['sessions', '']]);
  assert.equal(next.at(-1).groupBy, 'none');
});

test('Gm (old zp) moves a section, never Sessions, clamped before it; Um resets ascending across alpha; Wm copies the Sessions view', () => {
  const sections = list();
  assert.equal(Model.moveSection(sections, 'sessions', 0), sections);
  assert.equal(Model.moveSection(sections, 'missing', 0), sections);
  assert.equal(Model.moveSection(sections, 'A', 2), sections);
  assert.deepEqual(Model.moveSection(sections, 'A', 99).map(s => s.id), ['pinned', 'routines', 'B', 'A', 'sessions']);
  const moved = Model.moveSection(sections, 'B', -3);
  assert.deepEqual(moved.map(s => [s.id, s.order]), [['B', 0], ['pinned', 1], ['routines', 2], ['A', 3], ['sessions', 4]]);

  const ascending = Model.setSectionView(sections, 'A', { ascending: true });
  assert.equal(Model.setSectionView(ascending, 'A', { sortBy: 'alpha' }).find(s => s.id === 'A').ascending, false);
  assert.equal(Model.setSectionView(ascending, 'A', { sortBy: 'created' }).find(s => s.id === 'A').ascending, true);
  assert.equal(Model.setSectionView(ascending, 'A', { sortBy: 'alpha', ascending: true }).find(s => s.id === 'A').ascending, true);
  assert.equal(Model.setSectionView(sections, 'A', { sortBy: 'recency' }), sections, 'an unchanged view keeps the list');
  assert.equal(Model.setSectionView(sections, 'A', { groupBy: null, show: { metadata: true } }).find(s => s.id === 'A').show.metadata, true);

  // Wm copies everything but a folder / saved-environment grouping (`r === "folder" || r === "savedEnvironment"`).
  let view = Model.setSectionView(sections, 'sessions', { groupBy: 'folder', sortBy: 'alpha', ascending: true, show: { metadata: true } });
  const inherited = Model.inheritSessionsView(view, 'A').find(s => s.id === 'A');
  assert.deepEqual([inherited.groupBy, inherited.sortBy, inherited.ascending, inherited.show.metadata], [undefined, 'alpha', true, true]);
  view = Model.setSectionView(view, 'sessions', { groupBy: 'savedEnvironment' });
  assert.equal(Model.inheritSessionsView(view, 'A').find(s => s.id === 'A').groupBy, undefined);
  view = Model.setSectionView(view, 'sessions', { groupBy: 'date' });
  assert.equal(Model.inheritSessionsView(view, 'A').find(s => s.id === 'A').groupBy, 'date');
  const error = (() => { try { Model.inheritSessionsView(sections.filter(s => s.kind !== 'sessions'), 'A'); } catch (e) { return e; } })();
  assert.equal(error.message, 'The section list has no Sessions section');
  assert.deepEqual(error[Symbol.for('ant.o11y.errorText')], { text: 'The section list has no Sessions section', kind: 'literal' });
});

test('Km (old Bp) seeds legacy preferences; Bm recognizes the defaults; custom group keys', () => {
  const seeded = Model.seedSectionPrefs(list(), { ascending: true, emptyGroups: true, sessionsCollapsed: true, routinesCollapsed: false, pinnedCollapsed: true,
    isManualCollapsed: id => id === 'B', manualOrder: ['B', 'A'] });
  assert.deepEqual(seeded.map(s => s.id), ['pinned', 'routines', 'B', 'A', 'sessions']);
  assert.deepEqual(seeded.map(s => s.collapsed), [true, false, true, false, true]);
  assert.deepEqual([seeded.at(-1).ascending, seeded.at(-1).show.emptyGroups], [true, true]);
  assert.equal(Model.sectionsAtDefaults(Model.defaultSections), true);
  assert.equal(Model.sectionsAtDefaults(undefined), true);
  assert.equal(Model.sectionsAtDefaults(list()), false);
  assert.equal(Model.sectionsAtDefaults(Model.setSectionView([...Model.defaultSections], 'sessions', { show: { metadata: true } })), false);
  assert.equal(Model.customGroupKey('cg-1'), 'custom-cg-1');
  assert.equal(Model.customGroupKey(null), 'custom-ungrouped');
  assert.deepEqual([Model.effectiveGroupBy(undefined, 'code', true), Model.effectiveGroupBy(undefined, 'code', false), Model.effectiveGroupBy('date', 'code', true)], ['project', 'none', 'date']);
});

test('the original store actions run on the host store: add / rename / move / view / assign / collapse / delete', () => {
  const store = M.adapters.useSidebarSectionsStore;
  const scope = M.adapters.SIDEBAR_SECTIONS_SCOPE;
  const sections = () => store.getState().codeSidebarByScope[scope]?.sections ?? Model.defaultSections;
  assert.equal(scope, 'local');
  store.getState().setSectionView('sessions', { groupBy: 'status', sortBy: 'alpha', show: { metadata: true } });
  const alpha = store.getState().addCustomGroup('Alpha');
  assert.match(alpha.id, /^cg-[0-9a-f-]{36}$/);
  assert.equal(store.getState().addCustomGroup('Alpha').id, alpha.id, 'same name reuses the group');
  assert.deepEqual(store.getState().groupsKeptWhileEmpty, [alpha.id]);
  const beta = store.getState().addSection('Beta');
  assert.equal(beta.kind, 'manual');
  assert.deepEqual(sections().map(s => s.name || s.id), ['pinned', 'routines', 'Alpha', 'Beta', 'sessions']);
  assert.deepEqual([beta.groupBy, beta.sortBy, beta.show.metadata], ['status', 'alpha', true], 'a new section takes the Sessions view (Rp)');
  assert.equal(store.getState().renameSection('sessions', 'x'), false);
  assert.equal(store.getState().renameSection(alpha.id, 'Alfa'), true);
  assert.equal(store.getState().customGroupsByScope[scope].groups.find(g => g.id === alpha.id).name, 'Alfa');
  assert.equal(sections().find(s => s.id === alpha.id).name, 'Alfa');
  store.getState().moveSection(beta.id, 0);
  store.getState().moveSection('sessions', 0);
  assert.deepEqual(sections().map(s => s.name || s.id), ['Beta', 'pinned', 'routines', 'Alfa', 'sessions']);
  assert.equal(store.getState().assignToSection(['code:1', 'code:2'], alpha.id), true);
  assert.equal(store.getState().assignToSection(['code:1'], 'sessions'), false);
  assert.deepEqual(sections().find(s => s.id === alpha.id).members, ['code:1', 'code:2']);
  M['section-view-menu'].toggleSectionCollapsed(sections().find(s => s.id === alpha.id));
  assert.equal(sections().find(s => s.id === alpha.id).collapsed, true);
  store.getState().toggleGroupCollapsed(Model.customGroupKey(alpha.id));
  store.getState().expandGroup(Model.customGroupKey(alpha.id));
  assert.equal(sections().find(s => s.id === alpha.id).collapsed, false, 'expandGroup on custom-<id> opens the section');
  assert.deepEqual(store.getState().collapsedGroups, []);
  store.getState().toggleGroupCollapsed(Model.customGroupKey(alpha.id));
  assert.equal(store.getState().deleteSection('pinned'), false);
  assert.equal(store.getState().deleteSection(alpha.id), true);
  assert.deepEqual(store.getState().collapsedGroups, []);
  assert.deepEqual(Object.keys(store.getState().customGroupsByScope[scope].assignments), []);
  assert.deepEqual(sections().map(s => s.name || s.id), ['Beta', 'pinned', 'routines', 'sessions']);
  store.getState().setOverflowMenuOpen(true);
  assert.equal(store.getState().overflowMenuOpen, true);
  store.getState().setOverflowMenuOpen(false);
});

test('KA (old KO) shows manual sections that have members or are kept while empty; NO / OO disabled reasons; wf', () => {
  const { visibleCustomGroups } = M['section-visibility'];
  const base = { kind: 'code', groups: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], assignments: { 'code:1': 'a', 'code:9': 'b' }, keptWhileEmpty: ['c', 'gone'],
    sessions: [{ ref: { kind: 'code', id: '1' }, source: { kind: 'code', data: {} } }, { ref: { kind: 'code', id: '5' }, source: { kind: 'code', data: {} } }],
    held: false, heldPinnedKeys: new Set(), rememberedRows: () => 0, withUngrouped: false, pinnedKeys: new Set() };
  assert.deepEqual([...visibleCustomGroups(base)].sort(), ['a', 'c']);
  assert.deepEqual([...visibleCustomGroups({ ...base, held: true, rememberedRows: id => (id === 'b' ? 1 : 0) })].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...visibleCustomGroups({ ...base, withUngrouped: true })].sort((x, y) => String(x).localeCompare(String(y))), ['a', 'c', null]);
  assert.deepEqual([...visibleCustomGroups({ ...base, withUngrouped: true, pinnedKeys: new Set(['code:5']) })].sort(), ['a', 'c']);

  const { groupMenuKind, groupDisabledReasons, groupReasonMessages: QX, newSessionReasonMessages: $X } = M['group-reasons'];
  assert.equal(groupMenuKind({ customGroupId: 'x' }), 'hand-made');
  assert.equal(groupMenuKind({ environment: {} }), 'preset');
  assert.equal(groupMenuKind({}), 'worked-out');
  assert.deepEqual(groupDisabledReasons('hand-made', true), { newSession: undefined });
  assert.deepEqual(groupDisabledReasons('hand-made', false), { newSession: $X['place-unknown'] });
  assert.deepEqual(groupDisabledReasons('preset', false, 'hosts-loading'), { newSession: undefined, rename: QX.environmentRename, deleteGroup: QX.environmentDelete, reorder: QX.fixedAtEnd });
  assert.deepEqual(groupDisabledReasons('worked-out', false, 'no-folder'), { newSession: $X['no-folder'], rename: QX.workedOutRename, deleteGroup: QX.workedOutDelete, reorder: QX.fixedAtEnd });
  // 3.6556.2 shared-46 kO rewrote the Select all reason.
  assert.equal(QX.tooFewToSelect.defaultMessage, 'You need at least 2 sessions here that can be selected.');

  const { showsCustomGroups } = M['group-mode'];
  assert.equal(showsCustomGroups('code', 'date', false, true), true, 'environments on: Code always shows custom groups (sections)');
  assert.equal(showsCustomGroups('code', 'custom', false, false), true);
  assert.equal(showsCustomGroups('code', 'project', true, false), true);
  assert.equal(showsCustomGroups('chat', 'project', true, false), false);
});

// ---------------------------------------------------------------- SSR
const h = React.createElement;
const html = element => renderToStaticMarkup(element);
// The CDS ContextMenu the header / reorder / blank-area rows live in (open, so its Base UI items render; the popup portals).
const inContextMenu = element => h(M.viewTabs.CdsContextMenu.Root, { open: true }, element);

test('SSR: the group / section label row is the original oA/lA (old uD/fD) markup (toggle, name, mark, caret, badge, kind, rowless)', async () => {
  const { SidebarGroupLabel, sidebarGroupLabelMinHeight, sidebarGroupToggleHitClass } = M['group-label'];
  const hit = (await server.ssrLoadModule('/src/generated/code-current/sidebar-row-primitive.mjs')).sidebarHitRowClass;
  assert.equal(sidebarGroupToggleHitClass, `${hit} hit-row-main`);
  const rowClass = 'group/labelrow df-label-inset flex w-full items-center gap-[var(--df-row-gap)] pt-[var(--df-group-pt)] pe-[calc((var(--df-row-h)-24px)/2)] pb-1 text-[length:var(--df-group-font)] leading-4 font-normal font-header text-muted ' + sidebarGroupLabelMinHeight;
  const open = html(h(SidebarGroupLabel, { onToggle() {}, collapsed: false, kind: 'group', rowless: true, badge: h('i', { id: 'badge' }), nameMark: h('i', { id: 'mark' }),
    leading: h('i', { id: 'leading' }), trailing: h('i', { id: 'trailing' }) }, 'Alpha'));
  assert.ok(open.startsWith(`<div data-sidebar-group-label="" data-kind="group" data-rowless="" class="${rowClass}"><i id="leading"></i><button type="button" data-group-toggle="" aria-expanded="true" class="`), open);
  // 3.6556.2 lA: the name mark is text-muted-as-secondary.
  assert.match(open, /<span data-group-name="" class="min-w-0 truncate">Alpha<\/span><span data-group-mark="" class="flex shrink-0 text-muted-as-secondary"><i id="mark"><\/i><\/span>/);
  const caret = open.match(/<span data-cds="Icon"[^>]*data-group-caret=""[^>]*>/)?.[0];
  assert.ok(caret, 'the caret is the view-tabs CdsIcon');
  // 3.6556.2: the open caret turns through the CdsIcon rotate prop (data-cds-rotate, --cds-icon-rotate), not rotate-90.
  assert.ok(caret.includes('class="shrink-0 transition-transform duration-fast motion-reduce:transition-none group-data-[hover-within]/section:opacity-100 group-focus-visible/label:opacity-100 opacity-0"'), caret);
  assert.match(caret, /data-cds-rotate=""[^>]*style="[^"]*--cds-icon-rotate:90deg/);
  assert.ok(caret.includes('font-size:calc(0.75rem * var(--cds-rem-scale, 1))'), 'xs caret');
  assert.match(open, /<span data-group-badge="" class="-my-1 ms-auto flex size-6 shrink-0 items-center justify-center"><i id="badge"><\/i><\/span><\/button><i id="trailing"><\/i><\/div>$/);
  assert.ok(open.includes(`class="hide-focus-ring focus-visible:outline-hidden focus-visible:shadow-[inset_0_0_0_1px_var(--cds-fill-accent),0_0_6px_0_color-mix(in_srgb,var(--cds-fill-accent)_20%,transparent)] ${hit} hit-row-main group/label -my-1 -ms-1 flex min-w-0 flex-1 items-center rounded-[var(--df-radius-pill)] py-1 ps-1 text-start hover:text-secondary gap-1"`));
  const closed = html(h(SidebarGroupLabel, { onToggle() {}, collapsed: true }, 'Alpha'));
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, /group-focus-visible\/label:opacity-100 opacity-100"/);
  assert.doesNotMatch(closed, /data-kind=|data-rowless=|data-group-badge|data-group-mark/);
  const fixed = html(h(SidebarGroupLabel, {}, 'Beta'));
  assert.equal(fixed, `<div data-sidebar-group-label="" class="${rowClass}"><span data-group-name="" class="flex-1 truncate">Beta</span></div>`);
  // With onRename the row goes through dD (inline rename over code-current PE/FE); not editing, it is the same row.
  const renamable = html(h(SidebarGroupLabel, { onToggle() {}, collapsed: false, onRename() {}, renameValue: 'Alpha', startRenameRef: { current: null } }, 'Alpha'));
  assert.match(renamable, /data-group-toggle="" aria-expanded="true"/);
  assert.match(renamable, />Alpha<\/span>/);
});

test('SSR: section copy is the default (presets on), and the copy table switches like fk (old SE)', () => {
  const Copy = M['group-copy'];
  let copy;
  html(h(function Probe() { copy = Copy.useGroupCopy(); return null; }));
  assert.equal(copy, Copy.sectionMessages);
  assert.deepEqual([copy.newEllipsis, copy.moveTo, copy.moveCountTo, copy.removeFrom, copy.removeFromSeveral, copy.create, copy.nameLabel, copy.rename, copy.delete, copy.deleteTitle]
    // 3.6556.2 shared-18 uk: the Move to items name the section (Move to section / Move {count} to section / Remove from sections).
    .map(m => m.defaultMessage), ['New section', 'Move to section', 'Move {count} to section', 'Remove from {groupName}', 'Remove from sections', 'Create section', 'Section name', 'Rename section', 'Delete section', 'Delete section?']);
  assert.equal(copy.dragRemove, copy.removeFrom);
  assert.equal(copy.waiting, Copy.groupMessages.waiting);
  assert.equal(Copy.groupCopyFor(false), Copy.groupMessages);
  assert.equal(Copy.groupCopyFor(true, false), Copy.folderMessages);
  assert.equal(Copy.groupCopyFor(true, true), Copy.sectionMessages);
  assert.equal(Copy.groupMessages.dragRemove.defaultMessage, 'Ungroup');
});

test('SSR: a manual section\'s own Filter button (eO) renders closed, without a menu body', () => {
  const { SectionViewButton } = M['section-view-menu'];
  const sectionRecord = Model.reconcileSections(undefined, { groups: { groups: [{ id: 'cg-a', name: 'Alpha' }], assignments: {}, order: {} } }).find(s => s.kind === 'manual');
  const markup = html(h(SectionViewButton, { section: sectionRecord }));
  assert.match(markup, /^<span class="flex w-0 overflow-hidden group-hover\/labelrow:w-auto group-hover\/labelrow:overflow-visible group-has-\[:focus-visible\]\/labelrow:w-auto group-has-\[:focus-visible\]\/labelrow:overflow-visible touch:w-auto touch:overflow-visible">/);
  assert.match(markup, /<button[^>]*data-cds="Button"/);
  assert.match(markup, /aria-label="Group and sort"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /data-row-action=""/);
  assert.match(markup, /class="[^"]*df-chrome-btn relative -my-1[^"]*"/);
  assert.doesNotMatch(markup, /role="menu"/);
});

test('SSR: header menu (yx) wraps the label in its context-menu trigger, rename props flow to the label', () => {
  const { SidebarGroupMenu } = M['group-menu'];
  let rename;
  const markup = html(h(SidebarGroupMenu, { groupId: 'cg-a', groupName: 'Alpha', onCreateGroup() {}, children: value => { rename = value; return h('span', { 'data-probe': '' }, 'label'); } }));
  assert.equal(rename.renameValue, 'Alpha');
  assert.equal(typeof rename.onRename, 'function');
  assert.ok('current' in rename.startRenameRef);
  // The confirmation's CDS scope is view-tabs CdsRoot (Za): `div.cds-root.text-primary` with its density and provider attributes.
  const root = '<div class="cds-root text-primary contents" data-density="comfortable" data-platform="web" data-font="anthropic" style="font-size:var\\(--cds-font-size-body\\)"><\\/div>';
  // R4g-sidebar SB3 (X7-06): the trigger is view-tabs CdsContextMenu.Trigger (Base UI ContextMenuTrigger, vendor-frame
  // Cm): its default element is a div, and it adds Base UI's `style: {WebkitTouchCallout: "none"}` (touch long-press).
  assert.match(markup, new RegExp(`^<div style="-webkit-touch-callout:none" class="contents"><span data-probe="">label<\\/span><\\/div>${root}$`));
  const inSection = html(h(SidebarGroupMenu, { groupId: 'cg-a', groupName: 'Alpha', section: h('section', { 'data-section': '' }), children: () => h('span', null, 'label') }));
  assert.match(inSection, new RegExp(`^<section data-section="" style="-webkit-touch-callout:none"><span>label<\\/span>${root}<\\/section>$`));
  // In a section element a bucket without a groupId (worked out) gets no rename props.
  let none = 'unset';
  html(h(SidebarGroupMenu, { groupName: 'Today', section: h('section'), children: value => { none = value; return null; } }));
  assert.equal(none, undefined);
});

test('SSR: Move to items, section view reset items and reorder items use the original copy', () => {
  const { MoveToItems, RemoveFromGroupLabel } = M['move-to-menu'];
  const items = html(h(MoveToItems, { customGroups: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], currentGroupId: 'a', showUngrouped: true, assign() {}, openCreate() {}, shortcutFor: i => String(i + 1) }));
  assert.match(items, /role="menuitemradio"[^>]*aria-checked="true"[^>]*>[\s\S]*Alpha/);
  assert.match(items, /Remove from Alpha/);
  assert.match(items, /data-testid="new-custom-group"[\s\S]*New section/);
  assert.equal(html(h(RemoveFromGroupLabel, { customGroups: [], currentGroupId: 'x' })), 'Remove from sections');

  // sU / cU are CDS Dropdown items since R3-sections step 3 (a Base UI item renders only inside its menu): see the
  // controlled "section view reset items" test below.

  // R4g-sidebar SB3 (X7-06): the reorder rows are code-current's SidebarMenuItem over the CDS Dropdown parts (shared-16
  // jl), Base UI items of the context menu Px / sM open (view-tabs CdsContextMenu), so they render inside its Root.
  // 3.6556.2 shared-46 oM (old h$): Move up / Move down / Sort A to Z; "Reset order" is gone (resetsToRecent too).
  const { SectionReorderActions, SectionReorderItems } = M['group-reorder'];
  const actions = html(inContextMenu(h(SectionReorderActions, { onMoveUp() {}, onMoveDown() {}, onReset() {} })));
  assert.match(actions, /role="menuitem"[\s\S]*Move up[\s\S]*Move down[\s\S]*Sort A to Z/);
  assert.doesNotMatch(actions, /Reset order/);
  assert.equal(html(inContextMenu(h(SectionReorderActions, {}))), '');
  const fixed = html(inContextMenu(h(SectionReorderItems, { fixedReason: 'This group stays at the end of the list.' })));
  assert.match(fixed, /data-disabled="" role="menuitem" aria-disabled="true"[\s\S]*Move up[\s\S]*data-cds-disabled-reason="">This group stays at the end of the list\.</);
  assert.equal(html(inContextMenu(h(SectionReorderItems, {}))), '');
});

test('SSR: the new-section dialog renders nothing while closed', () => {
  const { CreateGroupDialog } = M['group-dialog'];
  assert.equal(html(h(CreateGroupDialog, { isOpen: false, onClose() {}, onSubmit() {} })), '');
});

// ---------------------------------------------------------------- controlled renders (a hook dispatcher; D21)
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const byType = (tree, type) => nodes(tree, n => n.type === type);
const byMessage = (tree, text) => nodes(tree, n => n.props?.children?.props?.defaultMessage === text || n.props?.defaultMessage === text);
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const read = c => (contexts.has(c) ? contexts.get(c) : c._currentValue);
  const hooks = {
    use: read, useContext: read, useId: () => ':sections:', useDebugValue() {}, useSyncExternalStore: (subscribe, get) => get(),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useReducer(reducer, initialArg, init) { const i = cursor++; if (!cells[i]) { const cell = { value: init ? init(initialArg) : initialArg }; cell.dispatch = action => { cell.value = reducer(cell.value, action); }; cells[i] = cell; } return [cells[i].value, cells[i].dispatch]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    useImperativeHandle(ref, make, deps) { hooks.useEffect(() => { if (ref) ref.current = make(); }, deps); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const render = (next = props) => { props = next; cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H; internal.H = withMemoCache(hooks); try { return (tree = component(props)); } finally { internal.H = old; } };
  render();
  return { get tree() { return tree; }, render, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach(c => c?.cleanup?.()); } };
}
const store = () => M.adapters.useSidebarSectionsStore;
const freshSection = name => {
  const created = store().getState().addSection(name);
  return () => store().getState().codeSidebarByScope.local.sections.find(s => s.id === created.id);
};

test('section view reset items (UJ / WJ, old sU / cU): New section…, Reset with its reason, View all disabled / loading / enabled', () => {
  const controls = M['section-filter-controls'];
  const X = M.viewTabs.CdsDropdown;
  const reset = fixture(controls.SidebarViewResetItems, { atDefaults: true, onReset() {} }).tree;
  const parts = reset.props.children;
  assert.deepEqual(parts.map(n => n.type), [X.Separator, X.Item, X.Separator, X.Item, controls.SidebarViewAllItem]);
  assert.equal(parts[1].props.onClick, controls.openNewSection);
  assert.equal(parts[1].props.children, 'New section');
  assert.deepEqual([parts[3].props.disabled, parts[3].props.disabledReason.props.defaultMessage, parts[3].props.children.props.defaultMessage],
    [true, 'Grouping and sorting are already at their defaults.', 'Reset to defaults']);
  assert.equal(fixture(controls.SidebarViewResetItems, { atDefaults: false, onReset() {} }).tree.props.children[3].props.disabled, false);
  const viewAll = value => fixture(controls.SidebarViewAllItem, {}, new Map([[controls.SidebarViewAllContext, value]])).tree;
  const none = viewAll(null), loading = viewAll('loading'), open = () => {}, enabled = viewAll(open);
  assert.equal(none.type, X.Item);
  assert.deepEqual([none.props.disabled, none.props.hint, none.props.disabledReason.props.defaultMessage, none.props.onClick], [true, undefined, 'There are no other sessions to view.', undefined]);
  assert.deepEqual([loading.props.disabled, loading.props.hint, loading.props.disabledReason], [true, 'Loading\u2026', null]);
  assert.deepEqual([enabled.props.disabled, enabled.props.onClick, enabled.props.children.props.defaultMessage], [false, open, 'View all']);
  // The one context: code-current's SidebarViewAllContext is this tree's KH.
  assert.equal(M.filterControls.SidebarViewAllContext, controls.SidebarViewAllContext);
});

test('section view menu (tO): Group by / Sort / Metadata / Reset write the section view through setSectionView', () => {
  const current = freshSection('View probe');
  const controls = M['section-filter-controls'];
  const handle = M.viewTabsVendor.CdsMenuCreateHandle();
  const menu = () => fixture(M['section-view-menu'].SectionViewMenu, { section: current(), handle, open: true, onOpenChange() {} });
  let f = menu();
  // tO is the CDS Dropdown root on eO's detached-trigger handle (view-tabs CdsMenuCreateHandle, the same Base UI menu).
  assert.equal(f.tree.type, M.viewTabs.CdsDropdown.Root);
  assert.equal(f.tree.props.handle, handle);
  assert.deepEqual([f.tree.props.children.type, f.tree.props.children.props.side, f.tree.props.children.props.align, f.tree.props.children.props.sideOffset],
    [M.viewTabs.CdsDropdown.Popup, 'bottom', 'end', 4]);
  const groupBy = byType(f.tree, controls.SidebarOptionMenu)[0].props;
  assert.equal(groupBy.label, 'Group by');
  assert.deepEqual(groupBy.options.map(([value]) => value), ['date', 'status', 'none']);
  assert.equal(groupBy.value, current().groupBy === 'status' || current().groupBy === 'date' ? current().groupBy : 'none');
  groupBy.onChange('date');
  assert.equal(current().groupBy, 'date');
  f = menu();
  const sort = byType(f.tree, controls.SidebarSortMenu)[0].props;
  sort.onChange('alpha');
  assert.deepEqual([current().sortBy, current().ascending], ['alpha', false]);
  f = menu();
  byType(f.tree, controls.SidebarSortMenu)[0].props.onAscendingChange(true);
  assert.equal(current().ascending, controls.sortAscendingStored('alpha', true));
  f = menu();
  const metadata = nodes(f.tree, n => n.props?.checked !== undefined && n.props?.keepOpen)[0].props;
  assert.equal(metadata.checked, current().show.metadata);
  metadata.onClick();
  assert.equal(current().show.metadata, !metadata.checked);
  f = menu();
  const reset = byType(f.tree, controls.SidebarViewResetItems)[0].props;
  assert.equal(reset.atDefaults, false);
  reset.onReset();
  assert.deepEqual([current().groupBy, current().sortBy, current().ascending], [undefined, 'recency', false]);
  f = menu();
  assert.equal(byType(f.tree, controls.SidebarViewResetItems)[0].props.atDefaults, true);
  store().getState().deleteSection(current().id);
});

// ---------------------------------------------------------------- E38: code-current sidebar-filter-view.mjs (3.6556.2 PJ)
test('E38: the session-list Group and sort content is 3.6556.2 PJ\'s sessionList block, over this tree\'s v3 controls, and the host menu passes PJ\'s locals', async () => {
  const cc = JSON.parse(await read(path.join(app, 'src/generated/code-current/manifest.json'))).modules.find(m => m.target === 'sidebar-filter-view.mjs');
  assert.deepEqual([cc.referenceVersion, path.basename(cc.source), cc.bindings], ['3.6556.2', 'shared-21-R7LldJ05.js', ['PJ']]);
  assert.deepEqual(cc.sourceSelections.map(s => [s.binding, s.ifTest, s.result, s.cache]), [['PJ', 'n === "sessionList"', 'fn', '$ = J9(482)']]);
  // The block, as shipped: it is the only `if (n === "sessionList")` of PJ and ends in `fn = … h(g, {children: [t, n, v, b]})`.
  const { code, ast } = await original('shared-21-R7LldJ05.js');
  const owner = topLevel(ast, 'PJ');
  const blocks = [];
  const walk = node => { if (!node || typeof node !== 'object') return; if (node.type === 'IfStatement' && code.slice(node.test.start, node.test.end) === 'n === "sessionList"') blocks.push(node.consequent);
    for (const v of Object.values(node)) if (v && typeof v === 'object') Array.isArray(v) ? v.forEach(walk) : walk(v); };
  walk(owner);
  assert.equal(blocks.length, 1);
  assert.equal(cc.sourceSelections[0].fragmentSha256, sha(code.slice(blocks[0].start, blocks[0].end)));
  assert.equal(cc.sha256, sha(await read(path.join(app, 'src/generated/code-current/sidebar-filter-view.mjs'))));

  const controls = M['section-filter-controls'], X = M.viewTabs.CdsDropdown, View = M.filterView.CurrentSidebarFilterContent;
  let intl;
  html(h(function Probe() { intl = M.adapters.useIntl(); return null; }));
  const routines = M.adapters.useSidebarRoutinesToggle();
  const base = { intl, direction: 'ltr', groupOptions: [['date', 'Date'], ['none', 'None']], groupBy: 'date', onGroupBy() {},
    sortOptions: [['recency', 'Last activity'], ['alpha', 'Name']], sortBy: 'recency', onSortBy() {}, ascending: false, onAscending() {},
    metadata: true, onMetadata() {}, routinesToggle: routines, emptyGroups: false, onEmptyGroups() {}, resetAvailable: false, onReset() {} };
  const tree = fixture(View, base).tree;
  assert.equal(tree.type, React.Fragment);
  const [group, sort, show, reset] = tree.props.children;
  assert.deepEqual([group.type, sort.type, show.type, reset.type], [controls.SidebarOptionMenu, controls.SidebarSortMenu, X.Submenu, controls.SidebarViewResetItems]);
  // qJ: keepOpen, no separator of its own (2.42304.0 oU passed neither).
  assert.deepEqual([group.props.keepOpen, group.props.separatorBefore, group.props.label, group.props.value, group.props.options, group.props.onChange],
    [true, 'none', 'Group by', 'date', base.groupOptions, base.onGroupBy]);
  assert.deepEqual([sort.props.options, sort.props.value, sort.props.onChange, sort.props.ascending, sort.props.onAscendingChange],
    [base.sortOptions, 'recency', base.onSortBy, false, base.onAscending]);
  assert.deepEqual([reset.props.atDefaults, reset.props.onReset], [true, base.onReset]);
  const [trigger, popup] = show.props.children;
  assert.deepEqual([trigger.type, trigger.props.children], [X.SubmenuTrigger, 'Show']);
  assert.deepEqual([popup.type, popup.props.side, popup.props.align], [X.Popup, 'right', 'start']);
  // Show: Metadata, one Separator (Empty groups is available), the Routines toggle (HJ, host: not offered), Side chats
  // only when offered (E16: not here), Empty groups.
  const [metadata, separator, routinesItem, sideChats, emptyGroups] = popup.props.children;
  assert.deepEqual([metadata.type, metadata.props.checked, metadata.props.keepOpen, metadata.props.onClick, metadata.props.children.props.defaultMessage], [X.Item, true, true, base.onMetadata, 'Metadata']);
  assert.equal(separator.type, X.Separator);
  assert.deepEqual([routinesItem.type, routinesItem.props], [M.adapters.SidebarShowToggleItem, { ...routines }]);
  assert.equal(html(routinesItem), '', 'the Routines toggle is not offered in this host');
  assert.equal(sideChats, false);
  assert.deepEqual([emptyGroups.type, emptyGroups.props.checked, emptyGroups.props.keepOpen, emptyGroups.props.onClick, emptyGroups.props.children], [X.Item, false, true, base.onEmptyGroups, 'Empty groups']);
  // Offered Side chats reads ae.sideChatRowsShown; with nothing offered or available the Separator goes too.
  const onSideChats = () => {};
  const offered = fixture(View, { ...base, sideChatsOffered: true, sideChatRows: { sideChatRowsShown: true }, onSideChats }).tree.props.children[2].props.children[1].props.children[3];
  assert.deepEqual([offered.type, offered.props.checked, offered.props.keepOpen, offered.props.onClick, offered.props.children], [X.Item, true, true, onSideChats, 'Side chats']);
  const bare = fixture(View, { ...base, emptyGroupsAvailable: false, resetAvailable: true }).tree.props.children;
  assert.deepEqual(bare[2].props.children[1].props.children.map(n => n && n.type), [X.Item, false, M.adapters.SidebarShowToggleItem, false, false]);
  assert.equal(bare[3].props.atDefaults, false);

  // The host menu (source-sidebar-filter-current.jsx SessionListFilterMenu) passes only PJ's parameters, Routines as
  // the adapter's toggle state, and none of oU's removed props.
  const parameters = new Set([...cc.sourceSelections[0].parameters.matchAll(/([A-Za-z]+):/g)].map(m => m[1]));
  const hostText = await read(path.join(app, 'src/source-sidebar-filter-current.jsx'));
  const used = hostText.slice(hostText.indexOf('<CurrentSidebarFilterContent'), hostText.indexOf('/>', hostText.indexOf('<CurrentSidebarFilterContent')));
  const passed = [...used.matchAll(/\s([A-Za-z]+)(?==|\s|$)/g)].map(m => m[1]).filter(n => n !== 'CurrentSidebarFilterContent');
  assert.ok(passed.length >= 15, passed.join(' '));
  for (const name of passed) assert.ok(parameters.has(name), `host prop ${name} is a PJ parameter`);
  assert.match(used, /routinesToggle=\{routinesToggle\}/);
  assert.doesNotMatch(hostText, /routinesAvailable=|routinesCopy=|onRoutines=/);
});

test('new-section dialog (dx/bx): section copy, no switch note, Create section enabled by a name, submit adds a section', () => {
  const dialog = M['group-dialog'];
  let hook;
  const host = fixture(() => { hook = dialog.useCreateGroupDialog('header_menu'); return hook.createModal; });
  assert.equal(host.tree.props.isOpen, false);
  hook.openCreate();
  host.render();
  host.flush();
  assert.equal(host.tree.props.isOpen, true);
  assert.equal(store().getState().overflowMenuOpen, true, 'the open dialog holds the overflow-menu flag');

  let closed = 0;
  const submitted = [];
  const f = fixture(dialog.GroupNameDialog, { isOpen: true, onClose: () => closed++, onSubmit: name => submitted.push(name) });
  assert.equal(f.tree, null, 'presence mounts on the next render');
  f.render();
  // bx over view-tabs CdsRoot (comfortable) → CdsDialog → CdsTextInput (R3-sections step 3, D24).
  assert.deepEqual([f.tree.type, f.tree.props.density, f.tree.props.className], [M.viewTabs.CdsRoot, 'comfortable', 'contents']);
  const D = M.viewTabs.CdsDialog;
  assert.equal(byType(f.tree, D.Root).length, 1);
  const popup = byType(f.tree, D.Popup)[0].props;
  assert.equal(popup.size, 'sm');
  assert.equal(byType(f.tree, D.Header)[0].props.showClose, false);
  assert.equal(byType(f.tree, D.Header)[0].props.children.props.defaultMessage, 'New section');
  const input = byType(f.tree, M.viewTabs.CdsTextInput)[0].props;
  assert.deepEqual([input.placeholder, input['aria-label']], ['Section name', 'Section name']);
  assert.equal(nodes(f.tree, n => n.type === 'p').length, 0, 'sections layout: no switch note');
  const submit = () => nodes(f.tree, n => n.props?.type === 'submit')[0].props;
  assert.equal(submit().disabled, true);
  assert.equal(submit().children.props.defaultMessage, 'Create section');
  input.onChange({ target: { value: '  Gamma ' } });
  f.render();
  assert.equal(submit().disabled, false);
  nodes(f.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(submitted, ['Gamma']);
  assert.equal(closed, 1);

  // The hook's onSubmit is the store's addCustomGroup (and a same-name group is reused, not duplicated).
  const before = store().getState().codeSidebarByScope.local.sections.length;
  host.tree.props.onSubmit('Delta');
  host.tree.props.onSubmit('Delta');
  const sections = store().getState().codeSidebarByScope.local.sections;
  assert.equal(sections.length, before + 1);
  assert.equal(sections.at(-2).name, 'Delta');
  host.tree.props.onClose();
  host.render();
  host.flush();
  assert.equal(store().getState().overflowMenuOpen, false);
  store().getState().deleteSection(sections.at(-2).id);
});

test('reorder handle (p$): Alt+Shift+Arrow moves the section unless the key comes from a row action', () => {
  const saved = ['HTMLInputElement', 'Element', 'Node'].map(n => [n, globalThis[n]]);
  class Node { contains(other) { for (let x = other; x; x = x.parent) if (x === this) return true; return false; } }
  class Element extends Node { constructor(parent, action) { super(); this.parent = parent; this.action = action; } closest(selector) { return selector === '[data-row-action]' && this.action ? this : null; } }
  class HTMLInputElement extends Element {}
  Object.assign(globalThis, { Node, Element, HTMLInputElement });
  try {
    const moves = [], current = new Element(null), label = new Element(current), action = new Element(current, true);
    const f = fixture(M['group-reorder'].SectionReorderHandle, { ctx: { onKeyboardMove: d => moves.push(d) }, children: 'label' });
    assert.equal(f.tree.type, 'div');
    assert.deepEqual([f.tree.props.role, f.tree.props.className], ['presentation', 'contents']);
    const key = (target, init) => {
      const event = { altKey: true, shiftKey: true, metaKey: false, ctrlKey: false, key: 'ArrowUp', target, currentTarget: current, prevented: 0, preventDefault() { this.prevented++; }, stopPropagation() {}, ...init };
      f.tree.props.onKeyDown(event);
      return event.prevented;
    };
    assert.equal(key(label), 1);
    assert.equal(key(label, { key: 'ArrowDown' }), 1);
    assert.equal(key(label, { shiftKey: false }), 0);
    assert.equal(key(label, { metaKey: true }), 0);
    assert.equal(key(action), 0);
    assert.equal(key(new HTMLInputElement(current)), 0);
    assert.deepEqual(moves, [-1, 1]);
    assert.equal(fixture(M['group-reorder'].SectionReorderHandle, { ctx: {}, children: 'x' }).tree.props.onKeyDown, undefined);
  } finally { for (const [n, v] of saved) v === undefined ? delete globalThis[n] : (globalThis[n] = v); }
});

test('header menu (yx): ordered groups, section copy, Rename enters the inline editor 100ms later, Delete confirms', async () => {
  const savedWindow = globalThis.window;
  globalThis.window = globalThis; // the debounced callback (vendor-all-0 ge) times through window
  try {
    const created = store().getState().addSection('Menu probe');
    store().getState().assignToSection(['code:m1', 'code:m2'], created.id);
    let rename;
    const props = { groupId: created.id, groupName: 'Menu probe', onCreateGroup() {}, onNewSession() {}, bulkBucketKey: `custom-${created.id}`, children: value => { rename = value; return null; } };
    const f = fixture(M['group-menu'].SidebarGroupMenu, props);
    f.flush();
    assert.equal(M['group-menu'].renameDelayMs, 100);
    const ordered = nodes(f.tree, n => n.props?.groups)[0].props.groups;
    assert.deepEqual(Object.keys(ordered), ['new', 'edit', 'organize', 'view', 'staff', 'remove']);
    const Item = (await server.ssrLoadModule('/src/generated/code-current/sidebar-menu-groups.mjs')).SidebarMenuItem;
    const items = byType(Object.values(ordered), Item);
    const label = item => item.props.children.props.defaultMessage;
    assert.deepEqual(items.map(label), ['New session', 'New section', 'Rename section', 'Delete section']);
    assert.equal(byType(ordered.organize, M['group-organize'].SidebarGroupSelectAll)[0].props.bucketKey, `custom-${created.id}`);
    assert.equal(byType(ordered.view, M.groupView.SidebarGroupViewItems).length, 1);
    assert.equal(byType(ordered.remove, M['group-archive'].SidebarGroupArchiveAll)[0].props.groupName, 'Menu probe');
    assert.equal(byType(ordered.edit, M['group-reorder'].SectionReorderItems).length, 1);
    // Rename: the menu closes, then 100ms later the label's inline editor is asked to start.
    let started = 0;
    rename.startRenameRef.current = () => started++;
    items.find(i => label(i) === 'Rename section').props.onClick();
    assert.equal(started, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(started, 1);
    rename.onRename('Renamed probe');
    assert.equal(store().getState().codeSidebarByScope.local.sections.find(s => s.id === created.id).name, 'Renamed probe');
    // Delete: counts what it releases, then the original confirmation deletes the section.
    items.find(i => label(i) === 'Delete section').props.onClick();
    f.render();
    const confirm = byType(f.tree, M.viewTabs.CdsConfirmationDialog)[0].props;
    assert.equal(confirm.open, true);
    assert.equal(confirm.confirmVariant, 'danger');
    assert.equal(confirm.title.props.defaultMessage, 'Delete section?');
    assert.equal(confirm.description.props.values.count, 2);
    confirm.onConfirm();
    assert.equal(store().getState().codeSidebarByScope.local.sections.some(s => s.id === created.id), false);
    f.close();
  } finally { savedWindow === undefined ? delete globalThis.window : (globalThis.window = savedWindow); }
});

test('Select all (pk, old aZ) needs two visible rows in the bucket, expands first, then selects through the host', async () => {
  const { SidebarGroupSelectAll } = M['group-organize'];
  const ListContext = M.groupView.SidebarListContext;
  const contexts = new Map([[ListContext, { getList: () => null }]]);
  // With onExpand, rows folded away in a collapsed section count when they are registered (rZ(e, true)).
  const rows = new Map(['code:1', 'code:2', 'code:3'].map(key => [key, { isPinned: false }]));
  M.adapters.setSidebarRowRegistry({ buckets: new Map([['custom-x', ['code:1', 'code:2', 'code:3']]]), rows, visible: ['code:1', 'code:3'] });
  const selected = [];
  const disconnect = M.adapters.connectSidebarSelection(keys => selected.push(keys));
  try {
    let expanded = 0;
    const item = fixture(SidebarGroupSelectAll, { bucketKey: 'custom-x', onExpand: () => expanded++ }, contexts).tree.props;
    assert.equal(item.disabled, false);
    item.onClick();
    assert.equal(expanded, 1);
    assert.deepEqual(selected, [['code:1', 'code:3']]);
    M.adapters.setSidebarRowRegistry({ visible: ['code:1'] });
    const lone = fixture(SidebarGroupSelectAll, { bucketKey: 'custom-x' }, contexts).tree.props;
    assert.equal(fixture(SidebarGroupSelectAll, { bucketKey: 'custom-x', onExpand() {} }, contexts).tree.props.disabled, false, 'registered folded rows count');
    assert.equal(lone.disabled, true);
    assert.equal(lone.disabledReason.props.defaultMessage, 'You need at least 2 sessions here that can be selected.');
    assert.equal(fixture(SidebarGroupSelectAll, { bucketKey: 'custom-x' }).tree, null, 'outside a sidebar list it is absent');
  } finally { disconnect(); M.adapters.setSidebarRowRegistry({ buckets: new Map(), rows: new Map(), visible: [] }); }
});

// ---------------------------------------------------------------- R4g-sidebar SB1 (research-ext/X7-partial-gaps.md X7-04)
test('X7-04 generator: the folded section badge is shared-21 NQ / MQ / jQ / AQ (old HG / VG / BG / zG) over shared-18 IA / VA / HA and shared-26 Pj / Fj, reading the host rows\' status instances', async () => {
  const manifest = JSON.parse(await read(path.join(generated, 'manifest.json')));
  const badge = manifest.modules.find(m => m.target === 'section-badge.mjs');
  const dot = manifest.modules.find(m => m.target === 'status-dot.mjs');
  const status = manifest.modules.find(m => m.target === 'section-status.mjs');
  // 3.6556.2 (research/sidebar.md §3.2): IG (the order list) is gone, LG became shared-26 Lj, the priority is Nj's.
  assert.deepEqual([badge.source, badge.bindings.map(b => b.name).sort()], ['shared-21-R7LldJ05.js', ['AQ', 'MQ', 'NQ', 'jQ']]);
  // w10-ccres-nested-parts: qv / HA are code-current nested-session-parts' one copy (imported, HA re-exported, R4).
  assert.deepEqual([dot.source, dot.bindings.map(b => b.name).sort()], ['shared-18-D3y8YMFN.js', ['BA', 'BC', 'FA', 'GC', 'IA', 'JO', 'PA', 'UC', 'VA']]);
  assert.deepEqual([status.source, status.bindings.map(b => b.name).sort()], ['shared-26-CGuBxVt9.js', ['Fj', 'Pj']]);
  const imports = module => Object.fromEntries(module.imports.filter(i => !i.from.startsWith('../view-tabs/') || !/^(memo|reactMemoCache)/.test(i.name)).map(i => [i.local, [i.kind, i.from, i.name]]));
  const badgeAdapter = '../../source-sidebar-section-badge-adapters.jsx';
  assert.deepEqual(imports(badge), {
    u: ['react', 'react/jsx-runtime', 'jsx'], Sf: ['adapter', '../../source-sidebar-sections-adapters.jsx', 'useIntl'],
    Vx: ['adapter', badgeAdapter, 'useRespondingSessionIds'], nm: ['adapter', badgeAdapter, 'sidebarErrorTitle'],
    up: ['generated', './group-copy.mjs', 'useGroupCopy'], Qp: ['generated', './status-dot.mjs', 'SidebarStatusDot'], Sm: ['generated', './status-dot.mjs', 'sidebarErrorInk'],
    Wp: ['external', '../code-current/nested-session-parts.mjs', 'NestedErrorIcon'], um: ['generated', './status-dot.mjs', 'useSidebarStatusLook'],
    Dl: ['generated', './section-status.mjs', 'sectionStatusPriority'], Il: ['generated', './section-status.mjs', 'sectionStatusBlocks'],
    xl: ['external', '../code-current/nested-session-needs-input.mjs', 'nestedSessionNeedsInput'],
    zl: ['external', '../code-current/sidebar-session-priority.mjs', 'resolveSessionStatePriority'],
    Xp: ['external', '../code-current/sidebar-status-glyph.mjs', 'sidebarErrorColors'], bp: ['external', '../code-current/sidebar-status-glyph.mjs', 'sidebarStatusMessages'],
  });
  assert.deepEqual(imports(dot), {
    m: ['react', 'react/jsx-runtime', 'jsx'], D: ['react', 'react', 'useContext'], M: ['react', 'react', 'createContext'],
    VC: ['adapter', badgeAdapter, 'useStatusDotLook'],
    KO: ['external', '../code-current/sidebar-status-glyph.mjs', 'SidebarStatusLayout'],
    WC: ['external', '../app-switch/app-switch-frame.mjs', 'needsYouColor'], KC: ['external', '../app-switch/app-switch-frame.mjs', 'hubAttention'],
    Kv: ['external', '../app-switch/app-switch-frame.mjs', 'syncInfiniteAnimations'], NC: ['external', '../app-switch/app-switch-frame.mjs', 'ClayStatusDot'],
    B: ['external', `../view-tabs/${official.sharedFrame}`, 'CdsPulse'],
    qv: ['external', '../code-current/nested-session-parts.mjs', 'NestedStatusDot'], HA: ['external', '../code-current/nested-session-parts.mjs', 'NestedErrorIcon'],
    aa: ['external', '../view-tabs/shared-52-uHFNjl7C.js', 'isFizzyLakePartOptedIn'],
  });
  // The priorities are code-current's one table (shared-26 Nj), the list-view context the dot reads the host rows' one.
  assert.deepEqual(Object.fromEntries(status.imports.map(i => [i.local, [i.kind, i.from, i.name]])), {
    Lj: ['external', '../code-current/nested-session-needs-input.mjs', 'nestedSessionNeedsInput'],
    Nj: ['external', '../code-current/sidebar-session-priority.mjs', 'sessionStatePriorities'],
  });
  // The call sites the host follows: shared-22's section label badge (and the Pinned / recents one) over shared-21 NQ,
  // exported `Wn`, imported `sv`; 3.6556.2 adds the day-or-status sub-heading (W) to onlyBlocked.
  const count = (file, text) => fs.readFile(path.join(reference, file), 'utf8').then(code => code.split(text).length - 1);
  assert.equal(await count('shared-22-Bwn3sJTG.js', 'badge:(X||W?Ke.length>0:Ke.some(uo))?o(sv,{sessions:Ke,onlyBlocked:!X&&!W}):void 0'), 1);
  assert.equal(await count('shared-22-Bwn3sJTG.js', 'badge:me.length>0?o(sv,{sessions:me}):void 0'), 1);
  assert.equal(await count('shared-22-Bwn3sJTG.js', 'Wn as sv'), 1);
  assert.equal(await count('shared-21-R7LldJ05.js', 'NQ as Wn'), 1);
  assert.equal(await count('shared-18-D3y8YMFN.js', 'HA as Wo'), 1);
});

test('X7-04 SSR: NQ shows the first status by Nj priority (awaiting, error, ready, running), onlyBlocked only "awaiting"; MQ labels it and draws the host rows\' dot', async () => {
  const { SectionStatusBadge, sectionStatusKind, rowStatusKind, rowAwaitingYou } = M.badge;
  const { sectionStatusPriority, sectionStatusBlocks } = await server.ssrLoadModule('/src/generated/sidebar-sections/section-status.mjs');
  assert.deepEqual(['awaiting', 'error', 'ready', 'running'].map(sectionStatusPriority), [0, 1, 2, 3]);
  assert.deepEqual(['awaiting', 'error', 'ready', 'running'].map(sectionStatusBlocks), [true, true, false, false]);
  const row = (id, fields = {}) => ({ ref: { kind: 'code', id }, source: { kind: 'code', data: { isArchived: false } }, hasError: false, liveStatus: 'idle',
    pendingPermissions: 0, isUnread: false, ...fields });
  const none = new Set();
  assert.equal(sectionStatusKind([row('a'), row('b', { isUnread: true }), row('c', { liveStatus: 'running' })], none), 'ready');
  assert.equal(sectionStatusKind([row('a', { liveStatus: 'running' }), row('b', { hasError: true })], none), 'error');
  assert.equal(sectionStatusKind([row('a', { hasError: true }), row('b', { pendingPermissions: 2 })], none), 'awaiting');
  assert.equal(sectionStatusKind([row('a')], none), null);
  assert.equal(rowStatusKind(row('a', { hasError: true }), true), 'running', 'a responding session runs; its stale error stays hidden');
  assert.equal(rowStatusKind(row('a', { isUnread: true, source: { kind: 'code', data: { isArchived: true } } }), false), null, 'archived rows have no status');
  assert.equal(rowAwaitingYou(row('a', { liveStatus: 'awaiting' })), true);
  const Responding = M.badgeAdapters.SectionRespondingIds.Provider, ListView = M.statusGlyph.SidebarStatusLayout.Provider;
  const render = (sessions, { onlyBlocked, responding = none, listView = {} } = {}) =>
    html(h(Responding, { value: responding }, h(ListView, { value: listView }, h(SectionStatusBadge, { sessions, onlyBlocked }))));
  const glyph = (label, inner) => `<span role="img" aria-label="${label}" class="flex items-center justify-center">${inner}</span>`;
  const pulse = (color, extra = '') => `<span class="contents [--cds-page-bg:transparent]"><span data-cds="Pulse" class="block size-[calc(0.375rem*var(--cds-rem-scale,1))] rounded-full${extra}" style="background:${color};box-shadow:0 0 0 0.5px var(--cds-page-bg)"></span></span>`;
  // Under the sidebar list-view context (uE) the dot is the CDS Pulse in PD's colour, as on the host rows.
  assert.equal(render([row('a', { isUnread: true }), row('b', { liveStatus: 'awaiting' })]), glyph('A session in this group is waiting on you', pulse('var(--cds-fill-warning)')));
  assert.equal(render([row('a', { isUnread: true })]), glyph('Unread response', pulse('var(--cds-fill-accent)')));
  assert.equal(render([row('a', { hasError: true })], { responding: new Set(['a']) }), glyph('Running', pulse('var(--cds-text-muted)', ' df-tab-dot-running')));
  // Outside it: ND, the plain status dot in the host's look (kx(false, false): no clay, amber "needs you").
  assert.equal(render([row('a', { liveStatus: 'running' })], { listView: null }), glyph('Running', '<span class="status-dot" data-kind="running"></span>'));
  // The error mark: SB-27, the host rows' error icon (old VD, now shared-18 HA: CdsIcon "Warning") in VA's ink of the
  // warning colour, labelled with the generic title.
  const error = render([row('a', { hasError: true })]);
  assert.ok(error.startsWith('<span role="img" aria-label="Something went wrong" class="flex items-center justify-center"><span data-cds="Icon" '), error);
  // (the icon's Anthropicons glyph is the span's private-use text)
  assert.match(error, /<span data-cds="Icon" [^>]*class="text-danger" aria-hidden="true">[\uE000-\uF8FF]<\/span><\/span>$/);
  // onlyBlocked (bC with W false): only "awaiting", nothing else.
  assert.equal(render([row('a', { isUnread: true })], { onlyBlocked: true }), '');
  assert.equal(render([row('a', { isUnread: true }), row('b', { pendingPermissions: 1 })], { onlyBlocked: true }), glyph('A session in this group is waiting on you', pulse('var(--cds-fill-warning)')));
  assert.equal(render([row('a')]), '', 'no status: HG renders nothing');
});

test('zh-CN: the section copy, reasons and menu items read the R2-sections dictionary block (ICU plural included)', async () => {
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const previous = i18n.getLocale();
  i18n.setLocale('zh-CN');
  try {
    let out;
    html(h(function Probe() {
      const intl = M.adapters.useIntl();
      const copy = M['group-copy'].useGroupCopy();
      out = [intl.formatMessage(copy.newEllipsis), intl.formatMessage(copy.deleteBody, { groupName: 'A', count: 2 }), intl.formatMessage(copy.deleteBody, { groupName: 'A', count: 0 }),
        intl.formatMessage(M['group-reasons'].groupReasonMessages.fixedAtEnd), intl.formatMessage(copy.removeFrom, { groupName: 'B' })];
      return null;
    }));
    assert.deepEqual(out, ['新建分区', '“A”将被移除。其中的 2 个会话会回到你的其他会话中。', '“A”将被移除。其中没有内容。', '此分组固定在列表末尾。', '从“B”移除']);
    // 3.6556.2: the reorder menu's last item is Sort A to Z (Reset order is gone).
    assert.match(html(inContextMenu(h(M['group-reorder'].SectionReorderActions, { onReset() {} }))), /按 A 到 Z 排序/);
  } finally { i18n.setLocale(previous); }
});
