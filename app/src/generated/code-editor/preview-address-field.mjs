// Original Claude Desktop 3.6556.2 Preview address field (cf550b864 pe) and display URL (c224804cc Y); host supplies
// the Button and Spinner primitives. The tooltip context (S/C/ae) is shared with preview-navigation.mjs.
import {
  useRef as e,
  useLayoutEffect as r,
  useContext as i,
  useEffect as a,
  memo as o,
  createContext as s,
  useState as c,
} from "react";
import { jsx as t, jsxs as n } from "react/jsx-runtime";
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
  useCdsOwnerWindowAnchor as d,
} from "../view-tabs/shared-frame-6jtSkIit.js";
function aa(e) {
  return e?.ownerDocument.defaultView ?? globalThis.window;
}
const l = aa;
const S = s(!0);
const C = S.Provider;
function ae() {
  return i(S);
}
export { C as PreviewAddressTooltipProvider };
export function createPreviewAddressField({ Button: u, Spinner: ee }) {
  const oe = {
    address: "Address",
    openExternal: "Open in default browser",
    loading: "Loading page",
  };
  const se = [];
  const ce = "shrink-0 rounded-sm";
  const le = "top";
  function ue(e) {
    let t = e.ownerDocument.getSelection(),
      n = e.parentNode;
    t !== null &&
      t.rangeCount > 0 &&
      n !== null &&
      n.contains(t.anchorNode) &&
      t.removeAllRanges();
  }
  function de(e, t) {
    let n = t === void 0 ? void 0 : /^https?:\/\//.exec(t)?.[0];
    if (t === void 0 || n === void 0 || e === "") return "";
    let r = t.slice(n.length);
    return r === e || r === `${e}/` ? n : "";
  }
  function fe(e) {
    if (!e || /^[/\\~.]|\s/.test(e)) return null;
    try {
      let t = new URL(`http://${e}`);
      return !(
        t.hostname.includes(".") ||
        t.port !== "" ||
        t.hostname === "localhost"
      ) || !e.toLowerCase().startsWith(t.host)
        ? null
        : { host: e.slice(0, t.host.length), suffix: e.slice(t.host.length) };
    } catch {
      return null;
    }
  }
  const pe = o(function (i) {
    let $ = J9(100),
      {
        value: o,
        url: s,
        onNavigate: f,
        onOpenExternal: p,
        placeholder: m,
        labels: h,
        className: te,
        focusRequest: g,
        autoFocusWhenEmpty: ne,
        keepDraftOnBlur: re,
        draftKey: _,
        liveDraftKeys: v,
        pendingValue: ie,
        pendingNewTabRef: y,
      } = i,
      b = ne !== void 0 && ne,
      x = re === void 0 || re,
      S = _ === void 0 ? "" : _,
      C = v === void 0 ? se : v,
      pe = ae(),
      [w, T] = c(null),
      E = J2($, 0, s, o) ? K2($, 0, s, o, de(o, s)) : $[2],
      D = E === "" ? o : (s ?? o),
      O = e(null),
      k = e(S),
      A = e(!0),
      [he, ge] = c(!1),
      j = J0($, 3)
        ? K0($, 3, (e) => {
            ((A.current = e), ge(!e));
          })
        : $[3],
      _e = e(!1),
      M = e(!1),
      ve = e(0),
      N = e(!1),
      P = J1($, 4, C)
        ? K1(
            $,
            4,
            C,
            C.join(`
`),
          )
        : $[5],
      {
        address: ye,
        openExternal: be,
        loading: xe,
      } = J1($, 6, h) ? K1($, 6, h, { ...oe, ...h }) : $[7],
      Se = e(null),
      F = me,
      I = J0($, 8)
        ? K0($, 8, (e, t, n) => {
            if (e === n && O.current) {
              F(O.current, t);
              return;
            }
            Se.current = { forText: e, sel: t };
          })
        : $[8],
      L,
      R;
    (J1($, 9, w)
      ? ((L = () => {
          let e = Se.current;
          if (e === null) return;
          Se.current = null;
          let t = O.current;
          !t || w !== e.forText || F(t, e.sel);
        }),
        (R = [w, F]),
        K2($, 9, w, L, R))
      : ((L = $[10]), (R = $[11])),
      a(L, R));
    let Ce = J0($, 12)
        ? K0($, 12, () => {
            let e = O.current;
            return e !== null && e.ownerDocument.activeElement === e;
          })
        : $[12],
      we = e(!1),
      z,
      B;
    (J2($, 13, b, w)
      ? ((z = () => {
          !b ||
            we.current ||
            ((we.current = !0),
            w === null && !Ce() && (O.current?.focus(), T("")));
        }),
        (B = [b, w]),
        K3($, 13, b, w, z, B))
      : ((z = $[15]), (B = $[16])),
      a(z, B));
    let Te = e(void 0),
      Ee = J0($, 17) ? K0($, 17, new Map()) : $[17],
      V = e(Ee),
      H,
      U;
    (J5($, 18, w, S, g, y, D)
      ? ((H = () => {
          if (g === void 0 || g.key === Te.current) return;
          ((Te.current = g.key), (M.current = !1));
          let e = k.current !== S;
          if (e && V.current.has(S)) return;
          O.current?.focus();
          let t = w !== null && !A.current;
          if ((y && !(e && t) && (y.current.pending = !1), t)) {
            g.mode === "edit-current" && O.current && F(O.current, "all");
            return;
          }
          ((k.current = S),
            j(!0),
            g.mode === "blank" ? T("") : (I(D, "all", w), T(D)));
        }),
        (U = [g, D, S, w, I, F, j, y]),
        K5($, 18, w, S, g, y, D, H, U))
      : ((H = $[23]), (U = $[24])),
      a(H, U));
    let De = J0($, 25)
        ? K0($, 25, (e) => {
            let t = O.current;
            return {
              text: e,
              start: t?.selectionStart ?? e.length,
              end: t?.selectionEnd ?? e.length,
              dir: t?.selectionDirection ?? "none",
            };
          })
        : $[25],
      W,
      G;
    (J1($, 26, P)
      ? ((W = () => {
          let e = new Set(
            P.split(`
`),
          );
          for (let t of V.current.keys()) e.has(t) || V.current.delete(t);
        }),
        (G = [P]),
        K2($, 26, P, W, G))
      : ((W = $[27]), (G = $[28])),
      a(W, G));
    let K, q;
    (J5($, 29, w, S, P, y, D)
      ? ((K = () => {
          let e = Ce();
          if (k.current !== S) {
            let t = k.current;
            ((k.current = S), (M.current = !1));
            let n = y?.current.pending === !0;
            if ((y && (y.current.pending = !1), w !== null && !A.current)) {
              if (n && ve.current === y?.current.seq) {
                V.current.get(t)?.text === w && V.current.delete(t);
                return;
              }
              if (
                w !== "" &&
                P.split(
                  `
`,
                ).includes(t)
              ) {
                let e = V.current.get(t);
                (e === void 0 || e.text !== w) && V.current.set(t, De(w));
              }
              j(!0);
            }
            let r = V.current.get(S);
            if (r !== void 0) {
              (j(!1), e && (V.current.delete(S), I(r.text, r, w)), T(r.text));
              return;
            }
            if (!e) {
              T(null);
              return;
            }
            (j(!0), I(D, "all", w), T(D));
            return;
          }
          if (w !== null && e && A.current) {
            if (w === D) return;
            (I(D, "all", w), T(D));
          }
        }),
        (q = [S, D, w, I, P, y, De, j]),
        K5($, 29, w, S, P, y, D, K, q))
      : ((K = $[34]), (q = $[35])),
      a(K, q));
    let Oe = d(),
      ke,
      Ae;
    (J2($, 36, x, Oe)
      ? ((ke = () => {
          let e = l(Oe);
          if (!e || !x) return;
          let t,
            n = () => {
              (clearTimeout(t),
                (t = setTimeout(() => {
                  e.document.hasFocus() || O.current?.blur();
                }, 80)));
            };
          return (
            e.addEventListener("blur", n),
            () => {
              (e.removeEventListener("blur", n), clearTimeout(t));
            }
          );
        }),
        (Ae = [Oe, x]),
        K3($, 36, x, Oe, ke, Ae))
      : ((ke = $[38]), (Ae = $[39])),
      a(ke, Ae));
    let je = J3($, 40, w, S, D)
        ? K3($, 40, w, S, D, (e) => {
            if (((M.current = !1), w !== null && !A.current)) {
              let t = V.current.get(k.current);
              t !== void 0 &&
                t.text === w &&
                (V.current.delete(k.current),
                e.currentTarget.setSelectionRange(t.start, t.end, t.dir),
                (N.current = !0));
              return;
            }
            (T(D),
              (k.current = S),
              j(!0),
              e.currentTarget.select(),
              (e.currentTarget.scrollLeft = 0),
              (N.current = !0));
          })
        : $[43],
      Me = J0($, 44)
        ? K0($, 44, (e) => {
            N.current && ((N.current = !1), e.preventDefault());
          })
        : $[44],
      Ne = J4($, 45, w, x, D, o)
        ? K4($, 45, w, x, D, o, () => {
            let e = De(w ?? D);
            if ((O.current && ue(O.current), _e.current)) {
              ((_e.current = !1), V.current.delete(k.current), j(!0), T(null));
              return;
            }
            if (x && w && w !== o && w !== D && !A.current) {
              V.current.set(k.current, e);
              return;
            }
            (j(!0), T(null));
          })
        : $[49],
      Pe = J1($, 50, y)
        ? K1($, 50, y, (e) => {
            ((M.current = !1),
              A.current && y && (ve.current = y.current.seq),
              j(!1),
              T(e.currentTarget.value));
          })
        : $[51],
      Fe = J5($, 52, w, f, E, D, o)
        ? K5($, 52, w, f, E, D, o, (e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) {
              e.key === "Escape" && e.preventDefault();
              return;
            }
            if (
              (e.key !== "Escape" && (M.current = !1),
              !(e.repeat && e.key === "Enter"))
            ) {
              if (e.key === "Enter") {
                e.preventDefault();
                let t = e.currentTarget.value,
                  n = `${E}${o}/`,
                  r =
                    E !== "" && D === n && t.startsWith(`${n}/`)
                      ? `${n}${t.slice(n.length + 1)}`
                      : t;
                f(r) && ((_e.current = !0), e.currentTarget.blur());
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                let t = e.currentTarget;
                if (
                  M.current &&
                  !e.repeat &&
                  A.current &&
                  t.selectionStart === 0 &&
                  t.selectionEnd === t.value.length
                ) {
                  t.blur();
                  return;
                }
                (e.stopPropagation(),
                  (M.current = !0),
                  V.current.delete(k.current),
                  j(!0),
                  I(D, "all", w),
                  T(D));
                return;
              }
              (e.metaKey || e.ctrlKey) &&
                !e.shiftKey &&
                !e.altKey &&
                e.key.toLowerCase() === "l" &&
                F(e.currentTarget, "all");
            }
          })
        : $[57],
      J = w !== null && he,
      Y = ie || null,
      Ie = e(J),
      Le,
      X;
    (J1($, 58, J)
      ? ((Le = () => {
          if (Ie.current === J) return;
          Ie.current = J;
          let e = O.current;
          e === null ||
            Ce() ||
            (e.style.setProperty("transition-property", "none"),
            e.getBoundingClientRect(),
            e.style.removeProperty("transition-property"));
        }),
        (X = [J]),
        K2($, 58, J, Le, X))
      : ((Le = $[59]), (X = $[60])),
      r(Le, X));
    let Z = o !== "" || Y !== null,
      Q = J1($, 61, o) ? K1($, 61, o, fe(o)) : $[62],
      Re = J2($, 63, xe, Y)
        ? K2(
            $,
            63,
            xe,
            Y,
            Y === null
              ? null
              : t("span", {
                  className: "grid h-5 w-5 shrink-0 place-items-center",
                  children: t(ee, { size: "sm", label: xe }),
                }),
          )
        : $[65],
      ze = `flex h-control min-w-0 items-center gap-[4px] rounded bg-fill-field px-xs text-heading shadow-field-ring transition-shadow duration-150 ease-out [&:hover:not(:has(input:focus))]:shadow-field-hover has-[input:focus]:shadow-focus ${te ?? ""}`,
      Be = w ?? D,
      Ve = `h-full w-full min-w-0 border-0 bg-transparent px-xs text-start text-ellipsis text-heading text-primary caret-[var(--cds-fill-accent)] outline-none hide-focus-ring transition-opacity motion-reduce:transition-none duration-[50ms] ease-out placeholder:opacity-0 focus:opacity-100 focus:delay-[150ms] ${J ? "opacity-100" : "opacity-0"}`,
      He = J5($, 66, ye, Ne, Pe, je, Fe, m, Be, Ve)
        ? K5(
            $,
            66,
            ye,
            Ne,
            Pe,
            je,
            Fe,
            m,
            Be,
            Ve,
            t("input", {
              dir: "ltr",
              ref: O,
              type: "text",
              value: Be,
              placeholder: m,
              spellCheck: !1,
              autoComplete: "off",
              autoCorrect: "off",
              autoCapitalize: "off",
              "aria-label": ye,
              onFocus: je,
              onMouseUp: Me,
              onBlur: Ne,
              onChange: Pe,
              onKeyDown: Fe,
              className: Ve,
            }),
          )
        : $[74],
      Ue = J4($, 75, w, Z, m, o)
        ? K4(
            $,
            75,
            w,
            Z,
            m,
            o,
            (w ?? o) === "" &&
              m !== void 0 &&
              t("span", {
                "aria-hidden": !0,
                className: `pointer-events-none absolute inset-0 flex items-center px-xs ${Z ? "opacity-0 transition-opacity motion-reduce:transition-none duration-[50ms] ease-out group-focus-within/field:opacity-100 group-focus-within/field:delay-[150ms]" : ""}`,
                children: t("span", {
                  className:
                    "min-w-0 truncate text-heading text-muted-as-secondary",
                  children: m,
                }),
              }),
          )
        : $[79],
      We = J5($, 80, J, Z, Q, Y, E, o)
        ? K5(
            $,
            80,
            J,
            Z,
            Q,
            Y,
            E,
            o,
            !J &&
              Z &&
              n("span", {
                dir: "ltr",
                "aria-hidden": !0,
                className:
                  "pointer-events-none absolute inset-0 flex items-center px-xs transition-opacity motion-reduce:transition-none duration-[50ms] ease-out group-focus-within/field:opacity-0 group-focus-within/field:delay-[150ms]",
                children: [
                  t("span", {
                    "data-scheme": E,
                    className:
                      "invisible min-w-0 shrink-[1000000] grow overflow-hidden whitespace-nowrap text-heading before:content-[attr(data-scheme)] transition-[flex-grow,flex-shrink] duration-150 ease-out group-focus-within/field:shrink-0 group-focus-within/field:grow-0",
                  }),
                  Y === null
                    ? Q
                      ? n("span", {
                          className: "min-w-0 truncate text-heading",
                          children: [
                            t("span", {
                              className: "text-primary",
                              children: Q.host,
                            }),
                            Q.suffix &&
                              t("span", {
                                className: "text-muted-as-secondary",
                                children: Q.suffix,
                              }),
                          ],
                        })
                      : t("span", {
                          className:
                            "min-w-0 truncate text-heading text-primary",
                          children: o,
                        })
                    : t("span", {
                        className:
                          "min-w-0 truncate text-heading text-muted-as-secondary",
                        children: Y,
                      }),
                  t("span", {
                    "data-scheme": E,
                    className:
                      "invisible min-w-0 shrink-[1000000] grow overflow-hidden whitespace-nowrap text-heading before:content-[attr(data-scheme)]",
                  }),
                ],
              }),
          )
        : $[86],
      Ge = J3($, 87, He, Ue, We)
        ? K3(
            $,
            87,
            He,
            Ue,
            We,
            n("div", {
              className: "group/field relative h-full min-w-0 flex-1",
              children: [He, Ue, We],
            }),
          )
        : $[90],
      Ke = J3($, 91, pe, p, be)
        ? K3(
            $,
            91,
            pe,
            p,
            be,
            p &&
              t(u, {
                icon: "ArrowOutSquare",
                size: "sm",
                variant: "ghost",
                iconOnly: !0,
                tooltip: pe,
                tooltipSide: le,
                "aria-label": be,
                onClick: p,
                className: ce,
              }),
          )
        : $[94];
    return J4($, 95, Re, ze, Ge, Ke)
      ? K4(
          $,
          95,
          Re,
          ze,
          Ge,
          Ke,
          n("div", { className: ze, children: [Re, Ge, Ke] }),
        )
      : $[99];
  });
  function me(e, t) {
    if (t === "all") {
      e.value !== "" && (e.select(), (e.scrollLeft = 0));
      return;
    }
    e.setSelectionRange(t.start, t.end, t.dir);
  }
  return pe;
}
const displayPreviewURL = (() => {
  function Y(e) {
    let t = e.replace(/^https?:\/\//, "");
    if (t === e) return e;
    let n = /^([^/?#]+)\/$/.exec(t)?.[1];
    return n === void 0 ? t : pe(n.slice(n.lastIndexOf("@") + 1)) ? n : t;
  }
  function pe(e) {
    if (/\s/.test(e)) return !1;
    let t = e.split(/[/?#]/, 1)[0] ?? "";
    return (
      t.includes(".") ||
      /^localhost(:\d+)?$/i.test(t) ||
      t.startsWith("[") ||
      /^[^:]+:\d+$/.test(t) ||
      (t.length > 0 && e[t.length] === "/")
    );
  }
  return Y;
})();
export { displayPreviewURL };
