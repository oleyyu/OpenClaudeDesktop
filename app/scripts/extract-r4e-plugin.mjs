// R4e-plugin (settings-14): extract the 4.16336.0 plugin page Overview parts without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/r4e-plugin, own scripts/verify-gen-r4e-plugin.mjs).
//
// Source contract: 4.16336.0 only (scripts/official-4.16336.0.mjs, snapshot snapshots/claude-4.16336.0-20261104). The
// region plan lists no generated consumer of this area (cutover.oldConsumersAtGeneration []), so the production folder
// moved from 3.6556.2 to 4.16336.0 in place (region batch 2a); the 3.6556.2 contract and its view-tabs / routines-shared
// links are gone (backup: analysis/claude-4.16336.0-migrate-20261104/regions/batch2a/r4e-plugin/before/).
//
//   overview-sections.mjs  cae01a6fc U / W / X / J / ie (3.6556.2 G / K / X / Y / oe): the section heading (classic
//                          "text-caption text-secondary" outside the unified plugins UI), the Description section
//                          (sanitized, dir=auto, "whitespace-pre-wrap break-words text-primary text-body"; 4.16336.0
//                          always runs it through c79fa23ba t, the description linkifier, which 3.6556.2 gated behind
//                          GrowthBook 1063785924), a rail row (size-5 icon tile, OverflowTooltip label with " · note" in
//                          text-muted-as-secondary; new: `wrap` and an `href` row with an end CaretRight), the rail
//                          group (h3 + rows, "pt-md first:pt-0") and the "Connectors & tools" group (ae per row).
//   overview-layout.mjs    shared-19 iv (exported gs): the Overview main + rail layout ("flex flex-col gap-lg px-xl
//                          md:flex-row", rail aside "md:w-60"); av (exported _s) / rv: the rail card (CDS Card, fill
//                          bg-surface-1 outside pageLayout, gap-md, ring removed); Vg is W's heading leading for the
//                          connector page style.
//   text-sanitize.mjs      shared-62 lL / sL (exported _c / gc; 3.6556.2 shared-52 rJ / tJ): strip control, format,
//                          private-use and unassigned code points (keeping ZWNJ, ZWJ, VS15, VS16 and, per line, tabs).
//                          The host's plugin-detail-model.mjs and source-plugin-settings-tab.jsx import these two.
//   linkify.mjs            c79fa23ba h (exported t): the description linkifier — shared-62 Jl (link-text.mjs) with
//                          c79fa23ba b as renderLink: a CDS TextLink (cds-core CdsTextLink) for an allowed http(s) URL,
//                          plain text for the claude.ai pages it refuses, with c4acc1503's click / drag guards.
//   link-text.mjs, url-safety.mjs, external-link.mjs, preload-helper.mjs, shared-frame.mjs
//                          the closure those reach, carried from shared-62, shared-0, c4acc1503, preload-helper and
//                          shared-frame (the React Compiler helpers J9 / J0-J4 / K0-K5 / I1 and the window helpers
//                          ya / ma / ha). shared-0 Tl is the lazy one-shot value (3.6556.2's routines-shared Pa link,
//                          re-sliced here per region-plan resliceInsteadOfLink).
//
// Every emitted binding is an original top-level declaration sliced from the official chunk bytes; each module is the
// reachable closure of its roots (a declaration's dependencies are its free variables that are top-level bindings of its
// chunk), so a renamed or re-pointed minified import fails generation instead of binding the wrong value. Every root is
// exported by its chunk and is the only top-level declaration of that chunk carrying all of its features.
// An import resolves, in this order, to: a named host adapter in src/source-r4e-plugin-adapters.jsx (the declaration
// it replaces must carry `features`), a verified React export of vendor-frame (official.assertVendorAlias), a cds-core
// publicName (sharedGraph 'cds-core': CdsButton, CdsIcon, CdsOverflowTooltip, CdsInfoTooltip, CdsCard, CdsTextLink,
// clsx), or a module generated here: an import into a chunk listed in `modules` is carried into that chunk's `carry`
// module (exported under `semanticNames`, else its own name) until the closure is stable; any other chunk fails.
// cds-core (one copy of every CDS binding): its manifest must be on this version and snapshot, every module's bytes must
// equal the manifest and its sourceSha256 the official chunk; a pure binding it holds without a publicName is sliced
// again only when its declaration hashes as cds-core's (heldByCdsCore); module state it holds without a publicName stops
// generation (D46). Module state this graph owns is listed in `ownedState` with the reason a single copy is safe.
//
// `callSites` pin the 4.16336.0 text the host follows but cannot import: c24c8737b pu's tab list and Overview panel
// (Overview first and unconditional, Tool permissions only for a non-empty resolved list, the content tabs with their
// counts, Settings only for an added plugin whose options query answers), el / Fl / Yc / mu, shared-123 h4 (the plugin
// options query), shared-18 $b / ex, c76f00e40 li, c12456454 oo (what the Overview draws) and its closed branches (Try it
// Er, curated / directory prompts no / io), cae01a6fc re / ne (the Connectors & tools rows), cd14a8022 a (a server's
// display name), cd85e132d d and c28f9f509 u / h (a server without an icon: the Connectors glyph).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot, looseFeature } = official;
const source = official.ionSource;
const generatedRoot = path.join(root, 'src/generated');
const output = path.join(generatedRoot, 'r4e-plugin');
const sharedGraphArea = 'cds-core';
const adapterModule = '../../source-r4e-plugin-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = text => ({ loose: text });

// Host dependencies (checked first). `local` is the declaration the export alias must still name; `features` must
// appear in that declaration's prettier form, and `also` pins further declarations of the same chunk it reads.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  [official.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: [loose('let e = l(K);'), loose('return (Mt(e), e);')], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = a(Wt, Ut);')], also: { Wt: [loose('let { formatMessage: n, textComponent: a = i } = q(),')] } },
  },
  // shared-62 bP (exported Dl): `Fr(yP)`, yP = "__gb__2406162393", the unified plugins UI (the host answers it from
  // src/host-growthbook.mjs, where it is not listed: off).
  'shared-62-DoCqVpIq.js': { Dl: { name: 'useUnifiedPluginsUi', local: 'bP', features: [loose('return Fr(yP);')], also: { yP: ['yP = "__gb__2406162393"'] } } },
  // shared-33 Nv (exported ou): `C(Tv)?.pageLayout === !0`. Customize lives in the classic settings dialog here
  // (pageLayout false), so a row's icon tile is "bg-fill-control" and the rail card fill "bg-surface-1".
  'shared-33-DtdykY0y.js': { ou: { name: 'usePageLayout', local: 'Nv', features: [loose('return C(Tv)?.pageLayout === !0;')] } },
};

// Semantic export names of carried declarations (`file#local`). The React Compiler helpers keep the names
// official.compilerHelpers proves them by.
const semanticNames = {
  'shared-19-UalAfDtn.js#Vg': 'OVERVIEW_HEADING_LEADING',
  'shared-19-UalAfDtn.js#rv': 'OverviewCard',
  'cae01a6fc-t1NhdR7u.js#ae': 'OverviewConnectorRow',
  'shared-62-DoCqVpIq.js#fN': 'linkifyText',
  'shared-0-CnnWnVrT.js#Tl': 'lazyValue',
  ...Object.fromEntries(Object.values(official.compilerHelpers).map(h => [`${official.sharedFrame}#${h.local}`, h.name])),
};

// Module-level Sets / Maps this graph owns (D46: state stays with one owner; none of these is held by cds-core or any
// other generated graph, and each is either a frozen lookup the code only reads or a pure memo). shared-62 oL and shared-0 SI
// left this list in cds-core wave 5: cds-core holds and publishes them (sanitizeTextKeptChars, semverSatisfiesCache; SI
// is read by more than one graph), so they are imported from there. shared-62 MM / NM and shared-0 eee / rn / tn / Jr / mn /
// kn / hn (the host / path / query-key Sets the link check reads) left it in cds-core wave 5b for the same reason (other
// 4.16336.0 graphs cut them too, e.g. staging mcp-app-card-v4; cds-core publishes them).
const ownedState = {
  'c79fa23ba-Cua_bx3X.js#_': 'read-only Set of first-party docs hosts the linkifier keeps as links',
};

// Emitted in this order. `exports` maps original local binding -> exported name; its keys are the roots, each pinned by
// `features` (stable strings, or {loose} where the text names minified bindings) to the only top-level declaration of
// its chunk carrying them all. `carry`: the module of its chunk that takes in declarations other modules reach.
const modules = [
  { target: 'text-sanitize.mjs', source: 'shared-62-DoCqVpIq.js', exports: { lL: 'sanitizeMultilineText', sL: 'sanitizeText' },
    features: {
      lL: [loose('return e.split(/\\r?\\n/).map(cL).join(`\n`);')],
      sL: [loose('return e.replace(aL(), (e) => (oL.has(e) ? e : ""));')],
    },
    pins: {
      cL: [loose('return e.replace(aL(), (e) => (e === "\t" || oL.has(e) ? e : ""));')],
      aL: [loose('aL = q(() => /[\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}\\p{Cs}\\p{DI}\\u2028\\u2029]/gu)')],
      oL: ['new Set(["\\u200C", "\\u200D", "\\uFE0E", "\\uFE0F"])'],
    } },
  { target: 'overview-layout.mjs', source: 'shared-19-UalAfDtn.js', carry: true, exports: { iv: 'PluginOverviewLayout', av: 'OverviewRailCard' },
    features: {
      iv: ['className: "flex flex-col gap-lg px-xl md:flex-row",', 'className: "flex w-full shrink-0 flex-col gap-md md:w-60",',
        'className: "flex w-full flex-col gap-md @[900px]:w-72 @[900px]:shrink-0",', 'className: "flex min-w-0 flex-1 flex-col gap-lg",',
        loose('let e = o === !1 && "px-md md:px-xl",'), loose('h("@container", e)'), loose('v("div", { className: yg, children: [i, a] })')],
      av: [loose('n = Vp() ? "bg-surface-0" : "bg-surface-1";'), loose('g(rv, { backgroundClassName: n, className: "gap-md", children: t })')],
    },
    pins: {
      rv: [loose('h("after:shadow-none", e.className)'), loose('g(te, { ...e, className: t })')],
      yg: ['"flex flex-col gap-12 @[900px]:flex-row @[900px]:items-start @[900px]:gap-xl"'],
      Vg: ['Vg = "leading-[1.65rem]"'],
    } },
  { target: 'overview-sections.mjs', source: 'cae01a6fc-t1NhdR7u.js', carry: true,
    exports: { U: 'OverviewSectionHeading', W: 'OverviewDescription', X: 'OverviewRow', J: 'OverviewRailGroup', ie: 'OverviewConnectorsAndTools' },
    features: {
      U: [loose('p() === !0'), '? "text-heading-semibold text-primary"', '? "text-title text-primary"', ': "text-caption text-secondary";',
        loose('t("h3", { id: i, className: o, children: n })')],
      W: ['if (!i) return null;', loose('let n = h(i);'), '(u = "flex flex-col gap-sm")', 'o === !1 &&', 'defaultMessage: "Description",', 'id: "Q8Qw5BZ1VA",',
        '(s = "auto")', loose('e("whitespace-pre-wrap break-words text-primary", r)'), loose('let r = o ? `text-heading ${v}` : "text-body";'),
        loose('(l = z(n))'), loose('t("p", { dir: s, className: c, children: l })')],
      X: [loose('y = x(),'), loose('b = C(),'), 'className: "text-muted-as-secondary",', 'children: [" \\u00B7 ", d],',
        loose('T = b ? "bg-alpha-2" : "bg-fill-control",'), '"flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-chip text-secondary",',
        loose('typeof s == "string" ? t(l, { name: s, size: "xs" }) : s'), 'className: "min-w-0 flex-1 text-footnote text-secondary",',
        loose('t(a, { size: b ? void 0 : "xs", content: f, "aria-label": p?.(y) })'), loose('if (g === void 0 && !h) {'),
        loose('e("flex gap-xs", M)'), 'variant: "ghost",', 'size: "xs",', 'flush: "both",', 'className: "w-full justify-start",', loose('onClick: h,'),
        'className: "max-w-full justify-start",', 'icon: "CaretRight",', 'iconPosition: "end",'],
      J: ['className: "flex flex-col gap-xs pt-md first:pt-0",', loose('children: [a, i],'), loose('t(U, { children: r })')],
      ie: ['if (n.length === 0) return null;', 'defaultMessage: "Connectors & tools", id: "mEdG/OmTPo"', loose('n.map(ae)'), loose('t(J, { title: r, children: i })')],
    },
    pins: { ae: [loose('let { key: n, ...r } = e;'), loose('return t(X, { ...r }, n);')] } },
  { target: 'linkify.mjs', source: 'c79fa23ba-Cua_bx3X.js', carry: true, exports: { h: 'linkifyDescription' },
    features: { h: [loose('return l(e, { renderLink: b });')] },
    pins: {
      b: [loose('if (y(n)) return r ?? t;'), loose('let a = u(s(t));'), 'external: !0,', 'rel: "noopener noreferrer",', 'dir: "ltr",',
        loose('onClick: m,'), loose('onAuxClick: m,'), loose('onDragStart: p,')],
    } },
  { target: 'link-text.mjs', source: 'shared-62-DoCqVpIq.js', carry: true, exports: {} },
  { target: 'url-safety.mjs', source: 'shared-0-CnnWnVrT.js', carry: true, exports: {},
    pins: { Tl: ['return () => ((n ||= ((t = e()), !0)), t);'] } },
  { target: 'external-link.mjs', source: 'c4acc1503-BXsdaWDM.js', carry: true, exports: {} },
  { target: 'preload-helper.mjs', source: 'preload-helper-BBljBeZo.js', carry: true, exports: {} },
  { target: 'shared-frame.mjs', source: official.sharedFrame, carry: true, exports: {} },
];

// Identifiers a generated module may read without importing or declaring them: JavaScript and browser globals only.
const allowedGlobals = ['Array', 'Boolean', 'Error', 'JSON', 'Map', 'Math', 'Number', 'Object', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError',
  'URL', 'URLSearchParams', 'WeakMap', 'WeakSet', 'arguments', 'decodeURIComponent', 'encodeURIComponent', 'globalThis', 'navigator', 'undefined', 'window',
  'document', 'Infinity', 'NaN', 'isNaN', 'parseInt', 'parseFloat', 'Promise', 'console', 'location', 'Reflect', 'Date', 'TextDecoder', 'Uint8Array', 'decodeURI'];

const callSites = [
  { source: 'c24c8737b-CApeZDrg.js', binding: 'pu', role: 'Plugin page: the tab list (Overview first and unconditional, Tool permissions only for a non-empty resolved list, Contents for a backend plugin, the content tabs with their counts, then Settings only for an added plugin whose options query answers), Overview as the initial and fallback tab, and its panel (c12456454 r = oo with onOpenConnectors only when the Connectors tab exists)',
    features: [
      'hostToolPermissionsServers: xe,', loose('() => At(z) ?? "overview"'), loose('Sn = xn !== "loading" && xn.length > 0,'),
      loose('t = [{ id: "overview", href: B("overview"), label: e }];'), 'defaultMessage: "Overview", id: "9uOFF3L8kp"',
      loose('if (Sn === !0) {'), loose('K0($, 101, i(Fl, {}))'), loose('t.push({ id: "permissions", href: B("permissions"), label: e });'),
      'id: "contents",', loose('if (Lt.length > 0) {'), loose('t.push({ id: "skills", href: B("skills"), label: e, count: Lt.length });'),
      loose('if (Rt.length > 0) {'), 'id: "commands",', loose('count: Rt.length,'), loose('if (an) {'), 'id: "connectors",', loose('count: rn > 0 ? rn : void 0,'),
      loose('if (Wt > 0 || Xt) {'), 'id: "hooks",', loose('if (Zt.length > 0 || Qt) {'), 'id: "monitors",', loose('if (en.length > 0) {'), 'id: "language-servers",',
      loose('if (nn.length > 0) {'), loose('t.push({ id: "agents", href: B("agents"), label: e, count: nn.length });'),
      // Settings: the options query (shared-123 h4) asked only for an added plugin (`tt = E && !Xe`).
      loose('tt = E && !Xe,'), loose('{ data: An, isLoading: jn } = be(kn, tt),'), loose('Nn = tt ? An : void 0,'), loose('if (Nn) {'),
      loose('i(El, { options: Nn })'), loose('t.push({ id: "settings", href: B("settings"), label: e });'),
      loose('(Pn = Ht(Yc(t, Me), Tn))'), loose('Fn.some((e) => e.id === Pe) ? Pe : "overview"'), loose('xr = J1($, 152, Ie) ? K1($, 152, Ie, () => Ie("connectors")) : $[153],'),
      loose('In === "overview" &&'), loose('i(oo, {'), loose('onOpenConnectors: Fn.some(mu) ? xr : void 0,'),
      loose('In === "permissions" &&'), loose('i(jl, { connectors: xn, connectorPageStyle: W })'),
      loose('In === "settings" &&'), loose('i(Dl, { pluginId: kn, options: Nn, connectorPageStyle: W }, kn)'),
    ] },
  { source: 'c24c8737b-CApeZDrg.js', binding: 'el', role: 'Tool permissions servers: the host servers only with the unified plugins UI; otherwise the listed servers, enabled only with that UI too',
    features: [loose('return e === !0 && n !== void 0 && n.length > 0'), loose('? { servers: n, serversSettled: !0, enabled: !0, hostConnector: r }'),
      loose('enabled: e === !0 && (t === !0 || r !== void 0),')] },
  { source: 'c24c8737b-CApeZDrg.js', binding: 'Fl', role: 'Tool permissions tab label', features: ['defaultMessage: "Tool permissions", id: "xq9OFmeici"'] },
  { source: 'c24c8737b-CApeZDrg.js', binding: 'Yc', role: 'A plugin blocked by the sales cloud access check keeps only Overview, Tool permissions and Connectors (Jc)',
    features: [loose('return t ? e.filter((e) => Jc.some((t) => t === e.id)) : e;')] },
  { source: 'c24c8737b-CApeZDrg.js', binding: 'Jc', role: 'The tabs a sales-cloud-blocked plugin keeps', features: ['["overview", "permissions", "connectors"]'] },
  { source: 'c24c8737b-CApeZDrg.js', binding: 'mu', role: 'Overview opens Connectors only when that tab exists', features: ['return e.id === "connectors";'] },
  { source: 'shared-123-1Hc1RTKl.js', binding: 'h4', role: 'The plugin options query (Settings tab data) is enabled only when asked and the bridge has getPluginOptions; the host answers it from electron/plugin-options.cjs (src/source-plugin-settings-tab.jsx usePluginOptions)',
    features: [loose('let a = t && n && !!z?.getPluginOptions,'), loose('enabled: a,')] },
  { source: 'shared-18-Cfqwgjc5.js', binding: '$b', role: 'Ht(…, Tn): the tab list is unchanged unless the unified UI and the connector page style both hold',
    features: ['if (t === !1) return e;', loose('return n.length < 2 ? [] : n;')] },
  { source: 'shared-18-Cfqwgjc5.js', binding: 'ex', role: 'Tn = Gt(Y, W): the Overview lists parts only with the unified UI and the connector page style', features: ['return e === !0 && t === !0;'] },
  { source: 'c76f00e40-CUxmQzhc.js', binding: 'li', role: 'The only caller that passes hostToolPermissionsServers: the directory connector record shown as a plugin page',
    features: ['connectorPageStyle: !0,', loose('hostDirectoryPlugin: r,'), loose('hostToolPermissionsServers: x,')] },
  { source: 'c12456454-DBorkKpY.js', binding: 'oo', role: 'Overview: org usage, what’s new, the Description (W over lo), categories, Try it; the rail lists Connectors & tools (re rows) in the classic layout; the Contents list and sections need the connector page style',
    features: [
      loose('re = io(t, te?.examplePrompts),'), loose('ie = o === null ? (E?.getConnectorIdentity ?? Dr) : void 0,'), loose('B = Yt(p, ae),'),
      loose('o !== null && t.provenance.source === "shared"'), loose('? n(qt, { credit: s })'), loose('U = V === !0 && N === !0,'),
      loose('pe = U === !1 && (oe !== null || B.length > 0),'), loose('n(Jt, { categories: me(t), connectorPageStyle: N })'), loose('n(Er, {'),
      loose('slashCommand: p?.skills.some(P) ? `/${t.name}` : void 0,'),
      loose('Y === !1 &&'), loose('description: lo({'), loose('N === !0 &&\n            E === void 0 &&\n            T !== void 0 &&'),
      loose(': pe === !0\n                ? r(Me, { children: [oe, B.length > 0 && n(Wt, { rows: B })] })'),
      loose('n(Ne, { connectorPageStyle: N, main: He, rail: Q, embedded: F })'),
    ] },
  { source: 'c12456454-DBorkKpY.js', binding: 'Er', role: 'Try it: nothing without prompts; the “…or type {command} in any chat.” line lives inside it',
    features: ['if (t.length === 0) return null;', 'defaultMessage: "Try it", id: "g3Yfya3FKa"', 'className: "text-footnote text-muted-as-secondary",',
      'defaultMessage: "\\u2026or type {command} in any chat.",'] },
  { source: 'c12456454-DBorkKpY.js', binding: 'no', role: 'Try it prompts: the curated catalog’s suggested prompts, for default-catalog plugins only',
    features: [')?.suggested_prompts;', loose('e.provenance.source === "default" && r ? r.map(ro) : to,')] },
  { source: 'c12456454-DBorkKpY.js', binding: 'ro', role: 'A curated prompt', features: ['return { ...e, origin: "curated" };'] },
  { source: 'c12456454-DBorkKpY.js', binding: 'io', role: 'Try it prompts: a directory listing’s example prompts win over the curated ones',
    features: [loose('t === void 0 || t.length === 0 ? n : t.map(ao)')] },
  { source: 'c12456454-DBorkKpY.js', binding: 'ao', role: 'A directory listing prompt', features: ['return { prompt: e.prompt, origin: "directory_listing" };'] },
  { source: 'c12456454-DBorkKpY.js', binding: 'lo', role: 'Description: the item’s own description without a directory listing or signed-in record',
    features: [loose('return t === null || t === "loading" ? n === void 0 || n.summary.trim() === "" ? e.description : n.summary : t.oneLiner;')] },
  { source: 'cae01a6fc-t1NhdR7u.js', binding: 're', role: 'Connectors & tools rows hook: without getIdentity the listed servers query resolves each server, then ne',
    features: [loose('i = (e?.mcpServers.length ?? 0) > 0 && r === void 0,'), loose('ne(u, o, n, l, r)')] },
  { source: 'cae01a6fc-t1NhdR7u.js', binding: 'ne', role: 'Connectors & tools rows: reach rows (remote_privileged reads as remote plus the privileged row), one row per MCP server (display name, the server name as the note when it differs, opens Connectors), CLI components',
    features: [loose('if (e.reach) {'), loose('let t = e.reach === "remote_privileged",'), loose('e.mcpServers.forEach((s, c) => {'), loose('d = g(s.name);'), 'key: `mcp:${c}:${s.name}`,',
      loose('icon: t(R, { server: l, size: Q, glyphSize: 12 }),'), loose('label: u,'), loose('note: u === d ? void 0 : d,'), loose('onClick: r,'), loose('e.type === "cli" &&')] },
  { source: 'cd14a8022-DP8PKode.js', binding: 'a', role: 'A server’s display name: the directory / sync-source / connector name, else its own name (sanitized, shared-62 gc = sL)',
    features: ['e.directoryServer?.name ??', 'e.connector?.name ??', 'e.name,'] },
  { source: 'cd85e132d-RVI9Vb9v.js', binding: 'd', role: 'A server without an icon falls back to the connector kind glyph at the glyph size',
    features: [loose('e(c, { item: { kind: "connector" }, size: n })')] },
  { source: 'c28f9f509-upcFCkwG.js', binding: 'u', role: 'The kind glyph: CDS Icon at customSize, text-muted-as-secondary',
    features: [loose('e(t, {\n            name: s,\n            customSize: i,\n            className: "text-muted-as-secondary",\n          })')] },
  { source: 'c28f9f509-upcFCkwG.js', binding: 'h', role: 'Kind glyphs', features: ['connector: "Connectors"'] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  if (official.sourceHashes[name]) official.assertPinnedSource(name, code);
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
// The prettier form of one declaration, which features are matched against.
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk (the declaration parsed on its own).
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
const featureMissing = (text, features = []) => {
  const flat = normalised(text);
  return features.filter(f => (typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !looseFeature(f.loose).test(text)));
};
function assertFeatures(label, text, features = []) {
  const missing = featureMissing(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// A root is the only top-level declaration of its chunk that carries every one of its features.
async function assertUniqueRoot(label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const [other, entry] of src.top) {
    if (entry.kind === 'import') continue;
    const raw = declarationText(src, entry);
    // Cheap prefilter: every double-quoted literal of a feature must occur in the raw text; the prettier form decides.
    const literals = features.flatMap(f => (typeof f === 'string' ? f : f.loose).match(/"(?:[^"\\\n]|\\.)*"/g) ?? []);
    if (literals.some(l => !raw.includes(l))) continue;
    if (!featureMissing(await featureText(src, entry), features).length) hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
function vendorImport(file, alias, src) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(src.code, alias);
  return { from: module, name: member };
}

// sharedGraph 'cds-core' (the runSlicer contract): the manifest is on this version and snapshot, every module's bytes
// equal its recorded sha256 and its sourceSha256 the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName. `held` maps every binding it slices to its declaration hash.
async function sharedGraph() {
  const dir = path.join(generatedRoot, sharedGraphArea);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${sharedGraphArea} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  if (manifest.referenceSnapshot !== referenceSnapshot) throw Error(`${sharedGraphArea} snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) throw Error(`${sharedGraphArea}/${m.target} is ${m.referenceVersion}, expected ${referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${sharedGraphArea}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(source, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${sharedGraphArea}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${sharedGraphArea} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { manifestSha256: sha(manifestBytes), held, published, modules: byTarget };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46).
function isModuleState(src, entry) {
  if (entry.kind !== 'var') return false;
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && callee.file === official.vendorFrame && official.reactAliases[callee.alias]?.[1] === 'createContext') return true;
  }
  return false;
}

export async function extractR4ePlugin({ check = false, explore = false } = {}) {
  const cache = new Map();
  const read = name => readSource(name, cache);
  const shared = await sharedGraph();
  const exportsOf = new Map(modules.map(spec => [spec.target, { ...spec.exports }]));
  const owner = new Map();          // `${chunk}#${local}` -> the module that slices it (first claim; roots claimed up front)
  const stateConflicts = [], unresolved = [];
  for (const spec of modules) for (const local of Object.keys(spec.exports)) {
    const key = `${spec.source}#${local}`;
    if (owner.has(key)) throw Error(`${spec.target}: root ${key} is already a root of ${owner.get(key)}`);
    owner.set(key, spec.target);
    // A root cds-core publishes is its CDS name: the area imports it, never slices its own copy.
    if (shared.published.has(key)) throw Error(`${spec.target}: root ${key} is ${sharedGraphArea}'s public ${shared.published.get(key).name}; import it instead`);
  }
  const carryOf = file => {
    const own = modules.filter(m => m.source === file);
    return own.find(m => m.carry) ?? (own.length === 1 ? own[0] : null);
  };
  const exportFrom = (target, file, local, state) => {
    const names = exportsOf.get(target);
    if (!Object.hasOwn(names, local)) { names[local] = semanticNames[`${file}#${local}`] ?? local; state.changed = true; }
    return names[local];
  };
  let helpersProved = false;
  const sliceModule = async (spec, state) => {
    const src = await read(spec.source);
    const selected = new Map(), imports = new Map(), seen = new Set(), heldCopies = new Set(), owned = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const { file, alias } = entry, via = `${file}:${alias}`;
        const dep = await read(file);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const adapter = adapters[file]?.[alias];
        if (adapter) {
          if (adapter.local !== local) throw Error(`${spec.target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
          const original = dep.top.get(local);
          if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration`);
          assertFeatures(`${spec.target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features);
          for (const [other, features] of Object.entries(adapter.also ?? {})) {
            const also = dep.top.get(other);
            if (!also || also.kind === 'import') throw Error(`${spec.target}: adapter ${via} pins ${other}, which is not a declaration of ${file}`);
            assertFeatures(`${spec.target}: adapter ${via} (${other})`, await featureText(dep, also), features);
          }
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local, replacedSha256: sha(declarationText(dep, original)) });
          return;
        }
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { ...react, via, kind: 'react' }); return; }
        const sharedName = shared.published.get(`${file}#${local}`);
        if (sharedName) {
          const held = shared.held.get(`${file}#${local}`);
          const original = dep.top.get(local);
          if (!held?.sha256 || !original || original.kind === 'import' || held.sha256 !== sha(declarationText(dep, original)))
            throw Error(`${spec.target}: ${file}#${local} differs from the declaration ${sharedGraphArea} publishes as ${sharedName.name}`);
          imports.set(name, { from: `../${sharedGraphArea}/${sharedName.target}`, name: sharedName.exportName, via, kind: 'shared-graph', original: local, linkedSha256: held.sha256 });
          return;
        }
        // A declaration of another chunk: the module that already slices it, else that chunk's carry module.
        const key = `${file}#${local}`;
        let target = owner.get(key);
        if (!target) {
          const carry = carryOf(file);
          if (!carry) {
            if (explore) { unresolved.push(`${spec.target}: ${via} (${local})`); return; }
            throw Error(`${spec.target}: unresolved import ${via} (${local}): list ${file} in modules`);
          }
          target = carry.target;
          owner.set(key, target);
          state.changed = true;
        }
        imports.set(name, { from: `./${target}`, name: exportFrom(target, file, local, state), via, kind: 'generated', original: local });
        return;
      }
      // A same-chunk declaration cds-core publishes (a root never is: refused above) is imported from it, never copied
      // (D1 / cds-core wave 5: e.g. shared-62 oL sanitizeTextKeptChars), exactly as for another chunk's declaration.
      const key = `${spec.source}#${name}`;
      const sameChunkShared = shared.published.get(key);
      if (sameChunkShared) {
        const held = shared.held.get(key);
        if (!held?.sha256 || held.sha256 !== sha(declarationText(src, entry)))
          throw Error(`${spec.target}: ${key} differs from the declaration ${sharedGraphArea} publishes as ${sameChunkShared.name}`);
        imports.set(name, { from: `../${sharedGraphArea}/${sameChunkShared.target}`, name: sameChunkShared.exportName, via: `${spec.source}#${name}`, kind: 'shared-graph', original: name, linkedSha256: held.sha256 });
        return;
      }
      // A same-chunk declaration another module already slices: import it from there (one copy per binding).
      const claimed = owner.get(key);
      if (claimed && claimed !== spec.target) {
        imports.set(name, { from: `./${claimed}`, name: exportFrom(claimed, spec.source, name, state), via: `${spec.source}:${name}`, kind: 'generated', original: name });
        return;
      }
      if (!claimed) owner.set(key, spec.target);
      if (entry.kind !== 'function' && entry.kind !== 'var' && entry.kind !== 'class') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      const held = shared.held.get(key);
      if (isModuleState(src, entry)) {
        // D46: module state stays with one owner. State cds-core holds is never copied; state it does not hold is this
        // area's own only with a reason (ownedState).
        if (held) {
          stateConflicts.push({ binding: key, text: text.slice(0, 200), reachedBy: spec.target, heldBy: `${sharedGraphArea}/${held.target}` });
          if (!explore) throw Error(`${spec.target}: module state ${key} is held by ${sharedGraphArea} without a semantic name (add it to its publicNames, D46)`);
        } else if (!Object.hasOwn(ownedState, key)) {
          if (!explore) throw Error(`${spec.target}: module state ${key} is not in ownedState (justify the owner)`);
          unresolved.push(`STATE ${key}`);
        }
        owned.add(name);
      }
      if (held) {
        // A pure binding cds-core holds without a public name is sliced again only as the very declaration it holds.
        if (!held.sha256 || held.sha256 !== sha(text)) throw Error(`${spec.target}: ${key} differs from the declaration ${sharedGraphArea}/${held.target} holds`);
        heldCopies.add(name);
      }
      if (spec.source === official.sharedFrame && !helpersProved) { official.assertCompilerHelpers(src.code); helpersProved = true; }
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
    };
    for (const name of Object.keys(exportsOf.get(spec.target))) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (Object.hasOwn(spec.exports, name)) {
        if (![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        if (!state.uniqueChecked.has(`${spec.source}#${name}`)) {
          await assertUniqueRoot(spec.target, src, name, spec.features?.[name]);
          state.uniqueChecked.add(`${spec.source}#${name}`);
        }
      }
      await add(name);
    }
    return { spec, src, selected, imports, heldCopies, owned };
  };
  // Passes until no declaration is carried in or exported anew.
  let sliced;
  const uniqueChecked = new Set();
  for (let pass = 0; ; pass++) {
    if (pass > 20) throw Error('R4e plugin: the carried closure does not settle');
    const state = { changed: false, uniqueChecked };
    sliced = [];
    for (const spec of modules) sliced.push(await sliceModule(spec, state));
    if (!state.changed) break;
  }
  if (explore) {
    console.log(`EXPLORE unresolved:\n  ${[...new Set(unresolved)].join('\n  ') || '(none)'}`);
    console.log(`EXPLORE stateConflicts: ${JSON.stringify(stateConflicts, null, 2)}`);
    for (const m of sliced) console.log(`EXPLORE ${m.spec.target}: ${m.selected.size} bindings, exports ${Object.keys(exportsOf.get(m.spec.target)).length}, held copies ${[...m.heldCopies].join(' ') || '-'}, owned state ${[...m.owned].join(' ') || '-'}`);
    return { stateConflicts, unresolved };
  }
  // Pinned bindings of each module's closure carry their original text (a pinned same-chunk binding cds-core publishes is
  // imported from it, its held declaration hash already checked: its original declaration still carries the features).
  for (const { spec, src, selected, imports } of sliced) for (const [name, features] of Object.entries(spec.pins ?? {})) {
    const linked = imports.get(name);
    const entry = selected.get(name) ?? (linked?.kind === 'shared-graph' && linked.via === `${spec.source}#${name}` ? src.top.get(name) : undefined);
    if (!entry) throw Error(`${spec.target}: pinned binding ${name} is not in its closure`);
    assertFeatures(`${spec.target}: ${name}`, await featureText(src, entry), features);
  }
  const unused = sliced.filter(m => m.selected.size === 0).map(m => m.spec.target);
  if (unused.length) throw Error(`R4e plugin: modules nothing reaches: ${unused.join(', ')}`);
  // Every ownedState entry is reached (a stale reason fails generation).
  const reachedState = new Set(sliced.flatMap(m => [...m.owned].map(n => `${m.spec.source}#${n}`)));
  const staleState = Object.keys(ownedState).filter(key => !reachedState.has(key));
  if (staleState.length) throw Error(`R4e plugin: ownedState lists bindings nothing reaches: ${staleState.join(', ')}`);
  // ES module cycles between generated modules would leave a declaration in its temporal dead zone: none allowed.
  const edges = new Map(sliced.map(m => [m.spec.target, [...new Set([...m.imports.values()].filter(e => e.kind === 'generated').map(e => e.from.slice(2)))]]));
  const visiting = new Set(), done = new Set();
  const walk = (node, trail) => {
    if (done.has(node)) return;
    if (visiting.has(node)) throw Error(`R4e plugin: generated modules import in a cycle: ${[...trail, node].join(' -> ')}`);
    visiting.add(node);
    for (const next of edges.get(node) ?? []) walk(next, [...trail, node]);
    visiting.delete(node); done.add(node);
  };
  for (const node of edges.keys()) walk(node, []);

  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-r4e-plugin.mjs', adapterModule: 'src/source-r4e-plugin-adapters.jsx',
    sharedGraph: sharedGraphArea, modules: [], callSites: [],
  };
  const files = {}, sharedUsed = new Set();
  for (const { spec, src, selected, imports, heldCopies, owned } of sliced) {
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
      if (entry.kind === 'shared-graph') sharedUsed.add(path.basename(entry.from));
    }
    const exports = exportsOf.get(spec.target);
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-r4e-plugin.mjs.\n// Edit the extractor or src/source-r4e-plugin-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${order.map(([, entry]) => emittedText(src, entry)).join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported, declared in it, or a JavaScript / browser global.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.includes(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind,
        ...(e.original ? { original: e.original } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports, heldByCdsCore: [...heldCopies].sort(), ownedState: [...owned].sort(),
    });
  }
  // The cds-core modules imported, by their manifest bytes (a regenerated cds-core must be re-checked here).
  manifest.sharedGraphModules = Object.fromEntries([...sharedUsed].sort().map(target => [target, shared.modules.get(target).sha256]));
  manifest.ownedStateReasons = ownedState;
  for (const site of callSites) {
    const src = await read(site.source);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`R4e plugin output set changed: ${present.join(',')}. Run scripts/extract-r4e-plugin.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`R4e plugin source mismatch: ${name}. Run scripts/extract-r4e-plugin.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} plugin Overview modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites; ${sharedGraphArea} ${shared.manifestSha256.slice(0, 8)}).`);
  return manifest;
}

export const r4ePluginModules = Object.freeze(modules.map(m => m.target));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractR4ePlugin({ check: process.argv.includes('--check'), explore: process.argv.includes('--explore') });
