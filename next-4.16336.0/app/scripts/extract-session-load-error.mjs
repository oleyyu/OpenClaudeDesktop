// R4f-error E1 (transcript-session-error-boundary, transcript-10): extract the session load error boundary fallback
// without executing any desktop runtime (decision D0: own generator, own output folder src/generated/session-load-error,
// own scripts/verify-gen-session-load-error.mjs).
//
// 4.16336.0 (batch 2a, region-plan batch 8 "session-load-error"): the production graph is sliced from Claude Desktop
// 4.16336.0 (scripts/official-4.16336.0.mjs, snapshot snapshots/claude-4.16336.0-20261104). No generated area links this
// one by original identity (region-plan cutover.oldConsumersAtGeneration is empty; the only consumer is the host,
// src/source-session-error-boundary.jsx, through the semantic export SessionLoadError), so the 3.6556.2 contract was
// replaced in place instead of generated beside it (its generator, output and hashes are kept in
// analysis/claude-4.16336.0-migrate-20261104/regions/batch2a/session-load-error/before/). Names, 3.6556.2 -> 4.16336.0:
//
//   session-load-error.mjs  cc43287c9 aV (exported M) -> cc43287c9-dzfX-J5i.js xG (exported j): "Something went wrong
//                           loading this session." with Try again, the fallback every EpitaxyChatPanel render-error
//                           boundary shows (c11959232 Pv / Fv, c5638815a ct). Try again forgets the session's scroll
//                           anchors (BP) and row expansion (Cie), then resets the boundary; only when Ev names a chunk
//                           heal target and bG allows a reload does it go the pane_retry way (bc, then
//                           window.location.reload()). bG (iV; not exported) is that check. Same shape as 3.6556.2.
//   error-page.mjs          shared-46 wR -> shared-55-BRv2XBP7.js QV (exported l): the full-height error page xG renders
//                           ({ message, error, onRetry }; Try again, or Back to landing page without onRetry).
//   chunk-heal-gate.mjs     shared-15 Pa / ca / la -> shared-100-BBQR7Gmd.js No (exported dt) / oo = "__gb__982582273" /
//                           so: the chunk heal target, behind a GrowthBook flag. This host has no GrowthBook (D29/D31/D33),
//                           so so answers false and the pane_retry / reload branch is unreachable; the branch itself stays
//                           in session-load-error.mjs exactly as shipped.
//   pane-retry-claim.mjs    shared-15 Qa / Ja -> shared-100 Zo (exported ct) / qo: the once-per-chunk sessionStorage claim.
//   chunk-reload-state.mjs  shared-52 pf / vf -> shared-62-DoCqVpIq.js Vd / qd (exported U_ / X_): the reload spacing and
//                           whether a chunk reload is already scheduled (the unload mark sf, $_, is linked from cds-core
//                           markPageUnloading since cds-core wave 5).
//   chunk-heal-probe.mjs    shared-26 Rd -> shared-26-B-POtn5S.js yu (exported _b): how long the heal probe waits.
//   reload-blockers.mjs     shared-104 dc / sc -> shared-123-1Hc1RTKl.js Zc / Gc (exported Vw / Rw): the reload blocker
//                           registry bG reads.
//   unload-veto.mjs         c7f0c0d23 o -> c7f0c0d23-CMovzUAr.js c (exported n): whether a beforeunload holder still holds.
//   compiler-helpers.mjs    shared-frame J9 / J8 / J1 / K1 / J2 / K2 / J3 / K3 (proved by official-4.16336.0
//                           assertCompilerHelpers). cds-core holds them without a publicName; they are pure, so they are
//                           re-sliced here only after their raw declaration hash equals cds-core's (heldByCdsCore).
//
// Every emitted binding is an original top-level declaration sliced from the frozen chunk. A module's bindings are the
// reachable closure of its roots: a declaration's dependencies are its free variables that are top-level bindings of its
// chunk (each declaration is parsed on its own). Nothing is hand-picked, and a renamed or re-pointed minified import
// fails generation instead of silently binding the wrong value. An import (or a same-chunk binding) resolves, in this
// order, to: a named host adapter in src/source-session-load-error-adapters.jsx (its original declaration must carry
// `features`), a verified React export of vendor-frame, a semantic public name of the shared cds-core graph (D1:
// CdsButton), or another module generated here. A binding cds-core holds without a public name is re-sliced only when it
// is pure and byte-identical; cds-core module state without a public name stops generation (D46), nothing is written.
//
// Root location (names move between releases): every root is proved by its features plus one of
//   unique   the only top-level declaration of its chunk carrying all of its features;
//   import   the declaration another generated root imports under the export alias the official chunk uses (checked
//            after generation: that import must resolve to this module's export);
//   readBy   the only free variable of another proved root (same chunk) carrying its features.
//
// `callSites` pin the original text the host wiring (WI-3) follows but cannot import: the EpitaxyChatPanel boundaries of
// the main pane, the secondary pane and the pop-out window, each resolving its fallback to cc43287c9 j (xG) and its
// boundary to shared-26 $b (Ds; the host mounts src/generated/r3b-transcript/render-error-boundary.mjs there).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot, ionSource: source } = official;
const generatedRoot = path.join(root, 'src/generated');
const defaultOutput = 'src/generated/session-load-error';
const sharedGraphArea = 'cds-core';
const adapterModule = '../../source-session-load-error-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = text => ({ loose: text });

// Host dependencies (checked first), keyed by the imported chunk and its export alias. `local` is the declaration the
// alias must still name; `features` must appear in that declaration's prettier form, and `also` pins further declarations
// of the same chunk the adapter answers for. A feature is a string (whitespace-insensitive) or { loose } (R2/E5
// looseFeature: ≤3-character identifiers generalised).
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  [official.vendorIntl]: {
    p: { name: 'useIntl', local: 'q', features: [loose('let e = l(K);'), loose('return (Mt(e), e);')], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: [loose('var Gt = a(Wt, Ut);')], also: { Wt: [loose('let { formatMessage: n, textComponent: a = i } = q(),')] } },
  },
  // shared-25 $u (exported em): the desktop router (TanStack router navigate, else window.location). QV calls it on every
  // render but reads it only in its Back to landing page button, which xG never shows (it always passes onRetry).
  'shared-25-D-aF0gt9.js': { em: { name: 'useRouter', local: '$u', features: ['resetScroll: r?.scroll ?? !0', '(i ? i.back() : window.history.back())',
    'invalidateQueries();', 'push: a,', 'replace: o,', 'back: s,', 'forward: c,', 'refresh: l,', loose('prefetch: ed,')] } },
  // cd14a8022 T (exported u): forget the session's transcript scroll anchors in the 50-entry LRU (s): every view of the
  // main window (`${id}:`), the pop-out (`popout:${id}:`), the projects rail and the side pane. Here: the host transcript
  // scroll cache of src/use-transcript-scroll.js, keyed `code:${id}` (main.jsx).
  'cd14a8022-DdgywyOs.js': { u: { name: 'forgetScrollAnchors', local: 'T', features: ['s.clearByPrefix(`${e}:`)', 's.clearByPrefix(`popout:${e}:`)', 's.clear(_(e))', 's.clear(v(e))'],
    also: { s: ['s = r({ cap: 50, hot: void 0 })'], _: ['return `projects-rail:${e}`;'], v: ['return `side-pane:${e}`;'] } } },
  // cc6e9624e l (exported a): drop the session's tool expansion intentions (`t === e || t.endsWith(":" + e)`). Here:
  // tool-group-expansion.mjs toolGroupExpansion / toolRowExpansion forgetSession, as the row boundary's Try again does.
  'cc6e9624e-QSsNXeYh.js': { a: { name: 'forgetRowExpansion', local: 'l', features: [loose('for (let t of a.keys()) (t === e || t.endsWith(`:${e}`)) && a.delete(t);')] } },
  // shared-0 Uu (exported Rx): a GrowthBook value (forced feature, else the client's evaluated features). This host has no
  // GrowthBook client, so the answer is that of one that never loaded, and shared-100 so's `?? !1` reads false.
  'shared-0-CnnWnVrT.js': { Rx: { name: 'growthBookValue', local: 'Uu', features: [loose('let t = Wu(e);'), loose('return t === void 0 ? zu(e) : t;')],
    also: { Wu: ['if (!t || typeof t.getForcedFeatures != "function") return;'], zu: ['getFeatures(), e) : null;'] } } },
  // shared-26 Du (exported yb): the chunk cache heal report, a probe fetch then Datadog `app.chunk_cache_heal`. This host
  // sends no telemetry (D17); the adapter resolves at once. Only the pane_retry branch calls it, closed here.
  'shared-26-B-POtn5S.js': { yb: { name: 'reportChunkCacheHeal', local: 'Du', features: [loose('let a = await Eu(bu(e, i?.url), n, t, r),'), 'trigger: t,', 'heal_named_source: s,',
    loose('if (uu()) return;'), loose('ke.addAction(du, {')],
    also: { du: ['du = "app.chunk_cache_heal"'] } } },
};
// Same-chunk declarations answered by the host (the declaration itself must carry `features`).
const chunkAdapters = {
  'shared-100-BBQR7Gmd.js': {
    // Po: the heal target of a chunk failure (named source, engine frame or parse form). No calls it only when so(oo)
    // holds, which it never does here; the adapter answers "no heal target" (the bundled local assets of this host cannot
    // be healed by a reload either).
    Po: { name: 'resolveChunkHealTarget', features: [loose('if (Ao(e)) return;'), loose('let t = eo(e);'), 'return n === void 0 ? void 0 : { url: n, form: t.form };',
      'return n === void 0 ? void 0 : { url: n, form: "parse" };'] },
  },
};
// The React Compiler helpers the slices read (official-4.16336.0 compilerHelpers, proved on shared-frame).
const helperNames = ['reactMemoCache', 'memoSentinel', 'memoChanged1', 'memoStore1', 'memoChanged2', 'memoStore2', 'memoChanged3', 'memoStore3'];
const helperExports = Object.fromEntries(helperNames.map(name => {
  const helper = Object.values(official.compilerHelpers).find(h => h.name === name);
  if (!helper) throw Error(`official-4.16336.0 has no compiler helper ${name}`);
  return [helper.local, name];
}));
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots,
// `features` pins each root to strings of its original (prettier-formatted) text and `locate` says how it is proved.
const modules = [
  { target: 'compiler-helpers.mjs', source: official.sharedFrame, exports: helperExports, compilerHelpers: true },
  // shared-55 QV (exported l; `pa` in cc43287c9): the error page, { message, error, onRetry } (TR-T11, as 3.6556.2).
  { target: 'error-page.mjs', source: 'shared-55-BRv2XBP7.js', exports: { QV: 'ErrorPage' }, locate: { QV: 'unique' },
    features: { QV: ['{ message: t, error: n, onRetry: r } = e,', '"/code"', 'className: "min-h-screen flex flex-col items-center justify-center px-4",',
      'className: "text-center max-w-md",', 'className: "text-danger mb-6 text-lg font-medium",', 'variant: "primary",', 'onClick: r,',
      'defaultMessage: "Try again",', 'id: "FazwRldA7z",', 'icon: "ArrowLeft",', 'defaultMessage: "Back to landing page",'] } },
  // shared-62 Vd (exported U_; `$o`): the spacing between chunk reloads; qd (X_; `is`): a chunk reload is already
  // scheduled. sf ($_; `Oo`, mark the page as unloading: the pagehide listener's handler) and its state af / of are
  // cds-core's since wave 5 (markPageUnloading / pageUnloadingAt / pageUnloadingPerfAt, with the carried pagehide /
  // pageshow registration, cds-integrate/wave5): the importer links it (sharedGraph 'cds-core'), this graph no longer
  // cuts a second copy (D1).
  { target: 'chunk-reload-state.mjs', source: 'shared-62-DoCqVpIq.js',
    exports: { Vd: 'CHUNK_RELOAD_SPACING_MS', qd: 'isChunkReloadPending' },
    locate: { Vd: 'import', qd: 'import' },
    features: { Vd: [loose('Vd = 1e4')], qd: [loose('return Gd !== null;')] } },
  // shared-26 yu (exported _b; `tc`): the heal probe's wait.
  { target: 'chunk-heal-probe.mjs', source: 'shared-26-B-POtn5S.js', exports: { yu: 'CHUNK_HEAL_PROBE_MS' }, locate: { yu: 'import' },
    features: { yu: [loose('yu = 2e3')] } },
  // shared-100 No (exported dt; `Ev`): the GrowthBook-gated chunk heal target; oo its flag, so the flag check (D33).
  { target: 'chunk-heal-gate.mjs', source: 'shared-100-BBQR7Gmd.js', exports: { No: 'chunkHealTarget', oo: 'CHUNK_HEAL_FLAG', so: 'chunkHealFlagOn' },
    locate: { No: 'unique', oo: { readBy: 'No' }, so: { readBy: 'No' } },
    features: { No: [loose('return so(oo) ? Po(e) : void 0;')], oo: ['"__gb__982582273"'], so: [loose('return N(e) ?? !1;'), 'return !1;'] } },
  // shared-100 Zo (exported ct; `Tv`): claim the pane_retry heal once per chunk URL and form in sessionStorage.
  { target: 'pane-retry-claim.mjs', source: 'shared-100-BBQR7Gmd.js', exports: { Zo: 'claimPaneRetry', qo: 'PANE_RETRY_CLAIM_PREFIX' },
    locate: { Zo: 'import', qo: { readBy: 'Zo' } },
    features: { Zo: [loose('return $o(qo, e);')], qo: ['"spa_pane_retry_claimed:"'] } },
  // shared-123 Zc (exported Vw; `$a`): the first registered reload blocker that is not elective, else null; Gc (Rw) the
  // registration (nothing on this host registers one).
  { target: 'reload-blockers.mjs', source: 'shared-123-1Hc1RTKl.js', exports: { Zc: 'reloadBlocker', Gc: 'registerReloadBlocker' },
    locate: { Zc: 'import', Gc: 'unique' },
    features: { Zc: [loose('return Xc((e) => !e.electiveOnly);')], Gc: ['holdsClientNavigation: n = !0,', 'electiveOnly: r = !1,', 'holdsDeferredReload: i = !1,', 'holdsSignOutLeave: a = !0,'] } },
  // c7f0c0d23 c (exported n; `Px`): some beforeunload holder still holds.
  { target: 'unload-veto.mjs', source: 'c7f0c0d23-CMovzUAr.js', exports: { c: 'unloadHeld' }, locate: { c: 'import' },
    features: { c: [loose('return [...s].some(d);')] } },
  // cc43287c9 xG (exported j) and bG.
  { target: 'session-load-error.mjs', source: 'cc43287c9-dzfX-J5i.js', exports: { xG: 'SessionLoadError', bG: 'canReloadPane' },
    locate: { xG: 'unique', bG: { readBy: 'xG' } },
    features: {
      xG: ['{ error: t, reset: n, sessionId: r } = e,', loose('(r !== void 0 && (BP(r), Cie(r)), n());'), loose('}, tc + $o)),'), 'window.location.reload();',
        '(clearTimeout(s.current), (a.current = !1), u());', 'if (a.current) return;', loose('let e = Ev(t);'), loose('if (e !== void 0 && bG()) {'), loose('if (is()) {'),
        loose('if (Tv(e)) {'), loose('bc(t, "pane_retry", tc, void 0, e).finally(() => {'), loose('if (!bG()) {'),
        'defaultMessage: "Something went wrong loading this session.",', 'id: "z0PjNhLbSp",', loose('p(pa, { message: m, onRetry: f, error: t })')],
      bG: [loose('return $a() === null && !Px();')],
    } },
];
// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration); `imports`
// pins what a local name of that chunk resolves to (file, then the declaration that file exports under the alias).
const callSites = [
  { source: 'c11959232-D8gLbLAI.js', binding: 'Pv', role: 'Main pane: EpitaxyChatPanel boundary (resetOn = mountKey), fallback xG with the session id',
    features: ['componentName: "EpitaxyChatPanel",', loose('resetOn: o,'), '{ feature: "epitaxy" }', loose('(y = { sessionId: a }),'),
      loose('(b = (e, t) => i(bs, { error: e, reset: t, sessionId: a })),'), 'componentName: "EpitaxyAgentGraphView",'],
    imports: { bs: ['cc43287c9-dzfX-J5i.js', 'xG'], pn: ['shared-26-B-POtn5S.js', 'Ds'] } },
  { source: 'c11959232-D8gLbLAI.js', binding: 'Fv', role: 'Secondary pane: the same boundary, resetOn = the session id or the pane draft key',
    features: ['m = r ?? `pane-draft-${a ?? o}`,', loose('resetOn: m,'), 'componentName: "EpitaxyChatPanel",', '{ feature: "epitaxy", pane: "secondary" }',
      loose('(_ = (e, t) => i(bs, { error: e, reset: t, sessionId: r })),')],
    imports: { bs: ['cc43287c9-dzfX-J5i.js', 'xG'], pn: ['shared-26-B-POtn5S.js', 'Ds'] } },
  // 4.16336.0 moved the pop-out's boundary inline into the pane window (3.6556.2 c5638815a dt -> ct) and its fallback
  // into an arrow that rethrows a chunk failure (u = shared-0 Sm) before xG.
  { source: 'c5638815a-DZAqfzwl.js', binding: 'ct', role: 'Pop-out window: the same boundary with its own sanitizer; a chunk failure (u) rethrows past it',
    features: ['componentName: "EpitaxyChatPanel",', 'tags: { feature: "epitaxy", pane: "popout" },', loose('sanitizeError: st,'), loose('if (u(t)) throw t;'),
      loose('return e(le, { error: t, reset: n, sessionId: a });')],
    imports: { le: ['cc43287c9-dzfX-J5i.js', 'xG'], b: ['shared-26-B-POtn5S.js', 'Ds'] } },
];
// Pinned on the minified bytes (each must occur exactly once in its chunk).
const rawCallSites = [
  { source: 'cc43287c9-dzfX-J5i.js', role: 'xG is exported as j, and bG is the reload check it reads',
    features: ['Something went wrong loading this session', 'id:"z0PjNhLbSp"', 'bc(t,"pane_retry",tc,void 0,e)', 'function bG(){return $a()===null&&!Px()}', 'xG as j'] },
  { source: 'shared-100-BBQR7Gmd.js', role: 'The chunk heal gate and its GrowthBook flag',
    features: ['function No(e){return so(oo)?Po(e):void 0}', 'oo="__gb__982582273"', '__gb__982582273'] },
  { source: 'shared-55-BRv2XBP7.js', role: 'The error page layout', features: ['min-h-screen flex flex-col items-center justify-center px-4'] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
// The prettier form of one declaration, which features are matched against.
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk (parsed on its own; Babel's program scope
// lists what the snippet reads or assigns without declaring).
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
const missingFeatures = (text, features = []) => {
  const flat = normalised(text);
  return features.filter(f => typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !official.looseFeature(f.loose).test(text));
};
function assertFeatures(label, text, features = []) {
  const missing = missingFeatures(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// A root must be the only candidate declaration carrying every one of its features. Candidates: the chunk's top-level
// function / variable declarations, or, for a `readBy` root, the free variables of the root that reads it. Pre-filter
// only (the prettier check decides): every string literal and 4+ character word of the features must occur in the raw
// declaration.
const literalsOf = features => features.flatMap(f => [...(typeof f === 'string' ? f : f.loose).matchAll(/"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]{3,}/g)].map(m => m[0]));
async function assertUniqueRoot(src, spec, name, candidates) {
  const features = spec.features?.[name] ?? [];
  if (!features.length) throw Error(`${spec.target}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const other of candidates) {
    const entry = src.top.get(other);
    if (!entry || (entry.kind !== 'function' && entry.kind !== 'var')) continue;
    if (!literalsOf(features).every(literal => declarationText(src, entry).includes(literal))) continue;
    if (!missingFeatures(await featureText(src, entry), features).length) hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${spec.target}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// R3: a React export of vendor-frame, checked on its top-level `local=<namespace>.<member>` (official.assertVendorAlias).
function vendorImport(file, alias, src) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(src.code, alias);
  return [module, member];
}
// The shared cds-core graph (engine cfg.sharedGraph 'cds-core'): version, snapshot, every module's referenceVersion, file
// bytes and source bytes; publicNames must be exported by their module. `held` maps every binding it slices to its raw
// declaration hash.
async function sharedGraph() {
  const area = sharedGraphArea, dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  if (manifest.referenceSnapshot !== referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(source, path.basename(m.source))).catch(() => null);
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
  return { area, held, published, manifestSha256: sha(manifestBytes) };
}
// D46: module state (a Map / Set / WeakMap / WeakSet, or a React context) must exist once; cds-core holding one without a
// public name means a second copy here, so generation stops.
function isModuleState(src, entry) {
  if (entry.kind !== 'var') return false;
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && callee.file === official.vendorFrame && official.reactAliases[callee.alias]?.[1] === 'createContext') return true;
  }
  return false;
}
const stateConflict = (graph, key, text) =>
  Object.assign(Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${key}`), { stateConflict: { binding: key, text } });

export async function extractSessionLoadError({ check = false, output: outputDir = defaultOutput } = {}) {
  const output = path.resolve(root, outputDir);
  const cache = new Map();
  const graph = await sharedGraph();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-load-error.mjs',
    adapterModule: 'src/source-session-load-error-adapters.jsx', sharedGraph: graph.area, modules: [], callSites: [],
  };
  const files = {};
  const stateConflicts = [];
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.code);
      for (const [local, name] of Object.entries(spec.exports))
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
    }
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [];
    const add = async (name, reachedBy) => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const { file, alias } = entry, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const adapter = adapters[file]?.[alias];
        if (adapter) {
          if (adapter.local !== local) throw Error(`${spec.target}: adapter alias ${via} is ${local}, expected ${adapter.local}`);
          const original = dep.top.get(local);
          if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration`);
          assertFeatures(`${spec.target}: adapter ${via} (${local})`, await featureText(dep, original), adapter.features);
          for (const [other, features] of Object.entries(adapter.also ?? {})) {
            const also = dep.top.get(other);
            if (!also || also.kind === 'import') throw Error(`${spec.target}: adapter ${via} pins ${other}, which is not a declaration of ${file}`);
            assertFeatures(`${spec.target}: adapter ${via} (${other})`, await featureText(dep, also), features);
          }
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
          return;
        }
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const key = `${file}#${local}`, shared = graph.published.get(key);
        if (shared) {
          const held = graph.held.get(key), original = dep.top.get(local);
          if (!held?.sha256 || !original || original.kind === 'import' || held.sha256 !== sha(declarationText(dep, original)))
            throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area} publishes as ${shared.name}`);
          imports.set(name, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via, kind: 'shared-graph', original: local, linkedSha256: held.sha256 });
          return;
        }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (generated) {
          imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated', original: local });
          return;
        }
        const held = graph.held.get(key), original = dep.top.get(local);
        if (held && original && isModuleState(dep, original)) {
          stateConflicts.push({ binding: key, text: declarationText(dep, original), reachedBy: `${spec.target}: ${spec.source}#${reachedBy} imports ${via}` });
          return;
        }
        throw Error(`${spec.target}: unresolved import ${via} (${local})${held ? ` (held by ${graph.area} without a publicName)` : ''}`);
      }
      // A same-chunk declaration the host answers.
      const own = chunkAdapters[spec.source]?.[name];
      if (own) {
        assertFeatures(`${spec.target}: chunk adapter ${spec.source}:${name}`, await featureText(src, entry), own.features);
        imports.set(name, { from: adapterModule, name: own.name, via: `${spec.source}:${name}`, kind: 'adapter', original: name });
        return;
      }
      // A sibling module already emits this declaration of the same chunk.
      const sibling = emitted.find(m => m.spec.source === spec.source && m.spec.exports[name]);
      if (sibling && !Object.hasOwn(spec.exports, name)) {
        imports.set(name, { from: `./${sibling.spec.target}`, name: sibling.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' });
        return;
      }
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name}`);
      const text = declarationText(src, entry);
      // cds-core: a published binding is linked, never re-sliced; a held one is re-sliced only if pure and identical.
      const key = `${spec.source}#${name}`, shared = graph.published.get(key), held = graph.held.get(key);
      if (shared) {
        if (!held?.sha256 || held.sha256 !== sha(text)) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area} publishes as ${shared.name}`);
        imports.set(name, { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via: key, kind: 'shared-graph', original: name, linkedSha256: held.sha256 });
        return;
      }
      if (held) {
        if (isModuleState(src, entry)) { stateConflicts.push({ binding: key, text, reachedBy: `${spec.target}: ${spec.source}#${reachedBy}` }); return; }
        if (held.sha256 !== sha(text)) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep, name);
    };
    // Roots read by another root are located after it (`readBy`), the rest in declaration order of `exports`.
    const roots = Object.keys(spec.exports);
    const readerOf = name => spec.locate?.[name]?.readBy;
    for (const name of [...roots.filter(n => !readerOf(n)), ...roots.filter(n => readerOf(n))]) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.compilerHelpers) {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        const how = spec.locate?.[name];
        if (how === 'unique') await assertUniqueRoot(src, spec, name, [...src.top.keys()]);
        else if (readerOf(name)) {
          if (!roots.includes(readerOf(name))) throw Error(`${spec.target}: root ${name} is read by ${readerOf(name)}, which is not a root here`);
          await assertUniqueRoot(src, spec, name, declarationDeps(src, readerOf(name)));
        } else if (how !== 'import') throw Error(`${spec.target}: root ${name} has no location proof`);
      }
      await add(name, name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-load-error.mjs.\n// Edit the extractor or src/source-session-load-error-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['Date', 'performance', 'window', 'setTimeout', 'clearTimeout', 'sessionStorage', 'URL', 'Map', 'Set', 'Symbol', 'undefined']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length && !stateConflicts.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind,
        ...(e.original ? { original: e.original } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: spec.exports,
      ...(spec.locate ? { locate: spec.locate } : {}),
      heldByCdsCore,
    });
    emitted.push({ spec });
  }
  // D46: stop before anything is written; the caller records the conflicts (report.json blocked).
  if (stateConflicts.length)
    throw Object.assign(Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`), { stateConflicts });
  // `import` roots: some generated module must import exactly that declaration under the official export alias.
  for (const spec of modules) for (const [name, how] of Object.entries(spec.locate ?? {})) {
    if (how !== 'import') continue;
    const importers = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'generated' && i.from === `./${spec.target}` && i.original === name && i.via.startsWith(`${spec.source}:`)));
    if (!importers.length) throw Error(`${spec.target}: root ${name} is located by import, but no generated root imports ${spec.source}#${name}`);
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    const text = await featureText(src, entry);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const resolved = src.top.get(local);
      if (resolved?.kind !== 'import') throw Error(`call site ${site.source}:${site.binding}: ${local} is not an import`);
      if (!declarationDeps(src, site.binding).includes(local)) throw Error(`call site ${site.source}:${site.binding} does not read ${local}`);
      const dep = await readSource(resolved.file, cache);
      const target = dep.exported.get(resolved.alias);
      if (resolved.file !== file || target !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${resolved.file}:${target}, expected ${file}:${expected}`);
      imports[local] = `${file}:${resolved.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features, imports });
  }
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session load error output set changed: ${present.join(',')}. Run scripts/extract-session-load-error.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session load error source mismatch: ${name}. Run scripts/extract-session-load-error.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session load error modules into ${path.relative(root, output)} (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites, ${graph.area} ${graph.manifestSha256.slice(0, 8)}).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--out');
  await extractSessionLoadError({ check: process.argv.includes('--check'), ...(at > 0 ? { output: process.argv[at + 1] } : {}) });
}
