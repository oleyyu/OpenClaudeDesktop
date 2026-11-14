/**
 * Codex thread/turn options the Harness agent has no parameter for, applied
 * through the agent's own scope (its setup context):
 *
 *   developerInstructions   thread/start: a scoped system-prompt section after
 *                           the deployment persona (kept in the bridge store,
 *                           so a resumed session gets it back)
 *   outputSchema            turn/start: for that turn only, a scoped
 *                           `structured_output` capture tool with the schema as
 *                           its parameters, its instruction and a guard — the
 *                           same mechanism Harness one-shot subagents use
 *                           (dsh-subagent-in-process-driver). The accepted
 *                           arguments are the turn's answer: projection.js
 *                           turns the call into the closing agentMessage
 *                           (JSON text), which is what Codex clients read.
 *
 * Dynamic workflow agents (the workflow runner's agent({schema}) and
 * agentType system prompts) are the main users.
 */

import { assertObjectJsonSchema, validateJsonSchemaValue, ToolArgsError } from '@deepseek-ai/dsh-tools'
import { invalidParams } from './transport.js'
import { isWorkflowTool } from './workflows.js'

export const STRUCTURED_OUTPUT_TOOL = 'structured_output'
const INSTRUCTIONS_SECTION = 'code-desktop:developer-instructions'

const STRUCTURED_OUTPUT_INSTRUCTION = `When you have your final answer, you MUST report it by calling the \`${STRUCTURED_OUTPUT_TOOL}\` tool with arguments matching its parameter schema exactly. Do not finish with a plain text answer: only the tool call counts as your result.`

/** The developer instructions of a thread/start, or null. */
export function developerInstructionsOf(params) {
  const value = params?.developerInstructions
  return typeof value === 'string' && value.trim() ? value : null
}

/**
 * Register the developer instructions on an agent scope.
 * @param {any} agentCtx - the agent's setup context
 * @returns {() => void} the disposer
 */
export function attachDeveloperInstructions(agentCtx, text) {
  const prompt = agentCtx.systemPrompt
  const order = prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') + 1
  return prompt.section({ name: INSTRUCTIONS_SECTION, order, text, interpolate: false })
}

/**
 * The turn's output schema, checked before the turn starts: an object-rooted
 * JSON Schema in the subset Harness tools accept, else INVALID_PARAMS.
 * @returns {object | null}
 */
export function outputSchemaOf(params) {
  const schema = params?.outputSchema
  if (schema === undefined || schema === null) return null
  try {
    assertObjectJsonSchema(schema)
  } catch (error) {
    throw invalidParams(`outputSchema is not supported by the DeepSeek core: ${error?.message ?? error}`)
  }
  return schema
}

/**
 * Attach a one-turn structured-output capture to an agent scope. After an
 * accepted capture the guard refuses further tool calls, and the capture
 * concludes the turn.
 * @param {any} agentCtx - the agent's setup context
 * @param {object} schema - from outputSchemaOf
 * @returns {() => void} disposes the tool, section and guard
 */
export function attachStructuredOutput(agentCtx, schema) {
  let captured = false
  const disposers = []
  try {
    disposers.push(agentCtx.tools.register({
      name: STRUCTURED_OUTPUT_TOOL,
      description: "Report your final structured result. Call this exactly once, when your answer is complete; the arguments must match this tool's parameter schema exactly.",
      parameters: schema,
      output: {
        schema: { type: 'object', properties: { recorded: { type: 'boolean', const: true } }, required: ['recorded'], additionalProperties: false },
        render: () => [{ type: 'text', text: 'Structured output recorded.' }],
      },
      execute(args, exec) {
        const violations = validateJsonSchemaValue(schema, args)
        if (violations.length > 0) throw new ToolArgsError(violations)
        captured = true
        exec.concludeTurn?.()
        return Promise.resolve({ recorded: true })
      },
    }))
    disposers.push(agentCtx.systemPrompt.section({
      name: `tool:${STRUCTURED_OUTPUT_TOOL}`,
      order: agentCtx.systemPrompt.getSectionOrder('STRUCTURED_OUTPUT'),
      text: STRUCTURED_OUTPUT_INSTRUCTION,
    }))
    disposers.push(agentCtx.tools.guard((exec) => (captured ? `structured output already recorded: the run is complete, so \`${exec.name}\` is not executed` : undefined)))
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    for (const dispose of disposers.reverse()) {
      try { dispose() } catch {}
    }
  }
}

/**
 * Whether a request lets the model run dynamic workflows: OpenClaude Desktop's
 * Dynamic workflows setting, which its main process stamps on every
 * DeepSeek-mode thread/start, thread/resume, turn/start and permission change
 * (`codeDesktop.dynamicWorkflows`). null: the request does not say.
 * @returns {boolean | null}
 */
export function workflowsAllowedBy(params) {
  const hint = params?.codeDesktop
  if (!hint || typeof hint !== 'object' || typeof hint.dynamicWorkflows !== 'boolean') return null
  return hint.dynamicWorkflows
}

/**
 * Hide the `workflow` tool from one agent: its schema (a scoped restriction)
 * and its prompt guidance (an empty scoped section shadowing `tool:workflow`).
 * A profile without the tool has nothing to hide.
 * @param {any} agentCtx - the agent's setup context
 * @returns {(() => void) | null} the disposer that shows it again
 */
export function hideWorkflowTool(agentCtx) {
  const disposers = []
  const names = agentCtx.tools.schemas().map(tool => tool.name).filter(isWorkflowTool)
  if (!names.length) return null
  disposers.push(agentCtx.tools.restrict({ deny: names }))
  for (const name of names) disposers.push(agentCtx.systemPrompt.section({ name: `tool:${name}`, order: agentCtx.systemPrompt.getSectionOrder('TOOL_WORKFLOW'), text: '' }))
  return () => {
    for (const dispose of disposers.reverse()) {
      try { dispose() } catch {}
    }
  }
}
