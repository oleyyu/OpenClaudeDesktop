// R4g-routines RT5 (tasks-code-routines WI-5, D32): the Code mode Routines page (src/source-code-routines.jsx) mounting
// the 2.42304.0 page (src/generated/code-routines) over the host scheduler through src/code-routine-model.mjs, and its
// wiring in main.jsx. Vite SSR (no HMR / websocket / watcher, no port); lazy surfaces are awaited with React's static
// prerender. The scheduler is a `call` stub (the real scheduler and runner are covered by code-routine-model.test.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerenderToNodeStream } from 'react-dom/static';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
let server, page, generated, route, form, shared4, adapters, model, createIntl, dict;
// Test seam: the branch picker's combobox (cd2687f9f N) records the props Dt hands it, so the three empty states of
// cov1-03 are observable without opening the popup. Only this test server sees the wrapper; the file is unchanged.
const comboboxProps = [];
const recordCombobox = {
  name: 'record-combobox-props',
  transform(code, id) {
    if (!id.endsWith('/generated/code-routines/cd2687f9f-DbP_phEX.mjs')) return null;
    const tail = 'export { E, D, O, k, he, A, j, M, ge, N };';
    assert.equal(code.split(tail).length - 1, 1);
    return code.split(tail).join('const __recordN = (props) => { globalThis.__codeRoutinesCombobox?.push(props); return N(props); };\n'
      + 'export { E, D, O, k, he, A, j, M, ge, __recordN as N };');
  },
};
before(async () => {
  globalThis.__codeRoutinesCombobox = comboboxProps;
  server = await createServer({ configFile: false, root: ROOT, plugins: [react(), recordCombobox],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  page = await server.ssrLoadModule('/src/source-code-routines.jsx');
  generated = await server.ssrLoadModule('/src/generated/code-routines/index.mjs');
  route = await server.ssrLoadModule('/src/generated/code-routines/cbd6c85c8-PO73iD62.mjs');
  form = await server.ssrLoadModule('/src/generated/code-routines/c0fd2fda3-DzTjEtm3.mjs');
  shared4 = await server.ssrLoadModule('/src/generated/code-routines/shared-4-CJsHhp5n.mjs');
  adapters = await server.ssrLoadModule('/src/source-code-routines-adapters.jsx');
  model = await server.ssrLoadModule('/src/code-routine-model.mjs');
  ({ kt: createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-Cf4IuK3L.js'));
  dict = (await import('../electron/i18n/zh-CN/index.mjs')).default;
});
after(async () => { delete globalThis.__codeRoutinesCombobox; await server?.close(); });

const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;|&#160;/g, ' ').replace(/[\ue000-\uf8ff]/g, ' ').replace(/[\s\u00a0\u200b\u2060\ufeff]+/g, ' ').trim();
// The lazy surfaces load through view-tabs' preload helper, which reads window.event (D21: SSR needs a window stub).
async function prerender(node) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: { event: undefined, dispatchEvent: () => true, navigator: { userAgent: 'node' } }, configurable: true, writable: true });
  try {
    const { prelude } = await prerenderToNodeStream(node);
    let html = '';
    for await (const chunk of prelude) html += chunk;
    return html;
  } finally {
    if (saved) Object.defineProperty(globalThis, 'window', saved); else delete globalThis.window;
  }
}
const intl = () => createIntl({ locale: 'en-US', defaultLocale: 'en-US', messages: {} });

const ROW = {
  id: 'task-1', kind: 'code', name: 'Nightly tests', description: 'Run the suite', prompt: 'Run the tests and report.', cwd: '/work/repo',
  cron: '0 9 * * *', fireAt: null, enabled: true, createdAt: Date.UTC(2026, 9, 1), lastRunAt: Date.UTC(2026, 9, 16, 9), nextRunAt: Date.UTC(2026, 9, 18, 9),
  options: { model: 'host-model', permission: 'ask' }, useWorktree: true, sourceBranch: 'main',
  missedRuns: [{ time: '2026-10-15T09:00:00.000Z', reason: 'per_task_limit' }],
  runs: [{ id: 'r2', status: 'completed', trigger: 'scheduled', startedAt: Date.UTC(2026, 9, 16, 9), finishedAt: Date.UTC(2026, 9, 16, 9, 5), threadId: 'thread-2' },
    { id: 'r1', status: 'failed', trigger: 'manual', startedAt: Date.UTC(2026, 9, 14, 9), threadId: 'thread-1', error: 'Turn failed' }],
};
/** A renderer `call` over fixed rows; every request is logged. */
function stubCall(rows = [ROW], extra = {}) {
  const calls = [];
  const call = async (channel, p) => {
    calls.push([channel, p]);
    if (channel === 'local-routines' && p.action === 'list') return structuredClone(rows.filter((row) => !p.kind || row.kind === p.kind));
    if (channel in extra) return extra[channel](p);
    throw new Error(`unexpected ${channel} ${JSON.stringify(p)}`);
  };
  return { call, calls };
}
const props = (call, more = {}) => ({ call, selectedId: null, onSelect() {}, onSession() {}, models: [{ model: 'host-model', displayName: 'Host model' }],
  bypassEnabled: true, executionProfile: { model: 'host-model', permission: 'ask' }, sessions: [], sessionMetadata: {}, state: {}, sessionsReady: true,
  subscribe: () => () => {}, ...more });

test('main.jsx mounts the Code Routines page for Code mode in place of the placeholder', async () => {
  const main = await fs.readFile(path.join(ROOT, 'src/main.jsx'), 'utf8');
  assert.equal(main.split("import { SourceCodeRoutines } from './source-code-routines.jsx';").length - 1, 1);
  const branch = "section === 'routines' && mode === 'code' ? <SourceCodeRoutines call={call} selectedId={routineSelection} onSelect={setRoutineSelection} onSession={navigate}";
  assert.equal(main.split(branch).length - 1, 1);
  // The Code branch comes before the Cowork one and the generic section surface.
  assert.ok(main.indexOf(branch) < main.indexOf("section === 'routines' && mode !== 'code' ? <SourceRoutines"));
  // The Cowork page and home now read Cowork rows only (kind 'cowork'): Code tasks stay on the Code page.
  assert.match(await fs.readFile(path.join(ROOT, 'src/source-routines.jsx'), 'utf8'), /useLocalRoutines\(call, 'cowork'\)/);
  assert.match(await fs.readFile(path.join(ROOT, 'src/source-cowork-home.jsx'), 'utf8'), /useLocalRoutines\(call, 'cowork'\)/);
});

test('the page renders the original Routines list frame (not the placeholder) and reads only Code tasks', async () => {
  const { call, calls } = stubCall();
  const html = renderToStaticMarkup(React.createElement(page.SourceCodeRoutines, props(call)));
  assert.match(html, /data-cds="Page"/);
  // The local create action is offered (CCDScheduledTasks.createScheduledTask exists); the rows wait for the list.
  assert.match(text(html), /^Routines New routine Loading/);
  assert.doesNotMatch(html, /Scheduled tasks aren’t available/);
  // The list is the official state machine over the host bridge: one list request, kind code.
  const tasks = await adapters.CCDScheduledTasks.getAllScheduledTasks();
  assert.deepEqual(tasks.map((task) => task.displayName), ['Nightly tests']);
  assert.deepEqual(calls.at(-1), ['local-routines', { action: 'list', kind: 'code' }]);
  // The bridges expose what the host has, nothing more (hostGap 5); RT6 removes a task's Always allowed rule.
  assert.equal(typeof adapters.CCDScheduledTasks.removeApprovedPermission, 'function');
  assert.equal(adapters.CCDScheduledTasks.getScheduledTaskFileContent, undefined);
  assert.equal(typeof adapters.LocalSessions.start, 'function');
  assert.equal(typeof adapters.LocalSessions.getLocalBranches, 'function');
  // R4i-routines RI2: the folder field's Recent list reads getAll (c749529a1 F) over recent-folder-sessions.
  assert.equal(typeof adapters.LocalSessions.getAll, 'function');
  assert.equal(adapters.LocalSessions.onOnEvent, undefined);
  assert.equal(typeof adapters.FileSystem.browseFolder, 'function');
});

test('a routines link selects the task (list to detail), the create page or the list', () => {
  const selected = [];
  let hosts;
  const Probe = (p) => { hosts = page.useCodeRoutinesHosts(p); return null; };
  renderToStaticMarkup(React.createElement(Probe, props(stubCall().call, { onSelect: (id) => selected.push(id) })));
  // The card link / router push (Ol: `${scheduledBasePath}/${id}`) and the detail's Back (router back / onNavigate()).
  hosts.shared.navigate('/code/routines/task-1', { replace: false });
  hosts.shared.navigate('/epitaxy/scheduled/task-1', { replace: false });
  hosts.shared.navigate('/code/routines/new-local', { replace: false });
  hosts.shared.navigate(-1, { replace: false });
  hosts.shared.navigate('/code/sessions/x', { replace: false });
  hosts.select(undefined);
  assert.deepEqual(selected, ['task-1', 'task-1', 'new-local', null, null]);
  assert.equal(hosts.shared.pathname, '/code/routines');
  // The card menu's bridge (shared-4 dh) is the same local-routines bridge; the form gets the host models.
  assert.equal(hosts.shared.bridge, hosts.host.bridge);
  assert.deepEqual(hosts.shared.models, [{ id: 'host-model', name: 'Host model' }]);
  assert.equal(hosts.host.bypassAvailable, true);
});

test('a selected task opens the original local detail with its history and missed runs', async () => {
  const { call } = stubCall();
  const p = props(call, { selectedId: 'task-1' });
  // Register the host, then let the official list reader (shared-4 Rm) read the bridge, as the page's first effect does.
  renderToStaticMarkup(React.createElement(page.SourceCodeRoutines, p));
  await shared4.Rm(adapters.CCDScheduledTasks, false);
  // The sessions store the page fills (its effect): the runs with a session.
  const sessions = [{ id: 'thread-2', name: 'Nightly run', updatedAt: Date.UTC(2026, 9, 16, 9, 5) }];
  adapters.ccdSessionsStore.setState({ sessions: model.codeRoutineSessions([ROW], { sessions, metadata: {}, state: {} }), isInitialized: true });
  const html = await prerender(React.createElement(page.SourceCodeRoutines, p));
  const body = text(html);
  // Jc found the task in the bridge's list and mounted the lazy cfc18e0f4 detail (the list is still rereading here,
  // so the detail shows its "latest version" loading line and History waits).
  assert.match(body, /^Routines \/ Nightly tests/);
  assert.match(body, /Run now/);
  assert.match(body, /Description Run the suite Status Active Next run: /);
  assert.match(body, /Folder \/work\/ repo Repeats Daily at 9:00 AM/);
  assert.match(body, /Instructions Run the tests and report\./);
  assert.doesNotMatch(html, /data-testid="runs-on"|Ant only/);
  // Loaded, the detail lists the task's sessions (one failed) and its missed run as Skipped (cfc18e0f4 He / Y / Ue).
  const detail = await prerender(React.createElement(adapters.CodeRoutinesHostProvider, { value: {} },
    React.createElement(generated.LocalRoutineDetail, { scheduledTask: model.codeScheduledTask(ROW), sessions: adapters.ccdSessionsStore.getState().sessions,
      isLoadingTask: false, taskReadFailed: false, isLoadingSessions: false, existingNames: new Set(), isRunning: false, isDeleting: false,
      onRunNow() {}, onEnable() {}, onDisable() {}, onDelete() {}, onBack() {}, onSessionClick() {}, isRunDisabled: false, onRemoveApprovedPermission() {} })));
  const history = text(detail).slice(text(detail).indexOf('History'));
  assert.match(history, /^History /);
  assert.equal(history.split('Failed').length - 1, 1);
  assert.equal(history.split('Skipped').length - 1, 1);
  assert.doesNotMatch(history, /No runs yet/);
  assert.doesNotMatch(text(detail), /Loading the latest version/);
});

// R4g-routines RT6 (WI-6, hostGap 7): the original Always allowed block (cfc18e0f4 Ve) over the task's own rules.
test('the detail lists the task’s Always allowed rules (cfc18e0f4 Ve) and removes one through the scheduler', async () => {
  const detail = (row) => prerender(React.createElement(adapters.CodeRoutinesHostProvider, { value: {} },
    React.createElement(generated.LocalRoutineDetail, { scheduledTask: model.codeScheduledTask(row), sessions: [],
      isLoadingTask: false, taskReadFailed: false, isLoadingSessions: false, existingNames: new Set(), isRunning: false, isDeleting: false,
      onRunNow() {}, onEnable() {}, onDisable() {}, onDelete() {}, onBack() {}, onSessionClick() {}, isRunDisabled: false, onRemoveApprovedPermission() {} })));
  const block = (html) => { const body = text(html); return body.slice(body.indexOf('Always allowed'), body.indexOf('Instructions')); };
  // No rule yet (Ask mode): the original empty line, which the host now fills from a run's "Allow for this session".
  assert.match(block(await detail(ROW)), /^Always allowed Approvals you grant during a run appear here\.\s*$/);
  // Stored rules: one chip per official key, "Bash (<command>)", with the original remove button.
  const html = await detail({ ...ROW, approvedPermissions: [{ toolName: 'Bash', ruleContent: 'npm test', cwd: '' },
    { toolName: 'Bash', ruleContent: 'npm test', cwd: 'pkg' }, { toolName: 'Bash', ruleContent: 'git status', cwd: '', escalation: 'workspace-write' }] });
  assert.match(block(html), /^Always allowed Bash \(npm test\) Bash \(git status\)\s*$/);
  assert.equal(html.split('aria-label="Remove approval"').length - 1, 2);
  // Auto mode keeps the original unsupervised line instead.
  assert.match(block(await detail({ ...ROW, options: { ...ROW.options, permission: 'auto' } })), /^Always allowed Automatically approve/);
  // The chip's removal (Jc I → CCDScheduledTasks.removeApprovedPermission) is the scheduler's remove-approval.
  const { call, calls } = stubCall([ROW], { 'local-routines': () => ({}) });
  renderToStaticMarkup(React.createElement(page.SourceCodeRoutines, props(call)));
  assert.equal(await adapters.CCDScheduledTasks.removeApprovedPermission('task-1', 'Bash', 'npm test'), true);
  assert.deepEqual(calls.at(-1), ['local-routines', { action: 'remove-approval', id: 'task-1', toolName: 'Bash', ruleContent: 'npm test' }]);
});

test('new-local opens the original create form: folder required, no Runs on', async () => {
  const { call } = stubCall([]);
  const html = await prerender(React.createElement(page.SourceCodeRoutines, props(call, { selectedId: 'new-local' })));
  const body = text(html);
  assert.match(body, /Select folder/);
  assert.match(body, /Worktree/);
  assert.match(body, /Create/);
  assert.doesNotMatch(body, /Runs on|Ant only/);
  // c0fd2fda3 tn: a filled form without a folder is "folderRequired" ("Select a folder."), as the scheduler says.
  const filled = { name: 'Nightly', nameCollision: undefined, description: 'd', prompt: 'p', customCronValid: true };
  assert.equal(form.tn({ ...filled, cwd: undefined }), 'folderRequired');
  assert.equal(form.tn({ ...filled, cwd: '/work/repo' }), undefined);
  assert.equal(form.nn(intl(), 'folderRequired'), 'Select a folder.');
  assert.equal(form.tn({ ...filled, description: ' ', cwd: '/work/repo' }), 'descriptionRequired');
});

test('the branch picker shows the original empty states over the host branches (cov1-03)', async () => {
  const branches = { '/work/none': [], '/work/repo': ['main', 'feature/x'] };
  let release;
  const { call } = stubCall([], {
    folder: (p) => p.path,
    'workspace-git-branches': (p) => p.cwd === '/work/slow' ? new Promise((resolve) => { release = () => resolve(['main']); }) : branches[p.cwd],
  });
  const p = props(call);
  let hosts;
  const Probe = (q) => { hosts = page.useCodeRoutinesHosts(q); return null; };
  renderToStaticMarkup(React.createElement(Probe, p));
  const field = (cwd) => {
    comboboxProps.length = 0;
    renderToStaticMarkup(React.createElement(adapters.CodeRoutinesHostProvider, { value: hosts.host },
      React.createElement(generated.RoutineBranchField, { cwd, remote: null, value: undefined, onChange() {} })));
    return comboboxProps.at(-1);
  };
  // Prime the official branch query (cc233fde2: queryKey localGitBranches / cwd / null) the way its effect does.
  const prime = async (cwd, wait = true) => {
    let refetch;
    const Q = () => { ({ refetch } = adapters.useHostQuery({ queryKey: ['localGitBranches', cwd, null], queryFn: () => adapters.LocalSessions.getLocalBranches(cwd), enabled: false })); return null; };
    renderToStaticMarkup(React.createElement(adapters.CodeRoutinesHostProvider, { value: hosts.host }, React.createElement(Q)));
    const done = refetch();
    if (wait) await done;
    return done;
  };
  await prime('/work/none');
  assert.equal(field('/work/none').emptyMessage, 'No branches');
  await prime('/work/repo');
  const repo = field('/work/repo');
  assert.deepEqual(repo.items, ['main', 'feature/x']);
  assert.equal(repo.emptyMessage, 'No branches match');
  const pending = prime('/work/slow', false);
  await new Promise((resolve) => setImmediate(resolve));
  const loading = field('/work/slow');
  assert.equal(loading.isLoading, true);
  assert.equal(loading.emptyMessage, null);
  release();
  await pending;
});

test('Run now starts through the main process runner and words its result (Uc / Hc, cov11-01)', async () => {
  const toasts = [];
  const run = async (reply) => {
    const { call, calls } = stubCall([], { 'local-routines': reply });
    const sessions = model.createCodeLocalSessions({ call });
    await route.Uc({ scheduledTask: model.codeScheduledTask(ROW), m: route.zc, displayName: 'Nightly tests', clampStoredPermissionMode: async (mode) => mode,
      addError: (message) => toasts.push(['error', message]), addSuccess: (message) => toasts.push(['success', message]), intl: intl(), track() {},
      ensureWorkspaceTrust: async () => true, startLocalSession: sessions.start, cliFloorForModel: () => undefined, enabledMcpTools: undefined,
      enabledExtensionIds: undefined, ensureToolsReady: undefined, billingNotSelfManageable: false });
    return calls;
  };
  const calls = await run(async (p) => (p.action === 'run' ? { id: 'run-1', status: 'running', threadId: 'thread-9' } : []));
  assert.deepEqual(calls.find(([channel]) => channel === 'local-routines'), ['local-routines', { action: 'run', id: 'task-1' }]);
  assert.deepEqual(toasts.at(-1), ['success', '“Nightly tests” started.']);
  await run(async () => { throw new Error('Folder not found: /work/repo [ccdErrorCategory:cwd_not_found]'); });
  assert.deepEqual(toasts.at(-1), ['error', 'Couldn’t start “Nightly tests”. Folder not found.']);
  await run(async () => { throw new Error('The core disconnected.'); });
  assert.deepEqual(toasts.at(-1), ['error', 'Couldn’t start “Nightly tests”. Try again.']);
});

test('zh-CN has the page copy and the failure titles the host can emit', () => {
  for (const key of ['Couldn’t start “{name}”. {cause}.', 'Couldn’t start “{name}”. {cause}. Try again.', 'Couldn’t start “{name}”. Try again.', '“{name}” started.',
    'Loading routine', 'Loading form', 'Loading runs', 'Select folder', 'Settings default', 'Folder not found', 'This folder isn’t a Git repository', 'Git is required',
    'Couldn’t check out the branch', 'This session’s branch is checked out in another folder', 'Couldn’t set up Git for this session', 'Not enough disk space',
    'Couldn’t read or write session files', 'Connection lost', 'Enable routine', 'Pause routine', 'This routine couldn’t be found', 'Couldn’t load this routine'])
    assert.ok(typeof dict[key] === 'string' && dict[key], key);
});
