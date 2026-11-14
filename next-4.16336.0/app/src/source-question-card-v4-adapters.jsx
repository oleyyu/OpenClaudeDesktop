// Host boundaries of the 4.16336.0 question card graph (scripts/extract-question-card-v4.mjs -> src/generated/question-card-v4).
// Each export stands in for one official declaration, pinned there by features and raw sha256 (HOST_ADAPTERS / ADAPTER_PINS).

/**
 * cb8c5a88f Zi (export f): the transcript plain-text painter. The shared answer button (c2f6611a3 hr) hands it to the
 * description renderer (c88cd06ec d `paint`) only when an option description contains `http://` / `https://`
 * (c2f6611a3 dr); c2f6611a3 fr calls it as `Zi(text, 0, undefined × 6, true)`. With that call the session-mention branch
 * is off (no mention table, no labels) and the official painter turns each URL into the transcript link (cb8c5a88f Gi:
 * link policy / confirm dialog, artifact and PR panes, file links) between cloak-aware text runs (cb8c5a88f X).
 *
 * PENDING OWNER: that closure (~6600 official bindings: session chips, PR rows, environments query, router, telemetry)
 * is the transcript text layer, which no 4.16336.0 graph slices yet (transcript-rows-v4 tr-3/tr-4 or cds-core). Until
 * that owner exports Zi and this graph links it, the description is rendered as the text the painter receives — what the
 * 3.6556.2 card (src/generated/question-card) shows for every description: URLs stay plain text. This is reported as a
 * blocked item of the question-card region; it is not a port of the painter.
 */
export function paintTranscriptText(text) {
  return text;
}
