/**
 * OpenClaude Desktop custom instructions (Settings → Instructions).
 *
 * The app composes the project's .code-desktop/instructions.md and the project
 * override into one block and sends it on thread/start, thread/resume and
 * turn/start as params.codeDesktop.customization.instructions (string | null;
 * customization.js stores it on the thread's ref). The global text is the
 * whole system prompt instead (customization.systemPrompt, system-prompt.js);
 * this section is kept after it.
 *
 * installInstructions registers one agent-scoped system-prompt section right
 * after the deployment persona suffix. Its text is read from the ref at every
 * assembly, so a change applies from the agent's next model step. The section
 * is literal (no {{variable}} interpolation). Subagent children have their own
 * scopes and do not inherit it.
 */

export const INSTRUCTIONS_SECTION = 'code-desktop:custom-instructions'
/**
 * AssembleContext field codeDesktop/systemPrompt/preview sets so one assembly
 * uses the app's values ({ systemPrompt, instructions }) instead of the
 * thread's ref (system-prompt.js).
 */
export const PREVIEW_CUSTOM = 'codeDesktopCustom'
// No cap: custom instructions are passed through whole (user preference).
export const INSTRUCTIONS_CAP = Infinity

/**
 * Bridge-side check of the app's value: a non-blank string (never capped), else null.
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeInstructions(value) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\0/g, '').trim()
  return text ? text.slice(0, INSTRUCTIONS_CAP) : null
}

/**
 * @param {import('@deepseek-ai/cordis').Context} agentCtx - the Agent's scoped context.
 * @param {{ instructions?: string | null }} ref - mutable customization ref.
 * @returns {() => void} disposer (a no-op when the prompt registry is absent).
 */
export function installInstructions(agentCtx, ref) {
  const systemPrompt = agentCtx?.get?.('systemPrompt')
  if (!systemPrompt || typeof systemPrompt.section !== 'function') return () => {}
  let order = 10250
  try { order = systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX') + 50 } catch {}
  return systemPrompt.section({
    name: INSTRUCTIONS_SECTION,
    order,
    interpolate: false,
    text: (context) => (context?.[PREVIEW_CUSTOM] ?? ref).instructions ?? '',
  })
}
