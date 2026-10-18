import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewSketchCanvas } from '../src/generated/code-editor/preview-sketch-canvas.mjs';
import { matchSketchCommand, sketchShortcut } from '../src/generated/code-editor/preview-sketch-keys.mjs';
const model = createPreviewSketchCanvas({});
const line = { kind: 'arrow', x1: 10, y1: 20, x2: 110, y2: 20, color: '#E03131', width: 4 };

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

// R4g SM2 (preview-08 / X7-13): the canvas is the 2.42304.0 c467aa787-B4L-l_bi.js St, whose two aria-labels are
// formatMessage descriptors from the injected useIntl (ce = me()), not literals.
test('2.42304.0 canvas formats its Sketch canvas / Text label aria-labels through the injected useIntl', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const calls = [];
  const intl = { formatMessage: message => { calls.push(message); return `zh:${message.defaultMessage}`; } };
  const { Canvas } = createPreviewSketchCanvas({ ownerWindow: () => null, optionalOwnerWindow: () => null, useToken: () => '#000', reducedMotion: () => false, useIntl: () => intl });
  const html = renderToStaticMarkup(React.createElement(Canvas, {}));
  assert.match(html, /<canvas role="application" aria-label="zh:Sketch canvas"/);
  assert.deepEqual(calls, [{ defaultMessage: 'Sketch canvas', id: 'jvMtXRguc4' }]);
  const dir = path.resolve(import.meta.dirname, '../src/generated/code-editor');
  const source = await fs.readFile(path.join(dir, 'preview-sketch-canvas.mjs'), 'utf8');
  const count = s => source.split(s).length - 1;
  assert.equal(count('ce.formatMessage({\n              defaultMessage: "Sketch canvas",\n              id: "jvMtXRguc4",'), 1);
  assert.equal(count('ce.formatMessage({\n                defaultMessage: "Text label",\n                id: "c29+YCh/oq",'), 1);
  assert.equal(count('"aria-label": "'), 0);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const entry = manifest.adapters.find(item => item.name === 'preview-sketch-canvas.mjs');
  assert.equal(entry.referenceVersion, '2.42304.0');
  assert.equal(entry.sources[0].name, '../../../../installed-2.42304.0-20261017/ion-dist/assets/v1/c467aa787-B4L-l_bi.js');
  assert.ok(entry.sources.every(item => item.name.startsWith('../../../../installed-2.42304.0-20261017/')));
});
