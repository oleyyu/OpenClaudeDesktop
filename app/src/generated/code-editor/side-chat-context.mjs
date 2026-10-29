// Original wire attachment serializer/parser and Unicode-safe selection limit.
import { neutralizeMentions as r } from "../r4e-findings/text-sanitize.mjs";
var oe = "<!-- attach -->";
var S = /\r\n?|[\n\u2028\u2029]/g;
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
var z9 = 1500;
function B9(e, t) {
  if (e.length <= t) return e;
  let n = e.charCodeAt(t - 1),
    r = n >= 55296 && n <= 56319 ? t - 1 : t;
  return `${e.slice(0, r)}\u2026`;
}
export {
  Se as sideChatContextQuestion,
  B as parseSideChatQuestion,
  z9 as sideChatContextLimit,
  B9 as truncateSideChatContext,
};
