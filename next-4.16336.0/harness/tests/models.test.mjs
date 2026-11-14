import test from 'node:test'
import assert from 'node:assert/strict'
import { ModelCatalog, modalitiesOf } from '../packages/codex-app-server/src/models.js'

// The dsh-llm-deepseek default catalog shape: deepseek-flash has no description.
const EFFORTS = [
  { id: 'off', name: 'Off', description: 'No extended thinking' },
  { id: 'low', name: 'Low', description: 'Brief thinking' },
  { id: 'high', name: 'High', description: 'Deeper thinking' },
  { id: 'max', name: 'Max', description: 'Most thinking' },
]
function fakeLlm(models) {
  return {
    listProviders: () => [{ id: 'deepseek-official', name: 'DeepSeek' }],
    listModels: async () => models,
    resolveModelInfo: async (provider, id) => {
      const model = models.find((candidate) => candidate.id === id)
      return { ...model, provider, context: { contextWindow: 1_000_000 }, reasoning: { efforts: EFFORTS, defaultEffort: 'high' } }
    },
  }
}
const PRO = { provider: 'deepseek-official', id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', description: 'Stronger agentic coding.', inputModalities: ['text'] }
const FLASH = { provider: 'deepseek-official', id: 'deepseek-flash', name: 'DeepSeek-V41-Flash', inputModalities: ['text', 'image'] }

test('model/list: catalog descriptions only; the configured default is isDefault wherever it is listed', async () => {
  const catalog = new ModelCatalog(fakeLlm([PRO, FLASH]), { provider: 'deepseek-official', model: 'deepseek-flash' })
  const models = await catalog.codexModels()
  const flash = models.find((model) => model.id === 'deepseek-flash')
  const pro = models.find((model) => model.id === 'deepseek-v4-pro')
  assert.equal(flash.description, '', 'no made-up "DeepSeek · deepseek-flash" line')
  assert.equal(flash.isDefault, true)
  assert.equal(pro.isDefault, false)
  assert.equal(pro.description, '', 'Claude-style menu: names only')
  assert.equal(flash.badge, undefined, "Code's model menu shows names only: no 'Default' badge")
  assert.deepEqual(flash.supportedReasoningEfforts, EFFORTS.map((option) => ({ reasoningEffort: option.id, description: option.description })))
  assert.deepEqual([flash.inputModalities, pro.inputModalities], [['text', 'image'], ['text']])
  assert.deepEqual(catalog.defaultRoute(), { provider: 'deepseek-official', model: 'deepseek-flash' })
})

test('image input follows the route catalog entry; an unlisted route is text only', async () => {
  const catalog = new ModelCatalog(fakeLlm([PRO, FLASH]), { provider: 'deepseek-official', model: 'deepseek-flash' })
  await catalog.load()
  assert.equal(modalitiesOf(catalog.entryFor({ provider: 'deepseek-official', model: 'deepseek-flash' })).includes('image'), true)
  assert.equal(modalitiesOf(catalog.entryFor({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })).includes('image'), false)
  assert.equal(catalog.entryFor({ provider: 'deepseek-official', model: 'deepseek-v4-flash' }), undefined)
  assert.deepEqual(modalitiesOf(undefined), ['text'])
  // A stale configured id (the old 'deepseek-v4-flash') falls back to the first listed model.
  const stale = new ModelCatalog(fakeLlm([PRO, FLASH]), { provider: 'deepseek-official', model: 'deepseek-v4-flash' })
  assert.equal((await stale.codexModels()).find((model) => model.isDefault).id, 'deepseek-v4-pro')
})
