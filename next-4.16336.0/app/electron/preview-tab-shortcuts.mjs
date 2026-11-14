import { reopenTabKey, selectTabKey, cycleTabKey } from './generated/preview-tab-shortcuts.mjs';

// The renderer supplies a normalized Electron input. Keep the original native
// matchers shared across DOM chrome and WebContentsView before-input-event.
export function previewTabKeyCommand(input, isMac) {
  if (!input || input.isComposing) return null;
  const options = {
    cmdPressed: isMac ? input.meta : input.control,
    otherModifierPressed: isMac ? input.control : input.meta,
    syntheticSuppressed: input.syntheticSuppressed === true,
    enabled: true,
  };
  const key = { ...input, key: String(input.key ?? ''), code: String(input.code ?? ''), shift: input.shift === true };
  const reopen = reopenTabKey(key, options);
  if (reopen !== 'pass') return { action: reopen === 'claim' ? 'claim' : 'reopen-tab' };
  const index = selectTabKey(key, options);
  if (index !== 'pass') return index === 'claim' ? { action: 'claim' } : { action: 'select-tab', index };
  const cycle = cycleTabKey(key, { syntheticSuppressed: options.syntheticSuppressed, pageKeys: false });
  return cycle === 'pass' ? null : { action: cycle === 'claim' ? 'claim' : 'cycle-tab', direction: cycle === 'previous' ? -1 : 1 };
}

export function previewDOMTabKey(event, isMac) {
  return previewTabKeyCommand({ type: 'keyDown', key: event.key, code: event.code,
    meta: event.metaKey, control: event.ctrlKey, alt: event.altKey, shift: event.shiftKey,
    isAutoRepeat: event.repeat, isComposing: event.isComposing || event.nativeEvent?.isComposing }, isMac);
}
