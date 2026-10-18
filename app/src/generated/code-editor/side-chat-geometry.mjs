// Original panel placement, viewport rebasing, resize handles and cursors (2.42304.0).
function e({
  saved: e,
  anchor: n,
  viewport: r,
  topInset: i = 0,
  endInset: a = 0,
  rtl: o = !1,
}) {
  if (e) {
    let n = e.viewport ?? r,
      a = Math.max(280, Math.min(e.width, r.width - 32)),
      o = Math.max(160, Math.min(e.height, r.height - i - 32));
    return {
      width: a,
      height: o,
      left: t(e.left, e.width, a, n.width, r.width),
      top: t(e.top, e.height, o, n.height, r.height, i),
    };
  }
  let s = Math.max(160, Math.min(340, n ? n.height - 16 : r.height * 0.6));
  return n
    ? {
        width: 320,
        height: s,
        left: o
          ? Math.max(0, Math.min(n.left + a, r.width - 320))
          : Math.max(0, n.right - a - 320),
        top: Math.max(i, n.bottom - 8 - s),
      }
    : {
        width: 320,
        height: s,
        left: o
          ? Math.max(0, Math.min(24, r.width - 320))
          : Math.max(0, r.width - 320 - 24),
        top: Math.max(i, r.height - s - 88),
      };
}
function t(e, t, n, r, i, a = 0) {
  let o = r - e - t,
    s = o < e - a ? i - o - n : e;
  return Math.max(a, Math.min(s, i - n));
}
function sk(e) {
  return (e.n && e.w) || (e.s && e.e)
    ? "nwse-resize"
    : (e.n && e.e) || (e.s && e.w)
      ? "nesw-resize"
      : e.n || e.s
        ? "ns-resize"
        : "ew-resize";
}
const ck = [
  { edges: { n: !0 }, className: "-top-[3px] inset-x-[8px] h-[6px]" },
  { edges: { s: !0 }, className: "-bottom-[3px] inset-x-[8px] h-[6px]" },
  { edges: { w: !0 }, className: "-left-[3px] top-[8px] bottom-[8px] w-[6px]" },
  {
    edges: { e: !0 },
    className: "-right-[3px] top-[8px] bottom-[8px] w-[6px]",
  },
  {
    edges: { n: !0, w: !0 },
    className: "-top-[3px] -left-[3px] h-[8px] w-[8px]",
  },
  {
    edges: { n: !0, e: !0 },
    className: "-top-[3px] -right-[3px] h-[8px] w-[8px]",
  },
  {
    edges: { s: !0, w: !0 },
    className: "-bottom-[3px] -left-[3px] h-[8px] w-[8px]",
  },
  {
    edges: { s: !0, e: !0 },
    className: "-bottom-[3px] -right-[3px] h-[8px] w-[8px]",
  },
];
export {
  e as sideChatRect,
  sk as sideChatResizeCursor,
  ck as sideChatResizeHandles,
};
