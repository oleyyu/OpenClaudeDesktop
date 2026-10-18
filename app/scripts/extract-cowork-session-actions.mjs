// R4i-cowork CW1 (research-ext/X2 CW-1; ledger cowork-session-actions, transcript-16): extract the 2.42304.0 originals
// the Cowork session actions (restart from here, edit, refusal retry, the error banner's "Go back") are built on.
// Nothing here executes desktop runtime code:
//   c21f11e6d cO   the reason text for a rewind the CLI rejected (remote sessions: turn running, commands queued, stale
//                  target, unseen later turn, target not found, default).
//   c21f11e6d lO   the text for a local rewind refusal (shared-0 By: Dead, NoText, Unsupported; others → undefined).
//   c21f11e6d uO   the failure text per surface (restart / refusal_retry / edit).
//   c21f11e6d dO   CoworkSessionView's outcome → toast map ({kind: sent|timeout|rejected|error|empty}, {surface,
//                  isRemoteSession}, intl) → null | {message, options:{error?, messageForLogging}}.
//   c21f11e6d dk   the last human bubble, only when `canRewindToMessage`.
//   cb1e253a0 vm   (export y; c21 Vf) whether a LocalAgentModeSessions bridge can rewind (`rewindV2 ?? rewind`).
//   cb1e253a0 ym   (export b; c21 Tf) call `rewindV2(sessionId, uuid)` → {prefill, refusal} with an unknown refusal
//                  normalised to By.Unknown, else the legacy `rewind`, else throw "rewind IPC unavailable".
//   shared-0 By    (export Ch; c21 ke) the refusal enum dead / no_text / unsupported / unknown.
//   preload-helper e (export n) the ant.o11y error-text tag ym puts on the "rewind IPC unavailable" error. view-tabs also
//                  holds this binding but publishes no semantic name for it (D1/D46); it is a stateless function, so this
//                  generator keeps its own copy rather than importing a compressed name.
//
// The host side (intl through electron/i18n, isRemoteSession false per D17, the bridge supplied by the host) lives in
// src/source-cowork-session-actions-adapters.jsx; nothing generated imports it.
//
// Same machinery as extract-approval-landing.mjs: every emitted binding is an original top-level declaration sliced from
// the prettier-formatted chunk, each module is the reachable same-chunk closure of its roots (Babel scope analysis), an
// import resolves through the chunk's import declaration and the dependency's export table to a module emitted earlier
// here, each root carries feature strings of its original text, and every module must be closed apart from a fixed list
// of host globals.
//
// D0: own generator, own output folder (src/generated/cowork-session-actions), own scripts/verify-gen-cowork-session-actions.mjs.
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
const output = path.join(root, 'src/generated/cowork-session-actions');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Globals the original code reads.
const hostGlobals = new Set(['Error', 'Object', 'Symbol', 'Set']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
// `byExport` names roots by the chunk's export alias; `internal: true` allows roots the chunk does not export.
const modules = [
  { target: 'refusal.mjs', source: 'shared-0-ByI5P0CP.js', byExport: { Ch: 'LocalRewindRefusal' },
    features: { Ch: ['e.Dead = "dead"', 'e.NoText = "no_text"', 'e.Unsupported = "unsupported"', 'e.Unknown = "unknown"'] } },
  { target: 'error-text.mjs', source: 'preload-helper-D0dM6GpB.js', byExport: { n: 'withErrorText' },
    features: { n: ['Symbol.for("ant.o11y.errorText")', 'value: { text: t, kind: n }'] } },
  { target: 'rewind-bridge.mjs', source: 'cb1e253a0-DQ4zAGBV.js', byExport: { y: 'hasRewindBridge', b: 'rewindLocalSession' },
    features: { y: ['e?.rewindV2 ?? e?.rewind'],
      b: ['await e.rewindV2(t, r)', '!gm.has(i) ? H.Unknown : i', 'await e.rewind(t, r)', '"rewind IPC unavailable"', '"literal"'] } },
  { target: 'rewind-messages.mjs', source: 'c21f11e6d-Bd0v2A97.js', internal: true,
    exports: { cO: 'remoteRewindRejectionMessage', lO: 'localRewindRefusalMessage', uO: 'rewindFailureMessage',
      dO: 'rewindOutcomeToast', dk: 'lastHumanBubbleWhenRewindable' },
    features: {
      cO: ['case "turn running":', 'case "commands queued":', 'case "stale target":', 'case "unseen later turn":',
        'case "target not found":', 'id: "QfDweriZQj"', 'id: "N4pAEIJK4/"', 'id: "K1/egsMFpR"', 'id: "cnZntAZvlD"',
        'id: "TW8yay5oV+"', 'id: "pcv56liZj9"'],
      lO: ['case ke.Dead:', 'case ke.NoText:', 'case ke.Unsupported:', 'id: "YmzbNCp+kq"', 'id: "/FZxzzWOs5"', 'id: "SC1NI+O8Y4"'],
      uO: ['case "restart":', 'case "refusal_retry":', 'case "edit":', 'id: "N6n//LvbO8"', 'id: "EMw1vE8dOU"', 'id: "fUE4seXTv0"'],
      dO: ['let { surface: r } = t', 'case "sent":', 'case "timeout":', 'case "rejected":', 'case "error":', 'case "empty":',
        'id: "JAqfKwYq8j"', 'id: "SgdArTNAT/"', 'id: "kvjiUWTVfc"', 't.isRemoteSession', '"CoworkSessionView edit rewind timeout"',
        'cO(e.error.reason, n)', 'lO(e.refusal, n)'],
      dk: ['e.canRewindToMessage', 'e.findLastHumanBubble()'] } },
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

export async function extractCoworkSessionActions({ check = false } = {}) {
  const cache = new Map(), files = {}, emitted = [];
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-session-actions.mjs',
    adapterModule: 'src/source-cowork-session-actions-adapters.jsx', modules: [] };
  for (const raw of modules) {
    const src = await readSource(raw.source, cache);
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-cowork-session-actions.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, original: e.original })),
      exports: spec.exports,
      features: spec.features,
    });
    emitted.push(spec);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`cowork session actions output set changed: ${present.join(',')}. Run scripts/extract-cowork-session-actions.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`cowork session actions source mismatch: ${name}. Run scripts/extract-cowork-session-actions.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork session action modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractCoworkSessionActions({ check: process.argv.includes('--check') });
