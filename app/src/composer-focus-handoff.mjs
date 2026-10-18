// R3-composer step 3 (R2 review of composer-focus-yield, ledger composer-10): the six 2.42304.0 cc43287c9 call sites of
// c227f4d5e OP's focus API, as main.jsx runs them on the composer element (`textarea.current`, the SourceComposerEditor
// element that carries scheduleFocus / focusPreservingSelection / ignoreStrayEnter, composer-focus-api.mjs). Each helper
// keeps the original call order; main.jsx hands it the element getter, its "still the same session / load" check and,
// where the host waits for the editor, requestAnimationFrame, so tests/composer-focus-handoff.test.mjs drives the real
// focus API through them with controlled frames, clocks and events instead of reading main.jsx's text.
//
//   :47139 fork auto-send   `Na.current?.submit({forkAutoSend: e}, r) || t(), Na.current?.scheduleFocus(void 0, {yieldsToUser: !0})`
//   :47145 created session  `K && cJ(K) && (Na.current?.scheduleFocus(void 0, {yieldsToUser: !0}), Na.current?.ignoreStrayEnter(), …)`
//   :41729 La (rewind text) `t?.getText().trim() === "" && t.setText(e, …), t?.scheduleFocus(), t?.ignoreStrayEnter()`
//   :38416 Rte (goal Edit)  `let a = () => (r && e.ignoreStrayEnter(), "inserted");` with r = shared-8 xM(e.nativeEvent)
//                           (cf74bc599 `onClick: (e) => s(d, Da(e.nativeEvent))`)
//   :43844 Af (selection)   `Na.current?.ignoreStrayEnter(), r ? kf(e) : Na.current?.scheduleFocus()`
//   :36876 Mte `no`         `de.current?.focusPreservingSelection(), de.current?.ignoreStrayEnter(), hy(…)`
// Host differences (unchanged from R2): OP keeps a scheduleFocus made before its editor mounts (Gr/qr/Jr), so the
// created session / rewind / goal / selection sites wait a frame (two after the rewind confirm releases its modal inert)
// for the host element instead; `hy` (the focus-ring hint of the side chat) is not ported.
import { isKeyboardActivation } from './generated/code-composer/keyboard-activation.mjs';

const frameOf = (frame) => frame ?? ((callback) => requestAnimationFrame(callback));
const element = (composer) => (typeof composer === 'function' ? composer() : composer);

/** :47139 — after the fork's auto-send, the fork's composer takes focus unless the user is typing elsewhere. */
export function forkAutoSendFocus(composer) {
  element(composer)?.scheduleFocus?.(undefined, { yieldsToUser: true });
}

/** :47145 — the session this window just created opens focused (yielding to the user) and ignores a repeat Enter. */
export function createdSessionFocus({ composer, stillCurrent = () => true, frame } = {}) {
  frameOf(frame)(() => {
    if (!stillCurrent()) return;
    const node = element(composer);
    node?.scheduleFocus?.(undefined, { yieldsToUser: true });
    node?.ignoreStrayEnter?.();
  });
}

/** :41729 La — text put back by a rewind takes focus once the confirm released its inert, and the Enter that
 * confirmed the rewind does not send it. */
export function restoredTextFocus({ composer, stillCurrent = () => true, frame } = {}) {
  const next = frameOf(frame);
  next(() => next(() => {
    if (!stillCurrent()) return;
    const node = element(composer);
    node?.scheduleFocus?.();
    node?.ignoreStrayEnter?.();
  }));
}

/** :38416 Rte with xM — the goal strip's Edit prefills the composer and focuses it; pressed from the keyboard (the
 * Enter / Space that activated Edit), it also ignores a stray Enter. The keyboard test reads the click as it happens. */
export function goalEditFocus({ composer, event, frame } = {}) {
  const native = event?.nativeEvent ?? event;
  const keyboard = !!native && isKeyboardActivation(native);
  frameOf(frame)(() => {
    const node = element(composer);
    node?.scheduleFocus?.();
    if (keyboard) node?.ignoreStrayEnter?.();
  });
  return keyboard;
}

/** :43844 Af — a selection reply (attach as context) arms the Enter guard, then focuses the composer. */
export function selectionReplyFocus({ composer, frame } = {}) {
  frameOf(frame)(() => {
    const node = element(composer);
    node?.ignoreStrayEnter?.();
    node?.scheduleFocus?.();
  });
}

/** :36876 Mte `no` — an approval card that leaves with focus inside hands it back keeping the composer's selection,
 * and the Enter that decided it does not send the draft. */
export function approvalHandBackFocus(composer) {
  const node = element(composer);
  node?.focusPreservingSelection?.();
  node?.ignoreStrayEnter?.();
}
