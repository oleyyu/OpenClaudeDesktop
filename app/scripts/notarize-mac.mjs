// Notarizes a Developer ID-signed build and staples the ticket: node scripts/notarize-mac.mjs <file.app | file.dmg>
// Credentials come from a notarytool keychain profile (OPENCLAUDE_NOTARY_PROFILE, default "openclaude-notary"), made once
// in a terminal with:  xcrun notarytool store-credentials openclaude-notary --team-id <TEAM>
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const target=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(target)){console.error('usage: node scripts/notarize-mac.mjs <file.app | file.dmg>');process.exit(2);}
const profile=process.env.OPENCLAUDE_NOTARY_PROFILE||'openclaude-notary';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'openclaude-notarize-'));
try{
  let upload=target;
  if(target.endsWith('.app')){ // notarytool takes a zip, dmg or pkg
    upload=path.join(temp,`${path.basename(target,'.app')}.zip`);
    execFileSync('ditto',['-c','-k','--keepParent',target,upload],{stdio:'inherit'});
  }
  console.log(`notarize: submitting ${path.basename(upload)} with profile "${profile}" (this waits for Apple)…`);
  const out=execFileSync('xcrun',['notarytool','submit',upload,'--keychain-profile',profile,'--wait','--output-format','json'],{encoding:'utf8',stdio:['ignore','pipe','inherit']});
  const result=JSON.parse(out);
  console.log(`notarize: ${result.status} (${result.id})`);
  if(result.status!=='Accepted'){
    try{execFileSync('xcrun',['notarytool','log',result.id,'--keychain-profile',profile],{stdio:'inherit'});}catch{}
    process.exit(1);
  }
  execFileSync('xcrun',['stapler','staple',target],{stdio:'inherit'});
  execFileSync('xcrun',['stapler','validate',target],{stdio:'inherit'});
}finally{fs.rmSync(temp,{recursive:true,force:true});}
