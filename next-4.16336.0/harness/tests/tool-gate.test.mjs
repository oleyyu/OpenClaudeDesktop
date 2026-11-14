import test from 'node:test'
import assert from 'node:assert/strict'
import { installToolGate, isToolDenied, normalizeToolSelection, toolSelectionOf, toolsListResponse } from '../packages/codex-app-server/src/tool-gate.js'

test('a selection keeps unique trimmed names, drops the reserved transport, and is null when empty', () => {
  assert.deepEqual(normalizeToolSelection({ disabled: [' bash ', 'bash', 'run_code', 3, ''], disabledServers: ['github'] }), { disabled: ['bash'], disabledServers: ['github'] })
  assert.equal(normalizeToolSelection({ disabled: [], disabledServers: [] }), null)
  assert.equal(normalizeToolSelection(['bash']), null)
  assert.equal(normalizeToolSelection(null), null)
})

test('params: an absent tools key keeps the selection, null clears it', () => {
  assert.equal(toolSelectionOf({}), undefined)
  assert.equal(toolSelectionOf({ codeDesktop: { dynamicWorkflows: true } }), undefined)
  assert.equal(toolSelectionOf({ codeDesktop: { tools: null } }), null)
  assert.deepEqual(toolSelectionOf({ codeDesktop: { tools: { disabled: ['write'] } } }), { disabled: ['write'], disabledServers: [] })
})

test('a server turns off only its own mcp__<server>__ tools', () => {
  const selection = { disabled: ['write'], disabledServers: ['git'] }
  assert.equal(isToolDenied('write', selection), true)
  assert.equal(isToolDenied('mcp__git__status', selection), true)
  assert.equal(isToolDenied('mcp__github__status', selection), false)
  assert.equal(isToolDenied('read', selection), false)
  assert.equal(isToolDenied('write', null), false)
})

function fakeAgent(known) {
  const state = { restrictions: [], sections: [], guards: [], listeners: {} }
  const agentCtx = {
    tools: {
      restrict({ deny }) {
        const unknown = deny.filter((name) => !known.includes(name))
        if (unknown.length) throw new Error(`unknown ${unknown}`)
        const entry = { deny }
        state.restrictions.push(entry)
        state.listeners['tools/change']?.forEach((fn) => fn())
        return () => { state.restrictions.splice(state.restrictions.indexOf(entry), 1) }
      },
      guard(fn) { state.guards.push(fn); return () => state.guards.splice(state.guards.indexOf(fn), 1) },
    },
    systemPrompt: { section(section) { state.sections.push(section.name); return () => state.sections.splice(state.sections.indexOf(section.name), 1) } },
    on(name, fn) { (state.listeners[name] ??= []).push(fn); return () => state.listeners[name].splice(state.listeners[name].indexOf(fn), 1) },
  }
  return { agentCtx, state }
}

test('the gate restricts known names, filters late tools at assembly, guards execution and follows the ref', async () => {
  const known = ['read', 'write', 'bash']
  const { agentCtx, state } = fakeAgent(known)
  const ref = { current: { disabled: ['write'], disabledServers: ['git'] } }
  const gate = installToolGate(agentCtx, ref, { knownNames: () => known })
  assert.deepEqual(state.restrictions.map((entry) => entry.deny), [['write']], 'one restriction despite restrict() emitting tools/change')
  assert.deepEqual(state.sections, ['tool:write'])

  const [assemble] = state.listeners['system-prompt/assemble']
  const assembly = await assemble({}, {}, async () => ({ tools: [{ name: 'read' }, { name: 'write' }, { name: 'mcp__git__log' }, { name: 'mcp__web__get' }] }))
  assert.deepEqual(assembly.tools.map((tool) => tool.name), ['read', 'mcp__web__get'])
  assert.match(state.guards[0]({ name: 'mcp__git__log' }), /turned off/)
  assert.equal(state.guards[0]({ name: 'read' }), undefined)

  // A server's tool registers later: tools/change extends the restriction.
  known.push('mcp__git__log')
  state.listeners['tools/change'].forEach((fn) => fn())
  assert.deepEqual(state.restrictions.map((entry) => entry.deny.slice().sort()), [['mcp__git__log', 'write']])

  ref.current = null
  gate.apply()
  assert.deepEqual(state.restrictions, [])
  assert.deepEqual(state.sections, [])
  assert.equal(state.guards[0]({ name: 'write' }), undefined)

  gate.dispose()
  assert.deepEqual(state.guards, [])
  assert.equal(state.listeners['tools/change'].length, 0)
})

test('tools/list groups MCP tools under every profile server and lists the rest by name', () => {
  const response = toolsListResponse([
    { name: 'write', description: 'Write a file.\nMore text.' },
    { name: 'skill', description: 'Run a skill' },
    { name: 'run_code' },
    { name: 'mcp__git__status', description: 'Status' },
    { name: 'mcp__other__ping' },
  ], ['git', 'offline'])
  assert.deepEqual(response.tools, [
    { name: 'skill', kind: 'skill', description: 'Run a skill' },
    { name: 'write', kind: 'builtin', description: 'Write a file.' },
  ])
  assert.deepEqual(response.servers, [
    { name: 'git', tools: [{ name: 'mcp__git__status', tool: 'status', description: 'Status' }] },
    { name: 'offline', tools: [] },
    { name: 'other', tools: [{ name: 'mcp__other__ping', tool: 'ping', description: '' }] },
  ])
})
