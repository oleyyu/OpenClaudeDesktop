// W14-code r8 gates-r8-02: the host's appFeatures table, the answer the 3.6556.2 desktop main process gives the renderer
// as `window.desktopBootFeatures` (asar index.chunk-jPKPzV-P bIr → `{...JU(), ...me}`, exposed by mainView.js
// contextBridge.exposeInMainWorld("desktopBootFeatures"), read by shared-78 `sC = window.desktopBootFeatures ?? null`
// into its appFeatures store U). Without an account the main process takes its 3P configuration (E81, data/w14code/gates/
// gaps.json); for this host that settles to:
//   sideSessions             nW(() => QU("sideSessions", () => Pb("2371478310"))), Hon `2371478310: {rule: "forced",
//                            value: !0}` → supported (E81; the local sidebar nests side sessions and forks under their
//                            parent).
//   nestedArchiveKeepsFamily nW(() => QU("nestedArchiveKeepsFamily", vjr)), `vjr = () => rjr() && Fb("2631345040", !0)`,
//                            rjr = Pb("2371478310") → supported (W14-code r4 closeout gates-r4-14).
//   chillingSlothFeat        the local Code engine (shared-78 xw reads a missing entry as supported too).
//   ccdLandingTools          the landing session's tools (shared-78 Ew, c5da7eb42 LR) → supported.
//   btwChildSessions         `rjr() && Pb("857846362")`, here the connected core's capability (electron/main.cjs coreInfo
//                            supportsBtwChildren): see hostAppFeatures(core).
// Every other entry is absent, which shared-78 oC and every `K()?.x?.status === "supported"` read as unavailable.
const supported = Object.freeze({ status: "supported" });
const unavailable = Object.freeze({ status: "unavailable" });
export const HOST_APP_FEATURES = Object.freeze({
  sideSessions: supported,
  nestedArchiveKeepsFamily: supported,
  chillingSlothFeat: supported,
  ccdLandingTools: supported,
});

/** The table with btwChildSessions answered for `core` (its capabilities.btwChildSessions). */
export function hostAppFeatures(core) {
  const btw = !!core && typeof core === "object" && core.capabilities?.btwChildSessions === true;
  return { ...HOST_APP_FEATURES, btwChildSessions: btw ? supported : unavailable };
}
