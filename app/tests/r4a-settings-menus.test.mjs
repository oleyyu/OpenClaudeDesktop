// R4a (A-settings-menus): locks the R3 "aligned-candidate" ledger items settings-02, settings-12, menus-04, menus-07,
// menus-08, menus-09, menus-12 and cov9-09 to the 2.42304.0 originals. Each test pins (a) the official gate / default /
// class strings by count in the installed reference, and (b) the local shape that matches the official default (gate
// off) path, through the local model functions where there is one, else the line of source that decides it.
// Nothing here renders through Vite: the decisive pieces are pure models or single source lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { appearancePreferences, appearanceDefaults } from '../electron/preferences.mjs';
import { pluginListView } from '../src/customize-list-model.mjs';
import { JUMP_COMMANDS, REGION_ORDER, regionJumpStop } from '../src/focus-region-model.mjs';
import { paletteActions, paletteActionGroups } from '../src/sidebar-palette-model.mjs';
import { createToastStore, toastDuration } from '../src/toast-store.mjs';
import desktop from '../electron/desktop-settings.cjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const official = name => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const officialMain = name => fs.readFileSync(path.join(reference, 'asar/.vite/build', name), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
// Whole-token occurrences (`onRowActions` does not count inside `CodeSessionRowActionsHost`).
const token = (text, word) => text.split(new RegExp(`(?<![A-Za-z0-9_$])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_$])`)).length - 1;
const once = (text, needles, label = '') => { for (const needle of needles) assert.equal(count(text, needle), 1, `${label} ${needle}`); };
// The minified chunks spell ’ as its backslash-u2019 escape.
const u = text => text.replaceAll('’', '\\u2019');
// The official function source from `start` up to (not including) `end`, for evaluation with stubs.
const slice = (text, start, end) => {
  const i = text.indexOf(start); assert.ok(i >= 0, start);
  const j = text.indexOf(end, i); assert.ok(j > i, end);
  return text.slice(i, j);
};
// `exported as local` appears in one of `text`'s import lists from `file` (no huge chunk in a failure message).
const imports = (text, binding, file) => {
  const lists = [...text.matchAll(/import\{([^}]*)\}from"\.\/([^"]+)"/g)].filter(match => match[2] === file).map(match => match[1].split(','));
  assert.ok(lists.some(list => list.includes(binding)), `${file}: ${binding}`);
};
// Every hand-written source file (src/**, generated/** excluded) and electron/*.
function handWritten() {
  const out = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'generated') walk(file); }
    else if (/\.(jsx?|mjs|cjs|css)$/.test(entry.name)) out.push([path.relative(app, file), fs.readFileSync(file, 'utf8')]);
  } };
  walk(path.join(app, 'src')); walk(path.join(app, 'electron'));
  // The absence checks below are only as good as this scan: it must see the real tree.
  assert.ok(out.length > 200, `scanned ${out.length} files`);
  for (const file of ['src/main.jsx', 'src/source-sidebar-palette.jsx', 'electron/desktop-settings.cjs']) assert.ok(out.some(([name]) => name === file), file);
  return out;
}

// ---------------------------------------------------------------------------------------------------- settings-02
test('settings-02 Interface font stays on the Code page: official __gb__1197194941 off branch, local Code › Appearance row', () => {
  // (a) cd19fedd2 p/m: the GrowthBook gate (shared-25 hc: growthbook feature .on), exported as p.
  const gate = official('cd19fedd2-7Tk-qNbq.js');
  once(gate, ['var p="__gb__1197194941";function m(){return n(p)}', 'import{Ah as n}from"./shared-25-DP8p7i1Z.js"', 'm as p',
    // interfaceFont: segmented Anthropic Sans / System / OpenDyslexic, default anthropic, searched on the Code page.
    'interfaceFont:v({id:"interface-font",group:"appearance",label:s({defaultMessage:"Interface font",id:"ZHco1GSUHH"})',
    'control:{kind:"segmented",options:Object.keys(E).map(e=>({value:e,label:E[e]}))},scope:"device",default:"anthropic",storage:{kind:"localStore",store:"desktopFrame",field:"interfaceFont"},platform:"any",search:{interfaceFontRow:"claude-code"}}',
    'var E={anthropic:s({defaultMessage:"Anthropic Sans",id:"4EAtPWhM42"}),system:s({defaultMessage:"System",id:"+CwN9C/QFk"}),dyslexic:s({defaultMessage:"OpenDyslexic",id:"+NtGuRTRpM"})}'], 'cd19fedd2');
  assert.equal(count(official('shared-25-DP8p7i1Z.js'), 'function hc(e){return vc(g(Vr),e).on}'), 1);
  // General (c0db37792 It): the row only while the gate is on.
  once(official('c0db37792-DVCwJ8b1.js'), ['import{d as ut,f as dt,h as ft,n as pt,p as mt}from"./cd19fedd2-7Tk-qNbq.js"',
    'function It({showChatFont:e}){let t=mt();return a(r,{children:[t&&o(Nt,{}),e&&o(R,{})]})}'], 'c0db37792');
  // Code › Appearance (c71860c77 Xn): g = !gate, so with the gate off the row is here, described with Font licenses (jn).
  once(official('c71860c77-Bl2Tfe3A.js'), ['import{d as Dn,f as On,p as kn,t as Z,u as An}from"./cd19fedd2-7Tk-qNbq.js"',
    'import{t as jn}from"./cea462098-DNETSqGi.js"', 'let n=On(),i=Dn(),a=kn(),s=Un(Xe(),Je(e=>e.setInterfaceFont))',
    'g=t!=="view"&&!a,_=t!=="view"&&!n,v=t!=="view"&&!i;', 'g&&o(Q,{def:Z.interfaceFont,binding:s,description:o(jn,{})})'], 'c71860c77');
  // Search (ca25db325): the General entry is dropped and the Code one kept while interfaceFontInGeneral (pe = gate) is false.
  once(official('ca25db325-DHGSBV5p.js'), ['M=de(),N=pe()', 'interfaceFontInGeneral:N',
    'e.interfaceFontRow==="general"&&t.interfaceFontInGeneral===!1||e.interfaceFontRow==="claude-code"&&t.interfaceFontInGeneral===!0'], 'ca25db325');
  // Font licenses (cea462098): only a text/plain response is shown.
  once(official('cea462098-DNETSqGi.js'), ['function f(){return r(o,{defaultMessage:"Font licenses",id:"qnhEQK6Ni0"})}',
    'e.ok&&e.headers.get("content-type")?.startsWith("text/plain")?e.text():null'], 'cea462098');

  // (b) local default and choices = official default:"anthropic" over E's keys.
  assert.equal(appearanceDefaults.interfaceFont, 'anthropic');
  assert.equal(appearancePreferences({}).interfaceFont, 'anthropic');
  for (const value of ['anthropic', 'system', 'dyslexic']) assert.equal(appearancePreferences({ interfaceFont: value }).interfaceFont, value);
  assert.equal(appearancePreferences({ interfaceFont: 'serif' }).interfaceFont, 'anthropic');
  // The only Interface font row is the first row of Code › Appearance; General › Appearance has Theme, Motion, Language.
  const settings = local('src/source-settings.jsx');
  const group = head => { const i = settings.indexOf(head); assert.ok(i >= 0, head); return settings.slice(i, settings.indexOf('\n    ]},', i)); };
  const rowIds = text => [...text.matchAll(/(?:row|booleanRow|levelRow)\('([A-Za-z]+)'/g)].map(match => match[1]);
  const code = group("{tab:'code',title:'Appearance',rows:[");
  assert.deepEqual(rowIds(code), ['interfaceFont', 'transcriptSize', 'transcriptWidth', 'transcriptView']);
  assert.ok(code.includes("row('interfaceFont',t('Interface font'),<>{t('Font for the whole interface — menus, sidebars, and panels.')} <FontLicenses/></>,segments('interfaceFont',t('Interface font'),[{value:'anthropic',label:'Anthropic Sans'},{value:'system',label:t('System')},{value:'dyslexic',label:'OpenDyslexic'}])"));
  assert.deepEqual(rowIds(group("{tab:'preferences',title:'Appearance',rows:[")), ['theme', 'motion', 'locale']);
  assert.equal(count(settings, "row('interfaceFont'"), 1);
  assert.equal(count(settings, "r.ok&&r.headers.get('content-type')?.startsWith('text/plain')?r.text():null"), 1, 'local Font licenses keeps the text/plain check');
  // The custom theme page points at the Code page row, not General.
  assert.equal(count(local('src/source-settings-theme.jsx'), "openButton(t('Interface font settings'), 'code', 'interfaceFont')"), 1);
});

// ---------------------------------------------------------------------------------------------------- settings-12
test('settings-12 unified plugins UI is behind __gb__1022745313 && __gb__2406162393; local keeps the classic field + Your plugins tab', () => {
  // (a) shared-52 gk = Sa() && ae(hk), both GrowthBook (shared-25 hc), exported Go.
  once(official('shared-52-DGviI8xb.js'), ['ba="__gb__1022745313"', 'function Sa(){return ae(ba)}',
    'hk="__gb__2406162393";function gk(){let e=Sa(),t=ae(hk);return e&&t}', 'gk as Go'], 'shared-52');
  const customize = official('c6a2a31c4-C7GCkmEa.js');
  once(customize, [
    // Search: without the unified UI the page search is a plain "field"; tokens are enabled only for the other modes.
    'function sd({unifiedPluginsUi:e,unifiedSearch:t,ownsAddress:n,pageLayout:r,headerHasSearch:i,headerWide:a}){return e!==!0||t!==!0||n!==!0||r!==!0?"field":i===!0&&a===!0?"box_with_tokens":"field_with_tokens_not_drawn"}',
    '{tokens:Ve,setTokens:He}=Fr({enabled:Be!=="field"',
    'function ad({unifiedPluginsUi:e,tab:t,viewIsList:n,viewHasPageWords:r,homeAvailable:i}){return e===!0&&t==="shared"&&n===!0&&r===!1&&i===!0}',
    'function od({unifiedPluginsUi:e,from:t,to:n}){return e===!0&&t!==n}',
    // "Your plugins" first rows are drawn only from yoursOn, which defaults to false.
    'yoursOn:O=!1', 'title:i.formatMessage({defaultMessage:"Your plugins",id:"1onhc0sgyt"}),onSeeAll:e.kind==="rows"?n:void 0,testId:"customize-yours-first-rows"',
    // The classic tabbed list keeps its "Your plugins" tab.
    'plugins-tabbed-list-tab-mine'], 'c6a2a31c4');
  imports(customize, 'Go as ot', 'shared-52-DGviI8xb.js');
  // yoursOn comes from the shared-5 context (default false) that cc011544b fills from Go().
  once(official('c76f00e40-CN9FziLk.js'), ['import{Oo as qe,hs as Je,xo as Ye}from"./shared-5-kdJVRUsT.js"', 'f=qe()', 'yoursOn:f===!0'], 'c76f00e40');
  once(official('shared-5-kdJVRUsT.js'), ['var og=F(!1),sg=og.Provider;function cg(){return P(og)}', 'cg as Oo', 'sg as Do'], 'shared-5');
  once(official('cc011544b-CdJ9nOvX.js'), ['import{Go as re,S as U,f as W,s_ as G,sv as ie}from"./shared-52-DGviI8xb.js"',
    'function Tt({section:e,chrome:t,frame:n,children:r}){let i=re(),a=L();return o(wt,{section:e,mergedPage:a,chrome:t,children:o(pe,{value:e!==null&&P({mergedPage:a,unifiedPluginsUi:i})'], 'cc011544b');

  // (b) local: the search text and the Show filter are separate inputs ("field"), never tokens parsed from the query.
  const plugin = (id, extra = {}) => ({ id, pluginName: id, name: id, description: '', author: '', enabled: true, marketplaceName: 'Market', marketplaceId: 'market', skillCount: 0, updatedAt: null, ...extra });
  const rows = [plugin('alpha', { name: 'Alpha' }), plugin('beta', { name: 'Beta', enabled: false, description: 'Beta tools' })];
  assert.equal(pluginListView({ rows, query: 'alp' }).matched, 1);
  assert.equal(pluginListView({ rows, query: 'tools' }).matched, 1, 'the description is searched as text');
  assert.equal(pluginListView({ rows, query: 'enabled' }).matched, 0, 'a filter word in the field is only text');
  assert.equal(pluginListView({ rows, query: 'is:enabled' }).matched, 0);
  assert.equal(pluginListView({ rows, show: 'enabled' }).matched, 1, 'state is the Show filter');
  assert.equal(pluginListView({ rows, show: 'disabled', query: 'beta' }).matched, 1);
  // The page search is one <input type="search"> in a role="search" field; the plugins page is the classic tabbed list.
  const page = local('src/source-customize.jsx');
  assert.equal(count(page, '<input ref={input} type="search" autoFocus autoComplete="off" aria-label={label} placeholder={label} value={value}'), 1);
  assert.equal(count(page, '<div className="cz-search" data-cds="TextInput" data-clearable={value !== "" || undefined} role="search"'), 1);
  assert.equal(count(page, 'const toolbar = <ListToolbar label={t("Plugins")} tab={t("Your plugins")} tabTestId="plugins-tabbed-list-tab-mine"'), 1);
  for (const [file, text] of handWritten())
    for (const word of ['customize-yours-first-rows', 'box_with_tokens', 'field_with_tokens_not_drawn', '__gb__2406162393'])
      assert.equal(token(text, word), 0, `${file} ${word}`);
});

// ------------------------------------------------------------------------------------------------------- menus-04
test('menus-04 fizzy-lake parts: the generated 2.42304.0 allowlist is empty, so panels never turn on', () => {
  // (a) shared-4: Cf=[] and Ef=Cf, so wf() keeps none of the root attribute's parts.
  const gate = official('shared-4-CJsHhp5n.js');
  const lines = ['function wf(e,t){let n=new Set(e?.split(" "));return t.filter(e=>n.has(e)).sort()}',
    'function Of(){return Df??={parts:typeof document>"u"?[]:wf(document.documentElement.getAttribute(Sf),Ef)},Df}',
    'function kf(e){return Of().parts.includes(e)}', 'var Af={panels:Ad};', 'function jf(e){return kf(e)&&(Af[e]?.()??!0)}'];
  once(gate, ['xf="spa:fizzy-lake",Sf="data-cds-fizzy-lake",Cf=[];', 'var Ef=Cf,Df;', 'jf as co', ...lines], 'shared-4');
  // c518a31cc: the Keyboard shortcuts region scrolls (flex-1 overflow-y-auto) unless a fizzy ancestor flips it.
  once(official('c518a31cc-CSChENN1.js'), ['className:"-mx-pad-xl -mb-pad-xl min-h-0 flex-1 overflow-y-auto rounded-b-[inherit] px-xl pb-xl in-data-cds-fizzy:flex-none in-data-cds-fizzy:overflow-visible',
    'className:o("font-base mt-5 py-2",e&&"in-data-cds-fizzy:mt-0 in-data-cds-fizzy:pt-0")'], 'c518a31cc');

  // (b) the local gate is the generated module, line for line, and evaluates closed even when the root asks for parts.
  const generatedFile = 'src/generated/view-tabs/shared-4-CJsHhp5n.js';
  const generated = local(generatedFile);
  for (const line of [...lines, 'var Sf="data-cds-fizzy-lake";', 'var Cf=[];', 'var Ef=Cf;']) assert.equal(count(generated, line), 1, line);
  // R4i-graph GR1 (D46) added the semantic name isCaiCuriousTowerEnabled for Ad (tests/view-tabs-d46-names.test.mjs); the gate is unchanged.
  assert.equal(count(generated, 'export {jf,kf,Of,wf,Sf,Ef,Cf,Df,Af,Ad,Od,Dd,mt,jf as isFizzyLakePartEnabled,Ad as isCaiCuriousTowerEnabled};'), 1);
  const body = generated.split('\n').filter(line => !/^(import|export|\/\/)/.test(line.trim())).join('\n');
  const evaluate = attribute => vm.runInNewContext(`${body}\n;({jf,kf,Of,wf,Ef})`, {
    mt: { getItem: () => '1' }, // spa:cai_curious_tower on: Af.panels would allow it, the allowlist still does not
    document: { documentElement: { getAttribute: name => (name === 'data-cds-fizzy-lake' ? attribute : null) } } });
  const on = evaluate('panels color');
  assert.deepEqual([...on.Ef], []);
  assert.deepEqual([...on.Of().parts], []);
  assert.equal(on.jf('panels'), false);
  assert.equal(on.kf('color'), false);
  assert.deepEqual([...on.wf('panels color', ['panels'])], ['panels'], 'only the empty allowlist keeps it closed');
  // Consumers read the generated gate: the file tree's icon stays "xs" and the view tabs import it.
  const tree = local('src/generated/code-current/file-tree-style.mjs');
  assert.equal(count(tree, 'import { isFizzyLakePartEnabled as p } from "../view-tabs/shared-4-CJsHhp5n.js";'), 1);
  assert.equal(count(tree, 'return p("panels") ? "sm" : "xs";'), 1);
  assert.equal(count(local('src/generated/view-tabs/cfe7c4b3b-CP-IQXj8.js'), 'import {jf as ne} from "./shared-4-CJsHhp5n.js";'), 1);
  // Hand-written shapes are the non-fizzy branch: the shortcuts region scrolls, every section keeps mt-5 py-2, and
  // nothing local sets the root parts attribute.
  const css = local('src/source-session-actions.css');
  const region = /\.shortcuts-region\{([^}]*)\}/.exec(css)[1];
  assert.match(region, /^flex:1;min-height:0;overflow-y:auto;/);
  assert.doesNotMatch(region, /flex:none|overflow:visible/);
  assert.match(/\.shortcuts-section\{([^}]*)\}/.exec(css)[1], /^margin-top:20px;padding:8px 0;/);
  assert.doesNotMatch(css, /\.shortcuts-section:first-child/);
  for (const [file, text] of handWritten()) assert.equal(count(text, 'data-cds-fizzy-lake'), 0, file);
  assert.equal(count(local('index.html'), 'fizzy'), 0);
});

// ------------------------------------------------------------------------------------------------------- menus-07
test('menus-07 "Jump to question" pinned row: needs the region-navigation gate and a question stop; local lists neither', () => {
  // (a) c2771e1f6 Dd pins the jump row only when Ln (an available jump_to_question) is not null.
  const palette = official('c2771e1f6-Da07A5r-.js');
  const dd = 'var Ed="jump";function Dd(e,t){return t===null?e:[{id:Ed,items:[t]},...e]}';
  once(palette, [dd, 'im="jump_to_question"',
    'Fn=Nn.find(e=>e.key===im&&e.isAvailable),[Ln]=i(()=>Fn&&!Ni()?{type:"action",id:Fn.key,data:Fn}:null)',
    'return Cd(Array.from({length:n+1},(t,r)=>Dd(Td(e,jn,n-r,mn),Ln)))};if(B&&Ne&&It){', 'return r&&i?[i,n,...a]:U&&!r?o():[n,...gn]'], 'c2771e1f6');
  const Dd = vm.runInNewContext(`${dd};Dd`);
  const list = [{ id: 'quick', items: [1] }];
  assert.equal(Dd(list, null), list, 'no available command: the list is returned untouched');
  assert.deepEqual(JSON.parse(JSON.stringify(Dd(list, 'row'))), [{ id: 'jump', items: ['row'] }, ...list]); // vm realm → plain JSON
  // jump_to_question is registered only inside FocusRegionNavigationOn (ca1d33d05), which shared-20 mounts behind
  // GrowthBook __gb__1686253244 (shared-25 Zs), and is disabled unless a "question" region has a stop.
  once(official('shared-20-B7UqYfsi.js'), ['function Pv(){let e=R("__gb__1686253244");return pc(Mv.handle,e),e?f(Nv,{}):null}', 'pick:e=>e.FocusRegionNavigationOn'], 'shared-20');
  once(official('ca1d33d05-BYDNb5Fu.js'), ['jump_to_question:Z("question")', 'd=e=>({disabled:!u.has(e)})',
    'f("jump_to_question",Q.jump_to_question.execute,d("jump_to_question"))'], 'ca1d33d05');

  // (b) local: no jump_to_question command and no question stop, so the pinned row never exists.
  assert.deepEqual(JUMP_COMMANDS.map(command => command.id),
    ['jump_to_navigation', 'jump_to_main_content', 'jump_to_input', 'jump_to_preview', 'jump_to_terminal', 'jump_to_pane']);
  assert.equal(JUMP_COMMANDS.some(command => command.regions.includes('question')), false);
  assert.ok(REGION_ORDER.includes('question'), 'the model knows the region; nothing declares a stop for it');
  assert.equal(regionJumpStop([{ id: 'c', region: 'composer' }, { id: 'n', region: 'navigation' }], 'question'), null);
  const actions = paletteActions({ jumps: JUMP_COMMANDS, onJump() {} });
  assert.deepEqual(actions.filter(action => action.id.startsWith('jump_to_')).map(action => action.id), JUMP_COMMANDS.map(command => command.id));
  assert.equal(actions.some(action => action.id === 'jump_to_question' || action.group === 'jump'), false);
  assert.equal(paletteActionGroups(actions).some(group => group.id === 'jump' || group.id === 'actions:jump'), false);
  // The default list (empty field) starts with Quick actions, then Recents: Dd(e, null).
  assert.equal(count(local('src/source-sidebar-palette.jsx'), 'if (!term) return [quick, { id: "recents", title: t("Recents"), toSearch: true,'), 1);
  const regions = [];
  for (const [, text] of handWritten())
    for (const match of text.matchAll(/data-focus-region=(?:"([^"]*)"|\{([^}]*)\})/g)) regions.push(match[1] ?? match[2]);
  assert.ok(regions.length >= 8, 'the scan sees the local stops');
  assert.equal(regions.some(value => value.includes('question')), false, regions.join(' | '));
});

// ------------------------------------------------------------------------------------------------------- menus-08
test('menus-08 palette row-actions card is behind __gb__1669033294; local rows have only their own action', () => {
  // (a) shared-18 SF = U("__gb__1669033294") (shared-25 Zs), imported by the palette as Wr; every card path needs B.
  once(official('shared-18-D4XxL6Tg.js'), ['var xF="__gb__1669033294";function SF(){return U(xF)}', 'SF as wi',
    u('archive:{defaultMessage:"Couldn’t archive this task. Try again.",id:"5+R6YGzDWC"}'),
    u('unarchive:{defaultMessage:"Couldn’t unarchive this task. Try again.",id:"72Va6SKRXY"}'),
    u('rename:{defaultMessage:"Couldn’t rename this task. Try again.",id:"7ck8ciIf0O"}'),
    u('failed:{defaultMessage:"Couldn’t delete this task. Try again.",id:"yS2tQecr6x"}')], 'shared-18');
  imports(official('shared-18-D4XxL6Tg.js'), 'Th as U', 'shared-25-DP8p7i1Z.js');
  assert.equal(count(official('shared-25-DP8p7i1Z.js'), 'function Zs(e){return Rs(I(e)).on}'), 1);
  const palette = official('c2771e1f6-Da07A5r-.js');
  imports(palette, 'wi as Wr', 'shared-18-D4XxL6Tg.js');
  once(palette, ['[B]=i(Wr());', 'Mi=y(e=>B&&!ur&&!Q&&hf(e)&&!ki&&gf(e,$r),[B,ur,Q,ki,$r])', 'zi=y(e=>B&&!ki&&gf(e,$r),[B,ki,$r])',
    'vi=B&&!Q,', '!e.repeat&&Ri&&Oi!==void 0&&Bi(Oi,yi,"keyboard")', 'Gi=Qf(B&&!Se?ei:void 0)',
    'rowActionsSlot:B,rowActionsRoom:zi(e),onRowActions:Mi(e)?Vi:void 0', 'id:"command_palette_row_actions"'], 'c2771e1f6');
  // c09d7445a: the card (thumbnail header padding, inline-end side) is unchanged.
  once(official('c09d7445a-BRSx6XSY.js'), ['"data-testid":"palette-row-actions"', 'side:re("inline-end",x)',
    'className:`${z.bleedX} ${z.bleedTop} px-1.5 pt-1.5 pb-1`', 'export{vt as PaletteChatDialogs,_t as PaletteRowActionsCard}'], 'c09d7445a');

  // (b) local = B false: a session row is one option that opens the session; no row-actions trigger, card or thumb.
  const source = local('src/source-sidebar-palette.jsx');
  assert.equal(count(source, 'const sessionItem = (session) => ({ kind: "session", id: `session:${session.id}`, session, run: () => onOpenSession?.(session.id) });'), 1);
  assert.equal(count(source, 'onMouseDown: (event) => event.preventDefault(), onMouseMove: () => { if (!isSelected) setSelected(index); }, onClick: () => activate(item) };'), 1);
  const keys = source.slice(source.indexOf('const onKeyDown = (event) => {'), source.indexOf('const renderItem ='));
  assert.deepEqual([...new Set([...keys.matchAll(/event\.key === "([A-Za-z]+)"/g)].map(match => match[1]))].sort(),
    ['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Enter', 'Escape', 'Tab']);
  assert.ok(keys.includes('if (mode === "search" && query === "" && (event.key === "ArrowLeft" || event.key === "ArrowRight")'), 'arrows only step the search type tabs');
  for (const [file, text] of handWritten())
    for (const word of ['palette-row-actions', 'PaletteRowActions', 'onRowActions', 'rowActionsSlot', '__gb__1669033294'])
      assert.equal(token(text, word), 0, `${file} ${word}`);
});

// ------------------------------------------------------------------------------------------------------- menus-09
test('menus-09 sticky toasts need __gb__1069680821 and snazzy-globe=false; local is the default 6500/10000 auto-dismiss', () => {
  // (a) shared-23 lW / _W / rW and the shared-19 toast timeouts.
  const toasts = official('shared-23-Bu_lvvVo.js');
  once(toasts, ['var sW="persisted.snazzy-globe",cW="__gb__1069680821";', 'let[,,r,i]=lW(),a=!r&&!t',
    'function rW({children:e,viewportClassName:t,quiet:n=!1,sticky:r=!1}){return p(_u,{timeout:KU,autoDismiss:!r,', 'var KU=6500,'], 'shared-23');
  imports(toasts, 'Nh as Qe', 'shared-25-DP8p7i1Z.js');
  const shared25 = official('shared-25-DP8p7i1Z.js');
  const ec = 'function ec(e,t){let n=ks();return!t||!n?.growthbook?!1:As(n,I(e)).on}';
  once(shared25, [ec, 'ec as Nh'], 'shared-25');
  // Evaluate lW over its own gate helper: the preference defaults to true, so the gate is never asked and the
  // third value (auto-dismiss) is true; only preference false + gate on makes it sticky.
  const lWText = slice(toasts, 'function lW(){', 'var uW=');
  const lW = (pref, gbOn) => {
    const Qe = vm.runInNewContext(`${ec};ec`, { ks: () => ({ growthbook: {} }), As: () => ({ on: gbOn }), I: key => key });
    return vm.runInNewContext(`${lWText};lW()`, { sW: 'persisted.snazzy-globe', cW: '__gb__1069680821', Qe,
      en: (_key, fallback) => [pref === undefined ? fallback : pref, () => {}], f: value => [value, () => {}], D: () => {}, k: fn => fn, Date, setTimeout, clearTimeout });
  };
  for (const gbOn of [false, true]) assert.equal(lW(undefined, gbOn)[2], true, `default preference, gate ${gbOn}`);
  assert.equal(lW(false, false)[2], true);
  assert.equal(lW(false, true)[2], false, 'sticky only with the gate and the preference off');
  // shared-19 AU: undefined keeps the provider default, <=0 and non-finite never expire, under 6 s becomes 6 s;
  // shared-52 oj: a non-info toast with a plain-text message lasts 10 s.
  once(official('shared-19-CkPOiIKm.js'), ['OU=6e3,kU=1e3;function AU(e){return e===void 0||e<=0?e:Number.isFinite(e)?e<6e3?OU:e:0}'], 'shared-19');
  once(official('shared-52-DGviI8xb.js'), ['var ej=1e4,', 'if(e.toastType!=="info")return aj(e.message)?ej:1/0}'], 'shared-52');

  // (b) local toastDuration is that default path, and the store has no sticky mode.
  assert.equal(toastDuration(), 6500);
  assert.equal(toastDuration('neutral'), 6500);
  assert.equal(toastDuration('warning'), 10000);
  assert.equal(toastDuration('danger'), 10000);
  assert.equal(toastDuration('neutral', 300), 6000);
  assert.equal(toastDuration('neutral', 12000), 12000);
  assert.equal(toastDuration('neutral', 0), 0);
  assert.equal(toastDuration('neutral', -1), 0);
  assert.equal(toastDuration('neutral', Infinity), 0);
  let now = 0, id = 0;
  const timers = new Map();
  const store = createToastStore({ now: () => now, schedule: (fn, delay) => { timers.set(++id, { at: now + delay, fn }); return id; }, cancel: key => timers.delete(key) });
  const tick = ms => { const end = now + ms; for (;;) { const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); } now = end; };
  const toast = store.add('Copied', { sticky: true }); store.settle(toast);
  tick(6499); assert.equal(store.getSnapshot()[0].phase, 'open');
  tick(1); assert.equal(store.getSnapshot()[0].phase, 'ending', 'a sticky option is not honoured: the toast auto-dismisses at 6500');
  store.dispose();
  for (const [file, text] of handWritten())
    for (const word of ['snazzy-globe', '__gb__1069680821']) assert.equal(token(text, word), 0, `${file} ${word}`);
  assert.equal(count(local('src/toast-store.mjs'), 'sticky'), 0);
});

// ------------------------------------------------------------------------------------------------------- menus-12
test('menus-12 a child turn reports "turn_complete" only behind GrowthBook 2371478310 for machine turns; local classifies every turn alike', () => {
  // (a) muI2IV6k uma and the idle banner; CFJssAFf turnEndReportsToParent needs t.iE() = hy("2371478310") and kz's
  // turnInput.person === false (a turn no person started).
  const main = officialMain('index.chunk-muI2IV6k.js');
  once(main, ['l=o.error===void 0?uma(c,e.emitsPostTurnSummary(t)||e.turnEndReportsToParent(t)):"needs_input"',
    'var q_r=()=>hy("2371478310")', 'Object.defineProperty(exports,"iE",{enumerable:!0,get:function(){return q_r}})',
    'let t=e.kind??"needs_input"', 'g=e.body??(t==="turn_complete"?"Claude finished a task":"Claude is waiting for your input"),_=t==="turn_complete"||qwr()',
    'function qwr(){return Bv("notificationSound")==="none"}', 'urgency:t==="turn_complete"?"low":"normal"'], 'muI2IV6k');
  const sessions = officialMain('index.chunk-CFJssAFf.js');
  once(sessions, ['t=require("./index.chunk-muI2IV6k.js")',
    'turnEndReportsToParent(e){let n=this.sessions.get(e),r=this.sessions.get(n?.spawnedFrom?.sessionId??"");if(!n||!r||!t.iE())return!1;',
    'function kz(e,t){return t!==void 0&&n.wo(e,t.sessionId)&&e.turnInput?.person===!1&&', 'function Az(e,t,n){return t!==void 0&&!e.isRunning&&kz(e,t)&&',
    'emitsPostTurnSummary(e){return this.held(e)?.postTurnSummarySeen===!0}'], 'CFJssAFf');
  const uma = vm.runInNewContext(`${slice(main, 'function uma(', 'function dma(')};uma`);
  assert.equal(uma(undefined), 'needs_input');
  assert.equal(uma(undefined, false), 'needs_input', 'no summary and no report to the parent');
  assert.equal(uma(undefined, true), 'turn_complete');
  for (const category of ['blocked', 'need_input', 'failed']) assert.equal(uma({ status_category: category }, true), 'needs_input', category);
  assert.equal(uma({ status_category: 'done' }, false), 'turn_complete');

  // (b) local: the btw child (spawnedFrom, user driven) and a plain session end their turns with the same banner, and
  // it is silent only when the sound is None (needs_input's rule; turn_complete would always be silent).
  const { createDesktopSettings } = desktop;
  const run = sound => {
    const notices = [];
    class Notice extends EventEmitter { static isSupported() { return true; } constructor(options) { super(); notices.push(options); } show() {} close() {} }
    const config = { threadIds: ['plain', 'child'], archivedThreadIds: [], keepAwake: false, completeNotifications: 'banner', notificationSound: sound,
      threadMetadata: { plain: { name: 'Parent' }, child: { name: 'Side chat' } },
      sessionMetadata: { child: { forkedFrom: 'plain', spawnedFrom: { sessionId: 'plain', sideSession: true, userFork: true, btw: true } } } };
    const service = createDesktopSettings({ app: { dock: { setBadge() {}, bounce() {} } }, powerMonitor: Object.assign(new EventEmitter(), { isOnBatteryPower: () => false }),
      powerSaveBlocker: { start: () => 1, stop() {} }, Notification: Notice, getConfig: () => config, getClient: () => ({ request: async () => ({}) }),
      sessionOperations: {}, save() {}, emit() {}, getWindow: () => Object.assign(new EventEmitter(), { isFocused: () => false }),
      isViewingSession: () => false, isAppFocused: () => false });
    for (const threadId of ['child', 'plain']) {
      service.observe({ method: 'turn/started', params: { threadId, turn: { id: `${threadId}-1` } } });
      service.observe({ method: 'turn/completed', params: { threadId, turn: { id: `${threadId}-1`, status: 'completed' } } });
    }
    service.dispose();
    return notices;
  };
  const [child, plain] = run('system');
  assert.deepEqual([child.title, plain.title], ['Side chat', 'Parent']);
  assert.equal(child.body, plain.body, 'one classification for every turn end');
  assert.deepEqual([child.silent, plain.silent], [false, false]);
  assert.deepEqual(run('none').map(notice => notice.silent), [true, true]);
  // The only local lineage writers: btw (user driven) and the plain fork (/subtask too) with forkedFrom only; nothing
  // reports a turn to its parent.
  assert.equal(count(local('electron/btw-sessions.cjs'), 'spawnedFrom: { sessionId: parentId, sideSession: true, userFork: true, btw: true,'), 1);
  for (const [file, text] of handWritten())
    for (const word of ['turnEndReportsToParent', 'emitsPostTurnSummary', 'turn_complete']) assert.equal(token(text, word), 0, `${file} ${word}`);
  // The same GrowthBook gate (2371478310, appFeatures.sideSessions) is held closed locally: /subtask stays out of the list.
  const shell = local('src/main.jsx');
  assert.equal(count(shell, '(main process GrowthBook 2371478310, "Ant only" badge), which the host has no source for, so the row stays out.\n    subtaskCommand: false };'), 1);
});

// ------------------------------------------------------------------------------------------------------- cov9-09
test('cov9-09 preview URL bar: no pill variant; the 2.42304.0 addition is fizzy panels only; local is the Page URL field', () => {
  // (a) cf580efe9 ba: no pill / rounded-full, the base class string, and the panels-only tweak via shared-4 jf (co).
  const pane = official('cf580efe9-b-DCvKJg.js');
  for (const word of ['pill', 'rounded-full']) assert.equal(count(pane, word), 0, word);
  once(pane, ['N="flex items-center min-w-0 h-[calc(1.5rem*var(--cds-rem-scale,1))] text-body rounded-[5px] px-sm me-[calc(1.5rem*var(--cds-rem-scale,1))]",ne;',
    '_e("panels")&&u(Qe)===!0&&(N=G(N,"h-control rounded"),ne="self-stretch")',
    // The Page URL field (cf550b864 Nn) the pane renders for navigation.
    'address:_.formatMessage({defaultMessage:"Page URL",id:"03Mg3GL80C"})', 'placeholder:_.formatMessage({defaultMessage:"Type a URL",id:"OeLR8n4Oc4"})'], 'cf580efe9');
  imports(pane, 'co as _e', 'shared-4-CJsHhp5n.js');
  assert.equal(count(official('shared-4-CJsHhp5n.js'), 'jf as co'), 1);
  const fieldClass = 'flex h-control min-w-0 items-center gap-[4px] rounded bg-fill-field px-xs text-heading shadow-field-ring transition-shadow duration-150 ease-out [&:hover:not(:has(input:focus))]:shadow-field-hover has-[input:focus]:shadow-focus ${';
  const field = official('cf550b864-DG_op2XB.js');
  assert.equal(count(field, fieldClass), 1);
  for (const word of ['pill', 'rounded-full']) assert.equal(count(field, word), 0, word);

  // (b) local: the generated Page URL field with the same class string, no pill, labelled as the original.
  const generated = local('src/generated/code-editor/preview-address-field.mjs');
  assert.equal(count(generated, fieldClass), 1);
  for (const word of ['pill', 'rounded-full', 'rounded-[5px] px-sm']) assert.equal(count(generated, word), 0, word);
  const address = local('src/source-preview-address.jsx');
  assert.equal(count(address, 'rounded-full'), 0);
  // R4h-intl I1 passes every label of the field through t() (the generated default table is English).
  for (const label of ["address: t('Page URL'),", "reload: t('Reload'),", "openExternal: t('Open in default browser'),", "loading: t('Loading page'),", "}} placeholder={t('Type a URL')} onNavigate={onNavigate}"]) assert.equal(count(address, label), 1, label);
  assert.equal(count(address, "import { createPreviewAddressField, displayPreviewURL } from './generated/code-editor/preview-address-field.mjs';"), 1);
});
