import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { pendingConversions } from '../src/chat-attachment-model.mjs';

// w13-close-chat-composer (plan-w13-closeout.md G4a): the Chat card's model menu (shared-8 $H → KH, shared-28 wE / TE /
// gE / hE), the Cowork + menu's screenshot slot, the document-conversion send hold, the converted-PDF tile line, the
// image-limit band (shared-7 Cv), and the evidence for the items closed without code (kF's "/" hint, K6's chin, the
// incognito file restriction). Source only: official raw chunks, generated data, element trees and SSR; no browser.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

let server, MM, CC, CA;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  MM = await server.ssrLoadModule('/src/source-chat-model-menu.jsx');
  CC = await server.ssrLoadModule('/src/source-chat-composer.jsx');
  CA = await server.ssrLoadModule('/src/source-composer-attachments.jsx');
});
after(() => server?.close());

// Expands this module's own (hook-free) components; SourceMenu / CdsBadge / SourceSwitch elements stay as elements.
const OWN = new Set(['ModelGroup', 'ModelRow', 'RowName', 'EffortSubmenu', 'ThinkingRows']);
function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (!node || typeof node !== 'object' || !node.props) return node;
  if (typeof node.type === 'function' && OWN.has(node.type.name)) return expand(node.type(node.props));
  const children = node.props.children === undefined ? undefined : expand(node.props.children);
  const trailing = node.props.trailing === undefined ? undefined : expand(node.props.trailing);
  return { ...node, props: { ...node.props, children, trailing } };
}
function findAll(tree, predicate, out = []) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { for (const node of tree) findAll(node, predicate, out); return out; }
  if (tree.props && predicate(tree)) out.push(tree);
  findAll(tree.props?.children, predicate, out);
  findAll(tree.props?.trailing, predicate, out);
  return out;
}
const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : node?.props ? textOf(node.props.children) : '';
const models = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ model: id, displayName: `Model ${id.toUpperCase()} ${i + 1}.0 Fast`, description: `About ${id}` }));
const menu = props => expand(MM.SourceChatModelMenu({ anchor: null, models, selected: 'b', onClose() {}, ...props }));
const rows = tree => findAll(tree, node => node.props['data-testid'] === 'model-selector-option');

test('official: TU renders $H without a server CDS catalog; KH groups by conversation; search only for an Anthropic account', () => {
  const s8 = official('shared-8-Db1QN4mf.js'), s52 = official('shared-52-uHFNjl7C.js'), s28 = official('shared-28-DNYlf4wu.js');
  assert.ok(s8.includes('if(!t||i){let t=e.placement??"bottom"'), 'TU: no cdsCatalog → $H');
  assert.ok(s8.includes('se=!h&&!u,Y=J3($,'), 'KH se');
  assert.match(s8, /se\?\[a\]:q\)/, 'an open conversation lists only the current model in the main group');
  assert.ok(s8.includes('ue=Lr(le)') && s8.includes('ue?_(J.SearchablePopup'));
  assert.match(s52, /function sd\(e\)\{return!!\(e\?\.email_address\?\.endsWith\("@anthropic\.com"\)/);
  assert.match(s8, /"data-testid":"model-selector-option",onClick:\w+,disabled:\w+,checked:\w+,checkedRole:"radio"/);
  assert.ok(s28.includes('"data-testid":"thinking-mode-toggle",keepOpen:!0'));
  assert.ok(s28.includes('"data-testid":"effort-menu-trigger"'));
  assert.ok(s28.includes('`effort-option-${'));
});

test('chatModelMenuGroups: new chat = main section + overflow; open chat = current + the rest; a missing model is legacy', () => {
  const fresh = MM.chatModelMenuGroups({ models, selected: 'b', isNewConversation: true });
  assert.deepEqual(fresh.main.map(m => m.model), ['a', 'b', 'c', 'd']);
  assert.deepEqual(fresh.more.map(g => g.map(m => m.model)), [['e', 'f']]);
  assert.equal(fresh.legacy, null);
  const open = MM.chatModelMenuGroups({ models, selected: 'b', isNewConversation: false });
  assert.deepEqual(open.main.map(m => m.model), ['b']);
  assert.deepEqual(open.more.map(g => g.map(m => m.model)), [['a', 'c', 'd'], ['e', 'f']]);
  const legacy = MM.chatModelMenuGroups({ models, selected: 'gone', defaultModel: 'c', isNewConversation: false });
  assert.equal(legacy.legacy, 'gone');
  assert.equal(legacy.current.model, 'c');
  assert.equal(MM.chatModelMenuGroups({ models, selected: 'gone', isNewConversation: true }).legacy, null, 'He needs an open conversation');
});

test('KH render: WH rows (radio, descriptions in the main group only, muted version tail), More models, legacy header', () => {
  const tree = menu({ isNewConversation: true });
  const popup = tree;
  assert.ok(popup.props.className.includes('max-w-[min(26rem,var(--available-width))]'), 'ZH');
  assert.equal(popup.props.align, 'end');
  assert.equal(popup.props.sideOffset, 4);
  const all = rows(tree);
  assert.deepEqual(all.map(r => r.props['data-model-id']), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(all.map(r => r.props.checked), [false, true, false, false, false, false]);
  assert.ok(all.every(r => r.props.checkedRole === 'radio'));
  assert.deepEqual(all.map(r => r.props.description ?? null), ['About a', 'About b', 'About c', 'About d', null, null], 'GH showDescription: true in Ce, false in Ee');
  const name = all[0].props.children;
  assert.equal(name.props.className, 'inline-flex items-center gap-2 font-sans');
  const tail = findAll(name, node => node.props.className === 'text-muted-as-secondary');
  assert.equal(textOf(tail[0]), ' Fast', 'kH: the words after the version number');
  const [more] = findAll(tree, node => node.props['data-testid'] === 'model-selector-more-models');
  assert.equal(textOf(more), 'More models');
  const [submenuPopup] = findAll(tree, node => typeof node.props.className === 'string' && node.props.className.includes('max-h-[min(50vh,var(--available-height))]'));
  assert.ok(submenuPopup, 'QH on the More models popup');
  assert.equal(findAll(submenuPopup, node => node.props.placeholder !== undefined || node.props['aria-label'] === 'Search models').length, 0, 'no search (ue is false)');
  const picks = [];
  all[0].props.onClick(); all[1].props.onClick();
  const live = expand(MM.SourceChatModelMenu({ anchor: null, models, selected: 'b', onClose() {}, onSelect: m => picks.push(m.model) }));
  rows(live).forEach(r => r.props.onClick());
  assert.deepEqual(picks, ['a', 'c', 'd', 'e', 'f'], 'the checked row does nothing');
  const legacy = menu({ selected: 'gone', defaultModel: 'c', isNewConversation: false });
  assert.equal(textOf(findAll(legacy, node => node.type?.displayName === 'MenuHeader' || node.props.children && typeof node.props.children === 'string' && node.props.children.includes('is no longer available'))[0]),
    'gone is no longer available. New replies will use Model C 3.0 Fast.');
});

test('wE: the Effort submenu with its header, TE level rows (effort-option-*, Default badge) and gE\'s thinking rows', () => {
  const levels = [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium', badge: { message: 'Default', variant: 'neutral' } }, { reasoningEffort: 'high' }];
  const toggles = [], efforts = [];
  const tree = menu({ effort: { levels, value: 'medium', onPick: id => efforts.push(id) },
    thinking: { value: 'off', options: [{ id: 'off', name: 'Off' }, { id: 'extended', name: 'Extended thinking', description: 'Think longer for complex tasks' }], onToggle: m => toggles.push(m) } });
  const [trigger] = findAll(tree, node => node.props['data-testid'] === 'effort-menu-trigger');
  assert.equal(trigger.props.children.props.className, 'flex min-w-0 items-center justify-between gap-md');
  assert.equal(textOf(trigger), 'EffortMedium');
  const header = findAll(tree, node => node.props.className === 'font-normal')[0];
  assert.equal(textOf(header), 'Higher effort means more thorough responses, but takes longer and uses your limits faster.');
  const options = findAll(tree, node => typeof node.props['data-testid'] === 'string' && node.props['data-testid'].startsWith('effort-option-'));
  assert.deepEqual(options.map(o => [o.props['data-testid'], o.props.checked]), [['effort-option-low', false], ['effort-option-medium', true], ['effort-option-high', false]]);
  assert.equal(textOf(options[1]), 'MediumDefault');
  options[2].props.onClick(); options[1].props.onClick();
  assert.deepEqual(efforts, ['high']);
  const [thinking] = findAll(tree, node => node.props['data-testid'] === 'thinking-mode-toggle');
  assert.equal(thinking.props['data-thinking-mode'], 'extended');
  assert.equal(thinking.props.keepOpen, true);
  assert.equal(thinking.props.children.props.className, 'block whitespace-normal');
  assert.equal(textOf(thinking), 'Extended thinkingThink longer for complex tasks');
  thinking.props.onClick();
  assert.deepEqual(toggles, ['extended']);
  // Without levels gE's rows follow the model group directly (no Effort submenu).
  const bare = menu({ thinking: { value: 'extended', options: [{ id: 'extended', name: 'Extended thinking' }], onToggle: m => toggles.push(m) } });
  assert.equal(findAll(bare, node => node.props['data-testid'] === 'effort-menu-trigger').length, 0);
  findAll(bare, node => node.props['data-testid'] === 'thinking-mode-toggle')[0].props.onClick();
  assert.deepEqual(toggles, ['extended', 'off']);
});

test('main.jsx: Chat / Cowork open SourceChatModelMenu with the effort levels and Chat\'s thinking rows; Code keeps its menu', () => {
  const main = local('src/main.jsx');
  assert.ok(main.includes('{menu?.kind === "model" && mode !== "code" ? <SourceChatModelMenu key={menu.token ?? "model"}'));
  assert.ok(main.includes('effort={efforts.length > 0 ? { levels: markDefaultEffort(efforts, chosen?.defaultReasoningEffort), value: effort, onPick: pickEffort } : null}'));
  assert.ok(main.includes('thinking={chatThinking && { ...chatThinking, onToggle: toggleChatThinking }} />'));
  assert.ok(main.includes(': menu?.kind === "model" ? <SourceModelMenu key={menu.token ?? "model"}'));
  assert.doesNotMatch(local('src/source-chat-model-menu.jsx'), /generated\/view-tabs\/index\.js/, 'E41');
});

test('E63 chatfn-attachments-07: the Cowork + menu carries Fs\'s Take a screenshot after Record a skill', () => {
  const add = official('c752b32f8-mYZAs6yC.js');
  assert.match(add, /\{type:"button",label:\w+,icon:"Camera",onAction:\w+\}/);
  const main = local('src/main.jsx');
  const at = main.indexOf('{mode === "cowork" && <SourceMenu.Item icon={SCREENSHOT_ICON} data-testid={SCREENSHOT_TESTID} onClick={captureScreenshot}>{t("Take a screenshot")}</SourceMenu.Item>}');
  assert.ok(at > 0);
  assert.ok(main.lastIndexOf('{addTeachRow}', at) > main.lastIndexOf('<ComposerAddFilesItem', at), 'after teach');
  assert.ok(main.indexOf('Import GitHub issue', at) > at, 'before the GitHub row');
});

test('chatfn-attachments-04: a Chat document that has not converted yet holds the send', () => {
  const pdf = { id: 'p', kind: 'file', status: 'ready', name: 'a.pdf', path: '/tmp/a.pdf' };
  assert.equal(pendingConversions([pdf], { surface: 'chat' }).length, 1);
  assert.equal(pendingConversions([{ ...pdf, converted: { fileType: 'pdf', text: 'x' } }], { surface: 'chat' }).length, 0);
  assert.equal(pendingConversions([{ ...pdf, conversion: 'unreadable' }], { surface: 'chat' }).length, 0);
  assert.equal(pendingConversions([pdf], { surface: 'cowork' }).length, 0);
  assert.ok(local('src/source-composer.jsx').includes('const attachmentsReady = attachments.every((entry) => entry.status === "ready") && pendingConversions(attachments, { surface: mode }).length === 0;'));
});

test('chatfn-attachments-02: a converted PDF pill names shared-7\'s "PDF converted to text" in its tooltip', () => {
  const s7 = official('shared-7-DBAgAi5H.js');
  assert.ok(s7.includes('tooltipText:t.file_type==="pdf"?h(Z,{defaultMessage:"PDF converted to text",id:"A/pPpSVBy1"}):void 0'));
  assert.ok(local('src/source-composer-attachments.jsx').includes('<SourceTooltip content={name} detail={convertedTooltip(entry) ?? undefined}>{body}</SourceTooltip>'));
  const html = renderToStaticMarkup(h(CA.SourceComposerAttachments, { entries: [{ id: 'p', kind: 'file', status: 'ready', name: 'a.pdf', path: '/tmp/a.pdf', converted: { fileType: 'pdf', text: 'x' } }], onRemove() {} }));
  assert.match(html, /aria-label="a\.pdf"/);
});

test('chatfn-attachments-03: Cv\'s warning is a dismissible neutral composer band, remembered per conversation', () => {
  const s7 = official('shared-7-DBAgAi5H.js');
  assert.ok(s7.includes('"approaching-image-limit-dismissed-conversation-ids"'));
  assert.match(s7, /\w+=\w+&&`\$\{\w+\}:max`/);
  assert.match(s7, /variant:\w+==="danger"\?"danger":"neutral",icon:\w+\?\.icon\?\?\(\w+\?\.variantIcon\?void 0:null\)/, 'MT → wa');
  const d = CC.imageLimitDismissal;
  assert.deepEqual(d({ stored: '', conversationId: 'c1', reached: false }), { hidden: false, next: 'c1' });
  assert.deepEqual(d({ stored: 'c1', conversationId: 'c1', reached: false }), { hidden: true, next: 'c1' });
  assert.deepEqual(d({ stored: 'c1', conversationId: 'c1', reached: true }), { hidden: false, next: 'c1,c1:max' }, 'the reached state is its own');
  assert.deepEqual(d({ stored: 'c1:max', conversationId: 'c1', reached: false }), { hidden: true, next: 'c1:max,c1' });
  assert.deepEqual(d({ stored: '', conversationId: null, reached: false }), { hidden: false, next: null }, 'no conversation: not dismissible');
  assert.deepEqual(d({ stored: 'c1:max', conversationId: 'c1', reached: true, pagesGate: true }), { hidden: false, next: null }, 'g: never dismissible');
  const notice = { key: 'approaching', text: 'This chat has 80 of 100 images. Consider starting a new chat.' };
  const band = renderToStaticMarkup(h(CC.ChatImageLimitNotice, { notice, conversationId: 'c1' }));
  assert.match(band, /^<div data-cds="Banner"/);
  assert.match(band, /<span class="text-body">This chat has 80 of 100 images\. Consider starting a new chat\.<\/span>/);
  assert.match(band, /aria-label="Dismiss"/);
  assert.doesNotMatch(renderToStaticMarkup(h(CC.ChatImageLimitNotice, { notice, conversationId: null })), /aria-label="Dismiss"/);
  assert.equal(renderToStaticMarkup(h(CC.ChatImageLimitNotice, { notice: null })), '');
  const main = local('src/main.jsx');
  assert.ok(main.includes("beforeComposer={mode === 'chat' ? <ChatImageLimitNotice notice={chatImageNotice} conversationId={current || null} />"));
  assert.doesNotMatch(main, /toasts\?\.add\(notice\.text/, 'no toast any more');
});

test('closed without code: kF\'s "/" hint, K6\'s chin, the incognito file restriction', () => {
  const s8 = official('shared-8-Db1QN4mf.js'), s9 = official('shared-9-CM21XrJw.js'), s23 = official('shared-23-BZ6ZY5fu.js'), s78 = official('shared-78-D5Fw2h0a.js');
  // composer-tools-03: kF shows "/" (the shortcut the placeholder names: lD "Type / for skills"); the host's "/" opens the
  // slash menu in every mode (onCommand is passed whatever the mode; showCommands has no mode condition).
  assert.match(s8, /\w+=\w+\?void 0:"\/"/);
  assert.ok(s9.includes('defaultMessage:"Type / for skills",id:"uSmGqlwE3c"'));
  assert.ok(local('src/main.jsx').includes('commandContext={commandContext} onCommand={executeCommand} commandScope={current}'));
  assert.doesNotMatch(local('src/source-composer.jsx').match(/const showCommands=[^;]*;/)[0], /mode/);
  // composer-shell-04 (K6): yP's "projects" branch needs the unified composer design — WC's h = To() (shared-78 dS = Fy,
  // the GrowthBook gate "voyage_composer_marlin", off here per D29/D31) — besides shared-23's remote-only chinProjectPicker.
  assert.match(s8, /function yP\(\)\{let \$=J9\(3\),e=Fu\(\),t=At\(\),\{surfaces:n,unifiedComposerDesign:r,projectScopeLocked:i\}=od\(\),a=r!==void 0&&r/);
  assert.match(s8, /s=e!==null&&a/);
  assert.match(s8, /:\w+&&!\w+\?"projects":"enabled"/);
  assert.match(s23, /dS as To\b/);
  assert.match(s78, /Fy as dS\b/);
  assert.ok(s78.includes('bp="voyage_composer_marlin"') && s78.includes('{on:e,inPayload:t}=Xe(bp)'));
  // The incognito "can't open that type of file" message (shared-78 gv / _v incognitoCannotOpenFile) has no reader in
  // any 3.6556.2 chunk, so there is no restriction to carry.
  let readers = 0;
  for (const name of fs.readdirSync(v1).filter(n => n.endsWith('.js'))) readers += (fs.readFileSync(path.join(v1, name), 'utf8').match(/\.incognitoCannotOpenFile\b/g) ?? []).length;
  assert.equal(readers, 0);
  assert.equal((s78.match(/incognitoCannotOpenFile:\{/g) ?? []).length, 2);
});
