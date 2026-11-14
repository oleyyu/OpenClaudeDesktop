// Original 4.16336.0 side-chat latest-user-turn scroll callback (c9bd7af9c-Bvb7EG4D.js YN). Refs and the side-chat store are supplied by the host.

// c2fd10b8d-DEwP4IO5.js
const $c_c2fd10b8d_DEwP4IO5 = (() => {
  var gd = "epitaxy-user-turn";
  return { gd };
})();
const { gd: Tb } = $c_c2fd10b8d_DEwP4IO5;
var RN = 8;
var zN = 4;
var BN = { el: null, sessionId: null, turns: 0, reply: !1, height: 0, view: 0 };
export function syncSideChatScroll(N, d, s, ae) {
  let e = N.current;
  if (!e) return;
  let t = (d && s?.getState().messagesBySession[d]) || [],
    n = t.at(-1)?.role === "assistant",
    r = ae.current;
  if (
    ((ae.current = {
      el: e,
      sessionId: d,
      turns: t.length,
      reply: n,
      height: e.scrollHeight,
      view: e.clientHeight,
    }),
    n)
  ) {
    if (
      r.reply &&
      r.sessionId === d &&
      r.turns === t.length &&
      e.scrollTop + r.view < r.height - zN
    )
      return;
    let n = e.querySelectorAll(`.${Tb}`),
      i = !!d && s?.getState().queuedBySession[d] !== void 0,
      a = n.item(n.length - (i ? 2 : 1));
    if (a) {
      let t =
        a.getBoundingClientRect().top -
        e.getBoundingClientRect().top +
        e.scrollTop -
        RN;
      e.scrollTo({ top: Math.max(e.scrollTop, t), behavior: "instant" });
      return;
    }
  }
  e.scrollTo({ top: e.scrollHeight, behavior: "instant" });
}
export { BN as emptySideChatScroll };
