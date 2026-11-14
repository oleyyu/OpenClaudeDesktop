import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { READ_ONLY_TOOLS, SessionGrants, acceptsEdit, applyPermissions, approvalAnswer, approvalDecision, canonicalTarget, childApproval, childDecision, escalationModeOf, extraRootsOf, grantKeyFor, livePermissions, preExecuteDecision, presetFor, presetTarget, reasonFor, rootThreadFor, sessionGrantable, updatePermission, withinRoots, writesInsideRoots } from '../packages/codex-app-server/src/approval.js'
import { toolItem } from '../packages/codex-app-server/src/projection.js'

// dsh-sandbox approveEscalation's request text (lib/index.js:105-113).
const escalation = (mode, why) => ({
  toolName: 'write', callId: 'c1',
  reason: `escalate sandbox to ${mode}: ${why}`,
  displayReason: { en: `Allow this operation with ${mode} permissions: ${why}`, zh: `允许本次操作使用 ${mode} 权限：${why}` },
})
// The bridge's own Ask-mode ask (index.js tools/pre-execute).
const ask = { toolName: 'write', callId: 'c1', reason: 'Ask mode: confirm write', displayReason: { en: 'Ask permissions mode is on.' } }
const fileItem = (...paths) => ({ type: 'fileChange', id: 'c1', changes: paths.map((path) => ({ path, kind: { type: 'add' }, diff: '' })), status: 'inProgress' })
const bash = (command) => ({ type: 'commandExecution', id: 'c1', command, cwd: '/w' })
const dynamic = (tool, args) => ({ type: 'dynamicToolCall', id: 'c1', tool, arguments: args })
// A write call as the approval hook sees it: the projected item plus the raw
// arguments (projection.js toolItem resolves a relative file_path against cwd).
const writeCall = (file_path, cwd) => {
  const args = { file_path, content: 'x' }
  return { item: toolItem({ callId: 'c1', name: 'write', args, cwd }), args, cwd }
}

test('escalationModeOf reads the sandbox reason, then the English display text', () => {
  assert.equal(escalationModeOf(escalation('danger-full-access', 'x')), 'danger-full-access')
  assert.equal(escalationModeOf({ displayReason: { en: 'Allow this operation with workspace-write permissions: y' } }), 'workspace-write')
  assert.equal(escalationModeOf(ask), null)
  assert.equal(escalationModeOf({}), null)
})

test('grant keys: an Ask file grant never answers an escalation; tool grants ignore arguments', () => {
  const askFile = grantKeyFor({ origin: 'ask', toolName: 'write', item: fileItem('/w/a.txt') })
  assert.equal(askFile, 'ask:file')
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'edit', item: fileItem('/w/b.txt') }), askFile)
  for (const mode of ['workspace-write', 'danger-full-access', null]) {
    assert.notEqual(grantKeyFor({ origin: 'escalation', toolName: 'write', item: fileItem('/w/a.txt'), mode }), askFile)
    assert.notEqual(grantKeyFor({ origin: 'escalation', toolName: 'bash', item: bash('ls'), mode }), grantKeyFor({ origin: 'ask', toolName: 'bash', item: bash('ls') }))
  }
  // The same tool with different arguments shares one Ask grant (source per-tool always-allow).
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'subagent', item: dynamic('subagent', { prompt: 'a' }) }), 'ask:tool:subagent')
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'subagent', item: dynamic('subagent', { prompt: 'b' }) }), 'ask:tool:subagent')
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'mcp__s__t', item: { type: 'mcpToolCall', server: 's', tool: 't' } }), 'ask:tool:mcp__s__t')
  // Commands stay exact.
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'bash', item: bash('npm test') }), 'ask:command:npm test')
  assert.notEqual(grantKeyFor({ origin: 'ask', toolName: 'bash', item: bash('npm test') }), grantKeyFor({ origin: 'ask', toolName: 'bash', item: bash('rm -rf x') }))
  // Escalations are scoped by mode and exact command / sorted file set.
  assert.equal(grantKeyFor({ origin: 'escalation', toolName: 'bash', item: bash('touch /x'), mode: 'danger-full-access' }), 'escalate:danger-full-access:command:/w\0touch /x')
  assert.notEqual(grantKeyFor({ origin: 'escalation', toolName: 'bash', item: bash('touch /x'), mode: 'workspace-write' }), 'escalate:danger-full-access:command:/w\0touch /x')
  // ... and by the command's working directory: `rm -rf build` elsewhere is another call.
  assert.notEqual(grantKeyFor({ origin: 'escalation', toolName: 'bash', item: { ...bash('rm -rf build'), cwd: '/other' }, mode: 'danger-full-access' }),
    grantKeyFor({ origin: 'escalation', toolName: 'bash', item: bash('rm -rf build'), mode: 'danger-full-access' }))
  assert.equal(grantKeyFor({ origin: 'escalation', toolName: 'write', item: fileItem('/b', '/a'), mode: 'workspace-write' }), 'escalate:workspace-write:file:/a|/b')
  assert.equal(grantKeyFor({ origin: 'escalation', toolName: 'job_kill', item: dynamic('job_kill', {}), mode: 'workspace-write' }), 'escalate:workspace-write:tool:job_kill')
  // No item (the projector never saw the call): nothing to remember.
  assert.equal(grantKeyFor({ origin: 'ask', toolName: 'bash', item: undefined }), null)
})

test('full-access (or unnamed) file escalations are never grantable for the session', () => {
  assert.equal(sessionGrantable({ origin: 'escalation', mode: 'danger-full-access', item: fileItem('/x') }), false)
  assert.equal(sessionGrantable({ origin: 'escalation', mode: null, item: fileItem('/x') }), false)
  assert.equal(sessionGrantable({ origin: 'escalation', mode: 'workspace-write', item: fileItem('/x') }), true)
  assert.equal(sessionGrantable({ origin: 'escalation', mode: 'danger-full-access', item: bash('touch /x') }), true)
  assert.equal(sessionGrantable({ origin: 'ask', mode: null, item: fileItem('/x') }), true)
  assert.equal(sessionGrantable({ origin: 'ask', mode: null, item: undefined }), false)
})

test('reasonFor: English justification after the mode, never zh; Ask-mode asks have none', () => {
  const request = { displayReason: { en: 'Allow this operation with danger-full-access permissions: write /x', zh: '允许本次操作使用 danger-full-access 权限：write /x' }, reason: 'escalate sandbox to danger-full-access' }
  assert.equal(reasonFor(request, 'escalation'), 'Needs danger-full-access: write /x')
  assert.equal(reasonFor(request, 'ask'), null)
  assert.equal(reasonFor(ask, 'ask'), null)
  assert.equal(reasonFor(escalation('workspace-write', 'save the report'), 'escalation'), 'Needs workspace-write: save the report')
  // Only the raw reason: its own lede goes too.
  assert.equal(reasonFor({ reason: 'escalate sandbox to danger-full-access: edit ~/.zshrc' }, 'escalation'), 'Needs danger-full-access: edit ~/.zshrc')
  assert.equal(reasonFor({ displayReason: { zh: '只有中文' } }, 'escalation'), null)
  assert.equal(reasonFor({ reason: 'Some other asker' }, 'escalation'), 'Some other asker')
  assert.equal(reasonFor({ reason: 'escalate sandbox to danger-full-access: ' }, 'escalation'), 'Needs danger-full-access')
})

test('withinRoots: equal or below a root; traversal and sibling prefixes are outside', () => {
  assert.equal(withinRoots('/x/extra/a.txt', ['/x/extra']), true)
  assert.equal(withinRoots('/x/extra', ['/x/extra']), true)
  assert.equal(withinRoots('/x/extra/', ['/x/extra']), true)
  assert.equal(withinRoots('/x/extra2/a', ['/x/extra']), false)
  assert.equal(withinRoots('/x/extra/../etc/p', ['/x/extra']), false)
  assert.equal(withinRoots('/a/bc', ['/a/b']), false)
  assert.equal(withinRoots('/a/b/c', ['/z', '/a/b/']), true)
  assert.equal(withinRoots('relative/a', ['/x']), false)
  assert.equal(withinRoots('/x/a', []), false)
})

test('extra roots: canonical, without cwd; writes inside them pass, symlinks out and commands do not', async () => {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'cd-approval-')))
  try {
    const cwd = path.join(base, 'project'), extra = path.join(base, 'extra'), outside = path.join(base, 'outside')
    for (const dir of [cwd, extra, outside]) await mkdir(dir)
    await symlink(outside, path.join(extra, 'escape'))
    await symlink(extra, path.join(base, 'extra-link'))
    await writeFile(path.join(outside, 'secret'), '')
    // The app sends [cwd, ...additional folders]; a symlinked spelling resolves.
    const roots = await extraRootsOf([cwd, path.join(base, 'extra-link'), 'relative', 7, path.join(base, 'missing')], cwd)
    assert.deepEqual(roots, [extra, path.join(base, 'missing')])
    assert.deepEqual(await extraRootsOf(undefined, cwd), [])

    assert.equal(await canonicalTarget(path.join(extra, 'new', 'deep.txt')), path.join(extra, 'new', 'deep.txt'))
    assert.equal(await canonicalTarget(path.join(extra, 'escape', 'secret')), path.join(outside, 'secret'))
    assert.equal(await canonicalTarget('relative/a'), null)

    assert.equal(await writesInsideRoots(writeCall(path.join(extra, 'a.txt'), cwd), roots), true)
    assert.equal(await writesInsideRoots(writeCall(path.join(base, 'extra-link', 'a.txt'), cwd), roots), true)
    assert.equal(await writesInsideRoots(writeCall(path.join(extra, 'escape', 'secret'), cwd), roots), false)
    assert.equal(await writesInsideRoots(writeCall(path.join(extra, '..', 'outside', 'x'), cwd), roots), false)
    assert.equal(await writesInsideRoots(writeCall(path.join(cwd, 'a.txt'), cwd), roots), false)
    // A relative path resolves against cwd, which is not an extra root here.
    assert.equal(await writesInsideRoots(writeCall('relative.txt', cwd), roots), false)
    assert.equal(await writesInsideRoots(writeCall('relative.txt', undefined), roots), false)
    assert.equal(await writesInsideRoots(writeCall(path.join(extra, 'a.txt'), cwd), []), false)
    // The item must be the call's one file: another path, a move or no change at all asks.
    const { item, args } = writeCall(path.join(extra, 'a.txt'), cwd)
    assert.equal(await writesInsideRoots({ item: fileItem(path.join(extra, 'a.txt'), path.join(outside, 'b.txt')), args, cwd }, roots), false)
    assert.equal(await writesInsideRoots({ item: { ...item, changes: [{ ...item.changes[0], kind: { type: 'update', move_path: path.join(outside, 'b') } }] }, args, cwd }, roots), false)
    assert.equal(await writesInsideRoots({ item: fileItem(), args, cwd }, roots), false)
    assert.equal(await writesInsideRoots({ item, args: {}, cwd }, roots), false)
    assert.equal(await writesInsideRoots({ item, args: { file_path: '  ' }, cwd }, roots), false)
    // Bash escalations always ask, even when the command names a path inside a root.
    assert.equal(await writesInsideRoots({ item: bash(`touch ${path.join(extra, 'a.txt')}`), args: { command: `touch ${path.join(extra, 'a.txt')}` }, cwd }, roots), false)
    assert.equal(await writesInsideRoots(undefined, roots), false)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test('extra roots: a `..` after a symlink is resolved as Harness resolves it, never by text', async () => {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'cd-approval-')))
  try {
    const extra = path.join(base, 'extra'), outside = path.join(base, 'outside'), project = path.join(base, 'p'), cwd = path.join(project, 'app')
    for (const dir of [extra, path.join(outside, 'deep'), cwd]) await mkdir(dir, { recursive: true })
    await symlink(path.join(outside, 'deep'), path.join(extra, 'link'))
    await symlink(outside, path.join(cwd, 'esc'))

    // Built by concatenation: path.join would collapse `link/..` before the check.
    const climbing = extra + '/link/../secret.txt'
    assert.equal(await canonicalTarget(climbing), path.join(outside, 'secret.txt'))
    assert.equal(await canonicalTarget(extra + '/missing/../x'), null)
    assert.equal(await writesInsideRoots(writeCall(climbing, path.join(base, 'elsewhere')), [extra]), false)
    // The user added a parent of cwd; the model planted cwd/esc -> outside and
    // writes `esc/../evil`. The projected item reads cwd/evil (inside the root);
    // Harness writes outside/evil.
    const relative = writeCall('esc/../evil', cwd)
    assert.equal(relative.item.changes[0].path, path.join(cwd, 'evil'))
    assert.equal(await writesInsideRoots(relative, [project]), false)
    // Without a `..` the same layout still passes, relative or absolute.
    assert.equal(await writesInsideRoots(writeCall('sub/new.txt', cwd), [project]), true)
    assert.equal(await writesInsideRoots(writeCall(cwd + '/./sub/new.txt', cwd), [project]), true)
    // A `..` that stays inside the root asks too: the spelling alone decides.
    assert.equal(await writesInsideRoots(writeCall(extra + '/a/../b.txt', cwd), [extra]), false)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test('presetTarget and SessionGrants: escalation grants are dropped when the preset changes', () => {
  assert.equal(presetTarget({ approvalPolicy: 'on-request', sandbox: 'workspace-write' }), 'workspace-write')
  assert.equal(presetTarget({ approvalPolicy: 'never', sandbox: 'danger-full-access' }), 'danger-full-access')
  assert.equal(presetTarget({ approvalPolicy: 'on-request', sandbox: 'danger-full-access' }), 'workspace-write')
  assert.equal(presetTarget({ approvalPolicy: 'on-request', sandbox: 'read-only' }), 'read-only')
  assert.equal(presetTarget({ approvalPolicy: 'on-request', sandbox: undefined }), undefined)

  const grants = new SessionGrants()
  grants.presetApplied('workspace-write')
  grants.add('ask:file')
  grants.add('escalate:danger-full-access:command:touch /x')
  grants.add(null)
  assert.equal(grants.size, 2)
  assert.equal(grants.has(null), false)
  grants.presetApplied('workspace-write') // re-applied every turn: no change
  assert.equal(grants.has('escalate:danger-full-access:command:touch /x'), true)
  grants.presetApplied('read-only')
  assert.equal(grants.has('escalate:danger-full-access:command:touch /x'), false)
  assert.equal(grants.has('ask:file'), true)
  grants.add('escalate:workspace-write:file:/w/a')
  grants.presetApplied('workspace-write')
  assert.equal(grants.has('escalate:workspace-write:file:/w/a'), false)
  assert.equal(grants.size, 1)
})

// The index.js approval/request hook and applyPermissions, minus stdio: a
// thread's permission, grants and Ask-mode record driven through the helpers
// it calls, in the order it calls them.
test('approvalDecision: origin, Plan refusal, extra-root writes, session grants', async () => {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'cd-approval-')))
  try {
    const cwd = path.join(base, 'project'), extra = path.join(base, 'extra')
    for (const dir of [cwd, extra]) await mkdir(dir)
    const thread = { askedCalls: new Set(), permission: { approvalPolicy: 'on-request', sandbox: 'workspace-write', extraRoots: [extra] }, grants: new SessionGrants(), cwd }
    const decide = (request, call) => approvalDecision({ request, askedCalls: thread.askedCalls, permission: thread.permission, grants: thread.grants, cwd, ...call })
    const inside = writeCall(path.join(extra, 'a.txt'), cwd)

    // Ask mode asked about c1 (pre-execute); the sandbox then escalates the same call.
    thread.askedCalls.add('c1')
    const asked = await decide(ask, inside)
    assert.deepEqual(asked, { kind: 'ask', origin: 'ask', mode: null, reason: null, grantKey: 'ask:file', grantable: true })
    assert.equal(thread.askedCalls.size, 0)
    assert.deepEqual(await decide(escalation('danger-full-access', 'outside cwd'), inside), { kind: 'allow', origin: 'escalation', via: 'extra-root' })

    // Only a recognised sandbox escalation is answered silently: another asker's ask shows its card.
    const other = await decide({ toolName: 'write', callId: 'c1', reason: 'hook: confirm this write' }, inside)
    assert.equal(other.kind, 'ask')
    assert.equal(other.reason, 'hook: confirm this write')
    // A write outside the roots, or one that climbs out with `..`, asks without a session grant.
    const climbing = writeCall(extra + '/sub/../../outside.txt', cwd)
    const outside = await decide(escalation('danger-full-access', 'outside cwd'), climbing)
    assert.equal(outside.kind, 'ask')
    assert.equal(outside.reason, 'Needs danger-full-access: outside cwd')
    assert.equal(outside.grantable, false)

    // Bash escalations ask; "Allow for this session" then answers the same command in the same cwd.
    const touch = { item: bash(`touch ${path.join(extra, 'b')}`), args: { command: `touch ${path.join(extra, 'b')}` } }
    const card = await decide({ ...escalation('danger-full-access', 'touch'), toolName: 'bash' }, touch)
    assert.equal(card.kind, 'ask')
    assert.deepEqual(approvalAnswer('acceptForSession', card, thread.grants), { answer: 'allowed-once', interrupt: false })
    assert.deepEqual(await decide({ ...escalation('danger-full-access', 'touch'), toolName: 'bash' }, touch), { kind: 'allow', origin: 'escalation', via: 'session-grant' })
    // An Ask-mode grant for the same command is a different key.
    thread.askedCalls.add('c1')
    assert.equal((await decide({ ...ask, toolName: 'bash' }, touch)).kind, 'ask')

    // Plan refuses without a card, and still consumes the Ask-mode record.
    thread.permission.mode = 'plan'
    thread.askedCalls.add('c1')
    assert.deepEqual(await decide(escalation('workspace-write', 'x'), inside), { kind: 'reject', origin: 'ask' })
    assert.equal(thread.askedCalls.size, 0)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test('approvalAnswer: session grants only when offered; cancel also interrupts', () => {
  const grants = new SessionGrants()
  assert.deepEqual(approvalAnswer('accept', { grantKey: 'ask:file', grantable: true }, grants), { answer: 'allowed-once', interrupt: false })
  assert.equal(grants.size, 0)
  assert.deepEqual(approvalAnswer('acceptForSession', { grantKey: 'escalate:danger-full-access:file:/x', grantable: false }, grants), { answer: 'allowed-once', interrupt: false })
  assert.equal(grants.size, 0)
  approvalAnswer('acceptForSession', { grantKey: 'ask:file', grantable: true }, grants)
  assert.equal(grants.has('ask:file'), true)
  assert.deepEqual(approvalAnswer({ acceptWithExecpolicyAmendment: { execpolicy_amendment: [] } }, { grantKey: null, grantable: false }, grants), { answer: 'allowed-once', interrupt: false })
  assert.deepEqual(approvalAnswer('decline', { grantKey: 'ask:file', grantable: true }, grants), { answer: 'rejected', interrupt: false })
  assert.deepEqual(approvalAnswer('cancel', { grantKey: 'ask:file', grantable: true }, grants), { answer: 'rejected', interrupt: true })
  assert.deepEqual(approvalAnswer(undefined, { grantKey: 'ask:file', grantable: true }, grants), { answer: 'rejected', interrupt: false })
  assert.deepEqual(approvalAnswer(null, { grantKey: 'ask:file', grantable: true }, grants), { answer: 'rejected', interrupt: false })
})

test('updatePermission + presetFor: extra roots per turn; Auto -> Plan -> Auto drops escalation grants', async () => {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'cd-approval-')))
  try {
    const cwd = path.join(base, 'project'), extra = path.join(base, 'extra')
    for (const dir of [cwd, extra]) await mkdir(dir)
    const thread = { askedCalls: new Set(), permission: { approvalPolicy: 'on-request', sandbox: 'workspace-write', mode: undefined, afterPlan: 'auto', extraRoots: [] }, grants: new SessionGrants() }
    // applyPermissions: updatePermission, then applyPreset's presetFor.
    const applyPermissions = async (params) => {
      const hinted = await updatePermission(thread.permission, params, cwd)
      return { hinted, preset: presetFor(thread.permission, thread.grants) }
    }
    const turn = (permissionMode, sandboxPolicy, approvalPolicy = 'on-request') => ({ approvalPolicy, sandboxPolicy, codeDesktop: { permissionMode, afterPlan: 'auto' } })
    const autoTurn = turn('auto', { type: 'workspaceWrite', writableRoots: [cwd, extra], networkAccess: false })
    const touch = { item: bash('touch /etc/x'), args: { command: 'touch /etc/x' }, cwd }
    const touchRequest = { ...escalation('danger-full-access', 'touch'), toolName: 'bash' }
    const decide = () => approvalDecision({ request: touchRequest, askedCalls: thread.askedCalls, permission: thread.permission, grants: thread.grants, ...touch })

    // thread/start: a bare mode, no hint, no roots.
    assert.deepEqual(await applyPermissions({ approvalPolicy: 'on-request', sandbox: 'workspace-write' }), { hinted: false, preset: 'workspace-write' })
    assert.deepEqual(thread.permission.extraRoots, [])
    // An Auto turn brings the added folder.
    assert.deepEqual(await applyPermissions(autoTurn), { hinted: true, preset: 'workspace-write' })
    assert.deepEqual(thread.permission.extraRoots, [extra])
    assert.equal(thread.permission.mode, 'auto')
    approvalAnswer('acceptForSession', await decide(), thread.grants)
    thread.grants.add('ask:file')
    assert.equal((await decide()).kind, 'allow')
    // A bare resume keeps the roots; the next Auto turn keeps the grant.
    await applyPermissions({ sandbox: 'workspace-write' })
    assert.deepEqual(thread.permission.extraRoots, [extra])
    await applyPermissions(autoTurn)
    assert.equal((await decide()).kind, 'allow')

    // Plan: read-only, no roots, escalations refused; the escalation grant is gone.
    assert.deepEqual(await applyPermissions(turn('plan', { type: 'readOnly' })), { hinted: true, preset: 'read-only' })
    assert.deepEqual(thread.permission.extraRoots, [])
    assert.equal((await decide()).kind, 'reject')
    // Back to Auto: the roots return, the command asks again, the Ask grant stays.
    await applyPermissions(autoTurn)
    assert.deepEqual(thread.permission.extraRoots, [extra])
    const again = await decide()
    assert.equal(again.kind, 'ask')
    assert.equal(again.grantKey, `escalate:danger-full-access:command:/w\0touch /etc/x`)
    assert.equal(thread.grants.has('ask:file'), true)

    // Bypass: full-access preset, no roots; a later Auto drops grants made under it.
    assert.deepEqual(await applyPermissions(turn('bypass', { type: 'dangerFullAccess' }, 'never')), { hinted: true, preset: 'danger-full-access' })
    assert.deepEqual(thread.permission.extraRoots, [])
    thread.grants.add('escalate:danger-full-access:tool:job_kill')
    await applyPermissions(autoTurn)
    assert.equal(thread.grants.has('escalate:danger-full-access:tool:job_kill'), false)
    // Unhinted (Codex-shaped) requests leave the mode alone.
    assert.equal(await updatePermission(thread.permission, { approvalPolicy: 'untrusted' }, cwd), false)
    assert.equal(thread.permission.mode, 'auto')
    assert.equal(thread.permission.approvalPolicy, 'untrusted')
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

// A live agent as the hooks see it: only its session header matters here.
const agentWith = (header) => ({ session: { header } })

test('rootThreadFor walks sub-agent parents up to a live root thread', () => {
  const root = { id: 'root' }
  const threads = new Map([['root', root]])
  const headers = new Map([['child', { origin: 'subagent', parentSession: 'root' }], ['lost', { origin: 'subagent', parentSession: 'gone' }]])
  const headerOf = (id) => headers.get(id)
  assert.equal(rootThreadFor(agentWith({ origin: 'subagent', parentSession: 'root' }), threads, headerOf), root)
  // Two levels: grandchild → child → root.
  assert.equal(rootThreadFor(agentWith({ origin: 'subagent', parentSession: 'child' }), threads, headerOf), root)
  assert.equal(rootThreadFor(agentWith({ origin: 'subagent', parentSession: 'lost' }), threads, headerOf), undefined)
  assert.equal(rootThreadFor(agentWith({ origin: 'subagent', parentSession: 'unknown' }), threads), undefined)
  // A fork the user made is not a sub-agent of the thread it came from; no agent, no root.
  assert.equal(rootThreadFor(agentWith({ parentSession: 'root' }), threads, headerOf), undefined)
  assert.equal(rootThreadFor(undefined, threads, headerOf), undefined)
  // A parent cycle stops at the depth cap.
  const loop = new Map([['a', { origin: 'subagent', parentSession: 'b' }], ['b', { origin: 'subagent', parentSession: 'a' }]])
  assert.equal(rootThreadFor(agentWith({ origin: 'subagent', parentSession: 'a' }), threads, (id) => loop.get(id)), undefined)
})

test('Accept edits: workspace write/edit runs without the Ask card; bash, other tools and outside paths still ask', async () => {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'cd-accept-')))
  try {
    const cwd = path.join(base, 'project'), extra = path.join(base, 'extra'), outside = path.join(base, 'outside')
    for (const dir of [cwd, extra, outside]) await mkdir(dir)
    await symlink(outside, path.join(cwd, 'escape'))
    const permission = { approvalPolicy: 'untrusted', sandbox: 'workspace-write', mode: 'acceptEdits', afterPlan: 'auto', extraRoots: [extra] }
    const gate = (toolName, args, overrides = {}) => preExecuteDecision({ permission: { ...permission, ...overrides }, toolName, args, cwd })
    // Inside cwd (absolute or relative, new or existing) and inside an extra root: no card.
    assert.equal(await gate('write', { file_path: path.join(cwd, 'src', 'new.ts'), content: 'x' }), 'next')
    assert.equal(await gate('edit', { file_path: 'src/app.ts', old_string: 'a', new_string: 'b' }), 'next')
    assert.equal(await gate('write', { file_path: path.join(extra, 'notes.md'), content: 'x' }), 'next')
    // Outside the workspace, through a symlink out of it, or with a `..`: the Ask card.
    assert.equal(await gate('write', { file_path: path.join(outside, 'a.txt'), content: 'x' }), 'ask')
    assert.equal(await gate('write', { file_path: path.join(cwd, 'escape', 'a.txt'), content: 'x' }), 'ask')
    assert.equal(await gate('edit', { file_path: '../outside/a.txt', old_string: 'a', new_string: 'b' }), 'ask')
    assert.equal(await gate('write', { content: 'x' }), 'ask')
    // Commands and every other mutating tool keep asking; read-only tools never ask.
    assert.equal(await gate('bash', { command: `touch ${path.join(cwd, 'a.txt')}` }), 'ask')
    assert.equal(await gate('subagent', { description: 'x', prompt: 'y' }), 'ask')
    assert.equal(await gate('read', { file_path: path.join(outside, 'a.txt') }), 'next')
    // Manual (hint 'ask') asks for the same edit; Auto/Bypass never gate here.
    assert.equal(await gate('write', { file_path: path.join(cwd, 'a.txt'), content: 'x' }, { mode: 'ask' }), 'ask')
    assert.equal(await gate('write', { file_path: path.join(cwd, 'a.txt'), content: 'x' }, { mode: undefined }), 'ask')
    assert.equal(await gate('bash', { command: 'rm -rf x' }, { approvalPolicy: 'on-request', mode: 'auto' }), 'next')
    // A sub-agent's edit is checked against the root's workspace, resolved from its own cwd.
    assert.equal(await acceptsEdit({ permission, toolName: 'edit', args: { file_path: 'a.ts' }, cwd: path.join(cwd, 'sub'), root: cwd }), true)
    assert.equal(await acceptsEdit({ permission, toolName: 'edit', args: { file_path: 'a.ts' }, cwd: outside, root: cwd }), false)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test('index.js gates its Ask-mode pre-execute through preExecuteDecision and a child edit through acceptsEdit', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../packages/codex-app-server/src/index.js', import.meta.url), 'utf8')
  const hook = source.slice(source.indexOf("ctx.on('tools/pre-execute'"), source.indexOf("ctx.on('approval/request'"))
  assert.match(hook, /preExecuteDecision\(\{ permission: thread\.permission, toolName: exec\.name, args: parseArguments\(exec\.arguments\), cwd: thread\.cwd \}\)/)
  assert.match(hook, /root\.permission\.mode !== 'acceptEdits'/)
  assert.match(hook, /acceptsEdit\(\{ permission: root\.permission, toolName: exec\.name, args: parseArguments\(exec\.arguments\), cwd, root: root\.cwd \}\)/)
  // A failing path check asks rather than letting the call through.
  assert.match(hook, /\.catch\(\(\) => 'ask'\)/)
  assert.match(hook, /\.catch\(\(\) => false\)/)
})

test('updatePermission records the acceptEdits hint with untrusted + workspace-write', async () => {
  const permission = { approvalPolicy: 'on-request', sandbox: 'workspace-write', mode: undefined, afterPlan: 'auto', extraRoots: [] }
  assert.equal(await updatePermission(permission, { approvalPolicy: 'untrusted', sandbox: 'workspace-write', codeDesktop: { permissionMode: 'acceptEdits', afterPlan: 'auto' } }, '/w', async (p) => p), true)
  assert.deepEqual({ ...permission, extraRoots: undefined }, { approvalPolicy: 'untrusted', sandbox: 'workspace-write', mode: 'acceptEdits', afterPlan: 'auto', extraRoots: undefined })
  assert.equal(presetTarget(permission), 'workspace-write')
})

test('childDecision asks the client for mutating child calls under an Ask-mode root only', () => {
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'bash' }), 'ask-client')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'write' }), 'ask-client')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'subagent' }), 'ask-client')
  assert.equal(childDecision({ rootPolicy: 'on-request', toolName: 'bash' }), 'next')
  assert.equal(childDecision({ rootPolicy: 'never', toolName: 'bash' }), 'next')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'read' }), 'next')
  for (const tool of READ_ONLY_TOOLS) assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: tool }), 'next')
  // A child's report to its parent changes nothing.
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'send_message' }), 'next')
})

test('childApproval puts the child call on the root card, by its own call id', () => {
  const grants = new SessionGrants()
  const base = { threadId: 'root', turnId: 'turn-r', cwd: '/w', grants, now: 5 }
  const bashArgs = { command: 'rm -rf build', description: 'Clean' }
  const bashItem = toolItem({ callId: 'cc1', name: 'bash', args: bashArgs, cwd: '/w' })
  const command = childApproval({ ...base, callId: 'cc1', toolName: 'bash', args: bashArgs, item: bashItem, label: 'Audit deps' })
  assert.equal(command.method, 'item/commandExecution/requestApproval')
  assert.deepEqual(command.params, {
    kind: 'command', threadId: 'root', turnId: 'turn-r', itemId: 'cc1', startedAtMs: 5, reason: 'Requested by the “Audit deps” agent.', sessionGrantable: true,
    approvalId: null, environmentId: null, command: 'rm -rf build', cwd: '/w', commandActions: [{ type: 'unknown', command: 'rm -rf build' }],
  })
  const writeArgs = { file_path: 'notes.txt', content: 'x' }
  const file = childApproval({ ...base, callId: 'cc2', toolName: 'write', args: writeArgs, item: toolItem({ callId: 'cc2', name: 'write', args: writeArgs, cwd: '/w' }), label: null })
  assert.equal(file.method, 'item/fileChange/requestApproval')
  assert.equal(file.params.reason, 'Requested by a sub-agent.'); assert.equal(file.params.itemId, 'cc2')
  assert.deepEqual(file.params.changes, [{ path: '/w/notes.txt', kind: { type: 'add' }, diff: 'x' }])
  const other = childApproval({ ...base, callId: 'cc3', toolName: 'set_goal', args: { goal: 'g' }, item: toolItem({ callId: 'cc3', name: 'set_goal', args: { goal: 'g' } }) })
  assert.equal(other.params.command, 'set_goal {"goal":"g"}'); assert.equal(other.params.cwd, '/w')
  // "Allow for this session" on the root answers the same child call without a card.
  approvalAnswer('acceptForSession', command, grants)
  assert.deepEqual(childApproval({ ...base, callId: 'cc4', toolName: 'bash', args: bashArgs, item: { ...bashItem, id: 'cc4' } }), { kind: 'allow', grantKey: 'ask:command:rm -rf build' })
  assert.equal(childApproval({ ...base, callId: 'cc5', toolName: 'bash', args: {}, item: undefined }).params.sessionGrantable, false)
})

// OpenClaude Desktop F05: Mode stays usable during a turn. codeDesktop/thread/permissions (index.js → livePermissions)
// hands turn/start's permission params to applyPermissions for a loaded thread only; initialize advertises it.
test('codeDesktop/thread/permissions applies a running Mode change to loaded threads only', async () => {
  // A live thread mid-turn as index.js holds it, with the planMode and permissionPresets services.
  const calls = []
  const session = { id: 's1' }
  const thread = { id: 't1', cwd: '/w', agent: { session, status: 'running' }, closing: null, sessionGrants: new SessionGrants(),
    permission: { approvalPolicy: 'on-request', sandbox: 'workspace-write', extraRoots: [], mode: 'auto', afterPlan: 'auto' } }
  let preset = 'workspace-write'
  const services = {
    planMode: { set: (agent, on) => calls.push(['planMode', agent === thread.agent, on]) },
    presets: { current: (s) => (s === session ? preset : undefined), set: async (s, target) => { calls.push(['preset', s === session, target]); preset = target } },
    warn: (message) => calls.push(['warn', message]),
  }
  const resolveReal = async (p) => p
  const apply = (live, params) => applyPermissions(live, params, services, resolveReal)
  // turn/start's params (permission-policy.mjs turnPermissionParams) for each mode.
  const turnParams = (approvalPolicy, sandboxPolicy, permissionMode) => ({ threadId: 't1', approvalPolicy, sandboxPolicy, codeDesktop: { permissionMode, afterPlan: 'auto' } })
  const workspace = { type: 'workspaceWrite', writableRoots: ['/w', '/extra'], networkAccess: false }

  // Auto → Manual: later tool calls ask (pre-execute reads approvalPolicy); the preset is already right.
  assert.deepEqual(await livePermissions(thread, turnParams('untrusted', workspace, 'ask'), apply), { applied: true })
  assert.equal(thread.permission.approvalPolicy, 'untrusted'); assert.equal(thread.permission.mode, 'ask'); assert.deepEqual(thread.permission.extraRoots, ['/extra'])
  assert.deepEqual(calls, [['planMode', true, false]])
  // Manual → Plan: plan mode on (from the next step) and the read-only preset switched at once.
  calls.length = 0
  assert.deepEqual(await livePermissions(thread, turnParams('on-request', { type: 'readOnly', networkAccess: false }, 'plan'), apply), { applied: true })
  assert.deepEqual(calls, [['planMode', true, true], ['preset', true, 'read-only']])
  assert.equal(thread.permission.sandbox, 'read-only'); assert.deepEqual(thread.permission.extraRoots, [])
  // Plan → Auto: plan mode off, back to workspace-write.
  calls.length = 0
  await livePermissions(thread, turnParams('on-request', workspace, 'auto'), apply)
  assert.deepEqual(calls, [['planMode', true, false], ['preset', true, 'workspace-write']])
  // A failed restriction must fail the request instead of retaining wider access.
  calls.length = 0
  const failing = { ...services, presets: { current: () => 'workspace-write', set: async () => { throw new Error('busy') } } }
  await assert.rejects(livePermissions(thread, turnParams('on-request', { type: 'readOnly' }, 'plan'), (live, params) => applyPermissions(live, params, failing, resolveReal)), /busy/)
  assert.deepEqual(calls.at(-1), ['warn', 'permission preset read-only failed'])
  await assert.rejects(applyPermissions(thread, {}, {}, resolveReal), /permission presets are unavailable/)

  // Not loaded, or unloading: nothing is applied; the next turn/start or thread/resume carries the mode.
  let applied = 0
  const counting = async () => { applied++ }
  assert.deepEqual(await livePermissions(undefined, turnParams('untrusted', workspace, 'ask'), counting), { applied: false })
  assert.deepEqual(await livePermissions({ ...thread, closing: Promise.resolve() }, turnParams('untrusted', workspace, 'ask'), counting), { applied: false })
  assert.equal(applied, 0)

  // index.js routes the request through livePermissions with its loaded threads (no openThread) and lists the capability.
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../packages/codex-app-server/src/index.js', import.meta.url), 'utf8')
  const start = source.indexOf("case 'codeDesktop/thread/permissions'")
  const body = source.slice(start, source.indexOf('case ', start + 10))
  assert.match(body, /return livePermissions\(threads\.get\(requireId\(params\.threadId\)\), params, applyPermissions\)/)
  assert.doesNotMatch(body, /openThread/)
  assert.match(source, /const CAPABILITIES = \{[^}]*livePermissions: true/)
})

test('never rejects escalations before extra roots and remembered grants', async () => {
  const grants = new SessionGrants()
  grants.add('escalate:danger-full-access:file:/extra/a')
  const result = await approvalDecision({
    request: { callId: 'write', toolName: 'write', reason: 'escalate sandbox to danger-full-access: write a file' },
    askedCalls: new Set(), permission: { approvalPolicy: 'never', sandbox: 'read-only', extraRoots: ['/extra'] },
    item: { type: 'fileChange', changes: [{ path: '/extra/a' }] }, args: { file_path: '/extra/a' }, cwd: '/w', grants,
  })
  assert.deepEqual(result, { kind: 'reject', origin: 'escalation' })
})
