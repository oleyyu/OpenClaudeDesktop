// Region batch 2b (code-composer, region-plan G6 / cutover.oldConsumersAtGeneration): the isolated 4.16336.0 graph of the
// Code / chat composer originals (src/generated/code-composer-v4, scripts/extract-code-composer.mjs version 4.16336.0,
// sharedGraph cds-core, linking src/generated/btw-pane-v4). The host's composer subtree is cut over to it (surfaces-prod-3
// composer); the 3.6556.2 graph (src/generated/code-composer) stays byte-identical and keeps serving the ten 3.6556.2
// areas that link it by original identity and four pure-constant host consumers; the w14-code-composer tests keep pinning it. Official code is never executed here: generated modules are imported through
// Vite SSR, the chunks only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contractVersions, contract4, extractCodeComposer, extractContract4 } from '../scripts/extract-code-composer.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babelBundle from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const babel = babelBundle.default ?? babelBundle;
const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, 'src/generated/code-composer-v4');
const legacyOut = path.join(app, 'src/generated/code-composer');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
const exportsOf = name => [...chunk(name).matchAll(/export\{([^}]*)\}/g)].at(-1)[1].split(',');
const rawDeclarations = new Map();
function rawDeclaration(file, name) {
  if (!rawDeclarations.has(file)) {
    const text = chunk(file);
    rawDeclarations.set(file, { text, nodes: new Map(parsers.babel.parse(text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : []))) });
  }
  const { text, nodes } = rawDeclarations.get(file), node = nodes.get(name);
  assert.ok(node, `${file}: no top-level declaration ${name}`);
  return text.slice(node.start, node.end);
}
const textOf = dir => readdirSync(dir).filter(n => n.endsWith('.mjs')).map(n => readFileSync(path.join(dir, n), 'utf8')).join('\n');

const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = target => server.ssrLoadModule(`/src/generated/code-composer-v4/${target}`);

test('the 4.16336.0 contract regenerates byte for byte; the 3.6556.2 graph and its consumers stay on 3.6556.2', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', '4.16336.0']);
  // prepare-ui runs every scripts/verify-gen-*.mjs: verify-gen-code-composer.mjs (3.6556.2, its text pinned by
  // composer-generated-current) and verify-gen-code-composer-v4.mjs (this graph).
  assert.match(readFileSync(path.join(app, 'scripts/verify-gen-code-composer-v4.mjs'), 'utf8'), /extractCodeComposer\(\{ check: true, version: '4\.16336\.0' \}\)/);
  assert.deepEqual(await extractCodeComposer({ check: true, version: '4.16336.0' }), manifest);
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-code-composer.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(Object.keys(manifest.linkedGraphs), ['btw-pane-v4']);
  assert.equal(manifest.sharedGraphManifestSha256, sha(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))));
  assert.equal(manifest.linkedGraphs['btw-pane-v4'], sha(readFileSync(path.join(app, 'src/generated/btw-pane-v4/manifest.json'))));
  assert.equal(manifest.isolatedGraph.legacyOutput, 'src/generated/code-composer');
  assert.equal(manifest.isolatedGraph.productionSwitchNotBeforeBatch, 11);
  assert.deepEqual(manifest.isolatedGraph.heldBy.slice(0, 10), ['chat-artifact-card', 'chat-side-chat', 'code-current', 'code-editor', 'code-transcript',
    'composer-notices', 'cowork-approval', 'effort-control', 'session-rail-context', 'sidebar-hover-card']);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(readFileSync(path.join(out, m.target))), m.target);
    assert.match(readFileSync(path.join(out, m.target), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
  }
  // The 3.6556.2 graph: its own manifest, never reading cds-core / btw-pane-v4 / this graph.
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const m of legacy.modules) assert.equal(m.sha256, sha(readFileSync(path.join(legacyOut, m.target))), m.target);
  assert.doesNotMatch(textOf(legacyOut), /code-composer-v4|\.\.\/cds-core\/|btw-pane-v4/);
  // Its consumers link it by original identity; none of the ten 3.6556.2 areas links -v4.
  for (const area of manifest.isolatedGraph.heldBy.filter(a => !a.startsWith('src/'))) {
    const dir = path.join(app, 'src/generated', area === 'code-current' ? 'code-ui-current' : area === 'code-editor' ? 'code-editor-current' : area);
    let entries = [];
    try { entries = readdirSync(dir); } catch { continue; }
    const text = entries.filter(n => /\.m?js$/.test(n)).map(n => readFileSync(path.join(dir, n), 'utf8')).join('\n');
    assert.doesNotMatch(text, /code-composer-v4/, area);
  }
  // surfaces-prod-3 composer (the host cutover, plan hostCutover.ordering): the composer subtree is cut over as one set,
  // the recorded batch2b patch (MIG/regions/batch2b/code-composer/patches/host-cutover-code-composer-v4.patch) less the
  // environment bar's hunk (surfaces-prod-2 already cut it over, to its two modules) and less the four pure-constant
  // consumers that stay on 3.6556.2 for now. Exactly these host files name -v4; every -v4 module they import exists in
  // this graph; the cut-over files no longer import the 3.6556.2 graph; the four keep importing it, and only it.
  const cutOver = ['composer-copy-reply.mjs', 'composer-focus-api.mjs', 'composer-focus-handoff.mjs', 'composer-placeholder.mjs', 'main.jsx',
    'source-chat-composer.jsx', 'source-chat-tools-menu.jsx', 'source-composer-add-menu.jsx', 'source-composer-attachment-adapters.jsx',
    // relink rl-composer C1: the composer-chin-v4 host answers (hh -> this graph's ChatComposerParts.Chin).
    'source-composer-chin-adapters.jsx',
    'source-composer-environment-bar.jsx', 'source-composer-pane-drop.jsx', 'source-composer-row-chin.jsx', 'source-composer-shell.jsx',
    'source-composer-tiles.jsx', 'source-composer.jsx'];
  const legacyConsumers = ['source-branch-switch-dialog.jsx', 'source-btw-pane.jsx', 'source-diff-scope.jsx', 'source-preview-tabs.jsx'];
  const envBarLinks = ['./generated/code-composer-v4/environment-bar.mjs', './generated/code-composer-v4/path-tooltip-placement.mjs'];
  const targets = new Set(manifest.modules.map(m => m.target));
  const linking = [], linkingLegacy = [];
  for (const file of readdirSync(path.join(app, 'src')).filter(n => /\.(m?js|jsx)$/.test(n))) {
    const text = readFileSync(path.join(app, 'src', file), 'utf8');
    if (/code-composer-v4/.test(text)) linking.push(file);
    if (/from ["']\.\/generated\/code-composer\//.test(text)) linkingLegacy.push(file);
    for (const [, target] of text.matchAll(/from ["']\.\/generated\/code-composer-v4\/([^"']+)["']/g)) assert.ok(targets.has(target), `${file}: ${target} is a module of the graph`);
  }
  assert.deepEqual(linking.sort(), [...cutOver].sort(), 'the host files that name -v4 are the cut-over set');
  assert.deepEqual(linkingLegacy.sort(), [...legacyConsumers].sort(), 'only the four pure-constant consumers still import the 3.6556.2 graph');
  for (const file of legacyConsumers) {
    const text = readFileSync(path.join(app, 'src', file), 'utf8');
    assert.deepEqual([...new Set([...text.matchAll(/from ["']\.\/generated\/code-composer\/([^"']+)["']/g)].map(m => m[1]))].filter(t => !['code-pane-experimental.mjs', 'menu-collision-padding.mjs'].includes(t)), [], file);
  }
  const bar = readFileSync(path.join(app, 'src/source-composer-environment-bar.jsx'), 'utf8');
  assert.deepEqual([...bar.matchAll(/from "(\.\/generated\/code-composer-v4\/[^"]+)"/g)].map(m => m[1]), envBarLinks, 'the environment bar links only its two v4 modules');
});

test('each root is the 4.16336.0 binding its chunk exports under the proved alias, or a private declaration', () => {
  assert.deepEqual(Object.fromEntries(manifest.modules.filter(m => m.roots).map(m => [m.target, m.roots])), {
    'composer-tokens.mjs': { Hr: null, Gr: 'hn', ar: 'sn', sr: 'en', cr: 'rn', Lr: '$t', Ur: 'Wt', Wr: 'tn', xr: 'Kt', ir: 'an', dr: 'bn', or: 'on', rr: 'vn', fr: 'xn', lr: 'in', pr: 'yn' },
    'composer-testids.mjs': { ap: 'Rb', op: 'Vb' }, 'composer-glyph.mjs': { f: 'r', p: 't', d: 'n' }, 'owner-support.mjs': { vd: 'Wp', yd: 'Bp' },
    'placeholder-fit.mjs': { a: 't' }, 'shortcut-caps.mjs': { Sc: 'if', bc: null, _c: null }, 'composer-keycap.mjs': { Qs: 'of' },
    'composer-kbd.mjs': { r: 't' }, 'transcript-surface.mjs': { f: 'g' }, 'path-tooltip-placement.mjs': { mV: 'D', gV: 'k' },
    'composer-card-tokens.mjs': { eY: null, tY: null, nY: null, rY: null, iY: null, aY: null, sY: null, OJ: null, kJ: null, AJ: null, $J: null, vZ: null },
    'composer-dialog-focus.mjs': { oY: null, sY: '_' }, 'composer-focus-yield.mjs': { GJ: null, KJ: 'Gn' }, 'composer-final-focus.mjs': { R6: 'y' },
    'composer-key-label.mjs': { lY: null }, 'composer-send-cell.mjs': { pY: null, jJ: null, cY: null, DJ: null, $G: 'or' },
    'transcript-text-item.mjs': { Fe: 'S' }, 'transcript-provisional.mjs': { Hy: 'ni' }, 'transcript-user-kind.mjs': { ot: 'w' },
    'transcript-replies.mjs': { u: 'a', s: 'f', v: 'o', _: 'u' }, 'transcript-reply-text.mjs': { II: 'vo' }, 'copy-reply-arg.mjs': { kue: null },
    'copy-reply-replies.mjs': { Aue: null, jue: null },
    'environment-bar.mjs': { vge: null, d8: null, u8: null, _ge: null, c8: null, s8: null, gge: null, l8: null, Y5: null, X5: null },
    'usage-ring.mjs': { RZ: 'k', PZ: 'j' }, 'composer-row-chin.mjs': { j6: null, Wz: null }, 'keyboard-activation.mjs': { UI: 'oi' },
    'chat-composer-frame.mjs': { Zm: 'Iu', ld: 'Nd', Em: 'td', Es: 'ff', wn: 'Rp', La: 'Hf', Mn: 'Pp', Md: 'Cd', rs: 'vf', Ad: 'yd', co: 'Af', Dn: 'Lp',
      _d: 'wd', Rn: 'Ap', Hn: 'kp', yn: 'Wp', Hm: 'Wu', Um: 'Uu', Wm: 'Bu', Gm: 'Gu', Km: 'Hu', An: 'Fp' },
    'chat-composer-attachments.mjs': { Al: null, dl: null, Sl: null, Ol: null, vl: null, BN: 'ct' },
    'chat-composer-attachment-transition.mjs': { jm: 'Oy', dm: 'Ny', _m: 'by', vm: 'Sy', Tm: 'xy', Hm: 'wy' },
    'chat-composer-dock.mjs': { am: 'yy', mm: 'dy' }, 'chat-composer-presence.mjs': { Ud: 'Bm', yd: null, Od: 'Um', Dd: 'Gm' },
    'chat-composer-layout.mjs': { Np: 'wy', Pp: 'Ty', kp: 'Uy', Cp: 'Py', jp: 'Ly', Dp: 'zy', yp: 'Iy', Sp: 'Oy', Ip: 'My', Lp: 'Jy', Ep: 'Yy',
      Kp: 'jy', Rp: 'Zy', zp: 'By', Hp: 'Vy', Up: 'Hy', Wp: 'Ny', xp: 'ky' },
    // marlin-chin (U-MARLIN): Bp (exported Pm) is shared-8's `Df(GQ)`, the Chin part marker the Chat marlin chin uses.
    'chat-composer-shell.mjs': { _m: 'Nm', xm: 'Mm', mm: 'Fm', pm: 'Im', Bm: 'Am', zm: 'km', Bp: 'Pm' }, 'chat-composer-placeholder-timing.mjs': { UQ: 'n' },
    'composer-add-menu.mjs': { SJ: null, CJ: null, vJ: null }, 'menu-collision-padding.mjs': { OJ: 'Cn' }, 'composer-object-url.mjs': { mg: 'eo' },
    'composer-attachment-tiles.mjs': { Go: null, qo: null, Jo: null, Ko: null, Oc: null, Wo: null, Ho: null, Po: null },
    'composer-held-text-dialog.mjs': { fs: null }, 'code-pane-experimental.mjs': { BC: 'wp' }, 'composer-intake-split.mjs': { bg: 'Ph', Eh: 'Cg' },
    'composer-intake-route.mjs': { K$: null }, 'composer-drop-target.mjs': { c: 'n', l: 't' }, 'composer-pane-drop-zone.mjs': { v: 't', h: 'r', g: 'n' } });
  for (const m of manifest.modules.filter(m => m.roots))
    for (const [local, alias] of Object.entries(m.roots)) {
      const exported = exportsOf(m.source);
      if (alias) assert.ok(exported.includes(`${local} as ${alias}`), `${m.source} ${local} as ${alias}`);
      else assert.ok(!exported.some(pair => pair.startsWith(`${local} as `)), `${m.source} ${local} is private`);
    }
  // cds-core wave 5b publishes shared-26 Qp (ComposerDockContext) and Mp (ChatComposerLayoutContext): they are no longer
  // roots here (one Context object, cds-core's; region-changes code-composer.drop-published-roots) and nothing here cuts them.
  const core = JSON.parse(readFileSync(path.join(path.dirname(legacyOut), 'cds-core/manifest.json'), 'utf8'));
  for (const [name, local] of [['ComposerDockContext', 'Qp'], ['ChatComposerLayoutContext', 'Mp']]) {
    assert.deepEqual([core.publicNames[name].file, core.publicNames[name].local], ['shared-26-B-POtn5S.js', local], name);
    assert.ok(!manifest.modules.some(m => m.source === 'shared-26-B-POtn5S.js' && m.bindings.some(b => (b.name ?? b) === local)), `${local} is not cut here`);
  }
  // Semantic module and export names stay the 3.6556.2 ones; what 4.16336.0 no longer has is dropped, never stubbed
  // (the two Contexts above are the cds-core names of the same official bindings).
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  const semantic = list => list.filter(m => !m.target.startsWith('chunk-'));
  const names = list => [...new Set(semantic(list).flatMap(m => Object.values(m.exports)))].sort();
  assert.deepEqual(names(legacy.modules).filter(n => !names(manifest.modules).includes(n)),
    ['DockGlyphBox', 'composerRowLeadingClass', 'noopSubscribe', 'preventFocusSteal', 'sendGlyphBoxClass', 'stopGlyphName', 'useCdsColorMode'].concat(['AttachmentTransitionContext', 'acceptedImageTypes'],
      ['ComposerDockContext', 'ChatComposerLayoutContext']).sort());
  assert.deepEqual(semantic(legacy.modules).map(m => m.target).filter(t => !mod(t)).sort(), ['composer-image-types.mjs', 'composer-stop-glyph.mjs', 'composer-video-types.mjs']);
  assert.deepEqual(semantic(manifest.modules).map(m => m.target).filter(t => !legacy.modules.some(l => l.target === t)).sort(),
    ['chat-composer-attachment-transition.mjs', 'transcript-reply-text.mjs']);
});

test('sharedGraph cds-core and btw-pane-v4: linked by name, held copies equal, no dynamic import, adapters pinned', () => {
  const core = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const btw = JSON.parse(readFileSync(path.join(app, 'src/generated/btw-pane-v4/manifest.json'), 'utf8'));
  assert.equal(core.referenceVersion, '4.16336.0'); assert.equal(btw.referenceVersion, '4.16336.0');
  const held = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name}`, b.sha256])));
  const published = new Map(Object.entries(core.publicNames).map(([name, e]) => [`${e.file}#${e.local}`, { name, ...e }]));
  const btwModules = new Map(btw.modules.map(m => [`../btw-pane-v4/${m.target}`, m]));
  const kinds = new Set();
  for (const m of manifest.modules) {
    const text = readFileSync(path.join(out, m.target), 'utf8');
    assert.doesNotMatch(text, /\bimport\(|generated\/code-composer\/|\.\.\/code-composer\//, m.target);
    for (const i of m.imports) {
      kinds.add(i.kind);
      if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react-dom', 'react/compiler-runtime'].includes(i.from), i.from);
      if (i.kind === 'generated') assert.equal(mod(i.from.slice(2))?.exports[i.original], i.name, `${m.target} ${i.local}`);
      if (i.kind === 'linked') {
        const linked = btwModules.get(i.from);
        assert.ok(linked, i.from); assert.equal(linked.exports[i.original], i.name, `${m.target} ${i.local}`);
        assert.equal(linked.source, i.via.split(/[#:]/)[0]);
      }
      if (i.kind === 'shared-graph') {
        const entry = published.get(`${i.via.split(/[#:]/)[0]}#${i.original}`);
        assert.ok(entry, `${m.target} ${i.via} is a cds-core publicName`);
        assert.equal(i.from, `../cds-core/${entry.target}`); assert.equal(i.name, entry.exportName);
        assert.equal(i.linkedSha256, held.get(`${entry.file}#${entry.local}`));
        assert.equal(sha(rawDeclaration(entry.file, entry.local)), i.linkedSha256);
      }
    }
    for (const b of m.bindings) {
      const key = `${m.source}#${b.name}`;
      assert.equal(m.heldByCdsCore.includes(b.name), held.has(key), key);
      assert.ok(!published.has(key), `${key} is a cds-core publicName: link it`);
      if (held.has(key)) assert.equal(sha(rawDeclaration(m.source, b.name)), held.get(key), `${key} is the declaration cds-core holds`);
    }
    for (const name of m.heldByLinked) {
      const holder = btw.modules.find(x => x.source === m.source && x.bindings.some(b => b.name === name));
      assert.ok(holder, `${m.target} ${name}`);
      assert.ok(!Object.hasOwn(holder.exports, name), `${name} is exported by btw-pane-v4/${holder.target}: link it`);
    }
  }
  assert.deepEqual([...kinds].sort(), ['adapter', 'generated', 'linked', 'react', 'shared-graph']);
  // The host answers: the 3.6556.2 ones, each pinned to its original (intl hooks / message, the path hover card, the
  // CodeMirror held-text editor, the presence motion chunk loader). No other host module is read.
  const adapters = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${m.target}:${i.via}->${i.name}`));
  assert.deepEqual([...new Set(adapters)].sort(), [
    'chat-composer-presence.mjs:shared-5-u8kha2eH.js#Ed->loadPresenceMotionChunk',
    'composer-attachment-tiles.mjs:c856385e2-Cqx37C-b.js:a->ComposerPathHoverCard',
    'composer-attachment-tiles.mjs:vendor-intl-BJgYK7RA.js:l->ComposerMessage',
    'composer-attachment-tiles.mjs:vendor-intl-BJgYK7RA.js:p->useComposerIntl',
    'composer-held-text-dialog.mjs:c0a74d72b-BELp4TMv.js#Na->ComposerHeldTextEditor',
    'composer-held-text-dialog.mjs:vendor-intl-BJgYK7RA.js:l->ComposerMessage',
    'composer-held-text-dialog.mjs:vendor-intl-BJgYK7RA.js:p->useComposerIntl',
    'composer-pane-drop-zone.mjs:shared-0-CnnWnVrT.js:Rx->hostGrowthBookFeature',
    'composer-pane-drop-zone.mjs:vendor-intl-BJgYK7RA.js:l->ComposerMessage',
    'composer-send-cell.mjs:vendor-intl-BJgYK7RA.js:p->useComposerIntl']);
  const external = new Set(manifest.modules.flatMap(m => m.imports.map(i => i.from)).filter(f => f.startsWith('../../')));
  assert.deepEqual([...external].sort(), ['../../cds-core-adapter.mjs', '../../source-composer-attachment-adapters.jsx', '../../source-composer-current-adapters.jsx']);
  // The GrowthBook feature reader (shared-0 Uu, exported Rx) is answered by the host exactly as cds-core answers it.
  const gate = mod('composer-pane-drop-zone.mjs').imports.find(i => i.via === 'shared-0-CnnWnVrT.js:Rx');
  assert.equal(gate.sameAdapterAs, 'cds-core');
  assert.ok(core.modules.some(m => m.imports.some(i => i.via === gate.via && i.from === gate.from && i.name === gate.name && i.original === gate.original)));
  assert.ok(!manifest.modules.some(m => m.source === 'shared-0-CnnWnVrT.js' && m.bindings.some(b => b.name === 'Uu' || b.name === 'ku')));
  // The replaced originals: dynamic imports of the CodeMirror text editor and of the presence motion chunk, whose export
  // shape is the one the host loader returns.
  const tiles = chunk('c0a74d72b-BELp4TMv.js');
  assert.ok(tiles.includes('import("./cbd02b8f2-WPvqHhA2.js")') && tiles.includes('Na=Ma.Component'));
  assert.match(chunk('shared-5-u8kha2eH.js'), /Ed=\(\)=>[\w$]+\(\(\)=>import\("\.\/cb6c4b462-DQhtu8Uk\.js"\)/);
  assert.match(chunk('cb6c4b462-DQhtu8Uk.js'), /export\{[\w$]+ as AnimatePresence,[\w$]+ as HidingPresenceElement,[\w$]+ as LazyMotion,[\w$]+ as PresenceContext,[\w$]+ as PresenceElement,[\w$]+ as domMax,[\w$]+ as m\}/);
  // Roots btw-pane-v4 exports are re-exported, one instance.
  assert.deepEqual(manifest.modules.filter(m => m.reexports).map(m => [m.target, m.reexports]), [['owner-support.mjs', ['vd']], ['chat-composer-frame.mjs', ['Hn']]]);
});

test('import cycles never read a partner binding while the module evaluates', () => {
  const graph = new Map(manifest.modules.map(m => [m.target, new Set(m.imports.filter(i => i.from.startsWith('./')).map(i => i.from.slice(2)))]));
  const reaches = (from, to, seen = new Set()) => from === to || (!seen.has(from) && (seen.add(from), [...graph.get(from) ?? []].some(n => reaches(n, to, seen))));
  let cyclic = 0;
  for (const m of manifest.modules) {
    const partners = m.imports.filter(i => i.from.startsWith('./') && reaches(i.from.slice(2), m.target)).map(i => i.local);
    if (!partners.length) continue;
    cyclic++;
    const ast = babel.babelParse(readFileSync(path.join(out, m.target), 'utf8'), m.target, true);
    babel.traverse(ast, {
      Identifier(p) {
        if (!partners.includes(p.node.name) || !p.isReferencedIdentifier() || p.findParent(q => q.isImportDeclaration() || q.isExportNamedDeclaration())) return;
        assert.ok(p.getFunctionParent(), `${m.target}: ${p.node.name} is read at module evaluation`);
      },
    });
  }
  assert.ok(cyclic > 0);
});

test('generation stops on a renamed alias, a non-unique root and cds-core module state without a publicName (D46)', async () => {
  const only = (spec, extra = {}) => ({ ...contract4, linkedAreas: [], modules: [spec], ...extra });
  const kbd = contract4.modules.find(m => m.target === 'composer-kbd.mjs');
  const ok = await extractContract4(only(kbd), { dry: true });
  assert.deepEqual(ok.modules.find(m => m.target === 'composer-kbd.mjs').roots, { r: 't' });
  await assert.rejects(extractContract4(only({ ...kbd, aliases: { r: 'zz' } }), { dry: true }), /exports zz as nothing, not r/);
  // composer-drop-target c pinned by a string useDropTarget c and DropHalo l both carry: c is not the only declaration.
  const drop = contract4.modules.find(m => m.target === 'composer-drop-target.mjs');
  await assert.rejects(extractContract4(only({ ...drop, features: { ...drop.features, c: ['('] } }), { dry: true }),
    /root c is not the unique declaration with its features \((?=[^)]*\bc\b)(?=[^)]*\bl\b)[^)]*\)/);
  // c9c7785eb M (`M = c(null)`, a createContext) is held by cds-core without a publicName.
  const core = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.ok(core.modules.some(m => path.basename(m.source) === 'c9c7785eb-0Yp6X-iJ.js' && m.bindings.some(b => b.name === 'M')));
  assert.ok(!Object.values(core.publicNames).some(e => e.file === 'c9c7785eb-0Yp6X-iJ.js' && e.local === 'M'));
  const probe = { target: 'd46-probe.mjs', source: 'c9c7785eb-0Yp6X-iJ.js', exports: { M: 'probe' }, aliases: { M: null }, features: { M: ['M = c(null)'] } };
  await assert.rejects(extractContract4(only(probe), { dry: true }), /D46\).*c9c7785eb-0Yp6X-iJ\.js#M \(context\)/);
  const surveyed = await extractContract4(only(probe), { survey: true });
  assert.deepEqual(surveyed.stateConflicts.map(c => [c.binding, c.kind, c.text, c.reachedBy]),
    [['c9c7785eb-0Yp6X-iJ.js#M', 'context', 'M = c(null)', 'c9c7785eb-0Yp6X-iJ.js#M <- d46-probe.mjs']]);
});

test('the generated originals behave as 4.16336.0 does', async () => {
  const { isKeyboardActivation } = await load('keyboard-activation.mjs');
  assert.equal(isKeyboardActivation({ detail: 0 }), true);
  assert.equal(isKeyboardActivation({ detail: 0, pointerType: 'mouse' }), false);
  assert.equal(isKeyboardActivation({ detail: 1 }), false);
  const { splitTransferItems, composerImageMimeTypes } = await load('composer-intake-split.mjs');
  assert.deepEqual(composerImageMimeTypes, ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  const file = name => ({ name }), item = (f, dir) => ({ kind: 'file', getAsFile: () => f, webkitGetAsEntry: () => ({ isDirectory: dir }) });
  const [a, b] = [file('a'), file('b')];
  assert.deepEqual(splitTransferItems([item(a, true), item(b, false), { kind: 'string' }]), { folders: [a], files: [b] });
  assert.deepEqual(splitTransferItems(null, [a]), { folders: [], files: [a] });
  const { routeComposerIntake } = await load('composer-intake-route.mjs');
  const refused = [];
  assert.equal(routeComposerIntake({ files: [a], folders: [] }, { refuseFiles: f => refused.push(...f), images: () => assert.fail() }), true);
  assert.deepEqual(refused, [a]);
  const png = { type: 'image/png' }, txt = { type: 'text/plain' }, seen = {};
  assert.equal(routeComposerIntake({ files: [png, txt], folders: [] }, { images: f => (seen.images = f), otherFiles: f => (seen.other = f) }), true);
  assert.deepEqual(seen, { images: [png], other: [txt] });
  const { sendTestId, stopTestId } = await load('composer-testids.mjs');
  assert.deepEqual([sendTestId, stopTestId], ['code-prompt-send', 'code-prompt-stop']);
  const { placeholderGhostLines } = await load('chat-composer-shell.mjs');
  assert.deepEqual(placeholderGhostLines(''), []);
  assert.deepEqual(placeholderGhostLines('Reply'), ['Reply']);
  assert.deepEqual(placeholderGhostLines({ phrases: ['a', '', 'a', 'b'] }), ['a', 'b']);
  const { shortcutLabel } = await load('composer-key-label.mjs');
  assert.equal(shortcutLabel('cmd+enter', true), '⌘⏎');
  assert.equal(shortcutLabel('cmd+enter', false), 'Ctrl+Enter');
  // Every module of the graph evaluates (cycles included) under Vite SSR.
  for (const m of manifest.modules) await load(m.target);
});
