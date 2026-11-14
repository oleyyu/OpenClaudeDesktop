import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';

// SSR of the CDS Shortcut keycap (2.2553.1 shared-frame-C_2npUJq.js:2031-2110 Qa) and its two
// call sites: approval Allow once (approval-current.js:15846-15854) and question Next/Submit (:8249-8256).
let server, S, A, Q;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-shortcut.jsx');
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
  Q = await server.ssrLoadModule('/src/source-question-card.jsx');
});
after(() => server?.close());
const count = (html, needle) => html.split(needle).length - 1;
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const buttons = html => html.split('<button').slice(1).map(chunk => chunk.slice(0, chunk.indexOf('</button>')));

test('keycap variant: cmd+enter on mac is two kbd caps with glyphs, spoken sr-only names and Wa/Ga classes', () => {
  const html = render(S.SourceShortcut, { keys: 'cmd+enter', mac: true, 'aria-hidden': 'true', className: 'extra' });
  assert.match(html, /^<span aria-hidden="true" data-cds="Shortcut" data-variant="keycap" class="scds-shortcut extra">/);
  assert.equal(count(html, '<kbd'), 2);
  const kbds = html.match(/<kbd[^>]*>.*?<\/kbd>/g);
  assert.deepEqual(kbds, [
    '<kbd class="scds-key scds-key-square"><span aria-hidden="true">⌘</span><span class="sr-only select-none">Command</span></kbd>',
    '<kbd class="scds-key scds-key-square"><span aria-hidden="true">⏎</span><span class="sr-only select-none">Enter</span></kbd>',
  ]);
});

test('glyph tables: mac modifiers sort ctrl/alt/shift/cmd; non-mac maps cmd to Ctrl; Esc and sequences', () => {
  assert.deepEqual(S.shortcutCaps('cmd+shift+enter', true), [{ label: '⇧', spoken: 'Shift' }, { label: '⌘', spoken: 'Command' }, { label: '⏎', spoken: 'Enter' }]);
  assert.deepEqual(S.shortcutCaps('shift+alt+ctrl+k', true).map(cap => cap.label), ['⌃', '⌥', '⇧', 'K']);
  assert.deepEqual(S.shortcutCaps('cmd+enter', false), [{ label: 'Ctrl' }, { label: '⏎', spoken: 'Enter' }]);
  assert.deepEqual(S.shortcutCaps('shift+cmd+k', false).map(cap => cap.label), ['Ctrl', 'Shift', 'K']);
  assert.deepEqual(S.shortcutCaps('esc', true), [{ label: 'Esc' }]);
  assert.deepEqual(S.shortcutCaps('escape', false), [{ label: 'Esc' }]);
  assert.deepEqual(S.shortcutCaps('cmd+plus', true), [{ label: '⌘', spoken: 'Command' }, { label: '+' }]);
  assert.deepEqual(S.shortcutCaps('cmd+plus', false), [{ label: 'Ctrl' }, { label: '+' }]);
  assert.deepEqual(S.shortcutSequence(' g  then  ') , ['g', 'then']);
  assert.deepEqual(S.shortcutSequence('cmd + k g'), ['cmd+k', 'g']);
  const html = render(S.SourceShortcut, { keys: 'cmd+k g', mac: true });
  assert.equal(count(html, '<span class="scds-then">then</span>'), 1);
  assert.equal(count(html, 'scds-key-wide'), 0);
  // Qa server snapshot (to() :2118-2124) is non-mac: a multi-letter cap uses the Ka min-width class.
  assert.match(render(S.SourceShortcut, { keys: 'cmd+enter' }), /<kbd class="scds-key scds-key-wide">Ctrl<\/kbd>/);
});

// Ya.text + Ja (shared-frame-C_2npUJq.js:2039-2045, :2077-2100): the variant tooltips (Mu :4572-4580) and menu
// items (c_ :8874-8881) use. Mac: one bare <kbd> per key in io order with sr-only spoken names; off mac the
// spoken name is the text and "+" joiners sit between keys.
test('text variant: cmd+shift+d on mac is ⇧ ⌘ D bare kbds with spoken names; Enter is ⏎', () => {
  const html = render(S.SourceShortcut, { keys: 'cmd+shift+d', variant: 'text', mac: true, className: 'source-tooltip-shortcut' });
  assert.match(html, /^<span data-cds="Shortcut" data-variant="text" class="scds-shortcut scds-text source-tooltip-shortcut">/);
  assert.deepEqual(html.match(/<kbd[^>]*>.*?<\/kbd>/g), [
    '<kbd class="scds-text-key"><span aria-hidden="true">⇧</span><span class="sr-only select-none">Shift</span></kbd>',
    '<kbd class="scds-text-key"><span aria-hidden="true">⌘</span><span class="sr-only select-none">Command</span></kbd>',
    '<kbd class="scds-text-key">D</kbd>',
  ]);
  assert.equal(count(html, 'scds-key'), 0, 'no keycap classes');
  assert.equal(count(html, 'scds-joiner'), 0, 'mac draws no "+" joiners');
  const enter = render(S.SourceShortcut, { keys: 'enter', variant: 'text', mac: true });
  assert.match(enter, /<kbd class="scds-text-key"><span aria-hidden="true">⏎<\/span><span class="sr-only select-none">Enter<\/span><\/kbd>/);
  assert.match(render(S.SourceShortcut, { keys: 'escape', variant: 'text', mac: true }), /<kbd class="scds-text-key">Esc<\/kbd>/);
  assert.match(render(S.SourceShortcut, { keys: 'p', variant: 'text', mac: true }), /<kbd class="scds-text-key">P<\/kbd>/);
});

test('text variant off mac spells the keys with "+" joiners; the keycap variant stays the default', () => {
  const html = render(S.SourceShortcut, { keys: 'cmd+shift+d', variant: 'text', mac: false });
  assert.deepEqual(html.match(/<kbd[^>]*>.*?<\/kbd>/g), ['<kbd class="scds-text-key">Ctrl</kbd>', '<kbd class="scds-text-key">Shift</kbd>', '<kbd class="scds-text-key">D</kbd>']);
  assert.equal(count(html, '<span class="scds-joiner">+</span>'), 2);
  assert.match(render(S.SourceShortcut, { keys: 'enter', variant: 'text', mac: false }), /<kbd class="scds-text-key">Enter<\/kbd>/);
  assert.match(render(S.SourceShortcut, { keys: 'cmd+k' , mac: true }), /data-variant="keycap" class="scds-shortcut"/);
});

const command = { id: 7, method: 'item/commandExecution/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: 'i' },
  params: { threadId: 'T', turnId: 'turn', itemId: 'item', command: 'printf ok', reason: 'Fixture' } };
const card = props => render(A.SourceApprovalCardView, { request: command, onAction: () => {}, ...props });

// V3-W14-approvals: the 3.6556.2 tool card (cc32965c2 Sv / Z_): the title is L in bL (cc32965c2 Lt), the tags b / meta
// span.text-primary [unicode-bidi:plaintext] (ev…av), the span line-clamp-2 when clampTitle and a detail show, else a
// [data-approval-value]; the decisions are shared-10 FS / IS (CDS Buttons, data-testid approval-action-<key>).
const EM = '<span class="text-primary [unicode-bidi:plaintext]">';
const actionOf = button => /data-testid="approval-action-([^"]+)"/.exec(button)?.[1];

test('approval card: single-file heading has two text-primary spans and the line clamp (cc32965c2 L, EFOijHTneN)', () => {
  const request = { id: 9, method: 'item/fileChange/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: 'f' },
    params: { threadId: 'T', turnId: 'turn', itemId: 'item' } };
  const html = card({ request, item: { changes: [{ path: '/w/src/created.ts', kind: { type: 'add' }, diff: '+x\n' }] } });
  // Sv Ii: "Permission request: {action}" with hg's action (no meta).
  assert.match(html, /aria-label="Permission request: write"/);
  assert.ok(html.includes(`<span class="text-body-semibold min-w-0 break-words"><span class="line-clamp-2">Allow DeepSeek to ${EM}write</span> ${EM}created.ts</span>?</span></span>`));
  assert.equal(count(html, EM), 2);
  const multi = card({ request, item: { changes: [{ path: 'a.ts', kind: 'update' }, { path: 'b.ts', kind: 'update' }] } });
  assert.ok(multi.includes(`<span data-approval-value="">Allow DeepSeek to ${EM}edit files</span>?</span>`));
  assert.equal(count(multi, 'line-clamp-2'), 0);
  // Bash without a description (cc32965c2 Wh Bash): "run", the command its detail, clampTitle.
  assert.equal(count(card({}), 'line-clamp-2'), 1);
});

test('approval card: the reason is its own clamped block before the context, unlabelled until it scrolls (cc32965c2 Z_ ce, so + C_)', () => {
  const html = card({ request: { ...command, params: { ...command.params, reason: 'Needs danger-full-access: write /x', cwd: '/w' } } });
  assert.ok(html.includes('<div class="flex flex-col gap-[12px]"><div class="epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus text-body text-secondary select-text break-words max-h-[calc(3*var(--cds-leading-body))] overflow-y-auto [unicode-bidi:plaintext]">Needs danger-full-access: write /x</div><p data-context="cwd" class="text-body text-secondary select-text break-words [unicode-bidi:plaintext]">Working directory: /w</p>'));
  assert.equal(count(html, 'data-context="reason"'), 0);
  // The "Reason" label is only the accessible name of an overflowing (focusable) region: no visible text.
  assert.equal(count(html, '>Reason<'), 0);
  assert.equal(count(html, 'aria-label="Reason"'), 0);
  assert.equal(count(card({ request: { ...command, params: { ...command.params, reason: null } } }), 'max-h-[calc(3*var(--cds-leading-body))]'), 0);
});

test('approval card: item headings draw the source verb spans; a meta-less heading has one', () => {
  const args = { description: 'Audit the parser', prompt: 'Read src/parse.js' };
  const agent = card({ item: { type: 'dynamicToolCall', id: 'item', tool: 'subagent', arguments: args } });
  assert.match(agent, /aria-label="Permission request: run an agent"/);
  // Task/Agent: no detail, so no clamp and no value block.
  assert.ok(agent.includes(`<span data-approval-value="">Allow DeepSeek to ${EM}run an agent</span> ${EM}Audit the parser</span>?</span>`));
  assert.equal(count(agent, 'bg-alpha-1 rounded-[5px] py-md px-lg text-code'), 0);
  assert.equal(count(agent, 'role="status" data-approval-announcement=""'), 1);
  const mcp = card({ item: { type: 'mcpToolCall', id: 'item', server: 'github', tool: 'create_issue', arguments: { title: 'Bug' } } });
  assert.ok(mcp.includes(`Allow DeepSeek to ${EM}use create issue (github)</span>?</span>`));
  assert.equal(count(mcp, `>Allow DeepSeek to ${EM}`), 1);
  const bash = card({ item: { type: 'commandExecution', id: 'item', command: 'printf ok', description: 'Print ok' } });
  assert.ok(bash.includes(`<span class="line-clamp-2">Allow DeepSeek to ${EM}run</span> ${EM}Print ok</span>?</span>`));
  assert.ok(card({}).includes(`<span class="line-clamp-2">Allow DeepSeek to ${EM}run</span>?</span>`));
});

test('approval card: sessionGrantable:false draws Deny and Allow once only', () => {
  const html = card({ request: { ...command, params: { ...command.params, sessionGrantable: false } } });
  assert.deepEqual(buttons(html).map(actionOf).filter(Boolean), ['decline', 'accept']);
});

test('approval card: exactly one aria-hidden keycap, inside the primary Allow once; none on Deny or session allow', () => {
  const html = card({});
  assert.equal(count(html, 'data-cds="Shortcut"'), 1);
  const all = buttons(html).filter(actionOf);
  const primary = all.filter(button => button.includes('data-approval-primary'));
  assert.equal(primary.length, 1);
  assert.equal(actionOf(primary[0]), 'accept');
  // SSR is the non-Mac platform: Ctrl.
  assert.match(primary[0], /aria-keyshortcuts="Control\+Enter"/);
  assert.match(primary[0], /<span class="min-w-0 \[unicode-bidi:plaintext\] truncate" data-approval-digit="3">Allow once<\/span><span aria-hidden="true" data-cds="Shortcut" data-variant="keycap"/);
  for (const button of all.filter(button => !button.includes('data-approval-primary'))) {
    assert.equal(count(button, 'data-cds="Shortcut"'), 0);
    assert.equal(count(button, '<kbd'), 0);
  }
  // Card placement: Deny's esc and the session allow's ⇧⌘↵ are announced, not drawn (chordHintHidden).
  assert.match(all.find(button => actionOf(button) === 'decline'), /aria-keyshortcuts="Escape"/);
  assert.match(all.find(button => actionOf(button) === 'acceptForSession'), /aria-keyshortcuts="Control\+Shift\+Enter"/);
});

test('approval card: inactive, open menu, unsupported or unanswerable cards draw no keycap and no aria-keyshortcuts', () => {
  for (const html of [card({ isActive: false }), card({ menuOpen: true }), card({ enabled: false }), card({ onAction: undefined })]) {
    assert.equal(count(html, 'data-cds="Shortcut"'), 0);
    assert.equal(count(html, 'aria-keyshortcuts'), 0);
  }
});

test('approval card: busy keeps the primary cap inside the faded content span; the other decisions are held', () => {
  const html = card({ busy: true, busyAction: 'accept' });
  const primary = buttons(html).find(button => button.includes('data-approval-primary'));
  assert.match(primary, /aria-busy="true"/);
  assert.match(primary, /<span class="inline-flex min-w-0 items-center gap-1 opacity-0"><span class="min-w-0 \[unicode-bidi:plaintext\] truncate" data-approval-digit="3">Allow once<\/span><span aria-hidden="true" data-cds="Shortcut"/);
  assert.match(primary, /data-cds="Spinner"/);
  for (const button of buttons(html).filter(button => !button.includes('data-approval-primary'))) assert.match(button, /aria-disabled="true"/);
  const other = card({ busy: true, busyAction: 'decline' });
  assert.match(buttons(other).find(button => button.includes('data-approval-primary')), /<span aria-hidden="true" data-cds="Shortcut"/);
});

let instance = 0;
function question(extra = {}) {
  const request = { id: 1, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'q', instanceId: `q-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'choice', header: 'Choice', question: 'Pick one', isOther: false, isSecret: false,
      options: [{ label: 'Alpha' }, { label: 'Beta' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return { runtime, request, ticket: runtime.ticketFor(request), html: props => render(Q.SourceQuestionCard, { runtime, request, ...extra, ...props }) };
}
// W12: the footer is c9ed5627b dt's — CdsButton secondary Skip, then je (c30607cef i: CdsButton primary, `shortcut: w ?
// "cmd+enter"`); the CDS Button keeps the cap inside its content span, which fades (opacity-0) while busy.
const footerButtons = html => buttons(html.slice(html.lastIndexOf('<div class="flex items-center justify-end gap-[8px]">')));
const submitButton = html => footerButtons(html).at(-1);

test('question card: active primary Submit carries the keycap after its label; inactive or menu-open does not', () => {
  const { html } = question();
  const submit = submitButton(html());
  assert.match(submit, /data-cds="Button"/);
  assert.match(submit, /<span class="inline-flex min-w-0 items-center gap-1 ">Submit<span aria-hidden="true" data-cds="Shortcut" data-variant="keycap"/);
  assert.equal(count(footerButtons(html()).join(''), 'data-cds="Shortcut"'), 1);
  assert.equal(count(footerButtons(html({ isActive: false })).join(''), 'data-cds="Shortcut"'), 0);
  assert.equal(count(footerButtons(html({ menuOpen: true })).join(''), 'data-cds="Shortcut"'), 0);
});

test('question card: while busy the cap stays inside the faded content span (stable width)', async () => {
  const { runtime, ticket, html } = question();
  runtime.selectOption(ticket, 'choice', 'Alpha');
  void runtime.submit(ticket, null, () => new Promise(() => {}), { getVisibleThreadId: () => 'T' });
  assert.equal(runtime.snapshot(ticket).busy, true);
  const submit = submitButton(html());
  assert.match(submit, /aria-busy="true"/);
  assert.match(submit, /<span class="inline-flex min-w-0 items-center gap-1 opacity-0">Submit<span aria-hidden="true" data-cds="Shortcut"/);
  assert.match(submit, /data-cds="Spinner"/);
});

test('question card: secondary Skip precedes the primary, has no keycap, and follows the busy/inactive guards', async () => {
  const { runtime, ticket, html } = question();
  const [skip, submit] = footerButtons(html()).slice(-2);
  assert.match(skip, /^ type="button" data-cds="Button"[^>]*>.*>Skip<\/span>$/);
  assert.doesNotMatch(skip, /data-cds="Shortcut"/);
  assert.doesNotMatch(submit.slice(0, submit.indexOf('>')), /\sdisabled=""/);
  // The runtime preselects options[0]: its row wears st.
  assert.match(html(), /bg-\[light-dark\(var\(--cds-surface-popover\),var\(--cds-alpha-2\)\)\][^"]*"><div class="flex flex-col gap-0\.5 min-w-0 flex-1 select-text"><div class="text-body text-primary[^"]*">Alpha</);
  assert.match(footerButtons(html({ isActive: false })).at(-2), /^ type="button" disabled=""/);
  assert.match(footerButtons(html({ menuOpen: true })).at(-2), /^ type="button" disabled=""/);
  void runtime.submit(ticket, null, () => new Promise(() => {}), { getVisibleThreadId: () => 'T' });
  assert.match(footerButtons(html()).at(-2), /^ type="button" disabled=""[^>]*>.*Skip/);
});

test('question card: like dt, the primary carries no disabled reason (je takes only `disabled: !Dn`)', () => {
  const request = { id: 2, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'q', instanceId: `q-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'notes', question: 'Notes', options: [] }, { id: 'choice', question: 'Pick', options: [{ label: 'A' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  const ticket = runtime.ticketFor(request);
  const markup = () => render(Q.SourceQuestionCard, { runtime, request });
  assert.doesNotMatch(markup(), /Choose an option or skip this question|Question 1 is unanswered/);
  assert.match(submitButton(markup()).slice(0, submitButton(markup()).indexOf('>')), /\sdisabled=""/);
  runtime.setPage(ticket, 1);
  assert.match(footerButtons(markup())[0], />Back<\/span>$/, 'page 2 has Back (dt ur, me-auto)');
});
