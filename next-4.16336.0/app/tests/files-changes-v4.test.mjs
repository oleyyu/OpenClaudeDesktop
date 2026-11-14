// Region batch 3 (4.16336.0 migration, region-plan batches[3] files-changes, large-split): files-changes keeps its
// 3.6556.2 production graph byte for byte (13 generated areas and ~30 host files still import it by original identity,
// cutover.oldConsumersAtGeneration, productionSwitchNotBeforeBatch 11) and gains an isolated 4.16336.0 graph,
// src/generated/files-changes-v4, cut by the same generator (second source contract) from the frozen snapshot over
// cds-core, linking routines-shared-v4 (a region-plan dependency) and r3b-tasks (shared-0 Tl owner) instead of cutting
// their bindings again (D1).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contractVersions, contract4, extractFilesChanges, extractTarget4 } from '../scripts/extract-files-changes.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const gen = path.join(app, 'src/generated');
const out = path.join(gen, 'files-changes-v4');
const legacyOut = path.join(gen, 'files-changes');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const exportTable = name => new Map([...chunk(name).matchAll(/export\{([^}]*)\}/g)].at(-1)[1].split(',').map(pair => pair.split(' as ')).map(([local, alias]) => [alias ?? local, local]));
const h = React.createElement;
const LEGACY_CONSUMERS = ['code-current', 'code-transcript', 'composer-notices', 'cowork-approval', 'cowork-progress', 'pierre-changes', 'proposal-group',
  'session-rail', 'session-rail-changes', 'session-rail-sections', 'sessions-page', 'sidebar-hover-card', 'transcript-rows'];

// W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
// router store (reads window.location.pathname at load), as in the app.
globalThis.window ??= { location: { pathname: '/' }, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {}, removeEventListener() {} };
// W8S-T5 stub contract (design class c): since cds-core wave 8s shared-0 GX (`new UX()`, the analytics anonymous id) reads
// document.cookie at load (Wo), as in the app; with a document the cds-core preload helper probes link relList at load too.
// The same minimal document chat-markdown-v4 uses (cds-wave8 (c)).
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };

const server = await createServer({ configFile: false, root: app, plugins: [react()],
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
i18n.setLocale('en-US');
after(async () => { i18n.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });
const load = target => server.ssrLoadModule(`/src/generated/files-changes-v4/${target}`);

test('two source contracts: 3.6556.2 production (unchanged, still linked by its consumers) and the 4.16336.0 isolated graph, both --check', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', '4.16336.0']);
  await extractFilesChanges({ check: true });
  const v4 = await extractFilesChanges({ check: true, version: '4.16336.0' });
  assert.equal(v4.modules.length, manifest.modules.length);
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.equal(legacy.modules.length, 67);
  for (const m of legacy.modules) assert.equal(sha(readFileSync(path.join(legacyOut, m.target))), m.sha256, m.target);
  // (a) The 3.6556.2 consumer areas still import the legacy folder by original identity and never the isolated graph.
  for (const area of LEGACY_CONSUMERS) {
    const dir = path.join(gen, area);
    const texts = readdirSync(dir).filter(f => /\.m?js$/.test(f)).map(f => readFileSync(path.join(dir, f), 'utf8')).join('\n');
    assert.match(texts, /from "\.\.\/files-changes\//, area);
    assert.doesNotMatch(texts, /files-changes-v4/, area);
  }
  // (b) Other (4.16336.0) graphs may link the isolated graph (session-rail-kit-v4 does), but only to a target this
  // manifest declares and only under a name that target exports; a consumer that pins the linked bytes
  // (linkedGraphModules) must still match them, so regenerating here cannot silently break its --check.
  const v4Exports = new Map(manifest.modules.map(m => {
    const names = new Set();
    for (const mm of readFileSync(path.join(out, m.target), 'utf8').matchAll(/export \{([^}]*)\}/g))
      for (const s of mm[1].split(',').map(x => x.trim()).filter(Boolean)) names.add(s.split(/\s+as\s+/).at(-1));
    return [m.target, names];
  }));
  for (const dir of readdirSync(gen).filter(d => d !== 'files-changes-v4' && !d.endsWith('.json') && !LEGACY_CONSUMERS.includes(d))) {
    for (const f of readdirSync(path.join(gen, dir)).filter(f => /\.m?js$/.test(f))) {
      const text = readFileSync(path.join(gen, dir, f), 'utf8');
      if (!text.includes('files-changes-v4')) continue;
      const links = [...text.matchAll(/(?:import|export)\s*\{([^}]*)\}\s*from\s*"\.\.\/files-changes-v4\/([^"]+)"/g)];
      assert.equal(text.split('files-changes-v4').length - 1, links.length, `${dir}/${f}: every files-changes-v4 reference is a named import/re-export`);
      for (const [, list, target] of links) {
        assert.ok(v4Exports.has(target), `${dir}/${f}: ../files-changes-v4/${target} is not a declared target`);
        for (const name of list.split(',').map(x => x.trim()).filter(Boolean).map(s => s.split(/\s+as\s+/)[0]))
          assert.ok(v4Exports.get(target).has(name), `${dir}/${f}: ${target} does not export ${name}`);
      }
    }
    const mpath = path.join(gen, dir, 'manifest.json');
    let consumer = null;
    try { consumer = JSON.parse(readFileSync(mpath, 'utf8')); } catch { continue; }
    for (const [target, sum] of Object.entries(consumer.linkedGraphModules ?? {}).filter(([t]) => t.startsWith('files-changes-v4/')))
      assert.equal(sha(readFileSync(path.join(gen, target))), sum, `${dir} pins ${target}`);
  }
});

test('the isolated graph: 4.16336.0 bytes, pinned sources, and only React / cds-core / linked v4 areas / named host adapters', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(Object.keys(manifest.linkedAreas), ['routines-shared-v4', 'r3b-tasks']);
  assert.equal(manifest.isolatedGraph.legacyOutput, 'src/generated/files-changes');
  assert.equal(manifest.isolatedGraph.productionSwitchNotBeforeBatch, 11);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  const allowedHosts = ['../../source-files-changes-adapters.jsx', '../../cds-core-adapter.mjs'];
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, '4.16336.0', m.target);
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    const text = readFileSync(path.join(out, m.target), 'utf8');
    assert.equal(m.sha256, sha(text), m.target);
    assert.match(text, /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /, m.target);
    assert.doesNotMatch(text, /\.\.\/view-tabs\/|\.\.\/files-changes\/|\.\.\/routines-shared\/|\.\.\/code-current\//, m.target);
    for (const [, from] of text.matchAll(/ from "([^"]+)";$/gm))
      assert.ok(/^(react|react\/jsx-runtime|react-dom)$|^\.\/[\w-]+\.mjs$|^\.\.\/(cds-core|routines-shared-v4|r3b-tasks)\/[\w.-]+\.mjs$/.test(from) || allowedHosts.includes(from), `${m.target}: ${from}`);
  }
  // Host answers: existing exports of the files-changes adapter (persisted values, LocalSessions, local session target)
  // and the host i18n adapter cds-core uses.
  assert.deepEqual(manifest.hosts.map(x => `${x.original}->${x.name}`), [
    'c7fa71d26-Db91ge0c.js#r->localSessionTarget', 'shared-0-CnnWnVrT.js#qO->LocalSessions', 'shared-5-u8kha2eH.js#I_->persistedValuesLoading',
    'shared-5-u8kha2eH.js#L_->readPersistedValue', 'shared-5-u8kha2eH.js#U_->usePersistedValue', 'shared-5-u8kha2eH.js#z_->writePersistedValue',
    'vendor-intl-BJgYK7RA.js#Gt->HostFormattedMessage', 'vendor-intl-BJgYK7RA.js#q->useHostIntl']);
});

test('every root is the binding its 4.16336.0 chunk exports under the pinned alias, or a private one', () => {
  let count = 0;
  for (const m of manifest.modules.filter(x => x.roots)) {
    const table = exportTable(m.source);
    for (const [local, alias] of Object.entries(m.roots)) {
      count++;
      if (alias === null) assert.ok(![...table.values()].includes(local), `${m.source}#${local} is private`);
      else assert.equal(table.get(alias), local, `${m.source} exports ${alias} as ${local}`);
    }
  }
  assert.ok(count >= 150, `${count} roots`);
  const roots = target => manifest.modules.find(m => m.target === target).roots;
  // Sample of the 3.6556.2 -> 4.16336.0 moves the contract proves (region-plan v4Roots agree).
  assert.deepEqual(roots('session-context.mjs'), { t: 't' });
  assert.deepEqual(roots('file-type-icon.mjs'), { V: 't' });
  assert.deepEqual(roots('diff-tree-tooltip.mjs'), { _a: 'b', pa: 'x' });
  assert.deepEqual(Object.entries(roots('file-browser-query.mjs')).slice(0, 2), [['Ve', 'm'], ['He', 'f']]);
  assert.deepEqual(roots('diff-context-guard.mjs'), { F: '_' });
  // The 3.6556.2 app-list-row.mjs has no 4.16336.0 counterpart: "h-control app-list-row" left the snapshot.
  assert.ok(!manifest.modules.some(m => m.target === 'app-list-row.mjs'));
  assert.ok(!readdirSync(official.ionSource).some(f => f.endsWith('.js') && chunk(f).includes('app-list-row')));
});

test('D1: cds-core publicNames and the dependency areas\' bindings are linked, never cut again; cds-core re-exports', () => {
  const linked = new Set();
  for (const area of Object.keys(manifest.linkedAreas)) {
    const lm = JSON.parse(readFileSync(path.join(gen, area, 'manifest.json'), 'utf8'));
    for (const m of lm.modules) for (const b of m.bindings ?? []) linked.add(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`);
  }
  const core = JSON.parse(readFileSync(path.join(gen, 'cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(core.publicNames).map(e => `${e.file}#${e.local}`));
  for (const m of manifest.modules) for (const b of m.bindings) {
    const key = `${m.source}#${b.name}`;
    assert.ok(!published.has(key), `${key} is a cds-core publicName`);
  }
  const lmRS = JSON.parse(readFileSync(path.join(gen, 'routines-shared-v4/manifest.json'), 'utf8'));
  const rsExported = new Set();
  for (const m of lmRS.modules) {
    const text = readFileSync(path.join(gen, 'routines-shared-v4', m.target), 'utf8');
    for (const mm of text.matchAll(/export \{([^}]*)\}/g)) for (const s of mm[1].split(',').map(x => x.trim()).filter(Boolean)) rsExported.add(`${path.basename(m.source)}#${s.split(/\s+as\s+/)[0]}`);
  }
  for (const m of manifest.modules) for (const b of m.bindings) assert.ok(!rsExported.has(`${m.source}#${b.name}`), `${m.source}#${b.name} is routines-shared-v4's`);
  const imports = manifest.modules.flatMap(m => m.imports);
  assert.ok(imports.some(i => i.from === '../r3b-tasks/lazy-value.mjs' && i.name === 'lazyValue'));
  assert.ok(imports.filter(i => i.kind === 'linked-area').every(i => /^[0-9a-f]{64}$/.test(i.linkedSha256)));
  assert.ok(imports.filter(i => i.kind === 'shared-graph').every(i => i.publicName && /^[0-9a-f]{64}$/.test(i.linkedSha256)));
  // The 3.6556.2 view-tabs re-exports are cds-core's single copies now.
  assert.match(readFileSync(path.join(out, 'event-element.mjs'), 'utf8'), /export \{ asElementNode as elementTarget \} from "\.\.\/cds-core\/shared-frame\.mjs";/);
  assert.match(readFileSync(path.join(out, 'menu-item-classes.mjs'), 'utf8'), /export \{ cdsMenuItemClass as menuItemClasses \} from "\.\.\/cds-core\/shared-frame\.mjs";/);
  assert.match(readFileSync(path.join(out, 'owner-window.mjs'), 'utf8'), /export \{ ownerWindow \} from "\.\.\/cds-core\/shared-25\.mjs";/);
  assert.match(readFileSync(path.join(out, 'physical-side.mjs'), 'utf8'), /export \{ Cb as physicalSide \} from "\.\.\/routines-shared-v4\/shared-33-DtdykY0y\.mjs";/);
  for (const [target, sum] of Object.entries(manifest.sharedGraphModules)) assert.equal(sha(readFileSync(path.join(gen, 'cds-core', target))), sum, target);
  for (const [target, sum] of Object.entries(manifest.linkedGraphModules)) assert.equal(sha(readFileSync(path.join(gen, target))), sum, target);
});

test('4.16336.0 behaviour of the pure exports (incl. the changed change-anchor rule)', async () => {
  const nav = await load('diff-change-nav.mjs');
  // 4.16336.0: one anchor per change run (a run of adjacent change blocks), `startsWithRemoval` instead of `removes`.
  const anchors = nav.changeAnchors('f', { hunks: [{ deletionStart: 1, deletionCount: 1, additionStart: 1, additionCount: 2,
    hunkContent: [{ type: 'change', additions: 1, deletions: 1 }, { type: 'change', additions: 1, deletions: 0 }, { type: 'context', lines: 2 }, { type: 'change', additions: 1, deletions: 0 }] }] });
  assert.deepEqual(anchors, [
    { id: 'f', side: 'additions', lineNumber: 1, oldLine: 1, newLine: 1, startsWithRemoval: true },
    { id: 'f', side: 'additions', lineNumber: 5, oldLine: 4, newLine: 5, startsWithRemoval: false }]);
  assert.equal(nav.adjacentChange(anchors, ['f'], { last: anchors[0] }, 1), anchors[1]);
  const scope = await load('diff-scope-memory.mjs');
  assert.equal(scope.diffScopeKey({ kind: 'commit', sha: 'abc' }), 'commit:abc');
  assert.ok(scope.sameDiffScope(scope.branchDiffScope, { kind: 'branch' }));
  assert.equal(scope.uncommittedSessionsKey, 'epitaxy-diff-uncommitted-sessions');
  assert.deepEqual((await load('folder-list-key.mjs')).folderListQueryKey('s', 'local'), ['epitaxy-file-browser-tree', 's', 'local']);
  assert.deepEqual((await load('file-content-results.mjs')).collapseContentWhitespace('a   b', [{ start: 4, end: 5 }]), { text: 'a b', matches: [{ start: 2, end: 3 }] });
  assert.deepEqual((await load('file-frontmatter.mjs')).splitFrontmatter('---\ntitle: x\n---\nbody'), { fields: [{ key: 'title', value: 'x' }], body: 'body' });
  const within = await load('path-within.mjs');
  assert.equal(within.joinPath('C:\\r', 'a/b'), 'C:\\r\\a\\b');
  assert.equal(within.pathWithinRoot('/r/a/b', '/r'), 'a/b');
  assert.equal((await load('physical-side.mjs')).physicalSide('inline-start', 'rtl'), 'right');
  assert.equal((await load('file-kind-icon-name.mjs')).fileKindIconName('x.csv'), 'Spreadsheet');
  const order = await load('file-entry-order.mjs');
  assert.deepEqual([{ name: 'b', isDirectory: false }, { name: 'a10', isDirectory: true }, { name: 'a9', isDirectory: true }].sort(order.compareFileEntries).map(e => e.name), ['a9', 'a10', 'b']);
  assert.deepEqual((await load('popover-collision-padding.mjs')).popoverCollisionPadding, { top: 48, right: 8, bottom: 8, left: 8 });
  const gone = await load('file-gone-check.mjs');
  assert.equal(gone.fileGoneKillSwitch, '__gb__3212098161');
  assert.equal(gone.fileGoneDeadlineMs, 150);
  assert.equal(gone.goneCheckablePath('/Users/me/Library/CloudStorage/x'), false);
  assert.equal(gone.goneCheckablePath('/Users/me/src/x'), true);
  const drag = await load('file-context-drag.mjs');
  assert.equal(drag.fileContextDragType, 'application/x-claude-file-context');
  // No GrowthBook client (routines-shared-v4's shared-0 reader answers null): the "__gb__3508862586" rollout keeps its default.
  assert.equal(drag.fileContextDragEnabled(), true);
  const sel = await load('file-selection.mjs');
  const store = sel.createFileSelectionStore();
  store.getState().selectOnly({ absPath: '/a' });
  assert.equal(sel.inMultiSelection(store, '/a', true), false);
});

test('SSR: the 4.16336.0 components render through cds-core (en-US and zh-CN)', async () => {
  const { Frontmatter } = await load('file-frontmatter-view.mjs');
  const fm = renderToStaticMarkup(h(Frontmatter, { frontmatter: { fields: [{ key: 'title_x', value: 'Hi' }] } }));
  assert.match(fm, /<dt class="text-footnote text-muted-as-secondary">Title x<\/dt>/);
  const { PathSegments, NameThenFolder } = await load('path-segments.mjs');
  assert.match(renderToStaticMarkup(h(PathSegments, { path: '/a/b/c.txt' })), /<span class="min-w-0 truncate">\/a\/b\/<\/span><span class="max-w-full shrink-0 truncate">c\.txt<\/span>/);
  assert.match(renderToStaticMarkup(h(NameThenFolder, { path: '/a/b/c.txt' })), /data-\[clipped\]:opacity-0/);
  const { FolderTree } = await load('file-tree-compact.mjs');
  const tree = renderToStaticMarkup(h(FolderTree, { entries: [{ name: 'src', path: '/r/src', isDirectory: true }, { name: 'a.md', path: '/r/a.md', isDirectory: false }],
    onLoadChildren: async () => [], variant: 'compact' }));
  assert.match(tree, /data-folder-tree="true"/);
  assert.match(tree, /rounded focus-visible:shadow-focus/);
  const { WorktreeChecking } = await load('worktree-checking.mjs');
  const { RetryButton } = await load('retry-button.mjs');
  assert.match(renderToStaticMarkup(h(WorktreeChecking, { hold: 'reveal' })), /Checking for uncommitted changes…/);
  assert.match(renderToStaticMarkup(h(RetryButton, { size: 'sm', onRetry: async () => true, failedLabel: 'failed' })), /data-cds="Button"[^>]*>.*Try again/s);
  i18n.setLocale('zh-CN');
  try {
    assert.match(renderToStaticMarkup(h(RetryButton, { size: 'sm', onRetry: async () => true, failedLabel: 'failed' })), /重试/);
  } finally { i18n.setLocale('en-US'); }
});

test('generation stops: a re-pointed alias, a non-unique root, an empty identity rule, and cds-core module state without a name (D46)', async () => {
  const one = (target, patch) => ({ ...contract4, modules: [{ ...contract4.modules.find(m => m.target === target), ...patch }] });
  const base = contract4.modules.find(m => m.target === 'diff-scope-memory.mjs');
  await assert.rejects(extractTarget4(one('diff-scope-memory.mjs', { aliases: { ...base.aliases, $n: 'Pr' } }), { check: true }), /exports Pr as er, not \$n/);
  await assert.rejects(extractTarget4(one('diff-scope-memory.mjs', { features: { ...base.features, Yn: ['return'] } }), { check: true }),
    /root Yn is not the unique declaration with its features \(.*,.*\)/);
  await assert.rejects(extractTarget4(one('diff-scope-memory.mjs', { identity: { ...base.identity, Zn: { readBy: [] } } }), { check: true }), /identity\.readBy must list/);
  const core = JSON.parse(readFileSync(path.join(gen, 'cds-core/manifest.json'), 'utf8'));
  if (Object.values(core.publicNames).some(e => e.file === official.sharedFrame && e.local === 'Ic')) return; // named since: nothing left to prove here
  // shared-frame Rc (private; cds-core holds it but publishes no name, so it is re-cut hash-equal) reads Ic, a WeakMap
  // cds-core holds without a publicName: generation must stop and name it instead of making a second copy.
  const d46 = { ...contract4, modules: [{ target: 'probe.mjs', source: official.sharedFrame, exports: { Rc: 'probe' }, aliases: { Rc: null },
    features: { Rc: [official.looseFeature('return Ic.get(e);', { keep: ['Ic'] })] }, identity: {} }] };
  const error = await extractTarget4(d46, { check: true }).then(() => null, e => e);
  assert.match(error?.message ?? '', /module state cds-core holds without a semantic name \(D46\): shared-frame-CJdE5Ria\.js#Ic/);
  assert.ok(error.stateConflicts.some(c => c.binding === `${official.sharedFrame}#Ic` && /new WeakMap\(\)/.test(c.text)), JSON.stringify(error.stateConflicts));
});
