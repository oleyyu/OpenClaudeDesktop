// Verification boundary only. Never forwards to an OS clipboard implementation.
const {Blob}=require('node:buffer');
function createMemoryClipboard(record=()=>{}){
 let formats=new Map([['text/plain',Buffer.from('ISOLATED_CLIPBOARD_SEED')],['text/html',Buffer.from('<b>ISOLATED_CLIPBOARD_SEED</b>')]]);
 class ClipboardItem{
  constructor(values){this.values=values;this.types=Object.keys(values);}
  async getType(type){if(!this.types.includes(type))throw Error('Unsupported clipboard type');return await this.values[type];}
 }
 const snapshot=()=>Object.fromEntries([...formats].map(([type,bytes])=>[type,bytes.toString('base64')]));
 const initial=snapshot();
 const clipboard={
  readText(){record('readText');return formats.get('text/plain')?.toString('utf8')||'';},
  readHTML(){record('readHTML');return formats.get('text/html')?.toString('utf8')||'';},
  writeText(text){record('writeText');formats=new Map([['text/plain',Buffer.from(String(text))]]);},
  writeHTML(text){record('writeHTML');formats=new Map([['text/html',Buffer.from(String(text))]]);},
  clear(){record('clear');formats=new Map();},
  availableFormats(){record('availableFormats');return [...formats.keys()];},
  async read(){record('read');return formats.size?[new ClipboardItem(Object.fromEntries([...formats].map(([type,bytes])=>[type,new Blob([bytes],{type})])))]:[];},
  async write(items){record('write');const next=new Map();
   if(Array.isArray(items)){for(const item of items)for(const type of item.types)next.set(type,Buffer.from(await (await item.getType(type)).arrayBuffer()));}
   else for(const [name,type] of [['text','text/plain'],['html','text/html'],['rtf','text/rtf']])if(typeof items?.[name]==='string')next.set(type,Buffer.from(items[name]));
   formats=next;
  },
 };
 async function invoke(method,args=[]){
  if(method==='write'){await clipboard.write(args[0].map(item=>new ClipboardItem(Object.fromEntries(Object.entries(item).map(([type,bytes])=>[type,new Blob([Uint8Array.from(bytes)],{type})])))));return;}
  if(method==='read')return Promise.all((await clipboard.read()).map(async item=>Object.fromEntries(await Promise.all(item.types.map(async type=>[type,Array.from(new Uint8Array(await (await item.getType(type)).arrayBuffer()))])))));
  if(!['readText','writeText'].includes(method))throw Error('Unsupported verification clipboard operation');
  return clipboard[method](...args);
 }
 return {clipboard,ClipboardItem,invoke,snapshot,initial};
}
module.exports={createMemoryClipboard};
