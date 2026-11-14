import test from 'node:test';
import assert from 'node:assert/strict';
import { fileListRoute, paneShortcut, paneShortcutKind } from '../src/pane-shortcuts.mjs';

// shared-21-D098Wd--.js:14145-14187 aR: toggleDiff cmd+shift+d (KeyD), toggleBrowser cmd+shift+f (KeyF).
const key = (code, extra = {}) => ({ code, metaKey: true, shiftKey: true, ctrlKey: false, altKey: false, isComposing: false, repeat: false, ...extra });

test('paneShortcut accepts Meta+Shift+KeyD and Meta+Shift+KeyF only', () => {
  assert.equal(paneShortcut(key('KeyD')), 'changes');
  assert.equal(paneShortcut(key('KeyF')), 'files');
  for (const extra of [{ ctrlKey: true }, { altKey: true }, { shiftKey: false }, { metaKey: false }, { isComposing: true }])
    for (const code of ['KeyD', 'KeyF']) {
      assert.equal(paneShortcut(key(code, extra)), null, JSON.stringify({ code, extra }));
      assert.equal(paneShortcutKind(key(code, extra)), null);
    }
  for (const code of ['KeyB', 'KeyJ', 'BracketLeft', 'Backslash', 'Digit1', undefined]) assert.equal(paneShortcut(key(code)), null);
  assert.equal(paneShortcut(null), null);
});

test('a held repeat is recognised (so the caller can preventDefault) but never toggles', () => {
  assert.equal(paneShortcutKind(key('KeyD', { repeat: true })), 'changes');
  assert.equal(paneShortcut(key('KeyD', { repeat: true })), null);
  assert.equal(paneShortcut(key('KeyF', { repeat: true })), null);
});

// toggleDiffFileList cmd+shift+y KeyY (sidebar-rows.js:14247-14253).
test('Meta+Shift+KeyY maps to file-list; a repeat is recognised but never toggles', () => {
  assert.equal(paneShortcut(key('KeyY')), 'file-list');
  assert.equal(paneShortcutKind(key('KeyY', { repeat: true })), 'file-list');
  assert.equal(paneShortcut(key('KeyY', { repeat: true })), null);
  for (const extra of [{ ctrlKey: true }, { altKey: true }, { shiftKey: false }, { metaKey: false }, { isComposing: true }])
    assert.equal(paneShortcutKind(key('KeyY', extra)), null, JSON.stringify(extra));
});

// R10 ⇧⌘Y routing (c936fcd42 ei/$r, code-workspace.js:2230-2241): Files when it is
// focused or Changes is closed; else the open Changes list (only while it can show);
// with neither, Changes opens with the list shown.
test('fileListRoute: Files when focused or alone, else the open Changes list, else open Changes', () => {
  // Only Files open (with a tree): its tree, whatever has focus.
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: false, focused: null }), 'files');
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: false, focused: 'files' }), 'files');
  // Both open: the focused Files pane keeps it; otherwise the Changes list toggles.
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: true, focused: 'files', changesCanShow: true }), 'files');
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: true, focused: 'changes', changesCanShow: true }), 'changes');
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: true, focused: null, changesCanShow: true }), 'changes');
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: true, focused: 'plan', changesCanShow: true }), 'changes');
  // Only Changes open: its list, but nothing while the column cannot show (narrow or empty body, Qr).
  assert.equal(fileListRoute({ changesOpen: true, focused: 'changes', changesCanShow: true }), 'changes');
  assert.equal(fileListRoute({ changesOpen: true, changesCanShow: false }), null);
  assert.equal(fileListRoute({ filesOpen: true, changesOpen: true, focused: 'changes', changesCanShow: false }), null);
  // Neither open (or a Files pane without a tree to toggle): open Changes with the list.
  assert.equal(fileListRoute({}), 'open-changes');
  assert.equal(fileListRoute({ filesOpen: false, changesOpen: false, focused: 'files' }), 'open-changes');
});

test('main.jsx routes file-list through fileListRoute to the Files tree, the Changes list or a new Changes pane', async () => {
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(main, /const route = fileListRoute\(\{ filesOpen: openPanes\.has\("files"\) && !!fileTreeToggleRef\.current, changesOpen: openPanes\.has\("changes"\),\s*focused: focusedPaneKind\(\), changesCanShow: !!diffTreeToggleRef\.current \}\);/);
  assert.match(main, /else if \(route === "changes"\) diffTreeToggleRef\.current\?\.\(\);/);
  assert.match(main, /else if \(route === "open-changes"\) \{ openPaneTile\("changes"\); if \(!tileStore\.getState\(\)\.diffShowTree\) tileStore\.setGlobal\(\{ diffShowTree: true \}\); \}/);
  // The Changes tile gets its own handle and the store's file list state.
  assert.match(main, /diffTree=\{tileId === "changes" \? tileState : null\}/);
  assert.match(main, /onDiffTreeChange=\{tileId === "changes" \? tileStore\.setGlobal : null\}/);
});

// togglePreview cmd+shift+p (shared-21-D098Wd--.js:14146-14207).
test('Meta+Shift+KeyP toggles the Preview pane; other modifiers do not', () => {
  assert.equal(paneShortcut(key('KeyP')), 'preview');
  assert.equal(paneShortcut(key('KeyP', { repeat: true })), null);
  for (const extra of [{ ctrlKey: true }, { altKey: true }, { shiftKey: false }, { metaKey: false }, { isComposing: true }])
    assert.equal(paneShortcutKind(key('KeyP', extra)), null, JSON.stringify(extra));
});
