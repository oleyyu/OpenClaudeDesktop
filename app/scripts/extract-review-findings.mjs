// R3-terminal FT-09 (diffgit-01), migrated to 3.6556.2 (w2-tr-findings): extract the Changes pane review finding card
// without executing any desktop runtime (decision D0: own generator, own output folder src/generated/review-findings,
// own scripts/verify-gen-review-findings.mjs).
//
//   review-finding-card.mjs  c44d00c7f wc = memo(Cc): the inline finding card under its line in the diff — the Claude
//                            spark + "Claude" header with the "Line N" / "Lines N–M" label (nc), the Fixed / Fixing… /
//                            Confirmed / Plausible and category badges, the ghost ArrowDown "Next finding" and X
//                            "Dismiss finding" buttons, the body and failure scenario, and the border-t footer with the
//                            secondary ArrowUp "Fix this one" while the finding is open and fixable; $s is the
//                            --diff-widget-* card skin. 3.6556.2 compiles Cc with React Compiler (J9/J1…/K1…, imported
//                            from view-tabs by their E3 semantic names) and renames two ids (Fixed BNEz9MFGbU,
//                            Plausible FNzj2neHoF, research T13).
//   pane-focus-return.mjs    shared-1 nC / aC (2.42304.0 cae42d46f s / u, chunk removed): where focus goes when the card
//                            it was in is dismissed (the diff pane body, a dialog or the pane root, a tick later and only
//                            if focus fell to the body).
//   finding-category.mjs     c227f4d5e b1: the ReportFindings category label (x1: `category: b1(t.category)`).
//
// Every emitted binding is an original top-level declaration sliced from the prettier-formatted source. Each module's
// bindings are the reachable closure of its roots (Babel scope analysis), so nothing is hand-picked and a renamed or
// re-pointed minified import fails generation instead of silently binding the wrong value. An import resolves, in this
// order, to: a named host adapter in src/source-review-findings-adapters.jsx (feature-checked against the original it
// replaces), a verified React export of vendor-frame (official.reactAliases, R3), a semantic public name of the shared
// view-tabs graph (D1/E3: CdsButton / CdsBadge / CdsTooltipProvider / CdsOverflowTooltip / clsx and the compiler
// helpers), or another module generated here.
// `callSites` pin the original text the host wiring follows but cannot import: the diff's annotation renderer (Pc), the
// annotation list (Tc) and the findings card's annotation builder in c96d752d0. Features are stable strings, or
// {loose} (official.looseFeature, R2/E5) where the text names minified bindings.
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
const output = path.join(root, 'src/generated/review-findings');
const adapterModule = '../../source-review-findings-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = text => ({ loose: text });

// vendor-frame re-exports React; each alias is checked against official.reactAliases (R3: top-level
// `local=<namespace>.<member>`, `Oo` is react/compiler-runtime `c`).
const vendor = { [official.vendorFrame]: official.reactAliases };
// Host dependencies. `features` must appear in the same-chunk closure of the original binding the adapter replaces.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (source-code-start-adapters.jsx useStartIntl).
  [official.vendorIntl]: {
    p: { name: 'useIntl', features: ['[React Intl]'] },
    l: { name: 'FormattedMessage', features: ['textComponent'] },
  },
  // cc8941b7b pt / mt (exported Z / tt): the session review store's current finding and a finding's status. Here the
  // Changes pane keeps them (source-session.jsx review marks) and hands each card its own through context.
  'cc8941b7b-DAgMZRvX.js': {
    Z: { name: 'useIsCurrentFinding', features: ['.currentFindingBySession[e] === t'] },
    tt: { name: 'useFindingStatus', features: ['.findingStatusBySession[e]?.[t] ?? "open"'] },
  },
  // shared-frame ZO (exported fa): the CDS Spark — idle/undefined state is the static path Jg, `shrink-0` added for a
  // numeric size. The host Spark is SourceSpark (same path, colour and size variable, plus the local persona glyphs).
  [official.sharedFrame]: {
    fa: { name: 'ReviewSpark', features: [loose('typeof r.size == "string" ? t : Q("shrink-0", t)'), loose('i === void 0 || i === "idle"'),
      '"data-cds": "Spark"', loose('Kg = "var(--cds-clay, #d97757)"'), loose('qg = "h-[var(--cds-spark-size)] w-[var(--cds-spark-size)]"')] },
  },
};
const modules = [
  { target: 'pane-focus-return.mjs', source: 'shared-1-BJhqMmkf.js', exports: { nC: 'focusReturnRegion', aC: 'returnFocusSoon' },
    features: {
      nC: [loose('return e?.closest(\'[data-diff-pane-body], [role="dialog"]\') ?? tC(e);')], tC: ['?.closest("[data-pane-root]") ?? null;'],
      rC: ['.querySelector("[data-diff-pane-body]") ??'], aC: [loose('oC(e, tC(e));')],
      oC: ['setTimeout(() => {', loose('if (n.activeElement !== n.body) return;'), loose('r?.isConnected && rC(r).focus({ preventScroll: !0 });')],
    } },
  { target: 'finding-category.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { b1: 'findingCategoryLabel' },
    features: { b1: [loose('if (typeof e != "string") return;'), '.replace(/[-_]+/g, " ").trim();', loose('return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 40);')] } },
  { target: 'review-finding-card.mjs', source: 'c44d00c7f-Cr1FDL2F.js', exports: { wc: 'ReviewFindingCard', nc: 'findingLinesLabel', $s: 'DIFF_WIDGET_CARD' },
    features: {
      wc: [loose('wc = v(Cc)')],
      $s: ['"rounded border border-[var(--diff-widget-border,var(--cds-border))] bg-[var(--diff-widget-bg,var(--cds-surface-3))] font-sans text-[var(--diff-widget-fg,var(--cds-text-primary))] shadow-sm"'],
      nc: ['{ defaultMessage: "Line {line}", id: "qtx2KQoFxt" }', '{ defaultMessage: "Lines {start}\\u2013{end}", id: "LkSZyjr77o" }'],
      Cc: [
        loose('$ = J9(64)'), '{ sessionId: i, annotation: a, onDismiss: s, onFix: c, onNext: l }',
        loose('(e?.contains(e.ownerDocument.activeElement) && Ee(Se(e)), s?.());'), '.focus({ preventScroll: !0 }),', loose('m = _r(i, a.id),'), loose('h = kr(i, a.id),'),
        loose('g = h === "open" && !!c,'), 'h === "addressed"', 'variant: "success",', 'defaultMessage: "Fixed", id: "BNEz9MFGbU"', 'defaultMessage: "Fixing\\u2026",',
        '.verdict === "CONFIRMED" ? "danger" : "warning"', 'defaultMessage: "Confirmed", id: "dX7+RvbH/9"', 'defaultMessage: "Plausible", id: "FNzj2neHoF"',
        'defaultMessage: "Next finding", id: "5lh5JiLkPH"', 'defaultMessage: "Next finding after the one on line {line}",', 'id: "RkGf6cYgK5",',
        'className: "px-md py-xs",', 'tabIndex: -1,', '"aria-current": b,', '"border-accent ring-1 ring-accent"',
        'className: "flex min-h-7 items-center gap-1.5 px-md pt-1",', loose('n(ne, { size: 16 })'), 'className: "truncate text-body-medium",',
        'defaultMessage: "Claude", id: "4PjoX4rZSt"', loose('children: nc(a.startLine, a.endLine, u),'), 'className: "ms-auto flex min-w-0 items-center gap-1",',
        'truncate: !0,', 'className: "max-w-[12rem]",', 'lazy: !0,', 'className: "flex shrink-0 items-center gap-0.5",', loose('h === "open" && l'),
        'icon: "ArrowDown",', 'icon: "X",', 'defaultMessage: "Dismiss finding",', '"pb-1.25" : "pb-md"',
        '"whitespace-pre-wrap break-words text-body text-primary"', '"whitespace-pre-wrap break-words text-body text-muted-as-secondary"',
        '"flex justify-end border-t border-[var(--diff-widget-border,var(--cds-border))] px-sm py-xs"', 'variant: "secondary",', 'size: "sm",',
        'icon: "ArrowUp",', 'defaultMessage: "Fix this one",', 'id: "t7GVF0eiPN",',
      ],
    } },
];
const callSites = [
  { source: 'c44d00c7f-Cr1FDL2F.js', binding: 'Pc', role: 'Diff annotation renderer: a finding is wc with Fix / Next (only with more findings) / Dismiss',
    features: [loose('if (r.kind === "finding")'), loose('annotation: r.finding,'), loose('onFix: f ? () => f(r.finding) : void 0,'), loose('onNext: r.hasNext'),
      '.stepReviewFinding(', loose('p ? p(r.finding) : wr.dismissReviewFinding(i, r.finding.id, c)'), loose('n( wc, {')] },
  { source: 'c44d00c7f-Cr1FDL2F.js', binding: 'Tc', role: 'Annotation list: a finding sits under its end line (lineNumber: endLine), hasNext from the pane',
    features: ['key: `finding:${e.id}`,', 'lineNumber: e.endLine,', 'metadata: { kind: "finding", finding: e, hasNext: i },'] },
  { source: 'c227f4d5e-B-FYKrwT.js', binding: 'x1', role: 'ReportFindings finding parser: category is b1(category), line only when a number',
    features: [loose('line: typeof t.line == "number" ? t.line : void 0,'), loose('category: b1(t.category),'), loose('t.verdict === "CONFIRMED" || t.verdict === "PLAUSIBLE"')] },
];
// Pinned on the minified bytes: c96d752d0 is the transcript chunk (tens of thousands of lines); only this text matters.
const rawCallSites = [
  { source: 'c96d752d0-CWv_7-n9.js', role: 'Findings card: the annotation each reported finding becomes (host: review-findings-model.mjs findingAnnotation)',
    features: [loose('id:`finding-${t.id}-${n}`,filePath:e.file,side:"additions",startLine:e.line??1,endLine:e.line??1,line:e.line,body:e.summary,detail:e.failure_scenario,source:"finding",category:e.category,verdict:e.verdict,createdAt:O')] },
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, code, ast, exported, program: null };
  cache.set(name, record);
  return record;
}
function scoped(src) {
  if (!src.program) babel.traverse(src.ast, { Program(p) { src.program = p; p.stop(); } });
  return src.program;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(scoped(src).scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
const normalised = text => text.replace(/\s+/g, ' ');
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = scoped(src).scope.getBinding(n)?.path;
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
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  // R3: a top-level `local=<namespace>.<member>` of the module's own namespace (`Oo`: the compiler-runtime factory).
  official.assertVendorAlias(src.bytes.toString(), alias, target);
  return target;
}
async function viewTabsPublic() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const byLocal = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) byLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  return byLocal;
}
function topLevelDeclaration(src, name) {
  const hits = [];
  for (const node of src.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push(node);
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push(declarator);
  }
  if (hits.length !== 1) throw Error(`${src.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}

export async function extractReviewFindings({ check = false } = {}) {
  const cache = new Map();
  const published = await viewTabsPublic();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-review-findings.mjs',
    adapterModule: 'src/source-review-findings-adapters.jsx', modules: [], callSites: [],
  };
  const files = {};
  for (const spec of modules) {
    const src = await readSource(spec.source, cache);
    const program = scoped(src);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = program.scope.getBinding(name);
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
        const shared = published.get(`${file}#${local}`);
        if (shared) { imports.set(name, { from: `../view-tabs/${file}`, name: shared.name, via, kind: 'view-tabs', original: local }); return; }
        const generated = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
        if (!generated) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: `./${generated.spec.target}`, name: generated.spec.exports[local], via, kind: 'generated' });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      selected.set(name, p);
      p.traverse({
        ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); },
        CallExpression(r) { if (r.node.callee.type === 'Import') throw Error(`${spec.target}: dynamic import inside ${name}`); },
      });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      await add(name);
    }
    // Features: every pinned binding must be in the closure and carry its original text.
    for (const [name, features] of Object.entries(spec.features ?? {})) {
      const p = selected.get(name);
      if (!p) throw Error(`${spec.target}: pinned binding ${name} is not in the closure of ${Object.keys(spec.exports).join(',')}`);
      assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), features);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-review-findings.mjs.\n// Edit the extractor or src/source-review-findings-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    // The module must be closed: every identifier it reads is imported or declared in it.
    const closed = babel.babelParse(text, spec.target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const allowed = new Set(['setTimeout', 'String', 'Object']);
    const unbound = globals.filter(name => !allowed.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
  }
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const node = topLevelDeclaration(src, site.binding);
    const text = src.code.slice(node.start, node.end);
    assertFeatures(`call site ${site.source}:${site.binding}`, text, site.features);
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(text), features: site.features });
  }
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    assertFeatures(`call site ${site.source} (raw)`, bytes.toString(), site.features);
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Review findings output set changed: ${present.join(',')}. Run scripts/extract-review-findings.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Review findings source mismatch: ${name}. Run scripts/extract-review-findings.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} review finding modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractReviewFindings({ check: process.argv.includes('--check') });
