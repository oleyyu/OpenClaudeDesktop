// OpenCode 2.x bridge, live round 1 (the user's run of the smoke and the probe against the real 2.2.5): each failure
// reproduced on the in-process v2 fake with the semantics read from the 2.2.5 source —
//   * serve opens OPENCODE_DB but never creates its folder (ENOENT): AgentServerV2 makes it, whoever the caller is
//   * a custom model's efforts are v2's variants, built from `capabilities.reasoning` (config/plugin/provider.ts,
//     variant.ts): `{supported:true}` without a control builds none, left out builds the package's defaults
//   * skills/list and the / menu after forceReload: DELETE /api/debug/location brings the location back without its
//     plugins run, and GET /api/skill / GET /api/command don't wait for them (they answered []); GET /api/agent does,
//     and its one wait covers the whole first activation (plugin/supervisor.ts holds the latch while the layer is built)
//   * a turned-off skill: v2 checks `skill` by the skill's id (a SKILL.md's folder name), and a skill list change
//     reaches the model as an update frozen into the session's history (skill/instructions.ts, instruction-state.ts),
//     so an earlier update naming the skill stays in every later request of that session
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { AgentServerV2, ensureDbDir } from '../packages/opencode-bridge/src/v2/server.js'
import { providerOverlayV2 } from '../packages/opencode-bridge/src/v2/config.js'
import { promptInputV2 } from '../packages/opencode-bridge/src/v2/live.js'
import { availableSkillsV2, configModelsV2, createV2Fake, noClaude, skillGuidanceV2 } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-livefix-'))); made.push(dir); return dir }
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

/** A started v2 Bridge on the fake (no listen(), no child process). */
async function v2Bridge({ fake = createV2Fake({ cwd: '/home' }) } = {}) {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), XDG_CACHE_HOME: path.join(home, 'cache'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = (input, init) => fake.fetch(input, init)
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { fake.serve(options.env); return fakeChild() }
  bridge.mcpTools.tools = async () => []
  bridge.mcpTools.invalidate = () => {}
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  return { bridge, fake, home, notes, logs }
}
const requests = (fake, method, pathname) => fake.state.requests.filter((request) => request.method === method && request.path === pathname)
const BUILTIN_SKILLS = [
  { id: 'opencode', name: 'OpenCode', description: 'About OpenCode', path: '/builtin/opencode.md', content: '' },
  { id: 'report', name: 'Report', description: 'Report an issue', path: '/builtin/report.md', content: '' },
]

// ---------------------------------------------------------------- OPENCODE_DB's folder

test('AgentServerV2 creates OPENCODE_DB\'s folder before serve starts (the probe drives it without db.js: ENOENT)', async () => {
  const home = tmp()
  const db = path.join(home, 'probe', 'opencode-v2', 'opencode.db')
  const fake = createV2Fake()
  let seen = null
  const server = new AgentServerV2({
    flavor: OC2, binary: '/opt/opencode', env: { HOME: home }, db, fetch: fake.fetch,
    spawn: (command, args, options) => { seen = { env: options.env, folder: fs.existsSync(path.dirname(db)) }; return fakeChild() },
  })
  fake.state.password = server.password
  try {
    await server.start()
    assert.equal(seen.env.OPENCODE_DB, db)
    assert.equal(seen.folder, true, 'the folder exists when serve is spawned')
    assert.equal(fs.statSync(path.dirname(db)).mode & 0o777, 0o700)
  } finally { await server.stop() }

  // A caller that only sets the environment (a workflow runner's own serve) gets the folder too.
  const viaEnv = path.join(home, 'runner', 'db', 'opencode.db')
  const fake2 = createV2Fake()
  const server2 = new AgentServerV2({ flavor: OC2, binary: '/opt/opencode', env: { HOME: home, OPENCODE_DB: viaEnv }, fetch: fake2.fetch, spawn: () => fakeChild() })
  fake2.state.password = server2.password
  try {
    await server2.start()
    assert.ok(fs.statSync(path.dirname(viaEnv)).isDirectory())
  } finally { await server2.stop() }

  // Relative (v2 resolves it under its own data folder) and :memory: are v2's to place; a failure is only logged.
  assert.equal(ensureDbDir('opencode.db'), null)
  assert.equal(ensureDbDir(':memory:'), null)
  assert.equal(ensureDbDir(undefined), null)
  const file = path.join(home, 'a-file')
  fs.writeFileSync(file, '')
  const lines = []
  assert.equal(ensureDbDir(path.join(file, 'opencode.db'), (line) => lines.push(line)), null)
  assert.match(lines.join('\n'), /OPENCODE_DB folder/)
})

// ---------------------------------------------------------------- reasoning efforts of a custom provider model

test('a custom provider\'s reasoning model gets v2\'s default efforts; one without reasoning gets none (the smoke\'s fake model had [])', async () => {
  const providers = [{
    route: 'fake', displayName: 'Fake Lab', api: 'anthropic-messages', baseURL: 'http://127.0.0.1:9/v1', models: ['fake-model', 'plain', 'claude-sonnet-4-5'],
    modelInfo: { 'fake-model': { name: 'Fake Model', reasoning: true, attachment: true, limit: { context: 200000, output: 8000 } }, plain: { name: 'Plain' }, 'claude-sonnet-4-5': { reasoning: true, limit: { context: 200000, output: 64000 } } },
  }, { route: 'compat', api: 'openai-completions', baseURL: 'http://127.0.0.1:9/v1', models: ['r1', 'chat'], modelInfo: { r1: { reasoning: true }, chat: {} } }]
  const overlay = providerOverlayV2(providers, {})
  // Before the fix the overlay said {supported:true}, which v2 turns into no variant at all.
  assert.deepEqual(configModelsV2({ fake: { ...overlay.fake, models: { m: { capabilities: { reasoning: { supported: true } } } } } })[0].variants, [])
  const models = configModelsV2(overlay)
  const variants = Object.fromEntries(models.map((model) => [`${model.providerID}/${model.id}`, model.variants.map((variant) => variant.id)]))
  assert.deepEqual(variants, {
    'fake/fake-model': ['low', 'medium', 'high', 'xhigh', 'max'],
    'fake/plain': [],
    'fake/claude-sonnet-4-5': ['high', 'max'],
    'compat/r1': ['low', 'medium', 'high'],
    'compat/chat': [],
  })

  const fake = createV2Fake({ cwd: '/home' })
  fake.state.providers = [{ id: 'fake', name: 'Fake Lab', activation: 'enabled', package: 'aisdk:@ai-sdk/anthropic' }, { id: 'compat', name: 'compat', activation: 'enabled', package: 'aisdk:@ai-sdk/openai-compatible' }]
  fake.state.models = models
  fake.state.defaultModel = models[0]
  const { bridge } = await v2Bridge({ fake })
  try {
    const { data } = await bridge.handle('model/list', { limit: 100 })
    const entry = data.find((model) => model.id === 'fake/fake-model')
    assert.equal(entry.isDefault, true)
    assert.equal(entry.contextWindow, 200000)
    assert.deepEqual(entry.supportedReasoningEfforts.map((effort) => effort.reasoningEffort), ['default', 'low', 'medium', 'high', 'xhigh', 'max'])
    assert.deepEqual(data.find((model) => model.id === 'fake/plain').supportedReasoningEfforts, [])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- skills/list and the / menu after a reload

test('skills/list with forceReload waits for the reloaded location\'s plugins: project skills and commands are listed', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, home } = await v2Bridge({ fake })
  const cwd = path.join(home, 'workspace')
  const skillFile = path.join(cwd, '.opencode', 'skills', 'smoke-skill', 'SKILL.md')
  fs.mkdirSync(path.dirname(skillFile), { recursive: true })
  fs.writeFileSync(skillFile, '---\nname: smoke-skill\ndescription: SMOKE_SKILL_DESCRIPTION\n---\n\nDo it.\n')
  fake.state.skills = [...BUILTIN_SKILLS, { id: 'smoke-skill', name: 'smoke-skill', description: 'SMOKE_SKILL_DESCRIPTION', path: skillFile, content: '' }]
  try {
    const { data: [listed] } = await bridge.handle('skills/list', { cwds: [cwd], forceReload: true })
    assert.deepEqual(fake.state.locationReloads, [cwd])
    const skill = listed.skills.find((row) => row.name === 'smoke-skill')
    assert.ok(skill, listed.skills.map((row) => row.name).join(','))
    assert.deepEqual([skill.enabled, skill.scope, skill.path, skill.codeDesktop.id], [true, 'repo', skillFile, 'smoke-skill'])
    assert.ok(listed.skills.some((row) => row.name === 'init' && row.codeDesktop.kind === 'builtin'), 'commands too')
    // One awaitPlugins request, before the listing: no polling.
    const agent = fake.state.requests.findIndex((request) => request.method === 'GET' && request.path === '/api/agent')
    const reload = fake.state.requests.findIndex((request) => request.method === 'DELETE' && request.path === '/api/debug/location')
    assert.ok(agent > reload, 'the activation was waited for')
    assert.equal(requests(fake, 'GET', '/api/agent').length, 1)
    assert.equal(fake.state.coldLocations.size, 0)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('skills/list with forceReload: a location that lists no skill is not polled, only logged, then listed as it is', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, logs } = await v2Bridge({ fake })
  fake.state.skills = []
  try {
    const { data: [listed] } = await bridge.handle('skills/list', { cwds: ['/w'], forceReload: true })
    assert.deepEqual(listed.skills.map((row) => row.name), ['init', 'review'])
    assert.equal(requests(fake, 'GET', '/api/agent').length, 1)
    assert.match(logs.join('\n'), /no skills listed after the reload/)
  } finally { await bridge.stop() }
})

test('skills/list: a cwd reached through a symlink still marks the project\'s skills repo (v2 names files under the real folder)', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, home } = await v2Bridge({ fake })
  const real = path.join(home, 'real-workspace')
  const link = path.join(home, 'linked-workspace')
  const skillFile = path.join(real, '.opencode', 'skills', 'smoke-skill', 'SKILL.md')
  fs.mkdirSync(path.dirname(skillFile), { recursive: true })
  fs.symlinkSync(real, link)
  fake.state.skills = [...BUILTIN_SKILLS, { id: 'smoke-skill', name: 'smoke-skill', description: 'SMOKE_SKILL_DESCRIPTION', path: skillFile, content: '' }, { id: 'mine', name: 'mine', description: 'user skill', path: path.join(home, 'xdg', 'opencode', 'skills', 'mine', 'SKILL.md'), content: '' }]
  try {
    const { data: [listed] } = await bridge.handle('skills/list', { cwds: [link] })
    assert.equal(listed.cwd, link)
    const scope = Object.fromEntries(listed.skills.filter((row) => !row.codeDesktop.kind).map((row) => [row.name, row.scope]))
    assert.deepEqual(scope, { OpenCode: 'system', Report: 'system', 'smoke-skill': 'repo', mine: 'user' })
  } finally { await bridge.stop() }
})

test('a project command added while running is in the / menu after forceReload and runs as POST …/command', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, home, notes } = await v2Bridge({ fake })
  const cwd = path.join(home, 'workspace')
  fs.mkdirSync(cwd, { recursive: true })
  const projectDir = path.join(cwd, '.opencode')
  try {
    const { thread } = await bridge.handle('thread/start', { cwd })
    // Added after the location was loaded, as the smoke does.
    fs.mkdirSync(path.join(projectDir, 'commands'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, 'commands', 'smoke-cmd.md'), '---\ndescription: Smoke command\n---\nCOMMAND_TEMPLATE_RAN with $ARGUMENTS\n')
    fake.state.configEntries = [{ type: 'directory', path: projectDir }]
    fake.state.skills = BUILTIN_SKILLS
    fake.state.commandList = [...fake.state.commandList, { name: 'goal', description: 'keep going' }, { name: 'smoke-cmd', description: 'Smoke command' }]
    fake.state.commands['smoke-cmd'] = 'prompt'
    const { data: [listed] } = await bridge.handle('skills/list', { cwds: [cwd], forceReload: true })
    const command = listed.skills.find((row) => row.name === 'smoke-cmd')
    assert.ok(command, 'command listed')
    assert.deepEqual([command.description, command.path, command.scope], ['Smoke command', path.join(projectDir, 'commands', 'smoke-cmd.md'), 'repo'])
    assert.ok(!listed.skills.some((row) => row.name === 'goal'))
    const from = notes.length
    await bridge.handle('turn/start', { threadId: thread.id, input: [{ type: 'text', text: '/smoke-cmd hello-args' }, { type: 'skill', name: 'smoke-cmd', path: command.path }] })
    assert.deepEqual(requests(fake, 'POST', `/api/session/${thread.id}/command`).at(-1).body, { name: 'smoke-cmd', text: 'hello-args', delivery: 'steer' })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/started'), 'the command turn')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('the / menu: a skill file right in a skills root is a skill by its file name, a nested command file a command', () => {
  assert.deepEqual(promptInputV2([{ type: 'text', text: '/Code review' }, { type: 'skill', name: 'Code review', path: '/Users/me/.config/opencode/skills/review.md' }]), { text: '/Code review', files: [], skills: [{ id: 'review' }], command: null })
  assert.equal(promptInputV2([{ type: 'text', text: '/sub/x go' }, { type: 'skill', name: 'sub/x', path: '/w/.opencode/commands/sub/x.md' }]).command, 'sub/x')
  assert.equal(promptInputV2([{ type: 'text', text: '/fix 1' }, { type: 'skill', name: 'fix', path: '/w/.opencode/command/fix.md' }]).command, 'fix')
  assert.deepEqual(promptInputV2([{ type: 'text', text: 'go' }, { type: 'skill', name: 'Smoke', path: '/w/.claude/skills/smoke-skill/SKILL.md' }]).skills, [{ id: 'smoke-skill' }])
  // The user's own folders above the config directory don't count: the nearest skills root / commands folder decides.
  assert.deepEqual(promptInputV2([{ type: 'text', text: '/Code review' }, { type: 'skill', name: 'Code review', path: '/Users/me/dev/commands/app/.opencode/skills/review.md' }]), { text: '/Code review', files: [], skills: [{ id: 'review' }], command: null })
  assert.equal(promptInputV2([{ type: 'text', text: '/x' }, { type: 'skill', name: 'x', path: '/Users/me/skills/app/.opencode/commands/x.md' }]).command, 'x')
  assert.equal(promptInputV2([{ type: 'text', text: '/x' }, { type: 'skill', name: 'x', path: '/Users/me/commands/app/.opencode/skills/x/SKILL.md' }]).command, null)
})

test('skills/config/write: a skill file right in a skills root under a `commands` folder of the user\'s is a skill, not a command', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, home } = await v2Bridge({ fake })
  const cwd = path.join(home, 'commands', 'app')
  const file = path.join(cwd, '.opencode', 'skills', 'review.md')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fake.state.skills = [...BUILTIN_SKILLS, { id: 'review', name: 'Code review', description: 'review', path: file, content: '' }]
  try {
    assert.deepEqual(await bridge.handle('skills/config/write', { path: file, enabled: false, cwd }), { effectiveEnabled: false })
    assert.ok(bridge.disabledSkills().includes('Code review'))
    await assert.rejects(bridge.handle('skills/config/write', { path: path.join(cwd, '.opencode', 'commands', 'sub', 'x.md'), enabled: false, cwd }), /Commands cannot be turned off/)
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- turning a skill off

test('skills/config/write off: the live session denies the skill by its id (folder name ≠ name); v2 sends a removal, the earlier update stays in history', async () => {
  const fake = createV2Fake({ cwd: '/home' })
  const { bridge, home } = await v2Bridge({ fake })
  const cwd = path.join(home, 'workspace')
  fs.mkdirSync(cwd, { recursive: true })
  const skillFile = path.join(cwd, '.opencode', 'skills', 'smoke-skill', 'SKILL.md')
  const smoke = { id: 'smoke-skill', name: 'Smoke Skill', description: 'SMOKE_SKILL_DESCRIPTION', path: skillFile, content: '' }
  try {
    const { thread } = await bridge.handle('thread/start', { cwd, approvalPolicy: 'on-request', sandbox: 'workspace-write' })
    const session = () => fake.state.sessions.find((entry) => entry.id === thread.id)
    // The session started before the skill existed: its system prompt lists the built-ins only.
    fake.state.skills = BUILTIN_SKILLS
    const history = [skillGuidanceV2(null, availableSkillsV2(fake.state.skills, session().permissions ?? []))]
    assert.doesNotMatch(history[0], /SMOKE_SKILL_DESCRIPTION/)
    // The skill appears ("Skills on check"): the next request carries an update naming it, frozen into the history.
    fake.state.skills = [...BUILTIN_SKILLS, smoke]
    let previous = availableSkillsV2(BUILTIN_SKILLS, session().permissions ?? [])
    let current = availableSkillsV2(fake.state.skills, session().permissions ?? [])
    history.push(skillGuidanceV2(previous, current))
    assert.match(history.at(-1), /New skills are available[\s\S]*SMOKE_SKILL_DESCRIPTION/)

    const row = (await bridge.handle('skills/list', { cwds: [cwd] })).data[0].skills.find((entry) => entry.name === 'Smoke Skill')
    assert.deepEqual([row.path, row.codeDesktop.id], [skillFile, 'smoke-skill'])
    assert.deepEqual(await bridge.handle('skills/config/write', { path: row.path, enabled: false, cwd }), { effectiveEnabled: false })
    // The live session's rules deny it by name and by id (v2 evaluates the id), after the read tools' `skill * allow`.
    const rules = session().permissions
    assert.ok(rules.some((rule) => rule.action === 'skill' && rule.resource === 'smoke-skill' && rule.effect === 'deny'), JSON.stringify(rules))
    assert.ok(rules.findIndex((rule) => rule.action === 'skill' && rule.resource === 'smoke-skill') > rules.findIndex((rule) => rule.action === 'skill' && rule.effect === 'allow'))
    const overlay = JSON.parse(fs.readFileSync(bridge.config.configPath, 'utf8'))
    assert.deepEqual(overlay.permissions, [{ action: 'skill', resource: 'Smoke Skill', effect: 'deny' }, { action: 'skill', resource: 'smoke-skill', effect: 'deny' }])

    // "Skills off check": what v2 offers now leaves the skill out, and the update says so by id …
    previous = current
    current = availableSkillsV2(fake.state.skills, rules)
    assert.deepEqual(current.map((skill) => skill.id), ['opencode', 'report'])
    history.push(skillGuidanceV2(previous, current))
    assert.equal(history.at(-1), 'The following skill IDs are no longer available and must not be used: smoke-skill.')
    // … but the request still holds the earlier update (the smoke's doesNotMatch over the whole request was wrong).
    assert.match(history.join('\n'), /SMOKE_SKILL_DESCRIPTION/)
    // A session started now never sees it.
    const fresh = (await bridge.handle('thread/start', { cwd, approvalPolicy: 'on-request', sandbox: 'workspace-write' })).thread
    const freshRules = fake.state.sessions.find((entry) => entry.id === fresh.id).permissions
    assert.doesNotMatch(skillGuidanceV2(null, availableSkillsV2(fake.state.skills, freshRules)), /SMOKE_SKILL_DESCRIPTION/)

    // Without the id the name alone would not hide it: v2 checks `skill` by id.
    assert.equal(availableSkillsV2([smoke], [{ action: 'skill', resource: '*', effect: 'allow' }, { action: 'skill', resource: 'Smoke Skill', effect: 'deny' }]).length, 1)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})
