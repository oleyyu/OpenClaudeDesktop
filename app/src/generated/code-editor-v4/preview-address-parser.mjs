// Original 4.16336.0 Preview address classifier and Unicode normalization (cf790d7f8-C-RpKvlh.js).
// shared-25-D-aF0gt9.js
const $c_shared_25_D_aF0gt9 = (() => {
  function MW(e, t) {
    let n = "";
    for (let r = 0; r < e.length; r++) {
      let i = e.charCodeAt(r),
        a = r + 1 < e.length ? e.charCodeAt(r + 1) : 0;
      i >= 55296 && i <= 56319 && a >= 56320 && a <= 57343
        ? ((n += e.slice(r, r + 2)), r++)
        : (n += i >= 55296 && i <= 57343 ? t : e.charAt(r));
    }
    return n;
  }
  function NW(e) {
    let t = e.isWellFormed;
    if (typeof t == "function") return t.call(e);
    for (let t = 0; t < e.length; t++) {
      let n = e.charCodeAt(t);
      if (n >= 55296 && n <= 56319) {
        let n = t + 1 < e.length ? e.charCodeAt(t + 1) : 0;
        if (n < 56320 || n > 57343) return !1;
        t++;
      } else if (n >= 56320 && n <= 57343) return !1;
    }
    return !0;
  }
  function PW(e) {
    let t = e.toWellFormed;
    return typeof t == "function" ? t.call(e) : MW(e, "\uFFFD");
  }
  function FW(e) {
    return NW(e) ? e : MW(e, "");
  }
  return { FW, NW, PW };
})();
const { NW: i, FW: a, PW: o } = $c_shared_25_D_aF0gt9;
var p = /^([a-z][a-z0-9+.-]*):\/\//i,
  m = new Set(["http", "https"]),
  h = /^(?:blob:|filesystem:)?chrome-extension:\/\//i,
  ee = /^(localhost|127(\.\d+){3}|\[?::1\]?|0\.0\.0\.0)$/i,
  g = /^[A-Za-z]:[/\\]/,
  _ = /^["'`\u2018-\u201F\s]*\\\\/,
  v = /^[/\\~$%]/;
function y(e) {
  return e.endsWith(".localhost") || ee.test(e);
}
function b(e) {
  return e.endsWith(".") ? e.slice(0, -1) : e;
}
function x(e) {
  let t = e.replace(/^https?:\/\//, "");
  if (t === e) return e;
  let n = /^([^/?#]+)\/$/.exec(t)?.[1];
  return n === void 0 ? t : T(n.slice(n.lastIndexOf("@") + 1)) ? n : t;
}
var S = /[^\s:@]*:(?!\/\/)[^\s@]+@/,
  C = /(?:^|[^\w-])(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-)[^\s@]*@/i;
function w(e) {
  return S.test(e) || C.test(e)
    ? null
    : {
        kind: "search",
        url: `https://www.google.com/search?q=${encodeURIComponent(o(e))}`,
      };
}
function T(e) {
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
function E(e, t) {
  let n = D(e, t);
  if (n?.kind === "search" && !i(e)) {
    let n = a(e);
    if (v.test(n.trim()) || D(n, t)?.kind !== "search") return null;
  }
  return n;
}
function D(e, t) {
  let n = e.trim();
  if (!n || h.test(n)) return null;
  let r = URL.parse(t),
    i = r !== null && (r.protocol === "http:" || r.protocol === "https:");
  if (i && (n === t || n === x(t))) return { kind: "navigate", url: t };
  if (_.test(n)) return null;
  let a = n.slice(1, -1),
    o = a.trim();
  if (n === `"${a}"` && !a.includes('"') && g.test(o))
    return { kind: "file", path: o };
  if (/^file:/i.test(n)) {
    let e;
    try {
      let t = new URL(n);
      if (t.protocol !== "file:") return null;
      e = t.hostname;
    } catch {
      return null;
    }
    return e !== "" && e !== "localhost" ? null : { kind: "file", path: n };
  }
  if (
    /^~($|[/\\])/.test(n) ||
    /^\.\.?[/\\]/.test(n) ||
    g.test(n) ||
    (/^\/(?!\/)/.test(n) && !i)
  )
    return { kind: "file", path: n };
  if (r !== null && r.protocol === "file:" && (v.test(n) || /\s/.test(n)))
    return null;
  let s = p.exec(n);
  if (s)
    return m.has(s[1].toLowerCase()) && URL.canParse(n)
      ? { kind: "navigate", url: n }
      : w(n);
  if (n.startsWith("/") && i && r !== null)
    return { kind: "navigate", url: `${r.protocol}//${r.host}${n}` };
  let c = n.replace(/^\/+/, ""),
    l = c.split(/[/?#]/, 1)[0] ?? "";
  if (!/\s/.test(c) && l.includes("@")) return w(n);
  if (T(c)) {
    let e = i && r !== null ? `${r.protocol}//${c}` : `https://${c}`;
    try {
      let t = new URL(e);
      e.startsWith("https://") &&
        y(t.hostname) &&
        ((t.hostname.endsWith(".localhost") &&
          i &&
          r !== null &&
          t.port === r.port &&
          y(b(r.hostname))) ||
          (e = `http://${e.slice(8)}`));
    } catch {
      return w(n);
    }
    return { kind: "navigate", url: e };
  }
  return w(n);
}
export { E as parsePreviewAddress };
