import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CYCLE_REPEAT_MS, SESSION_CYCLE_ALT_ARROW, SIDEBAR_CYCLE_LIST, createSessionCycler, sessionCycleDelta, sidebarCycleButtons } from '../src/session-cycle-model.mjs';
import { connectSessionCycleGroups, sessionCycleGroupStore } from '../src/session-cycle-adapters.mjs';
import { cycleBlockedByFocus, isCycleModifierKey, sessionCycleChord, sessionCycleRepeatMs, cycleComposerSelector, cycleListboxSelector } from '../src/generated/code-current/session-cycle-chords.mjs';
import { cycleButtonForRowKey, cycleExpandsGroupAttribute, cycleNeighbourButton, cycleResumePosition, cycleRowKey, expandCycleGroup, openCycleButton, recentsCycleButtons, rowAliasAttribute } from '../src/generated/code-current/session-cycle-rows.mjs';
import { sessionCycleStep } from '../src/generated/code-current/session-cycle-step.mjs';
import { claimComposerArrowKeys } from '../src/generated/code-current/session-cycle-claims.mjs';

// R3-sidebar2 cov7-02: the session cycle runs 2.42304.0 shared-16 qp's pieces (generated/code-current/session-cycle-*).
const app = path.resolve(import.meta.dirname, '..');
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const generated = path.join(app, 'src/generated/code-current');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const TARGETS = {
  'session-cycle-composer.mjs': ['shared-1-CAAiD7E3.js', ['tg', 'lg', 'fg']],
  'session-cycle-focus.mjs': ['shared-156-Bikz018e.js', ['BB', 'HB', 'WB', 'ff', 'pf']],
  'session-cycle-claims.mjs': ['shared-9-D7uuiUv7.js', ['Dm', 'Om', 'km']],
  'session-cycle-terminal.mjs': ['shared-7-B8UIMGDr.js', ['XM']],
  'session-cycle-chords.mjs': ['shared-16-B0xHzPjj.js', ['Wp', 'Gp', 'Kp', 'Jp', 'Mf', 'jf', 'Yp', 'am']],
  'session-cycle-rows.mjs': ['shared-16-B0xHzPjj.js', ['Xp', 'Zp', 'Qp', '$p', 'em', 'tm', 'nm', 'rm', 'im']],
  'session-cycle-step.mjs': ['shared-16-B0xHzPjj.js', ['qp']],
};

// ---------------------------------------------------------------- a small DOM (no DOM library in this repo)
function splitTop(text, separator) {
  const parts = []; let depth = 0, quote = null, start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '(') depth += 1;
    else if (ch === ']' || ch === ')') depth -= 1;
    else if (depth === 0 && (separator === ' ' ? /\s/.test(ch) : ch === separator)) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}
function compound(text) {
  const tests = []; let rest = text;
  const tag = /^[a-zA-Z][\w-]*/.exec(rest);
  if (tag) { const name = tag[0].toUpperCase(); tests.push((el) => el.tagName === name); rest = rest.slice(tag[0].length); }
  while (rest) {
    let m;
    if ((m = /^\.([\w-]+)/.exec(rest))) { const cls = m[1]; tests.push((el) => (el.getAttribute('class') ?? '').split(/\s+/).includes(cls)); }
    else if ((m = /^\[([\w-]+)(?:(\^?=)"([^"]*)")?\]/.exec(rest))) {
      const [, name, op, value] = m;
      tests.push((el) => el.hasAttribute(name) && (op === undefined || (op === '=' ? el.getAttribute(name) === value : el.getAttribute(name).startsWith(value))));
    } else if ((m = /^:not\((.*?)\)(?=$|[.[:])/.exec(rest))) { const inner = compound(m[1]); tests.push((el) => !inner(el)); }
    else throw Error(`selector ${text}`);
    rest = rest.slice(m[0].length);
  }
  return (el) => tests.every((check) => check(el));
}
function matcher(selector) {
  const alternatives = splitTop(selector, ',').map((complex) => splitTop(complex, ' ').map(compound));
  return (el) => alternatives.some((chain) => {
    if (!chain.at(-1)(el)) return false;
    let at = el.parent, index = chain.length - 2;
    while (index >= 0 && at) { if (chain[index](at)) index -= 1; at = at.parent; }
    return index < 0;
  });
}
class El {
  constructor(tag, attrs = {}, children = []) {
    this.tagName = tag.toUpperCase(); this.nodeType = 1; this.attrs = new Map(Object.entries(attrs)); this.children = []; this.parent = null; this.log = null;
    for (const child of children) this.append(child);
  }
  append(child) { child.parent = this; this.children.push(child); child.inherit(this.log); return child; }
  inherit(log) { this.log = log; for (const child of this.children) child.inherit(log); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null; }
  getAttribute(name) { return this.attrs.has(name) ? String(this.attrs.get(name)) : null; }
  hasAttribute(name) { return this.attrs.has(name); }
  get isConnected() { let at = this; while (at.parent) at = at.parent; return at.root === true; }
  matches(selector) { return matcher(selector)(this); }
  closest(selector) { const match = matcher(selector); for (let at = this; at; at = at.parent) if (match(at)) return at; return null; }
  *walk() { for (const child of this.children) { yield child; yield* child.walk(); } }
  querySelectorAll(selector) { const match = matcher(selector); return [...this.walk()].filter(match); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  scrollIntoView() { this.log?.push(`scroll:${this.getAttribute('data-name')}`); }
  click() { this.log?.push(`click:${this.getAttribute('data-name')}`); }
}
const h = (tag, attrs, ...children) => new El(tag, attrs ?? {}, children.flat());
function documentOf(body, log = []) {
  const root = h('html', {}, body); root.root = true; root.inherit(log);
  return { root, log, documentElement: root, activeElement: null, querySelector: (s) => root.querySelector(s), querySelectorAll: (s) => root.querySelectorAll(s) };
}
// A sidebar row as the host renders it: .source-session-row[data-row-key] around the main button (Code rows: the button
// carries data-selected and aria-current, as generated sidebar-row-view KT renders them).
const row = (key, { selected, current, alias } = {}) => h('div', { class: 'source-session-row', 'data-row-key': key, ...(alias ? { [rowAliasAttribute]: key } : {}) },
  h('button', { 'data-row-main-button': '', 'data-name': key, ...(selected ? { 'data-selected': selected } : {}), ...(current ? { 'aria-current': 'page' } : {}), ...(alias ? { [rowAliasAttribute]: key } : {}) }));
const sidebar = (...rows) => h('aside', { class: 'source-sidebar' }, h('nav', { class: 'source-session-list' }, h('div', { class: 'df-session-list flex flex-col' }, ...rows)));

const saved = { window: globalThis.window, document: globalThis.document };
afterEach(() => { globalThis.window = saved.window; globalThis.document = saved.document; });
const onMac = (mac = true) => { globalThis.window = { navigator: { userAgent: mac ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)' : 'Mozilla/5.0 (X11; Linux aarch64)' } }; };
const key = (over = {}) => ({ key: '', code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false, target: null, ...over });
const NEXT = key({ key: ']', code: 'BracketRight', metaKey: true, shiftKey: true }), PREV = key({ key: '[', code: 'BracketLeft', metaKey: true, shiftKey: true });
const CTRL_TAB = key({ key: 'Tab', code: 'Tab', ctrlKey: true }), CTRL_SHIFT_TAB = key({ key: 'Tab', code: 'Tab', ctrlKey: true, shiftKey: true });
const ALT_DOWN = key({ key: 'ArrowDown', code: 'ArrowDown', altKey: true }), ALT_UP = key({ key: 'ArrowUp', code: 'ArrowUp', altKey: true });

// ---------------------------------------------------------------- provenance
test('the cycle pieces are 2.42304.0 originals: manifest, source hashes, chunk feature strings, qp`s step fragment', () => {
  const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
  for (const [target, [file, bindings]] of Object.entries(TARGETS)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry.source), file, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(latest, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(entry.sha256, sha(text), target);
    assert.match(text, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  }
  const step = manifest.modules.find((module) => module.target === 'session-cycle-step.mjs');
  assert.deepEqual(step.sourceSelections.map(({ binding, local, direct, parameters }) => ({ binding, local, direct, parameters })), [{ binding: 'qp', local: 'p', direct: true, parameters: 'u, c, f, o, tm' }]);
  const chunk = readFileSync(path.join(latest, 'shared-16-B0xHzPjj.js'), 'utf8');
  for (const feature of ['function Up(){return D("__gb__1817753866")}', 'chord:"ctrl_tab"', 'chord:"alt_arrow"', 'chord:"cmd_shift_bracket"',
    'e.button?.isConnected===!1?Zp(t,e.rowKey):e.button', '$p="data-row-alias-of",em="data-cycle-expands-group"', '.dframe-recents-by-mode [data-kind="${e}"]',
    'e[i-1]?.getAttribute("aria-current")==="page"', 'for(;h&&rm(h);)[m,h]=p()', 'qp as G', 'im as U', 'tm as W'])
    assert.ok(chunk.includes(feature), feature);
  // The chunk's import table: what the generated imports stand in for.
  for (const binding of ['fd as Fe', 'td as Ge', 'Cr as Ye', 'wr as $e', 'Eh as Xe', 'vt as wi', 'N as bi', 'kw as xt', 'vl as pr', 'If as W', 'Ca as n'])
    assert.ok(new RegExp(`\\b${binding.replace('$', '\\$')}\\b`).test(chunk.slice(0, 6000)), binding);
  const rows = readFileSync(path.join(generated, 'session-cycle-rows.mjs'), 'utf8');
  assert.match(rows, /import \{ flushSync as n \} from "react-dom";/);
  assert.match(rows, /import \{ sessionCycleGroupStore as W \} from "\.\.\/\.\.\/session-cycle-adapters\.mjs";/);
  assert.equal(sessionCycleRepeatMs, 50); assert.equal(CYCLE_REPEAT_MS, 50);
  assert.equal(rowAliasAttribute, 'data-row-alias-of'); assert.equal(cycleExpandsGroupAttribute, 'data-cycle-expands-group');
  assert.equal(cycleComposerSelector, '[data-testid="chat-input"],[data-testid="code-prompt-input"]');
  assert.equal(cycleListboxSelector, 'select,[role="combobox"],[role="listbox"],[role="application"]');
});

test('the generator check passes for the cycle targets', async () => {
  const { extractCurrentCodeHelpers } = await import('../scripts/extract-code-ui-current.mjs');
  await extractCurrentCodeHelpers({ check: true, only: new Set(Object.keys(TARGETS)) });
});

// ---------------------------------------------------------------- am / Jp / Yp
test('am: ⌘⇧] / ⌘⇧[ by key code on macOS (Ctrl+Shift elsewhere), Ctrl+Tab everywhere, ⌥↑ / ⌥↓ only on macOS behind its gate', () => {
  onMac(true); globalThis.document = documentOf(h('body'));
  assert.deepEqual(sessionCycleChord(NEXT, true), { dir: 1, chord: 'cmd_shift_bracket' });
  assert.deepEqual(sessionCycleChord({ ...NEXT, key: '}' }, true), { dir: 1, chord: 'cmd_shift_bracket' }, 'Shift+] reports key "}"; the code counts');
  assert.deepEqual(sessionCycleChord(PREV, true), { dir: -1, chord: 'cmd_shift_bracket' });
  assert.deepEqual(sessionCycleChord(CTRL_TAB, true), { dir: 1, chord: 'ctrl_tab' });
  assert.deepEqual(sessionCycleChord(CTRL_SHIFT_TAB, true), { dir: -1, chord: 'ctrl_tab' });
  assert.deepEqual(sessionCycleChord(ALT_DOWN, true), { dir: 1, chord: 'alt_arrow' });
  assert.deepEqual(sessionCycleChord(ALT_UP, true), { dir: -1, chord: 'alt_arrow' });
  assert.equal(sessionCycleChord(ALT_DOWN, false), null, 'Up() off: no ⌥ chord');
  for (const event of [{ ...ALT_DOWN, shiftKey: true }, { ...ALT_DOWN, metaKey: true }, { ...ALT_DOWN, ctrlKey: true }, { ...ALT_DOWN, key: 'ArrowLeft' }, { ...CTRL_TAB, altKey: true }, { ...NEXT, altKey: true }, { ...NEXT, ctrlKey: true }, { ...NEXT, shiftKey: false }, { ...CTRL_TAB, metaKey: true }, key({ key: 'Tab' })])
    assert.equal(sessionCycleChord(event, true), null, JSON.stringify(event));
  // bi: the terminal has focus.
  const terminal = h('div', { 'data-ccd-terminal': '' }, h('textarea'));
  globalThis.document = documentOf(h('body', {}, terminal)); globalThis.document.activeElement = terminal.children[0];
  assert.equal(sessionCycleChord(ALT_DOWN, true), null, 'no ⌥ chord while the terminal has focus');
  assert.deepEqual(sessionCycleChord(NEXT, true), { dir: 1, chord: 'cmd_shift_bracket' });
  onMac(false);
  assert.equal(sessionCycleChord(NEXT, true), null, '⌘ is not the cycle modifier off macOS');
  assert.deepEqual(sessionCycleChord(key({ key: ']', code: 'BracketRight', ctrlKey: true, shiftKey: true }), true), { dir: 1, chord: 'cmd_shift_bracket' });
  assert.equal(sessionCycleChord(ALT_DOWN, true), null, '⌥↓ only on macOS');
  assert.deepEqual(sessionCycleChord(CTRL_TAB, true), { dir: 1, chord: 'ctrl_tab' });
  for (const name of ['Control', 'Meta', 'Alt']) assert.equal(isCycleModifierKey(key({ key: name })), true, name);
  assert.equal(isCycleModifierKey(key({ key: 'Shift' })), false);
  assert.equal(SESSION_CYCLE_ALT_ARROW, true, 'host gate for shared-16 Up()');
});

test('sessionCycleDelta is am`s macOS form without ⌥ (the chords the Keyboard shortcuts dialog lists)', () => {
  onMac(true); globalThis.document = documentOf(h('body'));
  for (const event of [NEXT, PREV, CTRL_TAB, CTRL_SHIFT_TAB, { ...NEXT, key: '}' }, ALT_DOWN, { ...NEXT, altKey: true }, { ...NEXT, ctrlKey: true }, { ...CTRL_TAB, metaKey: true }, key({ key: 'Tab' })])
    assert.equal(sessionCycleDelta(event), sessionCycleChord(event, false)?.dir ?? 0, JSON.stringify(event));
  assert.equal(sessionCycleDelta(undefined), 0);
});

test('Yp: listboxes and selects keep every chord; text fields, menus and tabs keep ⌥↑↓; the composer only while its draft is not persisted or a popup claims the keys', () => {
  const select = h('select'), listbox = h('div', { role: 'listbox' }, h('div', { role: 'option' })), textarea = h('textarea'), tab = h('button', { role: 'tab' }), plain = h('div');
  const composer = h('div', { 'data-testid': 'code-prompt-input', 'data-draft-persisted': 'true' }, h('div', { contenteditable: 'true' }));
  const draft = h('div', { 'data-testid': 'chat-input' }, h('p'));
  const card = h('div', { class: 'epitaxy-approval-card' }, h('span'));
  globalThis.document = documentOf(h('body', {}, select, listbox, textarea, tab, plain, composer, draft, card));
  for (const chord of ['ctrl_tab', 'cmd_shift_bracket', 'alt_arrow']) {
    assert.equal(cycleBlockedByFocus(select, chord), true, `select ${chord}`);
    assert.equal(cycleBlockedByFocus(listbox.children[0], chord), true, `listbox ${chord}`);
    assert.equal(cycleBlockedByFocus(plain, chord), false, `plain ${chord}`);
    assert.equal(cycleBlockedByFocus(null, chord), false);
    assert.equal(cycleBlockedByFocus({ nodeType: 3 }, chord), false, 'a text node target is no element');
  }
  for (const target of [textarea, tab, card.children[0]]) {
    assert.equal(cycleBlockedByFocus(target, 'alt_arrow'), true, target.tagName);
    assert.equal(cycleBlockedByFocus(target, 'cmd_shift_bracket'), false, target.tagName);
  }
  // Kp: inside the composer, ⌥↑↓ belongs to the draft unless it is persisted and nothing claims it (shared-9 km).
  assert.equal(cycleBlockedByFocus(composer.children[0], 'alt_arrow'), false);
  assert.equal(cycleBlockedByFocus(draft.children[0], 'alt_arrow'), true, 'draft not persisted');
  assert.equal(cycleBlockedByFocus(draft.children[0], 'ctrl_tab'), false);
  let open = true;
  const release = claimComposerArrowKeys(composer, () => open);
  assert.equal(cycleBlockedByFocus(composer.children[0], 'alt_arrow'), true, 'a suggestion popup claims ⌥↑↓');
  open = false;
  assert.equal(cycleBlockedByFocus(composer.children[0], 'alt_arrow'), false);
  release();
});

// ---------------------------------------------------------------- tm / Xp / Zp / Qp / nm
test('the host tm reads the sidebar list like the original reads .dframe-recents-by-mode: alias rows out, focused first, else open', () => {
  const rows = () => [row('a'), row('b', { selected: 'open' }), row('b-alias', { alias: true, selected: 'focused' }), row('c', { selected: 'focused', current: true }), row('d')];
  const host = documentOf(sidebar(...rows()));
  const official = documentOf(h('div', { class: 'dframe-recents-by-mode contents', 'data-mode': 'code' }, h('div', { 'data-kind': 'code' }, ...rows())));
  globalThis.document = official;
  const mine = sidebarCycleButtons(host), theirs = recentsCycleButtons('code');
  assert.deepEqual(mine.buttons.map((b) => b.getAttribute('data-name')), ['a', 'b', 'c', 'd']);
  assert.deepEqual(theirs.buttons.map((b) => b.getAttribute('data-name')), ['a', 'b', 'c', 'd']);
  assert.equal(mine.selectedIdx, 2); assert.equal(theirs.selectedIdx, 2);
  assert.equal(SIDEBAR_CYCLE_LIST, '.source-sidebar .df-session-list');
  // No focused row: the open one.
  const open = documentOf(sidebar(row('a'), row('b', { selected: 'open' })));
  assert.equal(sidebarCycleButtons(open).selectedIdx, 1);
  // A Home row keeps data-selected on its row (host JSX), not on the button.
  const home = documentOf(sidebar(h('div', { class: 'source-session-row', 'data-row-key': 'x', 'data-selected': 'focused' }, h('button', { 'data-row-main-button': '', 'data-name': 'x' }))));
  assert.equal(sidebarCycleButtons(home).selectedIdx, 0);
  assert.deepEqual(sidebarCycleButtons(documentOf(h('body'))), { buttons: [], selectedIdx: -1 });
  assert.deepEqual(sidebarCycleButtons(null), { buttons: [], selectedIdx: -1 });
  // nm: the neighbour of the selected row (after, else before).
  assert.equal(cycleNeighbourButton(mine).getAttribute('data-name'), 'd');
  assert.equal(cycleNeighbourButton({ buttons: mine.buttons, selectedIdx: 3 }).getAttribute('data-name'), 'c');
  assert.equal(cycleNeighbourButton({ buttons: mine.buttons, selectedIdx: -1 }), undefined);
});

test('Xp / Zp / Qp: a step continues from its row by row key when the row re-rendered, else from its position', () => {
  const doc = documentOf(sidebar(row('a'), row('b'), row('c')));
  const [a, b, c] = sidebarCycleButtons(doc).buttons;
  assert.equal(cycleRowKey(b), 'b'); assert.equal(cycleRowKey(null), null);
  assert.equal(cycleResumePosition({ button: b, rowKey: 'b', pos: 2 }, [a, b, c]), 2, 'still listed: right after it');
  // b re-rendered: a new button element with the same row key.
  b.parent.remove();
  const fresh = row('b'); doc.root.querySelector('.df-session-list').append(fresh);
  const list = sidebarCycleButtons(doc).buttons;
  assert.equal(b.isConnected, false);
  assert.equal(cycleButtonForRowKey(list, 'b'), fresh.children[0]);
  assert.equal(cycleResumePosition({ button: b, rowKey: 'b', pos: 2 }, list), 3, 'Zp finds the new button: after it (now last)');
  assert.equal(cycleResumePosition({ button: b, rowKey: 'gone', pos: 7 }, list), 3, 'no match: Math.min(pos, length)');
  assert.equal(cycleButtonForRowKey([...list, row('b').children[0]], 'b'), undefined, 'two buttons for the key: no match');
  assert.equal(cycleButtonForRowKey(list, null), undefined);
});

test('qp`s step skips the aria-current row on a fresh step and wraps through position 0 (Home)', () => {
  const doc = documentOf(sidebar(row('a'), row('b', { selected: 'focused' }), row('c', { current: true }), row('d')));
  const rows = () => sidebarCycleButtons(doc);
  // From the focused b, next would be c, the page already shown: skipped to d.
  assert.deepEqual(sessionCycleStep(null, 'code', false, 1, rows)().map((v) => v?.getAttribute?.('data-name') ?? v), [4, 'd']);
  assert.deepEqual(sessionCycleStep(null, 'code', false, -1, rows)().map((v) => v?.getAttribute?.('data-name') ?? v), [1, 'a']);
  // f (Home shows a draft): start from 0.
  assert.deepEqual(sessionCycleStep(null, 'code', true, 1, rows)().map((v) => v?.getAttribute?.('data-name') ?? v), [1, 'a']);
  assert.deepEqual(sessionCycleStep(null, 'code', true, -1, rows)().map((v) => v?.getAttribute?.('data-name') ?? v), [4, 'd']);
  // A held sequence (u) does not skip.
  const [, b] = rows().buttons;
  assert.deepEqual(sessionCycleStep({ button: b, rowKey: 'b', pos: 2 }, 'code', false, 1, rows)().map((v) => v?.getAttribute?.('data-name') ?? v), [3, 'c']);
  // Past the last row: Home (null).
  const last = rows().buttons[3];
  assert.deepEqual(sessionCycleStep({ button: last, rowKey: 'd', pos: 4 }, 'code', false, 1, rows)(), [0, null]);
});

// ---------------------------------------------------------------- rm / im with the sidebar's folded groups
function foldedSidebar() {
  const log = [];
  const hiddenRows = h('div', { class: 'hidden', [cycleExpandsGroupAttribute]: 'section:s1:today' }, row('x'), row('y'));
  const doc = documentOf(sidebar(row('a', { selected: 'focused', current: true }), hiddenRows, row('z')), log);
  const folded = new Set(['section:s1:today']);
  const expanded = [];
  const disconnect = connectSessionCycleGroups({
    collapsedGroups: () => [...folded],
    expandGroup: (k) => { expanded.push(k); folded.delete(k); hiddenRows.attrs.delete(cycleExpandsGroupAttribute); hiddenRows.attrs.set('class', 'contents'); },
  });
  return { doc, log, folded, expanded, disconnect, hiddenRows };
}

test('rm expands the folded group a button is in (W.getState() over the connected sidebar), im opens the row after that', () => {
  const { doc, log, expanded, disconnect } = foldedSidebar();
  const [, x] = sidebarCycleButtons(doc).buttons;
  assert.deepEqual(sessionCycleGroupStore.getState().collapsedGroups, ['section:s1:today']);
  assert.equal(expandCycleGroup(x), true);
  assert.deepEqual(expanded, ['section:s1:today']);
  assert.equal(expandCycleGroup(x), false, 'no longer folded');
  assert.equal(expandCycleGroup(sidebarCycleButtons(doc).buttons[0]), false, 'not in a cycle-expanding group');
  assert.equal(openCycleButton(x), true);
  assert.deepEqual(log, ['scroll:x', 'click:x']);
  assert.equal(openCycleButton(null), false);
  disconnect();
  assert.deepEqual(sessionCycleGroupStore.getState().collapsedGroups, [], 'no sidebar: nothing folded');
});

test('im: a button its group expansion re-rendered is found again by row key inside .dframe-recents-by-mode (inert in the host list)', () => {
  const log = [];
  const group = h('div', { [cycleExpandsGroupAttribute]: 'g' }, row('x'));
  const list = h('div', { class: 'dframe-recents-by-mode' }, h('div', { 'data-kind': 'code' }, group));
  const doc = documentOf(list, log);
  const x = group.children[0].children[0];
  const disconnect = connectSessionCycleGroups({ collapsedGroups: () => ['g'], expandGroup: () => { group.children[0].remove(); group.attrs.delete(cycleExpandsGroupAttribute); group.append(row('x')); } });
  assert.equal(openCycleButton(x), true);
  assert.deepEqual(log, ['scroll:x', 'click:x']);
  assert.notEqual(group.children[0].children[0], x);
  disconnect();
  // The host list has no .dframe-recents-by-mode, so the same re-render ends without a click (the cycle's own loop
  // re-reads the host list instead).
  const hostLog = [], hostGroup = h('div', { [cycleExpandsGroupAttribute]: 'g' }, row('x'));
  documentOf(sidebar(hostGroup), hostLog);
  const hostX = hostGroup.children[0].children[0];
  const off = connectSessionCycleGroups({ collapsedGroups: () => ['g'], expandGroup: () => { hostGroup.children[0].remove(); hostGroup.attrs.delete(cycleExpandsGroupAttribute); hostGroup.append(row('x')); } });
  assert.equal(openCycleButton(hostX), false);
  assert.deepEqual(hostLog, []);
  off();
  void doc;
});

// ---------------------------------------------------------------- the cycler (qp a / s / c / l)
function harness(doc, { atHome = false, blocked = false, altArrow = true } = {}) {
  const calls = []; let now = 0;
  const cycler = createSessionCycler({
    rows: () => sidebarCycleButtons(doc), home: () => calls.push('home'), atHome: () => atHome, blocked: () => blocked, altArrow, now: () => now,
    open: (button) => { calls.push(button.getAttribute('data-name')); openCycleButton(button); },
  });
  return { cycler, calls, tick: (ms) => { now += ms; }, setHome: (value) => { atHome = value; }, setBlocked: (value) => { blocked = value; } };
}

test('a held ⌘ walks from the last opened row even before the selection re-renders, through Home', () => {
  onMac(true);
  const doc = documentOf(sidebar(row('A'), row('B'), row('C')));
  globalThis.document = doc;
  const { cycler, calls, tick } = harness(doc);
  for (let i = 0; i < 4; i += 1) { assert.equal(cycler.keydown(NEXT), true); tick(200); }
  assert.deepEqual(calls, ['A', 'B', 'C', 'home']);
  cycler.keyup(key({ key: 'Meta' }));
  for (let i = 0; i < 4; i += 1) { assert.equal(cycler.keydown(PREV), true); tick(200); }
  assert.deepEqual(calls.slice(4), ['C', 'B', 'A', 'home']);
  assert.equal(doc.log.filter((entry) => entry.startsWith('click:')).length, 6);
});

test('the held sequence follows a re-rendered row by its key (Zp), and a step into a folded group expands it first (rm loop)', () => {
  onMac(true);
  const { doc, expanded, disconnect } = foldedSidebar();
  globalThis.document = doc;
  const { cycler, calls, tick } = harness(doc);
  // a (focused, current) → x: x sits in the folded group, rm expands it and the step is taken again.
  assert.equal(cycler.keydown(CTRL_TAB), true);
  assert.deepEqual(calls, ['x']);
  assert.deepEqual(expanded, ['section:s1:today']);
  assert.equal(cycler.last.rowKey, 'x');
  // x re-renders (new element, same key) before the next held step.
  const old = doc.root.querySelector('[data-row-key="x"]');
  const parent = old.parent; old.remove(); parent.children.unshift(row('x')); parent.children[0].parent = parent; parent.children[0].inherit(doc.log);
  tick(200);
  assert.equal(cycler.keydown(CTRL_TAB), true);
  assert.deepEqual(calls, ['x', 'y'], 'continues after x by row key');
  disconnect();
});

test('Home: position 0 opens it, unless Home already shows a draft; ⌥↓ cycles on macOS when focus allows', () => {
  onMac(true);
  const doc = documentOf(sidebar(row('A'), row('B')));
  globalThis.document = doc;
  const { cycler, calls, setHome } = harness(doc);
  setHome(true);
  assert.equal(cycler.step(-1), true); assert.deepEqual(calls, ['B'], 'from a draft, previous is the last row');
  assert.equal(cycler.step(1), true); assert.deepEqual(calls, ['B', 'A']);
  // On a draft, stepping onto Home does nothing (`!h && f`).
  const onDraft = harness(doc, { atHome: true });
  onDraft.cycler.keydown(NEXT); onDraft.cycler.keydown({ ...PREV });
  assert.deepEqual(onDraft.calls, ['A']);
  const fresh = harness(documentOf(sidebar(row('A'), row('B', { selected: 'focused', current: true }))));
  globalThis.document = documentOf(h('body'));
  assert.equal(fresh.cycler.keydown({ ...ALT_DOWN, target: h('div') }), true);
  assert.deepEqual(fresh.calls, ['home'], 'B is last: ⌥↓ goes Home');
  const gated = harness(documentOf(sidebar(row('A'))), { altArrow: false });
  assert.equal(gated.cycler.keydown(ALT_DOWN), false);
  assert.equal(fresh.cycler.keydown({ ...ALT_DOWN, target: h('textarea') }), false, 'Yp: ⌥↓ stays in a text field');
  setHome(false);
});

test('repeats within 50 ms are swallowed; modifiers, Alt, blur, a layer, focus guards and other keys end the sequence', () => {
  onMac(true);
  const doc = documentOf(sidebar(row('A'), row('B', { selected: 'focused', current: true }), row('C')));
  globalThis.document = doc;
  const { cycler, calls, tick, setBlocked } = harness(doc);
  assert.equal(cycler.keydown(CTRL_TAB), true); assert.deepEqual(calls, ['C']);
  assert.equal(cycler.keydown({ ...CTRL_TAB, repeat: true }), true, 'a fast repeat is consumed'); assert.deepEqual(calls, ['C']);
  tick(60); assert.equal(cycler.keydown({ ...CTRL_TAB, repeat: true }), true); assert.deepEqual(calls, ['C', 'home']);
  cycler.keyup(key({ key: 'Control' })); assert.equal(cycler.last, null);
  // Shift alone keeps it; another key ends it.
  cycler.keydown(CTRL_TAB); cycler.keydown(key({ key: 'Shift' })); assert.notEqual(cycler.last, null);
  cycler.keydown(key({ key: 'x', code: 'KeyX' })); assert.equal(cycler.last, null);
  cycler.keydown(CTRL_TAB); cycler.keydown(key({ key: 'Alt' })); assert.equal(cycler.last, null, 'Alt is a cycle modifier now (Jp)');
  cycler.keydown(CTRL_TAB); cycler.keyup(key({ key: 'Tab', ctrlKey: false })); assert.equal(cycler.last, null, 'no modifier held');
  cycler.keydown(ALT_DOWN); cycler.keyup(key({ key: 'ArrowDown', altKey: true })); assert.notEqual(cycler.last, null, '⌥ still held');
  cycler.reset(); assert.equal(cycler.last, null);
  const before = calls.length;
  assert.equal(cycler.keydown({ ...NEXT, defaultPrevented: true }), false);
  setBlocked(true); assert.equal(cycler.keydown(NEXT), false); assert.equal(cycler.step(1), false); setBlocked(false);
  assert.equal(cycler.keydown({ ...NEXT, target: h('select') }), false);
  assert.equal(calls.length, before);
  const empty = harness(documentOf(sidebar()));
  assert.equal(empty.cycler.keydown(NEXT), false); assert.equal(empty.cycler.step(-1), false); assert.deepEqual(empty.calls, []);
});

test('the Go menu`s onCycleSession is one fresh step from the selection each time', () => {
  onMac(true);
  const doc = documentOf(sidebar(row('A', { selected: 'focused', current: true }), row('B'), row('C')));
  globalThis.document = doc;
  const { cycler, calls } = harness(doc);
  assert.equal(cycler.step(1), true); assert.equal(cycler.step(1), true);
  assert.deepEqual(calls, ['B', 'B']);
  assert.equal(cycler.last, null);
});

test('a group that never unfolds does not spin the step (host guard)', () => {
  onMac(true);
  const group = h('div', { [cycleExpandsGroupAttribute]: 'stuck' }, row('x'));
  const doc = documentOf(sidebar(row('a', { selected: 'focused', current: true }), group));
  globalThis.document = doc;
  let asked = 0;
  const off = connectSessionCycleGroups({ collapsedGroups: () => ['stuck'], expandGroup: () => { asked += 1; } });
  const { cycler, calls } = harness(doc);
  assert.equal(cycler.keydown(NEXT), true);
  // listed + 1 = 3 times in the step loop, once more in im before it clicks.
  assert.equal(asked, 4, `expandGroup asked ${asked} times`);
  assert.deepEqual(calls, ['x']);
  off();
});

test('main.jsx and SourceSidebar wire the original cycle: host tm, im, Home draft, layers, folded groups', () => {
  const main = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /import \{ createSessionCycler, sidebarCycleButtons \} from "\.\/session-cycle-model\.mjs";/);
  assert.match(main, /rows: \(\) => sidebarCycleButtons\(document\),/);
  assert.match(main, /atHome: \(\) => cycleAtHome\.current, mode: \(\) => modeRef\.current, blocked: \(\) => layerOpen\(\),/);
  assert.match(main, /cycleAtHome\.current = section === "new" && !current;/);
  assert.doesNotMatch(main, /function sidebarCycleRows/);
  assert.match(main, /else if \(sessionCycler\.current\.keydown\(e\)\) \{ e\.preventDefault\(\); return; \}/);
  assert.match(main, /sessionCycler\.current\.step\(e\.delta\)/);
  const sidebarSource = readFileSync(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  assert.match(sidebarSource, /import \{ connectSessionCycleGroups \} from "\.\/session-cycle-adapters\.mjs";/);
  assert.match(sidebarSource, /useEffect\(\(\) => connectSessionCycleGroups\(\{ collapsedGroups: \(\) => cycleGroups\.current\.collapsedGroups\(\), expandGroup: \(key\) => cycleGroups\.current\.expandGroup\(key\) \}\), \[\]\);/);
  assert.match(sidebarSource, /collapsedGroups: \(\) => \[\.\.\.closed\],/);
});
