// codeDesktop/contextUsage/read (packages/codex-app-server/src/context-usage.js): the session rail Context card's
// per-category counts, measured with the Harness meter on a fake session (no runtime, no model, no network).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { contextUsageCounts, instructionFiles, mcpToolParts, toolTokens } from '../packages/codex-app-server/src/context-usage.js'

const events = new Map([
  [1, { type: 'system/message', data: { content: [{ type: 'text', text: 'old system' }] } }],
  [2, { type: 'user/message', data: { content: [{ type: 'text', text: '<system-reminder>\nInstructions from: ~/.dsh/AGENTS.md\n\nglobal rules\n\nInstructions from: AGENTS.md\n\nproject rules, a bit longer than the global ones\n</system-reminder>' }], source: { kind: 'agent-instructions', form: 'instructions', changes: [] } } }],
  [3, { type: 'user/message', data: { content: [{ type: 'text', text: '<available_skills>…</available_skills>' }], source: { kind: 'skill-catalog' } } }],
  [4, { type: 'user/message', data: { content: [{ type: 'text', text: 'hello' }] } }],
  [5, { type: 'system/message', data: { content: [{ type: 'text', text: 'current system' }] } }],
])
const tools = [
  { name: 'read', description: 'Read a file', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'mcp__code_desktop__update_plan', description: 'Plan', parameters: { type: 'object' } },
  { name: 'mcp__github__search', description: 'Search', parameters: { type: 'object' } },
]
const session = { eventAt: (seq) => events.get(seq), requestHeader: () => ({ tools }) }
const meter = { measure: () => ({ nodes: [{ seq: 1, heuristicTokens: 30 }, { seq: 2, heuristicTokens: 400 }, { seq: 3, heuristicTokens: 120 }, { seq: 4, heuristicTokens: 9 }, { seq: 5, heuristicTokens: 2500 }, { seq: 6, heuristicTokens: 0 }] }) }

test('counts: system prompt (last system node), memory files, skills, system / MCP tools from the request header', () => {
  const counts = contextUsageCounts({ session, meter })
  assert.equal(counts.measure, 'dsh-token-meter')
  assert.deepEqual(counts.categories.systemPrompt, { tokens: 2500 })
  assert.deepEqual(counts.categories.memoryFiles, { tokens: 400 })
  assert.deepEqual(counts.categories.skills, { tokens: 120 })
  assert.equal(counts.categories.systemTools.tokens, toolTokens(tools[0]))
  assert.equal(counts.categories.mcpTools.tokens, toolTokens(tools[1]) + toolTokens(tools[2]))
  assert.deepEqual(counts.mcpTools.map((t) => [t.serverName, t.name, t.isLoaded]), [['code_desktop', 'update_plan', true], ['github', 'search', true]])
  assert.deepEqual(counts.memoryFiles.map((f) => [f.path, f.type]), [['~/.dsh/AGENTS.md', 'User'], ['AGENTS.md', 'Project']])
  assert.equal(counts.memoryFiles.reduce((sum, f) => sum + f.tokens, 0), 400)
  assert.ok(counts.memoryFiles[1].tokens > counts.memoryFiles[0].tokens)
  assert.deepEqual(counts.agents, [])
})

test('missing data: no meter, no header, nothing sent — categories absent, no throw', () => {
  assert.deepEqual(contextUsageCounts({ session: { eventAt: () => undefined } }).categories, {})
  assert.deepEqual(contextUsageCounts({ session: { eventAt: () => { throw new Error('gone') }, requestHeader: () => { throw new Error('gone') } }, meter: { measure: () => { throw new Error('x') } } }).categories, {})
  assert.deepEqual(instructionFiles('no headings', 10), [])
  assert.equal(mcpToolParts('read'), null)
  assert.equal(mcpToolParts('mcp__bad'), null)
})

test('the bridge serves it and declares the capability', () => {
  const index = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/codex-app-server/src/index.js'), 'utf8')
  assert.equal(index.split("case 'codeDesktop/contextUsage/read':").length - 1, 1)
  assert.ok(index.includes('systemPromptPreview: true, contextUsage: true,'))
})

test('ZCode: the proxy\'s last request — system prompt as sent, tool definitions split into system / MCP tools', async () => {
  const { contextUsageCounts: zcode } = await import('../packages/zcode-bridge/src/context-usage.js')
  const record = { defaultSystem: 'x'.repeat(40), system: 'y'.repeat(400), toolDefs: [{ name: 'Read', description: 'r', inputSchema: { type: 'object' } }, { name: 'mcp__code_desktop__notify', description: 'n', inputSchema: null }] }
  const counts = zcode(record)
  assert.deepEqual(counts.categories.systemPrompt, { tokens: 100 })
  assert.equal(counts.categories.systemTools.tokens, Math.ceil(JSON.stringify(record.toolDefs[0]).length / 4))
  assert.deepEqual(counts.mcpTools.map((t) => t.serverName + '/' + t.name), ['code_desktop/notify'])
  assert.deepEqual(zcode(null).categories, {})
  const server = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/zcode-bridge/src/server.js'), 'utf8')
  assert.equal(server.split("case 'codeDesktop/contextUsage/read':").length - 1, 1)
  assert.ok(server.includes('contextUsage: !!proxy,'))
})

test('MCP server instructions (CLI 2.1.299): DSH mcp:<server> sections leave System prompt; ZCode\'s appended code_desktop text too', async () => {
  const text = '### MCP server: code_desktop\n\n' + 'i'.repeat(392)
  const counts = contextUsageCounts({ session, meter, sections: [{ name: 'harness:identity', text: 'x'.repeat(4000) }, { name: 'mcp:code_desktop', text }, { name: 'mcp:empty', text: '' }] })
  assert.deepEqual(counts.categories.mcpServerInstructions, { tokens: Math.ceil(text.length / 4) })
  assert.deepEqual(counts.categories.systemPrompt, { tokens: 2500 - Math.ceil(text.length / 4) })
  // never more than the measured system node
  const capped = contextUsageCounts({ session, meter, sections: [{ name: 'mcp:big', text: 'y'.repeat(40000) }] })
  assert.deepEqual(capped.categories.mcpServerInstructions, { tokens: 2500 })
  assert.equal(capped.categories.systemPrompt, undefined)
  const index = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/codex-app-server/src/index.js'), 'utf8')
  assert.ok(index.includes("sections = (await systemPrompt.assemble(assembleContextFor(thread.agent)))?.sections ?? []"))

  const { contextUsageCounts: zcode } = await import('../packages/zcode-bridge/src/context-usage.js')
  const appText = 'Tools provided by OpenClaude Desktop.'
  const record = { system: 'base prompt\n\n' + appText, toolDefs: [] }
  const z = zcode(record, [{ name: 'code_desktop', text: appText }])
  assert.deepEqual(z.categories.mcpServerInstructions, { tokens: Math.ceil(`## code_desktop\n${appText}`.length / 4) })
  assert.deepEqual(z.categories.systemPrompt, { tokens: Math.ceil('base prompt\n\n'.length / 4) })
  assert.equal(zcode({ system: 'no app text', toolDefs: [] }, [{ name: 'code_desktop', text: appText }]).categories.mcpServerInstructions, undefined)
  const server = fs.readFileSync(path.resolve(import.meta.dirname, '../packages/zcode-bridge/src/server.js'), 'utf8')
  assert.ok(server.includes("instructions ? [{ name: appTools.name, text: instructions }] : []"))
})
