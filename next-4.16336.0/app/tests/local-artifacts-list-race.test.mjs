// library-pages-r1-02: the second Artifacts visit in one app run failed with "Cannot read properties of null (reading
// 'promise')". electron/main.cjs `local-artifacts` list set artifactRead to the pending backfill, awaited two dynamic
// imports, then read artifactRead.promise; a warm backfill settles during those awaits and its .finally has cleared
// artifactRead by then. This runs the real list branch text from main.cjs against stubs whose backfill settles before the
// imports do (the warm case) and checks both visits list the records.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');

function listBranch() {
  const start = main.indexOf("if (p.action === 'list') {", main.indexOf('case "local-artifacts": {'));
  assert.ok(start > 0, 'local-artifacts list branch');
  let depth = 0, i = start + "if (p.action === 'list') ".length;
  for (; i < main.length; i++) { if (main[i] === '{') depth++; else if (main[i] === '}' && --depth === 0) break; }
  return main.slice(start, i + 1);
}

test('local-artifacts list: a backfill that settles during the imports still answers the listing (second visit)', async () => {
  const branch = listBranch().replaceAll('await import(', 'await ctx.importLate(');
  const AsyncFunction = (async () => {}).constructor;
  // Sloppy-mode body so `with (ctx)` resolves main.cjs's free names (client, config, artifactRead, …) on the stub object.
  const run = new AsyncFunction('ctx', `with (ctx) { ${branch} }`);
  const owner = { start: async () => {}, request: async () => ({}) };
  const ctx = {
    p: { action: 'list' }, client: owner, config: { threadIds: [], archivedThreadIds: [], sessionMetadata: {} },
    artifactRead: null, artifactIndexed: new Map(), save() {},
    artifactIndex: { backfillArtifacts: async () => ({ records: [{ key: 'k1' }], incomplete: false }) },
    coworkSessions: { owns: () => false, request: async () => ({}) },
    chatArtifacts: { listAll: async () => [] },
    // The imports settle on a later macrotask, after the warm backfill's .finally ran.
    importLate: () => new Promise(resolve => setTimeout(() => resolve({ chatLibraryRecords: rows => rows, sessionSurface: () => 'cowork' }), 0)),
  };
  ctx.ctx = ctx;
  for (const visit of [1, 2]) {
    const result = await run(ctx);
    assert.deepEqual(result.records, [{ key: 'k1' }], `visit ${visit}`);
    assert.equal(ctx.artifactRead, null, 'the settled read is released');
  }
});
