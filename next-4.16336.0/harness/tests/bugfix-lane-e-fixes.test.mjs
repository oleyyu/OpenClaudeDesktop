// Lane E fixes (analysis/bugcheck-20261115): custom provider metadata in the OpenCode/MiMo overlay, MiMo sign-out
// under a running chat, MiMo's prediction with Prompt suggestions off, ZCode sign-out honesty, DeepSeek duplicate ids.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { providerOverlay, providerModelInfo } from '../packages/opencode-bridge/src/config.js'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'
import { ModelCatalog } from '../packages/codex-app-server/src/models.js'

const root = path.resolve(import.meta.dirname, '..', '..')
const { validateProvider } = await import(path.join(root, 'app/electron/prefs/model-settings.mjs'))
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lane-e-')))
const until = async (check, what) => { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise((r) => setTimeout(r, 10)) } assert.fail(`timed out: ${what}`) }

// ------------------------------------------------------------------ opencode-custom-provider-metadata-dropped

test('1.x overlay: the image marks and context windows Settings › Models saves reach the model entries', () => {
  // What Add provider writes (validateProvider), not a hand-made modelInfo.
  const saved = validateProvider({ route: 'glm', api: 'openai-completions', baseURL: 'https://open.bigmodel.cn/api/paas/v4', models: 'glm-5.3\nglm-5v', imageModels: ['glm-5v'], contextWindows: { 'glm-5v': '128000', 'glm-5.3': '64000' } })
  assert.equal(saved.modelInfo, undefined)
  const { models } = providerOverlay([saved], {}).glm
  assert.deepEqual(models['glm-5v'], { name: 'glm-5v', tool_call: true, temperature: true, attachment: true, modalities: { input: ['text', 'image'], output: ['text'] }, limit: { context: 128000, output: 0 } })
  // Left unmarked by the user: text only, said outright.
  assert.deepEqual(models['glm-5.3'], { name: 'glm-5.3', tool_call: true, temperature: true, attachment: false, modalities: { input: ['text'], output: ['text'] }, limit: { context: 64000, output: 0 } })
  // Never marked (no imageModels): nothing said about images, nor a limit nobody gave.
  const plain = validateProvider({ route: 'x', api: 'openai-completions', baseURL: 'https://x.example/v1', models: 'm1' })
  assert.deepEqual(providerOverlay([plain], {}).x.models.m1, { name: 'm1', tool_call: true, temperature: true })
})

test('1.x overlay: modelInfo still describes a model; the user’s marks win over it', () => {
  const provider = { route: 'fake', api: 'anthropic-messages', baseURL: 'http://127.0.0.1:9', models: ['a', 'b'], imageModels: ['b'], contextWindows: { a: 50000 },
    modelInfo: { a: { name: 'Model A', reasoning: true, attachment: true, limit: { context: 200000, output: 8000 } }, b: { reasoning: false } } }
  assert.deepEqual(providerModelInfo(provider, 'a'), { name: 'Model A', reasoning: true, attachment: false, limit: { context: 50000, output: 8000 } })
  const { models } = providerOverlay([provider], {}).fake
  assert.equal(models.a.reasoning, true)
  assert.equal(models.a.attachment, false)
  assert.deepEqual(models.a.limit, { context: 50000, output: 8000 })
  assert.equal(models.b.attachment, true)
  assert.equal(models.b.reasoning, undefined)
  // Without imageModels the modelInfo flag decides, as before.
  assert.equal(providerOverlay([{ ...provider, imageModels: undefined, contextWindows: undefined }], {}).fake.models.a.attachment, true)
  assert.deepEqual(providerOverlay([{ ...provider, imageModels: undefined, contextWindows: undefined }], {}).fake.models.a.limit, { context: 200000, output: 8000 })
})

// ------------------------------------------------------------------ mimo-signout-busy-no-restart

async function mimoBridge(threadState) {
  const home = tmp()
  const data = path.join(home, 'data')
  const auth = path.join(data, 'mimocode', 'auth.json')
  fs.mkdirSync(path.dirname(auth), { recursive: true })
  fs.writeFileSync(auth, JSON.stringify({ xiaomi: { type: 'api', key: 'FAKE-KEY' } }))
  const bridge = new Bridge({ flavor: FLAVORS.mimo, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: data }, input: new PassThrough(), output: new PassThrough(), log: () => {} })
  bridge.notify = () => {}
  bridge.mergedConfig = async () => ({})
  const events = []
  const server = () => ({ version: 'fake', stop: async () => { events.push('stop') } })
  bridge.server = server()
  bridge.ensureServer = async () => { if (!bridge.server) { events.push('spawn'); bridge.server = server() } }
  bridge.api = async (method, route) => {
    events.push(`${method} ${route}`)
    if (method === 'DELETE' && route === '/auth/xiaomi') fs.writeFileSync(auth, '{}')
    return {}
  }
  const thread = { busy: false, activeTurn: null, pending: new Map(), ...threadState }
  bridge.threads.set('t1', thread)
  return { bridge, thread, events, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) }
}

test('MiMo sign-out while a chat runs, or only its ask waits: MiMo restarts once nothing runs', async () => {
  for (const state of [{ busy: true }, { pending: new Map([['ask', {}]]) }]) {
    const { bridge, thread, events, cleanup } = await mimoBridge(state)
    try {
      assert.deepEqual(await bridge.handle('account/logout', {}), {})
      assert.ok(events.includes('DELETE /auth/xiaomi'))
      assert.ok(!events.includes('stop'), 'not restarted under the running chat')
      assert.equal(bridge.pendingRestart, true)
      thread.busy = false; thread.pending.clear()
      bridge.maybePendingReload()
      await until(() => events.includes('spawn'), 'the restart')
      assert.deepEqual(events.filter((event) => event === 'stop' || event === 'spawn'), ['stop', 'spawn'])
      assert.equal(bridge.pendingRestart, false)
    } finally { cleanup() }
  }
  // Idle: restarted right away, nothing held.
  const { bridge, events, cleanup } = await mimoBridge({})
  try {
    await bridge.handle('account/logout', {})
    assert.deepEqual(events.filter((event) => event === 'stop' || event === 'spawn'), ['stop', 'spawn'])
    assert.ok(!bridge.pendingRestart)
  } finally { cleanup() }
})

test('the last ask of an idle thread answered: a held restart runs', async () => {
  let resolve
  const thread = Object.create(LiveThread.prototype)
  let reloads = 0
  Object.assign(thread, { id: 't', closed: false, busy: false, activeTurn: null, pending: new Map(), publishStatus() {}, emit() {},
    bridge: { transport: { request: () => ({ id: 1, promise: new Promise((r) => { resolve = r }) }), abandon() {} }, maybePendingReload: () => { reloads++ } } })
  const asked = thread.clientRequest('item/tool/requestUserInput', {}, 'question', null)
  assert.equal(thread.pending.size, 1)
  resolve({ answers: {} })
  await asked
  assert.equal(reloads, 1)
  // During a turn the turn's end does it instead.
  thread.activeTurn = { id: 'turn' }
  const again = thread.clientRequest('item/tool/requestUserInput', {}, 'question', null)
  resolve({})
  await again
  assert.equal(reloads, 1)
})

// ------------------------------------------------------------------ prompt-suggestions-off-mimo-still-predicts

function mimoRootThread() {
  const calls = []
  const thread = Object.create(LiveThread.prototype)
  Object.assign(thread, {
    id: 'ses_A', sessionID: 'ses_A', cwd: '/tmp/x', root: null, actor: null, parent: null,
    reviewRestore: null, busy: true, pending: new Map(), items: new Map(), forceStatus: null, interrupted: false, turnError: null, queue: [],
    emit() {}, publishStatus() {}, emitItem() {}, startNext() {},
    bridge: { flavor: FLAVORS.mimo, store: { update() {}, get: () => ({}) }, v2: false, clientName: 'code_desktop_local', log() {}, maybePendingReload() {}, api: async (method, route) => { calls.push(`${method} ${route}`); return { prediction: 'next' } } },
  })
  const turn = async () => {
    thread.activeTurn = { id: 'turn_1', startedMs: Date.now() }
    thread.projector = { turns: () => [{ id: 'turn_1', status: 'completed', items: [] }] }
    thread.finishTurn()
    await new Promise((r) => setTimeout(r, 10))
  }
  return { thread, calls, turn }
}

test('MiMo: Prompt suggestions off (turn/start codeDesktop.promptSuggestions false) makes no /predict request', async () => {
  const on = mimoRootThread()
  await on.turn()
  assert.deepEqual(on.calls, ['POST /session/ses_A/predict'], 'on by default')
  const off = mimoRootThread()
  off.thread.promptSuggestions = false
  await off.turn()
  await off.turn()
  assert.deepEqual(off.calls, [])
})

// ------------------------------------------------------------------ deepseek-duplicate-model-ids

function catalogOf(providers, fallback = { provider: 'deepseek-official', model: 'deepseek-flash' }) {
  const llm = {
    listProviders: () => providers.map(({ id, name }) => ({ id, name })),
    listModels: async (id) => providers.find((provider) => provider.id === id).models,
    resolveModelInfo: async (provider, id) => providers.find((entry) => entry.id === provider).models.find((model) => model.id === id),
  }
  return new ModelCatalog(llm, fallback)
}
const OFFICIAL = { id: 'deepseek-official', name: 'DeepSeek', models: [{ id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro' }, { id: 'deepseek-flash', name: 'DeepSeek-V41-Flash' }] }

test('DeepSeek: a model id two providers serve keeps the built-in bare id; the other row names its provider', async () => {
  const catalog = catalogOf([OFFICIAL, { id: 'openrouter', name: 'OpenRouter', models: [{ id: 'deepseek-flash', name: 'DeepSeek Flash' }] }])
  const models = await catalog.codexModels()
  assert.deepEqual(models.map((model) => [model.id, model.displayName, model.isDefault]), [
    ['deepseek-v4-pro', '4 Pro', false], ['deepseek-flash', '4.1 Flash', true], ['openrouter/deepseek-flash', '4.1 Flash (OpenRouter)', false]])
  assert.deepEqual(await catalog.selection('deepseek-flash'), { provider: 'deepseek-official', model: 'deepseek-flash' })
  assert.deepEqual(await catalog.selection('openrouter/deepseek-flash'), { provider: 'openrouter', model: 'deepseek-flash' })
  // A `provider/model` id saved before still resolves.
  assert.deepEqual(await catalog.selection('deepseek-official/deepseek-flash'), { provider: 'deepseek-official', model: 'deepseek-flash' })
  assert.equal(catalog.wireId('deepseek-official', 'deepseek-flash'), 'deepseek-flash')

  // Two custom providers: the first keeps the id its saved settings are under; the menu rows differ.
  const two = await catalogOf([OFFICIAL, { id: 'qwen', name: 'Qwen', models: [{ id: 'qwen3.8-max', name: 'Qwen 3.8 Max' }] }, { id: 'qwen-coding', name: 'Qwen Coding Plan', models: [{ id: 'qwen3.8-max', name: 'Qwen 3.8 Max' }] }]).codexModels()
  assert.deepEqual(two.slice(2).map((model) => [model.id, model.displayName]), [['qwen3.8-max', 'Qwen 3.8 Max'], ['qwen-coding/qwen3.8-max', 'Qwen 3.8 Max (Qwen Coding Plan)']])
  // Unique ids are unchanged.
  assert.deepEqual((await catalogOf([OFFICIAL]).codexModels()).map((model) => model.id), ['deepseek-v4-pro', 'deepseek-flash'])
})
