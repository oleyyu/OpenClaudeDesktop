// The isolated 4.16336.0 code-editor-current graph (scripts/extract-code-editor-current.mjs extractCurrentEditorV4,
// src/generated/code-editor-current-v4): source contract, unique root location, closure boundaries, and the behaviour the
// 3.6556.2 graph is held to (tests/editor-current-behavior, file-editor-language, file-editor-selection) on the new slices.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { extractCurrentEditorV4, CODE_EDITOR_CURRENT_V4_OUTPUT } from '../scripts/extract-code-editor-current.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';
// The 4.16336.0 core chunk keeps the 3.6556.2 export aliases src/code-editor-core.mjs reads (each checked by shape or
// declaration in analysis/.../regions/batch1/code-editor-current/logs/core-alias-map.json).
import {
  Lt as EditorView, hn as EditorState, mn as EditorSelection, It as Decoration, c as history, x as undoDepth, b as undo,
  Sn as Transaction, rt as foldedRanges, _t as syntaxTree, dt as indentUnit, Y as foldEffect, H as codeFoldingState,
  nt as foldable, ot as getIndentation, en as keymap,
} from '../src/generated/code-editor-current-v4/c148e7537-CIAfDEJZ.js';
import * as wrapper from '../src/generated/code-editor-current-v4/wrapper.mjs';
import { editorTheme, editorThemePalette } from '../src/generated/code-editor-current-v4/theme.mjs';
import { suppressEscapeRepeat, suppressKeyRepeat } from '../src/generated/code-editor-current-v4/keyboard-repeat.mjs';
import { editorLayout, lineNumberLayout, normalizeEditorNewlines } from '../src/generated/code-editor-current-v4/layout-tokens.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, CODE_EDITOR_CURRENT_V4_OUTPUT);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const roots = JSON.parse(fs.readFileSync(path.join(dir, 'roots.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const {
  copyLines, selectedEditorContext, lineIndentLevels, activeIndentBlock, indentGradient, detectedIndentation, externalEditorChange,
  resolveEditorLanguage, loadEditorLanguage, codeFolding, rememberEditorView, restoreEditorView, restoredHistory, detectIndentation,
  resetIndentation, insertTabIndent, bracketIndentation, bracketEnter, lineRangeSelection, lineSelectionAnchor, selectionTooltipAnchor,
  selectionTooltipCoords,
} = wrapper;
const themeRules = extension => {
  if (Array.isArray(extension)) return extension.flatMap(themeRules);
  if (Array.isArray(extension?.rules)) return extension.rules;
  return extension && typeof extension === 'object' && 'value' in extension ? themeRules(extension.value) : [];
};

test('the 4.16336.0 graph regenerates byte for byte (--check)', async () => {
  const checked = await extractCurrentEditorV4({ check: true });
  assert.equal(checked.referenceVersion, '4.16336.0');
});

test('manifest: 4.16336.0 snapshot, cds-core shared graph, every slice from the frozen official bytes', () => {
  assert.equal(manifest.referenceVersion, official4.referenceVersion);
  assert.equal(manifest.referenceSnapshot, official4.referenceSnapshot);
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.generator, 'scripts/extract-code-editor-current.mjs');
  assert.equal(manifest.adapterModule, 'src/code-editor-current-adapters.mjs');
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, '4.16336.0', m.target);
    assert.equal(m.sourceSha256, sha(fs.readFileSync(path.join(official4.ionSource, m.source))), m.target);
    assert.equal(m.sha256, sha(fs.readFileSync(path.join(dir, m.target))), m.target);
    if (m.verbatim) assert.equal(m.sha256, m.sourceSha256, `${m.target} is a byte copy`);
    for (const i of m.imports) {
      assert.ok(['generated', 'verbatim', 'adapter', 'shared-graph'].includes(i.kind), `${m.target} imports ${i.from} (${i.kind})`);
      assert.equal(i.kind === 'shared-graph', i.from.startsWith('../cds-core/'), `${m.target} imports ${i.from} (${i.kind})`);
      if (i.kind === 'adapter') assert.equal(i.from, '../../code-editor-current-adapters.mjs');
    }
  }
  // The wrapper, its CodeMirror runtime and the language chunks are 4.16336.0 files; no 3.6556.2 chunk name survives.
  const names = manifest.modules.map(m => m.source);
  for (const name of ['cbd02b8f2-WPvqHhA2.js', 'c148e7537-CIAfDEJZ.js', 'vendor-prosemirror-Cl8idfV9.js', 'c89b186da-C6sI0sHZ.js', 'cc3bc2027-C1f7RNlI.js'])
    assert.ok(names.includes(name), name);
  for (const old of ['cbd02b8f2-u2AOwdpo.js', 'c148e7537-CAXQJmwB.js', 'c8a544a8c-D-YE3_A6.js', 'cc3bc2027-CqmDBxcX.js'])
    assert.ok(!names.includes(old), old);
  // Pure cds-core bindings sliced again are recorded; no module state is copied (the engine stops on that, D46).
  // Each copy is the same original declaration cds-core holds without publishing it (public names are linked, never copied).
  const cds = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(cds.publicNames).map(p => `${p.file}#${p.local}`));
  const held = manifest.modules.flatMap(m => m.heldByViewTabs.map(name => ({ m, name })));
  assert.ok(held.some(({ m, name }) => m.source === 'preload-helper-BBljBeZo.js' && name === 'e'));
  for (const { m, name } of held) {
    const owner = cds.modules.find(c => c.source === m.source)?.bindings.find(b => b.name === name);
    assert.ok(owner, `${m.source}#${name} is a cds-core binding`);
    assert.equal(published.has(`${m.source}#${name}`), false, `${m.source}#${name} is not a cds-core public name`);
    assert.equal(m.bindings.find(b => b.name === name).sha256, owner.sha256, `${m.source}#${name} is the same declaration`);
  }
  // A link names the cds-core module export (exportName): the semantic name for most, the raw local for a wave-5 binding
  // (e.g. shared-0 hu), so it is resolved by target and exportName.
  const byExport = new Map(Object.values(cds.publicNames).map(p => [`${p.target}:${p.exportName}`, p]));
  for (const m of manifest.modules) for (const i of m.imports.filter(i => /cds-core/.test(i.from))) {
    assert.equal(i.kind, 'shared-graph', `${m.target} links ${i.name}`);
    const entry = byExport.get(`${i.from.replace('../cds-core/', '')}:${i.name}`);
    assert.ok(entry, `${m.target} links cds-core public name ${i.name}`);
    // via is `file:export` for an import, `file#local` for a same-file reference (since cds-core wave 4, shared-25 vd -> _d).
    assert.equal(entry.file, i.via.split(/[#:]/)[0], `${m.target} links ${i.name} from its owner`);
  }
});

test('roots: each found on the official AST by its features, uniquely, at its pinned local', () => {
  assert.equal(roots.source, 'cbd02b8f2-WPvqHhA2.js');
  assert.equal(roots.sourceSha256, sha(fs.readFileSync(path.join(official4.ionSource, roots.source))));
  const wrapperModule = manifest.modules.find(m => m.source === roots.source);
  assert.equal(Object.keys(roots.roots).length, Object.keys(wrapperModule.exports).length);
  for (const [name, root] of Object.entries(roots.roots)) {
    assert.equal(wrapperModule.exports[root.local], name, name);
    assert.ok(root.features.length > 0, name);
    assert.ok(wrapperModule.bindings.some(b => b.name === root.local && b.sha256 === root.sha256), `${name} declaration hash`);
  }
  // The 3.6556.2 names they replace (cbd02b8f2-u2AOwdpo.js), for the record.
  assert.equal(roots.roots.loadEditorLanguage.previous, 'Ji');
  assert.equal(roots.roots.editorTheme.previous, 'xa');
  assert.equal(roots.roots.resetIndentation.via, 'tl');
  assert.ok(roots.preloadCalls > 20);
});

test('withheld 3.6556.2 names: findMatchTheme removed, pendingEditorLanguage blocked on the Shiki registry owner', async () => {
  const theme = await import('../src/generated/code-editor-current-v4/theme.mjs');
  assert.equal('findMatchTheme' in theme, false);
  assert.equal('pendingEditorLanguage' in wrapper, false);
  assert.equal('highlightWhitespace' in wrapper, false);
  assert.deepEqual(Object.keys(roots.withheld).sort(), ['findMatchTheme', 'highlightWhitespace', 'pendingEditorLanguage']);
  assert.equal(roots.withheld.pendingEditorLanguage.status, 'blocked');
  // Nothing in the closure reaches the registry (c476e9be4 O) or the Shiki highlighter / worker.
  const c476 = manifest.modules.find(m => m.source === 'c476e9be4-C5Gc087T.js');
  assert.deepEqual(c476.bindings.map(b => b.name).sort(), ['d', 'f', 'l', 'm', 'p', 'u']);
  const w = manifest.modules.find(m => m.source === roots.source).bindings.map(b => b.name);
  for (const local of ['qo', 'Ko', 'Bc', 'wc', 'Ms', 'js', 'Ps', 'lu', 'Uc']) assert.ok(!w.includes(local), local);
  assert.ok(!manifest.modules.some(m => /^c5a058668-|^c34e6410a-/.test(m.source)));
});

test('the facades keep the 3.6556.2 host names; baseLanguageBehavior is Zc members 4-8 and 11', () => {
  const old = fs.readFileSync(path.join(app, 'src/generated/code-editor-current/wrapper.mjs'), 'utf8');
  const oldNames = [...old.matchAll(/^export \{([^}]*)\}/gm)].flatMap(m => [...m[1].matchAll(/\b[\w$]+ as (\w+)/g)].map(n => n[1])).concat(['baseLanguageBehavior', 'highlightWhitespace']);
  assert.ok(oldNames.length >= 40, `parsed ${oldNames.length} 3.6556.2 names`);
  for (const name of new Set(oldNames)) {
    if (name in roots.withheld) continue;
    assert.ok(name in wrapper, `wrapper.mjs still exports ${name}`);
  }
  assert.equal(wrapper.baseLanguageBehavior.length, 6);
  assert.deepEqual(roots.baseLanguageBehavior.members.map(m => m.index), [3, 4, 5, 6, 7, 10]);
  assert.equal(wrapper.baseLanguageBehavior[2], wrapper.activeLineHighlight);
  // The official composition of the view options, and the whitespace highlighter it mounts directly.
  const options = wrapper.editorViewOptions(true, true, true, 4, true, false);
  assert.ok(options.flat(2).includes(wrapper.whitespaceHighlighter));
  assert.ok(!wrapper.editorViewOptions(false, false, false, 2, false, false).flat(2).includes(wrapper.whitespaceHighlighter));
});

test('current copy-lines merges adjacent selections and preserves both caret positions', () => {
  for (const above of [true, false]) {
    let state = EditorState.create({ doc: 'one\ntwo\nthree', selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(5)]), extensions: [EditorState.allowMultipleSelections.of(true), history()] });
    let transaction;
    assert.equal(copyLines(above)({ state, dispatch: tr => { transaction = tr; state = tr.state; } }), true);
    assert.equal(state.doc.toString(), 'one\ntwo\none\ntwo\nthree');
    assert.deepEqual(state.selection.ranges.map(r => r.head), above ? [9, 13] : [1, 5]);
    assert.equal(transaction.isUserEvent('input.copyline'), true);
    assert.equal(undoDepth(state), 1);
  }
  const state = EditorState.create({ doc: 'locked', extensions: [EditorState.readOnly.of(true)] });
  assert.equal(copyLines(true)({ state, dispatch: () => assert.fail('read-only edit') }), false);
});
test('attachment chooses a nonblank selected group when the primary group is only whitespace', () => {
  const state = EditorState.create({ doc: '   \n\nhello\nworld', selection: EditorSelection.create([EditorSelection.range(0, 3), EditorSelection.range(5, 10)], 0), extensions: [EditorState.allowMultipleSelections.of(true)] });
  assert.deepEqual(selectedEditorContext(state), { text: 'hello', range: { fromLine: 3, toLine: 3 } });
  assert.equal(selectedEditorContext(EditorState.create({ doc: ' \n ', selection: { anchor: 0, head: 3 } })), null);
});
test('active indent guides track the enclosing block and use distinct active/inactive colors', () => {
  const state = EditorState.create({ doc: 'root\n  a\n    b\n  c\nend', extensions: [detectedIndentation(true, 'outline.txt')] });
  const levels = lineIndentLevels(state);
  assert.deepEqual([1, 2, 3, 4, 5].map(levels), [0, 1, 2, 1, 0]);
  assert.deepEqual(activeIndentBlock(levels, 3, 1, 5, null), { first: 3, last: 3, level: 2 });
  assert.deepEqual(activeIndentBlock(levels, 1, 1, 5, null), { first: 2, last: 4, level: 1 });
  assert.match(indentGradient(2, 2, 2), /currentColor 14%/);
  assert.match(indentGradient(2, 2, 2), /currentColor 40%/);
});
test('external edits use a small change range, preserve selection, and reveal intersecting folds', () => {
  let state = EditorState.create({ doc: 'a {\n  old\n}\nend', selection: { anchor: 13 }, extensions: [history(), codeFoldingState()] });
  state = state.update({ effects: foldEffect.of({ from: 6, to: 9 }) }).state;
  assert.equal(foldedRanges(state).size, 1);
  const view = { get state() { return state; }, dispatch: tr => { state = state.update(tr).state; } };
  const changes = externalEditorChange(view, 'a {\n  new value\n}\nend');
  assert.equal(changes.from, 6); assert.equal(changes.to, 9);
  assert.equal(foldedRanges(state).size, 0);
  state = state.update({ changes, annotations: Transaction.addToHistory.of(false) }).state;
  assert.equal(state.doc.toString(), 'a {\n  new value\n}\nend');
  assert.equal(state.selection.main.head, 19);
  assert.equal(undoDepth(state), 0);
});
test('current grammars include dotenv, configuration, ignore files, and diff/patch', async () => {
  for (const filename of ['.env', 'local.cfg', 'change.diff', 'fix.patch', '.assetsignore', '.git-blame-ignore-revs', '.vercelignore', '.gitattributes']) {
    assert.equal(typeof resolveEditorLanguage(filename).loader, 'function', filename);
    const grammar = await loadEditorLanguage(filename);
    assert.ok(grammar?.language, filename);
    assert.doesNotThrow(() => EditorState.create({ doc: 'A=value\n', extensions: [grammar] }));
  }
});
test('theme respects active guide overrides and official fallback selection colors', () => {
  const palette = editorThemePalette({ type: 'dark', colors: { 'editor.foreground': '#fff', 'editorIndentGuide.background1': '#123', 'editorIndentGuide.activeBackground1': '#abc' } });
  assert.equal(palette.indentGuide, '#123'); assert.equal(palette.indentGuideActive, '#abc');
  assert.equal(palette.selection, '#0099ff4d'); assert.equal(palette.activeLine, '#ffffff0d');
  // 4.16336.0: the find highlights come from the official claude-dark / claude-light defaults (c74f29bd2 a).
  assert.deepEqual(palette.find.current, { background: '#ffd5008c', foreground: '#000000', border: 'color-mix(in srgb, currentColor 60%, transparent)' });
  assert.equal(editorThemePalette({ type: 'light', colors: {} }).find.others.background, '#ffd50040');
});
test('4.16336.0 layout tokens keep the editor padding values; fold pad and gutter cursor stay CDS variables; find matches are themed', () => {
  const editorRules = themeRules(editorTheme({ type: 'light', colors: { 'editor.foreground': '#111' } })).join('\n');
  assert.match(editorRules, /\.cm-foldPlaceholder[^}]*padding: 0 var\(--cds-pad-xs\)/);
  assert.doesNotMatch(editorRules, /--cds-pad-xs, 4px/);
  assert.match(editorRules, /\.cm-content \{[^}]*padding: 8px 0/);
  assert.match(editorRules, /\.cm-line \{[^}]*padding: 0 12px 0 4px/);
  assert.match(editorRules, /\.cm-lineNumbers \.cm-gutterElement \{[^}]*padding: 0 8px 0 18px;[^}]*min-width: 2\.5rem/);
  assert.match(editorRules, /\.cm-epitaxyFindMatch-active[^}]*background-color: #ffd5008c/);
  const foldingRules = themeRules(codeFolding(true, { formatMessage: ({ defaultMessage }) => defaultMessage })).join('\n');
  assert.match(foldingRules, /\.cm-foldGutter span[^}]*cursor: var\(--cds-cursor-interactive\)/);
  assert.match(foldingRules, /\.cm-foldPlaceholder[^}]*cursor: var\(--cds-cursor-interactive\)/);
  assert.deepEqual(editorLayout, { padBlock: '8px', linePadStart: '4px', linePadEnd: '12px', numberPadStart: '18px', foldColumnWidth: '12px' });
  assert.deepEqual(lineNumberLayout(true), { minWidth: '2rem', padEnd: '0px' });
  assert.equal(normalizeEditorNewlines('a\r\nb\rc\nd', '\n'), 'a\nb\nc\nd');
});
test('Escape/Enter suppression consumes held repeats and releases on keyup or another key', () => {
  const listeners = new Map();
  const target = { addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }, dispatchEvent(event) { for (const fn of [...(listeners.get(event.type) ?? [])]) fn(event); } };
  const key = (type, key, repeat = false) => Object.assign(new Event(type, { cancelable: true }), { key, repeat });
  for (const pressed of ['Escape', 'Enter']) {
    const suppress = () => (pressed === 'Escape' ? suppressEscapeRepeat(target) : suppressKeyRepeat(pressed, target));
    suppress();
    const held = key('keydown', pressed, true); target.dispatchEvent(held); assert.equal(held.defaultPrevented, true);
    target.dispatchEvent(key('keyup', pressed));
    const released = key('keydown', pressed, true); target.dispatchEvent(released); assert.equal(released.defaultPrevented, false);
    suppress(); target.dispatchEvent(key('keydown', 'a'));
    const later = key('keydown', pressed, true); target.dispatchEvent(later); assert.equal(later.defaultPrevented, false);
  }
});

test('every original parser family loads independently of desktop services; filename aliases resolve', async () => {
  for (const name of ['a.tsx', 'a.jsonc', 'a.css', 'a.less', 'a.scss', 'a.sass', 'a.html', 'a.vue', 'a.xml', 'a.md', 'a.py', 'a.rs', 'a.go', 'a.java', 'a.cpp', 'a.sql', 'a.php', '.bashrc', 'a.yaml', 'a.toml', 'Dockerfile', 'a.rb', 'a.swift', 'a.proto', 'a.lua', 'a.hs', 'a.groovy', 'a.properties', 'a.ini', 'a.pas', 'a.f90', 'a.scm', 'a.lisp', 'a.jinja', 'a.cmd', 'a.hcl', 'a.graphql', 'a.ps1', 'a.fs', 'a.ml', 'a.cs', 'a.kt', 'a.scala', 'a.m', 'a.mm', 'a.dart', 'a.glsl']) {
    const grammar = await loadEditorLanguage(name); assert.ok(grammar?.language, name);
    assert.doesNotThrow(() => EditorState.create({ doc: 'sample', extensions: [grammar] }), name);
  }
  assert.equal(resolveEditorLanguage('/folder/Cargo.lock').key, 'ext:toml');
  assert.equal(resolveEditorLanguage('/folder/.editorconfig').key, 'ext:properties');
  assert.equal(resolveEditorLanguage('main.c++').key, 'ext:cpp');
  assert.equal(await loadEditorLanguage('unknown.xyz'), null);
  assert.equal((await loadEditorLanguage('a.tsx')), (await loadEditorLanguage('b.tsx')));
  // 4.16336.0 (Io): Bazel / Buck build files read as Python.
  assert.equal(resolveEditorLanguage('/repo/BUILD').key, 'ext:python');
  assert.equal(wrapper.cachedEditorLanguage('c.tsx'), await loadEditorLanguage('c.tsx'));
});
test('real JavaScript and Python parse trees supply folds and indentation', async () => {
  for (const [name, doc, node, indent] of [['a.js', 'function demo() {\n  return true;\n}\n', 'FunctionDeclaration', 2], ['a.py', 'def demo():\n    return True\n', 'FunctionDefinition', 4]]) {
    const state = EditorState.create({ doc, extensions: [await loadEditorLanguage(name), detectedIndentation(true, name)] });
    assert.match(syntaxTree(state).toString(), new RegExp(node));
    const first = state.doc.line(1); assert.ok(foldable(state, first.from, first.to), name);
    assert.equal(getIndentation(state, state.doc.line(2).from), indent, name);
  }
});
test('original indentation detection chooses tabs or smallest likely unit and resets on replacement', () => {
  assert.equal(detectIndentation(['if {', '    body', '        nested', '    end', '}']), '    ');
  assert.equal(detectIndentation(['if {', '\tbody', '\t\tnested', '}']), '\t');
  let state = EditorState.create({ doc: 'plain', extensions: [detectedIndentation(true, 'plain.txt')] }); assert.equal(state.facet(indentUnit), '  ');
  state = state.update({ changes: { from: 0, to: state.doc.length, insert: 'block\n    body' }, annotations: resetIndentation.of(true) }).state;
  assert.equal(state.facet(indentUnit), '    ');
});
test('Makefile family and .tsv files fall back to tab indentation; detection and the disabled field stay unchanged', () => {
  const unit = (p, doc = 'all:\n', enabled = true) => EditorState.create({ doc, extensions: [detectedIndentation(enabled, p)] }).facet(indentUnit);
  for (const p of ['Makefile', '/repo/GNUmakefile', 'src/rules.mk', 'build.mak', 'C:\\repo\\Makefile']) assert.equal(unit(p), '\t', p);
  for (const p of ['a.js', 'Makefile.am', 'notes.txt']) assert.equal(unit(p), '  ', p);
  assert.equal(unit('Makefile', 'all:\n    echo ok\n'), '    ');
  assert.equal(unit('Makefile', 'all:\n', false), '  ');
  for (const p of ['data.tsv', '/repo/OUT.TSV', 'C:\\repo\\rows.tsv']) assert.equal(unit(p, 'a\tb\n'), '\t', p);
  for (const p of ['data.csv', 'data.tsv.txt']) assert.equal(unit(p, 'a\tb\n'), '  ', p);
  let state = EditorState.create({ doc: 'all:\n    echo ok\n', extensions: [detectedIndentation(true, 'Makefile')] });
  state = state.update({ changes: { from: 0, to: state.doc.length, insert: 'all:\n' }, annotations: resetIndentation.of(true) }).state;
  assert.equal(state.facet(indentUnit), '\t');
});
test('Tab inserts to next indentation stop; selected lines indent together', () => {
  let state = EditorState.create({ doc: 'x\n  y', selection: { anchor: 1 }, extensions: [detectedIndentation(true, 'x.txt')] });
  const dispatch = tr => { state = tr.state; };
  assert.equal(insertTabIndent({ state, dispatch }), true); assert.equal(state.doc.toString(), 'x \n  y');
  state = state.update({ selection: { anchor: 0, head: state.doc.length } }).state;
  insertTabIndent({ state, dispatch }); assert.equal(state.doc.toString(), '  x \n    y');
});
test('fallback bracket Enter splits a pair, uses detected indentation, and read-only rejects it', () => {
  let state = EditorState.create({ doc: '{}', selection: { anchor: 1 }, extensions: [detectedIndentation(true, 'pair.js'), bracketIndentation(true)] });
  assert.equal(bracketEnter({ state, dispatch: tr => { state = tr.state; } }), true);
  assert.equal(state.doc.toString(), '{\n  \n}'); assert.equal(state.selection.main.head, 4);
  state = EditorState.create({ doc: '{}', selection: { anchor: 1 }, extensions: [EditorState.readOnly.of(true)] });
  assert.equal(bracketEnter({ state, dispatch: () => assert.fail('read only') }), false);
});
test('original bounded view cache restores history only for the same document and consumes entries', () => {
  let state = EditorState.create({ doc: 'before', extensions: [history()] });
  state = state.update({ changes: { from: 0, to: 6, insert: 'after' }, userEvent: 'input' }).state;
  const view = { state, scrollDOM: { scrollTop: 0, scrollLeft: 0 }, scrollSnapshot: () => ({ saved: true }) };
  rememberEditorView('cache-test', view, {});
  const cached = restoreEditorView('cache-test', 'after'); assert.ok(cached); assert.equal(restoreEditorView('cache-test', 'after'), undefined);
  let restored = EditorState.create({ doc: 'after', selection: cached.selection, extensions: [restoredHistory(cached), history()] });
  assert.equal(undo({ state: restored, dispatch: tr => { restored = tr.state; } }), true); assert.equal(restored.doc.toString(), 'before');
  rememberEditorView('cache-test', view, {}); assert.equal(restoreEditorView('cache-test', 'external'), undefined);
  for (let n = 0; n < 33; n++) rememberEditorView('bounded-' + n, view, {});
  assert.equal(restoreEditorView('bounded-0', 'after'), undefined); assert.ok(restoreEditorView('bounded-32', 'after'));
});
test('original gutter selects whole lines in either direction and expands hidden folded lines', () => {
  let state = EditorState.create({ doc: 'a\nb\nc\nd' }); assert.deepEqual(lineRangeSelection(state, 2, 3).toJSON(), EditorSelection.single(2, 6).toJSON()); assert.deepEqual(lineRangeSelection(state, 3, 2).toJSON(), EditorSelection.single(6, 2).toJSON());
  state = state.update({ selection: lineRangeSelection(state, 3, 2) }).state; assert.equal(lineSelectionAnchor(state), 3);
  state = EditorState.create({ doc: 'a {\n  b\n}\nx', extensions: [codeFoldingState()] }); state = state.update({ effects: foldEffect.of({ from: 3, to: 9 }) }).state;
  assert.equal(lineRangeSelection(state, 1, 1).main.to, 10);
});
test('selection chip chooses caret side, excludes a trailing newline, and flips when clipped', () => {
  const forward = EditorState.create({ doc: 'first\nsecond\nthird', selection: { anchor: 0, head: 13 } }); assert.deepEqual(selectionTooltipAnchor(forward), { pos: 12, above: false, far: 0 });
  const reverse = forward.update({ selection: { anchor: 13, head: 0 } }).state; assert.deepEqual(selectionTooltipAnchor(reverse), { pos: 0, above: true, far: 12 });
  const space = { top: 0, bottom: 100, left: 0, right: 200 }, head = { left: 20, right: 21, top: 80, bottom: 95 }, far = { left: 0, right: 1, top: 40, bottom: 55 };
  assert.deepEqual(selectionTooltipCoords({ head, far, space, chipHeight: 20, above: false }), { left: 20, right: 21, top: 40, bottom: 100 });
  assert.deepEqual(selectionTooltipCoords({ head, far: null, space, chipHeight: 20, above: false }), head);
});
test('the 4.16336.0 keymap keeps the copy-line rebinding and the host extensions build a state', () => {
  // Hn: the default keymap without its own copy-line command, with zn bound instead, and the Mod-/ guard Ln last.
  assert.ok(wrapper.editorKeymap.some(binding => binding.run === undefined && typeof binding.any === 'function'));
  const state = EditorState.create({ doc: 'x', extensions: [wrapper.baseLanguageBehavior, keymap.of(wrapper.editorKeymap), wrapper.restoredFolds(true, undefined),
    wrapper.tabIndentation(true, 'hint'), wrapper.autoCloseBrackets(true), wrapper.columnSelection(true), wrapper.indentGuides(), wrapper.commentRangeHighlight] });
  assert.equal(state.doc.toString(), 'x');
  assert.ok(EditorView && Decoration);
});

test('isolated until the production switch: no host module imports the 4.16336.0 graph', () => {
  const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : walk(full);
    return /\.(m?js|jsx)$/.test(entry.name) ? [full] : [];
  });
  const adapters = path.join(app, 'src/code-editor-current-adapters.mjs');
  for (const file of walk(path.join(app, 'src')).filter(file => file !== adapters)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /code-editor-current-v4|code-editor-current-adapters/, path.relative(app, file));
});
