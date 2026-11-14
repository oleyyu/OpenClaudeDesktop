// Original state, history commands, width/color memory and export generation (3.6556.2). OCR is a host capability.
import {
  memoStoreValueFirst3 as I3,
  memoStoreValueFirst5 as I5,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged3 as J3,
  memoChanged5 as J5,
  reactMemoCache as J9,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStoreDeps1 as Z1,
  memoStoreDeps5 as Z5,
  asElementNode as ee,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { useState as d, useRef as r } from "react";
const ae = (() => {
  function qC(e) {
    switch (e) {
      case "userFile":
      case "remoteExternal":
        return !0;
      case "workspaceFile":
      case "browser":
      case "legacyPreview":
      case "remoteBrowser":
      case "simulator":
      case "elementScreenshot":
      case "projectFile":
      case "unknown":
        return !1;
    }
  }
  return qC;
})();
export function createPreviewSketchState({
  usePlatform: ie,
  useTextTargets: F,
  useGate: y,
  isTextInput: ce,
  matchCommand: oe,
  shortcut: S,
}) {
  var I = ["#E03131", "#1971C2", "#2F9E44", "#1F1E1D", "#FFFFFF"],
    L = "#1F1E1D",
    Pe = "#FFFFFF",
    Fe = [2, 4, 8, 12],
    R = I[0],
    Ie = 4,
    Le = [
      "sketchUndo",
      "sketchRedo",
      "sketchDeleteSelection",
      "sketchDeselect",
    ],
    Re = { count: 0, canUndo: !1, canRedo: !1 };
  function z(e, t, n) {
    let $ = J9(40),
      i = ie(),
      a = r(null),
      [o, s] = d("pen"),
      c = J1($, 0, t) ? K1($, 0, t, ae(t)) : $[1],
      l = !c && o === "redact" ? "pen" : o,
      [u, f] = d(B),
      [p, m] = d(ze),
      [h, g] = d("solid"),
      [te, _] = d(null),
      [v, ne] = d(Re),
      [re, b] = d(!1),
      x = r(0),
      {
        textTargets: C,
        handleTextTargetRedacted: w,
        textRedactionCount: se,
        resetTextRedactionCount: le,
      } = F(y("__gb__2978899829") ? void 0 : n, l === "redact"),
      T = J0($, 2)
        ? K0($, 2, () => {
            a.current?.undo();
          })
        : $[2],
      ue = J0($, 3)
        ? K0($, 3, () => {
            a.current?.redo();
          })
        : $[3],
      E =
        J1($, 4, v.canRedo) || J3($, 5, v.canUndo, i, e)
          ? I3(
              $,
              5,
              Z1(
                $,
                4,
                (t) => {
                  let n = ee(t.target);
                  if (t.defaultPrevented || !n || ce(n)) return;
                  let r = oe(t, { isClaudeApp: i, commands: Le }),
                    o = t.currentTarget,
                    s = n.closest(
                      '[role="dialog"], [role="alertdialog"], [role="menu"]',
                    ),
                    c =
                      !o.contains(n) ||
                      (s !== null && s !== o && o.contains(s));
                  if (r === null) {
                    e &&
                      t.key === "Escape" &&
                      !c &&
                      !t.nativeEvent.isComposing &&
                      t.keyCode !== 229 &&
                      (t.preventDefault(), t.stopPropagation());
                    return;
                  }
                  if (r === "sketchDeleteSelection" || r === "sketchDeselect") {
                    if (c) return;
                    (
                      r === "sketchDeleteSelection"
                        ? a.current?.deleteSelection()
                        : a.current?.clearSelection()
                    )
                      ? (t.preventDefault(),
                        t.stopPropagation(),
                        t.preventBaseUIHandler?.(),
                        t.nativeEvent.stopImmediatePropagation())
                      : r === "sketchDeselect" &&
                        e &&
                        (t.preventDefault(),
                        t.stopPropagation(),
                        t.repeat || e());
                    return;
                  }
                  (t.preventDefault(),
                    t.stopPropagation(),
                    !c &&
                      (r === "sketchUndo" && v.canUndo
                        ? a.current?.undo()
                        : r === "sketchRedo" &&
                          v.canRedo &&
                          a.current?.redo()));
                },
                v.canRedo,
              ),
              v.canUndo,
              i,
              e,
            )
          : $[8],
      D = J0($, 9)
        ? K0($, 9, () => {
            a.current?.clear();
          })
        : $[9],
      de = J0($, 10)
        ? K0($, 10, () => {
            s("select");
          })
        : $[10],
      fe = J0($, 11)
        ? K0($, 11, (e) => {
            ((R = e), f(e), a.current?.recolorSelection(e));
          })
        : $[11],
      O = J0($, 12)
        ? K0($, 12, (e) => {
            ((Ie = e), m(e), a.current?.resizeSelection(e));
          })
        : $[12],
      k = J0($, 13)
        ? K0($, 13, (e) => {
            (g(e), a.current?.restyleSelection(e));
          })
        : $[13],
      A = J0($, 14)
        ? K0($, 14, (e) => {
            (_(e?.kind ?? null),
              e?.kind === "redact" && g(e.redactStyle ?? "solid"));
          })
        : $[14],
      pe = J0($, 15)
        ? K0($, 15, async (e) => {
            let t = a.current;
            if (!t) return null;
            let n = (x.current += 1),
              r = await e(t);
            return x.current === n ? r : null;
          })
        : $[15],
      me = J1($, 16, le)
        ? K1($, 16, le, () => {
            ((x.current += 1), le());
          })
        : $[17],
      he = te === "redact" && l === "select",
      ge = v.count > 0,
      _e = v.canUndo,
      ve = v.canRedo,
      ye = J1($, 18, i) ? K1($, 18, i, S("sketchUndo", i)) : $[19],
      be = J1($, 20, i) ? K1($, 20, i, S("sketchRedo", i)) : $[21];
    return J5($, 22, me, u, re, E, w) ||
      J1($, 27, v.canRedo) ||
      J5($, 28, v.canUndo, c, h, p, he, ge, ye, be, se, C, l)
      ? I5(
          $,
          28,
          Z1(
            $,
            27,
            Z5(
              $,
              22,
              {
                canvasRef: a,
                redactEnabled: c,
                textTargets: C,
                handleTextTargetRedacted: w,
                textRedactionCount: se,
                tool: l,
                setTool: s,
                color: u,
                strokeWidth: p,
                handleStrokeWidthChange: O,
                redactStyle: h,
                handleRedactStyleChange: k,
                redactionSelected: he,
                handleSelectionChange: A,
                hasStrokes: ge,
                canUndo: _e,
                canRedo: ve,
                handleHistoryChange: ne,
                gestureActive: re,
                handleGestureActiveChange: b,
                handleUndo: T,
                handleRedo: ue,
                handleKeyDown: E,
                undoShortcut: ye,
                redoShortcut: be,
                handleClear: D,
                handleToolDone: de,
                handleColorChange: fe,
                exportSketch: pe,
                cancel: me,
              },
              me,
              u,
              re,
              E,
              w,
            ),
            v.canRedo,
          ),
          v.canUndo,
          c,
          h,
          p,
          he,
          ge,
          ye,
          be,
          se,
          C,
          l,
        )
      : $[39];
  }
  function ze() {
    return Ie;
  }
  function B() {
    return R;
  }
  return { useSketch: z, colors: I, widths: Fe, black: L };
}
