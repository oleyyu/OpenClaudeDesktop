import React, { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { SourceMenu } from "./source-menu.jsx";
import { SourceTranscriptSelection } from "./source-transcript-selection.jsx";
import { SourceTableScope } from "./source-response-table.jsx";
import { useTranscriptScroll } from "./use-transcript-scroll";
import { pathChoices } from "./file-tool-model.mjs";
import { clipboardEnvironment, writeClipboardPayload } from "./clipboard-payload.mjs";
import { markdownToClipboardHtml } from "./rich-copy-html.mjs";
import { attachSelectionChord, attachableSelection, contextMenuOrigin, fileRefMenu, linkTarget, messageMenu, preventMenuContextMenu } from "./transcript-context-menu-model.mjs";
import { useTranscriptFeedNav } from "./use-transcript-feed-nav.js";
import { TranscriptFeedHostContext, createFeedStore } from "./source-code-feed-adapters.jsx"; // W14-code r4 ct-feed R4T-09
import { useOfficialFeedScroll } from "./source-code-feed.jsx"; // W14-code r6 review fix R6T-01
import { SourceChapterToc } from "./source-chapters.jsx";
import { ResponseImageMenuContext } from "./source-response-image.jsx";
import { chapterAnchorId } from "./session-chapters-model.mjs";
import { TranscriptRowsScope } from "./source-transcript-rows.jsx";
import { SourceChatDisclaimer, SourceChatMessageMenu, chatMessageMenuAttach, messageSelectionText } from "./source-chat-message-actions.jsx"; // w13-chatui-message-actions
import { ChatMarkdownSurface } from "./source-chat-markdown.jsx"; // w13-chatui-markdown-code
import { ChatThinkingSurface } from "./source-chat-thinking.jsx"; // w13-chatui-thinking-search
import "./source-transcript.css";
import { CdsIcon } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
// c4a70913c C: the scroll-to-bottom chip (verbatim).
const JUMP_CHIP = "inline-flex items-center h-[24px] px-xs rounded bg-surface-panel text-secondary shadow-field hover:bg-[linear-gradient(var(--cds-fill-secondary-hover),var(--cds-fill-secondary-hover))] border-0 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus stacks:layers-1-fill-secondary stacks:shadow-none";
import { t } from "../electron/i18n/index.mjs";

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
// ca1d33d05 ft: the code conversation (its feed) is the "conversation" region — on ooe's container (W14-code r6 R6T-01).
const OOE_ATTRS = Object.freeze({ "data-focus-region": "conversation" });

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
  { sessionKey, ready = true, pendingInput = false, interactionHandlers, messageActions = null, responding = false, onFeedEscape = null, findBarRef = null, chapters = null, chapterSessionId = null, turnScope = null, landsFocus = false, statusRows = true, officialScroller = false, children },
  ref,
) {
  // W14-code r6 review fix R6T-01 = gates-r6-01 (E95: E90's whole-block replacement, GUI acceptance): a Code session
  // (`officialScroller`: main.jsx, local_feed_ooe_scroller under transcript_hold_place) scrolls in Aat's ooe
  // (source-code-feed.jsx useOfficialFeedScroll: c4a9ee384 Hp's follow engine); the host's controller stands down
  // (no session key). Chat / Cowork, the draft and the rollback keep the host's scroller. Both are called every render;
  // this transcript is keyed by its session, so the choice holds for its life.
  const [official] = useState(() => officialScroller && !!sessionKey);
  // W14-code r7 R7T-01: a saved reading anchor the list has not mounted is brought in through the feed's reveal first.
  const ooe = useOfficialFeedScroll({ sessionKey, ready, enabled: official, attrs: OOE_ATTRS, revealRow: revealFeedRow });
  const hostScroll = useTranscriptScroll({ sessionKey: official ? null : sessionKey, ready });
  const scroll = official ? ooe : hostScroll;
  const actions = useRef(messageActions);
  actions.current = messageActions;
  // F10: scroll-transcript-host-current.js:2982 feedKeyboardNav (N9 feed and
  // articles). The ZB find bar is app-level (sidebar-main.js:20491): main.jsx
  // mounts SourceFindBar outside this keyed transcript and hands its ref in;
  // the handle keeps openFind/stepFind for the Edit ▸ Find menu events.
  // W14-code r4 ct-feed R4T-09: the desktop's Code feed list (source-code-feed.jsx) runs inside this scroller and claims
  // the feed's keyboard rows while mounted (then the host's feed navigation below stands down); holdAll keeps its rows
  // mounted once the find bar searches (holdAllRows), reveal brings a row it has not mounted into view (a chapter jump).
  const [feedClaims, setFeedClaims] = useState(0);
  const feedClaimsRef = useRef(0);
  feedClaimsRef.current = feedClaims;
  const feedHost = useRef(null);
  // W14-code r5 R5T-REG-01 (c96d752d0 Aat `loe({… onEscape: o, …})`): Escape on a message hands focus back to the composer
  // through the list too; feedHost is made once, so the current onFeedEscape is read through a ref.
  const feedEscapeRef = useRef(onFeedEscape);
  feedEscapeRef.current = onFeedEscape;
  // W14-code r6 review fix R6T-01: in Aat's scroller the list is handed its api (`scrollerApi: Je.api`).
  const ooeApi = useRef(null);
  ooeApi.current = official ? ooe.scrollerApi : null;
  if (feedHost.current === null) feedHost.current = { viewportRef: scroll.viewportRef, api: scroll.api, holdAll: createFeedStore(false), reveal: createFeedStore(null),
    get scrollerApi() { return ooeApi.current ?? undefined; },
    onEscape: () => feedEscapeRef.current?.(),
    claim: () => { setFeedClaims((count) => count + 1); let held = true; return () => { if (held) { held = false; setFeedClaims((count) => count - 1); } }; } };
  // The feed list's reveal (source-code-feed.jsx CodeTranscriptFeed: ba's jumpToRow to the row holding `itemId`); false
  // while no list is mounted or no row holds it.
  function revealFeedRow(itemId) {
    return feedHost.current?.reveal.get()?.(itemId) === true;
  }
  const feed = useTranscriptFeedNav({ viewportRef: scroll.viewportRef, contentRef: scroll.contentRef, api: scroll.api, responding, enabled: feedClaims === 0,
    resolveMessage: (id) => actions.current?.resolveMessage?.(id), onEscape: onFeedEscape, landsFocus /* W14-code r2 DC-07 */ });
  // holdAllRows(): true when every row is already mounted (no feed list, or it already holds them all), false when the
  // list was just told to (its rows mount on the next render; a DOM search should wait a frame).
  useImperativeHandle(ref, () => ({ ...scroll.api,
    holdAllRows: () => feedClaimsRef.current === 0 || !feedHost.current.holdAll.set(true),
    // W14-code r5 R5T-REG-03: the hold ends (the find bar closed, a prompt jump landed) and the list windows its rows
    // again (c96d752d0 Aat's `windowing: c9` with only held rows kept; ba's print hold `ji` is likewise temporary).
    releaseRows: () => { feedHost.current.holdAll.set(false); },
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
  // W14-code r7 R7T-02: a file link's own menu (c0cdf4a08 _, a ContextMenu trigger of its own) answers a right-click on it
  // before the message menu around its row (c96d752d0 EA returns on `e.defaultPrevented`). The host's file menu is that
  // menu, so it opens in the capture phase, ahead of EA on a Code renderer row; the bubble handler above then sees the
  // event prevented.
  function onFileContextMenuCapture(event) {
    if (event.defaultPrevented) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    if (!target?.closest?.("[data-file-ref]")) return;
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
        canAttach: !!current.onAttachFile, canOpen: !!current.onOpenFile, canReveal: !!current.onRevealFile && !!choices?.relative,
        // W14-code r8 R8T-01: c856385e2 bn — the installed editors, then Files pane and Default app (wn, inside the folder).
        // W14-code r8 gen-final-8 (rows review low): Cn `t!==null&&!/[\\/]$/.test(e)&&…` — no Default app for a folder
        // reference (the raw path ends in a separator; pathChoices normalizes it away, so test the reference itself).
        editors: current.onOpenInEditor ? current.editors : [], canOpenDefault: !!current.onOpenDefaultApp && !/[\\/]$/.test(path) });
      setMenu({ kind: "file", point, byKeyboard, entries, path, choices,
        line: fileNode.dataset.fileLine ? Number(fileNode.dataset.fileLine) : undefined,
        endLine: fileNode.dataset.fileEndLine ? Number(fileNode.dataset.fileEndLine) : undefined });
      return true;
    }
    // W14-code r7 R7T-02: a Code renderer row's menu is TA's (c96d752d0 M7 → EA → DA), not this one.
    if (target.closest("[data-code-message-menu]")) return false;
    const row = target.closest("[data-transcript-item-id]");
    if (!row || !viewport.contains(row)) return false;
    const text = current.resolveMessage?.(row.dataset.transcriptItemId);
    if (typeof text !== "string") return false;
    const selectionText = viewport.ownerDocument.getSelection()?.toString() ?? "";
    // w13-chatui-message-actions: a Chat message opens c79f7d2ef MessageContextMenu (Attach as context); cc1aae219 B
    // attaches the selection when it is at least gM (2) characters, else the whole message. As xM `z` does, a target
    // inside a button / link / field / [role=button|menuitem], or nothing to attach, keeps the row's own menu below.
    const chatAttach = current.surface === "chat" && current.onAttachText ? chatMessageMenuAttach(target, text, messageSelectionText(row)) : null; // w13-close-chat-messages: kM
    if (chatAttach !== null) {
      setMenu({ kind: "chat", point, attach: chatAttach });
      return true;
    }
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
  // w13-chatui-markdown-code: a Chat answer's links open through the transcript's onOpenLink (one stable opener).
  const openChatLink = useCallback((href) => actions.current?.onOpenLink?.(href), []);

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
        case "open-default-app": current.onOpenDefaultApp?.(choices?.absolute); break;
        case "reveal": current.onRevealFile?.(choices?.absolute); break;
        // c856385e2 hn: an editor item opens the absolute path at the reference's line (pn → openInEditor).
        default: if (id.startsWith("open-in-editor:")) current.onOpenInEditor?.(choices?.absolute, id.slice("open-in-editor:".length), menu.line);
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
    // W14-code r4 ct-feed R4T-09: a row the feed list has not mounted is brought in through the list.
    if (!target) { feedHost.current.reveal.get()?.(chapter.entryId); return; }
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

  // The viewport's column: the feed's instructions, the edge fades, the rows' content (rows, the Chat disclaimer, the end
  // sentinel the jump chip's range reads).
  const viewportBody = <>
        {feed.instructions}
        <div
          aria-hidden="true"
          data-testid="transcript-fade-top"
          className="scroll-fade-strip-top [--cds-scroll-fade-size:var(--epitaxy-top-fade-height)] [--cds-scroll-fade-strip-color:var(--epitaxy-transcript-surface,var(--cds-surface-1))]"
        />
        <div
          ref={scroll.contentRef}
          // W14-code r6 review fix R6T-01: in ooe's inner column (`flex min-h-full flex-col`) the rows grow, as Aat's
          // `f("div", {className: "grow", children: qt.element})`.
          className={official ? "source-transcript-content grow" : "source-transcript-content"}
          data-testid="transcript-sizer"
          data-transcript-spacing={sessionKey && ready ? "regular" : undefined}
        >
          {/* w13-chatui-thinking-search: a Chat conversation's thinking/search rows are c05b96c7f Gg/Wg and shared-130 uq TurnStatus steps (SourceChatThinking). */}
          {/* W14-code r4 ct-feed R4T-09: the Code feed list's host (this scroller), source-code-feed.jsx. */}
          <TranscriptFeedHostContext.Provider value={feedHost.current}><ChatThinkingSurface.Provider value={messageActions?.surface === "chat"}>
          {/* cb6930dae ho / c26fb8b6b Ye: the rows' scope (turnStatusRows, live scope, turn mark broker). W14-code r4 gates-r4-11:
              `statusRows` is cf74bc599's rendererChrome (the Code session; the /btw pane is Code's too), false for Chat / Cowork. */}
          <TranscriptRowsScope sessionKey={sessionKey} turnId={turnScope?.turnId ?? null} items={turnScope?.items ?? null} itemPhases={turnScope?.itemPhases ?? null}
            turnStats={turnScope?.turnStats ?? null} responding={responding} awaiting={pendingInput} statusRows={statusRows}>
            {/* w13-chatui-markdown-code: the rows of a Chat conversation answer with c18fe02d2 ChatMarkdown (SourceChatMarkdown). */}
            <ChatMarkdownSurface.Provider value={messageActions?.surface === "chat" ? openChatLink : null}>{children}</ChatMarkdownSurface.Provider></TranscriptRowsScope>
          </ChatThinkingSurface.Provider></TranscriptFeedHostContext.Provider>
          {/* w13-chatui-message-actions: ca2ef848d U9, the disclaimer where a Chat conversation ends. */}
          {sessionKey && messageActions?.surface === "chat" && <SourceChatDisclaimer conversationUuid={messageActions.threadId} onOpenLink={messageActions.onOpenLink} incognito={!!messageActions.incognito} />}
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
  </>;
  // W14-code r6 review fix R6T-01: ooe's container takes only `data-*` attributes (c4a9ee384 Xi), so in it the
  // transcript's own handlers (turn hover / focus, the host feed navigation while no list claims it, the message menu)
  // sit on the frame, the container's parent; React's events bubble to it from the rows as before.
  const frameHandlers = official ? { ...interactionHandlers, ...feed.feedProps,
    onContextMenu: (event) => { onContextMenu(event); preventMenuContextMenu(event); } } : null;

  return (
    <SourceTableScope scopeKey={sessionKey}><ResponseImageMenuContext.Provider value={openImageMenu}><div
      className="source-transcript-frame"
      data-following={scroll.following}
      data-scroll-fade={scroll.showFade}
      // xNe (c96d752d0 ENe Popup onContextMenu): the open menu is portaled, but its React events bubble through
      // this frame; a right-click on it (or on one of its submenus) is prevented, so no native menu opens over it.
      onContextMenu={preventMenuContextMenu}
      onContextMenuCapture={onFileContextMenuCapture}
      {...frameHandlers}
    >
      {official ? ooe.render(viewportBody) : <div
        ref={scroll.viewportRef}
        className="transcript supports-[animation-timeline:scroll()]:[--epitaxy-top-fade-height:32px]"
        // ca1d33d05 ft: the code conversation (its feed) is the "conversation" region. F6 never lands on it (bn drops
        // it); while it shows, D gives "main" up to the session title's "header" stop.
        data-focus-region="conversation"
        // w13-close-chat-messages: a Chat conversation is ca2ef848d's chatLayout, whose rn also registers "lastMessage".
        data-focus-region-last-message={messageActions?.surface === "chat" ? "" : undefined}
        {...interactionHandlers}
        {...feed.feedProps}
        onContextMenu={onContextMenu}
      >
        {viewportBody}
      </div>}
      {/* W14-code r3 css3-jump-chip: 3.6556.2 c4a70913c w (exported r) — the button's class is `${C} absolute -top-[32px]
          left-1/2 -translate-x-1/2 z-[1] gap-xs transition-opacity duration-150 ${show ? "opacity-100" : "opacity-0
          pointer-events-none"}` with C its chip string, verbatim; the needs-input lead is `span.size-[6px].shrink-0.rounded-full
          .bg-fill-accent` + `span.text-footnote` "Needs your input" (ydrhToQu/y), then CdsIcon CaretDown "xs". The original
          sits on the composer dock (-top-[32px]: 8px above the dock's top edge); this chip sits in the transcript frame,
          so it keeps the same spot from the frame's bottom edge (bottom-2, 8px) in place of -top-[32px]. The 'contents'
          wrapper forwards a wheel over the chip to the transcript. */}
      {sessionKey && (
        <div className="contents" data-transcript-jump-wrap="" onWheel={(event) => scroll.api.forwardWheel(event)}>
          <button
            type="button"
            className={`${JUMP_CHIP} absolute bottom-2 left-1/2 -translate-x-1/2 z-[1] gap-xs transition-opacity duration-150 ${scroll.showJump ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            data-testid="jump-to-latest"
            data-visible={scroll.showJump}
            data-needs-input={pendingInput ? "" : undefined}
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
                <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-fill-accent" />
                <span className="text-footnote">{t("Needs your input")}</span>
              </>
            ) : null}
            <CdsIcon name="CaretDown" size="xs" />
          </button>
        </div>
      )}
      {/* cf74bc599 tb (mounted beside the scroller, :6399-6412): the Session chapters rail in the left gutter. */}
      {sessionKey && ready && chapters && <SourceChapterToc sessionId={chapterSessionId} chapters={chapters} viewportRef={scroll.viewportRef}
        scrollKey={sessionKey} onJump={jumpToChapter} />}
      <SourceTranscriptSelection containerRef={scroll.viewportRef} actions={messageActions} hidden={!!menu}/>
      {menu?.kind === "chat" && <SourceChatMessageMenu point={menu.point} container={scroll.viewportRef.current?.ownerDocument.body}
        onAttach={() => { actions.current?.onAttachText?.(menu.attach); setMenu(null); }} onClose={() => setMenu(null)} />}
      {menu && menu.kind !== "chat" && <SourceMenu.Popup anchor={scroll.viewportRef.current} point={menu.point} dataCds="ContextMenu" layer="contextmenu"
        initialHighlight={menu.byKeyboard ? "first" : undefined}
        // W14-code r7 R7T-03: the file link's menu (c0cdf4a08 _ → c856385e2 Q) carries no name of its own ("File actions"
        // is not in the 3.6556.2 en-US catalog).
        label={menu.kind === "file" ? undefined : t("Message actions")} onClose={() => setMenu(null)}>
        <MenuEntries entries={menu.entries} run={run} />
      </SourceMenu.Popup>}
    </div></ResponseImageMenuContext.Provider></SourceTableScope>
  );
});
