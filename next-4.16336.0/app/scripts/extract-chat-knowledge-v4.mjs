// Chat knowledge, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 6, region chat-knowledge):
// the same semantic roots scripts/extract-chat-knowledge.mjs cuts from 3.6556.2 into src/generated/chat-knowledge (the
// claude.ai project knowledge tiles, capacity bar, "Add files" menu and text dialog, and the memory preview the Chat
// project page and Settings > Memory render), cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/chat-knowledge-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-project-knowledge.jsx and src/source-settings-memory.jsx keep importing src/generated/chat-knowledge).
//
//   shared-36-fqRFYwOb  U_  KnowledgeFileThumbnail   (3.6556.2 shared-7 mD)
//                       rv  KnowledgeFileTag         (3.6556.2 shared-7 OD)
//                       b_  knowledgeFileTagName     (3.6556.2 shared-7 GE)
//   shared-4-C_EiQb9h   Yj  formatKnowledgeFileSize  (3.6556.2 shared-3 FD)
//   c52b32660-CmYsbpbF  be  KnowledgeCapacityBar     (3.6556.2 c52b32660 ge; chunk-internal)
//   cf2f34ee4-CGe8SQnD  vi  AddTextContentDialog     (3.6556.2 cf2f34ee4 kr; chunk-internal)
//                       si  createTextContentDraft   (3.6556.2 cf2f34ee4 vr; chunk-internal)
//                       oi  KnowledgeAddMenu         (3.6556.2 cf2f34ee4 _r)
//   cffc9ea71-Do_Jrd6d  C   MemoryPreviewContent     (3.6556.2 cffc9ea71 w)
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2/plan.json chat-knowledge `linked`: code-routines-v4, routines-shared-v4, sessions-page-v4,
//     working-line-v4, plus the 4.16336.0 graphs the plan lists as owners of this closure's bindings): every binding one
//     of them holds and exports is imported from it, never cut again. proposal-group-v4 is not linked: the closure only
//     reaches its c25d7186f chart palette (pure, two bindings), and that graph is still waiting on a code-start-v4 patch;
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts, now in their
//     4.16336.0 chunks/locals (the knowledge hooks moved shared-4 -> shared-4, shared-182 -> shared-212, shared-156 ->
//     shared-183, the tile route shared-52 hz -> shared-62 KM, the GitHub sync modal shared-7 qk -> shared-36 Mb), plus the
//     4.16336.0-only memory edit limits (shared-212 cB / sB, GrowthBook claudeai_saffron_frontend). The starter-project
//     tooltip ($r, 3.6556.2 cf2f34ee4 ur, the chat-projects host adapter) and the react-intl / errors / feature-flag
//     services are the existing host adapters. src/source-chat-knowledge-v4-adapters.jsx answers them, re-exporting the
//     3.6556.2 host adapter where the official contract is unchanged. Each original is pinned by features and by its raw
//     declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256 pinned
// (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_KNOWLEDGE_V4_OUTPUT = 'src/generated/chat-knowledge-v4';
const ADAPTER_FILE = 'src/source-chat-knowledge-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

const S4 = 'shared-4-C_EiQb9h.js', S36 = 'shared-36-fqRFYwOb.js', S25 = 'shared-25-D-aF0gt9.js', S62 = 'shared-62-DoCqVpIq.js';
const S183 = 'shared-183-B2N6Zy4J.js', S212 = 'shared-212-BHMAi0oa.js';
const CAPACITY = 'c52b32660-CmYsbpbF.js', ADD = 'cf2f34ee4-CGe8SQnD.js', MEMORY = 'cffc9ea71-Do_Jrd6d.js', INTL = official.vendorIntl;

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [S36]: {
    U_: { name: 'KnowledgeFileThumbnail', export: 'Aa', probe: '"data-testid":"file-thumbnail"',
      features: ['"data-testid": "file-thumbnail",', '"file-thumbnail-fade-in flex-1 min-w-0 overflow-hidden text-start",', 'handleClick: r,'] },
    rv: { name: 'KnowledgeFileTag', export: 'Ma', probe: 'text-text-300 text-[11px] leading-[13px]',
      features: ['{ tagName: t, tooltipText: n, className: r } = e,', '"uppercase truncate font-sans text-text-300 text-[11px] leading-[13px]",'] },
    b_: { name: 'knowledgeFileTagName', export: 'Ha', probe: '.slice(1):"text"',
      features: ['kl({ imagesEnabled: !0 }).includes(t[0].toLowerCase())', '? t[0].slice(1)', ': "text";'] },
  },
  [S4]: {
    Yj: { name: 'formatKnowledgeFileSize', export: 'xt', probe: 'unitDisplay:n==="short"&&',
      features: ['unitDisplay: n === "short" && a === 0 ? "long" : n,', 'return r ? Jo(e.locale, o) : o;'] },
  },
  // be: the capacity bar the knowledge list leads with: progressbar, "{pctUsed}% of project capacity used", the Info
  // "Learn more about project knowledge" button, "Search mode", the at-capacity line.
  [CAPACITY]: {
    be: { name: 'KnowledgeCapacityBar', export: null, probe: 'barvY20yMi',
      features: ['{ size: i, projectUuid: a, tooltipContent: o } = r,', 'defaultMessage: "{pctUsed}% of project capacity used",', 'id: "barvY20yMi",',
        'href: "https://support.anthropic.com/en/articles/9517075-what-are-projects",', 'defaultMessage: "Learn more about project knowledge",',
        't(O, { defaultMessage: "Search mode", id: "BIYQtyYBdw" }),'] },
  },
  [ADD]: {
    vi: { name: 'AddTextContentDialog', export: null, probe: 'draft:r,onSave:a',
      features: ['{ isOpen: t, onClose: n, draft: r, onSave: a } = e,', 'defaultMessage: "Add text content",', 'id: "wgxHbQ7D69",', 'size: "lg",'] },
    // oi's draft (`[S] = s(si)`): a store of { title, content } the dialog edits and a save resets (S.setState(_i)).
    si: { name: 'createTextContentDraft', export: null, probe: 'return Ne(ci)', features: ['return Ne(ci);'] },
    oi: { name: 'KnowledgeAddMenu', export: 'm', probe: 'callerIdentifier:"project"',
      features: ['K0($, 0, { callerIdentifier: "project", toggleGithubModalOpen: E })', 'defaultMessage: "Error saving text content",',
        '"data-testid": "project-doc-upload",', 'i(vi, { isOpen: C, onClose: ne, draft: S, onSave: W }),'] },
  },
  [MEMORY]: {
    C: { name: 'MemoryPreviewContent', export: 'n', probe: 'bottomCTA:s',
      features: ['modalView: i,', 'setModalView: o,', 'bottomCTA: s,', 'onAfterUpdate: u,', 'd = v(t ? "project" : "account"),'] },
  },
};
// 3.6556.2 outputs of this area with no 4.16336.0 counterpart cut here (provenance.json `notPorted`).
export const NOT_PORTED = [
  { previous: '3.6556.2 helper modules (shared-52, shared-5, shared-78, shared-182, shared-2, shared-25, shared-frame To, …)',
    why: 'sliced inside the closure under their 4.16336.0 chunks and locals, or linked from the 4.16336.0 graph that holds them; this graph exports only the semantic roots' },
  { previous: 'viewTabsCopies shared-frame-6jtSkIit.js#To (3.6556.2 manifest)', why: 'no copy: the CDS names this closure reads are cds-core publicNames (sharedGraph cds-core)' },
];
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'shared-36-fqRFYwOb.js#U_': '463c9bdff33f115a0ca70754be8a0ac85c04c8ca7134c0be300bc29d1e9bdab2',
  'shared-36-fqRFYwOb.js#rv': '4014e8b2fd78db9b031d2a015f42e54cf6dbfd242f6214af0692dd1942034ac7',
  'shared-36-fqRFYwOb.js#b_': 'c6c1105a79081362f5bc7c8c14847cd2cf6c87e22b5f821716de42a8b24ac569',
  'shared-4-C_EiQb9h.js#Yj': '432764bef2402e1d02bdd9aa334156911dedeee41f17c3c989c5f5b8d044fe42',
  'c52b32660-CmYsbpbF.js#be': 'ec0b3afaea9239b4ce4a611cca6870c0e13e57d930ca6b4c28e614ca6a29b31b',
  'cf2f34ee4-CGe8SQnD.js#vi': 'c396eed84df175bc4f09031d98b47f3db021f4bf47a0a824a5e63f3e9a82dc14',
  'cf2f34ee4-CGe8SQnD.js#si': 'f7442f5f359b941b4f5f7c15b653385587b5efa8561bef11eaa4b4e72eea97b9',
  'cf2f34ee4-CGe8SQnD.js#oi': '7399fa6860f9f9105799a690243c575d820aad948885e39f7d70f6effa8e344d',
  'cffc9ea71-Do_Jrd6d.js#C': '39449f2ecdab8b4510af93ecd3a96ed8e29cad1c539ff50a4c27394b18052d21',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (host module it re-exports, or null
// when the adapter module answers it itself), features, why } ──────────────────────────────────────────────────────────
const CK = 'src/source-chat-knowledge-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', PV3 = 'src/source-project-v3-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl, the errors provider and GrowthBook feature flags (the routines-shared host services every 4.16336.0
  // region re-exports; useFeatureIsOn answers off: cf2f34ee4 di's nebula_drift_enabled MCP sources stay hidden, E49).
  [`${INTL}#q`]: { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  [`${INTL}#Gt`]: { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  [`${S62}#rP`]: { name: 'useErrors', from: RS, features: ['Error("Must be called within ErrorsProvider"),'] },
  [`${S25}#ko`]: { name: 'useFeatureIsOn', from: RS, features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  // cffc9ea71 C's memory services (3.6556.2 c274117ff _, shared-182 $k / iA, c89efce1a rc): this machine's memory
  // (electron/chat-memory.mjs) through ChatMemoryHostContext, unchanged contracts.
  ['c274117ff-CGNUUDgh.js#_']: { name: 'useChatMemoryAvailable', from: CK, features: ['e === "project" && n === "disabled_by_user" && r === !0'] },
  [`${S212}#Oz`]: { name: 'useChatMemoryQuery', from: CK, features: ['/api/organizations/${a}/memory?project_uuid=${e}', 'c = !!(e && t?.includeProjectImport),'] },
  [`${S212}#Rz`]: { name: 'useUpdateChatMemoryControls', from: CK, features: ['skipAutoResynthesize: r,', 'onChainSuccess: i,'] },
  ['c89efce1a-CleBUUAy.js#Mu']: { name: 'ChatMemoryMarkdown', from: CK, features: ['blockCitations: i,', 'normalizationMode: o,'] },
  // 4.16336.0 only: cffc9ea71 T's edit limits (GrowthBook dynamic config claudeai_saffron_frontend max_control_chars /
  // max_num_controls). No GrowthBook here: the official defaults (100 / 10) the config read falls back to.
  [`${S212}#cB`]: { name: 'useMemoryMaxControlChars', from: null, features: ['return Er("claudeai_saffron_frontend", "max_control_chars", 100, Qr);'] },
  [`${S212}#sB`]: { name: 'useMemoryMaxControls', from: null, features: ['return Er("claudeai_saffron_frontend", "max_num_controls", 10, Qr);'] },
  // cf2f34ee4 oi (the knowledge rail's "Add files" control) and di (its dropdown): the local project's services
  // (3.6556.2 shared-182 QW / yz, shared-156 tj / XA / wS, shared-4 Nb / kb / Qb, shared-7 qk, cf2f34ee4 Er / ur).
  [`${S212}#GQ`]: { name: 'useCreateKnowledgeText', from: CK, features: ['["create_project_doc", { orgUuid: i, projectUuid: e }]'] },
  [`${S212}#RW`]: { name: 'useKnowledgeProject', from: CK, features: ['placeholderFromLists: i,', 'refetchInterval: s,'] },
  [`${S183}#nN`]: { name: 'useKnowledgeGithubAvailable', from: CK, features: ['return rN() === !0;'] },
  [`${S183}#ZM`]: { name: 'useKnowledgeGithubAuth', from: CK, features: ['callerIdentifier: t,', 'toggleGithubModalOpen: n,'] },
  [`${S183}#rw`]: { name: 'useKnowledgeMcpServers', from: CK, features: ['remoteServers: t ? e.remoteServers : ew,'] },
  [`${ADD}#hi`]: { name: 'KnowledgeMcpSourceItems', from: CK, features: ['mcpServers: t,', 'setIsUploadingMcpSync: l,', 'if (t.length === 0) return null;'] },
  [`${S36}#Mb`]: { name: 'KnowledgeGithubSyncModal', from: CK, features: ['K1($, 0, e, f(Ab.Component, { ...e }))'] },
  [`${ADD}#$r`]: { name: 'ExampleProjectTooltip', from: PV3, features: ['n.push("/projects/create");', 'id: "aod9/juMdU",'] },
  [`${S4}#QI`]: { name: 'useKnowledgeTokens', from: CK, features: ['r = xn(XI, !!e && !t && !n),'] },
  [`${S4}#JI`]: { name: 'useKnowledgeCapacity', from: CK, features: ['n = on("project_knowledge_limit", "limit", zI, qn);'] },
  [`${S4}#_L`]: { name: 'useKnowledgeFileUpload', from: CK, features: ['{ projectUuid: t, onError: n, onSuccess: r } = e,', '{ mutateAsync: c } = Vf(t),'] },
  // c52b32660 be's search-mode services: the rollout (GrowthBook claude_ai_project_bananagrams) is off without GrowthBook.
  [`${S4}#KI`]: { name: 'useKnowledgeSearchRollout', from: CK, features: ['let e = Gt("claude_ai_project_bananagrams"),', 'n = Me("project_knowledge_search").isAvailable;'] },
  [`${S4}#mL`]: { name: 'useKnowledgeSearchThreshold', from: CK, features: ['if (n) return n.project_knowledge_search_threshold;'] },
  [`${S4}#qI`]: { name: 'useKnowledgeSearchActive', from: CK, features: ['if (n !== void 0) return !!(t && n.use_project_knowledge_search);'] },
  // shared-36 U_'s link resolution (3.6556.2 shared-52 hz): a url's claude.ai in-app route; none here.
  [`${S62}#KM`]: { name: 'knowledgeTileAppRoute', from: CK, features: ['let t = ze(e);', 'return t === null ? null : VM(t);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'c274117ff-CGNUUDgh.js#_': 'fb853975d5c0e866c23482e09c02e0785f26858553b2e761fbb8fba1847bdfba',
  'shared-212-BHMAi0oa.js#Oz': 'dc1fb761c90a74da91e5385f9e5efcb2fb58c004149fa020c033a09514f4fb4a',
  'shared-212-BHMAi0oa.js#Rz': '7b75719b08c33a5e4986a49cf63c0bbecd34c5d8349cf69ca80e79b8f224e404',
  'c89efce1a-CleBUUAy.js#Mu': '5ecd5b925fb6e7537506abd250cb08d47fa423c3a8524f99eb15af104ebdc6b4',
  'shared-212-BHMAi0oa.js#cB': 'fd80baa2541aff202e279bd05bb54ccaf4104ba772537927ce985f3b36eee4dd',
  'shared-212-BHMAi0oa.js#sB': '1a08384bed559f28b9c982602ca698e3a39f1dc5c88ef34180e423235c9ff4e3',
  'shared-212-BHMAi0oa.js#GQ': '3675fed5eb2b47afe449d26d8c2c96b8cbf5e614c2811b0a0672f421106cbf4b',
  'shared-212-BHMAi0oa.js#RW': '9c3d713161e38989622847a9bf02c86cc1c557b2f3d75f3262d919efa689f048',
  'shared-183-B2N6Zy4J.js#nN': '905aded1f3c7de1f12349f107236b696c1fce9a42f8bfa5a3ae63371ab133c88',
  'shared-183-B2N6Zy4J.js#ZM': 'cf22a8ac0e9a9f952a174e5dbe091a72f5b465f9c5ab06ef04b717cf0535baab',
  'shared-183-B2N6Zy4J.js#rw': '58aa041e37ef0943bf8f69b747c251a1b687b66334e5e7635369714d6004d358',
  'cf2f34ee4-CGe8SQnD.js#hi': 'eacd44750e6b74038a73331145bf6f87dedd827fbdef35073fcf0facfebedeca',
  'shared-36-fqRFYwOb.js#Mb': '2d801a255c7327c5c2fb0eca41ae12d161ef1bceced1c9d56395bbf581b8b7f0',
  'cf2f34ee4-CGe8SQnD.js#$r': '1094d50cb033710a7551d83fa38c502823c20d1ae70748193af1fab3a3275fe6',
  'shared-4-C_EiQb9h.js#QI': '3fef896e41bb4586e5437069d362d69b5f648c14e73fab4bfc5363277910347a',
  'shared-4-C_EiQb9h.js#JI': '20639199186a1dcc14e222f75c15dc2b8883d288010539fdb283f37a2d39e2c7',
  'shared-4-C_EiQb9h.js#_L': '66fc77da1d2c938f7824d2f9a74cb45aec2b222b66dee2c9da9191fa91f85a42',
  'shared-4-C_EiQb9h.js#KI': 'c8d34ad237c1535e9cb2c79dc556815d9fc20a28bf35d46d99bb361041372032',
  'shared-4-C_EiQb9h.js#mL': '0ba00dbe497af0242486e53c09f006cac6a1ff439af29c0739e8ac44afeda556',
  'shared-4-C_EiQb9h.js#qI': 'fd16036b8e653e505d49b777943082154e9be5cc5364212bac98a09ef4b652f0',
  'shared-62-DoCqVpIq.js#KM': '7fc4660dcb1552460be9e8eb9c01cad130751e6aaca9701b93788dd3692ad76b',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// D1 owners (account2/plan.json chat-knowledge `linked` + `owners.alreadyOwnedByAppGraphs`), the area that slices a
// binding listed last (working-line-v4 for the compiler helpers, as sessions-page-v4 links them).
// The plan's other owners (settings-nav, code-editor-current-v4, r3b-transcript-v4, cowork-scheduled-v4) hold nothing this
// closure reads once the host boundaries above are in place (an unused linked area stops generation, see artifacts()).
// (files-changes-v4 left in wave 7: the one binding read there, shared-frame Qo cdsRem, is cds-core's publicName
// state_sharedframe_Qo since cds-integrate/wave7, so it links cds-core.)
const LINKED_AREAS = ['chat-markdown-v4', 'code-routines-v4', 'sessions-page-v4', 'routines-shared-v4', 'working-line-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z0-9]+|c[0-9a-f]+|preload-helper|rolldown-runtime)-/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CHUNKS = [
  'shared-1-D1bGaTaN.js', 'shared-18-Cfqwgjc5.js', 'shared-33-DtdykY0y.js', S62, 'shared-123-1Hc1RTKl.js', S212,
  'c2b3583e6-DpQHiUus.js', 'c25d7186f-CHE_J2eY.js', 'c16bfbf9c-CBM88VeA.js', 'cfd4cc7c0-CdtTXAlA.js', 'c6bd2cd90-XoCcpz_l.js',
];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map(), { report = false } = {}) {
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
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (!report) {
        if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
        if (!pin) throw Error(`${file}#${local}: no reviewed pin`);
        if (pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      }
      found.push({ file, local, name: spec.name, export: alias, declarationSha256 });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map(), { report = false } = {}) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (!report) {
      if (!pin) throw Error(`adapter ${key}: no reviewed pin`);
      if (pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    }
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256 });
  }
  return out;
}

// The host adapter module exports exactly the adapted names: re-exported from the host adapter that documents it, or
// (from: null) declared by the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const reexported = new Map(), own = new Set();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) reexported.set(part.split(/\s+as\s+/).pop(), `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function|async function|class) ([\w$]+)/gm)) own.add(m[1]);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) {
    if (from === null ? !own.has(name) : reexported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not ${from === null ? 'declared' : `re-exported from ${from}`}`);
  }
  for (const name of [...reexported.keys(), ...own]) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (from === null) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function|class) ${name.replace('$', '\\$')}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-knowledge-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function chatKnowledgeV4Config() {
  return {
    name: 'chat knowledge (4.16336.0)', generator: 'extract-chat-knowledge-v4.mjs', output: path.join(root, CHAT_KNOWLEDGE_V4_OUTPUT),
    adapterModule: '../../source-chat-knowledge-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites: [], linkedCopies: {}, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/chat-knowledge/prestage/tools/probe.mjs) explores the same configuration.
export const probeConfig = chatKnowledgeV4Config;

export async function extractChatKnowledgeV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const l of LINKED_AREAS) { const area = typeof l === 'string' ? l : l.area; linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'))); }
  const cfg = {
    ...chatKnowledgeV4Config(),
    async artifacts(m) {
      // Every adapter is used (an unused entry would hide a binding that moved).
      const used = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.includes('#') ? i.via.split('#')[0] : i.via.split(':')[0]}#${i.original}`)));
      const unused = Object.keys(HOST_ADAPTERS).filter(k => !used.has(k));
      if (unused.length) throw Error(`unused adapters: ${unused.join(', ')}`);
      // Every linked area is used (an unused one would pin a manifest this graph does not read).
      const reads = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
      const idle = LINKED_AREAS.filter(a => !reads.has(a));
      if (idle.length) throw Error(`unused linked areas: ${idle.join(', ')}`);
      return {
        'index.mjs': `// Semantic names for the chat-knowledge roots (${official.referenceVersion}); generated by extract-chat-knowledge-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-knowledge-v4.mjs',
          previous: { generator: 'scripts/extract-chat-knowledge.mjs', output: 'src/generated/chat-knowledge', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, roots, adapters, notPorted: NOT_PORTED,
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots(new Map(), { report: true })) console.log('root', `${f.file}#${f.local}`, f.export, f.declarationSha256);
    for (const a of await pinAdapters(new Map(), { report: true })) console.log('adapter', a.original, a.declarationSha256);
  } else await extractChatKnowledgeV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
