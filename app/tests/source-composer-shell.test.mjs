// R3-composer step 3 (composer-shell, research/composer.md §4.2; ledger composer-01 / composer-03): the Code card is the
// original 2.42304.0 CDS ChatComposer shell (shared-5 Af / jf, generated chat-composer-shell.mjs) around the local
// ProseMirror editor (src/source-composer-shell.jsx transcribes shared-5 yp and shared-9 cm's box for it). SSR markup of the
// card in its layouts, a real cascade over the renderer's stylesheets, the original shell's hooks driven under a minimal
// hook dispatcher with fake observers / frames / events (the --cmp-wrap-h measure, the multiline switch, click-to-focus,
// the drop hook), the host editor box and the focus / caret handle. Nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/code-ui-unpack-20261017/readable');
const OFFICIAL = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';
const h = React.createElement;
const noop = () => {};
let server, C, Host, Shell, Layout, Tokens, Card, Adapters, ViewTabs, AddMenu, Glyph, AddGen, Padding, SourceMenuModule;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Host = await server.ssrLoadModule('/src/source-composer-shell.jsx');
  Shell = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-shell.mjs');
  Layout = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-layout.mjs');
  Tokens = await server.ssrLoadModule('/src/generated/code-composer/composer-tokens.mjs');
  Card = await server.ssrLoadModule('/src/generated/code-composer/composer-card-tokens.mjs');
  Adapters = await server.ssrLoadModule('/src/source-composer-current-adapters.jsx');
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  AddMenu = await server.ssrLoadModule('/src/source-composer-add-menu.jsx');
  Glyph = await server.ssrLoadModule('/src/generated/code-composer/composer-glyph.mjs');
  AddGen = await server.ssrLoadModule('/src/generated/code-composer/composer-add-menu.mjs');
  Padding = await server.ssrLoadModule('/src/generated/code-composer/menu-collision-padding.mjs');
  SourceMenuModule = await server.ssrLoadModule('/src/source-menu.jsx');
});
after(() => server?.close());

const model = { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] };
const base = { draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto', model, effort: 'high', workdir: '/tmp/fixture/project' };
const session = { commandContext: { current: 'th1' } };
const render = (props = {}) => renderToStaticMarkup(h(C.SourceComposer, { ...base, ...props }));
const cls = (node) => String(node?.attrs?.class ?? '');
const tree = (html) => parseMarkup(html);
const byCds = (nodes, name) => find(nodes, (n) => n.attrs?.['data-cds'] === name);
const kids = (node) => (node?.children ?? []).filter((n) => n.tag);

// ---------------------------------------------------------------- SSR: the card is the shell
test("an open session's presets card: uM's root (Hc) > the shell (data-cds ChatComposer) > card, editor box, actions, overlays, chin", () => {
  const nodes = tree(render({ ...session }));
  const root = find(nodes, (n) => cls(n).startsWith('sc-composer epitaxy-prompt'));
  // uM `className: Bo("epitaxy-prompt", ye)` with ye = Hc (shared-6 d_) in the presets layout; sc-composer is the host hook.
  assert.equal(cls(root), `sc-composer epitaxy-prompt ${Tokens.composerCardRootClass}`);
  assert.equal(root.tag, 'div', 'a div, not the old form');
  const shell = kids(root).find((n) => n.attrs['data-cds'] === 'ChatComposer');
  assert.ok(shell, 'Af root inside uM root');
  assert.equal(shell.attrs['data-cds-dock-group'], '', 'shared-1 Cu on the shell root');
  assert.equal(shell.attrs['data-multiline'], undefined, 'multiline: !ve && void 0 → the presets card stays one row');
  assert.equal(shell.attrs['data-end-inset'], 'actions');
  assert.equal(shell.attrs['data-start-inset'], undefined, 'the + leads: startInset none (the editor pads by --cmp-lead-w)');
  assert.ok(cls(shell).startsWith('flex w-full min-w-0 flex-col font-sans'));
  const [card, chin] = kids(shell);
  // The card: Af xt with uM's cardClassName (nM: the float notch's shape-outside reset) and the host sc-card hook.
  for (const token of ['bg-surface-3', 'rounded-composer', 'shadow-composer', 'focus-within:shadow-composer-focus', 'cursor-text', Card.placeholderShapeResetClass, 'sc-card'])
    assert.ok(cls(card).split(/\s+/).includes(token), token);
  assert.doesNotMatch(cls(card), /inset-ring-pro/, 'no bash ring outside bash mode');
  assert.match(card.attrs.style, /--cds-page-bg:var\(--cds-surface-3\)/, 'Iu: the card surface');
  // The editor row: the lead / trail widths, the float notch (trailingNotch "float"), the editor box with uM's maxHeight.
  const row = kids(card).find((n) => cls(n) === 'relative w-full min-w-0');
  assert.match(row.attrs.style, /--cmp-lead-w:\d+px;--cmp-trail-w:\d+px/);
  const wrap = kids(row)[0];
  assert.ok(cls(wrap).includes('pl-[var(--cmp-lead-w)]') && cls(wrap).includes('[&_.ProseMirror]:before:float-right'), cls(wrap));
  const box = byCds(wrap, 'ChatComposerEditor');
  // R4g-composer CP2 (X7-08): no compact copy, so uM's fit is "grow": cm stacks one placeholder ghost with the editor in
  // the box's grid (eo), even with a draft (the box keeps the placeholder's height).
  assert.equal(cls(box), Layout.editorClass({ startInset: 'none', disabled: false, settled: false,
    className: ViewTabs.cdsClassNames(Layout.proseMirrorContentClass, Layout.stackedEditorClass, 'epitaxy-prompt-input') }));
  assert.equal(box.attrs.style, 'max-height:min(24rem, 40svh)');
  const input = kids(box)[0];
  assert.equal(input.attrs.role, 'textbox');
  assert.equal(cls(input), 'sc-input', 'the ProseMirror host element; epitaxy-prompt-input is the box (cm z)');
  assert.equal(input.attrs['data-cds'], undefined, 'data-cds moved to the box');
  assert.equal(input.attrs['data-placeholder'], undefined, 'the copy is cm\'s span, not the editor\'s ::before');
  assert.equal(input.attrs['data-doc-empty'], 'false');
  const ghost = kids(box).find((n) => 'data-composer-placeholder-ghost' in n.attrs);
  assert.equal(ghost.attrs['data-composer-placeholder-ghost'], 'Describe a task or ask a question', 'SourceComposer fallback copy (no placeholder prop)');
  assert.equal(cls(ghost), 'invisible pointer-events-none select-none max-w-full self-start break-words pr-[var(--cmp-trail-w,0px)]', 'Qa: one row, so it reserves the trailing actions');
  assert.equal(find(wrap, (n) => 'data-composer-placeholder' in n.attrs), null, 'a draft hides the placeholder span (cm fe && W)');
  assert.equal(input.attrs['data-focus-region'], 'composer');
  assert.equal(input.attrs['aria-label'], 'Message DeepSeek');
  // Actions: the in-card + leads, lM is the send slot.
  const actions = byCds(row, 'ChatComposerActions');
  assert.equal(cls(actions), 'contents');
  const [leading, trailing] = kids(actions);
  assert.ok(cls(leading).startsWith('absolute bottom-0 left-0 flex shrink-0 items-center gap-xs'));
  assert.equal(find(leading, (n) => n.tag === 'button').attrs['aria-label'], 'Add');
  assert.ok(cls(trailing).startsWith('absolute bottom-0 right-0 flex shrink-0 items-center gap-xs'));
  assert.ok(find(trailing, (n) => n.attrs['data-testid'] === 'code-prompt-send-cell'));
  // The chin is uM's last child: inside the shell root, after the card (Kd with bQ's row class Ua).
  assert.equal(chin.attrs['data-cds'], 'ChatComposerChin');
  assert.ok(cls(chin).endsWith(`sc-chin ${Tokens.composerRowChinClass}`));
  assert.equal(chin.attrs['data-chin-layout'], 'row');
  // No overlay without a suggestion or a compact placeholder; no header without history; no attachments clip.
  assert.equal(byCds(card, 'ChatComposerOverlay'), null);
  assert.equal(byCds(card, 'ChatComposerHeader'), null);
  assert.equal(find(card, (n) => 'data-cds-composer-attachments-clip' in n.attrs), null);
  // The Home draft hangs no chin in the shell; the environment bar follows the root.
  const home = tree(render({ draft: '', showContext: true }));
  const homeRoot = find(home, (n) => cls(n).startsWith('sc-composer epitaxy-prompt'));
  assert.equal(byCds(homeRoot, 'ChatComposerChin'), null);
  const zone = find(home, (n) => cls(n).startsWith('composer-zone'));
  const order = kids(zone).map((n) => (n === homeRoot ? 'card' : n.attrs['data-env-bar-host'] !== undefined ? 'bar' : cls(n)));
  assert.ok(order.indexOf('card') < order.indexOf('bar'), order.join(' | '));
  // The side session (embedded) has no chin either.
  assert.equal(byCds(tree(render({ ...session, embedded: true })), 'ChatComposerChin'), null);
});

test('the classic layout: no in-card +, so the editor starts at the text inset (data-start-inset text) and the chin holds Add', () => {
  const nodes = tree(render({ ...session, codeLayout: 'classic' }));
  const root = find(nodes, (n) => cls(n).startsWith('sc-composer epitaxy-prompt'));
  assert.equal(cls(root), 'sc-composer epitaxy-prompt', 'no Hc outside the presets layout');
  const shell = byCds(root, 'ChatComposer');
  assert.equal(shell.attrs['data-start-inset'], 'text');
  const card = kids(shell)[0];
  assert.ok(!cls(card).includes(Card.placeholderShapeResetClass), 'nM is the presets card only');
  const box = byCds(card, 'ChatComposerEditor');
  assert.equal(cls(box), Layout.editorClass({ startInset: 'text', disabled: false, settled: false,
    className: ViewTabs.cdsClassNames(Layout.proseMirrorContentClass, Layout.stackedEditorClass, 'epitaxy-prompt-input') }));
  const [first] = kids(byCds(card, 'ChatComposerActions'));
  assert.ok(cls(first).startsWith('absolute bottom-0 right-0'), 'only the trailing (send) cluster');
  const chin = byCds(shell, 'ChatComposerChin');
  assert.deepEqual([...find(chin, (n) => cls(n) === 'flex items-center self-start').children].filter((n) => n.tag).length > 0, true);
  // R4i-graph GR3: the classic chin's + is the official Oj trigger (c73f45bc3 tv, `...rc`), no longer the host .sc-add.
  const add = find(chin, (n) => n.tag === 'button' && n.attrs['aria-label'] === 'Add');
  assert.equal(add?.attrs['data-cds'], 'Button');
  assert.ok(add.attrs.class.split(/\s+/).includes('shrink-0'), 'Oj className');
  assert.ok(!add.attrs.class.includes('sc-add') && !add.attrs.class.includes('sc-button'), 'no host button classes');
  assert.ok(!find(add, (n) => n.tag === 'span' && cls(n) === 'flex scale-90'), 'rc alone: no glyph box (that is the presets card)');
});

// ---------------------------------------------------------------- R4g-composer CP3 (X7-09): the in-card + and the Add menu
const REFERENCE = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const occurrences = (file, needle) => fs.readFileSync(path.join(REFERENCE, file), 'utf8').split(needle).length - 1;
test("2.42304.0: the presets card's + is cc43287c9's actionsLeading (c73f45bc3 pv → c227f4d5e Oj), not uM's own ft", () => {
  // cc43287c9 Mte: the presets card (zo) gets actionsLeading Uo = $ee (= c73f45bc3 `S` = pv) and, on a session, the chin Bo.
  assert.equal(occurrences('cc43287c9-DAfOi8yP.js', 'chin:Vo?void 0:Bo,actionsLeading:Uo,'), 1);
  assert.equal(occurrences('cc43287c9-DAfOi8yP.js', 'Uo=x(()=>zo?v($ee,{scopeStore:Zn,sessionRef:tr,mountKey:e,isPanelActive:bn}):void 0,[zo,Zn,tr,e,bn])'), 1);
  assert.equal(occurrences('cc43287c9-DAfOi8yP.js', 'S as $ee,'), 1);
  // pv: Oj (imported as Fi) with the dock glyph props rc, the md glyph in ic ("flex scale-90"), side top.
  assert.equal(occurrences('c73f45bc3-CFrHin0p.js', 'c(Fi,{onAddFiles:o?.onAddFiles,supportsFileAttachments:o?.supportsFileAttachments,plusMenuItems:f,plusMenuScope:o?.plusMenuScope,plusMenuScopeKey:n,side:"top",isPanelActive:a,...rc,glyphSize:"md",glyphBoxClassName:ic})'), 1);
  assert.equal(occurrences('c73f45bc3-CFrHin0p.js', 'Zo as Fi,'), 1);
  assert.equal(occurrences('c73f45bc3-CFrHin0p.js', 'import{i as rc,t as ic}from"./cfca6870a-BSNHbv0q.js"'), 1);
  assert.equal(occurrences('c73f45bc3-CFrHin0p.js', 'pv as S,'), 1);
  // uM's ft (icon "Attachment") only leads a composer with no chin and no actionsLeading: `leading: Oe ?? ft`.
  assert.equal(occurrences('c227f4d5e-Ba-r--Rl.js', 'ft=De==null&&Se!==void 0?D(Oj,{onAddFiles:Se,supportsFileAttachments:Ce,plusMenuItems:we,side:"top",isPanelActive:!1,icon:"Attachment",size:"base"}):void 0'), 1);
  assert.equal(occurrences('c227f4d5e-Ba-r--Rl.js', 'leading:Oe??ft,'), 1);
  assert.deepEqual({ ...AddMenu.CARD_ADD_TRIGGER }, { size: 'base', dockGlyph: true, glyphSize: 'md', glyphBoxClassName: 'flex scale-90' });
});

test("the presets card's + (SSR): Oj's trigger — CdsTooltip 'Add' > ghost base iconOnly CdsButton, the md Add glyph in 'flex scale-90', shrink-0", () => {
  const expected = renderToStaticMarkup(h(ViewTabs.CdsTooltip, { content: 'Add' },
    h(ViewTabs.CdsButton, { variant: 'ghost', size: 'base', iconOnly: true,
      icon: h('span', { className: 'flex scale-90' }, h(ViewTabs.CdsIcon, { name: 'Add', size: 'md', className: Glyph.dockGlyphIconClass })),
      'aria-label': 'Add', tooltip: false, className: 'shrink-0', 'aria-haspopup': 'menu', 'aria-expanded': false })));
  // The tooltip trigger id is useId's (it differs with the position in the tree); everything else is byte-equal.
  const unid = (markup) => markup.replace(/ id="_R_[^"]*_"/g, ' id=""');
  assert.equal(unid(renderToStaticMarkup(h(AddMenu.ComposerAddTrigger, AddMenu.CARD_ADD_TRIGGER))), unid(expected));
  const html = unid(render({ ...session }));
  assert.ok(html.includes(unid(expected)), 'the card leading renders exactly that trigger');
  const leading = kids(byCds(tree(html), 'ChatComposerActions'))[0];
  const button = find(leading, (n) => n.tag === 'button');
  assert.equal(button.attrs['data-cds'], 'Button');
  assert.equal(button.attrs['data-cds-icon-only'], '');
  assert.equal(button.attrs['data-cds-ghost'], '');
  assert.equal(button.attrs['aria-label'], 'Add');
  assert.equal(button.attrs['aria-haspopup'], 'menu');
  assert.equal(button.attrs['aria-expanded'], 'false');
  assert.equal(button.attrs.title, undefined, 'tooltip false: no native title, no built-in tooltip');
  assert.ok(cls(button).split(/\s+/).includes('shrink-0'));
  assert.ok(!/\bsc-(add|button|icon-button)\b/.test(cls(button)), 'no host button classes');
  const box = kids(kids(button)[1])[0];
  assert.equal(cls(box), 'flex scale-90');
  const icon = kids(box)[0];
  assert.equal(icon.attrs['data-cds'], 'Icon');
  assert.ok(cls(icon).endsWith(Glyph.dockGlyphIconClass), cls(icon));
  // Oj never disables the Code trigger (a plus-menu scope): not while a turn/start is in flight either.
  assert.equal(find(kids(byCds(tree(render({ ...session, sending: true })), 'ChatComposerActions'))[0], (n) => n.tag === 'button').attrs.disabled, undefined);
  // Open: the trigger reads expanded and data-popup-open, and the tooltip is held closed while a composer menu is open.
  const open = find(kids(byCds(tree(render({ ...session, menuKind: 'add' })), 'ChatComposerActions'))[0], (n) => n.tag === 'button');
  assert.equal(open.attrs['aria-expanded'], 'true');
  assert.equal(open.attrs['data-popup-open'], '');
  // The classic layout's chin + is unchanged (host button, c73f45bc3 tv's place); the Home draft card leads with the same +.
  assert.ok(unid(render({ draft: '', showContext: true })).includes(unid(expected)));
});

test('the + trigger under controlled events: a press opens the Add menu at the button, ArrowDown / ArrowUp open at the first / last row', () => {
  const calls = [];
  const element = (open = false) => {
    const tooltip = AddMenu.ComposerAddTrigger({ ...AddMenu.CARD_ADD_TRIGGER, open, onOpen: (entry, event) => calls.push([entry, event]) });
    assert.equal(tooltip.type, ViewTabs.CdsTooltip);
    assert.equal(tooltip.props.content, 'Add');
    const button = tooltip.props.children;
    assert.equal(button.type, ViewTabs.CdsButton);
    return button;
  };
  const target = { id: 'add-button' };
  const click = { currentTarget: target };
  element().props.onClick(click);
  assert.deepEqual(calls.splice(0), [[undefined, click]]);
  const key = (k, extra = {}) => ({ key: k, preventDefault() { this.prevented = true; }, currentTarget: target, ...extra });
  const down = key('ArrowDown'), up = key('ArrowUp');
  element().props.onKeyDown(down);
  element().props.onKeyDown(up);
  assert.deepEqual(calls.splice(0), [['first', down], ['last', up]]);
  assert.equal(down.prevented, true);
  element(true).props.onKeyDown(key('ArrowDown'));
  element().props.onKeyDown(key('ArrowDown', { metaKey: true }));
  element().props.onKeyDown(key('ArrowDown', { nativeEvent: { isComposing: true } }));
  element().props.onKeyDown(key('Enter'));
  assert.deepEqual(calls, [], 'open, modified, composing and other keys leave it to the button');
  // SourceComposer hands the press to main.jsx onMenu("add", the button, no data, the entry), as the chin menus do.
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.match(source, /leading=\{singleRowCard \? <ComposerAddTrigger \{\.\.\.CARD_ADD_TRIGGER\} open=\{menuKind === "add"\} tooltipOpen=\{menuKind \? false : undefined\}\s+onOpen=\{\(entry, event\) => onMenu\("add", event\.currentTarget, undefined, entry\)\} \/> : undefined\}/);
});

test("the Add menu (jj + Dj) on the host SourceMenu: side top, align start, 'epitaxy-root break-words', GR collision padding; the first row is Dj", () => {
  const anchor = { id: 'anchor' }, onClose = noop;
  const popup = AddMenu.ComposerAddMenuPopup({ anchor, label: 'Add', className: 'add-menu', onClose, children: 'rows' });
  assert.equal(popup.type, SourceMenuModule.SourceMenu.Popup);
  assert.deepEqual({ ...popup.props }, { side: 'top', align: 'start', collisionPadding: Padding.menuCollisionPadding, anchor, label: 'Add', onClose, children: 'rows',
    className: 'epitaxy-root break-words add-menu' });
  assert.deepEqual(Padding.menuCollisionPadding, { top: 48, right: 8, bottom: 8, left: 8 });
  // Dj, verbatim: the files row (or "Add image" for a surface without file attachments), icon Attachment.
  const intl = { formatMessage: (message) => message.defaultMessage };
  assert.deepEqual(AddGen.addFilesMenuItem(intl, { supportsFileAttachments: true, shortcut: 'cmd+u', onSelect: noop }), { label: 'Add files or photos', icon: 'Attachment', shortcut: 'cmd+u', onSelect: noop });
  assert.equal(AddGen.addFilesMenuItem(intl, { supportsFileAttachments: false }).label, 'Add image');
  assert.deepEqual(AddGen.addTriggerSizes, { small: 'sm', base: 'base', large: 'lg' });
  // ComposerAddFilesItem draws Dj's descriptor (through the host intl adapter) as the SourceMenu row.
  const unid = (markup) => markup.replace(/ (id|aria-describedby)="[^"]*"/g, '');
  const filesRow = renderToStaticMarkup(h(AddMenu.ComposerAddFilesItem, { shortcut: 'cmd+u', onSelect: noop }));
  assert.match(filesRow, /role="menuitem"[^>]*>.*Add files or photos/);
  assert.equal(unid(filesRow),
    unid(renderToStaticMarkup(h(SourceMenuModule.SourceMenu.Item, { icon: 'Attachment', shortcut: 'cmd+u', onClick: noop }, 'Add files or photos'))));
  // main.jsx wiring: the popup and the first row are these; every other row is a host capability (xj / pj order), and the
  // rows the host has nothing behind take the official absent branch (no Linear, no coordinator toggle).
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /menu\?\.kind === "add" \? <ComposerAddMenuPopup key=\{menu\.token \?\? "add"\} anchor=\{menu\.anchor\} label=\{t\("Add"\)\} className="add-menu" onClose=\{closeMenu\} initialHighlight=\{menu\.entry\}>\{menuContent\(\)\}<\/ComposerAddMenuPopup>/);
  assert.match(main, /<ComposerAddFilesItem shortcut="cmd\+u" onSelect=\{attach\} \/>/);
  assert.ok(!main.includes('t("Add files or photos")'), 'the row label is Dj\'s');
  assert.ok(!/Import Linear issue|onCoordinatorModeChange/.test(main));
  const rows = ['<ComposerAddFilesItem', 'onClick={addFolderFromMenu}>{t("Add folder")}', '{t("Import GitHub issue")}', '{t("Slash commands")}', 'data-testid="add-connectors"', 'data-testid="add-plugins"'];
  const at = rows.map((row) => main.indexOf(row));
  assert.ok(at.every((i) => i > 0), rows.filter((_, i) => at[i] < 0).join(', '));
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'Dj, folder, GitHub issue, Slash commands, Connectors, Plugins');
});

test("bash, history, suggestion, compact placeholder and attachments go to uM's parts: Header, Actions trailing, Overlay, Attachments shelf", () => {
  const bash = tree(render({ ...session, draft: '!ls', shellMode: 'core' }));
  const card = kids(byCds(bash, 'ChatComposer'))[0];
  assert.ok(cls(card).split(/\s+/).includes('inset-ring-pro') && cls(card).split(/\s+/).includes('inset-ring-1'), "uM's tM ring");
  const trailing = kids(byCds(card, 'ChatComposerActions'))[1];
  const badge = byCds(trailing, 'Badge');
  assert.equal(badge.attrs.title, 'Run as a shell command');
  assert.equal(badge.attrs['aria-hidden'], 'true');
  assert.equal(badge.attrs['data-size'], 'sm');
  assert.match(cls(badge), /bg-tint-violet text-pro/, 'the view-tabs CdsBadge pro variant');
  // History: the shell's Header part (Jd) inside its Presence row, aria-hidden whitespace-nowrap.
  const searching = tree(render({ ...session, draft: '' }));
  assert.equal(byCds(searching, 'ChatComposerHeader'), null);
  const history = renderToStaticMarkup(h(C.SourceComposer, { ...base, ...session, draft: '', historyResetKey: 'k' }));
  assert.equal(byCds(tree(history), 'ChatComposerHeader'), null, 'no hint, no header row');
  // The suggestion ghost and the compact-placeholder fit probe are each one ChatComposerOverlay.
  const suggested = byCds(tree(render({ ...session, draft: '', suggestion: 'Run the tests' })), 'ChatComposer');
  const overlays = [];
  (function walk(n) { if (n.attrs?.['data-cds'] === 'ChatComposerOverlay') overlays.push(n); for (const c of kids(n)) walk(c); })(suggested);
  assert.equal(overlays.length, 1);
  assert.ok(cls(overlays[0]).startsWith('absolute inset-0 overflow-hidden') && cls(overlays[0]).endsWith('pointer-events-none'));
  assert.deepEqual(kids(overlays[0]).map((n) => [cls(n), n.attrs['data-prompt-suggestion-ghost'], n.attrs['aria-hidden']]), [['truncate text-muted-as-secondary', 'true', 'true']]);
  const running = byCds(tree(render({ ...session, running: true, draft: '', queueEnabled: true })), 'ChatComposer');
  const probe = find(running, (n) => 'data-placeholder-fit-probe' in n.attrs);
  assert.equal(probe.parent.attrs['data-cds'], 'ChatComposerOverlay');
  assert.equal(cls(probe), C.PLACEHOLDER_FIT_PROBE_CLASS);
  // Attachments: the shell's clip > attachments box > uM's shelf (aM in the presets card) > Ri's tile row (R4g-composer
  // CP4, X7-10: the 2.42304.0 File tile; tests/composer-attachment-tiles.test.mjs covers the tiles).
  const attached = byCds(tree(render({ ...session, attachments: [{ id: 'a', kind: 'file', name: 'notes.md', path: '/tmp/notes.md' }] })), 'ChatComposer');
  const clip = find(attached, (n) => 'data-cds-composer-attachments-clip' in n.attrs);
  assert.ok(clip, 'the attachments part renders');
  const shelf = find(clip, (n) => cls(n).startsWith('epitaxy-attachment-shelf'));
  assert.equal(cls(shelf), `epitaxy-attachment-shelf w-full ${Card.shelfStartPaddingClass}`);
  assert.equal(find(clip, (n) => n.attrs['data-cds'] === 'MessageAttachments')?.tag, 'div', 'the part is MessageAttachments (Vp)');
  const row = kids(shelf)[0];
  assert.equal(cls(row), 'flex flex-wrap items-end gap-xs', 'c0fbbe82d Ri row');
  const tile = kids(row)[0];
  assert.equal(tile.attrs['data-cds'], 'MessageAttachmentsFile', 'the official File tile, not the host pill');
  const extension = find(tile, (n) => n.attrs['data-cds'] === 'Badge');
  assert.ok(find(extension.children, (n) => n.tag === 'bdi' && n.text === 'MD'), '_r: the upper-case extension badge');
  assert.ok(find(tile, (n) => n.attrs['aria-label'] === 'Remove notes.md'), 'the tile remove');
  assert.equal(find(shelf, (n) => cls(n).includes('sca-pill')), null, 'no host attachment pill');
});

test('the history hint sits in the Header part (Jd + Presence), the shell row the old host grid stood in for', () => {
  const Header = Host.ComposerShellParts.Header;
  const html = renderToStaticMarkup(h(Shell.ChatComposerShell, { editor: { hasDraftText: () => false, render: () => h('div', { role: 'textbox' }) } },
    h(Header, { 'aria-hidden': true, className: 'whitespace-nowrap' }, h('span', { className: 'sc-history-count' }, 'History 1/2'))));
  const header = byCds(tree(html), 'ChatComposerHeader');
  assert.equal(header.attrs['aria-hidden'], 'true');
  assert.ok(cls(header).startsWith('flex min-h-[var(--cds-h-control-nested)] min-w-0 items-center gap-xs text-footnote font-normal'));
  assert.ok(cls(header).endsWith('whitespace-nowrap'));
  assert.equal(cls(header.parent.parent.parent), 'grid grid-rows-[1fr] overflow-hidden -mb-[var(--cmp-gap-y)]', 'the Presence row');
});

// ---------------------------------------------------------------- styles
test("every class the shell draws is in the loaded official sheet; local rules touch only the host's editor, + and drag ring", () => {
  const sheets = ['shared-frame-CegduNQ2.css', 'shared-styles-Bl9zqrv-.css', 'c6a992d55-sXiDGMFQ.css', 'ce598b86c-CctVJsaN.css', 'c3fde7009-BH42YUtA.css']
    .map((f) => fs.readFileSync(path.join(app, 'public/assets/v1', f), 'utf8')).join('\n');
  const html = [render({ ...session }), render({ ...session, codeLayout: 'classic' }), render({ ...session, draft: '!x', shellMode: 'core' }),
    render({ ...session, draft: '', suggestion: 'S' }), render({ ...session, running: true, draft: '', queueEnabled: true }), render({ draft: '', showContext: true })].join('');
  const shells = [];
  (function walk(nodes) { for (const n of nodes) { if (n.attrs?.['data-cds'] === 'ChatComposer') shells.push(n); else walk(kids(n)); } })(tree(html));
  assert.equal(shells.length, 6);
  const tokens = new Set();
  for (const s of shells) (function walk(n) { for (const t of cls(n).split(/\s+/)) if (t && !t.startsWith('sc-') && !t.startsWith('stacks:')) tokens.add(t.replaceAll('&amp;', '&')); kids(n).forEach(walk); })(s);
  assert.ok(tokens.size > 150, String(tokens.size));
  const escape = (token) => '.' + token.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
  assert.deepEqual([...tokens].filter((t) => !['{', ':', ',', '[', ' ', '>', ')', '.'].some((next) => sheets.includes(escape(t) + next))), []);
  const css = fs.readFileSync(path.join(app, 'src/source-composer.css'), 'utf8');
  for (const gone of ['.sc-zone[data-code-layout="presets"]', '.sc-composer.composer', '.sc-input-cell', '.sc-placeholder-fit-probe', '.sc-suggestion-ghost',
    '.sc-history-header-grid', '.sc-history-header-clip', '.sc-history-header {', '.sc-bash-badge', '.sc-composer[data-bash-mode]', '.sc-zone .sc-chin {', '.sc-chin-leading', '.sc-chin-trailing'])
    assert.ok(!css.includes(gone), `${gone} is replaced by the shell's own classes`);
  // The side chat keeps the host row (.sc-surface > .sc-input-row > .sc-input), so the editor box rules are scoped to it.
  assert.match(css, /\.sc-composer \.sc-input-row \.sc-input \{ display: block;/);
  // R4i-graph GR3: the shell's editor has no data-placeholder (cm's span), so the rules that placed its ::before inside the
  // editor box are gone, the host placeholder ::before needs [data-placeholder] (the side chat's editor), and the .sc-add
  // sizes went with the host + (both + are the official Oj trigger now).
  assert.ok(!css.includes('[data-cds="ChatComposerEditor"] > .sc-input.ProseMirror[data-empty=true]::before'), 'no shell-box placeholder rule');
  assert.ok(!/\.sc-add(?:\s*\{|\s+\[)/.test(css), 'no .sc-add rule');
  const editorCss = fs.readFileSync(path.join(app, 'src/source-composer-editor.css'), 'utf8');
  assert.match(editorCss, /\.sc-composer \.sc-input\.ProseMirror\[data-empty=true\]\[data-placeholder\]::before\{content:attr\(data-placeholder\);/);
  assert.match(css, /\.sc-composer\[data-drag-over\] \[data-cds="ChatComposer"\] > \.sc-card \{/);
});

const HTML_ATTRS = Object.fromEntries([...(/<html\b([^>]*)>/.exec(fs.readFileSync(path.join(app, 'index.html'), 'utf8'))[1]).matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
let sheetsCache;
test('real cascade: the card, editor box, actions and chin take every tracked property from the official sheet, not a local rule', () => {
  const root = element('div', { id: 'root' });
  element('html', HTML_ATTRS, [element('body', {}, [root])]);
  for (const node of parseMarkup(render({ ...session, draft: '' }))) append(root, node);
  // EditorView adds ProseMirror to the host element at runtime.
  const input = find(root, (n) => n.attrs.role === 'textbox');
  input.attrs.class = `${cls(input)} ProseMirror`;
  const cascade = (sheetsCache ??= loadCascade(appSheets(app)));
  const shell = byCds(root, 'ChatComposer');
  const [card, chin] = kids(shell);
  const box = byCds(card, 'ChatComposerEditor');
  const chinRow = find(chin, (n) => n.attrs['data-size'] === 'xs');
  const props = ['color', 'background-color', 'font-family', 'font-size', 'line-height', 'padding-top', 'padding-left', 'padding-right', 'padding-bottom',
    'min-height', 'max-height', 'border-top-left-radius', 'overflow-y', 'cursor'];
  const local = [];
  for (const node of [shell, card, box, chin, chinRow, input])
    for (const property of props) {
      const r = computed(cascade, node, property);
      if (r.from && !r.inheritedFrom && r.from.sheet.startsWith('src/') && r.from.layer !== 'base') local.push(`${node.attrs['data-cds'] ?? cls(node).split(' ')[0]} ${property}: ${r.value} (${r.from.sheet}:${r.from.line})`);
    }
  // The one local declaration left on these nodes is the host editor's own ProseMirror basics (source-composer-editor.css).
  assert.deepEqual(local.filter((l) => !l.startsWith('sc-input overflow-y: auto (src/source-composer-editor.css')), []);
  const fromOfficial = (node, property) => { const r = computed(cascade, node, property); assert.equal(r.from?.sheet, OFFICIAL, `${property} from ${r.from?.sheet}:${r.from?.line}`); return r.value; };
  assert.match(fromOfficial(card, 'border-top-left-radius'), /--cds-radius-composer/, 'rounded-composer');
  assert.match(fromOfficial(box, 'padding-top'), /var\(--cmp-row-py\)/, 'py-[var(--cmp-row-py)]');
  assert.match(fromOfficial(box, 'font-size'), /--cmp-type-size/);
  assert.match(fromOfficial(chinRow, 'color'), /text-secondary/);
  assert.equal(computed(cascade, input, 'padding-left').from?.sheet?.startsWith('src/') ?? false, false, 'the host .sc-input box rule no longer reaches the card editor');
});

// ---------------------------------------------------------------- the original hooks, driven
// A hook dispatcher for one component (re-renders until stable), with explicit context values and collected effects.
function hookFixture(component, contexts = new Map()) {
  let cursor = 0, result, dirty = false;
  const cells = [], effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (fn, deps) => { const i = cursor++; const cell = cells[i]; if (!cell || !deps || !same(cell.deps, deps)) { effects.push({ i, fn }); cells[i] = { ...(cell ?? {}), deps }; } };
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, cells[i].set ??= (v) => { const next = typeof v === 'function' ? v(cells[i].value) : v; if (!Object.is(next, cells[i].value)) { cells[i].value = next; dirty = true; } }]; },
    useReducer(reducer, initial, init) { const [state, set] = hooks.useState(() => (init ? init(initial) : initial)); return [state, (action) => set((s) => reducer(s, action))]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useContext(context) { return contexts.has(context) ? contexts.get(context) : context._currentValue; },
    use(context) { return hooks.useContext(context); },
    useEffect: effect, useLayoutEffect: effect, useInsertionEffect: effect,
    useImperativeHandle(ref, create, deps) { effect(() => { const value = create(); if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; }, deps); },
    useSyncExternalStore(subscribe, get) { return get(); },
    useId() { const i = cursor++; cells[i] ??= { value: `:r${i}:` }; return cells[i].value; },
    useDebugValue() {}, useTransition() { return [false, (fn) => fn()]; }, useDeferredValue(v) { return v; },
  };
  const cleanups = new Map();
  const flushEffects = () => { while (effects.length) { const { i, fn } = effects.shift(); cleanups.get(i)?.(); const c = fn(); if (typeof c === 'function') cleanups.set(i, c); } };
  const render = (...args) => {
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    for (let pass = 0; pass < 8; pass++) {
      dirty = false; cursor = 0; internal.H = hooks;
      try { result = component(...args); } finally { internal.H = old; }
      flushEffects();
      if (!dirty) break;
    }
    return result;
  };
  return { render, unmount: () => { for (const c of cleanups.values()) c?.(); cleanups.clear(); } };
}
// React elements under a rendered tree (props.children, and render props are not called).
const elements = (node, out = []) => {
  if (Array.isArray(node)) { for (const n of node) elements(n, out); return out; }
  if (!node || typeof node !== 'object' || !node.props) return out;
  out.push(node); elements(node.props.children, out); return out;
};
const withDom = (t, globals) => {
  const saved = Object.fromEntries(Object.keys(globals).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [k, v] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  t.after(() => { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
};
function fakeWorld() {
  const frames = [], observers = { resize: [], mutation: [] };
  class FakeResizeObserver { constructor(cb) { this.cb = cb; this.nodes = []; observers.resize.push(this); } observe(n) { this.nodes.push(n); } unobserve() {} disconnect() { this.disconnected = true; } }
  class FakeMutationObserver { constructor(cb) { this.cb = cb; this.targets = []; observers.mutation.push(this); } observe(n, o) { this.targets.push([n, o]); } disconnect() { this.disconnected = true; } takeRecords() { return []; } }
  const view = { ResizeObserver: FakeResizeObserver, getComputedStyle: () => ({ display: 'block', direction: 'ltr', lineHeight: '20px', fontSize: '14px' }) };
  const doc = { nodeType: 9, defaultView: view, activeElement: null, body: { addEventListener() {}, removeEventListener() {} } };
  const rect = (top, bottom, left = 0, right = 300) => ({ top, bottom, left, right, width: right - left, height: bottom - top });
  const node = (extra = {}) => ({ nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', localName: 'div', ownerDocument: doc, dataset: {}, ...extra });
  const p1 = node({ tagName: 'P', getBoundingClientRect: () => rect(4, 24), querySelector: () => null });
  const p2 = node({ tagName: 'P', getBoundingClientRect: () => rect(24, 44) });
  const ghost = { offsetHeight: 60 };
  const box = node({ querySelectorAll: (sel) => (sel === ':scope > [data-composer-placeholder-ghost]' ? world.ghosts : []) });
  const editor = node({ isContentEditable: true, offsetHeight: 40, clientWidth: 300, children: [p1], parentElement: box,
    focus() { doc.activeElement = editor; editor.focused = (editor.focused ?? 0) + 1; } });
  // Live element counts (a spread would freeze them).
  Object.defineProperties(editor, { childElementCount: { get: () => editor.children.length }, firstElementChild: { get: () => editor.children[0] } });
  // Af reads MutationObserver from the global scope (`typeof MutationObserver > "u"`), ResizeObserver from the node's window.
  view.MutationObserver = FakeMutationObserver;
  const world = { frames, observers, doc, editor, box, p1, p2, ghost, ghosts: [], view, rect, node,
    // Uu (one paragraph: does its text wrap?) walks the text with the global document: no text rects here, so one line.
    globals: { NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }, document: { createTreeWalker: () => ({ nextNode: () => null }), createRange: () => ({ selectNodeContents() {}, getClientRects: () => [] }) }, MutationObserver: FakeMutationObserver, requestAnimationFrame: (cb) => { frames.push(cb); return frames.length; }, cancelAnimationFrame: () => {}, getComputedStyle: view.getComputedStyle },
    flushFrames: () => { let n = 0; while (frames.length && n < 20) { frames.shift()(); n++; } return n; } };
  return world;
}

test("Af's --cmp-wrap-h: observes the measured editor and its box, writes the content height (ghosts included) once per change, cleans up", (t) => {
  const w = fakeWorld();
  withDom(t, w.globals);
  let editorProps;
  const props = { editor: { draftStoreKey: 'k', hasDraftText: () => false, trailingNotch: 'float', focus: noop, render: (p) => { editorProps = p; return null; } }, multiline: false };
  const f = hookFixture(() => Shell.ChatComposerShell.render(props, null));
  let out = f.render();
  assert.equal(typeof editorProps.onMeasureTarget, 'function', 'Af hands its editor onMeasureTarget');
  // The wrapper Re: the element whose ref the effect writes the variable to.
  const style = new Map();
  const wrapEl = { style: { setProperty: (k, v) => style.set(k, v) } };
  // (No actions here, so the editor row reserves the trailing column: Re's class is `w-full min-w-0` + Ka.)
  const wrapper = elements(out).find((e) => typeof e.props.className === 'string' && e.props.className.startsWith('w-full min-w-0') && e.props.ref);
  assert.ok(wrapper && 'current' in wrapper.props.ref, 'the editor wrapper carries a ref');
  assert.ok(wrapper.props.className.endsWith(Layout.reserveTrailingClass));
  wrapper.props.ref.current = wrapEl;
  editorProps.onMeasureTarget(w.editor);
  out = f.render();
  const ro = w.observers.resize.find((o) => o.nodes.includes(w.editor));
  assert.ok(ro, 'a ResizeObserver from the editor\'s own window watches it');
  const mo = w.observers.mutation.find((o) => o.targets.some(([n]) => n === w.editor));
  assert.deepEqual(mo.targets.map(([n, o]) => [n === w.editor ? 'editor' : n === w.box ? 'box' : '?', o]), [
    ['editor', { childList: true, subtree: true, characterData: true }],
    ['box', { childList: true, attributes: true, attributeFilter: ['data-composer-placeholder-ghost'] }]]);
  ro.cb();
  assert.equal(style.get('--cmp-wrap-h'), '20px', 'one paragraph: 24 - 4');
  w.editor.children = [w.p1, w.p2]; style.clear();
  mo.cb(); assert.equal(style.size, 0, 'a mutation waits for the next frame');
  w.flushFrames(); assert.equal(style.get('--cmp-wrap-h'), '40px', 'two paragraphs: 44 - 4');
  style.clear(); ro.cb(); assert.equal(style.size, 0, 'unchanged height: no write');
  w.ghosts = [w.ghost]; ro.cb(); assert.equal(style.get('--cmp-wrap-h'), '60px', 'a taller placeholder ghost wins');
  f.unmount();
  assert.equal(ro.disconnected, true); assert.equal(mo.disconnected, true);
});

test("Af's multiline switch (classic, Qu): a second editor block flips the card to multiline — data-multiline, the actions row below", (t) => {
  const w = fakeWorld();
  withDom(t, w.globals);
  let editorProps;
  const send = h('span', { 'data-send': '' });
  // forwardRef's render(props, ref); the parts are the props' children, as JSX would pass them.
  const make = (multiline) => hookFixture(() => Shell.ChatComposerShell.render({ multiline, children: h(Shell.ChatComposerParts.Actions, { send }),
    editor: { draftStoreKey: 'k', hasDraftText: () => true, trailingNotch: 'float', focus: noop, render: (p) => { editorProps = p; return null; } } }, null));
  const rootOf = (out) => elements(out).find((e) => e.props['data-cds'] === 'ChatComposer');
  const f = make(undefined);
  let out = f.render();
  assert.equal(rootOf(out).props['data-multiline'], undefined);
  editorProps.onMeasureTarget(w.editor);
  out = f.render();
  w.flushFrames(); out = f.render();
  assert.equal(rootOf(out).props['data-multiline'], undefined, 'one paragraph that fits stays one row');
  w.editor.children = [w.p1, w.p2];
  for (const o of w.observers.mutation) o.cb();
  w.flushFrames(); out = f.render();
  assert.equal(rootOf(out).props['data-multiline'], true, 'Wu: more than one block');
  // The layout context the parts and the editor box read (Le): multiline, and the start inset follows (text, no glyph lead).
  const layout = elements(out).find((e) => e.props.value && 'columnReservesTrailing' in e.props.value).props.value;
  assert.equal(layout.multiline, true);
  assert.equal(layout.startInset, 'text');
  // The presets card passes multiline false: Qu is off and the card stays one row whatever the editor holds.
  const g = make(false);
  out = g.render(); editorProps.onMeasureTarget(w.editor); out = g.render(); w.flushFrames(); out = g.render();
  assert.equal(rootOf(out).props['data-multiline'], undefined);
});

test("Af's click-to-focus: a press on the card's empty area focuses the editor (via the host focus) and keeps the click; a button press does not", (t) => {
  const w = fakeWorld();
  withDom(t, w.globals);
  let focused = 0;
  const f = hookFixture(() => Shell.ChatComposerShell.render({ editor: { draftStoreKey: 'k', hasDraftText: () => false, trailingNotch: 'float', focus: () => { focused++; }, storeCaret: noop, render: () => null } }, null));
  const out = f.render();
  const card = elements(out).find((e) => typeof e.props.onMouseDown === 'function' && typeof e.props.className === 'string' && e.props.className.includes('rounded-composer'));
  assert.ok(card, 'the card takes the press');
  const cardEl = w.node({ contains: (n) => n === cardEl || n.parentNode === cardEl, closest: () => null });
  const blank = w.node({ parentNode: cardEl, closest: () => null, offsetWidth: 100, clientWidth: 100, offsetHeight: 20, clientHeight: 20 });
  let prevented = 0;
  const press = (target) => card.props.onMouseDown({ button: 0, target, currentTarget: cardEl, clientX: 5, clientY: 5, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false,
    nativeEvent: { offsetX: 5, offsetY: 5 }, preventDefault: () => { prevented++; } });
  press(blank);
  assert.equal(focused, 1, 'g.focus: the host focus');
  assert.equal(prevented, 1, 'the press does not move the selection out of the editor');
  const button = w.node({ parentNode: cardEl, closest: (sel) => (sel.includes('button') ? button : null) });
  press(button);
  assert.equal(focused, 1, 'a control in the card keeps its own press');
});

test("Af's drop hook stays idle without onFileDrop (the host card's own drop handling): no page listeners, no drop panel, never the scrim", (t) => {
  const w = fakeWorld();
  const listeners = [];
  w.doc.body.addEventListener = (type) => listeners.push(type);
  withDom(t, w.globals);
  const f = hookFixture(() => Shell.ChatComposerShell.render({ dropScope: 'card', editor: { draftStoreKey: 'k', hasDraftText: () => false, trailingNotch: 'float', focus: noop, render: () => null } }, null));
  const out = f.render();
  assert.deepEqual(listeners, []);
  assert.equal(elements(out).some((e) => e.props['data-cds'] === 'ChatComposerDropPanel'), false);
  assert.throws(() => Adapters.ComposerPageDropSurface({ children: null }), /not wired in the host/);
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  const shell = source.slice(source.indexOf('<SourceComposerShell '), source.indexOf('</SourceComposerShell>'));
  assert.ok(shell.length > 1000);
  assert.doesNotMatch(shell.slice(0, shell.indexOf('editor={{')), /onFileDrop|dropScope/, 'the host never hands the shell a drop handler');
  // R4g-composer CP1: the shell's CDS contexts are view-tabs instances and main.jsx wraps the Code composer in CdsRoot
  // (tests/composer-cds-root.test.mjs); the shell itself renders none.
  assert.doesNotMatch(source, /<CdsRoot\b|createElement\(CdsRoot|h\(CdsRoot/, 'source-composer.jsx');
});

// ---------------------------------------------------------------- the host half: yp and cm's box
test('SourceComposerShell (yp): fills in focus / storeCaret / trailingNotch "float" and renders the editor box through render', () => {
  let handleTarget = null;
  const editorRef = { current: null };
  const f = hookFixture(() => Host.SourceComposerShell.render({ busy: false, editorRef, editor: { draftStoreKey: 'k', hasDraftText: () => true, node: h('div'), className: 'epitaxy-prompt-input', maxHeight: 'min(24rem, 40svh)' } }, null));
  const out = f.render();
  assert.equal(out.type, Shell.ChatComposerShell);
  assert.equal(out.props.dropScope, 'card'); assert.equal(out.props.variant, 'default');
  const ed = out.props.editor;
  assert.equal(ed.trailingNotch, 'float'); assert.equal(ed.draftStoreKey, 'k'); assert.equal(ed.hasDraftText(), true);
  assert.equal(ed.handoffCard, undefined, 'no card hand-off motion (the Code card passes no motion)');
  const rendered = ed.render({ disabled: false, onMeasureTarget: noop, extraEditorAttributes: undefined });
  assert.equal(rendered.type, Host.ComposerShellEditor);
  assert.equal(rendered.props.className, 'epitaxy-prompt-input'); assert.equal(rendered.props.maxHeight, 'min(24rem, 40svh)');
  // Df: the editor box's handle reaches both the shell (focus / storeCaret) and the caller's editorRef.
  const calls = [];
  const handle = { focus: () => calls.push('focus'), placeCaretAtDom: (n, o) => calls.push(['caret', n, o]) };
  rendered.props.ref(handle);
  assert.equal(editorRef.current, handle);
  ed.focus(); ed.storeCaret('text-node', 3);
  assert.deepEqual(calls, ['focus', ['caret', 'text-node', 3]], 'vp: the resolved caret goes to the host editor');
  // Ef reads the CDS labels (Z): the reply card's "Reply", nothing for a new one.
  assert.deepEqual(hookFixture(() => [Shell.chatComposerFormPlaceholder('new'), Shell.chatComposerFormPlaceholder('reply')]).render(), [undefined, 'Reply']);
});

test("ComposerShellEditor (gp / cm's box): the layout context's start inset, settled after a frame, the content report and the measure target", (t) => {
  const frames = [];
  withDom(t, { requestAnimationFrame: (cb) => { frames.push(cb); return frames.length; }, cancelAnimationFrame: noop });
  const reports = [], measured = [], seen = [];
  const node = h('div', { className: 'sc-input', 'data-cds': 'ChatComposerEditor', placeholder: 'Describe a task', inputRef: (el) => seen.push(el) });
  const contexts = new Map([[Layout.ChatComposerLayoutContext, { multiline: false, startInset: 'text', endInset: 'actions', glideArmed: true, columnReservesTrailing: false }],
    [Layout.SendPinContext, (v) => reports.push(v)]]);
  const ref = { current: null };
  const props = { node, className: 'epitaxy-prompt-input', maxHeight: 'min(24rem, 40svh)', disabled: false, hasText: true, onMeasureTarget: (el) => measured.push(el), extraEditorAttributes: { 'aria-label': 'Prompt', title: undefined } };
  const f = hookFixture(() => Host.ComposerShellEditor.render(props, ref), contexts);
  let out = f.render();
  assert.equal(out.props.className, 'relative min-w-0');
  const [placeholderSpan, box] = out.props.children;
  assert.equal(placeholderSpan, null, 'a draft: no placeholder span');
  assert.equal(box.props['data-cds'], 'ChatComposerEditor');
  assert.equal(box.props.className, Layout.editorClass({ startInset: 'text', disabled: false, settled: false, className: ViewTabs.cdsClassNames(Layout.proseMirrorContentClass, 'epitaxy-prompt-input') }));
  assert.match(box.props.className, /transition-none motion-safe:transition-none/, 'not settled before the first frame');
  assert.deepEqual(box.props.style, { maxHeight: 'min(24rem, 40svh)' });
  const [editor, ghosts] = box.props.children;
  assert.deepEqual(ghosts, [], 'no placeholder given: no ghost');
  assert.equal(editor.props['data-cds'], undefined); assert.equal(editor.props.autoHeight, false);
  assert.equal(editor.props.placeholder, undefined, 'R4g CP2: the editor gets no copy (its ::before stays empty), cm\'s span shows it');
  assert.equal(editor.props['data-doc-empty'], 'false', 'shared-28 docEmptyAttribute: the draft has text');
  assert.equal(editor.props['aria-label'], 'Prompt', 'the shell-merged attributes reach the editor element');
  assert.ok(!('title' in editor.props), 'undefined attributes are not passed');
  assert.deepEqual(reports, [true], 'cm: the content report (Wa) the shell send state reads');
  const element = { focus() { this.focused = true; }, caretAtEdge: (side) => side === 'start', selectionStart: 4, value: 'abcd', placeCaretAtDom(n, o) { this.caret = [n, o]; } };
  editor.props.inputRef(element);
  assert.deepEqual(seen, [element]); assert.deepEqual(measured, [element], 'onMeasureTarget gets the ProseMirror element');
  assert.equal(ref.current.getElement(), element);
  ref.current.focus(); assert.equal(element.focused, true);
  assert.equal(ref.current.getIsAtStart(), true); assert.equal(ref.current.getIsAtEnd(), false); assert.equal(ref.current.getCursorOffset(), 4);
  ref.current.placeCaretAtDom('n', 2); assert.deepEqual(element.caret, ['n', 2]);
  frames.shift()();
  out = f.render();
  assert.doesNotMatch(out.props.children[1].props.className, /transition-none/, 'settled once hydrated and the glide is armed');
});

// R4g-composer CP2 (X7-08): shared-9 cm's placeholder — span[data-composer-placeholder] before the box (shared-26 $a with
// the fit box Ya, shared-28 Jx's elementtiming, shared-5 Xf's resolved copy), and for the "grow" fit one invisible
// [data-composer-placeholder-ghost] per line in the box (Qa, Yf) stacked with the editor by the box's grid (eo).
test("ComposerShellEditor placeholder: cm's span and grow ghost (clamp: one truncated line, no ghost), hidden by a draft", (t) => {
  withDom(t, { requestAnimationFrame: () => 1, cancelAnimationFrame: noop });
  const node = h('div', { className: 'sc-input', placeholder: 'stale copy', inputRef: noop });
  const layout = (value) => new Map([[Layout.ChatComposerLayoutContext, { multiline: false, startInset: 'text', endInset: 'actions', glideArmed: true, columnReservesTrailing: false, ...value }],
    [Layout.SendPinContext, noop]]);
  const renderEditor = (props, value) => hookFixture(() => Host.ComposerShellEditor.render({ node, className: 'epitaxy-prompt-input', maxHeight: 'min(24rem, 40svh)', disabled: false, hasText: false, ...props }, { current: null }), layout(value)).render();
  // grow (uM: no compact copy, or bash mode)
  let out = renderEditor({ placeholder: 'Describe a task', placeholderFit: 'grow' });
  let [span, box] = out.props.children;
  assert.equal(span.type, 'span');
  assert.equal(span.props['data-composer-placeholder'], ''); assert.equal(span.props['aria-hidden'], 'true');
  assert.equal(span.props.elementtiming, 'composer-placeholder-text', 'shared-28 Jx');
  const expected = Layout.placeholderProps({ multiline: false, minLines: undefined, maxHeight: 'min(24rem, 40svh)', placeholderFit: 'grow', startInset: 'text', disabled: false, settled: false, reserveTrailing: true, className: undefined });
  assert.equal(span.props.className, expected.className);
  assert.deepEqual(span.props.style, { maxHeight: 'min(24rem, 40svh)' });
  for (const token of ['pointer-events-none', 'select-none', 'absolute', 'left-0', 'top-0', 'max-h-96', 'overflow-hidden', 'break-words', 'pl-[4px]', 'pr-[var(--cmp-trail-w,0px)]', 'text-muted', 'transition-none'])
    assert.ok(span.props.className.split(/\s+/).includes(token), token);
  assert.ok(!span.props.className.includes('truncate'), 'grow wraps');
  assert.equal(span.props.children.props.resolved.text, 'Describe a task');
  assert.equal(span.props.children.type({ resolved: span.props.children.props.resolved }), 'Describe a task', 'Zf: a plain string is its text');
  let [editor, ghosts] = box.props.children;
  assert.match(box.props.className, /(^| )grid \[&>\*\]:\[grid-area:1\/1\] \[&>\*\]:min-w-0 epitaxy-prompt-input$/, 'cm: (Fe !== void 0 || Re) && the stacking grid, before z');
  assert.equal(ghosts.length, 1);
  assert.equal(ghosts[0].key, 'Describe a task');
  assert.deepEqual(ghosts[0].props, Layout.placeholderGhostProps({ text: 'Describe a task', multiline: false, reserveTrailing: true }));
  assert.equal(ghosts[0].props.children, undefined, 'the sheet draws the ghost text (:before content: attr(data-composer-placeholder-ghost))');
  assert.equal(editor.props.placeholder, undefined); assert.equal(editor.props['data-doc-empty'], 'true');
  // clamp (uM: a compact copy can be swapped in): one truncated line, no ghost, no grid.
  out = renderEditor({ placeholder: 'Enter to send, Ctrl+Enter to queue for later', placeholderFit: 'clamp' });
  [span, box] = out.props.children;
  assert.ok(span.props.className.split(/\s+/).includes('truncate'));
  assert.ok(!span.props.className.split(/\s+/).includes('break-words'));
  assert.deepEqual(box.props.children[1], []);
  assert.doesNotMatch(box.props.className, /grid-area/);
  // multiline (or a column that reserves the trailing actions): no trailing reserve; the start inset follows the layout.
  out = renderEditor({ placeholder: 'Describe a task', placeholderFit: 'grow' }, { multiline: true, startInset: 'none' });
  [span, box] = out.props.children;
  assert.ok(!span.props.className.includes('pr-[var(--cmp-trail-w'));
  assert.ok(!span.props.className.includes('pl-[4px]'));
  assert.ok(!box.props.children[1][0].props.className.includes('pr-[var(--cmp-trail-w'));
  // a draft hides the span but keeps the ghost (the box keeps the placeholder's height, as cm's ze ignores emptiness)
  out = renderEditor({ placeholder: 'Describe a task', placeholderFit: 'grow', hasText: true });
  [span, box] = out.props.children;
  assert.equal(span, null);
  assert.equal(box.props.children[1].length, 1);
  assert.equal(box.props.children[0].props['data-doc-empty'], 'false');
  // an empty copy (a shown suggestion: uM K ? "") renders neither span nor ghost; disabled dims the span (opacity-60).
  out = renderEditor({ placeholder: '', placeholderFit: 'grow' });
  assert.equal(out.props.children[0], null); assert.deepEqual(out.props.children[1].props.children[1], []);
  out = renderEditor({ placeholder: 'Describe a task', placeholderFit: 'grow', disabled: true });
  assert.ok(out.props.children[0].props.className.includes('cursor-default opacity-60'));
  // the minified original: cm's placeholder span, ghosts and grid (shared-9) and the imports they resolve to.
  const shared9 = fs.readFileSync(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-9-D7uuiUv7.js'), 'utf8');
  const count = (text, needle) => text.split(needle).length - 1;
  for (const needle of ['Ie=Rt(h,m),Le=Ie==="grow"?Qi(u):[],Re=Le.length>0,ze=Le.map(e=>c("span",{...jt({text:e,multiline:V,reserveTrailing:!ue})},e))',
    'fe&&W&&Fe===void 0&&ye.text?c("span",{"data-composer-placeholder":"","aria-hidden":"true",...Ja,...Ft({multiline:V,minLines:h,maxHeight:g,placeholderFit:Ie,startInset:H,disabled:v,settled:Me,reserveTrailing:!ue,className:d}),children:c(da,{resolved:ye})}):null',
    '(Fe!==void 0||Re)&&"grid [&>*]:[grid-area:1/1] [&>*]:min-w-0"', 'ye=Xi(u,fe&&W)', 'lh as jt', 'uh as Ft', 'yh as Rt', 'Dc as Xi', 'Ec as Qi', 'Tc as da', 'Fi as Ja'])
    assert.equal(count(shared9, needle), 1, needle);
  assert.equal(Layout.stackedEditorClass, 'grid [&>*]:[grid-area:1/1] [&>*]:min-w-0', 'shared-26 eo is cm\'s literal');
  const sheet = fs.readFileSync(path.join(app, OFFICIAL), 'utf8');
  assert.equal(count(sheet, '.cds-root [data-composer-placeholder-ghost]:before{content:attr(data-composer-placeholder-ghost)}'), 1);
  assert.equal(count(sheet, '.cds-root [data-composer-placeholder]:has(+[data-cds=ChatComposerEditor] [data-doc-empty=false])'), 1);
});

test('SourceComposerEditor: autoHeight off leaves the height to the box; placeCaretAtDom is shared-5 vp on the view', () => {
  const editor = fs.readFileSync(path.join(app, 'src/source-composer-editor.jsx'), 'utf8');
  assert.match(editor, /keywordHighlight=false,emoticons=true,bashMode=false,autoHeight=true,\.\.\.props\}\)/, 'autoHeight never reaches the DOM');
  assert.match(editor, /const measure=\(\)=>\{if\(latest\.current\.autoHeight===false\)\{input\.style\.height='';return;\}/);
  assert.match(editor, /input\.placeCaretAtDom=\(target,offset\)=>\{[^\n]*pos=editor\.posAtDOM\(target,offset\)[^\n]*\n[^\n]*TextSelection\.near\(doc\.resolve\(Math\.max\(0,Math\.min\(pos,doc\.content\.size\)\)\)\)\)\);editor\.focus\(\);\};/);
  const shared5 = fs.readFileSync(path.join(readable, 'shared-5-kdJVRUsT.js'), 'utf8');
  assert.ok(shared5.includes('e.commands.setTextSelection(e.view.posAtDOM(t, n)), e.view.focus());'), 'vp');
  assert.ok(shared5.includes('trailingNotch: "float",'), 'yp');
  // uM's props the host card transcribes (generator pins them too).
  const c227 = fs.readFileSync(path.join(readable, 'c227f4d5e-Ba-r--Rl.js'), 'utf8');
  for (const pin of ['multiline: !ve && void 0,', 'onClusterWidthsChange: ve ? ct : void 0,', 'ut = Bo(U && tM, ve && nM, ke) || void 0,', 'maxHeight: "min(24rem, 40svh)",',
    'className: "epitaxy-prompt-input",', '"epitaxy-attachment-shelf w-full",', 'mt && pt ? v(m, { children: [mt, pt] }) : (mt ?? pt),', 'className: "truncate text-muted-as-secondary",'])
    assert.ok(c227.includes(pin), pin);
});

test('the presets shelf start (uM ct): the leading cluster width minus rM lands on the card root as --epitaxy-shelf-start', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.match(source, /card\.current\?\.style\.setProperty\(shelfStartProperty, `\$\{Math\.max\(0, leading - shelfStartInset\)\}px`\);/);
  assert.match(source, /onClusterWidthsChange=\{singleRowCard \? clusterWidths : undefined\}/);
  assert.equal(Card.shelfStartProperty, '--epitaxy-shelf-start'); assert.equal(Card.shelfStartInset, 4);
  // main.jsx finds the chin by its host hook; it is the shell's Chin now.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /scope\(\)\.querySelector\("\.sc-chin"\)/);
  assert.match(render({ ...session }), /<div data-cds="ChatComposerChin" aria-hidden="false" class="[^"]* sc-chin /);
});

// ---------------------------------------------------------------- R4g-composer CP5 (X7-11): uM's middle Overlay
// Correction to X7-11: uM's middle lc.Overlay (`Je ? D(sc, …) : null`) is not a keyword / bash highlight layer. sc is
// shared-5 XO, the dictation "Listening..." line (an aria-hidden <p>, italic text-muted-as-secondary, font-mono in bash
// mode), shown only while a dictation session owns this editor (Je = shared-5 HO). The 2.42304.0 renderer has no
// "ultracode" keyword highlight at all (ultracode is an effort level there); the host's keyword mark is its own feature.
test("2.42304.0: uM's middle Overlay is shared-5 XO, the dictation 'Listening...' line, gated on an active dictation session", () => {
  const c227 = fs.readFileSync(path.join(REFERENCE, 'c227f4d5e-Ba-r--Rl.js'), 'utf8');
  for (const needle of ['D(lc.Overlay,{children:Je?D(sc,{getEditor:Ze,text:Xe,className:Bo(oM,U&&"font-mono")}):null})',
    'Je=cc(j),Ye=dc(j),Xe=je.formatMessage({defaultMessage:"Listening...",id:"fFXFXLn7w9"}),Ze=H(()=>j,[j])',
    'oM="italic text-muted-as-secondary"', 'placeholder:K?"":Je?Xe:qe,placeholderClassName:Je?"italic":void 0', 'Zt as sc,', 'an as cc,'])
    assert.equal(c227.split(needle).length - 1, 1, needle);
  assert.equal(c227.split('D(lc.Overlay,{').length - 1, 3, "uM's three overlays: suggestion ghost, dictation, fit probe");
  // sc / cc come from shared-5 (the import statement that binds them).
  const at = c227.indexOf('Zt as sc,');
  assert.equal(c227.slice(c227.indexOf('from"', at), c227.indexOf('from"', at) + 28), 'from"./shared-5-kdJVRUsT.js"');
  const shared5 = fs.readFileSync(path.join(REFERENCE, 'shared-5-kdJVRUsT.js'), 'utf8');
  for (const needle of ['function XO({getEditor:e,text:t,className:n}){let r=H(t=>{let n=e();return n?.on("transaction",t),()=>{n?.off("transaction",t)}},[e]);return U(r,()=>{let t=e();return t?.isDestroyed===!1&&VO(t)})?O("p",{"aria-hidden":"true",className:n,children:t}):null}',
    'function HO(e){return Pa(()=>e!==null&&LO(e)!==null)}', 'XO as Zt', 'HO as an', 'name:"dictation"'])
    assert.equal(shared5.split(needle).length - 1, 1, needle);
  // Code passes hideDictation:!Lf: no dictation, no session, Je stays false and the overlay stays empty.
  assert.equal(occurrences('cc43287c9-DAfOi8yP.js', 'hideDictation:!Lf'), 1);
  // No keyword highlight anywhere in the renderer.
  for (const file of fs.readdirSync(REFERENCE).filter((name) => name.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(REFERENCE, file), 'utf8');
    assert.equal(text.split('ultracode-keyword').length - 1 + text.split('Ultracode keyword').length - 1, 0, file);
  }
});

test("an Overlay part without children renders nothing (jf qd's Eo guard), so the host's missing dictation overlay is uM's idle branch", () => {
  const Overlay = Host.ComposerShellParts.Overlay;
  const shell = (...children) => renderToStaticMarkup(h(Shell.ChatComposerShell, { editor: { hasDraftText: () => false, render: () => h('div', { role: 'textbox' }) } }, ...children));
  assert.equal(byCds(tree(shell(h(Overlay, null, null))), 'ChatComposerOverlay'), null, '`D(lc.Overlay, {children: null})`');
  assert.ok(byCds(tree(shell(h(Overlay, null, h('p', null, 'x')))), 'ChatComposerOverlay'), 'with children it draws');
});

test('the host card: no dictation line in any Overlay; the "ultracode" keyword stays an inline mark inside the editor', () => {
  const draft = 'ultracode fix the build';
  for (const props of [{ ...session, draft, workflowKeyword: { ignored: false, onToggle: noop } }, { ...session, draft: '!ls', shellMode: 'core' }, { ...session, draft: '' }]) {
    const html = render(props);
    assert.doesNotMatch(html, /Listening\.\.\.|data-dictation/);
    const overlays = [];
    (function walk(n) { if (n.attrs?.['data-cds'] === 'ChatComposerOverlay') overlays.push(n); for (const c of kids(n)) walk(c); })(byCds(tree(html), 'ChatComposer'));
    assert.equal(overlays.length, 0, 'no suggestion, no compact copy: every overlay empty');
  }
  // The keyword mark is the local editor's ProseMirror decoration (inside ChatComposerEditor), never an overlay layer,
  // so nothing stacks over it; the card turns it on only while the keyword counts.
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.equal(source.split('keywordHighlight={!!workflowKeyword && !workflowKeyword.ignored}').length - 1, 1);
  const editor = fs.readFileSync(path.join(app, 'src/source-composer-editor.jsx'), 'utf8');
  assert.match(editor, /Decoration\.inline\(composerPosition\(state\.doc,match\.start,1\),composerPosition\(state\.doc,match\.end,-1\),\{class:'sc-ultracode-keyword','data-ultracode-keyword':''\}\)/);
  assert.equal(source.split('<ComposerShellParts.Overlay>').length - 1, 2, 'the suggestion ghost and the fit probe; no dictation overlay');
});
