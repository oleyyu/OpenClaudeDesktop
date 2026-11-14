import React from 'react';
import { tokenCSS } from './highlight-model.mjs';
import { decorateTokens } from './word-diff-model.mjs';
import './highlight-tokens.css';
import './source-diff-code.css';

export function SourceHighlightedLine({ tokens, ranges, renderText = text => text }) {
  const groups = [];
  for (const token of decorateTokens(tokens, ranges)) {
    if (groups.at(-1)?.diff === token.diff) groups.at(-1).tokens.push(token);
    else groups.push({ diff: token.diff, tokens: [token] });
  }
  return groups.map((group, index) => {
    const content = group.tokens.map((token, at) => token.light && token.dark
      ? <span key={at} data-code-token="" style={tokenCSS(token)}>{renderText(token.text.replaceAll('\r', '␍'))}</span>
      : <React.Fragment key={at}>{renderText(token.text.replaceAll('\r', '␍'))}</React.Fragment>);
    return group.diff ? <span key={index} data-diff-span="">{content}</span> : <React.Fragment key={index}>{content}</React.Fragment>;
  });
}
