// w13-chatui-markdown-code / w13-close-chat-renderer (research/w13-chatui.md chatui-C11/C12, plan-w13-closeout E63 G8): a
// Chat answer drawn by the 3.6556.2 Chat text renderer itself, sliced into src/generated/chat-renderer
// (scripts/extract-chat-renderer.mjs): cc1aae219 OR → c89efce1a rc (StandardMarkdown: the remark pipeline with KaTeX,
// smart / hanging quotes and citations, the streaming renderer shared-10 Fv, the component table Ys with the code block,
// the swatch inline code, the `prose-scroll` table frame, links through c82d645d5 J and the "Open external link"
// dialog, and the prose root shared-10 lx). The Code transcript keeps its own Markdown and fence (source-session.jsx
// SourceMarkdown / source-code-block.jsx).
// No view-tabs facade here: source-transcript.jsx (in the chat graph) imports this file, so it takes the concrete
// generated files (E41).
//
// How cc1aae219 feeds OR for a Chat `text` block (case "text"), followed here:
//   h(OR, { text: e, blockCitations: n, messageUuid: re, className: m, rootAttributes: g, isStreaming: s, …,
//           headingLevelOffset: 1, typography: dC, smartQuotes: te, …, letterDirection: V, directionTelemetry: !0 })
//   m = s ? "progressive-markdown" : "standard-markdown"; dC = c89efce1a us = "prose"; te / V are GrowthBook
//   __gb__2215170874 / __gb__817024762, off without GrowthBook (E49); n = the block's citations (the local cores return
//   none, so no citation pill is drawn until a core does).
import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { ChatTextMarkdown } from './generated/chat-renderer/chat-text.mjs';
import { useCodeBlockTheme } from './generated/chat-markdown/code-block.mjs';
import { ChatCodeStyleContext } from './source-chat-markdown-adapters.jsx';
import { registerChatLinkOpener } from './source-chat-renderer-adapters.jsx';
import { chipPathOpenable } from './user-inline-model.mjs';

// The Chat surface around a row: source-transcript.jsx provides its link opener (href => void) when messageActions.surface
// is "chat", and null otherwise (the Code transcript). A row's answer renderer reads it to pick SourceChatMarkdown.
export const ChatMarkdownSurface = createContext(null);
export function useChatMarkdownSurface() { return useContext(ChatMarkdownSurface); }

// The answer body of an assistant row: the Chat text renderer inside a Chat transcript, `fallback` (the Code Markdown)
// elsewhere. The row renderer (source-session.jsx SourceMessage, agentMessage branch) wraps its <SourceMarkdown …/> in
// this; the streaming state, workspace and file opener are the ones it hands that fallback.
export function ChatSurfaceAnswer({ text = '', fallback = null }) {
  const openLink = useContext(ChatMarkdownSurface);
  if (!openLink) return fallback;
  const { isStreaming = false, cwd = null, onOpenFileRef = null } = fallback?.props ?? {};
  return <SourceChatMarkdown text={text} isStreaming={isStreaming} onOpenLink={openLink} cwd={cwd} onOpenFileRef={onOpenFileRef} />;
}

const WEB_URL = /^(?:https?:|mailto:|tel:)/i;
const COMPUTER_URL = 'computer://';

// The path of a `computer://` link (c82d645d5 lets the protocol through; cc1aae219's link handler opens it as a file of
// the conversation, shared-52 yi → SELECT_FILE). Here the transcript's file opener, when the path is openable.
function computerLinkPath(href) {
  if (typeof href !== 'string' || !href.startsWith(COMPUTER_URL)) return null;
  try { return decodeURIComponent(href.slice(COMPUTER_URL.length)); } catch { return href.slice(COMPUTER_URL.length); }
}

// A click the renderer leaves to the browser (an anchor's own navigation: a link c82d645d5 J treats as internal or
// trusted, a citation pill's source, a middle click) would reach the window's denied navigation (electron/main.cjs
// will-navigate / setWindowOpenHandler), where the desktop's main process opens it in the browser; the host does that here.
export function openUnhandledAnchor(event, onOpenLink) {
  if (event.defaultPrevented || !onOpenLink || typeof event.target?.closest !== 'function') return;
  const href = event.target.closest('a[href]')?.getAttribute('href');
  if (!href || !WEB_URL.test(href)) return;
  event.preventDefault();
  onOpenLink(href);
}

export function SourceChatMarkdown({ text = '', isStreaming = false, onOpenLink = null, cwd = null, onOpenFileRef = null,
  blockCitations, messageUuid }) {
  const { codeStyle } = useCodeBlockTheme();
  // c82d645d5 J / c89efce1a sc open a confirmed link or image through cdsOpenWindow, which the host answers with this.
  useEffect(() => (onOpenLink ? registerChatLinkOpener((url) => onOpenLink(url)) : undefined), [onOpenLink]);
  // J calls onLinkClick first (`p(e, z)`, z the rendered href) and stops when it is default-prevented: a `computer://`
  // link opens its file (cc1aae219's handler opens it in the conversation's file drawer).
  const onLinkClick = useCallback((event, href) => {
    const path = computerLinkPath(href);
    if (path !== null && onOpenFileRef && chipPathOpenable(path, cwd)) { event.preventDefault(); onOpenFileRef({ path }); }
  }, [cwd, onOpenFileRef]);
  const onClick = useCallback((event) => openUnhandledAnchor(event, onOpenLink), [onOpenLink]);
  const onAuxClick = useCallback((event) => { if (event.button === 1) openUnhandledAnchor(event, onOpenLink); }, [onOpenLink]);
  // `contents`: the click boundary takes no box, so the renderer's prose root lays out as cc1aae219 draws it.
  return <ChatCodeStyleContext.Provider value={codeStyle}>
    <div className="contents" onClick={onClick} onAuxClick={onAuxClick}>
      <ChatTextMarkdown text={text} blockCitations={blockCitations} messageUuid={messageUuid}
        className={isStreaming ? 'progressive-markdown' : 'standard-markdown'} isStreaming={isStreaming}
        onLinkClick={onLinkClick} headingLevelOffset={1} typography="prose" smartQuotes={false}
        letterDirection={false} directionTelemetry />
    </div>
  </ChatCodeStyleContext.Provider>;
}
