import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractChatComposerMenus } from '../scripts/extract-chat-composer-menus.mjs';
import { chatAddMenu, chatAddMenuMessages } from '../src/generated/chat-composer-menus/add-menu.mjs';
import { addMenuSlotGroups, splitAddMenuSlots, addMenuTestIds, withAddMenuTestIds } from '../src/generated/chat-composer-menus/add-menu-slots.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// w13-chatui-composer-tools (research/w13-chatui.md K2 / K3 / K5, research/w13-chatfn.md C1 / C2 / C8): the Chat card's +
// button is shared-8 kF, its menu is c752b32f8 Js's slot assembly (na testids, shared-8 lN groups, separator-tools /
// separator-modes); 3.6556.2 has no separate composer tools menu and no Chat style picker.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(v1, 'assets/v1', name), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(v1, 'i18n/en-US.json'), 'utf8'));

let server, M, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-chat-tools-menu.jsx');
  C = await server.ssrLoadModule('/src/source-chat-composer.jsx');
});
after(() => server?.close());

const noop = () => {};
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const buttonTag = (html, testId) => {
  const at = html.indexOf(`data-testid="${testId}"`);
  assert.ok(at >= 0, `${testId} rendered`);
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1);
};

test('the generator is current (--check)', async () => {
  const manifest = await extractChatComposerMenus({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  // w13-chatfn-tools (review 补做): Es / Ms, the Add to project popup's literals.
  assert.deepEqual(Object.keys(manifest.roots).sort(), ['Es', 'Fs', 'Js', 'Ms', 'Tz', 'Ws', 'cN', 'iN', 'ia', 'kF', 'ks', 'lN', 'na', 'oN', 'ra', 'sN', 'yz'].sort());
  assert.deepEqual(manifest.resolved.triggerTestId, { source: 'shared-1-BJhqMmkf.js', export: 'Qd', local: 'S_', value: 'chat-input-attach' });
});

test('generated copy and literals are the 3.6556.2 originals, and every message has zh-CN', () => {
  for (const descriptor of Object.values(chatAddMenuMessages)) {
    assert.equal(enUS[descriptor.id], descriptor.defaultMessage, descriptor.id);
    assert.ok(zh[descriptor.defaultMessage], `zh-CN for ${descriptor.defaultMessage}`);
  }
  const shared1 = official('shared-1-BJhqMmkf.js'), shared8 = official('shared-8-Db1QN4mf.js'), shared5 = official('shared-5-Bg6ZMqvt.js');
  const add = official('c752b32f8-mYZAs6yC.js');
  assert.ok(shared1.includes('S_="chat-input-attach"'));
  assert.ok(shared8.includes('"data-chorus-callout":"attach",iconOnly:!0,icon:c,variant:"ghost","aria-label":u,tooltip:!1'));
  assert.ok(shared8.includes('c=o===void 0?"Add":o') && shared8.includes('h("ms-0.5",g)') && shared8.includes('m=n?void 0:"/"'));
  assert.ok(add.includes('{type:"separator",label:"separator-tools"}') && add.includes('{type:"separator",label:"separator-modes"}'));
  assert.ok(add.includes('{type:"button",label:n,icon:"Camera",onAction:o}'));
  assert.ok(shared5.includes('icon:"Globe",checked:n,disabled:f,onAction:l,tooltip:o,closeOnClick:!0'));
  assert.ok(shared5.includes('icon:"Research",checked:n,disabled:r,tooltip:g,onAction:m,closeOnClick:!0'));
  assert.deepEqual({ ...chatAddMenu.trigger }, { callout: 'attach', variant: 'ghost', testId: 'chat-input-attach', icon: 'Add', className: 'ms-0.5', tooltipSide: 'bottom', shortcut: '/' });
  assert.deepEqual({ ...chatAddMenu.separators }, { tools: 'separator-tools', modes: 'separator-modes' });
});

test('the sliced slot tables behave as shared-8 lN and c752b32f8 ra', () => {
  assert.deepEqual(addMenuSlotGroups.map(group => group.length), [9, 5, 5]);
  assert.equal(addMenuTestIds.webSearch, 'add-menu-web-search');
  const slots = { uploadFile: { type: 'button' }, project: { type: 'submenu' }, connectors: { type: 'element' }, research: { type: 'checkbox' }, webSearch: { type: 'checkbox' }, memory: null };
  const tagged = withAddMenuTestIds(slots);
  assert.equal(tagged.uploadFile.testId, 'add-menu-upload-file');
  assert.equal(tagged.connectors.testId, undefined, 'ia leaves element rows alone');
  const ids = groups => groups.map(group => group.map(row => row.testId ?? row.type));
  assert.deepEqual(ids(splitAddMenuSlots(tagged)), [['add-menu-upload-file', 'add-menu-project'], ['element'], ['add-menu-research', 'add-menu-web-search']]);
  // Agent mode drops project / github / haystack / research / webSearch (oN); per-chat-tools-unavailable drops the tools group (cN).
  assert.deepEqual(ids(splitAddMenuSlots(tagged, true)), [['add-menu-upload-file'], ['element'], []]);
  assert.deepEqual(ids(splitAddMenuSlots(tagged, false, undefined, false, true)), [['add-menu-upload-file', 'add-menu-project'], [], ['add-menu-research', 'add-menu-web-search']]);
});

test('ChatAddTrigger renders shared-8 kF', () => {
  const html = renderToStaticMarkup(React.createElement(M.ChatAddTrigger, { onClick: noop }));
  const tag = buttonTag(html, 'chat-input-attach');
  assert.equal(attr(tag, 'aria-label'), 'Add files, connectors, and more');
  assert.equal(attr(tag, 'data-chorus-callout'), 'attach');
  assert.equal(attr(tag, 'data-cds'), 'Button');
  assert.ok(/\sdata-cds-icon-only=""/.test(tag) && /\sdata-cds-ghost=""/.test(tag), 'iconOnly ghost CdsButton');
  assert.match(attr(tag, 'class'), /(^| )ms-0\.5$/);
  assert.equal(attr(buttonTag(renderToStaticMarkup(React.createElement(M.ChatAddTrigger, { disabled: true })), 'chat-input-attach'), 'disabled'), '');
});

test('the Chat card uses kF for its Add control, new and reply', () => {
  const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
  const render = props => renderToStaticMarkup(React.createElement(C.SourceChatComposer, {
    editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'How can I help you today?' }),
    draft: '', scope: 'chat:fixture', mode: 'chat', onMenu: noop, onStop: noop, onFolder: noop,
    disabled: false, busy: false, sending: false, canSend: false, showStop: false,
    model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', ...props }));
  for (const current of [false, true]) {
    const tag = buttonTag(render({ current }), 'chat-input-attach');
    assert.equal(attr(tag, 'aria-label'), 'Add files, connectors, and more');
    assert.equal(attr(tag, 'aria-haspopup'), 'menu');
  }
  assert.doesNotMatch(render({}), /aria-label="Add"/);
  assert.equal(attr(buttonTag(render({ sending: true }), 'chat-input-attach'), 'disabled'), '', 'disabled while sending, as before');
});

test('the Chat + menu follows Js: base rows, separator-tools, tools, separator-modes, modes; toggles reach their handlers', () => {
  const calls = [];
  const slots = M.chatAddMenuSlots({ attach: () => calls.push('attach'), attachShortcut: 'cmd+u', screenshot: () => calls.push('screenshot'),
    connectors: React.createElement('span', { 'data-fixture': 'connectors' }),
    research: { checked: false, disabled: true, tooltip: chatAddMenuMessages.researchNeedsSearchIntegration.defaultMessage, onToggle: () => calls.push('research') },
    webSearch: { checked: true, disabled: false, onToggle: () => calls.push('web') } });
  const entries = M.chatAddMenuEntries(slots);
  assert.deepEqual(entries.map(e => e.testId ?? e.label), ['add-menu-upload-file', 'add-menu-screenshot', 'separator-tools', 'connectors', 'separator-modes', 'add-menu-research', 'add-menu-web-search']);
  const web = entries.find(e => e.testId === 'add-menu-web-search');
  assert.deepEqual([web.type, web.icon, web.checked, web.closeOnClick], ['checkbox', 'Globe', true, true]);
  web.onAction(); entries[0].onAction(); entries[1].onAction();
  assert.deepEqual(calls, ['web', 'attach', 'screenshot']);
  assert.equal(entries[0].focusesNothing, true);
  // Tz's blocked branch: Lock icon, unchecked, disabled, keeps the menu open.
  const blocked = M.chatAddMenuEntries(M.chatAddMenuSlots({ webSearch: { blocked: true, tooltip: 'Blocked' } }));
  assert.deepEqual(blocked.map(e => [e.label, e.icon, e.checked, e.disabled, e.closeOnClick, e.testId]),
    [['separator-modes', undefined, undefined, undefined, undefined, undefined], ['Web search', 'Lock', false, true, false, 'add-menu-web-search']]);
  assert.deepEqual(M.chatAddMenuEntries(M.chatAddMenuSlots({})), [], 'no slots, no rows and no separators');

  const html = renderToStaticMarkup(React.createElement(M.ChatAddMenuItems, { entries }));
  const order = ['Add files or photos', 'Take a screenshot', 'data-fixture="connectors"', 'Research', 'Web search'].map(s => html.indexOf(s));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), `row order ${order}`);
  assert.equal(html.split('role="separator"').length - 1, 2);
  assert.match(html, /role="menuitemcheckbox"[^>]*aria-checked="true"[^>]*data-testid="add-menu-web-search"|data-testid="add-menu-web-search"[^>]*role="menuitemcheckbox"[^>]*aria-checked="true"/);
  assert.match(html, /data-testid="add-menu-research"/);
});

// 复核修复 (review issue 1): kF's isMenuOpen reaches the Chat card from SourceComposer's menuKind, and the Chat branch
// of main.jsx case "add" (w13-chatfn-tools) can hand the host's own rows to Js's remaining slots in iN order.
test('kF drops its tooltip while the + menu is open; the Chat card wires addMenuOpen', () => {
  const closed = buttonTag(renderToStaticMarkup(React.createElement(M.ChatAddTrigger, {})), 'chat-input-attach');
  const open = buttonTag(renderToStaticMarkup(React.createElement(M.ChatAddTrigger, { isMenuOpen: true })), 'chat-input-attach');
  assert.match(closed, /\sdata-base-ui-tooltip-trigger=""/, 'label tooltip while closed');
  assert.doesNotMatch(open, /data-base-ui-tooltip-trigger/, 'kF: content p = isMenuOpen ? void 0 : label');
  assert.ok(official('shared-8-Db1QN4mf.js').includes('"Add files, connectors, and more"'));
  const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
  const render = props => buttonTag(renderToStaticMarkup(React.createElement(C.SourceChatComposer, {
    editorNode: React.createElement(Input, { className: 'sc-input' }), draft: '', scope: 'chat:fixture', mode: 'chat',
    onMenu: noop, model: { model: 'fixture' }, permission: 'ask', ...props })), 'chat-input-attach');
  for (const current of [false, true]) {
    assert.equal(attr(render({ current, addMenuOpen: true }), 'aria-expanded'), 'true');
    assert.doesNotMatch(render({ current, addMenuOpen: true }), /data-base-ui-tooltip-trigger/);
    assert.equal(attr(render({ current }), 'aria-expanded'), 'false');
  }
  const composer = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.ok(composer.includes('<SourceChatComposer ') && composer.includes('addMenuOpen={menuKind === "add"}'), 'SourceComposer passes the menu state');
});

test('host rows fill Js\'s addFolder / teach / github / skills / plugins slots in iN order', () => {
  const row = name => React.createElement('span', { 'data-row': name });
  const slots = M.chatAddMenuSlots({ attach: noop, screenshot: noop, connectors: row('connectors'),
    addFolder: row('add-folder'), teach: row('teach'), github: row('github'), skills: row('skills'), plugins: row('plugins'),
    webSearch: { checked: false, onToggle: noop } });
  // Js's own call: every iN key is in its slot object.
  const add = official('c752b32f8-mYZAs6yC.js');
  for (const key of ['addFolder:t', 'teach:r', 'github:o', 'skills:c', 'plugins:m']) assert.ok(add.includes(key), key);
  const entries = M.chatAddMenuEntries(slots);
  assert.deepEqual(entries.map(e => e.testId ?? e.label), ['add-menu-upload-file', 'add-folder', 'teach', 'add-menu-screenshot', 'github',
    'separator-tools', 'skills', 'connectors', 'plugins', 'separator-modes', 'add-menu-web-search']);
  // Agent mode (oN) drops github and the modes group; per-chat-tools-unavailable (cN) drops the tools group and teach.
  assert.deepEqual(M.chatAddMenuEntries(slots, { agentMode: true }).map(e => e.testId ?? e.label),
    ['add-menu-upload-file', 'add-folder', 'teach', 'add-menu-screenshot', 'separator-tools', 'skills', 'connectors', 'plugins']);
  assert.deepEqual(M.chatAddMenuEntries(slots, { perChatToolsUnavailable: true }).map(e => e.testId ?? e.label),
    ['add-menu-upload-file', 'add-folder', 'add-menu-screenshot', 'github', 'separator-modes', 'add-menu-web-search']);
  assert.deepEqual(M.chatAddMenuEntries(M.chatAddMenuSlots({ attach: noop, plugins: false, skills: null })).map(e => e.testId ?? e.label),
    ['add-menu-upload-file'], 'a falsy host row leaves its slot empty');
  const html = renderToStaticMarkup(React.createElement(M.ChatAddMenuItems, { entries }));
  const order = ['Add files or photos', 'data-row="add-folder"', 'data-row="teach"', 'Take a screenshot', 'data-row="github"',
    'data-row="skills"', 'data-row="connectors"', 'data-row="plugins"', 'Web search'].map(s => html.indexOf(s));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), `row order ${order}`);
});

test('3.6556.2 has no separate Chat composer tools menu and no Chat style picker (K3 / K5)', () => {
  // K3: c9b54eb90 pe is a hook returning the org/project tool list, not a menu; Extended thinking is a model-selector
  // thinking mode; Web search / Research are + menu slots (lN's modes group).
  assert.ok(official('c9b54eb90-C9rXk4ZP.js').includes('{tools:E,enable:O,createInPlace:b}'));
  assert.ok(official('shared-50-DopKwmK0.js').includes('thinking_mode_extended_title:p(Z,{defaultMessage:"Extended thinking",id:"u8n5HzNZ2R"})'));
  assert.deepEqual(addMenuSlotGroups[2], ['haystack', 'research', 'webSearch', 'memory', 'permissionMode']);
  assert.ok(!addMenuSlotGroups.flat().some(slot => /style|thinking|tools/i.test(slot)), 'no style / thinking / tools slot');
  // K5: the send event hard-codes no personalized style; "Style" is voice settings' label; "Choose a style" is Code's
  // session output-style dialog (cc43287c9 efe, titled "Output style").
  assert.ok(official('shared-28-DNYlf4wu.js').includes('has_personalized_style:!1'));
  assert.ok(official('shared-9-CM21XrJw.js').includes('voiceStyle:{defaultMessage:"Style",id:"GQM96kFSM3"}'));
  const code = official('cc43287c9-Me-M2ucD.js');
  const at = code.indexOf('"AU4HcqqKpC"');
  assert.ok(at > 0 && code.lastIndexOf('defaultMessage:"Output style"', at) > at - 1500, 'Choose a style sits in the Output style dialog');
  const files = fs.readdirSync(path.join(v1, 'assets/v1')).filter(name => name.endsWith('.js'));
  assert.deepEqual(files.filter(name => official(name).includes('"AU4HcqqKpC"')), ['cc43287c9-Me-M2ucD.js']);
  assert.ok(!files.some(name => official(name).includes('personalized_styles')));
});
