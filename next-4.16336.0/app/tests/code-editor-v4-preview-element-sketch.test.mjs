// The staged 4.16336.0 code-editor graph, areas preview-element and preview-sketch (round 2 unit code-editor:c,
// scripts/code-editor-v4-gen/preview-{element,sketch}.mjs over preview-graph.mjs): area records and pins against the
// frozen snapshot, import discipline (React from the host packages, cds-core, the D1-linked graphs and sibling adapters
// only, never a 3.6556.2 graph), the D1 links and owned state (each module-state binding copied by one adapter, with a
// reason), behaviour of the plain-node adapters next to the 3.6556.2 production adapters of the same files (every
// difference asserted here is a 4.16336.0 change), and server rendering of the official components inside the cds-core
// root. Byte-for-byte regeneration is `node scripts/extract-code-editor-v4.mjs --check` (verify-gen-code-editor-v4.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource, referenceVersion } from '../scripts/official-4.16336.0.mjs';
import { chunk, declarationSha } from '../scripts/code-editor-v4-gen/common.mjs';
import * as v4serial from '../src/generated/code-editor-v4/preview-element-serialization.mjs';
import * as oldSerial from '../src/generated/code-editor/preview-element-serialization.mjs';
import * as v4label from '../src/generated/code-editor-v4/preview-element-label.mjs';
import * as oldLabel from '../src/generated/code-editor/preview-element-label.mjs';
import * as v4view from '../src/generated/code-editor-v4/preview-element-view.mjs';
import * as oldView from '../src/generated/code-editor/preview-element-view.mjs';
import * as v4parser from '../src/generated/code-editor-v4/preview-element-parser.mjs';
import * as oldParser from '../src/generated/code-editor/preview-element-parser.mjs';
import * as v4keys from '../src/generated/code-editor-v4/preview-sketch-keys.mjs';
import * as oldKeys from '../src/generated/code-editor/preview-sketch-keys.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/code-editor-v4');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const area = name => JSON.parse(fs.readFileSync(path.join(dir, 'areas', `${name}.json`), 'utf8'));
const AREAS = {
  'preview-element': ['preview-element-serialization.mjs', 'preview-element-view.mjs', 'preview-element-label.mjs', 'preview-element-parser.mjs',
    'preview-element-detail.mjs', 'preview-element-chip.mjs', 'preview-element-transcript.mjs'],
  'preview-sketch': ['preview-sketch-toolbar.mjs', 'preview-sketch-canvas.mjs', 'preview-sketch-keys.mjs', 'preview-sketch-state.mjs', 'preview-sketch-host.mjs'],
};
// Wave 7: cds-core holds ce311b43f's counters a / o / de with their writers c / P / _e (state_ce311b43f_* /
// writer_ce311b43f_*), so the serialization links those three from cds-core instead of owning the counters; it imports
// nothing else.
const PLAIN = ['preview-element-view.mjs', 'preview-element-label.mjs', 'preview-element-parser.mjs'];
const CDS_CORE_ONLY = { 'preview-element-serialization.mjs': [{ from: '../cds-core/ce311b43f.mjs', names: ['P', '_e', 'c'] }] };
const ALLOWED = [/^react$/, /^react\/jsx-runtime$/, /^react\/compiler-runtime$/, /^react-dom$/, /^\.\.\/cds-core\/[\w.-]+\.mjs$/,
  /^\.\.\/session-rail-changes-v4\/cd59309dc\.mjs$/, /^\.\.\/proposal-group-v4\/c25d7186f\.mjs$/, /^\.\.\/code-current-v4\/session-cycle-chords--shared-1\.mjs$/,
  /^\.\/preview-(element|sketch)-[\w-]+\.mjs$/];
// Linked holders (D1, round 2 plan code-editor:c): binding prefix -> module it must be imported from.
const REQUIRED_LINKS = {
  'cd59309dc-Bi2OcXJ2.js#': '../session-rail-changes-v4/cd59309dc.mjs',
  'c25d7186f-CHE_J2eY.js#': '../proposal-group-v4/c25d7186f.mjs',
  'shared-1-D1bGaTaN.js#A3': '../code-current-v4/session-cycle-chords--shared-1.mjs',
};
const importsOf = text => [...text.matchAll(/^import\s*(?:\*\s*as\s+[\w$]+|\{([^}]*)\})\s*from\s*"([^"]+)";/gm)].map(([, names, from]) => ({ from, names: (names ?? '').split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean) }));
const exportsOf = text => new Set([...text.matchAll(/export\s*\{([^}]*)\}\s*;/g)].flatMap(([, list]) => list.split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean))
  .concat([...text.matchAll(/^export (?:const|function) ([\w$]+)/gm)].map(m => m[1])));

test('area records: 4.16336.0, file and source hashes, pinned roots, no production copy', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, referenceVersion);
  assert.equal(manifest.cdsCoreManifestSha256, 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd');
  for (const [name, adapters] of Object.entries(AREAS)) {
    assert.ok(manifest.areas.includes(name), name);
    const rec = area(name);
    assert.equal(rec.referenceVersion, referenceVersion);
    assert.deepEqual(rec.adapters.map(a => a.name), adapters);
    assert.deepEqual(rec.copyTargets, []);
    for (const entry of rec.adapters) {
      assert.equal(entry.referenceVersion, referenceVersion);
      assert.equal(sha(fs.readFileSync(path.join(dir, entry.name))), entry.sha256, entry.name);
      assert.equal(entry.realm, 'renderer');
      for (const ref of entry.sources) assert.equal(sha(fs.readFileSync(path.join(ionSource, ref.name))), ref.sha256, `${entry.name} ${ref.name}`);
      assert.ok(entry.bindings.length > 0, entry.name);
      for (const b of entry.bindings) assert.equal(declarationSha(chunk(b.file, 'ion'), b.name), b.sha256, `${entry.name} ${b.file}#${b.name}`);
      let pinned = 0;
      for (const [root, r] of Object.entries(entry.roots)) {
        if (root === '$links' || !r?.sha256) continue;
        assert.equal(declarationSha(chunk(r.file, 'ion'), r.local), r.sha256, `${entry.name} root ${root}`);
        pinned++;
      }
      assert.ok(pinned > 0, `${entry.name} has pinned roots`);
      const m = manifest.modules.find(x => x.name === entry.name);
      assert.deepEqual(m.bindings, entry.bindings.map(b => ({ name: b.name, file: b.file, sha256: b.sha256 })));
      assert.notEqual(m.electron, true, entry.name);
    }
  }
});

test('imports: host React, cds-core, the D1-linked graphs and sibling adapters only; plain-node adapters import nothing', () => {
  for (const adapters of Object.values(AREAS)) for (const name of adapters) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.doesNotMatch(text, /from "\.\.\/(code-editor|view-tabs|chat|session-rail-changes|proposal-group|code-current)\//, `${name} links a 3.6556.2 graph`);
    const imports = importsOf(text);
    if (PLAIN.includes(name)) assert.deepEqual(imports, [], `${name} is plain node`);
    if (CDS_CORE_ONLY[name]) assert.deepEqual(imports, CDS_CORE_ONLY[name], `${name} imports only the cds-core ce311b43f writers`);
    for (const { from, names } of imports) {
      assert.ok(ALLOWED.some(re => re.test(from)), `${name} imports ${from}`);
      if (!from.startsWith('.')) continue;
      const exported = exportsOf(fs.readFileSync(path.resolve(dir, from), 'utf8'));
      for (const n of names) assert.ok(exported.has(n), `${name}: ${from} does not export ${n}`);
    }
  }
});

test('D1: required links are imports; each module-state binding has one adapter, with its reason in the manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const all = Object.keys(AREAS).flatMap(a => area(a).adapters);
  const copied = new Map(), owned = new Map();
  for (const entry of all) {
    for (const b of entry.bindings) {
      const key = `${b.file}#${b.name}`;
      for (const prefix of Object.keys(REQUIRED_LINKS)) assert.ok(!key.startsWith(prefix), `${entry.name} copies ${key}`);
      if (!copied.has(key)) copied.set(key, []);
      copied.get(key).push(entry.name);
    }
    for (const [key, why] of Object.entries(entry.ownedState ?? {})) {
      assert.ok(!owned.has(key), `${key} owned by ${owned.get(key)} and ${entry.name}`);
      owned.set(key, entry.name);
      assert.deepEqual(copied.get(key), [entry.name], `${key} is copied only by ${entry.name}`);
      assert.equal(manifest.ownedStateReasons[key], `${entry.name}: ${why}`);
    }
  }
  assert.deepEqual([...owned.keys()].sort(), [
    'c06cf64bb-CoZso5N4.js#cd', 'c06cf64bb-CoZso5N4.js#sf', 'c0a74d72b-BELp4TMv.js#Co', 'c0a74d72b-BELp4TMv.js#_o', 'c23255574-mtRCVDRk.js#Et',
    'c23255574-mtRCVDRk.js#Oe', 'c23255574-mtRCVDRk.js#Re', 'c23255574-mtRCVDRk.js#Y', 'c23255574-mtRCVDRk.js#xe', 'c23255574-mtRCVDRk.js#ze',
    'c2fd10b8d-DEwP4IO5.js#dd', 'ce311b43f-CaHZaaO5.js#Ae',
  ]);
  // Wave 7: the counters a / o / de are cds-core's (published with their writers): no adapter copies or owns them.
  for (const local of ['a', 'o', 'de', 'c', 'P', '_e']) assert.ok(!copied.has(`ce311b43f-CaHZaaO5.js#${local}`), `ce311b43f ${local} is copied`);
  // The detail reads the parser's read-only Sets and the serializer from its siblings instead of copying them.
  const detail = all.find(e => e.name === 'preview-element-detail.mjs');
  assert.ok(!detail.bindings.some(b => b.file === 'ce311b43f-CaHZaaO5.js' || (b.file === 'c06cf64bb-CoZso5N4.js' && (b.name === 'cd' || b.name === 'sf'))));
  const detailText = fs.readFileSync(path.join(dir, 'preview-element-detail.mjs'), 'utf8');
  assert.match(detailText, /\bcd as [\w$]+,\s*sf as [\w$]+,?\s*\} from "\.\/preview-element-parser\.mjs"/);
  const links = all.flatMap(e => e.roots.$links ?? []);
  for (const [prefix, module] of Object.entries(REQUIRED_LINKS)) {
    const hits = links.filter(l => l.binding.startsWith(prefix));
    assert.ok(hits.length > 0, `${prefix} is linked`);
    assert.ok(hits.every(l => l.module === module), prefix);
  }
});

const ctx = { tagName: 'button', classes: ['primary', 'wide', 'extra'], screenshot: 'cG5n', innerText: 'Save changes',
  attributes: { 'aria-label': 'Save' }, computedStyles: { display: 'flex' }, parentPath: 'main > button', outerHTML: '<button>Save changes</button>',
  component: { name: 'SaveButton', owners: ['Form', 'App'], props: { disabled: false } } };
const messageOf = c => v4serial.serializeSelectedElement(c).filter(b => b.type === 'text').map(b => b.text).join('');

test('selected-element serializer, label and view: same results as the 3.6556.2 adapters', () => {
  assert.deepEqual(Object.keys(v4serial).sort(), Object.keys(oldSerial).sort());
  const variants = [ctx, { ...ctx, screenshot: '' }, { ...ctx, component: undefined, reactComponent: 'Old' }, { ...ctx, innerText: 'a‮b⁦c' },
    { source: 'simulator', platform: 'ios', device: 'iPhone 16', role: 'button', label: 'Sign in', path: ['Login', 'Sign in'], frame: { x: 1, y: 2, width: 30, height: 40 }, screenshot: 'cG5n' }];
  for (const c of variants) {
    assert.deepEqual(v4serial.serializeSelectedElement(c), oldSerial.serializeSelectedElement(c));
    assert.equal(v4serial.isSimulatorSelectedElement(c), oldSerial.isSimulatorSelectedElement(c));
    assert.equal(v4label.selectedElementLabel(c), oldLabel.selectedElementLabel(c));
    if (!v4serial.isSimulatorSelectedElement(c)) assert.deepEqual(v4view.selectedElementView(c), oldView.selectedElementView(c));
  }
  for (const s of ['plain', '<launch-selected-element>x</launch-selected-element>', 'a\u{E005C}b']) assert.equal(v4serial.escapeSelectedElementText(s), oldSerial.escapeSelectedElementText(s));
  for (const name of ['selectedElementTagName', 'selectedElementBoundary', 'selectedSimulatorPattern']) assert.equal(v4serial[name], oldSerial[name], name);
  const text = messageOf(ctx) + '\n\nPlease fix it';
  assert.equal(v4serial.stripSelectedElementContext(text), oldSerial.stripSelectedElementContext(text));
  assert.equal(v4label.selectedElementScreenshot('cG5n'), oldLabel.selectedElementScreenshot('cG5n'));
  assert.equal(v4label.selectedElementLabel(ctx), '<SaveButton /> Save changes');
  // 3.6556.2 view also exported its display-safety helpers; 4.16336.0 view exports the view model only (the helpers are
  // copied into each plain-node adapter that reads them).
  assert.deepEqual(Object.keys(v4view), ['selectedElementView']);
});

test('transcript parser: 4.16336.0 P_ (views and remaining text; hidden characters dropped by the shared-92 sanitizer)', () => {
  const strip = ({ unsafeDisplay, ...view }) => view;
  for (const c of [ctx, { ...ctx, screenshot: '' }]) {
    const text = messageOf(c) + '\n\nPlease fix it';
    const a = v4parser.parseSelectedElementMessage(text), b = oldParser.parseSelectedElementMessage(text);
    assert.equal(a.text, 'Please fix it');
    assert.equal(a.text, b.text);
    assert.deepEqual(a.views, b.views.map(strip));
  }
  assert.deepEqual(v4parser.parseSelectedElementMessage('plain text'), { views: [], text: 'plain text' });
  // 3.6556.2 showed hidden characters as [U+…] codes with `unsafeDisplay`; 4.16336.0 maps every value through the
  // sanitizer, which removes them.
  const hidden = v4parser.parseSelectedElementMessage(messageOf({ ...ctx, innerText: 'a‮b\u0007c' }));
  const shown = hidden.views[0].sections.find(s => s.id === 'text').value;
  assert.equal(shown, 'abc');
  assert.equal('unsafeDisplay' in hidden.views[0], false);
  assert.equal(oldParser.parseSelectedElementMessage(messageOf({ ...ctx, innerText: 'a‮b' })).views[0].unsafeDisplay, true);
});

test('sketch keys: same command matching and shortcut text as 3.6556.2 (mac, other platforms, page-tool filter)', () => {
  const ev = (key, o = {}) => ({ key, code: o.code ?? (key.length === 1 ? 'Key' + key.toUpperCase() : key), metaKey: !!o.meta, ctrlKey: !!o.ctrl, shiftKey: !!o.shift, altKey: !!o.alt });
  const cases = [['z', { meta: true }], ['Z', { meta: true, shift: true }], ['Backspace'], ['Delete'], ['Escape'], ['X', { meta: true, shift: true }],
    ['S', { meta: true, shift: true }], ['z', { ctrl: true }], ['y', { ctrl: true }], ['z'], ['p', { meta: true }]];
  const options = [{ mac: true, isClaudeApp: true }, { mac: false, linux: false, isClaudeApp: true }, { mac: true, isClaudeApp: true, commands: ['toggleSketchMode', 'toggleSelectionMode'] }];
  for (const opts of options) for (const [key, o] of cases) assert.equal(v4keys.matchSketchCommand(ev(key, o), opts), oldKeys.matchSketchCommand(ev(key, o), opts), `${key} ${JSON.stringify(o)} ${JSON.stringify(opts)}`);
  assert.equal(v4keys.matchSketchCommand(ev('z', { meta: true }), options[0]), 'sketchUndo');
  assert.equal(v4keys.matchSketchCommand(ev('X', { meta: true, shift: true }), options[2]), 'toggleSketchMode');
  for (const command of ['toggleSketchMode', 'toggleSelectionMode', 'sketchUndo', 'sketchRedo', 'sketchDeleteSelection', 'sketchDeselect'])
    for (const mac of [true, false]) assert.equal(v4keys.sketchShortcut(command, mac, false), oldKeys.sketchShortcut(command, mac, false), `${command} ${mac}`);
});

let server, mod, cds, K, intl;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  mod = {};
  for (const name of Object.values(AREAS).flat()) mod[name] = await server.ssrLoadModule(`/src/generated/code-editor-v4/${name}`);
  cds = await server.ssrLoadModule('/src/generated/cds-core/shared-frame.mjs');
  ({ K } = await server.ssrLoadModule('/src/generated/cds-core/vendor-intl.mjs'));
  intl = (await server.ssrLoadModule('/src/cds-core-adapter.mjs')).createHostIntl('en');
});
after(async () => { await server?.close(); });

const wrap = el => h(cds.CdsRoot, { density: 'compact' }, h(K.Provider, { value: intl }, el));
const html = el => renderToStaticMarkup(wrap(el));
const Message = ({ defaultMessage, values }) => intl.formatMessage({ id: defaultMessage, defaultMessage }, values);
const useIntl = () => intl;

test('selected-element detail, pill and transcript card render the official components', () => {
  const { Preview, Details, useDetailAnimation, SimulatorPreview } = mod['preview-element-detail.mjs'].createSelectedElementDetail({ Message, useIntl });
  assert.equal(typeof SimulatorPreview, 'function');
  const preview = html(h(Preview, { ctx, width: 320, scrollRegionLabel: '<SaveButton /> Save changes', openedVia: 'click' }));
  assert.match(preview, /style="width:320px"/);
  assert.match(preview, /max-h-\[360px\] overflow-y-auto/);
  assert.match(preview, /Included with your message/);
  assert.match(preview, /src="data:image\/png;base64,cG5n"/);
  assert.match(preview, /data-cds="Icon"/);
  assert.match(preview, />Component</);
  assert.doesNotMatch(preview, /element-context-unsafe-notice/);
  const unsafe = html(h(Preview, { ctx: { ...ctx, innerText: '‮hidden', screenshot: '' } }));
  assert.match(unsafe, /data-testid="element-context-unsafe-notice"/);
  assert.match(unsafe, /\[U\+202E\]hidden/);
  assert.doesNotMatch(unsafe, /<img /);

  const Toggle = ({ value, pressed, onPressedChange, defaultPressed, ...props }) => h('button', { type: 'button', 'aria-pressed': !!pressed, ...props });
  const { Pill, usePreviewIntent } = mod['preview-element-chip.mjs'].createSelectedElementPill({ Message, useIntl, Toggle });
  assert.equal(typeof usePreviewIntent, 'function');
  const pill = html(h(Pill, { value: 'e1', label: 'Save', sublabel: 'button', thumbnail: h('i'), previewContent: h('p', null, 'peek'), onPreviewIntent() {}, onRemove() {} }));
  assert.match(pill, /epitaxy-pill-body/);
  assert.match(pill, /aria-label="Remove Save"/);

  const Card = mod['preview-element-transcript.mjs'].createSelectedElementTranscript({ Message, useIntl, Details, useDetailAnimation,
    useErrors: () => ({ addSuccess() {}, addError() {} }), ImageTile: ({ src, alt }) => h('img', { src, alt, 'data-tile': '' }) });
  const [view] = v4parser.parseSelectedElementMessage(messageOf(ctx)).views;
  const card = html(h(Card, { view, screenshot: 'data:image/png;base64,cG5n' }));
  assert.match(card, /data-find-omitted=""/);
  assert.match(card, /&lt;SaveButton \/&gt;/);
});

test('sketch toolbar, canvas and host render the official components', () => {
  const { Toolbar } = mod['preview-sketch-toolbar.mjs'].createPreviewSketchToolbar({ Message, useIntl });
  const toolbar = html(h(Toolbar, { tool: 'pen', color: '#E03131', colors: ['#E03131', '#1971C2', '#2F9E44', '#1F1E1D', '#FFFFFF'], widths: [2, 4, 8, 12], strokeWidth: 4,
    redactStyle: 'solid', hasStrokes: false, canUndo: false, canRedo: false, onToolChange() {}, onColorChange() {}, onStrokeWidthChange() {}, onRedactStyleChange() {}, onClose() {},
    positiveAction: h('button', null, 'Add to chat'), positiveActionIconOnly: h('button', { 'aria-label': 'Add to chat' }, '+') }));
  assert.match(toolbar, /data-sketch-tools="true"/);
  assert.match(toolbar, /data-cds="Button"/);
  const { Canvas, emptyHistory, commitHistory, undoHistory, redoHistory, historyState } = mod['preview-sketch-canvas.mjs'].createPreviewSketchCanvas({ useIntl, useToken: () => '#000' });
  const canvas = html(h(Canvas, { tool: 'pen', color: '#E03131', strokeWidth: 4, strokes: [], onStrokesChange() {} }));
  assert.match(canvas, /role="application"/);
  assert.match(canvas, /aria-label="Sketch canvas"/);
  const one = commitHistory(emptyHistory, [{ kind: 'freehand', points: [] }]);
  assert.deepEqual(historyState(one), { count: 1, canUndo: true, canRedo: false });
  assert.deepEqual(historyState(redoHistory(undoHistory(one))), historyState(one));
  const state = mod['preview-sketch-state.mjs'].createPreviewSketchState({ useTextTargets: () => ({ textTargets: undefined, handleTextTargetRedacted() {}, textRedactionCount: () => 0, resetTextRedactionCount() {} }),
    usePlatform: () => true, useGate: key => key === '__gb__2978899829' });
  assert.deepEqual(state.colors, ['#E03131', '#1971C2', '#2F9E44', '#1F1E1D', '#FFFFFF']);
  assert.deepEqual(state.widths, [2, 4, 8, 12]);
  assert.equal(state.black, '#1F1E1D');
  const Host = mod['preview-sketch-host.mjs'].createPreviewSketchHost({ usePlatform: () => true, useErrors: () => ({ addError() {} }), useIntl, Toolbar, Canvas, ...state });
  assert.equal(typeof Host, 'object'); // memo(f)
});
