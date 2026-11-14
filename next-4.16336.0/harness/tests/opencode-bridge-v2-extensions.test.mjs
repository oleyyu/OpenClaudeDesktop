// OpenCode 2.x bridge, phase 8: extensions through the in-process v2 fake (src/v2/extensions.js) — connectors from GET
// /api/config's documents and GET /api/mcp (statuses, reload, an integration sign-in with no port held here), skills by
// id, commands (MCP prompts, templates, /goal left out), plugins (GET /api/plugin, origins, 1.x plugins marked
// incompatible, plugin.updated), agent files in v2's frontmatter, the fixed tool list, the '{core} settings' and
// capabilities that change on 2.x.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'
import { coreSettingDefs, coreSettingsEnv } from '../packages/opencode-bridge/src/core-settings.js'
import { agentDenyV2, agentMarkdownV2, fromV2Mcp, markdownParts, mcpStatusV2, modelIdOf, pluginContentsV2, templateHint } from '../packages/opencode-bridge/src/v2/extensions.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-ext-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const until = async (check, what, ms = 3000) => {
  const end = Date.now() + ms
  while (!check()) { if (Date.now() > end) throw new Error(`timed out waiting for ${what}`); await new Promise((resolve) => setTimeout(resolve, 5)) }
}

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.pid = 4321
  child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

/** A started v2 Bridge on the fake; MCP tool listing stubbed (no server is run), notifications and log collected. */
async function v2Bridge({ fake = createV2Fake({ cwd: '/home' }), env = {} } = {}) {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), XDG_CACHE_HOME: path.join(home, 'cache'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...env }, input: new PassThrough(), output: new PassThrough() })
  const spawns = []
  bridge.v2.fetch = (input, init) => fake.fetch(input, init)
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { spawns.push(options.env); fake.serve(options.env); return fakeChild() }
  bridge.v2.accountTiming = { pollMs: 5, debounceMs: 5 }
  bridge.v2.pluginDebounceMs = 5
  const tools = { listed: [], invalidated: [] }
  bridge.mcpTools.tools = async (name) => { tools.listed.push(name); return [{ name: 'search', description: 'Search it', readOnly: true }] }
  bridge.mcpTools.invalidate = (name) => tools.invalidated.push(name ?? '*')
  // No connector sign-in may listen here (1.x's port 19876).
  bridge.oauthCallbacks.listen = async () => { throw new Error('listen called') }
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  return { bridge, fake, home, notes, logs, tools, spawns }
}
const requests = (fake, method, pathname) => fake.state.requests.filter((request) => request.method === method && (pathname instanceof RegExp ? pathname.test(request.path) : request.path === pathname))
const doc = (info, file = null) => ({ type: 'document', ...(file ? { path: file } : {}), info })

// ---------------------------------------------------------------- pure helpers

test('helpers: v2 MCP entries in 1.x shape, statuses, model selections, frontmatter, hints', () => {
  assert.deepEqual(fromV2Mcp({ type: 'local', command: ['npx', 'x'], environment: { A: '1' }, disabled: true, codemode: false }), { type: 'local', command: ['npx', 'x'], environment: { A: '1' }, enabled: false })
  assert.deepEqual(fromV2Mcp({ type: 'remote', url: 'https://m.example/mcp', oauth: { client_id: 'cid', client_secret: 's', scope: 'read' } }), { type: 'remote', url: 'https://m.example/mcp', oauth: { clientId: 'cid', scope: 'read' } })
  assert.equal(fromV2Mcp({ type: 'local' }), null)
  assert.deepEqual(mcpStatusV2({ status: 'pending' }), { runtimeStatus: 'starting', error: null, clientRequired: false })
  assert.deepEqual(mcpStatusV2({ status: 'needs_auth', error: 'Sign in needed' }), { runtimeStatus: 'authenticationRequired', error: 'Sign in needed', clientRequired: false })
  assert.deepEqual(mcpStatusV2({ status: 'failed', error: 'Server does not support dynamic client registration' }), { runtimeStatus: 'failed', error: 'Server does not support dynamic client registration', clientRequired: true })
  assert.equal(mcpStatusV2(undefined, { enabled: false }).runtimeStatus, 'disabled')
  assert.equal(modelIdOf('anthropic/claude-x#high'), 'anthropic/claude-x')
  assert.equal(modelIdOf({ providerID: 'openai', model: 'gpt-5' }), 'openai/gpt-5')
  assert.equal(modelIdOf('nope'), null)
  assert.deepEqual(markdownParts('---\ndescription: "Fix: it"\nagent: plan\nsubtask: true\n---\nDo $1 then $2\n'), { data: { description: 'Fix: it', agent: 'plan', subtask: true }, body: 'Do $1 then $2' })
  assert.equal(templateHint('Do $1 then $2'), '[arg1] [arg2]')
  assert.equal(templateHint('Review $ARGUMENTS'), '[arguments]')
  assert.equal(templateHint('nothing'), '')
  assert.deepEqual(agentDenyV2(['bash', 'task', 'lsp', 'edit', 'nope', 'bash']), ['shell', 'subagent', 'edit'])
})

test('pluginContentsV2: v2 hooks and tools, a 1.x plugin told apart', () => {
  const v2 = `// session.context in a comment is not a hook
export default { id: 'acme', setup: async (ctx) => {
  await ctx.session.hook("context", (e) => {})
  await ctx.permission.hook('evaluate', (e) => {})
  await ctx.mcp.transform((editor) => {})
  await ctx.tool.transform((editor) => { editor.add({ name: 'acme_search', description: 'x' }); editor.add({ id: "acme_fetch" }) })
  ctx.rpc.register('acme', {})
} }`
  assert.deepEqual(pluginContentsV2(v2), { hooks: ['session.context', 'permission.evaluate', 'mcp.transform', 'tool.transform', 'rpc'], tools: ['acme_search', 'acme_fetch'], shape: 'v2' })
  const v1 = `export const Acme = async ({ client }) => ({ 'chat.message': async () => {}, 'tool.execute.before': async () => {} })`
  assert.equal(pluginContentsV2(v1).shape, 'v1')
  assert.equal(pluginContentsV2('const x = 1').shape, 'unknown')
  assert.equal(pluginContentsV2('').shape, 'unknown')
})

test('agent files in v2 frontmatter: permissions under v2 names, the prompt as the body', () => {
  const text = agentMarkdownV2({ description: 'Reviews code', mode: 'subagent', model: 'anthropic/claude-x', prompt: 'You review.', deny: ['shell', 'subagent'] })
  assert.equal(text, ['---', 'description: "Reviews code"', 'mode: subagent', 'model: "anthropic/claude-x"', 'permissions:',
    '  - action: shell', '    resource: "*"', '    effect: deny', '  - action: subagent', '    resource: "*"', '    effect: deny', '---', '', 'You review.', ''].join('\n'))
  assert.ok(!agentMarkdownV2({ description: 'd', mode: 'primary', prompt: 'p' }).includes('permission'))
})

test('core settings and capabilities on 2.x: web search is config (on by default), no background sub-agent switch, no codesearch', () => {
  assert.deepEqual(coreSettingDefs(OC2).map((def) => [def.key, def.kind, def.default]), [['websearch.enabled', 'config', true]])
  assert.deepEqual(coreSettingsEnv({ coreSettings: { 'websearch.enabled': true, 'subagents.background': true } }, OC2), {})
  // 1.x untouched.
  assert.deepEqual(coreSettingDefs(FLAVORS.opencode).map((def) => def.key), ['websearch.enabled', 'subagents.background'])
  assert.deepEqual(capabilitiesFor(OC2).workflowToolSwitches, { WebFetch: ['webfetch'], WebSearch: ['websearch'], Agent: ['subagent'], Task: ['subagent'] })
  assert.deepEqual(capabilitiesFor(FLAVORS.opencode).workflowToolSwitches.WebSearch, ['websearch', 'codesearch'])
})

test('coreSettings/write on 2.x: web search off is the overlay\'s websearch:false, reloaded without a restart', async () => {
  const { bridge, spawns } = await v2Bridge()
  try {
    const read = await bridge.handle('codeDesktop/coreSettings/read', {})
    assert.deepEqual(read.settings.map((row) => row.key), ['websearch.enabled'])
    await bridge.handle('codeDesktop/coreSettings/write', { key: 'websearch.enabled', value: false })
    assert.equal(JSON.parse(fs.readFileSync(bridge.config.configPath, 'utf8')).websearch, false)
    assert.equal(spawns.length, 1, 'no restart')
    await assert.rejects(bridge.handle('codeDesktop/coreSettings/write', { key: 'subagents.background', value: true }), /Unknown setting/)
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- connectors

test('connectors: config/read and mcpServerStatus/list from the documents and GET /api/mcp; no 1.x route', async () => {
  const { bridge, fake, tools } = await v2Bridge()
  const cwd = '/w'
  fake.state.configEntries = [
    doc({ model: 'anthropic/claude-x#high', mcp: { servers: { docs: { type: 'local', command: ['docs-mcp'] }, linear: { type: 'remote', url: 'https://mcp.linear.app/mcp' }, gated: { type: 'remote', url: 'https://g.example/mcp' }, broken: { type: 'local', command: ['nope'] }, pending: { type: 'local', command: ['slow'] } } } }, path.join(bridge.homeDir(), 'xdg', 'opencode', 'opencode.json')),
    doc({ mcp: { servers: { off: { type: 'local', command: ['off'], disabled: true } } } }, path.join(cwd, 'opencode.json')),
  ]
  fake.state.mcp = [
    { name: 'docs', status: { status: 'connected' } },
    { name: 'linear', status: { status: 'needs_auth', error: 'Sign in to Linear' }, integrationID: 'mcp_0123456789abcdef' },
    { name: 'gated', status: { status: 'failed', error: 'Dynamic client registration is not supported' }, integrationID: 'mcp_fedcba9876543210' },
    { name: 'broken', status: { status: 'failed', error: 'spawn nope ENOENT' } },
    { name: 'pending', status: { status: 'pending' } },
    { name: 'off', status: { status: 'disabled' } },
  ]
  // The user turned `docs` off in Connectors (mcp.json): the plugin disables it, the list shows it off.
  bridge.config.writeMcp({ servers: {}, disabled: ['docs'] })
  try {
    const status = await bridge.handle('mcpServerStatus/list', { cwd })
    const byName = Object.fromEntries(status.data.map((row) => [row.name, row]))
    assert.equal(byName.docs.runtimeStatus, 'disabled', 'turned off here, whatever v2 says before its transform reran')
    assert.equal(byName.linear.runtimeStatus, 'authenticationRequired')
    assert.equal(byName.linear.authStatus, 'notLoggedIn')
    assert.equal(byName.linear.toolsError, 'Sign in to Linear')
    assert.equal(byName.gated.runtimeStatus, 'failed')
    assert.deepEqual(byName.gated.codeDesktop, { oauthClientRequired: true })
    assert.equal(byName.broken.runtimeStatus, 'failed')
    assert.equal(byName.pending.runtimeStatus, 'starting')
    assert.equal(byName.off.runtimeStatus, 'disabled')
    assert.deepEqual(Object.keys(byName.pending.tools), ['search'])
    assert.ok(!tools.listed.includes('off') && !tools.listed.includes('docs'), 'a server that is off is not asked for its tools')
    const read = await bridge.handle('config/read', { cwd })
    assert.equal(read.config.model, 'anthropic/claude-x')
    assert.deepEqual(read.config.mcp_servers.linear, { url: 'https://mcp.linear.app/mcp', enabled: true, source: 'opencode' })
    assert.equal(read.config.mcp_servers.off.enabled, false)
    assert.ok(!('docs' in read.config.mcp_servers), 'as on 1.x: a connector turned off here is not listed by config/read')
    assert.deepEqual(new Set(requests(fake, 'GET', '/api/config').map((request) => decodeURIComponent(request.headers['x-opencode-directory']))), new Set([cwd]))
    assert.deepEqual(fake.state.violations, [])

    // reload: POST …/connect (stop + start) for each server that is on, in each loaded folder.
    await bridge.handle('config/mcpServer/reload', {})
    assert.ok(fake.state.mcpConnects.length > 0)
    assert.ok(!fake.state.mcpConnects.some((entry) => entry.server === 'docs' || entry.server === 'off'))
    assert.equal(requests(fake, 'POST', /disconnect$/).length, 0)

    // mcp.status.changed drops that server's tools.
    tools.invalidated.length = 0
    fake.emit('mcp.status.changed', { server: 'linear' }, { location: { directory: cwd } })
    await until(() => tools.invalidated.includes('linear'), 'the tools invalidation')
  } finally { await bridge.stop() }
})

test('connector sign-in: the integration\'s OAuth attempt, polled; older credentials replaced; no port held here; sign-out', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  const cwd = '/w'
  const iid = 'mcp_0123456789abcdef'
  fake.state.configEntries = [doc({ mcp: { servers: { linear: { type: 'remote', url: 'https://mcp.linear.app/mcp' } } } }, path.join(cwd, 'opencode.json'))]
  fake.state.mcp = [{ name: 'linear', status: { status: 'needs_auth', error: 'Sign in' }, integrationID: iid }, { name: 'local', status: { status: 'connected' } }]
  fake.state.integrations = [{ id: iid, name: 'linear', metadata: { source: 'mcp' }, methods: [{ type: 'oauth', id: iid, label: 'linear', attempt: { url: 'https://linear.app/oauth/authorize?x=1' } }] }]
  fake.state.credentials = [{ id: 'crd_old', integrationID: iid, label: 'linear', active: true, value: { type: 'oauth', methodID: iid, access: 'old', refresh: 'r', expires: 1 } }, { id: 'crd_other', integrationID: 'anthropic', label: 'Anthropic', active: true, value: { type: 'key', key: 'k' } }]
  try {
    const started = await bridge.handle('mcpServer/oauth/login', { name: 'linear', cwd })
    assert.equal(started.authorizationUrl, 'https://linear.app/oauth/authorize?x=1')
    const [post] = requests(fake, 'POST', `/api/integration/${iid}/connect/oauth`)
    assert.deepEqual(post.body, { methodID: iid })
    assert.equal(decodeURIComponent(post.headers['x-opencode-directory']), cwd, 'the connector\'s own folder')
    const [attempt] = fake.state.attempts.keys()
    await until(() => requests(fake, 'GET', `/api/integration/${iid}/connect/oauth/${attempt}`).length > 0, 'the polling')
    fake.settle(attempt, 'complete')
    await until(() => notes.some((note) => note.method === 'mcpServer/oauthLogin/completed'), 'the completion')
    assert.deepEqual(notes.find((note) => note.method === 'mcpServer/oauthLogin/completed').params, { name: 'linear', success: true, error: null })
    await until(() => !fake.state.credentials.some((entry) => entry.id === 'crd_old'), 'the old credential deleted')
    assert.equal(fake.state.credentials.filter((entry) => entry.integrationID === iid).length, 1)

    // Signed in and connected: answered at once.
    fake.state.mcp[0].status = { status: 'connected' }
    const authOf = async () => (await bridge.handle('mcpServerStatus/list', { cwd, detail: 'statusOnly' })).data.find((row) => row.name === 'linear').authStatus
    assert.equal(await authOf(), 'oAuth', 'connected with a credential')
    notes.length = 0
    await assert.rejects(bridge.handle('mcpServer/oauth/login', { name: 'linear', cwd }), /already signed in/)
    assert.equal(notes.filter((note) => note.method === 'mcpServer/oauthLogin/completed').length, 1)
    // A local connector has no integration.
    fake.state.configEntries[0].info.mcp.servers.local = { type: 'local', command: ['x'] }
    await assert.rejects(bridge.handle('mcpServer/oauth/login', { name: 'local', cwd }), /did not offer an OAuth sign-in/)

    // Sign-out deletes that integration's credentials only.
    await bridge.handle('codeDesktop/mcpServer/logout', { name: 'linear', cwd })
    assert.deepEqual(fake.state.credentials.map((entry) => entry.id), ['crd_other'])
    // Every remote server has an integration: one connected without a credential is anonymous, not OAuth.
    assert.equal(await authOf(), 'unknown')
    assert.equal(bridge.oauthCallbacks.listeners.size, 0)
    assert.equal(requests(fake, 'POST', /\/auth$/).length, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('connector sign-in: a failed attempt is reported, and a second Sign in replaces the first one\'s attempt', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  const iid = 'mcp_0123456789abcdef'
  fake.state.configEntries = [doc({ mcp: { servers: { linear: { type: 'remote', url: 'https://mcp.linear.app/mcp' } } } })]
  fake.state.mcp = [{ name: 'linear', status: { status: 'needs_auth', error: 'Sign in' }, integrationID: iid }]
  fake.state.integrations = [{ id: iid, name: 'linear', methods: [{ type: 'oauth', id: iid, label: 'linear' }] }]
  try {
    await bridge.handle('mcpServer/oauth/login', { name: 'linear', cwd: '/w' })
    const [first] = fake.state.attempts.keys()
    await bridge.handle('mcpServer/oauth/login', { name: 'linear', cwd: '/w' })
    await until(() => (fake.state.cancelledAttempts ?? []).includes(first), 'the first attempt cancelled')
    const second = [...fake.state.attempts.keys()].find((id) => id !== first)
    fake.settle(second, 'failed', 'access_denied')
    await until(() => notes.some((note) => note.method === 'mcpServer/oauthLogin/completed'), 'the completion')
    assert.deepEqual(notes.filter((note) => note.method === 'mcpServer/oauthLogin/completed').map((note) => note.params), [{ name: 'linear', success: false, error: 'access_denied' }])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- skills and commands

test('skills/list on 2.x: skills by id (the built-ins\' ids are not their names), commands with their origin, /goal left out', async () => {
  const { bridge, fake, home } = await v2Bridge()
  const cwd = path.join(home, 'proj')
  const projectDir = path.join(cwd, '.opencode')
  fs.mkdirSync(path.join(projectDir, 'commands'), { recursive: true })
  fs.writeFileSync(path.join(projectDir, 'commands', 'fix.md'), '---\ndescription: Fix an issue\nagent: build\nsubtask: true\n---\nFix issue $1 in $2\n')
  const globalDir = path.join(home, 'xdg', 'opencode')
  fake.state.configEntries = [
    { type: 'directory', path: globalDir },
    doc({ commands: { deploy: { template: 'Deploy $ARGUMENTS', description: 'Deploy', model: { providerID: 'openai', model: 'gpt-5' } } } }, path.join(globalDir, 'opencode.json')),
    { type: 'directory', path: projectDir },
  ]
  fake.state.skills = [
    { id: 'opencode', name: 'OpenCode', description: 'About OpenCode', path: '/builtin/opencode.md', content: '' },
    { id: 'pdf-tools', name: 'PDF', description: 'PDF things\nmore', path: path.join(cwd, '.opencode', 'skills', 'pdf-tools', 'SKILL.md'), content: '', autoinvoke: false },
  ]
  fake.state.mcp = [{ name: 'my server', status: { status: 'connected' } }]
  fake.state.commandList = [
    { name: 'init', description: 'guided AGENTS.md setup' }, { name: 'review', description: 'review changes' }, { name: 'goal', description: 'keep going' },
    { name: 'fix', description: 'Fix an issue' }, { name: 'deploy', description: 'Deploy' }, { name: 'my_server:summarize', description: 'Summarize' }, { name: 'from-plugin' },
  ]
  try {
    const { data: [listed] } = await bridge.handle('skills/list', { cwds: [cwd], forceReload: true })
    assert.deepEqual(fake.state.locationReloads, [cwd])
    const byName = Object.fromEntries(listed.skills.map((row) => [row.name, row]))
    assert.deepEqual([byName.OpenCode.path, byName.OpenCode.scope, byName.OpenCode.codeDesktop.id], ['builtin:opencode', 'system', 'opencode'])
    assert.deepEqual([byName.PDF.scope, byName.PDF.modelInvocable, byName.PDF.shortDescription], ['repo', false, 'PDF things'])
    assert.ok(!('goal' in byName))
    assert.deepEqual([byName.init.scope, byName.init.codeDesktop.kind], ['system', 'builtin'])
    assert.deepEqual([byName.fix.path, byName.fix.scope, byName.fix.argumentHint], [path.join(projectDir, 'commands', 'fix.md'), 'repo', '[arg1] [arg2]'])
    assert.deepEqual(byName.fix.codeDesktop, { kind: 'command', template: 'Fix issue $1 in $2', agent: 'build', subtask: true })
    assert.deepEqual([byName.deploy.scope, byName.deploy.argumentHint, byName.deploy.codeDesktop.model], ['user', '[arguments]', 'openai/gpt-5'])
    assert.deepEqual(byName['my_server:summarize'].codeDesktop, { server: 'my server', kind: 'mcpPrompt' })
    assert.deepEqual([byName['from-plugin'].path, byName['from-plugin'].scope], ['command:from-plugin', 'user'])
    assert.deepEqual(bridge.settings().skillIdsV2, { OpenCode: ['opencode'], PDF: ['pdf-tools'] })
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('skills/config/write on 2.x: a built-in turned off is denied by its id too (overlay and the live rules)', async () => {
  const { bridge, fake } = await v2Bridge()
  fake.state.skills = [{ id: 'opencode', name: 'OpenCode', description: 'x', path: '/builtin/opencode.md', content: '' }]
  try {
    const result = await bridge.handle('skills/config/write', { path: 'builtin:opencode', enabled: false, cwd: '/w' })
    assert.deepEqual(result, { effectiveEnabled: false })
    assert.deepEqual(bridge.settings().disabledSkills, ['OpenCode'])
    const overlay = JSON.parse(fs.readFileSync(bridge.config.configPath, 'utf8'))
    assert.deepEqual(overlay.permissions, [{ action: 'skill', resource: 'OpenCode', effect: 'deny' }, { action: 'skill', resource: 'opencode', effect: 'deny' }])
    const rules = await bridge.rulesV2({ permission: { mode: 'default', sandbox: 'workspace-write', approvalPolicy: 'on-request' }, cwd: '/w' })
    assert.ok(rules.some((rule) => rule.action === 'skill' && rule.resource === 'opencode' && rule.effect === 'deny'))
    assert.ok(!rules.some((rule) => rule.action === 'external_directory' && rule.resource.startsWith('/builtin')), 'the embedded skills have no folder')
    const listed = (await bridge.handle('skills/list', { cwds: ['/w'] })).data[0].skills.find((row) => row.name === 'OpenCode')
    assert.equal(listed.enabled, false)
    await bridge.handle('skills/config/write', { path: 'builtin:opencode', enabled: true, cwd: '/w' })
    assert.equal(JSON.parse(fs.readFileSync(bridge.config.configPath, 'utf8')).permissions, undefined)
    await assert.rejects(bridge.handle('skills/config/write', { path: 'command:init', enabled: false }), /Commands cannot be turned off/)
  } finally { await bridge.stop() }
})

test('skills/config/write on 2.x: a skill file right in a skills root has a switch (its id is the file name); command files do not', async () => {
  const { bridge, fake, home } = await v2Bridge()
  const root = path.join(home, 'xdg', 'opencode', 'skills')
  fake.state.skills = [{ id: 'review', name: 'Code review', description: 'x', path: path.join(root, 'review.md'), content: '' }]
  try {
    assert.deepEqual(await bridge.handle('skills/config/write', { path: path.join(root, 'review.md'), enabled: false, cwd: '/w' }), { effectiveEnabled: false })
    assert.deepEqual(bridge.settings().disabledSkills, ['Code review'])
    assert.deepEqual(bridge.settings().skillIdsV2, { 'Code review': ['review'] })
    // Not listed (yet): a .md in a skills root is still a skill, named by its file.
    assert.deepEqual(await bridge.handle('skills/config/write', { path: path.join(root, 'later.md'), enabled: false, cwd: '/w' }), { effectiveEnabled: false })
    assert.ok(bridge.settings().disabledSkills.includes('later'))
    await assert.rejects(bridge.handle('skills/config/write', { path: path.join(home, 'proj', '.opencode', 'commands', 'fix.md'), enabled: false, cwd: '/w' }), /Commands cannot be turned off/)
    await assert.rejects(bridge.handle('skills/config/write', { path: path.join(home, 'proj', 'notes.md'), enabled: false, cwd: '/w' }), /Commands cannot be turned off/)
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- plugins

test('plugin/installed on 2.x: GET /api/plugin with origins; built-ins and the bridge\'s own left out; 1.x plugins incompatible', async () => {
  const { bridge, fake, home } = await v2Bridge()
  const cwd = path.join(home, 'proj')
  const globalDir = path.join(home, 'xdg', 'opencode')
  const globalPlugin = path.join(globalDir, 'plugins', 'old-style.js')
  fs.mkdirSync(path.dirname(globalPlugin), { recursive: true })
  fs.writeFileSync(globalPlugin, `export const Old = async () => ({ 'chat.message': async () => {} })\n`)
  const npmDir = path.join(home, 'cache', 'opencode', 'npm', 'acme-plugin@1.2.0', '3', 'node_modules', 'acme-plugin')
  fs.mkdirSync(npmDir, { recursive: true })
  fs.writeFileSync(path.join(npmDir, 'package.json'), JSON.stringify({ name: 'acme-plugin', main: 'dist/main.js' }))
  fs.mkdirSync(path.join(npmDir, 'dist'))
  fs.writeFileSync(path.join(npmDir, 'dist', 'main.js'), `export default { id: 'acme', setup: async (ctx) => { await ctx.session.hook('context', () => {}); await ctx.tool.transform((e) => e.add({ name: 'acme_go' })) } }\n`)
  bridge.saveSettings({ plugins: { installed: ['mine-plugin'], disabled: [] } })
  fake.state.configEntries = (directory) => [
    { type: 'directory', path: globalDir },
    doc({ plugins: ['acme-plugin@1.2.0'] }, path.join(globalDir, 'opencode.json')),
    doc({ plugins: ['mine-plugin'] }, bridge.config.configPath),
    ...(directory === cwd ? [doc({ plugins: [{ package: 'proj-plugin', options: { level: 2 } }] }, path.join(cwd, 'opencode.json'))] : []),
  ]
  const failed = (error) => ({ status: 'failed', error })
  fake.state.plugins = (directory) => [
    { id: 'opencode.command', source: { type: 'builtin' }, features: { server: true }, state: { status: 'active' } },
    { id: 'code-desktop', source: { type: 'local', path: bridge.config.pluginDir }, features: { server: true }, state: { status: 'active' } },
    { source: { type: 'local', path: globalPlugin }, features: {}, state: failed('Plugin must export a default definition with an id and an effect or setup function.') },
    { id: 'acme', source: { type: 'package', target: 'acme-plugin@1.2.0', version: '1.2.0', outdated: true }, features: { server: true }, state: { status: 'active' } },
    { source: { type: 'package', target: 'mine-plugin' }, features: {}, state: failed('npm install failed') },
    ...(directory === cwd ? [{ id: 'proj', source: { type: 'package', target: 'proj-plugin' }, features: { server: true }, state: { status: 'active' } }] : []),
  ]
  try {
    const { marketplaces: [market] } = await bridge.handle('plugin/installed', { cwds: [cwd] })
    const byId = Object.fromEntries(market.plugins.map((row) => [row.id, row]))
    assert.deepEqual(Object.keys(byId).sort(), [globalPlugin, 'acme-plugin@1.2.0', 'mine-plugin', 'proj-plugin'].sort())
    assert.equal(byId[globalPlugin].codeDesktop.origin, 'globalFolder')
    assert.equal(byId[globalPlugin].codeDesktop.incompatible, true)
    assert.match(byId[globalPlugin].codeDesktop.loadError, /Written for OpenCode 1\.x/)
    assert.deepEqual([byId['acme-plugin@1.2.0'].codeDesktop.origin, byId['acme-plugin@1.2.0'].codeDesktop.loadError, byId['acme-plugin@1.2.0'].codeDesktop.outdated, byId['acme-plugin@1.2.0'].name], ['globalConfig', null, true, 'acme-plugin'])
    assert.deepEqual([byId['mine-plugin'].codeDesktop.origin, byId['mine-plugin'].codeDesktop.removable, byId['mine-plugin'].codeDesktop.loadError], ['codeDesktop', true, 'npm install failed'])
    assert.deepEqual([byId['proj-plugin'].codeDesktop.origin, byId['proj-plugin'].codeDesktop.project, byId['proj-plugin'].codeDesktop.options], ['projectConfig', cwd, { level: 2 }])

    const read = await bridge.handle('plugin/read', { pluginName: 'acme-plugin@1.2.0' })
    assert.deepEqual(read.plugin.hooks.map((hook) => hook.key), ['session.context', 'tool.transform'])
    assert.deepEqual(read.plugin.tools, [{ name: 'acme_go', description: '' }])
    // A package with separate entry points: its `server` subpath is what v2 loads (plugin/src/host.ts), so it is read.
    fs.writeFileSync(path.join(npmDir, 'package.json'), JSON.stringify({ name: 'acme-plugin', exports: { '.': './dist/main.js', './server': { import: './dist/server.js' } } }))
    fs.writeFileSync(path.join(npmDir, 'dist', 'main.js'), 'export {}\n')
    fs.writeFileSync(path.join(npmDir, 'dist', 'server.js'), `export default { id: 'acme', setup: async (ctx) => { await ctx.tool.transform((e) => e.add({ name: 'acme_srv' })) } }\n`)
    assert.deepEqual((await bridge.handle('plugin/read', { pluginName: 'acme-plugin@1.2.0' })).plugin.tools, [{ name: 'acme_srv', description: '' }])
    // A local folder without an exports map: server.* before index.*.
    const local = path.join(home, 'local-plugin')
    fs.mkdirSync(local)
    fs.writeFileSync(path.join(local, 'index.js'), 'export {}\n')
    fs.writeFileSync(path.join(local, 'server.ts'), 'export default { id: "loc", setup: async (ctx) => {} }\n')
    assert.equal(bridge.pluginSourceFileV2(local), path.join(local, 'server.ts'))
    fs.rmSync(path.join(local, 'server.ts'))
    assert.equal(bridge.pluginSourceFileV2(local), path.join(local, 'index.js'))
    assert.equal(requests(fake, 'GET', /\/experimental\/tool/).length, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('plugin.updated: a new failure is a notice and codeDesktop/plugin/changed, once; an install waits for its verdict', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  bridge.v2.pluginVerdictMs = 2000
  bridge.v2.pluginPollMs = 10
  fake.state.plugins = [{ source: { type: 'package', target: 'old-plugin' }, features: {}, state: { status: 'failed', error: 'Plugin must export a default definition with an id and an effect or setup function.' } }]
  try {
    fake.emit('plugin.updated', {}, { location: { directory: bridge.homeDir() } })
    await until(() => notes.some((note) => note.method === 'codeDesktop/plugin/changed'), 'plugin/changed')
    const warning = notes.find((note) => note.method === 'configWarning')
    assert.match(warning.params.summary, /^Plugin old-plugin failed to load \(written for OpenCode 1\.x\)/)
    fake.emit('plugin.updated', {}, { location: { directory: bridge.homeDir() } })
    await new Promise((resolve) => setTimeout(resolve, 60))
    assert.equal(notes.filter((note) => note.method === 'codeDesktop/plugin/changed').length, 1, 'nothing new')

    // The bridge's own plugin failing is a notice too (never a Customize row).
    fake.state.plugins.push({ id: 'code-desktop', source: { type: 'local', path: bridge.config.pluginDir }, features: {}, state: { status: 'failed', error: 'boom' } })
    fake.emit('plugin.updated', {}, {})
    await until(() => notes.filter((note) => note.method === 'codeDesktop/plugin/changed').length === 2, 'the second change')
    assert.ok(notes.some((note) => note.method === 'configWarning' && /OpenClaude Desktop's OpenCode plugin failed to load: boom/.test(note.params.summary)))

    // Two folders publishing plugin.updated inside one burst: both are read again (each location has its own list).
    const project = path.join(bridge.homeDir(), 'proj')
    const base = fake.state.plugins
    fake.state.plugins = (directory) => (directory === project ? [...base, { source: { type: 'package', target: 'proj-only' }, features: {}, state: { status: 'failed', error: 'proj boom' } }] : base)
    bridge.v2.pluginDebounceMs = 50
    fake.emit('plugin.updated', {}, { location: { directory: project } })
    fake.emit('plugin.updated', {}, { location: { directory: bridge.homeDir() } })
    await until(() => notes.some((note) => note.method === 'configWarning' && /Plugin proj-only failed to load: proj boom/.test(note.params.summary)), 'the project folder\'s failure')
    fake.state.plugins = base

    // An install whose plugin fails is rolled back.
    const result = await bridge.handle('codeDesktop/plugin/install', { spec: 'old-plugin' })
    assert.equal(result.application, 'failed')
    assert.match(result.error.diagnostic, /Written for OpenCode 1\.x/)
    assert.deepEqual(bridge.pluginSettings().installed, [])
    // One that loads is kept.
    fake.state.plugins.push({ id: 'good', source: { type: 'package', target: 'good-plugin@2' }, features: {}, state: { status: 'active' } })
    assert.equal((await bridge.handle('codeDesktop/plugin/install', { spec: 'good-plugin@2' })).application, 'applied')
    assert.deepEqual(JSON.parse(fs.readFileSync(bridge.config.configPath, 'utf8')).plugins, ['good-plugin@2'])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- agents and tools

test('agents/write and /remove on 2.x: v2 frontmatter in the global config folder, the list waited for', async () => {
  const { bridge, fake, home } = await v2Bridge()
  bridge.v2.agentWaitMs = 2000
  try {
    const writing = bridge.handle('codeDesktop/agents/write', { scope: 'user', name: 'reviewer', description: 'Reviews', mode: 'subagent', prompt: 'You review.', deny: ['bash', 'task', 'lsp'] })
    await until(() => requests(fake, 'GET', '/api/agent').length > 0, 'the agent list read')
    setTimeout(() => fake.state.agents.push({ id: 'reviewer', name: 'reviewer', mode: 'subagent', hidden: false, permissions: [] }), 30)
    const { path: file } = await writing
    assert.equal(file, path.join(home, 'xdg', 'opencode', 'agents', 'reviewer.md'))
    const text = fs.readFileSync(file, 'utf8')
    assert.match(text, /permissions:\n {2}- action: shell\n {4}resource: "\*"\n {4}effect: deny\n {2}- action: subagent/)
    assert.ok(!/lsp|permission:\n/.test(text))
    assert.equal(requests(fake, 'DELETE', '/api/debug/location').length, 0, 'v2 watches the folders')
    const listed = await bridge.handle('codeDesktop/agents/list', { cwd: home })
    assert.deepEqual(listed.agents.map((agent) => [agent.name, agent.scope]), [['build', 'builtin'], ['reviewer', 'user']])
    const removing = bridge.handle('codeDesktop/agents/remove', { cwd: home, name: 'reviewer' })
    setTimeout(() => { fake.state.agents = fake.state.agents.filter((agent) => agent.id !== 'reviewer') }, 30)
    await removing
    assert.equal(fs.existsSync(file), false)
  } finally { await bridge.stop() }
})

test('tools/list on 2.x: the fixed built-ins (no list, lsp, codesearch, todoread), MCP tools, skills; the preview\'s tools from the plugin', async () => {
  const { bridge, fake } = await v2Bridge()
  fake.state.configEntries = [doc({ mcp: { servers: { docs: { type: 'local', command: ['docs'] } } } })]
  fake.state.skills = [{ id: 'pdf', name: 'pdf', description: 'PDFs', path: '/s/pdf/SKILL.md', content: '' }]
  try {
    const listed = await bridge.handle('codeDesktop/tools/list', { cwd: '/w' })
    const names = listed.tools.map((tool) => tool.name)
    assert.deepEqual(names, ['edit', 'experimental_image_generate', 'glob', 'grep', 'question', 'read', 'shell', 'skill', 'subagent', 'todowrite', 'webfetch', 'websearch'])
    assert.deepEqual(listed.servers, [{ name: 'docs', tools: [{ name: 'docs_search', tool: 'search', description: 'Search it' }] }])
    assert.deepEqual(listed.skills, [{ name: 'pdf', description: 'PDFs' }])
    assert.equal(requests(fake, 'GET', /\/experimental\/tool/).length, 0)
    fs.mkdirSync(path.join(bridge.config.runtimeDir, 'prompts'), { recursive: true })
    bridge.store.update('ses_x', { cwd: '/w' })
    fs.writeFileSync(path.join(bridge.config.runtimeDir, 'prompts', 'ses_x.json'), JSON.stringify({ at: 1, default: ['Base prompt'], final: ['Base prompt'], tools: ['read', 'shell', 'docs_search'] }))
    const preview = await bridge.handle('codeDesktop/systemPrompt/preview', { cwd: '/w' })
    assert.deepEqual(preview.tools, ['read', 'shell', 'docs_search'])
  } finally { await bridge.stop() }
})
