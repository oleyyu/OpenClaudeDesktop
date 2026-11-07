// Windows logic in the DeepSeek core layer and the bridges, run with an injected platform (nothing is spawned).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import CodeDesktopSandbox from '../packages/codex-app-server/src/sandbox-shell.js'
import { dropsRunAsNode, installUserCommandEnv, runsOnElectron, userCommandSpec, wrapSubprocessService } from '../packages/codex-app-server/src/subprocess-env.js'
import { coreSettingsRead, coreSettingsWrite, sourceNs } from '../packages/codex-app-server/src/core-settings.js'
import { cwdKey } from '../packages/codex-app-server/src/list.js'
import { SHELL_TOOLS } from '../packages/codex-app-server/src/jobs.js'
import { runAsNodeLauncher, withRunAsNodeInCommand } from '../packages/acp-bridge/src/app-tools.js'
import { agentProgram } from '../packages/acp-bridge/src/agents/index.js'
import { uriPath } from '../packages/acp-bridge/src/input.js'
import { BridgeConfig } from '../packages/opencode-bridge/src/config.js'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { decide, defaultPermission, modeGrantRules } from '../packages/opencode-bridge/src/policy.js'

test('sandbox-shell: on Windows a command runs as given (no ACL runner); macOS still goes through Seatbelt', async () => {
  const sandbox = Object.create(CodeDesktopSandbox.prototype)
  sandbox.internals = { platform: 'win32' }
  sandbox.selectRunner = () => assert.fail('no runner is chosen on Windows')
  const argv = ['pwsh.exe', '-Command', 'npm test']
  for (const mode of ['read-only', 'workspace-write']) {
    const confined = await sandbox.confine(argv, { mode, workspaceRoot: 'C:\\Users\\me' })
    assert.deepEqual(confined.argv, argv)
    assert.notEqual(confined.argv, argv, 'a copy, not the caller\'s array')
    assert.equal(confined.enforcement, 'full')
    assert.deepEqual(confined.denialSignatures, [])
  }
  const aborted = AbortSignal.abort()
  await assert.rejects(sandbox.confine(argv, { mode: 'read-only' }, aborted))

  const mac = Object.create(CodeDesktopSandbox.prototype)
  mac.internals = { platform: 'darwin' }
  mac.selectRunner = () => ({ runner: 'seatbelt', enforcement: 'full' })
  mac.seatbeltExec = () => '/usr/bin/sandbox-exec'
  assert.equal((await mac.confine(['bash', '-c', 'ls'], { mode: 'read-only', workspaceRoot: os.tmpdir() })).argv[0], '/usr/bin/sandbox-exec')
})

test('SHELL_TOOLS covers the Windows pwsh tool', () => {
  assert.equal(SHELL_TOOLS.has('bash'), true)
  assert.equal(SHELL_TOOLS.has('pwsh'), true)
})

test('subprocess-env: user commands lose ELECTRON_RUN_AS_NODE, this Electron and explicit specs keep it', () => {
  const deps = { execPath: 'C:\\App\\OpenClaude.exe', platform: 'win32' }
  assert.equal(dropsRunAsNode({ argv: ['pwsh.exe', '-Command', 'electron .'] }, deps), true)
  assert.equal(dropsRunAsNode({ argv: ['c:/app/openclaude.exe', 'runner.js'] }, deps), false)
  assert.equal(dropsRunAsNode({ argv: ['node'], env: { electron_run_as_node: '1' } }, deps), false)
  const spec = { argv: ['pwsh.exe'], env: { A: '1' } }
  const out = userCommandSpec(spec, deps)
  assert.deepEqual(Object.keys(out.env), ['A', 'ELECTRON_RUN_AS_NODE'])
  assert.equal(out.env.ELECTRON_RUN_AS_NODE, undefined)
  assert.equal(Object.hasOwn(out.env, 'ELECTRON_RUN_AS_NODE'), true, 'an explicit undefined: the tombstone')
  assert.equal(spec.env.ELECTRON_RUN_AS_NODE, undefined)
  assert.equal(Object.hasOwn(spec.env, 'ELECTRON_RUN_AS_NODE'), false, 'the caller\'s spec is not changed')

  assert.equal(runsOnElectron({ ELECTRON_RUN_AS_NODE: '1' }, { electron: '39.0.0' }), true)
  assert.equal(runsOnElectron({ ELECTRON_RUN_AS_NODE: '1' }, {}), false)
  assert.equal(runsOnElectron({}, { electron: '39.0.0' }), false)

  // The service's spawn / spawnTerminal see the tombstone; undo restores the methods.
  const seen = []
  class Service { spawn(spec) { seen.push(['spawn', spec]); return 1 } spawnTerminal(spec) { seen.push(['terminal', spec]); return 2 } }
  const service = new Service()
  const undo = wrapSubprocessService(service, deps)
  assert.equal(service.spawn({ argv: ['git', 'status'] }), 1)
  assert.equal(service.spawnTerminal({ argv: ['C:\\App\\OpenClaude.exe'] }), 2)
  assert.equal(Object.hasOwn(seen[0][1].env, 'ELECTRON_RUN_AS_NODE'), true)
  assert.equal(seen[1][1].env, undefined)
  undo()
  assert.equal(Object.hasOwn(service, 'spawn'), false)
  assert.equal(service.spawn, Service.prototype.spawn)

  // Not on Electron: nothing is injected.
  let injected = false
  installUserCommandEnv({ inject: () => { injected = true } }, { env: {}, versions: {} })
  assert.equal(injected, false)
})

const fakeSettings = () => {
  const forms = [
    { ns: 'pwsh-sandbox', value: { timeoutMs: 600000 }, user: {}, base: { timeoutMs: 600000 }, revision: 3 },
    { ns: 'bash-sandbox', value: { timeoutMs: 1 }, user: {}, base: {}, revision: 1 },
  ]
  const mutations = []
  return { writable: true, describe: () => forms, mutate: async (...args) => { mutations.push(args) }, mutations }
}

test('core-settings: the shell rows read and write pwsh-sandbox on Windows, under the name the app knows', async () => {
  assert.equal(sourceNs({ ns: 'bash-sandbox' }, 'win32'), 'pwsh-sandbox')
  assert.equal(sourceNs({ ns: 'bash-sandbox' }, 'darwin'), 'bash-sandbox')
  assert.equal(sourceNs({ ns: 'subagent' }, 'win32'), 'subagent')
  const settings = fakeSettings()
  const timeout = coreSettingsRead(settings, { platform: 'win32' }).settings.find((row) => row.key === 'timeoutMs')
  assert.equal(timeout.ns, 'bash-sandbox')
  assert.equal(timeout.value, 600000)
  assert.equal(coreSettingsRead(settings, { platform: 'darwin' }).settings.find((row) => row.key === 'timeoutMs').value, 1)
  await coreSettingsWrite(settings, { ns: 'bash-sandbox', key: 'timeoutMs', value: 120000 }, { platform: 'win32' })
  assert.deepEqual(settings.mutations[0], ['pwsh-sandbox', [{ op: 'set', path: ['timeoutMs'], value: 120000 }], 3])
})

test('cwdKey: Windows folders compare case- and separator-insensitively; other platforms exactly', () => {
  assert.equal(cwdKey('C:/Users/Me/Proj/', 'win32'), cwdKey('c:\\users\\me\\proj', 'win32'))
  assert.equal(cwdKey('C:\\', 'win32'), 'c:\\')
  assert.notEqual(cwdKey('C:\\a', 'win32'), cwdKey('C:\\ab', 'win32'))
  assert.equal(cwdKey('/Users/Me/', 'darwin'), '/Users/Me/')
  assert.equal(cwdKey(undefined, 'win32'), undefined)
})

test('app-tools: Windows carries ELECTRON_RUN_AS_NODE in a .cmd launcher; macOS in /usr/bin/env', () => {
  const entry = { command: 'C:\\App\\OpenClaude.exe', args: ['C:\\App\\tools.js'], env: { ELECTRON_RUN_AS_NODE: '1', TOKEN: 't' } }
  const writes = []
  const write = (dir, value) => { writes.push([dir, value]); return `${dir}\\code-desktop-run-as-node.cmd` }
  const win = withRunAsNodeInCommand(entry, 'win32', { launcherDir: 'C:\\state', write })
  // R10: the app's path rides in the server's env, not in the batch file (cmd.exe decodes that in the console code page).
  assert.deepEqual(win, { command: 'C:\\state\\code-desktop-run-as-node.cmd', args: ['C:\\App\\tools.js'], env: { TOKEN: 't', CODE_DESKTOP_RUN_AS_NODE_PROGRAM: 'C:\\App\\OpenClaude.exe' } })
  assert.deepEqual(writes, [['C:\\state', '1']])
  assert.equal(withRunAsNodeInCommand(entry, 'win32'), entry, 'no launcher folder: unchanged')
  assert.equal(withRunAsNodeInCommand(entry, 'win32', { launcherDir: 'C:\\state', write: () => { throw new Error('EACCES') } }), entry)
  const mac = withRunAsNodeInCommand({ ...entry, command: '/Applications/A.app/A' }, 'darwin')
  assert.deepEqual(mac.args, ['ELECTRON_RUN_AS_NODE=1', '/Applications/A.app/A', 'C:\\App\\tools.js'])
  assert.equal(mac.command, '/usr/bin/env')
  assert.equal(runAsNodeLauncher(), '@echo off\r\nif not defined CODE_DESKTOP_RUN_AS_NODE_PROGRAM (echo CODE_DESKTOP_RUN_AS_NODE_PROGRAM is not set. 1>&2 & exit /b 1)\r\nset "ELECTRON_RUN_AS_NODE=1"\r\n"%CODE_DESKTOP_RUN_AS_NODE_PROGRAM%" %*\r\n')
})

test('R10: the Windows launcher is pure ASCII wherever the app lives (a Chinese user name, a 100% folder)', async () => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'cd-launcher-张三-'))
  try {
    for (const command of ['C:\\Users\\张三\\Downloads\\OpenClaude Desktop\\OpenClaude Desktop.exe', 'D:\\100%\\Ünïcødé\\A.exe']) {
      const entry = withRunAsNodeInCommand({ command, args: ['C:\\Users\\张三\\tools.js'], env: { ELECTRON_RUN_AS_NODE: '1' } }, 'win32', { launcherDir: dir })
      assert.equal(entry.env.CODE_DESKTOP_RUN_AS_NODE_PROGRAM, command)
      assert.equal('ELECTRON_RUN_AS_NODE' in entry.env, false)
      assert.deepEqual(entry.args, ['C:\\Users\\张三\\tools.js'], 'arguments reach it on the (Unicode) command line')
      const text = await readFile(entry.command, 'utf8')
      assert.match(text, /^[\x00-\x7f]*$/, 'no byte a code page could misread')
      assert.equal(text, runAsNodeLauncher('1'), 'one launcher for every app location')
    }
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('acp agentProgram: an npm .cmd agent runs its script under Node on Windows', () => {
  const shimTarget = (file) => (file === 'C:\\npm\\gemini.cmd' ? { file: 'C:\\npm\\node_modules\\gemini\\index.js', node: true } : null)
  const program = agentProgram({ CODE_DESKTOP_AGENT_BINARY: 'C:\\npm\\gemini.cmd' }, null, { platform: 'win32', shimTarget })
  assert.equal(program.binary, 'C:\\npm\\node_modules\\gemini\\index.js')
  assert.equal(program.runner, 'node')
  // An explicit runner, or macOS: left alone.
  assert.equal(agentProgram({ CODE_DESKTOP_AGENT_BINARY: 'C:\\npm\\gemini.cmd', CODE_DESKTOP_AGENT_RUNNER: 'x' }, null, { platform: 'win32', shimTarget }).binary, 'C:\\npm\\gemini.cmd')
  assert.equal(agentProgram({ CODE_DESKTOP_AGENT_BINARY: 'C:\\npm\\gemini.cmd' }, null, { platform: 'darwin', shimTarget }).binary, 'C:\\npm\\gemini.cmd')
  // Not a recognised shim: the .cmd stays (it then runs through cmd.exe).
  assert.equal(agentProgram({ CODE_DESKTOP_AGENT_BINARY: 'C:\\npm\\other.cmd' }, null, { platform: 'win32', shimTarget }).binary, 'C:\\npm\\other.cmd')
})

test('acp uriPath: file URIs become native paths', () => {
  assert.equal(uriPath(pathToFileURL(path.join(os.tmpdir(), 'a b.txt')).href), path.join(os.tmpdir(), 'a b.txt'))
  assert.equal(uriPath('https://example.com/x/y'), '/x/y')
})

test('opencode BridgeConfig: no Seatbelt shell wrapper and no SHELL override on Windows', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'win-oc-'))
  try {
    const config = new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: path.join(home, 'state'), env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh' }, platform: 'win32' })
    assert.equal(config.shellPath, null)
    assert.equal(config.writeShell(), null)
    assert.equal('shell' in config.overlay(), false)
    const env = config.write()
    assert.equal(env.SHELL, undefined)
    assert.equal(fs.existsSync(path.join(home, 'state', 'runtime', 'shell', 'sh')), false)
    const mac = new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: path.join(home, 'mac'), env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh' }, platform: 'darwin' })
    assert.equal(typeof mac.overlay().shell, 'string')
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('opencode policy: without a sandbox a read-only mode asks for each command; Auto still runs them', () => {
  const state = (mode) => ({ ...defaultPermission(), mode })
  const bash = { permission: 'bash', patterns: ['ls'] }
  const options = { tool: 'bash', readTools: ['read'], cwd: 'C:\\w', sandboxed: false }
  for (const mode of ['plan', 'chat', 'review']) {
    assert.equal(decide(state(mode), bash, options).action, 'ask', mode)
    assert.equal(decide(state(mode), bash, { ...options, sandboxed: true }).action, 'allow', mode)
    assert.deepEqual(modeGrantRules(state(mode), [], { sandboxed: false }), [])
    assert.equal(modeGrantRules(state(mode), [], { sandboxed: true }).length, 1)
  }
  assert.equal(decide(state('plan'), { permission: 'external_directory', patterns: ['D:\\x\\*'] }, options).action, 'ask')
  assert.equal(decide(state('auto'), bash, options).action, 'allow')
  assert.equal(decide(state('ask'), bash, options).action, 'ask')
})
