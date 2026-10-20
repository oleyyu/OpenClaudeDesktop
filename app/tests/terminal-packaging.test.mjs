import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// The terminal's node-pty must reach the packaged app although the package script ignores node_modules otherwise:
// only node-pty's runtime files (package.json, lib/, the darwin-arm64 prebuild) are copied, and the prebuild directory
// is unpacked beside app.asar so pty.node can be dlopen'ed and spawn-helper exec'ed. The filter and asar options are
// read from the real package script through @electron/packager's own parser and filter; then a production-like
// app.asar is built with @electron/asar and Electron (as Node) loads node-pty and the terminal service from inside it.
const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const packager = (file) => import(pathToFileURL(path.join(app, 'node_modules/@electron/packager/dist', file)).href);
const asar = () => import(pathToFileURL(path.join(app, 'node_modules/@electron/asar/lib/asar.js')).href);
const TMP = '/private/tmp/claude-501';

/** Shell words of the electron-packager command in the package script (single quotes only, as written there). */
function packagerArgs(script) {
  const command = script.split('&&').map((part) => part.trim()).find((part) => part.startsWith('electron-packager'));
  const words = [];
  for (const match of command.matchAll(/'([^']*)'|(\S+)/g)) {
    if (match[1] !== undefined) words.push(match[1]);
    else words.push(match[2].replace(/'([^']*)'/g, '$1'));
  }
  return words.slice(1);
}

let filter, opts;
test.before(async () => {
  const { parseArgs } = await packager('cli.js');
  opts = parseArgs(packagerArgs(pkg.scripts.package));
  const { populateIgnoredPaths, userPathFilter } = await packager('copy-filter.js');
  opts.dir = app;
  populateIgnoredPaths(opts);
  filter = userPathFilter(opts);
});

test('node-pty is a pinned dependency with a darwin-arm64 N-API prebuild and an executable spawn-helper', () => {
  assert.match(pkg.dependencies['node-pty'], /^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
  for (const name of ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-search', '@xterm/addon-unicode11', '@xterm/addon-web-links', '@xterm/addon-webgl'])
    assert.match(pkg.dependencies[name], /^\d+\.\d+\.\d+$/, name);
  const prebuild = path.join(app, 'node_modules/node-pty/prebuilds/darwin-arm64');
  assert.ok(fs.statSync(path.join(prebuild, 'pty.node')).isFile());
  assert.ok(fs.statSync(path.join(prebuild, 'spawn-helper')).mode & 0o111, 'spawn-helper is executable');
});

test('the package script keeps exactly node-pty\'s runtime files and unpacks its prebuilds', async () => {
  // node-pty's prebuilds, and the computer-use module's build/ (agent-tools-packaging.test.mjs).
  assert.deepEqual(opts.asar, { unpackDir: '{node_modules/node-pty/prebuilds,native/computer-use/build,helpers/cu-ax/build}' });
  assert.equal(opts.prune, false);
  const keep = async (relative) => filter(path.join(app, relative));
  for (const relative of ['electron/main.cjs', 'electron/terminal-service.cjs', 'electron/terminal-model.mjs', 'electron/agent-tools/terminal.mjs', 'dist',
    'node_modules', 'node_modules/node-pty', 'node_modules/node-pty/package.json', 'node_modules/node-pty/lib', 'node_modules/node-pty/lib/index.js',
    'node_modules/node-pty/lib/unixTerminal.js', 'node_modules/node-pty/prebuilds', 'node_modules/node-pty/prebuilds/darwin-arm64',
    'node_modules/node-pty/prebuilds/darwin-arm64/pty.node', 'node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper'])
    assert.equal(await keep(relative), true, `${relative} is packaged`);
  for (const relative of ['node_modules/react', 'node_modules/@xterm/xterm', 'node_modules/node-addon-api', 'node_modules/.bin',
    'node_modules/node-pty/src', 'node_modules/node-pty/deps', 'node_modules/node-pty/third_party', 'node_modules/node-pty/binding.gyp',
    'node_modules/node-pty/scripts', 'node_modules/node-pty/typings', 'node_modules/node-pty/prebuilds/win32-x64',
    'node_modules/node-pty/prebuilds/darwin-x64', 'node_modules/node-pty/lib/index.js.map', 'node_modules/node-pty/lib/terminal.test.js',
    'src/main.jsx', 'tests', 'scripts', 'package-lock.json'])
    assert.equal(await keep(relative), false, `${relative} is left out`);
  // The workflow progress model the packaged main process imports from src/ is still kept.
  assert.equal(await keep('src/workflow-progress-model.mjs'), true);
});

test('a production-like app.asar loads node-pty from the unpacked prebuild and runs a shell through the terminal service', { timeout: 60000 }, async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const root = fs.mkdtempSync(path.join(TMP, 'terminal-asar-'));
  try {
    const stage = path.join(root, 'stage');
    // Copy what the package filter keeps of node-pty, plus the terminal service and its local imports.
    const copy = async (relative) => {
      const from = path.join(app, relative);
      if (!(await filter(from))) return;
      const stat = fs.statSync(from);
      if (stat.isDirectory()) { for (const name of fs.readdirSync(from)) await copy(path.join(relative, name)); return; }
      fs.mkdirSync(path.dirname(path.join(stage, relative)), { recursive: true });
      fs.copyFileSync(from, path.join(stage, relative));
      fs.chmodSync(path.join(stage, relative), stat.mode);
    };
    await copy('node_modules/node-pty');
    for (const file of ['terminal-service.cjs', 'terminal-model.mjs', 'proxy-env.cjs', 'terminal-shell-integration.cjs', 'generated/terminal-shell.cjs']) await copy(path.join('electron', file));
    assert.ok(!fs.existsSync(path.join(stage, 'node_modules/node-pty/src')));
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: 'probe', main: 'probe.cjs' }));
    fs.writeFileSync(path.join(stage, 'probe.cjs'), `
      const path = require("node:path");
      const { createTerminalService, loadNodePty } = require("./electron/terminal-service.cjs");
      const loaded = loadNodePty();
      if (!loaded.module) { console.log(JSON.stringify({ error: loaded.error })); process.exit(2); }
      const folder = process.argv[2];
      const events = [];
      const sender = { send: (_channel, event) => events.push(event), isDestroyed: () => false, once() {} };
      const service = createTerminalService({ resolveOwner: () => folder, shell: "/bin/zsh", shellProxy: null, shellIntegrationDir: path.join(folder,"integration"),
        baseEnv: { PATH: "/usr/bin:/bin", HOME: folder, PS1: "$ " } });
      (async () => {
        const info = await service.call("create", { sessionId: "s1", cols: 90, rows: 20 }, sender);
        service.input(sender, info.id, "echo from-asar-$((6*7)); stty size; exit 0\\r");
        const started = Date.now();
        while (Date.now() - started < 10000 && !events.some((event) => event.kind === "state" && event.info.status === "exited")) await new Promise((r) => setTimeout(r, 50));
        const output = events.filter((event) => event.kind === "data").map((event) => event.data).join("");
        console.log(JSON.stringify({ backend: info.backend, shellIntegration: info.shellIntegration, dir: path.relative(__dirname, require.resolve("node-pty")), output, asar: __dirname.endsWith(".asar") }));
        await service.dispose();
      })();`);
    const { createPackageWithOptions } = await asar();
    const out = path.join(root, 'out');
    fs.mkdirSync(out);
    await createPackageWithOptions(stage, path.join(out, 'app.asar'), { unpackDir: opts.asar.unpackDir });
    const unpacked = path.join(out, 'app.asar.unpacked/node_modules/node-pty/prebuilds/darwin-arm64');
    assert.ok(fs.statSync(path.join(unpacked, 'pty.node')).isFile(), 'pty.node is unpacked');
    assert.ok(fs.statSync(path.join(unpacked, 'spawn-helper')).mode & 0o111, 'spawn-helper is unpacked and executable');
    const folder = fs.mkdtempSync(path.join(TMP, 'terminal-asar-cwd-'));
    const electron = require(path.join(app, 'node_modules/electron'));
    const run = spawnSync(electron, [path.join(out, 'app.asar/probe.cjs'), folder], {
      env: { PATH: '/usr/bin:/bin', HOME: folder, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 30000 });
    fs.rmSync(folder, { recursive: true, force: true });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const result = JSON.parse(run.stdout.trim().split('\n').pop());
    assert.equal(result.backend, 'pty');
    assert.equal(result.shellIntegration, 'zsh');
    assert.ok(result.output.includes('\x1b]133;A;'));
    assert.equal(result.asar, true, 'the probe ran from inside app.asar');
    assert.match(result.dir, /^node_modules\/node-pty\//);
    assert.match(result.output, /from-asar-42/);
    assert.match(result.output, /20 90/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
