import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCoworkProgress } from '../scripts/extract-cowork-progress.mjs';

// w10-curchat-progress-gen (CC-07 generated part, CC-15 progress part): the 3.6556.2 Cowork progress panel
// (scripts/extract-cowork-progress.mjs: c21f11e6d vT/yT, cc5a62f6f F/L/T + contexts, c4038fd41 todo checklist) over
// src/source-cowork-progress-v3-adapters.jsx. Source only: manifest, the generator's --check, the official chunk text,
// and SSR of the panel in three task states. No browser, no network; the official chunks are read, never executed.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(snapshot, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const manifest = JSON.parse(local('src/generated/cowork-progress/manifest.json'));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, gen;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-progress/index.mjs');
});
after(() => server?.close());

test('manifest: 3.6556.2 snapshot, chunk and illustration hashes, the roots and their adapters', async () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.adapterModule, 'src/source-cowork-progress-v3-adapters.jsx');
  for (const mod of manifest.modules) {
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(snapshot, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`src/generated/cowork-progress/${mod.target}`)), mod.target);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.publicNames).map(([name, e]) => [name, `${e.file}#${e.local}${e.export ? `/${e.export}` : ''}`])), {
    CoworkProgressSection: 'c21f11e6d-Cyd8_HO8.js#vT', CoworkEmptyOutputs: 'c21f11e6d-Cyd8_HO8.js#yT',
    CoworkOutputsSection: 'c21f11e6d-Cyd8_HO8.js#xT', CoworkFolderInstructionsDialog: 'c21f11e6d-Cyd8_HO8.js#kT', CoworkFileBrowserDialog: 'c21f11e6d-Cyd8_HO8.js#Bb',
    CoworkPanel: 'cc5a62f6f-CwJjes2b.js#F/p', CoworkPanelSection: 'cc5a62f6f-CwJjes2b.js#L/t', coworkPanelRow: 'cc5a62f6f-CwJjes2b.js#T/i',
    CoworkPanelMergedContext: 'cc5a62f6f-CwJjes2b.js#ne/h', CoworkPanelSectionToggleContext: 'cc5a62f6f-CwJjes2b.js#re/m', CoworkPanelLayoutContext: 'cc5a62f6f-CwJjes2b.js#w/f',
    coworkPanelFlatLayout: 'cc5a62f6f-CwJjes2b.js#C/u', coworkPanelCardLayout: 'cc5a62f6f-CwJjes2b.js#S/l' });
  // w13-coworkui-outputs adds the Outputs section's service boundary (each documented in the adapter module).
  assert.deepEqual(manifest.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'shared-78#gK=useDesktopFrame', 'c4038fd41#L=useTodoCommentAttachment', 'shared-0#oC=FileSystem', 'c21f11e6d#by=CoworkWorkingDocuments',
    'c21f11e6d#ox=CoworkNonFileOutputRow', 'c21f11e6d#Sx=CoworkNonFileOutputsFrame', 'c41de644f#i=unavailableActivityDetail',
    'ca2ef848d#e4=unavailableActivityDetail', 'ca2ef848d#O4=unavailableActivityDetail', 'ca2ef848d#o1=useConnectedOfficeFiles',
    'c46809900#m=usePreloadFileSourceView', 'c45a8b2e8#k=CoworkFilePreview', 'c45a8b2e8#E=CoworkFileEntryMenuItems',
    'shared-156#iw=useConnectorLookup', 'vendor-intl#nn=defineMessage', 'shared-6#lb=useDownloadOutput', 'shared-6#db=useDownloadOutputs',
    'shared-6#tS=newestOutputFileUuid']);
  assert.deepEqual(manifest.contexts, ['c21f11e6d-Cyd8_HO8.js#Wb', 'c21f11e6d-Cyd8_HO8.js#Gb', 'cc5a62f6f-CwJjes2b.js#ne', 'cc5a62f6f-CwJjes2b.js#re',
    'cc5a62f6f-CwJjes2b.js#w', 'shared-6-sd9jbJqs.js#hC']);
  for (const art of manifest.illustrations) {
    assert.equal(art.sha256, sha(fs.readFileSync(path.join(snapshot, art.path))), art.path);
    assert.equal(art.sha256, sha(fs.readFileSync(path.join(app, 'public', art.path))), `served ${art.path}`);
  }
  assert.deepEqual(manifest.illustrations.map(a => a.path.split('/').pop()),
    ['session-progress.svg', 'session-progress-dark.svg', 'session-artifacts.svg', 'session-artifacts-dark.svg']);
  await extractCoworkProgress({ check: true });
});

test('the official text: c21f11e6d Progress / empty outputs, cc5a62f6f exports, the root-relative art the generator rewrites', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js'), cc5 = official('cc5a62f6f-CwJjes2b.js');
  for (const s of ['{defaultMessage:`Progress`,id:`sIMS7iH+wa`}', '{defaultMessage:`View and open files created during this task.`,id:`p41Nenxyun`}',
    'disableCommentAttachment:', '"/images/illustrations/session-progress.svg"', '"/images/illustrations/session-artifacts-dark.svg"'].map(s => s.replaceAll('`', '"')))
    assert.ok(c21.includes(s), s);
  assert.ok(/export\{[^}]*\bF as p\b[^}]*\}/.test(cc5) && /\bL as t\b/.test(cc5) && /\bT as i\b/.test(cc5) && /\bw as f\b/.test(cc5) && /\bne as h\b/.test(cc5), 'cc5a62f6f export table');
  const out = local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs');
  assert.ok(!out.includes('"/images/'), 'file:// host: root-relative art rewritten');
  assert.equal(out.split('"./images/illustrations/').length - 1, 4);
  // The comment-handler adapter and the desktop-frame adapter are the only host services; nothing reaches current-chat.
  for (const mod of manifest.modules) assert.ok(!local(`src/generated/cowork-progress/${mod.target}`).includes('current-chat'), mod.target);
  // The adapters import no generated graph except the view-tabs facade (R6; the entry menu's CdsContextMenu items).
  const adapterImports = [...local('src/source-cowork-progress-v3-adapters.jsx').matchAll(/^(?:import|export)\b[^;]*?from "([^"]+)"/gm)].map(m => m[1]);
  assert.deepEqual(adapterImports.filter(f => f.includes('generated/')), ['./generated/view-tabs/index.js']);
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

test('SSR: todos in progress (flat, merged), the official Section header and the disabled comment branch', () => {
  const html = panel({ steps: todos });
  const words = text(html);
  assert.match(words, /^Progress /);
  assert.ok(words.includes('Read the brief') && words.includes('Send it'), words);
  assert.ok(html.includes('Drafting the summary') || html.includes('Draft the summary'), 'in-progress row label');
  assert.equal(html.split('data-section-header=""').length - 1, 2, 'two sections');
  assert.ok(html.includes('group/section-header can-focus w-full flex items-center justify-between text-start select-none draggable-none'));
  assert.ok(html.includes('px-4 pt-4 pb-3'), 'flat header padding');
  assert.ok(html.includes('*:relative [&amp;&gt;:not(:first-child)]:before:absolute'), 'flat panel dividers (cc5a62f6f oe)');
  assert.ok(html.includes('aria-expanded="true"'));
  assert.ok(!html.includes('Comment on this item'), 'disableCommentAttachment hides the comment button');
  assert.ok(!html.includes('dframe-card'), 'merged sections draw no card surface');
  assert.ok(words.includes('View and open files created during this task.'));
});

test('SSR: all todos completed, collapsed, header not hosted: the "{count} of {count}" header accessory', () => {
  const steps = todos.map(s => ({ ...s, status: 'completed' }));
  const html = panel({ steps, expanded: false, hosted: false });
  assert.ok(text(html).includes('3 of 3'), text(html));
  assert.ok(html.includes('text-muted-as-secondary font-small'), '3.6556.2 muted copy (2.31226.0: text-muted)');
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(html.includes('inert=""'), 'collapsed body is inert');
});

test('SSR: no todos and no outputs: both official empty states with their illustrations', () => {
  const html = panel({ steps: [] });
  const words = text(html);
  assert.ok(words.includes('Progress on longer tasks appears here.'));
  assert.ok(words.includes('View and open files created during this task.'));
  for (const art of ['session-progress.svg', 'session-progress-dark.svg', 'session-artifacts.svg', 'session-artifacts-dark.svg'])
    assert.ok(html.includes(`url(./images/illustrations/${art})`), art);
  assert.ok(html.includes('class="-ml-3"'), 'the progress art offset');
  const withFile = panel({ steps: [], files: ['notes.md'] });
  assert.ok(withFile.includes(gen.coworkPanelRow.button) && !text(withFile).includes('View and open files created during this task.'));
  assert.ok(gen.coworkPanelRow.button.includes('text-start') && gen.coworkPanelRow.kind === 'shrink-0 text-caption text-muted-as-secondary');
});

test('SSR: without disableCommentAttachment the official comment button renders, its handler unavailable', () => {
  const html = panel({ steps: todos, disable: false });
  assert.ok(html.includes('aria-label="Comment on this item"'), 'c4038fd41 z');
});

// w11-sweep-curchat (D1): shared-18's check glyphs come from cowork-scheduled and shared-182's scoped state hook zL (with
// its scope WeakMap RL) from mcp-app-card, imported under the names those modules export; nothing they hold is copied
// here. The empty-state art is written by this generator from the 3.6556.2 snapshot (prepare-ui.mjs no longer copies it).
test('D1: bindings cowork-scheduled / mcp-app-card hold are imported, not sliced again; the generator owns the art', () => {
  const holders = ['cowork-scheduled', 'mcp-app-card'].map(dir => JSON.parse(local(`src/generated/${dir}/manifest.json`)));
  const held = new Set(holders.flatMap(m => m.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`))));
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  // Nothing they hold is copied (pendingDedupe empty): mcp-app-card publishes shared-78's error tag map tO, nO, assert_never q
  // and the "Claude in Chrome" name qz (w13-close-gen-dedup, coworkui-outputs-02), so the WeakMap is one instance.
  assert.deepEqual(own.filter(key => held.has(key)).sort(), []);
  assert.deepEqual(manifest.pendingDedupe, []);
  const shared78 = local('src/generated/cowork-progress/shared-78-D5Fw2h0a.mjs');
  assert.match(shared78, /import \{ claudeInChromeServerName as qz \} from "\.\.\/mcp-app-card\/shared-78\.mjs";/);
  assert.doesNotMatch(shared78, /new WeakMap\(\)|function nO\(|function q\(/);
  assert.match(local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs'), /import \{ assertNever as \w+ \} from "\.\.\/mcp-app-card\/shared-78\.mjs";/);
  // shared-104's withLoadingFlag Cm is files-changes' loading-flag.mjs (the copy sessions-page imports; G1 crossLane).
  assert.match(local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs'), /import \{ withLoadingFlag as \w+ \} from "\.\.\/files-changes\/loading-flag\.mjs";/);
  assert.doesNotMatch(local('src/generated/cowork-progress/shared-104-CTONUSaz.mjs'), /function Cm\(/);
  assert.deepEqual(manifest.modules.map(mod => mod.target).filter(t => /^shared-18-/.test(t)), []);
  const todo = local('src/generated/cowork-progress/c4038fd41-Dh3fgKd4.mjs');
  assert.match(todo, /import \{ NC as y \} from "\.\.\/cowork-scheduled\/shared-18-D3y8YMFN\.mjs";/);
  assert.match(todo, /import \{ rc as b \} from "\.\.\/mcp-app-card\/shared-182\.mjs";/);
  assert.match(local('src/generated/mcp-app-card/shared-182.mjs'), /\bzL as rc\b/);
  assert.deepEqual(manifest.linkedImports.map(l => l.original.replace(/-[\w-]{8}\.js#/, '#')), ['ca7840910#F', 'shared-0#F', 'shared-0#LL', 'shared-0#Ui',
    'shared-104#Cm', 'shared-104#qN', 'shared-18#NC', 'shared-182#zL', 'shared-52#Wf', 'shared-52#nk', 'shared-7#Hk', 'shared-78#q', 'shared-78#qJ', 'shared-78#qz', 'shared-78#t3', 'shared-8#mT', 'vendor-all-0#v']);
  // files-changes' compact folder tree is the file browser's tree (one copy), pinned by the whole chunk's sha256.
  assert.match(local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs'), /import \{ FolderTree as kg \} from "\.\.\/files-changes\/file-tree-compact\.mjs";/);
  const tree = JSON.parse(local('src/generated/files-changes/manifest.json')).modules.find(m => m.source === 'ca7840910-By5J0kGX.js');
  assert.equal(tree.sourceSha256, sha(fs.readFileSync(path.join(snapshot, 'assets/v1/ca7840910-By5J0kGX.js'))));
  assert.ok(!manifest.modules.some(m => m.source === 'ca7840910-By5J0kGX.js'), 'the tree is not sliced again');
  const prepare = local('scripts/prepare-ui.mjs');
  assert.ok(!/session-progress\.svg/.test(prepare) && !/copyAsset\('\.\.\/\.\.\/images\/illustrations/.test(prepare), 'prepare-ui copies no illustrations');
  assert.match(local('scripts/extract-cowork-progress.mjs'), /for \(const \[name, bytes\] of illustrationBytes\) await fs\.writeFile\(path\.join\(served, name\), bytes\);/);
  assert.deepEqual(manifest.callSites.map(c => c.source), ['cc5a62f6f-CwJjes2b.js']);
});

// w13-coworkui-outputs (cwui-13..18): the official Outputs / Working folder section xT, fed by src/cowork-outputs-model.mjs
// the way the official activity panel AT feeds it.
const outputsModel = await import('../src/cowork-outputs-model.mjs');
const cwd = '/Users/me/Project';
const changeItem = (id, ...paths) => ({ id, type: 'fileChange', status: 'completed', changes: paths.map(p => ({ path: p, kind: { type: 'add' } })) });
function outputs(data, extra = {}) {
  const [state, setState] = [{}, () => {}];
  return renderToStaticMarkup(h(gen.CoworkPanelMergedContext.Provider, { value: true },
    h(gen.CoworkPanelLayoutContext.Provider, { value: gen.coworkPanelFlatLayout },
      h(gen.CoworkPanel, { shrinkSections: true },
        h(gen.CoworkOutputsSection, { headerHostedToggle: false, isArtifactsExpanded: true, setIsArtifactsExpanded: setState, artifactsSeedSnap: false,
          conversationUuid: 's1', sessionId: 's1', handleOpenFileExplorer() {}, handleOpenFolder() {}, setIsFolderInstructionsModalOpen() {},
          handleOutputsActivityClick() {}, selectedPath: null, isFolderExpanded: (folder, index) => outputsModel.coworkFolderExpanded(state, folder, index),
          toggleFolder() {}, nonFileOutputHandlers: undefined, isScratchpadExpanded: false, setIsScratchpadExpanded() {}, isOfficeFilesExpanded: true,
          setIsOfficeFilesExpanded() {}, resourceActivity: data.resourceActivity, handleOpenWorkingDocument() {}, handleOpenWorkingDocDraft() {},
          isTranscriptHydrated: true, watercolorHeld: false, maxContentHeight: '24rem', panelShown: true, ...data, ...extra })))));
}

test('SSR: one working folder with outputs — "Working folder", Go to folder, the official file rows; Browse files behind its gate', () => {
  const data = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/report.md', `${cwd}/outputs/data.csv`)] });
  const html = outputs(data);
  const words = text(html);
  assert.match(words, /^Working folder /, words);
  assert.ok(html.includes('aria-label="Go to folder"'), 'xT Go to folder (EAUt85Zlu/)');
  assert.ok(!html.includes('aria-label="Browse files"'), 'claudeai_cowork_file_explorer_main is off by default');
  assert.ok(words.includes('Report MD') && words.includes('Data CSV'), words);
  assert.ok(!words.includes('View and open files created during this task.'));
  // E67 (w13-close-cowork-ui): the config answer is the host constant (on) and the bridge has writeLocalFile (main
  // "cowork-claude-md"), so the single-folder header shows the "Instructions · CLAUDE.md" row.
  assert.match(words, /Instructions · CLAUDE\.md/);
  assert.ok(html.includes('class="flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 hover:bg-surface-0 w-full text-start"'));
  assert.ok(!words.includes('Download all'), 'local files have no uuid / url, so nothing is downloadable');
  const gated = outputs(outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/report.md')],
    gates: { [outputsModel.FILE_EXPLORER_GATE]: true }, fileSystem: { listFilesInFolder() {} } }));
  assert.ok(gated.includes('aria-label="Browse files"') && gated.includes('aria-label="Go to folder"'));
});

test('SSR: more than one downloadable output — Lb "Download all" replaces the folder buttons', () => {
  const data = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/a.md', 'outputs/b.md')] });
  const html = outputs(data, { downloadableOutputs: [{ filePath: `${cwd}/outputs/a.md`, fileUuid: 'u1' }, { filePath: `${cwd}/outputs/b.md`, fileUuid: 'u2' }] });
  assert.ok(html.includes('aria-label="Download all"'), 'Lb (V1UrPNM96z)');
  assert.ok(!html.includes('aria-label="Go to folder"'));
});

test('SSR: no outputs — bT inside a working folder, yT (with its art) without one', () => {
  const inFolder = outputs(outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [] }));
  assert.ok(text(inFolder).includes('View and open files created during this task.'));
  assert.ok(!inFolder.includes('session-artifacts.svg'), 'bT is the text-only empty state');
  const noFolder = outputs(outputsModel.coworkOutputsData({ sessionId: 's1', items: [] }));
  assert.ok(text(noFolder).includes('View and open files created during this task.') && noFolder.includes('session-artifacts.svg'), 'yT');
  assert.ok(!noFolder.includes('aria-label="Go to folder"'));
});

test('SSR: several working folders — "Working folders", folder group headers, no Go to folder', () => {
  const data = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/a.md', '/Users/me/Other/b.md')] });
  const multi = { ...data, userSelectedFolders: [cwd, '/Users/me/Other'], hasMultipleFolders: true };
  multi.outputsByFolder = outputsModel.coworkOutputsByFolder(data.resourceActivity, multi.userSelectedFolders);
  multi.outputResourcesActivity = data.resourceActivity;
  const html = outputs(multi);
  const words = text(html);
  assert.match(words, /^Working folders /, words);
  // xT's header Go to folder (EAUt85Zlu/) is single-folder only; each host-device folder group (tT) has its own (Fk7Y4kOEei).
  assert.equal(html.split('aria-label="Go to folder"').length - 1, 2, html);
  assert.ok(official('c21f11e6d-Cyd8_HO8.js').includes('{defaultMessage:"Go to folder",id:"Fk7Y4kOEei"}'));
  assert.ok(words.includes('Project') && words.includes('Other'), words);
});

test('the official xT / kT / Bb text the section and its dialogs render', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js');
  for (const s of ['className:"flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 hover:bg-surface-0 w-full text-start"', 'children:" \\u00B7 CLAUDE.md"',
    '{defaultMessage:"Working folders",id:"LtMr5Lrv6p"}', '{defaultMessage:"Working folder",id:"jNSi3V9hUE"}', '{defaultMessage:"Go to folder",id:"EAUt85Zlu/"}',
    '{defaultMessage:"Download all",id:"V1UrPNM96z"}', '{defaultMessage:"Folder instructions",id:', '{defaultMessage:"Folder is empty.",id:"pa7QxJsSrk"}',
    '{defaultMessage:"Select a file to preview it.",id:"L5iA0EgL/u"}', '{defaultMessage:"Failed to save changes. You can try again.",id:"ielWbYQkat"}',
    'Pe("claudeai_cowork_file_explorer_main")', 'enableAdditionalDirectoriesClaudeMd??!1'])
    assert.ok(c21.includes(s) || c21.includes(s.replace('Pe(', '')), s);
  const out = local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs');
  assert.ok(out.includes('"flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 hover:bg-surface-0 w-full text-start"'));
  assert.ok(out.includes('" \\u00B7 CLAUDE.md"'));
  assert.ok(out.includes('_t?.writeLocalFile'), 'the CLAUDE.md row keeps the official bridge condition');
  assert.equal(typeof gen.CoworkFolderInstructionsDialog, 'object');
  assert.equal(typeof gen.CoworkFileBrowserDialog, 'object');
});

test('SSR: the file browser Bb (closed, one folder; open without folders is null) and the folder instructions dialog kT (closed)', () => {
  const browser = renderToStaticMarkup(h(gen.CoworkFileBrowserDialog, { isOpen: false, onClose() {}, folders: [cwd], sessionId: 's1' }));
  assert.equal(typeof browser, 'string');
  assert.equal(renderToStaticMarkup(h(gen.CoworkFileBrowserDialog, { isOpen: true, onClose() {}, folders: [], sessionId: 's1' })), '', 'no folders: null');
  const dialog = renderToStaticMarkup(h(gen.CoworkFolderInstructionsDialog, { isOpen: false, setIsOpen() {}, folderPath: cwd, sessionId: 's1' }));
  assert.equal(typeof dialog, 'string');
});

// w13-close-gen-dedup (coworkui-outputs-03): the CLAUDE.md row needs both the config value and the bridge's writeLocalFile;
// the dialogs' open states.
test('SSR: the CLAUDE.md row shows with the config on and the bridge\'s writeLocalFile (E67), and hides with the config off', () => {
  const on = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/report.md')] });
  assert.equal(on.enableAdditionalDirectoriesClaudeMd, true, 'the host answer COWORK_CLAUDE_MD_CONFIG');
  assert.ok(outputs(on).includes(' · CLAUDE.md'), 'config on, FileSystem with writeLocalFile');
  const off = outputsModel.coworkOutputsData({ cwd, sessionId: 's1', items: [changeItem('a', 'outputs/report.md')],
    gates: { [outputsModel.CLAUDE_MD_CONFIG_KEY]: false } });
  assert.equal(off.enableAdditionalDirectoriesClaudeMd, false);
  assert.ok(!outputs(off).includes('CLAUDE.md'));
  // Both xT branches (the single-folder header and the folder group tT) test the config and the bridge together.
  const out = local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs');
  assert.equal(out.split('_t?.writeLocalFile &&').length - 1, 2);
  assert.deepEqual(manifest.gates.map(g => g.key), ['claudeai_cowork_file_explorer_main', 'enableAdditionalDirectoriesClaudeMd']);
  for (const gate of manifest.gates) for (const r of gate.raw) assert.equal(official(r.source).split(r.feature).length - 1, 1, r.feature);
});

test('SSR: the file browser Bb open over one folder and the folder instructions dialog kT open render through their portals', () => {
  // Both are CDS dialogs (a Base UI portal): the server renders the open tree without throwing and emits nothing in place;
  // their copy is pinned on the generated text instead.
  assert.equal(renderToStaticMarkup(h(gen.CoworkFileBrowserDialog, { isOpen: true, onClose() {}, folders: [cwd], sessionId: 's1' })), '');
  assert.equal(renderToStaticMarkup(h(gen.CoworkFolderInstructionsDialog, { isOpen: true, setIsOpen() {}, folderPath: cwd, sessionId: 's1' })), '');
  const out = local('src/generated/cowork-progress/c21f11e6d-Cyd8_HO8.mjs');
  for (const s of ['event_key: "cowork.file_explorer.opened"', 'defaultMessage: "Folder is empty."', 'defaultMessage: "Select a file to preview it."',
    'defaultMessage: "Failed to save changes. You can try again."'])
    assert.ok(out.includes(s), s);
});
