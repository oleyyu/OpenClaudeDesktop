import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../../releases/OpenClaude Desktop-darwin-arm64/OpenClaude Desktop.app');
// Ad-hoc signing for this local Mac build, not a notarized distribution signature.
// The native files live unpacked beside app.asar — node-pty's pty.node and spawn-helper, computer use's
// computer_use.node and (when one is built) its app-cu-helper; codesign --deep only seals them as resources, so they
// are signed first, then the bundle seals their signed bytes.
const unpacked=path.join(app,'Contents/Resources/app.asar.unpacked');
const native=[];
const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&(entry.name.endsWith('.node')||entry.name==='spawn-helper'||entry.name==='app-cu-helper'))native.push(file);}};
if(fs.existsSync(unpacked))walk(unpacked);
for(const file of native)execFileSync('codesign',['--force','--sign','-',file],{stdio:'inherit'});
// The Swift VM uses the macOS main run loop, as in the installed Claude app.
// Give the main host virtualization access; renderer helpers do not receive it.
const frameworks=path.join(app,'Contents/Frameworks');
for(const helper of [app, ...fs.readdirSync(frameworks).filter(name=>name.endsWith('Helper (Plugin).app')).map(name=>path.join(frameworks,name))]){
  const xml=execFileSync('codesign',['-d','--entitlements','-','--xml',helper],{stdio:['ignore','pipe','ignore']});
  const entitlements=xml.length ? JSON.parse(execFileSync('plutil',['-convert','json','-o','-','--','-'],{input:xml,stdio:['pipe','pipe','inherit']})) : {};
  entitlements['com.apple.security.cs.allow-jit']=true;
  entitlements['com.apple.security.cs.allow-unsigned-executable-memory']=true;
  entitlements['com.apple.security.cs.disable-library-validation']=true;
  entitlements['com.apple.security.virtualization']=true;
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'openclaude-entitlements-'));
  try {
    const file=path.join(temp,'helper.plist');
    fs.writeFileSync(file,execFileSync('plutil',['-convert','xml1','-o','-','--','-'],{input:JSON.stringify(entitlements),stdio:['pipe','pipe','inherit']}));
    execFileSync('codesign',['--force','--sign','-','--entitlements',file,helper],{stdio:'inherit'});
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
execFileSync('codesign',['--force','--deep','--sign','-','--preserve-metadata=entitlements',app],{stdio:'inherit'});
execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
console.log('Local ad-hoc signature verified.');
