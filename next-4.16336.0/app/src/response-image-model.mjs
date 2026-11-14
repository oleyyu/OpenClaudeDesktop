import { chipPathOpenable, normalizeHttpUrl } from './user-inline-model.mjs';
export function responseImageTarget(src,cwd) {
  if(typeof src!=='string' || !src)return {kind:'empty'};
  if(src.length<=41943168 && /^data:image\/(png|jpeg|gif|webp|bmp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(src))return {kind:'data',url:src};
  const remote=normalizeHttpUrl(src);
  if(remote)return {kind:'remote',url:remote};
  let path=src;
  if(/^file:/i.test(src)) {
    try {const url=new URL(src);if(url.hostname)return {kind:'unsupported'};path=decodeURIComponent(url.pathname);}catch{return {kind:'unsupported'};}
  } else {
    if(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(src))return {kind:'unsupported'};
    try {path=decodeURI(src);}catch{}
  }
  return path && !path.includes('\0') && chipPathOpenable(path,cwd)?{kind:'file',path}:{kind:'unsupported'};
}

// The canvas is owned by the image's document, matching source copy behavior.
// This only encodes pixels; the actual clipboard write is an awaited IPC action.
export function imagePng(image) {
  if(!image?.complete || !image.naturalWidth || !image.naturalHeight)throw Error('Image is not ready.');
  const canvas=image.ownerDocument.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d');
  if(!context)throw Error('Couldn’t copy image.');
  context.drawImage(image,0,0);
  return canvas.toDataURL('image/png');
}
