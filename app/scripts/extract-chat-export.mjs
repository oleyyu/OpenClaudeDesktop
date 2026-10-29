// w13-chatfn-history (research/w13-chatfn.md H8, chatfn-47; review fix "Custom"): extract the 3.6556.2 date range the
// Settings › Privacy › Export data dialog shows for its "Custom" period, without executing any desktop runtime code
// (decision D0: own generator, own output folder src/generated/chat-export, own scripts/verify-gen-chat-export.mjs).
// The machinery is the working line's runSlicer (scripts/extract-working-line.mjs; see its header for how a closure is
// resolved: host adapters, vendor-frame React, view-tabs public names, linked areas, listed chunks).
//
//   date-range.mjs   c1751bc30 o (export r, cf400e6a4 SIe): whether a from / to pair is a valid range (both set, from not
//                    after to, each inside min / max); i / a, the out-of-range and from-after-to tests c71ba149d reads.
//                    c1751bc30's own `s` (shared-104 mm lazy loader of c71ba149d, "date_range_selector", skeleton
//                    height 68) is not sliced: the host imports the selector directly (no lazy chunk to load).
//   date-range-selector.mjs  c71ba149d u (export DateRangeSelector, cf400e6a4 qO): the "From" / "To" date fields in a
//                    `flex gap-md` row, each bounded by the other ("Must be on or before the end date" / "Must be on or
//                    after the start date", "Must be within the allowed range"), calendar labels "From, calendar" /
//                    "To, calendar".
//   date-field.mjs   cb499b8fa c (export t): the CDS Field around the date picker (label, error, description).
//
// Linked, not sliced again (D1): cff2bf6cb nu (export t), the date picker itself (react-aria's segmented date input and
// calendar popover), is cowork-scheduled's (its UpsertScheduledTaskModal reads it as `pr`); the CDS Field parts and the
// React Compiler helpers are view-tabs' public names. react-intl's useIntl / FormattedMessage (vendor-intl p / l) are
// the local catalog's (src/source-chat-export-adapters.jsx).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const C175 = 'c1751bc30-D9BmGCFy.js', C71B = 'c71ba149d-CFslfKFj.js', CB49 = 'cb499b8fa-BgRV8jkQ.js', CF40 = 'cf400e6a4-BID2ahY5.js';

const adapters = {
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
};

const modules = [
  { target: 'date-range.mjs', source: C175,
    exports: { o: 'isValidDateRange' },
    features: { o: ['!!(e && t) && !a(e, t) && !i(e, n, r) && !i(t, n, r)'] } },
  { target: 'date-field.mjs', source: CB49 },
  { target: 'date-range-selector.mjs', source: C71B,
    exports: { u: 'DateRangeSelector' },
    features: { u: ['defaultMessage: "From", id: "H9/0QD/PB9"', 'defaultMessage: "To", id: "xdBzfNZWw7"',
      'defaultMessage: "Must be on or before the end date"', 'defaultMessage: "Must be on or after the start date"',
      'defaultMessage: "Must be within the allowed range"', 'defaultMessage: "From, calendar"', 'defaultMessage: "To, calendar"',
      'className: "flex gap-md"', 'className: "flex-1"'] } },
];

// Original text the host follows but does not import (cf400e6a4, the export dialog).
const callSites = [
  { source: CF40, binding: 'lYe', role: 'The "Custom" period segment and the range under the period row (a member export: maxDate only)',
    features: ['{ value: "custom", label: t.formatMessage({ defaultMessage: "Custom", id: "Sjo1P44FYy" }) }',
      'f === "custom" && y(qO, { fromDate: r, toDate: a, onFromDateChange: i, onToDateChange: o, maxDate: c })'] },
  { source: CF40, binding: 'cYe', role: 'The range defaults (from 180 days before today, to today), its check, and the dates it sends',
    features: ['e.setDate(e.getDate() - 180)', 'p = l ?? c', 'm = d ?? s', '(e ? b : _) === "custom" && !SIe({ fromDate: p, toDate: m, minDate: e ? c : void 0, maxDate: s })',
      'r.conversations_start_date = new Date(`${p}T00:00:00`).toISOString();', 'e.setDate(e.getDate() + 1), (r.conversations_end_date = e.toISOString())',
      'customRangeInvalid: S,'] },
  { source: CF40, binding: 'uL', role: 'Export is disabled while the custom range is invalid', features: ['disabled: a.customRangeInvalid,', '"data-testid": "export-confirm-button"'] },
];

export const CHAT_EXPORT = {
  name: 'chat export', generator: 'extract-chat-export.mjs', output: path.join(root, 'src/generated/chat-export'),
  adapterModule: '../../source-chat-export-adapters.jsx', adapterFile: 'src/source-chat-export-adapters.jsx', adapters, modules, callSites,
  linkedAreas: [{ area: 'cowork-scheduled', modules: ['cff2bf6cb-PfnEo01t.mjs'] }],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};
export function extractChatExport(options) {
  return runSlicer(CHAT_EXPORT, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatExport({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
