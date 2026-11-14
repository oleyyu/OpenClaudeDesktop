import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import {
  FIND_ACTIVE_HIGHLIGHT, FIND_HIGHLIGHT, FIND_LABELS, FIND_MUTATION_DEBOUNCE_MS, centerScrollOffset, createFindInput,
  findInputKey, findMatches, findResult, findShortcut, findStatusText, keepActiveIndex, nextActiveIndex,
} from "./transcript-find-model.mjs";
import "./source-find-bar.css";

// Claude 2.2553.1 sidebar-main.js:17787-18130 ZB (the renderer find bar) over
// the transcript provider (scroll-messages-current.js:62900-63071 G9 through
// shared-18 qu/vs). Mounted once by main.jsx outside the keyed transcript (ZB
// is app-level, sidebar-main.js:20491), portaled to body; the keys are ZB's
// own window listeners: ⌘F opens (or re-selects), Escape closes and restores
// the focus, ⌘G / ⇧⌘G / F3 / ⇧F3 step while open. The Edit ▸ Find menu items
// (app-menu.cjs) reach the same open/step through the transcript handle.
// getScope/scroll are read at call time; a new sessionKey (another
// transcript) keeps the bar open, re-observes the new scope and searches the
// query again.
const FIND_Z = 9000; // shared-frame Qc (dp)
// W14-code r5 cleanup css5-transcript-find-icons (E84): the bar is 3.6556.2 shared-23-BZ6ZY5fu.js SM, written with its
// own class strings (no hand-copied .sfb-* rules): the root `o("fixed end-4 top-14","flex items-center gap-1",
// "rounded-lg border-0.5 border-strong bg-surface-3 px-2 py-1.5","shadow-lg")` inside the portaled `c("div",{ref:S})`,
// the input, the status span, and wM's buttons holding `c(ne,{name:"CaretUp",size:"sm"})` (shared-frame od: sm = 16px).
const FIND_ROOT_CLASS = "fixed end-4 top-14 flex items-center gap-1 rounded-lg border-0.5 border-strong bg-surface-3 px-2 py-1.5 shadow-lg";
const FIND_INPUT_CLASS = "w-48 min-w-0 border-0 bg-transparent outline-none text-body text-primary placeholder:text-muted hide-focus-ring";
const FIND_STATUS_CLASS = "whitespace-nowrap text-footnote text-muted-as-secondary tabular-nums";
const FIND_BUTTON_CLASS = "inline-flex size-6 items-center justify-center rounded text-muted-as-secondary hover:bg-surface-0 hover:text-primary can-focus disabled:pointer-events-none disabled:opacity-40";
const ZERO = { activeIndex: 0, total: 0 };
const isMac = () => typeof navigator === "undefined" || /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

function elementOf(node) {
  return node?.nodeType === 1 ? node : node?.parentElement ?? null;
}
// shared-18 no: a match counts only when it is rendered (visible, with a box).
function renderedMatch(range) {
  const element = elementOf(range.startContainer);
  if (!element) return false;
  if (element.ownerDocument.defaultView?.getComputedStyle(element).visibility !== "visible") return false;
  return range.getBoundingClientRect().height > 0;
}
function scrolls(element) {
  if (element.scrollHeight <= element.clientHeight) return false;
  return /auto|scroll|overlay/.test(element.ownerDocument.defaultView?.getComputedStyle(element).overflowY ?? "");
}
function rootInert() {
  return typeof document !== "undefined" && !!document.getElementById("root")?.closest("[inert]");
}

// shortcuts: false while this bar's split side is not the focused one (source-split-view.jsx): the bar stays as it is,
// but ⌘F / ⌘G / Escape belong to the focused side's bar.
export const SourceFindBar = forwardRef(function SourceFindBar({ enabled = true, shortcuts = true, getScope, scroll, sessionKey = null }, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(ZERO);
  const rootRef = useRef(null), inputRef = useRef(null), restoreRef = useRef(null);
  const closing = useRef(false);
  // shared-18 provider state: Z (searched query), Q (active index), the ranges.
  const found = useRef({ query: "", matches: [], index: -1 });
  const latest = useRef({});
  latest.current = { getScope, scroll, open, query, enabled };

  function paint(matches, index) {
    const highlights = globalThis.CSS?.highlights;
    if (!highlights || typeof globalThis.Highlight !== "function") return;
    if (matches.length === 0) {
      highlights.delete(FIND_HIGHLIGHT);
      highlights.delete(FIND_ACTIVE_HIGHLIGHT);
      return;
    }
    // shared-18 Oo: the active pair outranks the match pair (priority 1 vs 0).
    const all = new globalThis.Highlight(...matches.map((match) => match.range));
    all.priority = 0;
    const active = new globalThis.Highlight(...(index >= 0 ? [matches[index].range] : []));
    active.priority = 1;
    highlights.set(FIND_HIGHLIGHT, all);
    highlights.set(FIND_ACTIVE_HIGHLIGHT, active);
  }
  // shared-18 Ko: centre the active match in any scrolling ancestor inside the
  // transcript, then in the transcript itself through its controller.
  function reveal(match) {
    const scope = latest.current.getScope?.();
    let rect = match.range.getBoundingClientRect();
    if (rect.height === 0) return;
    for (let element = elementOf(match.range.startContainer); element && element !== scope && scope?.contains(element); element = element.parentElement) {
      if (!scrolls(element)) continue;
      const offset = centerScrollOffset(rect, element.getBoundingClientRect());
      if (offset === null) continue;
      element.scrollTop += offset;
      rect = match.range.getBoundingClientRect();
    }
    latest.current.scroll?.reveal?.(rect);
  }
  // shared-18 vs over the transcript: count, pick the active match, paint it
  // and (unless only the content changed) bring it into view.
  function run(value, mode, forward = true) {
    const state = found.current;
    if (!value) {
      found.current = { query: "", matches: [], index: -1 };
      paint([], -1);
      setResult(ZERO);
      return;
    }
    const scope = latest.current.getScope?.();
    const document = scope?.ownerDocument;
    const matches = [];
    for (const match of scope ? findMatches(scope, value) : []) {
      try {
        const range = document.createRange();
        range.setStart(match.startNode, match.startOffset);
        range.setEnd(match.endNode, match.endOffset);
        if (renderedMatch(range)) matches.push({ ...match, range });
      } catch {}
    }
    let index;
    if (mode === "keep" && value === state.query) index = keepActiveIndex(state.matches[state.index], matches, state.index);
    else if (mode === "new" || value !== state.query) index = nextActiveIndex({ mode: "new", total: matches.length });
    else index = nextActiveIndex({ index: state.index, total: matches.length, forward, mode: "step" });
    found.current = { query: value, matches, index };
    paint(matches, index);
    setResult(findResult(value, index, matches.length));
    if (mode !== "keep" && index >= 0) reveal(matches[index]);
  }
  const runRef = useRef(run);
  runRef.current = run;
  const input = useRef(null);
  if (!input.current) input.current = createFindInput({ search: (value) => runRef.current(value, "new") });

  function openBar() {
    if (!latest.current.open) {
      const active = document.activeElement;
      restoreRef.current = active && active !== document.body ? active : null;
      setOpen(true);
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }
  // ZB F: Enter / ⌘G / F3 / the buttons search the typed query (a new one
  // when it differs from the last search) one step in either direction; like
  // P, a step drops the pending typing search.
  function step(forward) {
    if (!latest.current.open) { openBar(); return; }
    input.current.cancel();
    runRef.current(latest.current.query, "step", forward);
  }
  // ZB N: clear everything, then give the focus back to where ⌘F found it
  // (not after an overlay took over).
  function close(via) {
    closing.current = true;
    input.current.cancel();
    setOpen(false);
    setQuery("");
    setResult(ZERO);
    found.current = { query: "", matches: [], index: -1 };
    paint([], -1);
    const target = via === "overlay" ? null : restoreRef.current;
    restoreRef.current = null;
    if (target instanceof HTMLElement && document.contains(target)) {
      try { target.focus({ preventScroll: true }); } catch {}
    }
    closing.current = false;
  }
  const closeRef = useRef(close);
  closeRef.current = close;
  useImperativeHandle(ref, () => ({
    open: () => { if (latest.current.enabled && !rootInert()) openBar(); },
    step: (forward = true) => { if (latest.current.enabled && !rootInert()) step(forward !== false); },
    close: () => { if (latest.current.open) closeRef.current("api"); },
  }), []);

  // ZB :17838-17860 / :17968-17985: one window keydown listener, re-added when
  // the bar opens or closes, standing down under a modal (an inert #root).
  useEffect(() => {
    if (!enabled || !shortcuts) return undefined;
    const onKey = (event) => {
      const action = findShortcut(event, { open, mac: isMac() });
      if (!action) return;
      if (rootInert()) return;
      event.preventDefault();
      if (action === "open") openBar();
      else if (action === "close") closeRef.current("escape");
      else step(action === "next");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, open, shortcuts]);
  // ZB: Escape inside the bar is the bar's own (stopPropagation first).
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return undefined;
    const onKey = (event) => {
      if (closing.current || event.defaultPrevented || event.key !== "Escape") return;
      event.stopPropagation();
      if (!event.isComposing) { event.preventDefault(); closeRef.current("escape"); }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [open]);
  // ZB: a disabled provider closes the bar; a modal that takes over closes it
  // without restoring the focus.
  useEffect(() => { if (open && !enabled) closeRef.current("auto"); }, [open, enabled]);
  useEffect(() => {
    const appRoot = document.getElementById("root");
    if (!open || !appRoot) return undefined;
    const observer = new MutationObserver(() => { if (rootInert()) closeRef.current("overlay"); });
    observer.observe(appRoot, { attributes: true, attributeFilter: ["inert"] });
    return () => observer.disconnect();
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);
  // shared-18 Cs('keep') / Es: the transcript changed under an open search;
  // recount once per 60ms burst and keep the active match where it was. Keyed
  // on the session, not on getScope (a fresh closure every main.jsx render):
  // another transcript is observed instead, and the query searched anew.
  const observedSession = useRef(sessionKey);
  useEffect(() => {
    const switched = observedSession.current !== sessionKey;
    observedSession.current = sessionKey;
    const scope = latest.current.getScope?.();
    if (!open || !scope) return undefined;
    if (switched && latest.current.query) { input.current.cancel(); runRef.current(latest.current.query, "new"); }
    let timer = 0;
    const observer = new MutationObserver(() => {
      if (timer || !found.current.query) return;
      timer = setTimeout(() => { timer = 0; if (found.current.query) runRef.current(found.current.query, "keep"); }, FIND_MUTATION_DEBOUNCE_MS);
    });
    observer.observe(scope, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [open, sessionKey]);
  useEffect(() => () => { input.current?.cancel(); paint([], -1); }, []);

  if (!open || typeof document === "undefined") return null;
  const hasMatches = result.total > 0;
  return createPortal(
    <div><div ref={rootRef} role="search" tabIndex={-1} data-find-provider-scope="" className={FIND_ROOT_CLASS} style={{ zIndex: FIND_Z }}>
      <input
        ref={inputRef}
        className={FIND_INPUT_CLASS}
        value={query}
        spellCheck={false}
        autoComplete="off"
        aria-label={FIND_LABELS.input}
        placeholder={FIND_LABELS.placeholder}
        onChange={(event) => {
          if (closing.current) return;
          setQuery(event.target.value);
          input.current.input(event.target.value);
        }}
        onCompositionStart={() => input.current.compositionStart()}
        onCompositionEnd={(event) => {
          if (closing.current) return;
          setQuery(event.currentTarget.value);
          input.current.compositionEnd(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (closing.current) return;
          const direction = findInputKey(event.nativeEvent ?? event);
          if (!direction) return;
          event.preventDefault();
          step(direction === "next");
        }}
      />
      <span role="status" aria-atomic="true" className={FIND_STATUS_CLASS}>{findStatusText(query, result)}</span>
      <FindButton label={FIND_LABELS.previous} icon="CaretUp" disabled={!hasMatches}
        onClick={() => { if (input.current.canStep()) step(false); }} />
      <FindButton label={FIND_LABELS.next} icon="CaretDown" disabled={!hasMatches}
        onClick={() => { if (input.current.canStep()) step(true); }} />
      <FindButton label={FIND_LABELS.close} icon="X" onClick={() => close("button")} />
    </div></div>,
    document.body,
  );
});

// shared-23 wM, with `ne` size "sm" (16px).
function FindButton({ label, icon, ...props }) {
  return (
    <button type="button" aria-label={label} {...props} className={FIND_BUTTON_CLASS}>
      <Icon name={icon} size={16} />
    </button>
  );
}
