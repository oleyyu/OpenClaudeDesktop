// Queued message bar (W14-code r7 r7c-01, plan-w14-code.md E84 / E95: the host's restatement of the 2.2553.1 bar —
// SourceQueuedMessages and its hand-copied .sqm-* rules — gives way to the original): the 3.6556.2 QueuedMessageBar a
// Code session shows above its composer while messages wait for the running turn, sliced without executing any desktop
// runtime (decision D0: own generator, own output folder src/generated/queued-bar, own
// scripts/verify-gen-queued-bar.mjs). The machinery is the working line's runSlicer (scripts/extract-working-line.mjs).
//
// Where it sits in the desktop (pinned below as a call site):
//   cc43287c9 epe  the session scope body's overlay `qc({entry: nc, pick: (e) => e.QueuedMessageBar, …, overlayHost:
//                  "EpitaxySessionScopeBody.QueuedMessageBar"})` — cf74bc599's export `VE as QueuedMessageBar`.
//   cf74bc599 VE   the bar: one entry is WE (the row `${br} px-lg select-none`: "{count} message queued", the preview _E,
//                  the sent mark wE, Send now UE — ArrowReturn ghost described by "Claude reads this message at its next
//                  step." — Edit in composer, Remove from queue); several are GE (the collapsed button "Next: {preview}",
//                  the expanded list with BE's sortable rows — dnd-kit, the ⋮ / context menu, the Reorder handle — and
//                  Clear all); the band `${Kv} ${exiting ? "epitaxy-band-exit" : ""}` (Kv = c0b46114c f, epitaxy-band-enter).
//
// Linked, not sliced again (D1): the Code transcript renderer's slices (scripts/code-transcript-links.json
// `linkExports['code-transcript']`: cbe8e060f u, c80ec48f8 Bt, c96d752d0 Ck, …) and every area it links; the band
// entry class from session-rail-changes (band-enter.mjs, c0b46114c f). The services are the renderer's adapters
// (intl, GrowthBook, …: CODE_TRANSCRIPT's), re-exported by src/source-queued-bar-adapter.jsx.
//
// What is not the original, and why (src/source-queued-bar-adapter.jsx):
//   - UE's note's assistant name (E83: the host's persona, QueuedBarMessage);
//   - the queue's per-entry engine state, read by the rows as stores of c6b8adeaf — the cancel in flight (Ti, `e in
//     t.inFlight`: the X busy "Removing…"), the promotion in flight (vi, `e in t.pending`: Send now busy "Sending…"), a
//     promotion accepted (yi) or landed (bi: the "sent" mark wE): the host's queue (lockedIds: an operation in flight on
//     the entry; steeringId: the entry being sent now) through QueuedBarStateContext; the host has no accepted / landed
//     promotion state while the entry is still listed, so no sent mark.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';
import { CODE_TRANSCRIPT } from './extract-code-transcript.mjs';

const root = path.resolve(import.meta.dirname, '..');
const CF7 = 'cf74bc599-CRYqipWN.js', C6B = 'c6b8adeaf-bLEQVSWL.js';
// The small rest of the bar's closure no other area slices, one module per chunk.
const CHUNKS = ['shared-6-sd9jbJqs.js', 'cbe8e060f-D1ntUCbQ.js', 'c80ec48f8-D2IVcRNS.js', 'c470fd30f-DNpeRaFd.js'];
const modules = [
  { target: 'queued-bar.mjs', source: CF7, internal: true, exports: { VE: 'QueuedMessageBar' },
    features: { VE: ['if (t === 0) return null;', 'r = e.lockedIds?.has(t.id) === !0,', 'o = r || !zE(t) ? void 0 : e.onSteer,',
      'o = `${Kv} ${a ? "epitaxy-band-exit" : ""}`,', 's("div", { className: o, inert: a, onAnimationEnd: c, children: n })'] } },
  ...CHUNKS.map((chunk) => ({ target: `queued-${chunk.replace(/\.js$/, '')}.mjs`, source: chunk })),
];
const localAdapters = {
  // c6b8adeaf's queue stores (see the header): the host's queue state of the entry.
  [`${C6B}#Ti`]: { name: 'useQueuedEntryRemoving', features: ['return q(J1($, 0, e) ? K1($, 0, e, (t) => e in t.inFlight) : $[1]);'] },
  [`${C6B}#vi`]: { name: 'useQueuedEntrySending', features: ['(t) => e in t.pending'] },
  [`${C6B}#yi`]: { name: 'useQueuedEntrySendAccepted', features: ['(t) => t.pending[e] === "accepted"'] },
  [`${C6B}#bi`]: { name: 'useQueuedEntrySendLanded', features: ['(t) => e !== null && e in t.landed'] },
};
// UE's note names the assistant (E83): its FormattedMessage is the host's persona wrapper (source-queued-bar-adapter.jsx
// QueuedBarMessage: "Claude reads this message at its next step." / "Stops Claude’s current response." read with the
// running core's assistant, as the host's bar said it); every other message of the bar reads through it unchanged.
const adapters = { ...CODE_TRANSCRIPT.adapters, [v3.vendorIntl]: { ...CODE_TRANSCRIPT.adapters[v3.vendorIntl],
  l: { ...CODE_TRANSCRIPT.adapters[v3.vendorIntl].l, name: 'QueuedBarMessage' } } };
const callSites = [
  { source: 'cc43287c9-Me-M2ucD.js', binding: 'epe', role: 'The session scope body\'s queued message bar overlay (cf74bc599 VE). Host: main.jsx (Code composer column) and source-btw-pane.jsx through src/source-queued-bar-adapter.jsx SourceQueuedBar',
    features: ['pick: (e) => e.QueuedMessageBar,', 'overlayHost: "EpitaxySessionScopeBody.QueuedMessageBar",'] },
];

export const QUEUED_BAR = {
  name: 'queued bar', generator: 'extract-queued-bar.mjs', output: path.join(root, 'src/generated/queued-bar'),
  adapterModule: '../../source-queued-bar-adapter.jsx', adapterFile: 'src/source-queued-bar-adapter.jsx', adapters,
  localAdapters: { ...CODE_TRANSCRIPT.localAdapters, ...localAdapters },
  modules, callSites, stateCopies: CODE_TRANSCRIPT.stateCopies, linkedCopies: CODE_TRANSCRIPT.linkedCopies,
  linkedAreas: [...CODE_TRANSCRIPT.linkedAreas, 'code-transcript',
    // c0b46114c f (the band entry, "epitaxy-band-enter") and shared-6 C_ (WE's `br`, the band accent classes;
    // W14-code r7 gen-final-7 D1): session-rail-changes' one copy of each.
    { area: 'session-rail-changes', modules: ['band-enter.mjs', 'branch-row-classes.mjs'] }],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractQueuedBar(options) {
  return runSlicer(QUEUED_BAR, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractQueuedBar({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
