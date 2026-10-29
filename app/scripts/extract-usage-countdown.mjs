// Usage reset countdown (W12b, lane w12b-usage-notices): the live "Resets in …" of Claude 3.6556.2's Code usage-limit
// band, sliced from the official chunk without executing it (decision D0: own generator, own output folder
// src/generated/usage-countdown, own scripts/verify-gen-usage-countdown.mjs). The machinery is the working line's
// runSlicer (scripts/extract-working-line.mjs, shared with extract-transcript-rows.mjs; see its header for how a
// closure is resolved: host adapters, vendor-frame React, view-tabs public names, linked areas, listed chunks).
//
//   usage-countdown.mjs  c227f4d5e QF / $F / ZF: the band's reset text for a reached limit (tL `et = … y(QF,
//                        { resetsAtSeconds: _e, absolute: VI(_e, u) })`). $F ticks every second within the hour before
//                        the reset (YF = 36e5): "Resets in {duration}" (minutes, Intl unit "minute" short), under ten
//                        minutes (XF = 600 s) "Resets in {minutes}:{seconds}", at zero "Resetting…"; an hour or more
//                        out, or before the first client tick (the server snapshot is null), the absolute VI text.
//                        ZF is the notice card's context (aL `E(ZF.Provider, { value: !0, children: [T, D] })`): inside
//                        a card the ticking text is aria-hidden and the absolute time is read once (sr-only).
//   seconds-until.mjs    c93058e68 f (exported n, c227f4d5e Yp): whole seconds until a time, one store tick per second
//                        aligned to the target; null on the server.
//
// Linked, not sliced again (D1): shared-156 fK (c227f4d5e `cl`, the minute clock) is session-rail-sections'
// useMinuteNow; c93058e68's tick store helpers, which the working line's elapsed-clock.mjs slices without exporting,
// are pure functions and one inert subscription object, copied here (linkedCopies).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const C227 = 'c227f4d5e-B-FYKrwT.js', C930 = 'c93058e68-CMBi_EBm.js';

// react-intl useIntl / FormattedMessage over the local catalog (src/source-usage-countdown-adapters.jsx).
const adapters = {
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
};

// c93058e68 bindings the working line slices without exporting (elapsed-clock.mjs): pure helpers and an inert
// subscription; a second copy shares no state with the first.
const linkedCopies = Object.fromEntries([
  ['t', 'the millisecond constant 1e3'],
  ['i', 'the inert subscription for a null target ({ subscribe: () => () => void 0, getSnapshot: () => null })'],
  ['a', 'a pure modulo'],
  ['o', 'a pure delay to the next whole second'],
  ['s', 'a per-call timer loop (its timeout is local to each subscription)'],
  ['c', 'the null server snapshot'],
  ['l', 'a per-target store factory (no module state)'],
  ['u', 'the per-call hook over useSyncExternalStore'],
].map(([local, why]) => [`${C930}#${local}`, why]));

const modules = [
  { target: 'seconds-until.mjs', source: C930 },
  { target: 'usage-countdown.mjs', source: C227, internal: true,
    exports: { QF: 'UsageResetCountdown', ZF: 'UsageNoticeCardContext' },
    features: {
      QF: ['if (!I(ZF))', '"aria-hidden": "true"', 'inNoticeCard: !0', 'className: "sr-only", children: e.absolute'],
      ZF: ['ZF = H(!1)'],
    } },
];

// Original text the host follows but does not import (prettier form of the named top-level declaration).
const callSites = [
  { source: C227, binding: '$F', role: 'The countdown copy and its thresholds (YF one hour, XF ten minutes); aria-live off outside a card',
    features: ['s = o - cl()', 'c = s > 0 && s < YF', 'l = Yp(c ? o : null)', 'if (s >= YF || u === null)',
      'defaultMessage: "Resetting\\u2026", id: "26SvXGZRRO"', 'defaultMessage: "Resets in {minutes}:{seconds}"', 'id: "LE8RI8JdZv"',
      'minimumIntegerDigits: 2', 'defaultMessage: "Resets in {duration}"', 'id: "3UVgP+t08Q"', 'unit: "minute"', 'unitDisplay: "short"',
      'd = i ? void 0 : "off"', '"aria-live": d, className: "tabular-nums"'] },
  { source: C227, binding: 'YF', role: 'One hour (ms): within it the reset counts down', features: ['YF = 36e5'] },
  { source: C227, binding: 'XF', role: 'Ten minutes (s): under it minutes:seconds', features: ['XF = 600'] },
  { source: C227, binding: 'tL', role: 'The band puts QF in the reached limit\'s detail (host: usage-model.mjs composerUsageNotice countdown)',
    features: ['y(QF, { resetsAtSeconds: _e, absolute: VI(_e, u) })', 'J === "exceeded" && !Qe'] },
  { source: C227, binding: 'aL', role: 'The notice card provides ZF around its headline and detail (host: source-session-notices.jsx ssn-body)',
    features: ['E(ZF.Provider, { value: !0, children: [T, D] })'] },
];

export const USAGE_COUNTDOWN = {
  name: 'usage countdown', generator: 'extract-usage-countdown.mjs', output: path.join(root, 'src/generated/usage-countdown'),
  adapterModule: '../../source-usage-countdown-adapters.jsx', adapterFile: 'src/source-usage-countdown-adapters.jsx', adapters, modules, callSites,
  linkedCopies, linkedAreas: [{ area: 'working-line', modules: ['elapsed-clock.mjs'] }, { area: 'session-rail-sections', modules: ['minute-clock.mjs'] }],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractUsageCountdown(options) {
  return runSlicer(USAGE_COUNTDOWN, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractUsageCountdown({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
