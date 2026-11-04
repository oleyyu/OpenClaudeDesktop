// W14-code r3 补做 fr3-07 pressFocus "body": where focus lands after the pane arrange trigger (Expand / Collapse) or an
// arrange-popup pick is pressed, written from 3.6556.2. Pure: the DOM is only read through the arguments.
//
// c4db265df Ct hands yt `pressFocus:"body"`; yt's onPress ends `r.pressFocus === "body" ? G(a.current, n, e.nativeEvent)
// : null` and bt's picks `l(o.pressFocus === "body" ? G(s.current, {focused:c.current, pointerType:d.current},
// e.nativeEvent) : null)`, where a / s is the pane body (contentRef) and G = ca5db7aaf z. mt then focuses what comes back
// (`i?.focus({preventScroll:!0})`), the pick's close focuses it or else the trigger (`(e ?? N.current)?.focus(...)`).
import { paneFocusTarget } from "./generated/code-current/pane-focus-target.mjs";

// shared-8 pR (c4db265df Ce, ca5db7aaf b): a click with no pointer behind it (Enter / Space / a keyboard context-menu key).
export const isKeyboardClick = (event) => event.detail === 0 && !("pointerType" in event && event.pointerType);

// shared-frame Uc: the node when it is an element, else null.
const asElement = (node) => (node?.nodeType === 1 ? node : null);

// ca5db7aaf R: `let t=u(e?.ownerDocument.activeElement);return e!==null&&t!==null&&e.contains(t)?t:null` — the element
// focused inside the pane body, or null.
export function bodyFocusedElement(body) {
  const focused = asElement(body?.ownerDocument?.activeElement);
  return body != null && focused !== null && body.contains(focused) ? focused : null;
}

// ca5db7aaf z: `e===null||t===null||b(n)?null:t.focused!==null&&e.contains(t.focused)?t.focused:t.pointerType==="mouse"
// ?O(e):null`. A keyboard click keeps focus where the press left it (null); a press that began with focus in the body
// hands it back to that element; a mouse press focuses the body (O = c9bc99274 b, the body's [data-tile-focus-target],
// else its first focusable text field); anything else (touch / pen with nothing focused in the body) returns null.
export function pressFocusTarget(body, press, nativeEvent, focusBody = paneFocusTarget) {
  if (body == null || press == null || isKeyboardClick(nativeEvent)) return null;
  if (press.focused != null && body.contains(press.focused)) return press.focused;
  return press.pointerType === "mouse" ? focusBody(body) : null;
}

// The pane body (official contentRef, c4db265df `n("div",{ref:pt,className:…,children:…})`, the pane's content under its
// header). Locally the arrange trigger sits in the pane's `header[data-pane-header]`; its body is everything else in the
// pane root (`[data-pane-root]`, else the header's parent). The view answers the three reads R / z / O make: ownerDocument,
// contains, and querySelector(All) with the header's own elements left out. No header: the pane root itself.
export function paneBodyOf(trigger) {
  const header = trigger?.closest?.("[data-pane-header]") ?? null;
  const root = trigger?.closest?.("[data-pane-root]") ?? header?.parentElement ?? null;
  if (root == null) return null;
  if (header === null || header === root || !root.contains(header)) return root;
  const outside = (node) => !header.contains(node);
  return {
    ownerDocument: root.ownerDocument,
    contains: (node) => node != null && root.contains(node) && outside(node),
    querySelector: (selector) => Array.from(root.querySelectorAll(selector)).find(outside) ?? null,
    querySelectorAll: (selector) => Array.from(root.querySelectorAll(selector)).filter(outside),
  };
}
