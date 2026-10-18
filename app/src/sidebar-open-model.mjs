import { canFocusComposerOnClick } from './generated/code-current/composer-focus-capability.mjs';

// shared-21 z1: the extra-pane branch exits before the primary-pane caret move.
// Keyboard/programmatic activation (detail 0) and double click do not move it.
export function sidebarComposerFocus(event, { mode = 'code', splitOpen = false, focusedPane = 0 } = {}) {
  return mode === 'code' && !(splitOpen && focusedPane > 0) && event.detail === 1 &&
    canFocusComposerOnClick(event.currentTarget?.ownerDocument?.defaultView);
}
