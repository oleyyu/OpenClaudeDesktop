// Original 4.16336.0 compiled transcript selection hook (c80ec48f8-D986pQRB.js).
import { ownerWindow as $cds_core_shared_25_ownerWindow } from "../cds-core/shared-25.mjs";
import {
  useEffect as $react_useEffect,
  useRef as $react_useRef,
  useState as $react_useState,
} from "react";
import { c as $react_compiler_runtime_c } from "react/compiler-runtime";
// shared-frame-CJdE5Ria.js
const $c_shared_frame_CJdE5Ria = (() => {
  const Je = $react_compiler_runtime_c;
  var J9 = Je,
    J8 = Symbol.for("react.memo_cache_sentinel");
  function J0(e, t) {
    return e[t] === J8;
  }
  function J1(e, t, n) {
    return e[t] !== n;
  }
  function J3(e, t, n, r, i) {
    return e[t] !== n || e[t + 1] !== r || e[t + 2] !== i;
  }
  function K0(e, t, n) {
    return ((e[t] = n), n);
  }
  function K1(e, t, n, r) {
    return ((e[t] = n), (e[t + 1] = r), r);
  }
  function K3(e, t, n, r, i, a) {
    return ((e[t] = n), (e[t + 1] = r), (e[t + 2] = i), (e[t + 3] = a), a);
  }
  function K4(e, t, n, r, i, a, o) {
    return (
      (e[t] = n),
      (e[t + 1] = r),
      (e[t + 2] = i),
      (e[t + 3] = a),
      (e[t + 4] = o),
      o
    );
  }
  return { J0, J1, J3, J9, K0, K1, K3, K4 };
})();
const o = $react_useState;
const u = $react_useEffect;
const m = $react_useRef;
const N = $cds_core_shared_25_ownerWindow;
const { K1, K4, J0, J3, K0, J9, J1, K3 } = $c_shared_frame_CJdE5Ria;
var ct = 2,
  lt = 250;
function ut(e, t) {
  let $ = J9(16),
    { containerOf: n, enabled: r } = J1($, 0, t)
      ? K1($, 0, t, t === void 0 ? {} : t)
      : $[1],
    i = r === void 0 || r,
    [a, s] = o(null),
    [c, l] = o(""),
    d = m(!1),
    f = m(null),
    p = m(!1),
    h = m(!1),
    g = m(!1),
    _ = J0($, 2)
      ? K0($, 2, () => {
          ((f.current &&= (clearTimeout(f.current), null)), (g.current = !1));
        })
      : $[2],
    v = J0($, 3)
      ? K0($, 3, (e, t) => {
          ((d.current = !0),
            s((t) => (t && dt(t, e) ? t : e.cloneRange())),
            l(t));
        })
      : $[3],
    y = J0($, 4)
      ? K0($, 4, () => {
          (_(), d.current && ((d.current = !1), s(null), l("")));
        })
      : $[4],
    b = J1($, 5, e)
      ? K1($, 5, e, () => {
          (y(), N(e.current)?.getSelection()?.removeAllRanges());
        })
      : $[6],
    x,
    S;
  return (
    J3($, 7, n, e, i)
      ? ((x = () => {
          let t = e.current;
          if (!t || !i) return;
          let r = t.ownerDocument,
            a = r.defaultView;
          if (!a) return;
          let o = () => {
              let e = a.getSelection();
              if (!e || e.rangeCount === 0 || e.isCollapsed) {
                y();
                return;
              }
              let r = e.toString().trim();
              if (r.length < ct) {
                y();
                return;
              }
              let i = e.getRangeAt(0),
                o =
                  i.startContainer.nodeType === Node.TEXT_NODE
                    ? i.startContainer.parentNode
                    : i.startContainer,
                s =
                  i.endContainer.nodeType === Node.TEXT_NODE
                    ? i.endContainer.parentNode
                    : i.endContainer,
                c = n === void 0 ? t : ((o && n(o)) ?? (s && n(s)) ?? null);
              if (!c) {
                y();
                return;
              }
              let l = i.intersectsNode(c),
                u = o && c.contains(o),
                d = s && c.contains(s);
              if (!l || (!u && !d)) {
                y();
                return;
              }
              v(i, r);
            },
            s = () => {
              (_(),
                (f.current = setTimeout(() => {
                  if (((f.current = null), p.current)) {
                    g.current = !0;
                    return;
                  }
                  o();
                }, lt)));
            },
            c = () => {
              if (p.current) {
                ((h.current = !0), y());
                return;
              }
              s();
            },
            l = (e) => {
              e.defaultPrevented ||
                p.current ||
                ((p.current = !0), (h.current = !1));
            },
            u = (e) => {
              if (!p.current || e.buttons !== 0) return;
              p.current = !1;
              let t = g.current;
              if (((g.current = !1), !h.current)) {
                a.getSelection()?.isCollapsed === !1 ? t && s() : y();
                return;
              }
              if (e.detail === 2) {
                s();
                return;
              }
              o();
            };
          return (
            r.addEventListener("selectionchange", c),
            r.addEventListener("mousedown", l),
            r.addEventListener("mouseup", u),
            () => {
              (r.removeEventListener("selectionchange", c),
                r.removeEventListener("mousedown", l),
                r.removeEventListener("mouseup", u),
                y());
            }
          );
        }),
        (S = [e, n, i, v, y, _]),
        K4($, 7, n, e, i, x, S))
      : ((x = $[10]), (S = $[11])),
    u(x, S),
    J3($, 12, b, a, c)
      ? K3($, 12, b, a, c, {
          range: a,
          text: c,
          clearSelection: b,
          hideTooltip: y,
        })
      : $[15]
  );
}
function dt(e, t) {
  return (
    e.startContainer === t.startContainer &&
    e.startOffset === t.startOffset &&
    e.endContainer === t.endContainer &&
    e.endOffset === t.endOffset
  );
}

export { ut as useTranscriptSelection };
