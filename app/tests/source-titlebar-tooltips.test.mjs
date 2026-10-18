import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { RELEASE_NOTES } from '../src/release-notes.mjs';

// c360a9e1c-GPs-MV9u.js yp (6347-6360), mm (7387-7420) and Fp (6760-6810): the
// origin glyph, title button and folder pill use CDS tooltips (Zt), so the SSR
// lead carries no native title.
let server, T;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // SourceDialog portals to <body>; the server renderer has no portals, so render them inline (as
  // settings-shell-render does) before the first ESM import of react-dom.
  createRequire(path.resolve(import.meta.dirname, '../package.json'))('react-dom').createPortal = (children) => children;
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
});
after(() => server?.close());
const render = (props) => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {}, ...props }));
// R3-topbar TT-03: the lead ends where the trailing cluster starts (the local measurement spans are gone).
const lead = (html) => html.slice(html.indexOf('<div class="st-lead'), html.indexOf('<div class="st-trailing'));

test('no native title on .st-origin, .st-title or .st-folder', () => {
  for (const props of [{}, { menuKind: 'folder' }, { session: { id: 'b', name: 'No folder' } }]) {
    const html = lead(render(props));
    for (const name of ['st-origin', 'st-origin-glyph', 'session-title st-title', 'st-folder']) {
      const tag = html.match(new RegExp(`<[a-z]+[^>]*class="${name}"[^>]*>`))?.[0];
      assert.ok(tag, name + ' renders');
      assert.doesNotMatch(tag, /title=/, name);
    }
    assert.doesNotMatch(html, /\stitle="/);
  }
  const html = lead(render({}));
  assert.match(html, /aria-label="A title, rename session"/);
  assert.match(html, /role="img" aria-label="Local"/);
  assert.match(html, /aria-label="Folder: \/tmp\/work"/);
});

// titlebar-release-notes.js:5238-5256 V: the home nudge renders only while
// `justUpdated || modalOpen`; main.jsx passes that as showWhatsNew.
test('home What’s new button follows showWhatsNew', async () => {
  const home = (props) => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', session: null, onRename() {}, ...props }));
  assert.doesNotMatch(home({ showWhatsNew: false }), /st-whats-new|What’s new/);
  assert.doesNotMatch(home({}), /st-whats-new/);
  assert.match(home({ showWhatsNew: true }), /<button type="button" class="st-whats-new">What’s new<\/button>/);
  assert.doesNotMatch(render({ showWhatsNew: true }), /st-whats-new/);
  // R03: the nudge versions come from the bundled, versioned release notes, not from the running package version.
  const notes = await server.ssrLoadModule('/src/release-notes.mjs');
  assert.deepEqual([...T.LOCAL_RELEASE_NOTE_VERSIONS], notes.RELEASE_NOTES.map((entry) => entry.version));
});

// Fidelity F02 (shared-frame-C_2npUJq.js:4572-4580 Mu → Qa variant "text"): tooltip shortcuts are key specs
// that the tooltip draws as one <kbd> per key in io modifier order, so Changes reads ⇧ ⌘ D, not ⌘⇧D.
test('titlebar tooltips carry key specs; the text-variant Shortcut draws Changes as ⇧ ⌘ D', async () => {
  const S = await server.ssrLoadModule('/src/source-shortcut.jsx');
  const C = await server.ssrLoadModule('/src/code-ui.jsx');
  const N = await server.ssrLoadModule('/src/source-nav-buttons.jsx');
  assert.equal(T.CHANGES_TOOLTIP.shortcut, 'cmd+shift+d');
  assert.equal(C.SIDEBAR_TOGGLE_TOOLTIP.hide.shortcut, 'cmd+b');
  assert.deepEqual([N.NAV_TOOLTIPS.back.shortcut, N.NAV_TOOLTIPS.forward.shortcut], ['cmd+[', 'cmd+]']);
  const glyphs = (keys) => [...renderToStaticMarkup(React.createElement(S.SourceShortcut, { keys, variant: 'text', mac: true }))
    .matchAll(/<kbd class="scds-text-key">(?:<span aria-hidden="true">)?([^<]+)/g)].map((match) => match[1]);
  assert.deepEqual(glyphs(T.CHANGES_TOOLTIP.shortcut), ['⇧', '⌘', 'D']);
  assert.deepEqual(glyphs(C.SIDEBAR_TOGGLE_TOOLTIP.show.shortcut), ['⌘', 'B']);
  assert.deepEqual(glyphs(N.NAV_TOOLTIPS.back.shortcut), ['⌘', '[']);
  assert.deepEqual(glyphs('cmd+shift+\\'), ['⇧', '⌘', '\\']);
  assert.deepEqual(glyphs('enter'), ['⏎']);
  // The tooltip renders that variant for `shortcut` and `secondaryHint.shortcut`.
  const tooltip = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-tooltip.jsx'), 'utf8');
  assert.match(tooltip, /<SourceShortcut variant="text" keys=\{keys\} className="source-tooltip-shortcut" \/>/);
  assert.match(tooltip, /\{shortcut && <TooltipShortcut keys=\{shortcut\} \/>\}/);
  assert.match(tooltip, /<TooltipShortcut keys=\{secondaryHint\.shortcut\} \/>/);
});

// R03 (titlebar-release-notes.js:5156-5236 B): What’s new is the shared CDS Dialog at size md with the bleed header and
// a single 'Close'; the lag note z; one section per entry up to the running version with an h4 date and a neutral
// font-mono version Badge; New / Improved / Fixed groups (empty ones omitted); `code` spans; the limits footnote.
test('LocalReleaseNotes is the bleed md SourceDialog with versioned entries', () => {
  const hadDocument = 'document' in globalThis;
  if (!hadDocument) globalThis.document = { body: {}, documentElement: { getAttribute: () => null } };
  let html;
  try { html = renderToStaticMarkup(React.createElement(T.LocalReleaseNotes, { onClose() {} })); }
  finally { if (!hadDocument) delete globalThis.document; }
  assert.match(html, /<section[^>]*role="dialog"[^>]*data-cds="Dialog" data-dialog-size="md"[^>]*class="sdlg-popup cds-reset st-release-notes"/);
  assert.match(html, /<header class="sdlg-bleed-header"><h2 id="[^"]+" class="sdlg-bleed-title">What’s new<\/h2>/);
  assert.deepEqual([...html.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1]), ['Close']);
  assert.match(html, /<p class="st-release-note">These release notes are included with this version of the app and may be one release behind\.<\/p>/);
  assert.match(html, /<div class="st-release-date"><h4>October 1, 2026<\/h4><span class="st-release-version" data-cds="Badge" data-variant="neutral">0\.2\.130<\/span><\/div>/);
  assert.deepEqual([...html.matchAll(/<h5>([^<]+)<\/h5>/g)].map((match) => match[1]), RELEASE_NOTES.flatMap(() => ['New', 'Improved']));
  assert.match(html, /<code class="st-release-code">~\/\.dsh<\/code>/);
  // /fork, /review and /rewind ship (session-command-model.mjs): the limits only say they depend on the running core.
  assert.match(html, /<p class="st-release-limits">Known limits: Some commands, such as \/fork, \/review and \/rewind, depend on the running core; the slash menu says when one isn’t available\./);
  assert.doesNotMatch(html, /aren’t available yet|Background jobs don’t appear/);
  // The notes are core-neutral: they describe the frame and name DeepSeek Harness only as the built-in core.
  assert.match(html, /OpenClaude Desktop is now a frame for agent cores: choose one in Settings › Cores\./);
  assert.match(html, /DeepSeek Harness is built in; the others install on demand/);
  assert.doesNotMatch(html, /powered by DeepSeek|run on DeepSeek models/);
  assert.equal([...html.matchAll(/<li[ >]/g)].length, RELEASE_NOTES.reduce((sum, entry) => sum + entry.items.length, 0), 'one list item per bundled note');
  assert.doesNotMatch(html, /Codex|modal-backdrop|st-release-header|Close release notes|title="/);
});

// Split view (2.31226.0 shared-21 VT): an extra pane's titlebar ends with a ghost 'Close pane' X
// (epitaxy-pane-close-control); main.jsx passes onCloseSplit to secondary panes only, so the primary pane and an
// unsplit window have none. R2-topbar TT-02 (2.42304.0 cc43287c9 wW): its Button carries `shortcut: Dh(Ni())`
// (shared-20 UO: "cmd+ctrl+w" on macOS, the local ⌃⌘W split close) and `rm("text-secondary")`.
test('a secondary pane closes itself from the end of its own titlebar, naming ⌃⌘W', async () => {
  const plain = render({});
  assert.doesNotMatch(plain, /data-split-close|Close split view|Close pane/);
  const html = render({ onCloseSplit() {} });
  const trailing = html.slice(html.indexOf('st-trailing'));
  const close = trailing.match(/<button[^>]*data-split-close=""[^>]*>/)?.[0];
  assert.ok(close, 'close control renders in the trailing actions');
  assert.match(close, /class="code-icon-button epitaxy-pane-close-control text-secondary"/);
  assert.match(close, /aria-label="Close pane"/);
  assert.match(close, /aria-keyshortcuts="Control\+Meta\+w"/);
  assert.doesNotMatch(close, /title=/);
  assert.ok(trailing.lastIndexOf('data-split-close') > trailing.lastIndexOf('View options'), 'after View options');
  // Close pane is not part of the held cluster: a loading session's close stays live.
  assert.doesNotMatch(render({ onCloseSplit() {}, loading: true }).match(/<button[^>]*data-split-close=""[^>]*>/)[0], /inert|disabled/);
  // No session (a new-session pane) still has its close.
  assert.match(render({ session: null, onCloseSplit() {} }), /data-split-close=""/);
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-titlebar.jsx'), 'utf8');
  const control = source.slice(source.indexOf('{onCloseSplit && ('), source.indexOf('onClick={onCloseSplit}'));
  assert.match(control, /shortcut: CLOSE_PANE_SHORTCUT,/);
  const M = await server.ssrLoadModule('/src/titlebar-controls-model.mjs');
  assert.equal(M.CLOSE_PANE_SHORTCUT, 'cmd+ctrl+w');
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-20-B7UqYfsi.js'), 'utf8');
  assert.ok(official.includes('function UO(e){return e?"cmd+ctrl+w":"ctrl+alt+w"}'));
  // The keycap text the tooltip draws for it (macOS order ⌃ ⌘ W).
  const S = await server.ssrLoadModule('/src/source-shortcut.jsx');
  const glyphs = [...renderToStaticMarkup(React.createElement(S.SourceShortcut, { keys: M.CLOSE_PANE_SHORTCUT, variant: 'text', mac: true }))
    .matchAll(/<kbd class="scds-text-key">(?:<span aria-hidden="true">)?([^<]+)/g)].map((match) => match[1]);
  assert.deepEqual(glyphs, ['⌃', '⌘', 'W']);
});

// R2-topbar TT-02 (2.42304.0 cc43287c9 wW `Me`, c73f45bc3 Rh landing branch): the Code New session page's title is
// the official h1[data-pane-title], and its toggles are Terminal, Preview, then Files (filesAvailable, main.jsx).
const DRAFT_H1 = '<h1 data-pane-title="" class="draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary">New session</h1>';
test('Code draft page: the official h1 title and the landing toggles Terminal → Preview → Files', () => {
  const draft = (props) => render({ session: null, ...props });
  const html = draft({ terminalAvailable: true, previewAvailable: true, filesAvailable: true });
  assert.ok(html.includes(DRAFT_H1), html);
  assert.doesNotMatch(html, /st-draft-title/);
  const toggles = [...html.matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(toggles, ['terminal', 'preview', 'files']);
  // Landing: no Changes, no ⋮ (Zh needs a session).
  assert.doesNotMatch(html, /aria-label="Changes"|View options/);
  const files = html.match(/<button[^>]*data-pane-toggle="files"[^>]*>/)[0];
  assert.match(files, /class="code-icon-button text-secondary"/);
  assert.match(files, /aria-label="Files"/);
  assert.match(files, /aria-keyshortcuts="Meta\+Shift\+F"/);
  // Files only where main.jsx can open the pane on the page's folder.
  assert.deepEqual([...draft({ terminalAvailable: true, previewAvailable: true }).matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]), ['terminal', 'preview']);
  // Only Code has the draft title; other surfaces and other sections keep theirs.
  assert.doesNotMatch(draft({ surface: 'cowork' }), /data-pane-title/);
  assert.doesNotMatch(render({ section: 'routines', session: null, sectionLabel: 'Routines' }), /data-pane-title/);
  // A session's title bar has no draft h1 and always lists Files (after Changes and Preview).
  const session = render({ previewAvailable: true, terminalAvailable: true });
  assert.doesNotMatch(session, /data-pane-title/);
  assert.deepEqual([...session.matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]), ['terminal', 'preview', 'files']);
  assert.ok(session.indexOf('aria-label="Changes"') < session.indexOf('data-pane-toggle="preview"'));
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-titlebar.css'), 'utf8');
  assert.doesNotMatch(css, /\.st-draft-title\s*\{/, 'no local rule over the official utilities');
  const official = (name) => fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
  assert.ok(official('c73f45bc3-CFrHin0p.js').includes('return i?[...o,...r,...s]'));
  assert.ok(official('cc43287c9-DAfOi8yP.js').includes('"data-pane-title":"",className:"draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary"'));
});

// R4g-small SM1 home-07 (shared-20 ah `function ah({environments:e,sessionId:t,phase:n}){return e&&n==="draft"&&!t}`,
// cc43287c9 jre `draftTitle:lh({environments:ie,sessionId:_e,phase:le})?yre:void 0`): no draft title while spawning.
test('home-07: the Code draft title is hidden while the first send spawns', () => {
  const count = (text, needle) => text.split(needle).length - 1;
  const official = (name) => fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
  assert.equal(count(official('shared-20-B7UqYfsi.js'), 'function ah({environments:e,sessionId:t,phase:n}){return e&&n==="draft"&&!t}'), 1);
  assert.equal(count(official('shared-20-B7UqYfsi.js'), 'ah as Qa'), 1);
  const jre = official('cc43287c9-DAfOi8yP.js');
  assert.equal(count(jre, 'draftTitle:lh({environments:ie,sessionId:_e,phase:le})?yre:void 0'), 1);
  assert.equal(count(jre, ',Qa as lh,'), 1);
  const draft = (props) => render({ session: null, terminalAvailable: true, previewAvailable: true, ...props });
  assert.ok(draft({}).includes(DRAFT_H1));
  assert.ok(draft({ spawning: false }).includes(DRAFT_H1));
  const spawning = draft({ spawning: true });
  assert.doesNotMatch(spawning, /data-pane-title/);
  // Only the title goes: the landing toggles stay.
  assert.deepEqual([...spawning.matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]), ['terminal', 'preview']);
  // main.jsx hands the titlebar its spawn phase while no session is open.
  const main = fs.readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  assert.equal(count(main, 'spawning={!current && !!spawnPhase}'), 1);
});

// R4g-small SM1 topbar-04 (D36, c73f45bc3 Rh gate-off row; c26fb8b6b Cn `preview:"Play"`): the Code toggle draws Play,
// is labelled Preview and names ⇧⌘P; other surfaces keep Globe + Browser (the Cowork view's yE counterpart).
test('topbar-04: Code preview toggle is Play + Preview + ⇧⌘P, other surfaces Globe + Browser', () => {
  const glyphs = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/icons.json'), 'utf8'));
  const glyph = (name) => String.fromCodePoint(glyphs[name]);
  const button = (html) => html.slice(html.indexOf('<button', html.lastIndexOf('<button', html.indexOf('data-pane-toggle="preview"'))), html.indexOf('</button>', html.indexOf('data-pane-toggle="preview"')));
  for (const props of [{}, { session: null }, { previewRunning: true }]) {
    const html = button(render({ previewAvailable: true, ...props }));
    assert.match(html, /aria-keyshortcuts="Meta\+Shift\+P"/);
    assert.ok(html.includes(glyph('Play')), 'Play glyph');
    assert.ok(!html.includes(glyph('Globe')), 'no Globe glyph');
    assert.match(html, props.previewRunning ? /aria-label="Preview \(dev server running\)"/ : /aria-label="Preview"/);
  }
  const other = button(render({ surface: 'cowork', previewAvailable: true }));
  assert.match(other, /aria-label="Browser"/);
  assert.ok(other.includes(glyph('Globe')));
});

// R2-topbar TT-02 (cc43287c9 wW `div{ref:he,inert:!B,className:"flex items-center gap-1 empty:hidden"}`, c73f45bc3
// Zh `inert:l`): a held (loading) session keeps its toggles and ⋮ in place, inert, at full colour (no disabled).
test('a loading session holds the toggle group and ⋮ inert instead of disabled', () => {
  const props = { terminalAvailable: true, previewAvailable: true, loading: true };
  const html = render(props);
  const trailing = html.slice(html.indexOf('st-trailing'));
  const group = trailing.match(/<div class="flex items-center gap-1 empty:hidden"[^>]*>/)?.[0];
  assert.ok(group, 'the toggle group wraps the toggles');
  assert.match(group, /\sinert=""/);
  const inside = trailing.slice(trailing.indexOf(group), trailing.indexOf('aria-label="View options'));
  assert.deepEqual([...inside.matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]), ['terminal', 'preview', 'files']);
  assert.match(inside, /aria-label="Changes"/);
  for (const button of trailing.match(/<button[^>]*>/g)) assert.doesNotMatch(button, /\sdisabled(=|\s|>)/, button);
  const more = trailing.match(/<button[^>]*aria-label="View options"[^>]*>/)[0];
  assert.match(more, /\sinert=""/);
  assert.match(more, /class="code-icon-button text-secondary"/);
  // Ready: neither is inert.
  const ready = render({ ...props, loading: false });
  assert.doesNotMatch(ready.slice(ready.indexOf('st-trailing')), /\sinert=/);
  // The draft page is never held; an empty group hides itself (empty:hidden) and renders no children.
  assert.match(render({ session: null }), /<div class="flex items-center gap-1 empty:hidden"><\/div>/);
  // lW / Zh / DW: every cluster control carries text-secondary; a pressed toggle keeps is-selected.
  const open = render({ terminalAvailable: true, panes: new Set(['terminal', 'changes']) });
  assert.match(open.match(/<button[^>]*data-pane-toggle="terminal"[^>]*>/)[0], /class="code-icon-button text-secondary is-selected"/);
  const popout = render({ popoutWindow: { alwaysOnTop: true, onDock() {}, onTogglePin() {} } });
  assert.match(popout.match(/<button[^>]*data-popout-dock=""[^>]*>/)[0], /class="code-icon-button text-secondary"/);
  assert.match(popout.match(/<button[^>]*data-popout-pin=""[^>]*>/)[0], /class="code-icon-button text-secondary is-selected"/);
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c73f45bc3-CFrHin0p.js'), 'utf8');
  assert.ok(official.includes('className:f,"aria-label":d,inert:l'));
});

// R2-topbar TT-02 (cc43287c9 _W): the caret's tooltip is `Ge` (title cut to 80 graphemes), its aria-label `He` (full).
test('the caret keeps the full title as its label and the 80-grapheme cut as its tooltip', () => {
  const name = 'A'.repeat(120);
  const caret = lead(render({ session: { id: 'a', name, cwd: '/tmp/work' } })).match(/<button[^>]*st-session-caret[^>]*>/)[0];
  assert.match(caret, new RegExp(`aria-label="More options for ${name}"`));
  assert.match(caret, /class="code-icon-button st-session-caret text-secondary"/);
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-titlebar.jsx'), 'utf8');
  assert.match(source, /const sessionMenuTooltip = sessionMenuTriggerTooltip\(title\);/);
  assert.match(source, /tooltip=\{\{ content: sessionMenuTooltip, side: "bottom"/);
});

// B09 (c593f7513 Om/wm, 7520-7540 and 8150-8210): the Code title is followed by the header session menu's CaretDown
// trigger ('More options for {title}', CDS tooltip, opens 'session-title'), then the folder chip; the trailing ⋮ is
// 'View options'. vm (7270-7300): the title tooltip resolves lazily (truncated title, else Rename).
test('Code title bar: CaretDown session menu beside the title and the View options overflow', () => {
  const opened = [];
  const html = render({ onMenu: (...args) => opened.push(args) });
  const leadHtml = lead(html);
  const caret = leadHtml.match(/<button[^>]*class="code-icon-button st-session-caret text-secondary"[^>]*>/)?.[0];
  assert.ok(caret, 'caret renders in the lead');
  assert.match(caret, /aria-label="More options for A title"/);
  assert.match(caret, /aria-haspopup="menu"/);
  assert.match(caret, /aria-expanded="false"/);
  assert.doesNotMatch(caret, /title=/);
  assert.ok(leadHtml.indexOf('st-session-caret') > leadHtml.indexOf('class="session-title st-title"'), 'after the title');
  assert.ok(leadHtml.indexOf('st-session-caret') < leadHtml.indexOf('class="st-folder"'), 'before the folder chip');
  assert.match(render({ menuKind: 'session-title' }), /class="code-icon-button st-session-caret text-secondary"[^>]*aria-expanded="true" data-popup-open=""/);
  // shared-21 IV contextMenuAt: the title's right-click is a ContextMenu at the cursor, not the caret's popup.
  assert.match(render({ menuKind: 'session-title', menuAtPointer: true }), /class="code-icon-button st-session-caret text-secondary"[^>]*aria-expanded="false"/);
  const trailing = html.slice(html.indexOf('st-trailing'));
  assert.match(trailing, /aria-label="View options"/);
  assert.doesNotMatch(html, /Session options/);
  // Other surfaces keep their own CaretDown 'Session options' and no Code caret.
  const cowork = lead(render({ surface: 'cowork' }));
  assert.doesNotMatch(cowork, /st-session-caret/);
  assert.match(cowork, /aria-label="Session options"/);
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-titlebar.jsx'), 'utf8');
  assert.match(source, /<SourceTooltip content=\{\(\) => titleTooltipContent\(titleButton\.current, title\)\}>/);
  assert.match(source, /onContextMenu=\{openSessionContextMenu\}/);
  assert.match(source, /onMenu\?\.\(sessionMenuKind, event\.currentTarget, session, undefined, \{ x: event\.clientX, y: event\.clientY \}\)/);
});

// R3-topbar TT-02 (2.42304.0 cc43287c9 wW `R ? xW : Wee`, c73f45bc3 n_ and T_): until the session is ready the Code lead
// is n_ (generated titlebar-title-skeleton.mjs): the known title as a non-interactive span[data-pane-title] beside an
// aria-hidden caret slot, or the pulsing title ghost when no title is known; there is no caret, and the folder pill is
// the static Bg branch (a cursor-default span) only once the title is known. Ready, the title button, caret and folder
// menu button are back, none of them disabled.
const SKELETON = '<span class="flex items-center min-w-[calc(32px+var(--cds-h-control,24px))] group-data-[pills-compact]/lead:min-w-[calc(8px+var(--cds-h-control,24px))]">'
  + '<span class="flex items-center min-w-[32px] group-data-[pills-compact]/lead:min-w-[8px]"><span data-slot="title-preview" data-pane-title="" class="truncate text-body font-medium font-control text-primary select-none">A title</span></span>'
  + '<span aria-hidden="true" data-slot="title-caret-slot" class="aspect-square w-control shrink-0"></span></span>';
const GHOST = '<span aria-hidden="true" data-slot="title-ghost" class="h-[1lh] w-[24ch] max-w-full shrink text-body-medium rounded-[3px] bg-alpha-2 motion-safe:animate-pulse"></span>';
test('a loading Code session shows the official title skeleton, no caret, and a static folder pill', () => {
  const known = lead(render({ loading: true }));
  assert.ok(known.includes(SKELETON), known);
  assert.match(known, /^<div class="st-lead group\/lead">/);
  assert.doesNotMatch(known, /st-session-caret|class="session-title st-title"|More options/);
  assert.doesNotMatch(known, /\sdisabled(=|\s|>)/);
  assert.match(known, /<span class="st-folder cursor-default"><span aria-hidden="true" data-cds="Icon" class="st-folder-glyph"[^>]*>[^<]*<\/span><span class="st-folder-label" data-testid="epitaxy-origin-label">work<\/span><\/span>/);
  assert.doesNotMatch(known, /<button[^>]*class="st-folder"/);
  assert.match(known, /<span class="st-visually-hidden" role="status">Loading session<\/span>/);
  // LTR: qb gives no dir attribute.
  assert.doesNotMatch(known, /\sdir=/);
  // The preview text is the known title (wW `ue`): the name, else the first prompt.
  assert.ok(lead(render({ loading: true, session: { id: 'a', preview: 'A title', cwd: '/tmp/work' } })).includes(SKELETON));
  // No title yet: the ghost only, no folder pill (T_ `l && de`).
  const unknown = lead(render({ loading: true, session: { id: 'a', cwd: '/tmp/work' } }));
  assert.ok(unknown.includes(`<div class="st-title-and-pill">${GHOST}</div>`), unknown);
  assert.doesNotMatch(unknown, /st-folder|st-title-skeleton|Untitled/);
  // Ready: title button, caret and folder button, nothing disabled.
  const ready = lead(render({}));
  assert.match(ready, /<button type="button" class="session-title st-title"/);
  assert.match(ready, /class="code-icon-button st-session-caret text-secondary"/);
  assert.match(ready, /<button type="button" class="st-folder" aria-label="Folder: \/tmp\/work"/);
  assert.doesNotMatch(ready, /\sdisabled(=|\s|>)|data-slot="title-/);
  // Other surfaces keep their own lead: the local skeleton while an untitled session loads.
  assert.match(lead(render({ surface: 'cowork', loading: true, session: { id: 'a' } })), /<span class="st-title-skeleton" aria-hidden="true"><\/span>/);
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-titlebar.css'), 'utf8');
  assert.doesNotMatch(css, /\.st-folder:disabled/);
  assert.match(css, /\.st-toolbar button\.st-folder:hover,/);
  const official = (name) => fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
  const wW = official('cc43287c9-DAfOi8yP.js');
  assert.ok(wW.includes('R?v(xW,{model:de,titleButtonRef:Ee}):v(Wee,{title:ue,titleRef:Ee})'));
  const c73 = official('c73f45bc3-CFrHin0p.js');
  assert.ok(c73.includes('function n_({title:e,titleRef:t}){'));
  assert.ok(c73.includes('className:`${n?Pg:Mg} cursor-default`'));
});
