import React from 'react';

// Snapshot before React mutates text nodes: a growing final word may change
// nodeValue even when both its semantic element and reveal span are retained.
// Restore only a selection wholly owned by this response, with an unchanged
// visible prefix. Never move a caret, an outside selection, or rewritten text.
export class SourceMarkdownSelection extends React.Component {
  root = React.createRef();
  getSnapshotBeforeUpdate(previous) {
    if (!this.props.text.startsWith(previous.text)) return null;
    const root=this.root.current,selection=root?.ownerDocument.getSelection();
    if(!selection||selection.isCollapsed||!root.contains(selection.anchorNode)||!root.contains(selection.focusNode))return null;
    const offset=(node,end)=>{const range=root.ownerDocument.createRange();range.selectNodeContents(root);range.setEnd(node,end);return range.toString().length;};
    const anchor=offset(selection.anchorNode,selection.anchorOffset),focus=offset(selection.focusNode,selection.focusOffset);
    return {anchor,focus,prefix:root.textContent.slice(0,Math.max(anchor,focus)),text:selection.toString()};
  }
  componentDidUpdate(previous,state,snapshot) {
    if(!snapshot)return;
    const root=this.root.current,selection=root.ownerDocument.getSelection();
    if(!selection||!root.textContent.startsWith(snapshot.prefix)||selection.toString()===snapshot.text)return;
    const point=offset=>{const walker=root.ownerDocument.createTreeWalker(root,4);let node;while((node=walker.nextNode())){if(offset<=node.length)return [node,offset];offset-=node.length;}return null;};
    const anchor=point(snapshot.anchor),focus=point(snapshot.focus);
    if(anchor&&focus)selection.setBaseAndExtent(...anchor,...focus);
  }
  render(){return <div className="source-markdown" ref={this.root}>{this.props.children}</div>;}
}
