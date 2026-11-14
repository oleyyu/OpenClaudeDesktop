import { htmlFlow } from 'micromark-core-commonmark';

const normalizeLines = value => value.replace(/\r\n|\r/g, '\n');
const tablePipes = value => value.replace(/\\([\\|])/g, (all, character) => character === '|' ? character : all);

function keyboard(effects, ok, nok) {
  let index = 0, body = '', token, dataOpen = false;
  return opening;
  function opening(code) {
    if (code === null || String.fromCharCode(code).toLowerCase() !== '<kbd>'[index]) return nok(code);
    if (!index) { token = effects.enter('responseKeyboard'); effects.enter('responseKeyboardData'); dataOpen = true; }
    effects.consume(code);
    return ++index === 5 ? content : opening;
  }
  function content(code) {
    if (code === null) return nok(code);
    // Micromark emits one tab plus virtual padding, and distinct CR/LF codes.
    body += code === -1 ? '' : code === -2 ? '\t' : code < -2 ? '\n' : String.fromCharCode(code);
    if (code < -2) {
      if (dataOpen) effects.exit('responseKeyboardData');
      dataOpen = false; effects.enter('lineEnding');
    } else if (!dataOpen) { effects.enter('responseKeyboardData'); dataOpen = true; }
    effects.consume(code);
    if (code < -2) effects.exit('lineEnding');
    if (body.toLowerCase().endsWith('</kbd>')) {
      token.keyboardValue = body.slice(0, -6);
      effects.exit('responseKeyboardData');
      effects.exit('responseKeyboard'); return ok;
    }
    return body.length >= 70 ? nok : content;
  }
}

// A standalone <kbd> line is still prose in the source block parser. Leave
// other HTML flow constructs to CommonMark's existing safe literal path.
const keyboardOpening = { partial: true, tokenize(effects, ok, nok) {
  let index = 0;
  return code => start(code);
  function start(code) {
    if (code === null || String.fromCharCode(code).toLowerCase() !== '<kbd>'[index]) return nok(code);
    if (!index) effects.enter('responseKeyboardOpening');
    effects.consume(code);
    if (++index < 5) return start;
    effects.exit('responseKeyboardOpening'); return ok;
  }
} };
const safeHtmlFlow = { ...htmlFlow, name: 'responseHtmlFlow', tokenize(effects, ok, nok) {
  return effects.check(keyboardOpening, nok, htmlFlow.tokenize.call(this, effects, ok, nok));
} };

const fromMarkdown = {
  enter: { responseKeyboard(token) {
    const value = this.data.inTable ? tablePipes(token.keyboardValue) : token.keyboardValue;
    this.enter({ type: 'responseKeyboard', value,
      data: { hName: 'kbd', hChildren: [{ type: 'text', value }] } }, token);
    this.buffer();
  } },
  exit: {
    responseKeyboard(token) { this.resume(); this.exit(token); },
    codeText(token) {
      this.resume();
      const raw = normalizeLines(this.sliceSerialize(token));
      const delimiter = /^`+/.exec(raw)[0].length;
      let value = raw.slice(delimiter, -delimiter);
      if (this.data.inTable) value = tablePipes(value);
      if (value.length > 1 && value.startsWith(' ') && value.endsWith(' ') && value.trim()) value = value.slice(1, -1);
      this.stack.at(-1).value = value;
      this.exit(token);
    },
  },
};

export function remarkResponseInlineAtoms() {
  const data = this.data();
  (data.micromarkExtensions ||= []).push({
    disable: { null: ['htmlFlow'] },
    flow: { 60: safeHtmlFlow },
    text: { 60: { name: 'responseKeyboard', tokenize: keyboard } },
  });
  (data.fromMarkdownExtensions ||= []).push(fromMarkdown);
  // Run after the streaming frontier so its incomplete code also bypasses
  // mdast-to-hast's newline-to-space conversion. Keep incomplete attributes.
  return tree => {
    function walk(node) {
      if (node.type === 'inlineCode') node.data = { ...node.data,
        hChildren: [{ type: 'text', value: normalizeLines(node.value) }] };
      for (const child of node.children || []) walk(child);
    }
    walk(tree);
  };
}
