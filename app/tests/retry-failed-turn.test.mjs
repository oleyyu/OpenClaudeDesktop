import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import * as Model from '../src/retry-failed-turn-model.mjs';
import { retryNudgeMessages } from '../src/generated/retry-decision/retry-nudge-messages.mjs';
import * as I18n from '../electron/i18n/index.mjs';
import { reduce } from '../src/state.js';

// R4f-error E36 — transcript-09 (WI-6): the error card's Try again is 2.42304.0 cc43287c9 b_ over lz (generated
// retry-decision, host input retry-turn-model.mjs), wired by main.jsx through src/retry-failed-turn-model.mjs; and
// transcript-auto-resume-after-limit (WI-7): the 'Auto-continue when limits reset' timer fires cc43287c9 N_ (the official
// afterUsageLimit message, the sr-only 'Limits reset — resuming session' status). The glue runs here with controlled
// state, composer, rpc and focus; official strings are pinned in the installed chunks; main.jsx's wiring is read as an AST.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const AFTER_LIMIT = 'I hit my usage limit while you were working, but it has reset now. Please continue from where you left off.';
const NUDGE = [{ type: 'text', text: 'Try again', text_elements: [] }];

let server, Status, previousLocale;
before(async () => {
  previousLocale = I18n.getLocale();
  I18n.setLocale('en-US');
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Status = await server.ssrLoadModule('/src/source-auto-resume-status.jsx');
});
after(async () => { I18n.setLocale(previousLocale); await server?.close(); });

// ---------------------------------------------------------------- fixtures: a Codex thread 'th' as state.js keeps it
const user = (id, turnId, content = [{ type: 'text', text: 'fix the bug' }]) => ({ type: 'userMessage', id, turnId, content });
const agent = (id, turnId) => ({ type: 'agentMessage', id, turnId, text: 'working on it' });
function threadState({ items, turnErrors = {}, error = null, killed = false, active = null }) {
  return { items: { th: items }, turnErrors: { th: turnErrors }, errors: { th: error }, errorKilledTurn: { th: killed }, active: { th: active } };
}
const failedLastTurn = () => threadState({ items: [user('u1', 't1'), agent('a1', 't1'), user('u2', 't2', [{ type: 'text', text: 'now the tests' }]), agent('a2', 't2')],
  turnErrors: { t2: { message: 'stream disconnected before completion' } } });

// The host services retryFailedTurn hands the flow (main.jsx closures), recorded in call order.
function harness({ state, composer = { text: '', attachments: [], mentions: [] }, rpc, continueTurn = false, blocked = false, ensureResumed } = {}) {
  const log = [];
  const deps = {
    threadId: 'th', blocked, continueTurn,
    ensureResumed: ensureResumed ?? (async (id) => { log.push(['ensureResumed', id]); }),
    rpc: async (method, params) => { log.push(['rpc', method, params]); return rpc ? rpc(method, params) : {}; },
    turnOptions: () => ({ model: 'gpt-x', cwd: '/work' }),
    readState: () => state, readComposer: () => composer,
    setError: (value) => log.push(['setError', value]),
    clearThreadError: (id) => log.push(['clearThreadError', id]),
    setTurnRequested: (value) => log.push(['setTurnRequested', typeof value === 'function' ? `release:${value('th')}/${value('other')}` : value]),
    focusComposer: () => log.push(['focus']),
    submitComposer: () => log.push(['submit']),
    sendPrompt: (text) => log.push(['sendPrompt', text]),
    refillComposer: (text) => log.push(['refill', text]),
    translate: I18n.t,
  };
  return { deps, log, composer };
}
const kinds = log => log.map(([kind, method]) => (kind === 'rpc' ? `rpc:${method}` : kind));

// ---------------------------------------------------------------- official source
test('official: b_ dispatch, x_, clearError, N_ and its status, iW, Vv, oW\'s skip, the afterUsageLimit copy (once each)', () => {
  const pins = [
    ['cc43287c9-DAfOi8yP.js', 'a=lz(n,{text:r.getText(),isEmpty:!r.hasDraft()});return a==="resend"?(r.submit({personSent:i}),!0):a==="nudgeBesideDraft"&&G?(y_(G,i),r.scheduleFocus(),!0):a==="nudge"?(Ro(),Eo(V.formatMessage(xN.retryNudge)),r.submit({retryNudge:!0,personSent:i}),!0):a==="repeatPrompt"&&n?.lastPrompt!==void 0?(Ro(),Eo(n.lastPrompt.text),r.submit({personSent:i}),!0):(a==="refillPrompt"&&n?.lastPrompt!==void 0&&(Ro(),zo(n.lastPrompt.text)),a==="deliver"?(Fs(),!0):(r.scheduleFocus(),!1))'],
    ['cc43287c9-DAfOi8yP.js', 't?.errorCategory==="trust_required"&&(Gd.current=!0),K&&n_(K);let r=Na.current;if(!r)return!1;'],
    ['cc43287c9-DAfOi8yP.js', 'x_=A(()=>b_()?!0:(bl(fi),!1),[b_,bl])'],
    ['cc43287c9-DAfOi8yP.js', 'n_=Sk(e=>e.clearError)'],
    ['cc43287c9-DAfOi8yP.js', 'ct=be?.retryNudge===!0&&W.type==="local"'],
    ['cc43287c9-DAfOi8yP.js', 'i=n!==void 0&&n.error!==null&&n.errorKilledTurn||_y(n?.messages.getSnapshot()??[]),a=Ty({restoredFromError:!1,isEmpty:t?.isEmpty()??!0,isBashMode:t?.isBashMode()??!1,hasDraft:t?.hasDraft()??!1,hasComposerAttachments:e.getState().hasComposerAttachments});if(!t||r||!i||!a)return!1;'],
    ['cc43287c9-DAfOi8yP.js', 'return K&&n_(K),M_(e=>({text:V.formatMessage({defaultMessage:"Limits reset \\u2014 resuming session",id:"PZ1vuMcNj4"}),seq:(e?.seq??0)+1})),setTimeout(()=>{let e=Na.current;e&&e.isEmpty()&&ir()&&(Ro(),Eo(V.formatMessage(xN.afterUsageLimit)),e.submit());let t=R(A_.current);t.activeElement===t.body&&ir()&&e?.scheduleFocus()},0),{kind:"nudge",context:s}'],
    ['cc43287c9-DAfOi8yP.js', 'let e=A_.current;if(!e||(e.textContent="",!j_))return;let t=ge(e),n=t.setTimeout(()=>{e.textContent=j_.text},50);return()=>t.clearTimeout(n)'],
    ['cc43287c9-DAfOi8yP.js', 'v("span",{ref:A_,role:"status",className:"sr-only select-none"})'],
    ['cc43287c9-DAfOi8yP.js', 'Gv({sessionId:K,onFire:N_,transcriptReady:!Me})'],
    ['cc43287c9-DAfOi8yP.js', 'Lr as Ty'], ['cc43287c9-DAfOi8yP.js', 'Ir as _y'], ['cc43287c9-DAfOi8yP.js', 'Br as Gv'], ['cc43287c9-DAfOi8yP.js', 'ut as xA'],
    ['c227f4d5e-Ba-r--Rl.js', 'iW as Lr'], ['c227f4d5e-Ba-r--Rl.js', 'oW as Br'],
    ['c227f4d5e-Ba-r--Rl.js', 'if(m===!1||"blocked"in m){if(AU(p),h===void 0||h.resetsAt!==t.resetsAt)return;u.upsert(e,{...h,armed:!1})'],
    ['c06cf64bb-BE5q2vSr.js', 'function Vv(e){let t=q(e);return t!==void 0&&(t.pendingTurn!==null||t.heldInput.length>0)}'], ['c06cf64bb-BE5q2vSr.js', 'Vv as ut'],
    ['c73f45bc3-CFrHin0p.js', 'id:"UqWMzb4bJb"'], ['c73f45bc3-CFrHin0p.js', AFTER_LIMIT],
    // R4f-error review fix — what n_ clears (the session's error, state.js "clear-error") and what it leaves alone.
    ['c06cf64bb-BE5q2vSr.js', 'clearError(e){J(e,e=>e.error===null&&e.errorCategory===null&&e.tccFolderKind===null&&!e.errorKilledTurn&&e.errorRejectedPrompt===null?e:{...e,error:null,errorCategory:null,tccFolderKind:null,sshFailureReason:null,errorKilledTurn:!1,errorRejectedPrompt:null})}'],
    // Both Try again surfaces are x_: the session error notice (handleErrorRetry, its error is the session's unless the
    // error is the transcript's own) and the in-transcript error row (retryLastTurn -> onErrorRetry -> onRetryLastTurn).
    ['cc43287c9-DAfOi8yP.js', 'handleErrorDismiss:a_,handleErrorRetry:x_'], ['cc43287c9-DAfOi8yP.js', 'Mg=We==="transcript"?null:Re'],
    ['cc43287c9-DAfOi8yP.js', 'retryLastTurn:x_'], ['cf74bc599-D9NZWRyl.js', 'Re=b(()=>e.current?.retryLastTurn(),[e])'],
    ['c227f4d5e-Ba-r--Rl.js', 'let{retryable:t,idle:l}=e;return{onRetryLastTurn:t?e.onRetry:void 0,'],
    // The row's Try again needs no session error (retryable = idle and not read-only), it stays live by its position
    // (isLastEntry / isLastErrorItem), and one click latches its actions.
    ['c227f4d5e-Ba-r--Rl.js', 'let l=!t&&!n,u=l&&!r,d=H(()=>hW(e),[e]),f=M(()=>({scopeStore:e,retryable:u,idle:l,canSendMessage:!n,onRetry:i,'],
    ['c96d752d0-BOCqU7c2.js', 'let c=i4e(r),l=(n||c)&&t'], ['c96d752d0-BOCqU7c2.js', 'latchOnAction:!0,onRetry:h'],
  ];
  for (const [file, needle] of pins) assert.equal(occurrences(raw(file), needle), 1, `${file}: ${needle.slice(0, 80)}`);
  // The host's copy of the inline status message is the original's literal (minified with the — escape).
  const literal = `defaultMessage:"${Model.LIMITS_RESET_MESSAGE.defaultMessage.replace('—', '\\u2014')}",id:"${Model.LIMITS_RESET_MESSAGE.id}"`;
  assert.equal(occurrences(raw('cc43287c9-DAfOi8yP.js'), literal), 1);
  assert.equal(retryNudgeMessages.afterUsageLimit.defaultMessage, AFTER_LIMIT);
});

test('autoResumeComposerAllows is c227f4d5e iW: the same expression, the same answer for all 32 inputs', () => {
  const source = raw('c227f4d5e-Ba-r--Rl.js');
  const start = source.indexOf('function iW(e){');
  const official = source.slice(start, source.indexOf('}', start) + 1);
  assert.equal(official, 'function iW(e){return!(e.hasComposerAttachments||e.isBashMode||e.hasDraft&&e.isEmpty)&&(e.restoredFromError||e.isEmpty)}');
  const body = fn => String(fn).slice(String(fn).indexOf('{') + 1, String(fn).lastIndexOf('}')).replace(/\s+|;/g, '');
  assert.equal(body(Model.autoResumeComposerAllows), body(official));
  const iW = new Function(`return (${official})`)();
  for (let bits = 0; bits < 32; bits++) {
    const input = { restoredFromError: !!(bits & 1), isEmpty: !!(bits & 2), isBashMode: !!(bits & 4), hasDraft: !!(bits & 8), hasComposerAttachments: !!(bits & 16) };
    assert.equal(Model.autoResumeComposerAllows(input), iW(input), JSON.stringify(input));
  }
});

// ---------------------------------------------------------------- Try again (retryFailedTurnFlow)
test('nudge: a turn that failed midway, empty composer — the localized "Try again" as its own turn, the composer untouched', async () => {
  const { deps, log, composer } = harness({ state: failedLastTurn() });
  const result = await Model.retryFailedTurnFlow({ ...deps, turnId: 't2' });
  assert.deepEqual(result, { outcome: 'nudge', handled: true });
  assert.deepEqual(log, [
    ['setError', ''], ['ensureResumed', 'th'], ['clearThreadError', 'th'], ['setTurnRequested', 'th'],
    ['rpc', 'turn/start', { threadId: 'th', input: NUDGE, model: 'gpt-x', cwd: '/work' }],
  ], 'never the failed input again, no focus, no draft / pending bubble / refill');
  assert.deepEqual(composer, { text: '', attachments: [], mentions: [] });
});

test('nudgeBesideDraft: a draft in the composer stays and keeps the focus while the nudge goes out', async () => {
  let release;
  const { deps, log, composer } = harness({ state: failedLastTurn(), composer: { text: 'and the docs', attachments: [], mentions: [{ path: 'a.md' }] },
    rpc: method => (method === 'turn/start' ? new Promise(resolve => { release = resolve; }) : {}) });
  const pending = Model.retryFailedTurnFlow({ ...deps, turnId: 't2' });
  await new Promise(resolve => setImmediate(resolve));
  // y_ is not awaited before scheduleFocus: the focus is asked for while turn/start is still in flight.
  assert.deepEqual(kinds(log), ['setError', 'ensureResumed', 'clearThreadError', 'setTurnRequested', 'rpc:turn/start', 'focus']);
  release({});
  assert.deepEqual(await pending, { outcome: 'nudgeBesideDraft', handled: true });
  assert.deepEqual(log.find(entry => entry[1] === 'turn/start')[2].input, NUDGE);
  assert.deepEqual(composer, { text: 'and the docs', attachments: [], mentions: [{ path: 'a.md' }] }, 'draft, attachments and mentions kept');
  assert.ok(!kinds(log).some(kind => ['submit', 'sendPrompt', 'refill'].includes(kind)));
  // A whitespace-only editor and attachments alone are drafts too (c227f4d5e hasDraft).
  for (const draft of [{ text: '  ', attachments: [] }, { text: '', attachments: [{ name: 'shot.png' }] }]) {
    const other = harness({ state: failedLastTurn(), composer: draft });
    assert.equal((await Model.retryFailedTurnFlow({ ...other.deps, turnId: 't2' })).outcome, 'nudgeBesideDraft', JSON.stringify(draft));
  }
});

test('a failed turn whose input was images only now gets the nudge too (canRetry no longer needs a text-only input)', async () => {
  const state = threadState({ items: [user('u1', 't1', [{ type: 'localImage', path: '/tmp/x.png' }])], turnErrors: { t1: { message: 'boom' } } });
  const { deps, log } = harness({ state });
  assert.equal((await Model.retryFailedTurnFlow({ ...deps, turnId: 't1' })).outcome, 'nudge');
  assert.deepEqual(log.find(entry => entry[1] === 'turn/start')[2].input, NUDGE, 'the nudge, not the image input');
});

test('focus: the thread card of an error that cut no turn short, or an old turn\'s card — the composer takes focus, nothing is sent', async () => {
  const idle = threadState({ items: [user('u1', 't1'), agent('a1', 't1')], error: { message: 'Reconnecting… 2/5' }, killed: false });
  const first = harness({ state: idle });
  assert.deepEqual(await Model.retryFailedTurnFlow({ ...first.deps, turnId: 't1', thread: true }), { outcome: 'focus', handled: false });
  assert.deepEqual(kinds(first.log), ['setError', 'ensureResumed', 'clearThreadError', 'focus']);
  // The latest turn succeeded; Try again on the earlier failed turn's card finds nothing to nudge.
  const old = threadState({ items: [user('u1', 't1'), agent('a1', 't1'), user('u2', 't2'), agent('a2', 't2')], turnErrors: { t1: { message: 'boom' } } });
  const second = harness({ state: old });
  assert.equal((await Model.retryFailedTurnFlow({ ...second.deps, turnId: 't1' })).outcome, 'focus');
  assert.ok(!second.log.some(entry => entry[1] === 'turn/start'));
});

test('thread card: a thread-wide error that cut the running turn short (state.errorKilledTurn) gets the nudge', async () => {
  const killed = threadState({ items: [user('u1', 't1'), agent('a1', 't1')], error: { message: 'The core exited' }, killed: true, active: null });
  const { deps, log } = harness({ state: killed });
  assert.deepEqual(await Model.retryFailedTurnFlow({ ...deps, turnId: 't1', thread: true }), { outcome: 'nudge', handled: true });
  assert.deepEqual(log.at(-1), ['rpc', 'turn/start', { threadId: 'th', input: NUDGE, model: 'gpt-x', cwd: '/work' }]);
  // The same card read as a turn card would not see the thread error (turnErrors has none): focus.
  const asTurn = harness({ state: killed });
  assert.equal((await Model.retryFailedTurnFlow({ ...asTurn.deps, turnId: 't1' })).outcome, 'focus');
});

test('host continueTurn (Qwen\'s codeDesktop/turn/continue) is asked first; nothing more is sent when it accepts', async () => {
  const accepted = harness({ state: failedLastTurn(), continueTurn: true, rpc: method => (method === 'codeDesktop/turn/continue' ? { accepted: true } : {}) });
  assert.deepEqual(await Model.retryFailedTurnFlow({ ...accepted.deps, turnId: 't2' }), { outcome: 'continued', handled: true });
  assert.deepEqual(kinds(accepted.log), ['setError', 'ensureResumed', 'rpc:codeDesktop/turn/continue', 'clearThreadError']);
  for (const answer of [{ accepted: false }, Promise.reject(Error('unsupported'))]) {
    const declined = harness({ state: failedLastTurn(), continueTurn: true, rpc: method => (method === 'codeDesktop/turn/continue' ? answer : {}) });
    assert.equal((await Model.retryFailedTurnFlow({ ...declined.deps, turnId: 't2' })).outcome, 'nudge');
    assert.deepEqual(kinds(declined.log), ['setError', 'ensureResumed', 'rpc:codeDesktop/turn/continue', 'clearThreadError', 'setTurnRequested', 'rpc:turn/start']);
  }
  const without = harness({ state: failedLastTurn(), continueTurn: false });
  await Model.retryFailedTurnFlow({ ...without.deps, turnId: 't2' });
  assert.ok(!without.log.some(entry => entry[1] === 'codeDesktop/turn/continue'));
});

// R4f-error review fix: b_ runs `K&&n_(K)` (c06cf64bb clearError) after taking the state lz reads and before lz, so the
// session's error leaves whatever lz picks. On this host that error is state.errors[id] + errorKilledTurn[id] (state.js
// "clear-error", the real reducer here); a turn's TurnError is the original's in-transcript error row and stays.
test('clearError: the thread-wide card leaves at once whatever lz picks; the decision still reads the state from before it', async () => {
  const run = async (state, extra) => {
    let live = state;
    const { deps, log } = harness({ state });
    const result = await Model.retryFailedTurnFlow({ ...deps, readState: () => live,
      clearThreadError: (id) => { log.push(['clearThreadError', id]); live = reduce(live, { type: 'clear-error', id }); }, ...extra });
    return { result, log, live };
  };
  // focus (no turn was cut short): nothing is sent, and the card is gone rather than left in place.
  const idle = threadState({ items: [user('u1', 't1'), agent('a1', 't1')], error: { message: 'Reconnecting… 2/5' }, killed: false });
  const focus = await run(idle, { turnId: 't1', thread: true });
  assert.equal(focus.result.outcome, 'focus');
  assert.equal(focus.live.errors.th, null, 'state.errors[th] cleared: main.jsx no longer renders the thread card');
  assert.equal(focus.live.errorKilledTurn.th, false);
  assert.deepEqual(kinds(focus.log), ['setError', 'ensureResumed', 'clearThreadError', 'focus']);
  // nudge: lz still sees errorKilledTurn (taken before the clear, as b_'s sz(t) snapshot), and the card leaves too.
  const killed = threadState({ items: [user('u1', 't1'), agent('a1', 't1')], error: { message: 'The core exited' }, killed: true });
  const nudge = await run(killed, { turnId: 't1', thread: true });
  assert.equal(nudge.result.outcome, 'nudge');
  assert.equal(nudge.live.errors.th, null);
  assert.equal(nudge.live.errorKilledTurn.th, false);
  // A turn card: the turn's own TurnError stays (positional in-transcript row; its actions latch in SourceTurnError).
  const turn = await run(failedLastTurn(), { turnId: 't2' });
  assert.equal(turn.result.outcome, 'nudge');
  assert.deepEqual(turn.live.turnErrors.th, { t2: { message: 'stream disconnected before completion' } });
  // The core continuing the turn itself also takes the card away; a resume failure stops before (nothing cleared).
  const continued = await run(killed, { turnId: 't1', thread: true, continueTurn: true, rpc: async (method) => (method === 'codeDesktop/turn/continue' ? { accepted: true } : {}) });
  assert.equal(continued.result.outcome, 'continued');
  assert.equal(continued.live.errors.th, null);
  const failedResume = await run(killed, { turnId: 't1', thread: true, ensureResumed: async () => { throw Error('Session not found'); } });
  assert.equal(failedResume.result.outcome, null);
  assert.deepEqual(failedResume.live, killed);
});

test('state.js clear-error is c06cf64bb clearError on the host: errors[id] and errorKilledTurn[id] only, a no-op when clean', () => {
  const state = { ...threadState({ items: failedLastTurn().items.th, turnErrors: { t2: { message: 'x' } }, error: { message: 'boom' }, killed: true }),
    errors: { th: { message: 'boom' }, other: { message: 'keep' } }, errorKilledTurn: { th: true, other: true } };
  const next = reduce(state, { type: 'clear-error', id: 'th' });
  assert.deepEqual(next.errors, { th: null, other: { message: 'keep' } });
  assert.deepEqual(next.errorKilledTurn, { th: false, other: true });
  assert.equal(next.turnErrors, state.turnErrors, 'turn errors untouched');
  assert.equal(next.items, state.items);
  assert.equal(reduce(next, { type: 'clear-error', id: 'th' }), next, 'nothing to clear: the same state (the original returns the bucket unchanged)');
  assert.equal(reduce(next, { type: 'clear-error', id: 'never-seen' }), next);
});

test('guards: blocked or no session does nothing at all', async () => {
  for (const extra of [{ blocked: true }, { threadId: null }]) {
    const { deps, log } = harness({ state: failedLastTurn() });
    assert.deepEqual(await Model.retryFailedTurnFlow({ ...deps, ...extra, turnId: 't2' }), { outcome: null, handled: false });
    assert.deepEqual(log, []);
  }
});

test('a failed nudge only shows the error: turnRequested released, nothing refilled, no bubble, no resend', async () => {
  const { deps, log, composer } = harness({ state: failedLastTurn(), rpc: method => { if (method === 'turn/start') throw Error('The core refused the turn'); return {}; } });
  assert.deepEqual(await Model.retryFailedTurnFlow({ ...deps, turnId: 't2' }), { outcome: 'nudge', handled: true });
  assert.deepEqual(log.slice(-2), [['setTurnRequested', 'release:null/other'], ['setError', 'The core refused the turn']]);
  assert.ok(!kinds(log).some(kind => ['submit', 'sendPrompt', 'refill', 'focus'].includes(kind)));
  assert.deepEqual(composer, { text: '', attachments: [], mentions: [] });
  // A resume failure stops before the decision.
  const resume = harness({ state: failedLastTurn(), ensureResumed: async () => { throw Error('Session not found'); } });
  assert.deepEqual(await Model.retryFailedTurnFlow({ ...resume.deps, turnId: 't2' }), { outcome: null, handled: false });
  assert.deepEqual(resume.log, [['setError', ''], ['setError', 'Session not found']]);
});

test('zh-CN: the nudge is the localized retryNudge (重试), as the original formats it before sending', async () => {
  I18n.setLocale('zh-CN');
  try {
    const { deps, log } = harness({ state: failedLastTurn() });
    await Model.retryFailedTurnFlow({ ...deps, turnId: 't2' });
    assert.deepEqual(log.at(-1)[2].input, [{ type: 'text', text: '重试', text_elements: [] }]);
    // That nudge in the transcript is a canned message: a later Try again still nudges and never treats it as the prompt.
    const after = threadState({ items: [...failedLastTurn().items.th, user('u3', 't3', [{ type: 'text', text: '重试' }])], turnErrors: { t2: { message: 'x' }, t3: { message: 'y' } } });
    const again = harness({ state: after });
    assert.equal((await Model.retryFailedTurnFlow({ ...again.deps, turnId: 't3' })).outcome, 'nudge');
  } finally { I18n.setLocale('en-US'); }
});

test('the four results the host never reaches still get an explicit action (b_ order and return values)', async () => {
  const items = [user('u1', 't1', [{ type: 'text', text: 'fix the bug' }]), agent('a1', 't1')];
  const run = async (outcome, list = items) => {
    const log = [];
    const handled = await Model.runErrorRetryOutcome(outcome, { items: list, translate: I18n.t, sendNudge: async () => log.push(['nudge']),
      focusComposer: () => log.push(['focus']), submitComposer: () => log.push(['submit']), sendPrompt: text => log.push(['sendPrompt', text]),
      refillComposer: text => log.push(['refill', text]) });
    return { handled, log };
  };
  assert.deepEqual(await run('resend'), { handled: true, log: [['submit']] });
  assert.deepEqual(await run('repeatPrompt'), { handled: true, log: [['sendPrompt', 'fix the bug']] });
  assert.deepEqual(await run('refillPrompt'), { handled: false, log: [['refill', 'fix the bug'], ['focus']] });
  assert.deepEqual(await run('deliver'), { handled: false, log: [] }, 'no held input on this host');
  // Without a last prompt (the last one is the canned nudge): repeatPrompt / refillPrompt fall to scheduleFocus.
  const canned = [user('u1', 't1', [{ type: 'text', text: 'Try again' }])];
  assert.deepEqual(await run('repeatPrompt', canned), { handled: false, log: [['focus']] });
  assert.deepEqual(await run('refillPrompt', canned), { handled: false, log: [['focus']] });
  assert.deepEqual(await run('focus'), { handled: false, log: [['focus']] });
  assert.deepEqual(await run('nudge'), { handled: true, log: [['nudge']] });
  assert.deepEqual(await run('nudgeBesideDraft'), { handled: true, log: [['nudge'], ['focus']] });
});

test('scheduleComposerFocus: the composer\'s scheduleFocus, else focus()', () => {
  const calls = [];
  Model.scheduleComposerFocus({ scheduleFocus: (...args) => calls.push(['schedule', args.length]), focus: () => calls.push(['focus']) });
  Model.scheduleComposerFocus({ focus: () => calls.push(['focus']) });
  Model.scheduleComposerFocus(null);
  assert.deepEqual(calls, [['schedule', 0], ['focus']]);
});

// ---------------------------------------------------------------- auto-resume after the usage limit (N_)
function autoHarness({ state = failedLastTurn(), composer = { text: '', attachments: [] }, current = 'th', bash = false, body = true } = {}) {
  const log = [], deferred = [];
  const live = { composer, current };
  const deps = {
    pending: { threadId: 'th', turnId: 't2', at: 1 },
    readCurrent: () => live.current, readState: () => state, readComposer: () => live.composer, bashMode: () => bash,
    clearError: (id) => log.push(['clearError', id]), announce: text => log.push(['announce', text]),
    sendPrompt: text => log.push(['sendPrompt', text]), focusComposer: () => log.push(['focus']), activeIsBody: () => body,
    defer: callback => deferred.push(callback), translate: I18n.t,
  };
  return { deps, log, live, flush: () => deferred.splice(0).forEach(callback => callback()) };
}

test('auto-resume fires N_: clear the error, announce "Limits reset — resuming session", then send afterUsageLimit from an empty composer', () => {
  const { deps, log, flush } = autoHarness();
  assert.deepEqual(Model.runAutoResumeAfterLimit(deps), { fire: true, reason: null, kind: 'nudge' });
  assert.deepEqual(log, [['clearError', 'th'], ['announce', 'Limits reset — resuming session']], 'the send waits for setTimeout(…, 0)');
  flush();
  assert.deepEqual(log.slice(2), [['sendPrompt', AFTER_LIMIT], ['focus']], 'an ordinary send of the official text, then focus (nothing focused)');
  assert.ok(!log.some(([, text]) => text === 'now the tests' || text === 'fix the bug'), 'never the failed turn\'s input');
  // Something else has the focus: it keeps it.
  const busyFocus = autoHarness({ body: false });
  Model.runAutoResumeAfterLimit(busyFocus.deps); busyFocus.flush();
  assert.deepEqual(busyFocus.log.at(-1), ['sendPrompt', AFTER_LIMIT]);
});

test('auto-resume: typed into, or left, before the deferred send — nothing is sent (composer.isEmpty() && ir())', () => {
  const typed = autoHarness();
  Model.runAutoResumeAfterLimit(typed.deps);
  typed.live.composer = { text: 'wait', attachments: [] };
  typed.flush();
  assert.deepEqual(typed.log.slice(2), [['focus']]);
  const left = autoHarness();
  Model.runAutoResumeAfterLimit(left.deps);
  left.live.current = 'other';
  left.flush();
  assert.deepEqual(left.log.slice(2), []);
});

test('auto-resume refusals (N_ returns false, oW disarms): composer, bash mode, another session, a running turn, no failed latest turn', () => {
  const later = threadState({ items: [...failedLastTurn().items.th, user('u3', 't3'), agent('a3', 't3')], turnErrors: { t2: { message: 'limit' } } });
  const cases = [
    [{ composer: { text: 'half typed', attachments: [] } }, 'composer'],
    [{ composer: { text: '', attachments: [{ name: 'a.png' }] } }, 'composer'],
    [{ bash: true }, 'composer'],
    [{ current: 'other' }, 'session'],
    [{ state: { ...failedLastTurn(), active: { th: 't3' } } }, 'busy'],
    [{ state: later }, 'not-failed'],
    [{ state: threadState({ items: failedLastTurn().items.th }) }, 'not-failed'],
  ];
  for (const [options, reason] of cases) {
    const { deps, log, flush } = autoHarness(options);
    assert.deepEqual(Model.runAutoResumeAfterLimit(deps), { fire: false, reason }, JSON.stringify(options));
    flush();
    assert.deepEqual(log, [], 'no announcement, no send');
  }
  // Only newlines count as empty, as the editor's isEmpty.
  assert.equal(Model.autoResumeAfterLimitCheck({ threadId: 'th', turnId: 't2', current: 'th', state: failedLastTurn(), composer: { text: '\n\n' } }).fire, true);
  assert.deepEqual(Model.autoResumeComposerState({ text: '', attachments: [{}] }, { bashMode: false }),
    { restoredFromError: false, isEmpty: true, isBashMode: false, hasDraft: true, hasComposerAttachments: true });
});

test('auto-resume in zh-CN: the status and the message in the UI language', () => {
  I18n.setLocale('zh-CN');
  try {
    const { deps, log, flush } = autoHarness();
    Model.runAutoResumeAfterLimit(deps);
    flush();
    assert.deepEqual(log.slice(1, 3), [['announce', '额度已重置——正在继续会话'], ['sendPrompt', '你工作时我的用量达到了上限，现在已经重置。请从中断的地方继续。']]);
    assert.equal(Model.afterUsageLimitText(), '你工作时我的用量达到了上限，现在已经重置。请从中断的地方继续。');
  } finally { I18n.setLocale('en-US'); }
  assert.equal(Model.afterUsageLimitText(), AFTER_LIMIT);
  assert.deepEqual(Model.nextResumeAnnouncement(null, 'x', 'th'), { text: 'x', seq: 1, threadId: 'th' });
  assert.deepEqual(Model.nextResumeAnnouncement({ text: 'x', seq: 1, threadId: 'th' }, 'x', 'th'), { text: 'x', seq: 2, threadId: 'th' });
});

// ---------------------------------------------------------------- the sr-only status (A_ / j_)
function fakeDom() {
  const timers = new Map();
  let next = 1;
  const document = { nodeType: 9, nodeName: '#document', activeElement: null, addEventListener() {}, removeEventListener() {} };
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), style: {} }); }
    get firstChild() { return this.childNodes[0] ?? null; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    addEventListener() {} removeEventListener() {}
  }
  Object.assign(document, { createElement: tag => new Element(tag), createTextNode: text => ({ nodeType: 3, nodeName: '#text', nodeValue: text, textContent: text, ownerDocument: document, parentNode: null }) });
  document.body = new Element('body');
  // ge(e): the status's own window; its timers are held here and run on demand.
  const window = { document, HTMLIFrameElement: class {}, setTimeout: (fn, ms) => { const id = next++; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id) };
  document.defaultView = window;
  return { document, window, Element, timers, run: () => { const due = [...timers.values()]; timers.clear(); due.forEach(timer => timer.fn()); return due.map(timer => timer.ms); } };
}

test('SourceAutoResumeStatus: the original sr-only status span, emptied then filled 50 ms later on each announcement', async () => {
  assert.equal(renderToStaticMarkup(h(Status.SourceAutoResumeStatus, { announcement: null })), '<span role="status" class="sr-only select-none"></span>');
  const dom = fakeDom();
  const saved = ['window', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', { value: dom.document, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  try {
    act(() => root.render(h(Status.SourceAutoResumeStatus, { announcement: null })));
    const span = container.childNodes[0];
    assert.equal(span.tagName, 'SPAN');
    assert.equal(span.getAttribute('role'), 'status');
    assert.equal(span.getAttribute('class'), 'sr-only select-none');
    assert.equal(span.textContent, '');
    assert.equal(dom.timers.size, 0);
    const first = Model.nextResumeAnnouncement(null, 'Limits reset — resuming session', 'th');
    act(() => root.render(h(Status.SourceAutoResumeStatus, { announcement: first })));
    assert.equal(span.textContent, '', 'emptied first');
    assert.deepEqual(dom.run(), [50]);
    assert.equal(span.textContent, 'Limits reset — resuming session');
    // The same text again (seq + 1) is announced again: emptied, then filled.
    act(() => root.render(h(Status.SourceAutoResumeStatus, { announcement: Model.nextResumeAnnouncement(first, first.text, 'th') })));
    assert.equal(span.textContent, '');
    dom.run();
    assert.equal(span.textContent, 'Limits reset — resuming session');
    // Another session (main.jsx passes null for it): emptied, nothing scheduled.
    act(() => root.render(h(Status.SourceAutoResumeStatus, { announcement: null })));
    assert.equal(span.textContent, '');
    assert.equal(dom.timers.size, 0);
  } finally {
    act(() => root.unmount());
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});

// ---------------------------------------------------------------- main.jsx wiring, read as an AST
const mainSource = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
const mainAst = parseAst(mainSource, { lang: 'jsx' }, 'src/main.jsx');
const text = node => mainSource.slice(node.start, node.end);
function findAll(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (typeof node.type === 'string' && predicate(node)) out.push(node);
  for (const key of Object.keys(node)) if (key !== 'parent') findAll(node[key], predicate, out);
  return out;
}
const propsOf = call => Object.fromEntries(call.arguments[0].properties.map(p => [p.key.name, p.value ? text(p.value) : p.key.name]));

test('main.jsx: retryFailedTurn only wires retryFailedTurnFlow; both cards drop the text-only input requirement', () => {
  const [fn] = findAll(mainAst, n => n.type === 'FunctionDeclaration' && n.id?.name === 'retryFailedTurn');
  assert.ok(fn);
  assert.equal(fn.body.body.length, 1);
  const [call] = findAll(fn, n => n.type === 'CallExpression' && n.callee.name === 'retryFailedTurnFlow');
  const props = propsOf(call);
  assert.deepEqual(Object.keys(props), ['threadId', 'turnId', 'thread', 'blocked', 'ensureResumed', 'continueTurn', 'rpc', 'turnOptions', 'readState', 'readComposer',
    'setError', 'clearThreadError', 'setTurnRequested', 'focusComposer', 'submitComposer', 'sendPrompt', 'refillComposer']);
  assert.equal(props.threadId, 'current');
  assert.equal(props.clearThreadError, '(id) => dispatch({ type: "clear-error", id })');
  assert.equal(props.blocked, 'loading || sending || running || actionPending || !boot?.connected || !!session?.archived');
  assert.equal(props.continueTurn, 'boot?.core?.capabilities?.continueTurn === true');
  assert.equal(props.readState, '() => latestState.current');
  assert.equal(props.readComposer, '() => liveComposer.current');
  assert.equal(props.focusComposer, '() => scheduleComposerFocus(textarea.current)');
  assert.equal(props.sendPrompt, '(text) => sendMessage(text, [], [])');
  assert.equal(props.refillComposer, '(text) => setDraft(text)');
  assert.equal(props.submitComposer, '() => send()');
  const canRetry = findAll(mainAst, n => n.type === 'VariableDeclarator' && n.id?.name === 'canRetry');
  assert.equal(canRetry.length, 2);
  for (const declarator of canRetry) assert.doesNotMatch(text(declarator), /retryInput/);
  const retries = findAll(mainAst, n => n.type === 'CallExpression' && n.callee.name === 'retryFailedTurn').map(text);
  // R4i-cowork (CW3, review fix): a Cowork session's Me (sessionCtx.retry) is this Try again of its last turn
  // (cowork-session-actions.mjs coworkSessionHost retryTurn).
  assert.deepEqual(retries, ['retryFailedTurn(turnId, { thread: true })', 'retryFailedTurn(item.turnId)', 'retryFailedTurn(lastTurnId, { thread: true })']);
});

test('main.jsx: the autoResume timer keeps its arming and clock and fires runAutoResumeAfterLimit (never retryFailedTurn)', () => {
  const [assign] = findAll(mainAst, n => n.type === 'AssignmentExpression' && text(n.left) === 'autoResumeFire.current');
  const [call] = findAll(assign.right, n => n.type === 'CallExpression' && n.callee.name === 'runAutoResumeAfterLimit');
  const props = propsOf(call);
  assert.equal(props.readCurrent, '() => currentRef.current');
  assert.equal(props.readState, '() => latestState.current');
  assert.equal(props.readComposer, '() => liveComposer.current');
  assert.equal(props.sendPrompt, '(text) => sendMessage(text, [], [])');
  assert.equal(props.bashMode, '(composer) => shellModeActive(composer?.text, boot?.core, shellOptions)');
  assert.equal(props.announce, '(text) => setResumeAnnouncement((value) => nextResumeAnnouncement(value, text, pending.threadId))');
  assert.equal(props.clearError, '(id) => { setError(""); dispatch({ type: "clear-error", id }); }', 'N_\'s n_(K): the composer error line and the session\'s error');
  const [timer] = findAll(mainAst, n => n.type === 'CallExpression' && n.callee.name === 'setTimeout' && /autoResume/.test(text(n)));
  assert.equal(text(timer.arguments[1]), 'Math.max(0, autoResume.at - Date.now()) + 5000', 'reset time + 5 s, unchanged');
  assert.match(text(timer.arguments[0]), /setAutoResume\(null\); if \(currentRef\.current === pending\.threadId\) autoResumeFire\.current\?\.\(pending\);/);
  assert.doesNotMatch(text(timer.arguments[0]), /retryFailedTurn/);
  // The status sits right before the composer, scoped to the session it was announced for.
  const [status] = findAll(mainAst, n => n.type === 'JSXElement' && n.openingElement.name.name === 'SourceAutoResumeStatus');
  assert.equal(text(status.openingElement.attributes[0].value.expression), 'resumeAnnouncement?.threadId === current ? resumeAnnouncement : null');
  const index = mainSource.indexOf(text(status));
  // Official cc43287c9: the sr-only span (ref A_) is followed by Nte, whose Mte draws the turn box region ahead of the
  // composer card; the host renders that region (R4g-turnbox TB-3) between the status and the composer.
  const after = mainSource.slice(index + text(status).length);
  const composerAt = after.indexOf('{renderMainComposer()}');
  assert.ok(composerAt > 0);
  assert.match(after.slice(0, composerAt), /^\s*(\{\/\*[\s\S]*?\*\/\}\s*)?\{turnBoxSession && <SourceTurnBoxRegion [\s\S]*?\/>\}\s*$/);
});
