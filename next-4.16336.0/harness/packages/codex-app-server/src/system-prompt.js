/**
 * OpenClaude Desktop custom system prompt (Settings → Instructions → Global instructions).
 *
 * When the user's global instructions are set, they ARE the system prompt:
 * the app sends them as params.codeDesktop.customization.systemPrompt
 * (string | null, customization.js stores it on the thread's ref) and an
 * agent-scoped 'system-prompt/assemble' listener replaces every assembled
 * section (Harness identity, deployment persona prefix/suffix, tool guidance,
 * harness source, web surface …) with that text. Kept after it, in their
 * assembled order, are only sections that carry the session's own input:
 *   - code-desktop:custom-instructions   project instructions (instructions.js)
 *   - code-desktop:developer-instructions a client's thread/start developerInstructions (structured.js)
 *   - tool:structured_output             a turn's outputSchema capture (structured.js)
 * The last two exist only for workflow agents / structured turns.
 *
 * Tools are still sent as API tool schemas (assembly.tools is untouched). The
 * runtime contexts the harness adds as user-role messages (approval:policy,
 * sandbox:policy, subagent:delegation) are dropped too: with a custom prompt
 * nothing the system wrote reaches the model. The policies are still enforced.
 *
 * {{name}} in the user's text is replaced by the assembly variable of that
 * name when it has a value (model, provider, cwd); anything else stays
 * literal, so a stray {{…}} never fails a turn. The listener reads the ref at
 * every assembly, so a change applies from the next model step. Subagent
 * children (their own scopes) get the root thread's custom prompt too
 * (installSubagentSystemPrompt): no built-in prose reaches them either; they
 * keep their definition's role text (deployment:persona-prefix, the agent
 * file's body or a workflow agent's persona) and structured-output capture.
 *
 * codeDesktop/systemPrompt/preview runs the same assembly for a loaded
 * thread (its agent scope) or, without one, the global layer with the
 * route's variables (systemPromptPreview below).
 */
import { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { INSTRUCTIONS_SECTION, PREVIEW_CUSTOM } from './instructions.js'

export const SYSTEM_PROMPT_SECTION = 'code-desktop:system-prompt'
/** Sections that survive a custom system prompt: the session's own input, never built-in prose. */
export const KEPT_SECTIONS = Object.freeze([INSTRUCTIONS_SECTION, 'code-desktop:developer-instructions', 'tool:structured_output'])
const KEPT = new Set(KEPT_SECTIONS)
/** A subagent also keeps the role its definition gives it. */
export const SUBAGENT_KEPT_SECTIONS = Object.freeze([...KEPT_SECTIONS, 'deployment:persona-prefix'])
const SUBAGENT_KEPT = new Set(SUBAGENT_KEPT_SECTIONS)
export { PREVIEW_CUSTOM }

/**
 * Bridge-side check of the app's value: a non-blank string (NUL removed,
 * newlines normalized, trimmed, never capped), else null.
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeSystemPrompt(value) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\0/g, '').replace(/\r\n?/g, '\n').trim()
  return text || null
}

/**
 * {{name}} → variables[name] when it is a string; everything else is literal.
 * @param {string} text
 * @param {Record<string, string | undefined>} [variables]
 */
export function interpolateLoose(text, variables = {}) {
  return text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (match, name) => (Object.hasOwn(variables, name) && typeof variables[name] === 'string' ? variables[name] : match))
}

/**
 * The assembly with a custom system prompt applied (unchanged without one).
 * @param {import('@deepseek-ai/dsh-system-prompt').PromptAssembly} assembly
 * @param {{ systemPrompt?: string | null } | undefined} custom
 */
export function applySystemPrompt(assembly, custom, keep = KEPT) {
  const systemPrompt = normalizeSystemPrompt(custom?.systemPrompt)
  if (!systemPrompt || !assembly) return assembly
  const kept = (assembly.sections ?? []).filter((section) => keep.has(section.name))
  return {
    ...assembly,
    sections: [{ name: SYSTEM_PROMPT_SECTION, text: interpolateLoose(systemPrompt, assembly.variables), interpolate: false }, ...kept],
    contexts: [],
  }
}

/**
 * Agent-scoped listener: scope-filtered dispatch means only this agent's
 * assemblies reach it. Prepended so it has the last word over listeners
 * registered after it.
 * @param {import('@deepseek-ai/cordis').Context} agentCtx
 * @param {{ systemPrompt?: string | null }} ref
 * @returns {() => void}
 */
export function installSystemPrompt(agentCtx, ref) {
  if (typeof agentCtx?.on !== 'function') return () => {}
  const dispose = agentCtx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembly = await next()
    return applySystemPrompt(assembly, context?.[PREVIEW_CUSTOM] ?? ref)
  }, { prepend: true })
  return typeof dispose === 'function' ? dispose : () => {}
}

/**
 * A subagent's scope (any depth): the root thread's custom prompt replaces its built-in sections the same way, read
 * from the root's ref at every assembly; its definition's role text stays (SUBAGENT_KEPT_SECTIONS).
 * @param {import('@deepseek-ai/cordis').Context} childCtx
 * @param {{ systemPrompt?: string | null }} rootRef
 * @returns {() => void}
 */
export function installSubagentSystemPrompt(childCtx, rootRef) {
  if (typeof childCtx?.on !== 'function') return () => {}
  const dispose = childCtx.on('system-prompt/assemble', async (_assembly, _context, next) => applySystemPrompt(await next(), rootRef, SUBAGENT_KEPT), { prepend: true })
  return typeof dispose === 'function' ? dispose : () => {}
}

/** Normalized preview values: { systemPrompt, instructions } from params.codeDesktop.customization. */
export function previewCustom(params, normalizeInstructions) {
  const custom = params?.codeDesktop?.customization
  const source = custom && typeof custom === 'object' && !Array.isArray(custom) ? custom : {}
  return { systemPrompt: normalizeSystemPrompt(source.systemPrompt), instructions: normalizeInstructions(source.instructions) }
}

const describe = (assembly) => (assembly.sections ?? []).filter((section) => section.text).map((section) => ({ name: section.name, chars: section.text.length }))

/**
 * codeDesktop/systemPrompt/preview: the exact rendered system prompt for the
 * app's values (text), plus the built-in default without customization,
 * rendered (defaultText) and with its {{variable}} references kept
 * (defaultTemplate, for "Start from the built-in default").
 *
 * With a thread (`agent`): the agent's real assembly, its scoped sections and
 * variables included; `exact: true`. Without one: the global layer with the
 * route's variables (provider, model, cwd) and the project instructions
 * appended; agent-scoped extras of a running session (plan policy, a
 * workflow's developer instructions) are absent; `exact: false`.
 *
 * @param {{ systemPrompt: any, assembleContextFor?: (agent: any) => object }} services
 * @param {{ agent?: any, cwd: string, route: { provider?: string, model?: string }, custom: { systemPrompt: string | null, instructions: string | null } }} input
 */
export async function systemPromptPreview({ systemPrompt, assembleContextFor }, { agent, cwd, route, custom }) {
  const none = { systemPrompt: null, instructions: null }
  let finalAssembly, defaultAssembly
  if (agent && assembleContextFor) {
    finalAssembly = await systemPrompt.assemble({ ...assembleContextFor(agent), [PREVIEW_CUSTOM]: custom })
    defaultAssembly = await systemPrompt.assemble({ ...assembleContextFor(agent), [PREVIEW_CUSTOM]: none })
  } else {
    const fill = (assembly, values) => {
      const variables = { ...assembly.variables }
      for (const [name, value] of Object.entries({ provider: route?.provider, model: route?.model, cwd })) if (variables[name] === undefined && typeof value === 'string') variables[name] = value
      const sections = values.instructions ? [...assembly.sections, { name: INSTRUCTIONS_SECTION, text: values.instructions, interpolate: false }] : assembly.sections
      return applySystemPrompt({ ...assembly, variables, sections }, values)
    }
    const global = await systemPrompt.assemble({})
    finalAssembly = fill(global, custom)
    defaultAssembly = fill(global, none)
  }
  // The built-in prompt with every variable left as its {{name}} reference: "Start from the
  // built-in default" seeds the editor with it, so the model and folder stay live.
  const references = Object.fromEntries(Object.keys(defaultAssembly.variables ?? {}).map((name) => [name, `{{${name}}}`]))
  return {
    text: renderPrompt(finalAssembly),
    defaultText: renderPrompt(defaultAssembly),
    defaultTemplate: renderPrompt({ ...defaultAssembly, variables: references }),
    custom: Boolean(custom.systemPrompt),
    sections: describe(finalAssembly),
    tools: (finalAssembly.tools ?? []).map((tool) => tool.name),
    variables: { provider: finalAssembly.variables?.provider ?? null, model: finalAssembly.variables?.model ?? null, cwd: finalAssembly.variables?.cwd ?? null },
    exact: Boolean(agent),
  }
}
