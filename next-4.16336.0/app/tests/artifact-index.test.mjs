import test from 'node:test';
import assert from 'node:assert/strict';
import { recordArtifactItem, artifactRows, updateArtifact } from '../electron/artifact-index.mjs';
const config = () => ({ threadIds: ['task','code'], sessionMetadata: { task: { surface: 'cowork' } }, threadMetadata: { task: { cwd: '/project' }, code: { cwd: '/code' } } });
const item = (id = 'i', type = 'add') => ({ id, type: 'fileChange', status: 'completed', changes: [{ path: 'report.md', kind: { type } }] });

test('artifact index follows successful outputs, ignores Code/failed calls, and survives restart', () => {
  const c = config();
  assert.equal(recordArtifactItem(c, 'code', item()), false);
  assert.equal(recordArtifactItem(c, 'unknown', item()), false);
  assert.equal(recordArtifactItem(c, 'task', { ...item(), status: 'failed' }), false);
  assert.equal(recordArtifactItem(c, 'task', item(), 100), true);
  assert.equal(recordArtifactItem(c, 'task', item(), 200), false);
  const restored = JSON.parse(JSON.stringify(c));
  assert.equal(artifactRows(restored)[0].path, '/project/report.md');
  assert.equal(artifactRows(restored)[0].updatedAtMs, 100);
  recordArtifactItem(restored, 'task', item('next','update'), 300);
  assert.equal(artifactRows(restored).length, 1);
  assert.equal(artifactRows(restored)[0].createdAtMs, 100);
  assert.equal(artifactRows(restored)[0].updatedAtMs, 300);
  recordArtifactItem(restored, 'task', item('delete','delete'), 400);
  assert.equal(artifactRows(restored).length, 0);
});
test('presented files and provider artifacts are indexed and pins cannot target arbitrary records', () => {
  const c = config();
  recordArtifactItem(c, 'task', { id: 'present', type: 'dynamicToolCall', status: 'completed', codeDesktop: { deliverables: [{ path: 'deck.pptx', description: 'Slides' }], artifacts: [{ path: 'table.csv', title: 'Results' }] } }, 200);
  const rows = artifactRows(c);
  assert.equal(rows.length, 2);
  updateArtifact(c, { key: rows[1].key, starred: true });
  assert.equal(artifactRows(c)[0].title, 'Results');
  assert.throws(() => updateArtifact(c, { key: 'fake', starred: true }), /not found/);
  assert.throws(() => updateArtifact(c, { key: rows[0].key, starred: 'true' }), /Invalid/);
  c.threadIds = [];
  assert.equal(artifactRows(c).length, 0);
});

test('history backfill indexes existing sessions and cannot resurrect a newer deletion', async () => {
  const { backfillArtifacts } = await import('../electron/artifact-index.mjs');
  const c = config(); c.threadMetadata.task.historyMode = 'legacy';
  const calls = [], indexed = new Set();
  const request = async (method, params) => {
    calls.push([method, params]);
    return { thread: { id: 'task', cwd: '/project', historyMode: 'legacy', turns: [{ completedAt: 1, items: [item('old')] }] } };
  };
  const first = await backfillArtifacts(c, request, indexed);
  assert.equal(first.records.length, 1);
  assert.equal(first.incomplete, false);
  assert.equal(calls[0][1].includeTurns, true);
  assert.equal(indexed.has('task'), true);
  await backfillArtifacts(c, request, indexed);
  assert.equal(calls.length, 1);
  recordArtifactItem(c, 'task', item('deleted', 'delete'), 2000);
  await backfillArtifacts(c, request, new Set());
  assert.equal(artifactRows(c).length, 0);
  const failed = await backfillArtifacts(c, async () => { throw new Error('unavailable'); }, new Set());
  assert.equal(failed.incomplete, true);
});

test('paginated backfill loads every page before marking a session indexed', async () => {
  const { backfillArtifacts } = await import('../electron/artifact-index.mjs');
  const c = config(), indexed = new Set();
  const request = async (method, params) => {
    if (method === 'thread/read') { assert.equal(params.includeTurns, false); return { thread: { id: 'task', cwd: '/project', historyMode: 'paginated' } }; }
    assert.equal(method, 'thread/turns/list');
    return params.cursor ? { data: [{ id: 'older', completedAt: 1, itemsView: 'full', items: [item('old')] }], nextCursor: null }
      : { data: [{ id: 'newer', completedAt: 2, itemsView: 'full', items: [item('new','delete')] }], nextCursor: 'older' };
  };
  const result = await backfillArtifacts(c, request, indexed);
  assert.equal(result.incomplete, false);
  assert.equal(result.records.length, 0);
  assert.equal(indexed.has('task'), true);
});

test('artifact reads use the registered session root and reject unknown IDs and escaped symlinks', async t => {
  const { readArtifact } = await import('../electron/artifact-index.mjs');
  const { default: files } = await import('../electron/files.cjs');
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-read-'));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'project'); await fs.mkdir(root);
  const c = config(); c.threadMetadata.task.cwd = root;
  await fs.writeFile(path.join(root, 'report.md'), '# Preview');
  recordArtifactItem(c, 'task', item());
  const entry = artifactRows(c)[0];
  const result = await readArtifact(c, entry.key, files.readFile);
  assert.equal(result.file.text, '# Preview');
  assert.equal(result.displayPath, 'report.md');
  assert.equal(result.root, root);
  await assert.rejects(readArtifact(c, 'unknown', () => { throw new Error('must not read'); }), /Artifact not found/);
  await fs.writeFile(path.join(temp, 'outside.md'), 'outside secret');
  await fs.unlink(path.join(root, 'report.md'));
  await fs.symlink(path.join(temp, 'outside.md'), path.join(root, 'report.md'));
  const escaped = await readArtifact(c, entry.key, files.readFile);
  assert.equal(escaped.file.unavailable, 'outside_root');
  assert.equal(escaped.file.text, undefined);
  await fs.unlink(path.join(root, 'report.md'));
  assert.equal((await readArtifact(c, entry.key, files.readFile)).file.unavailable, 'missing');
});
