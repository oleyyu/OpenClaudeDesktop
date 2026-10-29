// w10-editor-preview-sketch: the sketch toolbar/state/host adapters are the 3.6556.2 c23255574-B0Bkz_WU.js /
// cda4f50bb-BYPh13KQ.js slices (React Compiler output; CDS from view-tabs). The generated modules import view-tabs, so
// they load through Vite SSR (E42). Source parity is checked against the official text read here, independently of the
// extractor; the official chunks are parsed, never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { format } from '../../tools/node_modules/prettier/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const generated = name => fs.readFileSync(path.join(app, 'src/generated/code-editor', name), 'utf8');
const h = React.createElement;

// Top-level statements of an official chunk, with the export alias -> local map.
function statements(name) {
  const text = official(name), body = parseAst(text).body, exports = new Map();
  for (const node of body) if (node.type === 'ExportNamedDeclaration' && !node.declaration) for (const s of node.specifiers) exports.set(s.exported.name, s.local.name);
  const list = body.filter(node => node.type !== 'ImportDeclaration' && node.type !== 'ExportNamedDeclaration')
    .map(node => ({ node, text: text.slice(node.start, node.end), names: node.type === 'VariableDeclaration' ? node.declarations.map(d => d.id.name) : [node.id?.name] }));
  return { text, list, exports };
}
// Whitespace- and trailing-comma-insensitive form of prettier output, so a slice compares with its factory-indented copy.
const normal = async code => (await format(code, { parser: 'babel' })).replace(/\s+/g, '').replace(/,(?=[)\]}])/g, '');
const factoryBody = (text, factory, ret) => {
  const start = text.indexOf(`export function ${factory}(`), open = text.indexOf(') {\n', start), end = text.lastIndexOf(`  return ${ret}`);
  assert.ok(start >= 0 && open > start && end > open, factory);
  return text.slice(open + 4, end);
};

let server, T, S, Host;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  T = await server.ssrLoadModule('/src/generated/code-editor/preview-sketch-toolbar.mjs');
  S = await server.ssrLoadModule('/src/generated/code-editor/preview-sketch-state.mjs');
  Host = await server.ssrLoadModule('/src/source-preview-sketch.jsx');
});
after(() => server?.close());

const intl = { formatMessage: message => message.defaultMessage };
const toolbar = () => T.createPreviewSketchToolbar({ Message: ({ defaultMessage }) => defaultMessage, useIntl: () => intl }).Toolbar;
const defaults = {
  tool: 'pen', color: '#E03131', colors: ['#E03131', '#1971C2', '#2F9E44', '#1F1E1D', '#FFFFFF'], widths: [2, 4, 8, 12], strokeWidth: 4,
  redactStyle: 'solid', hasStrokes: false, canUndo: false, canRedo: false,
  onToolChange() {}, onColorChange() {}, onStrokeWidthChange() {}, onRedactStyleChange() {}, onClose() {},
  positiveAction: h('button', null, 'Add to chat'), positiveActionIconOnly: h('button', { 'aria-label': 'Add to chat' }, '+'),
};

test('toolbar, state and host factories carry the 3.6556.2 statements unchanged', async () => {
  const sketch = statements('c23255574-B0Bkz_WU.js'), host = statements('cda4f50bb-BYPh13KQ.js');
  // cda4f50bb imports the toolbar as `s`, the sketch hook as `o`, the colors as `r`; the canvas glyph EditFilled starts the canvas.
  const at = local => sketch.list.findIndex(s => s.names.includes(local));
  const toolbarEnd = at(sketch.exports.get('s')), stateStart = at(sketch.exports.get('r'));
  const canvasStart = sketch.list.findIndex(s => /^var [\w$]+=\{name:"EditFilled"/.test(s.text));
  assert.ok(toolbarEnd > 0 && stateStart > toolbarEnd && canvasStart > stateStart);
  const pairs = [
    ['preview-sketch-toolbar.mjs', 'createPreviewSketchToolbar', 'Toolbar', sketch.list.slice(0, toolbarEnd + 1)],
    ['preview-sketch-state.mjs', 'createPreviewSketchState', 'useSketch', sketch.list.slice(stateStart, canvasStart)],
    ['preview-sketch-host.mjs', 'createPreviewSketchHost', host.exports.get('t'), host.list.slice(0, host.list.findIndex(s => s.names.includes(host.exports.get('t'))) + 1)],
  ];
  for (const [file, factory, ret, slice] of pairs) {
    const text = generated(file), ret2 = ret === 'Toolbar' ? '{ Toolbar' : ret === 'useSketch' ? '{' : ret;
    assert.equal(await normal(factoryBody(text, factory, ret2)), await normal(slice.map(s => s.text).join('\n')), file);
    assert.match(text, /^\/\/ Original [^\n]*\(3\.6556\.2\)/, file);
  }
  // The old 2.42304.0 names and host substitutes are gone: CDS comes from view-tabs by semantic name.
  const bar = generated('preview-sketch-toolbar.mjs');
  for (const name of ['CdsButton as p', 'CdsIcon as v', 'CdsDropdown as h', 'CdsTooltip as g', 'CdsConfirmationDialog as te', 'CdsTooltipProvider as ne', 'CdsSurface as f', 'reactMemoCache as J9'])
    assert.ok(bar.includes(name), name);
  assert.ok(bar.includes('from "../view-tabs/shared-frame-6jtSkIit.js"'));
  // w11-sweep-rest: the panel is view-tabs' CdsSurface (3.6556.2 c23255574 imports shared-frame `Dl as f`), not a host
  // parameter; the canvas reads view-tabs ownerWindow through one import.
  assert.match(official('c23255574-B0Bkz_WU.js'), /import\{[^}]*\bDl as f\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/);
  assert.match(bar, /export function createPreviewSketchToolbar\(\{ Message: w, useIntl: se \}\)/);
  const canvas = generated('preview-sketch-canvas.mjs');
  assert.equal(canvas.match(/from "\.\.\/view-tabs\/shared-25-DOWZRSlq\.js";/g)?.length, 1);
  assert.ok(!canvas.includes('$ownerWindow'));
  assert.ok(!/installed-2\.42304\.0|c467aa787/.test(bar + generated('preview-sketch-state.mjs') + generated('preview-sketch-host.mjs')));
});

test('3.6556.2 toolbar: annotation tool group, Shapes menu, line width and ink color triggers', () => {
  const Toolbar = toolbar();
  const html = renderToStaticMarkup(h(Toolbar, defaults));
  assert.match(html, /<div role="group" aria-label="Annotation tool" data-sketch-tools="true" class="flex items-center gap-xs">/);
  for (const label of ['Pen', 'Shapes', 'Text', 'Ink color', 'Line width', 'Close']) assert.ok(html.includes(`aria-label="${label}"`), label);
  assert.match(html, /aria-label="Shapes" aria-description="Rectangle"/);
  assert.match(html, /aria-label="Ink color" aria-description="Red"/);
  assert.match(html, /aria-label="Line width" aria-description="Medium"/, 'strokeWidth 4 is "Medium" (be[4])');
  assert.match(html, /aria-pressed="true" aria-label="Pen"/);
  assert.ok(html.includes('data-cds="Button"'), 'CdsButton renders the tools');
  assert.ok(html.includes('<span role="separator" aria-orientation="vertical" class="h-4 w-px shrink-0 bg-border">'));
  assert.match(html, /data-layout="full"/);
  const thick = renderToStaticMarkup(h(Toolbar, { ...defaults, strokeWidth: 12 }));
  assert.match(thick, /aria-label="Line width" aria-description="Extra thick"/);
  const redact = renderToStaticMarkup(h(Toolbar, { ...defaults, redactEnabled: true, tool: 'redact' }));
  assert.match(redact, /aria-label="Redaction style" aria-description="Solid"/);
  const zoom = renderToStaticMarkup(h(Toolbar, { ...defaults, resting: { onHide() {}, zoom: { canZoomIn: true, canZoomOut: false } } }));
  assert.match(zoom, /<div role="group" aria-label="Zoom" class="flex items-center gap-xs">/);
  assert.ok(zoom.includes('data-resting=""'));
});

test('3.6556.2 state: widths [2,4,8,12] (default 4), five ink colors, black #1F1E1D', () => {
  const state = S.createPreviewSketchState({ usePlatform: () => true, useTextTargets: () => ({}), useGate: () => true, isTextInput: () => false, matchCommand: () => null, shortcut: () => '' });
  assert.deepEqual(state.widths, [2, 4, 8, 12]);
  assert.deepEqual(state.colors, ['#E03131', '#1971C2', '#2F9E44', '#1F1E1D', '#FFFFFF']);
  assert.equal(state.black, '#1F1E1D');
  assert.equal(typeof state.useSketch, 'function');
  const text = generated('preview-sketch-state.mjs');
  assert.ok(text.includes('("__gb__2978899829") ? void 0 : n'), 'the OCR gate still guards the text targets');
  assert.ok(text.includes('handleStrokeWidthChange: O'));
});

test('host wiring: the host passes widths/black and no longer substitutes CDS buttons, tooltips or menus', () => {
  assert.equal(typeof Host.SourcePreviewSketch, 'function');
  const host = fs.readFileSync(path.join(app, 'src/source-preview-sketch.jsx'), 'utf8');
  assert.ok(host.includes('Toolbar, useSketch, colors, widths, black, Canvas,'));
  for (const gone of ['SketchButton', 'SketchIcon', 'RoutineSourceMenu', 'SourceSettingsButton', 'SourceConfirmationDialog', 'renderMenuItems', 'function Panel', 'cdsSurfaceClass']) assert.ok(!host.includes(gone), gone);
  assert.ok(host.includes('createPreviewSketchToolbar({ Message, useIntl: useRoutineIntl })'));
  const generatedHost = generated('preview-sketch-host.mjs');
  assert.ok(generatedHost.includes('widths: ge,') && generatedHost.includes('strokeWidth: N,'));
  assert.ok(generatedHost.includes('CdsDisabledReason as ae') && generatedHost.includes('CdsButton as re'));
});

test('manifest: all six sketch adapters are 3.6556.2 slices of the ion snapshot', () => {
  const manifest = JSON.parse(generated('manifest.json'));
  // w11-sweep-rest retired preview-sketch-icons.mjs (no importer; CdsIcon carries the official glyph map).
  assert.equal(manifest.adapters.some(adapter => adapter.name === 'preview-sketch-icons.mjs'), false);
  assert.equal(fs.existsSync(path.join(app, 'src/generated/code-editor/preview-sketch-icons.mjs')), false);
  for (const name of ['preview-sketch-toolbar.mjs', 'preview-sketch-state.mjs', 'preview-sketch-keys.mjs', 'preview-sketch-host.mjs', 'preview-sketch-canvas.mjs']) {
    const entry = manifest.adapters.find(adapter => adapter.name === name);
    assert.equal(entry.referenceVersion, '3.6556.2', name);
    assert.ok(entry.sources.length && entry.sources.every(ref => ref.base === 'ion' && !ref.name.includes('/')), name);
    assert.equal(manifest.modules.find(module => module.target === name)?.referenceVersion, '3.6556.2', name);
  }
  assert.equal(manifest.adapters.find(adapter => adapter.name === 'preview-sketch-toolbar.mjs').sources[0].name, 'c23255574-B0Bkz_WU.js');
  assert.equal(manifest.adapters.find(adapter => adapter.name === 'preview-sketch-host.mjs').sources[0].name, 'cda4f50bb-BYPh13KQ.js');
  assert.equal(manifest.modules.some(module => module.name.startsWith('c0f671921-')), false, 'the 2.31226.0 icon font is no longer vendored');
});
