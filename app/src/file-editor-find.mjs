// Find-in-file reveal/settle for the source editor, after 3.6556.2 cbd02b8f2-u2AOwdpo.js Jo:
//   J=x?.activeLine, Nr=t(x?.query),
//   Pr=()=>{...let t=Ot.current;(t&&J!==void 0&&(fo(e,t),t.query===Nr.current&&uo(e)),Nr.current=t?.query,...)},
//   Fr=x?.query,Ir=x?.options,Lr=x?.scrollNonce, Rr=[Fr,Ir,J,Lr];  u(Pr,Rr)
// and fo(e,t): clamp activeLine, take the active hit (so) or the line start, then
//   e.dispatch({effects:[T.scrollIntoView(z.range(o,s),{y:"center"}),...Vn(e.state,o,s)],selection:{anchor:o}}).
// The host's find props carry { query, options, matches, index, scrollNonce } (cd2efac6e dh); activeLine is
// matches[index].line. No DOM is needed, so the timing is tested against a plain EditorState.
import { EditorView, EditorSelection } from './code-editor-core.mjs';
import { unfoldEditorRange } from './file-editor-folds.mjs';
import { settleEditorParse } from './generated/code-editor-current/wrapper.mjs';

// Rr: the dependency list of Jo's Pr effect.
export function findRevealDeps(find) {
  return [find?.query, find?.options, find?.matches?.[find?.index]?.line, find?.scrollNonce];
}

// React reruns an effect on mount and whenever one dependency changed (Object.is).
export function findRevealDepsChanged(previous, next) {
  return !previous || previous.length !== next.length || next.some((value, i) => !Object.is(value, previous[i]));
}

// Pr body: fo only with an active line; uo only when the query is the one seen by the previous run (Nr.current).
export function findRevealStep(find, lastQuery) {
  const reveal = !!find && find.matches?.[find.index]?.line !== undefined;
  return { reveal, settle: reveal && find.query === lastQuery, query: find?.query };
}

// fo's target: the active hit on the clamped line, else the line start (o = a?.from ?? i.from, s = a?.to ?? o).
export function findRevealRange(doc, match) {
  const row = doc.line(Math.max(1, Math.min(match.line, doc.lines)));
  const from = row.from + match.start;
  if (match.line > doc.lines || match.start < 0 || from > row.to) return { from: row.from, to: row.from };
  return { from, to: Math.max(from, Math.min(row.from + match.end, row.to)) };
}

// A fresh Jo mount: Nr=t(x?.query), and Pr has not run yet.
export function createFindReveal(find) {
  return { query: find?.query, deps: null };
}

// One render's worth of Jo's Pr effect. `memo` plays Nr plus React's dependency memory; returns the step when Pr ran.
// `settle` is uo (settleEditorParse); tests pass a spy.
export function runFindReveal(view, find, memo, settle = settleEditorParse) {
  const deps = findRevealDeps(find);
  if (!findRevealDepsChanged(memo.deps, deps)) return null;
  memo.deps = deps;
  const step = findRevealStep(find, memo.query);
  if (step.reveal) {
    const { from, to } = findRevealRange(view.state.doc, find.matches[find.index]);
    view.dispatch({ effects: [EditorView.scrollIntoView(EditorSelection.range(from, to), { y: 'center' }), ...unfoldEditorRange(view.state, from)], selection: { anchor: from } });
    if (step.settle) settle(view);
  }
  memo.query = step.query;
  return step;
}
