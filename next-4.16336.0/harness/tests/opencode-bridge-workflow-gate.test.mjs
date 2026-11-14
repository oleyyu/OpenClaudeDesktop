// MiMo's own `workflow` tool (work/agents/sources/mimo/packages/opencode/src/tool/workflow.ts, id "workflow") is
// offered only when params.codeDesktop.dynamicWorkflows === true (Dynamic workflows on, MiMo's engine chosen).
// Otherwise the session ruleset ends with {permission:'workflow', pattern:'*', action:'deny'}, which MiMo's
// Permission.disabled() (permission/index.ts) turns into "tool not sent to the model". Plain OpenCode has no such tool.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, LiveThread, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-wfgate-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

// MiMo's Permission.disabled(): the last matching rule decides; only a `*` deny drops the tool.
const match = (value, pattern) => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(value)
const disabled = (tool, rules) => { const rule = rules.findLast((r) => match(tool, r.permission)); return rule?.pattern === '*' && rule.action === 'deny' }
const workflowDeny = (rules) => rules.filter((rule) => rule.permission === 'workflow' && rule.pattern === '*' && rule.action === 'deny')

function liveThread(flavor, home = tmp()) {
  const env = { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }
  const bridge = new Bridge({ flavor, binary: '', stateDir: path.join(home, 'state'), env, input: new PassThrough(), output: new PassThrough() })
  const patches = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => {
    if (method === 'GET' && route === '/config') return {}
    if (method === 'GET' && (route === '/skill' || route === '/command')) return []
    if (method === 'PATCH') patches.push(options.body.permission)
    return {}
  }
  const thread = new LiveThread(bridge, { info: { id: 'ses_wf', directory: path.join(home, 'project') } })
  thread.emit = () => {}
  bridge.threads.set(thread.id, thread)
  return { home, bridge, thread, patches }
}

const start = (dynamicWorkflows) => ({ approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [] }, codeDesktop: { permissionMode: 'acceptEdits', ...(dynamicWorkflows === undefined ? {} : { dynamicWorkflows }) } })

test('MiMo: dynamicWorkflows false or missing denies the workflow tool; true offers it', async () => {
  for (const flag of [false, undefined]) {
    const { thread, patches } = liveThread(FLAVORS.mimo)
    await thread.applyParams(start(flag), { initial: true })
    const rules = patches.at(-1)
    assert.equal(workflowDeny(rules).length, 1, `flag ${flag}`)
    assert.equal(disabled('workflow', rules), true, `flag ${flag}`)
    assert.equal(disabled('bash', rules), false)
  }
  const { thread, patches } = liveThread(FLAVORS.mimo)
  await thread.applyParams(start(true), { initial: true })
  assert.deepEqual(workflowDeny(patches.at(-1)), [])
  assert.equal(disabled('workflow', patches.at(-1)), false)
})

test('MiMo: a turn/start flips the flag and re-PATCHes the rules; an absent flag keeps the last value', async () => {
  const { thread, patches, bridge, home } = liveThread(FLAVORS.mimo)
  await thread.applyParams(start(true), { initial: true })
  assert.equal(disabled('workflow', patches.at(-1)), false)
  // turn/start with dynamicWorkflows:false (OpenClaude Desktop's engine chosen): the tool is withheld at once.
  await thread.applyParams({ input: [], codeDesktop: { permissionMode: 'acceptEdits', dynamicWorkflows: false } })
  assert.equal(disabled('workflow', patches.at(-1)), true)
  // A turn without the hint changes nothing (no PATCH).
  const count = patches.length
  await thread.applyParams({ input: [], codeDesktop: { permissionMode: 'acceptEdits' } })
  await thread.applyRules()
  assert.equal(patches.length, count)
  await thread.applyParams({ input: [], codeDesktop: { permissionMode: 'acceptEdits', dynamicWorkflows: true } })
  assert.equal(disabled('workflow', patches.at(-1)), false)
  // Persisted: a thread reopened from the store keeps the choice.
  assert.equal(bridge.store.get('ses_wf').dynamicWorkflows, true)
  const reopened = new LiveThread(bridge, { info: { id: 'ses_wf', directory: path.join(home, 'project') } })
  assert.equal(reopened.dynamicWorkflows, true)
  assert.deepEqual(workflowDeny(reopened.rules()), [])
})

test('MiMo: sub-agents follow the root thread\'s flag', async () => {
  const { thread, bridge, patches } = liveThread(FLAVORS.mimo)
  await thread.applyParams(start(false), { initial: true })
  const child = new LiveThread(bridge, { info: { id: 'ses_child', directory: thread.cwd, parentID: thread.id }, root: thread, parent: thread })
  bridge.children.set(child.id, child)
  assert.equal(disabled('workflow', child.rules()), true)
  await thread.applyParams({ input: [], codeDesktop: { dynamicWorkflows: true } })
  assert.equal(child.dynamicWorkflows, true)
  assert.equal(disabled('workflow', child.rules()), false)
  assert.equal(disabled('workflow', patches.at(-1)), false)
})

test('OpenCode (no native workflow tool) never gets the workflow deny rule', async () => {
  for (const flag of [false, undefined, true]) {
    const { thread, patches } = liveThread(FLAVORS.opencode)
    await thread.applyParams(start(flag), { initial: true })
    assert.deepEqual(workflowDeny(patches.at(-1)), [], `flag ${flag}`)
  }
})

test('capabilities stay as they were: MiMo offers its own workflows and structured output; OpenCode no workflows', () => {
  const mimo = capabilitiesFor(FLAVORS.mimo)
  const opencode = capabilitiesFor(FLAVORS.opencode)
  assert.deepEqual([mimo.modelWorkflows, mimo.structuredOutput, mimo.permissionHints], [true, true, true])
  assert.deepEqual([opencode.modelWorkflows, opencode.structuredOutput], [false, true])
  for (const caps of [mimo, opencode]) assert.equal(Object.hasOwn(caps, 'workflowsNeedBypass'), false)
})
