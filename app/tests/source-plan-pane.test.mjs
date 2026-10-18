import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// R09 Plan pane (2.2553.1 readable/panes-tile-current.js kp :1751-1790, Dp :1716-1750, Op, Mp :1830-1866):
// the proposed plan document (state.planDocs) in the 68ch column, the Tasks section after it when todos exist,
// and the header "Copy plan" button while a document exists. Middleware-mode Vite SSR.
let server, S, P, C, I;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  P = await server.ssrLoadModule('/src/source-plan-pane.jsx');
  C = await server.ssrLoadModule('/src/source-pane-controls.jsx');
  I = await server.ssrLoadModule('/src/inline-comments.mjs');
});
after(() => server?.close());
const h = React.createElement;
const text = (markup) => markup.replace(/<[^>]+>/g, '');
const controls = ({ menuSections, leading }) => h(C.SourcePaneControls, { tileId: 'plan', paneName: 'Plan', layout: 'right',
  menuSections, leading, onToggleExpand: () => {}, onClose: () => {} });
const panel = (props) => renderToStaticMarkup(h(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'plan', paneControls: controls, ...props }));
const DOCUMENT = '# Plan heading\n\nInspect the parser, then fix it.\n';
const TODOS = [{ step: 'Inspect the parser', status: 'completed' }, { step: 'Fix it', status: 'inProgress' }];

test('document and todos: the Markdown heading renders in the Prose column before the "Tasks" h2', () => {
  const markup = panel({ plan: TODOS, planDocument: DOCUMENT });
  const body = markup.slice(markup.indexOf('</header>'));
  assert.match(body, /<div class="h-full select-text overflow-y-auto \[contain:strict\] \[scrollbar-gutter:stable_both-edges\] p-lg source-plan" data-plan-document="" data-epitaxy-plan-scroll=""><div class="mx-auto max-w-\[68ch\]">(?:<div class="mb-\[var\(--chat-item-gap\)\] flex items-center gap-1 text-caption text-muted spp-comment-hint"[^>]*>.*?<\/div>)?<div data-cds="Prose" data-prose-font="sans" data-size="sm" class="prose source-plan-document"><div class="source-markdown">/);
  const heading = body.indexOf('<h1>Plan heading</h1>'), tasks = body.indexOf('>Tasks</h2>');
  assert.ok(heading > 0, 'the document heading renders');
  assert.ok(tasks > heading, 'Tasks follows the document');
  assert.match(body, /<section class="mt-pad-lg source-plan-tasks"><h2 class="text-caption-medium uppercase tracking-wide text-muted mb-1\.25">Tasks<\/h2>/);
  assert.match(text(body), /Inspect the parser, then fix it\./);
  assert.doesNotMatch(body, /No plan yet/);
});

test('document only: no Tasks section; todos only: Tasks and no document', () => {
  const documentOnly = panel({ plan: [], planDocument: DOCUMENT });
  assert.match(documentOnly, /<h1>Plan heading<\/h1>/);
  assert.doesNotMatch(documentOnly, /Tasks<\/h2>|source-plan-tasks|No plan yet/);
  const todosOnly = panel({ plan: TODOS, planDocument: null });
  assert.match(todosOnly, /<div class="h-full select-text overflow-y-auto \[contain:strict\] \[scrollbar-gutter:stable_both-edges\] p-lg source-plan"><div class="mx-auto max-w-\[68ch\]"><section class="mt-pad-lg source-plan-tasks">/);
  assert.doesNotMatch(todosOnly, /source-plan-document|data-plan-document/);
  const neither = panel({ plan: [], planDocument: null });
  assert.match(text(neither), /No plan yet/);
});

test('"Copy plan": a ghost icon-only Copy button leads the Plan trailing controls only while a document exists', () => {
  const markup = panel({ plan: TODOS, planDocument: DOCUMENT });
  const header = markup.slice(markup.indexOf('<header'), markup.indexOf('</header>'));
  const button = header.match(/<button[^>]*aria-label="Copy plan"[^>]*>/)?.[0];
  assert.ok(button, 'Copy plan in the header');
  assert.match(button, /class="source-icon-button spc-ghost"/);
  assert.doesNotMatch(button, /title=/);
  assert.ok(header.indexOf('class="spc-controls"') < header.indexOf('aria-label="Copy plan"'), 'inside the trailing cluster');
  assert.ok(header.indexOf('aria-label="Copy plan"') < header.indexOf('aria-label="Close panel"'));
  assert.doesNotMatch(panel({ plan: TODOS, planDocument: null }), /Copy plan/, 'no document, no Copy plan (Mp returns null)');
  assert.deepEqual(P.PLAN_COPY_LABELS, { copy: 'Copy plan', copied: 'Copied' });
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-plan-pane.jsx'), 'utf8');
  assert.match(src, /<Icon name=\{copied \? "Check" : "Copy"\} size=\{16\} \/>/);
  assert.match(src, /controller\.current\?\.setText\(document \?\? ""\)/);
});

test('wiring: planDocs gate the Plan row, /plan and the popout sync; the pane gate takes todos or a document', () => {
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  // R4h-topbar K1: the View options rows come from session-chord-model.mjs titlebarViewOptionsItems; the Plan row shows
  // for a todo list or a plan document (hasPlan from main.jsx) or while the pane is open.
  assert.match(main, /hasPlan: !!\(state\.plans\[current\]\?\.length \|\| state\.planDocs\?\.\[current\]\),/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../src/session-chord-model.mjs'), 'utf8'), /\.\.\.\(\(hasPlan \|\| open\.has\("plan"\)\) \? \[\{ kind: "plan", label: "Plan", icon: "Checklist" \}\] : \[\]\)/);
  assert.match(main, /hasPlan:!!\(state\.plans\[current\]\?\.length\|\|state\.planDocs\?\.\[current\]\)/);
  assert.match(main, /data: \{ plan: state\.plans\[entry\.sessionId\] \?\? null, document: state\.planDocs\?\.\[entry\.sessionId\] \?\? null,\s+commentsEnabled: planCommentsOpen\(entry\.sessionId\) \}/);
  // B22: the pane takes comments while a plan review is pending or the session is in Plan; the history state feeds Jh.
  assert.match(main, /planCommentsEnabled\(\{ pendingReview: planReviewPending\(id\), permission: id === current \? effectivePermission : null \}\)/);
  assert.match(main, /planHistory=\{tileId === "plan" && current \? \{ loading, failed: loadError\?\.id === current, onRetry: \(\) => openSession\(current, \{ retry: true \}\) \} : null\}/);
  assert.match(main, /planCommentsEnabled=\{plan\?\.commentsEnabled === true\}/);
  assert.match(main, /planDocument=\{state\.planDocs\?\.\[current\] \?\? null\}/);
  assert.match(main, /planDocument=\{plan\?\.document \?\? null\}/);
  const session = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(session, /tab === "plan" && \(plan\?\.length \|\| planDocument\) \?/);
  const pane = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-plan-pane.jsx'), 'utf8');
  assert.doesNotMatch(pane, /Codex has no plan document/);
});

// B22 A3 (2.31226.0 cccc2cf0a zh/Lh/Wh/Xh): the comment hint follows plan-mode gating; a saved comment is an
// accent-underlined mark[data-plan-comment-id] around a role=button span in the plan text; pre is skipped.
test('plan comments: hint gating, inline marks for saved comments, the Add to prompt footer', () => {
  const enabled = panel({ plan: [], planDocument: DOCUMENT, planCommentsEnabled: true });
  assert.match(enabled, /<span aria-hidden="true" data-cds="Icon"[^>]*>[^<]*<\/span><span>Select any text to leave a comment for DeepSeek<\/span>/);
  assert.match(enabled, /data-comments-enabled=""/);
  const disabled = panel({ plan: [], planDocument: DOCUMENT });
  assert.match(disabled, /You can comment on the plan in plan mode, or when DeepSeek asks you to approve it\./);
  assert.doesNotMatch(disabled, /Select any text to leave a comment/);
  const doc = '# Plan heading\n\nInspect the parser, then fix it.\n\n```js\nparser()\n```\n';
  I.planCommentsStore.add('s', { quote: 'the parser', text: 'Which parser?', startOffset: 'Plan heading\nInspect '.length, endOffset: 'Plan heading\nInspect the parser'.length });
  try {
    const markup = panel({ plan: [], planDocument: doc, planCommentsEnabled: true });
    assert.match(markup, /<mark data-plan-comment-id="[^"]+" class="rounded-\[2px\] text-inherit underline decoration-\[var\(--cds-fill-accent\)\] decoration-2 underline-offset-2 bg-\[hsl\(from_var\(--cds-fill-accent\)_h_s_l\/10%\)\] px-0"><span role="button" tabindex="0" class="text-inherit rounded-\[2px\] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus">the parser<\/span><\/mark>/);
    assert.match(markup, /<div data-plan-comment-skip="">/, 'code blocks sit in a skip wrapper');
    assert.match(markup, /data-plan-comments-footer=""[^>]*>.*Add to prompt/);
    assert.doesNotMatch(markup, /spp-comments"|data-plan-comment=""/, 'no comment card list');
  } finally { I.planCommentsStore.clear('s'); }
});

// Jh: while the history loads, Loading…; when it failed, the earlier-messages alert with Try again; else No plan yet.
test('plan pane states: loading, earlier history failed, empty', () => {
  const loading = panel({ plan: [], planDocument: null, planHistory: { loading: true } });
  assert.match(loading, /<div role="status" class="animate-placeholder-reveal h-full source-plan-state">/);
  assert.match(loading, /data-cds="Spinner"/);
  assert.match(text(loading), /Loading…/);
  assert.doesNotMatch(loading, /No plan yet/);
  const failed = panel({ plan: [], planDocument: null, planHistory: { failed: true, onRetry: () => {} } });
  assert.match(failed, /role="alert"/);
  assert.match(text(failed), /Couldn’t load earlier messages/);
  assert.match(text(failed), /If DeepSeek wrote a plan earlier in this session, it can’t be shown here\./);
  assert.match(text(failed), /Try again/);
  assert.match(text(panel({ plan: [], planDocument: null, planHistory: { loading: false, failed: false } })), /No plan yet/);
  assert.match(panel({ plan: TODOS, planDocument: null, planHistory: { loading: true } }), /source-plan-tasks/, 'todos win over the loading state');
});
