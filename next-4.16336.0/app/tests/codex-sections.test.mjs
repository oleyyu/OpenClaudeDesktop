import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { withCoreSections } from '../src/sidebar-model.js';
const require = createRequire(import.meta.url);
const sections = require('../electron/codex-sections.cjs');
const { coreForEngine } = await import('../electron/core-registry.mjs');

function owner(list) {
  const calls = [];
  return { calls, serverInfo: { engine: 'codex', capabilities: {} }, request: async (method, params) => {
    calls.push([method, params]);
    if (method === 'threadSection/list') return { data: list, nextCursor: null };
    if (method === 'threadSection/create') return { section: { id: 'sec-new', name: params.name } };
    return {};
  } };
}

test('Codex sections import as the Pinned id and linked custom groups; local changes move threads between them', async () => {
  const codex = owner([{ id: 'sec-pin', name: 'Pinned' }, { id: 'sec-a', name: 'Auth work' }]);
  assert.equal(sections.sectionsCore(codex, { coreForEngine }), true);
  assert.equal(sections.sectionsCore({ serverInfo: { engine: 'kimi' } }, { coreForEngine }), false);
  const config = { customGroups: [{ id: 'g-old', name: 'Docs' }], sessionMetadata: {} };
  assert.equal(await sections.importSections(codex, config), true);
  assert.equal(config.codexPinnedSectionId, 'sec-pin');
  assert.deepEqual(config.customGroups.map((group) => [group.name, group.codexSectionId ?? null]), [['Docs', null], ['Auth work', 'sec-a']]);
  assert.equal(await sections.importSections(codex, config), false, 'nothing changed the second time');
  config.sessionMetadata.t1 = { pinned: true };
  await sections.placeSession(codex, config, 't1');
  assert.deepEqual(codex.calls.at(-1), ['thread/section/move', { threadId: 't1', sectionId: 'sec-pin' }]);
  config.sessionMetadata.t2 = { customGroupId: 'g-old' };
  await sections.placeSession(codex, config, 't2');
  assert.deepEqual(codex.calls.slice(-2), [['threadSection/create', { name: 'Docs' }], ['thread/section/move', { threadId: 't2', sectionId: 'sec-new' }]]);
  config.sessionMetadata.t2 = {};
  await sections.placeSession(codex, config, 't2');
  assert.deepEqual(codex.calls.at(-1), ['thread/section/move', { threadId: 't2', sectionId: null }]);
});

test('the sidebar reads Codex pins and sections where OpenClaude Desktop recorded none', () => {
  const groups = [{ id: 'g1', name: 'Auth work', codexSectionId: 'sec-a' }];
  const sessions = [{ id: 'a', section: { id: 'sec-pin' } }, { id: 'b', section: { id: 'sec-a' } }, { id: 'c', section: { id: 'sec-pin' } }, { id: 'd' }];
  const shown = withCoreSections({ c: { pinned: false } }, sessions, { customGroups: groups, pinnedSectionId: 'sec-pin' });
  assert.deepEqual([shown.a?.pinned, shown.b?.customGroupId, shown.c.pinned, shown.d], [true, 'g1', false, undefined]);
  const untouched = {};
  assert.equal(withCoreSections(untouched, [{ id: 'x' }], { customGroups: groups }), untouched);
});
