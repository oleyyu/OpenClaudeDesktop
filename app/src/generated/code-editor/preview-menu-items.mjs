// Original Claude Desktop 3.6556.2 menu item renderer (cfca6870a S): submenus, searchable popups, tooltips, loading
// and trailing actions; host supplies the Menu, Tooltip and Spinner primitives. S(container, intl, onClose, rtl).
import { useEffect as i, Fragment as r } from "react";
import { jsx as e, jsxs as t, Fragment as n } from "react/jsx-runtime";
import {
  reactMemoCache as J9,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStoreValueFirst2 as I2,
  memoStoreDeps1 as Z1,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { menuCollisionPadding as l } from "../code-composer/menu-collision-padding.mjs";
function $h(e, t) {
  return (e === "inline-start") == (t === "rtl") ? "right" : "left";
}
function eg(e, t) {
  return t === "ltr" || (e !== "left" && e !== "right")
    ? e
    : e === "left"
      ? "right"
      : "left";
}
const u = eg,
  d = $h;
export function createPreviewMenuItems({ Menu: a, Tooltip: o, Spinner: s }) {
  function _(e) {
    let t = e.description ?? void 0,
      n = e.disabled ? e.tooltip : void 0;
    return n
      ? { description: t ? `${t} \u00B7 ${n}` : n, descriptionLines: void 0 }
      : { description: t, descriptionLines: e.descriptionLines };
  }
  function v(t, n, r) {
    if (!t.tooltip || t.disabled) return n;
    let i = r ? "rtl" : "ltr";
    return e(o, {
      content: t.tooltip,
      side: u(t.tooltipSide, i) ?? d("inline-end", i),
      multiline: t.tooltipMultiline ?? !0,
      onOpenChange: t.onTooltipOpenChange,
      children: n,
    });
  }
  function y(t) {
    return (
      t &&
      e("span", {
        className: "contents",
        onClick: (e) => e.stopPropagation(),
        children: t,
      })
    );
  }
  function b(r) {
    let $ = J9(20),
      {
        items: i,
        search: o,
        footerItems: s,
        portalContainer: c,
        renderItem: u,
      } = r,
      d = J2($, 0, s, u)
        ? K2(
            $,
            0,
            s,
            u,
            s && s.length > 0
              ? t(n, { children: [e(a.Separator, {}), s.map(u)] })
              : void 0,
          )
        : $[2],
      f = J2($, 3, c, d)
        ? K2($, 3, c, d, {
            className: "epitaxy-root break-words",
            container: c,
            collisionPadding: l,
            maxVisibleItems: 8.5,
            footer: d,
          })
        : $[5];
    if (!o) {
      let t = J2($, 6, i, u) ? K2($, 6, i, u, i.map(u)) : $[8];
      return J2($, 9, f, t)
        ? K2($, 9, f, t, e(a.Popup, { ...f, children: t }))
        : $[11];
    }
    let p = J3($, 12, i, u, o)
      ? K3($, 12, i, u, o, (e) => (e ? o.filter(e) : i).map(u))
      : $[15];
    return J1($, 16, f) || J2($, 17, o.label, p)
      ? I2(
          $,
          17,
          Z1(
            $,
            16,
            e(a.SearchablePopup, { ...f, searchLabel: o.label, children: p }),
            f,
          ),
          o.label,
          p,
        )
      : $[19];
  }
  function x(e) {
    let $ = J9(3),
      { onShown: t } = e,
      n,
      r;
    return (
      J1($, 0, t)
        ? ((n = () => {
            t();
          }),
          (r = [t]),
          K2($, 0, t, n, r))
        : ((n = $[1]), (r = $[2])),
      i(n, r),
      null
    );
  }
  function S(n, i, o, c = !1) {
    return function u(d, f) {
      let p = d.value ?? f;
      if (d.items)
        return t(
          r,
          {
            children: [
              d.separatorBefore && e(a.Separator, {}),
              t(a.Submenu, {
                disabled: d.disabled,
                onOpenChange: d.onOpenChange,
                children: [
                  e(a.SubmenuTrigger, {
                    icon: d.icon,
                    openOnHover: d.pressSelects ? !0 : void 0,
                    onClick:
                      d.pressSelects && d.onSelect
                        ? (e) => {
                            (e.preventDefault(),
                              e.stopPropagation(),
                              e.preventBaseUIHandler?.(),
                              d.onSelect?.(),
                              o
                                ? o()
                                : e.currentTarget.dispatchEvent(
                                    new KeyboardEvent("keydown", {
                                      key: "Escape",
                                      bubbles: !0,
                                    }),
                                  ));
                          }
                        : void 0,
                    trailing:
                      d.trailing ??
                      (d.hint === void 0
                        ? void 0
                        : e("span", {
                            className: "text-footnote text-muted-as-secondary",
                            children: d.hint,
                          })),
                    children: d.description
                      ? t("span", {
                          className: "flex min-w-0 flex-1 flex-col",
                          children: [
                            e("span", {
                              className: "truncate",
                              children: d.label,
                            }),
                            e("span", {
                              className:
                                "truncate py-[0.125em] -my-[0.125em] text-footnote text-muted-as-secondary",
                              children: d.description,
                            }),
                          ],
                        })
                      : d.label,
                  }),
                  d.search || d.footerItems?.length
                    ? e(b, {
                        items: d.items,
                        search: d.search,
                        footerItems: d.footerItems,
                        portalContainer: n,
                        renderItem: u,
                      })
                    : e(a.Popup, {
                        className: "epitaxy-root break-words",
                        container: n,
                        collisionPadding: l,
                        children: d.items.map(u),
                      }),
                ],
              }),
            ],
          },
          p,
        );
      let m =
          d.checked !== void 0 && d.trailing && d.checkedRole === "checkbox",
        h = t(a.Item, {
          icon: d.loading ? void 0 : d.icon,
          leading: d.loading
            ? t("span", {
                role: "status",
                className: "flex",
                children: [
                  e(s, { size: "sm" }),
                  e("span", {
                    className: "sr-only",
                    children: i.formatMessage({
                      defaultMessage: "Loading",
                      id: "iFsDVRnIHW",
                    }),
                  }),
                ],
              })
            : d.leading,
          trailing: y(d.trailing),
          shortcut: d.shortcut,
          hint: d.hint,
          ..._(d),
          disabled: d.disabled,
          disabledReason: d.disabledReason,
          variant: d.variant,
          indicator: d.indicator,
          indeterminate: d.indeterminate,
          href: d.href,
          routerOptions: d.routerOptions,
          target: d.target,
          checked: m ? void 0 : d.checked,
          checkedRole:
            m || d.checked === void 0 ? void 0 : (d.checkedRole ?? "radio"),
          ...(m && { role: "menuitemcheckbox", "aria-checked": d.checked }),
          keepOpen: d.keepOpen,
          onClick: d.onSelect,
          onPointerDown: d.onPointerDown,
          onPointerEnter: d.onPointerEnter,
          onPointerLeave: d.onPointerLeave,
          onFocus: d.onFocus,
          onBlur: d.onBlur,
          onKeyDown: d.trailingAction
            ? (e) => {
                e.key === (c ? "ArrowLeft" : "ArrowRight") &&
                  !e.defaultPrevented &&
                  (e.preventDefault(),
                  e.stopPropagation(),
                  d.trailingAction?.());
              }
            : void 0,
          children: [
            d.label,
            d.trailingAction &&
              e("span", {
                className: "sr-only",
                children: `, ${d.trailingActionAriaHint ?? (c ? i.formatMessage({ defaultMessage: "press left arrow to activate", id: "laDQTSjAjY" }) : i.formatMessage({ defaultMessage: "press right arrow to activate", id: "Vu8t3l8URu" }))}`,
              }),
          ],
        });
      return t(
        r,
        {
          children: [
            d.separatorBefore && e(a.Separator, {}),
            d.onShown && e(x, { onShown: d.onShown }),
            v(d, h, c),
          ],
        },
        p,
      );
    };
  }
  return S;
}
