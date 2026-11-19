import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsSearch, settingsMatchRange, normalizeSettingsQuery } from '../src/settings-model.mjs';
const sections=[{id:'code',label:'Code',icon:'Code'},{id:'general',label:'General'},{id:'plugins',label:'Plugins',customize:true,keywords:['marketplace','extensions']}];
const groups=[{tab:'code',rows:[{id:'size',label:'Transcript text size'},{id:'width',label:'Transcript width'},{id:'view',label:'Default transcript view'},{id:'font',label:'Transcript font'},{id:'codeFont',label:'Code font'}]},{tab:'general',rows:[{id:'size',label:'Transcript text size'}]}];
test('three visible children and more navigation retain section identity and accurate hidden count',()=>{
 const hits=settingsSearch(sections,groups,'transcript');assert.deepEqual(hits.map(hit=>hit.kind),['hit','child','child','child','more']);assert.equal(hits[0].label,'Code');assert.deepEqual(hits.filter(h=>h.kind==='child').map(h=>h.id),['size','width','font']);assert.equal(hits.at(-1).count,1);assert.equal(hits.at(-1).id,undefined);assert.equal(hits.at(-1).tab,'code');assert.equal(new Set(hits.map(h=>h.key)).size,hits.length);
});
test('single child presents destination and subtitle while multi-character section hit keeps children',()=>{
 const hits=settingsSearch(sections,groups,'code');assert.deepEqual(hits.map(h=>[h.kind,h.label]),[['hit','Code'],['child','Code font']]);
 const single=settingsSearch(sections,groups,'width');assert.equal(single.length,1);assert.equal(single[0].section,'Code');assert.equal(single[0].via,'Transcript width');assert.equal(single[0].id,'width');
 const short=settingsSearch(sections,groups,'t');// cc011544b Z:605–612 also permits keyword fallback for one-character queries.
 assert.equal(short.length,2);assert.equal(short[0].kind,'hit');assert.equal(short[0].id,'size');assert.equal(short[1].tab,'plugins');assert.equal(short[1].via,'marketplace');
});
test('keywords are fallback section navigation and no unsupported capabilities enter the index',()=>{
 assert.deepEqual(settingsSearch(sections,groups,'marketplace').map(h=>[h.tab,h.via,h.id]),[['plugins','marketplace',undefined]]);assert.deepEqual(settingsSearch(sections,groups,'billing'),[]);assert.equal(settingsSearch(sections,groups,' ').length,3);
});
test('normalization covers accents, curly quotes, word separators and compound query ranking',()=>{
 assert.equal(normalizeSettingsQuery('  Café—“A”_CODE-font\t ’B’ '),'cafe—"a" code font \'b\'');
 const g=[{tab:'code',rows:[{id:'a',label:'Code font'},{id:'b',label:'Font for Code'},{id:'c',label:'Decode Font'},{id:'d',label:'Café Mode'}]}];
 assert.equal(settingsSearch(sections,g,'cafe')[0].id,'d');assert.equal(settingsSearch(sections,g,'code_font').find(h=>h.id)?.id,'a');assert.deepEqual(settingsSearch(sections,g,'code font').filter(h=>h.id).map(h=>h.id),['a','b','c']);
});
test('ordinary sections deduplicate shared labels while Customize preserves distinct catalog entries',()=>{
 const s=[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C',customize:true}],g=s.map(t=>({tab:t.id,rows:[{id:'first',label:'Shared'},{id:'second',label:'Shared'}]}));
 assert.deepEqual(settingsSearch(s,g,'shared').map(h=>h.tab),['a','c']);
 const paths=[{tab:'c',rows:[{id:'first',label:'Shared',subpathId:'one'},{id:'second',label:'Shared',subpathId:'two'}]}];assert.equal(settingsSearch(s,paths,'shared').filter(h=>h.kind==='child').length,2);
});
test('matching does not search arbitrary descriptions or synthesize missing rows',()=>{
 assert.deepEqual(settingsSearch(sections,[{tab:'code',rows:[{id:'fast',label:'Fast mode',description:'needle',searchText:'needle'}]}],'needle'),[]);
});
test('literal first-match highlight preserves original Unicode and does not pretend normalized fuzzy matches are contiguous',()=>{
 assert.deepEqual(settingsMatchRange('Code code','CODE'),{start:0,end:4});assert.equal(settingsMatchRange('Code font','code_font'),null);assert.equal(settingsMatchRange('Café','cafe'),null);assert.equal(settingsMatchRange('Anything',''),null);
 assert.deepEqual(settingsMatchRange('İx😀 Code','code'),{start:5,end:9});assert.deepEqual(settingsMatchRange('İx','i'),{start:0,end:1});assert.deepEqual(settingsMatchRange('x😀y','😀'),{start:1,end:3});
});

// Fidelity F14: shared-22:2274-2285 / :3915-3918 zC — a navHidden section leaves the nav and the narrow tabs and stays a
// search destination. B23: 2.31226.0 shared-19 ZC (:2468-2482) lists Usage again (oC only swaps its icon), so no
// local section is nav-hidden.
test('nav-hidden sections leave the nav but stay searchable; Usage is listed',async()=>{
 const {settingsNavSections}=await import('../src/settings-shell-model.mjs');
 const shell=[{id:'preferences',label:'Preferences'},{id:'usage',label:'Usage',navHidden:true},{id:'code',label:'Code'}];
 assert.deepEqual(settingsNavSections(shell).map(s=>s.id),['preferences','code']);
 const plain=[{id:'a'},{id:'b'}];assert.equal(settingsNavSections(plain),plain);
 assert.deepEqual(settingsSearch(shell,[],'usage').map(hit=>[hit.kind,hit.tab]),[['hit','usage']]);
 const fs=await import('node:fs'),path=await import('node:path');
 const text=fs.readFileSync(path.resolve(import.meta.dirname,'../src/source-settings.jsx'),'utf8');
 assert.match(text,/\{id:'usage',label:'Usage',icon:'UsageGaugeMiddle',group:'Settings'\}/);
 assert.equal(/navHidden:true/.test(text),false);
 assert.match(text,/const baseNavTabs = settingsNavSections\(tabs\);/);
 // Harness is listed only on a core with harnessProfile (or while its page is open).
 // Hooks only on a core with hooksList (or while its page is open). Advanced › Core options only while it has rows.
 assert.match(text,/const navTabs=baseNavTabs\.filter\(section=>\(section\.id!=='harness'\|\|tab==='harness'\|\|coreSupports\(engine,'harnessProfile'\)\)&&\(section\.id!=='customize-hooks'\|\|tab==='customize-hooks'\|\|coreSupports\(engine,'hooksList'\)\)&&\(section\.id!=='advanced'\|\|tab==='advanced'\|\|advancedListed\)&&\(section\.id!=='cowork'\|\|boot\?\.coworkEnabled===true\)\);/); // w13-coworkui-settings: Cowork while Cowork is on
 // U-SET-LITE (U-SET-HANDWRITE): one hand-written nav at every width (no official rail, no stacked tabs). Its entries
 // (SETTINGS_NAV) keep only the host pages navTabs lists, and an entry left with no host page drops out, so a nav-hidden
 // host section stays out of the nav.
 assert.match(text,/\{id:'usage',label:'Usage',icon:'UsageGaugeMiddle',hosts:\['usage'\]\},/,'Usage is a nav entry');
 assert.match(text,/const hostAvailable=id=>navTabs\.some\(entry=>entry\.id===id\)&&/,'nav entries keep only the hosts navTabs lists');
 assert.match(text,/const navItems=SETTINGS_NAV\.map\(entry=>entry\.sep\?entry:\{\.\.\.entry,hosts:entry\.hosts\.filter\(hostAvailable\),advanced:\(entry\.advanced\|\|\[\]\)\.filter\(hostAvailable\)\}\)\s*\.filter\(entry=>entry\.sep\|\|entry\.hosts\.length\|\|entry\.advanced\.length\)/,'an entry with no host page left drops out');
 assert.match(text,/\{!usagePage&&<nav className="sl-nav" aria-label=\{t\('Settings'\)\}>\s*\{searchField\}\s*<div className="sl-nav-list scroll-fade-x scroll-fade-size-16">\{navItems\.map\(/,'the nav draws navItems');
 for(const gone of ['<SettingsNavStacked','<SettingsRailWithLocalGroups','<CdsTabs.'])assert.equal(text.includes(gone),false,gone);
 assert.match(text,/settingsSearch\(searchTabs,/,'search receives the unfiltered sections');
 assert.match(text,/const searchTabs=[^\n]*\?tabs:tabs\.map\(/,'every section, only the Models keywords narrowed per core');
 const main=fs.readFileSync(path.resolve(import.meta.dirname,'../src/main.jsx'),'utf8');
 const settingsItem=main.indexOf('data-testid="user-menu-settings"'),usageItem=main.indexOf('data-testid="user-menu-usage"');
 assert.ok(settingsItem>0&&usageItem>settingsItem&&main.slice(settingsItem,usageItem).split('<CdsDropdown.Item').length===2,'Usage follows Settings in the account menu');
 assert.match(main.slice(usageItem-80,usageItem+120),/icon="UsageGaugeMiddle" data-testid="user-menu-usage" onClick=\{\(\) => setSettings\("usage"\)\}>\{t\("Usage"\)\}</);
});
// Fidelity F14: c71860c77-B72Ova_w It — General lists version, Run on startup, Menu bar and Storage; keep-awake is a Code row only.
test("searching 'keep awake' finds a single Code section hit; General no longer repeats the keep-awake rows",async()=>{
 const sections=[{id:'code',label:'Code'},{id:'general',label:'General'}];
 const groups=[{tab:'code',title:'Sessions',rows:[{id:'keepAwake',label:'Keep computer awake while DeepSeek works'},{id:'keepAwakeOnBattery',label:'Keep awake on battery power'}]},
  {tab:'general',title:'System',rows:[{id:'version',label:'Desktop app version'},{id:'startup',label:'Run on startup'},{id:'menuBarEnabled',label:'Menu bar'},{id:'storage',label:'Storage'}]}];
 const hits=settingsSearch(sections,groups,'keep awake');
 assert.ok(hits.length>0);assert.deepEqual([...new Set(hits.map(hit=>hit.tab))],['code']);assert.equal(hits.filter(hit=>hit.kind==='hit').length,1);
 const fs=await import('node:fs'),path=await import('node:path');
 const text=fs.readFileSync(path.resolve(import.meta.dirname,'../src/source-settings.jsx'),'utf8');
 const general=text.slice(text.indexOf("{tab:'general',title:'System'"),text.indexOf("{tab:'developer',title:'Local MCP servers'"));
 assert.ok(general.length>0);assert.equal(general.includes('keepAwake'),false);assert.equal(general.includes('Loading version'),false);
 assert.match(general,/skeleton:desktop===null/);assert.match(general,/\.\.\.\(build\?\.version\?\[row\('version'/);
 assert.equal(text.split('...keepAwake').length,2,'the keep-awake rows render once, on the Code page');
});

// B23: shared-19 ZC/BC — General first, This computer › System (c71860c77-C_7Gqn1u Qn heads the page 'System'); ids stay.
test("the nav reads Appearance / Desktop app › System; 'System' has its own heading entry; 'preferences' and 'desktop' still find the pages",async()=>{
 const {settingsHeading}=await import('../src/settings-model.mjs');
 const {setLocale,DEFAULT_LOCALE,t}=await import('../electron/i18n/index.mjs');
 const fs=await import('node:fs'),path=await import('node:path');
 const text=fs.readFileSync(path.resolve(import.meta.dirname,'../src/source-settings.jsx'),'utf8');
 // U-SET-LITE (U-SET-HANDWRITE): the 'preferences' page (the official General) is titled Appearance and keeps
 // 'preferences' / 'general' as search keywords; 'general' stays the System page.
 assert.match(text,/\{id:'preferences',label:'Appearance',icon:'Palette',group:'Settings',keywords:\['preferences','general',/);
 assert.match(text,/\{id:'general',label:'System',icon:'Computer',group:'This computer',keywords:\['desktop','general'\]\}/);
 // The nav is the hand-written SETTINGS_NAV: the System page ('general') and Developer are the Desktop app entry's
 // pages, General ('preferences') opens the Appearance entry; the official rail's groups and the OpenClaude local
 // groups (settings-tab-compat LOCAL_EXTENSION_GROUPS, still the compat table's) are not drawn.
 const {LOCAL_EXTENSION_GROUPS}=await import('../src/settings-tab-compat.mjs');
 assert.deepEqual(LOCAL_EXTENSION_GROUPS.map(group=>group.title),['OpenClaude','OpenClaude · This computer','OpenClaude · Advanced']);
 assert.equal(text.includes('const navGroups'),false);
 assert.match(text,/\{id:'appearance',label:'Appearance',icon:'Palette',hosts:\['preferences','theme'\]\},/);
 assert.match(text,/\{id:'desktop',label:'Desktop app',icon:'Computer',hosts:\['general','developer'\],advanced:\['advanced','harness','profiles'\]\},\n\];/,'Desktop app last');
 assert.equal(/<nav className="sl-nav"[\s\S]*?<\/nav>/.exec(text)?.[0].includes('localGroups'),false,'no local groups in the nav');
 const shell=[{id:'preferences',label:'Appearance',keywords:['preferences','general']},{id:'general',label:'System',keywords:['desktop','general']},{id:'developer',label:'Developer',keywords:['desktop']}];
 assert.deepEqual(settingsSearch(shell,[],'preferences').map(hit=>hit.tab),['preferences']);
 assert.deepEqual(settingsSearch(shell,[],'desktop').map(hit=>hit.tab),['general','developer']);
 assert.equal(settingsSearch(shell,[],'system')[0].tab,'general');
 assert.equal(settingsHeading('System'),'System');
 try{
  setLocale('zh-CN');
  assert.equal(settingsHeading('System'),'系统','the page, not the theme choice');
  assert.equal(t('System'),'跟随系统','the theme choice keeps its own copy');
  assert.equal(settingsHeading('General'),t('General'),'no heading entry: the plain one');
  assert.equal(settingsSearch(shell,[],'系统')[0].tab,'general');
  assert.equal(settingsSearch(shell,[],'系统')[0].section,'系统');
 }finally{setLocale(DEFAULT_LOCALE);}
});

// menus C3 (3.6556.2 cc011544b dn(items, query, expanded)): an expanded section lists every matching row as a child and
// no "+N more"; the skills-visibility pass that dedupes Plugins still runs unexpanded. Customize lists keep the jump
// (shared-156 Dm).
test('menus C3: "+N more" opens in place for an expanded section; Customize lists still jump', async () => {
 const fs = await import('node:fs'), path = await import('node:path');
 const v3 = name => fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
 const official = v3('cc011544b-Bdta0Cl7.js');
 assert.ok(official.includes('let i=n?.has(e.section.id)?t.length:en;'), 'dn: an expanded section shows all its rows');
 assert.ok(official.includes('if(e.kind==="more"&&!Te.has(t.section.id)){'), 'I: expand unless the section jumps');
 assert.ok(v3('shared-156-BLTosN8U.js').includes('Dm=new Set(["customize-skills","customize-connectors","customize-plugins"])'));
 const open = settingsSearch(sections, groups, 'transcript', new Set(['code']));
 assert.deepEqual(open.map(hit => hit.kind), ['hit', 'child', 'child', 'child', 'child']);
 assert.deepEqual(open.filter(hit => hit.kind === 'child').map(hit => hit.id), ['size', 'width', 'font', 'view']);
 assert.deepEqual(settingsSearch(sections, groups, 'transcript', new Set(['general'])).map(hit => hit.kind), ['hit', 'child', 'child', 'child', 'more'], 'only the expanded section');
 const { SETTINGS_SEARCH_JUMP_SECTIONS, settingsSearchMoreExpands, expandSettingsSearch } = await import('../src/settings-catalog-search.mjs');
 assert.deepEqual([...SETTINGS_SEARCH_JUMP_SECTIONS], ['customize-skills', 'customize-connectors', 'customize-plugins']);
 const more = open.length && settingsSearch(sections, groups, 'transcript').at(-1);
 assert.equal(settingsSearchMoreExpands(more), true);
 assert.equal(settingsSearchMoreExpands({ ...more, tab: 'customize-plugins' }), false);
 assert.equal(settingsSearchMoreExpands({ ...more, kind: 'child' }), false);
 const state = expandSettingsSearch(expandSettingsSearch(undefined, more, 'one'), { ...more, tab: 'general' }, 'two');
 assert.deepEqual([...state.sections], ['code', 'general']);
 assert.equal(state.announcement, 'two');
});
