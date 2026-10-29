import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCoworkScheduled } from '../scripts/extract-cowork-scheduled.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// R4g-routines RTC (CW-1): the Cowork Scheduled page's 3.6556.2 pieces (w3-cowork-scheduled; scripts/extract-cowork-scheduled.mjs:
// ccd3f68fe ps detail / su templates, c97b955f1 La form, over routines-shared's cards and src/source-routine-cowork-adapters.jsx),
// and the page host (src/source-routine-cowork-page-adapters.jsx). SSR, and the form through a hook dispatcher (D21);
// no browser, no network, no external process.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// The form reads matchMedia (shared-25 Di) and the user agent (shared-25 ml) while rendering; the view-tabs preload
// helper reads document.createElement when its module evaluates (D21).
globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, gen, shared, page, cowork, routine, sharedAdapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-scheduled/index.mjs');
  shared = await server.ssrLoadModule('/src/generated/routines-shared/index.mjs');
  page = await server.ssrLoadModule('/src/source-routine-cowork-page-adapters.jsx');
  cowork = await server.ssrLoadModule('/src/source-routine-cowork-adapters.jsx');
  routine = await server.ssrLoadModule('/src/source-routine-adapters.jsx');
  sharedAdapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
});
after(() => server?.close());

const row = (patch = {}) => ({ id: 't1', kind: 'cowork', name: 'Daily digest', prompt: 'Summarize /notes today', description: 'Morning summary',
  cwd: '/tmp/digest', cron: '0 9 * * *', fireAt: null, enabled: true, nextRunAt: Date.now() + 36e5, lastRunAt: null,
  options: { model: 'deepseek-chat', permission: 'ask' }, runs: [], missedRuns: [], ...patch });
const pageHost = (patch = {}) => {
  const calls = [];
  return { calls, host: { mutate: async request => { calls.push(request); return row({ id: request.id ?? 'n1', name: request.name }); }, error() {}, busy: null,
    call: async (name, payload) => { calls.push([name, payload]); return name === 'folder' ? '/Users/me/Notes' : undefined; },
    models: [{ model: 'deepseek-chat', displayName: 'DeepSeek Chat' }], bypassEnabled: false, executionProfile: { model: 'deepseek-chat', permission: 'ask' },
    readState: null, editingTask: {}, ...patch } };
};
const inPage = (host, element) => h(routine.RoutineContext.Provider, { value: host }, element);

// A hook dispatcher for one function component (the dialog's content renders through a portal, which SSR leaves out).
function fixture(component, props, contexts) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const read = c => (contexts.has(c) ? contexts.get(c) : c._currentValue);
  const hooks = {
    use: read, useContext: read, useId: () => ':f:', useDebugValue() {}, useSyncExternalStore: (subscribe, get) => get(),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useReducer(reducer, initialArg, init) { const i = cursor++; if (!cells[i]) { const cell = { value: init ? init(initialArg) : initialArg }; cell.dispatch = action => { cell.value = reducer(cell.value, action); }; cells[i] = cell; } return [cells[i].value, cells[i].dispatch]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    useImperativeHandle(ref, make, deps) { hooks.useEffect(() => { if (ref) ref.current = make(); }, deps); },
    useTransition: () => [false, fn => fn()], useDeferredValue: value => value,
  };
  hooks.useLayoutEffect = hooks.useEffect; hooks.useInsertionEffect = hooks.useEffect; hooks.useEffectEvent = fn => fn;
  const render = () => { cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H; internal.H = withMemoCache(hooks); try { return (tree = component(props)); } finally { internal.H = old; } };
  const settle = () => { for (let i = 0; i < 3; i++) { render(); while (effects.length) effects.shift()(); } render(); };
  settle();
  return { get tree() { return tree; }, settle };
}
const elements = tree => {
  const out = [], seen = new Set();
  const walk = node => { if (!node || typeof node !== 'object' || seen.has(node)) return; seen.add(node); if (Array.isArray(node)) return node.forEach(walk);
    if (node.$$typeof) { out.push(node); Object.values(node.props ?? {}).forEach(walk); } };
  walk(tree);
  return out;
};
function openForm(props, host) {
  const bridge = page.coworkScheduledTasksBridge(host);
  const contexts = new Map([[routine.RoutineContext, host], [sharedAdapters.RoutinesSharedHost, { navigate() {}, pathname: '', search: '', bridge, models: host.models }]]);
  const f = fixture(gen.UpsertScheduledTaskModal, { isOpen: true, existingNames: new Set(), initialSurface: 'chat',
    initialValues: { permissionMode: 'default', model: 'deepseek-chat' }, ...props }, contexts);
  const field = label => elements(f.tree).find(n => n.props?.['aria-label'] === label && n.props?.onChange);
  const type = (label, value) => { field(label).props.onChange({ target: { value } }); f.settle(); };
  const save = () => elements(f.tree).find(n => n.props?.onClick && 'busy' in n.props && n.props.variant === 'primary');
  return { f, field, type, save };
}

test('the generated graph is current (--check), its roots and adapters exist, and it shares routines-shared', async () => {
  const manifest = await extractCoworkScheduled({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  for (const name of Object.keys(manifest.publicNames)) assert.ok(name in gen, `index.mjs exports ${name}`);
  for (const { name } of manifest.adapters) assert.ok(name in cowork, `adapter ${name}`);
  assert.ok(manifest.routinesSharedImports > 100, 'bindings routines-shared holds are imported, not copied');
  // The card menu and the scheduled copy are routines-shared's own objects.
  assert.equal(manifest.publicNames.ScheduledTaskMenu.routinesShared, 'shared-18-D3y8YMFN.mjs');
  assert.match(local('src/generated/cowork-scheduled/index.mjs'), /export \{ vW as ScheduledTaskMenu \} from "\.\.\/routines-shared\/shared-18-D3y8YMFN\.mjs";/);
  // The form's focus-return hook (shared-7 kk) reads shared-frame rn through its view-tabs semantic name (D46).
  assert.match(local('src/generated/cowork-scheduled/shared-7-DBAgAi5H.mjs'), /\bcanFocusComposerOnClick as [\w$]+,[^}]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  // Nothing in the graph comes from the 2.31226.0 current-chat graph.
  for (const file of fs.readdirSync(path.join(app, 'src/generated/cowork-scheduled'))) assert.doesNotMatch(local(`src/generated/cowork-scheduled/${file}`), /current-chat/, file);
  // Official evidence of the roots (counted on the minified chunks).
  const ccd = official('ccd3f68fe-C8Xiv_qI.js'), form = official('c97b955f1-Dd4YYfBl.js');
  for (const needle of ['function ps(e){let $=J9(576),{scheduledTask:t,routineAnswer:d,routineRead:f,', 'function su(e){let $=J9(20),{template:t,busy:n,disabled:r,onSelect:a}=e',
    'eu=[{id:"daily_briefing"', 'Approvals you grant during a run appear here.', 'backHref:se,']) assert.equal(count(ccd, needle), 1, needle);
  for (const needle of ['var aa=e({UpsertScheduledTaskModal:()=>La})', 'which can keep its own permission setting. If Skip all approvals applies',
    'qs=!!we?.createScheduledTask&&!He?.localTasksOff']) assert.equal(count(form, needle), 1, needle);
});

test('the page imports the cowork-scheduled pieces; the 2.31226.0 current-chat graph is retired', () => {
  const source = local('src/source-routines.jsx');
  assert.doesNotMatch(source, /generated\/current-chat/);
  assert.match(source, /from '\.\/generated\/cowork-scheduled\/index\.mjs';/);
  assert.match(source, /ScheduledTaskStatusLine as RoutineStatus, ScheduledTaskDivider as RoutineDivider \} from '\.\/generated\/routines-shared\/index\.mjs';/);
  // w10-curchat-retire (CC-14 / CC-16): the generator, its prepare script and the whole folder are gone, so its
  // unreached scheduled-task adapter rows (ccd3f68fe, c97b955f1, cdbc75b4b, ...) went with them.
  for (const rel of ['src/generated/current-chat', 'scripts/extract-current-chat-ui.mjs', 'scripts/prepare-current-chat-ui.mjs'])
    assert.equal(fs.existsSync(path.join(app, rel)), false, rel);
});

test('templates: the su card over eu / $l, and the grid classes the page applies', () => {
  const ids = gen.SCHEDULED_TASK_TEMPLATES.map(template => template.id);
  assert.deepEqual(ids, ['daily_briefing', 'inbox_triage', 'meeting_prep', 'weekly_review', 'content_ideas', 'monitor_topic']);
  const daily = gen.SCHEDULED_TASK_TEMPLATES[0];
  assert.equal(daily.cron, '0 8 * * 1-5');
  assert.equal(gen.scheduledTaskTemplateMessages[daily.title].defaultMessage, 'Daily briefing');
  // The templates carry a "Set up a … with Claude" prompt, no task prompt body (host difference: the form opens
  // with name, description and schedule; the instructions start empty).
  assert.equal('promptBody' in daily, false);
  assert.match(gen.scheduledTaskTemplateMessages[daily.prompt].defaultMessage, /^Set up a \{kind, select, routines \{routine\} other \{scheduled task\}\} that gives me/);
  const html = renderToStaticMarkup(h(gen.ScheduledTaskTemplateCard, { template: daily, onSelect() {} }));
  // The card draws routines-shared's cdbc75b4b Gr, a hit row (RC-05).
  assert.match(html, /^<button type="button" aria-busy="false" class="group relative hit-row hit-row-main flex w-full gap-md rounded-lg p-2 text-start/);
  assert.match(text(html), /Daily briefing What needs your attention today across calendar, email, and messages\.\W+Weekdays at 8:00 AM/);
  assert.equal(gen.routineGridClass, 'mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6');
  // RC-05 (w3-cowork-scheduled): the template grid is 3.6556.2 cdbc75b4b Wr(columns) (ccd3f68fe-C8Xiv_qI wraps it as
  // `w-full ${Wr(u)}`, columns 2); 2.42304.0 ccd3f68fe Qc ("grid w-full grid-cols-1 gap-x-6 gap-y-md" + "md:grid-cols-2") is gone.
  assert.equal(gen.routineTemplateGridClass, 'grid grid-cols-1 hit-grid-gap-y-md');
  assert.equal(gen.routineTemplateTwoColumnGridClass, 'grid grid-cols-1 hit-grid-gap-y-md md:grid-cols-2 md:hit-grid-gap-x-6');
  assert.equal('routineTemplateColumnsClass' in gen, false);
  const manifest = JSON.parse(local('src/generated/cowork-scheduled/manifest.json'));
  assert.deepEqual(manifest.literals.routineTemplateTwoColumnGridClass, { file: 'cdbc75b4b-BCUW8bqT.js', owner: 'Wr', value: gen.routineTemplateTwoColumnGridClass });
  assert.ok(manifest.callSites.some(site => site.source === 'ccd3f68fe-C8Xiv_qI.js'
    && site.features.includes('o("div",{className:`w-full ${eo(u)}`,children:[a,I.map((e,t)=>i(su,{template:e,')));
  const pageSource = local('src/source-routines.jsx');
  assert.match(pageSource, /<div className=\{`w-full \$\{routineTemplateTwoColumnGridClass\}`\}>/);
});

test('card: the routines-shared card inside the page host, linking to the task and offering its menu', () => {
  const { host } = pageHost();
  const task = routine.sourceRoutine(row());
  const html = renderToStaticMarkup(inPage(host, h(page.CoworkScheduledTaskCard, { task, title: task.displayName,
    statusChip: h(shared.ScheduledTaskStatusLine, { task }), isRunning: false, onRunNow() {}, onEdit() {}, onDelete() {} })));
  assert.match(html, /^<div style="display:contents"><div data-grid-cell="" class="group relative flex h-full flex-col gap-xs rounded-card bg-surface-1 p-lg shadow-card-ring/);
  assert.match(html, /<a href="\/scheduled-task\/t1" data-primary="true"/);
  assert.match(html, /aria-label="More options for Daily digest"/);
  assert.match(text(html), /Daily digest Morning summary Active\W+Daily at 9:00 AM/);
});

test('detail: ccd3f68fe ps for a local task, its run history without the cloud-move "Only this computer" mark', () => {
  const { host } = pageHost();
  const task = { ...routine.sourceRoutine(row()), missedRuns: [{ time: new Date(Date.now() - 864e5).toISOString(), reason: 'per_task_limit' }] };
  const sessions = [{ sessionId: 's1', createdAt: Date.now() - 36e5, origin: 'scheduled_trigger', ranOn: 'this_computer', lastActivityAt: Date.now() - 35e5, isRunning: false, liveStatus: 'idle' }];
  const html = renderToStaticMarkup(inPage(host, h(page.CoworkScheduledTaskDetail, { scheduledTask: task, sessions, isRunning: false, isDeleting: false,
    onRunNow() {}, onEnable() {}, onDisable() {}, onEdit() {}, onDelete() {}, onBack() {}, onSessionOpen() {}, sessionHrefPrefix: '/cowork' })));
  const body = text(html);
  for (const part of ['All scheduled tasks', 'Daily digest', 'Morning summary', 'Active', 'Only on this computer', 'Next run:', 'Run now', 'History', 'Skipped',
    'Instructions', 'Summarize /notes today', 'Folder', '/tmp/digest', 'Repeats', 'Daily at 9:00 AM']) assert.ok(body.includes(part), part);
  // Local task: no device hold, no session host stop, no cloud move, and the run row has no ranOn mark.
  for (const absent of ['Only this computer', 'Move to cloud', 'Paused until', 'connection-hold', 'routine-moved']) assert.ok(!html.includes(absent), absent);
  assert.match(html, /aria-label="Enable schedule"/);
  // 3.6556.2 ps draws the back link from backHref (the page adapter maps the page's onBack to it).
  assert.match(html, /<a href="\/scheduled-task"[^>]*>.*?All scheduled tasks<\/a>/);
  assert.equal(page.coworkDetailProps({ onBack() {}, sessions: [] }).backHref, page.COWORK_SCHEDULED_HREF);
  assert.equal('onBack' in page.coworkDetailProps({ onBack() {}, sessions: [] }), false);
  assert.equal('backHref' in page.coworkDetailProps({ sessions: [] }), false);
  assert.deepEqual(page.coworkDetailProps({ scheduledTask: { migratedFromLocalTask: { id: 'x' } }, sessions }).sessions[0].ranOn, 'this_computer');
});

test('form: c97b955f1 La creates a local Cowork task through the page bridge (local-routines create)', async () => {
  const { host, calls } = pageHost();
  let closed = 0;
  const form = openForm({ onClose: () => closed++ }, host);
  const messages = elements(form.f.tree).flatMap(n => [n.props?.defaultMessage, typeof n.props?.children === 'string' ? n.props.children : undefined]).filter(Boolean);
  for (const label of ['Create scheduled task', 'Name', 'Description', 'Instructions', 'Cancel', 'Save']) assert.ok(messages.includes(label), label);
  assert.equal(form.save().props.disabled, true, 'name, description and instructions are required');
  form.type('Name', 'Morning digest');
  form.type('Description', 'Daily notes digest');
  form.type('Instructions', 'Summarize my notes.');
  assert.equal(form.save().props.disabled, false);
  form.save().props.onClick();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(calls, [{ action: 'create', kind: 'cowork', name: 'Morning digest', description: 'Daily notes digest', prompt: 'Summarize my notes.',
    cron: '', fireAt: null, execution: { model: 'deepseek-chat', permission: 'ask' } }]);
  assert.equal(closed, 1);
});

test('form: a template seeds name, description and schedule; editing maps the picker back to the host task', async () => {
  const seeded = pageHost();
  const template = openForm({ onClose() {}, initialValues: { permissionMode: 'default', model: 'deepseek-chat', name: 'Daily briefing',
    description: 'What needs your attention today.', prompt: undefined, cronExpression: '0 8 * * 1-5', source: 'local', bindToComputer: true } }, seeded.host);
  assert.deepEqual([template.field('Name').props.value, template.field('Description').props.value, template.field('Instructions').props.value],
    ['Daily briefing', 'What needs your attention today.', '']);
  template.type('Instructions', 'Brief me.');
  template.save().props.onClick();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(seeded.calls[0].cron, '0 8 * * 1-5');

  const editingRow = row({ options: { model: 'deepseek-chat', permission: 'acceptEdits' } });
  const edited = pageHost({ editingTask: editingRow });
  const editing = { ...routine.sourceRoutine(editingRow), userSelectedFolders: [editingRow.cwd], permissionMode: 'acceptEdits' };
  const form = openForm({ onClose() {}, existingNames: new Set(['Daily digest']), editingTask: editing }, edited.host);
  assert.equal(form.field('Name').props.value, 'Daily digest');
  form.type('Instructions', 'Summarize my notes, briefly.');
  form.save().props.onClick();
  await new Promise(resolve => setTimeout(resolve, 20));
  // The Cowork form offers Default / Auto / Skip all approvals; its Default is the host's ask.
  assert.deepEqual(edited.calls, [{ action: 'update', id: 't1', name: 'Daily digest', description: 'Morning summary', prompt: 'Summarize my notes, briefly.',
    folder: '/tmp/digest', cron: '0 9 * * *', fireAt: null, execution: { model: 'deepseek-chat', permission: 'ask' } }]);
  assert.deepEqual(page.scheduledTaskRequest({ scheduledTaskId: 't1', displayName: 'Renamed' }, editingRow, {}).execution, { model: 'deepseek-chat', permission: 'acceptEdits' });
});

test('form folder picker (shared-8 _J adapter) chooses through the host directory dialog', async () => {
  const { host, calls } = pageHost();
  const added = [];
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache({ useContext: () => host, useCallback: fn => fn });
  let picker;
  try { picker = cowork.FolderPicker({ controlledSelection: { selectedFolders: [], addSelectedFolder: folder => added.push(folder) }, placeholder: 'Work in a folder' }); }
  finally { internal.H = old; }
  assert.equal(picker.props.icon, 'Folder');
  assert.equal(picker.props.children, 'Work in a folder');
  await picker.props.onClick();
  assert.deepEqual(calls, [['folder', { additional: true }]]);
  assert.deepEqual(added, ['/Users/me/Notes']);
});

test('bridge: status changes go to local-routines; CoworkScheduledTasks forwards to the mounted page; external links leave through the host', async () => {
  const { host, calls } = pageHost();
  const bridge = page.coworkScheduledTasksBridge(host);
  assert.equal(await bridge.updateScheduledTaskStatus('t1', 'disabled', undefined, 'local'), true);
  assert.equal(await bridge.updateScheduledTaskStatus('t1', 'enabled'), true);
  assert.equal(await bridge.updateScheduledTaskStatus('t1', 'deleted', false), true);
  assert.deepEqual(calls, [{ action: 'toggle', id: 't1', enabled: false }, { action: 'toggle', id: 't1', enabled: true }, { action: 'delete', id: 't1' }]);
  await assert.rejects(bridge.updateScheduledTask({ scheduledTaskId: 'other' }), /Scheduled task not found/);
  cowork.setActiveCoworkBridge(null);
  await assert.rejects(cowork.CoworkScheduledTasks.createScheduledTask({}), /aren’t available/);
  cowork.setActiveCoworkBridge(bridge);
  await cowork.CoworkScheduledTasks.updateScheduledTaskStatus('t1', 'disabled');
  assert.deepEqual(calls.at(-1), { action: 'toggle', id: 't1', enabled: false });
  cowork.setActiveCoworkBridge(null);
  const link = href => ({ defaultPrevented: false, prevented: 0, preventDefault() { this.prevented++; }, target: { closest: () => ({ getAttribute: () => href }) } });
  const external = link('https://support.claude.com/en/articles/13364135-use-claude-cowork-safely');
  assert.equal(page.openExternalLinkClick(external, host), true);
  assert.equal(external.prevented, 1);
  await Promise.resolve();
  assert.deepEqual(calls.at(-1), ['external', { url: 'https://support.claude.com/en/articles/13364135-use-claude-cowork-safely' }]);
  const inApp = link('/scheduled-task/t1');
  assert.equal(page.openExternalLinkClick(inApp, host), false);
  assert.equal(inApp.prevented, 0);
});

test('host answers: gates off, no cloud / devices / projects / skills, unsupervised modes by host capability; zh-CN run status copy', () => {
  assert.equal('useServerGate' in cowork, false, 'the 3.6556.2 graph reads no server gate adapter');
  assert.deepEqual(cowork.useClaudeAiFeature('dramatic_shrimp'), { status: 'blocked_by_platform', isAvailable: false, isPolicyBlocked: true, isUpsellEligible: false });
  assert.deepEqual(cowork.useGrowthBookFeature('x'), { value: null, on: false, off: true, source: 'unknownFeature', ruleId: '' });
  assert.equal(cowork.useDynamicConfig('yukon_silver_config', { memoryGB: 4 }).memoryGB, 4);
  assert.equal(cowork.useSkillChipCatalog().size, 0);
  assert.equal(cowork.useRemoteToolGrants().routineRead, 'unavailable');
  assert.ok('storedPermissionMode' in cowork.useRemoteToolGrants());
  assert.deepEqual(Object.keys(cowork.useRoutineDraftGenerator()), ['generateRoutineDraft']);
  assert.equal(cowork.useConnectorLookup().mcpUrlKeyNamesOn, false);
  assert.deepEqual(cowork.useOrgComputeSettings().defaultWorker, null);
  assert.equal(cowork.useFormCloudEnvironmentsMissing(), false);
  for (const hook of ['useUnifiedRoutineForm', 'useCodeRoutineCreateOffered', 'useProjectsReady', 'useSubscriptionPastDue', 'useTaskFileModelUnavailable'])
    assert.equal(cowork[hook](), false, hook);
  const modes = patch => {
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache({ useContext: () => ({ bypassEnabled: false, ...patch }), useMemo: fn => fn() });
    try { return [...cowork.useUnsupervisedPermissionModes()]; } finally { internal.H = old; }
  };
  assert.deepEqual(modes({}), ['auto']);
  assert.deepEqual(modes({ bypassEnabled: true }), ['auto', 'bypassPermissions']);
  assert.deepEqual(modes({ editingTask: { options: { permission: 'bypass' } } }), ['auto', 'bypassPermissions']);
  const zh = i18n.dictionary('zh-CN');
  for (const key of ['Awaiting answer', 'Using the browser', 'Click to mark as unread', 'Click to mark as read']) assert.equal(typeof zh[key], 'string', key);
  assert.match(local('electron/i18n/zh-CN/surfaces.mjs'), /\/\/ R4g-routines-cowork \(RTC, CW-1\)/);
});
