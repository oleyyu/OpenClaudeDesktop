// Original 4.16336.0 search engine (c5fbdc8eb-D_9kA6bR.js) with its normalization (shared-100-BBQR7Gmd.js) and escaping chunks.
// shared-12-DVKzjo12.js
const $c_shared_12_DVKzjo12 = (() => {
  var se = [
    ["\u2018", "'"],
    ["\u2019", "'"],
    ["\u201C", '"'],
    ["\u201D", '"'],
  ];
  return { se };
})();
// shared-100-BBQR7Gmd.js
const $c_shared_100_BBQR7Gmd = (() => {
  const { se: bn } = $c_shared_12_DVKzjo12;
  var dc = /[\u0130\u03a3\ud800-\udfff]/,
    fc = /[^\u0130\u03a3\ud800-\udfff]+/y;
  function pc(e) {
    let t = e;
    for (let [e, n] of bn) t = t.replaceAll(e, n);
    return t;
  }
  function mc(e) {
    let t = "",
      n = 0,
      r = e.search(dc);
    for (; r !== -1 && r < e.length; ) {
      let i = e.charCodeAt(r),
        a = r + 1;
      if (i === 304 || i === 931) t += e.slice(n, r).toLowerCase() + Tc(e[r]);
      else {
        for (; a < e.length && (e.charCodeAt(a) & 63488) == 55296; ) a++;
        t += e.slice(n, r).toLowerCase() + e.slice(r, a);
      }
      ((n = a), (fc.lastIndex = a), (r = fc.test(e) ? fc.lastIndex : a));
    }
    let i = n === 0 ? e.toLowerCase() : t + e.slice(n).toLowerCase();
    return pc(i.length === e.length ? i : Ec(e));
  }
  function Tc(e) {
    let t = e.toLowerCase();
    return t.length === 1 ? t : e;
  }
  function Ec(e) {
    let t = "";
    for (let n = 0; n < e.length; n++) t += Tc(e[n]);
    return t;
  }
  return { mc };
})();
// shared-62-DoCqVpIq.js
const $c_shared_62_DoCqVpIq = (() => {
  function pC(e) {
    return e.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return { pC };
})();
const { mc: t } = $c_shared_100_BBQR7Gmd;
const { pC: e } = $c_shared_62_DoCqVpIq;
function r(e, t) {
  let n = [];
  e.lastIndex = 0;
  for (let r = e.exec(t); r !== null; r = e.exec(t))
    r[0].length === 0
      ? (e.lastIndex += (t.codePointAt(r.index) ?? 0) > 65535 ? 2 : 1)
      : n.push([r.index, r.index + r[0].length]);
  return n;
}
var i = 1e6;
var o = { matchCase: !1, wholeWord: !1, regexp: !1 },
  s = 1e3,
  c = 250;
function l(e, t) {
  return e.isRegExp === !0 && t > s;
}
function u(e, t = () => performance.now()) {
  if (e.isRegExp !== !0) return () => !1;
  let n = t() + c;
  return () => t() >= n;
}
var d = "[\\p{L}\\p{N}_]",
  f = `(?<!${d}\\p{M}*)`,
  p = `(?!${d}|\\p{M})`,
  m = RegExp(`^${d}`, "u"),
  h = RegExp(`${d}\\p{M}*$`, "u");
function g(e, t) {
  return (n) => {
    let r = t(n),
      i = [],
      a = r.indexOf(e);
    for (; a !== -1; )
      (i.push([a, a + e.length]), (a = r.indexOf(e, a + e.length)));
    return i;
  };
}
function _(t, n) {
  let r = n.matchCase ? "gu" : "giu",
    i = n.regexp ? t : e(t);
  try {
    new RegExp(i, r);
  } catch {
    return null;
  }
  if (n.wholeWord) {
    let e = n.regexp || m.test(t) ? f : "",
      r = n.regexp || h.test(t) ? p : "";
    i = `${e}(?:${i})${r}`;
  }
  return new RegExp(i, r);
}
function v(e, n) {
  if (
    e.length === 0 ||
    (!n.regexp &&
      e.includes(`
`))
  )
    return null;
  if (!n.regexp && !n.wholeWord)
    return n.matchCase ? g(e, (e) => e) : g(t(e), t);
  let i = _(e, n);
  if (i === null) return null;
  let a = (e) => (l(a, e.length) ? [] : r(i, e));
  return (n.regexp && (a.isRegExp = !0), a);
}
function y(e, t, n, r) {
  if (n !== void 0 && n.resume === void 0) return n;
  let a = n?.lines.slice() ?? [],
    o = u(t, r),
    s = n?.hasLongLines ?? !1,
    c = n?.waiting?.slice(),
    { from: d, line: f } = n?.resume ?? { from: 0, line: 1 };
  for (; d <= e.length && a.length < 1e6; ) {
    if (o())
      return {
        lines: a,
        hasLongLines: s,
        waiting: c,
        resume: { from: d, line: f },
      };
    let n = e.indexOf(
        `
`,
        d,
      ),
      r = n === -1 ? e.length : n,
      u = e.slice(d, r > d && e[r - 1] === "\r" ? r - 1 : r);
    ((s ||= l(t, u.length)), t.awaits?.(u) === !0 && (c ??= []).push(f));
    let p = Math.min(t(u).length, i - a.length);
    for (let e = 0; e < p; e++) a.push(f);
    (f++, (d = r + 1));
  }
  return { lines: a, hasLongLines: s, waiting: c };
}
function b(e, t, n) {
  if (e.length === 0) return -1;
  let r = 0,
    i = e.length;
  for (; r < i; ) {
    let a = (r + i) >>> 1;
    (n === 1 ? e[a] < t : e[a] <= t) ? (r = a + 1) : (i = a);
  }
  return n === 1 ? (r < e.length ? r : 0) : r > 0 ? r - 1 : e.length - 1;
}
export {
  o as defaultSearchOptions,
  i as searchLimit,
  v as compileSearch,
  y as scanSearch,
  b as searchIndexFromLine,
  l as skipsLongLine,
  t as normalizeSearchText,
};
