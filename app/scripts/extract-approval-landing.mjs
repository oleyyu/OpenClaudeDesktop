// Extract the 3.6556.2 originals of the approval area's card slot (c9ed5627b A, X7-16; 2.42304.0 c96d752d0 qj): where
// focus lands after a card leaves, and the window guard that follows. Shared by the main session's approvals and the
// /btw side pane's. Nothing here executes desktop runtime code (3.6556.2 migration, w2-btw-approval; research/home-start.md
// §1.3, §2.1 HS-11/HS-12, §3.3):
//   c9ed5627b A    (exported `n`) the slot hook `{card, takesFocus, hasDraft, chordActsAnywhere, row, toComposer}` →
//                  `{setSlot, watch}` (React Compiler output). Its watch `it` (shared-1 useFocusHandBack over the slot)
//                  calls `v` when a card leaves with focus inside; `v`, in a microtask and only when focus is lost: lands
//                  on the next card's root (E) with the focus ring (c6dc54e94 I) when the slot `takesFocus`, the composer
//                  has no draft and the window is attended (shared-10 Gt); otherwise hands focus to the composer
//                  (toComposer); then records the window's state in D and arms the document stray-Enter guard (shared-frame Nf).
//   c9ed5627b k    the per-window guard installed once (O): with a recorded state, plain Enter on the landed card and
//                  ⌘⇧⏎ (unless the drawn card's chord acts anywhere) are swallowed; a printable non-digit, non-space key
//                  typed on the landed card goes to the composer; pointerdown / leaving the landing clears the state.
//                  New in 3.6556.2 (HS-11): once a deliberate digit or arrow pick on the landed card was marked (rt),
//                  a deliberate Enter (nt) passes.
//   c9ed5627b nt   a deliberate key on the landed card: trusted, no repeat, no modifier, at least 400ms after landing and
//                  not right after the window gained focus (shared-10 Jt / en / qt).
//   c9ed5627b rt   the card's digit / arrow keys ask it: off the landed card always true; on it, true (and `picked` set
//                  when the card's digit shortcuts are on) only for a deliberate key (the AskUserQuestion card dt calls
//                  `!rt(e.nativeEvent, E)` before its key handler).
//   c9ed5627b E    the card root inside a slot: the first displayed [data-approval-card-root], else the first displayed
//                  descendant along the first children.
//   c6dc54e94 _    focus an element with transient focus-visible classes (m for a static card, h's ::after ring for a
//                  positioned one); classes and a temporary tabindex go when it blurs. HS-12: it names the element by the
//                  parts marked [data-question-stop-name] (cd8405c1a i, shared-5 Z), else by itself.
//   shared-10 Nx/zx the window attention tracker (installed by A on the slot's window) and "attended" (never left, or
//                  pointer use since leaving). The chunk's top-level `typeof window < "u" && Mx(window)` (HS-13) is a
//                  statement, not a declaration, so it is not carried: A installs the tracker as before.
//   shared-10 Fx   (exported `Qt`, W12 question-cont) the hook "this window is not attended" the AskUserQuestion card's
//                  primary (c30607cef i, dt's `je`) hides its shortcut with. It subscribes to the tracker's change set Dx
//                  and reads Ix over the tracker state wx, so it lives in its own module (window-attention-hook.mjs: it
//                  reads the CDS owner window through view-tabs) that links window-attention.mjs for Ix / Dx instead of
//                  cutting a second WeakMap; window-attention.mjs stays plain node (E42: approval-card-model imports it).
//
// A only runs when c9ed5627b et() = GrowthBook `__gb__1616707004` is on (the slot's `card` is undefined otherwise); the
// host's answer for that flag lives with its adapter (source-approval-card.jsx APPROVAL_LANDING_FLAG), not here.
//
// The machinery is extract-btw-pane.mjs's: every emitted binding is an original top-level declaration sliced from the
// prettier-formatted chunk, each module is the reachable same-chunk closure of its roots (Babel scope analysis), and an
// import resolves through the chunk's import declaration and the dependency's export table to a module emitted earlier
// here, a module src/generated/btw-pane already emits from the same unchanged chunk (its manifest is checked), a React
// Compiler helper the view-tabs graph publishes (E3/R3), or a verified React export of vendor-frame
// (official-3.6556.2.mjs). Features (R2: stable strings or looseFeature patterns) are checked on each listed binding
// when it is sliced, and every listed binding must be reached; every module must be closed apart from a fixed list of
// host globals.
//
// D0: own generator, own output folder (src/generated/approval-landing), own scripts/verify-gen-approval-landing.mjs.
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
const output = path.join(root, 'src/generated/approval-landing');
const linkedDir = path.join(root, 'src/generated/btw-pane');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;

// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Infinity',
  // shared-25 vv reads it only behind `typeof window < "u"`.
  'window']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots), or
// `byExport` names the roots by the chunk's export alias. `internal: true` allows roots the chunk does not export (A's
// helpers are private to c9ed5627b); `alsoExports` adds such private roots (local -> exported name) to a byExport module.
// `features` may also list non-root bindings: they must be part of the module. A same-chunk binding a module emitted
// earlier here already holds is imported from it (one instance of the chunk's state); it must be exported there.
const modules = [
  // shared-25 sp (_f): the MutationObserver of a node's window (the focus ring keeps its classes with it); Pu (yv): an
  // event's input delay (shared-10 mx, the attention tracker's press timing). The 2.42304.0 aliases Mf / au now name
  // unrelated bindings, so the roots are found by these aliases and checked by feature.
  { target: 'owner-globals.mjs', source: 'shared-25-DOWZRSlq.js', byExport: { sp: 'mutationObserverOf', Pu: 'eventInputDelay' },
    features: { sp: ['MutationObserver ?? globalThis.MutationObserver'], Pu: ['timeStamp: r'] } },
  // shared-5 Z (EL): the attribute the question card marks its name parts with.
  { target: 'question-stop-name.mjs', source: 'shared-5-Bg6ZMqvt.js', byExport: { Z: 'questionStopNameAttribute' },
    features: { Z: ['"data-question-stop-name"'] } },
  // cd8405c1a i (exported `r`): name an element by its marked parts (or by its own text) while it holds focus, undone on blur.
  { target: 'focus-name.mjs', source: 'cd8405c1a--1nGPcIc.js', byExport: { r: 'nameByMarkedParts' },
    features: { r: [loose('return n(e, ...a(e))')], n: ['"aria-labelledby"', 'named-by-text-'], a: [loose('querySelectorAll(`[${e}]`)')] } },
  { target: 'focus-ring.mjs', source: 'c6dc54e94-E5GA6ry5.js', byExport: { I: 'focusWithRing', P: 'ringClasses', F: 'ringClassesPositioned' },
    features: { I: ['e.focus({ focusVisible: !0 })', 'e.setAttribute("tabindex", "-1")', 'attributeFilter: ["class"]'],
      P: ['"focus-visible:outline-hidden focus-visible:shadow-focus"'], F: ['focus-visible:after:shadow-focus'] } },
  { target: 'window-attention.mjs', source: 'shared-10-D6FXWZph.js',
    byExport: { Yt: 'watchWindowAttention', Gt: 'windowAttended', qt: 'justGainedFocus', Jt: 'isTrustedEvent', en: 'eventDelay' },
    features: { Yt: [loose('Mx(e)')], Mx: ['"visibilitychange"', 'hiddenFromPerf', 'pointerAtPerf'], Gt: [loose('return Bx(Ex(e))')],
      Bx: ['e.leftAtPerf === -1 / 0 || e.pointerAtPerf > e.leftAtPerf'], qt: ['gainedAtPerf <= '], Jt: [loose('return yx(e)')],
      yx: ['e.isTrusted'], en: [loose('return Te(e) ?? 0')], Ix: [loose('t = e && wx.get(e)'), loose('t !== void 0 && !Bx(t)')],
      Dx: ['new WeakMap()'] },
    // W13 G11 (D1, cowork-approval pendingDedupe): the tracker internals shared-10's approval keyboard guard (Vx / Hx,
    // sliced by cowork-approval) reads directly are exported too, so that graph links this one tracker state (wx / Tx)
    // instead of cutting a second WeakMap / WeakSet and installing the window listeners twice.
    alsoExports: { Ix: 'windowUnattended', Dx: 'attentionChangeListeners', yx: 'trustedEventTest', xx: 'focusGraceMs',
      Cx: 'modifierKeyNames', wx: 'attentionStates', Tx: 'trackedWindows', Ex: 'attentionStateOf', Ox: 'setAttentionMark',
      kx: 'focusSettledAt', Ax: 'inputCountsAsAttention', jx: 'windowHiddenAt', Mx: 'trackWindowAttention',
      Rx: 'isEmbeddedFrame', Bx: 'attentionStateAttended' } },
  { target: 'window-attention-hook.mjs', source: 'shared-10-D6FXWZph.js', byExport: { Qt: 'useWindowUnattended' },
    features: { Qt: [loose('K1($, 0, e, () => Ix(e))'), loose('let t = () => r(Ix(e))'), loose('Dx.get(e) ?? new Set()'),
      loose('Dx.set(e, n.add(t))'), loose('n.delete(t)')] } },
  { target: 'card-landing.mjs', source: 'c9ed5627b-BSPWYeYQ.js', internal: true,
    exports: { A: 'useApprovalCardLanding', E: 'approvalCardRoot', k: 'guardWindowAfterCard', D: 'afterCardState', it: 'ApprovalCardWatch',
      nt: 'deliberateCardKey', rt: 'markCardPick' },
    features: {
      A: [loose('card: i'), loose('takesFocus: a'), loose('hasDraft: o'), loose('chordActsAnywhere: c'), loose('row: l'), loose('toComposer: u'),
        loose('landing: p'), loose('!e.hasDraft()'), loose('He(t, e ? Ve : Ue)'), 'since: performance.now()', loose('drawn: () => h.current'),
        loose('setSlot: te'), loose('watch: y')],
      E: ['"[data-approval-card-root]"', '!== "contents"', 'e.firstElementChild'],
      k: ['"keydown"', loose('n.key === "Enter"'), 'chordActsAnywhere !== !0', 'toComposer?.(r.from)', '/[\\d ]/.test(',
        'stopImmediatePropagation()', '"pointerdown"', '"focusout"', loose('r.onCard && (!r.picked || !nt(n))')],
      D: ['new WeakMap()'], it: [loose('place: t'), loose('onLeft: n'), loose('(n(e), null)')],
      nt: [loose('n.at === e.target'), '!e.repeat', loose('!(e.metaKey || e.ctrlKey || e.altKey)'), '>= 400'],
      rt: [loose('(t && (n.picked = !0), !0)')] } },
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
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (!helper) return null;
  if (!state.helpersChecked) { official.assertCompilerHelpers(dep.text); state.helpersChecked = true; }
  const published = state.viewTabs.referenceVersion === referenceVersion ? state.viewTabs.publicNames?.[helper.name] : undefined;
  if (published?.file !== file || published.export !== alias || published.local !== helper.local)
    throw Error(`view-tabs does not publish ${helper.name} as ${file}:${alias} (${helper.local})`);
  return { from: `../view-tabs/${file}`, member: helper.name };
}
// R6: any other shared-frame binding view-tabs publishes (shared-10 Fx's useCdsOwnerWindow), by its semantic name; only
// after the linked / generated modules, so what btw-pane already answers (its elementOf) keeps resolving there.
async function viewTabsName(file, alias, state) {
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  if (file !== official.sharedFrame || state.viewTabs.referenceVersion !== referenceVersion) return null;
  const entry = Object.entries(state.viewTabs.publicNames ?? {}).find(([, v]) => v.file === file && v.export === alias);
  return entry ? { from: `../view-tabs/${file}`, member: entry[0] } : null;
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
  const cache = new Map(), files = {}, state = {};
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
      exports: { ...Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])), ...raw.alsoExports },
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([key, list]) => [key in raw.byExport ? byLocal(key) : key, list])) } : raw;
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
        const helper = await compilerHelper(file, alias, dep, state);
        if (helper) { imports.set(name, { from: helper.from, name: helper.member, via, kind: 'view-tabs' }); return; }
        const local = dep.exported.get(alias);
        const owner = local && emitted.find(m => m.source === file && m.exports[local]);
        const published = !owner && await viewTabsName(file, alias, state);
        if (published) { imports.set(name, { from: published.from, name: published.member, via, kind: 'view-tabs' }); return; }
        if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: owner.linked ? owner.target : `./${owner.target}`, name: owner.exports[local], via,
          kind: owner.linked ? 'linked' : 'generated', original: local });
        return;
      }
      // One instance: a same-chunk binding an earlier module of this generator holds is imported from it.
      const holder = !spec.exports[name] && emitted.find(m => !m.linked && m.source === spec.source && m.selectedNames.includes(name));
      if (holder) {
        if (!holder.exports[name]) throw Error(`${spec.target}: ${name} is held by ${holder.target} but not exported there`);
        imports.set(name, { from: `./${holder.target}`, name: holder.exports[name], via: `${spec.source}#${name}`, kind: 'generated', original: name });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if (!spec.exports[name] && spec.features?.[name]) assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), spec.features[name]);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.internal && !(name in (raw.alsoExports ?? {})) && ![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    const unreached = Object.keys(spec.features ?? {}).filter(name => !selected.has(name));
    if (unreached.length) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
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
    emitted.push({ ...spec, selectedNames: [...selected.keys()] });
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
