// MiMo Code permissions through the opencode-bridge: background actors read the session ruleset (they never ask),
// the user's own config denies outlast the bridge's rules, plan files outside the workspace stay writable, and the
// compose-only skills stay hidden. MiMo's evaluation is emulated with its own merge order (agent rules, user config,
// session rules; findLast), as in work/agents/sources/mimo/packages/opencode/src/agent/agent.ts and permission/evaluate.ts.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { applyPermissionParams, configRules, decide, defaultPermission, evaluateRules, modeGrantRules, sessionRules, userOverrides } from '../packages/opencode-bridge/src/policy.js'
import { pluginSource } from '../packages/opencode-bridge/src/plugin.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-mimo-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const MIMO = FLAVORS.mimo
const DATA_PLANS = '/data/mimocode/plans'
const rule = (permission, action, pattern = '*') => ({ permission, pattern, action })
// MiMo's built-in defaults for build / general (agent.ts), before the user config and the session ruleset.
const AGENT = [rule('*', 'allow'), rule('doom_loop', 'ask'), rule('skill', 'allow'), rule('skill', 'deny', 'compose:*'), rule('plan_exit', 'deny'), rule('external_directory', 'ask'), rule('question', 'deny'), rule('read', 'allow'), rule('read', 'ask', '*.env')]
const state = (mode, extra = {}) => ({ ...defaultPermission(), mode, extraRoots: ['/extra'], ...extra })
const mimoRules = (mode, options = {}) => sessionRules(state(mode), {
  readTools: MIMO.readTools, planPaths: [`${DATA_PLANS}/*`, '.mimocode/plans/*.md'], planDirs: [DATA_PLANS, '/w/.mimocode/plans'], modeRules: true,
  roots: ['/extra'], hiddenSkills: MIMO.hiddenSkills, ...options,
})
// What a background actor gets for one call (no person to ask: `ask` fails closed as a deny).
const actor = (session, permission, pattern, user = []) => evaluateRules([...AGENT, ...user, ...session], permission, pattern)

test('flavors: only MiMo grants the mode in the ruleset and hides its compose skills', () => {
  assert.equal(FLAVORS.mimo.modeRules, true)
  assert.deepEqual([...FLAVORS.mimo.hiddenSkills], ['compose:*'])
  assert.equal(FLAVORS.opencode.modeRules, false)
  assert.deepEqual([...FLAVORS.opencode.hiddenSkills], [])
})

test('MiMo background actors get what the thread\'s mode allows, Bypass included', () => {
  const table = (mode) => {
    const rules = mimoRules(mode)
    return {
      bash: actor(rules, 'bash', 'touch child-wrote.txt'),
      edit: actor(rules, 'edit', 'src/a.ts'),
      mcp: actor(rules, 'github_create_issue', '*'),
      outside: actor(rules, 'external_directory', '/elsewhere/*'),
      extraRoot: actor(rules, 'external_directory', '/extra/sub/*'),
      secret: actor(rules, 'read', '.env'),
      doom: actor(rules, 'doom_loop', '*'),
    }
  }
  assert.deepEqual(table('auto'), { bash: 'allow', edit: 'allow', mcp: 'allow', outside: 'ask', extraRoot: 'allow', secret: 'ask', doom: 'ask' })
  assert.deepEqual(table('acceptEdits'), { bash: 'ask', edit: 'allow', mcp: 'ask', outside: 'ask', extraRoot: 'allow', secret: 'ask', doom: 'ask' })
  assert.deepEqual(table('ask'), { bash: 'ask', edit: 'ask', mcp: 'ask', outside: 'ask', extraRoot: 'allow', secret: 'ask', doom: 'ask' })
  assert.deepEqual(table('bypass'), { bash: 'allow', edit: 'allow', mcp: 'allow', outside: 'allow', extraRoot: 'allow', secret: 'allow', doom: 'allow' })
  // Plan: shell commands in the read-only sandbox, edits only for the plan agent's own files (its hardPermission).
  assert.equal(table('plan').bash, 'allow')
  assert.equal(table('plan').edit, 'ask')
  // The rules agree with decide (the bridge's answer to a foreground ask) wherever they allow.
  for (const mode of ['auto', 'ask', 'acceptEdits', 'bypass', 'plan']) {
    const rules = mimoRules(mode)
    for (const [request, tool] of [[{ permission: 'bash', patterns: ['ls'] }, 'bash'], [{ permission: 'edit', patterns: ['a.ts'] }, 'edit'], [{ permission: 'smoke_echo', patterns: ['*'] }, 'smoke_echo']]) {
      if (actor(rules, request.permission, request.patterns[0]) !== 'allow') continue
      assert.equal(decide(state(mode), request, { tool, readTools: MIMO.readTools, cwd: '/w' }).action, 'allow', `${mode} ${request.permission}`)
    }
  }
  // Plan exit stays the app's: allowed only in Plan, even under Bypass's `* allow`.
  assert.equal(actor(mimoRules('bypass'), 'plan_exit', '*'), 'deny')
  assert.equal(actor(mimoRules('plan'), 'plan_exit', '*'), 'allow')
  assert.equal(actor(mimoRules('bypass'), 'plan_enter', '*'), 'deny')
})

test('MiMo session grants reach background actors, never in read-only modes; OpenCode rules stay mode-free', () => {
  const grants = [{ permission: 'bash', patterns: ['git status *'] }, { permission: 'doom_loop', patterns: ['*'] }]
  assert.equal(actor(mimoRules('ask', { grants }), 'bash', 'git status --short'), 'allow')
  assert.equal(actor(mimoRules('ask', { grants }), 'bash', 'git push'), 'ask')
  assert.equal(actor(mimoRules('ask', { grants }), 'doom_loop', '*'), 'ask')
  assert.equal(actor(mimoRules('plan', { grants }), 'bash', 'git status --short'), 'allow') // the read-only sandbox's bash, not the grant
  assert.equal(actor(mimoRules('plan', { grants: [{ permission: 'edit', patterns: ['*'] }] }), 'edit', 'a.ts'), 'ask')
  // Without modeRules (OpenCode) the ruleset is the same in every mode.
  const plain = (mode) => sessionRules(state(mode), { readTools: FLAVORS.opencode.readTools, planPaths: [], grants })
  assert.deepEqual(plain('auto'), plain('ask'))
  assert.equal(modeGrantRules(state('bypass')).length, 1)
})

test('MiMo\'s compose-only skills stay denied in every mode', () => {
  for (const mode of ['auto', 'ask', 'acceptEdits', 'bypass', 'plan']) {
    assert.equal(actor(mimoRules(mode), 'skill', 'compose:brainstorm'), 'deny', mode)
    assert.equal(actor(mimoRules(mode), 'skill', 'my-skill'), 'allow', mode)
  }
})

test('the user\'s own permission config: explicit denies outlast every mode, carve-outs keep the mode\'s answer', () => {
  const home = '/Users/someone'
  const user = configRules({ bash: { 'touch *': 'deny' }, edit: { '*.lock': 'deny' }, external_directory: { '~/secret/*': 'deny' }, webfetch: 'deny', read: { '*': 'allow' } }, { home })
  assert.deepEqual(user.find((entry) => entry.permission === 'external_directory'), rule('external_directory', 'deny', '/Users/someone/secret/*'))
  for (const mode of ['auto', 'ask', 'acceptEdits', 'bypass']) {
    const rules = mimoRules(mode, { userRules: user })
    assert.equal(actor(rules, 'bash', 'touch x', user), 'deny', mode)
    assert.equal(actor(rules, 'edit', 'package.lock', user), 'deny', mode)
    assert.equal(actor(rules, 'external_directory', '/Users/someone/secret/a/*', user), 'deny', mode)
    assert.equal(actor(rules, 'webfetch', 'https://x', user), 'deny', mode)
  }
  // A user allow is not appended: it would make Ask mode run things without a card.
  assert.equal(actor(mimoRules('ask', { userRules: user }), 'bash', 'ls', user), 'ask')
  // `bash: {"*": "deny", "git *": "allow"}`: git keeps the mode's answer, everything else stays denied.
  const carved = configRules({ bash: { '*': 'deny', 'git *': 'allow' } })
  assert.equal(actor(mimoRules('ask', { userRules: carved }), 'bash', 'git status', carved), 'ask')
  assert.equal(actor(mimoRules('auto', { userRules: carved }), 'bash', 'git status', carved), 'allow')
  assert.equal(actor(mimoRules('auto', { userRules: carved }), 'bash', 'rm -rf x', carved), 'deny')
  // The same holds for OpenCode's mode-free rules (its asks reach the bridge, whose decide would allow them).
  const opencode = sessionRules(state('auto'), { readTools: FLAVORS.opencode.readTools, userRules: user })
  assert.equal(evaluateRules(opencode, 'bash', 'touch x'), 'deny')
  // Config shapes: a bare string, an unknown action, nothing.
  assert.deepEqual(configRules('deny'), [rule('*', 'deny')])
  assert.deepEqual(configRules({ bash: 'maybe', edit: { x: 'nope' } }), [])
  assert.deepEqual(configRules(undefined), [])
  assert.deepEqual(userOverrides([rule('bash', 'allow', 'ls')], []), [])
})

test('Plan in a folder without git: the plan file under the data folder is writable', () => {
  const ask = { permission: 'external_directory', patterns: [`${DATA_PLANS}/*`], metadata: { filepath: `${DATA_PLANS}/1791143792667-crisp-sailor.md`, parentDir: DATA_PLANS } }
  const ctx = { tool: 'write', readTools: MIMO.readTools, cwd: '/w', planDirs: [DATA_PLANS, '/w/.mimocode/plans'] }
  for (const mode of ['plan', 'auto', 'ask', 'chat']) assert.equal(decide(state(mode), ask, ctx).action, 'allow', mode)
  // The tool is not known yet (MiMo asks before it publishes the call's input): still the plan folder.
  assert.equal(decide(state('plan'), ask, { ...ctx, tool: undefined }).action, 'allow')
  // Anywhere else stays read-only in Plan.
  const elsewhere = { permission: 'external_directory', patterns: ['/data/mimocode/other/*'], metadata: { filepath: '/data/mimocode/other/x.md' } }
  assert.equal(decide(state('plan'), elsewhere, ctx).action, 'reject')
  assert.equal(decide(state('plan'), { ...ask, metadata: { filepath: '/data/mimocode/plans-evil/x.md' }, patterns: ['/data/mimocode/plans-evil/*'] }, ctx).action, 'reject')
  // And the ruleset lets the plan agent (and a background one) write there without asking.
  assert.equal(actor(mimoRules('plan'), 'external_directory', `${DATA_PLANS}/*`), 'allow')
})

// ------------------------------------------------------------------ the live thread

function mimoThread({ config = {}, skills = [] } = {}) {
  const home = tmp()
  const env = { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }
  const bridge = new Bridge({ flavor: MIMO, binary: '', stateDir: path.join(home, 'state'), env, input: new PassThrough(), output: new PassThrough() })
  const patches = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => {
    if (method === 'GET' && route === '/config') return config
    if (method === 'GET' && route === '/skill') return typeof skills === 'function' ? skills(home) : skills
    if (method === 'GET' && route === '/command') return []
    if (method === 'PATCH') patches.push(options.body.permission)
    return {}
  }
  const cwd = path.join(home, 'project')
  const thread = new LiveThread(bridge, { info: { id: 'ses_mimo', directory: cwd } })
  thread.emit = () => {}
  thread.clientRequest = async () => ({ decision: 'acceptForSession' })
  bridge.threads.set(thread.id, thread)
  const mode = (permissionMode) => applyPermissionParams(thread.permission, { approvalPolicy: permissionMode === 'bypass' ? 'never' : permissionMode === 'ask' ? 'untrusted' : 'on-request', sandboxPolicy: permissionMode === 'plan' ? { type: 'readOnly' } : permissionMode === 'bypass' ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [] }, codeDesktop: { permissionMode } })
  return { home, cwd, bridge, thread, patches, mode }
}

test('a MiMo thread re-PATCHes its ruleset on every mode change, with the user\'s config denies last', async () => {
  const { thread, patches } = mimoThread({ config: { permission: { bash: { 'touch *': 'deny' } } } })
  await thread.applyParams({ approvalPolicy: 'never', sandboxPolicy: { type: 'dangerFullAccess' }, codeDesktop: { permissionMode: 'bypass' } }, { initial: true })
  const bypass = patches.at(-1)
  assert.ok(bypass.some((entry) => entry.permission === '*' && entry.action === 'allow'))
  assert.equal(evaluateRules(bypass, 'bash', 'touch x'), 'deny')
  assert.equal(evaluateRules(bypass, 'bash', 'ls'), 'allow')
  await thread.applyParams({ approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [] }, codeDesktop: { permissionMode: 'ask' } })
  const ask = patches.at(-1)
  assert.equal(evaluateRules(ask, 'bash', 'ls'), 'ask')
  assert.equal(evaluateRules(ask, 'bash', 'touch x'), 'deny')
  // A turn start with nothing changed PATCHes nothing.
  const count = patches.length
  await thread.applyRules()
  assert.equal(patches.length, count)
})

test('a MiMo "Allow for this session" answer is PATCHed into the ruleset for background actors', async () => {
  const { thread, patches, mode } = mimoThread()
  thread.setPermission(mode('ask'))
  await thread.applyRules()
  assert.equal(evaluateRules(patches.at(-1), 'bash', 'git status --short'), 'ask')
  await thread.onPermission({ id: 'per_1', sessionID: 'ses_mimo', permission: 'bash', patterns: ['git status --short'], always: ['git status *'], metadata: { command: 'git status --short' } })
  assert.equal(evaluateRules(patches.at(-1), 'bash', 'git status --short'), 'allow')
  // A mode change drops the grant from the ruleset as well.
  thread.setPermission(mode('acceptEdits'))
  await thread.applyRules()
  assert.equal(evaluateRules(patches.at(-1), 'bash', 'git status --short'), 'ask')
})

test('MiMo skills/list hides the compose-only skills; the runtime file carries the edit guard in read-only modes', async () => {
  const { thread, bridge, home, cwd, mode } = mimoThread({
    skills: (home) => [
      { name: 'compose:tdd', description: 'TDD', location: path.join(home, 'data', 'mimocode', 'compose', '0.1.15', 'skills', 'tdd', 'SKILL.md') },
      { name: 'odd', description: 'In the compose folder', location: path.join(home, 'data', 'mimocode', 'compose', '0.1.15', 'skills', 'odd', 'SKILL.md') },
      { name: 'mine', description: 'Mine', location: path.join(home, '.config', 'mimocode', 'skills', 'mine', 'SKILL.md') },
    ],
  })
  const listed = (await bridge.skillsList({ cwds: [cwd] })).data[0].skills.map((skill) => skill.name)
  assert.deepEqual(listed, ['mine'])
  const runtime = () => JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', 'ses_mimo.json'), 'utf8'))
  thread.setPermission(mode('plan'))
  thread.writeRuntime()
  assert.deepEqual(runtime().editGuard.planDirs, [path.join(home, 'data', 'mimocode', 'plans'), path.join(cwd, '.mimocode', 'plans')])
  thread.setPermission(mode('auto'))
  thread.writeRuntime()
  assert.equal(runtime().editGuard, null)
})

test('the plugin\'s edit guard cancels edits outside the plan folders in a read-only mode', async () => {
  const state = tmp()
  fs.mkdirSync(path.join(state, 'runtime/sessions'), { recursive: true })
  const guard = { cwd: '/w/sub', planDirs: ['/data/mimocode/plans', '/w/sub/.mimocode/plans'], planSegment: `${path.sep}.mimocode${path.sep}plans${path.sep}` }
  fs.writeFileSync(path.join(state, 'runtime/sessions/ses_g.json'), JSON.stringify({ root: 'ses_g', cwd: '/w/sub', editGuard: guard }))
  fs.writeFileSync(path.join(state, 'runtime/sessions/ses_free.json'), JSON.stringify({ root: 'ses_free', cwd: '/w', editGuard: null }))
  const file = path.join(state, 'plugin.mjs')
  fs.writeFileSync(file, pluginSource())
  process.env.CODE_DESKTOP_OPENCODE_STATE = state
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  const run = async (sessionID, tool, args) => { const output = { args }; await hooks['tool.execute.before']({ tool, sessionID, callID: 'c' }, output); return output.cancel === true ? output.cancelReason : 'ran' }
  assert.equal(await run('ses_g', 'write', { filePath: 'src/a.ts' }), 'This mode cannot change files.')
  assert.equal(await run('ses_g', 'edit', { filePath: '/data/mimocode/plans/1-crisp.md' }), 'ran')
  assert.equal(await run('ses_g', 'write', { filePath: '.mimocode/plans/2-plan.md' }), 'ran')
  // The worktree's plan folder when the thread runs in a subfolder of the repo.
  assert.equal(await run('ses_g', 'write', { filePath: '/w/.mimocode/plans/3.md' }), 'ran')
  assert.equal(await run('ses_g', 'apply_patch', { patchText: '*** Begin Patch\n*** Update File: src/a.ts\n@@\n-a\n+b\n*** End Patch' }), 'This mode cannot change files.')
  assert.equal(await run('ses_g', 'apply_patch', { patchText: '*** Begin Patch\n*** Add File: /data/mimocode/plans/4.md\n+x\n*** End Patch' }), 'ran')
  assert.equal(await run('ses_g', 'multiedit', {}), 'This mode cannot change files.')
  assert.equal(await run('ses_g', 'bash', { command: 'touch x' }), 'ran')
  assert.equal(await run('ses_free', 'write', { filePath: 'src/a.ts' }), 'ran')
})
