/**
 * Harness user questions ↔ Codex `item/tool/requestUserInput`, and the Plan
 * mode that OpenClaude Desktop selects through its permission menu.
 *
 *   AskUserQuestionItem            → ToolRequestUserInputQuestion (free text always allowed;
 *                                  multiSelect is an OpenClaude Desktop extension field)
 *   ToolRequestUserInputResponse   → AskUserQuestionAnswer ({id, selected, custom?})
 *   exit_plan_mode's plan review   a question with intent 'plan-review'; the plan
 *                                  itself renders as a Codex `plan` item (projection.js)
 *   codeDesktop.permissionMode     the app's mode hint (Plan cannot be told apart
 *                                  from chat/review by the read-only sandbox alone)
 */

import { UserQuestionError } from '@deepseek-ai/dsh-user-questions'

export const PLAN_REVIEW = 'plan-review'
// Tools whose execute() asks through the user-questions waterfall.
const QUESTION_TOOLS = new Set(['ask_user_question', 'exit_plan_mode'])
const PERMISSION_MODES = new Set(['auto', 'ask', 'acceptEdits', 'plan', 'bypass', 'chat', 'review'])
const AFTER_PLAN = new Set(['auto', 'ask', 'acceptEdits', 'bypass'])

/**
 * Harness questions → Codex questions. `detail` joins the question text,
 * except for a plan review: its plan is already on screen as the plan item.
 * `multiSelect` (ask_user_question's multi_select) lets the card toggle several
 * options; harnessAnswer already takes every label it sends.
 * @param {Array<{id: string, question: string, detail?: string, header?: string, options?: Array<{label: string, description?: string}>, multiSelect?: boolean, intent?: {kind: string}}>} items
 */
export function codexQuestions(items) {
  return items.map((item) => ({
    id: item.id,
    header: item.header ?? '',
    question: item.detail && item.intent?.kind !== PLAN_REVIEW ? `${item.question}\n\n${item.detail}` : item.question,
    isOther: true,
    isSecret: false,
    options: item.options?.map((option) => ({ label: option.label, description: option.description ?? '' })) ?? null,
    multiSelect: item.multiSelect === true,
  }))
}

/**
 * Codex answers → the Harness answer batch, one entry per question. Values
 * naming an option are `selected`; anything else is the user's own text.
 * A question the client skipped (absent key) answers with nothing selected.
 */
export function harnessAnswer(items, response) {
  return {
    answers: items.map((item) => {
      const supplied = response?.answers?.[item.id]?.answers
      const values = Array.isArray(supplied) ? supplied.filter((value) => typeof value === 'string') : []
      const labels = new Set((item.options ?? []).map((option) => option.label))
      const selected = values.filter((value) => labels.has(value))
      const custom = values.filter((value) => !labels.has(value)).join('\n')
      return custom.trim() ? { id: item.id, selected, custom } : { id: item.id, selected }
    }),
  }
}

/** The plan review was approved: its approve label alone, with no feedback text. */
export function isPlanApproval(items, answer) {
  return items.some((item) => {
    if (item.intent?.kind !== PLAN_REVIEW) return false
    const entry = answer?.answers?.find((candidate) => candidate.id === item.id)
    return entry?.selected?.length === 1 && entry.selected[0] === item.intent.approve && entry.custom === undefined
  })
}

/**
 * The tool call a question belongs to: the plan review names its call; a
 * legacy ask_user_question does not, so it is the oldest running question
 * tool of the turn not already asking (calls dispatch in model order).
 * @param {{questions?: Array<{intent?: {callId?: string}}>, wait?: {callId?: string}}} request
 * @param {{items: Array<{type: string, id: string, tool?: string, status?: string}>} | null | undefined} turn
 * @param {Set<string>} [asking] - item ids with a question already pending.
 * @returns {string} '' when no call is known.
 */
export function questionItemId(request, turn, asking = new Set()) {
  const named = request?.questions?.[0]?.intent?.callId ?? request?.wait?.callId
  if (typeof named === 'string' && named) return named
  const call = turn?.items.find((item) => item.type === 'dynamicToolCall' && QUESTION_TOOLS.has(item.tool) && item.status === 'inProgress' && !asking.has(item.id))
  return call?.id ?? ''
}

/**
 * The client stopped waiting: the turn was interrupted (ASK_ABORTED, as the
 * service itself reports a signal abort) or the request failed or was
 * dropped (ASK_CANCELLED; exit_plan_mode then stays in plan mode and stops).
 */
export function questionFailure(aborted, cause) {
  return aborted
    ? new UserQuestionError('ask_user_question was aborted before the user answered', 'ASK_ABORTED', { cause })
    : new UserQuestionError('The user dismissed the question.', 'ASK_CANCELLED', { cause })
}

/**
 * OpenClaude Desktop's mode hint (`codeDesktop: {permissionMode, afterPlan}` on
 * thread/start, thread/resume and turn/start). Only the app's DeepSeek mode
 * sends it; without one the bridge leaves Harness plan mode alone.
 * @returns {{mode: string, afterPlan: 'auto' | 'ask' | 'acceptEdits' | 'bypass'} | null}
 */
export function permissionHint(params) {
  const hint = params?.codeDesktop
  if (!hint || typeof hint !== 'object' || !PERMISSION_MODES.has(hint.permissionMode)) return null
  return { mode: hint.permissionMode, afterPlan: AFTER_PLAN.has(hint.afterPlan) ? hint.afterPlan : 'auto' }
}

/**
 * The mode an approved plan continues in. OpenClaude Desktop's plan card names it on
 * the response (`codeDesktop: {afterPlan}`: Accept → 'ask', its primary → the
 * mode used before Plan, or a 'More accept options' row); that choice wins over
 * the turn hint. Bypass is taken only from the response ('Accept and bypass
 * permissions', which the app validated against the opt-in and the core's
 * requirements); a hinted Bypass falls back to Auto.
 * @param {unknown} response - the ToolRequestUserInputResponse
 * @param {string} [hinted] - permissionHint's afterPlan
 */
export function approvedAfterPlan(response, hinted) {
  const chosen = response?.codeDesktop?.afterPlan
  if (chosen === 'auto' || chosen === 'ask' || chosen === 'acceptEdits' || chosen === 'bypass') return chosen
  return hinted === 'bypass' ? 'auto' : hinted
}

/**
 * What an approved plan continues with: the chosen mode in a writable sandbox,
 * or Bypass when approvedAfterPlan returned it (the plan card's explicit choice).
 * @returns {{mode: 'auto' | 'ask' | 'acceptEdits' | 'bypass', approvalPolicy: 'on-request' | 'untrusted' | 'never', sandbox: 'workspace-write' | 'danger-full-access'}}
 */
export function afterPlanPermission(afterPlan) {
  if (afterPlan === 'bypass') return { mode: 'bypass', approvalPolicy: 'never', sandbox: 'danger-full-access' }
  if (afterPlan === 'ask' || afterPlan === 'acceptEdits') return { mode: afterPlan, approvalPolicy: 'untrusted', sandbox: 'workspace-write' }
  return { mode: 'auto', approvalPolicy: 'on-request', sandbox: 'workspace-write' }
}
