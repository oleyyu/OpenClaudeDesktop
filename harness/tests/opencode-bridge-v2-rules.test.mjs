// OpenCode 2.x bridge, phase 5: session rulesets (src/v2/rules.js) — v2's shape {action, resource, effect} and names,
// the plan folder and the folders v2 no longer allows by itself, Code Mode off, the user's own denies after the
// bridge's, the tool selection under v2's names, and a sub-agent's own agent limits on top of the inherited ruleset.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { READ_TOOLS_V2, childRulesV2, planDirV2, sessionRulesV2 } from '../packages/opencode-bridge/src/v2/rules.js'
import { wildcardMatch } from '../packages/opencode-bridge/src/policy.js'

const base = { home: '/Users/me', dataDir: '/Users/me/.local/share/opencode', flavor: FLAVORS.opencode }
// core/src/tool.ts whollyDisabled: the last rule naming the action is `* deny`.
const disabled = (rules, action) => { const last = rules.findLast((rule) => wildcardMatch(action, rule.action)); return last?.resource === '*' && last.effect === 'deny' }
// core/src/permission.ts evaluate: the last rule matching action and resource (ask when none).
const evaluate = (rules, action, resource) => rules.findLast((rule) => wildcardMatch(action, rule.action) && wildcardMatch(resource, rule.resource))?.effect ?? 'ask'

test('a root session\'s ruleset: ask by default, read tools, .env, app tools, plan folder, v2\'s own folders, Code Mode off', () => {
  const rules = sessionRulesV2({ ...base, appToolsPrefix: 'code_desktop_', externalDirs: ['/Users/me/.agents/skills/pdf'] })
  assert.deepEqual(rules.slice(0, 1 + READ_TOOLS_V2.length), [{ action: '*', resource: '*', effect: 'ask' }, ...READ_TOOLS_V2.map((action) => ({ action, resource: '*', effect: 'allow' }))])
  for (const rule of rules) assert.deepEqual(Object.keys(rule).sort(), ['action', 'effect', 'resource'], 'v2 shape only')
  assert.equal(planDirV2('/Users/me'), '/Users/me/.opencode/plan')
  assert.equal(evaluate(rules, 'edit', '/Users/me/.opencode/plan/x.md'), 'allow')
  assert.equal(evaluate(rules, 'external_directory', '/Users/me/.opencode/plan/*'), 'allow')
  assert.equal(evaluate(rules, 'external_directory', '/Users/me/.local/share/opencode/tool-output/*'), 'allow')
  assert.equal(evaluate(rules, 'external_directory', '/Users/me/.local/share/opencode/shell/*'), 'allow')
  assert.equal(evaluate(rules, 'external_directory', '/Users/me/.agents/skills/pdf/*'), 'allow')
  assert.equal(evaluate(rules, 'external_directory', '/etc/*'), 'ask')
  assert.equal(evaluate(rules, 'read', '/w/.env'), 'ask')
  assert.equal(evaluate(rules, 'read', '/w/.env.example'), 'allow')
  assert.equal(evaluate(rules, 'code_desktop_run_in_terminal', '*'), 'allow')
  assert.equal(evaluate(rules, 'shell', 'npm test'), 'ask')
  assert.equal(disabled(rules, 'execute'), true, 'Code Mode is off: MCP tools are direct tools')
  for (const tool of ['read', 'shell', 'edit', 'subagent', 'question', 'code_desktop_run_in_terminal']) assert.equal(disabled(rules, tool), false, tool)
  assert.ok(!rules.some((rule) => /plan_(enter|exit)|^bash$|^task$|doom_loop/.test(rule.action)), 'no 1.x names')
})

test('turned-off tools and skills, nobody to ask, a workflow agent: denies under v2\'s names that take the tools out', () => {
  const rules = sessionRulesV2({ ...base, tools: { disabled: ['bash', 'write', 'task', 'webfetch'], disabledServers: ['github'] }, skills: ['pdf', 'pdf-tools'], noUser: true, workflowAgent: true })
  for (const tool of ['shell', 'edit', 'subagent', 'webfetch', 'github_create_issue', 'question']) assert.equal(disabled(rules, tool), true, tool)
  assert.equal(disabled(rules, 'read'), false)
  assert.equal(evaluate(rules, 'skill', 'pdf'), 'deny')
  assert.equal(evaluate(rules, 'skill', 'pdf-tools'), 'deny')
  assert.equal(evaluate(rules, 'skill', 'docx'), 'allow')
  assert.equal(rules.filter((rule) => rule.action === 'edit' && rule.effect === 'deny').length, 1, 'write and edit share one rule')
})

test('the user\'s own config rules: denies after the bridge\'s (and exceptions carved out of them keep the bridge\'s effect)', () => {
  const userRules = [{ action: 'shell', resource: 'rm *', effect: 'deny' }, { action: 'webfetch', resource: '*', effect: 'deny' }, { action: 'webfetch', resource: 'https://docs.*', effect: 'allow' }, { action: 'read', resource: '*', effect: 'allow' }]
  const rules = sessionRulesV2({ ...base, userRules })
  assert.equal(evaluate(rules, 'shell', 'rm -rf x'), 'deny')
  assert.equal(evaluate(rules, 'shell', 'ls'), 'ask')
  assert.equal(evaluate(rules, 'webfetch', 'https://evil.example'), 'deny')
  assert.equal(evaluate(rules, 'webfetch', 'https://docs.example'), 'allow', 'carved out: the bridge\'s effect for it (webfetch is a read tool)')
  assert.equal(evaluate(rules, 'read', '/w/.env'), 'ask', 'a plain allow never widens the bridge\'s rules')
  assert.equal(disabled(rules, 'webfetch'), false, 'the carve-out after the deny keeps the tool')
})

test('a sub-agent\'s ruleset: the root\'s, then its agent\'s limits (denies kept, allows only for read tools), question denied', () => {
  const root = sessionRulesV2(base)
  const defaults = [{ action: '*', resource: '*', effect: 'allow' }, { action: 'read', resource: '*.env', effect: 'ask' }, { action: 'read', resource: '*.env.*', effect: 'ask' }, { action: 'read', resource: '*.env.example', effect: 'allow' }]
  const general = childRulesV2(root, [...defaults, { action: 'question', resource: '*', effect: 'deny' }, { action: 'subagent', resource: '*', effect: 'deny' }])
  assert.deepEqual(general.slice(0, root.length), root)
  assert.equal(disabled(general, 'question'), true)
  assert.equal(disabled(general, 'subagent'), true, 'general starts no sub-agents of its own, as its agent says')
  assert.equal(general.length, root.length + 3, 'the agent\'s base rules are left out')
  const explore = childRulesV2(root, [...defaults, { action: '*', resource: '*', effect: 'deny' }, { action: 'shell', resource: '*', effect: 'allow' }, { action: 'read', resource: '*', effect: 'allow' },
    { action: 'read', resource: '*.env', effect: 'ask' }, { action: 'read', resource: '*.env.*', effect: 'ask' }, { action: 'read', resource: '*.env.example', effect: 'allow' }, { action: 'external_directory', resource: '*', effect: 'allow' }])
  assert.equal(disabled(explore, 'edit'), true, 'explore stays read-only')
  assert.equal(evaluate(explore, 'shell', 'ls'), 'ask', 'an allow for a tool that is not a read tool asks')
  assert.equal(evaluate(explore, 'read', '/w/a.ts'), 'allow')
  assert.equal(evaluate(explore, 'read', '/w/.env'), 'ask', 'the agent\'s own later .env rules are kept')
  assert.equal(evaluate(explore, 'external_directory', '/etc/*'), 'ask')
  assert.equal(disabled(explore, 'question'), true)
})
