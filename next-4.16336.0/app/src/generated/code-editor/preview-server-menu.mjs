// Original Claude Desktop 3.6556.2 split dev-server menu (cf580efe9 mi) and section/action builder (li); host supplies
// the Menu/Tooltip/Button/Spinner primitives, stable callbacks (official useEventCallback/useOptional…), the portal
// anchor, intl and the item renderer (preview-menu-items.mjs).
import { memo as f, useState as m } from "react";
import { jsx as r, jsxs as o, Fragment as s } from "react/jsx-runtime";
import { Fragment as c } from "react";
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
  memoStore4 as K4,
  memoStore5 as K5,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { useDirection as i } from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { isFizzyLakePartEnabled as ks } from "../view-tabs/shared-4-DUB1Oi0O.js";
import { menuCollisionPadding as Fe } from "../code-composer/menu-collision-padding.mjs";
function HF() {
  return ks("icons") ? "StopFilled" : void 0;
}
const X = HF;
const Kn = (() => {
  function T(e) {
    return e.preventDefault();
  }
  return T;
})();
export function createPreviewServerMenu({
  Menu: b,
  Tooltip: S,
  Button: g,
  Spinner: w,
  useStable: R,
  useOptionalStable: z,
  usePortal: v,
  useIntl: Oe,
  renderItems: ar,
}) {
  function ai(e) {
    e.preventDefault();
  }
  const oi = {
    trigger: "Dev servers",
    header: "Servers",
    run: "Run",
    stop: "Stop",
    stopAll: "Stop all servers",
    runningState: "Running",
    stoppedState: "Stopped",
    starting: "Starting",
    addServer: "Add server",
    empty: "No dev server configured",
  };
  function si({ servers: e, extraSections: t, onAddServer: n, loading: r }) {
    let i = t !== void 0 && t.some((e) => e.items.length > 0);
    return r === !0 && e.length === 0 ? !i : (e.length, !1);
  }
  function ci(e, t) {
    return e
      .filter((e) => e.items.length > 0)
      .map((e, n) =>
        o(
          c,
          {
            children: [
              n > 0 && !e.noSeparator && r(b.Separator, {}),
              o(b.Group, {
                children: [
                  e.header && r(b.GroupLabel, { children: e.header }),
                  e.items.map(t),
                ],
              }),
            ],
          },
          e.key ?? n,
        ),
      );
  }
  function li(e) {
    let $ = J9(64),
      {
        servers: t,
        extraSections: n,
        onRun: i,
        onStop: a,
        onStopAll: c,
        onAddServer: l,
        loading: u,
        labels: d,
        onAction: f,
      } = e,
      p = R(i),
      m = R(a),
      h = z(c),
      _ = z(l),
      v = z(f),
      y = J2($, 0, c, t)
        ? K2($, 0, c, t, c !== void 0 && t.length > 1 && t.some(pi))
        : $[2],
      b = l !== void 0,
      x = J1($, 3, n) ? K1($, 3, n, n !== void 0 && n.some(fi)) : $[4],
      {
        trigger: S,
        header: C,
        run: T,
        stop: E,
        stopAll: D,
        runningState: O,
        stoppedState: k,
        starting: A,
        addServer: j,
        empty: M,
      } = J1($, 5, d) ? K1($, 5, d, { ...oi, ...d }) : $[6],
      N = u === !0 && t.length === 0,
      P;
    bb0: {
      if (N) {
        P = J2($, 7, x, n) ? K2($, 7, x, n, x ? n.filter(di) : []) : $[9];
        break bb0;
      }
      let e;
      if (J5($, 10, v, p, T, O, t, A, m, E, k)) {
        let n = J5($, 20, v, p, T, O, A, m, E, k)
          ? K5($, 20, v, p, T, O, A, m, E, k, (e) => {
              let t = X(),
                n = () => {
                  (e.running ? m(e.id) : p(e.id), v?.());
                };
              return {
                value: e.id,
                label: o(s, {
                  children: [
                    r("span", { "aria-hidden": !0, children: e.label }),
                    r("span", {
                      className: "sr-only",
                      children: e.starting
                        ? e.label
                        : `${e.label}, ${e.running ? O : k}`,
                    }),
                  ],
                }),
                onSelect: n,
                leading: e.starting ? r(w, { size: "sm", label: A }) : void 0,
                trailing: r(g, {
                  size: "sm",
                  variant: e.running ? "danger" : "secondary",
                  icon: e.running ? (t ?? "Stop") : "Play",
                  iconOnly: !0,
                  "aria-label": e.running ? E : T,
                  tooltip: !1,
                  tabIndex: -1,
                  "aria-hidden": !0,
                  onMouseDown: Kn,
                  onClick: (e) => {
                    (e.stopPropagation(), n());
                  },
                  className: "min-w-8 shrink-0",
                }),
              };
            })
          : $[28];
        ((e = t.map(n)), K5($, 10, v, p, T, O, t, A, m, E, k, e));
      } else e = $[19];
      let i = e,
        a;
      if (J5($, 29, _, j, M, b, x, y, C, n, i, h, D)) {
        if (((a = []), i.length > 0)) {
          let e = J2($, 41, C, i)
            ? K2($, 41, C, i, { key: "servers", header: C, items: i })
            : $[43];
          a.push(e);
        } else if (!b && !x) {
          let e = J1($, 44, M)
              ? K1($, 44, M, [{ label: M, disabled: !0 }])
              : $[45],
            t = J2($, 46, C, e)
              ? K2($, 46, C, e, { key: "servers", header: C, items: e })
              : $[48];
          a.push(t);
        }
        let e = J2($, 49, x, n)
          ? K2($, 49, x, n, x ? n.filter(ui) : [])
          : $[51];
        if ((a.push(...e), y)) {
          let t = e.length === 0,
            n = J2($, 52, h, D)
              ? K2($, 52, h, D, [
                  {
                    value: "stop-all",
                    label: D,
                    variant: "danger",
                    onSelect: h,
                  },
                ])
              : $[54],
            r = J2($, 55, t, n)
              ? K2($, 55, t, n, { key: "stop-all", noSeparator: t, items: n })
              : $[57];
          a.push(r);
        }
        if (b) {
          let e = J2($, 58, _, j)
            ? K2($, 58, _, j, {
                key: "add-server",
                items: [{ value: "add-server", label: j, onSelect: _ }],
              })
            : $[60];
          a.push(e);
        }
        K5($, 29, _, j, M, b, x, y, C, n, i, h, D, a);
      } else a = $[40];
      P = a;
    }
    let F = P;
    return J2($, 61, F, S)
      ? K2($, 61, F, S, { trigger: S, sections: F })
      : $[63];
  }
  function ui(e) {
    return e.items.length > 0;
  }
  function di(e) {
    return e.items.length > 0;
  }
  function fi(e) {
    return e.items.length > 0;
  }
  function pi(e) {
    return e.running;
  }
  const mi = f(function (e) {
    let $ = J9(39),
      {
        servers: t,
        extraSections: n,
        onRun: a,
        onStop: s,
        onStopAll: c,
        onAddServer: l,
        loading: u,
        disabled: d,
        align: f,
        open: p,
        onOpenChange: h,
        labels: _,
      } = e,
      y = f === void 0 ? "end" : f,
      [x, C] = m(!1),
      w = p ?? x,
      T = J1($, 0, h)
        ? K1($, 0, h, (e) => {
            (C(e), h?.(e));
          })
        : $[1],
      E = R(T),
      D = J1($, 2, E) ? K1($, 2, E, () => E(!1)) : $[3],
      O = v(),
      k = Oe(),
      A = i() === "rtl",
      j = J3($, 4, k, O, A) ? K3($, 4, k, O, A, ar(O, k, void 0, A)) : $[7],
      { trigger: M, sections: N } = li(
        J5($, 8, D, n, _, u, l, a, s, c, t)
          ? K5($, 8, D, n, _, u, l, a, s, c, t, {
              servers: t,
              extraSections: n,
              onRun: a,
              onStop: s,
              onStopAll: c,
              onAddServer: l,
              loading: u,
              labels: _,
              onAction: D,
            })
          : $[17],
      ),
      P = N.length === 0,
      F = d === !0 || P;
    x && P && C(!1);
    let I = w && !P,
      ee = !I && void 0,
      L = J1($, 18, M)
        ? K1(
            $,
            18,
            M,
            r(g, {
              variant: "ghost",
              iconOnly: !0,
              icon: "Cache",
              "aria-label": M,
              tooltip: !1,
            }),
          )
        : $[19],
      z = J2($, 20, L, F)
        ? K2($, 20, L, F, r(b.Trigger, { disabled: F, render: L }))
        : $[22],
      te = J3($, 23, ee, z, M)
        ? K3($, 23, ee, z, M, r(S, { content: M, open: ee, children: z }))
        : $[26],
      B = J2($, 27, j, N) ? K2($, 27, j, N, ci(N, j)) : $[29],
      ne = J3($, 30, y, O, B)
        ? K3(
            $,
            30,
            y,
            O,
            B,
            r(b.Popup, {
              side: "bottom",
              align: y,
              container: O,
              collisionPadding: Fe,
              onContextMenu: ai,
              children: B,
            }),
          )
        : $[33];
    return J4($, 34, E, I, ne, te)
      ? K4(
          $,
          34,
          E,
          I,
          ne,
          te,
          o(b.Root, { open: I, onOpenChange: E, children: [te, ne] }),
        )
      : $[38];
  });
  return { Menu: mi, useSections: li, isEmpty: si };
}
