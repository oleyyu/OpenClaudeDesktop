import { suppressEscapeRepeat } from './generated/code-editor-current/keyboard-repeat.mjs';
import { ownerWindow } from './generated/code-current/owner-window.mjs';

// 2.42304.0 cccc2cf0a-B0D--VZp Sk: `function Sk(e){let t=N(e);t&&Ke(t)}`, where N is
// shared-25 Ff (up, ownerWindow) and Ke is shared-19 ya (pZ, suppressEscapeRepeat).
function suppressHeldEscape(target) {
  const view = ownerWindow(target);
  if (view) suppressEscapeRepeat(view);
}

// 2.42304.0 cccc2cf0a-B0D--VZp he, the side chat's onKeyDownCapture. The host supplies the
// live auxiliary-request state and cancellation action instead of the original desktop
// store: a live requestId stands in for de()'s canInterrupt, onStop for its interrupt.
// The host's own mention/menu layers join xk's open-dialog guard. Returns true only when
// the side chat itself consumed the Escape (cancel or close).
export function sideChatEscape(event, { state, onStop, onClose }) {
  if (event.key !== 'Escape' || event.nativeEvent?.isComposing || event.keyCode === 229
    || event.currentTarget.querySelector('[aria-haspopup="dialog"][aria-expanded="true"], [data-mention-open], [data-menu-open]')) return false;
  // he: `if(e.defaultPrevented){Sk(e.currentTarget);return}` -- an Escape another layer
  // already handled only arms the hold guard; it neither cancels, closes nor stops the
  // event (2.37337.1 me closed the side chat here).
  if (event.defaultPrevented) {
    suppressHeldEscape(event.currentTarget);
    return false;
  }
  if (state.status === 'thinking' && (state.interrupting || state.requestId)) {
    // he: `(n||de())` interrupts first, then `n||Sk(e.currentTarget)`.
    if (!state.interrupting) {
      onStop();
      suppressHeldEscape(event.currentTarget);
    }
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    return true;
  }
  event.stopPropagation();
  event.nativeEvent?.stopImmediatePropagation?.();
  suppressHeldEscape(event.currentTarget);
  onClose();
  return true;
}
