/**
 * Per-thread OpenClaude Desktop customization carried on thread/start,
 * thread/resume and turn/start as params.codeDesktop.customization:
 *   systemPrompt (C1) - the user's global instructions, which replace the whole
 *                       built-in system prompt when set, string | null (system-prompt.js)
 *   instructions (C1) - the composed project instructions, string | null
 *   modelParams  (C5) - per-model request parameters, see model-params.js
 * A present key (including null) replaces the thread's value; an absent key
 * keeps it. The agent-scoped hooks read the ref at every assembly/request.
 */
import { installInstructions, normalizeInstructions } from './instructions.js'
import { installModelParams, normalizeModelParams, rememberContextWindows } from './model-params.js'
import { installSystemPrompt, normalizeSystemPrompt } from './system-prompt.js'

export function createCustomRef() {
  return { systemPrompt: undefined, instructions: undefined, modelParams: undefined }
}

/**
 * @param {{ systemPrompt?: string | null, instructions?: string | null, modelParams?: unknown }} ref
 * @param {any} params - the request params.
 */
export function applyCustomization(ref, params) {
  if (!ref) return ref
  const custom = params?.codeDesktop?.customization
  if (!custom || typeof custom !== 'object' || Array.isArray(custom)) return ref
  if (Object.hasOwn(custom, 'systemPrompt')) ref.systemPrompt = normalizeSystemPrompt(custom.systemPrompt)
  if (Object.hasOwn(custom, 'instructions')) ref.instructions = normalizeInstructions(custom.instructions)
  if (Object.hasOwn(custom, 'modelParams')) ref.modelParams = custom.modelParams === null ? null : normalizeModelParams(custom.modelParams)
  if (Object.hasOwn(custom, 'modelParams')) rememberContextWindows(ref.modelParams)
  return ref
}

/**
 * Installs every agent-scoped customization hook; returns one disposer.
 * @param {import('@deepseek-ai/cordis').Context} agentCtx
 * @param {ReturnType<typeof createCustomRef>} ref
 * @param {{ catalog?: any }} [options]
 */
export function installCustomization(agentCtx, ref, { catalog } = {}) {
  const disposers = [installInstructions(agentCtx, ref), installSystemPrompt(agentCtx, ref), installModelParams(agentCtx, ref, { catalog })]
  return () => { for (const dispose of disposers) if (typeof dispose === 'function') dispose() }
}
