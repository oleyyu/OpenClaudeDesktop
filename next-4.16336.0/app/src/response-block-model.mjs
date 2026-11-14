import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import {remarkResponseMath} from './remark-response-math.mjs';
import {remarkResponseFootnotes} from './remark-response-footnotes.mjs';
import {remarkFrontierDefinitions} from './frontier-definitions.mjs';

// Own immutable scheduling layer. The syntax recognizer is the existing open
// source parser; no official parser/bundle is loaded or evaluated.
const recognizer=unified().use(remarkParse).use(remarkGfm)
  .use(remarkMath,{singleDollarTextMath:false}).use(remarkResponseMath).use(remarkResponseFootnotes).freeze();
const frontierRecognizer=recognizer().use(remarkFrontierDefinitions,{enabled:true}).freeze();
const normalizedLabel=value=>value.replace(/\s+/g,' ').trim().toUpperCase();
const newlineAfter=(source,end)=>/^[ \t]*\r?\n/.test(source.slice(end));
function closedByOwnLine(node,source) {
  const start=node.position.start.offset,end=node.position.end.offset;
  if(!newlineAfter(source,end))return false;
  if(['heading','thematicBreak','responseFootnoteDefinition','definition'].includes(node.type))return true;
  if(['paragraph','table'].includes(node.type)&&/^(?:[ \t]*\r?\n){2}/.test(source.slice(end)))return true;
  if(node.type==='code'||node.type==='math'){
    const lines=source.slice(start,end).split(/\r\n|\n/),opening=/^ {0,3}(`{3,}|~{3,}|\${2,})/.exec(lines[0]);
    if(!opening||lines.length<2)return false;
    const marker=opening[1],last=lines.at(-1);
    return new RegExp('^ {0,3}'+(marker[0]==='$'?'\\$':marker[0])+'{'+marker.length+',}[ \\t]*$').test(last);
  }
  return false;
}
const sameBlock=(a,b)=>a&&a.index===b.index&&a.start===b.start&&a.text===b.text&&a.definitions===b.definitions&&a.frontier===b.frontier;
export function advanceResponseBlocks(previous,text,isStreaming=true) {
  const append=previous&&text.startsWith(previous.text);
  const old=append?previous:null,committed=old?.committed||[],offset=old?.offset||0;
  const tail=text.slice(offset),nodes=mergeResponseQuotes((isStreaming?frontierRecognizer:recognizer).parse(tail)).children;
  let definitions=old?.definitions||'',labels=new Set(old?.labels||[]),safe=0;
  // Do not freeze a preceding paragraph on an ambiguous partial next marker
  // (e.g. '#', which may become '#word'). A complete next line establishes it.
  for(let index=0;index<nodes.length;index++){
    const node=nodes[index],next=nodes[index+1];
    const nextLineComplete=next&&tail.indexOf('\n',next.position.start.offset)>=0;
    if(closedByOwnLine(node,tail)||nextLineComplete)safe=index+1;else break;
  }
  const nextCommitted=[...committed],frontier=[];
  let nextOffset=offset,committedDefinitions=definitions,committedLabels=labels;
  for(let index=0;index<nodes.length;index++){
    const node=nodes[index],start=node.position.start.offset;
    const end=nodes[index+1]?.position.start.offset??tail.length;
    const stable=index<safe;
    if(node.type==='definition'){
      // A definition is available only once its actual line has arrived.
      if(newlineAfter(tail,node.position.end.offset)){
        const label=normalizedLabel(node.identifier);
        if(!labels.has(label)){labels=new Set(labels);labels.add(label);definitions+=(definitions?'\n':'')+tail.slice(start,node.position.end.offset);}
      }
    }else{
      const block={index:nextCommitted.length+frontier.length,start:offset+start,text:tail.slice(start,stable?node.position.end.offset:end),definitions,frontier:!stable&&isStreaming,type:node.type};
      const oldBlock=old?.blocks[block.index];
      const value=sameBlock(oldBlock,block)?oldBlock:block;
      (stable?nextCommitted:frontier).push(value);
    }
    if(stable){nextOffset=offset+end;committedDefinitions=definitions;committedLabels=labels;}
  }
  // Preserve an incomplete whitespace-only line: its indentation may become code.
  if(!nodes.length&&tail.trim()==='')nextOffset=offset+tail.lastIndexOf('\n')+1;
  const stableArray=nextCommitted.length===committed.length?committed:nextCommitted;
  return {text,isStreaming,offset:nextOffset,committed:stableArray,definitions:committedDefinitions,labels:committedLabels,
    blocks:[...stableArray,...frontier],parsedChars:tail.length,totalParsedChars:(old?.totalParsedChars||0)+tail.length};
}

// Micromark needs prior definitions during tokenization. Prepend metadata so
// an unclosed fence/math/HTML tail cannot consume it as user-visible content.
// Restore real source coordinates before any of our transforms run.
export function remarkPriorDefinitions({definitions=''}) {
  if(!definitions)return;
  const parse=this.parser,prefix=definitions+'\n\n',lines=(prefix.match(/\n/g)||[]).length;
  this.parser=(source,file)=>{
    const tree=parse(prefix+source,file);
    const adjust=node=>{
      if(node.position?.start.offset>=prefix.length){
        for(const point of [node.position.start,node.position.end]){point.offset-=prefix.length;point.line-=lines;}
      }
      for(const child of node.children||[])adjust(child);
    };
    for(const child of tree.children)adjust(child);
    tree.position={start:{line:1,column:1,offset:0},end:{...tree.position.end,offset:tree.position.end.offset-prefix.length,line:tree.position.end.line-lines}};
    return tree;
  };
}

// sa keeps an open quote through blank lines. CommonMark instead emits two
// adjacent quotes; merge that representation before scheduling and rendering.
function mergeResponseQuotes(tree){
  if(!tree.children)return tree;
  const next=[];
  for(const child of tree.children){
    const previous=next.at(-1);
    if(child.type==='blockquote'&&previous?.type==='blockquote'){previous.children.push(...child.children);previous.position={start:previous.position.start,end:child.position.end};}
    else next.push(child);
  }
  tree.children=next;for(const child of next)mergeResponseQuotes(child);return tree;
}
export function remarkResponseBlockQuotes(){return mergeResponseQuotes;}
