import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Fidelity F04: the popped-out pane header (panes-toggle-current.js:1361-1371 ma: Et dock, Ot pin) and
// the pin tE/eE (sidebar-support.js:9509-9547): ghost icon-only Pin / PinFilled, pressed while on top,
// aria-label and bottom tooltip "Keep window on top" / "Stop keeping window on top".
const app = path.resolve(import.meta.dirname, '..');
const icons = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/icons.json'), 'utf8'));
let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-pane-controls.jsx');
});
after(() => server?.close());
const render = (props) => renderToStaticMarkup(React.createElement(C.SourcePopoutControls, { paneName: 'Files', menuSections: [], onDock() {}, ...props }));
const buttons = (html) => [...html.matchAll(/<button[^>]*>.*?<\/button>/gs)].map((match) => match[0]);
const glyph = (button) => button.match(/data-cds="Icon"[^>]*>([^<]*)</)?.[1]?.codePointAt(0);

test('the pin follows Open in main window and reads Keep window on top with the Pin glyph', () => {
  const list = buttons(render({ onToggleAlwaysOnTop() {} }));
  assert.deepEqual(list.map((button) => button.match(/aria-label="([^"]*)"/)[1]), ['Open in main window', 'Keep window on top']);
  const pin = list[1];
  assert.match(pin, /aria-pressed="false"/); assert.match(pin, /data-popout-pin=""/); assert.match(pin, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/); // W14-code r2 fr2-19: the CDS ghost iconOnly Button
  assert.equal(glyph(pin), icons.Pin);
  assert.doesNotMatch(pin, /\stitle="/, 'a CDS tooltip, not a native title');
});

test('while on top the pin is pressed, PinFilled and labelled Stop keeping window on top', () => {
  const pin = buttons(render({ alwaysOnTop: true, onToggleAlwaysOnTop() {} }))[1];
  assert.match(pin, /aria-label="Stop keeping window on top"/); assert.match(pin, /aria-pressed="true"/);
  assert.equal(glyph(pin), icons.PinFilled);
  // W14-code r2 fr2-19: pressed is the CDS Button's own `pressed` (ghost paint `aria-pressed:text-accent`).
  assert.match(pin, /aria-pressed:text-accent/);
});

test('without a toggle (no pane window) there is no pin', () => {
  assert.deepEqual(buttons(render({})).map((button) => button.match(/aria-label="([^"]*)"/)[1]), ['Open in main window']);
});
