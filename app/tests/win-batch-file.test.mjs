// R10 (docs/windows-bugs.md): cmd.exe reads a batch file in the console code page (936 on Chinese Windows), so the
// .cmd files the app writes never carry a non-ASCII path as UTF-8 text the console would misread.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { batchValue, batchPath, batchFile } = require('../electron/batch-file.cjs');
const { createCoreManager } = require('../electron/core-manager.cjs');
const { installNativeHost } = require('../electron/browser/install.cjs');
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const env = { USERPROFILE: 'C:\\Users\\张三', APPDATA: 'C:\\Users\\张三\\AppData\\Roaming', LOCALAPPDATA: 'C:\\Users\\张三\\AppData\\Local' };
const ascii = /^[\x00-\x7f]*$/;

test('batchValue: ASCII stays literal; a non-ASCII profile path goes through the longest profile variable', () => {
  assert.equal(batchValue('C:\\Program Files\\100%\\node.exe', env), 'C:\\Program Files\\100%%\\node.exe');
  assert.equal(batchValue('C:\\Users\\张三\\AppData\\Roaming\\OpenClaude Desktop\\cores\\q.js', env), '%APPDATA%\\OpenClaude Desktop\\cores\\q.js');
  assert.equal(batchValue('c:/users/张三/AppData/Local/Programs/OpenClaude Desktop/OpenClaude Desktop.exe', env), '%LOCALAPPDATA%/Programs/OpenClaude Desktop/OpenClaude Desktop.exe', 'case- and separator-insensitive');
  assert.equal(batchValue('C:\\Users\\张三\\Downloads\\100%\\a.exe', env), '%USERPROFILE%\\Downloads\\100%%\\a.exe');
  assert.equal(batchValue('C:\\Users\\张三四\\a.exe', env), 'C:\\Users\\张三四\\a.exe', 'a longer name is not the profile');
  assert.equal(batchPath('C:\\Users\\张三\\a.exe', env), '"%USERPROFILE%\\a.exe"');
});

test('batchFile: an ASCII file is unchanged; anything still non-ASCII runs under chcp 65001, the code page restored', () => {
  assert.equal(batchFile(['@echo off', 'setlocal', '"C:\\a.exe" %*']), '@echo off\r\nsetlocal\r\n"C:\\a.exe" %*\r\n');
  const text = batchFile(['@echo off', 'rem x', 'setlocal', 'set ELECTRON_RUN_AS_NODE=1', '"D:\\工具\\a.exe" %*']);
  const lines = text.split('\r\n');
  assert.deepEqual(lines.slice(0, 5), ['@echo off', 'rem x', 'setlocal', 'for /f "tokens=2 delims=:." %%c in (\'chcp\') do set "CODE_DESKTOP_CP=%%c"', 'chcp 65001 >nul']);
  assert.ok(lines.indexOf('"D:\\工具\\a.exe" %*') > lines.indexOf('chcp 65001 >nul'), 'the path is read after the switch');
  assert.deepEqual(lines.slice(-4), ['set "CODE_DESKTOP_EXIT=%ERRORLEVEL%"', 'if defined CODE_DESKTOP_CP chcp %CODE_DESKTOP_CP% >nul', 'exit /b %CODE_DESKTOP_EXIT%', '']);
  assert.ok(ascii.test(lines.slice(0, 5).join('')), 'everything before the switch is ASCII');
  assert.match(batchFile(['@echo off', '"D:\\工具\\a.exe"']), /^@echo off\r\nsetlocal\r\n/, 'setlocal added when missing');
});

function chineseProfile() {
  const root = tmp('win-batch-cn-');
  const profile = path.join(root, '张三');
  return { root, profile, env: { USERPROFILE: profile, APPDATA: path.join(profile, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(profile, 'AppData', 'Local') } };
}

test('terminal shims under a Chinese user name: ASCII files naming the paths through %APPDATA% / %LOCALAPPDATA%', () => {
  const { root, env: shimEnv } = chineseProfile();
  try {
    const data = path.join(shimEnv.APPDATA, 'OpenClaude Desktop');
    const script = path.join(data, 'cores', 'qwen', '1.0.0', 'package', 'cli-entry.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, '');
    fs.writeFileSync(path.join(data, 'cores', 'qwen', 'manifest.json'), JSON.stringify({ version: '1.0.0', binary: 'package/cli-entry.js', runner: 'node' }));
    const node = path.join(shimEnv.LOCALAPPDATA, 'Programs', 'OpenClaude Desktop', 'node.exe');
    const shims = (nodeBinary) => createCoreManager({ dataDir: () => data, getConfig: () => ({}), save: () => {}, home: shimEnv.USERPROFILE, env: shimEnv, platform: 'win32', arch: 'x64', nodeBinary,
      fetchImpl: () => { throw new Error('no network'); } }).terminalShims(path.join(data, 'terminal-bin'));
    let qwen = fs.readFileSync(path.join(shims(() => node), 'qwen.cmd'), 'utf8');
    assert.ok(ascii.test(qwen), qwen);
    assert.ok(qwen.includes(`"%LOCALAPPDATA%${node.slice(shimEnv.LOCALAPPDATA.length)}" "%APPDATA%${script.slice(shimEnv.APPDATA.length)}" %*\r\n`), qwen);
    assert.doesNotMatch(qwen, /chcp/, 'no code page change when the variables cover it');
    // A Node outside the profile, in a non-ASCII folder: the file switches to UTF-8 before that line.
    qwen = fs.readFileSync(path.join(shims(() => 'D:\\工具\\node.exe'), 'qwen.cmd'), 'utf8');
    assert.ok(qwen.indexOf('chcp 65001 >nul') > 0 && qwen.indexOf('chcp 65001 >nul') < qwen.indexOf('D:\\工具\\node.exe'), qwen);
    assert.match(qwen, /exit \/b %CODE_DESKTOP_EXIT%\r\n$/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('the Chrome host launcher under a Chinese user name is ASCII too', () => {
  const dir = tmp('win-chrome-cn-');
  try {
    const app = 'C:\\Users\\张三\\AppData\\Local\\Programs\\OpenClaude Desktop';
    const { launcherPath } = installNativeHost({ platform: 'win32', manifestDir: dir, launcherPath: path.join(dir, 'native-host.cmd'), env, registry: () => {},
      runtime: `${app}\\OpenClaude Desktop.exe`, hostScript: `${app}\\resources\\app.asar\\electron\\browser\\native-host.cjs`, socketDir: 'C:\\Users\\张三\\AppData\\Roaming\\OpenClaude Desktop\\b' });
    const launcher = fs.readFileSync(launcherPath, 'utf8');
    assert.ok(ascii.test(launcher), launcher);
    assert.ok(launcher.includes('set "OPENCLAUDE_CHROME_BRIDGE_DIR=%APPDATA%\\OpenClaude Desktop\\b"'), launcher);
    assert.ok(launcher.includes('"%LOCALAPPDATA%\\Programs\\OpenClaude Desktop\\OpenClaude Desktop.exe" "%LOCALAPPDATA%\\Programs\\OpenClaude Desktop\\resources\\app.asar\\electron\\browser\\native-host.cjs" %*\r\n'), launcher);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
