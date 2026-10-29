// W12b w12b-settings-dialogs: the Code dialogs' 3.6556.2 differences (S1 is covered in shortcuts-dialog-model.test.mjs).
// S2 the Keyboard shortcuts and What's new dialogs take the standard Zc Header (no bleed bar), What's new's list bleeds to
// the popup edges; S3 "Open in {browserName}" (c8ae173c6 / main Ctr-Etr-Dtr); S5 the code theme grid has no py-md;
// S7 the language picker has no reload note. Source only: official chunks are read as text, never run; dialogs render
// with Vite SSR. No window, no GUI.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { cleanBrowserName, createDefaultBrowserName, DEFAULT_BROWSER_NAME_CACHE_MS } from '../electron/default-browser-name.cjs';
import { browserLabel, defaultBrowserName, refreshDefaultBrowserName, resetDefaultBrowserName, subscribeDefaultBrowserName } from '../src/default-browser-name.mjs';
import { messageMenu } from '../src/transcript-context-menu-model.mjs';
import zhPreview from '../electron/i18n/zh-CN/preview.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const chunk = (name) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', name), 'utf8');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

let server, Actions, Picker;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // SourceDialog portals to <body>; the server renderer has no portals, so render them inline.
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Actions = await server.ssrLoadModule('/src/source-session-actions.jsx');
  Picker = await server.ssrLoadModule('/src/source-language-picker.jsx');
});
after(() => server?.close());
const withDocument = (render) => {
  const had = 'document' in globalThis;
  if (!had) globalThis.document = { body: {}, documentElement: { getAttribute: () => null } };
  try { return render(); } finally { if (!had) delete globalThis.document; }
};

test('S2: Keyboard shortcuts is the standard Zc Header (shared-19 jM {showClose:!0} through va), no bleed bar', () => {
  const official = chunk('shared-19-DIKJVT7c.js'), frame = chunk('shared-frame-6jtSkIit.js');
  assert.ok(official.includes('defaultMessage:"Keyboard shortcuts"'));
  assert.match(frame, /Q\("mb-pad-md flex items-start gap-2",o\)/);
  assert.match(frame, /b\(Xy,\{"aria-label":i,flush:!0\}\)/);
  assert.ok(frame.includes('My="-mt-1"') && frame.includes('Ay="text-title font-semibold font-header break-words"'));
  const html = withDocument(() => renderToStaticMarkup(h(Actions.KeyboardShortcutsDialog, { onClose() {} })));
  assert.match(html, /<header class="sdlg-header"><div class="sdlg-heading"><h2 id="[^"]+" class="sdlg-title">Keyboard shortcuts<\/h2><\/div><button[^>]*class="[^"]*sdlg-close sdlg-close-flush/);
  assert.doesNotMatch(html, /sdlg-bleed/);
  assert.equal([...html.matchAll(/aria-label="Close"/g)].length, 1);
  // The bleed header has no user left: SourceDialog and its CSS dropped it.
  for (const file of ['src/source-dialog.jsx', 'src/source-dialog.css', 'src/source-session-actions.jsx', 'src/source-titlebar.jsx'])
    assert.doesNotMatch(local(file), /sdlg-bleed|\bbleed size=|\bsize="md" bleed\b|bleed = false/, file);
});

test('S2: What’s new (cb63ed069 B) has the standard Header; the entry list bleeds to the popup edges', () => {
  const official = chunk('cb63ed069-CSsJAynL.js');
  assert.ok(official.includes('E=t(u.Header,{showClose:!0,children:t(w,{defaultMessage:"What\\u2019s new"')
    || /E=t\(u\.Header,\{showClose:!0,children:t\(w,\{defaultMessage:"What’s new"/.test(official));
  assert.ok(official.includes('"-mx-pad-xl -mb-pad-xl flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto px-xl pb-xl pt-md'));
  assert.ok(official.includes('className:"flex max-h-[min(720px,85vh)] flex-col"'));
  const css = local('src/source-titlebar.css');
  const rule = css.slice(css.indexOf('.st-release-scroll {'), css.indexOf('}', css.indexOf('.st-release-scroll {')));
  assert.match(rule, /margin: 0 calc\(-1 \* var\(--cds-pad-xl\)\) calc\(-1 \* var\(--cds-pad-xl\)\);/);
  assert.match(rule, /padding: var\(--cds-pad-md\) var\(--cds-pad-xl\) var\(--cds-pad-xl\);/);
  assert.match(rule, /overflow-y: auto;/);
});

test('S3 main: Ctr / Etr / Dtr — the https handler name, cleaned, cached for 30 s', () => {
  const main = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  for (const needle of ['var Str=40;function Ctr(e){let t=e.trim().replace(/\\.app$/i,"").trim();return!t||t.length>Str||/^url:/i.test(t)||/\\.(desktop|exe)$/i.test(t)||/[\\\\/]/.test(t)?null:t}',
    'var wtr=3e4,Ttr=null;function Etr(){try{return Ctr(a.app.getApplicationNameForProtocol("https://"))}',
    'function Dtr(){let e=Date.now();return(!Ttr||e-Ttr.at>=wtr)&&(Ttr={value:Etr(),at:e}),Ttr.value}', 'getDefaultBrowserName(){return Dtr()}'])
    assert.ok(main.includes(needle), needle);
  assert.equal(cleanBrowserName('Safari.app'), 'Safari');
  assert.equal(cleanBrowserName('  Google Chrome.APP '), 'Google Chrome');
  for (const raw of ['', '   ', '.app', 'x'.repeat(41), 'url:https', 'firefox.desktop', 'chrome.exe', '/Applications/Safari.app', 'C:\\Browser', null, undefined])
    assert.equal(cleanBrowserName(raw), null, String(raw));
  assert.equal(cleanBrowserName('x'.repeat(40)), 'x'.repeat(40));
  let clock = 1000, calls = 0, answer = 'Safari.app';
  const warnings = [];
  const app = { getApplicationNameForProtocol(protocol) { calls += 1; assert.equal(protocol, 'https://'); if (answer instanceof Error) throw answer; return answer; } };
  const read = createDefaultBrowserName({ app, now: () => clock, warn: (...args) => warnings.push(args) });
  assert.equal(read(), 'Safari');
  answer = 'Firefox.app'; clock += DEFAULT_BROWSER_NAME_CACHE_MS - 1;
  assert.equal(read(), 'Safari', 'cached under 30 s');
  assert.equal(calls, 1);
  clock += 1;
  assert.equal(read(), 'Firefox');
  answer = new Error('boom'); clock += DEFAULT_BROWSER_NAME_CACHE_MS;
  assert.equal(read(), null);
  assert.equal(warnings[0][0], 'Failed to query default https handler: %o');
});

test('S3 renderer: c8ae173c6 store — named / generic label, focus refresh while subscribed, one request at a time', async () => {
  const official = chunk('c8ae173c6-DhxlbTId.js');
  for (const needle of ['named:{defaultMessage:"Open in {browserName}",id:"1WdokkZgcZ"},generic:{defaultMessage:"Open in default browser"',
    'window.addEventListener("focus",u)', 'let e=r?.getDefaultBrowserName?.();e&&(c=!0,e.then(e=>{let t=e||null;t!==s&&(s=t,l.notify())}'])
    assert.ok(official.includes(needle), needle);
  assert.equal(zhPreview['Open in {browserName}'], '在 {browserName} 中打开');
  resetDefaultBrowserName();
  assert.equal(defaultBrowserName(), null);
  assert.equal(browserLabel(), 'Open in default browser');
  assert.equal(browserLabel('Safari'), 'Open in Safari');
  const link = (entries) => entries.find((entry) => entry.id === 'open-link')?.label;
  assert.equal(link(messageMenu({ linkHref: 'https://x.test', canOpenInBrowser: true, messageText: 'm' })), 'Open in default browser');
  // No bridge method (the host before main.cjs answers): nothing is asked, the label stays generic.
  refreshDefaultBrowserName({});
  refreshDefaultBrowserName(undefined);
  assert.equal(defaultBrowserName(), null);
  let asked = 0, resolve;
  const bridge = { getDefaultBrowserName: () => { asked += 1; return new Promise((done) => { resolve = done; }); } };
  const notes = [];
  const unsubscribe = subscribeDefaultBrowserName(() => notes.push(defaultBrowserName()));
  refreshDefaultBrowserName(bridge);
  refreshDefaultBrowserName(bridge);
  assert.equal(asked, 1, 'c: no overlapping request');
  resolve('Google Chrome');
  await new Promise((done) => setTimeout(done, 0));
  assert.deepEqual(notes, ['Google Chrome']);
  assert.equal(link(messageMenu({ linkHref: 'https://x.test', canOpenInBrowser: true, messageText: 'm' })), 'Open in Google Chrome');
  refreshDefaultBrowserName(bridge); resolve('Google Chrome');
  await new Promise((done) => setTimeout(done, 0));
  assert.deepEqual(notes, ['Google Chrome'], 'an unchanged name does not notify');
  refreshDefaultBrowserName(bridge); resolve('');
  await new Promise((done) => setTimeout(done, 0));
  assert.deepEqual(notes, ['Google Chrome', null], 'a falsy answer is null (generic again)');
  unsubscribe();
  resetDefaultBrowserName();
  // l.subscribe: the first listener adds the window focus refresh (u asks window.desktop), the last one removes it.
  const added = [], removed = [];
  let focusAsked = 0;
  globalThis.window = { addEventListener: (type, fn) => added.push([type, fn]), removeEventListener: (type, fn) => removed.push([type, fn]),
    desktop: { getDefaultBrowserName: async () => { focusAsked += 1; return 'Safari'; } } };
  try {
    const one = subscribeDefaultBrowserName(() => {}), two = subscribeDefaultBrowserName(() => {});
    assert.deepEqual(added.map(([type]) => type), ['focus']);
    added[0][1]();
    await new Promise((done) => setTimeout(done, 0));
    assert.equal(focusAsked, 1);
    assert.equal(defaultBrowserName(), 'Safari');
    one(); assert.equal(removed.length, 0);
    two(); assert.deepEqual(removed, added);
  } finally { delete globalThis.window; resetDefaultBrowserName(); }
  // Every label the host showed as "Open in default browser" reads the store.
  assert.match(local('src/source-preview-link-chooser.jsx'), /useBrowserLabel: useDefaultBrowserLabel,/);
  assert.match(local('src/source-preview-address.jsx'), /const openExternal = useDefaultBrowserLabel\(\);[\s\S]*openExternal,\n/);
  // w12b-terminal-preview-tabs (TPT-1): the Preview strip is ViewTabBar; its tab menu item is the generated cf580efe9 Ta.
  assert.match(local('src/source-preview-tabs.jsx'), /const openInBrowser = useDefaultBrowserLabel\(\);[\s\S]*<PreviewTabOpenInBrowserItem tabId=\{id\} label=\{openInBrowser\}/);
  assert.ok(chunk('cf580efe9-BFcQCjF9.js').includes('openExternal:j,'));
  assert.match(local('src/source-preview-settings-menu.jsx'), /const openExternal = useDefaultBrowserLabel\(\);\n\s+return <source\.Menu paneName=\{t\('Preview'\)\} \{\.\.\.props\} labels=\{\{ \.\.\.translated, openExternal, \.\.\.labels \}\} \/>;/);
  for (const file of ['src/source-preview-link-chooser.jsx', 'src/source-preview-address.jsx', 'src/source-preview-tabs.jsx', 'src/transcript-context-menu-model.mjs'])
    assert.doesNotMatch(local(file), /t\(['"]Open in default browser['"]\)/, file);
  assert.match(local('src/use-default-browser-label.mjs'), /useEffect\(\(\) => \{ refreshDefaultBrowserName\(\); \}, \[\]\);\n\s+return browserLabel\(useSyncExternalStore\(subscribeDefaultBrowserName, defaultBrowserName, defaultBrowserName\)\);/);
});

test('S5: the code theme grid is grid-cols-2 gap-md (c71860c77, no py-md)', () => {
  const official = chunk('c71860c77-C3tXoNVw.js');
  assert.ok(official.includes('className:"grid grid-cols-2 gap-md",style:'));
  assert.ok(!official.includes('grid grid-cols-2 gap-md py-md'));
  const css = local('src/source-settings.css');
  const rule = css.match(/\.ss-theme-grid \{[^}]*\}/)[0];
  assert.equal(rule, '.ss-theme-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--cds-gap-md,12px); }');
});

test('S7: Choose your language has only the title and Close (shared-19 bM header {showClose:!0}, no description)', () => {
  const official = chunk('shared-19-DIKJVT7c.js');
  assert.match(official, /\{showClose:!0\},[a-zA-Z_$]+=h\(Q,\{defaultMessage:"Choose your language",id:"qapewxNreP"\}\)/);
  assert.ok(!chunk('c49da61a8-CCSGo0x8.js').includes('reload'));
  const html = withDocument(() => renderToStaticMarkup(h(Picker.SourceLanguagePicker, { open: true, onClose() {}, onSave: async () => {} })));
  assert.match(html, /<header class="sdlg-header"><div class="sdlg-heading"><h2 id="[^"]+" class="sdlg-title">Choose your language<\/h2><\/div><button/);
  assert.doesNotMatch(html, /sdlg-description|reloads the window/);
  assert.doesNotMatch(html, /aria-describedby/);
});
