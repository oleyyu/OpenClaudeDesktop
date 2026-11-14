/**
 * OpenClaude Desktop permission modes on ZCode's own permission system (core/src/permission/service.ts).
 *
 *   OpenClaude Desktop      ZCode mode   what ZCode does
 *   ask               build        read-only tools run; every side-effect tool asks (Allow once / project rule / Deny)
 *   acceptEdits       edit         as build, but workspace file edits run without asking
 *   auto              edit         Codex "auto" confines commands to a workspace sandbox. ZCode has no sandbox, so
 *                                  commands keep asking (never silently weaker than the app's mode)
 *   plan, chat,       plan         read-only; ExitPlanMode asks for plan approval (→ the plan card)
 *   review
 *   bypass            yolo         nothing asks (only with approvalPolicy "never" + danger-full-access)
 *
 * ZCode's "auto" mode is reserved and denies everything (mode.auto.unimplemented), so it is never used.
 * Approvals arrive as `interaction/requestPermission` (options allow_once / allow_project / deny, each with the
 * response ZCode wants back); questions and plan reviews as `interaction/requestUserInput`.
 *
 * With approvalPolicy "never" outside Bypass (a client that never answers approvals, such as the workflow runner)
 * an ask is refused on the spot with a reason the model reads. "Allow for this session" is a bridge-side grant
 * scoped by sessionGrant (never past what the card showed, nor past the workspace) and dropped when the mode changes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isRecord } from './items.js'

export const MODES = Object.freeze(['auto', 'ask', 'acceptEdits', 'plan', 'bypass', 'chat', 'review'])

/**
 * The OpenClaude Desktop mode a thread/turn request asks for (the hint wins; else the Codex policy fields), plus whether
 * the client takes approval requests at all: approvalPolicy "never" means it never answers one (the workflow runner,
 * any Codex client), so outside Bypass an ask is refused on the spot instead of becoming a request nobody answers.
 */
export function permissionOf(params = {}, previous = null) {
  const hint = params.codeDesktop?.permissionMode
  const afterPlan = ['auto', 'ask', 'acceptEdits', 'bypass'].includes(params.codeDesktop?.afterPlan) ? params.codeDesktop.afterPlan : previous?.afterPlan ?? 'auto'
  const sandbox = params.sandbox ?? ({ readOnly: 'read-only', workspaceWrite: 'workspace-write', dangerFullAccess: 'danger-full-access', externalSandbox: 'workspace-write' })[params.sandboxPolicy?.type]
  const policy = params.approvalPolicy
  const result = (mode) => {
    const approvals = policy === undefined ? previous?.approvals !== false : !(policy === 'never' && mode !== 'bypass')
    return approvals ? { mode, afterPlan } : { mode, afterPlan, approvals: false }
  }
  if (MODES.includes(hint)) {
    // Bypass needs the matching Codex fields too (the app validated the opt-in for exactly those).
    return result(hint === 'bypass' && !(sandbox === 'danger-full-access' && policy === 'never') ? 'auto' : hint)
  }
  if (sandbox === undefined && policy === undefined) return previous ?? { mode: 'auto', afterPlan }
  if (sandbox === 'read-only') return result('plan')
  if (sandbox === 'danger-full-access' && policy === 'never') return result('bypass')
  if (policy === 'untrusted') return result('ask')
  return result('auto')
}

/** Modes where nothing may change files or run side effects: a standing session grant never applies there. */
export const isReadOnlyMode = (mode) => mode === 'plan' || mode === 'chat' || mode === 'review'

/** ZCode's session mode for an OpenClaude Desktop mode. */
export function zcodeMode(mode) {
  switch (mode) {
    case 'bypass': return 'yolo'
    case 'ask': return 'build'
    case 'acceptEdits': case 'auto': return 'edit'
    default: return 'plan'
  }
}

/** The Codex fields a SessionResponse reports for a mode. */
export function codexPolicy(mode, cwd) {
  if (mode === 'bypass') return { approvalPolicy: 'never', sandbox: { type: 'dangerFullAccess' } }
  if (mode === 'plan' || mode === 'chat' || mode === 'review') return { approvalPolicy: 'on-request', sandbox: { type: 'readOnly', networkAccess: false } }
  return { approvalPolicy: mode === 'auto' ? 'on-request' : 'untrusted', sandbox: { type: 'workspaceWrite', writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false } }
}

// Inputs naming a file (Edit/Write/MultiEdit: file_path, NotebookEdit: notebook_path, other tools: path).
const FILE_KEYS = ['file_path', 'notebook_path', 'path']

// The tools whose session grant is scoped by one subject, each the input their approval card shows as that call:
// Bash's card is the command itself, WebFetch's card leads with the URL (its prompt only shapes the reply).
const GRANT_SUBJECTS = Object.freeze({ Bash: 'command', WebFetch: 'url' })

const isFileTool = (name) => name === 'Edit' || name === 'Write' || name === 'MultiEdit' || name === 'NotebookEdit'

// A file larger than this is not fingerprinted (a standing grant is then not offered for a call naming it).
const MAX_FINGERPRINT_BYTES = 16 * 1024 * 1024

/** A path as a tool reaches it: resolved against cwd, with the symlinks of its existing part (dangling ones too) followed. */
export function realTarget(file, cwd = '/', depth = 0) {
  const resolved = path.resolve(cwd || '/', file)
  const rest = []
  let probe = resolved
  for (;;) {
    try { return path.join(fs.realpathSync(probe), ...rest) } catch {}
    try {
      // A dangling link: writing through it creates its target.
      if (depth < 32 && fs.lstatSync(probe).isSymbolicLink()) return realTarget(path.join(path.resolve(path.dirname(probe), fs.readlinkSync(probe)), ...rest), '/', depth + 1)
    } catch {}
    const parent = path.dirname(probe)
    if (parent === probe) return resolved
    rest.unshift(path.basename(probe))
    probe = parent
  }
}

const within = (file, root) => file === root || file.startsWith(root.endsWith(path.sep) ? root : `${root}${path.sep}`)

/** JSON with object keys sorted at every level, so equal inputs give equal grant keys whatever their key order. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry === undefined ? null : entry)).join(',')}]`
  if (isRecord(value)) return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** What a file holds right now ("absent" when nothing is there yet), or null when it cannot be pinned down. */
function fileFingerprint(file) {
  try {
    const stat = fs.statSync(file)
    if (!stat.isFile() || stat.size > MAX_FINGERPRINT_BYTES) return null
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  } catch (error) {
    return error?.code === 'ENOENT' ? 'absent' : null
  }
}

/**
 * What "Allow for this session" covers, and whether it is offered at all. ZCode has no sandbox, so a grant must not
 * reach further than the user could see on the card:
 *   Bash / WebFetch              that exact command / URL (GRANT_SUBJECTS)
 *   a file tool, inside the      that tool for files inside the workspace (realpath, so a symlink out does not count)
 *     workspace
 *   a file tool, outside it      no standing grant (sessionGrantable false): every such edit asks
 *   any other tool               that exact input, which is what its card shows (`Tool {json}`). A file the input
 *                                names (a snippet `path`, say) counts by what it holds now, so a later call with the
 *                                same input but different file contents asks again. Code-running tools such as
 *                                EvalWorkflowSnippet or NodeRepl are therefore granted per snippet, never per tool.
 * @returns {{ key: string|null, grantable: boolean }}
 */
export function sessionGrant(toolName, input, { cwd } = {}) {
  const record = isRecord(input) ? input : {}
  const subject = GRANT_SUBJECTS[toolName]
  if (subject && typeof record[subject] === 'string') return { key: `${toolName}\u0000${subject}:${record[subject]}`, grantable: true }
  const fileKeys = FILE_KEYS.filter((key) => typeof record[key] === 'string' && record[key])
  if (isFileTool(toolName)) {
    if (!cwd || !fileKeys.length) return { key: null, grantable: false }
    const root = realTarget(cwd)
    return within(realTarget(record[fileKeys[0]], root), root) ? { key: `${toolName}\u0000workspace:${root}`, grantable: true } : { key: null, grantable: false }
  }
  const files = []
  for (const key of fileKeys) {
    if (!cwd && !path.isAbsolute(record[key])) return { key: null, grantable: false }
    const fingerprint = fileFingerprint(realTarget(record[key], cwd ? realTarget(cwd) : '/'))
    if (!fingerprint) return { key: null, grantable: false }
    files.push(`${key}=${fingerprint}`)
  }
  return { key: `${toolName}\u0000input:${stableJson(record)}${files.length ? `\u0000files:${files.join(',')}` : ''}`, grantable: true }
}

/** The grant key alone (null when no standing grant may cover the call). */
export const grantKey = (toolName, input, options) => sessionGrant(toolName, input, options).key

/**
 * ZCode's 'Always allow in this project' (permission-options.ts allow_project: response.permissionUpdates, the rules it
 * saves for the project) as the rule text the card shows ('Bash(pnpm test:*)'), or null when not offered.
 */
export function projectRuleText(request) {
  const option = request.options?.find((candidate) => candidate?.optionId === 'allow_project' || candidate?.kind === 'allow_always')
  if (!option) return null
  const updates = option.response?.permissionUpdates
  const rules = (Array.isArray(updates) ? updates : []).flatMap((update) => (Array.isArray(update?.rules) ? update.rules : []))
    .map((rule) => (typeof rule?.toolName === 'string' && rule.toolName ? (rule.ruleContent ? `${rule.toolName}(${rule.ruleContent})` : rule.toolName) : null)).filter(Boolean)
  return rules.join(', ') || request.toolName || null
}

/**
 * The Codex availableDecisions for a request ZCode offers 'Always allow in this project' on: Codex's persistent
 * decision shape (acceptWithExecpolicyAmendment, the card's 'Always allow' button) carrying the rule text, marked as
 * ZCode's project option (codeDesktop) so the answer picks it; null otherwise (the fixed set stays).
 */
export function availableDecisions(request, { grantable = true } = {}) {
  const rule = projectRuleText(request)
  if (!rule) return null
  return ['accept', ...(grantable ? ['acceptForSession'] : []), { acceptWithExecpolicyAmendment: { execpolicy_amendment: [rule] }, codeDesktop: { zcodeOption: 'allow_project', scope: 'project' } }, 'decline', 'cancel']
}

/**
 * The Codex server request for a ZCode permission request.
 * @returns {{ method: string, params: object }}
 */
export function approvalRequest(request, { threadId, turnId, cwd, item, grantable = true }) {
  const input = isRecord(request.input) ? request.input : {}
  const decisions = availableDecisions(request, { grantable })
  const base = { threadId, turnId, itemId: request.toolCallId, startedAtMs: Date.now(), reason: request.reason || null, ...(decisions ? { availableDecisions: decisions } : {}) }
  const origin = request.origin?.kind === 'subagent' ? `Requested by the “${request.origin.description || request.origin.agentType}” agent. ` : ''
  if (isFileTool(request.toolName)) {
    return { method: 'item/fileChange/requestApproval', params: { ...base, reason: `${origin}${request.reason ?? ''}`.trim() || null, grantRoot: null, sessionGrantable: grantable, ...(item?.changes ? { changes: item.changes } : {}) } }
  }
  const command = request.toolName === 'Bash' ? String(input.command ?? '') : `${request.toolName} ${JSON.stringify(input)}`
  return {
    method: 'item/commandExecution/requestApproval',
    params: { kind: 'command', ...base, reason: `${origin}${request.reason ?? ''}`.trim() || null, approvalId: null, environmentId: null, command, cwd, commandActions: [{ type: 'unknown', command }], sessionGrantable: grantable },
  }
}

/**
 * ZCode's answer to a permission request, from the Codex decision. acceptForSession records a grant only where one
 * was offered (a client may send it for a card that had no such button).
 */
export function permissionAnswer(request, decision, { grantable = true } = {}) {
  const option = (kind) => request.options?.find((candidate) => candidate.kind === kind || candidate.optionId === kind)
  const allowOnce = option('allow_once')?.response ?? { decision: 'allow', reason: 'Approved once' }
  const deny = option('deny')?.response ?? { decision: 'deny', reason: 'The user declined this tool call.' }
  // 'Always allow in this project': ZCode's own option answer, so ZCode saves its project rule (saveProjectPermission).
  if (isRecord(decision) && decision.codeDesktop?.zcodeOption === 'allow_project') {
    const project = option('allow_project')?.response
    if (project) return { response: project, grant: false }
  }
  if (decision === 'accept' || decision === 'acceptForSession' || isRecord(decision)) return { response: allowOnce, grant: decision === 'acceptForSession' && grantable }
  return { response: deny, grant: false, cancel: decision === 'cancel' }
}

/** The refusal for an ask when the client takes no approvals (approvalPolicy "never"): the model reads the reason. */
export function noApprovalAnswer(request) {
  const deny = permissionAnswer(request, 'decline').response
  return { ...deny, reason: `${request.toolName ?? 'This tool'} needs approval, but approvals are off for this session (approval policy "never"). ZCode has no sandbox to run it without one; use Bypass permissions to run it.` }
}

// ------------------------------------------------------------------ questions

export const PLAN_REVIEW = 'plan-review'
export const APPROVE = 'Approve'
export const KEEP_PLANNING = 'Keep planning'

export const isPlanApproval = (request) => request?.schema?.interaction === 'plan_approval' || request?.toolName === 'ExitPlanMode'

/** item/tool/requestUserInput params for a ZCode user-input request. */
export function questionRequest(request, { threadId, turnId }) {
  const base = { threadId, turnId, itemId: request.toolCallId ?? '', isBlocking: true, autoResolutionMs: null }
  if (isPlanApproval(request)) {
    const plan = String(request.input?.plan ?? '').trim()
    return { ...base, questions: [{ id: PLAN_REVIEW, header: 'Plan', question: plan ? `Approve this plan?\n\n${plan}` : 'Approve the plan?', isOther: true, isSecret: false, multiSelect: false, options: [{ label: APPROVE, description: 'Leave Plan mode and start' }, { label: KEEP_PLANNING, description: 'Stay in Plan mode' }] }] }
  }
  const questions = (request.questions ?? request.input?.questions ?? []).map((question, index) => ({
    id: `q${index}`, header: String(question.header ?? '').slice(0, 40), question: String(question.question ?? ''), isOther: true, isSecret: false, multiSelect: question.multiSelect === true,
    // preview: the mockup / code variant GLM attaches to an option (ask-user-question.ts 'Preview feature'), shown beside
    // the options by the app's question card (a bridge field; Codex's option has label and description only).
    options: Array.isArray(question.options) && question.options.length ? question.options.map((option) => ({ label: String(option.label ?? option.value), description: String(option.description ?? ''),
      ...(question.multiSelect !== true && typeof option.preview === 'string' && option.preview.trim() ? { preview: option.preview } : {}) })) : null,
  }))
  if (!questions.length) questions.push({ id: 'q0', header: 'Question', question: String(request.prompt ?? 'Input needed'), isOther: true, isSecret: false, multiSelect: false, options: null })
  return { ...base, questions }
}

/**
 * ZCode's user-input response for the app's answers.
 * @returns {{ response: object, approvedPlan: boolean, afterPlan: string|null }}
 */
export function questionAnswer(request, result) {
  const answers = isRecord(result?.answers) ? result.answers : {}
  if (isPlanApproval(request)) {
    const values = (answers[PLAN_REVIEW]?.answers ?? []).map(String)
    if (values.length === 1 && values[0] === APPROVE) {
      const chosen = result?.codeDesktop?.afterPlan
      return { response: { action: 'accept', content: { answer: 'approve' } }, approvedPlan: true, afterPlan: ['auto', 'ask', 'acceptEdits', 'bypass'].includes(chosen) ? chosen : null }
    }
    const feedback = values.filter((value) => value !== KEEP_PLANNING && value !== APPROVE).join('\n').trim()
    return { response: feedback ? { action: 'accept', content: { answer: feedback } } : { action: 'decline' }, approvedPlan: false, afterPlan: null }
  }
  const questions = request.questions ?? request.input?.questions ?? []
  const content = { answers: {} }
  questions.forEach((question, index) => {
    const values = answers[`q${index}`]?.answers
    if (Array.isArray(values) && values.length) content.answers[String(question.question)] = values.map(String).join(', ')
    // A single-select question with previews: the chosen option's preview goes back as its annotation, as Claude's
    // AskUserQuestion answer does (annotations {[question]: {preview}}).
    const chosen = question.multiSelect !== true && Array.isArray(values) && values.length === 1 && Array.isArray(question.options)
      ? question.options.find((option) => String(option.label ?? option.value) === String(values[0])) : null
    if (typeof chosen?.preview === 'string' && chosen.preview.trim()) (content.annotations ??= {})[String(question.question)] = { preview: chosen.preview }
  })
  if (!questions.length) {
    const values = answers.q0?.answers
    return { response: Array.isArray(values) && values.length ? { action: 'accept', content: { answer: values.join('\n') } } : { action: 'decline' }, approvedPlan: false, afterPlan: null }
  }
  return { response: { action: 'accept', content }, approvedPlan: false, afterPlan: null }
}
