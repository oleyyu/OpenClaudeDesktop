import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createCustomizeStore } from '../src/customize-store.mjs';

// W14-code round 3, lane panes-dead: the popped-out header tooltips (fr3-02), the Add plugin result toast (r3-shared-01),
// the remaining host pane-header buttons (fr3-08), the arrange popover (fr3-07) and the dead names (R3DC-03/04/05).
// Official chunks are read as text only.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, part) => text.split(part).length - 1;

let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-pane-controls.jsx');
});
after(() => server?.close());

test('fr3-02: Open in main window and the window pin open their tooltips below, as shared-18 bx / gx', () => {
  const chunk = official('shared-18-D3y8YMFN');
  assert.equal(count(chunk, 'm(Y,{content:r,side:"bottom",children:i})'), 1, 'bx (Open in main window)');
  assert.equal(count(chunk, 'm(Y,{content:a,side:"bottom",children:s})'), 1, 'gx (Keep window on top)');
  const controls = local('src/source-pane-controls.jsx');
  assert.ok(controls.includes('<GhostButton label="Open in main window" icon="ArrowInSquare" tooltipSide="bottom" onClick={onDock} data-pane-dock="" />'));
  assert.ok(controls.includes('icon={alwaysOnTop ? "PinFilled" : "Pin"} pressed={alwaysOnTop} tooltipSide="bottom"'));
  // GhostButton forwards the rest props to the CDS Button, whose tooltipSide is the side of its own label tooltip.
  assert.match(controls, /function GhostButton\(\{[^}]*\.\.\.rest \}\)[\s\S]*?\{\.\.\.rest\} \/>/);
});

test('r3-shared-01: the install result is announced when the install settles, not when a form mounts', async () => {
  assert.equal(count(official('c76f00e40-YUpQMsTD'), 'readyInNewSession'), 1);
  let finish;
  const call = (kind, payload) => payload.operation === 'plugin-install' ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve({ plugins: [] });
  const store = createCustomizeStore({ call, newId: () => 'req-1' });
  const announced = [];
  const pending = store.installPlugin('dsh-plugin-y', { announce: (outcome, spec) => announced.push([outcome.ok, outcome.bundle, spec]) });
  // The form is gone (the person left Customize › Plugins); the store still settles and announces.
  finish({ changed: true, application: 'applied', stage: 'install', target: 'dsh-plugin-y', bundle: 'dsh-plugin-y' });
  const outcome = await pending;
  assert.deepEqual(announced, [[true, 'dsh-plugin-y', 'dsh-plugin-y']]);
  assert.equal(outcome.announced, true);
  assert.equal(store.getSnapshot().pluginOps.install.outcome.announced, true, 'a form mounting later does not toast it again');
  // A failed install is announced too.
  const failing = createCustomizeStore({ call: (kind, payload) => payload.operation === 'plugin-install' ? Promise.reject(new Error('boom')) : Promise.resolve({ plugins: [] }), newId: () => 'req-2' });
  const failures = [];
  await failing.installPlugin('z', { announce: (result) => failures.push(result.ok) });
  assert.deepEqual(failures, [false]);
  // Without an announcer (Built-in plugins), the outcome waits for the form showing it, which marks it once.
  const quiet = createCustomizeStore({ call: (kind, payload) => Promise.resolve(payload.operation === 'plugin-install' ? { changed: true, application: 'applied', bundle: 'b' } : { plugins: [] }), newId: () => 'req-3' });
  await quiet.installPlugin('b');
  assert.equal(quiet.getSnapshot().pluginOps.install.outcome.announced, undefined);
  quiet.markPluginInstallAnnounced('other');
  assert.equal(quiet.getSnapshot().pluginOps.install.outcome.announced, undefined, 'only the matching request');
  quiet.markPluginInstallAnnounced('req-3');
  assert.equal(quiet.getSnapshot().pluginOps.install.outcome.announced, true);
  const form = local('src/source-customize.jsx');
  assert.doesNotMatch(form, /useRef\(outcome\)/);
  assert.ok(form.includes('if (!outcome || outcome.announced || outcome.cancelled) return;'));
  assert.ok(form.includes('await store.installPlugin(spec.trim(), { registry: registry || undefined, announce });'));
  assert.ok(form.includes('store.installPlugin(install.spec, { approvedBuilds: pending, registry: install.registry || undefined, announce })'));
});

test('fr3-08: Clear finished tasks, Copy plan and the preview download Dismiss are CDS ghost iconOnly Buttons', () => {
  assert.ok(official('cccc2cf0a-DhZC33Gc').includes('variant:"ghost",icon:"Trash","aria-disabled":a,className:"aria-disabled:opacity-disabled"'));
  assert.ok(official('cccc2cf0a-DhZC33Gc').includes('variant:"ghost",size:"base",iconOnly:!0,icon:E,"aria-label":D,onMouseDown'));
  const tasks = local('src/source-background-tasks.jsx');
  assert.ok(tasks.includes('<CdsButton variant="ghost" icon="Trash" aria-disabled={finished.length===0} className="aria-disabled:opacity-disabled"'));
  assert.doesNotMatch(local('src/source-background-tasks.css').replace(/\/\*[\s\S]*?\*\//g, ''), /\.sbt-clear/);
  assert.ok(local('src/source-plan-pane.jsx').includes('<CdsButton variant="ghost" size="base" iconOnly icon={copied ? "Check" : "Copy"} aria-label={label} data-plan-copy=""'));
  assert.ok(local('src/source-preview-pane.jsx').includes('<CdsButton variant="ghost" iconOnly icon="X" aria-label={t("Dismiss")} tooltipSide="bottom"'));
  assert.doesNotMatch(local('src/source-preview-pane.css'), /\.spv-icon/);
  for (const file of ['src/source-background-tasks.jsx', 'src/source-plan-pane.jsx', 'src/source-preview-pane.jsx', 'src/source-pane-controls.css'])
    assert.doesNotMatch(local(file).replace(/\/\*[\s\S]*?\*\//g, ''), /spc-ghost/, file);
  // The official utility the Clear button reads ships in a sheet the app loads.
  assert.ok(local('index.html').includes('/assets/v1/c6a992d55-Che1orl5.css'));
  assert.ok(fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8').includes('aria-disabled\\:opacity-disabled'));
});

test('fr3-07: the arrange popup is the CDS Popover (c4db265df mt / bt), Open in new window its Close', () => {
  const chunk = official('c4db265df-fNhlkQCj');
  for (const text of ['ua as E', 'popupClassName:"flex min-w-44 flex-col gap-xs"', 'side:"bottom",align:"end",padding:"xs"', 'openOnHover:!0'])
    assert.ok(chunk.includes(text), text);
  const controls = local('src/source-pane-controls.jsx');
  for (const text of ['<CdsPopover.Root handle={handle} open={open} onOpenChange={onOpenChange}>',
    '<CdsTooltip content={open ? undefined : label} shortcut={TOGGLE_SHORTCUT_LABEL} delay={ARRANGE_TOOLTIP_DELAY_MS}>',
    'openOnHover', 'side="bottom" align="end" padding="xs"', 'className="flex min-w-44 flex-col gap-xs"',
    '<CdsPopover.Close className={cdsClassNames(cdsMenuItemClass(), "hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover")}',
    '<CdsDropdown.Separator />', 'top: 48, right: 8, bottom: 8, left: 8'])
    assert.ok(controls.includes(text), text);
  assert.doesNotMatch(controls, /className="spc-arrange"|useMenuPopup|HOVER_OPEN_MS/);
  assert.doesNotMatch(local('src/source-pane-controls.css'), /\n\.spc-arrange/);
  // Hover, long-press, right-click and ArrowDown still open it; a click still toggles Fill / Tile.
  for (const text of ['onPointerDown={(event) => {', 'LONG_PRESS_MS);', 'onContextMenu={(event) => {', 'openPopup("keyboard");', 'onToggleExpand?.();'])
    assert.ok(controls.includes(text), text);
  const html = renderToStaticMarkup(React.createElement(C.SourcePaneControls, { tileId: 't', paneName: 'Files', onToggleExpand() {}, onPopOut() {}, onClose() {} }));
  const trigger = html.match(/<button[^>]*data-pane-arrange-trigger=""[^>]*>/)?.[0];
  assert.ok(trigger, 'the Expand trigger renders');
  assert.match(trigger, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
  assert.match(trigger, /aria-label="Expand"/);
  assert.match(trigger, /aria-haspopup="dialog"/, 'a Popover trigger, not a menu');
});

test('R3DC-03 / R3DC-05 / R3DC-04: the dead names are gone', () => {
  const gone = {
    'src/settings-advanced-model.mjs': /ADVANCED_GROUP_TITLES/, 'src/layout-command-model.mjs': /LAYOUT_COMMAND_TIMEOUT_MS/,
    'src/preview-model.mjs': /COLOR_SCHEMES|PREVIEW_TAB_CAP_TEXT|anyServerRunning/, 'src/source-pane-controls.jsx': /CLOSE_PANE_SHORTCUT/,
    'src/source-settings-commands.jsx': /SAVE_ERROR/, 'electron/context-usage-service.cjs': /PREVIEW_TIMEOUT/,
    'electron/local-routines.mjs': /WAKE_LATENESS/, 'electron/preview-service.cjs': /EARLY_EXIT_MS/,
    'src/prompt-history-model.mjs': /promptHistoryStatus/, 'src/theme-command-model.mjs': /THEME_LABELS/,
    'src/source-settings.jsx': /ADVANCED_GROUP_TITLES|withEffortDefaults/, 'src/sidebar-model.js': /\btn\b/,
    'src/source-composer-tiles.jsx': /import \{ Icon \}/, 'src/source-customize.jsx': /officialSubtitleFor, pluginChangeOutcome/,
    'src/source-preview-pane.jsx': /serverStatus/, 'src/source-session.jsx': /import \{ SourcePaneControls/,
    'src/source-settings-models.jsx': /\btn\b/, 'src/source-slash-menu.jsx': /useEffect/,
    'src/source-terminal-pane.jsx': /selectionBlocksTerminalLink/, 'src/use-transcript-feed-nav.js': /useEffect/,
    'electron/workflow-tool-model.mjs': /SIZE_LIMITS/,
  };
  for (const [file, pattern] of Object.entries(gone)) assert.doesNotMatch(local(file), pattern, file);
  // The ones kept elsewhere stay: main's own layout timeout, preview-service's scheme set, the titlebar close shortcut.
  assert.match(local('electron/main.cjs'), /const LAYOUT_COMMAND_TIMEOUT_MS = 5000;/);
  assert.match(local('electron/preview-service.cjs'), /const COLOR_SCHEMES = new Set\(\["system", "light", "dark"\]\);/);
  assert.match(local('src/titlebar-controls-model.mjs'), /export const CLOSE_PANE_SHORTCUT = "cmd\+ctrl\+w";/);
});

// W14-code r3 补做 fr3-07 pressFocus "body": c4db265df Ct hands yt `pressFocus:"body"`; a press of the arrange trigger or a
// pick ends in ca5db7aaf z, and what it returns is focused (mt `i?.focus(...)`, pt close `(e ?? N.current)?.focus(...)`).
test('fr3-07 补做: pressFocus "body" is wired as c4db265df yt / bt and ca5db7aaf R / z', async () => {
  const c4 = official('c4db265df-fNhlkQCj'), ca = official('ca5db7aaf-qq5selW3');
  assert.equal(count(c4, 'pressFocus:"body"'), 1);
  assert.equal(count(c4, 'r.pressFocus==="body"?G(a.current,n,e.nativeEvent):null'), 1);
  assert.equal(count(c4, 'o.pressFocus==="body"?G(s.current,{focused:c.current,pointerType:d.current},e.nativeEvent):null'), 1);
  assert.equal(count(c4, 'o.current=Ve(a.current)??o.current'), 1);
  assert.equal(count(ca, 'function z(e,t,n){return e===null||t===null||b(n)?null:t.focused!==null&&e.contains(t.focused)?t.focused:t.pointerType==="mouse"?O(e):null}'), 1);
  assert.equal(count(ca, 'function R(e){let t=u(e?.ownerDocument.activeElement);return e!==null&&t!==null&&e.contains(t)?t:null}'), 1);
  const controls = local('src/source-pane-controls.jsx');
  assert.ok(controls.includes('const target = pressFocusTarget(bodyOf(), pressed, event.nativeEvent);'));
  assert.ok(controls.includes('target?.focus({ preventScroll: true });'));
  assert.ok(controls.includes('close(pressFocusTarget(bodyOf(), { focused: bodyFocusRef.current, pointerType: pickPointer.current }, event.nativeEvent))'));
  assert.ok(controls.includes('bodyFocus.current = bodyFocusedElement(bodyOf()) ?? bodyFocus.current;'));
  assert.equal(count(controls, 'onPointerDown={onPickPointerDown}'), 3);

  const { bodyFocusedElement, pressFocusTarget, paneBodyOf, isKeyboardClick } = await import('../src/pane-press-focus-model.mjs');
  // Stub elements: contains walks parents; querySelectorAll returns the descendants matching a stub selector set.
  const el = (name, parent = null, attrs = {}) => {
    const node = { nodeType: 1, name, parent, attrs, children: [], ownerDocument: null, tabIndex: attrs.tabIndex ?? -1,
      classList: { contains: () => false }, focus() { node.ownerDocument.activeElement = node; },
      contains(other) { for (let n = other; n; n = n.parent) if (n === node) return true; return false; },
      closest(selector) { for (let n = node; n; n = n.parent) if (selector.split(',').some((s) => n.attrs[s.trim()])) return n; return null; },
      matches(selector) { return selector.split(',').some((s) => node.attrs[s.trim()]); },
      hasAttribute: (key) => key in node.attrs,
      querySelector(selector) { return node.querySelectorAll(selector)[0] ?? null; },
      querySelectorAll(selector) { const out = []; const walk = (n) => { for (const c of n.children) { if (c.matches(selector)) out.push(c); walk(c); } }; walk(node); return out; } };
    if (parent) { parent.children.push(node); node.ownerDocument = parent.ownerDocument; }
    return node;
  };
  const doc = { activeElement: null };
  const root = el('root', null, { '[data-pane-root]': true }); root.ownerDocument = doc;
  const header = el('header', root, { '[data-pane-header]': true });
  const trigger = el('trigger', header);
  const headerField = el('headerField', header, { textarea: true, tabIndex: 0 });
  const body = el('body', root);
  const field = el('field', body, { textarea: true, tabIndex: 0 });
  const button = el('button', body, { button: true, tabIndex: 0 });
  const mouse = { detail: 1, pointerType: 'mouse' }, keyboard = { detail: 0 };
  assert.equal(isKeyboardClick(keyboard), true);
  assert.equal(isKeyboardClick(mouse), false);

  const view = paneBodyOf(trigger);
  assert.equal(view.contains(field), true);
  assert.equal(view.contains(trigger), false, 'the header is not the body');
  assert.equal(view.contains(headerField), false);
  // R: the body's focused element, else null.
  doc.activeElement = button; assert.equal(bodyFocusedElement(view), button);
  doc.activeElement = trigger; assert.equal(bodyFocusedElement(view), null);
  assert.equal(bodyFocusedElement(null), null);
  // z: keyboard click -> null; focus began in the body -> that element; mouse -> the body's focus target (O); else null.
  const focusBody = (b) => b.querySelector('textarea');
  assert.equal(pressFocusTarget(view, { focused: button, pointerType: 'mouse' }, keyboard, focusBody), null);
  assert.equal(pressFocusTarget(view, { focused: button, pointerType: 'touch' }, mouse, focusBody), button);
  assert.equal(pressFocusTarget(view, { focused: null, pointerType: 'mouse' }, mouse, focusBody), field, 'the header field is skipped');
  assert.equal(pressFocusTarget(view, { focused: trigger, pointerType: 'mouse' }, mouse, focusBody), field);
  assert.equal(pressFocusTarget(view, { focused: null, pointerType: 'touch' }, mouse, focusBody), null);
  // The default O is the generated c9bc99274 b (paneFocusTarget): no [data-tile-focus-target], so the first text field.
  assert.equal(pressFocusTarget(view, { focused: null, pointerType: 'mouse' }, mouse), field);
  assert.equal(pressFocusTarget(view, null, mouse, focusBody), null, 'no pending press');
  assert.equal(pressFocusTarget(null, { focused: null, pointerType: 'mouse' }, mouse, focusBody), null, 'no body');
  // No header around the trigger: the pane root is the body.
  const bare = el('bare', root); assert.equal(paneBodyOf(el('t2', bare)), root);
  assert.equal(paneBodyOf({ closest: () => null }), null);
});

test('fr3-07 补做: the arrange trigger still renders the same SSR markup', () => {
  const html = renderToStaticMarkup(React.createElement(C.SourcePaneControls, { tileId: 'terminal', paneName: 'Terminal', onToggleExpand() {}, onClose() {} }));
  assert.match(html, /data-pane-arrange-trigger=""/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-label="Expand"/);
});
