// cds-core (production): the merged Claude Desktop 4.16336.0 CDS graph, 146 roots and one Context owner, generated
// into src/generated/cds-core so host code can import it through src/cds-core.mjs. The graph itself (modules, roots,
// features, linkExports, carried statements, local framework adapters) is the reviewed config of
// extract-cds-pilot-v4.mjs, imported here, never copied; the same pins (analysis/.../cds-pilot/pins.json) gate the
// snapshot through preflight() and the output through prove(). Only the output location, the host adapter file and the
// shared-graph role differ:
//   - output src/generated/cds-core, provenance.json and manifest.json beside the modules (checked by --check);
//   - adapter src/cds-core-adapter.mjs, the reviewed pilot adapter with only its host-growthbook import specifier
//     re-pointed (pins.productionAdapter): the vendor's React / JSX / ReactDOM boundaries i / ce / be resolve to the
//     host's single react, react/jsx-runtime, react-dom, and the GrowthBook readers shared-0 Rx / shared-25 wg to
//     app/src/host-growthbook.mjs;
//   - sharedGraph null: this is the shared graph, it imports none (the 3.6556.2 view-tabs graph is never read);
//   - publicNames: the 107 semantic roots (pins.roots: owner 12 + five wave-2 lanes + cds-wave3-final +
//     cds-surface-additions) and the 12 Contexts below, so 4.16336.0 area generators can name `sharedGraph: 'cds-core'`
//     and import them as `../cds-core/<target>`. Stage-3 names are appended after the 64 earlier ones;
//   - wave 4 (pins.merge.wave4.publicNames, cds-integrate/merge-pins-wave4.mjs): 288 names appended after those 119 in
//     publication order: cds-wave4 states (5 hooks, 244 module states the owner held without a name: D46), utils (16),
//     components (17 roots, 4 Contexts; useCdsMode / CdsOwnerWindowContext kept once) and the states-review writers
//     setCdsLazyImportInterceptor / setCdsFitOptOutPredicate with their variables. Each is a pinned root, Context
//     (contexts below) or published module state (pins.publicStates, declaration re-checked by preflight);
//   - wave 5 (pins.merge.wave5.publicNames, cds-integrate/merge-pins-wave5.mjs): 50 names appended after those 407 in lane
//     order (cds-wave5, D1 convergence): every module state two or more area graphs sliced, with its writers / readers
//     and the states they bring along, the 12 large pure message tables and vitePreload. Each is a pinned published
//     binding (pins.publicBindings, declaration re-checked by preflight), exported under its own local (linkExports);
//   - wave 5b (pins.merge.wave5b.publicNames, cds-integrate/merge-pins-wave5b.mjs): 96 names appended after the wave-5
//     ones in lane order (cds-wave5b, the regions batch 3+4 needs): the module states those regions sliced with their
//     writers, the D46 vendor-frame states, the Base UI combobox entries code-routines requested, the coachmark and three
//     pure helpers. Each is a pinned published binding (pins.publicBindings), exported under its own local (linkExports).
//   - wave 6 (pins.merge.wave6.publicNames, cds-integrate/merge-pins-wave6.mjs): 1765 names appended after the wave-5b ones in
//     lane order (cds-wave6): the shared-layer module state two or more graphs slice or will slice (the titlebar-frame
//     Contexts / caches routines-shared-v4 held unnamed, the nav-plan rows, the account2 transcript-cluster requests) and the
//     module state their closures bring along, 84 new chunks. Each is a pinned published binding (pins.publicBindings),
//     exported under its own local (linkExports).
//   - wave 7 (pins.merge.wave7.publicNames, cds-integrate/merge-pins-wave7.mjs): names appended after the wave-6 ones in lane
//     order (cds-wave7): the writers region graphs assigned cds-core state through (write integrity), the vendor-zod state
//     unit with its guarded globals (their two official initializers carried: pins.merge.wave7.decisionChanges), the
//     round-3 requests and the module state their closures bring along. Each is a pinned published binding
//     (pins.publicBindings), exported under its own local (linkExports).
//   - wave 8 (pins.merge.wave8.publicNames, cds-integrate/merge-pins-wave8.mjs): names appended after the wave-7 ones in lane
//     order (cds-wave8): the frame-sidebar-nav import-write writers, the official o11y runtime (pre-init Datadog SDK,
//     consent-closed event logging), frame store shared-92 Y, the zod schemas and the module state their closures bring
//     along (vendor-datadog and two official lazy chunks, pins.dynamicImports). Each is a pinned published binding
//     (pins.publicBindings), exported under its own local (linkExports).
//   - wave 8s (pins.merge.wave8s.publicNames, cds-integrate/merge-pins-wave8s.mjs): names appended after the wave-8 ones in
//     fragment order (wave-8 settings addendum, round4/settings): the module state, W7-D1 writers and shared code the
//     official settings pages and shell reach (D1 single holder for the settings lanes), with the chunks they live in.
//     Each is a pinned published binding (pins.publicBindings), exported under its own local (linkExports).
//   - wave 8a (pins.merge.wave8a.publicNames, cds-integrate/merge-pins-wave8a.mjs, stage 11a): names appended after the
//     wave-8s ones in fragment order (cds-wave8 addendum A, W8A; real-tree replay over wave 8s, decision R4-K1): the
//     identity-sensitive module-load values (Symbol / class / object / call results; the shared-25 _H family) the owner
//     already held unpublished while frame-sidebar-nav sliced a second copy. Each is a pinned published binding
//     (pins.publicBindings), exported under its own local (linkExports).
//   - wave 8b (pins.merge.wave8b.publicNames, cds-integrate/merge-pins-wave8b.mjs, stage 12b): names appended after the
//     wave-8a ones in fragment order (round-4 addendum B; real-tree replay, decision R4-K1): module state consumer graphs
//     need (shared-8 Y_ / bv, c227f4d5e tE), the writer shared-4 MC of published state and the held identity values shared-92
//     oS / sS (the settings-lane overlaps are linked under their wave-8s names). Each is a pinned published binding, exported
//     under its own local.
//   - wave 8c (pins.merge.wave8c.publicNames, cds-integrate/merge-pins-wave8c.mjs, stage 13c): names appended after the
//     wave-8b ones in fragment order (round-4 addendum C; real-tree replay, decision R4-K1): the PerformanceMetrics context
//     shared-4 rO, the composer element registry shared-4 eD, the main-pane occlusion store shared-26 BH, the x_ consumer
//     shared-25 w_ (writer) and the timing cache shared-0 Es (identity value). Each is a pinned published binding, exported
//     under its own local.
//   - wave 8d (pins.merge.wave8d.publicNames, cds-integrate/merge-pins-wave8d.mjs, stage 14d): names appended after the
//     wave-8c ones in fragment order (round-4 addendum D, R4-Q1; real-tree replay over addendum C, decision R4-K1): the
//     session-presets latch shared-39 Pu (writer of state_shared39_ju) and the module state of its closure (shared-39 $l / eu /
//     nu / Mu / kc / Su, writers cu / ru / wu, the shared-25 Mz context). The settings line's shared-62 AS / shared-25 ki are
//     wave-8s names already (settings_shared62_AS / settings_shared25_ki): dropped on replay (fragment droppedOnReplay), linked.
//     Each is a pinned published binding, exported under its own local.
//   - wave cc2 (pins.merge.wavecc2.publicNames, cds-integrate/merge-pins-wavecc2.mjs, stage 15cc): names appended after the
//     wave-8d ones in fragment order (chat-cowork-1to1-20261117 r2 Core step): base-ui Menu.CheckboxItem vendor-frame Fp
//     (BaseMenuCheckboxItem), the UserMessage compound shared-3 Bd (UserMessage) and the module state its closure brings
//     along (shared-2 km / zm / Bm / W8 / G8 / Q8 / Y5 / X5, shared-3 ll). Each is a pinned published binding, exported under
//     its own local.
// Edit this file or the pilot config, never src/generated/cds-core.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSlicer, readSource, featureText, assertFeatures } from "./extract-working-line.mjs";
import * as official from "./official-4.16336.0.mjs";
import { config as pilotConfig } from "./extract-cds-pilot-v4.mjs";
import { preflight, prove, sha, pins } from "../../analysis/claude-4.16336.0-migrate-20261104/cds-pilot/provenance.mjs";

const app = path.resolve(import.meta.dirname, "..");
const generatedRoot = path.join(app, "src/generated");
// Spelled out: prepare-style-compatibility.mjs finds an area's owner by this literal.
export const output = path.join(app, "src/generated/cds-core");
export const adapterPath = path.join(app, "src/cds-core-adapter.mjs");

// Contexts read through one CdsRoot (tests/cds-core-v4-merged.test.mjs traces them by identity on the real server
// dispatcher). Each declaration and its provider site are checked against the snapshot before it is published.
export const contexts = {
  CdsDensityContext: { file: official.sharedFrame, local: "Da", features: ['Da = et("comfortable")'], provider: ["xo", ["density:", "Da.Provider"]] },
  CdsLocaleContext: { file: official.sharedFrame, local: "Wa", features: ["Wa = et(void 0)"], provider: ["xo", ["locale:", "Wa.Provider"]] },
  CdsLabelsContext: { file: official.sharedFrame, local: "ui", features: ["ui = et(void 0)"], provider: ["xo", ["labels:", "ui.Provider"]] },
  CdsRouterContext: { file: official.sharedFrame, local: "Ci", features: ["Ci = et(void 0)"], provider: ["xo", ["router:", "Ci.Provider"]] },
  CdsFizzyLakePartsContext: { file: official.sharedFrame, local: "rr", features: ["rr = et(void 0)"], provider: ["xo", ["fizzyLake?.parts", "rr.Provider"]] },
  CdsTooltipDelayContext: { file: official.sharedFrame, local: "hm", features: ["hm = et(null)"], provider: ["_m", ["delay:", "hm.Provider"]] },
  CdsDirectionContext: { file: official.vendorFrame, local: "Yn", features: ["Yn = C(void 0)"], provider: ["Zn", ['direction: t = "ltr"', "Yn.Provider"]] },
  // wave 3 (pins.contexts, cds-integrate/merge-pins-wave3.mjs): cds-surface-additions' four, cds-wave3-final's icon size.
  CdsButtonIconSizeContext: { file: official.sharedFrame, local: "Ku", features: ["Ku = et(void 0)"], provider: ["Xu", ["Ku.Provider"]] },
  CdsButtonGroupContext: { file: official.sharedFrame, local: "zu", features: ["zu = et(null)"], provider: ["mj", ["zu.Provider"]] },
  CdsTooltipDeferralContext: { file: official.sharedFrame, local: "eu", features: ["eu = et(null)"], provider: ["tu", ["eu.Provider"]] },
  CdsTooltipImplContext: { file: official.sharedFrame, local: "Pl", features: ["Pl = et(null)"], provider: ["pm", ["Pl.Provider"]] },
  // No 4.16336.0 module renders this Context's Provider (only cfe7c4b3b reads it); the reader is pinned instead.
  ViewTabIconSizeContext: { file: "cd9e4c7f2-CKPq1wry.js", local: "n", features: ['n = e("xs")'], provider: null, reader: ["r", ["return t(n)"]] },
  // wave 4 (pins.contexts, cds-integrate/merge-pins-wave4.mjs): cds-wave4/components' four. CdsOwnerWindowContext and
  // SessionsMenuContext are provided outside cds-core (official chunks render their Provider); their pinned reader is checked.
  CdsOwnerWindowContext: { file: official.sharedFrame, local: "Ga", features: ["Ga = et(void 0)"], provider: null, reader: ["fo", ["return X(Ga);"]] },
  SessionsMenuContext: { file: "cc18d27d7-CJQ6OnqZ.js", local: "j", features: ["j = r(null)"], provider: null, reader: ["L", ['"More options for {chatName}"']] },
  CdsTableDividersContext: { file: "c51c45b79-CoF599cL.js", local: "O", features: ['O = s("border")'], provider: ["k", ["O.Provider"]] },
  CdsTableRowLinkContext: { file: "c51c45b79-CoF599cL.js", local: "X", features: ["X = s(null)"], provider: ["J", ["X.Provider"]] },
};
const stage3 = new Set([...(pins.merge.wave3?.roots ?? []), ...(pins.merge.wave3?.contexts ?? [])]);
const wave4 = pins.merge.wave4?.publicNames ?? [];
const stage4 = new Set(wave4.map((e) => e.name));
const wave5 = pins.merge.wave5?.publicNames ?? [];
for (const e of wave5) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-5 name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-5 name ${e.name} is already published`);
}
const stage5 = new Set(wave5.map((e) => e.name));
const wave5b = pins.merge.wave5b?.publicNames ?? [];
for (const e of wave5b) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-5b name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-5b name ${e.name} is already published`);
}
const stage5b = new Set(wave5b.map((e) => e.name));
const wave6 = pins.merge.wave6?.publicNames ?? [];
for (const e of wave6) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-6 name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-6 name ${e.name} is already published`);
}
const stage6 = new Set(wave6.map((e) => e.name));
const wave7 = pins.merge.wave7?.publicNames ?? [];
for (const e of wave7) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-7 name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-7 name ${e.name} is already published`);
}
const stage7 = new Set(wave7.map((e) => e.name));
const wave8 = pins.merge.wave8?.publicNames ?? [];
for (const e of wave8) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8 name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8 name ${e.name} is already published`);
}
const stage8 = new Set(wave8.map((e) => e.name));
const wave8s = pins.merge.wave8s?.publicNames ?? [];
for (const e of wave8s) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8s name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8s name ${e.name} is already published`);
}
const stage8s = new Set(wave8s.map((e) => e.name));
const wave8a = pins.merge.wave8a?.publicNames ?? [];
for (const e of wave8a) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8a name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || stage8s.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8a name ${e.name} is already published`);
}
const stage8a = new Set(wave8a.map((e) => e.name));
const wave8b = pins.merge.wave8b?.publicNames ?? [];
for (const e of wave8b) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8b name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || stage8s.has(e.name) || stage8a.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8b name ${e.name} is already published`);
}
const stage8b = new Set(wave8b.map((e) => e.name));
const wave8c = pins.merge.wave8c?.publicNames ?? [];
for (const e of wave8c) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8c name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || stage8s.has(e.name) || stage8a.has(e.name) || stage8b.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8c name ${e.name} is already published`);
}
const stage8c = new Set(wave8c.map((e) => e.name));
const wave8d = pins.merge.wave8d?.publicNames ?? [];
for (const e of wave8d) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-8d name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || stage8s.has(e.name) || stage8a.has(e.name) || stage8b.has(e.name) || stage8c.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-8d name ${e.name} is already published`);
}
const stage8d = new Set(wave8d.map((e) => e.name));
// wave cc2 (pins.merge.wavecc2.publicNames, cds-integrate/merge-pins-wavecc2.mjs, stage 15cc; chat-cowork-1to1-20261117 r2 Core
// step): base-ui Menu.CheckboxItem (vendor-frame Fp), the UserMessage compound (shared-3 Bd) and its closure's module state.
const wavecc2 = pins.merge.wavecc2?.publicNames ?? [];
for (const e of wavecc2) {
  const pin = e.kind === "binding" ? pins.publicBindings?.[e.name] : null;
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-cc2 name ${e.name} is not pinned as a published binding ${e.file}#${e.local}`);
  if (stage4.has(e.name) || stage5.has(e.name) || stage5b.has(e.name) || stage6.has(e.name) || stage7.has(e.name) || stage8.has(e.name) || stage8s.has(e.name) || stage8a.has(e.name) || stage8b.has(e.name) || stage8c.has(e.name) || stage8d.has(e.name) || pins.roots[e.name] || contexts[e.name]) throw Error(`cds-core wave-cc2 name ${e.name} is already published`);
}

// Earlier roots, earlier Contexts, then the stage-3 roots and Contexts (so the 64 existing names keep their order), then
// the wave-4 names in their pinned publication order (so the 119 existing names keep theirs), then the wave-5 names (so
// the 407 existing names keep theirs), then the wave-5b names (so the 457 wave-5 names keep theirs), then the wave-6 names
// (so the 553 wave-5b names keep theirs), then the wave-7 names (so the 2300 wave-6 names keep theirs), then the wave-8 names
// (so the 2377 wave-7 names keep theirs), then the wave-8s names (so the 2530 wave-8 names keep theirs), then the wave-8a
// names (so the 2927 wave-8s names keep theirs), then the wave-8b names (so the 3187 wave-8a names keep theirs), then the
// wave-8c names (so the 3193 wave-8b names keep theirs), then the wave-8d names (so the 3198 wave-8c names keep theirs), then
// the wave-cc2 names (so the 3209 wave-8d names keep theirs).
const named = [
  ...Object.entries(pins.roots).map(([name, root]) => [name, { file: root.file, local: root.local }]),
  ...Object.entries(contexts).map(([name, c]) => [name, { file: c.file, local: c.local }]),
].filter(([n]) => !stage4.has(n));
for (const e of wave4) {
  const pin = e.kind === "root" ? pins.roots[e.name] : e.kind === "context" ? pins.contexts?.[e.name] : pins.publicStates?.[e.name];
  if (!pin || pin.file !== e.file || pin.local !== e.local) throw Error(`cds-core wave-4 name ${e.name} is not pinned as ${e.kind} ${e.file}#${e.local}`);
  if (e.kind === "context" && !contexts[e.name]) throw Error(`cds-core wave-4 Context ${e.name} has no contexts entry`);
}
const publicNames = Object.fromEntries([...named.filter(([n]) => !stage3.has(n)), ...named.filter(([n]) => stage3.has(n)),
  ...wave4.map((e) => [e.name, { file: e.file, local: e.local }]), ...wave5.map((e) => [e.name, { file: e.file, local: e.local }]),
  ...wave5b.map((e) => [e.name, { file: e.file, local: e.local }]), ...wave6.map((e) => [e.name, { file: e.file, local: e.local }]),
  ...wave7.map((e) => [e.name, { file: e.file, local: e.local }]), ...wave8.map((e) => [e.name, { file: e.file, local: e.local }]),
  ...wave8s.map((e) => [e.name, { file: e.file, local: e.local }]), ...wave8a.map((e) => [e.name, { file: e.file, local: e.local }]),
  ...wave8b.map((e) => [e.name, { file: e.file, local: e.local }]), ...wave8c.map((e) => [e.name, { file: e.file, local: e.local }]),
  ...wave8d.map((e) => [e.name, { file: e.file, local: e.local }]), ...wavecc2.map((e) => [e.name, { file: e.file, local: e.local }])]);

async function checkContexts() {
  const cache = new Map(), proof = {};
  for (const [name, c] of Object.entries(contexts)) {
    const src = await readSource(c.file, cache, official.ionSource);
    const site = c.provider ?? c.reader;
    const entry = src.top.get(c.local), reader = src.top.get(site[0]);
    if (entry?.kind !== "var" || !reader || reader.kind === "import") throw Error(`cds-core context ${name}: ${c.file}#${c.local} is not a declaration`);
    assertFeatures(`cds-core context ${name}`, await featureText(src, entry), c.features);
    assertFeatures(`cds-core context ${name} ${c.provider ? "provider" : "reader"} ${site[0]}`, await featureText(src, reader), site[1]);
    const n = entry.node, r = reader.node;
    proof[name] = { file: c.file, local: c.local, start: n.start, end: n.end, sha256: sha(src.code.slice(n.start, n.end)),
      ...(c.provider ? { provider: c.provider[0] } : { provider: null, reader: c.reader[0] }), features: [...c.features, ...site[1]] };
    // Stage-3 Contexts were pinned by their lanes (declaration and provider hashes): the snapshot must still match.
    const pin = pins.contexts?.[name];
    if (pin && (pin.file !== c.file || pin.local !== c.local || pin.start !== n.start || pin.end !== n.end || pin.sha256 !== proof[name].sha256 ||
        (pin.provider ? pin.provider.local !== site[0] || pin.provider.sha256 !== sha(src.code.slice(r.start, r.end)) : c.provider !== null) ||
        // wave 4: a provider-less pin also pins its reader's declaration.
        (!pin.provider && pin.reader?.sha256 && (pin.reader.local !== site[0] || pin.reader.sha256 !== sha(src.code.slice(r.start, r.end))))))
      throw Error(`cds-core context ${name} differs from pins.contexts`);
  }
  return proof;
}

export const config = {
  ...pilotConfig,
  name: "cds-core v4",
  generator: "extract-cds-core-v4.mjs",
  generatedRoot,
  output,
  adapterModule: "../../cds-core-adapter.mjs",
  adapterFile: "src/cds-core-adapter.mjs",
  sharedGraph: null,
  publicNames,
};

export async function extract(options = {}) {
  await preflight(official);
  // The production adapter must stay the reviewed boundary: the pinned pilot adapter with only the host-growthbook import
  // specifier re-pointed (pins.productionAdapter, cds-integrate/merge-pins-wave3.mjs).
  const adapterSha256 = sha(await fs.readFile(adapterPath));
  if (adapterSha256 !== (pins.productionAdapter?.sha256 ?? pins.adapter.sha256)) throw Error("src/cds-core-adapter.mjs differs from the reviewed framework adapter");
  const contextProof = await checkContexts();
  return runSlicer({
    ...config,
    async artifacts(manifest) {
      if (manifest.publicAssets.length) throw Error("cds-core: unexpected public assets");
      const proof = await prove(manifest, official, adapterPath);
      proof.generator = `scripts/${config.generator}`;
      proof.graphConfig = "scripts/extract-cds-pilot-v4.mjs config (modules, roots, features, linkExports, carryStatements, localAdapters)";
      proof.adapter = { file: config.adapterFile, sha256: adapterSha256, reviewed: pins.adapter, production: pins.productionAdapter ?? null };
      proof.publicNames = manifest.publicNames;
      proof.contexts = contextProof;
      return { "provenance.json": JSON.stringify(proof, null, 2) + "\n" };
    },
  }, options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extract({ check: process.argv.includes("--check"), dryRun: process.argv.includes("--dry-run") });
