// Production design assets on the 4.16336.0 pin (styles-audit §7 steps 2-4, §8): what public/assets/v1 and index.html
// actually ship, checked against the frozen snapshots and fixed hashes rather than against the pin's own provenance; and
// the host Icon, which is now the official CdsIcon, rendered for every size × weight against the official formula.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import * as pins from '../scripts/current-design-assets.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference');
const NEW = path.join(reference, 'snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const OLD = path.join(reference, 'snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFile(path.join(app, rel), 'utf8');

test('the pin names the 4.16336.0 snapshot, its icon module and font, and separates entry from component sheets', async () => {
  assert.equal(pins.designVersion, '4.16336.0');
  assert.equal(pins.designSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(pins.designIconModule, 'shared-frame-CJdE5Ria.js');
  assert.equal(pins.designIconFont, 'c0f671921-DhLyA8zC.woff2');
  assert.deepEqual(pins.designEntryStylesheets, ['shared-frame-BRemtw6F.css', 'shared-styles-C9nbzN1z.css', 'c6a992d55-_JRfOmTh.css']);
  // The official index.html: the same three stylesheet links in this order, and the same three font preloads.
  const html = await fs.readFile(path.join(NEW, '../../index.html'), 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag);
  assert.deepEqual(links.filter(tag => /rel="?stylesheet/.test(tag)).map(tag => tag.match(/href="?\/assets\/v1\/([^"\s>]+)/)[1]), pins.designEntryStylesheets);
  assert.deepEqual(links.filter(tag => /rel="?preload/.test(tag) && /as="?font/.test(tag)).map(tag => tag.match(/href="?\/assets\/v1\/([^"\s>]+)/)[1]), pins.designPreloadFonts);
  // Component sheets: each listed owner module really loads it; none is an entry sheet.
  for (const [name, { owners }] of Object.entries(pins.designComponentStylesheets)) {
    assert.ok(!pins.designEntryStylesheets.includes(name));
    for (const owner of owners) assert.ok((await fs.readFile(path.join(NEW, owner), 'utf8')).includes(`assets/v1/${name}`), `${owner} -> ${name}`);
  }
  assert.deepEqual(pins.designStylesheets, [...pins.designEntryStylesheets, ...Object.keys(pins.designComponentStylesheets)]);
});

test('index.html links the three entry sheets in official order, then only the declared global legacy sheet and the compat layer', async () => {
  const html = await read('index.html');
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(sheets, [...pins.designEntryStylesheets.map(n => '/assets/v1/' + n), ...pins.legacyGlobalStylesheets.map(n => '/assets/v1/' + n), '/assets/legacy-utilities.css']);
  assert.deepEqual(pins.legacyGlobalStylesheets, ['c3fde7009-BszyXGym.css']);
  const preloads = [...html.matchAll(/<link rel="preload" href="\/assets\/v1\/([^"]+)" as="font" type="font\/woff2" crossorigin \/>/g)].map(m => m[1]);
  assert.deepEqual(preloads, ['cc27851ad-DDVos-BJ.woff2', 'c66fc489e-2VcCjn5t.woff2', 'c0f671921-DhLyA8zC.woff2']);
  // Neither the ckv viewer nor the 4.16336.0 epitaxy sheet is global any more; no replaced 3.6556.2 entry sheet remains.
  assert.doesNotMatch(html, /c8e31bf58|c3fde7009-Dl-p803_|CegduNQ2|D_GJawPO|Che1orl5|cvFTkbeX/);
});

test('entry sheets are the exact 4.16336.0 bytes (fixed hashes) except relative URLs, with their fonts byte-identical', async () => {
  const fixed = {
    'shared-frame-BRemtw6F.css': ['b2e2c88a748ea2603199b40a2ab58124ed843750ef36a1f8b57c2631760259a0', '6d5fbaef38347bcfce691051c6ad45888b4431b5ccc2f452b80dff7b479b2050'],
    'shared-styles-C9nbzN1z.css': ['97e65601ccfc00a8fbea1fb7c1aab3658e79b100a6346746eb3dd5f57ae96687', '97e65601ccfc00a8fbea1fb7c1aab3658e79b100a6346746eb3dd5f57ae96687'],
    'c6a992d55-_JRfOmTh.css': ['e704135f9b14bd261438f0c2f3b4a5eb604a92418c8edee4c9d5580cba70e161', '875d88efd05fddaeb0f5fc2895ebb467f0b6e075ae663a101183467e928fa234'],
  };
  const provenance = JSON.parse(await read('public/ui-provenance.json'));
  assert.equal(provenance.designVersion, '4.16336.0');
  for (const [name, [raw, relative]] of Object.entries(fixed)) {
    const source = await fs.readFile(path.join(NEW, name), 'utf8');
    const output = await read('public/assets/v1/' + name);
    assert.equal(sha(source), raw, name);
    assert.equal(output, source.replaceAll('/assets/v1/', './'), name);
    assert.equal(sha(output), relative, name);
    const record = provenance.files.find(f => f.output === 'public/assets/v1/' + name);
    assert.deepEqual([record.sourceDir, record.referenceVersion, record.sourceSha256, record.outputSha256, record.legacyRegion],
      ['../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1', '4.16336.0', raw, relative, undefined], name);
    for (const m of source.matchAll(/url\(["']?\/assets\/v1\/([^\s)"']+)/g))
      assert.deepEqual(await fs.readFile(path.join(app, 'public/assets/v1', m[1])), await fs.readFile(path.join(NEW, m[1])), m[1]);
  }
  // Both entry sheets that declare Anthropicons-Variable name the new font, whose bytes are pinned.
  for (const name of ['shared-frame-BRemtw6F.css', 'c6a992d55-_JRfOmTh.css'])
    assert.match(await fs.readFile(path.join(NEW, name), 'utf8'), /font-family:Anthropicons-Variable;src:url\(\/assets\/v1\/c0f671921-DhLyA8zC\.woff2\)/);
  assert.equal(sha(await fs.readFile(path.join(app, 'public/assets/v1/c0f671921-DhLyA8zC.woff2'))), '55c9ccee646ea8c61258d1b92d8c9d0e81621f0855c325fc78b29165e9dfe185');
});

test('every other shipped sheet is either a 4.16336.0 original or a declared 3.6556.2 legacy-region dependency, never relabelled', async () => {
  const provenance = JSON.parse(await read('public/ui-provenance.json'));
  const shipped = (await fs.readdir(path.join(app, 'public/assets/v1'))).filter(n => n.endsWith('.css')).sort();
  const regionOf = new Map();
  for (const file of (await fs.readdir(path.join(app, 'src/generated'), { recursive: true })).filter(f => /\.m?js$/.test(f)))
    for (const m of (await read('src/generated/' + file)).matchAll(/"assets\/v1\/([\w-]+\.css)"/g)) {
      if (!regionOf.has(m[1])) regionOf.set(m[1], new Set());
      regionOf.get(m[1]).add(file.split(/[\\/]/)[0]);
    }
  const transcript = JSON.parse((await read('src/source-code-transcript.jsx')).match(/CODE_TRANSCRIPT_SHEETS = Object\.freeze\((\[[^\]]*\])\)/)[1]);
  const supersededSheets = JSON.parse((await read('src/view-tabs-asset-url.mjs')).match(/SUPERSEDED_LEGACY_SHEETS = Object\.freeze\((\{[^}]*\})\)/)[1]);
  const expected = new Set([...pins.designEntryStylesheets, ...regionOf.keys(), ...transcript, ...pins.legacyGlobalStylesheets]);
  assert.deepEqual(shipped, [...expected].sort());
  for (const name of shipped) {
    const record = provenance.files.find(f => f.output === 'public/assets/v1/' + name);
    const output = await read('public/assets/v1/' + name);
    const target = await fs.readFile(path.join(NEW, name), 'utf8').catch(() => null);
    if (target !== null) {
      assert.equal(output, target.replaceAll('/assets/v1/', './'), name);
      assert.equal(record.referenceVersion, '4.16336.0', name);
      assert.equal(record.legacyRegion, undefined, name);
      const old = await fs.readFile(path.join(OLD, name), 'utf8').catch(() => null);
      if (old !== null) assert.equal(old, target, `${name}: same name in both snapshots must be the same bytes`);
      continue;
    }
    const legacy = pins.legacyRegionStylesheets[name];
    assert.ok(legacy, `${name} is neither in 4.16336.0 nor a declared legacy-region dependency`);
    const source = await fs.readFile(path.join(OLD, name), 'utf8');
    assert.equal(output, source.replaceAll('/assets/v1/', './'), name);
    assert.deepEqual([record.sourceDir, record.referenceVersion, record.legacyRegion, record.sourceSha256],
      ['../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', '3.6556.2', [...legacy.regions], sha(source)], name);
    assert.deepEqual([...(regionOf.get(name) ?? [])].sort(), [...legacy.regions].sort(), name);
    for (const area of legacy.regions) {
      const manifest = JSON.parse(await read(`src/generated/${area}/manifest.json`));
      assert.equal(manifest.referenceVersion ?? manifest.version, '3.6556.2', `${area} still on 3.6556.2`);
    }
    const debt = provenance.legacyDebt.find(debt => debt.stylesheet === name && debt.referenceVersion === '3.6556.2');
    assert.ok(debt, name);
    // A global legacy sheet names the regions its host consumers render; each is still on 3.6556.2 (fix P2-4).
    assert.equal(Boolean(legacy.global), Boolean(legacy.globalRegions?.length), `${name}: global ⇔ globalRegions`);
    if (legacy.global) {
      assert.deepEqual([record.globalRegions, debt.globalRegions], [[...legacy.globalRegions], [...legacy.globalRegions]], name);
      for (const area of legacy.globalRegions) {
        const manifest = JSON.parse(await read(`src/generated/${area}/manifest.json`));
        assert.equal(manifest.referenceVersion ?? manifest.version, '3.6556.2', `${area} (global holder of ${name}) still on 3.6556.2`);
      }
    }
    // Packaged (file://) reachability (fix P2-2; integration-1 preload-helper). The preload helper resolves deps against
    // document.baseURI (host viteAssetUrl), so a global / host-linked sheet is the linked one, and a lazy-only sheet whose
    // replacedBy is an entry sheet index.html links is superseded by that link (never requested), as the adapter maps it.
    const replacement = /^[\w-]+\.css\b/.exec(legacy.replacedBy)?.[0];
    const superseded = !legacy.global && !legacy.hostLinks && pins.designEntryStylesheets.includes(replacement);
    assert.equal(Object.hasOwn(supersededSheets, name), superseded, `${name}: superseded ⇔ mapped by viteAssetUrl`);
    if (superseded) assert.equal(supersededSheets[name], replacement, name);
    assert.equal(debt.packagedLoad, legacy.global ? 'index.html link' : legacy.hostLinks ? 'host link (CODE_TRANSCRIPT_SHEETS)'
      : superseded ? `superseded: vitePreload resolves to the index.html link ${replacement}`
      : 'lazy: vitePreload resolves against document.baseURI', name);
    // No legacy sheet is left to the official "/"+dep resolution any more.
    assert.doesNotMatch(debt.packagedLoad, /file:\/\/\/assets/, name);
  }
  // The global c3fde7009 legacy sheet is held by code-current (source-file-viewer csv-view / document-frame) too.
  assert.deepEqual([...pins.legacyRegionStylesheets['c3fde7009-BszyXGym.css'].globalRegions], ['code-current', 'code-transcript']);
  // Same-named sheets kept their file name but come from the new snapshot.
  for (const name of ['c4a9ee384-Br-fzuOs.css', 'c6a73f447-LaXKuzWp.css'])
    assert.equal(provenance.files.find(f => f.output === 'public/assets/v1/' + name).referenceVersion, '4.16336.0', name);
});

test('public/assets/v1 holds no replaced 3.6556.2 sheet or old icon font outside the registered legacy closure', async () => {
  const provenance = JSON.parse(await read('public/ui-provenance.json'));
  const oldNames = new Set(await fs.readdir(OLD)), newNames = new Set(await fs.readdir(NEW));
  const replaced = [...oldNames].filter(n => /\.(css|woff2?)$/.test(n) && !newNames.has(n));
  const legacyClosure = new Set(Object.keys(pins.legacyRegionStylesheets));
  for (const name of legacyClosure)
    for (const m of (await fs.readFile(path.join(OLD, name), 'utf8')).matchAll(/url\(["']?\/assets\/v1\/([^\s)"']+)/g)) legacyClosure.add(m[1]);
  for (const name of await fs.readdir(path.join(app, 'public/assets/v1'))) {
    if (!replaced.includes(name)) continue;
    assert.ok(legacyClosure.has(name), `${name}: a replaced 3.6556.2 asset outside the declared legacy closure`);
    const record = provenance.files.find(f => f.output === 'public/assets/v1/' + name);
    assert.equal(record.referenceVersion, '3.6556.2', name);
    assert.ok(Array.isArray(record.legacyRegion) && record.legacyRegion.length, name);
  }
  // The old Anthropicons face is only declared by the legacy shared-frame sheet the 3.6556.2 regions name, which the
  // preload helper's assetsURL (viteAssetUrl) supersedes with the linked 4.16336.0 shared-frame sheet: never requested.
  const oldFont = 'c0f671921-cvFTkbeX.woff2';
  const holders = [];
  for (const name of (await fs.readdir(path.join(app, 'public/assets/v1'))).filter(n => n.endsWith('.css')))
    if ((await read('public/assets/v1/' + name)).includes(oldFont)) holders.push(name);
  assert.deepEqual(holders, ['shared-frame-CegduNQ2.css']);
  const superseded = JSON.parse((await read('src/view-tabs-asset-url.mjs')).match(/SUPERSEDED_LEGACY_SHEETS = Object\.freeze\((\{[^}]*\})\)/)[1]);
  assert.equal(superseded['shared-frame-CegduNQ2.css'], 'shared-frame-BRemtw6F.css');
});

// ---------------------------------------------------------------------------------------------------------------------
// Icon: the official map and the official CdsIcon.
function staticGs(code) {
  const keyOf = node => node.type === 'Identifier' ? node.name : String(node.value);
  const numeric = node => Object.fromEntries(node.properties.map(p => [keyOf(p.key), p.value.value]));
  const found = [];
  for (const statement of parseAst(code).body) if (statement.type === 'VariableDeclaration') for (const d of statement.declarations) {
    if (d.init?.type !== 'ObjectExpression') continue;
    const props = new Map(d.init.properties.filter(p => p.type === 'Property' && !p.computed).map(p => [keyOf(p.key), p.value]));
    if (props.has('icons') && props.has('secondary') && props.get('icons').properties?.[0] && keyOf(props.get('icons').properties[0].key) === 'Activity')
      found.push({ icons: numeric(props.get('icons')), secondary: numeric(props.get('secondary')) });
  }
  assert.equal(found.length, 1);
  return found[0];
}

test('icons.json and the generated CdsIcon carry the 4.16336.0 tables: 412 primary (41 new, none remapped) and 24 secondary', async () => {
  const official = staticGs(await fs.readFile(path.join(NEW, 'shared-frame-CJdE5Ria.js'), 'utf8'));
  const previous = staticGs(await fs.readFile(path.join(OLD, 'shared-frame-6jtSkIit.js'), 'utf8'));
  const generated = staticGs(await read('src/generated/cds-core/shared-frame.mjs'));
  const json = JSON.parse(await read('src/generated/icons.json'));
  assert.equal(Object.keys(official.icons).length, 412);
  assert.equal(Object.keys(official.secondary).length, 24);
  assert.deepEqual(json, official.icons);
  assert.deepEqual(generated, official);
  const added = Object.keys(official.icons).filter(name => !(name in previous.icons));
  assert.equal(added.length, 41);
  assert.ok(Object.keys(previous.icons).every(name => official.icons[name] === previous.icons[name]));
  for (const [name, code] of Object.entries({ CaretDownSmall: 0xf003, CaretRightFilled: 0xf011, Sliders: 0xf079, Bottombar: 0xf083, Reply: 0xf087 }))
    assert.equal(json[name], code, name);
});

let server, Icons;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Icons = await server.ssrLoadModule('/src/icons.jsx');
});
after(() => closeWhenSettled(server));
const render = props => renderToStaticMarkup(React.createElement(Icons.Icon, props));
const styleOf = markup => Object.fromEntries((markup.match(/style="([^"]*)"/)?.[1] ?? '').replaceAll('&quot;', '"').split(';').filter(Boolean)
  .map(part => { const at = part.indexOf(':'); return [part.slice(0, at), part.slice(at + 1)]; }));

// The official formula, restated from shared-frame-CJdE5Ria.js (bs, gs.wght, Ls/Ps, Ds, Is); the constants are checked
// against the snapshot text below so this table cannot drift from the source.
const TOKENS = [[12, { regular: 1 }], [16, { regular: 1.25, strong: 1.5625 }], [20, { regular: 1.25, strong: 1.5625 }], [24, { regular: 1.5 }], [28, { regular: 1.6667 }], [32, { regular: 1.875 }]];
const WGHT = { 16: [1, 1.5625], 20: [1.171875, 1.875] };
function officialStyle(px, strong) {
  let token = TOKENS[0], distance = Infinity;
  for (const entry of TOKENS) { const d = Math.abs(entry[0] - px); if (d <= distance) { distance = d; token = entry; } }
  const stroke = strong && token[1].strong ? token[1].strong : token[1].regular;
  const master = px < 18 ? 16 : 20, [lo, hi] = WGHT[master];
  const weight = Math.round(Math.max(400, Math.min(700, 400 + 300 * ((stroke * master / px - lo) / (hi - lo)))) * 10) / 10;
  return { weight, opsz: { 18: 20, 24: 24 }[px] };
}

test('official icon constants are the ones the expectation table restates', async () => {
  const code = await fs.readFile(path.join(NEW, 'shared-frame-CJdE5Ria.js'), 'utf8');
  assert.ok(code.includes('wght:{16:{lo:1,hi:1.5625},20:{lo:1.171875,hi:1.875}}'));
  assert.ok(code.includes('{xs:{px:12,master:"small",stroke:{regular:1}},sm:{px:16,master:"small",stroke:{regular:1.25,strong:1.5625}},md:{px:20,master:"base",stroke:{regular:1.25,strong:1.5625}},lg:{px:24,master:"base",stroke:{regular:1.5}},xl:{px:28,master:"base",stroke:{regular:1.6667}},xxl:{px:32,master:"base",stroke:{regular:1.875}}}'));
  assert.ok(code.includes('Is={18:20,24:24}'));
});

test('Icon SSR: 12/16/18/20/24/28/32 × regular/strong give the official fontWeight, opsz and rem font size', () => {
  const seen = {};
  for (const px of [12, 16, 18, 20, 24, 28, 32]) for (const weight of ['regular', 'strong']) {
    const markup = render({ name: 'Add', size: px, weight });
    const style = styleOf(markup);
    const expected = officialStyle(px, weight === 'strong');
    assert.equal(Number(style['font-weight']), expected.weight, `${px} ${weight}`);
    assert.equal(style['font-variation-settings'], expected.opsz === undefined ? undefined : `"opsz" ${expected.opsz}`, `${px} ${weight}`);
    assert.equal(style['font-size'], `calc(${px / 16}rem * var(--cds-rem-scale, 1))`, `${px} ${weight}`);
    assert.equal(style['flex-shrink'], undefined);
    assert.match(markup, /^<span data-cds="Icon" style="[^"]*" aria-hidden="true"><\/span>$/);
    seen[`${px}${weight[0]}`] = expected.weight;
  }
  // styles-audit §5 independent anchors (computed from the source formula, not screenshots).
  assert.equal(seen['18r'], 492.6);
  assert.equal(seen['18s'], 640.7);
  assert.equal(seen['24r'], 433.3);
  assert.deepEqual([seen['12r'], seen['16r'], seen['16s'], seen['20r'], seen['20s'], seen['24s'], seen['28r'], seen['32r']],
    [577.8, 533.3, 700, 433.3, 566.7, 433.3, 407.9, 400]);
});

test('Icon SSR: secondary layer, mirroring, DotsVertical, absent names, tokens and pass-through props follow CdsIcon', () => {
  // AlignCenter: primary U+E0D1 (57681) with its secondary layer U+E164 (57700) first.
  assert.equal(render({ name: 'AlignCenter' }).replace(/ style="[^"]*"/, ''),
    `<span data-cds="Icon" aria-hidden="true"><span data-cds-icon-layer="secondary" aria-hidden="true">${String.fromCodePoint(57700)}</span>${String.fromCodePoint(57681)}</span>`);
  assert.match(render({ name: 'ArrowLeft' }), /data-cds-mirror=""/);
  assert.equal(render({ name: 'DotsVertical' }), render({ name: 'DotsHorizontal' }));
  // A name the official table lacks: no Placeholder glyph (Bs renders the span empty).
  assert.equal(render({ name: 'Plus' }).replace(/ style="[^"]*"/, ''), '<span data-cds="Icon" aria-hidden="true"></span>');
  // className / style / rest props; style merges after the computed font style, as in Bs.
  const markup = render({ name: 'Add', size: 20, className: 'probe', style: { color: 'red' }, 'data-x': '1', title: 't' });
  assert.match(markup, /class="probe"/);
  assert.match(markup, /data-x="1"/);
  assert.match(markup, /title="t"/);
  assert.equal(styleOf(markup).color, 'red');
  // alt makes it an image; aria overrides win.
  assert.match(render({ name: 'Add', alt: 'Add' }), /role="img" aria-label="Add"/);
  assert.match(render({ name: 'Add', 'aria-hidden': false }), /aria-hidden="false"/);
  // An icon with alt is never aria-hidden.
  assert.doesNotMatch(render({ name: 'Add', alt: 'Add' }), /aria-hidden/);
  // Host contract (SidebarCdsIcon): aria-label plus an explicitly lifted aria-hidden becomes the official alt, so the
  // label is exposed (role="img", aria-label) instead of Bs falling back to aria-hidden="true".
  const lifted = render({ name: 'GitPullRequest', role: 'img', 'aria-label': 'Open pull request', 'aria-hidden': undefined });
  assert.match(lifted, /role="img" aria-label="Open pull request"/);
  assert.doesNotMatch(lifted, /aria-hidden/);
  // Without the explicit lift, a bare aria-label keeps the official default (decorative, hidden).
  assert.match(render({ name: 'Add', 'aria-label': 'x' }), /aria-hidden="true"/);
  // A CDS size token is passed to the official size prop (md = 20 px, regular).
  assert.equal(styleOf(render({ name: 'Add', size: 'md' }))['font-weight'], String(officialStyle(20, false).weight));
  // Default: 16 px regular (the host default), not the official md.
  assert.deepEqual(styleOf(render({ name: 'Add' })), styleOf(render({ name: 'Add', size: 16, weight: 'regular' })));
});
