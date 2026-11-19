import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractChatComposer } from '../scripts/extract-chat-composer.mjs';
import { chatComposerMessages, chatPlaceholderRotation } from '../src/generated/chat-composer/messages.mjs';
import { modelSelector, modelSelectorMessages, splitModelName, modelSelectorPopupClass, modelSelectorSubmenuPopupClass } from '../src/generated/chat-composer/model-selector.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// w13-chatui-composer-shell (research/w13-chatui.md H3 / K4 / K6): the Chat / Cowork card's reply placeholder is shared-8
// XI replyToClaude, its model control is shared-8 $H's `model-selector-dropdown` trigger as c6eb5f8cf dn passes it
// (compact, "!rounded-lg") with NH's label, and the chin no longer carries the Chat / Cowork switch (the app switch does).
// regions-chat: the generator now reads 4.16336.0 (shared-8-BqfCbkJd qU / DU / OU, c6eb5f8cf-DNzkXANb _n, shared-9-BgdM6Y1f
// YD / eO / gO); the 3.6556.2 names stay as the roots' keys.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(v1, 'assets/v1', name), 'utf8');
const shared8 = official('shared-8-BqfCbkJd.js');
const mini = official('c6eb5f8cf-DNzkXANb.js');
const enUS = JSON.parse(fs.readFileSync(path.join(v1, 'i18n/en-US.json'), 'utf8'));
const host = fs.readFileSync(path.join(app, 'src/source-chat-composer.jsx'), 'utf8');

let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-chat-composer.jsx');
});
after(() => server?.close());

const noop = () => {};
const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
const render = props => renderToStaticMarkup(React.createElement(C.SourceChatComposer, {
  editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'How can I help you today?' }),
  draft: '', scope: 'chat:fixture', mode: 'chat', onMenu: noop, onStop: noop, onFolder: noop,
  disabled: false, busy: false, sending: false, canSend: false, showStop: false,
  model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', ...props }));
const triggerOf = html => {
  const at = html.indexOf('data-testid="model-selector-dropdown"');
  assert.ok(at >= 0, 'model-selector-dropdown rendered');
  const start = html.lastIndexOf('<div class="overflow-hidden', at);
  const end = html.indexOf('</button></div>', at);
  return { tag: html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1), whole: html.slice(start, end + 15) };
};
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

test('the generator is current (--check)', async () => {
  const manifest = await extractChatComposer({ check: true });
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  // w13-close-chat-composer: + oD / dD (the placeholder rotation), WH / jH (KH's rows), shared-28 wE / TE / hE;
  // regions-chat: + OU (4.16336.0 NH's right-to-left tail part); integration-3 review-0 P1: + FQ / AK / chinEnd (the chin end's call).
  // relink C2 S1: + gO / fO / gD (the card's outer shell; literals in card.mjs).
  assert.deepEqual(Object.keys(manifest.roots).sort(), ['$H', 'KH', 'NH', 'OU', 'QH', 'XI', 'ZH', 'dn', 'kH', 'lD', 'oD', 'dD', 'WH', 'jH', 'wE', 'TE', 'hE', 'FQ', 'AK', 'chinEnd', 'gO', 'fO', 'gD',
    // chat-home r1-02/03: + VR / GR / WR / tz / JR and OR / MR / NR / PR / kR (the send action, send-action.mjs).
    'VR', 'GR', 'WR', 'tz', 'JR', 'OR', 'MR', 'NR', 'PR', 'kR',
    // chat-cowork-1to1 r3 chat-home-r3-05: + BD (the classic editor's attributes, card.mjs chatComposerEditor).
    'BD',
    // marlin-chin (U-MARLIN): + GQ / KQ / HQ / lC / mC / PT / tO (the marlin chin, chin.mjs) and t_ / n_ / k_ (its chin-mic slot).
    'GQ', 'KQ', 'HQ', 'lC', 'mC', 'PT', 'tO', 't_', 'n_', 'k_'].sort());
  // The real 4.16336.0 locals the features locate.
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.roots).map(([key, root]) => [key, `${root.source}#${root.local}`])), {
    XI: 'shared-8-BqfCbkJd.js#gI', lD: 'shared-9-BgdM6Y1f.js#QD', kH: 'shared-8-BqfCbkJd.js#CU', ZH: 'shared-8-BqfCbkJd.js#GU',
    QH: 'shared-8-BqfCbkJd.js#KU', $H: 'shared-8-BqfCbkJd.js#qU', NH: 'shared-8-BqfCbkJd.js#DU', OU: 'shared-8-BqfCbkJd.js#OU',
    KH: 'shared-8-BqfCbkJd.js#BU', dn: 'c6eb5f8cf-DNzkXANb.js#_n', oD: 'shared-9-BgdM6Y1f.js#YD', dD: 'shared-9-BgdM6Y1f.js#eO',
    WH: 'shared-8-BqfCbkJd.js#RU', jH: 'shared-8-BqfCbkJd.js#TU', wE: 'shared-33-DtdykY0y.js#rS', TE: 'shared-33-DtdykY0y.js#iS',
    hE: 'shared-33-DtdykY0y.js#Jx', FQ: 'shared-8-BqfCbkJd.js#FQ', AK: 'shared-8-BqfCbkJd.js#AK', chinEnd: 'shared-19-UalAfDtn.js#kw',
    gO: 'shared-9-BgdM6Y1f.js#gO', fO: 'shared-9-BgdM6Y1f.js#fO', gD: 'shared-9-BgdM6Y1f.js#gD', BD: 'shared-9-BgdM6Y1f.js#BD',
    ...Object.fromEntries(['VR', 'GR', 'WR', 'tz', 'JR', 'OR', 'MR', 'NR', 'PR', 'kR'].map((k) => [k, `shared-8-BqfCbkJd.js#${k}`])),
    ...Object.fromEntries(['GQ', 'KQ', 'HQ'].map((k) => [k, `shared-8-BqfCbkJd.js#${k}`])),
    ...Object.fromEntries(['lC', 'mC', 'PT'].map((k) => [k, `shared-36-fqRFYwOb.js#${k}`])),
    ...Object.fromEntries(['tO', 't_', 'n_', 'k_'].map((k) => [k, `shared-9-BgdM6Y1f.js#${k}`])) });
  for (const root of Object.values(manifest.roots))
    assert.equal(root.sourceSha256, createHash('sha256').update(fs.readFileSync(path.join(v1, 'assets/v1', root.source))).digest('hex'), root.source);
  // The RTL label's two class constants, resolved through shared-8's imports.
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.resolved).map(([key, r]) => [key, `${r.source}:${r.export}=${r.local}`])),
    { labelRtlBaseAlign: 'shared-33-DtdykY0y.js:ni=pI', labelRtlPartBidi: 'shared-183-B2N6Zy4J.js:P=d0', cardActionsGap: 'shared-3-IQTrO7Gx.js:Fc=Lp',
      sendTestId: 'shared-1-D1bGaTaN.js:Ab=hp', sendMotionStyle: 'shared-36-fqRFYwOb.js:_r=MT',
      // chat-home-r3-05: BD's data-testid (shared-1 mp "chat-input") and kind attribute (yp "data-composer-editor").
      editorTestId: 'shared-1-D1bGaTaN.js:Mb=mp', editorKindAttribute: 'shared-1-D1bGaTaN.js:Pb=yp',
      // marlin-chin: mC's gap constant (a private numeric binding of shared-36).
      marlinBandGap: 'shared-36-fqRFYwOb.js:undefined=pC' });
  assert.deepEqual(manifest.modules.map((m) => m.target), ['card.mjs', 'chin.mjs', 'messages.mjs', 'model-selector.mjs', 'send-action.mjs']);
});

test('relink C2 S1: the card shell literals are shared-9 gO / fO\'s (raw chunk text) and the host reads them from card.mjs', async () => {
  const { chatComposerCard: card } = await import('../src/generated/chat-composer/card.mjs');
  assert.deepEqual({ ...card, dropScope: { ...card.dropScope }, form: { ...card.form } }, {
    holderClass: 'relative in-data-cds-dock-masked:bg-page', className: 'px-2 md:px-0', cardFontClass: '[--cmp-font-size:var(--cds-font-size-heading)]',
    dropScope: { page: 'page', card: 'card' }, variant: 'incognito', form: { new: 'new', reply: 'reply' }, size: 'lg', editorMinLines: 2, actionsGap: 'tight' });
  const s9 = official('shared-9-BgdM6Y1f.js');
  assert.ok(s9.includes('s("div",{className:"relative in-data-cds-dock-masked:bg-page","data-composer-card-holder":"","data-dictating":'));
  assert.ok(s9.includes('Ne=C?"page":"card",Pe=A?"incognito":void 0,Fe=z?"new":"reply",Ie=Se?"lg":void 0,Le=!xe&&"[--cmp-font-size:var(--cds-font-size-heading)]"'));
  assert.ok(s9.includes('J=be?2:void 0') && s9.includes('We=be?ds:void 0') && s9.includes('Se=vf()'));
  assert.match(official('shared-3-IQTrO7Gx.js'), /[,;]Lp="tight"/);
  // S2: size "lg" needs vf() (shared-33 Bk, the voyage_composer_marlin design context), off for this host (D29), so no size.
  assert.doesNotMatch(host, /size=\{?['"]lg/);
  // The host no longer spells the literals; it reads card.mjs.
  assert.match(host, /^import \{ chatComposerCard \} from '\.\/generated\/chat-composer\/card\.mjs';$/m);
  for (const literal of ['px-2 md:px-0', 'relative in-data-cds-dock-masked:bg-page', '[--cmp-font-size:var(--cds-font-size-heading)]', "'tight'", 'dropScope="card"'])
    assert.ok(!host.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n').includes(literal), literal);
});

test('generated copy and literals are the 4.16336.0 originals, verbatim', () => {
  // Message descriptors: same id and text as the shipped en-US catalog.
  for (const descriptor of [...Object.values(chatComposerMessages), ...Object.values(modelSelectorMessages)])
    assert.equal(enUS[descriptor.id], descriptor.defaultMessage, descriptor.id);
  assert.equal(chatComposerMessages.replyToClaude.defaultMessage, 'Reply to Claude…');
  assert.ok(shared8.includes('replyToClaude:{defaultMessage:"Reply to Claude\\u2026",id:"ZA4ifEIe2U"}'));
  // $H's trigger, raw (unformatted) chunk text.
  assert.match(shared8, /render:\w+\(\w+,\{variant:"ghost","data-testid":"model-selector-dropdown","aria-label":\w+,icon:\w+,iconPosition:"end",className:\w+,disabled:\w+,"aria-busy":\w+,children:\w+\}\)/);
  assert.match(shared8, /\{name:"CaretDown",customSize:12,className:"opacity-75 @max-\[280px\]:!hidden"\}/);
  for (const literal of [modelSelector.trigger.typeClass, modelSelector.trigger.compactClass, modelSelector.trigger.tooltipWrapperClass,
    modelSelector.trigger.emptyClass, modelSelector.loading.className, modelSelector.label.name, modelSelector.label.tail,
    modelSelector.menu.moreModelsTestId, modelSelector.menu.noMatchesClass, modelSelectorPopupClass, modelSelectorSubmenuPopupClass])
    assert.ok(shared8.includes(`"${literal}"`), literal);
  assert.ok(shared8.includes('`inline-flex min-w-0 ${'), 'NH root class template');
  assert.match(shared8, /\?"text-footnote":\w+\?"text-xs":"text-\[14px\] h-\[14px\]"\} leading-none items-baseline`/);
  assert.equal((mini.match(/placement:"compact",compact:!0,[^}]*?triggerClassName:"!rounded-lg"/g) ?? []).length, 2, 'c6eb5f8cf dn passes compact + !rounded-lg twice');
  // kH, sliced verbatim.
  assert.deepEqual(splitModelName('Opus 4.5 (1M)'), { base: 'Opus 4.5', tail: '(1M)' });
  assert.deepEqual(splitModelName('Fixture'), { base: 'Fixture', tail: '' });
});

test('new chat: the chin trailing is $H\'s model-selector-dropdown trigger with NH\'s label', () => {
  const html = render({});
  const { tag, whole } = triggerOf(html);
  assert.ok(whole.startsWith('<div class="overflow-hidden min-w-0 p-2 -m-2"><button'), 'tooltip wrapper div');
  assert.equal(attr(tag, 'data-cds'), 'Button');
  assert.match(tag, /data-cds-ghost=""/);
  assert.equal(attr(tag, 'aria-label'), 'Model: Fixture');
  assert.equal(attr(tag, 'aria-haspopup'), 'menu');
  const cls = attr(tag, 'class');
  // integration-3 review-0 P1: the chin end is 4.16336.0 shared-19 → FQ → AK → qU: FQ passes showChevron:!1 and
  // textSize:"inherit", AK compact:false ("onpage") and "!rounded !min-w-0 !shrink"; qU drops the type class, the compact
  // class and the CaretDown, and DU's root takes no size class (the chin's own text size).
  assert.ok(shared8.includes('g(AK,{placement:t,disabled:n,showChevron:!1,textSize:"inherit"})'), 'FQ → AK call');
  assert.match(shared8, /\w+=\w+\|\|o!==void 0\?"!rounded !min-w-0 !shrink":"!rounded"/);
  assert.match(shared8, /Ot=p!=="inherit"&&\(U\|\|p==="footnote"\)&&K,kt=U&&"!px-1\.5 !h-7"/);
  assert.match(shared8, /W=h===void 0\|\|h/);
  assert.match(official('shared-19-UalAfDtn.js'), /i\.kind!=="code"&&g\(yl,\{placement:"onpage",beforeRing:H,noLeadingControls:e===null\}\)/);
  assert.deepEqual(modelSelector.chin, { placement: 'onpage', compact: false, showChevron: false, textSize: 'inherit', triggerClassName: '!rounded !min-w-0 !shrink' });
  assert.ok(cls.endsWith(' max-w-full !rounded !min-w-0 !shrink sc-model-trigger'), cls);
  assert.doesNotMatch(cls, /text-\[14px\]|!px-1\.5|!rounded-lg|compact:!h-6/);
  assert.doesNotMatch(cls, /surface-model/, 'no host surface-model styling on the official trigger');
  assert.doesNotMatch(tag, / disabled=""/);
  assert.match(whole, /<div class="inline-flex min-w-0  leading-none items-baseline"><div class="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap select-none">Fixture<\/div><\/div>/);
  assert.doesNotMatch(whole, /opacity-75 @max-\[280px\]:!hidden/, 'no CaretDown (showChevron false)');
  // The c6eb5f8cf dn defaults (compact, caret, !rounded-lg) are unchanged for a caller that passes nothing.
  const alone = renderToStaticMarkup(React.createElement(C.ChatModelTrigger, { model: { model: 'f', displayName: 'Fixture' } }));
  assert.ok(alone.includes('max-w-full text-[14px]/[1.4] font-[430] [font-variation-settings:normal] !px-1.5 !h-7 !rounded-lg sc-model-trigger'), alone);
  assert.match(alone, /class="opacity-75 @max-\[280px\]:!hidden"/);
  assert.ok(alone.indexOf('Fixture') < alone.indexOf('opacity-75'), 'iconPosition end');
  assert.match(alone, /<div class="inline-flex min-w-0 text-xs leading-none items-baseline">/);
  // The chin's buttons: the model trigger only; no host "Model" label left. w13-close-chat-surface (E73): the Chat chin's
  // folder picker is gone (shared-8 yP "disabled"; w13-close-chat-surface.test.mjs), Cowork keeps it (below).
  const chin = html.slice(html.indexOf('data-cds="ChatComposerChin"'));
  assert.deepEqual([...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Model: Fixture']);
});

test('the label splits the version tail and appends the thinking label with " · "', () => {
  const { whole, tag } = triggerOf(render({ model: { model: 'opus', displayName: 'Opus 4.5 (1M)' }, effort: 'high', effortLabel: 'High' }));
  assert.equal(attr(tag, 'aria-label'), 'Model: Opus 4.5 (1M) High');
  assert.match(whole, /select-none">Opus 4\.5<span class="ms-1 text-muted-as-secondary"> \(1M\) · High<\/span><\/div>/);
  const plain = triggerOf(render({ effort: 'low', effortLabel: 'Low' })).whole;
  assert.match(plain, /select-none">Fixture<span class="ms-1 text-muted-as-secondary"> Low<\/span>/);
});

test('4.16336.0 NH (DU) right-to-left branch: a dir="auto" base and one bdi per tail part (OU), under a rtl direction', () => {
  const { rtl } = modelSelector.label;
  for (const literal of [rtl.wrapperClass, rtl.tailClass]) assert.ok(shared8.includes(`"${literal}"`), literal);
  assert.match(shared8, /\w+=\w+\(\)==="rtl",/);
  assert.ok(shared8.includes('dir:"auto",className:`max-w-full shrink-0 overflow-x-clip text-ellipsis whitespace-nowrap ${'));
  assert.match(shared8, /function OU\(e,t\)\{return \w+\(\w+,\{children:\[t>0&&" \\u00B7 ",\w+\("bdi",\{className:Ac,children:e\}\)\]\},`\$\{t\}\$\{e\}`\)\}/);
  // H is vendor-frame Xn (`F(Yn)?.direction ?? "ltr"`, exported as xa); the host answers it with the subscribed useDirection
  // of source-sidebar-resize-adapters.jsx (useSyncExternalStore over the root `dir`), not a one-off read of its own, so a
  // later `dir` change re-renders the trigger (browser check: regions-chat/fix/rtl-subscription.mjs). Server rendering
  // takes the hook's 'ltr' server snapshot, so the branch is rendered here through the `direction` override.
  const vendorFrame = official('vendor-frame-BckkO60Y.js');
  assert.ok(vendorFrame.includes('function Xn(){return F(Yn)?.direction??"ltr"}') && vendorFrame.includes(',Xn as xa'));
  assert.ok(shared8.includes('xa as H') && /function DU\(e\)\{[^;]*u=H\(\)==="rtl"/.test(shared8));
  assert.match(host, /import \{ useDirection \} from '\.\/source-sidebar-resize-adapters\.jsx';/);
  assert.match(host, /const rootDirection = useDirection\(\);\n\s*const rtl = \(direction \?\? rootDirection\) === 'rtl';/);
  assert.doesNotMatch(host, /documentElement\?\.dir/);
  const trigger = props => renderToStaticMarkup(React.createElement(C.ChatModelTrigger, props));
  const whole = trigger({ model: { model: 'opus', displayName: 'Opus 4.5 (1M)' }, effortLabel: 'High', direction: 'rtl' });
  const bdi = rtl.partClass.replaceAll('&', '&amp;').replace(/[[\]().:*=]/g, '\\$&');
  assert.match(whole, new RegExp('<div class="inline-flex min-w-0 text-xs leading-none items-baseline"><div class="flex min-w-0 items-baseline gap-1 select-none">'
    + '<span dir="auto" class="max-w-full shrink-0 overflow-x-clip text-ellipsis whitespace-nowrap \\[text-align:-webkit-match-parent\\] supports-\\[text-align:match-parent\\]:\\[text-align:match-parent\\]">Opus 4\\.5</span>'
    + `<span class="min-w-0 overflow-x-clip text-ellipsis whitespace-pre text-muted-as-secondary"> <bdi class="${bdi}">\\(1M\\)</bdi> · <bdi class="${bdi}">High</bdi></span></div></div>`));
  // Left-to-right (the server snapshot, no override) keeps the single tail span, in the card and in the trigger alone.
  assert.doesNotMatch(triggerOf(render({ model: { model: 'opus', displayName: 'Opus 4.5 (1M)' } })).whole, /<bdi|dir="auto"/);
  assert.doesNotMatch(trigger({ model: { model: 'opus', displayName: 'Opus 4.5 (1M)' }, effortLabel: 'High' }), /<bdi|dir="auto"/);
});

test('loading and no-model states use $H\'s copy', () => {
  const loading = triggerOf(render({ modelsLoading: true }));
  assert.equal(attr(loading.tag, 'aria-label'), 'Loading models…');
  assert.match(loading.tag, / disabled=""/);
  assert.match(loading.whole, /<span class="flex items-center gap-1\.5 text-muted-as-secondary">.*<span class="truncate">Loading models…<\/span><\/span>/);
  const none = triggerOf(render({ model: null }));
  assert.equal(attr(none.tag, 'aria-label'), 'Default model');
  assert.match(none.whole, /<span class="text-muted-control truncate">Default model<\/span>/);
  assert.match(none.tag, / disabled=""/);
  assert.match(triggerOf(render({ sending: true, canSend: true, draft: 'x' })).tag, / disabled=""/);
});

test('reply placeholder is "Reply to Claude…"; a new chat rotates lD\'s placeholders (dD fade) over the empty editor', () => {
  // U-MARLIN (2026-11-18): a Chat conversation's marlin card takes shared-36 PT's "Reply" (an external conversation); the
  // old non-marlin assertion was XI's "Reply to Claude…" (persona: "Reply to DeepSeek…"). Cowork keeps the classic copy.
  assert.match(render({ current: true }), /placeholder="Reply"/);
  assert.doesNotMatch(render({ current: true }), /placeholder="Reply to DeepSeek…"/);
  assert.match(render({ mode: 'cowork', current: true }), /placeholder="Reply to DeepSeek…"/);
  // w13-close-chat-composer (composer-shell-02): the editor's own placeholder steps aside for dD's overlay.
  const fresh = render({});
  assert.match(fresh, /contentEditable="true" placeholder=""/);
  // 4.16336.0 eO colours the placeholder with the fizzy-lake token (3.6556.2 dD: text-muted).
  // rl-composer verify: gO's inlineLayout arm (the fO → gD card) calls the rotation bare and inline inside ro.Overlay, so
  // eO draws only its grid (the Overlay carries the start inset / row padding / type size) and each span truncates.
  assert.match(fresh, /<div data-cds="ChatComposerOverlay"[^>]*><div class="grid grid-cols-\[minmax\(0,1fr\)\]"><span class="col-start-1 row-start-1 block text-\[var\(--cds-fizzy-lake-color-placeholder,var\(--cds-text-muted\)\)\] truncate">How can I help you today\?<\/span><\/div><\/div>/);
  assert.doesNotMatch(fresh, /data-cds="ChatComposerOverlay"[^>]*><div class="[^"]*absolute inset-0/, 'no absolute frame inside the Overlay');
  const shared9 = official('shared-9-BgdM6Y1f.js');
  assert.match(shared9, /if\(\(?(\w+)=null,(\w+)\)\)?\{[\s\S]{0,2000}?\w+&&\w+\(\w+,\{children:\w+\(\$?\w+,\{placeholders:\$?\w+,isVisible:!0,animation:\w+,inline:\2,inlineMultiline:\w+,bare:!0,markComposerTiming:!0\}\)\}\)[\s\S]{0,800}?\1=\w+\(\w+\.Overlay,\{children:\[/, 'gO: the card arm rotates bare + inline inside ro.Overlay');
  // A draft, a preview or the caller's own placeholder leave the editor's placeholder alone.
  assert.doesNotMatch(render({ draft: 'x' }), /col-start-1 row-start-1 block/);
  const custom = render({ editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'Other' }) });
  assert.match(custom, /placeholder="Other"/);
  assert.doesNotMatch(custom, /col-start-1 row-start-1 block/);
});

test('dD: lD\'s placeholders and oD\'s fade interval are the 4.16336.0 originals; the rotation stops after one lap', () => {
  const shared9 = official('shared-9-BgdM6Y1f.js');
  assert.ok(shared9.includes('oD={fade:5e3,typewriter:3500}') || /\w+=\{fade:5e3,typewriter:3500\}/.test(shared9));
  assert.equal(chatPlaceholderRotation.intervalMs, 5000);
  for (const literal of [chatPlaceholderRotation.grid, chatPlaceholderRotation.overlay, chatPlaceholderRotation.fontSize, chatPlaceholderRotation.itemClass,
    chatPlaceholderRotation.inlineItemClass, chatPlaceholderRotation.fadeOutClass, chatPlaceholderRotation.fadeInClass])
    assert.ok(shared9.includes(`"${literal}"`), literal);
  assert.match(shared9, /\w+=\w+===0&&\w+!==null/, 'T: back at the first after a lap');
  assert.match(shared9, /if\(\w+\.length<=1\|\|\w+\)return;let \w+=setInterval\(/, 'the interval stops at T');
  assert.equal(enUS['uSmGqlwE3c'], 'Type / for skills');
  assert.match(host, /if \(placeholders\.length <= 1 \|\| done\) return undefined;/);
  assert.match(host, /const done = current === 0 && previous !== null;/);
});

test('incognito (4.16336.0 shared-9 gO `Pe = A ? "incognito" : void 0`; 3.6556.2 wD) picks vm\'s incognito variant', () => {
  const shared9 = official('shared-9-BgdM6Y1f.js');
  assert.match(shared9, /\w+=\w+\?"incognito":void 0/);
  const plain = render({}), dark = render({ incognito: true });
  assert.notEqual(plain, dark, 'the variant changes the card classes');
  // surfaces-prod-3 composer: the host passes gO's own value (incognito, else undefined: the shell's default variant).
  // relink C2 S1: gO's value is now read from the generated card.mjs (fO `Pe = A ? "incognito" : void 0`, picked).
  assert.match(host, /variant=\{incognito \? chatComposerCard\.variant : undefined\}/);
  assert.match(fs.readFileSync(path.join(app, 'src/generated/chat-composer/card.mjs'), 'utf8'), /^  variant: "incognito",$/m);
  assert.doesNotMatch(host, /variant=\{incognito \? [^:]+ : 'default'\}/);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('incognito={incognitoDraft || (mode === "chat" && isIncognitoSession(current, sessionMetadata))}'));
});

test('composer-shell-03: aria-busy while a busy card holds the trigger; the wt name list is [name, thinking] locally', () => {
  assert.match(triggerOf(render({ sending: true, busy: true, canSend: true, draft: 'x' })).tag, / aria-busy="true"/);
  assert.doesNotMatch(triggerOf(render({ busy: true })).tag, / aria-busy="/, 'an enabled trigger is not busy');
  assert.doesNotMatch(host, /onMode/, 'the unused onMode parameter is gone');
  assert.doesNotMatch(host, /onMenu\('effort'/, 'the host Effort row left the folder menu (the model menu has wE)');
});

test('the chin has no Chat / Cowork switch; the reply chin keeps Add + the model trigger', () => {
  assert.doesNotMatch(host, /onMode\?\.\('chat'\)|onMode\?\.\('cowork'\)/);
  assert.doesNotMatch(host, /aria-label=\{t\('Model'\)\}/);
  assert.doesNotMatch(host, /t\('Reply'\)/);
  assert.doesNotMatch(host, /generated\/view-tabs\/index\.js/, 'E41: the card is in the composer graph');
  const chin = render({ current: true }).slice(render({ current: true }).indexOf('data-cds="ChatComposerChin"'));
  // w13-chatui-composer-tools: the Add control is shared-8 kF (w13-chat-composer-tools.test.mjs).
  assert.deepEqual([...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Add files, connectors, and more', 'Model: Fixture']);
  const cowork = render({ mode: 'cowork' });
  const coworkChin = cowork.slice(cowork.indexOf('data-cds="ChatComposerChin"'));
  assert.deepEqual([...coworkChin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]), ['Project or folder', 'Model: Fixture', 'Permission mode']);
});

test('zh-CN carries the new copy', () => {
  for (const text of ['Reply to Claude…', 'Select model', 'Loading models…', 'Default model', 'Model: {name}', 'More models', 'Search models', 'No matches', 'How can I help you today?',
    'Type / for skills', '{legacyModel} is no longer available. New replies will use {defaultModel}.', 'Effort', 'Default',
    'Higher effort means more thorough responses, but takes longer and uses your limits faster.'])
    assert.ok(typeof zh[text] === 'string' && zh[text].length > 0, text);
});
