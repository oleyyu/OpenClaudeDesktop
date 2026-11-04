// W14-code r8 gen-final-8 review fix (composer-final-focus): cc43287c9 Dle builds `$i = yte({onRequestComposerFocus: ht,
// isPanelActive: Mt, keyboardOnly: !0})` (yte = c227f4d5e K6, generated as code-composer/composer-final-focus.mjs
// useComposerFinalFocus) and hands `finalFocus: $i` to the presets environment bar's picker (the env picker, host
// "home-environment" = SourceSavedEnvironmentMenu) and folder menu (hse → P8, host "home-folder" = SourceComposerFolderMenu).
//
// K6 speaks Base UI's finalFocus function contract: it asks the composer for focus itself and returns `false` when that
// worked or focus should stay where it is, `true` when Base UI should do its default (back to the trigger). The host
// SourceMenu / SourcePopover finalFocus function instead returns the node to focus (null = leave focus alone)
// (source-menu.jsx / source-popover.jsx restore). This adapter maps the one onto the other: K6 `true` → the trigger,
// anything else → null.
//
// Host timing guard: SourceMenu runs an item-click restore one frame after onClose (source-menu.jsx finish → rAF), when
// an action may already have moved focus into a dialog it opened; Base UI asks finalFocus at close time instead. So K6 is
// only asked while focus is still lost (null / body) or inside a menu popup (Ag's "lost" condition in the host restore);
// otherwise focus stays where the action put it (null), and the composer is not asked.

/** True when focus is lost (no element / the body) or still inside a closing menu popup. */
export function composerFinalFocusLost(doc) {
  const active = doc?.activeElement;
  if (!active || active === doc.body) return true;
  return typeof active.closest === 'function' && active.closest('[role="menu"]') !== null;
}

/**
 * Host finalFocus for a SourceMenu / SourcePopover from K6's result.
 * `composerFinalFocus` is useComposerFinalFocus's return (a function, or undefined without onRequestComposerFocus);
 * `trigger` is the popup's trigger node (or a function returning it). Returns undefined when K6 is absent so the popup
 * keeps its default (the trigger), as Base UI does for `finalFocus: undefined`.
 */
export function hostComposerFinalFocus(composerFinalFocus, trigger, doc = globalThis.document) {
  if (typeof composerFinalFocus !== 'function') return undefined;
  return () => {
    if (!composerFinalFocusLost(doc)) return null;
    if (composerFinalFocus() !== true) return null;
    const node = typeof trigger === 'function' ? trigger() : trigger;
    return node ?? null;
  };
}
