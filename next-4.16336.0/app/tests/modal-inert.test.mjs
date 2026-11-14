import test from 'node:test';
import assert from 'node:assert/strict';
import { holdModalInert } from '../src/modal-inert.mjs';

test('closing a table while Settings opens keeps the app inert only until the last modal closes', () => {
  for (const reverse of [false, true]) {
    const root = { inert: false }, table = holdModalInert(root), settings = holdModalInert(root);
    const [first, last] = reverse ? [settings, table] : [table, settings];
    first(); assert.equal(root.inert, true);
    first(); assert.equal(root.inert, true); // duplicate teardown does not consume another owner
    last(); assert.equal(root.inert, false);
  }
});
test('modal inert ownership preserves an existing owner and is independent for a nested dialog', () => {
  const app = { inert: true }, settings = { inert: false };
  const releaseApp = holdModalInert(app), releaseSettings = holdModalInert(settings);
  releaseApp(); assert.equal(app.inert, true); assert.equal(settings.inert, true);
  releaseSettings(); assert.equal(settings.inert, false);
  holdModalInert(null)();
});
