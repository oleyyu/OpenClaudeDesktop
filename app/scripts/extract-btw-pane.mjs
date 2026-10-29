// Extract the 3.6556.2 originals the /btw side-session pane (cccc2cf0a zS) needs for its approval focus hand-back
// (NBS-6), without executing any desktop runtime (3.6556.2 migration, w2-btw-approval; research/panes.md §1.7, §3.5):
//   shared-1 mC (exported `au`): the "card left after a keyboard decision" hook (2.42304.0 ccf527892 o, now React
//                Compiler output). The approval area's card slot (c9ed5627b A) watches each drawn card with it (it) and
//                hands focus back to the composer when the decision left focus nowhere.
//   shared-frame dn (exported `Nf`): the document-level stray-Enter guard the slot installs after a card leaves, and
//                Uc (exported `Iu`): Element-or-null of an event target.
//   shared-1 lC (exported `ou`): the modifier keys that do not count as a keyboard decision (2.42304.0 cae42d46f m).
//   shared-0 ve (exported `LS`): the stable event callback the hook reads its handler through.
//   shared-25 mf (exported `lp`): the owner window of a node, else the global window.
//   c6dc54e94 g (exported `L`): focus is lost (activeElement null or body), the slot's `C` (2.42304.0 c227f4d5e Xw).
//   shared-11 Yb (exported `Cn`) and Qb (exported `_n`) (NBS-5): the shown-session registry. cccc2cf0a calls
//                Yb(btw child, true) while the session tile shows a /btw child: it marks the child read once and keeps
//                it in the `Jb` list, which Qb (the turn-result path) consults before marking a session unread.
//   shared-11 Xm (exported `oi`) (NBS-4): whether a session can be detached to top level, per side-chat tab (with
//                Jm/qm: not archived, not a side session sharing its parent's checkout, and a lineage parent in the nest
//                map); the tab menu offers "Detach to top level" only then.
//
// A spec's `host` entries replace a same-chunk declaration the originals read with a host adapter import (shared-11
// Xb, the persisted renderer unread store, and Kb, the window's pane-session set; Ym, the bridge's detachFromParent, and
// qf, the cached nest-parent map): the replaced declaration must still carry its feature strings and its hash is
// recorded, so a changed store shape fails generation.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source, and each
// module's bindings are the reachable same-chunk closure of its roots (Babel scope analysis). Imports resolve through
// the source chunk's import declaration and the dependency's export table to a module emitted earlier here, a React
// Compiler helper the view-tabs graph publishes (E3/R3: shared-frame J9/J1…/K1… by semantic name, checked against the
// view-tabs manifest), or a verified React export of vendor-frame (official-3.6556.2.mjs assertVendorAlias), so a
// renamed or re-pointed minified alias fails generation instead of silently binding another value. Each root carries
// feature strings of its original text (R2: stable strings, or looseFeature patterns), and every emitted module must be
// closed apart from a fixed list of host globals.
//
// D0: own generator, own output folder (src/generated/btw-pane), own scripts/verify-gen-btw-pane.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/btw-pane');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;

// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
const modules = [
  { target: 'owner-window.mjs', source: 'shared-25-DOWZRSlq.js', exports: { mf: 'ownerWindowOrGlobal' },
    features: { mf: ['globalThis.window'] } },
  { target: 'use-event.mjs', source: 'shared-0-DDOOdL6P.js', exports: { ve: 'useEvent' },
    features: { ve: ['t.current = e'] } },
  { target: 'focus-guard.mjs', source: official.sharedFrame, exports: { dn: 'guardStrayEnter', Uc: 'elementOf' },
    features: { dn: ['e.key === "Enter"', 'e.repeat', 'performance.now()', '"keydown"', '"blur"'], Uc: ['e?.nodeType === 1'] } },
  { target: 'modifier-keys.mjs', source: 'shared-1-BJhqMmkf.js', exports: { lC: 'modifierKeys' },
    features: { lC: ['"Alt", "Control", "Shift", "Meta"'] } },
  { target: 'focus-lost.mjs', source: 'c6dc54e94-E5GA6ry5.js', exports: { g: 'focusIsLost' },
    features: { g: ['e.activeElement === null || e.activeElement === e.body'] } },
  { target: 'focus-hand-back.mjs', source: 'shared-1-BJhqMmkf.js', exports: { mC: 'useFocusHandBack' },
    features: { mC: ['":focus-visible"', '"focusin"', '"pointerdown"', '"keydown"', 'queueMicrotask', '.focus({ preventScroll: !0 })',
      loose('lC.has(e.key) || (r = !0)')] } },
  { target: 'shown-session.mjs', source: 'shared-11-_AVGLHEz.js', exports: { Yb: 'useShownSession', Qb: 'markUnreadUnlessShown' },
    features: { Yb: [loose('n && Xb.getState().unreadIds.includes(e) && Xb.getState().markRead(e)'), loose('Jb.push(e)'), loose('Jb.lastIndexOf(e)')],
      Qb: [loose('Kb.has(e) || Jb.includes(e) || Xb.getState().markUnread(e)')] },
    host: {
      Xb: { from: '../../btw-read-state.mjs', name: 'unreadStore', features: ['unreadIds: []', 'explicitUnreadIds: []', 'markRead: (t)', 'markUnread: (t)', 'onRehydrateStorage'] },
      Kb: { from: '../../btw-read-state.mjs', name: 'paneSessions', features: [loose('Kb = Ub')] },
    } },
  // Ym (the desktop bridge offers detachFromParent) and qf (the cached nest-parent map) are host adapters: main.cjs
  // serves btw-session op 'detach', and the lineage parents come from the local session records.
  { target: 'detach-eligibility.mjs', source: 'shared-11-_AVGLHEz.js', exports: { Xm: 'sideSessionDetachable' },
    features: { Xm: [loose('Ym() ? e.find((e) => e.sessionId === t) : void 0'), loose('Jm(n, qf(e, !0))')] },
    host: {
      Ym: { from: '../../btw-detach-host.mjs', name: 'detachFromParentAvailable', features: ['?.detachFromParent'] },
      qf: { from: '../../btw-detach-host.mjs', name: 'detachLineageParents',
        features: [loose('t ? (Kf?.sessions !== e && (Kf = { sessions: e, parents: Ad(e, !0) }), Kf.parents) : Bf')] },
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
  const record = { name, bytes, text: bytes.toString(), code, program, exported };
  cache.set(name, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
// A feature is a literal source string or a looseFeature() pattern (R2).
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
// vendor-frame re-exports React: every alias is checked against official-3.6556.2.mjs (R3), never carried by name.
function reactImport(file, alias, dep) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(dep.text, alias);
  return { from: module, member };
}
// E3/R3: a React Compiler helper of shared-frame is imported from view-tabs under the semantic name it publishes.
async function compilerHelper(file, alias, dep, state) {
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (!helper) return null;
  if (!state.helpersChecked) { official.assertCompilerHelpers(dep.text); state.helpersChecked = true; }
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  const published = state.viewTabs.referenceVersion === referenceVersion ? state.viewTabs.publicNames?.[helper.name] : undefined;
  if (published?.file !== file || published.export !== alias || published.local !== helper.local)
    throw Error(`view-tabs does not publish ${helper.name} as ${file}:${alias} (${helper.local})`);
  return { from: `../view-tabs/${file}`, member: helper.name };
}

export async function extractBtwPane({ check = false } = {}) {
  const cache = new Map(), emitted = [], files = {}, state = {};
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
      // One copy per binding: a same-chunk root an earlier module already emits (3.6556.2 shared-1 holds both mC and
      // lC) is imported from that module instead of being sliced again.
      const sibling = !spec.exports[name] && emitted.find(m => m.source === spec.source && m.exports[name]);
      if (sibling) {
        imports.set(name, { from: `./${sibling.target}`, name: sibling.exports[name], via: `${spec.source}:${name}`, kind: 'generated', original: name });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const hook = reactImport(file, alias, dep);
        if (hook) { imports.set(name, { from: hook.from, name: hook.member, via, kind: 'react' }); return; }
        const helper = await compilerHelper(file, alias, dep, state);
        if (helper) { imports.set(name, { from: helper.from, name: helper.member, via, kind: 'view-tabs' }); return; }
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
