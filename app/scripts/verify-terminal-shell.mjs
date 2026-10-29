import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {extractTerminalShell} from './extract-terminal-shell.mjs';
const root=path.resolve(import.meta.dirname,'..'),directory=path.join(root,'electron/generated');
const manifest=JSON.parse(await fs.readFile(path.join(directory,'terminal-shell-manifest.json'),'utf8'));
for(const [file,expected] of [[path.resolve(root,manifest.source),manifest.sourceSha256],...(manifest.helpers??[]).map(h=>[path.resolve(root,h.file),h.sourceSha256]),[path.join(directory,manifest.output),manifest.sha256]]){
 const actual=createHash('sha256').update(await fs.readFile(file)).digest('hex');if(actual!==expected)throw Error('Terminal shell provenance mismatch: '+file);
}
// The generated module is exactly what the generator emits from the snapshot today.
await extractTerminalShell({check:true});
console.log('Original desktop shell scripts and launch planner verified.');
