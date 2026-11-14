// Original 4.16336.0 native reopen/select/cycle key matchers and closed-tab history bounds (index.chunk-Du-Wqi0E.js).
var fWi = 35e3;
function gGi(e, t, n) {
  return e.type !== "keyDown" ||
    !t.cmdPressed ||
    t.otherModifierPressed ||
    e.shift !== n ||
    e.alt ||
    e.key.toLowerCase() !== "t"
    ? "pass"
    : e.isAutoRepeat || t.syntheticSuppressed
      ? "claim"
      : "forward";
}
function vGi(e, t) {
  return t.enabled ? gGi(e, t, !0) : "pass";
}
function jGi(e, t, n) {
  return e.type !== "keyDown" ||
    !t.cmdPressed ||
    t.otherModifierPressed ||
    e.shift ||
    e.alt ||
    !n(e)
    ? "pass"
    : e.isAutoRepeat || t.syntheticSuppressed
      ? "claim"
      : "forward";
}
function LGi(e, t) {
  if (e.type !== "keyDown" || !e.control || e.meta || e.alt) return "pass";
  let n = RGi(e, t.pageKeys ?? !1);
  return n === null ? "pass" : t.syntheticSuppressed ? "claim" : n;
}
function RGi(e, t) {
  return e.key.toLowerCase() === "tab"
    ? e.shift
      ? "previous"
      : "next"
    : !t || e.shift
      ? null
      : e.key === "PageDown"
        ? "next"
        : e.key === "PageUp"
          ? "previous"
          : null;
}
var zGi = /^Digit[1-9]$/;
function BGi(e, t) {
  let n = jGi(e, t, (e) => zGi.test(e.code));
  if (n !== "forward") return n;
  let r = Number(e.code.slice(5));
  return r === 9 ? -1 : r - 1;
}
var iYi = 25;
var aYi = 50;
function s1i(e, t) {
  let n = Date.now();
  return (e.set(t, n), n + fWi);
}
function c1i(e, t, n, r = !0) {
  e.delete(t);
  let i = Date.now(),
    a = 0;
  for (let [t, n] of e) r && i - n >= 35e3 ? e.delete(t) : n > a && (a = n);
  return e.size === 0 ? i + 200 : Math.min(n, a + fWi);
}
export {
  vGi as reopenTabKey,
  BGi as selectTabKey,
  LGi as cycleTabKey,
  s1i as beginSyntheticInput,
  c1i as endSyntheticInput,
  iYi as closedTabsPerSession,
  aYi as closedTabSessions,
};
