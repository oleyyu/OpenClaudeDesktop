import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsCatalogGroups } from '../src/settings-catalog-search.mjs';
import { settingsSearch } from '../src/settings-model.mjs';
import { createCustomizeStore } from '../src/customize-store.mjs';
const cwd='/fixture';
const sections=['skills','connectors','plugins'].map(name=>({id:`customize-${name}`,label:name[0].toUpperCase()+name.slice(1),customize:true}));
const skill=(name,path=`/${name}/SKILL.md`,pluginId=null)=>({name,skillName:name,path,pluginId,enabled:false});
const catalog=(skills=[],plugins=[])=>({skills:{status:'ready',cwd,skills},plugins:{status:'ready',cwd,rows:plugins},mcp:{status:'ready',cwd,threadId:'thread',rows:[{name:'server-id',title:'Actual Connector'}]}});
const search=(snapshot,query)=>settingsSearch(sections,settingsCatalogGroups(snapshot,{cwd,threadId:'thread'}),query);

test('catalog search only uses observed ready catalogs in the requested workspace and thread',()=>{
 const snapshot=catalog([skill('Actual Skill')],[{id:'plugin-id',name:'Actual Plugin'}]);
 assert.equal(search(snapshot,'Actual').filter(row=>row.subpathId).length,3);
 assert.equal(settingsCatalogGroups(snapshot,{cwd:'/other',threadId:'thread'}).flatMap(group=>group.rows).length,0);
 assert.equal(settingsCatalogGroups(snapshot,{cwd,threadId:'other'})[1].rows.length,0);
 for(const status of ['loading','error','idle']){
  const stale=structuredClone(snapshot);for(const key of ['skills','plugins','mcp'])stale[key].status=status;
  assert.equal(search(stale,'Actual').length,0);
 }
 assert.equal(settingsCatalogGroups({}, {cwd}).flatMap(group=>group.rows).length,0);
});
test('same-name skills retain exact paths and disabled entries remain discoverable without a write',()=>{
 const snapshot=catalog([skill('Twin','/a/SKILL.md'),skill('Twin','/b/SKILL.md')]);
 const found=search(snapshot,'Twin').filter(row=>row.subpathId);
 assert.deepEqual(found.map(row=>row.focus.skillPath),['/a/SKILL.md','/b/SKILL.md']);
 assert.equal(new Set(found.map(row=>row.key)).size,2);
 assert.equal(snapshot.skills.skills[0].enabled,false);
 snapshot.skills.skills[0].name='Renamed';
 assert.equal(search(snapshot,'Renamed').find(row=>row.subpathId).focus.skillPath,'/a/SKILL.md');
 snapshot.skills.skills=[];assert.equal(search(snapshot,'Twin').length,0);
});
test('plugin-owned skills target the installed plugin and visible Skills results suppress duplicate Plugins hits',()=>{
 const snapshot=catalog([skill('Audit','/audit/SKILL.md','plugin-id'),skill('Orphan','/orphan/SKILL.md','missing')],[{id:'plugin-id',name:'Actual Plugin'}]);
 const hits=search(snapshot,'Audit');assert.equal(hits.length,1);
 assert.equal(hits[0].label,'Audit · Actual Plugin');
 assert.equal(hits[0].targetSection,'customize-plugins');
 assert.deepEqual(hits[0].subpathId,['plugin-id','Audit']);
 assert.deepEqual(hits[0].focus,{pluginId:'plugin-id',skillPath:'/audit/SKILL.md'});
 assert.equal(search(snapshot,'Orphan').length,0);
 assert.equal(search(snapshot,'Actual Plugin').filter(row=>row.subpathId==='plugin-id').length,1);
});
test('only visible plugin-skill hits deduplicate; hidden children still produce their own plugin destination',()=>{
 const skills=Array.from({length:5},(_,i)=>skill(`Audit ${i}`,`/audit-${i}/SKILL.md`,'plugin-id'));
 const hits=search(catalog(skills,[{id:'plugin-id',name:'Package'}]),'Audit');
 assert.equal(hits.find(row=>row.tab==='customize-skills'&&row.kind==='more').count,2);
 assert.deepEqual(hits.filter(row=>row.tab==='customize-plugins'&&row.subpathId).map(row=>row.focus.skillPath),['/audit-3/SKILL.md','/audit-4/SKILL.md']);
});
test('late workspace catalog replies cannot relabel stale paths as belonging to the new workspace',async()=>{
 const pending=[];
 const store=createCustomizeStore({call:(_action,params)=>new Promise(resolve=>pending.push({params,resolve}))});
 const a=store.loadSkills({cwd:'/old'}),b=store.loadSkills({cwd});
 assert.equal(settingsCatalogGroups(store.getSnapshot(),{cwd}).flatMap(group=>group.rows).length,0);
 pending[1].resolve({data:[{cwd,skills:[{...skill('New'),scope:'repo'}],errors:[]}]});await b;
 pending[0].resolve({data:[{cwd:'/old',skills:[{...skill('Old'),scope:'repo'}],errors:[]}]});await a;
 assert.equal(store.getSnapshot().skills.cwd,cwd);
 assert.deepEqual(settingsCatalogGroups(store.getSnapshot(),{cwd})[0].rows.map(row=>row.label),['New']);
 const pluginA=store.loadPlugins({cwd:'/old'}),pluginB=store.loadPlugins({cwd});
 pending[3].resolve({marketplaces:[]});await pluginB;
 pending[2].resolve({marketplaces:[]});await pluginA;
 assert.equal(store.getSnapshot().plugins.cwd,cwd);
 store.dispose();
});
