/**
 * OpenClaude Desktop's permission modes on OpenCode / MiMo Code.
 *
 * The app sends approvalPolicy + sandbox/sandboxPolicy, plus
 * codeDesktop.permissionMode / afterPlan (permissionHints). The bridge keeps
 * one permission state per thread and enforces it three ways:
 *
 *  1. The session's permission ruleset (PATCH /session/:id {permission}),
 *     evaluated after the agent's own rules (last match wins), the same in every mode
 *     (OpenCode reads it once per prompt loop, so it must not encode the mode):
 *       - everything not read-only asks (`* → ask`, read-only tools → allow), so every
 *         bash / edit / external_directory / MCP call reaches the bridge as permission.asked;
 *       - plan files stay writable; plan_exit is allowed only in Plan (the app owns the mode);
 *       - tool selection (tools.js) appends `<tool> → deny`, which removes the tool from
 *         the model request (OpenCode Permission.disabled).
 *  2. The bridge answers each permission.asked from the thread's *current* mode
 *     (decide below): allow without a card, a Codex approval card, or reject.
 *     A Mode change therefore applies to the very next call (livePermissions). Under approvalPolicy "never" (a
 *     Codex-style client with nobody to ask, e.g. the workflow runner's agents) a would-be card is a reject with a
 *     reason, which the agent reads and continues from.
 *     "Allow for this session" is kept here, per root thread (sessionGrant), and the agent
 *     only ever hears `once`: OpenCode's own `always` is stored per project folder, not per
 *     session, and it outranks every session ruleset, so it would let later calls in other
 *     sessions, and in read-only modes, run without ever asking.
 *  3. Shell commands run in a Seatbelt sandbox (sandbox.js): workspace-write for
 *     Auto / Ask / Accept edits (cwd, extra roots and temp writable; network per
 *     sandboxPolicy.networkAccess), read-only for Plan / chat / review, none for Bypass.
 *
 * Sub-agent sessions get the root's ruleset when they are created and their
 * asks are decided by the root thread's mode, on the root thread's card.
 *
 * MiMo Code (flavor.modeRules) differs in one way: its background actors (the default
 * `spawn` of the actor tool) never ask a person. Their asks are answered from the
 * session's own ruleset and otherwise fail closed, with no permission.asked. So for MiMo
 * the ruleset also grants what the thread's mode already allows (modeGrantRules, the
 * rules form of decide) and the root's "Allow for this session" grants, and is
 * re-PATCHed on every mode change. A change made mid-turn then reaches calls that
 * would have asked at once, and the rest from the agent's next prompt loop; switching
 * to a read-only mode mid-turn is still enforced at once, by the sandbox for shell
 * commands and by the plugin's edit guard for file edits (plugin.js).
 *
 * The user's own permission config (opencode.json / mimocode.json, global and project)
 * keeps its explicit denies (userRules): they are appended after the bridge's rules, so
 * a Mode never runs what the agent's settings forbid.
 */
import path from 'node:path'

export const MODES = Object.freeze(['auto', 'ask', 'acceptEdits', 'plan', 'bypass', 'chat', 'review'])
const AFTER_PLAN = new Set(['auto', 'ask', 'acceptEdits'])
const SANDBOX_OF_POLICY = { readOnly: 'read-only', workspaceWrite: 'workspace-write', dangerFullAccess: 'danger-full-access', externalSandbox: 'workspace-write' }
const SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access'])
const READ_ONLY_MODES = new Set(['plan', 'chat', 'review'])
/** Modes where nothing may change files or run side effects: no session grant is offered, recorded or honoured there. */
export const isReadOnlyMode = (mode) => READ_ONLY_MODES.has(mode)

/**
 * Whether two permission states differ in what session grants depend on (mode, approvals, sandbox, roots): a change
 * drops the grants, so an "Allow for this session" given in one mode never carries into another.
 */
export const grantScopeChanged = (previous, next) => {
  const scope = (permission) => JSON.stringify([permission?.mode, permission?.approvalPolicy, permission?.sandbox, permission?.extraRoots ?? []])
  return scope(previous) !== scope(next)
}
const EDIT_TOOLS = new Set(['edit', 'write', 'apply_patch', 'patch', 'multiedit', 'notebook_edit'])

/** The initial permission state of a thread. */
export function defaultPermission() {
  return { approvalPolicy: 'on-request', sandbox: 'workspace-write', mode: 'auto', afterPlan: 'auto', extraRoots: [], network: false }
}

/** The mode the params imply when the app sends no hint (a Codex-style client). */
function modeOf({ approvalPolicy, sandbox }) {
  if (sandbox === 'danger-full-access' && approvalPolicy === 'never') return 'bypass'
  if (sandbox === 'read-only') return 'chat'
  if (approvalPolicy === 'untrusted') return 'ask'
  return 'auto'
}

/**
 * Fold one request's permission params into a thread's state (returns a new object).
 * Absent fields keep the current value.
 */
export function applyPermissionParams(current, params = {}) {
  const next = { ...defaultPermission(), ...current, extraRoots: [...(current?.extraRoots ?? [])] }
  if (typeof params.approvalPolicy === 'string') next.approvalPolicy = params.approvalPolicy
  if (typeof params.sandbox === 'string' && SANDBOX_MODES.has(params.sandbox)) next.sandbox = params.sandbox
  const policy = params.sandboxPolicy
  if (policy && typeof policy === 'object' && SANDBOX_OF_POLICY[policy.type]) {
    next.sandbox = SANDBOX_OF_POLICY[policy.type]
    next.network = policy.networkAccess === true
    if (policy.type === 'workspaceWrite') {
      next.excludeTmpdir = policy.excludeTmpdirEnvVar === true
      next.excludeSlashTmp = policy.excludeSlashTmp === true
    }
    if (policy.type === 'workspaceWrite') next.extraRoots = (Array.isArray(policy.writableRoots) ? policy.writableRoots : []).filter((root) => typeof root === 'string' && path.isAbsolute(root))
  }
  const hint = params.codeDesktop
  const hinted = hint && typeof hint === 'object' && MODES.includes(hint.permissionMode) ? hint.permissionMode : null
  if (hinted) next.mode = hinted
  else if (typeof params.approvalPolicy === 'string' || typeof params.sandbox === 'string' || policy) next.mode = modeOf(next)
  if (hint && AFTER_PLAN.has(hint.afterPlan)) next.afterPlan = hint.afterPlan
  // Never weaker than the sandbox asked for: a read-only sandbox is read-only whatever the hint.
  if (next.sandbox === 'read-only' && !['plan', 'chat', 'review'].includes(next.mode)) next.mode = 'chat'
  if (next.mode === 'bypass' && next.sandbox !== 'danger-full-access') next.mode = next.approvalPolicy === 'untrusted' ? 'ask' : 'auto'
  return next
}

/** The permission after an approved plan (the app's afterPlanPermission). */
export function afterPlanState(current, chosen) {
  // Bypass only as the plan card's explicit choice (the app validated it); never from the remembered hint.
  if (chosen === 'bypass') return { ...current, mode: 'bypass', sandbox: 'danger-full-access', approvalPolicy: 'never' }
  const mode = AFTER_PLAN.has(chosen) ? chosen : AFTER_PLAN.has(current.afterPlan) ? current.afterPlan : 'auto'
  return { ...current, mode, sandbox: 'workspace-write', approvalPolicy: mode === 'auto' ? 'on-request' : 'untrusted' }
}

/** The OpenCode agent a turn runs with. */
// The OpenCode agent a turn runs: Plan mode runs 'plan'; every other mode the thread's primary agent (the user's
// default_agent, a chosen primary agent, else 'build'; index.js primaryAgent resolves it from GET /agent).
export const agentFor = (permission, primary = 'build') => (permission?.mode === 'plan' ? 'plan' : (typeof primary === 'string' && primary ? primary : 'build'))

/** The sandbox policy for the thread's shell commands. */
export function sandboxPolicy(permission, { cwd, tmp = [], slashTmp = ['/tmp', '/private/tmp'] } = {}) {
  tmp = [...(permission.excludeTmpdir ? [] : tmp), ...(permission.excludeSlashTmp ? [] : slashTmp)]
  const mode = permission.mode === 'bypass' ? 'danger-full-access' : ['plan', 'chat', 'review'].includes(permission.mode) || permission.sandbox === 'read-only' ? 'read-only' : 'workspace-write'
  const roots = mode === 'workspace-write' ? [...new Set([cwd, ...(permission.extraRoots ?? []), ...tmp].filter((root) => typeof root === 'string' && path.isAbsolute(root)))] : []
  return { mode, roots, network: permission.network === true }
}

const rule = (name, action, pattern = '*') => ({ permission: name, pattern, action })
/** Secrets stay behind a card, as OpenCode's own defaults do. */
const secretRules = () => [rule('read', 'ask', '*.env'), rule('read', 'ask', '*.env.*'), rule('read', 'allow', '*.env.example')]

/**
 * What a mode allows without a card, as session rules (decideMode below, written for an agent whose
 * background sub-agents read the ruleset instead of asking; flavor.modeRules).
 * @param {object} permission
 * @param {string[]} roots - extra writable roots (outside the workspace) the mode may use
 */
export function modeGrantRules(permission, roots = []) {
  const mode = permission?.mode
  if (mode === 'bypass') return [rule('*', 'allow')]
  if (READ_ONLY_MODES.has(mode)) return [rule('bash', 'allow')] // in the read-only sandbox
  const out = []
  // Auto: every tool runs (shell commands in the workspace sandbox); paths outside the
  // workspace, secrets and repeated calls still ask.
  if (mode === 'auto') out.push(rule('*', 'allow'), rule('external_directory', 'ask'), ...secretRules(), rule('doom_loop', 'ask'))
  if (mode === 'acceptEdits') out.push(rule('edit', 'allow'))
  for (const root of roots) if (typeof root === 'string' && path.isAbsolute(root)) out.push(rule('external_directory', 'allow', path.join(root, '*')))
  return out
}

/** OpenCode's `~` / `$HOME` expansion of a config permission pattern. */
function expandHome(pattern, home) {
  if (!home) return pattern
  if (pattern === '~') return home
  if (pattern.startsWith('~/')) return home + pattern.slice(1)
  if (pattern.startsWith('$HOME')) return home + pattern.slice(5)
  return pattern
}

/**
 * A config `permission` value (opencode.json / mimocode.json) as an ordered ruleset (OpenCode's
 * Permission.fromConfig): a string is `{"*": action}`, a tool's string is pattern `*`.
 */
export function configRules(permission, { home } = {}) {
  const actions = new Set(['allow', 'ask', 'deny'])
  if (typeof permission === 'string') return actions.has(permission) ? [rule('*', permission)] : []
  if (!permission || typeof permission !== 'object' || Array.isArray(permission)) return []
  const out = []
  for (const [name, value] of Object.entries(permission)) {
    if (typeof value === 'string') { if (actions.has(value)) out.push(rule(name, value)); continue }
    if (!value || typeof value !== 'object') continue
    for (const [pattern, action] of Object.entries(value)) if (actions.has(action)) out.push(rule(name, action, expandHome(pattern, home)))
  }
  return out
}

/** OpenCode's evaluate: the last rule matching both the permission and the pattern. */
export function evaluateRules(rules, permission, pattern) {
  return rules.findLast((entry) => wildcardMatch(permission, entry.permission) && wildcardMatch(pattern, entry.pattern))?.action ?? 'ask'
}

/**
 * The user's config rules that must outlast the bridge's: every explicit deny, plus the later
 * exceptions carved out of one (`bash: {"*": "deny", "git *": "allow"}`), which keep the
 * action the bridge's rules give them so they neither widen nor narrow the mode.
 */
export function userOverrides(userRules, base) {
  const out = []
  userRules.forEach((entry, index) => {
    if (entry.action === 'deny') { out.push(entry); return }
    const carved = userRules.slice(0, index).some((earlier) => earlier.action === 'deny' && (wildcardMatch(entry.permission, earlier.permission) || wildcardMatch(earlier.permission, entry.permission)))
    if (carved) out.push({ ...entry, action: evaluateRules(base, entry.permission, entry.pattern) })
  })
  return out
}

/**
 * The session ruleset for a permission state.
 * @param {object} permission
 * @param {{ readTools: string[], planPaths?: string[], planDirs?: string[], deny?: Array<{permission: string, pattern: string, action: string}>,
 *   modeRules?: boolean, roots?: string[], grants?: Array<{permission: string, patterns: string[]}>, hiddenSkills?: string[],
 *   userRules?: Array<{permission: string, pattern: string, action: string}> }} options
 *   modeRules: also grant what the mode allows (MiMo, see the header); roots: the thread's extra writable roots;
 *   grants: the root's session grants; hiddenSkills: skills the thread's agent must not see (MiMo's compose:*);
 *   userRules: the user's own config rules (configRules); appToolsPrefix: the tool-name prefix of OpenClaude Desktop's own
 *   tools server (app-tools.js appToolsPrefix), allowed in every mode
 */
export function sessionRules(permission, { readTools, planPaths = [], planDirs = [], deny = [], modeRules = false, roots = [], grants = [], hiddenSkills = [], userRules = [], appToolsPrefix = '' }) {
  // Without modeRules the same rules in every mode: OpenCode reads a session's ruleset once per prompt
  // loop, so a rule that allowed (or denied) something would outlive a Mode change made mid-turn. Every
  // non-read call asks instead, and the bridge answers from the thread's current mode.
  const rules = [rule('*', 'ask')]
  for (const tool of readTools) rules.push(rule(tool, 'allow'))
  rules.push(...secretRules())
  if (modeRules) rules.push(...modeGrantRules(permission, roots))
  // OpenClaude Desktop's own tools (app-tools.js) in every mode: the bridge answers a root's ask for one `once` anyway, and the
  // app asks the user itself where it matters (run_in_terminal, outside sites, workflows). As a rule it also reaches
  // MiMo's background actors, which never ask and would otherwise fail closed. Before the user's own denies and the tool
  // selection's (a profile that turns the server off still wins).
  if (typeof appToolsPrefix === 'string' && appToolsPrefix) rules.push(rule(`${appToolsPrefix}*`, 'allow'))
  // The plan agent writes its plan file even in Plan mode (in a folder without git, under the data folder).
  for (const pattern of planPaths) rules.push(rule('edit', 'allow', pattern))
  for (const dir of planDirs) if (typeof dir === 'string' && path.isAbsolute(dir)) rules.push(rule('external_directory', 'allow', path.join(dir, '*')))
  rules.push(rule('plan_enter', 'deny'), rule('plan_exit', permission.mode === 'plan' ? 'allow' : 'deny'))
  // The agent hides these from the thread's agent itself (the `skill` read-tool allow above would lift it).
  for (const pattern of hiddenSkills) rules.push(rule('skill', 'deny', pattern))
  if (modeRules && !READ_ONLY_MODES.has(permission.mode)) {
    for (const grant of grants) if (grant?.permission && grant.permission !== 'doom_loop') for (const pattern of grant.patterns ?? []) rules.push(rule(grant.permission, 'allow', pattern))
  }
  rules.push(...userOverrides(userRules, rules))
  return [...rules, ...deny]
}

/**
 * The folders an agent's own permission ruleset allows outside the workspace (GET /agent: external_directory rules with
 * action allow and a '<dir>/*' pattern), e.g. OpenCode's `references`, skill folders and tool-output folder.
 * @param {Array<{permission?: string, pattern?: string, action?: string}>} rules
 * @returns {string[]}
 */
export function allowedExternalDirs(rules) {
  const out = []
  for (const entry of Array.isArray(rules) ? rules : []) {
    if (entry?.permission !== 'external_directory' || entry.action !== 'allow' || typeof entry.pattern !== 'string') continue
    const dir = entry.pattern.replace(/\/\*+$/, '')
    if (dir !== entry.pattern && path.isAbsolute(dir) && dir !== path.parse(dir).root && !/[*?[\]{}]/.test(dir)) out.push(dir)
  }
  return [...new Set(out)]
}

/** Whether a path lies inside one of the roots (both absolute). */
export function withinRoots(file, roots) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) return false
  const target = path.resolve(file)
  return roots.some((root) => {
    if (typeof root !== 'string' || !path.isAbsolute(root)) return false
    const base = path.resolve(root)
    return target === base || target.startsWith(base.endsWith(path.sep) ? base : base + path.sep)
  })
}

/** The paths an external_directory ask is about (its patterns end in /*). */
function externalPaths(request) {
  const out = []
  for (const value of [request?.metadata?.filepath, request?.metadata?.parentDir, ...(request?.metadata?.directories ?? []), ...(request?.patterns ?? [])]) {
    if (typeof value === 'string' && value) out.push(value.replace(/[\\/]\*$/, ''))
  }
  return out
}

/**
 * How the bridge answers one permission.asked under a thread's current mode.
 * @param {object} permission - the (root) thread's state
 * @param {{ permission: string, patterns?: string[], metadata?: object }} request
 * @param {{ tool?: string, readTools: string[], cwd: string, grants?: Array<{permission: string, patterns: string[]}>, planDirs?: string[], readOnlyTool?: boolean }} context
 *   tool: the OpenCode tool that asked (from the request's callID); grants: the root thread's
 *   "Allow for this session" answers (sessionGrant); planDirs: the folders the agent keeps plan files in;
 *   readOnlyTool: the ask is for an MCP tool its server annotates read-only; noUser: no person answers this thread's cards
 *   (a workflow runner's agent, whatever approvalPolicy it last sent)
 * @returns {{ action: 'allow' | 'ask' | 'reject', reason?: string }}
 */
export function decide(permission, request, { tool, readTools, cwd, grants = [], planDirs = [], agentDirs = [], readOnlyTool = false, noUser = false }) {
  const decision = decideMode(permission, request, { tool, readTools, cwd, planDirs, agentDirs, readOnlyTool })
  // An "Allow for this session" grant answers what would otherwise ask, only in a mode that
  // may act at all (never Plan / chat / review), and never a repeated-call (doom loop) warning.
  if (decision.action === 'ask' && !READ_ONLY_MODES.has(permission.mode) && request?.permission !== 'doom_loop' && request?.permission !== 'bash_delete' && grantCovers(grants, request)) return { action: 'allow', reason: 'Allowed for this session.' }
  // approvalPolicy "never" (Codex: never ask; a Codex-style client such as the OpenClaude Desktop workflow runner, whose agents
  // run unattended and turn every approval down): what would ask is refused with a reason instead of a card. A reject with
  // a message is OpenCode's CorrectedError, which the agent reads and continues from (a bare reject would end its turn).
  if (decision.action === 'ask' && (neverAsks(permission) || (noUser === true && permission?.mode !== 'bypass'))) return { action: 'reject', reason: `Not allowed here: ${decision.reason ?? 'this needs the user’s approval.'} This agent runs without approvals and can’t ask the user, so continue without it.` }
  return decision
}

/** Whether a thread may never put a card in front of a person (approvalPolicy "never"; Bypass allows everything anyway). */
export const neverAsks = (permission) => permission?.approvalPolicy === 'never' && permission?.mode !== 'bypass'

function decideMode(permission, request, { tool, readTools, cwd, planDirs = [], agentDirs = [], readOnlyTool = false }) {
  const mode = permission.mode
  const kind = request?.permission
  if (mode === 'bypass') return { action: 'allow' }
  if (kind === 'doom_loop') return { action: 'ask', reason: 'The agent repeated the same tool call several times.' }
  // MCP sampling (MiMo mcp/sampling.ts): a connector asks to run a model call on the user's account. It changes no file,
  // so read-only modes ask too, and Auto asks as MiMo itself does (mcp.<name>.sampling defaults to ask): a paid model call
  // never happens without a person seeing it, unless the connector's own setting allows it (then MiMo never asks).
  if (kind === 'mcp_sampling') return { action: 'ask', reason: 'A connector asks to run a model request on your account.' }
  const readOnly = READ_ONLY_MODES.has(mode)
  // MiMo's forced confirmation for an irreversible delete (permission 'bash_delete', FORCED_ASK: no rule and no
  // skip-all pre-approves it, only --yolo): always a person's call, even in Auto; Bypass (--yolo) allows it above,
  // and a read-only mode refuses it. Never covered by a session grant (decide).
  if (kind === 'bash_delete') return readOnly ? { action: 'reject', reason: 'This mode cannot change files.' } : { action: 'ask', reason: 'This command permanently deletes files.' }
  const reads = new Set(readTools)
  const toolName = tool ?? kind
  const isEdit = EDIT_TOOLS.has(toolName) || kind === 'edit'
  if (kind === 'external_directory') {
    if (!isEdit && toolName !== 'bash' && reads.has(toolName)) return { action: 'allow' }
    // The plan file (outside the workspace in a folder without git): writable in every mode, Plan included.
    const planned = externalPaths(request)
    if (planned.length && planned.every((file) => withinRoots(file, planDirs))) return { action: 'allow' }
    if (readOnly) return toolName === 'bash' ? { action: 'allow' } : { action: 'reject', reason: 'This mode cannot change files.' }
    // agentDirs: the folders the agent itself allows outside the workspace (its external_directory allow rules:
    // `references` folders, skill folders, tool output, its tmp dir), which the bridge's `* → ask` ruleset would
    // otherwise turn into an 'Access outside the workspace' card.
    const roots = [cwd, ...(permission.extraRoots ?? []), ...agentDirs.filter((dir) => typeof dir === 'string' && path.isAbsolute(dir))]
    const paths = externalPaths(request)
    if (paths.length && paths.every((file) => withinRoots(file, roots))) return { action: 'allow' }
    return { action: 'ask', reason: `Access outside the workspace: ${paths[0] ?? request?.patterns?.[0] ?? ''}`.trim() }
  }
  if (isEdit) {
    if (readOnly) return { action: 'reject', reason: 'This mode cannot change files.' }
    if (mode === 'auto' || mode === 'acceptEdits') return { action: 'allow' }
    return { action: 'ask', reason: 'Ask permissions mode is on.' }
  }
  if (kind === 'bash') {
    // Commands run in the session's Seatbelt sandbox (read-only in Plan/chat/review).
    if (readOnly || mode === 'auto') return { action: 'allow' }
    return { action: 'ask', reason: 'Ask permissions mode is on.' }
  }
  // Reads are allowed by the ruleset; one that still asks is a secret (.env) read.
  if (kind === 'read') return { action: 'ask', reason: 'Reading a file that may hold secrets.' }
  if (reads.has(kind)) return { action: 'allow' }
  // A connector tool its server marks read-only (MCP annotations readOnlyHint, not destructiveHint) is a read, in every
  // mode, as for Codex (mcp_tool_call.rs requires_mcp_tool_approval).
  if (readOnlyTool === true) return { action: 'allow' }
  if (mode === 'auto') return { action: 'allow' }
  return { action: 'ask', reason: readOnly ? 'This tool may change something outside this read-only mode.' : 'Ask permissions mode is on.' }
}

/** Whether a Codex approval decision means "Allow for this session". */
export const isSessionDecision = (decision) => decision === 'acceptForSession' || decision === 'approved_for_session'

/**
 * The OpenCode reply for a Codex approval decision. Never `always`: the bridge keeps session
 * grants itself (sessionGrant), because OpenCode's `always` outlives the session and the mode.
 */
export function replyFor(decision) {
  if (decision === 'accept' || decision === 'approved' || isSessionDecision(decision)) return 'once'
  return 'reject'
}

/**
 * The grant an "Allow for this session" answer records: the ask's permission with the
 * patterns OpenCode proposes to remember (`always`, e.g. `git status *`, or `*` for edits),
 * else the ask's own patterns.
 */
export function sessionGrant(request) {
  const strings = (list) => (Array.isArray(list) ? list.filter((value) => typeof value === 'string' && value) : [])
  const always = strings(request?.always)
  const patterns = always.length ? always : strings(request?.patterns)
  return { permission: String(request?.permission ?? ''), patterns: patterns.length ? patterns : ['*'] }
}

/** OpenCode's wildcard match (`*` any run, `?` one character, a trailing ` *` also matches nothing). */
export function wildcardMatch(value, pattern) {
  const text = String(value ?? '').replaceAll('\\', '/')
  let source = String(pattern ?? '').replaceAll('\\', '/').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  if (source.endsWith(' .*')) source = `${source.slice(0, -3)}( .*)?`
  return new RegExp(`^${source}$`, 's').test(text)
}

/** Whether session grants cover every pattern of an ask (same permission). */
export function grantCovers(grants, request) {
  const kind = request?.permission
  if (!kind || !Array.isArray(grants) || !grants.length) return false
  const mine = grants.filter((grant) => grant?.permission === kind)
  if (!mine.length) return false
  const patterns = Array.isArray(request.patterns) && request.patterns.length ? request.patterns : ['*']
  return patterns.every((value) => mine.some((grant) => grant.patterns.some((pattern) => wildcardMatch(value, pattern))))
}
