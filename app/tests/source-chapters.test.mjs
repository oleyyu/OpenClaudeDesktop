// SSR of the session chapter surfaces (source-chapters.jsx): the CX heading, wX's hidden/renamed state from the
// chapter store, the M9 title reveal, the tb rail markup, and the H6e Pin action in the turn footer.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

let server, C, F, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-chapters.jsx');
  F = await server.ssrLoadModule('/src/source-turn-footer.jsx');
  M = await server.ssrLoadModule('/src/session-chapters-model.mjs');
});
after(() => server?.close());
const h = React.createElement;

test('CX: an h2 addressed as epitaxy-ch-<id>; an empty title is aria-hidden', () => {
  const html = renderToStaticMarkup(h(C.SourceChapterHeading, { id: 'uch-1', title: 'Parser fix', sessionId: 's1', source: 'user' }));
  // W14-code r8 css8-chapter-heading-handcopy: 3.6556.2 c96d752d0 GY's class string (source-message is the row hook).
  assert.equal(html, '<h2 id="epitaxy-ch-uch-1" class="source-message text-body-semibold text-primary select-text scroll-mt-[56px]" data-chapter="" data-chapter-source="user">Parser fix</h2>');
  assert.match(renderToStaticMarkup(h(C.SourceChapterHeading, { id: 'e', title: '', sessionId: 's1' })), /aria-hidden="true"/);
});

test('wX: the store hides or renames a Claude chapter (SSR reads the empty server snapshot)', () => {
  const html = renderToStaticMarkup(h(C.SourceClaudeChapter, { sessionId: 's1', id: 'ch1', title: 'Implementation', itemId: 'ch1' }));
  assert.match(html, /data-transcript-item-id="ch1">Implementation<\/h2>$/);
  // The view the component derives from a store state (chapterView): hidden wins, a rename replaces the title.
  let state = M.renameChapter(M.EMPTY_CHAPTER_STATE, 's1', 'ch1', 'Build');
  assert.deepEqual(M.chapterView(state, 's1', 'ch1'), { hidden: false, renamedTitle: 'Build' });
  state = M.setChapterHidden(state, 's1', 'ch1', true);
  assert.equal(M.chapterView(state, 's1', 'ch1').hidden, true);
});

test('M9: skipInitialReveal renders plain text; otherwise an sr-only copy and per-grapheme spans', () => {
  assert.equal(renderToStaticMarkup(h(C.SourceTitleReveal, { text: 'Hi', skipInitialReveal: true })), 'Hi');
  const html = renderToStaticMarkup(h(C.SourceTitleReveal, { text: 'a b' }));
  assert.match(html, /^<span class="sr-only">a b<\/span><span aria-hidden="true" data-revealing="" class="sch-reveal">/);
  assert.match(html, /<span class="sch-grapheme" style="--i:1"> <\/span>/);
  assert.deepEqual(C.titleGraphemes('é👍🏽'), ['é', '👍🏽']);
});

test('tb: no rail without a chapter beyond Session start; otherwise the aria-hidden rail and the chapter list', () => {
  const viewportRef = { current: null };
  const start = { id: M.SESSION_START_ID, title: 'Session start', source: 'session', entryId: 'u', entryIndex: 0 };
  assert.equal(renderToStaticMarkup(h(C.SourceChapterToc, { sessionId: 's1', chapters: [start], viewportRef, scrollKey: 'k' })), '');
  const chapters = [start, { id: 'ch1', title: 'Build', summary: 'Write it', source: 'claude', entryId: 'ch1', entryIndex: 2 }];
  const html = renderToStaticMarkup(h(C.SourceChapterToc, { sessionId: 's1', chapters, viewportRef, scrollKey: 'k' }));
  // W14-code r6 css6-toc-position-gutter: cf74bc599 NC's own class strings, the root on the rail band (shared-18 Hx).
  assert.match(html, /^<div class="epitaxy-toc sch-toc absolute top-\[20px\] bottom-\[32px\] -start-\[var\(--session-rail-band-start,0px\)\] z-\[11\] pointer-events-none invisible"><nav aria-label="Session chapters" tabindex="0" class="sch-toc-nav relative h-full w-\[var\(--chat-gutter\)\] focus-visible:outline-hidden focus-visible:shadow-focus">/,
    'invisible until the active chapter is measured');
  assert.match(html, /<ol aria-hidden="true" data-dash-rail="" class="max-h-full flex flex-col py-1\.25 ps-\[calc\(var\(--chat-gutter\)\*3\/16\)\] overflow-hidden pointer-events-auto"><li class="h-\[8px\] flex items-center"><span class="block h-\[2px\] rounded-full transition-\[scale,background-color\] duration-200 w-\[calc\(var\(--chat-gutter\)\*3\/8\+2px\)\] origin-left [^"]*scale-x-\[calc\(9\/14\)\] bg-alpha-3"><\/span><\/li>/);
  assert.match(html, /<div class="absolute start-0 top-0 isolate [^"]* rounded-lg w-max min-w-\[232px\] max-w-\[320px\] max-h-full flex flex-col py-sm [^"]* invisible opacity-0 -translate-x-1 [^"]*"><ol role="list" class="flex-1 min-h-0 flex flex-col hit-gap-y-0\.75 overflow-y-auto px-xs">/, 'the list is closed until hover or focus');
  // W14-code r6 review: FC's row `j` (text-start, not the host's text-align:left), mark `N` and the title in shared-frame hh.
  // W14-code r7 css7-toc-entry-tooltip-menu: FC names the summary with aria-describedby on a hidden span (no native title);
  // the row is the CDS Tooltip's trigger, and a Claude chapter's also the CDS ContextMenu's (Trigger render).
  assert.match(html, /<li class="hit-row"><button type="button" aria-describedby="([^"]+)" class="group\/ch hit-row-main w-full flex items-center gap-sm px-1\.25 h-control app-list-row rounded-\[5px\] text-start text-body hover:bg-fill-ghost-hover (text-primary|text-secondary hover:text-primary)"[^>]*><span aria-hidden="true" class="block h-\[2px\] rounded-full shrink-0 transition-\[background-color\] duration-150 (w-\[14px\] bg-alpha-8|w-\[9px\] bg-alpha-3 group-hover\/ch:bg-alpha-5)"><\/span><span data-cds="OverflowTooltip" class="block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap flex-1"[^>]*>[^]*?<\/span><span id="\1" hidden="">Write it<\/span><\/button><\/li>/);
  assert.doesNotMatch(html, /title="Write it"/);
  assert.doesNotMatch(html, /sch-toc-(entry|button|mark|title|input)/);
  assert.equal(html.split('<button').length - 1, 2);
});

test('H6e: the footer offers Pin as chapter (Pin) or Unpin chapter (PinFilled, pressed) after Fork', () => {
  const base = { sessionKey: 's1', turnId: 't1', text: 'Done', interacted: true, onFork: () => {} };
  const pin = renderToStaticMarkup(h(F.SourceTurnFooter, { ...base, pin: { pinned: false, onToggle: () => {} } }));
  const labels = [...pin.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ['Copy', 'Fork from here', 'Pin as chapter']);
  assert.match(pin, /data-message-action="pin" aria-label="Pin as chapter" aria-pressed="false"/);
  const unpin = renderToStaticMarkup(h(F.SourceTurnFooter, { ...base, pin: { pinned: true, onToggle: () => {} } }));
  assert.match(unpin, /aria-label="Unpin chapter" aria-pressed="true"/);
  assert.doesNotMatch(renderToStaticMarkup(h(F.SourceTurnFooter, base)), /data-message-action="pin"/, 'no pin prop, no Pin action');
});
