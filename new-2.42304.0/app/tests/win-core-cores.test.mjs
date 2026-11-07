// Windows behaviour of core installs and detection (core-registry releaseAsset, core-manager.cjs, archive-extract.cjs,
// extension-packs.cjs), checked on any host through the injectable platform.
import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { coreById, releaseAsset } from '../electron/core-registry.mjs';

const require = createRequire(import.meta.url);
const { createCoreManager, findBinary, releaseProblem } = require('../electron/core-manager.cjs');
const { extractCommand, windowsTar } = require('../electron/archive-extract.cjs');
const { validatePack, BUNDLED_DIR } = require('../electron/extension-packs.cjs');
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

test('releases are picked per OS: Windows gets a Windows build, a portable Node package, or nothing — never a Mac binary', () => {
  const codex = coreById('codex');
  assert.equal(releaseAsset(codex, 'arm64', 'darwin').name, 'codex-aarch64-apple-darwin.tar.gz', 'macOS unchanged');
  assert.equal(releaseAsset(codex, 'x64', 'darwin').name, 'codex-x86_64-apple-darwin.tar.gz');
  const win = releaseAsset(codex, 'x64', 'win32');
  assert.equal(win.name, 'codex-x86_64-pc-windows-msvc.exe.tar.gz');
  assert.equal(win.url, 'https://github.com/openai/codex/releases/download/rust-v0.162.1/codex-x86_64-pc-windows-msvc.exe.tar.gz');
  assert.equal(releaseAsset(codex, 'arm64', 'win32').name, 'codex-aarch64-pc-windows-msvc.exe.tar.gz');
  for (const [id, x64, type] of [['kimi', 'kimi-code-win32-x64.tar.gz', 'tar.gz'], ['opencode', 'opencode-windows-x64.zip', 'zip'], ['mimo', 'mimocode-windows-x64.zip', 'zip']]) {
    const asset = releaseAsset(coreById(id), 'x64', 'win32');
    assert.equal(asset?.name, x64, id);
    assert.equal(asset.type, type, id);
    assert.equal(releaseProblem(asset, coreById(id)), null, `${id} release is installable`);
  }
  // Node packages run anywhere: the same tarball on every OS.
  for (const id of ['gemini', 'qwen', 'minimax']) assert.equal(releaseAsset(coreById(id), 'x64', 'win32')?.name, releaseAsset(coreById(id), 'x64', 'darwin').name, id);
  // ZCode only ships a macOS disk image.
  assert.equal(releaseAsset(coreById('zcode'), 'arm64', 'win32'), null);
  assert.equal(releaseAsset(coreById('zcode'), 'x64', 'linux'), null);
});

test('the bundled Codex pack still validates with its Windows release keys', () => {
  const { core } = validatePack(path.join(BUNDLED_DIR, 'codex'));
  assert.ok(core.agent.release.assets['win32-x64']);
});

test('Windows archives unpack with System32\\tar.exe (bsdtar), never a tar from PATH; macOS keeps tar/ditto', () => {
  const env = { SystemRoot: 'C:\\Windows' };
  assert.equal(windowsTar(env), 'C:\\Windows\\System32\\tar.exe');
  assert.deepEqual(extractCommand('zip', 'C:\\d\\a.zip', 'C:\\d\\out', { platform: 'win32', env }), { file: 'C:\\Windows\\System32\\tar.exe', args: ['-xf', 'C:\\d\\a.zip', '-C', 'C:\\d\\out'] });
  assert.deepEqual(extractCommand('tar.gz', 'a.tgz', 'o', { platform: 'win32', env }).args, ['-xf', 'a.tgz', '-C', 'o']);
  assert.equal(extractCommand('dmg', 'a', 'o', { platform: 'win32', env }), null);
  assert.deepEqual(extractCommand('zip', 'a.zip', 'o', { platform: 'darwin' }), { file: 'ditto', args: ['-x', '-k', 'a.zip', 'o'] });
  assert.deepEqual(extractCommand('tar.gz', 'a.tgz', 'o', { platform: 'darwin' }), { file: 'tar', args: ['-xzf', 'a.tgz', '-C', 'o'] });
});

test('findBinary on Windows takes <name>.exe or Codex\'s triple-named .exe, not a sibling helper', () => {
  const dir = tmp('win-find-');
  try {
    fs.mkdirSync(path.join(dir, 'bin'));
    fs.writeFileSync(path.join(dir, 'codex-command-runner-x86_64-pc-windows-msvc.exe'), '');
    fs.writeFileSync(path.join(dir, 'bin', 'codex-x86_64-pc-windows-msvc.exe'), '');
    fs.writeFileSync(path.join(dir, 'codex'), '');
    assert.equal(findBinary(dir, 'codex', 'win32'), path.join(dir, 'bin', 'codex-x86_64-pc-windows-msvc.exe'));
    assert.equal(findBinary(dir, 'codex', 'darwin'), path.join(dir, 'codex'), 'macOS unchanged');
    const other = tmp('win-find-');
    fs.writeFileSync(path.join(other, 'OpenCode.EXE'), '');
    assert.equal(findBinary(other, 'opencode', 'win32'), path.join(other, 'OpenCode.EXE'));
    fs.rmSync(other, { recursive: true, force: true });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function manager({ data, home, env = {}, platform = 'win32' }) {
  return createCoreManager({ dataDir: () => data, getConfig: () => ({}), save: () => {}, home, env, platform, arch: 'x64', nodeBinary: () => 'C:\\Program Files\\nodejs\\node.exe',
    fetchImpl: () => { throw new Error('no network'); } });
}

test('Windows detection: a program is an .exe/.cmd that exists (no exec bit), system paths split on ";"', async () => {
  const root = tmp('win-detect-');
  try {
    const data = path.join(root, 'data'), home = path.join(root, 'home');
    fs.mkdirSync(data); fs.mkdirSync(home);
    const noExt = path.join(root, 'kimi'), exe = path.join(root, 'kimi.exe');
    fs.writeFileSync(noExt, '', { mode: 0o755 });
    fs.writeFileSync(exe, '', { mode: 0o644 });
    const list = await manager({ data, home, env: { CODE_DESKTOP_CORE_SYSTEM_PATHS: `${noExt};${exe}` } }).list();
    const kimi = list.cores.find((row) => row.id === 'kimi');
    assert.equal(kimi.systemInstall, exe, 'the extension-less file is skipped, the .exe found though it has no exec bit');
    assert.equal(kimi.release.url.endsWith('/kimi-code-win32-x64.tar.gz'), true);
    const zcode = list.cores.find((row) => row.id === 'zcode');
    assert.equal(zcode.release, null);
    // macOS reads the same variable split on ":" and needs the exec bit.
    const mac = await manager({ data, home, env: { CODE_DESKTOP_CORE_SYSTEM_PATHS: `${exe}:${noExt}` }, platform: 'darwin' }).list();
    assert.equal(mac.cores.find((row) => row.id === 'kimi').systemInstall, noExt);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Windows: a core with no Windows release says so instead of downloading a Mac build', async () => {
  const root = tmp('win-norelease-');
  try {
    const data = path.join(root, 'data'), home = path.join(root, 'home');
    fs.mkdirSync(data); fs.mkdirSync(home);
    await assert.rejects(manager({ data, home }).install('zcode'), /no Windows release of this core/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Windows terminal shims are <name>.cmd batch files; a stale one goes', () => {
  const root = tmp('win-shims-');
  try {
    const data = path.join(root, 'data'), home = path.join(root, 'home');
    const native = path.join(data, 'cores', 'kimi', '2.1.1', 'kimi.exe');
    fs.mkdirSync(path.dirname(native), { recursive: true });
    fs.writeFileSync(native, '');
    fs.writeFileSync(path.join(data, 'cores', 'kimi', 'manifest.json'), JSON.stringify({ version: '2.1.1', binary: 'kimi.exe' }));
    const script = path.join(data, 'cores', 'qwen', '1.0.0', 'package', 'cli-entry.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, '');
    fs.writeFileSync(path.join(data, 'cores', 'qwen', 'manifest.json'), JSON.stringify({ version: '1.0.0', binary: 'package/cli-entry.js', runner: 'node' }));
    const cores = manager({ data, home });
    const dir = cores.terminalShims(path.join(data, 'terminal-bin'));
    assert.deepEqual(fs.readdirSync(dir).sort(), ['kimi.cmd', 'qwen.cmd']);
    const kimi = fs.readFileSync(path.join(dir, 'kimi.cmd'), 'utf8');
    assert.match(kimi, /^@echo off\r\n/);
    assert.ok(kimi.includes(`"${native}" %*\r\n`), kimi);
    const qwen = fs.readFileSync(path.join(dir, 'qwen.cmd'), 'utf8');
    assert.ok(qwen.includes(`"C:\\Program Files\\nodejs\\node.exe" "${script}" %*\r\n`), qwen);
    assert.doesNotMatch(qwen, /ELECTRON_RUN_AS_NODE/, 'only set when the Node is this app\'s Electron');
    assert.doesNotMatch(qwen, /#!\/bin\/sh/);
    fs.writeFileSync(path.join(dir, 'stale.cmd'), 'x');
    cores.terminalShims(dir);
    assert.equal(fs.existsSync(path.join(dir, 'stale.cmd')), false);
    assert.equal(fs.existsSync(path.join(dir, 'kimi.cmd')), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('codexBinary splits CODE_DESKTOP_CORE_SYSTEM_PATHS on ";" on Windows', () => {
  const { codexBinary } = require('../electron/codex.cjs');
  const root = tmp('win-codexbin-');
  try {
    const exe = path.join(root, 'codex.exe');
    fs.writeFileSync(exe, '');
    assert.equal(codexBinary({ platform: 'win32', env: { CODE_DESKTOP_CORE_SYSTEM_PATHS: `${path.join(root, 'nope.exe')};${exe}` } }), exe);
    assert.equal(codexBinary({ platform: 'darwin', env: { CODE_DESKTOP_CORE_SYSTEM_PATHS: `${path.join(root, 'nope')}:${exe}` } }), exe);
    assert.equal(codexBinary({ platform: 'win32', env: { CODE_DESKTOP_CORE_SYSTEM_PATHS: '' } }), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
