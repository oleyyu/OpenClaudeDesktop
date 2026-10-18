// B34 next / previous change in Changes (shared-19 m6 nextDiffChange/prevDiffChange; c44d00c7f Nt / Ho): the pure parts of
// the F7 / ⇧F7 navigation (⌥F5 / ⇧⌥F5 off Linux) between the changed blocks of the Changes pane.
// R3-files FT-07 (diffgit-09): the anchors and the step are the 2.42304.0 originals (generated/files-changes/
// diff-change-nav.mjs: c44d00c7f pi / mi / hi, with hi's `belowPane` case); this module keeps the key bindings and the
// host's hunk shape.
import { adjacentChange, changeAnchors, sameChangeAnchor } from "./generated/files-changes/diff-change-nav.mjs";

/** shared-19 m6: { command, key, when }; `!isLinux` rows are dropped on Linux. */
export function diffChangeShortcuts({ linux = false } = {}) {
  return {
    next: [...(linux ? [] : ["alt+f5"]), "f7"],
    prev: [...(linux ? [] : ["shift+alt+f5"]), "shift+f7"],
  };
}

/** The keydown's command: "next", "prev" or null. Bindings match the key's code with exact modifiers (code F7 / F5). */
export function diffChangeCommand(event, { linux = false } = {}) {
  if (!event || event.isComposing || event.keyCode === 229) return null;
  const code = event.code || (typeof event.key === "string" ? event.key : "");
  if (event.metaKey || event.ctrlKey) return null;
  const shift = !!event.shiftKey, alt = !!event.altKey;
  if (code === "F7" && !alt) return shift ? "prev" : "next";
  if (code === "F5" && alt && !linux) return shift ? "prev" : "next";
  return null;
}

/** Host adapter: the local parser's hunks (diff-model rows) in the @pierre/diffs shape pi reads — each side's start and
 * count, and hunkContent as runs of `{type: "context", lines}` and `{type: "change", additions, deletions}` (a run of
 * removed / added rows between context rows). "\ No newline at end of file" notes are not lines and break no run. */
export function pierreDiffHunks(hunks = []) {
  return (hunks ?? []).map((hunk) => {
    const hunkContent = [];
    for (const row of hunk.rows ?? []) {
      let last = hunkContent[hunkContent.length - 1];
      if (row.type === "context") {
        if (last?.type === "context") last.lines++;
        else hunkContent.push({ type: "context", lines: 1 });
      } else if (row.type === "added" || row.type === "removed") {
        if (last?.type !== "change") hunkContent.push(last = { type: "change", additions: 0, deletions: 0 });
        if (row.type === "added") last.additions++;
        else last.deletions++;
      }
    }
    return { deletionStart: hunk.oldStart, deletionCount: hunk.oldCount, additionStart: hunk.newStart, additionCount: hunk.newCount, hunkContent };
  });
}

/** pi(id, diff): one target per change block. The target names the additions side when the block adds lines (its first
 * new line), else the deletions side (its first old line); oldLine / newLine are where the block starts on each side
 * and `removes` whether it deletes lines. A hunk with an empty side starts that side at the line after its header's. */
export function diffChangeTargets(id, hunks = []) {
  return changeAnchors(id, { hunks: pierreDiffHunks(hunks) });
}

/** mi, null-safe for the host's "no previous press". */
export function sameDiffChange(a, b) {
  return !!a && !!b && sameChangeAnchor(a, b);
}

/** hi(targets, fileOrder, {last, viewport}, direction): the change to go to. `last` is the change the previous press
 * went to while it is still on screen (step from it); otherwise `viewport` is the topmost visible line ({id, side,
 * lineNumber, belowPane?}; lineNumber 0 = the top of a file) and the next change is the first one below it, the previous
 * the last one above it (skipping the change that line itself starts). With `belowPane` (that line is below the bottom
 * of the pane) the change starting at the line itself is still ahead. */
export function pickDiffChange(targets, order, { last = null, viewport = null } = {}, direction) {
  return adjacentChange(targets, order, { last, viewport }, direction);
}

/** Wo: the sticky file header's height, 2rem at the root font size. */
export function diffChangeHeaderOffset(rootFontSize = 16) {
  return (32 * (Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16)) / 16;
}
