/**
 * The Harness command registry (dsh-commands) as OpenClaude Desktop's core slash
 * commands: codeDesktop/commands/list returns the commands the running
 * profile registers for a thread's agent (/goal, /feedback, …), and
 * codeDesktop/commands/execute runs one directly against the agent, as the
 * DeepSeek app's composer does (no model message; the registry logs
 * command/run and command/done).
 *
 * Commands OpenClaude Desktop already drives through its own protocol are not
 * listed and refuse to run here: /compact is thread/compact/start (a Codex
 * compaction turn), /plan is the Plan permission mode and /permission the
 * Mode picker (approval.js keeps Harness plan mode and the permission preset
 * in step with them), so running them directly would leave the app's state
 * behind.
 *
 * A command can start model work outside turn/start: /goal arms a goal and the
 * goal round driver queues a turn on the idle agent at once. That turn runs
 * under the thread's permission, so execute carries turn/start's permission
 * params (approvalPolicy, sandbox or sandboxPolicy, codeDesktop hints) and the
 * bridge applies them before the command runs; a request without them is
 * refused rather than run under a stale or default mode.
 *
 * @module @code-desktop/dsh-codex-app-server/commands
 */

import { invalidParams } from './transport.js'

export const APP_OWNED_COMMANDS = new Set(['compact', 'plan', 'permission'])

// dsh-commands parseCommand: a lowercase name of letters, digits, `_` or `-`.
const COMMAND_NAME = /^[a-z0-9_-]+$/u

/**
 * Registry descriptors → codeDesktop/commands/list rows.
 * @param {ReadonlyArray<{name: string, description?: string, input?: {hint?: string, attachments?: boolean}, definitionId?: string}>} descriptors
 */
export function listedCommands(descriptors) {
  return (Array.isArray(descriptors) ? descriptors : [])
    .filter((command) => typeof command?.name === 'string' && COMMAND_NAME.test(command.name) && !APP_OWNED_COMMANDS.has(command.name))
    .map((command) => ({
      name: command.name,
      description: typeof command.description === 'string' ? command.description : '',
      inputHint: typeof command.input?.hint === 'string' && command.input.hint ? command.input.hint : null,
      acceptsAttachments: command.input?.attachments === true,
      definitionId: typeof command.definitionId === 'string' ? command.definitionId : null,
    }))
}

/**
 * The command line the registry parses: `/<name>` and, when given, its input.
 * @param {unknown} name - the command name, with or without its slash
 * @param {unknown} args - the free-form input after the name
 * @returns {string}
 */
export function commandLine(name, args) {
  const bare = typeof name === 'string' ? name.trim().replace(/^\//u, '') : ''
  if (!COMMAND_NAME.test(bare)) throw invalidParams('command must be a slash command name such as "goal".')
  if (APP_OWNED_COMMANDS.has(bare)) throw invalidParams(`/${bare} runs through OpenClaude Desktop's own control, not as a core command.`)
  const input = typeof args === 'string' ? args.replace(/^\s+/u, '') : ''
  return input ? `/${bare} ${input}` : `/${bare}`
}

/**
 * The permission an execute request must carry: the approval policy and the
 * sandbox, as turn/start sends them (permission-policy turnPermissionParams).
 * @param {unknown} params
 */
export function requireCommandPermission(params) {
  const policy = typeof params?.approvalPolicy === 'string' && params.approvalPolicy
  const sandbox = (typeof params?.sandbox === 'string' && params.sandbox) || (typeof params?.sandboxPolicy?.type === 'string' && params.sandboxPolicy.type)
  if (!policy || !sandbox) throw invalidParams('A core command needs the session\'s permission (approvalPolicy and sandboxPolicy, as turn/start sends them): it can start a model turn.')
}

/**
 * codeDesktop/commands/execute: the request checked, the thread opened and
 * brought to the request's permission (and model, customization) by prepare,
 * then the command run against its agent.
 * @param {{execute(agent: object, line: string, attachments: unknown[], signal: AbortSignal): Promise<object | undefined>}} commands the dsh-commands registry
 * @param {object} params the request
 * @param {{open: () => Promise<{agent: object}>, prepare: (thread: object, params: object) => Promise<void>}} hooks
 */
export async function executeCommand(commands, params, { open, prepare }) {
  const line = commandLine(params?.command, params?.args)
  requireCommandPermission(params)
  const thread = await open()
  await prepare(thread, params)
  const execution = await commands.execute(thread.agent, line, [], new AbortController().signal)
  if (!execution) throw invalidParams(`Unknown command: ${line.split(' ')[0]}`)
  return commandResult(execution)
}

/** A settled CommandExecution → the codeDesktop/commands/execute response. */
export function commandResult(execution) {
  const result = execution?.result
  const kind = result?.kind === 'error' ? 'error' : 'success'
  return { kind, text: typeof result?.text === 'string' && result.text ? result.text : null, commandId: execution?.commandId ?? null }
}
