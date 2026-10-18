// Extract the 2.42304.0 main-process predicates the /btw auto-archive and the parent-archive cascade are built on,
// without executing any desktop runtime:
//   index.chunk-CFJssAFf.js  SD  (open PR of the session itself: `e.prs?.some(e => !e.inherited && !pe.o(e.state))`)
//                            wD  (side session sharing its parent's checkout: `spawnedFrom.sharedCheckout && sessionId`)
//   index.chunk-DzrvTkKz.js  t   (exported as `o`, read through CFJssAFf's `pe` namespace)
//   index.chunk-muI2IV6k.js  nwa (exported as `Oi`: merged or closed), twa (exported as `ki`: the PR state kind)
// The class methods that combine them (sideSessionSettled/archiveCascadeSettled/archiveCascadeOf/
// cascadeArchiveSideSessions) read the desktop's own session table and brokers; the host adapter in
// electron/btw-sessions.cjs reproduces those against the local config and core.
//
// The main-process chunks are CommonJS: `pe = require("./index.chunk-DzrvTkKz.js")` and DzrvTkKz's
// `e = require("./index.chunk-muI2IV6k.js")`. Each namespace member read by an emitted declaration is resolved through
// the target chunk's `Object.defineProperty(exports, …)` table, and the emitted module rebuilds exactly those members
// (`const pe = { o: t }`, `const e = { Oi: nwa }`). A renamed export or a re-pointed require fails generation instead
// of silently binding another value. The emitted text is then parsed and must have no unbound identifiers.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const output = path.join(root, 'electron/generated');
const target = 'btw-archive.mjs', manifestName = 'btw-archive-manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Emitted in dependency order. `namespaces` names a CommonJS require binding of the chunk and the members the emitted
// declarations read from it; each member must resolve, through the required chunk's export table, to a declaration
// emitted earlier in this list.
const chunks = [
  { file: 'index.chunk-muI2IV6k.js', bindings: ['twa', 'nwa'] },
  { file: 'index.chunk-DzrvTkKz.js', bindings: ['t'], namespaces: { e: { file: 'index.chunk-muI2IV6k.js', members: ['Oi'] } } },
  { file: 'index.chunk-CFJssAFf.js', bindings: ['SD', 'wD'], namespaces: { pe: { file: 'index.chunk-DzrvTkKz.js', members: ['o'] } } },
];
const exported = { twa: 'prStateKind', nwa: 'prStateSettled', SD: 'hasOpenOwnPullRequest', wD: 'sharesParentCheckout' };

async function readChunk(file, cache) {
  if (cache.has(file)) return cache.get(file);
  const bytes = await fs.readFile(path.join(source, file));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  // The chunk's export table: top-level `Object.defineProperty(exports, "<name>", { …, get: function () { return
  // <local>; } })` calls (a comma sequence at the end of the minified chunk).
  const exports = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ExpressionStatement') continue;
    const expressions = statement.expression.type === 'SequenceExpression' ? statement.expression.expressions : [statement.expression];
    for (const node of expressions) {
      if (node.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression' || node.callee.object?.name !== 'Object' ||
        node.callee.property?.name !== 'defineProperty' || node.arguments[0]?.name !== 'exports' || node.arguments[1]?.type !== 'StringLiteral') continue;
      const getter = node.arguments[2]?.properties?.find(p => p.key?.name === 'get')?.value;
      const returned = getter?.body?.body?.[0];
      if (returned?.type !== 'ReturnStatement' || returned.argument?.type !== 'Identifier') throw Error(`${file}: export ${node.arguments[1].value} has an unexpected getter`);
      if (exports.has(node.arguments[1].value)) throw Error(`${file}: export ${node.arguments[1].value} is defined twice`);
      exports.set(node.arguments[1].value, returned.argument.name);
    }
  }
  const record = { file, bytes, code, ast, exports };
  cache.set(file, record);
  return record;
}

function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator });
  }
  if (hits.length !== 1) throw Error(`${chunk.file}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}

function requiredFile(chunk, name) {
  const { kind, node } = topLevel(chunk, name);
  const init = node.init;
  if (kind !== 'declarator' || init?.type !== 'CallExpression' || init.callee?.name !== 'require' || init.arguments[0]?.type !== 'StringLiteral')
    throw Error(`${chunk.file}: ${name} is no longer a require() namespace`);
  return init.arguments[0].value.replace(/^\.\//, '');
}

// Members of `namespace` read inside the given declaration (only `namespace.member` reads are accepted).
function memberReads(chunk, node, namespace) {
  const reads = new Set();
  const visit = (value, parent) => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'Identifier' && value.name === namespace) {
      if (parent?.type !== 'MemberExpression' || parent.object !== value || parent.computed) throw Error(`${chunk.file}: ${namespace} is used other than as a member read`);
      reads.add(parent.property.name);
    }
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(item => visit(item, value)); else if (child && typeof child === 'object' && child.type) visit(child, value);
  };
  visit(node, null);
  return reads;
}

export async function extractBtwArchive({ check = false } = {}) {
  const cache = new Map(), emitted = new Map(); // local name -> chunk file
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-btw-archive.mjs', output: target, sources: [], bindings: {} };
  const blocks = [];
  for (const spec of chunks) {
    const chunk = await readChunk(spec.file, cache);
    const preludes = [];
    for (const [namespace, wanted] of Object.entries(spec.namespaces ?? {})) {
      const file = requiredFile(chunk, namespace);
      if (file !== wanted.file) throw Error(`${spec.file}: ${namespace} now requires ${file}, not ${wanted.file}`);
      const dependency = await readChunk(file, cache);
      const members = wanted.members.map(member => {
        const local = dependency.exports.get(member);
        if (!local || emitted.get(local) !== file) throw Error(`${spec.file}: ${namespace}.${member} does not resolve to an emitted ${file} binding`);
        return `${member}: ${local}`;
      });
      preludes.push({ namespace, text: `const ${namespace} = { ${members.join(', ')} };`, members: wanted.members, file });
    }
    const texts = spec.bindings.map(name => {
      const { kind, node } = topLevel(chunk, name);
      for (const prelude of preludes) {
        const reads = memberReads(chunk, node, prelude.namespace);
        for (const member of reads) if (!prelude.members.includes(member)) throw Error(`${spec.file}: ${name} reads unmapped ${prelude.namespace}.${member}`);
      }
      emitted.set(name, spec.file);
      manifest.bindings[name] = { source: spec.file, ...(exported[name] ? { exportedAs: exported[name] } : {}) };
      const text = chunk.code.slice(node.start, node.end);
      return kind === 'function' ? text : `var ${text};`;
    });
    // A declaration's own namespace reads are rebuilt just before it, after the members it maps to were emitted.
    blocks.push(`// ${spec.file}`, ...preludes.map(p => `// ${p.namespace} = require("./${p.file}")\n${p.text}`), ...texts);
    manifest.sources.push({ file: path.relative(root, path.join(source, spec.file)), sourceSha256: sha(chunk.bytes), bindings: spec.bindings,
      ...(preludes.length ? { namespaces: Object.fromEntries(preludes.map(p => [p.namespace, { file: p.file, members: p.members }])) } : {}) });
  }
  const exports = `export { ${Object.entries(exported).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
  const text = await format(`// Original Claude Desktop ${referenceVersion} main-process bindings; generated by scripts/extract-btw-archive.mjs.\n${blocks.join('\n')}\n${exports}\n`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it.
  const ast = babel.babelParse(text, 'btw-archive.mjs', true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); } });
  if (globals.length) throw Error(`${target}: unbound ${globals.join(', ')}`);
  manifest.sha256 = sha(text);
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    if (await fs.readFile(path.join(output, target), 'utf8') !== text) throw Error(`btw archive predicates mismatch: ${target}`);
    if (await fs.readFile(path.join(output, manifestName), 'utf8') !== manifestText) throw Error(`btw archive manifest mismatch: ${manifestName}`);
  } else {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, target), text);
    await fs.writeFile(path.join(output, manifestName), manifestText);
  }
  return { text, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractBtwArchive({ check: process.argv.includes('--check') });
  console.log(process.argv.includes('--check') ? 'Original /btw archive predicates verified.' : 'Extracted original /btw archive predicates.');
}
