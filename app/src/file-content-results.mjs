// R3-files FT-18: 2.42304.0 cccc2cf0a oS/uS/pS (old 2.31226.0 uy/my/_y, same logic) from generated/files-changes.
import {groupContentResults,collapseContentWhitespace,contentSnippetLayout} from './generated/files-changes/file-content-results.mjs';
// Bv/Ny: fetch up to 241 rows, show 200 matches with at most five per file.
export function contentResults(matches){
 const grouped=groupContentResults(matches.map(entry=>({...entry,relativePath:entry.path,absPath:entry.path})),241,200,5),rows=[];
 for(const group of grouped.groups){
  rows.push({path:group.entry.relativePath,name:group.entry.name,positions:[],header:true,key:group.entry.relativePath});
  for(const match of group.matches)rows.push({...match,key:`${match.path}:${match.line}:${match.column}`});
  if(group.more)rows.at(-1).more=true;
 }
 return {...grouped,rows};
}
export function contentPreview(entry){
 const trim=entry.preview.length-entry.preview.trimStart().length,text=entry.preview.trim();
 const collapsed=collapseContentWhitespace(text,entry.ranges.map(([start,end])=>({start:Math.max(0,start-trim),end:Math.min(text.length,end-trim)})).filter(r=>r.end>r.start));
 return contentSnippetLayout(collapsed.text,collapsed.matches);
}
