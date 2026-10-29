// R4e-plugin (settings-14): extract the 3.6556.2 plugin page Overview parts without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/r4e-plugin, own scripts/verify-gen-r4e-plugin.mjs).
//
//   overview-sections.mjs  cae01a6fc G / K / X / Y / oe (2.42304.0 U / W / X / J / se): the section heading (classic
//                          "text-caption text-secondary" outside the unified plugins UI), the Description section
//                          (sanitized, dir=auto, "whitespace-pre-wrap break-words text-primary text-body"), a rail row
//                          (size-5 icon tile, OverflowTooltip label with " · note" in text-muted-as-secondary (menus
//                          C7), ghost xs flush-both Button when it opens something), the rail group (h3 + rows,
//                          "pt-md first:pt-0") and the "Connectors & tools" group.
//   overview-layout.mjs    shared-19 w_ (exported ms): the Overview main + rail layout ("flex flex-col gap-lg px-xl
//                          md:flex-row", rail aside "md:w-60"); T_ (exported hs) / C_: the rail card (CDS Card, fill
//                          bg-surface-1 outside pageLayout, gap-md, no ring); Eg is K's heading leading for the
//                          connector page style.
//   text-sanitize.mjs      shared-52 rJ / tJ (exported S / x): strip control, format, private-use and unassigned code
//                          points (keeping ZWNJ, ZWJ, VS15, VS16 and, per line, tabs) — K's description and ie's note.
//   lazy-value.mjs         shared-0 Pa (exported Lb): the lazy one-shot value $q's pattern is built with.
//   clsx.mjs               vendor-frame ve / _e (exported Ba): clsx, which K, X and C_ join their classes with.
//
// 3.6556.2 is React Compiler output: every component reads the compiler's memo cache (shared-frame J9 = vendor-frame
// `Oo`, react/compiler-runtime `c`) and the J/K/I/Z slot helpers. Those are imported from the view-tabs graph by their
// E3 semantic names (official.compilerHelpers; never sliced a second time), checked with official.assertCompilerHelpers.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source; each module is
// the reachable closure of its roots (Babel scope analysis), so a renamed or re-pointed minified import fails
// generation instead of binding the wrong value. An import resolves, in this order, to: a named host adapter in
// src/source-r4e-plugin-adapters.jsx (feature-checked against the original it replaces), a verified React export of
// vendor-frame (official.assertVendorAlias), a compiler helper of the view-tabs graph, or another module generated
// here. The CDS primitives the Overview parts draw (Button, Icon, OverflowTooltip, InfoTip, Card) are named adapters that
// re-export the view-tabs components themselves (CdsButton, CdsIcon, CdsOverflowTooltip, CdsInfoTooltip, CdsCard; w10
// notdone 44), each feature-checked against the shared-frame original.
// `callSites` pin the original text the host follows but cannot import: c24c8737b ol's tab list (Overview first and
// unconditional, Tool permissions only when the resolved servers are non-empty, then the content tabs, and since
// 3.6556.2 a Settings tab for the plugin's userConfig, menus N2), Ys (those servers need the unified plugins UI),
// c12456454 ya (what the Overview draws) and its closed branches (Try it cr, curated / directory prompts ha / _a), and
// cae01a6fc ie (the Connectors & tools rows).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { routinesSharedLink } from './routines-shared-compat.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/r4e-plugin');
const adapterModule = '../../source-r4e-plugin-adapters.jsx';
const viewTabsModule = `../view-tabs/${official.sharedFrame}`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked with official.assertVendorAlias (R3: in 3.6556.2 `Ha` is jsx,
// `Ua` jsxs, `Va` the jsx-runtime Fragment and `Ya` react's Fragment).
const vendor = {
  [official.vendorFrame]: Object.fromEntries(['Ha', 'Ua', 'Va', 'Ya'].map(alias => [alias, official.reactAliases[alias]])),
};
// Host dependencies. `features` must appear in the same-chunk closure of the original binding the adapter replaces.
const adapters = {
  [official.vendorIntl]: {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
  },
  // shared-52 QL: the unified plugins UI is GrowthBook __gb__2406162393 (closed on the host).
  'shared-52-uHFNjl7C.js': {
    uo: { name: 'useUnifiedPluginsUi', features: ['"__gb__2406162393"'] },
  },
  // shared-5 Qg: the pageLayout context (Customize is the classic settings dialog here).
  'shared-5-Bg6ZMqvt.js': {
    xc: { name: 'usePageLayout', features: ['?.pageLayout === !0'] },
  },
  // c79fa23ba g / _: linkified descriptions behind GrowthBook __gb__1063785924 (closed on the host).
  'c79fa23ba-C-z2OzjO.js': {
    r: { name: 'useLinkifiedDescription', features: ['"__gb__1063785924"'] },
    t: { name: 'linkifyDescription', features: ['renderLink: S'] },
  },
  // shared-frame CDS primitives (see the header): the adapters re-export the view-tabs components themselves — Uu Button
  // (CdsButton), us Icon (CdsIcon), hh OverflowTooltip (CdsOverflowTooltip), Tk InfoTip (CdsInfoTooltip) and
  // cd = Object.assign(td, { Link, Media }) Card (CdsCard; its class strings are pinned here).
  [official.sharedFrame]: {
    Eu: { name: 'OverviewButton', features: ['iconPosition: o', 'flush: y', 'o === void 0 ? "start" : o'] },
    od: { name: 'OverviewIcon', features: ['"data-cds": "Icon",', '"data-cds-mirror"'] },
    Gl: { name: 'OverviewOverflowText', features: ['"data-cds": "OverflowTooltip",', '"block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap",'] },
    la: { name: 'OverviewInfoTip', features: ['"data-cds": "InfoTip"', 'openOnHover: !0'] },
    Tu: { name: 'OverviewCard', features: [
      'cd = Object.assign(td, { Link: rd, Media: sd })', '"data-cds": "Card",', 'm = n === void 0 && Zu,', 'Q(Ju, Xu, m, i)', 'Q(Qu, n)',
      'b("span", { "aria-hidden": !0, className: g })', 'b("div", { "data-cds-card-body": "", className: Yu, children: r })',
      'return e && e !== "base" ? { "data-size": e } : {};',
      'Ju =\n    "group/card relative isolate flex flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-[\'\']"',
      'Xu = "has-[[data-cds=CardLink]:focus-visible]:after:shadow-focus"',
      'Qu =\n    "cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit]"',
      'Yu =\n    "cds-card-body flex min-h-0 flex-1 flex-col self-stretch [gap:inherit] [align-items:inherit] [justify-content:inherit] rounded-[inherit] p-lg"',
      // E12/R15: the fizzy-lake `stacks:` card classes only apply without a backgroundClassName; the adapter always passes one.
      'Zu =\n    "stacks:',
    ] },
  },
};
const modules = [
  // W13 G11 (D1): Pa is routines-shared's shared-0 copy (no imports, plain node); lazy-value.mjs re-exports it.
  { target: 'lazy-value.mjs', source: 'shared-0-DDOOdL6P.js', exports: { Pa: 'lazyValue' }, routinesShared: 'shared-0-DDOOdL6P.mjs',
    features: { Pa: ['return () => ((n ||= ((t = e()), !0)), t);'] } },
  { target: 'clsx.mjs', source: official.vendorFrame, exports: { ve: 'clsx' },
    features: {
      ve: ['(e = arguments[n]) && (t = _e(e)) && (r && (r += " "), (r += t));'],
      _e: ['if (typeof e == "string" || typeof e == "number") r += e;', 'if (Array.isArray(e)) {'],
    } },
  { target: 'text-sanitize.mjs', source: 'shared-52-uHFNjl7C.js', exports: { rJ: 'sanitizeMultilineText', tJ: 'sanitizeText' },
    features: {
      rJ: ['return e.split(/\\r?\\n/).map(nJ).join(`'], tJ: ['return e.replace($q(), (e) => (eJ.has(e) ? e : ""));'],
      nJ: ['return e.replace($q(), (e) => (e === "\t" || eJ.has(e) ? e : ""));'],
      $q: ['$q = sn(() => /[\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}\\p{Cs}\\p{DI}\\u2028\\u2029]/gu)'],
      eJ: ['eJ = new Set(["\\u200C", "\\u200D", "\\uFE0E", "\\uFE0F"])'],
    } },
  { target: 'overview-layout.mjs', source: 'shared-19-DIKJVT7c.js', exports: { w_: 'PluginOverviewLayout', T_: 'OverviewRailCard', Eg: 'OVERVIEW_HEADING_LEADING' },
    features: {
      w_: ['className: "flex flex-col gap-lg px-xl md:flex-row",', 'className: "flex min-w-0 flex-1 flex-col gap-lg",',
        'className: "flex w-full shrink-0 flex-col gap-md md:w-60",', 'let e = o === !1 && "px-md md:px-xl",', 'p("@container", e)', 'className: ig,'],
      T_: ['n = Sc() ? "bg-surface-0" : "bg-surface-1";', 'h(C_, { backgroundClassName: n, className: "gap-md", children: t })'],
      C_: ['p("after:shadow-none", e.className)', 'h(q, { ...e, className: t })'],
      Eg: ['Eg = "leading-[1.65rem]"'],
    } },
  { target: 'overview-sections.mjs', source: 'cae01a6fc-CssbXTs8.js',
    exports: { G: 'OverviewSectionHeading', K: 'OverviewDescription', X: 'OverviewRow', Y: 'OverviewRailGroup', oe: 'OverviewConnectorsAndTools' },
    features: {
      G: ['m() === !0', '? "text-heading-semibold text-primary"', '? "text-title text-primary"', ': "text-caption text-secondary";', 't("h3", { id: i, className: o, children: n })'],
      K: ['s = B();', 'if (!i) return null;', 'let n = d(i);', '(f = "flex flex-col gap-sm")', 'o === !1 &&',
        'defaultMessage: "Description",', 'id: "Q8Qw5BZ1VA",', '(c = "auto")', 'e("whitespace-pre-wrap break-words text-primary", r)',
        'let r = o ? `text-heading ${w}` : "text-body";', '(u = s ? V(n) : n)', 't("p", { dir: c, className: l, children: u })'],
      X: ['x = y(),', 'S = _(),', 'className: "text-muted-as-secondary",', 'children: [" \\u00B7 ", d],', 'T = S ? "bg-alpha-2" : "bg-fill-control",',
        '"flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-chip text-secondary",',
        'typeof s == "string" ? t(l, { name: s, size: "xs" }) : s', 'className: "min-w-0 flex-1 text-footnote text-secondary",',
        't(c, { size: S ? void 0 : "xs", content: f, "aria-label": p?.(x) })', 'if (g === void 0 && !h) {', 'e("flex gap-xs", M)',
        'variant: "ghost",', 'size: "xs",', 'flush: "both",', 'className: "w-full justify-start",', 'onClick: h,'],
      Y: ['className: "flex flex-col gap-xs pt-md first:pt-0",', 'children: [a, i],', 't(G, { children: r })'],
      oe: ['if (n.length === 0) return null;', 'defaultMessage: "Connectors & tools", id: "mEdG/OmTPo"', 'n.map(se)', 't(Y, { title: r, children: i })'],
      se: ['let { key: n, ...r } = e;', 'return t(X, { ...r }, n);'],
    } },
];
const callSites = [
  { source: 'c24c8737b-Czj7X1dz.js', binding: 'ol', role: 'Plugin page: the tab list (Overview first, Tool permissions only for a non-empty resolved list, then the content tabs, then Settings only when the plugin options query answers; menus N2), Overview as the initial and fallback tab, and its panel',
    features: [
      'hostToolPermissionsServers: me,', '() => bt(ie) ?? "overview"', 'Yt = Jt !== "loading" && Jt.length > 0,',
      't = [{ id: "overview", href: se("overview"), label: e }];', 'defaultMessage: "Overview", id: "9uOFF3L8kp"',
      'if (Yt === !0) {', 'K0($, 73, i(Oc, {}))', 't.push({ id: "permissions", href: se("permissions"), label: e });',
      'id: "contents",', 'if (St.length > 0) {', 'id: "skills",', 'if (Ct.length > 0) {', 'id: "commands",', 'if (Pt) {', 'id: "connectors",',
      'if (Et > 0 || Dt) {', 'id: "hooks",', 'if (Ot.length > 0 || kt) {', 'id: "monitors",', 'if (At.length > 0) {', 'id: "language-servers",',
      'if (jt.length > 0) {', 'id: "agents",',
      // N2 (E26: closed branch): the Settings tab exists only when `en` (the plugin options) is set; Be = installed and
      // not the unified connector page, Mt = shared-130 RE (enabled only with the bridge's getPluginOptions).
      'Be = T && !Re,', '{ data: $t } = Mt(Qt, Be),', 'en = Be ? $t : void 0,', 'if (en) {', 'i(yc, { options: en })',
      't.push({ id: "settings", href: se("settings"), label: e });',
      '(tn = gt(Gs(t, Te), Zt))', 'nn.some((e) => e.id === Ee) ? Ee : "overview"', 'Gn = J1($, 124, Oe) ? K1($, 124, Oe, () => Oe("connectors")) : $[125],',
      'rn === "overview" &&', 'onOpenConnectors: nn.some(sl) ? Gn : void 0,',
      'rn === "permissions" &&', 'i(wc, { connectors: Jt, connectorPageStyle: H })',
      'rn === "settings" &&', 'i(bc, { pluginId: Qt, options: en, connectorPageStyle: H }, Qt)',
    ] },
  { source: 'c24c8737b-Czj7X1dz.js', binding: 'Ys', role: 'Tool permissions servers: the host servers only with the unified plugins UI; otherwise the listed servers, enabled only with that UI too',
    features: ['return e === !0 && n !== void 0 && n.length > 0', '? { servers: n, serversSettled: !0, enabled: !0, hostConnector: r }',
      'enabled: e === !0 && (t === !0 || r !== void 0),'] },
  { source: 'c24c8737b-Czj7X1dz.js', binding: 'Oc', role: 'Tool permissions tab label', features: ['defaultMessage: "Tool permissions", id: "xq9OFmeici"'] },
  { source: 'c24c8737b-Czj7X1dz.js', binding: 'Gs', role: 'A plugin blocked by the sales cloud access check keeps only Overview, Tool permissions and Connectors',
    features: ['return t ? e.filter((e) => Ws.some((t) => t === e.id)) : e;'] },
  { source: 'c24c8737b-Czj7X1dz.js', binding: 'sl', role: 'Overview opens Connectors only when that tab exists', features: ['return e.id === "connectors";'] },
  { source: 'shared-130-dWztbTO1.js', binding: 'RE', role: 'N2: the plugin options query (Settings tab data) is enabled only when the bridge has getPluginOptions; the host answers it from electron/plugin-options.cjs (src/source-plugin-settings-tab.jsx usePluginOptions), so the tab appears for a plugin that declares userConfig',
    features: ['let a = t && n && !!U?.getPluginOptions,', 'enabled: a,'] },
  { source: 'shared-18-D3y8YMFN.js', binding: '$v', role: 'gt(…, Zt): the tab list is unchanged unless the unified UI and the connector page style both hold',
    features: ['if (t === !1) return e;'] },
  { source: 'c76f00e40-YUpQMsTD.js', binding: 'zr', role: 'The only caller that passes hostToolPermissionsServers: the directory connector record shown as a plugin page',
    features: ['connectorPageStyle: !0,', 'hostDirectoryPlugin: t,', 'hostToolPermissionsServers: b,'] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'ya', role: 'Overview: org usage, what’s new, the Description, categories, Try it; the rail lists Connectors & tools (in the classic layout)',
    features: [
      'ie = _a(t, re?.examplePrompts),', 'z = Ht(d, oe),', 'i !== null && t.provenance.source === "shared"', '? n(Bt, { credit: s })',
      'ue = H === !0 && A === !0,', 'W = ue === !1 && (se !== null || z.length > 0),', 'n(Vt, { categories: P(t), connectorPageStyle: A })',
      'n(cr, {', 'slashCommand: d?.skills.some(xe) ? `/${t.name}` : void 0,',
      ': W === !0\n                ? a(Ie, { children: [se, z.length > 0 && n(Lt, { rows: z })] })',
      'n(Le, { connectorPageStyle: A, main: Me, rail: Ne, embedded: j })',
    ] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'cr', role: 'Try it: nothing without prompts; the “…or type {command} in any chat.” line lives inside it',
    features: ['if (t.length === 0) return null;', 'defaultMessage: "Try it", id: "g3Yfya3FKa"', 'className: "text-footnote text-muted-as-secondary",',
      'defaultMessage: "\\u2026or type {command} in any chat.",'] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'ha', role: 'Try it prompts: the curated catalog’s suggested prompts, for default-catalog plugins only',
    features: [')?.suggested_prompts;', 'e.provenance.source === "default" && r ? r.map(ga) : ma,'] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'ga', role: 'A curated prompt', features: ['return { ...e, origin: "curated" };'] },
  { source: 'c12456454-DrLqfhYF.js', binding: '_a', role: 'Try it prompts: a directory listing’s example prompts win over the curated ones',
    features: ['t === void 0 || t.length === 0 ? n : t.map(va)'] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'va', role: 'A directory listing prompt', features: ['return { prompt: e.prompt, origin: "directory_listing" };'] },
  { source: 'c12456454-DrLqfhYF.js', binding: 'Sa', role: 'Description: the item’s own description without a directory listing or signed-in record',
    features: ['return t === null || t === "loading" ? n === void 0 || n.summary.trim() === "" ? e.description : n.summary : t.oneLiner;'] },
  { source: 'cae01a6fc-CssbXTs8.js', binding: 'ie', role: 'Connectors & tools rows: reach rows (remote_privileged reads as remote plus the privileged row, menus C8), one row per MCP server (display name, the server name as the note when it differs, opens Connectors), CLI components',
    features: ['if (e.reach) {', 'let t = e.reach === "remote_privileged",', 'e.mcpServers.forEach((s, c) => {', 'd = h(s.name);', 'key: `mcp:${c}:${s.name}`,',
      'icon: t(z, { server: l, size: Q, glyphSize: 12 }),', 'label: u,', 'note: u === d ? void 0 : d,', 'onClick: r,', 'e.type === "cli" &&'] },
  { source: 'cd14a8022-D1-_IMYH.js', binding: 'a', role: 'A server’s display name: the directory / sync-source / connector name, else its own name (sanitized)',
    features: ['n.connector?.name ??', 'n.name,'] },
  { source: 'c28f9f509-DTH_B8Rb.js', binding: 'u', role: 'A server without an icon: the kind glyph (connector: Connectors) at the glyph size, text-muted-as-secondary',
    features: ['e(t, {\n            name: s,\n            customSize: i,\n            className: "text-muted-as-secondary",\n          })'] },
  { source: 'c28f9f509-DTH_B8Rb.js', binding: 'h', role: 'Kind glyphs', features: ['connector: "Connectors"'] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, ast, exported, program: null };
  cache.set(name, record);
  return record;
}
function scoped(src) {
  if (!src.program) babel.traverse(src.ast, { Program(p) { src.program = p; p.stop(); } });
  return src.program;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(scoped(src).scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
const normalised = text => text.replace(/\s+/g, ' ');
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = scoped(src).scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}
// E3: a shared-frame compiler helper is imported from view-tabs by its semantic name. The view-tabs manifest must
// publish that name for the same file/local/export, and the helper declarations are checked whole (once per run).
let compilerHelpers;
async function compilerHelperImport(file, alias, src) {
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (!helper) return null;
  compilerHelpers ??= official.assertCompilerHelpers(src.bytes.toString());
  const manifest = await viewTabsManifestFor(referenceVersion), entry = manifest.publicNames?.[helper.name];
  if (compilerHelpers[helper.name]?.local !== helper.local || entry?.file !== file || entry.local !== helper.local || entry.export !== alias)
    throw Error(`view-tabs ${helper.name} is not ${file}:${helper.local} (${JSON.stringify(entry)})`);
  return { from: viewTabsModule, name: helper.name };
}
function topLevelDeclaration(src, name) {
  const hits = [];
  for (const node of src.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push(node);
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push(declarator);
  }
  if (hits.length !== 1) throw Error(`${src.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}

export async function extractR4ePlugin({ check = false } = {}) {
  const cache = new Map();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-r4e-plugin.mjs',
    adapterModule: 'src/source-r4e-plugin-adapters.jsx', modules: [], callSites: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const program = scoped(src);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = adapters[file]?.[alias];
        if (adapter) {
          const dep = await readSource(file, cache);
          const local = dep.exported.get(alias);
          if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
          assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
          return;
        }
        const dep = await readSource(file, cache);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const helper = await compilerHelperImport(file, alias, dep);
        if (helper) { imports.set(name, { ...helper, via, kind: 'view-tabs' }); return; }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (spec.routinesShared) {
        // `routinesShared`: the root is imported from that routines-shared module (checked to be this declaration).
        assertFeatures(`${spec.target}: ${name}`, declarationText(src, binding.path), spec.features?.[name]);
        const from = await routinesSharedLink({ referenceVersion, ionSource: source, target: spec.routinesShared, source: spec.source, names: [name] });
        imports.set(name, { from, name, via: `${spec.source}:${name}`, kind: 'routines-shared' });
      } else await add(name);
    }
    // Features: every pinned binding must be in the closure and carry its original text.
    for (const [name, features] of spec.routinesShared ? [] : Object.entries(spec.features ?? {})) {
      const p = selected.get(name);
      if (!p) throw Error(`${spec.target}: pinned binding ${name} is not in the closure of ${Object.keys(spec.exports).join(',')}`);
      assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), features);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-r4e-plugin.mjs.\n// Edit the extractor or src/source-r4e-plugin-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Set', 'Array', 'arguments']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const node = topLevelDeclaration(src, site.binding);
    const text = src.code.slice(node.start, node.end);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(text), features: site.features });
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
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} plugin Overview modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR4ePlugin({ check: process.argv.includes('--check') });
