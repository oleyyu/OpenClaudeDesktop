// R4g-routines RT5 (tasks-code-routines WI-5, D32): the Code mode Routines page (src/source-code-routines.jsx) mounting
// the 3.6556.2 page (src/generated/code-routines, w3-code-routines) over the host scheduler through src/code-routine-model.mjs, and its
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
let server, page, generated, route, form, shared4, adapters, sharedAdapters, cards, model, createIntl, dict;
// The 3.6556.2 originals the SSR comparisons read (text only, never executed; R13).
const REFERENCE = path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const PREVIOUS = path.resolve(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (file, dir = REFERENCE) => fs.readFile(path.join(dir, file), 'utf8');
const once = (source, feature, label) => assert.equal(source.split(feature).length - 1, 1, `${label}: ${feature}`);
// A template literal of the original (`prefix` + backtick … backtick) with each `${expression}` replaced by the value
// this host's branch gives it; every expression must be named, so a changed original fails here.
function officialTemplate(source, prefix, values) {
  once(source, `${prefix}\``, 'template');
  const start = source.indexOf(`${prefix}\``) + prefix.length + 1;
  const body = source.slice(start, source.indexOf('`', start));
  return body.replace(/\$\{([^}]*)\}/g, (_, expression) => {
    assert.ok(Object.hasOwn(values, expression), `unmapped \${${expression}} in ${prefix}`);
    return values[expression];
  });
}
// Test seam: the branch picker's combobox (cd2687f9f we) records the props Dt hands it, so the three empty states of
// cov1-03 are observable without opening the popup. Only this test server sees the wrapper; the file is unchanged.
const comboboxProps = [];
const recordCombobox = {
  name: 'record-combobox-props',
  transform(code, id) {
    if (!id.endsWith('/generated/code-routines/cd2687f9f-BuSCKovQ.mjs')) return null;
    const tail = 'export { pe, me, he, ge, _e, ve, ye, D, O, be, k, xe, A, Se, Ce, we };';
    assert.equal(code.split(tail).length - 1, 1);
    return code.split(tail).join('const __recordWe = (props) => { globalThis.__codeRoutinesCombobox?.push(props); return we(props); };\n'
      + 'export { pe, me, he, ge, _e, ve, ye, D, O, be, k, xe, A, Se, Ce, __recordWe as we };');
  },
};
before(async () => {
  globalThis.__codeRoutinesCombobox = comboboxProps;
  server = await createServer({ configFile: false, root: ROOT, plugins: [react(), recordCombobox],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  page = await server.ssrLoadModule('/src/source-code-routines.jsx');
  generated = await server.ssrLoadModule('/src/generated/code-routines/index.mjs');
  route = await server.ssrLoadModule('/src/generated/code-routines/cbd6c85c8-D1xuycDy.mjs');
  form = await server.ssrLoadModule('/src/generated/code-routines/c0fd2fda3-CntNPbFi.mjs');
  shared4 = await server.ssrLoadModule('/src/generated/code-routines/shared-4-DUB1Oi0O.mjs');
  adapters = await server.ssrLoadModule('/src/source-code-routines-adapters.jsx');
  sharedAdapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  cards = await server.ssrLoadModule('/src/generated/routines-shared/cdbc75b4b-BCUW8bqT.mjs');
  model = await server.ssrLoadModule('/src/code-routine-model.mjs');
  ({ createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-DYfox5Co.js'));
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
  // R4i-routines RI2: the folder field's Recent list reads getAll (c749529a1 I) over recent-folder-sessions.
  assert.equal(typeof adapters.LocalSessions.getAll, 'function');
  assert.equal(adapters.LocalSessions.onOnEvent, undefined);
  assert.equal(typeof adapters.FileSystem.browseFolder, 'function');
});

test('a routines link selects the task (list to detail), the create page or the list', () => {
  const selected = [];
  let hosts;
  const Probe = (p) => { hosts = page.useCodeRoutinesHosts(p); return null; };
  renderToStaticMarkup(React.createElement(Probe, props(stubCall().call, { onSelect: (id) => selected.push(id) })));
  // The card link / router push (su: `${scheduledBasePath}/${id}`) and the detail's Back (router back / onNavigate()).
  hosts.shared.navigate('/code/routines/task-1', { replace: false });
  hosts.shared.navigate('/epitaxy/scheduled/task-1', { replace: false });
  hosts.shared.navigate('/code/routines/new-local', { replace: false });
  hosts.shared.navigate(-1, { replace: false });
  hosts.shared.navigate('/code/sessions/x', { replace: false });
  hosts.select(undefined);
  assert.deepEqual(selected, ['task-1', 'task-1', 'new-local', null, null]);
  assert.equal(hosts.shared.pathname, '/code/routines');
  // The card menu's bridge (shared-4 n_) is the same local-routines bridge; the form gets the host models.
  assert.equal(hosts.shared.bridge, hosts.host.bridge);
  assert.deepEqual(hosts.shared.models, [{ id: 'host-model', name: 'Host model' }]);
  assert.equal(hosts.host.bypassAvailable, true);
});

test('a selected task opens the original local detail with its history and missed runs', async () => {
  const { call } = stubCall();
  const p = props(call, { selectedId: 'task-1' });
  // Register the host, then let the official list reader (shared-4 Tg) read the bridge, as the page's first effect does.
  renderToStaticMarkup(React.createElement(page.SourceCodeRoutines, p));
  await shared4.Tg(adapters.CCDScheduledTasks, false);
  // The sessions store the page fills (its effect): the runs with a session.
  const sessions = [{ id: 'thread-2', name: 'Nightly run', updatedAt: Date.UTC(2026, 9, 16, 9, 5) }];
  adapters.ccdSessionsStore.setState({ sessions: model.codeRoutineSessions([ROW], { sessions, metadata: {}, state: {} }), isInitialized: true });
  const html = await prerender(React.createElement(page.SourceCodeRoutines, p));
  const body = text(html);
  // Cl found the task in the bridge's list and mounted the lazy cfc18e0f4 detail (the list is still rereading here,
  // so the detail shows its "latest version" loading line and History waits).
  assert.match(body, /^Routines \/ Nightly tests/);
  assert.match(body, /Run now/);
  assert.match(body, /Description Run the suite Status Active Next run: /);
  assert.match(body, /Folder \/work\/ repo Repeats Daily at 9:00 AM/);
  assert.match(body, /Instructions Run the tests and report\./);
  assert.doesNotMatch(html, /data-testid="runs-on"|Ant only/);
  // Loaded, the detail lists the task's sessions (one failed) and its missed run as Skipped (cfc18e0f4 $e / et / H).
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

// R4g-routines RT6 (WI-6, hostGap 7): the original Always allowed block (cfc18e0f4 Qe) over the task's own rules.
test('the detail lists the task’s Always allowed rules (cfc18e0f4 Qe) and removes one through the scheduler', async () => {
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
  // RC-07 (3.6556.2): the remove button names the tool ("Remove approval for {tool}"; no remote connector here, hostGap 7).
  assert.deepEqual([...html.matchAll(/aria-label="(Remove approval[^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"')), ['Remove approval for Bash (npm test)', 'Remove approval for Bash (git status)']);
  // Auto mode keeps the original unsupervised line instead.
  assert.match(block(await detail({ ...ROW, options: { ...ROW.options, permission: 'auto' } })), /^Always allowed Automatically approve/);
  // The chip's removal (Cl re → CCDScheduledTasks.removeApprovedPermission) is the scheduler's remove-approval.
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
  // c0fd2fda3 un: a filled form without a folder is "folderRequired" ("Select a folder."), as the scheduler says.
  const filled = { name: 'Nightly', nameCollision: undefined, description: 'd', prompt: 'p', customCronValid: true };
  assert.equal(form.un({ ...filled, cwd: undefined }), 'folderRequired');
  assert.equal(form.un({ ...filled, cwd: '/work/repo' }), undefined);
  assert.equal(form.dn(intl(), 'folderRequired'), 'Select a folder.');
  assert.equal(form.un({ ...filled, description: ' ', cwd: '/work/repo' }), 'descriptionRequired');
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

test('Run now starts through the main process runner and words its result (_l / gl, cov11-01)', async () => {
  const toasts = [];
  const run = async (reply) => {
    const { call, calls } = stubCall([], { 'local-routines': reply });
    const sessions = model.createCodeLocalSessions({ call });
    await route._l({ scheduledTask: model.codeScheduledTask(ROW), m: route.pl, displayName: 'Nightly tests', clampStoredPermissionMode: async (mode) => mode,
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

// L71 / RC-11 (w10-trans-routines-ssr): the detail's header and sections are routines-shared's 3.6556.2 c9e1458cd
// header ht → gt (cfc18e0f4 imports it as `f as we`) and section Ze (`h as M`), on the branch this host takes:
// A = ge() is false (shared-15's context is only provided under fizzy-lake "panels", shared-18 `Qc("panels")?i:!1`),
// C("panels") and S("type") are fizzy-lake parts, off (E12). The new layout strings RC-11 lists belong elsewhere:
// `De` (gap-x-6 gap-y-1), `J` (basis-40) and the back link `X` are exported as N / M / S and only the Cowork detail
// ccd3f68fe imports them; `at` (data-mac-lights) is behind A, `Ke` (font-control) behind S("type"). So the Code page
// shows none of them in 3.6556.2 either, and none of the 2.42304.0 strings they replaced.
test('RC-11: the local detail header and sections are c9e1458cd’s 3.6556.2 markup, character for character', async () => {
  const header = await official('c9e1458cd-DmywUvrC.js');
  for (const feature of ['A=ge()', 'P=C("panels")&&A?ne:"px-xs"', 'M=C("panels")&&O?le:"text-primary"', 'N=C("panels")&&O?fe:"text-secondary"',
    'F=S("type")?Ke:"text-body"', 'function mt(e){let t=oe();return C("panels")&&t&&e?I:ct}', 'sn as ge', 'og as S', 'Yo as C'])
    once(header, feature, 'c9e1458cd');
  const route = await official('cfc18e0f4-CmiyhJoV.js');
  once(route, 'import{f as we,h as M,l as N,m as Te,s as P,v as Ee,y as De}from"./c9e1458cd-DmywUvrC.js"', 'cfc18e0f4');
  once(await official('shared-18-D3y8YMFN.js'), 'a=J1($,0,i)?K1($,0,i,Qc("panels")?i:!1):$[1]', 'shared-18');
  const root = header.match(/(?<![\w$])ct="([^"]+)"/)[1];
  const [row] = officialTemplate(header, 'Ue=A?I?at:ot:', { k: '\u0000' }).split('\u0000');
  const back = officialTemplate(header, 'Pe=', { 'A?"":"-ms-[4px]"': '-ms-[4px]', P: 'px-xs', M: 'text-primary', F: 'text-body' });
  const slash = officialTemplate(header, 'Le=', { 'A?"px-0.5":"pe-[4px]"': 'pe-[4px]' });
  const title = officialTemplate(header, ':n("span",{dir:R,className:', { F: 'text-body', N: 'text-secondary', 'y||A?P:""': '' });
  once(header, 'i("section",{className:"flex flex-col gap-xs min-w-0",children:[a,r]})', 'c9e1458cd Ze');
  once(header, 'n("h2",{className:"text-body text-muted-as-secondary",children:t})', 'c9e1458cd Ze');

  const html = await prerender(React.createElement(adapters.CodeRoutinesHostProvider, { value: {} },
    React.createElement(generated.LocalRoutineDetail, { scheduledTask: model.codeScheduledTask(ROW), sessions: [], isLoadingTask: false, taskReadFailed: false,
      isLoadingSessions: false, existingNames: new Set(), isRunning: false, isDeleting: false, onRunNow() {}, onEnable() {}, onDisable() {}, onDelete() {},
      onBack() {}, onSessionClick() {}, isRunDisabled: false, onRemoveApprovedPermission() {} })));
  assert.ok(html.startsWith(`<div class="${root}"><div data-top-left="true" data-top-right="true" class="${row}`), html.slice(0, 300));
  const crumbs = `<button type="button" class="${back}">Routines</button><span class="${slash}" aria-hidden="true">/</span><span class="${title}">Nightly tests</span>`;
  once(html, crumbs.replace(/&/g, '&amp;'), 'header crumbs');
  for (const heading of ['Description', 'Status', 'Folder', 'Repeats', 'Always allowed', 'Instructions', 'History'])
    once(html, `<section class="flex flex-col gap-xs min-w-0"><h2 class="text-body text-muted-as-secondary">${heading}</h2>`, 'section');
  // Nothing of the 2.42304.0 header (the section action row, the text-muted back link) and none of the RC-11 strings
  // the official Code page does not reach.
  const previous = await official('c9e1458cd-BaNkEcxH.js', PREVIOUS);
  once(previous, '"flex flex-wrap items-center justify-between gap-1.25"', '2.42304.0 c9e1458cd');
  once(previous, 'text-body text-muted hover:text-secondary', '2.42304.0 c9e1458cd');
  for (const gone of ['justify-between gap-1.25', 'text-muted hover:text-secondary', 'basis-40', 'gap-x-6 gap-y-1"', 'data-mac-lights', 'text-muted-as-secondary hover:text-secondary'])
    assert.ok(!html.includes(gone), gone);
  assert.ok(!back.includes('font-control'), 'S("type") off: the crumb is text-body, not Ke');
  // Where De / J / X go in 3.6556.2: imported (as c9e1458cd N / M / S) by the Cowork detail only, which neither the
  // routines-shared nor the code-routines graph slices.
  const importers = new Set();
  for (const file of (await fs.readdir(REFERENCE)).filter((f) => f.endsWith('.js'))) {
    const source = await fs.readFile(path.join(REFERENCE, file), 'utf8');
    for (const [, names] of source.matchAll(/import\{([^}]*)\}from"\.\/c9e1458cd-DmywUvrC\.js"/g))
      if (names.split(',').some((name) => /^[NMS] as /.test(name))) importers.add(file);
  }
  assert.deepEqual([...importers], ['ccd3f68fe-C8Xiv_qI.js']);
  for (const area of ['routines-shared', 'code-routines']) {
    const graph = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated', area, 'manifest.json'), 'utf8'));
    assert.ok(!graph.modules.some((mod) => mod.source.startsWith('ccd3f68fe-')), `${area} slices no Cowork detail`);
    const own = graph.modules.find((mod) => mod.source === 'c9e1458cd-DmywUvrC.js');
    const bindings = new Set((own?.bindings ?? []).map((b) => (typeof b === 'string' ? b : b.name)));
    for (const local of ['De', 'J', 'X']) assert.ok(!bindings.has(local), `${area} c9e1458cd#${local}`);
  }
});

// L71 / RC-02: the model-unavailable notice is routines-shared's 3.6556.2 cdbc75b4b Er. A Code task never shows it
// (the card Br passes no model for `n.surface==="code"`), and the Switch model action is on the remote (cloud) branch
// only, whose href is shared-52 Bl (`/scheduled-task/<id>?edit=true`); cloud routines are off here, so on this host the
// Code page renders no notice, as the official page does for local Code tasks.
test('RC-02: the model notice is cdbc75b4b Er’s 3.6556.2 copy, and a Code task card shows none', async () => {
  const notice = await official('cdbc75b4b-BCUW8bqT.js');
  for (const feature of ['D=n.surface==="code"', 'M=ze(D||w?void 0:n.model,j)', 'r(Er,{variant:"icon",source:n.source})',
    'variant:"secondary",href:B(i),children:r(G,{defaultMessage:"Switch model",id:"5gFwVwyn/g"})',
    'defaultMessage:"This task\\u2019s model is no longer available. It\\u2019ll run with the next available model.",id:"Dl0Hzv/2CQ"',
    'defaultMessage:"This task\\u2019s model ({name}) is no longer available. It\\u2019ll run with the next available model.",id:"bt2Jmi62sP"',
    'defaultMessage:"This task\\u2019s model is no longer available. It runs on your default model until you choose another.",id:"Ba5Cv84jGx"',
    'defaultMessage:"This task\\u2019s model is no longer available.",id:"87rDGZK58e"', 'Sv as B'])
    once(notice, feature, 'cdbc75b4b');
  // The 2.42304.0 "Choose another model to keep it running." copy is gone.
  assert.equal(notice.split('KWj9gCraUh').length - 1, 0);
  once(await official('cdbc75b4b-DdrHYWQG.js', PREVIOUS), 'KWj9gCraUh', '2.42304.0 cdbc75b4b');
  const links = await official('shared-52-uHFNjl7C.js');
  for (const feature of ['function Bl(e){return`${Rl}/${encodeURIComponent(e)}?${zl}=true`}', 'Rl="/scheduled-task"', 'zl="edit"', 'Bl as Sv'])
    once(links, feature, 'shared-52');

  const shared = { navigate() {}, pathname: '/code/routines', search: '', bridge: undefined, models: [] };
  const notes = (props) => renderToStaticMarkup(React.createElement(sharedAdapters.RoutinesSharedHost.Provider, { value: shared }, React.createElement(cards.Er, props)));
  const remote = notes({ source: 'remote', scheduledTaskId: 'trig_1', model: null });
  assert.match(remote, /^<div data-cds="Banner"[^>]* role="status" class="[^"]* w-full mb-6">/);
  assert.match(remote, /<div class="max-w-full min-w-0 flex-auto">This task’s model is no longer available\. It’ll run with the next available model\.<\/div>/);
  assert.match(remote, /<a data-cds="Button" [^>]*href="\/scheduled-task\/trig_1\?edit=true">.*Switch model/);
  const shared0 = await server.ssrLoadModule('/src/generated/routines-shared/shared-0-DDOOdL6P.mjs');
  const name = shared0.fb('claude-sonnet-4-5');
  assert.ok(typeof name === 'string' && name.length > 0);
  assert.ok(text(notes({ source: 'remote', scheduledTaskId: 'trig_1', model: 'claude-sonnet-4-5' })).startsWith(
    `This task’s model (${name}) is no longer available. It’ll run with the next available model. Switch model`));
  const local = notes({ source: 'local' });
  assert.equal(text(local), 'This task’s model is no longer available. It runs on your default model until you choose another.');
  assert.doesNotMatch(local, /Switch model|href=/);
  assert.match(notes({ variant: 'icon', source: 'local' }), /^<span role="img" aria-label="This task’s model is no longer available\." class="inline-flex items-center text-warning flex-shrink-0 pointer-events-auto touch:pointer-events-none"/);
  for (const html of [remote, local]) assert.doesNotMatch(html, /Choose another model/);

  // The Code list: the card (cdbc75b4b Br) for a Code task whose model is gone has no notice.
  const row = { ...ROW, options: { ...ROW.options, model: 'retired-model' } };
  const { call } = stubCall([row]);
  renderToStaticMarkup(React.createElement(page.SourceCodeRoutines, props(call)));
  await shared4.Tg(adapters.CCDScheduledTasks, false);
  const list = await prerender(React.createElement(page.SourceCodeRoutines, props(call)));
  assert.match(text(list), /Nightly tests Run the suite Active Daily at 9:00 AM/);
  assert.doesNotMatch(list, /no longer available|Switch model/);
});

// L71 / RC-12: the folder field's Git badge (c0fd2fda3 tn) is a neutral xs CdsBadge with the BookClosed icon in
// 3.6556.2 (GitBranch in 2.42304.0). Its label is the server-served message `secret:2b02su` (shared-78 js / generated
// yG): no catalog the app ships has it, so the label is the original " " fallback, as on every desktop.
test('RC-12: a Git folder shows the BookClosed badge (c0fd2fda3 tn), a non-Git folder none', async () => {
  once(await official('c0fd2fda3-CntNPbFi.js'), 'i.isGitRepo?n(h,{variant:"neutral",size:"xs",icon:"BookClosed",className:"ms-auto",children:n(A,{id:"2b02su"})})', 'c0fd2fda3');
  once(await official('c0fd2fda3-DzTjEtm3.js', PREVIOUS), 'e.isGitRepo?i(A,{variant:"neutral",size:"xs",icon:"GitBranch",className:"ms-auto",children:i(v,{id:"2b02su"})})', '2.42304.0 c0fd2fda3');
  for (const catalog of ['en-US.json', 'dynamic/en-US.json']) {
    const messages = JSON.parse(await fs.readFile(path.join(REFERENCE, '../../i18n', catalog), 'utf8'));
    assert.equal(Object.keys(messages).some((key) => key.includes('2b02su')), false, catalog);
  }
  const icons = await official('shared-frame-6jtSkIit.js');
  const glyph = (name) => String.fromCodePoint(Number(icons.match(new RegExp(`[{,]${name}:(\\d+)[,}]`))[1]));
  const shared = { navigate() {}, pathname: '/code/routines', search: '', bridge: undefined, models: [] };
  const Fields = ({ cwd }) => React.createElement(form.tn, { state: form.hn({ mode: { kind: 'create', initialCwd: cwd }, existingNames: new Set(), onSaved() {}, trustGateId: 't' }) });
  const folder = (isGitRepo) => renderToStaticMarkup(React.createElement(sharedAdapters.RoutinesSharedHost.Provider, { value: shared },
    React.createElement(adapters.CodeRoutinesHostProvider, { value: { isGitRepo } }, React.createElement(Fields, { cwd: '/work/repo' }))));
  const git = folder(() => true);
  const badges = [...git.matchAll(/<span data-cds="Badge" data-size="xs" class="([^"]*)"><span data-cds="Icon"[^>]*aria-hidden="true">([^<]*)<\/span><span class="pb-\[0\.05em\]">([^<]*)<\/span><\/span>/g)];
  assert.equal(badges.length, 1);
  const [, badgeClass, icon, label] = badges[0];
  assert.match(badgeClass, /(?:^| )bg-neutral(?: |$)/);
  assert.ok(badgeClass.endsWith(' ms-auto'), badgeClass);
  assert.equal(icon, glyph('BookClosed'));
  assert.notEqual(icon, glyph('GitBranch'));
  assert.equal(label, ' ');
  assert.doesNotMatch(folder(() => false), /data-cds="Badge"/);
});

test('zh-CN has the page copy and the failure titles the host can emit', () => {
  for (const key of ['Couldn’t start “{name}”. {cause}.', 'Couldn’t start “{name}”. {cause}. Try again.', 'Couldn’t start “{name}”. Try again.', '“{name}” started.',
    'Loading routine', 'Loading form', 'Loading runs', 'Select folder', 'Settings default', 'Folder not found', 'This folder isn’t a Git repository', 'Git is required',
    'Couldn’t check out the branch', 'This session’s branch is checked out in another folder', 'Couldn’t set up Git for this session', 'Not enough disk space',
    'Couldn’t read or write session files', 'Connection lost', 'Enable routine', 'Pause routine', 'This routine couldn’t be found', 'Couldn’t load this routine'])
    assert.ok(typeof dict[key] === 'string' && dict[key], key);
});
