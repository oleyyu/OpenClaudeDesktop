// W12 sidechat / sidechat-cont: the floating side chat is cccc2cf0a's own markup — qF (CdsRoot compact > bounds layer >
// aside), UF (focus frame, Xe turn list / empty notice, Ze error p, nt composer row), HF user turns around shared-2 r8
// (UserMessage), VF/mP answers, _F status, and the pane chrome of c4db265df rn (`N_`). Class constants come from the
// generated side-chat-chrome.mjs; the error row is one bare p (no role, no Retry) and an empty answer shows nothing.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import { designSnapshot, designStylesheets } from '../scripts/current-design-assets.mjs';
import { selectorClasses } from '../scripts/prepare-style-compatibility.mjs';
import * as chrome from '../src/generated/code-editor/side-chat-chrome.mjs';

const latest = new URL(`../../reference/${designSnapshot}/ion-dist/assets/v1/`, import.meta.url);
const sliced = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
const read = name => fs.readFile(new URL(name, sliced), 'utf8');
const FF = 'px-lg pt-md pb-[24px]';
const EMPTY_OUTER = `flex-1 min-h-0 ${FF}`;
const EMPTY_NOTICE = 'bg-alpha-1 rounded p-lg text-footnote leading-normal text-muted-as-secondary text-pretty select-text';
const LIST = `flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--chat-turn-gap)] ${FF}`;
const ERROR = 'px-lg pb-1.25 text-footnote text-danger select-text shrink-0';
const BOUNDS = 'epitaxy-root text-body text-primary break-words pointer-events-none fixed inset-0';
const ASIDE = 'epitaxy-side-chat rounded-card absolute max-w-full flex flex-col draggable-none pointer-events-auto';
const FRAME = 'flex flex-1 min-h-0 flex-col outline-none';
const WINDOW_FRAME = 'epitaxy-pane-window flex flex-1 min-h-0 flex-col outline-none';
const UF_BODY = 'flex flex-col flex-1 min-h-0';
const COMPOSER_ROW = 'shrink-0 px-md pb-md';
const USER_TURN = 'epitaxy-user-turn flex w-full flex-col min-w-0 ms-auto items-end gap-sm';
const USER_ROW = 'group/message-row flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end';
const BUBBLE = 'relative flex min-w-0 flex-col gap-xs rounded-[var(--cds-message-bubble-radius)] px-[var(--cds-message-bubble-pad-x)] py-[var(--cds-message-bubble-pad-y)] text-heading font-normal break-words select-text text-primary max-w-[var(--cds-message-bubble-measure)] bg-[var(--cds-bg-user-message)]';
const SEGMENTS = 'flex flex-col gap-1.25';
const HEADER = 'relative flex items-center justify-between gap-sm h-[calc(2rem*var(--cds-rem-scale,1))] ps-[4px] pe-[4px] shrink-0';
const TITLE = 'text-body font-normal font-control text-secondary select-none truncate ps-[4px] relative z-[1]';
const TRAILING = 'relative z-[1] flex items-center gap-0.5 shrink-0 draggable-none';
const PANE_BODY = 'flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-[inherit]';
const PANE_ROOT = 'min-w-0 shrink-0 relative isolate flex flex-col dark:shadow-sm dark:not-forced-colors:outline dark:not-forced-colors:outline-1 dark:not-forced-colors:outline-alpha-2';
const esc = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const once = (text, needles, label) => { for (const needle of needles) assert.equal(text.split(needle).length - 1, 1, `${label}: ${needle}`); };

let server, S, store;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-side-chat.jsx');
  ({ sideChatStore: store } = await server.ssrLoadModule('/src/side-chat-store.mjs'));
});
after(() => server?.close());
const render = props => renderToStaticMarkup(React.createElement(S.SourceSideChat, { open: true, onClose() {}, rpc: async () => ({}), ...props }));

test('3.6556.2 qF/UF/HF/VF/_F/CF originals (cccc2cf0a), verbatim', async () => {
  const source = await read('cccc2cf0a-DhZC33Gc.js');
  once(source, [`FF="${FF}"`, 'className:`flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--chat-turn-gap)] ${FF}`',
    'className:`flex-1 min-h-0 ${FF}`,children:u("div",{className:"' + EMPTY_NOTICE + '"', 'j&&u("p",{className:"' + ERROR + '",children:j})',
    `className:"${BOUNDS}",style:T`, 'className:"select-text",children:u(Yd.Provider',
    // qF: CdsRoot compact around the bounds layer; the aside class.
    'u(be,{density:"compact",className:"contents",children:u("div",{ref:r,className:"epitaxy-root',
    'j=`epitaxy-side-chat rounded-card absolute max-w-full flex flex-col ${t?"draggable-none pointer-events-auto":"invisible"}`',
    // UF: frame, body, composer row, N_ calls, header buttons.
    `className:"${FRAME}"`, `className:"${WINDOW_FRAME}"`, `className:"${UF_BODY}",children:it`,
    `u("div",{className:"${COMPOSER_ROW}","data-approval-hotkey-scope":R,children:tt})`,
    'u(N_,{floating:!0,noWindowDrag:!0,trailingClearance:!1,onHeaderPointerDown:n,style:ot,title:ct,trailing:ft,children:pt})',
    'u(N_,{flush:!0,leadingClearance:!0,trailingClearance:!0,style:t,title:n,trailing:o,children:it})',
    'u(F,{variant:"ghost",iconOnly:!0,icon:"X","aria-label":ut,shortcut:r,onClick:E})', 'u(F,{variant:"ghost",iconOnly:!0,icon:"Trash","aria-label":',
    // HF: the user turn `ay`, its chips and the UserMessage around the segment column.
    'h("div",{className:ay,children:[l,d]})', 'a.length>0&&u(sy,{images:LF,snippets:a})', 'u(Ar,{textSize:s,children:c})',
    `className:"${SEGMENTS}",children:o.map(YF)`,
    // VF → mP: the overflow-wrap wrapper only exists with the fizzy-lake "type" part, which shared-52 Qm = [] keeps off.
    'Bt("type")?u(yo,{textSize:n,children:u("div",{className:hP,children:t})}):t', 'hP=`${Ss} [overflow-wrap:anywhere]`',
    // _F: an sr-only status span and an aria-hidden Go.
    'u("span",{role:"status",className:"sr-only",children:b})', 'u("div",{"aria-hidden":!0,children:u(Go,',
    // CF: an answered response is appended as is; no error is set for an empty one.
    'r.status==="answered"?t.getState().appendMessage(o,{role:"assistant",text:r.response'], 'cccc2cf0a');
  const uf = source.slice(source.indexOf('UF=T(function'), source.indexOf('WF=T(function'));
  assert.ok(uf.length > 1000);
  assert.doesNotMatch(uf, /Retry|ArrowClockwise|role:"alert"/);
  assert.doesNotMatch(source, /came back/);
  assert.match(await read('shared-52-uHFNjl7C.js'), /var Qm=\[\][,;]/);
});

test('3.6556.2 N_ (c4db265df rn) and r8 (shared-2 UserMessage) originals, verbatim', async () => {
  once(await read('c4db265df-fNhlkQCj.js'), ['className:`${Qt} rounded-b-[inherit]`', 'n("span",{className:B?Mt:`${Mt} relative z-[1]`,onDoubleClick:gt,children:d})',
    '"data-top-left":sn,"data-top-right":cn,...Oe,className:ln,onPointerDown:U', 'n("div",{className:se,children:i(w,{children:[y,',
    'elevation:Nt,"data-pane-root":"",...Y,...yn,...bn,className:xn,style:X,children:Sn', 'xn=yt?rn===void 0?zt:Bt:Lt', 'yn=J0($,203)?K0($,203,j("side_pane"))'], 'c4db265df');
  assert.match(await read('c4db265df-fNhlkQCj.js'), /dn=J1\(\$,159,ye\)\?K1\(\$,159,ye,!ye&&n\("div",\{className:"draggable absolute inset-0 -z-\[1\]","aria-hidden":!0\}\)\)/);
  once(await read('cd1d8a6ac-Bf6EMgR_.js'), ['n={"data-pane-corner-row":""}'], 'cd1d8a6ac');
  once(await read('shared-0-DDOOdL6P.js'), ['gd="data-perf-region"'], 'shared-0');
  once(await read('shared-2-TF8v67kg.js'), ['"relative flex min-w-0 flex-col gap-xs",C3,"text-heading font-normal break-words select-text",e,t,',
    'e=!pt&&"text-primary"', 't=C?T3:yt.length>0?Q6:w3', ':"bg-[var(--cds-bg-user-message)]"', 'B("group/message-row flex w-full min-w-0 flex-col gap-xs font-sans",zt,i)',
    'zt=dt?"me-auto items-start":"ms-auto items-end"', 'c("cds-user-message-body",s,l,d)', 'u("div",{id:ut,className:i,style:a,onFocusCapture:o,children:g})',
    '"data-cds":"UserMessage","data-state":z,"data-text-size":be,"data-author":n,className:Bt'], 'shared-2');
});

test('generated side-chat-chrome.mjs carries the original constants', () => {
  assert.equal(chrome.sideChatInsetClass, FF);
  assert.equal(chrome.sideChatUserTurnClass, USER_TURN);
  assert.equal(chrome.paneHeaderLineClass, HEADER);
  assert.equal(`${chrome.paneTitleClass} relative z-[1]`, TITLE);
  assert.equal(chrome.paneTrailingClass, TRAILING);
  assert.equal(`${chrome.paneBodyClass} rounded-b-[inherit]`, PANE_BODY);
  assert.equal(chrome.paneRootClass, PANE_ROOT);
  assert.equal(chrome.paneFlushRootClass, 'min-w-0 shrink-0 relative isolate flex flex-col rounded-none shadow-none');
  assert.equal(chrome.paneElevation, 'panel');
  assert.equal(['relative flex min-w-0 flex-col gap-xs', chrome.userBubbleShapeClass, 'text-heading font-normal break-words select-text', 'text-primary', chrome.userBubbleMeasureClass, 'bg-[var(--cds-bg-user-message)]'].join(' '), BUBBLE);
});

test('the host carries no replaced markup and no host rules for it', async () => {
  const host = await fs.readFile(new URL('../src/source-side-chat.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(host, /ssc-empty|ssc-messages|ssc-error|ssc-answer|ssc-user|ssc-content|t\('Retry'\)|role="alert"|No answer came back/);
  const css = await fs.readFile(new URL('../src/source-side-chat.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.ssc-(?:empty|messages|error|answer|user|content|title|composer|status-announcement)\b/);
  assert.doesNotMatch(css, /^\.ssc-root\s*\{|^\.ssc-header\s*\{/m);
  assert.doesNotMatch(await fs.readFile(new URL('../src/source-side-chat-user-content.jsx', import.meta.url), 'utf8'), /ssc-user-content/);
  assert.doesNotMatch(await fs.readFile(new URL('../src/source-side-chat-status.jsx', import.meta.url), 'utf8'), /ssc-status-announcement/);
});

test('every qF/UF/HF/r8/N_ utility is in the loaded design stylesheets', async () => {
  const loaded = new Set();
  for (const name of designStylesheets) postcss.parse(await fs.readFile(new URL(name, latest), 'utf8')).walkRules(rule => selectorClasses(rule.selector).forEach(c => loaded.add(c)));
  // epitaxy-side-chat / epitaxy-user-attachments carry no rule in any 3.6556.2 stylesheet (selector hooks only).
  const hooks = new Set(['epitaxy-side-chat', 'epitaxy-user-attachments']);
  for (const token of [EMPTY_OUTER, EMPTY_NOTICE, LIST, ERROR, BOUNDS, ASIDE, 'invisible', FRAME, WINDOW_FRAME, UF_BODY, COMPOSER_ROW, USER_TURN, USER_ROW, BUBBLE,
    SEGMENTS, 'cds-user-message-body', 'epitaxy-user-attachments flex flex-wrap max-w-full [.epitaxy-user-turn_&]:justify-end gap-1', 'grid place-items-center w-10 h-10 rounded-sm focus-visible:outline-hidden border-0 p-0 hide-focus-ring focus-visible:shadow-focus bg-alpha-2 text-muted-as-secondary', 'epitaxy-root break-words !p-0 !min-w-0', 'flex flex-col gap-1 max-w-full min-w-0 max-h-[280px] overflow-y-auto p-md text-body select-text text-start rounded-[inherit] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus', 'text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere] [unicode-bidi:plaintext]', HEADER, TITLE, TRAILING, PANE_BODY, PANE_ROOT, chrome.paneFlushRootClass, 'draggable absolute inset-0 -z-[1]', 'sr-only'].flatMap(cls => cls.split(/\s+/)))
    if (!hooks.has(token)) assert.ok(loaded.has(token), `${token} is in the current design stylesheets`);
});

test('SSR: the floating panel is qF > UF > N_, with the empty notice; the window is UF\'s pane window', () => {
  const html = render({ threadId: 'markup-empty', assistantName: 'Claude' });
  assert.match(html, new RegExp(`^<div class="cds-root[^"]*\\bcontents\\b[^"]*" data-density="compact"[^>]*><div class="${esc(BOUNDS)}" style="z-index:440"><aside aria-label="Side chat" data-open="true" class="ssc-root ${esc(ASIDE)}">`));
  assert.match(html, new RegExp(`<div tabindex="-1" data-escape-owner="" class="${esc(FRAME)}"><div data-cds="Surface" data-surface="panel" data-pane-root="" data-perf-region="side_pane" class="[^"]*\\bmin-w-0 shrink-0 relative isolate flex flex-col\\b[^"]*" style="[^"]*flex:1;min-height:0">`));
  assert.match(html, new RegExp(`<div data-pane-corner-row="" class="ssc-header ${esc(HEADER)}" style="touch-action:none"><span class="ssc-title ${esc(TITLE)}">Side chat</span><div class="${esc(TRAILING)}"><button `));
  assert.doesNotMatch(html, /draggable absolute inset-0|data-top-left|data-top-right/);
  assert.match(html, /aria-label="Close side chat" aria-keyshortcuts="[^"]+;"/);
  assert.doesNotMatch(html, /aria-label="Clear side chat"/);
  assert.match(html, new RegExp(`<div class="${esc(PANE_BODY)}"><div class="${esc(UF_BODY)}"><div class="${esc(EMPTY_OUTER)}"><div class="${esc(EMPTY_NOTICE)}">Chat about this session without touching the main thread\\. Claude sees the full context, and nothing here is added to the session\\.</div></div><div class="ssc-composer ${esc(COMPOSER_ROW)}" data-approval-hotkey-scope="[^"]+">`));
  assert.doesNotMatch(html, /overflow-y-auto flex flex-col|text-danger/);
  const windowed = render({ threadId: 'markup-empty-window', windowed: true, windowControls: { onDock() {}, onTogglePin() {}, alwaysOnTop: true } });
  assert.match(windowed, new RegExp(`^<div tabindex="-1" data-escape-owner="" class="ssc-root ${esc(WINDOW_FRAME)}" data-windowed="" data-open="true"><div data-cds="Surface"[^>]*class="[^"]*\\brounded-none shadow-none\\b[^"]*"`));
  assert.match(windowed, new RegExp(`<div data-top-left="true" data-top-right="true" data-pane-corner-row="" class="ssc-header ${esc(HEADER)}"><div class="draggable absolute inset-0 -z-\\[1\\]" aria-hidden="true"></div>`));
  assert.match(windowed, /aria-pressed="true" aria-label="Stop keeping window on top" data-popout-pin=""/);
  assert.match(windowed, /aria-label="Open in main window" data-popout-dock=""/);
  assert.doesNotMatch(windowed, /epitaxy-root|<aside/);
});

test('SSR: HF user turns, VF answers straight in div.select-text, _F status and the bare error p', () => {
  assert.equal(store.importThread('markup-turns', { messages: [{ role: 'user', text: 'what?' }, { role: 'assistant', text: 'ANSWER_TEXT' }, { role: 'user', text: 'again?' }], error: 'Side question failed.', retry: 'again?' }), true);
  const html = render({ threadId: 'markup-turns', onPopOut() {} });
  assert.match(html, new RegExp(`<div class="${esc(LIST)}"><div class="${esc(USER_TURN)}"><div data-cds="UserMessage" data-text-size="md" class="${esc(USER_ROW)}"><div class="${esc(BUBBLE)}"><div id="[^"]+" class=""><div class="cds-user-message-body"><div class="${esc(SEGMENTS)}"><p class="[^"]*">what\\?</p></div></div></div></div></div></div>`));
  assert.match(html, /<div class="select-text"><div class="source-markdown"><p>ANSWER_TEXT<\/p><\/div><\/div>/);
  assert.match(html, /<div class="ssc-status" data-side-status="idle"><span role="status" class="sr-only"><\/span><div aria-hidden="true"><div class="source-transcript-status"><div class="sts-row">/);
  assert.equal(html.split(`<p class="${ERROR}">Side question failed.</p>`).length - 1, 1);
  assert.match(html, /aria-label="Clear side chat"/);
  assert.match(html, /aria-label="Open in new window" data-side-chat-popout=""/);
  assert.doesNotMatch(html, /role="alert"|>Retry<|ArrowClockwise|ssc-error|ssc-answer-text|overflow-wrap:anywhere\]"><div class="source-markdown/);
  assert.doesNotMatch(html, new RegExp(esc(EMPTY_NOTICE)));
});

test('SSR: an empty answer shows nothing, as CF appends the empty response without an error (store still keeps retry)', () => {
  assert.equal(store.importThread('markup-no-answer', { messages: [{ role: 'user', text: 'lost?' }], error: null, retry: 'lost?' }), true);
  assert.equal(store.get('markup-no-answer').retry, 'lost?');
  const html = render({ threadId: 'markup-no-answer' });
  assert.doesNotMatch(html, new RegExp(esc(ERROR)));
  assert.doesNotMatch(html, /No answer came back|>Retry<|ArrowClockwise/);
  assert.equal(store.importThread('markup-clean', { messages: [{ role: 'user', text: 'q' }, { role: 'assistant', text: 'a' }] }), true);
  assert.doesNotMatch(render({ threadId: 'markup-clean' }), new RegExp(esc(ERROR)));
});

test('3.6556.2 sy chips (c2fd10b8d cc/uc/Xs) and N_ header mouse-down (c4db265df en), verbatim, and their generated cuts', async () => {
  const chunk = await read('c2fd10b8d-DB1Sgoyz.js');
  once(chunk, ['a("ul",{role:"list",className:`${qs} gap-1`,"aria-label":f.formatMessage({defaultMessage:"Attached context",id:"k3uHjv4lto"}),children:[k.map(uc),',
    'function uc(e){return r("li",{role:"listitem",children:r(Xs,{icon:"Quote",quiet:!0,label:e.label??ws(e.text),body:e.text})},e.id)}',
    'qs=`epitaxy-user-attachments flex flex-wrap max-w-full ${ls}`', 'a(Tt.Root,{delay:200,children:[h,g]})'], 'c2fd10b8d');
  once(await read('cccc2cf0a-DhZC33Gc.js'), ['function JF(e,t){return{id:`snippet-${t}`,text:Zn(e.text),label:e.label}}'], 'cccc2cf0a');
  const pane = await read('c4db265df-fNhlkQCj.js');
  assert.equal(pane.split('onPointerDown:U,onDoubleClick:ht,onMouseDown:en,').length - 1, 2, 'both rn header branches');
  once(pane, ['function en(e){let t=e.currentTarget,n=_(e.target)?.closest("button")'], 'c4db265df');
  const chips = await fs.readFile(new URL('../src/generated/code-editor/side-chat-attachments.mjs', import.meta.url), 'utf8');
  assert.match(chips, /import \{ CdsPreviewCard as Tt \} from "\.\.\/view-tabs\/shared-156-BLTosN8U\.js";/);
  assert.match(chips, /export \{ qs as messageAttachmentsClass, uc as messageContextChipItem \};/);
  assert.match(chips, /children: r\(us, \{ code: s, body: l, width: 420 \}\)/);
  const events = await fs.readFile(new URL('../src/generated/code-editor/side-chat-pane-events.mjs', import.meta.url), 'utf8');
  assert.match(events, /export \{ en as paneHeaderMouseDown \};/);
  const host = await fs.readFile(new URL('../src/source-side-chat.jsx', import.meta.url), 'utf8');
  once(host, ['onMouseDown={paneHeaderMouseDown}', "aria-label={t('Attached context')}", 'cwd={cwd} onOpenFileRef={onOpenFileRef}/>'], 'host');
});

test('SSR: snippet context renders cc\'s Attached context list of Xs quote chips', async () => {
  const { sideChatContextQuestion } = await server.ssrLoadModule('/src/generated/code-editor/side-chat-context.mjs');
  assert.equal(store.importThread('markup-chips', { messages: [{ role: 'user', text: sideChatContextQuestion('explain', 'const x = 1;\nfoo') }] }), true);
  const html = render({ threadId: 'markup-chips' });
  assert.match(html, new RegExp(`<div class="${esc(USER_TURN)}"><ul role="list" class="epitaxy-user-attachments flex flex-wrap max-w-full \\[\\.epitaxy-user-turn_&amp;\\]:justify-end gap-1" aria-label="Attached context"><li role="listitem"><button type="button" aria-label="const x = 1;" class="grid place-items-center w-10 h-10 rounded-sm focus-visible:outline-hidden border-0 p-0 hide-focus-ring focus-visible:shadow-focus bg-alpha-2 text-muted-as-secondary"[^>]*><span data-cds="Icon"`));
  assert.doesNotMatch(html, /sca-strip|data-kind="snippet"/);
});
