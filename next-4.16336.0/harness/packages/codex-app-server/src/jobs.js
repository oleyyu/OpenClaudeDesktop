/**
 * Harness background jobs of shell commands (dsh-jobs) → Codex background
 * terminals.
 *
 * With a job registry composed, `bash`/`pwsh` run every command as a job: a
 * `run_in_background` call returns `started background job <id>` at once, and
 * a foreground command that outlives its timeout returns `[still running after
 * <ms>ms; moved to background job <id>]`. Codex keeps such a command's
 * commandExecution item `inProgress` with a `processId` until the process
 * exits, lists it in thread/backgroundTerminals/list and stops it with
 * thread/backgroundTerminals/terminate. The projector does the same here: the
 * job id is the processId, and the item settles when the job does.
 *
 * Settlement comes from the live registry (index.js) or, in history, from the
 * durable records that name the job: the completion notice dsh-tool-jobs
 * delivers in the session, a `job_output` read that reports a terminal status,
 * or a `job_kill` result. A job none of them settled died with the process
 * that ran it (jobs-local jobs never outlive their owner).
 *
 * A `run_in_background` delegation (subagent, subagent_fork without
 * continuable mode) is a job of kind `subagent`: its collabAgentToolCall row
 * stays `inProgress`, linked to the child the parent's `subagent/catalog`
 * names, and settles from the same records. It is no background terminal (the
 * child is listed and stopped as a sub-agent thread).
 *
 * @module @code-desktop/dsh-codex-app-server/jobs
 */

// dsh-tool-bash / dsh-tool-pwsh result texts (`render` of the background and promoted outputs).
// Both are matched against the whole result: `started background job` only for
// a run_in_background call, and the promoted marker only with the exact tail
// renderPromoted ends with, so a foreground command whose output merely quotes
// either text (a test file, a log) stays an ordinary finished command.
const STARTED_JOB = /^started background job (\S+)\s*$/u
const PROMOTED_JOB = /(?:^|\n)\[still running after \d+ms; moved to background job (\S+)\]\nThe command keeps running in the background\. You will be notified when it finishes; read newer output with job_output, stop it with job_kill\.$/u
// dsh-tool-jobs statusLine: `[status: <status>]` or `[status: <status>, <detail>]`.
const STATUS_LINE = /\[status: (running|stopping|completed|killed|failed)(?:, ([^\n]*))?\]\s*$/u
// dsh-tool-jobs fitCompletionNotice: `background job <id> (<kind>: <label>) finished [status: …]. Read its output with job_output.`
// (a capped notice keeps the id and drops the rest).
const NOTICE_JOB = /^background job (\S+)(?=[\s(]|$)/u
const NOTICE_STATUS = ' finished [status: '
const NOTICE_TAIL = /^\[status: (\w+)(?:, ([^\n]*?))?\](?:\. Read its output with job_output\.)?\s*$/u
const KILL_REQUESTED = /^requested cancellation of job (\S+)\s*$/u
const KILL_FINISHED = /^job (\S+) had already finished /u
const EXIT_CODE = /\bexit code: (-?\d+)/u

/** The tools whose calls can become a background terminal (commandExecution items only). */
export const SHELL_TOOLS = new Set(['bash', 'pwsh'])

const TERMINAL = new Set(['completed', 'killed', 'failed'])
export const isLiveJobStatus = (status) => status === 'running' || status === 'stopping'

/**
 * The job a shell tool's result handed to the background, with the output the
 * call already consumed (the promoted read; nothing for run_in_background).
 * @param {string} text - the tool result text
 * @param {object} [args] - the call's arguments (run_in_background decides the started form)
 * @returns {{ jobId: string, output: string } | null}
 */
export function backgroundJobOf(text, args) {
  if (typeof text !== 'string') return null
  const started = args?.run_in_background === true ? STARTED_JOB.exec(text) : null
  if (started) return { jobId: started[1], output: '' }
  const promoted = PROMOTED_JOB.exec(text)
  if (promoted) return { jobId: promoted[1], output: text.slice(0, promoted.index) }
  return null
}

/** The status line a job read ends with. @returns {{ status: string, detail: string | null } | null} */
export function jobStatusOf(text) {
  const match = typeof text === 'string' ? STATUS_LINE.exec(text) : null
  return match ? { status: match[1], detail: match[2] ?? null } : null
}

/** A job read's output: the text before its status line ('(no new output)' is none). */
export function jobReadOutput(text) {
  if (typeof text !== 'string') return ''
  const match = STATUS_LINE.exec(text)
  const body = (match ? text.slice(0, match.index) : text).replace(/\n$/u, '')
  return body === '(no new output)' ? '' : body
}

/**
 * The job a dsh-tool-jobs completion notice settles. A capped notice may have
 * lost its status: it still ended the job, with an unknown outcome.
 * @returns {{ jobId: string, status: string, detail: string | null } | null}
 */
export function noticeJobOf(text) {
  if (typeof text !== 'string') return null
  const id = NOTICE_JOB.exec(text)
  if (!id) return null
  const at = text.lastIndexOf(NOTICE_STATUS)
  const status = at >= 0 ? NOTICE_TAIL.exec(text.slice(at + ' finished '.length)) : null
  return { jobId: id[1], status: status && TERMINAL.has(status[1]) ? status[1] : 'completed', detail: status?.[2] ?? null }
}

/**
 * A `job_kill` result: a requested cancellation ends the job as killed; one
 * that had already finished reports its own status.
 * @returns {{ jobId: string, status: string, detail: string | null } | null}
 */
export function killJobOf(text) {
  if (typeof text !== 'string') return null
  const requested = KILL_REQUESTED.exec(text)
  if (requested) return { jobId: requested[1], status: 'killed', detail: null }
  const finished = KILL_FINISHED.exec(text)
  if (!finished) return null
  const status = jobStatusOf(text)
  return status && TERMINAL.has(status.status) ? { jobId: finished[1], ...status } : null
}

/**
 * The settled commandExecution item of a finished job. Like a foreground
 * command, a non-zero exit is 'failed'; a killed job is Codex 'interrupted'
 * (the row reads Stopped).
 * @param {object} item - the running item
 * @param {{ status: string, detail?: string | null }} outcome - the job's terminal status
 */
export function settledJobItem(item, { status, detail }, durationMs) {
  if (status === 'killed') return { ...item, status: 'interrupted', exitCode: null, durationMs }
  if (status === 'failed') return { ...item, status: 'failed', exitCode: null, durationMs }
  const code = typeof detail === 'string' ? EXIT_CODE.exec(detail) : null
  const exitCode = code ? Number(code[1]) : null
  return { ...item, status: exitCode !== null && exitCode !== 0 ? 'failed' : 'completed', exitCode, durationMs }
}

// dsh-tool-subagent result text of a `run_in_background` one-shot delegation (its `render`).
const STARTED_AGENT_JOB = /^started background subagent job (\S+)\s*$/u

/**
 * The job a delegation (subagent, subagent_fork) handed to the background. The
 * child runs as a dsh-jobs job of kind `subagent`; it settles like a shell job,
 * by the completion notice, a terminal `job_output` read or a `job_kill`.
 * @param {string} text - the tool result text
 * @returns {string | null} the job id
 */
export function subagentJobOf(text) {
  return typeof text === 'string' ? STARTED_AGENT_JOB.exec(text)?.[1] ?? null : null
}

/**
 * The settled collabAgentToolCall of a background delegation job: the row
 * takes the job's outcome and its children (the child the catalog linked) end
 * with it. A killed job is Codex 'interrupted' (Stopped); a failed one
 * 'failed', its children 'errored'. `message` is the child's output when the
 * model read it (`job_output`), else a failure's detail.
 * @param {object} item - the running item
 * @param {{ status: string, detail?: string | null }} outcome - the job's terminal status
 * @param {string | null} [message]
 */
export function settledAgentJobItem(item, { status, detail }, message = null) {
  const [itemStatus, childStatus] = status === 'killed' ? ['interrupted', 'interrupted'] : status === 'failed' ? ['failed', 'errored'] : ['completed', 'completed']
  const text = message || (status === 'failed' && typeof detail === 'string' && detail ? detail : null)
  const ids = [...new Set([...(item.receiverThreadIds ?? []), ...Object.keys(item.agentsStates ?? {})])]
  const agentsStates = { ...item.agentsStates }
  for (const id of ids) {
    const state = agentsStates[id]
    // A child state some other record already settled keeps its outcome; the closing text fills in.
    agentsStates[id] = !state || state.status === 'running' || state.status === 'pendingInit'
      ? { status: childStatus, message: text ?? state?.message ?? null }
      : { ...state, message: state.message ?? text }
  }
  return { ...item, status: itemStatus, agentsStates }
}

/** Retained output chunks as one text: stdout and stderr in ring order; `log` narration is not output. */
export function chunkText(chunks) {
  return (Array.isArray(chunks) ? chunks : []).filter((chunk) => chunk?.channel !== 'log' && typeof chunk?.text === 'string').map((chunk) => chunk.text).join('')
}

/** Codex ThreadBackgroundTerminal for a running job's item. */
export function backgroundTerminal(item, jobId) {
  return { itemId: item.id, processId: jobId, command: item.command ?? '', cwd: item.cwd ?? '', osPid: null, cpuPercent: null, rssKb: null }
}

/** One page of a list by the numeric cursor every list method here uses. */
export function pageOf(rows, { cursor, limit } = {}, defaultLimit = 100) {
  const start = cursor ? Number.parseInt(String(cursor), 10) || 0 : 0
  const size = Number.isInteger(limit) && limit > 0 ? limit : defaultLimit
  return { data: rows.slice(start, start + size), nextCursor: start + size < rows.length ? String(start + size) : null }
}
