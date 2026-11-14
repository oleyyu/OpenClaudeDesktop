// 4.16336.0 rail cutover (2026-11-13): the docked rail column is the official cc43287c9 IK flat column. The host holds
// its class text as constants in src/source-session-rail.jsx; this test pins each against the frozen reference bytes:
//   RAIL_PANE_GROUND_CLASS    = shared-120 `ir`
//   RAIL_FLAT_GEOMETRY_CLASS  = shared-20 `Sy`
//   RAIL_BODY_ROW_BLEED_CLASS = shared-18 `dw`
//   RAIL_FLAT_COLUMN_PROPS    = shared-20 `Py` (className template with its three slots resolved, plus data-session-rail-flat)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const ASSETS = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const official = prefix => {
  const name = fs.readdirSync(ASSETS).find(f => f.startsWith(prefix) && f.endsWith('.js'));
  assert.ok(name, prefix);
  return fs.readFileSync(path.join(ASSETS, name), 'utf8');
};

let server, Rail, Layout, Column, savedWindow, savedDocument;
before(async () => {
  // Same load-time stubs as session-rail-mount.test.mjs (the rail graph touches document/window while it evaluates).
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  globalThis.document = { cookie: '', createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null, hasAttribute: () => false } };
  globalThis.window = { document: globalThis.document, localStorage: undefined, addEventListener() {}, removeEventListener() {}, matchMedia: undefined, location: { pathname: '/' }, navigator: globalThis.navigator };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Rail = await server.ssrLoadModule('/src/source-session-rail.jsx');
  Layout = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-layout.mjs');
  Column = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-column.mjs');
});
after(async () => {
  await server?.close();
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});

test('pane ground, flat geometry and body-row bleed are the official literals', () => {
  assert.ok(official('shared-120-').includes(`ir="${Rail.RAIL_PANE_GROUND_CLASS}"`), 'shared-120 ir');
  assert.ok(official('shared-20-').includes(`Sy="${Rail.RAIL_FLAT_GEOMETRY_CLASS}"`), 'shared-20 Sy');
  assert.ok(official('shared-18-').includes(`dw="${Rail.RAIL_BODY_ROW_BLEED_CLASS}"`), 'shared-18 dw');
});

test('the flat column props are the official Py template with width, overlay shift and pane ground in its slots', () => {
  const m = official('shared-20-').match(/Py=\{className:`([^`]*)`/);
  assert.ok(m, 'shared-20 Py');
  const slots = [...m[1].matchAll(/\$\{[^}]+\}/g)];
  assert.equal(slots.length, 3);
  const values = [Layout.RAIL_WIDTH_CLASS, Column.RAIL_OVERLAY_SHIFT_CLASS, Rail.RAIL_PANE_GROUND_CLASS];
  let i = 0;
  assert.equal(Rail.RAIL_FLAT_COLUMN_PROPS.className, m[1].replace(/\$\{[^}]+\}/g, () => values[i++]));
  assert.equal(Rail.RAIL_FLAT_COLUMN_PROPS[Layout.RAIL_FLAT_ATTRIBUTE], '');
  assert.equal(Layout.RAIL_FLAT_ATTRIBUTE, 'data-session-rail-flat');
  assert.ok(Object.isFrozen(Rail.RAIL_FLAT_COLUMN_PROPS));
});
