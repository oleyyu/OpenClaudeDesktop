// Windows runs shell commands unconfined (sandbox-shell.js), so a read-only session's pwsh/bash call must ask (or be
// refused where nobody can be asked) instead of running with neither a sandbox nor a card. Run with an injected
// platform: nothing is spawned, and macOS keeps its Seatbelt path and its old decisions.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SessionGrants, UNSANDBOXED_READ_ONLY_REASON, approvalDecision, remotePathArgument, childDecision, preExecuteDecision, unsandboxedReadOnly } from '../packages/codex-app-server/src/approval.js'
import { threadPermissionParams } from '../../app/electron/permission-policy.mjs'

const resolveReal = async (path) => path
// The bridge's thread.permission for one app Mode on the hinted DeepSeek core (permission-policy.mjs).
const permissionFor = (options) => {
  const params = threadPermissionParams({ hints: true, ...options })
  return { approvalPolicy: params.approvalPolicy, sandbox: params.sandbox, mode: params.codeDesktop.permissionMode, afterPlan: 'auto', extraRoots: [] }
}
const READ_ONLY_SESSIONS = {
  Plan: permissionFor({ permission: 'plan' }),
  Chat: permissionFor({ permission: 'auto', mode: 'chat' }),
  'review turn': { approvalPolicy: 'on-request', sandbox: 'read-only', mode: 'review', afterPlan: 'auto', extraRoots: [] },
}

test('unsandboxedReadOnly: only a Windows shell command in a read-only sandbox', () => {
  for (const toolName of ['pwsh', 'bash']) assert.equal(unsandboxedReadOnly({ platform: 'win32', sandbox: 'read-only', toolName }), true)
  assert.equal(unsandboxedReadOnly({ platform: 'darwin', sandbox: 'read-only', toolName: 'pwsh' }), false)
  assert.equal(unsandboxedReadOnly({ platform: 'linux', sandbox: 'read-only', toolName: 'bash' }), false)
  for (const sandbox of ['workspace-write', 'danger-full-access', undefined]) assert.equal(unsandboxedReadOnly({ platform: 'win32', sandbox, toolName: 'pwsh' }), false)
  for (const toolName of ['read', 'grep', 'write', 'edit', 'mcp__code_desktop__reveal_path']) assert.equal(unsandboxedReadOnly({ platform: 'win32', sandbox: 'read-only', toolName }), false)
})

test('the app Modes that are read-only hand the bridge a read-only sandbox without an Ask-mode policy', () => {
  for (const [label, permission] of Object.entries(READ_ONLY_SESSIONS)) {
    assert.equal(permission.sandbox, 'read-only', label)
    assert.notEqual(permission.approvalPolicy, 'untrusted', label)
  }
})

for (const [label, permission] of Object.entries(READ_ONLY_SESSIONS)) test(`${label} on Windows: a pwsh call asks, and the card is shown, not refused`, async () => {
  const args = { command: 'Remove-Item -Recurse src', description: 'delete' }
  assert.equal(await preExecuteDecision({ permission, toolName: 'pwsh', args, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'ask')
  // The file tools and reads are unchanged (sandbox-fs.js keeps their fence).
  assert.equal(await preExecuteDecision({ permission, toolName: 'read', args: { file_path: 'a' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'next')
  assert.equal(await preExecuteDecision({ permission, toolName: 'write', args: { file_path: 'a' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'next')

  // The pre-execute ask (askedCalls) reaches a card even in Plan / review, with its reason line.
  const askedCalls = new Set(['c1'])
  const item = { type: 'commandExecution', command: args.command, cwd: 'C:\\ws' }
  const decision = await approvalDecision({ request: { callId: 'c1', toolName: 'pwsh' }, askedCalls, permission, item, args, cwd: 'C:\\ws', grants: new SessionGrants(), platform: 'win32' }, resolveReal)
  assert.equal(decision.kind, 'ask')
  assert.equal(decision.origin, 'ask')
  assert.equal(decision.reason, UNSANDBOXED_READ_ONLY_REASON)
  assert.equal(askedCalls.has('c1'), false)

  // A sandbox escalation is still refused in Plan / review (and a pwsh Harness asks about without the bridge's ask).
  const escalation = await approvalDecision({ request: { callId: 'c2', toolName: 'pwsh', reason: 'escalate sandbox to workspace-write: x' }, askedCalls: new Set(), permission, item, args, cwd: 'C:\\ws', grants: new SessionGrants(), platform: 'win32' }, resolveReal)
  if (permission.mode === 'plan' || permission.mode === 'review') assert.equal(escalation.kind, 'reject')
})

test('a read-only session that never asks (workflow agents: approvalPolicy never) refuses the Windows pwsh call', async () => {
  const permission = { approvalPolicy: 'never', sandbox: 'read-only', mode: undefined, afterPlan: 'auto', extraRoots: [] }
  assert.equal(await preExecuteDecision({ permission, toolName: 'pwsh', args: { command: 'Set-Content a b' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'deny')
  assert.equal(await preExecuteDecision({ permission, toolName: 'read', args: {}, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'next')
  // Even a stray pre-execute record is not turned into a card under 'never'.
  const decision = await approvalDecision({ request: { callId: 'c1', toolName: 'pwsh' }, askedCalls: new Set(['c1']), permission, grants: new SessionGrants(), platform: 'win32' }, resolveReal)
  assert.equal(decision.kind, 'reject')
})

test('a sub-agent\'s Windows pwsh call in a read-only sandbox asks on its root, or is refused without one that asks', () => {
  for (const rootPolicy of ['on-request', 'untrusted']) assert.equal(childDecision({ rootPolicy, toolName: 'pwsh', platform: 'win32', sandbox: 'read-only' }), 'ask-client')
  assert.equal(childDecision({ rootPolicy: 'never', toolName: 'pwsh', platform: 'win32', sandbox: 'read-only' }), 'deny')
  assert.equal(childDecision({ rootPolicy: undefined, toolName: 'pwsh', platform: 'win32', sandbox: 'read-only' }), 'deny')
  // Its reads stay quiet; workspace-write keeps the old rule (Auto root: no card).
  assert.equal(childDecision({ rootPolicy: 'on-request', toolName: 'read', platform: 'win32', sandbox: 'read-only' }), 'next')
  assert.equal(childDecision({ rootPolicy: 'on-request', toolName: 'pwsh', platform: 'win32', sandbox: 'workspace-write' }), 'next')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'pwsh', platform: 'win32', sandbox: 'workspace-write' }), 'ask-client')
})

test('macOS keeps its decisions: the read-only Seatbelt sandbox is the guard, no extra card', async () => {
  for (const [label, permission] of Object.entries(READ_ONLY_SESSIONS)) {
    assert.equal(await preExecuteDecision({ permission, toolName: 'bash', args: { command: 'rm -rf src' }, cwd: '/ws', platform: 'darwin' }, resolveReal), 'next', label)
    const decision = await approvalDecision({ request: { callId: 'c1', toolName: 'bash' }, askedCalls: new Set(['c1']), permission, grants: new SessionGrants(), platform: 'darwin' }, resolveReal)
    if (permission.mode === 'plan' || permission.mode === 'review') assert.equal(decision.kind, 'reject', label)
  }
  const never = { approvalPolicy: 'never', sandbox: 'read-only', extraRoots: [] }
  assert.equal(await preExecuteDecision({ permission: never, toolName: 'bash', args: {}, cwd: '/ws', platform: 'darwin' }, resolveReal), 'next')
  for (const rootPolicy of ['on-request', 'never', undefined]) assert.equal(childDecision({ rootPolicy, toolName: 'bash', platform: 'darwin', sandbox: 'read-only' }), 'next')
})

test('Windows workspace-write is unchanged: Auto runs commands without a card, Ask still asks', async () => {
  const auto = permissionFor({ permission: 'auto' })
  const ask = permissionFor({ permission: 'ask' })
  const acceptEdits = permissionFor({ permission: 'acceptEdits' })
  assert.equal(auto.sandbox, 'workspace-write')
  assert.equal(await preExecuteDecision({ permission: auto, toolName: 'pwsh', args: { command: 'npm test' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'next')
  assert.equal(await preExecuteDecision({ permission: ask, toolName: 'pwsh', args: { command: 'npm test' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'ask')
  assert.equal(await preExecuteDecision({ permission: acceptEdits, toolName: 'pwsh', args: { command: 'npm test' }, cwd: 'C:\\ws', platform: 'win32' }, resolveReal), 'ask')
  const decision = await approvalDecision({ request: { callId: 'c1', toolName: 'pwsh' }, askedCalls: new Set(['c1']), permission: ask, grants: new SessionGrants(), platform: 'win32' }, resolveReal)
  assert.equal(decision.kind, 'ask')
  assert.equal(decision.reason, null, 'the ordinary Ask-mode card, no read-only reason')
})

test('index.js wires the read-only shell gate into tools/pre-execute for root threads and sub-agents', async () => {
  const source = await readFile(new URL('../packages/codex-app-server/src/index.js', import.meta.url), 'utf8')
  const hook = source.slice(source.indexOf("ctx.on('tools/pre-execute'"), source.indexOf("ctx.on('approval/request'"))
  // The root thread: no early next() for a non-Ask policy when the call is unconfined, and 'deny' becomes a refusal.
  assert.match(hook, /if \(thread\.permission\.approvalPolicy !== 'untrusted' && !unconfined\) return next\(\)/)
  assert.match(hook, /gate === 'deny' \? \{ kind: 'deny', reason: UNSANDBOXED_READ_ONLY_REFUSAL \}/)
  // A sub-agent: the gate runs before the no-root shortcut, so a child without a live root is refused too.
  assert.match(hook, /childDecision\(\{ rootPolicy: root\?\.permission\.approvalPolicy, toolName: exec\.name, \.\.\.shell \}\)/)
  assert.ok(hook.indexOf("if (gate === 'deny')") < hook.indexOf("if (!root || gate !== 'ask-client') return next()"))
  // The platform comes from the sandbox provider (sandbox-shell.js, internals.platform in tests); the approval card's
  // decision gets the same platform.
  assert.match(source, /ctx\.get\('sandbox'\)\?\.platform \?\? process\.platform/)
  assert.match(source, /platform: shellPlatform\(\),/)
})

test('remotePathArgument: a Windows file tool call naming a UNC or device path is refused before it is resolved', () => {
  for (const value of ['\\\\attacker.com\\s\\x.png', '//attacker/s/x', '\\\\?\\UNC\\host\\s\\x', '\\\\.\\pipe\\x', '\\/host/s', ' \\\\host\\s']) {
    assert.equal(remotePathArgument({ toolName: 'read', args: { file_path: value }, cwd: 'C:\\ws', platform: 'win32' }), value, value)
  }
  assert.ok(remotePathArgument({ toolName: 'grep', args: { pattern: 'x', path: '\\\\h\\s' }, cwd: 'C:\\ws', platform: 'win32' }))
  assert.ok(remotePathArgument({ toolName: 'glob', args: { pattern: '\\\\h\\s\\**' }, cwd: 'C:\\ws', platform: 'win32' }))
  assert.ok(remotePathArgument({ toolName: 'write', args: { file_path: '//h/s/a' }, cwd: 'C:\\ws', platform: 'win32' }))
  // A grep regex may start with an escaped backslash; local and relative paths pass.
  assert.equal(remotePathArgument({ toolName: 'grep', args: { pattern: '\\\\server' }, cwd: 'C:\\ws', platform: 'win32' }), null)
  for (const file_path of ['C:\\ws\\a.txt', 'a.txt', '\\Windows\\x', 'C:/ws/a']) assert.equal(remotePathArgument({ toolName: 'read', args: { file_path }, cwd: 'C:\\ws', platform: 'win32' }), null, file_path)
  // A session folder on a share keeps its own files; another share is still refused.
  assert.equal(remotePathArgument({ toolName: 'read', args: { file_path: '\\\\nas\\team\\ws\\a.txt' }, cwd: '\\\\NAS\\team\\ws', platform: 'win32' }), null)
  assert.ok(remotePathArgument({ toolName: 'read', args: { file_path: '\\\\nas\\team\\other\\a.txt' }, cwd: '\\\\nas\\team\\ws', platform: 'win32' }))
  // Other tools and other hosts: untouched ("//x" is "/x" on macOS).
  assert.equal(remotePathArgument({ toolName: 'pwsh', args: { command: 'type \\\\h\\s\\x' }, platform: 'win32' }), null)
  assert.equal(remotePathArgument({ toolName: 'read', args: { file_path: '//etc/hosts' }, cwd: '/ws', platform: 'darwin' }), null)
})

test('index.js refuses a Windows file tool UNC path in tools/pre-execute, for root threads and sub-agents alike', async () => {
  const source = await readFile(new URL('../packages/codex-app-server/src/index.js', import.meta.url), 'utf8')
  const hook = source.slice(source.indexOf("ctx.on('tools/pre-execute'"), source.indexOf("ctx.on('approval/request'"))
  const check = hook.indexOf('remotePathArgument(')
  assert.ok(check > 0 && check < hook.indexOf('if (!thread) {'), 'before the root / sub-agent split')
  assert.match(hook, /return Promise\.resolve\(\{ kind: 'deny', reason: REMOTE_PATH_REFUSAL \}\)/)
})
