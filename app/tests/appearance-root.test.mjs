import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applyAppearanceRoot, cdsFontFor } from '../src/appearance-root.mjs';
import { appearancePreferences } from '../electron/preferences.mjs';

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
// Small keeps the 1.42857 leading, and the turn/item gaps follow both variables.
test('transcript text size Large is 15px over 1.46667, like the reference', () => {
  const css = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-settings.css'), 'utf8');
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  assert.ok(official.includes('[data-chat-text-size=l] .epitaxy-transcript-typography{--chat-body:calc(.9375rem * var(--cds-rem-scale,1));--chat-leading:1.46667}'));
  assert.ok(css.includes('html[data-local-transcript-size=l] .source-transcript-content { --chat-body:15px; --chat-leading:1.46667; }'));
  assert.ok(css.includes('html[data-local-transcript-size=s] .source-transcript-content { --chat-body:13px; }'));
  assert.ok(css.includes('{ font-size:var(--chat-body); line-height:var(--chat-leading); --chat-item-gap:calc(var(--chat-body)*var(--chat-leading)*.5); --chat-turn-gap:calc(var(--chat-body)*var(--chat-leading)*.75); }'));
  assert.doesNotMatch(css, /--chat-body:16px; \}/);
});
