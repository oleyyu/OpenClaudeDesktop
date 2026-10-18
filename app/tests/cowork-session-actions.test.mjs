// R4i-cowork CW3 (research-ext/X2-cowork-session-actions.md CW-4 + CW-6): a Cowork session's "Restart conversation from
// here" (2.42304.0 c21f11e6d mk `mo`/`po`, cc1aae219 DN) and the error card's "Go back" (mk `so`, cb55fb7c6 N), over
// src/cowork-session-actions.mjs, message-actions-model.mjs, source-user-actions.jsx and source-turn-error.jsx.
// Vite SSR only (hmr:false, ws:false, no port); no GUI, no IPC, no CLI.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { userMessageActions } from '../src/message-actions-model.mjs';
import { coworkRewindCapabilities, coworkRewindBridge } from '../src/cowork-session-capabilities.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1dir = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const v1 = (name) => fs.readFileSync(path.join(v1dir, name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const SESSION = 'cw-0123abcd-4567-89ef-0123-456789abcdef';

createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
let server, React, render, A, TurnError, UserActions;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/cowork-session-actions.mjs');
  TurnError = await server.ssrLoadModule('/src/source-turn-error.jsx');
  UserActions = await server.ssrLoadModule('/src/source-user-actions.jsx');
});
after(async () => { await server?.close(); });

const RUNNING = 'Claude is still working on this task. Stop the task or let it finish, then try again.';
const EMPTY_RESTART = 'Couldn’t restart from this message. Try again, or pick another message.';
const FAILED_RESTART = 'Couldn’t restart from this message. Try again.';
const DEAD = 'This message can’t be edited or restarted from anymore. Send what you need as a new message instead.';

test('2.42304.0 originals: mk po / mo / so, DN, the restart label, the banner Go back and shared-52 pz / vz', () => {
  const view = v1('c21f11e6d-Bd0v2A97.js');
  for (const needle of [
    'let{prefill:e,refusal:n}=await Tf(et,G,t.uuid);if(!e)return{kind:"empty",refusal:n};r=e}',
    'd=n.editedText===void 0?Pr(r):s===void 0?_m(r,n.editedText):n.editedText',
    'mo=tt(async(e,t)=>{if(!Lt||co.current)return;',
    'if(uo.current&&(!k||!n)){Ri(cO("turn running",f),{messageForLogging:"CoworkSessionView remote rewind while running"}),r("blocked_running");return}',
    'let i=dO(n,{isRemoteSession:k,surface:t?"refusal_retry":"restart"},f);i&&Ri(i.message,i.options),n.kind==="empty"&&!k&&!t&&Me()',
    'so=tt(async()=>{let e=xf(Ae)?.uuid;if(!e||!Vf(et))return null;try{let{prefill:t}=await Tf(et,G,e);return t?(pO(Zt,e),q?.(e),Tc.getState().resend(G),',
    'wt?Gc(t):Mr(t)):(Me(),null)}catch{return null}})',
    'onSessionRewind:Vt&&!a?so:void 0,onRewindToMessage:Bt&&!a&&($n||!k)?mo:void 0',
    'wt=ue("claudeai_linden_transom")', 'Ut as Mr', 'Wt as Pr',
  ]) assert.equal(occurrences(view, needle), 1, needle);
  const rows = v1('cc1aae219-DjR8LnUv.js');
  for (const needle of ['DN=A(function({onRewindToMessage:e,message:t}){let n=Q(),r=_r(),i=P(()=>e(t),[e,t]);',
    'icon:"ArrowCounterClockwise","data-testid":"user-message-rewind","aria-label":n.formatMessage(r.restartFromHere),onClick:i})',
    'K=y&&!!_&&E&&!S&&!e.sendFailed', 'showRewind:K'])
    assert.equal(occurrences(rows, needle), 1, needle);
  assert.equal(occurrences(v1('shared-78-D6VXYXaQ.js'), 'restartFromHere:{defaultMessage:"Restart conversation from here",id:"lHlImYcnSM"}'), 1);
  const banner = v1('cb55fb7c6-SuMOPyQx.js');
  for (const needle of ['Se=f(async()=>{if(!p)return;let e=await p();e&&(U(e,{forceUpdateTiptap:!0,unsafe:D(e)}),W?.())},[p,U,W]),Ce=!!p&&!F.isConfirmPrompt',
    'Ce&&c("p",{className:"text-secondary",children:c(E,{defaultMessage:"You can edit your message and send it again.",id:"LqvlIfVjNO"})})',
    'Q&&c(C,{variant:"secondary",size:"sm",icon:"ArrowReturn",onClick:Q,children:c(E,{defaultMessage:"Go back",id:"orvpWhO3rI"})}),d&&F.retryHelps'])
    assert.equal(occurrences(banner, needle), 1, needle);
  const shared52 = v1('shared-52-DGviI8xb.js');
  assert.equal(occurrences(shared52, 'function pz(e){if(typeof e!="string"||!e.includes("<"))return e;'), 1);
  assert.equal(occurrences(shared52, 'function vz(e){return typeof e!="string"||!e.includes("<")?e:_z(pz(gz(hz(e))))}'), 1);
});

test('the pz / vz ports give the originals’ output', () => {
  const shared52 = v1('shared-52-DGviI8xb.js');
  const start = shared52.indexOf('function pz(e)'), end = shared52.indexOf('function yz(e)');
  const original = new Function(`${shared52.slice(start, end)};return {pz, vz};`)();
  const samples = ['plain', 42, undefined, '', 'a < b',
    'hi<system-reminder>secret</system-reminder>  ', '<system-reminder>x</system-reminder>',
    'x<cu_window_hints>w</cu_window_hints>\n y<widget_context_hint>h</widget_context_hint>z',
    '<launch-selected-element>el</launch-selected-element>\n<preview-annotation-context>c</preview-annotation-context> ask',
    'q<uploaded_files>/a</uploaded_files>\n<sync_sources>s</sync_sources>r', 'keep <launch-selected-element>mid</launch-selected-element>'];
  for (const sample of samples) {
    assert.deepEqual(A.stripHostContext(sample), original.pz(sample), `pz ${JSON.stringify(sample)}`);
    assert.deepEqual(A.composerPrefillText(sample), original.vz(sample), `vz ${JSON.stringify(sample)}`);
  }
});

function harness({ rewind = async () => ({ prefill: 'again' }), running = false, capabilities, items } = {}) {
  const calls = { rewind: [], after: [], send: [], retry: 0, toast: [] };
  const bridge = { rewindV2: async (sessionId, uuid) => { calls.rewind.push([sessionId, uuid]); return rewind(uuid); } };
  const actions = A.coworkSessionActions({
    sessionId: SESSION, bridge, capabilities: capabilities ?? coworkRewindCapabilities({ bridge }), latch: { current: false },
    isRunning: () => running, afterRewind: (uuid) => { calls.after.push(uuid); }, send: (text, options) => { calls.send.push([text, options]); },
    retry: () => { calls.retry += 1; }, toast: (message, options) => { calls.toast.push([message, options]); },
    readItems: () => items ?? [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'one' }] },
      { id: 'a1', type: 'agentMessage', turnId: 't1' }, { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'two' }] }],
  });
  return { actions, calls };
}

test('visibility: Bt for restart, Vt for Go back (read-only, scheduled, no bridge → none)', () => {
  const bridge = coworkRewindBridge(async () => ({}), { coworkEnabled: true });
  const on = A.coworkSessionActions({ sessionId: SESSION, bridge, capabilities: coworkRewindCapabilities({ bridge }), send() {} });
  assert.equal(typeof on.onRestartFromHere, 'function');
  assert.equal(typeof on.onSessionRewind, 'function');
  for (const capabilities of [coworkRewindCapabilities({ bridge, readOnly: true }), coworkRewindCapabilities({ bridge, scheduledTaskId: 'task' }),
    coworkRewindCapabilities({ bridge: coworkRewindBridge(async () => ({}), { coworkEnabled: false }) }), coworkRewindCapabilities()]) {
    const off = A.coworkSessionActions({ sessionId: SESSION, bridge, capabilities, send() {} });
    assert.equal(off.onRestartFromHere, null);
    assert.equal(off.onSessionRewind, null);
  }
});

test('mo while the turn runs: cO("turn running"), nothing rewound', async () => {
  const { actions, calls } = harness({ running: true });
  await actions.onRestartFromHere({ uuid: 'u1' });
  assert.deepEqual(calls.toast, [[RUNNING, { messageForLogging: 'CoworkSessionView remote rewind while running' }]]);
  assert.deepEqual(calls.rewind, []);
  assert.deepEqual(calls.send, []);
});

test('mo success: the prefill (pz) is sent again after the rewound transcript is shown; no toast, composer untouched', async () => {
  const { actions, calls } = harness({ rewind: async () => ({ prefill: 'redo it<system-reminder>ctx</system-reminder>\n' }) });
  await actions.onRestartFromHere({ uuid: 'u1' });
  assert.deepEqual(calls.rewind, [[SESSION, 'u1']]);
  assert.deepEqual(calls.after, ['u1']);
  assert.deepEqual(calls.send, [['redo it', {}]]);
  assert.deepEqual(calls.toast, []);
  assert.equal(calls.retry, 0);
});

test('mo empty: dO toast (no refusal / dead), then Me = the host retry; nothing sent', async () => {
  const none = harness({ rewind: async () => ({}) });
  await none.actions.onRestartFromHere({ uuid: 'u2' });
  assert.deepEqual(none.calls.toast, [[EMPTY_RESTART, { messageForLogging: 'CoworkSessionView local rewind target not rewindable' }]]);
  assert.equal(none.calls.retry, 1);
  assert.deepEqual(none.calls.send, []);
  assert.deepEqual(none.calls.after, []);
  const dead = harness({ rewind: async () => ({ refusal: 'dead' }) });
  await dead.actions.onRestartFromHere({ uuid: 'u2' });
  assert.deepEqual(dead.calls.toast, [[DEAD, { messageForLogging: 'CoworkSessionView local rewind refused: dead' }]]);
  assert.equal(dead.calls.retry, 1);
  const odd = harness({ rewind: async () => ({ refusal: 'something-new' }) });
  await odd.actions.onRestartFromHere({ uuid: 'u2' });
  assert.deepEqual(odd.calls.toast, [[EMPTY_RESTART, { messageForLogging: 'CoworkSessionView local rewind target not rewindable' }]], 'ym normalises to unknown');
});

test('mo error: the uO restart toast; no retry; a modelOverride is the refusal_retry surface', async () => {
  const failure = new Error('ipc down');
  const broken = harness({ rewind: async () => { throw failure; } });
  await broken.actions.onRestartFromHere({ uuid: 'u1' });
  assert.equal(broken.calls.toast.length, 1);
  assert.equal(broken.calls.toast[0][0], FAILED_RESTART);
  assert.equal(broken.calls.toast[0][1].messageForLogging, 'CoworkSessionView rewind failed');
  assert.equal(broken.calls.toast[0][1].error, failure);
  assert.equal(broken.calls.retry, 0);
  const retryEmpty = harness({ rewind: async () => ({}) });
  await retryEmpty.actions.onRestartFromHere({ uuid: 'u1' }, 'claude-other');
  assert.deepEqual(retryEmpty.calls.toast, [['Couldn’t retry. Try again.', { messageForLogging: 'CoworkSessionView refusal rewind returned empty' }]]);
  assert.equal(retryEmpty.calls.retry, 0, 'Me only without a modelOverride');
  const retrySent = harness();
  await retrySent.actions.onRestartFromHere({ uuid: 'u1' }, 'claude-other');
  assert.deepEqual(retrySent.calls.send, [['again', { model: 'claude-other' }]]);
});

test('mo: one at a time (co.current); a send that throws reads as error', async () => {
  let release;
  let held = true;
  const { actions, calls } = harness({ rewind: () => held ? new Promise((resolve) => { release = resolve; held = false; }) : { prefill: "y" } });
  const first = actions.onRestartFromHere({ uuid: 'u1' });
  await actions.onRestartFromHere({ uuid: 'u2' });
  assert.deepEqual(calls.rewind, [[SESSION, 'u1']]);
  release({ prefill: 'x' });
  await first;
  await actions.onRestartFromHere({ uuid: 'u2' });
  assert.deepEqual(calls.rewind, [[SESSION, 'u1'], [SESSION, 'u2']], 'released after it settles');
  const bridge = { rewindV2: async () => ({ prefill: 'x' }) };
  const throwing = A.coworkSessionActions({ sessionId: SESSION, bridge, capabilities: coworkRewindCapabilities({ bridge }), latch: { current: false },
    send: () => { throw new Error('send'); } });
  assert.equal((await throwing.rewindAndResend({ uuid: 'u1' })).kind, 'error');
  const off = A.coworkSessionActions({ sessionId: SESSION, bridge, capabilities: coworkRewindCapabilities(), send() {} });
  assert.equal((await off.rewindAndResend({ uuid: 'u1' })).kind, 'error', 'po: rewind unavailable');
});

test('so (Go back): the last human message; a prefill comes back as vz text, none falls back to Me, a failure is null', async () => {
  const ok = harness({ rewind: async () => ({ prefill: '<launch-selected-element>e</launch-selected-element>\nfix <uploaded_files>/a</uploaded_files>this' }) });
  assert.equal(await ok.actions.onSessionRewind(), 'fix this');
  assert.deepEqual(ok.calls.rewind, [[SESSION, 'u2']]);
  assert.deepEqual(ok.calls.after, ['u2']);
  assert.deepEqual(ok.calls.send, [], 'Go back never sends');
  const empty = harness({ rewind: async () => ({ refusal: 'no_text' }) });
  assert.equal(await empty.actions.onSessionRewind(), null);
  assert.equal(empty.calls.retry, 1);
  assert.deepEqual(empty.calls.toast, []);
  const broken = harness({ rewind: async () => { throw new Error('x'); } });
  assert.equal(await broken.actions.onSessionRewind(), null);
  assert.equal(broken.calls.retry, 0);
  const nothing = harness({ items: [{ id: 'a1', type: 'agentMessage' }] });
  assert.equal(await nothing.actions.onSessionRewind(), null);
  assert.deepEqual(nothing.calls.rewind, []);
  assert.deepEqual(A.lastHumanMessage([{ id: 'u1', type: 'userMessage', content: [{ type: 'text', text: 'a' }, { type: 'image' }, { type: 'text', text: 'b' }] }]), { uuid: 'u1', text: 'ab' });
});

test('userMessageActions: a Cowork restart action replaces Rewind / Fork, enabled while running; Code is unchanged', () => {
  const restarted = [];
  const onRestartFrom = (uuid) => restarted.push(uuid);
  const idle = userMessageActions({ turnId: 't1', itemId: 'u1', onRestartFrom, rewindServed: true, onRewindTo: () => {}, onForkFrom: () => {} });
  assert.equal(idle.rewind.kind, 'restart');
  assert.equal(idle.fork, null);
  idle.rewind.onClick();
  const busy = userMessageActions({ turnId: 't1', itemId: 'u1', activeTurnId: 't1', running: true, onRestartFrom });
  assert.equal(busy.rewind.kind, 'restart');
  assert.equal(busy.rewind.disabledReason, undefined);
  busy.rewind.onClick();
  assert.deepEqual(restarted, ['u1', 'u1']);
  assert.equal(userMessageActions({ turnId: 't1', onRestartFrom }), null, 'no message uuid, no action');
  const code = userMessageActions({ turnId: 't1', itemId: 'u1', rewindServed: true, onRewindTo: () => {}, onForkFrom: null });
  assert.equal(code.rewind.kind, undefined);
  assert.equal(typeof code.rewind.onClick, 'function');
});

test('SourceUserActions: DN — user-message-rewind, ArrowCounterClockwise, "Restart conversation from here", no Rewind to here', () => {
  const html = render(React.createElement(UserActions.SourceUserActions, { sessionKey: SESSION, itemId: 'u1', text: 'hi', interacted: true,
    rewind: { kind: 'restart', onClick: () => {} } }));
  assert.match(html, /data-message-action="restart"/);
  assert.match(html, /data-testid="user-message-rewind"/);
  assert.match(html, /aria-label="Restart conversation from here"/);
  assert.doesNotMatch(html, /Rewind to here/);
  assert.doesNotMatch(html, /aria-description=/, 'DN has no detail line');
  const code = render(React.createElement(UserActions.SourceUserActions, { sessionKey: 't', itemId: 'u1', text: 'hi', interacted: true, rewind: { onClick: () => {} } }));
  assert.match(code, /aria-label="Rewind to here"/);
  assert.doesNotMatch(code, /user-message-rewind/);
});

function fixture(component, props) {
  const cells = [];
  let cursor = 0;
  const dispatcher = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (next) => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
  };
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
  internals.H = dispatcher;
  try { return component(props); } finally { internals.H = old; }
}
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (!Array.isArray(tree) && predicate(tree)) return tree;
  // Children and element-valued props (TurnErrorDetails gets the action row as its `actions` prop).
  for (const child of Array.isArray(tree) ? tree : Object.values(tree.props ?? {})) { const found = findNode(child, predicate); if (found) return found; }
  return null;
}

test('SourceTurnError Cowork variant: the hint and Go back before Try again; Go back fills the composer with the prefill', async () => {
  const error = { message: 'stream failed', codexErrorInfo: 'other' };
  const html = render(React.createElement(TurnError.SourceTurnError, { error, turnId: 't2', onRetry: () => {}, onGoBack: async () => null, onPrefill: () => {} }));
  assert.match(html, /<p class="ste-hint ste-go-back-hint">You can edit your message and send it again\.<\/p>/);
  const labels = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").replace(/[\uE000-\uF8FF]/g, "").trim());
  assert.ok(labels.indexOf('Go back') >= 0 && labels.indexOf('Go back') < labels.indexOf('Try again'), labels.join('|'));
  assert.match(html, /data-cowork-action="go-back"/);
  const plain = render(React.createElement(TurnError.SourceTurnError, { error, turnId: 't2', onRetry: () => {} }));
  assert.doesNotMatch(plain, /Go back|You can edit your message/);
  const filled = [];
  const tree = fixture(TurnError.SourceTurnError, { error, turnId: 't2', onGoBack: async () => 'back in the composer', onPrefill: (text) => filled.push(text) });
  const button = findNode(tree, (node) => node.props?.['data-cowork-action'] === 'go-back');
  assert.equal(button.props.icon, 'ArrowReturn');
  assert.equal(button.props.variant, 'secondary');
  assert.equal(button.props.size, 'sm');
  await button.props.onClick();
  assert.deepEqual(filled, ['back in the composer']);
  const none = fixture(TurnError.SourceTurnError, { error, turnId: 't2', onGoBack: async () => null, onPrefill: (text) => filled.push(text) });
  await findNode(none, (node) => node.props?.['data-cowork-action'] === 'go-back').props.onClick();
  assert.deepEqual(filled, ['back in the composer'], 'no prefill, composer untouched');
});

test('main.jsx wiring: the Cowork actions over the CW2 bridge, the restart action and both error cards’ Go back', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  for (const needle of [
    // R4i-cowork CW4 widened this import (lastHumanMessage for the edit's isLastHuman).
    "import { coworkSessionActions, coworkSessionHost, lastHumanMessage } from './cowork-session-actions.mjs';",
    "const coworkBridge = isCoworkSession(current) ? coworkRewindBridge(call, { coworkEnabled: boot?.coworkEnabled === true }) : null;",
    "capabilities: coworkRewindCapabilities({ readOnly: !!session?.archived || !boot?.connected, bridge: coworkBridge,",
    "scheduledTaskId: session?.scheduledTaskId || sessionMetadata[current]?.scheduledTaskId || null }),",
    // R4i-cowork review fix: the host calls come from coworkSessionHost (behaviour tested below), sends go out as resends.
    "const coworkHost = coworkBridge ? coworkSessionHost({",
    "sessionId: coworkSessionId, sendMessage,",
    "retryTurn: (turnId) => retryFailedTurn(turnId, { thread: true }),",
    "setDraft, isCurrent: () => currentRef.current === coworkSessionId,",
    "const coworkActions = coworkHost ? coworkSessionActions({",
    "...coworkHost, bridge: coworkBridge,",
    "const coworkPrefill = (text) => coworkHost?.prefill(text);",
    "onRestartFrom: coworkActions?.onRestartFromHere ? (uuid) => void coworkActions.onRestartFromHere({ uuid }) : null,",
    'onGoBack={variant === "card" && coworkActions?.onSessionRewind ? coworkActions.onSessionRewind : undefined} onPrefill={coworkPrefill}',
    'onGoBack={coworkActions?.onSessionRewind ?? undefined} onPrefill={coworkPrefill}',
  ]) assert.equal(occurrences(main, needle), 1, needle);
});

// ---------------------------------------------------------------- R4i-cowork review fix: the host side, as behaviour
// The session view's host calls (main.jsx) are coworkSessionHost; with the real CW2 bridge over an injected IPC call and
// an injected sendMessage, a click's path is checked end to end: cowork-rewind → refresh → a text-only resend that never
// reads or empties the composer, and a send that did not go out is an error with the message back in the composer.
function hostHarness({ rewind = () => ({ prefill: 'again' }), send = () => ({ started: true, pending: false }), draft = '', current = true,
  items } = {}) {
  const calls = { ipc: [], refresh: [], send: [], retry: [], toast: [], focus: 0 };
  const composer = { draft };
  const call = async (channel, payload) => { calls.ipc.push([channel, payload]); return rewind(payload); };
  const bridge = coworkRewindBridge(call, { coworkEnabled: true });
  const host = A.coworkSessionHost({
    sessionId: SESSION,
    sendMessage: async (...args) => { calls.send.push(args); return send(...args); },
    refresh: async (id) => { calls.refresh.push(id); },
    readItems: () => items ?? [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'one' }] },
      { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'two' }] }],
    retryTurn: (turnId) => { calls.retry.push(turnId); },
    toast: (message) => { calls.toast.push(message); },
    setDraft: (value) => { composer.draft = typeof value === 'function' ? value(composer.draft) : value; },
    isCurrent: () => current, focusComposer: () => { calls.focus += 1; },
  });
  const actions = A.coworkSessionActions({ ...host, bridge, capabilities: coworkRewindCapabilities({ bridge }), latch: { current: false },
    editRefs: { inFlight: { current: null }, refusalEdit: { current: null } } });
  return { host, actions, calls, composer };
}

test('host: Restart from here goes through IPC cowork-rewind, refreshes, then resends the pz text only; the composer is untouched', async () => {
  const { actions, calls, composer } = hostHarness({ draft: 'typing', rewind: () => ({ prefill: 'redo it<system-reminder>x</system-reminder>' }) });
  await actions.onRestartFromHere({ uuid: 'u1' });
  assert.deepEqual(calls.ipc, [['cowork-rewind', { threadId: SESSION, targetMessageUuid: 'u1' }]]);
  assert.deepEqual(calls.refresh, [SESSION]);
  assert.deepEqual(calls.send, [['redo it', [], [], { resend: true }]], 'Qe(…, {isResend:!0}): Pr(prefill) alone, as a resend');
  assert.deepEqual(calls.toast, []);
  assert.equal(composer.draft, 'typing');
  assert.equal(calls.focus, 0);
});

test('host: Edit resends $t(prefill, edited text) the same way', async () => {
  const { actions, calls, composer } = hostHarness({ rewind: () => ({ prefill: '<sync_sources>s</sync_sources>\nold' }) });
  await actions.onEditMessage({ uuid: 'u2' }, 'new text');
  assert.deepEqual(calls.ipc, [['cowork-rewind', { threadId: SESSION, targetMessageUuid: 'u2' }]]);
  assert.deepEqual(calls.send, [['<sync_sources>s</sync_sources>\n\nnew text', [], [], { resend: true }]]);
  assert.deepEqual(calls.toast, []);
  assert.equal(composer.draft, '');
});

test('host: a resend that did not go out (early return) is an error toast, and the message comes back to the composer', async () => {
  const restart = hostHarness({ draft: 'mine', send: () => undefined, rewind: () => ({ prefill: '<uploaded_files>/a</uploaded_files>lost' }) });
  await restart.actions.onRestartFromHere({ uuid: 'u1' });
  assert.deepEqual(restart.calls.toast, [FAILED_RESTART]);
  assert.equal(restart.composer.draft, 'mine\n\nlost', 'vz text after what is typed (Discard\'s merge)');
  assert.equal(restart.calls.focus, 1);
  const edit = hostHarness({ send: () => ({ started: false, pending: false }) });
  assert.equal((await edit.actions.rewindAndResend({ uuid: 'u2' }, { editedText: 'edited' })).kind, 'error');
  assert.equal(edit.composer.draft, 'edited');
});

test('host: a refused resend kept as a "Not delivered" bubble, or a session left meanwhile, leaves the composer alone', async () => {
  const kept = hostHarness({ send: () => ({ started: false, pending: true }) });
  assert.equal((await kept.actions.rewindAndResend({ uuid: 'u1' })).kind, 'error');
  assert.equal(kept.composer.draft, '', 'the bubble\'s own Retry / Discard has it');
  const away = hostHarness({ send: () => undefined, current: false });
  assert.equal((await away.actions.rewindAndResend({ uuid: 'u1' })).kind, 'error');
  assert.equal(away.composer.draft, '');
  assert.equal(away.calls.focus, 0);
});

test('host: an empty rewind retries the last turn (Me); Go back puts the vz text in the composer through prefill', async () => {
  const empty = hostHarness({ rewind: () => ({ refusal: 'no_text' }) });
  await empty.actions.onRestartFromHere({ uuid: 'u1' });
  assert.deepEqual(empty.calls.send, []);
  assert.deepEqual(empty.calls.retry, ['t2']);
  const back = hostHarness({ draft: 'replaced', rewind: () => ({ prefill: '<launch-selected-element>e</launch-selected-element>\nfix this' }) });
  const text = await back.actions.onSessionRewind();
  assert.equal(text, 'fix this');
  assert.deepEqual(back.calls.ipc, [['cowork-rewind', { threadId: SESSION, targetMessageUuid: 'u2' }]]);
  back.host.prefill(text);
  assert.equal(back.composer.draft, 'fix this', 'cb55fb7c6 Se: U(e) replaces the draft');
  assert.equal(back.calls.focus, 1);
  assert.deepEqual(back.calls.send, []);
});

test('main.jsx sendMessage resend path: text-only input, no shell / keyword / steer, composer not emptied, {started, pending}', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const start = main.indexOf('  async function sendMessage(draft, attachments, mentions, { priority, beside, resend = false } = {}) {');
  assert.ok(start > 0);
  const body = main.slice(start, main.indexOf('\n  function discardFailedStart(', start));
  for (const needle of [
    'const shellCommand = mode === "code" && !beside ? (resend ? null : shellModeCommand(draft, boot?.core, shellOptions)) : null;',
    'if (mode === "code" && !beside && !resend && shellModeActive(draft, boot?.core, shellOptions)) {',
    'if (running) { if (!resend) await sendWhileRunning(priority); return; }',
    'const keywordRequested = !beside && !resend && keywordMatches.length > 0 && !keywordIgnored && !shellCommand;',
    'const turnInput = () => resend ? [{ type: "text", text, text_elements: [] }] : composerInput(text, turnCwd, { issueContext });',
    'input: turnInput(), mentions: mentionList, turnCwd };',
    'if (resend) return;\n      setDraft((value) => (value === text ? "" : value));',
    'input: pendingEntry?.input ?? turnInput(),',
    '} else if (!resend) clearComposerDraft(sendSequence, text, entries, origin, id);',
    'return { started: turnStarted, pending: !!pendingEntry && !turnStarted };',
  ]) assert.equal(occurrences(body, needle), 1, needle);
  assert.equal(occurrences(body, 'composerInput('), 1, 'composerInput (the composer state) only off the resend path');
});
