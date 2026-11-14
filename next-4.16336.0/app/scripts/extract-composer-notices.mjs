// Code composer notices (W14-code lane global, TR-H8 / shared-10): the notice stack above the 3.6556.2 Code composer,
// sliced from the official chunk without executing it (decision D0: own generator, own output folder
// src/generated/composer-notices, own scripts/verify-gen-composer-notices.mjs). The machinery is the working line's
// runSlicer (scripts/extract-working-line.mjs; see its header for how a closure is resolved: host adapters,
// vendor-frame React, view-tabs public names, linked areas, listed chunks).
//
//   composer-notices.mjs  shared-26 RM (exported Wr; data-cds="ChatComposerNotices"): the stack the Code session's
//                         notice region mounts (cc43287c9 Rde `p("div", { …{[Tr]: "", [du]: ""}, className: Nl,
//                         children: p(Os, { items: c, onDismiss: l }) })`). Each item is {key, content, dismissible,
//                         skipEnter}; a "banner" content is FM's CDS Banner (tone warning / neutral, role none, the
//                         composer calibration OM, "@container", the action and link as secondary CDS Buttons, the
//                         Dismiss ghost button); any other content renders itself (`p.render({ leaving })`). Entering
//                         and leaving items reveal / collapse (shared-1 Dd / Od), a leaving one stays for 300 ms, and
//                         the list is one polite live region (role status, aria-live polite, aria-atomic false).
//                         RM's helpers TM / EM / SM validate and filter the items (a banner needs a non-blank string
//                         copy; a malformed action, link or auxiliary is dropped).
//   shared-1.mjs          the composer dock's pieces RM / FM read: the masked-fade check yd (_d over the dock context,
//                         which code-composer slices), the reveal classes Dd / Od / kd / Ad, the dock attributes.
//   code-notice-slots.mjs W14-code r6 sleep lane: c227f4d5e's Code notice slot table — cI (the provider cc43287c9 Ide
//                         mounts as ID: register / unregister / setRegionMounted, `{notice: dI(t, n), early:
//                         !a.current}`), uI (a slot's registration hook; lI reports the slot's analytics id nI[e] to the
//                         visible-zone registry), tI / eI (the "inside the Code notice region" flag Ide provides as ete),
//                         mI (HD: the entries and setRegionMounted Rde reads), rI (VE: the slot order Rde lists them in),
//                         dI / fI (a per-opening entry stamped with the session it opened in); pY (Wm: a band's tail notice
//                         on the scope store), uY (the tail's pick: sleepNotice ?? refusalFallbackNotice ?? keepAwakeNotice
//                         ?? newerModelNotice) and lY (zm: the turn-tail telemetry placement wO reads).
//   code-band-row.mjs     shared-6 kT (c73f45bc3 rn): the band row c73f45bc3 e_ draws — shared-26 kM (ChatComposerBand, the
//                         CDS Banner with OM's calibration, exported from composer-notices.mjs) around an aria-atomic span
//                         with the caller's words class; a leaving row's dismiss is shared-0 nz (a no-op).
// Host stand-ins (src/source-code-notice-adapters.jsx): shared-1 wE (the session scope's hidden flag: never hidden here)
// and shared-2 RX (the visible-zone registry: nothing reads it here, D17).
//
// Linked, not sliced again (D1): shared-26 io (ChatComposerLayoutContext) and shared-1 hd / Sd (the dock context and
// group attribute) are code-composer's (OM reads io's startInset, _d reads hd); shared-frame Dn (the latest-callback
// hook) is code-composer's useOptionalEventCallback; shared-frame Mh (the reduced-motion hook RM reads to skip the
// exit hold) is session-rail-kit's useReducedMotion.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const S26 = 'shared-26-CGuBxVt9.js', S1 = 'shared-1-BJhqMmkf.js';

const adapters = {
  'shared-1-BJhqMmkf.js': { Cc: { name: 'useSessionScopeHidden', local: 'wE', features: ['return ss(x(yE), CE);'] } },
  'shared-2-TF8v67kg.js': { Ai: { name: 'useVisibleZoneKeys', local: 'RX', features: ['let t = { key: r, zone: e };'] } },
};
const modules = [
  { target: 'composer-notices.mjs', source: S26,
    exports: { RM: 'ChatComposerNotices', kM: 'ChatComposerBand' },
    features: {
      RM: ['"data-cds": "ChatComposerNotices"', 'role: "status",', '"aria-live": "polite",', '"aria-atomic": "false",', 'setTimeout(() => {', '}, 300);'],
    } },
  { target: 'shared-1.mjs', source: S1 },
  { target: 'code-notice-slots.mjs', source: 'c227f4d5e-B-FYKrwT.js',
    exports: { cI: 'CodeNoticeSlotsProvider', uI: 'useCodeNoticeSlot', tI: 'useInCodeNoticeRegion', eI: 'CodeNoticeRegionContext', mI: 'useCodeNoticeSlotEntries',
      rI: 'CODE_NOTICE_SLOT_ORDER', pY: 'useScopeStoreNotice', lY: 'TURN_TAIL_NOTICE_PLACEMENT', uY: 'tailSessionNotice' } },
  { target: 'code-band-row.mjs', source: 'shared-6-sd9jbJqs.js', exports: { kT: 'CodeBandRow' } },
  // (W14-code r6 gen-final-6, D1: shared-0 nz, the leaving row's no-op dismiss, is files-changes' noop.mjs, linked below;
  // this area's own shared-0.mjs copy is gone.)
];

// Original text the host follows but does not import (prettier form of the named top-level declaration).
const callSites = [
  { source: 'cc43287c9-Me-M2ucD.js', binding: 'Rde', role: 'The Code session mounts the stack in a dock-group div (shared-1 Sd "data-cds-dock-group", shared-6 yd "data-code-column-notices") with shared-6 bd\'s "-mb-1.5 compact:-mb-1.5 comfortable:-mb-2" (host: source-session-notices.jsx SourceSessionNotices)',
    features: ['p("div", { ref: a, ...u, className: Nl, children: p(Os, { items: c, onDismiss: l }) })', 'key: P7(t, r.id),', 'dismissible: r.onDismiss !== void 0 && r.dismissible,'] },
  { source: S26, binding: 'FM', role: 'A banner item: CDS Banner tone warning / neutral, role none, OM calibration, "@container", secondary CDS Button action and link, Dismiss when dismissible',
    features: ['let e = p.tone === "warning" ? "warning" : "neutral",', 'variant: "secondary",', 'className: "@container",', 'p.render({ leaving: i })'] },
];

export const COMPOSER_NOTICES = {
  name: 'composer notices', generator: 'extract-composer-notices.mjs', output: path.join(root, 'src/generated/composer-notices'),
  adapterModule: '../../source-code-notice-adapters.jsx', adapterFile: 'src/source-code-notice-adapters.jsx', adapters, modules, callSites,
  linkedAreas: [
    // W14-code r8 R8DC-01 (D1): the Cowork Scheduled page (extract-cowork-scheduled.mjs) slices shared-1 gd / vd (the dock
    // start-inset context, which no Code component provides, and its reader) and bd / kd / Ad (the dock card attribute and
    // classes) and exports every binding it holds; linked from there, not sliced again. Listed first, so code-composer
    // (below) keeps answering for the dock contexts both hold (shared-1 hd / Sd).
    // Not linked: cowork-scheduled's shared-26 module. Its OM / kM read that area's own copy of shared-26 io (the composer
    // layout context), not code-composer's ChatComposerLayoutContext the Code composer provides, so the band's calibration
    // would lose the composer's startInset; shared-26 DM / OM / kM stay sliced here over code-composer's io.
    { area: 'cowork-scheduled', modules: ['shared-1-BJhqMmkf.mjs'] },
    { area: 'code-composer', modules: ['chat-composer-layout.mjs', 'chat-composer-dock.mjs', 'chat-composer-frame.mjs'] },
    { area: 'session-rail-kit', modules: ['window-actions.mjs'] },
    { area: 'files-changes', modules: ['noop.mjs'] },
  ],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractComposerNotices(options) {
  return runSlicer(COMPOSER_NOTICES, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractComposerNotices({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
