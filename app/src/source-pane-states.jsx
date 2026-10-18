import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SourceEmptyState } from "./source-transcript-states.jsx";
import "./source-pane-states.css";
import { t } from "../electron/i18n/index.mjs";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { fileTreeRowStyle, FILE_TREE_ERROR_ROW_CLASS } from "./file-tree-row-model.mjs";

// Changes/Plan pane body states (2.2553.1). Class strings are the source strings;
// every utility they name is in the loaded original /assets/v1/c6a992d55-C0zTICcS.css.

// Spinner xo (readable/shared-frame-C_2npUJq.js:2300-2360, imported as La): bo
// sizes {sm 12/1.5, md 16/1.75, lg 20/2} through Wi (:1589, px/16 rem times
// --cds-rem-scale); nothing renders until `delay` ms have passed; track
// var(--cds-border), conic head var(--cds-text-muted) (inheritColor false);
// motion-reduce:animate-none stops the sweep.
const SPINNER_SIZES = { sm: { box: 12, stroke: 1.5 }, md: { box: 16, stroke: 1.75 }, lg: { box: 20, stroke: 2 } };
const rem = (px) => `calc(${px / 16}rem * var(--cds-rem-scale, 1))`;
export function SourceSpinner({ size = "sm", delay = 0 }) {
  const [shown, setShown] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return undefined;
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  if (!shown) return null;
  const { box, stroke } = SPINNER_SIZES[size] ?? SPINNER_SIZES.sm, width = rem(box), line = rem(stroke);
  const at = `calc(100% - ${line})`, mask = `radial-gradient(farthest-side, transparent ${at}, #000 calc(${at} + 0.5px))`;
  return <span data-cds="Spinner" className="relative inline-block shrink-0 align-middle" style={{ width, height: width }} aria-hidden="true">
    <span className="absolute inset-0 rounded-full" style={{ border: `${line} solid var(--cds-border)` }} />
    <span className="absolute inset-0 rounded-full animate-[spin_1s_linear_infinite] motion-reduce:animate-none"
      style={{ background: "conic-gradient(transparent 40%, var(--cds-text-muted))", WebkitMask: mask, mask }} />
  </span>;
}

// rh (readable/tmp-shared-20-BrTrXIRV.js:2703-2717): "flex items-center
// justify-center" + className, lg Spinner with delay 1000. xo wraps a labelled
// spinner in span[role=status].leading-[0] whose label is sr-only text; locally
// the label is the status element's aria-label so it never paints and is named
// from the first frame (no visible text either way).
export function SourceLoadingPane({ label, className = "h-full w-full", delay = 1000 }) {
  return <div className={`flex items-center justify-center ${className} source-pane-state`}>
    <span role="status" aria-label={label} className="leading-[0]"><SourceSpinner size="lg" delay={delay} /></span>
  </div>;
}

// ke (readable/panes-diff-states-current.js:54-92): loading -> rh "Loading
// changes"; otherwise div[data-diff-pane-body][tabIndex=-1].h-full.w-full
// .outline-none around EmptyState P — failed: role=alert, icon Warning and the
// fixed copy (no error detail); else "No uncommitted changes" when
// uncommittedOnly, "No changes to show" otherwise.
// B15, 2.31226.0 cb61be3a2 ze/W (readable :114-180): failed reads "Couldn’t load the changes" with a
// secondary "Try again" (busy, labelled "Loading changes", while the refetch runs) that runs the
// pane's Refresh. A local session's read never retries on its own, so the source's
// "…It will try again on its own." variant (remote sessions) does not apply.
export const CHANGES_LOADING_LABEL = t("Loading changes");
export const CHANGES_FAILED_TITLE = t("Couldn’t load the changes");
export const CHANGES_RETRY_LABEL = t("Try again");
export function changesEmptyTitle(uncommittedOnly) { return uncommittedOnly ? t("No uncommitted changes") : t("No changes to show"); }
export function SourceChangesState({ state, uncommittedOnly = false, onRetry = null, retrying = false }) {
  if (state === "loading") return <SourceLoadingPane label={CHANGES_LOADING_LABEL} />;
  const failed = state === "failed";
  return <div data-diff-pane-body="" tabIndex={-1} className="h-full w-full outline-none source-pane-state">
    <SourceEmptyState role={failed ? "alert" : undefined} icon={failed ? "Warning" : undefined}
      title={failed ? CHANGES_FAILED_TITLE : changesEmptyTitle(uncommittedOnly)}
      actions={failed && onRetry ? <SourceSettingsButton variant="secondary" busy={retrying} aria-label={retrying ? CHANGES_LOADING_LABEL : undefined}
        onClick={onRetry}>{CHANGES_RETRY_LABEL}</SourceSettingsButton> : undefined} />
  </div>;
}

// kp (readable/panes-tile-current.js:1751-1766): no content and no todos ->
// EmptyState {icon Checklist, "No plan yet", body}. Honest local adaptation of
// the body: Codex, not Claude, writes the plan (turn/plan/updated) while it works.
export const PLAN_EMPTY_TITLE = t("No plan yet");
export const PLAN_EMPTY_BODY = t("DeepSeek writes the plan here as it works. Keep chatting.");
// Jh (2.31226.0 cccc2cf0a :1361-1410) before the empty state: while the session's history loads (Os isPending /
// backfilling / reading earlier) div[role=status].animate-placeholder-reveal.h-full keyed by the session around
// EmptyState {Spinner md, "Loading…"}; when it failed, the role=alert EmptyState {Warning, "Couldn’t load earlier
// messages", body} with Hh: the Jm retry ("Loading earlier messages" while busy) that re-reads the session.
export const PLAN_LOADING_TITLE = t("Loading…");
export const PLAN_HISTORY_FAILED_TITLE = t("Couldn’t load earlier messages");
export const PLAN_HISTORY_FAILED_BODY = t("If DeepSeek wrote a plan earlier in this session, it can’t be shown here.");
export const PLAN_HISTORY_RETRY_BUSY = t("Loading earlier messages");
export function SourcePlanEmpty({ loading = false, failed = false, onRetry = null, sessionKey = null }) {
  if (loading) return <div key={sessionKey ?? undefined} role="status" className="animate-placeholder-reveal h-full source-plan-state">
    <SourceEmptyState icon={<SourceSpinner size="md" />} title={PLAN_LOADING_TITLE} />
  </div>;
  if (failed) return <SourceEmptyState textRole="alert" icon="Warning" title={PLAN_HISTORY_FAILED_TITLE} body={PLAN_HISTORY_FAILED_BODY}
    actions={typeof onRetry === "function" ? <SourcePaneRetry onRetry={onRetry} busyLabel={PLAN_HISTORY_RETRY_BUSY} failedLabel={PLAN_HISTORY_FAILED_TITLE} /> : undefined} />;
  return <SourceEmptyState icon="Checklist" title={PLAN_EMPTY_TITLE} body={PLAN_EMPTY_BODY} />;
}
// Hh (cccc2cf0a :1245-1268) around Jm: when the retry succeeds and the button unmounts with focus in it, the pane's
// [data-pane-retry-body] (else the nearest focusable pane ancestor) takes the focus (tabindex -1 until it blurs).
function SourcePaneRetry(props) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      const doc = node?.ownerDocument;
      if (!node || !doc || !node.contains(doc.activeElement)) return;
      const target = node.closest("[data-pane-retry-body]") ?? node.closest(".source-file-panel");
      queueMicrotask(() => {
        if (!target?.isConnected || (doc.activeElement && doc.activeElement !== doc.body)) return;
        const owned = !target.hasAttribute("tabindex");
        if (owned) {
          target.setAttribute("tabindex", "-1");
          const release = () => { if (doc.hasFocus()) { target.removeAttribute("tabindex"); target.removeEventListener("blur", release); } };
          target.addEventListener("blur", release);
        }
        target.focus({ preventScroll: true });
      });
    };
  }, []);
  return <span ref={ref} className="contents"><SourceTreeRetry {...props} /></span>;
}

// Files pane tree states (2.2553.1 panes-tile-current.js Ig :5496-5512), all in
// Jg (:6101-6110) "flex items-center justify-center px-lg py-2.5 text-body
// text-muted": loading -> Yg (:6111-6113) a bare sm Spinner, read error with no
// data -> fixed copy (never the raw error), no rows -> "Folder is empty".
// Local addition: the loading box is role=status with an sr-only "Loading" name
// (Yg's spinner is aria-hidden and unlabelled), so the state is announced.
export const FILES_FOLDER_ERROR = t("Couldn’t read this folder.");
export const FILES_FOLDER_EMPTY = t("Folder is empty");
export const FILES_TREE_LOADING_LABEL = t("Loading");
// Jg with "No working directory for this session" (panes-tile-current.js:4780-4786),
// the tree body of a pane without a working directory.
export const FILES_NO_WORKING_DIRECTORY = t("No working directory for this session");
const FILES_TREE_STATE_CLASS = "flex items-center justify-center px-lg py-2.5 text-body text-muted";
// Oy (2.31226.0 cccc2cf0a :5556-5590) around a local root that failed to list: "flex flex-col items-center gap-sm"
// with the error copy, then Jm (c30c42d34 f :45-67): a sm "Try again" button, busy "Listing this folder" while the
// re-list runs; when it fails again a counter re-keys an sr-only role=status span so the failed label is announced
// once per attempt. onRetry resolves true when the retry failed.
export const FILES_TREE_RETRY_LABEL = t("Try again");
export const FILES_TREE_RETRY_BUSY = t("Listing this folder");
// Jm: busyLabel names the busy button (Files: "Listing this folder"); failedLabel is announced once per failed retry.
export function SourceTreeRetry({ onRetry, failedLabel = FILES_FOLDER_ERROR, busyLabel = FILES_TREE_RETRY_BUSY }) {
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);
  const retry = () => {
    setBusy(true);
    Promise.resolve().then(onRetry).then((failed) => failed === true, () => true).then((failed) => {
      if (!live.current) return;
      setBusy(false);
      if (failed) setFailures((value) => value + 1);
    });
  };
  return <>
    <SourceSettingsButton size="sm" busy={busy} aria-label={busy ? busyLabel : undefined} onClick={retry}>{FILES_TREE_RETRY_LABEL}</SourceSettingsButton>
    <span role="status" className="sr-only">{failures > 0 && <span key={failures}>{failedLabel}</span>}</span>
  </>;
}
export function SourceFilesTreeState({ state, onRetry }) {
  if (state === "loading") return <div role="status" className={`${FILES_TREE_STATE_CLASS} source-files-tree-state`} data-tree-state="loading">
    <SourceSpinner size="sm" /><span className="sr-only">{FILES_TREE_LOADING_LABEL}</span>
  </div>;
  const body = <div className={`${FILES_TREE_STATE_CLASS} source-files-tree-state`} data-tree-state={state}>
    {state === "error" ? FILES_FOLDER_ERROR : state === "no-cwd" ? FILES_NO_WORKING_DIRECTORY : FILES_FOLDER_EMPTY}
  </div>;
  if (state !== "error" || typeof onRetry !== "function") return body;
  return <SourceTreeRetryState onRetry={onRetry}>{body}</SourceTreeRetryState>;
}
// Oy Uv(a, treeEl) (cccc2cf0a :4757-4765) + Jm u(p) (c30c42d34 :15-39): when a retry succeeds the wrapper and its
// button unmount; focus that was inside moves to the tree (the file tree column's role="tree"), else to the nearest
// tabindex=-1 ancestor, instead of falling to <body>.
function SourceTreeRetryState({ onRetry, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      const doc = node?.ownerDocument;
      if (!node || !doc || !node.contains(doc.activeElement)) return;
      const column = node.closest(".source-files-tree");
      const fallbacks = [];
      for (let el = node.parentElement?.closest('[tabindex="-1"]'); el && (fallbacks.push(el), el.tagName !== "ASIDE"); el = el.parentElement?.closest('[tabindex="-1"]'));
      queueMicrotask(() => {
        if (doc.activeElement && doc.activeElement !== doc.body) return;
        const tree = column?.isConnected ? column.querySelector('[role="tree"]') : null;
        (tree ?? fallbacks.find((el) => el.isConnected))?.focus({ preventScroll: true });
      });
    };
  }, []);
  return <div ref={ref} className="flex flex-col items-center gap-sm source-files-tree-retry">{children}<SourceTreeRetry onRetry={onRetry} /></div>;
}

// Lg (panes-tile-current.js:5547-5570): the only row Pg (:5335-5350) adds for a
// subfolder without data is a failed read, {kind:"error"} at the children's
// depth. A focusable (tabIndex -1) treeitem the roving keys reach, with no
// [data-tree-primary] button, so Enter/Space/click do nothing; style ko(depth)
// (c621b1e2d o) = paddingLeft 8 + depth * 8 over px-lg.
// B33 (cccc2cf0a ky :5600-5617): the row also carries the Ec indent guides (style xc = padding + ce9ca5630 g).
// R2-files FT-01 (2.42304.0 cccc2cf0a AS): style Ll(t) = ca7840910 V (padding-inline-start plus the guides), and
// the muted text is text-muted-as-secondary. R3-files FT-14: the class is AS's own, generated (shared-6 vh
// "min-h-control app-list-row-min", ca7840910 j, the kept-guide layer that paints on the row itself); the hand-written
// .source-tree-error / .source-tree-guided rules are gone. data-row-index / data-parent-index (AS's rowIndex /
// parentIndex props) are written by the tree's indexTreeRows once rendered, since the nested tree knows no flat index.
export function SourceTreeErrorRow({ depth }) {
  return <div role="treeitem" aria-level={depth + 1} data-tree-row="" tabIndex={-1}
    className={FILE_TREE_ERROR_ROW_CLASS}
    style={fileTreeRowStyle(depth)}>
    <span className="truncate">{FILES_FOLDER_ERROR}</span>
  </div>;
}

// Empty file preview (panes-tile-current.js:6355-6390): EmptyState yu (the
// cc0a875c8 EmptyState SourceEmptyState restates) with icon Folder inside
// "flex min-h-0 min-w-0 flex-1 flex-col". p = open tab count, N = tree shown.
// Clicking a file path in the transcript opens the Files pane locally too.
export function filesEmptyPreviewCopy({ tabs, treeShown }) {
  return tabs > 0
    ? { title: t("No file selected"), body: t("Pick an open file above, or click a file path in the conversation.") }
    : { title: t("Open files appear here"), body: treeShown
      ? t("Pick a file in the tree, or click a file path in the conversation.")
      : t("Click a file path in the conversation to open it.") };
}
export function SourceFilesEmptyPreview({ tabs, treeShown }) {
  const { title, body } = filesEmptyPreviewCopy({ tabs, treeShown });
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col source-file-empty-preview">
    <SourceEmptyState icon="Folder" title={title} body={body} />
  </div>;
}
