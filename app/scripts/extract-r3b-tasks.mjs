// Extract the 4.16336.0 originals lane R3b-tasks reuses for /subtask (tasks-05), without executing any desktop runtime.
// History: 2.42304.0 -> 3.6556.2 (w1-routines-a, RC-21); 3.6556.2 -> 4.16336.0 (region batch 2a, region-plan batch 4:
// no generated area links this one and the only consumer is the host's src/r3b-tasks-subtask.mjs, which imports the
// same file and export names, so production moved directly; the 3.6556.2 generator is kept in
// analysis/claude-4.16336.0-migrate-20261104/regions/batch2a/r3b-tasks/before/).
//
// 4.16336.0 roots (3.6556.2 names in parentheses):
//   cef1e6037 yr (Bn; exported `v`, was `_`): the provisional title of a subtask's session. New in 4.16336.0: leading
//             `@"<path>"` mentions (shared-5 ID, exported `Ml`) are taken off first and kept as their base names
//             (shared-92 mk, exported `_p`); the title is the first six words of the rest, else those names joined by
//             ", ", at most 60 characters (59 + "…"), and undefined when nothing is left. caec4a2d4 Xn (the fork) calls
//             it as `un(e.sendInBackground?.text)` (pinned below as a call site).
//   c8f38bf1f (whole chunk; was r / i): 4.16336.0 splits "skip leading characters" into a(e, pred) and has two
//             variants. o (`r`) / s (`t`): skip whitespace, format characters (\p{Cf}) and invisible characters
//             (shared-212 M_, exported `bb`), then `/` or `!` -> the 3.6556.2 r / i. c (`i`) / l (`n`): the same, also
//             skipping the hidden characters shared-212 kv (exported `ob`: invisible, \p{Cf}, private use, U+2800,
//             U+FFFC, U+1D159, …). The /subtask refusal "A subtask can’t start with a command…" (vYLcZuUvrF) in
//             cc43287c9 calls l (`import{…,n as QC}`, `if(s&&c&&QC(c))`, pinned below), so startsWithCommand is l.
//   shared-212 M_ (nm; exported `bb`, was shared-182 `Vv`): the invisible-character test; its regular expression now
//             excludes \n \r \t. kv (exported `ob`): the hidden-character test c / l use.
//   shared-0 Tl (Pa; exported `nS`, was `Lb`): the lazy value the chunks build their regular expressions with.
//             routines-shared holds only the 3.6556.2 copy, so (region-plan resliceInsteadOfLink) it is cut here
//             again: a pure function, no module state.
//
// Wave 8 (cds-integrate/wave8 W8-RT, round3 integrate-gates notFixed r3b-tasks-subtask:98): r3b-tasks is the one owner
// of these bindings in the 4.16336.0 graphs (D1 survey: converge on r3b-tasks). Other graphs link them instead of cutting
// them again, so each module also exports, under its original local (`linkExports`, recorded in the manifest), the
// non-root locals of its closure that those graphs reach: shared-212 j_ / yv / Cv / Dv (the invisible / hidden character
// expressions and tests kv reads), c8f38bf1f r / i / a (the whitespace test, the skip predicate and the skip loop). A
// linkExports local must be one of the module's own sliced bindings (not an import), else generation stops.
//
// Every emitted binding is an original top-level declaration sliced from the minified chunk bytes; each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked. Imports resolve
// through the source chunk's export table to another module generated here; anything else fails generation. Roots
// carry feature strings (R2: `{ loose }` goes through official-4.16336.0 looseFeature) that must still appear in their
// original text, each source chunk's own export table must still name them, and every root must be the only top-level
// declaration of its chunk carrying its features (`reads`: and reading a same-chunk declaration that carries those).
// `callSites` pin the official callers: the call is located by AST in the calling chunk and its import alias must
// resolve to the root, so a version bump that re-points a minified name fails here instead of binding the wrong value.
//
// cds-core (sharedGraph): its manifest must be on 4.16336.0 / this snapshot and its modules must match their recorded
// bytes and sources. A binding cds-core publishes is linked, never cut again (its raw declaration must hash as
// cds-core's); a binding it holds without a publicName stops generation when it is module state (Context / Map / Set /
// WeakMap / WeakSet, D46) and is otherwise re-cut only when its declaration hashes as cds-core's (heldByCdsCore).
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
import * as official from './official-4.16336.0.mjs';

const { referenceVersion, referenceSnapshot, ionSource: source, looseFeature: loose } = official;
const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const output = path.join(generatedRoot, 'r3b-tasks');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sharedGraphArea = 'cds-core';

// Emitted in dependency order. `exports` maps original local binding -> exported name (its keys are the roots);
// `officialExports` maps the chunk's own export alias -> the local it must still name; `features` pins each root to
// strings of its original (minified) text; `{ in, has }` pins another top-level declaration of the chunk; `{ reads }`
// requires the root to reference a same-chunk declaration carrying those features (it disambiguates a shape family).
export const modules = Object.freeze([
  { target: 'lazy-value.mjs', source: 'shared-0-CnnWnVrT.js', officialExports: { nS: 'Tl' },
    exports: { Tl: 'lazyValue' }, features: { Tl: [{ loose: 'let t,n=!1;return()=>(n||=(t=e(),!0),t)' }] } },
  { target: 'invisible-character.mjs', source: 'shared-212-BHMAi0oa.js', officialExports: { bb: 'M_', ob: 'kv' },
    exports: { M_: 'isInvisibleCharacter', kv: 'isHiddenCharacter' }, linkExports: ['j_', 'yv', 'Cv', 'Dv'],
    features: {
      // shared-212 has several `return x().test(e)` testers; M_ is the one reading the invisible-character expression.
      M_: [{ loose: 'function M_(e){return j_().test(e)}' }, { reads: ['/^(?![\\n\\r\\t])[\\p{Cc}\\p{Default_Ignorable_Code_Point}\\uFFF9-\\uFFFB\\uD800-\\uDFFF]$/u'] }],
      kv: [{ loose: 'return M_(e)||yv().test(e)||Cv(e)||Dv(e.codePointAt(0)??0)' }, { in: 'yv', has: '/^\\p{Cf}$/u' },
        { in: 'Cv', has: 't===10240||t===65532||t===119129' }],
    } },
  { target: 'mention-prefix.mjs', source: 'shared-5-u8kha2eH.js', officialExports: { Ml: 'ID' },
    exports: { ID: 'quotedMentionPrefix' }, features: { ID: ['/^@"([^"\\n]+)"([ \\n]|$)/'] } },
  { target: 'path-basename.mjs', source: 'shared-92-BOgyxePb.js', officialExports: { _p: 'mk' },
    exports: { mk: 'pathBasename' }, features: { mk: [{ loose: 'let t=e.startsWith("/")?"/":/[\\\\/]/;return e.split(t).filter(Boolean).pop()??e' }] } },
  // The whole chunk: `complete` asserts every top-level declaration of c8f38bf1f is reached from the exports.
  { target: 'command-prefix.mjs', source: 'c8f38bf1f-B4N4qS0l.js', complete: true,
    officialExports: { r: 'o', t: 's', i: 'c', n: 'l' },
    exports: { o: 'stripLeadingInvisible', s: 'startsWithCommandAfterInvisible', c: 'stripLeadingHidden', l: 'startsWithCommand' },
    linkExports: ['r', 'i', 'a'],
    features: {
      o: [{ loose: 'return a(e,i)' }, { in: 'i', has: 'return r().test(e)||t(e)' }, { in: 'r', has: '/^[\\s\\p{Cf}]$/u' },
        { in: 'a', has: 'String.fromCodePoint(e.codePointAt(n)??0)' }],
      c: [{ loose: 'return a(e,e=>i(e)||n(e))' }],
      s: ['/^[/!]/.test(', { loose: 'return/^[/!]/.test(o(e))' }, { reads: [{ loose: 'return a(e,i)' }] }],
      l: ['/^[/!]/.test(', { loose: 'return/^[/!]/.test(c(e))' }, { reads: [{ loose: 'return a(e,e=>i(e)||n(e))' }] }],
    } },
  { target: 'subtask-title.mjs', source: 'cef1e6037-Dm5Rlsox.js', officialExports: { v: 'yr' },
    exports: { yr: 'subtaskTitle' },
    features: { yr: ['(e??"").trim()', '.trim().split(/\\s+/).slice(0,6).join(" ")', { loose: 'for(let e=n.match(Xe);e;e=n.match(Xe))t.push(Oe(e[1]))' },
      { loose: 'if(r==="")return;' }, { loose: 'i.length>60?i.slice(0,59).join("")+"\\u2026":i.join("")' }] } },
]);

// The official callers of the roots /subtask uses. `caller` imports `alias` of `from` (the root's chunk); exactly one
// call of that import must match (`ifConsequentHas`: the call is in the test of an `if` whose consequent carries the
// string; `argumentHas`: the call's argument text carries it), and the alias must name `root` in `from`'s export table.
export const callSites = Object.freeze([
  { caller: 'cc43287c9-dzfX-J5i.js', from: 'c8f38bf1f-B4N4qS0l.js', root: 'l', ifConsequentHas: 'vYLcZuUvrF',
    why: 'the /subtask send handler refuses a task that starts with a command' },
  { caller: 'caec4a2d4-BQDPvHyW.js', from: 'cef1e6037-Dm5Rlsox.js', root: 'yr', argumentHas: 'sendInBackground?.text',
    why: 'the background fork is titled with the task' },
]);

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
const topLevelNames = chunk => chunk.ast.program.body.flatMap(n => n.type === 'FunctionDeclaration' ? [n.id.name]
  : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name ?? '<pattern>') : []);
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// The same-chunk top-level bindings a declaration references.
const reads = (chunk, name) => {
  const p = chunk.program.scope.getBinding(name)?.path;
  if (!p) return [];
  return Object.entries(chunk.program.scope.bindings).filter(([n, b]) => n !== name && b.referencePaths.some(q => within(p, q))).map(([n]) => n);
};

// A feature: a literal string, `{ loose }`, `{ in, has }` (another declaration carries `has`) or `{ reads }`.
function featureHolds(chunk, local, text, feature) {
  if (typeof feature === 'string') return text.includes(feature);
  if ('loose' in feature) return loose(feature.loose).test(text);
  if ('reads' in feature) return reads(chunk, local).some(n => {
    let t; try { t = declarationText(chunk, n); } catch { return false; }
    return feature.reads.every(f => featureHolds(chunk, n, t, f));
  });
  return declarationText(chunk, feature.in).includes(feature.has);
}
function checkFeatures(chunk, local, features, label) {
  const text = declarationText(chunk, local);
  for (const feature of features)
    if (!featureHolds(chunk, local, text, feature)) throw Error(`${label}: ${chunk.name}:${local} lacks ${JSON.stringify(feature)}`);
}
// The root is the only top-level declaration of its chunk carrying every own feature (`in` features name fixed
// declarations and do not locate the root).
function assertUniqueRoot(chunk, local, features, label) {
  const own = features.filter(f => typeof f === 'string' || 'loose' in f || 'reads' in f);
  if (!own.length) throw Error(`${label}: root ${local} has no features to locate it by`);
  const hits = topLevelNames(chunk).filter(n => {
    let text; try { text = declarationText(chunk, n); } catch { return false; }
    return own.every(f => featureHolds(chunk, n, text, f));
  });
  if (hits.length !== 1 || hits[0] !== local) throw Error(`${label}: root ${local} is not the unique declaration of ${chunk.name} with its features (${hits.join(', ') || 'none'})`);
}

// A call site: exactly one call of `from`'s import in `caller` matches, and its alias names `root` in `from`.
async function locateCallSite(site, cache) {
  const caller = await readChunk(site.caller, cache), from = await readChunk(site.from, cache);
  const imported = new Map();
  for (const node of caller.ast.program.body)
    if (node.type === 'ImportDeclaration' && node.source.value === `./${site.from}`)
      for (const s of node.specifiers) if (s.type === 'ImportSpecifier') imported.set(s.local.name, s.imported.name);
  if (!imported.size) throw Error(`call site ${site.caller}: no import of ${site.from}`);
  const hits = [];
  babel.traverse(caller.ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type !== 'Identifier' || !imported.has(callee.name)) return;
      if (caller.program.scope.getBinding(callee.name)?.path.isImportSpecifier() !== true) return;
      if (p.scope.getBinding(callee.name) !== caller.program.scope.getBinding(callee.name)) return;
      let ok = false;
      if (site.ifConsequentHas) {
        const owner = p.findParent(q => q.isIfStatement());
        ok = !!owner && within(owner.get('test'), p) && caller.code.slice(owner.node.consequent.start, owner.node.consequent.end).includes(site.ifConsequentHas);
      } else if (site.argumentHas) {
        ok = p.node.arguments.some(a => caller.code.slice(a.start, a.end).includes(site.argumentHas));
      }
      if (ok) hits.push({ local: callee.name, alias: imported.get(callee.name), text: caller.code.slice(p.node.start, p.node.end) });
    },
  });
  if (hits.length !== 1) throw Error(`call site ${site.caller} -> ${site.from}: expected one matching call, found ${hits.length}`);
  const [hit] = hits, local = from.exported.get(hit.alias);
  if (local !== site.root) throw Error(`call site ${site.caller}: ${hit.text} calls ${site.from}:${hit.alias} (${local}), not ${site.root}`);
  return { caller: site.caller, callerSha256: sha(caller.bytes), from: site.from, alias: hit.alias, local: hit.local, root: site.root, call: hit.text, why: site.why };
}

// sharedGraph cds-core (4.16336.0): version, snapshot, module bytes and sources checked; held bindings and publicNames.
async function sharedGraph() {
  const dir = path.join(generatedRoot, sharedGraphArea);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${sharedGraphArea} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  if (manifest.referenceSnapshot !== referenceSnapshot) throw Error(`${sharedGraphArea} snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) throw Error(`${sharedGraphArea}/${m.target} is ${m.referenceVersion}, expected ${referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${sharedGraphArea}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(source, path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${sharedGraphArea}/${m.target} was not sliced from the ${referenceVersion} ${m.source}`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !entry.exportName || exported !== entry.exportName)
      throw Error(`${sharedGraphArea} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { held, published };
}
// Module state a second copy would split (D46): a React context, or a module-level WeakMap / Map / Set / WeakSet.
function isModuleState(chunk, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = chunk.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier() && callee.parent.source.value === `./${official.vendorFrame}`
      && official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
  }
  return false;
}

async function extract(cache, specs = modules, sites = callSites) {
  const emitted = []; // { spec, src }
  const graph = await sharedGraph();
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-tasks.mjs', sharedGraph: sharedGraphArea,
    // Not `referenceVersion`: the audit reads every such key as a source of this graph.
    migratedFrom: { version: official.previousVersion, generator: 'analysis/claude-4.16336.0-migrate-20261104/regions/batch2a/r3b-tasks/before/extract-r3b-tasks.mjs' },
    callSites: [], modules: [] };
  const files = {};
  for (const spec of specs) {
    const src = await readChunk(spec.source, cache);
    for (const [exported, local] of Object.entries(spec.officialExports ?? {}))
      if (src.exported.get(exported) !== local) throw Error(`${spec.source}: official export ${exported} is ${src.exported.get(exported)}, not ${local}`);
    for (const local of Object.keys(spec.exports))
      if (![...src.exported.values()].includes(local)) throw Error(`${spec.target}: root ${local} is no longer exported by ${spec.source}`);
    for (const [local, features] of Object.entries(spec.features)) {
      checkFeatures(src, local, features, spec.target);
      if (spec.exports[local]) assertUniqueRoot(src, local, features, spec.target);
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const resolve = async (file, alias, via) => {
      const dep = await readChunk(file, cache);
      const local = dep.exported.get(alias);
      const shared = local && graph.published.get(`${file}#${local}`);
      if (shared) return { from: `../${sharedGraphArea}/${shared.target}`, name: shared.exportName, via: `${via} (${local})`, kind: 'shared-graph' };
      const owner = local && emitted.find(m => m.spec.source === file && m.spec.exports[local]);
      if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
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
      const text = src.code.slice(p.node.start, p.node.end), key = `${spec.source}#${name}`;
      const shared = graph.published.get(key), held = graph.held.get(key);
      if (shared) {
        // One copy of a CDS name: link the published binding (a root is re-exported under its semantic name).
        if (held?.sha256 !== sha(text)) throw Error(`${spec.target}: ${key} differs from the declaration ${sharedGraphArea} publishes as ${shared.name}`);
        imports.set(name, { from: `../${sharedGraphArea}/${shared.target}`, name: shared.exportName, via: key, kind: 'shared-graph', linkedSha256: held.sha256 });
        return;
      }
      if (held) {
        if (isModuleState(src, p)) throw Error(`module state ${sharedGraphArea} holds without a semantic name (add it to ${sharedGraphArea} publicNames, D46): ${spec.target}: ${key}`);
        if (held.sha256 !== sha(text)) throw Error(`${spec.target}: ${key} differs from the declaration ${sharedGraphArea}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      selected.set(name, p);
      let dynamic = false;
      p.traverse({ ImportExpression() { dynamic = true; }, CallExpression(r) { if (r.node.callee.type === 'Import') dynamic = true; } });
      if (dynamic) throw Error(`${spec.target}: ${name} has a dynamic import`);
      const deps = Object.entries(src.program.scope.bindings)
        .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
      for (const dep of deps) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) await add(name);
    if (spec.complete) {
      const missing = topLevelNames(src).filter(n => !selected.has(n));
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
    const linkExports = spec.linkExports ?? [];
    for (const local of linkExports) {
      if (Object.hasOwn(spec.exports, local)) throw Error(`${spec.target}: linkExports ${local} is a root (exported as ${spec.exports[local]})`);
      if (!selected.has(local)) throw Error(`${spec.target}: linkExports ${local} is not one of its sliced bindings`);
    }
    const exportText = `export { ${[...Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`), ...linkExports].join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by scripts/extract-r3b-tasks.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module is closed: everything it reads is declared or imported (the originals read no host global).
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !['String', 'Array', 'Boolean'].includes(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(src.code.slice(p.node.start, p.node.end)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports, ...(spec.linkExports ? { linkExports: [...spec.linkExports] } : {}), officialExports: spec.officialExports, heldByCdsCore,
    });
    emitted.push({ spec, src });
  }
  for (const site of sites) manifest.callSites.push(await locateCallSite(site, cache));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return files;
}

// `modules` / `callSites` replace the contract only in check mode (the tests' fail-stop cases); a write always uses it.
export async function extractR3bTasks({ check = false, modules: specs = modules, callSites: sites = callSites } = {}) {
  if (!check && (specs !== modules || sites !== callSites)) throw Error('r3b-tasks: a replaced contract is only checked, never written');
  const files = await extract(new Map(), specs, sites);
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
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
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} r3b-tasks modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR3bTasks({ check: process.argv.includes('--check') });
