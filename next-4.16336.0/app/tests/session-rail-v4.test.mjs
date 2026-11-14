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
import {
  extractSessionRailV4, ROOTS, ROOT_PINS, HOST_ADAPTERS, ADAPTER_PINS, PENDING_ROOTS, LINKED_AREA_NAMES, CDS_CORE_MANIFEST_SHA256,
} from '../scripts/extract-session-rail-v4.mjs';

// account2 batch 6, region session-rail: the 4.16336.0 session rail roots (the Code session's "Session details" aside
// derivations, save-environment rows, the sleep / kept-awake bands, BandFrame and the InlineBand the rail module owns),
// scripts/extract-session-rail-v4.mjs -> src/generated/session-rail-v4, staged next to the 3.6556.2
// src/generated/session-rail the host still renders. Source only: manifest, the generator's --check, the official chunk
// text, D1 links, the pure derivations driven against the 3.6556.2 graph's same roots, and Vite SSR of the band frame and
// the edit-environment button (no browser, no Electron, no network, no real storage).
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/session-rail-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const areaName = a => (typeof a === 'string' ? a : a.area);

let previousWindow, previousDocument, server, gen, Old, OldEdit, OldTiming;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  const storage = new Map();
  // W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo (read document.cookie at load) and the shared-25
  // router store (reads window.location.pathname at load), as in the app.
  // W8 stub contract (design class c): cds-core now holds shared-92 cS, which reads documentElement.hasAttribute at load.
  globalThis.document = { cookie: '', createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { hasAttribute: () => false, getAttribute: () => null } };
  globalThis.window = { location: { pathname: '/' }, addEventListener() {}, removeEventListener() {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, String(value)); }, removeItem: key => { storage.delete(key); } }, matchMedia: undefined, document: globalThis.document };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  Old = await server.ssrLoadModule('/src/generated/session-rail/rail-derive.mjs');
  OldEdit = await server.ssrLoadModule('/src/generated/session-rail/environment-edit.mjs');
  OldTiming = await server.ssrLoadModule('/src/generated/session-rail/rail-timing.mjs');
});
after(async () => {
  await closeWhenSettled(server); await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-session-rail-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-session-rail-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(areaName), LINKED_AREA_NAMES);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const area of LINKED_AREA_NAMES)
    assert.equal(provenance.linkedAreas[area], sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), area);
  // R4-RW8-SR (round4 relink-w8): SessionRail's closure adds seven chunks (c280f9bbb, c5304ebdb, c8104f35e, caf3f05b8,
  // cd8a7d7c0, shared-153, shared-36; dnd-kit linked from queued-bar-v4); was 22.
  assert.equal(manifest.modules.length, 29);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  assert.deepEqual(manifest.callSites, []);
  await extractSessionRailV4({ check: true });
});

// 4.16336.0 rail cutover (2026-11-13): the docked rail body is now the v4 SessionRail (cf74bc599 sN), imported by
// src/source-session-rail.jsx only; the 3.6556.2 directory stays the old generator's (save-environment, environment-edit,
// RepoNameChip and the band still read it), and no other host file imports the v4 graph.
test('double output after the rail cutover: the 3.6556.2 directory is still the old generator\'s, only source-session-rail.jsx imports the v4 graph', () => {
  const old = JSON.parse(local('src/generated/session-rail/manifest.json'));
  assert.notEqual(old.referenceVersion, '4.16336.0');
  assert.equal(provenance.previous.output, 'src/generated/session-rail');
  assert.match(local('src/source-session-rail.jsx'), /from "\.\/generated\/session-rail-v4\/index\.mjs"/);
  for (const file of ['src/main.jsx', 'src/source-sleep-notice.jsx'])
    if (fs.existsSync(path.join(app, file))) assert.doesNotMatch(local(file), /session-rail-v4/, file);
});

test('roots: every semantic name AST-located and pinned; the emitted ones exported by index.mjs, the pending ones held back', () => {
  const expected = Object.entries(ROOTS).flatMap(([file, roots]) => Object.entries(roots).map(([l, r]) => `${file}#${l}=${r.name}`));
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), expected);
  // R4-RW8-SR (round4 relink-w8): RepoNameChip (OE) moved to session-rail-changes-v4, which holds it (was 38).
  assert.equal(provenance.roots.length, 37);
  assert.ok(provenance.roots.every(r => r.pinned && ROOT_PINS[`${r.file}#${r.local}`] === r.declarationSha256), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  // R4-RW8-SR (round4 relink-w8): nothing is pending any more (was ['RepoNameChip', 'SessionRail'], held on c280f9bbb L).
  assert.deepEqual(Object.keys(PENDING_ROOTS), []);
  assert.deepEqual(provenance.pendingRoots, []);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
  assert.equal(typeof gen.SessionRail, 'object', 'SessionRail (cf74bc599 sN, a memo) is emitted');
  // SessionRail links shared-frame _D (renderMenuItems) from cds-core (published in wave 7), never cuts it.
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  assert.deepEqual(cds.publicNames.renderMenuItems && [cds.publicNames.renderMenuItems.file, cds.publicNames.renderMenuItems.local], ['shared-frame-CJdE5Ria.js', '_D']);
  assert.ok(!manifest.modules.some(m => m.source === 'shared-frame-CJdE5Ria.js'), 'no shared-frame slice');
  // RepoNameChip (OE) and its child context (DE) come from session-rail-changes-v4, their one holder (exported there as
  // roots, AST-located under the same pin db99bd66… the held root had here).
  const changes = JSON.parse(local('src/generated/session-rail-changes-v4/manifest.json')).modules.find(m => m.target === 'c96d752d0.mjs');
  assert.equal(changes.exports.OE, 'RepoNameChip');
  assert.equal(changes.exports.DE, 'InRepoNameChipContext');
  const imports = manifest.modules.flatMap(m => m.imports);
  assert.ok(imports.some(i => i.kind === 'linked' && i.from === '../session-rail-changes-v4/c96d752d0.mjs' && i.name === 'RepoNameChip'), 'RepoNameChip linked');
  assert.ok(imports.some(i => i.kind === 'linked' && i.from === '../session-rail-changes-v4/c96d752d0.mjs' && i.name === 'InRepoNameChipContext'), 'InRepoNameChipContext linked');
  assert.ok(!manifest.modules.some(m => m.source === 'c96d752d0-D9VB6ArX.js'), 'c96d752d0 is not cut here');
  // c280f9bbb L, the old blocker: files-changes-v4 still slices it without an export; here it is a declared pure linked copy
  // whose context (c17ed8826 t) is linked from files-changes-v4.
  const fc = JSON.parse(local('src/generated/files-changes-v4/manifest.json')).modules.find(m => m.target === 'file-type-icon.mjs');
  assert.ok(fc.bindings.some(b => b.name === 'L') && !Object.keys(fc.exports ?? {}).includes('L') && !(fc.linkExports ?? []).includes('L'), 'L is sliced there without an export');
  assert.ok(Object.hasOwn(provenance.linkedCopies, 'c280f9bbb-BOcpax9X.js#L'));
  assert.ok(imports.some(i => i.kind === 'linked' && i.from === '../files-changes-v4/file-type-icon-context.mjs' && i.name === 'FileTypeIconSetContext'), 'icon set context linked');
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  // R4-RW8-SR: + shared-62 Ha loadPublicSuffixList, the cowork-live-v4 / cowork-approval-v4 answer (was 43).
  assert.equal(provenance.adapters.length, 44);
  assert.ok(provenance.adapters.every(a => a.pinned && ADAPTER_PINS[a.original] === a.declarationSha256));
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-session-rail-v4-adapters.jsx');
  const adapterText = local('src/source-session-rail-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default|let|var)/m, 'no new implementation');
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    // R4-RW8-SR: + './source-code-transcript-adapters.jsx' (loadPublicSuffixList; was the first three only).
    ['./source-session-rail-kit-adapters.jsx', './source-session-rail-adapters.jsx', './source-routines-shared-adapters.jsx', './source-code-transcript-adapters.jsx']);
  const reexported = new Set([...adapterText.matchAll(/export \{([^}]*)\}/g)].flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean)));
  assert.deepEqual([...reexported].sort(), [...new Set(Object.values(HOST_ADAPTERS).map(a => a.name))].sort());
});

test('D1: nothing a linked area or cds-core holds is cut again; dnd-kit and the Base UI menu are not sliced here', () => {
  const held = new Map();
  for (const area of [...LINKED_AREA_NAMES, 'cds-core']) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) if (mod.source) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${mod.source}#${typeof b === 'string' ? b : b.name}`));
  // The only bindings cut again are the declared linked copies, each pure (no module state): shared-18 rJ (code-current-v4)
  // and c280f9bbb L (files-changes-v4; R4-RW8-SR, was rJ only).
  assert.deepEqual(own.filter(k => held.has(k)).sort(), Object.keys(provenance.linkedCopies).sort());
  assert.equal(held.get('shared-18-Cfqwgjc5.js#rJ'), 'code-current-v4');
  assert.equal(held.get('c280f9bbb-BOcpax9X.js#L'), 'files-changes-v4');
  assert.ok(!manifest.modules.some(m => /^(c09f6b4e5|vendor-frame|shared-frame)-/.test(m.source)), 'no dnd-kit / vendor-frame / shared-frame slice');
  // R4-RW8-SR: SessionRail reads dnd-kit; all of it (the nine module-state bindings and the five pure helpers) is imported from
  // queued-bar-v4, its one holder.
  const qb = JSON.parse(local('src/generated/queued-bar-v4/manifest.json')).modules.find(m => m.source === 'c09f6b4e5--ahaSfV5.js');
  const dndLinked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked' && i.from === `../queued-bar-v4/${qb.target}`).map(i => i.name));
  assert.ok(dndLinked.length > 0, 'dnd-kit linked from queued-bar-v4');
  // queued-bar-v4 exports dnd-kit through linkExports (module state + the five pure helpers) and sharedExports (the names its
  // own graph already shared); every name linked here is one of them.
  const qbExported = new Set([...qb.linkExports, ...(qb.sharedExports ?? [])]);
  for (const l of dndLinked) assert.ok(qbExported.has(l), l);
  // The linked copies (R4-RW8-SR adds c280f9bbb L; was ['shared-18-Cfqwgjc5.js#rJ']).
  assert.deepEqual(Object.keys(provenance.linkedCopies), ['shared-18-Cfqwgjc5.js#rJ', 'c280f9bbb-BOcpax9X.js#L']);
  // Linked imports come from areas this graph declares.
  const declared = new Set([...LINKED_AREA_NAMES, 'cds-core']);
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'linked' || i.kind === 'shared-graph'))
    assert.ok(declared.has(i.from.split('/')[1]), `${m.target}: ${i.from}`);
});

// Fixtures from the 3.6556.2 rail test, driven through both graphs: the derivations carried over unchanged.
const derivations = {
  railFolder: [
    { isLocal: true, originCwd: '/r/repo', workingDir: '/r/repo' }, { isLocal: true, originCwd: '/r/repo', workingDir: '/r/repo/.claude/worktrees/a' },
    { isLocal: true, workingDir: '/r/repo', discoveredSlug: 'acme/widgets' }, { isLocal: true, workingDir: '/r/repo', cachedRepoName: 'cached' }, { isLocal: true },
    { isLocal: true, workingDir: '/tmp/s', isScratchWorkspace: true, scratchLabel: 'Scratch' }, { isLocal: true, workingDir: '/tmp/s', isScratchWorkspace: true },
  ],
  railWorktree: [
    { isLocal: true, originCwd: '/r', workingDir: '/r' }, { isLocal: true, originCwd: '/r', workingDir: '/r/.claude/worktrees/a' },
    { isLocal: true, originCwd: '/r', workingDir: '/elsewhere/w', hasDesktopWorktree: true }, { isLocal: true, originCwd: '/r', workingDir: '/elsewhere/w' },
    { isLocal: false, originCwd: '/r', workingDir: '/r/.claude/worktrees/a' }, { isLocal: true, originCwd: 'C:\\r', workingDir: 'C:\\r\\.claude\\worktrees\\b' },
  ],
  lazyWorktreePending: [{}, { worktreePath: '/r/.claude/worktrees/a' }, { harnessCwd: '/h' }, { branch: 'b' }, { worktreeRemoved: true }, { cwd: '/elsewhere' }, { startedWithWorktree: false }, { isLocal: false }]
    .map(extra => ({ isLocal: true, cwd: '/r', originCwd: '/r', startedWithWorktree: true, ...extra })),
  lazyWorktreeState: [{ pending: false }, { pending: true, remote: true }, { pending: true, archived: true }, { pending: true, leasedPath: '/l', leasedBranch: 'claude/l' }, { pending: true }],
  railBranch: [{ discovered: 'main' }, { discovered: null, known: 'feat' }, { discovered: undefined, inCheckout: true }, { discovered: undefined, startedWithWorktree: true }, { discovered: null, inCheckout: true }, { discovered: undefined }],
  knownBranch: [{ liveWorktree: false, recorded: 'rec', checkedOut: 'co', metaBranch: 'meta' }, { liveWorktree: true, recorded: 'rec', checkedOut: 'co' }, { liveWorktree: true, recorded: 'rec' }, { liveWorktree: true, metaBranch: 'meta' }, {}],
  railExtraFolders: [{
    directories: ['/r/repo', '/r/lib', '/r/tool/.claude/worktrees/t'],
    trees: [{ folder: '/r/tool', worktreePath: '/r/tool/.claude/worktrees/t', worktreeName: 't', branch: 'claude/t' }],
    repos: [{ repo: 'acme/lib', cwd: '/r/lib', branch: 'dev', repoLinks: ['x'] }, { repo: 'acme/other', branch: 'main' }],
    repoSlugs: ['acme/repo', 'acme/docs'], primary: { name: 'repo', path: '/r/repo' },
  }],
  environmentKind: [{ isLocal: true }, { remoteHost: 'h', isLocal: true }, { isLocal: false, environmentId: 'env_1' }],
  environmentConnection: ['connecting', 'idle', 'connected', undefined],
  remoteControlState: [{ metaFetched: true, props: 'p' }, { metaFetched: false, metaPending: true, available: true }, { prefsPending: true }, { metaFetched: true, available: true }],
  isSideSessionNotesFolder: ['/Users/me/.claude/side-session-notes/local_ab-12', '/Users/me/.claude/side-session-notes/local_ab-12/', '/Users/me/repo'],
};
const labels = { local: 'This Mac', cloud: 'Cloud', bridge: 'Remote Control' };
const kinds = { local: 'Local session', ssh: 'SSH session', wsl: 'WSL session', cloud: 'Cloud session', selfHosted: 'Self-hosted session', bridge: 'Remote Control session' };
derivations.railEnvironment = [{ kind: 'local', labels, kinds }, { kind: 'local', labels, kinds, named: { name: 'Staging', icon: 'Box' } },
  { kind: 'remoteHost', remoteHost: 'devbox', remoteKind: 'ssh', labels, kinds }, { kind: 'cloud', namePending: true, labels, kinds }];

test('pure derivations: c8b5c2821 Pe / Ae / Oe / Le / Re / Ke / qe / q / Ue / ze / De / Fe / Ye agree with the 3.6556.2 roots', () => {
  for (const [name, inputs] of Object.entries(derivations))
    for (const input of inputs) assert.deepEqual(gen[name](input), Old[name](input), `${name}(${JSON.stringify(input)})`);
  // A few results stated outright (the 3.6556.2 rail test's expectations).
  assert.deepEqual(gen.railFolder({ isLocal: true, originCwd: '/r/repo', workingDir: '/r/repo/.claude/worktrees/a' }), { name: 'repo', path: '/r/repo/.claude/worktrees/a', basePath: '/r/repo' });
  assert.deepEqual(gen.railWorktree({ isLocal: true, originCwd: 'C:\\r', workingDir: 'C:\\r\\.claude\\worktrees\\b' }), { name: 'b', path: 'C:\\r\\.claude\\worktrees\\b' });
  assert.deepEqual(gen.lazyWorktreeState({ pending: true, leasedPath: '/l', leasedBranch: 'claude/l' }), { kind: 'ready', branch: 'claude/l' });
  assert.deepEqual(gen.railEnvironment({ kind: 'local', labels, kinds }), { label: 'This Mac', kind: 'Local session' });
  assert.deepEqual(['connecting', 'idle', 'connected', undefined].map(gen.environmentConnection), ['connecting', 'notConnected', undefined, undefined]);
  // Oe: the other repos of a session (all but the primary; null keeps the list).
  assert.deepEqual(gen.otherRepos(['a', 'b', 'c'], 'b', 'x'), ['a', 'c']);
  assert.deepEqual(gen.otherRepos(['a', 'b'], 'b', null), ['a', 'b']);
  // Me / TM: connector rows labelled by the connector label (failed and needs-auth first).
  const input = { names: 'github\nlinear_app\nplugin:acme:docs', states: '\nfailed\nunavailable', iconTypes: '', iconSrcs: '', targets: '\naccount:abc\n' };
  const rows = gen.connectorRows({ ...input, labelOf: gen.connectorLabel });
  assert.deepEqual(rows, Old.connectorRows({ ...input, labelOf: Old.connectorLabel }));
  assert.deepEqual(rows.map(s => [s.name, s.label, s.state]), [['linear_app', 'Linear app', 'failed'], ['github', 'Github', undefined], ['plugin:acme:docs', 'Docs', 'unavailable']]);
  // The timings and the editable-environment predicate.
  assert.equal(gen.RAIL_PENDING_GIVE_UP_MS, Old.RAIL_PENDING_GIVE_UP_MS);
  assert.equal(gen.NAME_PENDING_GIVE_UP_MS, OldTiming.NAME_PENDING_GIVE_UP_MS);
  for (const env of [undefined, { target: { kind: 'local' } }, { target: { kind: 'local', wslDistro: 'u' } }, { target: { kind: 'local', variant: 'v' } }, { target: { kind: 'cloud' } }])
    assert.equal(gen.isRailEditableEnvironment(env), OldEdit.isRailEditableEnvironment(env), JSON.stringify(env));
  assert.deepEqual(gen.NO_PLUGIN_SECTIONS, []);
});

test('pinnedSectionMessages: the 4.16336.0 sidebar pinned-section strings (dragPinHint re-keyed upstream)', () => {
  const m = gen.pinnedSectionMessages;
  assert.deepEqual(m.pinned, { defaultMessage: 'Pinned', id: 'A8GDlh2QW4' });
  assert.deepEqual(m.dragToPin, { defaultMessage: 'Drag to pin', id: 'a6msxIE91i' });
  assert.equal(m.dragPinHint.id, 'bJ5EkDdURU');
  assert.match(m.dragPinHint.defaultMessage, /^Tip: you can drag \{kind, select, code \{sessions\} cowork \{tasks\} other \{chats\}\} here to pin them$/);
});

test('SSR: c0b46114c v (BandFrame) with an action cell, c73f45bc3 _C (RailEditEnvironmentButton)', () => {
  const band = renderToStaticMarkup(h(gen.BandFrame, { icon: null, actions: h(gen.BandActionCell, null, h('button', { type: 'button' }, 'Act')) }, 'Band text'));
  assert.match(band, /flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm/);
  assert.match(band, /text-body/);
  assert.match(band, /<span class="flex h-\[1lh\] shrink-0 items-center"><button type="button">Act<\/button><\/span>/, 'b: the official span cell');
  assert.match(band, /Band text/);
  const stands = renderToStaticMarkup(h(gen.BandFrame, { standsInForComposer: true }, 'x'));
  assert.notEqual(stands, renderToStaticMarkup(h(gen.BandFrame, {}, 'x')), 'standsInForComposer marks the frame');
  const edit = renderToStaticMarkup(h(gen.RailEditEnvironmentButton, { kind: 'local', onOpen() {} }));
  assert.match(edit, /aria-label="Edit environment"/);
  const cloud = renderToStaticMarkup(h(gen.RailEditEnvironmentButton, { onOpen() {} }));
  assert.match(cloud, /aria-label="Edit cloud environment"/);
});

// R4-RW8-SR (round4 relink-w8): SessionRail (cf74bc599 sN) is emitted; Vite SSR of a local session with no plan / artifacts
// renders the official aside, the environment card and its dnd-kit section grip (dnd-kit state linked from queued-bar-v4).
test('SSR: cf74bc599 sN (SessionRail), a local session: aside, environment card, reorder grip', () => {
  const session = { environment: { label: 'This Mac', kind: 'Local session' }, folder: { name: 'repo', path: '/Users/me/repo' }, extraFolders: [], branch: { name: 'main' },
    worktree: null, startedWithWorktree: false, worktreeRemoved: false, worktreePending: undefined, goal: null, isLocal: true };
  const html = renderToStaticMarkup(h(gen.SessionRail, { plan: [], artifacts: [], session, sessionKey: 's' }));
  assert.match(html, /^<aside aria-label="Session details" tabindex="-1" class="relative flex w-\[var\(--session-rail-w,17\.5rem\)\] min-h-0 flex-col font-sans outline-none">/);
  assert.match(html, /data-rail-card="environment"/);
  assert.match(html, /<span class="shrink-0">Environment<\/span>/);
  assert.match(html, /aria-roledescription="Draggable section"/);
  assert.match(html, /aria-label="Reorder Environment"/);
  assert.match(html, />repo</);
});
