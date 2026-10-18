// Extract the 2.42304.0 originals lane R3b-tasks reuses for /subtask (tasks-05), without executing any desktop runtime:
//   cef1e6037 Sn (exported `g`, caec4a2d4 `Ot`): the provisional title of a subtask's session — the task's first six
//             words, at most 60 characters (59 + "…"); yn titles the fork with it before the generated title arrives.
//   c8f38bf1f i / r (exported `t` / `n`, cc43287c9 `$j`): "starts with a command" — `/` or `!` after any leading
//             whitespace, format characters (\p{Cf}) and invisible characters; the subtask refusal
//             "A subtask can’t start with a command…" (vYLcZuUvrF) asks it.
//   shared-182 nC (exported `Uf`): the invisible-character test c8f38bf1f r strips with, and shared-0 Hi (exported
//             `Py`), the lazy value both chunks build their regular expressions with.
//
// Every emitted binding is an original top-level declaration sliced from the minified chunk; each module's bindings
// are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Imports resolve through the
// source chunk's export table to another module generated here; anything else fails generation. Roots carry feature
// strings that must still appear in their original text, and each source chunk's own export table must still name
// them, so a version bump that re-points a minified name fails here instead of silently binding the wrong value.
// Output is prettier-formatted after assembly.
//
// D0: own generator, own output (src/generated/r3b-tasks/), own scripts/verify-gen-r3b-tasks.mjs.
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
const output = path.join(root, 'src/generated/r3b-tasks');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Emitted in dependency order. `exports` maps original local binding -> exported name (its keys are the roots);
// `officialExports` maps the chunk's own export alias -> the local it must still name; `features` pins each root (or,
// with `{ in, has }`, another top-level declaration of the chunk) to strings of its original (minified) text.
const modules = [
  { target: 'lazy-value.mjs', source: 'shared-0-ByI5P0CP.js', officialExports: { Py: 'Hi' },
    exports: { Hi: 'lazyValue' }, features: { Hi: ['let t,n=!1;return()=>(n||=(t=e(),!0),t)'] } },
  { target: 'invisible-character.mjs', source: 'shared-182-eT1kXtya.js', officialExports: { Uf: 'nC' },
    exports: { nC: 'isInvisibleCharacter' },
    features: { nC: ['return tC().test(e)', { in: 'tC', has: '[\\p{Cc}\\p{Default_Ignorable_Code_Point}\\uFFF9-\\uFFFB\\uD800-\\uDFFF]$/u' }] } },
  // The whole chunk: `complete` asserts every top-level declaration of c8f38bf1f is reached from the exports.
  { target: 'command-prefix.mjs', source: 'c8f38bf1f-D_EZalnr.js', complete: true, officialExports: { n: 'r', t: 'i' },
    exports: { r: 'stripLeadingInvisible', i: 'startsWithCommand' },
    features: { i: ['return/^[/!]/.test(r(e))'], r: ['!n().test(i)&&!t(i)', 'String.fromCodePoint(e.codePointAt(r)??0)'],
      n: ['/^[\\s\\p{Cf}]$/u'] } },
  { target: 'subtask-title.mjs', source: 'cef1e6037-8DivyY4m.js', officialExports: { g: 'Sn' },
    exports: { Sn: 'subtaskTitle' },
    features: { Sn: ['(e??"").trim().split(/\\s+/)', 'Array.from(t.slice(0,6).join(" "))', 'n.length>60?n.slice(0,59).join("")+"\\u2026":n.join("")'] } },
];

const exportTable = text => {
  const start = text.lastIndexOf('export{');
  if (start < 0) return new Map();
  const body = text.slice(start + 7, text.indexOf('}', start));
  return new Map(body.split(',').filter(Boolean).map(entry => {
    const [local, exported = local] = entry.split(' as ');
    return [exported.trim(), local.trim()];
  }));
};

async function readChunk(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const record = { name, bytes, code, ast, exported: exportTable(code), program: null };
  babel.traverse(ast, { Program(p) { record.program = p; p.stop(); } });
  cache.set(name, record);
  return record;
}

function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push(node);
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push(declarator);
  }
  if (hits.length !== 1) throw Error(`${chunk.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const declarationText = (chunk, name) => { const node = topLevel(chunk, name); return chunk.code.slice(node.start, node.end); };

function checkFeatures(chunk, local, features, label) {
  const text = declarationText(chunk, local);
  for (const feature of features) {
    if (typeof feature === 'string') { if (!text.includes(feature)) throw Error(`${label}: ${chunk.name}:${local} lacks ${JSON.stringify(feature)}`); continue; }
    if (!declarationText(chunk, feature.in).includes(feature.has)) throw Error(`${label}: ${chunk.name}:${feature.in} lacks ${JSON.stringify(feature.has)}`);
  }
}

async function extract(cache) {
  const emitted = []; // { spec, src }
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-tasks.mjs', modules: [] };
  const files = {};
  for (const spec of modules) {
    const src = await readChunk(spec.source, cache);
    for (const [exported, local] of Object.entries(spec.officialExports ?? {}))
      if (src.exported.get(exported) !== local) throw Error(`${spec.source}: official export ${exported} is ${src.exported.get(exported)}, not ${local}`);
    for (const [local, features] of Object.entries(spec.features)) checkFeatures(src, local, features, spec.target);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const resolve = async (file, alias, via) => {
      const dep = await readChunk(file, cache);
      const local = dep.exported.get(alias);
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (!owner) throw Error(`${spec.target}: unresolved import ${via}`);
      return { from: `./${owner.spec.target}`, name: owner.spec.exports[local], via: `${via} (${local})`, kind: 'generated' };
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      // A binding of the same chunk already emitted by an earlier module is imported, never duplicated.
      const sibling = emitted.find(m => m.spec.source === spec.source && m.spec.exports[name]);
      if (sibling) { imports.set(name, { from: `./${sibling.spec.target}`, name: sibling.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
        imports.set(name, await resolve(file, alias, `${file}:${alias}`));
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if ((p.isVariableDeclarator() ? p.parentPath.parentPath : p.parentPath)?.node !== src.program.node) throw Error(`${spec.target}: ${name} is not top-level`);
      selected.set(name, p);
      const within = q => q.node.start >= p.node.start && q.node.end <= p.node.end;
      let dynamic = false;
      p.traverse({ ImportExpression() { dynamic = true; }, CallExpression(r) { if (r.node.callee.type === 'Import') dynamic = true; } });
      if (dynamic) throw Error(`${spec.target}: ${name} has a dynamic import`);
      const deps = Object.entries(src.program.scope.bindings)
        .filter(([, b]) => b.referencePaths.some(within) || b.constantViolations.some(within)).map(([n]) => n);
      for (const dep of deps) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) await add(name);
    if (spec.complete) {
      const declared = src.ast.program.body.flatMap(n => n.type === 'FunctionDeclaration' ? [n.id.name]
        : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name ?? '<pattern>') : []);
      const missing = declared.filter(n => !selected.has(n));
      if (missing.length) throw Error(`${spec.target}: unreachable original bindings ${missing.join(',')}`);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => { const text = src.code.slice(p.node.start, p.node.end); return p.isVariableDeclarator() ? `var ${text};` : text; });
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by scripts/extract-r3b-tasks.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind })),
      exports: spec.exports,
    });
    emitted.push({ spec, src });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return files;
}

export async function extractR3bTasks({ check = false } = {}) {
  const files = await extract(new Map());
  if (check) {
    const present = (await fs.readdir(output)).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`r3b-tasks output set changed: ${present.join(',')}. Run scripts/extract-r3b-tasks.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`r3b-tasks source mismatch: ${name}. Run scripts/extract-r3b-tasks.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const manifest = JSON.parse(files['manifest.json']);
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} r3b-tasks modules (${count} original ${referenceVersion} bindings).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR3bTasks({ check: process.argv.includes('--check') });
