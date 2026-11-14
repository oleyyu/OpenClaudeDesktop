// w10-cleanup-misc (plan E10, D16 not-applicable): the landing texture is gone from Claude Desktop 3.6556.2, so the
// local app carries no landing-texture layer either. The official 3.6556.2 renderer chunks and the main-process build
// hold no `landing-texture` / `LandingTexture` text at all; 2.42304.0 still had them in 3 files (the c9d397622
// LandingTextureLayer, its host cc43287c9 and the c6a992d55 stylesheet), which is checked as the control so this
// test is known to look in the right place. Files are read as bytes only; no official chunk is executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ionSource, asarSource, previousIonSource, previousAsarSource } from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const NEEDLES = ['landing-texture', 'LandingTexture'].map(text => Buffer.from(text));
const OLD_FILES = ['c6a992d55-sXiDGMFQ.css', 'c9d397622-Ddkc2XHN.js', 'cc43287c9-DAfOi8yP.js'];

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') yield* files(full); }
    else if (entry.isFile()) yield full;
  }
}
const hits = (dirs, needles = NEEDLES) => dirs.flatMap(dir => [...files(dir)]
  .filter(file => { const bytes = fs.readFileSync(file); return needles.some(needle => bytes.includes(needle)); }));

test('3.6556.2: no official renderer or main-process file carries the landing texture', () => {
  for (const dir of [ionSource, asarSource]) assert.ok(fs.statSync(dir).isDirectory(), dir);
  assert.ok([...files(ionSource)].length > 1000, 'the 3.6556.2 ion-dist chunk directory is the full snapshot');
  assert.deepEqual(hits([ionSource, asarSource]), []);
});

test('2.42304.0 control: the old build still has the landing texture in exactly 3 files', () => {
  const found = hits([previousIonSource, previousAsarSource]);
  assert.deepEqual(found.map(file => path.relative(previousIonSource, file)).sort(), OLD_FILES);
});

test('the local app has no landing-texture slice, mount or attribute', () => {
  const generated = fs.readdirSync(path.join(app, 'src/generated'));
  assert.deepEqual(generated.filter(name => /landing-?texture/i.test(name)), []);
  assert.equal(fs.existsSync(path.join(app, 'src/generated/landing-texture')), false);
  // host and generated code, the main process and the page shell: no data-landing-texture hook, no layer by name
  assert.deepEqual(hits([path.join(app, 'src'), path.join(app, 'electron')])
    .map(file => path.relative(app, file)), []);
  assert.equal(NEEDLES.some(needle => fs.readFileSync(path.join(app, 'index.html')).includes(needle)), false);
});
