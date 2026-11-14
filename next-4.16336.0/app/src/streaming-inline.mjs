import { decodeString } from 'micromark-util-decode-string';
const punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const whitespace = char => char === undefined || /[ \t\r\n]/.test(char);
const asciiWord = char => !!char && /[a-z0-9]/i.test(char);
const makeText = value => ({type:'text',value});
const incomplete = {hProperties:{'data-incomplete':''}};

// Recover escape provenance without re-decoding an AST's already decoded text.
// The suffix alignment discards only container prefixes (blockquote/list indent)
// that the existing CommonMark parser has already removed from each text line.
export function frontierTextUnits(node, source) {
  const start=node.position?.start?.offset,end=node.position?.end?.offset;
  if (!Number.isInteger(start)||!Number.isInteger(end)) return null;
  const raw=source.slice(start,end), lines=[[]];
  for(let i=0;i<raw.length;) {
    if(raw[i]==='\r'||raw[i]==='\n') {if(raw[i]==='\r'&&raw[i+1]==='\n')i++;i++;lines.push([]);continue;}
    let length=1,escaped=false;
    if(raw[i]==='\\'&&punctuation.test(raw[i+1]||'')){length=2;escaped=true;}
    else if(raw[i]==='&') {const entity=/^&(?:#[xX][\da-fA-F]{1,6}|#\d{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/.exec(raw.slice(i));if(entity){length=entity[0].length;escaped=true;}}
    if(length===1&&!escaped&&!/[\\&`*_~[\]()!]/.test(raw[i])){while(i+length<raw.length&&!/[\\&`*_~[\]()!\r\n]/.test(raw[i+length]))length++;}
    const spelling=raw.slice(i,i+length);lines.at(-1).push({value:escaped?decodeString(spelling):spelling,raw:spelling,escaped});i+=length;
  }
  const values=node.value.split(/\r\n|\r|\n/);if(lines.length!==values.length)return null;
  const result=[];
  for(let line=0;line<lines.length;line++) {
    const units=lines[line],actual=units.map(u=>u.value).join(''),wanted=values[line];
    if(!actual.endsWith(wanted))return null;
    let discard=actual.length-wanted.length,index=0;
    while(discard>0&&index<units.length){
      const unit=units[index];
      if(discard<unit.value.length){if(unit.escaped)return null;units[index]={...unit,value:unit.value.slice(discard),raw:unit.raw.slice(discard)};discard=0;}
      else{discard-=unit.value.length;index++;}
    }
    if(discard!==0)return null;
    if(line)result.push({value:'\n',raw:'\n',escaped:false});for(const unit of units.slice(index))result.push(unit);
  }
  return result;
}
function literalNode(node, source, column) {
  const start=node.position?.start?.offset,end=node.position?.end?.offset;
  if(!Number.isInteger(start)||!Number.isInteger(end))return node.value||'';
  return source.slice(start,end).split(/\r\n|\r|\n/).map((line,index)=>{
    if(!index)return line;
    const quote=/^(?: {0,3}>[ \t]?)+/.exec(line)?.[0]||'';
    const spaces=/^ */.exec(line.slice(quote.length))[0].length;
    return line.slice(quote.length+Math.min(spaces,Math.max(0,column-1-quote.length)));
  }).join('\n');
}

// Completed MDAST nodes are opaque. Only unpaired delimiters in the growing
// inline container are interpreted; no closing characters are added to source.
export function completeFrontierInline(children, source, column=1) {
  // Y holds a final shortcut closing bracket until another character arrives.
  // Explicit and collapsed references resolve at their first closing bracket.
  children=children.flatMap(node=>{
    if(['linkReference','imageReference'].includes(node.type)&&node.referenceType==='shortcut'&&node.position?.end.offset===source.length){
      // imageReference keeps only plain alt; recover its inline spelling so
      // held labels retain emphasis/code and escape provenance as Y does.
      if(node.type==='imageReference')return {type:'text',value:decodeString(literalNode(node,source,column)),position:node.position};
      return [makeText('['),...node.children,makeText(']')];
    }
    return node;
  });
  if(!children.some(node=>node.type==='text'&&/[`*_~[\]\\]/.test(node.value)))return children;
  const input=[];
  for(const node of children) {
    const units=node.type==='text'?frontierTextUnits(node,source):null;
    if(units){for(const unit of units)input.push(unit);}else input.push({node,raw:literalNode(node,source,column)});
  }
  const root={children:[]},stack=[root];let operations=0,linkScans=0;
  const top=()=>stack.at(-1);
  const append=value=>{if(!value)return;const list=top().children,last=list.at(-1);if(last?.type==='text')last.value+=value;else list.push(makeText(value));};
  const finish=(open=true,literal=false)=>{
    const frame=stack.pop();
    if(literal){append(frame.marker);for(const child of frame.children)top().children.push(child);return;}
    if(frame.type==='inlineCode')top().children.push({type:'inlineCode',value:frame.value,...(open?{data:incomplete}:{})});
    else top().children.push({type:frame.type,children:frame.children,...(open?{data:incomplete}:{})});
  };
  const push=(type,marker,canClose=false)=>{
    if(stack.length>256||operations++>=256){append(marker);return false;}
    stack.push({type,marker,canClose,children:[],value:''});return true;
  };
  const char=(index)=>input[index]?.node?undefined:input[index]?.value;
  for(let i=0;i<input.length;) {
    const unit=input[i],value=unit.value;
    if(top().type==='inlineCode') {
      if(!unit.node&&!unit.escaped&&value==='`') {
        let end=i;while(char(end)==='`'&&!input[end].escaped)end++;
        const count=end-i;
        if(count===top().marker.length){finish(false);i=end;continue;}
        if(end===input.length&&count<top().marker.length){i=end;continue;}
        top().value+='`'.repeat(count);i=end;continue;
      }
      top().value+=unit.raw;i++;continue;
    }
    if(unit.node){top().children.push(unit.node);i++;continue;}
    if(unit.escaped){append(value);i++;continue;}
    if(value==='`') {let end=i;while(char(end)==='`'&&!input[end].escaped)end++;push('inlineCode','`'.repeat(end-i));i=end;continue;}
    if(value==='!'&&char(i+1)==='['&&!input[i+1].escaped){push('image','![');i+=2;continue;}
    if(value==='['&&input[i+1]?.value?.[0]!=='^'){push('link','[');i++;continue;}
    if(value===']'&&char(i+1)==='('&&!input[i+1].escaped) {
      let target=stack.length-1;while(target>0&&!['link','image'].includes(stack[target].type))target--;
      const tail=target>0&&linkScans++<256?input.slice(i+2).map(x=>x.raw).join(''):null;let depth=0,closed=tail===null;
      for(const character of tail||''){if(character==='(')depth++;else if(character===')'){if(!depth){closed=true;break;}depth--;}}
      if(target>0&&!closed) {
        while(stack.length-1>target)finish(false,true);
        const label=stack.pop(),url=tail;
        // Only the incomplete tail reaches here. Complete links are original
        // parser nodes, including their title/reference/escaping semantics.
        const plain=node=>node.type==='image'?node.alt||'':node.value??(node.children||[]).map(plain).join('');
        top().children.push(label.type==='image'?{type:'image',url,alt:label.children.map(plain).join(''),data:incomplete}:{type:'link',url,children:label.children,data:incomplete});i=input.length;continue;
      }
    }
    if(value==='*'||value==='_'||value==='~') {
      let end=i;while(char(end)===value&&!input[end].escaped)end++;
      const marker=value.repeat(end-i),before=input[i-1]?.raw?.at(-1),after=input[end]?.raw?.[0];
      if(value==='_'&&asciiWord(before)&&asciiWord(after)){append(marker);i=end;continue;}
      if(value==='~'&&marker.length!==2){if(!(marker.length===1&&end===input.length))append(marker);i=end;continue;}
      const canOpen=!whitespace(after),canClose=!whitespace(before);
      let match=-1;
      if(canClose||value==='~')for(let k=stack.length-1;k>0;k--){const frame=stack[k];if(frame.marker===marker&&(!canOpen||!frame.canClose||(frame.marker.length+marker.length)%3!==0||marker.length%3===0)){match=k;break;}}
      if(match>0){while(stack.length-1>match)finish(false,true);finish(false);}
      else if(canOpen||value==='~')push(value==='~'?'delete':marker.length>=2?'strong':'emphasis',marker,canClose);
      else append(marker);
      i=end;continue;
    }
    // Source hides a trailing pending escape in a growing chunk.
    if(value==='\\'&&i===input.length-1){i++;continue;}
    append(value);i++;
  }
  while(stack.length>1)finish(true,['link','image'].includes(top().type));
  return root.children;
}

export function remarkStreamingInline({enabled=false}={}) {
  return (tree,file)=>{
    if(!enabled)return;
    const source=String(file.value);
    if(/(?:\r?\n|\r)[ \t]*(?:\r?\n|\r)[ \t]*$/.test(source))return;
    const walk=node=>{
      if(['paragraph','heading','tableCell'].includes(node.type)) {
        const end=node.position?.end?.offset;if(!Number.isInteger(end)||source.slice(end).trim())return;
        if(node.type==='heading'&&/[\r\n]/.test(source.slice(end)))return;
        if(node.type==='tableCell'){const terminal=/(\\*)\|[ \t]*(?:\r?\n)?$/.exec(source);if(terminal&&terminal[1].length%2===0)return;}
        node.children=completeFrontierInline(node.children,source,node.position?.start?.column||1);return;
      }
      // Fences, HTML, metadata and previously parsed inline nodes are excluded.
      if(['root','list','listItem','blockquote','table','tableRow','footnoteDefinition'].includes(node.type))for(const child of node.children||[])walk(child);
    };
    walk(tree);
  };
}
