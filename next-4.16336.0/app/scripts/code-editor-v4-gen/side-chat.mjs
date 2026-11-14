// Area "side-chat", 4.16336.0 contract (round 2 unit code-editor:b): the side chat's context wire format and selection
// limit, the transcript selection hook, the latest-user-turn scroll callback, the status-label hook, the user text
// segmentation and its renderer, secret detection and masking, the tool announcement, the class constants of the side
// chat's turns and pane chrome, the MessageAttachments class and the pane header mouse-down guard. Same adapter file
// names and export names as the 3.6556.2 area (scripts/code-editor-gen/side-chat.mjs), so a later production switch
// changes import paths only.
//
// Every root is located by AST (common.mjs locatePinned: the one top-level declaration of its chunk carrying the probe or
// matching the pattern, with its export alias) and its raw declaration sha256 is pinned below; the copied code is the
// official program-scope closure (preview-graph.mjs sliceLinked: React from its real modules, cds-core public names from
// ../cds-core, the bindings of the linked graphs below imported from them, everything else copied in its own block
// scope). Nothing is renamed or rewritten; the scroll callback is the official arrow function's body, its four free
// refs (scroll element ref, session id, side-chat store, last measurement ref) becoming the parameters the host passes,
// exactly as in the 3.6556.2 area.
//
// D1 (module state lives in one graph): the d1-precheck of these closures found four stateful shared-212 declarations
// (Fd / Bd reassigned, Id / Vd their writers: the markdown serializer's module state) that turn-plan-v4/shared-212.mjs
// holds and exports, so they are linked from it. Pure helpers other graphs also copy are re-sliced in place (D1 counts
// only state): the r4e-findings mention escape (4.16336.0 shared-212 lb) and `once`, the c4d199b75 wire functions that
// code-composer-v4 / turn-plan-v4 also cut, the c96d752d0 functions nine graphs cut. Plan-named links: the label hold hook
// (3.6556.2 working-line EE, 4.16336.0 c96d752d0 pP) from working-line-v4/working-line.mjs, the shared-0 invisible-text
// helpers from routines-shared-v4/shared-0-CnnWnVrT.mjs. The 3.6556.2 zod link (mcp-app-host) is gone with the panel
// rectangle parser (below).
//
// 4.16336.0 vs 3.6556.2 (each adapter records `previous`):
//   side-chat-geometry / side-chat-persistence: not emitted. 4.16336.0 docks the side chat (c9bd7af9c YN: the store's
//     dock / dockedBySession, `epitaxy-side-chat flex h-full …`); the floating panel's rectangle placement, resize handles
//     and cursors (3.6556.2 cd97b284f e/t, cccc2cf0a EF/DF) and its stored-rectangle zod parser (c03935b01 Li/Fi/Ii/Ri)
//     have no 4.16336.0 declaration (removedInOfficial).
//   side-chat-context      c4d199b75 Se / B (same names), limit c96d752d0 DTt / OTt (z9 / B9), DTt located as the
//                          limit kTt passes to OTt.
//   transcript-selection   c80ec48f8 ut (mn); the owner-window lookup is cds-core ownerWindow.
//   side-chat-scroll       c9bd7af9c YN's callback (cccc2cf0a): also leaves room for a queued turn
//                          (`queuedBySession[d]!==void 0` picks the turn before the queued one).
//   side-chat-status       c96d752d0 G5 (V6); hold hook pP (EE) linked.
//   side-chat-user-segments c4d199b75 Xe (Ye).
//   side-chat-user-render  c96d752d0 wO (SP): text segments now pass through the secret-aware renderer (HPe / KPe);
//                          line breaks shared-11 ri (shared-10 Ns).
//   side-chat-secrets      shared-92 Rj / qj / Yj (shared-104 al / fl / ml); qj takes an optional visible limit.
//   side-chat-activity     c9bd7af9c kN (cccc2cf0a gF).
//   side-chat-chrome       c9bd7af9c VN, c2fd10b8d vd, shared-2 K8 / q8, shared-38 kt / Pt / Lt (shared-6 fh / vh / xh),
//                          c4db265df tn / an / sn / bn (Nt / Lt / zt / Qt).
//   side-chat-attachments  c2fd10b8d uf (qs). The snippet chip item Ef (uc) is pending: its chip popup Sd now carries
//                          the diff branch (c53a94863 J diff view, c719f6bd7 a parser) whose closure reaches the Pierre diff
//                          renderer (round 2 pierre-changes, not yet generated) and vendor-datadog's dynamic import;
//                          3.6556.2 replaced that call by hand, which this contract does not do.
//   side-chat-pane-events  c4db265df Sn (en); text-editable check shared-183 YU (shared-156 BK), asElementNode and
//                          isMacUserAgent are cds-core public names.
import * as G from './preview-graph.mjs';

const ion = 'ion';
const WIRE = 'c4d199b75-BFt-qsGU.js';
const C96 = 'c96d752d0-D9VB6ArX.js';
const SELECTION = 'c80ec48f8-D986pQRB.js';
const SIDE = 'c9bd7af9c-Bvb7EG4D.js';
const SECRETS = 'shared-92-BOgyxePb.js';
const BREAKS = 'shared-11-CNsu0Zu8.js';
const TURN = 'c2fd10b8d-DEwP4IO5.js';
const BUBBLE = 'shared-2-CsjIBQD8.js';
const SHELL = 'shared-38-DyF0_Fim.js';
const PANE = 'c4db265df-CHyZjtsm.js';

// D1 links (graph -> modules): see header.
export const linkedGraphs = [
  // Wave 8 (W8-RT): shared-212 Cv (the hidden-code-point test) is linked from r3b-tasks, its one owner; turn-plan-v4 links it
  // from there too since wave 8, so its shared-212.mjs no longer serves Cv.
  { graph: 'r3b-tasks', modules: ['invisible-character.mjs'] },
  { graph: 'turn-plan-v4', modules: ['shared-212.mjs'] },
  { graph: 'working-line-v4', modules: ['working-line.mjs'] },
  { graph: 'routines-shared-v4', modules: ['shared-0-CnnWnVrT.mjs'] },
];
// Module state the closures reach that another graph holds (d1-precheck): no adapter may copy it.
const neverCopy = ['shared-212-BHMAi0oa.js#Fd', 'shared-212-BHMAi0oa.js#Id', 'shared-212-BHMAi0oa.js#Bd', 'shared-212-BHMAi0oa.js#Vd'];
// Bindings that must arrive through a link (the plan's link of the label hold hook).
const requiredLinks = { 'side-chat-status.mjs': [`${C96}#pP`] };

export const removedInOfficial = {
  'side-chat-geometry.mjs': { previous: 'cd97b284f-Cpvb2TuL.js e/t, cccc2cf0a-DhZC33Gc.js EF/DF', why: '4.16336.0 docks the side chat (c9bd7af9c YN); no floating rectangle, resize handles or cursors' },
  'side-chat-persistence.mjs': { previous: 'c03935b01-yhcY34vt.js Li/Fi/Ii/Ri', why: 'the stored floating-panel rectangle parser has no 4.16336.0 declaration (c03935b01-BylKMWqe persists the docked side-chat store instead)' },
};

// Root pins: file -> export name -> { probe | pattern, features?, alias?, sha256, previous }.
export const rootPins = {
  [WIRE]: {
    sideChatContextQuestion: { pattern: /^function [\w$]+\(e,t\)\{return`\$\{[\w$]+\(t\)\}\\n\\n\$\{e\}`\}$/, alias: 'g', sha256: 'afbea9b966c78561ea30d308718bb746852fd38cf016c095a05a7fbab252ab6b', previous: 'Se' },
    parseSideChatQuestion: { probe: 'if(!e.includes("<!-- attach"))return{snippets:[],rest:e.trim()}', features: ['terminalTabId:r||void 0'], alias: null, sha256: '88cfc87f6a80970095a9bce844e9c36a299aaf9516e0bd33085b60102357b57f', previous: 'B' },
    parseSideChatUserText: { probe: 'i(),n.some(e=>e.kind==="list")?n:[{kind:"text",text:e}]', alias: 'S', sha256: 'b777a1874aff70337930f6fffe92cfa7dd6ce6a63e4e33a4dd8e28c0561675c3', previous: 'Ye' },
  },
  [C96]: {
    truncateSideChatContext: { probe: 'n>=55296&&n<=56319?t-1:t;return`${e.slice(0,r)}\\u2026`', alias: 'm', sha256: '44d10ceb6238ee7a60e4c2c917c7ea8574b4825d6192e4ad84ceed3c30505d7b', previous: 'B9' },
    useSideChatStatusLabel: { probe: '650,void 0,i.epoch)', features: ['{working:n,epoch:0}'], alias: 'Q', sha256: 'f0dc31ddfd9125176e02eebf8b04951b5ac4a9fb0fe0a46ec9550fde03ab9330', previous: 'V6' },
    renderSideChatUserSegment: { probe: 'if(e.kind==="list")return', features: ['e.text===""||e.text.endsWith('], alias: 'wo', sha256: '773724ff5c19eadf134d4d1aaf488f9b16cfefff5ac0a29e61681f5551cbe346', previous: 'SP' },
  },
  [SELECTION]: {
    useTranscriptSelection: { probe: 'containerOf:n,enabled:r}', features: ['"selectionchange"', 'e.cloneRange()', 'getSelection()?.removeAllRanges()'], alias: 'ot', sha256: '9199d5e3e4a8261c6605a4469100182cc71f660f864933d078a25b9df95fe02a', previous: 'mn' },
  },
  [SIDE]: {
    sideChatPanel: { probe: 'onDockedHide:n,dockedFocus:r', features: ['"epitaxy-side-chat flex h-full min-h-0 flex-col pt-md outline-none"', 'messagesBySession'], sha256: '2b523b7f52e6d1adc24029e777a5a7ad1c07f4754bd24627eca3de4b1e584a0a', previous: 'cccc2cf0a HF' },
    sideChatToolAnnouncement: { probe: 'defaultMessage:"Reading {file}"', features: ['case"Read":', 'case"Grep":'], sha256: '4b9e67ccf2f037a0732c0ca37eb7d539baa89c2fde4e315d638006e455022b87', previous: 'gF' },
    sideChatInsetClass: { pattern: /^[\w$]+="px-lg pt-md pb-\[24px\]"$/, sha256: 'f58018cf396a6a950542a24926f2a6aeeca7954cec23cff9c6664a8861952025', previous: 'FF' },
  },
  [SECRETS]: {
    detectSideChatSecrets: { probe: '.map(({added:e,...t})=>t)', alias: 'sf', sha256: 'e1b3a65d0ca29d44b2820475820b9d41b8a6382651f1ac77adf843c027bd680d', previous: 'al' },
    maskSideChatSecret: { probe: 'let n=Math.max(0,t);if(e.startsWith(', features: ['e.length<=12'], alias: 'ff', sha256: '608a0f095f47f70cb89b6b9fce8e9a7bcc62e94328d098fc1914fab357ddf755', previous: 'fl' },
    maskSideChatSecrets: { pattern: /^function [\w$]+\(e\)\{let t=[\w$]+\(e\);return t\.length>0\?[\w$]+\(e,t\):e\}$/, alias: 'pf', sha256: 'f1d044a9e768358d22a34567ef394d85e03d4a9bc5d9e60813f123e46dc62342', previous: 'ml' },
  },
  [BREAKS]: {
    sideChatTextBreaks: { probe: 'split(/\\r\\n?|\\n/);return n.length===1?t(e):', features: ['"br"'], alias: 'pr', sha256: '22fb1a66152472596ac64ee02dab0c59214929f7ea9678677893db6beffdf0f2', previous: 'shared-10 Ns' },
  },
  [TURN]: {
    sideChatUserTurnClass: { pattern: /^[\w$]+=`\$\{[\w$]+\} gap-sm`$/, alias: 'Pi', sha256: 'c2e6a7e6c71a4d61ecc4bacd164e2617bb13ddd88b346b5ed983d2e294afd911', previous: 'ss' },
    messageAttachmentsClass: { probe: '`epitaxy-user-attachments flex flex-wrap max-w-full ${', sha256: '0ea5f88fa9312c66827a1a9100dab9fe0e3cf7b1557a19f766985960ffb2d447', previous: 'qs' },
    messageContextChipItem: { probe: 'label:e.label??', features: ['body:e.text})},e.id)', 'role:"listitem"'], sha256: '328c9f9dd7744bea474c84b451d847fa2f0c169bb62a2c64088a3eca19d133d4', previous: 'uc' },
  },
  [BUBBLE]: {
    userBubbleShapeClass: { probe: '"rounded-[var(--cds-message-bubble-radius)] px-', sha256: '8cf99a2984c88b80464bcf81d8233a654f56cde36f3baed655129903bdd949d9', previous: 'C3' },
    userBubbleMeasureClass: { pattern: /^[\w$]+="max-w-\[var\(--cds-message-bubble-measure\)\]"$/, sha256: 'b7551964c32a25689d92befd610f04fa9538b0a4e86a6d2d0ff4908ee0afc057', previous: 'w3' },
  },
  [SHELL]: {
    paneHeaderLineClass: { pattern: /^[\w$]+="relative flex items-center justify-between gap-sm h-\[calc\(2rem\*var\(--cds-rem-scale,1\)\)\] ps-\[4px\] pe-\[4px\] shrink-0"$/, sha256: 'dc4387562fa4099733eaff3c3f4b384674fd9d1cd4fe0a2bcba40907c5748dbe', previous: 'shared-6 fh' },
    paneTitleClass: { probe: '`text-body font-normal font-control text-secondary select-none truncate ${', sha256: 'b0eaf2e9c67cad3e7a158c3586e604d55e8425375d7627ef9bc390ae151c9373', previous: 'shared-6 vh' },
    paneTrailingClass: { pattern: /^[\w$]+="relative z-\[1\] flex items-center gap-0\.5 shrink-0 draggable-none"$/, sha256: '80fcc7167f9677e1e025e15f9b2cced412f8123adf415bf16331ba302cd0e7cb', previous: 'shared-6 xh' },
  },
  [PANE]: {
    paneElevation: { pattern: /^[\w$]+="panel"$/, sha256: '9b6b0b15280f64b07bab5b24f6c88bd1dc240bf0aa04262eaa0e592dfe94425b', previous: 'Nt' },
    paneBase: { pattern: /^[\w$]+="min-w-0 shrink-0 relative isolate flex flex-col"$/, sha256: 'cf4228b9026dbb508782f10d103d28bd130cdea4f1ffc342a7f02586d3a84058', previous: 'It' },
    paneRootClass: { pattern: /^[\w$]+=`\$\{[\w$]+\} \$\{[\w$]+\}`$/, sha256: '8438cb7abb16877a2f0260e58efddab424fed4917442bec8303b17e93290cdb7', previous: 'Lt' },
    paneFlushRootClass: { pattern: /^[\w$]+=`\$\{[\w$]+\} rounded-none shadow-none`$/, sha256: 'c050c5e4e8ee8729c56fc434dcb99a7b7ec1fcfab839045813abee16e3a9f3f3', previous: 'zt' },
    paneBodyClass: { pattern: /^[\w$]+="flex flex-col flex-1 min-h-0 overflow-hidden"$/, sha256: '6c8ed9619b029a484955db06f500f94aeb98b968ec45011fa7ed212feda67245', previous: 'Qt' },
    paneHeaderMouseDown: { probe: 'e.button===2||e.button===0&&e.ctrlKey', features: ['?.closest("button")', 'e.preventDefault()'], sha256: '614d29d90b9a1dd68dfa9f908ee218205c586a181c9f3db43a8595b7a97bc53f', previous: 'en' },
  },
};
// Pinned declarations reached through a located root (not located by their own probe).
export const derivedPins = {
  sideChatContextLimit: { file: C96, via: 'truncateSideChatContext', sha256: '1caa7ff1ca304d6b1531a94567f766f7791eb890938da2a46137b669fe2ff101', previous: 'z9' },
};

const escapeName = name => name.replaceAll('$', '\\$');
const id = '[\\w$]{1,4}';

export async function emit(ctx) {
  const linked = await G.linkedTable(linkedGraphs);
  const roots = {};
  for (const [file, pins] of Object.entries(rootPins)) for (const [name, entry] of Object.entries(G.pinnedRoots(ctx, file, pins))) roots[name] = entry;
  const local = name => roots[name].local;
  const text = (file, l) => ctx.chunk(file, ion).top.get(l).text;

  // One adapter from one or more slices: a single slice stays top level (its root locals exported by name); several
  // slices each keep their own block scope (minified names of different chunks never meet).
  async function emitAdapter(name, comment, parts, { previous, extraRoots = {}, extraText = '', pendingRoots } = {}) {
    const slices = [];
    for (const part of parts) {
      const r = await G.sliceLinked(part.file, part.roots, { linked });
      for (const key of Object.keys(r.state)) throw Error(`${name}: copied module state ${key} (${r.state[key]}) needs a link or a stated owner`);
      slices.push({ ...part, r });
    }
    // Import aliases the copied text actually reads (sliceLinked records every candidate it considered).
    const imports = new Map(), links = [];
    for (const { r } of slices) {
      for (const [module, members] of r.imports) for (const [member, alias] of members) {
        if (!new RegExp(`(?<![\\w$])${escapeName(alias)}(?![\\w$])`).test(r.text)) continue;
        if (!imports.has(module)) imports.set(module, new Map());
        imports.get(module).set(member, alias);
      }
      for (const l of r.links) if (imports.get(l.module)?.has(l.name) && !links.some(x => x.binding === l.binding)) links.push({ binding: l.binding, module: l.module, name: l.name, kind: l.kind });
    }
    for (const key of requiredLinks[name] ?? []) if (!links.some(l => l.binding === key)) throw Error(`${name}: ${key} is no longer linked`);
    for (const { r } of slices) for (const b of r.bindings) if (neverCopy.includes(`${b.file}#${b.name}`)) throw Error(`${name}: would copy ${b.file}#${b.name}, module state turn-plan-v4 holds (D1)`);
    let body;
    const exportNames = parts.flatMap(p => Object.keys(p.exports));
    if (slices.length === 1) {
      const [{ r, exports }] = slices;
      body = `${r.text}\n${extraText}\nexport {${Object.entries(exports).map(([n, l]) => (n === l ? n : `${l} as ${n}`)).join(',')}};`;
    } else {
      body = slices.map(({ file, r, exports }) => `// ${file}\nconst {${Object.entries(exports).map(([n, l]) => (n === l ? n : `${l}:${n}`)).join(',')}}=(()=>{\n${r.text}\nreturn {${[...new Set(Object.values(exports))].join(',')}};\n})();`).join('\n')
        + `\n${extraText}\nexport {${exportNames.join(',')}};`;
    }
    const out = `// ${comment}\n${G.importText(imports)}\n${body}`;
    G.assertBound(name, out);
    const usedRoots = Object.fromEntries(exportNames.filter(n => roots[n]).map(n => [n, roots[n]]));
    await ctx.adapter(name, out, {
      sources: slices.flatMap(s => s.r.sources).filter((s, i, all) => all.findIndex(x => x.name === s.name) === i),
      bindings: slices.flatMap(s => s.r.bindings),
      roots: { ...usedRoots, ...extraRoots, ...(links.length ? { '@links': links } : {}), ...(pendingRoots ? { '@pending': pendingRoots } : {}) },
      realm: 'renderer', productionRealms: ['renderer'], previous,
    });
  }

  // Context: wire question / parser (c4d199b75) and the selection limit with its truncation (c96d752d0).
  const truncate = local('truncateSideChatContext');
  const limitCaller = ctx.locate(C96, ion, { pattern: new RegExp(`^function ${id}\\(e\\)\\{return ${escapeName(truncate)}\\(${id}\\(e\\),(${id})\\)\\}$`) });
  const limit = new RegExp(`,(${id})\\)\\}$`).exec(text(C96, limitCaller))[1];
  if (!/^[\w$]+=\d+$/.test(text(C96, limit)) || G.hasFeatures(text(C96, limit), ['=1500']) === false) throw Error(`${C96}#${limit}: side-chat context limit is no longer 1500`);
  const limitSha = (await import('./common.mjs')).declarationSha(ctx.chunk(C96, ion), limit);
  if (limitSha !== derivedPins.sideChatContextLimit.sha256) throw Error(`${C96}#${limit} (side-chat context limit) changed: ${limitSha}`);
  await emitAdapter('side-chat-context.mjs', `Original 4.16336.0 wire attachment question/parser (${WIRE}) and Unicode-safe selection limit (${C96}).`, [
    { file: WIRE, roots: [local('sideChatContextQuestion'), local('parseSideChatQuestion')], exports: { sideChatContextQuestion: local('sideChatContextQuestion'), parseSideChatQuestion: local('parseSideChatQuestion') } },
    { file: C96, roots: [limit, truncate], exports: { sideChatContextLimit: limit, truncateSideChatContext: truncate } },
  ], { previous: 'c4d199b75-D3cQB-UP.js + c96d752d0-CWv_7-n9.js', extraRoots: { sideChatContextLimit: { file: C96, local: limit, sha256: limitSha, via: `${limitCaller} (truncation call)`, previous: 'z9' } } });

  // Transcript selection hook.
  await emitAdapter('transcript-selection.mjs', `Original 4.16336.0 compiled transcript selection hook (${SELECTION}).`, [
    { file: SELECTION, roots: [local('useTranscriptSelection')], exports: { useTranscriptSelection: local('useTranscriptSelection') } },
  ], { previous: 'c80ec48f8-D2IVcRNS.js' });

  // Scroll: the side chat's latest-user-turn callback, the one arrow function of YN reading messagesBySession,
  // querySelectorAll and scrollHeight; its constants and the user-turn class it queries are sliced from the chunk.
  const panel = ctx.chunk(SIDE, ion).top.get(local('sideChatPanel'));
  const hits = [];
  (function find(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(find); return; }
    if (node.type === 'ArrowFunctionExpression' && node.body.type === 'BlockStatement') {
      const body = ctx.chunk(SIDE, ion).text.slice(node.body.start, node.body.end);
      if (body.includes('messagesBySession') && body.includes('querySelectorAll') && body.includes('scrollHeight')) hits.push(body);
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'loc' && key !== 'leadingComments' && key !== 'trailingComments' && value && typeof value === 'object') find(value);
  })(panel.node);
  if (hits.length !== 1) throw Error(`${SIDE}: expected one side-chat scroll callback, found ${hits.length}`);
  const [scrollBody] = hits;
  const head = new RegExp(`^\\{let (${id})=(${id})\\.current;if\\(!\\1\\)return;let ${id}=(${id})&&(${id})\\?\\.getState\\(\\)\\.messagesBySession\\[\\3\\]\\|\\|\\[\\],${id}=${id}\\.at\\(-1\\)\\?\\.role==="assistant",${id}=(${id})\\.current;if\\(\\5\\.current=\\{el:`).exec(scrollBody);
  const tolerance = new RegExp(`\\.scrollTop\\+${id}\\.view<${id}\\.height-(${id})\\)return;`).exec(scrollBody)?.[1];
  const offset = new RegExp(`\\+${id}\\.scrollTop-(${id});${id}\\.scrollTo\\(\\{top:Math\\.max\\(`).exec(scrollBody)?.[1];
  const turnClass = /querySelectorAll\(`\.\$\{([\w$]+)\}`\)/.exec(scrollBody)?.[1];
  const emptyLocal = new RegExp(`,${escapeName(head?.[5] ?? '#')}=${id}\\((${id})\\)`).exec(panel.text)?.[1];
  if (!head || !tolerance || !offset || !turnClass || !emptyLocal) throw Error(`${SIDE}: side-chat scroll callback shape changed`);
  if (!/^[\w$]+=\{el:null,sessionId:null,turns:0,reply:!1,height:0,view:0\}$/.test(text(SIDE, emptyLocal))) throw Error(`${SIDE}#${emptyLocal} is no longer the empty scroll measurement`);
  for (const c of [tolerance, offset]) if (!/^[\w$]+=\d+$/.test(text(SIDE, c))) throw Error(`${SIDE}#${c} is no longer a number`);
  const turnImport = ctx.chunk(SIDE, ion).imports.get(turnClass);
  if (turnImport?.from !== TURN || text(TURN, ctx.exportedLocal(TURN, ion, turnImport.imported)) !== `${ctx.exportedLocal(TURN, ion, turnImport.imported)}="epitaxy-user-turn"`) throw Error(`${SIDE}#${turnClass} is no longer the epitaxy-user-turn class`);
  const [, , refName, sessionName, storeName, lastName] = head;
  {
    // The body's free names are exactly the four refs, the three constants and the turn class.
    const probe = `function f(${refName},${sessionName},${storeName},${lastName})${scrollBody}`;
    const babel = (await import('../../../tools/node_modules/playwright/lib/transform/babelBundle.js')).default;
    let globals = [];
    babel.traverse(babel.babelParse(probe, 'scroll', true), { Program(p) { globals = Object.keys(p.scope.globals).filter(n => n !== 'f' && n !== 'Math'); p.stop(); } });
    const expected = [tolerance, offset, turnClass].sort().join();
    if (globals.sort().join() !== expected) throw Error(`${SIDE}: scroll callback reads ${globals.join(', ')} (expected ${expected})`);
  }
  const scrollSha = (await import('./common.mjs')).sha(scrollBody);
  await emitAdapter('side-chat-scroll.mjs', `Original 4.16336.0 side-chat latest-user-turn scroll callback (${SIDE} ${local('sideChatPanel')}). Refs and the side-chat store are supplied by the host.`, [
    { file: SIDE, roots: [tolerance, offset, emptyLocal, turnClass], exports: { emptySideChatScroll: emptyLocal } },
  ], { previous: 'cccc2cf0a-DhZC33Gc.js', extraText: `export function syncSideChatScroll(${refName},${sessionName},${storeName},${lastName})${scrollBody}`,
    extraRoots: { sideChatPanel: roots.sideChatPanel, syncSideChatScroll: { file: SIDE, text: `arrow function of ${local('sideChatPanel')}`, params: [refName, sessionName, storeName, lastName], sha256: scrollSha } } });

  // Status label hook.
  await emitAdapter('side-chat-status.mjs', `Original 4.16336.0 compiled side-chat status-label hook (${C96}); label hold hook from working-line-v4.`, [
    { file: C96, roots: [local('useSideChatStatusLabel')], exports: { useSideChatStatusLabel: local('useSideChatStatusLabel') } },
  ], { previous: 'c96d752d0-CWv_7-n9.js V6' });

  // User text segmentation.
  await emitAdapter('side-chat-user-segments.mjs', `Original 4.16336.0 text/list segmentation of side-chat user text (${WIRE}).`, [
    { file: WIRE, roots: [local('parseSideChatUserText')], exports: { parseSideChatUserText: local('parseSideChatUserText') } },
  ], { previous: 'c4d199b75-D3cQB-UP.js Ye' });

  // User segment renderer and line breaks.
  await emitAdapter('side-chat-user-render.mjs', `Original 4.16336.0 user segment renderer (${C96}) and line-break presentation (${BREAKS}).`, [
    { file: C96, roots: [local('renderSideChatUserSegment')], exports: { renderSideChatUserSegment: local('renderSideChatUserSegment') } },
    { file: BREAKS, roots: [local('sideChatTextBreaks')], exports: { sideChatTextBreaks: local('sideChatTextBreaks') } },
  ], { previous: 'c96d752d0-CWv_7-n9.js SP + shared-10-D6FXWZph.js Ns' });

  // Secrets: detector, single-value mask, whole-text redaction (the redaction masks with the single-value mask).
  const maskAll = text(SECRETS, local('maskSideChatSecrets'));
  const [, detectCall, replaceCall] = /let t=([\w$]+)\(e\);return t\.length>0\?([\w$]+)\(e,t\):e/.exec(maskAll);
  if (detectCall !== local('detectSideChatSecrets')) throw Error(`${SECRETS}#${local('maskSideChatSecrets')} no longer redacts what ${local('detectSideChatSecrets')} detects`);
  if (!new RegExp(`^function ${escapeName(replaceCall)}\\(e,t\\)\\{return ${id}\\(e,t,${escapeName(local('maskSideChatSecret'))}\\)\\}$`).test(text(SECRETS, replaceCall))) throw Error(`${SECRETS}#${replaceCall} no longer masks with ${local('maskSideChatSecret')}`);
  await emitAdapter('side-chat-secrets.mjs', `Original 4.16336.0 secret detector, mask and whole-text redaction (${SECRETS}).`, [
    { file: SECRETS, roots: ['detectSideChatSecrets', 'maskSideChatSecret', 'maskSideChatSecrets'].map(local), exports: Object.fromEntries(['detectSideChatSecrets', 'maskSideChatSecret', 'maskSideChatSecrets'].map(n => [n, local(n)])) },
  ], { previous: 'shared-104-CTONUSaz.js al/fl/ml' });

  // Tool announcement (host supplies the intl formatter).
  await emitAdapter('side-chat-activity.mjs', `Original 4.16336.0 side-chat tool announcement (${SIDE}); host supplies the intl formatter.`, [
    { file: SIDE, roots: [local('sideChatToolAnnouncement')], exports: { sideChatToolAnnouncement: local('sideChatToolAnnouncement') } },
  ], { previous: 'cccc2cf0a-DhZC33Gc.js gF' });

  // Chrome class constants: the side chat's inset (YN's turn list and empty notice), the user turn, the bubble shape and
  // measure, the pane header line / title / trailing row, the pane elevation, root, flush root and body.
  const paneBase = local('paneBase');
  if (!new RegExp(`^${escapeName(local('paneRootClass'))}=\`\\$\\{${escapeName(paneBase)}\\} \\$\\{${id}\\}\`$`).test(text(PANE, local('paneRootClass')))) throw Error(`${PANE}#${local('paneRootClass')} is no longer the pane base plus elevation shadow`);
  if (!text(PANE, local('paneFlushRootClass')).startsWith(`${local('paneFlushRootClass')}=\`\${${paneBase}}`)) throw Error(`${PANE}#${local('paneFlushRootClass')} is no longer the pane base, flush`);
  await emitAdapter('side-chat-chrome.mjs', 'Original 4.16336.0 class constants of the side chat\'s turns and pane chrome (strings only).', [
    { file: SIDE, roots: [local('sideChatInsetClass')], exports: { sideChatInsetClass: local('sideChatInsetClass') } },
    { file: TURN, roots: [local('sideChatUserTurnClass')], exports: { sideChatUserTurnClass: local('sideChatUserTurnClass') } },
    { file: BUBBLE, roots: [local('userBubbleShapeClass'), local('userBubbleMeasureClass')], exports: { userBubbleShapeClass: local('userBubbleShapeClass'), userBubbleMeasureClass: local('userBubbleMeasureClass') } },
    { file: SHELL, roots: ['paneHeaderLineClass', 'paneTitleClass', 'paneTrailingClass'].map(local), exports: Object.fromEntries(['paneHeaderLineClass', 'paneTitleClass', 'paneTrailingClass'].map(n => [n, local(n)])) },
    { file: PANE, roots: ['paneElevation', 'paneRootClass', 'paneFlushRootClass', 'paneBodyClass'].map(local), exports: Object.fromEntries(['paneElevation', 'paneRootClass', 'paneFlushRootClass', 'paneBodyClass'].map(n => [n, local(n)])) },
  ], { previous: 'cccc2cf0a FF, c2fd10b8d ss, shared-2 C3/w3, shared-6 fh/vh/xh, c4db265df Nt/Lt/zt/Qt', extraRoots: { paneBase: roots.paneBase } });

  // MessageAttachments class; the snippet chip item is pending (header).
  await emitAdapter('side-chat-attachments.mjs', `Original 4.16336.0 MessageAttachments class (${TURN}); the context chip item is pending (Pierre diff branch).`, [
    { file: TURN, roots: [local('messageAttachmentsClass')], exports: { messageAttachmentsClass: local('messageAttachmentsClass') } },
  ], { previous: 'c2fd10b8d-DB1Sgoyz.js qs/uc', pendingRoots: { messageContextChipItem: { ...roots.messageContextChipItem, blockedOn: 'pierre-changes-v4 (c53a94863-BDspYDCo.js J diff view / G, c719f6bd7-BWCXApc1.js a diff parser; closure also reaches vendor-datadog dynamic import)' } } });

  // Pane header mouse-down guard.
  await emitAdapter('side-chat-pane-events.mjs', `Original 4.16336.0 pane header mouse-down guard and the text-editable check it reads (${PANE}).`, [
    { file: PANE, roots: [local('paneHeaderMouseDown')], exports: { paneHeaderMouseDown: local('paneHeaderMouseDown') } },
  ], { previous: 'c4db265df-fNhlkQCj.js en' });
}
