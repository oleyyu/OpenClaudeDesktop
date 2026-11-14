// W14-code r7 frame: ⌘K Fork while running / archived (fr7-01 / fr7-02), the sidebar Show more classes (fr7-03), the bulk
// Set model toasts (fr7-04) and the Computer use permission rows with no native module (sh7-02, already official).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const app = path.resolve(import.meta.dirname, '..');
const local = (file) => readFileSync(path.join(app, file), 'utf8');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (name) => readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
let server;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

// cf74bc599 WN `$e("fork_code_session", K && !g && Oe ? nt : void 0, lt)`: g is the shared / tagged check, Oe the bridge's
// host reasons — no running (`busy`) and no archived condition.
test('fr7-01 / fr7-02: the ⌘K Fork session row is not hidden while the session runs or once it is archived', () => {
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('$e("fork_code_session",K&&!g&&Oe?nt:void 0,lt)'));
  const main = local('src/main.jsx');
  assert.match(main, /canFork: !!boot\?\.connected && !unsupportedCommand\("fork", commandContext\),/);
  assert.doesNotMatch(main, /canFork: !busy/);
  assert.doesNotMatch(main, /canFork: [^\n]*!archived/);
  // cd54a5401 forkDisabledReason: Qt — the row menu has no archived reason (source-sidebar-states.test.mjs renders it).
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /Restore this session before forking it\./);
  // session-operations.cjs: fork accepts an archived id; compact and review still need an active one.
  const ops = local('electron/session-operations.cjs');
  assert.match(ops, /const known = \(\) => operation === 'fork' \? config\.threadIds\.includes\(threadId\) \|\| config\.archivedThreadIds\.includes\(threadId\)\n\s+: config\.threadIds\.includes\(threadId\) && !config\.archivedThreadIds\.includes\(threadId\);/);
});

// shared-21 gX `B = (_ ? cX : x ? oX : iX) + hX`: the host .source-show-more rule is gone, the classes are official.
test('fr7-03: Show more uses the gX class strings and the {bucketLabel} aria name; .source-show-more is gone', async () => {
  const s21 = official('shared-21-R7LldJ05.js');
  for (const piece of ['iX=rX+" px-[var(--df-row-px)]"', 'oX=rX+` ${bm} pe-[var(--df-row-px)]`', 'B=(_?cX:x?oX:iX)+hX', '"Show {count} more in {bucketLabel}",id:"Qqm1d4ZUyL"'])
    assert.ok(s21.includes(piece), piece);
  assert.doesNotMatch(local('src/source-sidebar.css'), /source-show-more/);
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /source-show-more|Show \{count\} more in \{group\}/);
  // Inside the Code list (shared-20 sC provides shared-18 KO while the presets gate is on) the button is oX.
  // W14-code r8 fr8-01: the flag is a local (it also gates the trailing awaiting glyph).
  assert.match(local('src/source-sidebar.jsx'), /const inList = mode === "code" && environmentsOn;/);
  assert.match(local('src/source-sidebar.jsx'), /<SourceShowMoreButton bucketLabel=\{group\.label\} count=\{truncated\.revealCount\} fewer=\{fewer\} inList=\{inList\}/);
  const { SourceShowMoreButton } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const html = renderToStaticMarkup(React.createElement(SourceShowMoreButton, { bucketLabel: 'Today', count: 3, inList: true }));
  assert.match(html, /aria-label="Show 3 more in Today" class="[^"]* ps-\[calc\(var\(--df-row-px\)\+var\(--df-row-indent,0px\)\)\] pe-\[var\(--df-row-px\)\] aria-disabled:data-\[held\]:pointer-events-auto/);
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh['Show {count} more in {bucketLabel}'], '在 {bucketLabel} 中再显示 {count} 个');
});

test('fr7-04: bulk Set model toasts format the sliced c39a247c4 Bt messages (English and zh-CN)', async () => {
  const c39 = official('c39a247c4--WbIrj9D.js');
  assert.ok(c39.includes('bulkModelSet:{defaultMessage:"Model set for {count, plural, one {# session} other {# sessions}}",id:"H9CZcZ7FTW"}'));
  assert.ok(c39.includes('c>0&&a(i.formatMessage(Bt.bulkModelSet,{count:c}),{timeout:3e3})'));
  const { sidebarBulkModelMessages } = await server.ssrLoadModule('/src/generated/sessions-page/pure-c39a247c4.mjs');
  const { createStartIntl } = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  const intl = createStartIntl('en-US');
  assert.equal(intl.formatMessage(sidebarBulkModelMessages.bulkModelSet, { count: 1 }), 'Model set for 1 session');
  assert.equal(intl.formatMessage(sidebarBulkModelMessages.bulkModelSetFailed, { count: 2 }), 'Model couldn’t be set for 2 sessions. Try again.');
  const source = local('src/source-sidebar.jsx');
  assert.match(source, /notify\(intl\.formatMessage\(sidebarBulkModelMessages\.bulkModelSet, \{ count: changed \}\), \{ variant: "neutral", key: "bulk-set-model", timeout: 3000 \}\)/);
  assert.match(source, /notify\(intl\.formatMessage\(sidebarBulkModelMessages\.bulkModelSetFailed, \{ count: failed \}\), \{ variant: "danger" \}\)/);
  assert.doesNotMatch(source, /tn\(changed, "Model set for/);
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh[sidebarBulkModelMessages.bulkModelSet.defaultMessage], '已为 {count, plural, one {# 个会话} other {# 个会话}}设置模型');
  assert.ok(zh[sidebarBulkModelMessages.bulkModelSetFailed.defaultMessage]);
});

// sh7-02 (checked, no change): the official main mqi.getState answers NotSupported for both rows when the native module
// cannot load, and c71860c77 Zt draws them only under `d && R`, R = c7f132ac0 x("permissions") = `t && i !== null &&
// (i.accessibility !== n.NotSupported || i.screenRecording !== n.NotSupported)` — so with no module neither row shows,
// exactly the host's failed probe (permissions null). "Not supported" is reachable only for one of the two rows.
test('sh7-02: with no native module the official section hides both permission rows, as the host does', () => {
  const main = readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.ok(main.includes('return e?{accessibility:pqi(e.tcc.checkAccessibility()),screenRecording:pqi(e.tcc.checkScreenRecording()),microphone:fqi()}:{accessibility:bv.NotSupported,screenRecording:bv.NotSupported,microphone:fqi()}'));
  assert.ok(official('c7f132ac0-DCY_PWv3.js').includes('case"permissions":return t&&i!==null&&(i.accessibility!==n.NotSupported||i.screenRecording!==n.NotSupported)'));
  assert.ok(official('c71860c77-BH7EuJ1o.js').includes('Tt("permissions",e)'));
  // W14-code r8 sh8-01: the host now models tccState (both notSupported without the native module) and R itself.
  assert.match(local('src/source-settings-computer-use.jsx'), /\.\.\.\(computerUsePermissionRowsShown\(tcc\) \? \[\n\s+row\('computer-use-accessibility'/);
});
