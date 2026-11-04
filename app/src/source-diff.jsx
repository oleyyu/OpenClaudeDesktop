import React, { useCallback, useContext, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { parseUnifiedDiff } from "./diff-model";
import { previewHunks } from './file-preview-model.mjs';
import { useDiffHunk } from './use-diff-hunk.mjs';
import { SourceHighlightedLine } from './source-diff-code.jsx';
import { splitDiffRows, observeDiffSplitFit } from './diff-view-model.mjs';
import { diffSeparators } from './diff-separator-model.mjs';
import { contextRegions, expandContext, visibleContext } from './diff-context-model.mjs';
import { absoluteDiffPath, headerTooltip, pathParts, renamedFrom, renamedFromDisplay, rowLabels, splitPosixPath } from './diff-file-header-model.mjs';
import { FILE_MENU_LABELS, changedFileMenu } from './file-context-menu-model.mjs';
import { canOpenFileInEditor } from './generated/files-changes/file-editor-path.mjs';
import { SourceTooltip, SourceTooltipGroup } from './source-tooltip';
import { SourceMenu } from './source-menu.jsx';
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from './menu-model.mjs';
import { hideWhitespaceChanges } from './diff-whitespace-model.mjs';
import { clearDiffTarget, diffTarget, diffTreeJumpTarget, scrollDiffTarget, subscribeDiffReveal, subscribeDiffTargets, takeDiffRevealRequest } from './diff-reveal.mjs';
// c219730b0 Sn and c44d00c7f Ir / Lr / Rr (W12 diff-main): the Changed files column and its handles, generated with the
// sidebar's shared-9 bm (one copy of the CDS ResizeHandle).
import { useResizableDiffTree } from './generated/sidebar-resize/diff-tree-column.mjs';
import { DiffTreeEdgeHandle, DiffTreeResizeHandle, DiffTreeResizeShield } from './generated/sidebar-resize/diff-tree-resize-handle.mjs';
import { DIFF_FILE_LIST_LABELS, DIFF_FILE_LIST_WIDTH, clampDiffFileListWidth, diffFileEntries, diffFileList, diffFileListCanFit,
  isLargeDiff, withComparisonFiles, withRawFiles, createPatchFetchQueue, orderDiffSections, toggleCollapsed, treeRowTarget } from './diff-file-list-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import { rowCommentTarget } from './diff-comments-model.mjs';
import { annotationStoreSyncing, diffFileCommentsStore, useDiffComments, usePrCommentShortcuts } from './source-diff-comments.jsx';
import { SourceDiffCommits } from './source-diff-commits.jsx';
import { enterPick, preventNativeMenu } from './diff-commits-model.mjs';
// shared-18 ok / sk (c44d00c7f `$e` / `Z`): the tree's keyboard context menu and its menu-item Enter-repeat guard.
import { openContextMenuFromKey, preventMenuItemEnterRepeat } from './generated/files-changes/tree-context-menu-keys.mjs';
import { sameFindingFile } from './review-findings-model.mjs';
import { SourceReviewFindingCard } from './source-pane-review.jsx';
import { dataUrlByteSize, diffImageButtonShown, diffImageViewer, fetchDiffFileImages, formatImageBytes } from './diff-image-model.mjs';
import { diffChangeCommand, diffChangeHeaderOffset, diffChangeTargets, pickDiffChange } from './diff-change-nav-model.mjs';
// R3-files FT-07: the Changed files tree on its 3.6556.2 originals (c44d00c7f-Cr1FDL2F cs / ls / Xo / as over c621b1e2d,
// the Si tooltip, $o expansion; c784da984 path forms; 2.42304.0 Rc / zc / Ec / Fc, ca7840910, Jr, kc) and the per-file
// whitespace pause (3.6556.2 Dc, 2.42304.0 Ca).
import { CdsButton, CdsDialog, CdsIcon, CdsSkeleton, useCdsLayerAwareZIndex } from './generated/view-tabs/index.js';
import { FileTypeIcon } from './generated/files-changes/file-type-icon.mjs';
import { fileTreeCompactRow, fileTreeGroup, fileTreeKeptGuides, fileTreePadding, fileTreeRowCurrent, fileTreeRowIdle } from './generated/files-changes/file-tree-row-classes.mjs';
import { fileTreeIconSize, fileTreeRowStyle, guideGradient, treeIndent } from './generated/code-current/file-tree-style.mjs';
import { revealExpandedSubtree } from './generated/files-changes/diff-tree-expand.mjs';
import { forgetTreeScroll, initialTreeCollapsed, initialTreeSectionOpen, readTreeScroll, readTreeSectionOpen, revealCollapsedFolders,
  treeScrollKey, writeTreeCollapsed, writeTreeScroll, writeTreeSectionOpen } from './generated/files-changes/diff-tree-memory.mjs';
import { diffPaneFocusRoot } from './generated/files-changes/diff-pane-body.mjs';
import { isNodeHidden } from './generated/files-changes/node-hidden.mjs';
import { DiffTreeRowTooltip } from './generated/files-changes/diff-tree-tooltip.mjs';
import { PathSegments as TreePathSegments, NameThenFolder } from './generated/files-changes/path-segments.mjs';
import { whitespaceHidingPaused } from './generated/files-changes/diff-whitespace-pause.mjs';
// c6e73333a b (c44d00c7f en): the code background the Changes file header paints under its alpha gradient.
import { codeBackground } from './generated/files-changes/diff-widget-background.mjs';
// W14-code r6 pierre (R6DC-01 = r6pa-01 = gates-r6-11, E90 / E95): the 3.6556.2 Changes body, c44d00c7f Ju (qu over the
// pierre CodeView ca7ba268c Ba) with its comment / finding store cc8941b7b F / I (generated/pierre-changes), behind the
// host switch local_pierre_changes_body (false: the host's per-file rows below).
import { PierreChanges, comparisonFileEntries, useDiffFetchScheduler, DiffImageViewerContext, DiffImageViewerShownContext } from './generated/pierre-changes/pierre-changes.mjs';
import { useDiffAnnotationStore, diffAnnotationActions } from './generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs';
import { QueryClientProvider } from './generated/files-changes/file-browser-query.mjs';
import { fileBrowserQueryClient } from './source-breadcrumb-adapters.jsx';
import { CdsContextMenu } from './generated/view-tabs/index.js';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { PierreReviewContext } from './source-pane-review.jsx';
import { addToPrompt, serializeLineComment } from './inline-comments.mjs';
import { diffCommentAttachmentKey } from './diff-comments-model.mjs';
import { findingAnnotation } from './review-findings-model.mjs';
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

// W14-code pa2-04 (E84.3): the inline placement (approval FileChanges header, its metadata labels, Copy patch /
// Copied patch / Patch and "No text hunks in this patch") had no caller and no 3.6556.2 counterpart; it is gone, and
// SourceDiff always renders the Changes pane body. The RawPatch notice "{reason}. Showing original patch." is the
// host's parser fallback, without an official string.

// c44d00c7f Uc (3.6556.2): the gutter "+" is `button[type=button]` with style Hc = {...c64baa838 un, top:
// "calc((var(--diffs-line-height, 1lh) - 1rem) / 2)", bottom: "auto"} and class `-left-0.5 ${Pn}` (cda9b4504 Pn), its
// CdsIcon Add size sm bold. Host: @pierre/diffs shows it on the hovered line; here source-diff.css reveals it on row hover.
const GUTTER_ADD_STYLE = Object.freeze({ position: 'absolute', top: 'calc((var(--diffs-line-height, 1lh) - 1rem) / 2)', bottom: 'auto', textAlign: 'center', whiteSpace: 'normal', touchAction: 'none' });
const GUTTER_ADD_CLASS = '-left-0.5 flex size-4 items-center justify-center rounded bg-fill-accent text-on-accent hover:bg-fill-accent-hover';
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
    {target && onComment && <button type="button" style={GUTTER_ADD_STYLE} className={`sdiff-gutter-add ${GUTTER_ADD_CLASS}`} aria-label={t("Add comment on this line")}
      onClick={() => onComment(target)}><CdsIcon name="Add" size="sm" bold /></button>}
    <div className="sdiff-line-number" aria-hidden="true">{number}</div>
    {/* c49d7f557 [data-indicators="classic"]: the indicator is `content: "+"` / `content: "-"` (a hyphen-minus). */}
    <div className="sdiff-code-cell"><span className="sdiff-marker" aria-hidden="true">{row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}</span>
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
    {/* c49d7f557: a change-addition / change-deletion [data-no-newline] row carries the classic "+" / "-" indicator too. */}
    <div className="sdiff-code-cell">{type !== 'context' && <span className="sdiff-marker" aria-hidden="true">{type === 'added' ? '+' : '-'}</span>}<span className="sdiff-no-newline-text">{t('No newline at end of file')}</span></div>
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
      {/* ca7ba268c tn / nn: the expand buttons ([data-expand-button][data-expand-{up,down,both}]) carry only the icon and
          the content ([data-separator-content]) only "{n} unmodified line(s)"; no label or title of their own. */}
      {directions.map(direction => <button key={direction} type="button" className="sdiff-expand" data-direction={direction}
        onClick={event => onExpand(region, direction, event.currentTarget)}><ExpandIcon direction={direction}/></button>)}
      <button type="button" className="sdiff-separator-content"
        onClick={event => onExpand(region, 'both', event.currentTarget)}><span>{tn(region.remaining, '{count} unmodified line', '{count} unmodified lines')}</span></button>
    </div>
  </div>;
}

// c219730b0 He: the 16px chevron path (rotated -90deg while collapsed).
const CHEVRON = 'M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06';
// c219730b0 Ue (3.6556.2 c44d00c7f Gi): row label class.
const ROW_LABEL_CLASS = 'min-w-0 shrink-[9999] truncate text-body text-muted-as-secondary';
// c44d00c7f Xu (Zu, the CodeView's renderCustomHeader Jt; Jd takes that path, pt, outside popout windows): the H.Trigger
// `group/diff-file @container/diff-file relative`; the button `${ma} aria-disabled:cursor-default` with ma = `${tr} w-full
// select-none text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus disabled:cursor-default` and
// tr = c82eca2bd Ce (V "epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md", H = V + bg-alpha-1, U the 2rem
// height, then the alpha-1 / hover alpha-2 gradient), data-sticky, style re = {backgroundColor: en}. The CodeView's
// stickyHeaders keep it at the top; source-diff.css stands in for that (sticky, top 0).
const CHANGES_HEADER_BUTTON_CLASS = 'epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md bg-alpha-1 h-[calc(2rem*var(--cds-rem-scale,1))] bg-[linear-gradient(var(--cds-alpha-1),var(--cds-alpha-1))] enabled:hover:bg-[linear-gradient(var(--cds-alpha-2),var(--cds-alpha-2))] w-full select-none text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus disabled:cursor-default aria-disabled:cursor-default';
const CHANGES_HEADER_STYLE = Object.freeze({ backgroundColor: codeBackground });

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
  return <span className="sdiff-renamed flex min-w-0 shrink-[9999] items-baseline gap-1 overflow-hidden whitespace-nowrap text-body text-muted-as-secondary">
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
// isDirectory (cs `E=!r`, r = allRemoved, through _s and Ca to renderFileMenuItems): c856385e2 hn shows "Open in" for
// `!!c && (s || ee(c))`, so a folder that still holds a file opens in an editor whatever its name looks like, while a
// folder whose files were all removed is asked like a file (ee, canOpenFileInEditor; changedFileMenu's own check).
export function changedFileEntries(actions, path, { removed = false, directory = false, isDirectory = false } = {}) {
  const absolute = absoluteDiffPath(actions?.root, path);
  const root = typeof actions?.revealRoot === 'string' ? actions.revealRoot.replace(/\/+$/, '') : '';
  const editors = !removed && actions?.onOpenInEditor && Array.isArray(actions.editors) ? actions.editors : [];
  const entries = changedFileMenu({ root: actions?.root, path,
    canAttach: !removed && (directory ? !!actions?.onAttachFiles : !!actions?.onAttachFile),
    canOpenFile: !removed && !directory && !!actions?.onOpenFile,
    editors,
    canShowInFinder: !removed && !!actions?.onRevealFile && !!absolute && !!root && (absolute === root || absolute.startsWith(`${root}/`)) });
  if (!isDirectory || !editors.length || !absolute || canOpenFileInEditor(absolute)) return entries;
  // kn order: "Open in" (after its separator) goes before the reveal item.
  const openIn = { kind: 'submenu', label: FILE_MENU_LABELS.openIn,
    items: editors.map((editor) => ({ kind: 'item', action: 'open-in-editor', label: editor.name, value: absolute, editor: editor.type })) };
  const reveal = entries.findIndex((entry) => entry.action === 'show-in-finder');
  return reveal >= 0 ? [...entries.slice(0, reveal), openIn, ...entries.slice(reveal)] : [...entries, { kind: 'separator' }, openIn];
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
   div carries group/diff-file; the Open file reveal is _a's own utilities
   (group-hover / group-focus-within / pointer-coarse, all in the loaded sheets). hasBody (:3279 meta !== null && hunks.length > 0): a file with
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
  // 3.6556.2 c44d00c7f (the c219730b0 header moved in: aa / la / _a / il): the trigger is also the diff-file container
  // (`group/diff-file @container/diff-file relative`); the chevron and the file-type icon are text-muted-as-secondary, the
  // chevron turns -90deg (+90deg under RTL) while collapsed, the counts are dir="ltr", and the overlays sit at end-0 / pe-md.
  return <div ref={headerRef} className="sdiff-header group/diff-file @container/diff-file relative" data-diff-file-header=""
    onContextMenu={onCopy ? (event) => { event.preventDefault(); event.stopPropagation(); setMenu({ x: event.clientX, y: event.clientY }); } : undefined}>
    {/* aa :3717-3723: onClick/aria-expanded only with a body, else aria-disabled. */}
    <button ref={toggleRef} type="button" className={`sdiff-file-toggle ${CHANGES_HEADER_BUTTON_CLASS}`} data-sticky="" style={CHANGES_HEADER_STYLE} aria-disabled={hasBody ? undefined : true}
      aria-expanded={hasBody ? expanded : undefined} aria-controls={hasBody ? bodyId : undefined} onClick={hasBody ? onToggle : undefined}>
      <span aria-hidden="true" className={`sdiff-chevron flex items-center justify-center size-[16px] shrink-0 text-muted-as-secondary${hasBody ? '' : ' opacity-40'}`}>
        <svg width={16} height={16} viewBox="0 0 16 16"
          className={`transition-transform duration-fast motion-reduce:transition-none${open ? '' : ' -rotate-90 [&:where(:root[dir=rtl]_:dir(rtl))]:rotate-90'}`}>
          <path d={CHEVRON} fill="currentColor" />
        </svg>
      </span>
      {/* aa: c280f9bbb wt (FileTypeIcon) for the file path, size xs. */}
      <FileTypeIcon fileName={file.path || path} size="xs" className="shrink-0 text-muted-as-secondary" />
      <SourceTooltip content={headerTooltip(file, path)} delay={150} multiline side="bottom" hoverable={false}>
        <span className="sdiff-path flex min-w-0 text-body text-secondary"><DiffPathLabel path={path} /></span>
      </SourceTooltip>
      {previous !== undefined && <RenamedFrom path={path} previous={previous} />}
      {labels.map((label) => <span key={label.row} className={`sdiff-row-label ${ROW_LABEL_CLASS}`}>{label.row}</span>)}
      {counts && <span dir="ltr" className="sdiff-counts flex shrink-0 items-center gap-0.5 text-body tabular-nums">
        <span className="text-git-added">{`+${file.added}`}</span><span className="text-git-removed">{`−${file.removed}`}</span>
      </span>}
      {onOpenFile && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
      {imageAction && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
    </button>
    {imageAction && <span className="sdiff-view-image pointer-events-none absolute inset-y-0 end-0 flex items-center gap-xs pe-md">
      {/* W14-code r6 pierre (r6pa-04 / R6DC-02): c44d00c7f il `n(T, {size: "xs", variant: "ghost", icon: "Image", iconOnly: !0,
          "aria-label": u, tooltipSide: "bottom", disabled: d, disabledReasonSide: "bottom", disabledReason: f, onClick: p})`, T the
          shared-frame CDS Button (its own tooltip and disabled-reason tooltip). */}
      <span className="pointer-events-auto flex">
        <CdsButton size="xs" variant="ghost" icon="Image" iconOnly aria-label={t("View image")} tooltipSide="bottom"
          disabled={!!imageViewer.stale} disabledReasonSide="bottom" disabledReason={t("Loading the new changes")} onClick={() => imageViewer.open(file.path)} />
      </span>
      {onOpenFile && <span aria-hidden="true" data-size="xs" className="w-control shrink-0" />}
    </span>}
    {onOpenFile && <span className="sdiff-open-file absolute inset-y-0 end-0 flex items-center pe-md opacity-0 transition-opacity motion-reduce:transition-none group-hover/diff-file:opacity-100 group-focus-within/diff-file:opacity-100 pointer-coarse:opacity-100">
      {/* c44d00c7f _a: `n(T, {size: "xs", variant: "ghost", icon: "ArrowUpRight", iconOnly: !0, "aria-label": o, tooltipSide: "bottom", onClick: s})`. */}
      <CdsButton size="xs" variant="ghost" icon="ArrowUpRight" iconOnly aria-label={t("Open file")} tooltipSide="bottom" onClick={() => onOpenFile(file.path)} />
    </span>}
    {menu && <SourceMenu.Popup anchor={headerRef.current} trigger={toggleRef.current} point={menu} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard="always"
      label={t("{path} actions", { path })} onClose={() => setMenu(null)}>
      <ChangedFileMenuEntries entries={entries} onSelect={(entry) => runChangedFileAction(actions, entry)} />
    </SourceMenu.Popup>}
  </div>;
}

function FileDiff({ file, scopeKey, layout, completeContext, foldAll = null, fileActions = null, wordDiff = true, defaultExpanded = true, reveal = null, review = null, commentScope = null, imageViewer = null, lazyPatch = null }) {
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
  const path = file.path || "";
  // B14: Changes-pane line comments as inline annotation cards (c44d00c7f ha/ga/Ca/Ho/yo, source-diff-comments.jsx),
  // kept per session and file (commentScope) and sent with the next message.
  const bodyRef = useRef(null);
  const shownHunks = useMemo(() => (context ? context.filter((region) => region.kind !== 'gap') : file.hunks), [context, file.hunks]);
  const comments = useDiffComments({ file, scope: commentScope, menu: true, shownHunks, complete: !!regions, path, fileActions, bodyRef });
  // panes-diff-view-current.js:3279 hasBody; a fallback file's body is its raw patch. R4i-files FI2: c44d00c7f ml
  // `Y=q!==null&&q.hunks.length>0||J` with J = Ee&&!whitespaceOnly, Ee = Ko(file, fetchFilePatch)&&!patchUnavailable: a
  // withheld file whose patch can still be read is expandable, and expanding it reads the patch (Qo, enabled:!be).
  const pending = !!lazyPatch?.pending;
  const hasBody = !!file.fallbackReason || file.hunks.length > 0 || pending;
  useEffect(() => { if (expanded && pending) lazyPatch.load(); }, [expanded, pending, lazyPatch]);
  const separators = useMemo(() => diffSeparators(file.hunks), [file.hunks]);
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
  return <section className="sdiff-file relative" ref={fileRef} data-file-path={file.path || undefined} data-complete-context={regions ? '' : undefined}>
    {/* c44d00c7f aa over c219730b0 We/Ze/$e: the Changes file header. */}
    <ChangesFileHeader file={file} path={path} expanded={expanded} hasBody={hasBody} bodyId={bodyId} onToggle={() => setExpanded((value) => !value)} actions={fileActions} imageViewer={imageViewer} />
    {expanded && hasBody && <div ref={bodyRef} id={bodyId} className="sdiff-file-body" tabIndex={-1} aria-busy={pending || undefined} style={{ "--sdiff-number-width": `${Math.max(3, String(maximum).length)}ch` }} {...comments.bodyProps}>
      {unplaced.length > 0 && unplaced.map(findingCard)}
      {comments.unplacedCards}
      {file.fallbackReason ? <RawPatch value={file.raw} reason={file.fallbackReason} />
        : context ? context.map(region => region.kind === 'gap'
          ? <ContextGap key={region.id} region={region} onExpand={expand}/>
          : <DiffHunk key={region.id} hunk={region} file={file} layout={layout} wordDiff={wordDiff} onComment={comments.onGutterAdd} rowTargets={comments.rowTargets} renderAfter={renderAfter} scopeKey={JSON.stringify([scopeKey, file.id, file.path, region.id])}/>)
        : file.hunks.length ? file.hunks.map((hunk, index) => <DiffHunk key={index} hunk={hunk} separator={separators[index]} file={file} layout={layout} wordDiff={wordDiff} onComment={comments.onGutterAdd} rowTargets={comments.rowTargets} renderAfter={renderAfter} scopeKey={JSON.stringify([scopeKey, file.id, file.path, index])}/>)
          : null}
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

// c44d00c7f ss: a folder whose files (at any depth) are all removed.
export function diffTreeAllRemoved(node) {
  return (node?.children ?? []).every((child) => (child.kind === 'dir' ? diffTreeAllRemoved(child) : !!child.removed));
}
// c44d00c7f cs (3.6556.2; 2.42304.0 Rc + Ic's dir branch): a folder row toggles its subtree, its CaretRight turned by
// the CdsIcon rotate prop (0 collapsed / 90 open, no rotate-90 class); opening it scrolls the tree so the whole subtree
// shows (kc / $o, diffgit-04). Its name is c784da984 d (a "/"-joined chain cut at the head); its menu has no Open file.
function DiffTreeFolder({ node, depth, collapsed, onToggle, actions, showDirectory: _flat, ...rest }) {
  const ref = useTreeRowFocusReturn(), nameRef = useRef(null);
  const isCollapsed = collapsed.has(node.path);
  // cs: `allRemoved` is os's ss(c) (every file under the folder removed); the menu's isDirectory is its negation.
  const menu = useTreeRowMenu(ref, actions, node.path, { directory: true, isDirectory: !diffTreeAllRemoved(node) });
  return <>
    <DiffTreeRowTooltip name={node.name} nameRef={nameRef} suppressed={menu.open}>
      <button ref={ref} type="button" style={fileTreeRowStyle(depth)} data-diff-tree-row="" role="treeitem" tabIndex={-1} aria-level={depth + 1}
        aria-expanded={!isCollapsed} onClick={(event) => revealExpandedSubtree(event.currentTarget, isCollapsed, () => onToggle(node.path))}
        onContextMenu={menu.onContextMenu} className={`${fileTreeCompactRow} ${fileTreeKeptGuides} ${fileTreeRowIdle}`}>
        <CdsIcon name="CaretRight" size={fileTreeIconSize()} rotate={isCollapsed ? 0 : 90} className="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" />
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

// c44d00c7f rs (3.6556.2; 2.42304.0 Ga): roving focus over the visible rows. The keyboard context menu (shared-18 ok:
// ⇧F10 / ContextMenu on macOS, ^Enter) opens the focused row's menu; a plain Enter on a file row picks it and, on its
// keyup, hands focus to the diff (Ci, onEnterPick). Host: the arrow keys are not mirrored (c7037f09e dt) because the host
// has no RTL direction.
function diffTreeKeyDown(event, onEnterPick) {
  const tree = event.currentTarget;
  if (!tree.contains(event.target) || (event.altKey && event.key !== 'Tab')) return;
  if ((event.metaKey || event.ctrlKey) && event.key !== 'Enter') {
    if (!event.shiftKey && (event.key === 'a' || event.key === 'A')) event.preventDefault();
    return;
  }
  const rows = [...tree.querySelectorAll(TREE_ROW_SELECTOR)];
  if (rows.length === 0) return;
  const focused = tree.ownerDocument.activeElement;
  const index = rows.findIndex((row) => row === focused || row.contains(focused));
  const row = index >= 0 ? rows[index] : null;
  if (openContextMenuFromKey(event, row)) return;
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
  if (event.key === 'Enter') {
    if (row && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
      event.preventDefault();
      const view = tree.ownerDocument.defaultView ?? window;
      row.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true, metaKey: event.metaKey, ctrlKey: event.ctrlKey }));
    } else if (row && !row.hasAttribute('aria-expanded')) enterPick(event, row, onEnterPick);
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

// 3.6556.2 shared-0 LS (ve): a stable callback that calls the latest `callback` (its ref follows in a layout effect).
function useLatestTreeCallback(callback) {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; }, [callback]);
  const [stable] = useState(() => (...args) => latest.current(...args));
  return stable;
}
// 3.6556.2 c44d00c7f Vo: how many times the active file has been jumped to — the session's scroll target (diff-reveal.mjs,
// cc8941b7b scrollTargetBySession) when it is a plain jump to that file (not fuzzy, no anchor, this tile or none;
// diffTreeJumpTarget), counted each time a new target object shows up (`a !== o && (s(a), a !== void 0 && l(c + 1))`).
// Ho and Xo take it as `jumps`, so asking again for the already selected file re-opens what hides it.
export function useDiffTreeJumps({ sessionId, tileId, activePath }) {
  const target = useSyncExternalStore(subscribeDiffTargets,
    () => diffTreeJumpTarget(sessionId === undefined ? undefined : diffTarget(sessionId), tileId, activePath), () => undefined);
  const [seen, setSeen] = useState(target);
  const [jumps, setJumps] = useState(0);
  if (target !== seen) { setSeen(target); if (target !== undefined) setJumps(jumps + 1); }
  return jumps;
}
// 3.6556.2 c44d00c7f Ho (with Uo / Go, generated diff-tree-memory.mjs): one tree scope's collapsed folders ("source" or
// a kind section), restored from the module memory for this session + scope (ka/Oa), so a remounted tree comes back as
// left. A new session (or tile) starts from that session's memory; a new active file (or jump) inside the scope opens
// the folders that hide it. Every change is written back, and once more on unmount while anything is collapsed.
// `jumps` (Vo) re-opens them too when the same active file is asked for again.
export function useDiffTreeCollapsed({ sessionId, tileId, scope, activePath, holdsActive, jumps }) {
  const [collapsed, setCollapsed] = useState(() => initialTreeCollapsed(sessionId, scope, tileId, activePath, holdsActive));
  const [seen, setSeen] = useState(() => ({ sessionId, tileId, activePath, jumps }));
  if (sessionId !== seen.sessionId || tileId !== seen.tileId) {
    setSeen({ sessionId, tileId, activePath, jumps });
    setCollapsed(initialTreeCollapsed(sessionId, scope, tileId, activePath, holdsActive));
  } else if (activePath !== seen.activePath || jumps !== seen.jumps) {
    setSeen({ sessionId, tileId, activePath, jumps });
    if (holdsActive) { const next = revealCollapsedFolders(collapsed, activePath); if (next !== collapsed) setCollapsed(next); }
  }
  const save = useLatestTreeCallback((value) => writeTreeCollapsed(sessionId, scope, { collapsed: value, activePath }, tileId));
  useEffect(() => { save(collapsed); return () => { if (collapsed.size > 0) save(collapsed); }; }, [collapsed, save, sessionId, tileId, scope]);
  const toggle = useCallback((path) => setCollapsed((previous) => toggleCollapsed(previous, path)), []);
  return [collapsed, toggle];
}
// 3.6556.2 c44d00c7f Ko (Fa / Ia / La / Ra, generated diff-tree-memory.mjs; `on` = c91a5e4a6 _): the tree's scroll top
// per session + file list (+ tree/flat, +kinds), kept for at most 32 lists. On mount the remembered top is put back
// (and forgotten); a tree that is not laid out yet waits on a ResizeObserver (shared-25 gf) until it is, and gives up
// when the list changed meanwhile. On unmount the last top is remembered unless that restore is still waiting.
function useDiffTreeScroll({ treeRef, sessionId, tileId, files, asTree, groupByKind }) {
  const key = useMemo(() => (sessionId === undefined ? undefined
    : treeScrollKey(sessionId, { filePaths: files.map((file) => file.filePath), asTree, groupByKind }, tileId)), [asTree, files, groupByKind, sessionId, tileId]);
  const currentKey = useEffectEvent(() => key);
  const [restore] = useState(() => (key === undefined ? undefined : { key, top: readTreeScroll(key) }));
  const lastTop = useRef(0), waiting = useRef(false);
  useLayoutEffect(() => {
    const node = treeRef.current, top = restore?.top;
    if (!node || restore === undefined || top === undefined) return undefined;
    const apply = () => { waiting.current = false; node.scrollTop = top; lastTop.current = node.scrollTop; forgetTreeScroll(restore.key); };
    if (!isNodeHidden(node)) { apply(); return undefined; }
    waiting.current = true;
    const Observer = node.ownerDocument.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    if (typeof Observer !== 'function') return undefined;
    const observer = new Observer(() => {
      if (!isNodeHidden(node)) { observer.disconnect(); if (currentKey() === restore.key) apply(); else waiting.current = false; }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [treeRef, restore]);
  useLayoutEffect(() => () => {
    const last = currentKey();
    if (last !== undefined && !waiting.current) writeTreeScroll(last, lastTop.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return useCallback((event) => { lastTop.current = event.currentTarget.scrollTop; }, []);
}
// 3.6556.2 c44d00c7f Jo effect F: when the tree unmounts with focus inside it, focus goes (next task, only if it fell to
// the body) to the Changes pane body it sat in (shared-1 iC, generated diff-pane-body.mjs), else to the pane root's
// body, preferring its first `[role="group"][tabindex="0"]`; focusVisible follows the row that had focus.
function useDiffTreeFocusHandBack(treeRef) {
  useLayoutEffect(() => {
    const node = treeRef.current, body = diffPaneFocusRoot(node);
    if (!node || !body) return undefined;
    const pane = node.closest('[data-pane-root]');
    return () => {
      const focused = node.ownerDocument.activeElement;
      if (!focused || !node.contains(focused)) return;
      const options = { preventScroll: true, focusVisible: focused.matches(':focus-visible') };
      const doc = node.ownerDocument;
      setTimeout(() => {
        if (doc.activeElement !== doc.body) return;
        const target = body.isConnected ? body : pane?.isConnected ? diffPaneFocusRoot(pane) : null;
        (target?.querySelector('[role="group"][tabindex="0"]') ?? target)?.focus(options);
      }, 0);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// 3.6556.2 c44d00c7f Jo: "Changed files" tree; folders (or the flat list) first, then the separated Test / Build /
// Generated sections (Xo) when grouping by kind. The source scope's folders follow the active file only while it is a
// source file (D: `w === null || T.some(e => e.filePath === c)`).
function DiffFileTree({ list, files = [], tree, groupByKind = false, sessionId, tileId, activePath, onSelect, onOpenFile, onEnterPick, actions = null }) {
  const ref = useRef(null);
  const holdsActive = !groupByKind || (files.some((file) => file.filePath === activePath) && !list.sections.some((section) => section.paths.includes(activePath)));
  const jumps = useDiffTreeJumps({ sessionId, tileId, activePath });
  const [collapsed, toggle] = useDiffTreeCollapsed({ sessionId, tileId, scope: 'source', activePath, holdsActive, jumps });
  const onScroll = useDiffTreeScroll({ treeRef: ref, sessionId, tileId, files, asTree: tree, groupByKind });
  // Jo N/P: the current row into view on a new active file or jump (`[c, O, y, x]`).
  useLayoutEffect(() => {
    if (activePath !== null) ref.current?.querySelector(`${TREE_ROW_SELECTOR}[aria-current]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activePath, jumps, tree, list]);
  useDiffTreeFocusHandBack(ref);
  const rowProps = { showDirectory: !tree, activePath, onSelect, onOpenFile, actions };
  // Jo: `${Ct} h-full overflow-y-auto ${yt} outline-none hide-focus-ring` (c621b1e2d Ct = group/file-tree, whose hover or
  // focus-within shows every row's guides), rows in a 700 ms tooltip group (shared-frame kc; host SourceTooltipGroup);
  // onKeyDownCapture sk, onScroll Ko, onContextMenu ts (= ki, ZG; the host is the desktop app, shared-25 vh).
  return <div ref={ref} role="tree" aria-label={DIFF_FILE_LIST_LABELS.changedFiles} tabIndex={0} onKeyDown={(event) => diffTreeKeyDown(event, onEnterPick)}
    onKeyDownCapture={preventMenuItemEnterRepeat} onFocus={diffTreeFocus} onScroll={onScroll} onContextMenu={preventNativeMenu}
    className={`${fileTreeGroup} h-full overflow-y-auto ${fileTreePadding} outline-none hide-focus-ring`}>
    <SourceTooltipGroup delay={700}>
      {list.nodes.map((node) => <DiffTreeNode key={`${node.kind}:${node.path}`} node={node} depth={0} collapsed={collapsed} onToggle={toggle} {...rowProps} />)}
      {list.sections.map((section) => <DiffTreeKindSection key={section.kind} section={section} sessionId={sessionId} tileId={tileId} jumps={jumps} rowProps={rowProps} />)}
    </SourceTooltipGroup>
  </div>;
}
// 3.6556.2 c44d00c7f Xo: a kind section, open (Wo, generated diff-tree-memory.mjs) as this session left it, else while it
// holds the active file; a new active file inside it opens it again. The open state is written back (Ma) on change and on
// unmount (unless it is closed and the memory already says closed); its folders are their own Ho scope (the kind). A jump
// (the tree's Vo count) to a file inside it opens it again as well.
function DiffTreeKindSection({ section, sessionId, tileId, jumps, rowProps }) {
  const { activePath } = rowProps;
  const holdsActive = activePath !== null && section.paths.includes(activePath);
  const [open, setOpen] = useState(() => initialTreeSectionOpen(sessionId, section.kind, tileId, activePath, holdsActive));
  const [seen, setSeen] = useState(() => ({ sessionId, tileId, activePath, jumps }));
  if (sessionId !== seen.sessionId || tileId !== seen.tileId) {
    setSeen({ sessionId, tileId, activePath, jumps });
    setOpen(initialTreeSectionOpen(sessionId, section.kind, tileId, activePath, holdsActive));
  } else if (activePath !== seen.activePath || jumps !== seen.jumps) {
    setSeen({ sessionId, tileId, activePath, jumps });
    if (holdsActive) setOpen(true);
  }
  const save = useLatestTreeCallback((value) => writeTreeSectionOpen(sessionId, section.kind, { open: value, activePath }, tileId));
  useEffect(() => {
    save(open);
    return () => { if (open || readTreeSectionOpen(sessionId, section.kind, tileId)?.open !== true) save(open); };
  }, [section.kind, open, save, sessionId, tileId]);
  const [collapsed, toggle] = useDiffTreeCollapsed({ sessionId, tileId, scope: section.kind, activePath, holdsActive, jumps });
  return <div role="none" className={section.separated ? 'mt-1 border-t pt-1' : undefined} data-pane-line="">
    <DiffTreeSection section={section} open={open} onToggle={() => setOpen(!open)} />
    {open && <DiffTreeRows nodes={section.nodes} depth={0} collapsed={collapsed} onToggle={toggle} {...rowProps} />}
  </div>;
}
// c44d00c7f Xo (2.42304.0 Ec) header row: ht(0) indent, `${xt} ${St}`; 3.6556.2: CdsIcon CaretRight rotate={open ? 90 : 0}, the name
// text-secondary, the count text-muted; opening the section scrolls its rows into view (kc, diffgit-04).
function DiffTreeSection({ section, open, onToggle }) {
  const ref = useTreeRowFocusReturn();
  return <button ref={ref} type="button" style={treeIndent(0)} data-diff-tree-row="" data-diff-tree-section={section.kind} role="treeitem" tabIndex={-1}
    aria-level={1} aria-expanded={open} onClick={(event) => revealExpandedSubtree(event.currentTarget, !open, onToggle)} className={`${fileTreeCompactRow} ${fileTreeRowIdle}`}>
    <CdsIcon name="CaretRight" size={fileTreeIconSize()} rotate={open ? 90 : 0} className="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" />
    <span className="truncate min-w-0 flex-1 text-secondary">{section.label}</span>
    <span className="shrink-0 text-footnote tabular-nums text-muted">{section.count}</span>
  </button>;
}

/* The Changes body with the "Changed files" column: 3.6556.2 c44d00c7f Jd — the row (`flex flex-1 min-h-0`, reversed
   while the column is on the right) of the column (ci), the hidden column's edge (li), the drag shield (ui) and the main
   column (bi). The column is c219730b0 Sn (useResizableDiffTree: the live width on the column node, a drag under MIN/2
   hides it, the edge drag past MIN/2 shows it, a click on the divider hides it and on the edge shows it with the focus
   handed across, Home/End, a double-click resets the width) and its handles are c44d00c7f Ir (divider: "Resize file
   list", tooltip "Hide files" + the ⇧⌘Y shortcut + "Drag to resize"), Lr (edge: "Show files") and Rr (shield), all
   generated in generated/sidebar-resize over the same shared-9 bm the sidebar renders. Width and visibility belong to
   the caller (tile-layout-store via FilePane: fileList.width / shown and their setters; fileList.toggleShortcut is
   cccc2cf0a's treeToggleShortcut). The column fits from 400px (So) of body width; until measured it counts as fitting
   (Un === undefined) and the result is reported upward (onCanFitChange). */
// c44d00c7f al: a carried-over comparison (another scope still loading) dims after 200ms.
const STALE_CLASS = 'opacity-60 transition-opacity delay-200 duration-100';
function ChangesFileLayout({ fileList, entries, activePath, onSelect, onOpenFile, actions = null, banner, stale = false, commits = null, pierre = false, children }) {
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
  const width = clampDiffFileListWidth(fileList.width);
  // Jd kr (narrowTreeOpen unset): `kn && Un !== !1`, the column while shown and fitting. Sn gets the stored kn.
  const shown = !!fileList.shown && canFit;
  const column = useResizableDiffTree({ width, onWidthChange: fileList.onWidthChange, defaultWidth: DIFF_FILE_LIST_WIDTH.DEFAULT,
    onShownChange: fileList.onShownChange, shown: !!fileList.shown });
  // Jd Hn = shared-frame cu(5) (view-tabs useCdsLayerAwareZIndex): the handles' tooltip layer.
  const zIndex = useCdsLayerAwareZIndex(5);
  const shortcut = fileList.toggleShortcut;
  // Jd onEnterPick = cccc2cf0a `() => Xe(r)` (requestDiffFocus for the tile), consumed by WO on the tile body (this
  // data-diff-pane-body): the first `[role="group"][tabindex="0"]` (HO) in it, else the body itself, takes focus with
  // UO `{preventScroll:!0,focusVisible:!1}`: the .source-changes scroll root (the CodeView group, see below).
  const enterPick = useCallback(() => {
    const body = layoutRef.current;
    if (body) (body.querySelector('[role="group"][tabindex="0"]') ?? body).focus({ preventScroll: true, focusVisible: false });
  }, []);
  // cccc2cf0a (the Changes tile): the view sits in div[data-diff-pane-body][tabIndex=-1] (`… select-text outline-none`),
  // where focus falls back when what held it goes away (cae42d46f Ue, the review finding card's Dismiss).
  return <div ref={layoutRef} className={`sdiff-changes-layout outline-none${column.onRight ? ' flex-row-reverse' : ''}`} data-diff-pane-body="" tabIndex={-1} data-file-list-shown={shown || undefined}>
    {shown && <div ref={column.columnRef} className={`sdiff-file-list relative shrink-0 flex flex-col min-h-0 ${column.onRight ? 'border-s' : 'border-e'}`} data-pane-line=""
      style={column.columnStyle}>
      <div aria-busy={stale || undefined} className={`min-h-0 flex-1 overflow-y-auto${stale ? ` ${STALE_CLASS}` : ''}`}>
        {/* c44d00c7f ~7190 (Ht && Cc): the tree only while the comparison has files. */}
        {entries.length > 0 && <DiffFileTree list={list} files={entries} tree={tree} groupByKind={groupByKind} sessionId={fileList.sessionId ?? undefined} activePath={activePath} onSelect={onSelect} onOpenFile={onOpenFile} onEnterPick={enterPick} actions={actions} />}
      </div>
      {/* c44d00c7f ~7210 (Ge): the Commits section under the tree while the branch has commits ahead of its base. */}
      {commits?.list?.length > 0 && commits.onSelect && <div className="sdiff-commits-section flex shrink-0 flex-col border-t" data-pane-line="" style={{ maxHeight: '40%' }}>
        <SourceDiffCommits commits={commits.list} total={commits.total} selectedSha={commits.selectedSha ?? null} uncommittedSelected={!!commits.uncommittedSelected}
          onSelect={commits.onSelect} onSelectUncommitted={commits.onSelectUncommitted} onEnterPick={enterPick} collapsed={!!commits.collapsed} onCollapsedChange={commits.onCollapsedChange} />
      </div>}
      {/* Jd `be && Ir`: the divider while the width can be stored; actionLabel "Hide files" while Sn can hide (zn). */}
      {fileList.onWidthChange && <DiffTreeResizeHandle handleProps={column.handleProps} label={DIFF_FILE_LIST_LABELS.resize}
        actionLabel={column.hidesColumn ? DIFF_FILE_LIST_LABELS.hideFiles : undefined} shortcut={shortcut} resizing={column.resizing} zIndex={zIndex} />}
    </div>}
    {/* Jd li: `Bn && Un !== !1 && Lr` (the edge while the column is hidden and fits). */}
    {column.edgeHandleProps && canFit && <DiffTreeEdgeHandle handleProps={column.edgeHandleProps} label={DIFF_FILE_LIST_LABELS.resize}
      actionLabel={DIFF_FILE_LIST_LABELS.showFiles} shortcut={shortcut} resizing={column.resizing} zIndex={zIndex} />}
    <DiffTreeResizeShield active={column.resizing} />
    <div className={`sdiff-changes-main${stale ? ` ${STALE_CLASS}` : ''}`} data-stale={stale || undefined} aria-busy={stale || undefined}>
      {banner}
      {/* ca7ba268c Ha / Va (the Changes CodeView's scroll root): `h-full overflow-y-auto` + ca focus classes, and La gives it
          role="group", the c44d00c7f dl scrollRegionLabel "Changes" and tabIndex 0 (the group Jd's onEnterPick focuses). */}
      {pierre ? children
        : <div className="source-changes outline-none focus-visible:outline-hidden focus-visible:shadow-focus transition-shadow duration-fast" role="group" aria-label={t("Changes")} tabIndex={0}>{children}</div>}
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
// c44d00c7f nl (3.6556.2; 2.42304.0 Fa): label and, once loaded, "{width} × {height}" and the byte size; the image (object-contain in an h-80 well), a
// placeholder while loading, or "Image not available" for a missing side or an image that fails to decode.
export function DiffImageFigure({ label, alt, src }) {
  const [loaded, setLoaded] = useState(null);
  const size = loaded !== null && loaded.src === src ? loaded.size : undefined;
  const missing = src === null || size === null;
  const bytes = typeof src === "string" ? dataUrlByteSize(src) : null;
  return <figure className="sdiff-image-figure flex min-w-0 flex-col gap-sm">
    <figcaption className="flex items-baseline justify-between gap-md text-body">
      <span className="text-secondary">{label}</span>
      {typeof src === "string" && size && <span className="flex min-w-0 gap-sm text-footnote tabular-nums text-muted-as-secondary">
        <span>{t("{width} × {height}", { width: size.width.toLocaleString(), height: size.height.toLocaleString() })}</span>
        {bytes !== null && <span>{formatImageBytes(bytes)}</span>}
      </span>}
    </figcaption>
    <div className="flex h-80 items-center justify-center overflow-hidden rounded bg-surface-1 p-sm shadow-card-ring">
      {/* nl: shared-frame vu (view-tabs CdsSkeleton) while loading; the missing / undecodable label is text-muted-as-secondary. */}
      {src === undefined && <CdsSkeleton className="size-full animate-placeholder-reveal" />}
      {missing && <span className="text-body text-muted-as-secondary">{t("Image not available")}</span>}
      {typeof src === "string" && !missing && <img src={src} alt={alt} draggable={false} className="max-h-full max-w-full object-contain"
        onLoad={(event) => { const { naturalWidth: width, naturalHeight: height } = event.currentTarget; setLoaded({ src, size: { width, height } }); }}
        onError={() => setLoaded({ src, size: null })} />}
    </div>
  </figure>;
}
// c44d00c7f Zc / tl (3.6556.2): the shared-frame CDS Dialog (view-tabs CdsDialog) — Root {open, onOpenChange (closed:
// keep the file, open false), onOpenChangeComplete (closed: drop it unless reopened meanwhile)}, Popup size "2xl", and
// tl's Header (showClose, the basename with the folder as its description) over the `grid grid-cols-1 gap-md` figures:
// Before | After side by side from sm up (`sm:grid-cols-2`) for a modified file, one figure for an added or deleted one.
function DiffImageDialog({ file, fetchImages, open, onClose, onExited }) {
  const images = useDiffFileImages(file, fetchImages);
  const viewer = diffImageViewer(file);
  return <CdsDialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }} onOpenChangeComplete={(next) => { if (!next) onExited(); }}>
    <CdsDialog.Popup size="2xl">
      <CdsDialog.Header showClose description={viewer.description}>{viewer.title}</CdsDialog.Header>
      <div aria-busy={images === undefined} className={`grid grid-cols-1 gap-md${viewer.columns > 1 ? " sm:grid-cols-2" : ""}`}>
        {viewer.figures.map((figure) => <DiffImageFigure key={figure.side} label={figure.label} alt={figure.alt} src={images?.[figure.side]} />)}
      </div>
    </CdsDialog.Popup>
  </CdsDialog.Root>;
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

// ── W14-code r6 pierre (R6DC-01 = r6pa-01 = gates-r6-11; E90 / E95): the official Changes body ──────────────────────
// c44d00c7f Jd draws `pt ? n(Ju, {sessionId, tileId, revealTick, hiddenRef, files: Q, foldScope: Qt, foldsProvisional:
// Z, collapseAll: gn, collapseTestFiles: _n, fetchFileLines: $e, fetchFilePatch: et, fetchScheduler: St, onOpenFile,
// onAttachFile, onAnnotationSaved, onAnnotationCreated, commentOrigin, renderFileMenuItems, resolveAbsolutePath,
// diffStyle: Wr, expandUnchanged, wordWrap, wordDiff, hideWhitespace, foldAll: hn, onFixFinding, onDismissFinding, viewId:
// Pt, onStepPrComment: Nt, readOnly}) : <the per-file list Md>` with `pt = Le(!dt && !Ye)` (dt = W(): a pop-out pane
// window; Ye = perFileList). The host switch local_pierre_changes_body (host-growthbook.mjs) chooses this body; false
// keeps the host's per-file rows (FileDiff) as the rollback. Tests pin either side through PierreChangesBodyContext.
export const PIERRE_CHANGES_BODY_SWITCH = "local_pierre_changes_body";
export const PierreChangesBodyContext = React.createContext(hostGrowthBookFlag(PIERRE_CHANGES_BODY_SWITCH));
// shared-frame co() (Jd `dt = W()`): a pop-out pane window (main.jsx PopoutApp, `?popout=<session>&pane=changes`) shows
// the per-file list, not the CodeView.
export function inPopoutPaneWindow(win = typeof window === "undefined" ? null : window) {
  try { return !!win && new URLSearchParams(win.location?.search ?? "").has("popout"); } catch { return false; }
}

// mi's input (Jd `X`, the cb61be3a2 comparison: GitHub-shaped files {filename, status, additions, deletions, changes,
// patch, previous_filename}, `lazy_file_hunks` when patches are read per file) from the host's parsed sections. A
// withheld file (withComparisonFiles' lazyPatch) has no patch and is read through fetchFilePatch (c44d00c7f Yl: no
// patch, a fetcher, changes > 0); every other file carries its own patch text (a header-only one for a binary, mode or
// pure rename change, which ci parses to a body-less header).
const PIERRE_STATUS = Object.freeze({ added: "added", deleted: "removed", renamed: "renamed", copied: "copied", modified: "modified" });
export function pierreComparison(sections, { completeContext = false } = {}) {
  const files = [], lines = new Map();
  let lazy = false;
  for (const section of sections ?? []) {
    if (section?.type !== "file" || !section.path) continue;
    const additions = Number.isFinite(section.added) ? section.added : 0, deletions = Number.isFinite(section.removed) ? section.removed : 0;
    const previous = renamedFrom(section) ?? (section.status === "copied" && section.copiedFrom ? section.copiedFrom : undefined);
    const file = { filename: section.path, status: PIERRE_STATUS[section.status] ?? "modified", additions, deletions, changes: additions + deletions,
      ...(previous ? { previous_filename: previous } : {}) };
    if (section.lazyPatch) { lazy = true; files.push(file); continue; }
    const complete = pierreCompleteFile(section, completeContext);
    if (complete) lines.set(section.path, complete.fileLines);
    files.push({ ...file, patch: complete?.patch ?? (typeof section.raw === "string" && section.raw ? section.raw : undefined) });
  }
  return { comparison: { files, merge_base: "", lazy_file_hunks: lazy }, fileLines: lines };
}
// The workspace diff asks git for complete context (main.jsx `completeContext: true`), so a modified text file is one
// hunk holding the whole file. The official comparison is a 3-line-context patch whose unchanged runs pierre expands from
// the file's two texts (fetchFileLines → c44d00c7f fi {oldFile, newFile}); both are rebuilt here from that one hunk.
export const PIERRE_CONTEXT_LINES = 3;
const NO_NEWLINE_MARK = "\\ No newline at end of file";
export function pierreCompleteFile(section, completeContext, context = PIERRE_CONTEXT_LINES) {
  if (!contextRegions(section, completeContext)) return null;
  const items = [];
  let oldEnd = true, newEnd = true;
  for (const row of section.hunks[0].rows ?? []) {
    if (row.type === "note") {
      const last = items.at(-1);
      if (!last) continue;
      last.note = true;
      if (last.type !== "added") oldEnd = false;
      if (last.type !== "removed") newEnd = false;
      continue;
    }
    items.push({ ...row, note: false });
  }
  const changed = items.flatMap((item, index) => (item.type === "context" ? [] : [index]));
  if (!changed.length) return null;
  const oldLines = items.filter((item) => item.type !== "added").map((item) => item.text);
  const newLines = items.filter((item) => item.type !== "removed").map((item) => item.text);
  const text = (list, end) => (list.length ? `${list.join("\n")}${end ? "\n" : ""}` : "");
  const groups = [];
  for (const index of changed) {
    const start = Math.max(0, index - context), end = Math.min(items.length - 1, index + context);
    const last = groups.at(-1);
    if (last && start <= last.end + 1) last.end = Math.max(last.end, end); else groups.push({ start, end });
  }
  const hunk = section.hunks[0];
  const before = (index, key, origin) => { for (let at = index - 1; at >= 0; at--) if (items[at][key] != null) return items[at][key]; return origin - 1; };
  const body = groups.map(({ start, end }) => {
    const part = items.slice(start, end + 1);
    const oldCount = part.filter((item) => item.type !== "added").length, newCount = part.filter((item) => item.type !== "removed").length;
    const oldStart = oldCount ? part.find((item) => item.oldLine != null).oldLine : before(start, "oldLine", hunk.oldStart);
    const newStart = newCount ? part.find((item) => item.newLine != null).newLine : before(start, "newLine", hunk.newStart);
    return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...part.flatMap((item) => (item.note ? [item.raw, NO_NEWLINE_MARK] : [item.raw]))].join("\n");
  });
  const raw = String(section.raw ?? "").split("\n");
  const header = raw.slice(0, Math.max(0, raw.findIndex((line) => line.startsWith("@@"))));
  return { patch: `${[...header, ...body].join("\n")}\n`,
    fileLines: { oldText: section.status === "added" ? "" : text(oldLines, oldEnd), newText: section.status === "deleted" ? "" : text(newLines, newEnd) } };
}

// onAnnotationSaved / the comment store → the composer. Jd's caller (cccc2cf0a) answers a saved comment with
// `requestComposerAction(submit ? "submit" : "focus")`, the composer reading the session's saved annotations from
// cc8941b7b; the host composer carries a saved comment as a keyed snippet (main.jsx onSaveComment, the host rows' path),
// so each comment the store saves, edits or removes for the session is written to or taken out of the composer, and
// the card's keyboard save (`t.viaKeyboard && v?.({submit})`) focuses / submits through the same call.
export function pierreCommentEntry(annotation, scope) {
  const path = annotation.filePath;
  return { id: annotation.id, path, start: annotation.startLine, end: annotation.endLine, side: annotation.side, code: annotation.snippet ?? "",
    body: annotation.body, savedBody: annotation.body, key: diffCommentAttachmentKey(scope, path, annotation.id) };
}
const isLineComment = (annotation) => annotation?.source !== "pr" && annotation?.source !== "file" && annotation?.source !== "finding";
export function sessionLineComments(state, sessionId) {
  const out = new Map();
  for (const list of Object.values(state.annotationsBySession?.[sessionId] ?? {})) for (const annotation of list ?? []) if (isLineComment(annotation)) out.set(annotation.id, annotation);
  return out;
}
/** What changed between two sessionLineComments snapshots: added or edited comments (saved), and removed ones. */
export function lineCommentChanges(before, next) {
  const saved = [], removed = [];
  for (const [id, annotation] of next) if (before.get(id) !== annotation) saved.push(annotation);
  for (const [id, annotation] of before) if (!next.has(id)) removed.push(annotation);
  return { saved, removed };
}
export function usePierreCommentBridge(sessionId, scope, fileActions) {
  const actions = useRef(fileActions);
  actions.current = fileActions;
  const lastSaved = useRef(null);
  const send = useCallback((annotation, options) => {
    const entry = pierreCommentEntry(annotation, scope);
    if (actions.current?.onSaveComment) actions.current.onSaveComment(entry, options);
    else if (!options.viaKeyboard) addToPrompt(serializeLineComment({ path: entry.path, start: entry.start, end: entry.end, side: entry.side, code: entry.code, text: entry.body }));
  }, [scope]);
  useEffect(() => {
    if (!sessionId) return undefined;
    let known = sessionLineComments(useDiffAnnotationStore.getState(), sessionId);
    return useDiffAnnotationStore.subscribe((state) => {
      const next = sessionLineComments(state, sessionId), { saved, removed } = lineCommentChanges(known, next);
      known = next;
      // r7pa-03: comments read in from another window's write (source-diff-comments annotationStoreSyncing) are that
      // window's saves, not this composer's; a comment deleted there still takes its snippet out here.
      const external = annotationStoreSyncing();
      for (const annotation of external ? [] : saved) {
        lastSaved.current = annotation;
        send(annotation, { viaKeyboard: false, submit: false });
      }
      for (const annotation of removed) {
        if (lastSaved.current?.id === annotation.id) lastSaved.current = null;
        actions.current?.onDeleteComment?.(pierreCommentEntry(annotation, scope));
      }
    });
  }, [sessionId, scope, send]);
  return useCallback((options) => {
    const annotation = lastSaved.current;
    if (annotation && actions.current?.onSaveComment) send(annotation, { viaKeyboard: true, submit: options?.submit === true });
  }, [send]);
}

// The review the Changes pane shows (SourceDiff `review`) as the store's findings (Jd's Bt effect: `wr.resolveReviewFindingPaths(i,
// a ?? "diff", Q.map(tf))` over the session's findings), so Tc places each card under its line; the card itself is the
// host's (source-pane-review.jsx PierreReviewFindingCard). The current finding is scrolled to (cc8941b7b stepReviewFinding's
// `scrollToAnnotation(e, file, {anchor: {side, line: endLine}})`).
export function pierreFindings(findings, paths) {
  return (findings ?? []).map((entry) => {
    const annotation = findingAnnotation(entry);
    const path = paths.find((candidate) => sameFindingFile(candidate, entry.file));
    return path ? { ...annotation, filePath: path } : annotation;
  });
}
function usePierreFindings(sessionId, review, paths) {
  const findings = useMemo(() => pierreFindings(review?.findings, paths), [review?.findings, paths]);
  useEffect(() => {
    if (!sessionId) return;
    diffAnnotationActions.setReviewFindings(sessionId, findings);
    diffAnnotationActions.resolveReviewFindingPaths(sessionId, "diff", paths);
  }, [sessionId, findings, paths]);
  const currentId = review?.currentId ?? null, currentSeq = review?.currentSeq;
  useEffect(() => {
    const current = currentId && findings.find((entry) => entry.id === currentId);
    if (!sessionId || !current) return;
    diffAnnotationActions.scrollToAnnotation(sessionId, current.filePath, { anchor: { side: current.side, line: current.endLine } });
  }, [sessionId, currentId, currentSeq]); // eslint-disable-line react-hooks/exhaustive-deps
}

// renderFileMenuItems (cccc2cf0a, after Ca's Attach / Copy path / Open file): the host's "Open in ▸" editors and "Show in
// Finder" (changedFileEntries), as CdsContextMenu items in the file header's official menu.
function PierreFileMenuEntries({ entries, actions }) {
  return entries.map((entry, index) => entry.kind === "submenu"
    ? <CdsContextMenu.Submenu key={`submenu-${entry.label}`}>
      <CdsContextMenu.SubmenuTrigger>{entry.label}</CdsContextMenu.SubmenuTrigger>
      <CdsContextMenu.SubmenuPopup><PierreFileMenuEntries entries={entry.items} actions={actions} /></CdsContextMenu.SubmenuPopup>
    </CdsContextMenu.Submenu>
    : <CdsContextMenu.Item key={`${entry.action}-${index}`} onClick={() => runChangedFileAction(actions, entry)}>{entry.label}</CdsContextMenu.Item>);
}
export function pierreFileMenuEntries(actions, path, { isDirectory = false } = {}) {
  return changedFileEntries(actions, path, { isDirectory }).filter((entry) => entry.action === "show-in-finder"
    || (entry.kind === "submenu" && entry.items?.some((item) => item.action === "open-in-editor")));
}

// The body: Ju inside the app's one QueryClient (files-changes' copy, the patch and file-line queries) with the image
// viewer (Xc / Yc) and the review (PierreReviewContext) the header and finding cards read.
function PierreChangesBody({ sessionId, scopeKey, sections, completeContext, layout, wordWrap, wordDiff, hideWhitespace, foldAll, collapseAll, stale,
  fileActions, review, commentScope, imageViewer }) {
  const built = useMemo(() => pierreComparison(sections, { completeContext }), [sections, completeContext]);
  const files = useMemo(() => comparisonFileEntries(built.comparison, undefined, "tree"), [built]);
  const paths = useMemo(() => files.map((file) => file.filePath), [files]);
  const scheduler = useDiffFetchScheduler(sessionId);
  const actions = useRef(fileActions);
  actions.current = fileActions;
  const lines = useRef(built.fileLines);
  lines.current = built.fileLines;
  const canFetchPatch = typeof fileActions?.fetchFilePatch === "function";
  // c44d00c7f tu: `o.schedule({fileKey, kind: "patch"}, () => r(n))`, the patch text of one comparison file ("" when none).
  const fetchFilePatch = useMemo(() => (canFetchPatch ? async (file) => {
    const patch = await actions.current?.fetchFilePatch?.({ filePath: file.filePath, previousPath: file.rawFile?.previous_filename });
    return typeof patch === "string" ? patch : "";
  } : undefined), [canFetchPatch]);
  // c44d00c7f eu / fi: the two texts pierre expands unchanged lines from. A complete-context hunk already holds them
  // (pierreCompleteFile); any other file (several hunks, a withheld patch read later) asks the main process
  // (fileActions.fetchFileLines → workspace-git-file-text, W14-code r7 r7pa-05; cb61be3a2 getDiffFileContent).
  const canFetchLines = typeof fileActions?.fetchFileLines === "function";
  const fetchFileLines = useMemo(() => (completeContext || canFetchLines ? async (file) => {
    const known = lines.current.get(file.filePath);
    if (known) return known;
    const read = await actions.current?.fetchFileLines?.({ filePath: file.filePath, previousPath: file.rawFile?.previous_filename });
    return read && typeof read === "object" ? { oldText: read.oldText ?? null, newText: read.newText ?? null } : { oldText: null, newText: null };
  } : undefined), [completeContext, canFetchLines]);
  const onAnnotationSaved = usePierreCommentBridge(sessionId, commentScope ?? scopeKey, fileActions);
  usePierreFindings(sessionId, review, paths);
  // qu / Wl: Open file (path) and ⌘-click on a line number (path, line).
  const onOpenFile = useMemo(() => (fileActions?.onOpenFile ? (path, line) => actions.current?.onOpenFile?.(path, line) : undefined), [!!fileActions?.onOpenFile]); // eslint-disable-line react-hooks/exhaustive-deps
  const onAttachFile = useMemo(() => (fileActions?.onAttachFile ? (path) => actions.current?.onAttachFile?.(path) : undefined), [!!fileActions?.onAttachFile]); // eslint-disable-line react-hooks/exhaustive-deps
  const resolveAbsolutePath = useCallback((path) => absoluteDiffPath(actions.current?.root, path) ?? undefined, []);
  const renderFileMenuItems = useCallback((path, { separatorBefore = false, isDirectory = false } = {}) => {
    const entries = pierreFileMenuEntries(actions.current, path, { isDirectory });
    return entries.length ? <>{separatorBefore && <CdsContextMenu.Separator />}<PierreFileMenuEntries entries={entries} actions={actions.current} /></> : null;
  }, []);
  return <QueryClientProvider client={fileBrowserQueryClient}>
    <DiffImageViewerShownContext.Provider value={!!imageViewer}>
      <DiffImageViewerContext.Provider value={imageViewer ?? null}>
        <PierreReviewContext.Provider value={review}>
          <PierreChanges sessionId={sessionId} files={files} foldScope={scopeKey} foldsProvisional={!!stale} collapseAll={collapseAll}
            fetchFileLines={fetchFileLines} fetchFilePatch={fetchFilePatch} fetchScheduler={scheduler} onOpenFile={onOpenFile} onAttachFile={onAttachFile}
            onAnnotationSaved={onAnnotationSaved} renderFileMenuItems={renderFileMenuItems} resolveAbsolutePath={resolveAbsolutePath}
            diffStyle={layout} expandUnchanged={false} wordWrap={wordWrap} wordDiff={wordDiff} hideWhitespace={hideWhitespace} foldAll={foldAll ?? undefined} />
        </PierreReviewContext.Provider>
      </DiffImageViewerContext.Provider>
    </DiffImageViewerShownContext.Provider>
  </QueryClientProvider>;
}
// The server render has no store snapshot for qu's prefetcher (`$u`: useSyncExternalStore without getServerSnapshot):
// the body mounts on the client only; a server render (tests) gets qu's root box.
const noSubscribe = () => () => {};
function useClientRender() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
function PierreChangesMount(props) {
  const client = useClientRender();
  return client ? <PierreChangesBody {...props} /> : <div className="relative flex-1 min-h-0" data-pierre-changes="" />;
}

// The sections the body draws: the Changed files column's order, and — for the host rows only (R7DC-01: the official body
// is handed hideWhitespace: false here and filters per file itself) — Hide whitespace's filter on every file Ca does not pause.
export function shownDiffSections(sections, { listed = false, tree = true, groupByKind = false, hideWhitespace = false, paused = NO_PAUSE } = {}) {
  const ordered = listed ? orderDiffSections(sections, { tree, groupByKind }) : sections;
  return hideWhitespace ? ordered.map((section) => (paused.has(section.path) ? section : whitespaceHidden(section))) : ordered;
}

/** Render only the actual local Codex/Git patch; no inferred unchanged lines.
 * placement "changes" (the Changes pane, source-session.jsx FilePane) renders the
 * c219730b0 We/Ze/$e header with fileActions {root, onCopy, onOpenFile,
 * onAttachFile, and for the B16 menus/drag: editors, onOpenInEditor, onRevealFile,
 * revealRoot, onAttachFiles, onDragFiles}; W14-code pa2-04: that is the only placement now (the inline one is gone).
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
 *   onCanFitChange, toggleShortcut, sessionId}: the body is laid out beside the "Changed files" column
 *   (sessionId keys the tree's remembered folders, sections and scroll top, c44d00c7f Ho/Xo/Ko)
 *   (ChangesFileLayout, which also owns the .source-changes scroller), files
 *   follow the column order (Mn tree/list path order, ka by kind), and selecting
 *   a row expands that file and scrolls it to the top (Zt).
 * - stale (B15, c44d00c7f Xc/al): the comparison shown is the previous scope's while the new one loads:
 *   the column's tree and the body carry aria-busy (the body also data-stale) and dim to 60% after 200ms.
 * - commits (B15, c44d00c7f Zr): {list, total, selectedSha, uncommittedSelected, onSelect(sha|null),
 *   onSelectUncommitted, collapsed, onCollapsedChange}; the "Commits" section under the file tree.
 * - emptyPlaceholder (B15, c44d00c7f cl Ne at :7273): with fileList and no patch, the body shows this
 *   (the empty Changes state) beside the column, so the Commits section stays reachable. */
export function SourceDiff({ value = "", scopeKey = "standalone", layout = "unified", wordWrap = true, completeContext = false, onCanFitSplitChange, foldAll = null, fileActions = null,
  wordDiff = true, hideWhitespace = false, fileList = null, onIsLargeChange, review = null, commentScope = null, stale = false, commits = null, emptyPlaceholder = null, patchesWithheld, comparisonFiles }) {
  const root = useRef(null), [canFitSplit, setCanFitSplit] = useState(true);
  const placeholderShown = !!fileList && !!emptyPlaceholder && !String(value ?? "").trim();
  // W14-code r6 pierre: the split-fit observer follows the body root across the official / host body switch.
  const pierreRoot = useContext(PierreChangesBodyContext) && !!fileList?.sessionId;
  useLayoutEffect(() => (root.current ? observeDiffSplitFit(root.current, fit => { setCanFitSplit(fit); onCanFitSplitChange?.(fit); }) : undefined), [scopeKey, onCanFitSplitChange, placeholderShown, pierreRoot]);
  const actualLayout = layout === "split" && canFitSplit ? "split" : "unified";
  // R4i-files FI2: comparisonFiles (the main process's files with counts) completes the withheld header-only blocks.
  const parsedPatch = useMemo(() => parseUnifiedDiff(value), [value]);
  const parsed = useMemo(() => ({ ...parsedPatch, sections: withComparisonFiles(parsedPatch.sections, comparisonFiles) }), [parsedPatch, comparisonFiles]);
  const entries = useMemo(() => withRawFiles(diffFileEntries(parsed.sections), parsed.sections), [parsed]);
  // $e: Qe = patchesWithheld, Fe = fileActions.fetchFilePatch, He = false (see isLargeDiff).
  const lazyPatches = typeof fileActions?.fetchFilePatch === "function";
  const large = isLargeDiff(entries, { withheld: patchesWithheld, lazyPatches, singleList: false });
  // c44d00c7f Jd: a fold-all request applies when it collapses or the diff is not large (`(le.collapsed || !qt) && …`);
  // an expand-all that arrives while the diff is large is consumed without effect (the Changes menu disables it then).
  const ignoredFold = useRef(null);
  if (foldAll && !foldAll.collapsed && large && ignoredFold.current !== foldAll) ignoredFold.current = foldAll;
  const foldRequest = foldAll && ignoredFold.current !== foldAll ? foldAll : null;
  const listed = !!fileList, tree = fileList?.tree !== false, groupByKind = !!fileList?.groupByKind;
  // c44d00c7f Jd: the session the Changes pane serves; the official body is drawn in the main window's Changes pane.
  const targetSession = fileList?.sessionId ?? undefined;
  // W14-code r6 pierre: Jd's `pt = Le(!dt && !Ye)` — the main window's Changes pane (a session, the Changed files layout,
  // not a pop-out window) draws the official body (PierreChangesBody) unless local_pierre_changes_body is off.
  const pierreSwitch = useContext(PierreChangesBodyContext);
  const pierre = pierreSwitch && listed && !!targetSession && !inPopoutPaneWindow();
  // R3-files FT-07 (diffgit-11): c44d00c7f hides a file's whitespace changes only while Ca says nothing is anchored on
  // its lines (`hideWhitespace: k && !Ca({annotations, prComments, findings, drafts})`, per file of the list).
  // W14-code r7 (R7DC-01): that is the host rows' own filter (FileDiff, the rollback). The official body gets the
  // unfiltered sections: Ju pauses or hides per file itself (c44d00c7f qu `hideWhitespace:N&&!Dc({annotations:c,
  // prComments:l,findings:u,drafts:d})` over the cc8941b7b store, then `ci(s,void 0,{hideWhitespace:f.hideWhitespace})`).
  const hostWhitespace = hideWhitespace && !pierre;
  const paused = useWhitespacePausedFiles({ parsed, active: hostWhitespace, commentScope, findings: review?.findings ?? null });
  const sections = useMemo(() => shownDiffSections(parsed.sections, { listed, tree, groupByKind, hideWhitespace: hostWhitespace, paused }),
    [parsed, hostWhitespace, listed, tree, groupByKind, paused]);
  const patchQueue = useMemo(() => createPatchFetchQueue(), [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const reportLarge = useRef(onIsLargeChange);
  reportLarge.current = onIsLargeChange;
  useEffect(() => { reportLarge.current?.(large); }, [large]);
  const [activePath, setActivePath] = useState(null);
  const [reveal, setReveal] = useState(null);
  // c44d00c7f Jd: a tree pick is `$r = e => wr.scrollToAnnotation(i, e, {tileId: a})`, and a request the pane resolves to
  // one of its files is `wr.scrollToAnnotation(i, t[0].filePath, {tileId: ei.tileId, anchor: ei.anchor})`; the session's
  // scroll target (diff-reveal.mjs, cc8941b7b scrollTargetBySession) is what the tree counts as a jump (Vo). The host
  // selects the file directly and records the target beside it; the tile is the host's undefined Changes tile.
  const selectFile = useCallback((path, anchor) => {
    setActivePath(path);
    setReveal((previous) => ({ path, seq: (previous?.seq ?? 0) + 1 }));
    scrollDiffTarget(targetSession, path, anchor ? { anchor } : undefined);
    // The body takes the pick from the session's scroll target in the official store (qu's Qt effect over cc8941b7b vr:
    // un-collapse the file, prioritise its patch, scroll it — or its anchor line — into view, clearScrollTarget).
    if (pierre) diffAnnotationActions.scrollToAnnotation(targetSession, path, anchor ? { anchor } : undefined);
  }, [targetSession, pierre]);
  // A file row of the per-turn edits card (diff-reveal.mjs): that file's section, as a file-list selection.
  useEffect(() => {
    const take = () => { const request = takeDiffRevealRequest(entries.map((entry) => entry.filePath)); if (request) selectFile(request.path, request.anchor); };
    take();
    return subscribeDiffReveal(take);
  }, [entries, selectFile]);
  // c44d00c7f (the Qt effect): a plain target naming a listed file is taken by the diff (wr.clearScrollTarget(e)) once it
  // has been shown; the host's reveal effect below has already put the section on screen.
  const target = useSyncExternalStore(subscribeDiffTargets, () => diffTarget(targetSession), () => undefined);
  useEffect(() => {
    if (!target || target.fuzzy || target.tileId || !entries.some((entry) => entry.filePath === target.filePath)) return;
    clearDiffTarget(targetSession);
  }, [target, targetSession, entries]);
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
  const canFetchImages = typeof fileActions?.fetchImage === "function";
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
  const changeFiles = useMemo(() => sections.filter((section) => section.type === "file" && section.path && !section.fallbackReason)
    .map((section) => ({ id: section.path, targets: diffChangeTargets(section.path, section.hunks) })), [sections]);
  const changeFilesRef = useRef(changeFiles);
  changeFilesRef.current = changeFiles;
  const lastChange = useRef(null);
  useEffect(() => {
    const view = root.current;
    // The official body registers F7 / ⇧F7 itself (qu Gl: Fn nextDiffChange / prevDiffChange on the pane root).
    if (!view || pierre) return undefined;
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
  }, [scopeKey, placeholderShown, pierre]);
  // panes:C2-7 (c44d00c7f Jd Qn): ⌥F9 / ⇧⌥F9 next / previous PR review comment, beside the change keys above. The host has
  // no PR review comments (NO_PR_COMMENTS), so the official enabled condition (kt.open.length > 0) keeps it off.
  usePrCommentShortcuts({ rootRef: root, files: entries.length });
  const banner = large && entries.length > 0
    ? <div className="sdiff-large-banner shrink-0 px-md py-1.25 text-body text-muted-as-secondary">{DIFF_FILE_LIST_LABELS.largeBanner}</div> : null;
  const view = <div ref={root} key={scopeKey} data-layout={actualLayout} data-word-wrap={wordWrap} data-word-highlight={wordDiff} data-hide-whitespace={hideWhitespace || undefined} data-large-diff={large || undefined} className="source-diff sdiff-view" data-source-component="FileDiff" data-placement="changes">
    {!listed && banner}
    {sections.map((section) => section.type === "file" && section.lazyPatch && lazyPatches
      ? <LazyFileDiff key={`lazy:${section.path}`} file={section} fetchFilePatch={fileActions.fetchFilePatch} queue={patchQueue} scopeKey={scopeKey} layout={actualLayout} completeContext={false} foldAll={foldRequest} fileActions={fileActions} wordDiff={wordDiff}
        defaultExpanded={!large} reveal={reveal} review={review} commentScope={commentScope} imageViewer={imageViewer} />
      : section.type === "file"
      ? <FileDiff key={`${section.id}:${section.path}`} file={section} scopeKey={scopeKey} layout={actualLayout} completeContext={completeContext} foldAll={foldRequest} fileActions={fileActions} wordDiff={wordDiff}
        defaultExpanded={!large} reveal={reveal} review={review} commentScope={commentScope} imageViewer={imageViewer} />
      : <RawPatch key={section.id} value={section.raw} reason={section.reason} />)}
  </div>;
  // c44d00c7f Jd: a comparison listing files none of which has a patch to show (cd14a8022 F: no `patch`, not
  // lazy_file_hunks) renders only "Diff content unavailable for {count} files." — here the main process's files arrived
  // and the patch yielded no file section.
  if (Array.isArray(comparisonFiles) && comparisonFiles.length > 0 && entries.length === 0 && !String(value ?? "").trim())
    return <div className="flex h-full items-center justify-center text-body text-muted-as-secondary">
      {tn(comparisonFiles.length, "Diff content unavailable for {count} file.", "Diff content unavailable for {count} files.")}</div>;
  if (!listed) return <>{view}{imageDialog}</>;
  // The official body sits in the layout's main column (qu's root `relative flex-1 min-h-0`; the CodeView is the scroll
  // root and the "Changes" group itself, ca7ba268c La); root measures the split fit there as on the host body.
  const body = placeholderShown ? <div className="min-h-0 flex-1 h-full">{emptyPlaceholder}</div>
    : pierre ? <div ref={root} className="relative flex min-h-0 flex-1 flex-col" data-layout={actualLayout} data-pierre-changes-body="">
      <PierreChangesMount sessionId={targetSession} scopeKey={scopeKey} sections={sections} completeContext={completeContext} layout={actualLayout}
        wordWrap={wordWrap} wordDiff={wordDiff} hideWhitespace={hideWhitespace} foldAll={foldRequest} collapseAll={large} stale={stale}
        fileActions={fileActions} review={review} commentScope={commentScope} imageViewer={imageViewer} />
    </div> : view;
  return <><ChangesFileLayout fileList={fileList} entries={entries} activePath={activePath} onSelect={selectFile} onOpenFile={fileActions?.onOpenFile} actions={fileActions} banner={banner}
    stale={stale} commits={commits} pierre={pierre && !placeholderShown}>{body}</ChangesFileLayout>{imageDialog}</>;
}
// Test hooks (R3-files FT-07: SSR of the Changed files tree and a hook dispatcher over its rows).
export { LazyFileDiff as SourceLazyFileDiff };
export { DiffFileTree as SourceDiffFileTree, DiffTreeFolder as SourceDiffTreeFolder, DiffTreeFile as SourceDiffTreeFile, DiffTreeSection as SourceDiffTreeSection };
