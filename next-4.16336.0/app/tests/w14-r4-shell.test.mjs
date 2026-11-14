// W14-code r4 shell (plan-w14-code.md §5 E95): the session shell's bands and rail, by source / SSR only (E61).
//   css4-ssn-list-geometry  Code's notice stack is cc43287c9 Rde's div (shared-6 Jg only) inside the composer column.
//   fr4-12a                 the goal is the rail's Goal card (cf74bc599 Gj / vM); SourceGoalStrip is gone.
//   fr4-08                  the transcript's lead is the start line (cf74bc599 Mx over Vx "start").
//   sleep-band-slot         the in-transcript sleep notice is c96d752d0 i9's "sessionNotice" row (t9 → e9 around GG).
//   trust-dialog-persona    c165c93f1 B's "Claude Code may read, write, or execute files…" names the assistant (E83).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (name) => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
let server, React, render, Notices, Sleep, SaveEnv, Routines, Adapters, I18n, RailHost;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
  Notices = await server.ssrLoadModule('/src/source-session-notices.jsx');
  Sleep = await server.ssrLoadModule('/src/source-sleep-notice.jsx');
  SaveEnv = await server.ssrLoadModule('/src/generated/session-rail/save-environment.mjs');
  Routines = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-adapters.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  RailHost = await server.ssrLoadModule('/src/source-session-rail.jsx');
});
after(() => server?.close());
const h = (...args) => React.createElement(...args);

test('css4-ssn-list-geometry: in the column the stack is Rde\'s div (shared-6 Jg only); Chat / Cowork keep .ssn-list', () => {
  const notice = { kind: 'warning', summary: 'Heads up' };
  const column = render(h(Notices.SourceSessionNotices, { notices: [notice], inColumn: true }));
  assert.match(column, /^<div class="-mb-1\.5 compact:-mb-1\.5 comfortable:-mb-2" data-cds-dock-group="" data-code-column-notices="">/);
  assert.ok(official('shared-6-sd9jbJqs.js').includes('"-mb-1.5 compact:-mb-1.5 comfortable:-mb-2"'));
  const above = render(h(Notices.SourceSessionNotices, { notices: [notice] }));
  assert.match(above, /^<div class="ssn-list -mb-1\.5 compact:-mb-1\.5 comfortable:-mb-2"/);
  const css = read('src/source-session-notices.css');
  assert.doesNotMatch(css, /gap: 6px|flex-direction: column|calc\(100% - 64px\)/);
  // main.jsx: Code mounts it in the composer column (before the git band); Chat / Cowork above. W14-code r8 r8c-05: not in
  // the archived zone — cc43287c9 `$n && Hn ? … p(Mu, {sessionRef: Hn}, `${t}:archived`) : … v(vie, …)` draws Mu alone.
  const main = read('src/main.jsx');
  assert.ok(main.includes(": mode === 'code' ? <>{notices && renderSessionNotices(true)"));
  // W14-code r5-composer-02: the archived Code zone is a nearWindowBottomOnly region (cc43287c9 Ds(e,{nearWindowBottomOnly:!0})).
  assert.ok(main.includes('data-epitaxy-chat-column data-toast-safe-region="near-bottom"><SourceArchivedBanner'));
  assert.ok(!main.includes('{renderSessionNotices(true)}<SourceArchivedBanner'));
  assert.ok(main.includes('{mode !== "code" && renderSessionNotices(false)}'));
  assert.ok(main.includes(': renderMainComposer({ notices: true })}'));
  // cc43287c9: Bde (the stack) directly before nk (the composer).
  assert.match(official('cc43287c9-Me-M2ucD.js'), /\(Bde,\{\}\),\w+\(nk,\{/);
});

test('fr4-12a: no SourceGoalStrip; the rail gets the goal and Edit goal (TN AA); zh-CN carries Edit goal', () => {
  const main = read('src/main.jsx');
  assert.ok(!fs.existsSync(path.join(app, 'src/source-goal-strip.jsx')) && !fs.existsSync(path.join(app, 'src/source-goal-strip.css')));
  assert.doesNotMatch(main, /SourceGoalStrip|goalAction\(|goalBusy/);
  assert.ok(main.includes('goal: current ? state.goals?.[current] ?? null : null, editGoal: session?.archived ? undefined : editGoal,'));
  assert.ok(main.includes('setDraft(`/goal ${editText}`);'));
  assert.ok(main.includes('t("Can’t edit the goal while the message box has a draft. You can send or clear it first.")'));
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('l(`/goal ${e}`,t)'));
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('Can\\u2019t edit the goal while the message box has a draft. You can send or clear it first.'));
  const rail = read('src/source-session-rail.jsx');
  assert.ok(rail.includes('goal: hostGoal ?? k.goal ?? null,'));
  assert.ok(rail.includes('onEditGoal={host.editGoal}'));
  I18n.setLocale('zh-CN');
  try { assert.equal(I18n.t('Edit goal'), '编辑目标'); } finally { I18n.setLocale('en-US'); }
});

test('fr4-08: the start line (Mx) — Started on {place} · Save as environment, Not now from the second start, saved', () => {
  const setup = { target: { kind: 'local', cwd: '/Users/me/repo' }, settings: {}, label: 'This computer · repo', suggestedName: 'repo', occasion: 'start', startCount: 1 };
  const line = render(h(SaveEnv.SessionStartLine, { setup, onSave() {}, onDeclined() {} }));
  assert.match(line, /^<div data-testid="epitaxy-save-start-line" class="text-footnote text-muted-as-secondary">Started on This computer · repo · <span data-cds="TextLink" role="button"[^>]*>Save as environment<\/span><\/div>$/);
  const second = render(h(SaveEnv.SessionStartLine, { setup: { ...setup, startCount: 2 }, onSave() {}, onDeclined() {} }));
  assert.match(second, /Second session on This computer · repo; an environment keeps it one click away · <span data-cds="TextLink" role="button"[^>]*>Save as environment<\/span> · <span data-cds="TextLink" role="button"[^>]*>Not now<\/span>/);
  const saved = render(h(SaveEnv.SessionStartLine, { setup: { ...setup, savedAs: 'repo' }, onSave() {}, onDeclined() {} }));
  assert.match(saved, />Started on This computer · repo · saved as environment “repo”</);
  // The quiet mark Mx / Zx set on "Not now" (cd0cf5b5e z quietStartedPlace).
  Adapters.useEnvironmentStore.getState().quietStartedPlace(setup.target);
  assert.deepEqual(Adapters.useEnvironmentStore.getState().startedPlaces.map((place) => [place.target.cwd, place.quiet]), [['/Users/me/repo', true]]);
  // main.jsx hands it to the Code transcript's lead (ct-feed host.leadRows).
  assert.ok(read('src/main.jsx').includes('leadRows: <SessionRailStartLine key={`${current}:start-line`} sessionId={current} cwd={workdir} />,'));
  assert.ok(read('src/source-session-rail.jsx').includes('const Co = dt ?? (!bo || So?.savedAs !== undefined ? So : undefined);'));
  assert.equal(render(h(RailHost.SessionRailStartLine, { sessionId: 's1', cwd: '/Users/me/repo' })), '', 'no rail mount (not a Code session view): no line');
});

test('sleep-band-slot: the in-transcript sleep notice is i9\'s session notice row (e9 around GG), off the composer stack', () => {
  // W14-code r6 sleep lane (R6T-03): the notice is the sliced cf74bc599 wO's Ie (`{urgent, message, detail, actions,
  // focusComposer, onShown}`, put on the scope store by Wm(r, "sleepNotice")); the tail reads c227f4d5e uY of the store
  // and draws it as before (tests/w14-r6-sleep.test.mjs drives wO itself).
  const notice = { urgent: true, message: 'Your computer went to sleep while DeepSeek was working. DeepSeek couldn’t pick up where it left off.',
    detail: 'detail', actions: [{ label: 'Continue', onAction() {} }], focusComposer() {} };
  const html = render(h(Sleep.SourceTailSessionNotice, { notice }));
  assert.match(html, /data-code-own-row=""/);
  assert.match(html, /class="[^"]*flex min-w-0 flex-wrap items-baseline gap-x-1\.5/);
  assert.match(html, /Your computer went to sleep while DeepSeek was working\./);
  assert.match(html, />Continue</);
  assert.equal(render(h(Sleep.SourceTailSessionNotice, { notice: null })), '');
  const main = read('src/main.jsx');
  assert.ok(main.includes('transcriptNotices: bandsInTranscript && tailNotice ? <SourceTailSessionNotice'));
  assert.ok(main.includes('const bandsInTranscript = mode === "code" && !!current && codeTranscriptRendererOn(current);'));
});

test('trust-dialog-persona: c165c93f1 B reads with the assistant\'s name (E83), other messages unchanged', () => {
  const original = 'Claude Code may read, write, or execute files in this folder. Only proceed if you trust this workspace.';
  assert.ok(official('c165c93f1-DO0V7qMe.js').includes(`defaultMessage:"${original}",id:"VvhQDpcjjd"`));
  const html = render(h(Routines.FormattedMessage, { id: 'VvhQDpcjjd', defaultMessage: original }));
  assert.equal(html, 'DeepSeek may read, write, or execute files in this folder. Only proceed if you trust this workspace.');
  assert.equal(render(h(Routines.FormattedMessage, { id: 'CFLhTeXdtP', defaultMessage: 'Trust this workspace?' })), 'Trust this workspace?');
  assert.equal(render(h(Routines.FormattedMessage, { id: 'VvhQDpcjjd', defaultMessage: 'something else' })), 'something else', 'a changed original is not rewritten');
  I18n.setLocale('zh-CN');
  try { assert.equal(render(h(Routines.FormattedMessage, { id: 'VvhQDpcjjd', defaultMessage: original })), 'DeepSeek 可能会读取、写入或执行此文件夹中的文件。仅在你信任此工作区时继续。'); }
  finally { I18n.setLocale('en-US'); }
});
