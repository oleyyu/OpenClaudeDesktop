import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

// Round 3 cross-area UI: server-rendered (effects don't run).
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: source-session.jsx reaches the view-tabs graph (R2-topbar TT-07 attachment name), whose preload-helper calls
// document.createElement("link") when it is evaluated, so the stub has one.
globalThis.document ??= { body: { nodeType: 1, style: {} }, documentElement: { dataset: {}, style: {}, getAttribute: () => null }, createElement: () => ({}) };
let server, React, render, load;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());

test('Review dialog note: Codex sandbox, a read-only bridge review, else the session mode', async () => {
  const { reviewNote } = await load('/src/source-session-actions.jsx');
  assert.match(reviewNote({ engine: 'codex' }, 'auto'), /read-only sandbox without approval prompts/);
  assert.match(reviewNote({ engine: 'kimi', capabilities: { reviewReadOnly: 'noEdits' } }, 'bypass'), /read-only mode: it can read your files but can’t change them/);
  assert.match(reviewNote({ engine: 'zcode', capabilities: {} }, 'bypass'), /with this session’s permission mode \(Bypass permissions\)/);
});

test('Session status copies its id and info; per-token cores skip the usage-limits block', async () => {
  const { SessionStatusDialog, sessionInfoText } = await load('/src/source-session-actions.jsx');
  const props = { session: { id: 'th-1', name: 'Fix bug' }, model: 'GPT', effort: 'high', permission: 'auto', cwd: '/w', usage: null, connected: true, running: false, operation: null, account: null, readStatus: () => new Promise(() => {}), onClose() {}, inline: true };
  const html = render(React.createElement(SessionStatusDialog, { ...props, core: { name: 'Codex', version: '0.155.1', perTokenBilling: false }, appVersion: '0.2.130' }));
  assert.match(html, /data-copy-session-id=""/);
  assert.match(html, /Codex · 0\.155\.1/);
  assert.match(html, /Account usage limits/);
  const perToken = render(React.createElement(SessionStatusDialog, { ...props, core: { name: 'DeepSeek Harness', version: null, perTokenBilling: true } }));
  assert.doesNotMatch(perToken, /Account usage limits/);
  assert.match(sessionInfoText({ ...props, core: { name: 'Codex', version: '0.155.1' }, appVersion: '0.2.130' }), /Session ID: th-1\nSession: Fix bug\nCore: Codex 0\.155\.1\nOpenClaude Desktop: 0\.2\.130/);
});

test('Resume dialog: search, folder scope and a loading list', async () => {
  const { SourceResumeDialog, resumeActivityLabel } = await load('/src/source-resume-dialog.jsx');
  const html = render(React.createElement(SourceResumeDialog, { open: true, desktopCall: () => new Promise(() => {}), cwd: '/repo', onClose() {}, onOpened() {} }));
  assert.match(html, /Resume a session/);
  assert.match(html, /aria-label="Search sessions"/);
  assert.match(html, /This folder/);
  assert.match(html, /Loading sessions…/);
  const now = Date.UTC(2026, 9, 5, 12);
  assert.equal(resumeActivityLabel(now / 1000 - 120, now), '2m ago');
  assert.equal(resumeActivityLabel(now / 1000 - 3 * 3600, now), '3h ago');
});

test('Scheduled prompts and language-server errors render their own rows', async () => {
  const { scheduledLabel, SourceDiagnostics } = await load('/src/source-session.jsx');
  assert.match(scheduledLabel(Date.UTC(2026, 9, 5, 10, 5), Date.UTC(2026, 9, 5, 12)), /^Scheduled prompt · /);
  assert.equal(scheduledLabel(null), 'Scheduled prompt');
  const html = render(React.createElement(SourceDiagnostics, { cwd: '/w', diagnostics: [{ path: '/w/a.ts', line: 5, column: 3, message: 'Type error' }] }));
  assert.match(html, /1 error from the language server/);
  assert.match(html, /a\.ts:5:3/);
});

test('Codex terminal input lines: control keys read as keys', async () => {
  const { stdinLabel } = await load('/src/source-command.jsx');
  assert.equal(stdinLabel('y\n'), 'y⏎');
  assert.equal(stdinLabel('\u0003'), '⌃C');
  assert.equal(stdinLabel('\u001b[A'), '⎋[A');
});

test('a fork names its parent and links back when it is listed', async () => {
  const { SourceForkLineage } = await load('/src/source-fork-lineage.jsx');
  const linked = render(React.createElement(SourceForkLineage, { parentTitle: 'Refactor billing', onOpen() {} }));
  assert.match(linked, /<button[^>]*aria-label="Go to parent session Refactor billing"[^>]*>Forked from Refactor billing<\/button>/);
  assert.match(render(React.createElement(SourceForkLineage, {})), /<span>Forked from another session<\/span>/);
});
