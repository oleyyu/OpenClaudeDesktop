import React, { useId, useLayoutEffect, useRef } from "react";
import {
  FEED_INSTRUCTIONS, FEED_LABEL, articleLabel, currentArticleIndex, feedArticles, feedKeyAction,
  isStreamingArticle, plainEscape, responseHeading,
} from "./transcript-feed-nav.mjs";
import { landTranscriptFocus } from "./generated/code-current/transcript-focus-landing.mjs";

// Claude 2.2553.1 scroll-messages-current.js N9 (:60985-61288) for the local
// non-virtualized transcript. The rows are rendered by many components
// (source-session.jsx, source-tool-group.jsx, source-agent.jsx), so the feed
// structure is applied to the DOM here: every top-level row of
// .source-transcript-content is described, the articles are picked by
// transcript-feed-nav.mjs and get role=article, aria-posinset/-setsize, the
// roving tabIndex and their label; the head row of an answer also carries the
// sr-only x5 'DeepSeek responded: …' heading (the prompt's 'You said: …' is
// rendered by SourceUserMessage).
const ROW = "[data-transcript-item-id], [data-tool-group]";
const ARTICLE = "data-feed-article";
const HEADING = "data-feed-heading";
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
// cb50b3202 i/o: Escape stays with an editor, an escape owner or any open popup.
const OPEN_POPUP = '[data-popup-open], [role="dialog"], [data-open][role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"][aria-expanded="true"]';

function rowKey(element) {
  const id = element.getAttribute("data-transcript-item-id");
  if (id != null) return id;
  return `group:${element.getAttribute("data-tool-group")}`;
}
function describeRows(content) {
  const rows = [];
  for (const element of content.children) {
    if (element.classList.contains("source-message") && element.matches(ROW)) {
      rows.push({ element, key: rowKey(element), kind: element.matches('[data-cds="UserMessage"]') ? "user" : "response",
        hidden: element.hidden || element.getClientRects().length === 0, turnStart: element.hasAttribute("data-turn-start") });
    } else if (element.getAttribute("aria-hidden") !== "true") rows.push({ element, kind: "boundary" });
  }
  return rows;
}
// fve: an editable target keeps its arrows.
function editableTarget(target) {
  return !!target && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable === true);
}
// cf6ae6197 pw (qm): a focusable scroller keeps its arrows. An article row is
// never one, and an element only scrolls when its overflow lets it.
function scrollerTarget(target) {
  if (!target || target.hasAttribute?.(ARTICLE) || !(target.tabIndex >= 0) || target.scrollHeight <= target.clientHeight) return false;
  const overflow = target.ownerDocument.defaultView?.getComputedStyle(target).overflowY ?? "";
  return /auto|scroll|overlay/.test(overflow);
}
function escapeOwnedElsewhere(article) {
  const document = article.ownerDocument, active = document.activeElement;
  if (active && active !== document.body && (editableTarget(active) || active.closest?.("[data-escape-owner]"))) return true;
  return document.querySelector(OPEN_POPUP) !== null;
}

export function useTranscriptFeedNav({ viewportRef, contentRef, api, responding = false, enabled = true, resolveMessage, onEscape, landsFocus = false }) {
  const instructionsId = useId();
  const activeKey = useRef(null);
  const state = useRef({ articles: [], current: -1 });
  const applied = useRef(new Map()); // element -> 'article' | 'none'
  const headings = useRef(new Map()); // element -> h2
  const pointerDownAt = useRef(-Infinity);
  const pointerFocus = useRef(false);
  // DC-07: c96d752d0's `se` — the last pointer press anywhere in the transcript (f6 skips a focus that follows one).
  const anyPointerDownAt = useRef(-Infinity);
  const latest = useRef({});
  latest.current = { responding, enabled, resolveMessage, onEscape, api, landsFocus };

  function clearRow(element) {
    element.removeAttribute(ARTICLE);
    element.removeAttribute("role");
    element.removeAttribute("aria-posinset");
    element.removeAttribute("aria-setsize");
    element.removeAttribute("aria-label");
    element.removeAttribute("tabindex");
    headings.current.get(element)?.remove();
    headings.current.delete(element);
  }
  function setHeading(element, text) {
    let heading = headings.current.get(element);
    if (!text) {
      heading?.remove();
      headings.current.delete(element);
      return;
    }
    if (!heading) {
      heading = element.ownerDocument.createElement("h2");
      heading.className = "sr-only select-none";
      heading.setAttribute("data-find-omitted", "");
      heading.setAttribute(HEADING, "");
      headings.current.set(element, heading);
    }
    if (heading.textContent !== text) heading.textContent = text;
    if (element.firstChild !== heading) element.insertBefore(heading, element.firstChild);
  }
  function headingFor(article, streaming) {
    const resolve = latest.current.resolveMessage;
    if (!resolve) return null;
    for (const key of article.rows) {
      const text = key.startsWith("group:") ? null : resolve(key);
      if (typeof text === "string" && text.trim()) return responseHeading(text, { streaming });
    }
    return null;
  }
  function sync() {
    const content = contentRef.current;
    const next = new Map();
    if (content && latest.current.enabled) {
      const rows = describeRows(content);
      const articles = feedArticles(rows);
      const elements = new Map(rows.filter((row) => row.kind !== "boundary").map((row) => [row.key, row.element]));
      const current = currentArticleIndex(articles, activeKey.current);
      const heads = new Set(articles.map((article) => article.key));
      articles.forEach((article, index) => {
        const element = elements.get(article.key);
        article.element = element;
        const streaming = isStreamingArticle(articles, index, latest.current.responding);
        next.set(element, "article");
        element.setAttribute(ARTICLE, "");
        element.setAttribute("role", "article");
        element.setAttribute("aria-posinset", String(index + 1));
        element.setAttribute("aria-setsize", String(articles.length));
        element.setAttribute("aria-label", articleLabel({ position: index + 1, streaming }));
        element.tabIndex = index === current ? 0 : -1;
        if (article.kind === "response") setHeading(element, headingFor(article, streaming));
        else setHeading(element, null);
      });
      // A non-head row rendered as <article> would otherwise read as an
      // extra, unnumbered article (the source's item rows are plain divs).
      for (const row of rows)
        if (row.kind !== "boundary" && !heads.has(row.key) && row.element.tagName === "ARTICLE") {
          if (applied.current.get(row.element) === "article") clearRow(row.element);
          row.element.setAttribute("role", "none");
          next.set(row.element, "none");
        }
      state.current = { articles, current };
    } else state.current = { articles: [], current: -1 };
    for (const element of applied.current.keys()) if (!next.has(element)) clearRow(element);
    applied.current = next;
  }
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useLayoutEffect(() => {
    const content = contentRef.current;
    syncRef.current();
    if (!content) return undefined;
    const view = content.ownerDocument.defaultView;
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (!frame) frame = view.requestAnimationFrame(() => { frame = 0; syncRef.current(); });
    });
    observer.observe(content, { childList: true });
    return () => {
      observer.disconnect();
      if (frame) view.cancelAnimationFrame(frame);
      for (const element of applied.current.keys()) clearRow(element);
      applied.current = new Map();
    };
  }, [contentRef]);
  useLayoutEffect(() => { syncRef.current(); }, [responding, enabled]);

  function focusArticle(index, last) {
    const { articles } = state.current;
    const element = articles[index]?.element;
    if (!element) return;
    activeKey.current = articles[index].key;
    syncRef.current();
    const scroll = latest.current.api;
    if (last) scroll?.jumpToLatest?.();
    else {
      scroll?.release?.();
      element.scrollIntoView({ block: "nearest" });
    }
    element.focus({ preventScroll: true });
  }

  const feedProps = !enabled ? {} : {
    role: "feed",
    "aria-label": FEED_LABEL,
    "aria-busy": !!responding,
    "aria-describedby": instructionsId,
    onKeyDown(event) {
      pointerDownAt.current = -Infinity;
      const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
      const viewport = viewportRef.current;
      if (!target || !viewport?.contains(target)) return;
      const article = target.closest(`[${ARTICLE}]`);
      if (event.key === "Escape") {
        // N9: plain Escape inside an article hands focus to the composer when
        // nothing else owns it; the event is left for the other listeners.
        if (article && plainEscape(event.nativeEvent ?? event) && !escapeOwnedElsewhere(article)) latest.current.onEscape?.();
        return;
      }
      syncRef.current();
      const { articles, current } = state.current;
      const currentElement = articles[current]?.element;
      // The native event: a descendant's React handler that prevented the key
      // marks it there (N9 runs after the rows' own handlers).
      const action = feedKeyAction(event.nativeEvent ?? event, {
        count: articles.length, current,
        inArticle: !!article,
        focusInCurrent: !!currentElement && currentElement.contains(target.ownerDocument.activeElement),
        pointerFocus: pointerFocus.current,
        editable: editableTarget(target),
        scroller: scrollerTarget(target),
      });
      if (!action || action.type === "escape") return;
      event.preventDefault();
      if (action.type === "repin") {
        latest.current.api?.jumpToLatest?.();
        currentElement?.focus({ preventScroll: true });
        return;
      }
      focusArticle(action.index, action.last);
    },
    // N9 L: focusing anything inside an article makes it the roving stop; a
    // focus that follows a pointer press within 500ms disarms the arrows.
    onFocus(event) {
      // W14-code r2 DC-07 (Code): c96d752d0's transcript onFocus — `f6(e, {scroller: e.currentTarget, pointerDownAt:
      // se.current, tabPresses: _?.current, isPinned: o, scrollToTail: i, setPinned: a ?? Kit})`: while the transcript
      // follows its tail, a focus that comes in from outside onto something out of view goes to the tail's last visible
      // article (generated/code-current/transcript-focus-landing.mjs). No Tab-press tracker here (tabPresses null).
      const { api: scrollApi, landsFocus: lands } = latest.current;
      if (lands && scrollApi?.isPinned && event.currentTarget === viewportRef.current)
        landTranscriptFocus(event, { scroller: event.currentTarget, pointerDownAt: anyPointerDownAt.current, tabPresses: null,
          isPinned: scrollApi.isPinned, scrollToTail: () => { scrollApi.jumpToLatest?.(); }, setPinned: (value) => { if (!value) scrollApi.release?.(); } });
      const target = event.target?.nodeType === 1 ? event.target : null;
      const article = target?.closest?.(`[${ARTICLE}]`);
      if (!article || !viewportRef.current?.contains(article)) return;
      pointerFocus.current = performance.now() - pointerDownAt.current < 500;
      pointerDownAt.current = -Infinity;
      const { articles } = state.current;
      const found = articles.find((entry) => entry.element === article);
      if (found && found.key !== activeKey.current) {
        activeKey.current = found.key;
        syncRef.current();
      }
    },
    onPointerDownCapture(event) {
      anyPointerDownAt.current = performance.now();
      const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
      pointerDownAt.current = target?.closest?.('[role="article"]') ? performance.now() : -Infinity;
    },
  };
  const instructions = enabled
    ? React.createElement("p", { id: instructionsId, className: "sr-only select-none", "data-find-omitted": "" }, FEED_INSTRUCTIONS)
    : null;
  return { feedProps, instructions };
}
