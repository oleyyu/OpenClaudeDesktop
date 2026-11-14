import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createRequire } from 'node:module'
import { applyModelParams, contextWindowFor, installContextWindows, installModelParams, normalizeModelParams, rememberContextWindows } from '../packages/codex-app-server/src/model-params.js'
const require = createRequire(import.meta.url)

test('normalizeModelParams clamps finite values and drops unknown fields and ids', () => {
  assert.equal(normalizeModelParams(null), null)
  assert.equal(normalizeModelParams('x'), null)
  assert.equal(normalizeModelParams({}), null)
  assert.deepEqual(normalizeModelParams({
    'deepseek-flash': { maxTokens: 8000.7, temperature: 0.456, topP: 0.9 },
    'deepseek-v4-pro': { maxTokens: 10, temperature: 5 },
    'big': { maxTokens: 9e9, temperature: -1 },
    'bad id!': { maxTokens: 1000 },
    'nan': { maxTokens: NaN, temperature: Infinity },
    'str': { maxTokens: '1000' },
    'acme/coder@2025+fast': { temperature: 0.5 },
    'qwen3-coder-plus(openai)': { maxTokens: 4096 },
  }), {
    'acme/coder@2025+fast': { temperature: 0.5 },
    'qwen3-coder-plus(openai)': { maxTokens: 4096 },
    'deepseek-flash': { maxTokens: 8000, temperature: 0.46 },
    'deepseek-v4-pro': { maxTokens: 256, temperature: 2 },
    big: { maxTokens: 1000000, temperature: 0 },
  })
})

const catalog = { wireId: (provider, model) => (provider === 'other' ? `other/${model}` : model) }

test('applyModelParams sets temperature and maxTokens for the wire model id', () => {
  const ref = { modelParams: { 'deepseek-flash': { maxTokens: 4096, temperature: 0.3 }, 'other/deepseek-flash': { temperature: 1 } } }
  assert.deepEqual(applyModelParams({ provider: 'deepseek', model: 'deepseek-flash', reasoningEffort: 'high', temperature: 0.9 }, ref, catalog),
    { provider: 'deepseek', model: 'deepseek-flash', reasoningEffort: 'high', maxTokens: 4096, temperature: 0.3 })
  // A second provider with the same model id uses its provider-qualified wire id.
  assert.deepEqual(applyModelParams({ provider: 'other', model: 'deepseek-flash', maxTokens: 999 }, ref, catalog),
    { provider: 'other', model: 'deepseek-flash', maxTokens: 999, temperature: 1 })
})

test('applyModelParams strips temperature without an entry and drops only its own maxTokens', () => {
  const ref = { modelParams: { 'deepseek-flash': { maxTokens: 4096 } } }
  const first = applyModelParams({ provider: 'deepseek', model: 'deepseek-flash', temperature: 0.7 }, ref, catalog)
  assert.deepEqual(first, { provider: 'deepseek', model: 'deepseek-flash', maxTokens: 4096 })
  // The setting is removed: the logged header still proposes 4096, which was ours.
  ref.modelParams = null
  assert.deepEqual(applyModelParams({ provider: 'deepseek', model: 'deepseek-flash', maxTokens: 4096 }, ref, catalog), { provider: 'deepseek', model: 'deepseek-flash' })
  // A value that is not ours (an adapter or profile default) is kept.
  assert.deepEqual(applyModelParams({ provider: 'deepseek', model: 'deepseek-flash', maxTokens: 32000 }, ref, catalog), { provider: 'deepseek', model: 'deepseek-flash', maxTokens: 32000 })
  // A fresh ref never strips anything but temperature.
  assert.deepEqual(applyModelParams({ provider: 'deepseek', model: 'm', maxTokens: 4096, temperature: 1 }, {}, catalog), { provider: 'deepseek', model: 'm', maxTokens: 4096 })
  assert.deepEqual(applyModelParams({ provider: 'deepseek', model: 'm' }, { modelParams: { m: { temperature: 0 } } }), { provider: 'deepseek', model: 'm', temperature: 0 })
})

test('installModelParams registers an agent/request waterfall that reads the ref at each request', async () => {
  const listeners = new Map()
  let disposed = false
  const agentCtx = { on: (name, listener) => { listeners.set(name, listener); return () => { disposed = true } } }
  const ref = { modelParams: undefined }
  const dispose = installModelParams(agentCtx, ref, { catalog })
  const listener = listeners.get('agent/request')
  assert.equal(typeof listener, 'function')
  const base = { provider: 'deepseek', model: 'deepseek-v4-pro', reasoningEffort: 'max' }
  assert.deepEqual(await listener({}, async () => ({ ...base })), base)
  ref.modelParams = normalizeModelParams({ 'deepseek-v4-pro': { maxTokens: 20000, temperature: 0.2 } })
  assert.deepEqual(await listener({}, async () => ({ ...base })), { ...base, maxTokens: 20000, temperature: 0.2 })
  dispose()
  assert.equal(disposed, true)
})

test('installModelParams composed after installModelSelection on a real context applies the selected model params', async () => {
  const ctx = new Context()
  const selection = { current: undefined }
  const ref = { modelParams: normalizeModelParams({ 'model-a': { maxTokens: 1000, temperature: 0.1 }, 'model-b': { maxTokens: 9000, temperature: 1.5 } }) }
  // Production order (index.js): selection first, then customization.
  installModelSelection(ctx, selection)
  installModelParams(ctx, ref, { catalog })
  const request = async (seed) => {
    await ctx.waterfall('system-prompt/assemble', { variables: {} }, {}, async () => ({ variables: {} }))
    return ctx.waterfall('agent/request', {}, async () => ({ ...seed }))
  }
  // The seed (previous request's header) still names model A; the thread switched to B.
  selection.current = { provider: 'deepseek', model: 'model-b' }
  assert.deepEqual(await request({ provider: 'deepseek', model: 'model-a', maxTokens: 1000, temperature: 0.1 }),
    { provider: 'deepseek', model: 'model-b', maxTokens: 9000, temperature: 1.5 })
  // Switching to a model without params drops A/B's maxTokens we set and the temperature.
  selection.current = { provider: 'deepseek', model: 'model-c' }
  assert.deepEqual(await request({ provider: 'deepseek', model: 'model-b', maxTokens: 9000, temperature: 1.5 }),
    { provider: 'deepseek', model: 'model-c' })
})

test('normalizeModelParams keeps a clamped whole context window', () => {
  assert.deepEqual(normalizeModelParams({ a: { contextWindow: 131072.9 }, b: { contextWindow: 10 }, c: { contextWindow: 9e12 }, d: { contextWindow: '128K' } }),
    { a: { contextWindow: 131072 }, b: { contextWindow: 1024 }, c: { contextWindow: 100000000 } })
})

test('installContextWindows gives the real llm service the user’s context window for every exact model lookup', async () => {
  const { LlmRuntime, LlmAdapter } = await import(require.resolve('@deepseek-ai/dsh-llm'))
  const ctx = new Context()
  ctx.plugin(LlmRuntime)
  await new Promise((resolve) => ctx.inject(['llm'], (scope) => { resolve(); return scope }))
  const llm = await new Promise((resolve) => ctx.inject(['llm'], (scope) => resolve(scope.llm)))
  class Fixed extends LlmAdapter {
    resolveModel(provider, model) { return Promise.resolve({ provider, id: model, name: model, context: { contextWindow: 262144 } }) }
    stream() { throw new Error('not used') }
  }
  llm.registerAdapter(['deepseek', 'other'], new Fixed())
  const dispose = installContextWindows(llm, catalog)
  try {
    rememberContextWindows(normalizeModelParams({ 'deepseek-v4-pro': { contextWindow: 131072 }, 'other/deepseek-v4-pro': { contextWindow: 64000 }, 'model-m': { maxTokens: 4096 } }))
    assert.equal(contextWindowFor('deepseek', 'deepseek-v4-pro', catalog), 131072)
    // Compaction's pressure threshold reads resolveModelInfo; the request context (usage meter) reads prepareCall.
    assert.deepEqual((await llm.resolveModelInfo('deepseek', 'deepseek-v4-pro')).context, { contextWindow: 131072 })
    assert.deepEqual((await llm.prepareCall({ provider: 'deepseek', model: 'deepseek-v4-pro' })).context, { contextWindow: 131072 })
    assert.deepEqual((await llm.resolveModelInfo('other', 'deepseek-v4-pro')).context, { contextWindow: 64000 }, 'provider-qualified wire id')
    assert.deepEqual((await llm.resolveModelInfo('deepseek', 'model-m')).context, { contextWindow: 262144 }, 'no window set: the adapter’s')
    // Clearing the setting (modelParams null) restores the adapter's window.
    rememberContextWindows(null)
    assert.deepEqual((await llm.resolveModelInfo('deepseek', 'deepseek-v4-pro')).context, { contextWindow: 262144 })
  } finally { rememberContextWindows(null); dispose() }
  rememberContextWindows(normalizeModelParams({ 'deepseek-v4-pro': { contextWindow: 131072 } }))
  assert.deepEqual((await llm.resolveModelInfo('deepseek', 'deepseek-v4-pro')).context, { contextWindow: 262144 }, 'disposed: the adapter’s window again')
  rememberContextWindows(null)
})
