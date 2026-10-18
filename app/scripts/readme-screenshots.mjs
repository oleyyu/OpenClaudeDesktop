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
}:{
 site:'我的网站',dark:'给网页加上暗色模式',darkAsk:'给我的网页加上暗色模式，跟随系统设置自动切换',
 look:'好的，我先看一下现在的页面结构和样式。',tests:'✓ 页面在浅色模式下正常显示\n✓ 页面在暗色模式下正常显示\n\n2 passed',
 done:'暗色模式已经加好了',
 reply:'暗色模式已经加好了 🌙\n\n**改了什么**\n\n- 在 `style.css` 里把颜色改成了变量（`--bg`、`--text`）\n- 系统切到深色时，页面会自动换成深色背景和浅色文字\n\n**怎么验证**\n\n| 系统外观 | 页面背景 | 文字颜色 |\n| --- | --- | --- |\n| 浅色 | 白色 | 深灰 |\n| 深色 | 深灰 | 浅白 |\n\n在 Mac 的「系统设置 › 外观」里切换一下就能看到效果。',
 group:/读取了 2 个文件/,
 bug:['登录按钮点了没反应','登录按钮点了没反应，帮我看看','找到了：`login.js` 里的事件绑定写在页面加载之前。已经改好，刷新页面再试试。'],
 readme:['写一份项目说明','帮我写一份项目说明','已创建 `README.md`，包含项目介绍、安装步骤和使用方法。'],
 test:['为购物车加单元测试','为购物车加单元测试','新增 12 个测试，全部通过 ✅'],
};
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../docs/images');
await fs.mkdir(out,{recursive:true});
const base=await fs.mkdtemp(path.join(os.tmpdir(),'readme-shots-'));
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

async function profile(name,{threads={},threadIds=[],account=keyed,theme='light'}={}){
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
 await write('fixture-core.json',{engine:'deepseek-harness',capabilities:{codeStats:true},models});
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

let app,page;
async function launch(dir,{colorScheme='light'}={}){
 const env={...process.env,CODE_DESKTOP_CORE_SYSTEM_PATHS:'',CODE_DESKTOP_DATA:dir,CODEX_HOME:path.join(dir,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
 delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;delete env.DEEPSEEK_API_KEY;
 app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,colorScheme,timeout:30000});
 page=await app.firstWindow();page.setDefaultTimeout(15000);
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1324,820);w.center();});
 await page.waitForFunction(()=>innerWidth===1324&&innerHeight===820);
}
const settle=(ms=900)=>page.waitForTimeout(ms);
const shot=async name=>{name=name.replace('.png',suffix+'.png');await settle();await page.screenshot({path:path.join(out,name)});console.log('wrote docs/images/'+name);};
const close=async()=>{await app?.close().catch(()=>{});app=null;};

try{
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

 // 5: the same session in dark appearance.
 const dark=await profile('dark',{threads:demoThreads(),threadIds:Object.keys(demoThreads()),theme:'dark'});
 const darkThreads=demoThreads();darkThreads['demo-dark'].turns=darkModeTurns(dark.workspace);
 await fs.writeFile(path.join(dark.dir,'fixture-threads.json'),JSON.stringify({next:900,threads:Object.fromEntries(Object.entries(darkThreads).map(([k,v])=>[k,{...v,cwd:dark.workspace}]))}));
 await launch(dark.dir,{colorScheme:'dark'});
 await page.getByText(D.dark).first().click();
 await page.getByText(D.done).waitFor();
 await shot('session-dark.png');
 await close();

 // 6: first-run setup on a DeepSeek core without a key.
 const first=await profile('setup',{account:keyless});
 await launch(first.dir);
 await page.getByRole('dialog').first().waitFor();
 await shot('setup.png');
 await close();
}finally{
 await close();
 await fs.rm(base,{recursive:true,force:true});
}
