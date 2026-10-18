import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { parseUnifiedDiff } from "./diff-model";
import { previewHunks } from './file-preview-model.mjs';
import { useDiffHunk } from './use-diff-hunk.mjs';
import { SourceHighlightedLine } from './source-diff-code.jsx';
import { splitDiffRows, observeDiffSplitFit } from './diff-view-model.mjs';
import { diffSeparators } from './diff-separator-model.mjs';
import { contextRegions, expandContext, visibleContext } from './diff-context-model.mjs';
import { absoluteDiffPath, headerTooltip, pathParts, renamedFrom, renamedFromDisplay, rowLabels, splitPosixPath } from './diff-file-header-model.mjs';
import { changedFileMenu } from './file-context-menu-model.mjs';
import { fileKindIcon } from './file-kind-icon.mjs';
import { SourceTooltip, SourceTooltipGroup } from './source-tooltip';
import { SourceMenu } from './source-menu.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from './menu-model.mjs';
import { hideWhitespaceChanges } from './diff-whitespace-model.mjs';
import { subscribeDiffReveal, takeDiffReveal } from './diff-reveal.mjs';
import { useSourcePointerResize } from './use-pointer-resize.js';
import { DIFF_FILE_LIST_LABELS, DIFF_FILE_LIST_WIDTH, clampDiffFileListWidth, diffFileEntries, diffFileList, diffFileListCanFit, diffFileListLimit,
  isLargeDiff, withComparisonFiles, withRawFiles, createPatchFetchQueue, kindSectionOpen, openKindSections, orderDiffSections, revealCollapsed, toggleCollapsed, treeRowTarget } from './diff-file-list-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import { diffFileCommentsStore, rowCommentTarget } from './diff-comments-model.mjs';
import { useDiffComments } from './source-diff-comments.jsx';
import { SourceDiffCommits } from './source-diff-commits.jsx';
import { sameFindingFile } from './review-findings-model.mjs';
import { SourceReviewFindingCard } from './source-pane-review.jsx';
import { SourceDialog } from './source-dialog.jsx';
import { dataUrlByteSize, diffImageButtonShown, diffImageViewer, fetchDiffFileImages, formatImageBytes } from './diff-image-model.mjs';
import { diffChangeCommand, diffChangeHeaderOffset, diffChangeTargets, pickDiffChange } from './diff-change-nav-model.mjs';
// R3-files FT-07: the Changed files tree on its 2.42304.0 originals (c44d00c7f Rc / zc / Ec / Fc over ca7840910, the Jr
// tooltip, kc expansion; c784da984 path forms) and the per-file whitespace pause (c44d00c7f Ca).
import { CdsIcon } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { FileTypeIcon } from './generated/files-changes/file-type-icon.mjs';
import { fileTreeCompactRow, fileTreeGroup, fileTreeKeptGuides, fileTreePadding, fileTreeRowCurrent, fileTreeRowIdle } from './generated/files-changes/file-tree-row-classes.mjs';
import { fileTreeIconSize, fileTreeRowStyle, guideGradient, treeIndent } from './generated/code-current/file-tree-style.mjs';
import { revealExpandedSubtree } from './generated/files-changes/diff-tree-expand.mjs';
import { DiffTreeRowTooltip } from './generated/files-changes/diff-tree-tooltip.mjs';
import { PathSegments as TreePathSegments, NameThenFolder } from './generated/files-changes/path-segments.mjs';
import { whitespaceHidingPaused } from './generated/files-changes/diff-whitespace-pause.mjs';
import "./source-diff.css";

// Tn (panes-diff-view-current.js:377-401) with hideWhitespace: gn filters the
// file's own patch; a re-indent-only file keeps its row (counts stay the file's
// real +/-) with whitespaceOnly:true and no body ('Whitespace only' row label),
// otherwise the hunks come from the filtered patch. Parser fallbacks and files
// without hunks are left as they are.
export function withoutWhitespaceChanges(section) {
  if (section?.type !== "file" || section.fallbackReason || !section.hunks?.length || typeof section.raw !== "string") return section;
  const filtered = hideWhitespaceChanges(section.raw);
  if (filtered.whitespaceOnly) return { ...section, hunks: [], whitespaceOnly: true };
  const reparsed = parseUnifiedDiff(filtered.patch).files[0];
  if (!reparsed || reparsed.fallbackReason || !reparsed.hunks.length) return section;
  return { ...section, hunks: reparsed.hunks };
}
// One filtered copy per parsed section, so only a file whose pause flips gets a new section object (and re-renders).
const whitespaceHiddenSections = new WeakMap();
function whitespaceHidden(section) {
  if (!section || typeof section !== 'object') return section;
  if (!whitespaceHiddenSections.has(section)) whitespaceHiddenSections.set(section, withoutWhitespaceChanges(section));
  return whitespaceHiddenSections.get(section);
}

// R3-files FT-07 (diffgit-11): the host's inputs to c44d00c7f Ca for one file — its Changes line comments
// (diff-comments-model: a saved one is an annotation, an open or unsaved one a draft; none comes from the Files pane, the
// only source "file") and its review findings. OpenClaude has no PR review comments.
const NO_PR_COMMENTS = Object.freeze([]);
const NO_FINDINGS = Object.freeze([]);
export function whitespacePauseInputs(entries, findings = NO_FINDINGS) {
  const annotations = [], drafts = {};
  for (const entry of entries ?? []) {
    if (entry.savedBody !== undefined) annotations.push(entry);
    else drafts[entry.id] = entry;
  }
  return { annotations, prComments: NO_PR_COMMENTS, findings, drafts };
}
// The files of the patch whose whitespace changes stay shown: Ca over each file's comment store (the stores
// useDiffComments renders the cards from) and its findings. The store snapshot is the list of files whose comments
// alone pause, so typing into a card does not re-render the diff.
const NO_PAUSE = new Set();
function useWhitespacePausedFiles({ parsed, active, commentScope, findings }) {
  const paths = useMemo(() => (active ? parsed.sections.filter((section) => section.type === 'file' && section.path && !section.fallbackReason)
    .map((section) => section.path) : []), [parsed, active]);
  const stores = useMemo(() => (commentScope ? paths.map((path) => [path, diffFileCommentsStore(commentScope, path)]) : []), [commentScope, paths]);
  const subscribe = useCallback((listener) => {
    const offs = stores.map(([, store]) => store.subscribe(listener));
    return () => { for (const off of offs) off(); };
  }, [stores]);
  const commented = useCallback(() => stores.filter(([, store]) => whitespaceHidingPaused(whitespacePauseInputs(store.getSnapshot().entries)))
    .map(([path]) => path).join('\0'), [stores]);
  const key = useSyncExternalStore(subscribe, commented, commented);
  return useMemo(() => {
    if (!paths.length) return NO_PAUSE;
    const byPath = new Map(stores), paused = new Set();
    for (const path of paths) {
      const fileFindings = (findings ?? []).filter((entry) => sameFindingFile(path, entry.file));
      if (whitespaceHidingPaused(whitespacePauseInputs(byPath.get(path)?.getSnapshot().entries, fileFindings.length ? fileFindings : NO_FINDINGS))) paused.add(path);
    }
    return paused.size ? paused : NO_PAUSE;
  }, [paths, stores, findings, key]); // eslint-disable-line react-hooks/exhaustive-deps
}

function RawPatch({ value, reason }) {
  // Preserve unsupported patch text and classify only visible +/- syntax.
  // There are deliberately no line-number columns or fabricated file counts.
  const chunks = value.length <= 4 * 1024 * 1024 ? value.match(/[^\n]*\n|[^\n]+$/g) || [] : null;
  const lines = chunks?.length <= 50000 ? chunks : null;
  return <div className="sdiff-raw">
    {reason && <div className="sdiff-notice">{t('{reason}. Showing original patch.', { reason })}</div>}
    <pre className="sdiff-raw-code">{lines ? lines.map((line, index) => <code key={index}
      className={line.startsWith("+") && !line.startsWith("+++") ? "added" : line.startsWith("-") && !line.startsWith("---") ? "removed" : ""}>{line}</code>) : value}</pre>
  </div>;
}

// Inline placement only (approval FileChanges); the Changes placement uses the
// c219730b0 W row labels from diff-file-header-model.mjs instead.
function metadata(file) {
  const labels = [];
  if (file.binary) labels.push(t("Binary file"));
  if (file.renamedFrom && file.renamedFrom !== file.path) labels.push(t("Renamed from {path}", { path: file.renamedFrom }));
  if (file.copiedFrom) labels.push(t("Copied from {path}", { path: file.copiedFrom }));
  if (file.status === "added") labels.push(t("New file"));
  if (file.status === "deleted") labels.push(t("Deleted file"));
  if (file.oldMode && file.newMode && file.oldMode !== file.newMode) {
    labels.push(file.oldMode === "100644" && file.newMode === "100755" ? t("Made executable")
      : file.oldMode === "100755" && file.newMode === "100644" ? t("No longer executable")
      : t("Mode {from} → {to}", { from: file.oldMode, to: file.newMode }));
  } else if (file.newMode && file.status === "added") labels.push(t("Mode {mode}", { mode: file.newMode }));
  else if (file.oldMode && file.status === "deleted") labels.push(t("Mode {mode}", { mode: file.oldMode }));
  return labels;
}

function DiffLine({ row, lines, wordRanges, side, onComment = null, rowTargets = false }) {
  if (!row) return <div className="sdiff-split-side sdiff-split-empty" aria-hidden="true"/>;
  const number = side === 'before' ? row.oldLine : row.newLine ?? row.oldLine;
  // c44d00c7f Ca (2925-2943): a hover-revealed accent "+" in the gutter opens the inline comment card for the line
  // (Ho hoverAdd); dragging over line numbers picks a range (source-diff-comments.jsx). The row says which side and
  // line it comments on (removed rows and the split view's left column: the old file).
  // rowTargets: the body context menu (yo uo) reads the row's side/line/text even where comments are off.
  const target = onComment || rowTargets ? rowCommentTarget(row, side || 'unified') : null;
  return <div className={`sdiff-row ${row.type}${side ? ' sdiff-split-side' : ''}`} data-kind={row.type} data-side={side} data-old-line={row.oldLine ?? undefined} data-new-line={row.newLine ?? undefined} data-commentable={target && onComment ? '' : undefined}
    data-comment-side={target?.side} data-comment-line={target?.line} data-column={target ? side || 'unified' : undefined}>
    {target && onComment && <button type="button" className="sdiff-gutter-add" aria-label={t("Add comment on this line")}
      onClick={() => onComment(target)}><Icon name="Add" size={16} weight="strong"/></button>}
    <div className="sdiff-line-number" aria-hidden="true">{number}</div>
    <div className="sdiff-code-cell"><span className="sdiff-marker" aria-hidden="true">{row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}</span>
      <code className="sdiff-line-content scb-code source-diff-code"><SourceHighlightedLine tokens={lines[row.side]?.[row.line] || [{ text: row.text }]} ranges={wordRanges?.[row.rowIndex]}/></code>
      {row.notes?.map((text, index) => <div className="sdiff-note" data-no-newline="" key={index}><span>{t('No newline at end of file')}</span></div>)}
    </div>
  </div>;
}
// @pierre/diffs Vt (ca7ba268c): the "\ No newline at end of file" marker is metadata on the line before it, drawn as
// a row of its own: an empty gutter cell, then the words without the backslash, on that line's change colour.
function NoNewline({ after }) {
  const type = after?.type === 'added' || after?.type === 'removed' ? after.type : 'context';
  return <div className={`sdiff-row sdiff-no-newline ${type}`} data-no-newline="" data-line-type={type === 'added' ? 'change-addition' : type === 'removed' ? 'change-deletion' : 'context'}>
    <div className="sdiff-line-number" aria-hidden="true"/>
    <div className="sdiff-code-cell"><span className="sdiff-no-newline-text">{t('No newline at end of file')}</span></div>
  </div>;
}
function DiffHunk({ hunk, file, scopeKey, layout, separator, wordDiff = true, onComment = null, rowTargets = false, renderAfter = null }) {
  const ref = useRef(null);
  const fragment = useMemo(() => previewHunks(hunk.rows)[0] || { rows: [], before: '', after: '' }, [hunk.rows]);
  const split = useMemo(() => splitDiffRows(fragment.rows), [fragment.rows]);
  const { lines, wordRanges, highlighted } = useDiffHunk({ hunk: fragment, beforePath: file.oldPath || file.path, afterPath: file.newPath || file.path, scopeKey, wordDiff }, ref);
  return <div className="sdiff-hunk" ref={ref} data-highlighted={highlighted ? '' : undefined} data-word-diff={wordRanges ? '' : undefined}>
    {separator && <div className="sdiff-hunk-separator" data-separator={separator.kind}
      data-separator-first={separator.first || undefined} title={hunk.header}>
      <div className="sdiff-separator-content"><span>{separator.text}</span></div>
    </div>}
    {layout === 'split' ? split.map((pair, index) => <React.Fragment key={index}><div className="sdiff-split-row">
      <DiffLine row={pair.before} side="before" lines={lines} wordRanges={wordRanges} onComment={onComment} rowTargets={rowTargets}/><DiffLine row={pair.after} side="after" lines={lines} wordRanges={wordRanges} onComment={onComment} rowTargets={rowTargets}/>
    </div>{renderAfter?.([rowCommentTarget(pair.before, 'before'), rowCommentTarget(pair.after, 'after')])}</React.Fragment>) : fragment.rows.map((row, index) => row.type === 'note'
      ? <NoNewline key={index} after={fragment.rows[index - 1]}/>
      : <React.Fragment key={index}><DiffLine row={{ ...row, rowIndex: index }} lines={lines} wordRanges={wordRanges} onComment={onComment} rowTargets={rowTargets}/>{renderAfter?.([row.type === 'context' ? rowCommentTarget(row, 'before') : null, rowCommentTarget(row, 'unified')])}</React.Fragment>)}
  </div>;
}

// Static 16px symbol geometry from c64baa838; independently implemented
// controls below use native buttons so expansion is also keyboard accessible.
function ExpandIcon({ direction }) {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor" data-expand-direction={direction}>
    <path d={direction === 'both'
      ? 'M11.47 9.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94zM7.526 1.418a.75.75 0 0 1 1.004.052l4 4a.75.75 0 1 1-1.06 1.06L8 3.06 4.53 6.53a.75.75 0 1 1-1.06-1.06l4-4z'
      : 'M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06'}/>
  </svg>;
}

function ContextGap({ region, onExpand }) {
  const directions = region.chunked ? [...(region.first ? [] : ['up']), ...(region.last ? [] : ['down'])]
    : [region.first ? 'down' : region.last ? 'up' : 'both'];
  return <div className="sdiff-hunk-separator sdiff-context-gap" data-separator="line-info" data-expand-index={region.id}
    data-separator-first={region.first || undefined} data-separator-last={region.last || undefined}>
    <div className="sdiff-separator-wrapper" data-multi-button={directions.length > 1 || undefined}>
      {directions.map(direction => <button key={direction} type="button" className="sdiff-expand" data-direction={direction}
        aria-label={region.remaining <= 100 ? t('Expand {count} unmodified lines', { count: region.remaining }) : direction === 'both' ? t('Expand 100 lines in both directions') : direction === 'up' ? t('Expand 100 lines below previous change') : t('Expand 100 lines above next change')}
        onClick={event => onExpand(region, direction, event.currentTarget)}><ExpandIcon direction={direction}/></button>)}
      <button type="button" className="sdiff-separator-content" title={t("Expand unmodified lines")}
        onClick={event => onExpand(region, 'both', event.currentTarget)}><span>{tn(region.remaining, '{count} unmodified line', '{count} unmodified lines')}</span></button>
    </div>
  </div>;
}

// c219730b0 He: the 16px chevron path (rotated -90deg while collapsed).
const CHEVRON = 'M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06';
// c219730b0 Ue: row label class.
const ROW_LABEL_CLASS = 'min-w-0 shrink-[9999] truncate text-body text-muted';

// c784da984 c: directory prefix (truncating) then the last segment; title
// defaults to the path and "" suppresses it; aria-label only with a prefix.
function PathSegments({ path, title = path }) {
  const [directory, base] = splitPosixPath(path);
  return <span dir="ltr" className="flex min-w-0 overflow-hidden whitespace-nowrap" title={title || undefined} aria-label={directory ? path : undefined}>
    {directory && <span className="min-w-0 truncate">{directory}</span>}
    <span className={directory ? 'max-w-full shrink-0 truncate' : 'min-w-0 truncate'}>{base}</span>
  </span>;
}

// c784da984 p (We passes title "", posix): basename first, then the directory as
// footnote muted text that fades out (data-clipped) once its box is narrower
// than min(dir + last, min(last, 5em) + 1em) - the d() ResizeObserver measure.
function DiffPathLabel({ path }) {
  const { base, directory } = pathParts(path);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current, view = node?.ownerDocument.defaultView;
    if (!node || typeof view?.ResizeObserver !== 'function') return undefined;
    const observer = new view.ResizeObserver(entries => {
      for (const entry of entries) {
        const size = parseFloat(view.getComputedStyle(node).fontSize) || 0, parts = node.firstElementChild?.children;
        const last = parts?.length ? (parts[parts.length - 1]?.scrollWidth ?? 0) : 0;
        const first = parts && parts.length > 1 ? (parts[0]?.scrollWidth ?? 0) : 0;
        const need = Math.min(first + last, Math.min(last, 5 * size) + (first > 0 ? size : 0));
        node.toggleAttribute('data-clipped', entry.contentRect.width < need - 1);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [directory]);
  return <span dir="ltr" className="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap">
    <span className="max-w-full shrink-0 truncate">{base}</span>
    {directory && <span ref={ref} className="sdiff-path-directory flex min-w-0 text-footnote text-muted data-[clipped]:opacity-0">
      <PathSegments path={directory} title="" />
    </span>}
  </span>;
}

// c219730b0 Ke: "Renamed from {path}" with the c784da984 c path whose title is
// the full previous path (the only native title the source header carries).
function RenamedFrom({ path, previous }) {
  return <span className="sdiff-renamed flex min-w-0 shrink-[9999] items-baseline gap-1 overflow-hidden whitespace-nowrap text-body text-muted">
    <span className="min-w-0 truncate">{t('Renamed from')} </span>
    <span className="flex min-w-0 shrink-[9999]"><PathSegments path={renamedFromDisplay(path, previous)} title={previous} /></span>
  </span>;
}

// c219730b0 Gt + c856385e2 tn as menu items; submenus are c3e58cab4 p / tn SubmenuPopup (side right, align start,
// sideOffset -4).
function ChangedFileMenuEntries({ entries, onSelect }) {
  return (entries ?? []).map((entry, index) => entry.kind === 'separator' ? <SourceMenu.Separator key={`separator-${index}`} />
    : entry.kind === 'submenu' ? <SourceMenu.Submenu key={`submenu-${entry.label}`}>
      <SourceMenu.SubmenuTrigger>{entry.label}</SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={entry.label} side="right" align="start" sideOffset={-4}>
        <ChangedFileMenuEntries entries={entry.items} onSelect={onSelect} />
      </SourceMenu.Popup>
    </SourceMenu.Submenu>
    : <SourceMenu.Item key={`${entry.action}-${index}`} onClick={() => onSelect(entry)}>{entry.label}</SourceMenu.Item>);
}
// The menu for a Changes path (relative to actions.root). removed (a deleted file): no Attach, Open file, Open in or
// Show in Finder, whose targets no longer exist (aa :3469 n.removed; yc renderFileMenuItems e.removed). directory (a
// Changed files folder row, vc): no Open file; Attach takes the folder (a folder chip). Show in Finder only inside
// actions.revealRoot, the folder the reveal IPC is scoped to.
function changedFileEntries(actions, path, { removed = false, directory = false } = {}) {
  const absolute = absoluteDiffPath(actions?.root, path);
  const root = typeof actions?.revealRoot === 'string' ? actions.revealRoot.replace(/\/+$/, '') : '';
  return changedFileMenu({ root: actions?.root, path,
    canAttach: !removed && (directory ? !!actions?.onAttachFiles : !!actions?.onAttachFile),
    canOpenFile: !removed && !directory && !!actions?.onOpenFile,
    editors: !removed && actions?.onOpenInEditor ? actions.editors : [],
    canShowInFinder: !removed && !!actions?.onRevealFile && !!absolute && !!root && (absolute === root || absolute.startsWith(`${root}/`)) });
}
function runChangedFileAction(actions, entry, { directory = false } = {}) {
  if (entry.action === 'attach') {
    if (!directory) { actions?.onAttachFile?.(entry.value); return; }
    const absolute = absoluteDiffPath(actions?.root, entry.value);
    if (absolute) actions?.onAttachFiles?.([absolute], [absolute]);
  } else if (entry.action === 'copy') actions?.onCopy?.(entry.value);
  else if (entry.action === 'open-file') actions?.onOpenFile?.(entry.value);
  else if (entry.action === 'open-in-editor') actions?.onOpenInEditor?.(entry.value, entry.editor);
  else if (entry.action === 'show-in-finder') actions?.onRevealFile?.(entry.value);
}

/* Changes placement header: panes-diff-view-current.js:3700-3774 aa over
   c219730b0 We (content), Ze (Open file) and $e (context menu). The trigger
   div carries group/diff-file; hover/focus-within reveal is local CSS
   (source-diff.css) because pointer-coarse:opacity-100 is not in the loaded
   utility copy. hasBody (:3279 meta !== null && hunks.length > 0): a file with
   no text hunks (pure rename, empty new/deleted file, mode-only or binary change)
   gets the aa no-body button - aria-disabled, no aria-expanded, no onClick - and
   We's disabled chevron (opacity-40, collapsed rotation); it renders no body.
   Local adaptations: a toggle with a body keeps aria-controls, a parser fallback
   file (source meta === null) keeps its toggle because the local body shows the
   original patch text instead of hiding it, the
   context menu opens from the contextmenu event (right click, Shift+F10 or the
   Menu key on the focused toggle). The menu is c219730b0 Gt (changedFileMenu):
   Open file is followed by renderFileMenuItems (cccc2cf0a Ad = c856385e2 cn/rn/tn):
   Open in ▸ the installed editors (main.cjs installed-editors, open-in-editor) and
   Show in Finder (the session-scoped reveal-tool-file IPC, only inside the session
   folder). 'Attach as context' (c856385e2 Hn attachFileToChat) uses the composer's real
   path-referenced file attachment (main.jsx attachDiffFile -> stageFiles ->
   mention); it is withheld for deleted files, whose path no longer exists. */
function ChangesFileHeader({ file, path, expanded, hasBody, bodyId, onToggle, actions, imageViewer = null }) {
  const headerRef = useRef(null), toggleRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const real = !!file.path, deleted = file.status === 'deleted';
  // 3469: onOpenFile is withheld for removed files (n.removed ? void 0 : It).
  const onOpenFile = real && !deleted && actions?.onOpenFile ? actions.onOpenFile : undefined;
  const onCopy = real && actions?.onCopy ? actions.onCopy : undefined;
  const previous = renamedFrom(file), labels = rowLabels(file);
  // We renders +{additions} / −{deletions} unconditionally (aa passes them for
  // binary files too; a binary patch has 0/0 text lines). Only a parser fallback
  // file is without counts: diff-model sets added/removed to null (unknown), and
  // a number there would be invented.
  const counts = Number.isFinite(file.added) && Number.isFinite(file.removed);
  const open = hasBody && expanded;
  // c3e58cab4 f: control characters stripped (changedFileMenu); the toast follows a written copy.
  const entries = menu && onCopy ? changedFileEntries(actions, file.path, { removed: deleted }) : null;
  // B34 c44d00c7f Ia/La (Es :5246, :5283): an image file without a text body gets 'View image' (only where the
  // comparison can read images, Aa), left of Open file; the toggle reserves its w-control slot (tn reserveImageAction).
  const imageAction = !!imageViewer && real && diffImageButtonShown(file.path, hasBody);
  return <div ref={headerRef} className="sdiff-header group/diff-file relative" data-diff-file-header=""
    onContextMenu={onCopy ? (event) => { event.preventDefault(); event.stopPropagation(); setMenu({ x: event.clientX, y: event.clientY }); } : undefined}>
    {/* aa :3717-3723: onClick/aria-expanded only with a body, else aria-disabled. */}
    <button ref={toggleRef} type="button" className="sdiff-file-toggle aria-disabled:cursor-default" aria-disabled={hasBody ? undefined : true}
      aria-expanded={hasBody ? expanded : undefined} aria-controls={hasBody ? bodyId : undefined} onClick={hasBody ? onToggle : undefined}>
      <span aria-hidden="true" className={`sdiff-chevron flex items-center justify-center size-[16px] shrink-0 text-muted${hasBody ? '' : ' opacity-40'}`}>
        <svg width={16} height={16} viewBox="0 0 16 16"
          className={`transition-transform duration-fast motion-reduce:transition-none${open ? '' : ' -rotate-90'}`}>
          <path d={CHEVRON} fill="currentColor" />
        </svg>
      </span>
      <Icon name={fileKindIcon(path.slice(path.lastIndexOf('/') + 1))} size={12} className="sdiff-file-kind shrink-0 text-muted" />
      <SourceTooltip content={headerTooltip(file, path)} delay={150} multiline side="bottom" hoverable={false}>
        <span className="sdiff-path flex min-w-0 text-body text-secondary"><DiffPathLabel path={path} /></span>
      </SourceTooltip>
      {previous !== undefined && <RenamedFrom path={path} previous={previous} />}
      {labels.map((label) => <span key={label.row} className={`sdiff-row-label ${ROW_LABEL_CLASS}`}>{label.row}</span>)}
      {counts && <span className="sdiff-counts flex shrink-0 items-center gap-0.5 text-body tabular-nums">
        <span className="text-git-added">{`+${file.added}`}</span><span className="text-git-removed">{`−${file.removed}`}</span>
      </span>}
      {onOpenFile && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
      {imageAction && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
    </button>
    {imageAction && <span className="sdiff-view-image pointer-events-none absolute inset-y-0 right-0 flex items-center gap-xs pr-md">
      <span className="pointer-events-auto flex">
        <SourceTooltip content={t("View image")} side="bottom" hoverable={false} disabledReason={imageViewer.stale ? t("Loading the new changes") : undefined}>
          <SourceSettingsButton size="xs" variant="ghost" icon="Image" iconSize="auto-sm" iconOnly aria-label={t("View image")}
            disabled={!!imageViewer.stale} onClick={() => imageViewer.open(file.path)} />
        </SourceTooltip>
      </span>
      {onOpenFile && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
    </span>}
    {onOpenFile && <span className="sdiff-open-file absolute inset-y-0 right-0 flex items-center pr-md opacity-0 transition-opacity motion-reduce:transition-none group-hover/diff-file:opacity-100 group-focus-within/diff-file:opacity-100 pointer-coarse:opacity-100">
      <SourceTooltip content={t("Open file")} side="bottom" hoverable={false}>
        <SourceSettingsButton size="xs" variant="ghost" icon="ArrowUpRight" iconSize="auto-sm" iconOnly aria-label={t("Open file")} onClick={() => onOpenFile(file.path)} />
      </SourceTooltip>
    </span>}
    {menu && <SourceMenu.Popup anchor={headerRef.current} trigger={toggleRef.current} point={menu} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard="always"
      label={t("{path} actions", { path })} onClose={() => setMenu(null)}>
      <ChangedFileMenuEntries entries={entries} onSelect={(entry) => runChangedFileAction(actions, entry)} />
    </SourceMenu.Popup>}
  </div>;
}

function FileDiff({ file, scopeKey, layout, completeContext, foldAll = null, placement = "inline", fileActions = null, wordDiff = true, defaultExpanded = true, reveal = null, review = null, commentScope = null, imageViewer = null, lazyPatch = null }) {
  // vo defaultCollapsed (panes-diff-view-current.js:5258-5276, :5647): a large
  // diff (Qe) mounts every file collapsed.
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Selecting the file in the Changed files column (scrollToAnnotation -> Xt/Zt,
  // :5346-5381) expands it; a request seen at mount is not replayed.
  const appliedReveal = useRef(reveal?.seq);
  useLayoutEffect(() => {
    if (!reveal || appliedReveal.current === reveal.seq) return;
    appliedReveal.current = reveal.seq;
    if (reveal.path === file.path) setExpanded(true);
  }, [reveal, file.path]);
  // Collapse/Expand all files (fh diff-fold, panes-tile-current.js:3775-3809 ->
  // requestDiffFoldAll {collapsed, seq}, panes-state-current.js:2809-2821): a new
  // seq folds every rendered file once; the source consumes the request
  // (consumeDiffFoldAll), so files mounted later keep the default and manual
  // toggles afterwards still work.
  const appliedFold = useRef(foldAll?.seq);
  useEffect(() => {
    if (!foldAll || appliedFold.current === foldAll.seq) return;
    appliedFold.current = foldAll.seq;
    setExpanded(!foldAll.collapsed);
  }, [foldAll]);
  const [copyState, setCopyState] = useState("");
  const [contextState, setContextState] = useState(null);
  const fileRef = useRef(null), expansionFocus = useRef(null);
  const regions = useMemo(() => contextRegions(file, completeContext), [file, completeContext]);
  const context = useMemo(() => regions && visibleContext(regions, contextState?.file === file ? contextState.expanded : {}), [regions, file, contextState]);
  const expand = (region, direction, target) => {
    if (target.ownerDocument.activeElement === target) expansionFocus.current = target;
    setContextState(previous => ({ file, expanded: expandContext(previous?.file === file ? previous.expanded : {}, region, direction) }));
  };
  useLayoutEffect(() => {
    const target = expansionFocus.current;
    if (target && !target.isConnected) fileRef.current?.querySelector('.sdiff-file-body')?.focus({ preventScroll: true });
    expansionFocus.current = null;
  }, [context]);
  const bodyId = useId();
  const changes = placement === "changes";
  const path = file.path || t("Patch");
  // B14: Changes-pane line comments as inline annotation cards (c44d00c7f ha/ga/Ca/Ho/yo, source-diff-comments.jsx),
  // kept per session and file (commentScope) and sent with the next message.
  const bodyRef = useRef(null);
  const shownHunks = useMemo(() => (context ? context.filter((region) => region.kind !== 'gap') : file.hunks), [context, file.hunks]);
  const comments = useDiffComments({ file, scope: changes ? commentScope : null, menu: changes, shownHunks, complete: !!regions, path, fileActions, bodyRef });
  // panes-diff-view-current.js:3279 hasBody; a fallback file's body is its raw patch. R4i-files FI2: c44d00c7f ml
  // `Y=q!==null&&q.hunks.length>0||J` with J = Ee&&!whitespaceOnly, Ee = Ko(file, fetchFilePatch)&&!patchUnavailable: a
  // withheld file whose patch can still be read is expandable, and expanding it reads the patch (Qo, enabled:!be).
  const pending = !!lazyPatch?.pending;
  const hasBody = !changes || !!file.fallbackReason || file.hunks.length > 0 || pending;
  useEffect(() => { if (expanded && pending) lazyPatch.load(); }, [expanded, pending, lazyPatch]);
  // The metadata-only body line below is reachable only in the inline placement
  // (a Changes file without hunks has no body, see hasBody).
  const labels = changes ? [] : metadata(file);
  const separators = useMemo(() => diffSeparators(file.hunks), [file.hunks]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(file.raw); setCopyState(t("Copied patch")); }
    // Catalog clipboard failure wording (en-US ugO0/irMRD), as the code-block copy.
    catch { setCopyState(t("Couldn’t copy to the clipboard. Try again.")); }
  };
  // Review findings on this file (Rn cards): under the row of the finding's end line; one whose line is not in a
  // hunk sits at the top of the body. The current finding expands its file.
  const fileFindings = useMemo(() => (review ? review.findings.filter((entry) => sameFindingFile(file.path, entry.file)) : []), [review, file.path]);
  const shownLines = useMemo(() => new Set(shownHunks.flatMap((hunk) => (hunk.rows ?? []).map((row) => row.newLine).filter(Number.isFinite))), [shownHunks]);
  const currentHere = !!review?.currentId && fileFindings.some((entry) => entry.id === review.currentId);
  useLayoutEffect(() => { if (currentHere) setExpanded(true); }, [currentHere, review?.currentSeq]);
  const findingCard = (entry) => <SourceReviewFindingCard key={entry.id} finding={entry} current={entry.id === review.currentId} status={review.statuses?.[entry.id] ?? "open"}
    onDismiss={() => review.onDismiss(entry.id)} onFix={review.onFix ? () => review.onFix(entry.id) : null} onNext={review.onNext ? () => review.onNext(entry.id) : null} />;
  // Under a row: its findings (by new-file end line), then its comment cards (old-file side first).
  const renderAfter = fileFindings.length || comments.enabled ? (anchors) => {
    const added = anchors.find((anchor) => anchor?.side === 'additions');
    const here = added ? fileFindings.filter((entry) => entry.endLine === added.line) : [];
    const cards = comments.renderCards(anchors);
    return here.length || cards ? <>{here.map(findingCard)}{cards}</> : null;
  } : null;
  const unplaced = fileFindings.filter((entry) => !shownLines.has(entry.endLine));
  const maximum = file.hunks.reduce((highest, hunk) => Math.max(highest,
    hunk.oldStart + hunk.oldCount - 1, hunk.newStart + hunk.newCount - 1), 1);
  return <section className="sdiff-file" ref={fileRef} data-file-path={file.path || undefined} data-complete-context={regions ? '' : undefined}>
    {changes ? <ChangesFileHeader file={file} path={path} expanded={expanded} hasBody={hasBody} bodyId={bodyId} onToggle={() => setExpanded((value) => !value)} actions={fileActions} imageViewer={imageViewer} />
    : <div className="sdiff-header">
      <button type="button" className="sdiff-file-toggle" aria-expanded={expanded} aria-controls={bodyId}
        title={[path, ...labels].join(" · ")} onClick={() => setExpanded((value) => !value)}>
        <Icon name="CaretDown" size={16} className={`sdiff-caret${expanded ? "" : " is-collapsed"}`} />
        <Icon name="File" size={12} className="sdiff-file-icon" />
        <div className="sdiff-path">{path}</div>
        {labels.length > 0 && <div className="sdiff-meta">{labels.join(" · ")}</div>}
        {file.hunks.length > 0 && !file.fallbackReason && <div className="sdiff-counts" aria-label={t("{added} additions, {removed} deletions", { added: file.added, removed: file.removed })}>
          <b className="sdiff-count-added">+{file.added}</b><b className="sdiff-count-removed">−{file.removed}</b>
        </div>}
      </button>
      {typeof navigator !== "undefined" && navigator.clipboard?.writeText && <button type="button" className="sdiff-copy"
        aria-label={t("Copy patch for {path}", { path })} title={copyState || t("Copy patch")} onClick={copy}>
        <Icon name={copyState === t("Copied patch") ? "Check" : "Copy"} size={12} />
      </button>}
    </div>}
    {!changes && copyState && <div className="sdiff-copy-status" role="status">{copyState}</div>}
    {expanded && hasBody && <div ref={bodyRef} id={bodyId} className="sdiff-file-body" tabIndex={-1} aria-busy={pending || undefined} style={{ "--sdiff-number-width": `${Math.max(3, String(maximum).length)}ch` }} {...comments.bodyProps}>
      {unplaced.length > 0 && unplaced.map(findingCard)}
      {comments.unplacedCards}
      {file.fallbackReason ? <RawPatch value={file.raw} reason={file.fallbackReason} />
        : context ? context.map(region => region.kind === 'gap'
          ? <ContextGap key={region.id} region={region} onExpand={expand}/>
          : <DiffHunk key={region.id} hunk={region} file={file} layout={layout} wordDiff={wordDiff} onComment={comments.onGutterAdd} rowTargets={comments.rowTargets} renderAfter={renderAfter} scopeKey={JSON.stringify([scopeKey, file.id, file.path, region.id])}/>)
        : file.hunks.length ? file.hunks.map((hunk, index) => <DiffHunk key={index} hunk={hunk} separator={separators[index]} file={file} layout={layout} wordDiff={wordDiff} onComment={comments.onGutterAdd} rowTargets={comments.rowTargets} renderAfter={renderAfter} scopeKey={JSON.stringify([scopeKey, file.id, file.path, index])}/>)
          : pending ? null : <div className="sdiff-metadata-only">{labels.join(" · ") || t("No text hunks in this patch")}</div>}
    </div>}
    {comments.overlays}
  </section>;
}

// R4i-files FI2 (diffgit-08-lazy): a withheld file (withComparisonFiles marked it lazyPatch) reads its patch through
// fileActions.fetchFilePatch({filePath, previousPath}) when it is first expanded (c44d00c7f Qo; cb61be3a2 xt calls
// getGitDiffFilePatch(cwd, mergeBase, filePath, previous_filename)), through the pane's four-slot queue. The parsed
// patch replaces the header-only section in place (the row keeps its expanded state); "" / null / a failed read / a
// patch without a file leaves the row without a body (patchUnavailable).
export function lazyPatchSection(stub, patch) {
  const unavailable = { ...stub, lazyPatch: null };
  if (typeof patch !== "string" || !patch.trim()) return unavailable;
  const parsed = parseUnifiedDiff(patch).sections.find((section) => section.type === "file");
  // Another header-only block (diff-model "No complete text hunks or change metadata") is no patch either.
  if (!parsed || (!parsed.hunks.length && (!parsed.fallbackReason || parsed.fallbackReason === "No complete text hunks or change metadata"))) return unavailable;
  return { ...parsed, id: stub.id, path: stub.path };
}
// R4i-files fix: the row is keyed by its path (the official row keeps its expansion across refreshes) and the read is
// keyed by lazyPatch.hashInput (Qo queryKey [Ft, session, path, contentHash]): when a refresh brings another hashInput
// the row reads again and keeps showing the last patch meanwhile (placeholderData for the same path); an unchanged
// hashInput re-reads on a refresh once the data is stale (staleTime: data===null ? 0 : 3e4).
export const LAZY_PATCH_STALE_MS = 30000;
export const lazyPatchHashInput = (file) => file?.lazyPatch?.hashInput ?? `${file?.added ?? 0}:${file?.removed ?? 0}`;
function LazyFileDiff({ file, fetchFilePatch, queue, now = Date.now, ...props }) {
  const [loaded, setLoaded] = useState(null);
  const request = useRef(0), requestKey = useRef(null), inflight = useRef(false), live = useRef(true);
  const fetchRef = useRef(fetchFilePatch), fileRef = useRef(file), loadedRef = useRef(null);
  fetchRef.current = fetchFilePatch; fileRef.current = file; loadedRef.current = loaded;
  const hashInput = lazyPatchHashInput(file);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const read = useCallback((key) => {
    const id = ++request.current, target = fileRef.current;
    requestKey.current = key; inflight.current = true;
    queue(() => fetchRef.current({ filePath: target.path, previousPath: target.lazyPatch?.previousPath }))
      .then((patch) => patch, () => null)
      .then((patch) => {
        if (!live.current || id !== request.current) return;
        inflight.current = false;
        setLoaded({ section: lazyPatchSection(target, patch), hashInput: key, failed: patch === null, at: now() });
      });
  }, [queue, now]);
  const load = useCallback(() => { if (!request.current) read(hashInput); }, [read, hashInput]);
  // Runs on a refresh (a new file object), never on the read's own result, so a failing read is not retried in a loop.
  useEffect(() => {
    if (!request.current) return;
    if (requestKey.current !== hashInput) { read(hashInput); return; }
    const current = loadedRef.current;
    if (current && !inflight.current && now() - current.at >= (current.failed ? 0 : LAZY_PATCH_STALE_MS)) read(hashInput);
  }, [file, hashInput, read, now]);
  const lazyPatch = useMemo(() => (loaded ? null : { pending: true, load }), [loaded, load]);
  return <FileDiff {...props} file={loaded?.section ?? file} lazyPatch={lazyPatch} />;
}

// Changed files column rows (R3-files FT-07, diffgit-03): 2.42304.0 c44d00c7f imports the compact tree's row classes from
// ca7840910 (`$e` P, `Ze` j, `Q` I, `tt` F) and its geometry (`Ye` V = 10px a level plus the guide layer, `Qe` L, `Je`
// z, `qe` E): a folder or file row is `${P} ${j} ${active ? I : F}` at V(depth), a kind section's header `${P} ${F}` at
// L(0). The classes are layered utilities; D26 put the global `button` reset into @layer base, so no unlayered
// restatement is needed any more (source-diff.css has none).
const TREE_ROW_SELECTOR = '[data-diff-tree-row]';

// Ka (panes-diff-view-current.js:4412-4424): a row unmounting with focus inside
// (its folder or section collapsed) hands focus back to the tree.
function useTreeRowFocusReturn() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (node?.contains(node.ownerDocument.activeElement)) node.closest('[role="tree"]')?.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}

// c44d00c7f Bc: footnote +N / −N; a parser fallback (unknown counts) has none (host: diff-model leaves them null).
function DiffTreeCounts({ additions, deletions }) {
  if (!Number.isFinite(additions) || !Number.isFinite(deletions)) return null;
  return <span className="flex shrink-0 items-center gap-0.5 text-footnote tabular-nums">
    <span className="text-git-added">{`+${additions}`}</span><span className="text-git-removed">{`−${deletions}`}</span>
  </span>;
}

// The row tooltip is the generated c44d00c7f Jr (diff-tree-tooltip.mjs, diffgit-05): side bottom / align start, 700 ms,
// not hoverable, lazy; it names a clipped row (Wr) or, while the pointer is on it, a nested file row (folder not in the
// row) with its folder as the detail line; a "/"-joined folder name and a file's folder split at "/" (c0fbbe82d hn) under
// the 480px cap (source-diff.css widens the host tooltip for it). Suppressed while the row's context menu is open.

// c44d00c7f Fc: the rows of an open folder (or kind section) one level down, in a `contents` wrapper that keeps the
// folder's own guide line (ca7840910 z at the folder's depth, read by the rows' j class) while one of those rows is the
// active file (diffgit-03). Nested rows inherit it; a deeper folder holding the active file sets its own.
function DiffTreeRows({ nodes, depth, ...props }) {
  const kept = nodes.some((node) => node.kind === 'file' && node.path === props.activePath) ? { '--file-tree-kept-guides': guideGradient(depth) } : undefined;
  return <div role="none" className="contents" style={kept}>
    {nodes.map((node) => <DiffTreeNode key={`${node.kind}:${node.path}`} node={node} depth={depth + 1} {...props} />)}
  </div>;
}
// c44d00c7f vc/yc L.Root + Sc (:6019-6170): a right-click on a Changed files row opens the c219730b0 Gt menu for its
// path at the pointer (ContextMenu); onOpenChange suppresses the row tooltip while it is open.
function useTreeRowMenu(rowRef, actions, path, options) {
  const [menu, setMenu] = useState(null);
  const onContextMenu = actions?.onCopy ? (event) => { event.preventDefault(); event.stopPropagation(); setMenu({ x: event.clientX, y: event.clientY }); } : undefined;
  const popup = menu && <SourceMenu.Popup anchor={rowRef.current} trigger={rowRef.current} point={menu} side="bottom" align="start"
    sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard="always"
    label={t("{path} actions", { path })} onClose={() => setMenu(null)}>
    <ChangedFileMenuEntries entries={changedFileEntries(actions, path, options)} onSelect={(entry) => runChangedFileAction(actions, entry, options)} />
  </SourceMenu.Popup>;
  return { open: !!menu, onContextMenu, popup };
}

// c44d00c7f Rc (+ Ic's dir branch): a folder row toggles its subtree; opening it scrolls the tree so the whole subtree
// shows (kc, diffgit-04). Its name is c784da984 d (a "/"-joined chain cut at the head); its menu has no Open file.
function DiffTreeFolder({ node, depth, collapsed, onToggle, actions, showDirectory: _flat, ...rest }) {
  const ref = useTreeRowFocusReturn(), nameRef = useRef(null);
  const isCollapsed = collapsed.has(node.path);
  const menu = useTreeRowMenu(ref, actions, node.path, { directory: true });
  return <>
    <DiffTreeRowTooltip name={node.name} nameRef={nameRef} suppressed={menu.open}>
      <button ref={ref} type="button" style={fileTreeRowStyle(depth)} data-diff-tree-row="" role="treeitem" tabIndex={-1} aria-level={depth + 1}
        aria-expanded={!isCollapsed} onClick={(event) => revealExpandedSubtree(event.currentTarget, isCollapsed, () => onToggle(node.path))}
        onContextMenu={menu.onContextMenu} className={`${fileTreeCompactRow} ${fileTreeKeptGuides} ${fileTreeRowIdle}`}>
        <CdsIcon name="CaretRight" size={fileTreeIconSize()} className={`shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none ${isCollapsed ? "" : "rotate-90"}`} />
        <span ref={nameRef} className="flex min-w-0"><TreePathSegments path={node.name} title="" posix /></span>
      </button>
    </DiffTreeRowTooltip>
    {menu.popup}
    {!isCollapsed && <DiffTreeRows nodes={node.children} depth={depth} collapsed={collapsed} onToggle={onToggle} actions={actions} {...rest} />}
  </>;
}

// c44d00c7f zc: the file-type icon (c280f9bbb), the name (or, in the flat list, c784da984 p: the name, then its folder in
// footnote), counts; aria-current while selected. The Jr tooltip's detail is the folder as a path (detailIsPath). The Gt
// context menu (no Open file / Open in / Show in Finder for a removed file), and draggable into the composer (onDragFile:
// the Files tree's file-context drag payload, main.jsx onDragFiles). Comment counts (Vc) have no local source. Local: a
// removed file is neither attached nor dragged.
function DiffTreeFile({ node, depth, showDirectory, activePath, onSelect, onOpenFile, actions }) {
  const ref = useTreeRowFocusReturn(), nameRef = useRef(null);
  const active = activePath === node.path;
  const directory = node.path.slice(0, -(node.name.length + 1));
  const withDirectory = showDirectory && directory !== '';
  const menu = useTreeRowMenu(ref, actions, node.path, { removed: !!node.removed });
  const absolute = actions?.onDragFiles && !node.removed ? absoluteDiffPath(actions.root, node.path) : null;
  return <>
    <DiffTreeRowTooltip name={node.name} detail={directory} detailIsPath nameRef={nameRef} detailInRow={withDirectory} suppressed={menu.open}>
      <button ref={ref} type="button" style={fileTreeRowStyle(depth)} data-diff-tree-row="" role="treeitem" tabIndex={-1} aria-level={depth + 1}
        aria-current={active || undefined} className={`${fileTreeCompactRow} ${fileTreeKeptGuides} ${active ? fileTreeRowCurrent : fileTreeRowIdle}`}
        draggable={absolute ? true : undefined} onDragStart={absolute ? (event) => actions.onDragFiles(event, [absolute], []) : undefined}
        onContextMenu={menu.onContextMenu}
        onClick={(event) => {
          // wc te: ⌘/Ctrl-click opens a file that still exists.
          if (onOpenFile && !node.removed && (event.metaKey || event.ctrlKey)) { onOpenFile(node.path); return; }
          onSelect(node.path);
        }}>
        <FileTypeIcon fileName={node.name} size={fileTreeIconSize()} className="shrink-0 text-muted-control" />
        {withDirectory
          ? <span ref={nameRef} className="flex min-w-0 flex-1"><NameThenFolder path={node.path} title="" posix /></span>
          : <span ref={nameRef} className="truncate min-w-0 flex-1">{node.name}</span>}
        <DiffTreeCounts additions={node.additions} deletions={node.deletions} />
      </button>
    </DiffTreeRowTooltip>
    {menu.popup}
  </>;
}

// qa (:4425-4466)
function DiffTreeNode({ node, ...props }) {
  return node.kind === 'dir' ? <DiffTreeFolder node={node} {...props} /> : <DiffTreeFile node={node} {...props} />;
}

// Ga (:4334-4411): roving focus over the visible rows.
function diffTreeKeyDown(event) {
  const tree = event.currentTarget;
  if (!tree.contains(event.target) || (event.altKey && event.key !== 'Tab') || ((event.metaKey || event.ctrlKey) && event.key !== 'Enter')) return;
  const rows = [...tree.querySelectorAll(TREE_ROW_SELECTOR)];
  if (rows.length === 0) return;
  const focused = tree.ownerDocument.activeElement;
  const index = rows.findIndex((row) => row === focused || row.contains(focused));
  const row = index >= 0 ? rows[index] : null;
  const focusRow = (target) => {
    const next = rows[target];
    if (!next) return;
    event.preventDefault();
    next.focus();
    next.scrollIntoView?.({ block: 'nearest' });
  };
  const target = treeRowTarget(event.key, { index, count: rows.length, currentIndex: rows.findIndex((entry) => entry.hasAttribute('aria-current')) });
  if (target !== null) { focusRow(target); return; }
  if (event.key === 'Tab') { if (event.shiftKey && row) tree.focus({ preventScroll: true }); return; }
  if (event.key === 'ArrowRight') {
    if (!row) return;
    event.preventDefault();
    const expanded = row.getAttribute('aria-expanded');
    if (expanded === 'false') row.click(); else if (expanded === 'true') focusRow(index + 1);
    return;
  }
  if (event.key === 'ArrowLeft') {
    if (!row) return;
    event.preventDefault();
    if (row.getAttribute('aria-expanded') === 'true') { row.click(); return; }
    const level = Number(row.getAttribute('aria-level') ?? '1');
    for (let at = index - 1; at >= 0; at--) if (Number(rows[at].getAttribute('aria-level') ?? '1') < level) { focusRow(at); return; }
    return;
  }
  if (event.key === 'Enter' && row && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
    event.preventDefault();
    const view = tree.ownerDocument.defaultView ?? window;
    row.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true, metaKey: event.metaKey, ctrlKey: event.ctrlKey }));
  }
}
// Wa (:4320-4333): keyboard focus landing on the tree moves to the selected (else first) row.
function diffTreeFocus(event) {
  const tree = event.currentTarget;
  if (event.target !== tree || tree.contains(event.relatedTarget)) return;
  let visible = false;
  try { visible = tree.matches(':focus-visible'); } catch { visible = false; }
  if (!visible) return;
  const row = tree.querySelector(`${TREE_ROW_SELECTOR}[aria-current]`) ?? tree.querySelector(TREE_ROW_SELECTOR);
  row?.focus();
  row?.scrollIntoView?.({ block: 'nearest' });
}

// Ra + Ba (:4096-4300): "Changed files" tree; folders (or the flat list) first,
// then the separated Test / Build / Generated sections when grouping by kind.
function DiffFileTree({ list, tree, activePath, onSelect, onOpenFile, actions = null }) {
  const ref = useRef(null);
  // Pa/La: collapsed folders per scope ("source" or a kind), all open by default.
  const [collapsed, setCollapsed] = useState(() => ({}));
  // Ia: kind sections open only while they hold the selected file until toggled.
  const [sectionsOpen, setSectionsOpen] = useState(() => ({}));
  useLayoutEffect(() => {
    if (activePath === null) return;
    setCollapsed((previous) => {
      let changed = false;
      const next = {};
      for (const [scope, set] of Object.entries(previous)) { next[scope] = revealCollapsed(set, activePath); changed ||= next[scope] !== set; }
      return changed ? next : previous;
    });
    setSectionsOpen((previous) => openKindSections(previous, list.sections, activePath));
  }, [activePath]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (activePath !== null) ref.current?.querySelector(`${TREE_ROW_SELECTOR}[aria-current]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activePath, tree, list]);
  const toggleIn = (scope) => (path) => setCollapsed((previous) => ({ ...previous, [scope]: toggleCollapsed(previous[scope] ?? EMPTY_SET, path) }));
  const props = (scope) => ({ showDirectory: !tree, collapsed: collapsed[scope] ?? EMPTY_SET, onToggle: toggleIn(scope), activePath, onSelect, onOpenFile, actions });
  // wc: `${A} h-full overflow-y-auto ${N} outline-none hide-focus-ring` (ca7840910 A = group/file-tree, whose hover or
  // focus-within shows every row's guides), rows in a 700 ms tooltip group (shared-frame kc; host SourceTooltipGroup).
  return <div ref={ref} role="tree" aria-label={DIFF_FILE_LIST_LABELS.changedFiles} tabIndex={0} onKeyDown={diffTreeKeyDown} onFocus={diffTreeFocus}
    className={`${fileTreeGroup} h-full overflow-y-auto ${fileTreePadding} outline-none hide-focus-ring`}>
    <SourceTooltipGroup delay={700}>
      {list.nodes.map((node) => <DiffTreeNode key={`${node.kind}:${node.path}`} node={node} depth={0} {...props('source')} />)}
      {list.sections.map((section) => {
        const open = kindSectionOpen(sectionsOpen[section.kind], activePath !== null && section.paths.includes(activePath));
        return <div key={section.kind} role="none" className={section.separated ? 'mt-1 border-t pt-1' : undefined} data-pane-line="">
          <DiffTreeSection section={section} open={open} onToggle={() => setSectionsOpen((previous) => ({ ...previous, [section.kind]: !open }))} />
          {open && <DiffTreeRows nodes={section.nodes} depth={0} {...props(section.kind)} />}
        </div>;
      })}
    </SourceTooltipGroup>
  </div>;
}
const EMPTY_SET = new Set();
// c44d00c7f Ec header row: L(0) indent, `${P} ${F}`; opening the section scrolls its rows into view (kc, diffgit-04).
function DiffTreeSection({ section, open, onToggle }) {
  const ref = useTreeRowFocusReturn();
  return <button ref={ref} type="button" style={treeIndent(0)} data-diff-tree-row="" data-diff-tree-section={section.kind} role="treeitem" tabIndex={-1}
    aria-level={1} aria-expanded={open} onClick={(event) => revealExpandedSubtree(event.currentTarget, !open, onToggle)} className={`${fileTreeCompactRow} ${fileTreeRowIdle}`}>
    <CdsIcon name="CaretRight" size={fileTreeIconSize()} className={`shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none ${open ? "rotate-90" : ""}`} />
    <span className="truncate min-w-0 flex-1 text-secondary">{section.label}</span>
    <span className="shrink-0 text-footnote tabular-nums text-muted-as-secondary">{section.count}</span>
  </button>;
}

/* The Changes body with the "Changed files" column (panes-diff-view-current.js
   :5296-5330 Ot resize, :5530-5590 column/edge/shield/body; cf3dc7910 d).
   Width (diffTreeWidth) and visibility (diffShowTree) belong to the caller
   (tile-layout-store via FilePane). The column fits from 400px (So) of body
   width; until measured it counts as fitting (diffCanFitTree ?? true) and the
   result is reported upward (onCanFitTreeChange). Handles reuse the Files tree
   divider/edge (source-session.css .source-tree-divider/.source-tree-edge) and
   use-pointer-resize.js: dragging the column under MIN/2 hides it at the end,
   dragging the edge past MIN/2 shows it, a click on the edge shows it, a
   double-click resets the width; keys as the Files tree divider. */
// c44d00c7f al: a carried-over comparison (another scope still loading) dims after 200ms.
const STALE_CLASS = 'opacity-60 transition-opacity delay-200 duration-100';
function ChangesFileLayout({ fileList, entries, activePath, onSelect, onOpenFile, actions = null, banner, stale = false, commits = null, children }) {
  const layoutRef = useRef(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  useLayoutEffect(() => {
    const node = layoutRef.current, view = node?.ownerDocument.defaultView;
    if (!node) return undefined;
    const measure = () => { const width = node.offsetWidth; if (width > 0) setBodyWidth(width); };
    measure();
    if (typeof view?.ResizeObserver !== 'function') return undefined;
    const observer = new view.ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const canFit = diffFileListCanFit(bodyWidth);
  const reportFit = useRef(fileList.onCanFitChange);
  reportFit.current = fileList.onCanFitChange;
  useEffect(() => { reportFit.current?.(canFit); }, [canFit]);
  const tree = fileList.tree !== false, groupByKind = !!fileList.groupByKind;
  const list = useMemo(() => diffFileList(entries, { tree, groupByKind }), [entries, tree, groupByKind]);
  const { MIN, DEFAULT } = DIFF_FILE_LIST_WIDTH;
  // Unmeasured: the stored width, capped by the column's CSS max-width only.
  const limit = bodyWidth > 0 ? diffFileListLimit(bodyWidth) : DIFF_FILE_LIST_WIDTH.MAX;
  const width = clampDiffFileListWidth(fileList.width);
  const shown = !!fileList.shown && canFit;
  const [drag, setDrag] = useState(null);
  const startWidth = useRef(0), handleFocus = useRef(null);
  const visibleWidth = Math.min(drag?.width ?? width, limit);
  const commitWidth = (value) => fileList.onWidthChange?.(Math.max(MIN, Math.min(limit, Math.round(value))));
  const setShown = (value) => fileList.onShownChange?.(value);
  const focusedHandle = () => layoutRef.current?.ownerDocument.activeElement?.closest?.('.sdiff-file-list-divider, .sdiff-file-list-edge');
  const divider = useSourcePointerResize({
    onStart: () => { startWidth.current = visibleWidth; },
    onMove: (delta) => {
      const value = startWidth.current + delta;
      setDrag({ width: Math.max(MIN, Math.min(limit, value)), hidden: value < MIN / 2 });
    },
    onEnd: (delta) => {
      const value = startWidth.current + delta;
      setDrag(null);
      if (value < MIN / 2) { if (focusedHandle()) handleFocus.current = 'edge'; setShown(false); }
      else if (delta !== 0) commitWidth(value);
    },
    onCancel: () => setDrag(null),
  });
  const edge = useSourcePointerResize({
    onStart: () => { startWidth.current = 0; },
    onMove: (delta) => setDrag(delta >= MIN / 2 ? { width: Math.max(MIN, Math.min(limit, delta)), preview: true } : { preview: false }),
    onEnd: (delta) => {
      setDrag(null);
      const click = Math.abs(delta) < 3;
      if (!click && delta < MIN / 2) return;
      if (!click) commitWidth(delta);
      if (focusedHandle()) handleFocus.current = 'divider';
      setShown(true);
    },
    onCancel: () => setDrag(null),
  });
  useLayoutEffect(() => {
    const target = handleFocus.current;
    if (!target) return;
    handleFocus.current = null;
    layoutRef.current?.querySelector(target === 'edge' ? '.sdiff-file-list-edge' : '.sdiff-file-list-divider')?.focus({ preventScroll: true });
  }, [shown]);
  function dividerKeyDown(event) {
    if (event.metaKey || event.altKey || event.ctrlKey) return;
    const step = event.shiftKey ? 120 : 24;
    let value;
    if (event.key === 'ArrowLeft') value = visibleWidth - step;
    else if (event.key === 'ArrowRight') value = visibleWidth + step;
    else if (event.key === 'Home') value = MIN;
    else if (event.key === 'End') value = limit;
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) { handleFocus.current = 'edge'; setShown(false); }
      return;
    } else return;
    event.preventDefault();
    commitWidth(value);
  }
  const columnRendered = shown || !!drag?.preview;
  const resizing = divider.dragging || edge.dragging;
  // cccc2cf0a (the Changes tile): the view sits in div[data-diff-pane-body][tabIndex=-1] (`… select-text outline-none`),
  // where focus falls back when what held it goes away (cae42d46f Ue, the review finding card's Dismiss).
  return <div ref={layoutRef} className="sdiff-changes-layout outline-none" data-diff-pane-body="" tabIndex={-1} data-file-list-shown={shown || undefined} data-resizing={resizing || undefined}>
    {columnRendered && <div className="sdiff-file-list relative shrink-0 flex flex-col min-h-0 border-e" data-pane-line=""
      style={{ width: visibleWidth, minWidth: `min(${MIN}px, 100% - 160px)`, maxWidth: `min(${DIFF_FILE_LIST_WIDTH.MAX}px, 100% - 160px)`, display: drag?.hidden ? 'none' : undefined }}>
      <div aria-busy={stale || undefined} className={`min-h-0 flex-1 overflow-y-auto${stale ? ` ${STALE_CLASS}` : ''}`}>
        {/* c44d00c7f ~7190 (Ht && Cc): the tree only while the comparison has files. */}
        {entries.length > 0 && <DiffFileTree list={list} tree={tree} activePath={activePath} onSelect={onSelect} onOpenFile={onOpenFile} actions={actions} />}
      </div>
      {/* c44d00c7f ~7210 (Ge): the Commits section under the tree while the branch has commits ahead of its base. */}
      {commits?.list?.length > 0 && commits.onSelect && <div className="sdiff-commits-section flex shrink-0 flex-col border-t" data-pane-line="" style={{ maxHeight: '40%' }}>
        <SourceDiffCommits commits={commits.list} total={commits.total} selectedSha={commits.selectedSha ?? null} uncommittedSelected={!!commits.uncommittedSelected}
          onSelect={commits.onSelect} onSelectUncommitted={commits.onSelectUncommitted} collapsed={!!commits.collapsed} onCollapsedChange={commits.onCollapsedChange} />
      </div>}
      {shown && <div className="source-tree-divider sdiff-file-list-divider" role="separator" tabIndex={0} aria-label={DIFF_FILE_LIST_LABELS.resize}
        aria-orientation="vertical" aria-valuemin={MIN} aria-valuemax={limit} aria-valuenow={Math.round(visibleWidth)}
        onPointerDown={divider.onPointerDown} onDoubleClick={() => commitWidth(DEFAULT)} onKeyDown={dividerKeyDown}><span /></div>}
    </div>}
    {canFit && !shown && <div className="source-tree-edge sdiff-file-list-edge" role="separator" tabIndex={0} aria-label={DIFF_FILE_LIST_LABELS.showFiles}
      aria-orientation="vertical" aria-valuemin={0} aria-valuemax={DIFF_FILE_LIST_WIDTH.MAX} aria-valuenow={0} onPointerDown={edge.onPointerDown}
      onKeyDown={(event) => {
        if (!['Enter', ' ', 'ArrowRight'].includes(event.key) || event.metaKey || event.altKey || event.ctrlKey) return;
        event.preventDefault();
        if (event.repeat) return;
        handleFocus.current = 'divider';
        setShown(true);
      }}><span /></div>}
    <div className={`sdiff-changes-main${stale ? ` ${STALE_CLASS}` : ''}`} data-stale={stale || undefined} aria-busy={stale || undefined}>
      {banner}
      <div className="source-changes">{children}</div>
    </div>
  </div>;
}

// B34 "View image" (c44d00c7f Na/Pa/Fa/ja). Na: the images for the file, refetched when the file or fetcher changes.
const NO_IMAGES = { before: null, after: null };
function useDiffFileImages(file, fetchImages) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    const done = (images) => { if (live) setState({ file, fetchImages, images }); };
    fetchImages(file).then(done, () => done(NO_IMAGES));
    return () => { live = false; };
  }, [file, fetchImages]);
  return state && state.file === file && state.fetchImages === fetchImages ? state.images : undefined;
}
// shared-frame gc (Skeleton) as Fa's loading placeholder; the classes match source-customize.jsx SkeletonBar.
const IMAGE_SKELETON = "relative max-w-full overflow-hidden rounded bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden";
// Fa: label and, once loaded, "{width} × {height}" and the byte size; the image (object-contain in an h-80 well), a
// placeholder while loading, or "Image not available" for a missing side or an image that fails to decode.
function DiffImageFigure({ label, alt, src }) {
  const [loaded, setLoaded] = useState(null);
  const size = loaded !== null && loaded.src === src ? loaded.size : undefined;
  const missing = src === null || size === null;
  const bytes = typeof src === "string" ? dataUrlByteSize(src) : null;
  return <figure className="sdiff-image-figure flex min-w-0 flex-col gap-sm">
    <figcaption className="flex items-baseline justify-between gap-md text-body">
      <span className="text-secondary">{label}</span>
      {typeof src === "string" && size && <span className="flex min-w-0 gap-sm text-footnote tabular-nums text-muted">
        <span>{t("{width} × {height}", { width: size.width.toLocaleString(), height: size.height.toLocaleString() })}</span>
        {bytes !== null && <span>{formatImageBytes(bytes)}</span>}
      </span>}
    </figcaption>
    <div className="flex h-80 items-center justify-center overflow-hidden rounded bg-surface-1 p-sm shadow-card-ring">
      {src === undefined && <div data-cds="Skeleton" role="status" className={`${IMAGE_SKELETON} size-full animate-placeholder-reveal`}><span className="sr-only">{t("Loading")}</span></div>}
      {missing && <span className="text-body text-muted">{t("Image not available")}</span>}
      {typeof src === "string" && !missing && <img src={src} alt={alt} draggable={false} className="max-h-full max-w-full object-contain"
        onLoad={(event) => { const { naturalWidth: width, naturalHeight: height } = event.currentTarget; setLoaded({ src, size: { width, height } }); }}
        onError={() => setLoaded({ src, size: null })} />}
    </div>
  </figure>;
}
// ja's Dialog (size 2xl) with Pa: header = basename with the folder as the description and a Close button; a modified
// file shows Before | After side by side from sm up, an added or deleted one a single figure.
function DiffImageDialog({ file, fetchImages, open, onClose, onExited }) {
  const images = useDiffFileImages(file, fetchImages);
  const viewer = diffImageViewer(file);
  return <SourceDialog open={open} onClose={onClose} onExited={onExited} size="2xl" className="sdiff-image-dialog"
    title={viewer.title} description={viewer.description}>
    <div aria-busy={images === undefined} className={`grid grid-cols-1 gap-md${viewer.columns > 1 ? " sm:grid-cols-2" : ""}`}>
      {viewer.figures.map((figure) => <DiffImageFigure key={figure.side} label={figure.label} alt={figure.alt} src={images?.[figure.side]} />)}
    </div>
  </SourceDialog>;
}

// B34 next / previous change (c44d00c7f Rt, ds/fs/ps, An): DOM reads over the rendered Changes rows.
const DIFF_ROW_SELECTOR = ".sdiff-row[data-old-line], .sdiff-row[data-new-line]";
const diffFileSection = (view, id) => [...view.querySelectorAll(".sdiff-file[data-file-path]")].find((node) => node.dataset.filePath === id) ?? null;
// An: a removed row (or the split view's old column) is the deletions side; its line is the old line number.
function diffRowPosition(row) {
  const side = row.dataset.side ? (row.dataset.side === "before" ? "deletions" : "additions") : row.dataset.kind === "removed" ? "deletions" : "additions";
  const line = Number.parseInt(side === "deletions" ? row.dataset.oldLine : row.dataset.newLine, 10);
  return Number.isFinite(line) ? { side, lineNumber: line } : null;
}
// c44d00c7f Ds: the topmost line below the sticky header, with its offset from the top of the pane (viewportOffset); the
// rendered rows are in document order, so the first one past the header is the topmost.
export function diffViewportLine(view, scroller, offset) {
  const paneTop = scroller.getBoundingClientRect().top, top = paneTop + offset;
  for (const section of view.querySelectorAll(".sdiff-file[data-file-path]")) {
    if (section.getBoundingClientRect().bottom <= top) continue;
    for (const row of section.querySelectorAll(DIFF_ROW_SELECTOR)) {
      const rect = row.getBoundingClientRect();
      if (rect.height === 0 || rect.bottom <= top) continue;
      const position = diffRowPosition(row);
      if (position) return { id: section.dataset.filePath, ...position, viewportOffset: rect.top - paneTop };
    }
  }
  return null;
}
// c44d00c7f Os: else the first file still on screen (its top, line 0).
export function diffViewportFile(view, scroller, offset) {
  const top = scroller.getBoundingClientRect().top + offset;
  for (const section of view.querySelectorAll(".sdiff-file[data-file-path]")) {
    if (section.getBoundingClientRect().bottom > top) return { id: section.dataset.filePath, side: "additions", lineNumber: 0 };
  }
  return null;
}
// c44d00c7f Nt (diffgit-09): the viewport anchor hi steps from — Ds's line, marked belowPane when it starts at or past
// the bottom of the pane (the change starting there is then still ahead), else Os.
export function diffChangeViewport(view, scroller, offset) {
  const line = diffViewportLine(view, scroller, offset);
  return line ? { ...line, belowPane: line.viewportOffset >= scroller.getBoundingClientRect().height } : diffViewportFile(view, scroller, offset);
}
function diffChangeRow(view, target) {
  const section = diffFileSection(view, target.id);
  if (!section) return null;
  for (const row of section.querySelectorAll(DIFF_ROW_SELECTOR)) {
    const position = diffRowPosition(row);
    if (position && position.side === target.side && position.lineNumber === target.lineNumber) return row;
  }
  return null;
}
// ps: the change the last press went to is still (partly) below the header and above the bottom.
function diffChangeVisible(view, scroller, offset, target) {
  const row = diffChangeRow(view, target);
  if (!row) return false;
  const rect = row.getBoundingClientRect(), box = scroller.getBoundingClientRect();
  return rect.height > 0 && rect.bottom > box.top + offset && rect.top < box.bottom;
}

/** Render only the actual local Codex/Git patch; no inferred unchanged lines.
 * placement "changes" (the Changes pane, source-session.jsx FilePane) renders the
 * c219730b0 We/Ze/$e header with fileActions {root, onCopy, onOpenFile,
 * onAttachFile, and for the B16 menus/drag: editors, onOpenInEditor, onRevealFile,
 * revealRoot, onAttachFiles, onDragFiles}; the default "inline" placement (approval-card FileChanges) keeps
 * its existing header (path · metadata, native title, Copy patch).
 * wordDiff / hideWhitespace are the Changes "Highlight changed words" and "Hide
 * whitespace changes" preferences (panes-tile-current.js:3597-3598, 3805-3835);
 * hideWhitespace runs the gn port per file (diff-whitespace-model.mjs, Tn
 * panes-diff-view-current.js:377-401), except on a file c44d00c7f Ca pauses: one with a
 * line comment, a comment draft or a review finding (R3-files FT-07, diffgit-11).
 * R10, placement "changes" only:
 * - large diff (2.42304.0 c44d00c7f Al $e, diffgit-08; isLargeDiff): the listed files' additions + deletions above
 *   5000 (Pt: this body is the per-file list, the official hl branch), else patchesWithheld (the main process's
 *   comparison.patches_withheld, Qe) when it is a boolean, else the no-patch heuristics, which need
 *   fileActions.fetchFilePatch (Fe), mount every file collapsed, show the muted banner and report
 *   onIsLargeChange(isLarge). R4i-files FI2 (diffgit-08-lazy): the working-tree scopes ask the main process for the
 *   inline budget and supply fetchFilePatch, so patches_withheld arrives as a boolean; comparisonFiles carries the
 *   withheld files' counts and each withheld row reads its own patch when expanded (LazyFileDiff).
 * - commentScope (B14): the session the line comments belong to (JSON [sessionId, cwd]); with it, each file
 *   carries the c44d00c7f inline comment cards, the gutter "+", line-number drag, the selection chip and the body
 *   context menu (source-diff-comments.jsx); fileActions {onSaveComment, onDeleteComment, onCopy} route them.
 * - fileList {shown, width, tree, groupByKind, onShownChange, onWidthChange,
 *   onCanFitChange}: the body is laid out beside the "Changed files" column
 *   (ChangesFileLayout, which also owns the .source-changes scroller), files
 *   follow the column order (Mn tree/list path order, ka by kind), and selecting
 *   a row expands that file and scrolls it to the top (Zt).
 * - stale (B15, c44d00c7f Xc/al): the comparison shown is the previous scope's while the new one loads:
 *   the column's tree and the body carry aria-busy (the body also data-stale) and dim to 60% after 200ms.
 * - commits (B15, c44d00c7f Zr): {list, total, selectedSha, uncommittedSelected, onSelect(sha|null),
 *   onSelectUncommitted, collapsed, onCollapsedChange}; the "Commits" section under the file tree.
 * - emptyPlaceholder (B15, c44d00c7f cl Ne at :7273): with fileList and no patch, the body shows this
 *   (the empty Changes state) beside the column, so the Commits section stays reachable. */
export function SourceDiff({ value = "", scopeKey = "standalone", layout = "unified", wordWrap = true, completeContext = false, onCanFitSplitChange, foldAll = null, placement = "inline", fileActions = null,
  wordDiff = true, hideWhitespace = false, fileList = null, onIsLargeChange, review = null, commentScope = null, stale = false, commits = null, emptyPlaceholder = null, patchesWithheld, comparisonFiles }) {
  const root = useRef(null), [canFitSplit, setCanFitSplit] = useState(true);
  const placeholderShown = !!fileList && !!emptyPlaceholder && !String(value ?? "").trim();
  useLayoutEffect(() => (root.current ? observeDiffSplitFit(root.current, fit => { setCanFitSplit(fit); onCanFitSplitChange?.(fit); }) : undefined), [scopeKey, onCanFitSplitChange, placeholderShown]);
  const actualLayout = layout === "split" && canFitSplit ? "split" : "unified";
  const changes = placement === "changes";
  // R4i-files FI2: comparisonFiles (the main process's files with counts) completes the withheld header-only blocks.
  const parsedPatch = useMemo(() => parseUnifiedDiff(value), [value]);
  const parsed = useMemo(() => (changes ? { ...parsedPatch, sections: withComparisonFiles(parsedPatch.sections, comparisonFiles) } : parsedPatch), [changes, parsedPatch, comparisonFiles]);
  const entries = useMemo(() => (changes ? withRawFiles(diffFileEntries(parsed.sections), parsed.sections) : []), [changes, parsed]);
  // $e: Qe = patchesWithheld, Fe = fileActions.fetchFilePatch, He = false (see isLargeDiff).
  const lazyPatches = typeof fileActions?.fetchFilePatch === "function";
  const large = changes && isLargeDiff(entries, { withheld: patchesWithheld, lazyPatches, singleList: false });
  const listed = !!fileList, tree = fileList?.tree !== false, groupByKind = !!fileList?.groupByKind;
  // R3-files FT-07 (diffgit-11): c44d00c7f hides a file's whitespace changes only while Ca says nothing is anchored on
  // its lines (`hideWhitespace: k && !Ca({annotations, prComments, findings, drafts})`, per file of the list).
  const paused = useWhitespacePausedFiles({ parsed, active: hideWhitespace, commentScope: changes ? commentScope : null, findings: changes ? review?.findings : null });
  const sections = useMemo(() => {
    const ordered = listed ? orderDiffSections(parsed.sections, { tree, groupByKind }) : parsed.sections;
    return hideWhitespace ? ordered.map((section) => (paused.has(section.path) ? section : whitespaceHidden(section))) : ordered;
  }, [parsed, hideWhitespace, listed, tree, groupByKind, paused]);
  const patchQueue = useMemo(() => createPatchFetchQueue(), [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const reportLarge = useRef(onIsLargeChange);
  reportLarge.current = onIsLargeChange;
  useEffect(() => { if (changes) reportLarge.current?.(large); }, [changes, large]);
  const [activePath, setActivePath] = useState(null);
  const [reveal, setReveal] = useState(null);
  const selectFile = useCallback((path) => {
    setActivePath(path);
    setReveal((previous) => ({ path, seq: (previous?.seq ?? 0) + 1 }));
  }, []);
  // A file row of the per-turn edits card (diff-reveal.mjs): that file's section, as a file-list selection.
  useEffect(() => {
    if (!changes) return undefined;
    const take = () => { const path = takeDiffReveal(entries.map((entry) => entry.filePath)); if (path) selectFile(path); };
    take();
    return subscribeDiffReveal(take);
  }, [changes, entries, selectFile]);
  // Zt: the selected file's section to the top of the scroller (block start).
  useEffect(() => {
    if (!reveal) return;
    const node = [...(root.current?.querySelectorAll('.sdiff-file[data-file-path]') ?? [])].find((section) => section.dataset.filePath === reveal.path);
    const scroller = node?.closest('.source-changes');
    if (!node) return;
    if (!scroller) { node.scrollIntoView?.({ block: 'start' }); return; }
    scroller.scrollTop += node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }, [reveal]);
  // B34 "View image" (c44d00c7f ja/Ia, cccc2cf0a Gb): where the caller can read a side of a changed image
  // (fileActions.fetchImage, the local repository diff), an image row without a text body offers the viewer; it is
  // disabled while a carried-over comparison is shown, and a scope change closes it.
  const fetchImageRef = useRef(null);
  fetchImageRef.current = fileActions?.fetchImage ?? null;
  const canFetchImages = changes && typeof fileActions?.fetchImage === "function";
  const fetchFileImages = useMemo(() => (canFetchImages ? fetchDiffFileImages((request) => fetchImageRef.current?.(request) ?? null) : null),
    [canFetchImages, scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [imageView, setImageView] = useState(null);
  const scopeRef = useRef(scopeKey);
  scopeRef.current = scopeKey;
  const openImage = useCallback((path) => {
    const file = sections.find((section) => section.type === "file" && section.path === path);
    if (file && fetchFileImages && !stale) setImageView({ file, fetchFileImages, scopeKey, open: true });
  }, [sections, fetchFileImages, stale, scopeKey]);
  const imageViewer = useMemo(() => (fetchFileImages ? { open: openImage, stale } : null), [fetchFileImages, openImage, stale]);
  const imageDialog = imageView ? <DiffImageDialog key={`${imageView.scopeKey}:${imageView.file.path}`} file={imageView.file} fetchImages={imageView.fetchFileImages}
    open={imageView.open && imageView.scopeKey === scopeKey}
    onClose={() => setImageView((value) => (value ? { ...value, open: false } : value))}
    onExited={() => setImageView((value) => (value && value.open && value.scopeKey === scopeRef.current ? value : null))} /> : null;
  // B34 Eo/Rt: F7 / ⇧F7 (⌥F5 / ⇧⌥F5 off Linux) anywhere in the Changes pane (its [data-pane-root] or dialog) scrolls
  // the next / previous change block (diffChangeTargets) to the middle; collapsed files are skipped. A press steps
  // from the change the last one went to while it is still on screen, else from the topmost visible line.
  const changeFiles = useMemo(() => (changes ? sections.filter((section) => section.type === "file" && section.path && !section.fallbackReason)
    .map((section) => ({ id: section.path, targets: diffChangeTargets(section.path, section.hunks) })) : []), [changes, sections]);
  const changeFilesRef = useRef(changeFiles);
  changeFilesRef.current = changeFiles;
  const lastChange = useRef(null);
  useEffect(() => {
    const view = root.current;
    if (!changes || !view) return undefined;
    const doc = view.ownerDocument, win = doc.defaultView ?? window;
    const target = view.closest('[data-pane-root], [role="dialog"], [role="alertdialog"]') ?? view;
    const platform = `${win.navigator?.userAgentData?.platform ?? ""} ${win.navigator?.platform ?? ""}`;
    const linux = /linux/i.test(platform) && !/android/i.test(platform);
    const go = (direction) => {
      const node = root.current;
      if (!node || node.offsetParent === null) return null;
      const scroller = node.closest(".source-changes") ?? node;
      const offset = diffChangeHeaderOffset(Number.parseFloat(win.getComputedStyle(doc.documentElement).fontSize));
      const order = [], targets = [];
      for (const entry of changeFilesRef.current) {
        order.push(entry.id);
        if (diffFileSection(node, entry.id)?.querySelector(".sdiff-file-body")) targets.push(...entry.targets);
      }
      const last = lastChange.current && diffChangeVisible(node, scroller, offset, lastChange.current) ? lastChange.current : null;
      const next = pickDiffChange(targets, order, { last, viewport: diffChangeViewport(node, scroller, offset) }, direction);
      const row = next && diffChangeRow(node, next);
      if (row) {
        const rect = row.getBoundingClientRect(), box = scroller.getBoundingClientRect();
        scroller.scrollTop += rect.top - box.top - (box.height - rect.height) / 2;
      }
      return next;
    };
    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const command = diffChangeCommand(event, { linux });
      if (!command) return;
      event.preventDefault();
      if (event.repeat) return;
      lastChange.current = go(command === "next" ? 1 : -1) ?? lastChange.current;
    };
    target.addEventListener("keydown", onKeyDown);
    return () => target.removeEventListener("keydown", onKeyDown);
  }, [changes, scopeKey, placeholderShown]);
  const banner = changes && large && entries.length > 0
    ? <div className="sdiff-large-banner shrink-0 px-md py-1.25 text-body text-muted-as-secondary">{DIFF_FILE_LIST_LABELS.largeBanner}</div> : null;
  const view = <div ref={root} key={scopeKey} data-layout={actualLayout} data-word-wrap={wordWrap} data-word-highlight={wordDiff} data-hide-whitespace={hideWhitespace || undefined} data-large-diff={large || undefined} className="source-diff diff sdiff-view" data-source-component="FileDiff" data-placement={placement} aria-label={t("File changes")}>
    {!listed && banner}
    {sections.map((section) => section.type === "file" && section.lazyPatch && lazyPatches
      ? <LazyFileDiff key={`lazy:${section.path}`} file={section} fetchFilePatch={fileActions.fetchFilePatch} queue={patchQueue} scopeKey={scopeKey} layout={actualLayout} completeContext={false} foldAll={foldAll} placement={placement} fileActions={fileActions} wordDiff={wordDiff}
        defaultExpanded={!large} reveal={changes ? reveal : null} review={changes ? review : null} commentScope={changes ? commentScope : null} imageViewer={changes ? imageViewer : null} />
      : section.type === "file"
      ? <FileDiff key={`${section.id}:${section.path}`} file={section} scopeKey={scopeKey} layout={actualLayout} completeContext={completeContext} foldAll={foldAll} placement={placement} fileActions={fileActions} wordDiff={wordDiff}
        defaultExpanded={!large} reveal={changes ? reveal : null} review={changes ? review : null} commentScope={changes ? commentScope : null} imageViewer={changes ? imageViewer : null} />
      : <RawPatch key={section.id} value={section.raw} reason={section.reason} />)}
  </div>;
  if (!listed) return <>{view}{imageDialog}</>;
  return <><ChangesFileLayout fileList={fileList} entries={entries} activePath={activePath} onSelect={selectFile} onOpenFile={fileActions?.onOpenFile} actions={fileActions} banner={banner}
    stale={stale} commits={commits}>{placeholderShown ? <div className="min-h-0 flex-1 h-full">{emptyPlaceholder}</div> : view}</ChangesFileLayout>{imageDialog}</>;
}
// Test hooks (R3-files FT-07: SSR of the Changed files tree and a hook dispatcher over its rows).
export { LazyFileDiff as SourceLazyFileDiff };
export { DiffFileTree as SourceDiffFileTree, DiffTreeFolder as SourceDiffTreeFolder, DiffTreeFile as SourceDiffTreeFile, DiffTreeSection as SourceDiffTreeSection };
