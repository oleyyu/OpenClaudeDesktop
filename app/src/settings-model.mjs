// Independent settings search, cc011544b ft/Z:535–711. Only index rendered
// capabilities. Ranking normalization is distinct from literal visual marks.
import { t, dictionary, getAssistantName } from '../electron/i18n/index.mjs';
import { allCores, coreAssistant, coreCapabilities, coreForEngine, coreName, coreSupports } from '../electron/core-registry.mjs';
// Search matches both languages: section labels and keywords hold the English
// copy (their translation is also tried); row labels hold the shown (translated)
// text, so its English sources are tried as well. In en-US both are the label.
let sourceIndex=null;
function englishSources(text){
 const table=dictionary();if(!table||typeof text!=='string')return [];
 if(sourceIndex?.table!==table){const map=new Map();for(const [source,shown] of Object.entries(table)){const list=map.get(shown);if(list)list.push(source);else map.set(shown,[source]);}sourceIndex={table,map};}
 return sourceIndex.map.get(text)||[];
}
// A settings page or group name whose English is also a different word elsewhere ('System' is the theme choice
// "follow the system" and, since shared-19 ZC, the This computer › System page): its own entry
// ('settings heading: System' in zh-CN/settings.mjs) wins over the plain one.
export function settingsHeading(text){if(typeof text!=='string')return text;const key=`settings heading: ${text}`,shown=t(key);return shown===key?t(text):shown;}
const searchTexts=text=>{if(typeof text!=='string')return [text];const shown=t(text);return [...new Set([text,shown,settingsHeading(text),...englishSources(text)])];};
// A section keyword ('dark mode', 'api key') as the reader's language shows it: its own entry ('settings keyword: dark
// mode' in zh-CN/settings.mjs), so a short word never takes an unrelated translation of the same English ('agent').
// An entry may list synonyms with '|' ('深色模式|暗色模式'): all are searched, the first is shown.
const keywordForms=word=>{const key=`settings keyword: ${word}`,shown=t(key);return shown===key?[word]:shown.split('|').map(part=>part.trim()).filter(Boolean);};
export function settingsKeyword(word){return keywordForms(word)[0]??word;}
const keywordTexts=word=>[...new Set([word,...keywordForms(word)])];
export function normalizeSettingsQuery(value) {
 return String(value).normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"').replace(/[\s_-]+/g, ' ').trim();
}
// expanded: section ids whose "+N more" was opened in place (3.6556.2 cc011544b dn's third argument): all their rows
// are children and no more row follows.
function searchSettingsRows(sections, groups, query, expanded) {
 const normalized=normalizeSettingsQuery(query),terms=normalized.split(' '),needle=normalized.replaceAll(' ','');
 const rankOne=value=>{
  const words=normalizeSettingsQuery(value).split(' '),flat=words.join('');
  if(flat===needle)return 0;
  if(flat.startsWith(needle))return 1;
  if(!terms.every(term=>flat.includes(term)))return -1;
  return terms.every(term=>words.some((_,index)=>words.slice(index).join('').startsWith(term)))?2:3;
 };
 const rank=value=>searchTexts(value).reduce((best,text)=>{const score=rankOne(text);return score>=0&&(best<0||score<best)?score:best;},-1);
 const result=(section,kind='hit',row=null,extra={})=>({tab:section.id,section:settingsHeading(section.label),icon:section.icon,kind,key:JSON.stringify([section.id,kind,row?.id||null]),label:row?.label||section.label,...(row?{id:row.id,via:row.label,subpathId:row.subpathId,focus:row.focus,targetSection:row.targetSection}:{}),...extra});
 if(!needle)return sections.map(section=>result(section));
 const ranked=sections.flatMap(section=>{
  const seen=new Set();
  const rows=groups.filter(group=>group.tab===section.id).flatMap(group=>group.rows).map(row=>({row,score:rank(row.searchLabel||row.label)}))
   .filter(entry=>entry.score>=0).sort((a,b)=>a.score-b.score).filter(({row})=>{const key=row.collapseKey||JSON.stringify([row.label,row.subpathId||null]);if(seen.has(key))return false;seen.add(key);return true;});
  const nameRank=rank(section.label);
  if(nameRank>=0)return [{section,score:nameRank,nameMatched:true,rows}];
  if(rows.length)return [{section,score:4+rows[0].score,nameMatched:false,rows}];
  const word=(section.keywords||[]).find(entry=>keywordTexts(entry).some(text=>normalizeSettingsQuery(text).replaceAll(' ','').includes(needle)));
  return word?[{section,score:8,keyword:settingsKeyword(word),rows:[]}]:[];
 }).sort((a,b)=>a.score-b.score);
 const usedLabels=new Set(),hits=[];
 for(const {section,score,nameMatched,rows,keyword} of ranked){
  if(keyword){hits.push(result(section,'hit',null,{score,via:keyword}));continue;}
  const mayRepeat=section.customize||section.id==='connectors';
  const available=mayRepeat?rows:rows.filter(({row})=>!usedLabels.has(row.label));
  const addRow=(entry,kind)=>{if(!mayRepeat)usedLabels.add(entry.row.label);hits.push(result(section,kind,entry.row,{score}));};
  if(needle.length<2){
   if(nameMatched)hits.push(result(section,'hit',null,{score}));
   else if(available[0]&&available[0]===rows[0])addRow(available[0],'hit');
   continue;
  }
  if(!nameMatched&&available.length===1){addRow(available[0],'hit');continue;}
  if(!nameMatched&&!available.length)continue;
  hits.push(result(section,'hit',null,{score}));
  const shown=expanded?.has(section.id)?available.length:3;
  available.slice(0,shown).forEach(entry=>addRow(entry,'child'));
  if(available.length>shown)hits.push(result(section,'more',null,{score,count:available.length-shown}));
 }
 return hits;
}
// A plugin skill visible under Skills should not appear a second time under
// Plugins. Hidden entries behind +N more remain eligible (source D:933–959).
export function settingsSearch(sections,groups,query,expanded) {
 const skills=searchSettingsRows(sections.filter(section=>section.id==='customize-skills'),groups,query);
 const visible=new Set(skills.filter(hit=>hit.kind!=='more'&&Array.isArray(hit.subpathId)).map(hit=>JSON.stringify(hit.subpathId)));
 const filtered=visible.size?groups.map(group=>group.tab==='customize-plugins'?{...group,rows:group.rows.filter(row=>!Array.isArray(row.subpathId)||!visible.has(JSON.stringify(row.subpathId)))}:group):groups;
 return searchSettingsRows(sections,filtered,query,expanded);
}
// shared-14 Cy/Ty: first literal lower-case substring only. Map back to original
// UTF-16 offsets so expanding case folds (İ) cannot split or eat adjacent text.
export function settingsMatchRange(text,query) {
 const needle=String(query).trim().toLowerCase();if(!needle)return null;
 const folded=text.toLowerCase(),start=folded.indexOf(needle);if(start<0)return null;
 if(text.length===folded.length)return {start,end:start+needle.length};
 const starts=[],ends=[];let offset=0;
 for(const char of text){for(let i=0;i<char.toLowerCase().length;i++){starts.push(offset);ends.push(offset+char.length);}offset+=char.length;}
 return {start:starts[start],end:ends[start+needle.length-1]};
}
// engine: coreEngine(boot.core) (a core id), or boot.core itself. The row names the running core, never a fixed
// DeepSeek: the copy is keyed on the core's descriptor (core-registry), not on which capabilities happen to match.
//   DeepSeek Harness   no sandbox config, only per-session permission presets chosen in the Mode menu (config/read
//                      reports the open session's, else the default preset).
//   no sandbox         a descriptor (or reported capability) `sandbox: false`: the agent runs approved commands
//                      unconfined, so the row says so instead of echoing a synthetic sandbox_mode.
//   permissionHints    other bridges: the Mode menu picks the session's permission mode.
//   others (Codex)     the app sets the sandbox per turn from the Mode menu; a sandbox_mode in the core's own
//                      configuration is only the default.
// reason and mode are display text, already translated (t() on them again is a no-op); mode is null only when the
// configuration couldn't be read.
export const DEEPSEEK_SANDBOX_REASON='Set per session with the Mode menu (DeepSeek Harness permission presets).';
export const MODE_MENU_SANDBOX_REASON='Set per session with the Mode menu.';
export function sandboxFacts(configResult,requirementsResult,{engine='codex'}={}) {
 const config=configResult?.config,requirements=requirementsResult?.requirements;
 const managed=Object.entries(configResult?.origins||{}).some(([key,value])=>['sandbox_mode','approval_policy'].includes(key)&&['mdm','enterpriseManaged','system','legacyManagedConfigToml','legacyManagedRequirementsToml'].includes(value?.name?.type||value?.source?.type));
 const limited=!!requirements?.allowedSandboxModes||!!requirements?.allowedApprovalPolicies;
 const descriptor=coreForEngine(typeof engine==='string'?engine:engine?.engine),core=descriptor.name;
 const unsandboxed=descriptor.sandbox===false||coreCapabilities(engine).sandbox===false;
 const configured=config?.sandbox_mode??null;
 const reason=managed||limited?t('Managed by your organization')
  :!config?t('{core} configuration is unavailable.',{core})
  :unsandboxed?t('{core} doesn’t sandbox commands. The Mode menu sets which ones need your approval.',{core})
  :descriptor.id==='deepseek'?t(DEEPSEEK_SANDBOX_REASON)
  :coreSupports(engine,'permissionHints')||configured===null?t(MODE_MENU_SANDBOX_REASON)
  :t('The Mode menu sets this for each message, overriding your {core} configuration. Choose Bypass permissions for full access.',{core});
 return {mode:!config?null:unsandboxed?t('None'):configured??t('Per session'),bypass:config?config.sandbox_mode==='danger-full-access'&&config.approval_policy==='never':null,
  reason,allowedModes:requirements?.allowedSandboxModes??null};
}
// The core this window runs, for copy whose caller has no boot.core: the descriptor whose assistant names the copy
// (i18n getAssistantName; main sets it from the chosen core, and the window reloads when that changes), or null.
export function windowCore() {
 const name=getAssistantName();
 return allCores().find((core)=>core.available!==false&&coreAssistant(core)===name)??null;
}
// desktop-settings-read failures → page notices. Raw RPC text (a method the
// core lacks, a refused read) never becomes a page alert: the affected rows
// already read as unavailable. Only losing the core gets one short notice, naming that core: engine (boot.core or a
// core id, as sandboxFacts takes), else the core this window runs (windowCore).
export function desktopErrors(errors,{engine}={}) {
 if(!errors?.connection)return[];
 const running=engine?coreName(engine):windowCore()?.name;
 return[{key:'connection',message:running?t('Couldn’t load settings from {core}. Reconnect and try again.',{core:running}):t('Couldn’t load settings from the agent core. Reconnect and try again.')}];
}
export function mcpStatus(server){const state=server.runtimeStatus?.status||server.runtimeStatus?.type||server.runtimeStatus;return server.toolsError?'Failed':state==='connected'?'Running':state==='starting'?'Starting':state==='failed'?'Failed':state==='disabled'?'Disabled':state==='cancelled'?'Cancelled':state==='authenticationRequired'?'Sign in required':state==='notStarted'?'Not started':'Status unavailable';}
