// Files editor host vs official EpitaxyCodeMirror (Jo in 3.6556.2 cbd02b8f2-u2AOwdpo.js): grammar seed,
// selection-chip tooltipParent and the post-reconfigure parse (uo). Official chunk is read as text only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EditorState, syntaxTree } from '../src/code-editor-core.mjs';
import { loadEditorLanguage, settleEditorParse } from '../src/generated/code-editor-current/wrapper.mjs';

const official = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cbd02b8f2-u2AOwdpo.js', import.meta.url);
const host = new URL('../src/source-file-editor.jsx', import.meta.url);
const wrapper = new URL('../src/generated/code-editor-current/wrapper.mjs', import.meta.url);

test('official Jo carries the three behaviors the host mirrors', async () => {
  const text = await readFile(official, 'utf8');
  assert.ok(text.includes('Yt??qi('), 'grammar compartment seed Yt ?? qi(h)');
  assert.ok(text.includes('i&&a&&(a.className="absolute left-0 top-0 size-0",i.append(a))'), 'tooltipParent only inside a pane root');
  assert.ok(text.includes('function vo(e){return e.closest("[data-pane-root]")}'));
  assert.ok(text.includes('tooltipParent:a'));
  assert.ok(text.includes('a?.remove()'));
  assert.ok(text.includes('reconfigure(Zt)}),uo('), 'force-parse after grammar reconfigure');
  assert.ok(text.includes('var co=1e5,lo=5e3;function uo(e){'));
});

test('host source-file-editor matches Jo: pending grammar seed, pane-root chip container, settle after reconfigure', async () => {
  const source = await readFile(host, 'utf8');
  assert.match(source, /grammar\.current\.of\(cachedEditorLanguage\(editor\.path\) \?\? pendingEditorLanguage\(editor\.path\)\)/);
  assert.doesNotMatch(source, /cachedEditorLanguage\(editor\.path\) \?\? \[\]/);
  assert.match(source, /closest\('\[data-pane-root\]'\);/);
  assert.doesNotMatch(source, /closest\('\[data-pane-root\]'\) \?\? host\.current\.parentElement/);
  assert.match(source, /if\(parent&&tooltipParent\)\{tooltipParent\.className='absolute left-0 top-0 size-0'; parent\.append\(tooltipParent\);\}/);
  assert.doesNotMatch(source, /Object\.assign\(tooltipParent\.style/);
  assert.match(source, /tooltipParent\?\.remove\(\)/);
  assert.match(source, /grammar\.current\.reconfigure\(language\) \}\); settleEditorParse\(cm\);/);
  // Jo's [Zt] effect also runs on mount, right after the view is created (w11-sweep-rest: bounded by the mount block
  // itself instead of a fixed line distance from setCommentSlots).
  const mount = source.slice(source.indexOf('view.current = cm;'), source.indexOf('void loadEditorLanguage(editor.path)'));
  assert.ok(mount.length > 0 && mount.includes('settleEditorParse(cm);'), 'settle on mount, before the grammar loads');
});

test('go to line and moving between hits of one search settle the parse like Fo / Jo (w11-sweep-rest)', async () => {
  const text = await readFile(official, 'utf8');
  // Fo: the go-to-line dispatch, then uo(e).
  assert.ok(text.includes('return e.dispatch({effects:[c,...zn(e.state,r,r)],selection:{anchor:s}}),uo(e),c}'));
  // Jo: a new active line of the same query settles the parse.
  assert.ok(text.includes('t&&J!==void 0&&(fo(e,t),t.query===Nr.current&&uo(e)),Nr.current=t?.query'));
  const commands = await readFile(new URL('../src/file-editor-commands.mjs', import.meta.url), 'utf8');
  assert.match(commands, /import \{ selectedEditorContext, settleEditorParse \} from '\.\/generated\/code-editor-current\/wrapper\.mjs';/);
  const go = commands.slice(commands.indexOf('export function goToEditorLocation('), commands.indexOf('export function goToLineShortcut('));
  assert.match(go, /view\.dispatch\(\{ selection: \{ anchor \}[^\n]*\);\n\s*settleEditorParse\(view\); view\.focus\(\);/);
  const source = await readFile(host, 'utf8');
  // w12b-file-editor-find: the Pr block (same query → uo) lives in file-editor-find.mjs; see w12b-file-editor-find.test.mjs.
  assert.match(source, /cm\.dispatch\(\{ effects \}\);\n[^\n]*\n[^\n]*\n\s*runFindReveal\(cm, find, findReveal\.current\);/);
});

test('settleEditorParse is the official uo bound in the generated wrapper', async () => {
  const text = await readFile(wrapper, 'utf8');
  assert.match(text, /var co = 1e5;/);
  assert.match(text, /var lo = 5e3;/);
  assert.match(text, /function uo\(e\) \{/);
  assert.match(text, /export \{ uo as settleEditorParse \};/);
});

// uo only needs viewport.to, state and dispatch (forceParsing dispatches an empty transaction).
const fakeView = (state, to) => ({ state, viewport: { from: 0, to }, dispatched: 0, dispatch(spec) { this.dispatched++; this.state = this.state.update(spec).state; } });
const bigScript = lines => Array.from({ length: lines }, (_, n) => `const value${n} = { key: [${n}, "${'x'.repeat(20)}"] };`).join('\n');

test('settleEditorParse force-parses to viewport.to + 5e3 when the grammar is set', async () => {
  const grammar = await loadEditorLanguage('index.js');
  const view = fakeView(EditorState.create({ doc: bigScript(2000), extensions: [grammar] }), 0);
  const before = syntaxTree(view.state).length;
  assert.ok(before < 5000, `initial parse stays short (${before})`);
  settleEditorParse(view);
  assert.equal(view.dispatched, 1);
  assert.ok(syntaxTree(view.state).length >= 5000);
});

test('settleEditorParse skips without a language or when more than 1e5 characters are unparsed', async () => {
  const plain = fakeView(EditorState.create({ doc: bigScript(2000) }), 0);
  settleEditorParse(plain);
  assert.equal(plain.dispatched, 0);
  const grammar = await loadEditorLanguage('index.js');
  const far = fakeView(EditorState.create({ doc: bigScript(8000), extensions: [grammar] }), 200000);
  settleEditorParse(far);
  assert.equal(far.dispatched, 0);
});
