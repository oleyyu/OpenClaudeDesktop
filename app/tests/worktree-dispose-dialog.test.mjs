import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// B37: SSR of shared-19 EK (checking footnote) and DK (changed-file list) with their source class strings.
let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-worktree-dispose-dialog.jsx');
});
after(() => server?.close());

// FT-11 (diffgit-10): since 2.42304.0 the line is shared-19 jY (generated/files-changes/worktree-checking.mjs):
// text-muted-as-secondary, a muted CDS ShimmerText that shimmers except while it only reserves its line.
test('EK reserves its line invisibly, then reveals with aria-busy and a shimmer while the check runs', () => {
  assert.equal(renderToStaticMarkup(React.createElement(M.WorktreeChecking, { hold: 'reserve' })),
    '<p class="text-footnote text-muted-as-secondary mt-md invisible"><span data-cds="ShimmerText" data-shimmering="false">Checking for uncommitted changes…</span></p>');
  const reveal = renderToStaticMarkup(React.createElement(M.WorktreeChecking, { hold: 'reveal' }));
  assert.match(reveal, /^<p class="text-footnote text-muted-as-secondary mt-md animate-placeholder-reveal" aria-busy="true"><span data-cds="ShimmerText" data-shimmering="true" class="[^"]+">Checking for uncommitted changes…<\/span><\/p>$/);
});

test('DK lists the first ten porcelain lines in a pre and counts the rest', () => {
  const lines = Array.from({ length: 12 }, (_, index) => ` M src/f${index}.js`);
  const html = renderToStaticMarkup(React.createElement(M.WorktreeChangeList, { changes: lines }));
  assert.match(html, /^<pre class="mt-md max-h-40 overflow-auto whitespace-pre-wrap rounded bg-alpha-1 p-sm text-code text-secondary" data-worktree-changes="">/);
  assert.ok(html.includes(lines.slice(0, 10).join('\n')));
  assert.ok(!html.includes('f10.js'));
  assert.match(html, /\n… and 2 more<\/pre>$/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(M.WorktreeChangeList, { changes: lines.slice(0, 3) })), /more/);
});

// FT-11: EY S guards the dirty confirm from the later of guardSince and openedAt (the queue entry's, main.jsx), and its
// "More sessions…" footnote is text-muted-as-secondary.
test('the dirty confirm counts a press through worktreeConfirmReady({guardSince, openedAt})', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-worktree-dispose-dialog.jsx'), 'utf8');
  assert.match(source, /export function SourceWorktreeDirtyDialog\(\{[^}]*guardSince = 0, openedAt = 0,/);
  assert.match(source, /onConfirm=\{\(\) => \{ if \(worktreeConfirmReady\(\{ guardSince, openedAt \}\)\) onConfirm\?\.\(\); \}\}/);
  assert.match(source, /<p className="mt-md text-footnote text-muted-as-secondary">\{t\("More sessions with uncommitted changes will follow\."\)\}<\/p>/);
  assert.doesNotMatch(source, /export function WorktreeChecking/, 'the line is the generated original, not a local copy');
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.match(main, /<SourceWorktreeDirtyDialog [^\n]*\n[^\n]*\n[^\n]*guardSince=\{worktreeQueueAdvanced\.current\} openedAt=\{shownWorktreeConfirm\.value\.openedAt\}/);
});
