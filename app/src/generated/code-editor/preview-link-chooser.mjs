// Original Claude Desktop 3.6556.2 link destination chooser (cf700d36e p) and input arming delay (cebf5596d n);
// host supplies the radio group, confirmation dialog, icon, shortcut/platform, intl and the two preference stores.
import { useId as ee, useState as i, memo as r } from "react";
import { jsx as t, jsxs as n } from "react/jsx-runtime";
import { useState as armState, useEffect as armEffect } from "react";
import {
  reactMemoCache as J9,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged5 as J5,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore5 as K5,
} from "../view-tabs/shared-frame-6jtSkIit.js";
const ie = (() => {
  const e = armEffect,
    t = armState;
  function n(n, i) {
    let $ = J9(10),
      [a, o] = t(!1),
      [s, c] = t(0),
      l = J2($, 0, n, i) ? K2($, 0, n, i, { active: n, key: i }) : $[2],
      [u, d] = t(l);
    (u.active !== n || u.key !== i) &&
      (d({ active: n, key: i }), n && (o(!1), c(r)));
    let f = J2($, 3, n, a)
        ? K2($, 3, n, a, () => {
            if (!n || a) return;
            let e = setTimeout(() => o(!0), 500);
            return () => clearTimeout(e);
          })
        : $[5],
      p = J3($, 6, n, a, s) ? K3($, 6, n, a, s, [n, a, s]) : $[9];
    return (e(f, p), !n || a);
  }
  function r(e) {
    return e + 1;
  }
  return n;
})();
export function createPreviewLinkChooser({
  RadioGroup: s,
  useShortcut: a,
  Icon: o,
  ConfirmationDialog: te,
  platform: ne,
  useIntl: re,
  useChooserSeen: c,
  useLinksPreference: l,
  useModalPresence: u,
  useBrowserLabel: d,
}) {
  const p = r((e) => {
    let $ = J9(57),
      {
        isOpen: r,
        onClose: f,
        onConfirmed: p,
        protectInput: m,
        armKey: h,
        opensPullRequest: g,
      } = e,
      _ = m !== void 0 && m,
      v = g !== void 0 && g,
      y = re(),
      b = d(),
      x = ee(),
      [S] = a("cmd", ne()),
      [C, w] = l(),
      [T, E] = i(C),
      [, D] = c(),
      [O, ae] = i(v);
    r && O !== v && ae(v);
    let k = J2($, 0, y, O)
      ? K2(
          $,
          0,
          y,
          O,
          O
            ? y.formatMessage({
                defaultMessage:
                  "Opens this pull request beside the chat. Other links open there too, where Claude can see and act on the page.",
                id: "bqUpk9ln95",
              })
            : y.formatMessage({
                defaultMessage:
                  "Opens beside the chat. Claude can see and act on the page.",
                id: "aDHcSu+fob",
              }),
        )
      : $[2];
    u(r);
    let A = ie(r && _, h),
      j = J2($, 3, r, C) ? K2($, 3, r, C, { isOpen: r, pref: C }) : $[5],
      [M, N] = i(j);
    (M.isOpen !== r || M.pref !== C) && (N({ isOpen: r, pref: C }), r && E(C));
    let P = te,
      F = J1($, 6, f)
        ? K1($, 6, f, (e) => {
            e || f();
          })
        : $[7],
      I = J5($, 8, f, p, T, D, w)
        ? K5($, 8, f, p, T, D, w, () => {
            (w(T), D(!0), p?.(), f());
          })
        : $[13],
      L = _ && !A,
      R = J1($, 14, y)
        ? K1(
            $,
            14,
            y,
            y.formatMessage({
              defaultMessage: "Where should links open?",
              id: "SW2I2RenJ7",
            }),
          )
        : $[15],
      z = J1($, 16, y)
        ? K1(
            $,
            16,
            y,
            y.formatMessage({
              defaultMessage: "Choose what happens when you click a link.",
              id: "ducm9DLEvN",
            }),
          )
        : $[17],
      B = J1($, 18, y)
        ? K1(
            $,
            18,
            y,
            y.formatMessage({ defaultMessage: "Done", id: "JXdbo8Vnlw" }),
          )
        : $[19],
      V = J1($, 20, y)
        ? K1(
            $,
            20,
            y,
            y.formatMessage({
              defaultMessage: "Link destination",
              id: "NENRc4Q2v1",
            }),
          )
        : $[21],
      H = T ? "preview" : "browser",
      U = J0($, 22) ? K0($, 22, (e) => E(e === "preview")) : $[22],
      W = J0($, 23) ? K0($, 23, t(o, { name: "Globe" })) : $[23],
      G = J1($, 24, y)
        ? K1(
            $,
            24,
            y,
            y.formatMessage({
              defaultMessage: "Open in app",
              id: "8XhRcNMyE2",
            }),
          )
        : $[25],
      K = J2($, 26, k, G)
        ? K2(
            $,
            26,
            k,
            G,
            t(s.Card, {
              value: "preview",
              leading: W,
              label: G,
              description: k,
            }),
          )
        : $[28],
      oe = J0($, 29) ? K0($, 29, t(o, { name: "ArrowOutSquare" })) : $[29],
      q = J1($, 30, y)
        ? K1(
            $,
            30,
            y,
            y.formatMessage({
              defaultMessage: "Opens outside the app, in your default browser.",
              id: "hKY7t+mrIz",
            }),
          )
        : $[31],
      J = J2($, 32, b, q)
        ? K2(
            $,
            32,
            b,
            q,
            t(s.Card, {
              value: "browser",
              leading: oe,
              label: b,
              description: q,
            }),
          )
        : $[34],
      Y = J5($, 35, x, V, H, K, J)
        ? K5(
            $,
            35,
            x,
            V,
            H,
            K,
            J,
            n(s.Root, {
              "aria-label": V,
              "aria-describedby": x,
              value: H,
              onValueChange: U,
              children: [K, J],
            }),
          )
        : $[40],
      X = T
        ? y.formatMessage(
            {
              defaultMessage:
                "{modifier}-click a link to open it in your default browser.",
              id: "oqpJZ5fC7z",
            },
            { modifier: S },
          )
        : null,
      Z = J2($, 41, x, X)
        ? K2(
            $,
            41,
            x,
            X,
            t("p", {
              id: x,
              "aria-live": "polite",
              className: "text-caption text-muted-as-secondary",
              children: X,
            }),
          )
        : $[43],
      Q = J2($, 44, Y, Z)
        ? K2(
            $,
            44,
            Y,
            Z,
            n("div", {
              className: "flex flex-col gap-2.5 pt-md",
              children: [Y, Z],
            }),
          )
        : $[46];
    return J5($, 47, P, r, R, z, B, Q, F, I, L)
      ? K5(
          $,
          47,
          P,
          r,
          R,
          z,
          B,
          Q,
          F,
          I,
          L,
          t(P, {
            initialFocus: "cancel",
            className: "epitaxy-root break-words",
            open: r,
            onOpenChange: F,
            onConfirm: I,
            disabled: L,
            title: R,
            description: z,
            confirmLabel: B,
            children: Q,
          }),
        )
      : $[56];
  });
  return p;
}
