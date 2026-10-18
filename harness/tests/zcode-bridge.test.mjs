// Unit tests of the ZCode bridge's mapping logic (harness/packages/zcode-bridge/src). The end-to-end parity run
// against the real ZCode agent is tests/zcode-bridge-smoke.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { toolItem, todoPlan, diffFromStructuredPatch, backgroundTaskIdOf, planItem } from '../packages/zcode-bridge/src/items.js'
import { turnsFromMessages, previewOf, userContent, activeMessages } from '../packages/zcode-bridge/src/history.js'
import { permissionOf, zcodeMode, codexPolicy, permissionAnswer, approvalRequest, questionRequest, questionAnswer, grantKey, sessionGrant, noApprovalAnswer, isReadOnlyMode } from '../packages/zcode-bridge/src/permissions.js'
import { goalObjective, instructionsBlock, instructionsKey, placeInstructions, stripInstructions } from '../packages/zcode-bridge/src/instructions.js'
import { rewriteProviderConfig, restoreProviderConfig, upstreamUrl, applyToRequest, systemPromptOf, ProviderProxy, ProviderConfigMirror, unproxiedBaseUrl } from '../packages/zcode-bridge/src/provider-proxy.js'
import * as accounts from '../packages/zcode-bridge/src/accounts.js'
import * as catalog from '../packages/zcode-bridge/src/catalog.js'
import { LiveProjector, turnError, unifiedDiff } from '../packages/zcode-bridge/src/live.js'
import { accountUsage, codeStats, sessionRevert } from '../packages/zcode-bridge/src/usage.js'
import { builtinConfigNear, locateAgent, zcodePaths } from '../packages/zcode-bridge/src/locate.js'
import { InteractionRegistry } from '../packages/zcode-bridge/src/interactions.js'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'zcb-unit-'))

// ------------------------------------------------------------------ items

test('Bash maps to commandExecution with output and exit code', () => {
  const item = toolItem({ callId: 'c1', tool: 'Bash', input: { command: 'ls', description: 'List' }, status: 'completed', result: { success: true, content: 'a\nb', perf: { detail: { command: { exitCode: 0 } } } }, cwd: '/w', threadId: 't' })
  assert.equal(item.type, 'commandExecution')
  assert.equal(item.command, 'ls')
  assert.equal(item.aggregatedOutput, 'a\nb')
  assert.equal(item.exitCode, 0)
  assert.equal(item.description, 'List')
  const running = toolItem({ callId: 'c1', tool: 'Bash', input: { command: 'ls' }, status: 'inProgress', cwd: '/w', threadId: 't' })
  assert.equal(running.aggregatedOutput, null)
  assert.equal(running.exitCode, null)
})

test('background Bash carries the task id as processId', () => {
  const content = 'Command running in background with ID: exec_abc-1. Output is being written to: /x.log.'
  assert.equal(backgroundTaskIdOf(content), 'exec_abc-1')
  const item = toolItem({ callId: 'c', tool: 'Bash', input: { command: 'sleep 1', run_in_background: true }, status: 'inProgress', result: { success: true, content }, cwd: '/w', threadId: 't' })
  assert.equal(item.processId, 'exec_abc-1')
})

test('Read is a read action; Edit/Write are fileChange with diffs', () => {
  const read = toolItem({ callId: 'r', tool: 'Read', input: { file_path: '/w/a.txt' }, status: 'completed', result: { content: '1\tx' }, cwd: '/w', threadId: 't' })
  assert.deepEqual(read.commandActions[0], { type: 'read', command: 'Read /w/a.txt', name: 'a.txt', path: '/w/a.txt' })
  const edit = toolItem({ callId: 'e', tool: 'Edit', input: { file_path: '/w/a.txt', old_string: 'two', new_string: 'TWO' }, status: 'completed', result: { display: { kind: 'file_diff', filePath: '/w/a.txt', additions: 1, deletions: 1, structuredPatch: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: [' one', '-two', '+TWO'] }] } }, cwd: '/w', threadId: 't' })
  assert.equal(edit.type, 'fileChange')
  assert.equal(edit.changes[0].diff, '@@ -1,2 +1,2 @@\n one\n-two\n+TWO\n')
  assert.deepEqual(edit.changes[0].kind, { type: 'update', move_path: null })
  const pending = toolItem({ callId: 'e', tool: 'Edit', input: { file_path: '/w/a.txt', old_string: 'two', new_string: 'TWO' }, status: 'inProgress', cwd: '/w', threadId: 't' })
  assert.match(pending.changes[0].diff, /-two\n\+TWO/)
  const write = toolItem({ callId: 'w', tool: 'Write', input: { file_path: '/w/new.txt', content: 'hi\n' }, status: 'inProgress', existed: false, cwd: '/w', threadId: 't' })
  assert.deepEqual(write.changes[0].kind, { type: 'add' })
  assert.equal(write.changes[0].diff, 'hi\n')
  assert.equal(diffFromStructuredPatch(null), null)
})

test('web, MCP, sub-agent, plan and other tools', () => {
  assert.deepEqual(toolItem({ callId: 'w', tool: 'WebSearch', input: { query: 'glm' }, status: 'inProgress', cwd: '/', threadId: 't' }).action, { type: 'search', query: 'glm', queries: ['glm'] })
  assert.deepEqual(toolItem({ callId: 'w', tool: 'WebFetch', input: { url: 'https://x' }, status: 'inProgress', cwd: '/', threadId: 't' }).action, { type: 'openPage', url: 'https://x' })
  const mcp = toolItem({ callId: 'm', tool: 'mcp__files__read', input: { path: '/x' }, status: 'completed', result: { content: 'data' }, cwd: '/', threadId: 't' })
  assert.equal(mcp.type, 'mcpToolCall')
  assert.equal(mcp.server, 'files')
  assert.equal(mcp.tool, 'read')
  assert.deepEqual(mcp.result.content, [{ type: 'text', text: 'data' }])
  const agent = toolItem({ callId: 'a', tool: 'Agent', input: { prompt: 'go', description: 'Child' }, status: 'completed', result: { content: 'done' }, childThreadId: 'sess_subagent_agent_1', cwd: '/', threadId: 'sess_p' })
  assert.equal(agent.type, 'collabAgentToolCall')
  assert.deepEqual(agent.receiverThreadIds, ['sess_subagent_agent_1'])
  assert.equal(agent.senderThreadId, 'sess_p')
  assert.equal(agent.description, 'Child')
  assert.deepEqual(planItem('x', { plan: '1. a' }), { type: 'plan', id: 'plan-x', text: '1. a' })
  const other = toolItem({ callId: 'o', tool: 'Skill', input: { skill: 's' }, status: 'failed', error: 'nope', cwd: '/', threadId: 't' })
  assert.equal(other.type, 'dynamicToolCall')
  assert.equal(other.success, false)
  assert.deepEqual(todoPlan({ todos: [{ content: 'a', status: 'in_progress' }, { content: 'b', status: 'completed' }, { content: 'c', status: 'pending' }] }), [{ step: 'a', status: 'inProgress' }, { step: 'b', status: 'completed' }, { step: 'c', status: 'pending' }])
})

// ------------------------------------------------------------------ history

const sample = [
  { info: { role: 'user', id: 'msg_u1', time: { created: 1000 }, anchor: { turnId: 'turn_1' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'RUN it' }] },
  { info: { role: 'assistant', id: 'msg_a1', time: { created: 1100, completed: 1500 }, anchor: { turnId: 'turn_1' } }, parts: [
    { type: 'step-start' }, { type: 'reasoning', text: 'think' }, { type: 'text', text: 'Running.' },
    { type: 'tool', callID: 'toolu_1', tool: 'Bash', state: { status: 'completed', input: { command: 'ls' }, output: 'a', time: { start: 1200, end: 1300 } } },
    { type: 'tool', callID: 'toolu_2', tool: 'TodoWrite', state: { status: 'completed', input: { todos: [{ content: 'x', status: 'pending' }] }, output: '' } },
    { type: 'step-finish', tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 10, write: 0 } } },
  ] },
  { info: { role: 'assistant', id: 'msg_a2', time: { created: 1500, completed: 1600 }, anchor: { turnId: 'turn_1' } }, parts: [{ type: 'text', text: 'Done.' }] },
  { info: { role: 'user', id: 'msg_u2', time: { created: 2000 }, anchor: { turnId: 'turn_2' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'second' }] },
  { info: { role: 'assistant', id: 'msg_a3', time: { created: 2100 }, anchor: { turnId: 'turn_2' } }, parts: [{ type: 'tool', callID: 'toolu_3', tool: 'Edit', state: { status: 'error', input: { file_path: '/a', old_string: 'x', new_string: 'y' }, error: "The user doesn't want to proceed with this tool use." } }] },
]

test('history: turns by ZCode turn id with stable item ids, plan and usage', () => {
  const { turns, plan, lastUsage, totalUsage } = turnsFromMessages(sample, { threadId: 'sess_1', cwd: '/w' })
  assert.deepEqual(turns.map((turn) => turn.id), ['turn_1', 'turn_2'])
  assert.deepEqual(turns[0].items.map((item) => `${item.type}:${item.id}`), ['userMessage:msg_u1', 'reasoning:msg_a1#r0', 'agentMessage:msg_a1#t0', 'commandExecution:toolu_1', 'agentMessage:msg_a2#t0'])
  assert.equal(turns[0].status, 'completed')
  assert.equal(turns[0].startedAt, 1)
  assert.equal(turns[0].durationMs, 600)
  assert.equal(turns[1].items[1].status, 'declined')
  assert.equal(turns[1].status, 'interrupted', 'an unfinished turn in an idle session ended')
  assert.deepEqual(plan, [{ step: 'x', status: 'pending' }])
  assert.equal(lastUsage.input, 100)
  // Every step's tokens added up: a reopened thread's total starts there, not at zero.
  assert.deepEqual(totalUsage, { input: 100, output: 20, reasoning: 0, cache: { read: 10, write: 0 } })
  assert.equal(previewOf(sample), 'RUN it')
  const live = turnsFromMessages(sample, { threadId: 'sess_1', cwd: '/w', running: true, activeTurnId: 'turn_2' })
  assert.equal(live.turns[1].status, 'inProgress')
  assert.equal(live.turns[1].items[1].status, 'declined')
})

test('history: recorded input parts win; file parts become images or mentions', () => {
  const recorded = [{ type: 'text', text: 'x', text_elements: [] }, { type: 'skill', name: 's', path: '/s' }]
  assert.deepEqual(userContent({ parts: [] }, recorded), recorded)
  assert.deepEqual(userContent({ parts: [{ type: 'file', mime: 'image/png', url: 'file:///tmp/a.png' }, { type: 'file', mime: 'text/plain', url: '/w/b.ts', filename: 'b.ts' }] }), [{ type: 'localImage', path: '/tmp/a.png' }, { type: 'mention', name: 'b.ts', path: '/w/b.ts' }])
})

test('history: a ZCode rewind (session.revert) hides the cut branch; turns name the prompt to rewind to', () => {
  const user = (id, turn, text, extra = {}) => ({ info: { role: 'user', id, time: { created: 1 }, anchor: { turnId: turn }, semantics: { origin: 'real_user', kind: 'user_prompt' }, ...extra }, parts: [{ type: 'text', text }] })
  const assistant = (id, turn, text) => ({ info: { role: 'assistant', id, time: { created: 2, completed: 3 }, anchor: { turnId: turn } }, parts: [{ type: 'text', text }] })
  const stored = [
    user('m1', 't1', 'one'), assistant('a1', 't1', 'r1'),
    user('m2', 't2', 'two'), assistant('a2', 't2', 'r2'),
    user('m3', 't3', 'three'), assistant('a3', 't3', 'r3'),
    assistant('ack', 't4', 'Rewound conversation to before message m2.'),
    user('m5', 't5', 'five'), assistant('a5', 't5', 'r5'),
  ]
  // `/rewind conversation m2` after turn 3 (ZCode's applyConversationRewindPlan), then turn 5 on the new branch.
  const revert = { kind: 'conversation_rewind', scope: 'conversation', targetMessageID: 'm2', keptMessageIDs: ['m1', 'a1'], branchCutAfterMessageID: 'a3', branchGeneration: 1, messageID: 'a1' }
  const built = turnsFromMessages(activeMessages(stored, revert), { threadId: 's', cwd: '/w' })
  assert.deepEqual(built.turns.map((turn) => turn.id), ['t1', 't5'])
  assert.deepEqual(built.anchors, { t1: 'm1', t5: 'm5' })
  assert.deepEqual(turnsFromMessages(activeMessages(stored, null), { threadId: 's', cwd: '/w' }).turns.map((turn) => turn.id), ['t1', 't2', 't3', 't5'], 'no revert: every turn, the acknowledgement left out')
  // A second rewind keeps its own prefix (keptMessageIDs), so the first cut branch never resurfaces.
  const second = { ...revert, targetMessageID: 'm5', keptMessageIDs: ['m1', 'a1'], branchCutAfterMessageID: 'a5', branchGeneration: 2 }
  assert.deepEqual(activeMessages([...stored, user('m6', 't6', 'six')], second).map((message) => message.info.id), ['m1', 'a1', 'm6'])
  // Older rows without a cut: the prefix before the target.
  assert.deepEqual(activeMessages(stored.slice(0, 6), { targetMessageID: 'm3' }).map((message) => message.info.id), ['m1', 'a1', 'm2', 'a2'])
  // A compaction summary is not a prompt ZCode can rewind to.
  assert.deepEqual(turnsFromMessages([user('s1', 'tc', 'summary', { summary: true }), assistant('ac', 'tc', 'x')], { threadId: 's', cwd: '/w' }).anchors, {})
})

test('history: the session row’s revert is read from ZCode’s database', async () => {
  const { DatabaseSync } = await import('node:sqlite')
  const file = path.join(tmp(), 'db.sqlite')
  const db = new DatabaseSync(file)
  db.exec('create table session (id text primary key, revert text)')
  db.prepare('insert into session (id, revert) values (?, ?)').run('sess_a', JSON.stringify({ targetMessageID: 'm2', keptMessageIDs: ['m1'] }))
  db.prepare('insert into session (id, revert) values (?, ?)').run('sess_b', null)
  db.close()
  assert.deepEqual(await sessionRevert(file, 'sess_a'), { targetMessageID: 'm2', keptMessageIDs: ['m1'] })
  assert.equal(await sessionRevert(file, 'sess_b'), null)
  assert.equal(await sessionRevert(file, 'sess_missing'), null)
  assert.equal(await sessionRevert(path.join(tmp(), 'none.sqlite'), 'sess_a'), null)
})

test('instructions inlined without the provider proxy: sent once, hidden from the transcript', () => {
  assert.equal(instructionsKey(''), null)
  assert.equal(instructionsKey('  Answer in Chinese. '), instructionsKey('Answer in Chinese.'))
  assert.notEqual(instructionsKey('a'), instructionsKey('b'))
  const block = instructionsBlock('Answer in Chinese.')
  assert.match(block, /Answer in Chinese\./)
  assert.equal(instructionsBlock('  '), '')
  assert.equal(stripInstructions(`${block}fix the bug`), 'fix the bug')
  assert.equal(stripInstructions('plain'), 'plain')
  const message = { info: { role: 'user', id: 'm', semantics: { origin: 'real_user', kind: 'user_prompt' } }, parts: [{ type: 'text', text: `${block}fix the bug` }] }
  assert.deepEqual(userContent(message), [{ type: 'text', text: 'fix the bug', text_elements: [] }])
  assert.equal(previewOf([message]), 'fix the bug')
})

test('instructions ride inside the commands that hand text to the model; other commands leave them pending', () => {
  const block = instructionsBlock('Answer in Chinese.')
  assert.equal(placeInstructions('fix it', block), `${block}fix it`)
  // The command token stays first, so ZCode still parses it; the block goes where its text reaches the prompt.
  assert.equal(placeInstructions('/skill review check auth', block), `/skill review ${block}check auth`)
  assert.equal(placeInstructions('/skill review', block), `/skill review ${block}`)
  assert.equal(placeInstructions('/init Keep it short.', block), `/init ${block}Keep it short.`)
  assert.equal(placeInstructions('/init', block), `/init ${block}`)
  assert.equal(placeInstructions('/workflow migrate the tests', block), `/workflow ${block}migrate the tests`)
  assert.equal(placeInstructions('/goal migrate the tests', block), `/goal ${block}migrate the tests`)
  assert.equal(placeInstructions('/goal replace port it', block), `/goal replace ${block}port it`)
  for (const command of ['/skill', '/goal', '/goal pause', '/goal replace', '/mode auto', '/model glm', '/help', '/rewind', '/mycommand a b']) {
    assert.equal(placeInstructions(command, block), null, command)
  }
  assert.equal(placeInstructions('/init x', ''), '/init x', 'nothing pending')
  assert.equal(goalObjective('migrate', block), `${block}migrate`)
  assert.equal(goalObjective('migrate', ''), 'migrate')
  // The transcript, preview and ZCode's goal replies show what the user typed.
  assert.equal(stripInstructions(`/skill review ${block}check auth`), '/skill review check auth')
  assert.equal(stripInstructions(`/init ${block}`), '/init')
  assert.equal(stripInstructions(`Goal active: ${block}migrate`), 'Goal active: migrate')
  const message = { info: { role: 'user', id: 'm', semantics: { origin: 'real_user', kind: 'user_prompt' } }, parts: [{ type: 'text', text: `/skill review ${block}check auth` }] }
  assert.equal(previewOf([message]), '/skill review check auth')
})

// ------------------------------------------------------------------ permissions

test('permission modes map onto ZCode modes, never weaker', () => {
  assert.equal(zcodeMode('ask'), 'build')
  assert.equal(zcodeMode('acceptEdits'), 'edit')
  assert.equal(zcodeMode('auto'), 'edit')
  assert.equal(zcodeMode('plan'), 'plan')
  assert.equal(zcodeMode('chat'), 'plan')
  assert.equal(zcodeMode('review'), 'plan')
  assert.equal(zcodeMode('bypass'), 'yolo')
  assert.deepEqual(permissionOf({ codeDesktop: { permissionMode: 'bypass', afterPlan: 'ask' }, sandbox: 'danger-full-access', approvalPolicy: 'never' }), { mode: 'bypass', afterPlan: 'ask' })
  assert.equal(permissionOf({ codeDesktop: { permissionMode: 'bypass' }, sandbox: 'workspace-write', approvalPolicy: 'on-request' }).mode, 'auto', 'bypass needs the Codex bypass fields')
  assert.equal(permissionOf({ sandbox: 'read-only' }).mode, 'plan')
  assert.equal(permissionOf({ approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite' } }).mode, 'ask')
  assert.equal(permissionOf({ approvalPolicy: 'never', sandboxPolicy: { type: 'dangerFullAccess' } }).mode, 'bypass')
  assert.deepEqual(permissionOf({}, { mode: 'ask', afterPlan: 'auto' }), { mode: 'ask', afterPlan: 'auto' })
  assert.equal(codexPolicy('plan', '/w').sandbox.type, 'readOnly')
  assert.equal(codexPolicy('ask', '/w').approvalPolicy, 'untrusted')
})

const permissionRequest = {
  requestId: 'perm_1', sessionId: 'sess_1', toolCallId: 'toolu_1', toolName: 'Bash', reason: 'High risk tools require explicit approval', riskLevel: 'high', input: { command: 'rm x' },
  options: [
    { kind: 'allow_once', optionId: 'allow_once', response: { decision: 'allow', reason: 'Approved once' } },
    { kind: 'allow_always', optionId: 'allow_project', response: { decision: 'allow', permissionUpdates: [{ type: 'addRules', behavior: 'allow', rules: [{ toolName: 'Bash', ruleContent: 'rm x' }] }] } },
    { kind: 'deny', optionId: 'deny', response: { decision: 'deny', reason: 'No' } },
  ],
}

test('approvals: requests and answers', () => {
  const { method, params } = approvalRequest(permissionRequest, { threadId: 'sess_1', turnId: 'turn_1', cwd: '/w' })
  assert.equal(method, 'item/commandExecution/requestApproval')
  assert.equal(params.command, 'rm x')
  assert.equal(params.itemId, 'toolu_1')
  assert.equal(params.sessionGrantable, true)
  const edit = approvalRequest({ ...permissionRequest, toolName: 'Edit', input: { file_path: '/w/a' } }, { threadId: 't', turnId: 'u', cwd: '/w', item: { changes: [{ path: '/w/a' }] } })
  assert.equal(edit.method, 'item/fileChange/requestApproval')
  assert.deepEqual(edit.params.changes, [{ path: '/w/a' }])
  assert.deepEqual(permissionAnswer(permissionRequest, 'accept'), { response: { decision: 'allow', reason: 'Approved once' }, grant: false })
  assert.equal(permissionAnswer(permissionRequest, 'acceptForSession').grant, true, 'session grants stay in the bridge')
  assert.equal(permissionAnswer(permissionRequest, 'acceptForSession').response.permissionUpdates, undefined, 'never a project rule')
  assert.deepEqual(permissionAnswer(permissionRequest, 'decline').response, { decision: 'deny', reason: 'No' })
  assert.equal(permissionAnswer(permissionRequest, 'cancel').cancel, true)
  assert.equal(grantKey('Bash', { command: 'ls' }), 'Bash\u0000command:ls')
  assert.notEqual(grantKey('Bash', { command: 'ls' }), grantKey('Bash', { command: 'rm -rf ~' }), 'a command grant covers that command only')
})

test('approvals: "allow for this session" never reaches outside the workspace', () => {
  const dir = fs.realpathSync(tmp())
  const ws = path.join(dir, 'project')
  fs.mkdirSync(path.join(ws, 'src'), { recursive: true })
  fs.symlinkSync(path.join(dir, 'outside.txt'), path.join(ws, 'link.txt'))
  const inside = sessionGrant('Edit', { file_path: path.join(ws, 'src/app.js') }, { cwd: ws })
  assert.equal(inside.grantable, true)
  assert.equal(inside.key, sessionGrant('Edit', { file_path: path.join(ws, 'README.md') }, { cwd: ws }).key, 'one grant covers edits inside the workspace')
  assert.equal(sessionGrant('Edit', { file_path: 'src/new.js' }, { cwd: ws }).key, inside.key, 'relative paths resolve against the workspace')
  assert.notEqual(sessionGrant('Write', { file_path: path.join(ws, 'a') }, { cwd: ws }).key, inside.key, 'per tool')
  for (const file of [path.join(os.homedir(), '.zshrc'), path.join(dir, 'outside.txt'), path.join(ws, 'link.txt'), path.join(ws, '..', 'x'), `${ws}-sibling/a`]) {
    assert.deepEqual(sessionGrant('Edit', { file_path: file }, { cwd: ws }), { key: null, grantable: false }, file)
  }
  assert.deepEqual(sessionGrant('NotebookEdit', { notebook_path: '/etc/x.ipynb' }, { cwd: ws }), { key: null, grantable: false })
  assert.equal(sessionGrant('Edit', { file_path: path.join(ws, 'a') }).grantable, false, 'no workspace, no file grant')
  // The card hides "Allow for this session", and a stray acceptForSession is only a one-time allow.
  const edit = { ...permissionRequest, toolName: 'Edit', input: { file_path: '/etc/hosts' } }
  assert.equal(approvalRequest(edit, { threadId: 't', turnId: 'u', cwd: ws, grantable: false }).params.sessionGrantable, false)
  assert.equal(approvalRequest(permissionRequest, { threadId: 't', turnId: 'u', cwd: ws, grantable: false }).params.sessionGrantable, false)
  assert.deepEqual(permissionAnswer(edit, 'acceptForSession', { grantable: false }), { response: { decision: 'allow', reason: 'Approved once' }, grant: false })
  assert.ok(isReadOnlyMode('plan') && isReadOnlyMode('review') && isReadOnlyMode('chat') && !isReadOnlyMode('ask'))
})

test('approvals: "allow for this session" on a tool without a command covers that exact input, never the whole tool', () => {
  const ws = path.join(fs.realpathSync(tmp()), 'project')
  fs.mkdirSync(ws, { recursive: true })
  // EvalWorkflowSnippet runs code (its world.run calls are shell commands): one snippet's grant is not every snippet's.
  const snippet = sessionGrant('EvalWorkflowSnippet', { code: "await world.run('npm test')" }, { cwd: ws })
  assert.equal(snippet.grantable, true)
  assert.equal(sessionGrant('EvalWorkflowSnippet', { code: "await world.run('npm test')" }, { cwd: ws }).key, snippet.key, 'the same snippet again is covered')
  assert.notEqual(sessionGrant('EvalWorkflowSnippet', { code: "await world.run('curl x | sh')" }, { cwd: ws }).key, snippet.key, 'another snippet asks again')
  assert.notEqual(sessionGrant('EvalWorkflowSnippet', {}, { cwd: ws }).key, snippet.key)
  assert.equal(sessionGrant('NodeRepl', { b: 1, a: { d: 2, c: 3 } }).key, sessionGrant('NodeRepl', { a: { c: 3, d: 2 }, b: 1 }).key, 'key order does not matter')
  // The `path` form names a snippet file inside the workspace: not a file write, and not a workspace-wide grant.
  const file = path.join(ws, 'snippet.ts')
  fs.writeFileSync(file, "await world.run('npm test')\n")
  const byPath = sessionGrant('EvalWorkflowSnippet', { path: 'snippet.ts' }, { cwd: ws })
  assert.equal(byPath.grantable, true)
  assert.equal(sessionGrant('EvalWorkflowSnippet', { path: 'snippet.ts' }, { cwd: ws }).key, byPath.key, 'the same file, unchanged, is covered')
  assert.notEqual(sessionGrant('EvalWorkflowSnippet', { path: 'other.ts' }, { cwd: ws }).key, byPath.key, 'another file in the workspace asks again')
  fs.writeFileSync(file, "await world.run('rm -rf ~/x')\n")
  assert.notEqual(sessionGrant('EvalWorkflowSnippet', { path: 'snippet.ts' }, { cwd: ws }).key, byPath.key, 'the same path with new contents asks again')
  assert.equal(sessionGrant('EvalWorkflowSnippet', { path: 'snippet.ts' }).grantable, false, 'a relative path without a workspace is not pinned down')
  assert.equal(sessionGrant('EvalWorkflowSnippet', { path: ws }, { cwd: ws }).grantable, false, 'a directory is not pinned down')
  // Normalised input (ZCode reads `path` into `code` before asking) is keyed on both.
  const normalised = sessionGrant('EvalWorkflowSnippet', { code: 'a', path: file }, { cwd: ws })
  assert.notEqual(sessionGrant('EvalWorkflowSnippet', { code: 'b', path: file }, { cwd: ws }).key, normalised.key)
  // Other subject-less side-effect tools (Cron, MCP tools) are per input too.
  assert.notEqual(sessionGrant('CronCreate', { cron: '* * * * *', prompt: 'a' }).key, sessionGrant('CronCreate', { cron: '* * * * *', prompt: 'b' }).key)
  assert.notEqual(sessionGrant('mcp__srv__fetch', { url: 'https://a.test/x', method: 'GET' }).key, sessionGrant('mcp__srv__fetch', { url: 'https://a.test/x', method: 'DELETE' }).key, 'a URL subject is WebFetch only')
  assert.notEqual(sessionGrant('mcp__srv__exec', { command: 'ls', args: ['-la'] }).key, sessionGrant('mcp__srv__exec', { command: 'ls', args: ['/'] }).key, 'a command subject is Bash only')
  assert.equal(sessionGrant('WebFetch', { url: 'https://a.test/x', prompt: 'one' }).key, sessionGrant('WebFetch', { url: 'https://a.test/x', prompt: 'two' }).key, 'WebFetch is scoped by its URL')
  assert.equal(sessionGrant('Bash', { command: 'ls', description: 'one' }).key, sessionGrant('Bash', { command: 'ls', description: 'two' }).key, 'Bash is scoped by its command')
  assert.deepEqual(sessionGrant('Edit', {}, { cwd: ws }), { key: null, grantable: false }, 'a file tool naming no file has no standing grant')
})

test('approvals: approval policy "never" (no one answers) refuses an ask on the spot, except in Bypass', () => {
  assert.deepEqual(permissionOf({ approvalPolicy: 'never', sandbox: 'workspace-write' }), { mode: 'auto', afterPlan: 'auto', approvals: false }, 'the workflow runner’s Auto access')
  assert.deepEqual(permissionOf({ approvalPolicy: 'never', sandbox: 'read-only' }), { mode: 'plan', afterPlan: 'auto', approvals: false })
  assert.equal(permissionOf({ approvalPolicy: 'never', sandbox: 'danger-full-access' }).approvals, undefined, 'Bypass forwards whatever still asks')
  assert.equal(permissionOf({ approvalPolicy: 'on-request', sandbox: 'workspace-write' }).approvals, undefined)
  assert.equal(permissionOf({}, { mode: 'auto', afterPlan: 'auto', approvals: false }).approvals, false, 'kept until a request changes the policy')
  assert.equal(permissionOf({ approvalPolicy: 'on-request' }, { mode: 'auto', afterPlan: 'auto', approvals: false }).approvals, undefined)
  const refused = noApprovalAnswer(permissionRequest)
  assert.equal(refused.decision, 'deny')
  assert.match(refused.reason, /approval policy "never"/)
})

test('questions and the plan card', () => {
  const ask = { requestId: 'r', sessionId: 's', toolCallId: 'toolu_q', toolName: 'AskUserQuestion', questions: [{ question: 'Pick?', header: 'Pick', options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }] }] }
  const request = questionRequest(ask, { threadId: 's', turnId: 't' })
  assert.equal(request.questions[0].id, 'q0')
  assert.deepEqual(request.questions[0].options.map((option) => option.label), ['A', 'B'])
  assert.deepEqual(questionAnswer(ask, { answers: { q0: { answers: ['B'] } } }).response, { action: 'accept', content: { answers: { 'Pick?': 'B' } } })
  // Option previews pass through (single-select only) and the chosen one's goes back as its annotation.
  const previewed = { toolName: 'AskUserQuestion', input: { questions: [{ question: 'Which layout?', header: 'Layout', options: [{ label: 'A', description: 'left', preview: '[nav] [body]' }, { label: 'B', description: 'right', preview: '[body] [nav]' }] }] } }
  assert.deepEqual(questionRequest(previewed, { threadId: 's', turnId: 't' }).questions[0].options.map((option) => option.preview), ['[nav] [body]', '[body] [nav]'])
  assert.deepEqual(questionAnswer(previewed, { answers: { q0: { answers: ['B'] } } }).response, { action: 'accept', content: { answers: { 'Which layout?': 'B' }, annotations: { 'Which layout?': { preview: '[body] [nav]' } } } })
  const multi = { toolName: 'AskUserQuestion', input: { questions: [{ question: 'Which?', multiSelect: true, options: [{ label: 'A', preview: 'x' }] }] } }
  assert.equal(questionRequest(multi, { threadId: 's', turnId: 't' }).questions[0].options[0].preview, undefined)
  const plan = { requestId: 'r', sessionId: 's', toolCallId: 'toolu_p', toolName: 'ExitPlanMode', schema: { interaction: 'plan_approval' }, input: { plan: '1. x' } }
  const card = questionRequest(plan, { threadId: 's', turnId: 't' })
  assert.equal(card.questions[0].id, 'plan-review')
  assert.ok(card.questions[0].options.some((option) => option.label === 'Approve'))
  assert.deepEqual(questionAnswer(plan, { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'acceptEdits' } }), { response: { action: 'accept', content: { answer: 'approve' } }, approvedPlan: true, afterPlan: 'acceptEdits' })
  assert.deepEqual(questionAnswer(plan, { answers: { 'plan-review': { answers: ['Keep planning', 'add tests'] } } }).response, { action: 'accept', content: { answer: 'add tests' } })
  assert.deepEqual(questionAnswer(plan, { answers: { 'plan-review': { answers: ['Keep planning'] } } }).response, { action: 'decline' })
})

// ------------------------------------------------------------------ provider proxy

test('provider configs route through the proxy and keep provider-site rules matching', () => {
  const builtin = { revision: 3, config: { providerConfigRules: { providerRules: [{ providerId: 'p', config: { api: { baseUrl: 'https://api.z.ai/api/anthropic' } } }], templateRules: [{ templateId: 't', config: { api: { baseUrl: 'https://open.bigmodel.cn/api/anthropic' } } }] }, modelConfigRules: { providerSiteRules: [{ baseUrlMatch: 'https://api\\.z\\.ai/api/anthropic/?', modelMatch: '.*' }] } } }
  const rewritten = rewriteProviderConfig(builtin, 'http://127.0.0.1:9')
  assert.equal(rewritten.config.providerConfigRules.providerRules[0].config.api.baseUrl, 'http://127.0.0.1:9/u/https://api.z.ai/api/anthropic')
  assert.equal(rewritten.config.providerConfigRules.templateRules[0].config.api.baseUrl, 'http://127.0.0.1:9/u/https://open.bigmodel.cn/api/anthropic')
  const rule = new RegExp(`^(?:${rewritten.config.modelConfigRules.providerSiteRules[0].baseUrlMatch})$`)
  assert.ok(rule.test('http://127.0.0.1:9/u/https://api.z.ai/api/anthropic'))
  assert.equal(rewriteProviderConfig(rewritten, 'http://127.0.0.1:9').config.providerConfigRules.providerRules[0].config.api.baseUrl, rewritten.config.providerConfigRules.providerRules[0].config.api.baseUrl, 'idempotent')
  assert.equal(restoreProviderConfig(rewritten, 'http://127.0.0.1:9').config.providerConfigRules.providerRules[0].config.api.baseUrl, 'https://api.z.ai/api/anthropic')
})

test('a provider file carried back with another proxy\u2019s URL repairs itself; a runner mirror never writes the user\u2019s file', () => {
  // A runner bridge's port (65469) written into the user's file by an older build: restored and re-proxied once.
  const damaged = { config: { providerConfigRules: { providerRules: [{ providerId: 'k', config: { api: { baseUrl: 'http://127.0.0.1:65469/u/http://127.0.0.1:65454' } } }] } } }
  assert.equal(unproxiedBaseUrl('http://127.0.0.1:1/u/http://localhost:2/u/https://api.example.com/v1'), 'https://api.example.com/v1')
  assert.equal(unproxiedBaseUrl('http://127.0.0.1:65454'), 'http://127.0.0.1:65454', 'a loopback model server itself is kept')
  assert.equal(restoreProviderConfig(damaged, 'http://127.0.0.1:9').config.providerConfigRules.providerRules[0].config.api.baseUrl, 'http://127.0.0.1:65454')
  assert.equal(rewriteProviderConfig(damaged, 'http://127.0.0.1:9').config.providerConfigRules.providerRules[0].config.api.baseUrl, 'http://127.0.0.1:9/u/http://127.0.0.1:65454')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-mirror-'))
  try {
    const builtinSource = path.join(dir, 'builtin.json'); const personalSource = path.join(dir, 'user', 'provider_config.json')
    fs.writeFileSync(builtinSource, JSON.stringify({ config: {} })); fs.mkdirSync(path.dirname(personalSource))
    const original = JSON.stringify({ config: { providerConfigRules: { providerRules: [{ providerId: 'k', config: { api: { baseUrl: 'http://127.0.0.1:65454' } } }] } } }, null, 2)
    fs.writeFileSync(personalSource, original)
    const runner = new ProviderConfigMirror({ builtinSource, personalSource, dir: path.join(dir, 'runner'), origin: 'http://127.0.0.1:7', carryBack: false })
    runner.sync()
    // ZCode (in the runner) rewrites its copy: the user's file is left alone.
    const copy = JSON.parse(fs.readFileSync(runner.personalPath, 'utf8')); copy.extra = 1
    fs.writeFileSync(runner.personalPath, JSON.stringify(copy))
    runner.syncPersonal()
    assert.equal(fs.readFileSync(personalSource, 'utf8'), original)
    // The app's mirror carries such a change back with the original URL, never another bridge's port.
    const app = new ProviderConfigMirror({ builtinSource, personalSource, dir: path.join(dir, 'app'), origin: 'http://127.0.0.1:8' })
    app.sync()
    const appCopy = JSON.parse(fs.readFileSync(app.personalPath, 'utf8')); appCopy.extra = 2
    appCopy.config.providerConfigRules.providerRules[0].config.api.baseUrl = 'http://127.0.0.1:7/u/http://127.0.0.1:65454'
    fs.writeFileSync(app.personalPath, JSON.stringify(appCopy))
    app.syncPersonal()
    const carried = JSON.parse(fs.readFileSync(personalSource, 'utf8'))
    assert.equal(carried.extra, 2)
    assert.equal(carried.config.providerConfigRules.providerRules[0].config.api.baseUrl, 'http://127.0.0.1:65454')
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('official Coding Plan endpoints go through the ZCode gateway, as in ZCode', () => {
  assert.equal(upstreamUrl('https://api.z.ai/api/anthropic/v1/messages', {}), 'https://zcode.z.ai/api/v1/ultra-zai/anthropic/v1/messages')
  assert.equal(upstreamUrl('https://open.bigmodel.cn/api/anthropic/v1/messages?beta=true', {}), 'https://zcode.z.ai/api/v1/ultra/anthropic/v1/messages?beta=true')
  assert.equal(upstreamUrl('https://api.z.ai/api/anthropic/v1/messages', { ZCODE_BASE_URL: 'https://zcode.example' }), 'https://zcode.example/api/v1/ultra-zai/anthropic/v1/messages')
  assert.equal(upstreamUrl('https://api.z.ai/api/paas/v4/chat/completions', {}), 'https://api.z.ai/api/paas/v4/chat/completions')
  assert.equal(upstreamUrl('http://127.0.0.1:5/v1/messages', {}), 'http://127.0.0.1:5/v1/messages')
})

test('customization rewrites Anthropic, OpenAI chat and Responses requests', () => {
  const anthropic = applyToRequest({ system: [{ type: 'text', text: 'You are ZCode' }], max_tokens: 100, messages: [] }, { systemPrompt: 'Custom', appendSections: ['# Project instructions\n\nTabs'], maxTokens: 50, temperature: 0.2 })
  assert.equal(anthropic.system, 'Custom\n\n# Project instructions\n\nTabs')
  assert.equal(anthropic.max_tokens, 50)
  assert.equal(anthropic.temperature, 0.2)
  const appended = applyToRequest({ system: [{ type: 'text', text: 'Base' }], messages: [] }, { appendSections: ['More'] })
  assert.equal(systemPromptOf(appended), 'Base\n\nMore')
  const chat = applyToRequest({ messages: [{ role: 'system', content: 'Base' }, { role: 'user', content: 'hi' }], max_completion_tokens: 9 }, { systemPrompt: 'New', maxTokens: 7 })
  assert.deepEqual(chat.messages[0], { role: 'system', content: 'New' })
  assert.equal(chat.messages.length, 2)
  assert.equal(chat.max_completion_tokens, 7)
  const responses = applyToRequest({ instructions: 'Base', input: [], max_output_tokens: 1 }, { appendSections: ['X'], maxTokens: 3 })
  assert.equal(responses.instructions, 'Base\n\nX')
  assert.equal(responses.max_output_tokens, 3)
})

test('the proxy forwards requests, rewrites only customized main-agent ones, and records the prompt', async () => {
  const http = await import('node:http')
  const seen = []
  const upstream = http.createServer(async (req, res) => { let body = ''; for await (const chunk of req) body += chunk; seen.push({ url: req.url, body: JSON.parse(body), auth: req.headers.authorization }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}') })
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${upstream.address().port}`
  const proxy = new ProviderProxy({ customizationFor: (sessionId) => (sessionId === 'sess_custom' ? { systemPrompt: 'Replaced', appendSections: [], maxTokens: null, temperature: null } : null) })
  const origin = await proxy.start()
  const post = (session, type = 'main') => fetch(`${origin}/u/${base}/v1/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-session-id': session, 'x-zcode-session-type': type, authorization: 'Bearer k' }, body: JSON.stringify({ system: 'Original', messages: [], tools: [{ name: 'Bash', description: 'Run', input_schema: {} }] }) }).then((r) => r.json())
  assert.deepEqual(await post('custom'), { ok: true })
  await post('plain')
  await post('custom', 'other')
  assert.equal(seen[0].body.system, 'Replaced')
  assert.equal(seen[0].url, '/v1/messages')
  assert.equal(seen[0].auth, 'Bearer k')
  assert.equal(seen[1].body.system, 'Original')
  assert.equal(seen[2].body.system, 'Original', 'title and other side requests stay untouched')
  assert.equal(proxy.seen.get('sess_custom').defaultSystem, 'Original')
  assert.deepEqual(proxy.seen.get('sess_plain').tools, ['Bash'])
  await proxy.stop()
  await new Promise((resolve) => upstream.close(resolve))
})

// ------------------------------------------------------------------ accounts

test('credential store round trip and Coding Plan accounts', () => {
  const env = { ZCODE_CREDENTIAL_SECRET: 'unit' }
  const sealed = accounts.encryptCredential('sk-1', env)
  assert.match(sealed, /^enc:v1:/)
  assert.equal(accounts.decryptCredential(sealed, env), 'sk-1')
  assert.throws(() => accounts.decryptCredential(sealed, { ZCODE_CREDENTIAL_SECRET: 'other' }))
  const builtin = { revision: 30, config: { providerConfigRules: { providerRules: [{ providerId: 'account:zai-individual-coding-plan', providerName: 'Z.AI', config: { builtinModelIds: ['GLM-5.3'], access: { type: 'zhipu-account', mode: 'individual-coding-plan', accountType: 'zai' }, api: { baseUrl: 'https://api.z.ai/api/anthropic' } } }, { providerId: 'account:team', config: { builtinModelIds: ['GLM-5.3'], access: { type: 'zhipu-account', mode: 'team-coding-plan', accountType: 'zai' } } }] } } }
  const signedIn = accounts.signedInAccounts(builtin, { 'account-provider:account:zai-individual-coding-plan:identity': 'u 1', 'account-provider:coding-plan:account:zai-individual-coding-plan:account:u%201:api-key': 'sk-acc' })
  assert.equal(signedIn['account:zai-individual-coding-plan'].apiKey, 'sk-acc')
  const overlay = accounts.accountOverlay(builtin, signedIn, 'rev')
  assert.deepEqual(overlay.providers['account:zai-individual-coding-plan'], { access: { type: 'zhipu-account', entitled: true } })
  assert.equal(overlay.states['account:zai-individual-coding-plan'].availability, 'available')
  assert.equal(Object.keys(overlay.providers).length, 1, 'only individual plans are standalone accounts')
  assert.match(accounts.builtinRevision(builtin, '/x/zcode-builtin.json'), /^zcode-builtin:30:[0-9a-f]{64}$/)
  assert.deepEqual(accounts.loginUser({ 'oauth:active_provider': 'zai', 'oauth:zai:user_info': JSON.stringify({ user_id: 'u', email: 'e@x' }) }), { provider: 'zai', email: 'e@x', name: null, userId: 'u' })
})

test('API-key providers are added from ZCode templates and removed again', () => {
  const dir = tmp()
  const file = path.join(dir, 'provider_config.json')
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, config: { providerConfigRules: { providerRules: [{ providerId: 'mine', config: {} }] }, modelConfigRules: { providerModelRules: [], manualProviderModelRules: [] } } }))
  const builtin = { config: { providerConfigRules: { templateRules: [{ templateId: 'zai-api', templateNameMap: { 'en-US': 'Z.ai Coding Plan' }, config: { access: { type: 'zhipu-coding-plan-api-key' }, api: { type: 'anthropic-messages', baseUrl: 'https://api.z.ai/api/anthropic' }, builtinModelIds: ['GLM-5.3'] } }] } } }
  assert.deepEqual(accounts.saveApiKeyProvider({ personalFile: file, builtin, apiKey: 'sk' }), { providerId: 'code-desktop-zai-api' })
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
  const rule = saved.config.providerConfigRules.providerRules[1]
  assert.equal(rule.templateId, 'zai-api')
  assert.deepEqual(rule.config.access, { type: 'zhipu-coding-plan-api-key', apiKey: 'sk' })
  assert.deepEqual(saved.config.defaultModelSelection, { providerId: 'code-desktop-zai-api', modelId: 'GLM-5.3' })
  assert.equal(accounts.apiKeyProviders(saved)[1].keyed, true)
  assert.throws(() => accounts.saveApiKeyProvider({ personalFile: file, builtin, apiKey: 'sk', templateId: 'nope' }))
  assert.equal(accounts.removeApiKeyProviders(file), 1)
  const after = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.deepEqual(after.config.providerConfigRules.providerRules.map((r) => r.providerId), ['mine'])
  assert.equal(after.config.defaultModelSelection, undefined)
})

test('Coding Plan quota → rate limit windows with reset times', () => {
  assert.equal(accounts.quotaUrl('https://api.z.ai/api/anthropic'), 'https://api.z.ai/api/monitor/usage/quota/limit')
  assert.equal(accounts.quotaUrl('https://open.bigmodel.cn/api/anthropic'), 'https://open.bigmodel.cn/api/monitor/usage/quota/limit')
  assert.equal(accounts.quotaUrl('https://api.openai.com/v1'), null)
  // The official envelope keys windows by unit/number (ZCode codingPlanQuotaPresentation.ts): unit 3 number 5 is the
  // 5-hour window, unit 6 the week, TIME_LIMIT unit 5 number 1 the monthly tool quota.
  const limits = accounts.rateLimitsFromQuota({ data: { level: 'pro', limits: [{ type: 'TOKENS_LIMIT', unit: 3, number: 5, usage: 100, remaining: 60, nextResetTime: 1_800_000_000_000 }, { type: 'TOKENS_LIMIT', unit: 6, number: 1, percentage: 12, nextResetTime: 1_900_000_000_000 }, { type: 'TIME_LIMIT', unit: 5, number: 1, usage: 10, currentValue: 5, nextResetTime: 2_000_000_000_000 }] } })
  assert.deepEqual(limits.rateLimits.primary, { usedPercent: 40, windowDurationMins: 300, resetsAt: 1_800_000_000 })
  assert.deepEqual(limits.rateLimits.secondary, { usedPercent: 12, windowDurationMins: 10080, resetsAt: 1_900_000_000 })
  assert.equal(limits.rateLimits.planType, 'GLM Coding Plan Pro')
  assert.equal(limits.rateLimits.rateLimitReachedType, null)
  assert.deepEqual(limits.rateLimitsByLimitId['zcode-mcp'].primary, { usedPercent: 50, windowDurationMins: 43200, resetsAt: 2_000_000_000 })
  assert.equal(limits.rateLimitsByLimitId['zcode-mcp'].limitName, 'MCP & web tools')
  // A Z.ai Team plan reports CREDIT_LIMIT; a used-up window says the limit was reached.
  const team = accounts.rateLimitsFromQuota({ data: { limits: [{ type: 'CREDIT_LIMIT', unit: 6, number: 1, percentage: 20 }, { type: 'CREDIT_LIMIT', unit: 3, number: 5, percentage: 100 }] } })
  assert.equal(team.rateLimits.primary.windowDurationMins, 300)
  assert.equal(team.rateLimits.primary.usedPercent, 100)
  assert.equal(team.rateLimits.secondary.windowDurationMins, 10080)
  assert.equal(team.rateLimits.rateLimitReachedType, 'rate_limit_reached')
  // An older envelope without units still reads number 5 / 7.
  const legacy = accounts.rateLimitsFromQuota({ data: { limits: [{ type: 'TOKENS_LIMIT', number: 7, percentage: 1 }, { type: 'TOKENS_LIMIT', number: 5, percentage: 2 }] } })
  assert.deepEqual([legacy.rateLimits.primary.windowDurationMins, legacy.rateLimits.secondary.windowDurationMins], [300, 10080])
  assert.equal(accounts.rateLimitsFromQuota({}), null)
})

test('Coding Plan resets: headers from the browser sign-in, credits from the status, ids name the reset type', () => {
  const credentials = { 'oauth:active_provider': 'zai', zcodejwttoken: 'jwt-1', 'oauth:zai:access_token': 'maas-1', 'oauth:bigmodel:access_token': 'other' }
  const signedIn = { 'zai-coding-plan': { family: 'zai' } }
  assert.deepEqual(accounts.codingPlanResetHeaders({ credentials, signedIn }), { Authorization: 'Bearer jwt-1', 'X-Bigmodel-Authorization': 'maas-1', 'Bigmodel-Target-Type': 'PERSONAL' })
  assert.equal(accounts.codingPlanResetHeaders({ credentials: { ...credentials, zcodejwttoken: '' }, signedIn }), null)
  assert.equal(accounts.codingPlanResetHeaders({ credentials, signedIn: { x: { family: 'bigmodel' } } }), null, 'never the other family')
  assert.equal(accounts.zcodeApiOrigin({}), 'https://zcode.z.ai')
  assert.equal(accounts.zcodeApiOrigin({ ZCODE_BASE_URL: 'http://127.0.0.1:9/x' }), 'http://127.0.0.1:9')
  assert.equal(accounts.zcodeApiOrigin({ ZCODE_BASE_URL: 'http://evil.example' }), null)
  const now = 1_800_000_000_000
  const status = { available_five_hour_resets: [{ expire_at: now + 3600e3 }, { expire_at: now - 1 }], available_week_resets: [{ expire_at: now + 86400e3 }] }
  const summary = accounts.resetCreditsFromStatus(status, { fiveHour: { usedPercent: 100 }, week: { usedPercent: 40 } }, now)
  assert.equal(summary.availableCount, 2, 'the expired one is dropped')
  assert.deepEqual(summary.credits.map((credit) => [credit.id, credit.title, credit.expiresAt]), [[`FIVE_HOUR:${now + 3600e3}`, '5-hour reset', (now + 3600e3) / 1000], [`WEEK:${now + 86400e3}`, 'Weekly reset', (now + 86400e3) / 1000]])
  // A window nothing has been used in: its reset would change nothing (ZCode isCodingPlanQuotaLimitFull).
  assert.equal(accounts.resetCreditsFromStatus(status, { fiveHour: { usedPercent: 0 }, week: { usedPercent: 40 } }, now).availableCount, 1)
  assert.equal(accounts.resetTypeOf('WEEK:1'), 'WEEK')
  assert.equal(accounts.resetTypeOf('codex-1'), null)
  assert.equal(accounts.resetIdempotencyKey('k'.repeat(64)), 'k'.repeat(64))
  assert.equal(accounts.resetIdempotencyKey('k'.repeat(65)).length, 64)
})

// ------------------------------------------------------------------ catalog

test('MCP servers: Codex edits ↔ ZCode mcp.servers', () => {
  const dir = tmp()
  const file = path.join(dir, 'config.json')
  catalog.applyConfigEdits(file, [{ keyPath: 'mcp_servers.files', value: { command: 'node', args: ['s.js'], env: { TOKEN: 'x' } }, mergeStrategy: 'upsert' }, { keyPath: 'mcp_servers.docs', value: { url: 'https://mcp.example/mcp', bearer_token: 't' }, mergeStrategy: 'upsert' }])
  const config = catalog.readConfig(file)
  assert.deepEqual(config.mcp.servers.files, { type: 'stdio', command: 'node', args: ['s.js'], env: { TOKEN: 'x' } })
  assert.deepEqual(config.mcp.servers.docs, { type: 'http', url: 'https://mcp.example/mcp', headers: { Authorization: 'Bearer t' } })
  const codex = catalog.codexMcpServers(config)
  assert.deepEqual(codex.files.env, { TOKEN: '' }, 'secret values never leave')
  assert.equal(codex.docs.url, 'https://mcp.example/mcp')
  assert.deepEqual(catalog.protocolMcpServers(config)[0], { name: 'files', command: 'node', args: ['s.js'], env: [{ name: 'TOKEN', value: 'x' }] })
  catalog.applyConfigEdits(file, [{ keyPath: 'mcp_servers.files', value: null, mergeStrategy: 'replace' }])
  assert.deepEqual(Object.keys(catalog.readConfig(file).mcp.servers), ['docs'])
  assert.throws(() => catalog.applyConfigEdits(file, [{ keyPath: 'model', value: 'x' }]))
  const rows = catalog.mcpStatusRows(catalog.readConfig(file), { docs: { status: 'connected', transport: 'http', toolCount: 1, updatedAt: 'x' } }, { docs: [{ name: 'search', description: 'Search' }] })
  assert.equal(rows[0].runtimeStatus, 'connected')
  assert.deepEqual(Object.keys(rows[0].tools), ['search'])
  const pending = catalog.mcpStatusRows({}, { auth: { status: 'failed', transport: 'http', toolCount: 0, updatedAt: 'x', authorization: { type: 'oauth_authorization_code', authorizationUrl: 'https://a', startedAt: 'x' } } })
  assert.equal(pending[0].runtimeStatus, 'authenticationRequired')
  assert.equal(pending[0].authStatus, 'notLoggedIn')
})

test('skills: catalog rows, switched-off skills stay listed', () => {
  const dir = tmp()
  const skill = path.join(dir, 'off', 'SKILL.md')
  fs.mkdirSync(path.dirname(skill), { recursive: true })
  fs.writeFileSync(skill, '---\nname: off-skill\ndescription: Off.\n---\n')
  const file = path.join(dir, 'config.json')
  catalog.setSkillEnabled(file, skill, false)
  const entry = catalog.skillsListEntry('/w', { skills: [{ name: 'on', path: '/x/SKILL.md', scope: 'user', enabled: true }, { name: 'p', pluginName: 'plug', path: '/y/SKILL.md', scope: 'plugin' }] }, catalog.readConfig(file))
  assert.deepEqual(entry.skills.map((s) => [s.name, s.enabled, s.scope]), [['on', true, 'user'], ['plug:p', true, 'system'], ['off-skill', false, 'user']])
})

test('skills: ZCode’s slash commands are listed as commands the slash menu can send', () => {
  const commands = [
    { name: 'goal', description: 'Show or set the current session goal.', inputHint: '/goal [pause|resume|clear|replace <objective>|<objective>]', source: 'builtin' },
    { name: 'compact', description: 'Compact.', inputHint: '/compact', source: 'builtin' },
    { name: 'init', description: 'Create AGENTS.md.', inputHint: '/init [instructions]', source: 'builtin' },
    { name: 'plan', description: 'Plan mode.', inputHint: '/plan [task]', source: 'builtin' },
    { name: 'on', description: 'Same name as a skill.', source: 'custom' },
    { name: 'deploy', description: 'Ship it.', inputHint: '/deploy <env>', source: 'custom' },
    { name: 'two words' }, {},
  ]
  const rows = catalog.commandRows(commands, { known: new Set(['on']), served: new Set(['compact', 'plan']) })
  assert.deepEqual(rows.map((row) => [row.name, row.path, row.scope, row.argumentHint]), [
    ['goal', 'command:goal', 'system', '[pause|resume|clear|replace <objective>|<objective>]'],
    ['init', 'command:init', 'system', '[instructions]'],
    ['deploy', 'command:deploy', 'user', '<env>'],
  ])
  assert.ok(rows.every((row) => row.enabled && row.toggleable === false && row.userInvocable && row.modelInvocable === false))
})

test('plugins and hooks', () => {
  const response = catalog.pluginsInstalledResponse({ plugins: [{ id: 'browser-use@zcode-plugins-official', name: 'browser-use', version: '0.5.1', enabled: true, source: 'official', marketplace: 'zcode-plugins-official', components: [{ kind: 'skill', items: [{ name: 'control-browser' }] }] }] })
  const plugin = response.marketplaces[0].plugins[0]
  assert.equal(plugin.installed, true)
  assert.equal(plugin.codeDesktop.removable, false)
  assert.equal(catalog.pluginReadResponse({ name: 'x', components: [{ kind: 'skill', items: [{ name: 's' }] }], mcpServerNames: ['m'] }).plugin.skills[0].name, 's')
  const listed = catalog.hooksList({ hooks: { enabled: true, events: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'process', command: 'node', args: ['h.js'] }] }], Stop: [{ hooks: [{ type: 'command', command: 'echo stop', enabled: false }] }] } } },
    { cwds: ['/private/tmp'], sourcePath: '/h/.zcode/cli/config.json' })
  assert.equal(listed.data.length, 1)
  assert.equal(listed.data[0].cwd, '/private/tmp')
  assert.deepEqual(listed.data[0].hooks.map((hook) => [hook.key, hook.eventName, hook.matcher, hook.command, hook.enabled, hook.handlerType, hook.source, hook.sourcePath]), [
    ['PreToolUse:0:0', 'preToolUse', 'Bash', 'node h.js', true, 'command', 'user', '/h/.zcode/cli/config.json'],
    ['Stop:0:0', 'stop', null, 'echo stop', false, 'command', 'user', '/h/.zcode/cli/config.json'],
  ])
  // The root switch off turns every hook off.
  assert.equal(catalog.hooksList({ hooks: { events: { PreToolUse: [{ hooks: [{ command: 'x' }] }] } } }, { cwds: ['/a'] }).data[0].hooks[0].enabled, false)
})

test('ZCode hooks/list reads as the app\'s Customize › Hooks groups', async () => {
  const { hooksView } = await import('../../app/src/hooks-model.mjs')
  const listed = catalog.hooksList({ hooks: { enabled: true, events: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'echo pre' }] }], Stop: [{ hooks: [{ command: 'echo stop', enabled: false }] }], PostToolUseFailure: [{ hooks: [{ command: 'echo f' }] }] } } }, { cwds: ['/private/tmp'] })
  const view = hooksView(listed, '/private/tmp')
  assert.equal(view.total, 3)
  assert.deepEqual(view.groups.map((group) => group.event), ['preToolUse', 'stop', 'other'])
  assert.equal(view.groups[1].hooks[0].enabled, false)
})

test('listMcpTools lists a stdio server’s tools', async () => {
  const tools = await catalog.listMcpTools({ command: process.execPath, args: [path.resolve(import.meta.dirname, '../packages/zcode-bridge/test-support/fake-mcp.mjs')] })
  assert.deepEqual(tools.map((tool) => tool.name), ['echo'])
})

// ------------------------------------------------------------------ live stream

function projector() {
  const out = []
  const children = []
  const p = new LiveProjector({ threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: (child) => children.push(child), takeInput: () => null })
  return { p, out, children, methods: () => out.map((entry) => entry.method) }
}

test('live: a turn with reasoning, text segments, a tool, usage and completion', () => {
  const { p, out, methods } = projector()
  const env = { turnId: 'turn_1', timestamp: 1000 }
  p.event('turn.started', { messageId: 'msg_u', input: 'hi' }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'reasoning_delta', delta: 'hm' }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'text_delta', delta: 'Run' }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'tool_input_start', toolCallId: 'toolu_1', toolName: 'Bash' }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'tool_call', toolCallId: 'toolu_1', toolName: 'Bash', input: { command: 'ls' } }, env)
  p.event('tool.updated', { toolCallId: 'toolu_1', kind: 'progress', stdoutTail: 'a\n' }, env)
  p.event('tool.updated', { toolCallId: 'toolu_1', kind: 'progress', stdoutTail: 'a\nb\n' }, env)
  p.event('tool.updated', { toolCallId: 'toolu_1', kind: 'result', result: { success: true, content: 'a\nb' }, duration: 5 }, env)
  p.event('session.updated', { querySource: 'main_turn', contextWindow: 1000, usage: { inputTokens: 100, outputTokens: 10, cacheReadTokens: 40 } }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_b', kind: 'text_delta', delta: 'Done' }, env)
  p.event('session.titleUpdated', { title: 'A title', source: 'generated' }, env)
  p.event('turn.completed', { resultType: 'success' }, { ...env, timestamp: 2000 })
  assert.deepEqual(methods().filter((m) => m !== 'item/started' && m !== 'item/completed'), ['turn/started', 'item/reasoning/summaryTextDelta', 'item/agentMessage/delta', 'item/commandExecution/outputDelta', 'item/commandExecution/outputDelta', 'thread/tokenUsage/updated', 'item/agentMessage/delta', 'thread/name/updated', 'turn/completed'])
  const completed = out.filter((e) => e.method === 'item/completed').map((e) => e.params.item)
  assert.deepEqual(completed.map((item) => item.id), ['msg_u', 'msg_a#r0', 'msg_a#t0', 'toolu_1', 'msg_b#t0'])
  assert.deepEqual(out.filter((e) => e.method === 'item/commandExecution/outputDelta').map((e) => e.params.delta), ['a\n', 'b\n'])
  const usage = out.find((e) => e.method === 'thread/tokenUsage/updated').params.tokenUsage
  assert.equal(usage.modelContextWindow, 1000)
  assert.equal(usage.last.totalTokens, 110)
  assert.equal(usage.last.cachedInputTokens, 40)
  const done = out.at(-1).params.turn
  assert.equal(done.status, 'completed')
  assert.equal(done.durationMs, 1000)
})

test('live: denied tools, failures, interrupts, compaction, todo and diff', () => {
  const { p, out } = projector()
  const env = { turnId: 'turn_1', timestamp: 1 }
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'e1', toolName: 'Edit', input: { file_path: '/w/a.txt', old_string: 'x', new_string: 'y' } }, env)
  p.event('permission.resolved', { toolCallId: 'e1', decision: 'deny', reason: "The user doesn't want to proceed" }, env)
  assert.equal(out.filter((e) => e.method === 'item/completed').at(-1).params.item.status, 'declined')
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'e2', toolName: 'Edit', input: { file_path: '/w/a.txt', old_string: 'x', new_string: 'y' } }, env)
  p.event('tool.updated', { toolCallId: 'e2', kind: 'result', result: { success: true, display: { kind: 'file_diff', filePath: '/w/a.txt', structuredPatch: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-x', '+y'] }] } } }, env)
  assert.match(out.find((e) => e.method === 'turn/diff/updated').params.diff, /^diff --git a\/a.txt b\/a.txt\n--- a\/a.txt\n\+\+\+ b\/a.txt\n@@ -1,1 \+1,1 @@\n-x\n\+y\n/)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 't1', toolName: 'TodoWrite', input: { todos: [{ content: 'a', status: 'pending' }] } }, env)
  assert.deepEqual(out.find((e) => e.method === 'turn/plan/updated').params.plan, [{ step: 'a', status: 'pending' }])
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'b1', toolName: 'Bash', input: { command: 'x' } }, env)
  p.event('tool.updated', { toolCallIds: ['b1'], kind: 'batch', errorCount: 1 }, env)
  assert.equal(out.filter((e) => e.method === 'item/completed').at(-1).params.item.status, 'failed')
  p.event('turn.completed', { resultType: 'cancelled' }, env)
  assert.equal(out.at(-1).params.turn.status, 'interrupted')
  p.event('turn.started', { input: '/compact', inputVisibility: 'model-only' }, { turnId: 'turn_2' })
  assert.ok(!out.slice(-1).some((e) => e.method === 'item/started'), 'no user message for a model-only turn')
  p.event('session.updated', { operationId: 'cmp', partId: 'part_c', status: 'started' }, { turnId: 'turn_2' })
  p.event('session.updated', { operationId: 'cmp', partId: 'part_c', status: 'completed' }, { turnId: 'turn_2' })
  p.event('session.updated', { boundaryId: 'b', postCompactTokenCount: 150 }, { turnId: 'turn_2' })
  assert.equal(out.filter((e) => e.method === 'item/completed').at(-1).params.item.id, 'compaction-part_c')
  assert.equal(out.filter((e) => e.method === 'thread/tokenUsage/updated').at(-1).params.tokenUsage.last.totalTokens, 150)
  p.event('turn.failed', { error: { code: 401, message: 'invalid api key' } }, { turnId: 'turn_3' })
  const failed = out.at(-1).params.turn
  assert.equal(failed.status, 'failed')
  assert.equal(failed.error.codexErrorInfo, 'unauthorized')
})

test('live: sub-agents become spawned threads; background tasks complete their launch item', () => {
  const { p, out, children } = projector()
  const env = { turnId: 'turn_1' }
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_a', toolName: 'Agent', input: { prompt: 'go', description: 'Child' } }, env)
  p.event('session.updated', { agentId: 'agent_1', childSessionId: 'sess_subagent_agent_1', description: 'Child', prompt: 'go', parentToolCallId: 'toolu_a', status: 'running', agentType: 'general-purpose' }, env)
  p.event('tool.updated', { toolCallId: 'tool_subagent_agent_1_toolu_2', toolName: 'Bash', input: { command: 'echo c' }, kind: 'scheduled', agentId: 'agent_1', childSessionId: 'sess_subagent_agent_1' }, env)
  p.event('tool.updated', { toolCallId: 'tool_subagent_agent_1_toolu_2', kind: 'result', result: { success: true, content: 'c' } }, env)
  p.event('session.updated', { agentId: 'agent_1', childSessionId: 'sess_subagent_agent_1', parentToolCallId: 'toolu_a', status: 'completed', totalDurationMs: 9 }, env)
  p.event('tool.updated', { toolCallId: 'toolu_a', kind: 'result', result: { success: true, content: 'child done\nagentId: agent_1' } }, env)
  assert.equal(children[0].id, 'sess_subagent_agent_1')
  const childItem = out.find((e) => e.method === 'item/completed' && e.params.threadId === 'sess_subagent_agent_1' && e.params.item.type === 'commandExecution')
  assert.equal(childItem.params.item.aggregatedOutput, 'c')
  assert.ok(out.some((e) => e.method === 'turn/completed' && e.params.threadId === 'sess_subagent_agent_1'))
  const collab = out.filter((e) => e.method === 'item/completed' && e.params.item.type === 'collabAgentToolCall').at(-1).params.item
  assert.deepEqual(collab.agentsStates, { sess_subagent_agent_1: { status: 'completed', message: 'child done' } })
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'bg', toolName: 'Bash', input: { command: 'sleep 1', run_in_background: true } }, env)
  p.event('tool.updated', { toolCallId: 'bg', kind: 'result', result: { success: true, content: 'Command running in background with ID: exec_9. Output is being written to: /x.' } }, env)
  assert.deepEqual(p.backgroundTerminals(), [{ itemId: 'bg', processId: 'exec_9', command: 'sleep 1' }])
  p.event('turn.completed', { resultType: 'success' }, env)
  assert.ok(!out.some((e) => e.method === 'item/completed' && e.params.item.id === 'bg'), 'the background launch stays open past the turn')
  p.event('session.updated', { taskId: 'exec_9', toolCallId: 'bg', taskKind: 'bash', status: 'completed', outputTail: 'done\n' }, {})
  const finished = out.filter((e) => e.method === 'item/completed' && e.params.item.id === 'bg').at(-1).params.item
  assert.equal(finished.status, 'completed')
  assert.equal(finished.aggregatedOutput, 'done\n')
  assert.deepEqual(p.backgroundTerminals(), [])
})

test('live: a background sub-agent is known by its task (Stop cancels only it); a foreground one has none', () => {
  const { p, out } = projector()
  const env = { turnId: 'turn_1' }
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_fg', toolName: 'Agent', input: { prompt: 'fg', description: 'Fore' } }, env)
  p.event('session.updated', { agentId: 'agent_fg', childSessionId: 'sess_subagent_agent_fg', description: 'Fore', prompt: 'fg', parentToolCallId: 'toolu_fg', status: 'running' }, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_bg', toolName: 'Agent', input: { prompt: 'bg', description: 'Back', run_in_background: true } }, env)
  // The background task's start (executor BackgroundTaskStarted): kept, not dropped like a non-bash task.
  p.event('session.updated', { taskId: 'agent_bg', toolCallId: 'toolu_bg', toolName: 'Agent', taskKind: 'subagent', childSessionId: 'sess_subagent_agent_bg', status: 'running', cancellable: false }, env)
  p.event('session.updated', { agentId: 'agent_bg', background: true, childSessionId: 'sess_subagent_agent_bg', description: 'Back', prompt: 'bg', parentToolCallId: 'toolu_bg', status: 'running' }, env)
  assert.deepEqual(p.subagentTaskFor('sess_subagent_agent_bg'), { taskId: 'agent_bg', childId: 'sess_subagent_agent_bg', status: 'running' })
  assert.equal(p.subagentTaskFor('sess_subagent_agent_fg'), null, 'a foreground sub-agent is part of the parent turn')
  assert.deepEqual(p.backgroundTerminals(), [], 'a sub-agent task is not a background terminal')
  // Without the task event, SubagentSpawned's background flag is enough (task id = agentId).
  p.event('session.updated', { agentId: 'agent_b2', background: true, childSessionId: 'sess_subagent_agent_b2', description: 'B2', prompt: 'b2', status: 'running' }, env)
  assert.deepEqual(p.subagentTaskFor('sess_subagent_agent_b2'), { taskId: 'agent_b2', childId: 'sess_subagent_agent_b2', status: 'running' })
  // The task before the child is known: matched by the agent id later.
  p.event('session.updated', { taskId: 'agent_b3', toolCallId: 'toolu_b3', taskKind: 'subagent', status: 'running' }, env)
  p.event('session.updated', { agentId: 'agent_b3', childSessionId: 'sess_subagent_agent_b3', description: 'B3', prompt: 'b3', status: 'running' }, env)
  assert.equal(p.subagentTaskFor('sess_subagent_agent_b3')?.taskId, 'agent_b3')
  // Stopped (session/cancelBackgroundTask → SubagentStopped status 'stopped'): interrupted, not failed.
  p.event('session.updated', { taskId: 'agent_bg', toolCallId: 'toolu_bg', taskKind: 'subagent', childSessionId: 'sess_subagent_agent_bg', status: 'cancelled' }, env)
  p.event('session.updated', { agentId: 'agent_bg', background: true, childSessionId: 'sess_subagent_agent_bg', parentToolCallId: 'toolu_bg', status: 'stopped', error: 'Background agent task stopped.', totalDurationMs: 5 }, env)
  const done = out.filter((e) => e.method === 'turn/completed' && e.params.threadId === 'sess_subagent_agent_bg').at(-1)
  assert.equal(done.params.turn.status, 'interrupted')
  assert.equal(done.params.turn.error, null)
  assert.equal(p.subagentTaskFor('sess_subagent_agent_bg').status, 'cancelled')
  // A workflow task is still left to the workflow projection.
  p.event('session.updated', { taskId: 'wf_1', toolCallId: 'toolu_wf', taskKind: 'workflow', status: 'running' }, env)
  assert.ok(!p.subagentTasks.has('wf_1'))
})

test('turn errors and unified diffs', () => {
  assert.equal(turnError('429 Too Many Requests').codexErrorInfo, 'rateLimitExceeded')
  assert.equal(turnError({ code: 'X', message: 'context length exceeded' }).codexErrorInfo, 'contextWindowExceeded')
  assert.deepEqual(turnError('fetch failed').codexErrorInfo, { responseStreamConnectionFailed: { httpStatusCode: null } })
  assert.equal(unifiedDiff([{ path: '/private/w/n.txt', kind: { type: 'add' }, diff: 'a\nb\n' }], '/private/w'), 'diff --git a/n.txt b/n.txt\nnew file mode 100644\n--- /dev/null\n+++ b/n.txt\n@@ -0,0 +1,2 @@\n+a\n+b\n')
  assert.match(unifiedDiff([{ path: '/w/x.txt', kind: { type: 'update' }, diff: '@@ -1 +1 @@\n-a\n+b\n' }], '/private/w'), /^diff --git a\/x.txt/)
})

// ------------------------------------------------------------------ usage & locate

const snapshot = {
  summary: { totalTokens: 300, inputTokens: 200, outputTokens: 100, peakDayTokens: 300, longestSessionMs: 4000, currentStreakDays: 1, longestStreakDays: 2, totalSessions: 1, totalTurns: 2, toolCallCount: 3 },
  heatmap: { weeks: [{ days: [{ date: '2026-10-03', totalTokens: 0, turnCount: 0, toolCallCount: 0 }, { date: '2026-10-04', totalTokens: 300, turnCount: 2, toolCallCount: 3 }, null] }] },
  dailyModelUsage: [{ date: '2026-10-04', models: [{ modelId: 'GLM-5.3', totalTokens: 300 }] }],
  models: [{ modelId: 'GLM-5.3', totalTokens: 300, inputTokens: 200, outputTokens: 100, requestCount: 2 }],
}

test('usage: account/usage/read and the home stats card from usage/stats', () => {
  const usage = accountUsage(snapshot)
  assert.deepEqual(usage.dailyUsageBuckets, [{ startDate: '2026-10-04', tokens: 300 }])
  assert.equal(usage.summary.lifetimeTokens, 300)
  assert.equal(usage.summary.longestRunningTurnSec, 4)
  // The core-neutral breakdown the Usage page reads (tiles, the input/cached/output split, the model list).
  const withCache = accountUsage({ ...snapshot, summary: { ...snapshot.summary, cacheReadTokens: 120, cacheCreationTokens: 30 } }, '2026-10-04')
  assert.deepEqual(withCache.breakdown.allTime, { tokens: 300, inputTokens: 50, cacheReadTokens: 120, cacheWriteTokens: 30, outputTokens: 100, unpricedTokens: 0, costCny: null })
  assert.equal(withCache.breakdown.today.tokens, 300)
  assert.equal(withCache.breakdown.last30Days.tokens, 300)
  assert.equal(accountUsage(snapshot, '2026-12-31').breakdown.last30Days.tokens, 0, 'outside the 30 days')
  assert.deepEqual(withCache.breakdown.models, [{ model: 'GLM-5.3', displayName: 'GLM-5.3', tokens: 300, inputTokens: 200, outputTokens: 100, costCny: null }])
  assert.deepEqual(withCache.breakdown.daily, [{ date: '2026-10-04', tokens: 300, costCny: null }])
  assert.equal(withCache.breakdown.priced, false)
  const stats = codeStats(snapshot, { sessionsByDay: { '2026-10-04': 1 }, peakHour: 14 })
  assert.deepEqual(stats.dailyActivity, [{ date: '2026-10-04', messageCount: 2, sessionCount: 1, toolCallCount: 3 }])
  assert.deepEqual(stats.dailyModelTokens, [{ date: '2026-10-04', tokensByModel: { 'GLM-5.3': 300 } }])
  assert.equal(stats.peakActivityHour, 14)
})

test('locate: the app layout and OpenClaude Desktop’s agent env', () => {
  const dir = tmp()
  const glm = path.join(dir, 'Resources', 'glm')
  fs.mkdirSync(glm, { recursive: true })
  fs.mkdirSync(path.join(dir, 'Resources', 'config', 'provider'), { recursive: true })
  fs.writeFileSync(path.join(glm, 'zcode.cjs'), '#!/usr/bin/env node\n')
  fs.writeFileSync(path.join(dir, 'Resources', 'config', 'provider', 'zcode-builtin.json'), '{}')
  assert.equal(builtinConfigNear(path.join(glm, 'zcode.cjs')), path.join(fs.realpathSync(dir), 'Resources', 'config', 'provider', 'zcode-builtin.json').replace(fs.realpathSync(dir), dir))
  const found = locateAgent({ CODE_DESKTOP_AGENT_BINARY: path.join(glm, 'zcode.cjs'), CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: '/usr/bin/node-x', PATH: '' }, dir)
  assert.equal(found.command, '/usr/bin/node-x')
  assert.deepEqual(found.prefix, [fs.realpathSync(path.join(glm, 'zcode.cjs'))])
  assert.ok(found.builtinConfig.endsWith('zcode-builtin.json'))
  assert.equal(locateAgent({ PATH: '' }, dir).source, 'missing')
})

// ------------------------------------------------------------------ scheduled tasks (not served)

test('scheduled and off-peak tools are unavailable: the host answers ZCode truthfully instead of "Try again later"', async () => {
  const { UNAVAILABLE_TOOLS, SCHEDULING_UNAVAILABLE, schedulingHandlers } = await import('../packages/zcode-bridge/src/server.js')
  const { ZCodeConnection } = await import('../packages/zcode-bridge/src/zcode.js')
  for (const name of ['CronCreate', 'CronUpdate', 'CronDelete', 'CronList', 'OffPeakCreate', 'OffPeakList']) assert.ok(UNAVAILABLE_TOOLS.includes(name), name)
  const connection = new ZCodeConnection({ command: 'node', args: [], env: {}, cwd: os.tmpdir() })
  for (const [method, handler] of Object.entries(schedulingHandlers())) connection.handle(method, handler)
  const written = []
  connection.write = (message) => written.push(message)
  await connection.answer({ id: 1, method: 'automation/checkTaskBinding', params: { targetTaskId: 'sess_1' } })
  await connection.answer({ id: 2, method: 'automation/list', params: {} })
  await connection.answer({ id: 3, method: 'automation/create', params: { cronExpr: '0 9 * * *', prompt: 'run the tests', title: 'Tests' } })
  await connection.answer({ id: 4, method: 'automation/delete', params: { automationId: 'a1' } })
  await connection.answer({ id: 5, method: 'offPeak/list', params: {} })
  assert.deepEqual(written[0], { id: 1, result: { bound: false } })
  assert.deepEqual(written[1], { id: 2, result: { automations: [] } })
  assert.equal(written[2].error.code, -32000)
  assert.equal(written[2].error.message, SCHEDULING_UNAVAILABLE)
  assert.doesNotMatch(written[2].error.message, /try again/i)
  assert.equal(written[3].error.message, SCHEDULING_UNAVAILABLE)
  assert.deepEqual(written[4], { id: 5, result: { tasks: [] } })
})

// ------------------------------------------------------------------ round 2: re-sent requests, steer, retries, official MCP

test('interactions: a request ZCode re-sends under a new wire id joins the open card; one answer for every id', async () => {
  const registry = new InteractionRegistry({ graceMs: 20 })
  let opened = 0
  let answer
  const open = (entry) => { opened++; entry.clientId = 'cd-1'; return new Promise((resolve) => { answer = resolve }) }
  const first = registry.run({ requestId: 'perm_1' }, open)
  const second = registry.run({ requestId: 'perm_1' }, open)
  const third = registry.run({ requestId: 'perm_1' }, open)
  await Promise.resolve()
  assert.equal(opened, 1, 'one card')
  assert.equal(registry.open('perm_1').clientId, 'cd-1')
  answer({ optionId: 'allow' })
  assert.deepEqual(await Promise.all([first, second, third]), [{ optionId: 'allow' }, { optionId: 'allow' }, { optionId: 'allow' }])
  assert.equal(registry.open('perm_1'), null, 'answered: nothing open')
  // A re-send already on its way when the answer went out gets the same answer, no new card.
  assert.deepEqual(await registry.run({ requestId: 'perm_1' }, open), { optionId: 'allow' })
  assert.equal(opened, 1)
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(registry.size, 0, 'forgotten after the grace period')
  // No requestId: every request is its own card.
  await Promise.all([registry.run({}, async () => { opened++ }), registry.run({}, async () => { opened++ })])
  assert.equal(opened, 3)
  registry.clear()
})

test('live: guidance steered into a running turn appears as a user message in that turn', () => {
  const out = []
  const steers = [{ pendingInputId: 'queue_c1', input: [{ type: 'text', text: 'also update the README', text_elements: [] }, { type: 'skill', name: 'docs', path: '/s/docs' }] }]
  const p = new LiveProjector({
    threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: () => {}, takeInput: () => null,
    takeSteer: (drained) => { const index = steers.findIndex((s) => s.pendingInputId === drained.pendingInputId); return index >= 0 ? steers.splice(index, 1)[0].input : null },
  })
  const env = { turnId: 'turn_1', timestamp: 1 }
  p.event('turn.started', { messageId: 'msg_u', input: 'work' }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'text_delta', delta: 'Working' }, env)
  p.event('turn.steerDrained', { pendingInputIds: ['queue_c1', 'queue_c2'], targetTurnId: 'turn_1', injectedMessageIds: ['msg_g1', 'msg_g2'], drainedInputs: [
    { pendingInputId: 'queue_c1', messageId: 'msg_g1', text: 'also update the README', delivery: 'guide' },
    { pendingInputId: 'queue_c2', messageId: 'msg_g2', text: 'and the changelog', delivery: 'guide' },
  ] }, env)
  p.event('turn.steerDrained', { pendingInputIds: ['queue_c1'], targetTurnId: 'turn_1', injectedMessageIds: ['msg_g1'], drainedInputs: [{ pendingInputId: 'queue_c1', messageId: 'msg_g1', text: 'also update the README' }] }, env)
  p.event('model.streaming', { assistantMessageId: 'msg_a', kind: 'text_delta', delta: 'Done' }, env)
  p.event('turn.completed', { resultType: 'success' }, env)
  const users = out.filter((e) => e.method === 'item/completed' && e.params.item.type === 'userMessage').map((e) => e.params)
  assert.deepEqual(users.map((u) => u.item.id), ['msg_u', 'msg_g1', 'msg_g2'], 'once each, in the turn')
  assert.ok(users.every((u) => u.turnId === 'turn_1'))
  assert.deepEqual(users[1].item.content.map((part) => part.type), ['text', 'skill'], 'the input as typed')
  assert.equal(users[2].item.content[0].text, 'and the changelog', 'falls back to ZCode’s text')
  const order = out.filter((e) => e.method === 'item/completed').map((e) => e.params.item.id)
  assert.deepEqual(order, ['msg_u', 'msg_a#t0', 'msg_g1', 'msg_g2', 'msg_a#t1'], 'the reply continues below the guidance')
})

test('live: ZCode’s automatic retries show as "Retrying (n/max)" (error willRetry:true), once per attempt, only in a turn', () => {
  const { p, out } = projector()
  const env = { turnId: 'turn_1', timestamp: 1 }
  p.event('session.updated', { type: 'model_retry_scheduled', _meta: { zcode: { apiRetry: { kind: 'api_retry', attempt: 1, maxRetries: 10, retryDelayMs: 2000, errorStatus: 429, error: 'rate limit: too many requests' } } } }, env)
  assert.equal(out.length, 0, 'no turn yet: nothing to show')
  p.event('turn.started', { messageId: 'msg_u', input: 'hi' }, env)
  const retry = { kind: 'api_retry', attempt: 1, maxRetries: 10, retryDelayMs: 2000, errorStatus: 429, error: 'rate limit: too many requests' }
  p.event('session.updated', { type: 'model_retry_scheduled', _meta: { zcode: { apiRetry: retry } } }, env)
  p.event('session.updated', { type: 'model_retry_scheduled', _meta: { zcode: { apiRetry: retry } } }, env)
  p.event('session.updated', { type: 'model_retry_scheduled', _meta: { zcode: { apiRetry: { ...retry, attempt: 2 } } } }, env)
  p.event('streamRecovery.updated', { retryNumber: 3, _meta: { zcode: { apiRetry: { kind: 'api_retry', attempt: 3, maxRetries: 10, retryDelayMs: 0, errorStatus: null, error: 'Model stream recovery retry started' } } } }, env)
  p.event('session.updated', { type: 'model_request_completed', _meta: { zcode: { apiRetry: null } } }, env)
  const errors = out.filter((e) => e.method === 'error').map((e) => e.params)
  assert.deepEqual(errors.map((e) => e.retry.attempt), [1, 2, 3])
  assert.ok(errors.every((e) => e.willRetry === true && e.turnId === 'turn_1' && e.threadId === 'sess_1'))
  assert.equal(errors[0].retry.maxRetries, 10)
  assert.equal(errors[0].error.codexErrorInfo, 'rateLimitExceeded')
  assert.equal(errors[0].error.additionalDetails, '429')
  p.event('turn.completed', { resultType: 'success' }, env)
  p.event('session.updated', { type: 'model_retry_scheduled', _meta: { zcode: { apiRetry: retry } } }, env)
  assert.equal(out.filter((e) => e.method === 'error').length, 3, 'after the turn: nothing')
})

test('official MCP services: identity headers from the browser sign-in, only for the ZCode API origin', () => {
  const env = {}
  const credentials = { 'oauth:active_provider': 'zai', zcodejwttoken: 'jwt-1', 'oauth:zai:access_token': 'maas-zai', 'oauth:bigmodel:access_token': 'maas-cn' }
  const zaiPlan = { 'account:zai-individual-coding-plan': { family: 'zai' } }
  assert.deepEqual(accounts.officialMcpAuthHeaders({ origin: 'https://zcode.z.ai', credentials, signedIn: zaiPlan, env }), { ok: true, headers: { Authorization: 'Bearer jwt-1', 'X-Bigmodel-Authorization': 'Bearer maas-zai', 'Bigmodel-Target-Type': 'PERSONAL' } })
  // Identity only without a Coding Plan; never the other family's plan token.
  assert.deepEqual(accounts.officialMcpAuthHeaders({ origin: 'https://zcode.z.ai', credentials, signedIn: {}, env }), { ok: true, headers: { Authorization: 'Bearer jwt-1' } })
  assert.deepEqual(accounts.officialMcpAuthHeaders({ origin: 'https://zcode.z.ai', credentials, signedIn: { 'account:bigmodel-individual-coding-plan': { family: 'bigmodel' } }, env }), { ok: false, reason: 'official_auth_unavailable' })
  assert.deepEqual(accounts.officialMcpAuthHeaders({ origin: 'https://zcode.z.ai', credentials: { ...credentials, 'oauth:zai:access_token': '' }, signedIn: zaiPlan, env }), { ok: false, reason: 'official_auth_unavailable' })
  // Signed out (API key only): unavailable.
  assert.deepEqual(accounts.officialMcpAuthHeaders({ origin: 'https://zcode.z.ai', credentials: {}, signedIn: {}, env }), { ok: false, reason: 'official_auth_unavailable' })
  // Untrusted destinations never get the identity.
  for (const origin of ['https://evil.example', 'http://zcode.z.ai', 'https://user:pw@zcode.z.ai', 'http://127.0.0.1:9', '']) assert.deepEqual(accounts.officialMcpAuthHeaders({ origin, credentials, signedIn: zaiPlan, env }), { ok: false, reason: 'official_mcp_origin_untrusted' }, origin)
  // ZCode's endpoint override and its loopback test switch.
  assert.equal(accounts.officialMcpOriginTrusted('https://staging.zcode.example/x', { ZCODE_BASE_URL: 'https://staging.zcode.example' }), true)
  assert.equal(accounts.officialMcpOriginTrusted('https://zcode.z.ai', { ZCODE_BASE_URL: 'https://staging.zcode.example' }), false)
  assert.equal(accounts.officialMcpOriginTrusted('http://127.0.0.1:4100', { ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS: 'http://127.0.0.1:4100, http://localhost:1' }), true)
  assert.equal(accounts.officialMcpOriginTrusted('https://evil.example', { ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS: 'https://evil.example' }), false, 'the switch only opens http loopback')
  // The connector row says what to do.
  assert.match(catalog.officialAuthHint({ status: 'failed', error: 'official MCP auth failed: official_auth_unavailable' }), /browser sign-in/)
  assert.match(catalog.officialAuthHint({ status: 'failed', failureKind: 'official_auth_plan_required' }), /active GLM Coding Plan/)
  assert.equal(catalog.officialAuthHint({ status: 'failed', error: 'spawn ENOENT' }), null)
  const rows = catalog.mcpStatusRows({}, { 'plugin:tianyancha': { status: 'failed', error: 'official_auth_unavailable' } }, {})
  assert.match(rows[0].toolsError, /Settings › Preferences › Account/)
})

test('API-key sign-in: the personal provider file is put back exactly when a key is rejected', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-personal-'))
  const file = path.join(dir, 'v2', 'provider_config.json')
  assert.equal(accounts.readPersonalText(file), null)
  accounts.restorePersonalText(file, null)
  assert.equal(fs.existsSync(file), false)
  accounts.restorePersonalText(file, '{"a":1}')
  assert.equal(accounts.readPersonalText(file), '{"a":1}')
  assert.equal(fs.statSync(file).mode & 0o777, 0o600)
  accounts.restorePersonalText(file, null)
  assert.equal(fs.existsSync(file), false)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('plan limits refresh after turns: throttled, immediate on a limit error, announced only when changed', async () => {
  const { RateLimitWatch } = await import('../packages/zcode-bridge/src/rate-limit-watch.js')
  const quota = (used, mcp = 5) => accounts.rateLimitsFromQuota({ data: { level: 'pro', limits: [{ type: 'TOKENS_LIMIT', unit: 3, number: 5, usage: 100, remaining: 100 - used, nextResetTime: 1_800_000_000_000 }, { type: 'TIME_LIMIT', unit: 5, number: 1, usage: 10, currentValue: mcp }] } })
  let clock = 1_000_000
  let current = quota(40)
  let reads = 0
  const sent = []
  const timers = []
  const watch = new RateLimitWatch({
    read: async () => { reads += 1; return current },
    notify: (method, params) => sent.push({ method, params }),
    now: () => clock,
    setTimer: (fn, ms) => { const timer = { fn, at: clock + ms }; timers.push(timer); return timer },
    clearTimer: (timer) => { timers.splice(timers.indexOf(timer), 1) },
  })
  const fire = async () => { for (const timer of timers.splice(0)) { clock = Math.max(clock, timer.at); timer.fn() } await new Promise((resolve) => setImmediate(resolve)) }
  const settle = () => new Promise((resolve) => setImmediate(resolve))

  // The connection's read is the baseline; a turn right after it waits for the window, and an unchanged quota is quiet.
  watch.observe(current)
  clock += 5_000
  watch.turnCompleted({ status: 'completed', error: null })
  watch.turnCompleted({ status: 'completed', error: null })
  assert.equal(reads, 0)
  assert.equal(timers.length, 1, 'turns inside the window share one trailing refetch')
  assert.equal(timers[0].at, 1_000_000 + 30_000)
  await fire()
  assert.equal(reads, 1)
  assert.deepEqual(sent, [])

  // Past the window a turn refetches at once; only changed buckets are announced, each with its limitId.
  clock += 31_000
  current = quota(85, 7)
  watch.turnCompleted({ status: 'completed', error: null })
  await settle()
  assert.equal(reads, 2)
  assert.deepEqual(sent.map((entry) => entry.method), ['account/rateLimits/updated', 'account/rateLimits/updated'])
  assert.equal(sent[0].params.rateLimits.limitId, 'codex')
  assert.equal(sent[0].params.rateLimits.primary.usedPercent, 85)
  assert.equal(sent[1].params.rateLimits.limitId, 'zcode-mcp')
  assert.equal(sent[1].params.rateLimits.primary.usedPercent, 70)

  // A turn that failed on the plan limit refetches without waiting for the window.
  sent.length = 0
  clock += 1_000
  current = quota(100, 7)
  watch.turnCompleted({ status: 'failed', error: { message: 'usage limit reached', codexErrorInfo: 'usageLimitExceeded' } })
  await settle()
  assert.equal(reads, 3)
  assert.deepEqual(sent.map((entry) => entry.params.rateLimits.limitId), ['codex'])
  assert.equal(sent[0].params.rateLimits.primary.usedPercent, 100)

  // A failed or empty quota read announces nothing; after an account change the next turn refetches at once.
  sent.length = 0
  clock += 1_000
  current = { rateLimits: { limitId: null, primary: null, secondary: null } }
  watch.turnCompleted({ status: 'failed', error: { codexErrorInfo: 'rateLimitExceeded' } })
  await settle()
  assert.deepEqual(sent, [])
  watch.reset()
  current = quota(100, 7)
  watch.turnCompleted({ status: 'completed', error: null })
  await settle()
  assert.equal(sent.length, 2, 'a new account’s first read is announced in full')

  // Stopped (bridge shutting down): nothing more is fetched.
  watch.stop()
  clock += 60_000
  watch.turnCompleted({ status: 'completed', error: null })
  await settle()
  assert.equal(reads, 5)
  assert.equal(timers.length, 0)
})

test('ZCode custom commands: files found in the roots, switched off through command[<path>].enable, listed off when off', () => {
  const dir = tmp()
  const home = path.join(dir, 'home'), repo = path.join(dir, 'repo'), sub = path.join(repo, 'pkg')
  fs.mkdirSync(path.join(home, '.zcode', 'commands', 'git'), { recursive: true })
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(path.join(sub, '.zcode', 'commands'), { recursive: true })
  fs.writeFileSync(path.join(home, '.zcode', 'commands', 'git', 'summary.md'), '---\ndescription: Summarize git\n---\nbody')
  fs.writeFileSync(path.join(sub, '.zcode', 'commands', 'deploy.md'), '---\ndescription: Deploy it\n---\nbody')
  const files = catalog.customCommandFiles(sub, home)
  assert.deepEqual(files.map((file) => [file.name, file.scope]), [['git:summary', 'user'], ['deploy', 'project']])
  const configFile = path.join(dir, 'config.json')
  catalog.setCommandEnabled(configFile, files[1].path, false)
  const config = catalog.readConfig(configFile)
  assert.deepEqual(config.command[files[1].path], { enable: false })
  const rows = catalog.commandRows([{ name: '/git:summary', description: 'Summarize git', source: 'custom' }, { name: '/init', description: 'Init', source: 'builtin' }], { files, config })
  assert.deepEqual(rows.map((row) => [row.name, row.toggleable, row.enabled]), [['git:summary', true, true], ['init', false, true], ['deploy', true, false]])
  assert.equal(rows[2].description, 'Deploy it')
})

test('ZCode “Always allow in this project”: offered as a persistent decision with its rule, answered with ZCode’s own option', async () => {
  const permissions = await import('../packages/zcode-bridge/src/permissions.js')
  const request = { toolCallId: 'c1', toolName: 'Bash', input: { command: 'pnpm test' }, options: [
    { kind: 'allow_once', optionId: 'allow_once', response: { decision: 'allow', reason: 'Approved once' } },
    { kind: 'allow_always', optionId: 'allow_project', response: { decision: 'allow', reason: 'Approved for this project', permissionUpdates: [{ behavior: 'allow', type: 'addRules', rules: [{ toolName: 'Bash', ruleContent: 'pnpm test:*' }] }] } },
    { kind: 'deny', optionId: 'deny', response: { decision: 'deny', reason: 'no' } },
  ] }
  const { params } = permissions.approvalRequest(request, { threadId: 't', turnId: 'u', cwd: '/w' })
  const persistent = params.availableDecisions.find((entry) => typeof entry === 'object')
  assert.deepEqual(persistent.acceptWithExecpolicyAmendment.execpolicy_amendment, ['Bash(pnpm test:*)'])
  assert.ok(params.availableDecisions.includes('acceptForSession'))
  const answer = permissions.permissionAnswer(request, JSON.parse(JSON.stringify(persistent)))
  assert.equal(answer.response.reason, 'Approved for this project')
  assert.equal(answer.response.permissionUpdates[0].rules[0].ruleContent, 'pnpm test:*')
  // A tool without the project option keeps the fixed card.
  assert.equal(permissions.approvalRequest({ ...request, options: request.options.filter((option) => option.optionId !== 'allow_project') }, { threadId: 't', turnId: 'u', cwd: '/w' }).params.availableDecisions, undefined)
})

// ------------------------------------------------------------------ round 4: sub-agent text, image reads

// A child session's record as ZCode stores it: an opening timeline event (no prompt yet), the prompt, then thinking,
// text and a tool, then the answer.
const childRecord = [
  { info: { id: 'msg_part_tl', role: 'assistant', time: { created: 1 }, semantics: { origin: 'system', kind: 'timeline_event', uiVisibility: 'visible' } }, parts: [{ type: 'timeline', timelineType: 'model_selected' }], sequence: 0 },
  { info: { id: 'msg_cu', role: 'user', time: { created: 2 }, anchor: { turnId: 'turn_c' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'CHILDTASK' }], sequence: 1 },
  { info: { id: 'msg_c1', role: 'assistant', time: { created: 3, completed: 4 }, anchor: { turnId: 'turn_c' } }, parts: [{ type: 'step-start' }, { type: 'reasoning', text: 'child thinks' }, { type: 'text', text: 'pre-tool text' }, { type: 'tool', tool: 'Bash', callID: 'toolu_2', state: { status: 'completed', input: { command: 'echo c' }, output: 'c' } }], sequence: 2 },
  { info: { id: 'msg_c2', role: 'assistant', time: { created: 5, completed: 6 }, anchor: { turnId: 'turn_c' } }, parts: [{ type: 'reasoning', text: 'after' }, { type: 'text', text: 'child finished' }], sequence: 3 },
]

test('history: no empty turn for a message before the first prompt; call ids can carry the live stream’s prefix', () => {
  const { turns, anchors } = turnsFromMessages(childRecord, { threadId: 'sess_subagent_agent_1', cwd: '/w', callIdPrefix: 'tool_subagent_agent_1_' })
  assert.deepEqual(turns.map((turn) => turn.id), ['turn_c'], 'the timeline-only opening is not a turn')
  assert.deepEqual(Object.keys(anchors), ['turn_c'])
  assert.deepEqual(turns[0].items.map((item) => `${item.type}:${item.id}`), ['userMessage:msg_cu', 'reasoning:msg_c1#r0', 'agentMessage:msg_c1#t0', 'commandExecution:tool_subagent_agent_1_toolu_2', 'reasoning:msg_c2#r0', 'agentMessage:msg_c2#t0'])
  // An opening message that does show something keeps its turn.
  const shown = turnsFromMessages([{ info: { id: 'm0', role: 'assistant', time: { created: 1, completed: 2 } }, parts: [{ type: 'text', text: 'hello' }] }], { threadId: 't', cwd: '/w' })
  assert.deepEqual(shown.turns.map((turn) => turn.items.length), [1])
})

test('live: a sub-agent’s text and thinking reach its thread from the child record, above its tools and before it ends', () => {
  const out = []
  const reads = []
  let record = childRecord.slice(0, 2)
  const p = new LiveProjector({
    threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: () => {}, takeInput: () => null,
    childMessages: (childId, fromSequence) => { reads.push([childId, fromSequence]); return record.filter((message) => fromSequence === null || message.sequence >= fromSequence) },
  })
  const env = { turnId: 'turn_1' }
  const child = 'sess_subagent_agent_1'
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'toolu_a', toolName: 'Agent', input: { prompt: 'CHILDTASK', description: 'Child' } }, env)
  p.event('session.updated', { agentId: 'agent_1', childSessionId: child, description: 'Child', prompt: 'CHILDTASK', parentToolCallId: 'toolu_a', status: 'running' }, env)
  record = childRecord.slice(0, 3)
  p.event('tool.updated', { toolCallId: 'tool_subagent_agent_1_toolu_2', toolName: 'Bash', input: { command: 'echo c' }, kind: 'scheduled', agentId: 'agent_1', childSessionId: child }, env)
  p.event('tool.updated', { toolCallId: 'tool_subagent_agent_1_toolu_2', kind: 'result', result: { success: true, content: 'c' } }, env)
  record = childRecord
  p.event('session.updated', { agentId: 'agent_1', childSessionId: child, parentToolCallId: 'toolu_a', status: 'completed' }, env)
  const childEvents = out.filter((entry) => entry.params.threadId === child)
  const shown = childEvents.filter((entry) => entry.method === 'item/completed').map((entry) => `${entry.params.item.type}:${entry.params.item.text ?? entry.params.item.summary?.join('') ?? entry.params.item.command ?? ''}`)
  assert.deepEqual(shown, ['userMessage:', 'reasoning:child thinks', 'agentMessage:pre-tool text', 'commandExecution:echo c', 'reasoning:after', 'agentMessage:child finished'])
  assert.equal(childEvents.at(-2).method, 'turn/completed', 'the answer comes before the sub-agent’s turn ends')
  assert.ok(childEvents.filter((entry) => entry.params.item).every((entry) => entry.params.turnId === 'turn-agent_1'))
  assert.deepEqual(reads, [[child, null], [child, 2]], 'the next read starts at the last message read (it may still grow)')
  // No reader (or an unreadable database): tools still stream, nothing breaks.
  const bare = projector()
  bare.p.event('session.updated', { agentId: 'agent_2', childSessionId: 'sess_subagent_agent_2', prompt: 'x', status: 'running' }, env)
  bare.p.event('session.updated', { agentId: 'agent_2', childSessionId: 'sess_subagent_agent_2', status: 'completed' }, env)
  assert.ok(bare.out.some((entry) => entry.method === 'turn/completed' && entry.params.threadId === 'sess_subagent_agent_2'))
})

test('a session’s record read-only from ZCode’s database, as session/messages lists it', async () => {
  const { storedMessages, loadSqlite } = await import('../packages/zcode-bridge/src/usage.js')
  await loadSqlite()
  const { DatabaseSync } = await import('node:sqlite')
  const file = path.join(tmp(), 'db.sqlite')
  const db = new DatabaseSync(file)
  db.exec('create table message (id text primary key, session_id text, time_created integer, time_updated integer, data text, sequence integer)')
  db.exec('create table part (id text primary key, message_id text, session_id text, time_created integer, time_updated integer, data text, sequence integer)')
  const insertMessage = db.prepare('insert into message values (?, ?, ?, ?, ?, ?)')
  const insertPart = db.prepare('insert into part values (?, ?, ?, ?, ?, ?, ?)')
  insertMessage.run('m2', 's', 20, 20, JSON.stringify({ role: 'assistant', time: { created: 20 } }), 1)
  insertMessage.run('m1', 's', 10, 10, JSON.stringify({ role: 'user', time: { created: 10 } }), 0)
  insertMessage.run('x', 'other', 5, 5, JSON.stringify({ role: 'user' }), 0)
  insertPart.run('p2', 'm2', 's', 21, 21, JSON.stringify({ type: 'text', text: 'second' }), 1)
  insertPart.run('p1', 'm2', 's', 20, 20, JSON.stringify({ type: 'reasoning', text: 'first' }), 0)
  insertPart.run('p0', 'm1', 's', 10, 10, JSON.stringify({ type: 'text', text: 'hi' }), 0)
  db.close()
  const messages = storedMessages(file, 's')
  assert.deepEqual(messages.map((message) => [message.info.id, message.info.role, message.info.sessionID, message.sequence]), [['m1', 'user', 's', 0], ['m2', 'assistant', 's', 1]])
  assert.deepEqual(messages[1].parts, [{ type: 'reasoning', text: 'first', id: 'p1', sessionID: 's', messageID: 'm2' }, { type: 'text', text: 'second', id: 'p2', sessionID: 's', messageID: 'm2' }])
  assert.deepEqual(storedMessages(file, 's', { fromSequence: 1 }).map((message) => message.info.id), ['m2'])
  assert.deepEqual(storedMessages(file, 'missing'), [])
  assert.equal(storedMessages(path.join(tmp(), 'none.sqlite'), 's'), null)
})

test('an image GLM opens with Read shows as the image; a failed one keeps the read row', () => {
  const image = toolItem({ callId: 'r', tool: 'Read', input: { file_path: 'shots/pic.PNG' }, status: 'completed', result: { success: true, content: '[Attached image/png: Read image]' }, cwd: '/w', threadId: 't' })
  assert.deepEqual(image, { type: 'imageView', id: 'r', path: '/w/shots/pic.PNG', status: 'completed' })
  const byResult = toolItem({ callId: 'r', tool: 'Read', input: { file_path: '/w/screenshot' }, status: 'completed', result: { success: true, content: '[Attached image/jpeg: Read image]' }, cwd: '/w', threadId: 't' })
  assert.equal(byResult.type, 'imageView')
  const missing = toolItem({ callId: 'r', tool: 'Read', input: { file_path: '/w/gone.png' }, status: 'failed', error: 'File does not exist.', cwd: '/w', threadId: 't' })
  assert.equal(missing.type, 'commandExecution')
  assert.equal(missing.aggregatedOutput, 'File does not exist.')
  assert.equal(toolItem({ callId: 'r', tool: 'Read', input: { file_path: '/w/a.ts' }, status: 'completed', result: { content: 'x' }, cwd: '/w', threadId: 't' }).type, 'commandExecution')
  // History: the same item.
  const { turns } = turnsFromMessages([
    { info: { id: 'u', role: 'user', anchor: { turnId: 'turn_1' }, time: { created: 1 } }, parts: [{ type: 'text', text: 'look' }] },
    { info: { id: 'a', role: 'assistant', anchor: { turnId: 'turn_1' }, time: { created: 2, completed: 3 } }, parts: [{ type: 'tool', tool: 'Read', callID: 'r', state: { status: 'completed', input: { file_path: '/w/pic.png' }, output: '[Attached image/png: Read image]' } }] },
  ], { threadId: 't', cwd: '/w' })
  assert.deepEqual(turns[0].items[1], { type: 'imageView', id: 'r', path: '/w/pic.png', status: 'completed' })
})

test('zcodePaths follows the ZCode app’s data storage path (setting.json dataBaseDir), and the env var wins', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-home-'))
  try {
    assert.equal(zcodePaths({}, home).root, path.join(home, '.zcode'))
    assert.equal(zcodePaths({}, home).dataBaseDir, null)
    fs.mkdirSync(path.join(home, '.zcode', 'v2'), { recursive: true })
    fs.writeFileSync(path.join(home, '.zcode', 'v2', 'setting.json'), JSON.stringify({ dataBaseDir: '  ~/Data  ' }))
    const moved = zcodePaths({}, home)
    assert.equal(moved.root, path.join(home, 'Data', '.zcode'))
    assert.equal(moved.dataBaseDir, path.join(home, 'Data'))
    assert.equal(moved.cliConfig, path.join(home, 'Data', '.zcode', 'cli', 'config.json'))
    assert.equal(zcodePaths({ ZCODE_DATA_BASE_DIR: '/Volumes/X' }, home).root, path.join('/Volumes/X', '.zcode'))
    fs.writeFileSync(path.join(home, '.zcode', 'v2', 'setting.json'), JSON.stringify({ dataBaseDir: 'relative' }))
    assert.equal(zcodePaths({}, home).dataBaseDir, null)
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('ZCode goals: projection.target as Codex ThreadGoal (budget_limited → budgetLimited), none when there is no objective', async () => {
  const { goalOf } = await import('../packages/zcode-bridge/src/server.js')
  const target = { sessionId: 's', targetId: 't', objective: 'make tests pass', summaryTitle: 'Tests', status: 'budget_limited', tokenBudget: 50000, tokensUsed: 51234, timeUsedSeconds: 90, createdAt: 1700000000000, updatedAt: 1700000090000 }
  assert.deepEqual(goalOf(target, 'thread-1'), { threadId: 'thread-1', objective: 'make tests pass', status: 'budgetLimited', tokenBudget: 50000, tokensUsed: 51234, timeUsedSeconds: 90, createdAt: 1700000000, updatedAt: 1700000090, codeDesktop: { summaryTitle: 'Tests' } })
  assert.equal(goalOf({ ...target, status: 'paused', tokenBudget: null }, 'x').tokenBudget, null)
  assert.equal(goalOf({ ...target, status: 'paused' }, 'x').status, 'paused')
  assert.equal(goalOf(null, 'x'), null)
  assert.equal(goalOf({ status: 'active' }, 'x'), null)
})

test('ZCode settings: Workspace Memory and search enhancements default to the ZCode app’s choices; OpenClaude Desktop’s value wins', async () => {
  const { zcodeCoreSettingDefs, zcodeRuntimePreferences } = await import('../packages/zcode-bridge/src/server.js')
  const { RUNTIME_PREFERENCES } = await import('../packages/zcode-bridge/src/zcode.js')
  assert.deepEqual(zcodeRuntimePreferences(zcodeCoreSettingDefs({})), { memoryEnabled: false, nativeSearchEnhancementsEnabled: true })
  const fromApp = zcodeCoreSettingDefs({ memoryEnabled: true, nativeSearchEnhancementsEnabled: false })
  assert.deepEqual(zcodeRuntimePreferences(fromApp), { memoryEnabled: true, nativeSearchEnhancementsEnabled: false })
  assert.deepEqual(zcodeRuntimePreferences(fromApp, { memoryEnabled: false }), { memoryEnabled: false, nativeSearchEnhancementsEnabled: false })
  assert.equal(RUNTIME_PREFERENCES.askUserQuestionAutoResolutionEnabled, false, 'questions always wait for the user')
})

test('session/requestRuntimePreferences: the host answer carries OpenClaude Desktop’s ZCode settings over the defaults', async () => {
  const { ZCodeConnection, RUNTIME_PREFERENCES } = await import('../packages/zcode-bridge/src/zcode.js')
  const written = []
  const connection = new ZCodeConnection({ command: 'x', args: [], env: {}, cwd: '/', runtimePreferences: () => ({ memoryEnabled: true }) })
  connection.write = (message) => written.push(message)
  await connection.answer({ id: 7, method: 'session/requestRuntimePreferences', params: {} })
  assert.deepEqual(written[0], { id: 7, result: { ...RUNTIME_PREFERENCES, memoryEnabled: true } })
})

test('ZCode sub-agents: built-ins with their model, user and project agents, a project agent winning a name', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-agents-')), project = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-proj-'))
  const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text) }
  write(path.join(root, 'v2', 'agents-state.json'), JSON.stringify({ builtInModelSelectionOverrides: { Explore: { providerId: 'zai', modelId: 'glm-4.7-flash' } } }))
  write(path.join(root, 'agents', 'reviewer.md'), '---\nname: reviewer\ndescription: Reviews diffs\ntools: [Read, Grep]\nmodel: zai/glm-5\n---\nReview.')
  write(path.join(root, 'agents', 'shared.md'), '---\nname: shared\ndescription: User copy\n---\n')
  write(path.join(root, 'agents', 'broken.md'), 'no frontmatter')
  write(path.join(project, '.zcode', 'agents', 'shared.md'), '---\nname: shared\ndescription: Project copy\n---\n')
  const agents = catalog.zcodeAgents({ root, home: os.homedir(), cwd: project })
  assert.deepEqual(agents.map((agent) => [agent.name, agent.scope]), [['general-purpose', 'builtin'], ['Explore', 'builtin'], ['shared', 'project'], ['reviewer', 'user']])
  assert.equal(agents[1].model, 'zai/glm-4.7-flash')
  assert.deepEqual(agents.find((agent) => agent.name === 'reviewer').tools, ['Read', 'Grep'])
  assert.equal(agents.find((agent) => agent.name === 'shared').description, 'Project copy')
  const moved = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-storage-'))
  write(path.join(moved, 'agents', 'elsewhere.md'), '---\nname: elsewhere\ndescription: In storage.dir\n---\n')
  assert.ok(catalog.zcodeAgents({ root, cwd: null, config: { storage: { dir: moved } } }).some((agent) => agent.name === 'elsewhere'), 'storage.dir moves the user agents')
  for (const dir of [root, project, moved]) fs.rmSync(dir, { recursive: true, force: true })
})

test('ZCode project hooks (zcode.json, .zcode/config.json up to the git root) are listed, blocked until trusted in the ZCode app', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-root-')), repo = fs.mkdtempSync(path.join(os.tmpdir(), 'zc-repo-'))
  fs.mkdirSync(path.join(repo, '.git')); fs.mkdirSync(path.join(repo, 'pkg', '.zcode'), { recursive: true })
  fs.writeFileSync(path.join(repo, 'zcode.json'), JSON.stringify({ hooks: { enabled: true, events: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'npm run lint' }] }] } } }))
  fs.writeFileSync(path.join(repo, 'pkg', '.zcode', 'config.json'), JSON.stringify({ hooks: { events: { Stop: [{ hooks: [{ type: 'command', command: 'echo bye' }] }] } } }))
  const listed = catalog.hooksList({ hooks: { enabled: true, events: {} } }, { cwds: [path.join(repo, 'pkg')], root })
  const [entry] = listed.data
  assert.deepEqual(entry.hooks.map((hook) => [hook.eventName, hook.command, hook.source, hook.trustStatus, hook.enabled]), [
    ['stop', 'echo bye', 'project', 'untrusted', false], ['preToolUse', 'npm run lint', 'project', 'untrusted', false]])
  assert.equal(entry.warnings.length, 1)
  fs.mkdirSync(path.join(root, 'security'))
  fs.writeFileSync(path.join(root, 'security', 'workspace-hook-trust-v1.json'), JSON.stringify({ schemaVersion: 1, records: [{ workspaceIdentity: 'w', hookDeclarationDigest: 'a'.repeat(64), digestAlgorithm: 'sha256', decision: 'trusted', grantedAt: '2026-01-01T00:00:00Z', eventAtGrant: 'PreToolUse', displayCommandAtGrant: 'npm run lint', sourcePathAtGrant: path.join(repo, 'zcode.json') }] }))
  const after = catalog.hooksList({ hooks: { enabled: true, events: {} } }, { cwds: [path.join(repo, 'pkg')], root }).data[0]
  assert.deepEqual(after.hooks.map((hook) => [hook.command, hook.trustStatus, hook.enabled]), [['echo bye', 'untrusted', false], ['npm run lint', 'trusted', true]])
  for (const dir of [root, repo]) fs.rmSync(dir, { recursive: true, force: true })
})
