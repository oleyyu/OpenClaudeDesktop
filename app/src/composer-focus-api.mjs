// The Code composer's focus API (2.42304.0 c227f4d5e OP's imperative handle: scheduleFocus, focusPreservingSelection,
// ignoreStrayEnter, and the Enter guard of its keydown handler). The decisions are the original ones: Xj (generated
// composer-focus-yield.mjs, over shared-28 wv) for yieldsToUser, rP (generated composer-card-tokens.mjs) for the
// stray-Enter window, composer-keys-model strayEnterSwallowed for the guard. scripts/extract-code-composer.mjs pins the
// inline original text this transcribes, so a version that moves it stops generation.
//
// SourceComposerEditor puts the returned functions on its element (the `textarea` ref every caller already holds):
//   node.scheduleFocus(caret = "end", { yieldsToUser })  Fi: focus the editor and put the caret at `caret` ("start",
//                                                        "end", "all", or null to keep it), unless yieldsToUser and
//                                                        the user's focus is in another visible field or an open
//                                                        dialog / menu / listbox / AskUserQuestion; true if it focused.
//   node.focusPreservingSelection()                      view.focus() keeping the selection, without scrolling.
//   node.ignoreStrayEnter()                              swallow Enter for rP (500ms) from now.
// Host difference: OP keeps a focus scheduled before its editor mounts (Gr/qr/Jr) and applies it on mount; the host
// element exists only together with its editor, so the calls act at once (a caller without an element does nothing).
import { focusBelongsElsewhere } from './generated/code-composer/composer-focus-yield.mjs';
import { strayEnterWindowMs } from './generated/code-composer/composer-card-tokens.mjs';
import { strayEnterSwallowed } from './composer-keys-model.mjs';

/**
 * @param {object} host
 * @param {Element} host.dom the editor's DOM (OP's `X.view.dom`)
 * @param {() => boolean} host.editable OP `X?.isEditable` (and the editor still alive)
 * @param {(options: FocusOptions) => void} host.nativeFocus the element's own focus (`e.focus({preventScroll: true})`)
 * @param {(caret: "start" | "end" | "all" | null) => void} host.placeCaret `X.commands.focus(caret)`: caret and focus
 * @param {() => void} host.focusView `t.view.focus()` with the selection kept and no scroll
 */
export function createComposerFocusApi({ dom, editable, nativeFocus, placeCaret, focusView, now = () => Date.now() }) {
  let strayEnterUntil = -Infinity; // OP Xr = T(-1 / 0)
  // OP Fi.
  const focusAt = (caret) => {
    try {
      if (!editable()) return false;
      nativeFocus({ preventScroll: true });
      const active = dom.ownerDocument.activeElement;
      if (active !== dom && !dom.contains(active)) return false;
      placeCaret(caret);
      return true;
    } catch {
      return false;
    }
  };
  return {
    // scheduleFocus: (t, n) => { … i = n?.yieldsToUser === !0; Kr.current = t ?? "end"; … (!i || !Xj(r.view.dom)) && Fi() }
    scheduleFocus(caret, options) {
      const yieldsToUser = options?.yieldsToUser === true;
      if (yieldsToUser && focusBelongsElsewhere(dom)) return false;
      return focusAt(caret ?? 'end');
    },
    focusPreservingSelection() {
      try { focusView(); } catch { /* the original swallows a view that is going away too */ }
    },
    ignoreStrayEnter() {
      strayEnterUntil = now() + strayEnterWindowMs;
    },
    swallowsEnter(event) {
      return strayEnterSwallowed({ event, until: strayEnterUntil, now: now() });
    },
    get strayEnterUntil() { return strayEnterUntil; },
  };
}
