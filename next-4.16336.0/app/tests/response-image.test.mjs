import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {responseImageTarget,imagePng} from '../src/response-image-model.mjs';
const require=createRequire(import.meta.url);
const {IMAGE_LIMIT,readImage,imageData,createImageOperations}=require('../electron/image-files.cjs');
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB8sAAAAASUVORK5CYII=','base64');
const data=(bytes,mime)=>`data:${mime};base64,${bytes.toString('base64')}`;
test('image references distinguish scoped files, encoded names, inline data, remote links and unsupported URLs',()=>{
 for(const src of ['images/chart.png','/fixture/chart.png','file:///fixture/a%20b.svg'])assert.equal(responseImageTarget(src,'/fixture').kind,'file');
 assert.equal(responseImageTarget('file:///fixture/a%2520b.png','/fixture').path,'/fixture/a%20b.png');
 assert.equal(responseImageTarget(data(svg,'image/svg+xml')).kind,'data');
 for(const src of ['file://other/path.png','javascript:alert(1)','data:text/html;base64,YQ==','//other/remote.png'])assert.equal(responseImageTarget(src,'/fixture').kind,'unsupported',src);
 // Classification is not authorization: the main-process reader rejects traversal.
 assert.equal(responseImageTarget('../secret.png','/fixture').kind,'file');
 assert.equal(responseImageTarget('https://example.test/a.png').kind,'remote');assert.equal(responseImageTarget('').kind,'empty');
});
test('scoped image reader preserves actual bytes and rejects traversal, outside symlinks, non-images and oversized files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'response-image-'));const project=path.join(root,'project');await fs.mkdir(project);
 try {
  await fs.writeFile(path.join(project,'a.svg'),svg);await fs.writeFile(path.join(project,'pixel.png'),png);await fs.writeFile(path.join(root,'secret.png'),png);await fs.symlink(path.join(root,'secret.png'),path.join(project,'link.png'));
  const result=await readImage(project,'a.svg');assert.equal(result.mime,'image/svg+xml');assert.deepEqual(imageData(result.dataUrl).bytes,svg);
  assert.deepEqual(imageData((await readImage(project,'pixel.png')).dataUrl).bytes,png);
  await fs.writeFile(path.join(project,'fake.png'),'<html>not an image</html>');await assert.rejects(readImage(project,'fake.png'),/Unsupported/);
  await assert.rejects(readImage(project),/Invalid image path/);await assert.rejects(readImage(project,'../secret.png'),/outside/);await assert.rejects(readImage(project,'link.png'),/outside/);await assert.rejects(readImage(project,'.'),/Not an image/);
  const large=await fs.open(path.join(project,'large.png'),'w');await large.truncate(IMAGE_LIMIT+1);await large.close();await assert.rejects(readImage(project,'large.png'),/30 MB/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('copy waits for a decoded PNG and save honors cancellation, actual selected destination and write failures',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'image-actions-'));let copied=null,canceled=true,options,decoded=true;const destination=path.join(root,'chosen.svg');
 const service=createImageOperations({getRoot:()=>root,clipboard:{writeImage:image=>{copied=image;}},nativeImage:{createFromBuffer:bytes=>({bytes,isEmpty:()=>!decoded})},showSaveDialog:async value=>{options=value;return {canceled,filePath:destination};}});
 try {
  assert.deepEqual(await service.copy({dataUrl:data(png,'image/png')}),{copied:true});assert.deepEqual(copied.bytes,png);
  decoded=false;await assert.rejects(service.copy({dataUrl:data(png,'image/png')}),/decode/);await assert.rejects(service.copy({dataUrl:data(svg,'image/svg+xml')}),/PNG/);
  assert.deepEqual(await service.save({dataUrl:data(svg,'image/svg+xml'),name:'plot.svg'}),{saved:false,canceled:true});await assert.rejects(fs.stat(destination));
  canceled=false;assert.deepEqual(await service.save({dataUrl:data(svg,'image/svg+xml'),name:'../../plot.svg'}),{saved:true});assert.equal(options.defaultPath,'plot.svg');assert.deepEqual(await fs.readFile(destination),svg);
  await fs.rm(root,{recursive:true,force:true});await assert.rejects(service.save({dataUrl:data(svg,'image/svg+xml')}),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('image data validates declared MIME and does not accept HTML or invalid base64 as pixels',()=>{
 for(const value of ['data:image/png;base64,!!!!',data(svg,'image/png'),data(Buffer.from('<script>x</script>'),'image/svg+xml'),'data:image/png;base64,AA='])assert.throws(()=>imageData(value),/Invalid/);
});
test('canvas copy uses the owning document and rejects undecoded images',()=>{
 assert.throws(()=>imagePng({complete:false}),/not ready/);let dimensions,drawn;
 const canvas={getContext:()=>({drawImage:image=>{drawn=image;}}),toDataURL:mime=>{dimensions=[canvas.width,canvas.height,mime];return 'data:image/png;base64,fixture';}};
 const image={complete:true,naturalWidth:20,naturalHeight:10,ownerDocument:{createElement:type=>{assert.equal(type,'canvas');return canvas;}}};
 assert.equal(imagePng(image),'data:image/png;base64,fixture');assert.deepEqual(dimensions,[20,10,'image/png']);assert.equal(drawn,image);
});
