// Cross-area fixes (round 2): steers that echo the client's id (ZCode, OpenCode), MiMo actors that can't be stopped on
// their own, OpenCode's /move (codeDesktop/thread/move), its background sub-agents switch and the deferred-tools
// friendly interactive fallback, Kimi's [tools] policy letting OpenClaude Desktop's tools through, Qwen's workflow approval
// card, and Gemini's untrusted-folder notice when only connectors (OpenClaude Desktop's tools included) are affected.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { LiveProjector } from '../packages/zcode-bridge/src/live.js'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'
import { coreSettingDefs, coreSettingsEnv } from '../packages/opencode-bridge/src/core-settings.js'
import { kimiAppToolsConfig } from '../packages/acp-bridge/src/agents/kimi.js'
import { workflowApprovalTool } from '../packages/acp-bridge/src/agents/qwen-workflow.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { GEMINI_UNTRUSTED_TOOLS, GEMINI_UNTRUSTED_FOLDER, GEMINI_UNTRUSTED_FOLDER_AND_TOOLS } from '../packages/acp-bridge/src/agents/gemini.js'

const made = []
const tmp = (prefix = 'xfix-') => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)) }

test('ZCode: a steered message carries the client\'s clientUserMessageId back on its userMessage item', () => {
  const out = []
  const ids = new Map([['msg_g1', 'client-1']])
  const p = new LiveProjector({
    threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: () => {}, takeInput: () => null,
    takeSteer: () => [{ type: 'text', text: 'also the README', text_elements: [] }], clientIdFor: (id) => ids.get(id) ?? null,
  })
  const env = { turnId: 'turn_1', timestamp: 1 }
  p.event('turn.started', { messageId: 'msg_u', input: 'work' }, env)
  p.event('turn.steerDrained', { drainedInputs: [{ pendingInputId: 'queue_c1', messageId: 'msg_g1', text: 'also the README' }] }, env)
  const users = out.filter((e) => e.method === 'item/completed' && e.params.item.type === 'userMessage').map((e) => e.params.item)
  assert.deepEqual(users.map((item) => [item.id, item.clientId]), [['msg_u', null], ['msg_g1', 'client-1']])
})

function bridgeFor(flavor = 'opencode', api = async () => { throw new Error('no server') }) {
  const home = tmp('xfix-ocb-')
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  bridge.notify = () => {}
  const calls = []
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route, ...options }); return api(method, route, options) }
  return { bridge, calls, home }
}

test('MiMo: stopping one actor sub-agent is refused (it would abort the whole session), with no API call', async () => {
  const { bridge, calls } = bridgeFor('mimo')
  await assert.rejects(bridge.handle('turn/interrupt', { threadId: 'ses_abc~general-1' }), /can’t stop one sub-agent on its own/)
  assert.deepEqual(calls, [])
})

test('OpenCode /move: capability, check counts the folder\'s changes, a move posts move-session and the reminder', async () => {
  assert.equal(capabilitiesFor(FLAVORS.opencode).moveCwd, true)
  assert.equal(capabilitiesFor(FLAVORS.mimo).moveCwd, false)
  const from = tmp('xfix-from-'), to = tmp('xfix-to-')
  const { bridge, calls } = bridgeFor('opencode', async (method, route) => {
    if (route === '/vcs/status') return [{ path: 'a.txt' }, { path: 'b.txt' }]
    if (route.startsWith('/experimental/control-plane/move-session')) return null
    if (route.endsWith('/prompt_async')) return null
    throw new Error(`unexpected ${method} ${route}`)
  })
  bridge.store.update('ses_1', { cwd: from })
  assert.deepEqual(await bridge.handle('codeDesktop/thread/move', { threadId: 'ses_1', check: true }), { changes: 2 })
  bridge.openThread = async (id) => ({ threadObject: () => ({ id, cwd: bridge.store.get(id).cwd }) })
  const moved = await bridge.handle('codeDesktop/thread/move', { threadId: 'ses_1', cwd: to, moveChanges: true })
  assert.deepEqual(moved, { thread: { id: 'ses_1', cwd: to }, moved: true })
  const move = calls.find((call) => call.route === '/experimental/control-plane/move-session')
  assert.deepEqual(move.body, { sessionID: 'ses_1', destination: { directory: to }, moveChanges: true })
  assert.equal(move.directory, from)
  const reminder = calls.find((call) => call.route === '/session/ses_1/prompt_async')
  assert.equal(reminder.body.noReply, true)
  assert.match(reminder.body.parts[0].text, /changed the current working directory to/)
  assert.equal(bridge.store.get('ses_1').cwd, to)
  // OpenCode's project mismatch becomes a plain sentence.
  const other = bridgeFor('opencode', async (method, route) => { if (route.includes('move-session')) throw new Error('OpenCode: Destination directory belongs to another project'); return null })
  other.bridge.store.update('ses_2', { cwd: from })
  await assert.rejects(other.bridge.handle('codeDesktop/thread/move', { threadId: 'ses_2', cwd: to }), /belongs to another project\. OpenCode can move a session only/)
  await assert.rejects(bridgeFor('mimo').bridge.handle('codeDesktop/thread/move', { threadId: 'ses_3', cwd: to }), /can’t move a session/)
})

test('OpenCode background sub-agents: an opt-in core setting turns on OpenCode\'s experimental flag', () => {
  assert.ok(coreSettingDefs(FLAVORS.opencode).some((def) => def.key === 'subagents.background' && def.default === false && def.kind === 'env'))
  assert.ok(!coreSettingDefs(FLAVORS.mimo).some((def) => def.key === 'subagents.background'))
  assert.equal(coreSettingsEnv({ coreSettings: { 'subagents.background': true } }, FLAVORS.opencode).OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS, 'true')
  assert.equal(coreSettingsEnv({}, FLAVORS.opencode).OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS, undefined)
})

test('Kimi [tools] policy: an allowlist or a disabled mcp__* no longer removes OpenClaude Desktop\'s tools', () => {
  assert.equal(kimiAppToolsConfig('[tools]\nenabled = ["Read", "Bash"]\n', 'code_desktop'), '[tools]\nenabled = ["Read", "Bash", "mcp__code_desktop__*"]\n')
  assert.equal(kimiAppToolsConfig('[tools]\ndisabled = ["mcp__*", "Bash"]\n', 'code_desktop', () => ['github', 'docs.x']), '[tools]\ndisabled = ["mcp__github__*", "mcp__docs_x__*", "Bash"]\n', 'narrowed to the user\'s own servers')
  assert.equal(kimiAppToolsConfig('[tools]\ndisabled = ["mcp__code_desktop__*"]\n', 'code_desktop'), '[tools]\ndisabled = []\n')
  assert.equal(kimiAppToolsConfig('', 'code_desktop'), null, 'nothing blocks them: the user\'s file stays')
  assert.equal(kimiAppToolsConfig('[tools]\nenabled = ["Read", "mcp__*"]\n', 'code_desktop'), null)
  assert.equal(kimiAppToolsConfig('tools = { enabled = ["Read"] }\n', 'code_desktop'), 'tools = { enabled = ["Read", "mcp__code_desktop__*"] }\n')
})

test('Qwen workflow: asked about outside Bypass, with OpenClaude Desktop\'s workflow card (name, description, phases)', () => {
  const qwen = adapterById('qwen')
  const call = { toolCallId: 't1', title: 'Run workflow: probe-wf', _meta: { toolName: 'workflow' }, rawInput: { script: 'export const meta = { name: \'probe-wf\', description: "Review every module", phases: [{ title: \'Find\' }, { title: \'Verify\', detail: \'votes\' }] };\nreturn await agent("x")' } }
  assert.deepEqual(workflowApprovalTool(call), { kind: 'workflow', name: 'probe-wf', description: 'Review every module', phases: [{ title: 'Find' }, { title: 'Verify' }] })
  assert.deepEqual(qwen.approvalTool(call), workflowApprovalTool(call))
  const asked = qwen.mustAsk({ env: {} }, { call, paths: [], cwd: '/w' })
  assert.equal(asked.always, true)
  assert.match(asked.reason, /dynamic workflow/)
  assert.equal(qwen.approvalTool({ toolCallId: 't2', _meta: { toolName: 'read_file' }, rawInput: {} }), null)
})

test('Gemini: an untrusted folder without Gemini files still says its connectors (OpenClaude Desktop\'s tools included) are off', () => {
  const gemini = adapterById('gemini')
  const home = tmp('xfix-gh-'), project = tmp('xfix-gp-')
  const base = { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  assert.equal(gemini.folderNotice({ env: base }, project), null, 'no connectors, no Gemini files: nothing to say')
  const env = { ...base, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: 'node', args: ['s.mjs'] }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'x' }
  const notice = gemini.folderNotice({ env }, project)
  assert.ok(notice === GEMINI_UNTRUSTED_TOOLS || (Array.isArray(notice) && notice.includes(GEMINI_UNTRUSTED_TOOLS)), JSON.stringify(notice))
  assert.match(GEMINI_UNTRUSTED_TOOLS, /until you trust the folder\.$/)
  write(path.join(project, 'GEMINI.md'), '# rules')
  const both = gemini.folderNotice({ env }, project)
  assert.ok(both === GEMINI_UNTRUSTED_FOLDER_AND_TOOLS || (Array.isArray(both) && both.includes(GEMINI_UNTRUSTED_FOLDER_AND_TOOLS)), JSON.stringify(both))
  assert.equal(gemini.folderNotice({ env: base }, project), GEMINI_UNTRUSTED_FOLDER)
  // The user's own connector is listed with Trust in an untrusted folder, never as connected.
  write(path.join(home, '.gemini', 'settings.json'), { mcpServers: { mine: { command: 'node', args: ['m.js'] } } })
  const mine = gemini.mcpServers({ env: base }, project).find((server) => server.name === 'mine')
  assert.equal(mine.trustRequired, true)
  assert.match(mine.disabledReason, /starts no connectors/)
})

test('MiMo: the code_desktop server\'s instructions are read from its definition (MiMo never shows them to the model)', async () => {
  const { appToolsServer } = await import('../packages/opencode-bridge/src/app-tools.js')
  const env = { CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: 'node', args: ['s.mjs'], instructions: '  Verifying changes in the preview  ' }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 't' }
  assert.equal(appToolsServer(env).instructions, 'Verifying changes in the preview')
  assert.equal(appToolsServer({ ...env, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: 'node' }) }).instructions, null)
})
