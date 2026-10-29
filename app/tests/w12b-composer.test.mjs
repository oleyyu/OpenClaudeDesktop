// W12b w12b-composer: Code composer differences against 3.6556.2.
// - queue rows: the whole expanded row is a CdsContextMenu trigger (cf74bc599 BE, te = shared-frame qi);
// - Clear all: CdsTextLink, disabled while every entry is locked (cf74bc599 GE, QW+Q5NHmeF);
// - the last landed entry's exit (cc43287c9 Jfe, cf74bc599 VE, c6a992d55 epitaxy-band-exit);
// - Mode menu Bypass 'Enable' row: no description, 'Enable in Claude Code settings' tooltip (c227f4d5e, 9aM6b8EJG/);
// - bash-mode refusal: lF over the document and the VnmOeizKjx danger toast (c227f4d5e);
// - slash rejection copy: ', then send it again.' (cc43287c9 hH0Sho9AXl / cgTRRpTLBX).
// Source/SSR only: official chunks are read as text, never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { queuedBandStep, queuedBandView, queuedEntryLanded } from '../src/queued-messages-model.mjs';
import { shellPlainTextRefused } from '../src/composer-shell-refusal.mjs';
import { composerSchema } from '../src/composer-editor-model.mjs';
import { parseSessionCommand } from '../src/session-command-model.mjs';
import zhSession from '../electron/i18n/zh-CN/session.mjs';
import zhApp from '../electron/i18n/zh-CN/app.mjs';
import { withPreviewDom } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const official = name => fs.readFileSync(path.join(snapshot, 'assets/v1', name), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(snapshot, 'i18n/en-US.json'), 'utf8'));
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Q, VT, Menu, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Q = await server.ssrLoadModule('/src/source-queued-messages.jsx');
  VT = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  Menu = await server.ssrLoadModule('/src/source-permission-menu.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
});
after(async () => { await server?.close(); });
const noop = () => {};

// ---- queue row context menu --------------------------------------------------------------------------------------

test('official BE: a row with menu items is a CdsContextMenu trigger, without items a plain div', () => {
  const chunk = official('cf74bc599-CRYqipWN.js');
  assert.equal(count(chunk, 's(te.Trigger,{ref:k,role:"listitem","aria-busy":Y,"data-take-back-entry":t.id,style:ce,className:q,children:se})'), 1);
  assert.equal(count(chunk, 's(te.Popup,{children:ue})'), 1);
  assert.equal(count(chunk, 'u(te.Root,{onOpenChange:I,children:[le,X]})'), 1);
  assert.match(official('shared-frame-6jtSkIit.js'), /kA as qi\b/);
  assert.match(official('shared-frame-6jtSkIit.js'), /var kA=\{Root:EA,Trigger:K,Popup:TA,Item:GT\.Item,Separator:GT\.Separator/);
  const source = local('src/source-queued-messages.jsx');
  assert.match(source, /import \{ CdsContextMenu, CdsTextLink \} from "\.\/generated\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.doesNotMatch(source, /generated\/view-tabs\/index\.js/, 'E41: the composer graph takes the concrete file');
  assert.match(source, /<CdsContextMenu\.Root onOpenChange=\{setMenuOpen\}>\s*<CdsContextMenu\.Trigger \{\.\.\.rowProps\}>\{body\}<\/CdsContextMenu\.Trigger>/);
  assert.match(source, /<QueuedMenuItems Menu=\{CdsContextMenu\}/);
  assert.match(source, /<QueuedMenuItems Menu=\{SourceMenu\}/, 'the ⋮ menu lists the same items');
});

test('SSR: the context-menu row keeps the listitem attributes; a locked row stays a plain div', () => {
  const entry = { id: 'q2', preview: 'second' };
  const withMenu = renderToStaticMarkup(React.createElement(Q.Row, { entry, locked: false, onCancel: noop, onEdit: noop, sortable: false, anyDragging: false }));
  assert.match(withMenu, /^<div[^>]*role="listitem"[^>]*data-take-back-entry="q2"/);
  assert.match(withMenu, /class="sqm-item /);
  assert.match(withMenu, /aria-label="Queued message actions"/);
  assert.doesNotMatch(withMenu, /data-cds="ContextMenu"/, 'the popup is not rendered while closed');
  const locked = renderToStaticMarkup(React.createElement(Q.Row, { entry, locked: true, sortable: false, anyDragging: false }));
  assert.match(locked, /^<div role="listitem" aria-busy="true" data-take-back-entry="q2" class="sqm-item /);
  assert.doesNotMatch(locked, /Queued message actions/);
});

// ---- Clear all --------------------------------------------------------------------------------------------------

test('official GE: Clear all is CdsTextLink, disabled unless some entry is unlocked', () => {
  const chunk = official('cf74bc599-CRYqipWN.js');
  assert.equal(count(chunk, 's(G,{onClick:F,onMouseDown:uh,disabled:!N.includes(!1),className:"text-footnote text-danger",children:s(Q,{defaultMessage:"Clear all",id:"QW+Q5NHmeF"})})'), 1);
  assert.match(official('shared-frame-6jtSkIit.js'), /_f as hu\b/);
  assert.match(local('src/generated/view-tabs/shared-frame-6jtSkIit.js'), /_f as CdsTextLink\b/);
  const source = local('src/source-queued-messages.jsx');
  assert.match(source, /<CdsTextLink onClick=\{clearAll\} onMouseDown=\{stopMouseDown\} disabled=\{!entries\.some\(\(entry\) => !locked\(entry\.id\)\)\}\s*className="text-footnote text-danger">\{t\("Clear all"\)\}<\/CdsTextLink>/);
  assert.doesNotMatch(source + local('src/source-queued-messages.css'), /sqm-clear/);
  const off = renderToStaticMarkup(React.createElement(VT.CdsTextLink, { onClick: noop, disabled: true, className: 'text-footnote text-danger' }, 'Clear all'));
  // CdsLinkPrimitive (shared-frame qu) renders a disabled action as span role=button aria-disabled.
  assert.match(off, /^<span data-cds="TextLink" data-disabled="" role="button" tabindex="-1" aria-disabled="true" class="[^"]*cursor-default opacity-disabled text-footnote text-danger">Clear all<\/span>$/);
  assert.match(off, /text-footnote text-danger/);
  const on = renderToStaticMarkup(React.createElement(VT.CdsTextLink, { onClick: noop, disabled: false, className: 'text-footnote text-danger' }, 'Clear all'));
  assert.doesNotMatch(on, /disabled=""|opacity-disabled/);
});

// ---- band exit --------------------------------------------------------------------------------------------------

test('official Jfe / VE / CSS: the exit runs only for a lone entry that landed', () => {
  const store = official('cc43287c9-Me-M2ucD.js');
  assert.ok(store.includes('u=PM(n&&!r&&i!==null&&i.scope===t?i.entry.id:null);c===null?i!==null&&(a(null),u&&s(i))'));
  assert.ok(store.includes('f=c===null&&o!==null&&o.scope===t'));
  const bar = official('cf74bc599-CRYqipWN.js');
  assert.ok(bar.includes('o=`${Kv} ${a?"epitaxy-band-exit":""}`'));
  assert.ok(bar.includes('s("div",{className:o,inert:a,onAnimationEnd:c,children:n})'));
  assert.ok(official('c6b8adeaf-bLEQVSWL.js').includes('e!==null&&e in t.landed'));
  const css = local('public/assets/v1/c6a992d55-Che1orl5.css');
  assert.ok(css.includes('@keyframes epitaxy-band-exit{to{opacity:0;translate:0 6px}'));
  assert.ok(css.includes('.epitaxy-root .epitaxy-band-exit{animation:epitaxy-band-exit var(--cds-dur-snap) var(--cds-ease-out) forwards}'));
  assert.ok(local('index.html').includes('/assets/v1/c6a992d55-Che1orl5.css'));
});

test('queuedEntryLanded: the userMessage whose clientId is the entry clientUserMessageId', () => {
  const entry = { id: 'q1', clientUserMessageId: 'c-1' };
  assert.equal(queuedEntryLanded(entry, [{ type: 'userMessage', clientId: 'c-1' }]), true);
  assert.equal(queuedEntryLanded(entry, [{ type: 'userMessage', clientId: 'c-2' }, { type: 'agentMessage', clientId: 'c-1' }]), false);
  assert.equal(queuedEntryLanded({ id: 'q1', clientUserMessageId: null }, [{ type: 'userMessage', clientId: null }]), false);
  assert.equal(queuedEntryLanded(entry, undefined), false);
});

test('queuedBandStep follows Jfe: remember the lone entry, exit only when it landed in the same scope', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  const landed = new Set();
  const step = (state, entries, scope = 's1', reduced = false) => queuedBandStep(state, { entries, scope, landed: entry => landed.has(entry.id), reduced });
  let state = { last: null, leaving: null };
  state = step(state, [a]);
  assert.deepEqual(state, { last: { scope: 's1', entry: a }, leaving: null });
  assert.equal(step(state, [a]), state, 'unchanged inputs keep the same state');
  // Emptied without landing (removed / cleared): no exit.
  let gone = step(state, []);
  assert.deepEqual(gone, { last: null, leaving: null });
  assert.deepEqual(queuedBandView(gone, { entries: [], scope: 's1' }), { entries: [], exiting: false });
  // Landed: the bar keeps the entry and exits.
  landed.add('a');
  gone = step(state, []);
  assert.deepEqual(gone, { last: null, leaving: { scope: 's1', entry: a } });
  assert.deepEqual(queuedBandView(gone, { entries: [], scope: 's1' }), { entries: [a], exiting: true });
  assert.equal(queuedBandView(gone, { entries: [], scope: 's2' }).exiting, false, 'another session shows nothing');
  // A new entry arriving clears the exit.
  assert.deepEqual(step(gone, [b]), { last: { scope: 's1', entry: b }, leaving: null });
  // Reduced motion, two entries at once, or another scope: no exit.
  assert.deepEqual(step(state, [], 's1', true), { last: null, leaving: null });
  assert.deepEqual(step(state, [], 's2'), { last: null, leaving: null });
  const two = step(state, [a, b]);
  assert.deepEqual(two, { last: null, leaving: null });
  assert.deepEqual(step(two, []), two);
});

test('SSR: an exiting band carries epitaxy-band-exit and inert', () => {
  const entry = { id: 'q1', preview: 'run the tests' };
  const exiting = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [entry], exiting: true, onExited: noop }));
  assert.match(exiting, /^<div class="sqm-band epitaxy-band-enter epitaxy-band-exit" inert="" data-queued-messages="" data-count="1">/);
  const live = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [entry], onCancel: noop }));
  assert.match(live, /^<div class="sqm-band epitaxy-band-enter" data-queued-messages="" data-count="1">/);
  const source = local('src/source-queued-messages.jsx');
  assert.match(source, /onAnimationEnd=\{exiting \? \(event\) => \{ if \(event\.target === event\.currentTarget\) onExited\?\.\(\); \} : undefined\}/);
  assert.match(source, /export function useQueuedBandExit\(entries, scope, landed\)/);
});

// ---- Mode menu Bypass Enable row ----------------------------------------------------------------------------------

test('official c227f4d5e: the Enable row has a trailing Enable and the settings tooltip, no description', () => {
  const chunk = official('c227f4d5e-B-FYKrwT.js');
  assert.ok(chunk.includes('y("span",{className:"pointer-events-none shrink-0 text-footnote text-primary",children:i})'));
  assert.ok(chunk.includes('tooltip:t.formatMessage({defaultMessage:"Enable in Claude Code settings",id:"9aM6b8EJG/"})'));
  assert.equal(enUS['9aM6b8EJG/'], 'Enable in Claude Code settings');
  // cfca6870a v: an enabled item's tooltip is a multiline Tooltip on the item itself, side inline-end.
  assert.ok(official('cfca6870a-Dn2eYjs8.js').includes('if(!t.tooltip||t.disabled)return n;'));
  for (const name of fs.readdirSync(path.join(snapshot, 'assets/v1')).filter(file => file.endsWith('.js')))
    assert.equal(official(name).includes('Turn on in Settings to use it'), false, name);
  const menu = local('src/source-permission-menu.jsx');
  assert.match(menu, /<SourceTooltip content=\{t\("Enable in Claude Code settings"\)\} side="right" multiline>\s*<SourceMenu\.Item className="sp-permission-item sp-permission-enable"/);
  assert.doesNotMatch(menu, /Turn on in Settings to use it/);
  assert.equal(zhApp['Enable in Claude Code settings'], '在 Claude Code 设置中开启');
  assert.equal('Turn on in Settings to use it' in zhApp, false);
});

test('DOM: the Enable row renders without a description line', async () => {
  await withPreviewDom(async (dom) => {
    const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const anchor = dom.document.body.appendChild(dom.document.createElement('button'));
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(Menu.SourcePermissionMenu, { anchor, value: 'ask', bypassEnabled: false, bypassOffer: 'enable', onEnableBypass: noop, onChange: noop, onClose: noop })));
      const row = dom.document.body.querySelector('[data-permission-action="enable-bypass"]');
      assert.ok(row, 'the Enable row is there');
      assert.equal(row.getAttribute('data-description'), null);
      assert.equal(row.querySelector('.smenu-description'), null);
      assert.ok(row.textContent.includes('Bypass permissions') && row.textContent.includes('Enable'));
      assert.equal(dom.document.body.textContent.includes('Turn on in Settings to use it'), false);
    } finally {
      await act(async () => root.unmount());
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    }
  });
});

// ---- bash-mode refusal --------------------------------------------------------------------------------------------

test('official c227f4d5e: lF refuses a non-plain shell command with the VnmOeizKjx addError toast', () => {
  const chunk = official('c227f4d5e-B-FYKrwT.js');
  assert.ok(chunk.includes('function lF(e,{bashMode:t,runsAsShell:n,fileMentions:r,knowsCommand:i}){'));
  assert.ok(chunk.includes('or?.addError(i?Ot.formatMessage({defaultMessage:"A shell command takes plain text only, so nothing was sent. Remove @-mentions, slash commands, and formatting.",id:"VnmOeizKjx"})'));
  assert.equal(enUS.VnmOeizKjx, 'A shell command takes plain text only, so nothing was sent. Remove @-mentions, slash commands, and formatting.');
  const composer = local('src/source-composer.jsx');
  assert.match(composer, /import \{ useSourceToasts \} from "\.\/source-toast\.jsx";/);
  assert.match(composer, /if \(bashMode && \(shellInput\?\.shellTextOnlyRefused \?\? !!shellInput\?\.querySelector\?\.\("\[data-mention\], \[data-skill-chip\]"\)\)\) \{\s*toasts\?\.add\(t\("A shell command takes plain text only, so nothing was sent\. Remove @-mentions, slash commands, and formatting\."\), \{ variant: "danger" \}\);\s*return;/);
  assert.doesNotMatch(composer, /composerNotice|Remove the mention or send it as a message/);
  assert.match(local('src/source-composer-editor.jsx'), /Object\.defineProperty\(input,'shellTextOnlyRefused',\{configurable:true,get:\(\)=>shellPlainTextRefused\(editor\.state\.doc\)\}\);/);
  assert.ok(zhSession['A shell command takes plain text only, so nothing was sent. Remove @-mentions, slash commands, and formatting.']);
  assert.equal('@-mentions can’t be used in a shell command. Remove the mention or send it as a message.' in zhSession, false);
});

test('shellPlainTextRefused mirrors lF in bash mode over the composer schema', () => {
  const s = composerSchema;
  const para = (...inline) => s.node('doc', null, [s.node('paragraph', null, inline)]);
  const link = href => s.marks.link.create({ href });
  assert.equal(shellPlainTextRefused(para(s.text('ls -la'))), false);
  assert.equal(shellPlainTextRefused(para(s.text('echo a'), s.node('hard_break'), s.text('echo b'))), false);
  assert.equal(shellPlainTextRefused(para(s.text('cat '), s.node('mention', { path: 'src/a.js' }))), true, '@-mention');
  assert.equal(shellPlainTextRefused(para(s.node('command_chip', { id: 'review' }), s.text(' now'))), true, 'slash command chip');
  assert.equal(shellPlainTextRefused(para(s.text('rm', [s.marks.strike.create()]))), true, 'strike');
  assert.equal(shellPlainTextRefused(para(s.text('ls', [s.marks.code.create()]))), true, 'inline code');
  assert.equal(shellPlainTextRefused(para(s.text('curl '), s.text('example.com', [link('https://example.com')]))), false, 'bare link');
  assert.equal(shellPlainTextRefused(para(s.text('https://a.dev', [link('https://a.dev')]))), false);
  assert.equal(shellPlainTextRefused(para(s.text('docs', [link('https://example.com')]))), true, 'a named link');
  assert.equal(shellPlainTextRefused(s.node('doc', null, [s.node('code_block', null, [s.text('ls')])])), true, 'code block');
  assert.equal(shellPlainTextRefused(null), false);
});

// ---- slash rejection copy -------------------------------------------------------------------------------------------

test('official cc43287c9 M / P: ", then send it again." for the single-line and no-arguments rejections', () => {
  const chunk = official('cc43287c9-Me-M2ucD.js');
  assert.ok(chunk.includes('defaultMessage:"/{commandName} only works on a single line. Remove the extra lines, then send it again.",id:"hH0Sho9AXl"'));
  // The chunk escapes the apostrophe (\u2019).
  assert.ok(chunk.includes('defaultMessage:"/{commandName} doesn\\u2019t take arguments here. Remove the text after the command, then send it again.",id:"cgTRRpTLBX"'));
  assert.equal(enUS.cgTRRpTLBX, '/{commandName} doesn’t take arguments here. Remove the text after the command, then send it again.');
  assert.equal(chunk.includes('and try again.",id:"hH0Sho9AXl"'), false);
  assert.equal(parseSessionCommand('/clear\nmore').error, '/clear only works on a single line. Remove the extra lines, then send it again.');
  assert.equal(parseSessionCommand('/clear now').error, '/clear doesn’t take arguments here. Remove the text after the command, then send it again.');
  assert.doesNotMatch(local('src/session-command-model.mjs'), /and try again\./);
  assert.ok(zhSession['/{command} only works on a single line. Remove the extra lines, then send it again.']);
  assert.ok(zhSession['/{command} doesn’t take arguments here. Remove the text after the command, then send it again.']);
});
