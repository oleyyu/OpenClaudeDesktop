import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractRoutinesShared } from '../scripts/extract-routines-shared.mjs';

// R4g-routines RT0 (tasks-code-routines WI-0, D32): the routines pieces the Code Routines page and the Cowork Scheduled
// upgrade share, sliced from 2.42304.0 by scripts/extract-routines-shared.mjs (cdbc75b4b, c43d31dd8, shared-52 kx,
// shared-14 Ft / W) over src/source-routines-shared-adapters.jsx.
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/generated/routines-shared');
let server, shared, adapters, createIntl;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  shared = await server.ssrLoadModule('/src/generated/routines-shared/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  ({ kt: createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-Cf4IuK3L.js'));
});
after(() => server?.close());

const intl = () => createIntl({ locale: 'en-US', defaultLocale: 'en-US', messages: {} });

test('the generated graph is current (--check)', async () => {
  const manifest = await extractRoutinesShared({ check: true });
  assert.equal(manifest.referenceVersion, '2.42304.0');
  // Every root has a semantic name in index.mjs, and every adapter the graph imports is exported by the adapter module.
  for (const name of Object.keys(manifest.publicNames)) assert.ok(name in shared, `index.mjs exports ${name}`);
  for (const { name } of manifest.adapters) assert.equal(typeof adapters[name], 'function', `adapter ${name}`);
  // Host code imports semantic names only: index.mjs re-exports roots, the chunk modules keep the original local names.
  const index = await fs.readFile(path.join(OUT, 'index.mjs'), 'utf8');
  assert.match(index, /kx as scheduledTaskErrorCategory/);
  assert.match(index, /Ft as describeStartFailure/);
  assert.match(index, /Ji as ScheduledTaskCard/);
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
