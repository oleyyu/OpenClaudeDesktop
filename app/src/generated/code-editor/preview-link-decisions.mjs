// Original 3.6556.2 Preview link chooser decisions (c11959232-TLc_9Vpx).
function If(e, t, n) {
  return t === e.url ? e : { url: t, settled: n, prompted: !1 };
}
function Lf(e) {
  return {
    canRoute: e.linksInPreview && e.infraOk,
    explicitReady: e.infraOk && e.paneOffered,
  };
}
function Rf(e) {
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
function zf(e) {
  return e.explicit
    ? "keep"
    : e.confirmed
      ? e.inPreview
        ? "keep"
        : "release"
      : "drop";
}
export {
  If as linkArrival,
  Lf as linkCapabilities,
  Rf as linkDispatch,
  zf as linkConfirmation,
};
