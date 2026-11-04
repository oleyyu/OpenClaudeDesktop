// W14-code round 5, composer lane (plan-w14-code.md §5 E95), by source / SSR / pure models only (E61).
//   r5-composer-01  only the main dock column is a toast safe region: the side chat / /btw composers register none
//                   (cc43287c9 `B ? void 0 : Ds(e, {nearWindowBottomOnly: !0})`; cccc2cf0a UF and c227f4d5e jF: none).
//   r5-composer-02  that region is nearWindowBottomOnly (shared-26 OP `rP.has(i) && innerHeight - a.bottom > eP`, eP 200).
//   r5-composer-03 / fr5-06  a start from a picked saved environment with branch / worktree changes writes Aue's
//                   startedSetup.fromEnvironment, which cf74bc599 Mx reads ("Started from {name} with {changes}").
//   css5-usage-popover-handcopy / css5-effort-popover (E95 part)  c227f4d5e V3's classes; no host Plan mode row.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { environmentStartChanges } from '../src/saved-environment-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const noop = () => {};
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (name) => fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
let server, C, SaveEnv, Adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  SaveEnv = await server.ssrLoadModule('/src/generated/session-rail/save-environment.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-adapters.jsx');
});
after(() => server?.close());

const model = { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] };
const base = { draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto', model, effort: 'high', workdir: '/tmp/fixture/project' };
const zone = (props = {}) => renderToStaticMarkup(h(C.SourceComposer, { ...base, ...props })).match(/<div class="composer-zone sc-zone"[^>]*>/)[0];

test('r5-composer-01/02: the Code dock zone is a near-bottom safe region; embedded composers register none', () => {
  assert.match(zone(), /data-toast-safe-region="near-bottom"/);
  for (const props of [{ embedded: true, codeLayout: 'side-session' }, { embedded: true, codeLayout: 'side-session', mode: 'chat' }]) {
    assert.doesNotMatch(zone(props), /data-toast-safe-region/, JSON.stringify(props));
  }
  // Chat / Cowork are outside this wave: their zone keeps the plain region.
  assert.match(zone({ mode: 'chat' }), /data-toast-safe-region=""/);
  // The official evidence: one registration, with nearWindowBottomOnly, and OP's 200px skip.
  const v1 = '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1';
  const cc = fs.readdirSync(path.join(app, v1)).find((name) => name.startsWith('cc43287c9-'));
  assert.ok(official(cc).includes('nearWindowBottomOnly:!0'));
  assert.ok(/rP\.has\(\w+\)&&window\.innerHeight-\w+\.bottom>eP/.test(official('shared-26-CGuBxVt9.js')) && official('shared-26-CGuBxVt9.js').includes('eP=200'));
  // source-toast collects the flag with each region's rect.
  assert.ok(read('src/source-toast.jsx').includes("nearWindowBottomOnly:region.getAttribute('data-toast-safe-region')==='near-bottom'"));
});

test('r5-composer-03 / fr5-06: environmentStartChanges is $oe\'s place half under Aue\'s jue filter', () => {
  const env = { id: 'e1', name: 'Repo', target: { kind: 'local', cwd: '/r' }, settings: { branch: 'main' } };
  const repo = { isRepo: true, cwd: '/r', branch: 'main', checkedOut: 'main', branches: ['main', 'feature'] };
  assert.deepEqual(environmentStartChanges(env, repo, false), { fields: [], patch: {} });
  assert.deepEqual(environmentStartChanges(env, { ...repo, branch: 'feature' }, false), { fields: ['branch'], patch: { branch: 'feature' } });
  assert.deepEqual(environmentStartChanges(env, { ...repo, branch: 'feature' }, true), { fields: ['branch', 'worktree'], patch: { branch: 'feature', worktree: true } });
  // An environment without a saved branch: the branch it applies (the checked-out one) is no change.
  const bare = { ...env, settings: {} };
  assert.deepEqual(environmentStartChanges(bare, { ...repo, branch: 'dev', checkedOut: 'dev' }, false), { fields: [], patch: {} });
  // A saved worktree turned off at the start.
  assert.deepEqual(environmentStartChanges({ ...env, settings: { branch: 'main', worktree: true } }, repo, false), { fields: ['worktree'], patch: { worktree: false } });
  // Not a repository: no place changes.
  assert.deepEqual(environmentStartChanges(env, { isRepo: false }, true), { fields: [], patch: {} });
  // The official filter and labels this follows.
  const cc = fs.readdirSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1')).find((name) => name.startsWith('cc43287c9-'));
  const text = official(cc);
  assert.ok(text.includes('return e==="branch"||e==="worktree"'));
  assert.ok(text.includes('defaultMessage:"branch {name}",id:"JVZklDoDPs"'));
});

test('r5-composer-03 / fr5-06: Mx draws the fromEnvironment branch from the recorded setup; main records it at start', () => {
  let updated = 0;
  const recorded = { target: { kind: 'local', cwd: '/r' }, settings: { branch: 'feature', worktree: true }, occasion: 'start',
    fromEnvironment: { id: 'e1', name: 'Repo', changes: ['branch feature', 'worktree'], update: () => updated++ } };
  Adapters.recordStartedFromEnvironment('s1', recorded);
  // Mx names the environment from the store while it still exists (`p = dv(f)`), as the rail host pushes them in.
  Adapters.setRailSavedEnvironments([{ id: 'e1', name: 'Repo', target: { kind: 'local', cwd: '/r' } }]);
  assert.deepEqual(Adapters.useEnvironmentStore.getState().environments.map((env) => env.id), ['e1']);
  // SSR reads the stores' initial state (react-store useSyncExternalStore getServerSnapshot = getInitialState), where
  // the environment list is empty, so Mx's fromEnvironment branch shows here through `l.updated` (`p || l.updated`);
  // with the environment present the same branch adds "Update environment · Save as new" (generated Mx, verbatim).
  const setup = { label: 'This computer · r', suggestedName: 'r', startCount: 1, ...recorded, sessionId: 's1' };
  const after = renderToStaticMarkup(h(SaveEnv.SessionStartLine, { setup: { ...setup, fromEnvironment: { ...recorded.fromEnvironment, updated: true } }, onSave() {}, onUpdated() {}, onDeclined() {} }));
  assert.equal(after, '<div data-testid="epitaxy-save-start-line" class="text-footnote text-muted-as-secondary">Started from Repo · updated with branch feature and worktree</div>');
  const generated = read('src/generated/session-rail/save-environment.mjs');
  assert.ok(generated.includes('if (l && t.savedAs === void 0 && (p || l.updated)) {') && generated.includes('defaultMessage: "Update environment",'));
  // No changes, no record.
  Adapters.recordStartedFromEnvironment('s2', { ...recorded, fromEnvironment: { ...recorded.fromEnvironment, changes: [] } });
  // The main start path and the rail's loader.
  const main = read('src/main.jsx');
  assert.ok(main.includes('const started = environmentStartChanges(selectedEnvironment, startWorkspace, worktree);'));
  assert.ok(main.includes('recordStartedFromEnvironment(id, {'));
  assert.ok(main.includes('t("branch {name}", { name: patch.branch ?? "" })'));
  assert.ok(main.includes('if (mode === "code" && selectedEnvironment && !stay) {'));
  const rail = read('src/source-session-rail.jsx');
  assert.ok(rail.includes('scope.setState({ startedSetup: recorded ? { ...So, ...recorded } : null });'));
  assert.ok(rail.includes('const dt = useStore(scope, (state) => (state.startedSetup?.sessionId === sessionId ? state.startedSetup : null));'));
  // zh-CN carries the change labels.
  const zh = read('electron/i18n/zh-CN/session.mjs');
  assert.ok(zh.includes('"branch {name}": "分支 {name}"') && zh.includes('"no worktree": "不使用工作树"'));
  assert.equal(updated, 0);
});

test('css5-usage-popover / css5-effort-popover (E95): V3\'s own classes; no host Plan mode row or sp-sr-only', () => {
  const composer = read('src/source-composer.jsx');
  assert.ok(official('c227f4d5e-B-FYKrwT.js').includes('"epitaxy-root break-words w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)]"'));
  assert.ok(composer.includes('className="epitaxy-root break-words w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)] sc-usage-popover"'));
  assert.doesNotMatch(composer, /sc-usage-body|sp-sr-only|Plan mode effort|sc-effort-plan/);
  assert.doesNotMatch(read('src/source-composer.css'), /\.sc-usage-body|\.sc-effort-plan|width: 360px/);
  assert.doesNotMatch(read('src/source-popover.css'), /\.sp-sr-only/);
  assert.doesNotMatch(read('src/transcript-find-model.mjs'), /"sp-sr-only"/);
  assert.doesNotMatch(read('src/main.jsx'), /planEffort|"plan-effort"/);
  assert.doesNotMatch(read('electron/main.cjs'), /case "plan-effort"/);
  // Plan still reasons at Codex's own Plan effort (not UI).
  assert.match(read('electron/main.cjs'), /await planModeEffort\(owner, /);
});

// W14-code r5 复核 (review): the two follow-ups of this lane.
test('r5 review css5-effort-popover: the effort Popup and Title carry c8e04f916 rt / it verbatim', () => {
  const effort = official(fs.readdirSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1')).find((name) => name.startsWith('c8e04f916-')));
  assert.ok(effort.includes('s("isolate flex w-[220px] select-none flex-col gap-lg",O)'));
  assert.ok(effort.includes('t(d.Title,{className:"shrink-0 text-muted",children:w})'));
  // W14-code r6-composer-02: the popover is the sliced c8e04f916 S itself, so rt / it are the generated text verbatim and
  // the host keeps no hook or rule of its own (tests/w14-r6-composer.test.mjs).
  const generated = read('src/generated/effort-control/effort-control.mjs');
  assert.ok(generated.includes('s("isolate flex w-[220px] select-none flex-col gap-lg", O)'));
  assert.ok(generated.includes('t(d.Title, { className: "shrink-0 text-muted", children: w })'));
  const css = read('src/source-composer.css');
  assert.doesNotMatch(css, /\.sc-effort-popover|\.sc-effort-label|\.sc-effort-control/);
});

test('r5 review r5-composer-02: Code registers the whole dock column (error card, queue, turn box, composer)', () => {
  const v1 = '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1';
  const cc = official(fs.readdirSync(path.join(app, v1)).find((name) => name.startsWith('cc43287c9-')));
  assert.ok(cc.includes('v("div",{ref:at,"data-skip-approval-enter":Jr,...Yr,className:Xr,children:[Zr,ei]})'));
  const main = read('src/main.jsx');
  const open = '<div className={mode === "code" ? "code-dock-column flex min-w-0 shrink-0 flex-col" : "contents"}\n                  data-toast-safe-region={mode === "code" ? "near-bottom" : undefined}>';
  const start = main.indexOf(open);
  assert.ok(start > 0, 'dock column wrapper');
  const end = main.indexOf('</SourceCoworkSessionStates>\n                </div>\n                </SourceSessionErrorBoundary>', start);
  assert.ok(end > start, 'dock column closes after the composer slot');
  const column = main.slice(start, end);
  for (const part of ['<div className="composer-error"><SourceComposerError', '<SourceQueuedMessages key={`${current}:queued`}',
    '<SourceTurnBoxRegion key={`${current}:turn-box`}', 'renderMainComposer({ notices: true })', '<SourceArchivedBanner key={`${current}:archived`}']) {
    assert.ok(column.includes(part), part);
  }
  // Only one opening wrapper between the transcript body and the column (no per-sibling registration).
  assert.equal(column.match(/data-toast-safe-region=\{mode === "code"/g).length, 1);
  // The utilities it uses exist in the loaded official sheet.
  const sheet = read('public/assets/v1/c6a992d55-Che1orl5.css');
  for (const name of ['.contents{', '.flex{', '.min-w-0{', '.shrink-0{', '.flex-col{']) assert.ok(sheet.includes(name), name);
});
