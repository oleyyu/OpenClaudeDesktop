// W14-code round 3, lane "composer-band" (plan-w14-code.md §4, E94; data/w14code/round3/lanes/composer-band.json):
// attachment staging / partial-success notes as warning toasts (r3-composer-01/02), the default-view nudge
// (r3-composer-04), sr-only (r3-composer-05), the band column (css3-band-column-width), data-band-enter
// (css3-archived-band-enter = fr3-04), the side chat's Code card (css3-side-chat-composer), the sidebar row More
// (fr3-01, fr3-06 = R3DC-02), the tray boot fade (fr3-05) and the dead IconButton (R3DC-01). Source, SSR and pure models
// only; the official chunks are read as text, never executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  VIEW_NUDGE_STORAGE_KEY, VIEW_NUDGE_DELAY, sessionViewHash, normalizeViewNudges, recordViewPick, markViewNudged, readViewNudges, writeViewNudges,
  viewNudgeApplies,
} from '../src/transcript-view-model.mjs';
import zhApp from '../electron/i18n/zh-CN/app.mjs';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(assets, file), 'utf8').replace(/\\u2019/g, '’');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const rules = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('r3-composer-01: staging notices are c0fbbe82d addWarning toasts with Ma = 8e3, one per notice (Code)', () => {
  const ha = official('c0fbbe82d-COsmfHJY.js');
  for (const id of ['2jkIk4kqLa', 'Okt7cSOonY']) assert.ok(new RegExp(`id:"${id}"\\}\\),\\{timeout:Ma\\}`).test(ha), id);
  assert.ok(ha.includes('var Ma=8e3'));
  assert.ok(ha.includes('{addError:p,addWarning:m}=Re()'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('const stagingNotices = (notices) => { if (!notices?.length) return; if (mode === "code" && toasts) for (const notice of notices) toasts.add(notice, { variant: "warning", timeout: MAX_IMAGES_TIMEOUT }); else setError(notices.join("\\n")); };'));
  // W14-code r4-composer-04: Ha raises addWarning from the handler, not a state updater; the updater returns its
  // notices and stageAttachments shows them once, after it (Add folder paths, Capture screen, Add files).
  assert.equal(main.match(/stagingNotices\(staged\.notices\);/g), null);
  assert.equal(main.match(/return \{ entries: next, notices: staged\.notices \};/g).length, 4, 'Add folder paths, queue edit, Capture screen, Add files');
  assert.match(main, /const stageAttachments = \(compute, follow = stagingNotices\) => \{[\s\S]{0,200}notices = result\.notices \?\? \[\];\n\s+if \(!scheduled\) \{ scheduled = true; queueMicrotask\(\(\) => follow\(notices\)\); \}\n\s+return result\.entries;/);
  assert.doesNotMatch(main, /if \(staged\.notices\.length\) setError/);
  assert.ok(main.includes('if (event.context.screenshot && !imagesAllowed && !imageFallback) { stagingNotices([imageNotice]); return; }'));
  const follow = main.slice(main.indexOf('function followStaging('), main.indexOf('// Trusted files:search'));
  assert.match(follow, /if \(notices\.length && mode === "code" && toasts\) stagingNotices\(notices\);\n\s+else if \(notices\.length\) \{/);
  // 5zZ44MiUDg is addError (p) in Ha: a danger toast in Code.
  assert.ok(ha.includes('p(f.formatMessage({defaultMessage:"Failed to process image. You can try again.",id:"5zZ44MiUDg"})'));
  assert.match(follow, /toasts\.add\(t\(IMAGE_PROCESS_ERROR\), \{ variant: "danger" \}\)/);
});

test('r3-composer-02: partial successes are warning toasts; only b.error stays the error card', () => {
  const cc = official('cc43287c9-Me-M2ucD.js');
  assert.ok(cc.includes('id:"LPNNW+cd/e"}),{timeout:nT})'));
  const main = read('src/main.jsx');
  assert.equal(main.match(/if \(result\.warning\) codeWarning\(result\.warning\);/g).length, 2, 'fork from session-action and from the row');
  assert.ok(main.includes('if (result?.running) { codeWarning(t("The command is still running in the terminal, so its output wasn’t sent.")); return; }'));
  assert.ok(main.includes('if (mode === "code" && toasts) { setError(b.error || ""); for (const warning of b.warnings ?? []) codeWarning(warning); }'));
  assert.ok(main.includes('if (mode === "code" && toasts) { setError(""); for (const warning of b.warnings ?? []) codeWarning(warning); }'));
  assert.doesNotMatch(main, /setError\(result\.warning\)|setError\(t\("The command is still running/);
});

test('r3-composer-04: the default-view nudge model is cc43287c9 TV / wV / EV / kV with Mn = FNV-1a', () => {
  const cc = official('cc43287c9-Me-M2ucD.js');
  assert.ok(cc.includes('xV="epitaxy-default-transcript-view-nudge",SV=1500'));
  assert.equal(VIEW_NUDGE_STORAGE_KEY, 'epitaxy-default-transcript-view-nudge');
  assert.equal(VIEW_NUDGE_DELAY, 1500);
  assert.ok(official('shared-0-DDOOdL6P.js').includes('let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0'));
  assert.equal(sessionViewHash(''), (2166136261).toString(16));
  assert.equal(sessionViewHash('a'), 'e40c292c');
  assert.deepEqual(normalizeViewNudges({ thinking: 'ab', verbose: true, normal: 3, junk: true }), { thinking: 'ab', verbose: true });
  const first = recordViewPick({}, 'verbose', 'h1');
  assert.deepEqual(first, { next: { verbose: 'h1' }, due: false });
  assert.deepEqual(recordViewPick(first.next, 'verbose', 'h1'), { next: first.next, due: false });
  assert.deepEqual(recordViewPick(first.next, 'verbose', 'h2'), { next: first.next, due: true });
  const shown = markViewNudged(first.next, 'verbose');
  assert.deepEqual(shown, { verbose: true });
  assert.equal(recordViewPick(shown, 'verbose', 'h3').due, false);
  const store = new Map(), storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.deepEqual(readViewNudges(storage), {});
  writeViewNudges(storage, { thinking: 'x' });
  assert.deepEqual(readViewNudges(storage), { thinking: 'x' });
  assert.equal(viewNudgeApplies({ view: 'verbose', sessionId: 's', currentSessionId: 's', shownView: 'verbose', defaultView: 'normal' }), true);
  assert.equal(viewNudgeApplies({ view: 'normal', sessionId: 's', currentSessionId: 's', shownView: 'normal', defaultView: undefined }), false, 'the default');
  assert.equal(viewNudgeApplies({ view: 'verbose', sessionId: 's', currentSessionId: 't', shownView: 'verbose', defaultView: 'normal' }), false, 'another session open');
  assert.equal(viewNudgeApplies({ view: 'verbose', sessionId: 's', currentSessionId: 's', shownView: 'thinking', defaultView: 'normal' }), false, 'moved on');
});

test('r3-composer-04: main.jsx shows OV\'s toast (title, description, Make default → DV) and every pick goes through jV', () => {
  const cc = official('cc43287c9-Me-M2ucD.js');
  for (const text of ['"Make {mode} your default view?",id:"Idee9t9yBO"', '"You’ve picked {mode} in more than one session. You can change the default anytime in Settings.",id:"Faw+gR5VMf"',
    '"Make default",id:"duoFVOQw++"', '"{mode} is now the default view.",id:"jErybbljtP"', 'i==="keyboard"?AV(r,n,t):kV(r,n,t)'])
    assert.ok(cc.includes(text), text);
  const main = read('src/main.jsx');
  for (const text of ['t("Make {mode} your default view?", { mode: label })', 't("You’ve picked {mode} in more than one session. You can change the default anytime in Settings.", { mode: label })',
    'action: { label: t("Make default"), onClick: () => {', 'updatePreferences({ transcriptView: view }).catch(actionFailed("save-preference"));',
    'toasts.add(t("{mode} is now the default view.", { mode: label }));', 'writeViewNudges(localStorage, markViewNudged(readViewNudges(localStorage), view));',
    'if (via === "keyboard") viewNudge.current.timer = setTimeout(', 'pickSessionView(current, nextTranscriptView(transcriptView, { hasThinking }), "keyboard");',
    'pickSessionView(sessionId, row.view, "view_menu")'])
    assert.ok(main.includes(text), text);
  // W14-code r4-composer-03: the dead working-line thinking toggle (2.2553.1 only) is gone with its two toasts.
  assert.ok(!main.includes('"thinking_toggle"') && !main.includes('Switched transcript view to'));
  assert.doesNotMatch(main, /No nudge toast/);
  for (const key of ['Make {mode} your default view?', 'You’ve picked {mode} in more than one session. You can change the default anytime in Settings.', 'Make default', '{mode} is now the default view.'])
    assert.ok(zhApp[key], key);
});

test('r3-composer-05: the Bash status and worktree description are official sr-only', () => {
  const composer = read('src/source-composer.jsx');
  assert.ok(official('c227f4d5e-B-FYKrwT.js').includes('y("span",{role:"status",className:"sr-only",children:U?Ae.status:'));
  assert.ok(official('cc43287c9-Me-M2ucD.js').includes('p("span",{id:A,className:"sr-only",children:j})'));
  assert.ok(composer.includes('{bashAvailable && <span className="sr-only" role="status" data-bash-status="">'));
  // (W14-code r8 css8-classic-context-row-dead, E95: the classic row's worktree label, and its sr-only description, is gone.)
  assert.ok(!composer.includes('worktreeDescriptionId'));
  assert.doesNotMatch(composer, /sc-sr-only|getAssistantName/);
});

test('css3-band-column-width: the bands share the composer column (shared-6 yg / gg)', () => {
  const css = read('src/source-composer.css');
  assert.ok(official('shared-6-sd9jbJqs.js').includes('[@container_tile-slot_(max-width:560px)]:[--chat-gutter:16px]'));
  assert.ok(css.includes('.composer-error:not(.inline-error), .ssn-list, .sqm-band {\n  --chat-column-gutter-start: var(--chat-gutter-start, var(--chat-gutter, 32px));\n  --chat-column-gutter-end: var(--chat-gutter-end, var(--chat-gutter, 32px));\n  width: 100%;\n  max-width: calc(var(--local-transcript-width, 768px) + var(--chat-column-gutter-start) + var(--chat-column-gutter-end));\n  padding-inline: var(--chat-column-gutter-start) var(--chat-column-gutter-end);\n  align-self: center;\n}'));
  assert.ok(css.includes('.btw-pane .sqm-band { padding-inline: 0; }'));
  for (const file of ['src/message-style.css', 'src/source-session-notices.css', 'src/source-queued-messages.css'])
    assert.doesNotMatch(rules(read(file)).replace(/\.inline-error\.composer-error \{[^}]*\}/, ''), /calc\(100% - 64px\)|max-width: 768px/, file);
});

test('css3-archived-band-enter / fr3-04: the composer column carries c0b46114c\'s data-band-enter; the band transition is shared-styles\'', () => {
  const band = official('c0b46114c-Tzv34BiL.js');
  assert.ok(band.includes('function g(e){return h(e,()=>(e.dataset.bandEnter="",()=>{delete e.dataset.bandEnter}))}'));
  assert.ok(official('cc43287c9-Me-M2ucD.js').includes('Ye=Zre(Je)'));
  const generated = read('src/generated/session-rail-changes/band-enter.mjs');
  assert.ok(generated.includes('(e.dataset.bandEnter = ""),') && generated.includes('export { m as useBandEnter, f as BAND_ENTER_CLASS };'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('const bandEnterRef = useBandEnter(current && !loading ? current : null);'));
  assert.ok(main.includes('<div ref={bandEnterRef} className={`conversation '));
  assert.ok(fs.readFileSync(path.join(app, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8').includes('@starting-style{.epitaxy-root [data-band-enter] .epitaxy-band-enter{opacity:0;translate:0 6px}'));
  const queued = rules(read('src/source-queued-messages.css'));
  assert.doesNotMatch(queued, /@starting-style|\.sqm-band \{[^}]*transition/);
  // Review fix: shared-styles stills it only under prefers-reduced-motion; the local reduce-motion pref must too.
  assert.ok(fs.readFileSync(path.join(app, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8').includes('@media (prefers-reduced-motion:reduce){.epitaxy-root [data-band-enter] .epitaxy-band-enter{transition:none}}'));
  assert.ok(queued.includes('html[data-local-motion="reduce"] .epitaxy-root [data-band-enter] .epitaxy-band-enter { transition: none; }'));
});

test('css3-side-chat-composer: the side chat draws the main Code card (cccc2cf0a UF fp = c227f4d5e jF)', () => {
  assert.ok(official('cccc2cf0a-DhZC33Gc.js').includes('followsTranscriptTextSize:!0,onSubmit:xe,attachmentStrip:Je'));
  const side = read('src/source-side-chat.jsx');
  assert.ok(side.includes('<SourceComposer embedded isPanelActive={false} codeLayout="side-session" commandScope={`side-${threadId}`} draft={value}'));
  assert.ok(side.includes('attachmentStrip={strip}') && side.includes('<ComposerAttachmentTiles previewLayerBase={440} entries={[snippet]}'));
  assert.doesNotMatch(side, /sc-surface|sc-input-row|ssc-field|SourceSettingsButton|useSideChatMentions/);
  assert.equal(fs.existsSync(path.join(app, 'src/use-side-chat-mentions.jsx')), false);
  assert.doesNotMatch(rules(read('src/source-composer.css')), /\.sc-surface|\.sc-input-row|\.sc-composer\[data-drag-over\]/);
  assert.doesNotMatch(read('src/source-side-chat.css'), /\.ssc-field|\.ssc-submit|\.ssc-input/);
  const composer = read('src/source-composer.jsx');
  assert.ok(composer.includes('<ComposerShellParts.Attachments>{attachmentStrip ? <div className="epitaxy-attachment-shelf w-full">{attachmentStrip}</div>'));
  assert.ok(composer.includes('data-mention-open={mentionOpen || emojiOpen || undefined}>'));
  assert.ok(composer.includes('caret={mention.caret} container={mentionContainer}'));
});

test('fr3-01 / fr3-06 / R3DC-01 / R3DC-02: no .code-icon-button / .icon-button host rules or classes', () => {
  assert.ok(official('shared-frame-6jtSkIit.js').includes('ghost:"bg-transparent group-hover/btn:bg-fill-ghost-hover group-[[aria-haspopup][aria-expanded=true]]/btn:bg-fill-ghost-hover"'));
  const sidebar = read('src/source-sidebar.jsx'), style = read('src/style.css'), main = read('src/main.jsx');
  assert.ok(sidebar.includes('className={code ? "source-current-session-more" : "source-session-more"}'));
  assert.doesNotMatch(rules(style), /code-icon-button|(^|[^-\w])\.icon-button/m);
  assert.doesNotMatch(rules(read('src/source-sidebar.css')), /code-icon-button/);
  assert.ok(read('src/source-sidebar.css').includes('.source-session-row .source-session-more {\n  position: absolute;'));
  assert.doesNotMatch(main, /function IconButton\(|const shortDate =|"icon-button /);
});

test('fr3-05: the sidebar tray is shared-22 GI `i(Ys, "df-bottom-tray shrink-0")`', () => {
  assert.ok(official('shared-22-Bwn3sJTG.js').includes('i(Ys,"df-bottom-tray shrink-0")'));
  assert.ok(official('shared-5-Bg6ZMqvt.js').includes('var pS="static-composer-boot-fade"'));
  assert.ok(read('src/source-sidebar.jsx').includes('<div className={`${staticComposerBootFade} df-bottom-tray shrink-0`}>'));
});

test('css3-dead-rules ③: .detail-panel keeps only what no tile rule overrides', () => {
  const css = read('src/message-style.css');
  assert.match(css, /\.detail-panel \{\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n\}/);
  assert.match(css, /\.detail-panel > header \{\n  font-size: 13px;\n\}/);
  assert.match(read('src/source-tile-layout.css'), /\.source-side-tile \.detail-panel \{[^}]*flex: 1;[^}]*border-left: 0;/);
});
