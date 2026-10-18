// B33 File tree polish: pure ports for the Files pane tree rows (reference 2.31226.0 cccc2cf0a-DHtZKTKW and
// ce9ca5630-BmDtcTP7; formatted extracts under analysis/code-ui-sync-20261013/readable/).

// cccc2cf0a rv/av (:3966-3984): expanding a folder also expands each folder below it that is the only entry of
// its parent, at most 16 levels. A failed read, more than one entry, a file or a symbolic link stops the chain.
export const SINGLE_CHILD_EXPAND_LIMIT = 16;
export async function singleChildFolderChain(path, list, limit = SINGLE_CHILD_EXPAND_LIMIT) {
  const chain = [];
  let current = path;
  while (chain.length < limit) {
    let entries;
    try { entries = await list(current); } catch { break; }
    const only = Array.isArray(entries) && entries.length === 1 ? entries[0] : undefined;
    if (!only?.directory || only.link !== undefined || only.symlink === true || typeof only.path !== "string") break;
    chain.push(only.path);
    current = only.path;
  }
  return chain;
}

// cd2efac6e Qo (:1579-1581), used as `P = ol(e)` by the cccc2cf0a My row: a row opens (and a folder toggles)
// only when it is not a link or its link resolves inside the working directory. Broken, circular and external
// links stay inert: aria-disabled, the muted name, not draggable, no open on click, middle click or Enter.
export function treeEntryOpenable(entry) {
  return !entry?.link || entry.link.state === "ok";
}

// 2.42304.0 ca7840910 (was ce9ca5630): rows indent 10px per level, with the original ancestor-guide
// geometry starting at the centre of the root's xs (12px) icon. The icon size is E(): "sm" only when the
// fizzy-lake "panels" part is on (shared-4 jf), which this build never enables (Ef=Cf=[]), so it stays "xs".
// fileTreeRowStyle is V (= L + B), the style the original error row Ll(depth) and kept rows use.
export const FILE_TREE_PAD = 8;
export const FILE_TREE_INDENT = 10;
export { fileTreeGuideStyle, treeIndent, fileTreeRowStyle } from './generated/code-current/file-tree-style.mjs';

// ---- R3-files FT-14 (files-08 / files-v03): the tree's official classes. ----
// 2.42304.0 cccc2cf0a Nx / NS / AS over ca7840910 A/j/N/I/F, shared-6 _h/vh, shared-frame Cx (the CDS menu-item
// variants) and the row parts dx/fx/px, all generated (generated/files-changes). OpenClaude's tree is nested DOM (a
// treeitem holds its row and its children's group) rather than the official flat virtual list, so the treeitem wrapper
// carries the ARIA and focus while an inner row element carries what the official treeitem paints.
import { cdsClassNames } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { clsx } from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';
import { menuItemClasses } from './generated/files-changes/menu-item-classes.mjs';
import { fileTreeRowBase, fileTreeRowSelected, fileTreeRowPrimary, keptGuideFolders, keptGuidesOfRow } from './generated/files-changes/file-tree-row.mjs';
import { fileTreeGroup, fileTreePadding, fileTreeKeptGuides, fileTreeRowCurrent, fileTreeRowIdle } from './generated/files-changes/file-tree-row-classes.mjs';
import { appListRowMin } from './generated/files-changes/app-list-row.mjs';
export { fileTreeIconSize } from './generated/code-current/file-tree-style.mjs';
export { fileTreeRowPrimary };

// Nx's tree element: `${Rl} flex-1 min-h-0 overflow-y-auto [contain:strict] ${Nl} outline-none hide-focus-ring`.
export const FILE_TREE_CONTAINER_CLASS = `${fileTreeGroup} flex-1 min-h-0 overflow-y-auto [contain:strict] ${fileTreePadding} outline-none hide-focus-ring`;
// AS (a subfolder that could not be read): `flex items-center ${Dn} px-lg text-body text-muted-as-secondary outline-none ${zl}`.
export const FILE_TREE_ERROR_ROW_CLASS = `flex items-center ${appListRowMin} px-lg text-body text-muted-as-secondary outline-none ${fileTreeKeptGuides}`;
// NS's guide layer below the root (its literal is ca7840910 j after the positioning classes).
export const FILE_TREE_GUIDE_LAYER_CLASS = `pointer-events-none absolute inset-0 ${fileTreeKeptGuides}`;

/** NS: `Er(vr(), dx, I ? Ul : ee ? fx : Wl, m !== void 0 && "transition-colors duration-300")` — current file, selected, idle. */
export function fileTreeRowClassName({ current = false, selected = false, revealing = false } = {}) {
  return cdsClassNames(menuItemClasses(), fileTreeRowBase, current ? fileTreeRowCurrent : selected ? fileTreeRowSelected : fileTreeRowIdle,
    revealing && 'transition-colors duration-300');
}
/** NS's glyph: a folder's CaretRight (it toggles: fe) turns with the folder; a file's type icon is muted-control when it opens. */
export function fileTreeIconClassName({ directory = false, openable = true, expanded = false } = {}) {
  return directory
    ? clsx('shrink-0 self-center', 'text-muted-as-secondary', 'transition-transform duration-fast motion-reduce:transition-none', expanded && 'rotate-90')
    : clsx('shrink-0 self-center', openable ? 'text-muted-control' : 'text-muted-as-secondary');
}
/** NS's name: primary when the row opens (no search positions in the tree), else muted (a broken / external link). */
export function fileTreeNameClassName(openable = true) {
  return clsx('truncate', openable ? 'text-primary' : 'text-muted-as-secondary');
}

/**
 * DS's kept guides (cccc2cf0a xS / SS) over the rendered rows, in tree order: rows carry aria-level, data-parent-index
 * (indexTreeRows) and, for entries, aria-selected / aria-current; an error row (AS) has no aria-selected. Each row gets
 * the gradients of its open ancestors that hold a selected or current row (Lx sets them on the row as
 * `--file-tree-kept-guides`). The nested rows inherit custom properties, so a row with none says `none`.
 */
export function keptGuideRows(rows) {
  const model = rows.map((row) => ({
    kind: row.hasAttribute('aria-selected') ? 'entry' : 'error',
    entry: { kept: row.getAttribute('aria-selected') === 'true' || row.hasAttribute('aria-current') },
    depth: Number(row.getAttribute('aria-level') ?? '1') - 1,
    parentIndex: row.hasAttribute('data-parent-index') ? Number(row.getAttribute('data-parent-index')) : -1,
  }));
  const kept = keptGuideFolders(model, (entry) => entry.kept);
  return model.map((_, index) => keptGuidesOfRow(model, kept, index));
}
export function applyKeptGuides(rows) {
  keptGuideRows(rows).forEach((value, index) => rows[index].style.setProperty('--file-tree-kept-guides', value ?? 'none'));
}

// cccc2cf0a My (:5655-5669): a row revealed by "Reveal in file tree" (not the follow reveal of the open file)
// scrolls into view and carries data-highlighted for 1200ms, once per reveal.
export const REVEAL_FLASH_MS = 1200;

// cccc2cf0a oy (:4978-4991) with c82eca2bd M (:46-62): Enter that opened a file from the tree hands focus to the
// file once Enter is released, unless focus moved somewhere other than the tree (or the body) by then. The
// listener is one-shot (keyup Enter, capture) and is dropped when the window loses focus.
export function onEnterReleased(tree, callback) {
  const document = tree?.ownerDocument, view = document?.defaultView;
  if (!view) return () => {};
  const controller = new AbortController();
  view.addEventListener("keyup", (event) => {
    if (event.key !== "Enter") return;
    controller.abort();
    const active = document.activeElement;
    if (!active || active === document.body || tree.contains(active)) callback();
  }, { capture: true, signal: controller.signal });
  view.addEventListener("blur", () => controller.abort(), { signal: controller.signal });
  return () => controller.abort();
}

// cccc2cf0a Db Oe (:7077) + c51596d2b ye/be (:84-150, the epitaxy_files_tree_nux NUX item pb :6300): the
// one-time "Browse the project beside your file" coachmark under the tree toggle shows while a file is open
// beside a hidden tree that can fit, outside pop-out windows, until it is accepted, closed or the tree is
// toggled any other way (c51596d2b Z: z(V) for every via except "coachmark").
export const FILE_TREE_NUX_ID = "epitaxy_files_tree_nux";
const NUX_STORAGE_KEY = `code-desktop-nux:${FILE_TREE_NUX_ID}`;
export function fileTreeCoachmarkEligible({ toggleShown, hasFile, canFit, treeVisible, popout = false }) {
  return !!toggleShown && !!hasFile && !!canFit && !treeVisible && !popout;
}
// shared-5 Sy (the NUX queue provider): no NUX shows during onboarding, nor while the account is under a day old
// (yy=864e5, measured from when the provider mounted; an account without created_at counts as new). Locally the
// account is the profile: config.activity.startedAt, stamped on the profile's first launch.
export const NUX_ACCOUNT_MIN_AGE_MS = 864e5;
export function nuxAccountAged(createdAt, now = Date.now()) {
  const created = typeof createdAt === "number" ? createdAt : Date.parse(createdAt ?? "");
  return Number.isFinite(created) && now - created >= NUX_ACCOUNT_MIN_AGE_MS;
}
export function fileTreeNuxDismissed(storage = globalThis.localStorage) {
  try { return storage?.getItem(NUX_STORAGE_KEY) != null; } catch { return false; }
}
export function dismissFileTreeNux(outcome = "closed", storage = globalThis.localStorage) {
  try { storage?.setItem(NUX_STORAGE_KEY, String(outcome)); } catch { /* optional preference */ }
}
