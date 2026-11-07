// The bridges' Windows process helpers (src/win-process.js, one copy per bridge). Everything runs with an injected
// platform / file check / spawn, so nothing here starts a process or needs Windows.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { EventEmitter } from 'node:events'
import {
  escapeArgument, isOwnElectron, killTree, launchEnv, npmShimTarget, parentWatch, platformSpawn, POWERSHELL_PREAMBLE,
  resolveWindowsCommand, windowsPowerShell, windowsShell, windowsSpawn,
} from '../packages/acp-bridge/src/win-process.js'

const COPIES = ['acp-bridge', 'opencode-bridge', 'zcode-bridge'].map((name) => new URL(`../packages/${name}/src/win-process.js`, import.meta.url))
const FILES = new Set(['C:\\npm\\npx.cmd', 'C:\\Tools\\rg.exe', 'D:\\w\\node_modules\\.bin\\tsc.cmd', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'])
const exists = (file) => FILES.has(file)
const ENV = { Path: 'C:\\Windows;"C:\\npm";C:\\Tools', PATHEXT: '.COM;.EXE;.BAT;.CMD' }

test('every bridge carries the same win-process.js (a bridge ships alone, so none imports another)', () => {
  const [first, ...rest] = COPIES.map((url) => fs.readFileSync(url, 'utf8'))
  for (const text of rest) assert.equal(text, first)
})

test('resolveWindowsCommand: PATH (spelled Path, quoted dirs) × PATHEXT, relative and absolute names', () => {
  assert.equal(resolveWindowsCommand('npx', { env: ENV, exists }), 'C:\\npm\\npx.cmd')
  assert.equal(resolveWindowsCommand('rg', { env: ENV, exists }), 'C:\\Tools\\rg.exe')
  assert.equal(resolveWindowsCommand('rg.exe', { env: ENV, exists }), 'C:\\Tools\\rg.exe')
  assert.equal(resolveWindowsCommand('node_modules\\.bin\\tsc', { env: ENV, cwd: 'D:\\w', exists }), 'D:\\w\\node_modules\\.bin\\tsc.cmd')
  assert.equal(resolveWindowsCommand('C:/npm/npx', { env: ENV, exists }), 'C:\\npm\\npx.cmd')
  assert.equal(resolveWindowsCommand('missing', { env: ENV, exists }), null)
  assert.equal(resolveWindowsCommand('', { env: ENV, exists }), null)
})

test('windowsSpawn: an .exe runs directly, a .cmd under cmd.exe with cross-spawn escaping; unchanged off Windows', () => {
  const exe = windowsSpawn('rg', ['x'], { env: ENV }, { platform: 'win32', exists })
  assert.equal(exe.command, 'C:\\Tools\\rg.exe')
  assert.deepEqual(exe.args, ['x'])
  assert.equal(exe.options.windowsHide, true)
  assert.equal(exe.options.windowsVerbatimArguments, undefined)

  const cmd = windowsSpawn('npx', ['-y', 'a b&c'], { env: { ...ENV, ComSpec: 'C:\\Windows\\System32\\cmd.exe' } }, { platform: 'win32', exists })
  assert.equal(cmd.command, 'C:\\Windows\\System32\\cmd.exe')
  assert.deepEqual(cmd.args, ['/d', '/s', '/c', '"C:\\npm\\npx.cmd ^"-y^" ^"a^ b^&c^""'])
  assert.equal(cmd.options.windowsVerbatimArguments, true)
  assert.equal(cmd.options.windowsHide, true)

  // A node_modules\.bin shim re-parses its arguments: they are escaped twice.
  const shim = windowsSpawn('node_modules\\.bin\\tsc', ['%P%'], { env: ENV, cwd: 'D:\\w' }, { platform: 'win32', exists })
  assert.equal(shim.args[3], '"D:\\w\\node_modules\\.bin\\tsc.cmd ^^^"^^^%P^^^%^^^""')

  // Unknown name: passed through, so spawn still reports ENOENT.
  assert.equal(windowsSpawn('nope', [], { env: ENV }, { platform: 'win32', exists }).command, 'nope')

  const mac = windowsSpawn('npx', ['-y'], { env: ENV }, { platform: 'darwin', exists })
  assert.deepEqual(mac, { command: 'npx', args: ['-y'], options: { env: ENV } })
})

test('escapeArgument: quotes, trailing backslashes and cmd metacharacters', () => {
  assert.equal(escapeArgument('say "hi"'), '^"say^ \\^"hi\\^"^"')
  assert.equal(escapeArgument('a\\'), '^"a\\\\^"')
  assert.equal(escapeArgument('plain'), '^"plain^"')
})

test('launchEnv / isOwnElectron: ELECTRON_RUN_AS_NODE only for this same Electron; untouched without Electron', () => {
  const deps = { electron: '39.0.0', execPath: 'C:\\Program Files\\OpenClaude\\OpenClaude.exe', platform: 'win32' }
  assert.equal(isOwnElectron('c:/program files/openclaude/openclaude.exe', deps), true)
  assert.equal(isOwnElectron('C:\\Tools\\rg.exe', deps), false)
  assert.equal(isOwnElectron(deps.execPath, { ...deps, electron: undefined }), false)
  const env = { ELECTRON_RUN_AS_NODE: '1', PATH: 'x' }
  assert.deepEqual(launchEnv('C:\\Tools\\electron.exe', env, deps), { PATH: 'x' })
  assert.deepEqual(launchEnv(deps.execPath, { PATH: 'x' }, deps), { PATH: 'x', ELECTRON_RUN_AS_NODE: '1' })
  assert.equal(launchEnv('anything', env, { electron: '' }), env)
  // platformSpawn: the env first, then the Windows resolution.
  const launch = platformSpawn('rg', [], { env: { ...ENV, ELECTRON_RUN_AS_NODE: '1' } }, { ...deps, exists })
  assert.equal(launch.command, 'C:\\Tools\\rg.exe')
  assert.equal('ELECTRON_RUN_AS_NODE' in launch.options.env, false)
})

test('killTree: taskkill /T /F on Windows (no signal), nothing for a bad pid', () => {
  const calls = []
  const run = (...args) => { calls.push(args.slice(0, 3)) }
  assert.equal(killTree(1234, 'SIGKILL', { platform: 'win32', run }), true)
  assert.deepEqual(calls, [['taskkill', ['/pid', '1234', '/T', '/F'], { windowsHide: true }]])
  assert.equal(killTree(0, 'SIGKILL', { platform: 'win32', run }), false)
  assert.equal(killTree(-5, 'SIGKILL', { platform: 'win32', run }), false)
  assert.equal(calls.length, 1)
})

test('windowsPowerShell / windowsShell: pwsh 7 first, else Windows PowerShell 5.1, with Bypass and the UTF-8 preamble', () => {
  const env = { ProgramFiles: 'C:\\Program Files', SystemRoot: 'C:\\Windows', Path: 'C:\\Windows' }
  assert.equal(windowsPowerShell({ env, exists }), 'C:\\Program Files\\PowerShell\\7\\pwsh.exe')
  assert.equal(windowsPowerShell({ env, exists: () => false }), 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')
  assert.equal(windowsPowerShell({ env: { ...env, ProgramFiles: 'E:\\PF', Path: 'E:\\pw' }, exists: (file) => file === 'E:\\pw\\pwsh.exe' }), 'E:\\pw\\pwsh.exe')
  const shell = windowsShell('git status', { env, exists })
  assert.equal(shell.command, 'C:\\Program Files\\PowerShell\\7\\pwsh.exe')
  assert.deepEqual(shell.args.slice(0, 6), ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command'])
  assert.equal(shell.args[6], `${POWERSHELL_PREAMBLE}git status`)
})

test('npmShimTarget: both cmd-shim forms, executables, non-shims and missing targets', () => {
  const modern = '@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n"%_prog%"  "%dp0%\\node_modules\\@google\\gemini-cli\\dist\\index.js" %*\r\n'
  const old = '@IF EXIST "%~dp0\\node.exe" (\r\n  "%~dp0\\node.exe"  "%~dp0\\node_modules\\kimi\\cli.js" %*\r\n)'
  const binary = '"%dp0%\\node_modules\\zcode\\bin\\zcode.exe" %*'
  const files = new Set(['C:\\npm\\node_modules\\@google\\gemini-cli\\dist\\index.js', 'C:\\npm\\node_modules\\kimi\\cli.js', 'C:\\npm\\node_modules\\zcode\\bin\\zcode.exe'])
  const texts = { 'C:\\npm\\gemini.cmd': modern, 'C:\\npm\\kimi.cmd': old, 'C:\\npm\\zcode.cmd': binary, 'C:\\npm\\other.cmd': '@echo hi' }
  const read = (file) => { if (!(file in texts)) throw new Error('ENOENT'); return texts[file] }
  const deps = { read, exists: (file) => files.has(file) }
  assert.deepEqual(npmShimTarget('C:\\npm\\gemini.cmd', deps), { file: 'C:\\npm\\node_modules\\@google\\gemini-cli\\dist\\index.js', node: true })
  assert.deepEqual(npmShimTarget('C:\\npm\\kimi.cmd', deps), { file: 'C:\\npm\\node_modules\\kimi\\cli.js', node: true })
  assert.deepEqual(npmShimTarget('C:\\npm\\zcode.cmd', deps), { file: 'C:\\npm\\node_modules\\zcode\\bin\\zcode.exe', node: false })
  assert.equal(npmShimTarget('C:\\npm\\other.cmd', deps), null)
  assert.equal(npmShimTarget('C:\\npm\\gone.cmd', deps), null)
  assert.equal(npmShimTarget('C:\\npm\\gemini.exe', deps), null)
  assert.equal(npmShimTarget('C:\\npm\\gemini.cmd', { read, exists: () => false }), null)
})

const fakeChild = () => {
  const child = new EventEmitter()
  child.lines = []
  child.stdin = Object.assign(new EventEmitter(), { write: (line) => child.lines.push(line), unref: () => { child.stdinUnref = true } })
  child.unref = () => { child.unref = true }
  return child
}

test('parentWatch: one hidden, unref\'d sentinel on Windows, fed +pid / -pid; a no-op elsewhere', () => {
  const spawned = []
  const child = fakeChild()
  const spawn = (...args) => { spawned.push(args); return child }
  const watch = parentWatch({ platform: 'win32', execPath: 'C:\\App\\App.exe', electron: '39.0.0', spawn })
  assert.equal(spawned.length, 0, 'nothing starts before the first watch')
  watch.unwatch(10)
  watch.watch(10)
  watch.watch(11)
  watch.unwatch(10)
  watch.watch(-1)
  assert.equal(spawned.length, 1)
  const [command, args, options] = spawned[0]
  assert.equal(command, 'C:\\App\\App.exe')
  assert.equal(args[0], '-e')
  assert.match(args[1], /taskkill/)
  assert.equal(options.windowsHide, true)
  assert.equal(options.env.ELECTRON_RUN_AS_NODE, '1')
  assert.deepEqual(options.stdio, ['pipe', 'ignore', 'ignore'])
  assert.deepEqual(child.lines, ['+10\n', '+11\n', '-10\n'])
  assert.equal(child.stdinUnref, true)
  assert.equal(watch.process, child)

  // A failed start never retries (and never throws).
  const failing = parentWatch({ platform: 'win32', execPath: 'x', spawn: () => { throw new Error('EPERM') } })
  failing.watch(5); failing.watch(6)
  assert.equal(failing.process, null)

  const mac = parentWatch({ platform: 'darwin', spawn: () => assert.fail('no sentinel off Windows') })
  mac.watch(10); mac.unwatch(10)
  assert.equal(mac.process, null)
})

test('the sentinel script parses as JavaScript and ends every still-listed tree when its stdin ends', async () => {
  const child = fakeChild()
  parentWatch({ platform: 'win32', execPath: 'x', electron: '', spawn: (...args) => { child.args = args; return child } }).watch(1)
  const source = child.args[1][1]
  // Run it against a fake process / require: taskkill calls are recorded instead of made.
  const killed = []
  const stdin = new EventEmitter()
  stdin.setEncoding = () => {}
  const fakeProcess = { stdin, exit: (code) => { killed.push(`exit ${code}`) } }
  const fakeRequire = () => ({ execFileSync: (file, args) => { killed.push(`${file} ${args.join(' ')}`) } })
  new Function('process', 'require', source)(fakeProcess, fakeRequire)
  stdin.emit('data', '+10\n+11\n-1')
  stdin.emit('data', '0\n+12\n')
  stdin.emit('end')
  stdin.emit('close')
  assert.deepEqual(killed, ['taskkill /pid 11 /T /F', 'taskkill /pid 12 /T /F', 'exit 0'])
})
