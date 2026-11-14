// Chat artifact card, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 6, region
// chat-artifact-card): the same semantic roots extract-chat-artifact-card.mjs cuts from 3.6556.2 into
// src/generated/chat-artifact-card, cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/chat-artifact-card-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-chat-artifact-card.jsx keeps reading src/generated/chat-artifact-card).
//
//   cc1aae219-BbSf__8R  c1  ChatArtifactToolBlock   (3.6556.2 cc1aae219 Y3; the tool-use switch `case "artifacts": m(c1, {
//                           input, conversationUuid, toolResult, isStreaming, onOpenArtifact, message, toolUseId,
//                           artifactCellType, isFirstBlockOfMessage, isLastBlockOfMessage })`). New since 3.6556.2: the
//                           input is `safeParse`d (an unexpected shape is reported and the block draws nothing), the
//                           open button toggles the drawer closed when this artifact is already open in a custom
//                           layout (`Ku() && P`), a cancelled artifact the drawer shows that was never stored closes it
//                           ("programmatic"), inside a grouped summary (`fg()`) the edit spacing is dropped, and a
//                           "sheet" layout uses the wider spacing and the message inset.
//                       oI  artifactCellType        (3.6556.2 PB)        rI  artifactToolUseId (3.6556.2 jB)
//   shared-38-DyF0_Fim  qa  ArtifactBlock (export O; 3.6556.2 shared-9 sO, export R): the memoised `artifact-block-cell`.
//                       ao  useArtifactBlockGrouped (export T; 3.6556.2 shared-9 yO, export F)  } linked roots: held by
//                       ro  ArtifactBlockGroupedContext (export C; 3.6556.2 shared-9 _O, export N) } session-rail-kit-v4
//   shared-2-CsjIBQD8   v4  useTranscriptLayoutName (export Wt; 3.6556.2 an)   y4 useTranscriptLayoutIsCustom (Kt; sn)
//                       b4  useTranscriptLayoutCard (export Gt; 3.6556.2 on). The layout context g4 is cds-core's
//                       ctx_shared2_g4; the drawer trigger store (3.6556.2 vT, export ah) is cds-core's
//                       store_shared2_Y_ (4.16336.0 Y_): neither is cut here, both reach this graph through sharedGraph.
//   shared-31-C9BqSSuD  Zw  transcriptStaysPutAttribute (export vt; 3.6556.2 c7f8992b4 l, export d)
//   shared-153-DMw2VzSq J   ArtifactType (export yg; 3.6556.2 shared-104 Q, export Pt)
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, plan.json chat-artifact-card `linked`, plus session-rail-kit-v4 for shared-38 ro/ao):
//     code-composer-v4, cowork-scheduled-v4, session-rail-kit-v4 — every binding one
//     of them already holds and exports is imported from it, never cut again;
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts (now in their
//     4.16336.0 chunks/locals). src/source-chat-artifact-card-v4-adapters.jsx re-exports the existing host adapters
//     (src/source-chat-artifact-card-adapters.jsx, src/source-routines-shared-adapters.jsx,
//     src/source-r3b-transcript-adapters.jsx); each original is pinned by features and by its raw declaration sha256.
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its export aliases as
// reviewed and its raw declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_ARTIFACT_CARD_V4_OUTPUT = 'src/generated/chat-artifact-card-v4';
const ADAPTER_FILE = 'src/source-chat-artifact-card-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const TOOL = 'cc1aae219-BbSf__8R.js';
export const BLOCK = 'shared-38-DyF0_Fim.js';
export const LAYOUT = 'shared-2-CsjIBQD8.js';
export const STAYS_PUT = 'shared-31-C9BqSSuD.js';
export const TYPES = 'shared-153-DMw2VzSq.js';

// ── Roots: file -> local -> { name, exports (the chunk's own aliases, [] chunk-internal), probe (raw), features } ───────
export const ROOTS = {
  [TOOL]: {
    c1: { name: 'ChatArtifactToolBlock', exports: [], probe: 'openTestId:"artifact-card-open"',
      features: ['artifactCellType: c,', 'isFirstBlockOfMessage: l,', 'isLastBlockOfMessage: d,', 'wr.safeParse(t)', '"Artifact tool input has an unexpected shape",',
        '{ source: "artifact_tool_input" },', 'T = Ol("toolResultMarkersTrusted"),', 'O = T ? (E !== void 0 && E > 1 ? E : void 0) : w ? w + 1 : void 0,',
        'a?.(e, o.uuid, g.version_uuid, { toolUseId: s });', 'L && ee && !R && S("programmatic");', 'H = !te && c !== "multi_edit_not_last",',
        'U = rd() === "sheet";', '(te ? "hidden" : "h-0")', 'G = U && "ps-[var(--msg-block-inset,0.5rem)]",', 'openTestId: "artifact-card-open",',
        'isExpanded: P,'] },
    oI: { name: 'artifactCellType', exports: [], probe: 'c="individual_cell_create"',
      features: ['c = "individual_cell_create",', 'create: "individual_cell_create",', 'update: "individual_cell_update",',
        'rewrite: "individual_cell_rewrite",', '"multi_edit_last"', '"multi_edit_not_last"'] },
    rI: { name: 'artifactToolUseId', exports: [], probe: 'e.name!=="artifacts")return;',
      features: ['e?.type !== "tool_use" || e.name !== "artifacts"', 'e.input?.id ?? e.partial_json?.match(nI)?.[1];'] },
  },
  [BLOCK]: {
    qa: { name: 'ArtifactBlock', exports: ['O'], probe: 'e.isNotLastEdit===t.isNotLastEdit',
      features: ['var qa = l(Ga, (e, t) => {', 'n.id === r.id &&', 'e.isNotLastEdit === t.isNotLastEdit &&', 'e.titleIsFileName === t.titleIsFileName &&',
        'e.textContainerClassName === t.textContainerClassName'] },
  },
  [LAYOUT]: {
    v4: { name: 'useTranscriptLayoutName', exports: ['Wt'], probe: 'x(g4)?.name??"classic"', features: ['return x(g4)?.name ?? "classic";'] },
    y4: { name: 'useTranscriptLayoutIsCustom', exports: ['Kt'], probe: 'return v4()!=="classic"', features: ['return v4() !== "classic";'] },
    b4: { name: 'useTranscriptLayoutCard', exports: ['Gt'], probe: 'return x(g4)?.Card', features: ['return x(g4)?.Card;'] },
  },
  [STAYS_PUT]: {
    Zw: { name: 'transcriptStaysPutAttribute', exports: ['vt'], probe: 'Zw="data-transcript-stays-put"', features: ['var Zw = "data-transcript-stays-put";'] },
  },
  [TYPES]: {
    J: { name: 'ArtifactType', exports: ['yg'], probe: 'e.Mermaid="application/vnd.ant.mermaid"',
      features: ['(e.Text = "text/plain"),', '(e.Markdown = "text/markdown"),', '(e.Html = "text/html"),', '(e.Code = "application/vnd.ant.code"),',
        '(e.Svg = "image/svg+xml"),', '(e.Mermaid = "application/vnd.ant.mermaid"),', '(e.React = "application/vnd.ant.react"),'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cc1aae219-BbSf__8R.js#c1': '0b6be9f6cdca91c895d1d4cbf2a4c3eb76c729759a636290ba4cc248d4d1d281',
  'cc1aae219-BbSf__8R.js#oI': 'd6300b3763833a17bb390b93c56d1881cd9665dab66dea44f88684ab9b4018cf',
  'cc1aae219-BbSf__8R.js#rI': '5656caa9e99d4ba275ffcd85c9068ee094d8d9de88ce6e208006f390c026b156',
  'shared-38-DyF0_Fim.js#qa': '2cb0953548eaead1726e573a04356847e960ef02f3617063e5dde826ba66faf8',
  'shared-2-CsjIBQD8.js#v4': 'e3bdd449239471b8d42adcef4908eab6d07524ed4edc0112634cf9cbc9f09bce',
  'shared-2-CsjIBQD8.js#y4': 'aac2b7ae7525908714781d6c5a8b73e1008cbd6d9451d2511c973f420316f3be',
  'shared-2-CsjIBQD8.js#b4': 'dd3e5b0432ae1458a1df45736f3802580a6eb913ac34ed88b770f006a44c2a0a',
  'shared-31-C9BqSSuD.js#Zw': '5ba910798545871a5f822e032f2507f01305b59e2d52e388037ebaa2f4ede527',
  'shared-153-DMw2VzSq.js#J': 'd3ee732177f1ebee040ef54f30ef1f288807b161659497287006ffd46bd77a48',
};

// ── Roots another graph already holds (D1): located and pinned like roots on the official AST, never cut here; the index
// re-exports them from that graph's module, whose manifest must hold the same declaration (binding sha256 = the pin).
// session-rail-kit-v4 holds the shared-38 grouped-summary hook ao; its context ro (a createContext: one instance) is
// cds-core's publicName ctx_shared38_ro since wave 7 (cds-integrate/wave7, r3 chat-artifact-card request), which
// session-rail-kit-v4 links too: `cds` names that publicName (area cds-core).
export const LINKED_ROOTS = {
  [`${BLOCK}#ao`]: { name: 'useArtifactBlockGrouped', exports: ['T'], area: 'session-rail-kit-v4', probe: 'function ao(){return f(ro)}', features: ['return f(ro);'] },
  [`${BLOCK}#ro`]: { name: 'ArtifactBlockGroupedContext', exports: ['C'], area: 'cds-core', cds: 'ctx_shared38_ro', probe: 'ro=d(!1)', features: ['var ro = d(!1);'] },
};
export const LINKED_ROOT_PINS = {
  'shared-38-DyF0_Fim.js#ao': '6e7c1ab7f90d9b4643acc7a820308f82c33a757897af43b7a0f8d1b5b2e03014',
  'shared-38-DyF0_Fim.js#ro': 'e81357e5fab0f2654c3139bb0944b6711d591e4f25cef2853147e9bfbea08ac0',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ───────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there).
const CARD = 'src/source-chat-artifact-card-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', R3B = 'src/source-r3b-transcript-adapters.jsx',
  MD = 'src/source-chat-markdown-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 shared-104 VI: the zod schema of the artifacts tool input (c1 `wr.safeParse(t)`).
  'shared-153-DMw2VzSq.js#Aw': { name: 'chatArtifactsInputSchema', from: CARD,
    features: ['version_number: f().int().optional().catch(void 0),', 'command: l(["create", "update", "rewrite"]).optional().catch(void 0),',
      'type: s(J).optional().catch(void 0),', 'source: l(["c", "w"]).optional().catch(void 0),', 'md_citations: a().optional(),'] },
  // 3.6556.2 shared-4 DS: a transcript capability (`toolResultMarkersTrusted`).
  'shared-31-C9BqSSuD.js#Jm': { name: 'useChatTranscriptCapability', from: CARD, features: ['return T(qm)[e] === !0;'] },
  // 3.6556.2 shared-2 tE: the drawer context (closeDrawer).
  'shared-2-CsjIBQD8.js#_y': { name: 'useChatArtifactDrawer', from: CARD, features: ['return x(gy);'] },
  // 3.6556.2 shared-130 AY / kY: the conversation's stored artifact / the streaming one, else the stored one.
  'shared-153-DMw2VzSq.js#IY': { name: 'useChatArtifactRecord', from: CARD, features: ['(n) => NY(n, e).artifacts[t]', 'return Zs(LJ, n, xi);'] },
  'shared-153-DMw2VzSq.js#FY': { name: 'useChatArtifactEntry', from: CARD,
    features: ['let { artifacts: r, streamingArtifacts: i } = NY(n, e);', 'return t in i ? i[t] : r[t];', 'return Zs(LJ, n, xi);'] },
  // 3.6556.2 c7d03f0bf s: the drawer store's selected item.
  'c7d03f0bf-BAalxCl2.js#s': { name: 'useChatArtifactDrawerSelected', from: CARD, features: ['(t) => e(t.selectedDrawerItem)'] },
  // 3.6556.2 shared-25 OH: the localStorage write of the "claude-code-view-timestamp" a Code artifact block records
  // (shared-38 Ia `K("claude-code-view-timestamp", Date.now())`); chat-markdown adapts the same binding (D1).
  'shared-25-D-aF0gt9.js#IH': { name: 'setChatLocalValue', from: MD, features: ['kH(gH(e), t, !0);'] },
  // react-intl useIntl / FormattedMessage (routines-shared-v4 and cowork-progress-v4 adapt the same bindings).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  // The official render/input error report (D17: no telemetry; the r3b transcript adapter answers the same binding).
  'shared-0-CnnWnVrT.js#qB': { name: 'reportRenderError', from: R3B, features: ['var qB = P(JB, N.O11Y_INTERNALS);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-153-DMw2VzSq.js#Aw': '554c3e4d2b84d5c1795694b23f0fea0097ede0318cdc1fa7fdb1e1afbc07b8e3',
  'shared-31-C9BqSSuD.js#Jm': '2f6652b613dee4ff3af4fe067818447e3c3794a1d25f6444c2815a3964e71b77',
  'shared-2-CsjIBQD8.js#_y': 'f8dcdad91efdce3a7f1569c2dfa4e720d6936d03438e106fc0a1191583f6b0fa',
  'shared-153-DMw2VzSq.js#IY': 'f646c1b051cf4cb61add09d74dfa98ded2dfc7785b0d22ee7e3279b1c881bad7',
  'shared-153-DMw2VzSq.js#FY': 'cb2660db4b0a57db6553235bd14225222c104a496ae4836e14188620647c10a5',
  'c7d03f0bf-BAalxCl2.js#s': 'ba603a8f575302e8056908356f659979cb9b9b2d4ab97e5637bd9c06ec18abf7',
  'shared-0-CnnWnVrT.js#qB': '9786ddc2b863b95c734f9b0cf48201ae2302e49d990a43e9c6ffba102914843f',
  'shared-25-D-aF0gt9.js#IH': '2105fca2d0b1e2bff2323ff4a0d7cf60a25ba761214bda367a76358fcbcdcbc9',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!(key in ADAPTER_PINS)) throw Error(`adapter ${key}: no reviewed pin`);

// session-rail-kit-v4 already holds shared-38 ro (ArtifactBlockGroupedContext, a context) and ao (useArtifactBlockGrouped):
// they are imported from it (D1: one context instance), never cut again here (d1-gate --app-only).
const LINKED_AREAS = ['code-composer-v4', 'cowork-scheduled-v4', 'session-rail-kit-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|preload-helper|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
// (The shared-frame compiler-runtime helpers the roots read are all held by the linked areas, so no shared-frame module.)
export const CLOSURE_CHUNKS = ['preload-helper-BBljBeZo.js', 'shared-62-DoCqVpIq.js'];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.exports.length === 0),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): the tool-use switch renders c1 with the cell type, and the
// conversation transcript computes the cell type from the blocks around the tool use.
const rawCallSites = [
  { source: TOOL, role: 'The tool-use switch renders the artifacts block c1 with its cell type and the first/last block flags',
    features: ['bb3:switch(a){case"artifacts":return', 'm(c1,{input:o,conversationUuid:p,toolResult:l,isStreaming:n,onOpenArtifact:c,message:s,toolUseId:t,artifactCellType:u,isFirstBlockOfMessage:d,isLastBlockOfMessage:f})'] },
  { source: TOOL, role: 'c1 draws the shared-38 ArtifactBlock (export O) as ug',
    features: ['O as ug', 'm(ug,{versionNum:O,preview:A,versionCount:k,properties:M,stopped:L,isStreaming:i,isEdit:oe,isNotLastEdit:K,onOpenArtifact:se,openTestId:"artifact-card-open",isExpanded:P})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export aliases as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  const groups = [...Object.entries(ROOTS).map(([file, roots]) => [file, Object.entries(roots), ROOT_PINS]),
    ...Object.entries(LINKED_ROOTS).map(([key, spec]) => [key.split('#')[0], [[key.split('#')[1], spec]], LINKED_ROOT_PINS])];
  for (const [file, roots, pins] of groups) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of roots) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const aliases = [...src.exported].filter(([, l]) => l === local).map(([a]) => a).sort();
      if (JSON.stringify(aliases) !== JSON.stringify([...spec.exports].sort())) throw Error(`${file}#${local}: export aliases ${aliases.join(',')}, reviewed ${spec.exports.join(',')}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = pins[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, exports: aliases, ...(spec.area ? { linkedFrom: spec.area } : {}), declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Each linked root: the linked area's manifest holds the same declaration (binding sha256 = the reviewed pin) in a
// module sliced from the same official chunk bytes, and that module exports it under its local name.
export async function linkedRootExports() {
  const out = [];
  for (const [key, spec] of Object.entries(LINKED_ROOTS)) {
    const [file, local] = key.split('#');
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, spec.area, 'manifest.json'), 'utf8'));
    if (m.referenceVersion !== official.referenceVersion) throw Error(`${spec.area} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    // a cds-core publicName: the manifest names exactly this binding, in the module the checks below read
    const pub = spec.cds ? m.publicNames?.[spec.cds] : null;
    if (spec.cds && (!pub || pub.file !== file || pub.local !== local)) throw Error(`linked root ${key}: ${spec.area} publicName ${spec.cds} is ${pub ? `${pub.file}#${pub.local}` : 'absent'}`);
    const mods = m.modules.filter(mod => path.basename(mod.source) === file && (!pub || mod.target === pub.target) && mod.bindings.some(b => (typeof b === 'string' ? b : b.name) === local));
    if (mods.length !== 1) throw Error(`linked root ${key}: ${mods.length} ${spec.area} modules hold it, expected 1`);
    const [mod] = mods;
    const binding = mod.bindings.find(b => (typeof b === 'string' ? b : b.name) === local);
    if (binding.sha256 !== LINKED_ROOT_PINS[key]) throw Error(`linked root ${key}: ${spec.area} holds ${binding.sha256}, reviewed ${LINKED_ROOT_PINS[key]}`);
    if (mod.sourceSha256 !== sha(await fs.readFile(path.join(official.ionSource, file)))) throw Error(`linked root ${key}: ${spec.area}/${mod.target} was cut from other bytes`);
    const text = await fs.readFile(path.join(generatedRoot, spec.area, mod.target), 'utf8');
    if (sha(text) !== mod.sha256) throw Error(`${spec.area}/${mod.target} differs from its manifest`);
    const exported = pub ? pub.exportName : local;
    if (![...text.matchAll(/^export \{([^}]*)\};?$/gm)].some(x => x[1].split(',').map(n => n.trim()).includes(exported)))
      throw Error(`linked root ${key}: ${spec.area}/${mod.target} does not export ${exported}`);
    out.push({ key, local: exported, name: spec.name, area: spec.area, ...(pub ? { publicName: spec.cds } : {}), from: `../${spec.area}/${mod.target}` });
  }
  return out;
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
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-artifact-card-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function chatArtifactCardV4Config() {
  return {
    name: 'chat artifact card (4.16336.0)', generator: 'extract-chat-artifact-card-v4.mjs', output: path.join(root, CHAT_ARTIFACT_CARD_V4_OUTPUT),
    adapterModule: '../../source-chat-artifact-card-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = chatArtifactCardV4Config;

export async function extractChatArtifactCardV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linkedRoots = await linkedRootExports();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...chatArtifactCardV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the chat-artifact-card roots (${official.referenceVersion}); generated by extract-chat-artifact-card-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n'
          + linkedRoots.map(r => `export { ${r.local} as ${r.name} } from "${r.from}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-artifact-card-v4.mjs',
          previous: { generator: 'scripts/extract-chat-artifact-card.mjs', output: 'src/generated/chat-artifact-card', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore, reads: ['store_shared2_Y_ (3.6556.2 drawerTriggerStore)', 'ctx_shared2_g4 (the transcript layout context)'] },
          linkedAreas: linked, roots, adapters,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractChatArtifactCardV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
