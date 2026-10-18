// Original state, history commands and export generation gate (2.42304.0). OCR is a host capability.
import { useState as r, useRef as a, useCallback as d } from "react";
export function createPreviewSketchState({
  usePlatform: g,
  useRedaction: ee,
  skipTextDetection: _,
  useTextTargets: Jt,
  asElement: le,
  isTextInput: v,
  matchCommand: y,
  shortcut: te,
}) {
  var Yt = ["#E03131", "#1971C2", "#2F9E44", "#1F1E1D", "#FFFFFF"];
  var Xt = "#1F1E1D";
  var Zt = "#FFFFFF";
  var Qt = Yt[0];
  var $t = [
    "sketchUndo",
    "sketchRedo",
    "sketchDeleteSelection",
    "sketchDeselect",
  ];
  var en = { count: 0, canUndo: !1, canRedo: !1 };
  function tn(e, t, n) {
    let i = g(),
      o = a(null),
      [s, c] = r("pen"),
      l = ee(t),
      u = !l && s === "redact" ? "pen" : s,
      [f, p] = r(() => Qt),
      [m, h] = r("solid"),
      [ne, re] = r(null),
      [b, ie] = r(en),
      [ae, oe] = r(!1),
      x = a(0),
      {
        textTargets: se,
        handleTextTargetRedacted: S,
        textRedactionCount: ce,
        resetTextRedactionCount: C,
      } = Jt(_("__gb__2978899829") ? void 0 : n, u === "redact"),
      w = d(() => {
        o.current?.undo();
      }, []),
      T = d(() => {
        o.current?.redo();
      }, []),
      ue = d(
        (t) => {
          let n = le(t.target);
          if (t.defaultPrevented || !n || v(n)) return;
          let r = y(t, { isClaudeApp: i, commands: $t }),
            a = t.currentTarget,
            s = n.closest(
              '[role="dialog"], [role="alertdialog"], [role="menu"]',
            ),
            c = !a.contains(n) || (s !== null && s !== a && a.contains(s));
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
                ? o.current?.deleteSelection()
                : o.current?.clearSelection()
            )
              ? (t.preventDefault(),
                t.stopPropagation(),
                t.preventBaseUIHandler?.(),
                t.nativeEvent.stopImmediatePropagation())
              : r === "sketchDeselect" &&
                e &&
                (t.preventDefault(), t.stopPropagation(), t.repeat || e());
            return;
          }
          (t.preventDefault(),
            t.stopPropagation(),
            !c &&
              (r === "sketchUndo" && b.canUndo
                ? o.current?.undo()
                : r === "sketchRedo" && b.canRedo && o.current?.redo()));
        },
        [i, b.canUndo, b.canRedo, e],
      ),
      de = d(() => {
        o.current?.clear();
      }, []),
      fe = d(() => {
        c("select");
      }, []),
      pe = d((e) => {
        ((Qt = e), p(e), o.current?.recolorSelection(e));
      }, []),
      me = d((e) => {
        (h(e), o.current?.restyleSelection(e));
      }, []),
      he = d((e) => {
        (re(e?.kind ?? null),
          e?.kind === "redact" && h(e.redactStyle ?? "solid"));
      }, []),
      ge = d(async (e) => {
        let t = o.current;
        if (!t) return null;
        let n = ++x.current,
          r = await e(t);
        return x.current === n ? r : null;
      }, []),
      _e = d(() => {
        (x.current++, C());
      }, [C]);
    return {
      canvasRef: o,
      redactEnabled: l,
      textTargets: se,
      handleTextTargetRedacted: S,
      textRedactionCount: ce,
      tool: u,
      setTool: c,
      color: f,
      redactStyle: m,
      handleRedactStyleChange: me,
      redactionSelected: ne === "redact" && u === "select",
      handleSelectionChange: he,
      hasStrokes: b.count > 0,
      canUndo: b.canUndo,
      canRedo: b.canRedo,
      handleHistoryChange: ie,
      gestureActive: ae,
      handleGestureActiveChange: oe,
      handleUndo: w,
      handleRedo: T,
      handleKeyDown: ue,
      undoShortcut: te("sketchUndo", i),
      redoShortcut: te("sketchRedo", i),
      handleClear: de,
      handleToolDone: fe,
      handleColorChange: pe,
      exportSketch: ge,
      cancel: _e,
    };
  }
  return tn;
}
