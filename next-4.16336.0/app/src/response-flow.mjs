// Code renderer Xc preserves text newlines; table al/ol additionally enables
// Jc's literal <br> spellings. This does not enable arbitrary HTML rendering.
const inlineContainers = new Set(['emphasis', 'strong', 'delete', 'link', 'linkReference']);
function inlineFlow(children, table) {
  return children.flatMap(node => {
    if (node.type === 'text' || table && node.type === 'html') {
      const parts = node.value.split(table ? /\r\n|\r|\n|<br\s*\/?>/gi : /\r\n|\r|\n/);
      if (parts.length === 1) return [node];
      return parts.flatMap((value, index) => [
        ...(index ? [{type:'break'}] : []),
        ...(value ? [{type:'text',value}] : []),
      ]);
    }
    if (inlineContainers.has(node.type)) node.children = inlineFlow(node.children || [], table);
    return [node];
  });
}
export function remarkResponseFlow() {
  return tree => {
    function walk(node) {
      if (['paragraph','heading','tableCell'].includes(node.type)) {
        node.children = inlineFlow(node.children || [], node.type === 'tableCell');
        return;
      }
      // Traverse blocks only. Images, inline code, math and raw HTML are opaque.
      if (['root','list','listItem','blockquote','table','tableRow','responseFootnoteDefinition'].includes(node.type)) {
        for (const child of node.children || []) walk(child);
      }
    }
    walk(tree);
  };
}

// rl renders the first paragraph inline in both list items and definitions.
// Run before reveal so word offsets and DOM shape already reflect that choice.
export function rehypeResponseFlow() {
  return tree => {
    function walk(node) {
      const children = node.children || [];
      const definition = node.tagName === 'div' && (node.properties?.className || []).includes('footnote-def');
      if (node.tagName === 'li' || definition) {
        const meaningful = children.map((child,index)=>({child,index})).filter(({child})=>child.type !== 'text' || child.value.trim());
        const first = meaningful[definition ? 1 : 0];
        if (first?.child.type === 'element' && first.child.tagName === 'p') {
          children.splice(first.index,1,...first.child.children);
        }
      }
      for (const child of children) if (child.type === 'element') walk(child);
    }
    walk(tree);
  };
}
