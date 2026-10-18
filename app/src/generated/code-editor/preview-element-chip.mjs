// Original pk chip button render, over the local popover/menu host.
import { useRef as P } from "react";
import { jsx as F, jsxs as V } from "react/jsx-runtime";
export function createSelectedElementChipBody({ Button: Mf }) {
  const te = (...parts) => parts.filter(Boolean).join(" "),
    $O = (node) => node.matches(":focus-visible");
  return function SelectedElementChipBody({
    value: e,
    thumbnail: t,
    label: n,
    labelContent: r,
    sublabel: i,
    sublabelMuted: a = !1,
    trailing: o,
    tile: s = !1,
    quiet: c = !1,
    previewOpen: l = !1,
    previewContent: u,
    hoverPeek: d = !1,
    previewPinned: f = !1,
    restored: g = !1,
    detail: _,
    menuItems: v,
    ariaLabel: y,
    wideLabel: x = !1,
    opensDialog: S = !1,
    onPreviewIntent: C,
    onPreviewEnter: T,
    onPreviewLeave: E,
    onClick: D,
    onRemove: O,
    onRequestRemove: k,
    anchorRef: j,
    onKeyDown: le,
    previewRef: W = { current: null },
  }) {
    const de = P(false),
      ie = P(false),
      I = d && f,
      ee = u !== undefined;
    const ue = d
      ? () => {
          C?.(I && l ? null : e, true, true, "click");
          D?.();
        }
      : () => D?.();
    const J = V(Mf, {
      value: e,
      onKeyDown: le,
      onKeyUp: d
        ? (e) => {
            e.key === " " && (e.preventDefault(), e.preventBaseUIHandler());
          }
        : void 0,
      onPointerDown: d
        ? () => {
            de.current = !0;
          }
        : void 0,
      onPointerUp: d
        ? () => {
            de.current = !1;
          }
        : void 0,
      onFocus: d
        ? (t) => {
            let n = de.current;
            if (((de.current = !1), !ie.current)) {
              if (I && l) {
                W.current?.focus({ preventScroll: !0 });
                return;
              }
              !n && $O(t.currentTarget) && C?.(ee ? e : null, !0, !1, "focus");
            }
          }
        : () => C?.(ee ? e : null, !0, !1, "focus"),
      onClick: ue,
      "aria-label": y ?? n,
      "aria-haspopup": d || S ? "dialog" : void 0,
      "aria-expanded": d ? l : void 0,
      className: te(
        "epitaxy-pill-body overflow-hidden focus-visible:outline-hidden focus-visible:shadow-focus hide-focus-ring",
        s
          ? "epitaxy-pill-body--tile rounded-card border"
          : "rounded-sm border-0",
        i === void 0
          ? "inline-flex items-center gap-1.25 h-10 px-md text-secondary text-body"
          : "inline-flex items-center gap-sm py-xs pr-md pl-lg text-secondary text-body",
        c
          ? "epitaxy-pill-body--flat bg-alpha-2 text-muted"
          : s
            ? "bg-surface-3"
            : "bg-fill-secondary",
      ),
      children: [
        F("span", {
          className: te(
            "flex items-center justify-center shrink-0",
            s && i !== void 0 && "me-xs",
          ),
          children: t,
        }),
        i === void 0
          ? F("span", {
              className: te("truncate", x ? "max-w-[260px]" : "max-w-[160px]"),
              children: n,
            })
          : V("span", {
              className: "flex min-w-0 flex-col items-start text-left",
              children: [
                F("span", {
                  className: te(
                    "truncate",
                    x ? "max-w-[260px]" : "max-w-[160px]",
                  ),
                  children: r ?? n,
                }),
                F("span", {
                  className: te(
                    "truncate",
                    x ? "max-w-[260px]" : "max-w-[160px]",
                    a ? "text-muted" : "text-primary",
                  ),
                  children: i,
                }),
              ],
            }),
        o,
      ],
    });
    return J;
  };
}
