import React, { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu } from "./source-menu.jsx";
import { SourceTranscriptSelection } from "./source-transcript-selection.jsx";
import { SourceTableScope } from "./source-response-table.jsx";
import { useTranscriptScroll } from "./use-transcript-scroll";
import { pathChoices } from "./file-tool-model.mjs";
import { clipboardEnvironment, writeClipboardPayload } from "./clipboard-payload.mjs";
import { markdownToClipboardHtml } from "./rich-copy-html.mjs";
import { attachSelectionChord, attachableSelection, contextMenuOrigin, fileRefMenu, linkTarget, messageMenu, preventMenuContextMenu } from "./transcript-context-menu-model.mjs";
import { useTranscriptFeedNav } from "./use-transcript-feed-nav.js";
import { SourceChapterToc } from "./source-chapters.jsx";
import { ResponseImageMenuContext } from "./source-response-image.jsx";
import { chapterAnchorId } from "./session-chapters-model.mjs";
import { TranscriptRowsScope } from "./source-transcript-rows.jsx";
import "./source-transcript.css";
import { t } from "../electron/i18n/index.mjs";

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

// scroll-messages-current.js:33165-33193 iY: what the pointer is over. A
// [data-code-text] body (fence, or inline code holding a masked secret) wins;
// any other part of a fence suppresses the inline-code lookup.
function codeTargetOf(target) {
  const body = target.closest("[data-code-text]");
  const block = target.closest(".scb-block");
  const inline = body || block ? null : target.closest("[data-epitaxy-inline-code]");
  if (body?.dataset.codeText) return { text: body.dataset.codeText,
    isBlock: !body.hasAttribute("data-epitaxy-inline-code"), isPath: body.hasAttribute("data-epitaxy-file-ref") };
  if (inline?.textContent) return { text: inline.textContent, isBlock: false, isPath: inline.hasAttribute("data-epitaxy-file-ref") };
  return null;
}

function MenuEntries({ entries, run }) {
  const prefix = useId();
  return entries.map((entry, index) => {
    if (entry.type === "separator") return <SourceMenu.Separator key={`separator-${index}`} />;
    if (entry.submenu) return <SourceMenu.Submenu key={entry.id}>
      <SourceMenu.SubmenuTrigger>{entry.label}</SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={entry.label}><MenuEntries entries={entry.submenu} run={run} /></SourceMenu.Popup>
    </SourceMenu.Submenu>;
    // zNe: Rewind to here / Fork from here carry a second line; the item is named by its label, described by that line.
    const described = entry.description ? { label: entry.label, description: entry.description, labelId: `${prefix}-${entry.id}-label`,
      descriptionId: `${prefix}-${entry.id}-description`, "aria-labelledby": `${prefix}-${entry.id}-label`, "aria-describedby": `${prefix}-${entry.id}-description` } : null;
    return <SourceMenu.Item key={entry.id} shortcut={entry.shortcut} {...described} onClick={() => run(entry.id)}>{entry.label}</SourceMenu.Item>;
  });
}

export const SourceTranscript = forwardRef(function SourceTranscript(
  { sessionKey, ready = true, pendingInput = false, interactionHandlers, messageActions = null, responding = false, onFeedEscape = null, findBarRef = null, chapters = null, chapterSessionId = null, turnScope = null, children },
  ref,
) {
  const scroll = useTranscriptScroll({ sessionKey, ready });
  const actions = useRef(messageActions);
  actions.current = messageActions;
  // F10: scroll-transcript-host-current.js:2982 feedKeyboardNav (N9 feed and
  // articles). The ZB find bar is app-level (sidebar-main.js:20491): main.jsx
  // mounts SourceFindBar outside this keyed transcript and hands its ref in;
  // the handle keeps openFind/stepFind for the Edit ▸ Find menu events.
  const feed = useTranscriptFeedNav({ viewportRef: scroll.viewportRef, contentRef: scroll.contentRef, api: scroll.api, responding,
    resolveMessage: (id) => actions.current?.resolveMessage?.(id), onEscape: onFeedEscape });
  useImperativeHandle(ref, () => ({ ...scroll.api,
    openFind: () => findBarRef?.current?.open(), stepFind: (forward) => findBarRef?.current?.step(forward) }), [scroll.api, findBarRef]);
  const [menu, setMenu] = useState(null);
  useEffect(() => { setMenu(null); }, [sessionKey]);

  // scroll-messages-current.js:33411-33640 SY: a right-click on a user or
  // assistant row (or a file reference chip) opens the CDS ContextMenu at the
  // pointer, as source-response-image.jsx does; preventDefault keeps the
  // native menu (F04) closed. Rows without message text keep the native menu.
  // TT-06 (2.42304.0 c96d752d0 row onContextMenu: `byKeyboard: e.button === -1`): a keyboard-invoked menu (the
  // ContextMenu key, Shift+F10) opens with its first item highlighted, a pointer one with none.
  function onContextMenu(event) {
    interactionHandlers?.onContextMenu?.(event);
    if (event.defaultPrevented) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const origin = contextMenuOrigin(event);
    if (openMessageMenu(target, origin.point, null, origin.byKeyboard)) event.preventDefault();
  }
  // dI / TI: the menu for what is under the pointer. image: a response image of the message (its src, file name and own
  // Copy image / Save image), which puts the image items first. byKeyboard: the menu was invoked from the keyboard.
  // Returns whether a menu opened.
  function openMessageMenu(target, point, image = null, byKeyboard = false) {
    const current = actions.current, viewport = scroll.viewportRef.current;
    if (!current || !viewport) return false;
    if (!target || !viewport.contains(target) || target.closest(EDITABLE)) return false;
    const fileNode = target.closest("[data-file-ref]");
    if (fileNode && viewport.contains(fileNode)) {
      const path = fileNode.dataset.fileRef, choices = pathChoices(path, current.cwd);
      const entries = fileRefMenu({ absolute: choices?.absolute, relative: choices?.relative, filename: choices?.filename || path,
        canAttach: !!current.onAttachFile, canOpen: !!current.onOpenFile, canReveal: !!current.onRevealFile && !!choices?.relative });
      setMenu({ kind: "file", point, byKeyboard, entries, path, choices,
        line: fileNode.dataset.fileLine ? Number(fileNode.dataset.fileLine) : undefined,
        endLine: fileNode.dataset.fileEndLine ? Number(fileNode.dataset.fileEndLine) : undefined });
      return true;
    }
    const row = target.closest("[data-transcript-item-id]");
    if (!row || !viewport.contains(row)) return false;
    const text = current.resolveMessage?.(row.dataset.transcriptItemId);
    if (typeof text !== "string") return false;
    const selectionText = viewport.ownerDocument.getSelection()?.toString() ?? "";
    const link = linkTarget(target.closest("a[href]")?.href);
    const code = codeTargetOf(target);
    // The row's turn (resolveTurn): Rewind to here on a user message, Fork from here on any message of a finished turn.
    const turn = current.resolveTurn?.(row.dataset.transcriptItemId) ?? null;
    // Pin as chapter / Unpin chapter (resolvePin: an assistant message of a session with a chapter store).
    const pin = current.resolvePin?.(row.dataset.transcriptItemId) ?? null;
    const entries = messageMenu({ imageTarget: image, selectionText: selectionText.trim() ? selectionText : null, codeTarget: code,
      ...link, canOpenInPreview: link.canOpenInPreview && !!current.onOpenInPreview, messageText: text, canAttach: !!current.onAttachText,
      canPin: !!(pin && current.onTogglePin), pinned: !!pin?.pinned,
      canRewind: !!(turn?.user && current.onRewindTo), canFork: !!(turn?.turnId && current.onForkFrom) });
    setMenu({ kind: "message", point, byKeyboard, entries, text, code, link: link.linkHref, selectionText, turnId: turn?.turnId ?? null,
      itemId: row.dataset.transcriptItemId, image });
    return true;
  }

  // One stable opener for the images below (they re-render only with their own props).
  const openMenuRef = useRef(openMessageMenu);
  openMenuRef.current = openMessageMenu;
  const openImageMenu = useCallback((target, point, image, byKeyboard = false) => openMenuRef.current(target, point, image, byKeyboard), []);

  function run(id) {
    const current = actions.current, viewport = scroll.viewportRef.current;
    const write = (value) => navigator.clipboard.writeText(value).catch(() => {});
    if (!menu || !current) return;
    if (menu.kind === "file") {
      const { choices, path } = menu;
      switch (id) {
        case "attach-file": current.onAttachFile?.(choices?.absolute); break;
        case "copy-absolute": current.onCopyPath?.(choices?.absolute); break;
        case "copy-relative": current.onCopyPath?.(choices?.relative); break;
        case "copy-filename": current.onCopyPath?.(choices?.filename || path); break;
        case "open-files-pane": current.onOpenFile?.({ path, line: menu.line, endLine: menu.endLine }); break;
        case "reveal": current.onRevealFile?.(choices?.absolute); break;
      }
      return;
    }
    switch (id) {
      case "copy-image": menu.image?.copy(); break;
      case "save-image": menu.image?.save(); break;
      case "copy-selection": void write(menu.selectionText); break;
      case "copy-code": void write(menu.code.text); break;
      case "open-link": current.onOpenLink?.(menu.link); break;
      case "open-in-preview": current.onOpenInPreview?.(menu.link); break;
      case "copy-link": void write(menu.link); break;
      // rY: the rich text/plain + text/html payload of the footer Copy.
      case "copy-message": {
        let html = "";
        try { html = markdownToClipboardHtml(menu.text); } catch { html = ""; }
        void writeClipboardPayload(clipboardEnvironment(viewport), { text: menu.text, html });
        break;
      }
      case "copy-markdown": void write(menu.text); break;
      case "rewind": if (menu.turnId) current.onRewindTo?.(menu.turnId); break;
      case "fork": if (menu.turnId) current.onForkFrom?.(menu.turnId); break;
      case "pin": current.onTogglePin?.(menu.itemId, menu.text); break;
      // S: a live selection of at least 2 characters wins over the message.
      case "attach": {
        const selection = viewport?.ownerDocument.getSelection();
        const selected = selection?.toString().trim() ?? "";
        if (attachableSelection(selected)) { selection.removeAllRanges(); current.onAttachText?.(selected); }
        else current.onAttachText?.(menu.text);
        break;
      }
    }
  }

  // tb E (cf74bc599 :3320-3333): Session start scrolls to the top, any other chapter brings its heading (scroll-mt 56px)
  // to the top smoothly; following is released first, as the find bar's reveal does. A heading that is not shown
  // falls back to its row (scrollToChapter's entry).
  const jumpToChapter = useCallback((chapter) => {
    const viewport = scroll.viewportRef.current;
    if (!viewport || !chapter) return;
    scroll.api.release?.();
    if (chapter.source === "session") { viewport.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const target = viewport.querySelector(`#${CSS.escape(chapterAnchorId(chapter.id))}`)
      ?? [...viewport.querySelectorAll("[data-transcript-item-id]")].find((node) => node.dataset.transcriptItemId === chapter.entryId);
    if (!target) return;
    const margin = Number.parseFloat(viewport.ownerDocument.defaultView?.getComputedStyle(target).scrollMarginTop ?? "") || 0;
    const top = target.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop - margin;
    viewport.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [scroll.viewportRef, scroll.api]);

  // cf74bc599 df: cmd+shift+L attaches a selection made inside the transcript.
  const canAttach = !!messageActions?.onAttachText;
  useEffect(() => {
    const viewport = scroll.viewportRef.current;
    if (!canAttach || !viewport) return undefined;
    const document = viewport.ownerDocument;
    const onKey = (event) => {
      if (event.defaultPrevented || event.repeat || !attachSelectionChord(event) || event.target?.closest?.(EDITABLE)) return;
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      for (let index = 0; index < selection.rangeCount; index += 1)
        if (!viewport.contains(selection.getRangeAt(index).commonAncestorContainer)) return;
      const text = selection.toString().trim();
      if (!attachableSelection(text)) return;
      event.preventDefault();
      selection.removeAllRanges();
      actions.current?.onAttachText?.(text);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canAttach, sessionKey]);

  return (
    <SourceTableScope scopeKey={sessionKey}><ResponseImageMenuContext.Provider value={openImageMenu}><div
      className="source-transcript-frame"
      data-following={scroll.following}
      data-scroll-fade={scroll.showFade}
      // xNe (c96d752d0 ENe Popup onContextMenu): the open menu is portaled, but its React events bubble through
      // this frame; a right-click on it (or on one of its submenus) is prevented, so no native menu opens over it.
      onContextMenu={preventMenuContextMenu}
    >
      <div
        ref={scroll.viewportRef}
        className="transcript supports-[animation-timeline:scroll()]:[--epitaxy-top-fade-height:32px]"
        // ca1d33d05 ft: the code conversation (its feed) is the "conversation" region. F6 never lands on it (bn drops
        // it); while it shows, D gives "main" up to the session title's "header" stop.
        data-focus-region="conversation"
        {...interactionHandlers}
        {...feed.feedProps}
        onContextMenu={onContextMenu}
      >
        {feed.instructions}
        <div
          aria-hidden="true"
          data-testid="transcript-fade-top"
          className="scroll-fade-strip-top [--cds-scroll-fade-size:var(--epitaxy-top-fade-height)] [--cds-scroll-fade-strip-color:var(--epitaxy-transcript-surface,var(--cds-surface-1))]"
        />
        <div
          ref={scroll.contentRef}
          className="source-transcript-content"
          data-testid="transcript-sizer"
          data-transcript-spacing={sessionKey && ready ? "regular" : undefined}
        >
          {/* cb6930dae ho / c26fb8b6b He: the rows' scope (turnStatusRows gate, live scope, turn mark broker). */}
          <TranscriptRowsScope sessionKey={sessionKey} turnId={turnScope?.turnId ?? null} items={turnScope?.items ?? null} itemPhases={turnScope?.itemPhases ?? null}
            turnStats={turnScope?.turnStats ?? null} responding={responding} awaiting={pendingInput}>{children}</TranscriptRowsScope>
          <div
            ref={scroll.endRef}
            className="source-transcript-end"
            aria-hidden="true"
            data-testid="transcript-end-sentinel"
          />
        </div>
        <div
          aria-hidden="true"
          data-testid="transcript-fade-bottom"
          className="scroll-fade-strip-bottom scroll-fade-size-[48px] [--cds-scroll-fade-strip-color:var(--epitaxy-transcript-surface,var(--cds-surface-1))]"
        />
      </div>
      {/* c360a9e1c-GPs-MV9u.js:3944-3978 od: the classic chip (os) for both
          states, jumping smoothly; the 'contents' wrapper forwards a wheel over
          the chip to the transcript. */}
      {sessionKey && (
        <div className="source-transcript-jump-wrap" onWheel={(event) => scroll.api.forwardWheel(event)}>
          <button
            type="button"
            className={`source-transcript-jump${pendingInput ? " source-transcript-needs-input" : ""}`}
            data-testid="jump-to-latest"
            data-visible={scroll.showJump}
            aria-label={
              pendingInput
                ? t("Needs your input. Scroll to the request")
                : t("Scroll to bottom")
            }
            aria-hidden={!scroll.showJump}
            inert={!scroll.showJump || undefined}
            tabIndex={scroll.showJump ? 0 : -1}
            onClick={() => scroll.api.jumpToLatest({ behavior: "smooth" })}
          >
            {pendingInput ? (
              <>
                <span className="source-transcript-input-dot" />
                {t("Needs your input")}
                <Icon name="CaretDown" size={12} />
              </>
            ) : (
              <Icon name="CaretDown" size={12} />
            )}
          </button>
        </div>
      )}
      {/* cf74bc599 tb (mounted beside the scroller, :6399-6412): the Session chapters rail in the left gutter. */}
      {sessionKey && ready && chapters && <SourceChapterToc sessionId={chapterSessionId} chapters={chapters} viewportRef={scroll.viewportRef}
        scrollKey={sessionKey} onJump={jumpToChapter} />}
      <SourceTranscriptSelection containerRef={scroll.viewportRef} actions={messageActions} hidden={!!menu}/>
      {menu && <SourceMenu.Popup anchor={scroll.viewportRef.current} point={menu.point} dataCds="ContextMenu" layer="contextmenu"
        initialHighlight={menu.byKeyboard ? "first" : undefined}
        label={menu.kind === "file" ? t("File actions") : t("Message actions")} onClose={() => setMenu(null)}>
        <MenuEntries entries={menu.entries} run={run} />
      </SourceMenu.Popup>}
    </div></ResponseImageMenuContext.Provider></SourceTableScope>
  );
});
