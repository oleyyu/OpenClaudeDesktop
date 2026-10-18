import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { nestedSessionCounts, nestedSessionNeedsInput } from '../src/generated/code-current/nested-session-model.mjs';
import * as NestedCopy from '../src/generated/code-current/nested-session-copy.mjs';
import * as PaletteCopy from '../src/generated/code-current/nested-session-palette-copy.mjs';
const { nestedSessionLabel, nestedStatusLabels, nestedRevealLabel } = NestedCopy;
import { splitNestedRun } from '../src/sidebar-model.js';
import { dictionary } from '../electron/i18n/index.mjs';

// R3-nested NBS-2: model/copy/separator/parts come from 2.42304.0; the family stub carries g$'s hit-row class.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const previous = path.resolve(app, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = target => readFileSync(path.join(generated, target), 'utf8');
const official = file => readFileSync(path.join(latest, file), 'utf8');
const h = React.createElement;
let server, createIntl, Parts, RowPrimitive, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ kt: createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-Cf4IuK3L.js'));
  Parts = await server.ssrLoadModule('/src/generated/code-current/nested-session-parts.mjs');
  RowPrimitive = await server.ssrLoadModule('/src/generated/code-current/sidebar-row-primitive.mjs');
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(() => server?.close());

test('source counts never count a failed/unread/running child more than once', () => {
  assert.deepEqual(nestedSessionCounts([
    { hasError: true, isUnread: true, liveStatus: 'running', isResponding: true },
    { isUnread: true, isResponding: true }, { liveStatus: 'running' },
    { isResponding: true }, { isResponding: 1 }, {},
  ]), { count: 6, failed: 1, unread: 1, working: 2 });
});

test('fold retains open panes, awaiting sessions and parent-attributed approvals without reordering', () => {
  const rows = ['hidden', 'main', 'split', 'waiting', 'permission', 'agent-owner', 'tail'].map(id => ({ id }));
  rows[3].liveStatus = 'awaiting'; rows[4].pendingPermissions = 2;
  const state = { approvals: [{ params: { threadId: 'agent-child' } }], threadParents: { 'agent-child': 'agent-owner' } };
  const run = { parentId: 'parent', rows };
  const folded = splitNestedRun(run, true, { state, openIds: new Set(['main', 'split']) });
  assert.deepEqual(folded.kept.map(row => row.id), ['main', 'split', 'waiting', 'permission', 'agent-owner']);
  assert.deepEqual(folded.hidden.map(row => row.id), ['hidden', 'tail']);
  assert.equal(splitNestedRun(run, false).kept, rows);
  assert.deepEqual(splitNestedRun(run, true).hidden.map(row => row.id), ['hidden', 'main', 'split', 'agent-owner', 'tail']);
});

test('source ICU copy includes every status unit and correctly changes singular/more/zero wording', () => {
  const intl = createIntl({ locale: 'en-US', messages: {} });
  assert.equal(nestedSessionLabel(intl, 1, false), '1 nested session');
  assert.equal(nestedSessionLabel(intl, 1, true), '1 more nested session');
  assert.equal(nestedSessionLabel(intl, 3, true), '3 more nested sessions');
  const units = nestedStatusLabels(intl, { failed: 1, unread: 2, working: 3 });
  assert.equal(nestedRevealLabel(intl, '6 nested sessions', Object.values(units)), 'Show 6 nested sessions, 1 failed, 2 new, 3 working');
  assert.equal(nestedRevealLabel(intl, '1 nested session', [undefined, undefined, undefined]), 'Show 1 nested session');
  assert.deepEqual(nestedStatusLabels(intl, { failed: 0, unread: 0, working: 0 }), { failed: undefined, unread: undefined, working: undefined });
});

test('Chinese copy uses the same ICU branches and locale list formatting', () => {
  const raw = createIntl({ locale: 'zh-CN', defaultLocale: 'zh-CN', messages: {} }), dict = dictionary('zh-CN');
  const intl = { ...raw, formatMessage: (message, values) => raw.formatMessage({ ...message, defaultMessage: dict[message.defaultMessage] ?? message.defaultMessage }, values) };
  const label = nestedSessionLabel(intl, 3, true);
  assert.equal(label, '另外 3 个嵌套会话');
  const units = nestedStatusLabels(intl, { failed: 1, unread: 1, working: 1 });
  assert.equal(nestedRevealLabel(intl, label, Object.values(units)), `显示${label}，${raw.formatList(Object.values(units), { type: 'unit' })}`);
  assert.doesNotMatch(Object.values(units).join(' '), /failed|new|working/);
});

const nestedTargets = {
  'nested-session-model.mjs': { file: 'shared-21-IP-SVetq.js', bindings: ['mz', 'LG'], exports: ['nestedSessionCounts', 'nestedSessionNeedsInput'] },
  'nested-session-palette-copy.mjs': { file: 'shared-1-CAAiD7E3.js', bindings: ['IM', 'LM', 'RM'], exports: ['hideAllNestedSessionsCopy', 'nestedSessionsSearchHints', 'showAllNestedSessionsCopy'] },
  'nested-session-copy.mjs': { file: 'shared-20-B7UqYfsi.js', bindings: ['Q', 'yD', 'bD', 'xD', 'SD'], exports: ['nestedRevealLabel', 'nestedSessionLabel', 'nestedStatusLabels', 'nestedToggleLabel'] },
  'nested-session-separator.mjs': { file: 'shared-21-IP-SVetq.js', bindings: ['h$'], exports: ['NestedStatusSeparator'] },
  'nested-session-parts.mjs': { file: 'shared-18-D4XxL6Tg.js', bindings: ['W_', 'G_', 'K_', 'DE', 'TE', 'VD'], exports: ['NestedErrorIcon', 'NestedStatusDot', 'nestedFocusClass', 'sidebarHitRowMainClass', 'synchronizeStatusAnimation'] },
};
const exportsOf = text => [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map(item => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)).sort();

test('the five nested-session helpers are 2.42304.0 originals: manifest source, hashes, bindings and export names', () => {
  for (const [target, expected] of Object.entries(nestedTargets)) {
    const entry = manifest.modules.find(module => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry.source), expected.file, target);
    assert.match(entry.source, /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\//, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(latest, expected.file))), target);
    assert.deepEqual(entry.bindings, expected.bindings, target);
    const text = read(target);
    assert.equal(entry.sha256, sha(text), target);
    assert.match(text, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/, target);
    assert.deepEqual(exportsOf(text), expected.exports, target);
  }
  // Consumers keep their names: the status glyph still takes the dot and animation sync from nested-session-parts.
  const glyph = read('sidebar-status-glyph.mjs');
  assert.match(glyph, /import \{\s*NestedStatusDot as ND,\s*synchronizeStatusAnimation as G_,?\s*\} from "\.\/nested-session-parts\.mjs";/);
  assert.equal(typeof Parts.NestedStatusDot, 'function');
  assert.equal(typeof Parts.synchronizeStatusAnimation, 'function');
});

test('JC is gone in 2.42304.0: no PH pin copy, Hide/Show all come from the palette commands (shared-1 IM/LM.description)', () => {
  // Old shared-20 JC formatted Q.hideAllNested/showAllNested; the new shared-20 drops both keys and reuses JC for KC.handle.
  assert.match(readFileSync(path.join(previous, 'shared-20-78nc04b9.js'), 'utf8'), /hideAllNested/);
  const shared20 = official('shared-20-B7UqYfsi.js');
  assert.doesNotMatch(shared20, /hideAllNested|showAllNested/);
  assert.ok(shared20.includes('JC=KC.handle'));
  assert.ok(shared20.includes('_t("hide_all_nested_sessions",t.anyShown?n:void 0),_t("show_all_nested_sessions",t.anyHidden?r:void 0)'));
  const shared1 = official('shared-1-CAAiD7E3.js');
  assert.ok(shared1.includes('hide_all_nested_sessions:{description:IM.description,group:"session",icon:DL,searchHints:[RM.collapse,RM.fold]}'));
  assert.ok(shared1.includes('show_all_nested_sessions:{description:LM.description,group:"session",icon:OL,searchHints:[RM.expand,RM.unfold]}'));
  const copy = read('nested-session-copy.mjs');
  assert.doesNotMatch(copy, /\b(?:hideAllNested|showAllNested|pinFailed|unpinFailed|JC|PH)\b/);
  assert.deepEqual(PaletteCopy.hideAllNestedSessionsCopy.description, { defaultMessage: 'Hide all nested sessions', id: 'L0u+/SRZGR' });
  assert.deepEqual(PaletteCopy.showAllNestedSessionsCopy.description, { defaultMessage: 'Show all nested sessions', id: 'Le8WmhkjEY' });
  assert.deepEqual(Object.keys(PaletteCopy.nestedSessionsSearchHints), ['collapse', 'expand', 'fold', 'unfold']);
  // Y1-R3-nested-1 (R4i-small SM3): the host-compat allNestedToggleLabel seam is gone with its ZH consumer; the
  // generated module carries only 2.42304.0 bindings, and Hide/Show all copy lives in nested-session-palette-copy.
  assert.equal('allNestedToggleLabel' in NestedCopy, false);
  assert.doesNotMatch(copy, /allNestedToggleLabel|Host compat|nested-session-palette-copy/);
  const intl = createIntl({ locale: 'en-US', messages: {} });
  assert.equal(NestedCopy.nestedToggleLabel(intl, true), 'Show nested sessions');
  assert.equal(NestedCopy.nestedToggleLabel(intl, false), 'Hide nested sessions');
  const zh = dictionary('zh-CN');
  assert.equal(zh['Hide all nested sessions'], '隐藏所有嵌套会话');
  assert.equal(zh['Show all nested sessions'], '显示所有嵌套会话');
  // No host module imports the compat seam directly.
  const hostFiles = readdirSync(path.join(app, 'src')).filter(name => /\.(m?js|jsx)$/.test(name));
  for (const name of hostFiles) assert.doesNotMatch(readFileSync(path.join(app, 'src', name), 'utf8'), /allNestedToggleLabel/, name);
});

test('needs-input stays awaiting-or-permission; the status sync reads the original ownerWindow (shared-25 up)', () => {
  assert.equal(nestedSessionNeedsInput({ liveStatus: 'awaiting' }), true);
  assert.equal(nestedSessionNeedsInput({ pendingPermissions: 1 }), true);
  assert.equal(nestedSessionNeedsInput({ liveStatus: 'running', pendingPermissions: 0 }), false);
  assert.match(read('nested-session-parts.mjs'), /import \{ ownerWindow as ce \} from "\.\/owner-window\.mjs";/);
  const animation = { effect: { getTiming: () => ({ iterations: Infinity, duration: 1000 }) }, startTime: null };
  const finite = { effect: { getTiming: () => ({ iterations: 1, duration: 1000 }) }, startTime: 5 };
  const target = { nodeType: 1, ownerDocument: { defaultView: { performance: { timeOrigin: 12345 } } }, getAnimations: () => [animation, finite] };
  Parts.synchronizeStatusAnimation({ target });
  assert.equal(animation.startTime, -345);
  assert.equal(finite.startTime, 5);
  Parts.synchronizeStatusAnimation({ target: {} });
  assert.equal(renderToStaticMarkup(h(Parts.NestedStatusDot, { kind: 'ready' })), '<span class="status-dot" data-kind="ready"></span>');
});

test('DE adds focus-visible:outline-hidden; TE is the 7px hit-row main class; both equal the row primitive values', () => {
  assert.equal(Parts.nestedFocusClass, 'hide-focus-ring focus-visible:outline-hidden focus-visible:shadow-[inset_0_0_0_1px_var(--cds-fill-accent),0_0_6px_0_color-mix(in_srgb,var(--cds-fill-accent)_20%,transparent)]');
  assert.equal(Parts.nestedFocusClass, RowPrimitive.sidebarFocusClass);
  assert.equal(Parts.sidebarHitRowMainClass, 'hit-row [--cds-hit-gap-y:7px] hit-row-main');
  assert.equal(Parts.sidebarHitRowMainClass, `${RowPrimitive.sidebarHitRowClass} hit-row-main`);
  const shared18 = official('shared-18-D4XxL6Tg.js');
  assert.ok(shared18.includes('TE=`${wE} hit-row-main`'));
  assert.ok(/TE as Ts\b/.test(shared18) && /DE as bs\b/.test(shared18));
});

test('the folded family stub renders g$ class-for-class (df-family-stub ${TE} … ${DE}) and the loaded CSS owns hit-row', () => {
  const shared21 = official('shared-21-IP-SVetq.js');
  // g$ imports TE as pm and DE as Am from shared-18.
  const imports = shared21.match(/import\{([^}]*)\}from"\.\/shared-18-D4XxL6Tg\.js"/)[1];
  assert.match(imports, /(?:^|,)Ts as pm(?:,|$)/);
  assert.match(imports, /(?:^|,)bs as Am(?:,|$)/);
  const template = shared21.match(/df-family-stub \$\{pm\}[^`]*\$\{Am\}/g);
  assert.equal(template?.length, 1);
  const expected = template[0].replace('${pm}', Parts.sidebarHitRowMainClass).replace('${Am}', Parts.nestedFocusClass);
  const now = Math.floor(Date.now() / 1000);
  const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
  const html = renderToStaticMarkup(h(SourceSidebar, {
    sessions: [thread('parent'), thread('child-a', { forkedFromId: 'parent' }), thread('child-b', { forkedFromId: 'parent' })],
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] },
  }));
  const stub = html.match(/<button[^>]*class="(df-family-stub [^"]*)"[^>]*>/);
  assert.ok(stub, 'folded family renders its stub');
  assert.equal(stub[1], expected);
  assert.match(stub[0], /data-row="" data-roving-item="" aria-label="Show 2 nested sessions"/);
  // The utilities that make the click target reach 7px into the gap ship in the loaded 2.42304.0 CSS.
  const utilities = readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  assert.ok(utilities.includes('.hit-row{--cds-hit-row-reach:var(--cds-hit-gap-y,0px);isolation:isolate;position:relative}'));
  assert.ok(utilities.includes('.hit-row-main:before{content:"";z-index:-1;inset:0 0 calc(var(--cds-hit-row-reach) * -1);position:absolute}'));
  assert.ok(utilities.includes('.\\[--cds-hit-gap-y\\:7px\\]{--cds-hit-gap-y:7px}'));
  assert.ok(utilities.includes('.focus-visible\\:outline-hidden:focus-visible{--tw-outline-style:none;outline-style:none}'));
  // D26 (R3-style): g$'s own padding / font-size / colour classes apply over the layered button reset, so the host's
  // .df-family-stub paint/padding restatement is gone; no local rule touches hit-row geometry either.
  const local = readFileSync(path.join(app, 'src/source-sidebar.css'), 'utf8');
  const rules = [...local.matchAll(/\.df-family-stub[^{]*\{([^}]*)\}/g)];
  for (const [, body] of rules) assert.doesNotMatch(body, /position|isolation|inset|z-index|content|outline|padding|font-size|color/);
});
