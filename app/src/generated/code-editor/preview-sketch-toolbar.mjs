// Original adaptive selection/drawing toolbar (2.42304.0). The host supplies CDS primitives,
// density and owner-window utilities; no tool, layout or discard logic is rewritten.
import {
  useState as r,
  useImperativeHandle as s,
  useEffect as l,
  useLayoutEffect as f,
  useRef as a,
  useCallback as d,
  useMemo as c,
  memo as u,
  Fragment as n,
} from "react";
import { jsx as o, jsxs as i } from "react/jsx-runtime";
export function createPreviewSketchToolbar({
  Button: S,
  Tooltip: ae,
  Icon: b,
  Panel: C,
  Menu: w,
  renderMenuItems: oe,
  ConfirmDialog: T,
  Provider: ce,
  Message: pe,
  useIntl: me,
  ownerWindow: h,
  asElement: le,
  schedule: re,
  prefersReducedMotion: se,
  ownerDocument: de,
  useRem: x,
  densityToken: _e,
  resolveLength: ie,
}) {
  const p = (...parts) => parts.filter(Boolean).join(" "),
    fe = (value) => value;
  function Q() {
    return o("span", {
      role: "separator",
      "aria-orientation": "vertical",
      className: "h-4 w-px shrink-0 bg-border",
    });
  }
  const wt = {
    name: "Square",
    viewBox: 16,
    paths: [
      {
        d: "M4.25 3.5H11.75A0.75 0.75 0 0 1 12.5 4.25V11.75A0.75 0.75 0 0 1 11.75 12.5H4.25A0.75 0.75 0 0 1 3.5 11.75V4.25A0.75 0.75 0 0 1 4.25 3.5Z",
        strokeWidth: 1,
      },
    ],
  };
  const Tt = {
    name: "Circle",
    viewBox: 16,
    paths: [{ d: "M3 8A5 5 0 1 0 13 8A5 5 0 1 0 3 8Z", strokeWidth: 1 }],
  };
  const Et = fe({
    pen: { defaultMessage: "Pen", id: "3ODqMYj5Lf" },
    line: { defaultMessage: "Line", id: "QHhNtxVPGF" },
    arrow: { defaultMessage: "Arrow", id: "UTlLBbY88F" },
    rect: { defaultMessage: "Rectangle", id: "I1DHEXQk5F" },
    ellipse: { defaultMessage: "Ellipse", id: "Pq3xtXwwXq" },
    text: { defaultMessage: "Text", id: "zOU/9VFxRH" },
    redact: { defaultMessage: "Redact", id: "D2lWtfIKHl" },
  });
  const Dt = fe({
    solid: { defaultMessage: "Solid", id: "3Cgy3o7W7g" },
    mosaic: { defaultMessage: "Mosaic", id: "tCY2r7xLc5" },
    noise: { defaultMessage: "Noise", id: "8+LZ+1OdoH" },
  });
  const Ot = Object.keys(Dt);
  const kt = fe({
    "#E03131": { defaultMessage: "Red", id: "D+ZFS/jiQh" },
    "#1971C2": { defaultMessage: "Blue", id: "k2tJ9kFBBI" },
    "#2F9E44": { defaultMessage: "Green", id: "1W4okOthcu" },
    "#1F1E1D": { defaultMessage: "Black", id: "XjGbuYjsmF" },
    "#FFFFFF": { defaultMessage: "White", id: "OAG+sQmYha" },
  });
  const At = {
    pen: { icon: "Edit" },
    line: { icon: "LineSegment" },
    arrow: { icon: "ArrowLine" },
    rect: { customIcon: wt },
    ellipse: { customIcon: Tt },
    text: { icon: "TextT" },
    redact: { icon: "EyeSlash" },
  };
  const jt = Object.keys(At);
  const Mt = jt.filter((e) => e !== "redact");
  function Nt({ tool: e }) {
    let t = e === "select" ? { icon: "CursorFilled" } : At[e];
    return "icon" in t
      ? o(b, { name: t.icon, size: "sm" })
      : o(b, { customIcon: t.customIcon, size: "sm" });
  }
  function Pt({ tool: e, armed: t, disabled: n, onToolChange: r }) {
    let i = me();
    return o(S, {
      variant: "ghost",
      iconOnly: !0,
      icon: o(Nt, { tool: e }),
      "aria-label": i.formatMessage(Et[e]),
      pressed: t,
      disabled: n,
      onClick: () => r(t ? "select" : e),
    });
  }
  const Ft = o(b, { name: "Cursor", size: "sm" });
  function It(e) {
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
  const Lt = { solid: It("solid"), mosaic: It("mosaic"), noise: It("noise") };
  const Rt = new Set(["#1F1E1D", "#FFFFFF", Lt.solid]);
  function zt({ fill: e, active: t, square: n }) {
    return o("span", {
      "aria-hidden": !0,
      className: p(
        "block h-3.5 w-3.5 transition-shadow group-hover/swatch:shadow-[0_0_0_1px_var(--cds-text-secondary)]",
        n ? "rounded-[3px]" : "rounded-full",
        t
          ? "shadow-[0_0_0_2px_var(--cds-text-primary)]"
          : Rt.has(e)
            ? "shadow-[0_0_0_1px_var(--cds-alpha-5)]"
            : "shadow-[0_0_0_1px_var(--cds-alpha-3)]",
      ),
      style: { background: e },
    });
  }
  const Bt = 300;
  const Vt = 350;
  function Ht(e, t) {
    let [n, i] = r(!1),
      [o, s] = r(!1),
      [c, u] = r(!1),
      d = e !== void 0,
      f = d && (n || o);
    (!d && (n || o) && (i(!1), s(!1)), !f && c && u(!1));
    let p = a(null),
      m = a(null);
    l(
      () => () => {
        (p.current?.cancel(), m.current?.cancel());
      },
      [d],
    );
    let h = (n) => {
        let r = t.current;
        r?.hasAttribute("data-resting") &&
          ((n === "hover" ? i : s)(!0),
          !r.hasAttribute("data-revealed") &&
            (m.current?.cancel(),
            (m.current = re(r, () => u(!0), Vt)),
            se(de(r)) || e?.onRevealed?.(n)));
      },
      g = (e, n) => {
        e.pointerType !== "touch" &&
          (p.current?.cancel(),
          (p.current = re(
            t.current ?? void 0,
            () => (n ? h("hover") : i(!1)),
            Bt,
          )));
      };
    return {
      revealed: f,
      guardOver: c,
      barProps: d
        ? {
            onPointerEnter: (e) => g(e, !0),
            onPointerLeave: (e) => g(e, !1),
            onPointerDownCapture: () => p.current?.cancel(),
            onFocusCapture: (e) => {
              !o && le(e.target)?.matches(":focus-visible") && h("focus");
            },
            onBlurCapture: (e) => {
              e.currentTarget.contains(le(e.relatedTarget)) || s(!1);
            },
          }
        : void 0,
    };
  }
  function Ut({ zoom: e }) {
    let t = me();
    return i(n, {
      children: [
        i("div", {
          role: "group",
          "aria-label": t.formatMessage({
            defaultMessage: "Zoom",
            id: "yMbKjuDH/n",
          }),
          className: "flex items-center gap-xs",
          children: [
            o(S, {
              variant: "ghost",
              iconOnly: !0,
              icon: "ZoomOut",
              "aria-label": t.formatMessage({
                defaultMessage: "Zoom out",
                id: "/UnJ3SDiCO",
              }),
              disabled: !e.canZoomOut,
              onClick: e.onZoomOut,
            }),
            o(S, {
              variant: "ghost",
              iconOnly: !0,
              icon: "ZoomIn",
              "aria-label": t.formatMessage({
                defaultMessage: "Zoom in",
                id: "xbi38cl5pP",
              }),
              disabled: !e.canZoomIn,
              onClick: e.onZoomIn,
            }),
          ],
        }),
        o(Q, {}),
      ],
    });
  }
  function Wt({ label: e, onHide: t }) {
    return i(n, {
      children: [
        o(Q, {}),
        o(S, {
          variant: "ghost",
          iconOnly: !0,
          icon: "X",
          "aria-label": e,
          onClick: t,
        }),
      ],
    });
  }
  function Gt({
    tool: e,
    onToolChange: t,
    leadingTool: l,
    toolsDisabled: u = !1,
    resting: m,
    colors: g,
    color: _,
    onColorChange: ee,
    redactEnabled: v,
    redactStyle: y,
    onRedactStyleChange: te,
    redactionSelected: ne,
    hasStrokes: re,
    canUndo: b,
    canRedo: se,
    onUndo: ue,
    onRedo: de,
    undoShortcut: fe,
    redoShortcut: he,
    onClear: ge,
    onClose: E,
    positiveAction: D,
    positiveActionIconOnly: O,
    handleRef: k,
    concealed: A = !1,
    className: ve,
    defaultOpenMenu: j,
  }) {
    let M = me(),
      N = a(null),
      P = a(null),
      ye = a(null),
      be = a(null),
      [xe, Se] = r("full"),
      F = m?.firstToolsOnly === !0,
      I = F ? "full" : xe,
      L = I !== "full",
      Ce = O !== void 0,
      R = a(0),
      z = a(0),
      [B, we] = r(!1),
      Te = d(() => {
        if (re) {
          we(!0);
          return;
        }
        E();
      }, [re, E]),
      Ee = d(() => {
        (we(!1), E());
      }, [E]),
      De = d(() => we(!1), []);
    s(k, () => ({ requestClose: Te }), [Te]);
    let V = a(null),
      [Oe, H] = r(!1),
      U = d((e) => {
        ((V.current = le(e.target)), H(!0));
      }, []),
      ke = d((e) => {
        e.currentTarget.contains(le(e.relatedTarget)) || H(!1);
      }, []),
      W = Ht(L || F ? void 0 : m, P);
    f(() => {
      let e = V.current,
        t = e?.isConnected === !1 && Oe;
      if (!e || !(t || e.matches(":disabled"))) return;
      V.current = null;
      let n = e.ownerDocument,
        r = n.activeElement;
      if (r === e || r === n.body || r === null) {
        let n = t ? P.current : e.parentElement;
        (le(n?.closest("[tabindex]"))?.focus({ preventScroll: !0 }),
          t && H(!1));
      }
    }, [b, se, re, m?.zoom?.canZoomOut, m?.zoom?.canZoomIn, I, Oe]);
    let G = d(() => {
      let e = N.current,
        t = P.current,
        n = ye.current;
      if (!e || !t || !n) return;
      if (t.dataset.layout === "full") {
        let e = be.current,
          t = e?.parentElement?.offsetWidth ?? 0;
        R.current = n.offsetWidth + Math.max(0, (e?.scrollWidth ?? 0) - t);
      } else t.dataset.layout === "compact" && (z.current = n.offsetWidth);
      let r = e.clientWidth;
      R.current <= r
        ? Se("full")
        : !Ce || z.current <= r
          ? Se("compact")
          : Se("minimal");
    }, [Ce]);
    (f(() => {
      let e = N.current,
        t = ye.current;
      if (!e || !t) return;
      let n = new (h(e).ResizeObserver)(G);
      return (n.observe(e), n.observe(t), () => n.disconnect());
    }, [G]),
      f(() => {
        G();
      }, [I, G]));
    let Ae = m !== void 0,
      je = a(Ae);
    f(() => {
      je.current !== Ae &&
        ((je.current = Ae), (R.current = 0), (z.current = 0), G());
    }, [Ae, G]);
    let Me = v ? jt : Mt,
      Ne = c(() => {
        let n = Me.map((n) => ({
          leading: o(Nt, { tool: n }),
          label: M.formatMessage(Et[n]),
          checked: n === e,
          checkedRole: "checkbox",
          disabled: u,
          onSelect: () => t(n === e ? "select" : n),
        }));
        return l
          ? [
              {
                leading: Ft,
                label: l.label,
                checked: l.pressed,
                checkedRole: "checkbox",
                onSelect: l.onPress,
              },
              ...n,
            ]
          : n;
      }, [M, Me, e, t, l, u]),
      K = v && (e === "redact" || ne),
      Pe = c(
        () =>
          K
            ? Ot.map((e) => ({
                key: e,
                label: M.formatMessage(Dt[e]),
                fill: Lt[e],
                active: e === y,
                onPick: () => te(e),
              }))
            : g.map((e) => ({
                key: e,
                label: M.formatMessage(kt[e]),
                fill: e,
                active: e === _,
                onPick: () => ee(e),
              })),
        [M, K, y, te, g, _, ee],
      ),
      q = c(
        () =>
          Pe.map((e) => ({
            leading: o(zt, { fill: e.fill, square: K }),
            label: e.label,
            checked: e.active,
            checkedRole: "radio",
            onSelect: e.onPick,
          })),
        [Pe, K],
      ),
      Fe = l?.pressed ?? !1,
      Ie = c(() => (Fe ? Ft : o(Nt, { tool: e })), [e, Fe]),
      Le = c(
        () => (K ? o(zt, { fill: Lt[y], square: !0 }) : o(zt, { fill: _ })),
        [K, y, _],
      ),
      Re = M.formatMessage({
        defaultMessage: "Annotation tool",
        id: "nUFJ0sE5c9",
      }),
      ze = M.formatMessage({ defaultMessage: "Ink color", id: "k+yLsrlkhB" }),
      Be = M.formatMessage({
        defaultMessage: "Redaction style",
        id: "tBKdfPJtGX",
      }),
      J = K ? Be : ze,
      Ve = x(),
      He = 4 + (ie(_e("h-control"), Ve) - 0.875 * Ve) / 2,
      Ue = M.formatMessage({ defaultMessage: "Undo", id: "JkS37H8PlA" }),
      We = M.formatMessage({
        defaultMessage: "Nothing to undo yet",
        id: "XFpgi7xuL0",
      }),
      Ge = M.formatMessage({ defaultMessage: "Redo", id: "3XyF4dAMbz" }),
      Ke = M.formatMessage({
        defaultMessage: "Nothing to redo yet",
        id: "jZhy9dr1Lm",
      }),
      qe = M.formatMessage({ defaultMessage: "Clear all", id: "QW+Q5NHmeF" }),
      Y = M.formatMessage({
        defaultMessage: "Hide annotation tools",
        id: "xZ87eA5X6R",
      }),
      Je = M.formatMessage({ defaultMessage: "Close", id: "rbrahOGMC3" }),
      Ye = M.formatMessage({
        defaultMessage: "Nothing to clear yet",
        id: "ZRQqPcheUz",
      }),
      Xe = Me.map((n) =>
        o(Pt, { tool: n, armed: n === e, disabled: u, onToolChange: t }, n),
      ),
      Ze = Xe.slice(0, 1),
      Qe = F ? [] : Xe.slice(1);
    return i("div", {
      ref: N,
      className: p(
        "pointer-events-none absolute inset-x-2.5 flex justify-center",
        ve,
      ),
      children: [
        o(ce, {
          children: o(C, {
            ref: P,
            "data-layout": I,
            "data-resting": m ? "" : void 0,
            "data-revealed": W.revealed ? "" : void 0,
            "data-concealed": A || void 0,
            inert: A && !Oe,
            elevation: "panel",
            onFocus: U,
            onBlur: ke,
            ...W.barProps,
            className: p(
              "w-max max-w-full transition-opacity ease-snap motion-reduce:transition-none",
              A
                ? "pointer-events-none opacity-0 duration-fast"
                : "pointer-events-auto duration-snap",
            ),
            children: i("div", {
              ref: ye,
              className: "flex w-max items-center gap-xs px-sm py-xs",
              children: [
                m?.zoom !== void 0 && o(Ut, { zoom: m.zoom }),
                L
                  ? i(n, {
                      children: [
                        i(w.Root, {
                          open: j === "tool" || void 0,
                          children: [
                            o(ae, {
                              content: Re,
                              hoverable: !1,
                              children: o(w.TriggerButton, {
                                variant: "ghost",
                                "aria-label": Re,
                                children: Ie,
                              }),
                            }),
                            o(w.Popup, {
                              side: "top",
                              align: "start",
                              children: oe(Ne),
                            }),
                          ],
                        }),
                        !m &&
                          i(w.Root, {
                            open: j === "color" || void 0,
                            children: [
                              o(ae, {
                                content: J,
                                hoverable: !1,
                                children: o(w.TriggerButton, {
                                  variant: "ghost",
                                  "aria-label": J,
                                  children: Le,
                                }),
                              }),
                              o(w.Popup, {
                                side: "top",
                                align: "start",
                                children: oe(q),
                              }),
                            ],
                          }),
                      ],
                    })
                  : i(n, {
                      children: [
                        i("div", {
                          role: "group",
                          "aria-label": Re,
                          "data-sketch-tools": !0,
                          className: "flex items-center gap-xs",
                          children: [
                            l &&
                              o(ae, {
                                content: l.label,
                                detail: l.detail,
                                shortcut: l.shortcut,
                                hoverable: !1,
                                children: o(S, {
                                  variant: "ghost",
                                  iconOnly: !0,
                                  icon: Ft,
                                  "aria-label": l.label,
                                  shortcut: l.shortcut,
                                  pressed: l.pressed,
                                  onClick: l.onPress,
                                }),
                              }),
                            Ze,
                            o("div", {
                              className: m
                                ? p(
                                    "-ms-xs grid transition-[grid-template-columns] duration-base ease-out motion-reduce:transition-none touch:grid-cols-[minmax(0,1fr)]",
                                    W.revealed
                                      ? "grid-cols-[minmax(0,1fr)]"
                                      : "grid-cols-[minmax(0,0fr)]",
                                  )
                                : "contents",
                              children: i("div", {
                                ref: be,
                                "data-more-tools": !0,
                                className: m
                                  ? p(
                                      "flex min-w-0 items-center gap-xs touch:pointer-events-auto",
                                      !(W.revealed && W.guardOver) &&
                                        "pointer-events-none overflow-x-clip",
                                    )
                                  : "contents",
                                children: [
                                  o("span", {
                                    "aria-hidden": !0,
                                    className: m ? "w-0" : "hidden",
                                  }),
                                  Qe,
                                ],
                              }),
                            }),
                          ],
                        }),
                        !m &&
                          i(n, {
                            children: [
                              o(Q, {}),
                              o("div", {
                                role: "group",
                                "aria-label": J,
                                className: "flex items-center gap-xs px-xs",
                                children: Pe.map((e) =>
                                  o(
                                    ae,
                                    {
                                      content: e.label,
                                      hoverable: !1,
                                      sideOffset: He,
                                      children: o("button", {
                                        type: "button",
                                        "aria-label": e.label,
                                        "aria-pressed": e.active,
                                        onClick: e.onPick,
                                        className: p(
                                          "group/swatch focus-visible:outline-hidden focus-visible:shadow-focus",
                                          K ? "rounded-[3px]" : "rounded-full",
                                        ),
                                        children: o(zt, {
                                          fill: e.fill,
                                          active: e.active,
                                          square: K,
                                        }),
                                      }),
                                    },
                                    e.key,
                                  ),
                                ),
                              }),
                            ],
                          }),
                      ],
                    }),
                m
                  ? o(Wt, { label: Y, onHide: m.onHide })
                  : i(n, {
                      children: [
                        o(Q, {}),
                        i("div", {
                          className: "flex items-center",
                          children: [
                            o(S, {
                              variant: "ghost",
                              iconOnly: !0,
                              icon: "ArrowCounterClockwise",
                              "aria-label": Ue,
                              shortcut: fe,
                              disabled: !b,
                              disabledReason: We,
                              onClick: ue,
                            }),
                            o(S, {
                              variant: "ghost",
                              iconOnly: !0,
                              icon: "ArrowClockwise",
                              "aria-label": Ge,
                              shortcut: he,
                              disabled: !se,
                              disabledReason: Ke,
                              onClick: de,
                            }),
                            o(S, {
                              variant: "ghost",
                              iconOnly: !0,
                              icon: "Trash",
                              "aria-label": qe,
                              disabled: !re,
                              disabledReason: Ye,
                              onClick: ge,
                            }),
                          ],
                        }),
                        L
                          ? o(S, {
                              variant: "ghost",
                              iconOnly: !0,
                              icon: "X",
                              "aria-label": Je,
                              onClick: Te,
                            })
                          : o(S, {
                              variant: "ghost",
                              onClick: Te,
                              children: Je,
                            }),
                        I === "minimal" ? O : D,
                      ],
                    }),
              ],
            }),
          }),
        }),
        o(T, {
          initialFocus: "cancel",
          open: B,
          onOpenChange: De,
          onConfirm: Ee,
          confirmVariant: "danger",
          title: o(pe, {
            defaultMessage: "Discard your annotations?",
            id: "MfFrIX0mxC",
          }),
          description: o(pe, {
            defaultMessage:
              "You have unsaved marks on this image. Discarding removes them.",
            id: "WrH605g8o7",
          }),
          confirmLabel: o(pe, { defaultMessage: "Discard", id: "nmpevlUATU" }),
          cancelLabel: o(pe, {
            defaultMessage: "Keep editing",
            id: "nZCHBxEAlK",
          }),
        }),
      ],
    });
  }
  const Kt = u(Gt);
  const Yt = ["#E03131", "#1971C2", "#2F9E44", "#1F1E1D", "#FFFFFF"];
  return { Toolbar: Kt, colors: Yt };
}
