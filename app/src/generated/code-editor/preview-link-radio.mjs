// Original Claude Desktop 3.6556.2 CDS radio-card layout (shared-frame cV). Radio semantics, the indicator, the
// field-wrap probe (qS) and the mouse-down guard (qs) belong to the local host; the field wrapper (_) is a Fragment
// because the host renders no CdsField (qS is false).
import { forwardRef as X, useId as be, Fragment as _ } from "react";
import { jsx as b, jsxs as G } from "react/jsx-runtime";
import {
  reactMemoCache as J9,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged5 as J5,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore5 as K5,
  cdsClassNames as Q,
} from "../view-tabs/shared-frame-6jtSkIit.js";
const Mt = "text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]";
const kS = `text-footnote leading-snug ${Mt}`;
export function createPreviewLinkRadio({
  Radio: Qe,
  Indicator: iV,
  useWrap: qS,
  onMouseDown: qs,
}) {
  const sV =
    "cds-reset group/rd flex w-full items-start gap-md rounded-card border bg-surface-1 p-md text-start text-body font-normal text-primary outline-none focus-visible:outline-hidden hover:border-strong focus-visible:shadow-focus data-[checked]:border-accent data-[checked]:bg-[var(--cds-radio-group-card-selected)] data-[checked]:hover:border-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-disabled";
  const cV = X((e, t) => {
    let $ = J9(35),
      {
        value: n,
        label: r,
        description: i,
        leading: a,
        trailing: o,
        children: s,
        disabled: c,
        className: l,
      } = e,
      u = qS(),
      d = be(),
      f = be(),
      p = i ? f : void 0,
      m = J0($, 0) ? K0($, 0, qs(void 0)) : $[0],
      h = J1($, 1, l) ? K1($, 1, l, Q(sV, l)) : $[2],
      g = J0($, 3) ? K0($, 3, b(iV, { topAlign: !0 })) : $[3],
      v = J1($, 4, a)
        ? K1(
            $,
            4,
            a,
            a ? b("span", { className: "shrink-0", children: a }) : null,
          )
        : $[5],
      y = J2($, 6, r, d)
        ? K2(
            $,
            6,
            r,
            d,
            b("span", { id: d, className: "min-w-0 font-medium", children: r }),
          )
        : $[8],
      x = J1($, 9, o)
        ? K1(
            $,
            9,
            o,
            o ? b("span", { className: "shrink-0", children: o }) : null,
          )
        : $[10],
      S = J2($, 11, y, x)
        ? K2(
            $,
            11,
            y,
            x,
            G("span", {
              className: "flex items-start justify-between gap-sm",
              children: [y, x],
            }),
          )
        : $[13],
      C = J2($, 14, i, f)
        ? K2($, 14, i, f, i && b("span", { id: f, className: kS, children: i }))
        : $[16],
      w = J2($, 17, S, C)
        ? K2(
            $,
            17,
            S,
            C,
            G("span", { className: "flex min-w-0 flex-col", children: [S, C] }),
          )
        : $[19],
      T = J2($, 20, s, w)
        ? K2(
            $,
            20,
            s,
            w,
            G("span", {
              className: "flex min-w-0 flex-1 flex-col gap-xs",
              children: [w, s],
            }),
          )
        : $[22],
      E = J5($, 23, c, d, t, p, T, h, v, n)
        ? K5(
            $,
            23,
            c,
            d,
            t,
            p,
            T,
            h,
            v,
            n,
            G(Qe, {
              ref: t,
              value: n,
              disabled: c,
              "aria-labelledby": d,
              "aria-describedby": p,
              onMouseDown: m,
              className: h,
              children: [g, v, T],
            }),
          )
        : $[31];
    return J2($, 32, u, E)
      ? K2($, 32, u, E, u ? b(_, { children: E }) : E)
      : $[34];
  });
  return cV;
}
