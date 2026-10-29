// w13-close-chat-renderer (plan-w13-closeout.md E63 / G8, closeout-items chatui-markdown-code-02/-03, chatui-thinking-search-02):
// extract the renderer a 3.6556.2 Chat answer is drawn with, without executing any desktop runtime code (decision D0: own
// generator, own output folder src/generated/chat-renderer, own scripts/verify-gen-chat-renderer.mjs). The machinery is
// the working line's runSlicer (scripts/extract-working-line.mjs; see its header for how a closure is resolved: host
// adapters, vendor-frame React, view-tabs public names, linked areas, listed chunks).
//
// Which renderer: cc1aae219's message content switch draws a Chat `text` block (case "text" / "connector_text") as
//   h(OR, { text: e, blockCitations: n, messageUuid: re, className: m, rootAttributes: g, isStreaming: s, …,
//           headingLevelOffset: 1, typography: dC, smartQuotes: te, …, letterDirection: V, directionTelemetry: !0 })
// with m = s ? "progressive-markdown" : "standard-markdown", dC = c89efce1a `us` ("prose"), te = GrowthBook
// `__gb__2215170874` (cfc0d8c26 t), V = GrowthBook `__gb__817024762` (shared-12 Oe). OR (internal) is a memo that hands
// every prop to gC = c89efce1a `rc` (export s, StandardMarkdown) with `useStreamingFadeIn: !0`. rc is the renderer: the
// remark pipeline (_i: gfm, latex, breaks, citations, prose blocks, smart / hanging quotes), the KaTeX plugins it loads on
// demand (c851b27a8 Zr / Jr: remark-math c6369e48b, rehype-katex ca129fbf3, katex cf1a02a1a), the streaming renderer
// (shared-10 Fv: fast paths for open fences / lists / tables / paragraphs, word fade-in), the code-in-markdown
// normalisation (shared-3 aM), the component table Ys (headings, p, lists, img Ts, pre Es, code Ds with the colour
// swatches, a js through c82d645d5 J with the "Open external link" dialog cfdfec14c J, table Bs in `prose-scroll`, the
// citation node Js → ca / sa → ia / da / ha) and the prose root (shared-10 lx). c18fe02d2 ChatMarkdown (`mi`, the
// "alluvium" engine) is not what a Chat answer uses: ca2ef848d loads it only for detail-placement thoughts behind
// `alluviumThoughts`; it is not sliced.
//
//   chat-text.mjs        cc1aae219 OR (internal) → ChatTextMarkdown.
//   <chunk>.mjs          the originals OR reaches in every other chunk, one module per chunk; ca129fbf3 / c6369e48b are
//                        the rehype-katex / remark-math chunks the latex loader imports (their own export names).
//
// What is not the original, and why (adapters in src/source-chat-renderer-adapters.jsx; each pinned by features):
//   shared-frame Ud (ua, cdsOpenWindow)  the link / image opener: window.open is denied in OpenClaude Desktop's windows
//                        (main.cjs setWindowOpenHandler), so the host opens the URL in the browser (the "external" call).
//   vendor-intl p / l    useIntl / FormattedMessage over the local catalog (routines-shared's adapters, D1).
//   c851b27a8 qr         the KaTeX chunk loader: the same three modules (katex is the npm `katex` 0.16.47, the version the
//                        official chunk inlines — asserted below — and ca129fbf3 / c6369e48b are this graph's), loaded
//                        on demand; the stylesheet is `katex/dist/katex.min.css` (the official cf1a02a1a css carries
//                        /assets/v1 font URLs this renderer does not serve). Once it settles the adapter calls c851b27a8 Hr
//                        (exported markLatexStylesheetSettled), the original's `.then(Hr)`, which arms the KaTeX font wait.
//   cf1a02a1a ja         the katex API object (the npm module, set once the loader ran).
//   shared-0 iO / B, shared-10 dd, shared-52 wT   o11y error reports, datadog actions, the formatter telemetry hook and
//                        the analytics client: nothing is reported here (no account, no telemetry; E59).
//   shared-4 HC          the citation directive's attributes (`VC.parse(e).citations.split(",")`, a zod object): the
//                        same check without zod.
//   vendor-markdown T    decode-named-character-reference's DOM build (`w = document.createElement("i")` at module
//                        load): the npm package itself (1.3.0, the same function; its browser export is this DOM build,
//                        its node export the entity table), so the graph also loads where there is no document (SSR).
//   shared-78 WF         the source favicon: the renderer's CSP (index.html img-src 'self' data: blob:) forbids the
//                        Google favicon service it fetches from, so the host draws WF's own fallback, the Globe icon.
//
// Linked, not sliced again (D1): chat-markdown (shared-10 Ab / Eb / Bu / lx / bv / xv, shared-4 RC), working-line,
// transcript-rows, routines-shared, session-rail(-sections), turn-plan, turn-box, cowork-progress, r3b-transcript,
// r3b-settings, chat-knowledge, chat-artifact-card. Pure bindings transcript-rows slices without exporting (the URL helpers
// of shared-52, shared-25 qV, vendor-markdown gr, ce8acc63b--p2KTarf e) are copied (`linkedCopies`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as v3 from './official-3.6556.2.mjs';
import { runSlicer } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const CC1 = 'cc1aae219-CeSwM-tp.js', C89 = 'c89efce1a-C_nlrFif.js', C851 = 'c851b27a8-BxvTOAx3.js', KATEX = 'cf1a02a1a-A3V2xzb_.js';
const S52 = 'shared-52-uHFNjl7C.js';

const adapters = {
  [v3.sharedFrame]: {
    Ud: { name: 'openChatLinkWindow', local: 'ua', features: ['if (oa(e)) return !1;', 'i.open(t, n, r)'] },
  },
  [v3.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: ['return (Mt(e), e);'] },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['(Wt, Ut)'] },
  },
};
const localAdapters = {
  [`${C851}#qr`]: { name: 'loadLatexPluginChunks', features: ['import("./cf1a02a1a-A3V2xzb_.js").then((e) => e.n)', 'import("./ca129fbf3-CdfQB5sF.js")',
    'import("./c6369e48b-Cz3VPKCm.js")', '.then(Hr)'] },
  [`${KATEX}#ja`]: { name: 'katexApi', features: ['version: ka,', 'renderToString: wa,', '__parse: Ta,', '__defineMacro: Q,'] },
  'shared-0-DDOOdL6P.js#iO': { name: 'reportO11yError', features: ['F.O11Y_INTERNALS'] },
  'shared-0-DDOOdL6P.js#B': { name: 'trackAction', features: ['I(Nv, F.O11Y_INTERNALS)'] },
  'shared-10-D6FXWZph.js#dd': { name: 'useFormatterTelemetry', features: ['formatter: t,', 'phase: n,', 'countWaiting: f,', 'new IntersectionObserver('] },
  [`${S52}#wT`]: { name: 'analyticsClient', features: ['return Ly;'] },
  'shared-4-DUB1Oi0O.js#HC': { name: 'parseCitationAttributes', features: ['citationUuids: VC.parse(e).citations.split(",")', 'citationUuids: []'] },
  'vendor-markdown-CTRWgQFt.js#T': { name: 'decodeNamedCharacterReference', features: ['let t = "&" + e + ";";', 'w.innerHTML = t;',
    'return n.charCodeAt(n.length - 1) === 59 && e !== "semi" ? !1 : n !== t && n;'] },
  'shared-78-D5Fw2h0a.js#WF': { name: 'ChatSourceFavicon', features: ['name: "Globe",', 'customSize: l + 2,',
    'className: "text-[color:var(--muted-as-secondary,var(--cds-text-muted))]",', 'fallbackSvg: r,', 'if (!c) return h;'] },
};

// Pure bindings transcript-rows slices without exporting (functions, regular expressions, constant sets and strings).
const pureCopies = {
  'ce8acc63b--p2KTarf.js': ['e'],
  'shared-25-DOWZRSlq.js': ['qV'],
  'vendor-markdown-CTRWgQFt.js': ['gr'],
  [S52]: ['nz', 'GR', 'qR', 'iz', 'UR', 'dz', 'fz', 'pz', 'az', 'lz', 'cz', 'oz', 'sz', 'JR', 'YR', 'XR', 'rz', 'uz', 'ZR', 'QR', '$R', 'ez',
    'KR', 'VL', 'UL', 'Q', 'lL', 'fL', 'BL', 'LL', 'NL', 'IL', 'PL', 'FL', 'uL', 'kL', 'zL', 'AL', 'RL', 'xL', 'bL', 'TL', 'OL', 'DL',
    'EL', 'SL', 'CL', 'wL', 'jL', 'dL', 'hL', 'gL', 'vL', 'WL', 'yL', '_L', 'HL', 'GL', 'KL', 'qL', 'gz', 'vz'],
};
const linkedCopies = Object.fromEntries(Object.entries(pureCopies).flatMap(([chunk, names]) =>
  names.map(name => [`${chunk}#${name}`, 'a pure binding transcript-rows slices without exporting'])));

// Every chunk the closure enters besides the root's, one module each (named after the chunk).
const chunks = ['shared-0-DDOOdL6P.js', 'c76f98194-TpmhBB1i.js', 'rolldown-runtime-C3OYiQ02.js', 'vendor-markdown-CTRWgQFt.js',
  'preload-helper-D0dM6GpB.js', 'shared-4-DUB1Oi0O.js', C851, 'shared-156-BLTosN8U.js', 'shared-3-BCEbd8Fv.js', 'shared-104-CTONUSaz.js',
  S52, 'shared-styles-WTvdnI3p.js', 'shared-10-D6FXWZph.js', 'ce8acc63b-D6MJR1iY.js', 'ce8acc63b--p2KTarf.js', 'cfa251f33-BpNR2qgC.js',
  'shared-5-Bg6ZMqvt.js', 'shared-25-DOWZRSlq.js', 'shared-1-BJhqMmkf.js', 'c26909c77-TCen2GL0.js', 'cfdfec14c-C31l4QmB.js',
  'c93172ffd-B7ZZCOWq.js', 'c82d645d5-Bwl2SKLx.js', 'shared-78-D5Fw2h0a.js', C89];

const modules = [
  { target: 'chat-text.mjs', source: CC1, internal: true, exports: { OR: 'ChatTextMarkdown' },
    features: { OR: ['useStreamingFadeIn: !0,', 'blockCitations: n,', 'mountedTextShown: a,', 'earlySettle: s,', 'smartQuotes: m,',
      'letterDirection: b,', 'directionTelemetry: x,', 'h(gC, {'] } },
  ...chunks.map(source => ({ target: source.replace(/\.js$/, '.mjs'), source,
    ...(source === C89 ? { exports: { rc: 'StandardMarkdown' }, features: { rc: ['normalizationMode: o,', 'useStreamingFadeIn: ee,',
      'hangingQuotes: M,', '"standard-markdown"', 'remarkPlugins: gt,', 'formatter: "katex",', 'renderer: Ke,',
      'gfm: it,', 'latex: lt,', 'citations: pt,', 'smartQuotes: et,', 'hangingQuotes: tt,'] } } : {}),
    // Jr: the latex plugin load the hook Zr starts on demand (exported for the SSR tests, which cannot run Zr's effect).
    // Hr: qr's `.then(Hr)` once the stylesheet settled (Rr, then Vr starts the document.fonts wait Wr / Ur hold the
    // plugins for); qr is the host's, so the adapter calls it at the same point. Gr: the font-wait request ei's effect
    // makes when math is on screen (exported for the SSR tests, which cannot run ei's effect).
    ...(source === C851 ? { exports: { Jr: 'loadLatexPlugins', Hr: 'markLatexStylesheetSettled', Gr: 'requestLatexFontWait' },
      features: { Jr: ['status: "ready",', 'remarkMath: r.default,',
      'rehypeKatex: n.rehypeKatexGuardedAndChecked((t) => Pr(t, e, i)),', 'katex: e.default,', 'inHouseLatexPlugin: Ze,'],
      Hr: ['Rr = !0', 'Vr()'], Gr: ['Q === "not_requested" && er === null', 'Q = "still_waiting"'] }, internal: true } : {}) })),
  { target: 'ca129fbf3-CdfQB5sF.mjs', source: 'ca129fbf3-CdfQB5sF.js', exports: { at: 'rehypeKatexGuardedAndChecked', it: 'rehypeKatexChecked' } },
  { target: 'c6369e48b-Cz3VPKCm.mjs', source: 'c6369e48b-Cz3VPKCm.js', exports: { h: 'default' } },
];

// Original text the host follows but does not import: how cc1aae219 feeds OR for a Chat text block, and the two
// GrowthBook flags it reads for smartQuotes / letterDirection (off here: no GrowthBook, E49).
const callSites = [
  { source: CC1, binding: 'OR', role: 'The Chat text block renderer: every prop to c89efce1a rc with useStreamingFadeIn',
    features: ['h(gC, {', 'useStreamingFadeIn: !0,'] },
];
const rawCallSites = [
  { source: CC1, role: 'case "text": OR with blockCitations, the standard / progressive class, headingLevelOffset 1, typography dC and directionTelemetry',
    features: ['m=s?"progressive-markdown":"standard-markdown"', 'headingLevelOffset:1,typography:dC,smartQuotes:te,onSettledCommit:Te,onFirstChunk:v,onFirstPaint:Ae,letterDirection:V,directionTelemetry:!0'] },
  { source: CC1, role: 'te / V: the smartQuotes and letterDirection GrowthBook reads', features: ['te=Zw(),V=Yw()'] },
  { source: 'cfc0d8c26-3yV9R5YA.js', role: 'smartQuotes: GrowthBook __gb__2215170874', features: ['var t="__gb__2215170874";function n(){return e(t)}'] },
  { source: 'shared-12-Dro5Rhl0.js', role: 'letterDirection: GrowthBook __gb__817024762', features: ['De="__gb__817024762"'] },
];

export const CHAT_RENDERER = {
  name: 'chat renderer', generator: 'extract-chat-renderer.mjs', output: path.join(root, 'src/generated/chat-renderer'),
  adapterModule: '../../source-chat-renderer-adapters.jsx', adapterFile: 'src/source-chat-renderer-adapters.jsx',
  adapters, localAdapters, linkedCopies, modules, callSites, rawCallSites,
  linkedAreas: ['chat-markdown', 'working-line', 'transcript-rows', 'turn-plan', 'cowork-progress', 'r3b-transcript', 'turn-box',
    'session-rail', 'session-rail-sections', 'chat-knowledge', 'chat-artifact-card', 'r3b-settings', 'routines-shared',
    // W13 G11 (D1, cowork-approval pendingDedupe): shared-52 Qq (push all of an array, copying a self-append) is
    // cowork-approval's import-free shared-52 module; linked from there, one copy.
    { area: 'cowork-approval', modules: ['shared-52-uHFNjl7C.mjs'] }],
  referenceVersion: v3.referenceVersion, referenceSnapshot: v3.referenceSnapshot, source: v3.ionSource, vendor: { [v3.vendorFrame]: v3.reactAliases },
};

// The katex adapter answers with the npm module: it must be the version the official chunk inlines.
function assertKatexVersion() {
  const chunk = fs.readFileSync(path.join(v3.ionSource, KATEX), 'utf8');
  const official = /,ka="([\d.]+)"/.exec(chunk)?.[1];
  const local = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/katex/package.json'), 'utf8')).version;
  if (!official || official !== local) throw Error(`katex: ${KATEX} inlines ${official}, node_modules has ${local}`);
}

export function extractChatRenderer(options) {
  assertKatexVersion();
  return runSlicer(CHAT_RENDERER, options);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatRenderer({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
