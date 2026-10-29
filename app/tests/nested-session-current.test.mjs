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
// 3.6556.2 (w2-sidebar-resize-nested): model (+ needs-input), palette copy, copy and separator moved to 3.6556.2.
// w10-ccres-nested-parts: parts is 3.6556.2 shared-18 qv / vk / HA too, and the one copy of them (D1): Kv comes from
// app-switch-frame, _k / bk from sidebar-row-primitive, and sidebar-sections status-dot / group-label import it.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const previous = path.resolve(app, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = target => readFileSync(path.join(generated, target), 'utf8');
const official = file => readFileSync(path.join(latest, file), 'utf8');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const h = React.createElement;
let server, createIntl, Parts, RowPrimitive, SourceSidebar, Separator;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-DYfox5Co.js'));
  Parts = await server.ssrLoadModule('/src/generated/code-current/nested-session-parts.mjs');
  Separator = await server.ssrLoadModule('/src/generated/code-current/nested-session-separator.mjs');
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
  // 3.6556.2 shared-20 wE.hiddenUnread "{count} unread" (uWLP2YHSdk) replaced hiddenNew "{count} new".
  assert.equal(nestedRevealLabel(intl, '6 nested sessions', Object.values(units)), 'Show 6 nested sessions, 1 failed, 2 unread, 3 working');
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
  assert.equal(dict['{count} unread'], '{count} 个未读');
  assert.equal(units.unread, '1 个未读');
  assert.doesNotMatch(Object.values(units).join(' '), /failed|unread|new|working/);
});

const nestedTargets = {
  'nested-session-needs-input.mjs': { version: '3.6556.2', file: 'shared-26-CGuBxVt9.js', bindings: ['Lj'], exports: ['nestedSessionNeedsInput'] },
  'nested-session-model.mjs': { version: '3.6556.2', file: 'shared-21-R7LldJ05.js', bindings: ['rW'], exports: ['nestedSessionCounts', 'nestedSessionNeedsInput'] },
  'nested-session-palette-copy.mjs': { version: '3.6556.2', file: 'shared-1-BJhqMmkf.js', bindings: ['eI', 'tI', 'nI'], exports: ['hideAllNestedSessionsCopy', 'nestedSessionsSearchHints', 'showAllNestedSessionsCopy'] },
  'nested-session-copy.mjs': { version: '3.6556.2', file: 'shared-20-mUr7IqZY.js', bindings: ['wE', 'DE', 'OE', 'kE', 'AE'], exports: ['nestedRevealLabel', 'nestedSessionLabel', 'nestedStatusLabels', 'nestedToggleLabel'] },
  'nested-session-separator.mjs': { version: '3.6556.2', file: 'shared-21-R7LldJ05.js', bindings: ['z7'], exports: ['NestedStatusSeparator'] },
  'nested-session-parts.mjs': { version: '3.6556.2', file: 'shared-18-D3y8YMFN.js', bindings: ['qv', 'vk', 'HA'], exports: ['NestedErrorIcon', 'NestedStatusDot', 'nestedFocusClass', 'sidebarHitRowMainClass', 'synchronizeStatusAnimation'] },
};
const exportsOf = text => [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map(item => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)).sort();

test('the nested-session helpers are 3.6556.2 / 2.42304.0 originals: manifest source, hashes, bindings and export names', () => {
  for (const [target, expected] of Object.entries(nestedTargets)) {
    const entry = manifest.modules.find(module => module.target === target);
    assert.ok(entry, target);
    const v = expected.version === '3.6556.2';
    assert.equal(entry.referenceVersion, expected.version, target);
    assert.equal(path.basename(entry.source), expected.file, target);
    assert.match(entry.source, v ? /snapshots\/claude-3\.6556\.2-20261025-192807\/ion-dist\/assets\/v1\// : /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\//, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(v ? v3 : latest, expected.file))), target);
    assert.deepEqual(entry.bindings, expected.bindings, target);
    const text = read(target);
    assert.equal(entry.sha256, sha(text), target);
    assert.ok(text.startsWith(`// Original Claude Desktop ${expected.version} bindings`), target);
    assert.deepEqual(exportsOf(text), expected.exports, target);
  }
  // 3.6556.2 source facts: LG left shared-21 for shared-26 (Lj, exported bi); the copy's unread unit; z7 is compiled.
  const shared20 = readFileSync(path.join(v3, 'shared-20-mUr7IqZY.js'), 'utf8');
  assert.ok(shared20.includes('hiddenUnread:{defaultMessage:"{count} unread",id:"uWLP2YHSdk"}'));
  assert.doesNotMatch(shared20, /hiddenNew|"\{count\} new"|hideAllNested|showAllNested/);
  assert.ok(readFileSync(path.join(v3, 'shared-26-CGuBxVt9.js'), 'utf8').includes('function Lj(e){return e.liveStatus==="awaiting"||e.pendingPermissions>0}'));
  assert.match(read('nested-session-separator.mjs'), /import \{\s*reactMemoCache as J9,[^}]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.equal(renderToStaticMarkup(h(Separator.NestedStatusSeparator, null, 'x')), '<span class="flex shrink-0 items-center"><span aria-hidden="true" class="px-1.5 text-muted">·</span>x</span>');
  // Consumers keep their names: the status glyph still takes the dot and animation sync from nested-session-parts.
  const glyph = read('sidebar-status-glyph.mjs');
  // (3.6556.2 sidebar-status-glyph, w2-sidebar-current-a, imports them as PA / Kv; 2.42304.0 as ND / G_.)
  assert.match(glyph, /import \{\s*NestedStatusDot as [\w$]+,\s*synchronizeStatusAnimation as [\w$]+,?\s*\} from "\.\/nested-session-parts\.mjs";/);
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
  // generated module carries only official bindings, and Hide/Show all copy lives in nested-session-palette-copy.
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

test('needs-input stays awaiting-or-permission; the status sync is app-switch-frame Kv (shared-18 Kv over shared-25 up)', async () => {
  assert.equal(nestedSessionNeedsInput({ liveStatus: 'awaiting' }), true);
  assert.equal(nestedSessionNeedsInput({ pendingPermissions: 1 }), true);
  assert.equal(nestedSessionNeedsInput({ liveStatus: 'running', pendingPermissions: 0 }), false);
  assert.match(read('nested-session-parts.mjs'), /import \{ syncInfiniteAnimations as Kv \} from "\.\.\/app-switch\/app-switch-frame\.mjs";/);
  const frame = await server.ssrLoadModule('/src/generated/app-switch/app-switch-frame.mjs');
  assert.equal(Parts.synchronizeStatusAnimation, frame.syncInfiniteAnimations, 'one copy of Kv');
  const animation = { effect: { getTiming: () => ({ iterations: Infinity, duration: 1000 }) }, startTime: null };
  const finite = { effect: { getTiming: () => ({ iterations: 1, duration: 1000 }) }, startTime: 5 };
  const target = { nodeType: 1, ownerDocument: { defaultView: { performance: { timeOrigin: 12345 } } }, getAnimations: () => [animation, finite] };
  Parts.synchronizeStatusAnimation({ target });
  assert.equal(animation.startTime, -345);
  assert.equal(finite.startTime, 5);
  Parts.synchronizeStatusAnimation({ target: {} });
  assert.equal(renderToStaticMarkup(h(Parts.NestedStatusDot, { kind: 'ready' })), '<span class="status-dot" data-kind="ready"></span>');
});

test('bk adds focus-visible:outline-hidden; vk is the 7px hit-row main class; both are the row primitive values', () => {
  assert.equal(Parts.nestedFocusClass, 'hide-focus-ring focus-visible:outline-hidden focus-visible:shadow-[inset_0_0_0_1px_var(--cds-fill-accent),0_0_6px_0_color-mix(in_srgb,var(--cds-fill-accent)_20%,transparent)]');
  assert.equal(Parts.nestedFocusClass, RowPrimitive.sidebarFocusClass);
  assert.equal(Parts.sidebarHitRowMainClass, 'hit-row [--cds-hit-gap-y:7px] hit-row-main');
  assert.equal(Parts.sidebarHitRowMainClass, `${RowPrimitive.sidebarHitRowClass} hit-row-main`);
  // 3.6556.2 shared-18 (2.42304.0 DE / TE / wE -> bk / vk / _k), exported as Ss / Ds / Es.
  const shared18 = readFileSync(path.join(v3, 'shared-18-D3y8YMFN.js'), 'utf8');
  assert.ok(shared18.includes('_k="hit-row [--cds-hit-gap-y:7px]",vk=`${_k} hit-row-main`'));
  assert.ok(shared18.includes('bk="hide-focus-ring focus-visible:outline-hidden focus-visible:shadow-[inset_0_0_0_1px_var(--cds-fill-accent),0_0_6px_0_color-mix(in_srgb,var(--cds-fill-accent)_20%,transparent)]"'));
  assert.ok(/(?:^|[,{])vk as Ds\b/.test(shared18) && /(?:^|[,{])bk as Ss\b/.test(shared18) && /(?:^|[,{])_k as Es\b/.test(shared18));
  // nested-session-parts re-exports the row primitive's own bk / _k (no second copy) and slices only vk.
  assert.match(read('nested-session-parts.mjs'), /import \{\s*sidebarHitRowClass as _k,\s*sidebarFocusClass as bk,?\s*\} from "\.\/sidebar-row-primitive\.mjs";/);
  assert.doesNotMatch(read('nested-session-parts.mjs'), /var bk\b|var _k\b|function Kv\b|function Gv\b/);
});

test('w10-ccres-nested-parts: qv / HA are the 3.6556.2 originals, HA draws the CDS Icon, and src/generated holds one copy', async () => {
  const shared18 = readFileSync(path.join(v3, 'shared-18-D3y8YMFN.js'), 'utf8');
  assert.ok(shared18.includes('function qv(e){let $=J9(2),{kind:t}=e;return J1($,0,t)?K1($,0,t,m("span",{className:"status-dot","data-kind":t,onAnimationStart:Kv})):$[1]}'));
  assert.ok(shared18.includes('function HA(e){let $=J9(3),{color:t,shape:n}=e,r=n===void 0?"Warning":n;return J2($,0,t,r)?K2($,0,t,r,m(_e,{name:r,size:"sm",className:t})):$[2]}'));
  // _e is shared-frame od, view-tabs' CdsIcon; the generated module imports it by that semantic name (R3/R6).
  assert.match(shared18, /import\{[^}]*(?:^|[{,])od as _e(?:[,}])[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/);
  const text = read('nested-session-parts.mjs');
  assert.match(text, /CdsIcon as _e,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.doesNotMatch(text, /source-code-start-adapters|StartIcon|owner-window/);
  // Its imports: React, view-tabs, app-switch-frame and the row primitive only (no path back into sidebar-sections).
  assert.deepEqual([...text.matchAll(/from "([^"]+)"/g)].map(m => m[1]).sort(),
    ['../app-switch/app-switch-frame.mjs', '../view-tabs/shared-frame-6jtSkIit.js', './sidebar-row-primitive.mjs', 'react/jsx-runtime']);
  const { CdsIcon } = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  const icon = renderToStaticMarkup(h(Parts.NestedErrorIcon, { color: 'text-danger' }));
  assert.equal(icon, renderToStaticMarkup(h(CdsIcon, { name: 'Warning', size: 'sm', className: 'text-danger' })));
  assert.match(icon, /data-cds="Icon"/);
  assert.equal(renderToStaticMarkup(h(Parts.NestedErrorIcon, { color: 'x', shape: 'Help' })), renderToStaticMarkup(h(CdsIcon, { name: 'Help', size: 'sm', className: 'x' })));
  // sidebar-sections re-exports this module's originals under its own names (R4) instead of slicing them again.
  const sections = path.join(app, 'src/generated/sidebar-sections');
  const dot = readFileSync(path.join(sections, 'status-dot.mjs'), 'utf8'), label = readFileSync(path.join(sections, 'group-label.mjs'), 'utf8');
  assert.match(dot, /import \{\s*NestedStatusDot as qv,\s*NestedErrorIcon as HA,?\s*\} from "\.\.\/code-current\/nested-session-parts\.mjs";/);
  assert.match(dot, /HA as SidebarErrorIcon/);
  assert.match(label, /import \{ sidebarHitRowMainClass as vk \} from "\.\.\/code-current\/nested-session-parts\.mjs";/);
  assert.match(label, /vk as sidebarGroupToggleHitClass/);
  const sectionsManifest = JSON.parse(readFileSync(path.join(sections, 'manifest.json'), 'utf8'));
  for (const module of sectionsManifest.modules) {
    if (module.source !== 'shared-18-D3y8YMFN.js') continue;
    const names = module.bindings.map(b => b.name ?? b);
    for (const local of ['qv', 'vk', 'HA']) assert.ok(!names.includes(local), `${module.target} slices ${local} again`);
  }
  // One qv / HA / vk implementation under src/generated. The whole-chunk copies of shared-18 belong to other generators
  // (cowork-scheduled and proposal-group 3.6556.2, current-chat 2.31226.0 until w10-curchat-retire; crossLaneIssues of
  // w10-ccres-nested-parts); the list may only shrink.
  const wholeChunkCopies = new Set(['cowork-scheduled/shared-18-D3y8YMFN.mjs', 'proposal-group/shared-18-D3y8YMFN.js', 'current-chat/shared-18-DaJGQi6_.js']);
  const generatedRoot = path.join(app, 'src/generated');
  const files = readdirSync(generatedRoot, { recursive: true }).filter(name => /\.(m?js)$/.test(name)).map(name => name.split(path.sep).join('/'));
  const holders = pattern => files.filter(name => pattern.test(readFileSync(path.join(generatedRoot, name), 'utf8')));
  const owned = list => list.filter(name => !wholeChunkCopies.has(name));
  for (const [binding, pattern] of [
    ['qv', /className:\s*"status-dot",\s*"data-kind":\s*\w+,\s*onAnimationStart:/],
    ['HA', /=\s*\w+ === void 0 \? "Warning" : \w+;\s*return J2\(/],
    ['vk', /= `\$\{[\w$]+\} hit-row-main`/],
  ]) {
    const found = holders(pattern);
    assert.deepEqual(owned(found), ['code-current/nested-session-parts.mjs'], `${binding} holders: ${found}`);
    for (const name of found) assert.ok(name === 'code-current/nested-session-parts.mjs' || wholeChunkCopies.has(name), `${binding}: new copy ${name}`);
  }
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
  const utilities = readFileSync(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8');
  // 3.6556.2 splits the reach into top / x / bottom (bottom = gap-y + grid-y; with no hit grid it is 2.42304.0's gap-y).
  assert.ok(utilities.includes('.hit-row{--cds-hit-row-reach-top:var(--cds-hit-grid-y,0px);--cds-hit-row-reach-x:var(--cds-hit-grid-x,0px);--cds-hit-row-reach-bottom:calc(var(--cds-hit-gap-y,0px) + var(--cds-hit-grid-y,0px));isolation:isolate;position:relative}'));
  assert.ok(utilities.includes('.hit-row-main:before{content:"";z-index:-1;inset:calc(var(--cds-hit-row-reach-top) * -1) calc(var(--cds-hit-row-reach-x) * -1) calc(var(--cds-hit-row-reach-bottom) * -1);position:absolute}'));
  assert.ok(utilities.includes('.\\[--cds-hit-gap-y\\:7px\\]{--cds-hit-gap-y:7px}'));
  assert.ok(utilities.includes('.focus-visible\\:outline-hidden:focus-visible{--tw-outline-style:none;outline-style:none}'));
  // D26 (R3-style): g$'s own padding / font-size / colour classes apply over the layered button reset, so the host's
  // .df-family-stub paint/padding restatement is gone; no local rule touches hit-row geometry either.
  const local = readFileSync(path.join(app, 'src/source-sidebar.css'), 'utf8');
  const rules = [...local.matchAll(/\.df-family-stub[^{]*\{([^}]*)\}/g)];
  for (const [, body] of rules) assert.doesNotMatch(body, /position|isolation|inset|z-index|content|outline|padding|font-size|color/);
});
