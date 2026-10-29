// Original user list renderer and line-break presentation.
import { jsx as f, jsxs as _ } from "react/jsx-runtime";
import { jsxs as d, jsx as s } from "react/jsx-runtime";
import { Fragment as p } from "react";
var e = "[unicode-bidi:plaintext]";
const yf = e;
function eP(e, t = 1 / 0) {
  let n = 0;
  for (let r of e) {
    if (n++ >= t) break;
    let e = r.codePointAt(0) ?? 0;
    if (tP(e)) return "rtl";
    if (nP(e)) return "ltr";
  }
}
function tP(e) {
  return (
    (e >= 1425 && e <= 2047) ||
    (e >= 2048 && e <= 2303) ||
    e === 8207 ||
    e === 8235 ||
    e === 8238 ||
    (e >= 64285 && e <= 64829) ||
    (e >= 64848 && e <= 65021) ||
    (e >= 65136 && e <= 65276) ||
    (e >= 67584 && e <= 69631) ||
    (e >= 124928 && e <= 126975)
  );
}
function nP(e) {
  return (
    (e >= 65 && e <= 90) ||
    (e >= 97 && e <= 122) ||
    (e >= 192 && e <= 696 && e !== 215 && e !== 247) ||
    (e >= 880 && e <= 1417) ||
    (e >= 2304 && e <= 8191) ||
    (e >= 11264 && e <= 11775) ||
    (e >= 12352 &&
      e <= 12735 &&
      e !== 12443 &&
      e !== 12444 &&
      e !== 12448 &&
      e !== 12539) ||
    (e >= 12784 && e <= 12799) ||
    (e >= 13312 && e <= 19903) ||
    (e >= 19968 && e <= 42127) ||
    (e >= 42192 && e <= 55295) ||
    (e >= 57344 && e <= 64284) ||
    (e >= 65313 && e <= 65338) ||
    (e >= 65345 && e <= 65370) ||
    (e >= 65382 && e <= 65500) ||
    e === 8206
  );
}
const Vs = eP;
var Ym = "data-cds-fizzy-lake";
function Xm(e, t) {
  let n = new Set(e?.split(" "));
  return t.filter((e) => n.has(e)).sort();
}
var Qm = [];
var $m;
function eh() {
  return (
    ($m ??= {
      parts:
        typeof document > "u"
          ? []
          : Xm(document.documentElement.getAttribute(Ym), Qm),
    }),
    $m
  );
}
function th(e) {
  return eh().parts.includes(e);
}
const $r = th;
function hP(e) {
  return $r("type") ? e.replace("text-body", "text-prose") : e;
}
function gP() {
  return hP(
    "text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty",
  );
}
var _P = /[\u202A-\u202E\u2066-\u2069]/g;
var vP = /^(?:\s*(?:(?:https?:\/\/|www\.)\S*|[@/]\S*))+/i;
function yP(e) {
  return e.replace(_P, "").replace(vP, "");
}
function bP(e) {
  return Vs(yP(e), 80) ?? Vs(e.replace(_P, ""), 80);
}
function xP(e, t, n) {
  let r = e.items.map((e, n) =>
      _(
        "li",
        { children: [t(e.text), e.children.map((e, n) => xP(e, t, n))] },
        n,
      ),
    ),
    i = bP(e.items[0]?.text ?? "");
  return e.ordered
    ? f(
        "ol",
        {
          dir: i,
          start: e.start === 1 ? void 0 : e.start,
          className: `epitaxy-user-list ${gP()}`,
          children: r,
        },
        n,
      )
    : f(
        "ul",
        { dir: i, className: `epitaxy-user-list ${gP()}`, children: r },
        n,
      );
}
function SP(e, t, n) {
  if (e.kind === "list") return xP(e.list, n, t);
  let r =
    e.text === "" ||
    e.text.endsWith(`
`)
      ? `${e.text}\n`
      : e.text;
  return f("p", { className: `${gP()} ${yf}`, children: n(r) }, t);
}
function Ns(e, t = (e) => e) {
  let n = e.split(/\r\n?|\n/);
  return n.length === 1
    ? t(e)
    : n.map((e, n) => d(p, { children: [n > 0 && s("br", {}), t(e)] }, n));
}
export { SP as renderSideChatUserSegment, Ns as sideChatTextBreaks };
