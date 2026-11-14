// ACP bridge (harness/packages/acp-bridge), round 5: Kimi's config.toml [tools] edited in place (multi-line, commented,
// dotted, inline), its own tool policy shown, sanitized connector names and hook-blocked prompts; Qwen's own Auto-mode
// asks and skills.disabled; Gemini's env-only sign-in and thinking efforts; MiniMax plugins by package name, plugin
// contents, sub-agents and /compact results. Server flows run against packages/acp-bridge/testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { tomlWithDisabledTools, tomlToolsLists, parseTomlStringArray } from '../packages/acp-bridge/src/overlay.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { readKimiConfig, kimiServerDisablePatterns, kimiQualifiedToolName, kimiMcpNamePart, kimiToolOffReason, kimiBlockedPrompt, globRegExp } from '../packages/acp-bridge/src/agents/kimi.js'
import { qwenMustAsk, qwenDestructiveCommand, qwenProtectedPath, qwenSkillPolicy, qwenSkillHidden, qwenBundledSkillsDir } from '../packages/acp-bridge/src/agents/qwen.js'
import { geminiEnvAuthType, geminiModelEfforts, geminiEffortOverrides, geminiModelName, geminiModelRows } from '../packages/acp-bridge/src/agents/gemini.js'
import { minimaxCompactionResult, minimaxAgents, minimaxPluginPackage } from '../packages/acp-bridge/src/agents/minimax.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r5-')))

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({}) } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, QWEN_HOME: path.join(home, '.qwen'), CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
      QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'no-qwen-system.json'),
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), ...env,
    },
  })
  const notes = []
  const requests = []
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); return onRequest(method, params) }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text, extra = {}) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, kimiHome, call, turn, notes, requests, waitFor, agentLog, close: () => server.shutdown() }
}

// ------------------------------------------------------------ Kimi: [tools] in config.toml

test('Kimi config.toml: tools.disabled is rewritten in place, whatever its form; an unreadable value is left alone', () => {
  const add = ['Bash', 'mcp__docs_internal__*']
  // Multi-line array with comments and a trailing comma (what Kimi's own /update-config writes).
  const multi = 'default_model = "k"\n\n[tools]\ndisabled = [\n  "FetchURL", # no fetching\n  "WebSearch",\n]\n\n[models.k]\nprovider = "p"\n'
  const merged = tomlWithDisabledTools(multi, add)
  assert.equal(merged, 'default_model = "k"\n\n[tools]\ndisabled = ["FetchURL", "WebSearch", "Bash", "mcp__docs_internal__*"]\n\n[models.k]\nprovider = "p"\n')
  // A trailing comment on the line stays, and the user's own entries are kept.
  assert.equal(tomlWithDisabledTools('[tools]\ndisabled = ["FetchURL"] # no web\n', ['Bash']), '[tools]\ndisabled = ["FetchURL", "Bash"] # no web\n')
  // A top-level dotted key: rewritten there (a second [tools] table would define the key twice).
  assert.equal(tomlWithDisabledTools('tools.disabled = ["FetchURL"]\n[models.k]\nx = 1\n', ['Bash']), 'tools.disabled = ["FetchURL", "Bash"]\n[models.k]\nx = 1\n')
  assert.equal(tomlWithDisabledTools('tools.enabled = ["Read", "Bash"]\n[x]\ny = 1\n', ['Bash']), 'tools.enabled = ["Read", "Bash"]\ntools.disabled = ["Bash"]\n[x]\ny = 1\n')
  // An inline table keeps its other keys.
  assert.equal(tomlWithDisabledTools('tools = { enabled = ["Read"] }\n', ['Bash']), 'tools = { enabled = ["Read"], disabled = ["Bash"] }\n')
  assert.equal(tomlWithDisabledTools('tools = {}\n', ['Bash']), 'tools = { disabled = ["Bash"] }\n')
  // [tools] without the key (a comment on the header): the key joins the table; no [tools] at all: one is added.
  assert.equal(tomlWithDisabledTools('[tools] # mine\nenabled = ["Read"]\n', ['Bash']), '[tools] # mine\ndisabled = ["Bash"]\nenabled = ["Read"]\n')
  assert.equal(tomlWithDisabledTools('x = 1', ['Bash']), 'x = 1\n\n[tools]\ndisabled = ["Bash"]\n')
  // A [tools] header inside a multi-line string is not a table.
  assert.match(tomlWithDisabledTools('note = """\n[tools]\n"""\n', ['Bash']), /"""\n\n\[tools\]\ndisabled = \["Bash"\]\n$/)
  // Literal and escaped strings are read as TOML reads them.
  assert.deepEqual(parseTomlStringArray(`['a\\b', "x\\u0041", """y"""]`), ['a\\b', 'xA', 'y'])
  // Not certain: no rewrite at all (the caller keeps the user's file).
  assert.equal(tomlWithDisabledTools('[tools]\ndisabled = ["a", 3]\n', ['Bash']), null)
  assert.equal(tomlWithDisabledTools('broken = [\n', ['Bash']), null)
  assert.equal(tomlWithDisabledTools('tools = "nope"\n', ['Bash']), null)
  assert.deepEqual(tomlToolsLists(multi), { enabled: null, disabled: ['FetchURL', 'WebSearch'] })
})

test('Kimi launch: a config.toml the bridge cannot edit stays the user\'s own; a connector is turned off by its sanitized name', () => {
  const kimi = adapterById('kimi')
  const home = tmp()
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  fs.writeFileSync(path.join(kimiHome, 'mcp.json'), JSON.stringify({ mcpServers: { 'docs.internal': { command: 'x' }, 'my__server': { command: 'y' } } }))
  const logs = []
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: kimiHome }, log: (line) => logs.push(line) }
  fs.writeFileSync(path.join(kimiHome, 'config.toml'), '[tools]\ndisabled = [\n  "FetchURL",\n]\n')
  const ok = kimi.launch(ctx, { threadDir: path.join(home, 't1'), disabledTools: ['Bash', 'mcp__docs.internal__search'], disabledServers: ['my__server'] })
  const written = fs.readFileSync(path.join(ok.env.KIMI_CODE_HOME, 'config.toml'), 'utf8')
  assert.equal(written, '[tools]\ndisabled = ["FetchURL", "Bash", "mcp__docs_internal__search", "mcp__my_server__*"]\n')
  fs.writeFileSync(path.join(kimiHome, 'config.toml'), '[tools]\ndisabled = [FetchURL]\n')
  const kept = kimi.launch(ctx, { threadDir: path.join(home, 't2'), disabledTools: ['Bash'], disabledServers: [] })
  assert.equal(kept.env.KIMI_CODE_HOME, undefined, 'no overlay home only for a file the bridge would have broken')
  assert.match(logs.join('\n'), /could not be read for certain/)
  // Cards name the connector as configured, not Kimi's sanitized form.
  assert.deepEqual(kimi.classify({ title: 'mcp__docs_internal__search' }, ctx), { type: 'mcp', server: 'docs.internal', tool: 'search' })
})

test('Kimi MCP names: sanitized parts, hashed long names, and disable patterns that match them', () => {
  assert.equal(kimiMcpNamePart('docs.internal'), 'docs_internal')
  assert.equal(kimiMcpNamePart('my__server'), 'my_server')
  assert.deepEqual(kimiServerDisablePatterns('docs.internal'), ['mcp__docs_internal__*'])
  const long = 'a-very-long-connector-name-that-goes-past-the-head-limit-xyz'
  const patterns = kimiServerDisablePatterns(long)
  const qualified = kimiQualifiedToolName(long, 'search')
  assert.equal(qualified.length <= 64, true)
  assert.ok(patterns.some((pattern) => globRegExp(pattern).test(qualified)), 'a hashed name still matches')
  // FNV-1a over the full name (tool-naming.ts stableHash8), signed: a fixed value for a fixed input.
  const name = kimiQualifiedToolName('server', 'x'.repeat(80))
  assert.match(name, /^mcp__server__x+_-?[0-9a-f]{7,8}$/)
  assert.equal(name.length, 64)
})

test('Kimi tool policy: [tools] enabled (allowlist) and disabled show as off, with the reason, in the tools list', async () => {
  const tools = { enabled: ['Read', 'Bash', 'mcp__docs_*__search'], disabled: ['Bash'] }
  assert.match(kimiToolOffReason(tools, 'Write'), /leaves this tool out/)
  assert.match(kimiToolOffReason(tools, 'Bash'), /turns this tool off/)
  assert.equal(kimiToolOffReason(tools, 'Read'), null)
  assert.equal(kimiToolOffReason(tools, 'mcp__docs_a__search', 'mcp'), null)
  assert.match(kimiToolOffReason(tools, 'mcp__docs_a__write', 'mcp'), /leaves this tool out/)
  const b = bridge()
  try {
    fs.writeFileSync(path.join(b.kimiHome, 'config.toml'), 'tools.disabled = [\n  "FetchURL", # web\n]\n')
    assert.deepEqual(readKimiConfig(path.join(b.kimiHome, 'config.toml')).tools, { enabled: null, disabled: ['FetchURL'] })
    await b.call('initialize', {})
    const list = await b.call('codeDesktop/tools/list', {})
    const fetch = list.tools.find((tool) => tool.name === 'FetchURL')
    assert.match(fetch.disabledReason, /\[tools\] disabled/)
    assert.equal(list.tools.find((tool) => tool.name === 'Read').disabledReason, undefined)
  } finally { await b.close() }
})

test('Kimi: a prompt the user\'s UserPromptSubmit hook blocked completes with the hook\'s message, not a model failure', async () => {
  assert.equal(kimiBlockedPrompt([{ type: 'prompt.completed', reason: 'done' }]), null)
  assert.equal(kimiBlockedPrompt([{ type: 'prompt.completed', reason: 'blocked' }]), 'Your UserPromptSubmit hook blocked this message.')
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const turn = await b.turn(thread.id, 'kimi-hook-block')
    assert.equal(turn.status, 'completed')
    assert.equal(turn.error, null)
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    const note = read.thread.turns.at(-1).items.find((item) => item.type === 'agentMessage')
    assert.equal(note.text, '_Your UserPromptSubmit hook blocked this message: Prompts mentioning secrets are blocked by policy_')
    assert.equal(b.notes.some((entry) => entry.method === 'error'), false)
  } finally { await b.close() }
})

// ------------------------------------------------------------ Qwen

test('Qwen Auto mode: its destructive commands and protected paths still ask; connector tools ask', () => {
  for (const command of ['git reset --hard', 'git clean -fdx', 'git checkout -- .', 'git stash drop', 'bash -c "terraform destroy"', 'pulumi destroy -y', 'cdk destroy']) {
    const verdict = qwenDestructiveCommand(command)
    assert.ok(verdict, command)
    assert.equal(verdict.always, true, command)
  }
  assert.deepEqual(qwenDestructiveCommand('git commit --amend --no-edit'), { reason: 'This rewrites the last commit.', always: false })
  assert.equal(qwenDestructiveCommand('git status && ls -la'), null)
  const home = tmp()
  const env = { HOME: home, QWEN_HOME: path.join(home, '.qwen') }
  fs.mkdirSync(env.QWEN_HOME, { recursive: true })
  fs.writeFileSync(path.join(env.QWEN_HOME, 'settings.json'), JSON.stringify({ context: { fileName: ['TEAM.md'] } }))
  for (const file of ['/p/.git/hooks/pre-commit', '/p/.husky/pre-push', '/p/package.json', '/p/sub/package.json', '/p/.npmrc', '/p/Makefile', '/p/.github/workflows/ci.yml', '/p/.qwen/settings.json', '/p/QWEN.md', '/p/AGENTS.md', '/p/.qwen/hooks/x.sh', '/p/.mcp.json', '/p/docs/TEAM.md', path.join(env.QWEN_HOME, 'settings.json'), path.join(env.QWEN_HOME, 'skills', 'a', 'SKILL.md')]) {
    assert.equal(qwenProtectedPath(file, env), true, file)
  }
  for (const file of ['/p/src/index.js', '/p/README.md', '/p/packages.json.bak']) assert.equal(qwenProtectedPath(file, env), false, file)
  assert.match(qwenMustAsk({ call: {}, kind: 'edit', paths: ['/p/.git/hooks/pre-commit'], env }).reason, /affects later runs/)
  assert.equal(qwenMustAsk({ call: {}, kind: 'edit', paths: ['/p/src/a.js'], env }), null)
  assert.equal(qwenMustAsk({ call: {}, kind: 'read', paths: ['/p/package.json'], env }), null)
  assert.match(qwenMustAsk({ call: {}, kind: 'other', env, mcp: true }).reason, /connector tools/)
  const qwen = adapterById('qwen')
  assert.match(qwen.mustAsk({ env }, { call: { kind: 'other', _meta: { toolName: 'mcp__github__delete_repo' } }, paths: [] }).reason, /connector tools/)
})

test('Qwen Auto mode in a session: git reset --hard gets a card every time; a plain command does not', async () => {
  const b = bridge({ adapter: adapterById('qwen'), onRequest: async (method) => (method === 'item/commandExecution/requestApproval' ? { decision: 'decline' } : {}) })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const auto = { codeDesktop: { permissionMode: 'auto' } }
    await b.turn(thread.id, 'qwen-shell git reset --hard && git clean -fdx', auto)
    await b.turn(thread.id, 'qwen-shell ls -la', auto)
    const cards = b.requests.filter((request) => request.method === 'item/commandExecution/requestApproval')
    assert.equal(cards.length, 1)
    assert.equal(cards[0].params.reason, 'This git command discards local work.')
    assert.equal(cards[0].params.sessionGrantable, false)
    const replies = b.notes.filter((note) => note.method === 'item/agentMessage/delta').map((note) => note.params.delta)
    assert.deepEqual(replies.filter((text) => text.startsWith('shell:')), ['shell:cancel', 'shell:proceed_once'])
  } finally { await b.close() }
})

test('Qwen skills: skills.disabled (any scope, either spelling), disabledLevels and bundled skills; the switch writes skills.disabled', () => {
  const qwen = adapterById('qwen')
  const home = tmp()
  const qwenHome = path.join(home, '.qwen')
  const cwd = path.join(home, 'proj')
  const skill = (dir, name) => { fs.mkdirSync(path.join(dir, name), { recursive: true }); fs.writeFileSync(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n---\nBody\n`) }
  skill(path.join(qwenHome, 'skills'), 'mine')
  skill(path.join(qwenHome, 'skills'), 'other')
  skill(path.join(cwd, '.qwen', 'skills'), 'proj-skill')
  fs.mkdirSync(path.join(cwd, '.git'), { recursive: true })
  // An extension with a skill, and the Qwen package's bundled skills next to its binary.
  const ext = path.join(qwenHome, 'extensions', 'rust')
  fs.mkdirSync(ext, { recursive: true })
  fs.writeFileSync(path.join(ext, 'qwen-extension.json'), JSON.stringify({ name: 'rust', version: '1.0.0' }))
  skill(path.join(ext, 'skills'), 'pdf')
  const pkg = path.join(home, 'pkg')
  skill(path.join(pkg, 'bundled'), 'browser-use')
  skill(path.join(pkg, 'bundled'), 'review')
  fs.writeFileSync(path.join(pkg, 'cli-entry.js'), '')
  assert.equal(qwenBundledSkillsDir({ binary: path.join(pkg, 'cli-entry.js') }), path.join(pkg, 'bundled'))
  fs.writeFileSync(path.join(qwenHome, 'settings.json'), JSON.stringify({ skills: { disabled: ['Browser-Use', 'mine', 'rust:pdf'] } }))
  fs.writeFileSync(path.join(cwd, '.qwen', 'settings.json'), JSON.stringify({ skills: { disabled: ['other'] } }))
  const ctx = { env: { HOME: home, QWEN_HOME: qwenHome, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }, program: { binary: path.join(pkg, 'cli-entry.js') } }
  const rows = new Map(qwen.skills(ctx, cwd).map((row) => [row.name, row]))
  assert.equal(rows.get('browser-use').enabled, false)
  assert.equal(rows.get('browser-use').scope, 'system')
  assert.equal(rows.get('review').enabled, true)
  assert.equal(rows.get('mine').enabled, false)
  assert.match(rows.get('mine').disabledReason, /your Qwen Code settings/)
  assert.equal(rows.get('pdf').enabled, false)
  assert.match(rows.get('other').disabledReason, /this project’s Qwen Code settings/)
  assert.equal(rows.get('proj-skill').enabled, true)
  // On: the user's entry goes (any spelling); off: the registered name is added. SKILL.md is untouched.
  const before = fs.readFileSync(rows.get('mine').path, 'utf8')
  qwen.setSkillEnabled(ctx, 'mine', true, { ...rows.get('mine'), cwd })
  qwen.setSkillEnabled(ctx, 'browser-use', true, { ...rows.get('browser-use'), cwd })
  qwen.setSkillEnabled(ctx, 'pdf', true, { ...rows.get('pdf'), cwd })
  qwen.setSkillEnabled(ctx, 'review', false, { ...rows.get('review'), cwd })
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(qwenHome, 'settings.json'), 'utf8')).skills.disabled, ['review'])
  assert.equal(fs.readFileSync(rows.get('mine').path, 'utf8'), before)
  // A skill the project's settings hide cannot be turned on from the user's.
  assert.throws(() => qwen.setSkillEnabled(ctx, 'other', true, { ...rows.get('other'), cwd }), /this project’s Qwen Code settings/)
  // disabledLevels hides a whole level; defaultDisabled holds unless skills.enabled names it.
  const policy = { sources: [{ label: 'user', disabled: [], defaultDisabled: ['review'], enabled: [], levels: ['bundled'] }] }
  assert.match(qwenSkillHidden(policy, { name: 'browser-use', scope: 'system' }), /disabledLevels/)
  assert.match(qwenSkillHidden({ sources: [{ ...policy.sources[0], levels: [] }] }, { name: 'review', scope: 'system' }), /Off by default/)
  assert.equal(qwenSkillHidden({ sources: [{ ...policy.sources[0], levels: [], enabled: ['review'] }] }, { name: 'review', scope: 'system' }), null)
  assert.equal(qwenSkillPolicy(ctx.env, cwd, { withoutUser: true }).sources.some((source) => source.label === 'user'), false)
})

// ------------------------------------------------------------ Gemini

test('Gemini env-only sign-in: the thread\'s settings name it, the account says so, a missing key is an unauthorized error', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const base = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  const vertex = { ...base, GOOGLE_GENAI_USE_VERTEXAI: 'true', GOOGLE_API_KEY: 'k', GEMINI_API_KEY: 'other' }
  assert.equal(geminiEnvAuthType(vertex), 'vertex-ai')
  // session/new defaults to a key, but session/load (a reopened session) needs it selected: the thread's settings name it.
  assert.equal(geminiEnvAuthType({ ...base, GEMINI_API_KEY: 'k' }), 'gemini-api-key', 'a key alone is named for session/load')
  assert.equal(geminiEnvAuthType({ ...base, GOOGLE_GENAI_USE_GCA: 'true' }), null, 'no Google credentials: no sign-in to start')
  assert.equal(gemini.account({ env: vertex }).label, 'Vertex AI')
  assert.match(gemini.account({ env: { ...base, GOOGLE_GENAI_USE_GCA: 'true' } }).hint, /GOOGLE_GENAI_USE_GCA/)
  const launch = gemini.launch({ env: vertex, log: () => {} }, { threadDir: path.join(home, 't'), cwd: home, disabledTools: [], disabledServers: [] })
  const settings = JSON.parse(fs.readFileSync(path.join(launch.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.equal(settings.security.auth.selectedType, 'vertex-ai')
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'settings.json')), false, 'the user\'s own settings are not written')
  // Selected in settings: left to Gemini.
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ security: { auth: { selectedType: 'gemini-api-key' } } }))
  assert.equal(geminiEnvAuthType(vertex), null)
  assert.match(gemini.authHint({ env: vertex }, 'Gemini API key is missing or not configured.'), /GEMINI_API_KEY/)
  assert.equal(gemini.authHint({ env: vertex }, 'Something else'), null)
})

test('Gemini efforts: thinking level for Gemini 3, thinking budget for 2.5, applied per family at launch', () => {
  const gemini = adapterById('gemini')
  assert.deepEqual(geminiModelEfforts('gemini-3-flash-preview'), { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], defaultEffort: 'high' })
  assert.equal(geminiModelEfforts('gemini-2.5-pro').defaultEffort, 'medium')
  assert.deepEqual(geminiModelEfforts('gemini-4-argon').efforts.map((e) => e.id), ['low', 'medium', 'high'])
  assert.equal(geminiModelEfforts('gemini-4-argon').defaultEffort, 'high')
  assert.equal(geminiModelEfforts('auto'), null)
  assert.deepEqual(geminiEffortOverrides('low'), [
    { match: { model: 'chat-base-3' }, modelConfig: { generateContentConfig: { thinkingConfig: { thinkingLevel: 'LOW' } } } },
    { match: { model: 'chat-base-2.5' }, modelConfig: { generateContentConfig: { thinkingConfig: { thinkingBudget: 1024 } } } },
  ])
  assert.deepEqual(geminiEffortOverrides('medium').map((entry) => entry.match.model), ['chat-base-3', 'chat-base-2.5'])
  assert.deepEqual(geminiEffortOverrides(null), [])
  assert.equal(gemini.effortInLaunch, true)
  const home = tmp()
  const launch = gemini.launch({ env: { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }, log: () => {} }, { threadDir: path.join(home, 't'), cwd: home, disabledTools: [], disabledServers: [], effort: 'high', modelParams: { 'gemini-2.5-pro': { temperature: 0.5 } } })
  const settings = JSON.parse(fs.readFileSync(path.join(launch.env.GEMINI_CLI_HOME, '.gemini', 'settings.json'), 'utf8'))
  assert.deepEqual(settings.modelConfigs.customOverrides.map((entry) => entry.match.model), ['gemini-2.5-pro', 'chat-base-3', 'chat-base-2.5'])
  assert.equal(settings.modelConfigs.customOverrides[2].modelConfig.generateContentConfig.thinkingConfig.thinkingBudget, 24576)
})

// ------------------------------------------------------------ MiniMax

test('MiniMax plugins: rows by package name (display name shown), commands by <name>@<marketplace>', async () => {
  const minimax = adapterById('minimax')
  const home = tmp()
  const calls = path.join(home, 'calls.log')
  const script = path.join(home, 'mcode.mjs')
  fs.writeFileSync(script, `import fs from 'node:fs'
const args = process.argv.slice(2)
if (args.join(' ') === 'plugin list --json') {
  console.log('noise ' + JSON.stringify({ installed: [
    { name: 'demo-plugin', displayName: 'Demo Plugin', marketplaceName: 'local', enabled: true, version: '1.0.0' },
    { name: 'agent-session-migration', displayName: 'Agent 会话迁移', marketplaceName: 'official', pluginId: 'pl_1', enabled: true },
    { name: 'twin', displayName: 'Twin', marketplaceName: 'official', enabled: true },
    { name: 'twin', displayName: 'Twin (local)', marketplaceName: 'local', enabled: false },
  ] }))
} else fs.appendFileSync(${JSON.stringify(calls)}, args.join(' ') + '\\n')
`)
  const ctx = { env: { HOME: home, MINIMAX_DATA_DIR: path.join(home, '.minimax') }, log: () => {}, commandLine: (args) => ({ command: process.execPath, args: [script, ...args] }) }
  const rows = await minimax.plugins(ctx)
  const byId = new Map(rows.map((row) => [row.id, row]))
  assert.equal(byId.get('demo-plugin').name, 'demo-plugin')
  assert.equal(byId.get('demo-plugin').interface.displayName, 'Demo Plugin')
  assert.equal(byId.get('agent-session-migration').interface.displayName, 'Agent 会话迁移')
  assert.ok(byId.has('twin@official') && byId.has('twin@local'), 'a name in both marketplaces gets one row each')
  await minimax.pluginCommand(ctx, 'disable', 'demo-plugin')
  await minimax.pluginCommand(ctx, 'remove', 'Agent 会话迁移')
  await minimax.pluginCommand(ctx, 'enable', 'twin@local')
  assert.deepEqual(fs.readFileSync(calls, 'utf8').trim().split('\n'), ['plugin disable demo-plugin@local', 'plugin remove agent-session-migration@official', 'plugin enable twin@local'])
})

test('MiniMax plugin contents, sub-agents and /compact answers', () => {
  const home = tmp()
  const data = path.join(home, '.minimax')
  // A local compatible plugin (skills/ folder, .mcp.json) and an official one in mcode's cache (MiniMax manifest).
  const local = path.join(data, 'plugins', 'demo')
  fs.mkdirSync(path.join(local, '.claude-plugin'), { recursive: true })
  fs.writeFileSync(path.join(local, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'demo-plugin', displayName: 'Demo Plugin' }))
  fs.mkdirSync(path.join(local, 'skills', 'hello'), { recursive: true })
  fs.writeFileSync(path.join(local, 'skills', 'hello', 'SKILL.md'), '---\nname: hello\ndescription: Say hello\n---\n')
  fs.writeFileSync(path.join(local, '.mcp.json'), JSON.stringify({ mcpServers: { notes: { command: 'n' } } }))
  const official = path.join(data, 'v2', 'plugin-cache', 'official', 'abc123')
  fs.mkdirSync(path.join(official, '.minimax-plugin'), { recursive: true })
  fs.writeFileSync(path.join(official, '.minimax-plugin', 'plugin.json'), JSON.stringify({ name: 'agent-session-migration', version: '2.0.0', skills: ['skills/migrate/SKILL.md'], mcpServers: ['tools.mcp.json'] }))
  fs.mkdirSync(path.join(official, 'skills', 'migrate'), { recursive: true })
  fs.writeFileSync(path.join(official, 'skills', 'migrate', 'SKILL.md'), '---\nname: migrate\ndescription: Moves sessions\n---\n')
  fs.writeFileSync(path.join(official, 'tools.mcp.json'), JSON.stringify({ schemaVersion: 1, mcpServers: { migrator: { command: 'm' } } }))
  const env = { HOME: home, MINIMAX_DATA_DIR: data }
  assert.deepEqual(minimaxPluginPackage(env, 'demo-plugin').skills.map((skill) => skill.name), ['hello'])
  assert.deepEqual(minimaxPluginPackage(env, 'demo-plugin').mcpServers, ['notes'])
  assert.deepEqual(minimaxPluginPackage(env, 'agent-session-migration@official', '2.0.0'), { dir: official, skills: [{ name: 'migrate', description: 'Moves sessions', path: path.join(official, 'skills', 'migrate', 'SKILL.md') }], mcpServers: ['migrator'] })
  const detail = adapterById('minimax').pluginDetail({ env }, { name: 'demo-plugin', enabled: true, codeDesktop: { packageName: 'demo-plugin' } })
  assert.equal(detail.skills[0].name, 'hello')
  // Sub-agents: the shipped ones (not the main agent) and the user's own.
  const agent = (dir, text) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'agent.md'), text) }
  agent(path.join(data, 'agents', '.builtin', 'explore'), '---\nname: explore\ndescription: Read-only mapper\ntools:\n  - read\n  - grep\nx-mavis:\n  displayName: Explore\n---\nBody\n')
  agent(path.join(data, 'agents', '.builtin', 'mavis'), '---\nname: mavis\ndescription: main\n---\n')
  agent(path.join(data, 'agents', 'reviewer'), '---\nname: reviewer\ndescription: Reviews diffs\ntools: [read, bash]\n---\n')
  assert.deepEqual(minimaxAgents(env).map((row) => [row.name, row.scope, row.displayName, row.tools]), [['explore', 'builtin', 'Explore', ['read', 'grep']], ['reviewer', 'user', null, ['read', 'bash']]])
  assert.deepEqual(minimaxCompactionResult('Compaction completed.\nMessages: 12 → 3\nTokens: 11,151 → 2,050'), { phase: 'completed', message: 'Compaction completed.\nMessages: 12 → 3\nTokens: 11,151 → 2,050', tokensBefore: 11151, tokensAfter: 2050, codeDesktop: { shadowedItems: 9, shadowedTokens: 9101 } })
  assert.equal(minimaxCompactionResult('No compaction is needed for this conversation yet.').phase, 'skipped')
  assert.equal(minimaxCompactionResult('hello'), null)
})

test('MiniMax /compact in a session: instructions reach mcode; the result is on the marker, or a note when nothing was compacted', async () => {
  const minimax = adapterById('minimax')
  // The Kimi adapter's process handling with MiniMax's compaction behaviour (the fake agent answers /compact as mcode does).
  const adapter = { ...adapterById('kimi'), filterUpdate: undefined, compactInstructions: minimax.compactInstructions, compactionResult: minimax.compactionResult }
  const b = bridge({ adapter })
  try {
    const init = await b.call('initialize', {})
    assert.equal(init.capabilities.compactInstructions, true)
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.call('thread/compact/start', { threadId: thread.id, codeDesktop: { instructions: 'keep the API notes' } })
    const first = (await b.waitFor((method) => method === 'turn/completed')).turn
    assert.ok(b.agentLog().some((entry) => entry.method === 'session/prompt' && entry.params.prompt?.[0]?.text === '/compact keep the API notes'))
    const done = b.notes.find((note) => note.method === 'item/completed' && note.params.item.type === 'contextCompaction')
    assert.deepEqual(done.params.item.codeDesktop, { shadowedItems: 1, shadowedTokens: 101 })
    assert.equal(first.status, 'completed')
    await b.call('thread/compact/start', { threadId: thread.id, codeDesktop: { instructions: 'nothing to do' } })
    await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id !== first.id)
    const read = await b.call('thread/read', { threadId: thread.id, includeTurns: true })
    const last = read.thread.turns.at(-1)
    assert.equal(last.items.some((item) => item.type === 'contextCompaction'), false)
    assert.equal(last.items.find((item) => item.type === 'agentMessage').text, '_No compaction is needed for this conversation yet._')
  } finally { await b.close() }
})

test('Gemini model menu: readable names, newest first, Auto + the newest four and the default in the menu', () => {
  assert.equal(geminiModelName('gemini-3.1-pro-preview'), 'Gemini 3.1 Pro Preview')
  assert.equal(geminiModelName('gemma-4-26b-a4b-it'), 'Gemma 4 26B A4B IT')
  assert.equal(geminiModelName('gemini-4-argon', 'Gemini 4 Argon'), 'Gemini 4 Argon')
  assert.equal(geminiModelName('auto'), 'Auto')
  // Gemini CLI titles its latest Flash rows with the older id: the model a row runs (its id) names it.
  assert.equal(geminiModelName('gemini-3.8-flash', 'gemini-3.5-flash'), 'Gemini 3.8 Flash')
  const relabeled = geminiModelRows([{ id: 'gemini-3.5-flash-lite', displayName: 'gemini-3.1-flash-lite' }, { id: 'gemini-3.8-flash', displayName: 'gemini-3.5-flash' }])
  assert.deepEqual(relabeled.map((row) => row.displayName), ['Gemini 3.8 Flash', 'Gemini 3.5 Flash Lite'])
  const ids = ['auto', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemma-4-31b-it', 'gemini-4-argon']
  const shown = (def) => geminiModelRows(ids.map((id) => ({ id, displayName: id, isDefault: id === def }))).map((row) => `${row.section === 'main' ? '+' : '-'}${row.id}`)
  assert.deepEqual(shown('gemini-4-argon'), ['+auto', '+gemini-4-argon', '+gemini-3.5-flash', '+gemini-3.1-pro-preview', '+gemini-3.1-flash-lite', '-gemini-3-flash-preview', '-gemini-2.5-pro', '-gemini-2.5-flash-lite', '-gemma-4-31b-it'])
  assert.ok(shown('gemini-2.5-pro').includes('+gemini-2.5-pro'))
  assert.deepEqual(geminiModelRows(null), [])
})
