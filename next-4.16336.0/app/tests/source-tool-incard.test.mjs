import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Classic tool-group rows are m8's RN{inGroup, inCard:true}
// (approval-current.js:54035-54063). The command body takes GO non-standalone
// (:6847-6862, Uoe :6874-6941) and Read/Edit take UO inCard (:6784-6837):
// no nested 'Shell' card, header outside the code box. Standalone rows keep
// the WO card / outlined UO card. Node-only SSR; no window, no Codex.
let server, SourceMessage;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceMessage } = await server.ssrLoadModule('/src/source-session.jsx'));
});
after(async () => { await server?.close(); });

const render = (item, extra = {}) => renderToStaticMarkup(React.createElement(SourceMessage, { item, sessionKey: 'incard-session', transcriptView: 'verbose', ...extra }));
const command = { id: 'cmd', type: 'commandExecution', status: 'completed', command: 'printf hello', cwd: '/w', commandActions: [], aggregatedOutput: 'hello\n' };
const read = { id: 'read', type: 'commandExecution', status: 'completed', command: 'cat app.ts', cwd: '/w', commandActions: [{ type: 'read', path: '/w/app.ts' }], aggregatedOutput: 'const a = 1;\n' };
const edit = { id: 'edit', type: 'fileChange', status: 'completed', changes: [{ path: '/w/app.ts', kind: { type: 'update' }, diff: '--- a/app.ts\n+++ b/app.ts\n@@ -1 +1 @@\n-old\n+new\n' }] };

test('grouped command row renders GO non-standalone: no Shell title, no WO card, data-in-card wrapper', () => {
  const html = render(command, { inToolGroup: true });
  assert.match(html, /<div class="src-cmd-card-outer" data-in-card="">/);
  assert.doesNotMatch(html, /src-cmd-title|src-cmd-card"|src-cmd-head/);
  assert.doesNotMatch(html, />Shell</);
  // UT '$' block with its compact Copy and the RO output group stay.
  assert.match(html, /class="src-cmd-prompt">\$\u00a0<\/span>/);
  assert.match(html, /class="src-cmd-copy" data-compact=""/);
  assert.match(html, /role="group" tabindex="0" aria-label="Tool output"/);
  // copyAction slot (:6882) is empty when a command exists.
  assert.doesNotMatch(html, /<\/div><button type="button" class="src-cmd-copy"(?! data-compact)/);
});

test('grouped command with no command but output fills the GO copyAction slot after the column', () => {
  const html = render({ ...command, command: '' }, { inToolGroup: true });
  assert.match(html, /data-in-card=""><div class="src-cmd-content">[\s\S]*<\/div><button type="button" class="src-cmd-copy" aria-label="Copy">/);
  assert.doesNotMatch(html, /src-cmd-prompt|>Shell</);
});

test('standalone command row still renders the WO card with the Shell title', () => {
  const html = render(command);
  assert.match(html, /<div class="src-cmd-card-outer"><div class="src-cmd-card"><div class="src-cmd-head"><span class="src-cmd-title">Shell<\/span>/);
  assert.doesNotMatch(html, /data-in-card/);
});

test('grouped Read and Edit put the path header before the code box, not inside an outlined card', () => {
  for (const item of [read, edit]) {
    const html = render(item, { inToolGroup: true });
    assert.match(html, /<div class="sft-outer" data-in-card=""><header class="sft-header" data-find-omitted="">.*?<\/header><div class="sft-code" role="group" aria-label="Code" tabindex="0" style="min-height:\d+px">/);
    assert.doesNotMatch(html, /sft-card/);
  }
  const standalone = render(read);
  assert.match(standalone, /<div class="sft-outer"><section class="sft-card"><header class="sft-header" data-find-omitted="">.*?<\/header><div class="sft-code"/);
  assert.doesNotMatch(standalone, /data-in-card/);
});

// approval-current.js:17288-17300: a standalone classic row is `${zv}
// cursor-pointer` (zv = c425fb3cf:143 Y); the CSS keys its geometry and the
// Ve/He/Ue colour states (:17099-17101) off .source-step-classic + data-state.
test('standalone classic rows carry source-step-classic and the local data-state the zv colour rules key on', async () => {
  const wrapper = html => /<div class="source-message source-step source-step-classic ?([^"]*)" data-transcript-item-id="[^"]+" data-cds="TurnStatusStep" data-state="([a-z]+)">/.exec(html);
  const cases = [
    [render(command), 'done'],
    [render({ ...command, id: 'busy', status: 'inProgress' }), 'busy'],
    [render({ ...command, id: 'blocked', status: 'inProgress' }, { pendingApprovalItemIds: new Set(['blocked']) }), 'blocked'],
    [render({ ...command, id: 'failed', status: 'failed' }), 'failed'],
    [render(read), 'done'],
  ];
  for (const [html, state] of cases) {
    const match = wrapper(html);
    assert.ok(match, `classic wrapper for ${state}`);
    assert.equal(match[2], state);
    assert.match(html, /<div role="button" tabindex="0" class="source-step-trigger" aria-expanded="(?:true|false)"/);
    assert.match(html, /class="source-step-caret"/);
  }
  assert.match(wrapper(render(read))[1], /\bsft-step\b/);
  // TurnStatusStep rows that are not tool rows keep the 26px step geometry.
  const compaction = render({ id: 'compact', type: 'contextCompaction' });
  assert.match(compaction, /data-cds="TurnStatusStep"/);
  assert.doesNotMatch(compaction, /source-step-classic/);
  // The zv rule is scoped away from .stg-row members (their own rules apply).
  const css = await (await import('node:fs/promises')).readFile(path.resolve(import.meta.dirname, '../src/source-tool-group.css'), 'utf8');
  assert.match(css, /\.source-step-classic:not\(\.stg-row \*\) > \.source-step-trigger \{ padding:0; margin:0; min-height:0; max-width:100%; gap:3px; border-radius:var\(--radius-sm,\.25rem\); \}/);
  assert.match(css, /transition:transform var\(--cds-dur-fast\)/);
});

test('DeepSeek rows: a bash description in tense, todo_write as the plan checklist, exit_plan_mode without a body', () => {
  const described = render({ ...command, id: 'described', command: 'ls -la', description: 'List files in current directory' });
  assert.match(described, /<span class="source-step-label ">Listed files in current directory<\/span>/);
  assert.doesNotMatch(described, /source-step-meta/);
  const todo = render({ id: 'todo', type: 'dynamicToolCall', namespace: null, tool: 'todo_write', status: 'completed', title: 'Update todo list',
    arguments: { todos: [{ content: 'Read the code', status: 'completed' }, { content: 'Fix it', status: 'in_progress' }, { content: 'Test', status: 'pending' }] },
    contentItems: [{ type: 'inputText', text: 'Updated todo list: 1 pending, 1 in progress, 1 completed.' }], success: true });
  assert.match(todo, />Updated todos<\/span>/);
  // KO -> ZO: the same source checklist as the Plan pane (B12).
  assert.match(todo, /<div class="sgt-body sgt-todos"><ul class="flex flex-col gap-xs text-body select-text py-xs source-plan-list source-plan-list-inline"><li data-state="completed" class="flex items-start gap-1 line-through decoration-1 text-secondary">/);
  assert.match(todo, /<li data-state="in_progress" class="flex items-start gap-1 text-primary">.*data-cds="Spinner".*<span class="sr-only select-none">in progress<\/span><\/span><div class="suc-text source-plan-step min-w-0 flex-1">Fix it<\/div>/);
  assert.match(todo, /<li data-state="pending" class="flex items-start gap-1 text-primary">.*<span class="sr-only select-none">not done<\/span><\/span><div class="suc-text source-plan-step min-w-0 flex-1">Test<\/div>/);
  assert.doesNotMatch(todo, /sgt-details|&quot;content&quot;|Updated todo list:/);
  const plan = render({ id: 'plan-call', type: 'dynamicToolCall', namespace: null, tool: 'exit_plan_mode', status: 'completed', arguments: { plan: '# Plan\n\n1. Do it' }, contentItems: [], success: true });
  assert.match(plan, />Proposed plan<\/span>/);
  assert.match(plan, /<div role="button" tabindex="-1" class="source-step-trigger" aria-disabled="true">/);
  assert.doesNotMatch(plan, /sgt-body|# Plan|source-step-caret/);
});

// R06 Uoe (approval-current.js:6874-6907): the DeepSeek bridge reports the shell; Codex does not.
test('a standalone command card is titled Bash / PowerShell from item.shell, Shell without it', () => {
  const bash = render({ ...command, shell: 'bash' });
  assert.match(bash, /<div class="src-cmd-head"><span class="src-cmd-title">Bash<\/span>/);
  assert.match(bash, /class="src-cmd-prompt">\$\u00a0<\/span>/);
  const pwsh = render({ ...command, shell: 'powershell', command: 'Get-ChildItem' });
  assert.match(pwsh, /<span class="src-cmd-title">PowerShell<\/span>/);
  assert.match(pwsh, /class="src-cmd-prompt">&gt;\u00a0<\/span>/);
  assert.match(render(command), /<span class="src-cmd-title">Shell<\/span>/);
  // A group row has no title at all (GO non-standalone), whatever the shell.
  assert.doesNotMatch(render({ ...command, shell: 'bash' }, { inToolGroup: true }), /src-cmd-title|>Bash</);
});

// R06 QO (approval-current.js:7398-7445): tool output images as 'View screenshot' thumbnails,
// hoisted under a standalone row (RN :17302) and in the body of a group row (FN :17324).
test('MCP and read_image output images render as View screenshot thumbnails, never [image]', () => {
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const url = `data:image/png;base64,${PNG}`;
  const mcp = { id: 'shot', type: 'mcpToolCall', server: 'shots', tool: 'take', status: 'completed', arguments: {}, result: { content: [{ type: 'text', text: 'Took it' }, { type: 'image', data: PNG, mimeType: 'image/png' }], structuredContent: null }, error: null };
  const thumb = `<button type="button" class="stimg-button" aria-label="View screenshot"><img src="${url}" alt="" class="stimg-img" draggable="false"/></button>`;
  const standalone = render(mcp);
  // Hoisted out of the collapsible body but inside the row root, after the body (RN :17302): the row
  // is still the only transcript item, so no sibling .source-message without an item id.
  assert.ok(standalone.startsWith('<div class="source-message source-step'), standalone.slice(0, 200));
  assert.ok(standalone.endsWith(`</div></div><div class="stimg" data-tool-images-for="shot">${thumb}</div></div>`), standalone.slice(-400));
  assert.equal(topLevel(standalone).length, 1);
  assert.doesNotMatch(standalone, /stimg-hoisted|source-message stimg/);
  assert.doesNotMatch(standalone, /\[image\]|iVBORw0KGgo[^"]*<\/span>/);
  assert.match(standalone, /Took it/);
  const grouped = render(mcp, { inToolGroup: true });
  assert.match(grouped, new RegExp(`<div class="stimg" data-tool-images-for="shot">${thumb.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</div></div></div>$`));
  assert.doesNotMatch(grouped, /stimg-hoisted/);
  const readImage = { id: 'ri', type: 'commandExecution', status: 'completed', command: 'Read image shot.png', cwd: '/w', commandActions: [{ type: 'read', path: '/w/shot.png' }],
    aggregatedOutput: 'image/png image, 1x1 px, 68 bytes', outputImages: [{ type: 'inputImage', imageUrl: url }] };
  const readHtml = render(readImage);
  assert.match(readHtml, />Read<\/span>/);
  assert.match(readHtml, /data-tool-images-for="ri"/);
  assert.doesNotMatch(readHtml, /\[image\]|sft-numbered-read/);
  assert.match(render(readImage, { inToolGroup: true }), /<div class="stimg" data-tool-images-for="ri">/);
});

// Top-level elements of static markup, the way use-transcript-feed-nav.js describeRows sees the
// children of .source-transcript-content: [{tag, attrs}] in order (React closes void tags with '/>').
function topLevel(html) {
  const out = []; let depth = 0;
  for (const [, close, tag, attrs] of html.matchAll(/<(\/)?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    if (close) { depth -= 1; continue; }
    if (depth === 0) out.push({ tag, attrs });
    if (!attrs.endsWith('/')) depth += 1;
  }
  assert.equal(depth, 0, 'balanced markup');
  return out;
}
const describeRows = (elements) => elements.map(({ attrs }) => {
  const id = /data-transcript-item-id="([^"]*)"/.exec(attrs)?.[1], group = /data-tool-group="([^"]*)"/.exec(attrs)?.[1];
  return /class="[^"]*\bsource-message\b/.test(attrs) && (id != null || group != null)
    ? { key: id ?? `group:${group}`, kind: /data-cds="UserMessage"/.test(attrs) ? 'user' : 'response', hidden: false, turnStart: /data-turn-start/.test(attrs) }
    : { kind: 'boundary' };
});

// R06 review: a standalone MCP row with an output image and the agent text after it are one
// assistant entry — one feed article (scroll-messages-current.js j9/A9), not split at the images.
test('a standalone MCP row with an image is followed by agent text in the same feed article', async () => {
  const { feedArticles } = await import('../src/transcript-feed-nav.mjs');
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const user = { id: 'u', type: 'userMessage', content: [{ type: 'text', text: 'Take a screenshot' }] };
  const mcp = { id: 'shot', type: 'mcpToolCall', server: 'shots', tool: 'take', status: 'completed', arguments: {}, result: { content: [{ type: 'image', data: PNG, mimeType: 'image/png' }], structuredContent: null }, error: null };
  const readImage = { id: 'ri', type: 'commandExecution', status: 'completed', command: 'Read image shot.png', cwd: '/w', commandActions: [{ type: 'read', path: '/w/shot.png' }],
    aggregatedOutput: 'image/png image, 1x1 px, 68 bytes', outputImages: [{ type: 'inputImage', imageUrl: `data:image/png;base64,${PNG}` }] };
  const text = { id: 'done', type: 'agentMessage', text: 'Here it is.' };
  for (const view of ['normal', 'verbose']) {
    const html = [user, mcp, readImage, text].map(item => render(item, { transcriptView: view, turnStart: item === user })).join('');
    const rows = describeRows(topLevel(html));
    assert.deepEqual(rows.map(row => row.key ?? row.kind), ['u', 'shot', 'ri', 'done'], view);
    assert.deepEqual(feedArticles(rows).map(article => [article.kind, article.rows]), [['user', ['u']], ['response', ['shot', 'ri', 'done']]], view);
  }
});
