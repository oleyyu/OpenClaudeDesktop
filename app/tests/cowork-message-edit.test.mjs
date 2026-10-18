// R4i-cowork CW4 (research-ext/X2-cowork-session-actions.md CW-5 / CW-7 / CW-8): a Cowork session's edit of its last
// human message (2.42304.0 c21f11e6d mk `ho` / `po`'s edited branch, ccba96ec3 `$t`, cc1aae219 SN showEdit / Hs.EditAction
// / VY / HY / UY / WY / qY, shared-2 WX editing, shared-frame RT), the refusal-retry data (shared-7 zk / a_, shared-52 _B,
// the runtime's stop_reason / stop_details) and the zh-CN copy. Vite SSR only (hmr:false, ws:false, no port); no GUI,
// no IPC, no CLI.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { userMessageActions } from '../src/message-actions-model.mjs';
import { coworkRewindCapabilities } from '../src/cowork-session-capabilities.mjs';
import { CoworkSessions } from '../electron/cowork-runtime/session-service.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1dir = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const v1 = (name) => fsSync.readFileSync(path.join(v1dir, name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const SESSION = 'cw-1111abcd-4567-89ef-0123-456789abcdef';

createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
let server, React, render, A, Edit, UserActions, I18n;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/cowork-session-actions.mjs');
  Edit = await server.ssrLoadModule('/src/source-user-message-edit.jsx');
  UserActions = await server.ssrLoadModule('/src/source-user-actions.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });

const EDIT_FAILED = 'Couldn’t edit this message. Try again.';
const NOTE = 'Saving sends this as your latest message and restarts from here.';

test('2.42304.0 originals: ho, po’s edited branch, $t, SN showEdit, Hs.EditAction, VY / HY / UY / WY / qY, WX editing, RT bare', () => {
  const view = v1('c21f11e6d-Bd0v2A97.js');
  for (const needle of [
    'ho=tt(async(e,t)=>{let n=lo.current;if(n?.uuid===e.uuid&&n.text===t)return;let r=li.current?.messageUuid===e.uuid?li.current:null;if(li.current=null,!Lt||co.current){Ri(uO("edit",f),{messageForLogging:"CoworkSessionView edit rewind unavailable or in flight"});return}',
    'await Ii(n=>{co.current=n,lo.current=n?{uuid:e.uuid,text:t}:null},async()=>{let n=await po(e,{editedText:t,modelOverride:r?.originalModel});',
    'let i=dO(n,{isRemoteSession:k,surface:"edit"},f);i&&Ri(i.message,i.options)})})',
    'd=n.editedText===void 0?Pr(r):s===void 0?_m(r,n.editedText):n.editedText', 's=o?lr(o):void 0',
    'import{i as _m}from"./ccba96ec3-BTgJdU9P.js"', 'Qc as lr',
    'editMessage:Bt&&!a&&($n||!k)?ho:void 0',
    'ui=tt((t,n,r)=>{li.current={messageUuid:t.uuid,originalModel:n,source:r},Ve(n),fl.getState().requestEdit(e,t.uuid,{entryPoint:r==="hard_block"?"safety_warning":"model_fallback_banner"})})',
    'let e=dk({request:go,canRewindToMessage:Bt,findLastHumanBubble:si});if(e){if(go.kind==="edit"){ui(e,go.modelOverride,"hard_block");return}mo(e,go.modelOverride)}',
  ]) assert.equal(occurrences(view, needle), 1, needle);
  const merge = v1('ccba96ec3-BTgJdU9P.js');
  for (const needle of ['function $t(e,t){let n=D(e),r=n.match(Xt)?.[0],i=n.match(Zt)?.[0];return[n.match(Qt)?.[0].trimEnd(),i,r,t].filter(Boolean).join(',
    'Wt as D', '$t as i']) assert.equal(occurrences(merge, needle), 1, needle);
  const rows = v1('cc1aae219-DjR8LnUv.js');
  for (const needle of [
    'W=H&&!f&&!te&&d&&u&&c&&!e.sendFailed&&!El(e)&&!V&&(I||U)&&(E?T&&o&&!S:!!e.parent_message_uuid)', 'showEdit:W',
    'xe.showEdit&&o&&y(Hs.EditAction,{"data-testid":"user-message-edit",disabled:J||xe.hubEditUnsupported&&!Ne,',
    'function HY(e){return e.editSubmitted===!0||e.currentEdit.length===0||e.currentEdit.trim().length===0&&e.currentEdit!==e.originalText||',
    '!e.requestedModelOverride&&!e.hasRemovals&&e.originalText===e.currentEdit||e.isCoworkSession&&e.isStreaming}',
    'function UY({isCoworkSession:e,queuedResend:t}){let{hideBranchVersionNav:n=!1}=C(Sd);return t?"resend":e||n?"restart":"branch"}',
    'case"restart":return e.formatMessage({defaultMessage:"Saving sends this as your latest message and restarts from here.",id:"4DHkqcnzeZ"})',
    'function GY(e,t,n){return n===void 0?{editNote:WY(e,t)}:{editNote:n,editNoteLabel:n}}',
    'function qY(e){return y("div",{className:"pb-6",children:y("div",{className:"flex flex-col items-end",children:y(JY,{...e})})})}',
    'if(h||f.length===0||f.trim().length===0&&f!==F||!n||', 'if(zt&&!en)return y(YY,{',
  ]) assert.equal(occurrences(rows, needle), 1, needle);
  const shared2 = v1('shared-2-Cb74JByF.js');
  for (const needle of [
    'pX=T(({size:e,label:t,className:n,pinned:r,...i},a)=>{let o=G("edit","Edit"),s=v(sX);return h(_u,{ref:a,variant:"ghost",iconOnly:!0,icon:"Edit","aria-label":t??o,',
    'v?"bg-surface-1 shadow-card-ring transition duration-fast focus-within:shadow-focus"',
    'h("div",{ref:Me,className:j("cds-user-message-body",Re&&kX,e==="pending"&&Re?DX:e&&EX[e],v&&"[@supports_not_(field-sizing:content)]:relative")',
    'h(nu,{bare:!0,rows:1,value:pe,onChange:_e,onKeyDown:ye,onCompositionEnd:ve,ref:Ne,autosize:!0,"aria-label":le,className:`${NX} overflow-y-auto text-heading font-normal [@supports_not_(field-sizing:content)]:absolute [@supports_not_(field-sizing:content)]:inset-0 [@supports_not_(field-sizing:content)]:h-full`})',
    'className:`${NX} cds-text-entry-floored pointer-events-none invisible min-w-px overflow-y-auto font-sans text-heading font-normal break-words whitespace-pre-wrap select-none [@supports_(field-sizing:content)]:hidden`,children:`${pe}\\u200b`',
    'd("div",{className:"flex items-center gap-xs","data-size":"xs",children:[k!=null&&h(eu,{content:k,side:"top",hoverable:!0,children:h("span",{tabIndex:0,role:"img","aria-label":A??ue,className:"flex rounded-[2px] text-secondary outline-none focus-visible:outline-hidden focus-visible:shadow-focus",children:h(Zl,{name:"Info",size:"sm"})})}),h(_u,{size:"xs",variant:"ghost",onClick:T,type:"button",children:se}),h(_u,{size:"xs",variant:"primary",disabled:O,onClick:()=>C?.(pe),type:"button",...Fe,children:ce})]})',
    'NX="max-h-[min(40svh,24rem)]"', 'e.key==="Escape"&&(e.stopPropagation(),T?.())',
    'se=G("cancel","Cancel"),ce=G("save","Save"),le=G("editMessage","Edit message"),ue=G("aboutSaving","About saving")',
  ]) assert.equal(occurrences(shared2, needle), 1, needle);
  assert.equal(occurrences(v1('shared-frame-BfjMqbuN.js'), 'i?"block resize-none border-0 bg-transparent p-0 shadow-none":'), 1);
});

test('mergeEditedText is ccba96ec3 $t: the prefill’s context tags stay ahead of the edited text', () => {
  const shared52 = v1('shared-52-DGviI8xb.js');
  const pz = new Function(`${shared52.slice(shared52.indexOf('function pz(e)'), shared52.indexOf('function hz('))};return pz;`)();
  const merge = v1('ccba96ec3-BTgJdU9P.js');
  const original = new Function('D', `${merge.slice(merge.indexOf('var Xt='), merge.indexOf('var en='))};return $t;`)(pz);
  for (const [prefill, edited] of [['plain', 'new'], ['old<system-reminder>r</system-reminder>', 'new'],
    ['<launch-selected-element>el</launch-selected-element>\nask <uploaded_files>/a</uploaded_files> x <sync_sources>s</sync_sources>', 'edited'],
    ['<preview-annotation-context>c</preview-annotation-context> q', ''], ['', 'only']])
    assert.equal(A.mergeEditedText(prefill, edited), original(prefill, edited), JSON.stringify([prefill, edited]));
});

function harness({ rewind = async () => ({ prefill: 'old text' }), capabilities, items, latch = { current: false } } = {}) {
  const calls = { rewind: [], after: [], send: [], toast: [], editor: [] };
  const bridge = { rewindV2: async (sessionId, uuid) => { calls.rewind.push([sessionId, uuid]); return rewind(uuid); } };
  const editRefs = { inFlight: { current: null }, refusalEdit: { current: null } };
  const actions = A.coworkSessionActions({ sessionId: SESSION, bridge, capabilities: capabilities ?? coworkRewindCapabilities({ bridge }), latch, editRefs,
    afterRewind: (uuid) => { calls.after.push(uuid); }, send: (text, options) => { calls.send.push([text, options]); },
    toast: (message, options) => { calls.toast.push([message, options]); }, openEditor: (uuid, options) => { calls.editor.push([uuid, options]); },
    readItems: () => items ?? [{ id: 'u1', type: 'userMessage', content: [{ type: 'text', text: 'one' }] }, { id: 'a1', type: 'agentMessage' },
      { id: 'u2', type: 'userMessage', content: [{ type: 'text', text: 'two' }] }] });
  return { actions, calls, editRefs, latch };
}

test('ho: the edit rewinds to the message and sends the edited text (through $t); no toast', async () => {
  const { actions, calls } = harness({ rewind: async () => ({ prefill: '<uploaded_files>/f</uploaded_files>old' }) });
  assert.equal(typeof actions.onEditMessage, 'function');
  await actions.onEditMessage({ uuid: 'u2' }, 'better');
  assert.deepEqual(calls.rewind, [[SESSION, 'u2']]);
  assert.deepEqual(calls.after, ['u2']);
  assert.deepEqual(calls.send, [['<uploaded_files>/f</uploaded_files>\n\nbetter', {}]]);
  assert.deepEqual(calls.toast, []);
});

test('ho: the same text for the message in flight is dropped; busy or unavailable → uO("edit") with the original log text', async () => {
  let release;
  const held = harness({ rewind: () => new Promise((resolve) => { release = () => resolve({ prefill: 'x' }); }) });
  const first = held.actions.onEditMessage({ uuid: 'u2' }, 'same');
  await setImmediate();
  assert.deepEqual(held.editRefs.inFlight.current, { uuid: 'u2', text: 'same' });
  await held.actions.onEditMessage({ uuid: 'u2' }, 'same');
  assert.deepEqual(held.calls.toast, [], 'the duplicate is silent');
  await held.actions.onEditMessage({ uuid: 'u2' }, 'other');
  assert.deepEqual(held.calls.toast, [[EDIT_FAILED, { messageForLogging: 'CoworkSessionView edit rewind unavailable or in flight' }]]);
  release(); await first;
  assert.equal(held.editRefs.inFlight.current, null);
  assert.equal(held.latch.current, false);
  assert.equal(held.calls.rewind.length, 1);
  const off = harness({ capabilities: { canRewindToMessage: false, canEditOrRestart: false, canSessionRewind: false } });
  assert.equal(off.actions.onEditMessage, null, 'editMessage is offered under Bt only');
});

test('ho: empty and failed outcomes use dO with surface "edit"', async () => {
  const empty = harness({ rewind: async () => ({ refusal: 'no_text' }) });
  await empty.actions.onEditMessage({ uuid: 'u2' }, 'x');
  assert.equal(empty.calls.toast[0][0], 'Messages without text, like ones with only images, can’t be edited or restarted from. Send what you need as a new message instead.');
  assert.deepEqual(empty.calls.send, []);
  const broken = harness({ rewind: async () => { throw new Error('ipc'); } });
  await broken.actions.onEditMessage({ uuid: 'u2' }, 'x');
  assert.equal(broken.calls.toast[0][0], EDIT_FAILED);
});

test('refusal retry (mk’s retryRequest effect): edit opens the editor on the last human message with the model; rewind restarts with it', async () => {
  const { actions, calls, editRefs } = harness();
  actions.onRefusalRetry({ kind: 'edit', modelOverride: 'claude-original' });
  assert.deepEqual(calls.editor, [['u2', { entryPoint: 'safety_warning', modelOverride: 'claude-original' }]]);
  assert.deepEqual(editRefs.refusalEdit.current, { messageUuid: 'u2', originalModel: 'claude-original', source: 'hard_block' });
  await actions.onEditMessage({ uuid: 'u2' }, 'reworded');
  assert.deepEqual(calls.send.at(-1), ['reworded', { model: 'claude-original' }], 'li.originalModel rides on the edit');
  assert.equal(editRefs.refusalEdit.current, null, 'li is consumed once');
  actions.onRefusalRetry({ kind: 'rewind', modelOverride: 'claude-sonnet-4-6' });
  await setImmediate(); await setImmediate();
  assert.deepEqual(calls.send.at(-1), ['old text', { model: 'claude-sonnet-4-6' }]);
});

test('a_ port matches the original with the host’s empty GrowthBook tables; _B and zk over host rows', () => {
  const shared7 = v1('shared-7-B8UIMGDr.js');
  const body = shared7.slice(shared7.indexOf('function a_('), shared7.indexOf('function o_('));
  const i_ = { fallbackModelName: 'claude-sonnet-4-6', displayName: 'Sonnet 4.6' };
  assert.equal(occurrences(shared7, 'r_={},i_={fallbackModelName:"claude-sonnet-4-6",displayName:"Sonnet 4.6"}'), 1);
  const nameFor = (id) => `Claude ${id}`;
  const original = new Function('$t', 'qe', 'r_', 'n_', 'i_', '_t', `${body};return a_;`)(() => ({ nameFor }), (a, b, def) => def, {}, null, i_, A.baseModelId);
  for (const sample of [{}, { stopReason: 'refusal', model: 'm' }, { stopReason: 'refusal', model: 'm', allowConfigFallbacks: true },
    { stopReason: 'refusal', model: 'm', stopDetails: { category: 'cyber' }, allowConfigFallbacks: true },
    { stopReason: 'refusal', model: 'm', stopDetails: { category: 'cyber' } },
    { stopReason: 'refusal', model: 'claude-x-20250101', stopDetails: { retry_suggestion: { model: 'claude-x' } } },
    { stopReason: 'refusal', model: 'm', stopDetails: { retry_suggestion: { model: 'claude-y' } } }])
    assert.deepEqual(A.refusalFallbackModel({ ...sample, nameFor }), original(sample), JSON.stringify(sample));
  const shared52 = v1('shared-52-DGviI8xb.js');
  assert.equal(occurrences(shared52, 'return e.stop_reason==="refusal"?{stopDetails:e.stop_details?.type==="refusal"?{category:e.stop_details.category??null,explanation:e.stop_details.explanation??null}:null,messageUuid:n.uuid,apiMessageId:e.id}:null'), 1);
  const refusal = { codeDesktop: { stopReason: 'refusal', stopDetails: { type: 'refusal', category: 'cyber', explanation: 'why' } } };
  const rows = [{ id: 'u1', type: 'userMessage' }, { id: 'msg_1:0', type: 'agentMessage', ...refusal }];
  assert.deepEqual(A.lastRefusal(rows), { stopDetails: { category: 'cyber', explanation: 'why' }, messageUuid: undefined, apiMessageId: 'msg_1' });
  assert.equal(A.lastRefusal([...rows, { id: 'u2', type: 'userMessage' }]), null);
  assert.equal(A.lastRefusal([{ id: 'u1', type: 'userMessage' }, { id: 'm:0', type: 'agentMessage' }]), null);
  assert.equal(A.lastRefusal([{ id: 'm:0', type: 'agentMessage', ...refusal }, { id: 't', type: 'dynamicToolCall', status: 'completed' }]), null);
  for (const needle of ['o=!!e&&!a&&!t&&!r&&!i&&!!Wt?.rewind&&!!Wt?.setModel', 'Pk="__gb__3790179635"',
    'if(!e||!h||!f||!E&&!y)return null;let D=E?b:void 0,O=D?.fallbackModelName;',
    'editRetry:l&&m?()=>{u({event_key:"claudeai.cowork.refusal_fallback.edit_retry_clicked",session_id:e,original_model:m,fallback_model:O??"",source:"hard_block"}),Nk.getState().requestRetry(e,m,"edit")}:void 0'])
    assert.equal(occurrences(shared7, needle), 1, needle);
  const requests = [];
  const state = A.coworkRefusalState({ sessionId: SESSION, items: rows, model: 'claude-opus[1m]', canRewind: true,
    hasModel: (id) => id === 'claude-sonnet-4-6', requestRetry: (model, kind) => requests.push([model, kind]) });
  assert.equal(state.model, 'claude-opus');
  assert.deepEqual(state.fallback, i_);
  state.retry(); state.editRetry();
  assert.deepEqual(requests, [['claude-sonnet-4-6', 'rewind'], ['claude-opus[1m]', 'edit']]);
  assert.equal(A.coworkRefusalState({ sessionId: SESSION, items: rows, model: 'claude-opus', canRewind: true, hasModel: () => false }), null,
    'no selectable fallback and no GrowthBook models table: no card data');
  const nonCyber = [{ id: 'm:0', type: 'agentMessage', codeDesktop: { stopReason: 'refusal', stopDetails: null } }];
  assert.equal(A.coworkRefusalState({ sessionId: SESSION, items: nonCyber, model: 'claude-opus', canRewind: true, hasModel: () => true }), null);
  const scheduled = A.coworkRefusalState({ sessionId: SESSION, items: rows, model: 'claude-opus', canRewind: true, scheduledTaskId: 't', hasModel: () => true });
  assert.equal(scheduled.retry, undefined); assert.equal(scheduled.editRetry, undefined);
});

test('session-service keeps a refused reply’s stop_reason / stop_details on its rows, and nothing for other replies', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-edit-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const host = new EventEmitter();
  host.request = async () => ({}); host.stop = async () => {};
  const service = new CoworkSessions({ dataDir, host, provider: async (model) => ({ model: model || 'test', env: {} }),
    approveFolder: async (cwd) => cwd, approval: async () => ({ decision: 'decline' }), emit: () => {} });
  const { thread } = await service.request('thread/start', { cwd: dataDir, model: 'test' });
  await service.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'go' }] }); await setImmediate();
  const message = (record) => host.emit('event', { event: 'message', sessionId: thread.id, record });
  message({ type: 'assistant', message: { id: 'm1', stop_reason: 'end_turn', content: [{ type: 'text', text: 'fine' }] } });
  const details = { type: 'refusal', category: 'cyber', explanation: 'blocked' };
  message({ type: 'assistant', message: { id: 'm2', stop_reason: 'refusal', stop_details: details, content: [{ type: 'text', text: 'no' }] } });
  const { thread: read } = await service.request('thread/read', { threadId: thread.id });
  const items = read.turns[0].items;
  assert.equal(items.find((item) => item.id === 'm1:0').codeDesktop, undefined);
  assert.deepEqual(items.find((item) => item.id === 'm2:0').codeDesktop, { stopReason: 'refusal', stopDetails: details });
  assert.deepEqual(A.lastRefusal(items).stopDetails, { category: 'cyber', explanation: 'blocked' });
  await service.stop();
});

test('userMessageActions / SourceUserActions: Edit on the last human message only, hidden while running', () => {
  const edits = [];
  const onEditFrom = (uuid) => edits.push(uuid);
  const last = userMessageActions({ turnId: 't', itemId: 'u2', onRestartFrom: () => {}, onEditFrom, isLastHuman: true });
  last.rewind.edit();
  assert.deepEqual(edits, ['u2']);
  assert.equal(userMessageActions({ turnId: 't', itemId: 'u1', onRestartFrom: () => {}, onEditFrom, isLastHuman: false }).rewind.edit, undefined);
  assert.equal(userMessageActions({ turnId: 't', itemId: 'u2', running: true, onRestartFrom: () => {}, onEditFrom, isLastHuman: true }).rewind.edit, undefined);
  assert.equal(userMessageActions({ turnId: 't', itemId: 'u2', onEditFrom, isLastHuman: true, rewindServed: true, onRewindTo: () => {} }).rewind.edit, undefined, 'Code sessions: no edit');
  const html = render(React.createElement(UserActions.SourceUserActions, { sessionKey: SESSION, itemId: 'u2', text: 'hi', interacted: true, rewind: last.rewind }));
  assert.match(html, /data-testid="user-message-edit"/);
  assert.match(html, /data-message-action="edit"[^>]*aria-label="Edit"|aria-label="Edit"[^>]*data-message-action="edit"/);
  const restartOnly = render(React.createElement(UserActions.SourceUserActions, { sessionKey: SESSION, itemId: 'u1', text: 'hi', interacted: true, rewind: { kind: 'restart', onClick() {} } }));
  assert.doesNotMatch(restartOnly, /user-message-edit/);
});

function fixture(component, props) {
  const cells = []; let cursor = 0;
  const dispatcher = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (next) => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useId() { return ':edit:'; }, useLayoutEffect() {}, useEffect() {},
  };
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
  const run = () => { cursor = 0; internals.H = dispatcher; try { return component(props); } finally { internals.H = old; } };
  return { run };
}
function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (!Array.isArray(tree) && predicate(tree)) return tree;
  for (const child of Array.isArray(tree) ? tree : Object.values(tree.props ?? {})) { const found = findNode(child, predicate); if (found) return found; }
  return null;
}

test('SourceUserMessageEdit: qY › WX editing DOM, the restart note, Save disabled until the text changes (HY)', () => {
  const html = render(React.createElement(Edit.SourceUserMessageEdit, { originalText: 'hello', onSave() {}, onClose() {} }));
  assert.match(html, /^<div class="pb-6" data-cowork-edit=""><div class="flex flex-col items-end"><div data-cds="UserMessage" class="group\/message-row flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end">/);
  assert.match(html, /class="relative flex min-w-0 flex-col gap-xs rounded-\[var\(--cds-message-bubble-radius\)\] px-\[var\(--cds-message-bubble-pad-x\)\] py-\[var\(--cds-message-bubble-pad-y\)\] text-heading font-normal break-words select-text text-primary max-w-\[var\(--cds-message-bubble-measure\)\] bg-surface-1 shadow-card-ring transition duration-fast focus-within:shadow-focus"/);
  assert.match(html, /<textarea data-cds="TextArea" rows="1" style="--cds-textarea-rows:1"[^>]*aria-label="Edit message"[^>]*>hello<\/textarea>/);
  const textarea = html.match(/<textarea[^>]*class="([^"]*)"/)[1].split(' ');
  for (const cls of ['cds-reset', 'w-full', 'block', 'resize-none', 'border-0', 'bg-transparent', 'p-0', 'shadow-none', '[field-sizing:content]',
    'max-h-[min(40svh,24rem)]', 'overflow-y-auto', 'text-heading', 'font-normal']) assert.ok(textarea.includes(cls), cls);
  assert.ok(!textarea.includes('text-body'), 'tailwind-merge: text-heading wins over the TextArea’s text-body');
  assert.match(html, /<div aria-hidden="true" data-find-omitted="" class="max-h-\[min\(40svh,24rem\)\] cds-text-entry-floored [^"]*\[@supports_\(field-sizing:content\)\]:hidden">hello​<\/div>/);
  assert.match(html, /<div class="flex items-center gap-xs" data-size="xs">/);
  assert.match(html, /aria-label="About saving"/);
  const buttons = [...html.matchAll(/<button[^>]*data-cowork-edit-action="(\w+)"[^>]*>/g)].map((m) => [m[1], /\sdisabled=""/.test(m[0])]);
  assert.deepEqual(buttons, [['cancel', false], ['save', true]]);
  assert.equal(Edit.editNote(Edit.editNoteKind({ isCoworkSession: true })), NOTE);
  assert.equal(Edit.editSaveDisabled({ currentEdit: 'hello', originalText: 'hello', requestedModelOverride: 'm' }), false, 'a model retry may resend the same text');
  assert.equal(Edit.editSaveDisabled({ currentEdit: '  ', originalText: 'hello' }), true);
  assert.equal(Edit.editSaveDisabled({ currentEdit: 'new', originalText: 'hello', isStreaming: true }), true);
});

test('SourceUserMessageEdit: typing, Enter saves (not while composing, not with Shift), Escape cancels', () => {
  const saved = [], closed = [];
  const view = fixture(Edit.SourceUserMessageEdit, { originalText: 'hello', request: { modelOverride: 'claude-x', entryPoint: 'safety_warning' },
    onSave: (text, options) => saved.push([text, options]), onClose: () => closed.push(true) });
  let tree = view.run();
  findNode(tree, (n) => n.type === 'textarea').props.onChange({ target: { value: 'hello there' } });
  tree = view.run();
  const field = findNode(tree, (n) => n.type === 'textarea');
  assert.equal(field.props.value, 'hello there');
  const key = (init) => ({ preventDefault() {}, stopPropagation() { this.stopped = true; }, currentTarget: { select() {} }, nativeEvent: {}, ...init });
  field.props.onKeyDown(key({ key: 'Enter', shiftKey: true }));
  field.props.onKeyDown(key({ key: 'Enter', nativeEvent: { isComposing: true } }));
  assert.deepEqual(saved, []);
  field.props.onKeyDown(key({ key: 'Enter' }));
  assert.deepEqual(saved, [['hello there', { modelOverride: 'claude-x', isModelRetry: true, entryPoint: 'safety_warning' }]]);
  assert.equal(closed.length, 1, 'R(): the editor closes once the edit is emitted');
  const escape = key({ key: 'Escape' });
  field.props.onKeyDown(escape);
  assert.equal(escape.stopped, true);
  assert.equal(closed.length, 2);
});

test('the edit store opens one edit per Cowork session', () => {
  Edit.coworkMessageEdits.start(SESSION, 'u2', { modelOverride: 'm' });
  assert.deepEqual(Edit.coworkMessageEdits.get(SESSION), { uuid: 'u2', entryPoint: 'human_message_hover', modelOverride: 'm', draft: undefined });
  assert.equal(Edit.coworkMessageEdits.get('cw-other'), null);
  Edit.coworkMessageEdits.clear(SESSION);
  assert.equal(Edit.coworkMessageEdits.get(SESSION), null);
});

test('zh-CN (CW-8): every new Cowork action string has an entry; "Claude" stays (D23)', () => {
  I18n.setLocale('zh-CN');
  try {
    for (const english of ['Restart conversation from here', NOTE, 'Edit message', 'About saving', 'You can edit your message and send it again.', EDIT_FAILED,
      'Couldn’t restart from this message. Try again.', 'Couldn’t retry. Try again.', 'Couldn’t restart from this message. Try again, or pick another message.',
      'Couldn’t confirm the rewind. If your message clears, re-send it from the composer.', 'This message can’t be restarted from here.',
      'Claude is still working on this task. Stop the task or let it finish, then try again.',
      'This task has queued messages waiting to send. Let them send, then try again.',
      'Right now this task can only be edited or restarted from its latest message. If a newer message isn’t shown here, reload the page.',
      'This task has a newer message than the ones shown here, possibly sent from another window. Reload the page, then try again.',
      'This message can’t be edited or restarted from: it was sent while Claude was still working on the previous one, or it is from an earlier part of a long task that has since been condensed.',
      'Couldn’t edit or restart from this message right now. Try again in a moment.',
      'This message can’t be edited or restarted from anymore. Send what you need as a new message instead.',
      'Messages without text, like ones with only images, can’t be edited or restarted from. Send what you need as a new message instead.',
      'Messages in this task can’t be edited or restarted from. Send what you need as a new message instead.',
      'Another message reached the session during the rewind, so the conversation was not rewound. Try the rewind again.',
      'Session started while the rewind was being checked', 'Go back', 'Edit', 'Cancel', 'Save'])
      assert.notEqual(I18n.t(english), english, english);
    assert.match(I18n.t('Claude is still working on this task. Stop the task or let it finish, then try again.'), /^Claude /);
  } finally { I18n.setLocale('en-US'); }
});

test('main.jsx wiring: the open edit replaces the user row; Edit and the editor go through ho', () => {
  const main = fsSync.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  for (const needle of [
    "import { SourceUserMessageEdit, coworkMessageEdits, useCoworkMessageEdit } from './source-user-message-edit.jsx';",
    'const coworkEdit = useCoworkMessageEdit(current);',
    'openEditor: (uuid, options) => coworkMessageEdits.start(current, uuid, options),',
    'const coworkLastHuman = coworkActions?.onEditMessage ? lastHumanMessage(state.items?.[current] || []) : undefined;',
    '{coworkEdit && coworkActions?.onEditMessage && item.type === "userMessage" && coworkEdit.uuid === item.id',
    'onSave={(text) => void coworkActions.onEditMessage({ uuid: item.id }, text)} onClose={() => coworkMessageEdits.clear(current)} />',
    'onEditFrom: coworkActions?.onEditMessage ? (uuid) => coworkMessageEdits.start(current, uuid) : null, isLastHuman: !!coworkLastHuman && coworkLastHuman.uuid === item.id,',
  ]) assert.equal(occurrences(main, needle), 1, needle);
});
