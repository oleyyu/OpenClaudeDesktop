// Original compiled selection hook (React Compiler helpers from view-tabs).
import {
  reactMemoCache as J9,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged3 as J3,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore3 as K3,
  memoStore4 as K4,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { useState as h, useRef as n, useEffect as u } from "react";
var df = 9;
function ff(e) {
  return e.nodeType === df;
}
function pf(e) {
  return e ? ((ff(e) ? e : e.ownerDocument)?.defaultView ?? null) : null;
}
const ee = pf;
var fn = 2;
var pn = 250;
function mn(e, t) {
  let $ = J9(16),
    { containerOf: r, enabled: i } = J1($, 0, t)
      ? K1($, 0, t, t === void 0 ? {} : t)
      : $[1],
    a = i === void 0 || i,
    [o, s] = h(null),
    [c, l] = h(""),
    d = n(!1),
    f = n(null),
    p = n(!1),
    m = n(!1),
    g = n(!1),
    _ = J0($, 2)
      ? K0($, 2, () => {
          ((f.current &&= (clearTimeout(f.current), null)), (g.current = !1));
        })
      : $[2],
    v = J0($, 3)
      ? K0($, 3, (e, t) => {
          ((d.current = !0),
            s((t) => (t && hn(t, e) ? t : e.cloneRange())),
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
          (y(), ee(e.current)?.getSelection()?.removeAllRanges());
        })
      : $[6],
    x,
    S;
  return (
    J3($, 7, r, e, a)
      ? ((x = () => {
          let t = e.current;
          if (!t || !a) return;
          let n = t.ownerDocument,
            i = n.defaultView;
          if (!i) return;
          let o = () => {
              let e = i.getSelection();
              if (!e || e.rangeCount === 0 || e.isCollapsed) {
                y();
                return;
              }
              let n = e.toString().trim();
              if (n.length < fn) {
                y();
                return;
              }
              let a = e.getRangeAt(0),
                o =
                  a.startContainer.nodeType === Node.TEXT_NODE
                    ? a.startContainer.parentNode
                    : a.startContainer,
                s =
                  a.endContainer.nodeType === Node.TEXT_NODE
                    ? a.endContainer.parentNode
                    : a.endContainer,
                c = r === void 0 ? t : ((o && r(o)) ?? (s && r(s)) ?? null);
              if (!c) {
                y();
                return;
              }
              let l = a.intersectsNode(c),
                u = o && c.contains(o),
                d = s && c.contains(s);
              if (!l || (!u && !d)) {
                y();
                return;
              }
              v(a, n);
            },
            s = () => {
              (_(),
                (f.current = setTimeout(() => {
                  if (((f.current = null), p.current)) {
                    g.current = !0;
                    return;
                  }
                  o();
                }, pn)));
            },
            c = () => {
              if (p.current) {
                ((m.current = !0), y());
                return;
              }
              s();
            },
            l = (e) => {
              e.defaultPrevented ||
                p.current ||
                ((p.current = !0), (m.current = !1));
            },
            u = (e) => {
              if (!p.current || e.buttons !== 0) return;
              p.current = !1;
              let t = g.current;
              if (((g.current = !1), !m.current)) {
                i.getSelection()?.isCollapsed === !1 ? t && s() : y();
                return;
              }
              if (e.detail === 2) {
                s();
                return;
              }
              o();
            };
          return (
            n.addEventListener("selectionchange", c),
            n.addEventListener("mousedown", l),
            n.addEventListener("mouseup", u),
            () => {
              (n.removeEventListener("selectionchange", c),
                n.removeEventListener("mousedown", l),
                n.removeEventListener("mouseup", u),
                y());
            }
          );
        }),
        (S = [e, r, a, v, y, _]),
        K4($, 7, r, e, a, x, S))
      : ((x = $[10]), (S = $[11])),
    u(x, S),
    J3($, 12, b, o, c)
      ? K3($, 12, b, o, c, {
          range: o,
          text: c,
          clearSelection: b,
          hideTooltip: y,
        })
      : $[15]
  );
}
function hn(e, t) {
  return (
    e.startContainer === t.startContainer &&
    e.startOffset === t.startOffset &&
    e.endContainer === t.endContainer &&
    e.endOffset === t.endOffset
  );
}
export { mn as useTranscriptSelection };
