import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const source=path.resolve(root,'../reference/current-2.2553.1/ion-dist/assets/v1');
const evidence=path.resolve(root,'../analysis/batch-20260920');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
const assets=JSON.parse(await fs.readFile(path.join(root,'dist/ui-provenance.json'),'utf8'));
const verifiedSources=[];
for(const entry of build.sources){
  assert.equal(digest(await fs.readFile(path.join(root,entry.path))),entry.sha256,`Source changed after build: ${entry.path}`);
  verifiedSources.push(entry.path);
}
assert.equal(digest(JSON.stringify(build.sources)),build.sourceSha256,'Build source manifest digest');
for(const entry of assets.files){
  // sourceDir: the design-system CSS, fonts and icon map come from 2.31226.0 (prepare-ui.mjs designSource, B38).
  assert.equal(digest(await fs.readFile(path.join(entry.sourceDir?path.resolve(root,entry.sourceDir):source,entry.source))),entry.sourceSha256,`Official source mismatch: ${entry.source}`);
  assert.equal(digest(await fs.readFile(path.join(root,entry.output))),entry.outputSha256,`Prepared asset mismatch: ${entry.output}`);
  if(entry.output.startsWith('public/'))assert.equal(digest(await fs.readFile(path.join(root,'dist',entry.output.slice(7)))),entry.outputSha256,`Built asset mismatch: ${entry.output}`);
}
const highlight=JSON.parse(await fs.readFile(path.join(root,'dist/highlight-build.json'),'utf8'));
const wordDiff=JSON.parse(await fs.readFile(path.join(root,'dist/word-diff-build.json'),'utf8'));
const math=JSON.parse(await fs.readFile(path.join(root,'dist/response-math-build.json'),'utf8'));
assert.equal(math.katex,'0.16.47');
assert.ok(math.files.some(file=>file.file===math.entry));
assert.ok(math.files.some(file=>file.file.endsWith('.woff2')));
assert.ok(math.files.some(file=>file.file.endsWith('.css')));
for(const entry of math.files){
  assert.match(entry.file,/^assets\/[a-zA-Z0-9_.-]+$/);
  const bytes=await fs.readFile(path.join(root,'dist',entry.file));
  assert.equal(bytes.length,entry.bytes);assert.equal(digest(bytes),entry.sha256,'KaTeX renderer/CSS/font bytes match build graph');
}
assert.equal(wordDiff.entry,'src/word-diff-worker.mjs');
assert.deepEqual(wordDiff.modules,['src/word-diff-model.mjs','src/word-diff-worker.mjs']);
assert.ok(wordDiff.files.some(file=>file.file===wordDiff.entryFile));
for(const entry of wordDiff.files){
  assert.match(entry.file,/^assets\/[a-zA-Z0-9_-]+\.js$/);
  const bytes=await fs.readFile(path.join(root,'dist',entry.file));
  assert.equal(bytes.length,entry.bytes);assert.equal(digest(bytes),entry.sha256,'Word diff worker bytes match build graph');
}
assert.equal(highlight.engine,'shiki-javascript');
assert.equal(highlight.shiki,'4.4.3');
// Every bundled grammar of the original table ships as a lazy chunk (c5a058668, 235 ids).
const {BUNDLED_LANGUAGES}=await import('../src/highlight-languages.mjs');
assert.deepEqual(highlight.languages,BUNDLED_LANGUAGES.map(([id])=>id));
const grammarNames=new Set(highlight.grammars.map(name=>name.split('/').at(-1)));
for(const [id] of BUNDLED_LANGUAGES)assert.ok(grammarNames.has(`${id}.mjs`),`Missing grammar ${id}`);
assert.ok(highlight.largestGrammarChunk<1_000_000,'No grammar chunk reaches 1 MB');
const {CODE_THEMES}=await import('../electron/code-theme-catalog.mjs');
assert.deepEqual([...highlight.themes].sort(),CODE_THEMES.map(e=>e.value).filter(v=>!v.startsWith('claude-')).sort(),'Settled worker ships exactly the catalog theme modules');
for(const file of highlight.files){
  assert.match(file.file,/^assets\/[a-zA-Z0-9_-]+\.js$/);
  const bytes=await fs.readFile(path.join(root,'dist',file.file));
  assert.equal(bytes.length,file.bytes);
  assert.equal(digest(bytes),file.sha256,`Highlight chunk mismatch: ${file.file}`);
}
const noticePath='third-party/highlight/manifest.json';
assert.equal(digest(await fs.readFile(path.join(root,'dist',noticePath))),digest(await fs.readFile(path.join(root,'build/highlight-notices/manifest.json'))));
const notices=JSON.parse(await fs.readFile(path.join(root,'dist',noticePath),'utf8'));
for(const entry of notices.entries){
  assert.equal(entry.file,path.basename(entry.file));
  assert.equal(digest(await fs.readFile(path.join(root,'dist/third-party/highlight',entry.file))),entry.sha256,`Packaged dependency notice mismatch: ${entry.file}`);
}
const editorNoticePath='third-party/editor/manifest.json';
assert.equal(digest(await fs.readFile(path.join(root,'dist',editorNoticePath))),digest(await fs.readFile(path.join(root,'build/editor-notices/manifest.json'))));
const editorNotices=JSON.parse(await fs.readFile(path.join(root,'dist',editorNoticePath),'utf8'));
for(const entry of editorNotices){assert.equal(entry.file,path.basename(entry.file));assert.equal(digest(await fs.readFile(path.join(root,'dist/third-party/editor',entry.file))),entry.sha256);assert.equal(JSON.parse(await fs.readFile(path.join(root,'node_modules',entry.name,'package.json'),'utf8')).version,entry.version);}
const report={passed:true,at:new Date().toISOString(),version:build.version,builtAt:build.builtAt,sourceSha256:build.sourceSha256,sourceFiles:verifiedSources.length,math:{version:math.katex,entry:math.entry,files:math.files.length,bytes:math.files.reduce((n,f)=>n+f.bytes,0)},wordDiff:{entry:wordDiff.entryFile,files:wordDiff.files.length,bytes:wordDiff.files.reduce((n,file)=>n+file.bytes,0)},assets:assets.files.length,glyphs:assets.files.find(e=>e.output==='src/generated/icons.json')?.count,highlight:{chunks:highlight.files.length,rawBytes:highlight.rawBytes,gzipBytes:highlight.gzipBytes,grammarBytes:highlight.grammarBytes,largestGrammarChunk:highlight.largestGrammarChunk,notices:notices.entries.length},editor:{notices:editorNotices.length},checks:['pinned editor dependencies and shipped licenses match their manifest','current source files match the built source manifest, including lockfile/config/notices','source manifest digest matches','original 2.2553.1 assets match provenance','prepared and built assets match provenance','production worker graph (engine chunks plus one lazy chunk per bundled grammar) and shipped dependency notices match their hashes','word diff worker dependency graph and built bytes match their manifest','KaTeX on-demand renderer, CSS and local font bytes match production manifest'],note:'Integrity only. Unit/UI/Codex/installed-app verification have separate timestamped reports.'};
await fs.mkdir(evidence,{recursive:true});
await fs.writeFile(path.join(evidence,'source-integrity.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
