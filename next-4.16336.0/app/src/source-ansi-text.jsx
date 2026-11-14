import React, { useMemo } from 'react';
import { hasAnsi, parseAnsi, ansiStyle } from './ansi-model.mjs';

// c7146e7f4 b: ANSI output is text plus controlled styles, never HTML or
// terminal hyperlinks. Share the same palette in transcript and tasks.
export function SourceAnsiText({ text }) {
  const segments = useMemo(() => hasAnsi(text) ? parseAnsi(text) : null, [text]);
  return segments ? segments.map((segment, index) => {
    const style = ansiStyle(segment.style);
    return style ? <span key={index} style={style}>{segment.text}</span> : <React.Fragment key={index}>{segment.text}</React.Fragment>;
  }) : text;
}
