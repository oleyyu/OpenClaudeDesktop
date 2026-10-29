// w12b-slash-plugin-groups: the Add menu's Plugins groups as 3.6556.2 builds them (c752b32f8 gs → us: singleRow,
// pluginLabel, the "{count} skills" subtitle, the max-h-[284px] plugin submenu, the Manage / Browse footer) and the
// slash list's virtual branch from 30 rows on (ccc334009 N / M over vendor-frame's useVirtualizer, published by
// extract-view-tabs as useVirtualizer).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { PLUGIN_MENU_SINGLE_SKILL_ROWS_GATE, PLUGIN_SUBMENU_CLASS, pluginMenuFlags, pluginMenuGroups, pluginMenuRows, skillRows } from '../src/customize-model.mjs';
import { ADD_SUBMENU_MAX_VISIBLE_ITEMS, addSubmenuFrame } from '../src/add-menu-model.mjs';
import { HOST_GROWTHBOOK } from '../src/host-growthbook.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const v3 = (name) => fs.readFileSync(path.join(V3, name), 'utf8');
const source = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
let server, menu, plugins, slash;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  menu = await server.ssrLoadModule('/src/source-menu.jsx');
  plugins = await server.ssrLoadModule('/src/source-add-plugins-menu.jsx');
  slash = await server.ssrLoadModule('/src/source-slash-menu.jsx');
});
after(async () => { await server?.close(); });

function renderWith(component, props, states = []) {
  let cursor = 0;
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':w12b:',
    useState: (initial) => { const i = cursor++; return [i in states ? states[i] : typeof initial === 'function' ? initial() : initial, () => {}]; },
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) { for (const node of tree) { const hit = find(node, predicate); if (hit) return hit; } return null; }
  if (tree.props && predicate(tree)) return tree;
  return tree.props ? find(tree.props.children, predicate) : null;
}
function withDocument(fn) {
  const had = Object.hasOwn(globalThis, 'document'), old = globalThis.document;
  globalThis.document = { body: { nodeType: 1 } };
  try { return fn(); } finally { if (had) globalThis.document = old; else delete globalThis.document; }
}

const listing = { data: [{ cwd: '/w', skills: [
  { name: 'lint', path: '/p/acme/lint/SKILL.md', enabled: true, scope: 'user', pluginId: 'acme', description: 'Lint' },
  { name: 'fmt', path: '/p/acme/fmt/SKILL.md', enabled: true, scope: 'user', pluginId: 'acme' },
  { name: 'deploy', path: '/p/ship/deploy/SKILL.md', enabled: true, scope: 'user', pluginId: 'ship' },
  { name: 'Deploy', path: '/p/dock/deploy/SKILL.md', enabled: true, scope: 'user', pluginId: 'dock' },
  { name: 'solo', path: '/p/solo/solo/SKILL.md', enabled: true, scope: 'user', pluginId: 'solo' },
  { name: 'off', path: '/p/quiet/off/SKILL.md', enabled: false, scope: 'user', pluginId: 'quiet' },
] }] };
const skills = skillRows(listing).skills;
const pluginList = [
  { id: 'acme', name: 'Acme', pluginName: 'acme', enabled: true, source: 'local' },
  { id: 'ship', name: 'Ship', pluginName: 'ship', enabled: true, source: 'git' },
  { id: 'dock', name: 'Dock', pluginName: 'dock', enabled: true, source: 'local' },
  { id: 'solo', name: 'Solo', pluginName: 'solo', enabled: true, source: 'local' },
  // Shares Solo's display name but offers no invocable skill: lw's cw drops it before us counts names.
  { id: 'quiet', name: 'Solo', pluginName: 'quiet', enabled: true, source: 'local' },
];

test('3.6556.2 originals: us rows, gs flags and the gates behind them (c752b32f8, shared-8, shared-52)', () => {
  const add = v3('c752b32f8-mYZAs6yC.js');
  for (const feature of [
    'return{name:e.name,label:o,skills:t,singleRow:i&&t.length===1?n:void 0}',
    'o=(O.get(a)??0)>1&&e.source==="local"?`${a} (local)`:a;',
    'for(let e of[...t.map(ds),...o])if(e){',
    'return r?(a.get(r.label.toLowerCase())??0)>1?{...r,pluginLabel:t}:r:{type:"submenu",label:t,..._?{icon:"Plugin"}:{},...v&&n.length>1?{subtitle:',
    '{count, plural, one {# skill} other {# skills}}",id:"wivscRMj7V"},{count:n.length})}:{},items:n,submenuClassName:"max-h-[284px]"}',
    'function ds(e){return e.singleRow}',
    'h=G()&&(!f||a)',
    'singleSkillRows:h,skillsFolded:r,connectorsFolded:i!==null',
    'A=mr(),j=Ar(A),M=Ue(Sr())&&A,N=Ue(a==="on"&&j)&&j',
    '{skillRows:ee,skillsFolded:M,foldedConnectors:te,canFold:A}',
    'footerItems:[T,D]',
    '{defaultMessage:"Manage plugins",id:"EXoZxGhXPy"}',
    '{defaultMessage:"Browse plugins",id:"uY5OjtEg/e"}',
    'if(t(i.label))return[i];if(i.type==="skill")return t(r)||t(n)?[{...i,pluginLabel:r}]:[]',
    // Gi: a frame with its own max-h class drops the 8.5-row cap; the footer follows a Separator.
    '_=s?.includes("max-h-")?void 0:g??8.5',
    'labelDir:"auto",ref:b,icon:c,hint:m,disabled:_',
    'className:"flex min-w-0 flex-col",children:[n(Xi,{text:t}),n("span",{className:"truncate text-footnote text-muted-as-secondary",children:r})]',
  ]) assert.ok(add.includes(feature), feature);
  assert.match(add, /[{,]fo as G[,}]/);
  assert.match(add, /[{,]di as mr[,}]/);
  assert.match(add, /[{,]li as Sr[,}]/);
  assert.match(add, /[{,]ui as Ar[,}]/);
  const s8 = v3('shared-8-Db1QN4mf.js');
  assert.ok(s8.includes('var MP=!1;function NP(){'));
  assert.ok(s8.includes('K5($,0,e,i,a,r,t,n,MP)'));
  assert.ok(s8.includes('function FP(){let e=ii(),t=NP();return e&&t}'));
  assert.match(s8, /[{,]NP as di[,}]/); assert.match(s8, /[{,]FP as li[,}]/); assert.match(s8, /[{,]PP as ui[,}]/);
  const s52 = v3('shared-52-uHFNjl7C.js');
  assert.ok(s52.includes('JL="__gb__254483703";function YL(){return ze(JL)}'));
  assert.match(s52, /[{,]YL as fo[,}]/);
  assert.equal(PLUGIN_MENU_SINGLE_SKILL_ROWS_GATE, '__gb__254483703');
});

test('pluginMenuFlags: the host default is every fold off; singleSkillRows needs the gate outside agent mode or canFold', () => {
  assert.equal(Object.hasOwn(HOST_GROWTHBOOK, PLUGIN_MENU_SINGLE_SKILL_ROWS_GATE), false, 'the gate is not listed, so it is off (D29 / D31)');
  assert.deepEqual({ ...pluginMenuFlags() }, { singleSkillRows: false, skillsFolded: false, connectorsFolded: false, pluginIcon: false, countSubtitle: false, search: false });
  assert.equal(pluginMenuFlags({ singleSkillRowsGate: true }).singleSkillRows, false, 'agent mode with canFold false (NP → MP = !1)');
  const outside = pluginMenuFlags({ singleSkillRowsGate: true, isAgentMode: false });
  assert.deepEqual([outside.singleSkillRows, outside.pluginIcon, outside.search, outside.countSubtitle], [true, true, true, false]);
  assert.equal(pluginMenuFlags({ skillsFoldedGate: true }).skillsFolded, false, 'M = Ue(Sr()) && A');
  assert.equal(pluginMenuFlags({ skillsFoldedGate: true, canFold: true }).countSubtitle, true);
  const connectors = pluginMenuFlags({ connectorsFolded: true });
  assert.deepEqual([connectors.pluginIcon, connectors.countSubtitle, connectors.search], [true, true, true]);
});

test('pluginMenuGroups: offered plugins only (lw cw), " (local)" counted over them, singleRow for a one-skill plugin', () => {
  const groups = pluginMenuGroups(pluginList, skills);
  assert.deepEqual(groups.map((g) => [g.id, g.label, g.name, g.items.map((i) => i.skillName), g.singleRow]),
    [['acme', 'Acme', 'acme', ['fmt', 'lint'], undefined], ['ship', 'Ship', 'ship', ['deploy'], undefined],
      ['dock', 'Dock', 'dock', ['Deploy'], undefined], ['solo', 'Solo', 'solo', ['solo'], undefined]]);
  assert.equal(groups[0].items[1].sourcePluginName, 'Acme');
  const folded = pluginMenuGroups(pluginList, skills, { singleSkillRows: true });
  assert.deepEqual(folded.map((g) => g.singleRow?.skillName ?? null), [null, 'deploy', 'Deploy', 'solo']);
  // Two offered plugins with one display name: the local one is " (local)".
  const twins = pluginMenuGroups([{ id: 'a', name: 'Same', enabled: true, source: 'local' }, { id: 'b', name: 'Same', enabled: true, source: 'git' }],
    skillRows({ data: [{ cwd: '/', skills: [{ name: 'x', path: '/a', enabled: true, pluginId: 'a' }, { name: 'y', path: '/b', enabled: true, pluginId: 'b' }] }] }).skills);
  assert.deepEqual(twins.map((g) => g.label), ['Same (local)', 'Same']);
});

test('pluginMenuRows: submenus by default; singleRow rows take pluginLabel only on a label collision; subtitle with > 1 skill', () => {
  const plain = pluginMenuRows(pluginMenuGroups(pluginList, skills));
  assert.equal(plain.items.length, 4);
  for (const row of plain.items) {
    assert.equal(row.type, 'submenu');
    assert.equal(row.icon, undefined, 'us `..._?{icon:"Plugin"}:{}` with _ false');
    assert.equal(row.subtitle, undefined);
    assert.equal(row.submenuClassName, 'max-h-[284px]');
  }
  assert.equal(PLUGIN_SUBMENU_CLASS, 'max-h-[284px]');
  assert.deepEqual(plain.namedRows.map((r) => [r.name, r.label, r.row === plain.items[plain.namedRows.indexOf(r)]]), [['acme', 'Acme', true], ['ship', 'Ship', true], ['dock', 'Dock', true], ['solo', 'Solo', true]]);
  const flags = pluginMenuFlags({ singleSkillRowsGate: true, isAgentMode: false });
  const folded = pluginMenuRows(pluginMenuGroups(pluginList, skills, flags), flags);
  assert.deepEqual(folded.items.map((r) => [r.type, r.label, r.pluginLabel, r.icon]),
    [['submenu', 'Acme', undefined, 'Plugin'], ['skill', 'deploy', 'Ship', 'Scroll'], ['skill', 'Deploy', 'Dock', 'Scroll'], ['skill', 'solo', undefined, 'Scroll']]);
  // A folded Skills row with the same label also collides (`[...t.map(ds), ...o]`) and follows the plugin rows.
  const skillRow = { type: 'skill', label: 'Solo', path: '/s' };
  const withSkills = pluginMenuRows(pluginMenuGroups(pluginList, skills, flags), flags, [skillRow]);
  assert.equal(withSkills.items[3].pluginLabel, 'Solo');
  assert.equal(withSkills.items.at(-1), skillRow);
  const counted = pluginMenuRows(pluginMenuGroups(pluginList, skills), pluginMenuFlags({ connectorsFolded: true }));
  assert.deepEqual(counted.items.map((r) => r.subtitle), ['2 skills', undefined, undefined, undefined]);
});

test('addSubmenuFrame (Gi): 8.5 rows unless the submenu brings max-h; the fixed max-h also goes inline', () => {
  assert.equal(ADD_SUBMENU_MAX_VISIBLE_ITEMS, 8.5);
  assert.deepEqual(addSubmenuFrame(undefined), { className: undefined, maxVisibleItems: 8.5, style: undefined });
  assert.deepEqual(addSubmenuFrame('max-h-[284px]'), { className: 'max-h-[284px]', maxVisibleItems: undefined, style: { maxHeight: '284px' } });
  assert.deepEqual(addSubmenuFrame('max-w-[min(24rem,var(--available-width))]', 6), { className: 'max-w-[min(24rem,var(--available-width))]', maxVisibleItems: 6, style: undefined });
});

test('AddPluginsPopup / AddPluginRow: Gi frame, footer after a Separator, plugin submenus and folded skill rows', () => {
  const onSkill = () => {}, onManage = () => {}, onBrowse = () => {};
  const rows = pluginMenuRows(pluginMenuGroups(pluginList, skills)).items;
  const popup = plugins.AddPluginsPopup({ rows, onSkill, onManage, onBrowse });
  assert.equal(popup.type, menu.SourceMenu.Popup);
  assert.equal(popup.props.className, 'add-plugins-popup');
  assert.equal(popup.props.maxVisibleItems, 8.5);
  const footer = React.Children.toArray(popup.props.footer.props.children);
  assert.equal(footer[0].type, menu.SourceMenu.Separator);
  assert.deepEqual(footer.slice(1).map((item) => [item.props.icon, item.props.children, item.props.onClick]), [['Tool', 'Manage plugins', onManage], ['Add', 'Browse plugins', onBrowse]]);
  assert.equal(React.Children.toArray(popup.props.children).length, 4);
  const submenu = plugins.AddPluginRow({ row: rows[0], onSkill });
  const [trigger, child] = React.Children.toArray(submenu.props.children);
  assert.equal(trigger.type, menu.SourceMenu.SubmenuTrigger);
  assert.equal(trigger.props.icon, undefined);
  assert.equal(trigger.props.className, 'group');
  assert.equal(trigger.props['data-plugin-id'], 'acme');
  assert.equal(child.props.className, 'add-plugin-skills-popup max-h-[284px]');
  assert.deepEqual(child.props.style, { maxHeight: '284px' });
  assert.equal(child.props.maxVisibleItems, undefined);
  assert.deepEqual(React.Children.toArray(child.props.children).map((node) => [node.type, node.props.item.skillName]), [[menu.SourceMenu.SkillItem, 'fmt'], [menu.SourceMenu.SkillItem, 'lint']]);
  const single = plugins.AddPluginRow({ row: { type: 'skill', label: 'deploy', path: '/d', pluginLabel: 'Ship' }, onSkill });
  assert.equal(single.type, menu.SourceMenu.SkillItem);
  assert.equal(single.props.item.pluginLabel, 'Ship');
  // Zi: label alone, or label over the muted subtitle.
  assert.equal(renderToStaticMarkup(React.createElement(plugins.AddPluginSubmenuLabel, { label: 'Acme' })), 'Acme');
  assert.equal(renderToStaticMarkup(React.createElement(plugins.AddPluginSubmenuLabel, { label: 'Acme', subtitle: '2 skills' })),
    '<span class="flex min-w-0 flex-col"><span class="block truncate">Acme</span><span class="truncate text-footnote text-muted-as-secondary">2 skills</span></span>');
  // The single row's hint reaches the CDS item (Qi hint: m): the skill item SSR shows it.
  const html = renderToStaticMarkup(React.createElement(menu.SourceMenu.SkillItem, { item: { label: 'deploy', path: '/d', pluginLabel: 'Ship' }, onSelect() {} }));
  assert.match(html, /smenu-hint[^>]*>Ship</);
});

test('main.jsx hands us its rows to AddPluginsPopup; the classes used are official utilities', () => {
  const main = source('src/main.jsx');
  assert.ok(main.includes('const addPluginRows = useMemo(() => pluginMenuRows(addPlugins.groups).items, [addPlugins.groups]);'));
  assert.ok(main.includes('<AddPluginsPopup rows={addPluginRows} onSkill={applySkill}'));
  assert.ok(!main.includes('className="add-plugin-skills-popup"'), 'the old hand-drawn plugin submenus are gone');
  const css = v3('c6a992d55-Che1orl5.css');
  for (const rule of ['.max-h-\\[284px\\]{max-height:284px}', '.text-footnote{', '.text-muted-as-secondary{', '.min-w-0{', '.flex-col{', '.truncate{'])
    assert.ok(css.includes(rule), rule);
});

test('slash list: from 30 rows the useVirtualizer branch (ccc334009 N / M); the hook is published from vendor-frame', () => {
  const list = v3('ccc334009-BcS3oSTB.js');
  for (const feature of ['var A=30;function j(e){return e.type==="separator"?9:e.type==="section-header"?25:32}',
    'estimateSize:t=>j(e[t]),overscan:8,scrollPaddingStart:28,scrollPaddingEnd:28}',
    'o==="keyboard"&&(h.current=u,a>=0&&a<e.length&&m.scrollToIndex(a,{align:"auto"}))',
    '[m,h]=d(r.length>=A);return!m&&r.length>=A&&h(!0),m?c?',
    'style:{transform:`translateY(${g[0]?.start??0}px)`}',
    '"data-index":t.index,ref:m.measureElement',
    '_.current&&(_.current.style.minWidth="")']) assert.ok(list.includes(feature), feature);
  assert.match(list, /import\{[^}]*\bS as r\b[^}]*\}from"\.\/vendor-frame-CnSY1sxv\.js"/);
  const vendor = v3('vendor-frame-CnSY1sxv.js');
  assert.match(vendor.slice(vendor.lastIndexOf('export{')), /[{,]sy as S[,}]/);
  const manifest = JSON.parse(source('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(manifest.publicNames.useVirtualizer, { file: 'vendor-frame-CnSY1sxv.js', local: 'sy', export: 'S' });
  assert.equal(slash.SLASH_VIRTUAL_MIN_ROWS, 30);
  assert.deepEqual({ ...slash.SLASH_VIRTUALIZER_OPTIONS }, { overscan: 8, scrollPaddingStart: 28, scrollPaddingEnd: 28 });
  assert.deepEqual(['separator', 'header', 'row', 'loading'].map((type) => slash.slashRowEstimate({ type })), [9, 25, 32, 32]);
  assert.match(source('src/source-slash-menu.jsx'), /import \{useVirtualizer\} from '\.\/generated\/view-tabs\/vendor-frame-CnSY1sxv\.js';/);
});

test('SourceSlashMenu: under 30 rows k\'s flex column; at 30 the virtual rows once the scroll body is known', () => {
  const caret = { left: 10, top: 300, height: 20 };
  const base = { selected: 0, onSelect() {}, onHover() {}, onDismiss() {}, id: 'slash', query: '', caret };
  const few = Array.from({ length: 29 }, (_, i) => ({ id: `c${i}` }));
  const small = withDocument(() => renderWith(slash.SourceSlashMenu, { ...base, commands: few }));
  const column = find(small.children, (node) => node.props?.className === 'flex flex-col');
  assert.ok(column);
  assert.equal(React.Children.toArray(column.props.children).length, 29);
  assert.equal(find(small.children, (node) => node.type === slash.SlashVirtualRows), null);
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` }));
  // State order: activeRow, virtual (latched from 30 rows), scroll element.
  const waiting = withDocument(() => renderWith(slash.SourceSlashMenu, { ...base, commands: many }));
  assert.equal(find(waiting.children, (node) => node.props?.className === 'flex flex-col'), null);
  assert.equal(find(waiting.children, (node) => node.type === slash.SlashVirtualRows), null, 'M waits for the scroll element (`m ? c ? M : null`)');
  const scrollEl = { nodeType: 1 };
  const ready = withDocument(() => renderWith(slash.SourceSlashMenu, { ...base, commands: many }, [null, true, scrollEl]));
  const rows = find(ready.children, (node) => node.type === slash.SlashVirtualRows);
  assert.ok(rows);
  assert.equal(rows.props.scrollEl, scrollEl);
  assert.equal(rows.props.entries.length, 30);
  assert.deepEqual(rows.props.rowKeys.slice(0, 2), ['command:c0', 'command:c1']);
  // Latched: fewer rows later keep the virtual branch while the menu stays open.
  const latched = withDocument(() => renderWith(slash.SourceSlashMenu, { ...base, commands: few }, [null, true, scrollEl]));
  assert.ok(find(latched.children, (node) => node.type === slash.SlashVirtualRows));
});

test('SlashVirtualRows renders M\'s wrappers over the real useVirtualizer', () => {
  const entries = Array.from({ length: 40 }, (_, index) => ({ type: 'row', command: { id: `c${index}` }, index }));
  entries.unshift({ type: 'header', label: 'Commands' });
  const rowKeys = entries.map(slash.slashEntryKey);
  const html = renderToStaticMarkup(React.createElement(slash.SlashVirtualRows, {
    entries, rowKeys, scrollEl: null, virtualizerRef: { current: null },
    renderEntry: (entry, key) => React.createElement('div', { key, 'data-row': key }),
  }));
  const total = 25 + 40 * 32;
  assert.match(html, new RegExp(`^<div style="height:${total}px"><div style="transform:translateY\\(0px\\)">`));
  // Windowed to the scroll element's viewport, which the server render has none of (no effect measured it yet).
  const rendered = [...html.matchAll(/data-index="(\d+)"/g)].map((m) => Number(m[1]));
  assert.ok(rendered.length < entries.length, `windowed: ${rendered.length}`);
  assert.equal(slash.slashEntryKey(entries[0], 0), 'h0');
  assert.equal(slash.slashEntryKey({ type: 'loading' }, 9), 'loading');
  assert.equal(slash.slashEntryKey({ type: 'row', command: { id: 'x', kind: 'skill' }, index: 3 }, 4), 'skill:x');
});
