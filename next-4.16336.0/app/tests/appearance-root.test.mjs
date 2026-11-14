import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applyAppearanceRoot, cdsFontFor } from '../src/appearance-root.mjs';
import { appearancePreferences } from '../electron/preferences.mjs';
import { designEntryStylesheets, designLegacySnapshot } from '../scripts/current-design-assets.mjs';
// design-production (4.16336.0): the loaded c6a992d55 entry sheet, named by current-design-assets.
const UTILITIES_CSS = designEntryStylesheets.find(name => name.startsWith('c6a992d55-'));

// B02 GL2: a popped-out pane window writes the same html appearance as the main window (cd377abb5 Yn mirrors qn's
// data-code-theme-light/-dark, data-reduce-motion, font attributes and Jn's properties onto the popout document).
function fakeRoot() {
  const attributes = new Map(), props = new Map();
  return {
    dataset: {}, attributes, props,
    toggleAttribute(name, on) { if (on) attributes.set(name, ''); else attributes.delete(name); },
    style: { setProperty: (name, value) => props.set(name, value), removeProperty: (name) => props.delete(name) },
  };
}
const colors = { 'claude-light': { bg: '#fff', fg: '#111', selection: '#0073e640' }, 'claude-dark': { bg: '#000', fg: '#eee', selection: '#0099ff4d' },
  'min-light': { bg: '#fafafa', fg: '#222', selection: '#aaa' } };
const setThemes = (pair) => ({ light: pair.light || 'claude-light', dark: pair.dark || 'claude-dark' });

test('appearance: fonts, Reduce motion, code font and code theme pair land on html', () => {
  const root = fakeRoot();
  const prefs = { ...appearancePreferences({}), interfaceFont: 'dyslexic', motion: 'reduce', codeFont: 'Fira Code', codeThemeLight: 'min-light', codeThemeDark: 'claude-dark' };
  const pair = applyAppearanceRoot(root, prefs, { setThemes, colors });
  assert.deepEqual(pair, { light: 'min-light', dark: 'claude-dark' });
  assert.equal(root.dataset.reduceMotion, 'true');
  assert.equal(root.dataset.localMotion, 'reduce');
  assert.ok(root.attributes.has('data-dyslexic-font') && !root.attributes.has('data-system-font'));
  assert.equal(root.dataset.font, 'system');
  assert.equal(root.props.get('--cds-font-code'), '"Fira Code", anthropic-mono, monospace');
  assert.equal(root.props.get('--cds-font-mono'), '"Fira Code", anthropic-mono, monospace');
  assert.equal(root.dataset.codeThemeLight, 'min-light');
  assert.equal(root.dataset.codeThemeDark, 'claude-dark');
  assert.equal(root.props.get('--code-theme-light-bg'), '#fafafa');
  assert.equal(root.props.get('--code-theme-dark-selection-bg'), '#0099ff4d');
  assert.equal(root.props.get('--cds-code-text-selection-bg'), 'light-dark(#aaa, #0099ff4d)');
});

test('appearance: turning settings back off clears what they set', () => {
  const root = fakeRoot();
  applyAppearanceRoot(root, { ...appearancePreferences({}), interfaceFont: 'system', motion: 'reduce', codeFont: 'Menlo' }, { setThemes, colors });
  applyAppearanceRoot(root, { ...appearancePreferences({}), interfaceFont: 'anthropic', codeFont: '' }, { setThemes, colors });
  assert.equal(root.dataset.reduceMotion, undefined);
  assert.ok(!root.attributes.has('data-system-font') && !root.attributes.has('data-dyslexic-font'));
  assert.equal(root.dataset.font, 'sans');
  assert.ok(!root.props.has('--cds-font-code') && !root.props.has('--cds-font-mono'));
  assert.equal(cdsFontFor({ interfaceFont: 'anthropic' }), 'sans');
  assert.equal(cdsFontFor({ interfaceFont: 'system' }), 'system');
});

test('the main window and pane windows share the writer; pane windows get the saved appearance and its updates', () => {
  const app = path.resolve(import.meta.dirname, '..');
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const popout = main.slice(main.indexOf('function PopoutApp('), main.indexOf('const popoutQuery'));
  assert.equal((main.match(/applyAppearanceRoot\(document\.documentElement/g) || []).length, 2, 'App and PopoutApp');
  assert.match(popout, /call\("popout-state"\)/);
  assert.match(popout, /event\.kind === "config-updated"/);
  assert.match(popout, /applyCustomTheme\(document, appearanceConfig\)/);
  assert.match(popout, /data-font=\{cdsFontFor\(appearance\)\}/);
  const electron = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  const emitConfig = electron.slice(electron.indexOf('function emitConfig()'), electron.indexOf('function emitSessionList'));
  assert.match(emitConfig, /for \(const entry of popouts\.values\(\)\)[\s\S]*kind: "config-updated"/);
});

// B38: c6a992d55-sXiDGMFQ.css [data-chat-text-size=l] .epitaxy-transcript-typography{--chat-body:15px;--chat-leading:1.46667};
// Small keeps the 1.42857 leading, and the turn/item gaps follow both variables. design-production: the reference is the
// loaded c6a992d55 entry sheet of the pinned design (current-design-assets); 3.6556.2's steps (Large .9375rem over
// 1.46667, Small .8125rem) are read from its own snapshot, and 4.16336.0 moved them (Large 1rem over 1.375, Small .875rem
// over 1.4286). The host restates whatever the loaded reference declares.
test('transcript text size Large / Small restate the loaded reference steps (Large: 3.6556.2 15px over 1.46667, 4.16336.0 16px over 1.375)', () => {
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.css'), 'utf8');
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1', UTILITIES_CSS), 'utf8');
  const legacy = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference', designLegacySnapshot, 'ion-dist/assets/v1/c6a992d55-Che1orl5.css'), 'utf8');
  assert.ok(legacy.includes('[data-chat-text-size=l] .epitaxy-transcript-typography{--chat-body:calc(.9375rem * var(--cds-rem-scale,1));--chat-leading:1.46667}'));
  assert.ok(legacy.includes('[data-chat-text-size=s] .epitaxy-transcript-typography{--chat-body:calc(.8125rem * var(--cds-rem-scale,1))}'));
  const step = size => official.match(new RegExp(`(?<![\\w)\\]])\\[data-chat-text-size=${size}\\] \\.epitaxy-transcript-typography\\{([^}]*)\\}`))?.[1];
  const large = step('l'), small = step('s');
  assert.equal(large, '--chat-body:calc(1rem * var(--cds-rem-scale,1));--chat-leading:1.375', `${UTILITIES_CSS} Large`);
  assert.equal(small, '--chat-body:calc(.875rem * var(--cds-rem-scale,1));--chat-leading:1.4286', `${UTILITIES_CSS} Small`);
  // W14 css-main-01: the official html attribute (shared-20 Gh) and the official values.
  const restate = decls => decls.split(';').join('; ');
  assert.ok(css.includes(`html[data-chat-text-size=l] .source-transcript-content { ${restate(large)}; }`), `source-settings.css restates the loaded Large step: ${large}`);
  assert.ok(css.includes(`html[data-chat-text-size=s] .source-transcript-content { ${restate(small)}; }`), `source-settings.css restates the loaded Small step: ${small}`);
  assert.doesNotMatch(css, /data-local-transcript-(?:size|width)/);
  assert.ok(css.includes('{ font-size:var(--chat-body); line-height:var(--chat-leading); --chat-item-gap:calc(var(--chat-body)*var(--chat-leading)*.5); --chat-turn-gap:calc(var(--chat-body)*var(--chat-leading)*.75); }'));
  assert.doesNotMatch(css, /--chat-body:16px; \}/);
});
