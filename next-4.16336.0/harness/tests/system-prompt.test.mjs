import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { createScope } from '@deepseek-ai/dsh-scope'
import { INSTRUCTIONS_SECTION, normalizeInstructions } from '../packages/codex-app-server/src/instructions.js'
import { applyCustomization, createCustomRef, installCustomization } from '../packages/codex-app-server/src/customization.js'
import { KEPT_SECTIONS, SUBAGENT_KEPT_SECTIONS, SYSTEM_PROMPT_SECTION, applySystemPrompt, installSubagentSystemPrompt, installSystemPrompt, interpolateLoose, normalizeSystemPrompt, previewCustom, systemPromptPreview } from '../packages/codex-app-server/src/system-prompt.js'
import { attachDeveloperInstructions } from '../packages/codex-app-server/src/structured.js'

const PERSONA = 'You are a coding agent powered by the {{model}} model, working inside OpenClaude Desktop.'

test('normalizeSystemPrompt: non-blank strings only, newlines normalized, never capped', () => {
  assert.equal(normalizeSystemPrompt('  You are X.\r\n'), 'You are X.')
  assert.equal(normalizeSystemPrompt('a\0b'), 'ab')
  assert.equal(normalizeSystemPrompt('   '), null)
  assert.equal(normalizeSystemPrompt(null), null)
  assert.equal(normalizeSystemPrompt(7), null)
  assert.equal(normalizeSystemPrompt('x'.repeat(300000)).length, 300000)
})

test('interpolateLoose: known variables with values only; the rest stays literal', () => {
  assert.equal(interpolateLoose('{{model}} in {{cwd}}', { model: 'm', cwd: '/w' }), 'm in /w')
  assert.equal(interpolateLoose('{{unknown}} {{model}} {{ model }} {{', { model: undefined }), '{{unknown}} {{model}} {{ model }} {{')
})

test('applySystemPrompt: replaces every section, keeps the session-input sections in order', () => {
  const assembly = {
    sections: [
      { name: 'harness:identity', text: 'You are an AI agent powered by DeepSeek Harness.' },
      { name: 'deployment:persona-prefix', text: PERSONA },
      { name: 'code-desktop:developer-instructions', text: 'DEV', interpolate: false },
      { name: 'tool:bash', text: 'Use bash.' },
      { name: 'tool:structured_output', text: 'STRUCT' },
      { name: 'deployment:persona-suffix', text: 'Your working directory is {{cwd}}.' },
      { name: INSTRUCTIONS_SECTION, text: 'PROJECT', interpolate: false },
    ],
    contexts: [{ name: 'sandbox', text: 'ctx' }],
    tools: [{ name: 'bash', description: 'd', parameters: {} }],
    variables: { model: 'deepseek-flash', cwd: '/w' },
  }
  assert.equal(applySystemPrompt(assembly, { systemPrompt: null }), assembly, 'no custom prompt: unchanged')
  assert.equal(applySystemPrompt(assembly, undefined), assembly)
  const out = applySystemPrompt(assembly, { systemPrompt: 'Be {{model}} at {{cwd}} {{other}}.' })
  assert.deepEqual(out.sections.map((s) => s.name), [SYSTEM_PROMPT_SECTION, 'code-desktop:developer-instructions', 'tool:structured_output', INSTRUCTIONS_SECTION])
  assert.deepEqual(out.sections[0], { name: SYSTEM_PROMPT_SECTION, text: 'Be deepseek-flash at /w {{other}}.', interpolate: false })
  assert.equal(out.tools, assembly.tools, 'tool schemas untouched')
  assert.deepEqual(out.contexts, [], 'no system-written runtime context with a custom prompt')
  assert.equal(renderPrompt(out), 'Be deepseek-flash at /w {{other}}.\n\nDEV\n\nSTRUCT\n\nPROJECT')
  assert.deepEqual(KEPT_SECTIONS, [INSTRUCTIONS_SECTION, 'code-desktop:developer-instructions', 'tool:structured_output'])
  // A subagent keeps its definition's role text as well.
  const child = applySystemPrompt(assembly, { systemPrompt: 'MINE' }, new Set(SUBAGENT_KEPT_SECTIONS))
  assert.deepEqual(child.sections.map((s) => s.name), [SYSTEM_PROMPT_SECTION, 'deployment:persona-prefix', 'code-desktop:developer-instructions', 'tool:structured_output', INSTRUCTIONS_SECTION])
  assert.equal(installSubagentSystemPrompt(undefined, {}) instanceof Function, true)
})

test('installSystemPrompt is a no-op without an event context', () => {
  const dispose = installSystemPrompt({}, createCustomRef())
  assert.equal(typeof dispose, 'function')
  dispose()
})

test('previewCustom: reads params.codeDesktop.customization leniently', () => {
  assert.deepEqual(previewCustom({ codeDesktop: { customization: { systemPrompt: ' S ', instructions: ' I ' } } }, normalizeInstructions), { systemPrompt: 'S', instructions: 'I' })
  assert.deepEqual(previewCustom({}, normalizeInstructions), { systemPrompt: null, instructions: null })
  assert.deepEqual(previewCustom({ codeDesktop: { customization: [] } }, normalizeInstructions), { systemPrompt: null, instructions: null })
})

// DSH Purge deliberately strips harness:identity. Make the fixture's identity
// policy explicit so these bridge tests also work with a pristine npm install;
// applySystemPrompt above still verifies removal of a populated identity section.
async function withRegistry(run) {
  const root = new Context()
  await root.plugin(SystemPrompt, { includeHarnessIdentity: false, personaPrefix: PERSONA, personaSuffix: 'Your working directory is {{cwd}}.' })
  return new Promise((resolve, reject) => root.plugin({
    inject: ['systemPrompt'],
    apply: async (ctx) => {
      try {
        ctx.systemPrompt.variable('model', (context) => context.agent?.options.model)
        ctx.systemPrompt.variable('provider', (context) => context.agent?.options.provider)
        ctx.systemPrompt.variable('cwd', (context) => context.agent?.session.header.cwd)
        ctx.systemPrompt.section({ name: 'tool:bash', order: ctx.systemPrompt.getSectionOrder('TOOL_BASH'), text: 'Use bash carefully.' })
        ctx.systemPrompt.tools(() => ({ schemas: [{ name: 'bash', description: 'Run a command', parameters: { type: 'object' } }] }))
        resolve(await run(ctx))
      } catch (error) { reject(error) }
    },
  }))
}
const agentFor = (key, model = 'deepseek-flash', cwd = '/w') => Object.assign(key, { options: { provider: 'deepseek-official', model }, session: { header: { cwd } } })
const contextFor = (agent) => ({ agent, scope: agent })

test('real registry: the listener is agent-scoped and replaces the built-in prompt from the next assembly', async () => {
  const result = await withRegistry(async (ctx) => {
    const agent = agentFor({})
    const other = agentFor({})
    const scope = createScope(ctx, agent)
    const ref = createCustomRef()
    const dispose = installCustomization(scope.ctx, ref, { catalog: undefined })
    attachDeveloperInstructions(scope.ctx, 'Workflow agent rules.')
    const before = renderPrompt(await ctx.systemPrompt.assemble(contextFor(agent)))
    applyCustomization(ref, { codeDesktop: { customization: { systemPrompt: "You are Captain Whale ({{model}}) in {{cwd}}. Always start replies with 'Arrr'.", instructions: 'Use pnpm.' } } })
    const custom = await ctx.systemPrompt.assemble(contextFor(agent))
    const otherAgent = renderPrompt(await ctx.systemPrompt.assemble(contextFor(other)))
    applyCustomization(ref, { codeDesktop: { customization: { instructions: null } } })
    const noProject = renderPrompt(await ctx.systemPrompt.assemble(contextFor(agent)))
    applyCustomization(ref, { codeDesktop: { customization: { systemPrompt: null } } })
    const cleared = renderPrompt(await ctx.systemPrompt.assemble(contextFor(agent)))
    dispose()
    const disposed = renderPrompt(await ctx.systemPrompt.assemble(contextFor(agent)))
    return { before, custom, text: renderPrompt(custom), otherAgent, noProject, cleared, disposed }
  })
  assert.match(result.before, /^You are a coding agent powered by the deepseek-flash model/)
  assert.equal(result.text, "You are Captain Whale (deepseek-flash) in /w. Always start replies with 'Arrr'.\n\nWorkflow agent rules.\n\nUse pnpm.")
  assert.deepEqual(result.custom.tools.map((t) => t.name), ['bash'], 'tools are still sent as schemas')
  assert.equal(result.otherAgent, 'You are a coding agent powered by the deepseek-flash model, working inside OpenClaude Desktop.\n\nUse bash carefully.\n\nYour working directory is /w.', 'other agents keep the built-in prompt')
  assert.doesNotMatch(result.otherAgent, /Captain Whale/)
  assert.equal(result.noProject, "You are Captain Whale (deepseek-flash) in /w. Always start replies with 'Arrr'.\n\nWorkflow agent rules.")
  assert.equal(result.cleared, result.before, 'null restores the built-in prompt')
  assert.equal(result.disposed, result.before)
})

test('systemPromptPreview: with an agent (exact) and without one (global layer + route variables)', async () => {
  const result = await withRegistry(async (ctx) => {
    const agent = agentFor({}, 'deepseek-pro', '/repo')
    const scope = createScope(ctx, agent)
    const ref = createCustomRef()
    applyCustomization(ref, { codeDesktop: { customization: { systemPrompt: 'Thread value.', instructions: 'Thread project.' } } })
    installCustomization(scope.ctx, ref, { catalog: undefined })
    const services = { systemPrompt: ctx.systemPrompt, assembleContextFor: contextFor }
    const withAgent = await systemPromptPreview(services, { agent, cwd: '/repo', route: {}, custom: { systemPrompt: 'Preview {{model}}.', instructions: 'Preview project.' } })
    const withAgentDefault = await systemPromptPreview(services, { agent, cwd: '/repo', route: {}, custom: { systemPrompt: null, instructions: 'P.' } })
    const fresh = await systemPromptPreview(services, { cwd: '/new', route: { provider: 'deepseek-official', model: 'deepseek-flash' }, custom: { systemPrompt: 'Only {{cwd}}.', instructions: 'Fresh project.' } })
    const freshDefault = await systemPromptPreview(services, { cwd: '/new', route: { provider: 'deepseek-official', model: 'deepseek-flash' }, custom: { systemPrompt: null, instructions: null } })
    const live = renderPrompt(await ctx.systemPrompt.assemble(contextFor(agent)))
    return { withAgent, withAgentDefault, fresh, freshDefault, live }
  })
  assert.equal(result.withAgent.text, 'Preview deepseek-pro.\n\nPreview project.', 'the preview uses the app values, not the thread ref')
  assert.equal(result.withAgent.exact, true)
  assert.equal(result.withAgent.custom, true)
  assert.deepEqual(result.withAgent.sections, [{ name: SYSTEM_PROMPT_SECTION, chars: 21 }, { name: INSTRUCTIONS_SECTION, chars: 16 }])
  assert.deepEqual(result.withAgent.tools, ['bash'])
  assert.deepEqual(result.withAgent.variables, { provider: 'deepseek-official', model: 'deepseek-pro', cwd: '/repo' })
  assert.equal(result.withAgent.defaultText, 'You are a coding agent powered by the deepseek-pro model, working inside OpenClaude Desktop.\n\nUse bash carefully.\n\nYour working directory is /repo.')
  assert.doesNotMatch(result.withAgent.defaultText, /Preview project|Thread project/, 'the built-in default carries no customization')
  assert.match(result.withAgent.defaultTemplate, /powered by the \{\{model\}\} model[\s\S]*Your working directory is \{\{cwd\}\}\.$/, 'the template keeps the references')
  assert.equal(interpolateLoose(result.withAgent.defaultTemplate, result.withAgent.variables), result.withAgent.defaultText, 'pasting the template back gives the built-in text')
  assert.match(result.withAgentDefault.text, /Use bash carefully\.[\s\S]*Your working directory is \/repo\.\n\nP\.$/, 'without a custom prompt the project text is appended to the built-in one')
  assert.equal(result.live, 'Thread value.\n\nThread project.', 'a preview does not change the thread')
  assert.equal(result.fresh.text, 'Only /new.\n\nFresh project.')
  assert.equal(result.fresh.exact, false)
  assert.equal(result.freshDefault.text, result.freshDefault.defaultText)
  assert.match(result.freshDefault.text, /powered by the deepseek-flash model[\s\S]*Your working directory is \/new\.$/)
})
