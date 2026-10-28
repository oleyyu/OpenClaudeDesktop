// The teach card (official 2.42304.0 ca31fdde5 Ua / Wa for computer:request_teach_access, docs/computer-use-official-spec-
// 20261021.md §2.1): its model (computer-use-model.mjs computerUseTeachRequest, approval-card-model.mjs), its keys (⌘↵
// Start guide, ⌘. Deny) and its markup (computer-use-approval-card.jsx ComputerUseTeachCardBody inside
// SourceApprovalCardView's teach branch), class string for class string. The step rows' official verbs too.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { computerUseTeachRequest, computerUseLabel } from '../src/computer-use-model.mjs';
import { approvalCardModel, approvalKeyIntent, ELICITATION } from '../src/approval-card-model.mjs';
import { computerUseAction } from '../electron/computer-use/actions.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const teach = {
  reason: 'making a new note',
  apps: [
    { bundleId: 'com.apple.TextEdit', displayName: 'TextEdit', tier: 'full', installed: true, iconDataUrl: 'data:image/png;base64,AAAA' },
    { bundleId: 'com.apple.Terminal', displayName: 'Terminal', tier: 'click', installed: true },
    { bundleId: 'com.apple.finder', displayName: 'Finder', tier: 'full', installed: true, alreadyGranted: true },
  ],
};
const request = { method: ELICITATION, id: 't1', params: { serverName: 'code_desktop', mode: 'form', message: 'Allow the code_desktop MCP server to run tool "request_teach_access"?',
  requestedSchema: { type: 'object', properties: {} }, _meta: { codex_approval_kind: 'mcp_tool_call', persist: ['session'], computer_use_teach: teach } } };

test('model: the reason, the apps with their tier / risk / already allowed, Deny and Start guide', () => {
  const parsed = computerUseTeachRequest(request.params);
  assert.equal(parsed.reason, 'making a new note');
  assert.deepEqual(parsed.apps.map((app) => [app.name, app.tier, app.risk, app.alreadyGranted, app.resolved]),
    [['TextEdit', 'full', null, false, true], ['Terminal', 'click', 'shell', false, true], ['Finder', 'full', 'filesystem', true, true]]);
  assert.equal(computerUseTeachRequest({ _meta: { codex_approval_kind: 'mcp_tool_call' } }), null, 'only with _meta.computer_use_teach');
  const model = approvalCardModel(request, null);
  assert.equal(model.teach.reason, 'making a new note');
  assert.equal(model.deny.label, 'Deny');
  assert.deepEqual(model.allows.map((allow) => [allow.key, allow.label, allow.primary]), [['acceptForSession', 'Start guide', true]]);
  assert.match(model.title, /guide you step by step\?$/);
  assert.equal(model.access, undefined);
  assert.equal(model.takeover, undefined);
});

test('keys (official Ua mt()): ⌘↵ is Start guide, ⌘. and Esc are Deny', () => {
  const model = approvalCardModel(request, null);
  const key = (init) => approvalKeyIntent({ key: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init }, { target: 'card', model });
  assert.deepEqual(key({ key: 'Enter', metaKey: true }), { type: 'action', action: 'acceptForSession' });
  assert.deepEqual(key({ key: '.', metaKey: true }), { type: 'action', action: 'decline' });
  assert.deepEqual(key({ key: 'Escape' }), { type: 'action', action: 'decline' });
});

test('step rows: the official running / done / failed verbs, zh-CN for each', () => {
  const row = (tool, state) => computerUseLabel(computerUseAction({ type: 'mcpToolCall', server: 'code_desktop', tool, arguments: {} }), state).label;
  assert.deepEqual(['busy', 'done', 'failed'].map((state) => row('request_teach_access', state)), ['Asking to guide you step by step', 'Asked to guide you step by step', 'Step-by-step guidance not approved']);
  assert.deepEqual(['busy', 'done', 'failed'].map((state) => row('teach_step', state)), ['Showing a step', 'Showed a step', 'Failed to show a step']);
  assert.deepEqual(['busy', 'done', 'failed'].map((state) => row('teach_batch', state)), ['Showing steps', 'Showed steps', 'Failed to show steps']);
  for (const key of ['Let {name} guide you step by step?', 'The {name} window will hide. A tooltip appears next to each step with a Next button. Click Exit anytime to stop.',
    'Start guide', 'Already allowed', 'Asking to guide you step by step', 'Showed steps', 'Step-by-step guidance not approved']) assert.equal(typeof zh[key], 'string', key);
});

let server, React, render, A;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
});
after(() => server?.close());

test('markup: the official card shell and body, the app rows (Hi), Deny ⌘. then Start guide ⌘↵', () => {
  const html = render(React.createElement(A.SourceApprovalCardView, { request, onAction: () => {} }));
  assert.match(html, /^<section[^>]*class="source-message mb-4 overflow-hidden rounded-card border bg-surface-panel shadow-lg [^"]*"[^>]*data-approval-root=""/);
  assert.match(html, /data-computer-use-teach=""/);
  assert.doesNotMatch(html, /sac-card|sac-heading/, 'not the generic card');
  assert.match(html, /<div class="p-md"><div class="mb-1 flex items-start gap-2">/);
  assert.match(html, /<span class="font-semibold text-body text-secondary">Let [^<]+ guide you step by step\?<\/span>/);
  // The GraduationCap glyph (icons.json 57475) in the header icon, Warning (57609) in the risk lines.
  assert.match(html, new RegExp(`<div class="mb-1 flex items-start gap-2"><span aria-hidden="true" data-cds="Icon" class="shrink-0 text-secondary" style="font-size:20px[^"]*">${String.fromCodePoint(57475)}</span>`));
  assert.ok(html.includes(`class="mt-0.5 shrink-0" style="font-size:14px;font-weight:628.6">${String.fromCodePoint(57609)}</span>`));
  assert.match(html, /<p class="ms-7 mb-2 text-body text-secondary">making a new note<\/p>/);
  assert.match(html, /<p class="ms-7 mb-3 text-footnote text-muted-as-secondary">The [^<]+ window will hide\. A tooltip appears next to each step with a Next button\. Click Exit anytime to stop\.<\/p>/);
  assert.match(html, /<div class="ms-7 mb-3 divide-y rounded border bg-surface-1">/);
  // Rows: icon (image or placeholder), the name, the tier badge / Already allowed, the risk line.
  assert.match(html, /<div class="p-2\.5 " data-cua-app="com\.apple\.TextEdit"><div class="flex items-center gap-sm"><div class="size-5 shrink-0 overflow-hidden rounded-\[4px\]"><img src="data:image\/png;base64,AAAA" alt="" class="size-full scale-\[1\.15\]"\/><\/div><span class="min-w-0 flex-1 truncate text-body text-secondary \[unicode-bidi:isolate\]">TextEdit<\/span><span data-cds="Badge" data-variant="neutral"[^>]*><span class="pb-\[0\.05em\]">All<\/span><\/span>/);
  assert.match(html, /data-cua-app="com\.apple\.Terminal"[^]*?<div class="size-5 shrink-0 rounded-\[4px\] bg-alpha-2"><\/div>[^]*?data-variant="accent"[^>]*><span class="pb-\[0\.05em\]">Click only<\/span>/);
  assert.match(html, /<div class="ms-7 mt-1 flex items-start gap-1\.5 text-footnote text-danger">[^]*?<span>Can run commands on your computer<\/span><\/div>/);
  assert.match(html, /data-cua-app="com\.apple\.finder"[^]*?<span class="pb-\[0\.05em\]">Already allowed<\/span>/);
  // Buttons: Deny then Start guide, inside ms-7 flex gap-sm, with their keycaps.
  const buttons = /<div class="ms-7 flex gap-sm">([^]*)<\/div><\/div>/.exec(html)?.[1] ?? '';
  const labels = [...buttons.matchAll(/data-approval-action="([^"]+)"[^]*?class="sac-button-label"[^>]*>([^<]+)</g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(labels, [['decline', 'Deny'], ['acceptForSession', 'Start guide']]);
  assert.match(buttons, /data-variant="secondary"[^]*data-variant="primary"/);
  assert.equal((buttons.match(/data-cds="Shortcut"/g) || []).length, 2, 'both buttons show their shortcut');
  // No capability rows: teach grants no clipboard or system-key flags.
  assert.doesNotMatch(html, /data-cua-capability/);
});
