// Cowork live sections, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region
// cowork-live): the same semantic roots extract-cowork-live.mjs cuts from 3.6556.2 into src/generated/cowork-live, cut
// from the frozen 4.16336.0 snapshot into the isolated graph src/generated/cowork-live-v4. The 3.6556.2 output is
// untouched (staged double output; no production switch: the host keeps reading src/generated/cowork-live).
//
//   c21f11e6d-Cyj5xu_D  jb  CoworkBrowserSection             (3.6556.2 hb; "Claude in Chrome" over the live frame card)
//                       Ib  CoworkComputerUseSection         (3.6556.2 bb; the computer-use preview store reader)
//                       Lb  CoworkComputerUseCard            (3.6556.2 xb; the card Ib renders with the preview)
//                       Gb  CoworkInAppBrowserTabsProbe      (3.6556.2 kb; the header-hosted tabs probe)
//                       Kb  CoworkInAppBrowserSection        (3.6556.2 Ab; the in-app browser row)
//                       kb  useCoworkBrowserActivityText     (3.6556.2 db; latest Claude in Chrome action + domain)
//                       Tb  useCoworkBrowserScreenshot       (3.6556.2 sb; wb over the Claude in Chrome server test Ln)
//                       Nb  useCoworkComputerUseScreenshot   (new root: wb over the computer-use server test yr; the
//                                                             activity panel xE passes it as Ib's screenshotSrc `ua`)
//   All eight are chunk-internal (no export alias); the activity panel xE renders them in this order after the Outputs
//   section: `bi && X && Gb`, `bi && !X && Kb`, jb (key `browser-${K}`), `Zr && Ib` (key `cu-${K}`).
//   Removed upstream: 3.6556.2 pb useCoworkToolRunning (the "tool is running" signal with its 2.5 s linger fb = 2500,
//   `{ onMount: "skip" }` change hook). 4.16336.0 derives isBrowserToolRunning / isComputerUseToolRunning inline in xE as
//   "an mcp_tool event of that server without mcpToolResult" (isBrowserToolPending / isComputerUseToolPending), with no
//   linger: there is no declaration to cut, so this graph does not export the name (provenance.json `removedRoots`).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here), configured the way
// extract-cowork-progress-v4.mjs is:
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (CDS names are cds-core publicNames, D46);
//     the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2/plan.json cowork-live `linked`): every binding one of them already holds and exports is
//     imported from it, never cut again;
//   - host boundaries as localAdapters (file#local), each original pinned by features and by its raw declaration sha256
//     (ADAPTER_PINS). src/source-cowork-live-v4-adapters.jsx only re-exports existing host adapters.
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
export const COWORK_LIVE_V4_OUTPUT = 'src/generated/cowork-live-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const PANEL = 'c21f11e6d-Cyj5xu_D.js';

// ── Roots: file -> local -> { name, export (null: chunk-internal), probe (raw), features (prettier) } ───────────────
export const ROOTS = {
  [PANEL]: {
    jb: { name: 'CoworkBrowserSection', export: null, probe: 'isBrowserToolRunning:c,onOpenDetail:l,collapsible:u,panelShown:d',
      features: ['defaultMessage: "Claude in Chrome",', 'id: "1XvgYxOFV4",', 'id: "2mDc1tSBbk",', 'defaultMessage: "Open browser activity",',
        'hasBrowserActivity: t,', 'isBrowserToolRunning: c,', 'livePreviewSessionId: o,', 'className: "flex items-center gap-2.5 py-1.5",', 'name: "Globe",'] },
    Ib: { name: 'CoworkComputerUseSection', export: null, probe: '{previewSessionId:t}=e,n=nn()',
      features: ['{ previewSessionId: t } = e,', 'n.state === "ready" && r !== void 0 && n.result.sessionId === r', 'p(Lb, { ...e, preview: i })'] },
    Lb: { name: 'CoworkComputerUseCard', export: null, probe: 'hasComputerUseActivity:t,screenshotSrc:n,previewSessionId:r',
      features: ['hasComputerUseActivity: t,', 'isComputerUseToolRunning: s,', 'preview: a,', 'wantsCapture: !0', '_ === Xe.Display', '_ === Xe.App',
        'id: "YsvDvI5YpB",', 'id: "FAq+HlOlG7"', 'id: "RfG2KsHAez"'] },
    Gb: { name: 'CoworkInAppBrowserTabsProbe', export: null, probe: '{previewId:t,onHasTabsChange:n}=e',
      features: ['{ previewId: t, onHasTabsChange: n } = e,', 'r.tabs.some(D_)', 'null'] },
    Kb: { name: 'CoworkInAppBrowserSection', export: null, probe: 'isPaneOpen:n,onTogglePane:r,collapsible:i,bare:a,onHasTabsChange:o',
      features: ['defaultMessage: "New tab",', 'id: "9a2ShG0Qn9",', '{ tabs: c, activeTabId: l } = O_(t),', 'hasBrowserTabs: d,', 'activeTabOrigin: v,'] },
    kb: { name: 'useCoworkBrowserActivityText', export: null, probe: 'latestActionText:i,currentDomain:n',
      features: ['latestActionText: i, currentDomain: n', 't.mcpToolName === "navigate"', 'Db.has(t.mcpToolName)', 'r.browserAction.label'] },
    Tb: { name: 'useCoworkBrowserScreenshot', export: null, probe: 'return wb(e,Ln)', features: ['return wb(e, Ln);'] },
    Nb: { name: 'useCoworkComputerUseScreenshot', export: null, probe: 'return wb(e,yr)', features: ['return wb(e, yr);'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c21f11e6d-Cyj5xu_D.js#jb': '0fcc096b43021f72bb065e517547b795935c7ab55eb414871c44d605c0cfbff1',
  'c21f11e6d-Cyj5xu_D.js#Ib': 'bf9910791ec67c705956d1e3d7b70a899264f6ac14f46445751555c9df92a9df',
  'c21f11e6d-Cyj5xu_D.js#Lb': '8113524a1a928fcabd74ab3c999c587d7647d2345884f3174b9772a039e9e9eb',
  'c21f11e6d-Cyj5xu_D.js#Gb': '294f1a7011c60e397d7c685e87dae2bf12d4e68cb1c6481f14e62a9f5272eff6',
  'c21f11e6d-Cyj5xu_D.js#Kb': '3b9518ecc60f097266971ac0cf8fb29963bb647b066a30206007115c57149f49',
  'c21f11e6d-Cyj5xu_D.js#kb': 'edef33d19aedda80bf9f58fbeb2dc3941148d05fd7500bea75102d53de38f2ce',
  'c21f11e6d-Cyj5xu_D.js#Tb': '0bb73375bcaa9aaa4879d0942f94396c093a884cb03395a81bb1501ace77cf6c',
  'c21f11e6d-Cyj5xu_D.js#Nb': '159ca5a8bb91516a1862b464f13c4a82ce4849a2a680c30b70283f6245185b64',
};
// 3.6556.2 roots with no 4.16336.0 counterpart (see the header). `inChunk` limits the evidence search to the panel chunk
// (the generic `{ onMount: "skip" }` change hook option occurs elsewhere, for other hooks).
export const REMOVED_ROOTS = [
  { name: 'useCoworkToolRunning', previous: 'c21f11e6d-Cyd8_HO8.js#pb', inChunk: PANEL, evidence: ['{onMount:"skip"}', '=2500'],
    why: 'the 4.16336.0 panel chunk has no linger timer and no change-hook "skip" option: xE derives the running flags inline (isBrowserToolPending / isComputerUseToolPending)' },
];

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features } ──────────────────────────
const LIVE = 'src/source-cowork-live-adapters.jsx', CT = 'src/source-code-transcript-adapters.jsx', V3 = 'src/source-cowork-progress-v3-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 ca2ef848d L1: the lazily loaded browser extension activity detail jb preloads (`ru(Dp, …)`): a handle, not sliced.
  'ca2ef848d-DA54buzo.js#A0': { name: 'unavailableActivityDetail', from: V3, features: ['var A0 = O0.handle;'] },
  // 3.6556.2 c5f921d63 ae: the live frame card's capture rate (GrowthBook dynamic config cowork_activity_panel_live_preview,
  // default { fps: 1 }); the card moved to cb34f9f5d (m, export t).
  'cb34f9f5d-WTLKHZrY.js#de': { name: 'useLivePreviewFps', from: LIVE, features: ['return u(d, p, f)?.fps ?? p.fps;'] },
  // 3.6556.2 c96143e67 l / c17c38211 d: the Claude in Chrome MCP client's browser listing and "Choose in Chrome".
  'c96143e67-CM5vXlwi.js#l': { name: 'useConnectedBrowsers', from: LIVE, features: ['name: "select_browser",'] },
  'c17c38211-CHCRmylO.js#d': { name: 'useSwitchBrowser', from: LIVE, features: ['{ switchBrowser: o, isSwitching: e }'] },
  // 3.6556.2 shared-1 Hu / shared-0 KS: the desktop live preview bridge, one host implementation for both chunks' copies.
  'shared-1-D1bGaTaN.js#Nm': { name: 'ComputerUseLivePreview', from: LIVE, features: ['Nm = globalThis["claude.web"]?.ComputerUseLivePreview'] },
  'shared-0-CnnWnVrT.js#EO': { name: 'ComputerUseLivePreview', from: LIVE, features: ['EO = globalThis["claude.web"]?.ComputerUseLivePreview'] },
  // shared-62 kw (export Sf): a GrowthBook feature gate read through the GrowthBook context (c83ff2dc8 yt's
  // `B("__gb__3460633190")`, the site picture's favicon source). No GrowthBook here: routines-shared's useFeatureIsOn
  // answers off (D29 / D31), as for every other gate of these graphs.
  'shared-62-DoCqVpIq.js#kw': { name: 'useFeatureIsOn', from: RS, features: ['t?.growthbook ? jr(t, n).on : !1'] },
  // shared-62 Ha (export CS): load the public suffix list chunk cd668e25e once (a dynamic import of a chunk this graph does
  // not emit; c83ff2dc8's site picture reads Ga, the "list loaded" store over it). The host does not serve that chunk
  // (src/source-code-transcript-adapters.jsx, the same answer as mcp-app-card's cut): the list never loads, so the site
  // name falls back to the bare host, as the original does until the list arrives.
  'shared-62-DoCqVpIq.js#Ha': { name: 'loadPublicSuffixList', from: CT, features: ['return typeof window > "u" ? Promise.resolve() : ((Pa ??= Va()), Pa);'] },
  // Account / intl (routines-shared-v4 and cowork-progress-v4 adapt the same bindings).
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: RS, features: ['Error("Must call inside CurrentAccountProvider"),'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'ca2ef848d-DA54buzo.js#A0': '55a20a69e7ba1303eebebab462f4cc23e04b751f1cee198075a7fde6b34ab4a0',
  'cb34f9f5d-WTLKHZrY.js#de': '80caf714f783985ff97f0333bc2001a32ac0d4e4f5cf24b324f51eefaece1ca6',
  'c96143e67-CM5vXlwi.js#l': '8c832d9bf10d2e40d33570a53d7131b1e93d471328f3f77695d12d405dac2543',
  'c17c38211-CHCRmylO.js#d': 'b4fe5ae44d2604a06413a8c1a6c0037aa16f65b5dc91b494e07cc1bcb2b86cf3',
  'shared-1-D1bGaTaN.js#Nm': '7769ea7dbd3cf274ccb9719bf852dfde28d9a0e47c9cdb6ae00b6aa3300ba193',
  'shared-0-CnnWnVrT.js#EO': '6f93a93791d8c7afb6fda6404a7e73e2a5cba59c5c94591ff20c9b3ce9057354',
  'shared-62-DoCqVpIq.js#kw': '35ed7d89df933de6b6fd13edcd89c8336d191dfa946bce6406ce6eeca3d7647f',
  'shared-62-DoCqVpIq.js#Ha': 'acb67cbb0d761657c236cc3960f84cf8f5e20d8576fbbd9786b8ad98f1e3f00e',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

const linkedCopies = {};

export const LINKED_AREAS = ['cowork-progress-v4', 'cowork-scheduled-v4', 'routines-shared-v4', 'session-rail-kit-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const CHUNKS = [
  'c155b6b71-CtScXPSD.js', 'c25e47851-CDXbwncf.js', 'c4772d572-u7UUqMeG.js', 'c82b159c8-BU8BW7E1.js', 'c83ff2dc8-3fRg4SBd.js',
  'c96143e67-CM5vXlwi.js', 'caf361d67-CZ088mCZ.js', 'cb34f9f5d-WTLKHZrY.js', 'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js',
  'shared-123-1Hc1RTKl.js', 'shared-153-DMw2VzSq.js', 'shared-183-B2N6Zy4J.js', 'shared-26-B-POtn5S.js', 'shared-3-IQTrO7Gx.js',
  'shared-62-DoCqVpIq.js', official.sharedFrame,
];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...CHUNKS.map(source => ({ source, target: target(source) })),
];

// Platform globals the closure reads that the shared list does not carry (runSlicer cfg.extraGlobals, each with its reason).
const extraGlobals = {
  DOMMatrixReadOnly: 'c83ff2dc8 We (the site picture thumbs\' motion): reads an element\'s computed transform translation; a browser built-in',
};

// Pinned on the minified bytes (each exactly once): how the activity panel xE feeds and orders the live sections, and the
// server identities / gate it reads them with (the host's coworkLiveActivity derives the same props, the panel owns the
// conditions).
const rawCallSites = [
  { source: PANEL, role: 'xE derives the screenshots, the Claude in Chrome activity text and the running flags (an mcp_tool event of that server without mcpToolResult; no linger), then renders Gb / Kb / jb / Ib in this order',
    features: ['Ji=Tb(U),{latestActionText:Yi,currentDomain:Xi}=kb(U)', 'e.mcpToolResult||(t.pending=!0)',
      'isBrowserToolPending:ra,hasComputerUseActivity:ia,isComputerUseToolPending:aa', 'ua=Nb(U)',
      'bi&&X&&p(Gb,{previewId:yi,onHasTabsChange:Ti})', 'bi&&!X&&p(Kb,{previewId:yi,isPaneOpen:Si,onTogglePane:zo,collapsible:!!K,onHasTabsChange:Ti})',
      'p(jb,{hasBrowserActivity:na,screenshotSrc:Ji,latestActionText:Yi', 'isBrowserToolRunning:ra',
      'Zr&&p(Ib,{hasComputerUseActivity:ia,screenshotSrc:ua,previewSessionId:A??K', 'isComputerUseToolRunning:aa'] },
  { source: 'shared-123-1Hc1RTKl.js', role: 'The panel\'s server identities (Zj Claude in Chrome = xE Ln, uA computer use = xE yr) and the computer-use card gate (sA = xE er, Zr)',
    features: ['var iA="computer-use",aA="cowork_computer_use_side_panel_card";', 'function sA(){return V(aA)}',
      'function uA({uuid:e,name:t}){return e?e===iA:t?t==="computer-use"||t==="Computer use":!1}',
      'function Zj({uuid:e,name:t}){return e?e==="a8f3c7e2-4b9d-4f1a-8c3e-9d2a5b7f8e1c"||e==="claude-in-chrome":t?t==="Claude in Chrome"||t==="claude-in-chrome":!1}',
      'Zj as Cp', 'uA as bm', 'sA as Sm'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

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

// The removed roots stay removed: none of their evidence strings occurs in the chunk they were searched in.
async function assertRemoved() {
  const out = [];
  for (const removed of REMOVED_ROOTS) {
    const text = await fs.readFile(path.join(official.ionSource, removed.inChunk), 'utf8');
    for (const ev of removed.evidence) if (text.includes(ev)) throw Error(`${removed.name}: ${ev} occurs in ${removed.inChunk}; the root is no longer removed upstream`);
    out.push({ ...removed });
  }
  return out;
}

async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, 'src/source-cowork-live-v4-adapters.jsx'), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`source-cowork-live-v4-adapters.jsx: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`source-cowork-live-v4-adapters.jsx: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the cowork-live-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function coworkLiveV4Config() {
  return {
    name: 'cowork live (4.16336.0)', generator: 'extract-cowork-live-v4.mjs', output: path.join(root, COWORK_LIVE_V4_OUTPUT),
    adapterModule: '../../source-cowork-live-v4-adapters.jsx', adapterFile: 'src/source-cowork-live-v4-adapters.jsx', adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, extraGlobals, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = coworkLiveV4Config;

export async function extractCoworkLiveV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const removedRoots = await assertRemoved();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...coworkLiveV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the cowork-live roots (${official.referenceVersion}); generated by extract-cowork-live-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => `${rs[l].name}`).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-cowork-live-v4.mjs',
          previous: { generator: 'scripts/extract-cowork-live.mjs', output: 'src/generated/cowork-live', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, removedRoots, adapters, linkedCopies,
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
  } else await extractCoworkLiveV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
