// w12c-wiring (3.6556.2): the hot-file wiring W12b left behind (reports/W12b/pending-wiring.md #1–#11), the Cowork
// activity toggle's RTL icon (W13 closeout coworkui-panel-05) and the zh-CN keys left without a reader.
// Source-only: official chunks are read as text, the titlebar renders through react-dom/server. No Electron, no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { titlebarSpawnSource } from '../src/titlebar-spawn-lead-model.mjs';
import { composerUsageNotice } from '../electron/usage-model.mjs';
import zhApp from '../electron/i18n/zh-CN/app.mjs';
import zhCommon from '../electron/i18n/zh-CN/common.mjs';
import zhSession from '../electron/i18n/zh-CN/session.mjs';
import zhPreview from '../electron/i18n/zh-CN/preview.mjs';
import zhTerminal from '../electron/i18n/zh-CN/terminal.mjs';

const app = path.resolve(import.meta.dirname, '..');
const official3 = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const h = React.createElement;
const enUS = JSON.parse(fs.readFileSync(path.join(ionSource, '../../i18n/en-US.json'), 'utf8'));
const main = read('src/main.jsx');

let server, T, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
});
after(async () => { I18n?.setLocale('en-US'); await server?.close(); });

const leadOf = (html) => html.slice(html.indexOf('<div class="st-lead'), html.indexOf('<div class="st-trailing'));

test('#1/#2 official: oG draws EP while it spawns (t null, o set), the spawn being the store\'s spawnOrigin', () => {
  pin(official3('cc43287c9-Me-M2ucD.js'), ['t||o?p(EP,{origin:pe&&{kind:pe,label:ve},title:J,bare:M})', 'spawn:le', 'L as EP']);
  pin(official3('c73f45bc3-B7hbL7H9.js'), ['ay as L']);
});

test('#1/#2 SSR: the New session titlebar\'s lead is EP while the first send spawns, nothing before it', () => {
  const spawn = titlebarSpawnSource({ spawnPhase: { token: 'wt-1', phase: 'worktree' }, cwd: '/Users/me/work/repo-a' });
  const render = (props) => renderToStaticMarkup(h(T.SourceTitlebar, { section: 'new', session: null, onRename() {}, ...props }));
  const spawning = leadOf(render({ spawning: true, starting: true, spawn }));
  assert.match(spawning, /^<div class="st-lead group\/lead"><span role="status" class="flex min-w-0 items-center"><span class="sr-only">Loading session<\/span>/);
  assert.match(spawning, /data-slot="origin-glyph" data-testid="epitaxy-origin-indicator"/);
  assert.equal(count(spawning, 'data-slot="title-ghost"'), 1);
  // Rail mode passes through (EP `bare: M`): no origin glyph.
  assert.equal(count(leadOf(render({ spawning: true, spawn, railMode: true })), 'data-slot="origin-glyph"'), 0);
  // Before a spawn the draft title shows (jre phase "draft"), not EP.
  const draft = render({ spawning: false, spawn: null });
  assert.equal(count(draft, 'role="status"'), 0);
  assert.match(draft, /<h1[^>]*data-pane-title=""[^>]*>New session<\/h1>/);
  // main.jsx hands the spawn only to the draft (no current session).
  assert.match(main, /spawning=\{!current && !!spawnPhase\}\n\s+spawn=\{!current \? titlebarSpawnSource\(\{ spawnPhase, cwd \}\) : null\}/);
  assert.match(main, /import \{ titlebarSpawnSource \} from "\.\/titlebar-spawn-lead-model\.mjs";/);
});

test('#3 queued band exit: main.jsx runs Jfe (useQueuedBandExit) and renders its entries', () => {
  pin(official3('cc43287c9-Me-M2ucD.js'), ['{entries:p,exiting:f,onExited:d}']);
  assert.match(main, /const queueBand = useQueuedBandExit\(current && queue\.threadId === current \? queue\.entries : \[\], current, \(entry\) => queuedEntryLanded\(entry, items\)\);/);
  assert.match(main, /\{current && queueBand\.entries\.length > 0 && \(\n\s+<SourceQueuedMessages key=\{`\$\{current\}:queued`\} entries=\{queueBand\.entries\} exiting=\{queueBand\.exiting\} onExited=\{queueBand\.onExited\}/);
  assert.doesNotMatch(main, /queue\.entries\.length > 0 && \(/);
  // The hook runs before main.jsx's first JSX return (rules of hooks: unconditional).
  assert.ok(main.indexOf('const queueBand = useQueuedBandExit(') < main.indexOf('<SourceQueuedMessages'));
});

test('#4/#5 refusal copy: the ! shell refusal is a VnmOeizKjx danger toast; /init and /theme say "then send it again"', () => {
  assert.equal(enUS.VnmOeizKjx, 'A shell command takes plain text only, so nothing was sent. Remove @-mentions, slash commands, and formatting.');
  assert.equal(enUS.hH0Sho9AXl, '/{commandName} only works on a single line. Remove the extra lines, then send it again.');
  assert.equal(enUS.cgTRRpTLBX, '/{commandName} doesn’t take arguments here. Remove the text after the command, then send it again.');
  assert.match(main, /if \(mentions\.length\) \{ const refused = t\("A shell command takes plain text only, so nothing was sent\. Remove @-mentions, slash commands, and formatting\."\); if \(toasts\) toasts\.add\(refused, \{ variant: "danger" \}\); else setError\(refused\); return; \}/);
  assert.ok(main.includes('t("/{command} doesn’t take arguments here. Remove the text after the command, then send it again.", { command: "init" })'));
  assert.ok(main.includes("t('/{command} only works on a single line. Remove the extra lines, then send it again.',{command:'theme'})"));
  for (const gone of ['@-mentions can’t be used in a shell command. Remove them, or remove the ! to send a message.',
    '/{command} only works on a single line. Remove the extra lines and try again.',
    '/{command} doesn’t take arguments here. Remove the text after the command and try again.']) {
    assert.equal(main.includes(gone), false, gone);
    assert.equal(gone in zhSession || gone in zhTerminal, false, `zh-CN ${gone}`);
  }
});

test('#6 annotations and the no-repo Changes state are wired', () => {
  assert.match(main, /makeSnippet\(text,\{key:entry\.key,label:[^\n]*,annotation:entry\}\)/);
  assert.match(main, /onClickAnnotation=\{\(annotation\) => \{ const target = annotationClickTarget\(annotation\); if \(!target\) return;\n\s+if \(target\.pane === "files"\) openFileRef\(\{ path: target\.path, line: target\.line \}\);\n\s+else \{ requestDiffReveal\(target\.path, \{ anchor: target\.anchor \}\); setPanel\("changes"\); \} \}\}/);
  assert.equal(count(main, 'diffNoRepo={!!current && gitStatus?.isRepo === false}'), 2);
  assert.equal(count(main, 'diffNoRepo={gitStatus?.isRepo === false}'), 1, 'the popout');
});

test('#7 usage band CTA: a member\'s limit asks the owner ("Request usage credits" → "Request sent to admin"), its body gone', () => {
  const chunk = official3('c227f4d5e-B-FYKrwT.js');
  pin(chunk, ['case"request-extra-usage":', 'u.formatMessage({defaultMessage:"Request sent to admin",id:"n8OjslQAdc"})',
    'u.formatMessage({defaultMessage:"Request usage credits",id:"3gNFS1DF0J"})', 'defaultMessage:"There was an error submitting your request. Try again later.",id:"5iDKTQDvkY"']);
  assert.ok(chunk.includes('{label:e,disabled:!0,pooledRequestState:t,variant:w,settled:n}'));
  const now = new Date(2026, 9, 28, 9, 0).getTime(), soon = now / 1000 + 25 * 60;
  const limits = (type) => ({ rateLimitsByLimitId: { codex: { primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, rateLimitReachedType: type } } });
  for (const [type, nudge] of [['workspace_member_usage_limit_reached', 'usage_limit'], ['workspace_member_credits_depleted', 'credits']]) {
    const notice = composerUsageNotice(limits(type), { now, locale: 'en-US' });
    assert.deepEqual([notice.nudge, notice.countdown.lead], [nudge, null], type);
    assert.match(notice.details, /^Resets at /, type);
  }
  const owner = composerUsageNotice(limits('workspace_owner_usage_limit_reached'), { now, locale: 'en-US' });
  assert.equal(owner.nudge, null);
  assert.equal(owner.countdown.lead, 'You’ve reached your usage limit. Increase your limits to continue using Codex.', 'no NI counterpart: the body stays');
  assert.match(main, /\.\.\.\(usageNotice \? \[\{ \.\.\.usageNotice, actions: usageNoticeActions \}\] : \[\]\),/);
  assert.match(main, /: usageNudgeState === "sent" \? \[\{ label: t\("Request sent to admin"\), disabled: true, run: \(\) => \{\} \}\]\n\s+: \[\{ label: t\("Request usage credits"\), busy: usageNudgeState === "busy"/);
  assert.match(main, /rpc\("account\/sendAddCreditsNudgeEmail", \{ creditType: usageNotice\.nudge \}\)/);
  assert.match(main, /!usageNotice\.nudge \? \[\{ label: t\("View usage"\), run: \(\) => setSettings\("usage"\) \}\]/);
  assert.match(read('src/source-session-notices.jsx'), /disabled=\{action\.disabled === true \|\| undefined\}/);
  for (const key of ['Request usage credits', 'Request sent to admin', 'There was an error submitting your request. Try again later.']) assert.ok(zhApp[key], key);
});

test('#7 SSR: a sent request is a disabled action', async () => {
  const N = await server.ssrLoadModule('/src/source-session-notices.jsx');
  const html = renderToStaticMarkup(h(N.SourceSessionNotices, { notices: [{ kind: 'usage', level: 'danger', summary: 'Usage limit reached', details: '',
    actions: [{ label: 'Request sent to admin', disabled: true, run() {} }] }] }));
  assert.match(html, /<button type="button" class="ssn-action" disabled="">Request sent to admin<\/button>/);
});

test('#8 account Learn more: external link first (trailing ArrowOutSquare), then the Separator, Keyboard shortcuts last', () => {
  pin(official3('cd75f6c8c-zFZzXb5w.js'), ['var X=n(g,{name:"ArrowOutSquare",size:"sm"})', 'pn=J0($,131)?K0($,131,n(c.Separator,{})):$[131]',
    'children:[Qt,en,tn,nn,rn,on,cn,ln,un,fn,pn,gn]']);
  const account = main.slice(main.indexOf('case "account":'), main.indexOf('case "connection":'));
  const popup = account.slice(account.indexOf('className="account-learn-more"'));
  const order = ['data-testid="user-menu-core-homepage" trailing={<CdsIcon name="ArrowOutSquare" size="sm" />}', '<SourceMenu.Separator />', 't("Keyboard shortcuts")}</SourceMenu.Item>']
    .map((needle) => popup.indexOf(needle));
  assert.ok(order.every((index, at) => index > 0 && (at === 0 || index > order[at - 1])), `order: ${order}`);
  assert.match(main, /import \{ CdsIcon \} from "\.\/generated\/view-tabs\/index\.js";/);
});

test('#9 default browser name: main.cjs answers desktop:call "default-browser-name", preload exposes getDefaultBrowserName', () => {
  const mainCjs = read('electron/main.cjs'), preload = read('electron/preload.cjs');
  assert.match(mainCjs, /const defaultBrowserName = require\("\.\/default-browser-name\.cjs"\)\.createDefaultBrowserName\(\{ app, warn: /);
  assert.match(mainCjs, /case "default-browser-name": return defaultBrowserName\(\);/);
  assert.match(mainCjs, /const POPOUT_ACTIONS = new Set\(\[[^\n]*"default-browser-name"\]\);/);
  assert.match(preload, /getDefaultBrowserName: \(\) => unwrapped\(ipcRenderer\.invoke\("desktop:call", "default-browser-name"\)\),/);
  assert.match(read('src/default-browser-name.mjs'), /bridge\?\.getDefaultBrowserName\?\.\(\)/);
});

test('#10 menu ko(): installAppMenu passes otherWindowFocused, ybi rebuilds on focus / blur', () => {
  const build = fs.readFileSync(path.join(ionSource, '../../../asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  pin(build, ['function ko(){let e=a.BrowserWindow.getFocusedWindow();return e!=null&&B!=null&&!B.isDestroyed()&&e!==B}',
    'function ybi(){let e=ko(),t=()=>{let t=ko();t!==e&&(e=t,CM())};a.app.on("browser-window-focus",t),a.app.on("browser-window-blur",t)}']);
  const mainCjs = read('electron/main.cjs');
  assert.match(mainCjs, /splitMenuState,isOtherWindowFocused,watchOtherWindowFocus\} = require\("\.\/app-menu\.cjs"\);/);
  assert.match(mainCjs, /otherWindowFocused: otherWindowFocused\(\) \}\)\)\);\n\}\nfunction otherWindowFocused\(\) \{ return isOtherWindowFocused\(\{ focused: BrowserWindow\.getFocusedWindow\(\), main: win \}\); \}/);
  assert.match(mainCjs, /  installAppMenu\(\);\n(?:  \/\/[^\n]*\n)*  watchOtherWindowFocus\(\{ app, otherWindowFocused, rebuild: installAppMenu \}\);\n  desktopReady = true;/);
});

test('#11 Browser tools description is idMrSFp0DS (Claude named DeepSeek)', () => {
  assert.equal(enUS.idMrSFp0DS, 'Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.');
  assert.ok(official3('c71860c77-C3tXoNVw.js').includes('defaultMessage:"Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.",id:"idMrSFp0DS"'));
  const settings = read('src/source-settings.jsx');
  assert.ok(settings.includes("booleanRow('agentPreview',t('Browser tools'),t('DeepSeek can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.'),{checked:browserTools})"));
  assert.doesNotMatch(settings, /open them in the Preview pane, and check its changes/);
  assert.doesNotMatch(settings, /grid-cols-2 gap-md py-md\)/);
  assert.ok(zhPreview['DeepSeek can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.']);
  assert.equal(Object.keys(zhPreview).some((key) => key.includes('open them in the Preview pane')), false);
});

test('coworkui-panel-05: the activity toggle\'s icon is TV("end"), Sidebar under an RTL document', () => {
  pin(official3('shared-1-BJhqMmkf.js'), ['function TV(e){let t=p()!=="rtl";return e==="start"===t?"Sidebar":"SidebarRight"}', 'Ia as p,']);
  const glyphs = JSON.parse(read('src/generated/icons.json'));
  const render = () => renderToStaticMarkup(h(T.SourceTitlebar, { surface: 'cowork', section: 'new', session: { id: 'a', name: 'A', cwd: '/tmp/a' }, onRename() {}, onToggleActivity() {} }));
  const button = (html) => html.match(/<button[^>]*aria-label="Activity panel"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
  const had = Object.getOwnPropertyDescriptor(globalThis, 'document');
  assert.ok(button(render()).includes(String.fromCodePoint(glyphs.SidebarRight)), 'LTR: SidebarRight');
  try {
    Object.defineProperty(globalThis, 'document', { value: { documentElement: { dir: 'rtl' } }, configurable: true, writable: true });
    const rtl = button(render());
    assert.ok(rtl.includes(String.fromCodePoint(glyphs.Sidebar)), 'RTL: Sidebar');
    assert.equal(rtl.includes(String.fromCodePoint(glyphs.SidebarRight)), false);
  } finally {
    if (had) Object.defineProperty(globalThis, 'document', had); else delete globalThis.document;
  }
});

test('zh-CN: keys left without a reader are gone', () => {
  assert.equal('No answer came back.' in zhSession, false);
  assert.equal('Changing the language reloads the window.' in zhCommon, false);
  assert.equal('This core doesn’t support side questions.' in zhSession, false);
  assert.equal('Stop {count} servers and close' in zhPreview, false);
  for (const rel of ['src', 'electron']) {
    const stack = [path.join(app, rel)];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (!/generated|i18n/.test(full)) stack.push(full); continue; }
        if (!/\.(m?js|jsx|cjs)$/.test(entry.name)) continue;
        const text = fs.readFileSync(full, 'utf8');
        for (const key of ['No answer came back.', 'Changing the language reloads the window.', 'This core doesn’t support side questions.', 'Stop {count} servers and close'])
          assert.equal(text.includes(key), false, `${key} in ${full}`);
      }
    }
  }
});
