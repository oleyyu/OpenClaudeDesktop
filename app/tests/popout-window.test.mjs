import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// B02: pane popout window size (cd377abb5 Q/Vn: 900x700, min 400x320), its pin state seeded at load (shared-18 mx/hx),
// and the add-to-prompt relay a popped-out Changes/Plan pane needs (c44d00c7f ma/ha/ga keep comments with the session).
const app = path.resolve(import.meta.dirname, '..');
const electron = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
const popout = main.slice(main.indexOf('function PopoutApp('), main.indexOf('const popoutQuery'));
const actions = new Set(JSON.parse(electron.match(/const POPOUT_ACTIONS = new Set\((\[[^\]]*\])\)/)[1]));

test('pane windows open at 900x700 with a 400x320 minimum; restored frames keep that minimum', () => {
  assert.match(electron, /POPOUT_DEFAULT_SIZE = \{ width: 900, height: 700 \}, POPOUT_MIN_SIZE = \{ width: 400, height: 320 \}/);
  const open = electron.slice(electron.indexOf('async function openPopout('), electron.indexOf('function savePopoutsForRelaunch'));
  // B27: the side chat window keeps cd377abb5 _i's 280x160 minimum; every other pane window 400x320.
  assert.match(open, /const minimum = pane === "side-chat" \? SIDE_CHAT_MIN_SIZE : POPOUT_MIN_SIZE;/);
  assert.match(electron, /SIDE_CHAT_MIN_SIZE = \{ width: 280, height: 160 \}/);
  assert.match(open, /minWidth: minimum\.width,\s*minHeight: minimum\.height/);
  assert.match(open, /Math\.max\(minimum\.width, Math\.round\(restored\.width\)\)/);
  assert.match(open, /: \{ \.\.\.POPOUT_DEFAULT_SIZE \}/);
  assert.doesNotMatch(open, /width: 640, height: 640/);
});

test('a pane window reads its own pin state and appearance, and relays Add to prompt', () => {
  for (const action of ['popout-state', 'popout-add-to-prompt', 'popout-always-on-top']) assert.ok(actions.has(action), action);
  const state = electron.slice(electron.indexOf('case "popout-state":'), electron.indexOf('case "popout-add-to-prompt":'));
  assert.match(state, /alwaysOnTop: entry\.alwaysOnTop === true, config: sharedConfig\(\)/);
  const relay = electron.slice(electron.indexOf('case "popout-add-to-prompt":'), electron.indexOf('case "popout-always-on-top":'));
  // Only a pane window (a PopoutApp window or, B27, an App-hosted pane window), for its own session.
  assert.match(relay, /const entry = popoutForSender\(e\.sender\);\n\s+if \(!entry \|\| entry\.window\.isDestroyed\(\)\) throw/, 'only a pane window, for its own session');
  assert.match(relay, /windowRegistry\.dispatch\(\{ kind: "add-to-prompt", sessionId: entry\.sessionId, text/);
  assert.match(popout, /if \(typeof state\.alwaysOnTop === "boolean"\) setAlwaysOnTop\(state\.alwaysOnTop\)/);
  assert.match(popout, /window\.addEventListener\(ADD_TO_PROMPT_EVENT, relay\)/);
  assert.match(popout, /call\("popout-add-to-prompt", \{ text \}\)/);
  // The main window queues it for the session and opens that session when no side shows it (R4f-popout F3: through the
  // 2.42304.0 relay in popout-r4f-relay.mjs, tests/popout-r4f-relay.test.mjs).
  assert.match(main, /e\.kind === "add-to-prompt" && side === 0[\s\S]{0,200}relayPanePrompt\(e, \{ shown: \(id\) => splitStore\.isShown\(id\) \|\| currentRef\.current === id[\s\S]{0,120}write: \(id, text, meta\) => promptAdditions\.queue\(id, text, meta\), open: \(id\) => openInFocusedSide\(id\)/);
  // B27: a popped-out Terminal's selection keeps its tab label (meta).
  assert.match(main, /promptAdditions\.takeEntries\(sessionId\)\.map\(\(entry\) => makeSnippet\(entry\.text, entry\.meta\)\)/);
});
