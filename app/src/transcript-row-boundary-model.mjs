// transcript-v01: which copy a crashed transcript row shows. The 2.42304.0 feed wrapper (c96d752d0 u9) passes
// `kind: t.kind === "assistant" || t.kind === "assistantItem" ? "reply" : "row"`: every row built from an assistant
// entry (its text, thinking, tools and other items, one row each) says "This response didn’t load.", everything else
// (the user's message, notices) "Couldn’t load this.". In this host one item is one row; the user's own message and the
// host's connection / review-mode / compaction notices are not part of a reply.
const NOT_REPLY = new Set(['userMessage', 'connecting', 'reconnect', 'enteredReviewMode', 'exitedReviewMode', 'contextCompaction']);

export function transcriptRowCrashKind(item) {
  return item && typeof item.type === 'string' && !NOT_REPLY.has(item.type) ? 'reply' : 'row';
}
