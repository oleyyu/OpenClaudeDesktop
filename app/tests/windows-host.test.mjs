// The Windows build's host adaptations, checked on any platform through their platform parameters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { hostPath, splitHostPath } = require('../electron/host-path.cjs');
const { windowsShellArgs, resolveShell } = require('../electron/terminal-service.cjs');
const { nodeCandidates, createNodeResolver } = require('../electron/setup-requirements.cjs');
const { editorApp, EDITORS } = require('../electron/editors.cjs');
const { platformChrome, windowsTitleBarOverlay, windowBackground } = require('../electron/window-chrome.cjs');

test('hostPath: ";" on Windows, drops the Mac-only POSIX folders and repeats; ":" elsewhere', () => {
  assert.equal(hostPath(['C:\\Users\\u\\.local\\bin', '/opt/homebrew/bin', '/usr/local/bin', 'C:\\Windows;C:\\nodejs;c:\\windows'], { platform: 'win32' }),
    'C:\\Users\\u\\.local\\bin;C:\\Windows;C:\\nodejs');
  assert.equal(hostPath(['/a', undefined, '', '/b:/c'], { platform: 'darwin' }), '/a:/b:/c');
  assert.deepEqual(splitHostPath('C:\\a;D:\\b', { platform: 'win32' }), ['C:\\a', 'D:\\b']);
});

test('Windows terminal: PowerShell and cmd arguments for a tab and for one command', () => {
  assert.deepEqual(windowsShellArgs('C:\\Program Files\\PowerShell\\7\\pwsh.exe'), ['-NoLogo']);
  // One command: -ExecutionPolicy Bypass (npm.ps1 under Restricted) and UTF-8 output (the bridges' preamble; chcp for cmd).
  assert.deepEqual(windowsShellArgs('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', 'git status'), ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); git status']);
  assert.deepEqual(windowsShellArgs('C:\\Windows\\System32\\cmd.exe', 'dir'), ['/d', '/s', '/c', 'chcp 65001>nul & dir']);
  assert.deepEqual(windowsShellArgs('C:\\Windows\\System32\\cmd.exe'), []);
  assert.equal(resolveShell({ platform: 'win32', env: {} }), 'cmd.exe');
});

test('Windows terminal: the one-command PowerShell preamble matches the bridges\' POWERSHELL_PREAMBLE', async () => {
  const fs = await import('node:fs');
  const bridge = fs.readFileSync(new URL('../../harness/packages/opencode-bridge/src/win-process.js', import.meta.url), 'utf8');
  const preamble = bridge.match(/POWERSHELL_PREAMBLE = '([^']*)'/)?.[1];
  assert.ok(preamble, 'the bridge still exports POWERSHELL_PREAMBLE');
  assert.equal(windowsShellArgs('pwsh.exe', 'x').at(-1), `${preamble}x`);
});

const { withPowerShellBypass } = require('../electron/codex.cjs');
test('codex core env: PSExecutionPolicyPreference=Bypass on Windows unless the user set one; nothing elsewhere', () => {
  assert.equal(withPowerShellBypass({ Path: 'C:\\x' }, 'win32').PSExecutionPolicyPreference, 'Bypass');
  assert.deepEqual(withPowerShellBypass({ PSExecutionPolicyPreference: 'AllSigned' }, 'win32'), { PSExecutionPolicyPreference: 'AllSigned' });
  assert.deepEqual(withPowerShellBypass({ psexecutionpolicypreference: 'RemoteSigned' }, 'win32'), { psexecutionpolicypreference: 'RemoteSigned' });
  assert.deepEqual(withPowerShellBypass({ PATH: '/bin' }, 'darwin'), { PATH: '/bin' });
});

const { decodeText, readManagedSettings, MANAGED_FAIL_CLOSED } = require('../electron/text-decode.cjs');
test('text-decode: UTF-8 with or without a BOM, UTF-16LE and UTF-16BE by their BOM', () => {
  const json = '{"disableWorkflows":true,"note":"中文"}';
  assert.equal(decodeText(Buffer.from(json)), json);
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)])), json);
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(json, 'utf16le')])), json);
  assert.equal(decodeText(Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(json, 'utf16le').swap16()])), json);
  assert.equal(decodeText(Buffer.alloc(0)), '');
});

test('managed settings: decoded by BOM; missing is none; present but broken fails closed (workflows off)', () => {
  const file = 'C:\\ProgramData\\OpenClaude Desktop\\managed-settings.json';
  const reading = (bytes) => ({ readFile: () => bytes });
  const json = '{"disableWorkflows":true}\r\n';
  // PowerShell 5.1: Set-Content -Encoding UTF8 (BOM) and Out-File / > (UTF-16LE).
  assert.deepEqual(readManagedSettings(file, reading(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)]))), { value: { disableWorkflows: true }, error: null });
  assert.deepEqual(readManagedSettings(file, reading(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(json, 'utf16le')]))), { value: { disableWorkflows: true }, error: null });
  assert.deepEqual(readManagedSettings(file, reading(Buffer.from('{"enableWorkflows":true}'))), { value: { enableWorkflows: true }, error: null });
  const missing = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  assert.deepEqual(readManagedSettings(file, { readFile: () => { throw missing; } }), { value: {}, error: null });
  for (const bytes of [Buffer.from('{"disableWorkflows": tru'), Buffer.from('[1]'), Buffer.from('null'), Buffer.from([0xfe, 0xff, 0x00])]) {
    const result = readManagedSettings(file, reading(bytes));
    assert.deepEqual(result.value, MANAGED_FAIL_CLOSED);
    assert.ok(result.error);
  }
  const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
  assert.deepEqual(readManagedSettings(file, { readFile: () => { throw denied; } }).value, MANAGED_FAIL_CLOSED);
});

test('Windows Node: the installer, nvm-windows, Volta, Scoop and PATH; the app\'s own Node when none is usable', () => {
  const list = nodeCandidates({ platform: 'win32', home: 'C:\\Users\\u', env: { NVM_HOME: 'C:\\nvm', Path: 'C:\\tools;C:\\Program Files\\nodejs\\' },
    readdir: (dir) => dir === 'C:\\nvm' ? ['v20.1.0', 'v24.2.0', 'settings.txt'] : [] });
  assert.deepEqual(list, ['C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\u\\AppData\\Local\\Programs\\nodejs\\node.exe',
    'C:\\nvm\\v24.2.0\\node.exe', 'C:\\nvm\\v20.1.0\\node.exe', 'C:\\Users\\u\\AppData\\Local\\Volta\\bin\\node.exe',
    'C:\\Users\\u\\scoop\\apps\\nodejs\\current\\node.exe', 'C:\\Users\\u\\scoop\\apps\\nodejs-lts\\current\\node.exe', 'C:\\tools\\node.exe']);
  const bundled = { path: 'C:\\App\\OpenClaude Desktop.exe', version: 'v24.21.0', ok: true, bundled: true };
  const old = createNodeResolver({ candidates: () => ['C:\\old\\node.exe'], exists: () => true, versionOf: () => 'v18.0.0', bundled: () => bundled });
  assert.equal(old.resolve(), bundled);
  const installed = createNodeResolver({ candidates: () => ['C:\\new\\node.exe'], exists: () => true, versionOf: () => 'v22.20.0', bundled: () => bundled });
  assert.equal(installed.resolve().path, 'C:\\new\\node.exe');
  const mac = createNodeResolver({ candidates: () => [], exists: () => false, bundled: () => null });
  assert.equal(mac.resolve(), null);
});

test('Windows editors: found by their exe under LOCALAPPDATA or Program Files', () => {
  const vscode = EDITORS.find((editor) => editor.type === 'vscode'), sublime = EDITORS.find((editor) => editor.type === 'sublime');
  assert.equal(editorApp(vscode, { platform: 'win32', home: 'C:\\Users\\u', exists: (file) => file.endsWith('Programs\\Microsoft VS Code\\Code.exe') }),
    'C:\\Users\\u\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe');
  const saved = process.env.ProgramFiles; process.env.ProgramFiles = 'C:\\Program Files';
  try { assert.equal(editorApp(sublime, { platform: 'win32', home: 'C:\\Users\\u', exists: (file) => file === 'C:\\Program Files\\Sublime Text\\sublime_text.exe' }), 'C:\\Program Files\\Sublime Text\\sublime_text.exe'); }
  finally { if (saved === undefined) delete process.env.ProgramFiles; else process.env.ProgramFiles = saved; }
  assert.equal(editorApp(EDITORS.find((editor) => editor.type === 'nova'), { platform: 'win32', exists: () => true }), null);
});

test('Windows chrome: caption buttons overlay in the window background, nothing extra on macOS', () => {
  assert.deepEqual(platformChrome(false, 'darwin'), {});
  assert.deepEqual(platformChrome(true, 'win32'), { titleBarOverlay: windowsTitleBarOverlay(true), autoHideMenuBar: true });
  assert.equal(windowsTitleBarOverlay(true).color, windowBackground(true));
  assert.equal(windowsTitleBarOverlay(false).height, 40);
});

const { killTree, resolveWindowsCommand, windowsSpawn } = require('../electron/process-tree.cjs');
test('process-tree: taskkill /T /F on Windows, the group or pid elsewhere', () => {
  const calls = [];
  assert.equal(killTree(42, 'SIGTERM', { platform: 'win32', run: (...args) => calls.push(args.slice(0, 2)) }), true);
  assert.deepEqual(calls, [['taskkill', ['/pid', '42', '/T', '/F']]]);
  assert.equal(killTree(0, 'SIGTERM', { platform: 'win32', run: () => calls.push('x') }), false);
});
test('process-tree: .cmd shims run under cmd.exe with escaped arguments; .exe directly; other hosts unchanged', () => {
  const env = { Path: 'C:\\nodejs;C:\\proj\\node_modules\\.bin', PATHEXT: '.COM;.EXE;.BAT;.CMD', ComSpec: 'C:\\Windows\\system32\\cmd.exe' };
  const files = new Set(['C:\\nodejs\\npm.cmd', 'C:\\nodejs\\node.exe', 'C:\\proj\\node_modules\\.bin\\vite.cmd']);
  const exists = (file) => files.has(file);
  assert.equal(resolveWindowsCommand('npm', { env, exists }), 'C:\\nodejs\\npm.cmd');
  assert.equal(resolveWindowsCommand('node', { env, exists }), 'C:\\nodejs\\node.exe');
  assert.equal(resolveWindowsCommand('missing', { env, exists }), null);
  assert.deepEqual(windowsSpawn('git', ['status'], {}, { platform: 'darwin' }), { command: 'git', args: ['status'], options: {} });
});
