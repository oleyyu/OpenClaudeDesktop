// R4e-plugin (settings-14): extract the 2.42304.0 plugin page Overview parts without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/r4e-plugin, own scripts/verify-gen-r4e-plugin.mjs).
//
//   overview-sections.mjs  cae01a6fc U / W / X / J / se: the section heading (classic "text-caption text-secondary"
//                          outside the unified plugins UI), the Description section (sanitized, dir=auto,
//                          "whitespace-pre-wrap break-words text-primary text-body"), a rail row (size-5 icon tile,
//                          OverflowTooltip label with " · note", ghost xs flush-both Button when it opens something),
//                          the rail group (h3 + rows, "pt-md first:pt-0") and the "Connectors & tools" group.
//   overview-layout.mjs    shared-19 kD (exported Gp): the Overview main + rail layout ("flex flex-col gap-lg px-xl
//                          md:flex-row", rail aside "md:w-60"); AD (exported Kp) / OD: the rail card (CDS Card, fill
//                          bg-surface-1 outside pageLayout, gap-md, no ring); RE is W's heading leading for the
//                          connector page style.
//   text-sanitize.mjs      shared-52 jV / kV (exported C / S): strip control, format, private-use and unassigned code
//                          points (keeping ZWNJ, ZWJ, VS15, VS16 and, per line, tabs) — W's description and ae's note.
//   lazy-value.mjs         shared-0 Hi (exported Py): the lazy one-shot value jV's pattern is built with.
//   clsx.mjs               vendor-frame ge / he (exported za): clsx, which W, X and OD join their classes with.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source; each module is
// the reachable closure of its roots (Babel scope analysis), so a renamed or re-pointed minified import fails
// generation instead of binding the wrong value. An import resolves, in this order, to: a named host adapter in
// src/source-r4e-plugin-adapters.jsx (feature-checked against the original it replaces), a verified React export of
// vendor-frame, or another module generated here. The view-tabs graph is deliberately not used: its shared-frame
// module imports preload-helper, which calls document.createElement while it is evaluated, and the plugin page sits in
// the import graph of every Settings page (source-customize.jsx ← source-settings.jsx / source-hooks-settings.jsx /
// source-diff.jsx), whose SSR tests stub a document without createElement. The CDS primitives the Overview parts
// draw (Button, Icon, OverflowTooltip, InfoTip, Card) are therefore the host stand-ins the Customize page already
// uses, each feature-checked against the shared-frame original it replaces.
// `callSites` pin the original text the host follows but cannot import: c24c8737b pc's tab list Kt (Overview first and
// unconditional, Tool permissions only when the resolved servers are non-empty, then the content tabs), xs (those
// servers need the unified plugins UI), c12456454 ni (what the Overview draws, in order) and its closed branches (Try it
// gn, curated / directory prompts ei / ti), and cae01a6fc ae (the Connectors & tools rows).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/r4e-plugin');
const adapterModule = '../../source-r4e-plugin-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'], Ba: ['react/jsx-runtime', 'Fragment'],
  },
};
// Host dependencies. `features` must appear in the same-chunk closure of the original binding the adapter replaces.
const adapters = {
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
  },
  // shared-52 gk: the unified plugins UI is GrowthBook __gb__2406162393 (closed on the host).
  'shared-52-DGviI8xb.js': {
    Go: { name: 'useUnifiedPluginsUi', features: ['"__gb__2406162393"'] },
  },
  // shared-5 Jm: the pageLayout context (Customize is the classic settings dialog here).
  'shared-5-kdJVRUsT.js': {
    _s: { name: 'usePageLayout', features: ['?.pageLayout === !0'] },
  },
  // c79fa23ba g / _: linkified descriptions behind GrowthBook __gb__1063785924 (closed on the host).
  'c79fa23ba-vPN4ZRvE.js': {
    r: { name: 'useLinkifiedDescription', features: ['"__gb__1063785924"'] },
    t: { name: 'linkifyDescription', features: ['renderLink: S'] },
  },
  // shared-frame CDS primitives (host stand-ins, see the header): $l Button (host SourceSettingsButton), Jo Icon (host
  // Icon), gm OverflowTooltip (host SourceTooltip while truncated), oE InfoTip (host SourceInfoTip) and
  // yu = Object.assign(pu, { Link, Media }) Card (its class strings are pinned here; the adapter draws the same DOM).
  'shared-frame-BfjMqbuN.js': {
    cl: { name: 'OverviewButton', features: ['iconPosition: i = "start",', 'hideShortcut: u = !1,', 'flush: g = !1,'] },
    Hl: { name: 'OverviewIcon', features: ['"data-cds": "Icon",', '"data-cds-mirror"'] },
    Dc: { name: 'OverviewOverflowText', features: ['"data-cds": "OverflowTooltip",', '"block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap",'] },
    Xi: { name: 'OverviewInfoTip', features: ['"data-cds": "InfoTip"', 'openOnHover: !0'] },
    ol: { name: 'OverviewCard', features: [
      'yu = Object.assign(pu, { Link: hu, Media: vu })', '"data-cds": "Card",', '...aa(e),', 'className: X(ru, au, t),',
      'H("span", { "aria-hidden": !0, className: X(ou, n) }),', 'H("div", { "data-cds-card-body": "", className: iu, children: r }),',
      'return e && e !== "base" ? { "data-size": e } : {};',
      'ru = "group/card relative isolate flex flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-[\'\']"',
      'au = "has-[[data-cds=CardLink]:focus-visible]:after:shadow-focus"',
      'ou = "cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit]"',
      'iu = "cds-card-body flex min-h-0 flex-1 flex-col self-stretch [gap:inherit] [align-items:inherit] [justify-content:inherit] rounded-[inherit] p-lg"',
    ] },
  },
};
const modules = [
  { target: 'lazy-value.mjs', source: 'shared-0-ByI5P0CP.js', exports: { Hi: 'lazyValue' },
    features: { Hi: ['return () => ((n ||= ((t = e()), !0)), t);'] } },
  { target: 'clsx.mjs', source: 'vendor-frame-DfPJ1QmD.js', exports: { ge: 'clsx' },
    features: {
      ge: ['(e = arguments[n]) && (t = he(e)) && (r && (r += " "), (r += t));'],
      he: ['if (typeof e == "string" || typeof e == "number") r += e;', 'if (Array.isArray(e)) {'],
    } },
  { target: 'text-sanitize.mjs', source: 'shared-52-DGviI8xb.js', exports: { jV: 'sanitizeMultilineText', kV: 'sanitizeText' },
    features: {
      jV: ['return e.split(/\\r?\\n/).map(AV).join(`'], kV: ['return e.replace(DV(), (e) => (OV.has(e) ? e : ""));'],
      DV: ['DV = F(() => /[\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}\\p{Cs}\\p{DI}\\u2028\\u2029]/gu)'],
      OV: ['OV = new Set(["\\u200C", "\\u200D", "\\uFE0E", "\\uFE0F"])'],
    } },
  { target: 'overview-layout.mjs', source: 'shared-19-CkPOiIKm.js', exports: { kD: 'PluginOverviewLayout', AD: 'OverviewRailCard', RE: 'OVERVIEW_HEADING_LEADING' },
    features: {
      kD: ['className: "flex flex-col gap-lg px-xl md:flex-row",', 'className: "flex min-w-0 flex-1 flex-col gap-lg",',
        'className: "flex w-full shrink-0 flex-col gap-md md:w-60",', 'className: R("@container", r === !1 && "px-md md:px-xl"),', 'className: gE,'],
      AD: ['let t = hh();', 'backgroundClassName: t ? "bg-surface-0" : "bg-surface-1",', 'className: "gap-md",'],
      OD: ['return x(lp, { ...e, className: R("after:shadow-none", e.className) });'],
      RE: ['RE = "leading-[1.65rem]"'],
    } },
  { target: 'overview-sections.mjs', source: 'cae01a6fc-FlNR9WHF.js',
    exports: { U: 'OverviewSectionHeading', W: 'OverviewDescription', X: 'OverviewRow', J: 'OverviewRailGroup', se: 'OverviewConnectorsAndTools' },
    features: {
      U: ['let i = c();', '? "text-heading-semibold text-primary"', '? "text-title text-primary"', ': "text-caption text-secondary",', 'r("h3", {'],
      W: ['let i = R();', 'if (!e) return null;', 'let c = s(e);', 'className: "flex flex-col gap-sm",', 'n === !1 &&',
        'defaultMessage: "Description", id: "Q8Qw5BZ1VA"', 'dir: "auto",', '"whitespace-pre-wrap break-words text-primary",',
        'n ? `text-heading ${o}` : "text-body",', 'children: i ? z(c) : c,'],
      X: ['v = y(),', 'o && t("span", { className: "text-muted", children: [" \\u00B7 ", o] }),', 'S = "min-w-0 flex-1 text-footnote text-secondary",',
        '"flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-chip text-secondary",', 'v ? "bg-alpha-2" : "bg-fill-control",',
        'children: typeof n == "string" ? r(m, { name: n, size: "xs" }) : n,', ': r(p, { className: S, children: b }),',
        'if (d === void 0 && !u)', 'return r("div", { className: a("flex gap-xs", w), children: C });', 'variant: "ghost",', 'size: "xs",',
        'flush: "both",', 'className: "w-full justify-start",', 'onClick: u,'],
      J: ['className: "flex flex-col gap-xs pt-md first:pt-0",', 'children: [r(U, { children: e }), n],'],
      se: ['return e.length === 0', 'defaultMessage: "Connectors & tools", id: "mEdG/OmTPo"', 'children: e.map(({ key: e, ...t }) => r(X, { ...t }, e)),'],
    } },
];
const callSites = [
  { source: 'c24c8737b--Vxi4LBp.js', binding: 'pc', role: 'Plugin page: the tab list Kt (Overview first, Tool permissions only for a non-empty resolved list, then the content tabs), Overview as the initial and fallback tab, and its panel',
    features: [
      'hostToolPermissionsServers: xe,', '[U, Te] = n(() => ne(ge) ?? "overview"),', 'K = we(),',
      'Ut = Ht !== "loading" && Ht.length > 0,',
      'let e = [ { id: "overview", href: F("overview"), label: a(Z, { defaultMessage: "Overview", id: "9uOFF3L8kp" }), }, ];',
      'Ut === !0 && e.push({ id: "permissions", href: F("permissions"), label: a(Ks, {}), }),',
      'w && e.push({ id: "contents",', 'ht.length > 0 && e.push({ id: "skills",', 'gt.length > 0 && e.push({ id: "commands",',
      'kt && e.push({ id: "connectors",', '(xt > 0 || Ct) && e.push({ id: "hooks",', '(wt.length > 0 || Tt) && e.push({ id: "monitors",',
      'Et.length > 0 && e.push({ id: "language-servers",', 'Dt.length > 0 && e.push({ id: "agents",', 'bt(is(e, Ce), Gt)',
      'qt = Kt.some((e) => e.id === U) ? U : "overview";', 'Dn = u(() => Ee("connectors"), [Ee]),', 'qt === "overview" && a(pa, {',
      'onOpenConnectors: Kt.some((e) => e.id === "connectors") ? Dn : void 0,',
      'qt === "permissions" && Ht !== "loading" && a(Us, { connectors: Ht, connectorPageStyle: R }),',
    ] },
  { source: 'c24c8737b--Vxi4LBp.js', binding: 'xs', role: 'Tool permissions servers: the host servers only with the unified plugins UI; otherwise the listed servers, enabled only with that UI too',
    features: ['return e === !0 && n !== void 0 && n.length > 0', '? { servers: n, serversSettled: !0, enabled: !0, hostConnector: r }',
      'enabled: e === !0 && (t === !0 || r !== void 0),'] },
  { source: 'c24c8737b--Vxi4LBp.js', binding: 'Ks', role: 'Tool permissions tab label', features: ['defaultMessage: "Tool permissions", id: "xq9OFmeici"'] },
  { source: 'c24c8737b--Vxi4LBp.js', binding: 'is', role: 'A plugin blocked by the sales cloud access check keeps only Overview, Tool permissions and Connectors',
    features: ['return t ? e.filter((e) => rs.some((t) => t === e.id)) : e;'] },
  { source: 'shared-18-D4XxL6Tg.js', binding: 'Q_', role: 'Kt bt(…, Gt): the tab list is unchanged unless the unified UI and the connector page style both hold',
    features: ['if (t === !1) return e;'] },
  { source: 'c76f00e40-CN9FziLk.js', binding: 'gr', role: 'The only caller that passes hostToolPermissionsServers: the directory connector record shown as a plugin page',
    features: ['connectorPageStyle: !0,', 'hostDirectoryPlugin: e,', 'hostToolPermissionsServers: ee,'] },
  { source: 'c12456454-Dz_kF7My.js', binding: 'ni', role: 'Overview: org usage (Dr), what’s new, the Description, categories, the degraded-read warning, Try it; the rail lists Connectors & tools',
    features: [
      're = ti(t, D?.examplePrompts),', 'O = Ct(u, {', 'k = a !== null && t.provenance.source === "shared" ? i(xt, { credit: o }) : null,',
      'ue = j === !1 && (k !== null || O.length > 0),', 'i(Dr, {', 'i(vt, { backendId: t.plugin?.backend_id, connectorPageStyle: f }),',
      'R === !1 && i(bt, { description: ii({ item: t, directoryPlugin: h, signedInRecord: E }), connectorPageStyle: f, }),',
      'i(St, { categories: ce(t), connectorPageStyle: f }),', 'i(_t, { plugin: u }),', 'ae && a !== null && i(gn, {',
      'slashCommand: u?.skills.some(Me) ? `/${t.name}` : void 0,',
      ': ue === !0 ? n(w, { children: [k, O.length > 0 && i(yt, { rows: O })] }) : y ? void 0',
    ] },
  { source: 'c12456454-Dz_kF7My.js', binding: 'gn', role: 'Try it: nothing without prompts; the “…or type {command} in any chat.” line lives inside it',
    features: ['if (e.length === 0) return null;', 'defaultMessage: "Try it", id: "g3Yfya3FKa"', 'a && r === "ready" && i("p", { className: "text-footnote text-muted-as-secondary",',
      'defaultMessage: "\\u2026or type {command} in any chat.", id: "04Z43F3yGZ",'] },
  { source: 'c12456454-Dz_kF7My.js', binding: 'ei', role: 'Try it prompts: the curated catalog’s suggested prompts, for default-catalog plugins only',
    features: [')?.suggested_prompts;', 'e.provenance.source === "default" && t ? t.map((e) => ({ ...e, origin: "curated" })) : $r,'] },
  { source: 'c12456454-Dz_kF7My.js', binding: 'ti', role: 'Try it prompts: a directory listing’s example prompts win over the curated ones',
    features: ['t === void 0 || t.length === 0 ? n : t.map((e) => ({ prompt: e.prompt, origin: "directory_listing" })),'] },
  { source: 'c12456454-Dz_kF7My.js', binding: 'ii', role: 'Description: the item’s own description without a directory listing or signed-in record',
    features: ['return t === null || t === "loading" ? n === void 0 || n.summary.trim() === "" ? e.description : n.summary : t.oneLiner;'] },
  { source: 'cae01a6fc-FlNR9WHF.js', binding: 'ae', role: 'Connectors & tools rows: reach rows, one row per MCP server (display name, the server name as the note when it differs, opens Connectors), CLI components',
    features: ['e.reach &&', 'e.mcpServers.forEach((s, c) => {', 'f = u(s.name);', 'key: `mcp:${c}:${s.name}`,',
      'icon: r(L, { server: l, size: Q, glyphSize: 12 }),', 'label: d,', 'note: d === f ? void 0 : f,', 'onClick: n,', 'e.type === "cli" &&'] },
  { source: 'cd14a8022-CnQTOs75.js', binding: 'x', role: 'A server’s display name: the directory / sync-source / connector name, else its own name (sanitized)',
    features: ['e.connector?.name ??', 'e.name,'] },
  { source: 'c28f9f509-CoVhao0t.js', binding: 'u', role: 'A server without an icon: the kind glyph (connector: Connectors) at the glyph size, text-muted-as-secondary',
    features: ['let o = e(n, { name: f(t), customSize: r, className: "text-muted-as-secondary", });'] },
  { source: 'c28f9f509-CoVhao0t.js', binding: 'h', role: 'Kind glyphs', features: ['connector: "Connectors"'] },
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
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
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
      await add(name);
    }
    // Features: every pinned binding must be in the closure and carry its original text.
    for (const [name, features] of Object.entries(spec.features ?? {})) {
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
