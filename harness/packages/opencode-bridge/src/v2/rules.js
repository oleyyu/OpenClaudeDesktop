/**
 * OpenCode 2.x session rulesets (PATCH /api/session/:id {permissions}, POST /api/session {permissions}): what
 * policy.js sessionRules is on 1.x, in v2's shape and names. A rule is {action, resource, effect}; v2 evaluates
 * merge(agent.permissions, session.permissions) plus saved allows, last match wins, then the plugin's
 * permission.evaluate (v2/plugin.js) answers from the thread's mode. So, as on 1.x, the ruleset is the same in every
 * mode and every non-read call asks:
 *
 *   * * ask; the read tools allow (read, glob, grep, todowrite, question, skill, webfetch, websearch, subagent);
 *   .env behind a card; OpenClaude Desktop's own tools allow; v2's plan folder (~/.opencode/plan: edit allow, and
 *   external_directory allow, which the plan agent itself doesn't grant); the folders v2 no longer allows by itself
 *   (tool-output, shell output, skills, references: external_directory allow); `execute * deny` (Code Mode off: MCP
 *   and app tools are direct tools, so an approval's source.id names the real call); turned-off skills by name and
 *   id; the user's own config denies (and the exceptions carved out of them) after the bridge's; the tool selection's
 *   denies under v2's names; `question * deny` when nobody answers; `subagent * deny` for a workflow agent.
 *
 * A rule whose action ends on `resource '*' effect deny` takes the tool out of the request (core/src/tool.ts
 * whollyDisabled): the selection, `question`, `subagent` and `execute` denies do. Under claude-agent a changed tool
 * list restarts its Claude process, so these are decided when the session is created and change only with the thread.
 *
 * Sub-agent sessions inherit their parent's permissions (the bridge's ruleset), which would lift their agent's own
 * limits (general's question / subagent deny, explore's read-only list): childRulesV2 appends the agent's rules after
 * the root's, its denies as they are, its allows only for the read tools (the rest ask), and `question * deny`.
 */
import path from 'node:path'
import { userOverrides } from '../policy.js'
import { denyRules } from '../tools.js'

export const READ_TOOLS_V2 = Object.freeze(['read', 'glob', 'grep', 'todowrite', 'question', 'skill', 'webfetch', 'websearch', 'subagent'])
// The tool selection names 1.x tools too: their v2 permission (edit, write, patch and apply_patch share `edit`).
const RENAMED = { bash: 'shell', task: 'subagent', apply_patch: 'edit', multiedit: 'edit', write: 'edit', patch: 'edit' }
// Agent.Info.default's base rules (schema/src/agent.ts): every agent's, so not what makes one agent different.
const AGENT_BASE = ['*\u0000*\u0000allow', 'read\u0000*.env\u0000ask', 'read\u0000*.env.*\u0000ask', 'read\u0000*.env.example\u0000allow']

const rule = (action, effect, resource = '*') => ({ action, resource, effect })
const isRule = (entry) => !!entry && typeof entry.action === 'string' && typeof entry.resource === 'string' && ['allow', 'ask', 'deny'].includes(entry.effect)
// policy.js userOverrides reads 1.x's {permission, pattern, action}.
const toV1 = (entry) => ({ permission: entry.action, pattern: entry.resource, action: entry.effect })
const fromV1 = (entry) => rule(entry.permission, entry.action, entry.pattern)

/** v2's plan folder (core/src/plugin/plan.ts: <home>/.opencode/plan). */
export const planDirV2 = (home) => path.join(home, '.opencode', 'plan')

/**
 * The ruleset of a root thread's session.
 * @param {{ home: string, dataDir: string, externalDirs?: string[], appToolsPrefix?: string, tools?: object | null,
 *   flavor?: object, skills?: string[], userRules?: object[], noUser?: boolean, workflowAgent?: boolean }} options
 *   dataDir: v2's data folder (<XDG_DATA_HOME>/opencode); externalDirs: skill and reference folders; tools: the
 *   thread's tool selection (tools.js); skills: turned-off skills' names and ids; userRules: the permissions of the
 *   user's own config documents, in order (v2 shape)
 */
export function sessionRulesV2({ home, dataDir, externalDirs = [], appToolsPrefix = '', tools = null, flavor, skills = [], userRules = [], noUser = false, workflowAgent = false }) {
  const rules = [rule('*', 'ask')]
  for (const tool of READ_TOOLS_V2) rules.push(rule(tool, 'allow'))
  rules.push(rule('read', 'ask', '*.env'), rule('read', 'ask', '*.env.*'), rule('read', 'allow', '*.env.example'))
  if (appToolsPrefix) rules.push(rule(`${appToolsPrefix}*`, 'allow'))
  const plan = planDirV2(home)
  rules.push(rule('edit', 'allow', path.join(plan, '*')), rule('external_directory', 'allow', path.join(plan, '*')))
  const dirs = [path.join(dataDir, 'tool-output'), path.join(dataDir, 'shell'), ...externalDirs]
  for (const dir of [...new Set(dirs)]) if (typeof dir === 'string' && path.isAbsolute(dir)) rules.push(rule('external_directory', 'allow', path.join(dir, '*')))
  rules.push(rule('execute', 'deny'))
  for (const skill of [...new Set(skills)]) if (typeof skill === 'string' && skill) rules.push(rule('skill', 'deny', skill))
  const user = (Array.isArray(userRules) ? userRules : []).filter(isRule)
  rules.push(...userOverrides(user.map(toV1), rules.map(toV1)).map(fromV1))
  const deny = denyRules(tools, flavor).map((entry) => rule(RENAMED[entry.permission] ?? entry.permission, 'deny', entry.pattern))
  if (noUser) deny.push(rule('question', 'deny'))
  if (workflowAgent) deny.push(rule('subagent', 'deny'))
  const seen = new Set()
  for (const entry of deny) {
    const key = `${entry.action}\u0000${entry.resource}`
    if (!seen.has(key)) { seen.add(key); rules.push(entry) }
  }
  return rules
}

/**
 * A sub-agent session's ruleset: the root's, then its agent's own rules (Agent.Info.permissions, the base rules every
 * agent starts with left out): a deny as it is, an allow only for a read tool (anything else asks), then `question * deny`.
 */
export function childRulesV2(rootRules, agentRules = []) {
  const own = (Array.isArray(agentRules) ? agentRules : []).filter(isRule)
  // Only the leading copy: an agent may repeat them later on purpose (explore: `* * deny`, then .env behind a card again).
  let base = 0
  while (base < AGENT_BASE.length && base < own.length && `${own[base].action}\u0000${own[base].resource}\u0000${own[base].effect}` === AGENT_BASE[base]) base++
  own.splice(0, base)
  const extra = own.map((entry) => (entry.effect === 'allow' && !READ_TOOLS_V2.includes(entry.action) ? { ...entry, effect: 'ask' } : { ...entry }))
  return [...rootRules, ...extra, rule('question', 'deny')]
}
