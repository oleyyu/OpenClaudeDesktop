// Extract the 2.42304.0 originals of the approval area's card slot (c96d752d0 qj, X7-16): where focus lands after a
// card leaves, and the window guard that follows. Shared by the main session's approvals and the /btw side pane's.
// Nothing here executes desktop runtime code:
//   c96d752d0 qj   the slot hook `{card, takesFocus, hasDraft, chordActsAnywhere, row, toComposer}` → `{setSlot, watch}`.
//                  Its watch Kj (ccf527892 useFocusHandBack over the slot) calls f when a card leaves with focus inside;
//                  f, in a microtask and only when focus is lost: lands on the next card's root (Hj) with the focus ring
//                  (c227f4d5e Zw) when the slot `takesFocus`, the composer has no draft and the window is attended
//                  (shared-10 lx); otherwise hands focus to the composer (toComposer); then records the window's state
//                  in Uj and arms the document stray-Enter guard (shared-frame cn).
//   c96d752d0 Gj   the per-window guard installed once (Wj): with a recorded state, plain Enter on the landed card and
//                  ⌘⇧⏎ (unless the drawn card's chord acts anywhere) are swallowed; a printable non-digit, non-space key
//                  typed on the landed card goes to the composer; pointerdown / leaving the landing clears the state.
//   c96d752d0 Hj   the card root inside a slot: the first displayed [data-approval-card-root], else the first displayed
//                  descendant along the first children.
//   c227f4d5e Zw   focus an element with transient focus-visible classes (Jw for a static card, Yw's ::after ring for a
//                  positioned one); classes and a temporary tabindex go when it blurs.
//   shared-10 rx/lx the window attention tracker (installed by qj on the slot's window) and "attended" (never left, or
//                  pointer use since leaving).
//
// qj only runs when c96d752d0 Vj() = GrowthBook `__gb__1616707004` is on (`at = Vj() && k !== void 0`); the host's
// answer for that flag lives with its adapter (source-approval-card.jsx APPROVAL_LANDING_FLAG), not here.
//
// The machinery is extract-btw-pane.mjs's: every emitted binding is an original top-level declaration sliced from the
// prettier-formatted chunk, each module is the reachable same-chunk closure of its roots (Babel scope analysis), and an
// import resolves through the chunk's import declaration and the dependency's export table to a module emitted earlier
// here, a module src/generated/btw-pane already emits from the same unchanged chunk (its manifest is checked), or a
// verified React export of vendor-frame. Each root carries feature strings of its original text; every module must be
// closed apart from a fixed list of host globals.
//
// D0: own generator, own output folder (src/generated/approval-landing), own scripts/verify-gen-approval-landing.mjs.
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
const output = path.join(root, 'src/generated/approval-landing');
const linkedDir = path.join(root, 'src/generated/btw-pane');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const react = { 'vendor-frame-DfPJ1QmD.js': {
  Co: ['react', 'useState'], So: ['react', 'useRef'], mo: ['react', 'useEffect'], yo: ['react', 'useLayoutEffect'],
  uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], Va: ['react/jsx-runtime', 'jsx'] } };
// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Infinity',
  // shared-25 gy reads it only behind `typeof window < "u"`.
  'window']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
// `internal: true` allows roots the chunk does not export (qj and its helpers are private to c96d752d0).
const modules = [
  // shared-25 Mf (mp): the MutationObserver of a node's window (Zw keeps its classes with it); au (_y): an event's input
  // delay (shared-10 zb, the attention tracker's press timing).
  { target: 'owner-globals.mjs', source: 'shared-25-DP8p7i1Z.js', byExport: { Mf: 'mutationObserverOf', au: 'eventInputDelay' },
    features: { Mf: ['MutationObserver ?? globalThis.MutationObserver'], au: ['timeStamp: r'] } },
  // cd8405c1a t: name the focused element by its own text while it holds focus (Zw's ey), undone on blur.
  { target: 'focus-name.mjs', source: 'cd8405c1a-UVWp96hz.js', byExport: { t: 'nameByText' },
    features: { t: ['"aria-labelledby"', 'named-by-text-'] } },
  { target: 'focus-ring.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { Zw: 'focusWithRing', Jw: 'ringClasses', Yw: 'ringClassesPositioned' },
    features: { Zw: ['e.focus({ focusVisible: !0 })', 'e.setAttribute("tabindex", "-1")', 'attributeFilter: ["class"]'],
      Jw: ['"focus-visible:outline-hidden focus-visible:shadow-focus"'], Yw: ['focus-visible:after:shadow-focus'] } },
  { target: 'window-attention.mjs', source: 'shared-10-THQui8pC.js', exports: { rx: 'watchWindowAttention', lx: 'windowAttended' },
    features: { rx: ['nx(e)'], lx: ['ux(X(e))'] } },
  { target: 'card-landing.mjs', source: 'c96d752d0-BOCqU7c2.js', internal: true,
    exports: { qj: 'useApprovalCardLanding', Hj: 'approvalCardRoot', Gj: 'guardWindowAfterCard', Uj: 'afterCardState', Kj: 'ApprovalCardWatch' },
    features: {
      qj: ['takesFocus: t', 'hasDraft: n', 'chordActsAnywhere: r', 'row: i', 'toComposer: a', 'landing: l', '!e.hasDraft()',
        'Ole(t, e ? wle : Sle)', 'onCard: r', 'drawn: () => u.current', 'Rre(n, sf(n))', 'setSlot: s'],
      Hj: ['"[data-approval-card-root]"', '!== "contents"', 'e.firstElementChild'],
      Gj: ['"keydown"', 'n.key === "Enter"', 'chordActsAnywhere !== !0', 'toComposer?.(r.from)', '/[\\d ]/.test(n.key)',
        'n.stopImmediatePropagation()', '"pointerdown"', '"focusout"'],
      Uj: ['new WeakMap()'], Kj: ['place: e', 'onLeft: t'] } },
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
  const entry = react[file]?.[alias];
  if (!entry) return null;
  const [from, member] = entry, local = dep.exported.get(alias), escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${member}\\b`).test(dep.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${from}:${member}`);
  return { from, member };
}
// src/generated/btw-pane's modules, usable when they were cut from the very chunk bytes read here.
async function linkedModules(cache) {
  const manifest = JSON.parse(await fs.readFile(path.join(linkedDir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error('btw-pane manifest is for another reference version');
  const linked = [];
  for (const m of manifest.modules) {
    const src = await readSource(m.source, cache);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`btw-pane ${m.target} was cut from other ${m.source} bytes`);
    const text = await fs.readFile(path.join(linkedDir, m.target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`btw-pane ${m.target} differs from its manifest`);
    linked.push({ target: `../btw-pane/${m.target}`, source: m.source, exports: m.exports, linked: true });
  }
  return linked;
}

export async function extractApprovalLanding({ check = false } = {}) {
  const cache = new Map(), files = {};
  const emitted = await linkedModules(cache);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-approval-landing.mjs', modules: [] };
  for (const raw of modules) {
    const src = await readSource(raw.source, cache);
    // byExport: roots named by the chunk's export alias (features keyed the same way).
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const spec = raw.byExport ? { ...raw,
      exports: Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])),
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([alias, list]) => [byLocal(alias), list])) } : raw;
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const hook = reactImport(file, alias, dep);
        if (hook) { imports.set(name, { from: hook.from, name: hook.member, via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        const owner = local && emitted.find(m => m.source === file && m.exports[local]);
        if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: owner.linked ? owner.target : `./${owner.target}`, name: owner.exports[local], via,
          kind: owner.linked ? 'linked' : 'generated', original: local });
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
      if (!spec.internal && ![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
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
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-approval-landing.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push(spec);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`approval landing output set changed: ${present.join(',')}. Run scripts/extract-approval-landing.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`approval landing source mismatch: ${name}. Run scripts/extract-approval-landing.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} approval landing modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractApprovalLanding({ check: process.argv.includes('--check') });
