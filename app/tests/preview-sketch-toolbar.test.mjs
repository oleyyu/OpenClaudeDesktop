import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { createPreviewSketchToolbar } from '../src/generated/code-editor/preview-sketch-toolbar.mjs';

const h = React.createElement;
// Read the complete original toolbar range independently of the extractor. R4i-small SM3: 2.42304.0 c467aa787-B4L-l_bi,
// where the range runs from the separator Q to Kt = memo(Gt) (2.31226.0 Ct..Gt in c467aa787-Dtc0Q8kR).
const original = fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c467aa787-B4L-l_bi.js', import.meta.url), 'utf8');
const nodes = parsers.babel.parse(original, {}).program.body;
const first = nodes.find(node => node.id?.name === 'Q');
const last = nodes.find(node => node.declarations?.some(declaration => declaration.id.name === 'Kt'));
const originalBody = original.slice(first.start, last.end);

function setup() {
  const buttons = new Map(), confirms = [];
  const deps = {
    Button: ({ children, icon, iconOnly, pressed, disabledReason, shortcut, variant, ...props }) => {
      const label = props['aria-label'] ?? children;
      buttons.set(label, { ...props, pressed, disabledReason });
      return h('button', { ...props, 'aria-pressed': pressed, 'data-variant': variant },
        typeof icon === 'string' ? h('i', { 'data-icon': icon }) : icon, children);
    },
    Tooltip: ({ children }) => children,
    Icon: ({ name, customIcon, size }) => h('i', { 'data-icon': name ?? customIcon.name, 'data-size': size }),
    Panel: ({ elevation, ...props }) => h('section', { ...props, 'data-elevation': elevation }),
    Menu: { Root: ({ children }) => children, TriggerButton: props => h('button', props), Popup: ({ children }) => h('menu', null, children) },
    renderMenuItems: items => items.map((item, key) => h('li', { key }, item.label)),
    ConfirmDialog: props => { confirms.push(props); return props.open ? h('aside', null, props.title, props.description) : null; },
    Provider: ({ children }) => children,
    Message: ({ defaultMessage }) => defaultMessage,
    useIntl: () => ({ formatMessage: message => message.defaultMessage }),
    ownerWindow: node => node.ownerDocument.defaultView,
    asElement: node => node,
    schedule: () => { throw Error('SSR must not start timers'); },
    prefersReducedMotion: () => false,
    ownerDocument: node => node.ownerDocument,
    useRem: () => 16,
    densityToken: () => '2rem',
    resolveLength: () => 32,
  };
  // The chunk's own import aliases (vendor-frame Co/_o/mo/yo/So/uo/bo/oo/Ba/Va/Ha/za, vendor-intl f/l/p, shared-frame
  // cl/Oc/Hl/lc/qa/Ya/qs/kc/vl/Eu/_d/xu/Yl/Kl, shared-25 Pf, c8748971a t), bound straight to the test doubles.
  const source = vm.runInNewContext(`(()=>{${originalBody};return Kt;})()`, {
    r: React.useState, s: React.useImperativeHandle, l: React.useEffect, f: React.useLayoutEffect,
    a: React.useRef, d: React.useCallback, c: React.useMemo, u: React.memo, n: React.Fragment,
    o: jsx, i: jsxs, p: (...parts) => parts.filter(Boolean).join(' '), fe: value => value,
    S: deps.Button, ae: deps.Tooltip, b: deps.Icon, C: deps.Panel, w: deps.Menu, oe: deps.renderMenuItems,
    T: deps.ConfirmDialog, ce: deps.Provider, pe: deps.Message, me: deps.useIntl, h: deps.ownerWindow,
    le: deps.asElement, re: deps.schedule, se: deps.prefersReducedMotion, de: deps.ownerDocument,
    x: deps.useRem, _e: deps.densityToken, ie: deps.resolveLength,
  });
  return { ...createPreviewSketchToolbar(deps), source, buttons, confirms };
}

const defaults = {
  tool: 'pen', color: '#E03131', colors: ['#E03131', '#1971C2', '#2F9E44', '#1F1E1D', '#FFFFFF'],
  redactStyle: 'solid', hasStrokes: false, canUndo: false, canRedo: false,
  onToolChange() {}, onColorChange() {}, onRedactStyleChange() {}, onClose() {},
  positiveAction: h('button', null, 'Add to chat'), positiveActionIconOnly: h('button', { 'aria-label': 'Add to chat' }, '+'),
};

test('toolbar markup matches the original source for picking, drawing, resting and redaction', () => {
  const { Toolbar, source } = setup();
  for (const props of [
    {},
    { tool: 'select', toolsDisabled: true, leadingTool: { label: 'Select element', pressed: true, onPress() {} } },
    { tool: 'text', hasStrokes: true, canUndo: true, canRedo: true },
    { tool: 'redact', redactEnabled: true, redactStyle: 'mosaic' },
    { tool: 'select', redactEnabled: true, redactionSelected: true, redactStyle: 'noise' },
    { resting: { onHide() {}, zoom: { canZoomIn: true, canZoomOut: false } } },
    { resting: { onHide() {}, firstToolsOnly: true } },
    { concealed: true },
  ]) assert.equal(renderToStaticMarkup(h(Toolbar, { ...defaults, ...props })), renderToStaticMarkup(h(source, { ...defaults, ...props })));
});

test('source exposes six drawing tools and white ink; optional redaction stays gated', () => {
  const { Toolbar, colors } = setup();
  assert.deepEqual(colors, defaults.colors);
  const normal = renderToStaticMarkup(h(Toolbar, defaults));
  for (const label of ['Pen', 'Line', 'Arrow', 'Rectangle', 'Ellipse', 'Text', 'White']) assert.ok(normal.includes(`aria-label="${label}"`), label);
  assert.ok(!normal.includes('aria-label="Redact"'));
  assert.ok(normal.includes('data-layout="full"'));
  const redact = renderToStaticMarkup(h(Toolbar, { ...defaults, redactEnabled: true, tool: 'redact' }));
  for (const label of ['Redact', 'Solid', 'Mosaic', 'Noise']) assert.ok(redact.includes(`aria-label="${label}"`), label);
  assert.ok(!redact.includes('aria-label="White"'));
});

test('tool buttons preserve source toggle-to-select and page picker dispatch', () => {
  const { Toolbar, buttons } = setup(), calls = [];
  renderToStaticMarkup(h(Toolbar, { ...defaults, onToolChange: value => calls.push(value),
    leadingTool: { label: 'Select element', pressed: true, onPress: () => calls.push('page') } }));
  buttons.get('Pen').onClick(); buttons.get('Text').onClick(); buttons.get('Select element').onClick();
  assert.deepEqual(calls, ['select', 'text', 'page']);
  assert.equal(buttons.get('Pen').pressed, true);
  assert.equal(buttons.get('Select element').pressed, true);
});

test('disabled/history/close and discard dialog props remain source-owned', () => {
  const { Toolbar, buttons, confirms } = setup(); let closed = 0;
  renderToStaticMarkup(h(Toolbar, { ...defaults, toolsDisabled: true, onClose: () => closed++ }));
  for (const label of ['Pen', 'Text', 'Undo', 'Redo', 'Clear all']) assert.equal(buttons.get(label).disabled, true, label);
  buttons.get('Close').onClick(); assert.equal(closed, 1);
  const dialog = confirms.at(-1);
  assert.equal(dialog.initialFocus, 'cancel'); assert.equal(dialog.confirmVariant, 'danger');
  assert.equal(dialog.title.props.defaultMessage, 'Discard your annotations?');
  assert.equal(dialog.cancelLabel.props.defaultMessage, 'Keep editing');
  dialog.onConfirm(); assert.equal(closed, 2);
});

// R4i-small SM3: 2.42304.0's toolbar moves zoom into the bar as a labelled group, adds resting.firstToolsOnly and marks
// the drawing tools for the host's "[data-sketch-tools] button:not(:disabled)" focus target.
test('2.42304.0 toolbar: Zoom group, firstToolsOnly and data-sketch-tools come from the current source', () => {
  for (const feature of ['defaultMessage:"Zoom",id:"yMbKjuDH/n"', 'firstToolsOnly===!0', '"data-sketch-tools":!0'])
    assert.equal(original.split(feature).length - 1, 1, feature);
  const { Toolbar } = setup();
  const zoom = renderToStaticMarkup(h(Toolbar, { ...defaults, resting: { onHide() {}, zoom: { canZoomIn: true, canZoomOut: false } } }));
  assert.match(zoom, /<div role="group" aria-label="Zoom" class="flex items-center gap-xs">/);
  assert.match(zoom, /data-sketch-tools="true"/);
  const first = renderToStaticMarkup(h(Toolbar, { ...defaults, resting: { onHide() {}, firstToolsOnly: true } }));
  assert.ok(first.includes('aria-label="Pen"'));
  for (const label of ['Line', 'Arrow', 'Rectangle', 'Ellipse', 'Text']) assert.ok(!first.includes(`aria-label="${label}"`), label);
  assert.ok(first.includes('data-layout="full"'));
  const generated = fs.readFileSync(new URL('../src/generated/code-editor/preview-sketch-toolbar.mjs', import.meta.url), 'utf8');
  assert.match(generated, /^\/\/ Original adaptive selection\/drawing toolbar \(2\.42304\.0\)/);
  const manifest = JSON.parse(fs.readFileSync(new URL('../src/generated/code-editor/manifest.json', import.meta.url), 'utf8'));
  for (const name of ['preview-sketch-toolbar.mjs', 'preview-sketch-state.mjs', 'preview-sketch-keys.mjs', 'preview-sketch-host.mjs', 'preview-sketch-icons.mjs', 'preview-sketch-canvas.mjs']) {
    const entry = manifest.adapters.find(adapter => adapter.name === name);
    assert.equal(entry.referenceVersion, '2.42304.0', name);
    assert.ok(entry.sources.every(ref => ref.name.startsWith('../../../../installed-2.42304.0-20261017/')), name);
  }
  assert.equal(manifest.modules.some(module => module.name.startsWith('c0f671921-')), false, 'the 2.31226.0 icon font is no longer vendored');
});
