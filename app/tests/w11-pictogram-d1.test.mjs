import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

// w11-pictogram-d1 (D1): the CDS Pictogram (3.6556.2 shared-156 KG, export Hr) and TextArea (shared-frame nk, export
// da) are sliced once, by view-tabs (CdsPictogram / CdsTextArea). cowork-scheduled re-exports them (Pictogram /
// CdsTextArea), code-routines imports them, and SourcePictogram renders CdsPictogram with every KG prop
// (highlightFill, alt, asset.clip, style). SSR in middleware mode only; official chunks are read as text, never run.
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const official = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
const html = (type, props) => renderToStaticMarkup(React.createElement(type, props));
let server, tabs156, tabsFrame, cowork, picto, handBlocks, defs;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  tabs156 = await server.ssrLoadModule('/src/generated/view-tabs/shared-156-BLTosN8U.js');
  tabsFrame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  cowork = await server.ssrLoadModule('/src/generated/cowork-scheduled/index.mjs');
  picto = await server.ssrLoadModule('/src/source-pictogram.jsx');
  defs = await server.ssrLoadModule('/src/pictogram-defs.mjs');
  ({ e: handBlocks } = await server.ssrLoadModule('/src/generated/chat/cbcaf521a-CrWJ5SHy.js'));
});
after(() => server?.close());

test('view-tabs publishes KG and nk; per reference version, the only copies in src/generated are the shared graph owner ones', () => {
  const manifest = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(manifest.publicNames.CdsPictogram, { file: 'shared-156-BLTosN8U.js', local: 'KG', export: 'Hr' });
  assert.deepEqual(manifest.publicNames.CdsTextArea, { file: 'shared-frame-6jtSkIit.js', local: 'nk', export: 'da' });
  const facade = read('src/generated/view-tabs/index.js');
  assert.match(facade, /export \{[^}]*\bCdsPictogram\b[^}]*\} from "\.\/shared-156-BLTosN8U\.js";/);
  assert.match(facade, /export \{[^}]*\bCdsTextArea\b[^}]*\} from "\.\/shared-frame-6jtSkIit\.js";/);
  // KG's top-level property write is copied with it (shared-frame gO tells pictograms from icons by it).
  const s156 = read('src/generated/view-tabs/shared-156-BLTosN8U.js');
  assert.equal(s156.split('\nKG.isCdsPictogram=!0;\n').length, 2);
  assert.equal(official('shared-156-BLTosN8U.js').split('KG.isCdsPictogram=!0;').length, 2);
  // Single copy per reference version (cds-integrate/fix.md): each generated module is attributed to the version its
  // area manifest records (modules[].referenceVersion, else the area's). 3.6556.2 copies may live only in view-tabs, the
  // 3.6556.2 shared graph (runSlicer sharedGraph undefined); 4.16336.0 copies only in cds-core, the 4.16336.0 shared graph
  // (its own manifest: sharedGraph null with publicNames, imported by consumers as sharedGraph: 'cds-core').
  const versionOf = new Map();
  const versionFor = rel => {
    const area = /^src\/generated\/([^/]+)\/(.+)$/.exec(rel.split(path.sep).join('/'));
    if (!area) return null;
    if (!versionOf.has(area[1])) {
      const file = path.join(root, 'src/generated', area[1], 'manifest.json');
      const m = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      versionOf.set(area[1], { top: m?.referenceVersion ?? null,
        files: new Map((Array.isArray(m?.modules) ? m.modules : []).filter(x => x.target).map(x => [x.target, x.referenceVersion ?? m.referenceVersion])) });
    }
    const v = versionOf.get(area[1]);
    return v.files.get(area[2]) ?? v.top;
  };
  const copies = [];
  const walk = dir => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel); else if (/\.(m?js|cjs)$/.test(e.name)) {
      const text = read(rel);
      if (/"data-cds": ?"Pictogram"/.test(text)) copies.push(`${versionFor(rel)} Pictogram ${rel}`);
      if (/"data-cds": ?"TextArea"/.test(text)) copies.push(`${versionFor(rel)} TextArea ${rel}`);
    }
  } };
  walk('src/generated');
  assert.deepEqual(copies.sort(), [
    '3.6556.2 Pictogram src/generated/view-tabs/shared-156-BLTosN8U.js',
    '3.6556.2 TextArea src/generated/view-tabs/shared-frame-6jtSkIit.js',
    '4.16336.0 Pictogram src/generated/cds-core/shared-183.mjs',
    '4.16336.0 TextArea src/generated/cds-core/shared-frame.mjs',
  ]);
  // Wave 3 (cds-integrate/merge-pins-wave3.mjs): the stateful 4.16336.0 components cds-core gained are single copies too;
  // a 4.16336.0 area must link them through sharedGraph 'cds-core', never slice a second one.
  const wave3 = [];
  const scan = dir => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) scan(rel); else if (/\.(m?js|cjs)$/.test(e.name) && versionFor(rel) === '4.16336.0') {
      const text = read(rel);
      for (const kind of ['Switch', 'InfoTip', 'PreviewCard', 'Separator', 'SkeletonGroup', 'Spark'])
        if (new RegExp(`"data-cds": ?"${kind}"`).test(text)) wave3.push(`${kind} ${rel}`);
      if (text.includes('"data-vtb-id"')) wave3.push(`ViewTabBar ${rel}`);
    }
  } };
  scan('src/generated');
  assert.deepEqual(wave3.sort(), [
    'InfoTip src/generated/cds-core/shared-frame.mjs',
    'PreviewCard src/generated/cds-core/shared-183.mjs',
    'Separator src/generated/cds-core/c04b2e418.mjs',
    'SkeletonGroup src/generated/cds-core/shared-frame.mjs',
    'Spark src/generated/cds-core/shared-frame.mjs',
    'Switch src/generated/cds-core/shared-frame.mjs',
    'ViewTabBar src/generated/cds-core/cfe7c4b3b.mjs',
  ]);
  // The owners' roles: view-tabs is the 3.6556.2 graph, cds-core the 4.16336.0 graph that owns its own Contexts.
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(Object.hasOwn(manifest, 'sharedGraph'), false);
  const core = JSON.parse(read('src/generated/cds-core/manifest.json'));
  assert.equal(core.referenceVersion, '4.16336.0');
  assert.equal(core.sharedGraph, null);
  assert.deepEqual(core.publicNames.CdsTextAreaField, { file: 'shared-frame-CJdE5Ria.js', local: 'RI', target: 'shared-frame.mjs', exportName: 'CdsTextAreaField' });
  // Wave 2 (cds-integrate/merge-pins-wave2.mjs): the 4.16336.0 Pictogram (shared-183 Zq, export Dr) and bare TextArea
  // (shared-frame oN, export Va) are cds-core public names; Zq's property write is carried with it, once.
  assert.deepEqual(core.publicNames.CdsPictogram, { file: 'shared-183-B2N6Zy4J.js', local: 'Zq', target: 'shared-183.mjs', exportName: 'CdsPictogram' });
  assert.deepEqual(core.publicNames.CdsTextArea, { file: 'shared-frame-CJdE5Ria.js', local: 'oN', target: 'shared-frame.mjs', exportName: 'CdsTextArea' });
  assert.equal(read('src/generated/cds-core/shared-183.mjs').split('\nZq.isCdsPictogram = !0;\n').length, 2);
  // No two owners per version and kind.
  const owners = new Map();
  for (const copy of copies) { const [version, kind, rel] = copy.split(' '); const key = `${version} ${kind}`;
    assert.equal(owners.has(key), false, `second ${key} copy: ${rel} (first ${owners.get(key)})`); owners.set(key, rel); }
});

test('cowork-scheduled and code-routines import the view-tabs bindings by semantic name', () => {
  const index = read('src/generated/cowork-scheduled/index.mjs');
  assert.ok(index.includes('export { CdsPictogram as Pictogram } from "../view-tabs/shared-156-BLTosN8U.js";'));
  // The prettier form groups the shared-frame re-exports into one (possibly multi-line) export block.
  assert.match(index, /CdsTextArea as CdsTextArea,?[\s\S]*?\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js"/);
  assert.equal(cowork.Pictogram, tabs156.CdsPictogram);
  assert.equal(cowork.CdsTextArea, tabsFrame.CdsTextArea);
  assert.equal(tabs156.CdsPictogram.isCdsPictogram, true);
  const routines = fs.readdirSync(path.join(root, 'src/generated/code-routines')).filter(n => n.endsWith('.mjs')).map(n => read(`src/generated/code-routines/${n}`)).join('\n');
  assert.match(routines, /import \{ CdsPictogram as \w+ \} from "\.\.\/view-tabs\/shared-156-BLTosN8U\.js";/);
  assert.match(routines, /CdsTextArea as \w+,[\s\S]*?\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.doesNotMatch(routines, /\bfunction KG\(e\) \{\s*let \$ = J9\(23\)/);
});

test('SourcePictogram renders view-tabs CdsPictogram (concrete file, E41), no hand-written svg', () => {
  const source = read('src/source-pictogram.jsx');
  assert.ok(source.includes('import { CdsPictogram } from "./generated/view-tabs/shared-156-BLTosN8U.js";'));
  assert.doesNotMatch(source, /generated\/view-tabs\/index\.js|<svg|<path|data-pictogram=/);
  assert.deepEqual(picto.PICTOGRAM_SIZES, { sm: 64, md: 96 });
  assert.ok(official('shared-156-BLTosN8U.js').includes('BG={sm:64,md:96}'));
});

test('SourcePictogram equals CdsPictogram for every bundled def and KG prop', () => {
  const assets = { HandBlocks: handBlocks, ...Object.fromEntries(Object.entries(defs).filter(([, v]) => v && v.highlight)) };
  const cases = [{}, { size: 'sm' }, { size: 80, className: 'text-primary' }, { highlightFill: 'cactus' }, { highlightFill: 'heather' },
    { highlightFill: 'peach' }, { alt: 'Building blocks' }, { style: { opacity: 0.5 } }, { 'data-x': '1', id: 'p' }];
  for (const [name, asset] of Object.entries(assets)) for (const props of cases)
    assert.equal(html(picto.SourcePictogram, { name, ...props }), html(tabs156.CdsPictogram, { asset, ...props }), `${name} ${JSON.stringify(props)}`);
  assert.equal(html(picto.SourcePictogram, { name: 'Missing' }), '');
});

test('KG props through SourcePictogram: VG fills, WG alt, HG style merge, asset.clip', () => {
  const official156 = official('shared-156-BLTosN8U.js');
  assert.ok(official156.includes('VG={default:"fill-pictogram-highlight-default",heather:"fill-pictogram-highlight-heather",cactus:"fill-pictogram-highlight-cactus"},HG={flexShrink:0}'));
  assert.ok(official156.includes('function WG(e,t){return{role:t.role??(e?"img":void 0),"aria-hidden":t["aria-hidden"]??(!e||void 0),"aria-label":t["aria-label"]??(e||void 0)}}'));
  assert.ok(official156.includes('h=J1($,10,o)?K1($,10,o,o?{...HG,...o}:HG):$[11]'));
  assert.ok(official156.includes('_("g",{clipPath:`url(#${d})`,children:m}),_("defs",{children:_("clipPath",{id:d,children:_("path",{d:t.clip})})})'));
  const def = handBlocks;
  assert.match(html(picto.SourcePictogram, { name: 'HandBlocks' }),
    /^<svg data-cds="Pictogram" width="96" height="96" viewBox="0 0 500 500" fill="none" xmlns="http:\/\/www\.w3\.org\/2000\/svg" style="flex-shrink:0" aria-hidden="true">/);
  const cactus = html(picto.SourcePictogram, { name: 'HandBlocks', highlightFill: 'cactus' });
  assert.ok(cactus.includes(`<path d="${def.highlight[0]}" class="fill-pictogram-highlight-cactus"></path>`));
  assert.ok(html(picto.SourcePictogram, { name: 'HandBlocks', highlightFill: 'peach' }).includes('class="fill-pictogram-highlight-default"'));
  const alt = html(picto.SourcePictogram, { name: 'HandBlocks', alt: 'Building blocks' });
  assert.match(alt, /^<svg [^>]*style="flex-shrink:0" role="img" aria-label="Building blocks">/);
  assert.doesNotMatch(alt, /aria-hidden/);
  assert.match(html(picto.SourcePictogram, { name: 'HandBlocks', style: { opacity: 0.5 } }), /^<svg [^>]*style="flex-shrink:0;opacity:0\.5"/);
  const clipped = html(picto.SourcePictogram, { asset: { ...def, clip: 'M0 0h500v500H0z' } });
  const id = /<g clip-path="url\(#([^)]+)\)">/.exec(clipped)?.[1];
  assert.ok(id, clipped.slice(0, 300));
  assert.ok(clipped.endsWith(`</g><defs><clipPath id="${id}"><path d="M0 0h500v500H0z"></path></clipPath></defs></svg>`));
  assert.doesNotMatch(html(picto.SourcePictogram, { name: 'HandBlocks' }), /clip-path|<defs>/);
});
