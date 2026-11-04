// W14-code r4 dock lane (plan-w14-code.md §5, E95): the Code session's approval area against 3.6556.2, source only.
//  - r4pa-c01: where the official 3P desktop draws the Code approval cards (inline card at the transcript tail, not the
//    composer dock, while claudeai_cc_epitaxy_session_presets_main is on); the question card presentation stays "card";
//  - gates-r4-05: __gb__1616707004 (the card slot's landing) is off, as Uon leaves it;
//  - R4T-08i: the inline approval host tke's outer div around the area and "Also waiting";
//  - pane-09-toast: no in-card line for a failed send;
//  - r4pa-c11#frontend: the preview's outside-site card is Wh browser:open_site with Allow once / Always allow.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = file => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };

let server, A;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
});
after(() => server?.close());
const render = element => renderToStaticMarkup(element);

test('r4pa-c01: the 3P desktop draws Code approvals as inline cards in the transcript, the dock only without an inline slot', () => {
  const session = read(path.join(v3, 'cc43287c9-Me-M2ucD.js'));
  // Yo = cd96b5fdc E(sessionId) → c3320899b d(viewKey, presets gate): sticky-true once shared-11 gc (session presets) is on.
  once(session, ['Yo=Uk(Hn?.id??null)', 'Rn.getState().inlineApprovals!==Yo&&Rn.setState({inlineApprovals:Yo})',
    'js=rs!==null', 'presentation:js?"card":"dock"']);
  once(read(path.join(v3, 'cd96b5fdc-B3bjGiE4.js')), ['function s(e){return o(e,a())}', 'import{t as o}from"./c3320899b-CLmJTxEg.js"']);
  once(read(path.join(v3, 'c3320899b-CLmJTxEg.js')), ['r||f.has(i)', 'export{o as n,s as r,d as t}']);
  // The transcript host mounts the inline approval slot (c2d1aeb56 L) as the renderer's trailing row while inlineApprovals
  // is on, and that element becomes the store's inlineApprovalSlotEl (c227f4d5e cZ).
  const host = read(path.join(v3, 'cf74bc599-CRYqipWN.js'));
  once(host, ['Wo=Xr(r,mE)', 'trailing:Wo?Do:void 0', 'function mE(e){return e.inlineApprovals}']);
  once(read(path.join(v3, 'c2d1aeb56-BwMYdDs2.js')), ['"data-inline-approval-slot":""', 'E=i("dock")']);
  // Uon: the presets gate follows sessionsRunOnThisComputer (true for this desktop), and the host serves it (E92).
  const uon = read(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'));
  once(uon, ['3264789062:{rule:"follows",condition:"sessionsRunOnThisComputer"}']);
  const table = read(path.join(app, 'src/host-growthbook.mjs'));
  assert.match(table, /__gb__3264789062: true/);
  // So the Code card stays the transcript-tail card, and the question card keeps cc32965c2 `We ? ho : xo` with We true.
  const main = read(path.join(app, 'src/main.jsx'));
  assert.match(main, /presentation=\{mode === "code" \? "card" : undefined\}/);
});

test('gates-r4-05: __gb__1616707004 is not in Uon, so the slot has no landing; listing it in the host table brings it back', () => {
  const uon = read(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'));
  assert.equal(count(uon, '1616707004'), 0);
  assert.equal(A.APPROVAL_LANDING_ON, false);
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  assert.match(card, /landing = APPROVAL_LANDING_ON, children \}\) \{/);
  assert.match(card, /const on = landing === true && toComposer !== undefined;/);
});

const command = (instanceId, extra = {}) => ({ id: instanceId, bridgeApproval: { connectionId: 'c', instanceId }, method: 'item/commandExecution/requestApproval',
  params: { threadId: 't', turnId: 'u', itemId: `i-${instanceId}`, command: 'ls', ...extra } });

test('R4T-08i: the Code slot is tke — the pending host div around the card and "Also waiting", contents when idle', () => {
  const renderer = read(path.join(v3, 'c96d752d0-CWv_7-n9.js'));
  once(renderer, ['k=n?"flex w-full flex-col gap-[var(--chat-turn-gap)] pt-[var(--chat-turn-gap)]":"contents"',
    '"data-skip-approval-enter":D,...O,className:k,children:[l,A]', 'p&&!n&&!m&&h(!0)']);
  assert.equal(A.INLINE_APPROVAL_HOST_PENDING, 'flex w-full flex-col gap-[var(--chat-turn-gap)] pt-[var(--chat-turn-gap)]');
  const first = command('q1'), second = command('q2');
  const runtime = createApprovalDraftRuntime();runtime.reconcile([first, second]);
  const props = { runtime, requests: [first, second], renderRequest: r => React.createElement('section', { key: r.id, id: r.id }),
    renderQueued: queued => React.createElement('p', { 'data-queued': queued.map(q => q.id).join(',') }) };
  const html = render(React.createElement(A.SourceApprovalSlot, props));
  // Pending on mount: the host skips the enter animation (g = p && !m) and "Also waiting" sits after the area, outside it.
  assert.equal(html, '<div data-skip-approval-enter="true" class="flex w-full flex-col gap-[var(--chat-turn-gap)] pt-[var(--chat-turn-gap)]">'
    + '<div style="display:contents"><section id="q1"></section></div><p data-queued="q2"></p></div>');
  const idle = render(React.createElement(A.SourceApprovalSlot, { ...props, runtime: createApprovalDraftRuntime(), requests: [] }));
  assert.equal(idle, '<div class="contents"><div style="display:contents"></div></div>');
  // Without renderQueued (the /btw pane) the slot stays the bare area.
  assert.equal(render(React.createElement(A.SourceApprovalSlot, { runtime, requests: [first], renderRequest: props.renderRequest })),
    '<div style="display:contents"><section id="q1"></section></div>');
});

test('R4T-08i (review 补做): tke spreads mpe(Ng(key, !0)) on the host div — c227f4d5e uD / ED, sliced into reveal-guard.mjs', async () => {
  const renderer = read(path.join(v3, 'c96d752d0-CWv_7-n9.js')), kit = read(path.join(v3, 'c227f4d5e-B-FYKrwT.js'));
  once(renderer, ['Hc as Ng', 'zc as mpe', 'x=Ng(r===null?u===y?null:u:`${r}:${v}:${d}`,!0)', 'O=J1($,9,x)?K1($,9,x,mpe(x)):$[10]',
    'function nke(e){return e.id}']);
  once(kit, ['uD as Hc', 'ED as zc', 'setTimeout(()=>c(a),400)', 'function ED(e){return e?TD:wD}']);
  // cc43287c9 Spe passes neither dockedCard nor revealNonce, so the key is null without an occupant.
  const spe = read(path.join(v3, 'cc43287c9-Me-M2ucD.js'));
  once(spe, ['p(Spe,{scopeStore:Rn,presentation:js?"card":"dock",cardPending:Ms.cardPending,occupant:Ms.occupant,onLiveChange:Uo,queued:js?xs:lpe,children:']);
  const G = await server.ssrLoadModule('/src/generated/approval-landing/reveal-guard.mjs');
  assert.deepEqual(Object.keys(G.revealClickGuard(false)), ['onClickCapture', 'onMouseDownCapture', 'onMouseUpCapture']);
  assert.deepEqual(Object.keys(G.revealClickGuard(true)), ['onClickCapture', 'onMouseUpCapture']);
  const listeners = new Map();
  const doc = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  const host = { ownerDocument: doc };
  const ev = (nativeEvent, extra = {}) => { const e = { button: 0, currentTarget: host, nativeEvent, blocked: 0, ...extra };
    e.preventDefault = () => { e.blocked++; }; e.stopPropagation = () => {}; return e; };
  const guarded = G.revealClickGuard(false), settled = G.revealClickGuard(true);
  // Inside the 400ms window a pointer click is swallowed, a keyboard click (detail 0) passes.
  const pointer = ev({ detail: 1 }), keyboard = ev({ detail: 0 });
  guarded.onClickCapture(pointer); guarded.onClickCapture(keyboard);
  assert.deepEqual([pointer.blocked, keyboard.blocked], [1, 0]);
  // A guarded press arms the document listener; its release time is recorded; the click it releases after the window
  // settles (within fD = 100ms) is swallowed too, any other click is not.
  const down = ev({ timeStamp: 10 }); guarded.onMouseDownCapture(down);
  assert.equal(down.blocked, 1); assert.deepEqual([...listeners.keys()], ['click', 'mousedown']);
  settled.onMouseUpCapture(ev({ timeStamp: 20 }));
  const released = { detail: 1, timeStamp: 60 }; listeners.get('click')(released);
  assert.equal(listeners.size, 0);
  const late = ev(released), other = ev({ detail: 1, timeStamp: 70 });
  settled.onClickCapture(late); settled.onClickCapture(other);
  assert.deepEqual([late.blocked, other.blocked], [1, 0]);
  // uD: settled for a null key (nullSettled), unsettled right after a key appears (the timer only runs in an effect).
  const Probe = ({ k }) => React.createElement('i', null, String(G.useRevealSettled(k, true)));
  assert.equal(render(React.createElement(Probe, { k: null })), '<i>true</i>');
  assert.equal(render(React.createElement(Probe, { k: 'q1::0' })), '<i>false</i>');
  // The local key: the drawn head request (else the plan card), the queued ids, revealNonce 0.
  assert.equal(A.inlineHostRevealKey({ head: command('q1'), queued: [command('q2'), command('q3')] }), 'q1:q2,q3:0');
  assert.equal(A.inlineHostRevealKey({ extraCard: 'p1' }), 'plan:p1::0');
  assert.equal(A.inlineHostRevealKey({}), null);
  // The slot spreads the guard on tke's div only (the /btw pane's bare area has none); the SSR markup is unchanged.
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  const slot = card.slice(card.indexOf('export function SourceApprovalSlot('));
  assert.match(slot, /useRevealSettled\(inlineHost \? inlineHostRevealKey\(\{ head, extraCard, queued \}\) : null, true\)/);
  assert.match(slot, /<div data-skip-approval-enter=\{!settled \|\| undefined\} \{\.\.\.revealClickGuard\(revealed\)\}/);
  assert.doesNotMatch(card, /Not ported: tke's mpe/);
});

test('pane-09-toast: a failed send is KS\'s toast only — the tool card renders no error line for it', () => {
  const ks = read(path.join(v3, 'c5da7eb42-XijZdwf1.js'));
  assert.ok(ks.includes('Sc(l,e)??l.formatMessage({defaultMessage:"Failed to send response. You can try again.",id:"aMbb8XQr/h"})'));
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  const body = card.slice(card.indexOf('export function SourceApprovalCard('), card.indexOf('// R4g-btw BT4 (X7-16): the approval area'));
  assert.match(body, /toasts\?\.add\?\.\(result\.message, \{ variant: "danger" \}\)/);
  assert.doesNotMatch(body, /view\.error/);
});

test('r4pa-c11#frontend: the outside-site card is Wh browser:open_site — origin meta, G2uuEyevXT, Always allow + Allow once', async () => {
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  once(feed, ['case"browser:open_site":return{action:e.formatMessage({defaultMessage:"act on",id:"GdSkjKAsw8"}),meta:m("origin")??m("domain")',
    'defaultMessage:"Allow once applies to this page only. Always allow saves on this device (revoke in Settings). Claude won\\u2019t purchase, create accounts, or bypass captchas without asking.",id:"G2uuEyevXT"']);
  assert.ok(feed.includes('n(K,{defaultMessage:"Always allow",id:"lr3QX/nctD"})'));
  const request = { id: 9, bridgeApproval: { connectionId: 'c', instanceId: 's1' }, method: 'item/commandExecution/requestApproval',
    params: { threadId: 't', turnId: 'u', itemId: 'i', cwd: '/w', codeDesktop: { agentTool: { kind: 'preview-site', host: 'a.example', url: 'https://a.example/path?q=1' } } } };
  const { approvalCardModel } = await server.ssrLoadModule('/src/approval-card-model.mjs');
  const model = approvalCardModel(request, null);
  assert.equal(model.heading.meta, 'https://a.example');
  assert.equal(model.detail, null);
  assert.equal(model.reason, null);
  const html = render(React.createElement(A.SourceApprovalCardView, { request, onAction() {} }));
  assert.match(html, /Allow once applies to this page only\. Always allow saves on this device \(revoke in Settings\)\. DeepSeek won’t purchase, create accounts, or bypass captchas without asking\./);
  assert.match(html, /data-testid="approval-action-acceptForSession"[^>]*>[\s\S]*?Always allow/);
  assert.match(html, /data-testid="approval-action-accept"[^>]*>[\s\S]*?Allow once/);
  assert.doesNotMatch(html, /Allow for this session/);
  const main = read(path.join(app, 'electron/main.cjs'));
  assert.match(main, /if \(kind === "preview-site"\) return \{ approved, always: approved && decision === "acceptForSession" \};/);
});
