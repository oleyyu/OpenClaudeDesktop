/**
 * OpenClaude Desktop's five permission modes on an ACP agent.
 *
 * The app sends approvalPolicy + sandbox / sandboxPolicy and, with
 * capabilities.permissionHints, codeDesktop.permissionMode / afterPlan
 * (app/electron/permission-policy.mjs). The bridge keeps the agent in its own
 * asking mode (or its plan mode) and answers every session/request_permission
 * itself by this policy, asking the user only where the mode says so:
 *
 *   mode         agent mode  edit (in roots / outside)  execute            read/search/fetch  other (MCP…)
 *   bypass       default     allow / allow              allow              allow              allow
 *   auto         default     allow / ask                allow if sandboxed allow              allow
 *                                                       (else ask)
 *   acceptEdits  default     allow / ask                ask                allow              ask
 *   ask          default     ask / ask                  ask                allow              ask
 *   plan         plan        deny / deny                allow if sandboxed allow              ask
 *   chat, review plan        deny / deny                (else ask)         allow              ask
 *   readOnly     default     deny / deny                allow if sandboxed allow              deny
 *                                                       (else deny)
 *
 * readOnly: a thread nobody can answer (approvalPolicy 'never' in a read-only sandbox, without a mode hint: the
 * /workflow runner's read-only agents). It runs in the agent's ordinary mode, not its plan mode, whose prompt tells
 * the agent to write a plan and end with a plan review or a question nobody can answer; what would ask is refused, as
 * Codex refuses an escalation under approvalPolicy 'never'.
 *
 * "sandboxed": the agent process (and so every command it runs) is inside the
 * bridge's macOS sandbox (sandbox.js): writes only to the writable roots in
 * auto, none in read-only modes. Questions and plan exits always reach the user.
 * Nothing is ever weaker than the mode: unknown kinds ask. "Allow for this session" is a bridge-side grant scoped
 * by sessionGrant (never past what the card showed, nor past the roots), never offered nor honoured in a read-only
 * mode, and dropped whenever the mode changes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

/** The real path of a file that may not exist yet (its nearest existing ancestor resolved). */
export function realPath(file) {
  let current = path.resolve(file)
  const rest = []
  for (let i = 0; i < 64; i++) {
    try { return path.join(fs.realpathSync(current), ...rest.reverse()) } catch {}
    const parent = path.dirname(current)
    if (parent === current) break
    rest.push(path.basename(current))
    current = parent
  }
  return path.resolve(file)
}

export const PERMISSION_MODES = ['auto', 'ask', 'acceptEdits', 'plan', 'bypass', 'chat', 'review']
const AFTER_PLAN = ['auto', 'ask', 'acceptEdits', 'bypass']
const READ_KINDS = new Set(['read', 'search', 'fetch', 'think'])
const EDIT_KINDS = new Set(['edit', 'delete', 'move'])

/** The mode from request params (hint first, then the Codex policy pair), or undefined to keep the thread's. */
export function permissionOf(params, previous = {}) {
  const hint = params?.codeDesktop
  const policy = params?.approvalPolicy
  const sandbox = params?.sandboxPolicy?.type === 'dangerFullAccess' ? 'danger-full-access'
    : params?.sandboxPolicy?.type === 'readOnly' ? 'read-only'
      : params?.sandboxPolicy?.type === 'workspaceWrite' ? 'workspace-write'
        : params?.sandbox
  const roots = Array.isArray(params?.sandboxPolicy?.writableRoots) ? params.sandboxPolicy.writableRoots.filter((root) => typeof root === 'string' && root) : undefined
  let mode
  if (hint && typeof hint === 'object' && PERMISSION_MODES.includes(hint.permissionMode)) mode = hint.permissionMode
  else if (policy || sandbox) {
    if (sandbox === 'read-only') mode = policy === 'never' ? 'readOnly' : 'plan'
    else if (policy === 'never' && sandbox === 'danger-full-access') mode = 'bypass'
    else if (policy === 'untrusted') mode = 'ask'
    else mode = 'auto'
  }
  if (!mode && !roots) return undefined
  return {
    mode: mode ?? previous.mode ?? 'auto',
    afterPlan: AFTER_PLAN.includes(hint?.afterPlan) ? hint.afterPlan : previous.afterPlan ?? 'auto',
    approvalPolicy: policy ?? previous.approvalPolicy ?? 'on-request',
    sandbox: sandbox ?? previous.sandbox ?? 'workspace-write',
    writableRoots: roots ?? previous.writableRoots ?? [],
  }
}

export const isReadOnlyMode = (mode) => mode === 'plan' || mode === 'chat' || mode === 'review' || mode === 'readOnly'
/** Whether the agent runs in its own plan mode: the read-only modes a user is there for (not readOnly, which nobody answers). */
export const usesAgentPlanMode = (mode) => mode === 'plan' || mode === 'chat' || mode === 'review'

/** The sandbox profile the agent process runs in for a mode: 'none' | 'workspace-write' | 'read-only'. */
export function sandboxFor(mode) {
  if (mode === 'bypass') return 'none'
  return isReadOnlyMode(mode) ? 'read-only' : 'workspace-write'
}

/** Whether every path lies inside one of the roots. */
export function insideRoots(paths, roots) {
  const clean = roots.filter(Boolean).map((root) => realPath(root))
  return paths.length > 0 && paths.every((file) => {
    const target = realPath(file)
    return clean.some((root) => target === root || target.startsWith(root.endsWith(path.sep) ? root : root + path.sep))
  })
}

/** The paths an ACP tool call touches (locations, diff paths, raw input paths). */
export function pathsOf(toolCall, cwd) {
  const out = new Set()
  const add = (value) => { if (typeof value === 'string' && value) out.add(path.isAbsolute(value) ? value : path.resolve(cwd ?? '/', value)) }
  for (const location of toolCall?.locations ?? []) add(location?.path)
  for (const block of toolCall?.content ?? []) if (block?.type === 'diff') add(block.path)
  const raw = toolCall?.rawInput
  if (raw && typeof raw === 'object') for (const key of ['file_path', 'path', 'absolute_path', 'filePath', 'target_file', 'destination', 'notebook_path']) add(raw[key])
  return [...out]
}

/**
 * The bridge's answer for one tool permission: 'allow' | 'ask' | 'deny'.
 * A session grant never applies in a read-only mode, nor to an edit outside the roots (the roots are checked first).
 * @param {{ mode: string, kind: string, paths: string[], roots: string[], sandboxed: boolean, granted?: boolean }} input
 */
export function decide({ mode, kind, paths, roots, sandboxed, granted = false }) {
  const edit = EDIT_KINDS.has(kind)
  const inRoots = edit && insideRoots(paths, roots)
  if (mode === 'bypass') return 'allow'
  if (isReadOnlyMode(mode)) {
    if (edit) return 'deny'
    if (READ_KINDS.has(kind)) return 'allow'
    // readOnly: nobody can answer a card, so what would ask is refused.
    const ask = mode === 'readOnly' ? 'deny' : 'ask'
    if (kind === 'execute') return sandboxed ? 'allow' : ask
    return ask
  }
  if (READ_KINDS.has(kind)) return 'allow'
  if (granted && (!edit || inRoots)) return 'allow'
  if (mode === 'auto') {
    if (edit) return inRoots || (sandboxed && paths.length === 0) ? 'allow' : 'ask'
    if (kind === 'execute') return sandboxed ? 'allow' : 'ask'
    return 'allow'
  }
  if (mode === 'acceptEdits') return inRoots ? 'allow' : 'ask'
  return 'ask'
}

/** The ACP option for an outcome kind ('allow_once' | 'allow_always' | 'reject_once' | 'reject_always'). */
export function optionFor(options, ...kinds) {
  for (const kind of kinds) {
    const found = (options ?? []).find((option) => option?.kind === kind)
    if (found) return found
  }
  return null
}

export const selected = (option) => (option ? { outcome: { outcome: 'selected', optionId: option.optionId } } : { outcome: { outcome: 'cancelled' } })

/**
 * A Codex approval decision → the ACP permission outcome. "Allow for this session" answers the agent allow_once too:
 * the bridge keeps that grant itself (SessionGrants), because an agent's own allow_always (Gemini / Qwen: every
 * command with the same first word, Kimi: the whole tool) reaches past the card and outlives the mode.
 */
export function outcomeForDecision(decision, options) {
  const value = typeof decision === 'string' ? decision : decision && typeof decision === 'object' ? Object.keys(decision)[0] : null
  if (value === 'accept' || value === 'approved' || value === 'acceptWithExecpolicyAmendment') return { outcome: selected(optionFor(options, 'allow_once', 'allow_always')), grant: false, allowed: true }
  if (value === 'acceptForSession' || value === 'approved_for_session') return { outcome: selected(optionFor(options, 'allow_once', 'allow_always')), grant: true, allowed: true }
  if (value === 'cancel' || value === 'abort') return { outcome: selected(optionFor(options, 'reject_once', 'reject_always')), interrupt: true, allowed: false }
  return { outcome: selected(optionFor(options, 'reject_once', 'reject_always')), allowed: false }
}

/**
 * The permission an approved plan continues with. Bypass only when the plan card chose it explicitly
 * (planTargetOf; the app validated it); a remembered Bypass falls back to Auto.
 */
export const planTargetOf = (chosen, remembered) =>
  chosen === 'auto' || chosen === 'ask' || chosen === 'acceptEdits' || chosen === 'bypass' ? chosen : remembered === 'bypass' ? 'auto' : remembered
export function afterPlanPermission(afterPlan, current) {
  if (afterPlan === 'bypass') return { ...current, mode: 'bypass', approvalPolicy: 'never', sandbox: 'danger-full-access' }
  const mode = afterPlan === 'ask' || afterPlan === 'acceptEdits' ? afterPlan : 'auto'
  return { ...current, mode, approvalPolicy: mode === 'auto' ? 'on-request' : 'untrusted', sandbox: 'workspace-write' }
}

/** Codex SandboxPolicy for a thread response. */
export function sandboxPolicyOf(permission, cwd) {
  if (permission.mode === 'bypass') return { type: 'dangerFullAccess' }
  if (isReadOnlyMode(permission.mode)) return { type: 'readOnly', networkAccess: false }
  return { type: 'workspaceWrite', writableRoots: [cwd, ...(permission.writableRoots ?? [])].filter((value, index, all) => value && all.indexOf(value) === index), networkAccess: true, excludeTmpdirEnvVar: false, excludeSlashTmp: false }
}

// A file larger than this is not fingerprinted (a standing grant is then not offered for a call naming it).
const MAX_FINGERPRINT_BYTES = 16 * 1024 * 1024
// The input fields an execute call runs in (part of the command a grant covers).
const COMMAND_DIRS = ['cwd', 'directory', 'dir_path', 'workdir', 'working_directory']

/** JSON with object keys sorted at every level, so equal inputs give equal grant keys whatever their key order. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry === undefined ? null : entry)).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
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

const toolNameOf = (toolCall) => String(toolCall?._meta?.toolName ?? toolCall?.name ?? '')

/**
 * What "Allow for this session" covers, and whether it is offered at all (never past what the card showed):
 *   execute             that exact command (trimmed), in the same folder
 *   edit/delete/move    that tool for paths inside the session roots (realpath, so a symlink out does not count);
 *                       outside them (or with no known path) no standing grant: every such call asks
 *   anything else       that exact tool + input, which is what its card shows; a file it names counts by what it
 *                       holds now, so the same input over a changed file asks again
 * @returns {{ key: string|null, grantable: boolean }}
 */
export function sessionGrant(toolCall, { cwd, roots = [] } = {}) {
  const kind = toolCall?.kind ?? 'other'
  const raw = toolCall?.rawInput && typeof toolCall.rawInput === 'object' && !Array.isArray(toolCall.rawInput) ? toolCall.rawInput : null
  if (kind === 'execute') {
    const command = String(raw?.command ?? toolCall?.title ?? '').trim()
    if (!command) return { key: null, grantable: false }
    const dir = COMMAND_DIRS.map((key) => raw?.[key]).find((value) => typeof value === 'string' && value) ?? ''
    return { key: `execute\u0000${dir ? realPath(path.resolve(cwd ?? '/', dir)) : cwd ?? ''}\u0000${command}`, grantable: true }
  }
  if (EDIT_KINDS.has(kind)) {
    const clean = [cwd, ...roots].filter(Boolean)
    if (!clean.length || !insideRoots(pathsOf(toolCall, cwd), clean)) return { key: null, grantable: false }
    const scope = [...new Set(clean.map((root) => realPath(root)))].join('\u0001')
    return { key: `${kind}\u0000${toolNameOf(toolCall)}\u0000workspace:${scope}`, grantable: true }
  }
  const files = []
  for (const file of pathsOf(toolCall, cwd)) {
    const fingerprint = fileFingerprint(realPath(file))
    if (!fingerprint) return { key: null, grantable: false }
    files.push(`${realPath(file)}=${fingerprint}`)
  }
  const shown = `${toolNameOf(toolCall)}\u0000${String(toolCall?.title ?? '')}\u0000input:${stableJson(raw)}`
  return { key: `${kind}\u0000${shown}${files.length ? `\u0000files:${files.sort().join(',')}` : ''}`, grantable: true }
}

/** Session grants ("Allow for this session"), keyed by sessionGrant; cleared whenever the permission mode changes. */
export class SessionGrants {
  constructor() { this.keys = new Set() }
  /** @returns {{ key: string|null, grantable: boolean }} */
  offer(toolCall, scope) { return sessionGrant(toolCall, scope) }
  has(toolCall, scope) {
    const { key } = sessionGrant(toolCall, scope)
    return key !== null && this.keys.has(key)
  }
  /** Records a grant where one may be offered; returns whether it was recorded. */
  add(toolCall, scope) {
    const { key, grantable } = sessionGrant(toolCall, scope)
    if (!grantable || key === null) return false
    this.keys.add(key)
    return true
  }
  clear() { this.keys.clear() }
}
