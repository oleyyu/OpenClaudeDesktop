// w12b-titlebar-spawn-lead (3.6556.2): the Code titlebar's lead while a new session spawns. cc43287c9 oG draws
// `t||o ? p(EP,{origin:pe&&{kind:pe,label:ve},title:J,bare:M})` when it has no session ref (t) but a spawn (o):
// EP = c73f45bc3 ay (generated titlebar-spawn-lead.mjs), the seeds latched by RP = c73f45bc3 xv (titlebar-seed-latch.mjs)
// over the live origin ni(o) = shared-52 nA (titlebar-spawn-origin.mjs). Host: titlebar-spawn-lead-model.mjs and
// source-titlebar-spawn-lead.jsx. Source-only: official chunks are read as text, the lead renders through
// react-dom/server. No Electron, no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { titlebarLiveOrigin, titlebarOriginKind, titlebarOriginLabel, titlebarSpawnLeadProps, titlebarSpawnSource } from '../src/titlebar-spawn-lead-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const official3 = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const h = React.createElement;

let server, L, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  L = await server.ssrLoadModule('/src/source-titlebar-spawn-lead.jsx');
});
after(async () => { I18n?.setLocale('en-US'); await server?.close(); });

const SPAWN = titlebarSpawnSource({ spawnPhase: { token: 'wt-1', phase: 'worktree' }, cwd: '/Users/me/work/repo-a/' });
const render = (props = {}) => renderToStaticMarkup(h(L.SourceTitlebarSpawnLead, { spawn: SPAWN, episodeKey: 'draft', ...props }));

test('official 3.6556.2: oG\'s spawn lead, its seeds, the latch and the live origin', () => {
  pin(official3('cc43287c9-Me-M2ucD.js'), [
    't||o?p(EP,{origin:pe&&{kind:pe,label:ve},title:J,bare:M})',
    'o?ni(o):void 0',
    'liveOrigin:ne',
    'pe=RP(re.origin?re.origin.remote?.kind==="ssh"?"ssh":re.origin.type:t&&de&&t.type!=="local"?t.type:fe?.kind,n)',
    'he=RP(o?.id,n)',
    'ge=ne??re.origin',
    'ge?.isScratchWorkspace?Fv(I):ge?.label',
    've=RP(_e,`${n}:${he??""}`)',
    'J=i?re.title??fe?.title:r',
    'L as EP', 'R as RP', 'Gl as ni',
    // xye → uG → oG: the spawn is the draft's spawnOrigin, the title loads until the first title arrives.
    'spawn:le', 'isTitleLoading:(J||se&&!X)&&!oe',
  ]);
  pin(official3('c73f45bc3-B7hbL7H9.js'), [
    'ay as L', 'xv as R', 'iy as I',
    'function xv(e,t){let $=J9(2),n=J1($,0,e)?K1($,0,e,()=>e||void 0):$[1],[r,i]=pr(t,n),a=e||r;return a!==r&&i(a),e??a}',
    'o=J0($,0)?K0($,0,i("span",{className:"sr-only",children:i(Z,{defaultMessage:"Loading session",id:"IY7S4mLrkm"})}))',
    'i("span",{"aria-hidden":!0,"data-slot":"origin-ghost",className:"size-[18px] motion-safe:animate-pulse rounded bg-alpha-1"})',
    'i(Qv,{kind:t.kind,connection:t.kind==="local"?void 0:"connecting"})',
    '!a&&n&&t?.label?i(Vv,{label:t.label,repository:t.kind==="remote"}):null',
    's("span",{role:"status",className:"flex min-w-0 items-center",children:[o,i(ry,{origin:c,pill:l,children:u})]})',
  ]);
  pin(official3('shared-52-uHFNjl7C.js'), [
    'nA as Gl',
    'function nA(e){return{type:e.type,label:e.isScratchWorkspace?void 0:e.repoInfo?.name??(e.cwd?nk(e.cwd):void 0),remote:e.remote,isScratchWorkspace:e.isScratchWorkspace===!0}}',
  ]);
  // ry's box classes (c73f45bc3 en / nn / an / dn / hn = shared-6 Cp / Ff / Mf / gf / vp).
  pin(official3('c73f45bc3-B7hbL7H9.js'), ['Cp as en', 'Ff as nn', 'Mf as an', 'gf as dn', 'vp as hn', 'od as V', 'Kl as j', 'sn as Sr']);
  pin(official3('shared-6-sd9jbJqs.js'), ['Yh as Cp', 'Wh as Ff', 'Jh as Mf', 'Gh as gf', 'qh as vp']);
});

test('the four targets read 3.6556.2 and import what other graphs already hold (D1)', () => {
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  const targets = {
    'titlebar-origin-classes.mjs': ['shared-6-sd9jbJqs.js', ['Yh', 'Wh', 'Jh', 'Gh']],
    'titlebar-spawn-origin.mjs': ['shared-52-uHFNjl7C.js', ['nA']],
    'titlebar-seed-latch.mjs': ['c73f45bc3-B7hbL7H9.js', ['xv']],
    'titlebar-spawn-lead.mjs': ['c73f45bc3-B7hbL7H9.js', ['wv', 'Tv', 'Ev', 'Dv', 'Ov', 'kv', 'Av', 'jv', 'Nv', 'Fv', 'Rv', 'zv', 'Bv', 'Vv', 'Zv', 'Qv', 'ry', 'ay']],
  };
  for (const [target, [source, bindings]] of Object.entries(targets)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry.source), source, target);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(ionSource, source))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = read(`src/generated/code-current/${target}`);
    assert.equal(sha(text), entry.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n'), target);
  }
  const lead = read('src/generated/code-current/titlebar-spawn-lead.mjs');
  assert.doesNotMatch(lead, /function iy\(/);
  assert.match(lead, /import \{ TitlebarTitleSkeleton as iy \} from "\.\/titlebar-title-skeleton\.mjs";/);
  assert.match(lead, /import \{ LEAD_NO_ORIGIN_CLASS as hn \} from "\.\.\/session-rail-kit\/rail-column\.mjs";/);
  assert.match(lead, /import \{ RAIL_REPO_ICON as fl \} from "\.\.\/session-rail-kit\/rail-repo-icon\.mjs";/);
  assert.match(lead, /CdsIcon as V,\s*CdsTooltip as j,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(read('src/generated/code-current/titlebar-spawn-origin.mjs'), /import \{ pathBasename as nk \} from "\.\.\/files-changes\/path-basename\.mjs";/);
  assert.match(read('src/generated/code-current/titlebar-seed-latch.mjs'), /import \{ rc as pr \} from "\.\.\/mcp-app-card\/shared-182\.mjs";/);
  assert.match(read('src/generated/mcp-app-card/shared-182.mjs'), /zL as rc/);
});

test('host seeds: the worktree spawn is a local origin labelled by its folder', () => {
  assert.equal(titlebarSpawnSource({ spawnPhase: null, cwd: '/x' }), null);
  assert.deepEqual(SPAWN, { id: 'wt-1', type: 'local', cwd: '/Users/me/work/repo-a/' });
  const origin = titlebarLiveOrigin(SPAWN);
  assert.deepEqual(origin, { type: 'local', label: 'repo-a', remote: undefined, isScratchWorkspace: false });
  assert.equal(titlebarLiveOrigin(null), undefined);
  assert.equal(titlebarOriginKind(origin), 'local');
  assert.equal(titlebarOriginKind({ type: 'remote', remote: { kind: 'ssh' } }), 'ssh');
  assert.equal(titlebarOriginKind(undefined), undefined);
  assert.equal(titlebarOriginLabel(origin, 'No folder'), 'repo-a');
  assert.equal(titlebarOriginLabel({ ...origin, isScratchWorkspace: true }, 'No folder'), 'No folder');
  assert.deepEqual(titlebarSpawnLeadProps({ kind: 'local', label: 'repo-a', title: undefined }), { origin: { kind: 'local', label: 'repo-a' }, title: undefined, bare: false });
  assert.deepEqual(titlebarSpawnLeadProps({ kind: undefined, label: undefined, title: 'T', railMode: true }), { origin: undefined, title: 'T', bare: true });
});

test('SSR: spawning without a title: status, local origin glyph, title ghost, no folder pill', () => {
  const html = render();
  assert.match(html, /^<div class="st-lead group\/lead"><span role="status" class="flex min-w-0 items-center"><span class="sr-only">Loading session<\/span>/);
  assert.match(html, /<span aria-hidden="true" data-slot="origin-glyph" data-testid="epitaxy-origin-indicator" class="inline-flex size-control shrink-0 items-center justify-center rounded text-primary">/);
  assert.equal(count(html, 'data-slot="title-ghost"'), 1);
  assert.equal(count(html, 'data-slot="origin-ghost"'), 0);
  assert.equal(count(html, 'epitaxy-origin-label'), 0);
  // ry: the origin box (shared-6 Wh) then `${en} gap-xs` around the title.
  assert.ok(html.includes('w-[var(--chat-gutter-start,32px)]'));
  assert.ok(html.includes('<span class="flex min-w-0 items-center gap-xs">'));
});

test('SSR: a known title shows the title preview and the static folder pill', () => {
  const html = render({ title: 'Fix the build' });
  assert.match(html, /data-slot="title-preview" data-pane-title=""[^>]*>Fix the build<\/span>/);
  assert.match(html, /<span class="flex items-center gap-0\.75 min-w-0 group-data-\[pills-compact\]\/lead:shrink-0"><span class="[^"]* cursor-default">/);
  assert.match(html, /data-testid="epitaxy-origin-label"[^>]*>repo-a<\/span>/);
  assert.equal(count(html, 'data-pills-compact'), 0);
  assert.ok(render({ title: 'T', pillsCompact: true }).startsWith('<div class="st-lead group/lead" data-pills-compact="true">'));
});

test('SSR: rail mode is bare (no origin, no pill); no spawn draws the origin ghost', () => {
  const bare = render({ title: 'Fix the build', railMode: true });
  assert.equal(count(bare, 'origin-glyph'), 0);
  assert.equal(count(bare, 'epitaxy-origin-label'), 0);
  assert.ok(bare.includes('<span class="w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0"></span>'));
  const unknown = render({ spawn: null });
  assert.equal(count(unknown, 'data-slot="origin-ghost"'), 1);
  assert.equal(count(unknown, 'origin-glyph'), 0);
});

test('SSR: zh-CN formats "Loading session" through the host catalog', () => {
  I18n.setLocale('zh-CN');
  try {
    assert.ok(render().includes('<span class="sr-only">正在加载会话</span>'));
  } finally { I18n.setLocale('en-US'); }
});
