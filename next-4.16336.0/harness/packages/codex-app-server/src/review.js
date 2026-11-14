/**
 * review/start (Review code, /review, the Changes pane's re-run) as the other
 * bridges serve it: one ordinary model turn, run read-only whatever the
 * session's mode (index.js: the Harness read-only preset, plan mode off, every
 * sandbox escalation refused; capabilities.reviewReadOnly 'noEdits'), with the
 * review prompt built from the Codex ReviewTarget. The prompt is a human
 * message whose source also names the review (`codeDesktopReview`: its label),
 * so the projection marks the turn as Codex does, live and on every replay:
 * enteredReviewMode after the prompt, exitedReviewMode with the final answer
 * when the turn completes (unless the agent reported its findings with Code
 * Desktop's ReportFindings tool, whose item is the review result already).
 *
 * @module @code-desktop/dsh-codex-app-server/review
 */

import { invalidParams } from './transport.js'

/** The user message source field that marks a review prompt (its value: the review's label). */
export const REVIEW_FIELD = 'codeDesktopReview'

const FINDINGS = 'Report concrete bugs, risks and missing tests, most important first, with file:line references. When the ReportFindings tool is available, report the findings with it. Do not change any files.'

// A branch or commit as the prompt quotes it: one line, bounded.
function refOf(value, what) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > 200 || /[\0-\x1f\x7f]/.test(text)) throw invalidParams(`A ${what} is required for this review.`)
  return text
}

/**
 * The label and prompt of a Codex ReviewTarget (uncommittedChanges, baseBranch, commit, custom).
 * @param {{type?: string, branch?: string, sha?: string, title?: string|null, instructions?: string} | null | undefined} target
 * @returns {{label: string, prompt: string}}
 * @throws INVALID_PARAMS for an unknown or incomplete target
 */
export function reviewRequest(target) {
  const type = target?.type ?? 'uncommittedChanges'
  switch (type) {
    case 'uncommittedChanges':
      return { label: 'uncommitted changes', prompt: `Review the uncommitted changes in this repository (git status, git diff, git diff --staged, and any new untracked files). ${FINDINGS}` }
    case 'baseBranch': {
      const branch = refOf(target.branch, 'base branch')
      return { label: `changes against ${branch}`, prompt: `Review the code changes on this branch against the base branch "${branch}" (use git diff ${branch}...HEAD). ${FINDINGS}` }
    }
    case 'commit': {
      const sha = refOf(target.sha, 'commit')
      const title = typeof target.title === 'string' && target.title.trim() ? ` ("${target.title.trim().replace(/\s+/g, ' ').slice(0, 200)}")` : ''
      return { label: `commit ${sha.slice(0, 12)}`, prompt: `Review commit ${sha}${title} (git show ${sha}). ${FINDINGS}` }
    }
    case 'custom': {
      const instructions = typeof target.instructions === 'string' ? target.instructions.trim() : ''
      if (!instructions) throw invalidParams('Review instructions are required for a custom review.')
      return { label: 'custom review', prompt: `${instructions.slice(0, 20000)}\n\nDo not change any files.` }
    }
    default:
      throw invalidParams(`Unknown review target: ${String(type)}`)
  }
}

/** The review label a Harness user message carries, or null. */
export function reviewLabelOf(message) {
  const label = message?.source?.kind === 'user' ? message.source[REVIEW_FIELD] : undefined
  return typeof label === 'string' && label ? label : null
}

/** Whether a turn's items hold a completed ReportFindings call (OpenClaude Desktop's agent tools): the review result itself. */
export function reportedFindings(items) {
  return (items ?? []).some((item) => item?.type === 'mcpToolCall' && item.tool === 'ReportFindings' && item.status === 'completed')
}
