import { EpitaxyCsvPreview } from './generated/code-current/csv-view.mjs';
import { SourceFileBreadcrumb } from './source-file-breadcrumb.jsx';
export { SourceFileBreadcrumb } from './source-file-breadcrumb.jsx';
import { readFileView, rememberFileView } from './generated/code-current/file-view-memory.mjs';
import { suppressKeyRepeat } from './generated/code-editor-current/keyboard-repeat.mjs';
import { imagePng } from './response-image-model.mjs';
import { fileDownloadPlan } from './file-download-model.mjs';
import { SourceFileGoToLine } from "./source-file-go-to-line.jsx";
import { SourceFileEditor } from "./source-file-editor.jsx";
import { getFileEditor } from "./file-edit-store.mjs";
import { DEFAULT_FILE_VIEW_SETTINGS, scrollPastEndPadding, whitespaceTheme } from "./file-view-settings.mjs";
import React, { startTransition, useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { SourceTooltip } from "./source-tooltip";
import { fileFindShortcut, searchInText, findStatus, firstMatchFrom, getSearchOptions, rememberSearchOptions, stepFindIndex } from "./file-find-model.mjs";
import { useSettledHighlight } from "./use-settled-highlight.mjs";
import { SourceHighlightedLine } from "./source-diff-code.jsx";
import { SourceEmptyState } from "./source-transcript-states.jsx";
import { SourceLoadingPane, SourceSpinner } from "./source-pane-states.jsx";
import { MARKDOWN_FIRST_CHUNK_CHARS, MARKDOWN_PROGRESSIVE_CHARS, markdownChunkHeight, markdownFilePlan, releaseMarkdownFilePlan } from "./file-markdown-model.mjs";
import { Frontmatter } from "./generated/files-changes/file-frontmatter-view.mjs";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { externalLinkWarnings, fileHighlightLanguage, filePreviewKind, filePreviewUrl, fileViewerLines, fileViewerTooSlow, jumpRange, previewFrameLink, previewLinkWritten, svgPreviewUrl } from "./file-preview-model.mjs";
import { SourceDialog } from "./source-dialog.jsx";
import { FILE_MEDIA_KINDS, FILE_CARD_LABELS, addFolderFailedMessage, createFileFailedMessage, fileCardPlan, fileMediaErrorCopy, filePreviewEmpty, fileTabReason, offeredFolderLabel, VIEW_AS_TEXT_LABEL } from "./file-unavailable-model.mjs";
import { CodeBlockLabelContext, CodeBlockOverflowContext } from "./code-block-layout-model.mjs";
import { fileViewerMenu } from "./file-context-menu-model.mjs";
import { SourceMenu } from "./source-menu.jsx";
import { SourceFileMenuEntries } from "./source-file-menu-entries.jsx";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import { useSourceToasts } from "./source-toast.jsx";
import { WebLinkContext } from "./web-link-context.mjs";
import "./highlight-tokens.css";
import "./source-file-viewer.css";
import { t } from "../electron/i18n/index.mjs";

// Files pane file viewer (2.2553.1 ion-dist/assets/v1/cd2efac6e-CAi4fxTN.js,
// prettier-formatted, jo :2576-4674). Mounted by FilePane for the active tab.
// gc (:3517-3530): a flex column of the Jo/Yo subheader lead (:4794-4872) and a
// flex-1 body. The body is one of: the Zo delayed lg Spinner "Loading file"
// (:4899-4910), an unavailable card (To/Un :3602-3740; binary :4604-4612 with
// Xo "View as text anyway" :4874-4897; empty :4336-4346), or the code view
// (P.Trigger [data-file-viewer] "epitaxy-diff flex-1 min-h-0 [contain:strict]"
// :4470-4480 around the File renderer with {disableFileHeader, overflow:"wrap"}
// :3152-3160). Local adaptation: the File renderer is the Read-row pipeline
// (source-file-tool.jsx ReadBody): fileHighlightLanguage + useSettledHighlight
// + tokenLines + SourceHighlightedLine, one numbered row per line.
// Previews (q = pn ? qo(…) : null, :2650-2657 and :4474-4651): Markdown and
// CSV/TSV render as a document by default, with the subheader Eye/Code toggle
// ("Preview" / "View source"); a file opened at a line starts on its source.
// Images, video and audio (nr/ir) render from their file:// URL.
export const FILE_VIEWER_LABELS = Object.freeze({
  loading: t("Loading file"),
  pathCopied: t("Path copied to clipboard."),
  plainNotice: t("Shown as plain text: formatting this file would be too slow."),
  // The subheader Eye/Code toggle (cd2efac6e :4169-4186).
  preview: t("Preview"),
  viewSource: t("View source"),
  // EpitaxyCsvPreview (cd5fd9055-AkFKEmX0.js).
  tablePreview: t("Table preview"),
  csvEmpty: t("This file is empty"),
  csvError: t("Couldn’t parse this file as a table"),
  // su (2.31226.0 cd2efac6e readable :7141-7176): the preview frame that never drew.
  frameError: t("Couldn’t load the preview"),
  tryAgain: t("Try again"),
  fileActions: t("File actions"),
});
export const copyPathLabel = (path) => t("Copy path {path}", { path });

// 2.31226.0 io/ro: find bar with the original three option buttons; the "Find in file…" field, "{current} of {total}" or "No results" (aria-live,
// text-footnote text-muted tabular-nums), then the ghost Previous match (ArrowUp) / Next match (ArrowDown) /
// Close find bar (X, esc) buttons.
export function SourceFileSearchOptions({options,onToggle}) { return (
    <span role="group" aria-label={t("Search options")} className="sfv-find-options">
      {[["matchCase", "Aa", "Match case"], ["wholeWord", "ab", "Match whole word"], ["regexp", ".*", "Use regular expression"]].map(([key, text, label]) => <SourceTooltip key={key} content={t(label)} hoverable={false}>
        <button type="button" className="source-icon-button sfv-find-option" aria-label={t(label)} aria-pressed={options[key]} onMouseDown={event => event.preventDefault()} onClick={() => onToggle(key)}><span aria-hidden="true" style={key === "wholeWord" ? { textDecoration: "underline" } : undefined}>{text}</span></button>
      </SourceTooltip>)}
    </span>
); }
function SourceFileFindBar({ query, status, options, result, inputRef, onToggle, onQuery, onNext, onPrev, onClose }) {
  const has = status.total > 0;
  const total = status.capped || result.partial || result.hasLongLines ? `${status.total.toLocaleString()}+` : status.total.toLocaleString();
  const button = (label, icon, onClick, disabled, shortcut) => <SourceTooltip content={label} shortcut={shortcut} hoverable={false}>
    <button type="button" className="source-icon-button sfv-find-button" aria-label={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick}
      onKeyDown={icon === 'X' ? event => { if (event.key === 'Enter') suppressKeyRepeat('Enter', event.currentTarget.ownerDocument.defaultView); } : undefined}>
      <Icon name={icon} size={16} />
    </button>
  </SourceTooltip>;
  return <div role="search" className="sfv-find" data-file-find=""
    onKeyDown={(event) => { if (event.key === "Escape" && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); suppressKeyRepeat('Escape', event.currentTarget.ownerDocument.defaultView); onClose(); } }}>
    <div className="sfv-find-field"><input ref={inputRef} className="sfv-find-input" aria-invalid={result.invalid || undefined} value={query} spellCheck={false} autoComplete="off" aria-label={t("Find in file")} placeholder={t("Find in file…")}
      onChange={(event) => onQuery(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); if (event.shiftKey) onPrev(); else onNext(); } }} />
    <SourceFileSearchOptions options={options} onToggle={onToggle} /></div>
    <span aria-live="polite" className="sfv-find-status">{query.length === 0 ? "" : result.invalid ? t("Invalid regular expression") : has ? t("{current} of {total}", { current: status.current.toLocaleString(), total }) : result.partial ? t("Search paused. Select Next match to continue.") : result.hasLongLines ? t("Long lines not searched") : t("No results")}</span>
    {button(t("Previous match"), "ArrowUp", onPrev, !has, "cmd+shift+g")}
    {button(t("Next match"), "ArrowDown", onNext, !has && !result.partial, "cmd+g")}
    {button(t("Close find bar"), "X", onClose, false, "esc")}
  </div>;
}

// B32 Gl / Br revealItem (cd2efac6e :6735-6748, c856385e2 Rt/Bt): an xxs secondary "Show in Finder" whose refused
// reveal toasts "Couldn’t show this file in its folder." and leaves the button disabled with that reason for this path.
function SourceCardReveal({ path, onShowFile }) {
  const toasts = useSourceToasts();
  const [refused, setRefused] = useState(null);
  if (refused === path) return <SourceTooltip disabledReason={FILE_CARD_LABELS.revealFailed}>
    <SourceSettingsButton variant="secondary" data-step="1" disabled data-card-action="reveal">{FILE_CARD_LABELS.showInFinder}</SourceSettingsButton>
  </SourceTooltip>;
  const reveal = () => {
    void Promise.resolve().then(() => onShowFile()).then((shown) => {
      if (shown === false) throw new Error("not shown");
    }).catch(() => { setRefused(path); toasts?.add(FILE_CARD_LABELS.revealFailed, { variant: "danger" }); });
  };
  return <SourceSettingsButton variant="secondary" data-step="1" onClick={reveal} data-card-action="reveal">{FILE_CARD_LABELS.showInFinder}</SourceSettingsButton>;
}

// B32 ge(setBusy, run) (cd2efac6e :5583/:5598): a card button's busy state lasts as long as its action.
function useBusyAction() {
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);
  const run = useCallback(async (action) => {
    setBusy(true);
    try { await action(); } finally { if (live.current) setBusy(false); }
  }, []);
  return [busy, run];
}

// To/Un (cd2efac6e readable :5339-5650) for the local reasons, with the B32 actions: "Try again" and "Create file"
// on the missing card (mp/Cp, xxs secondary, busy "Trying again…"/"Creating file…", each disabled while the other
// runs), the outside-root "Add folder" offer (tp: its own title and body, busy "Adding folder…", disabled with the
// failure as its reason after a refused add), and Show in Finder (Gl for outside_root, Br's uc for binary) before
// "View as text anyway" (cu :7179-7203).
function SourceFileUnavailable({ reason, path, creatable, onViewAsText, cardActions = null }) {
  const toasts = useSourceToasts();
  const [retrying, runRetry] = useBusyAction();
  const [creating, runCreate] = useBusyAction();
  const [adding, runAdd] = useBusyAction();
  const card = useRef(null);
  const name = String(path).split(/[\\/]/).pop() || String(path);
  // tp/ep: the folder offer for an outside-root file, asked once per path (staleTime Infinity) and again after an add.
  const [offer, setOffer] = useState({ key: null, value: null });
  const [offerNonce, setOfferNonce] = useState(0);
  const offerKey = reason === "outside_root" && cardActions?.suggestFolder && cardActions?.onAddFolder ? `${path}\u0000${offerNonce}` : null;
  useEffect(() => {
    if (!offerKey) return undefined;
    let live = true;
    Promise.resolve().then(() => cardActions.suggestFolder(path)).then((value) => {
      if (live) setOffer({ key: offerKey, value: value?.folder ? value : null });
    }, () => { if (live) setOffer({ key: offerKey, value: null }); });
    return () => { live = false; };
  }, [offerKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // An asked-again offer (after an add) keeps the last answer until the new one lands, as the invalidated query does.
  const folderOffer = offerKey && offer.key !== null ? offer.value : null;
  const [addRefused, setAddRefused] = useState(null);
  const plan = fileCardPlan(reason, { path, writable: !!cardActions?.onCreateFile, creatable, canAskClaude: !!cardActions?.canAskClaude,
    folderOffer: folderOffer?.folder ?? null, canReveal: !!cardActions?.onShowFile, canViewAsText: !!onViewAsText });
  // dp: when a Try again / Create file / Add folder re-read makes the card go away, the focus it held moves to the
  // viewer instead of the document body. The re-read's tab update commits after onRetry resolves, so the handoff runs
  // in this card's unmount (layout cleanup, while its nodes are still attached) until a render shows the card still
  // there with no action running.
  const handoff = useRef(false);
  const focusViewer = useRef(null);
  focusViewer.current = cardActions?.focusViewer ?? null;
  useLayoutEffect(() => () => {
    const node = card.current;
    if (handoff.current && node?.contains(node.ownerDocument.activeElement)) focusViewer.current?.();
  }, []);
  useEffect(() => { if (!retrying && !creating && !adding) handoff.current = false; });
  const retry = async () => {
    handoff.current = true;
    await cardActions?.onRetry?.();
  };
  const create = async () => {
    let result;
    try { result = await cardActions.onCreateFile(); } catch { result = undefined; }
    if (!result || result.status === "failed") { toasts?.add(createFileFailedMessage(name), { variant: "danger" }); return; }
    await retry();
  };
  const addFolder = async () => {
    const folder = folderOffer?.folder;
    if (!folder) return;
    let added = false;
    try { added = await cardActions.onAddFolder(folder); } catch { added = false; }
    if (!added) { setAddRefused(`${path}\u0000${folder}`); toasts?.add(addFolderFailedMessage(folder), { variant: "danger" }); return; }
    await retry();
    setOfferNonce((value) => value + 1);
  };
  const folderLabel = folderOffer ? offeredFolderLabel(folderOffer.folder, folderOffer.home) : "";
  const [offerBefore, offerAfter = ""] = t("Add {folder} to open this file. Claude can then use that folder in this session.").split("{folder}");
  const body = plan.offer
    ? <>{offerBefore}<span className="select-text break-all" title={plan.offer}>{folderLabel}</span>{offerAfter}</>
    : plan.body && <>{plan.body}{plan.showsPath && <><br /><span className="select-text break-all">{path}</span></>}</>;
  // xxs secondary CDS Button: the xxs size is data-step="1" (shared-frame :2976).
  const button = (label, onClick, extra = {}) => <SourceSettingsButton variant="secondary" data-step="1" onClick={onClick} {...extra}>{label}</SourceSettingsButton>;
  const revealButton = plan.reveal && <SourceCardReveal path={path} onShowFile={cardActions.onShowFile} />;
  const addKey = plan.offer ? `${path}\u0000${plan.offer}` : null;
  const actions = <>
    {plan.retry && button(FILE_CARD_LABELS.tryAgain, () => void runRetry(retry),
      { busy: retrying, "aria-label": retrying ? FILE_CARD_LABELS.tryingAgain : undefined, disabled: creating, "data-card-action": "retry" })}
    {plan.create && button(FILE_CARD_LABELS.createFile, () => void runCreate(create),
      { busy: creating, "aria-label": creating ? FILE_CARD_LABELS.creatingFile : undefined, disabled: retrying, "data-card-action": "create" })}
    {plan.offer && (addRefused === addKey
      ? <SourceTooltip disabledReason={addFolderFailedMessage(plan.offer)}>{button(FILE_CARD_LABELS.addFolder, undefined, { disabled: true, "data-card-action": "add-folder" })}</SourceTooltip>
      : button(FILE_CARD_LABELS.addFolder, () => void runAdd(addFolder), { busy: adding, "aria-label": adding ? FILE_CARD_LABELS.addingFolder : undefined, "data-card-action": "add-folder" }))}
    {revealButton}
    {plan.viewAsText && button(VIEW_AS_TEXT_LABEL, onViewAsText)}
  </>;
  const hasActions = plan.retry || plan.create || !!plan.offer || !!revealButton || plan.viewAsText;
  // ip (cd2efac6e :5135, :5302): while the first folder offer is still being asked the viewer shows its loading state
  // (lu) rather than the plain outside-root card that the offer card would then replace.
  if (offerKey && offer.key === null) return <SourceLoadingPane label={FILE_VIEWER_LABELS.loading} />;
  return <div ref={card} className="contents">
    <SourceEmptyState role={plan.role} title={<span className="select-text">{plan.title}</span>} body={body} actions={hasActions ? actions : null} />
  </div>;
}

// The code view: rows of a muted tabular-nums gutter (as the Read rows'
// .sft-read-number, sized by the digit count of the last line) and the
// highlighted code, wrapped (overflow "wrap"). line..endLine are the jump range:
// those rows carry data-active (da :1529-1549, at most 200 rows) and the first
// one is centred once per request (fa :1550-1576: only when it is not already
// in view).
// Preserve literal text (including tabs) for selection, copying and find offsets.
function visibleWhitespace(text) {
  return text.split(/([ \t])/).map((part, index) => part === ' ' || part === '\t'
    ? <span key={index} className={part === ' ' ? 'sfv-space' : 'sfv-tab'}>{part}</span> : part);
}

function SourceFileCode({ path, text, line, endLine, scrollNonce, scopeKey, find = null, settings = DEFAULT_FILE_VIEW_SETTINGS }) {
  const scroller = useRef(null);
  const [scrollPadding, setScrollPadding] = useState(0);
  const [whitespacePaint, setWhitespacePaint] = useState(() => whitespaceTheme('#898781'));
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const measure = () => {
      const style = getComputedStyle(node);
      setScrollPadding(scrollPastEndPadding(node.clientHeight, parseFloat(style.lineHeight) || 20, parseFloat(style.paddingTop) || 0));
      setWhitespacePaint(whitespaceTheme(getComputedStyle(node.querySelector('.sfv-number') || node).color));
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    const theme = new MutationObserver(measure); theme.observe(node.ownerDocument.documentElement, { attributes: true, attributeFilter: ['style', 'data-mode', 'data-theme'] });
    return () => { observer.disconnect(); theme.disconnect(); };
  }, []);
  const language = fileHighlightLanguage(path);
  const tooSlow = useMemo(() => fileViewerTooSlow(text, language), [text, language]);
  const tokens = useSettledHighlight({ text, language: tooSlow ? "text" : language, isFrontier: false, languageSettled: true, scopeKey }, scroller);
  const lines = useMemo(() => fileViewerLines(tokens, text), [tokens, text]);
  const range = jumpRange(line, endLine);
  const jumped = useRef(null);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!range || !node) return;
    const key = `${path}\u0000${range.first}\u0000${range.last}\u0000${scrollNonce ?? ""}`;
    if (jumped.current === key) return;
    const row = node.querySelector(`[data-line="${range.first}"]`);
    if (!row) return;
    jumped.current = key;
    const box = node.getBoundingClientRect(), rect = row.getBoundingClientRect();
    const inView = rect.top >= box.top && rect.bottom <= box.bottom;
    const covers = rect.height > box.height && rect.bottom > box.top && rect.top < box.bottom;
    if (!inView && !covers) node.scrollTop += (rect.top + rect.bottom) / 2 - (box.top + box.bottom) / 2;
  }, [path, range?.first, range?.last, scrollNonce, lines.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // oa: every match is ::highlight(match), the current one ::highlight(current), its row tinted; the current match is
  // centred when it is out of view.
  const findId = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const names = { match: `sfv-find-match-${findId}`, current: `sfv-find-current-${findId}` };
  const activeMatch = find && find.index >= 0 ? find.matches[find.index] : null;
  useLayoutEffect(() => {
    const node = scroller.current, view = node?.ownerDocument.defaultView;
    const registry = view?.CSS?.highlights, Highlight = view?.Highlight;
    const clear = () => { registry?.delete(names.match); registry?.delete(names.current); };
    if (!node || !find || !find.matches.length) { clear(); return undefined; }
    const rangeAt = (match) => {
      const code = node.querySelector(`[data-line="${match.line}"] code`);
      if (!code) return null;
      const walker = node.ownerDocument.createTreeWalker(code, 4);
      let offset = 0, start = null, range = null;
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const length = text.nodeValue.length;
        if (!start && match.start < offset + length) { range = node.ownerDocument.createRange(); range.setStart(text, match.start - offset); start = text; }
        if (start && match.end <= offset + length) { range.setEnd(text, match.end - offset); return range; }
        offset += length;
      }
      return null;
    };
    if (registry && Highlight) {
      const all = new Highlight(), current = new Highlight();
      find.matches.slice(0, 2000).forEach((match, index) => { const range = rangeAt(match); if (range) (index === find.index ? current : all).add(range); });
      if (activeMatch && find.index >= 2000) { const range = rangeAt(activeMatch); if (range) current.add(range); }
      registry.set(names.match, all);
      registry.set(names.current, current);
    }
    if (activeMatch) {
      const row = node.querySelector(`[data-line="${activeMatch.line}"]`);
      if (row) {
        const box = node.getBoundingClientRect(), rect = row.getBoundingClientRect();
        if (rect.top < box.top || rect.bottom > box.bottom) node.scrollTop += (rect.top + rect.bottom) / 2 - (box.top + box.bottom) / 2;
      }
    }
    return clear;
  }, [find, lines, settings.showWhitespace, settings.wordWrap, settings.tabSize]); // eslint-disable-line react-hooks/exhaustive-deps
  const digits = String(lines.length).length;
  return <div data-file-viewer="" className="epitaxy-diff sfv-viewer">
    {find && <style>{`::highlight(${names.match}){background:rgba(255,213,0,.25);border-radius:2px}::highlight(${names.current}){background:rgba(255,213,0,.55);color:black;border-radius:2px}`}</style>}
    <div ref={scroller} className="source-file-preview sfv-scroller select-text" data-highlighted={tokens ? "" : undefined}
      data-word-wrap={settings.wordWrap} data-show-whitespace={settings.showWhitespace || undefined} data-scroll-past-end={settings.scrollPastEnd || undefined}
      data-active-line={range ? range.first : undefined} data-active-end-line={range && range.last !== range.first ? range.last : undefined}
      style={{ "--sfv-number-width": `${Math.max(3, digits)}ch`, tabSize: settings.tabSize, "--sfv-scroll-padding": `${scrollPadding}px`, "--sfv-space-paint": whitespacePaint.space, "--sfv-tab-paint": whitespacePaint.tab }}>
      {tooSlow && <p role="note" className="sfv-plain-note">{FILE_VIEWER_LABELS.plainNotice}</p>}
      {lines.map((row, index) => {
        const number = index + 1;
        return <div key={index} className="sfv-line" data-line={number}
          data-active={range && number >= range.first && number <= range.last ? "" : undefined}
          data-find-active={activeMatch?.line === number ? "" : undefined}>
          <span className="sfv-number" data-number={number} aria-hidden="true" />
          <code className="scb-code source-diff-code"><SourceHighlightedLine tokens={row} renderText={settings.showWhitespace ? visibleWhitespace : undefined} />{index < lines.length - 1 || text.endsWith("\n") ? "\n" : ""}</code>
        </div>;
      })}
    </div>
  </div>;
}

// The preview scroller (P.Trigger with q set, :4478-4480): "flex-1 min-h-0
// overflow-y-auto [contain:strict] [scrollbar-gutter:stable_both-edges]
// select-text p-lg". It keeps .source-file-preview, the viewer scroller class.
const PREVIEW_SCROLLER = "flex-1 min-h-0 overflow-y-auto [contain:strict] [scrollbar-gutter:stable_both-edges] select-text p-lg source-file-preview sfv-preview";

// Ei (:908-937), "progressive" as the viewer calls it: a source above Si
// renders at once only when it is plain text or its first chunk is at most
// 24576 chars; otherwise it waits for a deferred render behind the Zo
// "Loading file" spinner. A source at or below Si renders at once.
function useMarkdownFileBody(text) {
  const large = text.length > MARKDOWN_PROGRESSIVE_CHARS;
  const plan = useMemo(() => (large ? markdownFilePlan(text) : null), [large, text]);
  useEffect(() => () => releaseMarkdownFilePlan(text), [text]);
  const first = plan !== null && plan.chunks.length > 1 ? plan.chunks[0] : null;
  const immediate = !large || plan.plain || (first !== null && first.length <= MARKDOWN_FIRST_CHUNK_CHARS);
  const deferred = useDeferredValue(large ? text : "", large && immediate ? text : "");
  const deferredSmall = useDeferredValue(large ? "" : text);
  if (!large || deferred === text) return { body: text, pending: false };
  const shown = deferred === "" ? deferredSmall : deferred;
  if (shown === "") return immediate ? { body: text, pending: false } : { body: "", pending: true };
  return { body: shown, pending: false };
}


// Ni (:1044-1078): one more chunk per idle period (requestIdleCallback with a
// 100 ms timeout, else a 16 ms timer), inside a transition.
function useMountedChunks(total) {
  const [count, setCount] = useState(1);
  const shown = Math.min(count, total);
  useEffect(() => {
    if (shown >= total) return undefined;
    if (typeof window === "undefined") { startTransition(() => setCount(total)); return undefined; }
    const next = () => startTransition(() => setCount(shown + 1));
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(next, { timeout: 100 });
      return () => { try { window.cancelIdleCallback(handle); } catch {} };
    }
    const timer = window.setTimeout(next, 16);
    return () => window.clearTimeout(timer);
  }, [shown, total]);
  return shown;
}

// Pi (:1079-1100): every chunk after the first skips layout while off screen,
// sized by the Vr estimate. renderMarkdown gets the chunk index so each chunk
// is its own response owner.
const SourceMarkdownChunk = React.memo(function SourceMarkdownChunk({ source, index, renderMarkdown }) {
  const style = useMemo(() => (index > 0 ? { contentVisibility: "auto", containIntrinsicSize: `auto ${markdownChunkHeight(source)}px` } : undefined), [source, index]);
  return <div className="epitaxy-file-prose epitaxy-file-prose-chunk sfv-prose" style={style}>{renderMarkdown(source, index)}</div>;
});

// Mi (:1027-1043): the mounted chunks, then the J status row while more remain.
function SourceMarkdownChunks({ chunks, renderMarkdown }) {
  const shown = useMountedChunks(chunks.length);
  return <div>
    {chunks.slice(0, shown).map((chunk, index) => <SourceMarkdownChunk key={index} source={chunk} index={index} renderMarkdown={renderMarkdown} />)}
    {shown < chunks.length && <div role="status" className="animate-placeholder-reveal flex justify-center py-lg text-muted">
      <SourceSpinner size="md" /><span className="sr-only">{FILE_VIEWER_LABELS.loading}</span>
    </div>}
  </div>;
}

// Ai (:969-992): the plain fallback (ji :993-1012, the whole source in a
// pre-wrap <pre> under the "too slow" note) when Ti says so; otherwise the
// frontmatter grid, then the body in one prose column or as chunks.
function SourceMarkdownDocument({ source, renderMarkdown, typography = "epitaxy" }) {
  const { frontmatter, body, plain, chunks } = useMemo(() => markdownFilePlan(source), [source]);
  if (plain) return <div data-markdown-plain="">
    <p role="note" className="mb-[16px] text-footnote text-muted">{FILE_VIEWER_LABELS.plainNotice}</p>
    <pre className="text-code text-primary whitespace-pre-wrap break-words select-text sfv-plain-source">{source}</pre>
  </div>;
  const content = <>
    {/* R3-files FT-18 (cov9-01): 2.42304.0 c3fde7009 Ei, variant "pane" (labels through Ti), generated. */}
    <Frontmatter frontmatter={frontmatter} />
    {chunks.length > 1
      ? <SourceMarkdownChunks chunks={chunks} renderMarkdown={renderMarkdown} />
      : <div className="epitaxy-file-prose sfv-prose">{renderMarkdown(body, 0)}</div>}
  </>;
  // R4g-files FV1 (toolcards-05): va's document typography (r === "document", the viewer outside the pane
  // presentation) renders through ya, which gives its code fences Je "scroll" and Ye "beside-actions" (c3fde7009).
  // Only those two contexts are migrated here; ya's rail, outline and change highlights stay with cov9-02.
  return typography === "document"
    ? <CodeBlockOverflowContext.Provider value="scroll"><CodeBlockLabelContext.Provider value="beside-actions">{content}</CodeBlockLabelContext.Provider></CodeBlockOverflowContext.Provider>
    : content;
}

// q === "markdown" (:4614-4631): Zo while Ei is pending, else "mx-auto
// max-w-[860px]" around Ai, whose prose is div.epitaxy-markdown
// .epitaxy-file-prose. Locally the Markdown is the response renderer
// (SourceMarkdown, handed in by the pane as renderMarkdown(text, chunk)).
function SourceFileMarkdown({ text, renderMarkdown, typography = "epitaxy" }) {
  const { body, pending } = useMarkdownFileBody(text);
  return <div data-file-viewer="" data-file-preview="markdown" className={PREVIEW_SCROLLER}>
    {pending
      ? <SourceLoadingPane label={FILE_VIEWER_LABELS.loading} />
      : <div className="mx-auto max-w-[860px]"><SourceMarkdownDocument source={body} renderMarkdown={renderMarkdown} typography={typography} /></div>}
  </div>;
}

// Current cd5fd9055: original pane/document component, including filtering,
// stable sorting, numeric cells and both upstream/parser truncation notices.
export function SourceFileCsv({ text, delimiter, presentation = "pane", truncatedUpstream = false }) {
  return <div data-file-viewer="" data-file-preview="csv" className={presentation === 'document'
    ? "flex-1 min-h-0 [contain:strict] select-text source-file-preview" : PREVIEW_SCROLLER}>
    <EpitaxyCsvPreview contents={text} delimiter={delimiter} presentation={presentation} truncatedUpstream={truncatedUpstream} />
  </div>;
}

// R (nr || ir, :4481-4609): P.Trigger "flex-1 min-h-0 [contain:strict]"
// around "h-full overflow-auto p-md flex items-center justify-center" with the
// <img> (alt = base name, "max-w-full max-h-full object-contain"), <audio>
// ("w-full max-w-[480px]") or <video> ("max-w-full max-h-full"), both
// controls + preload metadata + aria-label base name. A failed load (Jr)
// shows the Un card with "View as text anyway" (Uc).
function SourceFileMedia({ kind, path, url, onViewAsText, onShowFile = null, onImageReady }) {
  const [failed, setFailed] = useState(false);
  const name = String(path).split(/[\\/]/).pop() || String(path);
  if (failed) {
    const copy = fileMediaErrorCopy(kind);
    return <div data-file-viewer="" data-file-media={kind} data-media-state="error" className="flex-1 min-h-0 [contain:strict] sfv-media">
      <SourceEmptyState title={<span className="select-text">{copy.title}</span>} body={<span className="select-text">{copy.body}</span>}
        actions={onViewAsText || onShowFile ? <>
          {/* B32 cu(uc, …) (cd2efac6e :6605-6611): Br's reveal item first. */}
          {onShowFile && <SourceCardReveal path={path} onShowFile={onShowFile} />}
          {onViewAsText && <SourceSettingsButton variant="secondary" data-step="1" onClick={onViewAsText}>{VIEW_AS_TEXT_LABEL}</SourceSettingsButton>}
        </> : null} />
    </div>;
  }
  const onError = () => { setFailed(true); onImageReady?.(null); };
  // B13 PDF: Chromium's built-in viewer in the native preview's "h-full w-full relative overflow-hidden" box
  // (c6e1d8764 K :402-428), from the file:// URL like the other media.
  if (kind === "pdf") return <div data-file-viewer="" data-file-media={kind} className="flex-1 min-h-0 [contain:strict] sfv-media">
    <div className="h-full w-full relative overflow-hidden">
      <iframe src={url} title={name} className="h-full w-full border-0 sfv-pdf" />
    </div>
  </div>;
  return <div data-file-viewer="" data-file-media={kind} className="flex-1 min-h-0 [contain:strict] sfv-media">
    <div className="h-full overflow-auto p-md flex items-center justify-center">
      {kind === "image"
        ? <img src={url} alt={name} onLoad={event => onImageReady?.(event.currentTarget)} onError={onError} className="max-w-full max-h-full object-contain" />
        : kind === "audio"
          ? <audio src={url} controls preload="metadata" aria-label={name} onError={onError} className="w-full max-w-[480px]" />
          : <video src={url} controls preload="metadata" aria-label={name} onError={onError} className="max-w-full max-h-full" />}
    </div>
  </div>;
}

// su (cd2efac6e readable :7141-7176): the alert card of a preview that did not draw, with "View source" (xxs
// primary) and "Try again" (xxs secondary). The reference's body names the blocked user-content host; the local
// frame has no remote host, so the card keeps the title only.
function SourceFramePreviewError({ onViewSource, onRetry }) {
  return <div className="contents" data-file-preview-error="">
    <SourceEmptyState role="alert" title={FILE_VIEWER_LABELS.frameError} actions={<>
      {onViewSource && <SourceSettingsButton variant="primary" data-step="1" onClick={onViewSource}>{FILE_VIEWER_LABELS.viewSource}</SourceSettingsButton>}
      {onRetry && <SourceSettingsButton variant="secondary" data-step="1" onClick={onRetry}>{FILE_VIEWER_LABELS.tryAgain}</SourceSettingsButton>}
    </>} />
  </div>;
}

// J === "sandbox" with Ge.Html (cd2efac6e readable :6283-6330): "relative flex-1 min-h-0 flex flex-col" around the
// sandbox frame ("isolate flex-1 min-h-0 w-full border-0", title = the base name) and, until it has drawn, the
// absolute lu "Loading file" cover; after Zc (20 s) without a draw the su card replaces it. Locally the frame is
// <iframe sandbox="allow-scripts"> on the oc-file-preview document of the shown text (frame.register, main
// file-preview-frame.cjs); a web link it posts goes through the session's link chooser (WebLinkContext), the
// reference's externalLinkBehavior "ask".
export const PREVIEW_FRAME_TIMEOUT_MS = 20000;
function SourceFileHtmlFrame({ path, text, frame, onViewSource }) {
  const name = String(path).split(/[\\/]/).pop() || String(path);
  const openWebLink = React.useContext(WebLinkContext);
  const iframe = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ url: null, status: "loading" });
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    let live = true, url = null;
    setState({ url: null, status: "loading" });
    setAsk(null); // cc61d0d63 :1028: a pending link ask belongs to the content that raised it.
    Promise.resolve().then(() => frame.register(text, path)).then((result) => {
      if (!live) { if (result?.url) frame.release?.(result.url); return; }
      if (typeof result?.url !== "string") { setState({ url: null, status: "error" }); return; }
      url = result.url;
      setState({ url, status: "loading" });
    }, () => { if (live) setState({ url: null, status: "error" }); });
    return () => { live = false; if (url) frame.release?.(url); };
  }, [frame, path, text, attempt]);
  useEffect(() => {
    if (state.status !== "loading" || !state.url) return undefined;
    const timer = setTimeout(() => setState((value) => (value.url === state.url && value.status === "loading" ? { ...value, status: "error" } : value)), PREVIEW_FRAME_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.url]);
  useEffect(() => {
    const onMessage = (event) => {
      if (!iframe.current || event.source !== iframe.current.contentWindow) return;
      const link = previewFrameLink(event.data);
      if (!link || !openWebLink) return;
      // Ba / OpenExternal "ask": a click on a link the page wrote opens at once; anything else asks first (one at a time).
      if (window.navigator.userActivation?.isActive === true && previewLinkWritten(text, link.href)) openWebLink(link.href, link.event);
      else setAsk((value) => value ?? link);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openWebLink, text]);
  const linkDialog = ask && <SourceExternalLinkDialog href={ask.href} onClose={() => setAsk(null)} onConfirm={() => { setAsk(null); openWebLink?.(ask.href, ask.event); }} />;
  if (state.status === "error") return <div data-file-viewer="" data-file-preview="html" className="relative flex-1 min-h-0 flex flex-col">
    <SourceFramePreviewError onViewSource={onViewSource} onRetry={() => setAttempt((value) => value + 1)} />
    {linkDialog}
  </div>;
  return <div data-file-viewer="" data-file-preview="html" data-delivered={state.status === "ready" || undefined} className="relative flex-1 min-h-0 flex flex-col">
    {state.url && <iframe ref={iframe} key={state.url} src={state.url} sandbox="allow-scripts" title={name} allow="fullscreen; clipboard-write" referrerPolicy="no-referrer"
      className="isolate flex-1 min-h-0 w-full border-0 sfv-frame-document" onLoad={() => setState((value) => (value.url === state.url ? { ...value, status: "ready" } : value))} />}
    {state.status !== "ready" && <div className="absolute inset-0"><SourceLoadingPane label={FILE_VIEWER_LABELS.loading} /></div>}
    {linkDialog}
  </div>;
}

// cfdfec14c le (the cc61d0d63 "ask" dialog for a web link): ConfirmDialog size md, focus on Cancel, the URL in a
// scrolling box, the deceptive-domain / embedded-credentials warnings (Q), and "Open link" held disabled for the
// 400 ms activation delay (c26909c77) so a click meant for the page cannot confirm it.
export const EXTERNAL_LINK_ACTIVATION_DELAY_MS = 400;
function SourceExternalLinkDialog({ href, onClose, onConfirm }) {
  const cancel = useRef(null);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    const timer = setTimeout(() => setArmed(true), EXTERNAL_LINK_ACTIVATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [href]);
  const warnings = useMemo(() => externalLinkWarnings(href), [href]);
  const warning = (message, detail) => <div className="mt-3 rounded-lg border border-danger bg-danger p-3">
    <div className="flex items-start gap-2">
      <Icon name="Warning" size={16} className="text-danger" />
      <div className="text-body text-danger"><p className="font-medium">{message}</p><p className="mt-1 font-mono break-all">{detail}</p></div>
    </div>
  </div>;
  return <SourceDialog alert size="md" showClose={false} title={t("Open external link")} description={t("You’re leaving Claude to visit an external link:")}
    initialFocusRef={cancel} onClose={onClose}
    footer={<>
      <SourceSettingsButton ref={cancel} variant="secondary" onClick={onClose}>{t("Cancel")}</SourceSettingsButton>
      <SourceSettingsButton variant="primary" disabled={!armed} onClick={() => { if (armed) onConfirm(); }}>{t("Open link")}</SourceSettingsButton>
    </>}>
    <div className="mt-3 max-h-40 overflow-y-scroll break-all rounded-lg border bg-surface-1 px-4 py-3 text-primary">{href}</div>
    {warnings.hasUserinfo && warning(t("This link contains embedded credentials, which may be an attempt to disguise its destination. You will actually be sent to:"), warnings.host)}
    {warnings.hasPunycode && warning(t("This link contains an internationalized domain name that may be deceptive. The domain appears as:"), warnings.decodedHostname)}
  </SourceDialog>;
}

// The sandbox arm with Ge.Svg: the graphic drawn from the shown text, centred like the image body (nr), an
// <img> so no script in the file runs; a file that does not parse as SVG shows the su card.
function SourceFileSvg({ path, text, onViewSource, onImageReady }) {
  const [failed, setFailed] = useState(false);
  const name = String(path).split(/[\\/]/).pop() || String(path);
  const url = useMemo(() => svgPreviewUrl(text), [text]);
  useEffect(() => setFailed(false), [url]);
  return <div data-file-viewer="" data-file-preview="svg" className="flex-1 min-h-0 [contain:strict] sfv-media">
    {failed ? <SourceFramePreviewError onViewSource={onViewSource} />
      : <div className="h-full overflow-auto p-md flex items-center justify-center">
        <img src={url} alt={name} onLoad={event => onImageReady?.(event.currentTarget)} onError={() => { setFailed(true); onImageReady?.(null); }} className="max-w-full max-h-full object-contain" />
      </div>}
  </div>;
}

// The Eye/Code subheader button (:4169-4186): ghost iconOnly base, labelled
// "Preview" (Eye) while the source shows, otherwise "View source" (Code); an
// iconOnly Button shows its aria-label as the CDS tooltip.
function SourceViewToggle({ showingSource, onToggle }) {
  const label = showingSource ? FILE_VIEWER_LABELS.preview : FILE_VIEWER_LABELS.viewSource;
  return <SourceTooltip content={label} hoverable={false}>
    <button type="button" className="source-icon-button sfv-view-toggle" aria-label={label} data-view-toggle=""
      onClick={onToggle} onMouseDown={(event) => event.preventDefault()}>
      <Icon name={showingSource ? "Eye" : "Code"} size={16} />
    </button>
  </SourceTooltip>;
}

/**
 * file: the tab ({path, text?, unavailable?}); displayPath: the path shown and
 * copied (cwd-relative inside the workspace); fullPath: the breadcrumb title
 * and the media file:// URL. renderMarkdown(text, chunk): the pane's Markdown
 * renderer (chunk: the index of a progressive chunk, 0 for a whole body);
 * without it a Markdown file has no preview.
 */
export function SourceSessionFileViewer({ file, scopeKey, sessionId, onSaveFile, ...props }) {
  props = { presentation: "reading", defaultView: /\.html?$/i.test(file.path) ? "source" : undefined, memoryKey: sessionId ? `${sessionId}\u0000${file.path}` : null, ...props };
  const editor = useMemo(() => file.editHash ? getFileEditor({ key: scopeKey, path: file.path, sessionId,
    text: file.text, hash: file.editHash, save: onSaveFile }) : null, [scopeKey, file.editHash]);
  if (editor) editor.saveFile = onSaveFile;
  const viewKey = scopeKey ?? props.memoryKey ?? file.path;
  return editor ? <EditableFileViewer key={viewKey} {...props} file={file} scopeKey={scopeKey} editor={editor} />
    : <SourceFileViewer key={viewKey} {...props} file={file} scopeKey={scopeKey} />;
}
function EditableFileViewer({ editor, file, onEdit, ...props }) {
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  useLayoutEffect(() => { if (editor.dirty) onEdit?.(); }, [editor, state, onEdit]);
  return <SourceFileViewer {...props} file={{ ...file, text: state.text }} editor={editor} editState={state} />;
}
export function SourceFileViewer({ file, presentation = "pane", displayPath, fullPath, line, endLine, scrollNonce, scopeKey, onCopyPath, onViewAsText, renderMarkdown, findRequest = null, contentFind = null, lister = null, showHeader = true, viewMode, onViewModeChange, defaultView, memoryKey = null, settings = DEFAULT_FILE_VIEW_SETTINGS, editor = null, editState = null, onAttachFile, onAttachSelection, onDownload, downloading = false, canLoadDocument = false, onCopyImage, onSaveComment, onDeleteComment, fileMenu = null, previewFrame = null, cardActions = null }) {
  const dirty = !!editor?.dirty;
  const reason = fileTabReason(file);
  const media = FILE_MEDIA_KINDS.includes(reason) ? reason : null;
  // Xt (:2649): a file kind with a preview. en (:2655): the source shows first
  // when the file is opened at a line; [tn, sn] holds it, and hn (:2658-2667)
  // resets it whenever the preview kind, the line or the request changes.
  const kind = filePreviewKind(file.path);
  // Ql's hostedFrameAvailable: the HTML frame needs the pane's frame host (previewFrame.register).
  const previewable = !!kind && (kind.kind !== "markdown" || typeof renderMarkdown === "function") && (kind.kind !== "html" || typeof previewFrame?.register === "function");
  const sourceFirst = line != null || defaultView === "source";
  const [localShowSource, setShowSource] = useState(() => sourceFirst || !!readFileView(memoryKey)?.source);
  const showSource = viewMode === undefined ? localShowSource : viewMode === 'source';
  useEffect(() => { if (typeof file.text !== "string") return; rememberFileView(memoryKey, { source: showSource && !sourceFirst && !dirty, forcedText: !!file.forcedText }); }, [memoryKey, showSource, sourceFirst, dirty, file.forcedText, file.text]);
  const [request, setRequest] = useState({ previewable, line, scrollNonce });
  if (request.previewable !== previewable || request.line !== line || request.scrollNonce !== scrollNonce) {
    setRequest({ previewable, line, scrollNonce });
    if (previewable) setShowSource(sourceFirst);
  }
  // Ti !== null (:4169): the toggle needs a preview kind and text that is not binary.
  const canToggle = !dirty && previewable && !media && reason !== "binary";
  // Find in file (Yi / Xi): ⌘F in the viewer or the pane menu's "Find in file" (findRequest bumps) opens the bar on
  // the source; Escape closes it and puts the focus back in the viewer.
  const searchable = !media && !reason && typeof file.text === "string";
  const [find, setFind] = useState({ open: false, query: "", index: -1, nonce: 0, options: getSearchOptions() });
  const findInput = useRef(null);
  const root = useRef(null);
  const editorApi = useRef(null);
  const [goTo, setGoTo] = useState(null);
  const openGoToLine = useCallback(() => {
    const caret = editorApi.current?.caret();
    if (!caret) return false;
    setFind(value => ({ ...value, open: false })); setGoTo(caret); return true;
  }, []);
  const initialSearch = useMemo(() => searchInText(searchable && find.open ? file.text : "", find.open ? find.query : "", find.options), [find.open, find.query, find.options, searchable, file.text]);
  const [continuedSearch, setContinuedSearch] = useState(null);
  const searchResult = continuedSearch?.initial === initialSearch ? continuedSearch.result : initialSearch;
  const matches = searchResult.matches;
  const index = matches.length ? Math.min(Math.max(find.index, 0), matches.length - 1) : -1;
  const openFind = useCallback(() => {
    if (!searchable) return;
    setGoTo(null);
    setShowSource(true);
    onViewModeChange?.('source');
    setFind((value) => ({ ...value, open: true, options: value.open ? value.options : getSearchOptions(), nonce: value.nonce + 1 }));
  }, [searchable, onViewModeChange]);
  const closeFind = useCallback(() => {
    setFind(value => ({ ...value, open: false, query: "", index: -1, nonce: 0 }));
    root.current?.querySelector(".cm-content, .sfv-scroller")?.focus?.({ preventScroll: true });
  }, []);
  const stepFind = useCallback((delta) => {
    let result = searchResult;
    if (delta > 0 && result.partial && index >= matches.length - 1) {
      result = searchInText(file.text, find.query, find.options, { previous: result });
      setContinuedSearch({ initial: initialSearch, result });
      if (result.partial && index >= result.matches.length - 1) return;
    }
    setFind(value => ({ ...value, index: stepFindIndex(index, delta, result.matches.length) }));
  }, [searchResult, initialSearch, index, matches.length, file.text, find.query, find.options]);
  const toggleFindOption = key => {
    const options = rememberSearchOptions({ ...find.options, [key]: !find.options[key] });
    const line = matches[index]?.line ?? editorApi.current?.caret()?.line;
    const result = searchInText(file.text, find.query, options);
    setFind(value => ({ ...value, options, index: firstMatchFrom(result.matches, line) }));
  };
  useEffect(() => { if (find.open) { findInput.current?.focus(); findInput.current?.select(); } }, [find.open, find.nonce]);
  const lastRequest = useRef(findRequest);
  useEffect(() => { if (findRequest != null && findRequest !== lastRequest.current) openFind(); lastRequest.current = findRequest; }, [findRequest, openFind]);
  const appliedContentFind=useRef(null);
  useEffect(()=>{
    if(!contentFind||!searchable||appliedContentFind.current===contentFind)return;
    appliedContentFind.current=contentFind;
    const options=contentFind.findOptions??getSearchOptions(),result=searchInText(file.text,contentFind.findQuery,options);
    setShowSource(true);onViewModeChange?.('source');
    setFind(value=>({...value,open:true,query:contentFind.findQuery,options,index:firstMatchFrom(result.matches,contentFind.line),nonce:value.nonce+1}));
  },[contentFind,searchable,file.text,onViewModeChange]);
  const findProps = useMemo(() => (find.open ? { matches, index } : null), [find.open, matches, index]);
  const preview = canToggle && !showSource ? kind : null;
  const [loadedImage, setLoadedImage] = useState(null);
  const imageSource = media === 'image' ? filePreviewUrl(fullPath || file.path) : preview?.kind === 'svg' ? svgPreviewUrl(file.text) : null;
  const imageReady = loadedImage?.src === imageSource && loadedImage.element?.complete && loadedImage.element.naturalWidth > 0;
  const onImageReady = element => setLoadedImage(element ? { src: imageSource, element } : null);
  const downloadAvailable = typeof onDownload === 'function' && fileDownloadPlan(file, { documentLoader: canLoadDocument }).available;
  const viewSource = () => { setShowSource(true); onViewModeChange?.("source"); };
  // B13 im (cd2efac6e readable :5945-6030): the right-click menu of the bodies that are not the editor (which has
  // its own and stops the event): the pane's file items, then Copy file contents and Download file.
  const toasts = useSourceToasts();
  const bodyRef = useRef(null);
  const menuReturn = useRef(null);
  const [bodyMenu, setBodyMenu] = useState(null);
  const hasText = typeof file.text === "string" && reason !== "binary";
  const bodyMenuEntries = bodyMenu && fileMenu ? fileViewerMenu(fileMenu.entries(file.path, { surface: "file_viewer", unavailable: file.unavailable }),
    { canCopyContents: hasText, canCopyImage: imageReady && typeof onCopyImage === 'function', canDownload: hasText && downloadAvailable, downloading }) : null;
  const openBodyMenu = (event) => {
    if (!fileMenu || event.defaultPrevented || !bodyRef.current) return;
    const keyboard = event.type === "keydown";
    if (keyboard && event.key !== "ContextMenu" && !(event.key === "F10" && event.shiftKey)) return;
    // Read-only code with a text selection keeps the native Copy menu: the reference's code body is a read-only
    // CodeMirror whose own menu (the ks branch) copies the selection, which these rows do not reproduce.
    const selection = event.currentTarget.ownerDocument.getSelection?.();
    if (!preview && !media && !reason && !editor && selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) return;
    event.preventDefault(); event.stopPropagation();
    const rect = bodyRef.current.getBoundingClientRect();
    menuReturn.current = event.currentTarget.ownerDocument.activeElement;
    setBodyMenu({ point: keyboard || (event.clientX === 0 && event.clientY === 0) ? { x: rect.left + 12, y: rect.top + 12 } : { x: event.clientX, y: event.clientY } });
  };
  // B32 ko: a breadcrumb segment's menu — the pane's file items for that folder (or the file), where a segment shown
  // as an absolute path outside the working directory reads as outside_root (no reveal, terminal or tree items).
  const segmentMenu = useMemo(() => (fileMenu ? {
    entries: (target) => fileMenu.entries(target.path, { surface: "file_breadcrumb", directory: target.directory,
      unavailable: target.outside ? "outside_root" : target.directory ? undefined : file.unavailable, gone: target.gone === true }), // R3-files FT-06: cfac349aa Jt's gone
    select: (item, target) => fileMenu.select(item, target.path),
  } : null), [fileMenu, file.unavailable]);
  const selectBodyItem = (item) => {
    if (item.disabled) return;
    // md: "Copied to clipboard." once the copy lands.
    if (item.action === "copy-file-contents") void Promise.resolve().then(() => navigator.clipboard.writeText(file.text))
      .then(() => toasts?.add(t("Copied to clipboard."), { variant: "neutral" }), () => toasts?.add(t("Couldn’t copy to clipboard."), { variant: "danger" }));
    else if (item.action === "download-file") onDownload?.(file.text);
    // R4i-files FI1 (files-12): 2.42304.0 c26fb8b6b Le — addSuccess "Image copied to clipboard." (wxBR7bytpr), addError
    // "Couldn’t copy image." (mpiKUCMipZ). addSuccess is the neutral CDS toast here (source-routines-shared-adapters).
    else if (item.action === 'copy-image') void Promise.resolve().then(() => onCopyImage(imagePng(loadedImage.element)))
      .then(() => toasts?.add(t('Image copied to clipboard.'), { variant: 'neutral' }), () => toasts?.add(t('Couldn’t copy image.'), { variant: 'danger' }));
    else fileMenu?.select(item, file.path);
  };
  // B32: the card actions with dp's focus target (the viewer root).
  const unavailableActions = cardActions ? { ...cardActions, focusViewer: () => root.current?.focus({ preventScroll: true }),
    onCreateFile: cardActions.onCreateFile ? async () => { const result = await cardActions.onCreateFile(); if (result?.status === 'saved') viewSource(); return result; } : undefined,
  } : null;
  const body = media
    ? <SourceFileMedia key={file.path} kind={media} path={file.path} url={filePreviewUrl(fullPath || file.path)} onViewAsText={onViewAsText} onShowFile={cardActions?.onShowFile ?? null} onImageReady={onImageReady} />
    : reason && reason !== "empty"
      ? <SourceFileUnavailable key={file.path} reason={reason} path={file.path} creatable={file.creatable} onViewAsText={onViewAsText} cardActions={unavailableActions} />
      // R4g-files FV1 (files-03): cd2efac6e also shows the empty card for an untruncated whitespace-only preview.
      : (reason === "empty" && (!editor || preview?.kind === "markdown")) || filePreviewEmpty(preview?.kind, file)
        ? <SourceFileUnavailable reason="empty" path={file.path} />
        : typeof file.text !== "string"
          ? <SourceLoadingPane label={FILE_VIEWER_LABELS.loading} />
          : preview?.kind === "html"
            ? <SourceFileHtmlFrame path={file.path} text={file.text} frame={previewFrame} onViewSource={viewSource} />
          : preview?.kind === "svg"
            ? <SourceFileSvg path={file.path} text={file.text} onViewSource={viewSource} onImageReady={onImageReady} />
          : preview?.kind === "markdown"
            ? <SourceFileMarkdown text={file.text} renderMarkdown={renderMarkdown} typography={presentation === "pane" ? "epitaxy" : "document"} />
            : preview?.kind === "csv"
              ? <SourceFileCsv text={file.text} delimiter={preview.delimiter} presentation={presentation === "pane" ? "pane" : "document"} truncatedUpstream={!!file.truncated} />
              : editor ? <SourceFileEditor onSaveComment={onSaveComment} onDeleteComment={onDeleteComment} apiRef={editorApi} onGoToLine={openGoToLine} onAttachFile={onAttachFile} onAttachSelection={onAttachSelection} onDownload={downloadAvailable ? onDownload : null} downloading={downloading} editor={editor} settings={settings} line={line} endLine={endLine} scrollNonce={scrollNonce} find={findProps} />
              : <SourceFileCode path={file.path} text={file.text} line={line} endLine={endLine} scrollNonce={scrollNonce} scopeKey={scopeKey} find={findProps} settings={settings} />;
  return <div ref={root} tabIndex={-1} onMouseDown={(event) => {
    // Keep keyboard Find scoped to the file after clicking its read-only code.
    if (event.button === 0 && event.target.closest?.('.sfv-scroller')) event.currentTarget.focus({ preventScroll: true });
  }} className="source-file-view" data-file-path={file.path} data-pane-editor={dirty || undefined} data-file-state={reason ?? (typeof file.text === "string" ? "text" : "loading")}
    data-file-view={preview ? "preview" : canToggle ? "source" : undefined}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && find.open && !event.defaultPrevented && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); suppressKeyRepeat('Escape', event.currentTarget.ownerDocument.defaultView); closeFind(); return; }
      const action = searchable ? fileFindShortcut(event, { mac: typeof navigator === "undefined" || /Mac|iPhone|iPad/.test(navigator.platform || "") }) : null;
      if (!action || (action !== "open" && !find.open)) return;
      event.preventDefault(); event.stopPropagation();
      if (action === "open") openFind(); else stepFind(action === "next" ? 1 : -1);
    }}>
    {/* qn flush (cdf69fdd3-DM0fGX-C.js:13-36): "epitaxy-panel-subheader flex
        items-center gap-[4px] shrink-0 px-md" at h-[calc(2rem*rem-scale)];
        Jo puts the actions after the Yo lead. */}
    {showHeader && <div className="epitaxy-panel-subheader sfv-subheader">
      <SourceFileBreadcrumb displayPath={displayPath} fullPath={fullPath} onCopyPath={onCopyPath} lister={lister} segmentMenu={segmentMenu} />
      {dirty && (!settings.autoSave || editState.error) && <><SourceSettingsButton size="xxs" variant="ghost" disabled={editState.saving} onClick={() => editor.discard()}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton size="xxs" variant="secondary" busy={editState.saving} disabled={!!editState.error} onClick={() => void editor.save()}>{t('Save')}</SourceSettingsButton></>}
      {canToggle && <SourceViewToggle showingSource={showSource} onToggle={() => { setShowSource(!showSource); onViewModeChange?.(showSource ? "preview" : "source"); }} />}
    </div>}
    {goTo && <SourceFileGoToLine caret={goTo} onGo={(line, column) => { setGoTo(null); editorApi.current?.go(line, column); }}
      onClose={focus => { setGoTo(null); if (focus) editorApi.current?.focus(); }} />}
    {editState?.error && <div role="alert" className="sfv-edit-error"><span>{t(editState.error.status === 'denied'
      ? 'This file can’t be saved. Its path is outside the working directory, or this is a remote session.'
      : editState.error.status === 'conflict' ? editState.error.currentHash === null
        ? 'This file was deleted on disk since you started editing.' : 'This file changed on disk since you started editing.'
        : 'Couldn’t save this file.')}</span>
      <SourceSettingsButton size="xxs" variant="ghost" disabled={editState.saving} onClick={() => editor.discard()}>{t('Discard')}</SourceSettingsButton>
      {editState.error.status !== 'denied' && <SourceSettingsButton size="xxs" busy={editState.saving} onClick={() => void editor.save({ override: true })}>
        {t(editState.error.status !== 'conflict' ? 'Try again' : editState.error.currentHash === null ? 'Save anyway' : 'Override')}</SourceSettingsButton>}
    </div>}
    {find.open && searchable && <SourceFileFindBar query={find.query} options={find.options} result={searchResult} onToggle={toggleFindOption} status={findStatus(matches, index)} inputRef={findInput}
      onQuery={(query) => setFind((value) => ({ ...value, query, index: 0 }))}
      onNext={() => stepFind(1)} onPrev={() => stepFind(-1)} onClose={closeFind} />}
    <div ref={bodyRef} className="sfv-body" data-popup-open={bodyMenu ? "" : undefined} onContextMenu={fileMenu ? openBodyMenu : undefined} onKeyDown={fileMenu ? openBodyMenu : undefined}>{body}</div>
    {bodyMenuEntries?.length > 0 && <SourceMenu.Popup anchor={bodyRef.current} point={bodyMenu.point} trigger={null} side="bottom" align="start"
      sideOffset={CONTEXT_MENU_SIDE_OFFSET} alignOffset={CONTEXT_MENU_ALIGN_OFFSET} layer="contextmenu" dataCds="ContextMenu" contextMenuGuard
      label={FILE_VIEWER_LABELS.fileActions} onClose={() => setBodyMenu(null)} finalFocus={() => (menuReturn.current?.isConnected ? menuReturn.current : root.current)}>
      <SourceFileMenuEntries entries={bodyMenuEntries} onSelect={selectBodyItem} />
    </SourceMenu.Popup>}
  </div>;
}
