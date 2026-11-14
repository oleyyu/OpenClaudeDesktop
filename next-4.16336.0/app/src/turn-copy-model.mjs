// Independent local adapter; never executes the official business bundle.
// Evidence: analysis/batch-20260920/turn-footer-current-source.md.
export const TURN_COPY_FEEDBACK_MS = 2000;

/** Official oB joins every text item with two newlines; qI then trims only
 * the complete plain-text payload. Tools, reasoning and plans are not text.
 */
export function turnCopyText(items) {
  return items
    .filter(item => item?.type === "agentMessage" && typeof item.text === "string")
    .map(item => item.text)
    .join("\n\n")
    .trim();
}

/** One copy affordance per actual Codex turn. Unknown turn identities are
 * deliberately omitted instead of grouping unrelated fragments by adjacency.
 * The anchor is the final non-user item, even if it renders no visible body.
 * Root can insert a sibling footer after that item without changing item keys.
 */
export function buildTurnCopyFooters(items, { activeTurnId, streamingTurnIds = [], isResponding = false } = {}) {
  const groups = new Map();
  let latestTurnId = null;
  for (const item of items) {
    if (!item || typeof item.turnId !== "string" || !item.turnId) continue;
    latestTurnId = item.turnId;
    if (item.type === "userMessage") continue;
    let group = groups.get(item.turnId);
    if (!group) {
      group = { turnId: item.turnId, items: [], anchorItemId: null };
      groups.set(item.turnId, group);
    }
    group.items.push(item);
    if (typeof item.id === "string" && item.id) group.anchorItemId = item.id;
  }
  // The actual active turn ID is authoritative; isResponding is only the
  // conservative fallback while that identity is unavailable. A stale false
  // loading/render flag must not expose a known live turn. Callers pass null
  // after the actual turn/completed event (including failure/interruption).
  const activeKnown = typeof activeTurnId === "string" && activeTurnId.length > 0;
  // Main supplies real turn identities from item phases only while an active
  // state has not yet been observed. This covers a text/tool event arriving
  // before turn/started or resume without hiding an unrelated finished tail.
  const streaming = new Set([...streamingTurnIds].filter(id => typeof id === "string" && id.length > 0));
  return [...groups.values()].flatMap(group => {
    const live = (activeKnown && group.turnId === activeTurnId) || streaming.has(group.turnId)
      || (!activeKnown && !streaming.size && isResponding && group.turnId === latestTurnId);
    // 0.2.72: suppress empty action rows for whitespace-only assistant items
    // per the user's request; actual copy payload and separators stay intact.
    const hasText = group.items.some(item => item.type === "agentMessage" &&
      typeof item.text === "string" && item.text.trim().length > 0);
    if (live || !hasText || !group.anchorItemId) return [];
    return [{
      turnId: group.turnId,
      anchorItemId: group.anchorItemId,
      text: turnCopyText(group.items),
    }];
  });
}
