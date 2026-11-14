import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { createScope } from '@deepseek-ai/dsh-scope'
import { INSTRUCTIONS_SECTION, installInstructions, normalizeInstructions } from '../packages/codex-app-server/src/instructions.js'
import { applyCustomization, createCustomRef, installCustomization } from '../packages/codex-app-server/src/customization.js'

test('normalizeInstructions: strings only, trimmed, not capped, empty is null', () => {
  assert.equal(normalizeInstructions('  hi  '), 'hi')
  assert.equal(normalizeInstructions(''), null)
  assert.equal(normalizeInstructions(null), null)
  assert.equal(normalizeInstructions(42), null)
  assert.equal(normalizeInstructions('x'.repeat(50000)).length, 50000)
})

test('applyCustomization: a present key replaces (null clears), an absent key keeps', () => {
  const ref = createCustomRef()
  assert.deepEqual(ref, { systemPrompt: undefined, instructions: undefined, modelParams: undefined })
  applyCustomization(ref, { codeDesktop: { customization: { instructions: 'A', systemPrompt: ' S ' } } })
  assert.equal(ref.instructions, 'A')
  assert.equal(ref.systemPrompt, 'S')
  applyCustomization(ref, { codeDesktop: { customization: { modelParams: null } } })
  assert.equal(ref.instructions, 'A')
  assert.equal(ref.modelParams, null)
  applyCustomization(ref, {})
  applyCustomization(ref, { developerInstructions: 'Do not claim to be Claude.' })
  assert.equal(ref.instructions, 'A', 'developerInstructions is still ignored')
  applyCustomization(ref, { codeDesktop: { customization: { instructions: null } } })
  assert.equal(ref.instructions, null)
  assert.equal(ref.systemPrompt, 'S', 'an absent systemPrompt key keeps it')
  applyCustomization(ref, { codeDesktop: { customization: { systemPrompt: null } } })
  assert.equal(ref.systemPrompt, null)
  assert.equal(applyCustomization(undefined, {}), undefined)
})

test('installInstructions is a no-op without the prompt registry', () => {
  const dispose = installInstructions({ get: () => undefined }, createCustomRef())
  assert.equal(typeof dispose, 'function')
  dispose()
})

test('installInstructions registers one literal section after the persona suffix', () => {
  const calls = []
  const systemPrompt = { getSectionOrder: (name) => (name === 'DEPLOYMENT_PERSONA_SUFFIX' ? 10200 : 0), section: (s) => { calls.push(s); return () => calls.push('disposed') } }
  const ref = { instructions: 'first' }
  const dispose = installInstructions({ get: (name) => (name === 'systemPrompt' ? systemPrompt : undefined) }, ref)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, INSTRUCTIONS_SECTION)
  assert.equal(calls[0].order, 10250)
  assert.equal(calls[0].interpolate, false)
  assert.equal(calls[0].text(), 'first')
  ref.instructions = undefined
  assert.equal(calls[0].text(), '')
  dispose()
  assert.equal(calls.at(-1), 'disposed')
})

test('real prompt registry: scoped to the agent, literal, and read at every assembly', async () => {
  const root = new Context()
  await root.plugin(SystemPrompt, { includeHarnessIdentity: false })
  const result = await new Promise((resolve, reject) => root.plugin({
    inject: ['systemPrompt'],
    apply: async (ctx) => {
      try {
        const key = {}
        const scope = createScope(ctx, key)
        const ref = createCustomRef()
        applyCustomization(ref, { codeDesktop: { customization: { instructions: 'End every reply with {{word}} PINEAPPLE.' } } })
        const dispose = installCustomization(scope.ctx, ref, { catalog: undefined })
        const scoped = renderPrompt(await ctx.systemPrompt.assemble({ scope: key }))
        const other = renderPrompt(await ctx.systemPrompt.assemble({ scope: {} }))
        applyCustomization(ref, { codeDesktop: { customization: { instructions: 'Changed.' } } })
        const changed = renderPrompt(await ctx.systemPrompt.assemble({ scope: key }))
        applyCustomization(ref, { codeDesktop: { customization: { instructions: null } } })
        const cleared = renderPrompt(await ctx.systemPrompt.assemble({ scope: key }))
        dispose()
        resolve({ scoped, other, changed, cleared })
      } catch (error) { reject(error) }
    },
  }))
  assert.match(result.scoped, /End every reply with \{\{word\}\} PINEAPPLE\.$/)
  assert.doesNotMatch(result.other, /PINEAPPLE/, 'another agent (or a subagent child scope) does not see it')
  assert.match(result.changed, /Changed\.$/)
  assert.doesNotMatch(result.cleared, /Changed|PINEAPPLE/)
})
