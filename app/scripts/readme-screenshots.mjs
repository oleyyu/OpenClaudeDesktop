// README screenshots: the real app (dist/) on the fixture core with made-up demo sessions, in an isolated
// throwaway profile, so no real session, folder, account or key can appear. Writes docs/images/*.png
// (Chinese, README.zh-CN.md) or, with README_LOCALE=en, docs/images/*-en.png (English, README.md).
//   cd app && npx vite build && node scripts/readme-screenshots.mjs && README_LOCALE=en node scripts/readme-screenshots.mjs
import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';
const english=process.env.README_LOCALE==='en',locale=english?'en-US':'zh-CN',suffix=english?'-en':'';
const T=s=>english?s:zh[s]??s;
// The demo's own words, per README language.
const D=english?{
 site:'My website',dark:'Add a dark mode to the site',darkAsk:'Add a dark mode to my website that follows the system setting',
 look:'Sure. First I’ll look at the current page structure and styles.',tests:'✓ Page renders in light mode\n✓ Page renders in dark mode\n\n2 passed',
 done:'Dark mode is in 🌙',
 reply:'Dark mode is in 🌙\n\n**What changed**\n\n- In `style.css`, the colors are now variables (`--bg`, `--text`)\n- When the system switches to dark, the page switches to a dark background with light text\n\n**How to check**\n\n| System appearance | Page background | Text color |\n| --- | --- | --- |\n| Light | White | Dark gray |\n| Dark | Dark gray | Off-white |\n\nSwitch it in System Settings › Appearance on your Mac to see the effect.',
 group:/Read 2 files/,
 bug:['The login button does nothing','The login button does nothing when I click it, can you take a look?','Found it: the click handler in `login.js` was attached before the page loaded. Fixed; reload the page and try again.'],
 readme:['Write a project README','Write a README for this project','Created `README.md` with an overview, install steps and usage.'],
 test:['Add unit tests for the cart','Add unit tests for the shopping cart','Added 12 tests, all passing ✅'],
 menu:['Make the nav menu mobile-friendly','The nav menu is cramped on phones. Turn it into a hamburger menu below 640px.','I’ll check how the menu is built first, then add the mobile styles and a toggle button.',
  ['Read the menu markup and styles','Add the hamburger button','Add the mobile styles','Run the tests'],'Added `.menu-toggle` and the mobile breakpoint; running the tests now.'],
 footer:['Add a site footer','Add a footer with the copyright and links to the About and Contact pages.','Done: the page now ends with a footer that has the copyright and the two links.',
  ['Add the footer markup','Style the footer','Check every page'],'Added the footer to index.html and styled it in style.css. Nothing is committed yet.','Commit the footer?','Yes, commit','Commit the footer changes','Show me first','Show me the diff before committing'],
 btw:['What does --bg do?','`--bg` is the **page background color** variable: white by default, dark gray when the system is in dark mode. Every color in `style.css` reads from these variables.'],
 deps:['Upgrade the build tools','Upgrade Vite to the latest version and make sure the build still works.','Vite 7 is out. I’ll upgrade it and then run the build.','Install the latest Vite as a dev dependency'],
 audit:['Audit every page in dark mode','Dark mode audit','Check every page in dark mode and fix contrast problems',['Survey','Audit','Fix'],['Find pages','Fix contrast']],
}:{
 site:'我的网站',dark:'给网页加上暗色模式',darkAsk:'给我的网页加上暗色模式，跟随系统设置自动切换',
 look:'好的，我先看一下现在的页面结构和样式。',tests:'✓ 页面在浅色模式下正常显示\n✓ 页面在暗色模式下正常显示\n\n2 passed',
 done:'暗色模式已经加好了',
 reply:'暗色模式已经加好了 🌙\n\n**改了什么**\n\n- 在 `style.css` 里把颜色改成了变量（`--bg`、`--text`）\n- 系统切到深色时，页面会自动换成深色背景和浅色文字\n\n**怎么验证**\n\n| 系统外观 | 页面背景 | 文字颜色 |\n| --- | --- | --- |\n| 浅色 | 白色 | 深灰 |\n| 深色 | 深灰 | 浅白 |\n\n在 Mac 的「系统设置 › 外观」里切换一下就能看到效果。',
 group:/读取了 2 个文件/,
 bug:['登录按钮点了没反应','登录按钮点了没反应，帮我看看','找到了：`login.js` 里的事件绑定写在页面加载之前。已经改好，刷新页面再试试。'],
 readme:['写一份项目说明','帮我写一份项目说明','已创建 `README.md`，包含项目介绍、安装步骤和使用方法。'],
 test:['为购物车加单元测试','为购物车加单元测试','新增 12 个测试，全部通过 ✅'],
 menu:['导航菜单适配手机','导航菜单在手机上太挤了，屏幕小于 640px 时改成汉堡菜单。','我先看一下菜单现在的结构，再加上手机样式和展开按钮。',
  ['读取菜单的结构和样式','添加汉堡按钮','添加手机端样式','运行测试'],'已加上 `.menu-toggle` 和手机断点，正在跑测试。'],
 footer:['添加网站页脚','给网站加一个页脚，包含版权信息和「关于」「联系我们」两个链接。','好了：页面底部加上了页脚，包含版权信息和两个链接。',
  ['添加页脚结构','编写页脚样式','检查所有页面'],'在 index.html 里加了页脚，并在 style.css 里写了样式，还没有提交。','要提交页脚的改动吗？','提交','提交页脚的改动','先给我看看','提交之前先给我看一下改动'],
 btw:['--bg 是做什么的？','`--bg` 是**页面背景色**变量：默认是白色，系统切到深色时变成深灰。`style.css` 里的颜色都从这些变量读取。'],
 deps:['升级构建工具','把 Vite 升级到最新版本，确认构建还能正常通过。','Vite 7 已经发布了。我来升级，然后跑一次构建。','安装最新版 Vite 作为开发依赖'],
 audit:['逐页检查暗色模式','暗色模式检查','逐页检查暗色模式下的显示，并修复对比度问题',['梳理','检查','修复'],['查找页面','修复对比度']],
};
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../docs/images');
await fs.mkdir(out,{recursive:true});
// /tmp when there is one: a short, anonymous folder in the cards that show the working directory.
const base=await fs.mkdtemp(path.join(await fs.stat('/tmp').then(()=>'/tmp',()=>os.tmpdir()),'readme-shots-'));
const now=Math.floor(Date.now()/1000);
const models=[
 {id:'deepseek-v4-pro',model:'deepseek-v4-pro',displayName:'DeepSeek V4 Pro',isDefault:true,defaultReasoningEffort:'high',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'medium'},{reasoningEffort:'high'}],serviceTiers:[]},
 {id:'deepseek-v4-flash',model:'deepseek-v4-flash',displayName:'DeepSeek V4 Flash',isDefault:false,defaultReasoningEffort:'medium',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'medium'},{reasoningEffort:'high'}],serviceTiers:[]},
];
// About four months of made-up, deterministic activity for the home page's stats card.
const day=offset=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const days=Array.from({length:120},(_,i)=>i).filter(i=>(i*7+3)%5!==0);
const level=i=>((i*37)%11)+(i<30?6:2);
const stats={
 dailyActivity:days.map(i=>({date:day(i),messageCount:level(i)*4,sessionCount:1+level(i)%3,toolCallCount:level(i)*6})),
 dailyModelTokens:days.map(i=>({date:day(i),tokensByModel:{'deepseek-v4-pro':level(i)*42000,'deepseek-v4-flash':level(i)*9000}})),
 modelUsage:{'deepseek-v4-pro':{inputTokens:31800000,outputTokens:2650000,cacheReadInputTokens:0,cacheCreationInputTokens:0},'deepseek-v4-flash':{inputTokens:6400000,outputTokens:610000,cacheReadInputTokens:0,cacheCreationInputTokens:0}},
 peakActivityHour:21,
};
const keyed={'account/read':{result:{account:{type:'apiKey'},requiresOpenaiAuth:false,deepseek:{apiKey:{configured:true,source:'file'},platform:null,links:null}}},'codeDesktop/stats/read':{result:stats}};
const keyless={'account/read':{result:{account:null,requiresOpenaiAuth:false,deepseek:{apiKey:{configured:false,source:null},platform:null,links:null}}}};

async function profile(name,{threads={},threadIds=[],account=keyed,theme='light',capabilities={}}={}){
 const dir=path.join(base,name),workspace=path.join(dir,'my-website');
 await fs.mkdir(path.join(dir,'codex-home'),{recursive:true});await fs.mkdir(workspace,{recursive:true});
 await fs.writeFile(path.join(workspace,'index.html'),`<!doctype html>\n<title>${D.site}</title>\n<link rel="stylesheet" href="style.css">\n`);
 await fs.writeFile(path.join(workspace,'style.css'),'body { background: #fff; color: #222; }\n');
 // A git repository whose working tree holds the demo edit, so the edit card counts real lines.
 const git=(...args)=>execFileSync('git',['-c','user.name=Demo','-c','user.email=demo@example.com',...args],{cwd:workspace,stdio:'ignore'});
 git('init','-q');git('add','.');git('commit','-qm','init');
 await fs.writeFile(path.join(workspace,'style.css'),DARK_CSS);
 const write=(file,value)=>fs.writeFile(path.join(dir,file),JSON.stringify(value));
 await write('preferences.json',{cwd:workspace,theme,mode:'code',model:'deepseek-v4-pro',effort:'high',permission:'ask',locale,threadIds,sidebarWidth:280,whatsNewSeen:'999.0.0',displayName:english?'Alex Morgan':'林晓'});
 await write('fixture-core.json',{engine:'deepseek-harness',capabilities:{codeStats:true,...capabilities},models});
 await write('fixture-usage.json',account);
 for(const thread of Object.values(threads))thread.cwd=workspace;
 await write('fixture-threads.json',{next:900,threads});
 return {dir,workspace};
}

const DARK_CSS=':root {\n  --bg: #ffffff;\n  --text: #222222;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --bg: #1a1a1a;\n    --text: #f2f2f2;\n  }\n}\nbody { background: var(--bg); color: var(--text); }\n';
// The demo conversation: a request, file reads, an edit with its diff, a test run and a summary.
const css=(ws)=>path.join(ws,'style.css');
function demoThreads(){
 const t=(id,name,ago,turns=[])=>({id,name,createdAt:now-ago,updatedAt:now-ago,archived:false,turns});
 const done=(id,user,reply)=>[{id:id+'-turn',status:'completed',items:[{id:id+'-u',type:'userMessage',content:[{type:'text',text:user}]},{id:id+'-a',type:'agentMessage',text:reply}]}];
 return {
  'demo-dark':t('demo-dark',D.dark,60,[]),
  'demo-bug':t('demo-bug',D.bug[0],3600*3,done('bug',D.bug[1],D.bug[2])),
  'demo-readme':t('demo-readme',D.readme[0],3600*26,done('readme',D.readme[1],D.readme[2])),
  'demo-test':t('demo-test',D.test[0],3600*50,done('test',D.test[1],D.test[2])),
 };
}
function darkModeTurns(ws){
 const diff='--- a/style.css\n+++ b/style.css\n@@ -1 +1,11 @@\n-body { background: #fff; color: #222; }\n+:root {\n+  --bg: #ffffff;\n+  --text: #222222;\n+}\n+@media (prefers-color-scheme: dark) {\n+  :root {\n+    --bg: #1a1a1a;\n+    --text: #f2f2f2;\n+  }\n+}\n+body { background: var(--bg); color: var(--text); }\n';
 return [{id:'dark-turn',status:'completed',items:[
  {id:'dark-u',type:'userMessage',content:[{type:'text',text:D.darkAsk}]},
  {id:'dark-a1',type:'agentMessage',text:D.look},
  {id:'dark-r1',type:'commandExecution',status:'completed',command:'cat index.html',cwd:ws,commandActions:[{type:'read',path:path.join(ws,'index.html'),name:'index.html'}],aggregatedOutput:`<!doctype html>\n<title>${D.site}</title>\n`},
  {id:'dark-r2',type:'commandExecution',status:'completed',command:'cat style.css',cwd:ws,commandActions:[{type:'read',path:css(ws),name:'style.css'}],aggregatedOutput:'body { background: #fff; color: #222; }\n'},
  {id:'dark-e',type:'fileChange',status:'completed',changes:[{path:css(ws),kind:{type:'update'},diff}]},
  {id:'dark-x',type:'commandExecution',status:'completed',command:'npm test',cwd:ws,commandActions:[{type:'unknown',command:'npm test'}],aggregatedOutput:D.tests,exitCode:0},
  {id:'dark-a2',type:'agentMessage',text:D.reply},
 ]}];
}

// Core features: scripted live turns on the fixture core (tests/fixtures/codex-server.cjs fixture-demo-turns.json), the
// session rail's Context breakdown (fixture-context-usage.json), /btw (a side-chat child session, btwChildSessions) and a Dynamic Workflow
// whose agents run on tests/fixtures/readme-workflow-server.cjs (readme-workflow.json).
const turnTool=(id,tool,args)=>({id,type:'mcpToolCall',server:'code_desktop',tool,arguments:args,status:'completed',result:{content:[{type:'text',text:'ok'}]}});
const read=(ws,id,name)=>({id,type:'commandExecution',status:'completed',command:`cat ${name}`,cwd:ws,commandActions:[{type:'read',path:path.join(ws,name),name}],aggregatedOutput:'',exitCode:0});
const edit=(ws,id,name,diff)=>({id,type:'fileChange',status:'completed',changes:[{path:path.join(ws,name),kind:{type:'update'},diff}]});
const MENU_DIFF='--- a/style.css\n+++ b/style.css\n@@ -1,3 +1,12 @@\n nav { display: flex; gap: 24px; }\n+.menu-toggle { display: none; }\n+@media (max-width: 640px) {\n+  nav { flex-direction: column; }\n+  nav:not(.open) a { display: none; }\n+  .menu-toggle { display: block; }\n+}\n';
const FOOTER_DIFF=()=>'--- a/index.html\n+++ b/index.html\n@@ -3,1 +3,6 @@\n <link rel="stylesheet" href="style.css">\n+<footer>\n+  <p>© 2026 '+D.site+'</p>\n+  <a href="about.html">About</a>\n+  <a href="contact.html">Contact</a>\n+</footer>\n';
function demoTurns(ws){
 const plan=(items,done)=>items.map((content,i)=>({content,status:i<done?'completed':i===done?'in_progress':'pending'}));
 const menu={startedAgo:47,steps:[
  {after:50,complete:{id:'menu-a1',type:'agentMessage',text:D.menu[2]}},
  {after:50,complete:turnTool('menu-p1','update_plan',{items:plan(D.menu[3],0),scope:'first_task'})},
  {after:50,complete:read(ws,'menu-r1','index.html')},{after:50,complete:read(ws,'menu-r2','style.css')},
  {after:50,complete:turnTool('menu-p2','update_plan',{advance:true})},
  {after:50,complete:edit(ws,'menu-e1','style.css',MENU_DIFF)},
  {after:50,complete:turnTool('menu-p3','update_plan',{done:[2,3],start:4})},
  {after:50,complete:{id:'menu-a2',type:'agentMessage',text:D.menu[4]}},
  {after:50,usage:{output:2380,total:31200}},
  {after:50,start:{id:'menu-x1',type:'commandExecution',status:'inProgress',command:'npm test',cwd:ws,commandActions:[{type:'unknown',command:'npm test'}],aggregatedOutput:''},startedAgo:14},
  {after:50,output:{id:'menu-x1',text:'> my-website@1.0.0 test\n✓ nav renders on desktop\n'}},
 ]};
 const footer={startedAgo:95,steps:[
  {after:50,complete:turnTool('foot-p1','update_plan',{items:plan(D.footer[3],0),scope:'first_task'})},
  {after:50,complete:read(ws,'foot-r1','index.html')},
  {after:50,complete:edit(ws,'foot-e1','index.html',FOOTER_DIFF())},
  {after:50,complete:turnTool('foot-p2','update_plan',{advance:true})},
  {after:50,complete:edit(ws,'foot-e2','style.css','--- a/style.css\n+++ b/style.css\n@@ -1 +1,2 @@\n body { margin: 0; }\n+footer { padding: 32px; color: var(--text); }\n')},
  {after:50,complete:{id:'foot-x1',type:'commandExecution',status:'completed',command:'npm test',cwd:ws,commandActions:[{type:'unknown',command:'npm test'}],aggregatedOutput:'3 passed\n',exitCode:0}},
  {after:50,complete:turnTool('foot-w1','wrap_up',{recap:D.footer[4],ask:D.footer[5],actions:[{label:D.footer[6],message:D.footer[7]},{label:D.footer[8],message:D.footer[9]}]})},
  {after:50,usage:{output:3120,total:41800}},
  {after:50,done:D.footer[2]},
 ]};
 const deps={startedAgo:21,steps:[
  {after:50,complete:{id:'deps-a1',type:'agentMessage',text:D.deps[2]}},
  {after:50,complete:read(ws,'deps-r1','package.json')},
  {after:50,usage:{output:860,total:22400}},
  {after:50,start:{id:'deps-x1',type:'commandExecution',status:'inProgress',command:'npm install --save-dev vite@latest',cwd:ws,commandActions:[{type:'unknown',command:'npm install --save-dev vite@latest'}],aggregatedOutput:''}},
  {after:80,request:{method:'item/commandExecution/requestApproval',params:{kind:'command',itemId:'deps-x1',command:'npm install --save-dev vite@latest',commandActions:[{type:'unknown',command:'npm install --save-dev vite@latest'}],reason:D.deps[3]}}},
 ]};
 const btw={steps:[{after:300,done:D.btw[1]}]};
 return {turns:{[D.menu[1]]:menu,[D.footer[1]]:footer,[D.deps[1]]:deps,[D.btw[0]]:btw}};
}
// What the Context card's breakdown reads from a core that measures its requests (codeDesktop/contextUsage/read).
const CONTEXT_USAGE={categories:{systemPrompt:{tokens:3240},systemTools:{tokens:12650},mcpTools:{tokens:2860},mcpServerInstructions:{tokens:610},memoryFiles:{tokens:1180},skills:{tokens:740}},
 memoryFiles:[{path:'AGENTS.md',type:'Project',tokens:1180}],
 mcpTools:[{name:'mcp__code_desktop__update_plan',serverName:'code_desktop',tokens:1460,isLoaded:true},{name:'mcp__code_desktop__wrap_up',serverName:'code_desktop',tokens:1400,isLoaded:true}],agents:[]};
const WORKFLOW_SCRIPT=()=>`export const meta={name:"dark-mode-audit",title:${JSON.stringify(D.audit[1])},description:${JSON.stringify(D.audit[2])}};
phase(${JSON.stringify(D.audit[3][0])});
await agent("List every page of the site",{label:${JSON.stringify(D.audit[4][0])}});
phase(${JSON.stringify(D.audit[3][1])});
await parallel(["index.html","about.html","blog.html","contact.html"].map(page=>()=>agent("Audit "+page+" in dark mode",{label:page})));
phase(${JSON.stringify(D.audit[3][2])});
return await agent("Fix the contrast problems found",{label:${JSON.stringify(D.audit[4][1])}});
`;
const WORKFLOW_AGENTS={agents:{
 'List every page of the site':{ms:1500,tokens:6100,result:'4 pages'},
 'Audit index.html in dark mode':{ms:3200,tokens:12400,result:'No problems'},
 'Audit about.html in dark mode':{ms:4300,tokens:9800,result:'1 contrast problem'},
 'Audit blog.html in dark mode':{ms:-1,tokens:15300},
 'Audit contact.html in dark mode':{ms:-1,tokens:7200},
}};

let app,page;
async function launch(dir,{colorScheme='light',extraEnv={}}={}){
 const env={...process.env,...extraEnv,CODE_DESKTOP_CORE_SYSTEM_PATHS:'',CODE_DESKTOP_DATA:dir,CODEX_HOME:path.join(dir,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
 delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;delete env.DEEPSEEK_API_KEY;
 app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,colorScheme,timeout:30000});
 page=await app.firstWindow();page.setDefaultTimeout(15000);
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1324,820);w.center();});
 await page.waitForFunction(()=>innerWidth===1324&&innerHeight===820);
}
const settle=(ms=900)=>page.waitForTimeout(ms);
const shot=async name=>{name=name.replace('.png',suffix+'.png');await settle();await page.screenshot({path:path.join(out,name)});console.log('wrote docs/images/'+name);};
const close=async()=>{await app?.close().catch(()=>{});app=null;};
const only=process.env.README_ONLY?.split(',')??null,want=name=>!only||only.includes(name);
const composer=()=>page.locator('[data-cds="ChatComposerEditor"]').first();
async function send(text){
 await composer().click();await composer().press('Meta+A');await composer().press('Backspace');await page.keyboard.insertText(text);
 for(let i=0;i<50&&await composer().evaluate(n=>n.value??n.textContent)!==text;i++)await page.waitForTimeout(100);
 await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
async function openSession(name){await page.getByText(name,{exact:true}).first().click();await page.waitForTimeout(400);}

try{
 if(want('base')){
 // 1–4: the main window with demo sessions (light), the session itself, the slash menu and Settings › Models.
 const threads=demoThreads();
 const main=await profile('main',{threads,threadIds:Object.keys(threads)});
 threads['demo-dark'].turns=darkModeTurns(main.workspace);
 await fs.writeFile(path.join(main.dir,'fixture-threads.json'),JSON.stringify({next:900,threads:Object.fromEntries(Object.entries(threads).map(([k,v])=>[k,{...v,cwd:main.workspace}]))}));
 await launch(main.dir);
 await page.getByText(D.dark).first().waitFor();
 await shot('home.png');
 await page.getByText(D.dark).first().click();
 await page.getByText(D.done).waitFor();
 // The tool group's header (the official v2e summary, its wording follows the group's members).
 await page.locator('[data-tool-group] button').first().click();
 await shot('session.png');
 const editor=page.locator('[data-cds="ChatComposerEditor"]').first();
 await editor.focus();await page.keyboard.insertText('/');
 await shot('slash-commands.png');
 await page.keyboard.press('Escape');await editor.press('Meta+A');await editor.press('Backspace');
 await page.keyboard.press('Meta+,');
 await page.locator('.ss-nav').getByText(T('Models'),{exact:true}).first().click();
 await shot('settings-models.png');
 await close();
 }

 if(want('base')||want('dark')){
 // 5: the same session in dark appearance, then its model menu's Effort submenu.
 const dark=await profile('dark',{threads:demoThreads(),threadIds:Object.keys(demoThreads()),theme:'dark'});
 const darkThreads=demoThreads();darkThreads['demo-dark'].turns=darkModeTurns(dark.workspace);
 await fs.writeFile(path.join(dark.dir,'fixture-threads.json'),JSON.stringify({next:900,threads:Object.fromEntries(Object.entries(darkThreads).map(([k,v])=>[k,{...v,cwd:dark.workspace}]))}));
 await launch(dark.dir,{colorScheme:'dark'});
 await page.getByText(D.dark).first().click();
 await page.getByText(D.done).waitFor();
 await shot('session-dark.png');
 await page.locator('.sc-model-trigger').first().click();
 await page.locator('[role^=menuitem]').filter({hasText:T('Effort')}).first().hover();
 await page.locator('[role^=menuitem]').filter({hasText:/^(Medium|中)/}).first().waitFor().catch(()=>{});
 await shot('model-effort-dark.png');
 await close();
 }

 if(want('core')){
 // 7–: core features (README "Core features"), each in its own made-up session of one profile.
 const t=(id,name,ago)=>({id,name,createdAt:now-ago,updatedAt:now-ago,archived:false,turns:[]});
 const coreThreads={'core-menu':t('core-menu',D.menu[0],30),'core-footer':t('core-footer',D.footer[0],600),'core-deps':t('core-deps',D.deps[0],1200),'core-audit':t('core-audit',D.audit[0],2400)};
 const core=await profile('core',{threads:coreThreads,threadIds:Object.keys(coreThreads),capabilities:{contextUsage:true,btwChildSessions:true}});
 await fs.writeFile(path.join(core.dir,'fixture-demo-turns.json'),JSON.stringify(demoTurns(core.workspace)));
 await fs.writeFile(path.join(core.dir,'fixture-context-usage.json'),JSON.stringify(CONTEXT_USAGE));
 await fs.writeFile(path.join(core.dir,'readme-workflow.json'),JSON.stringify(WORKFLOW_AGENTS));
 // The workflow script lives outside the project, so it is not one of the session's changes.
 const wfFile=path.join(core.dir,'dark-mode-audit.workflow.js');await fs.writeFile(wfFile,WORKFLOW_SCRIPT());
 // The working tree holds the footer the demo turn reports, so the Changes pane shows it.
 await fs.appendFile(path.join(core.workspace,'index.html'),`<footer>\n  <p>© 2026 ${D.site}</p>\n  <a href="about.html">About</a>\n  <a href="contact.html">Contact</a>\n</footer>\n`);
 await fs.appendFile(path.join(core.workspace,'style.css'),'footer { padding: 32px; color: var(--text); }\n');
 await launch(core.dir,{extraEnv:{CODE_DESKTOP_WORKFLOW_BINARY:path.join(root,'tests/fixtures/readme-workflow-server.cjs')}});
 await page.getByText(D.menu[0]).first().waitFor();

 // The next-step box after wrap_up, then the Context card's breakdown of the same session.
 await openSession(D.footer[0]);await send(D.footer[1]);
 await page.locator('[data-turn-next]').waitFor();await page.getByText(D.footer[2]).first().waitFor();
 await shot('next-step.png');
 const contextCard=page.getByRole('button',{name:new RegExp('^'+T('Context'))}).first();
 await contextCard.click();await page.getByText('System prompt',{exact:true}).first().waitFor();
 await shot('context.png');
 await contextCard.click();

 // The Changes pane: the session's diff, file by file.
 await page.getByRole('button',{name:T('Changes'),exact:true}).first().click();
 await page.getByText('© 2026 '+D.site).first().waitFor();
 await page.mouse.move(640,980);await settle(600);
 await shot('changes.png');
 await page.getByRole('button',{name:T('Changes'),exact:true}).first().click();
 await settle(500);

 // /btw: the side chat pane next to the session.
 await send('/btw '+D.btw[0]);
 await page.getByText(D.btw[1].split('**')[0].replace(/`/g,'').trim().slice(0,6)).first().waitFor().catch(()=>{});
 await settle(1500);await shot('side-chat.png');
 await page.keyboard.press('Escape');

 // A running turn: the task list card, the running tool and the loading line (clay dots, time, tokens).
 await openSession(D.menu[0]);await send(D.menu[1]);
 await page.locator('[data-turn-working]').first().waitFor();await page.getByText(D.menu[3][3]).first().waitFor();
 await page.getByText('npm test').first().waitFor();await settle(1500);
 await shot('task-list.png');

 // A command waiting for approval.
 await openSession(D.deps[0]);await send(D.deps[1]);
 await page.locator('.sac-card').first().waitFor();await settle(800);
 await shot('approval.png');

 // A Dynamic Workflow running in the Background tasks pane (expanded: phases, agents, tokens).
 await openSession(D.audit[0]);await send('/workflow '+JSON.stringify(wfFile));
 const launcher=page.getByRole('dialog',{name:T('Run workflow')});
 await launcher.getByRole('button',{name:T('Run workflow'),exact:true}).click();await launcher.waitFor({state:'hidden'});
 const pane=page.getByRole('complementary',{name:T('Background tasks'),exact:true});await pane.locator('.swf-card').waitFor();
 await pane.getByRole('button',{name:T('Expand'),exact:true}).click();
 // Stable: the first phase and two audits finished, two audits still running.
 await page.waitForFunction(()=>document.querySelectorAll('.swf-card .swf-table ul>li').length>=5&&document.body.innerText.includes('2/4'),null,{timeout:20000});
 await settle(1500);await shot('workflow.png');
 await close();
 }

 if(want('base')){
 // 6: first-run setup on a DeepSeek core without a key.
 const first=await profile('setup',{account:keyless});
 await launch(first.dir);
 await page.getByRole('dialog').first().waitFor();
 await shot('setup.png');
 await close();
 }
}catch(error){
 if(process.env.README_FAILURE_SHOT)await page?.screenshot({path:process.env.README_FAILURE_SHOT}).catch(()=>{});
 throw error;
}finally{
 await close();
 await fs.rm(base,{recursive:true,force:true});
}
