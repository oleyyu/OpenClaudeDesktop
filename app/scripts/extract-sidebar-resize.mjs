// Extract the 2.42304.0 sidebar width drag (cov8-01, research/sidebar-sections.md WI-7): shared-21 DF (exported `ra`,
// the sidebar's resize handle with the held -> awaited -> lost release states) over shared-15 Jt (exported `Zt`, the CDS
// ResizeHandle), with the minimal original closures they need, without executing any desktop runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the original
// modules resolve through the source chunk's export table to one of: another module generated here, a verified React /
// ReactDOM export of vendor-frame, or a named host adapter in src/source-sidebar-resize-adapters.jsx. Every adapter
// mapping carries feature strings that must still appear in the original binding's closure, and every root carries
// feature strings of its own, so a version bump that re-points an alias stops here.
//
// D0: own generator, own output folder (src/generated/sidebar-resize), own scripts/verify-gen-sidebar-resize.mjs.
// Nothing here reads src/generated/view-tabs: the CDS pieces that live in that graph and read a React context (the
// Direction context, the CDS features context) or are its shared tailwind-merge instance are host adapters, never a
// second copy (see the adapter module for what each one answers and why).
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
const output = path.join(root, 'src/generated/sidebar-resize');
const adapterModule = '../../source-sidebar-resize-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React / ReactDOM; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], mo: ['react', 'useEffect'], yo: ['react', 'useLayoutEffect'],
    uo: ['react', 'useCallback'], ro: ['react', 'forwardRef'], Va: ['react/jsx-runtime', 'jsx'],
    Ha: ['react/jsx-runtime', 'jsxs'], Ca: ['react-dom', 'flushSync'],
  },
};
// Host dependencies: runtime services and React contexts this app answers itself (checked before the vendor table).
// `features` must appear in the closure of the original binding the alias names, so a re-pointed alias fails here.
const adapters = {
  // Td: `N(wd)?.direction ?? "ltr"` (Base UI DirectionContext; view-tabs `DirectionContext`). Only DF's tooltip side.
  'vendor-frame-DfPJ1QmD.js': { Wn: { name: 'useDirection', features: ['?.direction ?? "ltr"'] } },
  // react-intl useIntl over the local catalog.
  'vendor-intl-Db7hDWRO.js': { p: { name: 'useIntl', features: ['[React Intl]'] } },
  'shared-frame-BfjMqbuN.js': {
    // Zp: the CDS Tooltip (side/trackCursorAxis/hoverable/shortcut/detail/triggerRef) -> SourceTooltip.
    Oc: { name: 'SidebarResizeTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus', 'triggerRef'] },
    // vr: `_r(gr(), e)` over the CDS features context `hr` (Jt: `st("panels")`).
    Uu: { name: 'useCdsFeature', features: ['.split(" ").includes('] },
    // X: tailwind-merge `cn` (view-tabs `cdsClassNames`).
    xd: { name: 'cdsClassNames', features: ['conflictingClassGroups'] },
  },
  // G: the frame zustand store (sidebarWidth, isResizing, collapsed, setIsResizing, commitSidebarWidth, setCollapsedPref).
  'shared-52-DGviI8xb.js': {
    If: { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing', 'setCollapsedPref', 'toggleCollapsed'] },
  },
  'shared-8-B5lJ8U5C.js': {
    // J_: the Hide sidebar intent (`So.getState().toggleCollapsed()` + sidebar.state_set telemetry).
    Wl: { name: 'useHideSidebarIntent', features: ['toggleCollapsed()', '"claudeai.desktop.sidebar.state_set"'] },
    // w_: the canHide gate, a GrowthBook flag that defaults on.
    iu: { name: 'sidebarCanHide', features: ['"__gb__3775304746"', ', !0) !== !1'] },
    // q_: sidebar.state_set telemetry when the collapsed state changed.
    xl: { name: 'reportSidebarStateSet', features: ['"claudeai.desktop.sidebar.state_set"', 'home.sidebar.toggle'] },
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `features` pins each root to strings of its original text. `hostBindings` maps a same-chunk top-level binding to an
// adapter export instead of emitting its closure (with its own feature strings).
const modules = [
  // vendor-frame ge: clsx (Jt's pill classes).
  { target: 'class-names.mjs', source: 'vendor-frame-DfPJ1QmD.js', exports: { ge: 'clsx' },
    features: { ge: ['arguments.length', 'he(e)'] } },
  // shared-frame Q (exported `Qu`): `typeof window < "u" ? useLayoutEffect : useEffect`.
  { target: 'layout-effect.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { Q: 'useIsomorphicLayoutEffect' },
    features: { Q: ['typeof window < "u"'] } },
  // shared-15 Jt (exported `Zt`): the CDS ResizeHandle (document mousemove/mouseup, 3px drag threshold, 8/32 keys).
  { target: 'resize-handle.mjs', source: 'shared-15-Cc9xvKlF.js',
    exports: { Jt: 'ResizeHandle', Ht: 'resizeDragThreshold', Ut: 'resizeKeyStep', Wt: 'resizeKeyStepLarge',
      Gt: 'resizeHandleSideClasses', Kt: 'resizePillClasses', qt: 'resizeLineClasses' },
    features: { Jt: ['"data-cds": "ResizeHandle"', '"data-cds-part": "resize-pill"', 'addEventListener("mousemove"', 'st("panels")'],
      Ht: ['Ht = 3'], Ut: ['Ut = 8'], Wt: ['Wt = 32'] } },
  // shared-0 dI: the composed-artifact root attribute shared-52 Vp reads.
  { target: 'composed-frame.mjs', source: 'shared-0-ByI5P0CP.js', exports: { dI: 'artifactComposedAttribute' },
    features: { dI: ['"data-artifact-composed"'] } },
  // shared-52 width bounds, max width, the sidebarWidth/isResizing selectors and the collapsed predicate (rh).
  { target: 'sidebar-width.mjs', source: 'shared-52-DGviI8xb.js',
    hostBindings: { G: { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing', 'setCollapsedPref'] } },
    exports: { Yu: 'sidebarWidthBounds', Xu: 'clampSidebarWidth', $u: 'sidebarMaxWidth', uh: 'useSidebarWidth',
      fh: 'useSidebarResizing', rh: 'sidebarHidden', Bm: 'sidebarForcedClosed' },
    features: { Yu: ['MIN: 200, MAX: 420, DEFAULT: 288'], $u: ['Math.floor(e) - 330'], uh: ['e.sidebarWidth'],
      fh: ['e.isResizing'], rh: ['composedSidebarOpen', 'isRouteDrilldown'], Bm: ['isCuDocked', 'isNarrowViewport'] } },
  // shared-16 pc (exported `Zr`): the drag keeps the sidebar while the raw width reaches half the minimum.
  { target: 'hide-threshold.mjs', source: 'shared-16-B0xHzPjj.js', exports: { pc: 'keepsSidebarOpen' },
    features: { pc: ['e >= t / 2'] } },
  // shared-156 dV/fV: the per-document "a gesture holds Escape" count (fV is its reader, exported for consumers).
  { target: 'escape-hold.mjs', source: 'shared-156-Bikz018e.js', exports: { dV: 'holdEscape', fV: 'escapeHeld' },
    features: { dV: ['"abort"'], fV: ['.has(e)'] } },
  // shared-18 XL (exported `Qn`): capture-phase Escape cancel for a gesture.
  { target: 'escape-cancel.mjs', source: 'shared-18-D4XxL6Tg.js', exports: { XL: 'onEscapeCancel' },
    features: { XL: ['"Escape"', 'keyCode === 229', 'stopImmediatePropagation'] } },
  // shared-28 Pm (exported `bo`): logical side -> physical side under a direction.
  { target: 'logical-side.mjs', source: 'shared-28-DcgD7xXH.js', exports: { Pm: 'physicalSide' },
    features: { Pm: ['"inline-start"', '"rtl"', '"right" : "left"'] } },
  // shared-19 ZY (exported `io`): records where a sidebar toggle came from (the focus hand-off origin).
  { target: 'focus-origin.mjs', source: 'shared-19-CkPOiIKm.js',
    exports: { ZY: 'rememberFocusOrigin', JY: 'focusOrigins', YY: 'toggleFocusOrigin' },
    features: { ZY: ['new WeakRef(e)'], YY: ['"toggle"'] } },
  // shared-21 DF (exported `ra`): the sidebar handle, its live-width setter (yk/_k) and the follow-up click guard (EF).
  { target: 'sidebar-resize-handle.mjs', source: 'shared-21-IP-SVetq.js',
    exports: { DF: 'SidebarResizeHandle', vk: 'sidebarLiveWidthActive', yk: 'liveSidebarWidth', _k: 'liveSidebarWidthTargets',
      Ek: 'endEdgeResize', EF: 'swallowFollowUpClicks' },
    features: {
      DF: ['release: "held"', '(u.release = "awaited")', '(u.release = "lost")', '}, 200)',
        'n.release === "lost" || (t && n.release === "awaited")', 'className: "dframe-resize-handle"', 'Pv("resize_handle")',
        'py(!1, "resize_handle")', 'defaultMessage: "Resize sidebar"', 'defaultMessage: "Drag to resize"', 'defaultMessage: "Hide sidebar"'],
      yk: ['.closest(".dframe-root") === e'], _k: ['".dframe-sidebar", "width"'], EF: ['"dblclick"'],
    } },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// Top-level bindings of the chunk that the declaration reads or writes (`x ??= …` only assigns x, yet needs it).
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);

// The same-chunk closure text of a binding (imports are not followed): what adapter feature strings are matched against.
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !text.includes(f));
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

// The slicing core, shared with tests that need another original closure (e.g. the official tailwind-merge for the
// one cdsClassNames call site): emits `modules` in order and returns their text plus manifest records.
export async function sliceOriginalModules({ modules: specs, adapters: adapterTable = {}, adapterModule: adapterPath = adapterModule, cache = new Map() }) {
  const emitted = []; // modules already generated in this run: { spec }
  const manifestModules = [];
  const files = {};
  for (const spec of specs) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const adapterFor = async (file, alias, via) => {
      const entry = adapterTable[file]?.[alias];
      if (!entry) return null;
      const dep = await readSource(file, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), entry.features);
      return { from: adapterPath, name: entry.name, via, kind: 'adapter', original: local };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const host = spec.hostBindings?.[name];
      if (host) {
        if (!src.program.scope.getBinding(name)) throw Error(`${spec.target}: host binding ${name} no longer exists`);
        assertFeatures(`${spec.target}: host binding ${name}`, closureText(src, name), host.features);
        imports.set(name, { from: adapterPath, name: host.name, via: `${spec.source}:${name}`, kind: 'adapter', original: name });
        return;
      }
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = await adapterFor(file, alias, via);
        if (adapter) { imports.set(name, adapter); return; }
        const dep = await readSource(file, cache);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        const generated = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
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
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-sidebar-resize.mjs.\n// Edit the extractor or src/source-sidebar-resize-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifestModules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  return { files, modules: manifestModules };
}

export async function extractSidebarResize({ check = false } = {}) {
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-sidebar-resize.mjs',
    adapterModule: 'src/source-sidebar-resize-adapters.jsx', modules: [],
  };
  const { files, modules: records } = await sliceOriginalModules({ modules, adapters });
  manifest.modules = records;
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Sidebar resize output set changed: ${present.join(',')}. Run scripts/extract-sidebar-resize.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Sidebar resize source mismatch: ${name}. Run scripts/extract-sidebar-resize.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} sidebar resize modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSidebarResize({ check: process.argv.includes('--check') });
