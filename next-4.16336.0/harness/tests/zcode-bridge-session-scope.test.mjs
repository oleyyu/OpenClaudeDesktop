// ZCode bridge: what a session keeps when OpenClaude Desktop's own tools join it (the project's MCP servers and each server's
// settings), and the background work that must outlive leaving the session or an MCP refresh (LiveProjector).
// End to end against the real ZCode agent: tests/zcode-bridge-smoke.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as catalog from '../packages/zcode-bridge/src/catalog.js'
import { LiveProjector } from '../packages/zcode-bridge/src/live.js'

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zcb-scope-')))
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)) }

test('effectiveMcpServers: project servers from the worktree root down, shadowed by the user’s, as ZCode merges them', () => {
  const repo = tmp()
  fs.mkdirSync(path.join(repo, '.git'))
  const pkg = path.join(repo, 'pkg')
  write(path.join(repo, 'zcode.json'), { mcp: { servers: { rootmcp: { command: 'node', args: ['tools/mcp.js'] }, shared: { command: 'root-version' } } } })
  write(path.join(repo, '.zcode', 'config.json'), { mcp: { servers: { shared: { type: 'stdio', command: 'root-dotzcode' } } } })
  write(path.join(pkg, '.zcode', 'config.json'), { mcp: { servers: { projmcp: { type: 'stdio', command: 'fake-mcp', cwd: 'sub' }, shared: { command: 'pkg-version' }, remote: { type: 'remote', url: 'http://127.0.0.1:9/mcp', http_headers: { a: 'b' } }, broken: { type: 'stdio' } } } })
  const user = { mcp: { servers: { shared: { command: 'user-version' }, slow: { command: 'slow', timeoutMs: 300000, protocolVersion: 'legacy' }, off: { command: 'x', enable: false } } } }
  const servers = catalog.effectiveMcpServers(user, pkg)
  assert.deepEqual(Object.keys(servers).sort(), ['off', 'projmcp', 'remote', 'rootmcp', 'shared', 'slow'])
  assert.equal(servers.shared.command, 'user-version', 'the user config shadows project servers (resolveEffectiveMcpServers)')
  assert.equal(servers.rootmcp.cwd, repo, 'a project stdio server runs in its config’s folder')
  assert.equal(servers.projmcp.cwd, path.join(pkg, 'sub'))
  assert.equal(servers.remote.type, 'http')
  assert.deepEqual(servers.remote.headers, { a: 'b' })
  assert.equal(servers.off.enabled, false)
  // Not in a worktree: only the folder itself.
  const loose = tmp()
  write(path.join(loose, 'zcode.json'), { mcp: { servers: { here: { command: 'h' } } } })
  write(path.join(loose, 'inner', 'zcode.json'), { mcp: { servers: { inner: { command: 'i' } } } })
  assert.deepEqual(Object.keys(catalog.effectiveMcpServers({}, path.join(loose, 'inner'))), ['inner'])
  assert.deepEqual(catalog.projectConfigPaths(pkg), [path.join(repo, 'zcode.json'), path.join(repo, '.zcode', 'config.json'), path.join(pkg, '.zcode', 'config.json')])
  for (const dir of [repo, loose]) fs.rmSync(dir, { recursive: true, force: true })
})

test('protocolMcpServers carries timeoutMs, OAuth, protocol version and isolation, and starts a server in its own folder', () => {
  const config = { mcp: { servers: {
    plain: { command: 'node', args: ['s.js'], env: { TOKEN: 'x' } },
    slow: { command: 'slow', timeoutMs: 300000, protocolVersion: 'legacy', isolation: 'workspace' },
    badTimeout: { command: 'b', timeoutMs: -1, protocolVersion: 'v9' },
    signin: { type: 'http', url: 'https://mcp.example/mcp', headers: { k: 'v' }, oauth: { type: 'authorization_code', clientId: 'cid', scope: 'read' }, timeoutMs: 120000 },
    badOauth: { type: 'sse', url: 'https://mcp.example/sse', oauth: { type: 'client_credentials', clientId: 'only-id' } },
    elsewhere: { command: 'node', args: ['mcp.js'], cwd: '/repo/root' },
    same: { command: 'node', cwd: '/repo/pkg' },
    relative: { command: 'node', cwd: 'tools' },
    off: { command: 'x', enabled: false },
  } } }
  const byName = Object.fromEntries(catalog.protocolMcpServers(config, { cwd: '/repo/pkg' }).map((server) => [server.name, server]))
  assert.equal(byName.off, undefined)
  assert.deepEqual(byName.plain, { name: 'plain', command: 'node', args: ['s.js'], env: [{ name: 'TOKEN', value: 'x' }] })
  assert.deepEqual(byName.slow, { name: 'slow', command: 'slow', args: [], env: [], timeoutMs: 300000, isolation: 'workspace', protocolVersion: 'legacy' })
  assert.deepEqual(byName.badTimeout, { name: 'badTimeout', command: 'b', args: [], env: [] }, 'values ZCode’s strict protocol schema refuses are left out')
  assert.deepEqual(byName.signin, { name: 'signin', type: 'http', url: 'https://mcp.example/mcp', headers: [{ name: 'k', value: 'v' }], oauth: { type: 'authorization_code', clientId: 'cid', scope: 'read' }, timeoutMs: 120000 })
  assert.equal(byName.badOauth.oauth, undefined)
  assert.equal(byName.badOauth.type, 'sse')
  if (process.platform !== 'win32') {
    assert.deepEqual([byName.elsewhere.command, ...byName.elsewhere.args], ['/bin/sh', '-c', 'cd "$0" && exec "$@"', '/repo/root', 'node', 'mcp.js'])
    assert.deepEqual(byName.relative.args.slice(2, 4), ['/repo/pkg/tools', 'node'])
  }
  assert.equal(byName.same.command, 'node', 'a server whose folder is the session’s needs no wrapper')
})

test('the /bin/sh wrapper really starts the server in its folder with its arguments', { skip: process.platform === 'win32' }, async () => {
  const dir = tmp()
  const [entry] = catalog.protocolMcpServers({ mcp: { servers: { s: { command: process.execPath, args: ['-e', 'process.stdout.write(process.cwd() + "|" + process.argv[1])', 'arg one'], cwd: dir } } } }, { cwd: os.tmpdir() })
  const { execFileSync } = await import('node:child_process')
  assert.equal(execFileSync(entry.command, entry.args, { encoding: 'utf8' }), `${dir}|arg one`)
  fs.rmSync(dir, { recursive: true, force: true })
})

function projector() {
  const out = []
  const p = new LiveProjector({ threadId: 'sess_1', cwd: () => '/w', emit: (method, params) => out.push({ method, params }), onChild: () => {}, takeInput: () => null })
  return { p, out }
}

test('hasBackgroundWork: background commands and background sub-agents keep a session busy until they end', () => {
  const { p } = projector()
  const env = { turnId: 'turn_1' }
  p.event('turn.started', {}, env)
  assert.equal(p.hasBackgroundWork(), false)
  // Bash run_in_background.
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'bg', toolName: 'Bash', input: { command: 'sleep 10', run_in_background: true } }, env)
  p.event('session.updated', { taskId: 'exec_1', toolCallId: 'bg', taskKind: 'bash', command: 'sleep 10', status: 'running' }, env)
  assert.equal(p.hasBackgroundWork(), true)
  p.event('session.updated', { taskId: 'exec_1', toolCallId: 'bg', taskKind: 'bash', status: 'completed' }, env)
  assert.equal(p.hasBackgroundWork(), false)
  // Agent run_in_background: SubagentSpawned with background true, then its end.
  p.event('session.updated', { agentId: 'agent_bg', background: true, childSessionId: 'sess_subagent_agent_bg', description: 'Back', prompt: 'bg', status: 'running' }, env)
  assert.equal(p.hasBackgroundWork(), true)
  p.event('session.updated', { agentId: 'agent_bg', background: true, childSessionId: 'sess_subagent_agent_bg', status: 'completed', totalDurationMs: 7 }, env)
  assert.equal(p.hasBackgroundWork(), false)
  // A background task heard before its child: busy; the child's end settles it even without the task's own end.
  p.event('session.updated', { taskId: 'agent_b3', taskKind: 'subagent', status: 'running' }, env)
  assert.equal(p.hasBackgroundWork(), true)
  p.event('session.updated', { agentId: 'agent_b3', childSessionId: 'sess_subagent_agent_b3', description: 'B3', prompt: 'b3', status: 'running' }, env)
  assert.equal(p.hasBackgroundWork(), true)
  p.event('session.updated', { agentId: 'agent_b3', childSessionId: 'sess_subagent_agent_b3', status: 'completed' }, env)
  assert.equal(p.hasBackgroundWork(), false)
})

test('abandonBackground: a session closed with live work ends its sub-agents’ turns and commands as interrupted', () => {
  const { p, out } = projector()
  const env = { turnId: 'turn_1' }
  p.event('turn.started', {}, env)
  p.event('model.streaming', { kind: 'tool_call', toolCallId: 'bg', toolName: 'Bash', input: { command: 'npm run dev', run_in_background: true } }, env)
  p.event('session.updated', { taskId: 'exec_1', toolCallId: 'bg', taskKind: 'bash', command: 'npm run dev', status: 'running' }, env)
  p.event('session.updated', { agentId: 'agent_bg', background: true, childSessionId: 'sess_subagent_agent_bg', description: 'Back', prompt: 'bg', status: 'running' }, env)
  p.event('session.updated', { agentId: 'agent_done', background: true, childSessionId: 'sess_subagent_agent_done', description: 'Done', prompt: 'd', status: 'running' }, env)
  p.event('session.updated', { agentId: 'agent_done', childSessionId: 'sess_subagent_agent_done', status: 'completed' }, env)
  const before = out.length
  p.abandonBackground()
  const after = out.slice(before)
  const childEnd = after.filter((event) => event.method === 'turn/completed')
  assert.deepEqual(childEnd.map((event) => [event.params.threadId, event.params.turn.status]), [['sess_subagent_agent_bg', 'interrupted']], 'only the live sub-agent ends')
  assert.ok(after.some((event) => event.method === 'thread/status/changed' && event.params.threadId === 'sess_subagent_agent_bg' && event.params.status.type === 'idle'))
  const command = after.find((event) => event.method === 'item/completed' && event.params.item.id === 'bg')
  assert.equal(command?.params.item.status, 'interrupted')
  assert.equal(p.hasBackgroundWork(), false)
  assert.deepEqual(p.backgroundTerminals(), [])
  // Nothing left: a second call emits nothing.
  const settled = out.length
  p.abandonBackground()
  assert.equal(out.length, settled)
})
