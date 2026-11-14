import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as prettier from '../tools/node_modules/prettier/index.mjs';
const root=path.resolve(import.meta.dirname,'..');
const ion=path.join(root,'reference/ion-dist');
async function walk(dir){const out=[];for(const x of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,x.name);out.push(...x.isDirectory()?await walk(p):[p]);}return out;}
const all=await walk(path.join(root,'reference'));
const js=all.filter(x=>x.endsWith('.js'));
const mapFiles=all.filter(x=>x.endsWith('.map'));
const assets=path.join(ion,'assets/v1');
const selected={
 'code-workspace.js':path.join(assets,'c11959232-DSGhSoTs.js'),
 'code-routes.js':path.join(assets,'c9500abe8-a_EtjZjH.js'),
 'desktop-sidebar.js':path.join(assets,'shared-23-DVf01Zkw.js'),
 'code-composer-shared.js':path.join(assets,'shared-20-DDaeJOX2.js'),
 'app-entry.js':path.join(assets,'index-C0ExfbM8.js'),
 'desktop-layout.css':path.join(assets,'shared-styles-BR5YpWif.css'),
 'design-system.css':path.join(assets,'c6a992d55-CCAJX9iv.css'),
 'frame.css':path.join(assets,'shared-frame-DTHtnNBp.css'),
 'electron-preload.js':path.join(root,'reference/asar/.vite/build/mainView.js'),
 'electron-window.js':path.join(root,'reference/asar/.vite/renderer/main_window/assets/MainWindowPage-kvc7Gg-q.js'),
};
await fs.mkdir(path.join(root,'readable'),{recursive:true});
const mapping=[];
for(const [name,file]of Object.entries(selected)){
 const raw=await fs.readFile(file,'utf8');const output=path.join(root,'readable',name);
 const hash=createHash('sha256').update(raw).digest('hex');
 const fresh=await fs.readFile(output+'.sha256','utf8').then(s=>s===hash).catch(()=>false);
 if(!fresh){const formatted=await prettier.format(raw,{parser:name.endsWith('.css')?'css':'babel'});await fs.writeFile(output,formatted);await fs.writeFile(output+'.sha256',hash);}mapping.push({readable:name,source:path.relative(root,file),note:'Formatted compiled code; not recovered original source. Descriptive filename is analyst assigned.'});
}
const modules=[];const sourceMapRefs=[];const tokens=[];const featureHits={};
const probes=['CodeIndexRoute','CodeSessionRoute','dframe-sidebar','code-composer','claudeAppBindings','activeOrganization','/api/organizations/','/v1/code/'];
for(const file of js){const raw=await fs.readFile(file,'utf8');const rel=path.relative(root,file);
 if(raw.includes('sourceMappingURL='))sourceMapRefs.push(rel);
 if(file.startsWith(assets)){
 const imports=[...raw.matchAll(/(?:from\s*|import\s*\(?)["'](\.[^"']+)["']/g)].map(x=>x[1]);
 modules.push({file:path.basename(file),imports:[...new Set(imports)]});
 }
 for(const t of probes){const i=raw.indexOf(t);if(i>=0)(featureHits[t]??=[]).push({file:rel,offset:i,excerpt:raw.slice(Math.max(0,i-80),i+180)});}
}
for(const file of all.filter(x=>x.endsWith('.css'))){const raw=await fs.readFile(file,'utf8');for(const m of raw.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g))tokens.push({name:m[1],value:m[2].trim(),file:path.relative(root,file),offset:m.index});}
const manifest={appVersion:JSON.parse(await fs.readFile(path.join(root,'reference/asar/package.json'),'utf8')).version,files:all.length,jsFiles:js.length,sourceMapFiles:mapFiles.map(x=>path.relative(root,x)),sourceMapReferenceFiles:sourceMapRefs,readableMapping:mapping,featureHits};
await fs.writeFile(path.join(root,'analysis/ui-map.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(root,'analysis/module-imports.json'),JSON.stringify(modules,null,2));
await fs.writeFile(path.join(root,'analysis/css-tokens.json'),JSON.stringify(tokens,null,2));
console.log(JSON.stringify({files:all.length,js:js.length,mapFiles:mapFiles.length,mapReferenceFiles:sourceMapRefs.length,cssDeclarations:tokens.length,uniqueCssProperties:new Set(tokens.map(x=>x.name)).size,formatted:Object.keys(selected)}));
