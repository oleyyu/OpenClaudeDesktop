// Original 4.16336.0 text/list segmentation of side-chat user text (c4d199b75-BFt-qsGU.js).
import { ff as $turn_plan_v4_shared_212_ff } from "../turn-plan-v4/shared-212.mjs";
// shared-36-fqRFYwOb.js
const $c_shared_36_fqRFYwOb = (() => {
  const Wc = $turn_plan_v4_shared_212_ff;
  var dT = /^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm,
    fT = /^((?: {3})*)\* (.*)$/,
    pT = /^((?: {3})*)\*$/,
    mT = /^((?: {3})*)(\d+)\. (.*)$/,
    hT = /^((?: {3})*)(\d+)\.$/,
    gT = /^(?: {3})*(?:\*|\d+\.)(?: |$)/m;
  function _T(e, t) {
    let n = fT.exec(e) ?? (t ? pT.exec(e) : null);
    if (n)
      return {
        level: n[1].length / 3,
        ordered: !1,
        start: 1,
        text: n[2] ?? "",
      };
    let r = mT.exec(e) ?? (t ? hT.exec(e) : null);
    if (r) {
      let e = Number(r[2]);
      return r[2] === String(e)
        ? { level: r[1].length / 3, ordered: !0, start: e, text: r[3] ?? "" }
        : null;
    }
    return null;
  }
  function vT(e, t, n, r) {
    let i = [],
      a = [],
      o = [],
      s = e.split(`
`);
    n && s.length > 1 && s[s.length - 1] === "" && s.pop();
    let c = -1;
    for (let e = 0; e < s.length; e++) s[e] === "" && (c = e);
    let l = !1;
    for (let e = 0; e < s.length; e++) {
      let u = s[e],
        d = !n && e === s.length - 1,
        f = t ? _T(u, d) : null;
      if (t && u === "" && a.length > 0) {
        ((a = []), (o = []), (l = !0));
        continue;
      }
      let p = l;
      u !== "" && (l = !1);
      let m = a[a.length - 1],
        h = () => {
          ((a = []),
            (o = []),
            i.push({
              type: "paragraph",
              content: u ? [{ type: "text", text: u }] : [],
            }));
        },
        g = (e) => {
          let t = e.content;
          t[t.length - 1].content.push({
            type: "paragraph",
            content: u ? [{ type: "text", text: u }] : [],
          });
        };
      if (!f) {
        m ? g(m) : h();
        continue;
      }
      if (f.level > a.length) {
        m ? g(m) : h();
        continue;
      }
      let _ = f.level,
        v = f.ordered ? "orderedList" : "bulletList";
      if (
        m &&
        _ < a.length &&
        ((_ === 0 && a[0].type !== v) ||
          (a[_].type === v && f.ordered && f.start !== o[_]))
      ) {
        g(m);
        continue;
      }
      if (
        ((a.length = Math.min(a.length, _ + 1)),
        (o.length = a.length),
        a[_] && a[_].type !== v && ((a.length = _), (o.length = _)),
        a.length === 0)
      ) {
        if (n && c < e) {
          h();
          continue;
        }
        let t = i[i.length - 1],
          a = t?.type === "paragraph" && !t.content?.length;
        if ((i.length > 0 || r) && !a && !p) {
          h();
          continue;
        }
        if (a && !p) {
          let e = i[i.length - 2];
          (e ? !(e.type === "paragraph" && !e.content?.length) : r) && i.pop();
        }
      }
      if (a.length === _) {
        let e = {
          type: v,
          ...(f.ordered && f.start !== 1 ? { attrs: { start: f.start } } : {}),
          content: [],
        };
        if (_ === 0) i.push(e);
        else {
          let t = a[_ - 1].content;
          t[t.length - 1].content.push(e);
        }
        (a.push(e), (o[_] = f.start));
      }
      (a[_].content.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: f.text ? [{ type: "text", text: f.text }] : [],
          },
        ],
      }),
        f.ordered && (o[_] += 1));
    }
    return i;
  }
  function yT(e, t) {
    return (
      e === t ||
      (t.endsWith(`
`) &&
        e === t.slice(0, -1))
    );
  }
  function bT(e, t, n) {
    let r = t.replaceAll("\u200B", "").replaceAll("\u00A0", " ");
    return n
      ? yT(
          Wc({
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "x" }] },
              ...e,
            ],
          }),
          `x\n${r}`,
        )
      : yT(Wc({ type: "doc", content: e }), r);
  }
  function xT(
    e,
    {
      parseLists: t = !0,
      parseFences: n = !0,
      precededByNonEmptyLine: r = !1,
    } = {},
  ) {
    if (!e)
      return { type: "doc", content: [{ type: "paragraph", content: [] }] };
    let i = () => ({ type: "doc", content: vT(e, t, !1, r) });
    if (!n) return i();
    let a = [],
      o = 0;
    for (let n of e.matchAll(dT)) {
      let i = e.slice(o, n.index).replace(/\n$/, "");
      if ((o > 0 && (i = i.replace(/^\n{1,2}/, "")), i))
        for (let e of vT(i, t, !0, o === 0 && r)) a.push(e);
      (a.push({
        type: "codeBlock",
        attrs: { language: n[2] || null },
        content: n[3] ? [{ type: "text", text: n[3] }] : [],
      }),
        (o = n.index + n[0].length));
    }
    if (o === 0) return i();
    let s = e.slice(o).replace(/^\n{1,2}/, "");
    if (s) for (let e of vT(s, t, !1, !1)) a.push(e);
    return bT(a, e, r) ? { type: "doc", content: a } : i();
  }
  return { dT, gT, xT };
})();
const { gT: a, dT: s, xT: o } = $c_shared_36_fqRFYwOb;
function W(e) {
  return (e.content ?? []).map((e) => e.text ?? "").join("");
}
function G(e) {
  return e.type === "bulletList" || e.type === "orderedList";
}
function Re(e) {
  let t = e.attrs?.start;
  return typeof t == "number" ? t : 1;
}
function ze(e, t, n) {
  let r = [{ list: t, level: n }];
  for (let t = r.pop(); t; t = r.pop()) {
    if ("line" in t) {
      e.push(t.line);
      continue;
    }
    let n = "   ".repeat(t.level),
      i = t.list.type === "orderedList",
      a = Re(t.list),
      o = t.list.content ?? [];
    for (let e = o.length - 1; e >= 0; e--) {
      let s = o[e].content ?? [],
        c = +(s[0]?.type === "paragraph");
      for (let e = s.length - 1; e >= c; e--)
        r.push(
          G(s[e]) ? { list: s[e], level: t.level + 1 } : { line: W(s[e]) },
        );
      let l = i ? `${a + e}. ` : "* ";
      r.push({ line: `${n}${l}${c ? W(s[0]) : ""}` });
    }
  }
}
function Be(e, t = 1) {
  return {
    ordered: e.type === "orderedList",
    start: Re(e),
    items: (e.content ?? []).map((e) => {
      let n = [],
        r = [];
      for (let i of e.content ?? [])
        G(i) ? (t < 8 ? r.push(Be(i, t + 1)) : ze(n, i, t)) : n.push(W(i));
      return {
        text: n.join(`
`),
        children: r,
      };
    }),
  };
}
function Ve(e) {
  return e.items.flatMap((e) => [e.text, ...e.children.map(Ve)]).join(`
`);
}
function He(e) {
  return e.type === "paragraph" && W(e).trim() === "";
}
function Ue(e) {
  return e.type === "codeBlock";
}
function K(e) {
  let t = e.trim();
  return t ? [{ kind: "text", text: t }] : [];
}
function We(e, t) {
  if (!e.some(G)) return K(t);
  let n = 0,
    r = e.length;
  for (; n < r && He(e[n]); ) n++;
  for (; r > n && He(e[r - 1]); ) r--;
  let i = [],
    a = null;
  for (let t of e.slice(n, r))
    if (G(t)) {
      a &&=
        (i.push({
          kind: "text",
          text: a.join(`
`),
        }),
        null);
      let e = Be(t);
      i.push({ kind: "list", text: Ve(e), list: e });
    } else (a ??= []).push(W(t));
  return (
    a &&
      i.push({
        kind: "text",
        text: a.join(`
`),
      }),
    i
  );
}
var Ge = 10;
function Ke(e, t) {
  if (!a.test(e)) return K(e);
  let n = t && e.charCodeAt(0) === Ge ? e.slice(1) : e;
  return We(
    o(n, { parseFences: !1, precededByNonEmptyLine: t }).content ?? [],
    e,
  );
}
function qe(e) {
  let t = e.includes("```") ? (o(e).content ?? []) : [];
  if (!t.some(Ue)) return (e, t, n) => Ke(e, n);
  let n = [[]];
  for (let e of t) Ue(e) ? n.push([]) : n[n.length - 1].push(e);
  return (e, t) => (t < 0 ? K(e) : We(n[t], e));
}
function Je(e) {
  let t = e.slice(0, e.length - e.trimStart().length);
  return t.slice(
    0,
    t.lastIndexOf(`
`) + 1,
  );
}
function Ye(e) {
  let t = e.slice(e.trimEnd().length),
    n = t.indexOf(`
`);
  return n === -1 ? "" : t.slice(n);
}
function Xe(e) {
  if (!e) return [];
  if (!a.test(e)) return [{ kind: "text", text: e }];
  let t = qe(e),
    n = [],
    r = null,
    i = () => {
      r !== null && (n.push({ kind: "text", text: r }), (r = null));
    },
    o = (e, a, o) => {
      let s = t(e, a, o);
      if (!s.some((e) => e.kind === "list")) {
        r = (r ?? "") + e;
        return;
      }
      s.forEach((t, a) => {
        if (t.kind === "list") {
          (i(), n.push(t));
          return;
        }
        r =
          (r ?? "") +
          (a === 0 ? Je(e) : "") +
          t.text +
          (a === s.length - 1 ? Ye(e) : "");
      });
    },
    c = 0,
    l = 0;
  for (let t of e.matchAll(s))
    (o(e.slice(c, t.index), l++, c > 0),
      (r = (r ?? "") + t[0]),
      (c = t.index + t[0].length));
  return (
    o(e.slice(c), l, c > 0),
    i(),
    n.some((e) => e.kind === "list") ? n : [{ kind: "text", text: e }]
  );
}

export { Xe as parseSideChatUserText };
