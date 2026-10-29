// w10-shell-model-menu (notdone 33, 34; composer-model-selector-extras): the Code ModelSelector's 3.6556.2 Fast row and
// name badges. Official: shared-7-DBAgAi5H _w / aw / iw / rw / ew, c227f4d5e R$ (fastModeUnavailableRow,
// effortSliderOverlay, modelFallback). Loaded through Vite (the menu is JSX over view-tabs); nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const raw = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const once = (text, pin) => assert.equal(text.split(pin).length - 1, 1, pin);
let server, menu, CdsBadge, CdsHiddenReasonText;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  menu = await server.ssrLoadModule('/src/source-model-menu.jsx');
  ({ CdsBadge, CdsHiddenReasonText } = await server.ssrLoadModule('/src/generated/view-tabs/index.js'));
});
after(async () => { await server?.close(); });

function renderOnce(component, props) {
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':fast:', useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) { for (const node of tree) { const hit = find(node, predicate); if (hit) return hit; } return null; }
  if (tree.props && predicate(tree)) return tree;
  return find(tree.props?.children, predicate);
}
function findAll(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { for (const node of tree) findAll(node, predicate, out); return out; }
  if (tree.props && predicate(tree)) out.push(tree);
  findAll(tree.props?.children, predicate, out);
  return out;
}
const baseProps = (extra) => ({ anchor: null, models: [{ id: 'm', displayName: 'M' }], selected: 'm', onSelect() {}, onClose() {}, onFastModeChange() {}, ...extra });
/** The Fast row: SourceModelMenu → FastRow element → its tree (wrapper/tooltip) and the SourceMenu.Item. */
function fastRow(props) {
  const tree = renderOnce(menu.SourceModelMenu, baseProps(props));
  const row = find(tree, (node) => node.type?.name === 'FastRow');
  assert.ok(row, 'FastRow rendered');
  const body = renderOnce(row.type, row.props);
  const item = find(body, (node) => node.props?.['data-speed']);
  return { row, body, item };
}
const nameBadge = (item) => {
  const name = find(item.props.children, (node) => node.type?.name === 'ModelName');
  const out = renderOnce(name.type, name.props);
  const badge = find(out, (node) => node.type?.name === 'NameBadge');
  return badge ? renderOnce(badge.type, badge.props) : null;
};

test('official 3.6556.2 _w / aw / rw / ew pins', () => {
  const selector = raw('shared-7-DBAgAi5H.js');
  for (const pin of [
    // _w: the CTA makes a non-warning name badge neutral; the reason gets a useId mirror that the item names.
    'J2($,10,r,c)?K2($,10,r,c,c&&r&&r.variant!=="warning"?{...r,variant:"neutral"}:r):$[12]',
    'u=T(),d=s?.reason?u:void 0',
    'h(q.Item,{keepOpen:p,onClick:f,disabled:l,"aria-describedby":d,...m,trailing:g,children:S})',
    'w=s?.reason||i,E=s!==void 0',
    'h(aw,{content:w,wrapForDisabled:E,mirrorId:d,staysOnPress:l,children:C})',
    // aw: the wrapper holds the item and the mirror span (ie), under the end-side multiline tooltip (te).
    '{content:t,wrapForDisabled:n,mirrorId:r,staysOnPress:i,children:a}=e,o=i!==void 0&&i;if(!t)return a;let s=!o&&void 0',
    'n?x("div",{children:[a,r?h(ie,{id:r,reason:t}):null]}):a',
    'h(te,{content:t,multiline:!0,closeOnClick:s,children:c})',
    // rw / ew: the name badge.
    'var $C=new Set(["neutral","accent","warning"]);function ew(e){return $C.has(e)?e:"neutral"}',
    'h(ge,{variant:ew(t.variant),size:"xxs",truncate:!0,children:t.message})',
    'h(ge,{variant:ew(t.variant),size:"xxs",icon:r,className:"min-w-0 shrink",children:h("span",{className:"truncate",children:t.message})})',
  ]) once(selector, pin);
  // ie / te / ge are the view-tabs CdsHiddenReasonText / CdsEndSideTooltip / CdsBadge (shared-frame exports Pu / Oc / ad).
  for (const pin of ['Pu as ie', 'Oc as te', 'ad as ge']) assert.ok(selector.includes(pin), pin);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.equal(manifest.publicNames.CdsHiddenReasonText.export, 'Pu');
  assert.equal(manifest.publicNames.CdsBadge.export, 'ad');
});

test('notdone 34: a reason that does not grey the row is a hidden mirror span named by aria-describedby, not aria-description', () => {
  const blocked = { key: 'fast', name: 'Fast', disabled: true, disabled_reason: { message: 'Not on this plan' }, selection_notice: { cta: { copy: 'Upgrade' } }, badge: { message: 'New', variant: 'accent' } };
  const { body, item } = fastRow({ fastTier: blocked, onFastIntent() {} });
  assert.equal(item.props['data-fast-unavailable'], 'cta');
  assert.equal(item.props.disabled, false, 'not greyed');
  assert.equal(item.props['aria-describedby'], ':fast:');
  assert.equal(item.props['aria-description'], undefined);
  assert.equal(item.props.disabledReason, undefined, '_w hands q.Item no disabledReason');
  const mirror = find(body, (node) => node.type === CdsHiddenReasonText);
  assert.deepEqual(mirror.props, { id: ':fast:', reason: 'Not on this plan' });
  assert.equal(body.props.content, 'Not on this plan');
  assert.equal(body.props.closeOnClick, undefined, 'staysOnPress false: the default closeOnClick');
  // The official mirror markup.
  assert.equal(renderToStaticMarkup(React.createElement(CdsHiddenReasonText, mirror.props)), '<span id=":fast:" hidden="" data-cds-disabled-reason="">Not on this plan</span>');
  // notdone 33: the CTA's non-warning name badge turns neutral (xxs, truncate).
  const badge = nameBadge(item);
  assert.equal(badge.type, CdsBadge);
  assert.deepEqual([badge.props.variant, badge.props.size, badge.props.truncate, badge.props.children], ['neutral', 'xxs', true, 'New']);
  assert.equal(item.props.trailing.type, CdsBadge);
  assert.equal(item.props.trailing.props.variant, 'accent');
});

test('notdone 33/34: greyed keeps its tooltip open on press; a warning badge stays warning; an available tier has no mirror', () => {
  const blocked = { key: 'fast', name: 'Fast', disabled: true, disabled_reason: { message: 'Not on this plan' }, badge: { message: 'Busy', variant: 'warning' } };
  const greyed = fastRow({ fastTier: blocked });
  assert.equal(greyed.item.props['data-fast-unavailable'], 'greyed');
  assert.equal(greyed.item.props.disabled, true);
  assert.equal(greyed.body.props.closeOnClick, false);
  assert.ok(find(greyed.body, (node) => node.type === CdsHiddenReasonText));
  const warning = nameBadge(greyed.item);
  assert.deepEqual([warning.props.variant, warning.props.icon, warning.props.className], ['warning', 'Warning', 'min-w-0 shrink']);
  // A CTA does not neutralise a warning badge.
  const cta = fastRow({ fastTier: { ...blocked, selection_notice: { cta: { copy: 'Upgrade' } } }, onFastIntent() {} });
  assert.equal(nameBadge(cta.item).props.variant, 'warning');
  // The host default: an available tier, its description as the tooltip, no wrapper mirror, no aria-describedby.
  const available = fastRow({ fastTier: { key: 'fast', name: 'Fast', description: 'Faster replies' } });
  assert.equal(available.item.props['aria-describedby'], undefined);
  assert.equal(available.item.props['aria-description'], undefined);
  assert.equal(available.body.props.content, 'Faster replies');
  assert.equal(find(available.body, (node) => node.type === CdsHiddenReasonText), null);
  assert.equal(nameBadge(available.item), null, 'no catalog badge, none drawn');
  const bare = fastRow({ fastTier: { key: 'fast', name: 'Fast' } });
  assert.equal(bare.body, bare.item, 'aw: no content, the item itself');
});

test('notdone 33: model and effort name badges are the official xxs CdsBadge (rw), unknown variants neutral', () => {
  const tree = renderOnce(menu.SourceModelMenu, baseProps({ models: [{ id: 'm', displayName: 'M' }, { id: 'n', displayName: 'N', badge: { message: 'Beta', variant: 'info' } }],
    defaultModel: 'm', effort: { levels: [{ reasoningEffort: 'low', badge: { message: 'Default', variant: 'neutral' } }, { reasoningEffort: 'high', badge: { message: 'High usage', variant: 'warning' } }], value: 'low', onPick() {} } }));
  const names = findAll(tree, (node) => node.type?.name === 'ModelName').map((node) => renderOnce(node.type, node.props));
  const badges = names.map((out) => find(out, (node) => node.type?.name === 'NameBadge')).filter(Boolean).map((node) => renderOnce(node.type, node.props));
  assert.deepEqual(badges.map((badge) => [badge.type === CdsBadge, badge.props.variant, badge.props.size]), [[true, 'neutral', 'xxs'], [true, 'neutral', 'xxs']]);
  assert.deepEqual(badges.map((badge) => badge.props.children), ['Default', 'Beta']);
  assert.equal(menu.badgeVariant('accent'), 'accent');
  assert.equal(menu.badgeVariant('info'), 'neutral');
  const section = find(tree, (node) => node.type?.name === 'EffortSection');
  const effortNames = findAll(renderOnce(section.type, section.props), (node) => node.type?.name === 'ModelName').map((node) => renderOnce(node.type, node.props));
  const effortBadges = effortNames.map((out) => find(out, (node) => node.type?.name === 'NameBadge')).map((node) => renderOnce(node.type, node.props));
  assert.deepEqual(effortBadges.map((badge) => [badge.props.variant, badge.props.icon]), [['neutral', undefined], ['warning', 'Warning']]);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/source-model-menu.jsx'), 'utf8'), /className="sm-model-badge"/);
});

test('composer-model-selector-extras: R$ fastModeUnavailableRow / onFastModeCta over the Fast row', () => {
  const view = raw('c227f4d5e-B-FYKrwT.js');
  for (const pin of [
    'B=b?.type,V=b?.line,H=b?.reason,ee=b?.cta,U=ee?.copy,W=ee?.intent',
    'options:e.fast_mode.options?.map(e=>e.id==="off"?e:{...e,description:V,badge:void 0}),disabled:!0,disabled_reason:{type:B,message:H},selection_notice:U===void 0||W===void 0?null:{cta:{copy:U,intent:W}}',
    '_e=_&&!b?"fast":"off",ve=b?Wt:v,be=b?.cta?.run',
    'onFastModeChange:ve,onFastModeCta:be',
  ]) once(view, pin);
  assert.ok(raw('shared-8-Db1QN4mf.js').includes('if(e.source==="fast_mode"){p?.();return}'), 'shared-8 st: a fast_mode CTA runs onFastModeCta');

  const tier = { key: 'fast', name: 'Fast', description: 'Faster', badge: { message: 'New' } };
  assert.equal(menu.applyFastUnavailableRow(tier, null), tier);
  assert.deepEqual(menu.applyFastUnavailableRow(tier, { type: 'fast_mode_unavailable', line: 'Not available', reason: 'Only with the Claude API' }),
    { key: 'fast', name: 'Fast', description: undefined, badge: undefined, line: 'Not available', disabled: true,
      disabled_reason: { type: 'fast_mode_unavailable', message: 'Only with the Claude API' }, selection_notice: null });

  // A row without a CTA: greyed under its reason, the line below the name, the switch off even with fast mode on.
  const toggles = [];
  const greyed = fastRow({ fastTier: tier, fastMode: true, onFastModeChange: (value) => toggles.push(value),
    fastUnavailableRow: { type: 'fast_mode_unavailable', line: 'Not available', reason: 'Only with the Claude API' } });
  assert.equal(greyed.item.props['data-fast-unavailable'], 'greyed');
  assert.equal(greyed.item.props['aria-checked'], false);
  assert.equal(greyed.body.props.content, 'Only with the Claude API');
  assert.ok(find(greyed.item.props.children, (node) => node.props?.className === 'sm-fast-description' && node.props.children === 'Not available'));
  greyed.row.props.onToggle();
  assert.deepEqual(toggles, [], 've=b?Wt:v: a toggle does nothing');
  // With a CTA: the accent CTA badge, whose click runs the row's run.
  const runs = [];
  const cta = fastRow({ fastTier: tier, fastUnavailableRow: { type: 'credits_required', line: 'Needs credits', reason: 'Buy credits to use fast mode',
    cta: { copy: 'Buy credits', intent: 'fast_mode_credits', run: () => runs.push('run') } } });
  assert.equal(cta.item.props['data-fast-unavailable'], 'cta');
  assert.equal(cta.item.props.trailing.props.children, 'Buy credits');
  cta.row.props.unavailable.cta.onActivate();
  assert.deepEqual(runs, ['run']);
});

test('composer-model-selector-extras: effortSliderOverlay and modelFallback sit outside the model menu popup', () => {
  const view = raw('c227f4d5e-B-FYKrwT.js');
  // P$ → y$ lit overlay goes to the separate Effort control (shared-8 effort.sliderOverlay → shared-7 jw → lazy
  // c8e04f916 EffortControl), already the host's effort popover (source-composer.jsx EffortLitOverlay).
  once(view, 'function P$(e){return y("span",{className:"epitaxy-root text-body text-primary break-words contents",children:y(y$,{lit:e.atMax})})}');
  once(view, 'J=Dd(re?.thinking?.effort_options?.at(-1)?.id)?P$:void 0');
  assert.ok(raw('shared-8-Db1QN4mf.js').includes('sliderOverlay:e.effortSliderOverlay'));
  assert.ok(raw('shared-7-DBAgAi5H.js').includes('h(jw,{label:u,open:d,defaultOpen:s,onOpenChange:C,sliderOverlay:f,'));
  assert.ok(fs.readFileSync(path.join(ROOT, 'src/source-composer.jsx'), 'utf8').includes('<EffortLitOverlay lit={atMax} />'));
  // modelFallback is the session's refusal fallback (cc43287c9 `D=Cj(...)`, c06cf64bb `e?.refusalFallback??e?.restoredRefusalFallback`)
  // marked on the TRIGGER (L$, "This session switched to {fallback} after …safeguards flagged a message"), not the popup.
  once(view, 'function F$(e,t,n){return t.unsupported?Xt(e):n??t.name}');
  assert.ok(view.includes('This session switched to {fallback} after safeguards flagged a message. Pick a model to switch back.'));
  assert.ok(raw('c06cf64bb-CdJdJuVd.js').includes('function qk(e){return e?.refusalFallback??e?.restoredRefusalFallback??null}'));
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/source-model-menu.jsx'), 'utf8'), /safeguards|originalModel|fallbackModel/);
});
