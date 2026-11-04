// W14-code transcript-rest (plan-w14-code.md, lane "transcript-rest"): the Code transcript's remaining rows and copy,
// checked against the 3.6556.2 originals. SSR in middleware mode (effects don't run); the official chunks are only read
// as text (never executed).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
let server, React, render, load;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());
const noop = () => {};

test('TR-H1: the Code transcript error card is the original cb1a6e506 j (title bar, body, details), its buttons CDS Buttons', async () => {
  const { SourceTurnError } = await load('/src/source-turn-error.jsx');
  const error = { message: 'API Error: stream closed', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 429 } }, additionalDetails: null };
  const html = render(React.createElement(SourceTurnError, { error, turnId: 't1', official: true, onRetry: noop }));
  // cb1a6e506 j: the card root, the bg-alpha-1 title bar (px-lg = rows-cb1a6e506 E), the body.
  assert.match(html, /^<div class="contents" data-turn-error="card" data-turn-id="t1" data-error-category="server_rate_limit"><div tabindex="-1"|^<div class="contents" data-turn-error="card" data-turn-id="t1" data-error-category="server_rate_limit"><div class="epitaxy-card-outline-layer flex w-fit min-w-\[min\(480px,100%\)\] max-w-full flex-col overflow-clip rounded-card select-text hide-focus-ring focus-visible:shadow-focus focus-visible:outline-hidden">/);
  assert.match(html, /<div class="flex items-center gap-md bg-alpha-1 px-lg py-md contain-inline-size">/);
  assert.match(html, /<span class="min-w-0 grow text-body text-primary break-words">Server is temporarily limiting requests<\/span>/);
  assert.match(html, /<div class="flex flex-col gap-md px-lg pt-lg pb-md last:pb-lg empty:hidden contain-inline-size"><span class="text-body text-secondary whitespace-pre-line break-words">Too many requests right now\. Try again in a moment\.<\/span>/);
  // The official Try again: a CDS Button (data-cds=Button) with no size, primary.
  assert.match(html, /<button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*Try again/);
  assert.doesNotMatch(html, /source-settings-button|ste-card|ste-headline/);
  // pK `nt`: no Try again on the card → hintWithoutRetry; no composer either → hintWithoutComposer.
  const later = render(React.createElement(SourceTurnError, { error, turnId: 't1', official: true }));
  assert.match(later, /Too many requests right now\. Wait a moment, then send a message to try again\./);
  const archived = render(React.createElement(SourceTurnError, { error, turnId: 't1', official: true, composer: false }));
  assert.match(archived, /Too many requests right now\. This usually clears in a moment\./);
  // The host card (Chat) is unchanged. W14-code r4 (E95): the official card offers pg's Try again / Compact and Dismiss
  // only — no host Sign in, View usage, Open settings, Switch model, Rewind, Go back or auto-continue.
  const host = render(React.createElement(SourceTurnError, { error, turnId: 't1', onRetry: noop }));
  assert.match(host, /class="source-message ste-card"/);
  const rich = render(React.createElement(SourceTurnError, { error: { message: 'limit', codexErrorInfo: 'usageLimitExceeded' }, turnId: 't1', official: true,
    onRetry: noop, onViewUsage: noop, onSwitchModel: noop, onRewind: noop, onGoBack: async () => 'x', onSignIn: noop, onOpenSettings: noop,
    autoContinue: { armed: false, onChange: noop }, limitReset: { resetsAtMs: Date.now() + 6e4 } }));
  assert.doesNotMatch(rich, />View usage<|>Switch model<|>Rewind<|>Go back<|>Sign in|>Open settings<|Auto-continue|edit your message/);
  // The originals the card is sliced from.
  const chunk = official('cb1a6e506-CGO9mb0Y.js');
  for (const text of ['epitaxy-card-outline-layer flex w-fit min-w-[min(480px,100%)] max-w-full flex-col overflow-clip rounded-card select-text hide-focus-ring focus-visible:shadow-focus focus-visible:outline-hidden',
    'flex items-center gap-md bg-alpha-1 ${', 'min-w-0 grow text-body text-primary break-words'])
    assert.ok(chunk.includes(text), text);
  const main = read('src/main.jsx');
  // W14-code r4 cowork-error-card (E95): Code and Cowork (3.6556.2 c10f0af0c's tail error is c3e34355f Hn → cb1a6e506 j).
  assert.equal((main.match(/official=\{mode !== "chat" \/\* W14-code transcript-rest TR-H1: cb1a6e506 j; r4 cowork-error-card \(E95\): Cowork too \(c10f0af0c → c3e34355f Hn\) \*\/\} composer=\{!session\?\.archived\}/g) || []).length, 2);
  assert.ok(official('c10f0af0c-pZivcMVu.js').includes('import{t as kk}from"./cb1a6e506-CGO9mb0Y.js"') || official('c10f0af0c-pZivcMVu.js').includes('from"./cb1a6e506-CGO9mb0Y.js"'));
});

