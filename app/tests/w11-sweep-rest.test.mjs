// w11-sweep-rest: the CDS locale reaches useCdsLocale readers the way the official root CdsRoot provides it, and the
// view-tabs names this sweep published (CdsLocaleContext, CdsCounter) are the official 3.6556.2 bindings. Official
// chunks are read as text only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource, sharedFrame } from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const official = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const h = React.createElement;
let server, Cds;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Cds = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

test('official: the root CdsRoot passes the app locale, provided as shared-frame Ra and read by useCdsLocale (ro)', () => {
  assert.ok(official('frame-shell-chrome-DJqydhu7.js').includes('a(Ji,{className:"contents",locale:r.locale,'));
  const frame = official(sharedFrame);
  assert.ok(frame.includes('Ra=ut(void 0)'));
  assert.ok(frame.includes('function ro(){return J(Ra)}'));
  assert.ok(frame.includes('ne=J(Ra),re=J1($,10,s)?K1($,10,s,s?.trim()?s.trim():void 0):$[11],ie=re??ne'));
  assert.ok(frame.includes('b(Ra.Provider,{value:ie,children:Re})'));
  const manifest = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual([manifest.publicNames.CdsLocaleContext?.file, manifest.publicNames.CdsLocaleContext?.local], [sharedFrame, 'Ra']);
  assert.equal(manifest.publicNames.CdsLocaleContext.export, undefined, 'the official chunk does not export Ra');
});

test('SSR: the host root locale reaches useCdsLocale directly and through a nested CdsRoot', () => {
  const Probe = () => h('i', null, String(Cds.useCdsLocale()));
  assert.equal(renderToStaticMarkup(h(Probe)), '<i>undefined</i>');
  assert.equal(renderToStaticMarkup(h(Cds.CdsLocaleContext.Provider, { value: 'zh-CN' }, h(Probe))), '<i>zh-CN</i>');
  const nested = renderToStaticMarkup(h(Cds.CdsLocaleContext.Provider, { value: 'zh-CN' }, h(Cds.CdsRoot, { density: 'compact', className: 'contents' }, h(Probe))));
  assert.match(nested, /<i>zh-CN<\/i>/);
  const main = read('src/main.jsx');
  assert.match(main, /^import \{ CdsLocaleContext \} from "\.\/generated\/view-tabs\/index\.js";/m);
  assert.equal(main.split('<CdsLocaleContext.Provider value={getLocale()}>').length, 2);
});

test('CdsCounter is the official shared-frame vE (exported Vo), published once', () => {
  const frame = official(sharedFrame);
  assert.match(frame, /[,{]vE as Vo[,}]/);
  const manifest = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(manifest.publicNames.CdsCounter, { file: sharedFrame, local: 'vE', export: 'Vo' });
  const html = renderToStaticMarkup(h(Cds.CdsCounter, { value: 120, variant: 'accent', size: 'xs' }));
  assert.match(html, /^<span data-cds="Counter"[^>]*class="inline-flex shrink-0 items-center justify-center align-middle [^"]*bg-fill-accent text-on-accent[^"]*">99\+<\/span>$/);
  // D1: code-routines imports it instead of keeping its own copy.
  const copies = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else if (/\.m?js$/.test(entry.name) && /"data-cds":\s?"Counter"/.test(fs.readFileSync(full, 'utf8'))) copies.push(path.relative(app, full));
  } };
  walk(path.join(app, 'src/generated'));
  assert.deepEqual(copies, ['src/generated/view-tabs/shared-frame-6jtSkIit.js']);
});
