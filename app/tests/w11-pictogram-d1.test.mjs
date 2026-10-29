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

test('view-tabs publishes KG and nk; their only copies in src/generated are the view-tabs ones', () => {
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
  const copies = [];
  const walk = dir => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel); else if (/\.(m?js|cjs)$/.test(e.name)) {
      const text = read(rel);
      if (/"data-cds": ?"Pictogram"/.test(text)) copies.push(`Pictogram ${rel}`);
      if (/"data-cds": ?"TextArea"/.test(text)) copies.push(`TextArea ${rel}`);
    }
  } };
  walk('src/generated');
  assert.deepEqual(copies.sort(), ['Pictogram src/generated/view-tabs/shared-156-BLTosN8U.js', 'TextArea src/generated/view-tabs/shared-frame-6jtSkIit.js']);
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
