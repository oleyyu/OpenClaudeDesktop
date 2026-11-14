// Original 4.16336.0 Preview link chooser decisions (c11959232-D8gLbLAI.js).
function Fp(e, t, n) {
  return t === e.url ? e : { url: t, settled: n, prompted: !1 };
}
function Ip(e) {
  return {
    canRoute: e.linksInPreview && e.infraOk,
    explicitReady: e.infraOk && e.paneOffered,
  };
}
function Lp(e) {
  return e.hasPendingUrl
    ? e.chooserOpen
      ? "hold"
      : e.explicit
        ? e.infraOk
          ? "dispatch"
          : "release"
        : !e.chooserSeen &&
            !e.alreadyPrompted &&
            e.settledAtUrlArrival &&
            e.linksInPreview &&
            e.infraOk
          ? "prompt"
          : e.linksInPreview && e.infraOk
            ? "dispatch"
            : e.cloudSession && !e.infraOk
              ? "release"
              : "none"
    : "none";
}
function Rp(e) {
  return e.explicit
    ? "keep"
    : e.confirmed
      ? e.inPreview
        ? "keep"
        : "release"
      : "drop";
}
export {
  Fp as linkArrival,
  Ip as linkCapabilities,
  Lp as linkDispatch,
  Rp as linkConfirmation,
};
