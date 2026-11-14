import test from 'node:test'
import assert from 'node:assert/strict'
import { SessionGrants, applyPermissions } from '../packages/codex-app-server/src/approval.js'
import { commandLine, commandResult, executeCommand, listedCommands, requireCommandPermission } from '../packages/codex-app-server/src/commands.js'

test('the core\'s commands are listed, except the ones OpenClaude Desktop drives itself', () => {
  const rows = listedCommands([
    { name: 'compact', description: 'Compact the conversation' },
    { name: 'feedback', description: 'Send feedback' },
    { name: 'goal', description: 'Set a long-running goal', input: { hint: '<objective> | pause | resume | clear' }, definitionId: 'dsh-command-goal/goal' },
    { name: 'permission', description: 'Switch the permission preset', input: { hint: '<preset>' } },
    { name: 'plan', description: 'Enter plan mode', input: { hint: '<message>' } },
    { name: 'Bad Name', description: 'x' },
  ])
  assert.deepEqual(rows, [
    { name: 'feedback', description: 'Send feedback', inputHint: null, acceptsAttachments: false, definitionId: null },
    { name: 'goal', description: 'Set a long-running goal', inputHint: '<objective> | pause | resume | clear', acceptsAttachments: false, definitionId: 'dsh-command-goal/goal' },
  ])
  assert.deepEqual(listedCommands(undefined), [])
})

test('a command line is the slash name and its input', () => {
  assert.equal(commandLine('goal', 'ship the migration'), '/goal ship the migration')
  assert.equal(commandLine('/goal', '  resume'), '/goal resume')
  assert.equal(commandLine('goal'), '/goal')
  assert.throws(() => commandLine('Goal!'), (error) => error.code === -32602)
  assert.throws(() => commandLine('compact'), /own control/)
  assert.throws(() => commandLine('plan', 'x'), /own control/)
  assert.throws(() => commandLine('permission', 'yolo'), /own control/)
})

test('an execution settles as success or error text', () => {
  assert.deepEqual(commandResult({ commandId: 'c1', result: { kind: 'success', text: 'Goal set.' } }), { kind: 'success', text: 'Goal set.', commandId: 'c1' })
  assert.deepEqual(commandResult({ commandId: 'c2', result: { kind: 'error', text: 'No goal.' } }), { kind: 'error', text: 'No goal.', commandId: 'c2' })
  assert.deepEqual(commandResult({ commandId: 'c3', result: { kind: 'success' } }), { kind: 'success', text: null, commandId: 'c3' })
})

// A thread as openThread leaves an unloaded one: LiveThread's default permission, no hint yet.
const coldThread = () => ({
  id: 't1', cwd: '/w', agent: { session: {} }, sessionGrants: new SessionGrants(),
  permission: { approvalPolicy: 'on-request', sandbox: 'workspace-write', mode: undefined, afterPlan: 'auto', extraRoots: [] },
})
// permission-policy turnPermissionParams for Ask permissions with hints.
const askParams = { approvalsReviewer: 'user', approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: ['/w'], networkAccess: false }, codeDesktop: { permissionMode: 'ask', afterPlan: 'auto' } }

test('a core command runs under the permission its request carries, applied before it starts', async () => {
  // The last turn ran in Bypass; the user picked Ask permissions while idle.
  const thread = coldThread()
  Object.assign(thread.permission, { approvalPolicy: 'never', sandbox: 'danger-full-access', mode: 'bypass' })
  const presets = { session: 'danger-full-access', current: () => presets.session, set: async (_session, target) => { presets.session = target } }
  const seen = []
  const commands = { execute: async (agent, line) => { seen.push({ agent, line, permission: { ...thread.permission }, preset: presets.session }); return { commandId: 'c1', result: { kind: 'success', text: 'Goal set.' } } } }
  const result = await executeCommand(commands, { threadId: 't1', command: 'goal', args: 'refactor the auth module', ...askParams }, {
    open: async () => thread,
    prepare: (live, request) => applyPermissions(live, request, { presets }),
  })
  assert.deepEqual(result, { kind: 'success', text: 'Goal set.', commandId: 'c1' })
  assert.equal(seen.length, 1)
  assert.equal(seen[0].agent, thread.agent)
  assert.equal(seen[0].line, '/goal refactor the auth module')
  assert.equal(seen[0].permission.approvalPolicy, 'untrusted')
  assert.equal(seen[0].permission.mode, 'ask')
  assert.equal(seen[0].permission.sandbox, 'workspace-write')
  assert.equal(seen[0].preset, 'workspace-write')
})

test('a core command without the session\'s permission is refused before the thread opens', async () => {
  let opened = false
  let ran = false
  const hooks = { open: async () => { opened = true; return coldThread() }, prepare: async () => {} }
  const commands = { execute: async () => { ran = true; return { result: { kind: 'success' } } } }
  for (const params of [{ threadId: 't1', command: 'goal', args: 'x' }, { threadId: 't1', command: 'goal', approvalPolicy: 'untrusted' }, { threadId: 't1', command: 'goal', sandboxPolicy: { type: 'readOnly' } }]) {
    await assert.rejects(executeCommand(commands, params, hooks), (error) => error.code === -32602 && /permission/.test(error.message))
  }
  assert.equal(opened, false)
  assert.equal(ran, false)
  assert.doesNotThrow(() => requireCommandPermission({ approvalPolicy: 'never', sandbox: 'danger-full-access' }))
  // An app-owned or malformed name fails first, whatever permission came with it.
  await assert.rejects(executeCommand(commands, { command: 'plan', ...askParams }, hooks), /own control/)
})

test('an unknown command is INVALID_PARAMS after the permission applied', async () => {
  const thread = coldThread()
  const err = await executeCommand({ execute: async () => undefined }, { command: 'nope', ...askParams }, { open: async () => thread, prepare: (live, request) => applyPermissions(live, request, { presets: { current: () => 'x', set: async () => {} } }) }).then(() => null, (error) => error)
  assert.equal(err?.code, -32602)
  assert.match(err.message, /Unknown command: \/nope/)
})
