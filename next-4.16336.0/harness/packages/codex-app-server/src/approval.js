/**
 * Harness `approval/request` → Codex approval cards: where an ask came from,
 * what "Allow for this session" may remember, the English reason line, and
 * the client's extra writable roots.
 *
 *   origin 'ask'         the bridge's own Ask-mode pre-execute ask (index.js
 *                        records its call ids); everything else is a Harness
 *                        sandbox escalation (dsh-sandbox approveEscalation)
 *   grant keys           ask:file | ask:command:<cmd> | ask:tool:<name>
 *                        escalate:<mode>:command:<cwd>\0<cmd> | escalate:<mode>:file:<paths> | escalate:<mode>:tool:<name>
 *   extra roots          sandboxPolicy.writableRoots minus cwd; a write/edit
 *                        escalation whose own file_path lies inside them is
 *                        allowed without a card
 *
 *   sub-agents           children run under Harness approval 'never', so in
 *                        Ask mode the bridge asks for their mutating calls
 *                        itself, on the root thread's card (rootThreadFor,
 *                        childDecision, childApproval)
 *
 *   accept edits         the app's Accept edits mode (hint 'acceptEdits', policy
 *                        'untrusted'): a write/edit whose file lies inside the
 *                        workspace (cwd or an extra root) runs without the
 *                        Ask-mode card (acceptsEdit); bash and every other
 *                        mutating tool still ask
 *
 * approvalDecision / approvalAnswer / updatePermission / presetFor hold the
 * decisions index.js wires to the approval/request hook; applyPermissions /
 * applyPreset / livePermissions apply them to a live thread through the
 * planMode and permissionPresets services index.js passes in.
 */

import { realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { permissionHint } from './questions.js'

// dsh-sandbox approveEscalation: reason `escalate sandbox to <mode>: <why>`,
// displayReason.en `Allow this operation with <mode> permissions: <why>`.
const ESCALATE_REASON = /escalate sandbox to ([\w-]+)/
const ESCALATE_DISPLAY = /with ([\w-]+) permissions/
const REASON_LEDES = [/^Allow this operation with [\w-]+ permissions:\s*/, /^escalate sandbox to [\w-]+:\s*/]
const SANDBOX_PRESETS = { 'read-only': 'read-only', 'workspace-write': 'workspace-write', 'danger-full-access': 'danger-full-access' }
const POLICY_SANDBOX = { readOnly: 'read-only', workspaceWrite: 'workspace-write', dangerFullAccess: 'danger-full-access', externalSandbox: 'workspace-write' }
// A `..` segment. dsh-fs-local keeps a path with one as spelled and lets the
// filesystem resolve it, so `link/..` climbs out of the link's target, where
// path.resolve would drop `link` by text.
const PARENT_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/

/** Tools that never change anything; Ask mode lets them run without a prompt. */
export const READ_ONLY_TOOLS = new Set(['read', 'read_image', 'glob', 'grep', 'web_fetch', 'web_search', 'todo_write', 'job_output', 'job_list', 'list_agents', 'get_goal', 'skill', 'exit_plan_mode', 'ask_user_question'])
// The goal bookkeeping tools (dsh tool-goal create_goal / update_goal) change only the session's own goal record, like
// todo_write: the official runtime's approval asks only for sandbox escalations, so Ask mode never stops an unattended
// /goal on a card about marking it complete.
export const SESSION_STATE_TOOLS = new Set(['create_goal', 'update_goal'])
// A sub-agent reporting to (or stopping) an adjacent agent changes no file;
// a continuable child is told to send its result with send_message.
const CHILD_QUIET_TOOLS = new Set(['send_message', 'interrupt_agent'])
// OpenClaude Desktop's own tools (app-tools.js): no card in Ask mode, the app asks the user itself where it matters (as Codex
// runs them with default_tools_approval_mode "approve").
const isAppTool = (toolName) => typeof toolName === 'string' && toolName.startsWith('mcp__code_desktop__')
// Delegation levels rootThreadFor walks before giving up.
const MAX_DELEGATION_WALK = 8

// The file-editing tools Accept edits lets through (dsh tool-fs write.ts / edit.ts).
const EDIT_TOOLS = new Set(['write', 'edit'])

/** The sandbox mode an escalation asks for; null when the request is not one. */
export function escalationModeOf(request) {
  const fromReason = typeof request?.reason === 'string' ? ESCALATE_REASON.exec(request.reason) : null
  if (fromReason) return fromReason[1]
  const display = request?.displayReason?.en
  const fromDisplay = typeof display === 'string' ? ESCALATE_DISPLAY.exec(display) : null
  return fromDisplay ? fromDisplay[1] : null
}

const changePaths = (item) => (Array.isArray(item?.changes) ? item.changes.map((change) => change?.path).filter((path) => typeof path === 'string') : [])

/**
 * What an "Allow for this session" answer remembers. Ask-mode grants follow
 * the source's per-tool "Don’t ask again": every write/edit, one exact bash
 * command, or one tool whatever its arguments. An escalation grant is
 * scoped by the requested mode and its exact command (in its working
 * directory) or files, so an Ask grant never answers an escalation. null
 * without the call's item.
 * @param {{origin: 'ask' | 'escalation', toolName: string, item?: {type: string, command?: string, changes?: Array<{path: string}>}, mode?: string | null}} input
 */
export function grantKeyFor({ origin, toolName, item, mode }) {
  if (!item) return null
  if (origin === 'ask') {
    if (item.type === 'fileChange') return 'ask:file'
    if (item.type === 'commandExecution') return `ask:command:${item.command}`
    return `ask:tool:${toolName}`
  }
  const scope = `escalate:${mode ?? 'unknown'}`
  if (item.type === 'commandExecution') return `${scope}:command:${item.cwd ?? ''}\0${item.command}`
  if (item.type === 'fileChange') return `${scope}:file:${changePaths(item).sort().join('|')}`
  return `${scope}:tool:${toolName}`
}

/**
 * Whether the card may offer "Allow for this session". A file escalation to
 * full access (or to a mode the request does not name) is never remembered:
 * the source offers no standing grant outside the project folder.
 */
export function sessionGrantable({ origin, mode, item }) {
  if (!item) return false
  return !(origin === 'escalation' && item.type === 'fileChange' && (mode === 'danger-full-access' || !mode))
}

/**
 * The card's reason line. The bridge's own Ask-mode ask has none (the card
 * itself is the question); an escalation shows its English justification
 * without the "Allow this operation with <mode> permissions:" lede, after the
 * mode it needs. The zh text is never used.
 */
export function reasonFor(request, origin) {
  if (origin === 'ask') return null
  const raw = request?.displayReason?.en ?? request?.reason ?? null
  if (typeof raw !== 'string') return null
  const text = REASON_LEDES.reduce((value, lede) => value.replace(lede, ''), raw.trim()).trim()
  const mode = escalationModeOf(request)
  if (!mode) return text || null
  return text ? `Needs ${mode}: ${text}` : `Needs ${mode}`
}

/** `path` is one of `roots` or lies under one ('../' and sibling prefixes do not). */
export function withinRoots(path, roots) {
  if (typeof path !== 'string' || !isAbsolute(path)) return false
  const target = resolve(path)
  return roots.some((root) => {
    const base = resolve(root)
    return target === base || target.startsWith(base.endsWith(sep) ? base : base + sep)
  })
}

/**
 * Canonical form of an absolute path that may not exist yet, resolved the
 * way dsh-fs-local resolves a write target: the spelled path through
 * realpath, else its deepest existing ancestor plus the missing rest. A
 * symlink inside an extra root that points elsewhere therefore resolves
 * outside it, and a `..` after a symlink climbs out of the link's target
 * (never collapsed by text). null for a relative path, or when the missing
 * rest crosses a `..` (Harness refuses to resolve those).
 */
export async function canonicalTarget(path, resolveReal = realpath) {
  if (typeof path !== 'string' || !isAbsolute(path)) return null
  let head = PARENT_SEGMENT.test(path) ? path : resolve(path)
  const rest = []
  for (;;) {
    try {
      return join(await resolveReal(head), ...rest)
    } catch {
      const parent = dirname(head)
      if (parent === head) return join(head, ...rest)
      if (basename(head) === '..') return null
      rest.unshift(basename(head))
      head = parent
    }
  }
}

/**
 * The client's extra writable roots (Codex sandboxPolicy.writableRoots, which
 * OpenClaude Desktop fills with cwd + its added folders), canonical, without cwd.
 * Harness workspace-write has the session cwd as its only root.
 */
export async function extraRootsOf(writableRoots, cwd, resolveReal = realpath) {
  if (!Array.isArray(writableRoots)) return []
  const roots = await Promise.all(writableRoots
    .filter((root) => typeof root === 'string' && isAbsolute(root))
    .map(async (root) => {
      try { return await resolveReal(root) } catch { return resolve(root) }
    }))
  return [...new Set(roots)].filter((root) => root !== cwd)
}

/**
 * A write/edit escalation that writes only inside the client's extra roots:
 * the folder the user added is writable, so it needs no card. Decided on the
 * call's own `file_path`, the spelling Harness resolves, not on the item: the
 * projection resolves a relative path against cwd by text, which hides a
 * `..` that Harness follows through a symlink. Any `..` therefore asks, and
 * the item must describe exactly that one file. Commands and other tools
 * always ask (their effect is not limited to named paths).
 * @param {{item?: {type: string, changes?: Array<{path: string, kind?: {move_path?: string | null}}>}, args?: {file_path?: unknown}, cwd?: string}} call
 */
export async function writesInsideRoots({ item, args, cwd } = {}, roots, resolveReal = realpath) {
  if (item?.type !== 'fileChange' || !Array.isArray(roots) || roots.length === 0) return false
  const spelled = args?.file_path
  if (typeof spelled !== 'string' || !spelled.trim() || PARENT_SEGMENT.test(spelled)) return false
  if (!isAbsolute(spelled) && !(typeof cwd === 'string' && isAbsolute(cwd))) return false
  // Without a `..`, resolving by text names the same file the filesystem would.
  const target = isAbsolute(spelled) ? resolve(spelled) : resolve(cwd, spelled)
  const changes = Array.isArray(item.changes) ? item.changes : []
  const describesTarget = (change) => typeof change?.path === 'string' && isAbsolute(change.path) && !PARENT_SEGMENT.test(change.path)
    && resolve(change.path) === target && change.kind?.move_path == null
  if (changes.length === 0 || !changes.every(describesTarget)) return false
  return withinRoots(await canonicalTarget(target, resolveReal), roots)
}

/**
 * Accept edits (shared-14 aE acceptEdits, "Automatically accept all file edits"):
 * a write/edit call whose own `file_path` resolves inside the workspace — the
 * thread's cwd or one of the client's extra roots — skips the Ask-mode card. The
 * path is resolved the way writesInsideRoots does (no `..`, canonical through
 * symlinks), so a link out of the workspace still asks. Anything else asks.
 * @param {{permission?: {mode?: string, extraRoots?: string[]}, toolName?: string, args?: {file_path?: unknown}, cwd?: string, root?: string}} call
 *   cwd resolves a relative file_path; root is the workspace (defaults to cwd)
 */
export async function acceptsEdit({ permission, toolName, args, cwd, root = cwd } = {}, resolveReal = realpath) {
  if (permission?.mode !== 'acceptEdits' || !EDIT_TOOLS.has(toolName)) return false
  const spelled = args?.file_path
  if (typeof spelled !== 'string' || !spelled.trim() || PARENT_SEGMENT.test(spelled)) return false
  if (!isAbsolute(spelled) && !(typeof cwd === 'string' && isAbsolute(cwd))) return false
  if (typeof root !== 'string' || !isAbsolute(root)) return false
  const target = await canonicalTarget(isAbsolute(spelled) ? resolve(spelled) : resolve(cwd, spelled), resolveReal)
  let workspace
  try { workspace = await resolveReal(root) } catch { workspace = resolve(root) }
  return withinRoots(target, [workspace, ...(Array.isArray(permission.extraRoots) ? permission.extraRoots : [])])
}

/**
 * The Harness permission preset a Codex permission maps to. Full access
 * needs approvalPolicy 'never' too (Bypass); otherwise it stays workspace-write.
 * @returns {string | undefined}
 */
export function presetTarget({ approvalPolicy, sandbox }) {
  if (approvalPolicy === 'never' && sandbox === 'danger-full-access') return 'danger-full-access'
  return SANDBOX_PRESETS[sandbox] === 'danger-full-access' ? 'workspace-write' : SANDBOX_PRESETS[sandbox]
}

/**
 * The "Allow for this session" answers a live thread remembers (in memory;
 * Harness has no standing grant). Escalation grants hold for one preset: a
 * change of the effective preset drops them, Ask-mode grants stay.
 */
export class SessionGrants {
  #keys = new Set()
  #preset = undefined

  has(key) {
    return key !== null && this.#keys.has(key)
  }

  add(key) {
    if (key !== null) this.#keys.add(key)
  }

  /** The effective preset was applied (or re-applied) for the thread. */
  presetApplied(target) {
    if (this.#preset !== undefined && target !== this.#preset) {
      for (const key of this.#keys) if (key.startsWith('escalate:')) this.#keys.delete(key)
    }
    this.#preset = target
  }

  get size() {
    return this.#keys.size
  }
}

/**
 * A request's Codex permission fields (approvalPolicy, sandbox or
 * sandboxPolicy, the app's mode hint) applied to a thread's permission.
 * Extra writable roots come only with a turn's workspaceWrite policy; any
 * other sandbox drops them (thread/start and resume send a bare mode).
 * @returns {Promise<boolean>} whether the request carried a mode hint
 */
export async function updatePermission(permission, params, cwd, resolveReal = realpath) {
  if (typeof params.approvalPolicy === 'string') permission.approvalPolicy = params.approvalPolicy
  const sandbox = typeof params.sandbox === 'string' ? params.sandbox : params.sandboxPolicy?.type ? POLICY_SANDBOX[params.sandboxPolicy.type] : undefined
  if (sandbox) permission.sandbox = sandbox
  if (params.sandboxPolicy?.type === 'workspaceWrite') permission.extraRoots = await extraRootsOf(params.sandboxPolicy.writableRoots, cwd, resolveReal)
  else if (sandbox && sandbox !== 'workspace-write') permission.extraRoots = []
  const hint = permissionHint(params)
  if (!hint) return false
  permission.mode = hint.mode
  permission.afterPlan = hint.afterPlan
  return true
}

/**
 * The preset to apply for a thread's permission, recorded on its grants: an
 * escalation grant answered for the previous preset only.
 * @returns {string | undefined}
 */
export function presetFor(permission, grants) {
  const target = presetTarget(permission)
  if (target) grants.presetApplied(target)
  return target
}

/**
 * The app's Plan selection is Harness plan mode (plan guidance in each
 * request, exit_plan_mode allowed); every other hinted mode turns it off.
 * Synced on every hint, not only on a Plan transition: the session log
 * keeps plan mode across a core restart, while the bridge starts unhinted.
 * set() is a no-op when the state already matches, and during a running
 * turn it applies from the next step.
 * @param {{id: string, agent: object, permission: {mode?: string}}} thread
 * @param {{set(agent: object, on: boolean): void} | undefined} planMode the planMode service
 */
export function syncPlanMode(thread, planMode, warn = () => {}) {
  if (!planMode) return
  try {
    planMode.set(thread.agent, thread.permission.mode === 'plan')
  } catch (error) {
    warn(`plan mode ${thread.permission.mode === 'plan' ? 'on' : 'off'} failed for ${thread.id}`, error)
  }
}

/**
 * The thread's preset applied through the permissionPresets service, when it
 * differs from the session's current one. Also drops the escalation grants
 * when the target changes (presetFor).
 * @param {{agent: {session: object}, permission: object, sessionGrants: SessionGrants}} thread
 * @param {{current(session: object): string, set(session: object, target: string): Promise<void>} | undefined} presets
 */
export async function applyPreset(thread, presets, warn = () => {}) {
  const target = presetFor(thread.permission, thread.sessionGrants)
  if (!target) return
  if (!presets) throw new Error('Harness permission presets are unavailable')
  try {
    if (presets.current(thread.agent.session) !== target) await presets.set(thread.agent.session, target)
  } catch (error) {
    warn(`permission preset ${target} failed`, error)
    throw error
  }
}

/**
 * A request's permission fields (thread/start, thread/resume, turn/start,
 * codeDesktop/thread/permissions) applied to a live thread: its permission,
 * Harness plan mode when the request carried a mode hint, then its preset.
 * @param {{planMode?: object, presets?: object, warn?: (message: string, error: unknown) => void}} services
 */
export async function applyPermissions(thread, params, { planMode, presets, warn } = {}, resolveReal = realpath) {
  if (await updatePermission(thread.permission, params, thread.cwd, resolveReal)) syncPlanMode(thread, planMode, warn)
  await applyPreset(thread, presets, warn)
}

/**
 * codeDesktop/thread/permissions: a Mode change while a turn runs, applied now
 * to a loaded thread with turn/start's permission params. A thread that is not
 * loaded (or is closing) is left alone: its next turn/start or thread/resume
 * carries the new mode anyway.
 * @param {object | undefined} live the loaded thread, if any
 * @param {(thread: object, params: object) => Promise<void>} apply applyPermissions with the core's services
 * @returns {Promise<{applied: boolean}>}
 */
export async function livePermissions(live, params, apply) {
  if (!live || live.closing) return { applied: false }
  await apply(live, params)
  return { applied: true }
}

/**
 * What the bridge does with one Harness approval/request before any card.
 * The call's Ask-mode record is consumed first (the same call can ask twice:
 * its Ask-mode ask, then a sandbox escalation), even when Plan refuses it.
 *   reject   Plan and a review turn (mode 'review', review.js): the read-only sandbox's escalations are refused,
 *            never offered
 *   allow    a write/edit escalation inside the extra roots, or a remembered grant
 *   ask      a card, with its origin, reason and session grant
 * @param {{request: {callId: string, toolName: string, reason?: string, displayReason?: object}, askedCalls: Set<string>, permission: {mode?: string, extraRoots: string[]}, item?: object, args?: object, cwd?: string, grants: SessionGrants}} input
 */
export async function approvalDecision({ request, askedCalls, permission, item, args, cwd, grants }, resolveReal = realpath) {
  const origin = askedCalls.delete(request.callId) ? 'ask' : 'escalation'
  if (permission.mode === 'plan' || permission.mode === 'review' || permission.approvalPolicy === 'never') return { kind: 'reject', origin }
  const mode = origin === 'escalation' ? escalationModeOf(request) : null
  // A folder the client declared writable needs no card for a file write
  // (Harness workspace-write only knows cwd). Only a recognised sandbox
  // escalation qualifies: any other asker's explicit ask is shown.
  if (mode && await writesInsideRoots({ item, args, cwd }, permission.extraRoots, resolveReal)) return { kind: 'allow', origin, via: 'extra-root' }
  const grantKey = grantKeyFor({ origin, toolName: request.toolName, item, mode })
  if (grants.has(grantKey)) return { kind: 'allow', origin, via: 'session-grant' }
  return { kind: 'ask', origin, mode, reason: reasonFor(request, origin), grantKey, grantable: grantKey !== null && sessionGrantable({ origin, mode, item }) }
}

/**
 * The Harness answer to a card's Codex decision. "Allow for this session" is
 * remembered only when the card offered it; Cancel also stops the turn.
 * @returns {{answer: 'allowed-once' | 'rejected', interrupt: boolean}}
 */
export function approvalAnswer(decision, { grantKey, grantable }, grants) {
  if (decision === 'acceptForSession' && grantable) grants.add(grantKey)
  // execpolicy/network amendments are objects: they allow this call too.
  const allowed = decision === 'accept' || decision === 'acceptForSession' || (decision !== null && typeof decision === 'object')
  return { answer: allowed ? 'allowed-once' : 'rejected', interrupt: decision === 'cancel' }
}

/**
 * The live root thread a sub-agent works for: the first session up its
 * parentSession chain that `threads` holds, within 8 delegation levels. Only
 * sub-agent sessions (header.origin 'subagent') are walked, so a fork root
 * never resolves to the thread it was forked from; an intermediate child's
 * header comes from `headerOf(id)` (its live agent).
 * @param {{session?: {header?: {origin?: string, parentSession?: string}}} | undefined} agent
 * @param {Map<string, object>} threads
 * @param {(id: string) => ({origin?: string, parentSession?: string} | undefined)} headerOf
 */
export function rootThreadFor(agent, threads, headerOf = () => undefined) {
  let header = agent?.session?.header
  for (let depth = 0; depth < MAX_DELEGATION_WALK && header?.origin === 'subagent' && typeof header.parentSession === 'string'; depth++) {
    const root = threads.get(header.parentSession)
    if (root) return root
    header = headerOf(header.parentSession)
  }
  return undefined
}

/**
 * A sub-agent's pre-execute gate. Harness pins children to approval 'never'
 * (an 'ask' would be auto-rejected), so under an Ask-mode root the bridge asks
 * the client itself for every call that may change something.
 * @returns {'ask-client' | 'next'}
 */
export function childDecision({ rootPolicy, toolName }) {
  return rootPolicy === 'untrusted' && !READ_ONLY_TOOLS.has(toolName) && !isAppTool(toolName) && !SESSION_STATE_TOOLS.has(toolName) && !CHILD_QUIET_TOOLS.has(toolName) ? 'ask-client' : 'next'
}

/**
 * The Ask-mode pre-execute gate of a root thread's own call: 'next' lets it run
 * (any policy but 'untrusted', a read-only tool, or a workspace edit under
 * Accept edits), 'ask' raises the bridge's card.
 * @returns {Promise<'ask' | 'next'>}
 */
export async function preExecuteDecision({ permission, toolName, args, cwd }, resolveReal = realpath) {
  if (permission?.approvalPolicy !== 'untrusted' || READ_ONLY_TOOLS.has(toolName) || SESSION_STATE_TOOLS.has(toolName) || isAppTool(toolName)) return 'next'
  return await acceptsEdit({ permission, toolName, args, cwd }, resolveReal) ? 'next' : 'ask'
}

/**
 * The card for one sub-agent call, raised on the root thread (the session the
 * user is looking at). itemId is the child's own call id: the root's
 * transcript has no item for it, so the card shows the command (or, through
 * the bridge's `changes` field, the diff) instead of the parent's agent row.
 * A remembered Ask-mode grant of the root answers without a card.
 * @param {{threadId: string, turnId: string, callId: string, toolName: string, args: unknown, item?: object, cwd: string, label?: string | null, grants: SessionGrants, now?: number}} input
 */
export function childApproval({ threadId, turnId, callId, toolName, args, item, cwd, label, grants, now = Date.now() }) {
  const grantKey = grantKeyFor({ origin: 'ask', toolName, item })
  if (grants.has(grantKey)) return { kind: 'allow', grantKey }
  const grantable = grantKey !== null && sessionGrantable({ origin: 'ask', item })
  const reason = label ? `Requested by the “${label}” agent.` : 'Requested by a sub-agent.'
  const base = { threadId, turnId, itemId: callId, startedAtMs: now, reason, sessionGrantable: grantable }
  if (item?.type === 'fileChange') {
    return { kind: 'ask', grantKey, grantable, method: 'item/fileChange/requestApproval', params: { ...base, grantRoot: null, changes: item.changes } }
  }
  const command = item?.type === 'commandExecution' ? item.command : `${toolName} ${typeof args === 'string' ? args : JSON.stringify(args ?? {})}`
  return {
    kind: 'ask', grantKey, grantable, method: 'item/commandExecution/requestApproval',
    params: {
      kind: 'command', ...base, approvalId: null, environmentId: null, command, cwd: item?.cwd || cwd,
      commandActions: item?.commandActions ?? [{ type: 'unknown', command }],
    },
  }
}
