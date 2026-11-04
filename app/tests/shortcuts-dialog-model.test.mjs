import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const require_dir = (dir) => readdirSync(dir);
import path from 'node:path';
import { SHORTCUTS_DIALOG_KEYS, globalShortcutCommand, searchShortcutAction, shortcutsDialogSections, presetChordTarget, presetShortcut, PRESET_CHORD_DIGITS } from '../src/shortcuts-dialog-model.mjs';
import { archiveChord, isMetaJumpChord, jumpDigit } from '../src/sidebar-jump-model.mjs';
import { chinShortcutCommand, modeMenuDigit } from '../src/chin-shortcuts.mjs';
import { paneShortcutKind } from '../src/pane-shortcuts.mjs';
import { createDoubleEscape, enterAction, escapeAction, submitPriority } from '../src/composer-keys-model.mjs';
import { matchSketchCommand } from '../src/generated/code-editor/preview-sketch-keys.mjs';
import { previewDOMTabKey } from '../electron/preview-tab-shortcuts.mjs';
import { shortcutCaps, shortcutSequence } from '../src/shortcut-model.mjs';
// W14-code r4 gen-final-4: session-cycle-model's test-only sessionCycleDelta is deleted; this oracle is am's macOS form
// without the ⌥↑↓ chord (Ctrl+Tab / Ctrl+Shift+Tab, ⌘⇧] / ⌘⇧[ by key code), the chords the dialog lists; the cycler runs
// the generated am (session-cycle-chords.mjs sessionCycleChord), pinned in session-cycle-model.test.mjs.
const sessionCycleDelta = (event) => {
  if (!event || event.altKey) return 0;
  if (event.key === 'Tab' && event.ctrlKey && !event.metaKey) return event.shiftKey ? -1 : 1;
  if (event.metaKey && event.shiftKey && !event.ctrlKey) return event.code === 'BracketRight' ? 1 : event.code === 'BracketLeft' ? -1 : 0;
  return 0;
};
import { attachSelectionChord } from '../src/transcript-context-menu-model.mjs';
import { isTerminalToggle } from '../src/terminal-pane-model.mjs';
import { splitShortcut } from '../src/split-view-model.mjs';
import { regionDirection } from '../src/focus-region-model.mjs';
import { isGoToFileShortcut } from '../src/diff-go-to-file-model.mjs';
import { diffChangeCommand } from '../src/diff-change-nav-model.mjs';
import { prCommentMatch } from '../src/diff-pr-comment-nav-model.mjs';
import { INITIAL_PROMPT_HISTORY, isHistorySearchKey, promptHistoryStep } from '../src/prompt-history-model.mjs';
import { findShortcut } from '../src/transcript-find-model.mjs';

// shared-21-D098Wd--.js:14946-15420 zR, filtered to the chords this app binds.
const CODES = { '-': 'Minus', '.': 'Period', up: 'ArrowUp', down: 'ArrowDown', ',': 'Comma', '/': 'Slash', '\\': 'Backslash', '[': 'BracketLeft', ']': 'BracketRight', '`': 'Backquote', esc: 'Escape', tab: 'Tab', backspace: 'Backspace', enter: 'Enter', f3: 'F3', f5: 'F5', f7: 'F7', f9: 'F9' };
// A macOS keydown for one key spec ("cmd+shift+d" -> metaKey, shiftKey, key "D", code "KeyD").
function keydown(spec) {
  if (spec === 'esc esc') return keydown('esc');
  const parts = spec.split('+'), key = parts.at(-1), mods = new Set(parts.slice(0, -1));
  if (key === 'click') return { click: true, metaKey: mods.has('cmd'), shiftKey: mods.has('shift'), altKey: mods.has('alt'), ctrlKey: mods.has('ctrl') };
  const shiftKey = mods.has('shift');
  const letter = /^[a-z]$/.test(key), digit = /^\d$/.test(key);
  return {
    metaKey: mods.has('cmd'), shiftKey, altKey: mods.has('alt'), ctrlKey: mods.has('ctrl'), isComposing: false, repeat: false,
    key: /^f\d+$/.test(key) ? key.toUpperCase() : key === 'esc' ? 'Escape' : key === 'tab' ? 'Tab' : key === 'backspace' ? 'Backspace' : key === 'enter' ? 'Enter' : key === 'up' ? 'ArrowUp' : key === 'down' ? 'ArrowDown' : letter ? (shiftKey ? key.toUpperCase() : key) : key,
    code: letter ? `Key${key.toUpperCase()}` : digit ? `Digit${key}` : CODES[key],
  };
}
// "1…9" names the nine digit keys (after any modifiers: "cmd+1…9").
const expand = (spec) => spec.endsWith('1…9') ? Array.from({ length: 9 }, (_, index) => spec.replace('1…9', String(index + 1))) : [spec];
// What each handler does with the event; the dialog row's command must be one of them.
const appMenu = readFileSync(path.join(import.meta.dirname, '../electron/app-menu.cjs'), 'utf8');
const previewPane = readFileSync(path.join(import.meta.dirname, '../src/source-preview-pane.jsx'), 'utf8');
const sidebar = readFileSync(path.join(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
// Rows whose chord another surface owns in its own context: the composer's Esc Esc and ⌘⏎, and the Preview pane's
// keydown (source-preview-pane.jsx onKeyDown: the tab strip chords, then matchSketchCommand's page tools).
const environmentMenu = readFileSync(path.join(import.meta.dirname, '../src/source-environment-menu.jsx'), 'utf8');
function boundIn(command, event) {
  // W14-code r3 r3-shared-02: the start page picker's capture keydown (source-environment-menu.jsx useEnvironmentChords,
  // cc43287c9 c8) takes shared-46 qL's selectPreset1…9 / newPreset (⌘⌥ on a Mac, ⌥ elsewhere).
  if (command === 'select-environment' || command === 'new-environment') {
    const target = presetChordTarget(event, !!event.metaKey);
    return (command === 'new-environment' ? target === 'new' : Number.isInteger(target))
      && environmentMenu.includes("const target = presetChordTarget(event, mac);") && environmentMenu.includes("view.addEventListener('keydown', keydown, true);");
  }
  if (command === 'rewind') {
    let at = 0;
    const escapes = createDoubleEscape({ now: () => (at += 100) });
    return escapes.press(event) === false && escapes.press(event) === true && /doubleEscape\.current\.press\(/.test(composer) && /if \(rewind\) \{ event\.preventDefault\(\); state\.onRewind\(\); \}/.test(composer);
  }
  // main.jsx's ⌘; listener toggles the side chat (Ce "cmd+;"), Meta only.
  if (command === 'side-chat') return event.metaKey && !event.shiftKey && !event.altKey && !event.ctrlKey && event.key === ';'
    && main.includes('if (event.repeat || event.isComposing || !event.metaKey || event.shiftKey || event.altKey || event.ctrlKey || event.key !== ";") return;');
  if (command === 'queue') return submitPriority(enterAction({ event }), true) === 'later';
  // V3-w12b-settings-dialogs: c518a31cc Ae's rows are the transcript find bar's keydown (source-find-bar.jsx findShortcut,
  // ⌘F opens; ⌘G / ⇧⌘G / F3 / ⇧F3 step while it is open); He's Qe rows are SourceComposer's prompt history (↑ / ↓) and
  // its ⌃R history search.
  if (command === 'find') return findShortcut(event, { open: false, mac: true }) === 'open' && /findShortcut\(event, \{ open, mac: isMac\(\) \}\)/.test(findBar);
  if (command === 'find-next' || command === 'find-previous') return findShortcut(event, { open: true, mac: true }) === (command === 'find-next' ? 'next' : 'prev');
  if (command === 'reuse-prompt') {
    const down = event.key === 'ArrowDown';
    const step = promptHistoryStep({ ...INITIAL_PROMPT_HISTORY, resetKey: 's', index: down ? 0 : null, length: 2 },
      { resetKey: 's', key: event.key, atStart: true, atEnd: true, text: down ? 'a' : '', prompts: ['a', 'b'] });
    return ['recall', 'restore'].includes(step.action) && /const step = promptHistoryStep\(history\.current, \{/.test(composer);
  }
  if (command === 'search-prompts') return isHistorySearchKey(event) && /isHistorySearchKey\(\{ key: event\.key/.test(composer);
  // B34: the Changes pane's own keydown on its pane root (source-diff.jsx, diffChangeCommand: F7 / ⇧F7, ⌥F5 / ⇧⌥F5).
  if (command === 'next-change' || command === 'previous-change') return diffChangeCommand(event) === (command === 'next-change' ? 'next' : 'prev')
    && /const command = diffChangeCommand\(event, \{ linux \}\);/.test(sourceDiff);
  // W14-code sh7-01: the Changes pane's PR comment keydown (source-diff-comments.jsx prCommentMatch: shared-46 YL ⌥F9 / ⇧⌥F9).
  if (command === 'next-pr-comment' || command === 'previous-pr-comment') return prCommentMatch(event, { mac: true, linux: false }) === (command === 'next-pr-comment' ? 1 : -1)
    && diffComments.includes('const delta = prCommentMatch(event, {');
  if (command === 'send-stay') return submitPriority(enterAction({ event }), false, { stayOnDraft: true }) === 'stay' && /stayOnDraft=\{!current\}/.test(main);
  if (command === 'select-element') return matchSketchCommand(event, { isClaudeApp: true, commands: ['toggleSketchMode', 'toggleSelectionMode'] }) === 'toggleSelectionMode'
    && /pageTool === 'toggleSketchMode'\) void toggleSketch\(\); else togglePick\(\);/.test(previewPane);
  const tab = previewDOMTabKey(event, true);
  if (command === 'preview-reopen-tab') return tab?.action === 'reopen-tab';
  if (command === 'preview-jump-tab') return tab?.action === 'select-tab';
  if (command === 'preview-next-tab') return tab?.action === 'cycle-tab' && tab.direction === 1;
  if (command === 'preview-previous-tab') return tab?.action === 'cycle-tab' && tab.direction === -1;
  const inline = (letter, call) => event.metaKey && !event.shiftKey && !event.altKey && event.key === letter
    && previewPane.includes(`if (event.key.toLowerCase() === '${letter}') { event.preventDefault();event.stopPropagation();if (!event.repeat) ${call};return; }`);
  if (command === 'preview-new-tab') return inline('t', 'createTab()');
  // W14-code r2-shared-07: the pane's keydown reloads on ⌘R (Ve cmd+r) and, off a Mac, F5 (Ve "f5").
  if (command === 'preview-reload') return event.key === 'F5' ? !event.metaKey && previewPane.includes("if (event.key === 'F5' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !/Mac/.test(navigator.platform)) { event.preventDefault();event.stopPropagation();if (!event.repeat) history('reload');return; }")
    : inline('r', "history('reload')");
  if (command === 'preview-address') return inline('l', 'focusAddress()');
  return undefined;
}
const composer = readFileSync(path.join(import.meta.dirname, '../src/source-composer.jsx'), 'utf8');
const findBar = readFileSync(path.join(import.meta.dirname, '../src/source-find-bar.jsx'), 'utf8');
const sourceDiff = readFileSync(path.join(import.meta.dirname, '../src/source-diff.jsx'), 'utf8');
const diffComments = readFileSync(path.join(import.meta.dirname, '../src/source-diff-comments.jsx'), 'utf8');
const main = readFileSync(path.join(import.meta.dirname, '../src/main.jsx'), 'utf8');
function bound(event) {
  // A sidebar row's click handler: ⌥-click opens the session in split view (source-sidebar.jsx onOpenSplit).
  if (event.click) return event.altKey && /if \(event\.altKey\) \{[\s\S]{0,200}windowActions\.onOpenSplit\(session\)/.test(sidebar) ? 'split-open' : null;
  // The Preview pane's keydown: ⇧⌘X toggles Annotate (source-preview-pane.jsx toggleSketch, SKETCH_SHORTCUT), matched
  // either inline or through the reference's own command table (preview-sketch-keys.mjs toggleSketchMode: cmd+shift+x, KeyX).
  const sketchKeys = /event\.code === "KeyX"[^\n]*toggleSketch\(\)/.test(previewPane)
    || (/matchSketchCommand\(event, \{[^\n]*'toggleSketchMode'/.test(previewPane) && /pageTool === 'toggleSketchMode'\) void toggleSketch\(\)/.test(previewPane));
  if (event.code === 'KeyX' && event.shiftKey && event.metaKey && !event.altKey && previewPane.includes('const SKETCH_SHORTCUT = "cmd+shift+x"') && sketchKeys) return 'annotate';
  // source-split-view.jsx's window keydown takes the split chords before main.jsx's handler.
  const split = splitShortcut(event);
  if (split) return `split-${split}`;
  const global = globalShortcutCommand(event);
  if (global) return global;
  // use-focus-regions.js (mounted by main.jsx useFocusRegionNavigation): F6 / ⇧F6 cycle the page areas.
  const region = regionDirection(event);
  if (region) return region === 'forward' ? 'focus-next-region' : 'focus-previous-region';
  // main.jsx's handler: toggleTerminal ⌃` / ⌘J (terminal-pane-model.mjs).
  if (isTerminalToggle(event)) return 'terminal';
  // File › New Session with Current Settings is the app menu's CmdOrCtrl+Shift+N accelerator.
  if (event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey && event.code === 'KeyN' && /label: t\("New Session with Current Settings"\), accelerator: "CmdOrCtrl\+Shift\+N"/.test(appMenu)) return 'new-session-current';
  // Km's keydown (session-cycle-model.mjs) runs in the same main.jsx handler.
  const cycle = sessionCycleDelta(event);
  if (cycle) return cycle > 0 ? 'next-session' : 'previous-session';
  const pane = paneShortcutKind(event);
  if (pane) return pane;
  // The Changes pane's keydown: ⌘P opens Go to file (source-diff-pane, diff-go-to-file-model.mjs).
  if (isGoToFileShortcut(event)) return 'go-to-file';
  // SourceSidebar's window keydown: bL ⌘1–9 jump and rg ⌘⇧⌫ archive (sidebar-jump-model.mjs).
  if (isMetaJumpChord(event) && jumpDigit(event)) return 'jump-session';
  if (archiveChord(event)) return 'archive-session';
  const chin = chinShortcutCommand(event);
  if (chin) return chin;
  // The transcript's own keydown: ⇧⌘L attaches the transcript selection (source-transcript.jsx).
  if (attachSelectionChord(event)) return 'attach-selection';
  // The composer editor's Enter: ⌘⌥⏎ sends the draft into a fork (enterAction submit-fork).
  if (event.key === 'Enter' && enterAction({ event }) === 'submit-fork') return 'send-fork';
  // The composer editor's keydown hands Escape to escapeAction (source-composer.jsx); a running turn stops.
  if (event.key === 'Escape' && escapeAction({ event, running: true }) === 'stop') return 'stop';
  // SourceMenu picks the item whose data-number-key is the digit; the Mode menu claims Digit1-9 (modeMenuDigit).
  const digit = modeMenuDigit(event);
  if (digit >= 1 && event.key === String(digit)) return 'menu-item';
  return null;
}

test('Ce sections, General / Panes / Composer, with the original labels in Ce order (split rows inside General)', () => {
  // W14-code r5 gates-r5-01: c518a31cc He `m` (ccd_palette_session_actions) and `p` (ccd_prompt_jump) are not in Uon, so the
  // host default is the gate-off list: `!m &&` ⌘⇧⌫ Archive session after Jump to session, no ⌥⌘ block, no prompt jumps.
  const gateOn = shortcutsDialogSections({ fastMode: true, sideChat: true, route: 'code', mac: true, sessionActions: true, promptJump: true });
  assert.deepEqual(gateOn[0].rows.map((row) => row.label).slice(gateOn[0].rows.findIndex((row) => row.command === 'split-close')),
    ['Close split view', 'Pin / unpin session', 'Rename session', 'Archive session', 'Mark session as read/unread', 'Open session PR', 'Fork session', 'Jump to previous prompt', 'Jump to next prompt', 'Transcript view',
      'Find', 'Find next', 'Find previous', 'Stop DeepSeek’s response', 'Rewind the session to an earlier message']);
  assert.ok(!gateOn[0].rows.some((row) => row.keys.includes('cmd+shift+backspace')), 'He lists ⌘⇧⌫ only under !m');
  const sections = shortcutsDialogSections({ fastMode: true, sideChat: true, route: 'code', mac: true });
  assert.deepEqual(sections.map((section) => section.title), ['General', 'Panes', 'Composer']);
  assert.deepEqual(sections.map((section) => section.rows.map((row) => row.label)), [
    ['Search or start a session', 'Search', 'Toggle sidebar', 'Keyboard shortcuts', 'Settings', 'Focus next page area', 'Focus previous page area', 'New session', 'New session with current settings', 'Close tab, pane, or session', 'Reopen closed session',
      'Next session', 'Previous session', 'Jump to session', 'Archive session', 'Open session in split view', 'New session on the right', 'New session below', 'Focus next split view', 'Focus previous split view', 'Close split view',
      'Transcript view', 'Find', 'Find next', 'Find previous', 'Stop DeepSeek’s response', 'Rewind the session to an earlier message'],
    // W14-code sh7-01: c518a31cc He `o && w && E.length > 0` — the two PR comment rows on a Mac (o: __gb__3741111118 off).
    ['Toggle changes', 'Toggle file list in changes or files', 'Next change in changes', 'Previous change in changes', 'Next unresolved comment', 'Previous unresolved comment', 'Go to file in changes or files', 'Toggle preview', 'Select element in preview', 'Annotate page in preview',
      // W14-code r2-shared-07/08: 3.6556.2 c518a31cc He `V = w && k && …` (Browser rows, k off: D36) is not listed; `me = w &&
      // t(Ve, { browser: k })` "Reload page in preview" comes before Toggle Files.
      'Reload page in preview',
      'Toggle Files', 'Attach selection as context', 'Toggle terminal', 'Close pane', 'Expand or collapse pane', 'Toggle side chat'],
    ['Open mode menu', 'Open model menu', 'Open effort selector', 'Toggle fast mode', 'Select menu item', 'Add files or photos', 'Reuse an earlier prompt', 'Search earlier prompts',
      'Queue for later (while DeepSeek is working)',
      'Send and stay on the new session page', 'Send in a forked session (local sessions)'],
  ]);
  // Ce shows Toggle fast mode only when a model offers it.
  assert.deepEqual(shortcutsDialogSections().at(-1).rows.map((row) => row.command), ['mode', 'model', 'effort', 'menu-item', 'file-upload', 'queue', 'send-stay', 'send-fork']);
  // Toggle side chat (⌘;) only where the core serves side questions; Rewind only where the core can revert.
  assert.ok(!shortcutsDialogSections().flatMap((section) => section.rows).some((row) => row.command === 'side-chat'));
  assert.equal(shortcutsDialogSections({ rewind: false })[0].rows.at(-1).command, 'stop');
});

test('every listed chord is one the app binds: the main handler, pane, chin, composer Escape or menu digits', () => {
  for (const section of [...shortcutsDialogSections({ fastMode: true, sideChat: true, route: 'code', mac: true, presets: true }), ...shortcutsDialogSections({ route: 'code', mac: false, presets: true }),
    ...shortcutsDialogSections({ route: 'code', mac: true, sessionActions: true, promptJump: true })])
    for (const row of section.rows)
      for (const spec of row.keys)
        for (const key of expand(spec)) {
          const own = boundIn(row.command, keydown(spec === 'esc esc' ? spec : key));
          if (own !== undefined) assert.equal(own, true, `${section.title} / ${row.label}: ${key}`);
          else assert.equal(bound(keydown(key)), row.command, `${section.title} / ${row.label}: ${key}`);
        }
});

test('caps follow the CDS Shortcut io order (⇧⌘D) and ⌘/ is the shortcuts_modal binding', () => {
  const caps = (spec) => shortcutSequence(spec).flatMap((chord) => shortcutCaps(chord, true)).map((cap) => cap.label).join('');
  const all = Object.fromEntries(shortcutsDialogSections({ fastMode: true, sideChat: true, route: 'code', mac: true }).flatMap((section) => section.rows).map((row) => [row.command, row.keys.map(caps)]));
  assert.deepEqual(all, {
    search: ['⌘K'], 'search-palette': ['⇧⌘K'], 'toggle-sidebar': ['⌘B'], shortcuts: ['⌘/'], settings: ['⌘,'], 'focus-next-region': ['F6'], 'focus-previous-region': ['⇧F6'], 'new-session': ['⌘N'], 'new-session-current': ['⇧⌘N'],
    'close-session': ['⌘W'], 'reopen-closed': ['⇧⌘T'],
    'next-session': ['⇧⌘]', '⌃⇥'], 'previous-session': ['⇧⌘[', '⌃⇧⇥'], 'jump-session': ['⌘1…9'], 'archive-session': ['⇧⌘⌫'], 'transcript-view': ['⌃O'], stop: ['Esc'],
    find: ['⌘F'], 'find-next': ['⌘G'], 'find-previous': ['⇧⌘G'], 'reuse-prompt': ['↑', '↓'], 'search-prompts': ['⌃R'],
    rewind: ['EscEsc'],
    changes: ['⇧⌘D'], 'file-list': ['⇧⌘Y'], 'next-change': ['⌥F5', 'F7'], 'previous-change': ['⌥⇧F5', '⇧F7'], 'next-pr-comment': ['⌥F9'], 'previous-pr-comment': ['⌥⇧F9'], 'go-to-file': ['⌘P'], files: ['⇧⌘F'], preview: ['⇧⌘P'], 'select-element': ['⇧⌘S'], annotate: ['⇧⌘X'],
    'preview-reload': ['⌘R'],
    'attach-selection': ['⇧⌘L'], terminal: ['⌃`', '⌘J'], 'close-pane': ['⌘\\'], 'expand-pane': ['⇧⌘\\'], 'side-chat': ['⌘;'],
    'split-new-right': ['⌃⌘\\'], 'split-new-below': ['⌃⌘-'], 'split-open': ['⌥Click'], 'split-focus-next': ['⌃]'], 'split-focus-previous': ['⌃['], 'split-close': ['⌃⌘W'],
    mode: ['⇧⌘M'], model: ['⇧⌘I'], effort: ['⇧⌘E'], fast: ['⌥⌘F'], 'menu-item': ['1…9'], 'file-upload': ['⌘U'], queue: ['⌘⏎'], 'send-stay': ['⌘⏎'], 'send-fork': ['⌥⌘⏎'],
  });
  assert.equal(SHORTCUTS_DIALOG_KEYS, 'cmd+/');
});

// W14-code sh7-01: c518a31cc He `o && w && E.length > 0 && [Next / Previous unresolved comment]` — w = u() (the Mac check),
// o = c4d5c642f `!e("__gb__3741111118")` (prCommentKeyboardEnabled): off a Mac, or with the gate set, the rows are not listed.
test('sh7-01: the PR comment rows are Mac-only and follow prCommentKeyboardEnabled', () => {
  const he = readFileSync(path.join(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c518a31cc-Vw6f4MYp.js'), 'utf8');
  assert.ok(he.includes('"Next unresolved comment",id:"0ungAlwxa5"') && he.includes('"Previous unresolved comment",id:"S8O1UaCzaD"'));
  const panes = (options) => shortcutsDialogSections({ route: 'code', ...options })[1].rows.map((row) => row.command);
  const on = panes({ mac: true });
  assert.deepEqual(on.slice(on.indexOf('previous-change'), on.indexOf('go-to-file') + 1), ['previous-change', 'next-pr-comment', 'previous-pr-comment', 'go-to-file']);
  assert.ok(!panes({ mac: false }).some((command) => command.endsWith('pr-comment')), 'w: Mac only');
  assert.ok(!panes({ mac: true, prComment: false }).some((command) => command.endsWith('pr-comment')), 'o: the keyboard gate');
  const row = shortcutsDialogSections({ route: 'code', mac: true })[1].rows.find((entry) => entry.command === 'next-pr-comment');
  assert.deepEqual(Object.keys(row).sort(), ['command', 'keys', 'label']);
});

test('globalShortcutCommand keeps the main handler predicates', () => {
  assert.equal(globalShortcutCommand(keydown('cmd+/')), 'shortcuts');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+/'), shiftKey: true, key: '?' }), null, '⇧⌘/ is not the shortcuts chord');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+/'), isComposing: true }), null);
  assert.equal(globalShortcutCommand({ ...keydown('ctrl+b') }), 'background-tasks', 'backgroundTasks ctrl+b (main.jsx leaves it to a focused text field)');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+b'), altKey: true }), null);
  assert.equal(globalShortcutCommand(keydown('ctrl+,')), 'settings');
  assert.equal(globalShortcutCommand(keydown('ctrl+n')), 'new-session');
  assert.equal(globalShortcutCommand(keydown('ctrl+k')), 'search');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+k'), key: 'K' }), 'search', 'pB matches the key case-insensitively (Caps Lock ⌘K)');
  assert.equal(globalShortcutCommand(keydown('cmd+shift+k')), 'search-palette', '⇧⌘K is search_palette, not ⌘K');
  assert.equal(globalShortcutCommand(keydown('ctrl+shift+k')), null, 'search_palette is Meta only');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+shift+k'), altKey: true }), null);
  assert.equal(globalShortcutCommand(keydown('cmd+shift+]')), null, '⌘⇧] is the session cycle, not Forward');
  assert.equal(globalShortcutCommand(keydown('cmd+[')), 'back');
  assert.equal(globalShortcutCommand(keydown('cmd+]')), 'forward');
  assert.equal(globalShortcutCommand({ ...keydown('cmd+\\'), altKey: true }), null);
  assert.equal(globalShortcutCommand(keydown('cmd+shift+d')), null, 'pane chords are paneShortcutKind’s');
  assert.equal(globalShortcutCommand(keydown('esc')), null);
  // pR ⌘W / reopenClosed ⇧⌘T are Meta only; ⇧⌘W is the menu's Close Window. ⌃O is Control only.
  assert.equal(globalShortcutCommand(keydown('cmd+w')), 'close-session');
  assert.equal(globalShortcutCommand(keydown('cmd+shift+w')), null);
  assert.equal(globalShortcutCommand(keydown('ctrl+w')), null);
  assert.equal(globalShortcutCommand({ ...keydown('cmd+w'), altKey: true }), null);
  assert.equal(globalShortcutCommand({ ...keydown('cmd+w'), isComposing: true }), null);
  assert.equal(globalShortcutCommand({ ...keydown('cmd+w'), key: 'ц' }), 'close-session', 'a non-ASCII layout falls back to KeyW (fR)');
  assert.equal(globalShortcutCommand(keydown('cmd+shift+t')), 'reopen-closed');
  assert.equal(globalShortcutCommand(keydown('cmd+t')), null);
  assert.equal(globalShortcutCommand(keydown('ctrl+shift+t')), null);
  assert.equal(globalShortcutCommand(keydown('ctrl+o')), 'transcript-view');
  assert.equal(globalShortcutCommand(keydown('cmd+o')), null);
  assert.equal(globalShortcutCommand(keydown('ctrl+shift+o')), null);
  assert.equal(globalShortcutCommand({ ...keydown('ctrl+o'), isComposing: true }), null);
});

test('searchShortcutAction: ⌘K toggles the palette, ⇧⌘K opens it (or switches it) in search mode; the sidebar never docks', () => {
  assert.equal(searchShortcutAction({ showSearch: false, toggle: true }), 'open');
  assert.equal(searchShortcutAction({ showSearch: 'default', toggle: true }), 'close');
  assert.equal(searchShortcutAction({ showSearch: 'search', toggle: true }), 'close');
  assert.equal(searchShortcutAction({ showSearch: false, toggle: false }), 'open-search');
  assert.equal(searchShortcutAction({ showSearch: 'default', toggle: false }), 'open-search');
  assert.equal(searchShortcutAction(), 'open-search');
});

test('main.jsx routes the handler through globalShortcutCommand and renders the dialog; ⌘/ opens (I = v(!0))', () => {
  const main = readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.match(main, /const command = globalShortcutCommand\(e\);/);
  assert.match(main, /if \(command === "shortcuts"\) \{\s*e\.preventDefault\(\); e\.stopPropagation\(\);/);
  assert.match(main, /setActionDialog\(\(dialog\) => dialog\?\.kind === "shortcuts" \? dialog : \{ kind: "shortcuts" \}\)/);
  assert.match(main, /<KeyboardShortcutsDialog /);
  assert.doesNotMatch(main, /Slash commands","Type \//, 'the six-row stub is gone');
  // Escape: a consumed Escape closes nothing; otherwise only the topmost local layer.
  // Fidelity F08: the collapsed sidebar's open peek is a layer between the dialogs and the search (Nb / uR).
  assert.match(main, /if \(e\.key === "Escape" && !e\.defaultPrevented\) \{\s*if \(menu\) setMenu\(null\);\s*else if \(rename\) setRename\(null\);\s*else if \(actionDialog\) setActionDialog\(null\);\s*(?:\/\/[^\n]*\n\s*)*else if \(closePeek\(\{ focusTrigger: true \}\)\) e\.preventDefault\(\);\s*else if \(showSearch\) setShowSearch\(false\);/);
  // A hidden search never filters.
  assert.match(main, /useLayoutEffect\(\(\) => \{ if \(!showSearch\) setSearch\(""\); \}, \[showSearch\]\);/);
});

test('official chords: ⌘⌥↑/↓ prompt jumps, ⌃B background tasks (bound, not listed), ⌘U add files', async () => {
  const { globalShortcutCommand, shortcutsDialogSections } = await import('../src/shortcuts-dialog-model.mjs');
  const { promptJumpIndex } = await import('../src/transcript-feed-nav.mjs');
  assert.equal(globalShortcutCommand({ metaKey: true, altKey: true, key: 'ArrowUp', code: 'ArrowUp' }), 'jump-prev-prompt');
  assert.equal(globalShortcutCommand({ metaKey: true, altKey: true, key: 'ArrowDown', code: 'ArrowDown' }), 'jump-next-prompt');
  assert.equal(globalShortcutCommand({ ctrlKey: true, key: 'b', code: 'KeyB' }), 'background-tasks');
  assert.equal(globalShortcutCommand({ metaKey: true, key: 'b', code: 'KeyB' }), 'toggle-sidebar');
  assert.equal(globalShortcutCommand({ metaKey: true, key: '.', code: 'Period' }), null, 'Ce J is cmd+b only; ⌘. no longer toggles the sidebar');
  assert.equal(globalShortcutCommand({ metaKey: true, altKey: true, key: '©', code: 'KeyG' }), 'open-session-pr', 'open_code_session_pr cmd+alt+g by code');
  assert.equal(globalShortcutCommand({ metaKey: true, altKey: true, shiftKey: true, key: 'G', code: 'KeyG' }), null);
  assert.equal(globalShortcutCommand({ metaKey: true, shiftKey: true, key: '>', code: 'Period' }), null);
  assert.equal(globalShortcutCommand({ metaKey: true, key: 'u', code: 'KeyU' }), 'file-upload');
  assert.equal(globalShortcutCommand({ metaKey: true, shiftKey: true, key: 'u', code: 'KeyU' }), null);
  const rows = shortcutsDialogSections({ promptJump: true }).flatMap((section) => section.rows.map((row) => row.command));
  for (const command of ['jump-prev-prompt', 'jump-next-prompt', 'file-upload', 'attach-selection']) assert.ok(rows.includes(command), command);
  // W14-code r5 gates-r5-01: ccd_prompt_jump is off (not in Uon) — no rows, and main.jsx leaves ⌥⌘↑/↓ unhandled.
  const off = shortcutsDialogSections().flatMap((section) => section.rows.map((row) => row.command));
  assert.ok(!off.includes('jump-prev-prompt') && !off.includes('jump-next-prompt'));
  const mainSource = readFileSync(path.join(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.match(mainSource, /if \(command === "jump-prev-prompt" \|\| command === "jump-next-prompt"\) \{\n(?:\s*\/\/[^\n]*\n)*\s*if \(!promptJumpGate\(\)\) return;/);
  assert.match(mainSource, /if \(isSessionChordCommand\(command\)\) \{\n\s*if \(modeRef\.current === "code" && !codeSessionActionsGate\(\)\) return;/);
  // V3-w12b-settings-dialogs: 3.6556.2 c518a31cc He has no ctrl+b row.
  assert.ok(!rows.includes('background-tasks'));
  assert.equal(promptJumpIndex([-300, -20, 2, 400], -1), 1);
  assert.equal(promptJumpIndex([-300, -20, 2, 400], 1), 3);
  assert.equal(promptJumpIndex([10, 400], -1), -1);
  assert.equal(promptJumpIndex([], 1), -1);
});

// V3-w13-surfaces-shortcuts (surf-22): off the Code route 3.6556.2 c518a31cc Me renders Ne (General, "In chats",
// "In tasks" on a task route), filtered like Ce to this app's chords.
test('Ne off Code: General / In chats (+ In tasks on an open task), every chord bound on any surface', () => {
  const labels = (sections) => sections.map((section) => [section.title, section.rows.map((row) => row.label)]);
  const general = ['Quick chat or search', 'Search', 'Toggle sidebar', 'New chat', 'Close chat', 'Next chat', 'Previous chat', 'Jump to chat', 'Keyboard shortcuts', 'Settings'];
  assert.deepEqual(labels(shortcutsDialogSections({ surface: 'chat' })), [
    ['General', general], ['In chats', ['Send message', 'New line in message', 'Add files or photos', 'Stop DeepSeek’s response']],
  ], 'Home (no chat route): no Reuse row, no chat actions, no In tasks');
  assert.deepEqual(labels(shortcutsDialogSections({ surface: 'chat', route: 'chat' })), [
    ['General', general], ['In chats', ['Send message', 'New line in message', 'Add files or photos', 'Reuse an earlier message', 'Stop DeepSeek’s response',
      'Pin / unpin chat', 'Rename chat', 'Mark chat as read/unread']],
  ]);
  assert.deepEqual(labels(shortcutsDialogSections({ surface: 'cowork', route: 'cowork', fastMode: true, sideChat: true })), [
    ['General', general], ['In chats', ['Send message', 'New line in message', 'Add files or photos', 'Reuse an earlier message', 'Stop DeepSeek’s response']],
    ['In tasks', ['Pin / unpin task', 'Rename task', 'Mark task as read/unread', 'Archive task']],
  ]);
  assert.deepEqual(labels(shortcutsDialogSections({ surface: 'cowork' })).map(([title]) => title), ['General', 'In chats']);
  // Code is unchanged (Ce), whatever the route.
  assert.deepEqual(shortcutsDialogSections({ surface: 'code', route: 'chat' }), shortcutsDialogSections());
  const codeOnly = ['split-open', 'open-session-pr', 'fork-session', 'changes', 'terminal', 'transcript-view', 'new-session-current', 'reopen-closed', 'rewind'];
  for (const surface of ['chat', 'cowork'])
    for (const route of [null, surface]) {
      const sections = shortcutsDialogSections({ surface, route, fastMode: true, sideChat: true });
      for (const section of sections) {
        for (const row of section.rows) {
          assert.ok(!codeOnly.includes(row.command), `${surface}: ${row.command} is a Code row`);
          for (const spec of row.keys)
            for (const key of expand(spec)) {
              const event = keydown(key);
              // SourceComposer's Enter (enterAction) and its prompt history (promptHistoryStep, ↑ / ↓ at the caret edges).
              if (row.command === 'send') assert.equal(enterAction({ event }), 'submit');
              else if (row.command === 'newline') assert.equal(enterAction({ event }), 'newline');
              else if (row.command === 'reuse-message') {
                const step = promptHistoryStep({ ...INITIAL_PROMPT_HISTORY, resetKey: 's', index: key === 'down' ? 0 : null, length: 2 },
                  { resetKey: 's', key: event.key, atStart: true, atEnd: true, text: key === 'down' ? 'a' : '', prompts: ['a', 'b'] });
                assert.ok(['recall', 'restore'].includes(step.action), `${key}: ${step.action}`);
                assert.match(composer, /const step = promptHistoryStep\(history\.current, \{/);
              } else {
                const own = boundIn(row.command, event);
                if (own !== undefined) assert.equal(own, true, `${section.title} / ${row.label}: ${key}`);
                else assert.equal(bound(event), row.command, `${section.title} / ${row.label}: ${key}`);
              }
            }
        }
      }
    }
});

// V3-w12b-settings-dialogs (S1): 3.6556.2 c518a31cc He. General F = t(Ae, {}) between Transcript view and Stop (Find ⌘F,
// Find next `e ? "cmd+g" : Oe`, Find previous `e ? "cmd+shift+g" : ke`); Composer Qe `N && …` (N = l(Ue), Ue: the open
// route's kind is "code") after Add files; Archive session is only h's ⌥⌘A (m on); no ctrl+b row.
test('He: Find rows (Oe / ke off a Mac), the Code-route prompt history rows, ⌥⌘A-only Archive, no Background tasks', () => {
  const commands = (props) => shortcutsDialogSections(props).flatMap((section) => section.rows.map((row) => row.command));
  const general = shortcutsDialogSections({ route: 'code', mac: true })[0].rows.map((row) => row.command);
  assert.deepEqual(general.slice(general.indexOf('transcript-view'), general.indexOf('stop') + 1), ['transcript-view', 'find', 'find-next', 'find-previous', 'stop']);
  const keys = (mac) => Object.fromEntries(shortcutsDialogSections({ route: 'code', mac })[0].rows.filter((row) => row.command.startsWith('find')).map((row) => [row.command, row.keys]));
  assert.deepEqual(keys(true), { find: ['cmd+f'], 'find-next': ['cmd+g'], 'find-previous': ['cmd+shift+g'] });
  assert.deepEqual(keys(false), { find: ['cmd+f'], 'find-next': ['cmd+g', 'f3'], 'find-previous': ['cmd+shift+g', 'shift+f3'] });
  const composerRows = shortcutsDialogSections({ route: 'code', mac: true }).at(-1).rows;
  assert.deepEqual(composerRows.slice(4, 8).map((row) => [row.command, row.keys]),
    [['file-upload', ['cmd+u']], ['reuse-prompt', ['up', 'down']], ['search-prompts', ['ctrl+r']], ['queue', ['cmd+enter']]]);
  for (const route of [null, 'chat', 'cowork'])
    for (const command of ['reuse-prompt', 'search-prompts']) assert.ok(!commands({ route }).includes(command), `${route}: ${command} is Ue-gated`);
  assert.ok(commands({ route: null }).includes('find'), 'Ae is not route-gated');
  // W14-code r5 gates-r5-01: with m (ccd_palette_session_actions) off — the host default — He lists `!m &&` ⌘⇧⌫; on, h's ⌥⌘A only.
  assert.deepEqual(shortcutsDialogSections({ route: 'code' })[0].rows.filter((row) => row.command === 'archive-session').map((row) => row.keys), [['cmd+shift+backspace']]);
  assert.deepEqual(shortcutsDialogSections({ route: 'code', sessionActions: true })[0].rows.filter((row) => row.command === 'archive-session').map((row) => row.keys), [['cmd+alt+a']]);
  assert.ok(!commands({ route: 'code', fastMode: true, sideChat: true }).includes('background-tasks'));
  const official = readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c518a31cc-Vw6f4MYp.js'), 'utf8');
  for (const needle of ['Oe=["cmd+g","f3"]', 'ke=["cmd+shift+g","shift+f3"]', 'defaultMessage:"Find next"', 'defaultMessage:"Find previous"',
    'defaultMessage:"Reuse an earlier prompt"', 'shortcut:"ctrl+r"', 'defaultMessage:"Search earlier prompts"', 'function Ue(e){return _(e)?.kind==="code"}'])
    assert.ok(official.includes(needle), needle);
  assert.ok(!official.includes('"ctrl+b"'), 'He lists no ctrl+b');
});

// W14-code r3 r3-shared-02: 3.6556.2 c518a31cc He `ae = t(Ee, { isClaudeApp: w })` after new_code_session_from_current; Ee
// lists "Select environment" (y("selectPreset1") with /1$/ -> "1…9") and "New environment" (y("newPreset")) under the presets
// gate a = L(); shared-46 qL binds cmd+alt+N (mac) / alt+N (`when: "isClaudeApp || !isLinux"`) for N = 1…9, 0.
test('Ee: Select environment / New environment after New session with current settings, only with the presets gate', () => {
  const v1 = path.join(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const chunk = (prefix) => readFileSync(path.join(v1, (globalThis.__r3dlgFiles ??= require_dir(v1)).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
  const he = chunk('c518a31cc-');
  assert.ok(he.includes('y("selectPreset1",n,{sessionEnvironments:a})') && he.includes('y("newPreset",n,{sessionEnvironments:a})'));
  assert.ok(he.includes('defaultMessage:"Select environment",id:"oYSOsx4YRS"') && he.includes('defaultMessage:"New environment",id:"5xkWpa1rVR"'));
  const after = he.indexOf('shortcutId:"new_code_session_from_current"'), ee = he.indexOf('(Ee,{isClaudeApp:');
  assert.ok(after > 0 && ee > after && ee - after < 200, 'He renders Ee right after new_code_session_from_current');
  const qL = chunk('shared-46-');
  assert.ok(qL.includes('{command:t,key:`cmd+alt+${e}`,code:n,mac:!0,gate:"sessionPresets"}') && qL.includes('{command:t,key:`alt+${e}`,code:n,mac:!1,when:"isClaudeApp || !isLinux",gate:"sessionPresets"}'));
  const general = (options) => shortcutsDialogSections({ route: 'code', ...options })[0].rows.map((row) => `${row.command} ${row.keys.join('|')}`);
  const on = general({ mac: true, presets: true });
  const at = on.indexOf('new-session-current cmd+shift+n');
  assert.deepEqual(on.slice(at + 1, at + 3), ['select-environment cmd+alt+1…9', 'new-environment cmd+alt+0']);
  assert.deepEqual(general({ mac: false, presets: true }).filter((row) => row.includes('environment')), ['select-environment alt+1…9', 'new-environment alt+0']);
  assert.ok(!general({ mac: true }).some((row) => row.includes('environment')), 'presets off: Ee answers null');
  const labels = shortcutsDialogSections({ route: 'code', mac: true, presets: true })[0].rows.filter((row) => row.command.endsWith('-environment')).map((row) => row.label);
  assert.deepEqual(labels, ['Select environment', 'New environment']);
  // The dialog reads the gate from the host table (D10 / E92 on).
  const dialog = readFileSync(path.join(import.meta.dirname, '../src/source-session-actions.jsx'), 'utf8');
  assert.ok(dialog.includes("presets = hostGrowthBookFlag('claudeai_cc_epitaxy_session_presets_main')"));
});

test('qL / c8 Aae: presetChordTarget takes Digit1…9 / Digit0 with exactly ⌘⌥ (mac) or ⌥', () => {
  assert.deepEqual(PRESET_CHORD_DIGITS, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  const ev = (code, mods = {}) => ({ code, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false, ...mods });
  assert.equal(presetChordTarget(ev('Digit1', { metaKey: true, altKey: true }), true), 0);
  assert.equal(presetChordTarget(ev('Digit9', { metaKey: true, altKey: true }), true), 8);
  assert.equal(presetChordTarget(ev('Digit0', { metaKey: true, altKey: true }), true), 'new');
  assert.equal(presetChordTarget(ev('Digit3', { altKey: true }), false), 2);
  for (const event of [ev('Digit1', { metaKey: true }), ev('Digit1', { altKey: true }), ev('Digit1', { metaKey: true, altKey: true, shiftKey: true }),
    ev('Digit1', { metaKey: true, altKey: true, ctrlKey: true }), ev('KeyA', { metaKey: true, altKey: true })])
    assert.equal(presetChordTarget(event, true), null);
  assert.equal(presetChordTarget(ev('Digit1', { metaKey: true, altKey: true }), false), null);
  assert.deepEqual([presetShortcut(0, true), presetShortcut(8, true), presetShortcut(9, true), presetShortcut('new', true), presetShortcut(4, false)],
    ['cmd+alt+1', 'cmd+alt+9', undefined, 'cmd+alt+0', 'alt+5']);
  // No other host binding claims ⌘⌥digit.
  for (let digit = 0; digit <= 9; digit++) assert.equal(globalShortcutCommand(ev(`Digit${digit}`, { metaKey: true, altKey: true, key: String(digit) })), null);
});
