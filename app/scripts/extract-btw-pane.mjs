// Extract the originals the /btw side-session pane needs for its approval focus hand-back, its shown-session registry
// and its tab menu's detach eligibility, without executing any desktop runtime. Two source contracts, two outputs:
//
// 3.6556.2 (w2-btw-approval; research/panes.md §1.7, §3.5) -> src/generated/btw-pane, the graph the host and the
// 3.6556.2 approval-landing / question-card generators link by original identity (they check this manifest's version
// and each module's source bytes, so it stays on 3.6556.2 until they move):
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
// 4.16336.0 (region batch 1, region-plan G6) -> src/generated/btw-pane-v4, an isolated graph of the same semantic
// exports cut from the 4.16336.0 snapshot (the approval slot moved to c6dc54e94-Ci7MQEoh.js B, which imports every
// focus root below). Nothing imports it until the cutover (region-plan cutover.productionSwitchNotBeforeBatch); the
// 3.6556.2 graph keeps serving the host and its linked consumers meanwhile.
//   shared-1 CI (`Sd`): the hand-back hook. New in 4.16336.0: a capture `click` that sI (`Nd`) reads as a keyboard
//                activation (a mouse-typed click with buttons 1 and no sourceCapabilities, behind GrowthBook
//                "__gb__1951358650") also counts, when canFocusComposerOnClick (shared-frame an, `Yp`) holds.
//   shared-frame Hn (`kp`): the stray-Enter guard; 4.16336.0 defers its teardown on window blur by a microtask and
//                cancels it on focus. Pt (`nm`): Element-or-null. an (`Yp`): canFocusComposerOnClick.
//   shared-1 vI (`Cd`): the modifier keys. shared-0 xe (`PT`): the stable event callback (now React Compiler output).
//   shared-25 vd (`Wp`): owner window, else the global window. c37aeaf53 a (`i`): focus is lost (c6dc54e94 B's `w`).
//   shared-8 J_ (`Xd`) / X_ (`Wd`): the shown-session registry. shared-39 v_ (`$r`): detach eligibility (g_ / h_).
//   shared-frame J9 / J0 / J2 / K0 / K3: React Compiler helpers, proved by official-4.16336.0.mjs assertCompilerHelpers
//                and cut here as pure bindings (cds-core holds them without a publicName).
//
// A spec's `host` entries replace a declaration the originals read with a host adapter import: a same-chunk declaration
// (the persisted renderer unread store and the window's pane-session set; the bridge's detachFromParent and the cached
// nest-parent map), or, 4.16336.0, an import whose declaration in its own chunk is replaced (shared-0 Uu, the GrowthBook
// value reader, answered by host-growthbook.mjs through src/btw-focus-host.mjs). The replaced declaration must still
// carry its feature strings and its hash is recorded, so a changed store shape fails generation.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source, and each
// module's bindings are the reachable same-chunk closure of its roots (Babel scope analysis). Imports resolve through
// the source chunk's import declaration and the dependency's export table to a module emitted earlier here, a verified
// React export of vendor-frame (assertVendorAlias of the contract's official-<version>.mjs), 3.6556.2: a React Compiler
// helper the view-tabs graph publishes (E3/R3: shared-frame J9/J1…/K1… by semantic name, checked against the view-tabs
// manifest), 4.16336.0: a publicName of the cds-core shared graph (sharedGraph 'cds-core': version, snapshot, module
// bytes and source hashes checked as runSlicer does); a same-chunk binding cds-core publishes, a root included, is
// linked as well (a root is re-exported under its semantic name) once its declaration hashes as cds-core's, so a CDS
// name has one copy. A binding cds-core holds without a publicName is cut again only
// when it is pure (a Context / Map / Set / WeakMap / WeakSet copy stops generation, D46) and only when its declaration
// hash equals cds-core's (heldByCdsCore). So a renamed or re-pointed minified alias fails generation instead of silently
// binding another value. Each root carries feature strings of its original text (R2: stable strings, or looseFeature
// patterns); 4.16336.0 roots must also be the only top-level declaration of their chunk carrying those features. Every
// emitted module must be closed apart from a fixed list of host globals.
//
// D0: own generator, own output folders, own scripts/verify-gen-btw-pane.mjs (checks both contracts).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// 3.6556.2: the graph the host and the 3.6556.2 consumers link (unchanged contract, byte-identical output).
const legacy = (() => {
  const official = official3, loose = official.looseFeature;
  return {
    official, output: path.join(root, 'src/generated/btw-pane'), label: '/btw pane', sharedGraph: undefined,
    // Globals the original code reads from the host page.
    hostGlobals: new Set(['performance', 'queueMicrotask', 'globalThis', 'Set']),
    // Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots).
    modules: [
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
    ],
  };
})();

// 4.16336.0: the isolated graph (region-plan G6). Same semantic exports and host adapters, plus the compiler helpers
// and canFocusComposerOnClick the new hook reads, and the GrowthBook gate reader as a host adapter.
const target4 = (() => {
  const official = official4, loose = official.looseFeature;
  const helpers = Object.fromEntries(['reactMemoCache', 'memoIsEmpty', 'memoChanged2', 'memoStore0', 'memoStore3']
    .map(name => Object.values(official.compilerHelpers).find(helper => helper.name === name)).map(helper => [helper.local, helper.name]));
  return {
    official, output: path.join(root, 'src/generated/btw-pane-v4'), label: '/btw pane 4.16336.0', sharedGraph: 'cds-core',
    uniqueRoots: true, legacyOutput: 'src/generated/btw-pane',
    // Globals the original code reads from the host page (shared-frame en: `typeof window > "u" ? void 0 : window`;
    // J8, the compiler's memo sentinel: `Symbol.for("react.memo_cache_sentinel")`).
    hostGlobals: new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'window', 'Symbol']),
    modules: [
      // E3: the React Compiler helpers, every one proved by assertCompilerHelpers on the shared-frame bytes.
      { target: 'compiler-helpers.mjs', source: official.sharedFrame, exports: helpers, compilerHelpers: true },
      { target: 'owner-window.mjs', source: 'shared-25-D-aF0gt9.js', exports: { vd: 'ownerWindowOrGlobal' },
        features: { vd: ['globalThis.window', loose('return _d(e) ?? globalThis.window')] } },
      { target: 'use-event.mjs', source: 'shared-0-CnnWnVrT.js', exports: { xe: 'useEvent' },
        // shared-0 also holds Se (`NT`), the same body over be (an insertion effect); xe syncs the ref through ye (a passive effect).
        features: { xe: [loose('let n = e; return t.current(...n);'), loose('ye(t, e)', { keep: ['ye'] })] } },
      { target: 'focus-guard.mjs', source: official.sharedFrame, exports: { Hn: 'guardStrayEnter', Pt: 'elementOf' },
        features: { Hn: ['e.key === "Enter"', 'e.repeat', 'performance.now()', '"keydown"', '"focusin"', '"blur"', '"focus"', 'queueMicrotask'],
          Pt: ['e?.nodeType === 1 ? e : null'] } },
      { target: 'focus-on-click.mjs', source: official.sharedFrame, exports: { an: 'canFocusComposerOnClick' },
        features: { an: [loose('t?.navigator?.userAgent?.includes($t)'), 'maxTouchPoints'] } },
      { target: 'modifier-keys.mjs', source: 'shared-1-D1bGaTaN.js', exports: { vI: 'modifierKeys' },
        features: { vI: ['"Alt", "Control", "Shift", "Meta"'] } },
      { target: 'focus-lost.mjs', source: 'c37aeaf53-Cm_eXF4J.js', exports: { a: 'focusIsLost' },
        features: { a: ['e.activeElement === null || e.activeElement === e.body'] } },
      { target: 'focus-hand-back.mjs', source: 'shared-1-D1bGaTaN.js', exports: { CI: 'useFocusHandBack' },
        features: { CI: ['":focus-visible"', '"focusin"', '"pointerdown"', '"keydown"', '"click"', 'queueMicrotask', '.focus({ preventScroll: !0 })',
          loose('vI.has(e.key) || (i = !0)'), loose('sI(e) && me(di(t))')] },
        host: {
          // sI reads `jt(oI) === !0`, jt = shared-0 Uu (exported `Rx`): the forced GrowthBook value, else the client's.
          jt: { from: '../../btw-focus-host.mjs', name: 'readGrowthBookValue',
            features: [loose('let t = Wu(e); return t === void 0 ? zu(e) : t;')] },
        } },
      { target: 'shown-session.mjs', source: 'shared-8-BqfCbkJd.js', exports: { J_: 'useShownSession', X_: 'markUnreadUnlessShown' },
        features: { J_: [loose('n && Y_.getState().unreadIds.includes(e) && Y_.getState().markRead(e)'), loose('q_.push(e)'), loose('q_.lastIndexOf(e)')],
          X_: [loose('G_.has(e) || q_.includes(e) || Y_.getState().markUnread(e)')] },
        host: {
          Y_: { from: '../../btw-read-state.mjs', name: 'unreadStore', features: ['unreadIds: []', 'explicitUnreadIds: []', 'markRead: (t)', 'markUnread: (t)', 'onRehydrateStorage'] },
          G_: { from: '../../btw-read-state.mjs', name: 'paneSessions', features: [loose('G_ = H_')] },
        } },
      { target: 'detach-eligibility.mjs', source: 'shared-39-ZCs0lAwB.js', exports: { v_: 'sideSessionDetachable' },
        features: { v_: [loose('__() ? e.find((e) => e.sessionId === t) : void 0'), loose('g_(n, uh(e, !0))')] },
        host: {
          __: { from: '../../btw-detach-host.mjs', name: 'detachFromParentAvailable', features: ['?.detachFromParent'] },
          uh: { from: '../../btw-detach-host.mjs', name: 'detachLineageParents',
            features: [loose('t ? (lh?.sessions !== e && (lh = { sessions: e, parents: Pp(e, !0) }), lh.parents) : rh')] },
        } },
    ],
  };
})();

export const contracts = Object.freeze({ [official3.referenceVersion]: legacy, [official4.referenceVersion]: target4 });

async function readSource(source, name, cache) {
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
// A top-level declaration in the unformatted chunk bytes: the text a runSlicer graph (cds-core) hashes its bindings by.
function rawDeclarationText(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
const featureMissing = (text, features = []) => features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
// A feature is a literal source string or a looseFeature() pattern (R2).
function assertFeatures(label, text, features = []) {
  const missing = featureMissing(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
// 4.16336.0: the root is the only top-level declaration of its chunk that carries every feature.
function assertUniqueRoot(label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = Object.entries(src.program.scope.bindings)
    .filter(([, b]) => (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && !featureMissing(declarationText(src, b.path), features).length)
    .map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// vendor-frame re-exports React: every alias is checked against the contract's official-<version>.mjs (R3), never carried by name.
function reactImport(official, file, alias, dep) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(dep.text, alias);
  return { from: module, member };
}
// E3/R3 (3.6556.2): a React Compiler helper of shared-frame is imported from view-tabs under the semantic name it publishes.
async function compilerHelper(contract, file, alias, dep, state) {
  const { official } = contract;
  if (contract.sharedGraph !== undefined) return null;
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (!helper) return null;
  if (!state.helpersChecked) { official.assertCompilerHelpers(dep.text); state.helpersChecked = true; }
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  const published = state.viewTabs.referenceVersion === official.referenceVersion ? state.viewTabs.publicNames?.[helper.name] : undefined;
  if (published?.file !== file || published.export !== alias || published.local !== helper.local)
    throw Error(`view-tabs does not publish ${helper.name} as ${file}:${alias} (${helper.local})`);
  return { from: `../view-tabs/${file}`, member: helper.name };
}

// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (the runSlicer sharedGraph contract, extract-working-line.mjs).
async function sharedGraph(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(generatedRoot, area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46).
async function isModuleState(contract, src, p, cache) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return false;
}

export async function extractBtwPane({ check = false, version = official3.referenceVersion } = {}) {
  const contract = contracts[version];
  if (!contract) throw Error(`extract-btw-pane has no ${version} source contract`);
  const { official, output, label } = contract, { referenceVersion, referenceSnapshot } = official, source = official.ionSource;
  const cache = new Map(), emitted = [], files = {}, state = {};
  const graph = contract.sharedGraph === undefined ? null : await sharedGraph(contract);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-btw-pane.mjs',
    ...(graph ? { sharedGraph: graph.area, isolatedGraph: { legacyOutput: contract.legacyOutput } } : {}), modules: [] };
  const sharedImport = (file, local) => {
    const shared = graph?.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, kind: 'shared-graph' } : null;
  };
  for (const spec of contract.modules) {
    const src = await readSource(source, spec.source, cache);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports))
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const host = spec.host?.[name];
      if (host) {
        // A same-chunk declaration, or (4.16336.0) an import whose declaration in its own chunk is the one replaced.
        let replaced = p, replacedSrc = src, via = `${spec.source}:${name}`;
        if (p.isImportSpecifier() && contract.sharedGraph !== undefined) {
          const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
          replacedSrc = await readSource(source, file, cache);
          const local = replacedSrc.exported.get(alias);
          replaced = local && replacedSrc.program.scope.getBinding(local)?.path;
          if (!replaced) throw Error(`${spec.target}: host binding ${name} imports ${file}:${alias}, which is not exported`);
          via = `${file}:${alias}`;
        }
        if (!replaced.isVariableDeclarator() && !replaced.isFunctionDeclaration()) throw Error(`${spec.target}: host binding ${name} is not a declaration`);
        assertFeatures(`${spec.target}: host ${name}`, declarationText(replacedSrc, replaced), host.features);
        imports.set(name, { from: host.from, name: host.name, via, kind: 'host', replacedSha256: sha(declarationText(replacedSrc, replaced)) });
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
        const dep = await readSource(source, file, cache);
        const hook = reactImport(official, file, alias, dep);
        if (hook) { imports.set(name, { from: hook.from, name: hook.member, via, kind: 'react' }); return; }
        const helper = await compilerHelper(contract, file, alias, dep, state);
        if (helper) { imports.set(name, { from: helper.from, name: helper.member, via, kind: 'view-tabs' }); return; }
        const local = dep.exported.get(alias);
        const shared = local && sharedImport(file, local);
        if (shared) { imports.set(name, { ...shared, via, original: local }); return; }
        const owner = local && emitted.find(m => m.source === file && m.exports[local]);
        if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: `./${owner.target}`, name: owner.exports[local], via, kind: 'generated', original: local });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if (graph) {
        // A binding cds-core publishes is linked, never cut again, roots included (a root it publishes is re-exported
        // under the root's semantic name): one copy of each CDS name. The declaration this chunk carries must hash as
        // the one cds-core holds, so a re-pointed publicName fails generation instead of exporting another value.
        const key = `${spec.source}#${name}`, shared = sharedImport(spec.source, name), held = graph.held.get(key);
        if (shared) {
          if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText(src, name)))
            throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area} publishes as ${shared.name}`);
          imports.set(name, { ...shared, via: key, original: name, linkedSha256: held.sha256 });
          return;
        }
        if (held) {
          if (await isModuleState(contract, src, p, cache)) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${spec.target}: ${key}`);
          if (held.sha256 !== sha(rawDeclarationText(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
          heldByCdsCore.push(name);
        }
      }
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      if (contract.uniqueRoots && !spec.compilerHelpers) assertUniqueRoot(spec.target, src, name, spec.features?.[name]);
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
    const foreign = globals.filter(name => !contract.hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}), ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports,
      ...(graph ? { heldByCdsCore } : {}),
    });
    emitted.push(spec);
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-btw-pane.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-btw-pane.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  for (const version of Object.keys(contracts)) await extractBtwPane({ check: process.argv.includes('--check'), version });
