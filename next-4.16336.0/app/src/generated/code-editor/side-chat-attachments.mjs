// Original MessageAttachments context chips (cc's "Attached context" list items) for the side chat's user turns.
import { jsx as r, jsxs as a } from "react/jsx-runtime";
import { clsx as t } from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { CdsPreviewCard as Tt } from "../view-tabs/shared-156-BLTosN8U.js";
import {
  CdsIcon as L,
  reactMemoCache as J9,
  memoChanged1 as J1,
  memoStore1 as K1,
  memoChanged2 as J2,
  memoStore2 as K2,
  memoChanged3 as J3,
  memoStore3 as K3,
  memoChanged5 as J5,
  memoStore5 as K5,
} from "../view-tabs/shared-frame-6jtSkIit.js";
var wU = { top: 48, right: 8, bottom: 8, left: 8 };
const yt = wU;
var ls = "[.epitaxy-user-turn_&]:justify-end";
function us(e) {
  let $ = J9(10),
    { code: t, body: n, width: i } = e,
    o = J1($, 0, i) ? K1($, 0, i, i === void 0 ? void 0 : { width: i }) : $[1],
    s = J1($, 2, t)
      ? K1(
          $,
          2,
          t,
          t &&
            r("pre", {
              className:
                "text-code text-primary bg-alpha-1 rounded-sm px-1.25 py-xs overflow-x-auto whitespace-pre",
              children: t,
            }),
        )
      : $[3],
    c = J1($, 4, n)
      ? K1(
          $,
          4,
          n,
          n &&
            r("span", {
              className:
                "text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere] [unicode-bidi:plaintext]",
              children: n,
            }),
        )
      : $[5];
  return J3($, 6, o, s, c)
    ? K3(
        $,
        6,
        o,
        s,
        c,
        a("div", {
          className:
            "flex flex-col gap-1 max-w-full min-w-0 max-h-[280px] overflow-y-auto p-md text-body select-text text-start rounded-[inherit] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus",
          style: o,
          children: [s, c],
        }),
      )
    : $[9];
}
var Cs = 60;
function ws(e) {
  let t = (
    e
      .split(
        `
`,
      )
      .find((e) => e.trim()) ?? e
  ).trim();
  return t.length > Cs ? `${t.slice(0, 59)}\u2026` : t;
}
var Ts = "epitaxy-root break-words !p-0 !min-w-0";
var qs = `epitaxy-user-attachments flex flex-wrap max-w-full ${ls}`;
function Xs(e) {
  let $ = J9(17),
    {
      icon: n,
      quiet: i,
      label: o,
      code: s,
      suggestion: c,
      body: l,
      filePath: u,
      startLine: d,
    } = e,
    f = i
      ? "bg-alpha-2 text-muted-as-secondary"
      : "bg-fill-secondary text-secondary",
    p = J1($, 0, f)
      ? K1(
          $,
          0,
          f,
          t(
            "grid place-items-center w-10 h-10 rounded-sm focus-visible:outline-hidden border-0 p-0 hide-focus-ring focus-visible:shadow-focus",
            f,
          ),
        )
      : $[1],
    m = J1($, 2, n) ? K1($, 2, n, r(L, { name: n, size: "sm" })) : $[3],
    h = J3($, 4, o, p, m)
      ? K3(
          $,
          4,
          o,
          p,
          m,
          r(Tt.Trigger, {
            render: r("button", {
              type: "button",
              "aria-label": o,
              className: p,
              children: m,
            }),
          }),
        )
      : $[7],
    g = J5($, 8, l, s, u, d, c)
      ? K5(
          $,
          8,
          l,
          s,
          u,
          d,
          c,
          r(Tt.Popup, {
            side: "top",
            collisionPadding: yt,
            className: Ts,
            children: r(us, { code: s, body: l, width: 420 }),
          }),
        )
      : $[13];
  return J2($, 14, h, g)
    ? K2($, 14, h, g, a(Tt.Root, { delay: 200, children: [h, g] }))
    : $[16];
}
function uc(e) {
  return r(
    "li",
    {
      role: "listitem",
      children: r(Xs, {
        icon: "Quote",
        quiet: !0,
        label: e.label ?? ws(e.text),
        body: e.text,
      }),
    },
    e.id,
  );
}
export { qs as messageAttachmentsClass, uc as messageContextChipItem };
