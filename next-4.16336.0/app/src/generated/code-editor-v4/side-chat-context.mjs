// Original 4.16336.0 wire attachment question/parser (c4d199b75-BFt-qsGU.js) and Unicode-safe selection limit (c96d752d0-D9VB6ArX.js).
import { isHiddenCharacter as $r3b_tasks_invisible_character_isHiddenCharacter } from "../r3b-tasks/invisible-character.mjs";
import { Tl as $routines_shared_v4_shared_0_CnnWnVrT_Tl } from "../routines-shared-v4/shared-0-CnnWnVrT.mjs";
// c4d199b75-BFt-qsGU.js
const { Se: sideChatContextQuestion, B: parseSideChatQuestion } = (() => {
  // shared-212-BHMAi0oa.js
  const $c_shared_212_BHMAi0oa = (() => {
    const kv = $r3b_tasks_invisible_character_isHiddenCharacter;
    const z = $routines_shared_v4_shared_0_CnnWnVrT_Tl;
    var vv = /^[\s\u0085\u115F\u1160\u3164\uFFA0\u3002\u3001\uFF1F\uFF01]$/;
    var bv = z(() => /^\p{M}$/u);
    var xv = z(() => /^(?![\p{Lm}\p{Extended_Pictographic}])[\p{L}\p{N}]$/u);
    var Sv = z(() => /^\p{Me}$/u);
    function Av(e, t) {
      let n = e.charCodeAt(t - 1),
        r = e.charCodeAt(t - 2),
        i = n >= 56320 && n <= 57343 && r >= 55296 && r <= 56319;
      return e.slice(t - (i ? 2 : 1), t);
    }
    function jv(e, t) {
      let n = e.codePointAt(t);
      return n === void 0 ? "" : String.fromCodePoint(n);
    }
    function Nv(e, t) {
      return e[t + 1] === " ";
    }
    function Pv(e, t) {
      let n = t;
      for (; n > 0; ) {
        let t = Av(e, n);
        if (vv.test(t)) return !0;
        if (!kv(t)) return !1;
        n -= t.length;
      }
      return !0;
    }
    function Fv(e, t) {
      for (let n = t; ; ) {
        let t = jv(e, n);
        if (Sv().test(t)) return !0;
        if (t === "" || (!kv(t) && !bv().test(t))) return !1;
        n += t.length;
      }
    }
    function Iv(e, t, n) {
      return xv().test(n) && !kv(n) && !Fv(e, t + n.length);
    }
    function zv(e) {
      return Bv(e, !1);
    }
    function Bv(e, t) {
      if (!t)
        return e.replace(/@/g, (t, n) =>
          Pv(e, n) && !Nv(e, n) ? "\uFF20" : t,
        );
      let n = "",
        r = !0;
      for (let t = 0; t < e.length; ) {
        let i = jv(e, t);
        ((n += i === "@" && r ? "\uFF20" : i),
          vv.test(i) ? (r = !0) : r && Iv(e, t, i) && (r = !1),
          (t += i.length));
      }
      return n;
    }
    return { zv };
  })();
  const { zv: r } = $c_shared_212_BHMAi0oa;
  var oe = "<!-- attach -->",
    S = /\r\n?|[\n\u2028\u2029]/g;
  function C(e, t) {
    if (!e && !t) return oe;
    let n = e?.replace(S, " ");
    for (; n !== void 0 && /-->|\|/.test(n); ) n = n.replace(/-->|\|/g, "");
    return (
      (n = n === void 0 ? void 0 : r(n).trim()),
      `<!-- attach: ${[n, t ? `tab:${t}` : void 0].filter(Boolean).join(" | ")} -->`
    );
  }
  function w(e) {
    return r(e)
      .split(S)
      .map((e) => `> ${e}`).join(`
`);
  }
  function A(e, t, n) {
    return `${C(t, n)}\n${w(e)}`;
  }
  function Se(e, t) {
    return `${A(t)}\n\n${e}`;
  }
  var Ne =
    /^<!-- attach(?:: (.*?))?(?: \| tab:(\S+))? -->\n((?:>(?: |$).*\n?)+)\n*/gm;
  function B(e) {
    if (!e.includes("<!-- attach")) return { snippets: [], rest: e.trim() };
    let t = [];
    return {
      snippets: t,
      rest: e
        .replace(Ne, (e, n, r, i) => {
          let a = i
            .split(
              `
`,
            )
            .map((e) => e.replace(/^> ?/, ""))
            .join(
              `
`,
            )
            .trim();
          return (
            a &&
              t.push({
                text: a,
                label: n?.trim() || void 0,
                terminalTabId: r || void 0,
              }),
            ""
          );
        })
        .trim(),
    };
  }
  return { Se, B };
})();
// c96d752d0-D9VB6ArX.js
const { DTt: sideChatContextLimit, OTt: truncateSideChatContext } = (() => {
  var DTt = 1500;
  function OTt(e, t) {
    if (e.length <= t) return e;
    let n = e.charCodeAt(t - 1),
      r = n >= 55296 && n <= 56319 ? t - 1 : t;
    return `${e.slice(0, r)}\u2026`;
  }
  return { DTt, OTt };
})();

export {
  sideChatContextQuestion,
  parseSideChatQuestion,
  sideChatContextLimit,
  truncateSideChatContext,
};
