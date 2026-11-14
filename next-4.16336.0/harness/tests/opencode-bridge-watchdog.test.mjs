// AgentServer.watchParent: a bridge killed outright (SIGKILL, no exit handlers) must not leave its `opencode serve` /
// `mimo serve` running. A tiny sh sentinel reads a pipe from the bridge and stops the server once that pipe closes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const serverModule = fileURLToPath(new URL('../packages/opencode-bridge/src/server.js', import.meta.url))
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const until = async (check, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (check()) return true; await new Promise((resolve) => setTimeout(resolve, 50)) } return check() }

test('a SIGKILLed bridge takes its agent server down with it', { skip: process.platform === 'win32' && 'POSIX only' }, async () => {
  const script = `
    import { spawn } from 'node:child_process'
    import { AgentServer } from ${JSON.stringify(serverModule)}
    const child = spawn('/bin/sleep', ['300'], { stdio: 'ignore' })
    new AgentServer({ flavor: { id: 'x', name: 'X' }, binary: 'x' }).watchParent(child)
    process.stdout.write(String(child.pid) + '\\n')
    setInterval(() => {}, 1000)
  `
  const bridge = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'inherit'] })
  const pid = await new Promise((resolve) => bridge.stdout.once('data', (chunk) => resolve(Number(String(chunk).trim()))))
  try {
    assert.ok(pid > 0)
    await new Promise((resolve) => setTimeout(resolve, 300))
    assert.equal(alive(pid), true, 'the server keeps running while its bridge lives')
    bridge.kill('SIGKILL')
    assert.equal(await until(() => !alive(pid)), true, 'the server stops once its bridge is gone')
  } finally {
    try { bridge.kill('SIGKILL') } catch {}
    try { process.kill(pid, 'SIGKILL') } catch {}
  }
})
