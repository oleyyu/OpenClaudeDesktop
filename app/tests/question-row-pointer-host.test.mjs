// chat-cowork-1to1 r3 (cowork-r3-01): the hosts of the generated question-card-v4 row-pointer factories
// (source-question-card.jsx dt, source-async-questions.jsx) must pass the refs under the names the 4.16336.0 factory
// destructures (c9ed5627b: `({ jn, An })` / `({ An })`), not the 3.6556.2 `un` / `dn`; otherwise `jn.current` throws on
// the first row mousedown and no row is picked.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

let server, questionRowMouseDown, questionEndsDragSelect;
before(async () => {
  server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ questionRowMouseDown, questionEndsDragSelect } = await server.ssrLoadModule('/src/generated/question-card-v4/row-pointer.mjs'));
});
after(async () => { await closeWhenSettled(server); await server.close(); });

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const generated = read('../src/generated/question-card-v4/row-pointer.mjs');
const paramKeys = name => {
  const m = generated.match(new RegExp(`var ${name} =\\s*\\(\\{([^}]*)\\}\\)\\s*=>`));
  assert.ok(m, `${name} factory signature`);
  return m[1].split(',').map(s => s.trim()).filter(Boolean).sort();
};
const callArgs = (src, name) => {
  const m = src.match(new RegExp(`${name}\\(\\{([^}]*)\\}\\)`));
  assert.ok(m, `${name} call`);
  return Object.fromEntries(m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => s.split(':').map(x => x.trim())));
};

for (const file of ['../src/source-question-card.jsx', '../src/source-async-questions.jsx']) {
  test(`${file.slice(7)}: row-pointer refs use the factory's own parameter names, and a left press does not throw`, () => {
    const src = read(file);
    const down = callArgs(src, 'questionRowMouseDown'), ends = callArgs(src, 'questionEndsDragSelect');
    assert.deepEqual(Object.keys(down).sort(), paramKeys('questionRowMouseDown'));
    assert.deepEqual(Object.keys(ends).sort(), paramKeys('questionEndsDragSelect'));
    // the press ref is shared between both factories
    const pressKey = paramKeys('questionEndsDragSelect')[0];
    assert.equal(down[pressKey], ends[pressKey]);

    const refs = {};
    const refFor = local => (refs[local] ??= { current: null });
    const downArgs = Object.fromEntries(Object.entries(down).map(([k, v]) => [k, refFor(v)]));
    const endsArgs = Object.fromEntries(Object.entries(ends).map(([k, v]) => [k, refFor(v)]));
    const listeners = [];
    const doc = { getSelection: () => ({ isCollapsed: true, rangeCount: 0 }), activeElement: null,
      addEventListener: (type, fn) => listeners.push({ type, fn }) };
    const row = { ownerDocument: doc, contains: () => true };
    assert.doesNotThrow(() => questionRowMouseDown(downArgs)({ button: 0, currentTarget: row, shiftKey: false, clientX: 0, clientY: 0 }));
    assert.equal(listeners.length, 1);
    listeners[0].fn({ button: 0, clientX: 0, clientY: 0, detail: 1, target: row });
    // a plain click is a pick, not a drag-select
    assert.equal(questionEndsDragSelect(endsArgs)({ detail: 1 }), false);
  });
}
