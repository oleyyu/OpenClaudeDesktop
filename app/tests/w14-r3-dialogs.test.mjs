// W14-code round 3, lane "dialogs" (data/w14code/round3/lanes/dialogs.json): the session-action strip off Code, the
// environment picker's ⌘⌥1…9 / ⌘⌥0 chords, the CDS text fields of the rename and review dialogs, the nested-sessions
// confirm's checkAll, the two dead Dialog caller rules and the Runs pane comment. Source-only: official chunks are read
// (never run), host modules are rendered with react-dom/server through Vite SSR, hooks through a test dispatcher.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { operationFailureToast, operationFailureReported, OPERATION_STOPPED } from '../src/session-operation-toast.mjs';
import { familyWorktreeProbe, sessionWorktreeGate } from '../src/sidebar-bulk-model.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const EN = JSON.parse(fs.readFileSync(path.join(V1, '../../i18n/en-US.json'), 'utf8'));
const chunk = (prefix) => fs.readFileSync(path.join(V1, fs.readdirSync(V1).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const source = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const main = source('src/main.jsx');
const tick = () => new Promise((resolve) => setImmediate(resolve));

let server, Menu, Nested, Actions, Checking, ViewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Menu = await server.ssrLoadModule('/src/source-environment-menu.jsx');
  Nested = await server.ssrLoadModule('/src/source-nested-sessions-confirm.jsx');
  Actions = await server.ssrLoadModule('/src/source-session-actions.jsx');
  Checking = await server.ssrLoadModule('/src/generated/files-changes/worktree-checking.mjs');
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

function withGlobals(values, run) {
  const saved = Object.keys(values).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  for (const [name, value] of Object.entries(values)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const restore = () => { for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } };
  try { const result = run(); if (result?.then) return result.finally(restore); restore(); return result; } catch (error) { restore(); throw error; }
}

// One hook's state over a deterministic store; effects run on flush().
function hookFixture(hook, props) {
  const cells = [], pending = []; let cursor = 0, value, dirty = false;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const dispatcher = {
    useContext(context) { return context._currentValue; },
    useState(initial) { const index = cursor++; if (!cells[index]) cells[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [cells[index].value, (next) => { const v = typeof next === 'function' ? next(cells[index].value) : next; if (!Object.is(v, cells[index].value)) { cells[index].value = v; dirty = true; } }]; },
    useRef(initial) { const index = cursor++; if (!cells[index]) cells[index] = { value: { current: initial } }; return cells[index].value; },
    useMemo(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) cells[index] = { value: fn(), deps }; return cells[index].value; },
    useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const index = cursor++; if (!cells[index] || !same(cells[index].deps, deps)) { const previous = cells[index]; cells[index] = { deps }; pending.push(() => { previous?.cleanup?.(); cells[index].cleanup = fn(); }); } },
    useLayoutEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
  };
  function render(next = props) {
    props = next;
    for (let pass = 0; pass < 5; pass++) {
      cursor = 0; dirty = false;
      const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
      internals.H = withMemoCache(dispatcher);
      try { value = hook(props); } finally { internals.H = previous; }
      if (!dirty) break;
    }
    return value;
  }
  render();
  return { render, get value() { return value; }, flush() { for (const effect of pending.splice(0)) effect(); return render(); }, close() { for (const cell of cells) cell?.cleanup?.(); } };
}

// ---- css3-operation-status-band ------------------------------------------------------------------------------------

test('css3-operation-status-band: official has no strip copy; Code draws none, Chat/Cowork keep it', () => {
  const english = new Set(Object.values(EN));
  for (const text of ['Conversation compacted', 'Session forked', 'Compacting conversation…', 'Reviewing code…']) assert.ok(!english.has(text), text);
  assert.equal(EN['FIEdqIul1I'], 'Compacting session…');
  assert.equal(EN['dKe/N6RHQF'], 'Review complete');
  assert.equal(EN['VT/e+bRysY'], 'Forking session…');
  assert.equal(EN['3bTkOUOo8n'], 'Forking session with your prompt…');
  assert.match(main, /\{mode !== "code" && operation && <div className="session-operation-status" role="status"/);
  // style.css's disabled-colour keep list no longer names it (its button now takes the layered base reset's colour).
  const style = source('src/style.css');
  assert.ok(!style.includes('.session-operation-status'));
  assert.ok(source('src/source-session-actions.css').includes('.session-operation-status button{background:transparent;border:0}'));
});

test('css3-operation-status-band: Code fork progress is caec4a2d4 lr\'s 400 ms info toast, cleared when the fork settles', () => {
  const lr = chunk('caec4a2d4-');
  assert.ok(lr.includes('Xn=400'));
  assert.match(lr, /r=setTimeout\(\(\)=>\{n=s\(t\.autoSubmit\?i\.formatMessage\(\{defaultMessage:"Forking session with your prompt\\u2026",id:"3bTkOUOo8n"\}\):i\.formatMessage\(\{defaultMessage:"Forking session\\u2026",id:"VT\/e\+bRysY"\}\),\{timeout:1\/0\}\)\},Xn\);return\(\)=>\{clearTimeout\(r\),n!==void 0&&c\(n\)\}/);
  assert.ok(main.includes('const FORK_TOAST_DELAY_MS = 400;'));
  assert.ok(main.includes('toasts.add(autoSubmit ? t("Forking session with your prompt…") : t("Forking session…"), { variant: "neutral", timeout: Infinity, dedupe: false })'));
  assert.ok(main.includes('return () => { clearTimeout(timer); if (id !== null) toasts.close(id); };'));
  assert.ok(main.includes('const stopForkToast = operation === "fork" ? forkingToast(autoSubmit) : () => {};'));
  assert.ok(main.includes('} finally { actionLock.current.delete(id); stopForkToast(); settleOperationCall(id, thrown); }'));
  assert.ok(main.includes('} finally { actionLock.current.delete(target.id); stopForkToast(); settleOperationCall(target.id, thrown); }'));
  assert.ok(main.includes('const result=await performOperation("fork",{},{autoSubmit:!!args});'));
  // compact in progress: the working line already says "Compacting session…" (transcript-runtime-stats).
  assert.ok(source('src/transcript-runtime-stats.mjs').includes("label: t('Compacting session…')"));
});

test('css3-operation-status-band: a failed or unconfirmed action becomes a toast once (E93: nothing the strip said is lost)', () => {
  const fallback = 'Session action failed.';
  assert.deepEqual(operationFailureToast({ phase: 'failed', error: 'Error invoking remote method \'desktop:call\': Error: boom' }, fallback), { message: 'boom', variant: 'danger', dismiss: true });
  assert.deepEqual(operationFailureToast({ phase: 'failed', error: null }, fallback), { message: fallback, variant: 'danger', dismiss: true });
  assert.deepEqual(operationFailureToast({ phase: 'unknown', error: 'Codex has not confirmed this task.' }, fallback), { message: 'Codex has not confirmed this task.', variant: 'warning', dismiss: false });
  assert.deepEqual(operationFailureToast({ phase: 'failed', error: OPERATION_STOPPED }, fallback), { message: null, variant: null, dismiss: true });
  for (const phase of ['starting', 'running', 'completed']) assert.equal(operationFailureToast({ phase }, fallback), null);
  // W14-code r4-shared-01 (E95 over E93): a failed fork / compact is the official addError copy, the raw reason only
  // logged — caec4a2d4 fork onError nGtjMsYWZD, c6b8adeaf no() j49tT4QevF. A review keeps the core text / fallback.
  assert.ok(chunk('caec4a2d4').includes('defaultMessage:"Couldn\\u2019t fork this session.",id:"nGtjMsYWZD"'));
  assert.ok(/defaultMessage:"Couldn\\u2019t start compacting\.",id:"j49tT4QevF"\}\),\{messageForLogging:`\$\{e\}_send_failed`/.test(chunk('c6b8adeaf')));
  assert.deepEqual(operationFailureToast({ operation: 'fork', phase: 'failed', error: 'Error: boom' }, fallback), { message: 'Couldn’t fork this session.', variant: 'danger', dismiss: true, log: 'Error: boom' });
  assert.deepEqual(operationFailureToast({ operation: 'compact', phase: 'failed', error: null }, fallback, (text) => `[${text}]`), { message: '[Couldn’t start compacting.]', variant: 'danger', dismiss: true, log: null });
  assert.deepEqual(operationFailureToast({ operation: 'review', phase: 'failed', error: 'boom' }, fallback), { message: 'boom', variant: 'danger', dismiss: true });
  assert.deepEqual(operationFailureToast({ operation: 'fork', phase: 'unknown', error: 'Codex has not confirmed this task.' }, fallback), { message: 'Codex has not confirmed this task.', variant: 'warning', dismiss: false });
  assert.deepEqual(operationFailureToast({ operation: 'compact', phase: 'failed', error: OPERATION_STOPPED }, fallback), { message: null, variant: null, dismiss: true });
  assert.ok(main.includes('const toast = operationFailureToast(op, t("Session action failed."), t);'));
  assert.ok(main.includes('if (id === "fork") { console.warn("epitaxy: fork failed", cleanErrorReason(error)); if (sequence === loadSeq.current) notice(t(ACTION_ERROR_COPY.fork), { variant: "danger" }); return; }'));
  assert.equal(main.match(/performOperation\("compact"\)\.catch\(\(e\) => compactCallFailed\(e\)\)/g).length, 2);
  assert.ok(!main.includes('performOperation("compact").catch((e) => { if (toasts) toasts.add(e.message'));
  assert.equal(OPERATION_STOPPED, 'Task stopped.');
  assert.ok(source('electron/session-operations.cjs').includes("turn.status === 'interrupted' ? 'Task stopped.' : null"));
  // The caller already reported a thrown failure of the same text.
  assert.equal(operationFailureReported({ error: 'boom' }, 'boom'), true);
  assert.equal(operationFailureReported({ error: 'boom' }, "Error invoking remote method 'desktop:call': boom"), true);
  assert.equal(operationFailureReported({ error: 'later' }, 'boom'), false);
  assert.equal(operationFailureReported({ error: 'boom' }, undefined), false);
  // main.jsx: Code only; an event while the call is in flight waits for it (settleOperationCall).
  assert.ok(main.includes('if (mode !== "code" || !toasts) return;'));
  assert.ok(main.includes('if (actionLock.current.has(id)) { heldOperationFailures.current.set(id, op); continue; }'));
  assert.ok(main.includes('if (toast.message && toasts) toasts.add(toast.message, { variant: toast.variant });'));
});

// ---- r3-shared-02 ---------------------------------------------------------------------------------------------------

const env = (id, name, lastUsedAt = 0) => ({ id, name, lastUsedAt, target: { kind: 'local', cwd: `/w/${id}` } });

test('r3-shared-02: h2 mr — Starred places, then This computer and the first unstarred environment', () => {
  const environments = [env('a', 'Alpha', 10), env('b', 'Beta', 30), env('c', 'Gamma', 20)];
  const keys = (options) => Menu.environmentChordPlaces({ environments, computerName: 'This computer', ...options }).map((place) => `${place.key}:${place.selected}`);
  assert.deepEqual(keys({ starred: [] }), ['local:this-computer:true', 'preset:b:false']);
  assert.deepEqual(keys({ starred: ['preset:a', 'local:this-computer'], selectedId: 'a' }), ['preset:a:true', 'local:this-computer:false', 'preset:b:false']);
  assert.deepEqual(keys({ starred: ['preset:b'] }), ['preset:b:false', 'local:this-computer:true', 'preset:c:false']);
  const official = chunk('cc43287c9-');
  assert.ok(official.includes('var kae=[...La.map(e=>`selectPreset${e}`),"newPreset"]'));
  assert.ok(official.includes('dn&&(hr(vr),Ln.forEach(e=>hr(yr(e))))'));
});

test('r3-shared-02: c8 — ⌘⌥N picks the Nth place, ⌘⌥0 New environment, with "{name} selected" once it is the selection', () => {
  let keydown = null;
  const view = { addEventListener: (type, fn, capture) => { if (type === 'keydown' && capture === true) keydown = fn; }, removeEventListener: (type, fn) => { if (keydown === fn) keydown = null; } };
  const doc = { activeElement: null, getElementById: () => null, querySelectorAll: () => [] };
  view.document = doc;
  withGlobals({ window: view, document: doc, navigator: { platform: 'MacIntel', userAgent: 'Macintosh' } }, () => {
    const picks = [], created = [];
    const props = (selectedId, shortcutsActive = true) => ({ environments: [env('a', 'Alpha', 10), env('b', 'Beta', 30)], starred: [], selectedId,
      onSelect: (id) => picks.push(id), onLocal: () => picks.push('local'), onNew: () => created.push('new'), shortcutsActive, menu: { rootPopup: () => null, close: () => {} } });
    const f = hookFixture(Menu.useEnvironmentChords, props(undefined));
    f.flush();
    assert.equal(typeof keydown, 'function');
    assert.equal(f.value.shortcutFor('local:this-computer'), 'cmd+alt+1');
    assert.equal(f.value.shortcutFor('preset:b'), 'cmd+alt+2');
    assert.equal(f.value.shortcutFor('preset:a'), undefined, 'More holds a: no chord');
    assert.equal(f.value.newShortcut, 'cmd+alt+0');
    const press = (code, extra = {}) => { const event = { code, metaKey: true, altKey: true, ctrlKey: false, shiftKey: false, repeat: false, isComposing: false, defaultPrevented: false, prevented: 0,
      preventDefault() { this.prevented++; }, stopPropagation() {}, getModifierState: () => false, ...extra }; keydown(event); return event; };
    assert.equal(press('Digit2').prevented, 1);
    assert.deepEqual(picks, ['b']);
    assert.equal(press('Digit5').prevented, 0, 'no fifth place: the key goes on');
    assert.equal(press('Digit0').prevented, 1);
    assert.deepEqual(created, ['new']);
    assert.equal(press('Digit1', { repeat: true }).prevented, 1);
    assert.deepEqual(picks, ['b'], 'a held chord is claimed but picks nothing');
    // The pick becomes the selection: the status names it.
    f.render(props('b'));
    assert.deepEqual(f.value.chordPicked, { id: 'preset:b', name: 'Beta' });
    assert.equal(renderToStaticMarkup(React.createElement(Menu.EnvironmentChordStatus, { picked: f.value.chordPicked })), '<span role="status" class="sr-only">Beta selected</span>');
    // Another layer open: nothing.
    doc.querySelectorAll = () => [{ closest: () => null, contains: () => false, checkVisibility: () => true }];
    assert.equal(press('Digit1').prevented, 0);
    // Off the start page (shortcutsActive false): no listener, no row chords.
    f.render(props('b', false)); f.flush();
    assert.equal(keydown, null);
    assert.equal(f.value.shortcutFor('local:this-computer'), undefined);
    f.close();
  });
  assert.ok(main.includes('const environmentChords = useEnvironmentChords({'));
  assert.ok(main.includes('shortcutsActive: mode === "code" && !current && splitActive && savedEnvironments.ready && hostGrowthBookFlag("claudeai_cc_epitaxy_session_presets_main"),'));
  assert.ok(main.includes('<EnvironmentChordStatus picked={environmentChords.chordPicked} />'));
  assert.ok(main.includes('error={savedEnvironments.error} chords={environmentChords}'));
});

test('r3-shared-02: the picker rows show their chords (Ar), More rows none, New environment ⌘⌥0', () => {
  const items = [{ id: 'a', icon: 'Laptop', name: 'Alpha', target: { kind: 'local' } }, { id: 'b', icon: 'Laptop', name: 'Beta', target: { kind: 'local' } }];
  const chords = { shortcutFor: (key) => ({ 'local:this-computer': 'cmd+alt+1', 'preset:a': 'cmd+alt+2' })[key], newShortcut: 'cmd+alt+0' };
  const html = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, { query: '', items, starred: [], selectedId: undefined, onSelect() {}, onEdit() {}, onCreate() {}, onLocal() {}, onVariables() {}, chords }));
  assert.match(html, /data-testid="env-picker-this-computer"[^>]*aria-keyshortcuts="Meta\+Alt\+1"/);
  assert.match(html, /aria-keyshortcuts="Meta\+Alt\+2"/);
  assert.match(html, /aria-keyshortcuts="Meta\+Alt\+0"[^>]*data-testid="env-picker-new-environment"|data-testid="env-picker-new-environment"[^>]*aria-keyshortcuts="Meta\+Alt\+0"/);
  const without = renderToStaticMarkup(React.createElement(Menu.EnvironmentPickerBody, { query: '', items, starred: [], onSelect() {}, onEdit() {}, onCreate() {}, onLocal() {}, onVariables() {} }));
  assert.ok(!without.includes('aria-keyshortcuts'));
  assert.ok(source('src/source-environment-menu.jsx').includes('{rest.map(item => row(item, false))}'));
});

// ---- css3-dialog-text-fields ---------------------------------------------------------------------------------------

test('css3-dialog-text-fields: Rename session is shared-16\'s TextInput in a "grid gap-2" form; the host field rules are gone', () => {
  const official = chunk('shared-16-');
  assert.ok(official.includes('a(L,{"data-testid":"name-session",ref:y,"aria-label":O,defaultValue:d,onChange:P,onFocus:E})'));
  assert.ok(official.includes('u("form",{className:"grid gap-2",onSubmit:M,children:[F,I,V]})'));
  const at = main.indexOf('<form className="rename-session-form grid gap-2"');
  assert.ok(at > 0);
  const block = main.slice(at, main.indexOf('</form>', at));
  assert.ok(block.includes('<CdsTextInput\n              ref={renameInput}\n              data-testid="name-session"'));
  assert.ok(block.includes('onFocus={(e) => { if (!renameSelected.current) { renameSelected.current = true; e.target.select(); } }}'), 'first focus still selects the name');
  assert.ok(!source('src/style.css').includes('.rename-session-form input'));
});

test('css3-dialog-text-fields: Review code\'s fields are the CDS TextInput / TextArea; the target stays a SourceSelect', () => {
  // The CDS fields themselves (view-tabs CdsTextInput / CdsTextArea) render the official field classes.
  const input = renderToStaticMarkup(React.createElement(ViewTabs.CdsTextInput, { 'aria-label': 'Commit', value: '', onChange() {} }));
  assert.match(input, /<input[^>]*data-cds="TextInput"[^>]*class="[^"]*cds-input cds-reset[^"]*bg-fill-field shadow-field-ring/);
  const area = renderToStaticMarkup(React.createElement(ViewTabs.CdsTextArea, { 'aria-label': 'Review instructions', rows: 5, value: '', onChange() {} }));
  assert.match(area, /<textarea[^>]*class="[^"]*shadow-field-ring/);
  const jsx = source('src/source-session-actions.jsx');
  for (const field of ['<CdsTextInput aria-label={t("Base branch")} list="review-branches"', '<CdsTextInput aria-label={t("Commit")}', '<CdsTextInput aria-label={t("Pull request")}', '<CdsTextArea aria-label={t("Review instructions")}'])
    assert.ok(jsx.includes(field), field);
  assert.ok(!/<input aria-label=\{t\("(Base branch|Commit|Pull request)"\)/.test(jsx));
  // The hand-copied ring stays for the other action dialogs' native fields, never over a CDS field.
  const sheet = source('src/source-session-actions.css');
  assert.ok(sheet.includes('.session-action-dialog input:where(:not(.shadow-field-ring)),.session-action-dialog select:where(:not(.shadow-field-ring)),.session-action-dialog textarea:where(:not(.shadow-field-ring)){'));
  const frame = source('src/generated/view-tabs/shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('JS="bg-fill-field shadow-field-ring data-[invalid]:shadow-field-invalid"'));
});

// ---- fr3-03 ----------------------------------------------------------------------------------------------------------

test('fr3-03: official checkAll — the family probe, a six-second answer, the busy strip', () => {
  const x = chunk('c48ea26ad-');
  assert.ok(x.includes('checkAll:i==="delete"?()=>(d=g(q(e,i))).done:void 0'));
  const ba = chunk('shared-20-');
  assert.ok(ba.includes('MA=6e3'));
  assert.ok(ba.includes('if(e!=="all"||!a.checkAll){p(a,e);return}let t=()=>p(a,"all");_(a.id),c.current?.(),c.current=ur(a.checkAll(),null,{checking:UA,deadline:t,answer:t,deadlineMs:MA})'));
  const body = chunk('ca674e66a-');
  assert.ok(body.includes('m&&e(o,{afterHeader:!0,hold:d?"reveal":"reserve"})'));
  assert.ok(body.includes('disabled:d,disabledReason:k,autoFocus:!0'));
  assert.equal(Nested.NESTED_CHECK_DEADLINE_MS, 6000);
});

test('fr3-03: settleAfterCheck answers once, on the reads or at the deadline, and cancels', async () => {
  const timers = [];
  const schedule = (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, cancel = (id) => { if (timers[id - 1]) timers[id - 1].fn = null; };
  let answered = 0, release;
  const stop = Nested.settleAfterCheck(new Promise((resolve) => { release = resolve; }), { answer: () => answered++, schedule, cancel });
  assert.equal(timers[0].ms, 6000);
  release(); await tick();
  assert.equal(answered, 1);
  timers[0].fn?.();
  assert.equal(answered, 1, 'the deadline after the answer does nothing');
  let late = 0;
  Nested.settleAfterCheck(new Promise(() => {}), { answer: () => late++, schedule, cancel });
  timers[1].fn();
  assert.equal(late, 1, 'reads that never settle: the deadline answers');
  let cancelled = 0;
  const stopIt = Nested.settleAfterCheck(Promise.resolve(), { answer: () => cancelled++, schedule, cancel });
  stopIt(); await tick();
  assert.equal(cancelled, 0);
  stop();
});

test('fr3-03: the delete confirm reserves the checking strip; the archive one has none', () => {
  // shared-46 Oi (generated WorktreeChecking): reserved (invisible, no shimmer) until "all" checks, then revealed.
  const reserve = renderToStaticMarkup(React.createElement(Checking.WorktreeChecking, { afterHeader: true, hold: 'reserve' }));
  assert.match(reserve, /^<p class="text-footnote text-muted-as-secondary invisible">/);
  const reveal = renderToStaticMarkup(React.createElement(Checking.WorktreeChecking, { afterHeader: true, hold: 'reveal' }));
  assert.match(reveal, /^<p class="text-footnote text-muted-as-secondary animate-placeholder-reveal" aria-busy="true">/);
  assert.ok(reveal.includes('Checking for uncommitted changes…'));
  const jsx = source('src/source-nested-sessions-confirm.jsx');
  assert.ok(jsx.includes('{remove && <WorktreeChecking afterHeader hold={checking ? "reveal" : "reserve"} />}'));
  assert.ok(jsx.includes('<CdsButton variant="secondary" busy={checking} busyLabel={checkingLabel} onClick={() => answer("all")}>'));
  assert.ok(jsx.includes('disabled={checking} disabledReason={remove ? checkingLabel : undefined}'));
  assert.ok(jsx.includes('if (!request || (value && request.id === checkingId)) return;'));
});

test('fr3-03: familyWorktreeProbe reads every member (≤ 8 at once) and each member\'s gate takes its read', async () => {
  const calls = [];
  let open = 0, peak = 0;
  const call = (channel, { threadId }) => { calls.push([channel, threadId]); open++; peak = Math.max(peak, open);
    return new Promise((resolve) => setTimeout(() => { open--; resolve(threadId === 'bad' ? Promise.reject(new Error('x')) : { worktree: `/wt/${threadId}`, changes: threadId === 'dirty' ? 2 : 0 }); }, 1)); };
  const ids = Array.from({ length: 10 }, (_, index) => `s${index}`).concat(['dirty', 'bad']);
  const probe = familyWorktreeProbe(ids, call);
  await probe.done;
  assert.equal(calls.length, 12);
  assert.ok(peak <= 8, `peak ${peak}`);
  assert.deepEqual(await probe.statusFor('s3'), { worktree: '/wt/s3', changes: 0 });
  assert.equal(await probe.statusFor('bad'), null);
  assert.equal(probe.statusFor('other'), undefined);
  // The gate takes the read instead of asking main again.
  const gateCalls = [];
  const host = { call: (...args) => { gateCalls.push(args); return Promise.resolve(null); }, enqueue: async () => true };
  assert.deepEqual(await sessionWorktreeGate('delete', { id: 's3' }, { probed: probe.statusFor('s3') }, host), { worktree: '/wt/s3', changes: 0 });
  assert.deepEqual(await sessionWorktreeGate('delete', { id: 'dirty' }, { probed: probe.statusFor('dirty') }, host), { worktree: '/wt/dirty', changes: 2 });
  assert.equal(gateCalls.length, 0);
  // main.jsx wiring.
  assert.ok(main.includes('const probe = familyWorktreeProbe([...family.nested, target.id], call);'));
  assert.ok(main.includes('const checkAll = action === "delete" ? () => {'));
  // W14-code r5 R5DC-06: the member check goes through Be's merge (check → sessionWorktree with mergeUnknown on a delete).
  assert.ok(main.includes('const worktree = await check(member, probed);'));
  assert.ok(main.includes('if (!merge) return sessionWorktree(action, member, probed ? { probed } : {});'));
  assert.ok(main.includes('probe={() => nestedFamilyProbes.current.get(shownConfirmDelete.value.id)?.statusFor(shownConfirmDelete.value.id) ?? call("worktree-status", { threadId: shownConfirmDelete.value.id })}'));
});

// ---- r3-shared-03 / r3pa-02 ------------------------------------------------------------------------------------------

test('r3-shared-03: the Dialog callers\' dead rules are gone (no .sdlg-popup max-height or overflow left to undo)', () => {
  assert.ok(!source('src/source-saved-environment-dialog.css').includes('max-height: revert-layer'));
  const actions = source('src/source-session-actions.css');
  assert.ok(actions.includes('.sdlg-popup.shortcuts-dialog{height:100dvh}'));
  assert.ok(!actions.includes('shortcuts-dialog{height:100dvh;overflow:hidden}'));
  const dialogCss = source('src/source-dialog.css');
  assert.ok(!/\.sdlg-popup[^{]*\{[^}]*(max-height|overflow)/.test(dialogCss));
  assert.ok(chunk('shared-frame-').includes('isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl break-words'));
});

test('r3pa-02: the Runs pane header says what pa2-05 wired (⌘/Ctrl-click window, ⌥-click split view)', () => {
  const runs = source('src/source-runs-pane.jsx');
  assert.ok(!runs.includes('are not offered here'));
  assert.ok(runs.includes('⌘/Ctrl-click opens it in a new window and ⌥-click in split view'));
  assert.ok(main.includes('if (command && windowActions.onOpenWindow) { windowActions.onOpenWindow({ id }); return; }'));
});

// Review fix (r3-dialogs.review.md issue 1): the e2e scripts that waited for Code's strip ([data-operation][data-phase])
// now read a compact / review from the fixture core or the recorded session-operation events, since 3.6556.2 Code has
// no strip (main.jsx renders it only outside Code). Source-only: the scripts are read, not run.
test('css3-operation-status-band: no e2e script waits for the Code strip any more', () => {
  const scripts = ['turn-errors-ui-test.mjs', 'session-actions-ui-test.mjs', 'session-actions-live.mjs', 'review-stop-live.mjs'];
  for (const name of scripts) {
    const text = source(`scripts/${name}`);
    assert.ok(!/locator\([^)]*data-operation=/.test(text), name);
    assert.ok(!text.includes('[data-operation="${operation}"]'), name);
  }
  const errors = source('scripts/turn-errors-ui-test.mjs');
  assert.ok(errors.includes(`'"method":"thread/compact/start"'),'thread/compact/start reached the core'`));
  assert.ok(errors.includes(`assert.equal(await page.locator('.session-operation-status').count(),0,'Code shows no session-action strip');`));
  const actions = source('scripts/session-actions-ui-test.mjs');
  assert.ok(actions.includes(`await coreTurnEnds(original,compactBase,'completed','compact turn completed');`));
  assert.equal(actions.split(`await coreTurnEnds(fork,reviewBase++,'completed','review turn completed');`).length - 1, 3);
  assert.ok(actions.includes(`await coreTurnEnds(fork,reviewBase++,'interrupted','held review interrupted');`));
  assert.ok(actions.includes(`getByRole('dialog',{name:'Review code',exact:true}).getByRole('alert').waitFor();await page.keyboard.press('Escape');`));
  // The fixture saves a turn's final status before notifying, so a polled 'completed' / 'interrupted' is the core's.
  const fixture = source('tests/fixtures/session-actions-server.cjs');
  assert.match(fixture, /turn\.status=status;thread\.status=\{type:'idle'\};save\(\);\n for\(const item of turn\.items\)notify/);
  assert.ok(source('scripts/session-actions-live.mjs').includes(`e.kind==='session-operation'&&e.operation===operation`));
  assert.ok(source('scripts/review-stop-live.mjs').includes(`return last?.phase==='failed'&&/Task stopped/.test(last.error||'');`));
  // Stopped is the session-operations.cjs completeTurn text the toast model skips.
  assert.equal(OPERATION_STOPPED, 'Task stopped.');
  assert.ok(source('electron/session-operations.cjs').includes(`turn.status === 'interrupted' ? 'Task stopped.' : null`));
});
