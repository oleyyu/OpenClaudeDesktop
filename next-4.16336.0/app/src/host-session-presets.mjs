// cds-core wave 8d (round-4 addendum D, stage 13; ruling R4-Q1): the host boundaries of the official session-presets latch
// shared-39 Pu (the Au Provider that writes ju; mounted officially by shared-20 DC under the look providers) and its closure,
// which cds-core now holds once. cds-core binds three official declarations to the names below through cds-core-adapter.mjs
// (pins.localAdapterBoundaries); this module must stay free of module imports (merge-pins-wave8d.mjs refuses any).
//
//   shared-25 go  `function go(e){return ho(ro(),e)}` (useGrowthBookFeature: the evaluated feature {value, on, off, source}
//                 of the GrowthBookProvider client; read by shared-25 jo / ko, i.e. Pu's gate Ic and its served value r).
//                 The host has no GrowthBook client (ro() would be null and io() throws "Missing or invalid
//                 GrowthBookProvider"); the answer is frame-sidebar-host.jsx growthBookFeature, the host table
//                 HOST_GROWTHBOOK in the official result shape (listed key: source "force"; unlisted: "unknownFeature").
//   shared-25 Z   `Z=()=>{let e=_(Dz);if(!e)throw …"Must call inside CurrentAccountProvider"…;return e}` (useCurrentAccount,
//                 read by shared-39 Pc as `{activeOrganization:r}=bt()`). The host mounts no CurrentAccountProvider; the
//                 answer is frame-sidebar-host.jsx useCurrentAccount (main.jsx's local account: display_name, full_name,
//                 memberships [], activeOrganization null), the same record the sliced account tray reads.
//   shared-39 su  `function su(){return m(()=>…("./cd0cf5b5e-DJvJrkr3.js").then(e=>e.j),…)}` (the lazily loaded session
//                 environments chunk; reached only through Nu > mu > cu when Pc names an organization). cd0cf5b5e is not
//                 shipped in OpenClaude Desktop (pinning it brings shared-20 and c5272b93e along), so the answer is the
//                 official chunk-load failure: the promise rejects with a ChunkLoadError, cu's catch runs ou > iu and the
//                 latch takes its official gaveUp branch (the same answer frame-sidebar-nav gives its own su boundary,
//                 frame-sidebar-nav-host.jsx notShipped("loadEnvironmentDialogChunk")).
//
// go / Z: frame-sidebar-host.jsx installs its answers here at load, next to installHostWindowState (one answer per
// boundary); a member read before the host installed it throws instead of inventing one (the host-window-state.mjs cap()).
let answers = null;
export function installHostSessionPresets(table) { answers = table; }
function cap(name) {
  if (!answers || !Object.hasOwn(answers, name)) throw Error(`host session presets ${name} is not provided (frame-sidebar-host.jsx installs it)`);
  return answers[name];
}
export function hostUseGrowthBookFeature(key) { return cap("useGrowthBookFeature")(key); }
export function hostUseCurrentAccount() { return cap("useCurrentAccount")(); }
export function hostLoadEnvironmentDialogChunk() {
  return Promise.reject(Object.assign(Error("cds-core: the official lazy chunk cd0cf5b5e (session environments) is not shipped in OpenClaude Desktop"), { name: "ChunkLoadError" }));
}
