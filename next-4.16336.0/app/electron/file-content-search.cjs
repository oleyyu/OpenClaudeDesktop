const fs=require('node:fs');
const path=require('node:path');
// Runs only inside the cancellable worker process, under the existing trusted
// root, candidate enumeration, deadline and response-byte limits.
async function searchContents({root,identity,candidates,request,limits,output,safeRegularFile}){
 const {compileSearch,skipsLongLine}=await import('./generated/file-search.mjs');
 const query=request.query.replace(/^\?\s*/,''),options={matchCase:false,wholeWord:false,regexp:false,...request.options};
 if(!query)return;
 const matcher=compileSearch(query,options);
 if(!matcher)throw Object.assign(Error('Invalid regular expression'),{code:'INVALID_PATTERN'});
 let readBytes=0,responseBytes=2048;
 for(const relative of [...candidates].sort()){
  if(!safeRegularFile(root,relative,identity,limits))continue;
  const target=path.join(root,relative);let fd,text;
  try{
   fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
   const stat=fs.fstatSync(fd);
   if(!stat.isFile()||stat.dev!==identity.dev||!safeRegularFile(root,relative,identity,limits))continue;
   const current=fs.lstatSync(target);if(current.ino!==stat.ino||current.dev!==stat.dev)continue;
   if(stat.size>limits.maxContentFileBytes){output.truncationReasons.push('content-file-limit');continue;}
   if(readBytes+stat.size>limits.maxContentBytes){output.truncationReasons.push('content-byte-limit');break;}
   const bytes=Buffer.alloc(stat.size+1);let total=0;
   while(total<bytes.length){const got=fs.readSync(fd,bytes,total,bytes.length-total,null);if(!got)break;total+=got;}
   readBytes+=total;
   if(total>stat.size){output.truncationReasons.push('workspace-changed');continue;}
   const data=bytes.subarray(0,total);if(data.includes(0))continue;
   try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{continue;}
  }catch(error){if(['ENOENT','ENOTDIR','ELOOP'].includes(error.code))continue;output.truncationReasons.push('content-read-error');continue;}
  finally{if(fd!==undefined)fs.closeSync(fd);}
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  for(let index=0;index<lines.length;index++){
   const line=lines[index];
   if(skipsLongLine(matcher,line.length)){output.truncationReasons.push('content-long-line');continue;}
   const ranges=matcher(line);
   if(!ranges.length)continue;
   // One result per matching line, like the original content-search transport.
   const start=Math.max(0,ranges[0][0]-160);let offset=start;
   if(offset>0&&/[\uDC00-\uDFFF]/.test(line[offset]))offset--;
   let end=Math.min(line.length,offset+700);if(end<line.length&&/[\uDC00-\uDFFF]/.test(line[end]))end--;
   const preview=line.slice(offset,end);
   const match={path:relative,name:path.basename(relative),directory:false,positions:[],line:index+1,column:ranges[0][0]+1,preview,
    ranges:ranges.filter(([a,b])=>a>=offset&&b<=end).map(([a,b])=>[a-offset,b-offset]),previewOffset:offset};
   responseBytes+=Buffer.byteLength(JSON.stringify(match));
   if(responseBytes>limits.maxResultBytes-2048){output.truncationReasons.push('result-output-limit');return;}
   output.matches.push(match);
   if(output.matches.length>=limits.maxContentResults){output.truncationReasons.push('result-limit');return;}
  }
 }
}
module.exports={searchContents};
