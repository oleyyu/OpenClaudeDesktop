// W14-code r7 gen-final-7: the closing lane's D1 de-duplication and dead-code cleanup after the seven r7 lanes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('D1: shared-6 C_ (x_ / S_) is one copy — session-rail-changes branch-row-classes — read by the rail band frame and the queued bar', () => {
  const rows = read('src/generated/session-rail-changes/branch-row-classes.mjs');
  assert.ok(rows.includes('function C_(e = "neutral") {\n  return `${x_} ${S_[e]}`;\n}'));
  assert.ok(rows.includes('C_ as bandAccentClassName,'));
  assert.equal(read('src/generated/session-rail/band-frame-classes.mjs').includes('function C_'), false);
  assert.ok(read('src/generated/session-rail/band-frame.mjs').includes('import { bandAccentClassName as c } from "../session-rail-changes/branch-row-classes.mjs";'));
  assert.ok(read('src/generated/queued-bar/queued-shared-6-sd9jbJqs.mjs').includes('import { bandAccentClassName as C_ } from "../session-rail-changes/branch-row-classes.mjs";'));
  assert.ok(read('src/source-queued-messages.jsx').includes('import { bandAccentClassName } from "./generated/session-rail-changes/branch-row-classes.mjs";'));
  // No area other than session-rail-changes holds shared-6 C_ / x_ / S_ or shared-2 B5 more than once.
  const holders = new Map();
  for (const area of ['session-rail', 'session-rail-changes', 'queued-bar', 'cowork-session-states']) {
    for (const module of json(`src/generated/${area}/manifest.json`).modules) {
      for (const binding of module.bindings ?? []) {
        const key = `${path.basename(module.source)}#${typeof binding === 'string' ? binding : binding.name}`;
        holders.set(key, [...(holders.get(key) ?? []), `${area}/${module.target}`]);
      }
    }
  }
  for (const key of ['shared-6-sd9jbJqs.js#C_', 'shared-6-sd9jbJqs.js#x_', 'shared-6-sd9jbJqs.js#S_']) assert.deepEqual(holders.get(key), ['session-rail-changes/branch-row-classes.mjs'], key);
  assert.deepEqual(holders.get('shared-2-TF8v67kg.js#B5'), ['cowork-session-states/shared-2-TF8v67kg.mjs']);
});

test('D1: shared-2 B5 ("data-composer-stand-in") is cowork-session-states\' copy; session-rail has no composer-stand-in.mjs', () => {
  assert.equal(existsSync(path.join(root, 'src/generated/session-rail/composer-stand-in.mjs')), false);
  assert.ok(read('src/generated/session-rail/band-frame.mjs').includes('import { B5 as l } from "../cowork-session-states/shared-2-TF8v67kg.mjs";'));
  assert.ok(read('src/generated/cowork-session-states/shared-2-TF8v67kg.mjs').includes('var B5 = "data-composer-stand-in";'));
  const generator = read('scripts/extract-session-rail.mjs');
  assert.doesNotMatch(generator, /'shared-2-TF8v67kg\.js:B5': 'plain data/);
  assert.match(generator, /'cowork-session-states'\];/);
});

test('dead code: the unreached hover-card billing stand-in and the queued bar\'s unread coreName are gone', () => {
  assert.doesNotMatch(read('src/source-sidebar-hover-card-adapters.jsx'), /useBillingBlock/);
  assert.doesNotMatch(read('scripts/extract-sidebar-hover-card.mjs'), /name: 'useBillingBlock'/);
  assert.equal(read('src/generated/sidebar-hover-card/manifest.json').includes('useBillingBlock'), false);
  const main = read('src/main.jsx');
  const call = main.slice(main.indexOf('<SourceQueuedMessages'), main.indexOf('onReorder={queueReorder} />'));
  assert.ok(call.length > 0);
  assert.doesNotMatch(call, /coreName=/);
});

test('GitCounts\' default ink is c60636ac6 Qe\'s (text-git-added / text-git-removed), not the deleted .sg-* rules', () => {
  const official = readFileSync(path.join(root, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c60636ac6-xYOM0GQX.js'), 'utf8');
  assert.ok(official.includes('l===void 0?"text-git-added":l') || official.includes('l===void 0?`text-git-added`:l'));
  const counts = read('src/source-git-counts.jsx');
  assert.match(counts, /addedClassName = "text-git-added", removedClassName = "text-git-removed"/);
  // W14-code r8 css8-gh-hint-popover-host: source-git-status.css is gone altogether.
  assert.equal(existsSync(path.join(root, 'src/source-git-status.css')), false);
});

// Review fixes (r7-gen-final-7.review.md): the composer's bL finalFocus (c227f4d5e K6 = cc43287c9 yte) and the archived
// banner over the generated band frame (c0b46114c _ / y = c9543da06 uo / lo) instead of hand-copied shared-6 classes.
const officialChunk = (name) => readFileSync(path.join(root, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
async function ssr(run) {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try { return await run(server); } finally { await server.close(); }
}

test('review fix: cc43287c9 Dle `$i = yte({onRequestComposerFocus, isPanelActive, keyboardOnly: !0})` is bL\'s finalFocus', async () => {
  const dle = officialChunk('cc43287c9-Me-M2ucD.js');
  assert.ok(dle.includes('{onRequestComposerFocus:ht,isPanelActive:Mt,keyboardOnly:!0}):$[413],$i=yte(Qi)'));
  assert.match(dle, /import\{[^}]*,y as yte,[^}]*\}from"\.\/c227f4d5e-B-FYKrwT\.js"/);
  assert.ok(officialChunk('c227f4d5e-B-FYKrwT.js').includes('K6 as y'));
  const generated = read('src/generated/code-composer/composer-final-focus.mjs');
  assert.ok(generated.includes('export { K6 as useComposerFinalFocus };'));
  assert.ok(generated.includes('import { useEventCallback as $t } from "../view-tabs/shared-0-DDOOdL6P.js";'));
  assert.ok(json('src/generated/code-composer/manifest.json').modules.some((m) => m.target === 'composer-final-focus.mjs'));
  // W14-code r8 css8-classic-context-row-dead (E95): bL was the classic context row's branch chip, gone with that row, so
  // the composer no longer reads yte or takes onRequestComposerFocus; the generated K6 slice stays pinned below.
  const composer = read('src/source-composer.jsx');
  assert.ok(!composer.includes('useComposerFinalFocus') && !composer.includes('finalFocus={startPopupFinalFocus}'));
  assert.ok(!read('src/main.jsx').includes('onRequestComposerFocus={() => textarea.current?.focus()}\n      fastMode={fastEnabled}'));

  await ssr(async (server) => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { useComposerFinalFocus } = await server.ssrLoadModule('/src/generated/code-composer/composer-final-focus.mjs');
    const hook = (options) => { let out; renderToStaticMarkup(React.createElement(() => { out = useComposerFinalFocus(options); return null; })); return out; };
    const previous = globalThis.window;
    const fakeWindow = ({ active, touchOnly = false }) => {
      const body = { closest: () => null };
      const document = { body, activeElement: active === 'body' ? body : active };
      return { document, navigator: { userAgent: 'test', maxTouchPoints: touchOnly ? 5 : 0 }, matchMedia: () => ({ matches: touchOnly, addEventListener() {}, removeEventListener() {} }) };
    };
    try {
      assert.equal(hook({ isPanelActive: true, keyboardOnly: true }), undefined, 'K6: no onRequestComposerFocus → undefined (default finalFocus)');
      let asked = 0;
      // Focus fell to the body: the composer is asked; focus moved → false (Base UI leaves it there).
      let win = fakeWindow({ active: 'body' });
      globalThis.window = win;
      let finalFocus = hook({ onRequestComposerFocus: () => { asked += 1; win.document.activeElement = { composer: true }; }, isPanelActive: true, keyboardOnly: true });
      assert.equal(typeof finalFocus, 'function');
      assert.equal(finalFocus(), false);
      assert.equal(asked, 1);
      // Focus inside a menu, composer refuses focus → true (the default return).
      win = fakeWindow({ active: { closest: (selector) => (selector.includes('[role="menu"]') ? {} : null) } });
      globalThis.window = win;
      finalFocus = hook({ onRequestComposerFocus: () => { asked += 1; }, isPanelActive: true, keyboardOnly: true });
      assert.equal(finalFocus(), true);
      assert.equal(asked, 2);
      // Focus already elsewhere, an inactive panel, or a touch-only host: the composer is not asked.
      globalThis.window = fakeWindow({ active: { closest: () => null } });
      assert.equal(hook({ onRequestComposerFocus: () => { asked += 1; }, isPanelActive: true, keyboardOnly: true })(), false);
      globalThis.window = fakeWindow({ active: 'body' });
      assert.equal(hook({ onRequestComposerFocus: () => { asked += 1; }, isPanelActive: false, keyboardOnly: true })(), false);
      globalThis.window = fakeWindow({ active: 'body', touchOnly: true });
      assert.equal(hook({ onRequestComposerFocus: () => { asked += 1; }, isPanelActive: true, keyboardOnly: true })(), true);
      assert.equal(asked, 2);
    } finally {
      if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
    }
  });
});

test('review fix: the archived banner is the generated band frame (c9543da06 yu → uo / lo), no hand-copied shared-6 classes', async () => {
  const yu = officialChunk('c9543da06-BaufrsQl.js');
  assert.ok(yu.includes('import{a as co,i as lo,r as uo}from"./c0b46114c-Tzv34BiL.js"'));
  assert.ok(officialChunk('c0b46114c-Tzv34BiL.js').includes('_ as r') && officialChunk('c0b46114c-Tzv34BiL.js').includes('y as i'));
  const banner = read('src/source-archived-banner.jsx');
  assert.ok(banner.includes('import { BandFrame, BandActionCell } from "./generated/session-rail/band-frame.mjs";'));
  assert.doesNotMatch(banner, /const (?:BAND_ROW_CLASS|BAND_TOP_ALIGNED_CLASS|ARCHIVED_BANNER_CLASS) =|"[^"\n]*min-h-\[40px\][^"\n]*"/);
  await ssr(async (server) => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const B = await server.ssrLoadModule('/src/source-archived-banner.jsx');
    const noop = () => {};
    const html = renderToStaticMarkup(React.createElement(B.ArchivedBannerContent, { folders: ['/w/a'], onUnarchive: noop, onDiscard: noop }));
    // Same markup as the hand-built row it replaces: C_("neutral"), T_, text-body, f, then yu's children and the two lo cells.
    assert.ok(html.startsWith('<div role="note" data-composer-stand-in="" class="flex gap-[5px] w-full min-h-[40px] p-[8px] rounded-[10px] bg-alpha-1 items-start py-[calc((40px-1lh)/2)] text-body epitaxy-band-enter"><div class="flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm items-start"><div class="min-w-0 flex-[1_1_32ch]"><span class="text-primary">This session is archived. Unarchive it to keep working in this session. Its worktree still has uncommitted changes on disk.</span></div><div class="flex min-w-0 max-w-full shrink-0 flex-wrap items-start gap-x-sm gap-y-sm"><span class="flex h-[1lh] shrink-0 items-center"><button'), html);
    assert.equal((html.match(/<span class="flex h-\[1lh\] shrink-0 items-center"><button/g) || []).length, 2);
  });
});
