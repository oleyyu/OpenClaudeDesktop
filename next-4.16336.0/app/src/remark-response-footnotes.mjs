// Code's alluvium footnotes use labels directly, in document order. They are
// not GFM's numbered/end-of-document footnotes and have no link/backlink IDs.
const lineEnd = code => code === null || code < -2;
const whitespace = code => code < 0 || /\s/u.test(String.fromCharCode(code));
const referenceNode = label => ({ type: 'responseFootnoteReference', value: `[^${label}]`,
  data: { hName: 'sup', hChildren: [{ type: 'text', value: `[${label}]` }] } });

function tokenizer(definition) {
  return function (effects, ok, nok) {
    // A definition cannot interrupt an existing paragraph (source qa/feed).
    if (definition && this.interrupt) return nok;
    const kind = definition ? 'responseFootnoteDefinition' : 'responseFootnoteReference';
    let token, label = '', hasText = false;
    return start;
    function start(code) {
      if (code !== 91) return nok(code);
      token = effects.enter(kind); effects.consume(code); return caret;
    }
    function caret(code) {
      if (code !== 94) return nok(code);
      effects.consume(code); return name;
    }
    function name(code) {
      if (code === 93) {
        if (!label.length) return nok(code);
        token.footnoteLabel = label;
        effects.consume(code);
        if (definition) return colon;
        effects.exit(kind); return ok;
      }
      if (code === null || whitespace(code) || (!definition && code === 91) || label.length >= 128) return nok(code);
      label += String.fromCharCode(code); effects.consume(code); return name;
    }
    function colon(code) {
      if (code !== 58) return nok(code);
      effects.consume(code); return afterColon;
    }
    function afterColon(code) {
      // Ia removes at most one original whitespace character, not trimStart.
      if (!lineEnd(code) && whitespace(code)) { effects.consume(code); return contentStart; }
      return contentStart(code);
    }
    function contentStart(code) {
      // Micromark expands a consumed tab into virtual spaces. They belong to
      // that same skipped source character rather than the footnote content.
      if (code === -1) { effects.consume(code); return contentStart; }
      effects.enter('responseFootnoteContent');
      if (!lineEnd(code)) { effects.enter('chunkText', { contentType: 'text' }); hasText = true; }
      return content(code);
    }
    function content(code) {
      if (lineEnd(code)) {
        if (hasText) effects.exit('chunkText');
        effects.exit('responseFootnoteContent'); effects.exit(kind); return ok(code);
      }
      effects.consume(code); return content;
    }
  };
}

const fromMarkdown = {
  enter: {
    responseFootnoteReference(token) { this.enter(referenceNode(token.footnoteLabel), token); },
    responseFootnoteDefinition(token) {
      this.enter({ type: 'responseFootnoteDefinition', label: token.footnoteLabel,
        data: { hName: 'div', hProperties: { className: ['footnote-def'] } },
        children: [{ type: 'responseFootnoteLabel', value: `[${token.footnoteLabel}] `,
          data: { hName: 'sup', hChildren: [{ type: 'text', value: `[${token.footnoteLabel}] ` }] } }] }, token);
    },
    responseFootnoteContent(token) { this.enter({ type: 'paragraph', children: [] }, token); },
  },
  exit: {
    responseFootnoteReference(token) { this.exit(token); },
    responseFootnoteDefinition(token) { this.exit(token); },
    responseFootnoteContent(token) { this.exit(token); },
  },
};

export function remarkResponseFootnotes() {
  const data = this.data();
  (data.micromarkExtensions ||= []).push({
    disable: { null: ['gfmFootnoteDefinition', 'gfmFootnoteCall', 'gfmPotentialFootnoteCall'] },
    flow: { 91: { name: 'responseFootnoteDefinition', tokenize: tokenizer(true) } },
    text: { 91: { name: 'responseFootnoteReference', tokenize: tokenizer(false) } },
  });
  (data.fromMarkdownExtensions ||= []).push(fromMarkdown);
}
