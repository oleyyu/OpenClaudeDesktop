// R4g-files FV1 (toolcards-05): the fence layout contexts and geometry of 2.42304.0
// ion-dist/assets/v1/c19e90103-muBq-gyt.js.
//   ph = g("wrap"), mh = g("row")                     the overflow and language-label contexts (defaults)
//   Bg: F = P==="text"; I = b(ph)==="scroll" && !F;  L = b(mh)==="beside-actions" && I
//       je = dg(1 + run + secrets); rt = I ? "0px" : je; it = !/[\r\n]/.test(N)  (N = text.trimEnd())
//       at = L ? `calc(${je} + ${Math.min(ee.length, pg) * .8 + 1.5}ch)` : null   (pg = 20)
//       ot = it && at !== null ? `calc(${at} - ${Tg})` : null   (Tg = "0.75rem", Sg's endInset)
//       st = it ? null : at;  xg paddingEnd = st ?? rt
//       ct = it && (!I || L) ? centred on the first line : "mt-1.25"
// Only the document typography of c3fde7009 (ya: Je value "scroll", Ye value "beside-actions") provides the
// non-default values; everything else keeps wrap + row.
import React from "react";

export const CodeBlockOverflowContext = React.createContext("wrap");
export const CodeBlockLabelContext = React.createContext("row");

// dg(e): one control per action with 3px between them, plus the rail's own inset. Locally the control height is the
// block's --scb-control (var(--cds-h-control, 24px)).
export const controlsReserve = (count) => `calc(var(--scb-control) * ${count} + 3px * ${count - 1} + var(--cds-pad-xs, 4px) * 3 + 2px)`;
// fg = dg(3): the language header's end padding (Sg gutter).
export const HEADER_GUTTER = controlsReserve(3);
// Tg: the label's leading fade width.
export const LABEL_FADE = "0.75rem";
const LABEL_CHARS = 20; // pg

/**
 * The fence geometry for a language, its text and its action count under the two contexts.
 * Returns {scroll, beside, singleLine, label, endInset, paddingEnd, centred}: scroll is I, beside is L, label the
 * trimmed language (ee), endInset Sg's endInset (ot, null when none), paddingEnd the pre's inline-end reserve
 * (st ?? rt) and centred whether the actions (and label) sit centred on the first line (ct).
 */
export function codeBlockLayout({ overflow = "wrap", labelPlacement = "row", language = "text", text = "", controls = 1 } = {}) {
  const label = String(language ?? "").trim();
  const plain = label.toLowerCase() === "text";
  const scroll = overflow === "scroll" && !plain;
  const beside = labelPlacement === "beside-actions" && scroll;
  const reserve = controlsReserve(controls);
  const singleLine = !/[\r\n]/.test(String(text ?? "").trimEnd());
  const besideReserve = beside ? `calc(${reserve} + ${Math.min(label.length, LABEL_CHARS) * 0.8 + 1.5}ch)` : null;
  const endInset = singleLine && besideReserve !== null ? `calc(${besideReserve} - ${LABEL_FADE})` : null;
  const lineEnd = singleLine ? null : besideReserve;
  return { scroll, beside, singleLine, label, endInset, paddingEnd: lineEnd ?? (scroll ? "0px" : reserve),
    centred: singleLine && (!scroll || beside) };
}
