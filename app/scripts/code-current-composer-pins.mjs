// R2-composer (composer-helpers-latest, research/composer.md §3.7/§3.8/§2): pins for the three composer helpers that
// scripts/extract-code-ui-current.mjs emits from the 2.42304.0 renderer. The emit there slices a hand-listed binding
// set; this module checks, before that emit runs, that the listed set is exactly the same-chunk closure of the roots the
// helper exports (minus the locals the emit replaces with host adapters), that every binding still carries feature
// strings of its original text, that the chunk still exports the root under the official alias consumers import, and
// that every replaced import still names the same vendor export. A version bump that re-points a minified name (the
// old names are reused for other values in 2.42304.0) fails here instead of emitting the wrong binding.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

export const composerHelperPins = {
  // shared-frame en (exported `hd`; 2.37337.1 Xt): click-to-focus is allowed in Electron, otherwise not on touch.
  // Jt/In and Xt/Ln are content-identical pairs in the chunk; the closure of en selects Jt and Xt.
  'composer-focus-capability.mjs': {
    source: 'shared-frame-BfjMqbuN.js', roots: ['en'], bindings: ['Jt', 'Yt', 'Xt', 'Zt', 'en'], officialExports: { hd: 'en' },
    features: {
      Jt: ['"(pointer: coarse)"'], Yt: ['" Electron/"'], Xt: ['typeof window > "u" ? void 0 : window'],
      Zt: ['let n = Xt(t);', 'n.matchMedia(e).matches'], en: ['let t = Xt(e);', 'includes(Yt)', 'Zt(Jt, t)', 'maxTouchPoints'],
    },
  },
  // c227f4d5e pD/JD/tO/rO/uO (2.37337.1 ca80fca8d QA/Nj/Bj/Hj/Yj): the @ menu merges this session's output files.
  'mention-output-files.mjs': {
    source: 'c227f4d5e-Ba-r--Rl.js', roots: ['rO', 'tO'], bindings: ['pD', 'JD', 'tO', 'rO', 'uO'],
    // oO/aO are CDS Icon elements (iO) of the Folder/File glyphs; the host option carries the icon name instead.
    hosts: { oO: ['iO("directory")'], aO: ['iO("file")'] },
    imports: { ka: 'shared-104-Cqo2-vQh.js:ul', yh: 'c68c4283d-CPuRD0vx.js:t' },
    dependencies: { 'shared-104-Cqo2-vQh.js:ul': ['residentModule()'], 'c68c4283d-CPuRD0vx.js:t': ['feature:"ccd"'] },
    features: {
      pD: ['"ccd-files"'], JD: ['JD = !1'], tO: ['providerId: pD', 'icon: r ? oO : aO', 'renderedText: t'],
      iO: ['name: "Folder", size: "auto"', 'name: "File", size: "auto"'],
      rO: ['let r = ka();', 'new r.FileIndex()', '.slice(0, 50)', '"composer_mention_outputs_failed"'], uO: ['lastIndexOf("/")'],
    },
  },
  // shared-28 Bv…Ab (2.37337.1 fv…fy): the IME composition edge guard and composition-before-paste.
  'composer-composition.mjs': {
    source: 'shared-28-DcgD7xXH.js', roots: ['Jv', 'Ab', 'Db', 'Wv', 'Bv', 'Uv'],
    bindings: ['Bv', 'Vv', 'Hv', 'Uv', 'Wv', 'Gv', 'Kv', 'qv', 'zv', 'Jv', 'Cb', 'wb', 'Tb', 'Eb', 'Db', 'Ob', 'kb', 'Ab'],
    // Telemetry (the editor error sink, its error builder and the paste-fallback reporter) becomes a no-op.
    hosts: { Rv: ['e?.onError', '[@ant/cds/editor]'], Lv: ['let n = Error(e);'], Sb: ['source: "paste-fallback"'] },
    imports: {
      wd: 'vendor-prosemirror-SdeAXoBV.js:U', bd: 'vendor-prosemirror-SdeAXoBV.js:H', Sd: 'vendor-prosemirror-SdeAXoBV.js:K',
      Ed: 'vendor-prosemirror-SdeAXoBV.js:W', ef: 'vendor-tiptap-B2NVTMBY.js:j',
    },
    // PluginKey / Plugin / TextSelection / Selection of prosemirror-state, and the Tiptap Extension class.
    dependencies: {
      'vendor-prosemirror-SdeAXoBV.js:U': ['=class{constructor(e="key"){this.key='],
      'vendor-prosemirror-SdeAXoBV.js:H': ['=class{constructor(e){this.spec=e,this.props={}'],
      'vendor-prosemirror-SdeAXoBV.js:K': ['get $cursor(){'],
      'vendor-prosemirror-SdeAXoBV.js:W': ['=class{constructor(e,t,n){this.$anchor=e,this.$head=t'],
      'vendor-tiptap-B2NVTMBY.js:j': ['this.type="extension"'],
    },
    officialExports: {},
    features: {
      Bv: ['"compositionEdgeGuard"'], Vv: ['Bv.getState(e.state)?.pos'], Uv: ['inclusive === !1'], Wv: ['"\\u200B"', '"addToHistory", !1'],
      Kv: ['e.mapping.maps.forEach'], qv: ['"composition-edge-guard.threw"'], zv: ['e.getMeta("history$") !== void 0'],
      Jv: ['ef.create({', 'name: "compositionEdgeGuard"', 'setTimeout(t, 25, n)', 'new bd({', 'instanceof Sd', 'r.keyCode !== 229'],
      Cb: ['Sb('], Tb: ['"focusout"'], Db: ['"compositionend" ? "" : t.data'], Ob: ['new CompositionEvent("compositionend"', 'Ed.fromJSON'],
      Ab: ['t.type === "paste"', '/Android \\d/', 'Ob(e)', 'kb.set(t, e.state.doc)'],
    },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;

// Returns the pinned binding list, which is what the emit slices; `run` false (target skipped by --only) skips the checks.
export async function pinComposerHelper(target, directory, run = true) {
  const pin = composerHelperPins[target];
  if (!pin) throw Error(`No composer pin for ${target}`);
  if (!run) return [...pin.bindings];
  const label = `${target} (${pin.source})`;
  const raw = await fs.readFile(path.join(directory, pin.source), 'utf8');
  const code = await format(raw, { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const declaration = name => {
    const p = program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => code.slice(p.node.start, p.node.end);
  const missing = (name, features = []) => {
    const found = features.filter(f => !text(declaration(name)).includes(f));
    if (found.length) throw Error(`${label}: ${name} lacks ${found.map(f => JSON.stringify(f)).join(', ')}`);
  };
  for (const [alias, local] of Object.entries(pin.officialExports ?? {}))
    if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  for (const [name, features] of Object.entries(pin.features)) missing(name, features);
  for (const [name, features] of Object.entries(pin.hosts ?? {})) missing(name, features);
  // The same-chunk closure of the roots, stopping at imports and at the host-replaced locals.
  const closure = new Set(), imports = new Map();
  const visit = name => {
    if (closure.has(name) || pin.hosts?.[name]) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      imports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    const p = binding.path;
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  const listed = [...pin.bindings].sort(), reached = [...closure].sort();
  if (JSON.stringify(listed) !== JSON.stringify(reached)) throw Error(`${label}: closure of ${pin.roots.join(',')} is ${reached.join(',')}, emit lists ${listed.join(',')}`);
  const expectedImports = JSON.stringify(Object.entries(pin.imports ?? {}).sort());
  const actualImports = JSON.stringify([...imports].sort());
  if (actualImports !== expectedImports) throw Error(`${label}: replaced imports are ${actualImports}, expected ${expectedImports}`);
  // Each replaced import still names the same export of its vendor/shared chunk (checked on the shipped bytes).
  for (const [via, features] of Object.entries(pin.dependencies ?? {})) {
    const [file, alias] = via.split(':');
    const bytes = await fs.readFile(path.join(directory, file), 'utf8');
    const table = [...bytes.matchAll(/export\s*\{([^}]*)\}/g)].pop()?.[1] ?? '';
    const local = table.split(',').map(s => s.trim().split(/\s+as\s+/)).find(([l, e]) => (e ?? l) === alias)?.[0];
    if (!local) throw Error(`${label}: ${file} no longer exports ${alias}`);
    const escaped = local.replace(/\$/g, '\\$');
    const start = bytes.search(new RegExp(`(?:function ${escaped}\\(|(?<![\\w$.])${escaped}=)`));
    if (start < 0) throw Error(`${label}: ${file} ${alias} (${local}) has no declaration`);
    const slice = bytes.slice(start, start + 400);
    const absent = features.filter(f => !slice.includes(f));
    if (absent.length) throw Error(`${label}: ${file} ${alias} (${local}) lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  return [...pin.bindings];
}
