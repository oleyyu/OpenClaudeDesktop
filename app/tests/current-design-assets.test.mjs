import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import {designVersion,designSnapshot,designStylesheets,designEntryStylesheets,designIconModule,legacyRegionStylesheets,legacyGlobalStylesheets,designLegacySnapshot} from '../scripts/current-design-assets.mjs';
import {prepareStyleCompatibility,selectorClasses} from '../scripts/prepare-style-compatibility.mjs';

const app = new URL('../',import.meta.url);
const reference = new URL(`../../reference/${designSnapshot}/ion-dist/assets/v1/`,import.meta.url);
const legacyReference = new URL(`../../reference/${designLegacySnapshot}/ion-dist/assets/v1/`,import.meta.url);
const read = url => fs.readFile(url,'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');

test('loaded entry sheets are the pinned latest original bytes except relative asset URLs',async()=>{
  const html = await read(new URL('index.html',app));
  const provenance = JSON.parse(await read(new URL('public/ui-provenance.json',app)));
  assert.equal(provenance.designVersion,designVersion);
  // 4.16336.0: only the official index.html's three entry sheets are global; component sheets load with their owners.
  for(const name of designStylesheets.filter(n=>!designEntryStylesheets.includes(n)))assert.ok(!html.includes(`/assets/v1/${name}`),name+' is a component sheet');
  for(const name of designEntryStylesheets){
    const source = await read(new URL(name,reference));
    const output = await read(new URL('public/assets/v1/'+name,app));
    assert.equal(output,source.replaceAll('/assets/v1/','./'),name);
    assert.ok(html.includes(`/assets/v1/${name}`),name+' is loaded');
    const record=provenance.files.find(f=>f.output==='public/assets/v1/'+name);
    assert.equal(record.sourceSha256,sha(source));
    for(const match of source.matchAll(/url\(["']?\/assets\/v1\/([^\s)"']+)/g)){
      assert.deepEqual(await fs.readFile(new URL('public/assets/v1/'+match[1],app)),await fs.readFile(new URL(match[1],reference)));
    }
  }
  assert.doesNotMatch(html,/CNGsCU46|C6yuIsHz|CivZuY3L|Bw3E3o9_|CegduNQ2|D_GJawPO|Che1orl5/);
});

test('icon glyph map comes from the same snapshot as the loaded font',async()=>{
  const source=await read(new URL(designIconModule,reference));
  const block=source.match(/icons:\{(Activity:57344,[^}]+)\},(?:secondary|next):/)[1];
  const expected=Object.fromEntries([...block.matchAll(/([A-Za-z][A-Za-z0-9]*):(\d+)/g)].map(m=>[m[1],Number(m[2])]));
  assert.equal(Object.keys(expected).length,412);
  assert.deepEqual(JSON.parse(await read(new URL('src/generated/icons.json',app))),expected);
});

test('migration compatibility preserves source slices only for absent utilities and remains separately loaded',async()=>{
  const manifest=await prepareStyleCompatibility({check:true});
  const css=await read(new URL('public/'+manifest.output,app));
  const baselines=new Map();
  for(const b of manifest.baselines){const text=await read(new URL('../../reference/'+b.source,import.meta.url));assert.equal(sha(text),b.sha256,b.source);baselines.set(b.source,text);}
  assert.deepEqual(manifest.baselines.map(b=>b.version),['3.6556.2','2.42304.0','2.37337.1']);
  const current=new Set();
  for(const name of designStylesheets)postcss.parse(await read(new URL(name,reference))).walkRules(r=>selectorClasses(r.selector).forEach(c=>current.add(c)));
  const ast=postcss.parse(css);
  // The count only falls as owning modules migrate (it may reach zero); see style-compatibility-scan.test.mjs.
  // 3.6556.2 pin (2026-10-25): 186 rules, 178 of them 2.42304.0 utilities that 3.6556.2 purged.
  // 4.16336.0 pin (2026-11-04): 118 3.6556.2 utilities 4.16336.0 dropped, held by regions/host code still on 3.6556.2.
  assert.ok(manifest.rules.length>=0 && manifest.rules.length<200);
  assert.equal(manifest.scanner.mode,'class-token');
  assert.ok(ast.nodes.every(n=>n.type==='comment'||n.type==='atrule'&&n.name==='layer'&&['utilities','theme'].includes(n.params)));
  for(const rule of manifest.rules){
    assert.ok(rule.references.length>0);
    assert.ok(rule.references.every(r=>r.hits.length>0&&!current.has(r.className)));
    for(const hit of rule.references.flatMap(r=>r.hits)){
      // Every hit names its owner: host source, or the extract-*.mjs (and source version) that wrote it.
      assert.equal(typeof hit.reachable,'boolean');
      if(hit.file.startsWith('src/generated/')){
        assert.match(hit.generator,/^scripts\/extract-.+\.mjs$/,hit.file);
        await fs.access(new URL(hit.generator,app));
        assert.match(hit.sourceVersion,/^\d+(?:\.\d+)+$/,hit.file);
      }else assert.deepEqual([hit.generator,hit.sourceVersion],['host',null],hit.file);
    }
    // No retained class is held only by a withheld (metadata/registry) position.
    for(const ref of rule.references)assert.ok(ref.hits.some(hit=>!manifest.scanner.exclusions.some(group=>group.file===hit.file&&group.binding===hit.binding&&group.suppressed.includes(ref.className))),ref.className);
    // A class is retained from the newest baseline that ships it, never from two.
    const source=baselines.get(rule.baseline);
    assert.ok(source,rule.baseline);
    const fragment=source.slice(rule.start,rule.end);
    assert.doesNotThrow(()=>postcss.parse(fragment));
    assert.equal(sha(fragment),rule.sha256);
    assert.ok(css.includes(fragment));
  }
  assert.equal(sha(css),manifest.outputSha256);
  const html=await read(new URL('index.html',app));
  assert.ok(html.indexOf('/assets/legacy-utilities.css')>html.indexOf('/assets/v1/c3fde7009-'));
  // .cds-root may only appear as the dark variant's scope inside a utility selector (2.42304.0 dark:* rules), and
  // [data-cds=DataTable] only inside the 3.6556.2 arbitrary variant `[&>:not([role=group]):not([data-cds=DataTable])…]:py-md`
  // (the utility's own selector, not a DataTable component rule).
  assert.doesNotMatch(css.replaceAll(':where(.cds-root,.cds-root *)','').replaceAll('>:not([role=group]):not([data-cds=DataTable]):not([role=treegrid]):not([data-settle-slot]){',''),/data-cds=DataTable|\.cds-root|\.df-app-switch/);
});

test('CSS class extraction handles escaped punctuation, variants and numeric escapes',()=>{
  assert.deepEqual(selectorClasses('.foo\\:bar:hover .my-\\[\\.5em\\] .\\32 xl\\:p-2'),['foo:bar','my-[.5em]','2xl:p-2']);
});

test('every sheet a generated lazy chunk preloads is shipped (target original, or declared 3.6556.2 legacy-region copy) and left unlinked', async () => {
  const generated = new URL('src/generated/', app);
  const lazy = new Set();
  for (const file of (await fs.readdir(generated, { recursive: true })).filter((f) => /\.m?js$/.test(f)))
    for (const m of (await read(new URL(file, generated))).matchAll(/"assets\/v1\/([\w-]+\.css)"/g)) if (!designEntryStylesheets.includes(m[1])) lazy.add(m[1]);
  assert.ok(lazy.has('c19e90103-CuNz46ca.css'), '3.6556.2 inline diff preloads the markdown sheet');
  const html = await read(new URL('index.html', app));
  const provenance = JSON.parse(await read(new URL('public/ui-provenance.json', app)));
  for (const name of lazy) {
    const legacy = legacyRegionStylesheets[name];
    const source = await read(new URL(name, legacy ? legacyReference : reference));
    assert.equal(await read(new URL('public/assets/v1/' + name, app)), source.replaceAll('/assets/v1/', './'), name);
    assert.equal(html.includes(`/assets/v1/${name}`), legacyGlobalStylesheets.includes(name), `${name} loads on demand unless declared global`);
    const record = provenance.files.find((f) => f.output === 'public/assets/v1/' + name);
    assert.match(record?.loading, /lazy \(vitePreload\)/, name);
    assert.equal(record.referenceVersion, legacy ? '3.6556.2' : designVersion, name);
    if (legacy) assert.deepEqual(record.legacyRegion, [...legacy.regions], name);
  }
});
