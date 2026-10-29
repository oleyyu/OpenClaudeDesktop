import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

// w10-trans-settings-storage-actions (merged into w10-shell-settings, E44): 3.6556.2 c71860c77-BH7EuJ1o renders one
// Code storage action. `k = ji()` with `ki = !1` (gate __gb__1522555277) picks "Clean up inactive sessions…" (shown with
// any session); the host's own "Remove unused worktrees" button is gone. Official text is read, never executed.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, dir: 'ltr', getAttribute: () => null, hasAttribute: () => false },
  createElement: () => ({ relList: { supports: () => false } }) };
const v3 = name => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
let server, React, render, pages;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  pages = await server.ssrLoadModule('/src/source-settings-pages.jsx');
});
// V3-w11-sweep-shell-b: a module of the settings graph may still be running a dynamic import() (source-home-adapters.jsx
// no longer preloads under SSR, but the graph is shared): close only once the SSR runner has settled (shared helper).
after(() => closeWhenSettled(server));

test('official: one Code storage action, Remove unused worktrees only behind the off gate', () => {
  const official = v3('c71860c77-BH7EuJ1o.js');
  assert.ok(official.includes('var ki=!1,Ai="__gb__1522555277";function ji(){return ne(Ai),ki}'));
  assert.ok(official.includes('j=o&&((k?A?.worktrees.count:A?.sessionCount)??0)>0'));
  assert.ok(official.includes('children:k?r(Y,{defaultMessage:"Remove unused worktrees",id:"5FT1qPNbOQ"}):r(Y,{defaultMessage:"Clean up inactive sessions\\u2026",id:"VLudnwB37M"})'));
});

test('host: storageCodeActions renders a single secondary sm Clean up inactive sessions… button', () => {
  const html = render(pages.storageCodeActions({ sessionCount: 3, worktreeCount: 5 }, () => {}));
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(html, /data-variant="secondary"/);
  assert.ok(html.includes('Clean up inactive sessions…'));
  assert.equal(html.includes('Remove unused worktrees'), false);
  assert.equal(pages.storageCodeActions({ sessionCount: 0, worktreeCount: 5 }, () => {}), null, 'worktrees alone: no action');
  assert.equal(pages.storageCodeActions(undefined, () => {}), null);
  assert.equal(pages.storageCodeActions({ sessionCount: 2 }, undefined), null, 'no handler: no action (j = o && …)');
});

test('host: the Code session details hold exactly one action; no worktrees-clean entry point is left in the page', () => {
  const value = { computedAt: Date.now(), bytes: 10, incomplete: false, areas: [
    { id: 'code', label: 'Code sessions and worktrees', bytes: 10, sessionCount: 2, worktreeCount: 4, kinds: [] }] };
  // The Details disclosure mounts its panel only when opened (SourceDisclosure present=false), so SSR shows the trigger;
  // the action itself is the helper's single button, placed under the kinds by StorageRows.
  const html = render(React.createElement(pages.StorageRows, { value, codeActions: pages.storageCodeActions(value.areas[0], () => {}) }));
  assert.deepEqual([...html.matchAll(/aria-label="([^"]+ details)"/g)].map(match => match[1]), ['Code session details']);
  assert.equal(html.includes('Remove unused worktrees'), false);
  const text = fs.readFileSync(path.join(app, 'src/source-settings-pages.jsx'), 'utf8');
  assert.ok(text.includes("const codeActions = storageCodeActions(value?.areas?.find(item => item?.id === 'code'), () => setCleanup(true));"));
  assert.ok(text.includes('{codeActions && <div className="ss-storage-actions">{codeActions}</div>}'));
  for (const gone of ["'worktrees-clean'", "t('Remove unused worktrees')", 'removeUnused', 'ss-storage-cleaned']) assert.equal(text.includes(gone), false, gone);
});
