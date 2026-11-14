// Transcript rows, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region
// transcript-rows, staged in steps tr-0 .. tr-5 of region-plan/plan.json largeRegionSplits['transcript-rows']).
// The 3.6556.2 graph (scripts/extract-transcript-rows.mjs -> src/generated/transcript-rows) is untouched (staged double
// output; no production switch: the host keeps importing src/generated/transcript-rows). This generator cuts the
// 4.16336.0 graph into the isolated folder src/generated/transcript-rows-v4, one step at a time; every step it holds
// runs on its own (`--check` passes with only the completed steps). Steps present: tr-0 … tr-5.
//
// tr-0 (owners): the module state the transcript rows provide or read, each with its one owner (D1 / D46):
//   cea7057eb-BrXukOIp  L   BackgroundTaskStatusContext  (3.6556.2 cea7057eb-De2BQu3K L) — sliced here. cea7057eb holds
//                           two shape-identical `t(new Map)` contexts (L, z); L is the one the chunk's provider ve
//                           fills with the tool-id -> status map (fe: `n.toolUseId&&t.set(n.toolUseId,n.status)`), z
//                           the tool-id -> task-id map (H). Disambiguated by that provider constraint (ROOT_CONSTRAINTS).
//   cd96b5fdc-HvwFILuF  g   SessionScopeContext          (3.6556.2 cd96b5fdc-B3bjGiE4 c) — sliced here; the chunk's
//                           only `e(null)` context (cds-core holds its W, code-current-v4 its A / j: other bindings).
//   c856385e2-Cqx37C-b  Nt  PathResolverProvider          (3.6556.2 c856385e2-aEyDzrcK ot = at.Provider) — sliced here.
//                       It  usePathResolver               (3.6556.2 lt) — sliced here (pure).
//                       Mt  the path resolver context     (3.6556.2 at) — cds-core's (publicName ctx_c856385e2_Mt),
//                           imported through the shared graph, never sliced here. Nt is the `X.Provider` whose
//                           context's reader (Q: `return s(Mt)`) is read for `?.windowsRoot` (Pt), the object It builds.
//                           Correction to account2/plan.json tr-0: c856385e2#Ot is `Dt.Provider`, the session file
//                           opener provider r3b-transcript-v4 slices (SessionFileOpenerProvider), not the path resolver.
//   c96d752d0-D9VB6ArX  aV  ProposalPaneContext           (3.6556.2 c96d752d0-CWv_7-n9 PZ, exported Ai) — sliced here
//                           (group-status.mjs, which tr-4 extends with the tool rows).
//   CdsModeStoreContext / CdsSkeletonGroupContext (D46): cds-core publicNames (shared-frame ka / rf), imported by the
//   steps that read them; recorded and checked in owners.json.
// tr-1 (verbatim): the 249 data chunks the 3.6556.2 graph copies byte for byte (Shiki's grammars, themes and its inlined
//   oniguruma wasm, plus the rolldown runtime they import) are matched by whole-file SHA-256 against 4.16336.0
//   (account2/transcript-rows/tr1-sha-map.json): 247 byte-identical under the same name, 2 Shiki theme packages
//   (cb3185f0d, cd14a9327) replaced by their only same-family 4.16336.0 file. The reviewed list is
//   scripts/transcript-rows-v4.verbatim-pins.json (4.16336.0 sha256 of every file, and for byte-identical ones the
//   3.6556.2 sha256 too, both re-hashed on every run). They enter the graph through the lazy-load tables that name them:
//   c5a058668 o (bundledLanguages: r / i / a, 235 grammar chunks), c68fd9df8 ee (bundledThemes: the Shiki theme
//   packages) and ge (the Pierre theme loaders, 10 chunks; Y, its colour merge). Those tables are pure (constants and
//   `() => import(...)` closures over cds-core's vitePreload). 248 of the 249 are reached; the 249th,
//   c7c157339-BCwwaLv8 (the oniguruma wasm, byte-identical), is named only by c68fd9df8 z (the bundled highlighter
//   factory over the Shiki core) and Q (the highlighter singleton), which the file-highlight step slices: it stays in
//   the pins as `deferred` until the file highlight step (tr-3) reaches z / Q through pierre's File: from tr-3 on, all 249
//   are emitted (lazyVerbatim count 249, no deferred pin left).
// tr-2 (link surface): every binding the host imports from the 3.6556.2 graph under a raw minified identity
//   (src/source-file-viewer.jsx `Uc as PierreFile`, `_n as PierreScroller`, … ; source-background-tasks.jsx `n as
//   TASK_LINK_CLASS`; source-code-transcript.jsx `og as desktopSessionsStore`; source-code-session-info.jsx `q` / `nT`)
//   has a semantic name here, the host's own alias (LINK_SURFACE). Each entry names its 3.6556.2 binding and its
//   4.16336.0 binding, both pinned by the same name-free features (checked on both snapshots every run), and its
//   4.16336.0 owner: a root of this graph exported under that name, or (D1) the graph that already holds it — cds-core
//   (publicName), code-editor-current-v4 or frame-sidebar-nav (their export) — never a second copy here. No module of
//   this graph uses raw `linkExports` (a run that lists one stops), so the consumers that migrate to this graph
//   (code-transcript, chat-renderer, artifact-library, code-editor-current) import semantic names only.
// tr-3 (file find / reveal, the turn mark outlet): the Files viewer helpers moved from cd2efac6e (3.6556.2 fc / _c / vc)
//   to c69eb6b8e-zIq9-pn- (Pt / Bt / Vt, a cross-family move); c82eca2bd l / m (codeSelectionCss, fileMetrics), cc3bc2027
//   n (fileGutterCss), c5fbdc8eb x (findLineOrdinal, 3.6556.2 cc3bc2027 S); cb6930dae Eu (TurnMarkOutlet, 3.6556.2 po),
//   which reads working-line-v4's mark broker context (du, TurnMarkBrokerContext), linked. UserBashRun (c19e90103 k_,
//   3.6556.2 Dg; wave 8b): its copy button telemetry (shared-123 W$ -> shared-92 -> shared-62 sp) reads cds-core's
//   state_shared62_Uf; the terminal inline-run store ca41b3815 X is the host adapter useTerminalInlineRunStore; the code
//   theme pair it reads is settings-pages-v4's code-theme-vars.mjs (linked); c3ffe0a17 (pierre's lazily loaded
//   PooledFile / StreamingCodeFile re-export) is a reexport module.
// tr-4 (the c96d752d0 tool rows): SH (ThoughtProcessStep, 3.6556.2 gX: "Thought process" over working-line-v4's TurnStatus
//   Step, open unless the expansion store says otherwise, always open in the verbose transcript) and Ize (RunningToolRow,
//   3.6556.2 HCe: a running tool's busy row while it holds the turn's mark). Ize is one of three shape-identical turn mark
//   rows (Fze: the tool group's status row, rendered by t1e with `failedLabel: ""`; Lze: the init checklist row of b$e);
//   the caller constraint picks the one the tool row's step (qKe, rendered by $Ke, the component ToolRow wz mounts) renders
//   with `step` / `busyTrailing`. Also cb6930dae Xu (TranscriptLiveScopeContext, 3.6556.2 Po), the live scope the rows read
//   (sd), which the desktop's id (3.6556.2 Ho) provides: owned here, exported for the host's provider. The host boundaries
//   these reach are existing host adapters re-exported by src/source-transcript-rows-v4-adapters.jsx (HOST_ADAPTERS, each
//   original pinned by features and raw sha256). ToolRow (wz) and ToolGroupRows (qW) are pending (PENDING_ROOTS): their
//   closure is the tool card registry. Computed dynamic imports: the generator walks the module graph of c96d752d0 (its
//   static and literal dynamic imports, transitively), lists every top-level declaration / statement that holds a computed
//   `import(<expr>)`, and stops if any of them is in this graph (provenance computedImports).
// tr-5 (gate, call sites): the turnStatusRows gate (__gb__2846116625) is read only through working-line-v4's one copy of
//   ca7b95e24 (TURN_STATUS_ROWS_FLAG l, TurnStatusRowsProvider d, TurnStatusRowsOverride f, useTurnStatusRows p), whose
//   flag read is the host's GrowthBook answer (src/source-working-line-adapters.jsx useGrowthBookFlag over
//   src/host-growthbook.mjs HOST_GROWTHBOOK); a run that slices any of them, or reads the gate any other way, stops. The
//   seven 3.6556.2 call sites (Z1e, ak, gX, _X, R7, Ho, Aat) are pinned again at their 4.16336.0 declarations (callSites;
//   the feed's forced-on provider is checked to be working-line-v4's TurnStatusRowsOverride, GATE_CALL_SITE).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here): sourceContract
// scripts/official-4.16336.0.mjs, sharedGraph 'cds-core' (pinned manifest sha256), lazyVerbatim. No host adapter is
// reached before tr-4; from tr-4 on, every host boundary is a pinned HOST_ADAPTERS entry (any other adapter import stops). Roots are located on the official AST: each is the only top-level declaration of its chunk whose raw
// text has the probe, whose prettier form carries every feature and that passes its constraint, under the reviewed
// local, with the reviewed export aliases and its raw declaration sha256 pinned (ROOT_PINS; never refreshed by a script).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const TRANSCRIPT_ROWS_V4_OUTPUT = 'src/generated/transcript-rows-v4';
export const STEPS = ['tr-0', 'tr-1', 'tr-2', 'tr-3', 'tr-4', 'tr-5'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const esc = s => s.replace(/[$]/g, '\\$');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const TASKS = 'cea7057eb-BrXukOIp.js', SCOPE = 'cd96b5fdc-HvwFILuF.js', PATHS = 'c856385e2-Cqx37C-b.js', C96 = 'c96d752d0-D9VB6ArX.js';
export const LANGS = 'c5a058668-CqAY_lyZ.js', THEMES = 'c68fd9df8-DaT0MWbj.js';
export const FIND = 'c69eb6b8e-zIq9-pn-.js', METRICS = 'c82eca2bd-B-5ZNoqx.js', GUTTER = 'cc3bc2027-C1f7RNlI.js', ORDINAL = 'c5fbdc8eb-D_9kA6bR.js',
  MARK = 'cb6930dae-DPu57U90.js', PIERRE = 'c19e90103-BKPMSRL2.js', SCROLLER = 'c64baa838-C55z5EpT.js', LANGUAGE = 'c476e9be4-C5Gc087T.js',
  MODE = 'c5668a722-BOceV_tq.js', LINES = 'shared-2-CsjIBQD8.js', CODE_THEME = 'c5d464fa3-D1V4bYI5.js', TASK_LINK = 'c86240138-DxzS7b0F.js';

// ── Roots: file -> local -> { name, step, exports (the chunk's own aliases; [] chunk-internal), probe (raw), features,
//    constraint (ROOT_CONSTRAINTS key, when the probe and features leave shape-identical declarations) } ─────────────
export const ROOTS = {
  [TASKS]: {
    L: { name: 'BackgroundTaskStatusContext', step: 'tr-0', exports: [], probe: 't(new Map)', features: ['= t(new Map());'], constraint: 'toolStatusProvider' },
  },
  [SCOPE]: {
    g: { name: 'SessionScopeContext', step: 'tr-0', exports: [], probe: 'e(null)', features: ['var g = e(null);'] },
  },
  [PATHS]: {
    Nt: { name: 'PathResolverProvider', step: 'tr-0', exports: ['d'], probe: '.Provider', features: ['.Provider;'], constraint: 'pathResolverContext' },
    It: { name: 'usePathResolver', step: 'tr-0', exports: ['lt'], probe: 'windowsRoot:a,toAbs',
      features: ['windowsRoot: a,', 'toAbs(e) {', 'toRel(e) {', '/^~[\\\\/]/.test(n)'] },
  },
  [C96]: {
    aV: { name: 'ProposalPaneContext', step: 'tr-0', exports: ['Ai'], probe: 'captureGuardedSnapToBottom', features: ['inline: !1,', 'captureGuardedSnapToBottom: TYe'] },
    // tr-4: the thinking step (3.6556.2 gX) and a running tool's busy row (3.6556.2 HCe).
    SH: { name: 'ThoughtProcessStep', step: 'tr-4', exports: [], probe: 'defaultMessage:"Thought process"',
      features: ['defaultMessage: "Thought process",', 'defaultMessage: "Thinking actions",', 'f(op.Step, {', 'actionsLabel: d,'] },
    // The probe is the shape the three turn mark rows share (Fze / Ize / Lze); the caller constraint leaves Ize.
    Ize: { name: 'RunningToolRow', step: 'tr-4', exports: [], probe: 'rE(', features: ['IM(', 'PM(', 'rE(', 'f(op, {'], constraint: 'runningToolRowCaller' },
  },
  [LANGS]: {
    o: { name: 'bundledLanguages', step: 'tr-1', exports: ['t'], probe: '{...i,...a}', features: ['var o = { ...i, ...a };'] },
  },
  [THEMES]: {
    ee: { name: 'bundledThemes', step: 'tr-1', exports: [], probe: 'id:"andromeeda",displayName:"Andromeeda"',
      features: ['id: "andromeeda",', 'displayName: "Andromeeda",', 'id: "vitesse-light",', '].map((e) => [e.id, e.import]),'] },
    ge: { name: 'pierreThemeLoaders', step: 'tr-1', exports: [], probe: '"pierre-dark":()=>',
      features: ['"pierre-dark": () =>', '"pierre-light": () =>', '.then(', 'Y({'] },
    // tr-2: the theme a name resolves to (3.6556.2 c68fd9df8-CJ4k-Myz X, the host's resolveCodeTheme).
    X: { name: 'resolveCodeTheme', step: 'tr-2', exports: ['a'], probe: 'getResolvedTheme(e)??', features: ['return h.getResolvedTheme(e) ?? f(e);'] },
  },
  // tr-2: pierre's File and what the Files viewer builds around it (3.6556.2 c19e90103-BQFzF8EA Uc / fl / Rc / zc).
  [PIERRE]: {
    Xl: { name: 'PierreFile', step: 'tr-2', exports: ['or'], probe: 'i==="plain"&&',
      features: ['({ file: t, options: n, ...r } = e)', 'i === "plain" &&', 'i === "direct" ? n :', '{ file: t, options: s, ...r }'] },
    gu: { name: 'pierreContents', step: 'tr-2', exports: ['ir'], probe: '.includes("\\r")?t.replace(', features: ['t.includes("\\r") ? t.replace(', '"\\u240D"'] },
    Gl: { name: 'pierreLetterSpacing', step: 'tr-2', exports: ['cr'], probe: '`letter-spacing: ${', features: ['letter-spacing: ${', 'font-feature-settings: ${'] },
    Kl: { name: 'pierreWrapStyle', step: 'tr-2', exports: ['lr'], probe: '"--diffs-overflow-override":"clip"',
      features: ['"--diffs-overflow-override": "clip",', '"--diffs-scrollbar-gutter-override": "0px",'] },
    // Wave 8b (round4/wave8b/transcript): the user's own '!' command (3.6556.2 c19e90103-BQFzF8EA Dg, exported et), now
    // k_ (exported ft): the command in a bash-highlighted epitaxy fence (pierre's pooled File) and its output box. Its
    // closure is clean since cds-core stage 11 (state_shared62_Uf / writer_shared62_Xf, read through shared-123 W$ ->
    // shared-92 -> shared-62 sp); the terminal's inline-run store (ca41b3815 X) is the host adapter below.
    k_: { name: 'UserBashRun', step: 'tr-3', exports: ['ft'], probe: '`bashrun:${',
      features: ['{ command: t, output: n, error: r, runId: i, kept: s, commandOnly: l } = e,', 'defaultMessage: "No output",',
        'defaultMessage: "Open in terminal",', 'defaultMessage: "Earlier output cut. Showing the end.",', 'name: "cmd",'] },
  },
  [SCROLLER]: {
    xn: { name: 'PierreScroller', step: 'tr-2', exports: ['t'], probe: 'l?.cleanUp():l?.setup(e)',
      features: ['contentClassName: s,', 'e == null ? l?.cleanUp() : l?.setup(e);', '.Provider, {'] },
  },
  [LANGUAGE]: {
    O: { name: 'fileLanguage', step: 'tr-2', exports: ['i'], probe: 'lastIndexOf(".")',
      features: ['r = t.toLowerCase(),', 'if (o === "" && !v.has(r)) return "text";', 'return c === "text" ? (r === t ? c : D(i(r))) : c;'] },
  },
  [MODE]: {
    t: { name: 'useCodeThemeMode', step: 'tr-2', exports: ['n'], probe: 'resolvedMode', features: ['let { resolvedMode: t } = e();', 'return t === "dark" ? "dark" : "light";'] },
  },
  [LINES]: {
    sZ: { name: 'lineCount', step: 'tr-2', exports: ['Ci'], probe: 'let t=1;for(let n=e.indexOf(`', features: ['let t = 1;', 'n !== -1;', 't++;', 'return t;'] },
  },
  [CODE_THEME]: {
    K: { name: 'useCodeTheme', step: 'tr-2', exports: ['t'], probe: '{theme:{light:e,dark:t}}', features: ['{ light: e, dark: t } = V();', '{ theme: { light: e, dark: t } }'] },
  },
  [TASK_LINK]: {
    n: { name: 'TASK_LINK_CLASS', step: 'tr-2', exports: ['n'], probe: '"text-accent hover:underline underline-offset-[1px]',
      features: ['"text-accent hover:underline underline-offset-[1px] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-[3px]"'] },
  },
  // tr-3: the Files viewer's find / jump-range / reveal helpers (3.6556.2 cd2efac6e-Be7wcc4w fc / _c / vc).
  [FIND]: {
    Pt: { name: 'highlightFileFind', step: 'tr-3', exports: [], probe: '"--code-theme-find-match-highlight-bg"',
      features: ['e.ownerDocument.createElement("style")', '`[data-line="${t}"]`', 'wt["--code-theme-find-match-highlight-bg"]'] },
    Bt: { name: 'highlightFileLines', step: 'tr-3', exports: ['c'], probe: 'cancelAnimationFrame(i)',
      features: ['i = requestAnimationFrame(a);', 'c = s ?? document.createElement("style");', 'cancelAnimationFrame(i)'] },
    Vt: { name: 'revealFileLine', step: 'tr-3', exports: ['s'], probe: 'block:"center"',
      features: ['i.scrollIntoView({ behavior: "instant", block: "center" })', 'Number.parseInt(a.getAttribute("data-line") ?? "", 10)', '.getState().codeFontSize'] },
  },
  [METRICS]: {
    l: { name: 'codeSelectionCss', step: 'tr-3', exports: ['i'], probe: '::selection',
      features: ['::selection { background-color: light-dark(var(--code-theme-light-selection-bg,', '"editor.selectionBackground"'] },
    m: { name: 'fileMetrics', step: 'tr-3', exports: ['n'], probe: 'r="compact",i=null',
      features: ['r = "compact", i = null', 'e["font-size-code"][r]', 'lineHeight: Math.round('] },
  },
  [GUTTER]: {
    n: { name: 'fileGutterCss', step: 'tr-3', exports: ['s'], probe: '[data-line-number-content]{min-width:max(calc(',
      features: ['[data-line-number-content]{min-width:max(calc(', '[data-overflow="wrap"] [data-line]{white-space:break-spaces;overflow-wrap:anywhere}'] },
  },
  [ORDINAL]: {
    x: { name: 'findLineOrdinal', step: 'tr-3', exports: ['l'], probe: 'e[n-1]===e[t]', features: ['for (; n > 0 && e[n - 1] === e[t]; ) n--;', 'return t - n;'] },
  },
  [MARK]: {
    // tr-4: the transcript live scope (3.6556.2 cb6930dae Po), provided by id (3.6556.2 Ho) through Zu = Xu.Provider.
    Xu: { name: 'TranscriptLiveScopeContext', step: 'tr-4', exports: [], probe: '=m(Ku)', features: ['var Xu = m(Ku);'], constraint: 'liveScopeContext' },
    Eu: { name: 'TurnMarkOutlet', step: 'tr-3', exports: ['ot'], probe: '"data-turn-mark-outlet":""',
      features: ['c?.setOutletUnderPlan(s);', 'return (c.openOutlet(e), () => c.closeOutlet(e));', '"data-turn-mark-outlet": ""', 'r("[&>[data-turn-mark-box]>*]:!my-0", t)'] },
  },
};
// Roots a step names that are not generated yet, each with what blocks it (a run that reaches one stops).
export const PENDING_ROOTS = {
  // tr-4: the tool row and the tool group (3.6556.2 iL / i1, both behind the engine surface mount hP; 3.6556.2 AE). Their
  // closure is the whole tool card registry of c96d752d0 (an unbounded exploration: 353 further chunks, ~22.7k bindings,
  // vendor-datadog / vendor-zod / shared-183 / shared-212 among them). The 3.6556.2 boundary (about 60 host adapters: the
  // engine surface OE, the tool cards the host draws itself, telemetry, the request store, the transcript markdown) has
  // to be re-pinned at 4.16336.0 first, and several of its originals moved or changed shape (prestage-tr-c map-2.json).
  [`${C96}#wz`]: { name: 'ToolRow', step: 'tr-4', previous: 'c96d752d0-CWv_7-n9.js#iL',
    why: 'wz = hP($Ke, e => e.epitaxyEngineToolRow, …): its closure reaches the tool card registry; the 4.16336.0 host adapter boundary of the 3.6556.2 tool rows (iL / Uz) is not pinned yet' },
  [`${C96}#qW`]: { name: 'ToolGroupRows', step: 'tr-4', previous: 'c96d752d0-CWv_7-n9.js#i1',
    why: 'qW = hP(F1e, e => e.withEngineSurfaceScope, …) renders t1e (the tool group: coalesced runs, Fze, the members through ToolRow); pending with ToolRow' },
};
// Caller / provider constraints that tell shape-identical declarations apart (each must leave exactly one).
const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
export const ROOT_CONSTRAINTS = {
  // The context the chunk's provider component fills with fe(tasks): the tool-id -> background task status map.
  toolStatusProvider: (src, local) => {
    const holders = declarations(src).filter(e => rawText(src, e).includes(`${local}.Provider,{value:`));
    if (holders.length !== 1) return false;
    const raw = rawText(src, holders[0]);
    const value = new RegExp(`${esc(local)}\\.Provider,\\{value:([\\w$]+)\\}`).exec(raw)?.[1];
    const producer = value && new RegExp(`[,{;\\s]${esc(value)}=([\\w$]+)\\(`).exec(raw)?.[1];
    const fn = producer && src.top.get(producer);
    return !!fn && fn.kind !== 'import' && rawText(src, fn).includes('n.toolUseId&&t.set(n.toolUseId,n.status)');
  },
  // tr-4: the turn mark row that the tool row's step renders with `step` / `busyTrailing` (3.6556.2 HCe under iL): its one
  // caller is rendered by the component the ToolRow root mounts (`X=hP(Y,e=>e.epitaxyEngineToolRow,…)`, Y renders it).
  runningToolRowCaller: (src, local) => {
    const call = new RegExp(`[\\w$]\\(${esc(local)},\\{[^}]*\\bstep:[^}]*\\bbusyTrailing:`);
    const callers = declarations(src).filter(e => call.test(rawText(src, e)));
    if (callers.length !== 1) return false;
    const caller = [...src.top].find(([, e]) => e === callers[0])?.[0];
    const mounts = declarations(src).map(e => /^[\w$]+=[\w$]+\(([\w$]+),e=>e\.epitaxyEngineToolRow,/.exec(rawText(src, e))?.[1]).filter(Boolean);
    if (mounts.length !== 1) return false;
    const row = src.top.get(mounts[0]);
    return !!row && row.kind !== 'import' && new RegExp(`[\\w$]\\(${esc(caller)},\\{`).test(rawText(src, row));
  },
  // tr-4: the context whose Provider (`P=ctx.Provider`) the live scope provider renders over {sessionId, turnLive,
  // liveRunningToolIds, liveRunningShellCalls}.
  liveScopeContext: (src, local) => {
    const providers = declarations(src).map(e => new RegExp(`^([\\w$]+)=${esc(local)}\\.Provider$`).exec(rawText(src, e))?.[1]).filter(Boolean);
    if (providers.length !== 1) return false;
    return declarations(src).filter(e => { const raw = rawText(src, e); return raw.includes(`(${providers[0]},{value:`) && raw.includes('turnLive:') && raw.includes('liveRunningShellCalls:'); }).length === 1;
  },
  // The provider of the context whose reader (`function X(){return s(ctx)}`) is read for `?.windowsRoot`.
  pathResolverContext: (src, local) => {
    const ctx = /^[\w$]+=([\w$]+)\.Provider$/.exec(rawText(src, src.top.get(local)))?.[1];
    if (!ctx) return false;
    const readers = declarations(src).map(e => new RegExp(`^function ([\\w$]+)\\(\\)\\{return [\\w$]+\\(${esc(ctx)}\\)\\}$`).exec(rawText(src, e))?.[1]).filter(Boolean);
    return readers.some(reader => declarations(src).some(e => rawText(src, e).includes(`${reader}()?.windowsRoot`)));
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them).
export const ROOT_PINS = {
  'cea7057eb-BrXukOIp.js#L': '223d9075919c145c90d2eec650bf3dd19df181571aa4ff1eda5be8b2bb2a8d62',
  'cd96b5fdc-HvwFILuF.js#g': '607ac89ce8df675a627ed2ad96b6e5c1864a81f8546330f0a234b059a43d527d',
  'c856385e2-Cqx37C-b.js#Nt': '0a1975b81fb96358c5e8ab6ac26b0c5b01ed974e6abcf58a6eed73960728660d',
  'c856385e2-Cqx37C-b.js#It': '961588544ea4786720ae48b523e35d4a2c2d0472570d947cc307c2699c13a20d',
  'c96d752d0-D9VB6ArX.js#aV': 'e4bb0bf460ae56e42ed905c43531a302503cef84e9a3ac8243f97ed844642767',
  'c5a058668-CqAY_lyZ.js#o': '0d451a0620ffb267efd319a35beb5a6078bb10cd3ec1b965a68773c67355b5f3',
  'c68fd9df8-DaT0MWbj.js#ee': '011b7059cb1ee24691cb11c817cc2379577839921e9c9ee7c056a04c176ae40d',
  'c68fd9df8-DaT0MWbj.js#ge': '119abeadbbd89a8c460611ca1ea1b885a94bef79d6155177c14ee72050c18728',
  'c68fd9df8-DaT0MWbj.js#X': '9478d00da54a61f6d1f5a64a8a076753bb9c0e186936a4976fe29f7679a286e4',
  'c19e90103-BKPMSRL2.js#Xl': '674fd0536492d9016eb25702e7e94f679b23e7aa6cd86ab87de6b3ddad75373f',
  'c19e90103-BKPMSRL2.js#gu': 'd6f79ee5706f836624d7310ab92823ba49034022a14c7aeb25e2ada4c99741bc',
  'c19e90103-BKPMSRL2.js#Gl': '646ffed9068ffd550cdb860e41b731494a13edf63d14b3e17faa7a8f08703c9c',
  'c19e90103-BKPMSRL2.js#Kl': '69f88f32276a9cd0a465b6ea8dc4864640fef492da797f1ed4ec45c0c4fb4755',
  'c19e90103-BKPMSRL2.js#k_': 'deab66c1bfa73662d981b1a8952412d54ecd58a35551e0698b6b5a38be542599',
  'c64baa838-C55z5EpT.js#xn': '409a76d1688b8fcb49dfb197f90fe7fe5eec74df6b9a3cb4a143e2b12acfdc09',
  'c476e9be4-C5Gc087T.js#O': '1bd619acb86f44adf2ab69139df1d89ef073c7f49838759ad2105aac2f9f9b80',
  'c5668a722-BOceV_tq.js#t': 'b1a5f94af640074216c2bc1e521b0837d4244681fe3f950fecfac8b03fc7406c',
  'shared-2-CsjIBQD8.js#sZ': '485ef578ecbe8fedf5b2fb607976beceb0e6b1246b9838eb5c7d247fc57ff9ed',
  'c5d464fa3-D1V4bYI5.js#K': '49910359e1b8a436baffbf1bbcda5e5142eb47cc3e3e75d8dbd0eb333d62cce0',
  'c86240138-DxzS7b0F.js#n': '818bb7cb795a1c7a2e609afd57dcf384fac96fec1ac1f1379d8c9e52d416f886',
  'c69eb6b8e-zIq9-pn-.js#Pt': '5f927397623456f995fb5dbdf188f153fd3fdfb1589050a9b6792c427d4cfe15',
  'c69eb6b8e-zIq9-pn-.js#Bt': 'd89ea75854d6ae3849394f86c469f2d08c8eaf56e8ecd94bc5527b8f9bd543c2',
  'c69eb6b8e-zIq9-pn-.js#Vt': 'dcb5037fd785cfda918db60bd5576c0be27dcf6c0c70681338d74254a42258f6',
  'c82eca2bd-B-5ZNoqx.js#l': '34b19175532cfd8c09628758c69c8b664c9d7d8b9f08ce74ed0ac6af0239a14e',
  'c82eca2bd-B-5ZNoqx.js#m': '3d249e7ea9cbc9c4fc9202896c9b388c75671b4d5c0b8e9142677460cbbe5e08',
  'cc3bc2027-C1f7RNlI.js#n': 'b3e1d74e2b7d61de30deadaa13acd78777f7f9a64955da62c171dda060d02b07',
  'c5fbdc8eb-D_9kA6bR.js#x': 'ba192084d9a44248d10f1ec6209109b65d494c7a7ca95b13ea918653d737c367',
  'cb6930dae-DPu57U90.js#Eu': '21bc93899745c84cfc7f069656e5014e1fd4b97e38e2b2f21c570a759cb67372',
  'c96d752d0-D9VB6ArX.js#SH': 'd105498b3f6ba582b1adff5ea60d3c6d4d83c411b37fb5496604270624f4d9d4',
  'c96d752d0-D9VB6ArX.js#Ize': 'f60f8ee18ada62cb50e592b8a9bd35ab576a77d69573207a4caed32de98c220b',
  'cb6930dae-DPu57U90.js#Xu': 'df7b1d518879157573b18ae4334f5caa7246ea60378cc94d7a52cd51e86f2a21',
};

// ── tr-4 host boundaries: file#local -> { name (export of src/source-transcript-rows-v4-adapters.jsx), from (the host
//    module it re-exports), previous (the 3.6556.2 original that host adapter answers), features } ─────────────────────
// Re-exports only: each is the existing host adapter of the 3.6556.2 graph (src/source-transcript-rows-adapters.jsx) for
// the same official binding, now at its 4.16336.0 chunk / local (same shape, checked by features and raw sha256).
const TR = 'src/source-transcript-rows-adapters.jsx';
export const ADAPTER_FILE = 'src/source-transcript-rows-v4-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl useIntl over the local catalog (SH's labels, the copy action).
  [`${official.vendorIntl}#q`]: { name: 'useIntl', from: TR, previous: 'vendor-intl-DYfox5Co.js#q', features: ['return (Mt(e), e);'] },
  // The transcript view store's verbose read (SH is always open in the verbose transcript): the host's transcript view.
  'cd4f82e77-Cuw99s6A.js#_r': { name: 'useVerboseTranscript', from: TR, previous: 'cd4f82e77-CAMIsQ30.js#Nn', features: ['return Q(vr);'],
    also: { vr: ['return e === "verbose";'] } },
  // The session activity events / store the turn mark rows (VM / zM) read: the working line's host adapters.
  'c06cf64bb-CoZso5N4.js#Zc': { name: 'sessionActivityEvents', from: TR, previous: 'c06cf64bb-CdJdJuVd.js#a_', features: ['subscribe(e) {', 'notify(e) {'] },
  'c06cf64bb-CoZso5N4.js#K': { name: 'sessionActivityStore', from: TR, previous: 'c06cf64bb-CdJdJuVd.js#K', features: ['awaitsInit(e) {', 'seedFromTail(e, t'] },
  // Whether the session waits on a request (the busy row turns "blocked"): the host's transcript scope.
  'shared-39-ZCs0lAwB.js#lb': { name: 'useSessionAwaitsRequest', from: TR, previous: 'shared-11-_AVGLHEz.js#P_',
    features: ['t.requestsBySession[e];', 'Object.values(n).some(nb)'] },
  // The desktop's ErrorsProvider toasts (SH's "Copied"): the host's toasts.
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: TR, previous: 'shared-52-uHFNjl7C.js#cB', features: ['Must be called within ErrorsProvider'] },
  // Wave 8b: the terminal's inline-run store (ca41b3815 X, exported s), read as a hook with a selector by c19e90103 Vg
  // (3.6556.2 Bh) under UserBashRun k_. cds-core does not hold it (round4/wave8b/core W8B-D1: its closure dynamically imports
  // the xterm chunk c788b5dbe); the host's '!' commands run through the core, never as the terminal's tracked inline run.
  'ca41b3815-k7z3sa_r.js#X': { name: 'useTerminalInlineRunStore', from: TR, previous: 'ca41b3815-CD1z-rIH.js#X',
    features: ['inlineRun: null,', 'runInline: (i, a, o, s, c = !1, l) => {', 'promptLines: qt(),'] },
  // Wave 8b: the Shiki highlight worker (shared-55 TT, 3.6556.2 shared-46 YC: /assets/highlightWorker-*.js, an asset this
  // host does not serve), reached by pierre's pooled File under UserBashRun. The host answers null, the original's own
  // no-Worker branch: pierre highlights on the main thread.
  'shared-55-BRv2XBP7.js#TT': { name: 'createHighlightWorker', from: TR, previous: 'shared-46-BIbZBGFq.js#YC',
    features: ['if (typeof Worker > "u") return null;', 'name: "shiki-highlight"'] },
};
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'cd4f82e77-Cuw99s6A.js#_r': 'ef491f2b7350989d2a9e4ac1bf067e29c88943af43503d95207674444120da83',
  'c06cf64bb-CoZso5N4.js#Zc': '55e045d2eb0fb8f7ce247c48cbc9e44ba84f7070dc682db181e07a41f1e05f11',
  'c06cf64bb-CoZso5N4.js#K': 'aa301e1dfd5829122a9840728a116c9ba6adec69da1e7926c87b6ee3255fadc3',
  'shared-39-ZCs0lAwB.js#lb': '325f37e5decd118ac66fea1e160732e98c63e3b5d3075d27fb57cf143beadf7a',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'ca41b3815-k7z3sa_r.js#X': '4d67abbca82d29c95197b796d5e7b351e224f4b428d99f37dc71a9500a46296b',
  'shared-55-BRv2XBP7.js#TT': '59da49c3e903f49fd61e6deaa78cc60e23815280bf2d86534155c32386f6c889',
};
async function pinAdapters(cache) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource), entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} (${spec.name}) is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    for (const [other, features] of Object.entries(spec.also ?? {})) {
      const also = src.top.get(other);
      if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
      assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
    }
    const [pFile, pLocal] = spec.previous.split('#');
    const before = await readSource(pFile, cache, official.previousIonSource), prev = before.top.get(pLocal);
    if (!prev || prev.kind === 'import') throw Error(`adapter ${key}: previous ${spec.previous} is not a 3.6556.2 declaration`);
    const declarationSha256 = sha(rawText(src, entry)), pin = ADAPTER_PINS[key];
    if (pin === undefined) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.previous, previousDeclarationSha256: sha(rawText(before, prev)), declarationSha256, pinned: pin !== null });
  }
  return out;
}
// The adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const item of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [orig, as] = item.split(/\s+as\s+/);
      exported.set(as ?? orig, { from: `src/${m[2]}`, orig });
    }
  if (/^\s*export\s+(?:const|let|var|function|async|class|default)\b/m.test(text)) throw Error(`${ADAPTER_FILE}: re-exports only`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a]));
  for (const [name, a] of wanted) if (exported.get(name)?.from !== a.from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${a.from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, { from, orig }] of exported) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${esc(orig)}\\b|export \\{[^}]*\\b${esc(orig)}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${orig} (${name})`);
  }
}

// ── tr-0 owner table: state the rows provide / read that another graph owns (checked against its manifest) ─────────
export const FOREIGN_OWNERS = [
  { name: 'pathResolverContext', binding: `${PATHS}#Mt`, owner: 'cds-core', publicName: 'ctx_c856385e2_Mt', previous: 'c856385e2-aEyDzrcK.js#at',
    why: 'the context PathResolverProvider (Nt = Mt.Provider) provides; cds-core holds it, so this graph imports it' },
  { name: 'CdsModeStoreContext', binding: `${official.sharedFrame}#ka`, owner: 'cds-core', publicName: 'CdsModeStoreContext', why: 'D46: read by the CDS rows the later steps slice' },
  { name: 'CdsSkeletonGroupContext', binding: `${official.sharedFrame}#rf`, owner: 'cds-core', publicName: 'CdsSkeletonGroupContext', why: 'D46: read by the CDS rows the later steps slice' },
  { name: 'SessionFileOpenerProvider', binding: `${PATHS}#Ot`, owner: 'r3b-transcript-v4', target: 'session-file-access.mjs', export: 'SessionFileOpenerProvider',
    why: 'account2/plan.json tr-0 named c856385e2#Ot as PathResolverProvider; in 4.16336.0 it is Dt.Provider, the session file opener provider r3b-transcript-v4 slices and exports (linked by the step that reads it)' },
];

const target = file => {
  const named = { [C96]: 'group-status.mjs' };
  return named[file] ?? `rows-${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
};
// Top-level statements a module carries although they assign to nothing it selects (the same four the 3.6556.2 graph
// carries, at their 4.16336.0 text): pierre's diffs-container custom element (c64baa838; its shadow root adopts pierre's
// base stylesheet), the oniguruma binding's static fields and the bundled themes registered into the highlighter
// (c68fd9df8), property-information's Info prototypes (vendor-markdown; hast attribute metadata read by hastToHtml).
const CARRY = {
  [SCROLLER]: ['if(typeof HTMLElement<"u"&&customElements.get("diffs-container")==null)'],
  [THEMES]: ['C(D,"LAST_ID",0),', '.registerThemeIfAbsent(e.name,e.load)'],
  'vendor-markdown-CoTLcoVs.js': ['.prototype.normal={}', '.prototype.attribute=""', '.prototype.defined=!0'],
};
const ORIGINALS = [
  // tr-0: It's path helpers (shared-3 / shared-26, pure) and React Compiler-free helpers of shared-frame (cds-core holds
  // them without a public name, so they are sliced again, recorded as heldByViewTabs). The compiler memo helpers
  // (shared-frame J9 / J1 … K4, pure) stay sliced here as in tr-0 / tr-1: artifact-library-v4 and effort-control-v4 link
  // them from this graph's rows-shared-frame.mjs (sharedExports), so working-line-v4 is linked only for the two modules
  // tr-3 needs (LINKED_AREAS).
  'shared-26-B-POtn5S.js', 'shared-3-IQTrO7Gx.js', official.sharedFrame,
  // tr-2 / tr-3: what pierre's File, its virtualizer and the Shiki highlighter reach (pierre c64baa838 / c49d7f557 /
  // cb971281b, the Shiki core c2a6d07ee / ce7d378c5 / ce8acc63b / c298f6a9f / c2ad856dc, hast vendor-markdown, the
  // language registry c41eb0199 / cbe9ab01c), the find ranges (shared-100 / shared-33 / shared-12), the metrics
  // (ca7ba268c / c93fb40ec, shared-92 pk), the theme mode context (shared-1 mF / BF), the palette override the code theme
  // pair reads (shared-55 / shared-25), shared-0's logger and the turn status rows flag ca7b95e24 (TurnMarkOutlet's class
  // names), c74f29bd2 (theme colour lookups). shared-36 (the editor-prefs store and its selectors) is not listed: every
  // binding of it the closure reads is exported by settings-pages-v4's editor-prefs.mjs (linked below).
  'c298f6a9f-BrOoQvZD.js', 'c2a6d07ee-DMz3SVeU.js', 'c2ad856dc-B_6w0rdo.js', 'c41eb0199-Bea7nNQY.js', 'c49d7f557-CNaqSp3R.js',
  'c74f29bd2-CAuuQDSL.js', 'c93fb40ec-BxOp-lhI.js', 'ca7b95e24-BFvFgBI_.js', 'ca7ba268c-BbXZXSeA.js', 'cb971281b-D6cYBjx-.js',
  'cbe9ab01c-P15fuilu.js', 'ce7d378c5-DW6-PXsP.js', 'ce8acc63b--p2KTarf.js', 'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js',
  'shared-100-BBQR7Gmd.js', 'shared-12-DVKzjo12.js', 'shared-33-DtdykY0y.js', 'shared-92-BOgyxePb.js', 'vendor-markdown-CoTLcoVs.js',
  'shared-25-D-aF0gt9.js', 'shared-55-BRv2XBP7.js',
  // tr-4: what the thinking step and the busy row reach: the tool activity kind of the clay mark (c77e464d3 w, 3.6556.2
  // X) and the path tables it reads (shared-153 / shared-6), the expansion store hook (cc6e9624e m over cds-core's store
  // context f; vendor-all-0 g, zustand's useStore), the line break pattern (c4d199b75 S), the live scope's effect helper
  // (ce046217f n / r).
  'c77e464d3-CXDLcHxC.js', 'shared-153-DMw2VzSq.js', 'shared-6-2QYRw_Wv.js', 'cc6e9624e-QSsNXeYh.js', 'vendor-all-0-uUCo-eCX.js',
  'c4d199b75-BFt-qsGU.js', 'ce046217f-k8kVATJC.js',
  // Wave 8b, UserBashRun k_: the terminal opener context (c02b04696), the output tail-follow scroll (c7146e7f4), the
  // shell-output trim and ANSI pieces (c38a51fa0 / c966e2bd9 / c357f4e02 / c91a5e4a6 / c425fb3cf / cdc530824 / cdb0de22b /
  // c81ea1931), the transcript markdown tokens it shares with the painter (cb8c5a88f), pierre's streaming highlight client
  // (shared-11, module state first held here), the copy button and its telemetry (shared-123 / shared-62 / shared-183 /
  // shared-7 / shared-38 / vendor-intl). The Shiki highlight worker (shared-55 TT) is the host adapter createHighlightWorker.
  'c02b04696-BI-AWxcN.js', 'c7146e7f4-C5w7RvdJ.js', 'c38a51fa0-DDiOiHIe.js', 'c966e2bd9-D2U_Ub6d.js', 'c357f4e02-BWieMwXh.js',
  'c91a5e4a6-BOaQZsN0.js', 'c425fb3cf-Gc8R9PSy.js', 'cdc530824-C3lQuaP7.js', 'cdb0de22b-BdYGa-_B.js', 'c81ea1931-ChuE7vym.js',
  'shared-11-CNsu0Zu8.js', 'shared-123-1Hc1RTKl.js', 'shared-62-DoCqVpIq.js', 'shared-183-B2N6Zy4J.js',
  'shared-7-D2e77H6v.js', 'shared-38-DyF0_Fim.js', 'vendor-intl-BJgYK7RA.js', 'cb8c5a88f-Cxti0pWl.js',
];
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.exports.length === 0),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
    ...(CARRY[file] ? { carryStatements: CARRY[file] } : {}),
  })),
  // The originals the roots read (listing a chunk the closure never enters, or entering one not listed, stops generation).
  ...ORIGINALS.map(source => ({ source, target: target(source), ...(CARRY[source] ? { carryStatements: CARRY[source] } : {}) })),
  // Wave 8b: pierre's lazily loaded File re-export (c19e90103 `import("./c3ffe0a17-C6kuCBqD.js")`), as the 3.6556.2 graph.
  { source: 'c3ffe0a17-C6kuCBqD.js', target: 'c3ffe0a17-C6kuCBqD.js', reexport: true },
];
for (const m of modules) if (m.linkExports) throw Error(`${m.target}: raw linkExports; tr-2 exports semantic names only (LINK_SURFACE)`);

// Linked, never sliced again (D1): working-line-v4's morph.mjs (the turn mark broker context TurnMarkOutlet reads, the
// mark's neverHeld / noSubscription), preload-helper.mjs (Vite's preload helper) and, from tr-4 on, the turn status step
// (turn-status.mjs TurnStatus), the working line's spinner / clock / input label (working-line.mjs), the clipboard writer
// (clipboard.mjs J$) and shared-2 m7 that SH / Ize read (its shared-frame.mjs stays unlinked: the memo helpers are sliced
// here, see ORIGINALS); code-editor-current-v4's theme colour lookups (c74f29bd2 a), the bundled code theme
// objects and colour reader (c5d464fa3 I / L / z) and the layout tokens (cc3bc2027 e / t); settings-pages-v4's editor
// preferences store (shared-36 Om, a persisted zustand store) and the selectors over it the closure reads.
export const LINKED_AREAS = [{ area: 'working-line-v4', modules: ['morph.mjs', 'preload-helper.mjs', 'turn-status.mjs', 'working-line.mjs', 'clipboard.mjs', 'shared-2.mjs'] },
  { area: 'code-editor-current-v4', modules: ['c74f29bd2.mjs', 'c5d464fa3.mjs', 'layout-tokens.mjs'] },
  { area: 'settings-pages-v4', modules: ['editor-prefs.mjs', 'code-theme-vars.mjs'] }];

// tr-2: the link surface. name: the host's own alias (its import of the 3.6556.2 graph, `host`); previous / binding: the
// 3.6556.2 and 4.16336.0 declarations; owner: 'transcript-rows-v4' (a root here, exported under `name`), 'cds-core'
// (publicName) or another graph (module `target`, export `export`). decl: raw substrings of both declarations (prevDecl
// when 4.16336.0 rewrote it); use: raw substrings of each whole chunk with `$L` for the binding's own local (a state
// binding's declaration is only `new Map` / `new Set`), each found exactly once on both sides.
const FILE_VIEWER = 'src/source-file-viewer.jsx';
export const LINK_SURFACE = [
  { name: 'PierreFile', host: FILE_VIEWER, previous: 'c19e90103-BQFzF8EA.js#Uc', binding: `${PIERRE}#Xl`, owner: 'transcript-rows-v4',
    decl: ['({file:t,options:n,...r}=e', 'i==="plain"&&', 'i==="direct"?n:'] },
  { name: 'pierreContents', host: FILE_VIEWER, previous: 'c19e90103-BQFzF8EA.js#fl', binding: `${PIERRE}#gu`, owner: 'transcript-rows-v4',
    decl: ['return t.includes("\\r")?t.replace(', ',"\\u240D"):t}'] },
  { name: 'pierreLetterSpacing', host: FILE_VIEWER, previous: 'c19e90103-BQFzF8EA.js#Rc', binding: `${PIERRE}#Gl`, owner: 'transcript-rows-v4',
    decl: ['`letter-spacing: ${', '.letterSpacing}; font-feature-settings: ${', '.fontFeatureSettings};`'] },
  { name: 'pierreWrapStyle', host: FILE_VIEWER, previous: 'c19e90103-BQFzF8EA.js#zc', binding: `${PIERRE}#Kl`, owner: 'transcript-rows-v4',
    decl: ['={"--diffs-overflow-override":"clip","--diffs-scrollbar-gutter-override":"0px"}'] },
  { name: 'PierreScroller', host: FILE_VIEWER, previous: 'c64baa838-cddTLIc9.js#_n', binding: `${SCROLLER}#xn`, owner: 'transcript-rows-v4',
    decl: ['({children:', ',contentClassName:', 'typeof window<"u"?new ', '==null?l?.cleanUp():l?.setup(e)'] },
  // 4.16336.0 rewrote the path -> language lookup (the filename table and extension map first, then the Shiki aliases).
  { name: 'fileLanguage', host: FILE_VIEWER, previous: 'c476e9be4-DlarndnK.js#b', binding: `${LANGUAGE}#O`, owner: 'transcript-rows-v4',
    prevDecl: ['if(o!=="text")return o;let s=n.toLowerCase();return s===n?o:'], decl: ['.toLowerCase(),a=r.lastIndexOf("."),', 'if(o===""&&!v.has(r))return"text";'] },
  { name: 'useCodeTheme', host: FILE_VIEWER, previous: 'c5d464fa3-Bot02AbX.js#F', binding: `${CODE_THEME}#K`, owner: 'transcript-rows-v4',
    decl: ['{light:e,dark:t}=', '{theme:{light:e,dark:t}}'] },
  { name: 'bundledThemeColor', host: FILE_VIEWER, previous: 'c5d464fa3-Bot02AbX.js#O', binding: `${CODE_THEME}#z`, owner: 'code-editor-current-v4', target: 'c5d464fa3.mjs', export: 'z',
    decl: ['(e==="dark"?', ').colors[t]??""}'] },
  { name: 'resolveCodeTheme', host: FILE_VIEWER, previous: 'c68fd9df8-CJ4k-Myz.js#X', binding: `${THEMES}#X`, owner: 'transcript-rows-v4',
    decl: ['return h.getResolvedTheme(e)??f(e)}'] },
  { name: 'useCodeThemeMode', host: FILE_VIEWER, previous: 'c0fbbe82d-COsmfHJY.js#Rn', binding: `${MODE}#t`, owner: 'transcript-rows-v4',
    decl: ['{resolvedMode:', '==="dark"?"dark":"light"}'] },
  { name: 'lineCount', host: FILE_VIEWER, previous: 'shared-28-DNYlf4wu.js#AD', binding: `${LINES}#sZ`, owner: 'transcript-rows-v4',
    decl: ['{let t=1;for(let n=e.indexOf(`', 'n!==-1;n=e.indexOf(`', ',n+1))t++;return t}'] },
  // 4.16336.0: the metrics take the base font size first, then the density, then an explicit code font size.
  { name: 'fileMetrics', host: FILE_VIEWER, previous: 'c82eca2bd-CImI7zNG.js#ht', binding: `${METRICS}#m`, owner: 'transcript-rows-v4',
    prevDecl: ['(e,t="compact"){return '], decl: ['(t=n(),r="compact",i=null){', '["font-size-code"][r]*t'] },
  { name: 'codeSelectionCss', host: FILE_VIEWER, previous: 'c82eca2bd-CImI7zNG.js#ct', binding: `${METRICS}#l`, owner: 'transcript-rows-v4',
    decl: ['`::selection { background-color: light-dark(var(--code-theme-light-selection-bg, ${', '("dark","editor.selectionBackground")}));'] },
  { name: 'fileGutterCss', host: FILE_VIEWER, previous: 'cc3bc2027-CqmDBxcX.js#i', binding: `${GUTTER}#n`, owner: 'transcript-rows-v4',
    decl: ['[data-line-number-content]{min-width:max(calc(${', '[data-overflow="wrap"] [data-line]{white-space:break-spaces;overflow-wrap:anywhere}'] },
  { name: 'findLineOrdinal', host: FILE_VIEWER, previous: 'cc3bc2027-CqmDBxcX.js#S', binding: `${ORDINAL}#x`, owner: 'transcript-rows-v4',
    decl: ['{let n=t;for(;n>0&&e[n-1]===e[t];)n--;return t-n}'] },
  { name: 'highlightFileFind', host: FILE_VIEWER, previous: 'cd2efac6e-Be7wcc4w.js#fc', binding: `${FIND}#Pt`, owner: 'transcript-rows-v4',
    decl: ['e.ownerDocument.createElement("style"),', '.querySelector(`[data-line="${t}"]`)'] },
  { name: 'highlightFileLines', host: FILE_VIEWER, previous: 'cd2efac6e-Be7wcc4w.js#_c', binding: `${FIND}#Bt`, owner: 'transcript-rows-v4',
    decl: ['{i=requestAnimationFrame(a);return}', '??document.createElement("style");', '()=>{cancelAnimationFrame(i),'] },
  { name: 'revealFileLine', host: FILE_VIEWER, previous: 'cd2efac6e-Be7wcc4w.js#vc', binding: `${FIND}#Vt`, owner: 'transcript-rows-v4',
    decl: ['.scrollIntoView({behavior:"instant",block:"center"}),!0', 'Number.parseInt(a.getAttribute("data-line")??"",10)'] },
  { name: 'editorLayout', host: 'src/generated/code-editor-current (layout-tokens.mjs)', previous: 'cc3bc2027-CqmDBxcX.js#n', binding: `${GUTTER}#e`,
    owner: 'code-editor-current-v4', target: 'layout-tokens.mjs', export: 'editorLayout', decl: ['={padBlock:"8px",linePadStart:"4px",linePadEnd:"12px",numberPadStart:"18px",foldColumnWidth:"12px"}'] },
  { name: 'lineNumberLayout', host: 'src/generated/code-editor-current (layout-tokens.mjs)', previous: 'cc3bc2027-CqmDBxcX.js#r', binding: `${GUTTER}#t`,
    owner: 'code-editor-current-v4', target: 'layout-tokens.mjs', export: 'lineNumberLayout', decl: ['(e){return e?{minWidth:"2rem",padEnd:"0px"}:{minWidth:"2.5rem",padEnd:"8px"}}'] },
  { name: 'TASK_LINK_CLASS', host: 'src/source-background-tasks.jsx', previous: 'c86240138-Cq_NwsO0.js#n', binding: `${TASK_LINK}#n`, owner: 'transcript-rows-v4',
    decl: ['="text-accent hover:underline underline-offset-[1px] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-[3px]"'] },
  // 4.16336.0 dropped the store's `ccd-sessions-filter` persistence (selectedProjects).
  // Wave 8b: bv is cds-core's (store_shared8_bv, single holder); through wave 8a it was frame-sidebar-nav's
  // (owner: 'frame-sidebar-nav', target: 'shared-8.mjs', export: 'bv').
  { name: 'desktopSessionsStore', host: 'src/source-code-transcript.jsx', previous: 'shared-8-Db1QN4mf.js#og', binding: 'shared-8-BqfCbkJd.js#bv', owner: 'cds-core',
    publicName: 'store_shared8_bv', decl: ['({sessions:[],isInitialized:!1,initialLoadTimedOut:!1,loadFailed:!1,archivedRowsPending:!1'] },
  { name: 'liveSessionStores', host: 'src/source-code-session-info.jsx', previous: 'c06cf64bb-CdJdJuVd.js#q', binding: 'c06cf64bb-CoZso5N4.js#q', owner: 'cds-core',
    publicName: 'state_c06cf64bb_q', decl: ['=new Map'], use: ['function J(e){return $L.get(e)?.getState()}', '(e,t){let n=$L.get(e),r=n?.getState()'] },
  // The watchers set moved from nT to mE (4.16336.0 nT is a counter, `nT=0`).
  { name: 'liveSessionWatchers', host: 'src/source-code-session-info.jsx', previous: 'c06cf64bb-CdJdJuVd.js#nT', binding: 'c06cf64bb-CoZso5N4.js#mE', owner: 'cds-core',
    publicName: 'state_c06cf64bb_mE', decl: ['=new Set'], use: ['t())};return $L.add(r),()=>{$L.delete(r),n?.()}}'] },
  { name: 'TurnMarkOutlet', host: 'src/source-transcript-rows.jsx', previous: 'cb6930dae-Dw_4c1QI.js#po', binding: `${MARK}#Eu`, owner: 'transcript-rows-v4',
    // 4.16336.0: the outlet registers through open / close (and tells the broker whether it sits under the plan) instead of setOutlet.
    prevDecl: ['{className:t,attrs:n,onPressOrKey:r}=e', '?.setOutlet(e)', '.addEventListener("pointerdown",e,!0)', '"data-turn-mark-outlet":""'],
    decl: ['{className:t,attrs:n,onPressOrKey:a,underPlan:o}=e', '.setOutletUnderPlan(s)', '.openOutlet(e),()=>', '.addEventListener("pointerdown",t,!0)', '"data-turn-mark-outlet":""'] },
];
const countOf = (text, needle) => text.split(needle).length - 1;
async function linkSurface(manifest, cache) {
  const rows = [];
  const generated = new Map(manifest.modules.map(m => [m.source, m]));
  for (const entry of LINK_SURFACE) {
    const sides = [[entry.previous, official.previousIonSource, entry.prevDecl ?? entry.decl], [entry.binding, official.ionSource, entry.decl]];
    const shas = [];
    for (const [key, dir, decl] of sides) {
      const [file, local] = key.split('#');
      const src = await readSource(file, cache, dir), node = src.top.get(local);
      if (!node || node.kind === 'import') throw Error(`link surface ${entry.name}: ${key} is not a declaration`);
      const raw = rawText(src, node);
      for (const f of decl) if (!raw.includes(f)) throw Error(`link surface ${entry.name}: ${key} lacks ${JSON.stringify(f)}`);
      for (const f of entry.use ?? []) {
        const n = countOf(src.code, f.replaceAll('$L', local));
        if (n !== 1) throw Error(`link surface ${entry.name}: ${key} use ${JSON.stringify(f)} found ${n} times, expected 1`);
      }
      shas.push(sha(raw));
    }
    const [file, local] = entry.binding.split('#');
    let at;
    if (entry.owner === 'transcript-rows-v4') {
      const mod = generated.get(file);
      if (!mod || mod.exports?.[local] !== entry.name) throw Error(`link surface ${entry.name}: ${entry.binding} is not exported here as ${entry.name}`);
      at = `transcript-rows-v4/${mod.target}`;
    } else if (entry.owner === 'cds-core') {
      const cds = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
      const pub = cds.publicNames?.[entry.publicName];
      if (!pub || pub.file !== file || pub.local !== local) throw Error(`link surface ${entry.name}: cds-core does not publish ${entry.publicName} as ${entry.binding}`);
      at = `cds-core/${pub.target}#${pub.exportName}`;
    } else {
      const m = JSON.parse(await fs.readFile(path.join(generatedRoot, entry.owner, 'manifest.json'), 'utf8'));
      if (m.referenceVersion !== official.referenceVersion) throw Error(`link surface ${entry.name}: ${entry.owner} is ${m.referenceVersion}`);
      const mod = m.modules.find(x => x.target === entry.target && path.basename(x.source ?? '') === file);
      const exported = mod && (mod.exports?.[local] ?? ((mod.linkExports?.includes(local) || mod.sharedExports?.includes(local)) ? local : null));
      if (exported !== entry.export) throw Error(`link surface ${entry.name}: ${entry.owner}/${entry.target} does not export ${entry.binding} as ${entry.export}`);
      if (generated.get(file)?.bindings?.some(b => (b.name ?? b) === local)) throw Error(`D1: link surface ${entry.name} ${entry.binding} is ${entry.owner}'s, but this graph slices it`);
      at = `${entry.owner}/${entry.target}#${entry.export}`;
    }
    rows.push({ name: entry.name, host: entry.host, previous: entry.previous, binding: entry.binding, owner: entry.owner, at,
      previousDeclarationSha256: shas[0], declarationSha256: shas[1] });
  }
  for (const mod of manifest.modules) if (mod.linkExports?.length) throw Error(`${mod.target}: raw linkExports ${mod.linkExports.join(', ')}`);
  return rows;
}

// tr-1: the verbatim pins (scripts/transcript-rows-v4.verbatim-pins.json) and the lazy-load tables that reach them.
const VERBATIM_PINS_FILE = path.join(import.meta.dirname, 'transcript-rows-v4.verbatim-pins.json');
const lazyVerbatim = { importers: [LANGS, THEMES], count: 249 };

// Pinned on the minified bytes (each exactly once): the providers / readers the owner table relies on.
const rawCallSites = [
  { source: TASKS, role: 'tr-0: the background task provider ve nests L (statuses by tool id, fe) and z (task ids by tool id, H); Q (exported u) reads L',
    features: ['s=fe(a),', 'l=H(a),', 'n(L.Provider,{value:s}', 'n(z.Provider,{value:l}', 'function Q(){return e(L)}', 'Q as u', 've as t'] },
  { source: PATHS, role: 'tr-0: the path resolver context Mt (cds-core), its provider Nt (exported d), its reader Q (exported I) read for windowsRoot by Pt; It (exported lt) builds {windowsRoot, toAbs, toRel}; Ot is the session file opener provider',
    features: ['Mt=l(null)', 'Nt=Mt.Provider', 'function Q(){return s(Mt)}', 'function Pt(){return Q()?.windowsRoot===!0}', 'Nt as d', 'It as lt', 'Ot=Dt.Provider'] },
  { source: C96, role: 'tr-0: the proposal pane context aV (exported Ai) and its reader oV',
    features: ['var aV=k({inline:!1,captureGuardedSnapToBottom:TYe});function oV(){return j(aV)}', 'aV as Ai'] },
];

// tr-5: the seven 3.6556.2 call sites, pinned again at their 4.16336.0 declarations (each located by its features alone,
// unique in its chunk, under the reviewed local; the slicer records its raw sha256 in the manifest).
const CB6 = MARK;
export const CALL_SITES = [
  { source: C96, binding: 't1e', pin: '777965bfa7b2c0bb9e8d28e248f9a6c477085156f6c8337b022dcc34edda4c4b', previous: 'c96d752d0-CWv_7-n9.js#Z1e', probe: 'failedLabel:""',
    role: 'tr-5: the tool group (3.6556.2 Z1e / v2e): with turnStatusRows (Rv) its status row is Fze over the members (candidate, the summary, failedLabel "", the diff counts trailing, open / onOpenChange); the running label holds 650 ms with the rest key (pP, Cy). Host: source-tool-group.jsx',
    features: ['Ie = Rv(),', 'pP(pt, 650, Ie ? Cy : void 0)', 'f(Fze, {', 'candidate: L,', 'failedLabel: "",', 'runningIds: t.flatMap(i1e),'] },
  { source: C96, binding: 'mM', pin: '2aad7a52e6c737cb7a4cc0e8ed170b3bee15d23d212422cf40b3d1f5e9da8797', previous: 'c96d752d0-CWv_7-n9.js#ak', probe: 'blockedLabel:',
    role: 'tr-5: a tool row with turnStatusRows (3.6556.2 ak / qP): op.Step with label (verb), meta (title), blocked label and the disclosure; the classic row without. Host: source-session.jsx SourceStep',
    features: ['d = Rv(),', '{ state: "blocked", blockedLabel: i }', 'f(op.Step, {', 'metaTitle: n,'] },
  { source: C96, binding: 'SH', pin: 'd105498b3f6ba582b1adff5ea60d3c6d4d83c411b37fb5496604270624f4d9d4', previous: 'c96d752d0-CWv_7-n9.js#gX', probe: 'defaultMessage:"Thought process"',
    role: 'tr-5: the thinking row with turnStatusRows (3.6556.2 gX / HZ): an op.Step "Thought process", open by default, copy action "Thinking actions" (the ThoughtProcessStep root). Host: source-session.jsx reasoning',
    features: ['defaultMessage: "Thought process",', 'defaultMessage: "Thinking actions",', 'actionsLabel: d,'] },
  { source: C96, binding: 'JW', pin: '55c207df4886c2c94ccffd0d98f0e5626d5c44cad7458d85529da7b47cacf03f', previous: 'c96d752d0-CWv_7-n9.js#_X', probe: '(SH,{text:',
    role: 'tr-5: thinking (3.6556.2 _X / UZ): SH with turnStatusRows (Rv), the classic block without', features: ['i = Rv();', 'f(SH, { text: n, expansionKey: t })'] },
  { source: C96, binding: 'lCt', pin: '13bc0669f3f0a8e604f4189562c0d7e010f9b8e334e7c1065683a3999de9dde1', previous: 'c96d752d0-CWv_7-n9.js#R7', probe: '[&>[data-turn-mark-outlet]]:[grid-area:1/1]',
    role: 'tr-5: the transcript tail (3.6556.2 R7 / f9): the mark outlet shares a grid cell with the working line',
    features: ['className: "empty:hidden",', '[&>[data-turn-mark-outlet]]:[grid-area:1/1]', 'onPressOrKey: ti,'] },
  { source: CB6, binding: 'id', pin: '73f3f5af3cc217425554cede507c69db3d541e270afa2943d00f536a29d29d37', previous: 'cb6930dae-Dw_4c1QI.js#Ho', probe: 'liveRunningShellCalls:',
    role: 'tr-5: the transcript live scope (3.6556.2 Ho): {sessionId, turnLive, liveRunningToolIds, liveRunningShellCalls} through Zu (Xu.Provider, TranscriptLiveScopeContext), the last tool activity (Ju) and the mark broker pu (with the session id) around the rows. Host: source-transcript-rows.jsx TranscriptRowsScope',
    features: ['turnLive: C,', 'liveRunningToolIds: N,', 'liveRunningShellCalls: P,', 'i(pu, { sessionId: w, children: B })', 'i(Zu, { value: F, children: ue })'] },
  { source: C96, binding: 'twt', pin: 'b3ae2b94f9059b1092469f3e8cb260d5e85443388d7f3511170bf42303a417aa', previous: 'c96d752d0-CWv_7-n9.js#Aat', probe: 'defaultMessage:"Currently streaming message"',
    role: 'tr-5: the Next renderer feed (3.6556.2 Aat): its rows under the turnStatusRows provider forced on (Lv = working-line-v4 TurnStatusRowsOverride, value !0) inside the "Chat messages" feed. Host: source-transcript.jsx',
    features: ['defaultMessage: "Chat messages",', 'defaultMessage: "Currently streaming message",', '"Use the up and down arrow keys to move between messages.",',
      'f(Lv, { value: !0, children: Vn })'] },
];
// tr-5: the gate. `local` in `source` imports the reviewed binding of ca7b95e24 (the turnStatusRows chunk), which
// working-line-v4 slices (turn-status-rows.mjs) and exports under `name`.
export const GATE = { flag: '__gb__2846116625', name: 'turnStatusRows', chunk: 'ca7b95e24-BFvFgBI_.js', owner: 'working-line-v4', target: 'turn-status-rows.mjs',
  bindings: { l: 'TURN_STATUS_ROWS_FLAG', u: null, d: 'TurnStatusRowsProvider', f: 'TurnStatusRowsOverride', p: 'useTurnStatusRows' },
  hostAdapter: 'src/source-working-line-adapters.jsx', hostTable: 'src/host-growthbook.mjs' };
export const GATE_CALL_SITE = { source: C96, binding: 'twt', local: 'Lv', binds: 'f' };
// The pinned call sites that read the gate (`Rv()`, Rv = ca7b95e24 p, useTurnStatusRows).
export const GATE_READERS = { source: C96, local: 'Rv', binds: 'p', bindings: ['t1e', 'mM', 'JW'] };
async function locateCallSites(cache) {
  const out = [];
  for (const site of CALL_SITES) {
    const src = await readSource(site.source, cache, official.ionSource);
    const hits = [];
    for (const entry of declarations(src)) if (rawText(src, entry).includes(site.probe) && await carries(src, entry, site.features)) hits.push(entry);
    if (hits.length !== 1) throw Error(`call site ${site.source}#${site.binding}: ${hits.length} declarations carry its features, expected 1`);
    const names = [...src.top].filter(([, e]) => e === hits[0]).map(([n]) => n);
    if (!names.includes(site.binding)) throw Error(`call site ${site.source}: the declaration carrying ${site.previous}'s features is ${names.join(', ')}, not ${site.binding}`);
    const [pFile, pLocal] = site.previous.split('#');
    const before = await readSource(pFile, cache, official.previousIonSource);
    if (!before.top.get(pLocal) || before.top.get(pLocal).kind === 'import') throw Error(`call site ${site.binding}: previous ${site.previous} is not a declaration`);
    const declarationSha256 = sha(rawText(src, hits[0]));
    if (declarationSha256 !== site.pin) throw Error(`call site ${site.source}#${site.binding}: declaration ${declarationSha256} differs from the reviewed pin ${site.pin}`);
    out.push({ binding: `${site.source}#${site.binding}`, previous: site.previous, declarationSha256 });
  }
  return out;
}
// The gate is working-line-v4's: its turn-status-rows.mjs slices ca7b95e24 l / u / d / f / p and reads the flag through
// the host GrowthBook adapter; the feed's forced-on provider (Lv) is that TurnStatusRowsOverride; this graph slices none
// of them and imports each one it reads from there.
async function assertGate(manifest, cache) {
  const wl = JSON.parse(await fs.readFile(path.join(generatedRoot, GATE.owner, 'manifest.json'), 'utf8'));
  if (wl.referenceVersion !== official.referenceVersion || wl.gate?.flag !== GATE.flag) throw Error(`gate: ${GATE.owner} does not hold ${GATE.flag}`);
  const mod = wl.modules.find(m => m.target === GATE.target && m.source === GATE.chunk);
  if (!mod) throw Error(`gate: ${GATE.owner}/${GATE.target} does not slice ${GATE.chunk}`);
  for (const [local, name] of Object.entries(GATE.bindings)) {
    if (!mod.bindings.some(b => b.name === local)) throw Error(`gate: ${GATE.owner}/${GATE.target} does not slice ${GATE.chunk}#${local}`);
    if (name !== null && mod.exports?.[local] !== name) throw Error(`gate: ${GATE.owner}/${GATE.target} does not export ${local} as ${name}`);
  }
  const read = mod.imports.find(i => i.kind === 'adapter' && i.name === 'useGrowthBookFlag');
  if (!read || mod.imports.filter(i => i.kind === 'adapter').length !== 1) throw Error(`gate: ${GATE.owner}/${GATE.target} does not read the flag through useGrowthBookFlag alone`);
  const flagSrc = await readSource(GATE.chunk, cache, official.ionSource);
  if (rawText(flagSrc, flagSrc.top.get('l')) !== `l="${GATE.flag}"`) throw Error(`gate: ${GATE.chunk}#l is not the ${GATE.flag} flag`);
  if (!rawText(flagSrc, flagSrc.top.get('p')).includes('return t(u)??!1') || !rawText(flagSrc, flagSrc.top.get('f')).includes('u.Provider,{value:n'))
    throw Error(`gate: ${GATE.chunk} f / p no longer write / read the rows context u`);
  const host = await fs.readFile(path.join(root, GATE.hostAdapter), 'utf8');
  if (!/export function useGrowthBookFlag\(flag\) \{\s*return hostGrowthBookFlag\(flag\);\s*\}/.test(host) || !host.includes('from "./host-growthbook.mjs"'))
    throw Error(`gate: ${GATE.hostAdapter} useGrowthBookFlag does not answer from ${GATE.hostTable}`);
  for (const m of manifest.modules) {
    if (m.source === GATE.chunk && m.bindings.some(b => Object.hasOwn(GATE.bindings, b.name))) throw Error(`D1: ${m.target} slices the gate ${GATE.chunk}`);
    for (const imp of m.imports ?? []) {
      if (!imp.via || !imp.original) continue;
      const file = imp.via.includes(':') ? imp.via.split(':')[0] : imp.via.split('#')[0], local = imp.original;
      if (file === GATE.chunk && Object.hasOwn(GATE.bindings, local) && !(imp.kind === 'linked' && imp.from === `../${GATE.owner}/${GATE.target}`))
        throw Error(`${m.target}: reads the gate ${GATE.chunk}#${local} as ${imp.kind} ${imp.from}`);
    }
  }
  const c96 = await readSource(GATE_CALL_SITE.source, cache, official.ionSource), lv = c96.top.get(GATE_CALL_SITE.local);
  if (lv?.kind !== 'import' || lv.file !== GATE.chunk || flagSrc.exported.get(lv.alias) !== GATE_CALL_SITE.binds) throw Error(`gate: ${GATE_CALL_SITE.source} ${GATE_CALL_SITE.local} is not ${GATE.chunk}#${GATE_CALL_SITE.binds}`);
  if (!rawText(c96, c96.top.get(GATE_CALL_SITE.binding)).includes(`(${GATE_CALL_SITE.local},{value:!0,children:`)) throw Error(`gate: ${GATE_CALL_SITE.binding} no longer forces the rows on`);
  const rv = c96.top.get(GATE_READERS.local);
  if (rv?.kind !== 'import' || rv.file !== GATE.chunk || flagSrc.exported.get(rv.alias) !== GATE_READERS.binds) throw Error(`gate: ${GATE_READERS.source} ${GATE_READERS.local} is not ${GATE.chunk}#${GATE_READERS.binds}`);
  for (const b of GATE_READERS.bindings) {
    if (!CALL_SITES.some(site => site.source === GATE_READERS.source && site.binding === b)) throw Error(`gate: reader ${b} is not a pinned call site`);
    if (!rawText(c96, c96.top.get(b)).includes(`=${GATE_READERS.local}()`)) throw Error(`gate: call site ${b} no longer reads ${GATE_READERS.local}()`);
  }
  const { HOST_GROWTHBOOK } = await import(path.join(root, GATE.hostTable));
  return { ...GATE, served: Object.hasOwn(HOST_GROWTHBOOK, GATE.flag) ? HOST_GROWTHBOOK[GATE.flag] : 'not served (off; the Code session provides the rows value itself)',
    slicedReaders: manifest.modules.flatMap(m => (m.imports ?? []).filter(i => i.from === `../${GATE.owner}/${GATE.target}`).map(i => `${m.target}#${i.local} <- ${i.name}`)),
    pinnedReaders: GATE_READERS.bindings.map(b => `${GATE_READERS.source}#${b} (${GATE_READERS.local} = ${GATE.chunk}#${GATE_READERS.binds})`),
    forcedOn: `${GATE_CALL_SITE.source}#${GATE_CALL_SITE.binding} (${GATE_CALL_SITE.local} = ${GATE.chunk}#${GATE_CALL_SITE.binds})` };
}

// tr-4: the computed dynamic imports of c96d752d0's module graph (static and literal dynamic imports, transitively): every
// top-level declaration or statement holding one is listed, and none may be in this graph.
const COMPUTED_IMPORT = /\bimport\s*\(\s*[^"\s]/;
async function computedImportProof(manifest, cache) {
  const seen = new Set([C96]), queue = [C96], holders = [];
  while (queue.length) {
    const file = queue.pop(), text = await fs.readFile(path.join(official.ionSource, file), 'utf8');
    for (const [, spec] of text.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*"\.\/([\w.-]+\.js)"/g)) if (!seen.has(spec)) { seen.add(spec); queue.push(spec); }
    if (COMPUTED_IMPORT.test(text)) holders.push(file);
  }
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  const found = [];
  for (const file of holders.sort()) {
    const src = await readSource(file, new Map(), official.ionSource);
    for (const entry of declarations(src)) if (COMPUTED_IMPORT.test(rawText(src, entry))) {
      const names = [...src.top].filter(([, e]) => e === entry).map(([n]) => n);
      for (const n of names) if (sliced.has(`${file}#${n}`)) throw Error(`tr-4: ${file}#${n} holds a computed dynamic import and is in this graph`);
      found.push(`${file}#${names.join(',')}`);
    }
    for (const st of src.statements) if (COMPUTED_IMPORT.test(src.code.slice(st.node.start, st.node.end))) found.push(`${file}#<statement@${st.node.start}>`);
  }
  return { from: C96, modules: seen.size, holders: holders.length, declarations: found, inThisGraph: 0 };
}

async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root.
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      const located = spec.constraint
        ? hits.filter(entry => { const name = [...src.top].find(([, e]) => e === entry)?.[0]; return ROOT_CONSTRAINTS[spec.constraint](src, name); })
        : hits;
      if (located.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${located.length} top-level declarations carry its features${spec.constraint ? ` and pass ${spec.constraint} (of ${hits.length})` : ''}, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === located[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const aliases = [...src.exported].filter(([, l]) => l === local).map(([a]) => a).sort();
      if (JSON.stringify(aliases) !== JSON.stringify([...spec.exports].sort())) throw Error(`${file}#${local}: export aliases ${aliases.join(',') || '(none)'}, reviewed ${spec.exports.join(',') || '(none)'}`);
      const declarationSha256 = sha(rawText(src, located[0]));
      const key = `${file}#${local}`, pin = ROOT_PINS[key];
      if (pin === undefined) throw Error(`${key}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, step: spec.step, exports: aliases, ...(spec.constraint ? { constraint: spec.constraint, shapeAlternatives: hits.length } : {}), declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// tr-1: every pinned verbatim file hashes as pinned in 4.16336.0; a byte-identical one hashes the same in 3.6556.2.
async function readVerbatimPins() {
  const pins = JSON.parse(await fs.readFile(VERBATIM_PINS_FILE, 'utf8'));
  if (pins.referenceVersion !== official.referenceVersion || pins.previousVersion !== official.previousVersion) throw Error('verbatim pins: version mismatch');
  for (const p of pins.files) {
    const now = sha(await fs.readFile(path.join(official.ionSource, p.file)));
    if (now !== p.sha256) throw Error(`verbatim pin ${p.file}: ${now}, pinned ${p.sha256}`);
    if (p.status === 'identical') {
      if (p.previous !== p.file || p.previousSha256 !== p.sha256) throw Error(`verbatim pin ${p.file}: identical, but the previous entry differs`);
      const before = sha(await fs.readFile(path.join(official.previousIonSource, p.previous)));
      if (before !== p.previousSha256) throw Error(`verbatim pin ${p.file}: 3.6556.2 ${p.previous} is ${before}, pinned ${p.previousSha256}`);
    } else if (p.status === 'same-family') {
      if (p.previous === p.file || p.previous.split('-')[0] !== p.file.split('-')[0]) throw Error(`verbatim pin ${p.file}: same-family replacement of ${p.previous} must keep the family`);
      const family = (await fs.readdir(official.ionSource)).filter(n => n.startsWith(`${p.file.split('-')[0]}-`));
      if (family.length !== 1) throw Error(`verbatim pin ${p.file}: ${family.length} 4.16336.0 files of its family, expected 1`);
      const before = sha(await fs.readFile(path.join(official.previousIonSource, p.previous)));
      if (before !== p.previousSha256) throw Error(`verbatim pin ${p.file}: 3.6556.2 ${p.previous} is ${before}, pinned ${p.previousSha256}`);
    } else throw Error(`verbatim pin ${p.file}: unknown status ${p.status}`);
  }
  if (pins.files.length !== 249) throw Error(`verbatim pins: ${pins.files.length} files, the 3.6556.2 graph copies 249`);
  return pins;
}
function assertVerbatim(manifest, pins) {
  const emitted = new Map(manifest.modules.filter(m => m.verbatim).map(m => [m.source, m.sha256]));
  const pinned = new Map(pins.files.map(p => [p.file, p]));
  for (const [file, digest] of emitted) {
    const p = pinned.get(file);
    if (!p) throw Error(`verbatim ${file} is not in the reviewed pins`);
    if (p.deferred) throw Error(`verbatim ${file} is pinned as deferred (${p.deferred.step}) but this run reaches it`);
    if (digest !== p.sha256) throw Error(`verbatim ${file}: emitted ${digest}, pinned ${p.sha256}`);
  }
  for (const p of pins.files) if (!emitted.has(p.file) && !p.deferred) throw Error(`verbatim pin ${p.file} is not reached`);
}

// tr-0: the state this graph slices has no other 4.16336.0 copy; the foreign owners hold and export what is recorded.
// From tr-2 on, every module-level state binding the closure slices (a React context, or a module-level Map / Set /
// WeakMap / WeakSet) is listed too (`state`), each checked against every other 4.16336.0 graph (cds-core included).
async function ownerTable(manifest, cache) {
  const others = [];
  for (const dirent of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name === path.basename(TRANSCRIPT_ROWS_V4_OUTPUT)) continue;
    const file = path.join(generatedRoot, dirent.name, 'manifest.json');
    const json = await fs.readFile(file, 'utf8').then(JSON.parse, () => null);
    if (json?.referenceVersion === official.referenceVersion) others.push([dirent.name, json]);
  }
  const holders = key => others.filter(([, m]) => (m.modules ?? []).some(mod => path.basename(mod.source ?? '') === key.split('#')[0]
    && (mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === key.split('#')[1]))).map(([name]) => name);
  const owned = [];
  for (const [file, roots] of Object.entries(ROOTS)) for (const [local, spec] of Object.entries(roots)) {
    if (spec.step !== 'tr-0') continue;
    const key = `${file}#${local}`, elsewhere = holders(key);
    if (elsewhere.length) throw Error(`D1: ${key} (${spec.name}) is also sliced by ${elsewhere.join(', ')}; link it from there`);
    const mod = manifest.modules.find(m => m.source === file);
    owned.push({ name: spec.name, binding: key, owner: 'transcript-rows-v4', target: mod.target, export: spec.name });
  }
  const state = [];
  for (const mod of manifest.modules) {
    if (mod.verbatim) continue;
    const src = await readSource(mod.source, cache, official.ionSource);
    const contexts = new Set((mod.imports ?? []).filter(i => i.kind === 'react' && i.name === 'createContext').map(i => i.local));
    for (const b of mod.bindings ?? []) {
      const local = typeof b === 'string' ? b : b.name, entry = src.top.get(local), init = entry?.kind === 'var' ? entry.node.init : null;
      const kind = init?.type === 'NewExpression' && ['Map', 'Set', 'WeakMap', 'WeakSet'].includes(init.callee?.name) ? `module ${init.callee.name}`
        : init?.type === 'CallExpression' && contexts.has(init.callee?.name) ? 'context' : null;
      if (!kind) continue;
      const key = `${mod.source}#${local}`, elsewhere = holders(key);
      if (elsewhere.length) throw Error(`D1: ${key} (${kind}) is also sliced by ${elsewhere.join(', ')}; link it from there`);
      state.push({ binding: key, kind, target: mod.target, ...(mod.exports?.[local] ? { export: mod.exports[local] } : {}) });
    }
  }
  const cds = others.find(([name]) => name === 'cds-core')?.[1];
  const foreign = [];
  for (const f of FOREIGN_OWNERS) {
    const [file, local] = f.binding.split('#');
    if (f.owner === 'cds-core') {
      const pub = cds?.publicNames?.[f.publicName];
      if (!pub || pub.file !== file || pub.local !== local) throw Error(`owner table: cds-core does not publish ${f.publicName} as ${f.binding}`);
      foreign.push({ ...f, target: `cds-core/${pub.target}`, export: pub.exportName });
    } else {
      const m = others.find(([name]) => name === f.owner)?.[1];
      const mod = m?.modules?.find(x => x.target === f.target && path.basename(x.source) === file);
      if (!mod || mod.exports?.[local] !== f.export) throw Error(`owner table: ${f.owner}/${f.target} does not export ${f.binding} as ${f.export}`);
      foreign.push({ ...f, target: `${f.owner}/${f.target}` });
    }
    const elsewhere = holders(f.binding).filter(name => name !== f.owner);
    if (elsewhere.length) throw Error(`D1: ${f.binding} (${f.name}) is owned by ${f.owner} but also sliced by ${elsewhere.join(', ')}`);
  }
  // From tr-4 on, a host adapter import is one of the pinned HOST_ADAPTERS (by its original binding), never another one.
  const adapted = new Map(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, a.name]));
  for (const mod of manifest.modules) for (const imp of mod.imports ?? []) {
    if (imp.kind !== 'adapter') continue;
    const file = imp.via.includes(':') ? imp.via.split(':')[0] : imp.via.split('#')[0];
    if (adapted.get(`${file}#${imp.original}`) !== imp.name || imp.from !== '../../source-transcript-rows-v4-adapters.jsx')
      throw Error(`${mod.target}: imports host adapter ${imp.name} (${imp.via}), which is not a pinned HOST_ADAPTERS entry`);
  }
  return { owned, state, foreign };
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the transcript-rows-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function transcriptRowsV4Config() {
  return {
    name: 'transcript rows (4.16336.0)', generator: 'extract-transcript-rows-v4.mjs', output: path.join(root, TRANSCRIPT_ROWS_V4_OUTPUT),
    adapterModule: '../../source-transcript-rows-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, callSites: CALL_SITES.map(({ source, binding, role, features }) => ({ source, binding, role, features })), rawCallSites, lazyVerbatim, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
    gate: { flag: GATE.flag, name: GATE.name, host: 'src/host-growthbook.mjs HOST_GROWTHBOOK through working-line-v4 turn-status-rows.mjs (ca7b95e24 l / d / f / p; useGrowthBookFlag of src/source-working-line-adapters.jsx)' },
  };
}
export const probeConfig = transcriptRowsV4Config;

export async function extractTranscriptRowsV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const pins = await readVerbatimPins();
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const callSites = await locateCallSites(cache);
  const cfg = {
    ...transcriptRowsV4Config(),
    async artifacts(m) {
      assertVerbatim(m, pins);
      for (const key of Object.keys(PENDING_ROOTS)) {
        const [file, local] = key.split('#');
        if (m.modules.some(x => x.source === file && (x.bindings ?? []).some(b => (b.name ?? b) === local))) throw Error(`${key} (${PENDING_ROOTS[key].name}) is pending, but this run slices it`);
      }
      const owners = await ownerTable(m, cache);
      const surface = await linkSurface(m, cache);
      const gate = await assertGate(m, cache);
      const computedImports = await computedImportProof(m, cache);
      const rootsByTarget = new Map();
      for (const [file, rs] of Object.entries(ROOTS)) rootsByTarget.set(target(file), Object.values(rs).map(r => r.name));
      return {
        'index.mjs': `// Semantic names of the transcript-rows roots (${official.referenceVersion}, steps ${STEPS.join(', ')}); generated by extract-transcript-rows-v4.mjs.\n`
          + [...rootsByTarget].map(([t, names]) => `export { ${names.join(', ')} } from "./${t}";`).join('\n') + '\n',
        'owners.json': JSON.stringify({ step: 'tr-0', referenceVersion: official.referenceVersion, ...owners }, null, 2) + '\n',
        'link-surface.json': JSON.stringify({ step: 'tr-2', referenceVersion: official.referenceVersion, previousVersion: official.previousVersion, entries: surface }, null, 2) + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-transcript-rows-v4.mjs', steps: STEPS,
          previous: { generator: 'scripts/extract-transcript-rows.mjs', output: 'src/generated/transcript-rows', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, roots,
          linkedAreas: LINKED_AREAS, pendingRoots: Object.entries(PENDING_ROOTS).map(([binding, p]) => ({ binding, ...p })),
          adapters: { module: ADAPTER_FILE, entries: adapters }, callSites, gate, computedImports,
          verbatim: {
            pins: 'scripts/transcript-rows-v4.verbatim-pins.json', pinsSha256: sha(await fs.readFile(VERBATIM_PINS_FILE)), importers: lazyVerbatim.importers,
            emitted: m.modules.filter(x => x.verbatim).length, identical: pins.files.filter(p => p.status === 'identical').length,
            sameFamily: pins.files.filter(p => p.status === 'same-family').map(p => ({ previous: p.previous, file: p.file })),
            deferred: pins.files.filter(p => p.deferred).map(p => ({ file: p.file, ...p.deferred })),
          },
          imports: m.modules.flatMap(mod => (mod.imports ?? []).filter(i => i.kind && i.kind !== 'generated' && i.kind !== 'verbatim')
            .map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const cache = new Map();
    for (const f of await locateRoots(cache)) console.log('root', `${f.file}#${f.local}`, f.name, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters(cache)) console.log('adapter', a.original, a.name, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
    for (const c of await locateCallSites(cache)) console.log('callSite', c.binding, c.previous, c.declarationSha256);
  } else await extractTranscriptRowsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
