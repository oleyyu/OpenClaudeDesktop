import { foldedRanges, unfoldEffect } from './code-editor-core.mjs';

// cbd02b8f2 wn: a revealed line must not stay hidden inside a folded range.
export function unfoldEditorRange(state, position) {
  const line = state.doc.lineAt(Math.max(0, Math.min(position, state.doc.length))), effects = [];
  foldedRanges(state).between(line.from, line.to, (from, to) => {
    if (from < line.to) effects.push(unfoldEffect.of({ from, to }));
  });
  return effects;
}
