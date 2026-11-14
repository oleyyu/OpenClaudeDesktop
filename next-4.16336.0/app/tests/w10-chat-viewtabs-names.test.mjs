import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

// w10-chat-viewtabs-names: the Projects dialog TextArea and the host Pictogram move to 3.6556.2.
// - TextArea: shared-frame nk (export da). Pictogram: shared-156 KG (export Hr).
// - w11-pictogram-d1 (D1): both are now sliced once, by view-tabs (CdsTextArea / CdsPictogram); cowork-scheduled's
//   index re-exports them under its names (CdsTextArea / Pictogram) and SourcePictogram renders CdsPictogram itself
//   (tests/w11-pictogram-d1.test.mjs covers its other props). This file keeps the markup-equality checks.
// SSR in middleware mode only; official chunks are read as text, never executed.
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const official = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
let server, cowork, picto, defs, handBlocks;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  cowork = await server.ssrLoadModule('/src/generated/cowork-scheduled/index.mjs');
  picto = await server.ssrLoadModule('/src/source-pictogram.jsx');
  defs = await server.ssrLoadModule('/src/pictogram-defs.mjs');
  ({ e: handBlocks } = await server.ssrLoadModule('/src/generated/chat/cbcaf521a-CrWJ5SHy.js'));
});
after(() => server?.close());

test('nk and KG each have one 3.6556.2 slice: view-tabs CdsTextArea / CdsPictogram, re-exported by cowork-scheduled', () => {
  const manifest = JSON.parse(read('src/generated/cowork-scheduled/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.deepEqual(manifest.publicNames.CdsTextArea, { file: 'shared-frame-6jtSkIit.js', local: 'nk', viewTabs: 'CdsTextArea' });
  assert.deepEqual(manifest.publicNames.Pictogram, { file: 'shared-156-BLTosN8U.js', local: 'KG', viewTabs: 'CdsPictogram' });
  const index = read('src/generated/cowork-scheduled/index.mjs');
  // w12-viewtabs: the CDS Field parts are view-tabs names too, so the shared-frame re-exports share one statement.
  assert.match(index, /export \{[^}]*\bCdsTextArea as CdsTextArea,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.ok(index.includes('export { CdsPictogram as Pictogram } from "../view-tabs/shared-156-BLTosN8U.js";'));
  const tabs = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(tabs.publicNames.CdsTextArea, { file: 'shared-frame-6jtSkIit.js', local: 'nk', export: 'da' });
  assert.deepEqual(tabs.publicNames.CdsPictogram, { file: 'shared-156-BLTosN8U.js', local: 'KG', export: 'Hr' });
});

test('official 3.6556.2 text: nk is the TextArea with the XS invalid focus ring, KG the Pictogram with VG fills', () => {
  const frame = official('shared-frame-6jtSkIit.js');
  assert.match(frame, /\bnk as da\b/);
  assert.equal(frame.split('"data-cds":"TextArea"').length - 1, 1);
  assert.ok(frame.includes('XS="focus-visible:shadow-focus data-[invalid]:focus-visible:shadow-focus-danger"'));
  assert.ok(frame.includes('enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover ${XS} ${T}'));
  const s156 = official('shared-156-BLTosN8U.js');
  assert.match(s156, /\bKG as Hr\b/);
  assert.equal(s156.split('"data-cds":"Pictogram"').length - 1, 1);
  assert.ok(s156.includes('BG={sm:64,md:96},VG={default:"fill-pictogram-highlight-default",heather:"fill-pictogram-highlight-heather",cactus:"fill-pictogram-highlight-cactus"},HG={flexShrink:0}'));
  assert.ok(s156.includes('"aria-hidden":t["aria-hidden"]??(!e||void 0)'));
});

test('CdsTextArea (nk) renders the official textarea: data-cds, both XS classes, resize-y and the rows', () => {
  const html = renderToStaticMarkup(React.createElement(cowork.CdsTextArea, { resize: 'y', rows: 3, maxLength: 4000, value: 'x', onChange() {} }));
  assert.match(html, /^<textarea[^>]* data-cds="TextArea"/);
  const cls = /class="([^"]*)"/.exec(html)[1].split(' ');
  for (const name of ['focus-visible:shadow-focus', 'data-[invalid]:focus-visible:shadow-focus-danger', 'resize-y', 'cds-input', 'w-full'])
    assert.ok(cls.includes(name), `missing ${name}: ${cls.join(' ')}`);
  assert.match(html, / rows="3"/);
  assert.match(html, / maxLength="4000"/i);
});

test('the Projects dialog imports TextArea from cowork-scheduled (3.6556.2 nk), not the 2.2553.1 chat shared-frame', () => {
  const source = read('src/source-projects.jsx');
  assert.ok(source.includes("import { CdsTextArea as TextArea } from './generated/cowork-scheduled/index.mjs';"));
  assert.doesNotMatch(source, /generated\/chat\//);
});

test('SourcePictogram renders KG markup: no data-pictogram, aria-hidden, 96 at md', () => {
  const html = renderToStaticMarkup(React.createElement(picto.SourcePictogram, { name: 'HandBlocks' }));
  assert.match(html, /^<svg data-cds="Pictogram" width="96" height="96" viewBox="0 0 500 500" fill="none" xmlns="http:\/\/www\.w3\.org\/2000\/svg" style="flex-shrink:0" aria-hidden="true">/);
  assert.doesNotMatch(html, /data-pictogram|role="img"/);
  assert.ok(html.includes(`<path d="${handBlocks.highlight[0]}" class="fill-pictogram-highlight-default"></path>`));
  assert.ok(html.includes(`<path d="${handBlocks.line[0]}" fill="currentColor"></path>`));
  const sm = renderToStaticMarkup(React.createElement(picto.SourcePictogram, { name: 'ObjectBulb', size: 'sm', className: 'x' }));
  assert.match(sm, /^<svg data-cds="Pictogram" width="64" height="64" [^>]*style="flex-shrink:0" class="x" aria-hidden="true">/);
  assert.equal(renderToStaticMarkup(React.createElement(picto.SourcePictogram, { name: 'Missing' })), '');
  assert.deepEqual(picto.PICTOGRAM_SIZES, { sm: 64, md: 96 });
  assert.doesNotMatch(read('src/source-pictogram.jsx'), /data-pictogram=/);
});

test('SourcePictogram markup equals the sliced 3.6556.2 KG for every bundled def, size and className', () => {
  const assets = { HandBlocks: handBlocks, ...Object.fromEntries(Object.entries(defs).filter(([, v]) => v && v.highlight)) };
  assert.deepEqual(Object.keys(assets).sort(), ['HandBlocks', 'NodeShapes', 'ObjectBulb', 'ObjectMagnifier', 'ObjectPuzzle']);
  for (const [name, asset] of Object.entries(assets))
    for (const props of [{}, { size: 'sm' }, { size: 'md', className: 'text-primary' }, { size: 80 }]) {
      const host = renderToStaticMarkup(React.createElement(picto.SourcePictogram, { name, ...props }));
      const official = renderToStaticMarkup(React.createElement(cowork.Pictogram, { asset, ...props }));
      assert.equal(host, official, `${name} ${JSON.stringify(props)}`);
    }
});
