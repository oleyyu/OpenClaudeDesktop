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
import { extractSessionRailSectionsV4, ROOTS, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-session-rail-sections-v4.mjs';

// account2 batch 5, region session-rail-sections: the 4.16336.0 session rail Servers and Background tasks sections
// (scripts/extract-session-rail-sections-v4.mjs -> src/generated/session-rail-sections-v4), staged next to the 3.6556.2
// src/generated/session-rail-sections the host still renders. Source only: manifest, the generator's --check, the official
// chunk text, D1 links, pure functions and Vite SSR of both sections under the existing SessionRailSectionsHostContext with
// fixture servers / tasks / loops (no browser, no Electron, no network, no real storage).
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const iso = ms => new Date(ms).toISOString();
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const occurrences = (s, needle) => s.split(needle).length - 1;
const out = 'src/generated/session-rail-sections-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

let previousWindow, previousDocument, server, gen, Adapters, Model;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  const storage = new Map();
  // W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo, which read document.cookie at load (as in the app).
  // W8 stub contract (design class c): cds-core now holds the shared-25 router store, which reads window.location.pathname at load.
  // W8 stub contract (design class c): cds-core now holds shared-92 cS, which reads documentElement.hasAttribute at load.
  globalThis.document = { cookie: '', createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { hasAttribute: () => false, getAttribute: () => null } };
  globalThis.window = { location: { pathname: '/' }, addEventListener() {}, removeEventListener() {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, String(value)); }, removeItem: key => { storage.delete(key); } }, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  Adapters = await server.ssrLoadModule('/src/source-session-rail-sections-adapters.jsx');
  Model = await server.ssrLoadModule('/src/background-tasks-model.mjs');
});
after(async () => {
  await closeWhenSettled(server); await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-session-rail-sections-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-session-rail-sections-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-routines-v4', 'files-changes-v4', 'routines-shared-v4', 'session-rail-kit-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const area of manifest.linkedAreas)
    assert.equal(provenance.linkedAreas[area], sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), area);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  // The pinned call site: the rail host renders lP / KN side by side with { sessionRef, readOnly }.
  assert.equal(manifest.callSites.length, 1);
  assert.equal(occurrences(official(manifest.callSites[0].source), manifest.callSites[0].features[0]), 1);
  await extractSessionRailSectionsV4({ check: true });
});

// real-b background-tasks (2026-11-10) session-rail-sections cutover: the rail host now renders the v4 sections. Before the
// cutover this test asserted the staged state for both host files:
//   for (const file of ['src/main.jsx', 'src/source-session-rail.jsx'])
//     if (fs.existsSync(path.join(app, file))) assert.doesNotMatch(local(file), /session-rail-sections-v4/, file);
// main.jsx keeps that exact assertion; source-session-rail.jsx now has the exact cutover import instead, and the 3.6556.2
// servers-card / background-tasks-card are no longer imported by it (the old directory stays for its other consumers).
test('cutover: the 3.6556.2 directory is still the old generator\'s; the rail host renders lP / KN from the v4 graph, main.jsx does not import it', () => {
  const old = JSON.parse(local('src/generated/session-rail-sections/manifest.json'));
  assert.notEqual(old.referenceVersion, '4.16336.0');
  assert.doesNotMatch(local('src/main.jsx'), /session-rail-sections-v4/, 'src/main.jsx');
  const rail = local('src/source-session-rail.jsx');
  const imports = [...rail.matchAll(/^import \{([^}]*)\} from "(\.\/generated\/session-rail-sections(?:-v4)?\/[^"]+)";$/gm)].map(m => [m[1].trim(), m[2]]);
  assert.deepEqual(imports, [['SessionRailServers, SessionRailBackgroundTasks', './generated/session-rail-sections-v4/index.mjs']]);
  assert.doesNotMatch(rail, /generated\/session-rail-sections\/(servers-card|background-tasks-card)\.mjs"/);
  assert.equal(occurrences(rail, '<SessionRailServers sessionRef={e} readOnly={o} />'), 1);
  assert.equal(occurrences(rail, '<SessionRailBackgroundTasks sessionRef={e} readOnly={o} />'), 1);
});

test('roots: every semantic name AST-located, pinned, exported by index.mjs; probes are in the official chunks', () => {
  const expected = Object.entries(ROOTS).flatMap(([file, roots]) => Object.entries(roots).map(([l, r]) => `${file}#${l}=${r.name}`));
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), expected);
  assert.equal(provenance.roots.length, 39);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  // useMinuteNow is linked from routines-shared-v4 (D1), not rooted here.
  assert.equal(provenance.notRooted.useMinuteNow.heldBy, 'routines-shared-v4');
  assert.equal(gen.useMinuteNow, undefined);
  // The old graph's names all have a 4.16336.0 counterpart.
  const names = new Set(provenance.roots.map(r => r.name));
  for (const n of ['SessionRailServers', 'SessionRailBackgroundTasks', 'RailServersCard', 'RailBackgroundTasksCard', 'groupTasks', 'isHostedPageUrl']) assert.ok(names.has(n), n);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.equal(provenance.adapters.length, Object.keys(HOST_ADAPTERS).length);
  assert.equal(provenance.adapters.length, 24);
  assert.ok(provenance.adapters.every(a => a.pinned && a.previous));
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-session-rail-sections-v4-adapters.jsx');
  const adapterText = local('src/source-session-rail-sections-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default|let|var)/m, 'no new implementation');
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-session-rail-sections-adapters.jsx', './source-session-rail-kit-adapters.jsx']);
});

test('D1: nothing a linked area holds is cut again; the rail kit, the minute clock and replaceEqualDeep are imported', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), []);
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  for (const area of manifest.linkedAreas) assert.ok(linked.has(area), `links ${area}`);
  // The two clocks first held here (exported for downstream links): c227f4d5e wL's counter and cd4f82e77 Me's second clock.
  const bound = new Set(own);
  assert.ok(bound.has('c227f4d5e-DGDdGBTz.js#wL') && bound.has('cd4f82e77-Cuw99s6A.js#Me'));
});

test('pure functions: row state / name / address / key, task icon / key / stop label, scope, hosted pages, countdown', () => {
  const row = server => ({ kind: 'local', server: { serverId: 'x', port: 0, status: 'running', ...server } });
  assert.equal(gen.railServerState(row({ status: 'running' })), 'running');
  assert.equal(gen.railServerState(row({ status: 'error' })), 'failed');
  assert.equal(gen.railServerState(row({ status: 'starting' })), 'starting');
  assert.equal(gen.railServerState({ kind: 'remote', server: { state: 'running' } }), 'running');
  assert.equal(gen.railServerName(row({ serverId: 'x', port: 0 })), 'x');
  assert.equal(gen.railServerName(row({ serverId: 'x', port: 8080 })), 'localhost:8080');
  assert.equal(gen.railServerName(row({ name: 'web', port: 8080 })), 'web');
  assert.equal(gen.railServerKey(row({ serverId: 'preview:web' })), 'local:preview:web');
  assert.equal(gen.RAIL_SERVERS_LIMIT, 4);
  assert.equal(gen.RAIL_TASKS_LIMIT, 4);
  assert.equal(gen.railTaskIcon({ kind: 'task', taskType: 'local_bash' }), 'CommandLine');
  assert.equal(gen.railTaskIcon({ kind: 'task', taskType: 'local_agent' }), 'AgentsSimple');
  assert.equal(gen.railTaskIcon({ kind: 'loop' }), 'Clock');
  assert.equal(gen.railTaskKey({ kind: 'loop', loop: { id: 'job-1' } }), 'loop:job-1');
  const intl = { formatMessage: message => message.defaultMessage };
  assert.equal(gen.railStopLabel(intl, { kind: 'task' }), 'Stop this task');
  assert.equal(gen.railStopLabel(intl, { kind: 'loop', loop: { recurring: false } }), 'Stop this scheduled prompt. Claude will cancel it.');
  const artifact = 'https://claude.ai/artifact/0f8fad5b-d9cb-469f-a165-70867728950e';
  assert.equal(gen.isHostedPageUrl(artifact), true);
  assert.equal(gen.isHostedPageUrl('http://localhost:5173/'), false);
  assert.equal(gen.originFolder('/w/app/.claude/worktrees/feature'), '/w/app');
  assert.equal(gen.serverInSession({ serverId: 'preview:a', cwd: '/w/app/docs' }, '/w/app', 's1'), true);
  assert.equal(gen.serverInSession({ serverId: 'preview:a', cwd: '/w/apple' }, '/w/app', 's1'), false);
  assert.equal(gen.serverInSession({ serverId: 'preview:a', cwd: '/w/app', sessionId: 's2' }, '/w/app', 's1'), false);
  assert.equal(gen.isAmbientTask({ wireTaskType: 'dream' }), true);
  assert.equal(gen.isAmbientTask({ taskType: 'local_bash' }), false);
  assert.deepEqual(Object.values(gen.DevServerStatus).sort(), ['error', 'running', 'starting', 'stopped']);
  // 4.16336.0 jF: minutes keep their seconds ("3m 00s"); "now" at zero.
  assert.equal(gen.formatCountdown(intl, 0), 'now');
});

// ---- SSR under the existing host context -----------------------------------------------------------------------------
const sessionRef = { id: 's1', type: 'local' };
function hostFor(now, extra = {}) {
  return {
    meta: { workingDir: '/w/app', originCwd: '/w/app', tags: [], isArchived: false, createdAt: now - 864e5,
      loops: [{ id: 'job-1', prompt: 'check CI', recurring: true, cron: '*/5 * * * *', humanSchedule: 'every 5 minutes', createdAt: now - 3600e3, nextRunAt: now + 180e3 },
        { id: 'job-3', prompt: 'old loop', recurring: true, cron: '0 */2 * * *', createdAt: now - 4 * 864e5, nextRunAt: now + 600e3 }] },
    servers: [
      { serverId: 'preview:web', name: 'web', port: 5173, status: 'running', cwd: '/w/app', startedAt: iso(now - 2000) },
      { serverId: 'preview:api', name: 'api', port: 0, status: 'starting', cwd: '/w/app', startedAt: iso(now - 3000) },
      { serverId: 'preview:docs', name: 'docs', port: 4000, status: 'error', cwd: '/w/app/docs', startedAt: iso(now - 1000) },
      { serverId: 'preview:old', name: 'old', port: 3000, status: 'stopped', cwd: '/w/app', startedAt: iso(now - 9000) },
      { serverId: 'preview:other', name: 'other', port: 3002, status: 'running', cwd: '/w/other', startedAt: iso(now) },
      { serverId: 'preview:hosted', name: 'hosted', port: 443, status: 'running', cwd: '/w/app', startedAt: iso(now), externalUrl: 'https://claude.ai/artifact/0f8fad5b-d9cb-469f-a165-70867728950e' }],
    tasks: [
      { taskId: 'agent:2', status: 'running', description: 'Explore the repo', taskType: 'local_agent', startedAt: now - 5000 },
      { taskId: 'bash:1', status: 'running', description: 'npm run dev', taskType: 'local_bash', startedAt: now - 65000 },
      { taskId: 'dream:3', status: 'running', description: 'dream', wireTaskType: 'dream', startedAt: now - 1000 },
      { taskId: 'bash:4', status: 'completed', description: 'ls', taskType: 'local_bash', startedAt: now - 9e5, completedAt: now - 8e5 }],
    sidePanes: { hasSidePanes: true, previewViews: true, previewServerId: 'preview:web', openSidePanes: ['preview'], requestServerLogs() {}, setSidePane() {}, setPendingRemotePreviewOpen() {} },
    openTasksPane() {}, rememberPreviewServer() {}, stopServer: () => Promise.resolve(), stopTask: () => Promise.resolve(), stopLoop: () => Promise.resolve(),
    rowsStore: Model.createTaskRowsStore(), dismissedStore: Model.createDismissedTasksStore(null), ...extra,
  };
}
const render = (host, node) => renderToStaticMarkup(host ? h(Adapters.SessionRailSectionsHostContext.Provider, { value: host }, node) : node);
const tooltipNames = html => [...html.matchAll(/data-cds="OverflowTooltip"[^>]*>([^<]+)</g)].map(m => m[1]);

test('SSR lP (Servers): 4.16336.0 rail card, this session\'s servers oldest first, the current one, Stop on each', () => {
  const html = render(hostFor(Date.now()), h(gen.SessionRailServers, { sessionRef, readOnly: false }));
  assert.match(html, /^<section data-rail-section="" [^>]*data-open="" data-cds="Collapsible" class="group\/railcard flex shrink-0 flex-col py-md epitaxy-rail-lined /);
  assert.ok(html.includes('[--rail-row-pad:--spacing(2)]'), '4.16336.0 rail row padding token');
  assert.match(html, /<span class="shrink-0">Servers<\/span>/);
  assert.match(html, />1 running<\/span>/);
  assert.deepEqual(tooltipNames(html), ['api', 'web', 'docs'], 'stopped, other folder and hosted page left out');
  assert.match(html, /<span class="text-danger">Failed to start<\/span>/);
  assert.match(html, /aria-label="Open web in Preview" class="[^"]*bg-fill-ghost-selected" aria-current="true"/);
  assert.match(html, />localhost:5173<\/span>/);
  assert.equal(occurrences(html, 'aria-label="Stop this server"'), 3);
  assert.match(html, /<span class="sr-only" role="status"><\/span>/);
  const readOnly = render(hostFor(Date.now()), h(gen.SessionRailServers, { sessionRef, readOnly: true }));
  assert.equal(occurrences(readOnly, 'Stop this server'), 0);
  assert.doesNotMatch(readOnly, /role="status"/);
});

test('SSR lP: nothing without the host or side panes; more than four servers show four and Show more', () => {
  const now = Date.now();
  assert.equal(render(null, h(gen.SessionRailServers, { sessionRef, readOnly: false })), '');
  const host = hostFor(now);
  assert.equal(render({ ...host, sidePanes: { ...host.sidePanes, hasSidePanes: false } }, h(gen.SessionRailServers, { sessionRef, readOnly: false })), '');
  const servers = Array.from({ length: 6 }, (_, i) => ({ serverId: `preview:s${i}`, name: `s${i}`, port: 3000 + i, status: 'running', cwd: '/w/app', startedAt: iso(now + i) }));
  const many = render(hostFor(now, { servers }), h(gen.SessionRailServers, { sessionRef, readOnly: false }));
  assert.deepEqual(tooltipNames(many), ['s0', 's1', 's2', 's3']);
  assert.match(many, />Show more</);
  assert.match(many, />6 running<\/span>/);
});

test('SSR KN (Background tasks): live loops and running tasks (not ambient, not expired), countdown, finished count', () => {
  const html = render(hostFor(Date.now()), h(gen.SessionRailBackgroundTasks, { sessionRef, readOnly: false }));
  assert.match(html, /^<section data-rail-section="" [^>]*data-open="" data-cds="Collapsible" class="group\/railcard flex shrink-0 flex-col py-md epitaxy-rail-lined /);
  assert.match(html, /<span class="shrink-0">Background tasks<\/span>/);
  assert.match(html, />3 running<\/span>/);
  const words = text(html);
  assert.match(words, /check CI Next 3m 0\ds/, words);
  assert.ok(words.includes('npm run dev') && words.includes('Explore the repo') && words.includes('1 finished'), words);
  assert.ok(!words.includes('old loop') && !words.includes('dream'), 'expired loop and ambient task left out');
  for (const label of ['Open check CI in Background tasks', 'Stop this loop. Claude will cancel it.', 'Open npm run dev in Background tasks', 'Stop this task'])
    assert.ok(html.includes(`aria-label="${label}"`), label);
  const readOnly = render(hostFor(Date.now()), h(gen.SessionRailBackgroundTasks, { sessionRef, readOnly: true }));
  assert.equal(occurrences(readOnly, 'Stop this task'), 0);
});
