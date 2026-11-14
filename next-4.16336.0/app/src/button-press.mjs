import { buttonPressInset, writeButtonPressScale } from './generated/code-current/button-press.mjs';

// shared-frame bl/ge: measure the decorative paint wrapper, using the native
// button's height for the inset. Host buttons expose the same paint marker.
export function prepareButtonPress(button) {
  const squish = button.querySelector('[data-cds-part="paint"]')?.parentElement;
  if (squish) writeButtonPressScale(squish, buttonPressInset(button.offsetHeight), '--cds-btn-press-sx', '--cds-btn-press-sy');
}

export function buttonPointerPress(event) { prepareButtonPress(event.currentTarget); }
export function buttonKeyPress(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.key === ' ' && !event.repeat) prepareButtonPress(event.currentTarget);
  if (event.repeat) event.preventDefault();
}

export const buttonPressHandlers = Object.freeze({ onPointerDownCapture: buttonPointerPress, onKeyDown: buttonKeyPress });
