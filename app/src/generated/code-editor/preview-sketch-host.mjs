// Original Preview sketch host (3.6556.2), mode switch, focus, export and toolbar composition.
import {
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged4 as J4,
  memoChanged5 as J5,
  memoSentinel as J8,
  reactMemoCache as J9,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore4 as K4,
  memoStore5 as K5,
  CdsDisabledReason as ae,
  asElementNode as ie,
  CdsButton as re,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import {
  useEffectEvent as a,
  memo as ee,
  useLayoutEffect as i,
  useState as ne,
  useEffect as o,
  useRef as t,
  useImperativeHandle as te,
} from "react";
import { clsx as e } from "../view-tabs/vendor-frame-CnSY1sxv.js";
import { jsx as n, jsxs as r } from "react/jsx-runtime";
import { ownerWindow as oe } from "../view-tabs/shared-25-DOWZRSlq.js";
const c = "data-escape-owner";
const pe = (() => {
  function u(e) {
    return { width: e.pixelWidth / e.dpr, height: e.pixelHeight / e.dpr };
  }
  return u;
})();
export function createPreviewSketchHost({
  usePlatform: se,
  isTextInput: de,
  isApplication: ue,
  popupSelector: l,
  hasOtherEscapeOwner: me,
  openPopupSelector: he,
  suppressContextMenu: s,
  releaseEscape: fe,
  useIntl: le,
  useErrors: ce,
  Toolbar: be,
  useSketch: ve,
  colors: ye,
  widths: ge,
  black: _e,
  Canvas: xe,
}) {
  var Se = "bottom-2.5",
    Ce = "--sketch-bar-reach",
    we = "--sketch-bar-drop",
    Te =
      "top-[calc(100%+var(--sketch-bar-drop,0px))] mt-2.5 -mx-[var(--sketch-bar-reach,0px)]",
    u = "h-[calc(var(--cds-h-control)+var(--cds-pad-xs)*2+1.25rem)]",
    Ee =
      "pb-[calc(var(--cds-pad-md)+var(--cds-h-control)+var(--cds-pad-xs)*2+1.25rem)] scroll-pb-[calc(var(--cds-pad-md)+var(--cds-h-control)+var(--cds-pad-xs)*2+1.25rem)]",
    De = "[data-sketch-tools] button:not(:disabled)",
    Oe = `${l},[${c}]`,
    ke = { [c]: "" };
  function Ae(e) {
    return e.isComposing || e.keyCode === 229;
  }
  function je(e) {
    return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  }
  function d(ee) {
    let $ = J9(129),
      {
        backdrop: s,
        onCancel: c,
        onAttach: l,
        scopeTokens: Ce,
        source: we,
        pageTool: u,
        barUnder: Ee,
        rescaleOnResize: De,
        attachHeld: d,
        focusHandoverRef: f,
        ref: Pe,
      } = ee,
      Fe = Ce !== void 0 && Ce,
      Ie = Ee !== void 0 && Ee,
      p = De !== void 0 && De,
      [m, Le] = ne(null),
      h = u?.picking ?? !1,
      g = u?.resting !== void 0,
      _ = h || g;
    _ && m !== null && Le(null);
    let v = _ ? void 0 : m ? m.backdrop : s,
      y = v?.src ?? null,
      b = J1($, 0, v)
        ? K1($, 0, v, v?.pixelWidth === void 0 ? null : pe(v))
        : $[1],
      x = b === null,
      S = t(null),
      C = t(null),
      w = J0($, 2)
        ? K0($, 2, () => {
            let e = oe(S.current);
            (e && fe(e), C.current?.requestClose());
          })
        : $[2],
      Re = J2($, 3, v, y)
        ? K2(
            $,
            3,
            v,
            y,
            y
              ? {
                  url: y,
                  host: "preview",
                  scale: v?.pixelWidth === void 0 ? void 0 : v.dpr,
                }
              : void 0,
          )
        : $[5],
      {
        canvasRef: T,
        redactEnabled: E,
        tool: D,
        setTool: O,
        color: k,
        redactStyle: A,
        handleRedactStyleChange: ze,
        redactionSelected: Be,
        handleSelectionChange: Ve,
        hasStrokes: j,
        canUndo: He,
        canRedo: Ue,
        handleHistoryChange: We,
        gestureActive: Ge,
        handleGestureActiveChange: Ke,
        handleUndo: qe,
        handleRedo: M,
        handleKeyDown: Je,
        undoShortcut: Ye,
        redoShortcut: Xe,
        handleClear: Ze,
        handleToolDone: Qe,
        handleColorChange: $e,
        strokeWidth: N,
        handleStrokeWidthChange: et,
        exportSketch: tt,
        cancel: P,
        textTargets: nt,
        handleTextTargetRedacted: rt,
        textRedactionCount: it,
      } = ve(w, we, Re);
    _ && D === "select" && O("pen");
    let at = J2($, 6, We, s)
        ? K2($, 6, We, s, (e) => {
            (We(e),
              e.count > 0 && s !== void 0 && Le((e) => e ?? { backdrop: s }));
          })
        : $[8],
      F = !_,
      I,
      L;
    (J2($, 9, F, j)
      ? ((I = () => ({
          hasMarks: () => F && j,
          requestClose: () => C.current?.requestClose(),
        })),
        (L = [F, j]),
        K3($, 9, F, j, I, L))
      : ((I = $[11]), (L = $[12])),
      te(Pe, I, L));
    let R, z;
    (J1($, 13, F)
      ? ((R = () => {
          let e = S.current;
          F &&
            e &&
            !e.contains(e.ownerDocument.activeElement) &&
            e.focus({ preventScroll: !0 });
        }),
        (z = [F]),
        K2($, 13, F, R, z))
      : ((R = $[14]), (z = $[15])),
      o(R, z));
    let ot = t(null),
      st = J2($, 16, u, g)
        ? K2($, 16, u, g, () => {
            !g ||
              u?.mayTakeFocus?.() === !1 ||
              queueMicrotask(() => {
                let e = S.current,
                  t = e?.ownerDocument.activeElement;
                e &&
                  (t === null || t === e.ownerDocument.body) &&
                  e
                    .querySelector("[data-resting] button:not(:disabled)")
                    ?.focus({ preventScroll: !0 });
              });
          })
        : $[18],
      ct = a(st),
      lt = J2($, 19, f, ct)
        ? K2(
            $,
            19,
            f,
            ct,
            () => (
              f.current && ct(),
              (f.current = !1),
              () => {
                let e = ot.current;
                f.current = e !== null && e === e.ownerDocument.activeElement;
              }
            ),
          )
        : $[21],
      ut = J1($, 22, f) ? K1($, 22, f, [f]) : $[23];
    i(lt, ut);
    let B, V;
    (J2($, 24, P, F)
      ? ((B = () => {
          F || P();
        }),
        (V = [F, P]),
        K3($, 24, P, F, B, V))
      : ((B = $[26]), (V = $[27])),
      o(B, V));
    let H, U;
    (J1($, 28, F)
      ? ((H = () => {
          let e = S.current,
            t = e?.ownerDocument;
          if (!e || !t || !F) return;
          let n = (n) => {
            if (n.key !== "Escape" || n.defaultPrevented || Ae(n) || je(n))
              return;
            let r = ie(n.target);
            if (
              r &&
              (e.contains(r) || de(r) || ue(r) || r.closest(Oe) !== null)
            )
              return;
            let i = e.closest("[data-pane-root]"),
              a =
                r === null ||
                r === t.body ||
                r === t.documentElement ||
                (i !== null && i.contains(r)),
              o = i ? me(i, e) : t.querySelector(he) !== null;
            !a ||
              o ||
              (n.preventDefault(), n.stopPropagation(), n.repeat || w());
          };
          return (
            t.addEventListener("keydown", n, !0),
            () => t.removeEventListener("keydown", n, !0)
          );
        }),
        (U = [w, F]),
        K2($, 28, F, H, U))
      : ((H = $[29]), (U = $[30])),
      o(H, U));
    let W = le(),
      G = ce(),
      K = J5($, 31, y, tt, W, l, it, G)
        ? K5($, 31, y, tt, W, l, it, G, async () => {
            let e = W.formatMessage({
                defaultMessage:
                  "Couldn\u2019t save your annotations. Try again.",
                id: "VRJcpQWzaV",
              }),
              t = !1,
              n;
            try {
              n = await tt(async (e) => {
                let n;
                return (
                  y
                    ? (n = await e.toComposite(y))
                    : ((n = e.toPNG("#ffffff")),
                      e.getStrokes().some(Me) && (n = e.toPNG(_e))),
                  (t = e.getStrokes().length > 0),
                  !t && y?.startsWith("data:image/png") ? y : n
                );
              });
            } catch (t) {
              let n = t;
              G?.addError(e, {
                error: n,
                messageForLogging: "Preview annotation composite failed",
              });
              return;
            }
            if (n !== null) {
              if (!n.startsWith("data:") || (t && n === y)) {
                G?.addError(e, {
                  messageForLogging: "Preview annotation composite fail-safe",
                });
                return;
              }
              l(n, { annotated: t, textRedactions: it() });
            }
          })
        : $[37],
      dt = J2($, 38, P, c)
        ? K2($, 38, P, c, () => {
            (P(), c());
          })
        : $[40],
      ft = u?.onDraw,
      pt = J2($, 41, ft, O)
        ? K2($, 41, ft, O, (e) => {
            (O(e), ft?.());
          })
        : $[43],
      mt = J1($, 44, u)
        ? K1(
            $,
            44,
            u,
            u?.label === void 0
              ? void 0
              : {
                  label: u.label,
                  detail: u.detail,
                  shortcut: u.shortcut,
                  pressed: u.picking,
                  onPress: u.onTogglePick,
                },
          )
        : $[45],
      q = J1($, 46, W)
        ? K1(
            $,
            46,
            W,
            W.formatMessage({
              defaultMessage: "Add to chat",
              id: "oBu4r1Zt46",
            }),
          )
        : $[47],
      J = !F || (!j && y === null),
      Y = J || d !== void 0,
      X = J4($, 48, d, W, J, h)
        ? K4(
            $,
            48,
            d,
            W,
            J,
            h,
            h
              ? W.formatMessage({
                  defaultMessage: "Click an element on the page to add it.",
                  id: "ORl9wEfAbK",
                })
              : J
                ? W.formatMessage({
                    defaultMessage: "Nothing to add yet",
                    id: "gW2ifrLbxu",
                  })
                : d,
          )
        : $[52],
      ht = J1($, 53, K) ? K1($, 53, K, () => void K()) : $[54],
      gt = J3($, 55, Y, q, ht)
        ? K3(
            $,
            55,
            Y,
            q,
            ht,
            n(re, {
              variant: "primary",
              disabled: Y,
              onClick: ht,
              children: q,
            }),
          )
        : $[58],
      _t = J1($, 59, K) ? K1($, 59, K, () => void K()) : $[60],
      vt = J3($, 61, Y, q, _t)
        ? K3(
            $,
            61,
            Y,
            q,
            _t,
            n(re, {
              variant: "primary",
              iconOnly: !0,
              icon: "Add",
              "aria-label": q,
              disabled: Y,
              onClick: _t,
            }),
          )
        : $[64],
      yt = se(),
      bt = F ? ke : void 0,
      Z,
      Q;
    $[65] === J8
      ? ((Z = (e) => {
          let t = ie(e.target);
          ot.current = t?.matches(":focus-visible") ? t : null;
        }),
        (Q = () => {
          ot.current = null;
        }),
        ($[65] = Z),
        ($[66] = Q))
      : ((Z = $[65]), (Q = $[66]));
    let xt = F ? Je : void 0,
      St = yt ? Ne : void 0,
      Ct = Fe && "epitaxy-root text-body text-primary break-words",
      wt = _ && "pointer-events-none",
      Tt = J2($, 67, Ct, wt)
        ? K2(
            $,
            67,
            Ct,
            wt,
            e("absolute inset-0 outline-none draggable-none", Ct, wt),
          )
        : $[69],
      Et = J1($, 70, v)
        ? K1(
            $,
            70,
            v,
            v === null &&
              n("div", { className: "absolute inset-0 bg-surface-3" }),
          )
        : $[71],
      Dt = J5($, 72, v, T, k, x, b, at, Ke, Ve, rt, Qe, A, p, N, nt, D)
        ? K5(
            $,
            72,
            v,
            T,
            k,
            x,
            b,
            at,
            Ke,
            Ve,
            rt,
            Qe,
            A,
            p,
            N,
            nt,
            D,
            v !== void 0 &&
              n("div", {
                className:
                  "absolute inset-0 flex items-start justify-center-safe overflow-clip",
                children: r("div", {
                  className: e("relative", b ? "shrink-0" : "h-full w-full"),
                  style: b ?? void 0,
                  children: [
                    v &&
                      n("img", {
                        src: v.src,
                        alt: "",
                        draggable: !1,
                        className: e(
                          "absolute inset-0 h-full w-full max-w-none select-none pointer-events-none",
                          x && "object-cover object-left-top",
                        ),
                      }),
                    n(xe, {
                      ref: T,
                      className: "absolute inset-0 h-full w-full",
                      tool: D,
                      color: k,
                      redactStyle: A,
                      textTargets: nt,
                      onTextTargetRedacted: rt,
                      onSelectionChange: Ve,
                      backdropCover: x,
                      rescaleOnResize: p,
                      strokeWidth: N,
                      onHistoryChange: at,
                      onToolDone: Qe,
                      onGestureActiveChange: Ke,
                    }),
                  ],
                }),
              }),
          )
        : $[87],
      Ot = Ie ? Te : Se,
      kt = F ? D : "select",
      At = F ? O : pt,
      jt = _ && u?.canDraw === !1,
      Mt = u?.resting,
      Nt = F && j,
      Pt = F && He,
      Ft = F && Ue,
      It = F && Ge,
      Lt = J2($, 88, gt, X)
        ? K2($, 88, gt, X, n(ae, { hoverable: !1, reason: X, children: gt }))
        : $[90],
      Rt = J2($, 91, vt, X)
        ? K2($, 91, vt, X, n(ae, { hoverable: !1, reason: X, children: vt }))
        : $[93],
      zt = J5(
        $,
        94,
        k,
        Ze,
        dt,
        $e,
        ze,
        M,
        et,
        qe,
        mt,
        E,
        A,
        Be,
        Xe,
        N,
        Ot,
        kt,
        At,
        jt,
        Mt,
        Nt,
        Pt,
        Ft,
        It,
        Lt,
        Rt,
        Ye,
      )
        ? K5(
            $,
            94,
            k,
            Ze,
            dt,
            $e,
            ze,
            M,
            et,
            qe,
            mt,
            E,
            A,
            Be,
            Xe,
            N,
            Ot,
            kt,
            At,
            jt,
            Mt,
            Nt,
            Pt,
            Ft,
            It,
            Lt,
            Rt,
            Ye,
            n(be, {
              className: Ot,
              tool: kt,
              onToolChange: At,
              leadingTool: mt,
              toolsDisabled: jt,
              resting: Mt,
              colors: ye,
              color: k,
              onColorChange: $e,
              widths: ge,
              strokeWidth: N,
              onStrokeWidthChange: et,
              redactEnabled: E,
              redactStyle: A,
              onRedactStyleChange: ze,
              redactionSelected: Be,
              hasStrokes: Nt,
              canUndo: Pt,
              canRedo: Ft,
              onUndo: qe,
              onRedo: M,
              undoShortcut: Ye,
              redoShortcut: Xe,
              onClear: Ze,
              onClose: dt,
              handleRef: C,
              concealed: It,
              positiveAction: Lt,
              positiveActionIconOnly: Rt,
            }),
          )
        : $[120];
    return J5($, 121, bt, xt, St, Tt, Et, Dt, zt)
      ? K5(
          $,
          121,
          bt,
          xt,
          St,
          Tt,
          Et,
          Dt,
          zt,
          r("div", {
            ref: S,
            ...bt,
            tabIndex: -1,
            onFocus: Z,
            onBlur: Q,
            onKeyDown: xt,
            onContextMenu: St,
            className: Tt,
            children: [Et, Dt, zt],
          }),
        )
      : $[128];
  }
  function Me(e) {
    return e.kind !== "redact" && e.color === "#FFFFFF";
  }
  function Ne(e) {
    s(e, e.currentTarget) && e.preventDefault();
  }
  function f(e) {
    let $ = J9(6),
      r,
      i;
    J1($, 0, e)
      ? (({ layerKey: i, ...r } = e), K2($, 0, e, r, i))
      : ((r = $[1]), (i = $[2]));
    let a = t(!1);
    return J2($, 3, r, i)
      ? K2($, 3, r, i, n(d, { ...r, focusHandoverRef: a }, i))
      : $[5];
  }
  var Pe = ee(f);
  return Pe;
}
