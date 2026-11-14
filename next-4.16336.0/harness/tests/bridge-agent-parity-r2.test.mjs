import test from 'node:test'
import assert from 'node:assert/strict'
import qwen, { goalOf } from '../packages/acp-bridge/src/agents/qwen.js'

// The raw ACP frame from a real Qwen /goal (probe in a temp HOME): an empty chunk carrying _meta.goalState.
const frame = { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: '' }, _meta: { goalState: { v: 2, goal: { goalId: 'g1', revision: 3, objective: 'say hello', status: 'usage_limited', turnCount: 2, activeTimeMs: 61000, tokensUsed: 1200, tokenBudget: 30000000, createdAt: 1791157025928, updatedAt: 1791157086928 }, activity: 'idle' } } }

test('Qwen goals: goalState frames become Codex ThreadGoal updates; Pause/Resume/Clear go to its control methods', async () => {
  const filtered = qwen.filterUpdate(frame, { id: 's1' })
  assert.equal(filtered.drop, true)
  assert.deepEqual(filtered.goal, { objective: 'say hello', status: 'usageLimited', tokenBudget: 30000000, tokensUsed: 1200, timeUsedSeconds: 61, createdAt: 1791157025, updatedAt: 1791157086, codeDesktop: { goalId: 'g1', revision: 3, rounds: 2 } })
  assert.equal(qwen.filterUpdate({ ...frame, _meta: { goalState: { v: 2, goal: null } } }, { id: 's1' }).goal, null)
  assert.equal(goalOf({ status: 'active' }), null, 'no objective, no goal')
  const calls = []
  const host = { call: async (method, params) => { calls.push([method, params]); return {} } }
  const thread = { id: 's1', goal: filtered.goal }
  await qwen.goalSet(thread, host, { status: 'paused' })
  await qwen.goalSet(thread, host, { status: 'active' })
  await qwen.goalSet(thread, host, { objective: ' make tests pass ' })
  await qwen.goalClear(thread, host)
  assert.deepEqual(calls, [
    ['qwen/control/session/goal/control', { sessionId: 's1', request: { action: 'pause', expectedGoalId: 'g1', expectedRevision: 3 } }],
    ['qwen/control/session/goal/control', { sessionId: 's1', request: { action: 'resume', expectedGoalId: 'g1', expectedRevision: 3 } }],
    ['qwen/control/session/goal/control', { sessionId: 's1', request: { action: 'replace', objective: 'make tests pass', expectedGoalId: 'g1', expectedRevision: 3 } }],
    ['qwen/control/session/goal/clear', { sessionId: 's1' }],
  ])
  await qwen.goalSet({ id: 's2', goal: null }, host, { objective: 'new' })
  assert.deepEqual(calls.at(-1)[1].request, { action: 'create', objective: 'new' })
  await assert.rejects(qwen.goalSet({ id: 's3', goal: null }, host, { status: 'paused' }), /no goal/)
})

test('Kimi goals: goal.* records in the main wire log fold into a ThreadGoal; a clear removes it', async () => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
  const { readKimiGoal } = await import('../packages/acp-bridge/src/agents/kimi.js')
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-goal-')), 'wire.jsonl')
  const lines = [{ type: 'metadata', protocol_version: '1.5' }, { type: 'goal.create', goalId: 'g1', objective: 'make the build pass', time: 1791157025000 },
    { type: 'goal.update', status: 'paused', turnsUsed: 3, tokensUsed: 900, wallClockMs: 65000, time: 1791157090000 }]
  fs.writeFileSync(file, lines.map((line) => JSON.stringify(line)).join('\n') + '\n')
  assert.deepEqual(readKimiGoal(file), { objective: 'make the build pass', status: 'paused', tokenBudget: null, tokensUsed: 900, timeUsedSeconds: 65, createdAt: 1791157025, updatedAt: 1791157090, codeDesktop: { goalId: 'g1', rounds: 3 } })
  fs.appendFileSync(file, JSON.stringify({ type: 'goal.clear', time: 1791157100000 }) + '\n')
  assert.equal(readKimiGoal(file), null)
})

test('MiMo workflow runs: phases, agent counters and status as the app run shape; status ops stay tool rows, async runs are background cards', async () => {
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const part = (state) => ({ id: 'p1', callID: 'c1', tool: 'workflow', state })
  const running = toolItem(part({ status: 'running', input: { operation: 'run', name: 'deep-research' }, time: { start: 1000 },
    metadata: { runID: 'run_1', status: 'running', transcript: [{ kind: 'phase', text: 'Plan' }, { kind: 'log', text: 'searching' }], counters: { running: 1, succeeded: 2, failed: 1 } } }), { threadId: 't', cwd: '/w' })
  assert.equal(running.workflowRun.id, 'run_1')
  assert.equal(running.workflowRun.status, 'running')
  assert.equal(running.workflowRun.summary, 'searching')
  assert.deepEqual(running.workflowRun.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((agent) => agent.state), ['done', 'done', 'error', 'progress'])
  const done = toolItem(part({ status: 'completed', input: { operation: 'run', name: 'deep-research' }, time: { start: 1000, end: 6000 }, metadata: { runID: 'run_1', status: 'completed', transcript: [] } }), { threadId: 't' })
  assert.deepEqual([done.workflowRun.status, done.workflowRun.durationMs], ['completed', 5000])
  assert.equal(toolItem(part({ status: 'completed', input: { operation: 'status', run_id: 'run_1' }, metadata: {} }), { threadId: 't' }).workflowRun, undefined)
  // A background run (async: true) outlives its call: a card that follows MiMo's run list (opencode-bridge-mimo-workflow-runs).
  const background = toolItem(part({ status: 'completed', input: { operation: 'run', name: 'x', async: true }, metadata: { runID: 'r', status: 'running' } }), { threadId: 't' }).workflowRun
  assert.deepEqual([background.status, background.background, background.stopScope], ['running', true, 'run'])
})

test('agent core settings: dotted keys read, validated and written into settings.json; null resets to the default', async () => {
  const { coreSettingsView, coreSettingValue, withSetting, settingAt } = await import('../packages/acp-bridge/src/catalog.js')
  const gemini = (await import('../packages/acp-bridge/src/agents/gemini.js')).default
  const defs = gemini.coreSettings.defs
  const settings = { privacy: { usageStatisticsEnabled: false }, model: { compressionThreshold: 'bad' } }
  const view = coreSettingsView(defs, settings)
  assert.equal(view.find((entry) => entry.key === 'privacy.usageStatisticsEnabled').value, false)
  // Gemini writes checkpoints only in its TUI (useGeminiStream), never in ACP mode: the setting would promise nothing.
  assert.equal(view.find((entry) => entry.key === 'general.checkpointing.enabled'), undefined)
  assert.equal(view.find((entry) => entry.key === 'model.compressionThreshold').value, null, 'an invalid stored value reads as the default')
  const threshold = defs.find((entry) => entry.key === 'model.compressionThreshold')
  assert.equal(coreSettingValue(threshold, 0.3), 0.3)
  assert.throws(() => coreSettingValue(threshold, 3), /Invalid/)
  assert.throws(() => coreSettingValue(defs.find((entry) => entry.key === 'model.maxSessionTurns'), 1.5), /Invalid/)
  const written = withSetting(settings, 'general.sessionRetention.maxAge', '7d')
  assert.equal(settingAt(written, 'general.sessionRetention.maxAge'), '7d')
  assert.equal(settingAt(written, 'privacy.usageStatisticsEnabled'), false, 'other keys stay')
  assert.equal(settingAt(withSetting(written, 'privacy.usageStatisticsEnabled', null), 'privacy.usageStatisticsEnabled'), undefined)
})
