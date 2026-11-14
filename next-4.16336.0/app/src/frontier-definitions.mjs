// sa commits definitions on complete lines; its live-line classifier instead
// treats them as prose. Reparse only this case using the same configured parser.
// The inserted ordinary character exists solely in the parsing copy.
export function remarkFrontierDefinitions({enabled=false}={}) {
  if(!enabled)return;
  const parse=this.parser;
  this.parser=(source,file)=>{
    const tree=parse(source,file);
    let candidate;
    const visit=node=>{
      if(['definition','responseFootnoteDefinition'].includes(node.type)){
        const p=node.position;
        if(p&&p.start.line===p.end.line&&!/[\r\n]/.test(source.slice(p.end.offset))&&!source.slice(p.end.offset).trim())candidate=node;
      }
      for(const child of node.children||[])visit(child);
    };
    visit(tree);
    if(!candidate)return tree;
    const {offset,line}=candidate.position.start;
    const result=parse(source.slice(0,offset)+'x'+source.slice(offset),file);
    const restore=node=>{
      if(node.type==='text'&&node.position?.start.offset===offset&&node.value.startsWith('x'))node.value=node.value.slice(1);
      if(node.position)for(const point of [node.position.start,node.position.end]){
        if(point.offset>offset){point.offset--;if(point.line===line)point.column--;}
      }
      for(const child of node.children||[])restore(child);
      if(node.children)node.children=node.children.filter(child=>child.type!=='text'||child.value!=='');
    };
    restore(result);
    return result;
  };
}
