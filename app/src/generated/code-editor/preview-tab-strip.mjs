// Original Claude Desktop 3.6556.2 Preview tab strip pieces around ViewTabBar (cfe7c4b3b t): the tab label (cf580efe9
// Ca over c155b6b71 _ / x and cf790d7f8 u), the web-origin test (wa), the tab menu's open-in-browser item (Ta), the cap
// (c224804cc G), the favicon at the strip density (c224804cc K over c25e47851 a), the seed tab id (c155b6b71 l), the strip
// labels (c62dc633f t) and the close confirmation (cf580efe9 va, compiled); the host supplies intl, FormattedMessage, the
// modal presence hook and the Code pane's compact CdsRoot (shared-18 fx).
import { memo as f, useRef as n, useState as m } from "react";
import { jsx as r, jsxs as o, jsx as t } from "react/jsx-runtime";
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
  memoStoreValueFirst2 as I2,
  memoStoreDeps1 as Z1,
  memoStoreDeps3 as Z3,
  CdsAlertDialog as E,
  CdsButton as g,
  CdsContextMenu as O,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { useDirection as i } from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { useViewTabIconSize as A } from "../view-tabs/cfe7c4b3b-BF79K6ux.js";
import { a as D } from "../cowork-live/c25e47851-BMvEUx1u.mjs";
const pt = (() => {
  function l(e) {
    return e.replace(/\.+$/, "");
  }
  function u(e) {
    let t = l(e);
    return (
      t === "localhost" ||
      t.endsWith(".localhost") ||
      t === "[::1]" ||
      t === "0.0.0.0" ||
      /^127(\.\d{1,3}){3}$/.test(t)
    );
  }
  const c = u;
  function _(e) {
    return c(URL.parse(e)?.hostname ?? "");
  }
  return _;
})();
const ht = (() => {
  function x(e) {
    try {
      let t = new URL(e);
      if (t.protocol === "file:") {
        let n = t.pathname.split("/").filter(Boolean);
        return decodeURIComponent(n[n.length - 1] ?? e);
      }
      return t.host || e;
    } catch {
      return e;
    }
  }
  return x;
})();
const _t = (() => {
  const l = "seed";
  return l;
})();
function Ca(e) {
  try {
    let { port: t } = new URL(e);
    if (t && pt(e)) return t;
  } catch {}
  return ht(e);
}
function wa(e) {
  try {
    let { protocol: t } = new URL(e);
    return t === "http:" || t === "https:";
  } catch {
    return !1;
  }
}
function Ta(e) {
  let $ = J9(6),
    { tabId: t, label: n, onOpenInBrowser: i } = e,
    a = J2($, 0, i, t) ? K2($, 0, i, t, () => i(t)) : $[2];
  return J2($, 3, n, a)
    ? K2($, 3, n, a, r(O.Item, { onClick: a, children: n }))
    : $[5];
}
function G(e) {
  return e > 8;
}
function K(e) {
  let $ = J9(3),
    n = A() === "md" ? 20 : 12;
  return J2($, 0, e, n) ? K2($, 0, e, n, t(D, { ...e, size: n })) : $[2];
}
export {
  Ca as previewTabLabel,
  wa as isWebOrigin,
  Ta as PreviewTabOpenInBrowserItem,
  G as previewTabsAtCap,
  K as PreviewTabFavicon,
  _t as previewSeedTabId,
  pt as isLocalOrigin,
  ht as originLabel,
};
export function createPreviewTabStripLabels({ useIntl: e }) {
  function t() {
    let $ = J9(28),
      t = e(),
      n = J1($, 0, t)
        ? K1(
            $,
            0,
            t,
            t.formatMessage({ defaultMessage: "New tab", id: "9a2ShG0Qn9" }),
          )
        : $[1],
      r = J1($, 2, t)
        ? K1(
            $,
            2,
            t,
            t.formatMessage({
              defaultMessage:
                "Tab limit reached. Close a tab to open a new one.",
              id: "I/88mP3stO",
            }),
          )
        : $[3],
      i = J1($, 4, t)
        ? K1(
            $,
            4,
            t,
            t.formatMessage({
              defaultMessage: "Opening new tab\u2026",
              id: "/7ZvXkJuqB",
            }),
          )
        : $[5],
      a = J1($, 6, t)
        ? K1(
            $,
            6,
            t,
            t.formatMessage({ defaultMessage: "More tabs", id: "ENo6UqZ37g" }),
          )
        : $[7],
      o = J1($, 8, t)
        ? K1(
            $,
            8,
            t,
            t.formatMessage({ defaultMessage: "Close tab", id: "HqPKrAKR7j" }),
          )
        : $[9],
      s = J1($, 10, t)
        ? K1(
            $,
            10,
            t,
            t.formatMessage({
              defaultMessage: "press right arrow to close",
              id: "RBcB9hrW2h",
            }),
          )
        : $[11],
      c = J1($, 12, t)
        ? K1(
            $,
            12,
            t,
            t.formatMessage({
              defaultMessage: "press left arrow to close",
              id: "0Z9DIZBF+Q",
            }),
          )
        : $[13],
      l = J1($, 14, t)
        ? K1(
            $,
            14,
            t,
            t.formatMessage({
              defaultMessage: "Press Delete or Backspace to close the tab",
              id: "SQ/fkJNcSw",
            }),
          )
        : $[15],
      u = J1($, 16, t)
        ? K1(
            $,
            16,
            t,
            t.formatMessage({
              defaultMessage:
                "Press Control+Shift+Left Arrow or Right Arrow to move the tab",
              id: "r+CF5sMADW",
            }),
          )
        : $[17];
    return J5($, 18, n, r, i, a, o, s, c, l, u)
      ? K5($, 18, n, r, i, a, o, s, c, l, u, {
          newTab: n,
          newTabAtCap: r,
          newTabBusy: i,
          moreTabs: a,
          closeTab: o,
          closeTabHint: s,
          closeTabHintRtl: c,
          closeTabDeleteHint: l,
          moveTabHint: u,
        })
      : $[27];
  }
  return t;
}
export function createPreviewCloseTabsDialog({
  useIntl: Oe,
  FormattedMessage: J,
  useModalPresence: Jt,
  CodePaneRoot: Pe,
}) {
  const va = f(function (e) {
    let $ = J9(50),
      {
        pending: t,
        onCancel: a,
        onKeepRunning: s,
        onStopServer: c,
        onClosed: l,
      } = e,
      u = i() === "rtl",
      d = Oe(),
      f = t !== null;
    Jt(f);
    let p = n(null),
      [h, _] = m(t);
    t !== null && t !== h && _(t);
    let v = t ?? h,
      y = J1($, 0, a)
        ? K1($, 0, a, (e) => {
            e || a();
          })
        : $[1],
      b = J1($, 2, l)
        ? K1($, 2, l, (e) => {
            e || l?.();
          })
        : $[3],
      x = v?.processes[0],
      S = v?.processes.length ?? 0,
      C = x ? `localhost:${x.port}` : "",
      w = J2($, 4, C, u)
        ? K2($, 4, C, u, u ? r("bdi", { dir: "ltr", children: C }) : C)
        : $[6],
      T = J2($, 7, x?.name, d)
        ? I2(
            $,
            7,
            x?.name ??
              d.formatMessage({
                defaultMessage: "the dev server",
                id: "Qfb02UEU5e",
              }),
            x?.name,
            d,
          )
        : $[9],
      D =
        J1($, 10, w) || J1($, 11, v?.mode)
          ? I1(
              $,
              11,
              Z1(
                $,
                10,
                r(E.Title, {
                  children:
                    v?.mode === "others"
                      ? r(J, {
                          defaultMessage: "Close other tabs?",
                          id: "++FFdxb8fU",
                        })
                      : r(J, {
                          defaultMessage: "Close {host}?",
                          id: "n5uzmXhlfE",
                          values: { host: w },
                        }),
                }),
                w,
              ),
              v?.mode,
            )
          : $[12],
      O =
        J3($, 13, S, w, T) || J1($, 16, v?.mode)
          ? I1(
              $,
              16,
              Z3(
                $,
                13,
                r(E.Description, {
                  className: "mt-0",
                  children:
                    S > 1
                      ? r(J, {
                          defaultMessage:
                            "{count} dev servers are still running. You can keep them running and reopen a tab any time by entering its localhost address in the URL bar.",
                          id: "t8hBhodS4D",
                          values: { count: S },
                        })
                      : v?.mode === "others"
                        ? r(J, {
                            defaultMessage:
                              "{serverLabel} is still running. You can keep it running and reopen a tab any time by entering {host} in the URL bar.",
                            id: "vsEFu2jzgf",
                            values: { serverLabel: T, host: w },
                          })
                        : r(J, {
                            defaultMessage:
                              "{serverLabel} is still running. You can keep it running and reopen this tab any time by entering {host} in the URL bar.",
                            id: "L5yKGZnI+L",
                            values: { serverLabel: T, host: w },
                          }),
                }),
                S,
                w,
                T,
              ),
              v?.mode,
            )
          : $[17],
      k = J2($, 18, D, O)
        ? K2(
            $,
            18,
            D,
            O,
            o("div", { className: "flex flex-col gap-sm", children: [D, O] }),
          )
        : $[20],
      A = J0($, 21)
        ? K0($, 21, r(J, { defaultMessage: "Cancel", id: "47FYwba+bI" }))
        : $[21],
      j = J1($, 22, a)
        ? K1(
            $,
            22,
            a,
            r("div", {
              className: "flex items-center gap-sm",
              children: r(g, { variant: "secondary", onClick: a, children: A }),
            }),
          )
        : $[23],
      M = J2($, 24, S, d)
        ? K2(
            $,
            24,
            S,
            d,
            d.formatMessage(
              {
                defaultMessage:
                  "{count, plural, one {Stop server and close} other {Stop servers and close}}",
                id: "pcQAGNzCUk",
              },
              { count: S },
            ),
          )
        : $[26],
      N = J1($, 27, S)
        ? K1(
            $,
            27,
            S,
            S > 1
              ? r(J, { defaultMessage: "Stop servers", id: "KIfwgXQ5wV" })
              : r(J, { defaultMessage: "Stop server", id: "L+wTwYXlQg" }),
          )
        : $[28],
      P = J3($, 29, c, M, N)
        ? K3(
            $,
            29,
            c,
            M,
            N,
            r(g, {
              variant: "danger",
              onClick: c,
              "aria-label": M,
              children: N,
            }),
          )
        : $[32],
      F = J0($, 33)
        ? K0($, 33, r(J, { defaultMessage: "Keep running", id: "elCQufA21z" }))
        : $[33],
      I = J1($, 34, s)
        ? K1(
            $,
            34,
            s,
            r(g, { ref: p, variant: "primary", onClick: s, children: F }),
          )
        : $[35],
      ee = J2($, 36, P, I)
        ? K2(
            $,
            36,
            P,
            I,
            o("div", {
              className: "flex items-center gap-sm",
              children: [P, I],
            }),
          )
        : $[38],
      L = J2($, 39, ee, j)
        ? K2($, 39, ee, j, o(E.Footer, { align: "between", children: [j, ee] }))
        : $[41],
      R = J2($, 42, L, k)
        ? K2(
            $,
            42,
            L,
            k,
            o(E.Popup, {
              initialFocus: p,
              className: "epitaxy-root break-words max-w-[28rem]",
              children: [k, L],
            }),
          )
        : $[44];
    return J4($, 45, y, b, f, R)
      ? K4(
          $,
          45,
          y,
          b,
          f,
          R,
          r(Pe, {
            children: r(E.Root, {
              open: f,
              onOpenChange: y,
              onOpenChangeComplete: b,
              children: R,
            }),
          }),
        )
      : $[49];
  });
  return va;
}
