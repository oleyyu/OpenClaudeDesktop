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
import { createHash } from 'node:crypto';
import * as v3 from './official-3.6556.2.mjs';
import * as v4 from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

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

// ---- 4.16336.0 contract (scripts/official-4.16336.0.mjs) -> src/generated/chat-export-v4 (isolated graph) ----
//
// The same host surface (DateRangeSelector, isValidDateRange), sliced from the 4.16336.0 snapshot by the runSlicer engine
// with sharedGraph 'cds-core' (CDS names are cds-core's publicNames; a binding cds-core holds without a publicName is
// sliced again when pure, and stops generation when it is module state, D46). The roots kept their locals and their
// shape: c1751bc30 o (exported r), c71ba149d u (DateRangeSelector), cb499b8fa c (exported t), and the date picker
// cff2bf6cb nu (exported t). The date picker is no longer linked from cowork-scheduled (still 3.6556.2, region-plan
// resliceInsteadOfLink): it is sliced here from 4.16336.0's own cff2bf6cb (react-aria's segmented date input and calendar
// over Base UI's field / form state). Roots and call sites are located on the official AST: each must be the only
// top-level declaration of its chunk carrying its features, under the pinned local and export alias (locateRootsV4); the
// imports that tie the dialog to these chunks are pinned too.
//
// What 4.16336.0 changed around the host (record: analysis/claude-4.16336.0-migrate-20261104/regions/batch2a/chat-export):
//   - the export dialog moved: cf400e6a4 lYe / cYe / uL are G2e / U2e / LL (same props, same defaults and check, the
//     custom range still passes maxDate only outside audit logs, Export still disabled by customRangeInvalid).
//   - G2e first calls `Ou(mHe, !0)` (mHe = c1751bc30 n, the lazy selector's handle): a prefetch of the lazy chunk. The
//     host imports the selector directly, so there is nothing to prefetch (withheld, see roots.json).
//   - U2e keeps 3.6556.2 cYe's "File content" row unchanged (includeFileContent, GrowthBook data_export_skip_files,
//     `showIncludeFileContent: o && !e && !t`); LL calls `U2e({ isAuditLogs: !!e })` without ownDataOnly, so the
//     member dialog (`m && b(LL, {})`) shows it whenever the flag is on, in both releases. The host's local export has no
//     data_export_skip_files flag, so it does not offer the row (withheld, see roots.json).
//   - the date picker reaches shared-frame's composition-Enter guard (hn, exported Bp) and with it the WeakSet dn that
//     guard keeps: module state cds-core holds without a publicName (D46) -> generation stops until cds-core names it
//     (wave 4 states); --survey prints each conflict with the chain that reaches it.
export const CHAT_EXPORT_V4_OUTPUT = 'src/generated/chat-export-v4';
const V4 = {
  C175: 'c1751bc30-CvXSylS4.js', C71B: 'c71ba149d-BCmc0sgr.js', CB49: 'cb499b8fa-BHm49DAk.js', CF40: 'cf400e6a4-Czw_18bE.js', CFF2: 'cff2bf6cb-HE-LaYyC.js',
};
const adaptersV4 = {
  [v4.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
};
// vendor-frame's CommonJS React loader (i: `t.exports = r()`): Base UI's vendor-internal hooks read React through it, so a
// slice would carry a second React. The host's React instead, the same answer cds-core gives (src/cds-core-adapter.mjs
// loadHostReact, re-exported by src/source-chat-export-adapters.jsx).
const localAdaptersV4 = {
  [`${v4.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
};
// Roots: chunk -> local -> { name, alias (the chunk's own export alias), probe, features }. `probe` is an identifier or
// string text inside one of the features (prettier never changes it), used to pick candidate declarations before
// formatting them; uniqueness is decided on the features.
const rootsV4 = {
  [V4.C175]: { o: { name: 'isValidDateRange', alias: 'r', probe: 'minDate',
    features: ['{ fromDate: e, toDate: t, minDate: n, maxDate: r }', '!!(e && t) && !a(e, t) && !i(e, n, r) && !i(t, n, r)'] } },
  [V4.CB49]: { c: { name: 'DateField', alias: 't', probe: 'labelAccessory',
    features: ['labelAccessory: h,', 'e(o, { ...p, "aria-label": l })', 'e(n, { match: !0, role: "alert", children: f })', 'className: "flex items-center gap-xs"'] } },
  [V4.C71B]: { u: { name: 'DateRangeSelector', alias: 'DateRangeSelector', probe: 'H9/0QD/PB9',
    features: ['defaultMessage: "From", id: "H9/0QD/PB9"', 'defaultMessage: "To", id: "xdBzfNZWw7"',
      'defaultMessage: "Must be on or before the end date"', 'defaultMessage: "Must be on or after the start date"',
      'defaultMessage: "Must be within the allowed range"', 'defaultMessage: "From, calendar"', 'defaultMessage: "To, calendar"',
      'className: "flex gap-md"', 'className: "flex-1"'] } },
  [V4.CFF2]: { nu: { name: 'DatePicker', alias: 't', probe: 'locale', features: ['i(lu, { ...e })', 'i(sn, { locale: t, children: n })'] } },
};
const modulesV4 = [
  { target: 'date-range.mjs', source: V4.C175, exports: { o: 'isValidDateRange' }, features: { o: rootsV4[V4.C175].o.features } },
  { target: 'date-field.mjs', source: V4.CB49, exports: { c: 'DateField' }, features: { c: rootsV4[V4.CB49].c.features } },
  { target: 'date-range-selector.mjs', source: V4.C71B, exports: { u: 'DateRangeSelector' }, features: { u: rootsV4[V4.C71B].u.features } },
  // DatePicker (cff2bf6cb nu) is not sliced here since cds-core wave 5b: cff2bf6cb holds 69 module-state bindings (react-aria /
  // Base UI date-field state) cowork-scheduled-v4 also cuts; cowork-scheduled is their region owner (cds-wave5b
  // region-changes.json chat-export.link-date-picker), so date-field.mjs imports nu from cowork-scheduled-v4 (linkedAreas).
  // rootsV4 / importPinsV4 (cb499b8fa o -> cff2bf6cb t) still prove the linked DatePicker is the official one.
  // Pure bindings cds-core holds without a publicName (compiler helpers, Base UI field / form hooks, react-dom helpers),
  // sliced again (recorded per module as heldByViewTabs); module state among them stops generation (D46).
  // vendor-frame.mjs / rolldown-runtime.mjs are no longer listed (cds-core wave 5b): only DatePicker's cff2bf6cb closure
  // entered vendor-frame (Base UI internals) and the rolldown runtime, and that closure is now cowork-scheduled-v4's link.
  { target: 'shared-frame.mjs', source: v4.sharedFrame },
];
// Original text the host follows but does not import (cf400e6a4, the export dialog). Probes as above.
const callSitesV4 = [
  { source: V4.CF40, binding: 'G2e', probe: 'Sjo1P44FYy', role: 'The "Custom" period segment and the range under the period row (a member export: maxDate only)',
    features: ['{ value: "custom", label: t.formatMessage({ defaultMessage: "Custom", id: "Sjo1P44FYy" }) }',
      'f === "custom" && b(gHe, { fromDate: r, toDate: a, onFromDateChange: i, onToDateChange: o, maxDate: c })', 'Ou(mHe, !0);'] },
  { source: V4.CF40, binding: 'U2e', probe: 'conversations_start_date', role: 'The range defaults (from 180 days before today, to today), its check, and the dates it sends; "File content" behind data_export_skip_files, as in 3.6556.2 cYe',
    features: ['e.setDate(e.getDate() - 180)', '_ = p ?? f', 'v = h ?? d', 'O = (e ? w : S) === "custom" && !hHe({ fromDate: _, toDate: v, minDate: e ? f : void 0, maxDate: d })',
      'r.conversations_start_date = new Date(`${_}T00:00:00`).toISOString();', 'e.setDate(e.getDate() + 1), (r.conversations_end_date = e.toISOString())',
      'showIncludeFileContent: o && !e && !t,', 'customRangeInvalid: O,'] },
  { source: V4.CF40, binding: 'LL', probe: 'export-confirm-button', role: 'Export is disabled while the custom range is invalid',
    features: ['b(G2e, { form: a })', 'disabled: a.customRangeInvalid,', '"data-testid": "export-confirm-button"'] },
];
// Imports that tie the pieces together (chunk -> local -> [file, alias]).
const importPinsV4 = {
  [V4.C71B]: { a: [V4.CB49, 't'], o: [V4.C175, 'a'], s: [V4.C175, 'i'] },
  [V4.CB49]: { o: [V4.CFF2, 't'] },
  [V4.CF40]: { gHe: [V4.C175, 't'], hHe: [V4.C175, 'r'], mHe: [V4.C175, 'n'] },
};
// c1751bc30's lazy selector (s, exported t / n through c / l): the dialog's gHe is the lazily loaded c71ba149d
// DateRangeSelector; the host imports it directly instead (not sliced, pinned here).
const lazySelectorV4 = { chunk: V4.C175, local: 's', component: 'c', handle: 'l',
  features: ['id: "date_range_selector"', 'import("./c71ba149d-BCmc0sgr.js")', 'pick: (e) => e.DateRangeSelector', 'loading: () => t(n.Block, { height: 68 })'] };
const withheldV4 = {
  'c1751bc30-CvXSylS4.js#s': 'the lazy loader of c71ba149d (T2, skeleton height 68): the host imports DateRangeSelector directly',
  'cf400e6a4-Czw_18bE.js#G2e Ou(mHe, !0)': 'prefetch of that lazy chunk: nothing to prefetch on the host',
  'cf400e6a4-Czw_18bE.js#U2e includeFileContent': '"File content" (unchanged from 3.6556.2 cYe): shown when the GrowthBook flag data_export_skip_files is on outside audit logs (LL passes no ownDataOnly); the host\'s local export has nothing to do with that flag',
};
// (Since cds-core wave 5b the date picker's closure is cowork-scheduled-v4's link, so neither the vendor-frame loader above
// nor these globals are reached here any more; both stay declared, reviewed, for the contract they describe.)
// Platform globals the 4.16336.0 date picker reads that the engine's list does not carry (engine patch
// regions/batch2a/chat-export/patches/engine-extra-globals.patch adds cfg.extraGlobals; until then the engine stops on them).
const extraGlobalsV4 = {
  IS_REACT_ACT_ENVIRONMENT: 'react-aria live announcer (cff2bf6cb dn): announces at once in a test environment, read behind `typeof IS_REACT_ACT_ENVIRONMENT == "boolean"`',
  jest: 'the same announcer check: `typeof jest < "u"`',
  HTMLSelectElement: 'react-aria focus tracking (cff2bf6cb): `r instanceof HTMLSelectElement`, a platform DOM class',
  MessagePort: 'react-aria form reset (cff2bf6cb): `Z(window.event) instanceof MessagePort` tells a reset dispatched from a message, a platform class',
};
export const CHAT_EXPORT_V4 = {
  name: 'chat export (4.16336.0)', generator: 'extract-chat-export.mjs', output: path.join(root, CHAT_EXPORT_V4_OUTPUT),
  adapterModule: '../../source-chat-export-adapters.jsx', adapterFile: 'src/source-chat-export-adapters.jsx', adapters: adaptersV4, localAdapters: localAdaptersV4, modules: modulesV4,
  callSites: callSitesV4.map(({ probe, ...site }) => site), extraGlobals: extraGlobalsV4,
  sharedGraph: 'cds-core', generatedRoot: path.join(root, 'src/generated'),
  linkedAreas: [{ area: 'cowork-scheduled-v4', modules: ['cff2bf6cb-HE-LaYyC.mjs'] }],
  referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, source: v4.ionSource,
  vendor: { [v4.vendorFrame]: v4.reactAliases }, sourceContract: v4,
};
const sha256 = text => createHash('sha256').update(text).digest('hex');
const declarationEntries = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const hasFeatures = (label, text, features) => { try { assertFeatures(label, text, features); return true; } catch { return false; } };
// The one declaration of a chunk carrying `features` (candidates: declarations whose original text contains `probe`).
async function uniqueDeclaration(src, label, probe, features) {
  if (!/^[\w$/+.-]+$/.test(probe) || !features.some(feature => feature.includes(probe))) throw Error(`${label}: probe ${probe} is not a token of its features`);
  const hits = [];
  for (const entry of declarationEntries(src)) {
    if (!src.code.slice(entry.node.start, entry.node.end).includes(probe)) continue;
    if (hasFeatures(label, await featureText(src, entry), features)) hits.push(entry);
  }
  if (hits.length !== 1) throw Error(`${src.name} ${label}: ${hits.length} top-level declarations carry ${JSON.stringify(features)}, expected 1`);
  return { entry: hits[0], local: [...src.top].find(([, e]) => e === hits[0])[0] };
}
export async function locateRootsV4() {
  const cache = new Map(), read = name => readSource(name, cache, v4.ionSource);
  const roots = {}, callSites = {}, imports = {};
  for (const [chunk, locals] of Object.entries(rootsV4)) {
    const src = await read(chunk);
    for (const [local, root] of Object.entries(locals)) {
      const hit = await uniqueDeclaration(src, root.name, root.probe, root.features);
      if (hit.local !== local) throw Error(`${chunk} ${root.name}: the declaration is ${hit.local}, expected ${local}`);
      if (src.exported.get(root.alias) !== local) throw Error(`${chunk} ${root.name}: export ${root.alias} is ${src.exported.get(root.alias)}, expected ${local}`);
      roots[root.name] = { chunk, local, alias: root.alias, sha256: sha256(src.code.slice(hit.entry.node.start, hit.entry.node.end)) };
    }
  }
  for (const site of callSitesV4) {
    const src = await read(site.source);
    const hit = await uniqueDeclaration(src, `call site ${site.binding}`, site.probe, site.features);
    if (hit.local !== site.binding) throw Error(`${site.source} call site: the declaration is ${hit.local}, expected ${site.binding}`);
    callSites[site.binding] = { chunk: site.source, sha256: sha256(src.code.slice(hit.entry.node.start, hit.entry.node.end)) };
  }
  for (const [chunk, pins] of Object.entries(importPinsV4)) {
    const src = await read(chunk);
    for (const [local, [file, alias]] of Object.entries(pins)) {
      const entry = src.top.get(local);
      if (entry?.kind !== 'import' || entry.file !== file || entry.alias !== alias) throw Error(`${chunk}: ${local} is not ${file}:${alias}`);
      (imports[chunk] ??= {})[local] = `${file}:${alias}`;
    }
  }
  const c175 = await read(lazySelectorV4.chunk), lazy = c175.top.get(lazySelectorV4.local);
  if (lazy?.kind !== 'var') throw Error(`${lazySelectorV4.chunk}: ${lazySelectorV4.local} is not the lazy selector`);
  assertFeatures(`${lazySelectorV4.chunk} lazy selector ${lazySelectorV4.local}`, await featureText(c175, lazy), lazySelectorV4.features);
  if (c175.exported.get('t') !== lazySelectorV4.component || c175.exported.get('n') !== lazySelectorV4.handle) throw Error(`${lazySelectorV4.chunk}: t / n are not the lazy component / handle`);
  return { roots, callSites, imports, lazySelector: { chunk: lazySelectorV4.chunk, local: lazySelectorV4.local, sha256: sha256(c175.code.slice(lazy.node.start, lazy.node.end)) } };
}
function rootsJson(located) {
  return JSON.stringify({ referenceVersion: v4.referenceVersion, referenceSnapshot: v4.referenceSnapshot, ...located, withheld: withheldV4,
    extraGlobals: extraGlobalsV4, previous: { referenceVersion: v3.referenceVersion, output: 'src/generated/chat-export',
      roots: { isValidDateRange: 'c1751bc30-D9BmGCFy.js#o', DateRangeSelector: 'c71ba149d-CFslfKFj.js#u', DateField: 'cb499b8fa-BgRV8jkQ.js#c', DatePicker: 'cff2bf6cb-PfnEo01t.js#nu (linked from cowork-scheduled)' },
      callSites: { lYe: 'G2e', cYe: 'U2e', uL: 'LL' } } }, null, 2) + '\n';
}
// Module state cds-core holds without a publicName that the engine's own test (a module-level WeakMap / Map / Set, or a
// context made through an imported createContext) does not see, checked on the closure the engine selected:
//   - a context made inside the vendor chunk through its local alias of React's createContext (Base UI's
//     `Rm = C(Lm)`, `C = c.createContext`): a second copy is a second Provider / Consumer pair (D46);
//   - a module-level binding a selected declaration writes (shared-frame `un`, the composition-Enter timestamp): a second
//     copy keeps a second value.
// Each is a D46 conflict like the engine's: generation stops until cds-core names it.
async function heldStateV4(manifest) {
  const cache = new Map(), found = [];
  for (const m of manifest.modules) {
    if (!m.heldByViewTabs.length) continue;
    const src = await readSource(m.source, cache, v4.ionSource), held = new Set(m.heldByViewTabs);
    const createContextAlias = name => { const e = src.top.get(name); const init = e?.kind === 'var' ? e.node.init : null;
      return init?.type === 'MemberExpression' && !init.computed && init.property.name === 'createContext'; };
    for (const name of held) {
      const entry = src.top.get(name), init = entry?.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && ((init.callee.type === 'Identifier' && createContextAlias(init.callee.name))
        || (init.callee.type === 'MemberExpression' && !init.callee.computed && init.callee.property.name === 'createContext')))
        found.push({ module: m.target, file: m.source, binding: name, kind: 'context (local createContext)' });
    }
    const written = new Map();
    for (const { name } of m.bindings) {
      const entry = src.top.get(name), text = (entry.kind === 'var' ? 'var ' : '') + src.code.slice(entry.node.start, entry.node.end) + (entry.kind === 'var' ? ';' : '');
      babel.traverse(babel.babelParse(text, `${m.source}#${name}`, true), {
        'AssignmentExpression|UpdateExpression'(p) {
          const target = p.node.type === 'AssignmentExpression' ? p.node.left : p.node.argument;
          if (target.type === 'Identifier' && target.name !== name && held.has(target.name) && !p.scope.hasBinding(target.name)) written.set(target.name, name);
        },
      });
    }
    for (const [binding, by] of written) found.push({ module: m.target, file: m.source, binding, kind: `module-level binding written by ${by}` });
  }
  return found;
}
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };
export async function extractChatExportV4({ check = false, dryRun = false } = {}) {
  const located = await locateRootsV4();
  const cfg = { ...CHAT_EXPORT_V4, artifacts: () => ({ 'roots.json': rootsJson(located) }) };
  // The engine stops on the state it sees (D46); the closure it would emit is then checked for the state it does not.
  const planned = await quiet(() => runSlicer(cfg, { dryRun: true }));
  const unseen = await heldStateV4(planned);
  if (unseen.length) throw Error(`module state cds-core holds without a semantic name, unseen by the engine (add it to cds-core publicNames, D46):\n  ${unseen.map(s => `${s.module}: ${s.file}#${s.binding} (${s.kind})`).join('\n  ')}`);
  return dryRun ? runSlicer(cfg, { dryRun: true }) : runSlicer(cfg, { check });
}
// D46 survey (writes nothing): every state conflict of the 4.16336.0 contract, the engine's and those heldStateV4 finds
// on the closure (an exploration run of the same contract), each with its declaration text and the chain of declarations
// that reaches it. [] once cds-core names them all.
export async function surveyChatExportV4() {
  let message = null;
  try { await quiet(() => runSlicer(CHAT_EXPORT_V4, { dryRun: true })); } catch (error) { message = String(error.message); }
  const engine = message?.startsWith('module state cds-core holds without a semantic name')
    ? message.split('\n').slice(1).map(line => /^\s*([^:]+): ([^#\s]+)#([\w$]+)$/.exec(line)).filter(Boolean)
      .map(([, module, file, binding]) => ({ module, file, binding, kind: 'module state the engine detects (WeakMap / Map / Set / imported createContext)' }))
    : [];
  if (message !== null && !engine.length) return { stateConflicts: null, error: message };
  const before = process.env.WORKING_LINE_EXPLORE;
  globalThis.__exploreEdges = [];
  process.env.WORKING_LINE_EXPLORE = '1';
  let explored;
  try { explored = await quiet(() => runSlicer(CHAT_EXPORT_V4, { dryRun: true })); } finally {
    if (before === undefined) delete process.env.WORKING_LINE_EXPLORE; else process.env.WORKING_LINE_EXPLORE = before;
  }
  const parents = new Map();
  for (const [from, to] of globalThis.__exploreEdges) if (from && !parents.has(to)) parents.set(to, from);
  delete globalThis.__exploreEdges;
  const conflicts = [...engine, ...await heldStateV4(explored)];
  const cache = new Map(), stateConflicts = [];
  for (const { module, file, binding, kind } of conflicts) {
    const src = await readSource(file, cache, v4.ionSource), entry = src.top.get(binding);
    const reachedBy = [];
    for (let at = parents.get(`${file}#${binding}`); at && reachedBy.length < 64; at = parents.get(at)) reachedBy.push(at);
    stateConflicts.push({ binding: `${file}#${binding}`, module, kind, text: (entry.kind === 'var' ? 'var ' : '') + src.code.slice(entry.node.start, entry.node.end).slice(0, 400), reachedBy });
  }
  return { stateConflicts, error: message };
}
export const chatExportReleases = { '3.6556.2': extractChatExport, '4.16336.0': extractChatExportV4 };
// CLI: the 3.6556.2 production graph by default; --release=4.16336.0 (or --all) for the isolated 4.16336.0 graph;
// --survey prints the 4.16336.0 D46 state conflicts (nothing written).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const only = process.argv.find(arg => arg.startsWith('--release='))?.slice('--release='.length);
  if (only && !chatExportReleases[only]) throw Error(`unknown release ${only}`);
  if (process.argv.includes('--survey')) console.log(JSON.stringify(await surveyChatExportV4(), null, 2));
  else for (const [release, extract] of Object.entries(chatExportReleases)) if (only ? only === release : release === v3.referenceVersion || process.argv.includes('--all'))
    await extract({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}