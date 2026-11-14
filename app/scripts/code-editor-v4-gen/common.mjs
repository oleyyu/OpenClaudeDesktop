// Shared helpers for extract-code-editor-v4.mjs and its area modules (code-editor-v4-gen/<area>.mjs), 4.16336.0
// contract (OpenClaude v0.3 -> Claude 4.16336.0, frozen snapshot reference/snapshots/claude-4.16336.0-20261104).
// Staged double output (round 2, unit code-editor:a): src/generated/code-editor stays the 3.6556.2 production graph that
// scripts/extract-code-editor.mjs keeps writing byte for byte; this graph is src/generated/code-editor-v4 and writes no
// electron/generated copy (each area records the production copy targets as `copyTargets`, the cutover list).
//
// Source bases: 'ion' = ion-dist/assets/v1 and 'asar' = asar/.vite/build of official-4.16336.0.mjs; 'ion@3.6556.2' and
// 'asar@3.6556.2' are only read to prove a chunk byte-identical across the two snapshots (identicalChunks below).
//
// Roots are located by AST, never by a pinned minified name: locate() returns the one top-level declaration of a chunk
// whose raw text contains the probe (and every feature); its raw declaration sha256 must equal the pin the area module
// records. closure() follows the official program-scope references (babel scope bindings, reads and writes) from the
// roots to every top-level declaration they need, and reports the imports they reach; an import is followed into its
// producer chunk through that chunk's export alias (no name is guessed). A top-level statement that is not a declaration
// but reads or writes a selected binding stops generation (its side effect would be lost).
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../../tools/node_modules/prettier/index.mjs';
import babel from '../../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { ionSource, asarSource, previousIonSource, previousAsarSource, referenceVersion, referenceSnapshot } from '../official-4.16336.0.mjs';

export { fs, path, parsers, format, referenceVersion, referenceSnapshot };
export const root = path.resolve(import.meta.dirname, '../..');
export const outputLabel = 'src/generated/code-editor-v4';
export const output = path.join(root, outputLabel);
export const bases = Object.freeze({ ion: ionSource, asar: asarSource, 'ion@3.6556.2': previousIonSource, 'asar@3.6556.2': previousAsarSource });
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function baseDir(base) {
  const dir = bases[base];
  if (!dir) throw Error(`Unknown code-editor-v4 source base ${base}`);
  return dir;
}
export function sourceRef(name, bytes, base) {
  if (base !== 'ion' && base !== 'asar') throw Error(`code-editor-v4 adapters read only the 4.16336.0 snapshot (${name} from ${base})`);
  return { name, sha256: sha(bytes), base };
}

// Three chunks are byte-identical in 3.6556.2 and 4.16336.0 (region plan: c8187a2dc, cf80fba0c, c25d7186f; same file
// names). The areas that slice them (side-chat yf, preview-sketch D / T) reuse them as they are; the driver proves the
// identity every run (both snapshots must hash to the pin) and records them in manifest.identicalChunks.
export const identicalChunks = Object.freeze({
  'c8187a2dc-Dp9Zia_4.js': '6e06053ae85c95fd91033c1f5044b44d2efcf6c1755061aafe35de274389217f',
  'cf80fba0c-CT5qqVq9.js': '574ad3d88136d8ed6d49adae1507f740cc62637e0cbd9fe0fb103606d7408012',
  'c25d7186f-CHE_J2eY.js': 'c9b3c57bc6d37f46187cfc489bcb56cb4afdda36404303f2acac5877f52e8a10',
});
export async function verifyIdenticalChunks() {
  const out = [];
  for (const [name, pin] of Object.entries(identicalChunks)) {
    const now = await fs.readFile(path.join(baseDir('ion'), name)), before = await fs.readFile(path.join(baseDir('ion@3.6556.2'), name));
    if (!now.equals(before)) throw Error(`${name} is no longer byte-identical in 3.6556.2 and 4.16336.0`);
    if (sha(now) !== pin) throw Error(`${name} changed: sha256 ${sha(now)} (pinned ${pin})`);
    out.push({ name, sha256: pin, snapshots: ['3.6556.2', referenceVersion], base: 'ion' });
  }
  return out;
}

function patternNames(p) {
  if (!p) return [];
  if (p.type === 'Identifier') return [p.name];
  if (p.type === 'ObjectPattern') return p.properties.flatMap(q => patternNames(q.type === 'RestElement' ? q.argument : q.value));
  if (p.type === 'ArrayPattern') return p.elements.flatMap(patternNames);
  if (p.type === 'AssignmentPattern') return patternNames(p.left);
  if (p.type === 'RestElement') return patternNames(p.argument);
  throw Error(`Unsupported binding pattern ${p.type}`);
}
function requiredChunk(init) {
  if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier' || init.callee.name !== 'require' || init.arguments.length !== 1) return null;
  const arg = init.arguments[0];
  return arg.type === 'StringLiteral' && arg.value.startsWith('./') ? arg.value.slice(2) : null;
}
// Parsed official chunk (cached per base:name): raw text, babel AST, program scope, top-level declarations,
// imports (local -> { from, imported }) and exports (alias -> local).
const chunkCache = new Map();
export function chunk(name, base) {
  const key = `${base}:${name}`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const bytes = fsSync.readFileSync(path.join(baseDir(base), name)), text = bytes.toString();
  const ast = babel.babelParse(text, name, true);
  const top = new Map(), imports = new Map(), exports = new Map(), statements = [], exportStatements = new Set();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const s of node.specifiers) imports.set(s.local.name, { from: node.source.value.replace(/^\.\//, ''), imported: s.type === 'ImportNamespaceSpecifier' ? '*' : s.imported?.name ?? s.imported?.value ?? 'default' });
    } else if (node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source) {
      for (const s of node.specifiers) exports.set(s.exported.name ?? s.exported.value, s.local.name);
    } else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) {
      top.set(node.id.name, { local: node.id.name, statement: node, node, text: text.slice(node.start, node.end) });
    } else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        // CommonJS main-process chunk: `<local>=require("./<chunk>")` is a namespace import; members read as `<local>.<m>`.
        const required = requiredChunk(d.init);
        if (required && d.id.type === 'Identifier') { imports.set(d.id.name, { from: required, imported: '*', cjs: true }); continue; }
        for (const local of patternNames(d.id)) top.set(local, { local, statement: node, node: d, kind: node.kind, text: text.slice(d.start, d.end) });
      }
    } else {
      statements.push(node);
      let onlyExports = true;
      // CommonJS export: Object.defineProperty(exports,"<alias>",{enumerable:!0,get:function(){return <local>}})
      (function exportsOf(n) {
        if (!n) return;
        if (n.type === 'ExpressionStatement') return exportsOf(n.expression);
        if (n.type === 'SequenceExpression') return n.expressions.forEach(exportsOf);
        if (n.type !== 'CallExpression' || n.callee.type !== 'MemberExpression' || n.callee.object.name !== 'Object' || n.callee.property.name !== 'defineProperty' || n.arguments[0]?.name !== 'exports') { onlyExports = false; return; }
        const alias = n.arguments[1]?.value, getter = n.arguments[2]?.properties?.find(q => q.key?.name === 'get')?.value;
        const ret = getter?.body?.body?.[0];
        if (typeof alias === 'string' && getter?.body?.body?.length === 1 && ret?.type === 'ReturnStatement' && ret.argument?.type === 'Identifier') exports.set(alias, ret.argument.name);
        else onlyExports = false;
      })(node);
      if (onlyExports) exportStatements.add(node);
    }
  }
  let scope = null;
  babel.traverse(ast, { Program(p) { scope = p.scope; p.stop(); } });
  const record = { name, base, bytes, text, ast, top, imports, exports, statements, exportStatements, scope, source: sourceRef(name, bytes, base) };
  chunkCache.set(key, record);
  return record;
}
// The parsed chunks (text, babel AST and program scope) and their dependency edges are kept for one area only: the
// driver releases them after each area (extractCodeEditorV4), so a full run (prepare:ui's verify-gen-code-editor-v4)
// holds one area's chunks at a time instead of all six areas' (the desktop main-process index.chunk-*.js ASTs stayed
// alive through the five renderer areas: ~4.9 GB retained, past the default 4 GB heap). A chunk asked for again is
// parsed again from the same bytes, so the output is unchanged.
export function releaseChunkCaches() {
  chunkCache.clear();
  edgesCache.clear();
}
export function readSource(name, base) {
  const c = chunk(name, base);
  return { bytes: c.bytes, text: c.text, source: c.source };
}
// Raw declaration text as emitted: functions/classes as written, declarators with their original kind.
export function declarationText(c, local) {
  const entry = c.top.get(local);
  if (!entry) throw Error(`${c.name} has no top-level declaration ${local}`);
  return entry.kind ? `${entry.kind} ${entry.text};` : entry.text;
}
export const declarationSha = (c, local) => sha(c.top.get(local).text);

// The one top-level declaration whose raw text contains `probe` (or, for a declaration with no distinctive token, whose
// whole raw text matches `pattern`) and every raw `features` entry. `alias` (when given) is the chunk export alias it
// must carry (null = not exported).
export function locate(name, base, { probe, pattern, features = [], alias }) {
  const c = chunk(name, base);
  if ((probe === undefined) === (pattern === undefined)) throw Error(`${name}: locate needs exactly one of probe / pattern`);
  const label = probe !== undefined ? `probe ${JSON.stringify(probe)}` : `pattern ${pattern}`;
  const seenNodes = new Set();
  const hits = [...c.top.values()].filter(entry => {
    if (seenNodes.has(entry.node)) return false;
    seenNodes.add(entry.node);
    return probe !== undefined ? entry.text.includes(probe) : pattern.test(entry.text);
  });
  if (hits.length !== 1) throw Error(`${name}: ${label} matches ${hits.length} top-level declarations (${hits.map(h => h.local).join(', ')})`);
  const [hit] = hits;
  for (const feature of features) if (!hit.text.includes(feature)) throw Error(`${name}#${hit.local}: feature ${JSON.stringify(feature)} missing`);
  if (alias !== undefined) {
    const actual = [...c.exports].find(([, local]) => local === hit.local)?.[0] ?? null;
    if (actual !== alias) throw Error(`${name}#${hit.local}: export alias ${actual} (expected ${alias})`);
  }
  return hit.local;
}
// Locate and check the pinned declaration sha256 (pins are the area module's, no refresh script exists).
export function locatePinned(name, base, spec) {
  const local = locate(name, base, spec);
  const actual = declarationSha(chunk(name, base), local);
  if (actual !== spec.sha256) throw Error(`${name}#${local} (${spec.probe !== undefined ? 'probe ' + JSON.stringify(spec.probe) : 'pattern ' + spec.pattern}) declaration changed: sha256 ${actual} (pinned ${spec.sha256})`);
  return local;
}
export function exportedLocal(name, base, alias) {
  const local = chunk(name, base).exports.get(alias);
  if (!local) throw Error(`${name} does not export ${alias}`);
  return local;
}

// Owning top-level declaration name of a position (null for a non-declaration statement).
function ownerAt(c, pos) {
  for (const entry of c.top.values()) if (pos >= entry.node.start && pos < entry.node.end) return entry.local;
  for (const s of c.statements) if (pos >= s.start && pos < s.end) return { statement: s };
  return undefined;
}
const mutatingCalls = new Set(['defineProperty', 'defineProperties', 'assign', 'setPrototypeOf', 'freeze', 'seal', 'preventExtensions']);
const mutatingMethods = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
function mutates(ref) {
  let path = ref;
  while (path.parentPath?.node.type === 'MemberExpression' && path.parentPath.node.object === path.node) path = path.parentPath;
  const parent = path.parentPath?.node;
  if (path !== ref) {
    if ((parent?.type === 'AssignmentExpression' && parent.left === path.node) || parent?.type === 'UpdateExpression' || (parent?.type === 'UnaryExpression' && parent.operator === 'delete')) return true;
    const member = path.node.property;
    if (parent?.type === 'CallExpression' && parent.callee === path.node && member?.type === 'Identifier' && mutatingMethods.has(member.name)) return true;
  }
  const call = ref.parentPath?.node;
  return call?.type === 'CallExpression' && call.arguments[0] === ref.node && call.callee.type === 'MemberExpression' && call.callee.object.name === 'Object' && mutatingCalls.has(call.callee.property.name);
}
// Program-scope dependency edges: declaration -> top-level names (declarations or imports) it reads or writes.
const edgesCache = new Map();
function edges(c) {
  const key = `${c.base}:${c.name}`;
  if (edgesCache.has(key)) return edgesCache.get(key);
  const out = new Map(), fromStatements = new Map(), members = new Map();
  for (const [bound, binding] of Object.entries(c.scope.bindings)) {
    const cjs = c.imports.get(bound)?.cjs;
    const violations = new Set(binding.constantViolations);
    for (const ref of [...binding.referencePaths, ...binding.constantViolations]) {
      const owner = ownerAt(c, ref.node.start);
      // A top-level statement that only reads a binding (calls a function, reads a table) leaves it as declared; one that
      // reassigns it or mutates its value does not (mutates: a member assignment/update/delete through it, a mutating
      // Object.* call or collection method on it).
      if (owner && typeof owner === 'object' && !violations.has(ref) && !mutates(ref)) continue;
      if (cjs && typeof owner === 'string') {
        // A CommonJS namespace is only ever read as `<ns>.<member>`; the member is the import.
        const parent = ref.parent;
        if (parent?.type !== 'MemberExpression' || parent.object !== ref.node || parent.computed || parent.property.type !== 'Identifier')
          throw Error(`${c.name}#${owner} reads the CommonJS namespace ${bound} other than as a member`);
        if (!members.has(owner)) members.set(owner, new Map());
        members.get(owner).set(`${bound}.${parent.property.name}`, { from: c.imports.get(bound).from, imported: parent.property.name, namespace: bound });
        continue;
      }
      if (owner && typeof owner === 'object' && c.exportStatements.has(owner.statement)) continue;
      if (owner && typeof owner === 'object') {
        if (!fromStatements.has(bound)) fromStatements.set(bound, []);
        fromStatements.get(bound).push(c.text.slice(owner.statement.start, Math.min(owner.statement.end, owner.statement.start + 120)));
        continue;
      }
      if (!owner || owner === bound) continue;
      if (!out.has(owner)) out.set(owner, new Set());
      out.get(owner).add(bound);
    }
  }
  const result = { out, fromStatements, members };
  edgesCache.set(key, result);
  return result;
}
// Closure of `roots` inside one chunk: declarations in source order and the imports reached.
// `stop` lists top-level locals not followed (the caller supplies them, e.g. a host transport).
export function closure(name, base, roots, { stop = [], imports: extraImports } = {}) {
  const c = chunk(name, base), { out, fromStatements, members } = edges(c);
  const seen = new Set(), imports = new Map(extraImports ?? []), stopped = new Map(), queue = roots.map(local => [local, null]);
  while (queue.length) {
    const [local, by] = queue.shift();
    if (stop.includes(local)) { if (!stopped.has(local)) stopped.set(local, new Set()); stopped.get(local).add(by ?? '(root)'); continue; }
    if (seen.has(local)) continue;
    if (c.imports.has(local)) {
      if (c.imports.get(local).cjs) throw Error(`${name}: the CommonJS namespace ${local} is a root; name its member`);
      imports.set(local, c.imports.get(local)); continue;
    }
    if (!c.top.has(local)) throw Error(`${name}: ${local} is not a top-level declaration or import`);
    seen.add(local);
    for (const next of out.get(local) ?? []) if (!c.imports.get(next)?.cjs) queue.push([next, local]);
    for (const [key, value] of members.get(local) ?? []) imports.set(key, value);
  }
  for (const local of seen) if (fromStatements.has(local)) throw Error(`${name}#${local} is reassigned or mutated by a top-level statement (${fromStatements.get(local)[0]}); its side effect would be lost`);
  const order = [...c.top.keys()];
  const locals = [...seen].sort((a, b) => c.top.get(a).node.start - c.top.get(b).node.start || order.indexOf(a) - order.indexOf(b));
  return { chunk: c, locals, imports, stopped };
}
// Text of a closure: its declarations in source order (a multi-declarator statement stays one statement when every
// declarator is selected, so declaration order and kind are the official ones).
export function closureText(cl) {
  const c = cl.chunk, wanted = new Set(cl.locals), parts = [], done = new Set();
  for (const local of cl.locals) {
    const entry = c.top.get(local);
    if (done.has(entry.statement) || done.has(entry.node)) continue;
    if (entry.kind) {
      const all = entry.statement.declarations.flatMap(d => patternNames(d.id));
      if (all.every(n => wanted.has(n))) { parts.push(c.text.slice(entry.statement.start, entry.statement.end).replace(/;?$/, ';')); done.add(entry.statement); continue; }
    }
    done.add(entry.node);
    parts.push(declarationText(c, local));
  }
  return parts.join('\n');
}
// A cross-chunk slice: the root chunk's closure plus, for every import it reaches, the producer's closure of the
// exported local, to a fixpoint (each chunk once, with the union of the locals its consumers read). Every producer chunk
// is emitted once, producers first, inside its own block scope bound to a namespace constant named after the chunk file
// (`$c_<chunk>`: an arrow function returning the locals its consumers read), so minified names of different chunks never
// collide; a consumer's import locals are bound by destructuring that namespace. The root chunk's declarations are top
// level. `provided` maps `chunk -> export alias -> host expression` for an import the host supplies (none so far).
// Returns { text, sources, bindings } (bindings: per chunk the declarations copied, for manifest modules[].bindings and
// the D1 gate).
export const namespaceOf = file => '$c_' + file.replace(/\.js$/, '').replace(/[^\w$]/g, '_');
export function slice(name, base, roots, { stop = [], provided = {}, imports: rootImports } = {}) {
  const wanted = new Map([[name, new Set(roots)]]), closures = new Map(), deps = new Map();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, set] of [...wanted]) {
      const cl = closure(file, base, [...set], file === name ? { stop, imports: rootImports } : {});
      closures.set(file, cl);
      const uses = new Map();
      for (const [local, { from, imported }] of cl.imports) {
        if (provided[from]?.[imported] !== undefined) continue;
        if (imported === '*' || imported === 'default') throw Error(`${file}: ${imported} import of ${from} is not supported`);
        const producerLocal = exportedLocal(from, base, imported);
        const producer = chunk(from, base), binding = producer.scope.bindings[producerLocal];
        if (binding && !binding.constant) throw Error(`${from}#${producerLocal} is reassigned at run time; a copied snapshot would not be a live binding`);
        if (!uses.has(from)) uses.set(from, []);
        uses.get(from).push([local, producerLocal]);
        if (!wanted.has(from)) wanted.set(from, new Set());
        if (!wanted.get(from).has(producerLocal)) { wanted.get(from).add(producerLocal); changed = true; }
      }
      deps.set(file, uses);
    }
  }
  const order = [], state = new Map();
  (function visit(file, trail) {
    if (state.get(file) === 'done') return;
    if (state.get(file) === 'active') throw Error(`Chunk import cycle: ${[...trail, file].join(' -> ')}`);
    state.set(file, 'active');
    for (const from of deps.get(file).keys()) visit(from, [...trail, file]);
    state.set(file, 'done');
    order.push(file);
  })(name, []);
  const bindings = [], sources = [], blocks = [];
  for (const file of order) {
    const cl = closures.get(file), c = cl.chunk;
    sources.push(c.source);
    for (const local of cl.locals) bindings.push({ name: local, file, sha256: declarationSha(c, local) });
    const head = [];
    for (const [from, pairs] of deps.get(file)) {
      const named = pairs.filter(([local]) => !local.includes('.'));
      if (named.length) head.push(`const {${named.map(([local, l]) => (local === l ? local : `${l}:${local}`)).join(',')}}=${namespaceOf(from)};`);
    }
    const namespaces = new Map();
    for (const [key, { from, imported, namespace }] of cl.imports) if (namespace) {
      if (!namespaces.has(namespace)) namespaces.set(namespace, []);
      namespaces.get(namespace).push(`${imported}:${namespaceOf(from)}.${exportedLocal(from, base, imported)}`);
    }
    for (const [namespace, members] of namespaces) head.push(`const ${namespace}={${members.sort().join(',')}};`);
    for (const [local, { from, imported }] of cl.imports) if (provided[from]?.[imported] !== undefined) head.push(`const ${local}=${provided[from][imported]};`);
    const body = [...head, closureText(cl)].join('\n');
    if (file === name) blocks.push(body);
    else blocks.push(`// ${file}\nconst ${namespaceOf(file)}=(()=>{\n${body}\nreturn {${[...wanted.get(file)].sort().join(',')}};\n})();`);
  }
  return { text: blocks.join('\n'), sources, bindings, stopped: closures.get(name).stopped };
}

// Methods of a large official host class, reduced to what a set of root methods needs. The class is the one ClassBody
// declaring every `anchors` method (its name is not pinned). From `roots`, every `this.<member>` the methods read (an AST
// member of the method's own `this`; nested non-arrow functions have their own) is followed: a class method is
// included, a `host` member is left to the caller's wrapper, any other member is instance state, initialised exactly as
// the official constructor initialises it (its `this.<field>=<expr>` assignment, in constructor order; a field the
// constructor does not set starts undefined, as in the official class). Returns the method texts (class order), the
// constructor initialisers, and the top-level names / CommonJS members the methods and initialisers read.
export function classMethods(name, base, { anchors, roots, host = [] }) {
  const c = chunk(name, base), bodies = [];
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) walk(child); return; }
    if (node.type === 'ClassBody' && anchors.every(a => node.body.some(m => m.type === 'ClassMethod' && m.key?.name === a))) bodies.push(node);
    for (const key in node) if (key !== 'loc' && key !== 'leadingComments' && key !== 'trailingComments' && node[key] && typeof node[key] === 'object') walk(node[key]);
  })(c.ast.program);
  if (bodies.length !== 1) throw Error(`${name}: expected one class declaring ${anchors.join(', ')}, found ${bodies.length}`);
  const methods = new Map();
  for (const m of bodies[0].body) {
    if (m.type !== 'ClassMethod' || m.computed || m.key.type !== 'Identifier') continue;
    const prior = methods.get(m.key.name);
    if (prior && !(prior.length === 1 && new Set([prior[0].kind, m.kind]).size === 2 && [prior[0].kind, m.kind].every(k => k === 'get' || k === 'set'))) throw Error(`${name}: class member ${m.key.name} is declared twice`);
    methods.set(m.key.name, [...(prior ?? []), m]);
  }
  const thisMembers = node => {
    const found = [];
    (function walk(n, own) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { for (const child of n) walk(child, own); return; }
      if (n !== node && (n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration' || n.type === 'ClassMethod' || n.type === 'ClassProperty' || n.type === 'ObjectMethod')) own = false;
      if (own && n.type === 'MemberExpression' && n.object.type === 'ThisExpression') {
        if (n.computed || n.property.type !== 'Identifier') throw Error(`${name}: computed this-member in ${node.key?.name}`);
        found.push(n.property.name);
      }
      for (const key in n) if (key !== 'loc' && key !== 'leadingComments' && key !== 'trailingComments' && n[key] && typeof n[key] === 'object') walk(n[key], own);
    })(node, true);
    return found;
  };
  const included = new Set(), hostUsed = new Set(), fields = new Set(), queue = [...roots];
  while (queue.length) {
    const member = queue.shift();
    if (host.includes(member)) { hostUsed.add(member); continue; }
    if (included.has(member) || fields.has(member)) continue;
    const m = methods.get(member);
    if (!m) { fields.add(member); continue; }
    if (member === 'constructor') throw Error(`${name}: a root method reads this.constructor`);
    included.add(member);
    for (const node of m) queue.push(...thisMembers(node));
  }
  for (const r of roots) if (!included.has(r)) throw Error(`${name}: root ${r} is not a class method`);
  const ctor = methods.get('constructor')?.[0], inits = new Map();
  for (const statement of ctor?.body.body ?? []) {
    const list = statement.type === 'ExpressionStatement' ? (statement.expression.type === 'SequenceExpression' ? statement.expression.expressions : [statement.expression]) : [];
    for (const e of list) if (e.type === 'AssignmentExpression' && e.operator === '=' && e.left.type === 'MemberExpression' && e.left.object.type === 'ThisExpression' && !e.left.computed && fields.has(e.left.property.name)) {
      if (inits.has(e.left.property.name)) throw Error(`${name}: constructor sets ${e.left.property.name} twice`);
      inits.set(e.left.property.name, e);
    }
  }
  const params = new Set((ctor?.params ?? []).flatMap(patternNames));
  const ranges = [...[...included].flatMap(n => methods.get(n)), ...inits.values()];
  const refs = new Set(), imports = new Map();
  for (const [bound, binding] of Object.entries(c.scope.bindings)) {
    for (const ref of [...binding.referencePaths, ...binding.constantViolations]) {
      if (!ranges.some(r => ref.node.start >= r.start && ref.node.end <= r.end)) continue;
      const cjs = c.imports.get(bound)?.cjs;
      if (!cjs) { refs.add(bound); continue; }
      const parent = ref.parent;
      if (parent?.type !== 'MemberExpression' || parent.object !== ref.node || parent.computed || parent.property.type !== 'Identifier') throw Error(`${name}: class methods read the CommonJS namespace ${bound} other than as a member`);
      imports.set(`${bound}.${parent.property.name}`, { from: c.imports.get(bound).from, imported: parent.property.name, namespace: bound });
    }
  }
  for (const e of inits.values()) {
    const text = c.text.slice(e.right.start, e.right.end);
    for (const p of params) if (new RegExp(`(?<![\\w$.])${p.replace(/\$/g, '\\$')}(?![\\w$])`).test(text)) throw Error(`${name}: constructor initialiser of ${e.left.property.name} reads constructor parameter ${p}`);
  }
  const ordered = [...methods.keys()].filter(n => included.has(n));
  const methodText = bodies[0].body.filter(m => m.type === 'ClassMethod' && !m.computed && included.has(m.key?.name)).map(m => c.text.slice(m.start, m.end)).join('\n');
  return {
    methods: ordered, methodText, fieldInits: [...inits.values()].map(e => c.text.slice(e.start, e.end)), fields: [...fields].sort(), hostUsed: [...hostUsed].sort(),
    refs: [...refs], imports, sha256: sha(methodText),
  };
}

// One area's recorder: adapter() formats and records an output; copyTarget() records the production electron/generated
// copy the 3.6556.2 graph writes for it (not written here: the cutover list). Bytes stay in memory (outputs) so --check
// never reads back what it has not written.
export function createAreaContext(area) {
  const adapters = [], copyTargets = [], outputs = new Map();
  // ownedState: `file#local` -> why this graph holds the one copy of that module state (D1 gate ownedStateReasons);
  // every key must be one of the adapter's bindings.
  async function adapter(name, text, { sources, bindings, realm = 'renderer', productionRealms = [realm], previous, roots = {}, ownedState }) {
    if (outputs.has(name)) throw Error(`${area} emits ${name} twice`);
    for (const key of Object.keys(ownedState ?? {})) if (!bindings.some(b => `${b.file}#${b.name}` === key)) throw Error(`${name}: ownedState ${key} is not one of its bindings`);
    const formatted = await format(text, { parser: 'babel' });
    outputs.set(name, Buffer.from(formatted));
    adapters.push({ name, sha256: sha(formatted), referenceVersion, realm, productionRealms, sources, roots, bindings, ...(ownedState ? { ownedState } : {}), ...(previous ? { previous } : {}) });
  }
  function copyTarget(name, target) {
    if (!outputs.has(name)) throw Error(`Copy target of ${name} before it was generated in area ${area}`);
    copyTargets.push({ name, target, written: false });
  }
  return { area, adapters, copyTargets, outputs, adapter, copyTarget, locate, locatePinned, closure, slice, classMethods, chunk, readSource, exportedLocal };
}

// Area record written to src/generated/code-editor-v4/areas/<area>.json.
export function areaRecord(ctx) {
  const seen = new Set(), sources = [];
  for (const entry of ctx.adapters) for (const ref of entry.sources) {
    const key = `${ref.base}:${ref.name}`;
    if (!seen.has(key)) { seen.add(key); sources.push(ref); }
  }
  return { area: ctx.area, referenceVersion, adapters: ctx.adapters, copyTargets: ctx.copyTargets, sources };
}
