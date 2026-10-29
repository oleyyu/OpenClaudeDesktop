// V3-w13-coworkui-scheduled-page (cwui-30…35, cwui-37): the Cowork Scheduled list page (src/source-routines.jsx
// ScheduledTaskList) against the official 3.6556.2 list route ccd3f68fe-C8Xiv_qI Zu. The official branches are read from
// the chunk text (never executed); the page is rendered with react-dom/server. No browser, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const v1 = path.join(snapshot, 'ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const ZU = 'ccd3f68fe-C8Xiv_qI.js';

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/scheduled', search: '', hash: '', href: 'app://local/scheduled' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, page, routine;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  page = await server.ssrLoadModule('/src/source-routines.jsx');
  routine = await server.ssrLoadModule('/src/source-routine-adapters.jsx');
});
after(() => server?.close());

const row = (patch = {}) => ({ id: 't1', kind: 'cowork', name: 'Daily digest', prompt: 'Summarize /notes today', description: 'Morning summary',
  cwd: '/tmp/digest', cron: '0 9 * * *', fireAt: null, enabled: true, nextRunAt: Date.now() + 36e5, lastRunAt: null,
  options: { model: 'deepseek-chat', permission: 'ask' }, runs: [], missedRuns: [], ...patch });
const host = { mutate: async () => {}, error() {}, busy: null, call: async () => undefined, models: [], bypassEnabled: false,
  executionProfile: { model: 'deepseek-chat', permission: 'ask' }, readState: null, editingTask: null };
const noop = () => {};
const list = (props = {}) => renderToStaticMarkup(h(routine.RoutineContext.Provider, { value: host }, h(page.ScheduledTaskList, {
  tasks: [], query: '', onQueryChange: noop, sort: 'nextRun', onSortChange: noop, onSelect: noop, onRunNow: noop, onEdit: noop, onDelete: noop,
  onSetUpManually: noop, onCreateWithClaude: noop, onTemplate: noop, ...props })));

test('official branches: not unified (no tabs, no filter, subtitle, Sort by dropdown), local keep-awake hint', () => {
  const zu = official(ZU);
  // d = Mr() = shared-18 gl = bT → OT() === !0, the claude_ai_unified_routines server gate (off here, no account).
  // cwui-37: the page tabs exist only on the unified page (`ja` is void 0 otherwise).
  for (const needle of ['d=Mr()', 'w=ut()', 'tabs:ja', 'd?nr?i(so,{id:Zi,scope:ir,onScopeChange:or,status:Aa,busy:q}):i(Ha,{busy:q,children:Aa}):void 0','d?sr?void 0:[ka,mi]:w?[mi]:void 0', 'd||w?null:i(S,{variant:"secondary",align:"end"',
    'className:"text-muted-as-secondary",children:[e.formatMessage(Uu.sortBy)," "]', 'Fa=J1($,362,d)?K1($,362,d,d?void 0:'])
    assert.equal(count(zu, needle), 1, needle);
  const shared18 = official('shared-18-D3y8YMFN.js');
  assert.equal(count(shared18, 'function bT(){return OT()===!0}'), 1);
  assert.equal(count(official('shared-16-ByfgAyLr.js'), '_s="claude_ai_unified_routines"'), 1);
  assert.match(local('scripts/extract-code-routines.mjs'), /The unified routines server gate \(OT: claude_ai_unified_routines/);
  // w = shared-78 kw = cp, the hub look, false here (scripts/extract-app-switch.mjs hub-look.mjs).
  assert.match(local('scripts/extract-app-switch.mjs'), /exports: \{ cp: 'useHubLook' \}/);
  // Keep-awake: Tr = V.some(ed), ed = !du = a remote task; the yukon gate is off → t.keepAwakeHint, not keepAwakeHintLocal.
  for (const needle of ['Tr||$e?Uu.keepAwakeHintLocal:t.keepAwakeHint', 'K1($,109,V,V.some(ed))', 'function ed(e){return!du(e)}',
    'function du(e){return e.source!=="remote"}', '$e=de("yukon_silver_dramatic_shrimp_clocks")', '_t=gt&&(pt||Ze&&!$e)',
    '"!w-full [--cds-ring-inner:1px] [--cds-ring-outer:0px]"'])
    assert.equal(count(zu, needle), 1, needle);
  // Create with Claude: offered = engine chat || canCreate && coworkStartable; New task is the S.Root dropdown over kr.
  for (const needle of ['M=x==="chat"||t&&j', 'children:i(kr,{onCreateWithClaude:tn?mr:void 0,onSetUpManually:pr})', 'Wu=5', 'Or<=Wu',
    'i(L,{variant:"danger",children:e.formatMessage(t.loadFailed)})', 'count:8,columns:"two",variant:d?"routine":"text"', '"aria-label":e.formatMessage(t.plural)',
    'mt-4 text-body text-muted-as-secondary', 'flex flex-col items-center gap-md text-body text-muted-as-secondary', 'mt-8 flex flex-col gap-lg'])
    assert.equal(count(zu, needle), 1, needle);
  // The delete checkbox (w13-close-cowork-ui coworkui-scheduled-01): official shows it for every local task
  // (du(e) = source !== "remote"); the list's own dialog has it as children, the detail's ps takes canRemoveFiles (Le) and
  // calls onDelete(Le && checked); the delete sends removeFiles (updateScheduledTaskStatus(id, "deleted", removeFiles)).
  assert.equal(count(zu, 'J!==null&&du(J)&&i("div",{className:"mt-3"'), 1);
  assert.equal(count(zu, 'Also delete the folder that holds this task\\u2019s instructions'), 2);
  assert.equal(count(zu, 'children:i(te,{checked:vn,onCheckedChange:bn,label:i(Y,{defaultMessage:"Also delete the folder that holds this task\\u2019s instructions",id:"xJ/i0CSic6"}),description:i(Y,{defaultMessage:"Other files saved in that folder are deleted too. Folders the task works in aren\\u2019t affected.",id:"IlvCvjZQ6s"})})'), 1);
  assert.ok(zu.includes('Le=ae!==void 0&&ae') && zu.includes('D(Le&&sn,J?.twin)') && zu.includes('h.updateScheduledTaskStatus(e,"deleted",n,G)'));
  assert.ok(official('shared-frame-6jtSkIit.js').includes('xP as xi'));
  const source = local('src/source-routines.jsx');
  assert.doesNotMatch(source, /Deviation \(cwui-32 partial\)/);
  assert.match(source, /<CdsConfirmationDialog open [\s\S]*?><RemoveTaskFilesCheckbox checked=\{removeFiles\} onCheckedChange=\{setRemoveFiles\} \/><\/CdsConfirmationDialog>/);
  assert.match(source, /canRemoveFiles onDelete=\{async files => \{/);
  assert.match(source, /mutate\(\{ action: 'delete', id: task\.id, \.\.\.\(files === true && \{ removeFiles: true \}\) \}\)/);
  const box = renderToStaticMarkup(h(page.RemoveTaskFilesCheckbox, { checked: false, onCheckedChange() {} }));
  assert.match(box, /^<div class="mt-3">/);
  assert.match(text(box), /Also delete the folder that holds this task’s instructions Other files saved in that folder are deleted too\. Folders the task works in aren’t affected\./);
});

test('loading: banner, Sort by dropdown, New task menu trigger, the loading grid; no filter, no Sort icon, no tabs', () => {
  const html = list({ tasks: null });
  assert.match(html, /<h1[^>]*>Scheduled tasks<\/h1>/);
  assert.match(html, />Run tasks on a schedule or whenever you need them\.</);
  assert.match(html, /<div class="w-full mb-6"><div[^>]*data-cds="Banner"[^>]*class="[^"]*!w-full \[--cds-ring-inner:1px\] \[--cds-ring-outer:0px\]/);
  assert.match(text(html), /Scheduled tasks only run while your computer is awake and online\./);
  assert.doesNotMatch(html, /Tasks set to run on your computer|OpenClaude Desktop is open/);
  assert.match(html, /<span class="text-muted-as-secondary">Sort by <\/span>Next run/);
  assert.match(html, />New task</);
  assert.match(html, /aria-label="Search scheduled tasks"/);
  assert.doesNotMatch(html, /aria-label="Sort tasks"|Filter scheduled tasks|data-cds="Tabs"/);
  assert.match(html, /<span class="sr-only">Loading<\/span>/);
  assert.match(html, /grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 md:gap-6/);
  assert.match(list({ tasks: null, sort: 'name' }), /<span class="text-muted-as-secondary">Sort by <\/span>Name/);
});

test('empty: pictogram, "No scheduled tasks yet.", the divider and the template grid', () => {
  const html = list();
  assert.match(html, /<div class="flex flex-col items-center gap-lg py-8"><div class="flex flex-col items-center gap-md text-body text-muted-as-secondary">/);
  assert.match(html, /<p>No scheduled tasks yet\.<\/p>/);
  assert.match(html, /<div aria-busy="false" class="w-full"><div class="w-full grid grid-cols-1 hit-grid-gap-y-md md:grid-cols-2 md:hit-grid-gap-x-6">/);
  assert.match(text(html), /Daily briefing/);
  assert.doesNotMatch(html, /role="list"/);
});

test('tasks: the official list (aria-label t.plural), cards, and the starter templates under five tasks', () => {
  const html = list({ tasks: [row(), row({ id: 't2', name: 'Weekly review', nextRunAt: Date.now() + 72e5 })] });
  assert.match(html, /<ul role="list" id="[^"]+" aria-label="scheduled tasks" aria-busy="false" class="mb-3 grid auto-rows-fr grid-cols-1 gap-3 md:mb-6 md:grid-cols-2 md:gap-6">/);
  assert.match(text(html), /Daily digest.*Weekly review/);
  assert.match(html, /<div class="mt-8 flex flex-col gap-lg">/);
  assert.match(text(html), /Scheduled tasks only run while your computer is awake and online\./);
  const many = list({ tasks: Array.from({ length: 6 }, (_, index) => row({ id: `t${index}`, name: `Task ${index}` })) });
  assert.doesNotMatch(many, /mt-8 flex flex-col gap-lg/);
});

test('search without results, and a failed load', () => {
  const html = list({ tasks: [row()], query: 'zzz' });
  assert.match(html, /<div class="mt-4 text-body text-muted-as-secondary">No scheduled tasks match your search\.<\/div>/);
  assert.match(html, /<input[^>]*placeholder="Search scheduled tasks…"/);
  assert.match(html, /<p role="status" class="sr-only">No scheduled tasks match “zzz”<\/p>/);
  assert.doesNotMatch(html, /mt-8 flex flex-col gap-lg/);
  const failed = list({ tasks: null, loadError: 'boom' });
  assert.match(failed, /<div class="w-full mb-6"><div[^>]*data-cds="Banner"[^>]*>/);
  assert.match(text(failed), /Couldn’t load scheduled tasks\. Try refreshing the page\./);
  assert.doesNotMatch(text(failed), /boom|No scheduled tasks yet/);
  assert.match(list({ tasks: [], starting: true }), /<p role="status" class="sr-only">Starting…<\/p>/);
});

test('delete confirmation copy and the sessions it archives', async () => {
  assert.deepEqual(page.deleteDialogCopy(row()), { title: 'Delete scheduled task?',
    description: 'Delete “Daily digest”? Any sessions from this task will be archived.', confirmLabel: 'Delete' });
  const calls = [];
  const call = async (name, payload) => { calls.push([name, payload]); if (payload.params.threadId === 's3') throw new Error('nope'); };
  const task = row({ runs: [{ id: 'r1', threadId: 's1', status: 'succeeded' }, { id: 'r2', threadId: 's2', status: 'running' },
    { id: 'r3', threadId: 's3', status: 'failed' }, { id: 'r4', threadId: 's4', status: 'succeeded' }, { id: 'r5', threadId: 's1', status: 'failed' }] });
  const archived = await page.archiveTaskSessions(call, task, [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4', archived: true }]);
  assert.deepEqual(archived, ['s1', 's3']);
  assert.deepEqual(calls, [['rpc', { method: 'thread/archive', params: { threadId: 's1' } }], ['rpc', { method: 'thread/archive', params: { threadId: 's3' } }]]);
});

test('source: official copy, CDS parts through the facade, Create with Claude prompt, zh-CN entries', async () => {
  const source = local('src/source-routines.jsx');
  assert.doesNotMatch(source, /Search scheduled tasks\.\.\.|This removes the schedule|OpenClaude Desktop is open|SourceDialog/);
  assert.match(source, /import \{ CdsTextInput as TextInput, CdsBanner, CdsDropdown, CdsConfirmationDialog, CdsCheckbox \} from '\.\/generated\/view-tabs\/index\.js';/);
  assert.match(source, /<CdsDropdown\.Item icon="Chat" onClick=\{onCreateWithClaude\}>\{t\('Create with Claude'\)\}<\/CdsDropdown\.Item>/);
  assert.match(source, /<CdsDropdown\.Item icon="Settings" onClick=\{onSetUpManually\}>\{t\('Set up manually'\)\}<\/CdsDropdown\.Item>/);
  // cwui-33 host: main.jsx hands the page onCreateWithClaude — switch to Cowork, open its home, the prompt as the draft, focus.
  const mount = local('src/main.jsx').match(/<SourceRoutines call=\{call\}[\s\S]*?\/> :/)?.[0] ?? '';
  // w13-close-cowork-misc (E77, coworkui-placeholder-02 third site): the handler first checks Cowork is a listed surface
  // (as Artifacts' onCreate does), and the page gets coworkStartable for Vu `offered` (`onCreateWithClaude: tn ? mr : void 0`).
  assert.match(mount, /coworkStartable=\{coworkSurfaceListed\(\)\}/);
  assert.match(mount, /onCreateWithClaude=\{async prompt => \{ if \(!coworkSurfaceListed\(\)\) return; await switchMode\('cowork'\); navigate\(null, \{ surface: 'cowork' \}\); setTimeout\(\(\) => \{ setDraft\(prompt\); textarea\.current\?\.focus\(\); \}, 0\); \}\}/);
  const zu = official(ZU);
  assert.equal(count(zu, `defaultMessage:\`${page.CREATE_WITH_CLAUDE_PROMPT.replace('’', '\\u2019')}\``) + count(zu, `defaultMessage:"${page.CREATE_WITH_CLAUDE_PROMPT.replace('’', '\\u2019')}"`), 1);
  const shared18 = official('shared-18-D3y8YMFN.js');
  for (const needle of ['icon:"Chat",onClick:t,children:i.formatMessage(y_.createWithClaude)', 'icon:"Settings",onClick:n,children:a'])
    assert.equal(count(shared18, needle), 1, needle);
  const shared16 = official('shared-16-ByfgAyLr.js');
  for (const needle of ['newTask:{defaultMessage:"New task"', 'createWithClaude:{defaultMessage:"Create with Claude"', 'setUpManually:{defaultMessage:"Set up manually"',
    'searchPlaceholder:{defaultMessage:"Search scheduled tasks\\u2026"', 'keepAwakeHint:{defaultMessage:"Scheduled tasks only run while your computer is awake and online."'])
    assert.equal(count(shared16, needle), 1, needle);
  for (const needle of ['sortBy:{defaultMessage:"Sort by"']) assert.equal(count(official('shared-9-CM21XrJw.js'), needle), 1, needle);
  for (const needle of ['starting:{defaultMessage:"Starting\\u2026"', 'sortNextRun:{defaultMessage:"Next run"', 'sortName:{defaultMessage:"Name"'])
    assert.equal(count(zu, needle), 1, needle);
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  for (const key of ['Scheduled tasks only run while your computer is awake and online.', 'Search scheduled tasks…', 'Sort by', 'Next run', 'Name', 'New task',
    'Create with Claude', 'Set up manually', 'Delete “{taskName}”? Any sessions from this task will be archived.', 'Delete scheduled task?', 'Delete',
    'Couldn’t load scheduled tasks. Try refreshing the page.', 'Starting…', 'No scheduled tasks match your search.', 'scheduled tasks', 'scheduled task',
    page.CREATE_WITH_CLAUDE_PROMPT]) assert.ok(Object.hasOwn(zh, key), key);
});

// w13-close-cowork-ui (coworkui-scheduled-03, E63 A): a starter template starts its Cowork task at once (ccd3f68fe nu
// he → me → `y({prompt:t.text,title:…})`), the prompt being shared-18 hK over the template's message with
// {kind:"scheduled"}: "send" when it reads as the English, "draft" (to the composer) otherwise.
test('templates: the official prompt starts a Cowork task (send in English, a composer draft when translated)', async () => {
  const zu = official(ZU);
  for (const needle of ['me=J4($,32,m,y,l,C)?K4($,32,m,y,l,C,e=>{let t=tu(m,e,"scheduled");if(t.delivery==="draft"){zn(t.text),C.push(H);return}',
    'y({prompt:t.text,title:m.formatMessage($l[e.title])', 'function tu(e,t,n){return Yr(e,$l[t.prompt],{kind:n})}',
    'i(su,{template:e,busy:L===e.id,disabled:(d||L!==null)&&L!==e.id,onSelect:()=>he(e,t)},e.id)', 'i("div",{"aria-busy":ge,className:"w-full",children:_e})'])
    assert.equal(count(zu, needle), 1, needle);
  assert.ok(official('shared-18-D3y8YMFN.js').includes('let s=o===a?"send":"draft";return{text:r===void 0?o:o.replaceAll(pK,()=>r),delivery:s}'));
  const template = (await server.ssrLoadModule('/src/generated/cowork-scheduled/index.mjs')).SCHEDULED_TASK_TEMPLATES.find(entry => entry.id === 'daily_briefing');
  const english = page.templatePrompt(template, 'en-US');
  assert.equal(english.delivery, 'send');
  assert.equal(english.text, 'Set up a scheduled task that gives me a morning brief each weekday at 8am: what’s on my calendar, important unread emails or messages, and anything that needs my attention today. Keep it short and scannable.');
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('zh-CN');
  try {
    const zh = page.templatePrompt(template, 'zh-CN');
    assert.equal(zh.delivery, 'draft');
    assert.match(zh.text, /^设置一个定时任务，/);
  } finally { i18n.setLocale('en-US'); }
  // The starting card is busy, the others disabled, the grid aria-busy.
  const html = list({ tasks: [], startingTemplate: 'daily_briefing', starting: true });
  assert.match(html, /<div aria-busy="true" class="w-full">/);
  const source = local('src/source-routines.jsx');
  // w13-close-cowork-misc: Zu `onCreateWithClaude: tn ? mr : void 0` — the list gets the entry only when offered.
  assert.match(source, /offered=\{offered\} onCreateWithClaude=\{offered \? createWithClaude : undefined\} onTemplate=\{startTemplate\} \/>/);
  assert.doesNotMatch(source, /setEditing\(\{ template \}\)|promptBody/);
  const main = local('src/main.jsx');
  // w13-close-cowork-misc (E77): the template handler has the same Cowork guard as onCreateWithClaude.
  assert.match(main, /onStartTemplate=\{async \(prompt, \{ title \} = \{\}\) => \{ if \(!coworkSurfaceListed\(\)\) return; await switchMode\('cowork'\); startSessionFromSearch\(prompt, 'cowork', \{ title \}\); \}\}/);
  assert.match(main, /const startSessionFromSearch = \(text, surface, \{ title \} = \{\}\) => \{\n    if \(!text \|\| settings\) return;\n    pendingSearchSend\.current = text;\n    pendingSearchTitle\.current = [^\n]*\n    navigate\(null, surface \? \{ surface \} : undefined\);/);
});

// w13-close-cowork-misc (E77, coworkui-placeholder-02 third site): with Cowork off the page is not `offered` (Vu
// `M = x === "chat" || t && j`, j = coworkStartable): Zu shows no templates in the empty state (`tn ? … nu … : null`) nor
// under the list (`!d && tn && !yi && Or <= Wu`), and wires no Create with Claude (`tn ? mr : void 0`).
test('not offered (Cowork off): no starter templates, no More ideas', () => {
  const zu = official(ZU);
  for (const needle of ['tn?o(s,{children:[i(Ja,{className:"my-6"}),i(nu,{source:"scheduled_task_empty_state"',
    '(Z.length>0||Vr.length>0)&&!d&&tn&&!yi&&Or<=Wu', '{engine:$t,coworkStartable:en,offered:tn,'])
    assert.equal(count(zu, needle), 1, needle);
  const offered = list({ tasks: [] }), off = list({ tasks: [], offered: false });
  assert.match(offered, /aria-busy="false" class="w-full"/);
  assert.doesNotMatch(off, /aria-busy="false" class="w-full"|my-6/);
  assert.match(text(off), /No scheduled tasks yet/);
  assert.doesNotMatch(list({ tasks: [row()], offered: false }), /mt-8 flex flex-col gap-lg/);
  assert.match(list({ tasks: [row()] }), /mt-8 flex flex-col gap-lg/);
  const source = local('src/source-routines.jsx');
  assert.match(source, /const offered = coworkStartable !== false;/);
  assert.match(source, /const createWithClaude = \(\) => \{\n    if \(!offered\) return;/);
  assert.match(source, /if \(!offered \|\| startingTemplate !== null \|\| starting\) return;/);
});

// w13-close-cowork-ui (approvals crossLane): the Cowork detail lists the task's Always allowed rules and removes one
// (ccd3f68fe Fr → removeApprovedPermission(id, toolName, ruleContent); ps shows the list only with qe, the handler).
test('detail: Always allowed rules are listed with a remover (official Fr / ps qe)', () => {
  const zu = official(ZU);
  for (const needle of ['onRemoveApprovedPermission:Fr', 'await De.removeApprovedPermission(e,n,r)',
    'defaultMessage:"Tool approval couldn\\u2019t be removed. You can try again.",id:"E7Iiw03bQs"',
    't.approvedPermissions?.length&&qe?t.approvedPermissions.map(e=>i(Is,{rule:e,connectorLookup:dt,removeWithheld:X,onRemove:qe},`${e.toolName}\\0${e.ruleContent??""}`)):null'])
    assert.equal(count(zu, needle), 1, needle);
  const source = local('src/source-routines.jsx');
  assert.match(source, /onRemoveApprovedPermission=\{\(toolName, ruleContent\) => removeApproval\(selected, toolName, ruleContent\)\}/);
  assert.deepEqual(page.listedApprovals([{ toolName: 'Bash', ruleContent: 'npm test', cwd: '', approvedAt: 1 }, { toolName: 'Bash', ruleContent: 'npm test', cwd: 'pkg' },
    { toolName: 'Bash', ruleContent: 'ls', cwd: '', escalation: 'workspace-write' }, { cwd: '' }]), [{ toolName: 'Bash', ruleContent: 'npm test' }, { toolName: 'Bash', ruleContent: 'ls' }]);
  assert.match(source, /approvedPermissions: listedApprovals\(selected\.approvedPermissions\)/);
  assert.match(source, /mutate\(\{ action: 'remove-approval', id: task\.id, toolName,\n\s+\.\.\.\(typeof ruleContent === 'string' && \{ ruleContent \}\) \}\)\.catch\(\(\) => setError\(t\('Tool approval couldn’t be removed\. You can try again\.'\)\)\)/);
});

// w13-close-cowork-ui (coworkui-scheduled-02): the banner's Keep awake switch (ccd3f68fe Na action, c6ad19bb9 m) over the
// desktop preference keepAwakeEnabled (src/keep-awake-model.mjs: main "keep-awake-read" / "settings").
test('banner: the official Keep awake switch once the desktop preference is known; it writes keepAwakeEnabled', async () => {
  const zu = official(ZU);
  assert.equal(count(zu, 'action:Qe?i("div",{className:"flex items-center pe-md",children:i(go,{size:"md",context:"scheduled-task"})}):void 0'), 1);
  assert.ok(zu.includes('import{t as go}from"./c6ad19bb9-C-Rlvdl1.js"') && zu.includes('import{n as Bi}from"./c1e3f823e-Dck_crfE.js"') && zu.includes(',Qe=Bi()'));
  const store = official('c1e3f823e-Dck_crfE.js');
  assert.ok(store.includes('var i=t("keepAwakeEnabled",!1),a=i.useEnabled;function o(){let e=i.useHasKey(),t=n();return e&&t}'));
  // Before the preference is read: no action.
  assert.doesNotMatch(list({ tasks: [] }), /Keep awake/);
  const calls = [];
  const model = await server.ssrLoadModule('/src/keep-awake-model.mjs');
  const previous = globalThis.desktop;
  globalThis.desktop = { call: async (name, payload) => { calls.push([name, payload]); return name === 'keep-awake-read' ? { keepAwakeEnabled: false } : true; }, onEvent() {} };
  try {
    const unsubscribe = model.keepAwakeStore.subscribe(() => {});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(model.keepAwakeStore.getState(), { enabled: false, hasKey: true, loadAttempted: true });
    const html = list({ tasks: [] });
    assert.match(html, /<div class="flex items-center pe-md">/);
    assert.match(html, /aria-label="Keep awake"/);
    assert.match(html, /<span class="font-base ">Keep awake<\/span>/);
    model.keepAwakeStore.set(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(calls, [['keep-awake-read', undefined], ['settings', { keepAwakeEnabled: true }]]);
    assert.equal(model.keepAwakeStore.getState().enabled, true);
    unsubscribe();
  } finally { globalThis.desktop = previous; }
  assert.equal(model.keepAwakeEnabled({}), false);
  assert.equal(model.keepAwakeEnabled({ keepAwakeEnabled: true }), true);
});
