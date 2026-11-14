// Original adaptive selection/drawing toolbar (3.6556.2), CDS primitives (the panel Surface included) from
// view-tabs. The host supplies intl; no tool, layout, width, color or discard logic is rewritten.
import {
  memoStoreValueFirst1 as I1,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged4 as J4,
  memoChanged5 as J5,
  memoSentinel as J8,
  reactMemoCache as J9,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore4 as K4,
  memoStore5 as K5,
  memoStoreDeps2 as Z2,
  asElementNode as ee,
  CdsSurface as f,
  CdsTooltip as g,
  CdsDropdown as h,
  CdsTooltipProvider as ne,
  CdsButton as p,
  CdsConfirmationDialog as te,
  CdsIcon as v,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { jsxs as a, jsx as i, Fragment as o } from "react/jsx-runtime";
import {
  useState as d,
  memo as l,
  useRef as r,
  useLayoutEffect as s,
  useImperativeHandle as u,
} from "react";
import { clsx as n } from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { ownerWindow as $ownerWindow } from "../view-tabs/shared-25-DOWZRSlq.js";
const de = ((e, J9, J0, K0) => {
  function t() {
    let $ = J9(1);
    return J0($, 0)
      ? K0(
          $,
          0,
          e("span", {
            role: "separator",
            "aria-orientation": "vertical",
            className: "h-4 w-px shrink-0 bg-border",
          }),
        )
      : $[0];
  }
  return t;
})(i, J9, J0, K0);
const _ = ((b, G, ge, mT, pT, fT, cT, dT) => {
  function vT(e) {
    return Array.isArray(e);
  }
  function yT(e) {
    return vT(e)
      ? e.map((e, t) =>
          e === "separator"
            ? b(mT, {}, t)
            : e.label === void 0 ||
                e.label === null ||
                e.label === "" ||
                e.label === !1
              ? null
              : e.items
                ? G(
                    ge,
                    {
                      children: [
                        e.separatorBefore && b(mT, {}),
                        G(pT, {
                          disabled: e.disabled,
                          children: [
                            b(fT, {
                              icon: e.icon,
                              hint: e.hint,
                              children: e.label,
                            }),
                            b(cT, { children: yT(e.items) }),
                          ],
                        }),
                      ],
                    },
                    t,
                  )
                : G(
                    ge,
                    {
                      children: [
                        e.separatorBefore && b(mT, {}),
                        b(dT, {
                          icon: e.icon,
                          shortcut: e.shortcut,
                          variant: e.variant,
                          disabled: e.disabled,
                          checked: e.checked,
                          checkedRole: e.checkedRole,
                          indicator: e.indicator,
                          indeterminate: e.indeterminate,
                          hint: e.hint,
                          description: e.description,
                          descriptionLines: e.descriptionLines,
                          disabledReason: e.disabledReason,
                          keepOpen: e.keepOpen,
                          leading: e.leading,
                          trailing: e.trailing,
                          href: e.href,
                          routerOptions: e.routerOptions,
                          target: e.target,
                          onClick: e.onSelect,
                          children: e.label,
                        }),
                      ],
                    },
                    t,
                  ),
        )
      : e;
  }
  return yT;
})(i, a, o, h.Separator, h.Submenu, h.SubmenuTrigger, h.Popup, h.Item);
const C = (() => {
  function tn(e) {
    return e;
  }
  return tn;
})();
const re = ((pf) => {
  function mf(e) {
    return pf(e) ?? globalThis.window;
  }
  return mf;
})($ownerWindow);
export function createPreviewSketchToolbar({ Message: w, useIntl: se }) {
  var fe = {
      name: "Square",
      viewBox: 16,
      paths: [
        {
          d: "M4.25 3.5H11.75A0.75 0.75 0 0 1 12.5 4.25V11.75A0.75 0.75 0 0 1 11.75 12.5H4.25A0.75 0.75 0 0 1 3.5 11.75V4.25A0.75 0.75 0 0 1 4.25 3.5Z",
          strokeWidth: 1,
        },
      ],
    },
    O = {
      name: "Circle",
      viewBox: 16,
      paths: [{ d: "M3 8A5 5 0 1 0 13 8A5 5 0 1 0 3 8Z", strokeWidth: 1 }],
    },
    k = {
      name: "StepOne",
      viewBox: 16,
      paths: [
        {
          d: "M2.5 8A5.5 5.5 0 1 0 13.5 8A5.5 5.5 0 1 0 2.5 8Z",
          strokeWidth: 1,
        },
        { d: "M6.5 6.375L8 5.25L8 10.5M6.5 10.5L9.5 10.5", strokeWidth: 1 },
      ],
    },
    A = C({
      pen: { defaultMessage: "Pen", id: "3ODqMYj5Lf" },
      line: { defaultMessage: "Line", id: "8qNmpGDCMz" },
      arrow: { defaultMessage: "Arrow", id: "UTlLBbY88F" },
      rect: { defaultMessage: "Rectangle", id: "I1DHEXQk5F" },
      ellipse: { defaultMessage: "Ellipse", id: "Pq3xtXwwXq" },
      text: { defaultMessage: "Text", id: "zOU/9VFxRH" },
      step: { defaultMessage: "Step", id: "qBy1vcv6m9" },
      redact: { defaultMessage: "Redact", id: "D2lWtfIKHl" },
    }),
    pe = C({
      solid: { defaultMessage: "Solid", id: "3Cgy3o7W7g" },
      mosaic: { defaultMessage: "Mosaic", id: "tCY2r7xLc5" },
      noise: { defaultMessage: "Noise", id: "8+LZ+1OdoH" },
    }),
    me = Object.keys(pe),
    he = C({
      "#E03131": { defaultMessage: "Red", id: "D+ZFS/jiQh" },
      "#1971C2": { defaultMessage: "Blue", id: "k2tJ9kFBBI" },
      "#2F9E44": { defaultMessage: "Green", id: "1W4okOthcu" },
      "#1F1E1D": { defaultMessage: "Black", id: "XjGbuYjsmF" },
      "#FFFFFF": { defaultMessage: "White", id: "OAG+sQmYha" },
    }),
    ge = {
      pen: { icon: "Edit" },
      line: { icon: "LineSegment" },
      arrow: { icon: "ArrowLine" },
      rect: { customIcon: fe },
      ellipse: { customIcon: O },
      step: { customIcon: k },
      redact: { icon: "EyeSlash" },
      text: { icon: "TextT" },
    },
    _e = Object.keys(ge),
    ve = _e.filter((e) => e !== "redact"),
    ye = new Set(["line", "arrow", "rect", "ellipse", "step", "redact"]),
    be = C({
      2: { defaultMessage: "Thin", id: "BrIT67nsTw" },
      4: { defaultMessage: "Medium", id: "FOW8QxFbvE" },
      8: { defaultMessage: "Thick", id: "JD4YAheGpg" },
      12: { defaultMessage: "Extra thick", id: "JB06EXjUT5" },
    });
  function xe(e) {
    let $ = J9(4),
      { tool: t } = e,
      n = J1($, 0, t)
        ? K1($, 0, t, t === "select" ? { icon: "CursorFilled" } : ge[t])
        : $[1];
    return J1($, 2, n)
      ? K1(
          $,
          2,
          n,
          "icon" in n
            ? i(v, { name: n.icon, size: "sm" })
            : i(v, { customIcon: n.customIcon, size: "sm" }),
        )
      : $[3];
  }
  function Se(e) {
    let $ = J9(15),
      { tool: t, armed: n, disabled: r, onToolChange: a } = e,
      o = se(),
      s = J1($, 0, t) ? K1($, 0, t, i(xe, { tool: t })) : $[1],
      c = J2($, 2, o, t) ? K2($, 2, o, t, o.formatMessage(A[t])) : $[4],
      l = J3($, 5, n, a, t)
        ? K3($, 5, n, a, t, () => a(n ? "select" : t))
        : $[8];
    return J5($, 9, n, r, s, c, l)
      ? K5(
          $,
          9,
          n,
          r,
          s,
          c,
          l,
          i(p, {
            variant: "ghost",
            iconOnly: !0,
            icon: s,
            "aria-label": c,
            pressed: n,
            disabled: r,
            onClick: l,
          }),
        )
      : $[14];
  }
  var Ce = i(v, { name: "Cursor", size: "sm" });
  function j(e) {
    if (e === "solid") return "#000000";
    let t = e === "mosaic" ? 3 : 7,
      n =
        e === "mosaic"
          ? ["#4a4a4a", "#bdbdbd", "#7c7c7c", "#a3a3a3", "#5e5e5e"]
          : ["#1e1e1e", "#e2e2e2", "#6a6a6a", "#b8b8b8", "#3c3c3c", "#8e8e8e"],
      r = 14 / t,
      i = "";
    for (let e = 0; e < t * t; e++) {
      let a = (e % t) * r,
        o = Math.floor(e / t) * r;
      i += `<rect x='${a}' y='${o}' width='${r}' height='${r}' fill='${n[(e * 7 + (e >> 2)) % n.length]}'/>`;
    }
    let a = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'>${i}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(a)}") 0 0 / cover`;
  }
  var we = { solid: j("solid"), mosaic: j("mosaic"), noise: j("noise") },
    Te = new Set(["#1F1E1D", "#FFFFFF", we.solid]);
  function Ee(e) {
    let $ = J9(10),
      { fill: t, square: r } = e,
      a = r ? "rounded-[3px]" : "rounded-full",
      o = J1($, 0, t)
        ? K1(
            $,
            0,
            t,
            Te.has(t)
              ? "shadow-[0_0_0_1px_var(--cds-alpha-5)]"
              : "shadow-[0_0_0_1px_var(--cds-alpha-3)]",
          )
        : $[1],
      s = J2($, 2, a, o) ? K2($, 2, a, o, n("block h-3.5 w-3.5", a, o)) : $[4],
      c = J1($, 5, t) ? K1($, 5, t, { background: t }) : $[6];
    return J2($, 7, s, c)
      ? K2($, 7, s, c, i("span", { "aria-hidden": !0, className: s, style: c }))
      : $[9];
  }
  function De(e) {
    let $ = J9(2),
      { width: t } = e;
    return J1($, 0, t)
      ? K1(
          $,
          0,
          t,
          i("span", {
            "aria-hidden": !0,
            className: "block w-5 rounded-full bg-current",
            style: { height: t },
          }),
        )
      : $[1];
  }
  function M(e) {
    let $ = J9(21),
      { zoom: t } = e,
      n = se(),
      r = J1($, 0, n)
        ? K1(
            $,
            0,
            n,
            n.formatMessage({ defaultMessage: "Zoom", id: "yMbKjuDH/n" }),
          )
        : $[1],
      s = J1($, 2, n)
        ? K1(
            $,
            2,
            n,
            n.formatMessage({ defaultMessage: "Zoom out", id: "/UnJ3SDiCO" }),
          )
        : $[3],
      c = !t.canZoomOut,
      l =
        J2($, 4, s, c) || J1($, 6, t.onZoomOut)
          ? I1(
              $,
              6,
              Z2(
                $,
                4,
                i(p, {
                  variant: "ghost",
                  iconOnly: !0,
                  icon: "ZoomOut",
                  "aria-label": s,
                  disabled: c,
                  onClick: t.onZoomOut,
                }),
                s,
                c,
              ),
              t.onZoomOut,
            )
          : $[7],
      u = J1($, 8, n)
        ? K1(
            $,
            8,
            n,
            n.formatMessage({ defaultMessage: "Zoom in", id: "xbi38cl5pP" }),
          )
        : $[9],
      d = !t.canZoomIn,
      f =
        J2($, 10, u, d) || J1($, 12, t.onZoomIn)
          ? I1(
              $,
              12,
              Z2(
                $,
                10,
                i(p, {
                  variant: "ghost",
                  iconOnly: !0,
                  icon: "ZoomIn",
                  "aria-label": u,
                  disabled: d,
                  onClick: t.onZoomIn,
                }),
                u,
                d,
              ),
              t.onZoomIn,
            )
          : $[13],
      m = J3($, 14, r, l, f)
        ? K3(
            $,
            14,
            r,
            l,
            f,
            a("div", {
              role: "group",
              "aria-label": r,
              className: "flex items-center gap-xs",
              children: [l, f],
            }),
          )
        : $[17],
      ee = J0($, 18) ? K0($, 18, i(de, {})) : $[18];
    return J1($, 19, m) ? K1($, 19, m, a(o, { children: [m, ee] })) : $[20];
  }
  function N(e) {
    let $ = J9(4),
      { label: t, onHide: n } = e,
      r = J0($, 0) ? K0($, 0, i(de, {})) : $[0];
    return J2($, 1, t, n)
      ? K2(
          $,
          1,
          t,
          n,
          a(o, {
            children: [
              r,
              i(p, {
                variant: "ghost",
                iconOnly: !0,
                icon: "X",
                "aria-label": t,
                onClick: n,
              }),
            ],
          }),
        )
      : $[3];
  }
  function Oe(e) {
    let $ = J9(15),
      {
        label: t,
        current: n,
        trigger: r,
        pinnedOpen: o,
        pressed: s,
        disabled: c,
        children: l,
      } = e,
      u = o || void 0,
      d = J5($, 0, n, c, t, s, r)
        ? K5(
            $,
            0,
            n,
            c,
            t,
            s,
            r,
            i(h.TriggerButton, {
              variant: "ghost",
              "aria-label": t,
              "aria-description": n,
              pressed: s,
              disabled: c,
              children: r,
            }),
          )
        : $[5],
      f = J2($, 6, t, d)
        ? K2($, 6, t, d, i(g, { content: t, hoverable: !1, children: d }))
        : $[8],
      p = J1($, 9, l)
        ? K1($, 9, l, i(h.Popup, { side: "top", align: "start", children: l }))
        : $[10];
    return J3($, 11, u, f, p)
      ? K3($, 11, u, f, p, a(h.Root, { open: u, children: [f, p] }))
      : $[14];
  }
  function ke(e) {
    let $ = J9(10),
      { name: t, chip: n, checked: r, onPick: a } = e,
      o = J1($, 0, t)
        ? K1($, 0, t, i("span", { className: "sr-only", children: t }))
        : $[1],
      s = J4($, 2, r, n, a, o)
        ? K4(
            $,
            2,
            r,
            n,
            a,
            o,
            i(h.Item, {
              leading: n,
              checked: r,
              checkedRole: "radio",
              onClick: a,
              children: o,
            }),
          )
        : $[6];
    return J2($, 7, t, s)
      ? K2(
          $,
          7,
          t,
          s,
          i(g, { content: t, hoverable: !1, side: "right", children: s }),
        )
      : $[9];
  }
  function P(e) {
    let $ = J9(229),
      {
        tool: t,
        onToolChange: c,
        leadingTool: l,
        toolsDisabled: m,
        resting: v,
        colors: y,
        color: b,
        onColorChange: ie,
        widths: ae,
        strokeWidth: x,
        onStrokeWidthChange: S,
        redactEnabled: oe,
        redactStyle: C,
        onRedactStyleChange: ce,
        redactionSelected: le,
        hasStrokes: T,
        canUndo: ue,
        canRedo: E,
        onUndo: D,
        onRedo: fe,
        undoShortcut: O,
        redoShortcut: k,
        onClear: ge,
        onClose: j,
        positiveAction: Te,
        positiveActionIconOnly: P,
        minimalDropsClear: je,
        handleRef: Me,
        concealed: F,
        className: Ne,
        defaultOpenMenu: I,
      } = e,
      L = m !== void 0 && m,
      Pe = je !== void 0 && je,
      Fe = F !== void 0 && F,
      R = se(),
      Ie = r(null),
      Le = r(null),
      Re = r(null),
      [z, ze] = d("full"),
      B = v?.firstToolsOnly === !0,
      V = B ? "full" : z,
      Be = V !== "full",
      H = P !== void 0,
      Ve = r(0),
      U = r(0),
      [W, He] = d(!1),
      G = J2($, 0, T, j)
        ? K2($, 0, T, j, () => {
            if (T) {
              He(!0);
              return;
            }
            j();
          })
        : $[2],
      Ue = J1($, 3, j)
        ? K1($, 3, j, () => {
            (He(!1), j());
          })
        : $[4],
      We = J0($, 5) ? K0($, 5, () => He(!1)) : $[5],
      K,
      Ge;
    (J1($, 6, G)
      ? ((K = () => ({ requestClose: G })), (Ge = [G]), K2($, 6, G, K, Ge))
      : ((K = $[7]), (Ge = $[8])),
      u(Me, K, Ge));
    let Ke = r(null),
      [q, qe] = d(!1),
      Je = J0($, 9)
        ? K0($, 9, (e) => {
            ((Ke.current = ee(e.target)), qe(!0));
          })
        : $[9],
      Ye = J0($, 10)
        ? K0($, 10, (e) => {
            e.currentTarget.contains(ee(e.relatedTarget)) || qe(!1);
          })
        : $[10],
      Xe = J1($, 11, q)
        ? K1($, 11, q, () => {
            let e = Ke.current,
              t = e?.isConnected === !1 && q;
            if (!e || !(t || e.matches(":disabled"))) return;
            Ke.current = null;
            let n = e.ownerDocument,
              r = n.activeElement;
            if (r === e || r === n.body || r === null) {
              let n = t ? Le.current : e.parentElement;
              (ee(n?.closest("[tabindex]"))?.focus({ preventScroll: !0 }),
                t && qe(!1));
            }
          })
        : $[12],
      Ze = v?.zoom?.canZoomOut,
      Qe = v?.zoom?.canZoomIn,
      $e = J5($, 13, E, ue, q, T, V, Ze, Qe)
        ? K5($, 13, E, ue, q, T, V, Ze, Qe, [ue, E, T, Ze, Qe, V, q])
        : $[20];
    s(Xe, $e);
    let J = J1($, 21, H)
        ? K1($, 21, H, () => {
            let e = Ie.current,
              t = Le.current,
              n = Re.current;
            if (!e || !t || !n) return;
            t.dataset.layout === "full"
              ? (Ve.current = n.offsetWidth)
              : t.dataset.layout === "compact" && (U.current = n.offsetWidth);
            let r = e.clientWidth;
            Ve.current <= r
              ? ze("full")
              : !H || U.current <= r
                ? ze("compact")
                : ze("minimal");
          })
        : $[22],
      et,
      tt;
    (J1($, 23, J)
      ? ((et = () => {
          let e = Ie.current,
            t = Re.current;
          if (!e || !t) return;
          let n = new (re(e).ResizeObserver)(J);
          return (n.observe(e), n.observe(t), () => n.disconnect());
        }),
        (tt = [J]),
        K2($, 23, J, et, tt))
      : ((et = $[24]), (tt = $[25])),
      s(et, tt));
    let nt = J1($, 26, J)
        ? K1($, 26, J, () => {
            J();
          })
        : $[27],
      rt = J2($, 28, J, V) ? K2($, 28, J, V, [V, J]) : $[30];
    s(nt, rt);
    let it = T || ue || E,
      at = V === "minimal" && v === void 0,
      ot = `${v !== void 0}:${it}`,
      st = r(ot),
      ct,
      lt;
    (J2($, 31, J, ot)
      ? ((ct = () => {
          st.current !== ot &&
            ((st.current = ot), (Ve.current = 0), (U.current = 0), J());
        }),
        (lt = [ot, J]),
        K3($, 31, J, ot, ct, lt))
      : ((ct = $[33]), (lt = $[34])),
      s(ct, lt));
    let ut = oe ? _e : ve,
      dt = J2($, 35, c, t)
        ? K2($, 35, c, t, (e) => c(e === t ? "select" : e))
        : $[37],
      ft = J4($, 38, R, dt, t, L)
        ? K4($, 38, R, dt, t, L, (e) => ({
            leading: i(xe, { tool: e }),
            label: R.formatMessage(A[e]),
            checked: e === t,
            checkedRole: "checkbox",
            disabled: L,
            onSelect: () => dt(e),
          }))
        : $[42],
      pt;
    if (J3($, 43, l, ft, ut)) {
      let e = ut.map(ft);
      ((pt = l
        ? [
            {
              leading: Ce,
              label: l.label,
              checked: l.pressed,
              checkedRole: "checkbox",
              onSelect: l.onPress,
            },
            ...e,
          ]
        : e),
        K3($, 43, l, ft, ut, pt));
    } else pt = $[46];
    let mt = pt,
      ht = J1($, 47, ut) ? K1($, 47, ut, ut.filter(Ae)) : $[48],
      [gt, _t] = d("rect"),
      vt = J1($, 49, t) ? K1($, 49, t, t !== "select" && ye.has(t)) : $[50];
    vt && t !== gt && _t(t);
    let yt = J2($, 51, gt, ht)
        ? K2($, 51, gt, ht, ht.includes(gt) || ht[0] === void 0 ? gt : ht[0])
        : $[53],
      bt = J2($, 54, ht, ft) ? K2($, 54, ht, ft, ht.map(ft)) : $[56],
      Y = oe && (t === "redact" || le),
      xt = J5($, 57, b, y, R, ie, ce, C, Y)
        ? K5(
            $,
            57,
            b,
            y,
            R,
            ie,
            ce,
            C,
            Y,
            Y
              ? me.map((e) =>
                  i(
                    ke,
                    {
                      name: R.formatMessage(pe[e]),
                      chip: i(Ee, { fill: we[e], square: !0 }),
                      checked: e === C,
                      onPick: () => ce(e),
                    },
                    e,
                  ),
                )
              : y.map((e) =>
                  i(
                    ke,
                    {
                      name: R.formatMessage(he[e]),
                      chip: i(Ee, { fill: e }),
                      checked: e === b,
                      onPick: () => ie(e),
                    },
                    e,
                  ),
                ),
          )
        : $[64],
      St;
    if (J4($, 65, R, S, x, ae)) {
      let e = J3($, 70, R, S, x)
        ? K3($, 70, R, S, x, (e) =>
            i(
              ke,
              {
                name: R.formatMessage(be[e]),
                chip: i(De, { width: e }),
                checked: e === x,
                onPick: () => S(e),
              },
              e,
            ),
          )
        : $[73];
      ((St = ae.map(e)), K4($, 65, R, S, x, ae, St));
    } else St = $[69];
    let Ct = St,
      wt = l?.pressed ?? !1,
      Tt = J2($, 74, wt, t)
        ? K2($, 74, wt, t, wt ? Ce : i(xe, { tool: t }))
        : $[76],
      Et = J1($, 77, yt) ? K1($, 77, yt, i(xe, { tool: yt })) : $[78],
      Dt = J3($, 79, b, C, Y)
        ? K3(
            $,
            79,
            b,
            C,
            Y,
            Y ? i(Ee, { fill: we[C], square: !0 }) : i(Ee, { fill: b }),
          )
        : $[82],
      Ot = J1($, 83, x) ? K1($, 83, x, i(De, { width: x })) : $[84],
      kt = J1($, 85, R)
        ? K1(
            $,
            85,
            R,
            R.formatMessage({
              defaultMessage: "Annotation tool",
              id: "nUFJ0sE5c9",
            }),
          )
        : $[86],
      At = J1($, 87, R)
        ? K1(
            $,
            87,
            R,
            R.formatMessage({ defaultMessage: "Shapes", id: "2iWb7cRQGh" }),
          )
        : $[88],
      jt = J1($, 89, R)
        ? K1(
            $,
            89,
            R,
            R.formatMessage({ defaultMessage: "Ink color", id: "k+yLsrlkhB" }),
          )
        : $[90],
      X = J1($, 91, R)
        ? K1(
            $,
            91,
            R,
            R.formatMessage({
              defaultMessage: "Redaction style",
              id: "tBKdfPJtGX",
            }),
          )
        : $[92],
      Mt = Y ? X : jt,
      Nt;
    if (J2($, 93, b, y)) {
      let e = J1($, 96, b) ? K1($, 96, b, (e) => e === b) : $[97];
      ((Nt = y.find(e)), K2($, 93, b, y, Nt));
    } else Nt = $[95];
    let Pt = Nt,
      Ft = J2($, 98, R, Pt)
        ? K2($, 98, R, Pt, Pt === void 0 ? void 0 : R.formatMessage(he[Pt]))
        : $[100],
      It = J4($, 101, Ft, R, C, Y)
        ? K4($, 101, Ft, R, C, Y, Y ? R.formatMessage(pe[C]) : Ft)
        : $[105],
      Lt = J2($, 106, R, yt)
        ? K2($, 106, R, yt, R.formatMessage(A[yt]))
        : $[108],
      Rt = J2($, 109, R, x) ? K2($, 109, R, x, R.formatMessage(be[x])) : $[111],
      zt = J2($, 112, R, t)
        ? K2($, 112, R, t, t === "select" ? void 0 : R.formatMessage(A[t]))
        : $[114],
      Bt = wt ? l?.label : zt,
      Z = J1($, 115, R)
        ? K1(
            $,
            115,
            R,
            R.formatMessage({ defaultMessage: "Line width", id: "SdHvg9BQQO" }),
          )
        : $[116],
      Q = J1($, 117, R)
        ? K1(
            $,
            117,
            R,
            R.formatMessage({ defaultMessage: "Undo", id: "JkS37H8PlA" }),
          )
        : $[118],
      Vt = J1($, 119, R)
        ? K1(
            $,
            119,
            R,
            R.formatMessage({
              defaultMessage: "Nothing to undo yet",
              id: "XFpgi7xuL0",
            }),
          )
        : $[120],
      Ht = J1($, 121, R)
        ? K1(
            $,
            121,
            R,
            R.formatMessage({ defaultMessage: "Redo", id: "3XyF4dAMbz" }),
          )
        : $[122],
      Ut = J1($, 123, R)
        ? K1(
            $,
            123,
            R,
            R.formatMessage({
              defaultMessage: "Nothing to redo yet",
              id: "jZhy9dr1Lm",
            }),
          )
        : $[124],
      Wt = J1($, 125, R)
        ? K1(
            $,
            125,
            R,
            R.formatMessage({ defaultMessage: "Clear all", id: "QW+Q5NHmeF" }),
          )
        : $[126],
      Gt = J1($, 127, R)
        ? K1(
            $,
            127,
            R,
            R.formatMessage({
              defaultMessage: "Hide annotation tools",
              id: "xZ87eA5X6R",
            }),
          )
        : $[128],
      Kt = J1($, 129, R)
        ? K1(
            $,
            129,
            R,
            R.formatMessage({ defaultMessage: "Close", id: "rbrahOGMC3" }),
          )
        : $[130],
      qt = J1($, 131, R)
        ? K1(
            $,
            131,
            R,
            R.formatMessage({
              defaultMessage: "Nothing to clear yet",
              id: "ZRQqPcheUz",
            }),
          )
        : $[132],
      Jt = t === "pen",
      Yt = J3($, 133, c, Jt, L)
        ? K3(
            $,
            133,
            c,
            Jt,
            L,
            i(Se, { tool: "pen", armed: Jt, disabled: L, onToolChange: c }),
          )
        : $[136],
      Xt = J5($, 137, I, B, c, vt, Lt, bt, Et, At, t, L)
        ? K5(
            $,
            137,
            I,
            B,
            c,
            vt,
            Lt,
            bt,
            Et,
            At,
            t,
            L,
            B
              ? null
              : a(o, {
                  children: [
                    i(Oe, {
                      label: At,
                      current: Lt,
                      trigger: Et,
                      pinnedOpen: I === "shape",
                      pressed: vt,
                      disabled: L,
                      children: _(bt),
                    }),
                    i(Se, {
                      tool: "text",
                      armed: t === "text",
                      disabled: L,
                      onToolChange: c,
                    }),
                  ],
                }),
          )
        : $[147],
      Zt = J1($, 148, Ne)
        ? K1(
            $,
            148,
            Ne,
            n(
              "pointer-events-none absolute inset-x-2.5 flex justify-center",
              Ne,
            ),
          )
        : $[149],
      Qt = v ? "" : void 0,
      $t = Fe || void 0,
      en = Fe && !q,
      tn = Fe
        ? "pointer-events-none opacity-0 duration-fast"
        : "pointer-events-auto duration-snap",
      nn = J1($, 150, tn)
        ? K1(
            $,
            150,
            tn,
            n(
              "w-max max-w-full transition-opacity ease-snap motion-reduce:transition-none",
              tn,
            ),
          )
        : $[151],
      rn = J1($, 152, v)
        ? K1($, 152, v, v?.zoom !== void 0 && i(M, { zoom: v.zoom }))
        : $[153],
      an = J5(
        $,
        154,
        I,
        Be,
        at,
        l,
        Yt,
        Mt,
        It,
        xt,
        Dt,
        kt,
        Bt,
        mt,
        Tt,
        Xt,
        Rt,
        Z,
        Ct,
        Ot,
      )
        ? K5(
            $,
            154,
            I,
            Be,
            at,
            l,
            Yt,
            Mt,
            It,
            xt,
            Dt,
            kt,
            Bt,
            mt,
            Tt,
            Xt,
            Rt,
            Z,
            Ct,
            Ot,
            Be
              ? a(Oe, {
                  label: kt,
                  current: Bt,
                  trigger: Tt,
                  pinnedOpen: I === "tool",
                  children: [
                    _(mt),
                    at &&
                      a(o, {
                        children: [
                          i(h.Separator, {}),
                          a(h.Submenu, {
                            children: [
                              i(h.SubmenuTrigger, {
                                leading: Dt,
                                hint: It,
                                children: Mt,
                              }),
                              i(h.Popup, {
                                children: i(h.Group, { children: xt }),
                              }),
                            ],
                          }),
                          a(h.Submenu, {
                            children: [
                              i(h.SubmenuTrigger, {
                                leading: Ot,
                                hint: Rt,
                                children: Z,
                              }),
                              i(h.Popup, {
                                children: i(h.Group, { children: Ct }),
                              }),
                            ],
                          }),
                        ],
                      }),
                  ],
                })
              : a("div", {
                  role: "group",
                  "aria-label": kt,
                  "data-sketch-tools": !0,
                  className: "flex items-center gap-xs",
                  children: [
                    l &&
                      i(g, {
                        content: l.label,
                        detail: l.detail,
                        shortcut: l.shortcut,
                        hoverable: !1,
                        children: i(p, {
                          variant: "ghost",
                          iconOnly: !0,
                          icon: Ce,
                          "aria-label": l.label,
                          shortcut: l.shortcut,
                          pressed: l.pressed,
                          onClick: l.onPress,
                        }),
                      }),
                    Yt,
                    Xt,
                  ],
                }),
          )
        : $[172],
      on = J5(
        $,
        173,
        E,
        ue,
        Wt,
        Kt,
        I,
        it,
        T,
        Gt,
        at,
        V,
        Pe,
        qt,
        Ut,
        Vt,
        ge,
        fe,
        D,
        Te,
        P,
        Ht,
        k,
        G,
        v,
        Mt,
        It,
        xt,
        Dt,
        Q,
        O,
        Rt,
        Z,
        Ct,
        Ot,
      )
        ? K5(
            $,
            173,
            E,
            ue,
            Wt,
            Kt,
            I,
            it,
            T,
            Gt,
            at,
            V,
            Pe,
            qt,
            Ut,
            Vt,
            ge,
            fe,
            D,
            Te,
            P,
            Ht,
            k,
            G,
            v,
            Mt,
            It,
            xt,
            Dt,
            Q,
            O,
            Rt,
            Z,
            Ct,
            Ot,
            v
              ? i(N, { label: Gt, onHide: v.onHide })
              : a(o, {
                  children: [
                    !at &&
                      a(o, {
                        children: [
                          i(de, {}),
                          i(Oe, {
                            label: Mt,
                            current: It,
                            trigger: Dt,
                            pinnedOpen: I === "color",
                            children: i(h.Group, { children: xt }),
                          }),
                          i(Oe, {
                            label: Z,
                            current: Rt,
                            trigger: Ot,
                            pinnedOpen: I === "width",
                            children: i(h.Group, { children: Ct }),
                          }),
                        ],
                      }),
                    i(de, {}),
                    it &&
                      a("div", {
                        className: "flex items-center",
                        children: [
                          i(p, {
                            variant: "ghost",
                            iconOnly: !0,
                            icon: "ArrowCounterClockwise",
                            "aria-label": Q,
                            shortcut: O,
                            disabled: !ue,
                            disabledReason: Vt,
                            onClick: D,
                          }),
                          i(p, {
                            variant: "ghost",
                            iconOnly: !0,
                            icon: "ArrowClockwise",
                            "aria-label": Ht,
                            shortcut: k,
                            disabled: !E,
                            disabledReason: Ut,
                            onClick: fe,
                          }),
                          Pe && V === "minimal"
                            ? null
                            : i(p, {
                                variant: "ghost",
                                iconOnly: !0,
                                icon: "Trash",
                                "aria-label": Wt,
                                disabled: !T,
                                disabledReason: qt,
                                onClick: ge,
                              }),
                        ],
                      }),
                    V === "minimal" ? P : Te,
                    i(p, {
                      variant: "ghost",
                      iconOnly: !0,
                      icon: "X",
                      "aria-label": Kt,
                      onClick: G,
                    }),
                  ],
                }),
          )
        : $[206],
      sn = J3($, 207, rn, an, on)
        ? K3(
            $,
            207,
            rn,
            an,
            on,
            a("div", {
              ref: Re,
              className: "flex w-max items-center gap-xs px-sm py-xs",
              children: [rn, an, on],
            }),
          )
        : $[210],
      cn = J5($, 211, V, Qt, $t, en, nn, sn)
        ? K5(
            $,
            211,
            V,
            Qt,
            $t,
            en,
            nn,
            sn,
            i(ne, {
              children: i(f, {
                ref: Le,
                "data-layout": V,
                "data-resting": Qt,
                "data-concealed": $t,
                inert: en,
                elevation: "panel",
                onFocus: Je,
                onBlur: Ye,
                className: nn,
                children: sn,
              }),
            }),
          )
        : $[217],
      ln,
      un,
      dn,
      fn;
    $[218] === J8
      ? ((ln = i(w, {
          defaultMessage: "Discard your annotations?",
          id: "MfFrIX0mxC",
        })),
        (un = i(w, {
          defaultMessage:
            "You have unsaved marks on this image. Discarding removes them.",
          id: "WrH605g8o7",
        })),
        (dn = i(w, { defaultMessage: "Discard", id: "nmpevlUATU" })),
        (fn = i(w, { defaultMessage: "Keep editing", id: "nZCHBxEAlK" })),
        ($[218] = ln),
        ($[219] = un),
        ($[220] = dn),
        ($[221] = fn))
      : ((ln = $[218]), (un = $[219]), (dn = $[220]), (fn = $[221]));
    let pn = J2($, 222, W, Ue)
      ? K2(
          $,
          222,
          W,
          Ue,
          i(te, {
            initialFocus: "cancel",
            open: W,
            onOpenChange: We,
            onConfirm: Ue,
            confirmVariant: "danger",
            title: ln,
            description: un,
            confirmLabel: dn,
            cancelLabel: fn,
          }),
        )
      : $[224];
    return J3($, 225, Zt, cn, pn)
      ? K3(
          $,
          225,
          Zt,
          cn,
          pn,
          a("div", { ref: Ie, className: Zt, children: [cn, pn] }),
        )
      : $[228];
  }
  function Ae(e) {
    return ye.has(e);
  }
  var je = l(P);
  return { Toolbar: je };
}
