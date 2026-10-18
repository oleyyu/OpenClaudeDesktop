// R4f-error E5 (transcript-09, WI-5): the host's projection of a Codex thread onto the 2.42304.0 error-card retry decision's
// inputs (cee72b629 f `sz` and cc43287c9 b_'s composer argument), and state.js's thread-wide errorKilledTurn. The decision
// itself is the generated original (generated/retry-decision, E4). Nothing here sends a turn, renders or reads a real session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE, t as translate } from '../electron/i18n/index.mjs';
import { emptyState, reduce } from '../src/state.js';
import { decideErrorRetry, lastTurnFailed } from '../src/generated/retry-decision/retry-decision.mjs';
import { lastTerminalRowIndex, pendingPromptUuid, isFailedTerminalRow, isTerminalRow, isHumanPromptRow }
  from '../src/generated/retry-decision/transcript-rows.mjs';
import { RETRY_ASSISTANT_ITEM_TYPES, projectRetryMessages, lastRetryPrompt, retryTurnState, composerRetryInput, retryNudgeText,
  retryCannedNudges, retryNudgeInput, errorCardRetryDecision } from '../src/retry-turn-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const official = name => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

// Codex v2 ThreadItem rows as state.js keeps them (every item tagged with its turnId).
const user = (turnId, text = 'Fix the failing test', extra = []) =>
  ({ id: `u-${turnId}`, type: 'userMessage', turnId, content: [{ type: 'text', text, text_elements: [] }, ...extra] });
const agent = (turnId, n = 1) => ({ id: `a-${turnId}-${n}`, type: 'agentMessage', turnId, text: 'Working on it' });
const command = turnId => ({ id: `c-${turnId}`, type: 'commandExecution', turnId, command: 'npm test', status: 'failed' });
const failure = { message: 'stream disconnected before completion', codexErrorInfo: 'responseStreamDisconnected', additionalDetails: null };
const thread = (events, state = emptyState) => events.reduce((next, event) => reduce(next, { event }), state);
const started = turn => ({ method: 'turn/started', params: { threadId: 'th', turn: { id: turn } } });
const itemDone = (turn, item) => ({ method: 'item/completed', params: { threadId: 'th', turnId: turn, item } });
const threadError = message => ({ method: 'error', params: { threadId: 'th', turnId: '', willRetry: false, error: { message, codexErrorInfo: 'other' } } });
const completed = (turn, error = null) => ({ method: 'turn/completed', params: { threadId: 'th', turn: { id: turn, status: error ? 'failed' : 'completed', error } } });

test('E5 official: the inputs this model projects, in 2.42304.0', () => {
  const decision = official('cee72b629-k4HYmvQy.js');
  for (const text of ['conversationLost:t.shownCategory==="cli_resume_not_found",lastPrompt:t.desktopSession&&a(n,t.canned)||void 0',
    'import{l as a}from"./cc8941b7b-CZT9QwXr.js"', 'function f(e,t){let n=e.messages.getSnapshot();return{error:e.error,errorKilledTurn:e.errorKilledTurn,errorRejectedPrompt:e.errorRejectedPrompt,heldInput:e.heldInput,messages:n,'])
    assert.equal(count(decision, text), 1, text);
  const session = official('cc43287c9-DAfOi8yP.js');
  for (const text of ['n=(t&&sz(t,{desktopSession:qF(G),shownCategory:Hg,canned:MN(V)}))??oz(zg?.restoredDraft)',
    'a=lz(n,{text:r.getText(),isEmpty:!r.hasDraft()})'])
    assert.equal(count(session, text), 1, text);
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  for (const text of ['hasDraft:()=>!(e()?.isEmpty??!0)||_t.current', 'hasAttachments:ne=!1', '_t=T(ne)'])
    assert.equal(count(composer, text), 1, text);
  const store = official('c06cf64bb-BE5q2vSr.js');
  for (const text of ['errorKilledTurn:t.pendingTurn!==null||t.errorKilledTurn||n.errorCategory==="remote_process_killed"',
    'case"error_cleared":return t.error!==null&&t.errorRejectedPrompt!==null?t:{...t,error:null,errorCategory:null,tccFolderKind:null,sshFailureReason:null,errorKilledTurn:!1}'])
    assert.equal(count(store, text), 1, text);
  const prompts = official('cc8941b7b-CZT9QwXr.js');
  for (const text of ['lastPromptToSendAgain threw', 'qt as l', 'if(!s.trim()||t.includes(s.trim()))return null;let l=Date.parse(n.timestamp??"")'])
    assert.equal(count(prompts, text), 1, text);
});

test('E5 projection: each turn ends in a terminal row the official scans read; a running turn has none', () => {
  const items = [user('t1'), agent('t1'), command('t1'), agent('t1', 2), user('t2'), agent('t2'), user('t3')];
  const rows = projectRetryMessages(items, { t2: failure }, { active: 't3' });
  assert.deepEqual(rows.map(row => row.type === 'result' ? `result:${row.is_error}` : row.type),
    ['user', 'assistant', 'assistant', 'assistant', 'result:false', 'user', 'assistant', 'result:true', 'user']);
  // Self-check with the generated shared-104 predicates: users are human prompts, results are terminal rows.
  assert.deepEqual(rows.map(row => isHumanPromptRow(row)), rows.map(row => row.type === 'user'));
  assert.deepEqual(rows.map(row => isTerminalRow(row)), rows.map(row => row.type === 'result'));
  assert.equal(rows[0].uuid, 'u-t1');
  assert.deepEqual(rows[0].message, { content: [{ type: 'text', text: 'Fix the failing test' }] });
  // The running t3's prompt is met before any terminal row: sC is null and oC finds the waiting prompt (E4 correction 2).
  assert.equal(lastTerminalRowIndex(rows), null);
  assert.equal(pendingPromptUuid(rows), 'u-t3');
  assert.equal(lastTurnFailed(rows), true);
  // Without the active turn, t2's failed result is the last terminal row.
  const settled = projectRetryMessages(items.slice(0, 6), { t2: failure });
  assert.equal(lastTerminalRowIndex(settled), settled.length - 1);
  assert.equal(isFailedTerminalRow(settled.at(-1)), true);
  // A killed turn without a TurnError of its own also ends failed; items without a turnId are not rows.
  const killed = projectRetryMessages([user('t1'), agent('t1'), { id: 'x', type: 'agentMessage' }], {}, { killedTurnId: 't1' });
  assert.deepEqual(killed, [{ type: 'user', uuid: 'u-t1', message: { content: [{ type: 'text', text: 'Fix the failing test' }] } }, { type: 'assistant' },
    { type: 'result', is_error: true }]);
  // Image inputs are image blocks (never tool_result); non-agent rows (hookPrompt, contextCompaction) add nothing.
  const image = projectRetryMessages([user('t1', 'see', [{ type: 'localImage', path: '/tmp/x.png' }, { type: 'mention', name: 'a', path: 'b' }]),
    { id: 'h', type: 'hookPrompt', turnId: 't1' }, { id: 'k', type: 'contextCompaction', turnId: 't1' }], {});
  assert.deepEqual(image, [{ type: 'user', uuid: 'u-t1', message: { content: [{ type: 'text', text: 'see' }, { type: 'image' }] } },
    { type: 'result', is_error: false }]);
  assert.equal(isHumanPromptRow(image[0]), true);
  assert.ok(RETRY_ASSISTANT_ITEM_TYPES.includes('agentMessage') && !RETRY_ASSISTANT_ITEM_TYPES.includes('userMessage'));
  assert.deepEqual(projectRetryMessages(null, null), []);
});

test('E5 turn card: a failed last turn nudges, beside a draft when the composer holds one', () => {
  const items = [user('t1'), agent('t1'), user('t2'), command('t2')];
  const turnErrors = { t2: failure };
  const state = retryTurnState(items, turnErrors, { turnId: 't2' });
  assert.equal(state.error, failure.message);
  assert.equal(state.errorKilledTurn, true);
  assert.equal(state.errorRejectedPrompt, null);
  assert.deepEqual(state.heldInput, []);
  assert.equal(state.desktopSession, true);
  assert.equal(state.conversationLost, false);
  const decide = fields => errorCardRetryDecision({ items, turnErrors, turnId: 't2', ...fields });
  assert.equal(decide({ draft: '' }), 'nudge');
  assert.equal(decide({ draft: '\n\n' }), 'nudge'); // tiptap isEmpty: only empty paragraphs
  assert.equal(decide({ draft: 'one more thing' }), 'nudgeBesideDraft');
  assert.equal(decide({ draft: ' ' }), 'nudgeBesideDraft'); // a paragraph holding a space is not empty
  assert.equal(decide({ draft: '', attachments: [{ path: '/tmp/a.png' }] }), 'nudgeBesideDraft');
  // The nudge needs no original input: a turn whose prompt carried an image (retryInput null) still nudges.
  const withImage = [user('t1', 'look', [{ type: 'localImage', path: '/tmp/x.png' }])];
  assert.equal(errorCardRetryDecision({ items: withImage, turnErrors: { t1: failure }, turnId: 't1' }), 'nudge');
  // A failure before any agent output still ends the turn failed.
  assert.equal(errorCardRetryDecision({ items: [user('t1')], turnErrors: { t1: failure }, turnId: 't1' }), 'nudge');
  // A card for an older failure (the latest turn finished fine) finds nothing to resume: focus.
  assert.equal(errorCardRetryDecision({ items, turnErrors: { t1: failure }, turnId: 't1' }), 'focus');
  // A turn card with no TurnError is no error at all, and the last turn succeeded.
  assert.equal(errorCardRetryDecision({ items, turnErrors: {}, turnId: 't2' }), 'focus');
});

test('E5 thread card: errorKilledTurn comes from state.js (was a turn running when the error arrived)', () => {
  // Thread-wide error while t2 runs: killed, the running turn has no terminal row, so its prompt is still unanswered.
  let state = thread([started('t1'), itemDone('t1', user('t1')), itemDone('t1', agent('t1')), completed('t1'),
    started('t2'), itemDone('t2', user('t2', 'Now the docs')), threadError('connection reset')]);
  assert.equal(state.errors.th.message, 'connection reset');
  assert.equal(state.errorKilledTurn.th, true);
  const card = (s, draft = '') => errorCardRetryDecision({ items: s.items.th, turnErrors: s.turnErrors.th || {}, threadError: s.errors.th,
    killedTurn: s.errorKilledTurn?.th, active: s.active.th, draft });
  assert.equal(card(state), 'nudge');
  assert.equal(card(state, 'wait'), 'nudgeBesideDraft');
  // c06cf64bb keeps errorKilledTurn across a second error (t.errorKilledTurn) while the first is still shown.
  state = { ...state, active: { ...state.active, th: null } };
  state = thread([threadError('still down')], state);
  assert.equal(state.errorKilledTurn.th, true);
  // No turn running and nothing shown before: the error killed nothing, so Try again only focuses the composer.
  let idle = thread([started('t1'), itemDone('t1', user('t1')), itemDone('t1', agent('t1')), completed('t1'), threadError('config reload failed')]);
  assert.equal(idle.errorKilledTurn.th, false);
  assert.equal(card(idle), 'focus');
  assert.equal(card(idle, 'draft'), 'focus');
  // turn/started clears errors[id] (not the flag); a later idle error no longer inherits the old killed flag.
  idle = thread([started('t2')], state);
  assert.equal(idle.errors.th, null);
  assert.equal(idle.errorKilledTurn.th, true);
  idle = thread([threadError('again')], { ...idle, active: { ...idle.active, th: null } });
  assert.equal(idle.errorKilledTurn.th, false);
  // turn/completed carrying an error without a turn identity (state.js only takes it when no other turn is active): it
  // ends the turn that was running, so that turn was killed (and is the latest).
  const noId = thread([itemDone('t1', user('t1')), itemDone('t1', agent('t1')),
    { method: 'turn/completed', params: { threadId: 'th', turn: { status: 'failed', error: { message: 'Lost' } } } }]);
  assert.equal(noId.errors.th.message, 'Lost');
  assert.equal(noId.errorKilledTurn.th, true);
  assert.equal(noId.active.th, null);
  assert.deepEqual(retryTurnState(noId.items.th, {}, { threadError: noId.errors.th, killedTurn: true }).messages.at(-1), { type: 'result', is_error: true });
  assert.equal(card(noId), 'nudge');
  // A clean turn/completed clears both.
  const clean = thread([completed('t2')], { ...noId, active: { th: 't2' } });
  assert.equal(clean.errors.th, null);
  assert.equal(clean.errorKilledTurn.th, false);
  // retryTurnState: no thread error means no error, whatever killedTurn says.
  assert.equal(retryTurnState([user('t1')], {}, { killedTurn: true }).error, null);
  assert.equal(retryTurnState([user('t1')], {}, { killedTurn: true }).errorKilledTurn, false);
});

test('E5 lastPrompt: cc8941b7b qt on the last userMessage, skipping the canned nudges', () => {
  const items = [user('t1', 'Fix the failing test'), agent('t1')];
  assert.deepEqual(lastRetryPrompt(items, []), { uuid: 'u-t1', text: 'Fix the failing test', sentAt: undefined, whole: true });
  assert.equal(lastRetryPrompt([user('t1', 'look', [{ type: 'localImage', path: '/tmp/x.png' }])], []).whole, false);
  assert.equal(lastRetryPrompt([user('t1', '   ')], []), undefined);
  assert.equal(lastRetryPrompt([agent('t1')], []), undefined);
  assert.equal(lastRetryPrompt([{ type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'x' }] }], []), undefined); // no uuid
  const canned = retryCannedNudges(translate);
  assert.equal(lastRetryPrompt([user('t1'), user('t2', 'Try again')], canned), undefined);
  assert.deepEqual(retryTurnState([user('t1', 'Try again')], { t1: failure }, { turnId: 't1', canned }).lastPrompt, undefined);
  setLocale('zh-CN');
  try {
    const zh = retryCannedNudges();
    assert.equal(zh[0], '重试');
    assert.equal(zh[3], 'Try again');
    assert.equal(lastRetryPrompt([user('t1', '重试')], zh), undefined);
    assert.equal(lastRetryPrompt([user('t1', 'Try again')], zh), undefined);
  } finally { setLocale(DEFAULT_LOCALE); }
});

test('E5 unreachable outcomes stay unreachable on the host projection; the original still decides them', () => {
  // The host's answers never pick resend / deliver / repeatPrompt / refillPrompt, even with a prompt that would qualify.
  const items = [user('t1'), agent('t1')];
  const state = retryTurnState(items, { t1: failure }, { turnId: 't1' });
  for (const draft of ['', 'Fix the failing test', 'other'])
    assert.ok(['nudge', 'nudgeBesideDraft'].includes(decideErrorRetry(state, composerRetryInput(draft, []), 0)), draft);
  // With the original's fields set, the same projection reaches them: the projection does not hide the original's branches.
  assert.equal(decideErrorRetry({ ...state, errorRejectedPrompt: 'Fix' }, composerRetryInput('Fix', [])), 'resend');
  assert.equal(decideErrorRetry({ ...state, heldInput: ['x'] }, composerRetryInput('', [])), 'deliver');
  // Branch 3 also wants the last prompt unanswered (c: no assistant row after it), so it uses a turn that failed at once.
  assert.equal(decideErrorRetry({ ...state, conversationLost: true }, composerRetryInput('', [])), 'focus');
  const lost = { ...retryTurnState([user('t1')], { t1: failure }, { turnId: 't1' }), conversationLost: true };
  assert.equal(decideErrorRetry(lost, composerRetryInput('', [])), 'refillPrompt'); // sentAt undefined: never repeatPrompt
  assert.equal(decideErrorRetry({ ...lost, lastPrompt: { ...lost.lastPrompt, sentAt: 1000 } }, composerRetryInput('', []), 2000), 'repeatPrompt');
});

test('E5 composer input and the nudge text', () => {
  assert.deepEqual(composerRetryInput('', []), { text: '', isEmpty: true });
  assert.deepEqual(composerRetryInput(undefined, undefined), { text: '', isEmpty: true });
  assert.deepEqual(composerRetryInput('\n', []), { text: '\n', isEmpty: true });
  assert.deepEqual(composerRetryInput('hi', []), { text: 'hi', isEmpty: false });
  assert.deepEqual(composerRetryInput('', [{ path: 'a' }]), { text: '', isEmpty: false });
  assert.equal(retryNudgeText(), 'Try again');
  assert.equal(retryNudgeText(text => `<${text}>`), '<Try again>');
  setLocale('zh-CN');
  try { assert.equal(retryNudgeText(), '重试'); } finally { setLocale(DEFAULT_LOCALE); }
  assert.deepEqual(retryNudgeInput('Try again'), [{ type: 'text', text: 'Try again', text_elements: [] }]);
  assert.deepEqual(retryNudgeInput(undefined), [{ type: 'text', text: '', text_elements: [] }]);
  // The nudge reaches the transcript as a userMessage; a card after it reads it as canned, not as the prompt to resend.
  const after = [user('t1'), agent('t1'), user('t2', retryNudgeText())];
  assert.equal(retryTurnState(after, { t2: failure }, { turnId: 't2', canned: retryCannedNudges() }).lastPrompt, undefined);
  assert.equal(errorCardRetryDecision({ items: after, turnErrors: { t2: failure }, turnId: 't2' }), 'nudge');
});
