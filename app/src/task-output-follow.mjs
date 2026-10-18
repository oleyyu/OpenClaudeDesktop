// The source remembers only follow intent, not a synthesized output position.
// Session + item identity belongs in key; the cache contains no output text.
export function createTaskOutputFollow(limit = 1000) {
  const capacity = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 1000;
  const remembered = new Map();
  return {
    record(key, element) {
      const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (!Number.isFinite(gap)) return;
      remembered.delete(key); remembered.set(key, gap < 16);
      while (remembered.size > capacity) remembered.delete(remembered.keys().next().value);
    },
    update(key, element) {
      if (!element || remembered.get(key) === false) return;
      const selection = element.ownerDocument.defaultView?.getSelection();
      if (selection && !selection.isCollapsed && selection.anchorNode && element.contains(selection.anchorNode)) return;
      element.scrollTop = element.scrollHeight;
    },
  };
}
export const taskOutputFollow = createTaskOutputFollow();

/** Ow + qa (cccc2cf0a :12810-12840, c7f8992b4 T): the sub-agent transcript's stick-to-bottom. It starts unpinned
 * (initialPinned false); snap() jumps to the bottom and pins (Ow's one scrollToBottom when a running task opens
 * with entries). follow() re-snaps after content changes while pinned. An upward wheel releases at once;
 * a user scroll that leaves more than `threshold` px below unpins, and one back within it pins again. Its own
 * programmatic scrolls never count as the user's. A selection inside the scroller holds the position.
 * intent() (R3-topbar TT-05, c7f8992b4 T: `n === "up" && (I.current = performance.now())` while pinned, then
 * `ae = u - I.current < re` → Y(!1)): an up key records the reader's intent, so for `intentMs` an upward scroll that
 * leaves more than 2px below (T's `a <= 2` keeps the pin) lets go, even one whose event has not arrived before the
 * next follow(). Pinning again clears it (Y(!0) resets I). */
export function createStickToBottom({ threshold = 16, intentMs = 1000, now = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
  let pinned = false, expected = null, intentAt = -Infinity;
  const leaves = gap => Number.isFinite(gap) && gap > (now() - intentAt < intentMs ? 2 : threshold);
  const selecting = element => {
    const selection = element.ownerDocument?.defaultView?.getSelection?.();
    return !!(selection && !selection.isCollapsed && selection.anchorNode && element.contains(selection.anchorNode));
  };
  const toBottom = element => {
    const target = Math.max(0, element.scrollHeight - element.clientHeight);
    if (Math.abs(element.scrollTop - target) <= 1) { expected = element.scrollTop; return false; }
    element.scrollTop = target; expected = element.scrollTop; return true;
  };
  return {
    get pinned() { return pinned; },
    snap(element) { if (!element) return false; pinned = true; intentAt = -Infinity; return toBottom(element); },
    follow(element) {
      if (!element || !pinned || selecting(element)) return false;
      // A reader's upward scroll whose scroll event has not arrived yet (a scrollbar drag between two renders)
      // counts before any resnap, so streaming output cannot pull the transcript back under the pointer.
      if (expected !== null && element.scrollTop < expected - 1) {
        expected = null;
        const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
        if (leaves(gap)) { pinned = false; intentAt = -Infinity; return false; }
      }
      return toBottom(element);
    },
    release() { pinned = false; expected = null; intentAt = -Infinity; },
    intent() { if (pinned) intentAt = now(); },
    scrolled(element) {
      if (!element) return pinned;
      if (expected !== null && Math.abs(element.scrollTop - expected) <= 1) return pinned;
      expected = null;
      const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (Number.isFinite(gap)) {
        const next = pinned ? !leaves(gap) : gap <= threshold;
        if (next !== pinned) intentAt = -Infinity;
        pinned = next;
      }
      return pinned;
    },
  };
}
