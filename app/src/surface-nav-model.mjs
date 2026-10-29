// w13-surfaces-nav (+ merged w13-coworkui-sidebar, E57): the Chat / Cowork sidebar navigation rows, as
// 3.6556.2 computes them in shared-21-R7LldJ05.js `bH` from the item table `hH` and the gate set it builds.
// Plain model (no React): source-sidebar.jsx renders the rows; Code mode keeps its own table there.
//
// hH order (only the entries whose `modes` include chat or cowork, plus customize, which has no `modes`):
//   projects          modes ["chat","cowork"]                 no gate
//   cowork-artifacts  gate "cowork-artifacts", modes ["cowork"]
//   artifacts-chorus  gate "artifacts-chorus", modes ["cowork"] (`i && !a`: needs the web build, a = desktop)
//   scheduled         gate "scheduled", modes ["cowork","code"]
//   arborio           gate "arborio" (`E && !a`, web only, ant badge)
//   routines-chorus / code-projects-chorus / code-upsell-chorus (chorus account gates, `A && j.usable ...`)
//   dispatch          gate "dispatch", modes ["cowork"]          (`r && a`, r = $p() GrowthBook __gb__90773941)
//   artifacts         gate "artifacts", modes ["chat"]
//   design            gate "design", modes ["chat","cowork"]     (`I !== null`, I = EV(t, a))
//   security / library / teachers / iggy / connect               (account, GrowthBook or internal gates)
//   customize         { id: "customize", surface: "customize", icon: "Tool", label: dH.customize }
//
// Gate values on this host (bH, desktop: `a = Lt()` = shared-25 cc() is true):
//   scheduled         `u && l.add("scheduled")`, u = `t === "code" ? c.codeEnabled : c.coworkEnabled || l`
//                     (l = Rp() = shared-18 UH: cloud scheduled tasks, remote -> false): the local coworkEnabled.
//   artifacts         `i && l.add("artifacts")`, i = Jp() = shared-18 CH() `return !1` in the desktop bundle: off.
//   cowork-artifacts  `(k || (a && i)) && l.add("cowork-artifacts")`, k = Gc() = shared-78 SE():
//                     `e.coworkArtifacts === void 0 || e.coworkArtifacts.status === "supported"` (appFeatures): on,
//                     the local artifact library is that page.
//   design            I = EV(t, a) is null unless the claude.ai Design entry (xV eligible / showOnTabs) is served:
//                     not-applicable-host (no claude.ai account, E59), off.
//   dispatch, arborio, chorus rows, security, library, teachers, iggy, connect, artifacts-chorus: remote account,
//                     GrowthBook (default off, D29/D31) or web-only gates: not-applicable-host, off.
// Item filter (bH `ee`):
//   `n.modes !== void 0 && !n.modes.includes(t) && !r` with r = `P && n.id === "scheduled"`, P = Vs() = shared-78
//   lp() `C(ep) ?? np` (hub look backed, np = !1): so Scheduled never shows in chat.
//   `n.id === "projects" && t === "chat" && !Yc`, Yc = shared-52 tk
//   `globalThis.desktopBootFeatures?.chatIn3p?.status === "supported"`: the frame Chat surface with Projects is the
//   third-party-inference chat. OpenClaude's chat runs on the local kernel with no claude.ai account (E59), which
//   is that case, so chatIn3p defaults to true here.
// Badges: `r.id === "projects" && N && (y = "new-neutral")`, N = `O && M`, M = Nc() = shared-78 cp() `C($f) ?? tp`,
//   tp = !1 (hub look off): no badge on any Chat / Cowork row. `x = r.hideFromSidebar || (M && t !== "code" && !b)`
//   folds rows into "More" only under the hub look, so there is no More row either.
// The New row is not part of hH (shared-21 H8.new "New", OHLefiCsSJ): it stays first, as the sidebar draws it.
// Keys reuse the local section names: Scheduled opens `routines`, both Artifacts entries open `artifacts`.

const ITEMS = [
  { id: "projects", label: "Projects", icon: "Projects", key: "projects", modes: ["chat", "cowork"] },
  { id: "cowork-artifacts", label: "Artifacts", icon: "Artifacts", key: "artifacts", gate: "cowork-artifacts", modes: ["cowork"] },
  { id: "scheduled", label: "Scheduled", icon: "Clock", key: "routines", gate: "scheduled", modes: ["cowork", "code"] },
  { id: "dispatch", label: "Dispatch", icon: "Dispatch", key: "dispatch", gate: "dispatch", modes: ["cowork"] },
  { id: "artifacts", label: "Artifacts", icon: "Artifacts", key: "artifacts", gate: "artifacts", modes: ["chat"] },
  { id: "design", label: "Design", icon: "Palette", key: "design", gate: "design", modes: ["chat", "cowork"] },
  { id: "customize", label: "Customize", icon: "Tool", key: "customize" },
];

export const SURFACE_NAV_ITEMS = ITEMS;

/** bH's gate set for this host. Options exist so the official alternatives stay testable; defaults are the
 * desktop values documented above. */
export function surfaceNavGates({ coworkEnabled = false, chatArtifacts = false, coworkArtifacts = true, design = false, dispatch = false } = {}) {
  const gates = new Set();
  if (coworkEnabled === true) gates.add("scheduled");
  if (dispatch === true) gates.add("dispatch");
  if (chatArtifacts === true) gates.add("artifacts");
  if (coworkArtifacts === true || chatArtifacts === true) gates.add("cowork-artifacts");
  if (design === true) gates.add("design");
  return gates;
}

/** The Chat / Cowork navigation rows as `[label, icon, key]`, New first. Cowork rows exist only while Cowork is
 * available; otherwise desktopSurfaces (shared-78 mY) lists chat and code only and a cowork mode reads as the Chat
 * surface (resolveSurface), so it gets the Chat rows (w13-close-main-jsx-tests surfaces-nav-02). Other modes have no
 * rows here. */
export function surfaceNavRows(mode, options = {}) {
  if (mode !== "chat" && mode !== "cowork") return [];
  if (mode === "cowork" && options.coworkEnabled !== true) return surfaceNavRows("chat", options);
  const gates = surfaceNavGates(options);
  const chatIn3p = options.chatIn3p !== false;
  const rows = ITEMS.filter((item) => {
    if (item.gate !== undefined && !gates.has(item.gate)) return false;
    if (item.modes !== undefined && !item.modes.includes(mode)) return false;
    if (item.id === "projects" && mode === "chat" && !chatIn3p) return false;
    return true;
  }).map((item) => [item.label, item.icon, item.key]);
  return [["New", "Add", "new"], ...rows];
}
