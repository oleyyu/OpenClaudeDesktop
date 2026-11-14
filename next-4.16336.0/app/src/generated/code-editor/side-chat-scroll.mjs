// Original latest-user-turn scroll callback. Refs and per-session message store are supplied by the host.
var as = "epitaxy-user-turn";
const oy = as;
var MF = 8;
var NF = 4;
var PF = { el: null, sessionId: null, turns: 0, reply: !1, height: 0, view: 0 };
export function syncSideChatScroll(H, m, d, le) {
  let e = H.current;
  if (!e) return;
  let t = (m && d?.getState().messagesBySession[m]) || [],
    n = t.at(-1)?.role === "assistant",
    r = le.current;
  if (
    ((le.current = {
      el: e,
      sessionId: m,
      turns: t.length,
      reply: n,
      height: e.scrollHeight,
      view: e.clientHeight,
    }),
    n)
  ) {
    if (
      r.reply &&
      r.sessionId === m &&
      r.turns === t.length &&
      e.scrollTop + r.view < r.height - NF
    )
      return;
    let n = e.querySelectorAll(`.${oy}`),
      i = !!m && d?.getState().queuedBySession[m] !== void 0,
      a = n.item(n.length - (i ? 2 : 1));
    if (a) {
      let t =
        a.getBoundingClientRect().top -
        e.getBoundingClientRect().top +
        e.scrollTop -
        MF;
      e.scrollTo({ top: Math.max(e.scrollTop, t), behavior: "instant" });
      return;
    }
  }
  e.scrollTo({ top: e.scrollHeight, behavior: "instant" });
}
export { PF as emptySideChatScroll };
