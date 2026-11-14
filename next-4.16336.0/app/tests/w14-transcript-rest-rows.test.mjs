// W14-code transcript-rest (plan-w14-code.md): the Code transcript list rows the host draws around the 3.6556.2 renderer
// (c96d752d0 i9: truncated, forkedFrom → Cet, forkMarker → Tet). SSR in middleware mode, set up as
// tests/code-transcript-renderer.test.mjs; the official chunks are only read as text (never executed).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const noop = () => {};
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  render(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  // zustand passes getInitialState as the server snapshot: SSR here reads the live state (the store the host fills).
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot) => useStore(subscribe, getSnapshot, getSnapshot);
}
let server, C, load;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
  const i18n = await load('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await load('/src/source-code-transcript.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const ITEMS = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'First' }] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'One.' },
  { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'Second' }] },
  { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Two.' },
];

test('TM-1 / TM-12: the list rows i9 draws — truncated note, Cet "Forked from", Tet "Forked here" / "{count} forks from here"', async () => {
  const store = (await load('/src/generated/transcript-rows/rows-shared-8-Db1QN4mf.mjs')).og;
  const { officialSessionRecords, forkMarkerPlacements } = await load('/src/code-transcript-sessions.mjs');
  const sessions = [
    { id: 'parent', name: 'Parent work', createdAt: 1700000000 },
    { id: 's1', name: 'This fork', forkedFromId: 'parent', createdAt: 1700000100 },
    { id: 'f1', name: 'Fork one', forkedFromId: 's1', createdAt: 1700000200 },
    { id: 'f2', name: 'Fork two', forkedFromId: 's1', archived: true, createdAt: 1700000300 },
    { id: 'side', name: 'Side work', parentThreadId: 's1', createdAt: 1700000400 },
  ];
  const records = officialSessionRecords(sessions, {});
  assert.deepEqual(records.find((r) => r.sessionId === 's1'), { sessionId: 's1', title: 'This fork', createdAt: 1700000100000, isArchived: false, forkedFromSessionId: 'parent' });
  assert.deepEqual(records.find((r) => r.sessionId === 'side').spawnedFrom, { sessionId: 's1', sideSession: true, userFork: false });
  store.setState({ sessions: records });
  const one = new Map([['t1', [{ id: 'f1' }]]]), two = new Map([['t1', [{ id: 'f1' }, { id: 'f2' }]]]);
  const draw = (lineage, extra = {}) => render(React.createElement(C.SourceCodeTranscript, { sessionId: 's1', items: ITEMS,
    host: { lineage: { sessions, metadata: {}, openSession: noop, ...lineage }, ...extra } }));
  const forked = draw({ forkedFrom: 'parent' }, { truncated: true });
  // i9 "truncated": the list's note, verbatim.
  assert.match(forked, /<div class="flex justify-center px-md text-center text-balance" data-transcript-truncated=""><span class="text-caption text-muted-as-secondary">Earlier messages aren’t shown\. This session is too large to load in full\.<\/span><\/div>/);
  // Cet: a TurnStatus row (gf), "Forked from" + the parent's title.
  assert.match(forked, /Forked from/);
  assert.match(forked, /Parent work/);
  assert.ok(forked.indexOf('Earlier messages') < forked.indexOf('Forked from') && forked.indexOf('Forked from') < forked.indexOf('First'));
  // A session the agent started reads "Started by Claude from" where side sessions are supported (c5da7eb42 __: shared-78
  // Mw `sideSessions.status === "supported"`, the host's app features); the record carries h_'s spawnedFrom for it.
  assert.ok(read('src/generated/code-transcript/code-transcript.mjs').includes('claudeFrom: { defaultMessage: "Started by Claude from", id: "5sTjs+UMvJ" },'));
  // Tet after the fork point's turn: one fork names it, several are one "N forks from here" menu.
  const single = draw({ forkMarks: one });
  assert.match(single, /data-testid="fork-marker"/);
  assert.match(single, /Forked here/);
  assert.match(single, /Fork one/);
  assert.ok(single.indexOf('fork-marker') > single.indexOf('One.') && single.indexOf('fork-marker') < single.indexOf('Second'));
  const several = draw({ forkMarks: two });
  assert.match(several, /2 forks from here/);
  assert.equal((several.match(/data-testid="fork-marker"/g) || []).length, 1);
  assert.deepEqual([...forkMarkerPlacements([{ turnId: 't1' }, { turnId: 't1' }, { turnId: 't2' }], two)], [[1, ['f1', 'f2']]]);
  // The originals.
  const c96 = official('c96d752d0-CWv_7-n9.js');
  for (const text of ['"data-testid":"fork-marker"', '"{count, plural, one {# fork} other {# forks}} from here"', 'defaultMessage:"Started by Claude from"',
    '"Earlier messages aren\\u2019t shown. This session is too large to load in full."', 'className:"flex justify-center px-md text-center text-balance"'])
    assert.ok(c96.includes(text), text);
  // main.jsx: the host's own fork rows are drawn only without the renderer.
  const main = read('src/main.jsx');
  assert.match(main, /if \(!parentId \|\| codeRendererOn \/\* W14-code TM-1: the renderer's Cet \*\/\) return null;/);
  assert.match(main, /\{!codeRendererOn \/\* W14-code TM-1: the renderer's Tet \*\/ && item\.turnId && forkMarks\.has\(item\.turnId\)/);
  assert.match(main, /setHistoryTruncated\(\(value\) => history\.truncated \? id : value === id \? null : value\);/);
});

test('TA-3: a scheduled prompt is the desktop scheduled_task_fire event row (Clock, "Scheduled check-in"), not a bubble', async () => {
  const { codeTranscriptEntries, rendererDrawsRow, scheduledPromptEvent } = await load('/src/code-transcript-entries.mjs');
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'Check the build' }], codeDesktop: { origin: { kind: 'cron', firedAt: 1700000000 } } },
    { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Build is green.' }];
  assert.deepEqual(scheduledPromptEvent(items[0]), { kind: 'event', id: 'u1:event', eventType: 'trigger', content: 'Check the build' });
  assert.equal(rendererDrawsRow(items[0]), false);
  const hostRow = (row) => !rendererDrawsRow(row);
  assert.deepEqual(codeTranscriptEntries(items, { hostRow }).map((e) => `${e.author}:${e.id}`), ['host:u1', 'assistant:m1:reply']);
  const html = render(React.createElement(C.SourceCodeTranscript, { sessionId: 's1', items, hostRow, renderHostRow: () => 'HOST-BUBBLE' }));
  // PF: a done TurnStatus step, Clock + "Scheduled check-in", the prompt behind it (closed); no bubble, no host label.
  assert.match(html, /data-scheduled-prompt=""/);
  assert.match(html, /data-cds="TurnStatusStep"/);
  assert.match(html, /<span class="truncate">Scheduled check-in<\/span>/);
  assert.doesNotMatch(html, /HOST-BUBBLE|Scheduled prompt/);
  assert.equal((html.match(/data-cds="UserMessage"/g) || []).length, 0);
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('name:"Clock",size:"sm",className:"shrink-0"'));
  assert.ok(c96.includes('className:"inline-flex max-w-full min-w-0 items-center gap-1 align-top"'));
  const c06 = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(/M\("user",\[\{kind:"event",id:\w+,eventType:"trigger",content:\w+\}\],\w+\)/.test(c06));
});

test('TA-2: a UserPromptSubmit hook block is the transcript item prompt_blocked — sX card ("A hook blocked your prompt", Edit prompt) last, iX row before', async () => {
  const { reduce, emptyState } = await load('/src/state.js');
  const { codeTranscriptEntries } = await load('/src/code-transcript-entries.mjs');
  let state = { ...emptyState, items: { s1: [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'Deploy now' }] }] } };
  state = reduce(state, { type: 'notification', id: 's1', event: { method: 'hook/completed', params: { threadId: 's1', turnId: 't1',
    run: { id: 'h1', eventName: 'userPromptSubmit', status: 'blocked', statusMessage: 'Deploys are frozen today.', entries: [] } } } });
  const blocks = state.promptBlocks?.s1;
  assert.deepEqual(blocks, { h1: { id: 'prompt-blocked:h1', turnId: 't1', reason: 'Deploys are frozen today.', originalPrompt: 'Deploy now' } });
  assert.equal(state.threadNotices.s1.at(-1).promptBlocked, true);
  const entries = codeTranscriptEntries(state.items.s1, { promptBlocks: blocks });
  assert.deepEqual(entries.at(-1).items, [{ kind: 'prompt_blocked', id: 'prompt-blocked:h1', reason: 'Deploys are frozen today.', originalPrompt: 'Deploy now' }]);
  const html = render(React.createElement(C.SourceCodeTranscript, { sessionId: 's1', items: state.items.s1, promptBlocks: blocks, host: { prefill: () => true } }));
  assert.match(html, /A hook blocked your prompt/);
  assert.match(html, /Deploys are frozen today\./);
  assert.match(html, /Edit prompt/);
  // Not the last entry: the quiet row.
  const later = [...state.items.s1, { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'Ok' }] }, { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Fine.' }];
  const before = render(React.createElement(C.SourceCodeTranscript, { sessionId: 's1', items: later, promptBlocks: blocks }));
  assert.match(before, /Prompt blocked by a hook/);
  assert.doesNotMatch(before, /Edit prompt/);
  // W14-code r3 R3T-NEW-02: the other blocked / failed hooks are the transcript's hook_notice items too (c06cf64bb
  // `M("assistant", [{kind: "hook_notice", …}])`), so the band leaves them as well while the renderer is on.
  assert.match(read('src/main.jsx'), /filter\(\(notice\) => !\(codeRendererOn && \(notice\.promptBlocked \|\| notice\.kind === "hookBlocked" \|\| notice\.kind === "hookFailed"\)\)/);
  const c06 = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(c06.includes('kind:"prompt_blocked"'));
});
