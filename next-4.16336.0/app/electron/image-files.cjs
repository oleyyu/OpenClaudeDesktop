const fs = require('node:fs/promises');
const path = require('node:path');
const { scopedPath } = require('./files.cjs');
const IMAGE_LIMIT = 30 * 1024 * 1024;
const extensions = { 'image/png':'png', 'image/jpeg':'jpg', 'image/gif':'gif', 'image/webp':'webp', 'image/bmp':'bmp', 'image/svg+xml':'svg' };
function imageMime(bytes) {
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (/^GIF8[79]a/.test(bytes.toString('ascii',0,6))) return 'image/gif';
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp';
  if (bytes.toString('ascii',0,2)==='BM') return 'image/bmp';
  const prefix=bytes.subarray(0,4096).toString('utf8').replace(/^\uFEFF/,'').trimStart();
  if (/^(?:<\?xml\b[^?]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(prefix)) return 'image/svg+xml';
  return null;
}
function imageData(dataUrl) {
  if (typeof dataUrl!=='string' || dataUrl.length>Math.ceil(IMAGE_LIMIT/3)*4+128) throw Error('Image exceeds the 30 MB limit.');
  const match=/^data:(image\/(?:png|jpeg|gif|webp|bmp|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match || !match[2] || match[2].length%4) throw Error('Invalid image data.');
  const bytes=Buffer.from(match[2],'base64'), mime=imageMime(bytes);
  if (!mime || mime!==match[1] || bytes.length>IMAGE_LIMIT) throw Error('Invalid image data.');
  return { bytes, mime, extension:extensions[mime] };
}
async function readImage(root, relative) {
  if(typeof relative!=='string' || !relative || relative.includes('\0')) throw Error('Invalid image path.');
  const target=await scopedPath(root,relative),handle=await fs.open(target,'r');
  try {
    const stat=await handle.stat();
    if(!stat.isFile())throw Error('Not an image file.');
    if(stat.size>IMAGE_LIMIT)throw Error('Image exceeds the 30 MB limit.');
    const buffer=Buffer.alloc(stat.size+1);
    let length=0;
    while(length<buffer.length){
      const {bytesRead}=await handle.read(buffer,length,buffer.length-length,null);
      if(!bytesRead)break;
      length+=bytesRead;
    }
    if(length!==stat.size)throw Error('Image changed while reading. Please try again.');
    const bytes=buffer.subarray(0,length);
    const mime=imageMime(bytes);
    if(!mime)throw Error('Unsupported image format.');
    return { path:relative, name:path.basename(target), mime, dataUrl:`data:${mime};base64,${bytes.toString('base64')}` };
  } finally {await handle.close();}
}
function createImageOperations({getRoot,clipboard,nativeImage,showSaveDialog}) {
  return {
    read:params=>readImage(getRoot(params.cwd),params.path),
    copy:async({dataUrl})=>{
      const {bytes,mime}=imageData(dataUrl);
      if(mime!=='image/png')throw Error('Clipboard images must be PNG.');
      const image=nativeImage.createFromBuffer(bytes);
      if(image.isEmpty())throw Error('Could not decode image.');
      clipboard.writeImage(image);return {copied:true};
    },
    save:async({dataUrl,name})=>{
      const {bytes,extension}=imageData(dataUrl);
      const safeName=path.basename(typeof name==='string' && name?name:`image.${extension}`).replace(/[\0\r\n]/g,'').slice(0,180);
      const result=await showSaveDialog({title:'Save image',defaultPath:safeName,filters:[{name:'Image',extensions:[extension]}]});
      if(result.canceled || !result.filePath)return {saved:false,canceled:true};
      await fs.writeFile(result.filePath,bytes);return {saved:true};
    },
  };
}
module.exports={IMAGE_LIMIT,imageMime,imageData,readImage,createImageOperations};
