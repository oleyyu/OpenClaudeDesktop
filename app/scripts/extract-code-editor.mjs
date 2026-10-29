// Driver for src/generated/code-editor: source-derived adapters (search/desktop, side chat, Preview element, Preview
// shell, Preview sketch), each area emitted by scripts/code-editor-gen/<area>.mjs. Every area writes
// areas/<area>.json (its adapters, electron copies and sources); manifest.json is recomputed from the six area files
// in a fixed order, so lanes regenerating different areas (--only) write the same aggregate.
//   node scripts/extract-code-editor.mjs [--check] [--only <area,…>]
// --check generates in memory and compares byte for byte (adapters, electron/generated copies, area files, manifest)
// and reports stale files; write mode removes files no area wrote. w11-sweep-rest (w10-editor-split review): every
// area file on disk is read before any area emits, an electron/generated copy an area recorded and no longer writes
// is stale too, and an --only write removes only what the selected areas themselves dropped (another lane's newer
// output, unknown to the area files read here, is left for its own run instead of being deleted). The 2.31226.0 CodeMirror runtime copy, its
// languages/editing/selection/filename-language wrappers and the file-*/terminal-* adapters are retired
// (w10-editor-split): code-editor-current, files-changes and code-current publish them from newer snapshots.
import { fileURLToPath } from 'node:url';
import { fs, path, root, output, legacyVersion, createAreaContext, areaRecord } from './code-editor-gen/common.mjs';
import { referenceSnapshot } from './official-3.6556.2.mjs';

export const areaOrder = Object.freeze(['desktop', 'side-chat', 'preview-element', 'preview-shell-a', 'preview-shell-b', 'preview-sketch']);
// Output directory as written in the source: prepare-style-compatibility.mjs finds this generator's area by the
// literal 'src/generated/<area>' in scripts/extract-*.mjs (the path itself comes from common.mjs).
const outputLabel = 'src/generated/code-editor';
if (path.relative(root, output).split(path.sep).join('/') !== outputLabel) throw Error(`code-editor output moved: ${output}`);
const areasDir = path.join(output, 'areas');
const versionOf = entry => entry.referenceVersion ?? legacyVersion;

export async function extractCodeEditor({ check = false, only } = {}) {
  const selected = only?.length ? [...new Set(only)] : [...areaOrder];
  for (const area of selected) if (!areaOrder.includes(area)) throw Error(`Unknown code-editor area ${area} (areas: ${areaOrder.join(', ')})`);
  const records = new Map(), files = new Map(), copies = new Map(), previous = new Map();
  for (const area of areaOrder) {
    try { previous.set(area, JSON.parse(await fs.readFile(path.join(areasDir, `${area}.json`), 'utf8'))); } catch {}
  }
  for (const area of areaOrder) {
    if (!selected.includes(area)) continue;
    const ctx = createAreaContext(area);
    await (await import(`./code-editor-gen/${area}.mjs`)).emit(ctx);
    records.set(area, areaRecord(ctx));
    for (const [name, bytes] of ctx.outputs) files.set(name, bytes);
    for (const [target, bytes] of ctx.copyOutputs) copies.set(target, bytes);
    files.set(`areas/${area}.json`, Buffer.from(JSON.stringify(records.get(area), null, 2) + '\n'));
  }
  for (const area of areaOrder) {
    if (records.has(area)) continue;
    if (!previous.has(area)) throw Error(`Missing ${path.relative(root, path.join(areasDir, `${area}.json`))}; run extract-code-editor.mjs without --only first`);
    records.set(area, previous.get(area));
  }
  const adapters = areaOrder.flatMap(area => records.get(area).adapters);
  const owner = new Map();
  for (const area of areaOrder) for (const entry of records.get(area).adapters) {
    if (owner.has(entry.name)) throw Error(`Adapter ${entry.name} is emitted by both ${owner.get(entry.name)} and ${area}`);
    owner.set(entry.name, area);
  }
  const versions = [...new Set(adapters.map(versionOf))];
  const referenceVersion = versions.length === 1 ? versions[0] : 'mixed';
  const manifest = {
    referenceVersion,
    ...(referenceVersion === '3.6556.2' ? { referenceSnapshot } : {}),
    areas: [...areaOrder],
    // modules[].target + referenceVersion is the shape tests/i18n-coverage-v3.test.mjs reads per adapter.
    modules: adapters.map(entry => ({ name: entry.name, target: entry.name, referenceVersion: versionOf(entry) })),
    adapters,
    copies: areaOrder.flatMap(area => records.get(area).copies),
  };
  files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));

  const problems = [];
  async function write(file, bytes) {
    if (check) {
      let current = null;
      try { current = await fs.readFile(file); } catch {}
      if (!current || !current.equals(bytes)) problems.push(`changed: ${path.relative(root, file)}`);
    } else {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes);
    }
  }
  for (const [name, bytes] of files) await write(path.join(output, name), bytes);
  for (const [target, bytes] of copies) await write(path.join(root, target), bytes);

  // Stale files: anything in the output (and areas/) that no area owns.
  const owned = new Set(['manifest.json', ...adapters.map(entry => entry.name), ...areaOrder.map(area => `areas/${area}.json`)]);
  const stale = [];
  for (const entry of await fs.readdir(output, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && entry.name === 'areas') {
      for (const inner of await fs.readdir(areasDir)) if (!owned.has(`areas/${inner}`)) stale.push(`areas/${inner}`);
    } else if (!owned.has(entry.name)) stale.push(entry.name);
  }
  stale.sort();
  // electron/generated copies: a target a (selected) area recorded before and no longer writes.
  const copyTargets = new Set(manifest.copies.map(entry => entry.target));
  const staleCopies = [...new Set(selected.flatMap(area => (previous.get(area)?.copies ?? []).map(entry => entry.target)))]
    .filter(target => !copyTargets.has(target)).sort();
  // An --only write deletes only the outputs the selected areas' own previous records listed.
  const full = selected.length === areaOrder.length;
  const dropped = new Set(selected.flatMap(area => (previous.get(area)?.adapters ?? []).map(entry => entry.name)));
  const removable = full ? stale : stale.filter(name => dropped.has(name));
  if (check) {
    if (stale.length) problems.push(`stale: ${stale.join(', ')}`);
    if (staleCopies.length) problems.push(`stale copies: ${staleCopies.join(', ')}`);
    if (problems.length) throw Error(`Code editor output differs from the generator:\n  ${problems.join('\n  ')}`);
  } else {
    for (const name of removable) await fs.rm(path.join(output, name), { recursive: true, force: true });
    for (const target of staleCopies) await fs.rm(path.join(root, target), { force: true });
    if (removable.length < stale.length) console.log(`Left ${stale.length - removable.length} files no selected area owned (${stale.filter(name => !removable.includes(name)).join(', ')}); a full run removes them.`);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} ${adapters.length} source-derived code-editor adapters and ${manifest.copies.length} electron copies `
    + `(${selected.length === areaOrder.length ? 'all areas' : selected.join(', ')}; manifest ${referenceVersion})${!check && removable.length + staleCopies.length ? `; removed ${removable.length + staleCopies.length} stale files` : ''}.`);
  return manifest;
}

function parseOnly(argv) {
  const index = argv.findIndex(arg => arg === '--only' || arg.startsWith('--only='));
  if (index < 0) return undefined;
  const value = argv[index].includes('=') ? argv[index].slice('--only='.length) : argv[index + 1];
  if (!value || value.startsWith('--')) throw Error('--only needs a comma-separated list of areas');
  return value.split(',').map(area => area.trim()).filter(Boolean);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCodeEditor({ check: process.argv.includes('--check'), only: parseOnly(process.argv.slice(2)) });
