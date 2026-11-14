// Original Claude Desktop 3.6556.2 pane menu trigger (ca5db7aaf H), sections (U) and rows (Z, searchable J/X);
// host supplies the Menu/Button/Tooltip primitives, intl, the portal container, the owner window and the DOM probes.
import { memo as o, useState as s, Fragment as i } from "react";
import { jsx as t, jsxs as n, Fragment as r } from "react/jsx-runtime";
import {
  reactMemoCache as J9,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged5 as J5,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore5 as K5,
  memoStoreValueFirst1 as I1,
  memoStoreValueFirst2 as I2,
  memoStoreValueFirst3 as I3,
  memoStoreDeps1 as Z1,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { menuCollisionPadding as _ } from "../code-composer/menu-collision-padding.mjs";
export function createPreviewPaneMenu({
  Menu: d,
  Button: c,
  Tooltip: f,
  useIntl: g,
  usePortal: l,
  isTextInput: y,
  asElement: u,
  useOwnerWindow: p,
}) {
  function P(e) {
    y(e.target) || e.preventDefault();
  }
  const F = [];
  const H = o(function (e) {
    let $ = J9(31),
      {
        sections: r,
        onOpenChange: i,
        disabled: a,
        paneName: o,
        unroll: s,
        triggerRef: u,
      } = e,
      p = s === void 0 || s,
      m = g(),
      h = l(),
      v = r ?? F;
    if (v.every(ee)) return null;
    let y = J2($, 0, v, p) ? K2($, 0, v, p, p ? Q(v) : null) : $[2];
    if (y) {
      let e = a || y.disabled;
      return J1($, 3, y.ariaLabel) ||
        J1($, 4, y.icon) ||
        J3($, 5, y.onSelect, e, u)
        ? I3(
            $,
            5,
            Z1(
              $,
              4,
              Z1(
                $,
                3,
                t(c, {
                  ref: u,
                  variant: "ghost",
                  iconOnly: !0,
                  icon: y.icon,
                  "aria-label": y.ariaLabel,
                  onClick: y.onSelect,
                  disabled: e,
                }),
                y.ariaLabel,
              ),
              y.icon,
            ),
            y.onSelect,
            e,
            u,
          )
        : $[8];
    }
    let b = J2($, 9, m, o)
        ? K2(
            $,
            9,
            m,
            o,
            m.formatMessage(
              { defaultMessage: "{pane} settings", id: "0v5PlsRKXz" },
              { pane: o },
            ),
          )
        : $[11],
      x = J2($, 12, b, u)
        ? K2(
            $,
            12,
            b,
            u,
            t(c, {
              ref: u,
              variant: "ghost",
              iconOnly: !0,
              icon: "DotsVertical",
              "aria-label": b,
              tooltip: !1,
            }),
          )
        : $[14],
      S = J2($, 15, a, x)
        ? K2($, 15, a, x, t(d.Trigger, { disabled: a, render: x }))
        : $[17],
      C = J2($, 18, S, b)
        ? K2($, 18, S, b, t(f, { content: b, children: S }))
        : $[20],
      w = J2($, 21, v, h)
        ? K2($, 21, v, h, t(U, { sections: v, portalContainer: h }))
        : $[23],
      T = J2($, 24, h, w)
        ? K2(
            $,
            24,
            h,
            w,
            t(d.Popup, {
              onContextMenu: P,
              side: "bottom",
              align: "end",
              container: h,
              collisionPadding: _,
              children: w,
            }),
          )
        : $[26];
    return J3($, 27, i, C, T)
      ? K3($, 27, i, C, T, n(d.Root, { onOpenChange: i, children: [C, T] }))
      : $[30];
  });
  function U(e) {
    let $ = J9(7),
      { sections: a, portalContainer: o } = e,
      s;
    if (J2($, 0, o, a)) {
      let e = J1($, 3, o)
        ? K1($, 3, o, (e, r) =>
            n(
              i,
              {
                children: [
                  r > 0 && !e.noSeparator && t(d.Separator, {}),
                  n(d.Group, {
                    children: [
                      e.header && t(d.GroupLabel, { children: e.header }),
                      e.items.map((e, n) =>
                        t(Z, { item: e, portalContainer: o }, e.value ?? n),
                      ),
                    ],
                  }),
                ],
              },
              e.key ?? r,
            ),
          )
        : $[4];
      ((s = a.filter(W).map(e)), K2($, 0, o, a, s));
    } else s = $[2];
    let c = s;
    return J1($, 5, c) ? K1($, 5, c, t(r, { children: c })) : $[6];
  }
  function W(e) {
    return e.items.length > 0;
  }
  const G = 10.5;
  function K(e, t) {
    return (e.items ?? []).filter(
      (e) =>
        t === "" ||
        (typeof e.label == "string" && e.label.toLowerCase().includes(t)),
    );
  }
  function q(e) {
    return u(
      e?.activeElement
        ?.closest('[role="menu"]')
        ?.querySelector(
          '[role^="menuitem"][data-highlighted]:not([aria-disabled="true"]):not([aria-haspopup])',
        ),
    );
  }
  function J(e) {
    let $ = J9(19),
      { item: n, searchLabel: r, portalContainer: i } = e,
      a = p(),
      [o, c] = s(""),
      l = J2($, 0, n, o)
        ? K2($, 0, n, o, K(n, o.trim().toLowerCase()).find(Y)?.onSelect)
        : $[2],
      u = J1($, 3, n)
        ? K1($, 3, n, (e) => {
            (c(e), n.onSearchQueryChange?.(e));
          })
        : $[4],
      f =
        J1($, 5, l) || J1($, 6, n.searchPending) || J1($, 7, a?.document)
          ? I1(
              $,
              7,
              Z1(
                $,
                6,
                Z1(
                  $,
                  5,
                  l === void 0 || n.searchPending === !0
                    ? void 0
                    : () => {
                        let e = q(a?.document);
                        e === null ? l() : e.click();
                      },
                  l,
                ),
                n.searchPending,
              ),
              a?.document,
            )
          : $[8],
      m = J2($, 9, n, i)
        ? K2($, 9, n, i, (e) => t(X, { item: n, query: e, portalContainer: i }))
        : $[11];
    return J5($, 12, i, o, r, u, f, m)
      ? K5(
          $,
          12,
          i,
          o,
          r,
          u,
          f,
          m,
          t(d.SearchablePopup, {
            searchLabel: r,
            query: o,
            onQueryChange: u,
            onSubmitQuery: f,
            container: i,
            collisionPadding: _,
            maxVisibleItems: G,
            children: m,
          }),
        )
      : $[18];
  }
  function Y(e) {
    return e.items === void 0 && !e.disabled && e.onSelect;
  }
  function X(e) {
    let $ = J9(8),
      { item: n, query: r, portalContainer: i } = e,
      a;
    if (J3($, 0, n, i, r)) {
      a = Symbol.for("react.early_return_sentinel");
      bb0: {
        let e = K(n, r);
        if (e.length > 0) {
          let n = J1($, 4, i)
            ? K1($, 4, i, (e, n) =>
                t(Z, { item: e, portalContainer: i }, e.value ?? n),
              )
            : $[5];
          a = t(d.Group, { children: e.map(n) });
          break bb0;
        }
      }
      K3($, 0, n, i, r, a);
    } else a = $[3];
    return a === Symbol.for("react.early_return_sentinel")
      ? J1($, 6, n.searchEmptyLabel)
        ? I1(
            $,
            6,
            t("div", {
              role: "presentation",
              className: "px-md py-sm text-footnote text-muted-as-secondary",
              children: n.searchEmptyLabel,
            }),
            n.searchEmptyLabel,
          )
        : $[7]
      : a;
  }
  function Z(e) {
    let $ = J9(42),
      { item: i, portalContainer: a } = e,
      o = i.disabled === !0 && !!i.disabledReason;
    if (i.items && !o) {
      let e = J1($, 0, i.separatorBefore)
          ? I1($, 0, i.separatorBefore && t(d.Separator, {}), i.separatorBefore)
          : $[1],
        o = i.trailing !== void 0 || i.hint !== void 0 ? !1 : void 0,
        s =
          J1($, 2, i.hint) || J1($, 3, i.label) || J2($, 4, i.trailing, o)
            ? I2(
                $,
                4,
                Z1(
                  $,
                  3,
                  Z1(
                    $,
                    2,
                    t(d.SubmenuTrigger, {
                      trailing: i.trailing,
                      hint: i.hint,
                      openOnHover: o,
                      children: i.label,
                    }),
                    i.hint,
                  ),
                  i.label,
                ),
                i.trailing,
                o,
              )
            : $[6],
        c = J2($, 7, i, a)
          ? K2(
              $,
              7,
              i,
              a,
              i.searchLabel === void 0
                ? t(d.Popup, {
                    container: a,
                    collisionPadding: _,
                    children: i.items.map((e, n) =>
                      t(Z, { item: e, portalContainer: a }, e.value ?? n),
                    ),
                  })
                : t(J, {
                    item: i,
                    searchLabel: i.searchLabel,
                    portalContainer: a,
                  }),
            )
          : $[9],
        l =
          J1($, 10, i.disabled) || J3($, 11, i.onOpenChange, s, c)
            ? I3(
                $,
                11,
                Z1(
                  $,
                  10,
                  n(d.Submenu, {
                    disabled: i.disabled,
                    onOpenChange: i.onOpenChange,
                    children: [s, c],
                  }),
                  i.disabled,
                ),
                i.onOpenChange,
                s,
                c,
              )
            : $[14];
      return J2($, 15, e, l)
        ? K2($, 15, e, l, n(r, { children: [e, l] }))
        : $[17];
    }
    let s =
        J1($, 18, i.checked) ||
        J1($, 19, i.checkedRole) ||
        J1($, 20, i.description) ||
        J1($, 21, i.descriptionLines) ||
        J1($, 22, i.disabled) ||
        J1($, 23, i.disabledReason) ||
        J1($, 24, i.hint) ||
        J1($, 25, i.keepOpen) ||
        J1($, 26, i.label) ||
        J1($, 27, i.leading) ||
        J1($, 28, i.onSelect) ||
        J1($, 29, i.shortcut) ||
        J1($, 30, i.trailing) ||
        J1($, 31, i.variant)
          ? I1(
              $,
              31,
              Z1(
                $,
                30,
                Z1(
                  $,
                  29,
                  Z1(
                    $,
                    28,
                    Z1(
                      $,
                      27,
                      Z1(
                        $,
                        26,
                        Z1(
                          $,
                          25,
                          Z1(
                            $,
                            24,
                            Z1(
                              $,
                              23,
                              Z1(
                                $,
                                22,
                                Z1(
                                  $,
                                  21,
                                  Z1(
                                    $,
                                    20,
                                    Z1(
                                      $,
                                      19,
                                      Z1(
                                        $,
                                        18,
                                        t(d.Item, {
                                          leading: i.leading,
                                          trailing: i.trailing,
                                          shortcut: i.shortcut,
                                          description: i.description,
                                          descriptionLines: i.descriptionLines,
                                          hint: i.hint,
                                          disabled: i.disabled,
                                          disabledReason: i.disabledReason,
                                          variant: i.variant,
                                          checked: i.checked,
                                          checkedRole: i.checkedRole,
                                          keepOpen: i.keepOpen,
                                          onClick: i.onSelect,
                                          children: i.label,
                                        }),
                                        i.checked,
                                      ),
                                      i.checkedRole,
                                    ),
                                    i.description,
                                  ),
                                  i.descriptionLines,
                                ),
                                i.disabled,
                              ),
                              i.disabledReason,
                            ),
                            i.hint,
                          ),
                          i.keepOpen,
                        ),
                        i.label,
                      ),
                      i.leading,
                    ),
                    i.onSelect,
                  ),
                  i.shortcut,
                ),
                i.trailing,
              ),
              i.variant,
            )
          : $[32],
      c = J1($, 33, i.separatorBefore)
        ? I1($, 33, i.separatorBefore && t(d.Separator, {}), i.separatorBefore)
        : $[34],
      l =
        J1($, 35, i.tooltip) || J2($, 36, i.tooltipSide, s)
          ? I2(
              $,
              36,
              Z1(
                $,
                35,
                i.tooltip
                  ? t(f, {
                      content: i.tooltip,
                      side: i.tooltipSide,
                      children: t("span", {
                        className: "flex [&>*]:w-full",
                        children: s,
                      }),
                    })
                  : s,
                i.tooltip,
              ),
              i.tooltipSide,
              s,
            )
          : $[38];
    return J2($, 39, c, l)
      ? K2($, 39, c, l, n(r, { children: [c, l] }))
      : $[41];
  }
  function Q(e) {
    let t = e.flatMap((e) => e.items);
    if (t.length !== 1) return null;
    let n = t[0];
    return n.icon === void 0 ||
      n.onSelect === void 0 ||
      n.items !== void 0 ||
      n.checked !== void 0 ||
      n.leading !== void 0 ||
      n.trailing !== void 0 ||
      n.tooltip !== void 0 ||
      n.disabledReason !== void 0 ||
      n.hint !== void 0 ||
      n.description !== void 0 ||
      n.shortcut !== void 0 ||
      n.variant === "danger" ||
      typeof n.label != "string"
      ? null
      : { ...n, icon: n.icon, ariaLabel: n.label };
  }
  function ee(e) {
    return e.items.length === 0;
  }
  return { Menu: H, Sections: U };
}
