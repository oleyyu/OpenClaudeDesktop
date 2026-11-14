// Original Claude Desktop 3.6556.2 Preview navigation row (c224804cc P) and pane header line (cd5e3435c s); host
// supplies the Button and Tooltip primitives. The address field's tooltip context wraps the row's children (re).
import {
  memo as o,
  use as reactUse,
  createContext as reactCreateContext,
} from "react";
import { jsx as t, jsxs as n, Fragment as r } from "react/jsx-runtime";
import {
  reactMemoCache as J9,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged4 as J4,
  memoChanged5 as J5,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore5 as K5,
  memoStoreValueFirst3 as I3,
  memoStoreValueFirst4 as I4,
  memoStoreDeps1 as Z1,
  memoStoreDeps3 as Z3,
  CdsTooltipProvider as ee,
  cdsClassNames,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { isFizzyLakePartEnabled } from "../view-tabs/shared-4-DUB1Oi0O.js";
import { PreviewAddressTooltipProvider as re } from "./preview-address-field.mjs";
const E = (() => {
  const [i, a] = (() => {
    const Mh = "py-[var(--cds-toolbar-pad-block,0.5rem)]";
    const Ph =
      "min-h-[calc(var(--cds-h-control)+2*var(--cds-toolbar-pad-block,0.5rem))]";
    const Lh =
      "pt-[var(--cds-toolbar-pad-block,0.5rem)] pb-[calc(var(--cds-toolbar-pad-block,0.5rem)+var(--cds-toolbar-strip,0px))]";
    const Rh = "px-sm";
    const e = Lh,
      t = Mh,
      n = Rh,
      r = Ph;
    const i = `h-auto ${r} ${t}`;
    const u = `${i} ${n} relative border-b-0 gap-1 [&>[role=group]]:gap-1 [&>.ms-auto]:gap-1`;
    const d = `h-auto ${r} ${e} ${n} relative border-b-0 gap-1 [&>[role=group]]:gap-1 [&>.ms-auto]:gap-1`;
    return [d, u];
  })();
  const r = (() => {
    const m = reactCreateContext;
    const bn = m(!1);
    return bn;
  })();
  const e = reactUse,
    t = cdsClassNames,
    n = isFizzyLakePartEnabled;
  const o = "flex min-w-0 shrink-0 items-center h-9 gap-2 border-b px-1";
  function s(s, c = o, l = !1) {
    return n("panels") && s && e(r)
      ? { className: t(c, l ? i : a), "data-pane-header-line": "" }
      : { className: c };
  }
  return s;
})();
export function createPreviewNavigation({ Button: c, Tooltip: l }) {
  const M = {
    navigation: "Navigation",
    pageTools: "Page tools",
    back: "Back",
    forward: "Forward",
    reload: "Reload",
    annotate: "Annotate",
    selectElement: "Select element",
    exitSelection: "Exit selection mode",
  };
  const N = "hidden @[320px]:inline-flex";
  const P = o(function (e) {
    let $ = J9(58),
      {
        canGoBack: r,
        canGoForward: i,
        canReload: a,
        onBack: o,
        onForward: s,
        onReload: l,
        shortcuts: u,
        children: d,
        annotate: f,
        selectElement: p,
        extraTool: m,
        labels: h,
        inline: g,
        followsPaneHeader: _,
      } = e,
      v = g !== void 0 && g,
      te = _ !== void 0 && _,
      y = J1($, 0, h) ? K1($, 0, h, { ...M, ...h }) : $[1],
      ne = E(te && !v),
      b,
      x;
    J1($, 2, ne)
      ? (({ className: x, ...b } = ne), K2($, 2, ne, b, x))
      : ((b = $[3]), (x = $[4]));
    let S = p?.pressed ? (p.pressedLabel ?? y.exitSelection) : y.selectElement,
      C = `@container draggable-none ${v ? "flex min-w-0 flex-1 items-center gap-2" : x}`,
      w = !v,
      T = u?.back,
      D = !v,
      O = !r,
      k = J4($, 5, y.back, o, D, O)
        ? I4(
            $,
            5,
            t(c, {
              variant: "ghost",
              iconOnly: !0,
              icon: "ArrowLeft",
              "aria-label": y.back,
              tooltip: D,
              disabled: O,
              onClick: o,
            }),
            y.back,
            o,
            D,
            O,
          )
        : $[9],
      A = J4($, 10, y.back, k, w, T)
        ? I4(
            $,
            10,
            t(F, {
              on: w,
              content: y.back,
              shortcut: T,
              hoverable: !1,
              side: "top",
              children: k,
            }),
            y.back,
            k,
            w,
            T,
          )
        : $[14],
      j = !v,
      P = u?.forward,
      I = !v,
      L = !i,
      R = J4($, 15, y.forward, s, I, L)
        ? I4(
            $,
            15,
            t(c, {
              variant: "ghost",
              iconOnly: !0,
              icon: "ArrowRight",
              "aria-label": y.forward,
              tooltip: I,
              disabled: L,
              onClick: s,
              className: N,
            }),
            y.forward,
            s,
            I,
            L,
          )
        : $[19],
      z = J4($, 20, y.forward, j, P, R)
        ? I4(
            $,
            20,
            t(F, {
              on: j,
              content: y.forward,
              shortcut: P,
              hoverable: !1,
              side: "top",
              children: R,
            }),
            y.forward,
            j,
            P,
            R,
          )
        : $[24],
      ie = !v,
      B = u?.reload,
      V = !v,
      H = !a,
      ae = J4($, 25, y.reload, l, V, H)
        ? I4(
            $,
            25,
            t(c, {
              variant: "ghost",
              iconOnly: !0,
              icon: "ArrowClockwise",
              "aria-label": y.reload,
              tooltip: V,
              disabled: H,
              onClick: l,
            }),
            y.reload,
            l,
            V,
            H,
          )
        : $[29],
      oe = J4($, 30, y.reload, ie, B, ae)
        ? I4(
            $,
            30,
            t(F, {
              on: ie,
              content: y.reload,
              shortcut: B,
              hoverable: !1,
              side: "top",
              children: ae,
            }),
            y.reload,
            ie,
            B,
            ae,
          )
        : $[34],
      U = J4($, 35, y.navigation, A, z, oe)
        ? I4(
            $,
            35,
            n("div", {
              role: "group",
              "aria-label": y.navigation,
              className: "flex shrink-0 items-center gap-0.5",
              children: [A, z, oe],
            }),
            y.navigation,
            A,
            z,
            oe,
          )
        : $[39],
      W = !v,
      G = J2($, 40, d, W)
        ? K2($, 40, d, W, t(re, { value: W, children: d }))
        : $[42],
      K =
        J3($, 43, f, m, v) ||
        J1($, 46, y.annotate) ||
        J1($, 47, y.pageTools) ||
        J3($, 48, y.selectElementDetail, p, S)
          ? I3(
              $,
              48,
              Z1(
                $,
                47,
                Z1(
                  $,
                  46,
                  Z3(
                    $,
                    43,
                    (f || p || m) &&
                      n("div", {
                        role: "group",
                        "aria-label": y.pageTools,
                        className: "flex shrink-0 items-center gap-0.5",
                        children: [
                          f &&
                            t(c, {
                              variant: "ghost",
                              iconOnly: !0,
                              icon: "Edit",
                              "aria-label": y.annotate,
                              tooltip: !v,
                              tooltipSide: "top",
                              shortcut: f.shortcut,
                              pressed: f.pressed,
                              disabled: f.disabled,
                              onClick: f.onToggle,
                              className: f.pressed ? void 0 : N,
                            }),
                          p &&
                            t(F, {
                              on: !v,
                              content: S,
                              detail: p.pressed
                                ? void 0
                                : y.selectElementDetail,
                              shortcut: p.shortcut,
                              hoverable: !1,
                              side: "top",
                              children: t(c, {
                                variant: "ghost",
                                iconOnly: !0,
                                icon: "Cursor",
                                "aria-label": S,
                                tooltip: !v,
                                shortcut: p.shortcut,
                                pressed: p.pressed,
                                disabled: p.disabled,
                                onClick: p.onToggle,
                                className: p.pressed ? void 0 : N,
                                "data-select-element-toggle": "",
                              }),
                            }),
                          m,
                        ],
                      }),
                    f,
                    m,
                    v,
                  ),
                  y.annotate,
                ),
                y.pageTools,
              ),
              y.selectElementDetail,
              p,
              S,
            )
          : $[51];
    return J5($, 52, b, U, G, K, C)
      ? K5(
          $,
          52,
          b,
          U,
          G,
          K,
          C,
          t(ee, {
            children: n("div", { ...b, className: C, children: [U, G, K] }),
          }),
        )
      : $[57];
  });
  function F(e) {
    let $ = J9(8),
      n,
      i,
      a;
    return (
      J1($, 0, e)
        ? (({ on: i, children: n, ...a } = e), K3($, 0, e, n, i, a))
        : ((n = $[1]), (i = $[2]), (a = $[3])),
      J3($, 4, n, i, a)
        ? K3(
            $,
            4,
            n,
            i,
            a,
            i ? t(l, { ...a, children: n }) : t(r, { children: n }),
          )
        : $[7]
    );
  }
  return P;
}
