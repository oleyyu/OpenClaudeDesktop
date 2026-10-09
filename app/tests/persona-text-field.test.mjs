// Settings › Persona text fields: a save the persona normalizes (trimmed) settles the field on the saved value, so
// Save / Discard go away instead of staying for an edit that can never differ from what was saved.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
let server, P;
before(async () => {
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  P = await server.ssrLoadModule('/src/source-settings-persona.jsx');
});
after(() => server?.close());

test('persona field: "Bob " saved as "Bob" settles the draft and is no longer dirty', () => {
  // The user typed "Bob " over an empty name; the save stored the trimmed "Bob" and the prop now reads "Bob".
  assert.deepEqual(P.settledPersonaDraft('Bob ', 'Bob', true), { draft: 'Bob', edited: false });
  assert.equal(P.personaDraftDirty('Bob', 'Bob'), false);
  // A trailing space alone is no change worth saving (the save would store the same trimmed value).
  assert.equal(P.personaDraftDirty('Bob ', 'Bob'), false);
  // A real edit stays dirty, and an edit still in progress is kept when another value arrives.
  assert.equal(P.personaDraftDirty('Bobby', 'Bob'), true);
  assert.equal(P.personaDraftDirty('', 'Bob'), true);
  assert.deepEqual(P.settledPersonaDraft('Bobby', 'Rob', true), { draft: 'Bobby', edited: true });
  // An untouched field follows the saved value.
  assert.deepEqual(P.settledPersonaDraft('Bob', 'Rob', false), { draft: 'Rob', edited: false });
});
