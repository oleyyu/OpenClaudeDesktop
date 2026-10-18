// R1 SC-0: the style-compatibility scanner matches exact class tokens from string
// literals, template fragments and CSS selectors; comments, design-token metadata and
// tailwind-merge registries never keep a prior-snapshot utility alive.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {scanClassTokens, buildClassIndex, moduleReachability} from '../scripts/prepare-style-compatibility.mjs';

const tokens = (file, text) => scanClassTokens(file, text).tokens.map(hit => hit.token);
const has = (file, text, token) => tokens(file, text).includes(token);
const index = sources => buildClassIndex(sources.map(([file, text]) => ({file, text})));
const bindingsOf = (result, token) => Object.fromEntries([...(result.index.get(token) ?? new Map())].map(([file, set]) => [file, [...set].sort()]));

test('a class name inside a longer token is not a reference (substring false positives)', () => {
  assert.equal(has('a.jsx', 'const B = <span className="-ml-0.5 inline-flex" />;', '-ml-0'), false);
  assert.equal(has('a.jsx', 'const B = <span className="-ml-0.5 inline-flex" />;', '-ml-0.5'), true);
  assert.equal(has('a.js', 'const t="-translate-y-1/2 sm:pr-8 md:min-h-[5.5rem] comfortable:!pl-2.5";', 'translate-y-1'), false);
  for (const name of ['pr-8', 'h-[5.5rem]', '!pl-2.5']) assert.equal(has('a.js', 'const t="-translate-y-1/2 sm:pr-8 md:min-h-[5.5rem] comfortable:!pl-2.5";', name), false, name);
  // CSS custom-property names inside var() are not utility classes.
  assert.equal(has('a.js', 'const z="var(--cds-z-toast)";', 'z-toast'), false);
});

test('JS and CSS comments are not references', () => {
  const js = '/* -mr-6 pr-md */\n// group-disabled/btn:text-disabled\nexport const x = 1;';
  assert.deepEqual(tokens('a.jsx', js), []);
  assert.equal(has('a.css', '/* .-ml-1 { } -mr-1.5 */ .foo { color: red; }', '-ml-1'), false);
  assert.equal(has('a.css', '/* .-ml-1 { } */ .foo { color: red; }', 'foo'), true);
});

test('JS operators and identifiers are not class tokens', () => {
  const js = 'export function f(t,e){ if(!table) return e.inline!=t; return {inline: !t}; }';
  for (const name of ['!table', 'inline!', 'inline', 'table']) assert.equal(has('a.js', js, name), false, name);
});

test('JSX attributes, conditional strings, quoted object keys and CSS selectors are references', () => {
  const jsx = 'export function SkillDetail(){ return <div className="cz-skill-head py-3 -me-6 pe-md" />; }';
  assert.deepEqual(scanClassTokens('a.jsx', jsx).tokens.filter(hit => hit.token === '-me-6'), [{token:'-me-6', binding:'SkillDetail'}]);
  assert.equal(has('a.js', 'const c=x?"pe-[22px]":"pe-md";', 'pe-[22px]'), true);
  assert.equal(has('a.js', 'const c=cn({"-mr-6": open, flex: true});', '-mr-6'), true);
  const css = scanClassTokens('a.css', '@media (min-width:1px){ .foo .-ml-1:hover, .\\[\\&\\+li\\]\\:border-t-0 + li { color: red; } }').tokens;
  assert.deepEqual(css.map(hit => hit.token), ['foo', '-ml-1', '[&+li]:border-t-0']);
  assert.match(css[1].binding, /^css:\.foo \.-ml-1:hover/);
});

test('template fragments are split on whitespace; a fragment glued to an expression is not a whole class', () => {
  const js = 'const a=`${x} -me-1 ${y}`, b=`pl-${n} gap-1`, c=`text-${k}`;';
  assert.equal(has('a.js', js, '-me-1'), true);
  assert.equal(has('a.js', js, 'gap-1'), true);
  // Neither the old substring scan nor Tailwind's own scanner can see `pl-${n}` as pl-0; the token scan
  // keeps that behaviour (the open fragment "pl-" is not a class name of its own).
  assert.equal(has('a.js', js, 'pl-0'), false);
  const hits = scanClassTokens('a.js', js).tokens;
  assert.deepEqual(hits.filter(hit => hit.token === '-me-1').map(hit => hit.binding), ['a']);
  assert.deepEqual(hits.filter(hit => hit.token === 'gap-1').map(hit => hit.binding), ['b']);
});

test('hits are attributed to the declarator of a minified multi-binding statement', () => {
  const js = 'var a="flex",b=1,c=[{edges:{n:!0},className:"-top-[3px] left-[8px] right-[8px] h-[6px]"}];export{c as handles};';
  const result = scanClassTokens('g.js', js);
  assert.deepEqual([...new Set(result.tokens.filter(hit => hit.token === 'left-[8px]').map(hit => hit.binding))], ['c']);
  assert.deepEqual(result.tokens.filter(hit => hit.token === 'flex').map(hit => hit.binding), ['a']);
});

test('module specifiers are imports, not class tokens', () => {
  const js = 'import x from "./pl-0.js"; export * from "./mr-3.js"; const y = import("./ml-md.js"); const w = new URL("./worker.mjs", import.meta.url);';
  const result = scanClassTokens('a.js', js);
  assert.deepEqual(result.tokens.map(hit => hit.token), []);
  assert.deepEqual(result.imports, [
    {specifier:'./pl-0.js', kind:'static'}, {specifier:'./mr-3.js', kind:'static'},
    {specifier:'./ml-md.js', kind:'dynamic'}, {specifier:'./worker.mjs', kind:'url'},
  ]);
  assert.equal(result.nonLiteralImport, false);
  assert.equal(scanClassTokens('a.js', 'const m = import(name);').nonLiteralImport, true);
  assert.equal(scanClassTokens('a.js', 'const m = import(`./x/${name}.js`);').nonLiteralImport, true);
  assert.equal(scanClassTokens('a.js', 'const m = import.meta.glob("./pages/*.jsx");').nonLiteralImport, true);
});

test('CDS design-token records ({__name, cssVar, ...}) are withheld and audited, other __name keys are not', () => {
  const table = 'const O={fill:{pro:{cssVar:"var(--cds-fill-pro)",value:"#000",__name:"fill-pro",type:"color"}},z:{toast:{cssVar:"var(--cds-z-toast)",value:60,__name:"z-toast",type:"number"}}};';
  const result = index([['src/generated/x/tokens.mjs', table]]);
  assert.equal(result.index.has('fill-pro'), false);
  assert.equal(result.index.has('z-toast'), false);
  const names = result.exclusions.find(group => group.key === '__name');
  assert.deepEqual({...names, tokens:[...names.tokens].sort()},
    {file:'src/generated/x/tokens.mjs', binding:'O', key:'__name', reason:'design-token-metadata', tokens:['fill-pro', 'z-toast']});
  assert.ok(result.exclusions.some(group => group.key === 'cssVar' && group.reason === 'design-token-metadata'));
  // Only the record shape is metadata: a lone __name value is still a class reference.
  assert.deepEqual(bindingsOf(index([['src/a.mjs', 'const L={__name:"fill-pro"};']]), 'fill-pro'), {'src/a.mjs':['L']});
});

test('a read of __name voids that exclusion tree-wide and is reported', () => {
  const table = 'export const O={pro:{cssVar:"var(--cds-fill-pro)",value:"#000",__name:"fill-pro",type:"color"}};';
  const result = index([['src/generated/x/tokens.mjs', table], ['src/use.jsx', 'import {O} from "./generated/x/tokens.mjs"; export const C=()=> <i className={O.pro.__name}/>;']]);
  assert.deepEqual(bindingsOf(result, 'fill-pro'), {'src/generated/x/tokens.mjs':['O']});
  assert.equal(result.exclusions.some(group => group.key === '__name'), false);
  assert.match(result.warnings.join('\n'), /__name is read/);
});

test('tailwind-merge registries ({classGroups, conflictingClassGroups}) are withheld and audited', () => {
  const config = 'const Lt=()=>({cacheSize:500,theme:{},classGroups:{isolation:["isolate","isolation-auto"],display:["block","inline-table"]},conflictingClassGroups:{"font-size":["leading"]},conflictingClassGroupModifiers:{leading:["font-size"]}});';
  const result = index([['src/generated/v/vendor-frame.js', config]]);
  assert.equal(result.index.has('isolation-auto'), false);
  assert.equal(result.index.has('inline-table'), false);
  const groups = result.exclusions.filter(group => group.reason === 'tailwind-merge-registry');
  assert.deepEqual(groups.map(group => [group.binding, group.key]).sort(), [['Lt', 'classGroups'], ['Lt', 'conflictingClassGroupModifiers'], ['Lt', 'conflictingClassGroups']]);
  assert.ok(groups.find(group => group.key === 'classGroups').tokens.has('isolation-auto'));
  // A classGroups key without the registry shape is an ordinary object.
  assert.deepEqual(bindingsOf(index([['src/a.mjs', 'const g={classGroups:{isolation:["isolation-auto"]}};']]), 'isolation-auto'), {'src/a.mjs':['g']});
});

test('index.html reachability covers main.jsx and records whether the import graph is complete', async () => {
  const result = await moduleReachability([]);
  assert.deepEqual(result.entries, ['/src/main.jsx']);
  assert.ok(result.reachable.has('src/main.jsx'));
  assert.equal(typeof result.complete, 'boolean');
});

test('the published manifest names a real token reference for every retained hit', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../public/style-compatibility.json', import.meta.url), 'utf8'));
  assert.equal(manifest.scanner.mode, 'class-token');
  const scans = new Map();
  for (const rule of manifest.rules) for (const reference of rule.references) for (const hit of reference.hits) {
    if (!scans.has(hit.file)) scans.set(hit.file, scanClassTokens(hit.file, await fs.readFile(new URL('../' + hit.file, import.meta.url), 'utf8')));
    const scan = scans.get(hit.file);
    assert.ok(scan.tokens.some(t => t.token === reference.className && t.binding === hit.binding), `${reference.className} @ ${hit.file}#${hit.binding}`);
  }
  for (const group of manifest.scanner.exclusions) assert.ok(['design-token-metadata', 'tailwind-merge-registry'].includes(group.reason));
});
