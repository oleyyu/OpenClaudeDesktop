// session-page lane (surfaces-prod-3, item 3): the Code titlebar's browser / preview toggle on 4.16336.0. The official row is
// c73f45bc3 hy `icon: e === "preview" && D ? "Globe" : vl[e]` with `D = vt(s?.type)`, vt = shared-123 yy (export _x):
// `e === "remote" ? fy() && by() : cy()`, cy `!!ce && V(sy) && !$v()` (sy "frontend_preview_external_domains"), fy `!!ce`,
// ce = shared-0 GO (export Bh) `globalThis["claude.web"]?.Launch`, the desktop preload's built-in browser bridge. The host
// preload exposes no "claude.web" Launch bridge and its GrowthBook table has no frontend_preview_external_domains entry
// (the official 3P table turns it on only `when builtinBrowserEnabled`), so both legs are off and the host draws the gate-off
// branch: vl.preview "Play", "Preview", ⇧⌘P. Globe is the expected difference against a desktop whose Launch bridge and
// builtinBrowserEnabled are on (compare.json: an official gate-off branch, not a bug). Source text only, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as official4 from '../scripts/official-4.16336.0.mjs';
import { titlebarToggleSpecs, titlebarFoldedToggles } from '../src/titlebar-controls-model.mjs';
import { growthBookFlagKey, hostGrowthBookFlag } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const officialText = name => fs.readFileSync(path.join(official4.ionSource, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('4.16336.0 hy: the preview row is Globe only behind shared-123 yy (the Launch bridge and frontend_preview_external_domains)', () => {
  const hy = officialText('c73f45bc3-C7dtUSq8.js');
  assert.equal(count(hy, 'icon:e==="preview"&&D?"Globe":vl[e]'), 1);
  assert.equal(count(hy, 'D=vt(s?.type)'), 1);
  assert.match(hy, /import\{[^}]*(?<![\w$])_x as vt[,}][^;]*?from"\.\/shared-123-1Hc1RTKl\.js"/);
  const s123 = officialText('shared-123-1Hc1RTKl.js');
  assert.equal(count(s123, 'function yy(e){let $=J9(4),t=cy(),n=by();return J3($,0,t,n,e)?K3($,0,t,n,e,e==="remote"?fy()&&n:t):$[3]}'), 1);
  assert.equal(count(s123, 'function cy(){let e=V(sy),t=$v();return!!ce&&e&&!t}'), 1);
  assert.equal(count(s123, 'function fy(){return!!ce}'), 1);
  assert.equal(count(s123, 'var sy="frontend_preview_external_domains"'), 1);
  assert.equal(count(s123, 'yy as _x'), 1);
  assert.match(s123, /import\{[^}]*(?<![\w$])Bh as ce[,}][^;]*?from"\.\/shared-0-CnnWnVrT\.js"/);
  const s0 = officialText('shared-0-CnnWnVrT.js');
  assert.equal(count(s0, 'GO=globalThis["claude.web"]?.Launch'), 1);
  assert.equal(count(s0, 'GO as Bh'), 1);
});

test('host: no Launch bridge, the GrowthBook leg absent, so the Code preview toggle is the gate-off row (Play, Preview, ⇧⌘P)', () => {
  const preload = fs.readFileSync(path.join(app, 'electron/preload.cjs'), 'utf8');
  assert.doesNotMatch(preload, /exposeInMainWorld\(\s*["']claude\.web["']/);
  assert.doesNotMatch(preload, /\bLaunch\s*:/);
  assert.equal(growthBookFlagKey('frontend_preview_external_domains'), '__gb__4112513247');
  assert.equal(hostGrowthBookFlag('frontend_preview_external_domains'), false);
  const input = { surface: 'code', session: true, terminalAvailable: true, previewAvailable: true };
  const row = specs => specs.find(spec => spec.pane === 'preview');
  for (const session of [true, false]) {
    const { icon, label, shortcut } = row(titlebarToggleSpecs({ ...input, session }));
    assert.deepEqual([icon, label, shortcut], ['Play', 'Preview', 'cmd+shift+p']);
  }
  assert.deepEqual(row(titlebarFoldedToggles(input, 4)), row(titlebarToggleSpecs(input)));
});
