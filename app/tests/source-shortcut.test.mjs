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
    '<kbd class="scds-key scds-key-square"><span aria-hidden="true">⌘</span><span class="scds-sr">Command</span></kbd>',
    '<kbd class="scds-key scds-key-square"><span aria-hidden="true">⏎</span><span class="scds-sr">Enter</span></kbd>',
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
    '<kbd class="scds-text-key"><span aria-hidden="true">⇧</span><span class="scds-sr">Shift</span></kbd>',
    '<kbd class="scds-text-key"><span aria-hidden="true">⌘</span><span class="scds-sr">Command</span></kbd>',
    '<kbd class="scds-text-key">D</kbd>',
  ]);
  assert.equal(count(html, 'scds-key'), 0, 'no keycap classes');
  assert.equal(count(html, 'scds-joiner'), 0, 'mac draws no "+" joiners');
  const enter = render(S.SourceShortcut, { keys: 'enter', variant: 'text', mac: true });
  assert.match(enter, /<kbd class="scds-text-key"><span aria-hidden="true">⏎<\/span><span class="scds-sr">Enter<\/span><\/kbd>/);
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

test('approval card: single-file heading has two text-primary .sac-em spans and a clamp marker (approval-current.js:15399-15470)', () => {
  const request = { id: 9, method: 'item/fileChange/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: 'f' },
    params: { threadId: 'T', turnId: 'turn', itemId: 'item' } };
  const html = card({ request, item: { changes: [{ path: '/w/src/created.ts', kind: { type: 'add' }, diff: '+x\n' }] } });
  assert.match(html, /aria-label="Permission request: Allow DeepSeek to write created.ts\?"/);
  assert.match(html, /<button type="button" class="sac-heading"[^>]*><span data-clamp="">Allow DeepSeek to <span class="sac-em">write<\/span> <span class="sac-em">created.ts<\/span>\?<\/span><\/button>/);
  assert.equal(count(html, 'class="sac-em"'), 2);
  const multi = card({ request, item: { changes: [{ path: 'a.ts', kind: 'update' }, { path: 'b.ts', kind: 'update' }] } });
  assert.match(multi, /<span>Allow DeepSeek to edit files\?<\/span><\/button>/);
  assert.equal(count(multi, 'sac-em'), 0); assert.equal(count(multi, 'data-clamp'), 0);
  assert.equal(count(card({}), 'data-clamp'), 0);
});

test('approval card: the reason is its own clamped block before the context, unlabelled until it scrolls (approval-current.js:15275-15284, cf6ae6197 bv)', () => {
  const html = card({ request: { ...command, params: { ...command.params, reason: 'Needs danger-full-access: write /x', cwd: '/w' } } });
  assert.match(html, /<div class="sac-content"><div class="sac-reason scroll-fade-y scroll-fade-size-\[8px\]">Needs danger-full-access: write \/x<\/div><p class="sac-context" data-context="cwd">Working directory: \/w<\/p>/);
  assert.equal(count(html, 'data-context="reason"'), 0);
  // The "Reason" label is only the accessible name of an overflowing (focusable) region: no visible text.
  assert.equal(count(html, '>Reason<'), 0);
  assert.equal(count(html, 'aria-label="Reason"'), 0);
  assert.equal(count(card({ request: { ...command, params: { ...command.params, reason: null } } }), 'sac-reason'), 0);
});

test('approval card: item headings draw the source verb spans; a meta-less heading has one', () => {
  const args = { description: 'Audit the parser', prompt: 'Read src/parse.js' };
  const agent = card({ item: { type: 'dynamicToolCall', id: 'item', tool: 'subagent', arguments: args } });
  assert.match(agent, /aria-label="Permission request: Allow DeepSeek to run an agent Audit the parser\?"/);
  // F07 Task/Agent (approval-current.js:14570-14579): no detail, so a plain div heading with no
  // toggle (on purpose: was a button over the arguments JSON).
  assert.match(agent, /<div class="sac-heading"><span>Allow DeepSeek to <span class="sac-em">run an agent<\/span> <span class="sac-em">Audit the parser<\/span>\?<\/span><\/div>/);
  assert.equal(count(agent, 'class="sac-code"'), 0);
  assert.equal(count(agent, 'role="status" data-approval-announcement=""'), 1);
  const mcp = card({ item: { type: 'mcpToolCall', id: 'item', server: 'github', tool: 'create_issue', arguments: { title: 'Bug' } } });
  assert.match(mcp, /Allow DeepSeek to <span class="sac-em">use create_issue \(github\)<\/span>\?<\/span>/);
  assert.equal(count(mcp, 'class="sac-em"'), 1);
  const bash = card({ item: { type: 'commandExecution', id: 'item', command: 'printf ok', description: 'Print ok' } });
  assert.match(bash, /<span data-clamp="">Allow DeepSeek to <span class="sac-em">run<\/span> <span class="sac-em">Print ok<\/span>\?<\/span>/);
  assert.match(card({}), /<span>Allow DeepSeek to run this command\?<\/span>/);
});

test('approval card: sessionGrantable:false draws Deny and Allow once only', () => {
  const html = card({ request: { ...command, params: { ...command.params, sessionGrantable: false } } });
  const actions = buttons(html).filter(button => button.includes('data-approval-action=')).map(button => /data-approval-action="([^"]+)"/.exec(button)[1]);
  assert.deepEqual(actions, ['decline', 'accept']);
});

test('approval card: exactly one aria-hidden keycap, inside the primary Allow once; none on Deny or session allow', () => {
  const html = card({});
  assert.equal(count(html, 'data-cds="Shortcut"'), 1);
  const all = buttons(html).filter(button => button.includes('data-approval-action='));
  const primary = all.filter(button => button.includes('data-approval-primary'));
  assert.equal(primary.length, 1);
  assert.match(primary[0], /data-approval-action="accept"/);
  assert.match(primary[0], /aria-keyshortcuts="Meta\+Enter Control\+Enter"/);
  assert.match(primary[0], /<span class="sac-button-label">[^<]+<\/span><span aria-hidden="true" data-cds="Shortcut" data-variant="keycap" class="scds-shortcut scds-in-button scds-trailing">/);
  for (const button of all.filter(button => !button.includes('data-approval-primary'))) {
    assert.equal(count(button, 'data-cds="Shortcut"'), 0);
    assert.equal(count(button, '<kbd'), 0);
  }
  assert.ok(all.some(button => /data-approval-action="decline"/.test(button)));
  assert.ok(all.some(button => /data-approval-action="acceptForSession"/.test(button)));
});

test('approval card: inactive, open menu, unsupported or unanswerable cards draw no keycap and no aria-keyshortcuts', () => {
  for (const html of [card({ isActive: false }), card({ menuOpen: true }), card({ enabled: false }), card({ onAction: undefined })]) {
    assert.equal(count(html, 'data-cds="Shortcut"'), 0);
    assert.equal(count(html, 'aria-keyshortcuts'), 0);
  }
});

test('approval card: busy keeps the primary cap (faded with its spinning label) so the busy action keeps its width', () => {
  const html = card({ busy: true, busyAction: 'accept' });
  assert.equal(count(html, 'aria-keyshortcuts'), 0);
  const primary = buttons(html).find(button => button.includes('data-approval-primary'));
  assert.match(primary, /<span class="sac-button-label" data-busy="true">[^<]+<\/span><span aria-hidden="true" data-busy="true" data-cds="Shortcut"/);
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
const submitButton = html => buttons(html).find(button => button.includes('class="sq-submit"'));

test('question card: active primary Submit carries the keycap after its label; inactive or menu-open does not', () => {
  const { html } = question();
  const submit = submitButton(html());
  assert.equal(count(html(), 'data-cds="Shortcut"'), 1);
  assert.match(submit, /<span class="sq-submit-label">Submit<span aria-hidden="true" data-cds="Shortcut" data-variant="keycap" class="scds-shortcut scds-in-button scds-trailing">/);
  assert.equal(count(html({ isActive: false }), 'data-cds="Shortcut"'), 0);
  assert.equal(count(html({ menuOpen: true }), 'data-cds="Shortcut"'), 0);
});

test('question card: while busy the cap stays inside the aria-hidden, faded content span (stable width)', async () => {
  const { runtime, ticket, html } = question();
  runtime.selectOption(ticket, 'choice', 'Alpha');
  void runtime.submit(ticket, null, () => new Promise(() => {}), { getVisibleThreadId: () => 'T' });
  assert.equal(runtime.snapshot(ticket).busy, true);
  const submit = submitButton(html());
  assert.match(submit, /aria-busy="true"/);
  assert.match(submit, /<span class="sq-submit-label" aria-hidden="true">Submit<span aria-hidden="true" data-cds="Shortcut"/);
});

test('question card: secondary Skip precedes the primary, has no keycap, and follows the busy/inactive guards', async () => {
  // approval-current.js:8232-8258 footer: br{secondary, 'Skip', disabled: busy} then the primary; _se preselects [0].
  const { runtime, ticket, html } = question();
  const [skip, submit] = buttons(html()).slice(-2);
  assert.match(skip, /^ type="button" class="sq-skip" data-variant="secondary">Skip$/);
  assert.match(submit, /class="sq-submit"/);
  assert.doesNotMatch(submit, /disabled/);
  assert.match(html(), /aria-pressed="true"><span class="sq-radio-mark" aria-hidden="true" data-checked="">/);
  assert.match(buttons(html({ isActive: false })).at(-2), /disabled=""/);
  assert.match(buttons(html({ menuOpen: true })).at(-2), /disabled=""/);
  void runtime.submit(ticket, null, () => new Promise(() => {}), { getVisibleThreadId: () => 'T' });
  assert.match(buttons(html()).at(-2), /class="sq-skip" data-variant="secondary" disabled="">Skip/);
});

test('question card: the disabled reason is the source copy for option and free-form pages', () => {
  const request = { id: 2, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'q', instanceId: `q-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'notes', question: 'Notes', options: [] }, { id: 'choice', question: 'Pick', options: [{ label: 'A' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  const ticket = runtime.ticketFor(request);
  const markup = () => render(Q.SourceQuestionCard, { runtime, request });
  assert.match(markup(), /Choose an option or skip this question/);
  runtime.setPage(ticket, 1);
  assert.match(markup(), /Question 1 is unanswered/);
  assert.doesNotMatch(markup(), /Enter an answer|Choose an option<|enter an answer/);
});
