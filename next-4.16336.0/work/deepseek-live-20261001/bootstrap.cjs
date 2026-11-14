const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{EventEmitter}=require('node:events');
const electron=require('electron'),{app,BrowserWindow,dialog,shell,powerSaveBlocker,powerMonitor}=electron;
const root=process.env.CODE_DESKTOP_VERIFY_ROOT,profile=process.env.CODE_DESKTOP_DATA;
assert(root&&profile);
const fixtures=['codex-server.cjs','session-actions-server.cjs','highlight-server.cjs','approval-server.cjs','turn-footer-server.cjs'].map(name=>path.join(root,'tests/fixtures',name));
// permission-ui-test:21-35 and titlebar-ui-test:56-63 put a recording/delaying proxy
// into their own profile; accept it only when its sole spawn target is an allowed fixture.
const proxyOf=binary=>{if(!binary?.startsWith(profile+path.sep))return null;const text=fs.readFileSync(binary,'utf8'),targets=[...text.matchAll(/spawn\(process\.execPath,\[("[^"]*")\]/g)].map(match=>JSON.parse(match[1]));return targets.length===1&&text.split('spawn(').length===2&&!/require\((?!'node:(child_process|readline|fs)')/.test(text)&&fixtures.includes(targets[0])?targets[0]:null;};
// connection-lifecycle-test:8-21 writes a self-contained fake app-server (connection-server.cjs) into its own
// profile; it spawns nothing and requires only node:fs/path/readline. Accept exactly that shape: node shebang, no
// spawn/exec/fork/import/eval, no child_process/net/http/https/tls/dgram/vm/worker_threads, every require one of the three.
const standaloneOf=binary=>{if(!binary?.startsWith(profile+path.sep)||path.basename(binary)!=='connection-server.cjs')return false;const [shebang,...rest]=fs.readFileSync(binary,'utf8').split('\n'),body=rest.join('\n');return /^#!(\/usr\/bin\/env node|\/\S+\/node)$/.test(shebang)&&!/spawn\(|exec|fork|\bimport\b|\beval\(|Function\(|process\.(binding|dlopen)|\b(child_process|net|http|https|tls|dgram|vm|worker_threads)\b|\brequire\b(?!\()/.test(body)&&[...body.matchAll(/require\(([^)]*)\)/g)].every(match=>/^'node:(fs|path|readline)'$/.test(match[1]));};
// shutdown-ui-test:45-64 writes an intentionally SIGTERM-ignoring fake app-server (stubborn-codex.cjs) into each scenario
// profile; same closed shape as standaloneOf, but only node:fs/readline and its own file name.
const stubbornOf=binary=>{if(!binary?.startsWith(profile+path.sep)||path.basename(binary)!=='stubborn-codex.cjs')return false;const [shebang,...rest]=fs.readFileSync(binary,'utf8').split('\n'),body=rest.join('\n');return shebang==='#!/usr/bin/env node'&&!/spawn\(|exec|fork|\bimport\b|\beval\(|Function\(|process\.(binding|dlopen|kill)|\b(child_process|net|http|https|tls|dgram|vm|worker_threads)\b|\brequire\b(?!\()/.test(body)&&[...body.matchAll(/require\(([^)]*)\)/g)].every(match=>/^'node:(fs|readline)'$/.test(match[1]));};
// git-rail-ui-test:194 relaunches with only tests/fixtures/composer-window.cjs (a show:false BrowserWindow loading the
// loopback Vite git-rail component page), not the app; run-suite names that entry for that git-rail launch alone.
const entry=process.env.CODE_DESKTOP_VERIFY_ENTRY;
if(entry){assert.equal(entry,path.join(root,'tests/fixtures/composer-window.cjs'));assert.match(process.env.COMPOSER_FIXTURE_URL,/^http:\/\/127\.0\.0\.1:\d+\/tests\/fixtures\/git-rail-fixture\.html$/);assert.equal(process.env.CODEX_BINARY,undefined);}
// DeepSeek live verification: the real DeepSeek core (no CODEX_BINARY) is the point of this launcher.
else assert(process.env.CODEX_BINARY===undefined&&process.env.CODE_DESKTOP_CORE!=='codex');
assert(profile.includes(path.sep+'work'+path.sep)||profile.includes(path.sep+'analysis'+path.sep));
if(process.env.CODE_DESKTOP_WORKFLOW_BINARY)assert.equal(process.env.CODE_DESKTOP_WORKFLOW_BINARY,path.join(root,'tests/fixtures/workflow-server.cjs'));
const deviceScaleFactor=Number(process.env.CODE_DESKTOP_OFFSCREEN_SCALE||'1');assert([1,2].includes(deviceScaleFactor));
const evidence={deviceScaleFactor,policy:'prohibited',created:[],blocked:[],violations:[],native:[]};globalThis.offscreenEvidence=evidence;
app.setActivationPolicy('prohibited');
app.setAppPath(root);
const documents=path.join(profile,'documents');fs.mkdirSync(documents,{recursive:true});app.setPath('documents',documents);
app.focus=()=>evidence.blocked.push('app.focus');
app.show=()=>evidence.blocked.push('app.show');
app.getLoginItemSettings=()=>({openAtLogin:false});
app.setLoginItemSettings=()=>{throw Error('OS startup mutation forbidden in offscreen verification');};
const forbidden=name=>(...args)=>{evidence.native.push({name,disposition:'blocked-before-native-call',...(name==='dialog.showErrorBox'?{message:args.map(String).join('\n')}: {})});throw Error('Native action forbidden: '+name);};
for(const name of ['showOpenDialog','showOpenDialogSync','showSaveDialog','showSaveDialogSync','showMessageBox','showMessageBoxSync','showErrorBox'])dialog[name]=forbidden('dialog.'+name);
for(const name of ['openExternal','openPath','showItemInFolder','trashItem'])shell[name]=forbidden('shell.'+name);
for(const name of ['writeText','writeHTML','writeRTF','writeImage','writeBuffer','writeBookmark','writeFindText','write','clear','readText','readHTML','readRTF','readBookmark','readFindText','readImage','readBuffer','read','has','availableFormats'])electron.clipboard[name]=forbidden('clipboard.'+name);
let nextBlocker=0;powerSaveBlocker.start=()=>++nextBlocker;powerSaveBlocker.stop=()=>{};powerMonitor.isOnBatteryPower=()=>false;
const block=(name)=>()=>evidence.blocked.push(name);
const HiddenWindow=new Proxy(BrowserWindow,{construct(_target,[options={}]){
 const window=new BrowserWindow({...options,show:false,focusable:false,skipTaskbar:true,webPreferences:{...options.webPreferences,offscreen:{deviceScaleFactor},backgroundThrottling:false}});
 evidence.created.push({id:window.id,visible:window.isVisible(),focused:window.isFocused(),offscreen:window.webContents.isOffscreen()});
 for(const name of ['show','showInactive','focus','moveTop','setAlwaysOnTop','maximize','setFullScreen','setSimpleFullScreen','setKiosk','restore','setFocusable'])window[name]=block('window.'+name);
 window.webContents.focus=block('webContents.focus');
 for(const name of ['show','focus'])window.on(name,()=>{evidence.violations.push('window event '+name);app.exit(90);});
 return window;
}});
class NoNotification extends EventEmitter{static isSupported(){return false;}show(){throw Error('Native notification forbidden');}close(){}}
// Menu bar icons are OS-visible. Record the production tray calls instead; menus
// are captured as plain templates and never popped up natively.
evidence.trays=[];
class OffscreenTray extends EventEmitter{
 constructor(image){super();this.record={image:image?.isEmpty?.()===false?{size:image.getSize(),template:image.isTemplateImage()}:null,tooltip:null,destroyed:false,menus:[]};evidence.trays.push(this.record);globalThis.offscreenTrays=evidence.trays;globalThis.offscreenTrayObjects=[...(globalThis.offscreenTrayObjects||[]),this];}
 setToolTip(value){this.record.tooltip=value;}setImage(){}setTitle(){}
 isDestroyed(){return this.record.destroyed;}destroy(){this.record.destroyed=true;this.removeAllListeners();}
 popUpContextMenu(menu){const item=entry=>({label:entry.label,type:entry.type,enabled:entry.enabled});this.record.menus.push(menu.items.map(item));this.lastMenu=menu;}
 setContextMenu(){throw Error('Unexpected persistent tray menu');}displayBalloon(){throw Error('Native balloon forbidden');}
}
// Electron exports are nonconfigurable. Only this isolated main process resolves
// its electron imports through a boundary adapter; the production file stays untouched.
const adapted={...electron,BrowserWindow:HiddenWindow,Notification:NoNotification,Tray:OffscreenTray};
if(process.env.CODE_DESKTOP_MEMORY_CLIPBOARD==='1'){
 evidence.memoryClipboard={kind:'in-memory only; OS clipboard not read or written',calls:[]};
 const store=require('./memory-clipboard.cjs').createMemoryClipboard(method=>evidence.memoryClipboard.calls.push(method));
 globalThis.offscreenClipboard=store;adapted.clipboard={...electron.clipboard,...store.clipboard};adapted.ClipboardItem=store.ClipboardItem;
}
const Module=require('node:module'),load=Module._load;
Module._load=function(request,parent,isMain){return request==='electron'?adapted:load.call(this,request,parent,isMain);};
assert.equal(require('electron').BrowserWindow,HiddenWindow);assert.equal(require('electron').Tray,OffscreenTray);
app.whenReady().then(()=>{if(app.dock){app.dock.show=block('dock.show');app.dock.bounce=block('dock.bounce');app.dock.setBadge=()=>{};}});
// Written at will-quit for every launch. A host that quits itself (shutdown-ui-test app.quit / last-window close) never
// reaches run-suite's close wrapper; this launch-tagged file then carries the same windows/clipboard observation.
app.on('will-quit',()=>fs.writeFileSync(path.join(profile,'offscreen-evidence.json'),JSON.stringify({launch:process.env.CODE_DESKTOP_OFFSCREEN_LAUNCH,evidence,clipboard:globalThis.offscreenClipboard?{initial:globalThis.offscreenClipboard.initial,final:globalThis.offscreenClipboard.snapshot()}:null,windows:BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),focused:w.isFocused(),offscreen:w.webContents.isOffscreen()}))},null,2)));
// composer-window.cjs sets no userData; keep its Chromium profile inside the run-suite-owned profile.
if(entry)app.setPath('userData',path.join(profile,'user-data'));
require(entry||path.join(root,'electron/main.cjs'));
