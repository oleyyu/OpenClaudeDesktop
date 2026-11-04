// Effort control (W14-code round 6, lane composer: r6-composer-02 = css6-effort-slider = gates-r6-09): the Effort
// popover of Claude 3.6556.2, sliced from the official chunks without executing them (decision D0: own generator, own
// output folder src/generated/effort-control, own scripts/verify-gen-effort-control.mjs). The machinery is the working
// line's runSlicer (scripts/extract-working-line.mjs; see its header for how a closure is resolved: host adapters,
// vendor-frame React, view-tabs public names, linked areas, listed chunks).
//
//   effort-control.mjs  c8e04f916 S (exported EffortControl, the chunk shared-7 lw loads lazily): the CDS Popover
//                       (data-cds "ModelSelectorEffort") whose Popup is "isolate flex w-[220px] select-none flex-col
//                       gap-lg": the Title "shrink-0 text-muted" beside the value label b (the direction-aware swap with
//                       its four plus-lighter glow layers over the lazily loaded motion, shared-5 Gl; a plain truncated
//                       label under reduced motion or before the motion loads), the About effort PreviewCard (shared-156
//                       Ai, delay 200), Faster / Smarter, the CDS Slider c2d9b9a76 with the first non-warning badge as its
//                       mark, the warning note and the touch-only description. A disabled control with a reason shows
//                       only that reason (the `z !== void 0` branch).
//   slider.mjs          c2d9b9a76 y (exported t): the CDS Slider (track, fill, `overlay` inside the fill, stops, thumb,
//                       mark row) over Base UI's slider parts c69149ae7 (slider-parts.mjs) and ca597a055's clamp /
//                       number format (number-format.mjs).
//   lit-overlay.mjs     c227f4d5e P$ (the effortSliderOverlay R$ passes jw when the model's last effort option is
//                       ultracode, shared-28 Sg): y$ over b$ / _$, the webgl2 "charged" bed (shader i$, palettes n$,
//                       parameters r$), v$ outer bg-surface-3 / inner bg-alpha-2. It replaces the host's 2.2553.1 port
//                       (src/source-effort-lit.jsx, deleted).
//   vendor-frame.mjs    the Base UI internals the slider parts read that view-tabs holds without a public name.
//   shared-frame.mjs, shared-7.mjs: the small originals the closure reaches.
//
// Linked, not sliced again (D1): code-composer's chat-composer-frame (shared-frame Dn useOptionalEventCallback, Wa
// useCdsColorMode), chat-composer-presence (shared-5 kd presenceMotion over bd, which its Od loader fills) and
// owner-support (shared-25 mf); session-rail-kit's window-actions (shared-frame Mh useReducedMotion).
//
// vendor-frame's own React reads (R = c.useEffect, H = c.useMemo, K = me.jsx, Hl = the use-sync-external-store shim's
// export, which is React's own useSyncExternalStore on React 19) are local declarations over vendor-frame's bundled React
// module, so the closure would copy React itself; they are host adapters answering the app's React instead (the members
// those declarations name, src/source-composer-effort-adapter.jsx).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const VF = v3.vendorFrame, C227 = 'c227f4d5e-B-FYKrwT.js', C8E0 = 'c8e04f916-39YFkTtR.js';

const localAdapters = {
  [`${VF}#R`]: { name: 'useEffect', features: ['R = c.useEffect'] },
  [`${VF}#H`]: { name: 'useMemo', features: ['H = c.useMemo'] },
  [`${VF}#K`]: { name: 'jsx', features: ['K = me.jsx'] },
  [`${VF}#Hl`]: { name: 'useSyncExternalStore', features: ['Hl = e(Vl()).useSyncExternalStore'] },
};

// Module state view-tabs holds without a semantic name, copied with the reason a second copy splits nothing.
const stateCopies = {
  [`${VF}#Nf`]: 'a constant Set of the slider\'s navigation key names (ArrowUp…End), never mutated',
};

const modules = [
  { target: 'effort-control.mjs', source: C8E0, exports: { S: 'EffortControl' },
    features: { S: ['"data-cds": "ModelSelectorEffort"', '"isolate flex w-[220px] select-none flex-col gap-lg"', 'className: "shrink-0 text-muted"',
      'o("aboutEffort", "About effort")', 'o("faster", "Faster")', 'o("smarter", "Smarter")', 'showStops: !0,', 'overlay: je,',
      '"pointer-coarse:block text-pretty text-footnote text-muted hidden break-words"', 'delay: 200,'] } },
  { target: 'slider.mjs', source: 'c2d9b9a76-BQZJYoJ7.js' },
  { target: 'slider-parts.mjs', source: 'c69149ae7-zWDwNntF.js' },
  { target: 'number-format.mjs', source: 'ca597a055-CCgoQaOT.js' },
  { target: 'lit-overlay.mjs', source: C227, internal: true, exports: { P$: 'EffortSliderOverlay' },
    features: { P$: ['"epitaxy-root text-body text-primary break-words contents"', 'lit: e.atMax'] } },
  { target: 'vendor-frame.mjs', source: VF },
  { target: 'shared-frame.mjs', source: v3.sharedFrame },
  { target: 'shared-7.mjs', source: 'shared-7-DBAgAi5H.js' },
];

// Original text the host follows but does not import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'shared-7-DBAgAi5H.js', binding: 'jw', role: 'The ModelSelector effort wrapper: S gets options / activeEffortId / thinkingDescription / onPickEffort / open / onOpenChange / sliderOverlay / renderTrigger (host: source-composer.jsx SourceEffortPopover)',
    features: ['options: N,', 'activeEffortId: P,', 'thinkingDescription: U,', 'onPickEffort: M.pickEffort,', 'sliderOverlay: c,', 'renderTrigger: t,'] },
  { source: C227, binding: 'R$', role: 'The composer passes P$ as the effort slider overlay only when the model\'s last effort option is ultracode (shared-28 Sg)',
    features: ['J = Dd(re?.thinking?.effort_options?.at(-1)?.id) ? P$ : void 0', 'effortSliderOverlay: ie,'] },
];

export const EFFORT_CONTROL = {
  name: 'effort control', generator: 'extract-effort-control.mjs', output: path.join(root, 'src/generated/effort-control'),
  adapterModule: '../../source-composer-effort-adapter.jsx', adapterFile: 'src/source-composer-effort-adapter.jsx', adapters: {}, localAdapters, stateCopies,
  modules, callSites,
  linkedAreas: [
    // W14-code r6 gen-final-6 (D1): shared-frame qs (chain a handler with Ks) is transcript-rows' one shared copy. Listed
    // first, so a binding both areas export (Wa useCdsColorMode) stays code-composer's (the later listed area wins).
    { area: 'transcript-rows', modules: ['rows-shared-frame-6jtSkIit.mjs'] },
    { area: 'code-composer', modules: ['chat-composer-frame.mjs', 'chat-composer-presence.mjs', 'owner-support.mjs'] },
    { area: 'session-rail-kit', modules: ['window-actions.mjs'] },
  ],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [VF]: v3.reactAliases },
};
export function extractEffortControl(options) {
  return runSlicer(EFFORT_CONTROL, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractEffortControl({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
