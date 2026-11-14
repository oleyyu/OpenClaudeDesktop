// Code editor, 4.16336.0 contract (OpenClaude v0.3 -> Claude 4.16336.0, frozen snapshot
// reference/snapshots/claude-4.16336.0-20261104): driver for the staged graph src/generated/code-editor-v4, next to the
// 3.6556.2 production graph src/generated/code-editor that scripts/extract-code-editor.mjs keeps writing byte for byte
// (region plan: code-editor batch 8, cutover.productionSwitchNotBeforeBatch 8; this round writes the -v4 output only).
//   node scripts/extract-code-editor-v4.mjs [--check] [--only <area,…>]
//
// Same shape as the 3.6556.2 driver: six areas, each emitted by scripts/code-editor-v4-gen/<area>.mjs and recorded in
// areas/<area>.json; manifest.json is recomputed from the area files in the fixed area order, so lanes regenerating
// different areas (--only) write the same aggregate. An area whose module does not exist yet is listed in
// manifest.pendingAreas (round 2 ports the areas unit by unit: code-editor:a desktop, :b side-chat, :c preview-element
// and preview-sketch, :d preview-shell-a and preview-shell-b). Lanes writing the shared manifest serialise on the
// directory lock analysis/claude-4.16336.0-migrate-20261104/round2/locks/code-editor-v4 (mkdir; a write run waits for it).
//
// Differences from the 3.6556.2 driver: no electron/generated copy is written (each area records its production copy
// targets in copyTargets, the cutover list); manifest.modules[] carries every adapter's official bindings (file#local +
// raw declaration sha256) and realm, the form analysis/…/d1/d1-gate.mjs reads, with `electron: true` for adapters whose
// production consumers are main-process only; sharedGraph 'cds-core' is pinned to the cds-core manifest the round
// was planned against, and every binding cds-core also copies is listed (manifest.cdsCoreOverlap: pure helpers are
// re-sliced in place, module state never is: the D1 gate fails on a second stateful copy); the three chunks that are
// byte-identical in both snapshots are proved identical on every run (manifest.identicalChunks).
// --check generates in memory and compares byte for byte (adapters, area files, manifest) and reports stale files.
import { fileURLToPath } from 'node:url';
import fsSync from 'node:fs';
import { fs, path, root, output, outputLabel, sha, referenceVersion, referenceSnapshot, createAreaContext, areaRecord, verifyIdenticalChunks, releaseChunkCaches } from './code-editor-v4-gen/common.mjs';

export const areaOrder = Object.freeze(['desktop', 'side-chat', 'preview-element', 'preview-shell-a', 'preview-shell-b', 'preview-sketch']);
// Output directory as written in the source (prepare-style-compatibility.mjs finds a generator's area by the literal
// 'src/generated/<area>' in scripts/extract-*.mjs): src/generated/code-editor-v4
if (path.relative(root, output).split(path.sep).join('/') !== outputLabel || outputLabel !== 'src/generated/code-editor-v4') throw Error(`code-editor-v4 output moved: ${output}`);
const areasDir = path.join(output, 'areas');
const genDir = path.join(import.meta.dirname, 'code-editor-v4-gen');
export const cdsCoreManifestSha256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';
const cdsCoreManifest = path.join(root, 'src/generated/cds-core/manifest.json');
const lockDir = path.resolve(root, '../analysis/claude-4.16336.0-migrate-20261104/round2/locks/code-editor-v4');

async function withLock(fn) {
  const until = Date.now() + 10 * 60 * 1000;
  for (;;) {
    try { await fs.mkdir(lockDir); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() > until) throw Error(`code-editor-v4 lock still held after 10 minutes: ${lockDir}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  try { return await fn(); } finally { await fs.rmdir(lockDir).catch(() => {}); }
}

export const portedAreas = () => areaOrder.filter(area => fsSync.existsSync(path.join(genDir, `${area}.mjs`)));

export async function extractCodeEditorV4({ check = false, only } = {}) {
  const ported = portedAreas();
  const selected = only?.length ? [...new Set(only)] : [...ported];
  for (const area of selected) {
    if (!areaOrder.includes(area)) throw Error(`Unknown code-editor area ${area} (areas: ${areaOrder.join(', ')})`);
    if (!ported.includes(area)) throw Error(`code-editor-v4 area ${area} has no generator module yet (scripts/code-editor-v4-gen/${area}.mjs)`);
  }
  // cds-core is the shared graph: the manifest this round was planned against.
  const cdsBytes = await fs.readFile(cdsCoreManifest);
  if (sha(cdsBytes) !== cdsCoreManifestSha256) throw Error(`cds-core manifest is ${sha(cdsBytes)}, code-editor-v4 is pinned to ${cdsCoreManifestSha256}`);
  const cdsHeld = new Map();
  for (const m of JSON.parse(cdsBytes).modules ?? []) for (const b of m.bindings ?? []) if (m.source) cdsHeld.set(`${path.basename(m.source)}#${b.name}`, m.target);
  const identicalChunks = await verifyIdenticalChunks();

  const records = new Map(), files = new Map();
  for (const area of ported) {
    if (!selected.includes(area)) continue;
    const ctx = createAreaContext(area);
    await (await import(`./code-editor-v4-gen/${area}.mjs`)).emit(ctx);
    records.set(area, areaRecord(ctx));
    for (const [name, bytes] of ctx.outputs) files.set(name, bytes);
    files.set(`areas/${area}.json`, Buffer.from(JSON.stringify(records.get(area), null, 2) + '\n'));
    // Only the area's outputs and record outlive it; its parsed chunks are released (see releaseChunkCaches).
    releaseChunkCaches();
  }
  return withLock(async () => {
    const previous = new Map();
    for (const area of areaOrder) {
      try { previous.set(area, JSON.parse(await fs.readFile(path.join(areasDir, `${area}.json`), 'utf8'))); } catch {}
    }
    for (const area of ported) {
      if (records.has(area)) continue;
      // A ported area not selected by --only that has never written its area file (a round 2 unit still porting it,
      // in parallel with this one) stays pending; a full run (no --only) generates every ported area.
      if (!previous.has(area)) continue;
      records.set(area, previous.get(area));
    }
    const present = areaOrder.filter(area => records.has(area));
    const adapters = present.flatMap(area => records.get(area).adapters);
    const owner = new Map();
    for (const area of present) for (const entry of records.get(area).adapters) {
      if (owner.has(entry.name)) throw Error(`Adapter ${entry.name} is emitted by both ${owner.get(entry.name)} and ${area}`);
      if (entry.referenceVersion !== referenceVersion) throw Error(`${area}/${entry.name} is ${entry.referenceVersion}, not ${referenceVersion}`);
      owner.set(entry.name, area);
    }
    const cdsCoreOverlap = [];
    for (const entry of adapters) for (const b of entry.bindings) {
      const key = `${b.file}#${b.name}`;
      if (cdsHeld.has(key)) cdsCoreOverlap.push({ binding: key, adapter: entry.name, cdsCoreModule: cdsHeld.get(key) });
    }
    const manifest = {
      referenceVersion,
      referenceSnapshot,
      generator: 'scripts/extract-code-editor-v4.mjs',
      sharedGraph: 'cds-core',
      cdsCoreManifestSha256,
      areas: present,
      pendingAreas: areaOrder.filter(area => !present.includes(area)),
      identicalChunks,
      // modules[]: target + referenceVersion (tests/i18n-coverage-v3.test.mjs shape) plus the official bindings each
      // adapter copies, the form the D1 gate reads (`electron: true` = main-process realm).
      modules: adapters.map(entry => ({
        name: entry.name, target: entry.name, referenceVersion: entry.referenceVersion,
        ...(entry.realm === 'main' ? { electron: true } : {}),
        sources: entry.sources.map(ref => ref.name),
        bindings: entry.bindings.map(b => ({ name: b.name, file: b.file, sha256: b.sha256 })),
      })),
      adapters,
      copyTargets: present.flatMap(area => records.get(area).copyTargets),
      // Module state this graph holds the only copy of (D1 gate justifications; a second holder still fails the gate).
      ownedStateReasons: Object.fromEntries(adapters.flatMap(entry => Object.entries(entry.ownedState ?? {}).map(([key, why]) => [key, `${entry.name}: ${why}`]))),
      cdsCoreOverlap,
    };
    files.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));

    const problems = [];
    for (const [name, bytes] of files) {
      const file = path.join(output, name);
      if (check) {
        let current = null;
        try { current = await fs.readFile(file); } catch {}
        if (!current || !current.equals(bytes)) problems.push(`changed: ${path.relative(root, file)}`);
      } else {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, bytes);
      }
    }
    // Stale files: anything in the output (and areas/) that no present area owns.
    const owned = new Set(['manifest.json', ...adapters.map(entry => entry.name), ...present.map(area => `areas/${area}.json`)]);
    const stale = [];
    for (const entry of await fs.readdir(output, { withFileTypes: true }).catch(() => [])) {
      if (entry.isDirectory() && entry.name === 'areas') {
        for (const inner of await fs.readdir(areasDir)) if (!owned.has(`areas/${inner}`)) stale.push(`areas/${inner}`);
      } else if (!owned.has(entry.name)) stale.push(entry.name);
    }
    stale.sort();
    const full = selected.length === ported.length;
    const dropped = new Set(selected.flatMap(area => (previous.get(area)?.adapters ?? []).map(entry => entry.name)));
    const removable = full ? stale : stale.filter(name => dropped.has(name));
    if (check) {
      if (stale.length) problems.push(`stale: ${stale.join(', ')}`);
      if (problems.length) throw Error(`Code editor v4 output differs from the generator:\n  ${problems.join('\n  ')}`);
    } else {
      for (const name of removable) await fs.rm(path.join(output, name), { recursive: true, force: true });
      if (removable.length < stale.length) console.log(`Left ${stale.length - removable.length} files no selected area owned (${stale.filter(name => !removable.includes(name)).join(', ')}); a full run removes them.`);
    }
    console.log(`${check ? 'Verified' : 'Extracted'} ${adapters.length} source-derived code-editor-v4 adapters (${present.join(', ')}${manifest.pendingAreas.length ? `; pending ${manifest.pendingAreas.join(', ')}` : ''}; `
      + `${selected.length === ported.length ? 'all ported areas' : 'selected ' + selected.join(', ')}; ${manifest.copyTargets.length} production copy targets not written)`
      + `${!check && removable.length ? `; removed ${removable.length} stale files` : ''}.`);
    return manifest;
  });
}

function parseOnly(argv) {
  const index = argv.findIndex(arg => arg === '--only' || arg.startsWith('--only='));
  if (index < 0) return undefined;
  const value = argv[index].includes('=') ? argv[index].slice('--only='.length) : argv[index + 1];
  if (!value || value.startsWith('--')) throw Error('--only needs a comma-separated list of areas');
  return value.split(',').map(area => area.trim()).filter(Boolean);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCodeEditorV4({ check: process.argv.includes('--check'), only: parseOnly(process.argv.slice(2)) });
