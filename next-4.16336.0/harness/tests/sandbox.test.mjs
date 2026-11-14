import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import CodeDesktopFileSystem from '../packages/codex-app-server/src/sandbox-fs.js'
import CodeDesktopSandbox from '../packages/codex-app-server/src/sandbox-shell.js'
import CodeDesktopApproval from '../packages/codex-app-server/src/sandbox-approval.js'

test('OpenClaude Desktop fs enforces read-only and re-resolves symlinks before a workspace write', async () => {
  // Outside platform temp: workspace-write intentionally allows temporary roots.
  const root = await mkdtemp(new URL('../../work/.cd-sandbox-', import.meta.url).pathname)
  try {
    const workspace = join(root, 'workspace'), outside = join(root, 'outside')
    await mkdir(workspace); await mkdir(outside)
    const ctx = new Context()
    const policy = { mode: 'workspace-write', workspaceRoot: workspace }
    ctx.provide('sandboxPolicy', { defaultMode: policy.mode, resolve: () => policy })
    const fs = new CodeDesktopFileSystem(ctx, { cwd: workspace, diffBasisMaxBytes: 1024 * 1024 })
    const target = await fs.resolve(join(workspace, 'a.txt'))
    await fs.writeText(target, 'before', undefined, undefined, policy)
    await assert.rejects(fs.writeText(target, 'after', undefined, undefined, { ...policy, mode: 'read-only' }), { code: 'FS_SANDBOX_DENIED' })
    assert.equal(await readFile(join(workspace, 'a.txt'), 'utf8'), 'before')
    await symlink(outside, join(workspace, 'link'))
    const linked = await fs.resolve(join(workspace, 'link', 'a.txt'))
    await assert.rejects(fs.writeText(linked, 'outside', undefined, undefined, policy), { code: 'FS_SANDBOX_DENIED' })
    await fs.writeText(linked, 'outside', undefined, undefined, { ...policy, mode: 'danger-full-access' })
    assert.equal(await readFile(join(outside, 'a.txt'), 'utf8'), 'outside')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('OpenClaude Desktop shell wraps the real command with a denying Seatbelt profile and fails closed', async () => {
  const sandbox = Object.create(CodeDesktopSandbox.prototype)
  sandbox.selectRunner = () => ({ runner: 'seatbelt', enforcement: 'full' })
  sandbox.seatbeltExec = () => '/usr/bin/sandbox-exec'
  const policy = { mode: 'read-only', workspaceRoot: tmpdir() }
  const confined = await sandbox.confine(['bash', '-c', 'touch a'], policy)
  assert.equal(confined.argv[0], '/usr/bin/sandbox-exec')
  assert.match(confined.argv[2], /\(deny file-write\*\)/)
  assert.doesNotMatch(confined.argv[2], /subpath/)
  assert.deepEqual(confined.argv.slice(-4), ['--', 'bash', '-c', 'touch a'])
  assert.deepEqual(confined.denialSignatures, ['operation not permitted'])
  sandbox.selectRunner = () => { throw new Error('no usable runner') }
  await assert.rejects(sandbox.confine(['bash', '-c', 'true'], policy), /no usable runner/)
})

const approval = (outcome, policy = 'ask') => {
  const service = Object.create(CodeDesktopApproval.prototype)
  service.ctx = { waterfall: async () => typeof outcome === 'function' ? outcome() : outcome }
  service.config = { policy }
  const events = [{ type: 'turn/start', data: { turn: 1 } }]
  const session = { get seq() { return events.length }, eventAt: (seq) => events[seq], append: (type, data) => events.push({ type, data }) }
  return { service, events, req: { agent: { session }, callId: 'call', toolName: 'write', reason: 'escalate sandbox to danger-full-access: test' } }
}

test('OpenClaude Desktop approvals reject never, absent, throwing and invalid answerers even with Purge escalation', async () => {
  for (const [outcome, policy, expected] of [['allowed-once', 'never', 'rejected'], ['unavailable', 'ask', 'unavailable'], ['invalid', 'ask', 'unavailable'], [() => { throw new Error('no UI') }, 'ask', 'unavailable'], ['rejected', 'ask', 'rejected']]) {
    const { service, events, req } = approval(outcome, policy)
    await assert.rejects(service.request(req), new RegExp(expected))
    assert.equal(events.at(-1).type, 'approval/decided')
    assert.equal(events.at(-1).data.outcome, expected)
    assert.equal(events.at(-2).data.id, events.at(-1).data.id)
  }
  const { service, req } = approval('allowed-once')
  assert.equal(await service.request(req), 'allowed-once')
})

test('OpenClaude Desktop approvals retain ordinary denial and cancellation outcomes', async () => {
  const { service, req } = approval('rejected')
  assert.equal(await service.request({ ...req, reason: 'Ask mode: confirm write' }), 'rejected')
  const controller = new AbortController()
  const pending = approval(() => new Promise(() => {}))
  const result = pending.service.request({ ...pending.req, signal: controller.signal })
  controller.abort()
  await assert.rejects(result, /cancelled/)
})
