// Round 4 app/src fixes: recap notice, View changes outside git, side chat focus, usage locale, status effort,
// /sandbox anchor, IPC prefix, failed first turn rollback, Quick setup takeover, Theme page IA, instructions note.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileChangesDiff } from '../src/turn-edits-model.mjs';
import { parseUnifiedDiff } from '../src/diff-model.js';
import { createToastStore } from '../src/toast-store.mjs';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
const read = (name) => fs.readFileSync(path.join(src, name), 'utf8');

test('fileChangesDiff: the Changes pane gets a valid patch from fileChange items when there is no git or turn diff', () => {
  const items = [
    { type: 'fileChange', status: 'completed', turnId: 't1', changes: [{ path: '/w/notes.md', kind: { type: 'add' }, diff: 'one\ntwo\n' }] },
    { type: 'fileChange', status: 'completed', turnId: 't2', changes: [{ path: '/w/notes.md', kind: { type: 'update' }, diff: '@@ -1,2 +1,2 @@\n one\n-two\n+three\n' }] },
    { type: 'fileChange', status: 'completed', turnId: 't2', changes: [{ path: '/elsewhere/a.js', kind: 'update', diff: '--- a/a.js\n+++ b/a.js\n@@ -1 +1 @@\n-x\n+y' }] },
    { type: 'fileChange', status: 'completed', turnId: 't3', changes: [{ path: 'gone.txt', kind: 'delete', diff: 'bye\n' }] },
    { type: 'fileChange', status: 'failed', turnId: 't3', changes: [{ path: '/w/never.md', kind: 'add', diff: 'x\n' }] },
    { type: 'fileChange', status: 'completed', turnId: 't3', changes: [{ path: '/w/empty.md', kind: 'update', diff: '' }] },
    { type: 'agentMessage', text: 'done' },
  ];
  const diff = fileChangesDiff(items, { cwd: '/w/' });
  const parsed = parseUnifiedDiff(diff);
  assert.equal(parsed.sections.some((section) => section.type === 'raw'), false);
  assert.deepEqual(parsed.files.map((file) => [file.newPath ?? file.oldPath, file.fallbackReason ?? null, file.hunks.length]),
    [['notes.md', null, 1], ['notes.md', null, 1], ['/elsewhere/a.js', null, 1], ['gone.txt', null, 1]]);
  assert.match(diff, /new file mode 100644\n--- \/dev\/null\n\+\+\+ b\/notes\.md\n@@ -0,0 \+1,2 @@\n\+one\n\+two\n/);
  assert.match(diff, /deleted file mode 100644\n--- a\/gone\.txt\n\+\+\+ \/dev\/null\n@@ -1,1 \+0,0 @@\n-bye\n/);
  assert.equal(fileChangesDiff([], { cwd: '/w' }), '');
  assert.equal(fileChangesDiff([{ type: 'fileChange', status: 'completed', changes: [{ path: 'x', kind: 'update', diff: 'not a diff' }] }]), '');
});

test('View changes is never a dead button: the pane falls back to the session edits and the card gets onView only when showable', () => {
  const main = read('main.jsx');
  assert.match(main, /const editsDiff = useMemo\(\(\) => editsNeeded \? fileChangesDiff\(items, \{ cwd: workdir \}\) : ""/);
  // B15: the repo diff goes through carriedOverDiff (the previous scope's comparison stays while the next loads).
  assert.match(main, /diff=\{gitStatus\?\.isRepo \? shownGitDiff\.diff : sessionDiff\}/);
  // B16, now R3b-transcript (2.42304.0 M2e m): the card reveals the first file the diff lists, else opens Changes; its
  // diff opener and pane exist only when canViewChanges (source-turn-edits.jsx; tests/r3b-transcript-turn-edits.test.mjs).
  assert.match(main, /canViewChanges=\{canViewChanges\} fileInChanges=\{turnFileInChanges\}\n\s+onRevealInChanges=\{\(path\) => \{ requestDiffReveal\(path\); setPanel\("changes"\); \}\} onOpenChanges=\{\(\) => setPanel\("changes"\)\}/);
  assert.doesNotMatch(main, /if \(!gitStatus\?\.isRepo && !state\.diffs\[current\]\) return;/);
  assert.match(main, /pane: "changes", data: \{ diff \}/, 'a popped-out Changes pane gets the same diff');
});

test('recap is Claude\'s transcript-tail Recap card (rR) with a bounded Markdown scroller; info notices are never warning-toned', () => {
  const main = read('main.jsx'), notices = read('source-session-notices.jsx'), css = read('source-session-notices.css');
  const card = read('source-recap-card.jsx'), cardCss = read('source-recap-card.css');
  assert.doesNotMatch(main, /kind: "recap"/, 'the recap is no longer a notice above the composer');
  assert.match(main, /\{recap && <SourceRecapCard recap=\{recap\} sessionKey=\{current\} onDismiss=\{dismissRecap\} \/>\}\n\s*\{!emptyPane && <SourceTranscriptStatus/);
  assert.match(card, /<section role="status" className="source-message src-recap"/);
  assert.match(card, /<h3 className="src-recap-title">\{t\("Recap"\)\}<\/h3>/);
  assert.match(card, /aria-label=\{t\("Dismiss recap"\)\}/);
  assert.match(card, /t\("Writing a recap…"\)/);
  assert.match(cardCss, /border-radius: 10px; background: var\(--cds-surface-1\);/);
  assert.match(cardCss, /\.src-recap-header \{[^}]*padding: 6px 12px; border-bottom: 1px solid var\(--cds-border\);/);
  assert.match(cardCss, /\.src-recap-body \{[^}]*padding: 12px;[^}]*color: var\(--cds-text-secondary\);[^}]*font-style: italic;/);
  assert.match(cardCss, /\.src-recap-markdown \{ max-height: 240px; overflow-y: auto;/);
  assert.match(notices, /<Icon name=\{noticeIcon\(notice\)\}/);
  assert.match(css, /\.ssn-notice\[data-level="info"\] \{\s*border-color: var\(--cds-border\);\s*background: var\(--cds-surface-1\);/);
});

test('usage page dates and numbers use the app locale', () => {
  const usage = read('source-usage.jsx');
  assert.match(usage, /usageCostPresentation\(data,\{todayKey,locale:getLocale\(\),days:range\}\)/);
  assert.match(usage, /formatDayKey\(key,getLocale\(\)\)/);
  assert.doesNotMatch(usage, /formatMoney\([^)]*currency\)/);
  assert.doesNotMatch(usage, /formatTokenCount\([a-zA-Z.]+\)/);
});

test('session status names the effort with the effort menu label, /sandbox opens the sandbox row', () => {
  const actions = read('source-session-actions.jsx'), main = read('main.jsx');
  assert.match(actions, /t\('Effort: \{name\}', \{ name: effortName\(effort, efforts\) \}\)/);
  assert.doesNotMatch(actions, /t\('\{effort\} effort'/);
  assert.match(main, /efforts:chosen\?\.supportedReasoningEfforts\|\|null/);
  assert.match(main, /case "sandbox": setSettings\("code#sandbox"\)/);
});

test('IPC transport prefix is stripped once for banners and for every toast', () => {
  const main = read('main.jsx');
  assert.equal((main.match(/const setError = useCallback\(\(value\) => setErrorText\(typeof value === "string" \? cleanErrorReason\(value\) : value\), \[\]\);/g) || []).length, 2);
  const store = createToastStore({ now: () => 0, schedule: () => 1, cancel: () => {} });
  store.add("Error invoking remote method 'desktop:call': Error: Native action forbidden: dialog.showOpenDialog");
  assert.equal(store.getSnapshot()[0].message, 'Native action forbidden: dialog.showOpenDialog');
  assert.equal(store.add("Error invoking remote method 'desktop:call': Error: "), null);
});

test('a send whose first turn/start fails discards the session it created and returns the message to Home', () => {
  const main = read('main.jsx');
  assert.match(main, /createdHere = true;/);
  assert.match(main, /turnStarted = true;/);
  assert.match(main, /if \(createdHere && !turnStarted && id\) \{[^}]*?\n\s*discardFailedStart\(id,/);
  const body = main.slice(main.indexOf('function discardFailedStart('), main.indexOf('async function performOperation('));
  assert.match(body, /setSessions\(\(list\) => list\.filter\(\(thread\) => thread\.id !== id\)\)/);
  assert.match(body, /void openSession\(null\);/);
  assert.match(body, /setDraft\(text\); setAttachments\(entries\); setMentions\(mentionList\);/);
  assert.match(body, /rpc\("thread\/delete", \{ threadId: id \}\)\.catch\(\(\) => rpc\("thread\/archive", \{ threadId: id \}\)\)/);
});

test('Quick setup takeover: Escape goes Back, the app behind it is inert, focus comes back to the step', () => {
  const onboarding = read('source-onboarding.jsx');
  assert.match(onboarding, /step === "connect" \? \(startAt === "connect" \? onSkip : \(\) => setStep\("agent"\)\)/);
  assert.match(onboarding, /doc\.addEventListener\("keydown", escape\)/);
  assert.match(onboarding, /sibling\.inert = true;/);
  assert.match(onboarding, /for \(const sibling of inerted\) sibling\.inert = false;/);
  assert.match(onboarding, /new MutationObserver\(settle\)/);
  assert.match(onboarding, /<div ref=\{layer\} className="sob-layer">/);
});

test('instructions: any customization core applies changes from the next message', () => {
  const page = read('source-settings-instructions.jsx');
  assert.match(page, /const note = WHEN_IT_APPLIES\[coreSupports\(engine, 'customization'\) \? 'deepseek' : 'codex'\];/);
});
