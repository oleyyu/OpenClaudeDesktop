// DeepSeek's goals (dsh-goal: one durable objective per session; dsh-goal-round-driver continues an active, armed goal
// at idle up to its round cap) as Codex's thread/goal/* for OpenClaude Desktop's goal strip and /goal.
//
// Phases map onto ThreadGoal.status: active (armed) → active; an active goal disarmed after a session restart or fork →
// paused, with codeDesktop.disarmed, since nothing runs until it is resumed; paused, blocked and complete as they are.
// codeDesktop carries the round count, the cap and a blocker's reason. A set with a new objective starts a goal in place of
// the current one (codeDesktop.edit: edits the current one); the same objective, or status active, resumes it; status
// paused pauses it.
import { RpcError } from './transport.js'

const seconds = (ms) => (Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000))

/** The current goal of a live agent, or null (none, or the service refused: a replay failure). */
export function goalViewOf(goals, agent) {
  try { return goals?.get(agent) ?? null } catch { return null }
}

/** A dsh-goal GoalView as Codex's ThreadGoal (plus codeDesktop extras), or null. */
export function threadGoal(threadId, view) {
  if (!view || typeof view.objective !== 'string') return null
  const disarmed = view.phase === 'active' && view.activation !== 'armed'
  const status = view.phase === 'active' ? (disarmed ? 'paused' : 'active') : ['paused', 'blocked', 'complete'].includes(view.phase) ? view.phase : 'active'
  return {
    threadId, objective: view.objective, status, tokenBudget: null, tokensUsed: 0, timeUsedSeconds: null,
    createdAt: seconds(view.createdAt), updatedAt: seconds(view.updatedAt),
    codeDesktop: {
      goalId: String(view.id), revision: view.revision, rounds: Number.isSafeInteger(view.roundsStarted) ? view.roundsStarted : 0,
      maxRounds: Number.isSafeInteger(view.maxGoalRounds) ? view.maxGoalRounds : null,
      ...(disarmed ? { disarmed: true } : {}),
      ...(view.phase === 'blocked' && view.blockedReason ? { blockedReason: String(view.blockedReason.message ?? ''), blockedCode: String(view.blockedReason.code ?? '') } : {}),
    },
  }
}

/** thread/goal/set on dsh-goal: returns the resulting view. */
export function setGoal(goals, agent, { objective, status, edit = false } = {}) {
  const current = goalViewOf(goals, agent)
  const ref = current ? { id: current.id, revision: current.revision } : null
  const text = typeof objective === 'string' ? objective.trim() : ''
  // edit (/goal edit <objective>, dsh-command-goal's edit): the current goal's objective changes in place, keeping its
  // phase and rounds.
  if (edit) {
    if (!text) throw new RpcError(-32600, 'Add the new objective after /goal edit.')
    if (!current) throw new RpcError(-32600, 'This session has no goal. Set one with /goal and an objective.')
    return current.objective === text ? current : goals.edit(agent, ref, { objective: text })
  }
  if (text) {
    // The same objective again resumes it; a different one starts a fresh goal (with a fresh round allowance) in place
    // of the current one, which dsh-goal clears first unless it already completed.
    if (current && current.objective === text) {
      return status === 'active' && (current.phase !== 'active' || current.activation !== 'armed') && current.phase !== 'complete' ? goals.resume(agent, ref) : current
    }
    if (current && current.phase !== 'complete') goals.clear(agent, ref)
    return goals.create(agent, { objective: text })
  }
  if (!current) throw new RpcError(-32600, 'This session has no goal. Set one with /goal and an objective.')
  if (status === 'paused') return current.phase === 'active' ? goals.pause(agent, ref) : current
  if (status === 'active') return goals.resume(agent, ref)
  return current
}

/** A dsh-goal mutation, with its GoalError as a JSON-RPC error the user can read. */
export function goalMutate(run) {
  try { return run() }
  catch (error) {
    if (error instanceof RpcError) throw error
    const code = error?.code ?? error?.data?.code
    const text = String(error?.message ?? '')
    const message = /exhausted \d+ goal rounds/.test(text) ? 'The goal used all its rounds. Set a new goal with /goal to keep going.'
      : /already active and armed/.test(text) ? 'The goal is already running.'
      : code === 'GOAL_INVALID_TRANSITION' ? 'The goal can’t do that from where it is now.'
      : code === 'GOAL_STALE_REVISION' ? 'The goal changed meanwhile. Try again.'
        : code === 'GOAL_INVALID_OBJECTIVE' ? 'Enter a goal.'
          : String(error?.message ?? error)
    throw new RpcError(-32600, message, code ? { code } : undefined)
  }
}
