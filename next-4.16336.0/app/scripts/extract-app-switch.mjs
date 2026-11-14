// Extract the 3.6556.2 compact Chat/Code mode switch (research/app-switch.md W1, decision D11; 3.6556.2 migration
// titlebar-frame §3.3, TF-C13/C14): shared-21 lT (exported `xc`, the segment builder over the CDS SegmentedControl),
// its activity dot kw/Aw (with the compiler-hoisted dT indicator and uT value map), copy Uw/Ww, the arrow chord hint mT
// and the size hook nT; shared-18 jC (exported `hu`, the `df-app-switch` frame that tags every `[role='radio']` with its
// mode) with the clay dot and hub-look helpers; plus the small original leaves they read.
//
// 3.6556.2 is React Compiler output: every component reads the compiler's memo cache (shared-frame J9 = vendor-frame
// `Oo`, react/compiler-runtime `c`) and the J/K/I/Z slot helpers. Those, like the CDS SegmentedControl, Pulse, density
// hook, clsx, merged refs and ownerWindow, are published once by the shared view-tabs graph (E3/D1) and imported from it
// by their semantic names; nothing here slices a second copy. The 2.42304.0 leaves `owner-window.mjs` (shared-25
// ownerWindow) and `cds-density.mjs` (shared-frame useCdsDensity) are therefore no longer emitted: view-tabs publishes
// both. Every exported name the other generated areas import (sidebar-sections: ClayStatusDot, hubAttention) is kept.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. An import (or a same-chunk
// binding) resolves, in this order, to: a named host adapter in src/source-app-switch-adapters.jsx (feature-checked),
// a verified React export of vendor-frame (official-3.6556.2.mjs assertVendorAlias / assertCompilerRuntime), a semantic
// public name of the shared view-tabs graph, or another module generated here. Nothing else is accepted.
//
// The container (shared-21 fT, exported `Sc`) and its call site (shared-22 GI) read the desktop router, GrowthBook,
// telemetry and the code-entitlement store, so they are not emitted. Their host replica lives in
// src/source-app-switch.jsx; `callSites` below pins the exact original text that replica follows, so a version bump
// that changes the container or the titlebar wrapper stops here.
//
// D0: own generator, own output folder (src/generated/app-switch), own scripts/verify-gen-app-switch.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot, looseFeature } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/app-switch');
const publicAssets = path.join(root, 'public');
const adapterModule = '../../source-app-switch-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// R2/E5: a feature with minified names is written through looseFeature() (identifiers of up to three characters
// generalised, recorded as {loose}); plain strings are matched literally (whitespace-normalised).
const loose = text => ({ loose: text });

// vendor-frame re-exports React; each alias is checked against official.reactAliases (R3: `Co` is useRef and `Ha` jsx
// in 3.6556.2; the 2.42304.0 aliases point at other members now) and its top-level `local=<ns>.<member>` declarator.
const vendor = {
  [official.vendorFrame]: Object.fromEntries(['Co', 'bo', 'xo', 'fo', 'Ha', 'to', 'Oo'].map(alias => [alias, official.reactAliases[alias]])),
};
// Host dependencies (checked first). `features` must appear in the same-chunk closure of the original binding.
const adapters = {
  // react-intl useIntl -> the local catalog (source-code-start-adapters.jsx useStartIntl: t() + intl-messageformat).
  [official.vendorIntl]: { p: { name: 'useIntl', features: ['[React Intl]'] } },
  // shared-52 th (exported `og`): whether a fizzy-lake part is on, `eh().parts.includes(e)` over the root's
  // data-cds-fizzy-lake attribute filtered by the allow-list Qm, which 3.6556.2 ships empty (`Qm = []`). E12/R15:
  // the host keeps fizzy-lake off and never writes that attribute, so the original answers false for every part
  // (shared-18 GC asks for "type"; WC then keeps the caller's colour).
  'shared-52-uHFNjl7C.js': { og: { name: 'isFizzyLakePart', features: ['.parts.includes(e)', '"data-cds-fizzy-lake"', loose('Qm = []')] } },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text. `rewrites` are literal host path rewrites (recorded).
const modules = [
  // vendor-intl tn (exported `f`): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: official.vendorIntl, exports: { tn: 'defineMessages' },
    features: { tn: ['return e;'] } },
  // shared-4 jS (exported `sr`): working-dot kind, clay or sprite.
  { target: 'dot-kind.mjs', source: 'shared-4-DUB1Oi0O.js', exports: { jS: 'sidebarDotKind' },
    features: { jS: ['"clay"', '"sprite"'] } },
  // shared-5 pS (exported `oo`): the boot fade class GI puts on every titlebar control wrapper (`e`).
  { target: 'boot-fade.mjs', source: 'shared-5-Bg6ZMqvt.js', exports: { pS: 'staticComposerBootFade' },
    features: { pS: ['"static-composer-boot-fade"'] } },
  // shared-78 cp (exported `kw`; shared-21 kw imports it as `Nc`): the hub look, `useContext($f) ?? tp`. tp only
  // changes when the desktop hub verdict publisher runs, which this host has none of, and nothing provides $f: the
  // original answers false.
  { target: 'hub-look.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { cp: 'useHubLook' },
    features: { cp: [loose('return C($f) ?? tp;')] } },
  // shared-18: jC (exported `hu`) the df-app-switch frame; Kv (exported `yp`) aligns infinite animations to the time
  // origin; NC (exported `mu`) the clay status dot; KC/PC/FC (exported `cu`/`lu`/`pu`) the hub-look dot mapping; WC
  // (exported `uu`) the "needs you" colour, blue only while the fizzy-lake `type` part is on (GC).
  { target: 'app-switch-frame.mjs', source: 'shared-18-D3y8YMFN.js',
    exports: { jC: 'AppSwitchFrame', Kv: 'syncInfiniteAnimations', NC: 'ClayStatusDot', KC: 'hubAttention', PC: 'hubDotMode', FC: 'isClayDot', WC: 'needsYouColor' },
    features: {
      jC: ['"df-app-switch"', `querySelectorAll("[role='radio']")`, '.dataset.mode', 'childList: !0, subtree: !0', loose('new MutationObserver(t)')],
      Kv: ['getAnimations()', 'iterations !== 1 / 0', 'performance.timeOrigin', '(e.startTime = -(n % r))'],
      NC: ['"status-dot"', '"data-kind": "clay"', 'backgroundImage: `url(${', loose('onAnimationStart: Kv')],
      KC: ['e === "awaiting" ? "ready" : e'], PC: ['e !== "code"'], FC: ['=== "clay"'], WC: ['? "blue" : e'],
    },
    // The official bundle serves its assets from the site root; this app loads index.html from disk, so the clay
    // sprite (already in public/assets/v1) is addressed relative to the page, as the chat generators do.
    rewrites: [{ binding: 'MC', from: '"/assets/v1/', to: '"./assets/v1/', asset: 'assets/v1/c25011d97-Dg-b7-mk.png' }] },
  // shared-21: lT (exported `xc`) builds the two segments and renders jC > SegmentedControl; kw/Aw the activity dot;
  // Uw/Ww the copy; mT the cmd+alt+left/right hint; nT (compact density -> "lg").
  { target: 'app-switch.mjs', source: 'shared-21-R7LldJ05.js',
    exports: { lT: 'AppSwitch', kw: 'AppSwitchDot', Aw: 'AppSwitchDotKind', Uw: 'appSwitchMessages', Ww: 'appSwitchDotMessages',
      mT: 'appSwitchShortcutHint', nT: 'useAppSwitchSize' },
    features: {
      lT: ['icon: "Chats"', 'icon: "Code"', 'value: "code"', 'tooltipSide: "bottom"', 'disabled: !0', '.disabledReason === void 0',
        '"aria-label": v', loose('c.formatMessage(Uw.label)'), loose('onAnimationStart: Ym')],
      kw: ['=== "running"', '"clay"', '"running"', loose('Um(r ? "blue" : "amber") === "blue" ? sm(n) : n')],
      Aw: ['color: "var(--cds-text-muted)"', 'className: "df-tab-dot-running"', 'color: "var(--cds-fill-warning)"', 'color: "var(--cds-fill-accent)"'],
      Uw: ['defaultMessage: "Mode", id: "mrOnjMzgC4"'],
      Ww: ['"{tab}, awaiting your input"', '"{tab}, unread activity"', '"{tab}, working"'],
      mT: ['"cmd+alt+right"', '"cmd+alt+left"', 'i.includes(e.mode)'],
      nT: ['=== "compact" ? "lg" : "sm"'],
    } },
];
// Original text the host replica (src/source-app-switch.jsx, src/app-switch-model.mjs) follows but cannot import. Each
// feature must appear in the whitespace-normalised declaration; each import must still resolve to the named
// declaration of the named chunk.
const callSites = [
  { source: 'shared-21-R7LldJ05.js', binding: 'fT', role: 'container (exported Sc): state, sizes, segment props',
    features: [loose('r = lc()'), loose('i = ju()'), loose('s = nT()'), loose('c = d() === "rtl"'), loose('{ mode: l, name: f } = cT()'),
      loose('F = r === "code" || S !== null ? "code" : l'), loose('B = r === "code" ? R : void 0'),
      loose('V = r !== "code" && m === null ? z : void 0'), loose('H = +(r === "code")'), loose('(e, r) => mT(e, r, H, t, n, c)'),
      '"data-compact-mode-switcher": !0', '"data-chorus-callout": "pills"', 'className: "flex"', 'name: "Code"',
      loose('homeMode: l'), loose('selected: F'), loose('onChange: N'), loose('size: s'), loose('home: G'), loose('code: K'),
      loose('{ name: f, dot: B, shortcut: W }'), loose('{ mode: "code", discoveryUpsell: _ ?? void 0 }'),
      '"claudeai.desktop.sidebar.mode_pill_selected"', 'sidebar_surface: "desktop_frame"', loose('e === "code" && a("code", "data"), i(e, "tab")')],
    imports: { lc: ['shared-78-D5Fw2h0a.js', '$Y'], ju: ['shared-6-sd9jbJqs.js', 'uM'] } },
  { source: 'shared-21-R7LldJ05.js', binding: 'Vw', role: 'home segment name',
    features: ['defaultMessage: "Claude", id: "4PjoX4rZSt"', 'defaultMessage: "Chat and Cowork", id: "HS5y16IC13"'] },
  { source: 'shared-78-D5Fw2h0a.js', binding: '$Y', role: 'current mode: the pressed mode wins over the route',
    features: [loose('ZY.getState().pressedMode ?? KY(t)')] },
  { source: 'shared-6-sd9jbJqs.js', binding: 'uM', role: 'press -> pressedMode, then navigate after a 0ms timeout',
    features: ['pressedMode: t, pressId: e.pressId + 1', 'setTimeout(() => {', loose('Xo.getState().pressId !== r'),
      loose('i || Xo.setState({ pressedMode: null })'), '}, 0);'] },
  { source: 'shared-22-Bwn3sJTG.js', binding: 'GI', role: 'macOS titlebar placement of the switch',
    features: [loose('e = i( "draggable-none", Ys, _ && "flex", _ && B !== "web" && "-mt-[12px]", )'),
      loose('G && o(R, { children: o("div", { className: i( e, ee ? "ms-auto" : He ? "ms-2" : "ms-auto", "flex items-center", ee && "df-titlebar-switch", ), children: o(j_, {}), }), })'),
      '"df-titlebar draggable h-11 shrink-0 flex items-center px-2"',
      loose('o("div", { className: "df-peek-mode-switch mb-2 flex shrink-0", children: o(j_, {}), })')],
    imports: { j_: ['shared-21-R7LldJ05.js', 'fT'], R: [official.sharedFrame, 'xh'], Ys: ['shared-5-Bg6ZMqvt.js', 'pS'] } },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, program, exported };
  cache.set(name, record);
  return record;
}

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
// Top-level bindings of the chunk that the declaration reads or writes (`x ??= …` only assigns x, yet needs it).
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
const normalised = text => text.replace(/\s+/g, ' ');

function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => typeof f === 'string' ? !text.includes(f) && !flat.includes(normalised(f)) : !looseFeature(f.loose).test(text));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

// R3: the alias must be a top-level `local=<namespace>.<member>` of the module's own namespace (or, for `Oo`, the
// react/compiler-runtime `c` factory); a same-named inner local no longer passes.
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}

// D1: the shared view-tabs graph publishes semantic names for (file, local). A binding it publishes is imported from
// there by that name, never sliced a second time (a second density context or SegmentedControl would split state).
async function viewTabsPublic() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}

async function resolveImportedDeclaration(src, local, cache) {
  const p = src.program.scope.getBinding(local)?.path;
  if (!p?.isImportSpecifier()) throw Error(`${src.name}: ${local} is not an import`);
  const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
  const dep = await readSource(file, cache);
  return { file, alias, local: dep.exported.get(alias) };
}

export async function extractAppSwitch({ check = false } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
  // Every React alias of the table is checked up front, used or not (R3).
  const frame = await readSource(official.vendorFrame, cache);
  for (const [alias, target] of Object.entries(vendor[official.vendorFrame])) official.assertVendorAlias(frame.bytes.toString(), alias, target);
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-app-switch.mjs',
    adapterModule: 'src/source-app-switch-adapters.jsx', modules: [], callSites: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const sibling = local => emitted.find(m => m.spec.source === spec.source && m.spec.exports[local]);
    const viewTab = (file, local, via) => {
      const entry = published.get(`${file}#${local}`);
      return entry ? { from: `../view-tabs/${file}`, name: entry.name, via, kind: 'view-tabs', original: local } : null;
    };
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const owner = sibling(name);
      if (owner) { imports.set(name, { from: `./${owner.spec.target}`, name: owner.spec.exports[name], via: `${spec.source}:${name}`, kind: 'generated' }); return; }
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const adapter = adapters[file]?.[alias];
        if (adapter) {
          const dep = await readSource(file, cache);
          const local = dep.exported.get(alias);
          if (!local) throw Error(`${spec.target}: adapter alias ${via} is no longer exported`);
          assertFeatures(`${spec.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
          imports.set(name, { from: adapterModule, name: adapter.name, via, kind: 'adapter', original: local });
          return;
        }
        const dep = await readSource(file, cache);
        const react = vendorImport(file, alias, dep);
        if (react) { imports.set(name, { from: react[0], name: react[1], via, kind: 'react' }); return; }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const shared = viewTab(file, local, via);
        if (shared) { imports.set(name, shared); return; }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
      }
      const shared = viewTab(spec.source, name, `${spec.source}:${name}`);
      if (shared) { imports.set(name, shared); return; }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    // A module whose roots all resolve to the shared graph would only re-export it: import from view-tabs instead.
    if (!selected.size) throw Error(`${spec.target}: every root is published by view-tabs; drop the module`);
    const rewrites = spec.rewrites ?? [];
    for (const r of rewrites) {
      if (!selected.has(r.binding)) throw Error(`${spec.target}: rewrite target ${r.binding} is not emitted`);
      const text = declarationText(src, selected.get(r.binding));
      if (text.split(r.from).length !== 2) throw Error(`${spec.target}: rewrite ${r.from} must occur once in ${r.binding}`);
      if (r.asset) await fs.access(path.join(publicAssets, r.asset)).catch(() => { throw Error(`${spec.target}: host asset ${r.asset} is missing`); });
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([name, p]) => {
      let text = declarationText(src, p);
      for (const r of rewrites.filter(r => r.binding === name)) text = text.split(r.from).join(r.to);
      return p.isVariableDeclarator() ? `var ${text};` : text;
    });
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-app-switch.mjs.\n// Edit the extractor or src/source-app-switch-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      ...(rewrites.length ? { rewrites: rewrites.map(({ binding, from, to, asset }) => ({ binding, from, to, asset })) } : {}),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const p = src.program.scope.getBinding(site.binding)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    const text = declarationText(src, p);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    const imports = {};
    for (const [local, [file, expected]] of Object.entries(site.imports ?? {})) {
      const resolved = await resolveImportedDeclaration(src, local, cache);
      if (resolved.file !== file || resolved.local !== expected)
        throw Error(`call site ${site.source}:${site.binding}: ${local} resolves to ${resolved.file}:${resolved.local}, expected ${file}:${expected}`);
      imports[local] = `${file}:${resolved.alias} (${expected})`;
    }
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sha256: sha(text), features: site.features, imports });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`App switch output set changed: ${present.join(',')}. Run scripts/extract-app-switch.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`App switch source mismatch: ${name}. Run scripts/extract-app-switch.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} app switch modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractAppSwitch({ check: process.argv.includes('--check') });
