// Settings account pages (settings-account-v4, 4.16336.0): slices the official Settings › Privacy route from the frozen
// snapshot with the shared runSlicer engine (scripts/extract-working-line.mjs) under the 4.16336.0 source contract
// (scripts/official-4.16336.0.mjs), linked to the cds-core shared graph (sharedGraph 'cds-core') and, for the one
// settings modal store, to the settings-nav graph (linkedAreas { area: 'settings-nav', modules: ['settings-store.mjs'] }:
// shared-183 yg settingsModalStore is held back from cds-core, W8S-H3, and settings-nav exports it).
//
// Plan: analysis/claude-4.16336.0-migrate-20261104/round4/settings/design/plan.json split.lanes[C] (lane account):
//   data-privacy-controls  cf4f70727-BlN3pGWP.js#pn (settingsComponentsByPath, cf4f70727 In) → Ot = cc5f29bb3 t (F):
//                          the page computes the claude.ai rows' gates (export data, shared artifacts / chats, uploaded
//                          files, feedback, …) but in 4.16336.0 renders only `vd(SettingsStack) > div.pb-xl > ge`, the
//                          "where your conversations go" card (ge: shared-33 fl provider config, shared-1 It hybrid
//                          login, shared-62 St organizationsOwn). Desktop gate: pn `ue()` = shared-55 Kl (Zh) usePrivacySection
//                          → Zh: `e = Ct()` = shared-25 Mi (qB "raven") false without an organization → { show: true }.
//   usage                  c71860c77-DaFphJRS.js#ae — NOT rooted here (see USAGE_BLOCKED): its chart (cd138888b Ln →
//                          cddbfc1b6 ee → c0ce8f953 k) reaches framer-motion's frame clock vendor-motion F / Ie / Le,
//                          module state working-line-v4 holds without exporting and cds-core has not published (design
//                          cdsCore decisionsNeeded[0], vendor-motion 41). A second copy would split it (D1).
//   account                c71860c77-CDFXHgkP.js#q — official closed branch on desktop (shared-55 Kg lists no account
//                          entry; dv rewrites cowork → account only under useCoworkMergedIntoAccount): registered, not sliced.
//
// Cuts (below): only where cds-core holds the state an official hook writes and does not publish the writer (W7-D1
// write integrity): shared-62 Qk useServedDeploymentConfig writes cds-core's Zk, and is the reviewed host boundary every
// other graph answers the same way (frame-sidebar-nav W8-M6 classification b, cowork-scheduled-v4): the official
// no-organization branch. Every other claude.ai service the closure reads is official code over cds-core's published
// runtime (bridges read from globalThis["claude.settings"] / ["claude.web"] at module load are absent on this host: the
// official no-bridge branches). Roots are located on the official AST: each must be the only top-level declaration of its chunk carrying
// all its features (re-proved on every run), and its declaration hash and export alias must equal the pins.
//
// pins (scripts/settings-account-v4-pins.json) are a reviewed input: this generator never writes them. The review step
// is analysis/claude-4.16336.0-migrate-20261104/round4/settings/account/tools/pin.mjs (refuses to overwrite without
// --replace). `node scripts/extract-settings-account-v4.mjs` writes src/generated/settings-account-v4; `--check` compares
// byte for byte (scripts/verify-gen-settings-account.mjs, found by prepare-ui); `--dry-run` writes nothing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';
import * as official from './official-4.16336.0.mjs';

const appRoot = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const generatedRoot = path.join(appRoot, 'src/generated');
export const output = path.join(generatedRoot, 'settings-account-v4');
export const pinsFile = path.join(import.meta.dirname, 'settings-account-v4-pins.json');
export const adapterFile = 'src/settings-account-adapter.mjs';
export const ROUTES = 'cf4f70727-BlN3pGWP.js';
export const PRIVACY = 'cc5f29bb3-CYhM9-2J.js';

export const roots = [
  { semantic: 'SettingsPrivacyPage', file: ROUTES, local: 'pn', export: null, oldCounterpart: '3.6556.2 host page src/source-settings-privacy.jsx (Export data row, w13-chatfn-history)',
    features: ['"/admin-settings/data-privacy-controls"', '"/settings"'] },
];

// Registered official routes this lane owns but does not slice (report: pages).
export const USAGE_BLOCKED = Object.freeze({ route: 'usage', root: 'c71860c77-DaFphJRS.js#ae',
  blockedBy: ['vendor-motion-Ba5cqrBN.js#F', 'vendor-motion-Ba5cqrBN.js#Ie', 'vendor-motion-Ba5cqrBN.js#Le'],
  heldBy: 'working-line-v4 (not exported)', path: 'ae > ee > ie > Q > V > c71860c77 P (cd138888b Ln) > Tn > B > rt > cddbfc1b6 ee > J > h > c0ce8f953 k > O > b > y > n > vendor-motion F' });
export const ACCOUNT_CLOSED = Object.freeze({ route: 'account', root: 'c71860c77-CDFXHgkP.js#q', gate: 'shared-55 Kg: no account entry on desktop' });

// Host adapter contract (src/settings-account-adapter.mjs). in: the chunk whose top-level binding is cut (local cut).
export const cuts = [
  // shared-62 Qk (reached by cc5f29bb3 ge `x()` = shared-62 St (GY) → jA → bA = Qk): the served deployment config org
  // query; its effect writes Zk, which cds-core holds (cds-core does not publish Qk: W8S-H1).
  { in: 'shared-62-DoCqVpIq.js', local: 'Qk', name: 'useServedDeploymentConfig', features: ['data?.served', 'Zk = n'],
    contract: 'official no-organization branch (shared-62 LO asks = oe() && !!org uuid = false → served undefined): undefined; the same answer src/source-routine-cowork-adapters.jsx useServedDeploymentConfig gives frame-sidebar-nav / cowork-scheduled-v4 (defined in the .mjs adapter: node SSR tests cannot import the .jsx)' },
  // GrowthBook (the React-context readers shared-25 ko / Mo / Vo / Co / Do / Jo all go through ro and io): the host has no
  // GrowthBook client or provider; the one host table (src/host-growthbook.mjs) answers, the same two boundaries
  // frame-sidebar-nav cuts (scripts/extract-frame-sidebar-nav.mjs S25#ro useGrowthBookClient, S25#io growthBookEval).
  { in: 'shared-25-D-aF0gt9.js', local: 'ro', name: 'useGrowthBookClient', features: ['t = _(e === void 0 ? Jr : no);'],
    contract: 'no GrowthBook client: null (frame-sidebar-nav-host useGrowthBookClient)' },
  { in: 'shared-25-D-aF0gt9.js', local: 'io', name: 'growthBookEval', features: ['"Missing or invalid GrowthBookProvider"', 'n.evalFeature(t)'],
    contract: 'HOST_GROWTHBOOK evaluation of the flag (listed: { value, on: value === true, source: "force" }; unlisted: the unknownFeature result, off), as frame-sidebar-nav-host growthBookEval' },
  // Privacy gates (shared-55): the claude.ai privacy rows' availability. pn reads Zh (ue, usePrivacySection); the page F
  // reads Xh (ie, uploaded files page) and Uh (ne, export-data permissions). Each starts claude.ai organization queries
  // (shared-92 EO → iO /api/organizations/{uuid}, shared-25 is …) before its branch; the host has no claude.ai account
  // service or app-root query providers, so the gate is answered with the value its official branch takes for the local
  // profile (no organization, GrowthBook from the host table).
  { in: 'shared-55-BRv2XBP7.js', local: 'Zh', name: 'usePrivacySection', features: ['a.canExportData && a.ownDataOnly', 'show: !0, isPending: !1'],
    contract: 'Zh: e = Ct() (shared-25 Mi, qB "raven") is false without an organization → the final branch { show: true, isPending: false }; the same answer settings-nav cuts usePrivacySection with (settings-shell-model capabilities.usePrivacySection)' },
  { in: 'shared-55-BRv2XBP7.js', local: 'Xh', name: 'usePrivacyUploadedFilesPage', features: ['"privacy_uploaded_files_page_main"', 'show: s, isPending: o.isPending'],
    contract: 'Xh(e = raven false): `if (!e) return { show: n, isPending: !1 }` with n = ht("privacy_uploaded_files_page_main"), not in the host GrowthBook table → { show: false, isPending: false }' },
  { in: 'shared-55-BRv2XBP7.js', local: 'Uh', name: 'useExportDataPermissions', features: ['ht("export_data")', 'ownDataOnly: c'],
    contract: 'Uh: e = ht("export_data") and t = ht("allow_member_data_export_rollout") are not in the host GrowthBook table (false) → canExportData = !s && e && … = false, ownDataOnly = t && … = false, isPending = t && … = false' },
  // pn's redirect inputs ($e, I): read only when the privacy section is hidden (`if (!e) …`); with Zh show:true pn renders
  // F. Both start claude.ai organization / boot reads (shared-92 XO /api/organizations/{uuid}/is_pure_usage_based through
  // the server cookies provider; shared-0 tt boot configuration), so each is answered with its official local-profile value.
  { in: 'cbcbc9460-BBUBkr-o.js', local: 'I', name: 'useAdminSettingsAvailable', features: ['return n ? !1 : e || t || r || i || a || o || s;'],
    contract: 'I: every operand is an organization admin permission or organization feature (EF org admin, gs calgary org billing, w(x/C/b/S) org feature sections, F torech OrganizationManage); the local profile has no organization → false' },
  { in: 'shared-123-1Hc1RTKl.js', local: 'PB', name: 'useServerGatesReady', features: ['let { serverGateNames: e } = tt(),', 'return e && e.length > 0 ? !0 : t;'],
    contract: 'PB: the host GrowthBook answers are local and synchronous, every gate answers its default from the first render → true (same answer as home-v4 useHomeServerGates and settings-nav useServerGatesLoaded)' },
  // ---- i18n (react-intl over the host catalog: cds-core-adapter useHostIntl / HostFormattedMessage), as settings-nav /
  // settings-pages-v4 cut their react-intl copies: no vendor-intl IntlProvider on the host, the host i18n answers. ----
  { in: 'vendor-intl-BJgYK7RA.js', local: 'q', name: 'useIntl', features: ['return (Mt(e), e);'], contract: 'host i18n (electron/i18n t/getLocale): formatMessage({defaultMessage,id}) / messages' },
  { in: 'vendor-intl-BJgYK7RA.js', local: 'Gt', name: 'FormattedMessage', features: ['(Wt, Ut)'], contract: 'host i18n: <FormattedMessage defaultMessage id values/>' },
];
export async function resolveCuts(cache = new Map()) {
  const localAdapters = {}, resolved = [];
  for (const cut of cuts) {
    const src = await readSource(cut.in, cache, official.ionSource);
    const decl = src.top.get(cut.local);
    if (!decl || decl.kind === 'import') throw Error(`settings-account cut ${cut.in}#${cut.local} is not a top-level declaration`);
    assertFeatures(`settings-account cut ${cut.name} (${cut.in}#${cut.local})`, await featureText(src, decl), cut.features);
    localAdapters[`${cut.in}#${cut.local}`] = { name: cut.name, features: cut.features };
    resolved.push({ name: cut.name, file: cut.in, local: cut.local, declarationSha256: sha(src.code.slice(decl.node.start, decl.node.end)), sourceSha256: sha(src.bytes) });
  }
  return { localAdapters, resolved };
}

const byFile = new Map();
for (const r of roots) {
  if (!byFile.has(r.file)) byFile.set(r.file, { exports: {}, features: {}, internal: false });
  const m = byFile.get(r.file);
  m.exports[r.local] = r.semantic; m.features[r.local] = r.features; if (r.export === null) m.internal = true;
}

// One generated module per chunk the closure enters (bindings cds-core publishes are linked, not sliced again).
const chunkTargets = [
  [ROUTES, 'routes.mjs'], [PRIVACY, 'privacy-page.mjs'],
  ['shared-frame-CJdE5Ria.js', 'shared-frame.mjs'], ['preload-helper-BBljBeZo.js', 'preload-helper.mjs'], ['vendor-query-Bl2Kfzgk.js', 'vendor-query.mjs'],
  ['vendor-all-0-uUCo-eCX.js', 'vendor-all-0.mjs'], ['shared-0-CnnWnVrT.js', 'shared-0.mjs'], ['vendor-zod-fszujTq6.js', 'vendor-zod.mjs'],
  ['vendor-router-Cs51FAGQ.js', 'vendor-router.mjs'], ['shared-25-D-aF0gt9.js', 'shared-25.mjs'], ['shared-92-BOgyxePb.js', 'shared-92.mjs'],
  ['shared-62-DoCqVpIq.js', 'shared-62.mjs'], ['shared-123-1Hc1RTKl.js', 'shared-123.mjs'], ['shared-153-DMw2VzSq.js', 'shared-153.mjs'],
  ['shared-212-BHMAi0oa.js', 'shared-212.mjs'], ['shared-55-BRv2XBP7.js', 'shared-55.mjs'], ['shared-5-u8kha2eH.js', 'shared-5.mjs'],
  ['shared-18-Cfqwgjc5.js', 'shared-18.mjs'], ['shared-183-B2N6Zy4J.js', 'shared-183.mjs'], ['shared-33-DtdykY0y.js', 'shared-33.mjs'],
  ['shared-19-UalAfDtn.js', 'shared-19.mjs'], ['shared-8-BqfCbkJd.js', 'shared-8.mjs'], ['shared-1-D1bGaTaN.js', 'shared-1.mjs'],
  ['cfa21a2d2-CBby0rmM.js', 'cfa21a2d2.mjs'], ['shared-23-BRmsPtuN.js', 'shared-23.mjs'], ['cbc28252c-BH4auGvp.js', 'cbc28252c.mjs'],
  ['cacb8a80b-hucBLKhm.js', 'cacb8a80b.mjs'],
];

export async function buildConfig(cache = new Map()) {
  const { localAdapters: cutAdapters, resolved } = await resolveCuts(cache);
  return { resolved, config: {
    name: 'settings-account-v4 (4.16336.0)', generator: 'scripts/extract-settings-account-v4.mjs',
    sourceContract: official, referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot,
    source: official.ionSource, vendor: { [official.vendorFrame]: official.reactAliases },
    generatedRoot, output,
    adapterModule: '../../settings-account-adapter.mjs', adapterFile,
    sharedGraph: 'cds-core',
    linkedAreas: [{ area: 'settings-nav', modules: ['settings-store.mjs'] }], adapters: {},
    // Pure shared-183 bindings settings-nav settings-store.mjs slices without exporting (no module state; the settings
    // route helpers pn / cc5f29bb3 reach through the store's subpath and route builders). Sliced again here.
    linkedCopies: {
      'shared-183-B2N6Zy4J.js#v_': 'pure: joins encoded subpath segments',
      'shared-183-B2N6Zy4J.js#M_': 'pure: settings section → route path',
      'shared-183-B2N6Zy4J.js#qh': 'pure: is a customize section',
      'shared-183-B2N6Zy4J.js#S_': 'read-only object: customize section → path segment (derived from x_)',
      'shared-183-B2N6Zy4J.js#x_': 'read-only object literal: path segment → customize section',
      'shared-183-B2N6Zy4J.js#Ah': 'pure: simpleNav gate (GrowthBook __gb__2503656110 && mh)',
      'shared-183-B2N6Zy4J.js#mh': 'constant false (simpleNav build flag)',
    },
    localAdapters: {
      [`${official.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] },
      [`${official.vendorFrame}#ce`]: { name: 'hostJsxRuntime', features: ['t.exports = se();'] },
      [`${official.vendorFrame}#be`]: { name: 'hostReactDom', features: ['e(me())'] },
      ...cutAdapters,
    },
    modules: chunkTargets.map(([source, target]) => {
      const r = byFile.get(source);
      return r ? { source, target, exports: r.exports, features: r.features, ...(r.internal ? { internal: true } : {}) } : { source, target };
    }),
  } };
}

const flat = text => text.replace(/\s+/g, '');
// AST uniqueness: the root must be the only top-level declaration of its chunk that carries every feature.
export async function rootMatches(r, cache) {
  const src = await readSource(r.file, cache, official.ionSource), seen = new Set();
  const matches = [];
  for (const [name, e] of src.top) {
    if (e.kind === 'import' || seen.has(e.node)) continue;
    seen.add(e.node);
    const text = flat(await featureText(src, e));
    if (r.features.every(f => text.includes(flat(f)))) matches.push(name);
  }
  return { src, matches };
}

// Reviewed inputs (pins): snapshot bytes of every chunk, root declarations (+ official export alias), the host adapter
// bytes, the cds-core manifest and the settings-nav manifest this graph links.
export async function preflight(pins, resolved, cache) {
  if (pins.referenceVersion !== official.referenceVersion || pins.referenceSnapshot !== official.referenceSnapshot) throw Error('settings-account pins: version/snapshot mismatch');
  for (const [file, hash] of Object.entries(pins.sources)) if (sha(await fs.readFile(path.join(official.ionSource, file))) !== hash) throw Error(`settings-account pinned source changed: ${file}`);
  for (const r of roots) {
    const { src, matches } = await rootMatches(r, cache);
    if (matches.length !== 1 || matches[0] !== r.local) throw Error(`settings-account root ${r.semantic}: features match ${JSON.stringify(matches)}, expected only ${r.local}`);
    const node = src.top.get(r.local)?.node, pin = pins.roots[r.semantic];
    if (!node || !pin || sha(src.code.slice(node.start, node.end)) !== pin.declarationSha256) throw Error(`settings-account root changed: ${r.semantic}`);
    const alias = [...src.exported].find(([, l]) => l === r.local)?.[0] ?? null;
    if (alias !== r.export) throw Error(`settings-account root ${r.semantic}: export is ${alias}, expected ${r.export}`);
  }
  if (Object.keys(pins.roots).length !== roots.length) throw Error('settings-account: root set differs from pins');
  for (const c of resolved) {
    const pin = pins.cuts?.[c.name];
    if (!pin || pin.file !== c.file || pin.local !== c.local || pin.declarationSha256 !== c.declarationSha256) throw Error(`settings-account cut changed: ${c.name}`);
  }
  if (Object.keys(pins.cuts ?? {}).length !== resolved.length) throw Error('settings-account: cut set differs from pins');
  if (sha(await fs.readFile(path.join(appRoot, adapterFile))) !== pins.hostAdapterSha256) throw Error('settings-account adapter changed without review (pins.hostAdapterSha256)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'))) !== pins.cdsCore.manifestSha256) throw Error('cds-core manifest differs from the one settings-account pins (re-review: cds-core changed)');
  if (sha(await fs.readFile(path.join(generatedRoot, 'settings-nav/manifest.json'))) !== pins.settingsNav.manifestSha256) throw Error('settings-nav manifest differs from the one settings-account pins (re-review: settings-nav changed)');
}

export async function extractSettingsAccount(options = {}) {
  const pins = JSON.parse(await fs.readFile(pinsFile, 'utf8'));
  const cache = new Map();
  const { config, resolved } = await buildConfig(cache);
  await preflight(pins, resolved, cache);
  config.artifacts = manifest => ({ 'provenance.json': JSON.stringify(provenance(manifest, resolved, pins), null, 2) + '\n' });
  return runSlicer(config, options);
}

function provenance(manifest, resolved, pins) {
  return {
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, migrationComplete: false,
    scope: 'Settings › Privacy route (cf4f70727 pn → cc5f29bb3 t: SettingsStack > the "where your conversations go" card); Usage (c71860c77-DaFphJRS ae) not sliced: blocked by vendor-motion frame-clock state (see usageBlocked); Account (c71860c77-CDFXHgkP q) is the official closed branch on desktop',
    sharedGraph: { area: 'cds-core', manifestSha256: pins.cdsCore.manifestSha256 },
    linkedAreas: [{ area: 'settings-nav', modules: ['settings-store.mjs'], manifestSha256: pins.settingsNav.manifestSha256 }],
    roots: roots.map(r => ({ semantic: r.semantic, file: r.file, local: r.local, export: r.export, oldCounterpart: r.oldCounterpart, declarationSha256: pins.roots[r.semantic].declarationSha256 })),
    cuts: resolved.map(c => ({ name: c.name, file: c.file, local: c.local, declarationSha256: c.declarationSha256, contract: cuts.find(x => x.name === c.name).contract })),
    usageBlocked: USAGE_BLOCKED, accountClosed: ACCOUNT_CLOSED,
    heldCopiesOfCdsCore: manifest.modules.flatMap(m => m.heldByViewTabs.map(name => `${m.source}#${name}`)),
    linkedPublicNames: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => i.name)))].sort(),
    linkedFromSettingsNav: [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => `${i.via} -> ${i.from}#${i.name}`)))].sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractSettingsAccount({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
