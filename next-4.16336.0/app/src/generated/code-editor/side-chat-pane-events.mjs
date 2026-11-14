// Original pane header mouse-down guard (N_ en) and the text-editable check it reads.
import { asElementNode as _ } from "../view-tabs/shared-frame-6jtSkIit.js";
import { isMacUserAgent as ie } from "../view-tabs/shared-78-D5Fw2h0a.js";
var PK = 32;
function IK(e) {
  let t = [];
  try {
    let n = e ?? null;
    for (let e = 0; e < PK; e += 1) {
      if (n === null || n.nodeType !== 1) return { hops: t, isTruncated: !1 };
      let e = n.shadowRoot?.activeElement ?? null;
      if (e === null || e === n || e.nodeType !== 1)
        return { hops: t, isTruncated: !1 };
      (t.push(e), (n = e));
    }
    return { hops: t, isTruncated: !0 };
  } catch {
    return { hops: t, isTruncated: !0 };
  }
}
function RK(e, t) {
  return e.isTruncated || e.hops.some(t);
}
var zK =
  '[contenteditable=""], [contenteditable="true" i], [contenteditable="plaintext-only" i], [contenteditable="false" i]';
function BK(e) {
  return VK(e) || RK(IK(e), VK);
}
function VK(e) {
  if (e?.nodeType !== 1) return !1;
  let t = e,
    n = t.tagName;
  if (n === "INPUT" || n === "TEXTAREA" || n === "SELECT") return !0;
  if ("isContentEditable" in t && typeof t.isContentEditable == "boolean")
    return t.isContentEditable;
  let r = t.closest(zK);
  return (
    r !== null && r.getAttribute("contenteditable")?.toLowerCase() !== "false"
  );
}
const U = BK;
function en(e) {
  let t = e.currentTarget,
    n = _(e.target)?.closest("button"),
    r = t.ownerDocument.activeElement;
  e.defaultPrevented ||
    !n ||
    !t.contains(n) ||
    (t.contains(r) && U(r)) ||
    !(e.button === 2 || (e.button === 0 && e.ctrlKey && ie())) ||
    e.preventDefault();
}
export { en as paneHeaderMouseDown };
