import { transitionMilliseconds } from './response-table-model.mjs';

// Retain the actual dialog until its own opacity transition ends. Reopening
// cancels this subscription; a queued old event/timer cannot remove new UI.
export function waitForModalExit(element, complete) {
  const view = element.ownerDocument.defaultView;
  let active = true, timer;
  const cancel = () => {
    active = false;
    view.clearTimeout(timer);
    element.removeEventListener('transitionend', ended);
  };
  const finish = () => { if (active) { cancel(); complete(); } };
  const ended = event => {
    if (event.target === element && event.propertyName === 'opacity') finish();
  };
  element.addEventListener('transitionend', ended);
  timer = view.setTimeout(finish, transitionMilliseconds(view.getComputedStyle(element)));
  return cancel;
}
