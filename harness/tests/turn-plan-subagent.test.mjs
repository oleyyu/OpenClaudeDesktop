// turn-plan: the DeepSeek core refuses a sub-agent's ccd_turn call (update_plan / wrap_up) with 2.42304.0's own text
// (index.chunk-B5tintml.js `ot`, the PreToolUse deny index.chunk-CFJssAFf gives an agent_id call), as it refuses a
// sub-agent's Workflow. Read from the sources: no core, no process, no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const here = import.meta.dirname
const source = fs.readFileSync(path.join(here, '../packages/codex-app-server/src/index.js'), 'utf8')
const { SUBAGENT_TURN_TOOL_REFUSAL } = await import('../../app/electron/generated/turn-plan/ccd-turn.mjs')

test('the refusal is the original text, for both ccd_turn tools under the app server name', () => {
  const text = /export const SUBAGENT_TURN_TOOL_REFUSAL = ("[^"]+")/.exec(source)?.[1]
  assert.equal(JSON.parse(text), SUBAGENT_TURN_TOOL_REFUSAL)
  assert.ok(source.includes("export const SUBAGENT_TURN_TOOLS = new Set(['mcp__code_desktop__update_plan', 'mcp__code_desktop__wrap_up'])"))
})

test('tools/pre-execute denies them for a call whose agent is not a session thread (a sub-agent), before asking', () => {
  const hook = source.slice(source.indexOf("ctx.on('tools/pre-execute'"), source.indexOf("ctx.on('approval/request'"))
  const deny = "if (!thread && SUBAGENT_TURN_TOOLS.has(exec.name)) return Promise.resolve({ kind: 'deny', reason: SUBAGENT_TURN_TOOL_REFUSAL })"
  assert.equal(hook.split(deny).length - 1, 1)
  assert.ok(hook.indexOf(deny) < hook.indexOf('if (!thread) {'), 'before the sub-agent approval path')
})
