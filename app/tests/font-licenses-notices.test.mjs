// U-13 (ui-display-bugs-20261116): Settings › Appearance › Font licenses fetches /third-party-notices.txt and shows it
// only when the answer is text/plain (generated/settings-pages-v4/general.mjs Ut / Tn). The file ships at the bundle
// root from public/; without it app://localhost answered index.html and the dialog stayed blank.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const { createAppProtocolHandler } = require('../electron/app-protocol.cjs');
const NOTICES = path.join(app, 'public/third-party-notices.txt');
const notices = () => fs.readFileSync(NOTICES, 'utf8');
const official = (rel) => { try { return fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104', rel), 'utf8'); } catch { return null; } };

test('the official Font licenses dialog reads /third-party-notices.txt as text/plain', () => {
  const page = fs.readFileSync(path.join(app, 'src/generated/settings-pages-v4/general.mjs'), 'utf8');
  assert.ok(page.includes('"/third-party-notices.txt"'));
  assert.match(page, /content-type"\)\?\.startsWith\("text\/plain"\)/);
});

test('public/ ships the notices at the bundle root and app://localhost serves the file, not index.html', async () => {
  assert.ok(fs.statSync(NOTICES).size > 1000);
  const fetched = [];
  const handler = createAppProtocolHandler({ root: path.join(app, 'public'), fetchFile: async (url) => { fetched.push(url); return new Response(fs.readFileSync(new URL(url)), { headers: { 'Content-Type': 'text/plain' } }); } });
  const res = await handler(new Request('app://localhost/third-party-notices.txt'));
  assert.equal(res.status, 200);
  assert.ok(fetched[0].endsWith('/public/third-party-notices.txt'));
  assert.equal(await res.text(), notices());
});

test('every font family the bundle declares is covered by the notices', () => {
  const text = notices();
  const dir = path.join(app, 'public/assets/v1');
  const families = new Set();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.css')))
    for (const m of fs.readFileSync(path.join(dir, file), 'utf8').matchAll(/@font-face\{font-family:\s*"?([^;"}]+)"?;[^}]*url\(/g)) families.add(m[1].trim()); // local() fallbacks ship nothing
  assert.ok(families.size >= 5, [...families].join());
  const covers = { 'anthropic-sans': 'Anthropic Sans', 'anthropic-serif': 'Anthropic Serif', 'anthropic-mono': 'Anthropic Mono', 'Anthropicons-Variable': 'Anthropicons', OpenDyslexicMono: 'OpenDyslexic Mono' };
  for (const family of families) assert.ok(text.includes(covers[family] ?? family), `no notice for ${family}`);
  assert.ok(text.includes(fs.readFileSync(path.join(app, 'node_modules/katex/LICENSE'), 'utf8').trim()), 'KaTeX fonts: katex LICENSE');
});

test('sections 1-3 are the 4.16336.0 third-party-notices.txt unchanged', { skip: !official('ion-dist/third-party-notices.txt') && 'no frozen snapshot' }, () => {
  assert.ok(notices().includes(official('ion-dist/third-party-notices.txt').replace(/^﻿/, '')));
});
