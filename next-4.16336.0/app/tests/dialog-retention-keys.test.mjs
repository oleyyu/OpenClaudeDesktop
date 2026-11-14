import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Round-3 integration: useDialogRetention (source-dialog.jsx) hands out a small numeric key per slot.
// Retained dialogs are siblings in one children list (main.jsx overlays, the SourceSidebar aside), where
// React matches explicit keys across the whole list. A bare `key={shownX.key}` therefore collides with a
// sibling slot's equal counter: the sidebar suite caught the 'Delete group?' confirm (key 2, still exiting)
// beside the next 'New group' dialog (key 2), and React mounted two New group dialogs. Each slot prefixes it.
const src = path.resolve(import.meta.dirname, '../src');

test('retained dialog keys are prefixed per slot', () => {
  const bare = [], prefixed = [];
  for (const name of readdirSync(src).filter((file) => file.endsWith('.jsx')).sort()) {
    const text = readFileSync(path.join(src, name), 'utf8');
    for (const match of text.matchAll(/key=\{(shown\w+)\.key\}/g)) bare.push(`${name}: ${match[1]}`);
    for (const match of text.matchAll(/key=\{`([\w-]+)-\$\{(shown\w+)\.key\}`\}/g)) prefixed.push(`${match[1]}:${match[2]}`);
  }
  assert.deepEqual(bare, []);
  for (const slot of ['group:shownGroupDialog', 'confirm:shownConfirm', 'bypass:shownBypass', 'branch-switch:shownBranchSwitch',
    'whats-new:shownWhatsNew', 'confirm-delete:shownConfirmDelete', 'rename:shownRename', 'action:shownActionDialog'])
    assert.ok(prefixed.includes(slot), slot);
  // Distinct prefixes for distinct retention slots (the four action dialog kinds share one slot).
  const bySlot = new Map();
  for (const entry of prefixed) { const [prefix, slot] = entry.split(':'); bySlot.set(prefix, new Set([...(bySlot.get(prefix) ?? []), slot])); }
  for (const [prefix, slots] of bySlot) assert.equal(slots.size, 1, `${prefix} names one slot`);
});
