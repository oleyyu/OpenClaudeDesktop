// OpenCode 2.x bridge, phase 3: the config overlay (src/v2/config.js — OPENCODE_CONFIG file + OPENCODE_CONFIG_CONTENT,
// never OPENCODE_CONFIG_DIR, GET /api/config entries merged back), the generated v2 plugin (src/v2/plugin.js, imported
// and set up with a fake ctx) and the v2 sandbox wrapper (src/v2/sandbox.js: `sh -n`, and run against a fake
// sandbox-exec when the sandbox lets the test spawn /bin/sh).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'
import { BridgeConfig } from '../packages/opencode-bridge/src/config.js'
import { FAIL_CLOSED_PROFILE, seatbeltProfile } from '../packages/opencode-bridge/src/sandbox.js'
import { BridgeConfigV2, anchorConfig, appToolsEntryV2, mergeConfigEntries, mergeV2, pluginIdOf, providerOverlayV2, toV2Mcp } from '../packages/opencode-bridge/src/v2/config.js'
import { KEPT_INSTRUCTIONS, PLUGIN_ID, pluginSourceV2 } from '../packages/opencode-bridge/src/v2/plugin.js'
import { sandboxFileText, shellWrapperV2, writeSandboxV2 } from '../packages/opencode-bridge/src/v2/sandbox.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-config-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const APP_TOOLS = { CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/app/node', args: ['/app/tools.mjs'], env: { MODE: 'x' } }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/sock', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'secret-token' }

function setup({ env = {}, settings, mcp, providers } = {}) {
  const home = tmp()
  const state = path.join(home, 'state')
  fs.mkdirSync(state, { recursive: true })
  if (settings) fs.writeFileSync(path.join(state, 'settings.json'), JSON.stringify(settings))
  if (mcp) fs.writeFileSync(path.join(state, 'mcp.json'), JSON.stringify(mcp))
  const extra = {}
  if (providers) { extra.CODE_DESKTOP_PROVIDERS_FILE = path.join(home, 'providers.json'); fs.writeFileSync(extra.CODE_DESKTOP_PROVIDERS_FILE, JSON.stringify({ providers })) }
  const config = new BridgeConfigV2({ flavor: OC2, stateDir: state, env: { HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...extra, ...env } })
  return { home, state, config }
}

test('the v2 overlay: OPENCODE_CONFIG + CONTENT in config-v2, never OPENCODE_CONFIG_DIR, v2-native keys', () => {
  const { home, state, config } = setup({
    env: { ...APP_TOOLS, CODE_DESKTOP_PROVIDER_KEY_LOCAL: 'sk-hidden' },
    settings: { disabledSkills: ['secret-skill'], plugins: { installed: ['opencode-foo', 'opencode-off'], disabled: ['opencode-off'] }, coreSettings: { 'websearch.enabled': false } },
    mcp: { servers: { docs: { type: 'remote', url: 'https://docs.example/mcp', enabled: true, oauth: { clientId: 'cid' } }, local: { type: 'local', command: ['/bin/tool', '-x'], enabled: true, timeout: 5000 } }, disabled: ['mine', 'local'] },
    providers: [{ route: 'local', baseURL: 'http://127.0.0.1:1234/', api: 'anthropic-messages', models: ['m1', 'm2'], modelInfo: { m1: { attachment: true, reasoning: true, limit: { context: 1000.5, output: 200 } } } }],
  })
  const env = config.write()
  assert.deepEqual(Object.keys(env).sort(), ['CODE_DESKTOP_AGENT_TOOLS_SOCKET', 'CODE_DESKTOP_AGENT_TOOLS_TOKEN', 'CODE_DESKTOP_OPENCODE_STATE', 'OPENCODE_CONFIG', 'OPENCODE_CONFIG_CONTENT', 'SHELL'])
  assert.equal(env.OPENCODE_CONFIG_DIR, undefined)
  assert.equal(env.OPENCODE_CONFIG, path.join(state, 'config-v2', 'opencode.json'))
  assert.equal(env.SHELL, path.join(state, 'runtime', 'shell-v2', 'zsh'))
  // Not 1.x's overlay folder (correction A4): either generation keeps its own.
  assert.notEqual(path.dirname(env.OPENCODE_CONFIG), new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: state, env: { HOME: home } }).configDir)

  const file = JSON.parse(fs.readFileSync(env.OPENCODE_CONFIG, 'utf8'))
  assert.equal(file.share, 'manual')
  for (const key of ['update', 'autoupdate', 'shell', 'provider', 'permission', 'plugin']) assert.equal(file[key], undefined, key)
  assert.deepEqual(file.providers, {
    local: {
      name: 'local', package: 'aisdk:@ai-sdk/anthropic',
      settings: { baseURL: 'http://127.0.0.1:1234/v1', apiKey: '{env:CODE_DESKTOP_PROVIDER_KEY_LOCAL}' },
      models: {
        // A reasoning model leaves `reasoning` out (v2 then builds the package's default efforts); others have none.
        m1: { name: 'm1', capabilities: { tools: true, temperature: true, input: ['text', 'image'], output: ['text'] }, limit: { context: 1000, output: 200 } },
        m2: { name: 'm2', capabilities: { tools: true, temperature: true, input: ['text'], output: ['text'], reasoning: { supported: false } } },
      },
    },
  })
  assert.deepEqual(file.mcp.servers.docs, { type: 'remote', url: 'https://docs.example/mcp', oauth: { client_id: 'cid' } })
  assert.deepEqual(file.mcp.servers.local, { type: 'local', command: ['/bin/tool', '-x'], disabled: true, timeout: { startup: 5000, catalog: 5000, execution: 5000 } })
  assert.equal(file.mcp.servers.mine, undefined, 'the user\'s own server is disabled by the plugin, not an {enabled:false} entry')
  assert.deepEqual(file.mcp.servers.code_desktop, {
    type: 'local', command: ['/app/node', '/app/tools.mjs'], codemode: false, timeout: { execution: 600000 },
    environment: { MODE: 'x', CODE_DESKTOP_OPENCODE_RUNTIME: path.join(state, 'runtime'), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '{env:CODE_DESKTOP_AGENT_TOOLS_SOCKET}', CODE_DESKTOP_AGENT_TOOLS_TOKEN: '{env:CODE_DESKTOP_AGENT_TOOLS_TOKEN}' },
  })
  assert.deepEqual(file.permissions, [{ action: 'skill', resource: 'secret-skill', effect: 'deny' }])
  assert.deepEqual(file.plugins, ['opencode-foo'])
  assert.equal(file.websearch, false)
  const text = fs.readFileSync(env.OPENCODE_CONFIG, 'utf8')
  assert.ok(!text.includes('sk-hidden') && !text.includes('secret-token'), 'no key or token on disk')

  const content = JSON.parse(env.OPENCODE_CONFIG_CONTENT)
  assert.deepEqual(content, {
    shell: env.SHELL,
    plugins: [{ package: path.join(state, 'opencode-plugin', PLUGIN_ID), options: { state, wrapper: env.SHELL, appTools: { name: 'code_desktop', command: ['/app/node', '/app/tools.mjs'], environment: { MODE: 'x', CODE_DESKTOP_OPENCODE_RUNTIME: path.join(state, 'runtime') }, env: ['CODE_DESKTOP_AGENT_TOOLS_SOCKET', 'CODE_DESKTOP_AGENT_TOOLS_TOKEN'], timeout: { execution: 600000 } } } }],
    experimental: { todo: true },
  })
  assert.ok(!env.OPENCODE_CONFIG_CONTENT.includes('secret-token'))
  // The plugin is a directory module, the wrapper is executable.
  assert.equal(fs.readFileSync(path.join(state, 'opencode-plugin', PLUGIN_ID, 'index.js'), 'utf8'), pluginSourceV2())
  assert.ok(fs.statSync(env.SHELL).mode & 0o100)
})

test('the user\'s OPENCODE_CONFIG file is merged in (paths anchored), their CONTENT and experimental kept, the runner apart', () => {
  const home = tmp()
  const userDir = path.join(home, 'cfg')
  fs.mkdirSync(path.join(home, 'xdg', 'opencode'), { recursive: true })
  fs.mkdirSync(userDir, { recursive: true })
  fs.writeFileSync(path.join(home, 'xdg', 'opencode', 'opencode.jsonc'), '{ // global\n "experimental": { "background_compaction": true }, "shell": "/bin/bash", }')
  fs.writeFileSync(path.join(userDir, 'mine.json'), JSON.stringify({
    model: 'anthropic/claude', plugins: ['./local-plugin', '-old', { package: '../pkg', options: { a: 1 } }], instructions: ['./RULES.md'],
    permissions: [{ action: 'shell', resource: 'rm *', effect: 'deny' }], mcp: { servers: { code_desktop: { type: 'local', command: ['evil'] } } },
    providers: { anthropic: { settings: { apiKey: '{file:./key.txt}' } } },
  }))
  const env = {
    HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), PATH: '/usr/bin:/bin', SHELL: '/bin/zsh', ...APP_TOOLS,
    OPENCODE_CONFIG: path.join(userDir, 'mine.json'),
    OPENCODE_CONFIG_CONTENT: '{"plugins":["user-content-plugin"],"username":"me"}',
    CODE_DESKTOP_OPENCODE_CONFIG_EXTRA: JSON.stringify({ permissions: [{ action: 'webfetch', resource: '*', effect: 'deny' }], share: 'disabled' }),
  }
  const state = path.join(home, 'state')
  const config = new BridgeConfigV2({ flavor: OC2, stateDir: state, env })
  const out = config.write()
  const file = JSON.parse(fs.readFileSync(out.OPENCODE_CONFIG, 'utf8'))
  assert.equal(file.model, 'anthropic/claude')
  assert.deepEqual(file.plugins, [path.join(userDir, 'local-plugin'), '-old', { package: path.join(home, 'pkg'), options: { a: 1 } }])
  assert.deepEqual(file.instructions, [path.join(userDir, 'RULES.md')])
  assert.equal(file.providers.anthropic.settings.apiKey, `{file:${path.join(userDir, 'key.txt')}}`)
  assert.deepEqual(file.permissions, [{ action: 'shell', resource: 'rm *', effect: 'deny' }, { action: 'webfetch', resource: '*', effect: 'deny' }])
  assert.equal(file.share, 'disabled', 'EXTRA is merged last')
  assert.equal(file.mcp.servers.code_desktop.codemode, false, 'the bridge\'s own server wins over a same-named one in the user file')
  const content = JSON.parse(out.OPENCODE_CONFIG_CONTENT)
  assert.equal(content.username, 'me')
  assert.equal(content.plugins[0], 'user-content-plugin')
  assert.equal(content.plugins.at(-1).package, path.join(state, 'opencode-plugin', PLUGIN_ID), 'the bridge plugin comes after the user\'s content plugins')
  assert.deepEqual(content.experimental, { background_compaction: true, todo: true })
  // The user's configured shell is the one the wrapper execs (/bin/bash exists on macOS), and names the wrapper.
  assert.equal(path.basename(out.SHELL), 'bash')
  assert.match(fs.readFileSync(out.SHELL, 'utf8'), /exec '\/bin\/bash' "\$@"/)

  // OPENCODE_CONFIG pointing at the bridge's own file is not read back into itself.
  const self = new BridgeConfigV2({ flavor: OC2, stateDir: state, env: { ...env, OPENCODE_CONFIG: config.configPath } })
  assert.equal(self.userConfigFile(), null)

  // A workflow runner's bridge: its own folder, no code_desktop server or app tools in the plugin options.
  const runner = new BridgeConfigV2({ flavor: OC2, stateDir: state, env: { ...env, OPENCODE_CONFIG: '', CODE_DESKTOP_WORKFLOW_RUNNER: '1' } })
  const runnerEnv = runner.write()
  assert.equal(runnerEnv.OPENCODE_CONFIG, path.join(state, 'workflow-runs', String(process.pid), 'config-v2', 'opencode.json'))
  const runnerContent = JSON.parse(runnerEnv.OPENCODE_CONFIG_CONTENT)
  assert.equal(runnerContent.plugins.at(-1).package, path.join(state, 'workflow-runs', String(process.pid), 'opencode-plugin', PLUGIN_ID))
  assert.equal(runnerContent.plugins.at(-1).options.appTools, null)
  assert.equal(JSON.parse(fs.readFileSync(runnerEnv.OPENCODE_CONFIG, 'utf8')).mcp, undefined)
})

test('pure helpers: provider/MCP shapes, websearch on, merge rules', () => {
  assert.deepEqual(providerOverlayV2([{ route: 'Bad Route', baseURL: 'x' }, { route: 'r', baseURL: 'https://h/v1/', models: [''] }], {}), { r: { name: 'r', package: 'aisdk:@ai-sdk/openai-compatible', settings: { baseURL: 'https://h/v1' }, models: {} } })
  assert.deepEqual(toV2Mcp({ url: 'https://x', oauth: false, headers: { a: 'b' } }), { type: 'remote', url: 'https://x', headers: { a: 'b' }, oauth: false })
  assert.deepEqual(toV2Mcp({ type: 'local', command: ['a'], disabled: true, codemode: true }), { type: 'local', command: ['a'], disabled: true, codemode: true })
  assert.equal(toV2Mcp({ enabled: false }), null)
  assert.equal(appToolsEntryV2({ name: 'n', command: 'c', args: [], env: {} }).codemode, false)
  const { config } = setup({ settings: { coreSettings: { 'websearch.enabled': true } } })
  assert.equal(config.overlay().websearch, undefined, 'on: OpenCode\'s own selection, not a provider pinned over the user\'s')
  assert.equal(setup().config.overlay().websearch, undefined, 'unset: OpenCode\'s own choice')
  assert.deepEqual(mergeV2({ agents: { a: { x: 1 } }, model: 'p/a', experimental: { a: 1 } }, { agents: { b: {} }, model: 'p/b', experimental: { b: 2 } }), { agents: { a: { x: 1 }, b: {} }, model: 'p/b', experimental: { a: 1, b: 2 } })
  assert.deepEqual(anchorConfig({ plugins: ['-x', 'npm-pkg'] }, '/d'), { plugins: ['-x', 'npm-pkg'] })
})

test('GET /api/config entries merged back as v2 reads them; the bridge\'s own documents excluded by path', () => {
  const overlay = '/state/config-v2/opencode.json'
  const entries = [
    { type: 'document', path: '/home/.config/opencode/opencode.json', info: { shell: '/bin/zsh', model: { providerID: 'a', model: 'x' }, permissions: [{ action: 'shell', resource: 'git *', effect: 'allow' }], plugins: ['user-plugin', 'opencode.thing'], mcp: { timeout: { catalog: 1 }, servers: { s1: { type: 'local', command: ['one'], environment: { A: '1' } } } }, experimental: { todo: false, schedules: true } } },
    { type: 'directory', path: '/home/.config/opencode' },
    { type: 'document', path: overlay, info: { share: 'manual', permissions: [{ action: 'skill', resource: 'k', effect: 'deny' }], mcp: { servers: { code_desktop: { type: 'local', command: ['app'], codemode: false } } } } },
    { type: 'document', path: '/proj/opencode.json', info: { model: { providerID: 'b', model: 'y' }, plugins: ['-user-*', '-user-plugin', 'proj-plugin'], mcp: { timeout: { execution: 2 }, servers: { s1: { type: 'remote', url: 'https://r' } } }, permissions: [{ action: 'edit', resource: '*', effect: 'deny' }] } },
    { type: 'document', info: { shell: '/state/runtime/shell-v2/zsh', plugins: [{ package: '/state/opencode-plugin/code-desktop', options: { state: '/state' } }], experimental: { todo: true } } },
  ]
  const all = mergeConfigEntries(entries)
  assert.equal(all.documents, 4)
  assert.equal(all.config.shell, '/state/runtime/shell-v2/zsh')
  assert.deepEqual(all.config.model, { providerID: 'b', model: 'y' })
  assert.deepEqual(all.config.experimental, { todo: true }, 'experimental is taken whole from the last document')
  assert.deepEqual(all.config.mcp.servers.s1, { type: 'remote', url: 'https://r' }, 'a server is replaced whole by name')
  assert.deepEqual(all.config.mcp.timeout, { catalog: 1, execution: 2 })
  assert.deepEqual(all.config.permissions.map((rule) => rule.action), ['shell', 'skill', 'edit'])
  // `opencode.thing` selects internal plugins (never a package); `-user-*` matches the id.
  assert.deepEqual(all.plugins.map((plugin) => plugin.target), ['proj-plugin', '/state/opencode-plugin/code-desktop'])
  assert.deepEqual(all.plugins.map((plugin) => plugin.id), ['proj-plugin', 'code-desktop'])
  // The user's own view: without the OPENCODE_CONFIG overlay and the CONTENT document.
  const user = mergeConfigEntries(entries, { exclude: [overlay], content: false })
  assert.deepEqual(user.config.permissions.map((rule) => rule.action), ['shell', 'edit'])
  assert.equal(user.config.mcp.servers.code_desktop, undefined)
  assert.equal(user.config.shell, '/bin/zsh')
  assert.deepEqual(user.config.experimental, { todo: false, schedules: true })
})

test('plugin removals match the plugin id the way v2 does (not the target); an add of a known id turns it back on', () => {
  const doc = (plugins) => ({ type: 'document', path: `/d/${Math.random()}`, info: { plugins } })
  const targets = (...lists) => mergeConfigEntries(lists.map(doc)).plugins.map((plugin) => plugin.target)
  assert.deepEqual(targets(['/state/opencode-plugin/code-desktop', 'pkg@1.2', '@scope/x@2'], ['-code-desktop', '-pkg', '-@scope/x']), [])
  assert.deepEqual(targets(['pkg@1.2'], ['-pkg@1.2']), ['pkg@1.2'], 'v2 never matches a removal against the spec')
  assert.deepEqual(targets(['/state/opencode-plugin/code-desktop'], ['-/state/opencode-plugin/code-desktop']), ['/state/opencode-plugin/code-desktop'])
  assert.deepEqual(targets(['pkg@1.2', 'other'], ['-*'], ['pkg']), ['pkg@1.2'], 'a later add of the id re-enables it')
  assert.deepEqual(targets(['./local/a'], ['-./local/a']), [], 'a path plugin\'s id is unknown: its target stands in')
  assert.equal(pluginIdOf('opencode-foo@latest'), 'opencode-foo')
  assert.equal(pluginIdOf('@a/b'), '@a/b')
  assert.equal(pluginIdOf('file:///x/code-desktop/'), 'code-desktop')
  assert.equal(pluginIdOf('/x/other'), null)
})

test('anchorConfig: every relative {file:}, 1.x plugin entries; OPENCODE_CONFIG_DIR is the global folder', () => {
  const out = anchorConfig({
    a: '{file:key.txt}', b: '{file:./k}', c: '{file:~/k}', d: '{file:/abs/k}', e: 'x {file:../up/k} y',
    plugin: ['./p1', ['../p2', { o: 1 }], 'npm-pkg', ['npm-two', {}]], plugins: [['./n', {}], '-./gone'],
  }, '/cfg/dir')
  assert.deepEqual([out.a, out.b, out.c, out.d, out.e], ['{file:/cfg/dir/key.txt}', '{file:/cfg/dir/k}', '{file:~/k}', '{file:/abs/k}', 'x {file:/cfg/up/k} y'])
  assert.deepEqual(out.plugin, ['/cfg/dir/p1', ['/cfg/p2', { o: 1 }], 'npm-pkg', ['npm-two', {}]])
  assert.deepEqual(out.plugins, [['/cfg/dir/n', {}], '-./gone'])
  const custom = path.join(tmp(), 'custom-global')
  fs.mkdirSync(custom, { recursive: true })
  fs.writeFileSync(path.join(custom, 'opencode.json'), JSON.stringify({ shell: '/bin/bash', experimental: { mine: true } }))
  const { config } = setup({ env: { OPENCODE_CONFIG_DIR: custom } })
  assert.equal(config.globalDir(), custom)
  assert.equal(config.configuredShell(), '/bin/bash')
  assert.deepEqual(config.content().experimental, { mine: true, todo: true })
  assert.equal(setup().config.globalDir().endsWith(path.join('xdg', 'opencode')), true)
})

test('skill switches deny by name, and by id once the bridge knows it', () => {
  const { config } = setup({ settings: { disabledSkills: ['Pretty Name', 'same'] } })
  assert.deepEqual(config.overlay().permissions.map((rule) => rule.resource), ['Pretty Name', 'same'])
  config.skillIds = { 'Pretty Name': 'pretty-folder', same: 'same' }
  assert.deepEqual(config.overlay().permissions, [
    { action: 'skill', resource: 'Pretty Name', effect: 'deny' }, { action: 'skill', resource: 'pretty-folder', effect: 'deny' }, { action: 'skill', resource: 'same', effect: 'deny' },
  ])
})

test('a user OPENCODE_CONFIG is copied into the bridge\'s file (0600), literal keys included', () => {
  const home = tmp()
  fs.writeFileSync(path.join(home, 'mine.json'), JSON.stringify({ providers: { x: { settings: { apiKey: 'sk-literal' } } } }))
  const { config } = setup({ env: { OPENCODE_CONFIG: path.join(home, 'mine.json') } })
  const env = config.write()
  assert.ok(fs.readFileSync(env.OPENCODE_CONFIG, 'utf8').includes('sk-literal'), 'documented: the copy carries what the user wrote')
  assert.equal(fs.statSync(env.OPENCODE_CONFIG).mode & 0o777, 0o600)
})

// ---------------------------------------------------------------- the plugin

async function loadPlugin(state) {
  const dir = path.join(state, 'opencode-plugin', PLUGIN_ID)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `index-${Math.random().toString(36).slice(2)}.js`)
  fs.writeFileSync(file, pluginSourceV2())
  return (await import(pathToFileURL(file).href)).default
}

/** A ctx with every domain the plugin uses, recording registrations. */
function fakeCtx(state, { sessions = {}, options = {} } = {}) {
  const hooks = {}
  const transforms = {}
  const registration = { dispose: async () => {} }
  const domain = (name) => ({ hook: async (hook, callback, opts) => { (hooks[`${name}.${hook}`] ??= []).push({ callback, opts }); return registration } })
  return {
    hooks, transforms,
    ctx: {
      options: { state, wrapper: path.join(state, 'runtime', 'shell-v2', 'zsh'), ...options },
      location: { directory: '/work', project: {} },
      session: { ...domain('session'), get: async ({ sessionID }) => { if (!sessions[sessionID]) throw new Error('not found'); return sessions[sessionID] } },
      tool: domain('tool'), permission: domain('permission'), shell: domain('shell'),
      mcp: { transform: async (callback) => { transforms.mcp = callback; return registration } },
    },
  }
}

const writeRuntime = (state, id, value) => { fs.mkdirSync(path.join(state, 'runtime', 'sessions'), { recursive: true }); fs.writeFileSync(path.join(state, 'runtime', 'sessions', `${id}.json`), JSON.stringify(value)) }
const fire = async (hooks, name, event) => { for (const { callback } of hooks[name] ?? []) await callback(event); return event }
const instructionPart = (sources) => ({ type: 'text', text: sources.map((source) => source.text).join('\n\n'), metadata: { experimental: { instructions: sources } } })

test('the generated plugin: default {id, setup}, node builtins only, every hook registered', async () => {
  const source = pluginSourceV2()
  const imports = [...source.matchAll(/^import .* from "([^"]+)"/gm)].map((match) => match[1])
  assert.deepEqual(imports, ['node:fs', 'node:path'])
  const state = tmp()
  const plugin = await loadPlugin(state)
  assert.equal(plugin.id, 'code-desktop')
  assert.equal(typeof plugin.setup, 'function')
  const { ctx, hooks, transforms } = fakeCtx(state)
  await plugin.setup(ctx)
  assert.deepEqual(Object.keys(hooks).sort(), ['permission.evaluate', 'session.context', 'session.prompt', 'shell.create.before'], 'no tool hook: v2 names the session in the MCP call\'s _meta')
  assert.ok(Object.values(hooks).every((list) => list.length === 1 && list[0].opts === undefined), 'no hook is scoped to one provider')
  assert.equal(typeof transforms.mcp, 'function')
  // No state folder: nothing registered.
  const bare = fakeCtx('', { options: { state: '' } })
  const saved = process.env.CODE_DESKTOP_OPENCODE_STATE
  delete process.env.CODE_DESKTOP_OPENCODE_STATE
  try { await plugin.setup(bare.ctx) } finally { if (saved !== undefined) process.env.CODE_DESKTOP_OPENCODE_STATE = saved }
  assert.deepEqual(bare.hooks, {})
})

test('plugin context: a custom prompt replaces OpenCode\'s (Code Mode, MCP and skill guidance kept), instructions appended, params, preview', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const { ctx, hooks } = fakeCtx(state)
  await plugin.setup(ctx)
  writeRuntime(state, 'ses_root', { root: 'ses_root', cwd: '/work', systemPrompt: 'You are {{model}} on {{provider}} in {{cwd}}. {{unknown}}', instructions: 'Project rules.', modelParams: { 'anthropic/claude-x': { temperature: 0.2, maxTokens: 999 } } })
  const sources = [
    { key: 'core/codemode', text: 'CODEMODE' }, { key: 'core/mcp-guidance', text: 'MCP' }, { key: 'core/skill-guidance', text: 'SKILLS' },
    { key: 'core/instructions', text: 'AGENTS.md' }, { key: 'core/date', text: 'DATE' }, { key: 'core/environment', text: 'ENV' },
  ]
  assert.deepEqual(KEPT_INSTRUCTIONS, ['core/codemode', 'core/mcp-guidance', 'core/skill-guidance'])
  const event = await fire(hooks, 'session.context', {
    sessionID: 'ses_root', agent: 'build', model: { id: 'claude-x', providerID: 'anthropic' },
    system: [{ type: 'text', text: 'OPENCODE PROMPT' }, instructionPart(sources)], messages: [], options: { maxTokens: 32000 }, tools: { read: {}, shell: {} },
  })
  assert.deepEqual(event.system.map((part) => part.text), ['You are claude-x on anthropic in /work. {{unknown}}', 'CODEMODE\n\nMCP\n\nSKILLS', 'Project rules.'])
  assert.equal(event.options.temperature, 0.2)
  assert.equal(event.options.maxTokens, 999)
  const preview = JSON.parse(fs.readFileSync(path.join(state, 'runtime', 'prompts', 'ses_root.json'), 'utf8'))
  assert.equal(preview.model, 'anthropic/claude-x')
  assert.equal(preview.custom, true)
  assert.deepEqual(preview.default, ['OPENCODE PROMPT', sources.map((source) => source.text).join('\n\n')])
  assert.deepEqual(preview.final, event.system.map((part) => part.text))
  assert.deepEqual(preview.tools, ['read', 'shell'])

  // No custom prompt: OpenCode's system stays, the instructions go after it; an unknown session is left alone.
  writeRuntime(state, 'ses_plain', { root: 'ses_plain', cwd: '/work', systemPrompt: null, instructions: 'Rules.' })
  const plain = await fire(hooks, 'session.context', { sessionID: 'ses_plain', agent: 'build', model: { id: 'm', providerID: 'p' }, system: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }], messages: [], options: {}, tools: {} })
  assert.deepEqual(plain.system.map((part) => part.text), ['A', 'B', 'Rules.'])
  assert.equal(plain.options.temperature, undefined)
})

test('plugin context under claude-agent: the custom prompt is the agent role, instructions appended, no temperature', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const { ctx, hooks } = fakeCtx(state)
  await plugin.setup(ctx)
  writeRuntime(state, 'ses_c', { root: 'ses_c', cwd: '/work', systemPrompt: 'Be terse.', instructions: 'Project rules.', modelParams: { 'claude-agent/sonnet': { temperature: 0.5, maxTokens: 4096 } } })
  const system = [{ type: 'text', text: 'OPENCODE' }, instructionPart([{ key: 'core/mcp-guidance', text: 'MCP' }, { key: 'core/instructions', text: 'AGENTS.md' }])]
  // claude-agent's own (earlier) hook already filled its options from every instruction source.
  const event = await fire(hooks, 'session.context', { sessionID: 'ses_c', agent: 'build', model: { id: 'sonnet', providerID: 'claude-agent' }, system, messages: [], options: { claudeCodeAgent: '', claudeCodeInstructions: 'MCP\n\nAGENTS.md' }, tools: {} })
  assert.equal(event.system, system, 'replacing system has no effect under claude-agent: left as it is')
  assert.equal(event.options.claudeCodeAgent, 'Be terse.')
  assert.equal(event.options.claudeCodeInstructions, 'MCP\n\nProject rules.')
  assert.equal(event.options.temperature, undefined)
  assert.equal(event.options.maxTokens, 4096)
  const preview = JSON.parse(fs.readFileSync(path.join(state, 'runtime', 'prompts', 'ses_c.json'), 'utf8'))
  assert.deepEqual(preview.claudeCode, { agent: 'Be terse.', instructions: 'MCP\n\nProject rules.' })
  // Without a custom prompt the role stays, the instructions are added to claude-agent's own.
  writeRuntime(state, 'ses_d', { root: 'ses_d', cwd: '/work', instructions: 'Extra.' })
  const plain = await fire(hooks, 'session.context', { sessionID: 'ses_d', agent: 'build', model: { id: 'sonnet', providerID: 'claude-agent' }, system, messages: [], options: { claudeCodeAgent: 'ROLE', claudeCodeInstructions: 'MCP' }, tools: {} })
  assert.equal(plain.options.claudeCodeAgent, 'ROLE')
  assert.equal(plain.options.claudeCodeInstructions, 'MCP\n\nExtra.')
})

test('plugin: a sub-agent borrows its root\'s file at once (no project instructions) and points at its sandbox; waits only without one', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const { ctx, hooks } = fakeCtx(state, { sessions: { ses_child: { id: 'ses_child', parentID: 'ses_mid', metadata: {} }, ses_mid: { id: 'ses_mid', parentID: 'ses_root', metadata: {} }, ses_meta: { id: 'ses_meta', parentID: 'ses_x', metadata: { codeDesktop: { root: 'ses_root' } } }, ses_orphan: { id: 'ses_orphan', parentID: 'ses_gone', metadata: {} } } })
  await plugin.setup(ctx)
  writeRuntime(state, 'ses_root', { root: 'ses_root', cwd: '/work', systemPrompt: 'ROOT PROMPT', instructions: 'Root only.', appTools: { prefix: 'code_desktop_', session: 'ses_root' } })
  writeSandboxV2(path.join(state, 'runtime', 'sandbox'), 'ses_root', { mode: 'workspace-write', roots: ['/work'], network: false })
  let started = Date.now()
  const event = await fire(hooks, 'session.context', { sessionID: 'ses_child', agent: 'general', model: { id: 'm', providerID: 'p' }, system: [{ type: 'text', text: 'X' }], messages: [], options: {}, tools: {} })
  assert.deepEqual(event.system.map((part) => part.text), ['ROOT PROMPT'])
  assert.ok(Date.now() - started < 500, 'a sub-agent step never waits when its root has a file')

  // prompt: the root's own file ends the wait at once; a sub-agent without a file of its own gets a pointer to its root
  // (never a copy of the root's profile) and runs on the root's file without waiting.
  started = Date.now()
  await fire(hooks, 'session.prompt', { sessionID: 'ses_root', messageID: 'msg_1', prompt: { text: 'hi' }, delivery: 'steer' })
  await fire(hooks, 'session.prompt', { sessionID: 'ses_child', messageID: 'msg_2', prompt: { text: 'go' }, delivery: 'steer' })
  await fire(hooks, 'session.prompt', { sessionID: 'ses_meta', messageID: 'msg_3', prompt: { text: 'go' }, delivery: 'steer' })
  assert.ok(Date.now() - started < 1000)
  assert.equal(fs.readFileSync(path.join(state, 'runtime', 'sandbox', 'ses_child.root'), 'utf8'), 'ses_root')
  assert.equal(fs.readFileSync(path.join(state, 'runtime', 'sandbox', 'ses_meta.root'), 'utf8'), 'ses_root')
  assert.equal(fs.existsSync(path.join(state, 'runtime', 'sandbox', 'ses_child.sb')), false)

  // A sub-agent file of its own the bridge marks rulesApplied:false keeps the prompt waiting until it is applied.
  writeRuntime(state, 'ses_mid', { root: 'ses_root', rulesApplied: false })
  const pending = fire(hooks, 'session.prompt', { sessionID: 'ses_mid', messageID: 'msg_4', prompt: { text: 'go' }, delivery: 'steer' })
  let done = false
  void pending.then(() => { done = true })
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.equal(done, false, 'rulesApplied:false keeps it waiting')
  writeRuntime(state, 'ses_mid', { root: 'ses_root', rulesApplied: true })
  await pending

  // No file for the session nor its root: the wait is for its own file (which appears here).
  const orphan = fire(hooks, 'session.prompt', { sessionID: 'ses_orphan', messageID: 'msg_5', prompt: { text: '' }, delivery: 'queue' })
  let orphanDone = false
  void orphan.then(() => { orphanDone = true })
  await new Promise((resolve) => setTimeout(resolve, 120))
  assert.equal(orphanDone, false)
  writeRuntime(state, 'ses_orphan', { root: 'ses_orphan' })
  await orphan
  // A session the bridge wrote files for keeps its own sandbox file: no pointer next to it.
  fs.writeFileSync(path.join(state, 'runtime', 'sandbox', 'ses_x.sb'), 'none')
  writeRuntime(state, 'ses_x', { root: 'ses_x' })
  await fire(hooks, 'session.prompt', { sessionID: 'ses_x', messageID: 'msg_6', prompt: { text: '' }, delivery: 'queue' })
  assert.equal(fs.existsSync(path.join(state, 'runtime', 'sandbox', 'ses_x.root')), false)
})

test('plugin permission.evaluate: read-only edits refused (saved allows too), plan/agent folders and grants allowed, noUser refused', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const { ctx, hooks } = fakeCtx(state)
  await plugin.setup(ctx)
  const policy = (extra) => ({ mode: 'plan', readOnly: true, cwd: '/work', planDirs: ['/home/.opencode/plans'], agentDirs: ['/data/tool-output'], roots: [], grants: [], noUser: false, ...extra })
  const evaluate = (id, request) => fire(hooks, 'permission.evaluate', { sessionID: id, agent: 'build', resources: [], ...request })
  writeRuntime(state, 'ses_plan', { root: 'ses_plan', policy: policy() })
  const saved = await evaluate('ses_plan', { action: 'edit', resources: ['src/a.js'], effect: 'allow' })
  assert.equal(saved.effect, 'deny')
  assert.equal(saved.message, 'This mode cannot change files.')
  assert.equal((await evaluate('ses_plan', { action: 'edit', resources: ['/home/.opencode/plans/p.md'], effect: 'ask' })).effect, 'ask', 'the plan file is left to the rules')
  assert.equal((await evaluate('ses_plan', { action: 'external_directory', resources: ['/home/.opencode/plans/*'], effect: 'ask' })).effect, 'allow')
  assert.equal((await evaluate('ses_plan', { action: 'external_directory', resources: ['/data/tool-output/*'], effect: 'ask' })).effect, 'ask', 'agent folders only outside read-only modes')
  assert.equal((await evaluate('ses_plan', { action: 'shell', resources: ['ls'], effect: 'deny' })).effect, 'deny')

  writeRuntime(state, 'ses_ask', { root: 'ses_ask', policy: policy({ mode: 'ask', readOnly: false, grants: [{ permission: 'shell', patterns: ['git status *'] }, { action: 'webfetch', resources: ['*'] }] }) })
  assert.equal((await evaluate('ses_ask', { action: 'edit', resources: ['src/a.js'], effect: 'ask' })).effect, 'ask')
  assert.equal((await evaluate('ses_ask', { action: 'shell', resources: ['git status'], effect: 'ask' })).effect, 'allow')
  assert.equal((await evaluate('ses_ask', { action: 'shell', resources: ['git status', 'rm -rf x'], effect: 'ask' })).effect, 'ask')
  assert.equal((await evaluate('ses_ask', { action: 'webfetch', resources: ['https://x'], effect: 'ask' })).effect, 'allow')
  assert.equal((await evaluate('ses_ask', { action: 'external_directory', resources: ['/data/tool-output/*'], effect: 'ask' })).effect, 'allow')
  assert.equal((await evaluate('ses_ask', { action: 'external_directory', resources: ['/etc/*'], effect: 'ask' })).effect, 'ask')

  writeRuntime(state, 'ses_unattended', { root: 'ses_unattended', policy: policy({ mode: 'ask', readOnly: false, noUser: true }) })
  const unattended = await evaluate('ses_unattended', { action: 'shell', resources: ['make'], effect: 'ask' })
  assert.equal(unattended.effect, 'deny')
  assert.match(unattended.message, /runs without approvals/)
  writeRuntime(state, 'ses_bypass', { root: 'ses_bypass', policy: policy({ mode: 'bypass', readOnly: false, noUser: true }) })
  assert.equal((await evaluate('ses_bypass', { action: 'edit', resources: ['a'], effect: 'ask' })).effect, 'ask')
  assert.equal((await evaluate('ses_none', { action: 'edit', resources: ['a'], effect: 'allow' })).effect, 'allow', 'no runtime file: untouched')
})

test('plugin shell.create.before forces the wrapper; mcp.transform disables the user\'s servers and sets code_desktop with codemode:false', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const appTools = { name: 'code_desktop', command: ['/app/node', '/app/tools.mjs'], environment: { MODE: 'x' }, env: ['CODE_DESKTOP_AGENT_TOOLS_TOKEN'], timeout: { execution: 600000 } }
  const { ctx, hooks, transforms } = fakeCtx(state, { options: { appTools } })
  await plugin.setup(ctx)
  const shell = await fire(hooks, 'shell.create.before', { command: 'ls', cwd: '/work', timeout: 0, shell: '/bin/bash', env: {} })
  assert.equal(shell.shell, path.join(state, 'runtime', 'shell-v2', 'zsh'))

  fs.writeFileSync(path.join(state, 'mcp.json'), JSON.stringify({ disabled: ['mine', 'absent'] }))
  const servers = new Map([['mine', { type: 'local', command: ['m'] }], ['theirs', { type: 'remote', url: 'https://t' }], ['code_desktop', { type: 'local', command: ['impostor'] }]])
  const editor = {
    list: () => [...servers], get: (name) => servers.get(name), set: (name, value) => servers.set(name, value),
    update: (name, update) => { const value = servers.get(name); if (value) update(value) }, remove: (name) => servers.delete(name),
  }
  const saved = process.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN
  process.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN = 'tok'
  try { transforms.mcp(editor) } finally { if (saved === undefined) delete process.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN; else process.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN = saved }
  assert.equal(servers.get('mine').disabled, true)
  assert.equal(servers.get('theirs').disabled, undefined)
  assert.equal(servers.has('absent'), false)
  assert.deepEqual(servers.get('code_desktop'), { type: 'local', command: ['/app/node', '/app/tools.mjs'], environment: { MODE: 'x', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok' }, codemode: false, timeout: { execution: 600000 } })
  // Turned off in Connectors: OpenClaude Desktop's own server is not set again.
  fs.writeFileSync(path.join(state, 'mcp.json'), JSON.stringify({ disabled: ['code_desktop'] }))
  servers.set('code_desktop', { type: 'local', command: ['x'] })
  transforms.mcp(editor)
  assert.deepEqual(servers.get('code_desktop'), { type: 'local', command: ['x'], disabled: true })
})

test('plugin: a Connectors switch of the user\'s own server (mcp.json disabled only) reloads MCP; other state writes don\'t', async () => {
  const state = tmp()
  fs.writeFileSync(path.join(state, 'mcp.json'), JSON.stringify({ servers: {}, disabled: [] }))
  const plugin = await loadPlugin(state)
  const { ctx } = fakeCtx(state)
  let reloads = 0
  ctx.mcp.reload = async () => { reloads++ }
  const cleanup = await plugin.setup(ctx)
  assert.equal(typeof cleanup, 'function', 'setup returns its cleanup (the watcher)')
  const until = async (check, ms = 3000) => { const end = Date.now() + ms; while (!check() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 25)) }
  try {
    const replace = (value) => { const file = path.join(state, 'mcp.json'); fs.writeFileSync(`${file}.tmp`, JSON.stringify(value)); fs.renameSync(`${file}.tmp`, file) }
    // fs.watch (FSEvents on macOS) can start late under load and miss a write: the write is repeated until it is seen
    // (the same list again reloads nothing), within a generous deadline.
    const replaceUntil = async (value, count) => {
      const end = Date.now() + 15000
      while (reloads < count && Date.now() < end) { replace(value); await until(() => reloads >= count, 750) }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    await replaceUntil({ servers: {}, disabled: ['mine'] }, 1)
    assert.equal(reloads, 1, 'turned off: reloaded')
    // Same list (a server edited, or another file in the state folder): nothing.
    replace({ servers: { added: { type: 'local', command: ['a'] } }, disabled: ['mine'] })
    fs.writeFileSync(path.join(state, 'settings.json'), '{}')
    await new Promise((resolve) => setTimeout(resolve, 400))
    assert.equal(reloads, 1)
    await replaceUntil({ servers: {}, disabled: [] }, 2)
    assert.equal(reloads, 2, 'turned back on: reloaded')
  } finally { await cleanup() }
})

test('plugin hooks never throw: a broken runtime file or session lookup leaves the event as it was', async () => {
  const state = tmp()
  const plugin = await loadPlugin(state)
  const { ctx, hooks } = fakeCtx(state)
  ctx.session.get = async () => { throw new Error('boom') }
  await plugin.setup(ctx)
  fs.mkdirSync(path.join(state, 'runtime', 'sessions'), { recursive: true })
  fs.writeFileSync(path.join(state, 'runtime', 'sessions', 'ses_bad.json'), '{not json')
  const event = await fire(hooks, 'session.context', { sessionID: 'ses_unknown', model: null, system: null, options: null })
  assert.equal(event.system, null)
  await fire(hooks, 'permission.evaluate', { sessionID: 'ses_bad', action: 'edit', resources: null, effect: 'allow' })
})

// ---------------------------------------------------------------- the wrapper

test('v2 sandbox file text: profile, none, fail-closed without a policy', () => {
  assert.equal(sandboxFileText({ mode: 'danger-full-access' }), 'none')
  assert.equal(sandboxFileText({ mode: 'read-only' }), FAIL_CLOSED_PROFILE)
  assert.equal(sandboxFileText(null), FAIL_CLOSED_PROFILE)
  const text = shellWrapperV2({ shell: "/bin/it's", sandboxDir: '/s d' })
  assert.match(text, /^#!\/bin\/sh\n/)
  assert.ok(text.includes(`dir='/s d'\n`) && text.includes(`id=$(printf '%s' "$OPENCODE_SESSION_ID" | tr -c 'A-Za-z0-9_-' '_')`))
  assert.ok(text.includes(`file="$dir/$(tr -c 'A-Za-z0-9_-' '_' < "$dir/$id.root").sb"`))
  assert.ok(text.includes(`exec '/bin/it'\\''s' "$@"`))
  assert.ok(text.includes('-lt 60 ]'))
  assert.ok(text.indexOf('unset CODE_DESKTOP_AGENT_TOOLS_SOCKET') < text.indexOf('profile='))
})

function sh(args, options) {
  const result = spawnSync('/bin/sh', args, { encoding: 'utf8', ...options })
  return result.error?.code === 'EPERM' ? null : result
}

test('the v2 wrapper passes sh -n', (t) => {
  const dir = tmp()
  const file = path.join(dir, 'zsh')
  fs.writeFileSync(file, shellWrapperV2({ shell: '/bin/zsh', sandboxDir: path.join(dir, 'sandbox') }))
  const result = sh(['-n', file])
  if (!result) return t.skip('spawning /bin/sh is not allowed here')
  assert.equal(result.status, 0, result.stderr)
})

test('the v2 wrapper picks the session\'s profile, waits for a late file, fails closed, and drops the app channel', async (t) => {
  const dir = tmp()
  const sandboxDir = path.join(dir, 'sandbox')
  fs.mkdirSync(sandboxDir)
  // A fake sandbox-exec and shell that print what they got.
  const fakeExec = path.join(dir, 'sandbox-exec')
  fs.writeFileSync(fakeExec, '#!/bin/sh\necho "SANDBOX[$2]"; shift 2; exec "$@"\n', { mode: 0o755 })
  const fakeShell = path.join(dir, 'realshell')
  fs.writeFileSync(fakeShell, '#!/bin/sh\necho "SHELL $* token=${CODE_DESKTOP_AGENT_TOOLS_TOKEN:-unset} sb=${CODE_DESKTOP_SANDBOX:-unset}"\n', { mode: 0o755 })
  const wrapper = path.join(dir, 'zsh')
  fs.writeFileSync(wrapper, shellWrapperV2({ shell: fakeShell, sandboxDir, sandboxExec: fakeExec, waitSteps: 10 }), { mode: 0o755 })
  const run = (env) => sh([wrapper, '-c', 'echo hi'], { env: { PATH: '/usr/bin:/bin', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 't', ...env } })
  const probe = run({})
  if (!probe) return t.skip('spawning /bin/sh is not allowed here')
  if (probe.status !== 0 && /Operation not permitted/.test(probe.stderr)) return t.skip('running scripts is not allowed here')

  // No session id, no env: read-only.
  assert.equal(probe.stdout, `SANDBOX[${FAIL_CLOSED_PROFILE}]\nSHELL -c echo hi token=unset sb=unset\n`)
  // The session's file: its profile; `none`: no sandbox. The session id is made file-safe.
  writeSandboxV2(sandboxDir, 'ses_a', { mode: 'workspace-write', roots: ['/w'], network: true })
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_a' }).stdout.split('\n')[0], `SANDBOX[${seatbeltProfile({ mode: 'workspace-write', roots: ['/w'], network: true })}]`)
  writeSandboxV2(sandboxDir, 'ses_b/../x', { mode: 'danger-full-access' })
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_b/../x', CODE_DESKTOP_SANDBOX: 'none' }).stdout, 'SHELL -c echo hi token=unset sb=unset\n')
  // A session without a file: waits (here 0.5 s), then read-only — even with the env markers set.
  const started = Date.now()
  const missing = run({ OPENCODE_SESSION_ID: 'ses_missing', CODE_DESKTOP_SANDBOX: 'none' })
  assert.ok(Date.now() - started >= 400)
  assert.equal(missing.stdout.split('\n')[0], `SANDBOX[${FAIL_CLOSED_PROFILE}]`)
  // A file that appears while it waits is used.
  setTimeout(() => writeSandboxV2(sandboxDir, 'ses_late', { mode: 'danger-full-access' }), 150)
  const late = await new Promise((resolve) => {
    import('node:child_process').then(({ execFile }) => execFile('/bin/sh', [wrapper, '-c', 'x'], { env: { PATH: '/usr/bin:/bin', OPENCODE_SESSION_ID: 'ses_late' } }, (error, stdout) => resolve(stdout)))
  })
  assert.equal(late, 'SHELL -c x token=unset sb=unset\n')
  // Without a session id, 1.x's env markers still choose (a command the shell tool did not start).
  assert.equal(run({ CODE_DESKTOP_SANDBOX: 'none' }).stdout, 'SHELL -c echo hi token=unset sb=unset\n')
  // A sub-agent's pointer: its root's profile as it is at each command, so the root's mode changes reach it.
  writeSandboxV2(sandboxDir, 'ses_root', { mode: 'danger-full-access' })
  fs.writeFileSync(path.join(sandboxDir, 'ses_kid.root'), 'ses_root')
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_kid' }).stdout, 'SHELL -c echo hi token=unset sb=unset\n')
  writeSandboxV2(sandboxDir, 'ses_root', { mode: 'read-only' })
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_kid' }).stdout.split('\n')[0], `SANDBOX[${FAIL_CLOSED_PROFILE}]`)
  // The sub-agent's own file wins; a pointer that names a path, or a root without a file, fails closed.
  writeSandboxV2(sandboxDir, 'ses_kid', { mode: 'danger-full-access' })
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_kid' }).stdout, 'SHELL -c echo hi token=unset sb=unset\n')
  writeSandboxV2(sandboxDir, 'ses_free', { mode: 'danger-full-access' })
  fs.writeFileSync(path.join(sandboxDir, 'ses_evil.root'), '../sandbox/ses_free')
  const started2 = Date.now()
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_evil' }).stdout.split('\n')[0], `SANDBOX[${FAIL_CLOSED_PROFILE}]`)
  assert.ok(Date.now() - started2 < 400, 'a pointer ends the wait')
  fs.writeFileSync(path.join(sandboxDir, 'ses_lost.root'), 'ses_nobody')
  assert.equal(run({ OPENCODE_SESSION_ID: 'ses_lost' }).stdout.split('\n')[0], `SANDBOX[${FAIL_CLOSED_PROFILE}]`)
})

// ---------------------------------------------------------------- the bridge

test('a v2 Bridge spawns serve with the overlay env and writes the session sandbox file and policy', async () => {
  const home = tmp()
  const fake = createV2Fake()
  const { EventEmitter } = await import('node:events')
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', OPENCODE_CONFIG_DIR: undefined }, input: new PassThrough(), output: new PassThrough() })
  assert.ok(bridge.config instanceof BridgeConfigV2)
  const spawns = []
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => {
    spawns.push(options.env)
    fake.serve(options.env)
    const child = new EventEmitter()
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough()
    child.pid = 1; child.exitCode = null
    child.kill = () => { setImmediate(() => { child.exitCode = 0; child.emit('exit', 0, null) }); return true }
    child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
    setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
    return child
  }
  try {
    await bridge.ensureServer()
    const env = spawns[0]
    assert.equal(env.OPENCODE_CONFIG, path.join(home, 'state', 'config-v2', 'opencode.json'))
    assert.equal(env.SHELL, path.join(home, 'state', 'runtime', 'shell-v2', 'zsh'))
    assert.equal(JSON.parse(env.OPENCODE_CONFIG_CONTENT).shell, env.SHELL)
    assert.equal(env.OPENCODE_CONFIG_DIR, undefined)
    for (const key of ['OPENCODE_ENABLE_EXA', 'OPENCODE_EXPERIMENTAL_PLAN_MODE', 'OPENCODE_ENABLE_QUESTION_TOOL', 'CODE_DESKTOP_SANDBOX']) assert.equal(env[key], undefined, key)

    // A thread's runtime: the .sb file next to the session file, and the policy the plugin evaluates.
    const thread = new LiveThread(bridge, { info: { id: 'ses_root', directory: path.join(home, 'w') } })
    thread.permission = { ...thread.permission, mode: 'plan' }
    thread.sessionGrants = [{ permission: 'shell', patterns: ['git *'] }]
    thread.writeRuntime()
    const runtime = JSON.parse(fs.readFileSync(path.join(home, 'state', 'runtime', 'sessions', 'ses_root.json'), 'utf8'))
    assert.deepEqual(runtime.policy, { mode: 'plan', readOnly: true, cwd: thread.cwd, planDirs: bridge.planDirs(thread.cwd), agentDirs: [], roots: [], grants: [{ permission: 'shell', patterns: ['git *'] }], noUser: false })
    assert.equal(fs.readFileSync(path.join(home, 'state', 'runtime', 'sandbox', 'ses_root.sb'), 'utf8'), sandboxFileText(runtime.sandbox))
    const child = new LiveThread(bridge, { info: { id: 'ses_child', parentID: 'ses_root', directory: thread.cwd }, root: thread, parent: thread })
    child.writeRuntime()
    assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'state', 'runtime', 'sessions', 'ses_child.json'), 'utf8')).policy.mode, 'plan')
    assert.ok(fs.existsSync(path.join(home, 'state', 'runtime', 'sandbox', 'ses_child.sb')))
  } finally {
    await bridge.shutdown?.().catch(() => {})
  }
})
