import { attachTabFocusRelease } from './generated/code-current/tab-focus-release.mjs';
import { keyScrollIntentMs } from './generated/code-current/tab-focus-key-scroll.mjs';
import { useLayoutEffect, useRef, useState } from "react";
import { centerScrollOffset } from "./transcript-find-model.mjs";
import { easeScrollStep, keyScrollDelta, nextScrollTarget, scrollPaddingBottom } from "./pane-keys-model.mjs";

// Claude 2.2553.1: follow controller c7f8992b4, cache cb670556a and
// shared-10 jM observers. This controller is for the local non-virtualized DOM.
const ITEM = "[data-transcript-item-id]";
// Turn actions are siblings of message rows. They release following on
// activation, but must never participate in message anchor measurements.
const INTERACTION_ITEM = `${ITEM}, [data-turn-copy-id]`;
const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const KEEP_PIN =
  "[data-transcript-keeps-pin], [data-transcript-step-navigates]";
let generation = 0;

export function createTranscriptCache(capacity = 50) {
  const entries = new Map();
  return {
    open(key) {
      const previous = entries.get(key);
      const entry = { generation: ++generation, snapshot: previous?.snapshot };
      entries.delete(key);
      entries.set(key, entry);
      while (entries.size > capacity)
        entries.delete(entries.keys().next().value);
      return entry;
    },
    save(key, expectedGeneration, snapshot) {
      const entry = entries.get(key);
      if (!entry || entry.generation !== expectedGeneration) return false;
      entry.snapshot = snapshot;
      return true;
    },
    // R4f-error: 2.42304.0 cd14a8022 T (the session load error's Try again, `$A` in cc43287c9 fV) clears the session's
    // anchors from this LRU. A visit still open on the key can no longer save into it (its generation is gone).
    forget(key) {
      return entries.delete(key);
    },
    get size() {
      return entries.size;
    },
  };
}

const cache = createTranscriptCache();

// R4f-error: forget one transcript's saved reading position (src/source-session-load-error-adapters.jsx
// forgetScrollAnchors), so the transcript that remounts after Try again starts fresh instead of restoring the anchor it
// crashed on.
export function forgetTranscriptScroll(key) {
  return cache.forget(key);
}

export function isUpwardWheel(event) {
  return (
    !event.ctrlKey &&
    event.deltaY < 0 &&
    Math.abs(event.deltaY) > Math.abs(event.deltaX)
  );
}

export function isUpNavigationKey(event) {
  return navigationDirection(event) === "up";
}

// The key classifier (2.42304.0 c7f8992b4-BX_ywd4_.js C, exported n): Shift+Tab classifies as "up", as in the source.
// What a consumer does with that is decided by transcriptKeyIntent below.
export function navigationDirection(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) return "none";
  if (event.key === "Tab") return event.shiftKey ? "up" : "none";
  if (["ArrowUp", "PageUp", "Home"].includes(event.key)) return "up";
  if (["ArrowDown", "PageDown", "End"].includes(event.key)) return "down";
  if (event.key === " " || event.code === "Space")
    return event.shiftKey ? "up" : "down";
  return "none";
}

// Intents: "release" (let go of the tail now), "up" and "intent" (record the reader's upward intent: an upward scroll
// within keyScrollIntentMs is the reader's and lets go of the tail), "down" (end a glide; the next scroll is the
// reader's) and "none".
export function transcriptKeyIntent(event, context) {
  // c7f8992b4 T: a classified "up" only records the intent (`n === "up" && (I.current = performance.now())`); the
  // upward scroll that follows within `re` = 1e3 ms lets go of the tail (`ae = u - I.current < re` → Y(!1)). So no up
  // key releases at keydown (R3-topbar TT-05). Shift+Tab ("intent") is read before the target checks, as in C; whether
  // it moved focus above the viewport is decided by the mounted attachTabFocusRelease (c9f414608 i), and the browser's
  // own focus scroll upward is then the reader's. c4a9ee384 keeps Tab out of its up-key handling too
  // (`e.key !== "Tab" && nn(e, l) === "up"`).
  if (event.key === "Tab") return navigationDirection(event) === "up" ? "intent" : "none";
  // Source Tve row activation runs separately from the scroll-key classifier:
  // Space on a historical button releases following before its click expands
  // content. Space on the viewport itself remains downward navigation.
  if ((!context.inViewport && !context.bodyTarget) || context.editable)
    return "none";
  if (
    (event.key === "Enter" || event.key === " ") &&
    context.inViewport &&
    context.inItem &&
    !context.keepsPin
  )
    return "release";
  return navigationDirection(event);
}

export function identityMatches(identity, expected = {}) {
  return (
    (expected.expectedSessionKey === undefined ||
      expected.expectedSessionKey === identity.sessionKey) &&
    (expected.expectedGeneration === undefined ||
      expected.expectedGeneration === identity.generation)
  );
}

// A resize may clamp scrollTop to the new maximum, and a row that shrinks and
// regrows inside one frame (a placeholder swapped for the real row) clamps it
// below a maximum that has already grown again by the time the scroll event is
// read. So while the layout changed, an upward movement is the user's only with
// a real intent: a wheel, key or touch (userScrollPending) or a pointer press on
// the viewport, which Chromium also dispatches for its own scrollbar
// (dragActive). Without that, following stays pinned and the next frame
// returns to the tail.
// scroll-follow-current.js:31 (le) and :655-670: a smooth jump glides for up
// to 1500ms; while it glides its own scroll events are not user movement,
// unless a wheel, key or touch intent arrives (which ends the glide).
export const GLIDE_MS = 1500;
export function glideDeadline(now, distance) {
  return distance > 2 ? now + GLIDE_MS : 0;
}
// The classic chip jumps smoothly (c360a9e1c-GPs-MV9u.js:3944-3978 od); a
// reduced-motion preference turns it into the instant jump that Send uses.
export function jumpBehavior(requested, reducedMotion) {
  return requested === "smooth" && !reducedMotion ? "smooth" : "instant";
}
export function prefersReducedMotion(view) {
  const root = view?.document?.documentElement;
  return root?.dataset.reduceMotion === "true" || root?.dataset.localMotion === "reduce"
    || !!view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function isUserScrollMovement({
  delta,
  top,
  maximum,
  layoutChanged,
  explicitIntent,
  programmatic,
  gliding = false,
}) {
  if (programmatic) return false;
  if (gliding && !explicitIntent) return false;
  return !layoutChanged || explicitIntent || delta > 2;
}

function visible(viewport) {
  return (
    viewport.isConnected &&
    viewport.clientWidth > 0 &&
    viewport.clientHeight > 0
  );
}

function geometry(viewport) {
  return {
    height: viewport.scrollHeight,
    width: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
  };
}

function changed(a, b) {
  return (
    !a ||
    a.height !== b.height ||
    a.width !== b.width ||
    a.viewportHeight !== b.viewportHeight
  );
}

function measure(viewport, content, following) {
  const bounds = viewport.getBoundingClientRect();
  const nodes = content.querySelectorAll(ITEM);
  let anchor;
  for (const node of nodes) {
    const row = node.getBoundingClientRect();
    if (row.height > 0 && row.bottom > bounds.top && row.top < bounds.bottom) {
      anchor = {
        itemId: node.dataset.transcriptItemId,
        offset: row.top - bounds.top,
      };
      break;
    }
  }
  return {
    following,
    anchor,
    scrollTop: viewport.scrollTop,
    viewportWidth: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
  };
}

export function useTranscriptScroll({ sessionKey, ready }) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const endRef = useRef(null);
  const controller = useRef(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [view, setView] = useState({
    following: true,
    showJump: false,
    showFade: false,
  });
  const api = useRef({
    capture: () => controller.current?.capture(),
    getIdentity: () => controller.current?.identity ?? null,
    // expected: {expectedSessionKey, expectedGeneration, behavior}; 'smooth'
    // is the classic chip, anything else (Send) the instant jump.
    jumpToLatest: (expected) => controller.current?.jump(expected) ?? false,
    forwardWheel: (event) => controller.current?.forwardWheel(event),
    // Feed keyboard navigation (N9 setPinned(false)) and the find bar's match
    // reveal (G9 B: cancel the in-flight scroll, unpin, then centre).
    release: () => controller.current?.release(),
    reveal: (rect) => controller.current?.reveal(rect) ?? false,
    getContent: () => contentRef.current,
    getViewport: () => viewportRef.current,
    // cc43287c9 :45084-45156 (kn/jn/An): an Arrow or Page key from anywhere in the pane scrolls the transcript with
    // an eased animation (pane-keys-model.mjs). keyScroll returns whether this transcript took the key.
    keyScroll: (name) => controller.current?.keyScroll(name) ?? false,
    cancelKeyScroll: () => controller.current?.cancelKeyScroll(),
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const end = endRef.current;
    if (!viewport || !content || !end || !sessionKey) {
      controller.current = null;
      setView({ following: true, showJump: false, showFade: false });
      return;
    }
    const entry = cache.open(sessionKey);
    const identity = Object.freeze({
      sessionKey,
      generation: entry.generation,
    });
    let disposed = false;
    let following = entry.snapshot?.following ?? true;
    let snapshot = entry.snapshot;
    let pendingRestore = true;
    let hidden = !visible(viewport);
    let touchActive = false;
    let touchY = null;
    let frame = 0;
    let lastTop = viewport.scrollTop;
    let lastGeometry = geometry(viewport);
    let ownTarget = null;
    let jumpInRange = true;
    let fadeInRange = true;
    let userScrollPending = false;
    let dragActive = false;
    let glideUntil = 0;
    let glideTarget = null;
    let glideTimer = 0;
    // Eased key scroll (cc43287c9 kn target / jn last written top / An frame); keyIntent marks its writes as the
    // user's movement for onScroll, like a wheel or key intent.
    let keyTarget = null;
    let keyLast = null;
    let keyFrame = 0;
    let keyIntent = false;
    // c7f8992b4 T I.current: when an up key (or Shift+Tab) was last pressed; for keyScrollIntentMs (re = 1e3) an upward
    // scroll is the reader's even while the layout changes. Cleared when the tail is pinned again (Y(!0)).
    let upKeyAt = -Infinity;
    const upKeyIntent = () => performance.now() - upKeyAt < keyScrollIntentMs;

    const live = () => !disposed && controller.current?.identity === identity;
    function publish() {
      if (!live()) return;
      const measurable = visible(viewport);
      const next = {
        following,
        showJump: measurable && !pendingRestore && !following && !jumpInRange,
        showFade: measurable && !pendingRestore && !fadeInRange,
      };
      setView((old) =>
        old.following === next.following &&
        old.showJump === next.showJump &&
        old.showFade === next.showFade
          ? old
          : next,
      );
    }
    function save() {
      if (!live() || !visible(viewport) || pendingRestore || hidden)
        return snapshot;
      const next = measure(viewport, content, following);
      // A provisional loading-only DOM must never replace a useful row anchor.
      if (!next.anchor && snapshot?.anchor && !readyRef.current)
        return snapshot;
      snapshot = next;
      cache.save(sessionKey, identity.generation, snapshot);
      return snapshot;
    }
    function write(top) {
      const target = Math.max(
        0,
        Math.min(top, viewport.scrollHeight - viewport.clientHeight),
      );
      if (Math.abs(viewport.scrollTop - target) > 0.1) {
        ownTarget = target;
        viewport.scrollTop = target;
      }
      lastTop = viewport.scrollTop;
    }
    function restore(saved) {
      if (saved?.anchor) {
        const row = Array.from(content.querySelectorAll(ITEM)).find(
          (node) => node.dataset.transcriptItemId === saved.anchor.itemId,
        );
        if (row) {
          write(
            viewport.scrollTop +
              row.getBoundingClientRect().top -
              viewport.getBoundingClientRect().top -
              saved.anchor.offset,
          );
          return true;
        }
      }
      return false;
    }
    const view = viewport.ownerDocument.defaultView;
    const gliding = () => glideUntil > performance.now();
    function endGlide() {
      glideUntil = 0;
      glideTarget = null;
      if (glideTimer) view?.clearTimeout(glideTimer);
      glideTimer = 0;
    }
    function glide() {
      glideTarget = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      viewport.scrollTo({ top: glideTarget, behavior: "smooth" });
    }
    function updateRangeFallback() {
      // IO is authoritative once it has delivered. Initial measurement avoids
      // a stale visible button between a direct jump and the next IO delivery.
      const distance =
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
      jumpInRange = distance <= 200;
      fadeInRange = distance <= 8;
    }
    function flush() {
      frame = 0;
      if (!live()) return;
      if (!visible(viewport)) {
        hidden = true;
        publish();
        return;
      }
      const now = geometry(viewport);
      if (hidden) {
        hidden = false;
        pendingRestore = true;
      }
      if (touchActive || (dragActive && following)) {
        publish();
        return;
      }
      if (pendingRestore) {
        if (!readyRef.current) {
          publish();
          return;
        }
        if (following) write(viewport.scrollHeight);
        else if (!restore(snapshot)) {
          // Official missing-anchor terminal fallback parks at the tail. The
          // local app has no historical paging API to recover a missing row.
          write(viewport.scrollHeight);
          following = true;
        }
        pendingRestore = false;
      } else if (following && gliding()) {
        // Content that grew during the glide extends it instead of snapping.
        if (viewport.scrollHeight - viewport.clientHeight > glideTarget + 2)
          glide();
      } else if (following) {
        if (
          viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop >
          2
        )
          write(viewport.scrollHeight);
      } else if (changed(lastGeometry, now)) {
        restore(snapshot);
      }
      lastGeometry = geometry(viewport);
      lastTop = viewport.scrollTop;
      userScrollPending = false;
      updateRangeFallback();
      save();
      publish();
    }
    function schedule() {
      if (live() && !frame) frame = requestAnimationFrame(flush);
    }
    function release() {
      if (!live() || !visible(viewport)) return;
      endGlide();
      following = false;
      pendingRestore = false;
      ownTarget = null;
      save();
      updateRangeFallback();
      publish();
    }
    function onScroll() {
      if (!live()) return;
      if (!visible(viewport)) {
        hidden = true;
        publish();
        return;
      }
      const top = viewport.scrollTop;
      const delta = top - lastTop;
      const layoutChanged = changed(lastGeometry, geometry(viewport));
      const own = ownTarget != null && Math.abs(top - ownTarget) <= 2;
      const maximum = viewport.scrollHeight - viewport.clientHeight;
      const userMovement = isUserScrollMovement({
        delta,
        top,
        maximum,
        layoutChanged,
        explicitIntent: userScrollPending || dragActive || keyIntent || upKeyIntent(),
        programmatic: own,
        gliding: gliding(),
      });
      // :359: arriving at the tail ends the glide.
      if (glideUntil && maximum - top <= 2) endGlide();
      // A coalesced scroll event may already contain a user override. Once
      // observed, an old target must not mask a later user return to that y.
      ownTarget = null;
      if (userMovement && !pendingRestore && !hidden) {
        if (delta < -2) following = false;
        else if (
          delta > 0 &&
          viewport.scrollHeight - viewport.clientHeight - top <= 1
        ) {
          following = true;
          upKeyAt = -Infinity;
        }
      }
      lastTop = top;
      keyIntent = false;
      // Save user movement before RO/frame compensation uses the previous
      // anchor; do not save a browser clamp caused by content/viewport resize.
      if (
        (userMovement || (own && !layoutChanged)) &&
        !pendingRestore &&
        !hidden
      )
        save();
      userScrollPending = false;
      updateRangeFallback();
      publish();
      schedule();
    }
    function stopKeyScroll() {
      if (keyFrame) cancelAnimationFrame(keyFrame);
      keyFrame = 0;
      keyTarget = null;
      keyLast = null;
    }
    // r(): a quarter of the remaining distance per frame; a scroll that moved the viewport elsewhere (a wheel, a
    // drag, a jump) ends the animation.
    function keyStep() {
      keyFrame = 0;
      if (!live() || keyTarget === null || !visible(viewport)) return stopKeyScroll();
      const top = viewport.scrollTop;
      if (keyLast !== null && Math.abs(top - keyLast) > 1) return stopKeyScroll();
      keyTarget = nextScrollTarget({ pending: keyTarget, scrollHeight: viewport.scrollHeight, clientHeight: viewport.clientHeight });
      const step = easeScrollStep(top, keyTarget);
      ownTarget = null;
      keyIntent = true;
      viewport.scrollTop = step.top;
      keyLast = viewport.scrollTop;
      if (step.done) return stopKeyScroll();
      keyFrame = requestAnimationFrame(keyStep);
    }
    function onWheel(event) {
      if (isUpwardWheel(event) && viewport.scrollTop > 0) release();
      if (!event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        endGlide();
        userScrollPending = true;
        ownTarget = null;
      }
    }
    function onKey(event) {
      if (!live() || !visible(viewport)) return;
      // Split view: a key from outside this transcript belongs to the focused side, not the one that stands down.
      if (!viewport.contains(event.target) && viewport.closest?.("[data-split-inactive]")) return;
      const intent = transcriptKeyIntent(event, {
        inViewport: viewport.contains(event.target),
        bodyTarget: event.target === viewport.ownerDocument.body,
        editable: !!event.target.closest?.(EDITABLE),
        inItem: !!event.target.closest?.(INTERACTION_ITEM),
        keepsPin: !!event.target.closest?.(KEEP_PIN),
      });
      if (intent === "release") release();
      // R3-topbar TT-05 (c7f8992b4 T `n === "up" && (I.current = performance.now())`): an up key and Shift+Tab only
      // record the intent; the upward scroll that follows within keyScrollIntentMs lets go of the tail (onScroll), and
      // a key that scrolls nothing keeps following. Shift+Tab's release is attachTabFocusRelease's. A wheel, key or
      // touch intent ends a jump's glide.
      else if (intent === "up" || intent === "intent") {
        upKeyAt = performance.now();
        endGlide();
        ownTarget = null;
      } else if (intent === "down") {
        endGlide();
        userScrollPending = true;
        ownTarget = null;
      }
    }
    function onPointer(event) {
      if (
        event.target.closest?.(INTERACTION_ITEM) &&
        !event.target.closest?.(`${KEEP_PIN}, ${EDITABLE}`)
      )
        release();
    }
    function onMouseDown(event) {
      let target = event.target;
      while (target && target !== viewport) {
        const style = getComputedStyle(target);
        if (
          (target.scrollHeight > target.clientHeight &&
            /auto|scroll/.test(style.overflowY)) ||
          (target.scrollWidth > target.clientWidth &&
            /auto|scroll/.test(style.overflowX))
        )
          return;
        target = target.parentElement;
      }
      dragActive = true;
      ownTarget = null;
    }
    function onMouseUp() {
      dragActive = false;
      schedule();
    }
    function onTouchStart(event) {
      endGlide();
      touchActive = true;
      touchY = event.touches[0]?.clientY ?? null;
    }
    function onTouchMove(event) {
      const y = event.touches[0]?.clientY;
      if (touchY != null && y != null && Math.abs(y - touchY) > 4)
        userScrollPending = true;
      if (
        touchY != null &&
        y != null &&
        y - touchY > 4 &&
        viewport.scrollTop > 0
      )
        release();
    }
    function onTouchEnd() {
      touchActive = false;
      touchY = null;
      schedule();
    }
    const local = {
      identity,
      capture: save,
      readyChanged: schedule,
      jump(expected = {}) {
        if (
          !live() ||
          !visible(viewport) ||
          !identityMatches(identity, expected)
        )
          return false;
        following = true;
        upKeyAt = -Infinity;
        pendingRestore = false;
        hidden = false;
        endGlide();
        const behavior = jumpBehavior(expected.behavior, prefersReducedMotion(view));
        const deadline = behavior === "smooth"
          ? glideDeadline(performance.now(), viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop)
          : 0;
        if (deadline) {
          // scroll-follow-current.js:655-670: scrollTo smooth, pinned at once,
          // the glide guard until the tail or the deadline (then catch up).
          glideUntil = deadline;
          glideTimer = view?.setTimeout(() => { glideTimer = 0; endGlide(); schedule(); }, GLIDE_MS) ?? 0;
          ownTarget = null;
          glide();
        } else write(viewport.scrollHeight);
        lastGeometry = geometry(viewport);
        updateRangeFallback();
        save();
        publish();
        return true;
      },
      release,
      keyScroll(name) {
        if (!live() || !visible(viewport) || viewport.scrollHeight <= viewport.clientHeight) return false;
        const delta = keyScrollDelta(name, { clientHeight: viewport.clientHeight, scrollPaddingBottom: scrollPaddingBottom(viewport) });
        if (!delta) return false;
        // An upward move leaves the tail (onKey's release for a key aimed at the transcript); a downward one ends a
        // jump's glide, and reaching the tail re-pins through onScroll.
        if (delta < 0) release();
        else endGlide();
        keyTarget = nextScrollTarget({ pending: keyTarget, scrollTop: viewport.scrollTop, scrollHeight: viewport.scrollHeight,
          clientHeight: viewport.clientHeight, delta });
        if (!keyFrame) {
          keyLast = viewport.scrollTop;
          keyFrame = requestAnimationFrame(keyStep);
        }
        return true;
      },
      cancelKeyScroll: stopKeyScroll,
      // shared-18 Ko/Vo: a find match outside the visible band (cut at the
      // scroller's scroll-padding-bottom) is centred; following is released
      // first, as G9's scrollToIndex does.
      reveal(rect) {
        if (!live() || !visible(viewport) || !rect) return false;
        release();
        const style = view?.getComputedStyle(viewport);
        const padding = Number.parseFloat(style?.scrollPaddingBottom ?? "");
        const bounds = viewport.getBoundingClientRect();
        const offset = centerScrollOffset(rect, bounds, padding > 0 ? bounds.bottom - padding : undefined);
        if (offset !== null) {
          write(viewport.scrollTop + offset);
          lastGeometry = geometry(viewport);
          updateRangeFallback();
          save();
          publish();
        }
        return true;
      },
      // c360a9e1c od wrapper: a wheel over the chip scrolls the transcript.
      forwardWheel(event) {
        if (!live() || !visible(viewport)) return;
        onWheel(event);
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
        viewport.scrollBy({ top: event.deltaY * unit, left: 0 });
      },
    };
    controller.current = local;
    const detachTabFocusRelease = attachTabFocusRelease(viewport, { isPinned: () => following, setPinned: value => { if (!value) release(); } });
    const resize = new ResizeObserver(schedule);
    resize.observe(viewport);
    resize.observe(content);
    const observers = [200, 8].map((margin, index) => {
      const observer = new IntersectionObserver(
        ([record]) => {
          if (!live() || !visible(viewport) || !record) return;
          if (index === 0) jumpInRange = record.isIntersecting;
          else fadeInRange = record.isIntersecting;
          publish();
        },
        { root: viewport, rootMargin: `0px 0px ${margin}px 0px`, threshold: 0 },
      );
      observer.observe(end);
      return observer;
    });
    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("wheel", onWheel, {
      passive: true,
      capture: true,
    });
    viewport.ownerDocument.addEventListener("keydown", onKey, true);
    viewport.addEventListener("mousedown", onMouseDown, true);
    viewport.ownerDocument.addEventListener("mouseup", onMouseUp, true);
    viewport.ownerDocument.defaultView?.addEventListener("blur", onMouseUp);
    content.addEventListener("pointerdown", onPointer, true);
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: true });
    updateRangeFallback();
    flush();
    return () => {
      save();
      disposed = true;
      endGlide();
      stopKeyScroll();
      cancelAnimationFrame(frame);
      resize.disconnect();
      observers.forEach((observer) => observer.disconnect());
      detachTabFocusRelease();
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("wheel", onWheel, true);
      viewport.ownerDocument.removeEventListener("keydown", onKey, true);
      viewport.removeEventListener("mousedown", onMouseDown, true);
      viewport.ownerDocument.removeEventListener("mouseup", onMouseUp, true);
      viewport.ownerDocument.defaultView?.removeEventListener(
        "blur",
        onMouseUp,
      );
      content.removeEventListener("pointerdown", onPointer, true);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      if (controller.current === local) controller.current = null;
    };
  }, [sessionKey]);

  useLayoutEffect(() => {
    controller.current?.readyChanged();
  }, [ready]);
  return { viewportRef, contentRef, endRef, api: api.current, ...view };
}
