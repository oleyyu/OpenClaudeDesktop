import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractCoworkProgressV4, ROOTS, HOST_ADAPTERS, REMOVED_ROOTS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-cowork-progress-v4.mjs';

// account2 batch 5, region cowork-progress: the 4.16336.0 Cowork progress panel (scripts/extract-cowork-progress-v4.mjs ->
// src/generated/cowork-progress-v4, staged next to the 3.6556.2 src/generated/cowork-progress the host still renders).
// Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR of the panel through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/cowork-progress-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

// The same DOM stand-ins as tests/code-transcript-r4-feed.test.mjs (shared-52 reads documentElement at module load).
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

let server, gen;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-cowork-progress-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-progress-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['cowork-scheduled-v4', 'files-changes-v4', 'routines-shared-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractCoworkProgressV4({ check: true });
});

test('roots: the semantic names, AST-located and pinned; the 3.6556.2 file browser is removed upstream', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c21f11e6d-Cyj5xu_D.js#lE=CoworkProgressSection', 'c21f11e6d-Cyj5xu_D.js#uE=CoworkEmptyOutputs', 'c21f11e6d-Cyj5xu_D.js#fE=CoworkOutputsSection',
    'c21f11e6d-Cyj5xu_D.js#bE=CoworkFolderInstructionsDialog', 'cc5a62f6f-CsfnfFRu.js#I=CoworkPanel/h', 'cc5a62f6f-CsfnfFRu.js#R=CoworkPanelSection/n',
    'cc5a62f6f-CsfnfFRu.js#O=coworkPanelRow/a', 'cc5a62f6f-CsfnfFRu.js#ne=CoworkPanelMergedContext/_', 'cc5a62f6f-CsfnfFRu.js#re=CoworkPanelSectionToggleContext/g',
    'cc5a62f6f-CsfnfFRu.js#E=CoworkPanelLayoutContext/m', 'cc5a62f6f-CsfnfFRu.js#w=coworkPanelFlatLayout/d', 'cc5a62f6f-CsfnfFRu.js#C=coworkPanelCardLayout/u']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    const chunk = official(r.file);
    assert.ok(chunk.includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  }
  // The old graph's names, minus the one 4.16336.0 removed.
  const old = Object.keys(JSON.parse(local('src/generated/cowork-progress/manifest.json')).publicNames);
  assert.deepEqual(old.filter(n => !provenance.roots.some(r => r.name === n)), ['CoworkFileBrowserDialog']);
  assert.deepEqual(REMOVED_ROOTS.map(r => r.name), ['CoworkFileBrowserDialog']);
  for (const name of fs.readdirSync(path.join(ion, 'assets/v1')).filter(n => /^c21f11e6d-|^cc5a62f6f-/.test(n) && n.endsWith('.js')))
    for (const ev of REMOVED_ROOTS[0].evidence) assert.ok(!official(name).includes(ev), `${name}: ${ev}`);
  assert.equal(gen.CoworkFileBrowserDialog, undefined);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'shared-123#_L=useDesktopFrame', 'c4038fd41#L=useTodoCommentAttachment', 'shared-0#BO=FileSystem', 'shared-0#H=trackEvent',
    'shared-25#Z=useCurrentAccount', 'shared-25#ko=useFeatureIsOn', 'shared-62#OT=useAnalytics', 'shared-62#rP=useErrors', 'vendor-intl#q=useIntl',
    'vendor-intl#Gt=FormattedMessage', 'shared-183#GT=useConnectorLookup', 'shared-36#Db=ConnectorServerIcon', 'c21f11e6d#Ly=CoworkWorkingDocuments',
    'c21f11e6d#Bx=CoworkNonFileOutputRow', 'c21f11e6d#nS=CoworkNonFileOutputsFrame', 'ca2ef848d#d6=unavailableActivityDetail',
    'ca2ef848d#J6=unavailableActivityDetail', 'c41de644f#i=unavailableActivityDetail', 'ca2ef848d#Y1=useConnectedOfficeFiles',
    'shared-6#Sf=useDownloadOutput', 'shared-6#wf=useDownloadOutputs']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  // Every adapter import site names an adapted original, and every adapted original is used.
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-cowork-progress-v4-adapters.jsx');
  // The adapter module only re-exports existing host adapters (no new implementation).
  const adapterText = local('src/source-cowork-progress-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-cowork-progress-v3-adapters.jsx', './source-routines-shared-adapters.jsx', './source-routine-cowork-adapters.jsx']);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; only the reviewed pure copies', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)).sort(), Object.keys(provenance.linkedCopies).sort(), 'only the pure linkedCopies are cut again');
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1]));
  for (const area of manifest.linkedAreas) assert.ok(linked.includes(area), `links ${area}`);
  // The panel column's contexts are this graph's own (no other 4.16336.0 graph holds cc5a62f6f), declared once.
  const column = local(`${out}/cc5a62f6f.mjs`);
  for (const decl of ['ne = o(!1)', 're = o("always")', 'E = o(C)']) assert.equal(column.split(decl).length - 1, 1, decl);
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'cowork-progress-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    assert.ok(!(m.modules ?? []).some(mod => path.basename(mod.source ?? '') === 'cc5a62f6f-CsfnfFRu.js' && (mod.bindings ?? []).length), dir);
  }
});

test('the official text: the panel roots, their copy and the illustrations', () => {
  const c21 = official('c21f11e6d-Cyj5xu_D.js'), cc5 = official('cc5a62f6f-CsfnfFRu.js');
  for (const s of ['{defaultMessage:"Progress",id:"sIMS7iH+wa"}', '{defaultMessage:"View and open files created during this task.",id:"p41Nenxyun"}',
    '{defaultMessage:"Progress on longer tasks appears here.",id:"cKZ0dC17TM"}', '{defaultMessage:"Working folders",id:"LtMr5Lrv6p"}',
    '"/images/illustrations/session-progress.svg"', '"/images/illustrations/session-artifacts-dark.svg"'])
    assert.ok(c21.includes(s), s);
  assert.ok(/\bI as h\b/.test(cc5) && /\bR as n\b/.test(cc5) && /\bE as m\b/.test(cc5) && /\bne as _\b/.test(cc5), 'cc5a62f6f export table');
  for (const art of provenance.illustrations.items) {
    assert.equal(art.sha256, sha(fs.readFileSync(path.join(ion, art.url))), art.url);
    assert.equal(art.servedCopyIdentical, true, art.url);
  }
  // The emitted text keeps the official root-relative art (no engine rewrite; cutover item for file://).
  assert.equal(local(`${out}/c21f11e6d.mjs`).split('"/images/illustrations/').length - 1, 4);
});

const todos = [
  { content: 'Read the brief', status: 'completed' },
  { content: 'Draft the summary', activeForm: 'Drafting the summary', status: 'in_progress' },
  { content: 'Send it', status: 'pending' }];
function panel({ steps, expanded = true, hosted = true, disable = true, files = [] }) {
  const done = steps.length > 0 && steps.every(s => s.status === 'completed');
  return renderToStaticMarkup(h(gen.CoworkPanelMergedContext.Provider, { value: true },
    h(gen.CoworkPanelLayoutContext.Provider, { value: gen.coworkPanelFlatLayout },
      h(gen.CoworkPanel, { shrinkSections: true },
        h(gen.CoworkProgressSection, { todos: steps, allTodosCompleted: done, isExpanded: expanded, setIsExpanded() {}, headerHostedToggle: hosted,
          conversationUuid: 's1', sessionId: 's1', isSessionActive: true, disableTodoCommentAttachment: disable, maxContentHeight: '24rem' }),
        h(gen.CoworkPanelSection, { title: 'Outputs', isExpanded: true, onToggle() {}, maxContentHeight: '24rem' },
          files.length ? files.map(f => h('button', { key: f, className: gen.coworkPanelRow.button }, h('span', { className: gen.coworkPanelRow.name }, f)))
            : h(gen.CoworkEmptyOutputs))))));
}

test('SSR: todos in progress (flat, merged): the official Section header, rows and the disabled comment branch', () => {
  const html = panel({ steps: todos });
  const words = text(html);
  assert.match(words, /^Progress /);
  assert.ok(words.includes('Read the brief') && words.includes('Send it'), words);
  assert.ok(html.includes('Drafting the summary') || html.includes('Draft the summary'), 'in-progress row label');
  assert.equal(html.split('data-section-header=""').length - 1, 2, 'two sections');
  assert.ok(html.includes('px-4 pt-4 pb-3'), 'flat header padding');
  assert.ok(html.includes('aria-expanded="true"'));
  assert.ok(!html.includes('Comment on this item'), 'disableCommentAttachment hides the comment button');
  assert.ok(words.includes('View and open files created during this task.'));
});

test('SSR: all todos completed, collapsed, header not hosted: "{count} of {count}"', () => {
  const html = panel({ steps: todos.map(s => ({ ...s, status: 'completed' })), expanded: false, hosted: false });
  assert.ok(text(html).includes('3 of 3'), text(html));
  assert.ok(html.includes('text-muted-as-secondary text-caption-regular font-sans'), '4.16336.0 caption copy');
  assert.ok(html.includes('aria-expanded="false"'));
});

test('SSR: no todos and no outputs: both official empty states with their illustrations', () => {
  const html = panel({ steps: [] });
  const words = text(html);
  assert.ok(words.includes('Progress on longer tasks appears here.'), words);
  assert.ok(words.includes('View and open files created during this task.'), words);
  for (const art of ['session-progress.svg', 'session-artifacts.svg']) assert.ok(html.includes(art), art);
  const withFile = panel({ steps: [], files: ['notes.md'] });
  assert.ok(withFile.includes(gen.coworkPanelRow.button) && !text(withFile).includes('View and open files created during this task.'));
  assert.equal(gen.coworkPanelRow.kind, 'shrink-0 text-caption text-muted-as-secondary');
});

test('SSR: card layout outside the merged panel: the section takes the card surface (useDesktopFrame)', () => {
  const html = renderToStaticMarkup(h(gen.CoworkPanel, {},
    h(gen.CoworkProgressSection, { todos, allTodosCompleted: false, isExpanded: true, setIsExpanded() {}, headerHostedToggle: false,
      conversationUuid: 's1', sessionId: 's1', isSessionActive: true, disableTodoCommentAttachment: true })));
  assert.ok(html.includes('divide-y divide-alpha-1'), 'card panel dividers');
  assert.match(text(html), /^Progress /);
});

const outputsModel = await import('../src/cowork-outputs-model.mjs');
const cwd = '/Users/me/Project';
const changeItem = (id, ...paths) => ({ id, type: 'fileChange', status: 'completed', changes: paths.map(p => ({ path: p, kind: { type: 'add' } })) });
function outputs(data, extra = {}) {
  return renderToStaticMarkup(h(gen.CoworkPanelMergedContext.Provider, { value: true },
    h(gen.CoworkPanelLayoutContext.Provider, { value: gen.coworkPanelFlatLayout },
      h(gen.CoworkPanel, { shrinkSections: true },
        h(gen.CoworkOutputsSection, { headerHostedToggle: false, isArtifactsExpanded: true, setIsArtifactsExpanded() {}, artifactsSeedSnap: false,
          conversationUuid: 's1', sessionId: 's1', handleOpenFolder() {}, setIsFolderInstructionsModalOpen() {},
          handleOutputsActivityClick() {}, selectedPath: null, isFolderExpanded: () => true, toggleFolder() {}, nonFileOutputHandlers: undefined,
          isScratchpadExpanded: false, setIsScratchpadExpanded() {}, isOfficeFilesExpanded: true, setIsOfficeFilesExpanded() {},
          resourceActivity: data.resourceActivity, handleOpenWorkingDocument() {}, handleOpenWorkingDocDraft() {}, isTranscriptHydrated: true,
          watercolorHeld: false, maxContentHeight: '24rem', panelShown: true, ...data, ...extra })))));
}

test('SSR: one working folder with outputs — "Working folder", Go to folder, the file rows, the CLAUDE.md row', () => {
  const data = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/report.md', `${cwd}/outputs/data.csv`)] });
  const html = outputs(data);
  const words = text(html);
  assert.match(words, /^Working folder /, words);
  assert.ok(html.includes('aria-label="Go to folder"'), 'fE Go to folder (EAUt85Zlu/)');
  assert.ok(!html.includes('Browse files'), '4.16336.0 has no file browser action');
  assert.match(words, /Instructions · CLAUDE\.md/);
  assert.ok(!words.includes('View and open files created during this task.'));
});

test('SSR: no outputs and several folders', () => {
  const noFolder = outputs(outputsModel.coworkOutputsData({ sessionId: 's1', items: [] }));
  assert.ok(text(noFolder).includes('View and open files created during this task.'), text(noFolder));
  const data = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/a.md', '/Users/me/Other/b.md')] });
  const multi = { ...data, userSelectedFolders: [cwd, '/Users/me/Other'], hasMultipleFolders: true };
  multi.outputsByFolder = outputsModel.coworkOutputsByFolder(data.resourceActivity, multi.userSelectedFolders);
  multi.outputResourcesActivity = data.resourceActivity;
  assert.match(text(outputs(multi)), /^Working folders /);
});

test('SSR: the folder instructions dialog (closed and open through its portal) renders without throwing', () => {
  assert.equal(typeof renderToStaticMarkup(h(gen.CoworkFolderInstructionsDialog, { isOpen: false, setIsOpen() {}, folderPath: cwd, sessionId: 's1' })), 'string');
  assert.equal(typeof renderToStaticMarkup(h(gen.CoworkFolderInstructionsDialog, { isOpen: true, setIsOpen() {}, folderPath: cwd, sessionId: 's1' })), 'string');
});
