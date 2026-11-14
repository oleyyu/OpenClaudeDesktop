import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { localProjects, applyProjectContext } from '../electron/local-projects.mjs';

test('local projects survive serialization and reopen their actual folder without changing Code cwd', async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-projects-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const config = { cwd: '/original/code', surfaceFolders: { chat: '/chat' } };
  const options = { dataDir };
  const project = await localProjects(config, { action: 'create', name: ' Research ', description: 'Sources' }, options);
  assert.equal(project.name, 'Research');
  assert.equal((await fs.stat(project.cwd)).isDirectory(), true);
  const restored = JSON.parse(JSON.stringify(config));
  await fs.writeFile(path.join(project.cwd, 'notes.txt'), 'keep this');
  assert.deepEqual(await localProjects(restored, { action: 'list' }, options), [project]);
  await localProjects(restored, { action: 'open', id: project.id }, options);
  assert.equal(restored.surfaceFolders.cowork, project.cwd);
  assert.equal(restored.surfaceFolders.chat, '/chat');
  assert.equal(restored.cwd, '/original/code');
  assert.equal(await fs.readFile(path.join(project.cwd, 'notes.txt'), 'utf8'), 'keep this');
});

test('project creation rejects invalid fields and unapproved folders without creating a record', async () => {
  const config = {};
  const options = { dataDir: '/unused', approveFolder() { throw new Error('Unknown workspace directory.'); } };
  await assert.rejects(localProjects(config, { action: 'create', name: '' }, options), /project name/);
  await assert.rejects(localProjects(config, { action: 'create', name: 'x', description: 'x'.repeat(4001) }, options), /too long/);
  await assert.rejects(localProjects(config, { action: 'create', name: 'x', folder: '/unapproved' }, options), /Unknown workspace/);
  await assert.rejects(localProjects(config, { action: 'create', name: 'x', folder: { path: '/unapproved' } }, options), /Choose a directory/);
  await assert.rejects(localProjects(config, { action: 'open', id: 'missing' }, options), /not found/);
  assert.equal(config.localProjects, undefined);
});


test('project edits validate atomically and preserve the working folder', async () => {
  const project = { id: 'p', name: 'Before', cwd: '/original', updatedAt: 'old' };
  const config = { localProjects: [project] };
  const options = { now: () => 'new' };
  await assert.rejects(localProjects(config, { action: 'update', id: 'p', name: 'After', instructions: 'x'.repeat(16001) }, options), /instructions/);
  assert.equal(project.name, 'Before');
  const result = await localProjects(config, { action: 'update', id: 'p', name: 'After', instructions: ' Cite sources ', isStarred: true, cwd: '/ignored' }, options);
  assert.deepEqual(result, { id: 'p', name: 'After', cwd: '/original', updatedAt: 'new', instructions: 'Cite sources', isStarred: true });
});

test('explicit project identity distinguishes shared folders, strips host metadata and restores instructions', () => {
  const config = { localProjects: [{ id: 'a', cwd: '/shared', instructions: 'A' }, { id: 'b', cwd: '/shared', instructions: 'B' }], sessionMetadata: { thread: { projectId: 'b' } } };
  const start = { cwd: '/shared', codeDesktop: { projectId: 'b', tools: ['read'] }, developerInstructions: 'Surface' };
  assert.equal(applyProjectContext(config, 'thread/start', start, 'cowork').id, 'b');
  assert.deepEqual(start.codeDesktop, { tools: ['read'] });
  assert.equal(start.developerInstructions, 'Surface\n\nProject instructions:\nB');
  const resume = { threadId: 'thread' };
  applyProjectContext(config, 'thread/resume', resume, null);
  assert.equal(resume.developerInstructions, 'Project instructions:\nB');
  assert.equal(applyProjectContext(config, 'thread/start', { cwd: '/shared' }, 'cowork'), null);
  assert.throws(() => applyProjectContext(config, 'thread/start', { cwd: '/wrong', codeDesktop: { projectId: 'b' } }, 'cowork'), /does not match/);
  assert.throws(() => applyProjectContext(config, 'thread/start', { cwd: '/shared', codeDesktop: { projectId: 'b' } }, 'code'), /does not match/);
});
