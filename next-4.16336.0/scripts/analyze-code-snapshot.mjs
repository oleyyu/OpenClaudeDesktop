// Analyze extracted bundles without executing application code or modifying app assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { format } from '../tools/node_modules/prettier/index.mjs';
import { parsers } from '../tools/node_modules/prettier/plugins/babel.mjs';

const { values } = parseArgs({ options: {
  snapshot: { type: 'string' }, baseline: { type: 'string' }, output: { type: 'string' },
} });
if (!values.snapshot || !values.baseline || !values.output) throw Error('Required: --snapshot --baseline --output');
const snapshot = path.resolve(values.snapshot), baseline = path.resolve(values.baseline), output = path.resolve(values.output);
const assets = path.join(snapshot, 'ion-dist/assets/v1');
const oldAssets = path.join(baseline, 'ion-dist/assets/v1');
await fs.mkdir(path.join(output, 'readable'), { recursive: true });
const sha = x => createHash('sha256').update(x).digest('hex');
const save = (name, data) => fs.writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n');
const walk = async dir => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(x => x.isDirectory() ? walk(path.join(dir, x.name)) : path.join(dir, x.name)))).flat();
const stem = name => name.match(/^(c[0-9a-f]{8}|shared-\d+|shared-styles|shared-frame|index)-/)?.[1] ?? name;
const marker = /epitaxy|Epitaxy|Code(?:Index|Layout|Session|Popout)Route|dframe-/;
const probes = ['CodeIndexRoute', 'CodeSessionRoute', 'CodeLayoutRoute', 'EpitaxyFramePage', 'EpitaxySecondPane', 'dframe-sidebar', 'code-composer', 'epitaxy-composer', 'epitaxy-files', 'epitaxy-diff', 'epitaxy-terminal', 'epitaxy-preview', 'epitaxy-settings', 'epitaxy-session', 'epitaxy-sidebar', 'action-center', 'claudeAppBindings'];

function inspect(raw) {
  const tree = parsers.babel.parse(raw, {}), imports = [], exports = [], strings = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'StringLiteral') strings.add(node.value);
    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      if (node.source) imports.push({ kind: node.type === 'ImportDeclaration' ? 'static' : 'reexport', specifier: node.source.value });
      for (const spec of node.specifiers ?? []) if (spec.exported) exports.push({ local: spec.local?.name, exported: spec.exported.name ?? spec.exported.value });
      if (node.declaration?.id) exports.push({ local: node.declaration.id.name, exported: node.declaration.id.name });
    }
    if (node.type === 'ImportExpression' && node.source?.type === 'StringLiteral') imports.push({ kind: 'dynamic', specifier: node.source.value });
    if (node.type === 'CallExpression' && node.callee?.type === 'Import' && node.arguments[0]?.type === 'StringLiteral') imports.push({ kind: 'dynamic', specifier: node.arguments[0].value });
    for (const [key, child] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'tokens', 'comments', 'extra'].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(tree.program);
  return { imports, exports, strings: [...strings].sort() };
}

const names = (await fs.readdir(assets)).sort(), oldNames = (await fs.readdir(oldAssets)).sort();
const oldByStem = new Map();
for (const name of oldNames) {
  const key = stem(name) + path.extname(name);
  oldByStem.set(key, [...(oldByStem.get(key) ?? []), name]);
}
const modules = [], mapping = [], hits = {}, diffs = [], errors = [], tokens = [], selectors = [];
for (const name of names) {
  if (!/\.(js|css)$/.test(name)) continue;
  const raw = await fs.readFile(path.join(assets, name), 'utf8');
  const isCSS = name.endsWith('.css');
  const oldCandidates = oldByStem.get(stem(name) + path.extname(name)) ?? [];
  let selected = isCSS || marker.test(raw) || /^(c9500abe8|c11959232|cbd02b8f2|c148e7537|c6bf19e8f|cfe7c4b3b|cccc2cf0a|c03935b01|cd5a31703|index)-/.test(name);
  let data;
  if (!isCSS) {
    try { data = inspect(raw); } catch (error) { errors.push({ file: name, phase: 'parse', error: error.message }); continue; }
    selected ||= data.exports.some(x => /^(?:Epitaxy|Code(?:Index|Layout|Session|Desktop|Sidebar|Project|Home|Local|WhatsNew)|SettingsModal|SettingsNavSearch|CustomizePageContent|ShellTerminal|CommandPaletteBody|ShortcutsModalBody|Sidebar(?:Edit|Bulk)|Popout(?:Epitaxy|SideChat)|PreviewAllowedSitesModal|LocalPreviewModal)/.test(x.exported));
    modules.push({ file: name, bytes: Buffer.byteLength(raw), sha256: sha(raw), selected, imports: data.imports, exports: data.exports });
  }
  if (!selected) continue;
  let formatted;
  try { formatted = await format(raw, { parser: isCSS ? 'css' : 'babel' }); }
  catch (error) { errors.push({ file: name, phase: 'format', error: error.message }); continue; }
  const readable = 'readable/' + name;
  await fs.writeFile(path.join(output, readable), formatted);
  mapping.push({ file: name, source: path.relative(process.cwd(), path.join(assets, name)), readable, sha256: sha(raw), formattedSha256: sha(formatted), lines: formatted.split('\n').length, reason: isCSS ? 'stylesheet' : marker.test(raw) ? 'Code / shared desktop marker' : 'known Code module family or entry', baselineCandidates: oldCandidates });
  const lines = formatted.split('\n');
  for (const probe of probes) for (let i = 0; i < lines.length; i++) if (lines[i].includes(probe)) (hits[probe] ??= []).push({ file: readable, line: i + 1, text: lines[i].trim().slice(0, 300) });
  if (isCSS) {
    for (const m of formatted.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) tokens.push({ file: readable, name: m[1], value: m[2].trim(), line: formatted.slice(0, m.index).split('\n').length });
    for (const m of formatted.matchAll(/[^{}]+\{/g)) if (/epitaxy|dframe-|code-|--df-|--cds-/.test(m[0])) selectors.push({ file: readable, selector: m[0].trim().slice(0, -1).trim() });
  }
  const row = { file: name, baselineCandidates: oldCandidates, matching: 'Filename family is a heuristic; shared chunk numbers can move.', bytes: Buffer.byteLength(raw) };
  if (oldCandidates.length === 1) {
    const before = await fs.readFile(path.join(oldAssets, oldCandidates[0]), 'utf8');
    row.baselineBytes = Buffer.byteLength(before); row.byteDelta = row.bytes - row.baselineBytes; row.identical = sha(raw) === sha(before);
    if (!isCSS) {
      try {
        const oldData = inspect(before), oldSet = new Set(oldData.strings), newSet = new Set(data.strings);
        const meaningful = s => s.length > 3 && s.length < 350 && !/^(?:\.\/|assets\/|data:)/.test(s);
        row.addedStrings = data.strings.filter(s => meaningful(s) && !oldSet.has(s));
        row.removedStrings = oldData.strings.filter(s => meaningful(s) && !newSet.has(s));
        row.exports = data.exports;
      } catch (error) { errors.push({ file: oldCandidates[0], phase: 'baseline-parse', error: error.message }); }
    }
  }
  diffs.push(row);
  if (mapping.length % 30 === 0) console.log(`Formatted ${mapping.length} Code/shared modules and stylesheets`);
}

const graph = new Map(modules.map(m => [m.file, m]));
const roots = modules.filter(m => m.exports.some(x => ['CodeIndexRoute', 'CodeLayoutRoute', 'CodeSessionRoute', 'EpitaxyFramePage', 'EpitaxySecondPane'].includes(x.exported))).map(m => m.file);
const reachable = new Set(), missing = [];
function resolve(from, specifier) { return specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier)) : specifier.startsWith('/assets/v1/') ? specifier.slice('/assets/v1/'.length) : null; }
function trace(name) {
  if (reachable.has(name)) return; reachable.add(name);
  for (const edge of graph.get(name)?.imports ?? []) { const target = resolve(name, edge.specifier); if (target && graph.has(target)) trace(target); }
}
roots.forEach(trace);
for (const m of modules) for (const edge of m.imports) {
  const target = resolve(m.file, edge.specifier);
  if (target && !(await fs.stat(path.resolve(assets, target)).catch(() => null))) missing.push({ from: m.file, ...edge, target });
}
// Preserve the Electron shell/preload too, separately from frontend modules.
for (const file of (await walk(path.join(snapshot, 'asar/.vite'))).filter(f => /(?:index\.pre|mainView|MainWindowPage[^/]*|frame[^/]*)\.js$/.test(f))) {
  const raw = await fs.readFile(file, 'utf8');
  try {
    const formatted = await format(raw, { parser: 'babel' });
    const readable = 'readable/electron-' + path.basename(file);
    await fs.writeFile(path.join(output, readable), formatted);
    mapping.push({ source: path.relative(process.cwd(), file), readable, sha256: sha(raw), formattedSha256: sha(formatted), lines: formatted.split('\n').length, reason: 'Electron shell / bridge' });
  } catch (error) { errors.push({ file, phase: 'electron-format', error: error.message }); }
}
const manifest = JSON.parse(await fs.readFile(path.join(snapshot, 'manifest.json')));
const oldManifest = JSON.parse(await fs.readFile(path.join(baseline, 'manifest.json')));
const all = await walk(snapshot);
const summary = { version: manifest.version, baselineVersion: oldManifest.version, snapshot, baseline, archiveSHA256: manifest.sha256, asarEntries: manifest.files.length, baselineAsarEntries: oldManifest.files.length, frontendFiles: manifest.frontend.length, baselineFrontendFiles: oldManifest.frontend.length, parsedFrontendModules: modules.length, formattedFiles: mapping.length, codeRoots: roots, reachableModulesIncludingSharedDependencies: reachable.size, cssDeclarations: tokens.length, uniqueCSSProperties: new Set(tokens.map(x => x.name)).size, sourceMaps: all.filter(x => x.endsWith('.map')).map(x => path.relative(snapshot, x)), missingImports: missing.length, errors: errors.length, limitations: ['Compiled bundles formatted for inspection, not recovered TSX.', 'Marker-selected readable files include shared desktop and non-Code code.', 'Graph covers literal ESM imports/re-exports, not arbitrary runtime resolution.', 'Filename-family and string differences are navigation aids, not proof of visible UI changes.', 'Feature flags and account/server state require separate runtime validation.'] };
await save('summary.json', summary);
await save('ui-map.json', mapping);
await save('module-imports.json', modules);
await save('code-dependency-closure.json', { roots, modules: [...reachable].sort(), missing });
await save('feature-hits.json', hits);
await save('css-tokens.json', tokens);
await save('code-selectors.json', selectors);
await save('baseline-diff.json', diffs);
await save('errors.json', errors);
console.log(JSON.stringify(summary, null, 2));
if (errors.length || missing.length) process.exitCode = 1;
