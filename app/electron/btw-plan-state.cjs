const { planHandoff } = require('./plan-handoff.mjs');
const MAX_PAGES = 100;

// Unlike transcript display, an incomplete history read cannot prove that it
// is safe to archive. Read only the newest own turn, with full item pagination.
async function readBtwPlanState(rpc, id, thread, btw) {
  const own = btw?.ownTurnIds ?? [];
  if (btw?.permission !== 'plan' || !own.length) return { state: 'settled' };
  const ownIds = new Set(own), latestId = own.at(-1);
  let turn;
  if (thread.historyMode === 'legacy') {
    const result = await rpc('thread/read', { threadId: id, includeTurns: true });
    if (result?.thread?.id !== id || !Array.isArray(result.thread.turns)) return { state: 'unknown' };
    if (result.thread.status?.type === 'active') return { state: 'running' };
    turn = result.thread.turns.findLast(row => ownIds.has(row?.id));
  } else {
    const cursors = new Set(); let cursor;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await rpc('thread/turns/list', { threadId: id, limit: 25,
        sortDirection: 'desc', itemsView: 'full', ...(cursor ? { cursor } : {}) });
      if (!Array.isArray(result?.data)) return { state: 'unknown' };
      turn = result.data.find(row => ownIds.has(row?.id));
      if (turn) break;
      cursor = result.nextCursor;
      if (!cursor || typeof cursor !== 'string' || cursors.has(cursor)) return { state: 'unknown' };
      cursors.add(cursor);
    }
  }
  // A stale page cannot dismiss a newer child turn already recorded by events.
  if (!turn || turn.id !== latestId) return { state: 'unknown' };
  if (turn.status === 'inProgress') return { state: 'running' };
  if (['failed', 'interrupted'].includes(turn.status)) return { state: 'settled' };
  if (turn.status !== 'completed') return { state: 'unknown' };
  let items = turn.items;
  if (thread.historyMode !== 'legacy' && turn.itemsView !== 'full') {
    const cursors = new Set(); let cursor, complete = false; items = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await rpc('thread/items/list', { threadId: id, turnId: turn.id, limit: 200,
        sortDirection: 'asc', ...(cursor ? { cursor } : {}) });
      if (!Array.isArray(result?.data) || result.data.some(row => row?.turnId !== turn.id || !row.item)) return { state: 'unknown' };
      items.push(...result.data.map(row => row.item));
      cursor = result.nextCursor;
      if (cursor == null) { complete = true; break; }
      if (typeof cursor !== 'string' || !cursor || cursors.has(cursor)) return { state: 'unknown' };
      cursors.add(cursor);
    }
    if (!complete) return { state: 'unknown' };
  }
  if (!Array.isArray(items) || items.some(item => !item || typeof item.type !== 'string')) return { state: 'unknown' };
  const handoff = planHandoff({ permission: btw.permission, answered: btw.planAnsweredTurnId,
    items: items.map(item => ({ ...item, turnId: turn.id })), turnErrors: turn.error ? { [turn.id]: turn.error } : null });
  return handoff ? { state: 'waiting', handoff } : { state: 'settled' };
}
module.exports = { readBtwPlanState };
