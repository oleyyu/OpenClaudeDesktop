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
import { CONTEXT_RING_ROW_SIZE, CONTEXT_RING_ROW_TRACK, CONTEXT_RING_TRACK, contextRingGeometry, contextRingStroke, contextRingTrack } from '../src/context-usage-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const readable = path.resolve(app, '../analysis/code-ui-unpack-20261017/readable');
const OFFICIAL = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';
const raw = (file) => fs.readFileSync(path.join(reference, file), 'utf8');
const h = React.createElement;
const noop = () => {};
let server, probeServer, C, P, Row, Tokens, Ring, RowChin, ViewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Row = await server.ssrLoadModule('/src/source-composer-row-chin.jsx');
  Tokens = await server.ssrLoadModule('/src/generated/code-composer/composer-tokens.mjs');
  Ring = await server.ssrLoadModule('/src/generated/code-composer/usage-ring.mjs');
  RowChin = await server.ssrLoadModule('/src/generated/code-composer/composer-row-chin.mjs');
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  // The tooltip popups only mount on hover, so a second server wraps the view-tabs CDS Tooltip export (shared-frame Zp)
  // in a probe recording the props each one receives (the file on disk is untouched).
  const probe = { name: 'cds-tooltip-probe', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('/src/generated/view-tabs/shared-frame-BfjMqbuN.js')) return null;
    if (code.split('Zp as CdsTooltip').length !== 2) throw Error('shared-frame no longer exports Zp as CdsTooltip');
    return code.replace('Zp as CdsTooltip', '__probeTooltip as CdsTooltip')
      + '\nimport { createElement as __probeH, Fragment as __probeF } from "react";\nfunction __probeTooltip(props) { return __probeH(__probeF, null, __probeH(Zp, props), __probeH("span", { hidden: true, "data-tooltip-probe": JSON.stringify({ content: typeof props.content === "string" ? props.content : null, detail: typeof props.detail === "string" ? props.detail : null, shortcut: props.shortcut ?? null, open: props.open ?? null, hoverable: props.hoverable ?? null, collisionPadding: props.collisionPadding ?? null }) })); }\n';
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
  assert.equal(leading.children.length, 1, 'only the mode picker');
  const lead = leading.children[0];
  // bQ `Ot`: the literal of the row branch is l_ + " " + Sg, both generated from shared-6.
  assert.equal(cls(lead), Row.ROW_CHIN_LEADING_CLASS);
  assert.equal(Row.ROW_CHIN_LEADING_CLASS, `${Tokens.composerRowLeadingClass} ${Tokens.composerRowControlClass}`);
  assert.ok(raw('c227f4d5e-Ba-r--Rl.js').includes(JSON.stringify(Row.ROW_CHIN_LEADING_CLASS)), 'verbatim in c227f4d5e');
  assert.equal(lead.tag, 'span');
  assert.equal(cls(lead.children[0]), 'inline-flex min-w-0', 'vQ');
  assert.equal(all(leading, (n) => n.tag === 'button').length, 1);
  assert.ok(button(leading, 'sc-permission'));
  // bQ trailing: Bo(Va, "gap-1", Sg, "compact:me-1"), holding the model selector, the ring slot and Dt. A Code composer
  // shows the effort in the model menu and as the pill's tail (c9543da06 G), so no separate EffortControl.
  const grid = slot(chin, 'sc-chin-trailing').children[0];
  assert.equal(cls(grid), `${Tokens.composerChinTrailingClass} gap-1 ${Tokens.composerRowControlClass} compact:me-1`);
  assert.equal(Row.chinTrailingClass(true), cls(grid));
  assert.deepEqual(grid.children.map((n) => n.attrs['data-cds'] ?? (n.attrs.role === 'status' ? 'status' : cls(n))),
    ['ModelSelector', Tokens.composerRingSlotClass, 'status']);
  assert.equal(Tokens.composerRingSlotClass, 'flex shrink-0 ms-px', 'shared-6 Eg (c227f4d5e Fa)');
  // No folder chip in a session chin (the titlebar's folder chip carries the session's folder menu), no stray chips.
  const html = render({});
  assert.doesNotMatch(html, /sc-folder-chip|Choose environment|EngineFooterStrip/);
});

test("the classic layout keeps bQ's chin layout: Add then Mode, the plain Va trailing, the 12px alpha-2 ring without Fa, no DK", () => {
  const chin = chinOf(render({ codeLayout: 'classic' }));
  assert.equal(chin.attrs['data-chin-layout'], undefined);
  const leading = slot(chin, 'sc-chin-leading');
  assert.deepEqual(all(leading, (n) => n.tag === 'button').map((n) => n.attrs['aria-label']), ['Add', 'Permission mode']);
  assert.ok(!find(leading, (n) => cls(n) === Row.ROW_CHIN_LEADING_CLASS));
  const grid = slot(chin, 'sc-chin-trailing').children[0];
  assert.equal(cls(grid), `${Tokens.composerChinTrailingClass} gap-1`);
  const ring = find(grid, (n) => n.tag === 'svg');
  assert.equal(ring.attrs.width, '12');
  assert.equal(find(ring, (n) => 'data-ring-track' in n.attrs).attrs.stroke, 'var(--cds-alpha-2)');
  assert.ok(!find(grid, (n) => cls(n) === Tokens.composerRingSlotClass), 'an unsized ring has no Fa slot');
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

test('Usage: yZ — Fa > a ghost iconOnly CdsButton "shrink-0" (tooltip false) with the 14px KV ring on alpha-4, the context tooltip', () => {
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
  assert.equal(track.attrs.stroke, 'var(--cds-alpha-4)');
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

test('the KV ring agrees with contextRingGeometry / contextRingTrack / contextRingStroke at both sizes and every threshold', () => {
  assert.equal(CONTEXT_RING_ROW_SIZE, 14);
  assert.equal(contextRingTrack(undefined), CONTEXT_RING_TRACK);
  assert.equal(contextRingTrack(14), CONTEXT_RING_ROW_TRACK);
  assert.equal(CONTEXT_RING_ROW_TRACK, 'var(--cds-alpha-4)');
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

test('the trigger components hand their props to the view-tabs originals (onClick / menuTriggerProps reach the CdsButton)', () => {
  const onClick = () => 'clicked', onKeyDown = () => 'keyed';
  const model = Row.ComposerModelTrigger({ row: true, name: 'M', onClick, onKeyDown, 'aria-haspopup': 'menu' });
  assert.equal(model.type, ViewTabs.CdsButton);
  assert.equal(model.props.onClick, onClick); assert.equal(model.props.onKeyDown, onKeyDown);
  assert.equal(model.props['data-cds'], 'ModelSelector'); assert.equal(model.props.variant, 'ghost');
  const effort = Row.ComposerEffortTrigger({ tooltip: 'Effort', tooltipOpen: false, label: 'High', onClick });
  assert.equal(effort.type, ViewTabs.CdsTooltip);
  assert.deepEqual([effort.props.content, effort.props.open], ['Effort', false]);
  assert.equal(effort.props.children.type, ViewTabs.CdsButton);
  assert.equal(effort.props.children.props.onClick, onClick);
  const ring = Row.ComposerUsageRing({ pct: 10, ringSize: 14, tooltip: 'Usage', detail: null, onClick });
  assert.equal(ring.props.className, Tokens.composerRingSlotClass);
  const ringTip = ring.props.children;
  assert.equal(ringTip.type, ViewTabs.CdsTooltip);
  assert.equal(ringTip.props.detail, undefined, 'yZ `detail: i ?? void 0`');
  assert.deepEqual([ringTip.props.children.type, ringTip.props.children.props.tooltip, ringTip.props.children.props.iconOnly], [ViewTabs.CdsButton, false, true]);
  assert.equal(ringTip.props.children.props.icon.type, Ring.UsageRing);
  assert.equal(Row.ComposerUsageRing({ pct: 10, tooltip: 'Usage' }).type, ViewTabs.CdsTooltip, 'unsized: no Fa slot');
  // The env bar's place chip (h2's td) is the same CDS Tooltip.
  assert.ok(fs.readFileSync(path.join(app, 'src/source-composer-environment-bar.jsx'), 'utf8').includes('import { CdsButton, CdsTooltip, cdsClassNames } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";'));
  for (const file of ['src/source-composer-row-chin.jsx', 'src/source-composer-environment-bar.jsx'])
    assert.doesNotMatch(fs.readFileSync(path.join(app, file), 'utf8'), /source-tooltip|SourceTooltip/, `${file}: no host tooltip`);
  const place = probes({ showContext: true, environmentMenu: true }).find((p) => p.content === 'Where DeepSeek runs');
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

test('every class the row chin draws is compiled in the official sheet; no local rule styles the CDS triggers but the ultra tint', () => {
  const sheet = fs.readFileSync(path.join(app, OFFICIAL), 'utf8');
  const html = render({ fastAvailable: true, fastMode: true, usage: { last: { totalTokens: 10 }, modelContextWindow: 100 } });
  const chin = chinOf(html);
  const tokens = new Set(all(chin, () => true).flatMap((n) => cls(n).split(/\s+/)).filter((t) => t && !t.startsWith('stacks:') && !t.startsWith('sc-') && t !== 'composer-footer'));
  assert.ok(tokens.size > 60, String(tokens.size));
  const escape = (token) => '.' + token.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
  assert.deepEqual([...tokens].filter((t) => !['{', ':', ',', '[', ' ', '>', ')'].some((next) => sheet.includes(escape(t) + next))), []);
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
  assert.ok(main.includes('trigger = chinNode.querySelector({ mode: ".sc-permission", model: ".sc-model-trigger", effort: ".sc-effort-trigger" }[kind]);'));
  // x6: in the environment bar (no effort trigger) the Effort chord opens the model menu, as the official bar does.
  assert.ok(main.includes('if (!trigger && kind === "effort") { trigger = chinNode.querySelector(".sc-composer .sc-model-trigger, [data-env-bar-host] .sc-model-trigger"); if (trigger) kind = "model"; }'));
  assert.ok(main.includes('openMenu(CHIN_MENU_KINDS[kind], trigger);'));
  assert.ok(main.includes("scope().querySelector('.sc-chin .sc-effort-trigger')"));
  const chin = chinOf(render({}));
  assert.ok(cls(chin).split(/\s+/).includes('sc-chin'));
  // The Code chin has no effort trigger (the effort rides in the model pill; its chord and /effort fall back to the model trigger).
  for (const hook of ['sc-permission', 'sc-model-trigger', 'sc-usage-trigger']) assert.ok(button(chin, hook), hook);
});
