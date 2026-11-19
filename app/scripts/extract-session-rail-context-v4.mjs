// Session rail Context section, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 6, region
// session-rail-context): the same semantic roots scripts/extract-session-rail-context.mjs cuts from 3.6556.2 into
// src/generated/session-rail-context, cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/session-rail-context-v4. The 3.6556.2 output is untouched (staged double output; no production switch:
// src/source-session-rail.jsx / source-session-rail-context.jsx keep reading src/generated/session-rail-context, and
// cowork-approval links it by original identity until its own cutover).
//
//   c73f45bc3-C7dtUSq8  rC  SessionRailContext (export u; 3.6556.2 Lx, cf74bc599's `contextSection`): the bridge dS around
//                       iC  RailContextCard (3.6556.2 Rx): the kit's RailCard "Context" (rollup nC, the row actions tC in
//                           c2d611398's row-actions context), rendering c227f4d5e w3 (export L) inline, contextOnly
//                       nC  railContextRollup (3.6556.2 Ix)   tC railContextRowActions (3.6556.2 Fx)
//   c227f4d5e-DGDdGBTz  T3  RailContextPanel (3.6556.2 L3): tA's Compact session action, the auto-compact window row C4
//                           (behind GrowthBook __gb__2706548410, off here), then c2d611398 Ye with `layout: "rail"`
//                       X4  contextWindowMax (export z; 3.6556.2 c3)   Q4 contextWindowView (3.6556.2 l3)
//                       _4  autoCompactWindowOption (export G; 3.6556.2 O4; w3's inline `autoCompactSettable` reads it)
//   c2d611398-B4PMFQ_p  Ye  ContextUsagePanel (export t; 3.6556.2 Le)   ce ContextBreakdown (export o; 3.6556.2 J)
//                       Q   contextUsedTokens (export c; 3.6556.2 W)
//   shared-8-BqfCbkJd   zZ  contextSummary (export A; 3.6556.2 DX: "used / max (pct%)")
//   c6b47b88e-lSBDS3wY  o   ReadoutCard (the StackedMeter's lazily loaded readout card; host loadStackedMeterReadout)
// The chart kit (c389a02dd), the StackedMeter (c91b6e9db), the tooltip kit (cddbfc1b6), useSpring / useMotionValue
// (c0ce8f953 / ca74e9c4f; their vendor-motion bindings link working-line-v4) and the leaf helpers come with the closure.
//
// c227f4d5e w3 (export L; 3.6556.2 F3) is not sliced, as in the 3.6556.2 graph: its closure (re-measured on every run,
// `MEASURED`) is the /context report query and its prefetch, the plan meters, the model catalog's served windows, the
// ring popover and telemetry. Its inline branch (the only one the rail renders, `P = b === "inline"`) is the host stand-in
// RailContextUsage (src/source-session-rail-context-v4.jsx), which follows the expressions pinned in `rawCallSites` over
// the host's context source and renders the generated T3.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, account2 plan.json session-rail-context `linked`): code-composer-v4, routines-shared-v4,
//     session-rail-kit-v4 (the rail store hooks Q3 / m6 / u6 and the RailCard M), working-line-v4 (vendor-motion and the
//     compiler-helper bindings) — every binding one of them already holds and exports is imported from it, never cut
//     again; shared-8 SZ (pure token scaler) working-line-v4 cuts without exporting is cut again here (linkedCopies);
//   - host boundaries as localAdapters (file#local): the same official services the 3.6556.2 graph adapts (now at their
//     4.16336.0 chunks/locals). src/source-session-rail-context-v4-adapters.jsx only re-exports existing host adapters
//     plus the two stand-ins of src/source-session-rail-context-v4.jsx. Each original is pinned by features and by its raw
//     declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const SESSION_RAIL_CONTEXT_V4_OUTPUT = 'src/generated/session-rail-context-v4';
const ADAPTER_FILE = 'src/source-session-rail-context-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, same pin as cowork-progress-v4 / composer-env-v4).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const CARD = 'c73f45bc3-C7dtUSq8.js';
export const COMPACT = 'c227f4d5e-DGDdGBTz.js';
export const PANEL = 'c2d611398-B4PMFQ_p.js';
export const TOKENS = 'shared-8-BqfCbkJd.js';
export const READOUT = 'c6b47b88e-lSBDS3wY.js';
export const METER = 'c91b6e9db-BexYIwN2.js';

// ── Roots: file -> local -> { name, old (3.6556.2 root), export (chunk alias, null: chunk-internal), probe (raw), features } ─
export const ROOTS = {
  [CARD]: {
    rC: { name: 'SessionRailContext', old: 'c73f45bc3-B7hbL7H9.js#Lx', export: 'u', probe: 'scopeStore:n,bridge:i,...t',
      features: ['({ scopeStore: n, ...t } = e)', 'let i = dS(n);', 'i ? r(iC, { scopeStore: n, bridge: i, ...t }) : null'] },
    iC: { name: 'RailContextCard', old: 'c73f45bc3-B7hbL7H9.js#Rx', export: null, probe: 'rollup:nC',
      features: ['id: "context",', 'r(Z, { defaultMessage: "Context", id: "V2qutIKrxy" })', 'rollup: nC,', 'presentation: "inline",', 'contextOnly: !0,',
        'c?.menu === "context" &&', 'n.setState({ openComposerMenu: null })', 'r(fs.Provider, { value: v, children: b })'] },
    nC: { name: 'railContextRollup', old: 'c73f45bc3-B7hbL7H9.js#Ix', export: null, probe: '"data-rail-context-pct"',
      features: ['t?.getAttribute("data-rail-context-pct") ?? NaN', 'pct: Number.isFinite(n) ? n : null'] },
    tC: { name: 'railContextRowActions', old: 'c73f45bc3-B7hbL7H9.js#Fx', export: null, probe: 'id:"KwN+nYX98p"',
      features: ['defaultMessage: "Manage connector",', 'defaultMessage: "Manage connectors",', 'defaultMessage: "Edit memory files",',
        'defaultMessage: "View memory files",', 'reveals: "memory",', '{ openConnectors: t, openSkills: n, openMemory: r, mcpToolOpener: i } = e,'] },
  },
  [COMPACT]: {
    T3: { name: 'RailContextPanel', old: 'c227f4d5e-B-FYKrwT.js#L3', export: null, probe: 'layout:"rail",liveTokens:r',
      features: ['layout: "rail",', 'la(d.messages, "hkc1yt")', 'autoCompactSettable: t,', 'railSetting: _,', 'liveTokens: r,', 'u = tA(s, l),'] },
    X4: { name: 'contextWindowMax', old: 'c227f4d5e-B-FYKrwT.js#c3', export: 'z', probe: '{kind:"served",max:s}',
      features: ['if (s !== null) return { kind: "served", max: s };', '? { kind: "staleEngine", ...c }', ': { kind: "engine", max: e?.rawMaxTokens ?? t?.rawMaxTokens ?? null };'] },
    Q4: { name: 'contextWindowView', old: 'c227f4d5e-B-FYKrwT.js#l3', export: null, probe: 'autocompactBufferTokens:null',
      features: ['if (e.kind === "staleEngine")', 'if (e.kind === "engine") return { usage: t, windowFacts: n };', 'autocompactBufferTokens: null,'] },
    _4: { name: 'autoCompactWindowOption', old: 'c227f4d5e-B-FYKrwT.js#O4', export: 'G', probe: '{onThisComputer:t}',
      features: ['if (r === void 0 || r === "env" || r === "unknown-model") return null;', ': { windowTokens: n.rawMaxTokens, userSet: i };'] },
  },
  [PANEL]: {
    Ye: { name: 'ContextUsagePanel', old: 'c2d611398-Y2NVtf8_.js#Le', export: 't', probe: 'id:"4XCjSHnPX/"',
      features: ['defaultMessage: "Send a message to see context usage.",', 'defaultMessage: "Send a message to see the breakdown.",',
        'defaultMessage: "Last updated {time}. Refreshes when this turn ends.",', 'defaultMessage: "Last updated {time}. Send a message to refresh.",',
        'railSetting:', 'windowOnly:', 'liveTokens:'] },
    ce: { name: 'ContextBreakdown', old: 'c2d611398-Y2NVtf8_.js#J', export: 'o', probe: 'railHeadline:',
      features: ['railHeadline:', 'railSetting:', 'meterValues:', '"p-3 rounded-lg bg-alpha-1 max-w-[520px]"'] },
    Q: { name: 'contextUsedTokens', old: 'c2d611398-Y2NVtf8_.js#W', export: 'c', probe: 'e.categories.reduce(',
      features: ['return e.categories.some(A)', ': (e.totalTokens ?? null);'] },
  },
  [TOKENS]: {
    zZ: { name: 'contextSummary', old: 'shared-8-Db1QN4mf.js#DX', export: 'A', probe: 'summary:bZ(e),contextPct:null',
      features: ['if (t === null || (e > t && !n)) return { summary: bZ(e), contextPct: null };', 'summary: r ? `${bZ(e)} / ${bZ(t)} (${i}%)` : `${bZ(e)} / ${bZ(t)}`,'] },
  },
  [READOUT]: {
    o: { name: 'ReadoutCard', old: 'c6b47b88e-C-bftS07.js#o', export: 'ReadoutCard', probe: 'barRef:s',
      features: ['e.key === "Escape" &&', '!e.isComposing &&', 'barRef: s,', 'pointedId: p,', 'onDismiss: h,', 'e("bdi", { children: d })', 'notes: !0,'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c73f45bc3-C7dtUSq8.js#rC': '8b632e26922a6ff2435fce5d23f285e8bd0f90958f18c1eca3f2fa512f130dfe',
  'c73f45bc3-C7dtUSq8.js#iC': '18de0e5274be402773e7b934d3dab1df0f8330c87afb4dc9eb06b8a3e9fce2ec',
  'c73f45bc3-C7dtUSq8.js#nC': '5124ba2eafb8c27660229e73b07bde7c8eb4e95dc57cd15571e91946d154d1ca',
  'c73f45bc3-C7dtUSq8.js#tC': '91e0b09a246f19aba7c9ec1dc119b77af089e84a7145b1b88d7c7d57f1ae5524',
  'c227f4d5e-DGDdGBTz.js#T3': 'a0c081c6fbebae7a7b95b7c08c259728a50ca6e8ee9ca5317094bccf3f9db88d',
  'c227f4d5e-DGDdGBTz.js#X4': '33737e7cfcf1a29d5d36500143603deb6362c94f9b50e9281fbabfd6b0e31dbc',
  'c227f4d5e-DGDdGBTz.js#Q4': 'c3410d54653ff8eee1df8a7096d38a09a4f6584a684bf88bd5efc5c764bfeb03',
  'c227f4d5e-DGDdGBTz.js#_4': '1bf06469ec1b8532e19655f14793413b33a07acd12a9da4cb15eeffe1499cd60',
  'c2d611398-B4PMFQ_p.js#Ye': '43fe9f86ed12c91375275ec41bf6f1cff3d3823e9e9ccd352ef784cae7a4cf28',
  'c2d611398-B4PMFQ_p.js#ce': 'fa3fd3b0ec0731c34b83ded7e19a8f6b802c258e00590362507d4721bf1a839f',
  'c2d611398-B4PMFQ_p.js#Q': '90891b4a42a2bd3d663c03cc211f80baf83d87b4a09f9324d33836cab20624c5',
  'shared-8-BqfCbkJd.js#zZ': 'ed250e1c21c7f7770f46518d392a1cc4a843c04332cffd6be931eaef3117fbb8',
  'c6b47b88e-lSBDS3wY.js#o': '748297738075e84a56cc9d022a5b64d1e81110dbf594020ac3a737e9faf27aab',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from (the host module it re-exports), old,
// features, closureFeatures (raw text of the same-chunk closure) } ─────────────────────────────────────────────────────
const CTX = 'src/source-session-rail-context-adapters.jsx', CTX4 = 'src/source-session-rail-context-v4.jsx';
const KIT = 'src/source-session-rail-kit-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // w3 (export L): the context usage panel; its inline branch is RailContextUsage (see the header and MEASURED).
  [`${COMPACT}#w3`]: { name: 'RailContextUsage', from: CTX4, old: 'c227f4d5e-B-FYKrwT.js#F3',
    features: ['inComposerRow: g,', 'restoresKeptWindow: P,', 'Yt = P ? "rail_card" : "ring_popover",', 'p(T3, {', 'autoCompactSettable: n,', 'windowOnly: a,'] },
  // c91b6e9db N: the StackedMeter's lazy readout card loader (import("./c6b47b88e-…")); host: loadStackedMeterReadout.
  [`${METER}#N`]: { name: 'loadStackedMeterReadout', from: CTX4, old: 'c91b6e9db-0Cdn02JS.js#M',
    features: ['"cds_stacked_meter_readout"', 'import("./c6b47b88e-lSBDS3wY.js")', '(e) => ({ default: e?.ReadoutCard ?? j }),', '() => ({ default: j }),'] },
  // dS: the composer footer bridge in the scope store (`{ modelId, onShowUsageReport, onCompact, openRequest, creditOffered }`).
  [`${CARD}#dS`]: { name: 'useRailContextBridge', from: CTX, old: 'c73f45bc3-B7hbL7H9.js#_b',
    features: ['onShowUsageReport: t.onShowUsageReport,', 'onCompact: t.onCompact,', 'openRequest: n,', 'creditOffered: r,'] },
  // rA: the compact action's send state (session meta query, live session store, ownership).
  [`${COMPACT}#rA`]: { name: 'useCompactSendState', from: CTX, old: 'c227f4d5e-B-FYKrwT.js#yW',
    features: ['hasHandler: t,', 'turnArmed: o,', 'responding: a,', 'workerSaysWorking: c,', 'compacting: l,', 'p = i?.remote?.kind === "ssh";'] },
  // h4: the auto-compact window setting behind GrowthBook __gb__2706548410 (u4): off here (the host config, same values).
  [`${COMPACT}#h4`]: { name: 'useAutoCompactWindowConfig', from: CTX, old: 'c227f4d5e-B-FYKrwT.js#E4',
    features: ['e = Gt(u4),', 't = nn(u4);', '{ ...d4, enabled: e, armed: t, windows: m4 }'],
    closureFeatures: ['u4="__gb__2706548410"', 'd4={recommendedTokens:4e5,offerMinTokens:2e5}', 'f4=1e6', 'm4=[f4,5e5,4e5,3e5]'] },
  // y4: the session runs on this computer (asked only while h4 is enabled: never here).
  [`${COMPACT}#y4`]: { name: 'useRunsOnThisComputer', from: CTX, old: 'c227f4d5e-B-FYKrwT.js#A4',
    features: ['t = e?.type === "local" ? e : null,', 'return r != null && r.remote === void 0;'] },
  // C4: the auto-compact window row (rendered only with h4 enabled: none).
  [`${COMPACT}#C4`]: { name: 'AutoCompactWindowRow', from: CTX, old: 'c227f4d5e-B-FYKrwT.js#P4',
    features: ['pS("steady_goblet_row")', 'surface: "context_card",'] },
  // shared-5 Y_ (export wp): an account / device scoped preference `[value, set]` (Rk's stale compact opt-out; band off).
  'shared-5-u8kha2eH.js#Y_': { name: 'useScopedPreference', from: CTX, old: 'shared-28-DNYlf4wu.js#Kp', features: ['a = n?.scope === "account",'] },
  // shared-5 P_ (export Cp): the account preferences have loaded. Local preferences: settled.
  'shared-5-u8kha2eH.js#P_': { name: 'usePreferencesSettled', from: CTX, old: 'shared-28-DNYlf4wu.js#Mp', features: ['return e && t?.uuid !== void 0;'] },
  // shared-25 ko (export Fg): a GrowthBook feature's `.on` (Rk's Fk band, tA's Vk compact-hidden flag). No GrowthBook: off.
  'shared-25-D-aF0gt9.js#ko': { name: 'useFeatureIsOn', from: RS, old: 'shared-25-DOWZRSlq.js#fs', features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  // c06cf64bb zk (export dt): the session has a pending turn or held input. Host: never.
  'c06cf64bb-CoZso5N4.js#zk': { name: 'useSessionTurnPending', from: CTX, old: 'c06cf64bb-CdJdJuVd.js#CO',
    features: ['return t !== void 0 && (t.pendingTurn !== null || t.heldInput.length > 0);'] },
  // c68c4283d kn (export Lt): the context ring's compact_clicked event. Nothing is sent (D17).
  'c68c4283d-FxwfdZSA.js#kn': { name: 'logCompactClicked', from: CTX, old: 'c68c4283d-CWbOoVxS.js#Sn', features: ['"claudeai.code.context_ring.compact_clicked"'] },
  // shared-12 Wt (export i): the Customize nouns (tC reads `.manage`). No GrowthBook: the skills nouns.
  'shared-12-DVKzjo12.js#Wt': { name: 'useCustomizeNouns', from: CTX, old: 'shared-12-Dro5Rhl0.js#Te', features: ['e = ie(),', 't = H();', 'Ut(e, t)'],
    closureFeatures: ['manage:{defaultMessage:"Manage skills",id:"OodrbpaVPv"}', 'manage:{defaultMessage:"Manage plugins",id:"EXoZxGhXPy"}'] },
  // shared-183 GT (export Xp): the connected claude.ai MCP servers the breakdown's MCP tool rows label from. None here.
  'shared-183-B2N6Zy4J.js#GT': { name: 'useMcpServerRegistry', from: CTX, old: 'shared-156-BLTosN8U.js#iw', features: ['return X(WT);'] },
  // shared-26 Uk (export Du): an MCP tool's registry entry for its label. No registry: none.
  'shared-26-B-POtn5S.js#Uk': { name: 'findMcpToolForLabel', from: CTX, old: 'shared-26-CGuBxVt9.js#Ux', features: ['return mn(e, Ki(e, t, "forLabel"), t);'] },
  // shared-8 BO (export ls): a remote MCP server's display words for a tool row (read only with a registry entry).
  'shared-8-BqfCbkJd.js#BO': { name: 'remoteMcpServerLabel', from: CTX, old: 'shared-8-Db1QN4mf.js#mT',
    features: ['if (n?.server.type !== "remote") return;', 't.startsWith("mcp__")'] },
  // react-intl over the local catalog (the kit's adapters, as the 3.6556.2 graph).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: KIT, old: 'vendor-intl-DYfox5Co.js#q', features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: KIT, old: 'vendor-intl-DYfox5Co.js#Gt', features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'c227f4d5e-DGDdGBTz.js#w3': '5c6bd88a7f150d06802a37d93609ddf7ff5e11db47e9085d0e2e7a9a3af60d6c',
  'c91b6e9db-BexYIwN2.js#N': 'ab01e657d2ab48217764930be30f8f0879bfc0b61f4e79ded538cc61a67017c5',
  'c73f45bc3-C7dtUSq8.js#dS': 'b5fc316385744fd6da2c8e56354df7219d150b4af61ade6f728af209b82e8a63',
  'c227f4d5e-DGDdGBTz.js#rA': '4316f2f87e085d05e5efb4dd0a4c32df97220e43e2486dd8d367b43b2b700861',
  'c227f4d5e-DGDdGBTz.js#h4': 'c9020bb71272b6641d2141bb1e236faa35215ac45d8d6472f6a8428d551c29e3',
  'c227f4d5e-DGDdGBTz.js#y4': '424a0af7ddcd5e21d13100d464916bb77ed514b10fd1b613114f9bb65f60b384',
  'c227f4d5e-DGDdGBTz.js#C4': '250df7d1fcc7ea3e96f8ec423299cbb7b8eb17ac423049dba62adf9653150b55',
  'shared-5-u8kha2eH.js#Y_': '27a264f6a7ab041dbf339a1d6133a8a085e8f5924f863db30b2eddf246ab2faf',
  'shared-5-u8kha2eH.js#P_': 'ff89bb87cf3bddfeb1f70b0fe6dbe7f9c5b59c88bec6bf3b8b30e26838caf72c',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'c06cf64bb-CoZso5N4.js#zk': '6925bb21f8f7748d1af86882b8449ade5047947ba68b6e71ef780a6e75a397ac',
  'c68c4283d-FxwfdZSA.js#kn': '0f9601392250e028a92860e9d551b591c6cd5837527bc3cf764a8554ec854e0a',
  'shared-12-DVKzjo12.js#Wt': '04a650558dabb98849b20a6e1c0b62758dbd951a3191693d02c3902ebb52dac5',
  'shared-183-B2N6Zy4J.js#GT': '60aac22a6b69a7f2ba3f06ce5889debcdd70f931cb83eb4fd43b39b6ba952e4e',
  'shared-26-B-POtn5S.js#Uk': 'c3c2ba45058dd651b9f2e6c36898d911da201e80370e852a62b0a9b44c2fe078',
  'shared-8-BqfCbkJd.js#BO': '451a577e52576bbf28bb6b0b2afa15347b53a797a8a9c24414f0824e216030b9',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings a linked area cuts without exporting, cut again here (each hashing as the official declaration).
const linkedCopies = {
  'shared-8-BqfCbkJd.js#SZ': 'the token-count scaler zZ\'s formatter bZ calls (working-line-v4 token-format.mjs cuts it unexported); a pure function of its arguments',
};

// w3, re-measured on every run: the stand-in is kept only while its same-chunk closure stays this large.
export const MEASURED = { source: COMPACT, local: 'w3', export: 'L', minLocals: 100, minImports: 100 };

const LINKED_AREAS = ['code-composer-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'working-line-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...[
    'c0ce8f953-DxfYOwRU.js', 'c15932ccf-Cs_Wa7vz.js', 'c1564829c-D8VR4ida.js', 'c25d7186f-CHE_J2eY.js', 'c389a02dd-DLnk9_rh.js', 'c5da7eb42-aEqbSKbC.js',
    'c68c4283d-FxwfdZSA.js', METER, 'ca74e9c4f-514Kc19x.js', 'cddbfc1b6-CEwB583v.js', 'ce660512f-CCUjZ4NC.js', 'cf97b43fb-BFDqi072.js',
    'shared-153-DMw2VzSq.js', 'shared-92-BOgyxePb.js', official.sharedFrame,
  ].map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): the mount the card follows, the readout loader, and the w3 inline
// branch RailContextUsage follows.
export const rawCallSites = [
  { source: CARD, role: 'rC is the chunk\'s export u (cf74bc599\'s rail Context section); iC renders w3 (c227f4d5e export L, here Es) inline, contextOnly',
    features: ['rC as u', 'L as Es', 'r(Es,{presentation:"inline",contextOnly:!0,inlineOpen:d,inlineIntentRef:g,sessionRef:i,modelId:o,onCompact:s,openRequest:c})'] },
  { source: METER, role: 'N loads the readout chunk lazily (host: loadStackedMeterReadout), j the failure branch',
    features: ['var j=()=>null,M,N=()=>M??=m("cds_stacked_meter_readout",()=>t(()=>import("./c6b47b88e-lSBDS3wY.js"),__vite__mapDeps([0]))).then(e=>({default:e?.ReadoutCard??j}),()=>({default:j}))'] },
  { source: READOUT, role: 'the readout chunk exports o as ReadoutCard (c91b6e9db N)', features: ['export{o as ReadoutCard}'] },
  { source: COMPACT, role: 'w3 (export L): the inline branch the rail card renders (host: RailContextUsage)',
    features: ['w3 as L', 'P=b==="inline"', 'le=q===null&&z!==null&&!ie?ce??null:null',
      'X4({usage:q,windowFacts:le,liveModel:ze,pickedModel:He,servedWindows:Re,engineVersion:Pe,catalogSupports1m:Ue,surfaceAutoCompactWindow:Le})',
      'Ke=We.kind==="staleEngine"?We:null', 'av(qe)', 'Ke?{remedy:t?.type==="local"?"local":"remote",enforced:Ke.enforced}:null',
      '$e=!L&&!xe&&(t===null||Qe)', 'rt=xe||$e||le!==null', 'be=J0($,25)?K0($,25,()=>te(A3)):$[25]',
      'pt=i!==void 0&&!L&&(q!==null||le!==null)&&!ft', 'mt=z===null&&(se?.stale===!0||se?.resets!==void 0&&se.resets<dt)',
      'lc(Xe,Ge,z===null&&se?.stale===!1,!P)', 'Ut=P?nt||!rt:nt||y&&!rt', '_4(q,{onThisComputer:!0})!==null', 'r=ht??($e&&Ye===null?0:null),a=le!==null',
      'p(T3,{sessionRef:t,onCompact:e,autoCompactSettable:n,contextTokens:Ye,contextTokensOutdated:mt,cold:Ot,summary:gt,contextPct:r,contextUsage:qe,windowFacts:Je,isFetching:Wt,staleSince:ge,turnRunning:J,noData:Ut,reportDue:Kt,windowOnly:a,staleEngineNotice:Ze,expanded:x,onToggle:be,memoryFileLink:ye})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
// Same-chunk closure of a declaration (imports excluded): raw text and size.
function sameChunkClosure(src, local) {
  const seen = new Set(), parts = [], imports = new Set();
  const ids = text => new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const visit = name => {
    if (seen.has(name)) return;
    seen.add(name);
    const entry = src.top.get(name);
    if (!entry) return;
    if (entry.kind === 'import') { imports.add(`${entry.file}:${entry.alias}`); return; }
    const text = rawText(src, entry);
    parts.push(text);
    for (const id of ids(text)) if (id !== name && src.top.has(id)) visit(id);
  };
  visit(local);
  return { text: parts.join('\n'), locals: parts.length, imports };
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
      found.push({ file, local, name: spec.name, previous: spec.old, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features (and closure features), raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    if (spec.closureFeatures) assertFeatures(`adapter ${key} (closure)`, sameChunkClosure(src, local).text, spec.closureFeatures);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// w3 stays a host stand-in only while it stays this large.
async function measure(cache) {
  const src = await readSource(MEASURED.source, cache, official.ionSource);
  if (src.exported.get(MEASURED.export) !== MEASURED.local) throw Error(`${MEASURED.source}: export ${MEASURED.export} is not ${MEASURED.local}`);
  const size = sameChunkClosure(src, MEASURED.local);
  if (size.locals < MEASURED.minLocals || size.imports.size < MEASURED.minImports)
    throw Error(`${MEASURED.source}#${MEASURED.local} is down to ${size.locals} declarations / ${size.imports.size} imports; slice it instead of RailContextUsage`);
  return { ...MEASURED, adapter: 'RailContextUsage', declarations: size.locals, imports: size.imports.size, bytes: size.text.length,
    chunks: new Set([...size.imports].map(i => i.split(':')[0])).size };
}

// The host adapter module re-exports exactly the adapted names, each from the host module that documents it.
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
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the session-rail-context-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function sessionRailContextV4Config() {
  return {
    name: 'session rail context (4.16336.0)', generator: 'extract-session-rail-context-v4.mjs', output: path.join(root, SESSION_RAIL_CONTEXT_V4_OUTPUT),
    adapterModule: '../../source-session-rail-context-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2 session-rail-context prestage tools/probe.mjs) explores the same configuration.
export const probeConfig = sessionRailContextV4Config;

export async function extractSessionRailContextV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  const measured = await measure(cache);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...sessionRailContextV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the session-rail-context roots (${official.referenceVersion}); generated by extract-session-rail-context-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-session-rail-context-v4.mjs',
          previous: { generator: 'scripts/extract-session-rail-context.mjs', output: 'src/generated/session-rail-context', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, adapters, measured, linkedCopies,
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
    console.log('measured', JSON.stringify(await measure(new Map())));
  } else await extractSessionRailContextV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
