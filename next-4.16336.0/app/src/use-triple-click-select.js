import { useCallback } from "react";

// code-block-current.js:1244-1266 (Rr), attached at :1495 to the fence body:
// a third press does not start the browser's paragraph selection, a double or
// triple click does not reach row handlers, and the triple click selects the
// whole block (here its code element, so nothing outside the code is taken).
// React 19 calls the returned cleanup when the node detaches.
export function useTripleClickSelect(selector = "code") {
  return useCallback((node) => {
    if (!node) return undefined;
    const down = (event) => { if (event.detail >= 3) event.preventDefault(); };
    const click = (event) => {
      if (event.detail >= 2) event.stopPropagation();
      if (event.detail < 3) return;
      const target = node.querySelector(selector) ?? node;
      const selection = node.ownerDocument.defaultView?.getSelection();
      if (!selection) return;
      const range = node.ownerDocument.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
    };
    node.addEventListener("mousedown", down);
    node.addEventListener("click", click);
    return () => {
      node.removeEventListener("mousedown", down);
      node.removeEventListener("click", click);
    };
  }, [selector]);
}
