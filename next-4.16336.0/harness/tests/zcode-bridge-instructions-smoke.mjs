// Smoke of the ZCode core on an install the bridge's provider proxy cannot front (no zcode-builtin.json next to
// the agent, as with a bare `zcode` on PATH): capabilities.customization is false, so OpenClaude Desktop sends Settings ›
// Instructions as developerInstructions, and the bridge must still get them to the model (inlined into the prompt,
// once, again when they change) while the transcript shows only what the user typed. The real ZCode agent runs
// from a copy without the catalog beside it (ZCode itself reads the catalog through ZCODE_BUILTIN_PROVIDER_CONFIG_FILE),
// against the local scripted model. Isolated: a temp HOME, no network.
//
// Usage: node tests/zcode-bridge-instructions-smoke.mjs   (ZCODE_BINARY=/path/to/zcode.cjs to use another ZCode)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { startFakeAnthropic, userText } from '../packages/zcode-bridge/test-support/fake-anthropic.mjs'
import { readJson, saveApiKeyProvider } from '../packages/zcode-bridge/src/accounts.js'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..', '..')
const { CodexClient } = require(path.join(root, 'app/electron/codex.cjs'))
const BRIDGE = process.env.ZCODE_BRIDGE || path.join(root, 'harness/packages/zcode-bridge/bin/app-server.mjs')
const AGENT = process.env.ZCODE_BINARY || path.join(root, 'work/agents/zcode-bridge/zcode-3.14.3/glm/zcode.cjs')
const CATALOG = path.resolve(path.dirname(AGENT), '..', 'config', 'provider', 'zcode-builtin.json')
if (!fs.existsSync(AGENT) || !fs.existsSync(CATALOG)) { console.error(`ZCode runtime not found at ${AGENT} (set ZCODE_BINARY).`); process.exit(2) }

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-zcode-instr-'))
const ws = path.join(home, 'project')
fs.mkdirSync(ws, { recursive: true })
// The agent without its provider catalog beside it: glm/zcode.cjs (a copy, so its realpath has no config/ next to
// it) with the bundle's packages and native tools linked in.
const install = path.join(home, 'zcode')
fs.mkdirSync(path.join(install, 'glm'), { recursive: true })
fs.copyFileSync(AGENT, path.join(install, 'glm', 'zcode.cjs'))
for (const entry of ['packages', '.node-bundle-meta.json']) if (fs.existsSync(path.join(path.dirname(AGENT), entry))) fs.symlinkSync(path.join(path.dirname(AGENT), entry), path.join(install, 'glm', entry))
if (fs.existsSync(path.join(path.dirname(AGENT), '..', 'tools'))) fs.symlinkSync(path.resolve(path.dirname(AGENT), '..', 'tools'), path.join(install, 'tools'))

const fake = await startFakeAnthropic(async (body) => {
  if (/Generate a concise title/.test(JSON.stringify(body.system ?? ''))) return { text: 'Title' }
  return { text: `ok: ${userText(body).slice(-40)}` }
})
saveApiKeyProvider({ personalFile: path.join(home, '.zcode', 'v2', 'provider_config.json'), builtin: readJson(CATALOG), apiKey: 'sk-instr', templateId: 'zai-api', baseUrl: fake.url })
const mainRequests = (from) => fake.requests.slice(from).filter((r) => r.headers['x-zcode-session-type'] === 'main' || r.headers['x-zcode-session-type'] === undefined)

const env = {
  HOME: home, CODE_DESKTOP_AGENT_BINARY: path.join(install, 'glm', 'zcode.cjs'), CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_AGENT_VERSION: '3.14.3',
  CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'bridge-state'), CODE_DESKTOP_NODE_BINARY: process.execPath, ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: CATALOG, NO_PROXY: '*',
}
const events = []
let waiters = []
const client = new CodexClient({ binary: BRIDGE, initializeTimeout: 120000, env })
client.on('event', (event) => { events.push(event); for (const waiter of [...waiters]) waiter(event) })
function turnDone(threadId, from) {
  const hit = events.slice(from).find((e) => e.method === 'turn/completed' && e.params.threadId === threadId)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('turn timed out')), 60000)
    const waiter = (e) => { if (e.method === 'turn/completed' && e.params.threadId === threadId) { clearTimeout(timer); waiters = waiters.filter((w) => w !== waiter); resolve(e) } }
    waiters.push(waiter)
  })
}
const params = (threadId, text, developerInstructions) => ({
  threadId, input: [{ type: 'text', text, text_elements: [] }], cwd: ws, approvalPolicy: 'never', sandboxPolicy: { type: 'dangerFullAccess' },
  codeDesktop: { permissionMode: 'bypass' }, ...(developerInstructions === undefined ? {} : { developerInstructions }),
})
async function turn(threadId, text, developerInstructions) {
  const from = events.length
  const index = fake.requests.length
  await client.request('turn/start', params(threadId, text, developerInstructions))
  await turnDone(threadId, from)
  return { from, sent: mainRequests(index).map((r) => JSON.stringify(r.body.messages)).at(-1) ?? '' }
}
const count = (text, needle) => text.split(needle).length - 1

let passed = 0
const failed = []
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok - ${name}`) } catch (error) { failed.push(name); console.log(`not ok - ${name}: ${error?.stack?.split('\n').slice(0, 3).join(' | ') || error}`) }
}

try {
  const init = await client.start()
  await check('no provider catalog: customization and the prompt preview are reported off', async () => {
    assert.equal(init.capabilities.customization, false)
    assert.equal(init.capabilities.systemPromptPreview, false)
  })

  const { thread } = await client.request('thread/start', { cwd: ws, approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass' }, developerInstructions: 'Always mention PINEAPPLE.' })
  await check('the instructions reach the model with the first prompt; the transcript shows what was typed', async () => {
    const { from, sent } = await turn(thread.id, 'HELLO one')
    assert.match(sent, /Always mention PINEAPPLE\./)
    const user = events.slice(from).find((e) => e.method === 'item/completed' && e.params.item.type === 'userMessage').params.item
    assert.deepEqual(user.content.map((part) => part.text), ['HELLO one'])
  })

  await check('sent once: the next prompt does not repeat them', async () => {
    const { sent } = await turn(thread.id, 'HELLO two')
    assert.equal(count(sent, 'Always mention PINEAPPLE.'), 1, 'only the first prompt carries them')
  })

  await check('changed instructions are sent with the next prompt', async () => {
    const { sent } = await turn(thread.id, 'HELLO three', 'Always mention BANANA.')
    assert.match(sent, /Always mention BANANA\./)
  })

  await check('history and the thread preview hide the inlined block', async () => {
    const page = await client.request('thread/turns/list', { threadId: thread.id, limit: 10, sortDirection: 'asc', itemsView: 'full' })
    const typed = page.data.flatMap((t) => t.items).filter((i) => i.type === 'userMessage').map((i) => i.content.map((part) => part.text).join(''))
    assert.deepEqual(typed, ['HELLO one', 'HELLO two', 'HELLO three'])
    const row = (await client.request('thread/list', { limit: 10 })).data.find((t) => t.id === thread.id)
    assert.equal(row.preview, 'HELLO one')
  })

  await check('a session that starts with a ZCode command still delivers them: /init carries them inside its arguments', async () => {
    const { thread: other } = await client.request('thread/start', { cwd: ws, approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass' }, developerInstructions: 'Always mention MANGO.' })
    const from = events.length
    const index = fake.requests.length
    await client.request('turn/start', { ...params(other.id, ''), input: [{ type: 'skill', name: 'init', path: 'command:init' }, { type: 'text', text: 'Keep it short.', text_elements: [] }] })
    await turnDone(other.id, from)
    const sent = mainRequests(index).map((r) => JSON.stringify(r.body.messages))
    assert.ok(sent.some((text) => /AGENTS\.md/.test(text) && /Always mention MANGO\./.test(text) && /Keep it short/.test(text)), 'the /init prompt carries the instructions')
    // Sent once: the next prompt does not repeat them.
    const next = await turn(other.id, 'HELLO after init')
    assert.equal(count(next.sent, 'Always mention MANGO.'), 1)
    const page = await client.request('thread/turns/list', { threadId: other.id, limit: 10, sortDirection: 'asc', itemsView: 'full' })
    assert.ok(!JSON.stringify(page.data).includes('code-desktop-instructions'), 'the transcript hides the block')
  })

  await check('a /goal objective carries them into the turns ZCode drives itself', async () => {
    const { thread: other } = await client.request('thread/start', { cwd: ws, approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { permissionMode: 'bypass' }, developerInstructions: 'Always mention KIWI.' })
    const from = events.length
    const index = fake.requests.length
    await client.request('turn/start', { ...params(other.id, ''), input: [{ type: 'skill', name: 'goal', path: 'command:goal' }, { type: 'text', text: 'say done', text_elements: [] }] })
    const started = Date.now()
    while (!mainRequests(index).length && Date.now() - started < 60000) await new Promise((resolve) => setTimeout(resolve, 200))
    assert.ok(mainRequests(index).some((r) => /Always mention KIWI\./.test(JSON.stringify(r.body.messages))), 'the goal round carries the instructions')
    // Stop the goal: interrupt the round and clear it.
    await client.request('turn/interrupt', { threadId: other.id, turnId: events.slice(from).find((e) => e.method === 'turn/started' && e.params.threadId === other.id)?.params.turn.id ?? '' }).catch(() => {})
    await turnDone(other.id, from).catch(() => {})
    const clearFrom = events.length
    await client.request('turn/start', { ...params(other.id, ''), input: [{ type: 'skill', name: 'goal', path: 'command:goal' }, { type: 'text', text: 'clear', text_elements: [] }] }).catch(() => {})
    await turnDone(other.id, clearFrom).catch(() => {})
    const replies = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.threadId === other.id && e.params.item.type === 'agentMessage').map((e) => e.params.item.text).filter((text) => !text.startsWith('ok: ')) // the scripted model echoes its prompt
    assert.ok(replies.includes('Goal cleared.'), JSON.stringify(replies))
    assert.ok(!replies.some((text) => text.includes('code-desktop-instructions')), `ZCode’s goal replies hide the block: ${JSON.stringify(replies).slice(0, 1500)}`)
  })
} catch (error) {
  failed.push(`fatal: ${error?.message}`)
  console.log(`fatal: ${error?.stack}`)
} finally {
  try { await client.stopAndWait() } catch {}
  await fake.close()
  if (!failed.length && process.env.KEEP_HOME !== '1') fs.rmSync(home, { recursive: true, force: true })
  console.log(`${passed} checks passed${failed.length ? `, ${failed.length} failed: ${failed.join('; ')}` : ''}`)
  process.exit(failed.length ? 1 : 0)
}
