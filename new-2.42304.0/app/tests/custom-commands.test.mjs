import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const { createCustomCommands } = createRequire(import.meta.url)('../electron/custom-commands.cjs');

function fixture({ config = {}, watch } = {}) {
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
    ...(watch ? { watch } : {}),
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

// A scripted fs.watch: events reach only the watchers the test fires, so a change made while a freshly opened
// watcher is still starting (macOS FSEvents drops those) is modelled by simply not firing it.
function scriptedWatch() {
  const opened = [];
  const watch = (target, _options, listener) => {
    if (!fs.existsSync(target)) throw Object.assign(new Error(`ENOENT: ${target}`), { code: 'ENOENT' });
    const watcher = { target, listener, closed: false, close() { this.closed = true; }, on() {} };
    opened.push(watcher);
    return watcher;
  };
  const fire = (target, filename) => { for (const w of opened) if (!w.closed && w.target === target) w.listener('rename', filename); };
  return { watch, opened, fire };
}
const until = async (check, ms = 2000) => { for (let i = 0; i < ms / 25 && !check(); i++) await wait(25); return check(); };

test('a command written while the watcher re-arms on a new folder is still reported', async t => {
  const w = scriptedWatch();
  const f = fixture({ watch: w.watch }); t.after(f.cleanup);
  await f.service.run({ op: 'list', cwd: f.project });
  const dir = path.join(f.project, '.code-desktop', 'commands');
  fs.mkdirSync(dir, { recursive: true });
  w.fire(f.project, '.code-desktop');
  assert.ok(await until(() => f.events.some(e => e.scope === 'project')));
  assert.ok(w.opened.some(x => x.target === dir && !x.closed), 'the folder itself is watched now');
  f.events.length = 0;
  // Written right after the folder appeared: the new watcher is not live yet and never reports it.
  fs.writeFileSync(path.join(dir, 'new.md'), 'x');
  assert.ok(await until(() => f.events.some(e => e.scope === 'project')), 'the write is picked up once the new watcher settles');
  // Nothing changed after the global folder appeared: exactly one event, no spurious follow-up.
  f.events.length = 0;
  fs.mkdirSync(path.join(f.userData, 'commands'));
  w.fire(f.userData, 'commands');
  assert.ok(await until(() => f.events.some(e => e.scope === 'global')));
  await wait(1500);
  assert.equal(f.events.filter(e => e.scope === 'global').length, 1);
});

test('an edit keeps the live folder watcher instead of reopening it', async t => {
  const w = scriptedWatch();
  const f = fixture({ watch: w.watch }); t.after(f.cleanup);
  const dir = path.join(f.userData, 'commands');
  fs.mkdirSync(dir);
  await f.service.run({ op: 'list' });
  w.fire(dir, 'a.md');
  assert.ok(await until(() => f.events.length === 1));
  w.fire(dir, 'b.md');
  assert.ok(await until(() => f.events.length === 2), 'a second edit reaches the same watcher');
  assert.equal(w.opened.filter(x => x.target === dir).length, 1);
});
