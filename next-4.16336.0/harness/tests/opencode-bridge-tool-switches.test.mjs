// Settings › Profiles tool switches for file-changing tools, per agent. OpenCode's Permission.disabled checks
// edit, write and apply_patch against one `edit` permission (one switch); MiMo Code's matches a tool by its own
// name or the `edit` alias (work/agents/sources/mimo/packages/opencode/src/permission/index.ts disabled()), so
// each tool has its own switch. Both disabled() functions are emulated below and run against the bridge's rules.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { denyRules, isToolDenied, normalizeToolSelection, toolsListResponse } from '../packages/opencode-bridge/src/tools.js'

const match = (value, pattern) => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(value)
const opencodeDisabled = (tools, rules) => new Set(tools.filter((tool) => {
  const permission = ['edit', 'write', 'apply_patch'].includes(tool) ? 'edit' : tool
  const rule = rules.findLast((r) => match(permission, r.permission))
  return rule?.pattern === '*' && rule.action === 'deny'
}))
const mimoDisabled = (tools, rules) => new Set(tools.filter((tool) => {
  const rule = rules.findLast((r) => match(tool, r.permission) || (['edit', 'write', 'apply_patch', 'multiedit'].includes(tool) && match('edit', r.permission)))
  return rule?.pattern === '*' && rule.action === 'deny'
}))
// What precedes the selection in a session ruleset (Accept edits, a plan file).
const base = [{ permission: '*', pattern: '*', action: 'ask' }, { permission: 'edit', pattern: '*', action: 'allow' }, { permission: 'edit', pattern: '/plans/*', action: 'allow' }]
const MIMO_TOOLS = ['bash', 'edit', 'write', 'multiedit', 'notebook_edit', 'apply_patch', 'read']
const registry = MIMO_TOOLS.map((id) => ({ id, description: `${id} tool.\nMore.` }))

test('OpenCode lists one edit switch that names OpenCode', () => {
  for (const flavor of [FLAVORS.opencode, undefined]) {
    const list = toolsListResponse([{ id: 'edit' }, { id: 'write' }, { id: 'apply_patch' }, { id: 'bash' }], [], [], flavor)
    assert.deepEqual(list.tools.map((tool) => tool.name), ['bash', 'edit'])
    const edit = list.tools.find((tool) => tool.name === 'edit')
    assert.match(edit.description, /OpenCode turns edit, write and apply_patch on and off together/)
    assert.equal(edit.requires, undefined)
  }
  const selection = normalizeToolSelection({ disabled: ['edit'] })
  const off = opencodeDisabled(['edit', 'write', 'apply_patch', 'bash'], [...base, ...denyRules(selection, FLAVORS.opencode)])
  assert.deepEqual([...off].sort(), ['apply_patch', 'edit', 'write'])
  assert.ok(isToolDenied('write', selection, [], FLAVORS.opencode))
})

test('MiMo lists each file-changing tool with its own switch and never mentions OpenCode', () => {
  const list = toolsListResponse(registry, [], [], FLAVORS.mimo)
  assert.deepEqual(list.tools.map((tool) => tool.name), ['apply_patch', 'bash', 'edit', 'multiedit', 'notebook_edit', 'read', 'write'])
  for (const tool of list.tools) assert.doesNotMatch(tool.description, /OpenCode|share one switch/)
  const byName = Object.fromEntries(list.tools.map((tool) => [tool.name, tool]))
  assert.match(byName.edit.description, /MiMo Code checks them all as edits/)
  assert.equal(byName.write.description, 'write tool.')
  for (const name of ['write', 'multiedit', 'notebook_edit', 'apply_patch']) assert.deepEqual(byName[name].requires, ['edit'])
  assert.equal(byName.bash.requires, undefined)
  assert.equal(byName.edit.requires, undefined)
})

test('MiMo: turning one edit tool off hides only that tool', () => {
  for (const name of ['write', 'multiedit', 'apply_patch', 'notebook_edit']) {
    const selection = normalizeToolSelection({ disabled: [name] })
    const rules = denyRules(selection, FLAVORS.mimo)
    assert.deepEqual(rules, [{ permission: name, pattern: '*', action: 'deny' }])
    assert.deepEqual([...mimoDisabled(MIMO_TOOLS, [...base, ...rules])], [name])
    for (const other of MIMO_TOOLS) assert.equal(isToolDenied(other, selection, [], FLAVORS.mimo), other === name, `${name} off → ${other}`)
  }
})

test('MiMo: turning edit off hides every file-changing tool, notebook_edit included', () => {
  const selection = normalizeToolSelection({ disabled: ['edit'] })
  const rules = denyRules(selection, FLAVORS.mimo)
  assert.deepEqual(rules, [{ permission: 'edit', pattern: '*', action: 'deny' }, { permission: 'notebook_edit', pattern: '*', action: 'deny' }])
  const off = mimoDisabled(MIMO_TOOLS, [...base, ...rules])
  assert.deepEqual([...off].sort(), ['apply_patch', 'edit', 'multiedit', 'notebook_edit', 'write'])
  for (const name of off) assert.ok(isToolDenied(name, selection, [], FLAVORS.mimo))
  assert.ok(!isToolDenied('bash', selection, [], FLAVORS.mimo))
  // Listing both keeps one rule each.
  assert.equal(denyRules(normalizeToolSelection({ disabled: ['edit', 'notebook_edit'] }), FLAVORS.mimo).length, 2)
})
