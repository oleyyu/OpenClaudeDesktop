import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// SettingsContent (source-settings.jsx) restores focus to the element that had it before the dialog opened.
// Its tab==='usage' effect is a passive effect declared before the focus-lifecycle effect, so reading
// document.activeElement there captured the already-focused popup; /usage (main.jsx:1352) then fell back to
// Account menu on close (HANDOFF 0.2.124, offscreen session-actions r4-r6 and probe-usage-focus logs).
// The opener must be read in a layout effect, which React runs before every passive effect.
const text = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.jsx'), 'utf8');

test('settings opener is captured in a layout effect and used by the restore effect', () => {
  assert.match(text, /import React, \{[^}]*\buseLayoutEffect\b[^}]*\} from 'react';/);
  const capture = text.indexOf('const opener=useRef(null);useLayoutEffect(()=>{opener.current=document.activeElement;},[]);');
  assert.ok(capture > 0, 'opener layout effect');
  const restore = text.indexOf('const previous=opener.current, frame=requestAnimationFrame(initialFocus);');
  assert.ok(restore > capture, 'restore effect reads the captured opener');
  assert.equal(text.includes('const previous=document.activeElement'), false, 'no passive-effect activeElement capture');
  // The usage-tab focus stays a passive effect, only for the stacked Usage dialog (opened straight on Usage; B23: Usage
  // picked in the nav keeps focus on the nav); the fallback target is unchanged.
  assert.match(text, /useEffect\(\(\)=>\{if\(tab==='usage'&&usageFocused\)presence\.popup\.current\?\.focus\(\{preventScroll:true\}\);\},\[tab\]\);/);
  assert.match(text.slice(restore, restore + 600), /document\.querySelector\('\[aria-label="Account menu"\]'\)\?\.focus\(\{preventScroll:true\}\)/);
});

// Fidelity F14: cc011544b _t (SettingsNavSearch) focuses the nav search on mount with {preventScroll:true,
// focusVisible:false}; shared-22:4549 sw: the Settings popup never takes initial focus itself. Narrow tabs and the
// stacked Usage page have no search, so the popup is focused there. The opener restore is unchanged.
test('wide Settings focuses the nav search on open; narrow and Usage focus the popup; close still restores the opener', async () => {
  const { settingsInitialFocus } = await import('../src/settings-shell-model.mjs');
  assert.equal(settingsInitialFocus({ narrow: false, section: 'preferences' }), 'search');
  assert.equal(settingsInitialFocus({ narrow: false, section: 'customize-skills' }), 'search');
  assert.equal(settingsInitialFocus({ narrow: true, section: 'preferences' }), 'popup');
  assert.equal(settingsInitialFocus({ narrow: false, section: 'usage' }), 'popup');
  const start = text.indexOf('const initialFocus=()=>{');
  assert.ok(start > 0, 'initial focus helper inside the lifecycle effect');
  const body = text.slice(start, text.indexOf('return()=>{cancelAnimationFrame(frame);releaseInert();', start));
  assert.match(body, /settingsInitialFocus\(\{narrow,section:tab\}\)==='search'\?search\.current:null/);
  assert.match(body, /field\.focus\(\{preventScroll:true,focusVisible:false\}\)/);
  assert.match(body, /else root\.current\?\.focus\(\)/);
  // Focus already inside the dialog is left alone (the rAF repeat never steals a typed query's caret).
  assert.match(body, /if\(active&&active!==root\.current&&root\.current\?\.contains\(active\)\)return;/);
  assert.match(body, /requestAnimationFrame\(initialFocus\)/);
  assert.match(body, /initialFocus\(\);/);
  const effect = text.slice(start, text.indexOf('},[]);', start));
  assert.match(effect, /previous\.focus\(\{preventScroll:true\}\)/, 'close restores the opener');
  // The search field draws its ring only for :focus-visible and has the field hover ring (no :focus-within ring).
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.css'), 'utf8');
  assert.match(css, /\.ss-search:has\(input:focus-visible\)\{box-shadow:var\(--cds-focus-shadow\)\}/);
  assert.match(css, /\.ss-search:hover:not\(:focus-within\)\{box-shadow:inset 0 0 0 1px var\(--cds-border-strong\)\}/);
  assert.doesNotMatch(css, /\.ss-search:focus-within\{/);
  assert.equal(text.includes('Clear settings search'), false, 'Escape clears the query; there is no clear button');
});

// Fidelity F14: c71860c77 Ur/li save each row on its own; the page-wide `pending` lock and the focus-restore
// workaround it needed are gone, and every Settings close button is named 'Close' (shared-22:4511-4515).
test('settings saves are per row: no page-wide disabled lock, no focus-restore workaround; close buttons are named Close', () => {
  assert.equal(text.includes('disabled={!!pending'), false);
  assert.equal(/disabled=\{[^}]*\|\|!!pending/.test(text), false);
  assert.equal(text.includes('actionFocus'), false);
  assert.match(text, /const shownValue=\(key,saved\)=>Object\.hasOwn\(optimistic,key\)\?optimistic\[key\]:saved;/);
  assert.match(text, /finally\{if\(--writes\.current===0\)setOptimistic\(\{\}\);\}/);
  assert.equal(/aria-label="Close (settings|usage|font licenses)"/.test(text), false);
  assert.equal(/aria-label=\{usagePage\?/.test(text), false);
  const pages = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings-pages.jsx'), 'utf8');
  assert.equal(pages.includes('Close storage'), false);
  // c71860c77:1820-1840: muted below-slot copy with a typographic apostrophe, raw reason only in the title.
  // C1 moved SettingRow into source-settings-kit.jsx (shared by the customization pages); the copy lives there now.
  const kit = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings-kit.jsx'), 'utf8');
  assert.match(kit, /<span className="ss-row-error" title=\{error\}>\{t\('Couldn’t save the setting\. Try again\.'\)\}<\/span>/);
  assert.equal(text.includes("Couldn't save"), false);
  assert.equal(text.includes("isn't focused"), false);
});

// R03: Settings is a modal layer. SourceTooltip (source-tooltip.jsx:546-558) and MoreMenu read --cds-layer-base from
// their trigger, so the Settings backdrop (z 500) and its nested dialogs (z 520) declare it; tooltips then land at
// 630 / 650, above the popup that opened them (shared-frame-C_2npUJq.js:4738-4770).
test('the Settings backdrop and its nested dialogs declare their layer base for portals', () => {
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.css'), 'utf8');
  assert.match(css, /\.ss-backdrop \{ --cds-layer-base:500; \}/);
  assert.match(css, /\.ss-backdrop-stacked \{ --cds-layer-base:520; \}/);
  assert.ok(css.indexOf('.ss-backdrop-stacked { --cds-layer-base:520; }') > css.indexOf('.ss-backdrop { --cds-layer-base:500; }'), 'the stacked base wins over the shared .ss-backdrop base');
  assert.match(css, /\.ss-backdrop \{ position:fixed; inset:0; z-index:500;/);
  assert.match(css, /\.ss-backdrop-stacked \{ z-index:520; \}/);
  const pages = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings-pages.css'), 'utf8');
  assert.match(pages, /\.ss-storage-dialog\{--cds-layer-base:520\}/);
});

// R03 nested dialog (shared-frame-C_2npUJq.js:5569 yf, :5619-5620 Ef/Df): Font licenses and Storage mark the Settings
// popup data-nested-dialog-open; it dims itself (::after bg-backdrop) and blurs 2px, while their own backdrop is clear.
test('a dialog nested in Settings dims the page once', () => {
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.css'), 'utf8');
  assert.match(css, /\.ss-backdrop-stacked, \.ss-backdrop\.ss-storage-backdrop \{ background:transparent; backdrop-filter:none; \}/);
  assert.match(css, /\.ss-settings-dialog::after \{ content:""; position:absolute; inset:0; z-index:50; border-radius:inherit; background:var\(--cds-backdrop\); opacity:0; pointer-events:none;/);
  assert.match(css, /\.ss-settings-dialog\[data-nested-dialog-open\] \{ filter:blur\(2px\); \}/);
  assert.match(css, /\.ss-settings-dialog\[data-nested-dialog-open\]::after \{ opacity:1; \}/);
  assert.match(text, /closest\('\.ss-settings-dialog'\);parent\?\.setAttribute\('data-nested-dialog-open',''\)/);
  assert.match(text, /parent\?\.removeAttribute\('data-nested-dialog-open'\)/);
  const pages = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings-pages.jsx'), 'utf8');
  assert.match(pages, /parent\?\.setAttribute\('data-nested-dialog-open', ''\)/);
  assert.match(pages, /parent\.removeAttribute\('data-nested-dialog-open'\)/);
});
