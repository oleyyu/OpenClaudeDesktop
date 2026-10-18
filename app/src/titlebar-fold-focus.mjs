// R3-topbar TT-03: when the titlebar folds a toggle that holds keyboard focus, focus moves to the toggle that took its
// place, as 2.42304.0 cc43287c9 uW does. uW keeps every toggle Button's node by pane (its `ref` is `e => h(pane, e)`):
//
//   h(e, t): t !== null → d.set(e, t), and a pending hand-off for that pane is dropped (it came back);
//            t === null → if the node was the document's activeElement and :focus-visible, f = {pane, doc}; d.delete(e)
//   P(() => { e = inline panes; n = previous; m = e; r = f; f = null; if (!r) return;
//             i = n.indexOf(r.pane); a = () => d.get(r.pane) ?? d.get(m[i] ?? m.at(-1));
//             o = as() && vI(r.doc) ? a() : void 0; o?.focus({preventScroll:true});
//             queueMicrotask(() => { (!vI(r.doc) && r.doc.activeElement !== o) || a()?.focus({preventScroll:true}) }) },
//     [specs, hiddenCount, owner, as()])
//
// P is the layout effect (vendor-frame yo = useLayoutEffect). vI is c4db265df Ze (generated titlebar-focus-orphaned.mjs:
// focus fell to the body or to a disconnected node). as() is shared-4 kd, the `spa:cai_curious_tower` toolbar
// (localStorage "1"); OpenClaude has no such toolbar, so `o` is undefined and only the microtask hand-off runs.
import { useLayoutEffect, useRef } from "react";
import { focusOrphaned } from "./generated/code-current/titlebar-focus-orphaned.mjs";

const toolbarOn = false;

// The bookkeeping without React: `ref(pane)` is a stable ref callback per pane and `commit(inlinePanes)` runs after
// the DOM settled. `schedule` defaults to queueMicrotask (injectable for tests).
export function createFoldFocusHandoff({ schedule = queueMicrotask, orphaned = focusOrphaned } = {}) {
  const nodes = new Map(), refs = new Map();
  let pending = null, previous = [];
  function attach(pane, node) {
    if (node !== null) {
      nodes.set(pane, node);
      if (pending?.pane === pane) pending = null;
      return;
    }
    const last = nodes.get(pane);
    if (last !== undefined && last.ownerDocument.activeElement === last && last.matches(":focus-visible")) pending = { pane, doc: last.ownerDocument };
    nodes.delete(pane);
  }
  return {
    ref(pane) {
      let callback = refs.get(pane);
      if (!callback) refs.set(pane, (callback = (node) => attach(pane, node)));
      return callback;
    },
    commit(inlinePanes) {
      const before = previous;
      previous = inlinePanes;
      const lost = pending;
      pending = null;
      if (lost === null) return;
      const index = before.indexOf(lost.pane);
      const next = () => {
        const at = previous[index] ?? previous[previous.length - 1];
        return nodes.get(lost.pane) ?? (at === undefined ? undefined : nodes.get(at));
      };
      const now = toolbarOn && orphaned(lost.doc) ? next() : undefined;
      now?.focus({ preventScroll: true });
      schedule(() => {
        if (!orphaned(lost.doc) && lost.doc.activeElement !== now) return;
        next()?.focus({ preventScroll: true });
      });
    },
  };
}

// uW's `g = owner !== null && !inOtherWindow`: without toggles (no owner) the hand-off sees an empty inline list.
export function useFoldFocusHandoff(inlinePanes, enabled = true) {
  const handoff = useRef(null);
  handoff.current ??= createFoldFocusHandoff();
  const panes = enabled ? inlinePanes : [];
  const key = panes.join(" ");
  useLayoutEffect(() => {
    handoff.current.commit(panes);
  }, [key]);
  return handoff.current.ref;
}
