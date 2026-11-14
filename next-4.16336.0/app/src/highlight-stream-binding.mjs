import {
  STREAM_LIMITS, coveredLength, createLimitTracker, createStreamPhase, flattenTokens, nextStreamPhase,
  prepareStreamHighlight, reduceBatch, validateStreamTokens,
} from "./highlight-stream-model.mjs";

// View-lifecycle adapter for one code fence (official hr/_r plus the oi
// firstRendered/highlighted/ended flags), independent of React. The canonical
// text stays caller-owned; tokens never replace Copy input.
//
// Rules (code-block-current.js:1489-1620, 818-1004):
//  - While frontier: an append-only text change feeds the new suffix; any other
//    change restarts the stream; ineligible languages/limits end it.
//  - Nothing is shown before the first caught-up batch that produced a line.
//  - When the frontier ends after a successful first render the final text is
//    fed, the stream closes when idle and its tokens are RETAINED until remount
//    (addendum-027). Otherwise the settled path owns the block.
//  - Stream tokens carry the fixed stream palettes, never the selected code
//    theme pair. The pair current when the stream opened is remembered; if a
//    different pair arrives once the frontier has ended (at the transition or
//    while retained) the stream ends with reason "theme-changed" and the
//    settled path re-tokenizes under the selected themes (official Ie passes
//    the live theme pair to the fence; a stale palette is never kept).
export const EMPTY_STREAM_VIEW = Object.freeze({ tokens: null, coveredText: "", phase: "idle", retained: false, streaming: false, reason: null });

export function createStreamHighlightBinding({ client, onChange, limits = STREAM_LIMITS }) {
  let key = null, stream = null, fedText = "", lines = [], covered = 0, tracker = null;
  let phase = createStreamPhase(), reason = null, disposed = false, language = null, streamThemes = null;
  const themeKey = (themes) => themes ? `${themes.light}\0${themes.dark}` : "";
  const emit = () => {
    if (disposed) return;
    const visible = phase.phase !== "ended" && phase.firstRendered && phase.highlighted && lines.length > 0;
    onChange({
      tokens: visible ? flattenTokens(lines) : null,
      coveredText: visible ? fedText.slice(0, covered) : "",
      phase: phase.phase, retained: phase.phase === "retained", streaming: phase.phase === "streaming", reason,
    });
  };
  const closeStream = () => { const current = stream; stream = null; current?.close(); };
  const fail = (why) => {
    if (phase.phase === "ended") return;
    closeStream();
    reason = why;
    phase = nextStreamPhase(phase, "fail");
    emit();
  };
  const onBatch = ({ recall, tokens, caughtUp, covered: units }) => {
    if (disposed) return;
    const next = reduceBatch(lines, { recall, tokens });
    if (!next || coveredLength(next) !== units || !validateStreamTokens(next, fedText.slice(0, units), limits)) { fail("token-mismatch"); return; }
    lines = next; covered = units;
    if (!(phase.firstRendered && phase.highlighted)) {
      if (!caughtUp || !next.some((line) => line.length > 0)) return;
      phase = nextStreamPhase(phase, "first-render");
    }
    emit();
  };
  const onEnd = (why) => { if (!disposed) { stream = null; fail(why); } };
  const openStream = (themes) => {
    const handle = client.open({ language, onBatch, onEnd });
    if (!handle) { fail("stream-limit"); return false; }
    stream = handle; tracker = createLimitTracker(limits); fedText = ""; lines = []; covered = 0; streamThemes = themeKey(themes);
    return true;
  };
  const feed = (suffix) => {
    if (!suffix || !stream) return;
    const limit = tracker.accept(suffix);
    if (limit) { fail(limit); return; }
    fedText += suffix;
    stream.push(suffix);
  };
  const reset = () => { closeStream(); fedText = ""; lines = []; covered = 0; tracker = null; phase = createStreamPhase(); reason = null; language = null; streamThemes = null; };
  return {
    update({ text = "", language: rawLanguage, isFrontier = false, languageSettled = true, scopeKey, themes } = {}) {
      if (disposed) return;
      const identity = `${scopeKey}\0${rawLanguage}`;
      if (identity !== key) { const fresh = key !== null; key = identity; reset(); if (fresh) emit(); }
      if (phase.phase === "ended") return;
      if (phase.phase === "retained") {
        // A retained fence is complete; it neither grows nor reopens (remount
        // gives it the settled Code palette, as official reopening does). A
        // new theme pair releases it to the settled path instead.
        if (isFrontier || text !== fedText) fail(isFrontier ? "frontier-reopened" : "replaced-after-frontier");
        else if (themeKey(themes) !== streamThemes) fail("theme-changed");
        return;
      }
      if (isFrontier) {
        if (!languageSettled) return;
        if (!stream) {
          const prepared = prepareStreamHighlight({ text, language: rawLanguage, isFrontier, languageSettled });
          if (prepared.status !== "eligible") { fail(prepared.reason); return; }
          language = prepared.language;
          phase = nextStreamPhase(phase, "open");
          if (openStream(themes)) { feed(text); if (stream) emit(); }
          return;
        }
        if (text.startsWith(fedText)) { feed(text.slice(fedText.length)); return; }
        // Non-append mutation while restartable: a fresh stream from the top;
        // the previous tokens are dropped rather than shown against new text.
        closeStream();
        phase = nextStreamPhase(phase, "restart");
        if (openStream(themes)) feed(text);
        emit();
        return;
      }
      if (!stream) return; // Never streamed: the settled path owns the block.
      if (!text.startsWith(fedText)) { fail("replaced-after-frontier"); return; }
      // The pair changed while streaming: the retained palette would be stale.
      if (themeKey(themes) !== streamThemes) { fail("theme-changed"); return; }
      feed(text.slice(fedText.length));
      if (!stream) return; // feed() may have failed on a limit.
      phase = nextStreamPhase(phase, "frontier-ended");
      // Retained: the stream drains its buffer, later batches still arrive,
      // then it closes itself; fail/dispose can still close it early.
      if (phase.phase === "retained") stream.closeWhenIdle();
      else closeStream();
      emit();
    },
    isHeld() { return !disposed && phase.phase === "retained"; },
    inspect() { return { phase: phase.phase, firstRendered: phase.firstRendered, highlighted: phase.highlighted, fed: fedText.length, covered, lines: lines.length, open: Boolean(stream), reason, themes: streamThemes }; },
    dispose() { if (!disposed) { disposed = true; closeStream(); } },
  };
}
