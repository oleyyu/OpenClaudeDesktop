import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// W14-code round 6, lane panes: the host button replica swept from the Code surfaces (R6DC-02 /
// css6-settings-button-code-callers / sh6-03 / r6pa-04), the Stop buttons as c96d752d0 UQ (r6pa-03), the loop / preview
// server cards as cccc2cf0a $M / tN / nN (r6pa-06), the TOC on the rail band (css6-toc-position-gutter) and the MCP
// Always allow tooltip (r6pa-08, in approval-card-model.test.mjs). The preview start page (r6pa-05) and the focus
// sentinel are in preview-pane-render.test.mjs. Official chunks are read as text only.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const h = React.createElement;

let server, B, D, R, T, P, PM, i18n, persona;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  B = await server.ssrLoadModule('/src/source-background-tasks.jsx');
  D = await server.ssrLoadModule('/src/source-dialog.jsx');
  R = await server.ssrLoadModule('/src/source-recap-card.jsx');
  T = await server.ssrLoadModule('/src/source-turn-error.jsx');
  P = await server.ssrLoadModule('/src/source-preview-pane.jsx');
  PM = await server.ssrLoadModule('/src/preview-model.mjs');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  persona = await server.ssrLoadModule('/src/persona-store.mjs');
});
after(() => server?.close());

const CODE_FILES = ['source-toast', 'source-dialog', 'source-settings-computer-use', 'source-session-actions', 'source-turn-error',
  'source-terminal-pane', 'source-pane-states', 'source-task-backlog', 'source-transcript-selection', 'source-transcript-states',
  'source-recap-card', 'source-resume-dialog', 'source-watch-record', 'source-coachmark', 'source-composer-editor',
  'source-bypass-permission', 'source-auto-review', 'source-sidebar-palette', 'source-code-start-adapters', 'source-preview-address',
  'source-preview-link-chooser', 'source-preview-server-menu', 'source-preview-settings-menu', 'source-saved-environment-dialog',
  'source-background-tasks', 'source-session', 'source-preview-pane', 'source-chapters'];

test('R6DC-02 / sh6-03 / r6pa-04: the Code surfaces use shared-frame Uu (CdsButton), not the host replica or its restatements', () => {
  assert.ok(official('shared-frame-6jtSkIit').includes('Uu as CdsButton') || local('src/generated/view-tabs/shared-frame-6jtSkIit.js').includes('Uu as CdsButton'));
  for (const name of CODE_FILES) {
    const source = local(`src/${name}.jsx`);
    assert.ok(!source.includes('SourceSettingsButton'), `${name}.jsx: no SourceSettingsButton`);
    assert.ok(!/source-settings-button\.jsx/.test(source), `${name}.jsx: no import of the replica`);
    assert.ok(!/iconSize=/.test(source.replace(/\/\/.*$/gm, '')), `${name}.jsx: no replica-only iconSize prop`);
  }
  for (const css of ['source-turn-error', 'source-task-backlog', 'source-user-delivery', 'source-recap-card', 'source-coachmark', 'source-saved-environment-dialog']) {
    const text = local(`src/${css}.css`).replace(/\/\*[^]*?\*\//g, '');
    assert.doesNotMatch(text, /source-settings-button|\.ssb-/, `${css}.css: no rule over the replica`);
  }
  // The component itself stays for Chat / Cowork / Settings (not Code-only).
  assert.ok(fs.existsSync(path.join(app, 'src/source-settings-button.jsx')));
});

test('sh6-03: SourceDialog close X is shared-frame Xy (ghost iconOnly X, tooltip off); confirm footer as ab', () => {
  const xy = local('src/generated/view-tabs/shared-frame-6jtSkIit.js');
  assert.ok(xy.includes('b(Uu,{variant:"ghost",iconOnly:!0,icon:"X","aria-label":o,tooltip:!1,className:c})'));
  assert.ok(xy.includes('b(Uu,{ref:M,variant:"secondary",disabled:A,"data-initial-focus":Ne,children:k})'));
  const html = renderToStaticMarkup(h(D.SourceDialogCloseButton, { flush: true, onClick() {} }));
  assert.match(html, /^<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" class="cds-reset [^"]* -me-pad-sm -mt-pad-sm" aria-label="Close">/);
  assert.doesNotMatch(html, /source-settings-button|ssb-|data-cds-tooltip-pending/);
  // shared-22 QI: the toast action is `o(A,{size:"sm",variant:"secondary",onClick:…})`.
  assert.match(local('src/source-toast.jsx'), /<CdsButton size="sm" variant="secondary" onClick=/);
  // c71860c77: Open System Settings `r(_,{variant:"secondary",size:"sm",…})`; chip X `variant:"ghost",size:"xxs",iconOnly:!0,icon:"X",flush:"end"`.
  const c71 = fs.readdirSync(v1).filter((f) => f.startsWith('c71860c77') && f.endsWith('.js')).map((f) => fs.readFileSync(path.join(v1, f), 'utf8')).join('\n');
  assert.ok(c71.includes('r(_,{variant:"ghost",size:"xxs",iconOnly:!0,icon:"X",flush:"end"'));
  assert.match(local('src/source-settings-computer-use.jsx'), /<CdsButton variant="ghost" size="xxs" iconOnly icon="X" flush="end"/);
});

test('R6DC-02: the turn-error card Dismiss / Copy details and the recap card are CdsButton with the official classes', () => {
  const card = renderToStaticMarkup(h(T.SourceTurnError, { error: { message: 'x' }, turnId: 't', onDismiss() {} }));
  assert.match(card, /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="sm" class="cds-reset [^"]* text-muted-as-secondary hover:text-primary" aria-label="Dismiss"/);
  assert.ok(local('src/source-turn-error.jsx').includes('<CdsButton variant="ghost" size="sm" icon={copied ? "Check" : "Copy"} flush="start"'));
  const recap = renderToStaticMarkup(h(R.SourceRecapCard, { recap: { status: 'done', text: 'Fixed it' }, onDismiss() {} }));
  const c96 = official('c96d752d0-CWv_7-n9');
  assert.ok(c96.includes('f(J,{variant:"ghost",iconOnly:!0,size:"base",icon:"X","aria-label":l,onMouseDown:Hv,onClick:n,className:"-me-1.5 text-secondary hover:bg-alpha-2"})'));
  assert.ok(c96.includes('_("header",{className:"flex items-center justify-between gap-2 border-b px-3 py-1.5",children:[c,u]})'));
  assert.match(recap, /<header class="flex items-center justify-between gap-2 border-b px-3 py-1\.5"><h3 class="src-recap-title text-caption font-medium text-secondary">Recap<\/h3><button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" class="[^"]* -me-1\.5 text-secondary hover:bg-alpha-2" aria-label="Dismiss recap"/);
  // c96d752d0 failed send: `f(J,{variant:"ghost",size:"xxs",onMouseDown:Hv,onClick:N.onRetry,…})`.
  assert.ok(c96.includes('f(J,{variant:"ghost",size:"xxs",onMouseDown:Hv,onClick:N.onRetry'));
  assert.match(local('src/source-session.jsx'), /<CdsButton variant="ghost" size="xxs" className="source-user-failed-button"[^\n]*onClick=\{delivery\.onRetry\}>/);
});

test('R6DC-02: the suggested-task chips are cc43287c9 Hse (joined ButtonGroup) and Gse / Bse class strings', () => {
  const cc = official('cc43287c9-Me-M2ucD');
  for (const piece of ['"data-task-backlog-chip":m,variant:h,buttonVariant:g,size:_,"aria-label":y,className:b',
    'l=Oe,m="",h="joined",g="secondary",_="xs",y=k,b="min-w-0 max-w-full shrink"', 'className:"line-clamp-2 text-body text-primary [overflow-wrap:anywhere]"',
    'f="h-auto min-h-control min-w-0 flex-1 justify-start whitespace-normal py-xs text-start"', '"ul",{ref:l,role:"list",className:"flex flex-col gap-0.5"'])
    assert.ok(cc.includes(piece), piece);
  const source = local('src/source-task-backlog.jsx');
  assert.match(source, /<CdsButtonGroup data-task-backlog-chip="" variant="joined" buttonVariant="secondary" size="xs" aria-label=\{title\} className="min-w-0 max-w-full shrink">/);
  assert.match(source, /<CdsButton className="min-w-0 shrink"/);
  assert.match(source, /<span className="truncate">\{chipLabel\(title\)\}<\/span>/);
  assert.match(source, /<CdsButton icon="X" iconOnly data-task-backlog-delete=""[^]*?tooltip=\{t\("Delete"\)\}/);
  assert.match(source, /<li className="flex items-center gap-xs">/);
  assert.match(source, /<CdsButton variant="ghost" size="sm" icon="X" iconOnly flush="end" className="shrink-0" data-task-backlog-delete=""/);
  assert.match(source, /<ul ref=\{listRef\} role="list" className="flex flex-col gap-0\.5">/);
  assert.match(source, /className="text-secondary" aria-haspopup="dialog"/);
  assert.doesNotMatch(local('src/source-task-backlog.css').replace(/\/\*[^]*?\*\//g, ''), /\.stb-(chip|row|see-all|list)(?![\w-])|\.stb-(chip|row)-/);
});

test('r6pa-03: the task Stop button is c96d752d0 UQ (TaskStopButton) with busyLabel Stopping…', () => {
  const html = renderToStaticMarkup(h(B.TaskCard, { task: { id: 'x', kind: 'bash', status: 'running', description: 'npm test', startedAt: Date.now() },
    sessionId: 's', expanded: false, stopping: true, onStop() {}, onOpen() {}, onToggle() {} }));
  assert.match(html, /<span class="contents"><button type="button" data-cds="Button" data-cds-icon-only="" data-size="sm" class="[^"]* epitaxy-task-row-secondary shrink-0" aria-busy="true" aria-disabled="true" aria-label="Stop this task"/);
  assert.match(html, />Stopping…</, 'the busy spinner speaks Stopping…');
  assert.doesNotMatch(html, /sbt-stop|source-settings-button/);
  const ccc = official('cccc2cf0a-DhZC33Gc');
  assert.ok(ccc.includes('u(Ho,{busy:i,busyLabel:w.formatMessage({defaultMessage:"Stopping\\u2026",id:"NACfNicI6z"}),onClick:U,ariaLabel:w.formatMessage({defaultMessage:"Stop this task",id:"+ZLTl3VMv+"})})'));
});

test('r6pa-06: the loop / preview server cards are cccc2cf0a $M / tN / nN with the official Next / Ends ICU', () => {
  const ccc = official('cccc2cf0a-DhZC33Gc');
  for (const piece of ['className:"flex-1 min-w-0 flex flex-col gap-1.25 pb-0.75 select-text outline-none"', 'className:"flex flex-col gap-1.25 text-footnote text-muted-as-secondary [overflow-wrap:anywhere]"',
    'defaultMessage:"Ends <v>{days}d</v>",id:"BIrz9yA5y+"', 'defaultMessage:"Next <v>{countdown}</v>",id:"APhUc9212r"', 'className:"flex flex-wrap items-baseline gap-x-sm gap-y-0.75"'])
    assert.ok(ccc.includes(piece), piece);
  const now = Date.now();
  const loop = { id: 'a', prompt: 'Check CI', recurring: true, cron: '*/5 * * * *', humanSchedule: 'every 5 minutes', nextFireAt: now + 65000, expiresAt: now + 6.6 * 864e5 };
  const html = renderToStaticMarkup(h(B.LoopCard, { loop, stopping: false, onStop() {} }));
  assert.match(html, /^<div class="flex flex-col rounded-lg bg-alpha-1"><div class="relative flex items-start gap-sm p-md"><span tabindex="-1" aria-label="Loop: Check CI" class="flex-1 min-w-0 flex flex-col gap-1\.25 pb-0\.75 select-text outline-none"><span class="flex items-start gap-sm"><span data-cds="ShimmerText" data-shimmering="true" class="[^"]* flex-1 min-w-0 text-body text-primary break-words">Check CI<\/span><span class="contents"><button/);
  assert.match(html, /<span class="flex flex-col gap-1\.25 text-footnote text-muted-as-secondary \[overflow-wrap:anywhere\]"><span class="flex flex-wrap items-baseline gap-x-sm gap-y-0\.75"><span class="text-secondary">Loop<\/span>/);
  assert.match(html, /<span class="tabular-nums">Next <span class="text-secondary">1m [45]s<\/span><\/span><span>Ends <span class="text-secondary">7d<\/span><\/span>/);
  assert.doesNotMatch(html, /sbt-|\\u0000/);
  // zh-CN: the official ICU keys, the value still in its tag.
  const previous = i18n.getLocale();
  try {
    i18n.setLocale('zh-CN');
    const zh = renderToStaticMarkup(h(B.LoopCard, { loop, stopping: false, onStop() {} }));
    assert.match(zh, /下次 <span class="text-secondary">1 分 [45] 秒<\/span>/);
    assert.match(zh, /<span class="text-secondary">7 天<\/span>后结束/);
  } finally { i18n.setLocale(previous); }
  // E83: the stopping aria-label names the persona.
  persona.setPersona({ assistantName: 'Nova' });
  try { assert.match(renderToStaticMarkup(h(B.LoopCard, { loop, stopping: true, onStop() {} })), /aria-label="Stop requested\. Nova will cancel it\."/); }
  finally { persona.setPersona({}); }
});

test('css6-toc-position-gutter: the TOC root sits on the rail band (shared-18 Hx), no left:0 / --chat-gutter / 780px rule', () => {
  assert.ok(official('cf74bc599-CRYqipWN').includes('N=`epitaxy-toc absolute top-[20px] bottom-[32px] ${yi} z-[11] pointer-events-none ${w===null?"invisible":"epitaxy-toc-fade-in"}`'));
  assert.ok(local('src/generated/session-rail-kit/rail-layout.mjs').includes('Hx as RAIL_BAND_START_CLASS'));
  const jsx = local('src/source-chapters.jsx');
  assert.ok(jsx.includes('import { RAIL_BAND_START_CLASS } from "./generated/session-rail-kit/rail-layout.mjs";'));
  assert.ok(jsx.includes('`epitaxy-toc sch-toc absolute top-[20px] bottom-[32px] ${RAIL_BAND_START_CLASS} z-[11] pointer-events-none ${active === null ? "invisible" : "epitaxy-toc-fade-in"}`'));
  const css = local('src/source-chapters.css').replace(/\/\*[^]*?\*\//g, '');
  assert.doesNotMatch(css, /780px|left: 0|--chat-gutter: 32px|\.sch-toc \{|\.sch-toc-(rail|tick|line|popover|list)\b/);
  assert.match(css, /@container \(max-width: 560px\) \{ \.sch-toc-nav \{ --chat-gutter: 16px; \} \}/);
  // The .epitaxy-root default the TOC now inherits, and c96d752d0's injected fade-in.
  assert.ok(fs.readFileSync(path.join(v1, 'c6a992d55-Che1orl5.css'), 'utf8').includes('.epitaxy-root{--prompt-text-code:.928571em;--prompt-leading-code:1.53846;--chat-gutter:32px;'));
  assert.ok(official('c96d752d0-CWv_7-n9').includes('.epitaxy-toc-fade-in{animation:.18s ease-out .12s both epitaxy-toc-fade-in}'));
  assert.match(local('src/main.jsx'), /className=\{"workspace epitaxy-root cds-root"/);
});

test('zh-CN: the new strings of this lane are translated', () => {
  const zh = i18n.dictionary ? i18n.dictionary('zh-CN') : null;
  const t = (key) => { const previous = i18n.getLocale(); try { i18n.setLocale('zh-CN'); return i18n.t(key); } finally { i18n.setLocale(previous); } };
  for (const key of ['Next <v>{countdown}</v>', 'Ends <v>{days}d</v>', 'Browser page — press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out.', 'Don’t ask again for this tool']) {
    assert.notEqual(t(key), key, `zh-CN: ${key}`);
    if (zh) assert.ok(zh[key], key);
  }
});

// W14-code r6 review (r6pa-05 补做): cf580efe9 pa `ie = I || B` — I is a server starting (F = t.find(ma)) or a pending Run
// of a server not running (N.isRun), B the started server held da = 1500 ms. The list (and both captions) give way to a
// role=status lg spinner (Ac) with an sr-only "Starting server".
test('r6pa-05 review: pa ie replaces the server list with the lg spinner and drops the captions', () => {
  const pa = official('cf580efe9-BFcQCjF9');
  for (const piece of ['let F=J1($,9,t)?K1($,9,t,t.find(ma)):$[10],I=F!==void 0||(N?.isRun??!1)', 'let ie=I||B,',
    'role:"status",className:"flex w-full items-center justify-center py-lg",children:[r(w,{size:"lg"}),r("span",{className:"sr-only",children:x})]',
    'starting:"Starting server"', 'ua=5,da=1500', 'Ac as Vu'].filter((piece) => piece !== 'Ac as Vu'))
    assert.ok(pa.includes(piece), piece);
  assert.ok(/\bAc as Vu\b/.test(official('shared-frame-6jtSkIit')) && /\bAc as CdsSpinner\b/.test(local('src/generated/view-tabs/shared-frame-6jtSkIit.js')), 'w is Vu = shared-frame Ac (CdsSpinner)');
  const rows = [{ name: 'web', port: 5173, status: 'stopped', running: false }, { name: 'api', port: 8080, status: 'running', running: true }];
  const list = (props) => renderToStaticMarkup(h(P.ServerList, { rows, onStart() {}, onStop() {}, onOpen() {}, ...props }));
  const spinner = /<div class="flex min-w-\[min\(400px,75%\)\] flex-col gap-sm"><div role="status" class="flex w-full items-center justify-center py-lg"><span [^>]*data-cds="Spinner"[^>]*>(?:(?!<\/div>).)*<\/span><span class="sr-only">Starting server<\/span><\/div><\/div><\/div><\/div><\/div><\/div>$/;
  const idle = list({});
  assert.match(idle, /<ul role="list"/);
  assert.doesNotMatch(idle, /Starting server/);
  assert.equal((idle.match(/max-w-\[48ch\]/g) || []).length, 2, 'both captions without ie');
  // F: a row starting (the agent's preview_start, another pane's Run).
  const starting = list({ rows: [{ ...rows[0], status: 'starting', running: false }, rows[1]] });
  assert.match(starting, spinner);
  assert.doesNotMatch(starting, /<ul|max-w-\[48ch\]|See all/, 'no list, no captions');
  // N.isRun: this pane's Run of web (not running yet); a Stop of the running api is not a Run.
  assert.match(list({ starting: 'web', startingName: 'web' }), /^<div class="absolute inset-0" data-preview-start="servers" data-preview-starting="web">/);
  assert.match(list({ starting: 'web' }), spinner);
  assert.doesNotMatch(list({ starting: 'api' }), /Starting server/, 'a pending action on a running server is no Run');
  // B: the started server held once it runs (serverStartHold spinner, passed by the pane).
  assert.match(list({ holding: true }), spinner);
  // The pane's own start renders pa's branch, not the host .spv-center block.
  const pane = local('src/source-preview-pane.jsx');
  assert.ok(pane.includes('<ServerList launch={state?.launch} rows={rows} starting={starting} holding={startHold.spinner} startingName={starting ?? heldServer}'));
  assert.doesNotMatch(pane, /data-preview-starting=\{starting \?\? heldServer\}><SourceSpinner/);
});

test('r6pa-05 review: the started server is held da = 1500 ms once it runs, then the list returns (fake timers)', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    assert.equal(PM.SERVER_SETTLE_MS, 1500);
    // The pane's loop: setHeldServer(startHold.held); on settle, setTimeout(() => setHeldServer(null), SERVER_SETTLE_MS).
    let held = null, timer = null;
    const step = (servers, pending = null) => {
      const hold = PM.serverStartHold(held, { servers, pending });
      held = hold.held;
      if (hold.settle && timer === null) timer = setTimeout(() => { held = null; }, PM.SERVER_SETTLE_MS);
      if (!hold.settle && timer !== null) { clearTimeout(timer); timer = null; }
      return hold.spinner;
    };
    assert.equal(step([{ name: 'web', status: 'stopped' }], 'web'), true, 'Run pending (N.isRun)');
    assert.equal(step([{ name: 'web', status: 'starting' }], 'web'), true, 'starting (F)');
    const running = [{ name: 'web', status: 'running' }];
    assert.equal(step(running), true, 'running: B holds the spinner');
    mock.timers.tick(1499);
    assert.equal(held, 'web');
    assert.equal(PM.serverStartHold(held, { servers: running }).spinner, true);
    mock.timers.tick(1);
    assert.equal(held, null, 'da elapsed');
    assert.equal(PM.serverStartHold(held, { servers: running }).spinner, false, 'the list returns');
    // A failure drops the hold at once (ee !== void 0 && !I && !te?.running && L(void 0)).
    held = 'web';
    assert.equal(step([{ name: 'web', status: 'failed' }]), false);
  } finally { mock.timers.reset(); }
});

// W14-code r6 review (css6-toc-position-gutter 补做): the chapter rows are cf74bc599 FC's class strings.
test('css6-toc-position-gutter review: the chapter rows are FC j / N / the editing row, no .sch-toc-entry restatement', () => {
  const fc = official('cf74bc599-CRYqipWN');
  for (const piece of ['className:"flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px]"',
    'className:"block h-[2px] w-[10px] rounded-full bg-alpha-8 shrink-0"',
    'className:"flex-1 min-w-0 [field-sizing:content] bg-transparent text-body text-primary focus-visible:outline-hidden focus-visible:shadow-focus"',
    '`group/ch hit-row-main w-full flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px] text-start text-body hover:bg-fill-ghost-hover ${r?"text-primary":"text-secondary hover:text-primary"}`',
    '`block h-[2px] rounded-full shrink-0 transition-[background-color] duration-150 ${r?"w-[14px] bg-alpha-8":"w-[9px] bg-alpha-3 group-hover/ch:bg-alpha-5"}`',
    'lazy:!0,hoverable:!1,side:"inline-end",className:"flex-1"', 'className:"hit-row"'])
    assert.ok(fc.includes(piece), piece);
  const jsx = local('src/source-chapters.jsx');
  for (const piece of ['<li className="flex items-center gap-sm px-1.25 h-control app-list-row rounded-[5px]">',
    'className="block h-[2px] w-[10px] rounded-full bg-alpha-8 shrink-0"', 'size={Math.max(chapter.title.length, 1)}',
    'className="flex-1 min-w-0 [field-sizing:content] bg-transparent text-body text-primary focus-visible:outline-hidden focus-visible:shadow-focus"',
    '<li className="hit-row">', '<CdsOverflowTooltip lazy hoverable={false} side="inline-end" className="flex-1">'])
    assert.ok(jsx.includes(piece), piece);
  assert.doesNotMatch(jsx.replace(/\/\/.*$/gm, ''), /sch-toc-(entry|button|mark|title|input|editing)/);
  const css = local('src/source-chapters.css').replace(/\/\*[^]*?\*\//g, '');
  assert.doesNotMatch(css, /\.sch-toc-(entry|button|mark|title|input)|text-align:\s*left/);
});
