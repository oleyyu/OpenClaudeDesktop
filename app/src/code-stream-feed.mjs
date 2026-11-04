// W14-code r7 复核 R7T-06 = gates-r7-02 (E95, GUI acceptance): the live message stream of the Code transcript.
//
// 3.6556.2 cf74bc599 dw reads the session's stream snapshot (`He = fd(t, r, i ?? !0, Ve, je)`, cd4f82e77 zt over
// c06cf64bb W) and lays it over the entries it hands its feed (`Os(a, He, Ue)`, c96d752d0 fO → c06cf64bb wy: the last
// provisional entry whose provisionalMessageId is the snapshot's messageId gets the snapshot's items — Fg, ids
// `${messageId}-t${n}` — after its provisionalAfterItemId), while the renderer's own entries stay the raw ones
// (`rendererBaseEntries: ft`, ft = a) and the snapshot reaches it as the live tick (`liveSnapshot: ct` → Zit's
// `C2e() ?? streaming` → R3 → C4's fO on the open turn).
//
// W is fed the Anthropic message stream (kx: message_start, content_block_start / _delta / _stop, message_stop). The host's
// engine streams Codex items instead: an agentMessage grows by item/agentMessage/delta. This module is the host side of
// both ends, pure:
//   streamFeedStep   the stream events that bring W from what it was fed to the streaming agentMessage's text now (one
//                    message per agentMessage item, its id the message id, its text one text block);
//   withStreamTail   the provisional entry as the desktop's stream leaves it while that message streams: its text is not
//                    in the entry yet (c06cf64bb `ue`: provisionalAfterItemId = the entry's last item before the stream,
//                    or null), and provisionalMessageId names the message. The engine ids stay everywhere else; only the
//                    streaming reply's text item is the snapshot's (`${itemId}-t0`) while it streams.

/** W's `feed(sessionId, event, parentToolUseId)` events, each `{event}`, or `{clear: true}` (W.clear). */
export function streamFeedStep(fed, next) {
  const ops = [];
  const target = next && typeof next.id === "string" && next.id ? { id: next.id, text: typeof next.text === "string" ? next.text : "" } : null;
  let current = fed && typeof fed.id === "string" ? fed : null;
  if (current && (!target || target.id !== current.id || !target.text.startsWith(current.text))) {
    // The message ended (or its text was replaced): its block and message stop, then the stream is cleared (jx), so
    // the snapshot is null and the entry's own text shows.
    ops.push({ event: { type: "content_block_stop", index: 0 } }, { event: { type: "message_stop" } }, { clear: true });
    current = null;
  }
  if (!target) return { fed: null, ops };
  if (!current) {
    ops.push({ event: { type: "message_start", message: { id: target.id, type: "message", role: "assistant", content: [] } } },
      { event: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } } });
    current = { id: target.id, text: "" };
  }
  const rest = target.text.slice(current.text.length);
  if (rest) ops.push({ event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: rest } } });
  return { fed: { id: target.id, text: target.text }, ops };
}

/**
 * The entries with the streaming message's text out of its provisional entry: the last entry carrying
 * provisionalMessageId (code-transcript-entries: the running turn's reply) whose last item is the text item `streamId`.
 * Unchanged when there is no such entry.
 */
export function withStreamTail(entries, streamId) {
  if (!Array.isArray(entries) || typeof streamId !== "string" || !streamId) return entries;
  const at = entries.findLastIndex((entry) => entry?.provisionalMessageId !== undefined);
  const entry = entries[at];
  const last = entry?.items?.at(-1);
  if (!entry || last?.kind !== "text" || last.id !== streamId) return entries;
  const items = entry.items.slice(0, -1);
  const next = entries.slice();
  next[at] = { ...entry, items, provisionalMessageId: streamId, provisionalAfterItemId: items.at(-1)?.id ?? null };
  return next;
}

/** The engine row streaming in the running turn: the last agentMessage `isStreaming(row)` says still grows. */
export function streamingAgentMessage(rows, isStreaming) {
  if (!Array.isArray(rows) || typeof isStreaming !== "function") return null;
  for (let index = rows.length - 1; index >= 0; index--) {
    const row = rows[index];
    if (row?.type === "agentMessage" && typeof row.id === "string" && isStreaming(row)) return row;
  }
  return null;
}

// W14-code r8 R8T-REG-01: the snapshot's item ids name the message (c06cf64bb Fg: `${e.messageId}-t${a}`), the host's
// entries name the engine item (code-transcript-entries: a reply's text item is the agentMessage's id). The desktop's
// persisted entries carry the same `-t${n}` ids as its snapshot, so nothing it keeps by item id moves when the stream ends;
// the host's do, so what it keeps (a pinned chapter's afterId, a part's host row) is the engine id, read through Lg
// (c06cf64bb `function Lg(e) { return e.replace(/-t\d+$/, ""); }`, c96d752d0 `Ib`).
const SNAPSHOT_SUFFIX = /-t\d+$/;

/** c06cf64bb Lg: an item id without its snapshot suffix. */
export function withoutSnapshotSuffix(id) {
  return typeof id === "string" ? id.replace(SNAPSHOT_SUFFIX, "") : id;
}

/**
 * The engine item a snapshot item id names: `id` itself when `known(id)`, else Lg(id) when that is known (the streamed
 * message's text item), else `id` unchanged. `known(id)` says whether an engine item has that id.
 */
export function engineItemIdOf(id, known) {
  if (typeof id !== "string" || !id || typeof known !== "function" || known(id)) return id;
  const engine = withoutSnapshotSuffix(id);
  return engine !== id && known(engine) ? engine : id;
}

/**
 * The chapters by afterId (session-chapters-model chaptersByAnchor) as the renderer reads them while `streamId` streams:
 * a chapter pinned to the streaming reply's text (kept under its engine id) is also found under the snapshot's id
 * (`${streamId}-t0`), so its heading and M7's pressed state hold through the stream. Unchanged otherwise.
 */
export function chaptersWithStreamAlias(byAfterId, streamId) {
  if (!(byAfterId instanceof Map) || typeof streamId !== "string" || !streamId || !byAfterId.has(streamId)) return byAfterId;
  return new Map(byAfterId).set(`${streamId}-t0`, byAfterId.get(streamId));
}
