import { changePath, changeKind, changePreview, fileBasename } from "./file-tool-model.mjs";
import { parseUnifiedDiff } from "./diff-model.js";
import { t, tn } from "../electron/i18n/index.mjs";

// The per-turn edits card (2.2553.1 approval-current.js:54158-54188 v8/Ipe, :54299-54517 Vpe 'turn_edits_card'):
// every file a finished turn's completed edits touched, with its +/− counts. Here the edits are the turn's completed
// fileChange items (Codex FileUpdateChange {path, kind, diff}); a later add of a path restarts its counts, as a Write
// does in Ipe (2.42304.0 c96d752d0 w2e). `calls` are the fileChange items that touched the file, in order (w2e's tool
// calls; the card keys its See all state on the first file's first call). Pure.
export function turnEdits(items, { activeTurnId = null } = {}) {
  const turns = new Map();
  for (const item of items || []) {
    if (!item?.turnId || item.turnId === activeTurnId || item.type !== "fileChange" || item.status !== "completed") continue;
    const files = turns.get(item.turnId) ?? new Map();
    for (const change of item.changes || []) {
      const path = changePath(change);
      if (!path) continue;
      const preview = changePreview(change);
      const existing = files.get(path), previous = changeKind(change) === "add" ? null : existing;
      const calls = existing?.calls.at(-1)?.id === item.id ? existing.calls : [...(existing?.calls ?? []), { id: item.id }];
      files.set(path, { path, additions: (previous?.additions ?? 0) + preview.added, deletions: (previous?.deletions ?? 0) + preview.removed, calls });
    }
    if (files.size) turns.set(item.turnId, files);
  }
  const out = new Map();
  for (const [turnId, files] of turns) {
    const list = [...files.values()];
    out.set(turnId, { files: list, additions: list.reduce((sum, file) => sum + file.additions, 0), deletions: list.reduce((sum, file) => sum + file.deletions, 0) });
  }
  return out;
}
// The Changes pane's source when the folder is not a git repo and the core sent no turn/diff/updated (DeepSeek, bridges):
// one unified patch built from the session's completed fileChange items (FileUpdateChange {path, kind, diff}), one file
// section per edit in transcript order (successive edits of one file overlap, so they cannot share a section). A diff that
// is plain file contents (add/delete) becomes a whole-file hunk. Paths inside cwd are made relative to it so the pane's
// open/attach actions resolve them against the workspace. Pure; '' when nothing is showable.
function relativePath(path, cwd) {
  if (typeof cwd !== "string" || !cwd.startsWith("/") || !path.startsWith("/")) return path.replace(/^\.\//, "");
  const root = cwd.replace(/\/+$/, "");
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}
// Hunks per change object: transcript items are immutable, so a streaming session re-derives only new edits.
const hunkCache = new WeakMap();
function changeHunks(change) {
  if (hunkCache.has(change)) return hunkCache.get(change);
  const hunks = deriveHunks(change);
  hunkCache.set(change, hunks);
  return hunks;
}
function deriveHunks(change) {
  const raw = typeof change.diff === "string" ? change.diff.replace(/\r\n/g, "\n") : "";
  if (!raw.trim()) return null;
  const at = raw.startsWith("@@") ? 0 : raw.search(/^@@ /m);
  if (at >= 0 && (at === 0 || /^(diff --git |--- |\+\+\+ |index |new file|deleted file|similarity|rename )/.test(raw))) {
    const hunks = raw.slice(at);
    const parsed = parseUnifiedDiff(`--- a/file\n+++ b/file\n${hunks.endsWith("\n") ? hunks : `${hunks}\n`}`);
    if (parsed.files.length && parsed.files.every((file) => !file.fallbackReason && file.hunks.length)) return hunks.endsWith("\n") ? hunks : `${hunks}\n`;
    return null;
  }
  const kind = changeKind(change);
  if (!["add", "delete"].includes(kind)) return null;
  const lines = raw.split("\n"); if (lines.at(-1) === "") lines.pop();
  if (!lines.length) return null;
  const sign = kind === "add" ? "+" : "-";
  const header = kind === "add" ? `@@ -0,0 +1,${lines.length} @@` : `@@ -1,${lines.length} +0,0 @@`;
  return `${header}\n${lines.map((line) => `${sign}${line}`).join("\n")}\n`;
}
export function fileChangesDiff(items, { cwd = null } = {}) {
  const out = [];
  for (const item of items || []) {
    if (item?.type !== "fileChange" || item.status !== "completed") continue;
    for (const change of item.changes || []) {
      const absolute = changePath(change);
      if (!absolute) continue;
      const path = relativePath(absolute, cwd), kind = changeKind(change);
      const hunks = changeHunks(change);
      if (!hunks) continue;
      const oldName = kind === "add" ? "/dev/null" : `a/${path}`, newName = kind === "delete" ? "/dev/null" : `b/${path}`;
      out.push(`diff --git a/${path} b/${path}\n${kind === "add" ? "new file mode 100644\n" : kind === "delete" ? "deleted file mode 100644\n" : ""}--- ${oldName}\n+++ ${newName}\n${hunks}`);
    }
  }
  return out.join("");
}
/** Fpe (:54180-54188): the message Undo sends as the next turn. */
export function undoTurnText(files) {
  const names = (files || []).map((file) => `\`${file.path}\``);
  // The user's own message, in the UI language (as the git band's Commit prompt).
  return names.length === 1
    ? t("Undo the changes you made to {path} in your last turn and restore it to its previous state.", { path: names[0] })
    : [t("Undo the changes you made to these {count} files in your last turn and restore them to their previous state:", { count: names.length }), ...names.map((name) => `- ${name}`)].join("\n");
}
/** The row's label: 'Edited {file}' for one file, else 'Edited {n} files' (EQZTQdYSJR). */
export function turnEditsLabel(edits) {
  const files = edits?.files || [];
  return files.length === 1 ? t("Edited {file}", { file: fileBasename(files[0].path) }) : tn(files.length, "Edited a file", "Edited {count} files");
}

// The card itself (its three rows before See all / Show {count} more, the folder hints of repeated names, the row
// stops) is the generated 2.42304.0 original: src/generated/r3b-transcript/turn-edits-card.mjs (src/source-turn-edits.jsx).
