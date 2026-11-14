import { acceptsBackslashMath, hasMathSyntax } from './response-math-model.mjs';

const prefixes = new WeakMap();
function precedingText(parser) {
  const end = parser.now(), old = prefixes.get(parser), first = parser.events[0]?.[1]?.start;
  const usable = old && old.end.offset <= end.offset;
  const start = usable ? old.end : first;
  const text = ((usable ? old.text : '') + (start ? parser.sliceSerialize({ start, end }) : '')).slice(-66);
  prefixes.set(parser, { end, text });
  return text;
}

// Register before parsing so escaped delimiters, code, and link destinations
// retain CommonMark ownership. A failed construct rolls back all consumed text.
function backslashConstruct(effects, ok, nok) {
  const parser = this;
  let token, display = false, value = '';
  const prefix = precedingText(parser);
  return start;
  function start(code) {
    if (code !== 92) return nok(code);
    token = effects.enter('responseBackslashMath');
    effects.consume(code); return opening;
  }
  function opening(code) {
    if (code !== 40 && code !== 91) return nok(code);
    display = code === 91; effects.consume(code); return body;
  }
  function body(code) {
    if (code === null || code < 0 || value.length > 1024) return nok(code);
    if (code === 92) { effects.consume(code); return escaped; }
    value += String.fromCodePoint(code); effects.consume(code); return body;
  }
  function escaped(code) {
    if (code === (display ? 93 : 41)) {
      if (!acceptsBackslashMath(value, prefix, display)) return nok(code);
      token.mathValue = value; token.mathDisplay = display;
      effects.consume(code); effects.exit('responseBackslashMath'); return ok;
    }
    if (code === null || code < 0) return nok(code);
    value += '\\' + String.fromCodePoint(code); effects.consume(code); return body;
  }
}
const fromMarkdown = {
  enter: { responseBackslashMath(token) {
    this.enter({ type: 'responseMath', value: token.mathValue, display: token.mathDisplay, open: false }, token);
  } },
  exit: { responseBackslashMath(token) { this.exit(token); } },
};

function decorate(node) {
  node.data = { hName: 'response-math', hProperties: { value: node.value, display: !!node.display, open: !!node.open, fenced: !!node.fenced }, hChildren: [] };
}

export function remarkResponseMath() {
  const data = this.data();
  (data.micromarkExtensions ||= []).push({ text: { 92: { name: 'responseBackslashMath', tokenize: backslashConstruct } } });
  (data.fromMarkdownExtensions ||= []).push(fromMarkdown);
  return (tree, file) => {
    const source = String(file);
    const visit = parent => {
      for (let index = 0; index < (parent.children?.length || 0); index++) {
        let node = parent.children[index];
        if (node.type === 'math') {
          const raw = source.slice(node.position.start.offset, node.position.end.offset);
          const rows = raw.split(/\r\n|\r|\n/);
          const marker = /^\s*(\${2,})/.exec(rows[0])?.[1] || '$$';
          const last = rows.at(-1).trim();
          node.display = true;
          node.fenced = true;
          node.open = rows.length < 2 || !new RegExp(`^(?: {0,3}>[ \\t]?)*[ \\t]*\\${'$'}{${marker.length},}[ \\t]*$`).test(last);
          decorate(node);
        } else if (node.type === 'inlineMath') {
          // Double dollars embedded in prose are literal in the Code renderer.
          // Only a standalone mathematical expression becomes display math.
          if (parent.type === 'paragraph' && parent.children.length === 1 && hasMathSyntax(node.value)) {
            node.display = true; node.open = false; decorate(node);
          } else parent.children[index] = { type: 'text', value: source.slice(node.position.start.offset, node.position.end.offset), position: node.position };
        } else if (node.type === 'responseMath') decorate(node);
        else visit(node);
        node = parent.children[index];
        if (node.type === 'paragraph' && node.children.length === 1 && node.children[0].data?.hName === 'response-math' && node.children[0].display) {
          parent.children[index] = { ...node.children[0], position: node.position };
        }
      }
    };
    visit(tree);
  };
}
