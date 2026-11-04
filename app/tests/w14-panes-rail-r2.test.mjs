// W14-code round 2, panes-rail lane: source checks for the renderer wiring that has no pure model of its own.
//  - fr2-04: shared-21 JD announces "Side navigation shown" / "Side navigation hidden" through shared-5 zw / Bw.
//  - fr2-20: c11959232 am reports `pageItem: { enabled: O, open: k, ...D }` (cc43287c9 _V labels); PageItem toggles the rail.
//  - pa2-09: cf580efe9 Hr's start-failed actions are only "Try again" (data-preview-start-retry); the error is submitted
//    to the chat (vi submitToChat), queued while a turn runs.
//  - r2-shared-07: the Preview pane's own ⌘R keydown and the page's previewShortcut "reload".
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(app, file), 'utf8');
let server, React, render, announcer;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  announcer = await server.ssrLoadModule('/src/source-live-announcer.jsx');
});
after(() => server?.close());

test('fr2-04: JD compares the shown state before and after the toggle and announces through zw', () => {
  const main = read('src/main.jsx');
  assert.match(main, /if \(after !== before && side === 0 && !NO_SIDEBAR\) announcePolite\(after \? t\("Side navigation shown"\) : t\("Side navigation hidden"\)\);/);
  assert.match(main, /\{side === 0 && <SourceLiveAnnouncer \/>\}/);
  assert.equal(typeof announcer.announcePolite, 'function');
  // Bw renders nothing on the server (portal into document.body needs a document).
  assert.equal(render(React.createElement(announcer.SourceLiveAnnouncer)), '');
  const src = read('src/source-live-announcer.jsx');
  assert.match(src, /createPortal\(<span role="status" aria-live="polite" className="sr-only">\{children\}<\/span>, document\.body\)/);
  assert.match(src, /const SHOW_DELAY_MS = 300; \/\/ Lw/);
  assert.match(src, /const CLEAR_DELAY_MS = 5300;/);
});

test('fr2-20: main.jsx reports the Session Rail page item and View › Show/Hide Session Rail toggles the rail', () => {
  const main = read('src/main.jsx');
  assert.match(main, /pageItem: \{ enabled: !!sessionRailToggle && !settings, open: !!sessionRailToggle\?\.onScreen, showLabel: t\("Show Session Rail"\), hideLabel: t\("Hide Session Rail"\), name: t\("Session Rail"\) \} \},/);
  assert.match(main, /else if \(e\.pane === "pageItem" && sessionRailToggle && !settings\) \{/);
  assert.match(main, /sessionRailToggle\.onToggle\(\{ detail: 0 \}\);/);
});

test('pa2-09: the start failure card has only Try again; the failure is queued to the agent while a turn runs', () => {
  const pane = read('src/source-preview-pane.jsx');
  assert.doesNotMatch(pane, /Ask \{assistant\} to fix it/);
  // W14-code r5 cleanup css5-settings-button-replica: the shared-frame CdsButton (cf580efe9 :1248-1255 g).
  assert.match(pane, /actions=\{<CdsButton data-preview-start-retry="" variant="secondary" busy=\{restartPending\}/);
  assert.match(read('src/main.jsx'), /\(text\) => sendFixedTurn\(text, \[\], \{ queueWhileRunning: true \}\) : null\}/);
});

test('r2-shared-07: ⌘R in the pane chrome reloads the preview before the menu’s CmdOrCtrl+R reloads the app', () => {
  const pane = read('src/source-preview-pane.jsx');
  assert.match(pane, /if \(event\.key\.toLowerCase\(\) === 'r'\) \{ event\.preventDefault\(\);event\.stopPropagation\(\);if \(!event\.repeat\) history\('reload'\);return; \}/);
  assert.match(pane, /else if \(action === "reload"\) history\("reload"\);/);
  assert.match(read('electron/main.cjs'), /if \(e\?\.kind === "reload"\) \{\n\s+if \(previewService\?\.reloadFocused\(\)\) return;/);
});
