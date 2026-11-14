// R3-composer composer-row-chin (research/composer.md §3.3 / §3.12 / §3.20; ledger composer-03, composer-13,
// composer-v02): an open session's presets chin is 2.42304.0's row layout (c73f45bc3 K_ → c227f4d5e bQ `layout: "row"`)
// and every chin trigger is the official one (tQ in vQ, the CDS ModelSelector pill, EffortControl's trigger, yZ's ring
// button over the shared-8 KV ring), built from view-tabs CDS components and generated originals. SSR, element props,
// a CDS-Tooltip props probe, a real cascade over the renderer's stylesheets and the shipped chunks; nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';
import { contextRingStroke } from '../src/context-usage-model.mjs';
import { readFileSync } from 'node:fs';
import { designEntryStylesheets, legacyGlobalStylesheets } from '../scripts/current-design-assets.mjs';
// W14-code r4 closeout R4DC-N7: the model's test-only ring geometry / track / row-size exports are gone (the ring is the
// generated shared-8 KV); the test keeps them as its oracle: xT 12px stroke 2, offset C·(1−clamp(pct)/100); _d track
// alpha-2; c227f4d5e B3 draws it at 14.
// W14-code r4 gen-final-4: the model's test-only CONTEXT_RING_SIZE / CONTEXT_RING_STROKE (xT size yT 12, stroke bT 2) moved here.
const CONTEXT_RING_SIZE = 12, CONTEXT_RING_STROKE = 2;
const CONTEXT_RING_TRACK = 'var(--cds-alpha-2)', CONTEXT_RING_ROW_SIZE = 14;
function contextRingGeometry(pct, size = CONTEXT_RING_SIZE) {
  const radius = (size - CONTEXT_RING_STROKE) / 2, circumference = 2 * Math.PI * radius;
  return { size, stroke: CONTEXT_RING_STROKE, center: size / 2, radius, circumference, offset: circumference * (1 - Math.max(0, Math.min(100, pct)) / 100) };
}

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const readable = path.resolve(app, '../analysis/code-ui-unpack-20261017/readable');
// The official c6a992d55 utilities entry sheet index.html loads (current-design-assets: 4.16336.0 c6a992d55-_JRfOmTh).
const OFFICIAL = `public/assets/v1/${designEntryStylesheets.find((name) => name.startsWith('c6a992d55-'))}`;
const raw = (file) => fs.readFileSync(path.join(reference, file), 'utf8');
const h = React.createElement;
const noop = () => {};
let Core, server, probeServer, C, P, Row, Tokens, Ring, RowChin, ViewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Row = await server.ssrLoadModule('/src/source-composer-row-chin.jsx');
  Tokens = await server.ssrLoadModule('/src/generated/code-composer-v4/composer-tokens.mjs');
  Ring = await server.ssrLoadModule('/src/generated/code-composer-v4/usage-ring.mjs');
  RowChin = await server.ssrLoadModule('/src/generated/code-composer-v4/composer-row-chin.mjs');
  // E41: the chin triggers import the 3.6556.2 view-tabs file by semantic name (the legacy shim re-exports the same values).
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  // surfaces-prod-3 composer (host cutover): the host's shell subtree draws cds-core components (src/cds-core.mjs).
  Core = await server.ssrLoadModule('/src/cds-core.mjs');
  // The tooltip popups only mount on hover, so a second server wraps the view-tabs CDS Tooltip export (3.6556.2 shared-frame
  // Xm) in a probe recording the props each one receives (the file on disk is untouched).
  // composer-env (4.16336.0): the Home environment bar's own tooltips are the cds-core graph's (shared-frame Kp), probed alike.
  const probed = { '/src/generated/view-tabs/shared-frame-6jtSkIit.js': 'Xm', '/src/generated/cds-core/shared-frame.mjs': 'Kp' };
  const probe = { name: 'cds-tooltip-probe', enforce: 'pre', transform(code, id) {
    const file = Object.keys(probed).find((suffix) => id.endsWith(suffix));
    if (!file) return null;
    const local = probed[file];
    if (code.split(`${local} as CdsTooltip`).length !== 2) throw Error(`${file} no longer exports ${local} as CdsTooltip`);
    return code.replace(`${local} as CdsTooltip`, '__probeTooltip as CdsTooltip')
      + `\nimport { createElement as __probeH, Fragment as __probeF } from "react";\nfunction __probeTooltip(props) { return __probeH(__probeF, null, __probeH(${local}, props), __probeH("span", { hidden: true, "data-tooltip-probe": JSON.stringify({ content: typeof props.content === "string" ? props.content : null, detail: typeof props.detail === "string" ? props.detail : null, shortcut: props.shortcut ?? null, open: props.open ?? null, hoverable: props.hoverable ?? null, collisionPadding: props.collisionPadding ?? null }) })); }\n`;
  } };
  probeServer = await createServer({ configFile: false, root: app, plugins: [probe, react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  P = await probeServer.ssrLoadModule('/src/source-composer.jsx');
});
after(async () => { await server?.close(); await probeServer?.close(); });

const efforts = { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] };
const baseProps = { draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto', model: efforts, effort: 'high', workdir: '/tmp/fixture/project' };
const render = (props = {}, module = C) => renderToStaticMarkup(h(module.SourceComposer, { ...baseProps, ...props }));
const cls = (node) => String(node?.attrs.class ?? '');
const all = (nodes, predicate, out = []) => { for (const node of [].concat(nodes)) { if (predicate(node)) out.push(node); all(node.children, predicate, out); } return out; };
const chinOf = (html) => find(parseMarkup(html), (n) => n.attrs['data-cds'] === 'ChatComposerChin');
// R3-composer step 3 (composer-shell): the chin box is the shell's own Chin part (shared-5 Kd). Its xs row holds the
// leading slot 'flex items-center self-start' and the trailing slot 'ms-auto flex min-w-0 items-center gap-1 ps-2'
// (the former host slots sc-chin-leading / sc-chin-trailing).
const chinRow = (chin) => find(chin, (n) => n.attrs['data-size'] === 'xs');
const KD_SLOTS = { 'sc-chin-leading': 'flex items-center self-start', 'sc-chin-trailing': 'ms-auto flex min-w-0 items-center gap-1 ps-2' };
const slot = (chin, name) => chinRow(chin).children.find((n) => cls(n) === KD_SLOTS[name]);
const grid0 = (chin) => slot(chin, 'sc-chin-trailing').children[0];
const button = (nodes, hook) => find(nodes, (n) => n.tag === 'button' && cls(n).split(/\s+/).includes(hook));
const probes = (props) => [...render(props, P).matchAll(/data-tooltip-probe="([^"]*)"/g)].map((m) => JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#x27;', "'").replaceAll('&amp;', '&')));

// ---------------------------------------------------------------- layout
test("an open session's presets chin is bQ's row: the mode picker alone in 'flex items-center ms-0.5' + Sg; the trailing Va grid with Sg and compact:me-1", () => {
  const chin = chinOf(render({ fastAvailable: true }));
  assert.ok(chin, 'the session keeps a chin');
  assert.equal(chin.attrs['data-chin-layout'], 'row');
  // Kd itself: data-cds ChatComposerChin on its clip box (with bQ's row class Ua = shared-6 wg after the host hooks), the
  // xs data-size and its button tones on the inner row.
  assert.ok(cls(chin).endsWith(` sc-chin ${Tokens.composerRowChinClass}`), cls(chin));
  assert.ok(!cls(chin).split(/\s+/).includes('composer-footer'), "style.css's legacy .composer-footer would override Kd");
  assert.ok(cls(chin).startsWith('relative z-0 overflow-clip px-2 -mx-2 pt-2 @container'), 'shared-5 Kd box');
  assert.equal(chinRow(chin).attrs['data-size'], 'xs');
  assert.ok(cls(chinRow(chin)).includes(Row.CHIN_BUTTON_TONE_CLASS), "Kd's button tone classes on its row");
  const leading = slot(chin, 'sc-chin-leading');
  // surfaces-prod-3 composer (4.16336.0 c227f4d5e X6, `tt = layout === "row"`): the row's leading is
  // `tt ? ln && p("span", { "aria-hidden": !0 })` — an empty aria-hidden marker while there is a mode picker — and the
  // picker joins the trailing group as `On = tt ? ln : null`. Both literals are pinned by extract-code-composer.mjs's
  // composer-row-chin.mjs chunkFeatures (loose features of c227f4d5e-DGDdGBTz).
  assert.equal(leading.children.length, 1, 'only the marker');
  const lead = leading.children[0];
  assert.equal(lead.tag, 'span');
  assert.equal(lead.attrs['aria-hidden'], 'true');
  assert.deepEqual([cls(lead), lead.children.length], ['', 0], 'no class, no content');
  assert.equal(all(leading, (n) => n.tag === 'button').length, 0);
  assert.equal(Row.ROW_CHIN_LEADING_CLASS, undefined, "3.6556.2's leading class box is gone");
  assert.equal(Tokens.composerRowLeadingClass, undefined, 'and so is its token in the 4.16336.0 graph');
  // relink rl-composer (round 3, C1): the three literals are inside X6's declaration, which contract4 now pins by its raw
  // sha256 (composer-row-chin.mjs declarationPins.X6) and scripts/extract-composer-chin-v4.mjs cuts as ComposerSessionChin
  // (its provenance records the same sha256), instead of three loose chunk strings.
  const extractor = fs.readFileSync(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  const x6Pin = /declarationPins: \{ X6: '([0-9a-f]{64})'/.exec(extractor)?.[1];
  assert.match(x6Pin ?? '', /^[0-9a-f]{64}$/);
  const chinProvenance = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/composer-chin-v4/provenance.json'), 'utf8'));
  assert.equal(chinProvenance.roots.find((r) => r.local === 'X6')?.declarationSha256, x6Pin);
  const c227 = fs.readFileSync(path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/c227f4d5e-DGDdGBTz.js'), 'utf8');
  const x6Start = c227.indexOf('X6=A(function(e){'), x6End = c227.indexOf(',Z6=dl(', x6Start);
  assert.ok(x6Start > 0 && x6End > x6Start);
  for (const feature of ['tt?ln&&p("span",{"aria-hidden":!0})', 'On=tt?ln:null', '_(T,{children:[En,Ee,dn,Dn,On,Te,kn,xn,An]})']) {
    const at = c227.indexOf(feature);
    assert.ok(at > x6Start && at < x6End && c227.indexOf(feature, at + 1) === -1, feature);
  }
  // X6 trailing: Be(fp, "gap-1", Nn, Pn) — [En, Ee, dn model, Dn, On mode, Te, kn ring, xn status, An]. A Code composer
  // shows the effort in the model menu and as the pill's tail (c9543da06 G), so no separate EffortControl.
  const grid = slot(chin, 'sc-chin-trailing').children[0];
  assert.equal(cls(grid), `${Tokens.composerChinTrailingClass} gap-1 ${Tokens.composerRowControlClass} ${Tokens.composerRowTrailingInsetClass}`);
  assert.equal(Tokens.composerRowTrailingInsetClass, 'compact:me-1');
  assert.equal(Row.chinTrailingClass(true), cls(grid));
  assert.deepEqual(grid.children.map((n) => n.attrs['data-cds'] ?? (n.attrs.role === 'status' ? 'status' : cls(n))),
    ['ModelSelector', 'inline-flex min-w-0', Tokens.composerRingSlotClass, 'status']);
  // On: the mode picker (vQ's "inline-flex min-w-0" around tQ's button), after the model selector.
  const modeWrap = grid.children[1];
  assert.equal(modeWrap.tag, 'span');
  assert.equal(all(modeWrap, (n) => n.tag === 'button').length, 1);
  assert.ok(button(modeWrap, 'sc-permission'));
  assert.equal(Tokens.composerRingSlotClass, 'flex shrink-0 ms-px', 'shared-6 Eg (c227f4d5e Fa)');
  // No folder chip in a session chin (the titlebar's folder chip carries the session's folder menu), no stray chips.
  const html = render({});
  assert.doesNotMatch(html, /sc-folder-chip|Choose environment|EngineFooterStrip/);
});

test("the classic layout keeps bQ's chin layout: Add then Mode, the plain Va trailing, the 14px alpha-2 ring (me-px) without Fa, no DK", () => {
  const chin = chinOf(render({ codeLayout: 'classic' }));
  assert.equal(chin.attrs['data-chin-layout'], undefined);
  const leading = slot(chin, 'sc-chin-leading');
  assert.deepEqual(all(leading, (n) => n.tag === 'button').map((n) => n.attrs['aria-label']), ['Add', 'Permission mode']);
  assert.ok(!find(leading, (n) => n.tag === 'span' && n.attrs['aria-hidden'] === 'true' && n.children.length === 0 && cls(n) === ''), 'no row marker');
  assert.equal(button(grid0(chin), 'sc-permission'), null, 'the classic mode picker stays leading');
  const grid = slot(chin, 'sc-chin-trailing').children[0];
  assert.equal(cls(grid), `${Tokens.composerChinTrailingClass} gap-1`);
  // composer-ring-14 (4.16336.0 O3): always 14px; outside the row the track is alpha-2 and the trigger is "shrink-0"
  // (3.6556.2's me-px is gone: `tooltip: !1, className: "shrink-0", onPointerEnter: d,`).
  const ring = find(grid, (n) => n.tag === 'svg');
  assert.equal(ring.attrs.width, '14');
  assert.equal(find(ring, (n) => 'data-ring-track' in n.attrs).attrs.stroke, 'var(--cds-alpha-2)');
  assert.ok(cls(button(grid, 'sc-usage-trigger')).endsWith(' shrink-0 sc-usage-trigger'));
  assert.ok(!cls(button(grid, 'sc-usage-trigger')).split(/\s+/).includes('me-px'));
  assert.ok(!find(grid, (n) => cls(n) === Tokens.composerRingSlotClass), 'outside the row: no po slot');
  assert.doesNotMatch(cls(button(grid, 'sc-model-trigger')), /text-secondary/, 'DK is the row placement only');
  // The Home draft (presets, no session) hangs no chin at all: its pickers are the environment bar's.
  assert.equal(chinOf(render({ showContext: true })), null);
});

// ---------------------------------------------------------------- triggers
test('Mode: tQ — a ghost view-tabs CdsButton "min-w-0 shrink" in vQ, the generated rQ label, the openModeMenu chord tooltip', () => {
  const chin = chinOf(render({ permission: 'ask' }));
  const mode = button(chin, 'sc-permission');
  assert.equal(mode.attrs['data-cds'], 'Button');
  assert.equal(mode.attrs['data-cds-ghost'], '');
  assert.ok(cls(mode).endsWith(' min-w-0 shrink sc-permission'));
  assert.equal(mode.attrs['aria-label'], 'Permission mode', 'host accessible name (local automation)');
  assert.equal(mode.attrs['aria-haspopup'], 'menu');
  assert.equal(mode.attrs['aria-expanded'], 'false');
  assert.ok('data-base-ui-tooltip-trigger' in mode.attrs, 'under the CDS Tooltip');
  const label = find(mode, (n) => cls(n) === 'grid grid-cols-[minmax(0,1fr)]');
  assert.ok(label, 'rQ');
  assert.equal(find(label, (n) => n.attrs.id === mode.attrs['aria-describedby'])?.attrs.hidden, '');
  assert.equal(button(chinOf(render({ permissionOpen: true })), 'sc-permission').attrs['aria-expanded'], 'true');
  // The tooltip props (shared-frame Zp through the probe): Mode / the Manual warning / Bypass, with the chord, closed
  // while any chin menu is open.
  const tip = (props) => probes(props).filter((p) => p.shortcut === 'cmd+shift+m');
  assert.deepEqual(tip({ permission: 'auto' }), [{ content: 'Mode', detail: null, shortcut: 'cmd+shift+m', open: null, hoverable: null, collisionPadding: null }]);
  assert.equal(tip({ permission: 'ask' })[0].content, 'DeepSeek asks before making changes. Auto is recommended.');
  assert.equal(tip({ permission: 'bypass' })[0].content, 'DeepSeek can modify or delete files without asking');
  assert.equal(tip({ menuKind: 'permission' })[0].open, false);
  assert.equal(tip({ menuKind: 'model' })[0].open, false);
});

test('Model: the CDS ModelSelector pill — data-cds ModelSelector, "min-w-0 max-w-full" + DK text-secondary, the truncate name, the fast tier', () => {
  const grid = slot(chinOf(render({ fastMode: true, fastAvailable: true })), 'sc-chin-trailing');
  const model = button(grid, 'sc-model-trigger');
  assert.equal(model.attrs['data-cds'], 'ModelSelector');
  assert.ok(cls(model).endsWith(` min-w-0 max-w-full ${RowChin.rowModelTriggerClass} sc-model-trigger`));
  assert.equal(RowChin.rowModelTriggerClass, 'text-secondary');
  assert.ok(!('data-base-ui-tooltip-trigger' in model.attrs), 'no tooltip without a warning');
  const name = find(model, (n) => cls(n) === 'truncate');
  assert.equal(name.text, 'Fixture');
  const fast = find(name, (n) => cls(n).startsWith(Row.MODEL_PILL_FAST_CLASS));
  assert.equal(cls(fast), `${Row.MODEL_PILL_FAST_CLASS} sc-fast-label`);
  assert.equal(fast.text, ' Fast');
  assert.ok(!find(button(slot(chinOf(render({})), 'sc-chin-trailing'), 'sc-model-trigger'), (n) => cls(n).includes('sc-fast-label')));
  const loading = button(chinOf(render({ modelsLoading: true })), 'sc-model-trigger');
  assert.equal(loading.attrs.disabled, ''); assert.equal(loading.attrs['aria-busy'], 'true');
  const box = find(loading, (n) => cls(n) === Row.MODEL_PILL_LOADING_CLASS);
  assert.equal(find(box, (n) => cls(n) === 'truncate').text, 'Loading models…');
  assert.equal(button(chinOf(render({ modelOpen: true })), 'sc-model-trigger').attrs['aria-expanded'], 'true');
});

test('Effort: a Code composer folds it into the model pill (c9543da06 G, shared-7 pill tail); no EffortControl trigger', () => {
  const chin = chinOf(render({}));
  assert.equal(button(chin, 'sc-effort-trigger'), null, 'no separate effort trigger');
  const model = button(chin, 'sc-model-trigger');
  const tail = find(model, (n) => cls(n).includes('sc-effort-tail'));
  // High is the fixture model's highest level: its tail reads purple (user decision 2026-10-18); a lower one stays muted.
  assert.equal(cls(tail), `${Row.MODEL_PILL_TOP_EFFORT_CLASS} sc-effort-tail`);
  assert.equal(tail.attrs['data-top-tier'], '');
  assert.equal(tail.text.trim(), 'High');
  const low = find(button(chinOf(render({ effort: 'low' })), 'sc-model-trigger'), (n) => cls(n).includes('sc-effort-tail'));
  assert.equal(cls(low), `${Row.MODEL_PILL_FAST_CLASS} sc-effort-tail`);
  assert.equal(find(button(chinOf(render({ effort: '' })), 'sc-model-trigger'), (n) => cls(n).includes('sc-effort-tail')), null, 'no effort, no tail');
});

test('Usage: B3 — po > a ghost iconOnly CdsButton "shrink-0" (tooltip false) with the 14px ring on alpha-3, the context tooltip', () => {
  const usage = { last: { totalTokens: 64000 }, modelContextWindow: 128000 };
  const chin = chinOf(render({ usage }));
  const ring = button(chin, 'sc-usage-trigger');
  assert.equal(cls(ring.parent), 'flex shrink-0 ms-px');
  assert.equal(ring.attrs['data-cds-icon-only'], '');
  assert.ok(cls(ring).includes(' aspect-square w-control px-0 '), 'iconOnly');
  assert.ok(cls(ring).endsWith(' shrink-0 sc-usage-trigger'));
  assert.equal(ring.attrs['aria-label'], 'Usage: Context 64k / 128k (50%)');
  const svg = find(ring, (n) => n.tag === 'svg');
  assert.deepEqual([svg.attrs.width, svg.attrs.height, svg.attrs.viewBox, cls(svg), svg.attrs['aria-hidden']], ['14', '14', '0 0 14 14', '-rotate-90', 'true']);
  const track = find(svg, (n) => 'data-ring-track' in n.attrs), arc = find(svg, (n) => 'data-ring-arc' in n.attrs);
  assert.equal(track.attrs.stroke, 'var(--cds-alpha-3)', '3.6556.2 B3 `m = l ? "var(--cds-alpha-3)" : "var(--cds-alpha-2)"`');
  assert.equal(cls(arc), 'transition-[stroke-dashoffset] duration-300');
  const geometry = contextRingGeometry(50, 14);
  assert.equal(Number(arc.attrs.r), geometry.radius);
  assert.ok(Math.abs(Number(arc.attrs['stroke-dasharray']) - geometry.circumference) < 1e-9);
  assert.ok(Math.abs(Number(arc.attrs['stroke-dashoffset']) - geometry.offset) < 1e-9);
  assert.equal(arc.attrs.stroke, 'var(--cds-fill-accent)');
  assert.deepEqual(probes({ usage }).filter((p) => p.content?.startsWith('Context')), [{ content: 'Context 64k / 128k (50%)', detail: null, shortcut: null, open: null, hoverable: null, collisionPadding: null }]);
  assert.equal(probes({ usage, menuKind: 'usage' }).find((p) => p.content?.startsWith('Context')).open, false);
  assert.equal(button(chinOf(render({ menuKind: 'usage' })), 'sc-usage-trigger').attrs['aria-expanded'], 'true');
});

test('the KV ring agrees with contextRingGeometry / the B3 tracks / contextRingStroke at both sizes and every threshold', () => {
  assert.equal(CONTEXT_RING_ROW_SIZE, 14);
  // The tracks the host actually draws (3.6556.2 c227f4d5e B3 `m=l?"var(--cds-alpha-3)":"var(--cds-alpha-2)"`).
  assert.equal(Row.USAGE_RING_TRACK, CONTEXT_RING_TRACK);
  const contextRingTrack = (size) => (size === undefined ? Row.USAGE_RING_TRACK : Row.USAGE_RING_ROW_TRACK);
  for (const size of [undefined, 14]) for (const pct of [0, 18, 50, 74, 75, 89, 90, 100, 140, -5]) {
    const markup = renderToStaticMarkup(h(Ring.UsageRing, { pct, size, trackStroke: contextRingTrack(size) }));
    const [svg] = parseMarkup(markup);
    const ring = contextRingGeometry(pct, size);
    assert.equal(svg.attrs.width, String(ring.size));
    const [track, arc] = svg.children;
    assert.equal(Number(track.attrs.r), ring.radius); assert.equal(Number(track.attrs['stroke-width']), ring.stroke);
    assert.ok(Math.abs(Number(arc.attrs['stroke-dashoffset']) - ring.offset) < 1e-9, `${size}/${pct}`);
    assert.equal(arc.attrs.stroke, contextRingStroke(pct));
    assert.equal(Ring.usageRingStroke(pct), contextRingStroke(pct));
  }
});

test('the trigger components hand their props to the cds-core originals (onClick / menuTriggerProps reach the CdsButton)', () => {
  const onClick = () => 'clicked', onKeyDown = () => 'keyed';
  const model = Row.ComposerModelTrigger({ row: true, name: 'M', onClick, onKeyDown, 'aria-haspopup': 'menu' });
  assert.equal(model.type, Core.CdsButton);
  assert.equal(model.props.onClick, onClick); assert.equal(model.props.onKeyDown, onKeyDown);
  assert.equal(model.props['data-cds'], 'ModelSelector'); assert.equal(model.props.variant, 'ghost');
  const effort = Row.ComposerEffortTrigger({ tooltip: 'Effort', tooltipOpen: false, label: 'High', onClick });
  assert.equal(effort.type, Core.CdsTooltip);
  assert.deepEqual([effort.props.content, effort.props.open], ['Effort', false]);
  assert.equal(effort.props.children.type, Core.CdsButton);
  assert.equal(effort.props.children.props.onClick, onClick);
  const ring = Row.ComposerUsageRing({ pct: 10, inComposerRow: true, tooltip: 'Usage', detail: null, onClick });
  assert.equal(ring.props.className, Tokens.composerRingSlotClass);
  const ringTip = ring.props.children;
  assert.equal(ringTip.type, Core.CdsTooltip);
  assert.equal(ringTip.props.detail, undefined, 'yZ `detail: i ?? void 0`');
  assert.deepEqual([ringTip.props.children.type, ringTip.props.children.props.tooltip, ringTip.props.children.props.iconOnly], [Core.CdsButton, false, true]);
  assert.equal(ringTip.props.children.props.icon.type, Ring.UsageRing);
  assert.deepEqual([ringTip.props.children.props.icon.props.size, ringTip.props.children.props.icon.props.trackStroke], [14, 'var(--cds-alpha-3)']);
  const outside = Row.ComposerUsageRing({ pct: 10, tooltip: 'Usage' });
  assert.equal(outside.type, Core.CdsTooltip, 'outside the row: no po slot');
  // surfaces-prod-3 composer (4.16336.0 c227f4d5e O3 `tooltip: !1, className: "shrink-0", onPointerEnter: d,`, pinned by
  // extract-code-composer.mjs chunkFeatures): the trigger is "shrink-0" in and out of the row; 3.6556.2's me-px is gone.
  assert.deepEqual([outside.props.children.props.icon.props.size, outside.props.children.props.icon.props.trackStroke, outside.props.children.props.className], [14, 'var(--cds-alpha-2)', 'shrink-0']);
  // composer-env (4.16336.0): the env bar is the code-composer-v4 vge, so its own triggers (place chip tooltip $3, model
  // trigger Uye, the gone line's <edit> TextLink) are the cds-core graph's.
  assert.ok(fs.readFileSync(path.join(app, 'src/source-composer-environment-bar.jsx'), 'utf8').includes('import { CdsButton, CdsIcon, CdsTextLink, CdsTooltip, cdsClassNames } from "./cds-core.mjs";'));
  for (const file of ['src/source-composer-row-chin.jsx', 'src/source-composer-environment-bar.jsx'])
    assert.doesNotMatch(fs.readFileSync(path.join(app, file), 'utf8'), /source-tooltip|SourceTooltip/, `${file}: no host tooltip`);
  const place = probes({ showContext: true, environmentMenu: true }).find((p) => p.content === 'Environment');
  assert.deepEqual([place.hoverable, place.collisionPadding], [false, { top: 48, right: 8, bottom: 8, left: 8 }]);
});

// ---------------------------------------------------------------- styles: the official sheet, the real cascade
const HTML_ATTRS = Object.fromEntries([...(/<html\b([^>]*)>/.exec(fs.readFileSync(path.join(app, 'index.html'), 'utf8'))[1]).matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const mount = (markup) => {
  const root = element('div', { id: 'root' });
  element('html', HTML_ATTRS, [element('body', {}, [root])]);
  for (const node of parseMarkup(markup)) append(root, node);
  return root;
};
let sheets;
const cascade = () => (sheets ??= loadCascade(appSheets(app)));

// 4.16336.0 design assets (current-design-assets): index.html links the 4.16336.0 entry sheets, the legacy global sheet the
// 3.6556.2 regions still need, then the generated compatibility layer. A class the 4.16336.0 sheets dropped is styled only
// through legacy-utilities.css, and only as a registered legacy-region dependency (style-compatibility.json keeps its
// 3.6556.2 rule and names the generated region that draws it).
function loadedStyles(appRoot) {
  const read = (file) => readFileSync(path.join(appRoot, file), 'utf8');
  const names = [...designEntryStylesheets, ...legacyGlobalStylesheets];
  assert.deepEqual([...read('index.html').matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map((m) => m[1]),
    [...names.map((name) => `/assets/v1/${name}`), '/assets/legacy-utilities.css'], 'index.html stylesheet links');
  const registry = JSON.parse(read('public/style-compatibility.json'));
  return {
    official: names.map((name) => read(`public/assets/v1/${name}`)).join('\n'),
    compat: read('public/assets/legacy-utilities.css'),
    legacyRegions: (token) => (registry.rules.some((rule) => rule.baselineVersion === '3.6556.2' && rule.references.some((ref) => ref.className === token))
      ? registry.legacyDebt.owners.filter((owner) => owner.kind === 'region' && owner.classes.includes(token)).map((owner) => owner.area) : []),
  };
}

test('every class the row chin draws is compiled in the official sheet; no local rule styles the CDS triggers but the ultra tint', () => {
  const sheet = fs.readFileSync(path.join(app, OFFICIAL), 'utf8');
  // 4.16336.0 (design assets): a class the official sheet dropped counts only as a registered legacy-region dependency.
  const { compat, legacyRegions } = loadedStyles(app);
  const html = render({ fastAvailable: true, fastMode: true, usage: { last: { totalTokens: 10 }, modelContextWindow: 100 } });
  const chin = chinOf(html);
  const tokens = new Set(all(chin, () => true).flatMap((n) => cls(n).split(/\s+/)).filter((t) => t && !t.startsWith('stacks:') && !t.startsWith('sc-') && t !== 'composer-footer'));
  assert.ok(tokens.size > 60, String(tokens.size));
  const escape = (token) => '.' + token.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
  const styled = (text, t) => ['{', ':', ',', '[', ' ', '>', ')'].some((next) => text.includes(escape(t) + next));
  const missing = [...tokens].filter((t) => !styled(sheet, t));
  assert.deepEqual(missing.filter((t) => !(styled(compat, t) && legacyRegions(t).includes('code-composer'))), []);
  const css = fs.readFileSync(path.join(app, 'src/source-composer.css'), 'utf8');
  for (const gone of ['.sc-context-ring', '.sc-permission-label', '.sc-permission-text', '.sc-permission-loading', '.sc-fast-label {', '.sc-chin .sc-model-trigger {', '.sc-chin .sc-usage-trigger', '.sc-chin .sc-permission {', '.sc-chin .sc-permission:hover'])
    assert.ok(!css.includes(gone), `${gone} removed`);
  assert.match(css, /\.sc-model-trigger:not\(\[data-cds="ModelSelector"\]\) > span \{/, 'the chat composer model button keeps its truncation');
});

test('real cascade: the triggers take the official tone (Kd text-secondary, DK), the Sg geometry and the CDS Button box; ultra stays purple', () => {
  const host = mount(render({ fastAvailable: true, fastMode: true }));
  const c = cascade();
  const value = (node, property) => computed(c, node, property);
  // The winner is the official sheet's own rule on the node (or the host control reset in @layer base, which only the
  // official utilities sit above); never a local unlayered rule, never a value inherited from the host chin box.
  const official = (node, property) => {
    const r = value(node, property);
    const ok = r.from && !r.inheritedFrom && (r.from.sheet === OFFICIAL || (r.from.sheet === 'src/style.css' && r.from.layer === 'base'));
    assert.ok(ok, `${cls(node).split(' ').at(-1)} ${property}: ${r.value} from ${r.from?.sheet}:${r.from?.line} ${r.from?.layer ?? 'unlayered'}${r.inheritedFrom ? ' (inherited)' : ''}`);
    return r.value;
  };
  const mode = button(host, 'sc-permission'), model = button(host, 'sc-model-trigger'), ring = button(host, 'sc-usage-trigger');
  for (const node of [mode, model, ring])
    for (const property of ['font-family', 'font-size', 'font-weight', 'line-height', 'height', 'padding-left', 'padding-right', 'border-top-width', 'border-top-left-radius', 'background-color'])
      official(node, property);
  assert.match(official(mode, 'color'), /text-secondary/, "Kd's [&_[data-cds=Button]:not([aria-pressed=true])]:text-secondary");
  assert.match(official(ring, 'color'), /text-secondary/);
  assert.match(official(model, 'color'), /text-secondary/, 'DK');
  assert.equal(official(mode, 'height'), 'var(--cds-h-control)');
  assert.match(official(mode, 'min-width'), /^0(px)?$/);
  assert.equal(official(model, 'max-width'), '100%');
  const fast = find(model, (n) => cls(n).includes('sc-fast-label'));
  assert.match(official(fast, 'color'), /text-muted/);
  // The effort tail: the fixture's High is the model's highest level, so it reads purple from the official text-pro utility.
  const tail = find(model, (n) => cls(n).includes('sc-effort-tail'));
  assert.match(official(tail, 'color'), /text-pro/);
});

// ---------------------------------------------------------------- the shipped chunks
test('the host transcriptions are the shipped 2.42304.0 strings (tQ / vQ / _Q, ModelSelector pill, EffortControl, Kd, Y_, zy)', () => {
  const card = raw('c227f4d5e-Ba-r--Rl.js');
  for (const literal of [Row.MODE_TRIGGER_WRAP_CLASS, Row.MODE_TRIGGER_CLASS, 'relative block', 'absolute inset-0 flex items-center'])
    assert.ok(card.includes(`className:${JSON.stringify(literal)}`), literal);
  const model = raw('shared-7-B8UIMGDr.js');
  for (const literal of [Row.MODEL_PILL_CLASS, '@max-[280px]:hidden', Row.MODEL_PILL_LOADING_CLASS]) assert.ok(model.includes(JSON.stringify(literal)), literal);
  assert.ok(model.includes('"data-cds":"ModelSelector"'));
  const pill = fs.readFileSync(path.join(readable, 'shared-7-B8UIMGDr.js'), 'utf8');
  for (const pin of ['ax = "min-w-0 max-w-full",', 'ox = "@max-[280px]:hidden",', 'B = z ? "ms-1" : !1,', 'className: gl("text-muted", ox, B),', 'className: gl(ax, l),'])
    assert.ok(pill.includes(pin), pin);
  assert.equal(Row.MODEL_PILL_FAST_CLASS, 'text-muted @max-[280px]:hidden ms-1');
  const effort = raw('c8e04f916-__6cSvtd.js');
  for (const pin of ['"data-cds":"ModelSelectorEffort"', JSON.stringify(Row.EFFORT_TRIGGER_CLASS), 'className:"min-w-0 truncate"']) assert.ok(effort.includes(pin), pin);
  assert.ok(raw('shared-5-kdJVRUsT.js').includes(JSON.stringify(Row.CHIN_BUTTON_TONE_CLASS)), 'Kd button tone');
  assert.ok(raw('c73f45bc3-CFrHin0p.js').includes('ringSize:14'), 'Y_ (the environment bar ring)');
  // composer-ring-14 (3.6556.2): c227f4d5e B3 draws the ring at 14 everywhere, the row track alpha-3 in po (shared-6 Lg),
  // the non-row trigger `shrink-0 ${af}` (shared-8 TX me-px); a8 passes `inComposerRow: et` and the bar `inComposerRow:!0`.
  const v3 = (file) => fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', file), 'utf8');
  const b3 = v3('c227f4d5e-B-FYKrwT.js');
  for (const pin of ['m=l?"var(--cds-alpha-3)":"var(--cds-alpha-2)"', 'y(_f,{pct:s,trackStroke:m,stroke:c,size:14})', 'D=l?"shrink-0":`shrink-0 ${af}`',
    'l?y("span",{className:po,children:k}):k', 'inComposerRow:et'])
    assert.equal(b3.split(pin).length, 2, pin);
  assert.equal(b3.split('ringSize').length, 1, 'no ringSize any more');
  assert.ok(v3('shared-8-Db1QN4mf.js').includes('TX="me-px"'));
  assert.ok(v3('shared-6-sd9jbJqs.js').includes('Lg="flex shrink-0 ms-px"'));
  assert.ok(v3('c73f45bc3-B7hbL7H9.js').includes('inComposerRow:!0'));
  // 4.16336.0 c227f4d5e O3 (what the host follows now): the same 14px ring and tracks, but the trigger is "shrink-0" in and
  // out of the row — the 3.6556.2 non-row `me-px` inset above is gone.
  const o3 = fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1/c227f4d5e-DGDdGBTz.js'), 'utf8');
  for (const pin of ['h=l?"var(--cds-alpha-3)":"var(--cds-alpha-2)"', 'trackStroke:h,stroke:c,size:14', 'tooltip:!1,className:"shrink-0",onPointerEnter:d'])
    assert.equal(o3.split(pin).length, 2, pin);
  assert.equal(Row.USAGE_RING_TRIGGER_INSET_CLASS, undefined);
  assert.deepEqual([Row.USAGE_RING_SIZE, Row.USAGE_RING_ROW_TRACK, Row.USAGE_RING_TRACK, Row.usageRingTriggerClass(false), Row.usageRingTriggerClass(true)],
    [14, 'var(--cds-alpha-3)', 'var(--cds-alpha-2)', 'shrink-0', 'shrink-0']);
  // LK opens the row / composer model menu on top, aligned to the end; the host model menu (main.jsx "model") is placed
  // the same way.
  const lk = fs.readFileSync(path.join(readable, 'c227f4d5e-Ba-r--Rl.js'), 'utf8');
  for (const pin of ['side: t === "composer" || t === "row" ? "top" : "bottom",', 'align: t === "composer" || t === "chin" || t === "row" ? "end" : "start",'])
    assert.ok(lk.includes(pin), pin);
  assert.match(fs.readFileSync(path.join(app, 'src/source-model-menu.jsx'), 'utf8'), /<SourceMenu\.Popup anchor=\{anchor\} side="top" align="end"/);
  // composer-v02: shared-18 zy keeps the titlebar Session settings pill off whenever the pickers sit under the prompt, and
  // cc43287c9 asks it with fits:!1 (never); the host titlebar has no such pill.
  assert.ok(raw('shared-18-D4XxL6Tg.js').includes('pickersUnderPrompt:i=!1}){return!i&&e&&!t&&!n&&r}'));
  assert.ok(raw('cc43287c9-DAfOi8yP.js').includes('fits:!1,pickersUnderPrompt:'));
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/source-titlebar.jsx'), 'utf8'), /Session settings/);
});

test('main.jsx still finds the chin triggers by their hook classes (Mode / Model / Effort chords, /model, /effort, /permissions)', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('const chinNode = scope().querySelector(".sc-chin");'));
  // x6 / E21 (Q6 p): with no effort trigger the Effort chord resolves to the model menu and opens it on its Effort
  // submenu (menu data effortOpen → SourceModelMenu effortOpen).
  assert.ok(main.includes('const effortInModelMenu = !chinNode.querySelector(".sc-effort-trigger");'));
  assert.ok(main.includes('effortCount: efforts.length, modelCount: models.length, effortInModelMenu,'));
  assert.ok(main.includes('const effortOpen = command === "effort" && effortInModelMenu, kind = request.kind;'));
  assert.ok(main.includes('const trigger = chinNode.querySelector(effortOpen ? ".sc-composer .sc-model-trigger, [data-env-bar-host] .sc-model-trigger" : { mode: ".sc-permission", model: ".sc-model-trigger", effort: ".sc-effort-trigger" }[kind]);'));
  assert.ok(main.includes('openMenu(CHIN_MENU_KINDS[kind], trigger, effortOpen ? { effortOpen: true } : undefined);'));
  assert.ok(main.includes('initialHighlight={menu.entry} effortOpen={!!menu.data?.effortOpen}'));
  assert.ok(main.includes("scope().querySelector('.sc-chin .sc-effort-trigger')"));
  const chin = chinOf(render({}));
  assert.ok(cls(chin).split(/\s+/).includes('sc-chin'));
  // The Code chin has no effort trigger (the effort rides in the model pill; its chord and /effort fall back to the model trigger).
  for (const hook of ['sc-permission', 'sc-model-trigger', 'sc-usage-trigger']) assert.ok(button(chin, hook), hook);
});
