// Inventory actual generator provenance, without executing official code.
// --strict is a source-migration gate, never a claim of visual parity.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'rolldown/parseAst';
import { uiMigrationTarget as target } from './ui-migration-target.mjs';

const root = path.resolve(import.meta.dirname, '..');
const SCRIPT = /\.(?:js|jsx|mjs)$/;
const SUFFIXES = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx', '/index.mjs'];
const posix = file => file.split(path.sep).join('/');
// Relative ESM edges of one module: static import / export-from, and import() with a literal specifier. A non-literal
// import() leaves the graph incomplete (recorded, never guessed).
function moduleEdges(file, text) {
  const specifiers = [];
  let nonLiteral = false;
  const literal = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value
    : node?.type === 'TemplateLiteral' && node.expressions.length === 0 ? node.quasis[0].value.cooked ?? node.quasis[0].value.raw : null;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) visit(child); return; }
    if ((node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') && node.source)
      specifiers.push(node.source.value);
    if (node.type === 'ImportExpression') { const spec = literal(node.source); if (spec === null) nonLiteral = true; else specifiers.push(spec); }
    for (const key in node) if (key !== 'type' && key !== 'start' && key !== 'end') { const value = node[key]; if (value && typeof value === 'object') visit(value); }
  };
  visit(parseAst(text, { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file).body);
  return { specifiers, nonLiteral };
}
// The src module graph: who imports whom (relative edges only) and what index.html's module scripts reach.
async function sourceGraph(appRoot) {
  const src = path.join(appRoot, 'src');
  const files = (await fs.readdir(src, { recursive: true }).catch(() => [])).map(posix).filter(f => SCRIPT.test(f)).sort();
  const known = new Set(files.map(f => 'src/' + f));
  const resolve = (from, specifier) => {
    const bare = specifier.replace(/[?#].*$/, '');
    if (!bare.startsWith('.') && !bare.startsWith('/')) return null;
    const base = bare.startsWith('/') ? bare.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), bare));
    return SUFFIXES.map(suffix => base + suffix).find(candidate => known.has(candidate)) ?? null;
  };
  const edges = new Map(), nonLiteral = [];
  for (const file of known) {
    const { specifiers, nonLiteral: open } = moduleEdges(file, await fs.readFile(path.join(appRoot, file), 'utf8'));
    if (open) nonLiteral.push(file);
    edges.set(file, [...new Set(specifiers.map(spec => resolve(file, spec)).filter(Boolean))]);
  }
  const html = await fs.readFile(path.join(appRoot, 'index.html'), 'utf8').catch(() => '');
  const entries = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)].map(m => resolve('index.html', m[1])).filter(Boolean);
  const reachable = new Set(), queue = [...entries];
  while (queue.length) { const file = queue.shift(); if (reachable.has(file)) continue; reachable.add(file); queue.push(...(edges.get(file) ?? [])); }
  const importers = new Map();
  for (const [from, targets] of edges) for (const to of targets) { if (!importers.has(to)) importers.set(to, new Set()); importers.get(to).add(from); }
  return { entries, reachable, importers, nonLiteral, complete: entries.length > 0 && nonLiteral.length === 0 };
}

export async function auditUiMigration(appRoot = root) {
  const generated = path.join(appRoot, 'src/generated');
  const graph = await sourceGraph(appRoot);
  const areas = [];
  for (const entry of (await fs.readdir(generated, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(generated, entry.name, 'manifest.json');
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const versions = new Set();
    const snapshots = new Set();
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      // A legacy export facade is compatibility metadata, not an active source.
      for (const [key, item] of Object.entries(value)) {
        if (key === 'legacy') continue;
        if (key === 'referenceVersion' && typeof item === 'string') versions.add(item);
        else if (key === 'referenceSnapshot' && typeof item === 'string') snapshots.add(item);
        else walk(item);
      }
    };
    walk(manifest);
    const atTarget = versions.size === 1 && versions.has(target.version)
      && snapshots.size === 1 && snapshots.has(target.snapshot);
    // A shared graph is imported by other areas instead of being a screen region: view-tabs (runSlicer's default
    // sharedGraph) or an area generated with sharedGraph: null that publishes publicNames (cds-core).
    const role = entry.name === 'view-tabs' || (manifest.sharedGraph === null && Object.keys(manifest.publicNames ?? {}).length)
      ? 'shared-graph' : 'region';
    const prefix = `src/generated/${entry.name}/`;
    const own = [...graph.importers.keys()].filter(file => file.startsWith(prefix));
    const importedBy = [...new Set(own.flatMap(file => [...graph.importers.get(file)]).filter(file => !file.startsWith(prefix)))].sort();
    const reachableFromEntry = [...graph.reachable].some(file => file.startsWith(prefix));
    areas.push({ area: entry.name, manifest: path.relative(appRoot, manifestPath),
      versions: [...versions].sort(), snapshots: [...snapshots].sort(),
      state: atTarget ? 'target-provenance' : versions.size > 1 ? 'mixed' : versions.size ? 'pending' : 'unversioned',
      role, importedBy, reachableFromEntry,
      generator: manifest.generator ?? null });
  }
  const atTarget = area => area.state === 'target-provenance';
  const regions = areas.filter(area => area.role === 'region'), sharedGraphs = areas.filter(area => area.role === 'shared-graph');
  return { target, totalAreas: areas.length,
    // Source progress (manifest provenance) counts every area; "wired" needs the area reachable from index.html.
    targetProvenanceAreas: areas.filter(atTarget).length,
    targetProvenanceWiredAreas: areas.filter(area => atTarget(area) && area.reachableFromEntry).length,
    regions: { total: regions.length, targetProvenance: regions.filter(atTarget).length,
      targetProvenanceWired: regions.filter(area => atTarget(area) && area.reachableFromEntry).length },
    sharedGraphs: sharedGraphs.map(area => ({ area: area.area, state: area.state, reachableFromEntry: area.reachableFromEntry, importedBy: area.importedBy })),
    entryGraph: { entries: graph.entries, complete: graph.complete, nonLiteralImports: graph.nonLiteral,
      note: 'Relative static imports and literal import() from index.html module scripts; when incomplete, reachableFromEntry is a lower bound.' },
    sourceMigrationComplete: areas.length > 0 && areas.every(area => area.state === 'target-provenance'),
    visualParityVerified: false,
    scope: 'Manifest provenance inventory only. Run generators --check, import/build checks and visual/interaction comparison separately.',
    areas };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditUiMigration();
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex !== -1) {
    const output = process.argv[outputIndex + 1];
    if (!output || output.startsWith('--')) throw Error('--output requires a path');
    await fs.writeFile(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ target: target.version, totalAreas: report.totalAreas,
    targetProvenanceAreas: report.targetProvenanceAreas, targetProvenanceWiredAreas: report.targetProvenanceWiredAreas,
    regions: report.regions, sharedGraphs: report.sharedGraphs.map(g => `${g.area}:${g.state}:${g.reachableFromEntry ? 'wired' : 'not-wired'}`),
    entryGraphComplete: report.entryGraph.complete, sourceMigrationComplete: report.sourceMigrationComplete,
    visualParityVerified: report.visualParityVerified }));
  if (process.argv.includes('--strict') && !report.sourceMigrationComplete) process.exitCode = 1;
}
