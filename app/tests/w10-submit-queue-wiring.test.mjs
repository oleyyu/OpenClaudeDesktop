import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  createEditorSubmitQueue, dropHeldSubmit, heldStartReleaseWaits, heldSubmitQueued, holdSubmitWhileInFlight,
  inFlightSubmitStep, trackHeldStartText,
} from '../src/composer-submit-queue.mjs';
import { settleHeldStart } from '../src/r4h-glue-decisions.mjs';

// w11-submit-queue-wiring (w10-shell-submit-queue-cont): the host call sites of the composer's submit queues
// (3.6556.2 c227f4d5e-B-FYKrwT.js wF, cc43287c9-Me-M2ucD.js its parent), read from the shipped text only (never executed).
const officialV3 = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
const occurrences = (text, needle) => text.split(needle).length - 1;
const read = (file) => fs.readFile(new URL(file, import.meta.url), 'utf8');

test('3.6556.2: a send in flight (Yt) holds other text, refuses its own text, and the busy Send is Zt || sendPending', async () => {
  const composer = await fs.readFile(new URL('c227f4d5e-B-FYKrwT.js', officialV3), 'utf8');
  for (const needle of [
    'Yt.current?.text===Wl(xM(Z))',                  // hs's refusal: the text in flight again
    'if(Qe||Yt.current)return e?.machineSend||Z.isEmpty&&!tn.current?!1:(Xt.current={opts:{...e,keptPress:',
    'let C={text:Wl(xM(Z))};return Yt.current=C',      // the send in flight
    'Yt.current===C&&(Yt.current=null)',               // …cleared when it is over
    'Xt.current!==null&&v?.()',                        // …and the parent asked to release the held one
    'it=z!==void 0&&z',                                // it = the sendPending prop
    'Is=Zt||it',
    'submitQueued:Is',
  ]) assert.equal(occurrences(composer, needle), 1, needle);
  const parent = await fs.readFile(new URL('cc43287c9-Me-M2ucD.js', officialV3), 'utf8');
  for (const needle of [
    'sendPending:x||a',
    '(!Ot||kt)&&M()&&u.current?.dropQueuedSubmit()',                // a failed send drops what is held
    'Fr()&&Xo.current?.dropQueuedSubmit()',                         // a failed start (:56265)
    'Fr()&&(Xo.current?.dropQueuedSubmit(),QM(Xo.current,e,t,n))',  // text put back (sc, the failed-send restore cc)
    'n={text:ce,onLost:t};Xo.current?.submit({forkAutoSend:e},n)||t()',
  ]) assert.equal(occurrences(parent, needle), 1, needle);
  assert.equal(occurrences(parent, 'dropQueuedSubmit()'), 5, 'five parent drops (send failed ×2, start failed, two restores)');
});

test('inFlightSubmitStep: hs over the host send in flight', () => {
  assert.equal(inFlightSubmitStep({ inFlight: null, text: 'b' }), 'send');
  assert.equal(inFlightSubmitStep({ inFlight: { text: 'a' }, text: 'a' }), 'refuse', 'the text in flight again');
  assert.equal(inFlightSubmitStep({ inFlight: { text: 'a' }, text: 'b' }), 'hold');
  assert.equal(inFlightSubmitStep({ inFlight: { text: 'a' }, text: '', empty: true }), 'refuse', 'Z.isEmpty && !tn');
  assert.equal(inFlightSubmitStep({ inFlight: { text: 'a' }, text: 'b', machine: true }), 'refuse', 'machineSend');
});

// The host flow over the real helpers: send() holds, the settle effect (heldStartReleaseWaits → settleHeldStart) releases.
function hostSession() {
  const heldStart = { current: null }, sent = [];
  let revision = 0;
  const bumpHeldStart = () => { revision += 1; };
  const settle = ({ key = 'K', inFlight = false, disabled = false } = {}) => {
    if (heldStartReleaseWaits({ heldStart, pending: false, key, branchSwitch: null, disabled, inFlight })) return 'wait';
    return settleHeldStart({ heldStart, pending: false, key, branchSwitch: null, send: (opts) => { sent.push(opts); } });
  };
  return { heldStart, sent, bumpHeldStart, settle, revision: () => revision };
}

test('host: other text sent while a send is in flight is held (busy Send), waits for it, then goes out', () => {
  const s = hostSession();
  const step = holdSubmitWhileInFlight({ inFlight: { text: 'first' }, priority: 'next', key: 'K', text: 'second', heldStart: s.heldStart, bumpHeldStart: s.bumpHeldStart });
  assert.equal(step, 'hold');
  assert.deepEqual(s.heldStart.current, { priority: 'next', key: 'K', text: 'second' });
  assert.equal(s.revision(), 1, 'the hold re-renders (Qt(!0))');
  assert.equal(heldSubmitQueued(s.heldStart), true, 'Zt: the Send is busy');
  assert.equal(trackHeldStartText({ heldStart: s.heldStart, text: 'second' }), 'keep', 'the text is stamped at the hold');
  assert.equal(s.settle({ inFlight: true }), 'wait', 'gs waits for Yt');
  assert.deepEqual(s.sent, []);
  assert.equal(s.settle({ inFlight: false }), 'release');
  assert.deepEqual(s.sent, [{ priority: 'next' }]);
  assert.equal(heldSubmitQueued(s.heldStart), false);
});

test('host: the same text, an edit, a key change or a failed send never sends the held submit', () => {
  const same = hostSession();
  assert.equal(holdSubmitWhileInFlight({ inFlight: { text: 'a' }, key: 'K', text: 'a', heldStart: same.heldStart, bumpHeldStart: same.bumpHeldStart }), 'refuse');
  assert.equal(same.heldStart.current, null);
  assert.equal(same.revision(), 0);

  const edited = hostSession();
  holdSubmitWhileInFlight({ inFlight: { text: 'a' }, key: 'K', text: 'b', heldStart: edited.heldStart, bumpHeldStart: edited.bumpHeldStart });
  assert.equal(trackHeldStartText({ heldStart: edited.heldStart, text: 'b!' }), 'drop');
  assert.equal(edited.settle(), 'none');
  assert.deepEqual(edited.sent, []);

  const moved = hostSession();
  holdSubmitWhileInFlight({ inFlight: { text: 'a' }, key: 'K', text: 'b', heldStart: moved.heldStart, bumpHeldStart: moved.bumpHeldStart });
  assert.equal(moved.settle({ key: 'J', inFlight: true }), 'drop', 'targetKey changed: en, even while in flight');
  assert.deepEqual(moved.sent, []);

  const failed = hostSession();
  holdSubmitWhileInFlight({ inFlight: { text: 'a' }, key: 'K', text: 'b', heldStart: failed.heldStart, bumpHeldStart: failed.bumpHeldStart });
  assert.equal(dropHeldSubmit({ heldStart: failed.heldStart, bumpHeldStart: failed.bumpHeldStart }), true);
  assert.equal(failed.revision(), 2, 'the drop re-renders (Qt(!1))');
  assert.equal(dropHeldSubmit({ heldStart: failed.heldStart, bumpHeldStart: failed.bumpHeldStart }), false, 'nothing left to drop');
  assert.equal(failed.revision(), 2);
  assert.equal(failed.settle(), 'none');
  assert.deepEqual(failed.sent, []);
});

// The host's /fork flow over the `co` queue: submit with no editor yet, then the [Z, o, hs] effect.
test('host /fork: the prompt waits for the fork composer, goes out with the same key and text, else stays unsent', () => {
  const run = (steps) => {
    const sent = [], lost = [];
    const queue = createEditorSubmitQueue({ submitNow: (opts) => { sent.push(opts); return true; } });
    queue.submit({}, { text: 'do it', onLost: () => lost.push(1) }, { editorReady: false, storeKey: 'fork' });
    const results = steps.map((step) => queue.editorChanged(step));
    return { sent, lost, results };
  };
  const ok = run([{ editorReady: false, storeKey: 'fork', editorText: 'do it' }, { editorReady: true, storeKey: 'fork', editorText: 'do it' }]);
  assert.deepEqual(ok.results, ['wait', 'sent']);
  assert.deepEqual(ok.sent, [{}]);
  const edited = run([{ editorReady: false, storeKey: 'fork', editorText: 'do it!' }, { editorReady: true, storeKey: 'fork', editorText: 'do it!' }]);
  assert.deepEqual(edited.results, ['wait', 'lost']);
  assert.deepEqual(edited.sent, []);
  const elsewhere = run([{ editorReady: true, storeKey: 'origin', editorText: '' }]);
  assert.deepEqual(elsewhere.results, ['lost']);
  assert.deepEqual(elsewhere.sent, []);
  const refused = createEditorSubmitQueue({ submitNow: () => false });
  let lostCount = 0;
  refused.submit({}, { text: 'x', onLost: () => { lostCount += 1; } }, { editorReady: false, storeKey: 'fork' });
  assert.equal(refused.editorChanged({ editorReady: true, storeKey: 'fork', editorText: 'x' }), 'lost', 'hs refused (disconnected)');
  assert.equal(lostCount, 1);
});

test('SourceComposer: canSend lets a held press through while a message send is in flight; the Send is busy while held', async () => {
  const jsx = await read('../src/source-composer.jsx');
  assert.equal(occurrences(jsx, '  submitHeld = false, holdWhileSending = false,\n'), 1);
  const line = jsx.split('\n').find((row) => row.startsWith('  const canSend = '));
  assert.equal(line, '  const canSend = hasContent && (hostCommand ? !!draft.trim() : (!sending || holdWhileSending) && editable && canSubmit && attachmentsReady && (!running || queueEnabled));');
  // Our own expression, evaluated over its inputs.
  const canSend = new Function('v', `with (v) { return ${line.slice('  const canSend = '.length, -1)}; }`);
  const base = { hasContent: true, hostCommand: false, draft: 'b', sending: false, holdWhileSending: false, editable: true, canSubmit: true, attachmentsReady: true, running: false, queueEnabled: false };
  assert.equal(canSend(base), true);
  assert.equal(canSend({ ...base, sending: true }), false, 'a session action or a retry still refuses');
  assert.equal(canSend({ ...base, sending: true, holdWhileSending: true }), true, 'a message send in flight: send() holds it');
  assert.equal(canSend({ ...base, sending: true, holdWhileSending: true, canSubmit: false }), false, 'a disabled composer refuses (zt)');
  assert.equal(occurrences(jsx, 'submitQueued={sending || submitHeld} sendBusyLabel={t("Sending")}'), 1, 'Is = Zt || it');
});

test('main.jsx wiring: send() holds behind the send in flight, sendMessage marks it, failures and restores drop', async () => {
  const jsx = await read('../src/main.jsx');
  const branchHold = 'if (holdStartWhileBranchCheck({ current, pending: startBranchCheckPending(), priority, key: heldStartKeyNow(), heldStart, bumpHeldStart })) return;';
  const flightHold = 'if (holdSubmitWhileInFlight({ inFlight: sendInFlight.current, priority, key: heldStartKeyNow(), text: draft, empty: !draft && !attachments.length, heldStart, bumpHeldStart }) !== "send") return;';
  assert.equal(occurrences(jsx, flightHold), 1);
  const at = jsx.indexOf(flightHold);
  assert.ok(jsx.indexOf(branchHold) < at && at < jsx.indexOf('const parsed = parseSessionCommand(draft, commandContext);', jsx.indexOf(branchHold)),
    'after the branch-check hold, before the command parse (hs runs before the parent sees the text)');
  assert.ok(jsx.indexOf('const sendInFlight = useRef(null);') < jsx.indexOf('async function send({ priority, title } = {}) {'));
  for (const needle of [
    '    const inFlight = { text: draft };\n    if (!stay) { setSending(true); sendInFlight.current = inFlight; }\n',
    '      } else { if (sendInFlight.current === inFlight) sendInFlight.current = null; setSending(false); }\n',
    '      dropHeldSubmit({ heldStart, bumpHeldStart });\n      if (stay) { if (!launched) restoreStay(); }\n',
    '    dropHeldSubmit({ heldStart, bumpHeldStart });\n    const live = liveComposer.current;\n    if (!live.text.trim() && !live.attachments.length) { setDraft(entry.text);',
    '      submitHeld={heldSubmitQueued(heldStart)}\n      holdWhileSending={!!sendInFlight.current && !actionPending}\n',
    '    if (held && !heldStart.current) bumpHeldStart();\n',
    '    if (trackHeldStartText({ heldStart, text: draft }) === "drop") bumpHeldStart();\n',
  ]) assert.equal(occurrences(jsx, needle), 1, needle);
  // The release effect re-runs on `sending`, so the held submit goes out when the send in flight is over.
  assert.match(jsx, /bumpHeldStart\(\);\n {2}\}, \[branchCheck, heldRevision, [^\]]*\bsending, actionPending\]\);/);
});

test('main.jsx wiring: /fork <prompt> seeds the fork draft and goes through the co queue, not a turn/start of its own', async () => {
  const jsx = await read('../src/main.jsx');
  const start = jsx.indexOf('      else if (id === "fork") {');
  const end = jsx.indexOf('      } else {\n        switch (id) {', start);
  assert.ok(start > 0 && end > start);
  const branch = jsx.slice(start, end);
  assert.doesNotMatch(branch, /rpc\("turn\/start"/);
  assert.match(branch, /if\(currentRef\.current===forkId\)setDraft\(value=>value\.trim\(\)\?value:args\);/);
  assert.match(branch, /forkSubmitQueue\.current\.submit\(\{\},\{text:args,onLost:\(\)=>\{\}\},\{editorReady:false,storeKey:forkId\}\);\n\s*bumpForkQueue\(\);/);
  assert.ok(branch.indexOf('clearStashedDraft(origin,sourceDraft)') < branch.indexOf('forkSubmitQueue.current.submit'),
    'the command text is cleared before the prompt is seeded (a ⌘⌥⏎ draft equals the prompt)');
  assert.equal(occurrences(jsx, 'forkAutoSendFocus(textarea.current)'), 1);
  for (const needle of [
    'if (!forkSubmitQueue.current) forkSubmitQueue.current = createEditorSubmitQueue({ submitNow: (opts) => forkSubmitNow.current?.(opts) ?? false });',
    'forkSubmitNow.current = (opts) => { if (!boot?.connected || session?.archived) return false; void send(opts); return true; };',
    'forkSubmitQueue.current.editorChanged({ editorReady: !loading && !actionPending && !!textarea.current, storeKey: current, editorText: draft });\n  }, [current, draft, loading, actionPending, forkQueueRevision]);',
  ]) assert.equal(occurrences(jsx, needle), 1, needle);
});
