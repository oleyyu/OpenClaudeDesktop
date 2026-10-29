// panes:C2-7 next / previous PR comment in Changes (3.6556.2): the pure parts of the ⌥F9 / ⇧⌥F9 bindings.
// - shared-46-BIbZBGFq YL: `{command:"nextPrComment",key:"alt+f9",code:"F9",when:"!isLinux"}`,
//   `{command:"prevPrComment",key:"shift+alt+f9",code:"F9",when:"!isLinux"}` (generated: session-rail-changes/
//   command-shortcut.mjs commandShortcut; the event side is shared-46 eR, generated as code-editor/preview-sketch-keys.mjs
//   matchSketchCommand — the whole YL table, not only the sketch rows).
// - c44d00c7f-Cr1FDL2F Jd: `Qn = (e) => ({ target: () => Ft.current?.closest('[data-pane-root], [role="dialog"]') ??
//   Ft.current, enabled: Zn && Xn && kt.open.length > 0, onMatch: (t) => { !t.isComposing && t.keyCode !== 229 && Lt(e) } })`
//   with `Fn({command:"nextPrComment",...Qn(1)})` and `{command:"prevPrComment",...Qn(-1)}`; Xn = (files listed) && !Tn
//   (sf: the highlight cache still priming), Zn = c4d5c642f `!gate("__gb__3741111118")`, kt = cc8941b7b $e (the
//   session's PR review comments in file order: {all, open}).
// - ca6e98a55 l (Fn): on the target's keydown, a match that is not defaultPrevented (window not hidden) is
//   preventDefault-ed; a repeat does nothing more; onMatch then drops an IME composition.
// - cc8941b7b nt: the step from the last stop (rt passes wrap true).
// OpenClaude has no PR review comments (no GitHub session data; source-diff.jsx NO_PR_COMMENTS), so kt.open is empty and
// the bindings stay disabled, exactly as the official build with a session that has none.
import { matchSketchCommand as commandForEvent } from "./generated/code-editor/preview-sketch-keys.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";

export const PR_COMMENT_COMMANDS = Object.freeze({ nextPrComment: 1, prevPrComment: -1 });
export const PR_COMMENT_KEYBOARD_GATE = "__gb__3741111118";
export const NO_PR_COMMENT_STOPS = Object.freeze({ all: Object.freeze([]), open: Object.freeze([]) });

/** c4d5c642f (Nr): the keyboard stepping is on unless the GrowthBook flag is (host: not listed, so on). */
export function prCommentKeyboardEnabled(flag = hostGrowthBookFlag) {
  return !flag(PR_COMMENT_KEYBOARD_GATE);
}

/** Jd Qn enabled: Zn && Xn && kt.open.length > 0, Xn = files.length > 0 && !priming. */
export function prCommentShortcutsEnabled({ keyboard = prCommentKeyboardEnabled(), files = 0, priming = false, open = 0 } = {}) {
  return !!keyboard && files > 0 && !priming && open > 0;
}

/** ca6e98a55 n: the step (1 next, -1 previous, 0 none) a keydown matches — `!g.getState().hidden && !e.defaultPrevented &&
 * a(e,{isClaudeApp:h}) === u`, eR over the YL table as the desktop app. A match is preventDefault-ed (r) even while an
 * IME composes; only the step itself is held back (Qn onMatch). hidden: the window is hidden (host: document.hidden). */
export function prCommentMatch(event, { mac, linux, hidden = false } = {}) {
  if (!event || hidden || event.defaultPrevented) return 0;
  const command = commandForEvent(event, { isClaudeApp: true, ...(mac === undefined ? {} : { mac }), ...(linux === undefined ? {} : { linux }) });
  return PR_COMMENT_COMMANDS[command] ?? 0;
}
/** Qn onMatch `!t.isComposing && t.keyCode !== 229`: an IME composition is not a press. */
export function prCommentComposing(event) {
  return !!event?.isComposing || event?.keyCode === 229;
}
/** The step a keydown takes: a match (prCommentMatch) that is not an IME composition. */
export function prCommentStep(event, options = {}) {
  const delta = prCommentMatch(event, options);
  return delta && !prCommentComposing(event) ? delta : 0;
}

/** cc8941b7b nt({all, open}, from, delta, wrap): the index into `open` of the next stop. With no (or an unknown) last
 * stop, next is the first open comment and previous the last; otherwise it counts the open comments before the last
 * stop in `all` order and steps from there, wrapping (rt) or clamping. */
export function prCommentStepIndex({ all, open }, from, delta, wrap = false) {
  const at = from === null || from === undefined ? -1 : all.indexOf(from);
  if (at < 0) return delta > 0 ? 0 : open.length - 1;
  const before = open.filter((id) => all.indexOf(id) < at).length;
  const onIt = open[before] === from;
  const next = delta > 0 ? before + +!!onIt : before - 1;
  return wrap ? (next + open.length) % open.length : Math.min(open.length - 1, Math.max(0, next));
}
