import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as official from '../scripts/official-4.16336.0.mjs';
import { ROOT_AT_EDGE, childAtEdge, isLineConfig, lineShell, lineTileConfig, lineTileStyle, lineViewportVars, officialTileKind, paneTileContexts } from '../src/tile-line-model.mjs';

// session-page item 2: the 4.16336.0 Code session line mode the host tile engine runs while a pane is docked. The values
// come from generated/session-panels-v4 (shared-20 h_ / l_ / fb, c9543da06 Os / ks / As) and cds-core (shared-20 f_ / p_,
// since wave 7); this pins the host's
// two call-site ports (cc43287c9 Eje, c9543da06 Es / Is) against the snapshot text.
const ROOT = path.resolve(import.meta.dirname, '..');
const chunk = name => fs.readFile(path.join(official.ionSource, name), 'utf8');

test('Eje config: shared-20 f_(!0) with paddingTop 0 and no dock reserve', () => {
  const c = lineTileConfig();
  assert.deepEqual({ ...c }, { gap: 1, padding: 0, minTileBasePx: 100, minTileWidthPx: 280, dragLift: 24, borderPx: 0, divider: 'line', paddingTop: 0, paddingEnd: 0 });
  assert.ok(isLineConfig(c));
  assert.ok(!isLineConfig({ gap: 12, padding: 8 }));
  assert.deepEqual({ ...lineViewportVars() }, { '--titlebar-end-inset': 'calc(0.5rem * var(--cds-rem-scale, 1))', '--tiles-border': '0px' });
});

test('Eje tile style: chat keeps 8px start / bottom (end per gutter), panes stand edge to edge on their official ground', () => {
  assert.deepEqual(lineTileStyle('chat', { start: undefined, end: 'shave' }), { padding: '0px 0px 8px 8px', '--tiles-padding': '8px', '--tile-shell-ground': 'var(--tile-page-ground, var(--df-bg-page, var(--cds-surface-1)))' });
  assert.deepEqual(lineTileStyle('chat', { start: 'shave', end: undefined }), { padding: '0px 8px 8px 0px', '--tiles-padding': '8px', '--tile-shell-ground': 'var(--tile-page-ground, var(--df-bg-page, var(--cds-surface-1)))' });
  // shared-20 db: tasks / session / runs stand on the page ground; terminal / file / diff / preview / plan on the pane ground.
  assert.equal(lineTileStyle('tasks', {})['--tile-shell-ground'], 'var(--df-bg-page, var(--cds-surface-1))');
  assert.equal(lineTileStyle('tasks', {}).padding, '0px 0px 0px 0px');
  assert.equal(lineTileStyle('session', {}).padding, '0px 0px 8px 0px');
  for (const id of ['terminal', 'files', 'changes', 'preview', 'plan'])
    assert.equal(lineTileStyle(id, {})['--tile-shell-ground'], 'var(--tile-pane-ground, var(--cds-surface-2))', id);
  assert.equal(officialTileKind('files'), 'file');
  assert.equal(officialTileKind('changes'), 'diff');
  assert.equal(lineTileStyle('chat', {}, true).padding, '0px 8px 8px 8px');
});

test('Es atEdge and Is after-line shell', () => {
  const row = [0, 1, 2].map(i => childAtEdge(ROOT_AT_EDGE, 'row', i, 0, 2));
  assert.deepEqual(row.map(e => [e.left, e.right, e.top, e.bottom]), [[true, false, true, true], [false, false, true, true], [false, true, true, true]]);
  const col = [0, 1].map(i => childAtEdge(row[2], 'column', i, 0, 1));
  assert.deepEqual(col.map(e => [e.left, e.top, e.bottom]), [[false, true, false], [false, false, true]]);
  const line = lineTileConfig();
  assert.deepEqual(lineShell(line, row[0], null), { afterX: false, afterY: false, attrs: { 'data-after-line-x': undefined, 'data-after-line-y': undefined }, style: {} });
  assert.deepEqual(lineShell(line, row[2], { width: 320 }).style, { width: 'calc(100% + var(--tile-reach-back, 0px))', minWidth: 'calc(320px + var(--tile-reach-back, 0px))' });
  assert.deepEqual(lineShell(line, col[1], null).attrs, { 'data-after-line-x': '', 'data-after-line-y': '' });
  assert.equal(lineShell({ gap: 12 }, col[1], null).afterX, false);
});

test('the ported call sites are the 4.16336.0 originals', async () => {
  const eje = await chunk('cc43287c9-dzfX-J5i.js'), c95 = await chunk('c9543da06-DHwxxZai.js'), css = await chunk('c6a992d55-_JRfOmTh.css');
  for (const text of ['Zf(!0)', 'return Cp(n&&vt===void 0?8:0,fm(e.id)?8:0,n&&_t===void 0?8:0,n?"chat":Wf(e.id),Re==="rtl",Le&&!n&&t.top?pp:void 0)'])
    assert.ok(eje.includes(text), text);
  for (const text of ['A=i.divider==="line"&&!k.left,j=i.divider==="line"&&!k.top', '"data-after-line-x":ue', 'vt=r.divider==="line"?"":void 0', '"data-tiles-line":vt',
    'o&&!r&&s("span",{className:"tiles-handle-line"})', 'T=(o?4:1)+d'])
    assert.ok(c95.includes(text), text);
  for (const rule of ['[data-tiles-line] .tiles-handle[aria-orientation=vertical]:before{border-inline-start-width:1px;border-inline-start-color:var(--cds-fizzy-lake-color-seam,var(--cds-border))}',
    '[data-tiles-line] .tiles-shell[data-after-line-x]{border-inline-start-width:1px;margin-inline-start:calc(-1 * var(--tile-reach-back))}'])
    assert.ok(css.includes(rule), rule);
  // The official stylesheet is the one the host loads (index.html), so these rules reach the host's .tiles-* DOM.
  assert.match(await fs.readFile(path.join(ROOT, 'index.html'), 'utf8'), /assets\/v1\/c6a992d55-_JRfOmTh\.css/);
  const host = await fs.readFile(path.join(ROOT, 'src/source-tile-layout.jsx'), 'utf8');
  for (const text of ['data-tiles-line={line ? "" : undefined}', 'data-tiles-viewport=""', '<span className="tiles-handle-line" />', 'config: configProp',
    'const config = configProp ?? LINE_TILE_CONFIG;'])
    assert.ok(host.includes(text), text);
});

// round3 rl-session-page SP-2 (D-SP-2): cc43287c9 Hje returns the chat tile before its providers and wraps every other tile
// in `p(sR, {value: !0})` (c4db265df ot) and `p(lm, {value: Wf(b)})` (shared-20 ub over fb / db).
test('paneTileContexts: the values Hje provides around a tile', async () => {
  const hje = await chunk('cc43287c9-dzfX-J5i.js');
  for (const text of ['D as sR', 'if(b==="chat"){', 'I=J1($,70,b)?K1($,70,b,Wf(b)):$[71]', 'p(lm,{value:I,children:N})', 'p(sR,{value:!0,children:p(uR,{value:S,children:L})})'])
    assert.ok(hje.includes(text), text);
  assert.equal(paneTileContexts('chat'), null);
  assert.deepEqual(paneTileContexts('tasks'), { inTile: true, standsOnPage: true });
  for (const id of ['files', 'changes', 'terminal', 'preview'])
    assert.equal(paneTileContexts(id).inTile, true, id);
});
