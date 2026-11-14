// Dynamic-workflow smoke of the ZCode core against the real ZCode agent (`zcode app-server --stdio` from the pinned
// release) behind harness/packages/zcode-bridge, driven through OpenClaude Desktop's own client (app/electron/codex.cjs) with
// a local scripted Anthropic-Messages model standing in for GLM and for the workflow's agents. Checks the run GLM starts
// with CreateWorkflow reaches the app as item.workflowRun (phases, agents, end) live and after a restart, that Stop
// cancels only that run, that outside Bypass a run asks once on the workflow card (Deny starts nothing), and that
// Bypass asks nothing. Isolated: a temp HOME, no network.
//
// Usage: node tests/zcode-bridge-workflows-smoke.mjs   (ZCODE_BINARY=/path/to/zcode.cjs to use another ZCode)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startFakeAnthropic, userText, toolResultFor, textOf } from '../packages/zcode-bridge/test-support/fake-anthropic.mjs'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..', '..')
const { CodexClient } = require(path.join(root, 'app/electron/codex.cjs'))
const { respondToApproval } = require(path.join(root, 'app/electron/respond-approval.cjs'))
const { workflowNotificationSummary } = await import(path.join(root, 'app/electron/prefs/workflow-keyword.mjs'))
const RUN_REASON = 'Run this workflow? Its agents will run without asking for approval.'
const BRIDGE = path.join(root, 'harness/packages/zcode-bridge/bin/app-server.mjs')
const AGENT = process.env.ZCODE_BINARY || path.join(root, 'work/agents/zcode-bridge/zcode-3.14.3/glm/zcode.cjs')
if (!fs.existsSync(AGENT)) { console.error(`ZCode runtime not found at ${AGENT} (set ZCODE_BINARY).`); process.exit(2) }

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-zcode-wf-')))
const ws = path.join(home, 'project')
fs.mkdirSync(ws, { recursive: true })
const SCRIPT = [
  'phase("Greet");',
  'const hello = await agent("greeter").ask("WF_HELLO say hello");',
  'phase("Slow");',
  'const slow = await agent("sleeper").ask("WF_SLOW take your time");',
  'return { hello, slow };',
].join('\n')
let hold = true
const actorRequests = []
const fake = await startFakeAnthropic(async (body) => {
  const typed = userText(body)
  const first = textOf(body.messages?.[0]?.content)
  if (/WF_HELLO/.test(first)) { actorRequests.push('greeter'); return { text: 'hello from the greeter' } }
  if (/WF_SLOW/.test(first)) { actorRequests.push('sleeper'); return hold ? { hang: true } : { text: 'slow done' } }
  if (/Generate a concise title/.test(textOf(body.system))) return { text: 'Workflow smoke' }
  if (/RUN_WF/.test(typed) && !toolResultFor(body, 'Skill')) return { tool: { name: 'Skill', input: { skill: 'dynamic-workflows' } } }
  if (/RUN_WF/.test(typed) && !toolResultFor(body, 'CreateWorkflow')) return { tool: { name: 'CreateWorkflow', input: { name: 'smoke-wf', script: SCRIPT } } }
  if (/<task-notification>/.test(typed)) return { text: 'The workflow finished.' }
  if (/RUN_WF/.test(typed)) return { text: 'Started the workflow.' }
  return { text: `tools: ${(body.tools ?? []).map((tool) => tool.name).join(',')}` }
})

const env = { HOME: home, TMPDIR: os.tmpdir(), XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
  CODE_DESKTOP_AGENT_BINARY: AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_AGENT_VERSION: '3.14.3', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'bridge-state'), CODE_DESKTOP_NODE_BINARY: process.execPath, NO_PROXY: '*',
  CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN: fake.url, CODE_DESKTOP_ZCODE_QUOTA_ORIGIN: fake.url }
let client = null
let events = []
let waiters = []
async function connect() {
  events = []
  client = new CodexClient({ binary: BRIDGE, initializeTimeout: 120000, env })
  client.on('event', (event) => { events.push(event); for (const waiter of [...waiters]) waiter(event) })
  return client.start()
}
function waitFor(predicate, ms = 60000, from = 0) {
  const hit = events.slice(from).find(predicate)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiters = waiters.filter((w) => w !== waiter); reject(new Error(`timed out waiting (${predicate.toString().slice(0, 160)})`)) }, ms)
    const waiter = (event) => { if (predicate(event)) { clearTimeout(timer); waiters = waiters.filter((w) => w !== waiter); resolve(event) } }
    waiters.push(waiter)
  })
}
const modeParams = (mode) => ({ approvalPolicy: mode === 'bypass' ? 'never' : 'on-request', sandbox: mode === 'bypass' ? 'danger-full-access' : 'workspace-write', codeDesktop: { permissionMode: mode, afterPlan: 'auto', dynamicWorkflows: true } })
const turnParams = (threadId, text, mode) => ({ threadId, input: [{ type: 'text', text, text_elements: [] }], cwd: ws, approvalsReviewer: 'user', approvalPolicy: modeParams(mode).approvalPolicy,
  sandboxPolicy: mode === 'bypass' ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [ws], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false }, codeDesktop: modeParams(mode).codeDesktop })
const runOf = (event) => event.params?.item?.workflowRun
const runUpdate = (predicate, from = 0, ms = 60000) => waitFor((e) => (e.method === 'item/completed' || e.method === 'item/started') && runOf(e) && predicate(runOf(e)), ms, from)

let passed = 0
const failed = []
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok - ${name}`) } catch (error) { failed.push(name); console.log(`not ok - ${name}: ${error?.stack?.split('\n').slice(0, 4).join(' | ') || error}`) }
}

let threadId = null
let runId = null
let noticeId = null
try {
  const init = await connect()
  await check('initialize: ZCode runs dynamic workflows on its own engine, in every mode', async () => {
    assert.equal(init.capabilities.modelWorkflows, true)
    assert.equal(Object.hasOwn(init.capabilities, 'workflowsNeedBypass'), false)
    await client.request('account/login/start', { type: 'apiKey', apiKey: 'sk-wf', codeDesktop: { template: 'zai-api', baseUrl: fake.url } })
  })

  await check('outside Bypass the run tools are offered to GLM (and the read-only ones)', async () => {
    const { thread } = await client.request('thread/start', { cwd: ws, approvalsReviewer: 'user', ...modeParams('auto') })
    const from = fake.requests.length
    const started = events.length
    await client.request('turn/start', turnParams(thread.id, 'LIST_TOOLS', 'auto'))
    await waitFor((e) => e.method === 'turn/completed' && e.params.threadId === thread.id, 60000, started)
    const tools = fake.requests.slice(from).map((request) => (request.body?.tools ?? []).map((tool) => tool.name)).find((names) => names.length) ?? []
    assert.ok(tools.length, 'the model saw tools')
    assert.ok(tools.includes('CreateWorkflow') && tools.includes('AmendWorkflow') && tools.includes('ResumeWorkflowRun'), tools.join(','))
    assert.ok(tools.includes('ListWorkflowRuns'), `the workflow tools are registered for the session: ${tools.join(',')}`)
  })

  await check('outside Bypass ZCode asks before the run: one workflow card naming the script; Deny starts nothing', async () => {
    const { thread } = await client.request('thread/start', { cwd: ws, approvalsReviewer: 'user', ...modeParams('auto') })
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'RUN_WF', 'auto'))
    const card = await waitFor((e) => e.kind === 'request' && /requestApproval/.test(e.method) && e.params?.threadId === thread.id, 60000, from)
    assert.equal(card.method, 'item/commandExecution/requestApproval')
    assert.equal(card.params.reason, RUN_REASON)
    assert.equal(card.params.command, 'CreateWorkflow: smoke-wf\nPhases: Greet → Slow')
    assert.equal(card.params.sessionGrantable, true, 'ZCode\'s "Allow for this session" is offered for CreateWorkflow')
    assert.equal(respondToApproval(client, { id: card.id, expected: card.bridgeApproval, decision: 'decline' }).ok, true)
    await waitFor((e) => e.method === 'turn/completed' && e.params.threadId === thread.id, 60000, from)
    const runs = events.slice(from).filter((e) => (e.method === 'item/completed' || e.method === 'item/started') && e.params?.threadId === thread.id && runOf(e)).map(runOf)
    assert.ok(runs.length, 'the call shows as a run')
    const last = runs.at(-1)
    assert.notEqual(last.status, 'running', JSON.stringify(last))
    assert.ok(!runs.some((run) => typeof run.runId === 'string' && run.runId.startsWith('dwfrun-')), 'ZCode never started a run')
    assert.equal(events.slice(from).filter((e) => e.kind === 'request' && /requestApproval/.test(e.method)).length, 1, 'one card')
    assert.equal(actorRequests.length, 0, 'no workflow agent ran')
  })

  await check('Bypass: GLM’s CreateWorkflow runs without a card and shows as a live run with phases and agents', async () => {
    const { thread } = await client.request('thread/start', { cwd: ws, approvalsReviewer: 'user', ...modeParams('bypass') })
    threadId = thread.id
    const from = events.length
    await client.request('turn/start', turnParams(threadId, 'RUN_WF', 'bypass'))
    const started = await runUpdate((run) => run.status === 'running', from)
    assert.equal(runOf(started).source, 'model')
    assert.equal(runOf(started).name, 'smoke-wf')
    const named = await runUpdate((run) => typeof run.runId === 'string' && run.runId.startsWith('dwfrun-'), from)
    assert.equal(events.slice(from).some((e) => e.kind === 'request' && /requestApproval/.test(e.method)), false, 'Bypass: no card')
    runId = runOf(named).runId
    assert.equal(runOf(named).id, runId)
    assert.equal(runOf(named).stopScope, undefined)
    const progressed = await runUpdate((run) => run.workflowProgress.some((entry) => entry.type === 'workflow_agent' && entry.label === 'sleeper' && entry.state === 'progress'), from, 90000)
    const run = runOf(progressed)
    assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map((entry) => entry.title), ['Greet', 'Slow'])
    const greeter = run.workflowProgress.find((entry) => entry.label === 'greeter')
    assert.equal(greeter?.state, 'done', JSON.stringify(run.workflowProgress))
    assert.equal(greeter.phaseTitle, 'Greet')
    assert.equal(run.status, 'running')
    assert.equal(run.memberControls, undefined)
  })

  await check('Stop cancels only that run (its sleeping agent is Skipped), through its background task', async () => {
    const from = events.length
    const result = await client.request('codeDesktop/workflow/stop', { threadId, runId })
    assert.equal(result.status, 'stopping')
    const stopped = runOf(await runUpdate((run) => run.status === 'stopped', from, 60000))
    assert.equal(stopped.runId, runId)
    assert.equal(stopped.workflowProgress.find((entry) => entry.label === 'sleeper').state, 'skipped')
    assert.equal(stopped.workflowProgress.find((entry) => entry.label === 'greeter').state, 'done')
    assert.deepEqual(await client.request('codeDesktop/workflow/stop', { threadId, runId }), { status: 'alreadyFinished' })
  })

  await check('the turn ZCode starts to tell GLM the run ended opens with the app\'s "Background workflow stopped" notice', async () => {
    const notice = await waitFor((e) => e.method === 'item/completed' && e.params.threadId === threadId && e.params.item?.type === 'userMessage' && workflowNotificationSummary(e.params.item.content?.[0]?.text), 60000)
    assert.deepEqual(workflowNotificationSummary(notice.params.item.content[0].text), { status: 'stopped', summary: 'Dynamic workflow "smoke-wf" was stopped', taskId: runId, ...(workflowNotificationSummary(notice.params.item.content[0].text).durationMs !== undefined ? { durationMs: workflowNotificationSummary(notice.params.item.content[0].text).durationMs } : {}) })
    noticeId = notice.params.item.id
  })

  await check('after a restart the session replays the same run from ZCode’s journal', async () => {
    await waitFor((e) => e.method === 'turn/completed' && e.params.threadId === threadId, 60000).catch(() => {})
    client.stop?.()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await connect()
    const response = await client.request('thread/resume', { threadId, cwd: ws, ...modeParams('bypass') })
    const run = response.thread.turns.flatMap((turn) => turn.items).find((item) => item.workflowRun)?.workflowRun
    assert.ok(run, 'the tool item carries its run')
    assert.equal(run.runId, runId)
    assert.equal(run.status, 'stopped')
    assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_phase').map((entry) => entry.title), ['Greet', 'Slow'])
    assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((entry) => [entry.label, entry.state]), [['greeter', 'done'], ['sleeper', 'skipped']])
    const replayed = response.thread.turns.find((turn) => turn.items.some((item) => item.id === noticeId))
    assert.ok(replayed, 'the notice is replayed')
    assert.equal(replayed.items[0].id, noticeId, 'first in the turn GLM answers it in')
    assert.equal(workflowNotificationSummary(replayed.items[0].content[0].text)?.status, 'stopped')
  })
} finally {
  client?.stop?.()
  await fake.close?.()
  console.log(`\n${passed} passed, ${failed.length} failed${failed.length ? `: ${failed.join('; ')}` : ''}`)
  process.exitCode = failed.length ? 1 : 0
  setTimeout(() => process.exit(process.exitCode), 1000).unref()
}
