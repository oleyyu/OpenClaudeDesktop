/**
 * Harness session lineage → Codex thread identity, and the thread/list
 * source filter.
 *
 *   sub-agent child   header.origin 'subagent': parentThreadId = parentSession,
 *                     source {subAgent: {thread_spawn: …}}, agentNickname =
 *                     the delegation label (the call's `description`)
 *   fork              a parentSession without that origin is a fork the user
 *                     made: forkedFromId, an ordinary interactive thread
 */

/**
 * The lineage fields of a Codex Thread for one Harness session header.
 * @param {{origin?: string, parentSession?: string, delegationDepth?: number} | undefined} header
 * @param {string | null | undefined} label - the child's delegation label
 */
export function threadLineage(header, label = null) {
  const parent = typeof header?.parentSession === 'string' && header.parentSession ? header.parentSession : null
  if (header?.origin !== 'subagent') {
    return { parentThreadId: null, forkedFromId: parent, source: 'appServer', agentNickname: null }
  }
  const nickname = typeof label === 'string' && label ? label : null
  const source = parent
    ? { subAgent: { thread_spawn: { parent_thread_id: parent, depth: Number.isInteger(header.delegationDepth) ? header.delegationDepth : 1, agent_path: null, agent_nickname: nickname, agent_role: null } } }
    : { subAgent: { other: 'dsh' } }
  return { parentThreadId: parent, forkedFromId: null, source, agentNickname: nickname }
}

/**
 * thread/list `sourceKinds` → which headers to list. Any `subAgent*` kind asks
 * for sub-agent children (all of them are thread spawns here); any other kind,
 * or none, asks for interactive threads.
 * @returns {(header: {origin?: string}) => boolean}
 */
export function sourceFilter(sourceKinds) {
  const kinds = Array.isArray(sourceKinds) && sourceKinds.length > 0 ? sourceKinds.map(String) : null
  const subAgents = kinds !== null && kinds.some((kind) => kind.startsWith('subAgent'))
  const interactive = kinds === null || kinds.some((kind) => !kind.startsWith('subAgent'))
  return (header) => (header?.origin === 'subagent' ? subAgents : interactive)
}
