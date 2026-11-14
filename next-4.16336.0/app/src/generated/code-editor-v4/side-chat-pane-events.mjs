// Original 4.16336.0 pane header mouse-down guard and the text-editable check it reads (c4db265df-CHyZjtsm.js).
import { isMacUserAgent as $cds_core_shared_62_isMacUserAgent } from "../cds-core/shared-62.mjs";
import { asElementNode as $cds_core_shared_frame_asElementNode } from "../cds-core/shared-frame.mjs";
// shared-183-B2N6Zy4J.js
const $c_shared_183_B2N6Zy4J = (() => {
  var UU = 32;
  function GU(e) {
    let t = [];
    try {
      let n = e ?? null;
      for (let e = 0; e < UU; e += 1) {
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
  function qU(e, t) {
    return e.isTruncated || e.hops.some(t);
  }
  var JU =
    '[contenteditable=""], [contenteditable="true" i], [contenteditable="plaintext-only" i], [contenteditable="false" i]';
  function YU(e) {
    return XU(e) || qU(GU(e), XU);
  }
  function XU(e) {
    if (e?.nodeType !== 1) return !1;
    let t = e,
      n = t.tagName;
    if (n === "INPUT" || n === "TEXTAREA" || n === "SELECT") return !0;
    if ("isContentEditable" in t && typeof t.isContentEditable == "boolean")
      return t.isContentEditable;
    let r = t.closest(JU);
    return (
      r !== null && r.getAttribute("contenteditable")?.toLowerCase() !== "false"
    );
  }
  return { YU };
})();
const C = $cds_core_shared_frame_asElementNode;
const ae = $cds_core_shared_62_isMacUserAgent;
const { YU: oe } = $c_shared_183_B2N6Zy4J;
function Sn(e) {
  let t = e.currentTarget,
    n = C(e.target)?.closest("button"),
    r = t.ownerDocument.activeElement;
  e.defaultPrevented ||
    !n ||
    !t.contains(n) ||
    (t.contains(r) && oe(r)) ||
    !(e.button === 2 || (e.button === 0 && e.ctrlKey && ae())) ||
    e.preventDefault();
}

export { Sn as paneHeaderMouseDown };
