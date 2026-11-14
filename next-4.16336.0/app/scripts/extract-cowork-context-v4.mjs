// Cowork activity panel — Context section, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, round2 unit
// cowork-context): the same semantic roots extract-cowork-context.mjs cuts from 3.6556.2 into src/generated/cowork-context,
// cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/cowork-context-v4. The 3.6556.2 output is
// untouched (staged double output; no production switch: the host keeps reading src/generated/cowork-context).
//
//   c21f11e6d-Cyj5xu_D  gE  CoworkContextSection          (3.6556.2 TT; chunk-internal, rendered by the activity panel
//                                                           xE: title "Context" / "Used in this session", the flat
//                                                           activity list eC with category headers, the empty body
//                                                           hE / mE "Track tools and referenced files used in this
//                                                           task." over the session-context illustration sE, and hE's
//                                                           suggested connectors IT)
//                       FT  CoworkSuggestedConnectorsCard (3.6556.2 Gw; the card IT renders: "Suggested connectors",
//                                                           Dismiss, the cycling rows PT / NT, "See all connectors")
//
// Same chunk as cowork-progress-v4 / cowork-runs-v4 / cowork-live-v4 (the four Cowork activity panel graphs of
// c21f11e6d): this graph cuts only the Context section's own declarations and links every c21f11e6d binding another
// graph already holds (D1):
//   - cowork-progress-v4: the panel Section t_ (cc5a62f6f R), the flat content class $g (cc5a62f6f k), the activity list
//     eC (= memo(QS); its closure holds the contexts nx / rx / ix and the collections AS / cx, module state that must
//     have one copy) and the light/dark illustration frame iE. eC and iE are exported there by linkExports (patch
//     round2/cowork-context/patches/extract-cowork-progress-v4.mjs.patch; without it generation stops with "bindings a
//     linked area slices without exporting");
//   - cowork-live-v4: Kb CoworkInAppBrowserSection (the built-in browser row of a header-hosted panel);
//   - cowork-runs-v4, cowork-session-states-v4, cowork-session-actions: the other graphs holding c21f11e6d bindings
//     (none in this closure today; linked so that nothing they hold is ever cut a second time);
//   - routines-shared-v4 (listed last: the React Compiler helpers, as in cowork-runs-v4).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CdsIcon / CdsTooltip / clsx / useDirection / getResizeObserverClass (hE's ResizeObserver,
//     shared-25 St) are cds-core publicNames; cds-core module state without a publicName stops generation, D46); the
//     reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - host boundaries as localAdapters (file#local): the branches a local OpenClaude Cowork session never takes are the
//     same host adapters the 3.6556.2 graph uses (src/source-cowork-context-adapters.jsx, each the original's own closed
//     branch for this host, see there), now at their 4.16336.0 locals; intl and the connector icon are the adapters
//     routines-shared-v4 / cowork-progress-v4 use for the same bindings. src/source-cowork-context-v4-adapters.jsx only
//     re-exports those existing host adapters. Each original is pinned by features and by its raw declaration sha256.
//   - shared-33 yR / bR (the "inside an embedded artifact" context, export Ir, and its reader Lr; gE reads it as Ff to
//     choose the empty body and hide the remote "add folder" action) are held by no other 4.16336.0 graph: this graph
//     is their first holder (later graphs link them from here).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
//
// Illustrations: sE renders "/images/illustrations/session-context[-dark].svg" (byte-identical to 3.6556.2 and to the
// served copies in public/images/illustrations, recorded in provenance.json). The emitted text keeps the official
// root-relative path, as cowork-progress-v4 does (a cutover item for file:// loading, not handled by editing generated text).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COWORK_CONTEXT_V4_OUTPUT = 'src/generated/cowork-context-v4';
const ADAPTER_FILE = 'src/source-cowork-context-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4 / cowork-runs-v4).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const PANEL = 'c21f11e6d-Cyj5xu_D.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [PANEL]: {
    gE: { name: 'CoworkContextSection', export: null, probe: 'id:"d2ykzrGcrl"',
      features: ['groupContextByKind: t,', 'p(Q, { defaultMessage: "Used in this session", id: "d2ykzrGcrl" })',
        'p(Q, { defaultMessage: "Context", id: "Qrvq7+mBse" })', 's && !P ? p(Qy, { sessionId: o }) : void 0', 'z = c ? $g : void 0,',
        'N && p(mT, { projects: l })', 'p(Kb, { previewId: C, isPaneOpen: w, onTogglePane: T, bare: !0 })', 'activities: y,',
        'onActivityClick: b,', 'alwaysShowCategoryHeaders: !0,', 'isRemoteSession: s,', '!M && p(P ? mE : hE, {})',
        'headerLeftAction: R,', 'contentClassName: z,', 'children: [B, V, H, E, U, W, G],'] },
    FT: { name: 'CoworkSuggestedConnectorsCard', export: null, probe: 'id:"4lWgUGlrk4"',
      features: ['defaultMessage: "Suggested connectors",', 'id: "4lWgUGlrk4",', 'defaultMessage: "Dismiss suggested connectors",',
        '"Cowork uses connectors to browse websites, manage tasks, and more.",', 'defaultMessage: "See all connectors",',
        'handleSeeAllConnectors: l,', 'isCycling: u,', 'showDescription: d,'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c21f11e6d-Cyj5xu_D.js#gE': '681fa42aaaf82864d8cdf41b34055f76b8b0fc7ad33b03ad8650da3c1f166ee5',
  'c21f11e6d-Cyj5xu_D.js#FT': 'e01460f7b6ce85e770511a2dde932373e54a20153d34c421410d7e4ef2fde8ae',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ─────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there).
const V3 = 'src/source-cowork-context-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', RC = 'src/source-routine-cowork-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 Fy: the header's "add folder" action; gE mounts it only for a remote session (`s && !P`).
  'c21f11e6d-Cyj5xu_D.js#Qy': { name: 'CoworkAddFolderAction', from: V3,
    features: ['bl(t ?? null, "session_panel_add_folder"),', '? !!(be?.grantRemoteSessionFolders ?? be?.grantRemoteSessionFolder)',
      'n.formatMessage({ defaultMessage: "Add folder", id: "lhYeghbH/7" }),'] },
  // 3.6556.2 ww: the mounted-projects block; gE mounts it only with mounted projects (`N && …`), and it returns null for none.
  'c21f11e6d-Cyj5xu_D.js#mT': { name: 'CoworkMountedProjects', from: V3,
    features: ['{ projects: t } = e,', 'if (t.length === 0) return null;', 'i.formatMessage({ defaultMessage: "Open project", id: "fUM67kBzPI" }),'] },
  // 3.6556.2 _w / mw: the kind-grouped Context; gE mounts them only with groupContextByKind, which xE defaults to false
  // (`Ne = L !== void 0 && L`) and no 4.16336.0 caller passes (pinned in rawCallSites and the test).
  'c21f11e6d-Cyj5xu_D.js#sT': { name: 'CoworkContextKindGroupsWithBrowser', from: V3,
    features: ['(({ previewId: i, isPaneOpen: t, onTogglePane: r, ...n } = e),', 'p(iT, { ...n, browser: o })'] },
  'c21f11e6d-Cyj5xu_D.js#iT': { name: 'CoworkContextKindGroups', from: V3, features: ['var iT = x(rT);'] },
  // 3.6556.2 _S: a remote session's context sources (folders / project files); gE mounts it only when `isRemote`.
  'c21f11e6d-Cyj5xu_D.js#iC': { name: 'CoworkRemoteContextSources', from: V3,
    features: ['trustedLocalFolders: r,', 'if (e.folderBasename === void 0) continue;', 'if (v.length === 0) return null;'] },
  // 3.6556.2 Kw: the "Suggested connectors" funnel of the empty body (claude.ai connector directory; null while the
  // directory list is empty, which it always is without a claude.ai account). FT, the card it renders, is generated.
  'c21f11e6d-Cyj5xu_D.js#IT': { name: 'CoworkSuggestedConnectors', from: V3,
    features: ['{ source: ia.SuggestedConnectors }', '{ servers: O } = Eu(),', 'Xe = O.length > 0;'] },
  // The connector icon of FT's rows (cowork-progress-v4 adapts the same binding).
  'shared-36-fqRFYwOb.js#Db': { name: 'ConnectorServerIcon', from: RC, features: ['"connector-icon-globe-fallback"'] },
  // Intl (routines-shared-v4 adapts the same bindings).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'c21f11e6d-Cyj5xu_D.js#Qy': '7d8ccbf227add0750832dc6a80632a088ded1a4ab9385f0781787b7ee4abc0c4',
  'c21f11e6d-Cyj5xu_D.js#mT': '772240018b23f293e0cb3db71c13552978b7e022c44a7d4b187baeb5f4d73cb6',
  'c21f11e6d-Cyj5xu_D.js#sT': '3ac9cae4ba538c39131f0a6c44b9d45896f1a7d745a1f9c24812f6dcb9b6685f',
  'c21f11e6d-Cyj5xu_D.js#iT': '663a0045e0cee7c7da1292251526a8f19aadaa9c07c20870b6a4f6671ac3ef0c',
  'c21f11e6d-Cyj5xu_D.js#iC': '5eb1df4239a32cc72e5981b27c4d2a35441e875f45dc5a088670056b5b9211e2',
  'c21f11e6d-Cyj5xu_D.js#IT': 'e3b3bbe7669652c1970299967c97266cf3dc8dc19f135c0cb2118c413c2ee1d3',
  'shared-36-fqRFYwOb.js#Db': '9c394533d20e4a6fbbe28762552bb5868d66398c282cbea4f004122870745482',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

// Linked first (D1), routines-shared-v4 last (its React Compiler helpers win, as in cowork-runs-v4).
export const LINKED_AREAS = ['cowork-progress-v4', 'cowork-runs-v4', 'cowork-session-states-v4', 'cowork-session-actions', 'cowork-live-v4', 'routines-shared-v4'];
// Bindings this graph must import from a linked area (never cut here): eC / iE need the cowork-progress-v4 linkExports patch.
export const REQUIRED_LINKS = {
  'c21f11e6d-Cyj5xu_D.js#eC': 'cowork-progress-v4', 'c21f11e6d-Cyj5xu_D.js#iE': 'cowork-progress-v4',
  'cc5a62f6f-CsfnfFRu.js#R': 'cowork-progress-v4', 'cc5a62f6f-CsfnfFRu.js#k': 'cowork-progress-v4', // gE's t_ / $g
  'c21f11e6d-Cyj5xu_D.js#Kb': 'cowork-live-v4',
};
const linkedCopies = {};

const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation): shared-33 yR / bR (the embedded-artifact context and its reader).
  ...['shared-33-DtdykY0y.js'].map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): how the activity panel mounts the section, the panel's default for
// the kind grouping, and how the empty body reaches the suggested connectors card.
const rawCallSites = [
  { source: PANEL, role: 'The activity panel xE mounts gE (when the Context section is shown, ja) with the session context props',
    features: ['ja&&p(gE,{groupContextByKind:Ne,isContextExpanded:Ar,setIsContextExpanded:Mr,contextSeedSnap:Ao,conversationUuid:K,sessionId:q,isRemote:Xr,headerHostedToggle:X,mountedProjects:oe,hasContextActivity:ga,browserRowInContext:ya,hasContextUploads:va,contextUploads:je,onRevealStep:Vn,canRevealStep:I,coworkBrowserEnabled:bi,contextResourceActivity:Oi,handleContextActivityClick:es,handleKindRowSkillOpen:ts,selectedPath:Mi,coworkBrowserPreviewId:yi,isCoworkBrowserPaneOpen:Si,handleToggleCoworkBrowserPane:zo,contextLeadRows:M,persistedUserSelectedFolders:ae,contextSources:hi,userSelectedFolders:J,handleContextSourceFileClick:qi,handleContextChipProjectClick:Ki,hasContextCardContent:ba})'] },
  { source: PANEL, role: 'xE takes groupContextByKind as an optional prop defaulting to false (the kind groups sT / iT stay unmounted)',
    features: ['groupContextByKind:L,perSession:R', 'Ne=L!==void 0&&L'] },
  { source: PANEL, role: 'The empty body hE renders the suggested connectors IT under the illustration body mE',
    features: ['children:[o,p(IT,{availableHeight:n})]'] },
  { source: PANEL, role: 'IT returns null without directory servers, else renders the FT card',
    features: ['Xe=O.length>0;if(!T||!Xe||y||He||ze||Le.length===0||Ke)return null;',
      'p(FT,{isReady:Ze,hasAppeared:E,setHasAppeared:D,connectors:Ye,clickedConnectors:C,isPending:Qe,handleDismiss:De,handleAddConnector:Oe,handleSeeAllConnectors:Ae,isCycling:Je,showDescription:qe})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const body = text.replace(/\/\/[^\n]*/g, '').replace(/export \{[^}]*\} from "[^"]+";/g, '').trim();
  if (body) throw Error(`${ADAPTER_FILE}: only re-exports are allowed, found: ${body.slice(0, 120)}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

// Every required link resolves to its linked area (a re-cut of eC / iE / t_ / $g / Kb would split module state, D1).
function assertRequiredLinks(m) {
  // An import entry names its original as `chunk:alias` (via) + local (original); a linked declaration as `chunk#local`.
  const originalOf = i => (i.via.includes('#') ? i.via : `${i.via.split(':')[0]}#${i.original}`);
  const linked = new Map(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'linked').map(i => [originalOf(i), i.from])));
  for (const mod of m.modules) for (const b of mod.bindings) if (Object.hasOwn(REQUIRED_LINKS, `${mod.source}#${b.name}`))
    throw Error(`${mod.source}#${b.name} is cut here; it must be imported from ${REQUIRED_LINKS[`${mod.source}#${b.name}`]}`);
  for (const [key, area] of Object.entries(REQUIRED_LINKS))
    if (!linked.get(key)?.startsWith(`../${area}/`)) throw Error(`${key} is not imported from ${area} (${linked.get(key) ?? 'not linked'})`);
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-context-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function coworkContextV4Config() {
  return {
    name: 'cowork context (4.16336.0)', generator: 'extract-cowork-context-v4.mjs', output: path.join(root, COWORK_CONTEXT_V4_OUTPUT),
    adapterModule: '../../source-cowork-context-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// Exploration (round2/cowork-context/tools/probe.mjs) uses the same configuration.
export const probeConfig = coworkContextV4Config;

export async function extractCoworkContextV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  for (const r of roots) if (!r.pinned) throw Error(`root ${r.file}#${r.local}: unpinned (review it with --locate)`);
  for (const a of adapters) if (!a.pinned) throw Error(`adapter ${a.original}: unpinned (review it with --locate)`);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const illustrations = [];
  for (const name of ['session-context.svg', 'session-context-dark.svg']) {
    const bytes = await fs.readFile(path.join(official.snapshotRoot, 'ion-dist/images/illustrations', name));
    const served = await fs.readFile(path.join(root, 'public/images/illustrations', name)).catch(() => null);
    illustrations.push({ url: `/images/illustrations/${name}`, sha256: sha(bytes), servedCopyIdentical: served !== null && served.equals(bytes) });
  }
  const cfg = {
    ...coworkContextV4Config(),
    async artifacts(m) {
      assertRequiredLinks(m);
      return {
        'index.mjs': `// Semantic names for the cowork-context roots (${official.referenceVersion}); generated by extract-cowork-context-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-context-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-context.mjs', output: 'src/generated/cowork-context', referenceVersion: official.previousVersion,
            roots: { 'c21f11e6d-Cyd8_HO8.js#TT': 'c21f11e6d-Cyj5xu_D.js#gE', 'c21f11e6d-Cyd8_HO8.js#Gw': 'c21f11e6d-Cyj5xu_D.js#FT' } },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, requiredLinks: REQUIRED_LINKS,
          roots, removedRoots: [], adapters, linkedCopies,
          illustrations: { items: illustrations, note: 'root-relative URLs kept as in the official text (no runSlicer rewrite); cutover item for file:// loading' },
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  const manifest = await runSlicer(cfg, { check, dryRun });
  if (dryRun) assertRequiredLinks(manifest);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractCoworkContextV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
