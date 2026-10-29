import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import { extractRoutinesShared } from '../scripts/extract-routines-shared.mjs';
import { routinesSharedManifestFor, routinesSharedViewFor } from '../scripts/routines-shared-compat.mjs';

// R4g-routines RT0 (tasks-code-routines WI-0, D32): the routines pieces the Code Routines page and the Cowork Scheduled
// upgrade share, sliced by scripts/extract-routines-shared.mjs (3.6556.2 since w2-routines-shared: cdbc75b4b, c1984a75c
// ge, c43d31dd8, shared-52 vF, shared-14 Ft / J) over src/source-routines-shared-adapters.jsx. The semantic names are
// unchanged; every consumer imports the current chunk files (the E34 legacy shims are gone, w10-cleanup-routines-legacy).
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/generated/routines-shared');
let server, shared, adapters, createIntl;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  shared = await server.ssrLoadModule('/src/generated/routines-shared/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  ({ createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-DYfox5Co.js'));
});
after(() => server?.close());

const intl = () => createIntl({ locale: 'en-US', defaultLocale: 'en-US', messages: {} });

test('the generated graph is current (--check)', async () => {
  const manifest = await extractRoutinesShared({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  // Every root has a semantic name in index.mjs, and every adapter the graph imports is exported by the adapter module.
  for (const name of Object.keys(manifest.publicNames)) assert.ok(name in shared, `index.mjs exports ${name}`);
  for (const { name } of manifest.adapters) assert.equal(typeof adapters[name], 'function', `adapter ${name}`);
  // Host code imports semantic names only: index.mjs re-exports roots, the chunk modules keep the original local names.
  const index = await fs.readFile(path.join(OUT, 'index.mjs'), 'utf8');
  assert.match(index, /vF as scheduledTaskErrorCategory/);
  assert.match(index, /Ft as describeStartFailure/);
  assert.match(index, /Br as ScheduledTaskCard/);
  // RC-18: routineWillRun moved to c1984a75c (ge, exported t) with the cloud auto_disabled reasons.
  assert.deepEqual(manifest.publicNames.routineWillRun, { file: 'c1984a75c-jYIGuWP6.js', local: 'ge' });
  // D46: the view-tabs bindings this graph reads come in by semantic name (no minified view-tabs import).
  // The tooltip implementation context is view-tabs' (one instance), and so is the fizzy-lake part check (always off, E12).
  const frame = await fs.readFile(path.join(OUT, 'shared-frame-6jtSkIit.mjs'), 'utf8');
  assert.match(frame, /CdsTooltipImplContext as Fl,/);
  assert.doesNotMatch(frame, /^var Fl = /m);
  assert.match(await fs.readFile(path.join(OUT, 'c9e1458cd-DmywUvrC.mjs'), 'utf8'), /isFizzyLakePartOptedIn as [\w$]+/);
  // cdbc75b4b Br's pointer helpers too (published for it, D46), so no copy of them is left here.
  const cards = await fs.readFile(path.join(OUT, 'cdbc75b4b-BCUW8bqT.mjs'), 'utf8');
  for (const name of ['matchesCoarseOrHoverlessPointer', 'subscribeInputMediaChanges']) assert.match(cards, new RegExp(`${name} as [\\w$]+`), name);
  assert.doesNotMatch(frame, /^var Yt = /m);
  for (const m of manifest.modules) for (const i of m.imports) if (i.kind === 'view-tabs') assert.match(i.name, /^[a-zA-Z][A-Za-z0-9]{3,}$/, `${m.target} imports view-tabs ${i.name}`);
});

test('kx reads the [ccdErrorCategory:<cat>] suffix the main process appends (shared-52 ol)', () => {
  const { scheduledTaskErrorCategory: kx, stripStartErrorMessage: Ex } = shared;
  assert.equal(kx(new Error('Folder not found: /tmp/gone [ccdErrorCategory:cwd_not_found]')), 'cwd_not_found');
  assert.equal(kx('… [ccdErrorCategory:cwd_not_found]'), 'cwd_not_found');
  // The suffix must end the message (xx is anchored with $) and match [a-z_]+.
  assert.equal(kx('[ccdErrorCategory:cwd_not_found] then more'), undefined);
  assert.equal(kx('Network down [ccdErrorCategory:network_error]'), 'network_error');
  assert.equal(kx('no suffix'), undefined);
  // Through the preload's IPC wrapper (`Error invoking remote method 'x': Error: …`) the suffix still ends the message.
  const ipc = "Error invoking remote method 'desktop:call': Error: Folder not found [ccdErrorCategory:cwd_not_found]";
  assert.equal(kx(ipc), 'cwd_not_found');
  assert.equal(Ex(ipc), 'Folder not found');
  // The stale relogin message is its own category.
  assert.equal(kx(new Error(shared.STALE_RELOGIN_MESSAGE)), 'session_stale_relogin');
});

test('kx never reports the categories of yx / _x (and the account / policy ones)', () => {
  const { scheduledTaskErrorCategory: kx, UNREPORTED_START_CATEGORIES: yx, UNREPORTED_POLICY_CATEGORIES: _x } = shared;
  assert.deepEqual([...yx], ['org_credential_not_allowed', 'org_pin_mismatch', 'proxy_invalid', 'temp_dir_unusable', 'session_held_by_background',
    'worktree_unverified', 'worktree_resume_refused', 'cli_version_too_old', 'org_config_required_unavailable', 'org_config_refused']);
  assert.deepEqual([..._x], ['sandbox_required_unavailable', 'managed_settings_refused', 'gateway_access_denied']);
  for (const category of [...yx, ..._x, 'session_stale_relogin', 'untrusted_device', 'org_policy_denied', 'github_auth', 'cloud_storage_mount_denied'])
    assert.equal(kx(`Failed [ccdErrorCategory:${category}]`), undefined, category);
});

test('Ft describes cwd_not_found and network_error (title and retryHelps, as Hc words the Run now toast)', () => {
  const { describeStartFailure: Ft, normalizeStartFailureCategory: W } = shared;
  const folder = Ft(intl(), 'cwd_not_found', undefined, { errorMessage: 'Folder not found' });
  assert.equal(folder.title, 'Folder not found');
  assert.equal(folder.retryHelps, false);
  assert.equal(folder.isKnownCategory, true);
  assert.equal(folder.isConfirmPrompt, false);
  const network = Ft(intl(), 'network_error', undefined, { errorMessage: 'socket hang up' });
  assert.equal(network.title, 'Connection lost');
  assert.equal(network.retryHelps, true);
  assert.equal(network.isKnownCategory, true);
  const repo = Ft(intl(), 'not_git_repo', undefined, {});
  assert.equal(repo.title, 'This folder isn’t a Git repository');
  // An unknown (or missing) category is the generic one, which Hc does not word as a cause.
  const unknown = Ft(intl(), undefined, undefined, {});
  assert.equal(unknown.isKnownCategory, false);
  assert.equal(W('spawn_error_ENOENT'), 'spawn_failed');
  assert.equal(W('api_error_529'), 'api_overloaded');
  assert.equal(W('api_error_503'), 'api_server_error');
});

test('filters, sort and status helpers are the originals', () => {
  assert.deepEqual(shared.ROUTINE_FILTER_DEFAULTS, { runsOn: 'all', schedule: 'all', status: 'all', source: 'all' });
  assert.deepEqual(shared.defaultRoutineFilters({ hideNonCode: true }), { runsOn: 'all', schedule: 'all', status: 'all', source: 'code' });
  assert.equal(shared.activeRoutineFilterCount({ runsOn: 'all', schedule: 'all', status: 'paused', source: 'all' }), 1);
  // Runs on "ssh" falls back to all when SSH runs-on is not offered (this host: no SSH places).
  assert.deepEqual(shared.availableRoutineFilters({ runsOn: 'ssh', schedule: 'all', status: 'all', source: 'all' }, { runsOn: true, sshRunsOn: false }),
    { runsOn: 'all', schedule: 'all', status: 'all', source: 'all' });
  assert.equal(shared.localRoutineStatus({ enabled: true }), 'active');
  assert.equal(shared.localRoutineStatus({ enabled: false }), 'paused');
  const sorted = shared.sortRoutines([{ id: 'b', displayName: 'Beta' }, { id: 'a', displayName: 'Alpha' }], 'name');
  assert.deepEqual(sorted.map((task) => task.id), ['a', 'b']);
  assert.equal(shared.routineRowKey('local', 'x'), 'local-x');
});

test('Ant only and Runs on: no account and no SSH places here', () => {
  const html = renderToStaticMarkup(React.createElement(shared.AntOnlyBadge, {}));
  assert.equal(html, '');
  function HostName() { return String(shared.usePlaceHostName()({ remoteTarget: { kind: 'ssh', sshHost: 'box.example', sshPort: 22 } })); }
  assert.equal(renderToStaticMarkup(React.createElement(HostName)), 'box.example');
  assert.equal(shared.placeTargetName({ remoteTarget: { kind: 'ssh', sshHost: 'h', sshPort: 2222 } }), 'h:2222');
  assert.deepEqual(adapters.useSshConfigs({ poll: false }).sshConfigs, []);
});

const task = { id: 't1', displayName: 'Nightly tests', source: 'local', surface: 'code', enabled: true, cronExpression: '0 9 * * *',
  prompt: 'Run the tests', createdAt: Date.UTC(2026, 9, 1), nextRunAt: '2026-10-18T09:00:00.000Z', cwd: '/repo' };
const host = (extra = {}) => ({ navigate() {}, pathname: '/code/routines', search: '', bridge: undefined, models: [], ...extra });
const render = (node, value = host()) => renderToStaticMarkup(React.createElement(adapters.RoutinesSharedHost.Provider, { value }, node));

test('the card (Ji) renders a local Code routine as a link with the original classes', () => {
  const navigated = [];
  const html = render(React.createElement(shared.ScheduledTaskCard, { task, title: task.displayName, href: '/code/routines/t1' }),
    host({ navigate: (href) => navigated.push(href) }));
  assert.match(html, /href="\/code\/routines\/t1"/);
  assert.match(html, /Nightly tests/);
  assert.match(html, /data-grid-cell=""/);
  assert.match(html, /group relative flex h-full flex-col gap-xs/);
});

test('the divider, skeleton rows and loading frames render the original markup', () => {
  assert.match(render(React.createElement(shared.ScheduledTaskDivider, {})), /viewBox="0 0 1600 6"/);
  const rows = render(React.createElement(shared.RoutineSkeletonRows, { count: 3 }));
  assert.match(rows, /^<div class="flex flex-col gap-1">/);
  // Tn: `count` skeleton blocks of the row height (Sn) at full width, in the original column.
  assert.equal((rows.match(/class="[^"]*\bw-full\b[^"]*"/g) ?? []).length, 3);
  const detail = render(React.createElement(shared.RoutineDetailLoadingFrame, { kind: 'local', onBack() {} }));
  assert.match(detail, /Loading (routine|scheduled task)/);
  const form = render(React.createElement(shared.RoutineFormLoadingFrame, { kind: 'local', onBack() {} }));
  assert.match(form, /Loading form/);
});

test('the status line (ji) words a local routine through the original schedule text', () => {
  const html = render(React.createElement(shared.ScheduledTaskStatusLine, { task }));
  assert.match(html, />Active</);
  assert.match(html, />Daily at 9:00 AM</);
  const paused = render(React.createElement(shared.ScheduledTaskStatusLine, { task: { ...task, enabled: false } }));
  assert.match(paused, />Paused</);
});

test('host difference: gated ("secret:") messages fall back to the official " "', () => {
  // bi's hidden-count text is a gated message (shared-104 ru, id "secret:1z0jcx5"); the desktop receives those in the
  // account bootstrap (gated_messages). Without them shared-104 Ql answers " ", exactly as the original does.
  const html = render(React.createElement(shared.RoutineHiddenFilterChips, { hiddenCount: 2, onClear() {} }));
  assert.match(html, /data-testid="routines-filter-chips"/);
  assert.match(html, /<span class="truncate" title=" "> <\/span>/);
  assert.match(html, />Clear<\/button>/);
});

// The consumers read this manifest through scripts/routines-shared-compat.mjs, which answers the manifest itself for the
// same release and refuses any other one (the E34 legacy view is gone since w10-cleanup-routines-legacy).
test('compat helper: same release only, every other release refused', async () => {
  const current = { referenceVersion: '3.6556.2', modules: [] };
  assert.equal(routinesSharedViewFor(current, '3.6556.2'), current);
  assert.throws(() => routinesSharedViewFor(current, '2.42304.0'), /routines-shared is 3\.6556\.2, expected 2\.42304\.0/);
  // A manifest that still carried a legacy view is not read through it any more.
  const old = { referenceVersion: '2.42304.0', modules: [] };
  assert.throws(() => routinesSharedViewFor({ ...current, legacy: { '2.42304.0': old } }, '2.42304.0'), /routines-shared is 3\.6556\.2, expected 2\.42304\.0/);
  assert.throws(() => routinesSharedViewFor(current, 'toString'), /expected toString/);
  // The async form reads <root>/src/generated/routines-shared/manifest.json.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rs-compat-'));
  try {
    await fs.mkdir(path.join(tmp, 'src/generated/routines-shared'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'src/generated/routines-shared/manifest.json'), JSON.stringify(current));
    assert.deepEqual(await routinesSharedManifestFor('3.6556.2', { root: tmp }), current);
    await assert.rejects(routinesSharedManifestFor('2.42304.0', { root: tmp }), /expected 2\.42304\.0/);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
  await assert.rejects(routinesSharedManifestFor('2.42304.0'), /routines-shared is 3\.6556\.2, expected 2\.42304\.0/);
});

// The 29 old chunk file names the E34 layer wrote as shims (data/w10-cleanup-legacy.json routines-shared.oldNameShimFiles).
const OLD_SHIMS = ['c07677de0-5vIheSzI', 'c0958e5bf-CU-15IaR', 'c13c65b88-DG1ef4lz', 'c19ba0b81-OTCtpuRl', 'c43d31dd8-EEJLxHyj',
  'c4ca9752f-CW9Jz4_i', 'c9e1458cd-BaNkEcxH', 'cc09daa9b-BT70Ota1', 'cdbc75b4b-DdrHYWQG', 'cebf5e0b3-CgVXnJpz', 'shared-0-ByI5P0CP',
  'shared-1-CAAiD7E3', 'shared-104-Cqo2-vQh', 'shared-14-u0TSV9dR', 'shared-156-Bikz018e', 'shared-16-B0xHzPjj', 'shared-18-D4XxL6Tg',
  'shared-2-Cb74JByF', 'shared-20-B7UqYfsi', 'shared-25-DP8p7i1Z', 'shared-26-CgdP_nTj', 'shared-28-DcgD7xXH', 'shared-3-DnHYUZdJ',
  'shared-4-CJsHhp5n', 'shared-52-DGviI8xb', 'shared-6-Cby4X-ms', 'shared-78-D6VXYXaQ', 'shared-frame-BfjMqbuN', 'vendor-intl-Db7hDWRO']
  .map(name => `${name}.mjs`);

test('no E34 legacy layer: no manifest.legacy, no frozen 2.42304.0 manifest, no old chunk file shims', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(OUT, 'manifest.json'), 'utf8'));
  assert.equal(manifest.legacy, undefined);
  await assert.rejects(fs.access(path.join(ROOT, 'scripts/routines-shared-legacy-2.42304.0.json')), { code: 'ENOENT' });
  const present = await fs.readdir(OUT);
  assert.equal(OLD_SHIMS.length, 29);
  for (const name of OLD_SHIMS) assert.ok(!present.includes(name), `${name} is gone`);
  // Every file is a module of the 3.6556.2 graph (or index.mjs / manifest.json), none a re-export shim.
  const targets = new Set(manifest.modules.map(m => m.target));
  for (const name of present) assert.ok(targets.has(name) || name === 'index.mjs' || name === 'manifest.json', name);
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, '3.6556.2', m.target);
    const text = await fs.readFile(path.join(OUT, m.target), 'utf8');
    assert.match(text, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings from /, m.target);
    assert.doesNotMatch(text, /Legacy 2\.42304\.0 names|\(E34\)/, m.target);
  }
  // The two chunks byte-identical across the releases keep their file name as ordinary modules.
  for (const target of ['c14edbe0a-BcWH5PTf.mjs', 'ce995db44-CRvpW1XI.mjs']) assert.ok(targets.has(target), target);
  // code-routines heldGraph, cowork-scheduled routinesSharedGraph, session-rail loadAreas and session-rail-context
  // importableAreas: no direct read of this manifest is left (a version-skipping loop would drop the second-copy guard).
  for (const name of ['extract-code-routines.mjs', 'extract-cowork-scheduled.mjs', 'extract-session-rail.mjs', 'extract-session-rail-context.mjs']) {
    const text = await fs.readFile(path.join(ROOT, 'scripts', name), 'utf8');
    assert.match(text, /import \{ routinesSharedManifestFor \} from '\.\/routines-shared-compat\.mjs';/, name);
    assert.match(text, /routinesSharedManifestFor\(referenceVersion\)/, name);
    assert.doesNotMatch(text, /path\.join\(routinesShared, 'manifest\.json'\)/, name);
  }
});

// What the old shims carried, now read from the current modules under their original 3.6556.2 local names: the shared-52
// suffix regexes, the cloud auto_disabled reason and once-ahead kind (c1984a75c, RC-18), the time-zone offset, and the
// "look backed" hook (shared-78 lp, a root since the legacy roots went away).
test('the bindings the old shims named are the current modules\' own', async () => {
  const s52 = await server.ssrLoadModule('/src/generated/routines-shared/shared-52-uHFNjl7C.mjs');
  assert.equal(s52.vF, shared.scheduledTaskErrorCategory);
  assert.equal(s52.uF.source, '\\[ccdErrorCategory:([a-z_]+)\\]$');
  assert.equal(s52.dF.source, '\\[sshFailureReason:([a-z_]+)\\]$');
  const cloud = await server.ssrLoadModule('/src/generated/routines-shared/c1984a75c-jYIGuWP6.mjs');
  assert.equal(cloud.k, 'auto_disabled_act_as_bot_denied');
  assert.equal(cloud.ge, shared.routineWillRun);
  assert.equal(cloud.le(undefined, Date.now() + 6e4, Date.now()), 'once-ahead');
  const cards = await server.ssrLoadModule('/src/generated/routines-shared/cdbc75b4b-BCUW8bqT.mjs');
  assert.equal(cards.Br, shared.ScheduledTaskCard);
  const s2 = await server.ssrLoadModule('/src/generated/routines-shared/shared-2-TF8v67kg.mjs');
  assert.equal(s2.Pk('UTC', new Date(0)), 0);
  const s78 = await server.ssrLoadModule('/src/generated/routines-shared/shared-78-D5Fw2h0a.mjs');
  assert.equal(s78.lp, shared.useLookBacked);
  // Outside a provider the hook answers the stored flag (np, false until op sets it from `lookBacked`).
  let seen;
  const Probe = () => { seen = shared.useLookBacked(); return null; };
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(seen, false);
});

// RC-05 (3.6556.2): the routine template card is a hit row (hit-row hit-row-main), not an overflow-hidden button.
test('RC-05: the template card renders the 3.6556.2 hit-row classes', () => {
  const html = render(React.createElement(shared.RoutineTemplateCard, { icon: 'Clock', title: 'Daily briefing', description: 'Summary', onSelect() {} }));
  assert.match(html, /^<button type="button" aria-busy="false" class="group relative hit-row hit-row-main flex w-full gap-md rounded-lg p-2 text-start/);
  assert.doesNotMatch(html, /overflow-hidden rounded-lg p-2/);
});
