import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {
  isQuestionPickKey,
  questionArrowIndex,
  questionCardKey,
  questionCardKeyDown,
  QUESTION_DIALOG_SELECTOR,
} from '../src/approval-draft-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { fakeWindow } from './fixtures/approval-landing-dom.mjs';

// L26 / HS-11 / E23 (w10-trans-question-keys): the AskUserQuestion card's digit 1..N+1 and arrow keys, after 3.6556.2
// c9ed5627b-BSPWYeYQ dt (`onKeyDown: yn`) and the question hook's handleKeyDown q (c8cf7b513-B-eZCy_c m), with rt
// (generated markCardPick) called first so a deliberate pick on a landed card lets the next deliberate ↵ through.
const ROOT = path.resolve(import.meta.dirname, '..');
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const V2 = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('official 3.6556.2 source: yn calls rt before q for digits 1..N+1 and arrows; q picks, moves and submits', () => {
  const card = raw(V3, 'c9ed5627b-BSPWYeYQ.js');
  assert.equal(count(card, '(e.key==="ArrowDown"||e.key==="ArrowUp"||/^[1-9]$/.test(e.key)&&Number(e.key)<=t+1)&&!rt(e.nativeEvent,E)||At(e)'), 1);
  assert.equal(count(card, 'function rt(e,t){let n=D.get(m(l(e.target)));return n?.onCard===!0?nt(e)?(t&&(n.picked=!0),!0):!1:!0}'), 1);
  assert.equal(count(card, 'function vt(e){(e.key==="ArrowUp"||e.key==="ArrowDown")&&e.stopPropagation()}'), 1, 'the Other field keeps its arrows');
  assert.equal(count(card, 'handleKeyDown:At'), 1);
  assert.equal(count(card, 'isHighlighted:J&&L===n'), 1, 'only a multiSelect row draws the highlight');
  const hook = raw(V3, 'c8cf7b513-B-eZCy_c.js');
  assert.equal(count(hook, 'if(!t&&a>=1&&a<=n){e.preventDefault(),e.stopPropagation(),e.nativeEvent.stopImmediatePropagation(),L?R(a-1):x(new Set([a-1])),C(a-1);return}'), 1);
  assert.equal(count(hook, 'if(!t&&a===i){e.preventDefault(),e.stopPropagation(),e.nativeEvent.stopImmediatePropagation(),L?R(-1):x(new Set([-1])),C(-1);return}'), 1);
  assert.equal(count(hook, 't=n===0?-1:e.key==="ArrowDown"?S===null||S===-1?0:S===n-1?-1:S+1:S===null?-1:S===-1?n-1:S===0?-1:S-1'), 1);
  assert.equal(count(hook, 'r(e.target)?.matches("button, a")'), 1);
  // E: enableDigitShortcuts is `defaultToNo !== true` where the approval area builds the card props (cc32965c2).
  const area = raw(V3, 'cc32965c2-BQu1bA_w.js');
  assert.ok(count(area, 'enableDigitShortcuts:') >= 2);
  assert.ok(count(area, 'defaultToNo!==!0') >= 2);
  // 2.42304.0 had neither the card's digit path nor rt's pick mark.
  assert.equal(count(raw(V2, 'ccae33cda-DCEu0VuC.js'), '/^[1-9]$/.test(e.key)'), 0);
});

test('isQuestionPickKey: arrows, and digits 1..N+1 (N when the card draws no Other)', () => {
  const k = key => ({ key });
  assert.equal(isQuestionPickKey(k('ArrowDown'), 3), true);
  assert.equal(isQuestionPickKey(k('ArrowUp'), 0), true);
  assert.equal(isQuestionPickKey(k('1'), 3), true);
  assert.equal(isQuestionPickKey(k('4'), 3), true, 'N+1 is Other');
  assert.equal(isQuestionPickKey(k('5'), 3), false);
  assert.equal(isQuestionPickKey(k('0'), 3), false);
  assert.equal(isQuestionPickKey(k('4'), 3, false), false, 'no Other row, no N+1');
  assert.equal(isQuestionPickKey(k('Enter'), 3), false);
  assert.equal(isQuestionPickKey(k('12'), 9), false);
});

test('questionArrowIndex follows q, Other (-1) sitting after the last row', () => {
  assert.deepEqual([null, 0, 1, 2, -1].map(h => questionArrowIndex('ArrowDown', h, 3)), [0, 1, 2, -1, 0]);
  assert.deepEqual([null, 0, 1, 2, -1].map(h => questionArrowIndex('ArrowUp', h, 3)), [-1, -1, 0, 1, 2]);
  assert.equal(questionArrowIndex('ArrowDown', null, 0), -1, 'no rows: Other');
  assert.deepEqual([null, 0, 2].map(h => questionArrowIndex('ArrowDown', h, 3, false)), [0, 1, 0], 'no Other: wraps');
  assert.deepEqual([null, 0, 2].map(h => questionArrowIndex('ArrowUp', h, 3, false)), [2, 2, 1]);
});

const keyOn = (key, fields = {}) => ({ key, target: { nodeType: 1, matches: () => false }, shiftKey: false, metaKey: false,
  ctrlKey: false, nativeEvent: { isComposing: false }, ...fields });
test('questionCardKey: digits pick, N+1 is Other, arrows move, ↵ advances or toggles; buttons and the Other field keep keys', () => {
  const single = { optionCount: 3, hasOther: true, multiSelect: false, highlighted: null, selected: false };
  assert.deepEqual(questionCardKey(keyOn('2'), single), { type: 'pick', index: 1 });
  assert.deepEqual(questionCardKey(keyOn('4'), single), { type: 'pick', index: -1 });
  assert.equal(questionCardKey(keyOn('4'), { ...single, hasOther: false }), null);
  assert.equal(questionCardKey(keyOn('5'), single), null);
  assert.deepEqual(questionCardKey(keyOn('ArrowDown'), { ...single, highlighted: 2 }), { type: 'move', index: -1 });
  assert.equal(questionCardKey(keyOn('Enter'), single), null, 'nothing chosen: ↵ is not taken');
  assert.deepEqual(questionCardKey(keyOn('Enter'), { ...single, selected: true }), { type: 'advance' });
  assert.equal(questionCardKey(keyOn('Enter', { shiftKey: true }), { ...single, selected: true }), null);
  assert.equal(questionCardKey(keyOn('Enter', { nativeEvent: { isComposing: true } }), { ...single, selected: true }), null);
  assert.deepEqual(questionCardKey(keyOn('Enter'), { ...single, selected: true, inOther: true }), { type: 'advance' },
    'single-select: ↵ in the Other field submits, as q does');
  assert.equal(questionCardKey(keyOn('Enter'), { ...single, optionCount: 0, selected: true, inOther: true }), null,
    'a free-form answer (local only) keeps ↵ as a new line');
  assert.equal(questionCardKey(keyOn('1'), { ...single, inOther: true }), null, 'digits type into the Other field');
  const button = { nodeType: 1, matches: selector => selector === 'button, a' };
  assert.equal(questionCardKey(keyOn('1', { target: button }), single), null, 'an option / action button keeps its keys');
  assert.equal(questionCardKey(keyOn('Enter', { target: { nodeType: 3, parentElement: button } }), { ...single, selected: true }), null);
  const multi = { ...single, multiSelect: true };
  assert.deepEqual(questionCardKey(keyOn('3'), multi), { type: 'pick', index: 2 });
  assert.equal(questionCardKey(keyOn('Enter'), multi), null, 'no highlighted row');
  assert.deepEqual(questionCardKey(keyOn('Enter'), { ...multi, highlighted: -1 }), { type: 'pick', index: -1 });
  assert.equal(questionCardKey(keyOn('Enter'), { ...multi, highlighted: 1, inOther: true }), null);
  assert.deepEqual(questionCardKey(keyOn('Enter', { metaKey: true }), { ...multi, selected: true }), { type: 'advance' });
  assert.equal(questionCardKey(keyOn('Enter', { ctrlKey: true }), { ...multi, highlighted: 1 }), null);
});

test('questionCardKeyDown: markPick runs first for digits and arrows and can hold them; dialogs and other keys skip it', () => {
  const state = { optionCount: 2, hasOther: true, multiSelect: false, highlighted: null, selected: true };
  const calls = [];
  const pick = verdict => (event, digits) => (calls.push([event.key, digits]), verdict);
  const native = key => ({ key, native: true });
  assert.deepEqual(questionCardKeyDown(keyOn('1', { nativeEvent: native('1') }), state, pick(true)), { type: 'pick', index: 0 });
  assert.deepEqual(calls.splice(0), [['1', true]], 'rt(e.nativeEvent, E) with E on');
  assert.equal(questionCardKeyDown(keyOn('ArrowUp', { nativeEvent: native('ArrowUp') }), state, pick(false)), null, 'held back');
  assert.deepEqual(calls.splice(0), [['ArrowUp', true]]);
  assert.deepEqual(questionCardKeyDown(keyOn('Enter'), state, pick(false)), { type: 'advance' }, '↵ is not a pick key');
  assert.equal(questionCardKeyDown(keyOn('9'), state, pick(false)), null);
  assert.deepEqual(calls, [], 'neither ↵ nor an out-of-range digit reaches rt');
  const dialog = { contains: () => false };
  const inDialog = keyOn('1', { target: { nodeType: 1, matches: () => false, closest: s => s === QUESTION_DIALOG_SELECTOR ? dialog : null } });
  assert.equal(questionCardKeyDown(inDialog, state, pick(true), {}), null, 'a dialog over the card keeps its keys');
  // w11-sweep-trans: the overlay test is shared-156 rq with nq, so an alertdialog or an open <dialog> holds its keys too.
  const shared156 = fs.readFileSync(path.join(V3, 'shared-156-BLTosN8U.js'), 'utf8');
  assert.equal(shared156.split(`var nq='${QUESTION_DIALOG_SELECTOR}';function rq(e,t){let n=H(e);if(n===null)return!1;let r=e=>{let n=e.closest(nq);return n!==null&&!(t&&n.contains(t))};return r(n)||eq(n,r)}`).length - 1, 1);
  for (const selector of ['[role="alertdialog"]', 'dialog[open]', '[data-radix-dialog-content]']) assert.ok(QUESTION_DIALOG_SELECTOR.includes(selector));
  const holder = { contains: () => true };
  const cardInDialog = keyOn('1', { target: { nodeType: 1, matches: () => false, closest: () => holder } });
  assert.deepEqual(questionCardKeyDown(cardInDialog, state, pick(true), {}), { type: 'pick', index: 0 });
});

// The card itself, under a hand dispatcher (R5): its root onKeyDown with the real generated markCardPick.
let server;
const load = async () => {
  if (!server) {
    const [{ createServer }, { default: react }] = await Promise.all([import('vite'), import('@vitejs/plugin-react')]);
    server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
      server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  }
  const [card, landing] = await Promise.all([server.ssrLoadModule('/src/source-question-card.jsx'),
    server.ssrLoadModule('/src/generated/approval-landing/card-landing.mjs')]);
  return { ...card, ...landing };
};
after(() => server?.close());

function mount(component, props) {
  const cells = [], effects = []; let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const dispatcher = {
    useContext: c => c._currentValue,
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, next => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { return dispatcher.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return dispatcher.useMemo(() => fn, deps); },
    useId() { return dispatcher.useState(() => `question-${cursor}`)[0]; },
    useSyncExternalStore(subscribe, get) { return get(); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { cells[i] = { deps }; effects.push(fn); } },
    useLayoutEffect(fn, deps) { dispatcher.useEffect(fn, deps); },
  };
  withMemoCache(dispatcher);
  const render = () => { cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internal.H; internal.H = dispatcher; try { tree = component(props); return tree; } finally { internal.H = previous; } };
  render();
  return { render, get tree() { return tree; } };
}
const find = (tree, predicate) => {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) { const found = find(child, predicate); if (found) return found; }
  return null;
};
const findAll = (tree, predicate, out = []) => {
  if (!tree || typeof tree !== 'object') return out;
  if (predicate(tree)) out.push(tree);
  for (const child of React.Children.toArray(tree.props?.children)) findAll(child, predicate, out);
  return out;
};

function fakeRuntime(question) {
  const ticket = { key: 'q-ticket', generation: 1, requestId: 7, bridgeApproval: { instanceId: 'i', connectionId: 'c' } };
  const calls = [];
  const view = { phase: 'pending', busy: false, error: null, questions: [question],
    draft: { page: 0, answers: { [question.id]: { choice: null, selected: [], otherSelected: false, customText: '' } } } };
  const answer = () => view.draft.answers[question.id];
  const set = next => { view.draft = { ...view.draft, answers: { [question.id]: { ...answer(), ...next } } }; };
  return {
    calls, view, ticket, subscribe: () => () => {}, revision: 0, ticketFor: () => ticket, snapshot: () => view,
    canAdvance: () => question.multiSelect ? answer().selected.length > 0 || answer().otherSelected : !!answer().choice,
    selectOption(t, id, label) {
      calls.push(['option', label]);
      if (question.multiSelect) set({ selected: answer().selected.includes(label) ? answer().selected.filter(l => l !== label) : [...answer().selected, label] });
      else set({ choice: { kind: 'option', label } });
    },
    selectOther(t, id, { toggle = true } = {}) {
      calls.push(['other', toggle]);
      if (question.multiSelect) set({ otherSelected: toggle ? !answer().otherSelected : true });
      else set({ choice: { kind: 'other' } });
    },
    writeCustom() {}, setPage: () => true,
    submit: async () => (calls.push(['submit']), { status: 'pending' }),
    skip: async () => ({ status: 'pending' }),
  };
}
const question = (fields = {}) => ({ id: 'q1', question: 'Which database?', header: 'Database', isOther: true, multiSelect: false,
  options: [{ label: 'Postgres' }, { label: 'SQLite' }, { label: 'MySQL' }], ...fields });

function setup(Q, q) {
  const runtime = fakeRuntime(q);
  const card = mount(Q.SourceQuestionCard, { runtime, request: { id: 'r1' }, respond: async () => {}, isActive: true });
  const { win, element } = fakeWindow();
  const rootElement = element('section'), otherElement = element('textarea');
  rootElement.matches = otherElement.matches = () => false;
  const wire = () => {
    card.tree.props.ref.current = rootElement;
    const other = find(card.tree, n => n.props?.['aria-label'] === 'Other option');
    if (other) other.props.ref.current = otherElement;
  };
  wire();
  const press = (key, fields = {}) => {
    const native = { type: 'keydown', key, target: fields.target ?? rootElement, repeat: false, metaKey: false, ctrlKey: false,
      altKey: false, shiftKey: false, isTrusted: true, isComposing: false, stoppedNow: false,
      stopImmediatePropagation() { this.stoppedNow = true; }, ...fields };
    const event = { ...native, nativeEvent: native, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    card.tree.props.onKeyDown(event);
    card.render(); wire();
    return event;
  };
  return { runtime, card, win, rootElement, otherElement, press };
}

test('the card: digits select, N+1 is Other (focusing its field), arrows move the selection and focus the card', async () => {
  const Q = await load();
  const { runtime, rootElement, otherElement, press } = setup(Q, question());
  const two = press('2');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'SQLite']]);
  assert.ok(two.prevented && two.stopped && two.nativeEvent.stoppedNow, 'q prevents and stops the key it takes');
  press('ArrowDown');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'MySQL']], 'from the chosen row to the next');
  assert.equal(rootElement.focused.length, 1, 'an arrow onto a row focuses the card');
  press('ArrowDown');
  assert.deepEqual(runtime.calls.splice(0), [['other', false]], 'past the last row: Other');
  assert.equal(otherElement.focused.length, 1, 'selecting Other focuses its field');
  press('ArrowUp');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'MySQL']]);
  press('4');
  assert.deepEqual(runtime.calls.splice(0), [['other', false]], 'digit N+1 is Other');
  assert.equal(press('5').prevented, false, 'a digit past Other is left alone');
  assert.equal(press('1', { target: otherElement }).prevented, false, 'digits type into the Other field');
  const optionButton = Object.assign({ nodeType: 1 }, { matches: s => s === 'button, a' });
  assert.equal(press('1', { target: optionButton }).prevented, false, 'a focused option button keeps its keys');
  assert.deepEqual(runtime.calls, []);
});

test('the Other field keeps ↑/↓ for its caret (c9ed5627b vt)', async () => {
  const Q = await load();
  const { card } = setup(Q, question());
  const field = find(card.tree, n => n.props?.['aria-label'] === 'Other option');
  let stopped = false;
  field.props.onKeyDown({ key: 'ArrowDown', stopPropagation() { stopped = true; }, preventDefault() {} });
  assert.equal(stopped, true);
});

test('HS-11: on a landed card a deliberate digit is marked as a pick, so the next deliberate ↵ passes and submits', async () => {
  const Q = await load();
  const { runtime, win, rootElement, press } = setup(Q, question());
  Q.guardWindowAfterCard(win);
  const drawn = () => ({ chordActsAnywhere: false });
  const land = (extra = {}) => { rootElement.focus(); Q.afterCardState.set(win, { at: rootElement, onCard: true, from: rootElement, drawn, since: performance.now() - 1000, ...extra }); };
  const windowKey = (key) => {
    const event = { type: 'keydown', key, target: rootElement, repeat: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, isTrusted: true,
      prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { this.stopped = true; } };
    for (const l of win.listeners.filter(l => l.target === 'window' && l.type === 'keydown' && l.capture)) l.fn(event);
    return event;
  };
  land({ since: performance.now() });
  assert.equal(press('1').prevented, false, 'a digit right after landing is held back by rt');
  assert.deepEqual(runtime.calls.splice(0), []);
  assert.equal(Q.afterCardState.get(win).picked, undefined);
  land();
  assert.equal(windowKey('Enter').prevented, true, 'before a pick the landed card holds ↵ back (k)');
  assert.equal(press('1').prevented, true);
  assert.deepEqual(runtime.calls.splice(0), [['option', 'Postgres']]);
  assert.equal(Q.afterCardState.get(win).picked, true, 'markCardPick marked the pick');
  assert.equal(windowKey('Enter').prevented, false, 'after the pick a deliberate ↵ passes k');
  const enter = press('Enter');
  assert.equal(enter.prevented, true);
  await Promise.resolve();
  assert.deepEqual(runtime.calls.splice(0), [['submit']], '↵ with a choice submits the single question');
  Q.afterCardState.delete(win);
  assert.equal(press('ArrowDown').prevented, true, 'off a landed card the keys act at once');
});

test('multiSelect: digits and ↵ toggle, arrows move only the highlight, which the row draws (bg-alpha-2)', async () => {
  const Q = await load();
  const { runtime, card, rootElement, otherElement, press } = setup(Q, question({ multiSelect: true }));
  // c9ed5627b dt: an option row is ut with `isHighlighted: J && L === n` (bg-alpha-2), the Other row qn's
  // `J && L === -1 ? "bg-alpha-2"` surface.
  const highlightedRows = () => [
    ...findAll(card.tree, n => n.props?.isHighlighted === true).map(n => n.props.option.label),
    ...findAll(card.tree, n => typeof n.props?.className === 'string' && n.props.className.startsWith('flex flex-col gap-[12px] rounded-[5px]')
      && / bg-alpha-2$/.test(n.props.className)).map(() => 'Other'),
  ];
  assert.deepEqual(highlightedRows(), [], 'no highlight until a key or click sets one');
  press('3');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'MySQL']]);
  press('3');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'MySQL']], 'a second press toggles it off');
  assert.deepEqual(highlightedRows(), ['MySQL']);
  press('ArrowUp');
  assert.deepEqual(runtime.calls.splice(0), [], 'arrows do not select on a multiSelect question');
  assert.equal(rootElement.focused.length, 1);
  press('Enter');
  assert.deepEqual(runtime.calls.splice(0), [['option', 'SQLite']], '↵ toggles the highlighted row');
  press('ArrowDown'); press('ArrowDown');
  assert.deepEqual(highlightedRows(), ['Other'], 'Other is the row after the last option');
  press('Enter');
  assert.deepEqual(runtime.calls.splice(0), [['other', true]]);
  assert.equal(otherElement.focused.length, 1, 'turning Other on focuses its field');
  press('4');
  assert.deepEqual(runtime.calls.splice(0), [['other', true]]);
  assert.equal(otherElement.focused.length, 1, 'turning it off does not');
  const chord = press('Enter', { metaKey: true });
  assert.equal(chord.prevented, true);
  await Promise.resolve();
  assert.deepEqual(runtime.calls.splice(0), [['submit']], '⌘↵ submits with something chosen');
});

test('source wiring: the card imports markCardPick from the generated landing and passes the model its state', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/source-question-card.jsx'), 'utf8');
  assert.match(source, /import \{ markCardPick \} from "\.\/generated\/approval-landing\/card-landing\.mjs";/);
  assert.match(source, /questionCardKeyDown\(event, \{[\s\S]*?\}, markCardPick, root\.current\)/);
  assert.match(source, /event\.nativeEvent\?\.stopImmediatePropagation\?\.\(\);/);
  // W12: CDS parts come through the view-tabs facade (R6), the card's rows and listeners from the question-card target.
  assert.match(source, /from "\.\/generated\/view-tabs\/index\.js";/);
  assert.doesNotMatch(source, /generated\/view-tabs\/(?!index\.js)/);
  assert.match(source, /from "\.\/generated\/question-card\/option-row\.mjs";/);
  assert.match(source, /from "\.\/generated\/question-card\/digit-shortcuts\.mjs";/);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/source-question-card.css')), false, 'the host sq-* stylesheet is gone');
});
