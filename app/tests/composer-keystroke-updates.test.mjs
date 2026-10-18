// Fast typing must not build a chain of queued no-op updates in the composer. Each keystroke's commit flushed the
// [draft] effects synchronously; resetting composerNotice / commandIndex / dismissed (and the rAF mention / emoji
// lookups) to the value they already held still queued a default-lane update because the composer always had work
// pending, so every commit left one behind. React 19 counts that as a nested update and threw "Maximum update depth
// exceeded" (#185) after ~50 keystrokes (composer-states-ui-test fast typing). The resets now skip values in place.
// Also: the transcript keeps its own key. (The floating suggested-tasks strip that was its keyed sibling is retired: on
// the presets-on branch, D10, 2.42304.0 draws proposals as the transcript's inline group card — R4f-proposal P5.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const composer = fs.readFileSync(path.join(root, 'src/source-composer.jsx'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');

test('per-keystroke resets in the composer skip a value that is already in place', () => {
  assert.match(composer, /useEffect\(\(\) => \{ if \(composerNotice !== null\) setComposerNotice\(null\); \}, \[draft\]\);/);
  // B05 C4: the dismissed '/' trigger is a text offset (shared-5 dismissedTriggerFrom), mapped through edits before it,
  // and touched only while it is set and only when it moves or goes.
  assert.match(composer, /useEffect\(\(\)=>\{if\(commandIndex!==0\)setCommandIndex\(0\);const previous=dismissedText\.current;dismissedText\.current=editorText;if\(dismissed===null\)return;/);
  assert.match(composer, /if\(at===null\|\|editorText\[at\]!=='\/'\)setDismissedAt\(null\);else if\(at!==dismissed\)setDismissedAt\(at\);\},\[draft\]\);/);
  assert.match(composer, /if\(caret!==renderedCaret\.current\)setSlashCaret\(caret\);/, 'a caret sync the last render already saw is skipped');
  assert.doesNotMatch(composer, /\{ setMention\(null\); return; \}/, 'updateMention clears only an open lookup');
  assert.doesNotMatch(composer, /\{ setEmoji\(null\); return; \}/, 'updateEmoji clears only an open lookup');
  assert.match(composer, /if \(mentionDismissed !== null\) setMentionDismissed\(null\); requestAnimationFrame/);
});

test('the transcript of a session keeps its key; the floating suggested-tasks strip beside it is gone', () => {
  // cf74bc599 Xx mounts the floating card only on `!lr` (presets off); the inline card is inside the transcript.
  assert.doesNotMatch(main, /<SourceSuggestedTasks\b/);
  assert.match(main, /<SourceTranscript\s+key=\{current \?\? "draft"\}/);
});
