// Installed before page script execution; bridge goes only to the isolated main store.
export function installMemoryClipboard(){
 const invoke=(method,...args)=>window.__offscreenClipboard(method,args);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
  readText:()=>invoke('readText'),writeText:text=>invoke('writeText',String(text)),
  read:async()=>Promise.all((await invoke('read')).map(item=>new ClipboardItem(Object.fromEntries(Object.entries(item).map(([type,bytes])=>[type,new Blob([Uint8Array.from(bytes)],{type})]))))),
  write:async items=>invoke('write',await Promise.all(items.map(async item=>Object.fromEntries(await Promise.all(item.types.map(async type=>[type,Array.from(new Uint8Array(await (await item.getType(type)).arrayBuffer()))])))))),
 }});
}
