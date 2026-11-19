// ui-display-bugs-20261116 (analysis/ui-display-bugs-20261116/REPORT.md), overlay / chat lane:
//   U-02  the first-run / Quick setup takeover is portalled to <body> (out of main.dframe-content's isolate), with
//         counted inert holds on the app behind it.
//   U-05  a session body under 768px (shared-6 Cg) takes the activity / artifact panel as an overlay, not a column.
//   U-09  the Chat disclaimer at a transcript's end does not pull itself 40px over the last row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NARROW_SESSION_BODY, isNarrowSessionBody } from '../src/session-panel-narrow.mjs';

const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('U-02: the takeover renders through a <body> portal that repeats the cds attributes, and holds #root inert', () => {
  const source = read('source-onboarding.jsx');
  assert.match(source, /const place = portal \? \(node\) => createPortal\(node, portal\) : \(node\) => node;/);
  assert.match(source, /portal\.className = "sob-portal cds-root";/);
  assert.match(source, /anchor\.current\?\.closest\(`\[\$\{name\}\]`\)/);
  assert.match(source, /portal\.style\.setProperty\("--cds-page-bg", "inherit"\);/);
  assert.match(source, /releases\.push\(holdModalInert\(sibling\)\);/);
  assert.doesNotMatch(source, /sibling\.inert \|\|/, 'an already-inert #root (Settings closing) is still held');
});

test('U-05: the narrow threshold is shared-6 Cg\'s 768px', () => {
  assert.equal(NARROW_SESSION_BODY, 768);
  assert.equal(isNarrowSessionBody(767.5), true);
  assert.equal(isNarrowSessionBody(768), false);
  assert.equal(isNarrowSessionBody(1036), false);
  assert.equal(isNarrowSessionBody(Number.NaN), false);
});

test('U-05: main.jsx measures the session body and switches the toggle / panels to the overlay while narrow', () => {
  const main = read('main.jsx');
  assert.match(main, /const sessionBody = useNarrowSessionBody\(\);/);
  assert.match(main, /const activityShown = sessionBody\.narrow \? sessionBody\.overlayOpen : activityInFlow;/);
  assert.match(main, /const toggleActivity = \(\) => sessionBody\.narrow \? sessionBody\.setOverlayOpen\(open => !open\) :/);
  assert.match(main, /activityToggleRef\.current = toggleActivity;/);
  assert.match(main, /<SourceTitlebar surface=\{mode\} activityOpen=\{activityShown\}\s+onToggleActivity=\{toggleActivity\}/);
  assert.match(main, /<div ref=\{sessionBody\.ref\} className="source-chat-body" data-panel-narrow=\{\(mode !== 'code' && sessionBody\.narrow\) \|\| undefined\}>/);
  // chat-cowork-1to1 r2 (cowork-r2-04): xE always renders the aside; activityShown is its `shown` (cn), not a mount condition.
  assert.match(main, /mode !== 'code' && current && section === 'new' && <SourceCoworkProgress [^\n]*\n\s+overlay=\{sessionBody\.narrow\} shown=\{activityShown\} onCloseOverlay=\{\(\) => sessionBody\.setOverlayOpen\(false\)\}/);
  assert.match(main, /<SourceChatArtifactPanel key=\{`\$\{current\}:\$\{chatArtifact\.id\}`\} call=\{call\} overlay=\{sessionBody\.narrow\}/);
});

test('U-05: the overlay arms are c21f11e6d AT\'s (backdrop `as`, aside `ln`), and the artifact panel overlays from the end', () => {
  const surfaces = read('source-surfaces.jsx');
  assert.match(surfaces, /overlay && shown && <div className="absolute inset-0 z-10 bg-neutral-50\/20" onClick=\{\(\) => onCloseOverlay\?\.\(\)\} aria-hidden="true" \/>/);
  // xE's `ln` arm as clsx parts: the shadow / border only while shown (`cn && …`).
  assert.match(surfaces, /\['absolute end-\[var\(--df-ceded-gutter,0px\)\] top-0 z-20 bg-surface-3', 'stacks:bg-surface-2', shown && 'shadow-xl border-s border-strong'\]/);
  const panel = read('source-chat-artifact-panel.jsx');
  assert.match(panel, /overlay && <div className="absolute inset-0 z-10 bg-neutral-50\/20" onClick=\{\(\) => onClose\?\.\(\)\}/);
  const css = read('source-chat-artifact-panel.css');
  assert.match(css, /\.source-chat-body\[data-panel-narrow\] \{ position: relative; \}/);
  assert.match(css, /\.chat-artifact-panel\[data-overlay\] \{[^}]*position: absolute;[^}]*width: min\(100%, 720px\);/);
});

test('U-09: the transcript-end disclaimer keeps the official band classes but drops its -mt-10 tuck', () => {
  const generated = read('generated/chat-messages-v4/disclaimer.mjs');
  assert.match(generated, /"pointer-events-auto relative z-0 -mt-10 bg-page pb-2 pt-12 text-center text-xs text-muted-as-secondary"/);
  assert.match(read('source-transcript.jsx'), /<SourceChatDisclaimer conversationUuid=\{messageActions\.threadId\}/);
  assert.match(read('source-transcript.css'), /\.source-transcript-content > \[data-disclaimer\] \{ margin-top: 0; \}/);
});
