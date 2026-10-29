import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

// w13-chatui-home (research/w13-chatui.md chatui-H2): the Chat new-page greeting is the 3.6556.2 shared-23 Dy choice
// (scripts/extract-chat-home.mjs → src/generated/chat-home) rendered through the official My (HomeGreeting). Source only:
// generator --check, official text, a hook dispatcher for the client render, SSR for the server branch; no browser.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const v1 = path.join(snapshot, 'ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const directory = path.join(app, 'src/generated/chat-home');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, home, adapters, greeting, coworkHome;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  home = await server.ssrLoadModule('/src/source-chat-home.jsx');
  adapters = await server.ssrLoadModule('/src/source-chat-home-adapters.jsx');
  greeting = await server.ssrLoadModule('/src/generated/chat-home/greeting.mjs');
  coworkHome = await server.ssrLoadModule('/src/generated/cowork-home/index.mjs');
});
after(async () => { i18n?.setLocale('en-US'); await server?.close(); });

// One component call under a hand-built client dispatcher (createRoot, no hydration: useSyncExternalStore reads the
// client snapshot, so shared-25 si's `ii()` is true and Dy's clock `Ee(Oy, null)` is a Date).
function clientCall(component, props, contexts = new Map()) {
  let cursor = 0;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: c => (contexts.has(c) ? contexts.get(c) : c._currentValue),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect() { cursor++; },
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
// w13-close-chat-composer (chatui-home-02): Fy's `div { className: fg }` (shared-19 Wx) frames My; the helper returns
// the framed My element after checking the frame.
const clientGreeting = (greetings = [], props = {}) => {
  const frame = clientCall(home.ChatGreetingText, props, new Map([[adapters.ChatGreetingHost, { greetings }]]));
  assert.equal(frame.type, 'div');
  assert.equal(frame.props.className, 'mx-auto flex w-full flex-col items-center gap-7 max-md:pt-4 max-w-2xl');
  return frame.props.children;
};
const greetingText = html => html.match(/<span[^>]*data-new-page-greeting-text=""[^>]*>([^<]*)<\/span>/)?.[1];

test('generator: --check passes and the manifest pins the 3.6556.2 originals, adapters and linked bindings', async () => {
  const { extractChatHome } = await import('../scripts/extract-chat-home.mjs');
  await extractChatHome({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  const expected = {
    'incognito-param.mjs': ['shared-0-DDOOdL6P.js', ['BR']],
    'account-generation.mjs': ['shared-78-D5Fw2h0a.js', ['iO', 'aO', 'sO', 'cO']],
    'greeting-frame.mjs': ['shared-19-DIKJVT7c.js', ['Wx']],
    'greeting.mjs': ['shared-23-BZ6ZY5fu.js', ['iy', 'ay', 'oy', 'sy', 'cy', 'ly', 'uy', 'dy', 'fy', 'py', 'Sy', 'Cy', 'wy', 'Ty', 'Dy', 'Oy']],
  };
  assert.deepEqual(manifest.modules.map(m => m.target), Object.keys(expected));
  assert.deepEqual(fs.readdirSync(directory).sort(), [...Object.keys(expected), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    const [source, bindings] = expected[module.target];
    assert.equal(module.source, source);
    assert.equal(module.referenceVersion, '3.6556.2');
    assert.equal(sha(fs.readFileSync(path.join(v1, source))), module.sourceSha256, module.target);
    const body = fs.readFileSync(path.join(directory, module.target), 'utf8');
    assert.equal(sha(body), module.sha256, module.target);
    assert.ok(body.startsWith(`// Original Claude Desktop 3.6556.2 bindings from ${source}; generated by extract-chat-home.mjs.\n`));
    assert.deepEqual(module.bindings.map(b => b.name), bindings, module.target);
  }
  assert.deepEqual(manifest.modules.at(-1).exports, { Dy: 'useChatGreeting', dy: 'personalizedGreeting', uy: 'isPersonalizedGreetingTable', iy: 'GREETING_DAYS' });
  assert.deepEqual(manifest.adapters.map(a => [a.original, a.name]), [
    ['shared-1-BJhqMmkf.js#dg', 'chatBootLocale'],
    ['shared-156-BLTosN8U.js#jB', 'useChatGreetingSearchParams'],
    ['shared-23-BZ6ZY5fu.js#Ey', 'readStaticComposerGreeting'],
    ['shared-25-DOWZRSlq.js#kB', 'useChatGreetingBootstrap'],
    ['shared-25-DOWZRSlq.js#oA', 'readCachedChatGreetings'],
    ['shared-78-D5Fw2h0a.js#Gc', 'setGreetingTelemetry'],
  ]);
  // D1: one copy — the client-only value (shared-25 si), the locale table (shared-52 ly / ry) and react-intl's useIntl
  // come from the 3.6556.2 graphs that already hold or answer them; the compiler helpers from view-tabs by semantic name.
  assert.deepEqual(manifest.linked.map(l => [l.original, l.graph]), [
    ['shared-25-DOWZRSlq.js#si', 'routines-shared'], ['shared-52-uHFNjl7C.js#ly', 'cowork-scheduled'], ['shared-52-uHFNjl7C.js#ry', 'cowork-scheduled']]);
  assert.deepEqual(manifest.sharedAdapters, [{ original: 'vendor-intl-DYfox5Co.js#q', graph: 'routines-shared', name: 'useIntl' }]);
  const body = local('src/generated/chat-home/greeting.mjs');
  assert.match(body, /from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js"/);
  assert.doesNotMatch(body, /from "\.\.\/view-tabs\/index\.js"/);
});

test('Fy: fg (shared-19 Wx, export Hi) frames My; UC passes zg(n).greetingLockup with n defaulting to "classic"', () => {
  const s23 = official('shared-23-BZ6ZY5fu.js'), s19 = official('shared-19-DIKJVT7c.js');
  assert.match(s23, /function Fy\(e\)\{[^]*?y\(Iy,\w+\);[^]*?f\("div",\{className:fg,children:\[\w+,\w+\]\}\)/);
  assert.ok(s23.includes('c(Fy,{incognitoModeEnabled:u,planBadge:null,layout:e.greetingLockup})'));
  assert.match(s23, /r=n===void 0\?zl:n/, 'WC: layoutVariant defaults to zl');
  assert.ok(s19.includes('Wx="mx-auto flex w-full flex-col items-center gap-7 max-md:pt-4 max-w-2xl"'));
  assert.match(s19, /Wx as Hi\b/);
  assert.equal(local('src/generated/chat-home/greeting-frame.mjs').includes('export { Wx as greetingFrameClass };'), true);
  assert.match(local('src/source-chat-home.jsx'), /const homeVariant = homeLayout\('classic'\);/);
});

test('official text: Dy falls back to "You’re here!" (y1XRP1BJQF); 3.6556.2 has no "{name} returns!"', () => {
  const chunk = official('shared-23-BZ6ZY5fu.js');
  assert.ok(chunk.includes('u=J1($,2,r)?K1($,2,r,r.formatMessage({defaultMessage:"You\\u2019re here!",id:"y1XRP1BJQF"})):$[3]'));
  assert.ok(chunk.includes('l!==null&&i?dy(i.personalized_greeting,"chat",l)||u:""'));
  assert.ok(chunk.includes('defaultMessage:"You\\u2019re incognito",id:"PYLVhIC8DX"'));
  assert.ok(chunk.includes('iy=["sun","mon","tue","wed","thu","fri","sat"]'));
  const enUS = JSON.parse(fs.readFileSync(path.join(snapshot, 'ion-dist/i18n/en-US.json'), 'utf8'));
  assert.equal(enUS.y1XRP1BJQF, 'You’re here!');
  assert.equal(Object.values(enUS).filter(v => typeof v === 'string' && v.includes('returns!')).length, 0);
  assert.doesNotMatch(local('src/source-chat-home.jsx'), /t\('\{name\} returns!'/);
});

test('dy: the surface entry, its day slots or default_slots, the first slot before `until`; a bad table is ignored', () => {
  const { personalizedGreeting: dy, isPersonalizedGreetingTable: valid, GREETING_DAYS } = greeting;
  assert.deepEqual(GREETING_DAYS, ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const table = [
    { surface: 'cowork', days: null, default_slots: [{ until: 24, text: 'Cowork text' }] },
    { surface: 'chat', days: [{ day: 'mon', slots: [{ until: 12, text: 'Monday morning' }, { until: 24, text: 'Monday later' }] }],
      default_slots: [{ until: 12, text: 'Good morning' }, { until: 18, text: 'Good afternoon' }] },
  ];
  assert.equal(valid(table), true);
  const monday9 = new Date(2026, 9, 26, 9), monday20 = new Date(2026, 9, 26, 20), tuesday9 = new Date(2026, 9, 27, 9), tuesday20 = new Date(2026, 9, 27, 20);
  assert.equal(dy(table, 'chat', monday9), 'Monday morning');
  assert.equal(dy(table, 'chat', monday20), 'Monday later');
  assert.equal(dy(table, 'chat', tuesday9), 'Good morning');
  assert.equal(dy(table, 'chat', tuesday20), undefined);
  assert.equal(dy(table, 'cowork', tuesday20), 'Cowork text');
  assert.equal(dy([], 'chat', monday9), undefined);
  assert.equal(dy([{ surface: 'chat', default_slots: [{ until: 1.5, text: 'x' }] }], 'chat', monday9), undefined);
  assert.equal(dy({ surface: 'chat' }, 'chat', monday9), undefined);
});

test('client render: an empty local table shows the official "You’re here!" in the original My greeting', () => {
  const element = clientGreeting();
  assert.equal(element.type, coworkHome.HomeGreeting);
  assert.equal(element.props.text, 'You’re here!');
  assert.equal(element.props.layout, 'inline');
  const html = renderToStaticMarkup(element);
  assert.equal(greetingText(html), 'You’re here!');
  assert.match(html, /data-new-page-greeting-spark=""/);
  assert.doesNotMatch(html, /returns!/);
});

test('client render: a local "chat" slot that covers this hour replaces the fallback; other surfaces do not', () => {
  const allDay = [{ until: 24, text: 'Welcome back to Chat' }];
  assert.equal(clientGreeting([{ surface: 'chat', days: null, default_slots: allDay }]).props.text, 'Welcome back to Chat');
  const everyDay = greeting.GREETING_DAYS.map(day => ({ day, slots: [{ until: 24, text: `Happy ${day}` }] }));
  const day = greeting.GREETING_DAYS[new Date().getDay()];
  const html = renderToStaticMarkup(clientGreeting([{ surface: 'chat', days: everyDay, default_slots: allDay }]));
  assert.equal(greetingText(html), `Happy ${day}`);
  assert.equal(clientGreeting([{ surface: 'cowork', days: null, default_slots: allDay }]).props.text, 'You’re here!');
  assert.equal(clientGreeting([{ surface: 'chat', days: null, default_slots: [{ until: 0, text: 'never' }] }]).props.text, 'You’re here!');
});

test('client render: the incognito branch is generated (shared-23 PYLVhIC8DX) and zh-CN translates both texts', () => {
  assert.equal(clientGreeting([], { incognito: true }).props.text, 'You’re incognito');
  i18n.setLocale('zh-CN');
  try {
    assert.equal(clientGreeting().props.text, '很高兴见到你！');
    assert.equal(clientGreeting([], { incognito: true }).props.text, '你正处于无痕模式');
  } finally { i18n.setLocale('en-US'); }
});

test('server render: before the client clock exists Dy is "" (official `l === null` branch), in the classic greeting seat', async () => {
  const html = renderToStaticMarkup(h(home.SourceChatGreeting, {}));
  assert.match(html, /^<header class="surface-greeting /);
  assert.equal(greetingText(html), '​');
  assert.match(html, /class="[^"]*invisible/);
  // The same seat classes as the Cowork greeting (source-surfaces.jsx SourceSurfaceGreeting).
  const surfaces = await server.ssrLoadModule('/src/source-surfaces.jsx');
  const seat = markup => markup.match(/^<header class="([^"]*)"/)[1];
  assert.equal(seat(html), seat(renderToStaticMarkup(h(surfaces.SourceSurfaceGreeting, {}))));
  // w13-close-cowork-ui (chatui-home-01): the Cowork greeting is this same Fy (one new-page greeting for both tabs).
  assert.match(local('src/source-surfaces.jsx'), /export function SourceSurfaceGreeting\(\) \{\n  return <SourceChatGreeting \/>;/);
  assert.match(local('src/source-chat-home.jsx'), /<header className=\{`surface-greeting \$\{homeVariant\.greetingSlotClass\} \$\{greetingSeat\(homeVariant\.greetingPhoneSeat\)\}`\}>/);
});

test('main.jsx: the Chat home uses SourceChatGreeting; Cowork keeps SourceSurfaceGreeting', () => {
  const main = local('src/main.jsx');
  assert.match(main, /import \{ SourceChatGreeting \} from '\.\/source-chat-home\.jsx';/);
  // w13-chatfn-history: the incognito New chat page passes Dy's `incognito` ("You’re incognito").
  assert.match(main, /\{!current && mode === 'chat' && <SourceChatGreeting incognito=\{incognitoDraft \|\| undefined\} \/>\}/);
  assert.match(main, /\{!current && mode === 'cowork' && <SourceSurfaceGreeting name=\{boot\?\.config\?\.displayName\} \/>\}/);
  assert.doesNotMatch(main, /mode !== 'code' && <SourceSurfaceGreeting/);
});
