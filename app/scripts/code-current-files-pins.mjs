// R3-files FT-06 / SC-2 (research/files-terminal.md §2 breadcrumb-view): pins for the breadcrumb view helpers that
// scripts/extract-code-ui-current.mjs emits from the 2.42304.0 renderer. 2.42304.0 moved the breadcrumb body out of
// cd2efac6e into the new chunk cfac349aa (Kt, its segments Jt/Yt, the sizer text Q, the middle-cut name qt and the
// native-menu guard Ht); cd2efac6e keeps only the FileBreadcrumb shell Yl, which now passes askIfGone through.
// (The binding map's c230724a2 `fa` for the old `sl` is a mismatch: fa calls preventBaseUIHandler; cfac349aa Ht is the
// identical guard.)
//
// Before an emit slices its binding list, pinFilesHelper checks against the shipped chunk:
//   - the list is exactly the same-chunk closure of the roots, stopping at imports and at the same-chunk bindings another
//     generated module already provides (`provided`, e.g. Gt in code-current breadcrumb-paths.mjs, Pt in files-changes
//     breadcrumb-folder.mjs);
//   - each binding still carries feature strings of its original text;
//   - every import the closure reaches is listed, under the same chunk:alias, and each listed import resolves to what
//     the emit binds it to: a vendor-frame React export (`local=<ns>.<member>`), a code-current or files-changes module
//     generated from that chunk that holds and exports the binding, or a host adapter whose original declaration still
//     reads as the thing the adapter stands in for (`dependencies`);
//   - the official call sites that give a binding its meaning are still there (`uses`).
// It returns the binding list and the import text the emit prepends.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const app = path.resolve(import.meta.dirname, '..');
const view = 'cfac349aa-BiPinwNg.js', viewer = 'cd2efac6e-C1jvGOgh.js', frame = 'vendor-frame-DfPJ1QmD.js';
const react = (alias, from, name) => [`${frame}:${alias}`, from, name];

export const filesPins = {
  // cfac349aa Kt (exported `r`; cd2efac6e imports it as Da): the breadcrumb body. Against 2.37337.1 cd2efac6e dl the
  // lead span is `shrink-0 ps-0.75 text-muted-as-secondary` (was pl-0.75 text-muted), the sizer lead `ps-0.75`, the
  // folder segments and separators text-muted-as-secondary, and askIfGone reaches every segment (Jt).
  // Jt (old ml): a segment's context menu (c0cdf4a08 t, the host's BreadcrumbContextMenu) asks the gone hook
  // (c856385e2 V) for the segment's absolute path when askIfGone(target) says to, passes its beforeOpen to the menu
  // and its answer to renderSegmentMenu as `gone`. Yt (old hl), Q (old fl) and qt (old pl) are unchanged.
  'breadcrumb-view.mjs': {
    source: view, roots: ['Ht', 'Kt', 'Q', 'qt', 'Jt', 'Yt'], bindings: ['Ht', 'Kt', 'Q', 'qt', 'Jt', 'Yt'],
    exports: { Kt: 'BreadcrumbBody', qt: 'BreadcrumbFileName', Jt: 'BreadcrumbSegment', Yt: 'BreadcrumbSegmentLabel', Q: 'BreadcrumbSizerText', Ht: 'preventBreadcrumbNativeMenu' },
    imports: {
      r: react('Ha', 'react/jsx-runtime', 'jsxs'), o: react('Va', 'react/jsx-runtime', 'jsx'), t: react('Ba', 'react/jsx-runtime', 'Fragment'),
      i: react('Ja', 'react', 'Fragment'), a: react('So', 'react', 'useRef'), s: react('bo', 'react', 'useMemo'), u: react('oo', 'react', 'memo'),
      d: react('uo', 'react', 'useCallback'), n: react('Co', 'react', 'useState'),
      ke: ['ce574895a-h0uyeRAC.js:r', './breadcrumb-measure.mjs', 'useBreadcrumbCut'],
      Oe: ['ce574895a-h0uyeRAC.js:n', './breadcrumb-measure.mjs', 'useHeadCut'],
      Ae: ['ce574895a-h0uyeRAC.js:t', './breadcrumb-measure.mjs', 'graphemeEnds'],
      Ee: ['c856385e2-DVsjb2QL.js:vt', '../files-changes/file-gone-check.mjs', 'useFileGone'],
      De: ['c0cdf4a08-h228IL-P.js:t', '../../source-breadcrumb-adapters.jsx', 'BreadcrumbContextMenu'],
    },
    provided: {
      Gt: ['./breadcrumb-paths.mjs', 'breadcrumbSegments'], Vt: ['./breadcrumb-paths.mjs', 'segmentMenuTarget'],
      Xt: ['./breadcrumb-paths.mjs', 'folderLabel'], Pt: ['../files-changes/breadcrumb-folder.mjs', 'BreadcrumbFolderSegment'],
    },
    dependencies: {
      // c0cdf4a08 _ (exported t): the shared right-click menu; the host's BreadcrumbContextMenu takes the same trigger /
      // disabled / onOpenChange / beforeOpen / children and opens after a pending check through menu-open-gate.mjs (h).
      'c0cdf4a08-h228IL-P.js:t': ['beforeOpen:_', 'r=_?.();r?h(e.currentTarget,r,n):n()', 'c===!0&&b!==null&&x(null)'],
    },
    features: {
      Ht: ['e.currentTarget.contains(e.target) && e.preventDefault();'],
      Kt: ['askIfGone: m,', 'className: "shrink-0 ps-0.75 text-muted-as-secondary",', 'o(Q, { text: g, className: "ps-0.75" })',
        'className: "shrink-0 text-muted-as-secondary",', 'onContextMenu: p && Ht,', '"data-file-breadcrumb": !0,'],
      Q: ['className: `shrink-0 before:content-[attr(data-text)] ${t}`,'],
      qt: ['return t.length < 20 ? 0 : t.at(-13);'],
      Jt: ['h = m && u?.(m) ? m.absPath : void 0,', '{ gone: g, beforeOpen: _ } = Ee(h, h);', 'beforeOpen: _,', 'children: m ? l?.({ ...m, gone: g }) : null,'],
      Yt: ['return s === null || e.listsDir === void 0', 'o(Pt, {', 'dirLabel: Xt(e.listsDir),'],
    },
    uses: {},
  },
  // cd2efac6e Yl (old gd): the FileBreadcrumb shell (Copy path button or segment div, byline), now passing askIfGone to
  // Kt. Its Tooltip / TooltipProvider are the host's SourceTooltip / SourceTooltipGroup (the Files pane's tooltip), as
  // in the 2.37337.1 emit; useIntl is the local catalog.
  'breadcrumb-file.mjs': {
    source: viewer, roots: ['Yl'], bindings: ['Yl'], exports: { Yl: 'FileBreadcrumb' },
    imports: {
      r: react('Ha', 'react/jsx-runtime', 'jsxs'), c: react('Va', 'react/jsx-runtime', 'jsx'), t: react('Ba', 'react/jsx-runtime', 'Fragment'),
      n: react('Co', 'react', 'useState'), y: react('uo', 'react', 'useCallback'),
      Da: [`${view}:r`, './breadcrumb-view.mjs', 'BreadcrumbBody'],
      z: ['c0fbbe82d-BOWKSems.js:I', './path-tooltip.mjs', 'pathTooltipOptions'],
      pi: ['c0fbbe82d-BOWKSems.js:L', './path-tooltip.mjs', 'pathTooltipContent'],
      I: ['shared-frame-BfjMqbuN.js:vl', '../files-changes/event-element.mjs', 'elementTarget'],
      Ut: ['vendor-intl-Db7hDWRO.js:p', '../../source-code-start-adapters.jsx', 'useStartIntl'],
      it: ['shared-frame-BfjMqbuN.js:Oc', '../../source-tooltip.jsx', 'SourceTooltip'],
      ut: ['shared-frame-BfjMqbuN.js:kc', '../../source-tooltip.jsx', 'SourceTooltipGroup'],
    },
    provided: {},
    dependencies: {
      'vendor-intl-Db7hDWRO.js:p': ['function q(){let e=o(K);return Mt(e),e}'],
      'shared-frame-BfjMqbuN.js:Oc': ['openOnHandedBackFocus:y=!1', '"data-cds":"Tooltip"'],
      'shared-frame-BfjMqbuN.js:kc': ['closeDelay:t=200', '.Provider'],
    },
    features: {
      Yl: ['askIfGone: p,', 'renderSegmentMenu: f,', '{ defaultMessage: "Copy path {path}", id: "qf/DkufjnS" },', 'c(ut, { children: te })',
        '"text-body font-normal font-control text-secondary flex min-w-0 -mx-0.75"', 'e.currentTarget.contains(I(e.target)) && (l ? l() : S(!0));'],
    },
    // cd2efac6e's file view passes askIfGone (Tp: a local session's file, or a folder inside the session root).
    uses: { '': ['askIfGone: Tp,', '(e) => ua && yp && (!e.isDirectory || Ns(e.absPath, xp)),'] },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const parsed = new Map();
async function chunk(directory, file) {
  const key = path.join(directory, file);
  if (!parsed.has(key)) parsed.set(key, (async () => {
    const bytes = await fs.readFile(key, 'utf8');
    const code = await format(bytes, { parser: 'babel' });
    const ast = parsers.babel.parse(code, {});
    let program;
    babel.traverse(ast, { Program(p) { program = p; } });
    const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
      .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    const raw = parsers.babel.parse(bytes, {});
    return { bytes, code, program, exported, raw };
  })());
  return parsed.get(key);
}
// The raw top-level declaration of an export alias.
function rawDeclaration({ bytes, raw }, alias) {
  const local = raw.program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers)
    .find(s => s.exported.name === alias)?.local.name;
  for (const node of raw.program.body) {
    if (local && node.id?.name === local) return { local, text: bytes.slice(node.start, node.end) };
    const d = local && node.declarations?.find(d => d.id.name === local);
    if (d) return { local, text: bytes.slice(d.start, d.end) };
  }
  return { local, text: null };
}
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const generatedExports = async file => {
  const ast = parsers.babel.parse(await fs.readFile(file, 'utf8'), {});
  return new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers.map(s => [s.local.name, s.exported.name])));
};
// A generated module (code-current `./x.mjs` or files-changes `../files-changes/x.mjs`) built from `file` that holds the
// original binding `local` and exports it as `name`.
async function checkGenerated(label, from, file, local, name) {
  const files = from.startsWith('../files-changes/');
  const dir = path.join(app, 'src/generated', files ? 'files-changes' : 'code-current');
  const target = from.replace(/^\.\.\/files-changes\/|^\.\//, '');
  // Another helper pinned here is emitted in the same run, before the manifest is rewritten: check its pin.
  const sibling = !files && filesPins[target];
  if (sibling) {
    if (sibling.source !== file || !sibling.bindings.includes(local) || sibling.exports[local] !== name)
      throw Error(`${label}: ${from} (pinned) is not ${file}'s ${local} as ${name}`);
    return;
  }
  const manifest = await json(path.join(dir, 'manifest.json'));
  const entry = manifest.modules.find(m => m.target === target);
  const holds = files ? entry?.source === file && entry.exports?.[local] === name
    : entry?.referenceVersion === '2.42304.0' && path.basename(entry.source) === file && entry.bindings.includes(local);
  if (!holds) throw Error(`${label}: ${from} is not ${file}'s ${local} (${JSON.stringify(entry && { source: entry.source, bindings: entry.bindings, exports: entry.exports })})`);
  if ((await generatedExports(path.join(dir, target))).get(local) !== name) throw Error(`${label}: ${from} does not export ${local} as ${name}`);
}

// Returns { bindings, imports, exports } for the emit. `run` false (target skipped by --only) returns them unchecked.
export async function pinFilesHelper(target, directory, run = true) {
  const pin = filesPins[target];
  if (!pin) throw Error(`No files pin for ${target}`);
  const groups = new Map();
  for (const [local, [, from, name]] of Object.entries(pin.imports)) groups.set(from, [...(groups.get(from) ?? []), `${name} as ${local}`]);
  for (const [local, [from, name]] of Object.entries(pin.provided)) groups.set(from, [...(groups.get(from) ?? []), `${name} as ${local}`]);
  const imports = [...groups].map(([from, names]) => `import {${names.join(',')}} from '${from}';`).join('\n');
  const exports = `export { ${Object.entries(pin.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
  const result = { bindings: [...pin.bindings], imports, exports };
  if (!run) return result;
  const label = `${target} (${pin.source})`;
  const src = await chunk(directory, pin.source);
  const declaration = name => {
    const p = src.program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => src.code.slice(p.node.start, p.node.end);
  for (const [name, features] of Object.entries(pin.features)) {
    const absent = features.filter(f => !text(declaration(name)).includes(f));
    if (absent.length) throw Error(`${label}: ${name} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  for (const [name, features] of Object.entries(pin.uses)) {
    const body = name === '' ? src.code : text(declaration(name));
    const absent = features.filter(f => !body.includes(f));
    if (absent.length) throw Error(`${label}: call site ${name || '(chunk)'} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  // Closure of the roots, stopping at imports and provided bindings.
  const closure = new Set(), reachedImports = new Map(), reachedProvided = new Set();
  const visit = name => {
    if (closure.has(name) || reachedImports.has(name) || reachedProvided.has(name)) return;
    if (pin.provided[name]) { declaration(name); reachedProvided.add(name); return; }
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      reachedImports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    for (const [dep, b] of Object.entries(src.program.scope.bindings))
      if (b.referencePaths.some(q => within(binding.path, q)) || b.constantViolations.some(q => within(binding.path, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  for (const local of Object.keys(pin.exports)) if (!closure.has(local)) throw Error(`${label}: exports ${local}, which the emit does not slice`);
  const sorted = list => [...list].sort();
  if (JSON.stringify(sorted(closure)) !== JSON.stringify(sorted(pin.bindings)))
    throw Error(`${label}: closure of ${pin.roots.join(',')} is ${sorted(closure).join(',')}, emit lists ${pin.bindings.join(',')}`);
  if (JSON.stringify(sorted(reachedProvided)) !== JSON.stringify(sorted(Object.keys(pin.provided))))
    throw Error(`${label}: provided bindings reached are ${sorted(reachedProvided).join(',')}`);
  const expected = JSON.stringify(Object.entries(pin.imports).map(([local, [via]]) => [local, via]).sort());
  const actual = JSON.stringify([...reachedImports].sort());
  if (actual !== expected) throw Error(`${label}: replaced imports are ${actual}, expected ${expected}`);
  // Each import means what it is bound to.
  for (const [local, [via, from, name]] of Object.entries(pin.imports)) {
    const [file, alias] = via.split(':');
    const dep = await chunk(directory, file);
    if (file === frame && /^react/.test(from)) {
      const { local: member, text: declared } = rawDeclaration(dep, alias);
      if (!member || !new RegExp(`^${member.replace(/\$/g, '\\$')}=[\\w$]+\\.${name}$`).test(declared ?? ''))
        throw Error(`${label}: ${via} (${member}) is not ${from} ${name}: ${declared}`);
    } else if (from.startsWith('./') || from.startsWith('../files-changes/')) {
      const original = dep.exported.get(alias);
      if (!original) throw Error(`${label}: ${file} no longer exports ${alias}`);
      await checkGenerated(label, from, file, original, name);
    } else {
      const features = pin.dependencies[via];
      if (!features) throw Error(`${label}: host import ${local} (${via}) has no dependency pin`);
      const { text: declared } = rawDeclaration(dep, alias);
      if (declared === null) throw Error(`${label}: ${file} no longer exports ${alias} as a top-level declaration`);
      const absent = features.filter(f => !declared.includes(f));
      if (absent.length) throw Error(`${label}: ${via} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
    }
  }
  for (const [local, [from, name]] of Object.entries(pin.provided)) await checkGenerated(label, from, pin.source, local, name);
  return result;
}
