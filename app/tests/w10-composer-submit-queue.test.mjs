import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createEditorSubmitQueue, heldStartReleaseWaits, heldSubmitQueued, heldTextStep, releaseHeldSubmitStep, trackHeldStartText } from '../src/composer-submit-queue.mjs';
import { settleHeldStart, holdStartWhileBranchCheck } from '../src/r4h-glue-decisions.mjs';

// w10-shell-submit-queue: the composer's submit queues (3.6556.2 c227f4d5e-B-FYKrwT.js wF; the same logic as 2.42304.0
// c227f4d5e OP), read from the shipped text only (never executed).
const officialV3 = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
const officialV2 = new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/', import.meta.url);
const occurrences = (text, needle) => text.split(needle).length - 1;

test('3.6556.2: the composer handle queues a submit until its editor exists, and holds one behind a hold or a send', async () => {
  const composer = await fs.readFile(new URL('c227f4d5e-B-FYKrwT.js', officialV3), 'utf8');
  for (const needle of [
    'submit:(e,t)=>Z||!t?hs(e):(co.current={...t,opts:e,storeKey:o},!0),releaseQueuedSubmit:gs,dropQueuedSubmit:en,',
    'let e=co.current,t=e?.storeKey===o;!e||t&&!Z||(co.current=null,t&&Z!==null&&e.text===Wl(xM(Z))&&hs(e.opts)||e.onLost())',
    'lo=()=>()=>{so(),co.current?.onLost()}',
    'if(Qe||Yt.current)return e?.machineSend||Z.isEmpty&&!tn.current?!1:(Xt.current={opts:{...e,keptPress:',
    'Xt.current!==null&&Xt.current.text!==e&&en()',
    'en=J0($,20)?K0($,20,()=>{Xt.current!==null&&(Xt.current=null,Qt(!1))})',
    'let e=Xt.current;e===null||e.targetKey!==$e||zt.current||Yt.current||(en(),hs(e.opts))',
    'if(t.targetKey!==$e){en();return}!Qe&&!e&&!Rt&&gs()',
    'Is=Zt||it',
  ]) assert.equal(occurrences(composer, needle), 1, needle);
  // The only queued caller: the fork draft's auto-send (cc43287c9), gated by the draft store's one-shot autoSubmit
  // (shared-1 AT) and reporting the fork prompt outcome (c68c4283d) when lost.
  const draft = await fs.readFile(new URL('cc43287c9-Me-M2ucD.js', officialV3), 'utf8');
  for (const needle of ['if(!ce||!$n(r))return;let e={logged:!1},t=yy(e),n={text:ce,onLost:t};Xo.current?.submit({forkAutoSend:e},n)||t()',
    'cy||Xo.current?.releaseQueuedSubmit()'])
    assert.equal(occurrences(draft, needle), 1, needle);
  assert.equal(occurrences(draft, '.submit({forkAutoSend:'), 1, 'one queued caller');
  const store = await fs.readFile(new URL('shared-1-BJhqMmkf.js', officialV3), 'utf8');
  assert.equal(occurrences(store, 'return t?.autoSubmit?(t.autoSubmit=!1,!0):!1'), 1);
  const telemetry = await fs.readFile(new URL('c68c4283d-CWbOoVxS.js', officialV3), 'utf8');
  assert.equal(occurrences(telemetry, 'claudeai.code.fork.prompt_outcome'), 1);
});

test('2.42304.0 had the same queues (unchanged logic across the versions)', async () => {
  const composer = await fs.readFile(new URL('c227f4d5e-Ba-r--Rl.js', officialV2), 'utf8');
  for (const needle of ['submit:(e,t)=>X||!t?Mi(e):($r.current={...t,opts:e,storeKey:o},!0)', 'pt.current!==null&&pt.current.text!==e&&gt()',
    'let e=$r.current,t=e?.storeKey===o;!e||t&&!X||($r.current=null,t&&X!==null&&e.text===Xl(Lj(X))&&Mi(e.opts)||e.onLost())'])
    assert.equal(occurrences(composer, needle), 1, needle);
});

test('editor queue: submit goes out at once with an editor or without a queued payload, else waits for the editor', () => {
  const sent = [];
  const queue = createEditorSubmitQueue({ submitNow: (opts) => { sent.push(opts); return true; } });
  assert.equal(queue.submit({ a: 1 }, { text: 'hi', onLost() {} }, { editorReady: true, storeKey: 'k' }), true);
  assert.equal(queue.submit({ a: 2 }, undefined, { editorReady: false, storeKey: 'k' }), true);
  assert.deepEqual(sent, [{ a: 1 }, { a: 2 }]);
  assert.equal(queue.pending, null);
  let lost = 0;
  assert.equal(queue.submit({ fork: true }, { text: 'fork prompt', onLost: () => { lost += 1; } }, { editorReady: false, storeKey: 'k' }), true);
  assert.deepEqual(queue.pending, { text: 'fork prompt', onLost: queue.pending.onLost, opts: { fork: true }, storeKey: 'k' });
  assert.equal(queue.editorChanged({ editorReady: false, storeKey: 'k', editorText: '' }), 'wait');
  assert.equal(queue.editorChanged({ editorReady: true, storeKey: 'k', editorText: 'fork prompt' }), 'sent');
  assert.deepEqual(sent.at(-1), { fork: true });
  assert.equal(lost, 0);
  assert.equal(queue.editorChanged({ editorReady: true, storeKey: 'k', editorText: 'fork prompt' }), 'none');
});

test('editor queue: another key, other text, a refused submit or unmounting loses it (onLost)', () => {
  let accept = true;
  const sent = [];
  const queue = createEditorSubmitQueue({ submitNow: (opts) => { sent.push(opts); return accept; } });
  const lostLog = [];
  const queued = (name) => ({ text: 'p', onLost: () => lostLog.push(name) });
  queue.submit({}, queued('key'), { editorReady: false, storeKey: 'a' });
  assert.equal(queue.editorChanged({ editorReady: false, storeKey: 'b', editorText: '' }), 'lost', 'key changed before the editor');
  queue.submit({}, queued('text'), { editorReady: false, storeKey: 'a' });
  assert.equal(queue.editorChanged({ editorReady: true, storeKey: 'a', editorText: 'edited' }), 'lost', 'editor holds other text');
  accept = false;
  queue.submit({}, queued('refused'), { editorReady: false, storeKey: 'a' });
  assert.equal(queue.editorChanged({ editorReady: true, storeKey: 'a', editorText: 'p' }), 'lost', 'hs refused');
  queue.submit({}, queued('unmount'), { editorReady: false, storeKey: 'a' });
  assert.equal(queue.unmount(), 'lost');
  assert.equal(queue.unmount(), 'none');
  assert.deepEqual(lostLog, ['key', 'text', 'refused', 'unmount']);
  assert.equal(sent.length, 1, 'only the refused one reached hs');
});

test('held submit: the text drop (Xt.text !== e → en) and the release gate (gs)', () => {
  assert.equal(heldTextStep({ held: null, text: 'x' }), 'none');
  assert.equal(heldTextStep({ held: { key: 'k' }, text: 'x' }), 'stamp');
  assert.equal(heldTextStep({ held: { key: 'k', text: 'x' }, text: 'x' }), 'keep');
  assert.equal(heldTextStep({ held: { key: 'k', text: 'x' }, text: 'xy' }), 'drop');
  assert.equal(releaseHeldSubmitStep({ held: null, key: 'k' }), 'none');
  assert.equal(releaseHeldSubmitStep({ held: { targetKey: 'j' }, key: 'k' }), 'wait');
  assert.equal(releaseHeldSubmitStep({ held: { targetKey: 'k' }, key: 'k', disabled: true }), 'wait');
  assert.equal(releaseHeldSubmitStep({ held: { targetKey: 'k' }, key: 'k', inFlight: true }), 'wait');
  assert.equal(releaseHeldSubmitStep({ held: { targetKey: 'k' }, key: 'k' }), 'release');
  assert.equal(heldSubmitQueued({ current: null }), false);
  assert.equal(heldSubmitQueued({ current: { key: 'k' } }), true);
});

// The host's held Home start (main.jsx: send → holdStartWhileBranchCheck; the effect added here; settleHeldStart).
function hostHold() {
  const heldStart = { current: null };
  const sent = [];
  let revision = 0;
  holdStartWhileBranchCheck({ current: null, pending: true, priority: 'later', key: 'K', heldStart, bumpHeldStart: () => { revision += 1; } });
  return { heldStart, sent, get revision() { return revision; }, send: async (opts) => { sent.push(opts); } };
}

test('host: an edit while the start is held drops it; the unchanged draft goes out once the check settles', () => {
  const edited = hostHold();
  assert.equal(edited.revision, 1);
  assert.equal(trackHeldStartText({ heldStart: edited.heldStart, text: 'start this' }), 'stamp');
  assert.equal(settleHeldStart({ heldStart: edited.heldStart, pending: true, key: 'K', branchSwitch: null, send: edited.send }), 'wait');
  assert.equal(trackHeldStartText({ heldStart: edited.heldStart, text: 'start this!' }), 'drop');
  assert.equal(settleHeldStart({ heldStart: edited.heldStart, pending: false, key: 'K', branchSwitch: null, send: edited.send }), 'none');
  assert.deepEqual(edited.sent, [], 'the edited draft stays unsent');

  const kept = hostHold();
  trackHeldStartText({ heldStart: kept.heldStart, text: 'start this' });
  assert.equal(trackHeldStartText({ heldStart: kept.heldStart, text: 'start this' }), 'keep');
  assert.equal(settleHeldStart({ heldStart: kept.heldStart, pending: false, key: 'K', branchSwitch: null, send: kept.send }), 'release');
  assert.deepEqual(kept.sent, [{ priority: 'later' }]);
  assert.equal(trackHeldStartText({ heldStart: kept.heldStart, text: '' }), 'none', 'nothing held after the release');
});

test('host wiring: main.jsx stamps / drops the held start on draft edits before the settle effect', async () => {
  const jsx = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  // w11-submit-queue-wiring widened the import and made a drop re-render the busy Send (bumpHeldStart).
  assert.equal(occurrences(jsx, 'import { createEditorSubmitQueue, dropHeldSubmit, heldStartReleaseWaits, heldSubmitQueued, holdSubmitWhileInFlight, trackHeldStartText } from "./composer-submit-queue.mjs";'), 1);
  const track = '    if (trackHeldStartText({ heldStart, text: draft }) === "drop") bumpHeldStart();\n  }, [draft, heldRevision]);';
  const settle = 'settleHeldStart({ heldStart, pending: startBranchCheckPending(), key: heldStartKeyNow(), branchSwitch, send });';
  assert.equal(occurrences(jsx, track), 1);
  assert.equal(occurrences(jsx, settle), 1);
  assert.ok(jsx.indexOf(track) < jsx.indexOf(settle), 'the text is stamped before the settle effect looks at the held start');
  assert.ok(jsx.indexOf('const heldStart = useRef(null)') < jsx.indexOf(track));
  assert.ok(jsx.indexOf('[draft, setDraft] = useState("")') < jsx.indexOf(track));
});

// Review fix: gs's own gate (zt.current disabled, Yt.current in flight) and the effect that re-runs it.
test('3.6556.2: gs waits while the composer is disabled or a send is in flight; the hold effect re-runs it', async () => {
  const composer = await fs.readFile(new URL('c227f4d5e-B-FYKrwT.js', officialV3), 'utf8');
  for (const needle of [
    'e===null||e.targetKey!==$e||zt.current||Yt.current||(en(),hs(e.opts))',
    'zt.current=Rt',
    'if(t.targetKey!==$e){en();return}',
    '!Qe&&!e&&!Rt&&gs()',
    'Xt.current!==null&&v?.()',
  ]) assert.equal(occurrences(composer, needle), 1, needle);
  const parent = await fs.readFile(new URL('cc43287c9-Me-M2ucD.js', officialV3), 'utf8');
  assert.equal(occurrences(parent, 'cy||Xo.current?.releaseQueuedSubmit()'), 1);
});

test('host: a settled held start waits while disabled or in flight, then goes out; drops are never held back', () => {
  const waits = (heldStart, over = {}) => heldStartReleaseWaits({ heldStart, pending: false, key: 'K', branchSwitch: null, ...over });
  assert.equal(heldStartReleaseWaits({ heldStart: { current: null }, key: 'K', disabled: true }), false, 'nothing held');

  const offline = hostHold();
  trackHeldStartText({ heldStart: offline.heldStart, text: 'start this' });
  assert.equal(waits(offline.heldStart, { pending: true, disabled: true }), false, 'still checking: settleHeldStart says wait itself');
  assert.equal(waits(offline.heldStart, { disabled: true }), true, 'disabled: the release waits');
  assert.equal(waits(offline.heldStart, { inFlight: true }), true, 'a send in flight: the release waits');
  assert.ok(offline.heldStart.current, 'the held start is kept while it waits');
  assert.equal(waits(offline.heldStart), false);
  assert.equal(settleHeldStart({ heldStart: offline.heldStart, pending: false, key: 'K', branchSwitch: null, send: offline.send }), 'release');
  assert.deepEqual(offline.sent, [{ priority: 'later' }]);

  const moved = hostHold();
  assert.equal(waits(moved.heldStart, { key: 'J', disabled: true }), false, 'a key change drops it even while disabled');
  assert.equal(settleHeldStart({ heldStart: moved.heldStart, pending: false, key: 'J', branchSwitch: null, send: moved.send }), 'drop');
  const dialog = hostHold();
  assert.equal(waits(dialog.heldStart, { branchSwitch: { open: true }, inFlight: true }), false, 'the dirty-tree drop is not held back');
});

test('host wiring: the settle effect checks the gate first and re-runs on connected / loading / sending / actionPending', async () => {
  const jsx = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const gate = '    if (heldStartReleaseWaits({ heldStart, pending: startBranchCheckPending(), key: heldStartKeyNow(), branchSwitch, disabled: !boot?.connected || loading, inFlight: sending || actionPending })) return;\n    settleHeldStart({ heldStart, pending: startBranchCheckPending(), key: heldStartKeyNow(), branchSwitch, send });\n    if (held && !heldStart.current) bumpHeldStart();\n  }, [branchCheck, heldRevision, branchSwitch, workspaceInfo?.branch, workdir, current, worktree, boot?.connected, loading, sending, actionPending]);';
  assert.equal(occurrences(jsx, gate), 1);
  // The deps array reads these during render: each is declared above the effect (no TDZ).
  for (const decl of ['const [boot, setBoot] = useState(null)', '[sending, setSending] = useState(false)', '[loading, setLoading] = useState(false)', 'const actionPending = operationPending(operation);'])
    assert.ok(jsx.indexOf(decl) >= 0 && jsx.indexOf(decl) < jsx.indexOf(gate), decl);
});
