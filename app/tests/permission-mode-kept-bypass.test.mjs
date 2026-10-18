// R4i-small SM2 (composer-05): the kept Bypass pick (2.42304.0 cef1e6037 picks store, c227f4d5e gn, cc0051c10 copy) on
// the host: kept only where a mode change waits for the next turn/start (a core without capabilities.livePermissions,
// i.e. Codex). The pure model runs directly; the bypass hook and the Mode menu render once with Vite SSR (hmr, ws off).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import {
  BYPASS_KEPT_ROW, BYPASS_KEPT_TOAST, KEPT_BYPASS_CONFIRM_MS, KEPT_BYPASS_KILL_SWITCH, KEPT_BYPASS_SESSION_READ_MS,
  dropBypassPick, hasBypassPick, keepBypassPick, keepsBypassPick, keptBypassEnabled, settleBypassPicks,
} from '../src/permission-mode-kept-bypass.mjs';
import zhSession from '../electron/i18n/zh-CN/session.mjs';
import { withPreviewDom } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const official = name => fs.readFileSync(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Bypass, Menu, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Bypass = await server.ssrLoadModule('/src/source-bypass-permission.jsx');
  Menu = await server.ssrLoadModule('/src/source-permission-menu.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
});
after(async () => { await server?.close(); });

test('the shipped store, its gate, the pick path and the copy are pinned once each', () => {
  const store = official('cef1e6037-8DivyY4m.js');
  assert.equal(count(store, 'var q=Ee()(()=>({picks:{}})),$t="__gb__3409701119",en=12e4,tn=1e4,'), 1);
  assert.equal(count(store, 'e.message.includes("not launched with --dangerously-skip-permissions")&&dn(t)?.isRunning===!0&&!f()&&!s($t)'), 1);
  assert.equal(count(store, 'un(e,{modeAtPick:r.permissionMode,turnEnded:!1,sent:!1,tell:n})'), 1);
  assert.equal(count(store, 'if(t===void 0||t.isArchived===!0||t.permissionMode!==r.modeAtPick&&!i){Y(e);return}'), 1);
  assert.equal(count(store, 'export{'), 1);
  assert.ok(/_n as _,/.test(store) && /mn as b,/.test(store) && /gn as x,/.test(store) && /Y as y,/.test(store));
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  assert.equal(count(composer, 'import{_ as Zp,b as Qp,p as $p,v as em,x as tm,y as nm}from"./cef1e6037-8DivyY4m.js"'), 1);
  assert.equal(count(composer, 'a==="bypassPermissions"&&Zp(o,sn)&&Qp(sn,l,qI(e,n,t,i,sn))?(v(),tt(null),r(e.formatMessage(w_.bypassKeptToast)),"applied")'), 1);
  assert.equal(count(composer, 'description:vt&&t==="bypassPermissions"?e.formatMessage(w_.bypassKeptRow):void 0'), 1);
  assert.equal(count(composer, 'vt=tm(o?.type==="local"?o.id:null)'), 1);
  const copy = official('cc0051c10-pi8fKHOz.js');
  assert.equal(count(copy, `bypassKeptRow:{defaultMessage:"${BYPASS_KEPT_ROW}",id:"RvbwIvF4xv"}`), 1);
  assert.equal(count(copy, `bypassKeptToast:{defaultMessage:"${BYPASS_KEPT_TOAST}",id:"00YMYeBYsv"}`), 1);
  assert.equal(KEPT_BYPASS_KILL_SWITCH, '__gb__3409701119');
  assert.equal(KEPT_BYPASS_CONFIRM_MS, 120000);
  assert.equal(KEPT_BYPASS_SESSION_READ_MS, 10000);
});

test('the pick is kept only mid-turn on a core without live permissions, with the kill switch off', () => {
  const codex = { value: 'bypass', previous: 'auto', sessionId: 's1', running: true, livePermissions: false, connected: true };
  assert.equal(keptBypassEnabled({}), true);
  assert.equal(keptBypassEnabled({ [KEPT_BYPASS_KILL_SWITCH]: true }), false);
  assert.equal(keepsBypassPick(codex), true);
  // DeepSeek, the ACP bridges, ZCode, OpenCode, MiMo: codeDesktop/thread/permissions applies it at once.
  assert.equal(keepsBypassPick({ ...codex, livePermissions: true }), false);
  assert.equal(keepsBypassPick({ ...codex, running: false }), false);
  assert.equal(keepsBypassPick({ ...codex, sessionId: null }), false);
  assert.equal(keepsBypassPick({ ...codex, connected: false }), false);
  assert.equal(keepsBypassPick({ ...codex, previous: 'bypass' }), false);
  assert.equal(keepsBypassPick({ ...codex, value: 'acceptEdits' }), false);
  assert.equal(keepsBypassPick({ ...codex, flags: { [KEPT_BYPASS_KILL_SWITCH]: true } }), false);
});

test('picks keep, drop and settle like the store (turn over, or mode no longer Bypass)', () => {
  let picks = keepBypassPick({}, 's1', 'auto');
  picks = keepBypassPick(picks, 's2', 'ask');
  assert.deepEqual(picks, { s1: { modeAtPick: 'auto' }, s2: { modeAtPick: 'ask' } });
  assert.equal(hasBypassPick(picks, 's1'), true);
  assert.equal(hasBypassPick(picks, 's3'), false);
  assert.equal(hasBypassPick(picks, null), false);
  const same = settleBypassPicks(picks, { active: { s1: true, s2: true }, modeFor: () => 'bypass' });
  assert.equal(same, picks);
  assert.deepEqual(settleBypassPicks(picks, { active: { s1: true }, modeFor: () => 'bypass' }), { s1: { modeAtPick: 'auto' } });
  assert.deepEqual(settleBypassPicks(picks, { active: { s1: true, s2: true }, modeFor: id => id === 's1' ? 'acceptEdits' : 'bypass' }), { s2: { modeAtPick: 'ask' } });
  assert.deepEqual(settleBypassPicks(picks, { active: {} }), {});
  assert.equal(dropBypassPick(picks, 'missing'), picks);
  assert.deepEqual(dropBypassPick(picks, 's2'), { s1: { modeAtPick: 'auto' } });
});

test('the hook starts with nothing kept and shows the remembered mode', () => {
  let hook;
  function Probe(props) { hook = Bypass.useBypassPermission(props); return null; }
  renderToString(React.createElement(Probe, { permission: 'auto', enabled: true, mode: 'code', sessionKey: 's1', cwd: '/w', connectionKey: 'c', onChange() {},
    running: true, livePermissions: false, activeSessions: { s1: true } }));
  assert.equal(hook.kept, false);
  assert.equal(hook.keptRow, BYPASS_KEPT_ROW);
  assert.equal(hook.permission, 'auto');
  // The Mode menu popup needs a document (source-menu PopupImpl), so its kept-row copy is checked in the source below.
});

// R4i 复核修复: the hook's confirm/select/settle paths run for real (createRoot in the R3b fake DOM, React act), with
// main's own state flow stood in for by a props holder: onChange stores the picked mode (no layers, so `permission` is
// the remembered mode) and the test rerenders with the new running / activeSessions like main's state.active.
async function drive(body) {
  return withPreviewDom(async (dom) => {
    const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    const toasts = [], changes = [];
    let hook, props;
    function Probe(next) { hook = Bypass.useBypassPermission(next); return null; }
    const show = (patch = {}) => act(async () => {
      props = { ...props, ...patch };
      root.render(React.createElement(Probe, props));
    });
    props = { permission: 'auto', enabled: true, mode: 'code', sessionKey: 's1', cwd: '/w', connectionKey: 'c',
      running: true, livePermissions: false, connected: true, activeSessions: { s1: true },
      onChange(value) { changes.push(value); props = { ...props, permission: value }; },
      onKept(message) { toasts.push(message); } };
    try {
      await show();
      return await body({ hook: () => hook, show, run: (fn) => act(async () => { fn(hook); }), toasts, changes, dom, container });
    } finally {
      await act(async () => root.unmount());
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    }
  });
}

test('behaviour: Bypass confirmed mid-turn on a core without live permissions is kept, toasts once, then settles when the turn ends', async () => {
  await drive(async ({ hook, show, run, toasts, changes }) => {
    assert.equal(hook().kept, false);
    await run((h) => h.select('bypass'));
    assert.equal(hook().confirming, true);
    assert.deepEqual(changes, []);
    await run((h) => h.confirm());
    await show();
    assert.deepEqual(changes, ['bypass']);
    assert.equal(hook().permission, 'bypass');
    assert.equal(hook().kept, true);
    assert.deepEqual(toasts, [BYPASS_KEPT_TOAST]);
    // Another session's turn ending leaves this pick alone.
    await show({ activeSessions: { s1: true, s2: false } });
    assert.equal(hook().kept, true);
    // The turn is over: main drops s1 from state.active, the effect settles the pick and the mode stays Bypass.
    await show({ running: false, activeSessions: {} });
    assert.equal(hook().kept, false);
    assert.equal(hook().permission, 'bypass');
    assert.deepEqual(toasts, [BYPASS_KEPT_TOAST]);
  });
});

test('behaviour: picking another mode drops the kept pick; a later Bypass mid-turn keeps again', async () => {
  await drive(async ({ hook, show, run, toasts, changes }) => {
    await run((h) => h.select('bypass'));
    await run((h) => h.confirm());
    await show();
    assert.equal(hook().kept, true);
    await run((h) => h.select('acceptEdits'));
    await show();
    assert.deepEqual(changes, ['bypass', 'acceptEdits']);
    assert.equal(hook().permission, 'acceptEdits');
    assert.equal(hook().kept, false);
    // Back to Bypass while the same turn still runs: confirmed again, kept again, toasted again.
    await run((h) => h.select('bypass'));
    await run((h) => h.confirm());
    await show();
    assert.equal(hook().kept, true);
    assert.equal(toasts.length, 2);
  });
});

test('behaviour: nothing is kept on a core with live permissions, when idle, or when the opt-in is off', async () => {
  await drive(async ({ hook, show, run, toasts, changes }) => {
    await show({ livePermissions: true });
    await run((h) => h.select('bypass'));
    await run((h) => h.confirm());
    await show();
    assert.deepEqual(changes, ['bypass']);
    assert.equal(hook().permission, 'bypass');
    assert.equal(hook().kept, false);
    assert.deepEqual(toasts, []);
  });
  await drive(async ({ hook, show, run, toasts }) => {
    await show({ running: false, activeSessions: {} });
    await run((h) => h.select('bypass'));
    await run((h) => h.confirm());
    await show();
    assert.equal(hook().kept, false);
    assert.deepEqual(toasts, []);
  });
  await drive(async ({ hook, show, run, toasts }) => {
    await run((h) => h.select('bypass'));
    await run((h) => h.confirm());
    await show();
    assert.equal(hook().kept, true);
    // Turning the opt-in off hides the kept state (available false) and settles the pick.
    await show({ enabled: false });
    assert.equal(hook().kept, false);
    await show({ enabled: true });
    assert.equal(hook().kept, false);
    assert.equal(toasts.length, 1);
  });
});

test('behaviour: the Mode menu swaps the Bypass row description only while the pick is kept', async () => {
  await withPreviewDom(async (dom) => {
    const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const anchor = dom.document.body.appendChild(dom.document.createElement('button'));
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    const text = () => dom.document.body.textContent;
    try {
      const menu = (bypassKept) => React.createElement(Menu.SourcePermissionMenu, { anchor, value: 'bypass', bypassEnabled: true, bypassKept, onChange() {}, onClose() {} });
      await act(async () => root.render(menu(true)));
      assert.ok(text().includes(BYPASS_KEPT_ROW), 'kept: the Bypass row reads the kept copy');
      assert.equal(text().includes('Accepts all permissions'), false);
      await act(async () => root.render(menu(false)));
      assert.equal(text().includes(BYPASS_KEPT_ROW), false);
      assert.ok(text().includes('Accepts all permissions'));
    } finally {
      await act(async () => root.unmount());
      globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    }
  });
});

test('wiring: the hook keeps on confirm, drops on another pick, and main/menu/i18n pass it through', () => {
  const hook = local('src/source-bypass-permission.jsx');
  assert.equal(count(hook, "import { BYPASS_KEPT_ROW, BYPASS_KEPT_TOAST, dropBypassPick, hasBypassPick, keepBypassPick, keepsBypassPick, settleBypassPicks } from './permission-mode-kept-bypass.mjs';"), 1);
  assert.equal(count(hook, 'running = false, livePermissions = true, connected = true, activeSessions = null, onKept = null'), 1);
  assert.equal(count(hook, 'setKeptPicks((picks) => keepBypassPick(picks, now.sessionKey, shown));'), 1);
  assert.equal(count(hook, 'now.onKept?.(t(BYPASS_KEPT_TOAST));'), 1);
  assert.equal(count(hook, "if (value !== 'bypass' && sessionKey) setKeptPicks((picks) => dropBypassPick(picks, sessionKey));"), 1);
  assert.equal(count(hook, "kept: available && shown === 'bypass' && hasBypassPick(keptPicks, sessionKey),"), 1);
  const main = local('src/main.jsx');
  assert.equal(count(main, 'running: !!state.active[current], livePermissions: boot?.core?.capabilities?.livePermissions === true, connected: !!boot?.connected,'), 1);
  assert.equal(count(main, 'activeSessions: state.active, onKept: (message) => { if (toasts) toasts.add(message, { variant: "neutral" }); },'), 1);
  assert.equal(count(main, 'bypassEnabled={bypassMode.available} bypassKept={bypassMode.kept}'), 1);
  // The live-permission effect still applies a Mode change at once on cores that list livePermissions.
  assert.equal(count(main, 'const livePermissions = boot?.core?.capabilities?.livePermissions === true;'), 1);
  const menu = local('src/source-permission-menu.jsx');
  assert.equal(count(menu, 'description={bypassKept && option.value === "bypass" ? t("Turns on when Claude finishes working.") : option.description}'), 1);
  assert.equal(zhSession[BYPASS_KEPT_ROW], 'Claude 完成工作后开启。');
  assert.equal(zhSession[BYPASS_KEPT_TOAST], 'Claude 完成工作后，绕过权限将开启。');
  // Codex is the one core here without live permissions; every bridge descriptor or bridge reports them.
  assert.equal(count(local('electron/cores/codex.mjs'), 'livePermissions'), 0);
});
