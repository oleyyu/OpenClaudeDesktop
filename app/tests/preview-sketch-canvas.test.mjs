// w10-editor-preview-sketch: the canvas adapter is the 3.6556.2 c23255574-B0Bkz_WU.js canvas (EditFilled glyph to the
// export, React Compiler output with view-tabs helpers), so it loads through Vite SSR (E42). The keys adapter is the
// shared-46-BIbZBGFq.js command table and stays plain-node importable.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import { matchSketchCommand, sketchShortcut } from '../src/generated/code-editor/preview-sketch-keys.mjs';

const app = path.resolve(import.meta.dirname, '..');
const line = { kind: 'arrow', x1: 10, y1: 20, x2: 110, y2: 20, color: '#E03131', width: 4 };
let server, C, model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/generated/code-editor/preview-sketch-canvas.mjs');
  model = C.createPreviewSketchCanvas({});
});
after(() => server?.close());

test('original history preserves undoable clears, limits snapshots, and keeps stroke identity across resize', () => {
  let history = model.emptyHistory;
  for (let i = 0; i < 110; i++) history = model.commitHistory(history, [...history.present, { ...line, x2: i + 110 }]);
  assert.equal(history.past.length, 100);
  const previous = history.present;
  history = model.commitHistory(history, []);
  assert.deepEqual(model.historyState(history), { count: 0, canUndo: true, canRedo: false });
  history = model.undoHistory(history); assert.equal(history.present, previous);
  const mapped = model.mapHistory(history, stroke => model.resizeStroke(stroke, 2, 3));
  assert.equal(mapped.present[0], mapped.past.at(-1)[0]);
  assert.deepEqual(model.redoHistory(mapped).present, []);
  assert.equal(model.commitHistory(mapped, [line]).future.length, 0);
});

test('source constrained shapes, arrow bending and text resizing preserve real editing geometry', () => {
  assert.deepEqual(model.constrainPoint('rect', { x: 0, y: 0 }, { x: 20, y: 10 }, true), { x: 20, y: 20 });
  const curved = model.resizeHandle(line, 'bend', { x: 60, y: 50 }, false);
  assert.ok(curved.bend); assert.equal(model.hitTest(curved, { x: 60, y: 50 }, () => null), true);
  const scaled = model.resizeStroke(curved, 2, 3);
  assert.equal(model.hitTest(scaled, { x: 120, y: 150 }, () => null), true);
  assert.equal(model.resizeHandle(curved, 'bend', { x: 60, y: 20 }, false).bend, undefined);
  const text = { kind: 'text', text: 'Note', x: 20, y: 30, size: 16, color: '#1971C2' };
  const measure = item => ({ x: item.x, y: item.y, width: item.size * 3, height: item.size * 1.2 });
  const resized = model.resizeText(text, measure, 4, 'se', { x: 130, y: 90 }, 8);
  assert.ok(resized.size > text.size); assert.equal(resized.x, text.x); assert.equal(resized.y, text.y);
  const moved = model.moveStroke(line, 5, 7);
  assert.deepEqual([moved.x1, moved.y1, moved.x2, moved.y2], [15, 27, 115, 27]);
});

test('source keyboard table distinguishes physical selection shortcuts from character undo commands', () => {
  const event = (key, code, extra = {}) => ({ key, code, metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, ...extra });
  const options = { isClaudeApp: true, mac: true, linux: false, commands: ['toggleSelectionMode', 'toggleSketchMode', 'sketchUndo', 'sketchRedo', 'sketchDeselect'] };
  assert.equal(matchSketchCommand(event('S', 'KeyS', { shiftKey: true }), options), 'toggleSelectionMode');
  assert.equal(matchSketchCommand(event('X', 'KeyX', { shiftKey: true }), options), 'toggleSketchMode');
  assert.equal(matchSketchCommand(event('z', 'KeyW'), options), 'sketchUndo');
  assert.equal(matchSketchCommand(event('z', 'KeyZ', { shiftKey: true }), options), 'sketchRedo');
  assert.equal(matchSketchCommand(event('Escape', 'Escape', { metaKey: false }), options), 'sketchDeselect');
  assert.equal(matchSketchCommand(event('s', 'KeyS'), options), null);
  assert.equal(sketchShortcut('toggleSelectionMode', true, options), 'cmd+shift+s');
});

// preview-08: the canvas formats its "Sketch canvas" / "Text label" aria-labels through the injected useIntl.
test('3.6556.2 canvas formats its Sketch canvas / Text label aria-labels through the injected useIntl', async () => {
  const calls = [];
  const intl = { formatMessage: message => { calls.push(message); return `zh:${message.defaultMessage}`; } };
  const { Canvas } = C.createPreviewSketchCanvas({ useToken: () => '#000', useIntl: () => intl });
  const html = renderToStaticMarkup(React.createElement(Canvas, {}));
  assert.match(html, /<canvas role="application" aria-label="zh:Sketch canvas"/);
  assert.deepEqual(calls, [{ defaultMessage: 'Sketch canvas', id: 'jvMtXRguc4' }]);
  const dir = path.join(app, 'src/generated/code-editor');
  const source = await fs.readFile(path.join(dir, 'preview-sketch-canvas.mjs'), 'utf8');
  const count = s => source.split(s).length - 1;
  assert.equal(count('defaultMessage: "Sketch canvas",'), 1);
  assert.equal(count('defaultMessage: "Text label",'), 1);
  assert.equal(count('id: "jvMtXRguc4"'), 1);
  assert.equal(count('id: "c29+YCh/oq"'), 1);
  assert.equal(count('"aria-label": "'), 0);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const entry = manifest.adapters.find(item => item.name === 'preview-sketch-canvas.mjs');
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.deepEqual(entry.sources[0], { name: 'c23255574-B0Bkz_WU.js', sha256: entry.sources[0].sha256, base: 'ion' });
  assert.ok(entry.sources.every(item => item.base === 'ion'));
});

// Parity: the canvas factory body is c23255574's statements from the EditFilled glyph to the export, and the keys module
// carries shared-46's matcher/formatter declarations unchanged (whitespace and trailing commas aside).
test('canvas and keys carry the 3.6556.2 statements unchanged', async () => {
  const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const normal = async code => (await format(code, { parser: 'babel' })).replace(/\s+/g, '').replace(/,(?=[)\]}])/g, '');
  const read = async name => fs.readFile(path.join(v1, name), 'utf8');
  const sketch = await read('c23255574-B0Bkz_WU.js'), body = parseAst(sketch).body.filter(node => node.type !== 'ImportDeclaration' && node.type !== 'ExportNamedDeclaration');
  const start = body.findIndex(node => /^var [\w$]+=\{name:"EditFilled"/.test(sketch.slice(node.start, node.end)));
  assert.ok(start > 0);
  const canvas = await fs.readFile(path.join(app, 'src/generated/code-editor/preview-sketch-canvas.mjs'), 'utf8');
  const open = canvas.indexOf('export function createPreviewSketchCanvas('), from = canvas.indexOf(') {\n', open) + 4, to = canvas.lastIndexOf('  return {');
  assert.equal(await normal(canvas.slice(from, to)), await normal(body.slice(start).map(node => sketch.slice(node.start, node.end)).join('\n')));
  const keys = await fs.readFile(path.join(app, 'src/generated/code-editor/preview-sketch-keys.mjs'), 'utf8');
  const shared = await read('shared-46-BIbZBGFq.js');
  const exported = new Map(parseAst(shared).body.filter(node => node.type === 'ExportNamedDeclaration' && !node.declaration).flatMap(node => node.specifiers.map(s => [s.exported.name, s.local.name])));
  // c23255574 imports shared-46 `v` as the matcher and `g` as the shortcut formatter.
  assert.ok(/import\{[^}]*\bg as S\b[^}]*\bv as oe\b[^}]*\}from"\.\/shared-46-BIbZBGFq\.js"/.test(sketch));
  assert.match(keys, new RegExp(`export \\{ ${exported.get('v').replace('$', '\\$')} as matchSketchCommand, ${exported.get('g')} as sketchShortcut \\};`));
  for (const node of parseAst(shared).body) for (const d of node.type === 'VariableDeclaration' ? node.declarations : node.type === 'FunctionDeclaration' ? [node] : []) {
    if (!keys.includes(`${node.type === 'FunctionDeclaration' ? 'function' : node.kind} ${d.id.name}`)) continue;
    const official = node.type === 'FunctionDeclaration' ? shared.slice(node.start, node.end) : `${node.kind} ${shared.slice(d.start, d.end)};`;
    assert.ok((await normal(keys)).includes((await normal(official)).replace(/;$/, '')), d.id.name);
  }
});
