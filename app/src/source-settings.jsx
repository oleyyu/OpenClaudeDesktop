import {SourceProfileSetting} from './source-profile-setting.jsx';
import {useAccountSettings} from './source-account-settings.jsx';
import { SourceSwitch as SettingSwitch } from './source-switch.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { ClaudeImportDialog } from './source-claude-import.jsx';
import { coreSettingDefault, coreSettingLabel, coreSettingOptionLabel } from './core-settings-model.mjs';
import { deviceDetail, deviceName, pairingTimeLeft, remoteEnabled, remoteStatusLabel } from './remote-control-model.mjs';
import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { SourceSegments } from './source-segments.jsx';
import { SourceCodeFontSetting } from './source-code-font-setting.jsx';
import { SourceSelect } from './source-select.jsx';
import { LOCALES, getLocale, t, tn } from '../electron/i18n/index.mjs';
import { bypassAvailability } from '../electron/permission-policy.mjs';
import { appearancePreferences, fastTierForModel, speedTiersForModel, tierForSpeed, savedSpeed, STANDARD_SPEED } from '../electron/preferences.mjs';
import { lightThemes, darkThemes } from './code-theme-catalog.mjs';
import { TRANSCRIPT_VIEW_LABELS } from './transcript-view-model.mjs';
import { SourceCodeThemePreview } from './source-code-theme-preview.jsx';
import { SourceCustomize } from './source-customize.jsx';
import { createSettingsSnapshotReader, removeDeveloperServer } from './developer-server-actions.mjs';
import './source-settings.css';
import { SourceUsage } from './source-usage';
import { SourceHooksSettings } from './source-hooks-settings.jsx';
import { DeveloperServers, StorageDialog } from './source-settings-pages.jsx';
import { useModalPresence } from './use-modal-presence';
import { settingsTabIndex } from './modal-presence.mjs';
import { holdModalInert } from './modal-inert.mjs';
import { settingsSearch, settingsHeading, sandboxFacts, mcpStatus, desktopErrors, windowCore } from './settings-model.mjs';
import { settingsCore, accountCore, accountGroupTitle, engineCopy } from './settings-core-copy.mjs';
import { workflowSettingsGroup } from './source-settings-workflows.jsx';
import { coreName, coreForEngine, coreCapabilities, coreSupports } from '../electron/core-registry.mjs';
import { SettingsSearchResults } from './source-settings-search.jsx';
import { bindSettingsAnchor } from './settings-anchor.mjs';
import { EMPTY_SETTINGS_CATALOG, settingsCatalogGroups } from './settings-catalog-search.mjs';
import { effortName } from './model-menu-model.mjs';
import { SourceHarnessSettings } from './source-settings-harness.jsx';
import { SourceCommandsSettings } from './source-settings-commands.jsx';
import { SourceToolProfilesSettings } from './source-settings-tool-profiles.jsx';
import { SourceCoresSettings } from './source-settings-cores.jsx';
import { SourceThemeSettings } from './source-settings-theme.jsx';
import { SourceModelsSettings } from './source-settings-models.jsx';
import { withEffortDefaults } from '../electron/prefs/model-settings.mjs';
import { personaGroup } from './source-settings-persona.jsx';
import { SettingRow } from './source-settings-kit.jsx';
import { SourceInstructionsSettings } from './source-settings-instructions.jsx';
import { hasAdvancedRows, advancedEmptyNotice } from './settings-advanced-model.mjs';
import { bootModelsCoreId, namedModels } from './model-names-model.mjs';
import { settingsNavSections, settingsInitialFocus, NOTIFICATION_LEVEL_ITEMS, notificationLevel, drawAttentionDisabled, keepAwakeEnabled, PREVIEW_STORAGE_ITEMS, previewStorageChoice, promptSuggestionsEnabled } from './settings-shell-model.mjs';
import { previewLinksStore } from './preview-links-model.mjs';
import { SourcePreviewAllowedSites } from './source-preview-allowed-sites.jsx';
const noCatalogSubscription=()=>()=>{};
const emptyCatalog=()=>EMPTY_SETTINGS_CATALOG;

// c71860c77 Rr/Br: a text button that opens a large full-height dialog whose
// body is a focusable pre region filled from the plain-text notices file (only
// a text/plain response is shown). Escape closes it and focus returns to the
// button; the settings dialog underneath stays open.
const FONT_LICENSES_URL='./third-party/fonts.txt';
function FontLicenses() {
  const [open,setOpen]=useState(false), [text,setText]=useState(null), [failed,setFailed]=useState(false);
  const button=useRef(null), body=useRef(null), titleId=useId();
  const show=()=>{
    setOpen(true);
    if(text!==null)return;
    fetch(FONT_LICENSES_URL).then(r=>r.ok&&r.headers.get('content-type')?.startsWith('text/plain')?r.text():null).catch(()=>null)
      .then(value=>{if(value!==null)setText(value);else setFailed(true);});
  };
  useEffect(()=>{
    if(!open)return;
    // shared-frame :5619-5620 Ef/Df: while a dialog is nested in it, the Settings popup carries
    // data-nested-dialog-open (its own ::after dim and 2px blur) and the nested backdrop stays clear.
    const parent=button.current?.closest('.ss-settings-dialog');parent?.setAttribute('data-nested-dialog-open','');
    const frame=requestAnimationFrame(()=>body.current?.focus({preventScroll:true}));
    return()=>{cancelAnimationFrame(frame);parent?.removeAttribute('data-nested-dialog-open');button.current?.focus({preventScroll:true});};
  },[open]);
  return <>
    <button type="button" ref={button} className="ss-text-button" aria-haspopup="dialog" aria-expanded={open} onClick={show}>{t('Font licenses')}</button>
    {open&&createPortal(<div className="ss-backdrop ss-backdrop-stacked" onMouseDown={e=>{if(e.target===e.currentTarget){e.stopPropagation();setOpen(false);}}}>
      <section className="ss-dialog ss-licenses" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        onKeyDown={e=>{
          // Portaled to body: stop React propagation so the settings dialog does not also handle Escape/Tab.
          e.stopPropagation();
          if(e.key==='Escape'){e.preventDefault();setOpen(false);return;}
          if(e.key==='Tab'){const items=[...e.currentTarget.querySelectorAll('button:not(:disabled),[tabindex="0"]')];const first=items[0],last=items.at(-1);
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
        }}>
        <header className="ss-licenses-header"><h2 id={titleId}>{t('Font licenses')}</h2>
          <button type="button" className="ss-close" aria-label={t('Close')} onClick={()=>setOpen(false)}><Icon name="X" size={16}/></button></header>
        <pre ref={body} role="region" aria-label={t('Font licenses')} tabIndex={0} className="ss-licenses-body" aria-busy={text===null&&!failed||undefined}>{text??(failed?t('The font licenses file could not be loaded.'):t('Loading…'))}</pre>
      </section>
    </div>,document.body)}
  </>;
}
// c71860c77 _i: two columns (grid-cols-2 gap-md py-md), each a mode-filtered
// Select above the fixed greet.ts diff preview (min-h-[94px] overflow-clip rounded-lg border).
function CodeThemeGrid({ light, dark, onChange }) {
  const column=(mode,value,items,label)=> <div className="ss-theme-column">
    <SourceSelect label={label} value={value} items={items} onChange={next=>onChange(mode==='light'?'codeThemeLight':'codeThemeDark',next)}/>
    <div className="ss-theme-preview-frame"><SourceCodeThemePreview mode={mode} theme={value}/></div>
  </div>;
  return <div className="ss-theme-grid">{column('light',light,lightThemes(),t('Light code theme'))}{column('dark',dark,darkThemes(),t('Dark code theme'))}</div>;
}

export { SourceSwitch as SettingSwitch } from './source-switch.jsx';
// shared-19 ZC (2337-2715, classic nav): Settings (General first), then This computer (System, Developer), then
// Customize; BC names the device group 'This computer' and its first page 'System' (c71860c77-C_7Gqn1u Qn :3712 heads
// that page 'System' too). Keep the flat array in that order for BD's narrow-screen tabs. hS supplies Scroll,
// Connectors and Plugin icons. Ids stay ('preferences' is the General page, 'general' the System page) so
// 'tab#row' anchors keep resolving. Usage is listed (ZC :2468-2482, gated on ji(); the usage-pace treatment oC only
// swaps its icon); the account menu and /usage still open it on its own (usageFocused below).
// A dialog over Settings sits in the settings layer (source-settings-commands.jsx SETTINGS_LAYER).
const ALLOWED_SITES_LAYER = Object.freeze({ base: 520, z: 520 });
const tabs = [
  // Light / Dark is chosen on General (the Theme page only points there): 'dark mode' finds General.
  {id:'preferences',label:'General',icon:'Settings',group:'Settings',keywords:['preferences','dark mode','light mode']},
  // ZC :2468-2482 pushes Usage straight after General (Privacy and Billing, between them, have no local page).
  {id:'usage',label:'Usage',icon:'UsageGaugeMiddle',group:'Settings'},
  {id:'theme',label:'Theme',icon:'Palette',group:'Settings',keywords:['accent','colors','font size','corner radius','density','appearance'],page:SourceThemeSettings},
  {id:'code',label:'Code',icon:'Code',group:'Settings'},
  {id:'instructions',label:'Instructions',icon:'BookText',group:'Settings',keywords:['custom instructions','system prompt','agents.md','project instructions'],page:SourceInstructionsSettings},
  {id:'commands',label:'Commands',icon:'SlashShortcutCommand',group:'Settings',keywords:['slash commands','prompt templates','custom commands'],page:SourceCommandsSettings},
  {id:'models',label:'Models',icon:'Lightning',group:'Settings',keywords:['api key','relay','base url','proxy','max tokens','temperature','pricing','prices','cost','display name','rename model'],page:SourceModelsSettings},
  // ZC searchHints JC: 'desktop' finds the This computer pages.
  {id:'general',label:'System',icon:'Computer',group:'This computer',keywords:['desktop','general']},
  {id:'developer',label:'Developer',icon:'Wrench',group:'This computer',keywords:['desktop']},
  {id:'cores',label:'Cores',icon:'Box',group:'This computer',keywords:['core','agent','codex','deepseek harness','download','install','sdk','engine'],page:SourceCoresSettings},
  {id:'customize-skills',label:'Skills',icon:'Scroll',group:'Customize',customize:true,keywords:['custom instructions','agent skills']},
  {id:'customize-connectors',label:'Connectors',icon:'Connectors',group:'Customize',customize:true,keywords:['mcp','integrations','tools']},
  {id:'customize-plugins',label:'Plugins',icon:'Plugin',group:'Customize',customize:true,keywords:['marketplace','extensions']},
  // Advanced (last in the nav; the official 2.42304.0 nav has no such group): the host's developer-facing pages and rows,
  // moved out of Code, This computer and Customize. Ids stay, so 'tab#row' anchors and the palette keep resolving.
  // Core options holds the rows that tune the running core itself (settings-advanced-model.mjs ADVANCED_GROUP_TITLES).
  {id:'advanced',label:'Core options',icon:'Wrench',group:'Advanced',keywords:['advanced','developer','experimental','beta features','timeout','sub-agents','permission profile','settings.json']},
  {id:'harness',label:'Harness',icon:'CommandLine',group:'Advanced',keywords:['cordis','profile','bundles','hooks','harness plugins','overlay','advanced'],page:SourceHarnessSettings},
  // The core's lifecycle hooks (hooks/list): Codex's /hooks review, trust and on/off; another core's, read-only. shell:
  // 'customize' draws it in the Customize page shell (its own h-14 header, close button absolute) like its siblings.
  {id:'customize-hooks',label:'Hooks',icon:'CommandLine',group:'Advanced',shell:'customize',keywords:['hooks','pre tool use','lifecycle','trust','review','advanced'],page:SourceHooksSettings},
  {id:'profiles',label:'Profiles',icon:'Tool',group:'Advanced',keywords:['tool profiles','tools','mcp','turn off tools','disable tools','advanced'],page:SourceToolProfilesSettings},
];
const navGroups = ['Settings','This computer','Customize','Advanced'];
export const SETTINGS_SECTIONS = tabs.map(t=>t.id);
const baseNavTabs = settingsNavSections(tabs);
// Shown labels; tabs keep the English copy, which settingsSearch also matches ('System' has its own heading entry).
const navLabel = Object.fromEntries(tabs.map(section=>[section.id,settingsHeading(section.label)]));
// DeepSeek's settings rows (codeDesktop/settings/read fields): label, description, and how the value is shown (seconds for
// the shell's millisecond timeouts, KB for its output cap).
export function harnessSettingCopy(setting) {
  const key=`${setting?.ns}/${setting?.key}`;
  switch(key){
    case 'bash-sandbox/timeoutMs':return {label:t('Command timeout'),description:t('How long a shell command may run before DeepSeek stops it, unless the command asks for longer.'),scale:1000,suffix:` ${t('seconds')}`};
    case 'bash-sandbox/maxTimeoutMs':return {label:t('Longest command timeout'),description:t('The most time a single shell command may ask for.'),scale:1000,suffix:` ${t('seconds')}`};
    case 'bash-sandbox/maxOutputBytes':return {label:t('Command output kept'),description:t('How much of each command’s output DeepSeek keeps and reads. The rest is cut.'),scale:1024,suffix:' KB'};
    case 'agent-loop/maxParallelToolCalls':return {label:t('Parallel tool calls'),description:t('How many safe tool calls DeepSeek may run at once in one step.')};
    case 'subagent/maxDepth':return {label:t('Sub-agent depth'),description:t('How many levels of sub-agents may start further sub-agents. 0 turns sub-agents of sub-agents off.')};
    case 'subagent/maxActiveSubagents':return {label:t('Sub-agents at once'),description:t('How many sub-agents may run at the same time.')};
    case 'web-search-deepseek/maxUses':return {label:t('Web searches per request'),description:t('How many times DeepSeek may search the web while answering one message.')};
    case 'web-search-deepseek/baseURL':return {label:t('Web search endpoint'),description:t('Where web searches are sent. Empty: the default DeepSeek endpoint.')};
    default:return {label:key,description:''};
  }
}
export function SourceSettings({ open = true, ...props }) {
  const presence = useModalPresence(open);
  return presence.present ? <SettingsContent {...props} presence={presence}/> : null;
}
function SettingsContent({ presence, config, model, effort, permission, boot, busy, coreBusy, initialSection, readUsage, usageActions, desktopCall, customize, onSave, onFolder, onReconnect, onSwitchCore, onQuickSetup, onLogin, onAccountAction, onRefreshAccount, onReveal, onClose }) {
  // initialSection 'tab' or 'tab#rowId' (the Mode menu's Bypass 'Enable' opens 'code#bypass': the page, then the row's anchor highlight).
  const [section,anchorRow]=String(initialSection??'').split('#');
  const [tab,setTab]=useState(()=>tabs.some(t=>t.id===section)?section:'preferences'), [query,setQuery]=useState(''), [pending,setPending]=useState(''), [error,setError]=useState(''), [build,setBuild]=useState(null), [focus,setFocus]=useState(null);
  // Opened straight on Usage (the account menu's Usage, /usage): the stacked Usage dialog without the nav, as the user's
  // Usage reference shows it. Usage picked in the nav, the narrow tabs or search stays in the Settings shell (shared-19 ZC).
  const [usageFocused,setUsageFocused]=useState(()=>section==='usage');
  // 'customize-connectors#<encoded name>' opens that connector's page (the Add menu's connector and Reconnect rows:
  // ca80fca8d jN ne → /customize/connectors?connector=…).
  useEffect(()=>{if(tabs.some(t=>t.id===section)){setTab(section);setUsageFocused(section==='usage');setQuery('');
    if(section==='customize-connectors'&&anchorRow){setFocus({connectorName:decodeURIComponent(anchorRow)});return;}
    // 'general#open-storage': the low-disk toast's Manage storage (cov0-04; shared-3 Ck pushes
    // /settings/desktop?open_storage=true, shared-156 maps it to the desktop page's open-storage action): the System page
    // with its Storage dialog open.
    if(section==='general'&&anchorRow==='open-storage'){setFocus(null);setStorage(true);return;}
    setFocus(null);if(anchorRow)setHighlight({id:anchorRow});}},[initialSection]);
  const catalog=useSyncExternalStore(customize?.store?.subscribe||noCatalogSubscription,customize?.store?.getSnapshot||emptyCatalog,customize?.store?.getSnapshot||emptyCatalog);
  useEffect(()=>{
    if(!customize?.store)return;
    const {store,cwd,threadId}=customize;
    // Read-only catalogs; the existing store fences replies and deduplicates
    // simultaneous consumers such as the composer and the actual page.
    void Promise.allSettled([store.loadSkills({cwd}),store.loadPlugins({cwd}),store.loadMcp({cwd,threadId:threadId??null})]);
  },[customize?.store,customize?.cwd,customize?.threadId]);
  const [desktop,setDesktop]=useState(null),[desktopRevision,setDesktopRevision]=useState(0),[storage,setStorage]=useState(()=>(section==='general'&&anchorRow==='open-storage')||null),[rowErrors,setRowErrors]=useState({}),[searchOpen,setSearchOpen]=useState(false),[searchIndex,setSearchIndex]=useState(0),[highlight,setHighlight]=useState(null),[narrow,setNarrow]=useState(()=>innerWidth<=767);
  // BD zy.Tabs (activateOnFocus:false): arrowing moves the roving tab stop with the highlighted tab, not the selection.
  const [tabHighlight,setTabHighlight]=useState(null);
  useEffect(()=>setTabHighlight(null),[tab]);
  const refreshDesktop = useRef(null), removingServer = useRef(false);
  const [claudeImport,setClaudeImport]=useState(false);
  // An ACP agent's own settings (Gemini / Qwen settings.json keys; codeDesktop/coreSettings/*), for Settings › Code.
  const [coreSettings,setCoreSettings]=useState(null);
  const coreSettingsCore=boot?.connected&&coreSupports(boot?.core,'coreSettings');
  useEffect(()=>{if(!coreSettingsCore){setCoreSettings(null);return undefined;}let live=true;
    Promise.resolve(desktopCall('rpc',{method:'codeDesktop/coreSettings/read',params:{}})).then(value=>{if(live)setCoreSettings(Array.isArray(value?.settings)?value:null);},()=>{if(live)setCoreSettings(null);});
    return()=>{live=false;};},[coreSettingsCore,boot?.core?.engine]);
  // A core that imports other tools' sessions on request (MiMo: capabilities.historyImport, codeDesktop/history/import);
  // imported sessions are opened from Resume a session.
  const historySources=boot?.connected&&Array.isArray(coreCapabilities(boot?.core).historyImport)?coreCapabilities(boot?.core).historyImport:null;
  const [historyImport,setHistoryImport]=useState(null);
  const importHistory=source=>commit(`history-import`,{},async()=>{setHistoryImport({source,busy:true});
    try{const result=await desktopCall('rpc',{method:'codeDesktop/history/import',params:{sources:[source]}});const stats=result?.[source]??{};setHistoryImport({source,stats});}
    catch(error){setHistoryImport(null);throw error;}});
  // Codex's own Memories and beta features (main.cjs 'codex-features', codex-features.cjs): read once the Codex core is
  // connected; a beta switch applies after Codex restarts (restartPending), memories to new sessions.
  const [codexFeatures,setCodexFeatures]=useState(null),[codexRestart,setCodexRestart]=useState(false);
  const codexFeaturesCore=boot?.connected&&coreForEngine(boot?.core?.engine).id==='codex'&&!coreSupports(boot?.core,'permissionHints');
  useEffect(()=>{if(!codexFeaturesCore){setCodexFeatures(null);return undefined;}let live=true;
    Promise.resolve(desktopCall('codex-features',{op:'read'})).then(value=>{if(live)setCodexFeatures(value&&typeof value==='object'?value:null);},()=>{if(live)setCodexFeatures(null);});
    return()=>{live=false;};},[codexFeaturesCore,boot?.core?.engine]);
  // Codex Remote Control (remoteControl/*): read once the Codex core is connected; it needs a ChatGPT sign-in. A pairing
  // code is polled until a device claims it or it expires; then the paired devices are read again.
  const [remote,setRemote]=useState(null),[pairing,setPairing]=useState(null),[remoteDevices,setRemoteDevices]=useState([]),[remoteNow,setRemoteNow]=useState(()=>Date.now());
  const remoteCore=codexFeaturesCore;
  const loadRemoteDevices=async(environmentId)=>{if(!environmentId){setRemoteDevices([]);return;}
    try{const result=await desktopCall('rpc',{method:'remoteControl/client/list',params:{environmentId}});setRemoteDevices(Array.isArray(result?.data)?result.data:[]);}catch{setRemoteDevices([]);}};
  useEffect(()=>{if(!remoteCore){setRemote(null);setPairing(null);setRemoteDevices([]);return undefined;}let live=true;
    Promise.resolve(desktopCall('rpc',{method:'remoteControl/status/read',params:{}})).then(value=>{if(!live)return;setRemote(value&&typeof value==='object'?value:null);if(value?.environmentId)void loadRemoteDevices(value.environmentId);},()=>{if(live)setRemote(null);});
    return()=>{live=false;};},[remoteCore,boot?.core?.engine]);
  useEffect(()=>{if(!pairing)return undefined;const timer=setInterval(async()=>{setRemoteNow(Date.now());
    if(!pairingTimeLeft(pairing.expiresAt)){setPairing(null);return;}
    try{const status=await desktopCall('rpc',{method:'remoteControl/pairing/status',params:{pairingCode:pairing.pairingCode,manualPairingCode:pairing.manualPairingCode??null}});
      if(status?.claimed){setPairing(null);void loadRemoteDevices(pairing.environmentId||remote?.environmentId);}}catch{}},2000);
    return()=>clearInterval(timer);},[pairing,remote?.environmentId]);
  const setRemoteControl=on=>commit('remote-control',{},async()=>{const value=await desktopCall('rpc',{method:on?'remoteControl/enable':'remoteControl/disable',params:{}});
    if(value&&typeof value==='object')setRemote(value);if(!on){setPairing(null);setRemoteDevices([]);}else if(value?.environmentId)void loadRemoteDevices(value.environmentId);});
  const startPairing=()=>commit('remote-pair',{},async()=>{const value=await desktopCall('rpc',{method:'remoteControl/pairing/start',params:{manualCode:true}});
    if(value?.pairingCode)setPairing(value);setRemoteNow(Date.now());});
  const revokeDevice=device=>commit(`remote-device-${device.clientId}`,{},async()=>{if(!window.confirm(t('Remove {device}? It can no longer reach Codex on this Mac until you pair it again.',{device:deviceName(device)})))return;
    await desktopCall('rpc',{method:'remoteControl/client/revoke',params:{environmentId:remote?.environmentId,clientId:device.clientId}});await loadRemoteDevices(remote?.environmentId);});
  const codexFeature=(id,payload,{restart=false}={})=>commit(id,{},async()=>{const value=await desktopCall('codex-features',payload);if(value&&typeof value==='object')setCodexFeatures(value);if(restart)setCodexRestart(true);});
  // DeepSeek's own settings pages (capabilities.harnessSettings: codeDesktop/settings/*): shell timeout and output,
  // parallel tool calls, sub-agent limits and web search, each saved on blur and reset to its default.
  const [harnessSettings,setHarnessSettings]=useState(null);
  const harnessSettingsCore=boot?.connected&&coreSupports(boot?.core,'harnessSettings');
  useEffect(()=>{if(!harnessSettingsCore){setHarnessSettings(null);return undefined;}let live=true;
    Promise.resolve(desktopCall('rpc',{method:'codeDesktop/settings/read',params:{}})).then(value=>{if(live)setHarnessSettings(Array.isArray(value?.settings)?value:null);},()=>{if(live)setHarnessSettings(null);});
    return()=>{live=false;};},[harnessSettingsCore]);
  const writeHarnessSetting=(setting,value)=>commit(`dsh-${setting.ns}-${setting.key}`,{},async()=>{const result=await desktopCall('rpc',{method:'codeDesktop/settings/write',params:{ns:setting.ns,key:setting.key,value}});if(Array.isArray(result?.settings))setHarnessSettings(result);});
  const writeCoreSetting=(key,value)=>commit(`core-${key}`,{},async()=>{const result=await desktopCall('rpc',{method:'codeDesktop/coreSettings/write',params:{key,value}});if(Array.isArray(result?.settings))setCoreSettings(result);});
  useEffect(()=>{const update=()=>setNarrow(innerWidth<=767);window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
  useEffect(() => {
    const reader = createSettingsSnapshotReader({
      read: () => desktopCall('desktop-settings-read', { threadId: customize?.threadId }),
      readFast: () => desktopCall('desktop-settings-read', { threadId: customize?.threadId, servers: false }),
      onValue: setDesktop,
      onError: reason => setDesktop(current => ({ ...current, errors: { ...current?.errors, connection: reason.message } })),
      refreshCatalog: () => customize?.store?.loadMcp({ force: true, cwd: customize?.cwd, threadId: customize?.threadId ?? null }),
    });
    refreshDesktop.current = reader.refresh;
    void reader.refresh().catch(() => {});
    return () => { reader.dispose(); if (refreshDesktop.current === reader.refresh) refreshDesktop.current = null; };
  }, [desktopRevision, boot?.connected, customize?.threadId, customize?.cwd, customize?.store, desktopCall]);
  const removeServer = async name => {
    if (removingServer.current || pending) return false;
    removingServer.current = true; setPending('mcp-remove');
    const refresh = refreshDesktop.current;
    try {
      return await removeDeveloperServer(name, {
        confirm: message => window.confirm(message),
        call: customize.call,
        refresh: () => refresh?.(true),
      });
    } finally { removingServer.current = false; setPending(''); }
  };
  useEffect(()=>{if(!highlight || !presence.visible)return;return bindSettingsAnchor(presence.popup.current,highlight.id,()=>setHighlight(current=>current===highlight?null:current));},[highlight,tab,presence.visible,presence.popup]);
  useEffect(()=>{if(tab==='usage'&&usageFocused)presence.popup.current?.focus({preventScroll:true});},[tab]);
  const root=presence.popup, search=useRef(null), titleId=useId(), close=useRef(onClose);close.current=onClose;
  const prefs=appearancePreferences(config), account=boot?.account?.account, models=namedModels(boot?.models || [],config,bootModelsCoreId(boot,config)), chosen=models.find(m=>m.model===model), fast=fastTierForModel(chosen)||speedTiersForModel(chosen)[0]||null, speeds=speedTiersForModel(chosen);
  useEffect(()=>{let live=true;fetch('./build-info.json').then(r=>r.json()).then(value=>live&&setBuild(value)).catch(()=>{});return()=>{live=false;};},[]);
  // The opener is read in a layout effect, before any passive effect moves focus: the tab==='usage' effect above
  // is declared first and already focused the popup, so /usage (main.jsx:1352) captured the popup itself and, it
  // being disconnected on close, fell back to Account menu instead of the composer (HANDOFF 0.2.124 session-actions).
  const opener=useRef(null);useLayoutEffect(()=>{opener.current=document.activeElement;},[]);
  useEffect(()=>{
    // cc011544b _t: the wide nav search takes focus on open ({preventScroll, focusVisible:false}) so a query can
    // be typed at once; it leaves focus alone once it is already inside this dialog. Narrow tabs and the
    // stacked Usage page keep focusing the popup (settings-shell-model settingsInitialFocus).
    const initialFocus=()=>{
      const field=settingsInitialFocus({narrow,section:tab})==='search'?search.current:null, active=document.activeElement;
      if(active&&active!==root.current&&root.current?.contains(active))return;
      if(field)field.focus({preventScroll:true,focusVisible:false});else root.current?.focus();
    };
    const previous=opener.current, frame=requestAnimationFrame(initialFocus);
    const releaseInert=holdModalInert(document.getElementById('root'));
    initialFocus();
    return()=>{cancelAnimationFrame(frame);releaseInert();if(previous?.isConnected && previous !== document.body&&!previous.closest('[inert]'))previous.focus({preventScroll:true});else document.querySelector('[aria-label="Account menu"]')?.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{
    // Base UI Dialog useDismiss listens for Escape on the document. The root onKeyDown below only
    // sees keys while focus is inside, so when a focused control is natively disabled mid-action
    // (Refresh usage, Reconnect) focus falls to <body> and Escape was lost. Handle only that case,
    // and only while this is the topmost modal, so nested dialogs keep their own Escape.
    const doc=root.current?.ownerDocument;if(!doc)return;
    const key=e=>{if(e.key!=='Escape'||e.defaultPrevented||e.isComposing)return;const active=doc.activeElement;if(active&&active!==doc.body&&active!==doc.documentElement)return;
      if([...doc.querySelectorAll('[aria-modal="true"]')].at(-1)!==root.current)return;e.preventDefault();close.current();};
    doc.addEventListener('keydown',key);return()=>doc.removeEventListener('keydown',key);
  },[]);
  // Developer-page actions (Edit config, Reconnect, MCP removal) keep one in-flight key so a second press is
  // ignored; they no longer disable the rest of the page.
  async function action(key, fn) {if(pending)return;setPending(key);setError('');setRowErrors(v=>({...v,[key]:null}));try{await fn();}catch(e){setRowErrors(v=>({...v,[key]:e.message}));}finally{setPending('');}}
  // c71860c77 Ur (:1202-1300) and li (:1929-2440): every control saves on its own and nothing else on the page
  // changes state meanwhile. The row shows its new value at once (Dynamic workflows' optimistic `oe`, as
  // main.jsx preference() does for theme and model); a failed write drops it, so the reconciled saved value
  // shows again, with the row's below-slot message. Values clear once every write in flight has settled.
  const [optimistic,setOptimistic]=useState({}), writes=useRef(0), [workflowAdvanced,setWorkflowAdvanced]=useState(false);
  const shownValue=(key,saved)=>Object.hasOwn(optimistic,key)?optimistic[key]:saved;
  async function commit(rowId,patch,write=()=>onSave(patch)){
    setOptimistic(v=>({...v,...patch}));setRowErrors(v=>v[rowId]?{...v,[rowId]:null}:v);writes.current++;
    try{await write();}
    catch(e){
      console.warn(`Couldn’t save the ${rowId} setting:`,e);
      setOptimistic(v=>{const next={...v};for(const key of Object.keys(patch))if(Object.is(next[key],patch[key]))delete next[key];return next;});
      setRowErrors(v=>({...v,[rowId]:e?.message||String(e)}));
    }
    finally{if(--writes.current===0)setOptimistic({});}
  }
  const save=(key,value,rowId=key)=>commit(rowId,{[key]:value});
  const segments=(key,label,options)=> <SourceSegments label={label} value={shownValue(key,prefs[key] ?? config[key])} options={options} onChange={value=>save(key,value)}/>;
  const row=(id,label,description,control,searchText)=>({id,label,description,control,searchText:searchText??(typeof description==='string'?description:'')});
  // engine: boot.core itself (its reported capabilities win over the implied ones in coreSupports), else the chosen
  // core id while no core has reported. Every page gate takes a core, an engine or an id.
  const engine=settingsCore(boot,config), codexNative=coreForEngine(typeof engine==='string'?engine:engine?.engine).id==='codex'&&!coreSupports(engine,'permissionHints'), facts=sandboxFacts(desktop?.policy,desktop?.requirements,{engine}), bypass=bypassAvailability(desktop?.requirements),
    // Requirements not read yet (no answer and no recorded failure): neutral, the opt-in stays usable (main validates every Bypass request).
    bypassChecking=!desktop||(!Object.hasOwn(desktop,'requirements')&&!desktop.requirementsUnsupported&&!desktop.errors?.requirements&&!desktop.errors?.connection);
  const local=engineCopy(engine);
  // Settings › Harness edits DeepSeek Harness profile overlays only: other cores keep it out of the nav and the
  // narrow tabs (search still finds it, and its page explains the scope); an open Harness page keeps its entry.
  // Hooks: a core that lists them (capabilities.hooksList: Codex, the bridges whose agents have hooks).
  // Advanced › Core options: listed while the running core has rows for it (settings-advanced-model.mjs).
  const advancedListed=hasAdvancedRows({coreSettings,harnessSettings,codexFeatures,codexPermissions:codexNative?desktop?.codexPermissions:null});
  const navTabs=baseNavTabs.filter(section=>(section.id!=='harness'||tab==='harness'||coreSupports(engine,'harnessProfile'))&&(section.id!=='customize-hooks'||tab==='customize-hooks'||coreSupports(engine,'hooksList'))&&(section.id!=='advanced'||tab==='advanced'||advancedListed));
  // The narrow tabs' roving tab stop: the arrowed (highlighted) tab while it is listed, else the selected one.
  const rovingTab=navTabs.some(entry=>entry.id===tabHighlight)?tabHighlight:tab;
  // A core without MCP config writes (DeepSeek: capabilities.mcpConfigWrite false) offers no Delete.
  const mcpWritable=boot?.core?.capabilities?.mcpConfigWrite!==false;
  const booleanRow=(id,label,description,{indent=false,checked=!!shownValue(id,config[id]),disabled=false}={})=>({...row(id,label,description,<SettingSwitch label={label} checked={checked} disabled={disabled} onChange={value=>save(id,value)}/>),indent});
  // c71860c77 Jr (:1455-1500) on the Code page only; unset reads as on (index.chunk-ChZ67Jhw.js tV).
  const awake=key=>keepAwakeEnabled(shownValue(key,config[key]));
  const keepAwake=[booleanRow('keepAwake',t('Keep computer awake while DeepSeek works'),t('Prevent your computer from sleeping while a Code session is running, so long tasks can finish. Your display can still turn off. Closing the laptop lid will still put it to sleep.'),{checked:awake('keepAwake')}),...(awake('keepAwake')?[booleanRow('keepAwakeOnBattery',t('Keep awake on battery power'),'',{indent:true,checked:awake('keepAwakeOnBattery')})]:[])];
  // c71860c77:2240-2275: per-type items, unset reads as Banners, no disabled item.
  const level=id=>notificationLevel(shownValue(id,config[id]));
  const levelRow=(id,label,description)=>row(id,label,description,<SourceSelect label={t('{setting} notification level',{setting:label})} value={level(id)} align="end" className="sselect-width-160" onChange={value=>save(id,value)} items={NOTIFICATION_LEVEL_ITEMS[id]}/>);
  // The running core's account, or the chosen core's while disconnected ("DeepSeek account" only on DeepSeek Harness).
  const accountTitle=accountGroupTitle(accountCore(boot,config));
  // Kr: Browser tools gates its two sub-rows. The links choice is the Preview pane's store (config.previewLinks); the
  // cookie mode is read from the preview service (preview-storage-read), falling back to the saved config.
  const browserTools=shownValue('agentPreview',config.agentPreview)!==false;
  // cdc95db1a m (B39): Allowed sites › Manage opens the Allowed sites dialog over Settings (the settings layer).
  const [allowedSites,setAllowedSites]=useState(false);
  const desktopCallRef=useRef(desktopCall);desktopCallRef.current=desktopCall;
  const [allowedSitesHost]=useState(()=>({call:(action,params)=>desktopCallRef.current(action,params)}));
  const linksInPreview=useSyncExternalStore(previewLinksStore.subscribe,previewLinksStore.getSnapshot,previewLinksStore.getSnapshot);
  const [previewStorage,setPreviewStorage]=useState(()=>previewStorageChoice(config.previewStorage,config.previewKeepCookies));
  useEffect(()=>{if(tab!=='code')return undefined;let live=true;
    Promise.resolve(desktopCall('preview-storage-read')).then(value=>{if(live&&value?.previewStorage)setPreviewStorage(previewStorageChoice(value.previewStorage));},()=>{});
    return()=>{live=false;};},[tab]);
  const accountRows=useAccountSettings({snapshot:boot?.account,auth:boot?.auth,connected:boot?.connected,busy,engine:boot?.connected?engine:accountCore(boot,config),onLogin,onAccountAction,onRefreshAccount,onOpenExternal:url=>desktopCall('external',{url})});
  const groups=[
    {tab:'preferences',title:'Appearance',rows:[
      row('theme',t('Theme'),'',segments('theme',t('Theme'),[{value:'system',label:t('System'),icon:'Computer'},{value:'light',label:t('Light'),icon:'Sun'},{value:'dark',label:t('Dark'),icon:'Moon'}])),
      row('motion',t('Motion'),t('Reduce animation in streaming responses and other interface elements.'),segments('motion',t('Motion'),[{value:'system',label:t('System')},{value:'reduce',label:t('Reduced')}])),
      // shared-21 user menu Language (y1Z3orIe9Z) / ca25db325 general › Language: here a select; changing it reloads the window.
      row('locale',t('Language'),t('The language of menus, settings and other interface text.'),<SourceSelect label={t('Language')} value={getLocale()} align="end" items={LOCALES.map(entry=>({value:entry.locale,label:entry.localName}))}
        onChange={value=>{if(value!==getLocale())void Promise.resolve(onSave({locale:value})).then(()=>{try{globalThis.sessionStorage?.setItem('code-desktop:reopen-settings','preferences');}catch{}globalThis.location?.reload();},()=>{});}}/>,'Language 语言'),
    ]},
    {tab:'preferences',title:'Profile',rows:[{id:'name',label:t('What should we call you?'),description:t('Used only in this app.'),below:<SourceProfileSetting value={config.displayName || ''} onSave={value=>onSave({displayName:value})}/>}]},
    personaGroup({config,onSave,desktopCall}),
    {tab:'preferences',title:accountTitle,rows:accountRows},
    // c71860c77 pa: appearance precedes local sessions. Codex-only controls stay below.
    {tab:'code',title:'Code appearance',rows:[
      // Searchable as "Code theme" (local index entry; the official search index lists only Code font here).
      {id:'codeTheme',label:t('Code theme'),description:t('Light and dark code themes'),grid:<CodeThemeGrid light={shownValue('codeThemeLight',prefs.codeThemeLight)} dark={shownValue('codeThemeDark',prefs.codeThemeDark)} onChange={(key,value)=>save(key,value,'codeTheme')}/>},
      row('codeFont',t('Code font'),t('Set a custom monospace font for code and terminal.'),<SourceCodeFontSetting value={prefs.codeFont} placeholder={t('e.g. {font}',{font:prefs.interfaceFont==='dyslexic'?'OpenDyslexic Mono':'JetBrains Mono'})} onSave={value=>onSave({codeFont:value})}/>),
    ]},
    {tab:'code',title:'Appearance',rows:[
      row('interfaceFont',t('Interface font'),<>{t('Font for the whole interface — menus, sidebars, and panels.')} <FontLicenses/></>,segments('interfaceFont',t('Interface font'),[{value:'anthropic',label:'Anthropic Sans'},{value:'system',label:t('System')},{value:'dyslexic',label:'OpenDyslexic'}]),`${t('Font for the whole interface — menus, sidebars, and panels.')} ${t('Font licenses')}`),
      row('transcriptSize',t('Transcript text size'),t('Size of the conversation transcript text.'),segments('transcriptSize',t('Transcript text size'),[{value:'s',label:t('Small')},{value:'m',label:t('Medium')},{value:'l',label:t('Large')}])),
      row('transcriptWidth',t('Transcript width'),t('Maximum width of the transcript and composer columns.'),segments('transcriptWidth',t('Transcript width'),[{value:'s',label:t('Narrow')},{value:'m',label:t('Medium')},{value:'l',label:t('Wide')}])),
      row('transcriptView',t('Default transcript view'),t('The view sessions open in. Picking a view from a session’s Transcript view menu changes only that session.'),segments('transcriptView',t('Default transcript view'),['normal','thinking','verbose'].map(value=>({value,label:t(TRANSCRIPT_VIEW_LABELS[value])})))),
    ]},
    // c71860c77-DzP8HoeV hr (:989-1240): the group is titled 'Sessions' (id local-sessions).
    {tab:'code',title:'Sessions',rows:[
      // c71860c77:2188-2212 YlYBASRBOt with DeepSeek substituted; the <link> to Anthropic's security page has no
      // DeepSeek counterpart, so the link element is dropped.
      row('bypass',t('Allow bypass permissions mode'),<>{t('Bypass all permission checks and let DeepSeek work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting DeepSeek run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks).')}{!bypass.allowed && !bypassChecking && <span className="ss-bypass-reason"> {t(bypass.reason)}</span>}</>,<SettingSwitch label={t('Allow bypass permissions mode')} checked={shownValue('allowBypassPermissions',config.allowBypassPermissions)===true} disabled={!config.allowBypassPermissions && (!boot?.connected || (!bypass.allowed && !bypassChecking))} onChange={value=>save('allowBypassPermissions',value,'bypass')}/>,t('Bypass all permission checks and let DeepSeek work uninterrupted.')),
      // c71860c77:2180-2245: the Dynamic workflows switch comes straight after Bypass; OpenClaude Desktop's extra workflow rows
      // (source-settings-workflows.jsx: engine, keyword, size, Advanced) nest beneath it, indented, only while it is on.
      ...workflowSettingsGroup({config,boot,engine,shownValue,save,rowErrors,setRowErrors,models,advanced:workflowAdvanced,setAdvanced:setWorkflowAdvanced,desktopCall,cwd:customize?.cwd??config.cwd??null}).rows,
      levelRow('permissionNotifications',t('Permission requests'),t('DeepSeek needs your approval to use a tool.')),
      levelRow('questionNotifications',t('Questions'),t('DeepSeek is asking you to choose between options.')),
      levelRow('completeNotifications',t('Task complete'),t('DeepSeek finished and is waiting for your input.')),
      row('notificationSound',t('Notification sound'),t('Played when an OS banner is shown.'),<SourceSelect label={t('Notification sound')} align="end" className="sselect-width-160" value={shownValue('notificationSound',config.notificationSound)||'system'} onChange={value=>save('notificationSound',value)} items={[{value:'system',label:t('System sound')},{value:'none',label:t('None')}]}/>),
      booleanRow('drawAttention',t('Draw attention on notifications'),t('Bounce the Dock icon when DeepSeek needs your attention and the app isn’t focused.'),{disabled:drawAttentionDisabled({permissionNotifications:level('permissionNotifications'),questionNotifications:level('questionNotifications')})}),
      ...keepAwake,
      // c71860c77-DzP8HoeV cr (:877-899), right after keep-awake (:1201-1202): listed where the running core suggests a
      // next prompt (capabilities.promptSuggestion); main.jsx hides the composer suggestion when it is off.
      ...(coreSupports(engine,'promptSuggestion')?[booleanRow('promptSuggestions',t('Prompt suggestions'),t('Show a suggested next prompt in the message box after DeepSeek replies. Suggestions add a little to your usage.'),{checked:promptSuggestionsEnabled(shownValue('promptSuggestions',config.promptSuggestions))})]:[]),
      row('archiveInactiveDays',t('Archive inactive sessions'),t('Automatically archive local sessions after a period of no activity. Sessions that are running or have background work are never archived, and a worktree with uncommitted changes is kept on disk.'),<SourceSelect label={t('Archive inactive sessions')} align="end" className="sselect-width-160" value={shownValue('archiveInactiveDays',config.archiveInactiveDays)||0} onChange={value=>save('archiveInactiveDays',Number(value))} items={[0,1,2,7,14,30].map(d=>({value:d,label:d?tn(d,'{count} day','{count} days'):t('Never')}))}/>),
      // c71860c77:2376-2398 g: the custom choice goes through the folder picker; only the saved location shows.
      // settings-01 (2.42304.0 cd19fedd2 worktreeLocation P0gQiUc0+j): "…on this computer." The SSH variant (c71860c77
      // dnMG5c8GDx, only while SSH connections are available) has no local counterpart: no core runs over SSH.
      row('worktreeLocation',t('Worktree location'),t('Where to store Git worktrees for isolated coding sessions on this computer.'),<div className="ss-worktree-control"><SourceSelect label={t('Worktree location')} align="end" value={shownValue('worktreeLocation',config.worktreeLocation)||'project'} title={config.worktreeLocation==='custom'?config.worktreeDirectory:'.code/worktrees'} onChange={value=>value==='custom'?commit('worktreeLocation',{},async()=>{const c=await desktopCall('desktop-worktree-folder');if(c)await onSave({worktreeLocation:c.worktreeLocation});setDesktopRevision(n=>n+1);}):save('worktreeLocation','project')} items={[{value:'project',label:t('Inside project'),description:'.code/worktrees'},{value:'custom',label:t('Custom…')}]}/>{config.worktreeLocation==='custom'&&config.worktreeDirectory&&<div className="ss-worktree-path" title={config.worktreeDirectory}>{config.worktreeDirectory}</div>}</div>),
      row('sandbox',t('Sandbox mode'),t(facts.reason),<span>{facts.mode||t('Unavailable')}</span>),
      // turn/start sandboxPolicy.networkAccess for workspace-write turns (permission-policy.mjs turnPermissionParams).
      // A core without a sandbox (descriptor or reported capability sandbox: false) has nothing to open.
      // sandboxNetwork 'always' (the core's sandbox limits file writes only): a read-only fact, never a switch that does nothing.
      ...(coreForEngine(typeof engine==='string'?engine:engine?.engine).sandbox===false||coreCapabilities(engine).sandbox===false?[]
        :coreCapabilities(engine).sandboxNetwork==='always'?[row('sandboxNetworkAccess',t('Sandbox network access'),t('{core}’s sandbox limits file writes only, so commands it runs can always use the network.',{core:coreName(engine)}),<span>{t('Always on')}</span>)]
        :[booleanRow('sandboxNetworkAccess',t('Sandbox network access'),t('Let commands that {core} runs in its sandbox use the network, including a proxy on this computer. Applies in Auto, Manual and Accept edits; Plan stays offline.',{core:coreName(engine)}))]),
    ]},
    // c71860c77-DzP8HoeV Kr (:2218-2300) section "preview", titled 'Browser': Browser tools (the app's preview tools for
    // every core; unset reads as on), then, while it is on, Open links in built-in browser (cdc95db1a f, the Preview
    // pane's own preference) and Keep cookies (the Preview pane's storage mode, the same preview-storage call; the
    // built-in-browser copy MoAjWUV0jP, as the shared jar is one browser for every session and Cowork).
    // Allowed sites (cdc95db1a m) is B39.
    {tab:'code',title:'Browser',rows:[
      booleanRow('agentPreview',t('Browser tools'),t('DeepSeek can start your dev servers, open them in the Preview pane, and check its changes with screenshots, page snapshots and clicks. Outside sites always ask first.'),{checked:browserTools}),
      ...(browserTools?[
        row('previewLinks',t('Open links in built-in browser'),t('Links open in the built-in browser instead of your default browser.'),<SettingSwitch label={t('Open links in built-in browser')} checked={linksInPreview} onChange={value=>previewLinksStore.set(value)}/>),
        row('previewStorage',t('Keep cookies'),t('Browser tabs keep cookies and logins across restarts in one saved browser shared by every session and Cowork. Per session gives each Code session its own copy instead, so sessions never see each other’s logins.'),
          <SourceSelect label={t('Keep cookies')} align="end" value={shownValue('previewStorage',previewStorage)} items={PREVIEW_STORAGE_ITEMS}
            onChange={value=>{if(PREVIEW_STORAGE_ITEMS.some(item=>item.value===value))commit('previewStorage',{previewStorage:value},async()=>{const next=await desktopCall('preview-storage',{mode:value});setPreviewStorage(previewStorageChoice(next?.previewStorage,value!=='none'));});}}/>),
        row('previewAllowedSites',t('Allowed sites'),t('Sites where DeepSeek can use its Browser tools without a permission prompt.'),
          <SourceSettingsButton variant="secondary" size="sm" onClick={()=>setAllowedSites(true)}>{t('Manage')}</SourceSettingsButton>),
      ]:[]),
    ]},
    // R4i-mcp MC1: the visualize group (agent-tools/visualize.mjs, config.agentVisualize; unset reads as on, D35). The
    // official row is claude.ai Settings › Capabilities › Visuals › Inline visualizations (c71860c77 ze, behind
    // claudeai_mcp_apps_visualize); Code has none, as its visualize server is the main process's GrowthBook 3444158716.
    {tab:'code',title:'Visuals',rows:[booleanRow('agentVisualize',t('Inline visualizations'),t('Allow DeepSeek to generate interactive visualizations, charts, and diagrams directly in the conversation.'),{checked:shownValue('agentVisualize',config.agentVisualize)!==false})]},
    {tab:'code',title:'Model and permissions',rows:[
      // Disabled only where the original disables: the model and effort pickers while a turn is busy.
      row('model',t('Model'),t('Used for your next message.'),<SourceSelect label={t('Default model')} value={shownValue('model',model)} disabled={busy||!boot?.connected} items={models.map(m=>({value:m.model,label:m.displayName||m.model}))} onChange={value=>{const next=models.find(m=>m.model===value);if(next)commit('model',{model:next.model,effort:next.defaultReasoningEffort});}}/>),
      // A model that reports no effort levels (a custom-provider or relay model) has nothing to pick: the row says so and
      // shows 'Model default', as the composer's effort chip does, instead of an empty list.
      ...(()=>{const shownModel=models.find(m=>m.model===shownValue('model',model))||chosen,efforts=shownModel?.supportedReasoningEfforts||[];
        return [shownModel&&!efforts.length
          ? row('effort',t('Reasoning effort'),t('Not available for this model.'),<SourceSelect label={t('Default reasoning effort')} value="default" disabled items={[{value:'default',label:t('Model default')}]} onChange={()=>{}}/>)
          : row('effort',t('Reasoning effort'),t('Available levels come from the selected model.'),<SourceSelect label={t('Default reasoning effort')} value={shownValue('effort',effort)} disabled={busy||!chosen} items={efforts.map(e=>({value:e.reasoningEffort,label:effortName(e.reasoningEffort)}))} onChange={value=>save('effort',value)}/>)];})(),
      // Several faster tiers (Fast, Ultrafast): a Speed select of Standard and each tier in place of the Fast switch.
      speeds.length>1
        ? row('fast',t('Speed'),t('Faster tiers answer sooner and use more of your plan. Applies to your next message.'),<SourceSelect label={t('Speed')} align="end" className="sselect-width-160" disabled={!boot?.connected||busy}
            value={tierForSpeed(chosen,shownValue('speed',savedSpeed(config)))?.key??STANDARD_SPEED} onChange={value=>save('speed',value,'fast')}
            items={[{value:STANDARD_SPEED,label:t('Standard')},...speeds.map(tier=>({value:tier.key,label:tier.name,...(tier.description?{description:tier.description}:{})}))]}/>)
        : row('fast',t('Fast mode'),fast ? t('{description}. Applies to your next message.',{description:fast.description || t('Uses the model’s Fast service tier')}) : t('Not available for this model.'),<SettingSwitch label={t('Enable fast mode')} checked={!!fast&&!!shownValue('fastMode',config.fastMode)} disabled={!fast||!boot?.connected||busy} onChange={value=>save('fastMode',value,'fast')}/>),
      // The Codex core's own web search mode and personality (main.cjs adds them to its thread and turn requests).
      ...(codexNative?[
        row('codexWebSearch',t('Web search'),t('Whether Codex can search the web: cached results, live results, or not at all. Applies to sessions you start or reopen.'),<SourceSelect label={t('Web search')} value={shownValue('codexWebSearch',config.codexWebSearch)||'default'} disabled={busy} onChange={value=>save('codexWebSearch',value)}
          items={[{value:'default',label:t('Codex default')},{value:'cached',label:t('Cached')},{value:'live',label:t('Live')},{value:'disabled',label:t('Off')}].filter(item=>item.value==='default'||!Array.isArray(desktop?.requirements?.requirements?.allowedWebSearchModes)||desktop.requirements.requirements.allowedWebSearchModes.includes(item.value))}/>),
        row('codexPersonality',t('Response style'),chosen?.supportsPersonality===false?t('Not available for this model.'):t('How Codex talks to you. Applies to your next message.'),<SourceSelect label={t('Response style')} value={shownValue('codexPersonality',config.codexPersonality)||'default'} disabled={busy||chosen?.supportsPersonality===false} onChange={value=>save('codexPersonality',value)}
          items={[{value:'default',label:t('Codex default')},{value:'friendly',label:t('Friendly'),description:t('Warm, collaborative, and helpful.')},{value:'pragmatic',label:t('Pragmatic'),description:t('Concise, task-focused, and direct.')},{value:'none',label:t('None')}]}/>),
        // Codex's /import: the Claude Code setup (CLAUDE.md, MCP servers, skills, hooks, commands, sessions).
        row('codexImport',t('Import from Claude Code'),t('Bring over your CLAUDE.md, MCP servers, skills, hooks, commands and recent sessions. You choose what to import.'),
          <SourceSettingsButton size="sm" disabled={!boot?.connected} onClick={()=>setClaudeImport(true)}>{t('Import…')}</SourceSettingsButton>),
      ]:[]),
      row('permissions',t('Permission mode'),t('Auto asks when needed. Manual always asks before making changes. Accept edits applies file edits without asking. Plan is read-only.'),<SourceSelect label={t('Default permission mode')} value={shownValue('permission',permission)} disabled={busy} onChange={value=>save('permission',value,'permissions')} items={[{value:'auto',label:t('Auto')},{value:'ask',label:t('Manual')},{value:'acceptEdits',label:t('Accept edits')},{value:'plan',label:t('Plan')},
        // Bypass as the default only while its opt-in (Code › Allow bypass permissions mode) is on; main re-checks it.
        ...(config.allowBypassPermissions===true?[{value:'bypass',label:t('Bypass permissions')}]:[])]}/>),
    ]},
    // Advanced › Codex permissions: Codex's permission profiles (codex-permissions.mjs; its /permissions): what Auto, Manual
    // and Accept edits may write and reach. 'Follow config.toml' keeps default_permissions; Plan and Bypass keep their own sandbox.
    ...(codexNative&&desktop?.codexPermissions?[{tab:'advanced',title:'Codex permissions',rows:[(()=>{const info=desktop.codexPermissions,profiles=info.profiles||[],configured=info.configured&&!info.configured.startsWith(':')?info.configured:null;
          const saved=shownValue('codexPermissionProfile',info.choice??null),value=saved===null||saved===undefined?'config':saved===''?'app':saved;
          const appDescription=info.writableRoots?.length||info.networkAccess?t('The session folder plus the writable folders and network setting in your Codex config.toml.'):t('The session folder, as set by the mode.');
          return row('codexPermissionProfile',t('Permission profile'),t('What Codex may write and reach in Auto, Manual and Accept edits. Plan and Bypass keep their own access. Applies to your next message.'),
            <SourceSelect label={t('Permission profile')} align="end" value={value} disabled={busy} onChange={next=>save('codexPermissionProfile',next==='config'?null:next==='app'?'':next)}
              items={[{value:'config',label:configured?t('Follow config.toml ({profile})',{profile:configured}):t('Follow config.toml'),description:configured?(profiles.find(p=>p.id===configured)?.description??null):appDescription},
                {value:'app',label:t('OpenClaude Desktop sandbox'),description:appDescription},
                ...profiles.map(profile=>({value:profile.id,label:profile.id,description:profile.allowed?profile.description:t('Not allowed by your organization'),disabled:!profile.allowed}))]}/>);})()]}]:[]),
    // The agent's own settings it lets OpenClaude Desktop change (core-settings-model.mjs labels): applied when its process
    // next starts (an idle session restarts at once).
    ...(coreSettings?.settings?.length?[{tab:'advanced',title:t('{core} settings',{core:coreName(boot?.core)}),rows:coreSettings.settings.map(setting=>{
      const {label,description}=coreSettingLabel(setting.key,boot?.core),id=`core-${setting.key}`,current=setting.value??setting.default;
      const control=setting.type==='boolean'?<SettingSwitch label={label} checked={current===true} disabled={busy} onChange={value=>writeCoreSetting(setting.key,value)}/>
        :setting.type==='select'?<SourceSelect label={label} align="end" value={setting.value??'__default'} disabled={busy} onChange={value=>writeCoreSetting(setting.key,value==='__default'?null:value)}
          items={[{value:'__default',label:coreSettingDefault(setting)},...setting.options.map(option=>({value:option,label:coreSettingOptionLabel(setting.key,option)}))]}/>
        :<input data-cds="TextInput" className="cds-input cds-reset" aria-label={label} defaultValue={setting.value??''} placeholder={coreSettingDefault(setting)} disabled={busy}
          inputMode={setting.type==='string'?undefined:'decimal'} key={`${setting.key}:${setting.value}`}
          onBlur={event=>{const text=event.target.value.trim();const value=!text?null:setting.type==='string'?text:Number(text);if(value===setting.value||(value===null&&setting.value===null))return;if(value!==null&&setting.type!=='string'&&!Number.isFinite(value)){event.target.value=setting.value??'';return;}writeCoreSetting(setting.key,value);}}
          onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>;
      return row(id,label,description,control);
    })}]:[]),
    ...(harnessSettings?.settings?.length?[{tab:'advanced',title:'DeepSeek settings',rows:harnessSettings.settings.map(setting=>{
      const {label,description,scale=1,suffix=''}=harnessSettingCopy(setting),id=`dsh-${setting.ns}-${setting.key}`;
      const shown=value=>value===null||value===undefined?'':setting.type==='integer'?String(Math.round(value/scale*100)/100):String(value);
      const control=<span className="ss-dsh-setting">
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={label} defaultValue={setting.overridden?shown(setting.value):''} placeholder={setting.default!==null&&setting.default!==undefined?t('Default: {value}',{value:`${shown(setting.default)}${suffix}`}):t('Default')}
          inputMode={setting.type==='integer'?'decimal':'url'} disabled={busy||harnessSettings.writable===false} key={`${id}:${setting.value}:${setting.overridden}`}
          onBlur={event=>{const text=event.target.value.trim();if(!text){if(setting.overridden)writeHarnessSetting(setting,null);return;}
            const value=setting.type==='integer'?Math.round(Number(text)*scale):text;if(setting.type==='integer'&&!Number.isFinite(value)){event.target.value=setting.overridden?shown(setting.value):'';return;}
            if(setting.overridden&&value===setting.value)return;writeHarnessSetting(setting,value);}}
          onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>
        {suffix&&<span className="ss-dsh-unit">{suffix.trim()}</span>}
        {setting.overridden&&<SourceSettingsButton size="sm" variant="ghost" disabled={busy} onClick={()=>writeHarnessSetting(setting,null)}>{t('Reset')}</SourceSettingsButton>}
      </span>;
      return row(id,label,description,control);
    })}]:[]),
    // Codex /memories: the feature, whether new sessions use and make memories, and a confirmed reset (memory/reset).
    ...(codexFeatures?.memories?[{tab:'code',title:'Memories',rows:[
      row('codex-memories',t('Memories'),t('Let Codex remember useful details from your sessions and use them in new ones. Off by default; changes apply to new sessions.'),
        <SettingSwitch label={t('Memories')} checked={codexFeatures.memories.enabled} disabled={busy} onChange={value=>codexFeature('codex-memories',{op:'set-feature',name:'memories',enabled:value})}/>),
      ...(codexFeatures.memories.enabled?[
        row('codex-use-memories',t('Use memories'),t('New sessions can draw on what Codex remembered.'),
          <SettingSwitch label={t('Use memories')} checked={codexFeatures.memories.useMemories} disabled={busy} onChange={value=>codexFeature('codex-use-memories',{op:'set-memories',useMemories:value})}/>),
        row('codex-generate-memories',t('Generate memories'),t('Codex keeps memories from your sessions, the current one included. Turn off to keep sensitive work out of them.'),
          <SettingSwitch label={t('Generate memories')} checked={codexFeatures.memories.generateMemories} disabled={busy} onChange={value=>codexFeature('codex-generate-memories',{op:'set-memories',generateMemories:value})}/>),
      ]:[]),
      row('codex-reset-memories',t('Reset all memories'),
        `${t('Clears what Codex remembered on this computer. Your sessions stay.')}${Number.isFinite(codexFeatures.memories.status?.threads)?` ${tn(codexFeatures.memories.status.threads,'{count} session summarized so far.','{count} sessions summarized so far.')}`:''}`,
        <SourceSettingsButton size="sm" variant="secondary" disabled={busy} onClick={()=>{if(window.confirm(t('Reset all memories? Codex forgets everything it remembered on this computer. This can’t be undone.')))codexFeature('codex-reset-memories',{op:'reset-memories',confirmed:true});}}>{t('Reset…')}</SourceSettingsButton>),
    ]}]:[]),
    // Codex Remote Control (`codex remote-control`): reach this Mac's Codex sessions from the ChatGPT app on another device.
    ...(remote?[{tab:'code',title:t('Remote control'),rows:[
      row('remote-control',t('Remote control'),`${t('Check on and answer Codex sessions on this Mac from the ChatGPT app on your phone or another computer, signed in to the same ChatGPT account.')} ${t('Status: {status}',{status:remoteStatusLabel(remote.status)})}`,
        <SettingSwitch label={t('Remote control')} checked={remoteEnabled(remote.status)} disabled={busy||account?.type!=='chatgpt'} onChange={value=>setRemoteControl(value)}/>),
      ...(account?.type!=='chatgpt'?[row('remote-signin',t('Needs a ChatGPT sign-in'),t('Remote control works through your ChatGPT account. Sign in with ChatGPT under Account to use it.'),null)]:[]),
      ...(remoteEnabled(remote.status)?[
        row('remote-pair',t('Pair a device'),pairing&&pairingTimeLeft(pairing.expiresAt,remoteNow)
          ?t('In the ChatGPT app, enter {code}. The code expires in {time}.',{code:pairing.manualPairingCode||pairing.pairingCode,time:pairingTimeLeft(pairing.expiresAt,remoteNow)})
          :t('Get a short code to enter in the ChatGPT app on the device you want to use.'),
          pairing&&pairingTimeLeft(pairing.expiresAt,remoteNow)
            ?<span className="ss-remote-code"><code data-remote-pairing-code="">{pairing.manualPairingCode||pairing.pairingCode}</code><SourceSettingsButton size="sm" variant="ghost" onClick={()=>setPairing(null)}>{t('Cancel')}</SourceSettingsButton></span>
            :<SourceSettingsButton size="sm" variant="secondary" disabled={busy} onClick={()=>startPairing()}>{t('Pair a device')}</SourceSettingsButton>),
        ...remoteDevices.filter(device=>device&&typeof device.clientId==='string').map(device=>row(`remote-device-${device.clientId}`,deviceName(device),deviceDetail(device,getLocale(),remoteNow),
          <SourceSettingsButton size="sm" variant="ghost" disabled={busy} onClick={()=>revokeDevice(device)}>{t('Remove')}</SourceSettingsButton>)),
      ]:[]),
    ]}]:[]),
    // Codex /experimental: its beta features (Worktrees and Prevent sleep are OpenClaude Desktop's own). Codex reads them at start.
    ...(codexFeatures?.beta?.length?[{tab:'advanced',title:'Beta features',rows:[
      ...codexFeatures.beta.map(feature=>row(`codex-beta-${feature.name}`,t(feature.displayName),
        [t(feature.description),feature.name==='realtime_conversation'?t('Voice isn’t in OpenClaude Desktop yet; it works with /voice in the Codex terminal.'):''].filter(Boolean).join(' '),
        <SettingSwitch label={t(feature.displayName)} checked={feature.enabled} disabled={busy} onChange={value=>codexFeature(`codex-beta-${feature.name}`,{op:'set-feature',name:feature.name,enabled:value},{restart:true})}/>)),
      ...(codexRestart?[row('codex-beta-restart',t('Restart Codex to apply'),t('Beta features take effect when Codex starts.'),
        <SourceSettingsButton size="sm" variant="primary" disabled={busy||!customize?.onRestartCore} onClick={()=>{setCodexRestart(false);customize?.onRestartCore?.();}}>{t('Restart')}</SourceSettingsButton>)]:[]),
    ]}]:[]),
    ...(historySources?.length?[{tab:'code',title:t('Import sessions'),rows:[row('history-import',t('Import sessions from other tools'),
      historyImport?.stats?t('Imported {imported} of {scanned} sessions ({skipped} already here). Open them from Resume a session.',{imported:historyImport.stats.imported??0,scanned:historyImport.stats.scanned??0,skipped:(historyImport.stats.skipped??0)+(historyImport.stats.resynced??0)})
        :t('{core} can copy your Claude Code, Codex or OpenCode conversations into its own history. Nothing is imported until you choose.',{core:coreName(boot?.core)}),
      <span className="ccmd-actions">{historySources.map(source=><SourceSettingsButton key={source} size="sm" busy={historyImport?.busy&&historyImport.source===source} disabled={busy||!!historyImport?.busy}
        onClick={()=>void importHistory(source)}>{source==='cc'?'Claude Code':source==='codex'?'Codex':'OpenCode'}</SourceSettingsButton>)}</span>)]}]:[]),
    // The DeepSeek core's uploads besides the model request (code-desktop-app cordis.patch.yml, main.cjs
    // CODE_DESKTOP_SHARE_*): off unless the user turns them on, as the official app's switch allows. A change restarts
    // the core so the next request follows it.
    ...(coreSupports(engine,'harnessProfile')?[{tab:'code',title:'Privacy',rows:[
      row('deepseekSessionLog',t('Share session logs with DeepSeek'),t('With the official DeepSeek API, each request also uploads this session’s log (your prompts, file contents the agent read, command output and the working folder) and the list of installed Harness plugins. Restarts the core.'),
        <SettingSwitch label={t('Share session logs with DeepSeek')} checked={shownValue('deepseekSessionLog',config.deepseekSessionLog)===true} disabled={busy} onChange={value=>commit('deepseekSessionLog',{deepseekSessionLog:value},async()=>{await onSave({deepseekSessionLog:value});customize?.onRestartCore?.();})}/>),
      row('deepseekFeedbackSharing',t('Share feedback with DeepSeek'),t('/feedback uploads this session so far to DeepSeek with an anonymous ID. When off, feedback stays on this computer. Restarts the core.'),
        <SettingSwitch label={t('Share feedback with DeepSeek')} checked={shownValue('deepseekFeedbackSharing',config.deepseekFeedbackSharing)===true} disabled={busy} onChange={value=>commit('deepseekFeedbackSharing',{deepseekFeedbackSharing:value},async()=>{await onSave({deepseekFeedbackSharing:value});customize?.onRestartCore?.();})}/>),
    ]}]:[]),
    // c71860c77-C_7Gqn1u Qn (:3708-3712): the page's group is 'System' (id general-desktop).
    // c71860c77-B72Ova_w It: version (wt renders nothing until the version is known), Run on startup, Menu bar,
    // Storage. Its own 'Keep computer awake' (scheduled tasks while the app is open) has no local counterpart;
    // the Code page's keep-awake rows stay on the Code page. While the desktop snapshot loads, the fallback
    // branch draws three skeleton rows under the version row.
    {tab:'general',title:'System',skeleton:desktop===null,rows:[
      ...(build?.version?[row('version',t('Desktop app version'),'',<span className="ss-version">{build.version}</span>)]:[]),
      row('startup',t('Run on startup'),t('Automatically start OpenClaude Desktop when you log in to your computer.'),<SettingSwitch label={t('Run on startup')} checked={shownValue('runOnStartup',desktop?.desktop?.runOnStartup)===true} disabled={!desktop?.desktop} onChange={enabled=>commit('startup',{runOnStartup:enabled},async()=>{const value=await desktopCall('desktop-startup',{enabled});setDesktop(current=>current?.desktop?{...current,desktop:{...current.desktop,runOnStartup:value===true}}:current);setDesktopRevision(n=>n+1);})}/>),
      booleanRow('menuBarEnabled',t('Menu bar'),t('Show OpenClaude Desktop in the menu bar.')),
      row('storage',t('Storage'),t('See how much space OpenClaude Desktop uses on this computer.'),<SourceSettingsButton size="sm" onClick={()=>setStorage(true)}>{t('Manage')}</SourceSettingsButton>),
    ]},
    {tab:'developer',title:'Local MCP servers',rows:[
      row('mcp-config',t('Configuration'),local.mcp,<button disabled={!boot?.connected} onClick={()=>action('mcp-config',()=>desktopCall('desktop-edit-config'))}>{t('Edit config')}</button>),
      ...(desktop?.servers||[]).map(server=>row('mcp-'+server.name,server.name,(server.toolsError&&t(server.toolsError))||`${tn(Object.keys(server.tools||{}).length,'{count} tool','{count} tools')} · ${server.authStatus}`,<span>{t(mcpStatus(server))}</span>)),
      ...(desktop?.servers?.length===0?[row('mcp-empty',t('No servers added'),'',null)]:[]),
    ]},
    {tab:'developer',title:'Local engine',rows:[
      // c71860c77-CCdfSDER F/I: the page's actions are CDS Buttons (shared-frame Ao); busy keeps the name 'Reconnect'.
      row('connection',local.label,boot?.connected?t('Connected'):t('Disconnected'),<SourceSettingsButton variant="secondary" size="sm" busy={pending==='reconnect'} disabled={busy} onClick={()=>action('reconnect',onReconnect)}>{t('Reconnect')}</SourceSettingsButton>),
      row('engine',t('Engine'),local.engine,null),
    ]},
  ];
  // Profile belongs in Preferences, before Appearance (c0db37792:1391–1403).
  groups.sort((a,b)=>a.tab==='preferences'&&b.tab==='preferences'?(['Profile','Persona',accountTitle,'Appearance'].indexOf(a.title)-['Profile','Persona',accountTitle,'Appearance'].indexOf(b.title)):0);
  // Only DeepSeek's Models page has a key field (its connection rows): elsewhere 'api key' doesn't lead there.
  const searchTabs=coreForEngine(typeof engine==='string'?engine:engine?.engine).id==='deepseek'?tabs:tabs.map(tab=>tab.id==='models'?{...tab,keywords:tab.keywords.filter(word=>word!=='api key')}:tab);
  const results=settingsSearch(searchTabs,[...groups,...settingsCatalogGroups(catalog,{cwd:customize?.cwd,threadId:customize?.threadId??null})],query),shown=groups.filter(group=>group.tab===tab&&group.title!=='Local MCP servers'&&!tabs.find(t=>t.id===group.tab)?.customize);
  const chooseResult=result=>{
    const destination=result.targetSection||result.tab;
    setTab(destination);setUsageFocused(false);setQuery('');setSearchOpen(false);setSearchIndex(0);
    setFocus(result.focus||((result.kind==='more'&&destination.startsWith('customize-'))?{searchSeed:query.trim()}:null));
    setHighlight(!result.subpathId&&result.id?{id:result.id}:null);search.current?.blur();root.current?.focus();
  };
  useEffect(()=>{if(searchOpen)root.current?.querySelector('.ss-search-results [data-highlighted]')?.scrollIntoView({block:'nearest'});},[query,searchIndex,searchOpen]);
  const activeTab=tabs.find(t=>t.id===tab);
  // coreBusy: any session's turn or approval is live (switching or removing the running core stops it); busy covers
  // only the open session, so it stands in until the app passes coreBusy.
  // onOpenSetting(tab,rowId): a page's link to a setting whose home is another page (Theme › Light or dark → Preferences
  // › Theme), opened with the same anchor highlight as 'tab#rowId'.
  const openSetting=(section,rowId)=>{if(!tabs.some(entry=>entry.id===section))return;setTab(section);setUsageFocused(false);setQuery('');setFocus(null);if(rowId)setHighlight({id:rowId});};
  const pageProps={config,boot,model,effort,busy,coreBusy:coreBusy??busy,engine,desktopCall,onSave,onReconnect,onSwitchCore,onQuickSetup,onOpenSetting:openSetting,customize,cwd:customize?.cwd??config.cwd,threadId:customize?.threadId??null};
  const customizePage=activeTab?.customize&&customize ? <SourceCustomize key={JSON.stringify([tab,customize.cwd,customize.threadId])} section={tab} store={customize.store} threadId={customize.threadId} cwd={customize.cwd} call={customize.call}
    core={boot?.core} onEditConfig={boot?.connected?()=>desktopCall('desktop-edit-config'):undefined}
    onUseSkill={customize.onUseSkill} onOpenExternal={customize.onOpenExternal} onRevealPath={customize.onRevealPath} focus={focus} mcpDefinitions={desktop?.mcpDefinitions} mcpServers={desktop?.servers}
    onRestartCore={customize.onRestartCore} onHarnessCall={payload=>desktopCall('harness-profile',payload)}
    onNavigate={(section,target)=>{setFocus(target||null);setTab(section);setQuery('');}} /> : null;
  const closeSearch=()=>{setSearchOpen(false);setQuery('');setSearchIndex(0);};
  // cc011544b _t: the field (icon + input, no clear button; Escape clears) focuses its input when clicked.
  const searchField=<div className="ss-search" onClick={event=>{if(!event.target.closest?.('.ss-search-results'))search.current?.focus();}}><Icon name="Search" size={20}/>
    <input ref={search} aria-label={t('Search settings')} placeholder={t('Search')} value={query} aria-expanded={searchOpen}
      onBlur={closeSearch}
      onChange={event=>{setQuery(event.target.value);setSearchIndex(0);setSearchOpen(event.target.value.trim()!=='');}}
      onKeyDown={event=>{
        if(event.nativeEvent.isComposing){if(event.key==='Escape')event.stopPropagation();return;}
        if(!searchOpen)return;
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSearch();search.current?.blur();}
        else if(event.key==='Tab')closeSearch();
        else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setSearchIndex(index=>(index+(event.key==='ArrowDown'?1:-1)+Math.max(1,results.length))%Math.max(1,results.length));}
        else if(event.key==='Enter'){event.preventDefault();if(results[searchIndex])chooseResult(results[searchIndex]);}
      }}/>
    {searchOpen&&<SettingsSearchResults results={results} query={query} active={searchIndex} onActive={setSearchIndex} onSelect={chooseResult}/>}
  </div>;
  const selectTab = id => { setTab(id);setUsageFocused(false);setQuery('');setError('');setFocus(null);setHighlight(null);setSearchOpen(false); };
  // Official Customize nav entries are links (shared-22 :2568-2593 href /customize/skills …) and a detail is a query on
  // that route, so clicking the current Customize entry from a skill, connector or plugin detail returns to its list:
  // a fresh reset token re-runs the page's useCatalogNavigation (focus null would be a no-op when already null).
  const customizeNavFocus = entry => entry.customize&&entry.id===tab?{reset:Date.now()}:null;
  const usagePage = tab==='usage'&&usageFocused;
  const usageIdentity=JSON.stringify([boot?.connected,account?.type,account?.email,account?.planType]);
  // shared-22:4511-4515 ye and cc011544b's page header CloseButton: both are named 'Close'.
  const closeButton = <button type="button" className="ss-close" aria-label={t('Close')} onClick={onClose}><Icon name="X" size={16}/></button>;
  return createPortal(<div className="ss-backdrop ss-settings-backdrop" data-open={presence.visible} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={root} className="ss-dialog ss-settings-dialog" data-usage={usagePage||undefined} data-open={presence.visible} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
    onKeyDown={e=>{if(!usagePage&&!narrow&&!e.altKey&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'){e.preventDefault();e.stopPropagation();search.current?.focus();search.current?.select();return;}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}if(e.key==='Tab'){const items=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&el.tabIndex>=0);const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===root.current)){e.preventDefault();first?.focus();}}}}>
    <h2 id={titleId} className="sr-only">{usagePage?t('Usage'):t('Settings')}</h2>
    {usagePage?<header className="ss-usage-header"><h2 className="text-heading-semibold" aria-hidden="true">{t('Usage')}</h2>{closeButton}</header>:narrow?<header className="ss-narrow"><div className="ss-narrow-heading"><strong aria-hidden="true">{t('Settings')}</strong>{closeButton}</div><div role="tablist" aria-label={t('Settings')} onKeyDown={event=>{
      const controls=[...event.currentTarget.querySelectorAll('[role="tab"]')], index=controls.indexOf(document.activeElement);
      if(index<0||event.nativeEvent.isComposing||event.altKey||event.metaKey||event.ctrlKey)return;
      const next=settingsTabIndex(index,controls.length,event.key,getComputedStyle(event.currentTarget).direction==='rtl');
      if(next===null)return;event.preventDefault();event.stopPropagation();setTabHighlight(navTabs[next]?.id??null);controls[next].focus();controls[next].scrollIntoView({block:'nearest',inline:'nearest'});
    }}>{navTabs.map(t=><button role="tab" aria-selected={tab===t.id} tabIndex={rovingTab===t.id?0:-1} key={t.id} onClick={()=>{selectTab(t.id);setFocus(customizeNavFocus(t));}}>{navLabel[t.id]}</button>)}</div></header>:<nav className="ss-nav" aria-label={t('Settings')}>{searchField}<div className="ss-nav-scroll scroll-fade-y scroll-fade-size-6">{navGroups.map(group=><div key={group}><p>{settingsHeading(group)}</p><ul>{navTabs.filter(t=>t.group===group).map(t=><li key={t.id}><button aria-current={tab===t.id?'page':undefined} onClick={()=>{selectTab(t.id);setFocus(customizeNavFocus(t));}}><Icon name={t.icon} size={20}/><span>{navLabel[t.id]}</span></button></li>)}</ul></div>)}</div></nav>}
    <div className="ss-pane" data-customize={!!activeTab?.customize||activeTab?.shell==='customize'}>
    {!usagePage&&!narrow&&<div className="ss-page-header">{closeButton}</div>}
    <div className="ss-content" key={tab} data-page={tab}>{error&&<p className="ss-error" role="alert">{error}</p>}{['code','developer','advanced'].includes(tab)&&desktopErrors(desktop?.errors).map(notice=><p className="ss-connection-notice" role="status" key={notice.key}>{notice.message}</p>)}{tab==='advanced'&&!shown.length&&<p className="ss-connection-notice" role="status">{advancedEmptyNotice(boot?.core&&typeof boot.core==='object'?coreName(boot.core):windowCore()?.name??(typeof engine==='string'?coreName(engine):null))}</p>}{tab==='developer'&&<DeveloperServers desktop={desktop} connected={boot?.connected} pending={!!pending} error={rowErrors['mcp-config']} onRemove={customize?.call&&mcpWritable ? removeServer : undefined} onEditConfig={()=>action('mcp-config',()=>desktopCall('desktop-edit-config'))} onDocs={()=>action('mcp-config',()=>desktopCall('external',{url:'https://modelcontextprotocol.io/quickstart'}))}/>} {customizePage}{activeTab?.page&&<activeTab.page {...pageProps}/>}{tab==='usage'&&<SourceUsage key={usageIdentity} readUsage={readUsage} consumeResetCredit={usageActions?.consumeResetCredit} sendCreditsNudge={usageActions?.sendCreditsNudge} engine={engine} models={models} onOpenLink={url=>Promise.resolve(desktopCall('external',{url})).catch(()=>{})}/>} {shown.map(group=><section className="ss-group" key={group.tab+group.title}><h3 tabIndex={-1} className="text-heading-semibold settings-row-title">{settingsHeading(group.title)}</h3><div className="settings-group-dividers">{(group.skeleton?group.rows.filter(row=>row.id==='version'):group.rows).map(row=><SettingRow key={row.id} row={row} error={rowErrors[row.id]}/>)}{group.skeleton&&[0,1,2].map(index=><SettingSkeletonRow key={index}/>)}</div></section>)}
      {claudeImport&&<ClaudeImportDialog open desktopCall={desktopCall} cwds={[customize?.cwd].filter(Boolean)} onClose={()=>setClaudeImport(false)}
        onDone={()=>{void customize?.store?.loadSkills?.({cwd:customize?.cwd,force:true});void customize?.store?.loadMcp?.({cwd:customize?.cwd,threadId:customize?.threadId??null,force:true});setDesktopRevision(n=>n+1);}}/>}</div></div>
  </section>{storage&&<StorageDialog call={desktopCall} settingsRoot={root} onClose={()=>setStorage(false)}/>}
  <SourcePreviewAllowedSites isOpen={allowedSites} onClose={()=>setAllowedSites(false)} desktop={allowedSitesHost} layer={ALLOWED_SITES_LAYER}/></div>,document.body);
}
// c71860c77-B72Ova_w It fallback: a row of two text bars (h-5 w-36 / h-5 w-72) beside a 40×24 pill, drawn with
// the shared-frame Skeleton classes from the loaded CDS stylesheet (role=status, sr-only "Loading").
const SKELETON_BAR='relative max-w-full overflow-hidden bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden';
const SkeletonBar=({className,radius='rounded'})=><div data-cds="Skeleton" role="status" className={`${SKELETON_BAR} ${radius} ${className}`}><span className="sr-only">{t('Loading')}</span></div>;
function SettingSkeletonRow() {
 return <div className="ss-skeleton-row flex items-center justify-between gap-lg" data-settings-skeleton="">
   <div className="flex min-w-0 flex-1 flex-col gap-1"><SkeletonBar className="h-5 w-36"/><SkeletonBar className="h-5 w-72"/></div>
   <SkeletonBar className="h-6 w-10" radius="rounded-full"/>
 </div>;
}
