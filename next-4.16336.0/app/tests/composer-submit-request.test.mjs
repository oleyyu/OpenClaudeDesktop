// R3-composer review fix (composer-shell, step 3): the Code card's root became uM's div, so main.jsx's file-comment save
// with ⌘/Ctrl+Enter (c82eca2bd `T(n, {submit: t, viaKeyboard: e})`) could no longer submit the draft through
// `closest('form').requestSubmit()`. The composer element now carries the request (src/composer-submit-request.mjs).
// Behaviour, not source text: main.jsx's own onSaveComment arrow (taken from its AST and evaluated, not re-written) runs
// against a Code card element tree with no <form>, a controlled frame queue and the composer's real request.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';
import { attachComposerSubmitRequest, requestComposerSubmit } from '../src/composer-submit-request.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const mainSource = read('src/main.jsx');
const composerSource = read('src/source-composer.jsx');

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value.type === 'string') walk(value, visit);
  }
}
const text = (source, node) => source.slice(node.start, node.end);

// main.jsx's filePaneActions.onSaveComment: `composerAttachable ? (entry, {viaKeyboard, submit}) => {…} : null`.
function mainSaveComment() {
  const ast = parseAst(mainSource, { lang: 'jsx' }, 'src/main.jsx');
  let found = null;
  walk(ast, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id?.name !== 'filePaneActions') return;
    for (const prop of node.init.properties) if (prop.key?.name === 'onSaveComment') found = prop.value;
  });
  assert.ok(found, 'filePaneActions.onSaveComment');
  assert.equal(found.type, 'ConditionalExpression');
  assert.equal(text(mainSource, found.test), 'composerAttachable');
  assert.equal(found.consequent.type, 'ArrowFunctionExpression');
  return text(mainSource, found.consequent);
}

// A Code card as step 3 renders it: div.sc-composer > [data-cds=ChatComposer] > card > editor box > the editor element.
function codeCard() {
  const node = (tag, parent = null) => ({ tag, parent, closest(selector) { for (let n = this; n; n = n.parent) if (n.tag === selector) return n; return null; } });
  const root = node('div');
  const editor = node('div', node('div', node('div', node('div', root))));
  editor.focused = 0;
  editor.focus = () => { editor.focused += 1; };
  return { root, editor };
}

function harness({ running = false } = {}) {
  const { editor } = codeCard();
  const submits = [];
  // SourceComposer: assignEditor attaches `() => submitRequest.current?.()`, and each render sets
  // `submitRequest.current = () => submit(running ? "next" : undefined)`.
  const submitRequest = { current: null };
  attachComposerSubmitRequest(editor, () => submitRequest.current?.());
  submitRequest.current = () => submits.push({ priority: running ? 'next' : undefined });
  const frames = [];
  const attachments = [];
  const deps = {
    serializeLineComment: ({ path: file, start, text: body }) => `${file}:${start} ${body}`,
    makeSnippet: (body, meta) => ({ body, ...meta }),
    setAttachments: (update) => attachments.push(update([])),
    addSnippet: (entries, snippet) => [...entries, snippet],
    requestAnimationFrame: (callback) => frames.push(callback),
    textarea: { current: editor },
    requestComposerSubmit,
  };
  // eslint-disable-next-line no-new-func
  const onSaveComment = new Function(...Object.keys(deps), `return (${mainSaveComment()});`)(...Object.values(deps));
  const flushFrames = () => { while (frames.length) frames.shift()(); };
  return { editor, submits, attachments, onSaveComment, flushFrames, frames };
}

const entry = { key: 'k1', path: 'src/a.js', start: 3, end: 3, body: 'rename this' };

test('⌘/Ctrl+Enter on a file comment: the snippet is attached, then a frame later the composer takes focus and submits once', () => {
  const h = harness();
  h.onSaveComment(entry, { viaKeyboard: true, submit: true });
  assert.equal(h.attachments.length, 1, 'the snippet is attached first');
  assert.equal(h.submits.length, 0, 'nothing is sent before the frame (the attachment renders first)');
  assert.equal(h.frames.length, 1);
  h.flushFrames();
  assert.equal(h.editor.focused, 1);
  assert.deepEqual(h.submits, [{ priority: undefined }]);
  // The card has no <form>: the pre-step-3 path finds nothing to submit, which is what broke.
  assert.equal(h.editor.closest('form'), null);
});

test('while a turn runs the request queues next, as the old form onSubmit did', () => {
  const h = harness({ running: true });
  h.onSaveComment(entry, { viaKeyboard: true, submit: true });
  h.flushFrames();
  assert.deepEqual(h.submits, [{ priority: 'next' }]);
});

test('Enter (save only) focuses the composer without sending; a pointer save does neither', () => {
  const keyboard = harness();
  keyboard.onSaveComment(entry, { viaKeyboard: true, submit: false });
  keyboard.flushFrames();
  assert.equal(keyboard.editor.focused, 1);
  assert.equal(keyboard.submits.length, 0);
  const pointer = harness();
  pointer.onSaveComment(entry, { viaKeyboard: false, submit: false });
  pointer.flushFrames();
  assert.equal(pointer.frames.length, 0);
  assert.equal(pointer.editor.focused, 0);
  assert.equal(pointer.submits.length, 0);
  assert.equal(pointer.attachments.length, 1, 'the comment is still attached');
});

test('the request follows the composer element: the latest submit runs, an old element loses it, nothing without one', () => {
  const first = {}, second = {};
  const calls = [];
  const latest = { current: () => calls.push('render 1') };
  const detachFirst = attachComposerSubmitRequest(first, () => latest.current());
  latest.current = () => calls.push('render 2');
  assert.equal(requestComposerSubmit(first), true);
  assert.deepEqual(calls, ['render 2'], 'the closure of the latest render');
  // SourceComposer's callback ref: detach the old element, attach the new one.
  detachFirst();
  attachComposerSubmitRequest(second, () => latest.current());
  assert.equal(requestComposerSubmit(first), false);
  assert.equal(requestComposerSubmit(second), true);
  assert.equal(requestComposerSubmit(null), false);
  assert.equal(requestComposerSubmit({}), false);
  // A stale detach never removes a newer request.
  const third = {};
  const staleDetach = attachComposerSubmitRequest(third, () => calls.push('a'));
  attachComposerSubmitRequest(third, () => calls.push('b'));
  staleDetach();
  assert.equal(requestComposerSubmit(third), true);
  assert.equal(calls.at(-1), 'b');
  assert.doesNotThrow(() => attachComposerSubmitRequest(null, () => {})());
});

test('wiring: SourceComposer attaches the request in its editor ref and sets it after submit; main.jsx no longer looks for a form', () => {
  assert.match(composerSource, /const CardRoot = mode === "code" \? "div" : "form";/, 'the Code card root is a div');
  const assign = composerSource.slice(composerSource.indexOf('const assignEditor = useCallback('), composerSource.indexOf('}, [textarea]);'));
  assert.match(assign, /detachSubmitRequest\.current\?\.\(\);\s*detachSubmitRequest\.current = attachComposerSubmitRequest\(element, \(\) => submitRequest\.current\?\.\(\)\);/);
  const submitAt = composerSource.indexOf('const submit = (priority) => {');
  const requestAt = composerSource.indexOf('submitRequest.current = () => submit(running ? "next" : undefined);');
  assert.ok(submitAt > 0 && requestAt > submitAt, 'set after submit is defined');
  assert.match(mainSource, /import \{ requestComposerSubmit \} from "\.\/composer-submit-request\.mjs";/);
  assert.match(mainSaveComment(), /if\(submit\)requestComposerSubmit\(textarea\.current\);/);
  assert.doesNotMatch(mainSource, /textarea\.current\?\.closest\(['"]form['"]\)/, 'no caller reaches the composer through a form');
});
