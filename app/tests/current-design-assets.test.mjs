import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import {designVersion,designSnapshot,designStylesheets,designIconModule} from '../scripts/current-design-assets.mjs';
import {prepareStyleCompatibility,selectorClasses} from '../scripts/prepare-style-compatibility.mjs';

const app = new URL('../',import.meta.url);
const reference = new URL(`../../reference/${designSnapshot}/ion-dist/assets/v1/`,import.meta.url);
const read = url => fs.readFile(url,'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');

test('loaded design sheets are the pinned latest original bytes except relative asset URLs',async()=>{
  const html = await read(new URL('index.html',app));
  const provenance = JSON.parse(await read(new URL('public/ui-provenance.json',app)));
  assert.equal(provenance.designVersion,designVersion);
  for(const name of designStylesheets){
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
  assert.doesNotMatch(html,/CNGsCU46|C6yuIsHz|CivZuY3L|Bw3E3o9_/);
});

test('icon glyph map comes from the same snapshot as the loaded font',async()=>{
  const source=await read(new URL(designIconModule,reference));
  const block=source.match(/icons:\{(Activity:57344,[^}]+)\},(?:secondary|next):/)[1];
  const expected=Object.fromEntries([...block.matchAll(/([A-Za-z][A-Za-z0-9]*):(\d+)/g)].map(m=>[m[1],Number(m[2])]));
  assert.deepEqual(JSON.parse(await read(new URL('src/generated/icons.json',app))),expected);
});

test('migration compatibility preserves source slices only for absent utilities and remains separately loaded',async()=>{
  const manifest=await prepareStyleCompatibility({check:true});
  const css=await read(new URL('public/'+manifest.output,app));
  const source=await read(new URL('../../reference/'+manifest.baselineSource,import.meta.url));
  const original=postcss.parse(source), current=new Set();
  for(const name of designStylesheets)postcss.parse(await read(new URL(name,reference))).walkRules(r=>selectorClasses(r.selector).forEach(c=>current.add(c)));
  const ast=postcss.parse(css);
  // The count only falls as owning modules migrate (it may reach zero); see style-compatibility-scan.test.mjs.
  assert.ok(manifest.rules.length>=0 && manifest.rules.length<100);
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
    const fragment=source.slice(rule.start,rule.end);
    assert.doesNotThrow(()=>postcss.parse(fragment));
    assert.equal(sha(fragment),rule.sha256);
    assert.ok(css.includes(fragment));
  }
  assert.equal(sha(css),manifest.outputSha256);
  const html=await read(new URL('index.html',app));
  assert.ok(html.indexOf('/assets/legacy-utilities.css')>html.indexOf('/assets/v1/c3fde7009-'));
  assert.doesNotMatch(css,/data-cds=DataTable|\.cds-root|\.df-app-switch/);
});

test('CSS class extraction handles escaped punctuation, variants and numeric escapes',()=>{
  assert.deepEqual(selectorClasses('.foo\\:bar:hover .my-\\[\\.5em\\] .\\32 xl\\:p-2'),['foo:bar','my-[.5em]','2xl:p-2']);
});
