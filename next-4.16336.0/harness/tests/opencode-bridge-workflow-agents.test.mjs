// OpenClaude Desktop workflow agents on the OpenCode / MiMo bridge (packages/opencode-bridge): the runner
// (app/third-party/codex-workflows-runner, clientInfo.name code-desktop-workflows) starts every agent with
// approvalPolicy "never" and turns every server request down, so
//  - what would put a card in front of a person is refused with a reason (OpenCode's CorrectedError, which the agent
//    reads and continues from) instead of a bare reject (a RejectedError, which ends its turn with no answer);
//  - the `question` tool is not offered, and a question that still arrives is answered "decide yourself";
//  - the agents' sessions leave the user's OpenCode history with the runner's bridge (and the app's next sweep).
// Also: OpenClaude Desktop's own tools (code_desktop_*) are allowed by the session ruleset, so MiMo's background actors,
// which never ask a person, can use them in every mode (the root's ask is answered `once` anyway).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { applyPermissionParams, decide, defaultPermission, evaluateRules, sessionRules } from '../packages/opencode-bridge/src/policy.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-wfa-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const READS = FLAVORS.opencode.readTools
const ctx = { readTools: READS, cwd: '/w' }
const never = (sandbox) => applyPermissionParams(defaultPermission(), { approvalPolicy: 'never', sandbox })

test('approvalPolicy "never": every would-be card is a reject with a reason; allowed calls stay allowed', () => {
  for (const sandbox of ['workspace-write', 'read-only']) {
    const permission = never(sandbox)
    const asks = [
      { permission: 'read', patterns: ['/w/.env'] },
      { permission: 'doom_loop', patterns: ['*'] },
      { permission: 'external_directory', patterns: ['/elsewhere/*'], metadata: { filepath: '/elsewhere/a.txt' } },
      ...(sandbox === 'read-only' ? [{ permission: 'github_create_issue', patterns: ['*'] }] : []),
    ]
    for (const request of asks) {
      const decision = decide(permission, request, ctx)
      assert.equal(decision.action, 'reject', `${sandbox} ${request.permission}`)
      assert.ok(decision.reason && decision.reason.length > 10, 'a reason the agent reads (a CorrectedError, not a RejectedError)')
    }
    // A connector tool its server marks read-only is a read in every mode.
    assert.equal(decide(permission, { permission: 'context7_search', patterns: ['*'] }, { ...ctx, readOnlyTool: true }).action, 'allow')
  }
  assert.equal(decide(never('workspace-write'), { permission: 'bash', patterns: ['ls'] }, ctx).action, 'allow')
  assert.equal(decide(never('workspace-write'), { permission: 'edit', patterns: ['a.ts'] }, ctx).action, 'allow')
  // Bypass (never + full access) allows everything; a thread with a person keeps its cards.
  assert.equal(decide(never('danger-full-access'), { permission: 'read', patterns: ['/w/.env'] }, ctx).action, 'allow')
  assert.equal(decide({ ...defaultPermission(), mode: 'ask' }, { permission: 'bash', patterns: ['ls'] }, ctx).action, 'ask')
  // noUser: a workflow agent whose last params named another approval policy still never gets a card.
  assert.equal(decide({ ...defaultPermission(), mode: 'ask' }, { permission: 'bash', patterns: ['ls'] }, { ...ctx, noUser: true }).action, 'reject')
})

test('code_desktop_* is allowed by the session ruleset in every mode (MiMo background actors); a user or tool-selection deny still wins', () => {
  const rules = (mode, options = {}) => sessionRules({ ...defaultPermission(), mode }, { readTools: FLAVORS.mimo.readTools, modeRules: true, appToolsPrefix: 'code_desktop_', ...options })
  for (const mode of ['auto', 'ask', 'acceptEdits', 'plan', 'chat', 'review', 'bypass']) {
    assert.equal(evaluateRules(rules(mode), 'code_desktop_preview_open', '*'), 'allow', mode)
    assert.equal(evaluateRules(rules(mode), 'code_desktop_run_in_terminal', '*'), 'allow', mode)
  }
  assert.equal(evaluateRules(rules('ask'), 'github_create_issue', '*'), 'ask', 'other connectors still ask')
  assert.equal(evaluateRules(rules('ask', { appToolsPrefix: '' }), 'code_desktop_preview_open', '*'), 'ask', 'nothing without the tools server')
  assert.equal(evaluateRules(rules('ask', { userRules: [{ permission: 'code_desktop_*', pattern: '*', action: 'deny' }] }), 'code_desktop_preview_open', '*'), 'deny')
  assert.equal(evaluateRules(rules('ask', { deny: [{ permission: 'code_desktop_preview_open', pattern: '*', action: 'deny' }] }), 'code_desktop_preview_open', '*'), 'deny')
})

function bridgeFor(flavor, clientName, { appTools = false } = {}) {
  const home = tmp()
  const cwd = path.join(home, 'w')
  fs.mkdirSync(cwd)
  const env = { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }
  if (appTools) Object.assign(env, { CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/bin/true', args: [] }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/x/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 't' })
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  const patches = []
  let next = 0
  bridge.notify = () => {}
  bridge.clientName = clientName
  bridge.api = async (method, route, options) => {
    calls.push({ method, route, body: options?.body })
    if (method === 'POST' && route === '/session') return { id: `ses_${++next}`, directory: cwd, title: options.body.title ?? 'New session - 2026-10-08T00:00:00.000Z' }
    if (method === 'PATCH' && options?.body?.permission) patches.push(options.body.permission)
    if (method === 'GET' && route === '/config') return {}
    if (method === 'GET' && (route === '/skill' || route === '/command' || route === '/agent')) return []
    return {}
  }
  return { home, cwd, bridge, calls, patches }
}

for (const flavor of ['opencode', 'mimo']) {
  test(`${flavor}: a workflow agent's asks are refused with a reason, never a card; its question tool is off and a question is answered`, async () => {
    const { cwd, bridge, calls, patches } = bridgeFor(flavor, 'code-desktop-workflows')
    const thread = await bridge.createThread({ cwd, approvalPolicy: 'never', sandbox: 'read-only' })
    thread.emit = () => {}
    const asked = []
    thread.clientRequest = async (...args) => { asked.push(args); return { decision: 'decline' } }
    assert.equal(thread.noUser(), true)
    const rules = patches.at(-1) ?? thread.rules()
    assert.equal(evaluateRules(rules, 'question', '*'), 'deny', 'no question tool for workflow agents')
    assert.equal(evaluateRules(rules, 'task', '*'), 'deny', 'no sub-agents outside the run (task)')
    if (flavor === 'mimo') assert.equal(evaluateRules(rules, 'actor', '*'), 'deny', 'no sub-agents outside the run (actor)')
    await thread.onPermission({ id: 'per_env', sessionID: thread.id, permission: 'read', patterns: [path.join(cwd, '.env')], metadata: {} })
    await thread.onPermission({ id: 'per_mcp', sessionID: thread.id, permission: 'github_create_issue', patterns: ['*'], metadata: {} })
    const replies = calls.filter((call) => /\/permission\/.+\/reply$/.test(call.route))
    assert.equal(asked.length, 0, 'no card for the runner to decline')
    assert.deepEqual(replies.map((call) => call.body.reply), ['reject', 'reject'])
    for (const call of replies) assert.ok(typeof call.body.message === 'string' && call.body.message.length > 10, 'reject with a message (CorrectedError)')
    await thread.onQuestion({ id: 'que_1', sessionID: thread.id, questions: [{ question: 'Which file?', header: 'File', options: [] }] })
    const answer = calls.find((call) => call.route === '/question/que_1/reply')
    assert.ok(answer, 'answered, not rejected (a rejected question ends the turn)')
    assert.equal(answer.body.answers.length, 1)
    assert.match(answer.body.answers[0][0], /Decide yourself/)
    assert.equal(asked.length, 0)
  })

  test(`${flavor}: the user's own threads keep their cards and their question tool`, async () => {
    const { cwd, bridge, calls } = bridgeFor(flavor, 'code-desktop')
    const thread = await bridge.createThread({ cwd, approvalPolicy: 'on-request', sandbox: 'read-only' })
    thread.emit = () => {}
    const asked = []
    thread.clientRequest = async (...args) => { asked.push(args); return { decision: 'decline' } }
    assert.equal(thread.noUser(), false)
    assert.notEqual(evaluateRules(thread.rules(), 'question', '*'), 'deny')
    assert.notEqual(evaluateRules(thread.rules(), 'task', '*'), 'deny')
    await thread.onPermission({ id: 'per_env', sessionID: thread.id, permission: 'read', patterns: [path.join(cwd, '.env')], metadata: {} })
    assert.equal(asked.length, 1)
    assert.deepEqual(calls.filter((call) => /\/permission\/.+\/reply$/.test(call.route)).map((call) => call.body.reply), ['reject'])
  })

  test(`${flavor}: a workflow runner's bridge deletes its agents' sessions when it stops; the app's bridge sweeps what a dead runner left`, async () => {
    const runner = bridgeFor(flavor, 'code-desktop-workflows')
    const a = await runner.bridge.createThread({ cwd: runner.cwd, approvalPolicy: 'never' })
    const b = await runner.bridge.createThread({ cwd: runner.cwd, approvalPolicy: 'never' })
    assert.equal(runner.bridge.store.get(a.id).runnerPid, process.pid)
    // A user session in the same store is never touched.
    runner.bridge.store.update('ses_user', { cwd: runner.cwd, createdBy: 'code-desktop' })
    // A dead runner's leftover, and a live other runner's session.
    runner.bridge.store.update('ses_dead', { cwd: runner.cwd, workflowAgent: true, runnerPid: 2 ** 30 })
    await runner.bridge.removeWorkflowSessions({ own: true })
    const deleted = () => runner.calls.filter((call) => call.method === 'DELETE').map((call) => call.route)
    assert.deepEqual(deleted().sort(), [`/session/${a.id}`, `/session/${b.id}`].sort())
    assert.equal(runner.bridge.store.ids().includes(a.id), false)
    // The app's bridge (once per start): only sessions whose runner is gone.
    runner.calls.length = 0
    runner.bridge.store.update('ses_live', { cwd: runner.cwd, workflowAgent: true, runnerPid: process.pid })
    await runner.bridge.removeWorkflowSessions()
    assert.deepEqual(deleted(), ['/session/ses_dead'])
    assert.ok(runner.bridge.store.ids().includes('ses_user'))
    assert.ok(runner.bridge.store.ids().includes('ses_live'))
  })
}

test('mimo: a thread\'s ruleset allows code_desktop_* when the tools server is attached', async () => {
  const { cwd, bridge, patches } = bridgeFor('mimo', 'code-desktop', { appTools: true })
  const thread = await bridge.createThread({ cwd, approvalPolicy: 'untrusted', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'ask' } })
  const rules = patches.at(-1) ?? thread.rules()
  assert.equal(evaluateRules(rules, 'code_desktop_read_terminal', '*'), 'allow')
  assert.equal(evaluateRules(rules, 'bash', 'touch x'), 'ask')
})
