// Original 3.6556.2 search engine (cc3bc2027-CqmDBxcX); desktop-wide dependencies reduced to their exact pure bindings.
const cn = [
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201C", '"'],
  ["\u201D", '"'],
];
const xs = /[\u0130\u03a3\ud800-\udfff]/;
const Ss = /[^\u0130\u03a3\ud800-\udfff]+/y;
function Cs(e) {
  let t = e;
  for (let [e, n] of cn) t = t.replaceAll(e, n);
  return t;
}
function ws(e) {
  let t = "",
    n = 0,
    r = e.search(xs);
  for (; r !== -1 && r < e.length; ) {
    let i = e.charCodeAt(r),
      a = r + 1;
    if (i === 304 || i === 931) t += e.slice(n, r).toLowerCase() + Ns(e[r]);
    else {
      for (; a < e.length && (e.charCodeAt(a) & 63488) == 55296; ) a++;
      t += e.slice(n, r).toLowerCase() + e.slice(r, a);
    }
    ((n = a), (Ss.lastIndex = a), (r = Ss.test(e) ? Ss.lastIndex : a));
  }
  let i = n === 0 ? e.toLowerCase() : t + e.slice(n).toLowerCase();
  return Cs(i.length === e.length ? i : Ps(e));
}
function Ns(e) {
  let t = e.toLowerCase();
  return t.length === 1 ? t : e;
}
function Ps(e) {
  let t = "";
  for (let n = 0; n < e.length; n++) t += Ns(e[n]);
  return t;
}
function qx(e) {
  return e.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
const e = qx,
  t = ws;
var n = {
  padBlock: "8px",
  linePadStart: "4px",
  linePadEnd: "12px",
  numberPadStart: "18px",
  foldColumnWidth: "12px",
};
function r(e) {
  return e
    ? { minWidth: "2rem", padEnd: "0px" }
    : { minWidth: "2.5rem", padEnd: "8px" };
}
function i(e, t) {
  let { minWidth: i, padEnd: a } = r(e),
    o = e ? n.foldColumnWidth : a;
  return `:host{--diffs-gap-block:${n.padBlock};--diffs-gap-style:none}[data-column-number]{padding-left:${n.numberPadStart};padding-right:${o}}[data-line-number-content]{min-width:max(calc(${i} - ${n.numberPadStart} - ${a}),${t}ch)}[data-line],[data-no-newline]{padding-left:${n.linePadStart};padding-right:${n.linePadEnd}}[data-overflow="wrap"] [data-line]{white-space:break-spaces;overflow-wrap:anywhere}`;
}
var a = 1e6;
function o(e, n) {
  let r = t(n);
  if (
    r.length === 0 ||
    r.includes(`
`)
  )
    return [];
  let i = [],
    a = 1,
    o = e.indexOf(`
`),
    s = e.indexOf(r);
  for (; s !== -1 && i.length < 1e6; ) {
    for (; o !== -1 && o < s; )
      (a++,
        (o = e.indexOf(
          `
`,
          o + 1,
        )));
    (i.push(a), (s = e.indexOf(r, s + r.length)));
  }
  return i;
}
var s = { matchCase: !1, wholeWord: !1, regexp: !1 },
  c = 1e3,
  l = 250;
function u(e, t) {
  return e.isRegExp === !0 && t > c;
}
function d(e, t = () => performance.now()) {
  if (e.isRegExp !== !0) return () => !1;
  let n = t() + l;
  return () => t() >= n;
}
var f = "[\\p{L}\\p{N}_]",
  p = `(?<!${f}\\p{M}*)`,
  m = `(?!${f}|\\p{M})`,
  h = RegExp(`^${f}`, "u"),
  g = RegExp(`${f}\\p{M}*$`, "u");
function _(e, t) {
  return (n) => {
    let r = t(n),
      i = [],
      a = r.indexOf(e);
    for (; a !== -1; )
      (i.push([a, a + e.length]), (a = r.indexOf(e, a + e.length)));
    return i;
  };
}
function v(t, n) {
  let r = n.matchCase ? "gu" : "giu",
    i = n.regexp ? t : e(t);
  try {
    new RegExp(i, r);
  } catch {
    return null;
  }
  if (n.wholeWord) {
    let e = n.regexp || h.test(t) ? p : "",
      r = n.regexp || g.test(t) ? m : "";
    i = `${e}(?:${i})${r}`;
  }
  return new RegExp(i, r);
}
function y(e, n) {
  if (
    e.length === 0 ||
    (!n.regexp &&
      e.includes(`
`))
  )
    return null;
  if (!n.regexp && !n.wholeWord)
    return n.matchCase ? _(e, (e) => e) : _(t(e), t);
  let r = v(e, n);
  if (r === null) return null;
  let i = (e) => {
    let t = [];
    if (u(i, e.length)) return t;
    r.lastIndex = 0;
    for (let n = r.exec(e); n !== null; n = r.exec(e))
      n[0].length === 0
        ? (r.lastIndex += (e.codePointAt(n.index) ?? 0) > 65535 ? 2 : 1)
        : t.push([n.index, n.index + n[0].length]);
    return t;
  };
  return (n.regexp && (i.isRegExp = !0), i);
}
function b(e, t, n, r) {
  if (n !== void 0 && n.resume === void 0) return n;
  let i = n?.lines.slice() ?? [],
    o = d(t, r),
    s = n?.hasLongLines ?? !1,
    { from: c, line: l } = n?.resume ?? { from: 0, line: 1 };
  for (; c <= e.length && i.length < 1e6; ) {
    if (o()) return { lines: i, hasLongLines: s, resume: { from: c, line: l } };
    let n = e.indexOf(
        `
`,
        c,
      ),
      r = n === -1 ? e.length : n,
      d = e.slice(c, r > c && e[r - 1] === "\r" ? r - 1 : r);
    s ||= u(t, d.length);
    let f = Math.min(t(d).length, a - i.length);
    for (let e = 0; e < f; e++) i.push(l);
    (l++, (c = r + 1));
  }
  return { lines: i, hasLongLines: s };
}
function x(e, t, n) {
  if (e.length === 0) return -1;
  let r = 0,
    i = e.length;
  for (; r < i; ) {
    let a = (r + i) >>> 1;
    (n === 1 ? e[a] < t : e[a] <= t) ? (r = a + 1) : (i = a);
  }
  return n === 1 ? (r < e.length ? r : 0) : r > 0 ? r - 1 : e.length - 1;
}
function S(e, t) {
  let n = t;
  for (; n > 0 && e[n - 1] === e[t]; ) n--;
  return t - n;
}
function C(e, t) {
  return e === t
    ? !0
    : !e.includes("\r") && !t.includes("\r")
      ? !1
      : e.replace(
          /\r\n?/g,
          `
`,
        ) ===
        t.replace(
          /\r\n?/g,
          `
`,
        );
}
function w(e) {
  let t = 0,
    n = e.indexOf(`\r
`);
  for (; n !== -1; )
    ((t += 1),
      (n = e.indexOf(
        `\r
`,
        n + 2,
      )));
  return e.length - t;
}
var T = 13,
  E = 10;
function D(e, t) {
  return e.replace(/\r\n|\r|\n/g, t);
}
function O(e) {
  if (!e.includes("\r"))
    return {
      text: e,
      lineBreak: `
`,
    };
  let t = 0,
    n = 0,
    r = 0;
  for (let i = 0; i < e.length; i += 1) {
    let a = e.charCodeAt(i);
    a === T
      ? e.charCodeAt(i + 1) === E
        ? ((r += 1), (i += 1))
        : (t += 1)
      : a === E && (n += 1);
  }
  let i =
    t + r > (t + n + r) / 2
      ? `\r
`
      : `
`;
  return {
    text: (
      i ===
      `\r
`
        ? t + n === 0
        : t + r === 0
    )
      ? e
      : D(e, i),
    lineBreak: i,
  };
}
export {
  s as defaultSearchOptions,
  a as searchLimit,
  y as compileSearch,
  b as scanSearch,
  x as searchIndexFromLine,
  u as skipsLongLine,
  ws as normalizeSearchText,
};
