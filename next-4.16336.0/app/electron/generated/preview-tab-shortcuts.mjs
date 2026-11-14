// Original 3.6556.2 native reopen/select/cycle key matchers and closed-tab history bounds (index.chunk-jPKPzV-P).
const qst = 25;
const Dun = 50;
const mci = 35e3;
function fli(e, t, n) {
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
function pli(e, t) {
  return t.enabled ? fli(e, t, !0) : "pass";
}
function Sli(e, t, n) {
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
function Dli(e, t) {
  if (e.type !== "keyDown" || !e.control || e.meta || e.alt) return "pass";
  let n = Oli(e, t.pageKeys ?? !1);
  return n === null ? "pass" : t.syntheticSuppressed ? "claim" : n;
}
function Oli(e, t) {
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
const kli = /^Digit[1-9]$/;
function Ali(e, t) {
  let n = Sli(e, t, (e) => kli.test(e.code));
  if (n !== "forward") return n;
  let r = Number(e.code.slice(5));
  return r === 9 ? -1 : r - 1;
}
function Lgi(e, t) {
  let n = Date.now();
  return (e.set(t, n), n + mci);
}
function Rgi(e, t, n, r = !0) {
  e.delete(t);
  let i = Date.now(),
    a = 0;
  for (let [t, n] of e) r && i - n >= 35e3 ? e.delete(t) : n > a && (a = n);
  return e.size === 0 ? i + 200 : Math.min(n, a + mci);
}
export {
  pli as reopenTabKey,
  Ali as selectTabKey,
  Dli as cycleTabKey,
  qst as closedTabsPerSession,
  Dun as closedTabSessions,
  Lgi as beginSyntheticInput,
  Rgi as endSyntheticInput,
};
