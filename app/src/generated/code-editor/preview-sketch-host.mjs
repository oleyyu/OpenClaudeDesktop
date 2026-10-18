// Original Preview sketch host (2.42304.0), mode switch, focus, export and toolbar composition.
import {
  useState as e,
  useImperativeHandle as i,
  useEffect as o,
  useEffectEvent as a,
  useLayoutEffect as te,
  useRef as n,
  useCallback as c,
  useMemo as ee,
  memo as s,
} from "react";
import { jsx as r, jsxs as t } from "react/jsx-runtime";
export function createPreviewSketchHost({
  usePlatform: re,
  isTextInput: ae,
  isApplication: ie,
  popupSelector: d,
  hasOtherEscapeOwner: le,
  openPopupSelector: ue,
  asElement: h,
  ownerWindow: ne,
  suppressContextMenu: f,
  releaseEscape: oe,
  DisabledReasonTooltip: p,
  Button: m,
  useIntl: ce,
  useErrors: se,
  Toolbar: de,
  useSketch: fe,
  colors: pe,
  Canvas: me,
}) {
  const l = (...parts) => parts.filter(Boolean).join(" "),
    u = "data-escape-owner",
    he = "#1F1E1D";
  const ge = (() => {
    function u(e) {
      return { width: e.pixelWidth / e.dpr, height: e.pixelHeight / e.dpr };
    }
    return u;
  })();
  var _e = "bottom-2.5",
    g = "--sketch-bar-reach",
    _ = "--sketch-bar-drop",
    ve =
      "top-[calc(100%+var(--sketch-bar-drop,0px))] mt-2.5 -mx-[var(--sketch-bar-reach,0px)]",
    v = "h-[calc(var(--cds-h-control)+var(--cds-pad-xs)*2+1.25rem)]",
    y = "pb-[calc(var(--cds-h-control)+var(--cds-pad-xs)*2+1.25rem)]",
    b = "[data-sketch-tools] button:not(:disabled)",
    ye = `${d},[${u}]`,
    be = { [u]: "" };
  function xe(e) {
    return e.isComposing || e.keyCode === 229;
  }
  function Se(e) {
    return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  }
  function x({
    backdrop: s,
    onCancel: u,
    onAttach: d,
    scopeTokens: f = !1,
    source: g,
    pageTool: _,
    barUnder: v = !1,
    rescaleOnResize: y = !1,
    attachHeld: b,
    focusHandoverRef: x,
    ref: S,
  }) {
    let [C, w] = e(null),
      T = _?.picking ?? !1,
      E = _?.resting !== void 0,
      D = T || E;
    D && C !== null && w(null);
    let O = D ? void 0 : C ? C.backdrop : s,
      k = O?.src ?? null,
      A = O?.pixelWidth === void 0 ? null : ge(O),
      j = A === null,
      M = n(null),
      N = n(null),
      P = c(() => {
        let e = ne(M.current);
        (e && oe(e), N.current?.requestClose());
      }, []),
      {
        canvasRef: we,
        redactEnabled: Te,
        tool: F,
        setTool: I,
        color: L,
        redactStyle: R,
        handleRedactStyleChange: Ee,
        redactionSelected: De,
        handleSelectionChange: Oe,
        hasStrokes: z,
        canUndo: ke,
        canRedo: Ae,
        handleHistoryChange: B,
        gestureActive: je,
        handleGestureActiveChange: Me,
        handleUndo: Ne,
        handleRedo: Pe,
        handleKeyDown: Fe,
        undoShortcut: Ie,
        redoShortcut: Le,
        handleClear: Re,
        handleToolDone: ze,
        handleColorChange: Be,
        exportSketch: V,
        cancel: H,
        textTargets: Ve,
        handleTextTargetRedacted: He,
        textRedactionCount: U,
      } = fe(
        P,
        g,
        k
          ? {
              url: k,
              host: "preview",
              scale: O?.pixelWidth === void 0 ? void 0 : O.dpr,
            }
          : void 0,
      );
    D && F === "select" && I("pen");
    let Ue = c(
        (e) => {
          (B(e), e.count > 0 && s !== void 0 && w((e) => e ?? { backdrop: s }));
        },
        [B, s],
      ),
      W = !D;
    (i(
      S,
      () => ({
        hasMarks: () => W && z,
        requestClose: () => N.current?.requestClose(),
      }),
      [W, z],
    ),
      o(() => {
        let e = M.current;
        W &&
          e &&
          !e.contains(e.ownerDocument.activeElement) &&
          e.focus({ preventScroll: !0 });
      }, [W]));
    let G = n(null),
      We = a(() => {
        !E ||
          _?.mayTakeFocus?.() === !1 ||
          queueMicrotask(() => {
            let e = M.current,
              t = e?.ownerDocument.activeElement;
            e &&
              (t === null || t === e.ownerDocument.body) &&
              e
                .querySelector("[data-resting] button:not(:disabled)")
                ?.focus({ preventScroll: !0 });
          });
      });
    (te(
      () => (
        x.current && We(),
        (x.current = !1),
        () => {
          let e = G.current;
          x.current = e !== null && e === e.ownerDocument.activeElement;
        }
      ),
      [x],
    ),
      o(() => {
        W || H();
      }, [W, H]),
      o(() => {
        let e = M.current,
          t = e?.ownerDocument;
        if (!e || !t || !W) return;
        let n = (n) => {
          if (n.key !== "Escape" || n.defaultPrevented || xe(n) || Se(n))
            return;
          let r = h(n.target);
          if (r && (e.contains(r) || ae(r) || ie(r) || r.closest(ye) !== null))
            return;
          let i = e.closest("[data-pane-root]"),
            ee =
              r === null ||
              r === t.body ||
              r === t.documentElement ||
              (i !== null && i.contains(r)),
            a = i ? le(i, e) : t.querySelector(ue) !== null;
          !ee ||
            a ||
            (n.preventDefault(), n.stopPropagation(), n.repeat || P());
        };
        return (
          t.addEventListener("keydown", n, !0),
          () => t.removeEventListener("keydown", n, !0)
        );
      }, [P, W]));
    let K = ce(),
      q = se(),
      J = c(async () => {
        let e = K.formatMessage({
            defaultMessage: "Couldn\u2019t save your annotations. Try again.",
            id: "VRJcpQWzaV",
          }),
          t = !1,
          n;
        try {
          n = await V(async (e) => {
            let n;
            return (
              k
                ? (n = await e.toComposite(k))
                : ((n = e.toPNG("#ffffff")),
                  e
                    .getStrokes()
                    .some(
                      (e) => e.kind !== "redact" && e.color === "#FFFFFF",
                    ) && (n = e.toPNG(he))),
              (t = e.getStrokes().length > 0),
              !t && k?.startsWith("data:image/png") ? k : n
            );
          });
        } catch (t) {
          q?.addError(e, {
            error: t,
            messageForLogging: "Preview annotation composite failed",
          });
          return;
        }
        if (n !== null) {
          if (!n.startsWith("data:") || (t && n === k)) {
            q?.addError(e, {
              messageForLogging: "Preview annotation composite fail-safe",
            });
            return;
          }
          d(n, { annotated: t, textRedactions: U() });
        }
      }, [k, d, V, q, K, U]),
      Ge = c(() => {
        (H(), u());
      }, [H, u]),
      Y = _?.onDraw,
      Ke = c(
        (e) => {
          (I(e), Y?.());
        },
        [I, Y],
      ),
      qe = ee(
        () =>
          _?.label === void 0
            ? void 0
            : {
                label: _.label,
                detail: _.detail,
                shortcut: _.shortcut,
                pressed: _.picking,
                onPress: _.onTogglePick,
              },
        [_],
      ),
      X = K.formatMessage({ defaultMessage: "Add to chat", id: "oBu4r1Zt46" }),
      Z = !W || (!z && k === null),
      Je = Z || b !== void 0,
      Q = T
        ? K.formatMessage({
            defaultMessage: "Click an element on the page to add it.",
            id: "ORl9wEfAbK",
          })
        : Z
          ? K.formatMessage({
              defaultMessage: "Nothing to add yet",
              id: "gW2ifrLbxu",
            })
          : b,
      Ye = r(m, {
        variant: "primary",
        disabled: Je,
        onClick: () => void J(),
        children: X,
      }),
      Xe = r(m, {
        variant: "primary",
        iconOnly: !0,
        icon: "Add",
        "aria-label": X,
        disabled: Je,
        onClick: () => void J(),
      }),
      Ze = re();
    return t("div", {
      ref: M,
      ...(W ? be : void 0),
      tabIndex: -1,
      onFocus: (e) => {
        let t = h(e.target);
        G.current = t?.matches(":focus-visible") ? t : null;
      },
      onBlur: () => {
        G.current = null;
      },
      onKeyDown: W ? Fe : void 0,
      onContextMenu: Ze ? Ce : void 0,
      className: l(
        "absolute inset-0 outline-none draggable-none",
        f && "epitaxy-root text-body text-primary break-words",
        D && "pointer-events-none",
      ),
      children: [
        O === null && r("div", { className: "absolute inset-0 bg-surface-3" }),
        O !== void 0 &&
          r("div", {
            className:
              "absolute inset-0 flex items-start justify-center-safe overflow-clip",
            children: t("div", {
              className: l("relative", A ? "shrink-0" : "h-full w-full"),
              style: A ?? void 0,
              children: [
                O &&
                  r("img", {
                    src: O.src,
                    alt: "",
                    draggable: !1,
                    className: l(
                      "absolute inset-0 h-full w-full max-w-none select-none pointer-events-none",
                      j && "object-cover object-left-top",
                    ),
                  }),
                r(me, {
                  ref: we,
                  className: "absolute inset-0 h-full w-full",
                  tool: F,
                  color: L,
                  redactStyle: R,
                  textTargets: Ve,
                  onTextTargetRedacted: He,
                  onSelectionChange: Oe,
                  backdropCover: j,
                  rescaleOnResize: y,
                  strokeWidth: 4,
                  onHistoryChange: Ue,
                  onToolDone: ze,
                  onGestureActiveChange: Me,
                }),
              ],
            }),
          }),
        r(de, {
          className: v ? ve : _e,
          tool: W ? F : "select",
          onToolChange: W ? I : Ke,
          leadingTool: qe,
          toolsDisabled: D && _?.canDraw === !1,
          resting: _?.resting,
          colors: pe,
          color: L,
          onColorChange: Be,
          redactEnabled: Te,
          redactStyle: R,
          onRedactStyleChange: Ee,
          redactionSelected: De,
          hasStrokes: W && z,
          canUndo: W && ke,
          canRedo: W && Ae,
          onUndo: Ne,
          onRedo: Pe,
          undoShortcut: Ie,
          redoShortcut: Le,
          onClear: Re,
          onClose: Ge,
          handleRef: N,
          concealed: W && je,
          positiveAction: r(p, { hoverable: !1, reason: Q, children: Ye }),
          positiveActionIconOnly: r(p, {
            hoverable: !1,
            reason: Q,
            children: Xe,
          }),
        }),
      ],
    });
  }
  function Ce(e) {
    f(e, e.currentTarget) && e.preventDefault();
  }
  function S({ layerKey: e, ...t }) {
    let i = n(!1);
    return r(x, { ...t, focusHandoverRef: i }, e);
  }
  var C = s(S);
  return C;
}
