// R4f-error E1 (transcript-session-error-boundary, transcript-10): extract the 2.42304.0 session load error boundary
// fallback without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/session-load-error, own scripts/verify-gen-session-load-error.mjs).
//
//   session-load-error.mjs  cc43287c9 fV (exported C): "Something went wrong loading this session." with Try again, the
//                           fallback every EpitaxyChatPanel render-error boundary shows (c11959232 Nm / Pm, c5638815a
//                           lt). Try again forgets the session's scroll anchors ($A) and row expansion (jP), then resets
//                           the boundary; only when Jh names a chunk heal target and dV allows a reload does it go the
//                           pane_retry way (lo, then window.location.reload()). dV (not exported there) is that check.
//   error-page.mjs          shared-19 T9 (exported y): the full-height error page fV renders (message, optional hint, Try
//                           again or Back to landing page).
//   chunk-heal-gate.mjs     shared-20 g_ (exported ya) with Xg and Yg = "__gb__982582273": the chunk heal target, behind
//                           a GrowthBook flag. This host has no GrowthBook (D29/D31/D33), so Xg answers false and the
//                           pane_retry / reload branch is unreachable; the branch itself stays in session-load-error.mjs
//                           exactly as shipped.
//   pane-retry-claim.mjs    shared-20 j_ (exported _a): the once-per-chunk sessionStorage claim of that branch.
//   chunk-reload-state.mjs  shared-52 fd / Ad / _d (exported qp / nm / $p): the reload spacing, the unload mark and
//                           whether a chunk reload is already scheduled (gd, which schedules one, is never called here).
//   chunk-heal-probe.mjs    shared-26 zu (exported _p): how long the heal probe waits.
//   reload-blockers.mjs     shared-104 Ho / Ro (exported lh / sh): the reload blocker registry dV reads.
//   unload-veto.mjs         c7f0c0d23 o (exported t): whether a beforeunload holder still holds.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. A module's bindings are the
// reachable closure of its roots: a declaration's dependencies are its free variables that are top-level bindings of its
// chunk (each declaration is parsed on its own, as extract-r4e-findings.mjs does). Nothing is hand-picked, and a renamed
// or re-pointed minified import fails generation instead of silently binding the wrong value. An import (or a
// same-chunk binding) resolves, in this order, to: a named host adapter in src/source-session-load-error-adapters.jsx
// (its original declaration must carry `features`), a verified React export of vendor-frame, a semantic public name of
// the shared view-tabs graph (D1: CdsButton), or another module generated here. Nothing else is accepted.
//
// `callSites` pin the original text the host wiring (WI-3) follows but cannot import: the EpitaxyChatPanel boundaries of
// the main pane, the secondary pane and the pop-out window, each resolving its fallback to cc43287c9 C (fV) and its
// boundary to shared-26 Vp (kl, generated as src/generated/r3b-transcript/render-error-boundary.mjs).
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
const output = path.join(root, 'src/generated/session-load-error');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-session-load-error-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    So: ['react', 'useRef'], uo: ['react', 'useCallback'], mo: ['react', 'useEffect'],
    Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
  },
};
// Host dependencies (checked first). `local` is the declaration the export alias must still name; `features` must appear
// in that declaration's prettier form, and `also` pins further declarations of the same chunk the adapter answers for.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
    l: { name: 'FormattedMessage', local: 'Gt', features: ['var Gt = u(Wt, Ut);'], also: { Wt: ['let { formatMessage: r, textComponent: i = n } = q(),'] } },
  },
  // shared-25 Jf (exported Wf): the desktop router (TanStack router navigate, else window.location). T9 calls it on every
  // render but reads it only in its Back to landing page button, which fV never shows (it always passes onRetry).
  'shared-25-DP8p7i1Z.js': { Wf: { name: 'useRouter', local: 'Jf', features: ['push: (n, i) => {', 'r.navigate(Gf(a), { resetScroll: i?.scroll ?? !0 });',
    'back: () => (r ? r.back() : window.history.back()),', 'refresh: () => {', 'n.invalidateQueries();'] } },
  // cd14a8022 T (exported l): forget the session's transcript scroll anchors in the 50-entry LRU (s, cb670556a r): every
  // view of the main window (`${id}:`), the pop-out (`popout:${id}:`), the projects rail and the side pane. Here: the
  // host transcript scroll cache of src/use-transcript-scroll.js, keyed `code:${id}` (main.jsx).
  'cd14a8022-DDLlDKpQ.js': { l: { name: 'forgetScrollAnchors', local: 'T', features: ['s.clearByPrefix(`${e}:`)', 's.clearByPrefix(`popout:${e}:`)', 's.clear(_(e))', 's.clear(v(e))'],
    also: { s: ['s = r({ cap: 50, hot: void 0 })'], _: ['return `projects-rail:${e}`;'], v: ['return `side-pane:${e}`;'] } } },
  // cc6e9624e u (exported a): drop the session's tool expansion intentions (`t === e || t.endsWith(":" + e)`). Here:
  // tool-group-expansion.mjs toolGroupExpansion / toolRowExpansion forgetSession, as the row boundary's Try again does.
  'cc6e9624e-Dw5fc5HL.js': { a: { name: 'forgetRowExpansion', local: 'u', features: ['for (let t of o.keys()) (t === e || t.endsWith(`:${e}`)) && o.delete(t);'] } },
  // shared-0 no (exported gy): a GrowthBook value (forced feature, else the client's evaluated features). This host has no
  // GrowthBook client, so the answer is that of one that never loaded: undefined, and Xg's `?? !1` reads false.
  'shared-0-ByI5P0CP.js': { gy: { name: 'growthBookValue', local: 'no', features: ['let t = ro(e);', 'return t === void 0 ? Qa(e) : t;'],
    also: { ro: ['if (!t || typeof t.getForcedFeatures != "function") return;'], Qa: ['return t ? $a(t.getFeatures(), e) : null;'], Ka: ['return typeof window > "u" ? null : Wa;'] } } },
  // shared-26 qu (exported yp): the chunk cache heal report, a probe fetch then Datadog `app.chunk_cache_heal`. This host
  // sends no telemetry (D17); the adapter resolves at once. Only the pane_retry branch calls it, closed here.
  'shared-26-CgdP_nTj.js': { yp: { name: 'reportChunkCacheHeal', local: 'qu', features: ['let a = await Ku(Bu(e, i?.url), n, t, r),', 'Be.addAction(Nu, {', 'trigger: t,', 'heal_named_source: s,'],
    also: { Nu: ['Nu = "app.chunk_cache_heal"'] } } },
};
// Same-chunk declarations answered by the host (the declaration itself must carry `features`).
const chunkAdapters = {
  'shared-20-B7UqYfsi.js': {
    // __: the heal target of a chunk failure (named source, engine frame or parse form; 74 original declarations: 30 of
    // shared-20, 19 of shared-78, 14 of shared-0, 10 of shared-26, 1 of shared-25, reached through 12 cross-chunk
    // imports; among them two more GrowthBook flags, Gg "__gb__550494059" and qg "__gb__2762990909"). g_ calls it only
    // when Xg(Yg) holds, which it never does here; the adapter answers "no heal target" (the bundled local assets of this
    // host cannot be healed by a reload either).
    __: { name: 'resolveChunkHealTarget', features: ['if (m_(e)) return;', 'let t = Ug(e);', 'return n === void 0 ? void 0 : { url: n, form: t.form };',
      'return n === void 0 ? void 0 : { url: n, form: "parse" };'] },
  },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text.
const modules = [
  // shared-19 T9 (exported y; `gi` in cc43287c9): the error page.
  { target: 'error-page.mjs', source: 'shared-19-CkPOiIKm.js', exports: { T9: 'ErrorPage' },
    features: { T9: ['showBackButton: n = !0,', 'redirect: r = "/code",', 'let s = He();', 'className: "min-h-screen flex flex-col items-center justify-center px-4",',
      'className: "text-center max-w-md",', 'className: "text-danger mb-6 text-lg font-medium",', '? x("div", { className: "mb-6 text-sm text-secondary", children: t })',
      'variant: "primary",', 'onClick: o,', 'children: x(X, { defaultMessage: "Try again", id: "FazwRldA7z" }),', 'icon: "ArrowLeft",',
      'onClick: a ?? (() => s.push(r)),', 'defaultMessage: "Back to landing page",'] } },
  // shared-52 fd (exported qp; `Xo`): the spacing between chunk reloads; Ad (nm; `qo`): mark the page as unloading (the
  // pagehide listener's handler); _d ($p; `uo`): a chunk reload is already scheduled (hd, set only by gd).
  { target: 'chunk-reload-state.mjs', source: 'shared-52-DGviI8xb.js',
    exports: { fd: 'CHUNK_RELOAD_SPACING_MS', Ad: 'markPageUnloading', _d: 'isChunkReloadPending' },
    features: { fd: ['fd = 1e4'], Ad: ['Od = Date.now();', 'kd = performance.now();', 'kd = void 0;'], _d: ['return hd !== null;'] } },
  // shared-26 zu (exported _p; `$a`): the heal probe's wait.
  { target: 'chunk-heal-probe.mjs', source: 'shared-26-CgdP_nTj.js', exports: { zu: 'CHUNK_HEAL_PROBE_MS' }, features: { zu: ['zu = 2e3'] } },
  // shared-20 g_ (exported ya; `Jh`): the GrowthBook-gated chunk heal target; Yg its flag.
  { target: 'chunk-heal-gate.mjs', source: 'shared-20-B7UqYfsi.js', exports: { g_: 'chunkHealTarget', Yg: 'CHUNK_HEAL_FLAG', Xg: 'chunkHealFlagOn' },
    features: { g_: ['return Xg(Yg) ? __(e) : void 0;'], Yg: ['Yg = "__gb__982582273"'], Xg: ['return $e(e) ?? !1;', 'return !1;'] } },
  // shared-20 j_ (exported _a; `vh`): claim the pane_retry heal once per chunk URL and form in sessionStorage.
  { target: 'pane-retry-claim.mjs', source: 'shared-20-B7UqYfsi.js', exports: { j_: 'claimPaneRetry', O_: 'PANE_RETRY_CLAIM_PREFIX' },
    features: { j_: ['return M_(O_, e);'], O_: ['O_ = "spa_pane_retry_claimed:"'] } },
  // shared-104 Ho (exported lh; `xc`): the first registered reload blocker that is not elective, else null; Ro (sh) the
  // registration (nothing on this host registers one).
  { target: 'reload-blockers.mjs', source: 'shared-104-Cqo2-vQh.js', exports: { Ho: 'reloadBlocker', Ro: 'registerReloadBlocker' },
    features: { Ho: ['return Vo((e) => !e.electiveOnly);'], Ro: ['holdsClientNavigation: n = !0,', 'electiveOnly: r = !1,', 'Lo.set(e, {'] } },
  // c7f0c0d23 o (exported t; `YP`): some beforeunload holder still holds.
  { target: 'unload-veto.mjs', source: 'c7f0c0d23-BDc3qEXV.js', exports: { o: 'unloadHeld' }, features: { o: ['return [...a].some(s);'] } },
  // cc43287c9 fV (exported C) and dV.
  { target: 'session-load-error.mjs', source: 'cc43287c9-DAfOi8yP.js', exports: { fV: 'SessionLoadError', dV: 'canReloadPane' },
    features: {
      fV: ['function fV({ error: e, reset: t, sessionId: n }) {', '(n !== void 0 && ($A(n), jP(n)), t());', '}, $a + Xo)),', 'window.location.reload();',
        '(clearTimeout(o.current), (i.current = !1), s());', 'if (i.current) return;', 'let t = Jh(e);', 'if (t !== void 0 && dV()) {', 'if (uo()) {', 'if (vh(t)) {',
        'lo(e, "pane_retry", $a, void 0, t).finally(() => {', 'if (!dV()) {', 'defaultMessage: "Something went wrong loading this session.",', 'id: "z0PjNhLbSp",',
        'onRetry: l,', 'error: e,'],
      dV: ['return xc() === null && !YP();'],
    } },
];
// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration); `imports`
// pins what a local name of that chunk resolves to (file, then the declaration that file exports under the alias).
const callSites = [
  { source: 'c11959232-Dx4NfIyJ.js', binding: 'Nm', role: 'Main pane: EpitaxyChatPanel boundary (resetOn = mountKey), fallback fV with the session id',
    features: ['componentName: "EpitaxyChatPanel",', 'resetOn: i,', 'tags: { feature: "epitaxy" },', 'metadata: { sessionId: r },',
      'fallback: (e, t) => s(qo, { error: e, reset: t, sessionId: r }),', 'componentName: "EpitaxyAgentGraphView",'],
    imports: { qo: ['cc43287c9-DAfOi8yP.js', 'fV'], Zt: ['shared-26-CgdP_nTj.js', 'kl'] } },
  { source: 'c11959232-Dx4NfIyJ.js', binding: 'Pm', role: 'Secondary pane: the same boundary, resetOn = the session id or the pane draft key',
    features: ['let p = n ?? `pane-draft-${r ?? i}`;', 'resetOn: p,', 'componentName: "EpitaxyChatPanel",', 'tags: { feature: "epitaxy", pane: "secondary" },',
      'fallback: (e, t) => s(qo, { error: e, reset: t, sessionId: n }),'],
    imports: { qo: ['cc43287c9-DAfOi8yP.js', 'fV'], Zt: ['shared-26-CgdP_nTj.js', 'kl'] } },
  { source: 'c5638815a-D1NXo6h5.js', binding: 'lt', role: 'Pop-out window: the same boundary with its own sanitizer; a chunk failure (p) rethrows past it',
    features: ['componentName: "EpitaxyChatPanel",', 'tags: { feature: "epitaxy", pane: "popout" },', 'sanitizeError: ct,', 'if (p(e)) throw e;',
      'return n(Se, { error: e, reset: t, sessionId: a });'],
    imports: { Se: ['cc43287c9-DAfOi8yP.js', 'fV'], w: ['shared-26-CgdP_nTj.js', 'kl'] } },
];
// Pinned on the minified bytes (each must occur exactly once in its chunk).
const rawCallSites = [
  { source: 'cc43287c9-DAfOi8yP.js', role: 'fV is exported as C, and dV is the reload check it reads',
    features: ['Something went wrong loading this session', 'id:"z0PjNhLbSp"', 'lo(e,"pane_retry",$a,void 0,t)', 'function dV(){return xc()===null&&!YP()}', 'fV as C'] },
  { source: 'shared-20-B7UqYfsi.js', role: 'The chunk heal gate and its GrowthBook flag',
    features: ['function g_(e){return Xg(Yg)?__(e):void 0}', 'Yg="__gb__982582273"', '__gb__982582273'] },
  { source: 'shared-19-CkPOiIKm.js', role: 'The error page layout', features: ['min-h-screen flex flex-col items-center justify-center px-4'] },
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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
// D1: the shared view-tabs graph publishes semantic names for (file, local).
async function viewTabsPublic() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}

export async function extractSessionLoadError({ check = false } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-load-error.mjs',
    adapterModule: 'src/source-session-load-error-adapters.jsx', modules: [], callSites: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
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
        const shared = published.get(`${file}#${local}`);
        if (shared) { imports.set(name, { from: `../view-tabs/${file}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
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
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
      await add(name);
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
    const allowed = new Set(['Date', 'performance', 'window', 'setTimeout', 'clearTimeout', 'sessionStorage', 'URL', 'Map', 'Set', 'undefined']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
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
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session load error modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSessionLoadError({ check: process.argv.includes('--check') });
