// W14-code r8 gates-r8-02: the host's appFeatures table (src/host-app-features.mjs) stands for the 3.6556.2 main
// process's `window.desktopBootFeatures` (asar index.chunk-jPKPzV-P bIr; Hon `2371478310: {rule: "forced", value: !0}`).
// Transcript rows' shared-78 store U boots from it (cC → the adapter bootAppFeatures), and the turn box and the sidebar's
// side-session nesting read the same table.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { HOST_APP_FEATURES, hostAppFeatures } from '../src/host-app-features.mjs';
import { hostSideSessionFeatures } from '../src/nested-less-side-chats.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
let server;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(() => server?.close());

test('the table: sideSessions, nestedArchiveKeepsFamily, chillingSlothFeat, ccdLandingTools supported; btwChildSessions follows the core', () => {
  assert.deepEqual(Object.keys(HOST_APP_FEATURES).sort(), ['ccdLandingTools', 'chillingSlothFeat', 'nestedArchiveKeepsFamily', 'sideSessions']);
  for (const entry of Object.values(HOST_APP_FEATURES)) assert.equal(entry.status, 'supported');
  assert.equal(hostAppFeatures({ capabilities: { btwChildSessions: true } }).btwChildSessions.status, 'supported');
  assert.equal(hostAppFeatures({ capabilities: {} }).btwChildSessions.status, 'unavailable');
  assert.equal(hostAppFeatures(null).btwChildSessions.status, 'unavailable');
  assert.deepEqual(hostSideSessionFeatures(null).appFeatures, hostAppFeatures(null));
});

test('transcript rows: shared-78 cC is the host adapter, no window.desktopBootFeatures read', () => {
  const rows = read('src/generated/transcript-rows/rows-shared-78-D5Fw2h0a.mjs');
  assert.match(rows, /bootAppFeatures as cC,/);
  assert.doesNotMatch(rows, /desktopBootFeatures/);
  assert.match(rows, /appFeatures: cC\(\),/);
  const manifest = JSON.parse(read('src/generated/transcript-rows/manifest.json'));
  const module = manifest.modules.find((m) => m.target === 'rows-shared-78-D5Fw2h0a.mjs');
  assert.deepEqual(module.imports.find((i) => i.local === 'cC'), { local: 'cC', from: '../../source-transcript-rows-adapters.jsx', name: 'bootAppFeatures',
    via: 'shared-78-D5Fw2h0a.js#cC', kind: 'adapter', original: 'cC' });
  assert.match(read('src/source-turn-box-adapters.jsx'), /const APP_FEATURES_STATE = Object\.freeze\(\{ appFeatures: HOST_APP_FEATURES \}\);/);
});

test('the store boots from the table, and code-transcript reads the same store', async () => {
  const rows = await server.ssrLoadModule('/src/generated/transcript-rows/rows-shared-78-D5Fw2h0a.mjs');
  assert.deepEqual(rows.U.getState().appFeatures, HOST_APP_FEATURES);
  // generated/code-transcript's shared-78 (Mw / Ew / xw readers) imports K and U from this one copy (D1).
  const ct = read('src/generated/code-transcript/shared-78-D5Fw2h0a.mjs');
  const block = ct.slice(0, ct.indexOf('} from "../transcript-rows/rows-shared-78-D5Fw2h0a.mjs";'));
  assert.match(block.slice(block.lastIndexOf('import {')), /\n  K,\n[\s\S]*\n  U,\n/);
  assert.doesNotMatch(ct, /desktopBootFeatures/);
  const adapters = await server.ssrLoadModule('/src/source-transcript-rows-adapters.jsx');
  assert.equal(adapters.bootAppFeatures(), rows.U.getState().appFeatures, 'the store boots from the adapter');
});
