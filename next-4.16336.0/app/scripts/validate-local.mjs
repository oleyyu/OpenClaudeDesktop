import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'), evidence=path.resolve(root,'../analysis/batch-20260920');
const args=process.argv.slice(2), skipBuild=args.includes('--skip-build');
const names=args.filter(a=>!a.startsWith('--'));
const standard=['protocol-0155-ui-test','settings-ui-test','account-lifecycle-ui-test','menu-bar-ui-test','sidebar-chrome-ui-test','turn-errors-ui-test','turn-timestamps-ui-test','files-pane-ui-test','changes-pane-ui-test','skills-mcp-ui-test','settings-rest-ui-test','session-actions-ui-test','code-ui-test','permission-ui-test','bypass-permission-ui-test','menus-states-ui-test','tooltip-ui-test','sidebar-ui-test','sidebar-rest-ui-test','session-ui-test','run-command-ui-test','edit-read-ui-test','subagents-ui-test','slash-commands-complete-ui-test','settings-complete-ui-test','background-tasks-ui-test','workflow-package-ui-test','workflows-ui-test','workflow-config-ui-test','approval-transport-ui-test','approval-card-ui-test','titlebar-ui-test','pane-ui-test','pane-layout-ui-test','split-windows-ui-test','file-search-ui-test','diff-ui-test','code-fence-ui-test','response-math-ui-test','highlight-ui-test','highlight-coalescing-ui-test','stream-highlight-ui-test','turn-footer-ui-test','user-actions-ui-test','composer-states-ui-test','home-page-ui-test','home-account-usage-ui-test','usage-ui-test','user-markdown-ui-test','rich-copy-ui-test','transcript-scroll-ui-test','scrollbar-mode-ui-test','transcript-fade-ui-test','transcript-states-ui-test','ui029-ui-test','integration-race-test','git-ui-test','git-rail-ui-test','git-band-ui-test','connection-lifecycle-test','shutdown-ui-test','file-search-shutdown-test','tool-profiles-ui-test','onboarding-ui-test','cores-ui-test','computer-use-ui-test','extension-packs-ui-test','bridge-account-ui-test','codex-signin-ui-test','terminal-ui-test','preview-ui-test','current-chat-ui-test','current-home-ui-test','current-library-ui-test','current-routines-ui-test','current-routine-form-ui-test','file-editor-ui-test'];
const steps=[...(!skipBuild?[{name:'build',cmd:'npm',args:['run','build']}]:[]),{name:'unit',cmd:'npm',args:['test']},...(names.length?names:standard).map(name=>({name,cmd:process.execPath,args:[`scripts/${name}.mjs`]})),{name:'integrity',cmd:process.execPath,args:['scripts/verify-build.mjs']}];
const stamp=new Date().toISOString().replaceAll(':','-'), logdir=path.join(evidence,`validation-${stamp}`);
await fs.mkdir(logdir,{recursive:true});
let report={startedAt:new Date().toISOString(),passed:false,steps:[]};
if(args.includes('--resume')){
  if(names.length||skipBuild)throw new Error('--resume requires the standard suite');
  const bytes=await fs.readFile(path.join(evidence,'validation-run.json'));
  const previous=JSON.parse(bytes),current=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
  if(previous.passed)throw new Error('The suite already passed; no resume needed');
  if(previous.build?.sourceSha256!==current.sourceSha256)throw new Error('Source build changed; start a fresh suite');
  for(const item of current.sources){if(createHash('sha256').update(await fs.readFile(path.join(root,item.path))).digest('hex')!==item.sha256)throw new Error('Source changed; start a fresh suite');}
  const reused=[];
  for(let index=0;index<previous.steps.length;index++){
    const step=previous.steps[index];if(!step.passed)break;
    if(step.name!==steps[index]?.name)throw new Error('Suite ordering changed; start a fresh suite');
    if(step.scriptSha256&&createHash('sha256').update(await fs.readFile(path.join(root,step.script))).digest('hex')!==step.scriptSha256)throw new Error('A passed test script changed; start a fresh suite');
    reused.push(step);
  }
  // Existing unit results predate harness hashing. Verify their inputs were not
  // edited after the run; subsequent resumes retain the original timestamps.
  const unit=reused.find(step=>step.name==='unit');
  if(unit)for(const name of await fs.readdir(path.join(root,'tests'),{recursive:true})){
    const info=await fs.stat(path.join(root,'tests',name));if(info.isFile()&&info.mtimeMs>Date.parse(unit.startedAt))throw new Error('Unit test input changed; start a fresh suite');
  }
  const source=path.join(logdir,'resumed-run.json');await fs.writeFile(source,bytes);
  report={...previous,passed:false,finishedAt:undefined,steps:reused,resumedAt:new Date().toISOString(),resumedFrom:{path:source,sha256:createHash('sha256').update(bytes).digest('hex'),reusedSteps:reused.map(step=>step.name)}};
}
for(const step of steps.slice(report.steps.length)){
 console.log(`START ${step.name}`);
 const startedAt=new Date().toISOString(), log=path.join(logdir,step.name+'.log');
 let output='';
 const child=spawn(step.cmd,step.args,{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});
 await fs.writeFile(log,output);
 const entry={name:step.name,startedAt,finishedAt:new Date().toISOString(),passed:code===0,exitCode:code,log};
 if(step.args[0]?.startsWith('scripts/')){entry.script=step.args[0];entry.scriptSha256=createHash('sha256').update(await fs.readFile(path.join(root,step.args[0]))).digest('hex');}
 report.steps.push(entry);
 if(step.name==='build'||skipBuild&&!report.build){try{report.build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));}catch{}}
 console.log(`${code===0?'PASS':'FAIL'} ${step.name}`);
 if(code!==0){console.error(output.slice(-8000));break;}
}
report.finishedAt=new Date().toISOString();report.passed=report.steps.length===steps.length&&report.steps.every(s=>s.passed);
await fs.writeFile(path.join(evidence,'validation-run.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,version:report.build?.version,sourceSha256:report.build?.sourceSha256,steps:report.steps.length,logs:logdir},null,2));
if(!report.passed)process.exitCode=1;
