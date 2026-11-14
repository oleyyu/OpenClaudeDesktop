// R3-composer review fix (composer-shell, step 3): the Code card's root is now uM's div (c227f4d5e `Bo("epitaxy-prompt",
// ye)`), not the old host <form>, so nothing can reach the composer's submit through `closest('form').requestSubmit()`
// any more. A caller outside the composer that submits the draft (main.jsx: a file comment saved with ⌘/Ctrl+Enter,
// c82eca2bd `T(n, {submit: t, viaKeyboard: e})`) asks the composer element instead. SourceComposer puts the request on
// its editor element (as it carries OP's focus API there, composer-focus-api.mjs) in every mode; the request runs what
// the old form's onSubmit ran: submit(running ? "next" : undefined).
const KEY = 'requestComposerSubmit';

/** Put `request` on the composer element; returns the detach (which leaves a newer request in place). */
export function attachComposerSubmitRequest(element, request) {
  if (!element || typeof request !== 'function') return () => {};
  const run = () => { request(); return true; };
  element[KEY] = run;
  return () => { if (element[KEY] === run) delete element[KEY]; };
}

/** Submit the composer the element belongs to; false when it carries no request (unmounted or not a composer). */
export function requestComposerSubmit(element) {
  const run = element?.[KEY];
  return typeof run === 'function' ? run() === true : false;
}
