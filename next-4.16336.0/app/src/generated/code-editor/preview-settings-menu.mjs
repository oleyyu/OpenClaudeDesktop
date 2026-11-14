// Original Claude Desktop 3.6556.2 Preview settings sections (c224804cc ae), menu (U) and clear-data dialog (W);
// host supplies the pane menu, the stable optional callback, the confirmation dialog and intl.
import { memo as o } from "react";
import { jsx as t } from "react/jsx-runtime";
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
  memoStoreValueFirst1 as I1,
  memoStoreValueFirst2 as I2,
  memoStoreValueFirst3 as I3,
  memoStoreValueFirst4 as I4,
  memoStoreDeps1 as Z1,
  memoStoreDeps2 as Z2,
} from "../view-tabs/shared-frame-6jtSkIit.js";
export function createPreviewSettingsMenu({
  useOptionalStable: _,
  PaneMenu: k,
  ConfirmDialog: u,
  useIntl: w,
}) {
  const B = {
    showSessionLogs: "Show dev server logs",
    allowedSites: "Manage allowed sites\u2026",
    importChromeLogins: "Import cookies\u2026",
    useImportedCookies: "Use cookies you already imported",
    openLinksInPreview: "Open links in Browser panel",
    autoOpenFiles: "Auto-open files Claude writes",
    clearBrowsingData: "Clear browsing data",
    cookiesHeader: "Cookies",
    keepCookies: "Keep cookies",
    persistNone: "Until quit",
    persistNoneHint: "Cookies are cleared when the app quits",
    persistShared: "Shared",
    persistSharedHint: "Cowork and all Code sessions share cookies",
    persistSession: "Per session",
    persistSessionHint: "Each session keeps its own cookies",
    autoVerify: "Auto-verify changes",
    openExternal: "Open in default browser",
    openExternalUnavailable: "This only works for websites.",
    copyUrl: "Copy URL",
    openFile: "Open HTML file\u2026",
    screenshot: "Save screenshot",
    showAnnotationTools: "Show annotation tools",
    viewport: "Viewport",
    viewportUnavailable: "Open a page first.",
  };
  const V = ["none", "shared", "session"];
  function H(e, t) {
    return t === "none"
      ? e.persistNone
      : t === "shared"
        ? e.persistShared
        : e.persistSession;
  }
  function ae(e) {
    let $ = J9(149),
      {
        onShowSessionLogs: t,
        onAllowedSites: n,
        onImportChromeLogins: r,
        onUseImportedCookies: i,
        onClearBrowsingData: a,
        openLinksInPreview: o,
        onOpenLinksInPreviewChange: s,
        autoOpenFiles: c,
        onAutoOpenFilesChange: l,
        previewStorage: u,
        onPreviewStorageChange: d,
        autoVerify: f,
        onAutoVerifyChange: p,
        onOpenExternal: ee,
        openExternalDisabled: m,
        onCopyUrl: h,
        copyUrlDisabled: g,
        onOpenFile: v,
        onScreenshot: te,
        screenshotDisabled: y,
        onShowAnnotationTools: ne,
        showAnnotationToolsDisabled: b,
        viewportItems: x,
        viewportHint: S,
        viewportDisabled: C,
        labels: w,
      } = e,
      T = _(t),
      E = _(n),
      D = _(r),
      O = _(i),
      k = _(a),
      re = _(s),
      A = _(l),
      j = _(ee),
      M = _(h),
      N = _(v),
      P = _(te),
      F = _(ne),
      I = _(d),
      L = _(p),
      R = t !== void 0,
      z = n !== void 0,
      ie = r !== void 0,
      ae = i !== void 0,
      U = a !== void 0,
      W = s !== void 0,
      G = l !== void 0,
      K = ee !== void 0,
      se = h !== void 0,
      ce = v !== void 0,
      le = te !== void 0,
      ue = ne !== void 0,
      de = p !== void 0,
      fe = d !== void 0,
      q = J1($, 0, w) ? K1($, 0, w, { ...B, ...w }) : $[1],
      J;
    if (
      J5($, 2, M, g, se, K, ce, le, ue) ||
      J1($, 9, q.copyUrl) ||
      J1($, 10, q.openExternal) ||
      J1($, 11, q.openExternalUnavailable) ||
      J1($, 12, q.openFile) ||
      J1($, 13, q.screenshot) ||
      J5($, 14, q.showAnnotationTools, j, m, N, P, y, F, b)
    ) {
      if (((J = []), K)) {
        let e =
          J1($, 23, q.openExternal) ||
          J3($, 24, q.openExternalUnavailable, j, m)
            ? I3(
                $,
                24,
                Z1(
                  $,
                  23,
                  {
                    label: q.openExternal,
                    disabled: m,
                    disabledReason: q.openExternalUnavailable,
                    onSelect: j,
                  },
                  q.openExternal,
                ),
                q.openExternalUnavailable,
                j,
                m,
              )
            : $[27];
        J.push(e);
      }
      if (se) {
        let e =
          J2($, 28, M, g) ||
          J1($, 30, q.copyUrl) ||
          J1($, 31, q.openExternalUnavailable)
            ? I1(
                $,
                31,
                Z1(
                  $,
                  30,
                  Z2(
                    $,
                    28,
                    {
                      label: q.copyUrl,
                      disabled: g,
                      disabledReason: q.openExternalUnavailable,
                      onSelect: M,
                    },
                    M,
                    g,
                  ),
                  q.copyUrl,
                ),
                q.openExternalUnavailable,
              )
            : $[32];
        J.push(e);
      }
      if (le) {
        let e = J3($, 33, q.screenshot, P, y)
          ? I3(
              $,
              33,
              { label: q.screenshot, disabled: y, onSelect: P },
              q.screenshot,
              P,
              y,
            )
          : $[36];
        J.push(e);
      }
      if (ue) {
        let e = J3($, 37, q.showAnnotationTools, F, b)
          ? I3(
              $,
              37,
              { label: q.showAnnotationTools, disabled: b, onSelect: F },
              q.showAnnotationTools,
              F,
              b,
            )
          : $[40];
        J.push(e);
      }
      if (ce) {
        let e = J2($, 41, q.openFile, N)
          ? I2($, 41, { label: q.openFile, onSelect: N }, q.openFile, N)
          : $[43];
        J.push(e);
      }
      (K5($, 2, M, g, se, K, ce, le, ue),
        ($[9] = q.copyUrl),
        ($[10] = q.openExternal),
        ($[11] = q.openExternalUnavailable),
        ($[12] = q.openFile),
        ($[13] = q.screenshot),
        K5($, 14, q.showAnnotationTools, j, m, N, P, y, F, b, J));
    } else J = $[22];
    let Y;
    if (
      J1($, 44, R) ||
      J1($, 45, q.showSessionLogs) ||
      J1($, 46, q.viewport) ||
      J5($, 47, q.viewportUnavailable, T, C, S, x)
    ) {
      if (((Y = []), x !== void 0)) {
        let e =
          J1($, 53, q.viewport) || J4($, 54, q.viewportUnavailable, C, S, x)
            ? I4(
                $,
                54,
                Z1(
                  $,
                  53,
                  {
                    label: q.viewport,
                    hint: S,
                    disabled: C,
                    disabledReason: q.viewportUnavailable,
                    items: x,
                  },
                  q.viewport,
                ),
                q.viewportUnavailable,
                C,
                S,
                x,
              )
            : $[58];
        Y.push(e);
      }
      if (R) {
        let e = J2($, 59, q.showSessionLogs, T)
          ? I2(
              $,
              59,
              { label: q.showSessionLogs, onSelect: T },
              q.showSessionLogs,
              T,
            )
          : $[61];
        Y.push(e);
      }
      (($[44] = R),
        ($[45] = q.showSessionLogs),
        ($[46] = q.viewport),
        K5($, 47, q.viewportUnavailable, T, C, S, x, Y));
    } else Y = $[52];
    let X;
    if (
      J5($, 62, E, c, A, f, L, z, G, de, W) ||
      J1($, 71, q.allowedSites) ||
      J1($, 72, q.autoOpenFiles) ||
      J1($, 73, q.autoVerify) ||
      J3($, 74, q.openLinksInPreview, re, o)
    ) {
      if (((X = []), W)) {
        let e = J2($, 78, re, o) ? K2($, 78, re, o, () => re?.(!o)) : $[80],
          t = J3($, 81, q.openLinksInPreview, o, e)
            ? I3(
                $,
                81,
                {
                  label: q.openLinksInPreview,
                  checked: o,
                  checkedRole: "checkbox",
                  keepOpen: !0,
                  onSelect: e,
                },
                q.openLinksInPreview,
                o,
                e,
              )
            : $[84];
        X.push(t);
      }
      if (G) {
        let e = c === !0,
          t = J2($, 85, c, A) ? K2($, 85, c, A, () => A?.(c !== !0)) : $[87],
          n = J3($, 88, q.autoOpenFiles, e, t)
            ? I3(
                $,
                88,
                {
                  label: q.autoOpenFiles,
                  checked: e,
                  checkedRole: "checkbox",
                  keepOpen: !0,
                  onSelect: t,
                },
                q.autoOpenFiles,
                e,
                t,
              )
            : $[91];
        X.push(n);
      }
      if (de) {
        let e = J2($, 92, f, L) ? K2($, 92, f, L, () => L?.(!f)) : $[94],
          t =
            J1($, 95, f) || J2($, 96, q.autoVerify, e)
              ? I2(
                  $,
                  96,
                  Z1(
                    $,
                    95,
                    {
                      label: q.autoVerify,
                      checked: f,
                      checkedRole: "checkbox",
                      keepOpen: !0,
                      onSelect: e,
                    },
                    f,
                  ),
                  q.autoVerify,
                  e,
                )
              : $[98];
        X.push(t);
      }
      if (z) {
        let e =
          J1($, 99, E) || J1($, 100, q.allowedSites)
            ? I1(
                $,
                100,
                Z1($, 99, { label: q.allowedSites, onSelect: E }, E),
                q.allowedSites,
              )
            : $[101];
        X.push(e);
      }
      (K5($, 62, E, c, A, f, L, z, G, de, W),
        ($[71] = q.allowedSites),
        ($[72] = q.autoOpenFiles),
        ($[73] = q.autoVerify),
        K3($, 74, q.openLinksInPreview, re, o, X));
    } else X = $[77];
    let Z;
    if (J5($, 102, k, U, ie, fe, ae, D, q, u, I, O)) {
      if (((Z = []), ie)) {
        let e =
          J1($, 113, D) || J1($, 114, q.importChromeLogins)
            ? I1(
                $,
                114,
                Z1($, 113, { label: q.importChromeLogins, onSelect: D }, D),
                q.importChromeLogins,
              )
            : $[115];
        Z.push(e);
      }
      if (ae) {
        let e = J2($, 116, q.useImportedCookies, O)
          ? I2(
              $,
              116,
              { label: q.useImportedCookies, onSelect: O },
              q.useImportedCookies,
              O,
            )
          : $[118];
        Z.push(e);
      }
      if (fe && u !== void 0) {
        let e = q.keepCookies,
          t = J2($, 119, q, u) ? K2($, 119, q, u, H(q, u)) : $[121],
          n = J3($, 122, q, u, I)
            ? K3(
                $,
                122,
                q,
                u,
                I,
                V.map((e) => ({
                  label: H(q, e),
                  description:
                    e === "none"
                      ? q.persistNoneHint
                      : e === "shared"
                        ? q.persistSharedHint
                        : q.persistSessionHint,
                  checked: u === e,
                  checkedRole: "radio",
                  onSelect: () => I?.(e),
                })),
              )
            : $[125],
          r = J3($, 126, q.keepCookies, t, n)
            ? I3($, 126, { label: e, hint: t, items: n }, q.keepCookies, t, n)
            : $[129];
        Z.push(r);
      }
      if (U) {
        let e =
          J1($, 130, k) || J1($, 131, q.clearBrowsingData)
            ? I1(
                $,
                131,
                Z1(
                  $,
                  130,
                  {
                    label: q.clearBrowsingData,
                    variant: "danger",
                    onSelect: k,
                  },
                  k,
                ),
                q.clearBrowsingData,
              )
            : $[132];
        Z.push(e);
      }
      K5($, 102, k, U, ie, fe, ae, D, q, u, I, O, Z);
    } else Z = $[112];
    let Q = J1($, 133, J) ? K1($, 133, J, { items: J }) : $[134],
      pe = J1($, 135, Y) ? K1($, 135, Y, { items: Y }) : $[136],
      me = J1($, 137, X) ? K1($, 137, X, { items: X }) : $[138],
      he =
        J1($, 139, Z) || J1($, 140, q.cookiesHeader)
          ? I1(
              $,
              140,
              Z1($, 139, { header: q.cookiesHeader, items: Z }, Z),
              q.cookiesHeader,
            )
          : $[141],
      ge;
    J4($, 142, Q, pe, me, he)
      ? ((ge = [Q, pe, me, he].filter(oe)), K4($, 142, Q, pe, me, he, ge))
      : (ge = $[146]);
    let _e = ge;
    return J1($, 147, _e) ? K1($, 147, _e, { sections: _e }) : $[148];
  }
  function oe(e) {
    return e.items.length > 0;
  }
  const U = o(function (e) {
    let $ = J9(9),
      n,
      r,
      i;
    J1($, 0, e)
      ? (({ paneName: i, onOpenChange: r, ...n } = e), K3($, 0, e, n, r, i))
      : ((n = $[1]), (r = $[2]), (i = $[3]));
    let { sections: a } = ae(n);
    return J4($, 4, n.disabled, r, i, a)
      ? I4(
          $,
          4,
          t("span", {
            "data-preview-settings-menu": !0,
            className: "contents",
            children: t(k, {
              sections: a,
              onOpenChange: r,
              paneName: i,
              unroll: !1,
              disabled: n.disabled,
            }),
          }),
          n.disabled,
          r,
          i,
          a,
        )
      : $[8];
  });
  const W = o(function (e) {
    let $ = J9(16),
      { isOpen: n, previewStorage: r, onClose: i, onConfirm: a } = e,
      o = w(),
      s = J1($, 0, i)
        ? K1($, 0, i, (e) => {
            e || i();
          })
        : $[1],
      c = J1($, 2, o)
        ? K1(
            $,
            2,
            o,
            o.formatMessage({
              defaultMessage: "Clear browsing data?",
              id: "NJWsttItt/",
            }),
          )
        : $[3],
      l = J2($, 4, o, r)
        ? K2(
            $,
            4,
            o,
            r,
            r === "shared"
              ? o.formatMessage({
                  defaultMessage:
                    "This deletes the cookies, sign-ins, and site data the browser saves for every Code session and Cowork. You\u2019ll need to sign in to sites again.",
                  id: "jp9NW95hOO",
                })
              : o.formatMessage({
                  defaultMessage:
                    "This deletes the cookies, sign-ins, and site data saved for this session\u2019s browser. You\u2019ll need to sign in to sites again.",
                  id: "5LIyxTSh0P",
                }),
          )
        : $[6],
      d = J1($, 7, o)
        ? K1(
            $,
            7,
            o,
            o.formatMessage({ defaultMessage: "Clear data", id: "wycwyUK5pQ" }),
          )
        : $[8];
    return J5($, 9, n, a, s, c, l, d)
      ? K5(
          $,
          9,
          n,
          a,
          s,
          c,
          l,
          d,
          t(u, {
            open: n,
            onOpenChange: s,
            onConfirm: a,
            title: c,
            description: l,
            confirmLabel: d,
            confirmVariant: "danger",
          }),
        )
      : $[15];
  });
  return { Menu: U, useSections: ae, ClearDataDialog: W, labels: B };
}
