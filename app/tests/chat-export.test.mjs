import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { createChatExport, exportCandidates, exportRange, conversationFileName, conversationRecord, EXPORT_FILE } from '../electron/chat-export.mjs';
import { createChatArtifactStore } from '../electron/chat-artifact-store.mjs';
import { transcriptMarkdown } from '../src/slash-actions-model.mjs';
import zhSettings from '../electron/i18n/zh-CN/settings.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// w13-chatfn-history (research/w13-chatfn.md H8, chatfn-47): Settings › Privacy › Export data, written to a local folder
// (electron/chat-export.mjs) after 3.6556.2 cf400e6a4 uL / cYe / lYe. Official chunks are read as text only; the export
// runs into a temporary folder; no browser, Electron or core.
const app = path.resolve(import.meta.dirname, '..');
const chunk = prefix => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find(name => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const NOW = Date.parse('2026-10-28T12:00:00Z');
const DAY = 24 * 60 * 60;

function fixtureConfig() {
  const s = NOW / 1000;
  return {
    threadIds: ['c1', 'c2', 'w1', 'k1', 'x1', 'v1'], archivedThreadIds: ['c3'],
    threadMetadata: { c1: { name: 'Trip plan', createdAt: s - 2 * DAY, updatedAt: s - DAY }, c2: { preview: 'Old question', updatedAt: s - 60 * DAY },
      c3: { name: 'Archived/one', updatedAt: s - 3 * DAY, historyMode: 'legacy' }, w1: { name: 'Task', updatedAt: s - DAY }, k1: { name: 'Code' }, x1: { name: 'Secret', updatedAt: s }, v1: { name: 'Trip plan', updatedAt: s - 2 } },
    sessionMetadata: { c1: { surface: 'chat', projectId: 'p1' }, c2: { surface: 'chat' }, c3: { surface: 'chat' }, w1: { surface: 'cowork' }, k1: {}, x1: { surface: 'chat', incognito: true },
      v1: { surface: 'chat', chatBranchOf: 'c1' } },
    localProjects: [{ id: 'p1', name: 'Travel' }],
  };
}

test('exportCandidates: Chat sessions (Cowork when asked), never Code or incognito, newest first, within the period', () => {
  const config = fixtureConfig();
  assert.deepEqual(exportCandidates(config, { now: NOW }).map(thread => thread.id), ['v1', 'c1', 'c3', 'c2']);
  assert.deepEqual(exportCandidates(config, { now: NOW, includeCowork: true }).map(thread => thread.id), ['v1', 'c1', 'w1', 'c3', 'c2']);
  assert.deepEqual(exportCandidates(config, { now: NOW, period: '30d' }).map(thread => thread.id), ['v1', 'c1', 'c3']);
  assert.deepEqual(exportCandidates(config, { now: NOW, period: '90d' }).map(thread => thread.id), ['v1', 'c1', 'c3', 'c2']);
  assert.deepEqual(exportCandidates(config, { now: NOW, period: 'custom' }).length, 4, 'a custom period without a valid range exports everything');
  assert.deepEqual(exportCandidates(config, { now: NOW, period: 'bogus' }).length, 4, 'an unknown period exports everything');
  const c1 = exportCandidates(config, { now: NOW }).find(thread => thread.id === 'c1');
  assert.deepEqual(c1, { id: 'c1', title: 'Trip plan', surface: 'chat', createdAt: NOW - 2 * DAY * 1000, updatedAt: NOW - DAY * 1000, archived: false, historyMode: null, projectId: 'p1', projectName: 'Travel' });
  assert.equal(exportCandidates(config, { now: NOW }).find(thread => thread.id === 'v1').branchOf, 'c1');
  assert.equal(exportCandidates(config, { now: NOW }).find(thread => thread.id === 'c3').archived, true);
});

test('custom period (cf400e6a4 cYe): from 00:00 of the first day to 00:00 after the last day, local time; invalid ranges refused', () => {
  const day = value => { const date = new Date(NOW - value * DAY * 1000); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const range = exportRange({ period: 'custom', from: '2026-10-01', to: '2026-10-27' });
  const end = new Date('2026-10-27T00:00:00'); end.setDate(end.getDate() + 1);
  assert.deepEqual(range, { since: new Date('2026-10-01T00:00:00').getTime(), until: end.getTime() });
  assert.equal(exportRange({ period: 'custom', from: '2026-10-27', to: '2026-10-01' }), null, 'from after to');
  assert.equal(exportRange({ period: 'custom', from: '', to: '2026-10-01' }), null, 'a cleared field');
  assert.equal(exportRange({ period: 'custom', from: '10/01/2026', to: '2026-10-01' }), null);
  assert.deepEqual(exportRange({ period: '30d' }, NOW), { since: NOW - 30 * DAY * 1000, until: null });
  const config = fixtureConfig();
  // c1 (a day ago) and v1 / c3 (within three days): a range of the last three days; c3 alone: three days ago only.
  assert.deepEqual(exportCandidates(config, { now: NOW, period: 'custom', from: day(3), to: day(1) }).map(thread => thread.id), ['c1', 'c3']);
  assert.deepEqual(exportCandidates(config, { now: NOW, period: 'custom', from: day(3), to: day(0) }).map(thread => thread.id), ['v1', 'c1', 'c3']);
  assert.deepEqual(exportCandidates(config, { now: NOW, period: 'custom', from: day(70), to: day(50) }).map(thread => thread.id), ['c2']);
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-export-range-')), target = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-export-range-out-'));
  try {
    const service = createChatExport({ dataDir: data, getConfig: () => config, now: () => NOW });
    assert.throws(() => service.run({ op: 'begin', dir: target, period: 'custom', from: day(1), to: day(3) }), /Choose a valid date range/);
    const begun = service.run({ op: 'begin', dir: target, period: 'custom', from: day(70), to: day(50) });
    assert.deepEqual(begun.threads.map(thread => thread.id), ['c2']);
    service.run({ op: 'fail', exportId: begun.exportId, threadId: 'c2', reason: 'x' });
    service.run({ op: 'finish', exportId: begun.exportId });
    const summary = JSON.parse(fs.readFileSync(path.join(begun.path, EXPORT_FILE), 'utf8'));
    assert.deepEqual([summary.period, summary.conversations_from, summary.conversations_to], ['custom', day(70), day(50)]);
  } finally { fs.rmSync(data, { recursive: true, force: true }); fs.rmSync(target, { recursive: true, force: true }); }
  const settings = chunk('cf400e6a4-');
  assert.ok(settings.includes('e.setDate(e.getDate()+1),r.conversations_end_date=e.toISOString()'));
  assert.ok(settings.includes('r.conversations_start_date=new Date(`${p}T00:00:00`).toISOString()'));
});

test('file names: the title made safe, 60 characters at most, with the id', () => {
  assert.equal(conversationFileName('Archived/one: "x"?', 'c3'), 'Archived one x (c3).md');
  assert.equal(conversationFileName('', 'abcdefghijk'), 'Conversation (abcdefgh).md');
  assert.equal(conversationFileName('a'.repeat(80), 'z').length, 60 + ' (z).md'.length);
  const record = conversationRecord({ id: 'c1', title: 'T', surface: 'chat', createdAt: 0, updatedAt: 1000 }, { file: 'T (c1).md', turns: [{ id: 't1', items: [
    { type: 'userMessage', content: [{ type: 'text', text: 'Hi<system-reminder>x</system-reminder>' }] }, { type: 'agentMessage', text: 'Hello' }] }] });
  assert.deepEqual(record.chat_messages, [{ sender: 'human', text: 'Hi', turn_id: 't1' }, { sender: 'assistant', text: 'Hello', turn_id: 't1' }]);
  assert.equal(record.transcript, 'conversations/T (c1).md');
});

test('an export writes conversations.json, one Markdown file per chat, the artifacts and the memory; failures are counted', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-export-data-')), target = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-export-out-'));
  try {
    const artifacts = createChatArtifactStore({ dataDir: data });
    await artifacts.apply('c1', { command: 'create', id: 'notes', title: 'Notes', type: 'text/markdown', content: '# Notes' });
    fs.mkdirSync(path.join(data, 'memory', 'projects'), { recursive: true });
    fs.writeFileSync(path.join(data, 'memory', 'global.md'), 'Likes tea');
    fs.writeFileSync(path.join(data, 'memory', 'projects', 'p1.md'), 'Travel memory');
    const config = fixtureConfig();
    const service = createChatExport({ dataDir: data, getConfig: () => config, now: () => NOW });
    assert.throws(() => service.run({ op: 'begin', dir: 'relative' }), /Choose a folder to export to\./);
    assert.throws(() => service.run({ op: 'nope' }), /Unknown export operation\./);
    const begun = service.run({ op: 'begin', dir: target, period: 'all' });
    assert.ok(begun.path.startsWith(path.join(target, 'OpenClaude export ')));
    assert.deepEqual(begun.threads.map(thread => thread.id), ['v1', 'c1', 'c3', 'c2']);
    assert.equal(begun.threads.some(thread => thread.id === 'x1'), false, 'incognito is never exported');
    const turns = [{ id: 't1', items: [{ type: 'userMessage', content: [{ type: 'text', text: 'Where to?' }] }, { type: 'agentMessage', text: 'Kyoto.' }] }];
    const markdown = transcriptMarkdown({ id: 'c1', name: 'Trip plan' }, turns);
    assert.throws(() => service.run({ op: 'conversation', exportId: begun.exportId, threadId: 'x1', markdown }), /isn’t part of this export/);
    assert.deepEqual(service.run({ op: 'conversation', exportId: begun.exportId, threadId: 'c1', markdown, turns }), { written: 'Trip plan (c1).md' });
    // Two chats with one title: the id tells them apart.
    assert.deepEqual(service.run({ op: 'conversation', exportId: begun.exportId, threadId: 'v1', markdown: '# v1\n', turns: [] }), { written: 'Trip plan (v1).md' });
    assert.deepEqual(service.run({ op: 'fail', exportId: begun.exportId, threadId: 'c2', reason: 'Conversation history is incomplete.' }), { failed: 1 });
    const done = service.run({ op: 'finish', exportId: begun.exportId });
    assert.deepEqual(done, { path: begun.path, exported: 2, failed: 2 }, 'c3 was never read: it counts as failed too');
    const files = [];
    const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else files.push(path.relative(begun.path, full)); } };
    walk(begun.path);
    assert.deepEqual(files.sort(), [EXPORT_FILE, 'artifacts/c1/index.json', 'artifacts/c1/notes/v1.md', 'conversations/Trip plan (c1).md', 'conversations/Trip plan (v1).md',
      'memory/global.md', 'memory/projects/p1.md'].sort());
    assert.equal(fs.readFileSync(path.join(begun.path, 'conversations', 'Trip plan (c1).md'), 'utf8'), markdown);
    const summary = JSON.parse(fs.readFileSync(path.join(begun.path, EXPORT_FILE), 'utf8'));
    assert.equal(summary.app, 'OpenClaude Desktop');
    assert.deepEqual(summary.conversations.map(entry => [entry.uuid, entry.name, entry.transcript]), [['c1', 'Trip plan', 'conversations/Trip plan (c1).md'], ['v1', 'Trip plan', 'conversations/Trip plan (v1).md']]);
    assert.deepEqual(summary.conversations[0].project, { uuid: 'p1', name: 'Travel' });
    assert.deepEqual(summary.conversations[0].chat_messages, [{ sender: 'human', text: 'Where to?', turn_id: 't1' }, { sender: 'assistant', text: 'Kyoto.', turn_id: 't1' }]);
    assert.equal(summary.conversations[1].branch_of, 'c1');
    assert.deepEqual(summary.failed.map(entry => [entry.uuid, entry.reason]), [['c2', 'Conversation history is incomplete.'], ['c3', 'not read']]);
    assert.deepEqual(summary.artifacts, ['c1']);
    assert.deepEqual(summary.memory, ['global.md', 'projects/p1.md']);
    assert.throws(() => service.run({ op: 'finish', exportId: begun.exportId }), /no longer running/);
    // Cancel removes what was written.
    const second = service.run({ op: 'begin', dir: target, includeCowork: true });
    assert.notEqual(second.path, begun.path);
    assert.ok(second.threads.some(thread => thread.id === 'w1'));
    assert.deepEqual(service.run({ op: 'cancel', exportId: second.exportId }), { canceled: true });
    assert.equal(fs.existsSync(second.path), false);
  } finally { fs.rmSync(data, { recursive: true, force: true }); fs.rmSync(target, { recursive: true, force: true }); }
});

let server, Privacy;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Privacy = await server.ssrLoadModule('/src/source-settings-privacy.jsx');
});
after(() => server?.close());

function shallow(component, props, states = []) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0, state = 0;
  internal.H = withMemoCache({
    useId: () => `:r${id++}:`, useRef: value => ({ current: value }), useMemo: create => create(), useCallback: fn => fn,
    useState: value => { const at = state++; return [at < states.length && states[at] !== undefined ? states[at] : typeof value === 'function' ? value() : value, () => {}]; },
    useEffect() {}, useLayoutEffect() {}, useContext: context => context._currentValue, useSyncExternalStore: (subscribe, get) => get(),
  });
  try { return component(props); } finally { internal.H = old; }
}
function findAll(node, predicate, out = []) {
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (!node || typeof node !== 'object') return out;
  if (predicate(node)) out.push(node);
  for (const value of Object.values(node.props ?? node)) if (value && typeof value === 'object') findAll(value, predicate, out);
  return out;
}
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props?.children !== undefined ? text(node.props.children) : '';
const official = value => value.replaceAll('’', '\\u2019');

test('every string is the 3.6556.2 original (cf400e6a4 uL / lYe, shared-46, c1ec8a7a7), and has zh-CN', () => {
  const settings = chunk('cf400e6a4-'), nav = chunk('shared-46-');
  const C = Privacy.PRIVACY_COPY;
  for (const value of [C.exportData, C.conversationsFrom, C.conversationsPeriod, C.willInclude, C.yourConversations, C.cancel, C.export, C.started])
    assert.ok(settings.includes(`defaultMessage:"${official(value)}"`), value);
  for (const { label } of Privacy.EXPORT_PERIOD_SEGMENTS) assert.ok(settings.includes(`defaultMessage:"${label}"`), label);
  // uL: the row's button and the dialog; lYe's member branch (ownDataOnly → "Your conversations").
  assert.ok(settings.includes('control:y(K,{variant:"secondary",size:"sm",busy:a.isPending,onClick:()=>s(!0),disabled:i,children:e?y(Z,{defaultMessage:"Export logs",id:"cFbmFsWkmm"}):y(Z,{defaultMessage:"Export data",id:"7WvgyzdB8p"})})'));
  assert.ok(settings.includes('y(J.Header,{showClose:!0,children:y(Z,{defaultMessage:"Export data",id:"7WvgyzdB8p"})})'));
  assert.ok(settings.includes('"data-testid":"export-confirm-button",children:y(Z,{defaultMessage:"Export",id:"SVwJTM5AmL"})'));
  assert.ok(settings.includes('points:g?[{text:y(Z,{defaultMessage:"Your conversations",id:"/XGGp5P+aJ"})}]'));
  assert.ok(settings.includes('y("h3",{className:"text-body text-primary",children:y(Z,{defaultMessage:"Export will include",id:"czckwB0BJ8"})})'));
  assert.ok(settings.includes('onSuccess:()=>{r(y(Z,{defaultMessage:"Export started",id:"1k9KaxvCJt"}))}'));
  // shared-46: Privacy (id data-privacy-controls, icon Dp = LockShield) right after General (and Notifications).
  assert.ok(nav.includes('e.push({id:"data-privacy-controls",href:"/settings/data-privacy-controls",label:t,name:a.formatMessage({defaultMessage:"Privacy",id:"cXBJ7U9LBe"}),icon:Dp,testId:"data-privacy-controls"})'));
  assert.ok(nav.includes('Dp={name:"LockShield"'));
  assert.ok(chunk('ca25db325-').includes('{section:"data-privacy-controls",label:{defaultMessage:"Export data",id:"7WvgyzdB8p"}}'));
  // c1ec8a7a7 m / f: the check list.
  const points = chunk('c1ec8a7a7-');
  assert.ok(points.includes('t("span",{className:"flex h-lh shrink-0 items-center",children:t(o,{name:"Check",size:"sm",className:"text-muted-as-secondary"})})'));
  assert.ok(points.includes('e("inline-flex flex-col",u,"text-start",s)') && points.includes('u=o===void 0?"gap-1":o'));
  for (const value of [C.exportData, C.conversationsFrom, C.conversationsPeriod, '30 days', '90 days', C.willInclude, C.yourConversations, C.started])
    assert.ok(typeof zhSettings[value] === 'string' && zhSettings[value], value);
});

test('Settings › Privacy: the Export data row (secondary sm button); the settings nav lists Privacy after General', () => {
  const html = renderToStaticMarkup(React.createElement(Privacy.SourceSettingsPrivacy, { desktopCall: async () => null, boot: {} }));
  assert.match(html, /<section class="ss-group" data-settings-privacy=""><h3 tabindex="-1" class="text-heading-semibold settings-row-title">Privacy<\/h3>/);
  assert.match(html, /<span class="settings-row-title">Export data<\/span>/);
  assert.match(html, /<button[^>]*>[^]*Export data[^]*<\/button>/);
  const settings = local('src/source-settings.jsx');
  assert.match(settings, /\{id:'preferences',label:'General'[^\n]*\n  \/\/ w13-chatfn-history:[^\n]*\n  \{id:'privacy',label:'Privacy',icon:'LockShield',group:'Settings',[^\n]*page:SourceSettingsPrivacy\},\n/);
});

test('uL Dialog + lYe: md, titled Export data, Conversations from with All / 30 days / 90 days / Custom, Export will include › Your conversations, Cancel / Export', () => {
  const exported = [], closed = [];
  const dialog = shallow(Privacy.ExportDataDialog, { open: true, onClose: () => closed.push(true), onExport: period => exported.push(period) });
  assert.equal(dialog.props.title, 'Export data');
  assert.equal(dialog.props.size, 'md');
  assert.equal(dialog.props.description, undefined, 'no "download link will be sent to your email": the export is written to a folder here');
  const [segmented] = findAll(dialog, node => Array.isArray(node.props?.segments));
  assert.equal(segmented.props['aria-label'], 'Conversations period');
  assert.deepEqual(segmented.props.segments, [{ value: 'all', label: 'All' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: 'custom', label: 'Custom' }]);
  assert.equal(segmented.props.value, 'all');
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, findAll(dialog, node => node.type === 'section')[0]));
  assert.equal(html, '<section class="flex flex-col gap-sm py-md"><h3 class="text-body text-primary">Export will include</h3><ul role="list" class="inline-flex flex-col gap-1 text-start"><li class="flex gap-2"><span class="flex h-lh shrink-0 items-center">'
    + html.slice(html.indexOf('<span class="flex h-lh shrink-0 items-center">') + '<span class="flex h-lh shrink-0 items-center">'.length, html.indexOf('</span>Your conversations')) + '</span>Your conversations</li></ul></section>');
  assert.match(html, /data-cds="Icon"[^>]*class="[^"]*text-muted-as-secondary/);
  const buttons = findAll(dialog, node => typeof node.props?.variant === 'string' && typeof node.props?.onClick === 'function');
  assert.deepEqual(buttons.map(node => [node.props.variant, text(node), node.props['data-testid'] ?? null]), [['secondary', 'Cancel', null], ['primary', 'Export', 'export-confirm-button']]);
  buttons[1].props.onClick();
  assert.deepEqual([closed.length, exported], [1, ['all']], 'uL: the dialog closes, then the export starts');
});

test('Custom (lYe / cYe / c71ba149d): the DateRangeSelector under the period row, 180 days back to today, Export disabled while the range is invalid', async () => {
  const { DateRangeSelector } = await server.ssrLoadModule('/src/generated/chat-export/date-range-selector.mjs');
  const today = '2026-10-28';
  const render = (from, to, exported = []) => shallow(Privacy.ExportDataDialog, { open: true, today, onClose() {}, onExport: (period, range) => exported.push([period, range]) }, ['custom', from, to]);
  const exported = [];
  const dialog = render(undefined, undefined, exported);
  const [range] = findAll(dialog, node => node.props?.onFromDateChange);
  assert.equal(range.type, DateRangeSelector, 'the generated DateRangeSelector');
  assert.deepEqual({ ...range.props, onFromDateChange: typeof range.props.onFromDateChange, onToDateChange: typeof range.props.onToDateChange },
    { fromDate: '2026-05-01', toDate: today, onFromDateChange: 'function', onToDateChange: 'function', maxDate: today }, 'cYe: c = today - 180 days, s = today; lYe passes maxDate only');
  const confirm = () => findAll(render.last, node => node.props?.['data-testid'] === 'export-confirm-button')[0];
  render.last = dialog;
  assert.equal(confirm().props.disabled, false);
  confirm().props.onClick();
  assert.deepEqual(exported, [['custom', { from: '2026-05-01', to: today }]]);
  for (const [from, to] of [['2026-10-20', '2026-10-01'], ['', today], ['2026-10-01', '2026-10-29']]) {
    render.last = render(from, to);
    assert.equal(confirm().props.disabled, true, `${from} → ${to}`);
  }
  render.last = render('2026-10-01', '2026-10-01');
  assert.equal(confirm().props.disabled, false, 'a single day');
  // The selector SSR-renders the official From / To fields (c71ba149d u → cb499b8fa c → cowork-scheduled cff2bf6cb nu).
  const html = renderToStaticMarkup(React.createElement(range.type, range.props));
  assert.match(html, /^<div class="flex gap-md">/);
  assert.equal((html.match(/data-cds="Field"/g) ?? []).length, 2);
  assert.match(html, />From</);
  assert.match(html, />To</);
  // Original text: lYe's segment and range, cYe's defaults and check, uL's disabled Export; the generated files are the
  // generator's (manifest pins the call sites).
  const settings = chunk('cf400e6a4-'), selector = chunk('c71ba149d-'), check = chunk('c1751bc30-');
  assert.ok(settings.includes('{value:"custom",label:t.formatMessage({defaultMessage:"Custom",id:"Sjo1P44FYy"})}'));
  assert.ok(settings.includes('f==="custom"&&y(qO,{fromDate:r,toDate:a,onFromDateChange:i,onToDateChange:o,maxDate:c})'));
  assert.ok(settings.includes('e.setDate(e.getDate()-180)') && settings.includes('disabled:a.customRangeInvalid'));
  assert.ok(settings.includes('import{n as xIe,r as SIe,t as qO}from"./c1751bc30-D9BmGCFy.js"'));
  assert.ok(check.includes('function o({fromDate:e,toDate:t,minDate:n,maxDate:r}){return!!(e&&t)&&!a(e,t)&&!i(e,n,r)&&!i(t,n,r)}'));
  assert.ok(selector.includes('t("div",{className:"flex gap-md",children:[L,W]})') && selector.includes('export{u as DateRangeSelector}'));
  const manifest = JSON.parse(local('src/generated/chat-export/manifest.json'));
  assert.deepEqual(manifest.modules.map(module => [module.target, module.source]), [['date-range.mjs', 'c1751bc30-D9BmGCFy.js'], ['date-field.mjs', 'cb499b8fa-BgRV8jkQ.js'], ['date-range-selector.mjs', 'c71ba149d-CFslfKFj.js']]);
  assert.deepEqual(manifest.callSites.map(site => site.binding), ['lYe', 'cYe', 'uL']);
  assert.match(local('src/generated/chat-export/date-field.mjs'), /import \{ nu as o \} from "\.\.\/cowork-scheduled\/cff2bf6cb-PfnEo01t\.mjs";/);
  for (const value of ['Custom', 'Must be on or before the end date', 'Must be on or after the start date', 'Must be within the allowed range', 'From, calendar', 'To, calendar', 'Choose a valid date range.'])
    assert.ok(zh[value], value);
});

test('runChatExport reads each chat the way /export does and hands it over; an unreadable chat is reported as failed', async () => {
  const calls = [];
  const turns = [{ id: 't1', itemsView: 'full', items: [{ type: 'userMessage', content: [{ type: 'text', text: 'Hi' }] }, { type: 'agentMessage', text: 'Hello' }] }];
  const desktopCall = async (action, p) => {
    calls.push([action, p.op ?? p.method]);
    if (action === 'chat-export' && p.op === 'begin') return { exportId: 'e1', path: '/tmp/x', threads: [{ id: 'a', historyMode: 'legacy' }, { id: 'b' }, { id: 'c' }] };
    if (action === 'chat-export' && p.op === 'finish') return { path: '/tmp/x', exported: 2, failed: 1 };
    if (action === 'chat-export') return { ok: true, p };
    if (p.method === 'thread/read' && p.params.threadId === 'a') { assert.equal(p.params.includeTurns, true); return { thread: { id: 'a', name: 'A', historyMode: 'legacy', turns } }; }
    if (p.method === 'thread/read' && p.params.threadId === 'b') { assert.equal(p.params.includeTurns, false); return { thread: { id: 'b', preview: 'B' } }; }
    if (p.method === 'thread/turns/list' && p.params.threadId === 'b') return { data: turns, nextCursor: null };
    if (p.method === 'thread/read') return { __codeDesktopRpcError: { message: 'thread not found', code: -32600 } };
    throw new Error(`unexpected ${action} ${p.method}`);
  };
  const handed = [];
  const spy = async (action, p) => { if (action === 'chat-export' && (p.op === 'conversation' || p.op === 'fail')) handed.push(p); return desktopCall(action, p); };
  let started = null;
  const result = await Privacy.runChatExport(spy, { period: '30d', includeCowork: true, onStarted: begun => { started = begun.exportId; } });
  assert.deepEqual(result, { path: '/tmp/x', exported: 2, failed: 1 });
  assert.equal(started, 'e1');
  assert.deepEqual(calls[0], ['chat-export', 'begin']);
  assert.deepEqual(handed.map(p => [p.op, p.threadId]), [['conversation', 'a'], ['conversation', 'b'], ['fail', 'c']]);
  assert.equal(handed[0].markdown, transcriptMarkdown({ id: 'a', name: 'A', historyMode: 'legacy', turns }, turns));
  assert.equal(handed[1].markdown, transcriptMarkdown({ id: 'b', preview: 'B' }, turns));
  assert.equal(handed[2].reason, 'thread not found');
  assert.equal(await Privacy.runChatExport(async () => null), null, 'the folder picker was canceled');
});

test('host wiring: main.cjs case "chat-export" asks for the folder, runs chat-export.mjs and shows the result in Finder', () => {
  const main = local('electron/main.cjs');
  assert.match(main, /const chatExport = \(await import\('\.\/chat-export\.mjs'\)\)\.createChatExport\(\{ dataDir: app\.getPath\('userData'\), getConfig: \(\) => config \}\);/);
  const block = main.slice(main.indexOf('      case "chat-export": {'), main.indexOf('      case "chat-export": {') + 900);
  assert.match(block, /dialog\.showOpenDialog\(BrowserWindow\.fromWebContents\(e\.sender\) \?\? win, \{ title: i18n\.t\("Export data"\), defaultPath: app\.getPath\("downloads"\), properties: \["openDirectory", "createDirectory"\] \}\)/);
  assert.match(block, /if \(chosen\.canceled \|\| !chosen\.filePaths\?\.\[0\]\) return null;/);
  assert.match(block, /includeCowork: p\.includeCowork === true && COWORK_ENABLED/);
  assert.match(block, /shell\.showItemInFolder\(path\.join\(done\.path, "conversations\.json"\)\)/);
});
