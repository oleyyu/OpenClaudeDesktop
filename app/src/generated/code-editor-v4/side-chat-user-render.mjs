// Original 4.16336.0 user segment renderer (c96d752d0-D9VB6ArX.js) and line-break presentation (shared-11-CNsu0Zu8.js).
import {
  M6 as $routines_shared_v4_shared_0_CnnWnVrT_M6,
  T6 as $routines_shared_v4_shared_0_CnnWnVrT_T6,
  Tl as $routines_shared_v4_shared_0_CnnWnVrT_Tl,
} from "../routines-shared-v4/shared-0-CnnWnVrT.mjs";
import { Fragment as $react_Fragment } from "react";
import {
  jsx as $react_jsx_runtime_jsx,
  jsxs as $react_jsx_runtime_jsxs,
} from "react/jsx-runtime";
// c96d752d0-D9VB6ArX.js
const { wO: renderSideChatUserSegment } = (() => {
  // c8187a2dc-Dp9Zia_4.js
  const $c_c8187a2dc_Dp9Zia_4 = (() => {
    var e = "[unicode-bidi:plaintext]";
    return { e };
  })();
  // shared-92-BOgyxePb.js
  const $c_shared_92_BOgyxePb = (() => {
    const rn = $routines_shared_v4_shared_0_CnnWnVrT_Tl;
    const Xe = $routines_shared_v4_shared_0_CnnWnVrT_T6;
    var LA = "(?<![A-Za-z0-9_-])",
      RA = [
        String.raw`\\[bfnrt]`,
        String.raw`\\x[0-9A-Fa-f]{2}`,
        String.raw`\\u[0-9A-Fa-f]{4}`,
        "%[0-9A-Fa-f]{2}",
        "%25[0-9A-Fa-f]{2}",
      ],
      zA = "\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000",
      BA = `\\t\\v\\f\\r\\n\\u2028\\u2029 ${zA}`,
      VA = `[${BA}]*`,
      HA = "-{4,5}",
      UA = `[ \\t${zA}]*`,
      WA = RegExp(`PRIVATE${VA}KEY(?:${VA}BLOCK)?${UA}${HA}`),
      GA = RegExp(`${HA}${UA}BEGIN[A-Z0-9${BA}]*${WA.source}`),
      KA = RegExp(`${HA}${UA}END[A-Z0-9${BA}]*${WA.source}`),
      qA = "(?![A-Za-z0-9_-]*----BEGIN)",
      JA = `eyJ[A-Za-z0-9_-]{10,}\\.(?:${qA}[A-Za-z0-9_-]*\\.(?!-?eyJ)${qA}[A-Za-z0-9_-]{10,}\\.(?!-?eyJ)${qA}[A-Za-z0-9_-]{10,}\\.(?!-?eyJ)(?:[A-Za-z0-9_]|-(?!---)){10,64}(?:(?![A-Za-z0-9_-]*----)[A-Za-z0-9_-]*)?|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,})`,
      YA = [
        {
          id: "anthropic",
          inWord: !0,
          regex: RegExp(`${LA}sk-ant-[A-Za-z0-9_-]{20,}`),
          trigger: "sk-ant-",
        },
        {
          id: "openai_proj",
          inWord: !0,
          regex: RegExp(
            `${LA}sk-(?:proj|svcacct|admin|None)-[A-Za-z0-9_-]{20,}`,
          ),
          trigger: "sk-(?:proj|svcacct|admin|None)-",
        },
        {
          id: "openai",
          regex: RegExp(`${LA}sk-[A-Za-z0-9]{20,}`),
          trigger: "sk-[A-Za-z0-9]{20}",
        },
        {
          id: "github",
          inWord: !0,
          regex: RegExp(
            `${LA}(?:(?:gh[opsu]_|github_pat_)[A-Za-z0-9_]{20,}|ghr_[A-Za-z0-9]{20,})`,
          ),
          trigger: "gh[oprsu]_|github_pat_",
        },
        {
          id: "aws",
          inWord: !0,
          regex: RegExp(`${LA}AKIA[A-Z0-9]{16}`),
          trigger: "AKIA",
        },
        {
          id: "slack",
          inWord: !0,
          regex: RegExp(
            `${LA}(?:xox[abceprs]-[A-Za-z0-9-]{10,}|xapp-[0-9]-[A-Z0-9]{1,20}-[0-9]{1,20}-[A-Za-z0-9]{10,})`,
          ),
          trigger: "xox[abceprs]-|xapp-[0-9]-",
        },
        {
          id: "google",
          inWord: !0,
          regex: RegExp(`${LA}AIza[A-Za-z0-9_-]{35}`),
          trigger: "AIza",
        },
        {
          id: "stripe",
          inWord: !0,
          regex: RegExp(`${LA}(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}`),
          trigger: "[sr]k_(?:live|test)_[A-Za-z0-9]{20}",
        },
        {
          id: "stripe_webhook",
          inWord: !0,
          regex: RegExp(`${LA}whsec_[A-Za-z0-9]{20,}`),
          trigger: "whsec_[A-Za-z0-9]{20}",
        },
        {
          id: "age",
          inWord: !0,
          regex: RegExp(`${LA}AGE-SECRET-KEY-1[02-9AC-HJ-NP-Z]{58}`),
          trigger: "AGE-SECRET-KEY-1",
        },
        {
          id: "gitlab",
          inWord: !0,
          regex: RegExp(`${LA}gl(?:pat|dt)-[A-Za-z0-9_-]{20,}`),
          trigger: "gl(?:pat|dt)-",
        },
        {
          id: "jwt",
          regex: RegExp(`${LA}${JA}`),
          trigger: "\\.eyJ|(?:^|[^A-Za-z0-9_-])-?eyJ[A-Za-z0-9_-]{10,}\\.",
        },
        {
          id: "private_key",
          regex: RegExp(
            `${GA.source}[A-Za-z0-9+/=$\\\\\\r\\n\\u2028\\u2029${zA}]{0,5000}?${KA.source}`,
          ),
          trigger: WA.source,
        },
      ],
      XA = YA.map((e) => `(?:${e.regex.source})`).join("|"),
      ZA = YA.filter(({ regex: e }) => e.source.startsWith(LA)).map(
        ({ regex: e }) => `(?:${e.source.slice(18)})`,
      ),
      QA = `(?<=${LA}-)(?:${ZA.join("|")})`,
      $A = `(?<=\\.)(?=(${JA}))`,
      ej = /(?<!-)-{4,}(?=BEGIN|END|$)|PRIVATE/,
      tj = `${`(?<![^0-9_-]${RA.map((e) => `(?<!${e})`).join("")})`}(?:${YA.filter(
        (e) => e.inWord === !0 && e.regex.source.startsWith(LA),
      )
        .map((e) => e.regex.source.slice(18))
        .join("|")})|(?:${RA.join("|")})(?<jwt>${JA})`,
      nj = new RegExp(YA.map((e) => `(?:${e.trigger})`).join("|")),
      rj = rn(() => RegExp(`(?:${RA.join("|")})eyJ[A-Za-z0-9_-]{10,}\\.`)),
      ij = (e) => nj.test(e) || (e.includes("eyJ") && rj().test(e));
    function aj() {
      return new RegExp(XA, "g");
    }
    function* oj(e, t, n) {
      for (let t of e.matchAll(aj())) yield { index: t.index, value: t[0] };
      for (let t of e.matchAll(new RegExp(QA, "g"))) {
        let e = t[0].search(/(?<!-)-{4,}(?=BEGIN|END|$)/);
        yield { index: t.index, value: e < 0 ? t[0] : t[0].slice(0, e) };
      }
      let r = -1,
        i = -1,
        a = -1;
      for (let o of e.matchAll(new RegExp(tj, "g"))) {
        let s = o.groups?.jwt ?? o[0],
          c = o.index + o[0].length - s.length,
          l = o.index + o[0].length;
        if (l > r) {
          ((r = Tj(e, l)), (i = -1));
          for (let n = c; n < r; n++) {
            let a = e.charCodeAt(n) === 80 ? Ej(e, n, "PRIVATE") : -1;
            a >= 0 && a <= r && Mj(e, a, t) && (i = n);
          }
        }
        let u = !1;
        if (
          (!t &&
            r >= e.length &&
            (l > a && (a = jj(e, l)),
            (u = o.index - Aj >= e.length - 8192 || a >= e.length)),
          i >= c || u)
        )
          continue;
        let d = Fj(e, c, l, Pj(e, c, n));
        yield { index: c, value: e.slice(c, d), added: !0 };
      }
      if (e.includes(".eyJ"))
        for (let n of e.matchAll(new RegExp($A, "g"))) {
          let r = e.codePointAt(n.index + n[1].length),
            i = r === void 0 ? "" : String.fromCodePoint(r);
          (i === "" ? t : !Sj.test(i) && !(fj.test(i) && uj(i))) &&
            !ej.test(n[1]) &&
            (yield { index: n.index, value: n[1] });
        }
    }
    function sj(e) {
      return YA.find((t) => t.regex.test(e));
    }
    var lj = rn(
      () =>
        new RegExp(
          String.raw`(?![\t\n\r])${Xe.source}|[\p{M}\p{Co}\p{Cn}]`,
          "u",
        ),
    );
    function uj(e) {
      return lj().test(e);
    }
    var dj = rn(() => RegExp(`(?:${lj().source})+`, "gu")),
      fj = /[^\t\n\r\x20-\x7E]/,
      pj = /[\u0100-\uffff]/,
      mj = 1,
      hj = Array.from({ length: 4352 }, () => void 0),
      gj = 8;
    function _j(e) {
      let t = hj[e];
      if (t === void 0) {
        t = new Uint8Array(256);
        let n = [];
        for (let t = 0; t < 256; t++) n.push((e << 8) | t);
        let r = e > 255 ? 2 : 1,
          { source: i, flags: a } = lj(),
          o = new RegExp(i, a.includes("g") ? a : `g${a}`);
        for (let e of String.fromCodePoint(...n).matchAll(o))
          t[e.index >> (r - 1)] = mj;
        hj[e] = t;
      }
      return t;
    }
    function vj(e) {
      let t = fj.exec(e);
      if (t === null) return !1;
      if (!pj.test(e)) return lj().test(e);
      let n = 0;
      for (let r = t.index; r < e.length; r++) {
        let t = e.codePointAt(r) ?? 0,
          i = hj[t >> 8];
        if (i === void 0) {
          if (n === gj) return lj().test(e.slice(r));
          ((n += 1), (i = _j(t >> 8)));
        }
        if (i[t & 255] === mj) return !0;
        t > 65535 && r++;
      }
      return !1;
    }
    var yj = RegExp(`^(?:${ZA.concat(GA.source).join("|")})`),
      bj = 512,
      xj = /^eyJ[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]*){0,2}$/,
      Sj = /[A-Za-z0-9_-]/,
      Cj = /(?:[A-Za-z0-9_]|(?<=[A-Za-z0-9_])-(?=[A-Za-z0-9_]))*/y,
      wj = RegExp(`[${BA}]`);
    function Tj(e, t) {
      let n = !0,
        r = t;
      for (; r < e.length; ) {
        let t = e.codePointAt(r) ?? 0;
        if (
          (t >= 65 && t <= 90) ||
          (t >= 48 && t <= 57) ||
          (n && ((t >= 97 && t <= 122) || t === 95 || t === 45))
        ) {
          r += 1;
          continue;
        }
        let i = String.fromCodePoint(t),
          a = uj(i);
        if (!a && !wj.test(i)) break;
        ((n &&= a), (r += i.length));
      }
      return r;
    }
    function Ej(e, t, n) {
      let r = t;
      for (let t = 0; t < n.length; t++) {
        for (; t > 0 && r < e.length; ) {
          let t = String.fromCodePoint(e.codePointAt(r) ?? 0);
          if (!fj.test(t) || !uj(t)) break;
          r += t.length;
        }
        if (e[r] !== n[t]) return -1;
        r += 1;
      }
      return r;
    }
    var Dj = RegExp(`^[${BA}]*KEY(?:[${BA}]*BLOCK)?${UA}-{4}`),
      Oj = RegExp(
        `^[${BA}]*(?:K|KE|KEY[${BA}]*(?:B|BL|BLO|BLOC|BLOCK)?${UA}-{0,3})?$`,
      ),
      kj = 64,
      Aj = 6;
    function jj(e, t) {
      return ((Cj.lastIndex = t), Cj.exec(e), Cj.lastIndex);
    }
    function Mj(e, t, n) {
      let r = e.slice(t, t + kj).replace(dj(), "");
      return Dj.test(r) || ((!n || t + kj < e.length) && Oj.test(r));
    }
    var Nj = 15;
    function Pj(e, t, n) {
      let r = t;
      for (; r > 0 && t - r < Nj; ) {
        if (
          (e.charCodeAt(r - 1) !== 45 || e[r - 2] === "-" || e[r] === "-") &&
          !/[A-Za-z0-9_]/.test(e[r - 1]) &&
          !fj.test(e[r - 1])
        )
          return !1;
        --r;
      }
      return t - r >= Nj || !n;
    }
    function Fj(e, t, n, r = !1) {
      for (let i = t; i < n; i++) {
        if (e[i] !== "-") continue;
        let t = 0,
          n = i;
        for (; n < e.length; ) {
          let r = e.codePointAt(n) ?? 0;
          if (e[n] === "-") t++;
          else if (!uj(String.fromCodePoint(r))) break;
          n += r > 65535 ? 2 : 1;
        }
        if (
          t >= 4 &&
          (r ||
            !Sj.test(e[n] ?? "") ||
            Ej(e, n, "BEGIN") >= 0 ||
            Ej(e, n, "END") >= 0)
        )
          return i;
        i = n - 1;
      }
      return n;
    }
    var Ij = "\0";
    function Lj(e, t) {
      let n = 0,
        r = [],
        i = [],
        a = 0,
        o = 0;
      return {
        shadow: e.replace(dj(), (s, c) => {
          let l = c - n;
          n += s.length;
          let u =
              t !== void 0 && c > 0 && Sj.test(e[c - 1])
                ? t.slice(l, l + bj)
                : void 0,
            d =
              u !== void 0 && (yj.test(u) || (u.length === bj && xj.test(u)))
                ? Ij
                : "";
          return (
            (o += d.length),
            r.push(c - a + d.length),
            (a += s.length - d.length),
            i.push(a),
            d
          );
        }),
        edges: o,
        toRaw: (e) => {
          let t = 0,
            n = r.length;
          for (; t < n; ) {
            let i = (t + n) >>> 1;
            r[i] <= e ? (t = i + 1) : (n = i);
          }
          return t === 0 ? e : e + i[t - 1];
        },
      };
    }
    function Rj(e) {
      return Bj(e, !0).map(({ added: e, ...t }) => t);
    }
    function Bj(e, t, n = !0) {
      if (e.length > 262144) return [];
      let r = [],
        i = (e, t, n, i = !1) => {
          r.push({
            start: e,
            end: t,
            patternId: sj(n)?.id ?? "unknown",
            added: i,
          });
        };
      if (ij(e))
        for (let r of oj(e, t, n))
          i(r.index, r.index + r.value.length, r.value, r.added);
      if (vj(e)) {
        let r = (r) => {
          let { shadow: a, edges: o, toRaw: s } = Lj(e, r);
          if ((r === void 0 || o !== 0) && ij(a))
            for (let e of oj(a, t, n))
              i(
                s(e.index),
                s(e.index + e.value.length - 1) + 1,
                e.value,
                e.added,
              );
          return a;
        };
        r(r());
      }
      r.sort((e, t) => e.start - t.start);
      let a = [],
        o = (e, t) => {
          e.added && t > e.start && (e.inner = Math.min(e.inner ?? t, t));
        };
      for (let e of r) {
        let t = a[a.length - 1];
        t !== void 0 && e.start < t.end
          ? (o(t, e.start), (t.end = Math.max(t.end, e.end)))
          : a.push({ ...e });
      }
      let s = [],
        c = 0;
      for (let t of a) {
        let n = s[s.length - 1];
        n !== void 0 && t.start < c
          ? (o(n, t.start), (n.end = t.end))
          : (n !== void 0 && (n.end = Math.max(n.end, c)), s.push(t));
        let r = s[s.length - 1];
        r.patternId === "private_key"
          ? (c = r.end)
          : r.end >= c &&
            ((Cj.lastIndex = r.end),
            (c = r.end + (Cj.exec(e)?.[0].length ?? 0)));
      }
      let l = s[s.length - 1];
      return (
        l !== void 0 && (l.end = Math.max(l.end, c)),
        s.map(({ start: t, end: n, patternId: r, added: i, inner: a }) => ({
          start: t,
          end: n,
          value: e.slice(t, n),
          patternId: r,
          added: i,
          ...(a === void 0 ? {} : { keep: a - t }),
        }))
      );
    }
    return { Rj };
  })();
  // shared-38-DyF0_Fim.js
  const $c_shared_38_DyF0_Fim = (() => {
    var Xo = "data-code-line-group";
    return { Xo };
  })();
  // shared-33-DtdykY0y.js
  const $c_shared_33_DtdykY0y = (() => {
    function Mz(e, t = 1 / 0) {
      let n = 0;
      for (let r of e) {
        if (n++ >= t) break;
        let e = r.codePointAt(0) ?? 0;
        if (Nz(e)) return "rtl";
        if (Pz(e)) return "ltr";
      }
    }
    function Nz(e) {
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
    function Pz(e) {
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
    return { Mz };
  })();
  const f = $react_jsx_runtime_jsx;
  const Sn = $routines_shared_v4_shared_0_CnnWnVrT_M6;
  const h = $react_jsx_runtime_jsxs;
  const { e: gp } = $c_c8187a2dc_Dp9Zia_4;
  const { Rj: Nne } = $c_shared_92_BOgyxePb;
  const { Xo: Aoe } = $c_shared_38_DyF0_Fim;
  const { Mz: Id } = $c_shared_33_DtdykY0y;
  function yO(e) {
    return e.replace("text-body", "text-prose");
  }
  function bO() {
    return yO(
      "text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty",
    );
  }
  var HPe = RegExp(`(?=\\p{L})${Sn.source}`, "u"),
    UPe = 200,
    xO = /[\u202A-\u202E\u2066-\u2069]/g,
    WPe = /^(?:\s*(?:(?:https?:\/\/|www\.)\S*|[@/]\S*))+/i;
  function GPe(e) {
    return e.replace(xO, "").replace(WPe, "");
  }
  function SO(e) {
    return Id(GPe(e), 80) ?? Id(e.replace(xO, ""), 80);
  }
  function CO(e, t, n) {
    let r = e.items.map((e, n) =>
        h(
          "li",
          { children: [t(e.text, !0), e.children.map((e, n) => CO(e, t, n))] },
          n,
        ),
      ),
      i = SO(e.items[0]?.text ?? "");
    return e.ordered
      ? f(
          "ol",
          {
            dir: i,
            start: e.start === 1 ? void 0 : e.start,
            className: `epitaxy-user-list ${bO()}`,
            children: r,
          },
          n,
        )
      : f(
          "ul",
          { dir: i, className: `epitaxy-user-list ${bO()}`, children: r },
          n,
        );
  }
  function KPe(e, t) {
    let n = e.split(/(?<=\n)/);
    return n.length === 1 ||
      n.length > UPe ||
      e.length > 262144 ||
      Nne(e).some(({ value: e }) =>
        e.includes(`
`),
      )
      ? t(e, !0)
      : n.map((e, n) =>
          f(
            "span",
            { className: `block ${gp}`, [Aoe]: "", children: t(e, n === 0) },
            n,
          ),
        );
  }
  function wO(e, t, n) {
    if (e.kind === "list") return CO(e.list, n, t);
    let r =
      e.text === "" ||
      e.text.endsWith(`
`)
        ? `${e.text}\n`
        : e.text;
    return f(
      "p",
      {
        className: `${bO()} ${gp}`,
        children: HPe.test(r) ? KPe(r, n) : n(r, !0),
      },
      t,
    );
  }
  return { wO };
})();
// shared-11-CNsu0Zu8.js
const { ri: sideChatTextBreaks } = (() => {
  const c = $react_jsx_runtime_jsx;
  const u = $react_jsx_runtime_jsxs;
  const h = $react_Fragment;
  function ri(e, t = (e) => e) {
    let n = e.split(/\r\n?|\n/);
    return n.length === 1
      ? t(e)
      : n.map((e, n) => u(h, { children: [n > 0 && c("br", {}), t(e)] }, n));
  }
  return { ri };
})();

export { renderSideChatUserSegment, sideChatTextBreaks };
