// Unit tests of the OpenCode / MiMo Code bridge mapping (harness/packages/opencode-bridge).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { FLAVORS, flavorFromPath, freeTierActive } from '../packages/opencode-bridge/src/flavor.js'
import { afterPlanState, agentFor, allowedExternalDirs, applyPermissionParams, decide, defaultPermission, grantCovers, grantScopeChanged, isReadOnlyMode, isSessionDecision, replyFor, sandboxPolicy, sessionGrant, sessionRules, wildcardMatch, withinRoots } from '../packages/opencode-bridge/src/policy.js'
import { denyRules, isToolDenied, mcpToolName, normalizeToolSelection, toolSelectionOf, toolsListResponse } from '../packages/opencode-bridge/src/tools.js'
import { Projector, actorThreadId, addedFileDiff, errorInfoOf, isDefaultTitle, mcpServerOf, parseActorThreadId, planOf, tokenBreakdown, toolItem, turnDiff, userContent } from '../packages/opencode-bridge/src/projection.js'
import { ModelCatalog, splitModel, variantOf } from '../packages/opencode-bridge/src/models.js'
import { authFile, credentialOf, providerRank, storedCredentials } from '../packages/opencode-bridge/src/credentials.js'
import { ThreadStore, mergeThreads } from '../packages/opencode-bridge/src/store.js'
import { OAuthCallbacks, callbackOf, DEFAULT_CALLBACK } from '../packages/opencode-bridge/src/oauth-callback.js'
import { accountUsage, codeStats, foldSession, localDayKey } from '../packages/opencode-bridge/src/usage.js'
import { BridgeConfig, FALLBACK_SHELL, agentShell, parseJsonc, providerOverlay, toCodexMcp, toOpencodeMcp } from '../packages/opencode-bridge/src/config.js'
import { FAIL_CLOSED_PROFILE, seatbeltProfile, shellWrapper } from '../packages/opencode-bridge/src/sandbox.js'
import { pluginSource } from '../packages/opencode-bridge/src/plugin.js'
import { McpToolCache } from '../packages/opencode-bridge/src/mcp-tools.js'
import { Bridge, LiveThread, capabilitiesFor, keptCatalogs, loginInputs, signOutElsewhere } from '../packages/opencode-bridge/src/index.js'
import { PassThrough } from 'node:stream'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-unit-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const READ = FLAVORS.opencode.readTools

// ------------------------------------------------------------------ flavor

test('flavor comes from the binary name or the cores/<id>/ path', () => {
  assert.equal(flavorFromPath('/x/cores/mimo/0.1.15/mimo'), 'mimo')
  assert.equal(flavorFromPath('/Users/a/.mimocode/bin/mimo'), 'mimo')
  assert.equal(flavorFromPath('/opt/homebrew/bin/opencode'), 'opencode')
  assert.equal(flavorFromPath('/data/cores/opencode/state'), 'opencode')
  assert.equal(flavorFromPath('/data/cores/mimo/state'), 'mimo')
  assert.equal(flavorFromPath('/usr/bin/node'), null)
  assert.equal(FLAVORS.mimo.envPrefix, 'MIMOCODE')
  assert.equal(FLAVORS.mimo.promptRoute, 'message')
})

// ------------------------------------------------------------------ permission modes

const params = (mode, extra = {}) => {
  const approvalPolicy = mode === 'bypass' ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request'
  const sandboxPolicy = mode === 'plan' ? { type: 'readOnly', networkAccess: false } : mode === 'bypass' ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: ['/w', '/extra'], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false }
  return { approvalPolicy, sandboxPolicy, codeDesktop: { permissionMode: mode, afterPlan: 'acceptEdits' }, ...extra }
}

test('permission params fold into the thread state; hints win, read-only sandboxes stay read-only', () => {
  assert.equal(applyPermissionParams(defaultPermission(), params('ask')).mode, 'ask')
  assert.equal(applyPermissionParams(defaultPermission(), params('acceptEdits')).mode, 'acceptEdits')
  const plan = applyPermissionParams(defaultPermission(), params('plan'))
  assert.equal(plan.mode, 'plan')
  assert.equal(plan.sandbox, 'read-only')
  assert.equal(plan.afterPlan, 'acceptEdits')
  assert.equal(applyPermissionParams(defaultPermission(), params('bypass')).mode, 'bypass')
  // A bypass hint without a full-access sandbox is never honored.
  assert.equal(applyPermissionParams(defaultPermission(), { ...params('auto'), codeDesktop: { permissionMode: 'bypass' } }).mode, 'auto')
  // An auto hint with a read-only sandbox becomes chat (read-only).
  assert.equal(applyPermissionParams(defaultPermission(), { sandbox: 'read-only', codeDesktop: { permissionMode: 'auto' } }).mode, 'chat')
  // No hint (a Codex client): derived from policy + sandbox.
  assert.equal(applyPermissionParams(defaultPermission(), { approvalPolicy: 'untrusted', sandbox: 'workspace-write' }).mode, 'ask')
  assert.equal(applyPermissionParams(defaultPermission(), { approvalPolicy: 'never', sandbox: 'danger-full-access' }).mode, 'bypass')
  const state = applyPermissionParams(defaultPermission(), params('auto'))
  assert.deepEqual(state.extraRoots, ['/w', '/extra'])
  assert.equal(agentFor(plan), 'plan')
  assert.equal(agentFor(state), 'build')
})

test('session rules never encode the mode (they outlive a mid-turn Mode change)', () => {
  for (const mode of ['auto', 'ask', 'acceptEdits', 'bypass', 'plan']) {
    const rules = sessionRules({ mode }, { readTools: READ, planPaths: ['.opencode/plans/*.md'], deny: [{ permission: 'webfetch', pattern: '*', action: 'deny' }] })
    assert.deepEqual(rules[0], { permission: '*', pattern: '*', action: 'ask' })
    assert.ok(!rules.some((rule) => rule.permission === '*' && rule.action === 'allow'))
    assert.ok(!rules.some((rule) => rule.permission === 'bash' || (rule.permission === 'edit' && rule.pattern === '*')))
    assert.deepEqual(rules.at(-1), { permission: 'webfetch', pattern: '*', action: 'deny' })
    assert.equal(rules.find((rule) => rule.permission === 'plan_exit').action, mode === 'plan' ? 'allow' : 'deny')
    assert.ok(rules.some((rule) => rule.permission === 'read' && rule.pattern === '*.env' && rule.action === 'ask'))
  }
})

test('the agent\'s own external_directory allows (references, skills, tool output) count as roots in decide', () => {
  const rules = [{ permission: '*', pattern: '*', action: 'allow' }, { permission: 'external_directory', pattern: '*', action: 'ask' },
    { permission: 'external_directory', pattern: '/team/docs/*', action: 'allow' }, { permission: 'external_directory', pattern: '/tmp/opencode/*', action: 'allow' },
    { permission: 'external_directory', pattern: '/deny/*', action: 'deny' }, { permission: 'external_directory', pattern: '/*', action: 'allow' }]
  assert.deepEqual(allowedExternalDirs(rules), ['/team/docs', '/tmp/opencode'])
  const state = { ...defaultPermission(), mode: 'auto' }
  const outside = { permission: 'external_directory', patterns: ['/team/docs/*'], metadata: { filepath: '/team/docs/a.md' } }
  assert.equal(decide(state, outside, { tool: 'bash', readTools: READ, cwd: '/w' }).action, 'ask')
  assert.equal(decide(state, outside, { tool: 'bash', readTools: READ, cwd: '/w', agentDirs: ['/team/docs'] }).action, 'allow')
  assert.equal(decide({ ...state, mode: 'plan' }, outside, { tool: 'edit', readTools: READ, cwd: '/w', agentDirs: ['/team/docs'] }).action, 'reject')
})

test('decide: each mode answers bash, edits, outside paths, secrets and MCP faithfully', () => {
  const state = (mode) => ({ ...defaultPermission(), mode, extraRoots: ['/extra'] })
  const ask = (mode, request, tool) => decide(state(mode), request, { tool, readTools: READ, cwd: '/w' }).action
  const bash = { permission: 'bash', patterns: ['rm -rf x'] }
  const edit = { permission: 'edit', patterns: ['a.txt'] }
  assert.deepEqual(['auto', 'ask', 'acceptEdits', 'plan', 'bypass'].map((mode) => ask(mode, bash, 'bash')), ['allow', 'ask', 'ask', 'allow', 'allow'])
  assert.deepEqual(['auto', 'ask', 'acceptEdits', 'plan', 'bypass'].map((mode) => ask(mode, edit, 'edit')), ['allow', 'ask', 'allow', 'reject', 'allow'])
  const outsideEdit = { permission: 'external_directory', patterns: ['/elsewhere/*'], metadata: { filepath: '/elsewhere/f' } }
  assert.equal(ask('auto', outsideEdit, 'write'), 'ask')
  assert.equal(ask('plan', outsideEdit, 'write'), 'reject')
  assert.equal(ask('auto', { permission: 'external_directory', patterns: ['/extra/sub/*'], metadata: { filepath: '/extra/sub/f' } }, 'edit'), 'allow')
  assert.equal(ask('ask', { permission: 'external_directory', patterns: ['/etc/*'] }, 'read'), 'allow')
  assert.equal(ask('auto', { permission: 'read', patterns: ['.env'] }, 'read'), 'ask')
  assert.equal(ask('auto', { permission: 'smoke_echo', patterns: ['*'] }, 'smoke_echo'), 'allow')
  assert.equal(ask('ask', { permission: 'smoke_echo', patterns: ['*'] }, 'smoke_echo'), 'ask')
  assert.equal(ask('plan', { permission: 'smoke_echo', patterns: ['*'] }, 'smoke_echo'), 'ask')
  assert.equal(ask('auto', { permission: 'doom_loop', patterns: ['*'] }), 'ask')
  assert.equal(ask('bypass', { permission: 'doom_loop', patterns: ['*'] }), 'allow')
  assert.equal(replyFor('accept'), 'once')
  // The agent never hears `always` (it would outlive the session and the mode, see below).
  assert.equal(replyFor('acceptForSession'), 'once')
  assert.equal(replyFor('approved_for_session'), 'once')
  assert.equal(replyFor('decline'), 'reject')
  assert.equal(replyFor('cancel'), 'reject')
  assert.ok(withinRoots('/w/a/b', ['/w']))
  assert.ok(!withinRoots('/wx/a', ['/w']))
})

test('allow for this session: kept per root thread, never in read-only modes, never past its patterns', () => {
  const state = (mode) => ({ ...defaultPermission(), mode })
  const ctx = (grants) => ({ tool: undefined, readTools: READ, cwd: '/w', grants })
  const editAsk = { permission: 'edit', patterns: ['a.txt'], always: ['*'] }
  const grants = [sessionGrant(editAsk)]
  assert.deepEqual(grants[0], { permission: 'edit', patterns: ['*'] })
  assert.ok(isSessionDecision('acceptForSession') && isSessionDecision('approved_for_session') && !isSessionDecision('accept'))
  // Ask mode: the grant answers later edits of the same thread.
  assert.equal(decide(state('ask'), { permission: 'edit', patterns: ['b/c.txt'] }, { ...ctx(grants), tool: 'edit' }).action, 'allow')
  assert.equal(decide(state('ask'), { permission: 'edit', patterns: ['b/c.txt'] }, { ...ctx([]), tool: 'edit' }).action, 'ask')
  // Read-only modes stay read-only whatever was granted.
  for (const mode of ['plan', 'chat', 'review']) assert.equal(decide(state(mode), { permission: 'edit', patterns: ['x'] }, { ...ctx(grants), tool: 'write' }).action, 'reject', mode)
  assert.equal(decide(state('plan'), { permission: 'smoke_echo', patterns: ['*'] }, ctx([{ permission: 'smoke_echo', patterns: ['*'] }])).action, 'ask')
  // Bash grants follow OpenCode's always patterns (`git status *` also covers bare `git status`).
  const bashGrant = [sessionGrant({ permission: 'bash', patterns: ['git status --short'], always: ['git status *'] })]
  assert.equal(decide(state('ask'), { permission: 'bash', patterns: ['git status'] }, ctx(bashGrant)).action, 'allow')
  assert.equal(decide(state('ask'), { permission: 'bash', patterns: ['git status', 'rm -rf x'] }, ctx(bashGrant)).action, 'ask')
  assert.equal(decide(state('ask'), { permission: 'bash', patterns: ['git push'] }, ctx(bashGrant)).action, 'ask')
  // Another permission kind, or a repeated-call warning, still asks.
  assert.ok(!grantCovers(grants, { permission: 'bash', patterns: ['ls'] }))
  assert.equal(decide(state('ask'), { permission: 'doom_loop', patterns: ['*'] }, ctx([{ permission: 'doom_loop', patterns: ['*'] }])).action, 'ask')
  // No always patterns: the ask's own patterns, else everything of that kind.
  assert.deepEqual(sessionGrant({ permission: 'webfetch', patterns: ['https://a/*'] }), { permission: 'webfetch', patterns: ['https://a/*'] })
  assert.deepEqual(sessionGrant({ permission: 'edit' }), { permission: 'edit', patterns: ['*'] })
  assert.ok(wildcardMatch('src/a.ts', 'src/*'))
  assert.ok(wildcardMatch('a.b', 'a?b'))
  assert.ok(!wildcardMatch('a.b', 'a.c'))
  assert.ok(wildcardMatch('npm test', 'npm test *'))
  assert.ok(!wildcardMatch('npm testing', 'npm test *'))
})

test('sandbox policy per mode, with the client\'s temp exclusions', () => {
  const auto = applyPermissionParams(defaultPermission(), params('auto'))
  assert.deepEqual(sandboxPolicy(auto, { cwd: '/w', tmp: ['/T'] }), { mode: 'workspace-write', roots: ['/w', '/extra', '/T', '/tmp', '/private/tmp'], network: false })
  const excluded = applyPermissionParams(defaultPermission(), { ...params('auto'), sandboxPolicy: { type: 'workspaceWrite', writableRoots: ['/w'], networkAccess: true, excludeTmpdirEnvVar: true, excludeSlashTmp: true } })
  assert.deepEqual(sandboxPolicy(excluded, { cwd: '/w', tmp: ['/T'] }), { mode: 'workspace-write', roots: ['/w'], network: true })
  assert.equal(sandboxPolicy(applyPermissionParams(defaultPermission(), params('plan')), { cwd: '/w' }).mode, 'read-only')
  assert.equal(sandboxPolicy(applyPermissionParams(defaultPermission(), params('bypass')), { cwd: '/w' }).mode, 'danger-full-access')
  const after = afterPlanState(applyPermissionParams(defaultPermission(), params('plan')), 'acceptEdits')
  assert.equal(after.mode, 'acceptEdits')
  assert.equal(after.sandbox, 'workspace-write')
  assert.equal(afterPlanState({ ...defaultPermission(), mode: 'plan', afterPlan: 'bypass' }, undefined).mode, 'auto')
  // 'Accept and bypass permissions' on the plan card (validated by the app) continues in Bypass.
  assert.equal(sandboxPolicy(afterPlanState({ ...defaultPermission(), mode: 'plan' }, 'bypass'), { cwd: '/w' }).mode, 'danger-full-access')
})

// ------------------------------------------------------------------ tools

test('tool selection: edit family shares one switch, servers deny their prefix', () => {
  assert.equal(toolSelectionOf({}), undefined)
  assert.equal(toolSelectionOf({ codeDesktop: { tools: null } }), null)
  const selection = normalizeToolSelection({ disabled: ['write', 'bash', 'run_code', ''], disabledServers: ['my.server'] })
  assert.deepEqual(selection, { disabled: ['write', 'bash'], disabledServers: ['my.server'] })
  assert.deepEqual(denyRules(selection), [{ permission: 'edit', pattern: '*', action: 'deny' }, { permission: 'bash', pattern: '*', action: 'deny' }, { permission: 'my_server_*', pattern: '*', action: 'deny' }])
  assert.ok(isToolDenied('apply_patch', selection))
  assert.ok(isToolDenied('my_server_echo', selection, ['my.server']))
  assert.equal(mcpToolName('my.server', 'do-it'), 'my_server_do-it')
  const list = toolsListResponse([{ id: 'invalid' }, { id: 'bash', description: 'Run\nmore' }, { id: 'edit' }, { id: 'write' }, { id: 'apply_patch' }, { id: 'skill' }, { id: 'plan_exit' }], [{ name: 'smoke', tools: [{ name: 'echo', description: 'Echo' }] }])
  assert.deepEqual(list.tools.map((tool) => tool.name), ['bash', 'edit', 'skill'])
  assert.equal(list.tools[0].description, 'Run')
  assert.equal(list.tools.find((tool) => tool.name === 'skill').kind, 'skill')
  assert.deepEqual(list.servers, [{ name: 'smoke', tools: [{ name: 'smoke_echo', tool: 'echo', description: 'Echo' }] }])
})

// ------------------------------------------------------------------ projection

const S = 'ses_1'
const user = (id, created, parts, extra = {}) => ({ info: { id, sessionID: S, role: 'user', time: { created }, ...extra }, parts: parts.map((part, index) => ({ id: `${id}-p${index}`, sessionID: S, messageID: id, ...part })) })
const assistant = (id, parentID, created, parts, extra = {}) => ({ info: { id, sessionID: S, role: 'assistant', parentID, time: { created, completed: created + 5 }, tokens: { input: 10, output: 5, reasoning: 1, cache: { read: 2, write: 3 } }, providerID: 'p', modelID: 'm', ...extra }, parts: parts.map((part, index) => ({ id: `${id}-p${index}`, sessionID: S, messageID: id, ...part })) })
const tool = (name, state, extra = {}) => ({ type: 'tool', tool: name, callID: `call-${name}`, state, ...extra })

test('MiMo scheduled prompts (cron / loop) are turns of their own with their text and origin', () => {
  const projector = new Projector({ threadId: S, cwd: '/w', meta: {}, mcpServers: () => [] })
  projector.load([
    user('msg_1', 1000, [{ type: 'text', text: 'check CI every 5 minutes' }]),
    assistant('msg_2', 'msg_1', 1100, [{ type: 'text', text: 'scheduled', time: { start: 1, end: 2 } }]),
    user('msg_3', 301000, [{ type: 'text', text: 'check CI', synthetic: true, metadata: { origin: { kind: 'cron', taskId: 'job-1', kindOfTask: 'recurring', firedAt: 301000 } } }]),
    assistant('msg_4', 'msg_3', 301100, [{ type: 'text', text: 'CI is green', time: { start: 1, end: 2 } }]),
  ])
  const turns = projector.turns()
  assert.deepEqual(turns.map((turn) => turn.id), ['msg_1', 'msg_3'])
  assert.equal(turns[0].durationMs, 105, 'the first turn is not stretched over the scheduled run')
  const scheduled = turns[1].items[0]
  assert.equal(scheduled.type, 'userMessage')
  assert.deepEqual(scheduled.content, [{ type: 'text', text: 'check CI', text_elements: [] }])
  assert.deepEqual(scheduled.codeDesktop.origin, { kind: 'cron', taskId: 'job-1', kindOfTask: 'recurring', firedAt: 301000 })
  assert.equal(turns[1].items[1].text, 'CI is green')
})

test('history → Codex turns: items per part type, statuses and steer/synthetic merging', () => {
  const projector = new Projector({ threadId: S, cwd: '/w', meta: { steers: ['msg_3'] }, mcpServers: () => ['smoke'] })
  projector.load([
    user('msg_1', 1000, [{ type: 'text', text: 'hello' }, { type: 'file', mime: 'image/png', url: 'file:///w/p.png', filename: 'p.png' }, { type: 'file', mime: 'text/plain', url: 'file:///w/n.md', filename: 'n.md' }, { type: 'text', text: 'Called the Read tool', synthetic: true }]),
    assistant('msg_2', 'msg_1', 1100, [
      { type: 'step-start' },
      { type: 'reasoning', text: 'thinking', time: { start: 1, end: 2 } },
      tool('bash', { status: 'completed', input: { command: 'ls', description: 'List' }, output: 'a\n', metadata: { exit: 0 }, time: { start: 1, end: 3 } }),
      tool('read', { status: 'completed', input: { filePath: '/w/a.txt' }, output: 'x', time: { start: 1, end: 2 } }),
      tool('grep', { status: 'completed', input: { pattern: 'foo', path: 'src' }, output: '', time: { start: 1, end: 2 } }),
      tool('edit', { status: 'completed', input: { filePath: '/w/a.txt', oldString: 'a', newString: 'b' }, output: 'ok', metadata: { diff: '--- a\n+++ a\n-a\n+b\n' }, time: { start: 1, end: 2 } }),
      tool('write', { status: 'completed', input: { filePath: 'new.txt', content: 'one\ntwo\n' }, output: 'ok', metadata: { exists: false }, time: { start: 1, end: 2 } }),
      tool('smoke_echo', { status: 'completed', input: { text: 'x' }, output: 'echo:x', time: { start: 1, end: 2 } }),
      tool('webfetch', { status: 'completed', input: { url: 'https://example.com' }, output: 'page', time: { start: 1, end: 2 } }),
      tool('todowrite', { status: 'completed', input: { todos: [{ content: 'a', status: 'in_progress', priority: 'high' }] }, output: '[]', time: { start: 1, end: 2 } }),
      tool('task', { status: 'completed', input: { description: 'Child', prompt: 'do', subagent_type: 'general' }, output: 'done', metadata: { sessionId: 'ses_child' }, time: { start: 1, end: 2 } }),
      { type: 'text', text: 'answer', time: { start: 1, end: 2 } },
      { type: 'step-finish', tokens: {} },
    ]),
    user('msg_3', 1200, [{ type: 'text', text: 'steered' }]),
    user('msg_4', 1300, [{ type: 'text', text: 'The plan has been approved', synthetic: true }]),
    assistant('msg_5', 'msg_3', 1250, [{ type: 'text', text: 'after steer', time: { start: 1, end: 2 } }]),
    user('msg_6', 2000, [{ type: 'text', text: 'second' }]),
    assistant('msg_7', 'msg_6', 2100, [{ type: 'text', text: 'partial' }], { error: { name: 'MessageAbortedError', data: { message: 'aborted' } } }),
    user('msg_8', 3000, [{ type: 'text', text: 'third' }]),
    assistant('msg_9', 'msg_8', 3100, [], { error: { name: 'APIError', data: { message: 'bad request', statusCode: 400 } } }),
    user('msg_a', 4000, [{ type: 'text', text: 'fourth' }]),
    assistant('msg_b', 'msg_a', 4100, [{ type: 'text', text: 'cut off' }], { time: { created: 4100 } }),
  ])
  const turns = projector.turns()
  assert.deepEqual(turns.map((turn) => [turn.id, turn.status]), [['msg_1', 'completed'], ['msg_6', 'interrupted'], ['msg_8', 'failed'], ['msg_a', 'interrupted']])
  const first = turns[0]
  const types = first.items.map((item) => item.type)
  assert.deepEqual(types, ['userMessage', 'reasoning', 'commandExecution', 'commandExecution', 'commandExecution', 'fileChange', 'fileChange', 'mcpToolCall', 'webSearch', 'dynamicToolCall', 'collabAgentToolCall', 'agentMessage', 'userMessage', 'agentMessage'])
  assert.deepEqual(first.items[0].content, [{ type: 'text', text: 'hello', text_elements: [] }, { type: 'localImage', path: '/w/p.png' }, { type: 'mention', name: 'n.md', path: '/w/n.md' }])
  assert.equal(first.items[2].command, 'ls')
  assert.equal(first.items[2].exitCode, 0)
  assert.equal(first.items[3].commandActions[0].type, 'read')
  assert.equal(first.items[4].commandActions[0].type, 'search')
  assert.equal(first.items[4].commandActions[0].path, '/w/src')
  assert.equal(first.items[5].changes[0].diff, '--- a\n+++ a\n-a\n+b\n')
  assert.deepEqual(first.items[6].changes[0].kind, { type: 'add' })
  assert.equal(first.items[6].changes[0].path, '/w/new.txt')
  assert.match(first.items[6].changes[0].diff, /\+one\n\+two/)
  assert.equal(first.items[7].server, 'smoke')
  assert.equal(first.items[7].tool, 'echo')
  assert.match(JSON.stringify(first.items[7].result), /echo:x/)
  assert.deepEqual(first.items[8].action, { type: 'openPage', url: 'https://example.com' })
  assert.equal(first.items[9].tool, 'todo_write')
  assert.deepEqual(first.items[10].receiverThreadIds, ['ses_child'])
  assert.equal(first.items[10].description, 'Child')
  assert.equal(first.items[12].content[0].text, 'steered')
  assert.equal(turns[2].error.message, 'bad request')
  // A provider's 400 is an invalid request, not a connection problem.
  assert.equal(turns[2].error.codexErrorInfo, 'badRequest')
  assert.match(turnDiff(first), /\+b/)
  const usage = projector.usage()
  assert.equal(usage.last.inputTokens, 15)
  assert.equal(usage.last.cachedInputTokens, 2)
  assert.deepEqual(projector.plan(), [{ step: 'a', status: 'inProgress' }])
  assert.equal(projector.preview(), 'hello')
  // Busy: the last turn is in progress.
  assert.equal(projector.turns({ busy: true }).at(-1).status, 'inProgress')
})

test('compaction, review markers and MiMo actor views', () => {
  const projector = new Projector({ threadId: S, cwd: '/w', meta: { reviews: { msg_r: { label: 'Uncommitted changes' } } } })
  projector.load([
    user('msg_c', 1000, [{ type: 'compaction', auto: false }]),
    assistant('msg_d', 'msg_c', 1100, [{ type: 'text', text: 'summary', time: { start: 1, end: 2 } }], { summary: true }),
    user('msg_r', 2000, [{ type: 'subtask', prompt: 'review', description: 'review changes', agent: 'build' }]),
    assistant('msg_s', 'msg_r', 2100, [{ type: 'text', text: 'Looks good.', time: { start: 1, end: 2 } }]),
    user('msg_x', 3000, [{ type: 'text', text: 'actor prompt' }], { agentID: 'general-1' }),
    assistant('msg_y', 'msg_x', 3100, [{ type: 'text', text: 'actor answer', time: { start: 1, end: 2 } }], { agentID: 'general-1' }),
  ])
  const turns = projector.turns()
  assert.equal(turns.length, 2)
  assert.deepEqual(turns[0].items.map((item) => item.type), ['contextCompaction'])
  // The summary OpenCode kept rides on the compaction marker (shown collapsed under it).
  assert.equal(turns[0].items[0].codeDesktop.summary, 'summary')
  assert.deepEqual(turns[1].items.map((item) => item.type), ['userMessage', 'enteredReviewMode', 'agentMessage', 'exitedReviewMode'])
  assert.equal(turns[1].items.at(-1).review, 'Looks good.')
  const actor = new Projector({ threadId: actorThreadId(S, 'general-1'), cwd: '/w', actor: 'general-1' })
  // The main view keeps the actor's slice apart (its tokens and outcome), never in its own transcript.
  assert.deepEqual([...projector.slices.keys()], ['msg_x', 'msg_y'])
  actor.load([...projector.messages.values(), ...projector.slices.values()])
  assert.deepEqual(actor.turns().map((turn) => turn.items.map((item) => item.text ?? item.content?.[0]?.text)), [['actor prompt', 'actor answer']])
  assert.deepEqual(parseActorThreadId('ses_1~general-1'), { sessionID: 'ses_1', actorID: 'general-1' })
  assert.equal(parseActorThreadId('ses_1'), null)
})

test('item helpers: MiMo snake_case args, actor children, errors, titles', () => {
  const edit = toolItem({ id: 'p1', sessionID: S, tool: 'edit', callID: 'c', state: { status: 'running', input: { file_path: '/w/a', old_string: 'x', new_string: 'y' } } }, { threadId: S, cwd: '/w' })
  assert.equal(edit.changes[0].path, '/w/a')
  assert.match(edit.changes[0].diff, /-x\n\+y/)
  const actor = toolItem({ id: 'p2', sessionID: S, tool: 'actor', callID: 'c', state: { status: 'running', input: { operation: { action: 'run', subagent_type: 'general', description: 'D', prompt: 'P' } }, metadata: { actorId: 'general-1' } } }, { threadId: S, cwd: '/w' })
  assert.equal(actor.type, 'collabAgentToolCall')
  assert.deepEqual(actor.receiverThreadIds, ['ses_1~general-1'])
  const declined = toolItem({ id: 'p3', tool: 'bash', state: { status: 'error', input: { command: 'rm x' }, error: 'The user rejected permission to use this specific tool call.' } }, { threadId: S, cwd: '/w' })
  assert.equal(declined.status, 'declined')
  assert.equal(mcpServerOf('my_server_echo', ['my.server']).tool, 'echo')
  assert.equal(errorInfoOf({ name: 'ContextOverflowError', data: { message: 'too long' } }).codexErrorInfo, 'contextWindowExceeded')
  assert.equal(errorInfoOf({ name: 'ProviderAuthError', data: { message: 'no key' } }).codexErrorInfo, 'unauthorized')
  assert.ok(isDefaultTitle('New session - 2026-10-04T13:07:38.702Z'))
  assert.ok(isDefaultTitle('Untitled'))
  assert.ok(!isDefaultTitle('Fix the bug'))
  assert.deepEqual(tokenBreakdown({ input: 1, output: 2, reasoning: 3, cache: { read: 4, write: 5 } }), { totalTokens: 15, inputTokens: 10, cachedInputTokens: 4, cacheWriteInputTokens: 5, outputTokens: 5, reasoningOutputTokens: 3 })
  assert.deepEqual(planOf([{ content: 'x', status: 'completed' }, { content: 'y', status: 'pending' }]), [{ step: 'x', status: 'completed' }, { step: 'y', status: 'pending' }])
  // A cancelled todo is struck through but marked abandoned (the checklist's X and Abandoned tag), never done.
  assert.deepEqual(planOf([{ content: 'Migrate the database', status: 'cancelled' }, { content: 'z', status: 'in_progress' }]), [
    { step: 'Migrate the database', status: 'completed', codeDesktop: { state: 'abandoned' } }, { step: 'z', status: 'inProgress' },
  ])
  assert.match(addedFileDiff('/f', 'a\n'), /^--- \/dev\/null\n\+\+\+ \/f\n@@ -0,0 \+1,1 @@\n\+a\n$/)
  assert.deepEqual(userContent([{ type: 'file', mime: 'image/png', url: 'data:image/png;base64,AA' }]), [{ type: 'image', url: 'data:image/png;base64,AA' }])
})

// ------------------------------------------------------------------ models, usage

test('model/list: real providers, default not the free Zen fallback, variants as efforts', async () => {
  const catalog = new ModelCatalog(async () => ({
    providers: [
      { id: 'opencode', name: 'OpenCode Zen', models: { free: { id: 'free', name: 'Free', cost: { input: 0 }, capabilities: { input: { image: false } }, limit: { context: 1000 } } } },
      { id: 'anthropic', name: 'Anthropic', models: { 'claude-x': { id: 'claude-x', name: 'Claude X', variants: { high: {}, max: {} }, capabilities: { input: { image: true, pdf: true } }, limit: { context: 200000 } } } },
    ],
    default: { opencode: 'free', anthropic: 'claude-x' },
  }))
  const models = await catalog.codexModels()
  const claude = models.find((model) => model.id === 'anthropic/claude-x')
  assert.equal(claude.isDefault, true)
  assert.deepEqual(claude.supportedReasoningEfforts.map((effort) => effort.reasoningEffort), ['default', 'high', 'max'])
  assert.equal(claude.defaultReasoningEffort, 'default')
  assert.deepEqual(claude.inputModalities, ['text', 'image', 'pdf'])
  assert.equal(claude.contextWindow, 200000)
  assert.equal(models.find((model) => model.id === 'opencode/free').section, 'overflow')
  assert.equal(await catalog.defaultId('opencode/free'), 'opencode/free')
  assert.equal(variantOf('high', await catalog.entry('anthropic/claude-x')), 'high')
  assert.equal(variantOf('default', await catalog.entry('anthropic/claude-x')), undefined)
  assert.deepEqual(splitModel('openrouter/anthropic/claude'), { providerID: 'openrouter', modelID: 'anthropic/claude' })
})

test('turn errors: provider 4xx answers are not connection problems', () => {
  const info = (statusCode, message = 'x', name = 'APIError') => errorInfoOf({ name, data: { message, statusCode } }).codexErrorInfo
  assert.equal(info(400, 'invalid model id'), 'badRequest')
  assert.equal(info(404, 'model not found'), 'badRequest')
  assert.equal(info(413, 'payload'), 'badRequest')
  assert.equal(info(402, 'insufficient credits'), 'usageLimitExceeded')
  assert.equal(info(401), 'unauthorized')
  assert.equal(info(429), 'rateLimitExceeded')
  assert.equal(info(529, 'Overloaded'), 'serverOverloaded')
  assert.equal(info(500), 'internalServerError')
  assert.deepEqual(info(408), { httpConnectionFailed: { httpStatusCode: 408 } })
  assert.deepEqual(errorInfoOf({ name: 'APIError', data: { message: 'Cannot connect to API: ECONNREFUSED' } }).codexErrorInfo, { httpConnectionFailed: { httpStatusCode: null } })
  assert.deepEqual(errorInfoOf({ name: 'UnknownError', data: { message: 'fetch failed' } }).codexErrorInfo, { httpConnectionFailed: { httpStatusCode: null } })
  assert.equal(errorInfoOf({ name: 'UnknownError', data: { message: 'something odd' } }).codexErrorInfo, 'other')
})

test('credentials: a free tier or a keyless built-in provider is not an account', () => {
  const home = tmp()
  const file = authFile(FLAVORS.mimo, { HOME: home })
  assert.equal(file, path.join(home, '.local/share/mimocode/auth.json'))
  assert.equal(authFile(FLAVORS.opencode, { HOME: home, XDG_DATA_HOME: '/d' }), '/d/opencode/auth.json')
  assert.deepEqual(storedCredentials(file), {})
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ anthropic: { type: 'api', key: 'k' }, xiaomi: { type: 'oauth', refresh: 'r' }, broken: 3 }))
  const stored = storedCredentials(file)
  assert.deepEqual(stored, { anthropic: 'api', xiaomi: 'oauth' })
  const context = { stored: {}, free: FLAVORS.mimo.freeProviders, settings: ['fake'] }
  // MiMo, fresh: xiaomi comes from the built-in config without a key; mimo is the anonymous free tier.
  const xiaomi = { id: 'xiaomi', source: 'config', env: ['XIAOMI_API_KEY'], options: {} }
  const mimo = { id: 'mimo', source: 'config', env: [], options: { apiKey: 'anonymous' } }
  assert.equal(credentialOf(xiaomi, context), null)
  assert.equal(credentialOf(mimo, context), null)
  assert.equal(providerRank(xiaomi, context), 2)
  assert.equal(providerRank(mimo, context), 1)
  assert.equal(credentialOf(xiaomi, { ...context, stored }), 'oauth')
  assert.equal(credentialOf({ ...xiaomi, source: 'env' }, context), 'env')
  // OpenCode Zen: the public key is not a credential; a stored Zen key is.
  const zen = { id: 'opencode', source: 'custom', env: ['OPENCODE_API_KEY'], options: { apiKey: 'public' } }
  assert.equal(credentialOf(zen, { free: FLAVORS.opencode.freeProviders }), null)
  assert.equal(credentialOf(zen, { free: FLAVORS.opencode.freeProviders, stored: { opencode: 'api' } }), 'api')
  // Settings › Models providers, keys in config, and providers that need no key.
  assert.equal(credentialOf({ id: 'fake', source: 'config', options: {} }, context), 'settings')
  assert.equal(credentialOf({ id: 'corp', source: 'config', env: ['CORP_KEY'], options: { apiKey: 'sk-1' } }, context), 'config')
  assert.equal(credentialOf({ id: 'ollama', source: 'config', env: [], options: { baseURL: 'http://127.0.0.1:11434/v1' } }, context), 'none')
})

test('MiMo Auto after its sunset: neither free nor a default, under More models; the ended-API error asks for a sign-in', async () => {
  assert.equal(freeTierActive(FLAVORS.mimo, Date.parse('2026-07-26T09:59:00Z')), true)
  assert.equal(freeTierActive(FLAVORS.mimo, Date.parse('2026-07-26T10:00:00Z')), false)
  assert.equal(freeTierActive(FLAVORS.opencode), true, 'OpenCode Zen has no sunset')
  const context = { stored: {}, free: FLAVORS.mimo.freeProviders, ended: FLAVORS.mimo.freeProviders, settings: [] }
  const catalog = new ModelCatalog(async () => ({
    providers: [
      { id: 'xiaomi', name: 'Xiaomi', source: 'config', env: ['XIAOMI_API_KEY'], options: {}, models: { 'mimo-pro-ultraspeed': { id: 'mimo-pro-ultraspeed', name: 'Pro Ultraspeed', cost: { input: 4 } } } },
      { id: 'mimo', name: 'MiMo', source: 'config', env: [], options: { apiKey: 'anonymous' }, models: { 'mimo-auto': { id: 'mimo-auto', name: 'MiMo Auto', cost: { input: 0 } } } },
    ],
    default: { xiaomi: 'mimo-pro-ultraspeed', mimo: 'mimo-auto' },
  }), { rank: (provider) => providerRank(provider, context) })
  assert.equal(providerRank({ id: 'mimo', source: 'config', env: [], options: { apiKey: 'anonymous' } }, context), 3)
  assert.equal(await catalog.defaultId(), 'xiaomi/mimo-pro-ultraspeed')
  assert.equal((await catalog.codexModels()).find((model) => model.id === 'mimo/mimo-auto').section, 'overflow')
  assert.equal(errorInfoOf({ name: 'Error', message: 'MiMo free API service has ended. Sign in or configure a third-party API.' }).codexErrorInfo, 'unauthorized')
})

test('model/list on a fresh install: the free tier is the default and stays in the main list', async () => {
  const context = { stored: {}, free: FLAVORS.mimo.freeProviders, settings: [] }
  const fresh = new ModelCatalog(async () => ({
    providers: [
      { id: 'xiaomi', name: 'Xiaomi', source: 'config', env: ['XIAOMI_API_KEY'], options: {}, models: { 'mimo-pro-ultraspeed': { id: 'mimo-pro-ultraspeed', name: 'Pro Ultraspeed', cost: { input: 4 } } } },
      { id: 'mimo', name: 'MiMo', source: 'config', env: [], options: { apiKey: 'anonymous' }, models: { 'mimo-auto': { id: 'mimo-auto', name: 'MiMo Auto', cost: { input: 0 } } } },
    ],
    default: { xiaomi: 'mimo-pro-ultraspeed', mimo: 'mimo-auto' },
  }), { rank: (provider) => providerRank(provider, context) })
  assert.equal(await fresh.defaultId(), 'mimo/mimo-auto')
  const models = await fresh.codexModels()
  assert.equal(models.find((model) => model.id === 'mimo/mimo-auto').section, 'main')
  // The keyless provider's models move under More models while something usable exists.
  assert.equal(models.find((model) => model.id === 'xiaomi/mimo-pro-ultraspeed').section, 'overflow')
  // Signed in to xiaomi: its default wins and the free tier moves to More models.
  context.stored = { xiaomi: 'oauth' }
  fresh.invalidate()
  assert.equal(await fresh.defaultId(), 'xiaomi/mimo-pro-ultraspeed')
  const signed = await fresh.codexModels()
  assert.equal(signed.find((model) => model.id === 'mimo/mimo-auto').section, 'overflow')
  assert.equal(signed.find((model) => model.id === 'xiaomi/mimo-pro-ultraspeed').section, 'main')
  // OpenCode, fresh: only Zen's free models; the default (and the rest) stay main.
  const zen = { stored: {}, free: FLAVORS.opencode.freeProviders, settings: [] }
  const opencode = new ModelCatalog(async () => ({
    providers: [{ id: 'opencode', name: 'OpenCode Zen', source: 'custom', env: ['OPENCODE_API_KEY'], options: { apiKey: 'public' }, models: { 'big-pickle': { id: 'big-pickle', name: 'Big Pickle', cost: { input: 0 } }, other: { id: 'other', name: 'Other', cost: { input: 0 } } } }],
    default: { opencode: 'big-pickle' },
  }), { rank: (provider) => providerRank(provider, zen) })
  const zenModels = await opencode.codexModels()
  assert.deepEqual(zenModels.map((model) => [model.id, model.section, model.isDefault]), [['opencode/big-pickle', 'main', true], ['opencode/other', 'main', false]])
})

test('thread store: two bridges on one state folder keep each other\'s changes', () => {
  const dir = tmp()
  const a = new ThreadStore(dir)
  const b = new ThreadStore(dir)
  a.update('t1', { name: 'one', archived: true })
  a.flush()
  b.update('t2', { cwd: '/w' })
  b.update('t1', { lastActivity: 5 })
  b.flush()
  const disk = JSON.parse(fs.readFileSync(path.join(dir, 'threads.json'), 'utf8'))
  assert.deepEqual(disk.t1, { name: 'one', archived: true, lastActivity: 5 })
  assert.deepEqual(disk.t2, { cwd: '/w' })
  // A field removed here is removed on disk; the other process's fields stay.
  a.update('t1', { archived: undefined })
  a.flush()
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'threads.json'), 'utf8')).t1, { name: 'one', lastActivity: 5 })
  // Reads pick up the other process's flush.
  b.refresh(true)
  assert.equal(b.get('t1').archived, undefined)
  assert.equal(b.get('t1').name, 'one')
  b.delete('t2')
  b.flush()
  a.refresh(true)
  assert.deepEqual(a.ids().sort(), ['t1'])
  assert.ok(!fs.existsSync(path.join(dir, 'threads.json.lock')))
  assert.deepEqual(mergeThreads({ x: { a: 1 } }, { x: { b: 2 } }, new Map([['x', 'all']])), { x: { b: 2 } })
})

test('MCP OAuth: the bridge takes the redirect on the agent\'s callback address and completes it once', async () => {
  assert.deepEqual(callbackOf({ type: 'remote', url: 'https://x' }), { ...DEFAULT_CALLBACK, host: '127.0.0.1' })
  assert.deepEqual(callbackOf({ oauth: { callbackPort: 7777 } }), { port: 7777, path: '/mcp/oauth/callback', host: '127.0.0.1' })
  assert.deepEqual(callbackOf({ oauth: { redirectUri: 'http://127.0.0.1:8123/cb' } }), { port: 8123, path: '/cb', host: '127.0.0.1' })
  const callbacks = new OAuthCallbacks({ timeoutMs: 60000 })
  const probe = http.createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  // A port held by another program is reported, not taken.
  await assert.rejects(() => callbacks.listen({ port, host: '127.0.0.1' }), (error) => error.code === 'EADDRINUSE')
  await new Promise((resolve) => probe.close(resolve))
  await callbacks.listen({ port, host: '127.0.0.1' })
  const results = []
  const codes = []
  callbacks.expect({ port, path: '/mcp/oauth/callback', state: 'S1', name: 'linear', complete: async (code) => { codes.push(code); return { success: true } }, done: (result) => results.push(result) })
  const get = async (query) => { const res = await fetch(`http://127.0.0.1:${port}/mcp/oauth/callback?${query}`); return { status: res.status, text: await res.text() } }
  const wrong = await get('code=c&state=OTHER')
  assert.equal(wrong.status, 400)
  assert.match(wrong.text, /expired/)
  const ok = await get('code=abc&state=S1')
  assert.equal(ok.status, 200)
  assert.match(ok.text, /Signed in to linear/)
  assert.deepEqual(codes, ['abc'])
  assert.deepEqual(results, [{ success: true, error: null }])
  // Nothing waits any more: the listener is closed.
  assert.equal(callbacks.listeners.size, 0)
  await assert.rejects(() => fetch(`http://127.0.0.1:${port}/mcp/oauth/callback?code=abc&state=S1`))
  // A denied consent screen reports the provider's error; a new sign-in replaces the earlier one.
  await callbacks.listen({ port, host: '127.0.0.1' })
  callbacks.expect({ port, path: '/mcp/oauth/callback', state: 'A', name: 'notion', complete: async () => ({ success: true }), done: (result) => results.push(result) })
  callbacks.expect({ port, path: '/mcp/oauth/callback', state: 'B', name: 'notion', complete: async () => ({ success: false, error: 'boom' }), done: (result) => results.push(result) })
  assert.equal((await get('code=x&state=A')).status, 400)
  const denied = await get('error=access_denied&error_description=User%20said%20no&state=B')
  assert.match(denied.text, /User said no/)
  assert.deepEqual(results.at(-1), { success: false, error: 'User said no' })
  callbacks.close()
})

test('usage folds: daily buckets, streaks, stats by model and hour', () => {
  const day = new Date(2026, 9, 3, 14, 0).getTime()
  const fold = foldSession([
    { info: { id: 'u1', role: 'user', time: { created: day } }, parts: [] },
    { info: { id: 'a1', role: 'assistant', parentID: 'u1', time: { created: day + 1000, completed: day + 61000 }, providerID: 'p', modelID: 'm', cost: 0.5, tokens: { input: 100, output: 10, reasoning: 5, cache: { read: 20, write: 0 } } }, parts: [{ type: 'tool' }, { type: 'text' }] },
  ])
  const usage = accountUsage([fold], localDayKey(day))
  assert.deepEqual(usage.dailyUsageBuckets, [{ startDate: localDayKey(day), tokens: 135 }])
  assert.equal(usage.summary.lifetimeTokens, 135)
  assert.equal(usage.summary.currentStreakDays, 1)
  assert.equal(usage.summary.longestRunningTurnSec, 61)
  assert.equal(usage.opencode.costUsd, 0.5)
  const stats = codeStats([fold])
  assert.deepEqual(stats.dailyActivity, [{ date: localDayKey(day), messageCount: 2, sessionCount: 1, toolCallCount: 1 }])
  assert.equal(stats.modelUsage['p/m'].cacheReadInputTokens, 20)
  assert.equal(stats.peakActivityHour, 14)
})

// ------------------------------------------------------------------ config overlay

test('config overlay: custom providers by env reference, MCP both ways, skills and plugins, shell per flavor', () => {
  const overlay = providerOverlay([{ route: 'glm', displayName: 'GLM', api: 'anthropic-messages', baseURL: 'https://open.bigmodel.cn/api/anthropic', models: ['glm-5'] }, { route: 'or', api: 'openai-completions', baseURL: 'https://openrouter.ai/api/v1/', models: ['x/y'] }, { route: 'Bad Route', baseURL: 'x' }], { CODE_DESKTOP_PROVIDER_KEY_GLM: 'k' })
  assert.deepEqual(Object.keys(overlay), ['glm', 'or'])
  assert.equal(overlay.glm.npm, '@ai-sdk/anthropic')
  assert.equal(overlay.glm.options.baseURL, 'https://open.bigmodel.cn/api/anthropic/v1')
  assert.equal(overlay.glm.options.apiKey, '{env:CODE_DESKTOP_PROVIDER_KEY_GLM}')
  assert.equal(overlay.or.npm, '@ai-sdk/openai-compatible')
  assert.equal(overlay.or.options.baseURL, 'https://openrouter.ai/api/v1')
  assert.equal(overlay.or.options.apiKey, undefined)
  const local = toOpencodeMcp({ command: 'node', args: ['s.js'], env: { A: 1 } })
  assert.deepEqual(local, { type: 'local', command: ['node', 's.js'], enabled: true, environment: { A: '1' } })
  assert.deepEqual(toCodexMcp(local), { command: 'node', args: ['s.js'], enabled: true, env: { A: '1' } })
  assert.deepEqual(toOpencodeMcp({ url: 'https://m.example/mcp', http_headers: { Authorization: 'Bearer x' } }), { type: 'remote', url: 'https://m.example/mcp', enabled: true, headers: { Authorization: 'Bearer x' } })
  // A pre-registered OAuth client: OpenCode's oauth {clientId, clientSecret, scope}; listing back never shows the secret.
  const sso = toOpencodeMcp({ url: 'https://sso.example/mcp', oauth: { client_id: 'abc', client_secret: 's3cret', scope: 'read write' } })
  assert.deepEqual(sso.oauth, { clientId: 'abc', clientSecret: 's3cret', scope: 'read write' })
  assert.deepEqual(toCodexMcp(sso).oauth, { client_id: 'abc', scope: 'read write' })
  assert.equal(toOpencodeMcp({ url: 'https://sso.example/mcp', oauth: { client_id: ' ' } }).oauth, undefined)
  assert.equal(toOpencodeMcp({ url: 'https://sso.example/mcp', oauth: false }).oauth, false)
  const state = tmp()
  fs.writeFileSync(path.join(state, 'settings.json'), JSON.stringify({ disabledSkills: ['s1'], plugins: { installed: ['a@1', 'b'], disabled: ['b'] } }))
  const opencode = new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: state, env: { HOME: tmp() } })
  opencode.writeMcp({ servers: { mine: local }, disabled: ['theirs'] })
  const config = opencode.overlay()
  assert.equal(config.shell, opencode.shellPath)
  assert.deepEqual(config.permission, { skill: { s1: 'deny' } })
  assert.deepEqual(config.plugin, ['a@1'])
  assert.deepEqual(config.mcp, { mine: local, theirs: { enabled: false } })
  const env = opencode.write()
  assert.equal(env.OPENCODE_CONFIG_DIR, path.join(state, 'config'))
  assert.equal(env.SHELL, opencode.shellPath)
  assert.ok(fs.existsSync(path.join(state, 'config/plugin/code-desktop.js')))
  assert.ok(fs.statSync(opencode.shellPath).mode & 0o100)
  const mimo = new BridgeConfig({ flavor: FLAVORS.mimo, stateDir: tmp(), env: { HOME: tmp() } })
  assert.equal(mimo.overlay().shell, undefined)
  assert.ok(mimo.configPath.endsWith('mimocode.json'))
  assert.equal(mimo.write().MIMOCODE_CONFIG_DIR, path.join(mimo.stateDir, 'config'))
})

test('parseJsonc reads OpenCode config files: comments and trailing commas, strings untouched', () => {
  assert.deepEqual(parseJsonc('{\n  // the shell\n  "shell": "/bin/bash", /* note */\n  "a": "// not, }",\n  "b": [1, 2,],\n}'), { shell: '/bin/bash', a: '// not, }', b: [1, 2] })
  assert.equal(parseJsonc('{ "x": '), null)
  assert.equal(parseJsonc(undefined), null)
})

test('the shell wrapper runs the user\'s own shell: OpenCode `shell` config, else $SHELL, as the agent picks it', () => {
  const home = tmp()
  const bin = path.join(home, 'bin')
  fs.mkdirSync(bin)
  const fake = (name) => { const file = path.join(bin, name); fs.writeFileSync(file, '#!/bin/sh\n', { mode: 0o755 }); return file }
  const myBash = fake('bash')
  fake('fish')
  const config = (env = {}) => new BridgeConfig({ flavor: FLAVORS.opencode, stateDir: path.join(home, 'state'), env: { HOME: home, PATH: bin, ...env } })
  // Nothing configured: the agent's $SHELL, else /bin/zsh.
  assert.equal(config().userShell(), FALLBACK_SHELL)
  assert.equal(config({ SHELL: myBash }).userShell(), myBash)
  // The global config (JSONC, later files win) over $SHELL; a bare name is looked up on PATH.
  fs.mkdirSync(path.join(home, '.config/opencode'), { recursive: true })
  fs.writeFileSync(path.join(home, '.config/opencode/opencode.jsonc'), '{\n  // mine\n  "shell": "bash",\n}\n')
  assert.equal(config({ SHELL: '/bin/sh' }).userShell(), myBash)
  const custom = path.join(home, 'custom.json')
  fs.writeFileSync(custom, JSON.stringify({ shell: '{env:MY_SHELL}' }))
  assert.equal(config({ OPENCODE_CONFIG: custom, MY_SHELL: '/bin/sh' }).userShell(), '/bin/sh')
  // Terminal-only shells (fish, nu) and a missing one fall back to /bin/zsh, as in the agent (its $SHELL is not tried).
  fs.writeFileSync(path.join(home, '.config/opencode/opencode.jsonc'), JSON.stringify({ shell: 'fish' }))
  assert.equal(config({ SHELL: myBash }).userShell(), FALLBACK_SHELL)
  fs.writeFileSync(path.join(home, '.config/opencode/opencode.jsonc'), JSON.stringify({ shell: path.join(bin, 'missing') }))
  assert.equal(config({ SHELL: myBash }).userShell(), FALLBACK_SHELL)
  assert.equal(agentShell({ envShell: 'nu' }), FALLBACK_SHELL)
  // The wrapper is named after that shell (the agent picks bash's arguments and ~/.bashrc by the name) and execs it.
  fs.writeFileSync(path.join(home, '.config/opencode/opencode.jsonc'), JSON.stringify({ shell: myBash }))
  const opencode = config()
  const env = opencode.write()
  assert.equal(env.SHELL, path.join(home, 'state/runtime/shell/bash'))
  assert.equal(opencode.overlay().shell, env.SHELL)
  const wrapper = fs.readFileSync(env.SHELL, 'utf8')
  assert.ok(wrapper.includes(`exec '/usr/bin/sandbox-exec' -p "$profile" '${myBash}' "$@"`), wrapper)
  assert.ok(wrapper.includes(`exec '${myBash}' "$@"; fi`), 'Bypass runs the same shell')
  assert.ok(fs.statSync(env.SHELL).mode & 0o100)
  // The bridge's own wrapper (an inherited $SHELL) never counts as the user's shell.
  fs.rmSync(path.join(home, '.config/opencode/opencode.jsonc'))
  assert.equal(config({ SHELL: env.SHELL }).userShell(), FALLBACK_SHELL)
  // MiMo has no `shell` key: $SHELL only.
  const mimo = new BridgeConfig({ flavor: FLAVORS.mimo, stateDir: path.join(home, 'mimo'), env: { HOME: home, PATH: bin, SHELL: '/bin/sh' } })
  assert.equal(mimo.userShell(), '/bin/sh')
  assert.equal(path.basename(mimo.write().SHELL), 'sh')
})

// ------------------------------------------------------------------ sandbox (real Seatbelt)

test('seatbelt profiles and the shell wrapper confine commands (fails closed)', { skip: process.platform !== 'darwin' }, async () => {
  const { spawnSync } = await import('node:child_process')
  const dir = tmp()
  const work = path.join(dir, 'work')
  fs.mkdirSync(work)
  const outside = path.join(dir, 'outside.txt')
  const wrapper = path.join(dir, 'zsh')
  fs.writeFileSync(wrapper, shellWrapper(), { mode: 0o755 })
  const runIn = (env, file) => spawnSync(wrapper, ['-c', `echo hi > '${file}'`], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' })
  const workspace = seatbeltProfile({ mode: 'workspace-write', roots: [work], network: false })
  assert.match(workspace, /\(deny file-write\*\)/)
  assert.match(workspace, /\(deny network-outbound \(remote ip\)\)/)
  assert.equal(runIn({ CODE_DESKTOP_SANDBOX_PROFILE: workspace }, path.join(work, 'in.txt')).status, 0)
  assert.equal(fs.readFileSync(path.join(work, 'in.txt'), 'utf8'), 'hi\n')
  assert.notEqual(runIn({ CODE_DESKTOP_SANDBOX_PROFILE: workspace }, outside).status, 0)
  assert.equal(fs.existsSync(outside), false)
  // No profile (a shell the plugin did not configure): read-only.
  assert.notEqual(runIn({}, path.join(work, 'closed.txt')).status, 0)
  assert.equal(fs.existsSync(path.join(work, 'closed.txt')), false)
  assert.equal(FAIL_CLOSED_PROFILE, seatbeltProfile({ mode: 'read-only' }))
  // Bypass: no sandbox.
  assert.equal(runIn({ CODE_DESKTOP_SANDBOX: 'none' }, outside).status, 0)
  assert.equal(seatbeltProfile({ mode: 'danger-full-access' }), null)
  assert.doesNotMatch(seatbeltProfile({ mode: 'workspace-write', roots: [work], network: true }), /network/)
  // The user's own shell (here bash) runs inside the same sandbox, with OpenCode's bash arguments.
  const bash = path.join(dir, 'bash')
  fs.writeFileSync(bash, shellWrapper({ shell: '/bin/bash' }), { mode: 0o755 })
  const inBash = spawnSync(bash, ['-l', '-c', 'shopt -s expand_aliases; cd -- "$1"; eval "echo \\$BASH_VERSION > in-bash.txt"', 'opencode', work], { env: { PATH: process.env.PATH, HOME: dir, CODE_DESKTOP_SANDBOX_PROFILE: workspace }, encoding: 'utf8' })
  assert.equal(inBash.status, 0, inBash.stderr)
  assert.match(fs.readFileSync(path.join(work, 'in-bash.txt'), 'utf8'), /^\d+\./)
  assert.notEqual(spawnSync(bash, ['-c', `echo hi > '${outside}'`], { env: { PATH: process.env.PATH, CODE_DESKTOP_SANDBOX_PROFILE: workspace } }).status, 0)
})

// ------------------------------------------------------------------ plugin

test('the generated plugin: custom prompt replaces everything (no catalogs), model params, sandbox env, prompt capture', async () => {
  const state = tmp()
  fs.mkdirSync(path.join(state, 'runtime/sessions'), { recursive: true })
  fs.writeFileSync(path.join(state, 'runtime/sessions/ses_1.json'), JSON.stringify({ root: 'ses_1', cwd: '/w', systemPrompt: 'MINE for {{model}} at {{cwd}} {{unknown}}', instructions: 'PROJECT', modelParams: { 'p/m': { temperature: 0.2, maxTokens: 999 } }, sandbox: { mode: 'workspace-write', roots: ['/w'], network: false } }))
  const file = path.join(state, 'plugin.mjs')
  fs.writeFileSync(file, pluginSource())
  process.env.CODE_DESKTOP_OPENCODE_STATE = state
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  const output = { system: ['You are OpenCode.\n<env>cwd</env>\n<mcp_instructions>\n  <server name="s">use it</server>\n</mcp_instructions>\nSkills provide specialized instructions and workflows.\n<skill>x</skill>'] }
  await hooks['experimental.chat.system.transform']({ sessionID: 'ses_1', model: { id: 'm', providerID: 'p' } }, output)
  assert.equal(output.system.length, 2)
  assert.match(output.system[0], /^MINE for m at \/w \{\{unknown\}\}/)
  assert.doesNotMatch(output.system[0], /You are OpenCode|<env>|<mcp_instructions>|Skills provide specialized instructions/)
  assert.equal(output.system[1], 'PROJECT')
  const captured = JSON.parse(fs.readFileSync(path.join(state, 'runtime/prompts/ses_1.json'), 'utf8'))
  assert.match(captured.default[0], /You are OpenCode/)
  assert.equal(captured.custom, true)
  const params = { temperature: 1, maxOutputTokens: 100, options: {} }
  await hooks['chat.params']({ sessionID: 'ses_1', model: { id: 'm', providerID: 'p' } }, params)
  assert.equal(params.temperature, 0.2)
  assert.equal(params.maxOutputTokens, 999)
  const shell = { env: {} }
  await hooks['shell.env']({ sessionID: 'ses_1', cwd: '/w' }, shell)
  assert.equal(shell.env.CODE_DESKTOP_SANDBOX, 'workspace-write')
  assert.match(shell.env.CODE_DESKTOP_SANDBOX_PROFILE, /subpath "\/w"/)
  assert.equal(keptCatalogs(captured.default[0]).length, 2)
  // An unknown session waits, then falls back to the read-only sandbox.
  const unknown = { env: {} }
  const started = Date.now()
  await hooks['shell.env']({ sessionID: 'ses_unknown' }, unknown)
  assert.ok(Date.now() - started >= 2900)
  assert.equal(unknown.env.CODE_DESKTOP_SANDBOX, 'read-only')
})

// ------------------------------------------------------------------ MCP tool lister

test('MCP tools/list over stdio and streamable HTTP', async () => {
  const dir = tmp()
  const script = path.join(dir, 'echo.cjs')
  fs.writeFileSync(script, `
const rl = require('node:readline').createInterface({ input: process.stdin })
const send = (m) => process.stdout.write(JSON.stringify(m) + '\\n')
rl.on('line', (line) => { const m = JSON.parse(line)
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 's', version: '1' } } })
  else if (m.method === 'tools/list') send({ jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'echo', description: 'Echo', inputSchema: { type: 'object' } }, { name: 'peek', description: 'Peek', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } }, { name: 'wipe', description: 'Wipe', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true, destructiveHint: true } }] } })
})`)
  const cache = new McpToolCache()
  assert.deepEqual(await cache.tools('local', { type: 'local', command: [process.execPath, script] }), [{ name: 'echo', description: 'Echo', readOnly: false }, { name: 'peek', description: 'Peek', readOnly: true }, { name: 'wipe', description: 'Wipe', readOnly: false }])
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const message = JSON.parse(raw)
    if (message.id === undefined) { res.writeHead(202); res.end(); return }
    const result = message.method === 'initialize' ? { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'r', version: '1' } } : { tools: [{ name: 'remote_tool', description: 'Remote' }] }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 'sess-1' })
    res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n\n`)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    assert.deepEqual(await cache.tools('remote', { type: 'remote', url: `http://127.0.0.1:${server.address().port}/mcp` }), [{ name: 'remote_tool', description: 'Remote', readOnly: false }])
  } finally { server.close() }
  assert.deepEqual(await cache.tools('off', { type: 'local', command: ['x'], enabled: false }), [])
})

test('initialize capabilities match the descriptors\' implies', async () => {
  for (const id of ['opencode', 'mimo']) {
    const capabilities = capabilitiesFor(FLAVORS[id])
    const { default: descriptor } = await import(`../../app/electron/cores/${id}.mjs`)
    for (const [key, value] of Object.entries(descriptor.implies)) {
      // List-valued implies (nativeTools) are descriptor-only: main.cjs reads them through coreCapabilities, the bridge never reports them.
      if (Array.isArray(value)) { assert.equal(capabilities[key], undefined, `${id} ${key}`); continue }
      assert.equal(capabilities[key], value, `${id} ${key}`)
    }
    // MiMo's workflow tool projects as item.workflowRun (projection.js mimoWorkflowRun); OpenCode has none.
    assert.equal(capabilities.modelWorkflows, id === 'mimo')
    assert.equal(capabilities.customProviders, true)
    assert.ok(capabilities.unsupportedMethods.includes('thread/rollback'))
    assert.equal(JSON.stringify(descriptor), JSON.stringify(JSON.parse(JSON.stringify(descriptor))))
    assert.ok(descriptor.agent.release.assets.arm64.sha256.length === 64)
    assert.ok(descriptor.brand && descriptor.tagline)
  }
})

// ------------------------------------------------------------------ account/read

function accountBridge(flavor, providers) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  bridge.api = async (method, route) => {
    if (method === 'GET' && route === '/provider') { const value = typeof providers === 'function' ? providers() : providers; if (value instanceof Error) throw value; return value }
    throw new Error(`unexpected ${method} ${route}`)
  }
  const store = (entries) => { fs.mkdirSync(path.join(home, 'data', FLAVORS[flavor].dataDir), { recursive: true }); fs.writeFileSync(path.join(home, 'data', FLAVORS[flavor].dataDir, 'auth.json'), JSON.stringify(entries)) }
  return { bridge, notes, store }
}

test('account/read: a failed provider list is unknown, not signed out, and account/updated follows once it answers', async () => {
  let answer = new Error('server starting')
  const { bridge, notes, store } = accountBridge('opencode', () => answer)
  const cold = await bridge.readAccount()
  assert.equal(cold.account, null)
  assert.equal(cold.requiresOpenaiAuth, false, 'no sign-in card from a provider list that failed')
  assert.equal(cold.opencode.unknown, true)
  // What the auth store holds is still known.
  bridge.accountRetry = null
  store({ openai: { type: 'oauth' } })
  const stored = await bridge.readAccount()
  assert.deepEqual(stored.account, { type: 'chatgpt', email: null, planType: 'ChatGPT Pro/Plus' })
  assert.equal(stored.opencode.canSignOut, true)
  answer = { all: [{ id: 'openai', name: 'OpenAI' }], connected: ['openai'] }
  await new Promise((resolve) => setTimeout(resolve, 1300))
  assert.ok(notes.some((note) => note.method === 'account/updated'), 'the app is told to read the account again')
  const warm = await bridge.readAccount()
  assert.equal(warm.opencode.unknown, false)
  bridge.closed = true
})

test('account/read: another vendor\'s browser sign-in is named, never read as ChatGPT; non-removable keys cannot be signed out', async () => {
  const { bridge, store } = accountBridge('opencode', { all: [{ id: 'github-copilot', name: 'GitHub Copilot' }, { id: 'opencode', name: 'OpenCode Zen' }], connected: ['github-copilot', 'opencode'] })
  store({ 'github-copilot': { type: 'oauth' } })
  const read = await bridge.readAccount()
  assert.deepEqual(read.account, { type: 'chatgpt', email: null, planType: 'GitHub Copilot' })
  assert.equal(read.requiresOpenaiAuth, false)
  assert.equal(read.opencode.freeTier.provider, 'opencode')
  const mimo = accountBridge('mimo', { all: [{ id: 'xiaomi', name: 'Xiaomi' }], connected: ['xiaomi'] })
  mimo.store({ xiaomi: { type: 'oauth' } })
  assert.equal((await mimo.bridge.readAccount()).account.planType, 'Xiaomi MiMo')
  const env = accountBridge('opencode', { all: [{ id: 'anthropic', name: 'Anthropic', source: 'env', env: ['ANTHROPIC_API_KEY'] }], connected: ['anthropic'] })
  const keyed = await env.bridge.readAccount()
  assert.deepEqual(keyed.account, { type: 'apiKey' })
  assert.equal(keyed.opencode.canSignOut, false)
  const message = signOutElsewhere(FLAVORS.opencode, keyed.opencode.providers)
  assert.match(message, /Anthropic reads its key from an environment variable/)
  assert.match(signOutElsewhere(FLAVORS.mimo, [{ name: 'Fake Lab', auth: 'settings' }]), /Settings › Models/)
  assert.match(signOutElsewhere(FLAVORS.opencode, [{ name: 'Local', auth: 'none' }]), /needs no sign-in/)
})

test('capabilities report the side questions every flavor answers', () => {
  for (const flavor of Object.values(FLAVORS)) assert.equal(capabilitiesFor(flavor).sideQuestion, true)
})

// ------------------------------------------------------------------ session grants across mode changes

function grantThread() {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.opencode, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const replies = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => { if (method === 'POST' && /\/reply$/.test(route)) replies.push({ route, ...options?.body }); return {} }
  const thread = new LiveThread(bridge, { info: { id: 'ses_grant', directory: home } })
  thread.emit = () => {}
  const cards = []
  let answer = () => ({ decision: 'acceptForSession' })
  thread.clientRequest = async (method, params) => { cards.push({ method, params }); return answer(method, params) }
  const mode = (permissionMode) => applyPermissionParams(thread.permission, { approvalPolicy: permissionMode === 'ask' ? 'untrusted' : 'on-request', sandboxPolicy: permissionMode === 'plan' ? { type: 'readOnly' } : { type: 'workspaceWrite', writableRoots: [] }, codeDesktop: { permissionMode, afterPlan: 'ask' } })
  return { bridge, thread, cards, replies, mode, setAnswer: (fn) => { answer = fn } }
}

test('isReadOnlyMode / grantScopeChanged: grants depend on the mode, approvals, sandbox and roots', () => {
  assert.ok(isReadOnlyMode('plan') && isReadOnlyMode('chat') && isReadOnlyMode('review') && !isReadOnlyMode('ask'))
  const base = { ...defaultPermission(), mode: 'ask' }
  assert.equal(grantScopeChanged(base, { ...base }), false)
  assert.equal(grantScopeChanged(base, { ...base, afterPlan: 'acceptEdits' }), false)
  assert.equal(grantScopeChanged(base, { ...base, mode: 'plan' }), true)
  assert.equal(grantScopeChanged(base, { ...base, extraRoots: ['/x'] }), true)
})

test('a grant asked for in Plan is neither offered nor recorded, and the tool asks again after the plan is approved', async () => {
  const { thread, cards, mode, setAnswer } = grantThread()
  thread.setPermission(mode('plan'))
  const mcp = { id: 'per_1', sessionID: 'ses_grant', permission: 'github_create_issue', patterns: ['*'], always: ['*'], metadata: {} }
  await thread.onPermission(mcp)
  assert.equal(cards.length, 1)
  assert.equal(cards[0].params.sessionGrantable, false)
  assert.deepEqual(thread.sessionGrants, [])
  // Approve the plan with Ask as the after-plan mode.
  setAnswer((method) => (method === 'item/tool/requestUserInput' ? { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'ask' } } : { decision: 'acceptForSession' }))
  await thread.onQuestion({ id: 'que_1', sessionID: 'ses_grant', questions: [{ header: 'Build Agent', question: 'Plan ready', options: [] }] })
  assert.equal(thread.permission.mode, 'ask')
  await thread.onPermission({ ...mcp, id: 'per_2' })
  assert.equal(cards.filter((card) => card.method === 'item/commandExecution/requestApproval').length, 2, 'the same tool asks again in Ask')
  assert.equal(cards.at(-1).params.sessionGrantable, true)
})

test('session grants are dropped on a mode change, and a card answered across one records none', async () => {
  const { thread, cards, mode, setAnswer } = grantThread()
  thread.setPermission(mode('ask'))
  const mcp = { id: 'per_1', sessionID: 'ses_grant', permission: 'github_create_issue', patterns: ['*'], always: ['*'], metadata: {} }
  await thread.onPermission(mcp)
  assert.equal(thread.sessionGrants.length, 1)
  await thread.onPermission({ ...mcp, id: 'per_2' })
  assert.equal(cards.length, 1, 'granted: no second card')
  thread.setPermission(mode('acceptEdits'))
  assert.deepEqual(thread.sessionGrants, [])
  thread.setPermission(mode('ask'))
  await thread.onPermission({ ...mcp, id: 'per_3' })
  assert.equal(cards.length, 2, 'the grant did not survive the mode change')
  thread.sessionGrants = []
  // The user switches mode while the card is open, then answers "Allow for this session".
  setAnswer(() => { thread.setPermission(mode('acceptEdits')); return { decision: 'acceptForSession' } })
  await thread.onPermission({ ...mcp, id: 'per_4' })
  assert.deepEqual(thread.sessionGrants, [])
})

test('a repeated-call (doom loop) card offers no "Allow for this session" (decide asks again every time), and records no grant', async () => {
  const { thread, cards, mode } = grantThread()
  thread.setPermission(mode('auto'))
  // OpenCode's ask (session/processor.ts): permission doom_loop, patterns and always [tool].
  const doom = { id: 'per_1', sessionID: 'ses_grant', permission: 'doom_loop', patterns: ['bash'], always: ['bash'], metadata: { tool: 'bash', input: { command: 'npm test' } } }
  await thread.onPermission(doom)
  assert.equal(cards.length, 1)
  assert.equal(cards[0].method, 'item/commandExecution/requestApproval')
  assert.equal(cards[0].params.sessionGrantable, false)
  assert.deepEqual(thread.sessionGrants, [])
  // A doom loop on an edit tool comes as a file card: no session grant there either.
  const editPart = { id: 'prt_e', messageID: 'msg_e', sessionID: 'ses_grant', callID: 'call_e', type: 'tool', tool: 'edit', state: { status: 'running', input: { filePath: path.join(thread.cwd, 'a.ts'), oldString: 'a', newString: 'b' } } }
  thread.projector.messages.set('msg_e', { info: { id: 'msg_e', sessionID: 'ses_grant', role: 'assistant', time: { created: 1 } }, parts: [editPart] })
  await thread.onPermission({ ...doom, id: 'per_2', patterns: ['edit'], always: ['edit'], tool: { messageID: 'msg_e', callID: 'call_e' } })
  assert.equal(cards.length, 2)
  assert.equal(cards[1].method, 'item/fileChange/requestApproval')
  assert.equal(cards[1].params.sessionGrantable, false)
  assert.deepEqual(thread.sessionGrants, [])
  // An ordinary ask in the same mode still offers it.
  thread.setPermission(mode('ask'))
  await thread.onPermission({ id: 'per_3', sessionID: 'ses_grant', permission: 'github_create_issue', patterns: ['*'], always: ['*'], metadata: {} })
  assert.equal(cards.at(-1).params.sessionGrantable, true)
})

test('MiMo bash_delete (an irreversible delete) always asks a person, even in Auto; Bypass allows it, read-only modes refuse it, no grant covers it', () => {
  const request = { permission: 'bash_delete', patterns: ['rm -rf junkdir'], always: ['rm *'], metadata: { command: 'rm -rf junkdir', deletes: ['junkdir'] } }
  const options = { tool: 'bash', readTools: FLAVORS.mimo.readTools, cwd: '/w' }
  for (const mode of ['auto', 'acceptEdits', 'ask']) assert.deepEqual(decide({ mode }, request, options), { action: 'ask', reason: 'This command permanently deletes files.' }, mode)
  assert.deepEqual(decide({ mode: 'bypass' }, request, options), { action: 'allow' })
  assert.equal(decide({ mode: 'plan' }, request, options).action, 'reject')
  assert.equal(decide({ mode: 'auto' }, request, { ...options, grants: [{ permission: 'bash_delete', patterns: ['*'] }] }).action, 'ask')
})

test('slash command hints become argument hints', async () => {
  const { commandHint } = await import('../packages/opencode-bridge/src/index.js')
  assert.equal(commandHint(['$ARGUMENTS']), '[arguments]')
  assert.equal(commandHint(['$2', '$1', '$1']), '[arg1] [arg2]')
  assert.equal(commandHint([]), '')
  assert.equal(commandHint(undefined), '')
})

test('OpenCode LSP errors after an edit ride on the fileChange item (codeDesktop.diagnostics)', async () => {
  const { toolItem, diagnosticsOf } = await import('../packages/opencode-bridge/src/projection.js')
  const metadata = { diff: '--- a\n+++ a\n-a\n+b\n', diagnostics: { '/w/a.ts': [
    { severity: 1, message: "Type 'string' is not assignable to type 'number'.", range: { start: { line: 4, character: 2 } } },
    { severity: 2, message: 'unused', range: { start: { line: 1, character: 0 } } },
  ] } }
  assert.deepEqual(diagnosticsOf(metadata), [{ path: '/w/a.ts', line: 5, column: 3, message: "Type 'string' is not assignable to type 'number'." }])
  const item = toolItem({ id: 'p1', callID: 'c1', type: 'tool', tool: 'edit', state: { status: 'completed', input: { filePath: '/w/a.ts', oldString: 'a', newString: 'b' }, output: 'ok', metadata } }, { threadId: 't', cwd: '/w' })
  assert.equal(item.type, 'fileChange')
  assert.equal(item.codeDesktop.diagnostics.length, 1)
  assert.equal(toolItem({ id: 'p2', callID: 'c2', type: 'tool', tool: 'edit', state: { status: 'completed', input: { filePath: '/w/a.ts', oldString: 'a', newString: 'b' }, output: 'ok', metadata: { diff: '' } } }, { threadId: 't', cwd: '/w' }).codeDesktop, undefined)
})

// ------------------------------------------------------------------ round 6: agents, rewind with files, connector sign-out

function stubBridge(flavor, handler) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => { calls.push({ method, route, ...options }); return handler(method, route, options) }
  return { bridge, calls, home }
}

test('the primary agent follows default_agent / a disabled build, and a chosen agent while the folder has it', async () => {
  const agents = [{ name: 'docs', mode: 'primary' }, { name: 'explore', mode: 'subagent' }, { name: 'general', mode: 'subagent' }, { name: 'plan', mode: 'primary' }, { name: 'secret', mode: 'primary', hidden: true }, { name: 'zeta', mode: 'all' }]
  const { bridge } = stubBridge('opencode', (method, route) => { if (method === 'GET' && route === '/agent') return agents; throw new Error(`unexpected ${method} ${route}`) })
  assert.equal(await bridge.primaryAgent('/p'), 'docs', 'no build: the first visible primary agent (OpenCode lists default_agent first)')
  assert.equal(await bridge.primaryAgent('/p', 'zeta'), 'zeta')
  assert.equal(await bridge.primaryAgent('/p', 'explore'), 'docs', 'a sub-agent is never a primary agent')
  assert.equal(await bridge.primaryAgent('/p', 'secret'), 'docs', 'nor a hidden one')
  assert.equal(agentFor({ mode: 'plan' }, 'docs'), 'plan')
  assert.equal(agentFor({ mode: 'auto' }, 'docs'), 'docs')
  assert.equal(agentFor({ mode: 'auto' }), 'build')
  bridge.mergedConfig = async () => ({ agent: { docs: { mode: 'primary' } } })
  const listed = await bridge.agentsList({ cwd: '/p' })
  assert.deepEqual(listed.agents.map((agent) => [agent.name, agent.primary, agent.default]), [['docs', true, true], ['explore', false, false], ['general', false, false], ['plan', true, false], ['zeta', true, false]])
  assert.equal(listed.defaultAgent, 'docs')
  const broken = stubBridge('opencode', () => { throw new Error('down') })
  assert.equal(await broken.bridge.primaryAgent('/p'), 'build')
  assert.equal(capabilitiesFor(FLAVORS.opencode).agentsList, true)
})

test('rewind with restoreFiles runs OpenCode\'s own revert; history only still deletes the messages', async () => {
  for (const restore of [true, false]) {
    const { bridge, calls, home } = stubBridge('opencode', (method, route) => {
      if (method === 'POST' && route.endsWith('/revert')) return { id: 'ses_r', directory: home, revert: { messageID: 'msg_2' } }
      return {}
    })
    const thread = new LiveThread(bridge, { info: { id: 'ses_r', directory: home } })
    thread.emit = () => {}
    thread.reload = async () => {}
    thread.threadObject = () => ({ id: 'ses_r' })
    thread.turns = () => [{ id: 'msg_1', startedMs: 1 }, { id: 'msg_2', startedMs: 2 }]
    thread.projector.ordered = () => [{ info: { id: 'msg_1', time: { created: 1 } } }, { info: { id: 'msg_2', time: { created: 2 } } }, { info: { id: 'msg_3', time: { created: 3 } } }]
    bridge.openThread = async () => thread
    await bridge.revert({ threadId: 'ses_r', beforeTurnId: 'msg_2', ...(restore ? { codeDesktop: { restoreFiles: true } } : {}) })
    if (restore) {
      assert.deepEqual(calls.map((call) => [call.method, call.route, call.body?.messageID]), [['POST', '/session/ses_r/revert', 'msg_2']])
      assert.deepEqual(thread.projector.revert, { messageID: 'msg_2' })
    } else assert.deepEqual(calls.map((call) => [call.method, call.route]), [['DELETE', '/session/ses_r/message/msg_3'], ['DELETE', '/session/ses_r/message/msg_2']])
  }
  for (const id of ['opencode', 'mimo']) {
    const capabilities = capabilitiesFor(FLAVORS[id])
    assert.equal(capabilities.rewindFiles, true)
    assert.equal(capabilities.forkCwd, false, '/cd is hidden: a session keeps its folder')
    assert.equal(capabilities.mcpLogout, true)
  }
})

test('connector sign-out removes OpenCode\'s stored sign-in and disconnects it in every loaded folder', async () => {
  const { bridge, calls } = stubBridge('opencode', () => ({}))
  bridge.loadedDirectories = () => ['/a', '/b']
  bridge.refreshMcpNames = async () => {}
  await bridge.mcpLogout({ name: 'linear', cwd: '/a' })
  assert.deepEqual(calls.map((call) => [call.method, call.route, call.directory]), [['DELETE', '/mcp/linear/auth', '/a'], ['POST', '/mcp/linear/disconnect', '/a'], ['POST', '/mcp/linear/disconnect', '/b']])
  await assert.rejects(bridge.mcpLogout({}), /name is required/)
})

test('core settings: MiMo telemetry opt-out and compaction/memory switches, OpenCode web search', async () => {
  const { coreSettingDefs, coreSettingsConfig, coreSettingsEnv, coreSettingsView, storedCoreSettings } = await import('../packages/opencode-bridge/src/core-settings.js')
  const settings = { coreSettings: { 'privacy.usageStatisticsEnabled': false, 'compaction.max_context': 300000, 'dream.auto': true, 'bogus': 1, 'compaction.auto': 'x' } }
  assert.deepEqual(coreSettingsEnv(settings, FLAVORS.mimo), { MIMOCODE_ENABLE_ANALYSIS: 'false' })
  assert.deepEqual(coreSettingsConfig(settings, FLAVORS.mimo), { compaction: { max_context: 300000 }, dream: { auto: true } })
  const view = coreSettingsView(coreSettingDefs(FLAVORS.mimo), storedCoreSettings(settings, FLAVORS.mimo))
  assert.equal(view.find((row) => row.key === 'compaction.auto').value, null, 'an invalid stored value reads as the default')
  assert.deepEqual(coreSettingsEnv({ coreSettings: { 'websearch.enabled': true } }, FLAVORS.opencode), { OPENCODE_ENABLE_EXA: '1' })
  assert.deepEqual(coreSettingsEnv({}, FLAVORS.opencode), {})
  // Through the bridge: written to its own settings.json, the env reaches serverEnv and the overlay gets the config keys.
  const { bridge } = stubBridge('mimo', () => ({}))
  bridge.restartServer = async () => true
  bridge.reloadConfig = async () => true
  await bridge.coreSettingsWrite({ key: 'privacy.usageStatisticsEnabled', value: false })
  assert.equal(bridge.serverEnv().MIMOCODE_ENABLE_ANALYSIS, 'false')
  await bridge.coreSettingsWrite({ key: 'memory.disable_write', value: true })
  assert.equal(bridge.config.overlay().memory.disable_write, true)
  const read = bridge.coreSettingsRead()
  assert.equal(read.settings.find((row) => row.key === 'memory.disable_write').value, true)
  await bridge.coreSettingsWrite({ key: 'memory.disable_write', value: null })
  assert.equal(bridge.config.overlay().memory, undefined)
  await assert.rejects(bridge.coreSettingsWrite({ key: 'nope', value: true }), /Unknown setting/)
  await assert.rejects(bridge.coreSettingsWrite({ key: 'compaction.max_context', value: -5 }), /Invalid value/)
  assert.equal(capabilitiesFor(FLAVORS.mimo).coreSettings, true)
})

test('sign-in: GitHub Copilot\'s device code starts with its select default, prompt inputs reach authorize', async () => {
  assert.deepEqual(loginInputs({ deploymentType: ' enterprise ', 'bad key': 'x', enterpriseUrl: 'co.ghe.com', empty: '  ', long: 'x'.repeat(600), n: 3 }), { deploymentType: 'enterprise', enterpriseUrl: 'co.ghe.com' })
  const copilot = [{ type: 'oauth', label: 'Login with GitHub Copilot', prompts: [{ type: 'select', key: 'deploymentType' }, { type: 'text', key: 'enterpriseUrl', when: { key: 'deploymentType', op: 'eq', value: 'enterprise' } }] }]
  const gitlab = [{ type: 'oauth', label: 'GitLab OAuth', prompts: [{ type: 'text', key: 'instanceUrl' }] }]
  const { bridge, calls } = stubBridge('opencode', (method, route, options) => {
    if (route === '/provider/auth') return { 'github-copilot': copilot, gitlab }
    if (route.endsWith('/oauth/authorize')) return { url: 'https://github.com/login/device', instructions: 'Enter code: ABCD-1234', method: 'auto' }
    if (route.endsWith('/oauth/callback')) return new Promise(() => {})
    return {}
  })
  const started = await bridge.loginStart({ type: 'chatgptDeviceCode', codeDesktop: { provider: 'github-copilot' } })
  assert.equal(started.type, 'chatgptDeviceCode')
  assert.equal(started.userCode, 'ABCD-1234')
  assert.deepEqual(calls.find((call) => call.route.endsWith('/oauth/authorize')).body, { method: 0 })
  await bridge.loginStart({ type: 'chatgptDeviceCode', codeDesktop: { provider: 'github-copilot', inputs: { deploymentType: 'enterprise', enterpriseUrl: 'co.ghe.com' } } })
  assert.deepEqual(calls.filter((call) => call.route.endsWith('/oauth/authorize')).at(-1).body, { method: 0, inputs: { deploymentType: 'enterprise', enterpriseUrl: 'co.ghe.com' } })
  await assert.rejects(bridge.loginStart({ type: 'chatgpt', codeDesktop: { provider: 'gitlab' } }), /no browser sign-in/)
  for (const entry of bridge.logins.values()) entry.controller.abort()
})
