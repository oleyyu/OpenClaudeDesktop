// zcode-signout-noop (analysis/bugcheck-20261115): Sign out says what it left signed in, or refuses when it removed
// nothing; a failing `zcode logout` with no Coding Plan sign-in left is not an error. Over test-support/fake-zcode.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'

const root = path.resolve(import.meta.dirname, '..')
const BIN = path.join(root, 'packages/zcode-bridge/bin/app-server.mjs')
const FAKE = path.join(root, 'packages/zcode-bridge/test-support/fake-zcode.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const rule = (providerId, providerName) => ({ providerId, templateId: 'zai-api', providerName, enabled: true, config: { access: { type: 'zhipu-coding-plan-api-key', apiKey: 'placeholder' }, api: { type: 'anthropic-messages', baseUrl: 'https://api.z.ai/api/anthropic' } } })

async function withBridge(rules, run) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lane-e-zc-')))
  const logFile = path.join(home, 'zcode.log')
  // The fake ZCode, with a `zcode logout` that fails (nothing signed in to log out of).
  const wrapper = path.join(home, 'fake-zcode-logout-fails.mjs')
  fs.writeFileSync(wrapper, `import fs from 'node:fs'\nif (process.argv.includes('logout')) { fs.appendFileSync(process.env.FAKE_ZCODE_LOG, JSON.stringify({ method: 'CLI logout' }) + '\\n'); process.stderr.write('logout failed: not signed in\\n'); process.exit(1) }\nawait import(${JSON.stringify(FAKE)})\n`)
  const personal = path.join(home, '.zcode', 'v2', 'provider_config.json')
  fs.mkdirSync(path.dirname(personal), { recursive: true })
  fs.writeFileSync(personal, JSON.stringify({ schemaVersion: 1, config: { providerConfigRules: { providerRules: rules } } }))
  const child = spawn(process.execPath, [BIN, 'app-server', '--stdio'], {
    cwd: home,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), CODE_DESKTOP_AGENT_BINARY: wrapper, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), FAKE_ZCODE_LOG: logFile, FAKE_ZCODE_WORKFLOW: path.join(home, 'workflow.json') },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stderr = []
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const notes = []
  const client = new LineTransport(child.stdout, child.stdin, { onRequest: async () => ({}), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const call = (method, params) => client.call(method, params, 30000)
  try {
    await call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await run({ call, notes, personal, log: () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '') })
  } catch (error) {
    error.message += `\n${stderr.join('').slice(-2000)}`
    throw error
  } finally {
    child.kill('SIGTERM'); await sleep(200)
    fs.rmSync(home, { recursive: true, force: true })
  }
}

const providerIds = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).config.providerConfigRules.providerRules.map((entry) => entry.providerId)

test('ZCode sign-out: only a provider set up in ZCode itself → refused, saying where to remove it', { timeout: 60000 }, async () => {
  await withBridge([rule('zai-api-user', 'Z.ai (mine)')], async ({ call, notes, personal, log }) => {
    assert.equal((await call('account/read', {})).account?.type, 'apiKey')
    await assert.rejects(call('account/logout', {}), /Nothing to sign out of in ZCode: Z\.ai \(mine\) was set up in the ZCode app; remove its key in ZCode’s provider settings\./)
    assert.ok(log().includes('CLI logout'), '`zcode logout` ran')
    assert.deepEqual(providerIds(personal), ['zai-api-user'], 'the user’s own provider stays')
    assert.equal(notes.filter((note) => note.method === 'account/updated').length, 0, 'nothing changed')
  })
})

test('ZCode sign-out: OpenClaude Desktop’s key removed, the user’s own provider left → success with a notice', { timeout: 60000 }, async () => {
  await withBridge([rule('code-desktop-zai-api', 'Z.ai'), rule('zai-api-user', 'Z.ai (mine)')], async ({ call, notes, personal }) => {
    const result = await call('account/logout', {})
    assert.deepEqual(result, { codeDesktop: { notice: 'ZCode still uses an API key: Z.ai (mine) was set up in the ZCode app; remove its key in ZCode’s provider settings.' } })
    assert.deepEqual(providerIds(personal), ['zai-api-user'])
    assert.equal(notes.filter((note) => note.method === 'account/updated').length, 1)
  })
})

test('ZCode sign-out: only OpenClaude Desktop’s key → signed out; a failing `zcode logout` with no sign-in is no error', { timeout: 60000 }, async () => {
  await withBridge([rule('code-desktop-zai-api', 'Z.ai')], async ({ call, personal }) => {
    assert.deepEqual(await call('account/logout', {}), {})
    assert.deepEqual(providerIds(personal), [])
    assert.equal((await call('account/read', {})).account, null)
  })
})
