// Round 5 cross-area fixes in the bridges (unit level; no real agent, temp folders only).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { geminiEnvCandidates, geminiEnvAuthType } from '../packages/acp-bridge/src/agents/gemini.js'
import { minimaxPluginError } from '../packages/acp-bridge/src/agents/minimax.js'
import { preExecuteDecision, childDecision, SESSION_STATE_TOOLS } from '../packages/codex-app-server/src/approval.js'
import { capabilitiesFor, reviewArguments, reviewLabel } from '../packages/opencode-bridge/src/index.js'

const tempHome = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cd-cross-r5-'))

test('Gemini .env: a trusted project’s .gemini/.env, then its .env, then the home ones, as Gemini CLI looks', () => {
  const home = tempHome()
  const project = path.join(home, 'work', 'app')
  fs.mkdirSync(path.join(project, '.gemini'), { recursive: true })
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const env = { HOME: home }
  // Untrusted (folder trust on by default, no trustedFolders.json entry): no .gemini/.env from the project or home.
  const untrusted = geminiEnvCandidates(env, { cwd: project }).map(([file]) => file)
  assert.ok(!untrusted.includes(path.join(project, '.gemini', '.env')))
  assert.ok(untrusted.includes(path.join(project, '.env')))
  assert.ok(!untrusted.includes(path.join(home, '.gemini', '.env')))
  fs.writeFileSync(path.join(home, '.gemini', 'trustedFolders.json'), JSON.stringify({ [project]: 'TRUST_FOLDER' }))
  const trusted = geminiEnvCandidates(env, { cwd: project }).map(([file]) => file)
  assert.deepEqual(trusted.slice(0, 2), [path.join(project, '.gemini', '.env'), path.join(project, '.env')])
  // A key in the project's .gemini/.env makes the account read as signed in with a key, for that project only.
  fs.writeFileSync(path.join(project, '.gemini', '.env'), 'GEMINI_API_KEY=from-project\n')
  const gemini = adapterById('gemini')
  const ctx = { env }
  assert.equal(gemini.account(ctx, { cwd: project }).method, 'gemini-api-key')
  assert.match(gemini.account(ctx, { cwd: project }).detail, /\.gemini\/\.env/)
  assert.equal(gemini.account(ctx).method, null, 'outside the project there is no key')
  assert.equal(geminiEnvAuthType(env, { all: true, cwd: project }), 'gemini-api-key')
  // advanced.ignoreLocalEnv keeps only the home .env among the plain ones.
  const ignoring = geminiEnvCandidates(env, { cwd: project, settings: { advanced: { ignoreLocalEnv: true } } }).map(([file]) => file)
  assert.ok(!ignoring.includes(path.join(project, '.env')))
  assert.ok(ignoring.includes(path.join(home, '.env')))
  fs.rmSync(home, { recursive: true, force: true })
})

test('MiniMax: PLUGIN_AUTH_REQUIRED and PLUGIN_AUTH_SYNC_TIMEOUT become sentences; other failures stay', () => {
  const needs = minimaxPluginError(Object.assign(new Error('Command failed'), { stderr: 'PLUGIN_AUTH_REQUIRED\n' }))
  assert.equal(needs.code, 'PLUGIN_AUTH_REQUIRED')
  assert.match(needs.message, /^Sign in with your MiniMax account \(Settings › Account\)/)
  assert.match(minimaxPluginError({ stderr: 'PLUGIN_AUTH_SYNC_TIMEOUT' }).message, /couldn’t confirm your MiniMax sign-in/)
  const other = new Error('boom')
  assert.equal(minimaxPluginError(other), other)
})

test('MiniMax: the official catalog marks every row when no MiniMax account is signed in', async () => {
  const home = tempHome()
  const minimax = adapterById('minimax')
  const listing = JSON.stringify({ available: [{ name: 'agent-session-migration', marketplaceName: 'official', description: 'Move sessions', version: '1.0.0' }] })
  const script = path.join(home, 'mcode.cjs')
  fs.writeFileSync(script, `process.stdout.write(${JSON.stringify(listing)})`)
  const ctx = { env: { HOME: home, MINIMAX_HOME: path.join(home, '.minimax') }, commandLine: (args) => ({ command: process.execPath, args: [script, ...args] }) }
  const signedOut = await minimax.availablePlugins(ctx)
  assert.equal(signedOut[0].codeDesktop.signInRequired, true)
  fs.mkdirSync(path.join(home, '.minimax', 'auth', 'prod', 'global', 'client'), { recursive: true })
  fs.writeFileSync(path.join(home, '.minimax', 'auth', 'prod', 'global', 'client', 'auth.json'), '{"token":"t"}')
  const signedIn = await minimax.availablePlugins(ctx)
  assert.equal(signedIn[0].codeDesktop.signInRequired, undefined)
  fs.rmSync(home, { recursive: true, force: true })
})

test('DeepSeek Ask mode: create_goal and update_goal are goal bookkeeping, never an approval card', async () => {
  const permission = { approvalPolicy: 'untrusted', sandbox: 'workspace-write', writableRoots: [] }
  for (const toolName of ['create_goal', 'update_goal', 'get_goal']) {
    assert.equal(await preExecuteDecision({ permission, toolName, args: {}, cwd: '/tmp' }), 'next', toolName)
    assert.equal(childDecision({ rootPolicy: 'untrusted', toolName }), 'next', toolName)
  }
  assert.ok(SESSION_STATE_TOOLS.has('update_goal'))
  assert.equal(await preExecuteDecision({ permission, toolName: 'bash', args: { command: 'rm -rf x' }, cwd: '/tmp' }), 'ask')
})

test('OpenCode / MiMo review: a pull request number or URL is the review command’s argument', () => {
  assert.ok(capabilitiesFor({ id: 'opencode' }).reviewTargets.includes('pullRequest'))
  assert.ok(capabilitiesFor({ id: 'mimo' }).reviewTargets.includes('pullRequest'))
  assert.equal(reviewArguments({ type: 'pullRequest', pullRequest: '42' }), '42')
  assert.equal(reviewLabel({ type: 'pullRequest', pullRequest: '42' }), 'Pull request #42')
  assert.equal(reviewLabel({ type: 'pullRequest', pullRequest: 'https://github.com/o/r/pull/7/files' }), 'Pull request #7')
  assert.equal(reviewArguments({ type: 'uncommittedChanges' }), '')
  assert.equal(reviewLabel({ type: 'commit', sha: 'abcdef1234567890' }), 'Commit abcdef123456')
})

test('Qwen settings: usage statistics are a setting OpenClaude Desktop shows (privacy.usageStatisticsEnabled, on by default)', () => {
  const qwen = adapterById('qwen')
  const def = qwen.coreSettings.defs.find((entry) => entry.key === 'privacy.usageStatisticsEnabled')
  assert.deepEqual(def, { key: 'privacy.usageStatisticsEnabled', type: 'boolean', default: true })
})

test('Gemini /bug: Gemini CLI’s own bug report URL, prefilled; an https urlTemplate of the user’s replaces it', async () => {
  const { geminiBugUrl } = await import('../packages/acp-bridge/src/agents/gemini.js')
  const url = new URL(geminiBugUrl({ version: '0.62.0', sessionId: 's-1', model: 'gemini-3-pro', authType: 'gemini-api-key', classification: 'bug', reason: 'Crash on start\nmore detail' }))
  assert.equal(url.origin + url.pathname, 'https://github.com/google-gemini/gemini-cli/issues/new')
  assert.equal(url.searchParams.get('template'), 'bug_report.yml')
  assert.equal(url.searchParams.get('title'), 'Crash on start')
  assert.match(url.searchParams.get('info'), /CLI Version:\*\* 0\.62\.0[\s\S]*Session ID:\*\* s-1[\s\S]*Model Version:\*\* gemini-3-pro[\s\S]*Auth Type:\*\* gemini-api-key/)
  assert.equal(url.searchParams.get('problem'), 'Crash on start\nmore detail')
  assert.match(geminiBugUrl({ template: 'https://tracker.example/new?t={title}', reason: 'x' }), /^https:\/\/tracker\.example\/new\?t=x$/)
  assert.match(geminiBugUrl({ template: 'javascript:alert(1)', reason: 'x' }), /^https:\/\/github\.com\//, 'only an https template')
  const home = tempHome()
  const result = adapterById('gemini').feedback({ env: { HOME: home, CODE_DESKTOP_AGENT_VERSION: '0.62.0' } }, { classification: 'bug', reason: 'Broken', threadId: 't', model: null })
  assert.equal(result.threadId, 't')
  assert.match(result.url, /^https:\/\/github\.com\/google-gemini\/gemini-cli\/issues\/new\?/)
  fs.rmSync(home, { recursive: true, force: true })
})

test('MiMo MCP sampling: a readable card summary, asked in every mode but Bypass, and a per-connector policy in the overlay', async () => {
  const { samplingSummary } = await import('../packages/opencode-bridge/src/index.js')
  const { decide } = await import('../packages/opencode-bridge/src/policy.js')
  const { BridgeConfig } = await import('../packages/opencode-bridge/src/config.js')
  const { FLAVORS } = await import('../packages/opencode-bridge/src/flavor.js')
  const summary = samplingSummary({ server: 'mimo-cut', model: 'mimo/mimo-v2', contentTypes: ['audio', 'text'], audio: [{ mimeType: 'audio/wav', bytes: 2048 }, { mimeType: 'audio/wav', bytes: 1024 }], systemPrompt: 'Transcribe.', textPrompt: 'Here is the clip', maxTokens: 4000 }, ['mimo-cut'])
  assert.deepEqual(summary, { server: 'mimo-cut', model: 'mimo/mimo-v2', contentTypes: ['audio', 'text'], audioBytes: 3072, audioClips: 2, systemPrompt: 'Transcribe.', textPrompt: 'Here is the clip', maxTokens: 4000 })
  assert.equal(samplingSummary({}, ['x']).server, 'x')
  const request = { permission: 'mcp_sampling', patterns: ['mimo-cut'], always: ['mimo-cut'], metadata: { server: 'mimo-cut' } }
  for (const mode of ['auto', 'ask', 'acceptEdits', 'plan']) {
    const decision = decide({ mode }, request, { readTools: [], cwd: '/w' })
    assert.equal(decision.action, 'ask', mode)
    assert.match(decision.reason, /model request on your account/, mode)
  }
  assert.equal(decide({ mode: 'bypass' }, request, { readTools: [], cwd: '/w' }).action, 'allow')
  const home = tempHome()
  const config = new BridgeConfig({ flavor: FLAVORS.mimo, stateDir: path.join(home, 'state'), env: { HOME: home } })
  config.writeMcp({ servers: {}, disabled: [], sampling: { 'mimo-cut': 'allow', bad: 'sometimes' } })
  assert.deepEqual(config.readMcp().sampling, { 'mimo-cut': 'allow' })
  assert.deepEqual(config.overlay().mcp?.['mimo-cut'], { sampling: 'allow' }, 'merged over the connector’s own entry')
  const opencode = new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: path.join(home, 'state2'), env: { HOME: home } })
  opencode.writeMcp({ servers: {}, disabled: [], sampling: { x: 'allow' } })
  assert.equal(opencode.overlay().mcp?.x, undefined, 'OpenCode has no sampling')
  fs.rmSync(home, { recursive: true, force: true })
})

test('OpenCode commands: the user’s own command file is theirs (or the repository’s), an MCP prompt its connector’s, built-ins the core’s', async () => {
  const { Bridge } = await import('../packages/opencode-bridge/src/index.js')
  const { FLAVORS } = await import('../packages/opencode-bridge/src/flavor.js')
  const home = tempHome()
  const project = path.join(home, 'work', 'app')
  fs.mkdirSync(path.join(project, '.git'), { recursive: true })
  fs.mkdirSync(path.join(project, '.opencode', 'command'), { recursive: true })
  fs.writeFileSync(path.join(project, '.opencode', 'command', 'ship.md'), '---\ndescription: ship\n---\nShip it')
  fs.mkdirSync(path.join(home, '.config', 'opencode', 'command'), { recursive: true })
  fs.writeFileSync(path.join(home, '.config', 'opencode', 'command', 'deploy.md'), '---\nagent: plan\nsubtask: true\n---\nDeploy $ARGUMENTS')
  const self = { flavor: FLAVORS.opencode, env: { HOME: home }, homeDir: () => home, pluginGlobalDirs: Bridge.prototype.pluginGlobalDirs }
  const origin = (command) => Bridge.prototype.commandOrigin.call(self, command, project)
  const deploy = origin({ name: 'deploy', source: 'command', agent: 'plan', subtask: true, template: 'Deploy $ARGUMENTS' })
  assert.deepEqual(deploy, { path: path.join(home, '.config', 'opencode', 'command', 'deploy.md'), scope: 'user', codeDesktop: { kind: 'command', agent: 'plan', subtask: true, template: 'Deploy $ARGUMENTS' } })
  assert.equal(origin({ name: 'ship', source: 'command', template: 'Ship it' }).scope, 'repo')
  assert.deepEqual(origin({ name: 'review', source: 'command', template: 'Review' }), { path: 'command:review', scope: 'system', codeDesktop: { kind: 'builtin', template: 'Review' } })
  assert.deepEqual(origin({ name: 'inline', source: 'command', template: 'From opencode.json' }), { path: 'command:inline', scope: 'user', codeDesktop: { kind: 'config', template: 'From opencode.json' } })
  assert.deepEqual(origin({ name: 'github:summarize', source: 'mcp' }), { path: 'command:github:summarize', scope: 'user', codeDesktop: { server: 'github', kind: 'mcpPrompt' } })
  fs.rmSync(home, { recursive: true, force: true })
})

test('Qwen @ targets: enabled connectors as @mcp:<name>, enabled extensions as @ext:<name>', () => {
  const home = tempHome()
  fs.mkdirSync(path.join(home, '.qwen', 'extensions', 'pr-tools'), { recursive: true })
  fs.writeFileSync(path.join(home, '.qwen', 'extensions', 'pr-tools', 'qwen-extension.json'), JSON.stringify({ name: 'pr-tools', description: 'PR helpers', mcpServers: { prsrv: { command: 'node' } } }))
  fs.writeFileSync(path.join(home, '.qwen', 'settings.json'), JSON.stringify({ mcpServers: { github: { httpUrl: 'https://example.com/mcp' }, off: { command: 'x' } }, mcp: { excluded: ['off'] } }))
  const targets = adapterById('qwen').mentionTargets({ env: { HOME: home } }, null)
  assert.deepEqual(targets.map((entry) => entry.text).sort(), ['@ext:pr-tools', '@mcp:github', '@mcp:prsrv'])
  assert.equal(targets.find((entry) => entry.text === '@mcp:prsrv').description, 'pr-tools')
  fs.rmSync(home, { recursive: true, force: true })
})

test('Qwen PR binding: qwen/notify/session/pr-binding reaches the bridge’s prBinding', () => {
  const bound = []
  const api = { prBinding: (pr) => bound.push(pr) }
  const qwen = adapterById('qwen')
  assert.equal(qwen.onExtension('_qwen/notify/session/pr-binding', { sessionId: 's', pr: { number: 42, url: 'https://github.com/o/r/pull/42' } }, api), null)
  assert.deepEqual(bound, [{ number: 42, url: 'https://github.com/o/r/pull/42' }])
  assert.equal(qwen.onExtension('qwen/notify/session/pr-binding', { sessionId: 's' }, api), null, 'no PR: nothing bound')
  assert.equal(bound.length, 1)
})

test('Gemini policies: a user or admin ask_user rule asks even in Auto and Bypass; a higher allow wins; modes and tiers apply', async () => {
  const { parsePolicyToml, loadGeminiPolicies, policyDecision, stableArgs, commandParts, geminiToolName } = await import('../packages/acp-bridge/src/gemini-policy.js')
  const rules = parsePolicyToml(`# team
[[rule]]
toolName = "run_shell_command"
commandPrefix = ["git push", "npm publish"]
decision = "ask_user"
priority = 100

[[rule]]
toolName = "run_shell_command"
commandPrefix = "git push --dry-run"
decision = "allow"
priority = 200

[[safety_checker]]
toolName = ["write_file"]
priority = 1

[[rule]]
toolName = "mcp_github_*"
decision = "ask_user"
priority = 10
modes = ["default", "yolo"]
`)
  assert.equal(rules.length, 3)
  assert.deepEqual(rules[0].commandPrefix, ['git push', 'npm publish'])
  const home = tempHome()
  fs.mkdirSync(path.join(home, '.gemini', 'policies'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'policies', 'team.toml'), fs.readFileSync(new URL(import.meta.url)).toString().match(/parsePolicyToml\(`([\s\S]*?)`\)/)[1])
  const admin = path.join(home, 'system-policies')
  fs.mkdirSync(admin)
  fs.writeFileSync(path.join(admin, 'org.toml'), '[[rule]]\ntoolName = "run_shell_command"\ncommandPrefix = "git push --dry-run"\ndecision = "ask_user"\npriority = 0\n')
  const loaded = loadGeminiPolicies({ home, systemDir: admin })
  assert.equal(policyDecision(loaded, { name: 'run_shell_command', args: { command: 'npm test && git push origin main' } })?.decision, 'ask_user', 'any part of a compound command')
  assert.equal(policyDecision(loaded, { name: 'run_shell_command', args: { command: 'git push --dry-run' } })?.decision, 'ask_user', 'the admin tier beats the user’s higher priority')
  assert.equal(policyDecision(loadGeminiPolicies({ home, systemDir: path.join(home, 'none') }), { name: 'run_shell_command', args: { command: 'git push --dry-run' } })?.decision, 'allow', 'within a tier the higher priority wins')
  assert.equal(policyDecision(loaded, { name: 'run_shell_command', args: { command: 'git pushx' } }), null)
  assert.equal(policyDecision(loaded, { name: 'mcp_github_merge_pull_request', args: {}, mode: 'yolo' })?.decision, 'ask_user')
  assert.equal(policyDecision(loaded, { name: 'mcp_github_merge_pull_request', args: {}, mode: 'autoEdit' }), null, 'a rule limited to other modes')
  assert.equal(stableArgs({ b: 1, a: 'x' }), '{\u0000"a":"x"\u0000,\u0000"b":1\u0000}')
  assert.deepEqual(commandParts('a; b | c'), ['a; b | c', 'a', 'b', 'c'])
  assert.equal(geminiToolName({ toolCallId: 'run_shell_command-1791-3' }), 'run_shell_command')
  // Through the adapter: the user’s rule asks; the reason names whose policy.
  const gemini = adapterById('gemini')
  const asked = gemini.mustAsk({ env: { HOME: home } }, { call: { toolCallId: 'run_shell_command-1-1', rawInput: { command: 'git push' } }, cwd: null, mode: 'bypass' })
  assert.match(asked.reason, /^Your Gemini CLI policy asks before this runs\.$/)
  assert.equal(gemini.mustAsk({ env: { HOME: home } }, { call: { toolCallId: 'run_shell_command-1-1', rawInput: { command: 'ls' } }, cwd: null, mode: 'auto' }), null)
  assert.equal(gemini.mustAskInBypass, true)
  fs.rmSync(home, { recursive: true, force: true })
})

test('Kimi plugins: their MCP servers under Kimi’s runtime names, each switchable; their commands as /<plugin>:<name>', async () => {
  const { kimiPluginMcpServers, kimiPluginCommands, kimiExpandArguments } = await import('../packages/acp-bridge/src/agents/kimi.js')
  const home = tempHome()
  const kimiHome = path.join(home, '.kimi-code')
  const root = path.join(kimiHome, 'plugins', 'cache', 'kimi-datasource')
  fs.mkdirSync(path.join(root, 'commands', 'deep'), { recursive: true })
  fs.writeFileSync(path.join(root, 'kimi.plugin.json'), JSON.stringify({ name: 'kimi-datasource', mcpServers: { data: { command: './bin/server', args: ['--stdio'] }, web: { transport: 'http', url: 'https://example.com/mcp' } }, commands: './commands' }))
  fs.writeFileSync(path.join(root, 'commands', 'report.md'), '---\ndescription: Make a report\n---\nReport on $ARGUMENTS')
  fs.writeFileSync(path.join(root, 'commands', 'deep', 'dive.md'), 'Dive deep.')
  fs.writeFileSync(path.join(kimiHome, 'plugins', 'installed.json'), JSON.stringify({ version: 1, plugins: [{ id: 'kimi-datasource', root, enabled: true, capabilities: { mcpServers: { web: { enabled: false } } } }] }))
  const env = { HOME: home, KIMI_CODE_HOME: kimiHome }
  const servers = kimiPluginMcpServers(env)
  assert.deepEqual(servers.map((server) => [server.name, server.disabled]), [['plugin-kimi-datasource:data', false], ['plugin-kimi-datasource:web', true]])
  assert.equal(servers[0].command, path.join(root, 'bin', 'server'))
  assert.equal(servers[0].cwd, root)
  assert.equal(servers[0].env.KIMI_PLUGIN_ROOT, root)
  const kimi = adapterById('kimi')
  assert.ok(kimi.mcpServers({ env }, null).some((server) => server.name === 'plugin-kimi-datasource:data' && server.source === 'plugin'))
  const commands = kimiPluginCommands(env)
  assert.deepEqual(commands.map((command) => [command.name, command.description]), [['kimi-datasource:report', 'Make a report'], ['kimi-datasource:deep/dive', 'Dive deep.']].sort((a, b) => commands.findIndex((c) => c.name === a[0]) - commands.findIndex((c) => c.name === b[0])))
  assert.equal(await kimi.expandCommand({ env }, commands.find((command) => command.name.endsWith(':report')), { args: 'Q3' }), 'Report on Q3')
  assert.equal(kimiExpandArguments('Dive deep.', 'now'), 'Dive deep.\n\nARGUMENTS: now')
  await kimi.pluginCommand({ env }, 'mcp-enable', 'kimi-datasource', { server: 'web' })
  assert.equal(JSON.parse(fs.readFileSync(path.join(kimiHome, 'plugins', 'installed.json'), 'utf8')).plugins[0].capabilities.mcpServers.web.enabled, true)
  await assert.rejects(kimi.pluginCommand({ env }, 'mcp-disable', 'kimi-datasource', { server: 'nope' }), /declares no MCP server/)
  assert.deepEqual(kimi.pluginDetail({ env }, { id: 'kimi-datasource' }).mcpServerStates.map((state) => [state.name, state.runtimeName, state.enabled]),
    [['data', 'plugin-kimi-datasource:data', true], ['web', 'plugin-kimi-datasource:web', true]])
  assert.equal(kimi.pluginServerToggle, true)
  fs.rmSync(home, { recursive: true, force: true })
})

test('DeepSeek goals: dsh-goal views as Codex goals; set creates, edits, pauses and resumes; errors read as sentences', async () => {
  const { threadGoal, setGoal, goalMutate } = await import('../packages/codex-app-server/src/goals.js')
  const view = (extra) => ({ id: 'g1', revision: 1, objective: 'Migrate tests', phase: 'active', maxGoalRounds: 256, roundsStarted: 3, createdAt: 1_000_000, updatedAt: 2_000_000, activation: 'armed', ...extra })
  assert.deepEqual(threadGoal('t', view()), { threadId: 't', objective: 'Migrate tests', status: 'active', tokenBudget: null, tokensUsed: 0, timeUsedSeconds: null, createdAt: 1000, updatedAt: 2000,
    codeDesktop: { goalId: 'g1', revision: 1, rounds: 3, maxRounds: 256 } })
  assert.deepEqual([threadGoal('t', view({ activation: 'disarmed' })).status, threadGoal('t', view({ activation: 'disarmed' })).codeDesktop.disarmed], ['paused', true], 'after a restart nothing runs until Resume')
  assert.deepEqual(threadGoal('t', view({ phase: 'blocked', blockedReason: { code: 'round-limit', message: 'Goal reached its configured limit of 256 rounds.' } })).codeDesktop.blockedCode, 'round-limit')
  assert.equal(threadGoal('t', null), null)
  const calls = []
  let current = null
  const goals = {
    get: () => current,
    create: (agent, request) => { calls.push(['create', request]); return (current = view({ objective: request.objective, revision: 1 })) },
    edit: (agent, ref, request) => { calls.push(['edit', ref, request]); return (current = { ...current, ...request, revision: ref.revision + 1 }) },
    clear: (agent, ref) => { calls.push(['clear', ref]); current = null; return { ...ref, revision: ref.revision + 1 } },
    pause: (agent, ref) => { calls.push(['pause', ref]); return (current = { ...current, phase: 'paused', activation: 'disarmed', revision: ref.revision + 1 }) },
    resume: (agent, ref) => { calls.push(['resume', ref]); return (current = { ...current, phase: 'active', activation: 'armed', revision: ref.revision + 1 }) },
  }
  setGoal(goals, {}, { objective: 'Migrate tests', status: 'active' })
  setGoal(goals, {}, { status: 'paused' })
  setGoal(goals, {}, { status: 'active' })
  setGoal(goals, {}, { objective: 'Migrate all tests', status: 'active' })
  setGoal(goals, {}, { objective: 'Migrate all tests', status: 'active' })
  assert.deepEqual(calls.map(([name]) => name), ['create', 'pause', 'resume', 'clear', 'create'], 'a new objective replaces the goal; the same one again changes nothing')
  // /goal edit <objective>: the objective changes in place (rounds and phase kept), never a fresh goal.
  calls.length = 0
  const edited = setGoal(goals, {}, { objective: 'Migrate every test', edit: true })
  assert.deepEqual(calls.map(([name]) => name), ['edit'])
  assert.equal(edited.objective, 'Migrate every test')
  assert.equal(edited.roundsStarted, 3)
  assert.throws(() => setGoal(goals, {}, { objective: '  ', edit: true }), /after \/goal edit/)
  assert.throws(() => setGoal({ get: () => null }, {}, { objective: 'x', edit: true }), /has no goal/)
  const exhausted = Object.assign(new Error('goal "g1" exhausted 256 goal rounds; increase maxGoalRounds before resuming'), { code: 'GOAL_INVALID_TRANSITION' })
  assert.throws(() => goalMutate(() => { throw exhausted }), /The goal used all its rounds\. Set a new goal with \/goal to keep going\./)
  assert.throws(() => setGoal({ get: () => null }, {}, { status: 'active' }), /has no goal/)
})

test('DeepSeek settings: listed fields only, read with their defaults, written one at a time with the revision; bounds checked', async () => {
  const { coreSettingsRead, coreSettingsWrite } = await import('../packages/codex-app-server/src/core-settings.js')
  const forms = [
    { ns: 'subagent', revision: 4, value: { maxDepth: 1, maxActiveSubagents: 3 }, user: { maxActiveSubagents: 3 }, base: { maxDepth: 1, maxActiveSubagents: 8 }, schema: {} },
    { ns: 'web-search-deepseek', revision: 0, value: { maxUses: 5, apiKey: { set: true } }, schema: { uid: 1, refs: { 1: { type: 'object', dict: { maxUses: 2 } }, 2: { type: 'number', meta: { default: 5 } } } } },
    { ns: 'llm-deepseek', revision: 0, value: { maxTokens: 1 }, schema: {} },
  ]
  const ops = []
  const settings = { writable: true, describe: () => forms, mutate: async (ns, list, revision) => { ops.push([ns, list, revision]) } }
  const read = coreSettingsRead(settings)
  assert.deepEqual(read.settings.map((entry) => [entry.ns, entry.key, entry.value, entry.default, entry.overridden]), [
    ['subagent', 'maxDepth', 1, 1, false], ['subagent', 'maxActiveSubagents', 3, 8, true], ['web-search-deepseek', 'maxUses', 5, 5, false], ['web-search-deepseek', 'baseURL', null, null, false]])
  assert.ok(!read.settings.some((entry) => entry.key === 'apiKey'), 'the key is never offered here')
  await coreSettingsWrite(settings, { ns: 'subagent', key: 'maxActiveSubagents', value: 2 })
  await coreSettingsWrite(settings, { ns: 'subagent', key: 'maxActiveSubagents', value: null })
  assert.deepEqual(ops, [['subagent', [{ op: 'set', path: ['maxActiveSubagents'], value: 2 }], 4], ['subagent', [{ op: 'unset', path: ['maxActiveSubagents'] }], 4]])
  await assert.rejects(coreSettingsWrite(settings, { ns: 'subagent', key: 'maxDepth', value: 99 }), /whole number from 0 to 8/)
  await assert.rejects(coreSettingsWrite(settings, { ns: 'llm-deepseek', key: 'maxTokens', value: 2 }), /Unknown setting/)
  await assert.rejects(coreSettingsWrite(settings, { ns: 'web-search-deepseek', key: 'baseURL', value: 'ftp://x' }), /http\(s\) URL/)
})
