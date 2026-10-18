// Extract the 2.42304.0 compact Chat/Code mode switch (research/app-switch.md W1, decision D11): shared-21 _C
// (exported `js`, the segment builder over the CDS SegmentedControl), its activity dot LS/RS, copy QS/ZS, the arrow
// chord hint bC and the size hook uC; shared-18 yx (exported `au`, the `df-app-switch` frame that tags every
// `[role='radio']` with its mode) with the clay dot and hub-look helpers; plus the small original leaves they read.
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. An import (or a same-chunk
// binding) resolves, in this order, to: a named host adapter in src/source-app-switch-adapters.jsx (feature-checked),
// a verified React export of vendor-frame, a semantic public name of the shared view-tabs graph (D1: the CDS
// SegmentedControl, Pulse, density context and merged refs exist once, in src/generated/view-tabs), or another module
// generated here. Nothing else is accepted.
//
// The container (shared-21 vC, exported `Ms`) and its call site (shared-22 DN) read the desktop router, GrowthBook,
// telemetry and the code-entitlement store, so they are not emitted. Their host replica lives in
// src/source-app-switch.jsx; `callSites` below pins the exact original text that replica follows, so a version bump
// that changes the container or the titlebar wrapper stops here.
//
// D0: own generator, own output folder (src/generated/app-switch), own scripts/verify-gen-app-switch.mjs.
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
const output = path.join(root, 'src/generated/app-switch');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const publicAssets = path.join(root, 'public');
const adapterModule = '../../source-app-switch-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    So: ['react', 'useRef'], yo: ['react', 'useLayoutEffect'], bo: ['react', 'useMemo'], do: ['react', 'useContext'],
    Va: ['react/jsx-runtime', 'jsx'], eo: ['react', 'createContext'],
  },
};
// Host dependencies (checked first). `features` must appear in the same-chunk closure of the original binding.
const adapters = {
  // react-intl useIntl -> the local catalog (source-code-start-adapters.jsx useStartIntl: t() + intl-messageformat).
  'vendor-intl-Db7hDWRO.js': { p: { name: 'useIntl', features: ['[React Intl]'] } },
};
// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original text. `rewrites` are literal host path rewrites (recorded).
const modules = [
  // vendor-intl tn (exported `f`): react-intl defineMessages, the identity.
  { target: 'define-messages.mjs', source: 'vendor-intl-Db7hDWRO.js', exports: { tn: 'defineMessages' },
    features: { tn: ['return e;'] } },
  // shared-25 up (exported `Ff`): ownerWindow (the frame's animation clock reads the element's window).
  { target: 'owner-window.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { up: 'ownerWindow' },
    features: { up: ['.defaultView'] } },
  // shared-4 My (exported `ar`): working-dot kind, clay or sprite.
  { target: 'dot-kind.mjs', source: 'shared-4-CJsHhp5n.js', exports: { My: 'sidebarDotKind' },
    features: { My: ['"clay"', '"sprite"'] } },
  // shared-5 zy (exported `na`): the boot fade class DN puts on every titlebar control wrapper (`je`).
  { target: 'boot-fade.mjs', source: 'shared-5-kdJVRUsT.js', exports: { zy: 'staticComposerBootFade' },
    features: { zy: ['"static-composer-boot-fade"'] } },
  // shared-78 tf (exported `nC`): the hub look, `useContext(Kd) ?? Jd`. Jd only changes when the desktop hub verdict
  // publisher ($d) runs, which this host has none of, and nothing provides Kd: the original answers false.
  { target: 'hub-look.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { tf: 'useHubLook' },
    features: { tf: ['?? Jd'] } },
  // shared-frame ja (exported `su`): the CDS density, `useContext(la)`; `la` is view-tabs CdsDensityContext.
  { target: 'cds-density.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { ja: 'useCdsDensity' },
    features: { ja: ['(la)'] } },
  // shared-18: yx (exported `au`) the df-app-switch frame; G_ (exported `kf`) aligns infinite animations to the time
  // origin; xx (exported `iu`) the clay status dot; Ax/Sx/Cx (exported `eu`/`tu`/`ru`) the hub-look dot mapping.
  { target: 'app-switch-frame.mjs', source: 'shared-18-D4XxL6Tg.js',
    exports: { yx: 'AppSwitchFrame', G_: 'syncInfiniteAnimations', xx: 'ClayStatusDot', Ax: 'hubAttention', Sx: 'hubDotMode', Cx: 'isClayDot' },
    features: {
      yx: ['L("df-app-switch", e)', `querySelectorAll("[role='radio']")`, 'new MutationObserver(n)', 'childList: !0, subtree: !0'],
      G_: ['getAnimations()', 'iterations !== 1 / 0', '(e.startTime = -(n % r))'],
      xx: ['"status-dot"', '"data-kind": "clay"', 'onAnimationStart: G_'],
      Ax: ['e === "awaiting" ? "ready" : e'], Sx: ['e !== "code"'], Cx: ['Lc(e) === "clay"'],
    },
    // The official bundle serves its assets from the site root; this app loads index.html from disk, so the clay
    // sprite (already in public/assets/v1) is addressed relative to the page, as the chat generators do.
    rewrites: [{ binding: 'bx', from: '"/assets/v1/', to: '"./assets/v1/', asset: 'assets/v1/c25011d97-Dg-b7-mk.png' }] },
  // shared-21: _C (exported `js`) builds the two segments and renders yx > SegmentedControl; LS/RS the activity dot;
  // QS/ZS the copy; bC the cmd+alt+left/right hint; uC (compact density -> "lg").
  { target: 'app-switch.mjs', source: 'shared-21-IP-SVetq.js',
    exports: { _C: 'AppSwitch', LS: 'AppSwitchDot', RS: 'AppSwitchDotKind', ZS: 'appSwitchMessages', QS: 'appSwitchDotMessages',
      bC: 'appSwitchShortcutHint', uC: 'useAppSwitchSize' },
    features: {
      _C: ['icon: "Chats"', 'icon: "Code"', 'tooltipSide: "bottom"', 'onAnimationStart: Gm', 'disabledReason: a.disabledReason',
        '"aria-label": c.formatMessage(ZS.label)'],
      LS: ['t === "running" ? (r ? "clay" : "running")'],
      RS: ['color: "var(--cds-text-muted)"', 'className: "df-tab-dot-running"', 'color: "var(--cds-fill-warning)"', 'color: "var(--cds-fill-accent)"'],
      ZS: ['defaultMessage: "Mode", id: "mrOnjMzgC4"'],
      QS: ['"{tab}, awaiting your input"', '"{tab}, unread activity"', '"{tab}, working"'],
      bC: ['"cmd+alt+right"', '"cmd+alt+left"', 'i.includes(e.mode)'],
      uC: ['=== "compact" ? "lg" : "sm"'],
    } },
];
// Original text the host replica (src/source-app-switch.jsx) follows but cannot import. Each feature must appear in the
// whitespace-normalised declaration; each import must still resolve to the named declaration of the named chunk.
const callSites = [
  { source: 'shared-21-IP-SVetq.js', binding: 'vC', role: 'container (exported Ms): state, sizes, segment props',
    features: ['i = to()', 'l = uC()', 'd = v() === "rtl"', 'M = i === "code" || T !== null ? "code" : p',
      'I = i === "code" ? P : void 0', 'L = i !== "code" && g === null ? F : void 0', 'R = +(i === "code")',
      'z = (e, t) => bC(e, t, R, n, r, d)', '"data-compact-mode-switcher": !0', '"data-chorus-callout": "pills"',
      'className: "flex"', 'homeMode: p', 'selected: M', 'onChange: k', 'size: l',
      'home: { name: m, dot: I, shortcut: z({ mode: p }, 0) }', 'name: "Code", dot: L',
      'shortcut: z( { mode: "code", discoveryUpsell: y ?? void 0 }, 1, )', 'e === "code" && o("code", "data"), a(e, "tab")'],
    imports: { to: ['shared-78-D6VXYXaQ.js', 'Vq'] } },
  { source: 'shared-21-IP-SVetq.js', binding: 'YS', role: 'home segment name',
    features: ['defaultMessage: "Claude", id: "4PjoX4rZSt"', 'defaultMessage: "Chat and Cowork", id: "HS5y16IC13"'] },
  { source: 'shared-78-D6VXYXaQ.js', binding: 'Vq', role: 'current mode: the pressed mode wins over the route',
    features: ['zq.getState().pressedMode ?? Pq(t)'] },
  { source: 'shared-6-Cby4X-ms.js', binding: 'Fk', role: 'press -> pressedMode, then navigate after a 0ms timeout',
    features: ['pressedMode: t, pressId: e.pressId + 1', 'setTimeout(() => {', 'Za.getState().pressId !== r', 'i || Za.setState({ pressedMode: null })', '}, 0);'] },
  { source: 'shared-22-HztmyUTM.js', binding: 'DN', role: 'macOS titlebar placement of the switch',
    features: ['je = O( "draggable-none", _c, d && "flex", d && L !== "web" && "-mt-[12px]", )',
      'G && p(Zs, { children: p("div", { className: O( je, I ? "ms-auto" : Ae ? "ms-2" : "ms-auto", "flex items-center", I && "df-titlebar-switch", ), children: p(bg, { ref: n }), }), })',
      '"df-titlebar draggable h-11 shrink-0 flex items-center px-2"'],
    imports: { bg: ['shared-21-IP-SVetq.js', 'vC'], Zs: ['shared-frame-BfjMqbuN.js', 'Sm'], _c: ['shared-5-kdJVRUsT.js', 'zy'] } },
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
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.bytes.toString()))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}

// D1: the shared view-tabs graph publishes semantic names for (file, local). A binding it publishes is imported from
// there by that name, never sliced a second time (a second density context or SegmentedControl would split state).
async function viewTabsPublic() {
  const manifest = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
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
