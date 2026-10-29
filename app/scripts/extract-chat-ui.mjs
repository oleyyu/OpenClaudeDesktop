// Chat area (src/generated/chat), migrated to Claude Desktop 3.6556.2 (w10-chat-gen; research/w10-chat.md §2–§3, R1/R2/R4,
// E34/E36/E42/D1). Official chunks are only read and parsed, never executed.
//
// Until 3.6556.2 this generator copied 63 modules of the 2.2553.1 bundle. Only four bindings of that slice were still on
// a live path; the rest was dead or test-only (data/w10-chat-module-map.json). The 3.6556.2 slice is those four, from
// the files that now hold them:
//   vendor-intl-DYfox5Co.js  Ht  createIntl             react-intl's createIntl (formatjs core At under it); host
//                                                       createIntl callers (code-start, routines, env notice).
//   shared-9-CM21XrJw.js     wD  ideaPreviewClass       the Chat composer Ideas preview class: one literal of wD
//                                                       (`text-muted-as-secondary`; 2.2553.1 shared-14 ZP: text-muted).
//   cbcaf521a-CrWJ5SHy.js    e   HandBlocksDef          the HandBlocks pictogram data (byte-identical to 2.2553.1; E36:
//                                                       same file name, no shim).
//   shared-104-CTONUSaz.js   _x  sessionLiveStatus      a session's live status (awaiting / running / idle); a pure
//                                                       function, so plain node can import the file (E42).
//
// Legacy shims (E34): another generator's output that still imports a 2.2553.1 chat file by its old name and minified
// export gets a re-export file under that name, pointing at the one 3.6556.2 copy of the same binding (D1). The set of
// names is derived from the actual import statements in src/generated/*/ (not chat itself); a name outside `legacyTable`
// is an error, and a file nothing imports any more is not written. Host files and tests never use the shims (R4).
// w11-sweep-rest: current-chat retired its last ../chat/ imports (w10-curchat-retire), so the table is empty and the
// root and adapter that served only its vendor-intl $t shim (react-intl FormattedRelativeTime `en`, inner `$t` ->
// HomeRelativeTime) are gone; the derivation still runs, so a new legacy import fails here instead of shipping.
//
// `node scripts/extract-chat-ui.mjs` writes the folder (removing every file it no longer emits), `--check` compares it
// (scripts/verify-chat-ui.mjs).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseAst } from 'rolldown/parseAst';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/chat');
const generatedRoot = path.join(root, 'src/generated');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VI = official.vendorIntl, S9 = 'shared-9-CM21XrJw.js', S104 = 'shared-104-CTONUSaz.js', HB = 'cbcaf521a-CrWJ5SHy.js';

// Every chunk a closure may enter; leaving them is an error, and so is a listed chunk no closure enters.
const files = new Set([VI, S104, HB]);
// vendor-frame re-exports React; each alias is checked against official.reactAliases (R3).
const vendor = { [official.vendorFrame]: official.reactAliases };
// Same-chunk declarations the host answers. `features` must occur in the declaration's minified text. None now.
const chunkAdapters = {};

// Roots. `export` is the chunk's own export alias of `local`; `expect` (R2/E5) pins strings of the declaration's
// minified text, `{ in, has }` a string of another declaration the closure must reach, `{ raw }` a string the chunk
// must hold exactly once. `statements` are top-level statements emitted after the declarations (exact minified text).
// `alias` adds further export names of `local`.
const roots = [
  { source: VI, local: 'Ht', export: 'u', name: 'createIntl',
    expect: ['({defaultRichTextElements:e,...t},n)=>', 'formatMessage:Vt.bind(null,a,i.formatters)', { in: 'At', has: 'Missing locale data for locale' }] },
  { source: S104, local: '_x', export: 'ml', name: 'sessionLiveStatus',
    expect: ['e.liveStatus==="awaiting"?"awaiting"', 'e.pendingToolPermissions?.length?"awaiting"', 'e.isRunning?"running":"idle"'] },
  { source: HB, local: 'e', export: 'HandBlocksDef', name: 'HandBlocksDef', alias: ['e'],
    expect: ['name:"HandBlocks"', 'highlight:[', 'line:['] },
];
// One string literal of a top-level declaration (`owner`), copied verbatim: exactly one string literal of the owner
// starts with `prefix`, and it must contain each `expect` string.
const literals = [
  { source: S9, owner: 'wD', name: 'ideaPreviewClass', prefix: 'animate-preview-prompt-in line-clamp-2',
    expect: ['text-muted-as-secondary'] },
];
// E34 legacy shims: old 2.2553.1 chat file -> { old export: [module relative to src/generated/chat, semantic name] }.
// `check` confirms the target still publishes that name for the same official binding. Empty since w11-sweep-rest: the
// three entries (vendor-intl-Cf4IuK3L $t, shared-frame-C_2npUJq X, shared-8-B5xbG2px vl) served current-chat only.
const legacyTable = {};

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = babel.babelParse(code, name, true);
  const exported = new Map(), top = new Map(), statements = [];
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') for (const s of node.specifiers) exported.set(s.exported.name, s.local.name);
    else if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default', form: s.type });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) top.set(d.id.type === 'Identifier' ? d.id.name : `#pattern@${d.start}`, { kind: d.id.type === 'Identifier' ? 'var' : 'pattern', node: d });
    else if (node.type === 'ExpressionStatement') statements.push(node);
  }
  const record = { name, bytes, code, ast, exported, top, statements, deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
function globalsOf(text, label) {
  const ast = babel.babelParse(text, label, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  return globals;
}
function declarationDeps(src, name) {
  if (!src.deps.has(name)) src.deps.set(name, globalsOf(emittedText(src, src.top.get(name)), `${src.name}#${name}`).filter(n => n !== name && src.top.has(n)));
  return src.deps.get(name);
}
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'RangeError', 'String', 'Boolean', 'Set', 'Map',
  'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise', 'RegExp', 'Reflect', 'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl',
  'undefined', 'Infinity', 'NaN', 'isNaN', 'console', 'process', 'arguments', 'parseFloat', 'SyntaxError', 'BigInt']);

// Named imports of src/generated/chat/<file> by every other generated folder (E34: the legacy names are derived, not
// guessed). Returns Map(file -> Map(name -> [importer, ...])).
async function chatImporters() {
  const found = new Map();
  const walk = async dir => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (full !== output) await walk(full); continue; }
      if (!/\.(?:m?js|jsx)$/.test(entry.name)) continue;
      const code = await fs.readFile(full, 'utf8');
      if (!code.includes('chat/')) continue;
      const program = parseAst(code, { lang: entry.name.endsWith('.jsx') ? 'jsx' : 'js' }, full);
      for (const node of program.body) {
        if (!['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) || !node.source) continue;
        const target = path.resolve(path.dirname(full), node.source.value);
        if (path.dirname(target) !== output) continue;
        const importer = path.relative(root, full), file = path.basename(target);
        const names = node.type === 'ExportAllDeclaration' ? null
          : node.specifiers.map(s => (node.type === 'ImportDeclaration'
            ? (s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : null)
            : (s.local.name ?? s.local.value)));
        if (!names || names.includes(null) || (node.type === 'ImportDeclaration' && node.specifiers.length === 0))
          throw Error(`${importer}: only named imports of src/generated/chat/${file} are supported`);
        if (!found.has(file)) found.set(file, new Map());
        for (const name of names) {
          if (!found.get(file).has(name)) found.get(file).set(name, []);
          found.get(file).get(name).push(importer);
        }
      }
    }
  };
  await walk(generatedRoot);
  return found;
}

// The legacy targets must still be the published copy of the same binding.
async function checkLegacyTarget(target, name) {
  if (target.startsWith('./')) return;
  if (target === '../view-tabs/shared-frame-6jtSkIit.js') {
    const manifest = await viewTabsManifestFor(referenceVersion);
    const entry = manifest.publicNames?.[name];
    if (entry?.file !== path.basename(target)) throw Error(`view-tabs does not publish ${name} from ${path.basename(target)}`);
    return;
  }
  if (target === '../code-composer/chat-composer-dock.mjs') {
    const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, 'code-composer/manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`code-composer is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    const module = manifest.modules.find(m => m.target === path.basename(target));
    if (!module || !Object.values(module.exports ?? {}).includes(name)) throw Error(`code-composer ${path.basename(target)} does not export ${name}`);
    return;
  }
  throw Error(`legacy target ${target} has no check`);
}

export async function extractChatUi({ check = false } = {}) {
  const cache = new Map();
  const modules = new Map();
  const used = new Set();
  const moduleFor = file => {
    if (!modules.has(file)) modules.set(file, { file, seen: new Set(), selected: new Map(), imports: new Map(), exportsAs: new Map(), publicNames: new Map(), aliases: new Map(), statements: [], literals: new Map() });
    return modules.get(file);
  };
  async function resolveImport(m, name, entry, via) {
    const key = `${entry.file}:${entry.alias}`;
    if (entry.form !== 'ImportSpecifier') throw Error(`${m.file}#${name}: unsupported import form ${entry.form} of ${entry.file}`);
    const dep = await readSource(entry.file, cache);
    const target = vendor[entry.file]?.[entry.alias];
    if (target) {
      official.assertVendorAlias(dep.code, entry.alias, target);
      m.imports.set(name, { from: target[0], name: target[1], via: key, kind: 'react' });
      return;
    }
    if (entry.file === official.vendorFrame) throw Error(`${m.file}#${name}: vendor-frame ${entry.alias} is not a React alias (via ${via})`);
    const local = dep.exported.get(entry.alias);
    if (!local) throw Error(`${m.file}#${name}: ${key} is not exported`);
    if (!files.has(entry.file)) throw Error(`${m.file}#${name} would enter ${entry.file}: ${key} = ${local} (via ${via})`);
    const t = moduleFor(entry.file);
    t.exportsAs.set(local, entry.alias);
    m.imports.set(name, { from: `./${entry.file}`, name: entry.alias, via: key, kind: 'generated', original: local });
    await add(t, local, `${m.file}#${name}`);
  }
  async function add(m, name, via) {
    if (m.seen.has(name)) return;
    m.seen.add(name);
    const src = await readSource(m.file, cache);
    const entry = src.top.get(name);
    if (!entry) throw Error(`${m.file}: unbound ${name} (via ${via})`);
    if (entry.kind === 'import') return resolveImport(m, name, entry, via);
    const key = `${m.file}#${name}`, own = chunkAdapters[key];
    if (own) {
      used.add(key);
      const text = declarationText(src, entry);
      const missing = own.features.filter(f => !text.includes(f));
      if (missing.length) throw Error(`chunk adapter ${key} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
      m.imports.set(name, { from: own.from, name: own.name, via: key, kind: 'adapter', original: name });
      return;
    }
    if (entry.kind === 'pattern') throw Error(`${key}: destructuring declaration (via ${via})`);
    if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key}: dynamic import (via ${via})`);
    m.selected.set(name, entry);
    for (const dep of declarationDeps(src, name)) await add(m, dep, key);
  }
  function assertExpect(label, src, m, entry, expect) {
    if (!expect?.length) throw Error(`${label} has no expect strings`);
    const text = declarationText(src, entry);
    for (const f of expect) {
      if (typeof f === 'string') { if (!text.includes(f)) throw Error(`${label} lacks ${JSON.stringify(f)}`); continue; }
      if (f.raw !== undefined) {
        const count = src.code.split(f.raw).length - 1;
        if (count !== 1) throw Error(`${label}: ${JSON.stringify(f.raw)} occurs ${count} times in ${src.name}, expected 1`);
        continue;
      }
      const other = m.selected.get(f.in);
      if (!other) throw Error(`${label}: the closure does not reach ${f.in}`);
      if (!declarationText(src, other).includes(f.has)) throw Error(`${label}: ${f.in} lacks ${JSON.stringify(f.has)}`);
    }
  }

  // Legacy importers (none while legacyTable is empty: any import of a non-emitted chat file fails).
  const importers = await chatImporters();
  const legacy = {};
  const emitted = new Set([...roots.map(r => r.source), ...literals.map(l => l.source)]);
  for (const [file, names] of [...importers].sort(([a], [b]) => a.localeCompare(b))) {
    if (emitted.has(file)) continue; // a 3.6556.2 output itself; its names are checked after generation
    const table = legacyTable[file];
    if (!table) throw Error(`${[...names.values()].flat().join(', ')} import${''} src/generated/chat/${file}, which is neither emitted nor a known legacy file`);
    legacy[file] = {};
    for (const [name, by] of [...names].sort(([a], [b]) => a.localeCompare(b))) {
      if (!table[name]) throw Error(`${by.join(', ')} import ${name} from legacy src/generated/chat/${file}; it is not in legacyTable`);
      await checkLegacyTarget(...table[name]);
      legacy[file][name] = { from: table[name][0], name: table[name][1], importers: [...new Set(by)].sort() };
    }
  }
  for (const r of roots) {
    const src = await readSource(r.source, cache);
    const entry = src.top.get(r.local);
    if (!entry || entry.kind === 'import' || entry.kind === 'pattern') throw Error(`root ${r.name}: ${r.source}#${r.local} is not a declaration`);
    if (src.exported.get(r.export) !== r.local) throw Error(`root ${r.name}: ${r.source} exports ${r.export} as ${src.exported.get(r.export)}, not ${r.local}`);
    const m = moduleFor(r.source);
    m.publicNames.set(r.local, r.name);
    for (const alias of r.alias ?? []) m.aliases.set(alias, r.local);
    await add(m, r.local, 'root');
    assertExpect(`root ${r.name} (${r.source}#${r.local})`, src, m, entry, r.expect);
    for (const text of r.statements ?? []) {
      const found = src.statements.filter(s => src.code.slice(s.start, s.end).replace(/;$/, '') === text);
      if (found.length !== 1) throw Error(`root ${r.name}: statement ${JSON.stringify(text)} found ${found.length} times`);
      m.statements.push(found[0]);
    }
  }
  for (const l of literals) {
    const src = await readSource(l.source, cache);
    const entry = src.top.get(l.owner);
    if (!entry || entry.kind === 'import' || entry.kind === 'pattern') throw Error(`literal ${l.name}: ${l.source}#${l.owner} is not a declaration`);
    const matches = [];
    babel.traverse(src.ast, { StringLiteral(p) {
      if (p.node.start >= entry.node.start && p.node.end <= entry.node.end && p.node.value.startsWith(l.prefix)) matches.push(p.node);
    } });
    if (matches.length !== 1) throw Error(`Expected one source literal ${l.source}:${l.owner}:${l.name}, found ${matches.length}`);
    for (const f of l.expect) if (!matches[0].value.includes(f)) throw Error(`literal ${l.name} lacks ${JSON.stringify(f)}`);
    moduleFor(l.source).literals.set(l.name, { owner: l.owner, node: matches[0], expect: l.expect });
  }
  for (const [key, adapter] of Object.entries(chunkAdapters)) {
    const [file] = key.split('#');
    if (modules.has(file) && !used.has(key)) throw Error(`chunk adapter ${key} is no longer reached; drop it`);
  }
  for (const file of files) if (!modules.has(file)) throw Error(`chunk ${file} is listed but no longer entered; drop it`);

  const out = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-ui.mjs',
    publicNames: {}, modules: [], legacy: {},
  };
  for (const m of [...modules.values()].sort((a, b) => a.file.localeCompare(b.file))) {
    const src = await readSource(m.file, cache);
    const selected = [...m.selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const groups = new Map();
    for (const [local, entry] of m.imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const exportNames = new Map();
    for (const [local, alias] of m.exportsAs) exportNames.set(alias, local);
    for (const [local, name] of m.publicNames) {
      if (exportNames.has(name) && exportNames.get(name) !== local) throw Error(`${m.file}: export ${name} collides`);
      exportNames.set(name, local);
    }
    for (const [alias, local] of m.aliases) exportNames.set(alias, local);
    for (const name of m.literals.keys()) exportNames.set(name, name);
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const body = [
      ...selected.map(([, e]) => emittedText(src, e)),
      ...m.statements.map(s => `${src.code.slice(s.start, s.end).replace(/;$/, '')};`),
      ...[...m.literals].map(([name, l]) => `var ${name} = ${src.code.slice(l.node.start, l.node.end)};`),
    ].join('\n');
    const exportText = `export { ${[...exportNames].map(([name, local]) => (name === local ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${m.file}; generated by extract-chat-ui.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${body}\n${exportText}\n`, { parser: 'babel' });
    const unbound = globalsOf(text, m.file).filter(name => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${m.file}: unbound ${unbound.join(', ')}`);
    out[m.file] = text;
    for (const [local, name] of m.publicNames) {
      const r = roots.find(x => x.source === m.file && x.local === local);
      manifest.publicNames[name] = { file: m.file, local, export: r.export, expect: r.expect };
    }
    for (const [name, l] of m.literals)
      manifest.publicNames[name] = { file: m.file, literal: true, owner: l.owner, start: l.node.start, end: l.node.end, expect: l.expect };
    manifest.modules.push({
      source: m.file, target: m.file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: selected.map(([name, e]) => ({ name, sha256: sha(declarationText(src, e)) })),
      literals: [...m.literals].map(([name, l]) => ({ name, owner: l.owner, start: l.node.start, end: l.node.end })),
      statements: m.statements.map(s => src.code.slice(s.start, s.end)),
      imports: [...m.imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: Object.fromEntries(exportNames),
    });
  }
  // Names other generated folders import from a 3.6556.2 output must exist there.
  for (const [file, names] of importers) {
    if (!out[file]) continue;
    const exported = new Set(Object.keys(manifest.modules.find(x => x.target === file).exports));
    for (const [name, by] of names) if (!exported.has(name)) throw Error(`${by.join(', ')} import ${name} from src/generated/chat/${file}, which does not export it`);
  }
  for (const [file, entries] of Object.entries(legacy)) {
    const groups = new Map();
    for (const [name, e] of Object.entries(entries)) {
      if (!groups.has(e.from)) groups.set(e.from, []);
      groups.get(e.from).push(`${e.name} as ${name}`);
    }
    const text = await format(`// Legacy 2.2553.1 name(s) over the ${referenceVersion} binding(s) (E34); generated by extract-chat-ui.mjs for\n`
      + `// ${[...new Set(Object.values(entries).flatMap(e => e.importers))].join(', ')}. Removed when no generated folder imports this file.\n`
      + [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n')
      + `\nexport { ${Object.keys(entries).join(', ')} };\n`, { parser: 'babel' });
    out[file] = text;
    manifest.legacy[file] = { referenceVersion: '2.2553.1', sha256: sha(text), exports: entries };
  }
  out['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';

  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(out).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected))
      throw Error(`Chat UI output set changed: on disk ${present.join(',')}; expected ${expected.join(',')}. Run scripts/extract-chat-ui.mjs.`);
    for (const [name, text] of Object.entries(out))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Chat UI source mismatch: ${name}. Run scripts/extract-chat-ui.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in out)) await fs.rm(path.join(output, name), { recursive: true });
    for (const [name, text] of Object.entries(out)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} chat UI: ${manifest.modules.length} ${referenceVersion} modules (${count} bindings, ${Object.keys(manifest.publicNames).length} public names), ${Object.keys(manifest.legacy).length} legacy shims.`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractChatUi({ check: process.argv.includes('--check') });
