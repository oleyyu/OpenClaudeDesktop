import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Round-3 integration: boot === null is the catalog-loading state (main.jsx modelsLoading={boot === null}).
// main.cjs emits account-snapshot as soon as the account refresh settles, while connect() still waits for
// model/list; an updater that spread a null boot made a partial boot, so the model trigger left its loading
// state with no catalog ('Default model', disabled) — menus-states caught it under load. Events now update
// an existing boot only; init() returns the fresher account, auth and connection state itself.
const main = readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');

test('connection and account events never create a boot before init resolves', () => {
  assert.match(main, /if\(e\.kind==='account-auth'\)setBoot\(b=>b&&\(\{\.\.\.b,auth:e\.auth\}\)\);/);
  assert.match(main, /if\(e\.kind==='account-snapshot'\)setBoot\(b=>b&&\(\{\.\.\.b,account:e\.account\}\)\);/);
  assert.match(main, /setBoot\(\(b\) => b && \(\{ \.\.\.b, connected: e\.connected,/);
  assert.match(main, /modelsLoading=\{boot === null\}/);
});
