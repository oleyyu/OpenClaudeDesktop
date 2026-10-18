// Extract the 2.42304.0 Code landing texture (`LandingTextureLayer`, c9d397622) and its host (`fH`/`pH`/`mH` in
// cc43287c9) with the minimal original closures they need, without executing any desktop runtime.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (computed with Babel scope analysis), so nothing is hand-picked and a
// renamed or re-pointed minified import fails generation instead of silently binding the wrong value. Imports of the
// original modules are resolved through the source chunk's export table to one of: another module generated here, a
// verified React export of vendor-frame, or a named host adapter in src/source-landing-texture-adapters.jsx.
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
const output = path.join(root, 'src/generated/landing-texture');
const adapterModule = '../../source-landing-texture-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment in the chunk.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], mo: ['react', 'useEffect'], uo: ['react', 'useCallback'],
    oo: ['react', 'memo'], wo: ['react', 'useSyncExternalStore'], Va: ['react/jsx-runtime', 'jsx'],
  },
};
// Host dependencies the official chunks read from runtime services this app does not have (see the adapter module).
const adapters = {
  'shared-frame-BfjMqbuN.js': { mu: 'useOwnerWindow' }, // Ya: owner-window React context of the overlay host.
  'shared-156-Bikz018e.js': { Ic: 'useReduceMotion' }, // fE: appearance:reduceMotion preference + media query.
  'shared-25-DP8p7i1Z.js': { $h: 'withChunkLoadContext' }, // ls: chunk-load telemetry origin/tag only.
  'preload-helper-D0dM6GpB.js': { t: 'preloadChunk' }, // Vite preload helper of the official bundle.
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots.
const modules = [
  { target: 'owner-support.mjs', source: 'shared-25-DP8p7i1Z.js',
    exports: { up: 'ownerWindow', dp: 'ownerWindowOrGlobal', pp: 'ownerResizeObserver', mp: 'ownerMutationObserver', Wc: 'idleCallback' } },
  { target: 'logger.mjs', source: 'shared-0-ByI5P0CP.js', exports: { $r: 'logger', I: 'logCategory' } },
  { target: 'element-node.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { lc: 'elementNode' } },
  { target: 'theme-attribute.mjs', source: 'c5d9b9a16-dnU9db-H.js', exports: { e: 'themeAttribute' } },
  { target: 'timing.mjs', source: 'cc43287c9-DAfOi8yP.js', exports: { NB: 'landingRevealDelayMs', PB: 'landingFadeInMs' } },
  { target: 'preference-store.mjs', source: 'shared-25-DP8p7i1Z.js',
    exports: { AH: 'lssKey', YH: 'useStoredPreference', JH: 'readStoredPreference', Di: 'useMediaQuery' } },
  { target: 'background-animation.mjs', source: 'c67494563-gcg8gofQ.js',
    exports: { i: 'backgroundAnimationKey', s: 'useBackgroundAnimation', c: 'shouldAnimateBackground', l: 'subscribeBackgroundAnimation' } },
  // The whole chunk: `complete` asserts that every top-level declaration of c9d397622 is reached from the exports.
  { target: 'layer.mjs', source: 'c9d397622-Ddkc2XHN.js', complete: true,
    exports: {
      Me: 'LandingTextureLayer', je: 'createLandingTexture', be: 'createLandingRenderer', f: 'landingConfig',
      p: 'landingGrid', h: 'landingCharacters', _: 'landingLooks', x: 'landingSequence', C: 'landingHash',
      te: 'pickLandingLook', E: 'landingWind', D: 'landingRecentKey', ne: 'readRecentLooks', re: 'rememberLook',
      oe: 'landingFrameLoop', pe: 'landingTouch', me: 'windVertexShader', K: 'windFragmentShader',
      he: 'glyphVertexShader', q: 'glyphFragmentShader', J: 'softwareRenderer', xe: 'landingContrastQuery',
      Se: 'landingDarkQuery', Ee: 'landingInteractiveSelector', Oe: 'landingTextureSupported', ke: 'whenVisibleAndFocused',
    } },
  // `__vite__mapDeps` is the official bundle's CSS preload table. Vite injects a top-level binding of that same name
  // into built chunks with preloaded dynamic imports, so it is imported from the adapter under that local name
  // (bundling resolves it to the adapter's own identifier) instead of being declared here.
  { target: 'host.mjs', source: 'cc43287c9-DAfOi8yP.js', hostBindings: { __vite__mapDeps: 'chunkDependencies' },
    exports: { mH: 'LandingTextureHost', pH: 'useLandingRevealDelay', fH: 'loadLandingTextureLayer' } },
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

function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) throw Error(`Unmapped vendor import ${file}:${alias}`);
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

export async function extractLandingTexture({ check = false } = {}) {
  const cache = new Map();
  const emitted = []; // modules already generated in this run: { spec, src }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-landing-texture.mjs', adapterModule: 'src/source-landing-texture-adapters.jsx', modules: [] };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set(), rewrites = [];
    // A binding of the same chunk already emitted by an earlier module is imported, never duplicated.
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const fromChunk = (file, alias, via) => {
      if (adapters[file]?.[alias]) return { from: adapterModule, name: adapters[file][alias], via, kind: 'adapter' };
      const dep = cache.get(file);
      const local = dep?.exported.get(alias);
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (!owner) throw Error(`${spec.target}: unresolved import ${via}`);
      return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via, kind: 'generated' };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      if (spec.hostBindings?.[name]) {
        if (!src.program.scope.getBinding(name)) throw Error(`${spec.target}: host binding ${name} no longer exists`);
        imports.set(name, { from: adapterModule, name: spec.hostBindings[name], via: `${spec.source}:${name}`, kind: 'adapter' });
        return;
      }
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        if (vendor[file]) {
          const dep = await readSource(file, cache);
          const [from, imported] = vendorImport(file, alias, dep);
          imports.set(name, { from, name: imported, via, kind: 'react' });
          return;
        }
        if (!adapters[file]?.[alias]) await readSource(file, cache);
        imports.set(name, fromChunk(file, alias, via));
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      // Reads and writes both count: `dH ??= …` only assigns dH, yet the module needs its declaration.
      const within = q => q.node.start >= p.node.start && q.node.end <= p.node.end;
      const deps = new Set(Object.entries(src.program.scope.bindings)
        .filter(([, b]) => b.referencePaths.some(within) || b.constantViolations.some(within)).map(([n]) => n));
      const dynamic = [];
      p.traverse({
        ImportExpression(r) { dynamic.push(r.node.source); },
        CallExpression(r) { if (r.node.callee.type === 'Import') dynamic.push(r.node.arguments[0]); },
      });
      for (const literal of dynamic) {
        const file = literal?.value?.replace(/^\.\//, '');
        const owner = modules.find(m => m.source === file && m.complete);
        if (!owner || literal.type !== 'StringLiteral') throw Error(`${spec.target}: dynamic import boundary ${name} -> ${literal?.value}`);
        rewrites.push({ binding: name, start: literal.start, end: literal.end, from: literal.value, to: `./${owner.target}` });
      }
      for (const dep of deps) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) await add(name);
    if (spec.complete) {
      const declared = src.program.node.body.flatMap(n => n.type === 'FunctionDeclaration' ? [n.id.name]
        : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name ?? '<pattern>') : []);
      const missing = declared.filter(n => !selected.has(n));
      if (missing.length) throw Error(`${spec.target}: unreachable original bindings ${missing.join(',')}`);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([name, p]) => {
      const { start, end } = p.node;
      let text = src.code.slice(start, end);
      for (const r of rewrites.filter(r => r.binding === name).sort((a, b) => b.start - a.start))
        text = text.slice(0, r.start - start) + JSON.stringify(r.to) + text.slice(r.end - start);
      return p.isVariableDeclarator() ? `var ${text};` : text;
    });
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-landing-texture.mjs.\n// Edit the extractor or src/source-landing-texture-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      ...(rewrites.length ? { rewrites: rewrites.map(({ binding, from, to }) => ({ binding, from, to })) } : {}),
      exports: spec.exports,
    });
    emitted.push({ spec, src });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output)).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Landing texture output set changed: ${present.join(',')}. Run scripts/extract-landing-texture.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Landing texture source mismatch: ${name}. Run scripts/extract-landing-texture.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} landing texture modules (${count} original ${referenceVersion} bindings).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractLandingTexture({ check: process.argv.includes('--check') });
