import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{prepareTerminalShell,cleanupTerminalShell}=require('../electron/terminal-shell-integration.cjs'),{createTerminalService}=require('../electron/terminal-service.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'openclaude-shell-'));test.after(()=>fs.rmSync(root,{recursive:true,force:true}));
const pause=()=>new Promise(r=>setTimeout(r,25));async function until(fn,label){for(let i=0;i<400;i++){if(fn())return;await pause();}throw Error('Timed out: '+label);}
const hash=s=>createHash('sha256').update(s).digest('hex');
test('original shell scripts and planner match recorded extraction bytes',()=>{
 const dir=path.resolve(import.meta.dirname,'../electron/generated'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'terminal-shell-manifest.json')));
 assert.equal(hash(fs.readFileSync(path.join(dir,manifest.output))),manifest.sha256);assert.equal(hash(fs.readFileSync(path.resolve(dir,'../..',manifest.source))),manifest.sourceSha256);
});
test('planner preserves custom ZDOTDIR and creates private, disposable nonce files outside ASAR',()=>{
 const env={HOME:root,ZDOTDIR:path.join(root,'user rc')},directory=path.join(root,'generated');
 const launch=prepareTerminalShell({shell:'/bin/zsh',args:['-l'],env,directory});assert.equal(launch.kind,'zsh');assert.deepEqual(launch.args,['-l']);
 assert.equal(launch.env.CLAUDE_DESKTOP_USER_ZDOTDIR,env.ZDOTDIR);assert.equal(env.ZDOTDIR,path.join(root,'user rc'));
 assert.match(fs.readFileSync(launch.nonceFile,'utf8'),/^[0-9a-f]{32}\n[0-9a-f]{16}\n$/);assert.equal(fs.statSync(launch.nonceFile).mode&0o777,0o600);
 cleanupTerminalShell(launch);assert.equal(fs.existsSync(launch.nonceFile),false);cleanupTerminalShell(launch);
 for(const [shell,args] of [['/bin/sh',['-l']],['/bin/zsh',['-lc','echo ok']]])assert.equal(prepareTerminalShell({shell,args,env,directory}),null);
});
test('3.6556.2 planner: the env shape of each shell (zsh, bash, fish, pwsh) and the Windows Git Bash branch',()=>{
 const {shellLaunch,shellKind,shellScripts}=require('../electron/generated/terminal-shell.cjs'),dir='/data/int',nonce='/data/int/spawn/abc';
 const manifest=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../electron/generated/terminal-shell-manifest.json')));
 assert.equal(manifest.reference,'3.6556.2');assert.equal(manifest.source,'../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-B80dqaMC.js');
 assert.deepEqual(manifest.helpers.map(h=>[h.file.split('/').at(-1),h.export,h.as]),[['index.chunk-jPKPzV-P.js','P','t.P']]);
 assert.deepEqual(shellLaunch('/bin/zsh',['-l'],dir,'/home/u rc',nonce),{kind:'zsh',args:['-l'],env:{ZDOTDIR:'/data/int/zsh',CLAUDE_DESKTOP_ZDOTDIR:'/data/int/zsh',CLAUDE_DESKTOP_USER_ZDOTDIR:'/home/u rc',CLAUDE_DESKTOP_TERMINAL_NONCE_FILE:nonce}});
 assert.deepEqual(shellLaunch('/bin/zsh',['-l'],dir,undefined,nonce,true).env.CLAUDE_DESKTOP_TERMINAL_HEADLESS,'1');
 assert.deepEqual(shellLaunch('/bin/bash',['-l'],dir,undefined,nonce),{kind:'bash',args:['--init-file','/data/int/bash/claude-desktop.bash'],env:{CLAUDE_DESKTOP_TERMINAL_NONCE_FILE:nonce}});
 assert.deepEqual(shellLaunch('/opt/homebrew/bin/fish',['-l'],dir,undefined,"/n/it's"),{kind:'fish',args:['-l','-C',"source '/data/int/fish/claude-desktop.fish' '/n/it\\'s' 0"],env:{}});
 // pwsh is only Windows' pwsh.exe / powershell.exe (w): a macOS pwsh has no integration.
 const pwsh=shellLaunch('C:\\Program Files\\PowerShell\\7\\pwsh.exe',['-NoLogo'],dir,undefined,nonce);
 assert.deepEqual([pwsh.kind,pwsh.args.slice(0,4),pwsh.env],['pwsh',['-NoLogo','-NoProfile','-NoExit','-Command'],{CLAUDE_DESKTOP_TERMINAL_NONCE_FILE:nonce,CLAUDE_DESKTOP_TERMINAL_HOOKS:'/data/int/pwsh/claude-desktop.ps1'}]);
 assert.equal(shellLaunch('pwsh.exe',['-l'],dir,undefined,nonce),undefined,'pwsh takes only -NoLogo');
 assert.equal(shellLaunch('/bin/zsh',['-lc','echo ok'],dir,undefined,nonce),undefined);
 // C5-2: a trailing .exe is dropped from the kind, and Git Bash gets forward-slash paths.
 for(const [shell,kind] of [['C:\\Git\\bin\\bash.exe','bash'],['C:\\Tools\\ZSH.EXE','zsh'],['pwsh.exe','pwsh'],['/usr/local/bin/pwsh',undefined],['/bin/sh',undefined]])assert.equal(shellKind(shell),kind,shell);
 const git=shellLaunch('C:\\Git\\bin\\bash.exe',['-l'],'C:\\data\\int',undefined,'C:\\data\\int\\spawn\\abc');
 assert.equal(git.env.CLAUDE_DESKTOP_TERMINAL_NONCE_FILE,'C:/data/int/spawn/abc');assert.ok(!git.args[1].includes('\\'),git.args[1]);
 // C5-1: the bash script keeps the nonce file path and removes it again after /etc/profile (Git Bash has no rm before it).
 const bash=shellScripts()['bash/claude-desktop.bash'];
 assert.ok(bash.includes('__claude_desktop_nf=$CLAUDE_DESKTOP_TERMINAL_NONCE_FILE'));
 assert.ok(bash.includes('command rm -f -- "$__claude_desktop_nf" || : >| "$__claude_desktop_nf"'));
 assert.ok(bash.indexOf('[ -z "$__claude_desktop_nf" ] || command rm -f -- "$__claude_desktop_nf" 2>/dev/null')>bash.indexOf('. /etc/profile'));
 assert.deepEqual(Object.keys(shellScripts()),['zsh/.zshenv','zsh/.zprofile','zsh/.zshrc','zsh/.zlogin','zsh/claude-desktop.zsh','bash/claude-desktop.bash','fish/claude-desktop.fish','pwsh/claude-desktop.ps1']);
});
for(const shell of ['zsh','bash'])for(const backend of ['pty','script'])test(`${shell}/${backend}: user startup preserved, commands automatically emit OSC markers and status`,{timeout:30000},async()=>{
 const home=fs.mkdtempSync(path.join(root,`${shell}-${backend}-`)),rc=path.join(home,'custom rc'),trace=path.join(home,'startup-trace');fs.mkdirSync(rc);
 const files={};const save=(name,text)=>{const file=path.join(shell==='zsh'?rc:home,name);files[file]=text;fs.writeFileSync(file,text);};
 if(shell==='zsh'){
  for(const name of ['.zshenv','.zprofile','.zshrc','.zlogin'])save(name,`print -r -- '${name}' >> '${trace}'\n`+(name==='.zshrc'?"export FIXTURE_STARTUP=zsh-config\nPS1='fixture$ '\nfixture_precmd() { print -r -- 'USER_PROMPT_HOOK'; }\nprecmd_functions+=(fixture_precmd)\n":''));
 }else{
  save('.bash_profile',`printf '.bash_profile\\n' >> '${trace}'\n. "$HOME/.bashrc"\n`);
  save('.bashrc',`printf '.bashrc\\n' >> '${trace}'\nexport FIXTURE_STARTUP=bash-config\nPS1='fixture$ '\nPROMPT_COMMAND='printf "USER_PROMPT_HOOK\\n"'\ntrap 'FIXTURE_DEBUG=preserved' DEBUG\n`);
 }
 const events=[],sender={send:(_channel,event)=>events.push(event),isDestroyed:()=>false,once(){}};
 const service=createTerminalService({resolveOwner:()=>home,shell:`/bin/${shell}`,shellProxy:null,forceScript:backend==='script',baseEnv:{PATH:'/usr/bin:/bin',HOME:home,...(shell==='zsh'?{ZDOTDIR:rc}:{})},shellIntegrationDir:path.join(home,'integration')});
 const output=()=>events.filter(e=>e.kind==='data').map(e=>e.data).join('');
 try{
  const info=await service.call('create',{sessionId:'fixture'},sender);assert.equal(info.shellIntegration,shell);assert.equal(info.backend,backend);
  await until(()=>/\x1b\]133;B;/.test(output()),'first prompt');assert.ok(output().includes('USER_PROMPT_HOOK'));
  const expected=shell==='zsh'?['.zshenv','.zprofile','.zshrc','.zlogin']:['.bash_profile','.bashrc'];assert.deepEqual(fs.readFileSync(trace,'utf8').trim().split('\n'),expected);
  let start=output().length;service.input(sender,info.id,'false\r');await until(()=>/\x1b\]133;D;1;/.test(output().slice(start)),'failure status');assert.match(output().slice(start),/\x1b\]133;C;/);
  start=output().length;service.input(sender,info.id,'true\r');await until(()=>/\x1b\]133;D;0;/.test(output().slice(start)),'success status');
  start=output().length;service.input(sender,info.id,'printf "CONFIG=%s\\n" "$FIXTURE_STARTUP"\r');await until(()=>output().slice(start).includes(`CONFIG=${shell}-config`),'startup variable retained');
  if(shell==='bash'){start=output().length;service.input(sender,info.id,'printf "DEBUG=%s\\n" "$FIXTURE_DEBUG"\r');await until(()=>output().slice(start).includes('DEBUG=preserved'),'existing DEBUG trap retained');}
  for(const [file,bytes]of Object.entries(files))assert.equal(fs.readFileSync(file,'utf8'),bytes,'user rc untouched');
  const integrationRoot=path.join(home,'integration',fs.readdirSync(path.join(home,'integration'))[0],'spawn');await until(()=>fs.readdirSync(integrationRoot).length===0,'nonce file consumed');
  service.input(sender,info.id,'exit\r');await until(()=>events.some(e=>e.kind==='state'&&e.info.status==='exited'),'shell exit');
 }finally{await service.dispose();}
});
