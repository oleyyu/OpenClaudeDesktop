import {t} from '../electron/i18n/index.mjs';
export function parseWorkflowLaunch(input=''){
 let text=input.trim(),args={},plan=false,resumeId;
 const argsAt=text.indexOf('--args ');if(argsAt>=0){args=JSON.parse(text.slice(argsAt+7));text=text.slice(0,argsAt).trim();if(!args||typeof args!=='object'||Array.isArray(args))throw Error(t('--args must be a JSON object and the last option.'));}
 const parts=[...text.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g)].map(m=>m[1]!==undefined?JSON.parse('"'+m[1]+'"'):m[2]??m[3]);let file='';
 for(let i=0;i<parts.length;i++){const part=parts[i];if(part==='--plan')plan=true;else if(part==='--resume'){resumeId=parts[++i];if(!resumeId)throw Error(t('Provide a run id after --resume.'));}else if(!file&&!part.startsWith('--'))file=part;else throw Error(t('Use /workflow [path] [--plan] [--resume run-id] [--args JSON].'));}
 return {file,args,plan,resumeId};
}
