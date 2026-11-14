// Original text/list segmentation; serializer is private to parser round-trip checks.
var fn;
var pn = () =>
  (fn ??=
    /[\uD800-\uDBFF]*[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\uFFFC\u{1D159}\u{13441}\u{13442}\u{16910}\u{16FE4}\uFDD0-\uFDEF\uFFFE\uFFFF\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}][\uDC00-\uDFFF]*|([\uD800-\uDBFF]+)/gu);
var mn = "$1";
function hn(e) {
  return e.replace(pn(), mn);
}
function gn(e) {
  return e
    .replace(/[\t\n\v\f\r\u0085\u2028\u2029]+/g, " ")
    .replace(
      /[\uD800-\uDBFF]*(?:(?!\u200C|\u200D|\uFE0E|\uFE0F)[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\uFFFC\u{1D159}\u{13441}\u{13442}\u{16910}\u{16FE4}\uFDD0-\uFDEF\uFFFE\uFFFF\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}])[\uDC00-\uDFFF]*|([\uD800-\uDBFF]+)/gu,
      mn,
    );
}
function _n(e) {
  return vn(e) === "";
}
function vn(e) {
  return e.replace(/^(?:\s|\u200C|\u200D|\uFE0E|\uFE0F)+/u, "");
}
const ee = gn,
  O = _n,
  k = hn;
function V_(e) {
  if (typeof e != "string") return "";
  let t = ee(e)
    .replace(
      /((?:\u200C|\u200D|\uFE0E|\uFE0F){3})(?:\u200C|\u200D|\uFE0E|\uFE0F)+/g,
      "$1",
    )
    .replace(/ {2,}/g, " ")
    .trim();
  return O(t) ? "" : t;
}
var H_ = /(https?:\/\/[^\s<>"'`]+|\bwww\.[^\s<>"'`]+)/gi;
var U_ = "\f\r\uFEFF";
var W_ = `.,;:!?${U_}`;
function G_(e) {
  try {
    return (new URL(e), !0);
  } catch {
    return !1;
  }
}
function K_(e) {
  let t = 0,
    n = 0;
  for (let r = 0; r < e.length; r++) {
    let i = e.charAt(r);
    i === "(" ? (t += 1) : i === ")" && (n += 1);
  }
  let r = e.length;
  for (; r > 0; r--) {
    let i = e.charAt(r - 1);
    if (!W_.includes(i)) {
      if (i !== ")" || n <= t) break;
      --n;
    }
  }
  return [e.slice(0, r), e.slice(r)];
}
var q_ = new RegExp(H_.source, "gi");
var J_ = (e, t = e) => {
  let n = [];
  for (let r of t.matchAll(q_)) {
    let [t] = K_(e.slice(r.index, r.index + r[0].length)),
      i = /^www\./i.test(t) ? `https://${t}` : t;
    n.push({ index: r.index, text: t, href: G_(i) ? i : null });
  }
  return n;
};
var ev = (e) =>
  k(
    e.replace(
      /[\t\n\v\u0085\u2028\u2029\u2800\u115F\u1160\u3164\uFFA0]+/g,
      " ",
    ),
  );
var tv = (e) =>
  e.replace(/[^\0-\x7F\u2025\u2026\uFE19\uFE30]/gu, (e) => e.normalize("NFKC"));
var nv = /[.:\u2024-\uffff]/;
var rv = (e) => {
  let t = ev(e);
  return [t, tv(t)].some(
    (e) =>
      /^\s*(?:mailto|tel):\S/i.test(e) ||
      J_(e).length > 0 ||
      /[^a-z\s](?:\/\/:[a-z]|(?:\.www|:mailto|:tel)(?![a-z]))/i.test(e),
  );
};
var iv = (e, t) => t === e || (/^www\./i.test(e ?? "") && t === `https://${e}`);
var yv = /^(?=[\w+#.-]{1,24}$)(?!.*www\.)/i;
function bv(e) {
  if (typeof e != "string" || e === "") return "";
  if (yv.test(e)) return e;
  let t = e.replaceAll("\u200B", "");
  return yv.test(t) ? t : "";
}
function xv(e) {
  return (
    (e >= 32 && e < 127) ||
    e === 9 ||
    e === 10 ||
    e === 13 ||
    e === 160 ||
    e === 8232 ||
    e === 8233
  );
}
function Sv(e) {
  let t = 2,
    n = 0;
  for (let r of e ?? []) {
    let e = r.text ?? "";
    if (
      !(
        n === 0 &&
        typeof e == "string" &&
        !e.includes("`") &&
        !e.includes("\u1FEF") &&
        !e.includes("\uFF40")
      )
    )
      for (let r = 0; r < e.length; r++) {
        let i = e.charCodeAt(r);
        i === 96 || i === 8175 || i === 65344
          ? ((n += 1), (t = Math.max(t, n)))
          : xv(i) && (n = 0);
      }
  }
  return "`".repeat(t + 1);
}
var Cv = /^(?:https?:\/\/|mailto:|tel:)[\w\-.~:/?#[\]@!$&'*+,;=%{}|^]+$/i;
var wv = /^(?:https?:\/\/|mailto:|tel:)[\w\-.~:/?#[\]@!$&'()*+,;=%{}|^]+$/i;
function Tv(e) {
  if (Cv.test(e)) return !0;
  if (!wv.test(e)) return !1;
  let t = 0;
  for (let n = 0; n < e.length; n++) {
    let r = e[n];
    if (r === "(" && e[n - 1] !== "]") t++;
    else if (r === "(" || (r === ")" && --t < 0)) return !1;
  }
  return t === 0;
}
var Ev;
var Dv = () =>
  (Ev ??=
    /(?![\p{Default_Ignorable_Code_Point}\u2800\uFFFC\u{1D159}\u{13441}\u{13442}\u{16910}])[\p{L}\p{N}\p{P}\p{S}]/u);
var Ov = /^(?!.*www(?:\.|$))(?!(?:https?|mailto|tel):)[\w:.-]+$/i;
var kv = /www(?:\.|$)|^(?:https?|mailto|tel):/i;
var Av = /[\u0080-\uffff]/;
var jv;
var Mv = () =>
  (jv ??=
    /^(?!.*www\.)(?:(?!\p{Default_Ignorable_Code_Point})[\p{L}\p{M}\p{N}_:.-])+$/iu);
function Nv(e) {
  return typeof e != "string" || e.length > 200
    ? ""
    : Ov.test(e) ||
        (Av.test(e) && Mv().test(e) && !kv.test(e.normalize("NFKC")))
      ? e
      : "";
}
function Pv(e) {
  let t = V_(e);
  return t && `@${t}`;
}
function Fv(e, t) {
  if (typeof e != "string" || e === t) return "";
  let n = t.charCodeAt(0);
  if (!(n > 32 && n < 127) && !Dv().test(t)) return "";
  if (Tv(e)) return e;
  let r = e.replaceAll("\u200B", "");
  return r !== t && Tv(r) ? r : "";
}
var Iv = (e, t) => e.length <= 2048 && !iv(e, t) && rv(e);
function Lv(e, t) {
  let n = Fv(e, t);
  return n !== "" && nv.test(t) && Rv(t, n) ? "" : n;
}
function Rv(e, t) {
  let n = e.replaceAll("\u200B", "");
  return n === t || Iv(n, t);
}
var Wv = 8203;
var Gv = (e) =>
  e === 32 ||
  e === 160 ||
  (e >= 9 && e <= 13) ||
  (e >= 5760 &&
    (e === Wv ||
      (e >= 8192 && e <= 8202) ||
      e === 5760 ||
      e === 8232 ||
      e === 8233 ||
      e === 8239 ||
      e === 8287 ||
      e === 12288 ||
      e === 65279));
function Kv(e) {
  let t = 0;
  for (; t < e.length && Gv(e.charCodeAt(t)); ) t++;
  return t;
}
function qv(e, t) {
  let n = e.length;
  for (; n > t && Gv(e.charCodeAt(n - 1)); ) n--;
  return n;
}
var Jv = (e) => e === "bold" || e === "italic";
function Yv(e) {
  for (let t = 0; t < e.length; t++) {
    let n = e[t]?.type;
    if (n === "bold" || n === "italic") return !0;
  }
  return !1;
}
var ny = (e) => {
  let t = "",
    n = 0,
    r = "",
    i = "",
    a = (e, o = 0, s = !1) => {
      if (e.type === "doc" && e.content)
        for (let [n, r] of e.content.entries())
          (a(r),
            (r.type === "bulletList" || r.type === "orderedList") &&
              n + 1 < e.content.length &&
              !t.endsWith(`

`) &&
              (t += `
`));
      else if (e.type === "paragraph") {
        if (e.content) for (let t of e.content) a(t);
        e.content?.[e.content.length - 1]?.type !== "hardBreak" &&
          (t += `
`);
      } else if (e.type === "hardBreak")
        t += `
`;
      else if (e.type === "text") {
        let n = e.text;
        if (e.marks) {
          if (n !== void 0 && n !== "") {
            let t = n.charCodeAt(0),
              o = n.charCodeAt(n.length - 1);
            if ((t <= 32 || t >= 160 || o <= 32 || o >= 160) && Yv(e.marks)) {
              let t = Kv(n),
                o = qv(n, t);
              if (o === t) {
                a({ ...e, marks: e.marks.filter((e) => !Jv(e.type)) });
                return;
              }
              ((r = n.slice(0, t)), (i = n.slice(o)), (n = n.slice(t, o)));
            }
          }
          for (let t of e.marks)
            if (t.type === "bold") n = `**${n}**`;
            else if (t.type === "italic") n = `*${n}*`;
            else if (t.type === "underline") n = `__${n}__`;
            else if (t.type === "strike") n = `~~${n}~~`;
            else if (t.type === "code") n = `\`${n}\``;
            else if (t.type === "link") {
              let r = Lv(t.attrs?.href, e.text ?? "");
              r !== "" && (n = `[${n}](${r})`);
            }
          (r !== "" || i !== "") && ((n = r + n + i), (r = ""), (i = ""));
        }
        t += n;
      } else if (e.type === "codeBlock") {
        let n = Sv(e.content);
        if (((t += `\n${n}${bv(e.attrs?.language)}\n`), e.content))
          for (let t of e.content) a(t);
        t += `\n${n}\n\n`;
      } else if (e.type === "bulletList" && e.content) {
        n === 0 &&
          t.length > 0 &&
          !t.endsWith(`

`) &&
          (t += `
`);
        for (let t of e.content) a(t);
      } else if (e.type === "orderedList" && e.content) {
        n === 0 &&
          t.length > 0 &&
          !t.endsWith(`

`) &&
          (t += `
`);
        let r = e.attrs?.start,
          i = Number.isInteger(r) ? r : 1;
        for (let [t, n] of e.content.entries()) a(n, i + t, !0);
      } else if (e.type === "listItem" && e.content) {
        let r = "   ".repeat(n);
        t += s ? `${r}${o}. ` : `${r}* `;
        for (let t of e.content) ((n += 1), a(t), --n);
      } else if (e.type === "mention")
        e.content
          ? (t += Pv(e.attrs?.label))
          : (t += `@${e.attrs?.renderedText || e.attrs?.label || ""}`);
      else if (e.type === "skillChip") {
        let n = Nv(e.attrs?.skillId) || e.attrs?.skillDisplayName || "";
        t += `/${n}`;
      } else if (e.type === "commandChip") {
        let n = Nv(e.attrs?.commandId) || e.attrs?.commandDisplayName || "";
        t += `/${n}`;
      } else if (e.type === "connectorToolChip") {
        let n = e.attrs?.toolDisplayName || e.attrs?.toolName || "",
          r = e.attrs?.connectorName || "";
        t += r ? `${r}: ${n}` : n;
      } else e.type === "connectorMention" && (t += e.attrs?.label || "");
    };
  return (a(e), t.replaceAll("\u200B", "").replaceAll("\u00A0", " ").trim());
};
const up = ny;
var bP = /^(`{3,})(\S*)\n([\s\S]*?)\n\1[ \t]*$/gm;
var xP = /^((?: {3})*)\* (.*)$/;
var SP = /^((?: {3})*)\*$/;
var CP = /^((?: {3})*)(\d+)\. (.*)$/;
var wP = /^((?: {3})*)(\d+)\.$/;
var TP = /^(?: {3})*(?:\*|\d+\.)(?: |$)/m;
function EP(e, t) {
  let n = xP.exec(e) ?? (t ? SP.exec(e) : null);
  if (n)
    return { level: n[1].length / 3, ordered: !1, start: 1, text: n[2] ?? "" };
  let r = CP.exec(e) ?? (t ? wP.exec(e) : null);
  if (r) {
    let e = Number(r[2]);
    return r[2] === String(e)
      ? { level: r[1].length / 3, ordered: !0, start: e, text: r[3] ?? "" }
      : null;
  }
  return null;
}
function DP(e, t, n, r) {
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
      f = t ? EP(u, d) : null;
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
function OP(e, t) {
  return (
    e === t ||
    (t.endsWith(`
`) &&
      e === t.slice(0, -1))
  );
}
function kP(e, t, n) {
  let r = t.replaceAll("\u200B", "").replaceAll("\u00A0", " ");
  return n
    ? OP(
        up({
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "x" }] },
            ...e,
          ],
        }),
        `x\n${r}`,
      )
    : OP(up({ type: "doc", content: e }), r);
}
function AP(
  e,
  {
    parseLists: t = !0,
    parseFences: n = !0,
    precededByNonEmptyLine: r = !1,
  } = {},
) {
  if (!e) return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  let i = () => ({ type: "doc", content: DP(e, t, !1, r) });
  if (!n) return i();
  let a = [],
    o = 0;
  for (let n of e.matchAll(bP)) {
    let i = e.slice(o, n.index).replace(/\n$/, "");
    if ((o > 0 && (i = i.replace(/^\n{1,2}/, "")), i))
      for (let e of DP(i, t, !0, o === 0 && r)) a.push(e);
    (a.push({
      type: "codeBlock",
      attrs: { language: n[2] || null },
      content: n[3] ? [{ type: "text", text: n[3] }] : [],
    }),
      (o = n.index + n[0].length));
  }
  if (o === 0) return i();
  let s = e.slice(o).replace(/^\n{1,2}/, "");
  if (s) for (let e of DP(s, t, !1, !1)) a.push(e);
  return kP(a, e, r) ? { type: "doc", content: a } : i();
}
const s = TP,
  o = bP,
  a = AP;
function G(e) {
  return (e.content ?? []).map((e) => e.text ?? "").join("");
}
function K(e) {
  return e.type === "bulletList" || e.type === "orderedList";
}
function Le(e) {
  let t = e.attrs?.start;
  return typeof t == "number" ? t : 1;
}
function Re(e, t, n) {
  let r = [{ list: t, level: n }];
  for (let t = r.pop(); t; t = r.pop()) {
    if ("line" in t) {
      e.push(t.line);
      continue;
    }
    let n = "   ".repeat(t.level),
      i = t.list.type === "orderedList",
      a = Le(t.list),
      o = t.list.content ?? [];
    for (let e = o.length - 1; e >= 0; e--) {
      let s = o[e].content ?? [],
        c = +(s[0]?.type === "paragraph");
      for (let e = s.length - 1; e >= c; e--)
        r.push(
          K(s[e]) ? { list: s[e], level: t.level + 1 } : { line: G(s[e]) },
        );
      let l = i ? `${a + e}. ` : "* ";
      r.push({ line: `${n}${l}${c ? G(s[0]) : ""}` });
    }
  }
}
function ze(e, t = 1) {
  return {
    ordered: e.type === "orderedList",
    start: Le(e),
    items: (e.content ?? []).map((e) => {
      let n = [],
        r = [];
      for (let i of e.content ?? [])
        K(i) ? (t < 8 ? r.push(ze(i, t + 1)) : Re(n, i, t)) : n.push(G(i));
      return {
        text: n.join(`
`),
        children: r,
      };
    }),
  };
}
function Be(e) {
  return e.items.flatMap((e) => [e.text, ...e.children.map(Be)]).join(`
`);
}
function Ve(e) {
  return e.type === "paragraph" && G(e).trim() === "";
}
function He(e) {
  return e.type === "codeBlock";
}
function q(e) {
  let t = e.trim();
  return t ? [{ kind: "text", text: t }] : [];
}
function Ue(e, t) {
  if (!e.some(K)) return q(t);
  let n = 0,
    r = e.length;
  for (; n < r && Ve(e[n]); ) n++;
  for (; r > n && Ve(e[r - 1]); ) r--;
  let i = [],
    a = null;
  for (let t of e.slice(n, r))
    if (K(t)) {
      a &&=
        (i.push({
          kind: "text",
          text: a.join(`
`),
        }),
        null);
      let e = ze(t);
      i.push({ kind: "list", text: Be(e), list: e });
    } else (a ??= []).push(G(t));
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
var We = 10;
function Ge(e, t) {
  if (!s.test(e)) return q(e);
  let n = t && e.charCodeAt(0) === We ? e.slice(1) : e;
  return Ue(
    a(n, { parseFences: !1, precededByNonEmptyLine: t }).content ?? [],
    e,
  );
}
function Ke(e) {
  let t = e.includes("```") ? (a(e).content ?? []) : [];
  if (!t.some(He)) return (e, t, n) => Ge(e, n);
  let n = [[]];
  for (let e of t) He(e) ? n.push([]) : n[n.length - 1].push(e);
  return (e, t) => (t < 0 ? q(e) : Ue(n[t], e));
}
function qe(e) {
  let t = e.slice(0, e.length - e.trimStart().length);
  return t.slice(
    0,
    t.lastIndexOf(`
`) + 1,
  );
}
function Je(e) {
  let t = e.slice(e.trimEnd().length),
    n = t.indexOf(`
`);
  return n === -1 ? "" : t.slice(n);
}
function Ye(e) {
  if (!e) return [];
  if (!s.test(e)) return [{ kind: "text", text: e }];
  let t = Ke(e),
    n = [],
    r = null,
    i = () => {
      r !== null && (n.push({ kind: "text", text: r }), (r = null));
    },
    a = (e, a, o) => {
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
          (a === 0 ? qe(e) : "") +
          t.text +
          (a === s.length - 1 ? Je(e) : "");
      });
    },
    c = 0,
    l = 0;
  for (let t of e.matchAll(o))
    (a(e.slice(c, t.index), l++, c > 0),
      (r = (r ?? "") + t[0]),
      (c = t.index + t[0].length));
  return (
    a(e.slice(c), l, c > 0),
    i(),
    n.some((e) => e.kind === "list") ? n : [{ kind: "text", text: e }]
  );
}
export { Ye as parseSideChatUserText };
