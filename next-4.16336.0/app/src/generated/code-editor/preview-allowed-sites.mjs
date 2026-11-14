// Original Claude Desktop 3.6556.2 Allowed sites dialog (c36734a81 P over M and S) and its focus fallback (b); the
// host container (src/source-preview-allowed-sites.jsx, c25b1be4a's place) passes the entries, the draft and the callbacks.
import {
  useRef as t,
  useId as a,
  useLayoutEffect as o,
  useEffect as s,
  memo as c,
  useState as l,
} from "react";
import { jsx as n, jsxs as i } from "react/jsx-runtime";
import {
  reactMemoCache as J9,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged4 as J4,
  memoChanged5 as J5,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore4 as K4,
  memoStore5 as K5,
  memoStoreValueFirst1 as I1,
  memoStoreValueFirst3 as I3,
  memoStoreValueFirst4 as I4,
  memoStoreDeps2 as Z2,
  CdsSurface as u,
  CdsButton as d,
  cdsDialogViewportMaxHeightClass as f,
  useCdsDensity as p,
  CdsDialog as m,
  CdsRoot as h,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import {
  clsx as e,
  useDirection as r,
} from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { isFizzyLakePartEnabled as g } from "../view-tabs/shared-4-DUB1Oi0O.js";
import { isFizzyLakePartOptedIn as titleTypePart } from "../view-tabs/shared-52-uHFNjl7C.js";
const _ = (() => {
  const e = titleTypePart;
  function t(t) {
    return e("type") ? t.replace("text-heading-semibold", "text-heading") : t;
  }
  return t;
})();
async function A(e, t) {
  t(!0);
  try {
    await e();
  } catch {
  } finally {
    t(!1);
  }
}
const v = {
  row: "h-control app-list-row shrink-0 rounded",
  remove: "sm",
  field: "h-control app-list-row rounded",
  add: "xs",
};
const ee = {
  row: "h-7 rounded-[6px]",
  remove: "base",
  field: "h-7 rounded-[6px]",
  add: "sm",
};
const y = {
  addUrl: "Add URL",
  addPlaceholder: "example.com",
  add: "Add",
  builtin: "Built-in",
  remove: (e) => `Remove ${e}`,
  empty: "No allowed sites yet.",
};
function b(e) {
  if (!e) return;
  let t = e.ownerDocument.activeElement;
  (t === null || t.contains(e) || t.matches(":disabled")) && e.focus();
}
function x(e) {
  try {
    return new URL(e).host.replace(/^%2A\./i, "*.");
  } catch {
    return e;
  }
}
function S(s) {
  let $ = J9(35),
    {
      entries: c,
      canAdd: l,
      draft: u,
      onDraftChange: f,
      draftError: m,
      addPending: h,
      pendingOrigin: _,
      onAdd: S,
      onRemove: A,
      addInputRef: j,
      removeFocusFallbackRef: M,
      labels: N,
    } = s,
    P = l === void 0 || l,
    F = u === void 0 ? "" : u,
    I = a(),
    L = a(),
    R = p(),
    z = r() === "rtl",
    B = g("panels") && R === "comfortable" ? v : ee,
    V = J0($, 0) ? K0($, 0, new Map()) : $[0],
    H = t(V),
    U = t(null),
    W = t(null),
    G,
    K;
  (J4($, 1, P, c, _, M)
    ? ((G = () => {
        let e = W.current;
        if (!e) return;
        if (c.some((t) => t.origin === e.origin)) {
          _ === e.origin
            ? (e.sawPending = !0)
            : e.sawPending &&
              _ == null &&
              ((W.current = null), b(H.current.get(e.origin)));
          return;
        }
        if (_ === e.origin) return;
        W.current = null;
        let t = new Set(c.filter(k).map(O)),
          n =
            e.successors.find((e) => t.has(e)) ??
            e.predecessors.find((e) => t.has(e));
        b(n ? H.current.get(n) : P ? U.current : M?.current);
      }),
      (K = [c, _, P, M]),
      K5($, 1, P, c, _, M, G, K))
    : ((G = $[5]), (K = $[6])),
    o(G, K));
  let q, J, Y;
  J5($, 7, c, N, A, _, z, B)
    ? ((q = { ...y, ...N }),
      (J = [...c.filter(D), ...c.filter(E)]),
      (Y = J.map((t) => {
        let r = t.label ?? x(t.origin),
          a = z && t.label === void 0;
        return i(
          "div",
          {
            className: `flex ${B.row} w-full min-w-0 items-center gap-[6px] bg-alpha-1 ps-[6px] ${t.builtin ? "pe-[8px]" : "pe-[2px]"}`,
            children: [
              n("span", {
                className: e(
                  "min-w-0 flex-1 truncate text-body text-secondary",
                  a &&
                    "[text-align:-webkit-match-parent] supports-[text-align:match-parent]:[text-align:match-parent]",
                ),
                dir: a ? "ltr" : void 0,
                children: r,
              }),
              t.caption !== void 0 &&
                n("span", {
                  className:
                    "max-w-[40%] shrink-0 truncate text-footnote text-muted-as-secondary",
                  children: t.caption,
                }),
              t.builtin
                ? n("span", {
                    className: "shrink-0 text-footnote text-muted-as-secondary",
                    children: q.builtin,
                  })
                : n(d, {
                    ref: (e) => {
                      e
                        ? H.current.set(t.origin, e)
                        : H.current.delete(t.origin);
                    },
                    size: B.remove,
                    variant: "ghost",
                    icon: "Trash",
                    iconOnly: !0,
                    busy: _ === t.origin,
                    disabled: _ != null && _ !== t.origin,
                    "aria-label": q.remove(r, t.caption),
                    onClick: () => {
                      let e = J.filter(T),
                        n = e.findIndex((e) => e.origin === t.origin);
                      ((W.current = {
                        origin: t.origin,
                        successors: e.slice(n + 1).map(w),
                        predecessors: e.slice(0, n).map(C).reverse(),
                        sawPending: !1,
                      }),
                        A(t.origin));
                    },
                    className: "shrink-0",
                  }),
            ],
          },
          t.origin,
        );
      })),
      K5($, 7, c, N, A, _, z, B, q, J, Y))
    : ((q = $[13]), (J = $[14]), (Y = $[15]));
  let X = Y,
    Z = J5($, 16, j, h, P, F, m, L, I, q, S, f, B)
      ? K5(
          $,
          16,
          j,
          h,
          P,
          F,
          m,
          L,
          I,
          q,
          S,
          f,
          B,
          P &&
            i("div", {
              className: "flex w-full shrink-0 flex-col gap-[4px]",
              children: [
                n("label", {
                  htmlFor: I,
                  className: "px-[6px] text-footnote text-muted-as-secondary",
                  children: q.addUrl,
                }),
                i("div", {
                  className: `flex ${B.field} w-full items-center gap-[4px] border ps-[6px] pe-[3px] has-[input:focus-visible]:shadow-focus`,
                  children: [
                    n("input", {
                      dir: "ltr",
                      id: I,
                      ref: (e) => {
                        ((U.current = e), j && (j.current = e));
                      },
                      type: "text",
                      value: F,
                      onChange: (e) => f?.(e.target.value),
                      onKeyDown: (e) => {
                        if (
                          !(e.nativeEvent.isComposing || e.keyCode === 229) &&
                          e.key === "Enter"
                        ) {
                          if ((e.preventDefault(), F.trim() === "" || h))
                            return;
                          S?.();
                        }
                      },
                      spellCheck: !1,
                      "aria-invalid": !!m,
                      "aria-describedby": m ? L : void 0,
                      placeholder: q.addPlaceholder,
                      className:
                        "h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-footnote text-primary outline-none hide-focus-ring placeholder:text-muted",
                    }),
                    n(d, {
                      size: B.add,
                      variant: "secondary",
                      icon: "Add",
                      iconOnly: !0,
                      busy: h,
                      disabled: F.trim() === "",
                      "aria-label": q.add,
                      onClick: S,
                      className: "shrink-0",
                    }),
                  ],
                }),
                m &&
                  n("div", {
                    id: L,
                    role: "alert",
                    className: "px-[6px] text-caption text-danger",
                    children: m,
                  }),
              ],
            }),
        )
      : $[27],
    Q =
      J2($, 28, q, X) || J1($, 30, J.length)
        ? I1(
            $,
            30,
            Z2(
              $,
              28,
              J.length === 0
                ? n("div", {
                    className: "px-[6px] text-body text-muted-as-secondary",
                    children: q.empty,
                  })
                : n("div", {
                    className:
                      "scroll-fade-y flex max-h-[40vh] min-h-0 flex-col gap-[4px] overflow-y-auto",
                    children: X,
                  }),
              q,
              X,
            ),
            J.length,
          )
        : $[31];
  return J2($, 32, Z, Q)
    ? K2(
        $,
        32,
        Z,
        Q,
        i("div", {
          className: "flex min-h-0 w-full flex-col gap-[20px]",
          children: [Z, Q],
        }),
      )
    : $[34];
}
function C(e) {
  return e.origin;
}
function w(e) {
  return e.origin;
}
function T(e) {
  return !e.builtin;
}
function E(e) {
  return e.builtin;
}
function D(e) {
  return !e.builtin;
}
function O(e) {
  return e.origin;
}
function k(e) {
  return !e.builtin;
}
const j = {
  title: "Allowed sites",
  description:
    "Claude can use its Browser tools on these sites without a permission prompt. Remove a site and Claude asks again the next time that site needs your approval.",
  close: "Close",
  clearAll: "Clear all",
  done: "Done",
};
function M(e) {
  let $ = J9(76),
    r,
    a,
    o,
    c,
    f,
    p,
    m,
    g,
    _;
  J1($, 0, e)
    ? (({
        onClose: m,
        onClearAll: f,
        clearAllDisabled: o,
        onClearAllPendingChange: p,
        cardLabels: r,
        renderTitle: _,
        renderDescription: g,
        className: a,
        ...c
      } = e),
      K5($, 0, e, r, a, o, c, f, p, m, g, _))
    : ((r = $[1]),
      (a = $[2]),
      (o = $[3]),
      (c = $[4]),
      (f = $[5]),
      (p = $[6]),
      (m = $[7]),
      (g = $[8]),
      (_ = $[9]));
  let [v, ee] = l(!1),
    y = t(null),
    x = t(null),
    C = J2($, 10, f, p)
      ? K2($, 10, f, p, async () => {
          await A(f, (e) => {
            (ee(e), p?.(e));
          });
        })
      : $[12],
    w = t(!1),
    T,
    E;
  (J1($, 13, v) || J1($, 14, c.entries)
    ? ((T = () => {
        let e = w.current;
        ((w.current = v), !(!e || v) && b((c.entries.some(N) ? x : y).current));
      }),
      (E = [v, c.entries]),
      ($[13] = v),
      K2($, 14, c.entries, T, E))
    : ((T = $[15]), (E = $[16])),
    s(T, E));
  let D, O, k, M, P, F, I, L, R, z, B, V;
  if (J4($, 17, r, a, g, _)) {
    k = { ...j, ...r };
    let e = {
        className: "m-0 text-heading-semibold text-primary",
        children: k.title,
      },
      t = {
        className: "m-0 text-body text-secondary",
        children: k.description,
      };
    ((O = u),
      (P = "popover"),
      (F = `flex min-h-0 w-[400px] max-w-full flex-col ${a ?? ""}`),
      (D = h),
      (V = "compact"),
      (M = "contents"),
      (B = "flex min-h-0 w-full flex-col gap-[20px] p-[16px] font-normal"),
      (z = "flex shrink-0 items-start gap-[4px]"),
      (I = "flex min-w-0 flex-1 flex-col gap-[4px]"),
      (L = _ ? _(e) : n("h2", { ...e })),
      (R = g ? g(t) : n("p", { ...t })),
      K5($, 17, r, a, g, _, D, O, k, M, P, F, I, L, R, z, B, V));
  } else
    ((D = $[21]),
      (O = $[22]),
      (k = $[23]),
      (M = $[24]),
      (P = $[25]),
      (F = $[26]),
      (I = $[27]),
      (L = $[28]),
      (R = $[29]),
      (z = $[30]),
      (B = $[31]),
      (V = $[32]));
  let H = J3($, 33, I, L, R)
      ? K3($, 33, I, L, R, i("div", { className: I, children: [L, R] }))
      : $[36],
    U = J3($, 37, k.close, v, m)
      ? I3(
          $,
          37,
          n(d, {
            variant: "ghost",
            icon: "X",
            iconOnly: !0,
            disabled: v,
            "aria-label": k.close,
            onClick: m,
            className: "shrink-0",
          }),
          k.close,
          v,
          m,
        )
      : $[40],
    W = J3($, 41, H, U, z)
      ? K3($, 41, H, U, z, i("div", { className: z, children: [H, U] }))
      : $[44],
    G = J1($, 45, c)
      ? K1($, 45, c, n(S, { ...c, removeFocusFallbackRef: y }))
      : $[46],
    K = J1($, 47, C) ? K1($, 47, C, () => void C()) : $[48],
    q = J4($, 49, k.clearAll, o, v, K)
      ? I4(
          $,
          49,
          n(d, {
            ref: x,
            variant: "danger",
            busy: v,
            disabled: o,
            onClick: K,
            children: k.clearAll,
          }),
          k.clearAll,
          o,
          v,
          K,
        )
      : $[53],
    J = J3($, 54, k.done, v, m)
      ? I3(
          $,
          54,
          n(d, {
            ref: y,
            variant: "primary",
            disabled: v,
            onClick: m,
            children: k.done,
          }),
          k.done,
          v,
          m,
        )
      : $[57],
    Y = J2($, 58, q, J)
      ? K2(
          $,
          58,
          q,
          J,
          i("div", {
            className: "flex shrink-0 items-center justify-between",
            children: [q, J],
          }),
        )
      : $[60],
    X = J4($, 61, W, G, Y, B)
      ? K4($, 61, W, G, Y, B, i("div", { className: B, children: [W, G, Y] }))
      : $[65],
    Z = J4($, 66, D, M, X, V)
      ? K4($, 66, D, M, X, V, n(D, { density: V, className: M, children: X }))
      : $[70];
  return J4($, 71, O, P, F, Z)
    ? K4($, 71, O, P, F, Z, n(O, { elevation: P, className: F, children: Z }))
    : $[75];
}
function N(e) {
  return !e.builtin;
}
const P = c(function (e) {
  let $ = J9(20),
    r,
    i,
    a;
  J1($, 0, e)
    ? (({ isOpen: i, onClose: a, ...r } = e), K3($, 0, e, r, i, a))
    : ((r = $[1]), (i = $[2]), (a = $[3]));
  let [o, s] = l(!1),
    c = r.pendingOrigin !== null && r.pendingOrigin !== void 0,
    u = r.addPending === !0,
    d = J4($, 4, u, o, a, c)
      ? K4($, 4, u, o, a, c, (e) => {
          !e && !o && !c && !u && a();
        })
      : $[8],
    p = t(null),
    h = r.addInputRef ?? p,
    g = r.canAdd === !1 ? void 0 : h,
    _ = J3($, 9, h, r, a)
      ? K3(
          $,
          9,
          h,
          r,
          a,
          n(M, {
            ...r,
            addInputRef: h,
            onClose: a,
            onClearAllPendingChange: s,
            renderTitle: F,
            renderDescription: I,
          }),
        )
      : $[12],
    v = J2($, 13, g, _)
      ? K2(
          $,
          13,
          g,
          _,
          n(m.Popup, {
            unstyled: !0,
            initialFocus: g,
            className: `fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col max-w-[calc(100vw-2rem)] ${f} transition-[opacity,scale,filter] duration-base ease-out motion-reduce:transition-none data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98] outline-none draggable-none`,
            children: _,
          }),
        )
      : $[15];
  return J3($, 16, d, i, v)
    ? K3($, 16, d, i, v, n(m.Root, { open: i, onOpenChange: d, children: v }))
    : $[19];
});
function F(e) {
  return n(m.Title, { ...e, className: _(e.className) });
}
function I(e) {
  return n(m.Description, { ...e });
}
export {
  P as PreviewAllowedSitesDialog,
  b as focusAllowedSitesFallback,
  x as allowedSiteHost,
};
