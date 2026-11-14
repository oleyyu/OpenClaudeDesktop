// w12b-file-editor-find: the editor's find reveal/settle follows 3.6556.2 cbd02b8f2 Jo's Pr effect word for word —
// deps Rr=[query,options,activeLine,scrollNonce], fo (center + caret on the hit), and uo only for the same query
// (`t.query===Nr.current`). The viewer's find props carry query/options/scrollNonce like cd2efac6e dh, and the
// scrollNonce bumps follow zs (setQuery Hs, toggleOption Vs, next/prev Bs). Official chunks are read as text only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EditorState, syntaxTree } from '../src/code-editor-core.mjs';
import { loadEditorLanguage } from '../src/generated/code-editor-current/wrapper.mjs';
import { findRevealDeps, findRevealDepsChanged, findRevealStep, findRevealRange, createFindReveal, runFindReveal } from '../src/file-editor-find.mjs';

const assets = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
const read = (name) => readFile(new URL(name, assets), 'utf8');
const src = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('official Jo Pr / fo and the cd2efac6e find state carry the behavior the host mirrors', async () => {
  const jo = await read('cbd02b8f2-u2AOwdpo.js');
  for (const needle of [
    'J=x?.activeLine',
    'Nr=t(x?.query)',
    't&&J!==void 0&&(fo(e,t),t.query===Nr.current&&uo(e)),Nr.current=t?.query',
    'Fr=x?.query,Ir=x?.options,Lr=x?.scrollNonce',
    'Rr=J4($,150,J,Fr,Ir,Lr)?K4($,150,J,Fr,Ir,Lr,[Fr,Ir,J,Lr]):$[154];u(Pr,Rr)',
    'function fo(e,t){let{activeLine:n}=t;if(n===void 0)return;',
    'e.dispatch({effects:[T.scrollIntoView(z.range(o,s),{y:"center"}),...Vn(e.state,o,s)],selection:{anchor:o}})',
  ]) assert.ok(jo.includes(needle), needle);
  const pane = await read('cd2efac6e-Be7wcc4w.js');
  for (const needle of [
    'Lu&&Q.isOpen&&Q.query?',
    '{query:Q.query,options:Q.options,activeLine:lh,activeOrdinal:uh,scrollNonce:Q.scrollNonce}',
    'scrollNonce:m,setQuery:F,toggleOption:oe',
    'function Bs(e){return e+1}function Vs(e){return e+1}function Hs(e){return e+1}',
    'h(Hs)', 'h(Vs)', 'h(Bs)', '$m(p,u)',
  ]) assert.ok(pane.includes(needle), needle);
});

test('host viewer passes query/options/scrollNonce and bumps scrollNonce like zs', async () => {
  const viewer = await src('source-file-viewer.jsx');
  assert.match(viewer, /useState\(\{ open: false, query: "", index: -1, nonce: 0, scrollNonce: 0, options: getSearchOptions\(\) \}\)/);
  assert.match(viewer, /const findProps = useMemo\(\(\) => \(find\.open \? \{ query: find\.query, options: find\.options, matches, index, scrollNonce: find\.scrollNonce \} : null\), \[find\.open, find\.query, find\.options, find\.scrollNonce, matches, index\]\);/);
  // setQuery (Hs), toggleOption (Vs), next/prev (Bs), and the content-search setQuery ($m(p,u)).
  assert.match(viewer, /onQuery=\{\(query\) => setFind\(\(value\) => \(\{ \.\.\.value, query, index: 0, scrollNonce: value\.scrollNonce \+ 1 \}\)\)\}/);
  assert.match(viewer, /index: firstMatchFrom\(result\.matches, line\), scrollNonce: value\.scrollNonce \+ 1 \}\)\);/);
  assert.match(viewer, /index: stepFindIndex\(index, delta, result\.matches\.length\), scrollNonce: value\.scrollNonce \+ 1 \}\)\);/);
  assert.match(viewer, /nonce:value\.nonce\+1,scrollNonce:value\.scrollNonce\+1\}\)\);/);
  // open/close leave m alone (zs ce / me never call h).
  const open = viewer.slice(viewer.indexOf('const openFind = useCallback('), viewer.indexOf('const stepFind = useCallback('));
  assert.ok(open.length > 0 && !open.includes('scrollNonce'));
  assert.equal((viewer.match(/scrollNonce: value\.scrollNonce \+ 1|scrollNonce:value\.scrollNonce\+1/g) || []).length, 4);
});

test('host editor runs the Pr block through file-editor-find, not by matches identity', async () => {
  const editor = await src('source-file-editor.jsx');
  assert.match(editor, /import \{ createFindReveal, runFindReveal \} from '\.\/file-editor-find\.mjs';/);
  assert.match(editor, /findReveal = useRef\(null\);\n\s*if \(!findReveal\.current\) findReveal\.current = createFindReveal\(find\);/);
  const mount = editor.slice(editor.indexOf('view.current = cm;'), editor.indexOf('void loadEditorLanguage(editor.path)'));
  assert.ok(mount.includes('findReveal.current = createFindReveal(find);'), 'a new view starts like a fresh Jo mount');
  assert.match(editor, /runFindReveal\(cm, find, findReveal\.current\);\n\s*\}, \[find, line, endLine, scrollNonce, normalized\]\);/);
  assert.doesNotMatch(editor, /findMatches/);
  // The jump range keeps its own scroll; the find hit is scrolled only by fo.
  assert.match(editor, /if \(jump\) \{ const target = cm\.state\.doc\.line\(jump\)\.from;/);
  assert.doesNotMatch(editor, /const target = active \?/);
});

const doc = 'alpha beta alpha\ngamma\nbeta alpha\n';
const fakeView = (text = doc, to = 0, extensions = []) => ({ state: EditorState.create({ doc: text, extensions }), viewport: { from: 0, to }, dispatched: 0,
  dispatch(spec) { this.dispatched++; this.state = this.state.update(spec).state; } });
const hits = [{ line: 1, start: 0, end: 5 }, { line: 1, start: 11, end: 16 }, { line: 3, start: 5, end: 10 }];
const opts = { matchCase: false, wholeWord: false, regexp: false };

test('Rr deps, the Pr step and the fo range', () => {
  const find = { query: 'alpha', options: opts, matches: hits, index: 2, scrollNonce: 3 };
  assert.deepEqual(findRevealDeps(find), ['alpha', opts, 3, 3]);
  assert.deepEqual(findRevealDeps(null), [undefined, undefined, undefined, undefined]);
  assert.equal(findRevealDepsChanged(null, findRevealDeps(null)), true, 'an effect runs on mount');
  assert.equal(findRevealDepsChanged(['a', opts, 1, 1], ['a', opts, 1, 1]), false);
  assert.equal(findRevealDepsChanged(['a', opts, 1, 1], ['a', { ...opts }, 1, 1]), true, 'options compare by identity');
  assert.deepEqual(findRevealStep(find, 'alpha'), { reveal: true, settle: true, query: 'alpha' });
  assert.deepEqual(findRevealStep(find, 'alph'), { reveal: true, settle: false, query: 'alpha' });
  assert.deepEqual(findRevealStep({ ...find, matches: [], index: -1 }, 'alpha'), { reveal: false, settle: false, query: 'alpha' });
  assert.deepEqual(findRevealStep(null, 'alpha'), { reveal: false, settle: false, query: undefined });
  const state = EditorState.create({ doc });
  assert.deepEqual(findRevealRange(state.doc, hits[1]), { from: 11, to: 16 });
  assert.deepEqual(findRevealRange(state.doc, hits[2]), { from: 28, to: 33 });
  assert.deepEqual(findRevealRange(state.doc, { line: 9, start: 0, end: 3 }), { from: 34, to: 34 }, 'clamped to the last line start');
  assert.deepEqual(findRevealRange(state.doc, { line: 2, start: 40, end: 44 }), { from: 17, to: 17 }, 'a stale hit falls back to the line start');
});

test('Pr timing: uo only for another hit of the same query; reruns only when Rr changes', () => {
  const view = fakeView(), settled = [];
  const spy = (v) => settled.push(v.state.selection.main.anchor);
  let find = { query: 'alpha', options: opts, matches: hits, index: 0, scrollNonce: 1 };
  // A fresh mount with an open search: Nr starts at x?.query, so the first Pr run already settles.
  const memo = createFindReveal(find);
  assert.deepEqual(runFindReveal(view, find, memo, spy), { reveal: true, settle: true, query: 'alpha' });
  assert.equal(view.state.selection.main.anchor, 0);
  assert.deepEqual(settled, [0]);
  // Re-render with the same deps (e.g. a recomputed matches list): Pr does not run.
  assert.equal(runFindReveal(view, { ...find, matches: [...hits] }, memo, spy), null);
  // Next on the same line: activeLine is unchanged but scrollNonce (Bs) reruns fo + uo.
  find = { ...find, index: 1, scrollNonce: 2 };
  assert.equal(runFindReveal(view, find, memo, spy).settle, true);
  assert.equal(view.state.selection.main.anchor, 11);
  // Next to another line.
  find = { ...find, index: 2, scrollNonce: 3 };
  runFindReveal(view, find, memo, spy);
  assert.deepEqual(settled, [0, 11, 28]);
  // A new query (Hs): fo reveals, uo is skipped.
  find = { query: 'beta', options: opts, matches: [{ line: 1, start: 6, end: 10 }], index: 0, scrollNonce: 4 };
  assert.deepEqual(runFindReveal(view, find, memo, spy), { reveal: true, settle: false, query: 'beta' });
  assert.equal(view.state.selection.main.anchor, 6);
  assert.deepEqual(settled, [0, 11, 28]);
  // Toggling an option (Vs) keeps the query: uo.
  find = { ...find, options: { ...opts, matchCase: true }, scrollNonce: 5 };
  assert.equal(runFindReveal(view, find, memo, spy).settle, true);
  // An edit that shifts the active line reruns Pr with the same query: uo.
  find = { ...find, matches: [{ line: 3, start: 0, end: 4 }] };
  assert.equal(runFindReveal(view, find, memo, spy).settle, true);
  assert.deepEqual(settled, [0, 11, 28, 6, 23]);
  // No hit: nothing to reveal, but Nr still follows the query.
  find = { ...find, query: 'zzz', matches: [], index: -1, scrollNonce: 6 };
  assert.deepEqual(runFindReveal(view, find, memo, spy), { reveal: false, settle: false, query: 'zzz' });
  // Closing clears Nr; reopening with the same query is a new query again.
  assert.deepEqual(runFindReveal(view, null, memo, spy), { reveal: false, settle: false, query: undefined });
  find = { query: 'zzz', options: opts, matches: [{ line: 2, start: 0, end: 3 }], index: 0, scrollNonce: 7 };
  assert.equal(runFindReveal(view, find, memo, spy).settle, false);
  assert.equal(settled.length, 5);
  // A mount with no search: Nr starts undefined.
  assert.deepEqual(createFindReveal(null), { query: undefined, deps: null });
});

test('runFindReveal settles with the real uo: the parse reaches viewport.to + 5e3 after a same-query step', async () => {
  const grammar = await loadEditorLanguage('index.js');
  const text = Array.from({ length: 2000 }, (_, n) => `const value${n} = { key: [${n}, "${'x'.repeat(20)}"] };`).join('\n');
  const view = fakeView(text, 0, [grammar]);
  const before = syntaxTree(view.state).length;
  assert.ok(before < 5000, `initial parse stays short (${before})`);
  const matches = [{ line: 1, start: 6, end: 11 }, { line: 2, start: 6, end: 11 }];
  const memo = createFindReveal(null);
  runFindReveal(view, { query: 'value', options: opts, matches, index: 0, scrollNonce: 1 }, memo);
  assert.equal(syntaxTree(view.state).length, before, 'a new query does not settle');
  runFindReveal(view, { query: 'value', options: opts, matches, index: 1, scrollNonce: 2 }, memo);
  assert.ok(syntaxTree(view.state).length >= 5000, 'the same query settles');
});
