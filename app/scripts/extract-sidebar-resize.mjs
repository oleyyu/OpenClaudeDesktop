// Extract the 3.6556.2 sidebar width drag (cov8-01, research/sidebar.md §3.3, F1/F2): shared-21 Sz (exported `ka`, the
// sidebar's resize handle with the held -> awaited -> lost release states) over shared-9 bm (exported `Pr`, the CDS
// ResizeHandle; 2.42304.0 shared-15 Jt), with the minimal original closures they need, without executing any desktop
// runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the original
// modules resolve through the source chunk's export table to one of: another module generated here, a verified React /
// ReactDOM export of vendor-frame (official-3.6556.2.mjs reactAliases, checked with assertVendorAlias), a view-tabs
// public name (the React Compiler helpers, E3/R3, plus cdsClassNames and isFizzyLakePartEnabled), or a named host
// adapter in src/source-sidebar-resize-adapters.jsx. Every adapter mapping carries feature strings that must still
// appear in the original binding's closure, and every root carries feature strings of its own (R2: literals, keys,
// classes, i18n; minified statements only through looseFeature), so a version bump that re-points an alias stops here.
//
// D0: own generator, own output folder (src/generated/sidebar-resize), own scripts/verify-gen-sidebar-resize.mjs.
// Its consumers (sidebar-sections, session-rail, session-rail-sections) all read this manifest as 3.6556.2 through
// scripts/sidebar-resize-compat.mjs; the E34 legacy['2.42304.0'] view and its frozen JSON are gone (w10-cleanup-sidebar-legacy).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const defaultOutput = path.join(root, 'src/generated/sidebar-resize');
const adapterModule = '../../source-sidebar-resize-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;

// vendor-frame re-exports React / ReactDOM; each alias is checked with official.assertVendorAlias (top-level
// `local=<namespace>.<member>` of the right namespace).
// xa (createPortal): c44d00c7f Rr, the Changed files column's drag shield (W12 diff-main).
const vendor = { [official.vendorFrame]: Object.fromEntries(['Co', 'wo', 'ho', 'bo', 'io', 'Ha', 'Ua', 'Sa', 'xa'].map(alias => [alias, official.reactAliases[alias]])) };
// view-tabs public names this area imports (E3/R3: the React Compiler helpers have exactly one copy, in view-tabs).
// Each entry must be the view-tabs 3.6556.2 publicName of the same file and export alias.
const viewTabs = {
  [official.sharedFrame]: {
    ...Object.fromEntries(Object.entries(official.compilerHelpers).map(([alias, { name }]) => [alias, name])),
    // Q (exported `Hf`): tailwind-merge over clsx, bm's root className. 2.42304.0 answered it with clsx (adapter).
    Hf: 'cdsClassNames',
    // ao (exported `Id`): `J(za)`, the CDS owner-window portal anchor; c44d00c7f Rr portals its shield into it (else body).
    Id: 'useCdsOwnerWindowAnchor',
  },
  // lp (exported `Yo`): the fizzy-lake part gate (`Qm = []` in this build, so every part is off; E12/R15).
  'shared-4-DUB1Oi0O.js': { Yo: 'isFizzyLakePartEnabled' },
  // gf (exported `cp`): the element's window ResizeObserver (c219730b0 Sn watches the Changes row's width).
  'shared-25-DOWZRSlq.js': { cp: 'getResizeObserverClass' },
};
// Host dependencies: runtime services and React contexts this app answers itself (checked before the other tables).
// `features` must appear in the closure of the original binding the alias names, so a re-pointed alias fails here.
const adapters = {
  // un: `F(ln)?.direction ?? "ltr"` (Base UI DirectionContext; view-tabs `DirectionContext`). Only Sz's tooltip side.
  [official.vendorFrame]: { Ia: { name: 'useDirection', features: ['?.direction ?? "ltr"'] } },
  // react-intl useIntl over the local catalog.
  [official.vendorIntl]: { p: { name: 'useIntl', features: ['[React Intl]'] } },
  [official.sharedFrame]: {
    // Xm: the CDS Tooltip (side/trackCursorAxis/hoverable/shortcut/detail/triggerRef) -> SourceTooltip.
    Kl: { name: 'SidebarResizeTooltip', features: ['trackCursorAxis', 'openOnHandedBackFocus', 'triggerRef'] },
    // er: `$n(Qn(), e)` over the CDS features context (bm: `xe("panels")`).
    hf: { name: 'useCdsFeature', features: ['.split(" ").includes('] },
  },
  // q: the frame zustand store (sidebarWidth, isResizing, collapsed, setIsResizing, commitSidebarWidth, setCollapsedPref).
  'shared-52-uHFNjl7C.js': {
    ah: { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing', 'setCollapsedPref', 'toggleCollapsed'] },
  },
  'shared-8-Db1QN4mf.js': {
    // Fb: the Hide sidebar intent (`ei.getState().toggleCollapsed()` + sidebar.state_set telemetry).
    Cu: { name: 'useHideSidebarIntent', features: ['toggleCollapsed()', '"claudeai.desktop.sidebar.state_set"'] },
    // fb: the canHide gate, a GrowthBook flag that defaults on.
    Iu: { name: 'sidebarCanHide', features: ['"__gb__3775304746"', ', !0) !== !1'] },
    // Pb: sidebar.state_set telemetry when the collapsed state changed.
    Ql: { name: 'reportSidebarStateSet', features: ['"claudeai.desktop.sidebar.state_set"', 'home.sidebar.toggle'] },
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
// `features` pins each root to its original text: a string (contained), a RegExp (looseFeature), or `{ dep: string }`
// (a same-chunk binding the root reads contains the string; for one-line selector hooks). `hostBindings` maps a
// same-chunk top-level binding to an adapter export instead of emitting its closure (with its own feature strings).
// Target names and export names are those of 2.42304.0 (R4/E7); the 2.42304.0 locals are noted per module.
const modules = [
  // vendor-frame ve (exported `Ba`; old ge): clsx (bm's pill classes).
  { target: 'class-names.mjs', source: official.vendorFrame, exports: { ve: 'clsx' },
    features: { ve: ['arguments.length', '(r && (r += " "), (r += t))'] } },
  // shared-frame Ln (exported `_f`; old Q): `typeof window < "u" ? useLayoutEffect : useEffect`.
  { target: 'layout-effect.mjs', source: official.sharedFrame, exports: { Ln: 'useIsomorphicLayoutEffect' },
    features: { Ln: ['typeof window < "u"'] } },
  // shared-9 bm (exported `Pr`; old shared-15 Jt): the CDS ResizeHandle (document mousemove/mouseup, 3px drag
  // threshold, 8/32 keys), now React Compiler output.
  { target: 'resize-handle.mjs', source: 'shared-9-CM21XrJw.js',
    exports: { bm: 'ResizeHandle', mm: 'resizeDragThreshold', hm: 'resizeKeyStep', gm: 'resizeKeyStepLarge',
      _m: 'resizeHandleSideClasses', vm: 'resizePillClasses', ym: 'resizeLineClasses' },
    features: { bm: ['"data-cds": "ResizeHandle"', '"data-cds-part": "resize-pill"', 'addEventListener("mousemove"', '("panels")', 'role: "separator"'],
      mm: [loose('mm = 3')], hm: [loose('hm = 8')], gm: [loose('gm = 32')], _m: ['"inline-start":'],
      vm: ['opacity-[var(--cds-resize-pill-force,0)] delay-200'], ym: ['[--resize-line:2px]'] } },
  // shared-0 qR (old dI): the composed-artifact root attribute shared-52 Ah reads.
  { target: 'composed-frame.mjs', source: 'shared-0-DDOOdL6P.js', exports: { qR: 'artifactComposedAttribute' },
    features: { qR: ['"data-artifact-composed"'] } },
  // shared-52 width bounds, max width, the sidebarWidth/isResizing selector hooks (their selectors b_ / w_ are now
  // module-level functions) and the collapsed predicate (l_). Old Yu Xu $u uh fh rh Bm.
  { target: 'sidebar-width.mjs', source: 'shared-52-uHFNjl7C.js',
    hostBindings: { q: { name: 'useSidebarFrameStore', features: ['commitSidebarWidth', 'setIsResizing', 'setCollapsedPref'] } },
    exports: { Yd: 'sidebarWidthBounds', Xd: 'clampSidebarWidth', $d: 'sidebarMaxWidth', y_: 'useSidebarWidth',
      C_: 'useSidebarResizing', l_: 'sidebarHidden', Hg: 'sidebarForcedClosed' },
    features: { Yd: ['MIN: 200, MAX: 420, DEFAULT: 288'], Xd: ['.MAX, Math.max(', '.MIN, e)'], $d: ['Math.floor(e) - 330'],
      y_: [{ dep: 'return e.sidebarWidth;' }], C_: [{ dep: 'return e.isResizing;' }],
      l_: ['composedSidebarOpen', 'isRouteDrilldown'], Hg: ['isCuDocked', 'isNarrowViewport'] } },
  // shared-16 nl (exported `xi`; old pc): the drag keeps the sidebar while the raw width reaches half the minimum.
  { target: 'hide-threshold.mjs', source: 'shared-16-ByfgAyLr.js', exports: { nl: 'keepsSidebarOpen' },
    features: { nl: ['e >= t / 2'] } },
  // shared-156 sq/cq (old dV/fV): the per-document "a gesture holds Escape" count (cq is its reader).
  { target: 'escape-hold.mjs', source: 'shared-156-BLTosN8U.js', exports: { sq: 'holdEscape', cq: 'escapeHeld' },
    features: { sq: ['"abort"'], cq: ['.has(e)'] } },
  // shared-18 gH (exported `tr`; old XL): capture-phase Escape cancel for a gesture.
  { target: 'escape-cancel.mjs', source: 'shared-18-D3y8YMFN.js', exports: { gH: 'onEscapeCancel' },
    features: { gH: ['"Escape"', 'keyCode === 229', 'stopImmediatePropagation'] } },
  // shared-28 $h (exported `js`; old Pm): logical side -> physical side under a direction.
  { target: 'logical-side.mjs', source: 'shared-28-DNYlf4wu.js', exports: { $h: 'physicalSide' },
    features: { $h: ['"inline-start"', '"rtl"', '"right" : "left"'] } },
  // shared-19 yj (exported `Cn`; old ZY): records where a sidebar toggle came from (the focus hand-off origin).
  { target: 'focus-origin.mjs', source: 'shared-19-DIKJVT7c.js',
    exports: { yj: 'rememberFocusOrigin', gj: 'focusOrigins', _j: 'toggleFocusOrigin' },
    features: { yj: ['new WeakRef(e)'], _j: ['"toggle"'] } },
  // shared-20 fx (exported `gi`; new in 3.6556.2): `J("panels")`, the fizzy-lake panels part. Sz drops the Hide
  // sidebar tooltip under panels; the part list is empty in this build, so it is false (E12).
  { target: 'panels-part.mjs', source: 'shared-20-mUr7IqZY.js', exports: { fx: 'panelsPartEnabled' },
    features: { fx: ['("panels")'] } },
  // shared-21 Sz (exported `ka`; old DF): the sidebar handle, its live-width setter (BM/RM, old yk/_k) and the
  // follow-up click guard (xz, old EF).
  { target: 'sidebar-resize-handle.mjs', source: 'shared-21-R7LldJ05.js',
    exports: { Sz: 'SidebarResizeHandle', zM: 'sidebarLiveWidthActive', BM: 'liveSidebarWidth', RM: 'liveSidebarWidthTargets',
      qM: 'endEdgeResize', xz: 'swallowFollowUpClicks' },
    features: {
      Sz: ['release: "held"', loose('(l.release = "awaited")'), loose('(l.release = "lost")'), '}, 200)',
        loose('t.release === "lost" || (e && t.release === "awaited")'), 'className: "dframe-resize-handle"', loose('ly("resize_handle")'),
        loose('Ey(!1, "resize_handle")'), 'defaultMessage: "Resize sidebar"', 'defaultMessage: "Drag to resize"', 'defaultMessage: "Hide sidebar"',
        '"--df-sidebar-width"', 'shortcut: "cmd+b"'],
      BM: ['.closest(".dframe-root") === e'], RM: ['".dframe-sidebar", "width"'], xz: ['"dblclick"'],
    } },
  // W12 diff-main: the Changes pane's "Changed files" column handles (3.6556.2 c44d00c7f Jd), which render the same
  // shared-9 bm as the sidebar (D1: one copy, resize-handle.mjs above), so they are emitted here.
  // shared-frame Ff (exported `au`): the 9000 z-index of Rr's drag shield.
  { target: 'resize-shield-layer.mjs', source: official.sharedFrame, exports: { Ff: 'resizeShieldZIndex' },
    features: { Ff: [loose('Ff = 9e3')] } },
  // shared-130 Ef (exported `Ub`): clamp(value, min, max), c219730b0 an / _n.
  { target: 'clamp.mjs', source: 'shared-130-dWztbTO1.js', exports: { Ef: 'clamp' },
    features: { Ef: ['return Math.max(t, Math.min(e, n));'] } },
  // c219730b0 Sn (exported `_t`): the resizable Changed files column (live width on the column node, hide below MIN/2,
  // the edge handle that shows it, click to hide / show with the focus hand-off, Home/End, double-click reset) and its
  // bounds Z (exported `pt`). un / gn are GrowthBook gates (host-growthbook.mjs, through the adapters).
  { target: 'diff-tree-column.mjs', source: 'c219730b0-DGG9iA8k.js',
    hostBindings: {
      un: { name: 'diffTreeCanHide', features: ['"__gb__91451196"'] },
      gn: { name: 'useDiffTreeOnRight', features: ['"__gb__2446046106"', '"epitaxy-nifty-pudding"'] },
    },
    exports: { Sn: 'useResizableDiffTree', Z: 'diffTreeWidthBounds' },
    features: {
      Sn: ['showedColumn: !1', 'edgeHandleProps:', 'hidesColumn:', '"inline-start" : "inline-end"', '"aria-valuemin": 0', 'e.key === "Home" ? Z.MIN : Z.MAX'],
      Z: ['DEFAULT: 240, MIN: 160, MAX: 640'],
    } },
  // c44d00c7f Ir / Lr / Rr: the column's divider (tooltip: actionLabel "Hide files", the ⇧⌘Y shortcut, detail "Drag to
  // resize"), the hidden column's edge (Lr, actionLabel "Show files") and the drag shield. The tooltip is the host
  // SourceTooltip through its own adapter (the sidebar's SidebarResizeTooltip also registers the sidebar handle).
  { target: 'diff-tree-resize-handle.mjs', source: 'c44d00c7f-Cr1FDL2F.js',
    hostBindings: { M: { name: 'DiffTreeResizeTooltip', features: [] } },
    exports: { Ir: 'DiffTreeResizeHandle', Lr: 'DiffTreeEdgeHandle', Rr: 'DiffTreeResizeShield' },
    features: {
      Ir: ['defaultMessage: "Drag to resize"', 'trackCursorAxis: "y"', 'hoverable: !1', 'shortcut: f'],
      Lr: ['"relative w-0 shrink-0"', '"pointer-events-none start-auto end-0"', '"w-[3px] [&>*]:pointer-events-none"'],
      Rr: ['"data-file-tree-resize-shield": ""', '"fixed inset-0 cursor-col-resize bg-alpha-1 opacity-20"'],
    } },
];

async function readSource(name, cache, directory = source) {
  const key = `${directory}/${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(directory, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(key, record);
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
const describe = f => (f instanceof RegExp ? String(f) : typeof f === 'string' ? JSON.stringify(f) : JSON.stringify(f));
// A feature is a string (contained), a RegExp (looseFeature; tested) or `{ dep }` (resolved by `depText`).
function assertFeatures(label, text, features = [], depText = () => []) {
  const missing = features.filter(f => f instanceof RegExp ? !f.test(text) : typeof f === 'string' ? !text.includes(f)
    : !depText().some(t => t.includes(f.dep)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(describe).join(', ')}`);
}

function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}

// view-tabs 3.6556.2 public names (read once); the compiler helpers are proved on the shared-frame original first.
let viewTabsPublic;
async function viewTabsImport(file, alias, via, cache) {
  const name = viewTabs[file]?.[alias];
  if (!name) return null;
  if (!viewTabsPublic) {
    viewTabsPublic = (await viewTabsManifestFor(referenceVersion)).publicNames;
    const helpers = official.assertCompilerHelpers((await readSource(official.sharedFrame, cache)).bytes.toString());
    for (const [semantic, { alias: helperAlias }] of Object.entries(helpers))
      if (viewTabsPublic[semantic]?.file !== official.sharedFrame || viewTabsPublic[semantic]?.export !== helperAlias) throw Error(`view-tabs ${semantic} is not ${official.sharedFrame}:${helperAlias}`);
  }
  const pub = viewTabsPublic[name];
  if (!pub || pub.file !== file || pub.export !== alias) throw Error(`view-tabs public name ${name} is not ${via}`);
  return { from: `../view-tabs/${pub.file}`, name, via, kind: 'view-tabs', original: pub.local };
}

// The slicing core, shared with tests that need another original closure: emits `modules` in order and returns their
// text plus manifest records.
export async function sliceOriginalModules({ modules: specs, adapters: adapterTable = {}, adapterModule: adapterPath = adapterModule, cache = new Map(), sourceDirectory = source }) {
  const emitted = []; // modules already generated in this run: { spec }
  const manifestModules = [];
  const files = {};
  const read = name => readSource(name, cache, sourceDirectory);
  for (const spec of specs) {
    const src = await read(spec.source);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const adapterFor = async (file, alias, via) => {
      const entry = adapterTable[file]?.[alias];
      if (!entry) return null;
      const dep = await read(file);
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
        const shared = await viewTabsImport(file, alias, via, cache);
        if (shared) { imports.set(name, shared); return; }
        const dep = await read(file);
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
      const depText = () => declarationDeps(src, binding.path).map(d => src.program.scope.getBinding(d)?.path).filter(q => q && !q.isImportSpecifier()).map(q => declarationText(src, q));
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name], depText);
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

export async function extractSidebarResize({ check = false, output = defaultOutput } = {}) {
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--out');
  await extractSidebarResize({ check: process.argv.includes('--check'), ...(at > 0 ? { output: path.resolve(process.argv[at + 1]) } : {}) });
}
