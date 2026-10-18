// Extract the 2.42304.0 originals the /btw side-session pane (cccc2cf0a jT) needs for its approval focus hand-back
// (NBS-6), without executing any desktop runtime:
//   ccf527892 o  (exported `t`): the "card left after a keyboard decision" hook. jT passes onFocusHandBack to the
//                approval area Oo (c96d752d0), whose card slot qj watches each drawn card with Kj → this hook and hands
//                focus back to the composer when the decision left focus nowhere.
//   shared-frame cn (exported `fd`): the document-level stray-Enter guard qj installs after a card leaves (Rre), and
//                lc (exported `vl`): Element-or-null of an event target.
//   cae42d46f m  (exported `t`): the modifier keys that do not count as a keyboard decision.
//   shared-0 _e  (exported `xx`): the stable event callback the hook reads its handler through.
//   shared-25 dp (exported `Pf`): the owner window of a node, else the global window.
//   c227f4d5e Xw (exported `Fc`): focus is lost (activeElement null or body), qj's `sf`.
//   shared-11 v_ (exported `un`) and x_ (exported `in`) (NBS-5): the shown-session registry. cccc2cf0a KO calls
//                v_(btw child, true) while the session tile shows a /btw child: it marks the child read once and keeps
//                it in the `__` list, which x_ (the turn-result path, ce401cf8e) consults before marking a session
//                unread.
//   shared-11 df (exported `Rr`) (NBS-4): whether a session can be detached to top level, cccc2cf0a RO's
//                `p = Sa(sessions, id)` per side-chat tab (with lf/cf: not archived, not a side session sharing its
//                parent's checkout, and a lineage parent in the nest map); the tab menu LO offers "Detach to top level"
//                only then.
//
// A spec's `host` entries replace a same-chunk declaration the originals read with a host adapter import (shared-11
// y_, the persisted renderer unread store, and h_, the window's pane-session set): the replaced declaration must still
// carry its feature strings and its hash is recorded, so a changed store shape fails generation.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source, and each
// module's bindings are the reachable same-chunk closure of its roots (Babel scope analysis). Imports resolve through
// the source chunk's import declaration and the dependency's export table to either a module emitted earlier here or a
// verified React export of vendor-frame (`local=<ns>.<hook>`), so a renamed or re-pointed minified alias fails
// generation instead of silently binding another value. Each root carries feature strings of its original text, and
// every emitted module must be closed apart from a fixed list of host globals.
//
// D0: own generator, own output folder (src/generated/btw-pane), own scripts/verify-gen-btw-pane.mjs.
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
const output = path.join(root, 'src/generated/btw-pane');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const react = { 'vendor-frame-DfPJ1QmD.js': { Co: 'useState', So: 'useRef', mo: 'useEffect', yo: 'useLayoutEffect' } };
// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
const modules = [
  { target: 'owner-window.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { dp: 'ownerWindowOrGlobal' },
    features: { dp: ['globalThis.window'] } },
  { target: 'use-event.mjs', source: 'shared-0-ByI5P0CP.js', exports: { _e: 'useEvent' },
    features: { _e: ['t.current = e'] } },
  { target: 'focus-guard.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { cn: 'guardStrayEnter', lc: 'elementOf' },
    features: { cn: ['e.key === "Enter"', 'e.repeat', 'performance.now()', '"keydown"', '"blur"'], lc: ['e?.nodeType === 1'] } },
  { target: 'modifier-keys.mjs', source: 'cae42d46f-8Va5mKUX.js', exports: { m: 'modifierKeys' },
    features: { m: ['"Alt", "Control", "Shift", "Meta"'] } },
  { target: 'focus-lost.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { Xw: 'focusIsLost' },
    features: { Xw: ['e.activeElement === null || e.activeElement === e.body'] } },
  { target: 'focus-hand-back.mjs', source: 'ccf527892-DQjOjuwT.js', exports: { o: 'useFocusHandBack' },
    features: { o: ['":focus-visible"', '"focusin"', '"pointerdown"', '"keydown"', 'queueMicrotask', '.focus({ preventScroll: !0 })'] } },
  { target: 'shown-session.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { v_: 'useShownSession', x_: 'markUnreadUnlessShown' },
    features: { v_: ['t && y_.getState().unreadIds.includes(e) && y_.getState().markRead(e)', '__.push(e)', '__.lastIndexOf(e)', '[e, t]'],
      x_: ['h_.has(e) || __.includes(e) || y_.getState().markUnread(e)'] },
    host: {
      y_: { from: '../../btw-read-state.mjs', name: 'unreadStore', features: ['unreadIds: []', 'markRead: (t)', 'markUnread: (t)', 'name: p_'] },
      h_: { from: '../../btw-read-state.mjs', name: 'paneSessions', features: ['h_ = f_'] },
    } },
  // uf (the desktop bridge offers detachFromParent) and Iu (the cached ou nest-parent map) are host adapters: main.cjs
  // serves btw-session op 'detach', and the lineage parents come from the local session records.
  { target: 'detach-eligibility.mjs', source: 'shared-11-BuQ3CK5I.js', exports: { df: 'sideSessionDetachable' },
    features: { df: ['uf() ? e.find((e) => e.sessionId === t) : void 0', 'lf(n, Iu(e, !0))'] },
    host: {
      uf: { from: '../../btw-detach-host.mjs', name: 'detachFromParentAvailable', features: ['!!V?.detachFromParent'] },
      Iu: { from: '../../btw-detach-host.mjs', name: 'detachLineageParents', features: ['ou(e, !0)', 'Fu.parents'] },
    } },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !text.includes(f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function reactImport(file, alias, dep) {
  const hook = react[file]?.[alias];
  if (!hook) return null;
  const local = dep.exported.get(alias), escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${hook}\\b`).test(dep.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to react:${hook}`);
  return hook;
}

export async function extractBtwPane({ check = false } = {}) {
  const cache = new Map(), emitted = [], files = {};
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-btw-pane.mjs', modules: [] };
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const host = spec.host?.[name];
      if (host) {
        if (!p.isVariableDeclarator() && !p.isFunctionDeclaration()) throw Error(`${spec.target}: host binding ${name} is not a declaration`);
        assertFeatures(`${spec.target}: host ${name}`, declarationText(src, p), host.features);
        imports.set(name, { from: host.from, name: host.name, via: `${spec.source}:${name}`, kind: 'host', replacedSha256: sha(declarationText(src, p)) });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const hook = reactImport(file, alias, dep);
        if (hook) { imports.set(name, { from: 'react', name: hook, via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        const owner = local && emitted.find(m => m.source === file && m.exports[local]);
        if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via, kind: 'generated', original: local });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-btw-pane.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module is closed: everything it reads is declared, imported, or one of the listed host globals.
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}) })),
      exports: spec.exports,
    });
    emitted.push(spec);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`/btw pane output set changed: ${present.join(',')}. Run scripts/extract-btw-pane.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`/btw pane source mismatch: ${name}. Run scripts/extract-btw-pane.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} /btw pane modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractBtwPane({ check: process.argv.includes('--check') });
