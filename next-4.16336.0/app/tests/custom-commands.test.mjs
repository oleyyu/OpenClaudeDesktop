import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const { createCustomCommands } = createRequire(import.meta.url)('../electron/custom-commands.cjs');

function fixture({ config = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccmd-'));
  const userData = path.join(root, 'userData'), project = path.join(root, 'project');
  fs.mkdirSync(userData); fs.mkdirSync(project);
  const events = [], trashed = [], opened = [];
  const state = { config: { cwd: project, ...config } };
  const service = createCustomCommands({
    app: { getPath: () => userData },
    shell: { trashItem: async file => { trashed.push(file); fs.rmSync(file); }, openPath: async dir => { opened.push(dir); return ''; } },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [path.join(root, 'picked')] }) },
    getConfig: () => state.config,
    emit: event => events.push(event),
    knownCwd: cwd => { if (cwd !== project) throw new Error('Unknown workspace directory.'); return cwd; },
  });
  return { root, userData, project, events, trashed, opened, service, state, cleanup: () => { service.dispose(); fs.rmSync(root, { recursive: true, force: true }); } };
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('list returns both folders, ignores bad names, big files and non-md', async t => {
  const f = fixture(); t.after(f.cleanup);
  const globalDir = path.join(f.userData, 'commands');
  fs.mkdirSync(globalDir);
  fs.writeFileSync(path.join(globalDir, 'review.md'), '---\ndescription: R\n---\nReview');
  fs.writeFileSync(path.join(globalDir, 'bad name.md'), 'x');
  fs.writeFileSync(path.join(globalDir, 'notes.txt'), 'x');
  fs.writeFileSync(path.join(globalDir, 'huge.md'), 'x'.repeat(64 * 1024 + 1));
  const result = await f.service.run({ op: 'list', cwd: f.project });
  assert.equal(result.global.dir, globalDir);
  assert.equal(result.global.exists, true);
  assert.deepEqual(result.global.files.map(file => file.name), ['review']);
  assert.equal(result.global.files[0].text, '---\ndescription: R\n---\nReview');
  assert.deepEqual(result.project, { dir: path.join(f.project, '.code-desktop', 'commands'), exists: false, files: [] });
  assert.equal((await f.service.run({ op: 'list', cwd: '/elsewhere' })).project, null);
  f.state.config.customCommands = { projectEnabled: false };
  assert.equal((await f.service.run({ op: 'list', cwd: f.project })).project, null);
  f.state.config.customCommands = { globalDir: path.join(f.root, 'mine') };
  assert.equal((await f.service.run({ op: 'list' })).global.dir, path.join(f.root, 'mine'));
});

test('save writes atomically, renames, refuses clobbering and validates', async t => {
  const f = fixture(); t.after(f.cleanup);
  const { path: saved } = await f.service.run({ op: 'save', scope: 'project', cwd: f.project, name: 'deploy', text: 'Deploy $ARGUMENTS\n' });
  assert.equal(saved, path.join(f.project, '.code-desktop', 'commands', 'deploy.md'));
  assert.equal(fs.readFileSync(saved, 'utf8'), 'Deploy $ARGUMENTS\n');
  await assert.rejects(f.service.run({ op: 'save', scope: 'project', cwd: f.project, name: 'deploy', text: 'x' }), /already exists/);
  await f.service.run({ op: 'save', scope: 'project', cwd: f.project, name: 'deploy', previousName: 'deploy', text: 'v2' });
  assert.equal(fs.readFileSync(saved, 'utf8'), 'v2');
  await f.service.run({ op: 'save', scope: 'project', cwd: f.project, name: 'ship', previousName: 'deploy', text: 'v3' });
  const dir = path.dirname(saved);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['ship.md']);
  assert.equal(fs.readFileSync(path.join(dir, 'ship.md'), 'utf8'), 'v3');
  await assert.rejects(f.service.run({ op: 'save', scope: 'global', name: '../x', text: 'x' }), /command name/);
  await assert.rejects(f.service.run({ op: 'save', scope: 'global', name: 'big', text: 'x'.repeat(64 * 1024 + 1) }), /64 KB/);
  await assert.rejects(f.service.run({ op: 'save', scope: 'project', cwd: '/elsewhere', name: 'x', text: 'x' }), /Unknown workspace/);
  await assert.rejects(f.service.run({ op: 'save', scope: 'other', name: 'x', text: 'x' }), /scope/);
  await f.service.run({ op: 'save', scope: 'global', name: 'mine', text: 'M' });
  assert.equal(fs.readFileSync(path.join(f.userData, 'commands', 'mine.md'), 'utf8'), 'M');
});

test('delete trashes, reveal creates and opens, pick-dir returns the folder', async t => {
  const f = fixture(); t.after(f.cleanup);
  await f.service.run({ op: 'save', scope: 'global', name: 'gone', text: 'x' });
  await f.service.run({ op: 'delete', scope: 'global', name: 'gone' });
  assert.deepEqual(f.trashed, [path.join(f.userData, 'commands', 'gone.md')]);
  await assert.rejects(f.service.run({ op: 'delete', scope: 'global', name: 'gone' }), /no longer exists/);
  await f.service.run({ op: 'reveal', scope: 'project', cwd: f.project });
  assert.deepEqual(f.opened, [path.join(f.project, '.code-desktop', 'commands')]);
  assert.ok(fs.statSync(f.opened[0]).isDirectory());
  assert.equal(await f.service.run({ op: 'pick-dir' }), path.join(f.root, 'picked'));
  assert.throws(() => f.service.run({ op: 'nope' }), /Unknown/);
});

test('watchers emit custom-commands-changed for new folders and edits', async t => {
  const f = fixture(); t.after(f.cleanup);
  await f.service.run({ op: 'list', cwd: f.project });
  assert.equal(f.service.watcherCount(), 2);
  // macOS FSEvents streams drop changes made in the first moments after they start; let them settle.
  await wait(250);
  // The project commands folder does not exist yet: the watcher sits on an ancestor.
  fs.mkdirSync(path.join(f.project, '.code-desktop', 'commands'), { recursive: true });
  for (let i = 0; i < 40 && !f.events.some(e => e.scope === 'project'); i++) await wait(50);
  assert.deepEqual(f.events.find(e => e.scope === 'project'), { kind: 'custom-commands-changed', scope: 'project', cwd: f.project });
  f.events.length = 0;
  fs.writeFileSync(path.join(f.project, '.code-desktop', 'commands', 'new.md'), 'x');
  for (let i = 0; i < 40 && !f.events.some(e => e.scope === 'project'); i++) await wait(50);
  assert.ok(f.events.some(e => e.scope === 'project'));
  fs.mkdirSync(path.join(f.userData, 'commands'));
  for (let i = 0; i < 40 && !f.events.some(e => e.scope === 'global'); i++) await wait(50);
  assert.ok(f.events.some(e => e.scope === 'global' && e.cwd === null));
  f.service.dispose();
  assert.equal(f.service.watcherCount(), 0);
});
