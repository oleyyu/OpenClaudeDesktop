// display-bugs-20261114 lane-r (analysis/claude-4.16336.0-migrate-20261104/display-bugs-20261114/REPORT.md):
//   D-02  a running sub-agent with no tool call yet has no subagentActivity (the official heartbeat reads its
//         latestToolName), and a failed renderer is not off for the session for good (backoff, capped).
//   D-03  (app side) a string CodexErrorInfo / an object one with httpStatusCode is the turn_error's apiErrorStatus and an
//         "API Error: N …" text the official k1 (shared-3 x3 / C3) reads, so the card hint and the older-turn marker are
//         the official 401 / 429 / 5xx ones.
//   D-06  a hydrate puts a live-only item back into its own turn; the entry builder starts an entry at a new turnId.
//   D-07  an agentMessage a retry or the turn's completion left behind is dropped; the turn's error card names its own row.
// SSR in vite middleware mode (effects don't run); the reducer and the entry builder are imported directly.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { codeSubagents, codeTranscriptEntries } from '../src/code-transcript-entries.mjs';
import { emptyState, reduce } from '../src/state.js';
import * as M from '../src/turn-error-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}
let server, C, T;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  T = await server.ssrLoadModule('/src/source-turn-error.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'lane-r', ...props }));

// ---------------------------------------------------------------- D-02
const TASK = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'dig' }] },
  { id: 'a1', type: 'collabAgentToolCall', turnId: 't1', tool: 'spawnAgent', status: 'completed', prompt: 'Investigate the flaky test', receiverThreadIds: ['th1'] }];

test('D-02a: a running sub-agent with no tool call yet has no subagentActivity (official: built on its first tool_use only)', () => {
  const view = () => ({ status: 'running', items: [{ id: 'm', type: 'agentMessage', text: 'thinking out loud' }], toolCallCount: 0, model: 'gpt-5.5' });
  const subagents = codeSubagents(TASK, view);
  assert.deepEqual([...subagents], [['a1', { status: 'running' }]]);
  const tool = codeTranscriptEntries(TASK, { subagents })[1].items[0].tools[0];
  assert.equal(tool.name, 'Task');
  assert.equal(tool.subagentActivity, undefined);
  // Once it has called a tool: {toolCallCount, latestToolName, model} (R2T-TM3 unchanged).
  const later = codeSubagents(TASK, () => ({ ...view(), items: [{ id: 'x', type: 'commandExecution', command: 'ls', status: 'completed' }], toolCallCount: 1 }));
  assert.deepEqual(later.get('a1'), { status: 'running', activity: { toolCallCount: 1, latestToolName: 'Bash', model: 'gpt-5.5' } });
});

test('D-02a (SSR): the running Task row before its first tool call renders (no heartbeat startsWith on undefined)', () => {
  const subagents = new Map([['a1', { status: 'running' }]]);
  let html;
  assert.doesNotThrow(() => { html = render({ items: TASK, subagents }); });
  assert.match(html, /data-state="busy"/);
  // What the old builder handed the renderer ({toolCallCount: 0, model} with no latestToolName) is what threw.
  assert.throws(() => render({ items: TASK, subagents: new Map([['a1', { status: 'running', activity: { toolCallCount: 0, model: 'gpt-5.5' } }]]) }), /startsWith/);
});

test('D-02b: a renderer failure turns the session off for a while, not for good (5s, 30s, 2min, then off; reset after 10min)', () => {
  const at = 1_000_000;
  const id = 'd02b-backoff';
  assert.equal(C.codeTranscriptRendererOn(id, at), true);
  C.markCodeTranscriptFailed(id, at);
  assert.equal(C.codeTranscriptRendererOn(id, at), false);
  // The same failure marked again (render, getDerivedStateFromProps, componentDidCatch) is one failure.
  C.markCodeTranscriptFailed(id, at + 10);
  C.markCodeTranscriptFailed(id, at + 4_000);
  assert.equal(C.codeTranscriptRendererOn(id, at + 4_999), false);
  assert.equal(C.codeTranscriptRendererOn(id, at + 5_000), true, 'retried after 5s');
  C.markCodeTranscriptFailed(id, at + 5_000);
  assert.equal(C.codeTranscriptRendererOn(id, at + 34_999), false);
  assert.equal(C.codeTranscriptRendererOn(id, at + 35_000), true, 'retried after 30s');
  C.markCodeTranscriptFailed(id, at + 35_000);
  assert.equal(C.codeTranscriptRendererOn(id, at + 154_999), false);
  assert.equal(C.codeTranscriptRendererOn(id, at + 155_000), true, 'retried after 2min');
  C.markCodeTranscriptFailed(id, at + 155_000);
  assert.equal(C.codeTranscriptRendererOn(id, at + 155_000 + 864e5), false, 'the 4th failure keeps the host rows');
  // A session whose renderer ran 10 minutes past its retry starts over at 5s.
  const healthy = 'd02b-healthy';
  C.markCodeTranscriptFailed(healthy, at);
  C.markCodeTranscriptFailed(healthy, at + 5_000 + 600_000);
  assert.equal(C.codeTranscriptRendererOn(healthy, at + 5_000 + 600_000 + 4_999), false);
  assert.equal(C.codeTranscriptRendererOn(healthy, at + 5_000 + 600_000 + 5_000), true);
  // Another session is not touched.
  assert.equal(C.codeTranscriptRendererOn('d02b-other', at), true);
});

test('D-02b: the boundary holds a caught failure (no retry loop) and gives the renderer back once the retry is due', () => {
  const B = C.CodeTranscriptBoundary;
  assert.equal(typeof B.getDerivedStateFromProps, 'function');
  const props = { sessionId: 'd02b-boundary', fallback: () => 'host rows' };
  const boundary = new B(props);
  assert.equal(boundary.render(), undefined, 'children (none) while healthy');
  // React: getDerivedStateFromError, then getDerivedStateFromProps before the fallback render.
  let state = { ...boundary.state, ...B.getDerivedStateFromError(new Error('boom')) };
  state = { ...state, ...B.getDerivedStateFromProps(props, state) };
  assert.equal(state.failed, true);
  assert.equal(C.codeTranscriptRendererOn(props.sessionId), false, 'marked in the render phase (the #520 sync retry sees it off)');
  // Re-renders while the retry is not due keep the fallback (no reset → no throw loop).
  assert.equal(B.getDerivedStateFromProps(props, state), null);
  boundary.state = state;
  assert.equal(boundary.render(), 'host rows');
  // Due (a failure marked >5s ago): the next render tries the renderer again.
  const due = { sessionId: 'd02b-due', fallback: () => 'host rows' };
  C.markCodeTranscriptFailed(due.sessionId, Date.now() - 6_000);
  const held = { sessionId: due.sessionId, failed: true, held: true };
  assert.deepEqual(B.getDerivedStateFromProps(due, held), { sessionId: due.sessionId, failed: null, held: false });
  // Another session (the child boundary's sessionId changes) starts clean.
  assert.deepEqual(B.getDerivedStateFromProps({ sessionId: 'd02b-next' }, state), { sessionId: 'd02b-next', failed: null, held: false });
  // The legacy direct render (no getDerivedStateFromProps) still marks before drawing the host rows.
  const direct = new B({ sessionId: 'd02b-direct', fallback: () => C.codeTranscriptRendererOn('d02b-direct') });
  direct.state = { ...direct.state, ...B.getDerivedStateFromError(new Error('boom')) };
  assert.equal(direct.render(), false);
});

// ---------------------------------------------------------------- D-03
const S3 = /(?:API error:?|HTTP(?:\/\d(?:\.\d)?)?|status(?:\s*code)?:?)\s*(4\d{2}|5\d{2})\b/i; // shared-3 S3 (x3 / C3 → k1)
const DETAILS = /^\s*(?:Claude Code returned an error result:\s*)?(?:API Error(?:\s*\((\d{3})\)|\s*\([^()\n]{1,80}\))?:?\s*|API\s+(?=\d{3}\b)|Error:\s+(?=\d{3}\s+[{[]))/i; // c7fb5ec3d c
const DETAILS_STATUS = /^(\d{3})\s+(?=[A-Z[{(])/; // c7fb5ec3d u

test('D-03: apiErrorStatusOf — string and object CodexErrorInfo, billing, a sign-in failure the host reads from the text', () => {
  const of = (codexErrorInfo, extra = {}) => M.apiErrorStatusOf({ message: 'x', codexErrorInfo, ...extra });
  assert.equal(of('unauthorized'), 401);
  // A plan / daily quota is not a short-term rate limit: no status, so the card never says "Rate limited. Try again in a moment."
  assert.equal(of('usageLimitExceeded'), undefined);
  assert.equal(of('rateLimitExceeded'), 429);
  assert.equal(of('serverOverloaded'), 529);
  assert.equal(of('internalServerError'), 500);
  assert.equal(of('badRequest'), 400);
  assert.equal(of({ responseStreamConnectionFailed: { httpStatusCode: 401 } }), 401);
  assert.equal(of({ responseStreamDisconnected: { httpStatusCode: null } }), undefined);
  assert.equal(of('usageLimitExceeded', { additionalDetails: 'QUOTA' }), 402, 'a DeepSeek balance is billing, not a rate limit');
  assert.equal(of(null, { additionalDetails: 'BILLING' }), 402);
  for (const none of ['contextWindowExceeded', 'sessionBudgetExceeded', 'cyberPolicy', 'other', 'sandboxError', null]) assert.equal(of(none), undefined, String(none));
  assert.equal(M.apiErrorStatusOf({ message: 'unexpected status 401 Unauthorized: Missing bearer or basic authentication', codexErrorInfo: null }), 401);
  assert.equal(M.apiErrorStatusOf(null), undefined);
  // The host card's own status is unchanged (object variants only).
  assert.equal(M.turnErrorStatus('unauthorized'), undefined);
});

test('D-03: rendererTurnErrors carries the status and an "API Error: N …" text k1 and the details box both read', () => {
  const out = T.rendererTurnErrors({
    a: { message: 'Invalid API key', codexErrorInfo: 'unauthorized' },
    b: { message: 'you hit your usage limit', codexErrorInfo: 'usageLimitExceeded' },
    c: { message: 'upstream unavailable', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } } },
    d: { message: '{"error":{"code":401,"message":"bad key"}}', codexErrorInfo: { responseStreamConnectionFailed: { httpStatusCode: 401 } } },
    e: { message: 'API Error: 429 {"error":{"message":"slow down"}}', codexErrorInfo: 'rateLimitExceeded' },
    f: { message: 'context full', codexErrorInfo: 'contextWindowExceeded' },
  });
  assert.deepEqual(out, {
    a: { message: 'API Error: 401 Invalid API key', status: 401 },
    b: { message: 'you hit your usage limit' },
    c: { message: 'API Error: 503 {"error":{"message":"upstream unavailable"}}', status: 503 },
    d: { message: 'API Error: 401 {"error":{"code":401,"message":"bad key"}}', status: 401 },
    e: { message: 'API Error: 429 {"error":{"message":"slow down"}}', status: 429 },
    f: { message: 'context full' },
  });
  assert.equal(S3.exec(out.b.message), null, 'k1 reads no status from a quota text');
  for (const [key, status] of [['a', 401], ['c', 503], ['d', 401], ['e', 429]]) {
    const message = out[key].message;
    assert.equal(Number(S3.exec(message)?.[1]), status, `k1 reads ${key}`);
    const head = DETAILS.exec(message), rest = message.slice(head[0].length);
    assert.equal(Number(head[1] ?? DETAILS_STATUS.exec(rest)?.[1]), status, `the details box reads ${key}'s Status`);
  }
});

const turn = (id, prompt) => [{ id: `u-${id}`, type: 'userMessage', turnId: id, content: [{ type: 'text', text: prompt }] },
  { id: `m-${id}`, type: 'agentMessage', turnId: id, text: `Working on ${prompt}` }];
const cardText = (errors, items = turn('t1', 'hi')) => text(render({ items, turnErrors: T.rendererTurnErrors(errors), host: { recovery: { onRetry() {}, onCompact() {} } } }));

test('D-03 (SSR): the latest card is the official L1 headline with the 401 / 429 / 5xx hint, not "Try sending your message again"', () => {
  const unauthorized = cardText({ t1: { message: 'Invalid API key', codexErrorInfo: 'unauthorized' } });
  assert.match(unauthorized, /Claude couldn’t process that message\|Authentication failed\. Sign in again to continue\./);
  const objectAuth = cardText({ t1: { message: 'bad key', codexErrorInfo: { responseStreamConnectionFailed: { httpStatusCode: 401 } } } });
  assert.match(objectAuth, /Claude couldn’t process that message\|Authentication failed\. Sign in again to continue\./);
  const limited = cardText({ t1: { message: 'slow down', codexErrorInfo: 'rateLimitExceeded' } });
  assert.match(limited, /Claude couldn’t process that message\|Rate limited\. Try again in a moment\./);
  // A daily / plan quota: not the short-term "try again in a moment" copy (the reason is in the details box).
  const quota = cardText({ t1: { message: 'You exceeded your current quota', codexErrorInfo: 'usageLimitExceeded' } });
  assert.doesNotMatch(quota, /Rate limited/);
  assert.match(quota, /Claude couldn’t process that message\|Try sending your message again\./);
  const busy = cardText({ t1: { message: 'boom', codexErrorInfo: 'internalServerError' } });
  assert.match(busy, /Service is busy\. Try again in a moment, or switch to a different model\./);
  // No status: still the generic hint (nothing invented).
  assert.match(cardText({ t1: { message: 'boom', codexErrorInfo: 'other' } }), /Claude couldn’t process that message\|Try sending your message again\./);
});

test('D-03 (SSR): an older failed turn\'s marker is a2e\'s label (401 → "Authentication failed", 429 → "Rate limited")', () => {
  const items = [...turn('t1', 'one'), ...turn('t2', 'two'), ...turn('t3', 'three')];
  const html = cardText({ t1: { message: 'Invalid API key', codexErrorInfo: 'unauthorized' }, t2: { message: 'slow', codexErrorInfo: 'rateLimitExceeded' },
    t3: { message: 'boom', codexErrorInfo: 'other' } }, items);
  const one = html.slice(html.indexOf('Working on one'), html.indexOf('two'));
  const two = html.slice(html.indexOf('Working on two'), html.indexOf('three'));
  assert.match(one, /\|Authentication failed\|/);
  assert.match(two, /\|Rate limited\|/);
});

// ---------------------------------------------------------------- D-06
const user = (id, turnId) => ({ type: 'userMessage', id, turnId, content: [{ type: 'text', text: id }] });
const agent = (id, turnId, text = id) => ({ type: 'agentMessage', id, turnId, text });

test('D-06: a hydrate puts each live-only item back into its own turn (verify-1 shape: DENYME / CUTME / DROPME / last)', () => {
  const live = [user('u1', 't1'), { type: 'commandExecution', id: 'call_deny', turnId: 't1', command: 'touch x', status: 'declined' },
    user('u2', 't2'), agent('msg_cut3', 't2', 'cut0 cut1'), user('u3', 't3'), agent('msg_drop4', 't3'), agent('msg_drop5', 't3'),
    user('u4', 't4'), agent('msg_10', 't4', 'reply-last-10')];
  // thread/read: Codex keeps the prompts and the last turn's reply only.
  const turns = [{ id: 't1', status: 'completed', items: [user('u1')] }, { id: 't2', status: 'interrupted', items: [user('u2')] },
    { id: 't3', status: 'failed', error: { message: 'stream dropped' }, items: [user('u3')] }, { id: 't4', status: 'completed', items: [user('u4'), agent('msg_10', undefined, 'reply-last-10')] }];
  const state = { ...emptyState, items: { th: live }, active: { th: null } };
  const next = reduce(state, { type: 'hydrate', id: 'th', thread: { id: 'th', turns }, baselineItems: live, baselineActive: null });
  assert.deepEqual(next.items.th.map((item) => `${item.id}@${item.turnId}`),
    ['u1@t1', 'call_deny@t1', 'u2@t2', 'msg_cut3@t2', 'u3@t3', 'msg_drop4@t3', 'msg_drop5@t3', 'u4@t4', 'msg_10@t4']);
  const entries = codeTranscriptEntries(next.items.th, { turnErrors: { t3: { message: 'stream dropped' } } });
  const assistants = entries.filter((entry) => entry.author === 'assistant').map((entry) => `${entry.turnId}:${entry.items.map((item) => item.id).join(',')}`);
  assert.deepEqual(assistants, ['t1:call_deny', 't2:msg_cut3', 't3:msg_drop4,msg_drop5,t3:turn-error', 't4:msg_10']);
  // A live-only item of a turn the page does not hold (newer than the snapshot) still goes last, as before.
  const newer = [...live, user('u5', 't5'), agent('m5', 't5')];
  const after = reduce({ ...state, items: { th: newer } }, { type: 'hydrate', id: 'th', thread: { id: 'th', turns }, baselineItems: newer, baselineActive: null });
  assert.deepEqual(after.items.th.slice(-2).map((item) => item.id), ['u5', 'm5']);
  // Within a turn that is in the page, an item placed after its own live predecessor (not after the turn's last row).
  const mid = [user('u1', 't1'), agent('lost', 't1'), agent('kept', 't1')];
  const midTurns = [{ id: 't1', status: 'completed', items: [user('u1'), agent('kept')] }];
  const placed = reduce({ ...state, items: { th: mid } }, { type: 'hydrate', id: 'th', thread: { id: 'th', turns: midTurns }, baselineItems: mid, baselineActive: null });
  assert.deepEqual(placed.items.th.map((item) => item.id), ['u1', 'lost', 'kept']);
});

test('D-06: the entry builder starts a new assistant entry when the turnId changes (no prompt in between)', () => {
  const entries = codeTranscriptEntries([user('u1', 't1'), agent('m1', 't1'), agent('m2', 't2')]);
  assert.deepEqual(entries.map((entry) => `${entry.author}@${entry.turnId}:${entry.items.map((item) => item.id).join(',')}`),
    ['user@t1:u1:text', 'assistant@t1:m1', 'assistant@t2:m2']);
  // Items with no turn identity keep joining the open entry.
  const loose = codeTranscriptEntries([user('u1', 't1'), agent('m1', 't1'), agent('m2', undefined)]);
  assert.deepEqual(loose.filter((entry) => entry.author === 'assistant').map((entry) => entry.items.map((item) => item.id).join(',')), ['m1,m2']);
});

// ---------------------------------------------------------------- D-07
const TH = 'th7';
const ev = (method, params) => ({ event: { method, params: { threadId: TH, ...params } } });
const started = (turnId, item) => ev('item/started', { turnId, item });
const completed = (turnId, item) => ev('item/completed', { turnId, item });
const delta = (turnId, itemId, text) => ev('item/agentMessage/delta', { turnId, itemId, delta: text });
const retry = (turnId, extra = {}) => ev('error', { turnId, willRetry: true, error: { message: 'Reconnecting... 1/5', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } } }, ...extra });
const run = (events) => events.reduce((state, action) => reduce(state, action), emptyState);
const shown = (state) => (state.items[TH] || []).map((item) => item.type === 'agentMessage' ? `${item.id}:${item.text}` : item.id);
const begin = (turnId) => [ev('turn/started', { turn: { id: turnId, items: [], status: 'inProgress' } }), started(turnId, user(`u-${turnId}`)), completed(turnId, user(`u-${turnId}`))];

test('D-07: Codex ONEDROP — the cut attempt goes once the retry streams a new message; turn/completed.items confirms it', () => {
  const head = [...begin('t1'), started('t1', agent('msg_cut_1', undefined, '')), delta('t1', 'msg_cut_1', 'Reconnect wor'), retry('t1')];
  // While Codex reconnects, the partial reply stays (nothing to show instead yet).
  assert.deepEqual(shown(run(head)), ['u-t1', 'msg_cut_1:Reconnect wor']);
  const full = 'Reconnect worked and this is the one complete reply.';
  const streaming = run([...head, started('t1', agent('msg_full_2', undefined, '')), delta('t1', 'msg_full_2', 'Reconnect')]);
  assert.deepEqual(shown(streaming), ['u-t1', 'msg_full_2:Reconnect']);
  const done = run([...head, started('t1', agent('msg_full_2', undefined, '')), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } })]);
  assert.deepEqual(shown(done), ['u-t1', `msg_full_2:${full}`]);
  // turn/completed alone drops a message of the turn that never completed and is not in turn.items.
  const late = run([...begin('t1'), started('t1', agent('msg_cut_1', undefined, '')), delta('t1', 'msg_cut_1', 'half'), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } })]);
  assert.deepEqual(shown(late), ['u-t1', `msg_full_2:${full}`]);
  const entries = codeTranscriptEntries(done.items[TH]);
  assert.deepEqual(entries.map((entry) => entry.items.map((item) => item.id).join(',')), ['u-t1:text', 'msg_full_2']);
});

test('D-07: Codex ALLDROP — only the last attempt and the error are left; an earlier turn is untouched', () => {
  const full = 'complete';
  const events = [...begin('t1'), started('t1', agent('msg_full_2', undefined, '')), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } }), ...begin('t2')];
  for (let n = 3; n <= 8; n++) {
    events.push(started('t2', agent(`msg_frag_${n}`, undefined, '')), delta('t2', `msg_frag_${n}`, `frag-${n} `));
    if (n < 8) events.push(retry('t2'));
  }
  events.push(ev('error', { turnId: 't2', willRetry: false, error: { message: 'stream disconnected before completion', codexErrorInfo: { responseTooManyFailedAttempts: { httpStatusCode: null } } } }),
    ev('turn/completed', { turn: { id: 't2', status: 'failed', error: { message: 'stream disconnected before completion' }, items: [] } }));
  const state = run(events);
  assert.deepEqual(shown(state), ['u-t1', `msg_full_2:${full}`, 'u-t2', 'msg_frag_8:frag-8 ']);
  const entries = codeTranscriptEntries(state.items[TH], { turnErrors: { t2: { message: 'stream disconnected before completion' } } });
  assert.deepEqual(entries.map((entry) => entry.items.map((item) => item.id).join(',')), ['u-t1:text', 'msg_full_2', 'u-t2:text', 'msg_frag_8,t2:turn-error']);
});

test('D-07: other cores are unchanged — empty turn.items deletes nothing; a retried message that goes on, or completes, stays', () => {
  // An empty (or missing) turn.items (every bridge's turn/completed) leaves a message that never completed.
  for (const items of [[], undefined]) {
    const state = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'partial'),
      ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, ...(items ? { items } : {}) } })]);
    assert.deepEqual(shown(state), ['u-t1', 'm1:partial'], JSON.stringify(items));
  }
  // A bridge retry (`retry` field) that restarts the same item id (DeepSeek llm/retry): the item is kept.
  const same = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'first try'), retry('t1', { retry: { attempt: 1, maxRetries: 3 } }),
    started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'second'), started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'next')]);
  assert.deepEqual(shown(same).map((row) => row.split(':')[0]), ['u-t1', 'm1', 'm2']);
  // A retried message that keeps streaming (deltas to its own id) is not left behind.
  const goesOn = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'a'), retry('t1'), delta('t1', 'm1', 'b'),
    started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'c')]);
  assert.deepEqual(shown(goesOn), ['u-t1', 'm1:ab', 'm2:c']);
  // A message that completed before the retry is never dropped.
  const kept = run([...begin('t1'), started('t1', agent('m1', undefined, '')), completed('t1', agent('m1', undefined, 'done')), retry('t1'),
    started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'next')]);
  assert.deepEqual(shown(kept), ['u-t1', 'm1:done', 'm2:next']);
  // A delta-only message (no item/started) after the retry drops the cut one too.
  const deltaOnly = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'cut'), retry('t1'), delta('t1', 'm2', 'whole')]);
  assert.deepEqual(shown(deltaOnly), ['u-t1', 'm2:whole']);
});

test('D-07: the error part of a split reply names its own row, not the first fragment\'s', () => {
  const error = { kind: 'turn_error', id: 't2:turn-error', subtype: 'error_during_execution', errors: ['x'] };
  const entry = { items: [{ kind: 'text', id: 'msg_frag_8', text: 'frag-8' }, error], rows: [{ id: 'msg_frag_3' }, { id: 'msg_frag_8' }] };
  // TM's key for entry.items[1] (kM / fM: `${turnKey}:t${index * 65536 + 1}`).
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:t65537' }, entry, 'msg_frag_3'), 't2:turn-error');
  assert.equal(C.partRowId({ kind: 'assistantItem', isFirst: false, turnKey: 'k', item: error }, entry, 'msg_frag_3'), 't2:turn-error');
  // Unchanged: the text part names its host row, the first part and unknown keys fall back.
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:t1' }, entry, 'msg_frag_3'), 'msg_frag_8');
  assert.equal(C.partRowId({ isFirst: true, turnKey: 'k', itemKey: 'k:t65537' }, entry, 'msg_frag_3'), 'msg_frag_3');
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:nope' }, entry, 'msg_frag_3'), 'msg_frag_3');
  assert.deepEqual(C.partRowIds({ isFirst: false, turnKey: 'k', itemKey: 'k:t65537' }, entry), [], 'no host row joins the feed list');
});
