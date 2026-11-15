import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../../releases/OpenClaude Desktop-darwin-arm64/OpenClaude Desktop.app');
const entitlements=path.join(import.meta.dirname,'entitlements.mac.plist');
// Signs the packaged Mac app.
// - With a "Developer ID Application" identity in the keychain (or OPENCLAUDE_SIGN_IDENTITY naming one): a distribution
//   signature, inside out, with the hardened runtime and a secure timestamp on every Mach-O file — what notarization
//   (scripts/notarize-mac.mjs) requires. Its designated requirement is the team's certificate, so macOS privacy grants
//   survive rebuilds.
// - Otherwise (or OPENCLAUDE_SIGN_IDENTITY=-): ad-hoc, for a build that only runs on this Mac.
const listing=execFileSync('security',['find-identity','-v','-p','codesigning'],{encoding:'utf8'});
const identities=[...listing.matchAll(/^\s*\d+\)\s+([0-9A-F]{40})\s+"([^"]+)"/gm)].map(([,hash,name])=>({hash,name}));
const wanted=process.env.OPENCLAUDE_SIGN_IDENTITY;
const identity=wanted==='-'?null:wanted?identities.find(i=>i.hash===wanted||i.name===wanted):identities.find(i=>i.name.startsWith('Developer ID Application:'));
if(wanted&&wanted!=='-'&&!identity){console.error(`sign-local: no valid code-signing identity "${wanted}" in the keychain.`);process.exit(1);}

const machO=(file)=>{
  let fd;
  try{fd=fs.openSync(file,'r');const b=Buffer.alloc(4);if(fs.readSync(fd,b,0,4,0)<4)return false;const m=b.readUInt32BE(0);
    return m===0xcffaedfe||m===0xcefaedfe||m===0xfeedfacf||m===0xfeedface||m===0xcafebabe;}
  catch{return false;} finally{if(fd!==undefined)fs.closeSync(fd);}
};

if(identity){
  console.log(`sign-local: signing with "${identity.name}" (${identity.hash}), hardened runtime.`);
  const {signAsync}=await import('@electron/osx-sign');
  await signAsync({
    app, identity:identity.hash, platform:'darwin', type:'distribution', preAutoEntitlements:false,
    // Only Mach-O files carry a code signature; resources (app.asar, the Cowork VM image, scripts) are sealed by the
    // bundle's own signature instead.
    ignore:(file)=>{try{const st=fs.lstatSync(file);return st.isFile()&&!machO(file);}catch{return true;}},
    optionsForFile:()=>({hardenedRuntime:true, timestamp:'http://timestamp.apple.com/ts01', entitlements}),
  });
  execFileSync('codesign',['--verify','--deep','--strict','--verbose=2',app],{stdio:'inherit'});
  const shown=spawnSync('codesign',['-d','-r-',app],{encoding:'utf8'});
  console.log(`sign-local: ${`${shown.stdout}\n${shown.stderr}`.split('\n').find(l=>l.startsWith('designated =>'))||'(no requirement)'}`);
  console.log('Developer ID signature verified.');
} else {
  console.warn('sign-local: no Developer ID identity; signing ad-hoc (this Mac only, not notarizable).');
  // The native files live unpacked beside app.asar — node-pty's pty.node and spawn-helper, computer use's
  // computer_use.node and (when one is built) its app-cu-helper; codesign --deep only seals them as resources, so they
  // are signed first, then the bundle seals their signed bytes.
  const unpacked=path.join(app,'Contents/Resources/app.asar.unpacked');
  const native=[];
  const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&(entry.name.endsWith('.node')||entry.name==='spawn-helper'||entry.name==='app-cu-helper'))native.push(file);}};
  if(fs.existsSync(unpacked))walk(unpacked);
  for(const file of native)execFileSync('codesign',['--force','--sign','-',file],{stdio:'inherit'});
  const frameworks=path.join(app,'Contents/Frameworks');
  for(const helper of [app, ...fs.readdirSync(frameworks).filter(name=>name.endsWith('Helper (Plugin).app')).map(name=>path.join(frameworks,name))])
    execFileSync('codesign',['--force','--sign','-','--entitlements',entitlements,helper],{stdio:'inherit'});
  execFileSync('codesign',['--force','--deep','--sign','-','--preserve-metadata=entitlements',app],{stdio:'inherit'});
  execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
  console.log('Local ad-hoc signature verified.');
}
