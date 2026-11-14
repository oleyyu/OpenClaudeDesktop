// W14-code r6 gen-final-6: the last lane's own fixes — one copy per original binding across the generators this round
// touched (D1), the host helpers left without a caller by the round's replacements, and the usage panel's last host row.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');

// `official chunk#local` -> the areas whose 3.6556.2 slices hold it.
function holders() {
  const map = new Map();
  for (const area of fs.readdirSync(generated)) {
    const file = path.join(generated, area, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const m of manifest.modules ?? []) {
      if (typeof m.source !== 'string' || !m.target || m.kind === 'copy') continue;
      if ((m.referenceVersion ?? manifest.referenceVersion) !== '3.6556.2') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(area);
      }
    }
  }
  return map;
}

test('D1: shared-52 OT (useLatchedValue) is the Sessions page copy; the sleep band imports it, session-rail slices none', () => {
  assert.ok(!fs.existsSync(path.join(generated, 'session-rail/latched-value.mjs')));
  assert.match(read('src/generated/session-rail/sleep-band.mjs'), /import \{ useLatchedValue as vt \} from "\.\.\/sessions-page\/pure-shared-52\.mjs";/);
  assert.deepEqual([...holders().get('shared-52-uHFNjl7C.js#OT')], ['sessions-page']);
  // W14-code r7 gen-final-7 appended 'cowork-session-states' (shared-2 B5, D1) after it, so 'sessions-page' is no longer last.
  assert.match(read('scripts/extract-session-rail.mjs'), /\n {2}'sessions-page',\n/);
});

test('D1: the pierre Changes body shares the Changes pane / review card / rail slices instead of a second copy', () => {
  const all = holders();
  const shared = ['files-changes', 'review-findings', 'code-current', 'session-rail-changes', 'session-rail-kit', 'effort-control', 'composer-notices'];
  const twice = [...all].filter(([, areas]) => areas.has('pierre-changes') && shared.some((a) => a !== 'pierre-changes' && areas.has(a))).map(([key]) => key);
  assert.deepEqual(twice, [], 'no binding sliced by pierre-changes and one of the areas it now links');
  for (const gone of ['c784da984-Bk3OYRhM', 'c9bc99274-DTZfHMJt', 'cd59309dc-BZMawR8Y', 'ceb49ada3-COmVjFwx', 'shared-16-ByfgAyLr'])
    assert.ok(!fs.existsSync(path.join(generated, `pierre-changes/pierre-${gone}.mjs`)), gone);
  const links = JSON.parse(read('src/generated/pierre-changes/manifest.json')).linkedAreas.filter((l) => typeof l === 'object').map((l) => l.area);
  for (const area of ['files-changes', 'review-findings', 'session-rail-changes', 'session-rail-kit', 'code-current']) assert.ok(links.includes(area), area);
  // The holders export what the body imports (pure helpers: shared-1 tC / rC / oC, shared-18 uU / dU).
  assert.match(read('src/generated/review-findings/pane-focus-return.mjs'), /tC as paneRootOf,\n {2}rC as paneFocusTarget,\n {2}oC as returnFocusSoonTo,/);
  assert.match(read('src/generated/files-changes/file-entry-order.mjs'), /uU as numericCollator,\n {2}dU as compareNames,/);
});

test('D1: effort-control reads shared-frame qs from transcript-rows; composer-notices reads shared-0 nz from files-changes', () => {
  const all = holders();
  assert.deepEqual([...all.get('shared-frame-6jtSkIit.js#qs')], ['transcript-rows']);
  assert.deepEqual([...all.get('shared-0-DDOOdL6P.js#nz')].sort(), ['files-changes', 'transcript-rows']);
  assert.ok(!fs.existsSync(path.join(generated, 'composer-notices/shared-0.mjs')));
  assert.match(read('src/generated/composer-notices/code-band-row.mjs') + read('src/generated/composer-notices/composer-notices.mjs'), /from "\.\.\/files-changes\/noop\.mjs";/);
  // Wa (useCdsColorMode) stays code-composer's for the effort control: transcript-rows is listed before it.
  assert.match(read('src/generated/effort-control/effort-control.mjs') + read('src/generated/effort-control/slider.mjs') + read('src/generated/effort-control/slider-parts.mjs'),
    /useCdsColorMode as \w+ \} from "\.\.\/code-composer\/chat-composer-frame\.mjs"|from "\.\.\/code-composer\/chat-composer-frame\.mjs"/);
});

test('host helpers the round left without a caller are gone (the host effort slider, the band-used key copy)', async () => {
  const model = await import('../src/model-menu-model.mjs');
  for (const name of ['effortMark', 'effortValueText', 'effortWarning', 'hasHighestEffort']) assert.equal(model[name], undefined, name);
  assert.equal(typeof model.markDefaultEffort, 'function', 'the Default badge the sliced EffortControl reads stays');
  const kept = await import('../src/kept-awake-model.mjs');
  assert.equal(kept.KEEP_AWAKE_BAND_USED_KEY, undefined);
  assert.match(read('src/generated/session-rail/sleep-band.mjs'), /var sO = "epitaxy-keep-awake-band-used";/);
});

test('usage panel: See detailed breakdown is c2d611398 Ne (div.flex.px-lg.py-xs over the xs CDS button), no .sc-usage-link', () => {
  const official = fs.readFileSync(path.join(readable, 'c2d611398-Y2NVtf8_.js'), 'utf8');
  assert.ok(official.includes('t("div", {\n          className: "flex px-lg py-xs",\n          children: t(b.Close, { render: t(p, { size: "xs", onClick: n, children: r }) }),\n        })'));
  assert.ok(official.includes('Eu as p,'));
  assert.ok(fs.readFileSync(path.join(snapshot, 'shared-frame-6jtSkIit.js'), 'utf8').includes('Uu as Eu,'), 'p is shared-frame Uu (CdsButton)');
  const composer = read('src/source-composer.jsx');
  assert.match(composer, /<div className="flex px-lg py-xs">\n {4}<CdsButton size="xs" onClick=\{\(event\) => \{ onClick\?\.\(event\); if \(!event\.defaultPrevented\) popover\?\.close\("close-press"\); \}\}>\{t\("See detailed breakdown"\)\}<\/CdsButton>/);
  assert.doesNotMatch(composer, /sc-usage-link/);
  assert.doesNotMatch(read('src/source-composer.css'), /\.sc-usage-link[^\n]*\{/, 'no rule left for the host row');
});
