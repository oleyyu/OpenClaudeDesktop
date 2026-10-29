// W12b transcript lane (w12b-transcript): the Code transcript's compaction marker (c80ec48f8 nt/rt), the background agent
// event's tense sentence (c96d752d0 sXe), the Recap card's plain text (c96d752d0 OLe, shared-11 qE) and the user's own
// '!' command as the user entry c19e90103 Dg (c96d752d0 `ii === "bash"`). SSR in middleware mode, official chunks only
// read as text (never executed).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { taskEventRow } from '../src/task-event-model.mjs';
import { groupFileTools } from '../src/file-tool-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(assets, file), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/i18n/en-US.json'), 'utf8'));
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const render = (element) => renderToStaticMarkup(element);

let server, S, E, R, U;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  E = await server.ssrLoadModule('/src/source-task-event.jsx');
  R = await server.ssrLoadModule('/src/source-recap-card.jsx');
  U = await server.ssrLoadModule('/src/source-user-shell.jsx');
});
after(() => server?.close());

test('W12b-TR-1: Code compaction marker is c80ec48f8 rt (Compacted session · saved / from / plain); no running or stopped row', () => {
  const c80 = official('c80ec48f8-D2IVcRNS.js');
  for (const [id, text] of [['l7c01euK+q', 'Compacted session \\u00B7 saved {tokens} tokens'], ['HKBIcgP7KE', 'Compacted session \\u00B7 from {tokens} tokens'],
    ['D4ZSZJLOdx', 'Compacted session'], ['1znw9Nf8LH', 'Compaction failed']]) {
    assert.ok(c80.includes(`defaultMessage:"${text}",id:"${id}"`), `${id} in c80ec48f8`);
    assert.equal(enUS[id], text.replace('\\u00B7', '·'));
  }
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('case"compacted":'), 'Code inserts the marker once compacted');
  const html = (item, props = {}) => render(React.createElement(S.SourceMessage, { item: { id: 'k', turnId: 't', type: 'contextCompaction', ...item }, sessionKey: 's', ...props }));
  assert.match(html({ preTokens: 120000, postTokens: 30000 }), /Compacted session · saved 90k tokens/);
  assert.match(html({ preTokens: 120000 }), /Compacted session · from 120k tokens/);
  const plain = html({});
  assert.match(plain, /Compacted session/);
  assert.doesNotMatch(plain, /Compacted conversation|·/);
  assert.equal(html({ status: 'inProgress' }), '', 'running: the working line says Compacting session…');
  assert.equal(html({}, { isStreaming: true }), '');
  assert.equal(html({ status: 'interrupted' }), '', 'no Compaction interrupted row');
  assert.match(html({ status: 'failed' }), /Compaction failed/);
  // Host extension kept: the DeepSeek bridge's count.
  assert.match(html({ codeDesktop: { shadowedItems: 3 } }), /Compacted 3 items/);
  const source = read('src/source-session.jsx');
  assert.doesNotMatch(source, /Compacting conversation"|Compaction interrupted|Compacted conversation · /);
});

test('W12b-TR-2: an agent event with a verb description reads as its tense sentence (sXe Dhe), else Background agent …', () => {
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('t.taskType==="local_agent"||t.taskType==="remote_agent"||t.taskType==="in_process_teammate"'));
  assert.ok(c96.includes('?.[t.status==="running"?"running":"done"]'));
  const done = taskEventRow({ taskType: 'local_agent', status: 'completed', description: 'Fix the auth module', durationMs: 120000 });
  assert.equal(done.tense, 'Fixed the auth module');
  assert.equal(taskEventRow({ taskType: 'local_agent', status: 'running', description: 'Fix the auth module' }).tense, 'Fixing the auth module');
  assert.equal(taskEventRow({ taskType: 'local_agent', status: 'failed', description: 'Fix the auth module' }).tense, null, 'failed keeps Background agent failed');
  assert.equal(taskEventRow({ taskType: 'local_agent', status: 'completed', description: 'auth module review' }).tense, null, 'no known verb');
  // 'review' is not in c52b02f3f's verb list either (only 'preview'): the official row falls back too.
  assert.equal(taskEventRow({ taskType: 'local_agent', status: 'completed', description: 'Review the auth module' }).tense, null);
  assert.equal(taskEventRow({ taskType: 'local_bash', status: 'completed', description: 'Run the tests' }).tense, null, 'commands are not agents');
  const html = render(React.createElement(E.SourceTaskEvent, { events: [{ taskType: 'local_agent', status: 'completed', description: 'Fix the auth module', durationMs: 120000 }], itemId: 'e' }));
  assert.match(html, /<span class="stev-description" dir="auto">Fixed the auth module<\/span>/);
  assert.match(html, /· took 2m 0s/);
  assert.doesNotMatch(html, /Background agent completed/);
  const fallback = render(React.createElement(E.SourceTaskEvent, { events: [{ taskType: 'local_agent', status: 'completed', description: 'auth module review' }], itemId: 'e' }));
  assert.match(fallback, /Background agent completed/);
  assert.match(fallback, /· auth module review/);
});

test('W12b-TR-3: the Recap card body is OLe plain text (qE: secrets masked, whitespace collapsed, 500 characters); no card while loading', () => {
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('className:"break-words p-3 text-footnote italic text-secondary",children:'));
  assert.ok(!Object.values(enUS).includes('Writing a recap…'));
  const card = (recap) => render(React.createElement(R.SourceRecapCard, { recap, onDismiss() {} }));
  assert.equal(card({ status: 'loading', text: '' }), '');
  assert.equal(card({ status: 'done', text: '   ' }), '');
  const html = card({ status: 'done', text: '## Status\n\n- Fixed **the bug**\n- Next: `npm test`', at: 1 });
  // qE = JE: secrets masked (session-messages yl), invisible characters stripped (stripInvisible), whitespace collapsed to
  // one space: one plain line, the text's own characters kept (no Markdown rendering).
  assert.match(html, /<p dir="auto" class="src-recap-body"><bdi>## Status - Fixed \*\*the bug\*\* - Next: `npm test`<\/bdi><\/p>/);
  assert.doesNotMatch(html, /<h2|<ul|<li|<code|<strong|src-recap-markdown/);
  assert.match(html, /aria-label="Dismiss recap"/);
  const long = card({ status: 'done', text: 'word '.repeat(200) });
  const body = /<bdi>([^<]*)<\/bdi>/.exec(long)[1];
  assert.equal(body.length, 501);
  assert.ok(body.endsWith('…'));
});

test('W12b-TR-4: the user\'s own ! command is the user entry c19e90103 Dg, not a tool row', () => {
  const c19 = official('c19e90103-BQFzF8EA.js');
  assert.ok(c19.includes('"relative epitaxy-diff epitaxy-fence rounded-lg overflow-clip"'));
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('className:"flex flex-col gap-sm w-full",children:['));
  const generated = read('src/generated/transcript-rows/outside-handlers.mjs');
  assert.match(generated, /Dg as UserBashRun/);
  const item = (extra) => ({ id: 'u1', turnId: 't2', type: 'commandExecution', source: 'userShell', command: "/bin/zsh -lc 'ls -la'", ...extra });
  assert.equal(S.officialToolItem(item({ status: 'completed' })), false);
  assert.equal(S.officialToolItem({ ...item({ status: 'completed' }), source: 'agent' }), true);
  // Never folded into a tool group with the agent's commands.
  const agent = { id: 'a1', turnId: 't2', type: 'commandExecution', command: 'ls', status: 'completed' };
  assert.deepEqual(groupFileTools([agent, item({ status: 'completed' }), { ...agent, id: 'a2' }]).map((row) => row.id), ['a1', 'u1', 'a2']);
  const html = (extra) => render(React.createElement(S.SourceMessage, { item: item(extra), sessionKey: 's', turnStart: true }));
  const done = html({ status: 'completed', aggregatedOutput: 'a.txt\nb.txt\n' });
  assert.match(done, /^<div class="source-message source-user-shell flex flex-col gap-sm w-full" data-transcript-item-id="u1" data-turn-start="true"><div class="relative max-w-full w-full select-text">/);
  assert.match(done, /class="relative epitaxy-diff epitaxy-fence rounded-lg overflow-clip"/);
  assert.match(done, /class="mt-1\.25 rounded-lg epitaxy-card-outline-overlay overflow-clip max-h-\[160px\] overflow-y-auto px-md py-1\.25"/);
  assert.match(done, /<pre class="text-code text-secondary whitespace-pre-wrap break-all">/);
  assert.match(done, /a\.txt\nb\.txt/);
  assert.doesNotMatch(done, /You ran|Ran a command|Open in terminal/);
  assert.match(html({ status: 'completed', aggregatedOutput: '' }), /\(no output\)/);
  assert.match(html({ status: 'inProgress' }), /Running…/);
  assert.deepEqual(U.userShellRun(item({ status: 'completed', aggregatedOutput: ' x \n' })), { command: 'ls -la', output: 'x' });
});
