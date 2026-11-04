// W14-code 第四轮 turn-cards 线（plan-w14-code.md §5，E95：需用户定的 UI 一律照官方，宿主独有能力随之删除）：
//   R4T-08c   /status 的官方 Session info 卡（c96d752d0 WG / MHe）读到宿主数据：meta 查询 ["epitaxy","meta",id] 与
//             rows-c06cf64bb 的 live session store（liveMeta），code-session-info-model.mjs / source-code-session-info.jsx
//   R4T-08d   / btw-error-card / cowork-error-card：见 w14-r2-transcript-2、w14-transcript-rest、btw-pane-render
//   R4DC-03   四处 band 类名改用 band-enter.mjs 的 BAND_ENTER_CLASS（c0b46114c f）
//   R4T-08h   改名卡 From / To 的 zh-CN 语境译文（"<英文>|<message id>"）
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { codeSessionLiveMeta, codeSessionMeta, codeSessionMetaKey, createLiveSessionStore, publishCodeSessionInfo } from '../src/code-session-info-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const assets = path.join(snapshot, 'ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

// MHe reads the live store through useSyncExternalStore with a server snapshot of `selector(undefined)` (rows-c06cf64bb
// X); SSR here takes the client snapshot so the store's rows show, as they do in the window.
let clientSnapshots = false;
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, clientSnapshots ? getSnapshot : getServerSnapshot ?? getSnapshot);
}

let server, C, I18N, Rows, Breadcrumb, Adapters, Model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Rows = await server.ssrLoadModule('/src/generated/transcript-rows/rows-c06cf64bb-CdJdJuVd.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  Adapters = await server.ssrLoadModule('/src/source-transcript-rows-adapters.jsx');
  Model = await server.ssrLoadModule('/src/code-session-info-model.mjs');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const INFO = { model: 'DeepSeek V4', effort: 'high', fast: true, permission: 'acceptEdits', cwd: '/Users/me/repo/.wt/a', homePath: '/Users/me',
  additionalFolders: ['/Users/me/other', '/Users/me/repo/.wt/a'], metadata: { originCwd: '/Users/me/repo', forkedFrom: 'parent-1' },
  session: { id: 'tc-1', createdAt: 1761900000 }, core: { name: 'Codex', version: '0.155.1' } };

test('R4T-08c: the meta MHe selects (THe) and the live session meta, from the host session', () => {
  const the = official('c96d752d0-');
  for (const field of ['"originCwd"', '"workingDir"', '"hasDesktopWorktree"', '"additionalDirectories"', '"homePath"', '"model"', '"effort"', '"fastModeState"',
    '"permissionMode"', '"scheduledTaskId"', '"forkedFromSessionId"', '"createdAt"']) assert.ok(the.includes(field), field);
  assert.ok(the.includes('e?.liveMeta?.cliVersion??null') && the.includes('e?.liveMeta?.permissionMode??null'));
  assert.deepEqual(codeSessionMeta(INFO), { originCwd: '/Users/me/repo', workingDir: '/Users/me/repo/.wt/a', hasDesktopWorktree: true,
    additionalDirectories: ['/Users/me/other'], homePath: '/Users/me', model: 'DeepSeek V4', effort: 'high', fastModeState: 'on',
    permissionMode: 'acceptEdits', createdAt: 1761900000000, forkedFromSessionId: 'parent-1' });
  // Host permission values → the official enum (proposal-group-model toOfficialPermissionMode); an effort outside _T is
  // the host's own level name.
  assert.equal(codeSessionMeta({ permission: 'ask' }).permissionMode, 'default');
  assert.equal(codeSessionMeta({ permission: 'bypass' }).permissionMode, 'bypassPermissions');
  assert.equal(codeSessionMeta({ effort: 'off' }).effort, 'Thinking off');
  assert.deepEqual(codeSessionLiveMeta(INFO), { model: 'DeepSeek V4', effort: 'high', permissionMode: 'acceptEdits', cliVersion: 'Codex 0.155.1' });
  assert.equal(codeSessionLiveMeta({ core: { name: 'DeepSeek Harness' } }).cliVersion, 'DeepSeek Harness');
});

test('R4T-08c: publishing writes the meta query once, creates the live store once and wakes the watchers (rows-c06cf64bb YT)', () => {
  const data = new Map(), writes = [];
  const client = { getQueryData: (key) => data.get(JSON.stringify(key)), setQueryData: (key, value) => { writes.push(key); data.set(JSON.stringify(key), value); } };
  const stores = new Map(), woken = [], watchers = new Set([() => woken.push('w')]);
  publishCodeSessionInfo('tc-1', INFO, { stores, watchers, client });
  publishCodeSessionInfo('tc-1', INFO, { stores, watchers, client });
  assert.deepEqual(writes, [codeSessionMetaKey('tc-1')]);
  assert.deepEqual(codeSessionMetaKey('tc-1'), ['epitaxy', 'meta', 'tc-1']);
  assert.deepEqual(woken, ['w']);
  const store = stores.get('tc-1'), state = store.getState();
  // The other readers of a store see what they see for a missing one: c227f4d5e pW `heldInput.length`, nUe `pendingTurn`,
  // uJ / EHe `messages.getSnapshot()`.
  assert.deepEqual([state.heldInput.length, state.pendingTurn, state.compactionStatus, state.messages.getSnapshot().length], [0, null, null, 0]);
  let notified = 0; store.subscribe(() => notified++);
  publishCodeSessionInfo('tc-1', { ...INFO, permission: 'plan' }, { stores, watchers, client });
  assert.equal(store.getState().liveMeta.permissionMode, 'plan');
  assert.equal(notified, 1);
  assert.equal(writes.length, 2);
  assert.equal(createLiveSessionStore({}).setLiveMeta({}), false);
});

test('R4T-08c: the official Session info card shows the host session (SSR through the stores MHe reads)', () => {
  const sessionId = 'tc-ssr-1234567890';
  const row = { id: 's1', after: 'm1', localCommand: true };
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] }, { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done' }, row];
  const render = () => text(renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId, items })));
  const before = render();
  assert.match(before, /Session info\|[^]*Session ID\|/);
  assert.doesNotMatch(before, /\|Claude Code\||\|Folder\|/);
  Model.publishCodeSessionInfo(sessionId, { ...INFO, session: { ...INFO.session, id: sessionId } }, { stores: Rows.q, watchers: Rows.nT, client: Breadcrumb.fileBrowserQueryClient });
  clientSnapshots = true;
  try {
    // (The card's icons are icon-font glyphs, private-use characters, between the cells.)
    const shown = render().replace(/[\ue000-\uf8ff]/g, '').replace(/\|+/g, '|');
    assert.match(shown, /Session info\|Session\|Claude Code\|Codex 0\.155\.1\|Model\|DeepSeek V4 · High · Fast\|Permissions\|Accept edits\|Started\|Forked · [^|]+\|Session ID\|tc-ssr-1…\|/);
    assert.match(shown, /\|Environment\|Folder\|~\/repo\|Worktree\|~\/repo\/\.wt\/a\|Additional folders\|~\/other\|/);
    // The host's inline card is not drawn: the renderer's status entry has no rows (main.jsx's callback is not reached).
    assert.doesNotMatch(shown, /Session status|Account usage limits|Next message model/);
  } finally { clientSnapshots = false; }
  // main.jsx publishes the open Code session through the hook.
  const main = read('src/main.jsx');
  assert.match(main, /useCodeSessionInfo\(mode === "code" \? current : null, \{ model: chosen\?\.displayName \|\| model, effort,/);
  assert.match(read('src/source-code-session-info.jsx'), /import \{ q as liveSessionStores, nT as liveSessionWatchers \} from "\.\/generated\/transcript-rows\/rows-c06cf64bb-CdJdJuVd\.mjs";/);
});

test('R4DC-03: the bands take c0b46114c f (BAND_ENTER_CLASS) from band-enter.mjs, no literal', () => {
  assert.ok(official('c0b46114c-').includes('var f="epitaxy-band-enter";'));
  assert.match(read('src/generated/session-rail-changes/band-enter.mjs'), /export \{ m as useBandEnter, f as BAND_ENTER_CLASS \};/);
  // W14-code r7 r7c-01: the queued bar's band is the original VE's own (generated/queued-bar imports band-enter.mjs).
  assert.match(read('src/generated/queued-bar/queued-bar.mjs'), /import \{ BAND_ENTER_CLASS as Kv \} from "\.\.\/session-rail-changes\/band-enter\.mjs";/);
  // W14-code r7 gen-final-7 review fix: the archived banner is the generated c0b46114c _ itself (c9543da06 yu renders uo),
  // whose class reads f through band-enter.mjs; the banner no longer joins the class (or imports f) on its own.
  assert.match(read('src/generated/session-rail/band-frame.mjs'), /import \{ BAND_ENTER_CLASS as f \} from "\.\.\/session-rail-changes\/band-enter\.mjs";/);
  assert.match(read('src/source-archived-banner.jsx'), /import \{ BandFrame, BandActionCell \} from "\.\/generated\/session-rail\/band-frame\.mjs";/);
  for (const file of ['src/source-archived-banner.jsx', 'src/source-btw-pane.jsx', 'src/main.jsx']) {
    const source = read(file);
    if (file !== 'src/source-archived-banner.jsx') assert.match(source, /import \{[^}]*BAND_ENTER_CLASS[^}]*\} from ["']\.\/generated\/session-rail-changes\/band-enter\.mjs["']/, file);
    const code = source.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n').replace(/\/\/.*$/gm, '').replace(/\{\/\*[^]*?\*\/\}/g, '');
    assert.doesNotMatch(code, /["'`][^"'`\n]*epitaxy-band-enter/, file);
  }
});

test('R4T-08h: the rename card\'s From / To read their own zh-CN entries (tD8/hN97ku / 2B7yxMSjT4)', () => {
  const turnMark = read('src/generated/transcript-rows/turn-mark.mjs');
  assert.ok(turnMark.includes('defaultMessage: "From",\n                      id: "tD8/hN97ku",') && turnMark.includes('{ defaultMessage: "To", id: "2B7yxMSjT4" }'));
  I18N.setLocale('zh-CN');
  try {
    const draw = (props) => renderToStaticMarkup(React.createElement(Adapters.FormattedMessage, props));
    assert.equal(draw({ defaultMessage: 'From', id: 'tD8/hN97ku' }), '原标题');
    assert.equal(draw({ defaultMessage: 'To', id: '2B7yxMSjT4' }), '新标题');
    // Another "From" / "To" keeps the shared entry.
    assert.equal(draw({ defaultMessage: 'From', id: 'eW27YEcQ+S' }), '来自');
    assert.equal(draw({ defaultMessage: 'To', id: 'AEtSiuVhQb' }), '收件人');
  } finally { I18N.setLocale('en-US'); }
  assert.equal(renderToStaticMarkup(React.createElement(Adapters.FormattedMessage, { defaultMessage: 'From', id: 'tD8/hN97ku' })), 'From');
});

// r4 复核 (turn-cards, medium)：Cowork 尾部错误与 /btw notice 是 c3e34355f Hn，Code 的 thread 错误是 c96d752d0 G2e → pK；
// 它们按类别给出修复动作（Hn gr：View billing / Open usage settings / Sign in again；pK：$He reauth + billing CTA / Bhe），
// 不是只有 pg 的 Try again / Compact。回合卡（turn_error item）仍只有 pg 的动作。
test('r4 复核: the session error surfaces keep Hn / pK category fixes; the turn surface keeps pg only', async () => {
  const hn = official('c3e34355f-'), pk = official('c96d752d0-'), usage = official('c74139e0c-');
  for (const needle of ['onClick:()=>Fn("/settings/billing"),children:t(L,{defaultMessage:"View billing",id:"bp6E29TomA"})',
    'Nn=Y.reauthHelps&&At', 'defaultMessage:"Sign in again",id:"scfgdMgq4h"', 'compactHelps:!1', 'latchOnAction:!1'])
    assert.ok(hn.includes(needle), `Hn: ${needle}`);
  assert.ok(usage.includes('{variant:"primary",icon:"UsageGaugeMiddle",onClick:n,children:r}') && usage.includes('defaultMessage:"Open usage settings",id:"sLN5P3cZhl"'));
  assert.ok(pk.includes('Ve=we.usageSettingsHelps&&!!h') && pk.includes('We=we.category==="billing"?N:void 0'));
  // The Cowork caller passes no onNewSession, so Hn's canStartNewSession (Tt=!!at) is false there.
  const cowork = official('c10f0af0c-');
  const call = cowork.slice(cowork.indexOf('m(cI,{errorMessage:CC'), cowork.indexOf('m(cI,{errorMessage:CC') + 600);
  assert.ok(call.length > 100 && !/onNewSession/.test(call.slice(0, call.indexOf('...MC'))));

  const Model = await server.ssrLoadModule('/src/turn-error-model.mjs');
  const view = (category, extra = {}) => ({ category, ...extra });
  const all = { signIn: true, billing: true, usage: true, retry: true };
  assert.equal(Model.officialErrorFix(view('rate_limit'), 'turn', all), null);
  assert.equal(Model.officialErrorFix(view('rate_limit'), 'session', { usage: true }), 'usageSettings');
  assert.equal(Model.officialErrorFix(view('rate_limit'), 'item', { usage: true }), null, 'pK: Bhe only beside a Try again');
  assert.equal(Model.officialErrorFix(view('rate_limit'), 'item', { usage: true, retry: true }), 'usageSettings');
  assert.equal(Model.officialErrorFix(view('auth', { signIn: true }), 'session', all), 'signIn');
  assert.equal(Model.officialErrorFix(view('auth'), 'session', all), null, 'no core sign-in, no Sign in again');
  assert.equal(Model.officialErrorFix(view('billing'), 'item', all), 'billing');
  assert.equal(Model.officialErrorFix(view('session_budget'), 'session', all), null, 'no host category is a newSessionHelps row');

  const TE = await server.ssrLoadModule('/src/source-turn-error.jsx');
  const noop = () => {};
  const draw = (props) => renderToStaticMarkup(React.createElement(TE.SourceTurnError, { variant: 'card', turnId: 'thread', official: true, ...props }));
  const quota = { message: 'You have hit your usage limit.', codexErrorInfo: 'usageLimitExceeded' };
  const session = draw({ error: quota, officialSurface: 'session', onRetry: noop, onViewUsage: noop, onCompact: noop });
  assert.match(session, /data-error-surface="session"/);
  assert.match(session, />Try again<[^]*data-error-fix="usage-settings"[^]*>Open usage settings</, 'dn: a held fix comes after the (secondary) recovery');
  assert.doesNotMatch(session, />Compact session<|>View usage</);
  assert.match(session, /data-error-fix="usage-settings">(?:(?!<\/button>)[^])*data-cds="Icon"/, 'c74139e0c l: the UsageGaugeMiddle icon');
  const turn = draw({ error: quota, onRetry: noop, onViewUsage: noop });
  assert.doesNotMatch(turn, />Open usage settings</, 'the turn_error item keeps pg only');
  const auth = draw({ error: { message: 'unauthorized', codexErrorInfo: 'unauthorized' }, officialSurface: 'item', onSignIn: noop, onRetry: noop });
  assert.match(auth, /data-error-fix="sign-in"[^]*>Sign in again</);
  const billing = draw({ error: { message: 'Insufficient balance', additionalDetails: 'QUOTA' }, officialSurface: 'session', onOpenLink: noop });
  assert.match(billing, /data-error-fix="billing"[^]*>View billing</);
  assert.doesNotMatch(billing, />Open DeepSeek Platform</);
  const budget = draw({ error: { message: 'budget', codexErrorInfo: 'sessionBudgetExceeded' }, officialSurface: 'session', onNewSession: noop, onEditConfig: noop });
  assert.doesNotMatch(budget, />New session<|>Open config</);

  // main.jsx: the Code thread error is pK's surface, Cowork's Hn's; both get the core's sign-in.
  const main = read('src/main.jsx');
  const thread = main.slice(main.indexOf('turnId="thread" variant="card"'), main.indexOf('onEditConfig={boot?.connected ? () => call("desktop-edit-config")', main.indexOf('turnId="thread" variant="card"')));
  assert.match(thread, /officialSurface=\{mode === "code" \? "item" : "session"\}/);
  assert.match(thread, /onSignIn=\{hasSignInOptions\(boot\?\.core\) \? startCoreSignIn : undefined\}/);
});
