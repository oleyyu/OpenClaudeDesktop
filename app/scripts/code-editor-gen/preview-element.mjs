// Area "preview-element": selected-element serializer, view model, label, detail, chip, parser and transcript card,
// from Claude Desktop 3.6556.2 (w10-editor-preview-element; research/w10-editor.md §2.2, plan-w10 "#### w10-editor-preview-element").
// The CDP inspector lives in the desktop area.
//
// Every emitted declaration is an original top-level binding of the prettier-formatted 3.6556.2 chunk, chosen as the
// reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or re-pointed minified
// import fails generation. Imports of a closure resolve, per (chunk, export alias), to one of:
//   - react / react-dom / jsx-runtime (vendor-frame aliases checked with official.assertVendorAlias);
//   - a view-tabs public name of shared-frame (the React Compiler helpers, CdsIcon, CdsCollapsible; R3/E3), never in the
//     pure targets that src/preview-element-attachments.mjs and node tests import directly (E42);
//   - another target of this area (`sibling`), so the serializer and the view model exist once;
//   - a factory parameter the local host supplies (react-intl over the local catalog, the transcript image tile, the
//     chip's Base UI Toggle), or a pinned local stand-in (telemetry no-ops); each carries feature strings that must still
//     appear in the original binding's closure;
//   - otherwise the original closure of that chunk, inlined in its own scope `const {…} = (() => {…; return {…}})()`.
// Roots carry R2 features (literals, keys, classes, i18n ids). Generated outputs keep their 2.31226.0 file and export names
// (R4/E7) and factory signatures; the chip's 2.37337.1 `"mr-xs"→"me-xs"` patch is gone: 3.6556.2 ships `me-xs`.
import babel from '../../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from '../official-3.6556.2.mjs';
import { viewTabsManifestFor } from '../view-tabs-compat.mjs';
import { fs, path, parsers, format, sha } from './common.mjs';

const version = official.referenceVersion;
const loose = official.looseFeature;
const SERIAL = 'ce311b43f-pp3Qdi66.js', VIEW = 'c06cf64bb-CdJdJuVd.js', PILL = 'c0fbbe82d-COsmfHJY.js', CARD = 'c2fd10b8d-DB1Sgoyz.js';
const VENDOR_INTL = official.vendorIntl;
// Globals the emitted code may read without a binding (checked on every output).
const GLOBALS = new Set(['Array', 'Boolean', 'Error', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String',
  'Symbol', 'WeakMap', 'WeakRef', 'TypeError', 'Intl', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'window', 'document',
  'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'getComputedStyle', 'globalThis',
  'encodeURIComponent', 'decodeURIComponent', 'Infinity', 'NaN', 'CSS', 'Element', 'HTMLElement', 'Node', 'Date', 'console', 'Uint8Array', 'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'arguments',
  // w12-preview: the image menu (c26fb8b6b Ue) copies and saves the screenshot bytes.
  'fetch', 'URL', 'Blob', 'ClipboardItem', 'Image']);

// ---------------------------------------------------------------- original chunks
const chunks = new Map();
function chunk(name) {
  if (!chunks.has(name)) chunks.set(name, (async () => {
    const bytes = await fs.readFile(path.join(official.ionSource, name));
    const code = await format(bytes.toString(), { parser: 'babel' });
    const ast = parsers.babel.parse(code, {});
    let program;
    babel.traverse(ast, { Program(p) { program = p; } });
    const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
      .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    return { name, bytes, code, ast, program, exported, source: { name, sha256: sha(bytes), base: 'ion' } };
  })());
  return chunks.get(name);
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const slice = (src, node) => src.code.slice(node.start, node.end);

// Same-chunk closure of `roots`: declarations in source order and the import specifiers they read.
function closure(src, roots) {
  const seen = new Set(), selected = new Map(), imports = new Map();
  const visit = name => {
    if (seen.has(name)) return;
    seen.add(name);
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${src.name}: ${name} is not a top-level binding`);
    const p = binding.path;
    if (p.isImportSpecifier()) { imports.set(name, { file: p.parent.source.value.replace(/^\.\//, ''), alias: p.node.imported.name }); return; }
    if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${src.name}: unsupported declaration ${name}`);
    p.traverse({ Import() { throw Error(`${src.name}: dynamic import inside ${name}`); } });
    selected.set(p.node.start, p);
    for (const dep of declarationDeps(src, p)) visit(dep);
  };
  for (const root of roots) visit(root);
  const order = [...selected.values()].sort((a, b) => a.node.start - b.node.start);
  const blocks = order.map(p => (p.isVariableDeclarator() ? `var ${slice(src, p.node)};` : slice(src, p.node)));
  return { text: blocks.join('\n'), imports, bindings: order.map((p, i) => ({ name: p.node.id.name ?? '(pattern)', sha256: sha(blocks[i]) })) };
}
function rootLocal(src, alias) {
  const local = src.exported.get(alias);
  if (!local) throw Error(`${src.name} no longer exports ${alias}`);
  return local;
}
// R2: each feature is a string (contained) or a RegExp (looseFeature).
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? String(f) : JSON.stringify(f))).join(', ')}`);
}
function rootText(src, local) {
  const p = src.program.scope.getBinding(local)?.path;
  if (!p || p.isImportSpecifier()) throw Error(`${src.name}: root ${local} is not a declaration`);
  return slice(src, p.node);
}

// ---------------------------------------------------------------- import resolution
let viewTabsPublic;
// D1 (w12-preview): any (chunk, export) view-tabs publishes, not only shared-frame, resolves to its one view-tabs copy.
async function viewTabsName(file, alias) {
  if (!viewTabsPublic) {
    viewTabsPublic = (await viewTabsManifestFor(version)).publicNames;
    const helpers = official.assertCompilerHelpers((await chunk(official.sharedFrame)).bytes.toString());
    for (const [semantic, { alias: helperAlias }] of Object.entries(helpers))
      if (viewTabsPublic[semantic]?.file !== official.sharedFrame || viewTabsPublic[semantic]?.export !== helperAlias) throw Error(`view-tabs ${semantic} is not ${official.sharedFrame}:${helperAlias}`);
  }
  const hits = Object.entries(viewTabsPublic).filter(([, pub]) => pub.file === file && pub.export === alias);
  if (hits.length > 1) throw Error(`view-tabs publishes ${file}:${alias} twice`);
  return hits[0]?.[0] ?? null;
}
const vendorChecked = new Set();
async function reactMember(file, alias) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  if (!vendorChecked.has(alias)) { official.assertVendorAlias((await chunk(file)).bytes.toString(), alias); vendorChecked.add(alias); }
  return official.reactAliases[alias];
}
const identifier = text => text.replace(/[^\w$]/g, '_');
const generatedRoot = path.resolve(import.meta.dirname, '../../src/generated');

// Emits one scope: the bindings of `imports` followed by the closure text. `ctx` collects module imports and parameters.
async function scope(src, roots, ctx, depth = 0) {
  const { text, imports, bindings } = closure(src, roots);
  ctx.sources.set(src.name, src.source);
  ctx.bindings.push(...bindings.map(b => ({ ...b, file: src.name })));
  const lines = [], inline = new Map();
  for (const [local, { file, alias }] of imports) {
    const key = `${file}:${alias}`, host = ctx.hosts[key];
    if (host) {
      const dep = await chunk(file);
      assertFeatures(`${ctx.target}: host ${key}`, closure(dep, [rootLocal(dep, alias)]).text, host.features);
      ctx.hostUsed.add(key);
      if (host.param) { ctx.params.set(host.param, host.fallback ?? null); lines.push(`const ${local} = ${host.param};`); }
      else if (host.sibling) { ctx.module.set(`${host.sibling}#${host.name}`, { from: host.sibling, name: host.name }); lines.push(`const ${local} = $sib_${host.name};`); }
      // link: the one generated copy another generator already owns (a module-level store must stay one object).
      else if (host.link) {
        assertFeatures(`${ctx.target}: link ${key}`, await fs.readFile(path.join(generatedRoot, host.link.replace(/^\.\.\//, '')), 'utf8'), [...host.linkFeatures, `${host.name}`]);
        // linkSource: the owner's manifest still records that target as the original binding(s) of the same chunk.
        if (host.linkSource) {
          const { manifest, target, source, bindings } = host.linkSource;
          const owned = JSON.parse(await fs.readFile(path.join(generatedRoot, manifest.replace(/^\.\.\//, '')), 'utf8')).modules?.find(m => m.target === target);
          if (!owned || source !== file || !owned.source.endsWith(`/${source}`) || bindings.some(b => !owned.bindings.includes(b)))
            throw Error(`${ctx.target}: link ${key}: ${manifest} no longer records ${target} as ${source} ${bindings.join(',')}`);
        }
        ctx.module.set(`${host.link}#${host.name}`, { from: host.link, name: host.name });
        lines.push(`const ${local} = $${identifier(host.link)}_${host.name};`);
      }
      else lines.push(`const ${local} = ${host.expr};`);
      continue;
    }
    const react = await reactMember(file, alias);
    if (react) {
      if (ctx.pure && react[0] !== 'react') throw Error(`${ctx.target}: pure target reads ${react.join(':')}`);
      ctx.module.set(react.join('#'), { from: react[0], name: react[1] });
      lines.push(`const ${local} = $${identifier(react[0])}_${react[1]};`);
      continue;
    }
    const semantic = await viewTabsName(file, alias);
    // A pure target (E42) inlines a published name of another chunk; shared-frame names never inline (R3).
    if (semantic && !(ctx.pure && file !== official.sharedFrame)) {
      if (ctx.pure) throw Error(`${ctx.target}: pure target would import view-tabs ${semantic} (E42)`);
      ctx.module.set(`vt#${semantic}`, { from: `../view-tabs/${file}`, name: semantic });
      lines.push(`const ${local} = $vt_${semantic};`);
      continue;
    }
    if (file === official.sharedFrame) throw Error(`${ctx.target}: ${key} is not a view-tabs public name`);
    if (!inline.has(file)) inline.set(file, []);
    inline.get(file).push([local, alias]);
  }
  for (const [file, entries] of inline) {
    const dep = await chunk(file), locals = entries.map(([, alias]) => rootLocal(dep, alias));
    const body = await scope(dep, [...new Set(locals)], ctx, depth + 1);
    const pattern = entries.map(([local], i) => (locals[i] === local ? local : `${locals[i]}: ${local}`)).join(', ');
    lines.push(`// ${file}: ${entries.map(([, alias], i) => `${alias}→${locals[i]}`).join(' ')}\nconst { ${pattern} } = (() => {\n${body}\nreturn { ${[...new Set(locals)].join(', ')} };\n})();`);
  }
  return `${lines.join('\n')}\n${text}`;
}

function newContext(target, { pure = false, hosts = {} } = {}) {
  return { target, pure, hosts, module: new Map(), params: new Map(), sources: new Map(), bindings: [], hostUsed: new Set() };
}
function moduleImports(ctx) {
  const groups = new Map();
  for (const { from, name } of ctx.module.values()) {
    const local = from.startsWith('../view-tabs/') ? `$vt_${name}` : from.startsWith('./') ? `$sib_${name}` : `$${identifier(from)}_${name}`;
    if (!groups.has(from)) groups.set(from, []);
    groups.get(from).push(name === 'default' ? `default as ${local}` : `${name} as ${local}`);
  }
  return [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
}
function assertHostsUsed(ctx) {
  const unused = Object.keys(ctx.hosts).filter(key => !ctx.hostUsed.has(key));
  if (unused.length) throw Error(`${ctx.target}: host bindings no longer read: ${unused.join(', ')}`);
}
// Free names of a finished module text must be standard globals (or `allow`).
function assertBound(target, text, allow = []) {
  const parsed = babel.babelParse(text, target, true);
  let globals = [];
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals); } });
  const free = globals.filter(name => !GLOBALS.has(name) && !allow.includes(name));
  if (free.length) throw Error(`${target}: unbound ${free.join(', ')}`);
}
function factoryParams(ctx) {
  return [...ctx.params].map(([name, fallback]) => (fallback ? `${name} = $vt_${fallback}` : name)).join(', ');
}
// The one top-level function of `src` whose text passes `test` (R2: roots are found by their features, not their names).
function fn(src, test) {
  const hits = Object.keys(src.program.scope.bindings).filter(name => { const p = src.program.scope.getBinding(name).path; return p.isFunctionDeclaration() && test(slice(src, p.node)); });
  if (hits.length !== 1) throw Error(`${src.name}: expected one matching function, found ${hits.length} (${hits.join(', ')})`);
  return hits[0];
}
const header = what => `// Original Claude Desktop ${version} ${what}; generated by scripts/code-editor-gen/preview-element.mjs.\n`;

export async function emit({ adapter }) {
  const record = async (name, text, ctx, extra = []) => {
    assertBound(name, text);
    await adapter(name, text, [...ctx.sources.values(), ...extra], version);
  };

  // D1 (w12 preview-cont, viewtabs 9c; W13 G11): shared-0 Pa (exported Lb, lazyInit) is routines-shared's shared-0 copy
  // (an import-free module; code-current lazy-init.mjs only re-exports it), so the pure targets (E42) link that one copy
  // instead of inlining their own.
  const lazyInitLink = { 'shared-0-DDOOdL6P.js:Lb': { link: '../routines-shared/shared-0-DDOOdL6P.mjs', name: 'Pa',
    linkFeatures: ['function Pa(e)', 'return () => ((n ||= ((t = e()), !0)), t);'], features: ['return () => ((n ||= ((t = e()), !0)), t);'] } };
  // D1: the display-safety bindings of shared-156 (c06cf64bb dt/mt/pt/st/at/ot) exist once, in the view target; the parser
  // imports them from it (both pure). Each alias is pinned to its original by feature.
  const SAFETY = 'shared-156-BLTosN8U.js';
  const displaySafety = {
    dt: { name: 'displaySafetyInvisiblePattern', features: ['/[\\p{Default_Ignorable_Code_Point}\\p{Cf}]/gu'] },
    mt: { name: 'displaySafetyUnsafePattern', features: ['\\u2028\\u2029\\u0590-\\u08ff', '|\\p{Default_Ignorable_Code_Point}|\\p{Cf}/u'] },
    pt: { name: 'displaySafetyEscape', features: ['?.length ?? 0) >', '.replace('] },
    st: { name: 'displaySafetyCodePoints', features: ['`[U+${e.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}]`'] },
    at: { name: 'displaySafetyControlPattern', features: ['/[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f]/'] },
    ot: { name: 'displaySafetyBlankPattern', features: ['\\u{16910}\\p{Default_Ignorable_Code_Point}\\p{Cf}\\p{Mn}\\p{Me}]*$/u'] },
  };
  // W13 G11 (D1, G2 review 3): kX / VX / qX of shared-156 (dt / pt / st) are code-routines' one display-safety copy
  // (shared-156-BLTosN8U.mjs exports OX … qX and imports only routines-shared's import-free shared-0, so the pure targets
  // stay plain node, E42); linked, not inlined again (with them the inlined shared-0 jL / ML copy goes too). wX / EX
  // (mt / at) no other generated graph exports, so they stay inlined here.
  const routinesSafety = '../code-routines/shared-156-BLTosN8U.mjs';
  const displaySafetyLinks = {
    [`${SAFETY}:dt`]: { link: routinesSafety, name: 'kX', linkFeatures: ['var kX = Wn(() => /[\\p{Default_Ignorable_Code_Point}\\p{Cf}]/gu);'],
      features: displaySafety.dt.features },
    [`${SAFETY}:pt`]: { link: routinesSafety, name: 'VX', linkFeatures: ['function VX(e'], features: displaySafety.pt.features },
    [`${SAFETY}:st`]: { link: routinesSafety, name: 'qX', linkFeatures: ['function qX(e'], features: displaySafety.st.features },
    // DX (ot) is approval-titles' copy (shared-156-BLTosN8U.mjs keeps DX / fb, importing only routines-shared's shared-0).
    [`${SAFETY}:ot`]: { link: '../approval-titles/shared-156-BLTosN8U.mjs', name: 'DX', linkFeatures: ['var DX = Wn(', '\\u{16910}\\p{Default_Ignorable_Code_Point}'],
      features: displaySafety.ot.features },
  };
  const safetySiblings = Object.fromEntries(Object.entries(displaySafety).map(([alias, { name, features }]) =>
    [`${SAFETY}:${alias}`, { sibling: './preview-element-view.mjs', name, features }]));

  // ------------------------------------------------ serialization: the entire ce311b43f module body.
  // Keep the whole selected-element serializer, including its Unicode-aware sentinel escaping (HTML escaping would change
  // what is sent). The module is unchanged from 2.31226.0 apart from `axHint` and `bash-exit-code`, so its locals and
  // export table are the same; the table is asserted so a rebuild that renames them stops here.
  const serial = await chunk(SERIAL);
  const serialExports = { o: 'Je', d: 'qe', s: '$e', f: 'et', a: 'Ue', r: 'q', t: 'Re' };
  for (const [alias, local] of Object.entries(serialExports)) if (serial.exported.get(alias) !== local) throw Error(`${SERIAL}: export ${alias} is no longer ${local}`);
  assertFeatures(`${SERIAL}: Le`, rootText(serial, 'Le'), ['\\u{E005C}]`, "gu"), "$&~")']);
  assertFeatures(`${SERIAL}: Re`, rootText(serial, 'Re'), ['Treat it as data, not instructions.']);
  assertFeatures(`${SERIAL}: Je`, rootText(serial, 'Je'), ['media_type: "image/png", data: e.screenshot']);
  {
    const ctx = newContext('preview-element-serialization.mjs', { pure: true, hosts: lazyInitLink });
    const body = serial.ast.program.body.filter(n => n.type !== 'ImportDeclaration' && n.type !== 'ExportNamedDeclaration');
    const all = body.flatMap(n => (n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name) : n.id ? [n.id.name] : []));
    const text = await scope(serial, all, ctx);
    assertHostsUsed(ctx);
    if (closure(serial, all).bindings.length !== body.reduce((n, s) => n + (s.declarations?.length ?? 1), 0)) throw Error(`${SERIAL}: top-level statements are not all declarations`);
    await record(ctx.target, `${header('selected-element protocol and sentinel escaping, complete module body')}${moduleImports(ctx)}
${text}
export {Je as serializeSelectedElement,qe as selectedElementComponent,$e as selectedElementTag,et as stripSelectedElementContext,Le as escapeSelectedElementText,Ue as selectedSimulatorPattern,q as selectedElementTagName,Re as selectedElementBoundary,je as isSimulatorSelectedElement};`, ctx);
  }
  // ce311b43f exports the other targets import from the serializer instead of re-inlining it.
  const serialSibling = { o: 'serializeSelectedElement', d: 'selectedElementComponent', s: 'selectedElementTag', f: 'stripSelectedElementContext',
    a: 'selectedSimulatorPattern', r: 'selectedElementTagName', t: 'selectedElementBoundary', l: 'isSimulatorSelectedElement' };
  const serialHosts = Object.fromEntries(Object.entries(serialSibling).map(([alias, name]) => [`${SERIAL}:${alias}`, { sibling: './preview-element-serialization.mjs', name }]));
  const used = (ctx, keys) => Object.fromEntries(Object.entries(ctx).filter(([key]) => keys.includes(key)));

  // ------------------------------------------------ view: c06cf64bb mo (old c7d4a4512 st), the browser-element detail model.
  const view = await chunk(VIEW);
  const viewRoot = rootLocal(view, 'qa');
  assertFeatures(`${VIEW}: ${viewRoot}`, rootText(view, viewRoot), ['hasScreenshot: !!e.screenshot', 'text: e.innerText?.slice(0, 200)', 'unsafeDisplay: !0']);
  {
    const ctx = newContext('preview-element-view.mjs', { pure: true, hosts: { ...lazyInitLink, ...displaySafetyLinks } });
    const text = await scope(view, [viewRoot], ctx);
    assertHostsUsed(ctx);
    // The display-safety locals the view reads from shared-156, re-exported for the parser (one copy in this area).
    const safety = [...closure(view, [viewRoot]).imports].filter(([, { file }]) => file === SAFETY);
    const aliases = safety.map(([, { alias }]) => alias).sort();
    if (aliases.join() !== Object.keys(displaySafety).sort().join()) throw Error(`${VIEW}: the view reads ${SAFETY} ${aliases.join(',')}, not ${Object.keys(displaySafety).join(',')}`);
    for (const alias of aliases) { const dep = await chunk(SAFETY); assertFeatures(`${SAFETY}:${alias}`, closure(dep, [rootLocal(dep, alias)]).text, displaySafety[alias].features); }
    await record(ctx.target, `${header('selected browser-element detail model and visible Unicode escaping (c06cf64bb)')}${moduleImports(ctx)}
${text}
export {${viewRoot} as selectedElementView,${safety.map(([local, { alias }]) => `${local} as ${displaySafety[alias].name}`).join(',')}};`, ctx);
  }
  const viewSibling = { [`${VIEW}:qa`]: { sibling: './preview-element-view.mjs', name: 'selectedElementView', features: ['hasScreenshot: !!e.screenshot'] } };

  // ------------------------------------------------ label: c0fbbe82d Gi (old lO) and ta (old pO).
  const pill = await chunk(PILL);
  const labelLocal = fn(pill, t => /^function [\w$]+\(e, t = "Element", n = !1\)/.test(t));
  const screenshotLocal = fn(pill, t => t.includes('`data:image/png;base64,${e}`'));
  assertFeatures(`${PILL}: ${labelLocal}`, closure(pill, [labelLocal]).text, ['"aria-label", "alt", "title", "placeholder"', '`${t.slice(0, r)}\\u2026`', '`<${r} />`']);
  {
    const ctx = newContext('preview-element-label.mjs', { pure: true, hosts: { ...used(serialHosts, [`${SERIAL}:d`, `${SERIAL}:l`, `${SERIAL}:s`]), ...lazyInitLink } });
    const text = await scope(pill, [labelLocal, screenshotLocal], ctx);
    assertHostsUsed(ctx);
    await record(ctx.target, `${header('composer element labels, with surrogate-safe forty-character truncation (c0fbbe82d)')}${moduleImports(ctx)}
${text}
export {${labelLocal} as selectedElementLabel,${screenshotLocal} as selectedElementScreenshot};`, ctx);
  }

  // ------------------------------------------------ detail: c0fbbe82d ia (Preview, old hO) and ji (Details, old QD).
  const intlHosts = {
    [`${VENDOR_INTL}:l`]: { param: 'Message', features: ['defaultMessage'] },
    [`${VENDOR_INTL}:p`]: { param: 'useIntl', features: ['[React Intl]'] },
  };
  const previewLocal = fn(pill, t => t.includes('{ ctx: t, width: n, scrollRegionLabel: r, openedVia: a } = e') && t.includes('"Included with your message"'));
  const detailsLocal = fn(pill, t => t.includes('{ view: t, omit: n, cardRef: r } = e'));
  const animationLocal = rootLocal(pill, 'v');
  assertFeatures(`${PILL}: ${animationLocal}`, rootText(pill, animationLocal), ['panelRef:', 'beforeToggle:', 'getBoundingClientRect()', '"--cds-ring-outer"']);
  assertFeatures(`${PILL}: ${previewLocal}`, closure(pill, [previewLocal]).text, ['max-h-[360px] overflow-y-auto', 'max-h-[120px]', 'defaultMessage: "Screenshot of the selected element"',
    'id: "/kf//7IggN"', '"element-context-unsafe-notice"', 'id: "zmi5t2SGo3"', 'defaultMessage: "Hide exact text sent"', '"grid grid-cols-[auto_minmax(0,1fr)] gap-x-md gap-y-1 text-body"']);
  {
    const ctx = newContext('preview-element-detail.mjs', { hosts: {
      ...intlHosts, ...viewSibling,
      // qf: `claudeai.epitaxy.composer.element_context_preview_opened` telemetry; the local host sends none.
      'c68c4283d-CWbOoVxS.js:xn': { expr: '() => {}', features: ['"claudeai.epitaxy.composer.element_context_preview_opened"'] },
    } });
    ctx.params.set('Collapsible', 'CdsCollapsible');
    const text = await scope(pill, [previewLocal, detailsLocal], ctx);
    assertHostsUsed(ctx);
    // Si (exported `v`): the card/panel size animation. Its WeakMap of running animations is keyed by the card element
    // that both the detail disclosure and the transcript card animate, so the transcript reuses this one copy.
    if (!ctx.bindings.some(b => b.file === PILL && b.name === animationLocal)) throw Error(`${PILL}: the detail no longer uses ${animationLocal}`);
    // CdsCollapsible is the official one; `Collapsible` only lets a server-rendering test open the panel.
    const body = text.replace(/const ([\w$]+) = \$vt_CdsCollapsible;/g, (_, local) => `const ${local} = Collapsible;`);
    if (body === text) throw Error(`${ctx.target}: the detail no longer reads CdsCollapsible`);
    await record(ctx.target, `${header('browser-element detail components (c0fbbe82d); the host supplies react-intl')}${moduleImports(ctx)}
export function createSelectedElementDetail({ ${factoryParams(ctx)} }) {
${body}
return { Preview: ${previewLocal}, Details: ${detailsLocal}, useDetailAnimation: ${animationLocal} };
}`, ctx);
  }

  // ------------------------------------------------ chip: the whole attachment pill c0fbbe82d ko (w12-preview), with the
  // preview intent of its strip Go. ko is the pill: Floating UI preview (`placement: "top-start"`, offset/shift/size,
  // autoUpdate + shelf ResizeObserver), the portal into the owner window, outside-click/Tab/Escape, keyboard navigation and
  // removal, the remove button, and the CdsContextMenu (Show what this sends / Remove). Its hover/pin state lives in the
  // strip Go (`[Ae, je]`, `[Ge, qe]`, `[Ye, Xe]` and the 600/200 ms timers `Nt`/`nn`); those Go-local declarators are taken
  // verbatim, in order, under Go's own memo cache, and returned by a hook. The host keeps the strip element and Base UI's
  // Toggle: each composer strip calls the hook once, carries Go's enter/leave/blur handlers and renders every pill (element,
  // agent, issue) as ko (w12 preview-cont; the agent / issue chip-body factory is retired).
  const pillLocal = fn(pill, t => t.includes('"max-w-[260px]" : "max-w-[160px]"') && t.includes('placement: "top-start"') && t.includes('"epitaxy-pill-body overflow-hidden'));
  assertFeatures(`${PILL}: ${pillLocal}`, rootText(pill, pillLocal), ['"data-epitaxy-pill-preview": ""', 'defaultMessage: "Show what this sends"', 'defaultMessage: "Remove {name}"',
    'whileElementsMounted:', '"group/pill relative shrink-0 hover:z-10 focus-within:z-10"', 'case "ArrowLeft"', 'preventBaseUIHandler()', 'T("popover")']);
  const stripLocal = fn(pill, t => t.includes('onPreviewIntent:') && t.includes('onPreviewLeave:') && t.includes('defaultMessage: "Attachments"'));
  const stripText = rootText(pill, stripLocal);
  const pick = (rx, what) => { const m = rx.exec(stripText); if (!m) throw Error(`${PILL}: ${stripLocal} lost ${what}`); return m.slice(1); };
  const [openName] = pick(/previewOpen: ([\w$]+) === n,\s*hoverPeek:/, 'previewOpen');
  const [pinnedName] = pick(/previewPinned: ([\w$]+) === n,/, 'previewPinned');
  const [viaName] = pick(/i\(ia, \{\s*ctx: e,\s*width: [\w$]+,\s*scrollRegionLabel: o,\s*openedVia: ([\w$]+),?\s*\}\)/, 'openedVia');
  const [intentName, enterName, leaveName] = pick(/onPreviewIntent: ([\w$]+),\s*onPreviewEnter: ([\w$]+),\s*onPreviewLeave: ([\w$]+),/, 'preview handlers');
  if (stripText.split(`onPreviewIntent: ${intentName},`).length - 1 !== 4) throw Error(`${PILL}: ${stripLocal} no longer hands ${intentName} to the agent, issue, saved-draft and element pills`);
  // The strip hands its one intent to every pill (agent, issue, saved drafts, elements): the host strips render the agent /
  // issue pills as ko with these props (src/source-selected-element.jsx SourceContextPill), so they are pinned here.
  assertFeatures(`${PILL}: ${stripLocal} context pills`, stripText, [
    /value: "agent",\s*thumbnail: [\w$]+\([\w$]+, \{ name: "Agent", size: "xs" \}\),\s*label: [\w$]+,\s*restored: [^,]+,\s*onPreviewIntent: [\w$]+,\s*onRemove: [\w$]+,/,
    /value: "issue",\s*thumbnail:\s*[\w$]+\.bodyStatus === "loading"\s*\?\s*[\w$]+\([\w$]+, \{\s*size: "sm"\s*\}\)\s*:\s*[\w$]+\([\w$]+, \{\s*name: "Placeholder", size: "xs"\s*\}\),\s*label: [\w$]+\.label,\s*onPreviewIntent: [\w$]+,\s*onClick: [\w$]+\.url\s*\?/,
  ]);
  {
    const go = pill.program.scope.getBinding(stripLocal).path;
    const declarators = new Map();
    for (const statement of go.get('body.body')) if (statement.isVariableDeclaration()) for (const d of statement.get('declarations')) {
      for (const name of Object.keys(d.getBindingIdentifiers())) declarators.set(name, d);
    }
    const leaveInit = slice(pill, declarators.get(leaveName)?.node.init ?? { start: 0, end: 0 });
    const [, closeName] = /K0\(\$, \d+, \(\) => ([\w$]+)\(\)\)/.exec(leaveInit) ?? [];
    if (!closeName || !stripText.includes(`= () => ${closeName}())`)) throw Error(`${PILL}: ${stripLocal} strip leave no longer closes through one handler`);
    assertFeatures(`${PILL}: ${stripLocal} intent`, slice(pill, declarators.get(intentName).node.init), ['r === void 0 ? "hover" : r', 'window.setTimeout(']);
    // Go-local closure of the intent declarators, and the chunk-level names they read.
    const chosen = new Set(), top = new Set();
    const visit = d => {
      if (chosen.has(d)) return;
      chosen.add(d);
      d.traverse({ ReferencedIdentifier(q) {
        const name = q.node.name, binding = q.scope.getBinding(name);
        if (!binding) return;
        if (binding.scope === pill.program.scope) { top.add(name); return; }
        if (binding.scope.path === go) {
          const owner = declarators.get(name);
          if (!owner || binding.kind === 'param') throw Error(`${PILL}: strip intent reads ${name}, which ${stripLocal} does not declare in a let`);
          visit(owner);
        }
      } });
      for (const name of Object.keys(d.getBindingIdentifiers())) for (const q of go.scope.getBinding(name)?.constantViolations ?? []) if (!within(d, q)) throw Error(`${PILL}: strip binding ${name} is reassigned outside its declarator`);
    };
    for (const name of [intentName, enterName, leaveName, closeName, openName, pinnedName, viaName]) {
      const d = declarators.get(name);
      if (!d) throw Error(`${PILL}: ${stripLocal} does not declare ${name}`);
      visit(d);
    }
    const ordered = [...chosen].sort((x, y) => x.node.start - y.node.start);
    for (const d of ordered) if (!d.node.init) throw Error(`${PILL}: strip binding ${slice(pill, d.node.id)} has no initializer`);
    const lines = ordered.map(d => `let ${slice(pill, d.node.id)} = ${slice(pill, d.node.init)};`);
    const ctx = newContext('preview-element-chip.mjs', { hosts: {
      ...intlHosts,
      // u (Base UI Toggle, `name: "Toggle"`): the pill body; the host strip is no Base UI ToggleGroup, so the host answers it.
      'vendor-base-ui-2Rtuj3JT.js:u': { param: 'Toggle', features: ['name: "Toggle"', 'onPressedChange'] },
      // cd59309dc t: the per-window "a context menu is open" marker; its store is one object, owned by session-rail-changes.
      'cd59309dc-BZMawR8Y.js:t': { link: '../session-rail-changes/context-menu-marker.mjs', name: 'ContextMenuOpenMarker',
        linkFeatures: ['cd59309dc-BZMawR8Y.js', 'byWindow: new Map()'], features: ['byWindow'] },
    } });
    const shared = await scope(pill, [pillLocal, ...top], ctx);
    assertHostsUsed(ctx);
    const pillParams = factoryParams(ctx);
    await record(ctx.target, `${header(`attachment pill (c0fbbe82d ${pillLocal}) and its strip's preview intent (${stripLocal})`)}${moduleImports(ctx)}
export function createSelectedElementPill({ ${pillParams} }) {
${shared}
function useSelectedElementPreviewIntent() {
${lines.join('\n')}
return { open: ${openName}, pinned: ${pinnedName}, openedVia: ${viaName}, onPreviewIntent: ${intentName}, onPreviewEnter: ${enterName}, onPreviewLeave: ${leaveName}, close: ${closeName} };
}
return { Pill: ${pillLocal}, usePreviewIntent: useSelectedElementPreviewIntent };
}`, ctx);
  }

  // ------------------------------------------------ parser: c06cf64bb bo / fo / Da (old pt / ot / Ge).
  const parseLocal = Object.keys(view.program.scope.bindings).find(name => { const p = view.program.scope.getBinding(name).path; return p.isFunctionDeclaration() && slice(view, p.node).startsWith(`function ${name}(e, t = (e) => e, { startsLine: n = !0 } = {})`); });
  if (!parseLocal) throw Error(`${VIEW}: the structured selected-element parser is gone`);
  const mapLocal = Object.keys(view.program.scope.bindings).find(name => { const p = view.program.scope.getBinding(name).path; const t = slice(view, p.node); return p.isFunctionDeclaration() && t.includes('name: t(e.component.name)') && t.includes('owners: e.component.owners.map(t)'); });
  const escapeLocal = Object.keys(view.program.scope.bindings).find(name => { const p = view.program.scope.getBinding(name).path; const t = slice(view, p.node); return p.isFunctionDeclaration() && t.includes('escaped: !0 }') && t.includes('escaped: !1 }') && t.includes('.replace(/[\\t\\n]/g, "")'); });
  if (!mapLocal || !escapeLocal) throw Error(`${VIEW}: the selected-element display mapping or escaping changed`);
  assertFeatures(`${VIEW}: ${parseLocal}`, rootText(view, parseLocal), ['startsLine', 'lastIndex']);
  {
    const ctx = newContext('preview-element-parser.mjs', { pure: true, hosts: { ...used(serialHosts, [`${SERIAL}:a`, `${SERIAL}:r`, `${SERIAL}:t`]), ...lazyInitLink, ...safetySiblings } });
    const text = await scope(view, [parseLocal, mapLocal, escapeLocal], ctx);
    assertHostsUsed(ctx);
    await record(ctx.target, `${header('structured selected-element parser and display normalization (c06cf64bb)')}${moduleImports(ctx)}
${text}
export function parseSelectedElementMessage(text) {
const parsed=${parseLocal}(text);
return {text:parsed.end===0?text:text.slice(parsed.end).replace(/^\\s+/,''),views:parsed.views.map(view=>{
let unsafe=false;const shown=${mapLocal}(view,value=>{const result=${escapeLocal}(value);unsafe ||= result.escaped;return result.text;});
return unsafe?{...shown,unsafeDisplay:true}:shown;
})};
}`, ctx);
  }

  // ------------------------------------------------ transcript: c2fd10b8d rs (old cd5a31703 YM), the selected-element card.
  const card = await chunk(CARD);
  const cardLocal = fn(card, t => t.includes('{ view: t, screenshot: i } = e') && t.includes('id: "6qM2RTmAlW"'));
  assertFeatures(`${CARD}: ${cardLocal}`, closure(card, [cardLocal]).text, ['"button, a, [role=button], [data-cds=MessageAttachmentsImage], [data-card-panel]"',
    'id: "OnI29rCYpz"', 'id: "usA7/7giEi"', 'id: "kVRzXhy4zq"', 'defaultMessage: "Your note"', '"data-find-omitted": ""', 'getSelection()?.isCollapsed !== !1']);
  {
    const ctx = newContext('preview-element-transcript.mjs', { hosts: {
      ...intlHosts,
      // ji: the detail rows, from createSelectedElementDetail (one copy of the detail closure).
      [`${PILL}:_`]: { param: 'Details', features: ['{ view: t, omit: n, cardRef: r } = e'] },
      // Si: the shared card/panel animation hook, from createSelectedElementDetail (one WeakMap per card element).
      [`${PILL}:v`]: { param: 'useDetailAnimation', features: ['panelRef:', 'beforeToggle:', '"--cds-ring-outer"'] },
      // c26fb8b6b Ue (w12-preview): the screenshot's right-click menu (Copy image / Save image, then the path items) is
      // inlined; what it reads that the host lacks is answered here:
      // - shared-52 ha: the ErrorsProvider toasts (addSuccess "Image copied to clipboard." / addError) — the host's toasts;
      'shared-52-uHFNjl7C.js:ha': { param: 'useErrors', features: ['Error("Must be called within ErrorsProvider")'] },
      // - cd59309dc t: the per-window open-context-menu marker, one store owned by session-rail-changes;
      'cd59309dc-BZMawR8Y.js:t': { link: '../session-rail-changes/context-menu-marker.mjs', name: 'ContextMenuOpenMarker',
        linkFeatures: ['cd59309dc-BZMawR8Y.js', 'byWindow: new Map()'], features: ['byWindow'] },
      // - c856385e2 z / l: the session-file root and "Reveal / Copy path" items for a `path`; the selected-element
      //   screenshot is a data URL with no path (`o !== void 0 && …` renders nothing), so no session file is resolved;
      'c856385e2-aEyDzrcK.js:z': { expr: '() => ({ gone: !1, root: void 0 })', features: ['{ gone: n, root: i }', 'absPath'] },
      'c856385e2-aEyDzrcK.js:l': { expr: '() => null', features: ['surface: s', 'separatorBefore: u', 'reveal: d'] },
      // - shared-0 ht: fetchAsDocumentAccount; for a URL that is no account document it is `fetch(e, t)` (data URLs never get here).
      'shared-0-DDOOdL6P.js:ht': { expr: '(e, t) => fetch(e, t)', features: ['"fetchAsDocumentAccount takes a string or a URL"', 'if (a === void 0) return fetch(e, t);'] },
      // Jf: `claudeai.epitaxy.transcript.element_context_card_expanded` telemetry; the local host sends none.
      'c68c4283d-CWbOoVxS.js:bn': { expr: '() => {}', features: ['"claudeai.epitaxy.transcript.element_context_card_expanded"'] },
      // u: the screenshot's `<src> 2x` srcSet on a HiDPI owner window (over a shared-frame store view-tabs does not
      // publish); the local screenshots are 1x data URLs, so no srcSet, as before.
      'cf6524bd5-0fIL9m-2.js:r': { expr: '() => undefined', features: ['`${e} 2x`', 'devicePixelRatio'] },
      // ry: MessageAttachments; the host supplies the Image tile (it opens the local image viewer).
      // (named ImageTile so the inlined image menu's `new Image()` still reads the global.)
      'shared-2-TF8v67kg.js:ry': { expr: '{ Image: ImageTile }', features: ['"data-cds": "MessageAttachmentsImage"'] },
    } });
    ctx.params.set('ImageTile', null);
    const text = await scope(card, [cardLocal], ctx);
    for (const copy of ['defaultMessage: "Copy image"', 'defaultMessage: "Save image"', 'navigator.clipboard.write(', 'ClipboardItem', 'onContextMenu: We'])
      if (!text.includes(copy)) throw Error(`${ctx.target}: the image menu lost ${copy}`);
    assertHostsUsed(ctx);
    await record(ctx.target, `${header('selected-element transcript card, disclosure and size-change animation (c2fd10b8d)')}${moduleImports(ctx)}
export function createSelectedElementTranscript({ ${factoryParams(ctx)} }) {
${text}
return ${cardLocal};
}`, ctx);
  }
}
