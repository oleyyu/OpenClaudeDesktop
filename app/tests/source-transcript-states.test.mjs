import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// SSR of the transcript pane states (approval-entry-current.js _d :1141-1190,
// xu :4211-4217, Cl :4224-4233). Middleware mode only; no browser/Electron/Codex.
let server, M, Status;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-transcript-states.jsx');
  ({ SourceTranscriptStatus: Status } = await server.ssrLoadModule('/src/source-transcript-status.jsx'));
});
after(() => server?.close());
const count = (html, needle) => html.split(needle).length - 1;

test('skeleton is Zw around k_: padding 48, hold none, bubble bar and O_ paragraphs in order', () => {
  const html = renderToStaticMarkup(React.createElement(M.SourceTranscriptSkeleton));
  assert.match(html, /^<div data-transcript-skeleton="" aria-hidden="true" class="h-full overflow-hidden \[scrollbar-gutter:stable_both-edges\]" style="padding-top:48px"><div class="w-full \[--msg-gap:0px\]">/);
  // gd: {none:"handoff"} with turnStatusRows (GrowthBook __gb__2846116625, served on by the host), else {none:"route"}.
  assert.match(html, /data-cds="SkeletonGroup" data-motion="wave" data-hold="none" data-hold-reason="handoff" data-shown=""/);
  // 2.42304.0 Ob: overflow-hidden, and the fixed height (not fillColumn); gp does not pass decorative, so role=status.
  assert.match(html, /data-shown="" role="status" class="text-prose flex flex-col overflow-hidden fade-out-bottom h-\[calc\(100vh-12.5rem\)\]"><span class="sr-only" data-skeleton-label="true">Loading<\/span><div aria-hidden="true" class="contents">/);
  assert.match(html, /<div data-testid="chat-message-skeleton" class="contents"><div class="mt-\[var\(--msg-gap,1.5rem\)\] flex shrink-0 justify-end"><div data-cds="Skeleton" class="[^"]*box-content h-\[1lh\] w-72 max-w-\[85%\] rounded-card py-md text-heading"/);
  assert.match(html, /<div class="mt-xs mb-xs h-6 shrink-0"><\/div><div class="flex shrink-0 flex-col gap-\[0.75em\] ps-\[var\(--msg-text-inset,0.5rem\)\] pe-\[var\(--msg-inset-end,0.5rem\)\]">/);
  assert.match(html, /<div class="mt-xs h-6 shrink-0"><\/div><\/div><\/div><\/div><\/div><\/div>$/);
  assert.equal(count(html, 'data-cds="Skeleton"'), 11);
  assert.equal(count(html, '<div class="flex flex-col">'), 3);
  assert.equal(count(html, 'class="flex h-[1lh] items-center"'), 10);
  // Line widths in DOM order are O_ flattened (ion-dist shared-8-B5xbG2px.js).
  const widths = [...html.matchAll(/class="max-w-full rounded bg-\[var\(--cds-skeleton-base\)\] h-\[0\.72em\] (w-[^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(widths, ['w-[96%]', 'w-full', 'w-[92%]', 'w-[58%]', 'w-full', 'w-[94%]', 'w-[41%]', 'w-[97%]', 'w-[90%]', 'w-[66%]']);
  assert.deepEqual(M.SKELETON_PARAGRAPHS.map(p => p.length), [4, 3, 3]);
  // The group branch of gc has no shimmer ::after and no per-bar role.
  assert.doesNotMatch(html, /after:animate|role="status"[^>]*data-cds="Skeleton"/);
  // hc wave: --cds-skel-i in DOM order modulo floor(2000/90)=22.
  assert.deepEqual([...html.matchAll(/--cds-skel-i:(\d+)/g)].map(m => +m[1]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.match(renderToStaticMarkup(React.createElement(M.SourceTranscriptSkeleton, { hasEarlier: true })), /style="padding-top:88px"/);
});

// 2.42304.0 shared-2-Cb74JByF Ob and its SkeletonGroup Bu (= shared-frame-BfjMqbuN tl = nd), and the Code transcript's
// wrapper shared-20-B7UqYfsi gp that calls it with {hold, onShown} only.
const OFFICIAL = path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
test('official Ob / nd / gp: overflow-hidden, the fillColumn branch and the decorative group', () => {
  const shared2 = fs.readFileSync(path.join(OFFICIAL, 'shared-2-Cb74JByF.js'), 'utf8');
  assert.match(shared2, /function Ob\(\{hold:e,decorative:t,onShown:n,onHidden:r,fillColumn:i=!1\}\)\{return h\(Bu,\{hold:e,decorative:t,onShown:n,onHidden:r,className:`text-prose flex flex-col overflow-hidden fade-out-bottom \$\{i\?"min-h-0 grow basis-0 max-h-\[calc\(100vh-12\.5rem\)\]":"h-\[calc\(100vh-12\.5rem\)\]"\}`/);
  assert.match(shared2, /import\{[^}]*\btl as Bu\b[^}]*\}from"\.\/shared-frame-BfjMqbuN\.js"/);
  const frame = fs.readFileSync(path.join(OFFICIAL, 'shared-frame-BfjMqbuN.js'), 'utf8');
  assert.match(frame, /\bnd as tl\b/);
  assert.match(frame, /function nd\(\{children:e,hold:t="delayed",label:n,className:r,decorative:i=!1,/);
  assert.match(frame, /role:i\?void 0:"status","aria-hidden":i\?!0:void 0,className:P,/);
  assert.match(frame, /children:\[i\?null:H\("span",\{className:"sr-only","data-skeleton-label":!0,children:D\?"":O\}\)/);
  const shared20 = fs.readFileSync(path.join(OFFICIAL, 'shared-20-B7UqYfsi.js'), 'utf8');
  assert.match(shared20, /function gp\(\{hasEarlier:e=!1,hold:t,onShown:n\}\)/);
  assert.match(shared20, /"aria-hidden":!0,className:"h-full overflow-hidden \[scrollbar-gutter:stable_both-edges\]",style:\{paddingTop:48\+\(e\?40:0\)\},children:f\("div",\{className:`w-full \[--msg-gap:0px\] \$\{gs\}`,children:f\(Cs,\{hold:t,onShown:n\}\)/);
  // Every class the two branches use is in the loaded official stylesheet.
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  for (const rule of ['.overflow-hidden{', '.min-h-0{', '.grow{', '.basis-0{', '.max-h-\\[calc\\(100vh-12\\.5rem\\)\\]{max-height:calc(100vh - 12.5rem)}', '.h-\\[calc\\(100vh-12\\.5rem\\)\\]{', '.fade-out-bottom{', '.text-prose{'])
    assert.ok(css.includes(rule), rule);
});

test('SourceMessageSkeleton: fillColumn grows into the column; decorative drops the status role and label', () => {
  const group = (html) => html.match(/<div data-cds="SkeletonGroup"[^>]*>/)[0];
  const plain = renderToStaticMarkup(React.createElement(M.SourceMessageSkeleton));
  assert.equal(group(plain), '<div data-cds="SkeletonGroup" data-motion="wave" data-hold="none" data-hold-reason="route" data-shown="" role="status" class="text-prose flex flex-col overflow-hidden fade-out-bottom h-[calc(100vh-12.5rem)]">');
  assert.match(plain, /<span class="sr-only" data-skeleton-label="true">Loading<\/span>/);
  const fill = renderToStaticMarkup(React.createElement(M.SourceMessageSkeleton, { fillColumn: true }));
  assert.match(group(fill), /class="text-prose flex flex-col overflow-hidden fade-out-bottom min-h-0 grow basis-0 max-h-\[calc\(100vh-12.5rem\)\]"/);
  assert.doesNotMatch(group(fill), /[\s"]h-\[calc/, 'no fixed height');
  const decorative = renderToStaticMarkup(React.createElement(M.SourceMessageSkeleton, { decorative: true, holdReason: 'handoff' }));
  assert.equal(group(decorative), '<div data-cds="SkeletonGroup" data-motion="wave" data-hold="none" data-hold-reason="handoff" data-shown="" aria-hidden="true" class="text-prose flex flex-col overflow-hidden fade-out-bottom h-[calc(100vh-12.5rem)]">');
  assert.doesNotMatch(decorative, /role="status"|data-skeleton-label/);
  // Same bars either way, in the aria-hidden contents wrapper.
  for (const html of [plain, fill, decorative]) {
    assert.equal(count(html, 'data-cds="Skeleton"'), 11);
    assert.match(html, /<div aria-hidden="true" class="contents"><div data-testid="chat-message-skeleton" class="contents">/);
  }
  // The transcript wrapper (gp) renders exactly the non-decorative, fixed-height message skeleton.
  const transcript = renderToStaticMarkup(React.createElement(M.SourceTranscriptSkeleton));
  // gd's hold is {none:"handoff"} with turnStatusRows (served on): the same skeleton under that hold reason.
  const handoff = renderToStaticMarkup(React.createElement(M.SourceMessageSkeleton, { holdReason: 'handoff' }));
  assert.ok(transcript.includes(handoff), 'gp wraps Ob({hold}) unchanged');
});

test('EmptyState u classes; load failure is role=alert with the source copy and a primary Retry', () => {
  const html = renderToStaticMarkup(React.createElement(M.SourceTranscriptLoadFailure, { onRetry() {} }));
  assert.match(html, /^<div role="alert" class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state"><div class="flex flex-col items-center gap-1"><p class="max-w-\[36ch\] break-words text-body text-primary">Couldn’t load this session<\/p><p class="max-w-\[36ch\] break-words text-footnote text-muted">Something went wrong while loading earlier messages\.<\/p><\/div><div class="flex flex-wrap items-center justify-center gap-1"><button type="button" data-cds="Button" data-variant="primary"/);
  assert.match(html, />Retry<\/span><\/button><\/div><\/div>$/);
  assert.equal(M.LOAD_FAILURE_TITLE, 'Couldn’t load this session');
  assert.doesNotMatch(html, /fixture resume failure/);
});

test('Retry button calls onRetry exactly as passed', () => {
  const calls = [];
  const onRetry = () => calls.push('retry');
  const tree = M.SourceTranscriptLoadFailure({ onRetry });
  assert.equal(tree.props.role, 'alert');
  assert.equal(tree.props.actions.props.variant, 'primary');
  tree.props.actions.props.onClick();
  assert.deepEqual(calls, ['retry']);
});

test('empty transcript renders only the "No messages yet" title', () => {
  const html = renderToStaticMarkup(React.createElement(M.SourceTranscriptEmpty));
  assert.equal(html, '<div class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state"><div class="flex flex-col items-center gap-1"><p class="max-w-[36ch] break-words text-body text-primary">No messages yet</p></div></div>');
});

test('skeleton bubble bar keeps the source content-box sizing over the local border-box reset', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-transcript-states.css'), 'utf8');
  // shared-8 k_ box-content bubble: 1lh + 2 x pad-md. style.css `* { box-sizing: border-box }`
  // is unlayered and would beat the layered .box-content utility.
  assert.match(css, /\[data-transcript-skeleton\] \.box-content \{\s*box-sizing: content-box;\s*\}/);
});

// Working line (turnStatusRows ruling, everything as the desktop): w8's gate-on branch with the GrowthBook flag served
// on shows no thinking text at all — no classic "Thinking…" label, no "Thinking" chip (`w = !N && …`, N = fe(S_e) on),
// no "Thought for Ns"; the thought only keeps the row in its stats state. The host's show / hide-reasoning toggle on the
// classic label therefore has no place in the row (the transcript view menu still switches views). This pin moved from
// the classic Y5 label button.
test('thinking status: no thinking label, chip or toggle in the working line while a thought streams or just ended', () => {
  const thinking = { id: 'r', turnId: 'turn', type: 'reasoning', summary: [] };
  const base = { sessionKey: 'a', turnId: 'turn', ready: true, connected: true, running: true, items: [thinking], itemPhases: { r: 'streaming' } };
  const render = extra => renderToStaticMarkup(React.createElement(Status, { ...base, ...extra }));
  const now = Date.now();
  for (const html of [render({ onToggleThinking() {} }), render({ onToggleThinking() {}, thinkingShown: true }), render({}),
    render({ items: [{ ...thinking, startedAtMs: now - 4400, completedAtMs: now - 100 }], itemPhases: { r: 'completed' }, onToggleThinking() {} })]) {
    assert.match(html, /data-testid="code-working-line" data-turn-working="true"/);
    assert.doesNotMatch(html, /Thinking|Thought for|<button/);
    assert.match(html, /role="status" aria-live="polite">Working…</);
  }
});

// The migrated group classes really decide its box: resolved through every stylesheet the renderer loads (index.html's
// official sheets with their @layer order, then the unlayered local ones), inside the pending wrapper main.jsx renders.
test('real cascade: overflow-hidden and both height branches come from the official utilities, no local rule overrides them', async () => {
  const { appSheets, append, computed, element, find, loadCascade, parseMarkup } = await import('./fixtures/transcript-css-cascade.mjs');
  const root = path.resolve(import.meta.dirname, '..');
  const cascade = loadCascade(appSheets(root));
  const UTILITIES = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';
  const groupIn = (props) => {
    const pending = element('div', { class: 'loading-state source-transcript-pending', role: 'status' });
    for (const node of parseMarkup(renderToStaticMarkup(React.createElement(M.SourceTranscriptSkeleton)).replace(
      /<div data-cds="SkeletonGroup"[\s\S]*$/, `${renderToStaticMarkup(React.createElement(M.SourceMessageSkeleton, props))}</div></div>`))) append(pending, node);
    element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude' }, [element('body', {}, [element('div', { id: 'root' }, [
      element('div', { class: 'source-transcript-frame' }, [element('div', { class: 'transcript' }, [
        element('div', { class: 'source-transcript-content', 'data-transcript-spacing': 'regular' }, [pending])])])])])]);
    return find(pending, (n) => n.attrs['data-cds'] === 'SkeletonGroup');
  };
  const official = (node, property) => {
    const result = computed(cascade, node, property);
    assert.equal(result.from?.sheet, UTILITIES, `${property}: ${result.value} from ${result.from?.sheet}`);
    assert.equal(result.from.layer, 'utilities');
    return result.value;
  };
  const fixed = groupIn({});
  assert.equal(official(fixed, 'overflow-y'), 'hidden hidden');
  assert.equal(official(fixed, 'overflow-x'), 'hidden hidden');
  assert.match(official(fixed, 'height'), /"vh"|100vh|calc/);
  assert.equal(computed(cascade, fixed, 'max-height').from, null, 'the fixed branch sets no max-height');
  const fill = groupIn({ fillColumn: true });
  assert.equal(official(fill, 'overflow-y'), 'hidden hidden');
  assert.match(official(fill, 'max-height'), /"vh"|100vh|calc/);
  official(fill, 'min-height'); official(fill, 'flex-grow'); official(fill, 'flex-basis');
  assert.equal(computed(cascade, fill, 'height').from, null, 'fillColumn takes no fixed height');
  assert.deepEqual([...cascade.unknown], []);
});
