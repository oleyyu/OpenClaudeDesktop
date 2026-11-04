import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// W14-code r8 gen-final-8: the review leftovers this lane closed, pinned against the 3.6556.2 originals.
const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const assets = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = (prefix) => {
  const name = fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'));
  return fs.readFileSync(path.join(assets, name), 'utf8');
};

test('frame review low #1: the Code sidebar row ⋯ is shared-21 i0 "More options for {label}" (rKQPgfPvWS)', () => {
  assert.ok(chunk('shared-21-').includes('t.formatMessage({defaultMessage:"More options for {label}",id:"rKQPgfPvWS"},{label:e})'));
  const sidebar = read('src/source-sidebar.jsx');
  assert.ok(sidebar.includes('label={code ? t("More options for {label}", { label: shownName(session) }) : t("More options for {name}", { name: shownName(session) })}'));
  assert.match(read('electron/i18n/zh-CN/app.mjs'), /'More options for \{label\}': '\{label\} 的更多选项'/);
});

test('rows review low: no Default app for a folder reference (c856385e2 Cn)', () => {
  assert.ok(chunk('c856385e2-').includes('function Cn(e,t){return t!==null&&!/[\\\\/]$/.test(e)&&R(t.relPath,null)}'));
  assert.ok(read('src/source-transcript.jsx').includes('canOpenDefault: !!current.onOpenDefaultApp && !/[\\\\/]$/.test(path) });'));
});

test('panes review low #1/#2: kb has no wrapper span; Ta\'s Placeholder is the CDS Icon sm', () => {
  const kb = chunk('cccc2cf0a-').match(/function kb\(e\)\{[\s\S]*?\}function /)[0];
  assert.ok(kb.includes('h("div",{className:r,children:[i,a]})'));
  const pane = read('src/source-plan-pane.jsx');
  assert.ok(pane.includes('    {enabled ? PLAN_COMMENT_HINTS.enabled : PLAN_COMMENT_HINTS.disabled}\n  </div>;'));
  assert.ok(!pane.includes('<span>{enabled ? PLAN_COMMENT_HINTS.enabled'));
  assert.ok(chunk('cb6930dae-').includes('name:"Placeholder",size:"sm",className:"text-muted-as-secondary","aria-hidden":!0'));
  assert.ok(read('src/source-plan-checklist.jsx').includes('<CdsIcon name="Placeholder" size="sm" className="text-muted-as-secondary" aria-hidden />'));
});

test('dead host code left by r8 replacements is gone', async () => {
  const branch = await import('../src/branch-picker-model.mjs');
  for (const name of ['BRANCH_TOOLTIP', 'BRANCH_SEARCH_PLACEHOLDER', 'BRANCH_EMPTY_MESSAGE', 'branchTriggerLabel']) assert.equal(branch[name], undefined, name);
  const stats = await import('../src/transcript-runtime-stats.mjs');
  assert.equal(stats.runtimeStatLabels, undefined); assert.equal(stats.formatOutputTokens, undefined);
  assert.equal((await import('../src/files-search-model.mjs')).pathSegments, undefined);
  assert.doesNotMatch(read('src/source-environment-menu.jsx'), /import \{ t \} from/);
  for (const file of ['src', 'electron', 'scripts'].flatMap((dir) => fs.readdirSync(path.join(app, dir), { recursive: true })
    .filter((name) => /\.(mjs|jsx|cjs|js)$/.test(name) && !name.includes('generated') && !name.includes('node_modules')).map((name) => path.join(dir, name))))
    assert.doesNotMatch(read(file), /\b(runtimeStatLabels|branchTriggerLabel|pathSegments|formatOutputTokens)\(|export const BRANCH_(TOOLTIP|SEARCH_PLACEHOLDER|EMPTY_MESSAGE)\b/, file);
});

// Review fix (r8-gen-final-8.review.md, 【补做】composer-final-focus): cc43287c9 Dle `$i = yte(...)` (c227f4d5e K6) is the
// finalFocus of the presets environment bar's picker and folder menu; the host maps K6's Base UI contract onto the
// SourceMenu finalFocus (node or null) in composer-final-focus-model.mjs.
test('review fix: Dle hands finalFocus:$i to the env picker and the folder menu; main.jsx passes the mapped K6', () => {
  const dle = chunk('cc43287c9-');
  assert.ok(dle.includes('{onRequestComposerFocus:ht,isPanelActive:Mt,keyboardOnly:!0}):$[413],$i=yte(Qi)'));
  assert.ok(dle.includes('onSshConfigsChanged:P,finalFocus:$i})'), 'env picker');
  assert.ok(dle.includes('glyphClassName:Vue,finalFocus:$i}'), 'P8 folder recents');
  assert.ok(dle.includes('sshRecentFolders:Ln,finalFocus:$i,'), 'hse folder config');
  const main = read('src/main.jsx');
  assert.ok(main.includes('import { useComposerFinalFocus } from "./generated/code-composer/composer-final-focus.mjs";'));
  assert.ok(main.includes('const composerFinalFocus = useComposerFinalFocus({ onRequestComposerFocus: () => textarea.current?.focus(), isPanelActive: splitActive, keyboardOnly: true });'));
  const finals = main.match(/finalFocus: hostComposerFinalFocus\(composerFinalFocus, menu\.anchor\) \}\}/g) ?? [];
  assert.equal(finals.length, 2);
  assert.match(main, /return <SourceSavedEnvironmentMenu popup=\{\{[^}]*onClose: closeMenu,\n\s*finalFocus: hostComposerFinalFocus/);
  assert.match(main, /return <SourceComposerFolderMenu popup=\{\{[^}]*initialHighlight: menu\.entry,\n\s*finalFocus: hostComposerFinalFocus/);
  // Both popups spread `popup` onto SourceMenu.Popup, whose item-click restore calls a function finalFocus.
  assert.ok(read('src/source-environment-menu.jsx').includes('<EnvironmentSearchablePopup {...popup} className={PICKER_POPUP_CLASS}'));
  assert.ok(read('src/source-composer-folder-menu.jsx').includes('<SourceMenu.Popup {...popup}>{body(\'\')}</SourceMenu.Popup>'));
  assert.ok(read('src/source-menu.jsx').includes('const node = typeof target === "function" ? target() : target;'));
});

test('review fix: hostComposerFinalFocus maps K6 true → trigger, false → null, and only asks K6 while focus is lost', async () => {
  const { hostComposerFinalFocus, composerFinalFocusLost } = await import('../src/composer-final-focus-model.mjs');
  const body = { closest: () => null };
  const doc = (active) => ({ body, activeElement: active === 'body' ? body : active });
  const trigger = { isConnected: true, name: 'trigger' };
  assert.equal(hostComposerFinalFocus(undefined, trigger, doc('body')), undefined, 'no K6 → default finalFocus');
  let asked = 0;
  const k6 = (result) => () => { asked += 1; return result; };
  assert.equal(hostComposerFinalFocus(k6(true), trigger, doc('body'))(), trigger);
  assert.equal(hostComposerFinalFocus(k6(true), () => trigger, doc(null))(), trigger);
  assert.equal(hostComposerFinalFocus(k6(false), trigger, doc('body'))(), null);
  assert.equal(hostComposerFinalFocus(k6(true), null, doc('body'))(), null);
  assert.equal(asked, 4);
  const inMenu = { closest: (s) => (s === '[role="menu"]' ? {} : null) };
  const inDialog = { closest: () => null };
  assert.equal(composerFinalFocusLost(doc(inMenu)), true);
  assert.equal(composerFinalFocusLost(doc(inDialog)), false);
  assert.equal(hostComposerFinalFocus(k6(true), trigger, doc(inMenu))(), trigger);
  assert.equal(hostComposerFinalFocus(k6(true), trigger, doc(inDialog))(), null, 'an action that focused its dialog keeps focus');
  assert.equal(asked, 5);
});

test('review fix: the generated K6 through the adapter focuses the composer, else falls back to the trigger', async () => {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const previous = globalThis.window;
  try {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { useComposerFinalFocus } = await server.ssrLoadModule('/src/generated/code-composer/composer-final-focus.mjs');
    const { hostComposerFinalFocus } = await import('../src/composer-final-focus-model.mjs');
    const hook = (options) => { let out; renderToStaticMarkup(React.createElement(() => { out = useComposerFinalFocus(options); return null; })); return out; };
    const body = { closest: () => null };
    const win = { document: { body, activeElement: body }, navigator: { userAgent: 'test', maxTouchPoints: 0 },
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
    globalThis.window = win;
    const trigger = { isConnected: true };
    const composer = { composer: true };
    // Focus lost after the pick: the composer takes it, the host focuses nothing more.
    let finalFocus = hostComposerFinalFocus(hook({ onRequestComposerFocus: () => { win.document.activeElement = composer; }, isPanelActive: true, keyboardOnly: true }), trigger, win.document);
    assert.equal(finalFocus(), null);
    assert.equal(win.document.activeElement, composer);
    // The composer refuses focus (no textarea): back to the trigger, as Base UI's `true`.
    win.document.activeElement = body;
    finalFocus = hostComposerFinalFocus(hook({ onRequestComposerFocus: () => {}, isPanelActive: true, keyboardOnly: true }), trigger, win.document);
    assert.equal(finalFocus(), trigger);
    // The other split side (isPanelActive false): K6 leaves focus alone.
    let asked = 0;
    finalFocus = hostComposerFinalFocus(hook({ onRequestComposerFocus: () => { asked += 1; }, isPanelActive: false, keyboardOnly: true }), trigger, win.document);
    assert.equal(finalFocus(), null);
    assert.equal(asked, 0);
  } finally {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
    await server.close();
  }
});
