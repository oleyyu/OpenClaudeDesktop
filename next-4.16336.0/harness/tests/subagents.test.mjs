import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceFilter, threadLineage } from '../packages/codex-app-server/src/subagents.js'

test('a sub-agent child is a Codex spawned thread; a user fork is an interactive fork', () => {
  assert.deepEqual(threadLineage({ id: 'c', origin: 'subagent', parentSession: 'p', delegationDepth: 2 }, 'Audit deps'), {
    parentThreadId: 'p', forkedFromId: null, agentNickname: 'Audit deps',
    source: { subAgent: { thread_spawn: { parent_thread_id: 'p', depth: 2, agent_path: null, agent_nickname: 'Audit deps', agent_role: null } } },
  })
  assert.equal(threadLineage({ origin: 'subagent', parentSession: 'p' }).source.subAgent.thread_spawn.depth, 1)
  assert.equal(threadLineage({ origin: 'subagent', parentSession: 'p' }, '').agentNickname, null)
  assert.deepEqual(threadLineage({ origin: 'subagent' }).source, { subAgent: { other: 'dsh' } })
  assert.deepEqual(threadLineage({ parentSession: 'p' }, 'ignored'), { parentThreadId: null, forkedFromId: 'p', source: 'appServer', agentNickname: null })
  assert.deepEqual(threadLineage({ id: 'r' }), { parentThreadId: null, forkedFromId: null, source: 'appServer', agentNickname: null })
})

test('thread/list source kinds: subAgent* lists only sub-agents, forks stay interactive', () => {
  const child = { origin: 'subagent', parentSession: 'p' }
  const fork = { parentSession: 'p' }
  const root = {}
  const rows = (kinds) => [child, fork, root].filter(sourceFilter(kinds))
  assert.deepEqual(rows(['subAgentThreadSpawn']), [child])
  assert.deepEqual(rows(['subAgent']), [child])
  assert.deepEqual(rows(undefined), [fork, root])
  assert.deepEqual(rows([]), [fork, root])
  assert.deepEqual(rows(['appServer', 'cli']), [fork, root])
  assert.deepEqual(rows(['appServer', 'subAgentThreadSpawn']), [child, fork, root])
})
