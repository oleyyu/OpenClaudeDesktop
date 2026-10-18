import { t } from "../electron/i18n/index.mjs";

// Changes pane "Changed files" column model (2.2553.1). Pure: no React, no DOM.
// Sources (readable/):
// - panes-diff-view-current.js:2577-2586 di/fi (the test-path regex, ported exactly),
//   :3916-4036 Sa/Ca/wa/Ta/Ea/Da/Oa/ka (kind rules: generated > build > test > source),
//   Aa/ja/Ma (folder tree with single-child folder chains joined, flat list),
//   :4038-4096 Pa/Fa/Ia/La (collapsed folders, kind sections open while they hold the
//   active file), :4334-4411 Ga (tree keyboard rows), :4221-4223 za (section labels),
//   :472-501 Mn/Pn (file order: tree or list path order), :5221-5232 Qe (large diff).
// - tmp-shared-20-BrTrXIRV.js:9339-9372 kT/jT/MT/NT (numeric collator path compare;
//   folders first in tree order, files first in list order).
// - cf3dc7910-CGMuwDxG.js l = {DEFAULT 240, MIN 160, MAX 640} and b (rounded clamp);
//   panes-diff-view-current.js:5075 So = DEFAULT + 160 (treeHideBelowPx).
// "Filter" here is Mn's inclusion filter (_t/De: only listable files); the original
// column has no text filter field, so none is modelled.

export const DIFF_FILE_LIST_WIDTH = Object.freeze({ DEFAULT: 240, MIN: 160, MAX: 640 });
// So: the column fits only when the diff body is at least this wide.
export const DIFF_FILE_LIST_MIN_PANE = DIFF_FILE_LIST_WIDTH.DEFAULT + 160;
// Qe/$e (2.42304.0 c44d00c7f Al): additions + deletions above the limit collapse every file. The limit is
// `He ? Rt : Pt` (cd14a8022 j=2e4 / A=5e3): 20000 for the single-list renderer Bs (main window, perFileList unset),
// 5000 for the per-file list hl (Be: rendered into another window, or perFileList). The local Changes body is the
// per-file list (one FileDiff per section, like hl) in every window, so it takes Pt (diffgit-08, host adapter).
export const LARGE_DIFF_LINES = 5000;
export const LARGE_DIFF_LINES_SINGLE_LIST = 20000;
// kl / Ol (c44d00c7f): the >300-file "changed but no patch, and no hunk anywhere" heuristic.
export const LARGE_DIFF_FILES = 300;
const HUNK_HEADER = /(?:^|\n)@@/;
export const DIFF_FILE_KINDS = Object.freeze(["test", "build", "generated"]);

export const DIFF_FILE_LIST_LABELS = Object.freeze({
  changedFiles: t("Changed files"),
  showFiles: t("Show files"),
  hideFiles: t("Hide files"),
  resize: t("Resize file list"),
  groupByFolder: t("Group files by folder"),
  groupByKind: t("Separate test, build, and generated files"),
  test: t("Test files"),
  build: t("Build files"),
  generated: t("Generated files"),
  largeBanner: t("Files are collapsed for large diffs. Select a file to expand it."),
  expandAllTooLarge: t("This diff is too large to expand at once. Select a file to expand it."),
  coachmark: t("Open the file list to see everything this diff touches and jump between files."),
});

// di (:2577-2583), ported exactly.
const TEST_PATH = new RegExp(
  [
    "(^|\\/)__(tests|snapshots)__\\/",
    "[._](test|spec)\\.[^/]+$",
    "(^|\\/)test_[^/]*\\.py$",
    "\\.snap$",
  ].join("|"),
);
// wa (:3918-3937).
const GENERATED_PATH = new RegExp(
  [
    "(^|\\/)(package-lock\\.json|npm-shrinkwrap\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lockb?|Cargo\\.lock|Gemfile\\.lock|Podfile\\.lock|composer\\.lock|poetry\\.lock|uv\\.lock|Pipfile\\.lock|go\\.sum|flake\\.lock|pubspec\\.lock|mix\\.lock|packages\\.lock\\.json)$",
    "(^|\\/)(__generated__|generated|gen)\\/",
    "[._]gen(erated)?\\.[^/]+$",
    "\\.pb\\.(go|h|cc|ts|js)$",
    "\\.pb\\.gw\\.go$",
    "_pb2(_grpc)?\\.pyi?$",
    "_pb\\.(d\\.ts|js|ts)$",
    "\\.g\\.dart$",
    "\\.[Dd]esigner\\.cs$",
    "\\.min\\.(js|css)$",
    "\\.(js|css)\\.map$",
    "(^|\\/)(\\.next|\\.nuxt|\\.svelte-kit|\\.parcel-cache|__pycache__)\\/",
    "\\.(pyc|tsbuildinfo)$",
    "^dist\\/",
  ].join("|"),
);
// Ta (:3938-3945).
const BUILD_PATH = new RegExp(
  [
    "(^|\\/)BUILD(\\.bazel)?$",
    "(^|\\/)WORKSPACE(\\.bazel|\\.bzlmod)?$",
    "(^|\\/)MODULE\\.bazel(\\.lock)?$",
    "\\.bzl$",
  ].join("|"),
);
// Ea (:3946-3955).
const TEST_LIKE_PATH = new RegExp(
  [
    "\\.stories\\.[jt]sx?$",
    "(^|\\/)conftest\\.py$",
    "Tests?\\.(swift|kt|java)$",
    "_unittest\\.(cc|cpp)$",
    "(^|\\/|_)tests\\.rs$",
    "(^|\\/)(tests?|spec|__Snapshots__|e2e([-_]tests?)?)\\/",
  ].join("|"),
);

// fi
export function isTestPath(path) {
  return TEST_PATH.test(path);
}
// Da
export function diffFileKind(path) {
  return GENERATED_PATH.test(path) ? "generated"
    : BUILD_PATH.test(path) ? "build"
      : isTestPath(path) || TEST_LIKE_PATH.test(path) ? "test"
        : "source";
}
// Oa
export function groupFilesByKind(files) {
  const groups = { source: [], test: [], build: [], generated: [] };
  for (const file of files) groups[diffFileKind(file.filePath)].push(file);
  return groups;
}
// ka (Ca = source then Sa).
export function orderFilesByKind(files) {
  const groups = groupFilesByKind(files);
  return ["source", ...DIFF_FILE_KINDS].flatMap((kind) => groups[kind]);
}

// kT/OT: numeric collator, code-unit tie break.
let collator = null;
function compareSegment(a, b) {
  if (a === b) return 0;
  collator ??= new Intl.Collator(undefined, { numeric: true });
  return collator.compare(a, b) || (a < b ? -1 : 1);
}
// NT: segment by segment; at the first level where one side is a file and the
// other a folder, `fileSide` (1 = files after folders, -1 = files first) decides.
function comparePaths(a, b, fileSide) {
  let i = 0, j = 0;
  for (;;) {
    const x = a.indexOf("/", i), y = b.indexOf("/", j);
    const aLast = x === -1, bLast = y === -1;
    if (aLast !== bLast) return aLast ? fileSide : -fileSide;
    const order = compareSegment(aLast ? a.slice(i) : a.slice(i, x), bLast ? b.slice(j) : b.slice(j, y));
    if (order !== 0 || aLast) return order;
    i = x + 1; j = y + 1;
  }
}
// jT (tree order) / MT (list order).
export const compareTreePaths = (a, b) => comparePaths(a, b, 1);
export const compareListPaths = (a, b) => comparePaths(a, b, -1);
// Pn: "… " truncation placeholders sort last.
const placeholder = (path) => path.startsWith("… ");
export function compareDiffPaths(a, b, mode = "tree") {
  const pa = placeholder(a), pb = placeholder(b);
  if (pa !== pb) return pa ? 1 : -1;
  return mode === "tree" ? compareTreePaths(a, b) : compareListPaths(a, b);
}

// Mn inclusion filter, local shape: a parsed diff-model file section is listable
// when it has a path (pathless parser fallbacks and raw sections stay body-only).
// Counts are the file's own +/-; a parser fallback (null counts) lists none.
export function diffFileEntries(sections) {
  const entries = [];
  const seen = new Set();
  for (const section of sections ?? []) {
    if (section?.type !== "file" || typeof section.path !== "string" || !section.path || seen.has(section.path)) continue;
    seen.add(section.path);
    const counted = Number.isFinite(section.added) && Number.isFinite(section.removed);
    entries.push({
      filePath: section.path,
      additions: counted ? section.added : null,
      deletions: counted ? section.removed : null,
      status: section.status ?? "modified",
      removed: section.status === "deleted",
    });
  }
  return entries;
}

// Mn sort + ka: the order both the column and the diff body use.
export function orderDiffFiles(entries, { tree = true, groupByKind = false } = {}) {
  const sorted = [...entries].sort((a, b) => compareDiffPaths(a.filePath, b.filePath, tree ? "tree" : "list"));
  return groupByKind ? orderFilesByKind(sorted) : sorted;
}
// Body sections reordered to the file order; sections that are not listable
// (raw patch text, pathless fallbacks, duplicate paths) keep their relative
// order after the listed files.
export function orderDiffSections(sections, options) {
  const list = sections ?? [];
  const order = orderDiffFiles(diffFileEntries(list), options).map((entry) => entry.filePath);
  const rank = new Map(order.map((path, index) => [path, index]));
  const listed = [], rest = [], placed = new Set();
  for (const section of list) {
    const path = section?.type === "file" ? section.path : null;
    if (path && rank.has(path) && !placed.has(path)) { listed.push(section); placed.add(path); } else rest.push(section);
  }
  listed.sort((a, b) => rank.get(a.path) - rank.get(b.path));
  return [...listed, ...rest];
}

const fileNode = (entry) => ({
  kind: "file",
  name: entry.filePath.slice(entry.filePath.lastIndexOf("/") + 1),
  path: entry.filePath,
  additions: entry.additions,
  deletions: entry.deletions,
  removed: entry.removed,
});
// Ma: a folder whose only child is a folder joins it ("a/b").
function compactFolders(nodes) {
  return nodes.map((node) => {
    if (node.kind !== "dir") return node;
    const children = compactFolders(node.children);
    if (children.length === 1 && children[0].kind === "dir") {
      const only = children[0];
      return { kind: "dir", name: `${node.name}/${only.name}`, path: only.path, children: only.children };
    }
    return { ...node, children };
  });
}
// Aa: group by folder, in input order.
export function diffFileTree(entries) {
  const root = [];
  const folders = new Map([["", root]]);
  for (const entry of entries) {
    const parts = entry.filePath.split("/");
    parts.pop();
    let prefix = "", level = root;
    for (const part of parts) {
      const path = prefix ? `${prefix}/${part}` : part;
      let children = folders.get(path);
      if (!children) {
        children = [];
        folders.set(path, children);
        level.push({ kind: "dir", name: part, path, children });
      }
      prefix = path;
      level = children;
    }
    level.push(fileNode(entry));
  }
  return compactFolders(root);
}
// ja: flat rows (the row shows the folder prefix itself).
export function diffFileFlat(entries) {
  return entries.map(fileNode);
}

// Ra/Ba: the column's top-level rows and the separated kind sections.
export function diffFileList(entries, { tree = true, groupByKind = false } = {}) {
  const files = orderDiffFiles(entries, { tree, groupByKind });
  const groups = groupByKind ? groupFilesByKind(files) : null;
  const source = groups ? groups.source : files;
  const build = (list) => (tree ? diffFileTree(list) : diffFileFlat(list));
  const nodes = build(source);
  const sections = groups
    ? DIFF_FILE_KINDS.filter((kind) => groups[kind].length > 0).map((kind, index) => ({
      kind,
      label: DIFF_FILE_LIST_LABELS[kind],
      count: groups[kind].length,
      paths: groups[kind].map((entry) => entry.filePath),
      nodes: build(groups[kind]),
      separated: index > 0 || nodes.length > 0,
    }))
    : [];
  return { files, nodes, sections };
}

// Ze/Qe: the summed +/- of every listed file; null counts add nothing.
export function diffTotals(entries) {
  let additions = 0, deletions = 0;
  for (const entry of entries ?? []) {
    if (Number.isFinite(entry.additions)) additions += entry.additions;
    if (Number.isFinite(entry.deletions)) deletions += entry.deletions;
  }
  return { additions, deletions };
}
// $e, ported branch for branch:
//   lines > limit ? true : Qe === void 0 ? Fe !== void 0 && (some changed && none has a patch
//     || files > kl && some changed without a patch && no patch has an @@ line) : Qe
// withheld = comparison.patches_withheld (Qe; only a boolean counts), lazyPatches = fetchFilePatch is defined (Fe),
// singleList = He. A file's rawFile is {changes, patch} as the official comparison file (absent: unchanged, no patch).
// Officially Qe and Fe arrive together: c5da7eb42 asks getGitDiff for the inline budget
// ({includePatches:false, inlinePatchesMaxChangedLines:2e4}) and sets lazy_file_hunks only when getGitDiffFilePatch
// exists; the main process answers patches_withheld only to that budgeted call (index.chunk-BAdej_RQ je).
export function isLargeDiff(entries, { withheld, lazyPatches = false, singleList = false } = {}) {
  const { additions, deletions } = diffTotals(entries);
  if (additions + deletions > (singleList ? LARGE_DIFF_LINES_SINGLE_LIST : LARGE_DIFF_LINES)) return true;
  if (typeof withheld === "boolean") return withheld;
  if (!lazyPatches) return false;
  const files = entries ?? [];
  const changed = (file) => (file?.rawFile?.changes ?? 0) > 0;
  const patch = (file) => file?.rawFile?.patch;
  return files.some(changed) && !files.some(patch)
    || files.length > LARGE_DIFF_FILES && files.some((file) => changed(file) && !patch(file)) && !files.some((file) => HUNK_HEADER.test(patch(file) ?? ""));
}

// La: selecting a file re-opens every collapsed folder above it.
export function revealCollapsed(collapsed, path) {
  if (path === null || path === undefined) return collapsed;
  let next = null;
  for (const folder of collapsed) if (path.startsWith(`${folder}/`)) { next ??= new Set(collapsed); next.delete(folder); }
  return next ?? collapsed;
}
export function toggleCollapsed(collapsed, path) {
  const next = new Set(collapsed);
  if (next.has(path)) next.delete(path); else next.add(path);
  return next;
}
// Ia/Ba: a kind section is open by default only while it holds the active file;
// after the user toggles it that choice stays, until a newly selected file inside
// it opens it again (openKindSections).
export function kindSectionOpen(stored, holdsActive) {
  return stored === undefined ? holdsActive : stored;
}
export function openKindSections(stored, sections, activePath) {
  if (activePath === null || activePath === undefined) return stored;
  const section = sections.find((entry) => entry.paths.includes(activePath));
  return !section || stored[section.kind] === true ? stored : { ...stored, [section.kind]: true };
}

// Ga row navigation: the index to focus for a key, from the focused row index
// (-1 when the tree itself has focus; then the current row, else the first).
export function treeRowTarget(key, { index, count, currentIndex = -1 }) {
  if (count <= 0) return null;
  const start = currentIndex >= 0 ? currentIndex : 0;
  switch (key) {
    case "ArrowDown": return index < 0 ? start : Math.min(index + 1, count - 1);
    case "ArrowUp": return index < 0 ? start : Math.max(index - 1, 0);
    case "Home": return 0;
    case "End": return count - 1;
    default: return null;
  }
}

// b: a stored width is rounded and clamped; anything else is the default.
export function clampDiffFileListWidth(value, fallback = DIFF_FILE_LIST_WIDTH.DEFAULT) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(DIFF_FILE_LIST_WIDTH.MAX, Math.max(DIFF_FILE_LIST_WIDTH.MIN, Math.round(value)))
    : fallback;
}
// The width the column can take in a body `paneWidth` wide (columnStyle
// maxWidth min(640px, 100% - 160px), never below MIN).
export function diffFileListLimit(paneWidth) {
  return Math.max(DIFF_FILE_LIST_WIDTH.MIN, Math.min(DIFF_FILE_LIST_WIDTH.MAX, (paneWidth || 0) - 160));
}
// uh/Nt: unmeasured (0) counts as fitting, like diffCanFitTree ?? true.
export function diffFileListCanFit(paneWidth) {
  return !(paneWidth > 0) || paneWidth >= DIFF_FILE_LIST_MIN_PANE;
}

// ---- R4i-files FI2 (diffgit-08-lazy): withheld patches and per-file patch reads ---------------------------------------
// c5da7eb42 asks the working-tree diff for the inline budget only where getGitDiffFilePatch exists:
// `e?{includePatches:!1,inlinePatchesMaxChangedLines:2e4}:void 0` (CxZMGoHL PANE_INLINE_PATCHES_MAX_CHANGED_LINES=2e4).
export const INLINE_PATCHES_MAX_CHANGED_LINES = 20000;
export const INLINE_PATCH_BUDGET = Object.freeze({ includePatches: false, inlinePatchesMaxChangedLines: INLINE_PATCHES_MAX_CHANGED_LINES });
// CxZMGoHL PER_FILE_FETCH_CONCURRENCY=4: at most four per-file patch reads run at once (Expand all on a withheld diff).
export const PER_FILE_FETCH_CONCURRENCY = 4;

// The main process's comparison files ({filename, status, additions, deletions, changes, previous_filename}) onto the
// parsed sections: a withheld file arrives as a header-only block (no hunks), so its counts come from the comparison
// and it is marked lazyPatch {previousPath} (Ko: no patch and changes > 0). Sections with hunks are left as parsed. A
// modified file's header-only block has no change metadata, which diff-model marks HEADER_ONLY_FALLBACK; with a
// comparison entry that is the withheld patch, not a parse failure, so the fallback is cleared.
const HEADER_ONLY_FALLBACK = "No complete text hunks or change metadata";
export function withComparisonFiles(sections, files) {
  if (!Array.isArray(files) || !files.length) return sections;
  const byPath = new Map();
  for (const file of files) if (file && typeof file.filename === "string" && file.filename) byPath.set(file.filename, file);
  let changed = false;
  const next = (sections ?? []).map((section) => {
    if (section?.type !== "file" || !section.path || section.hunks?.length || section.binary) return section;
    if (section.fallbackReason && section.fallbackReason !== HEADER_ONLY_FALLBACK) return section;
    const file = byPath.get(section.path);
    if (!file || !(file.changes > 0) || !Number.isFinite(file.additions) || !Number.isFinite(file.deletions)) return section;
    changed = true;
    const previousPath = typeof file.previous_filename === "string" && file.previous_filename ? file.previous_filename : undefined;
    // R4i-files fix: hashInput is c44d00c7f Br's lazy contentHash input (`${n}:${t.status}:${t.additions}:${t.deletions}:${t.previous_filename??""}`,
    // less merge_base, which the host comparison does not carry): the patch query key, so a change re-reads the row.
    return { ...section, fallbackReason: null, added: file.additions, removed: file.deletions,
      lazyPatch: { previousPath, hashInput: `${file.status ?? ""}:${file.additions}:${file.deletions}:${previousPath ?? ""}` } };
  });
  return changed ? next : sections;
}

// The rawFile of a listed entry as the official comparison file ({changes, patch}), for isLargeDiff's no-patch branch:
// a lazy (withheld) section has no patch, any other section's patch is its own text.
export function withRawFiles(entries, sections) {
  const byPath = new Map();
  for (const section of sections ?? []) if (section?.type === "file" && section.path && !byPath.has(section.path)) byPath.set(section.path, section);
  return (entries ?? []).map((entry) => {
    const section = byPath.get(entry.filePath);
    const changes = (Number.isFinite(entry.additions) ? entry.additions : 0) + (Number.isFinite(entry.deletions) ? entry.deletions : 0);
    return { ...entry, rawFile: { changes, patch: section?.lazyPatch ? undefined : (section?.raw || undefined) } };
  });
}

// A FIFO limiter for the per-file reads: schedule(run) resolves with run()'s result once a slot is free.
export function createPatchFetchQueue(limit = PER_FILE_FETCH_CONCURRENCY) {
  let active = 0;
  const waiting = [];
  const pump = () => {
    while (active < limit && waiting.length) {
      const job = waiting.shift();
      active++;
      Promise.resolve().then(job.run).then(job.resolve, job.reject).finally(() => { active--; pump(); });
    }
  };
  return (run) => new Promise((resolve, reject) => { waiting.push({ run, resolve, reject }); pump(); });
}
// c5da7eb42 `e=!s&&!o&&!r&&!!V?.getGitDiffFilePatch`: only the local working-tree diff is budgeted and read per file; a
// commit's own diff (getCommitDiff) carries every patch. workspace-git-diff scope params: 'branch' (the default),
// 'uncommitted', 'commit:<sha>'.
export const lazyDiffScope = (param) => param === undefined || param === null || param === "branch" || param === "uncommitted";
