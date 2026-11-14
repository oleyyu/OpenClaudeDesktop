import { useCallback, useLayoutEffect, useRef } from 'react';
import { createPreviewCopyUrl } from './generated/code-editor/preview-copy-url.mjs';
import { useRoutineIntl } from './source-routine-adapters.jsx';
import { useSourceToasts } from './source-toast.jsx';

function useStable(callback) {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; });
  return useCallback((...args) => latest.current(...args), []);
}
function useToasts() {
  const store = useSourceToasts();
  return store && {
    addInfo: message => store.add(message),
    addSuccess: message => store.add(message),
    addError: message => store.add(message, { variant: 'danger' }),
  };
}

// The local snapshot/event bridge supplies the original get/change URL capability.
// Clipboard access stays on this pane's renderer, including detached windows.
export const usePreviewCopyUrl = createPreviewCopyUrl({
  useIntl: useRoutineIntl, useToasts, useStable,
  useOwnerWindow: () => typeof window === 'undefined' ? null : window,
  useFeature: () => true,
  previewApi: {
    get getPreviewUrl() { return globalThis.desktop?.call; },
    get onPreviewUrlChanged() { return globalThis.desktop?.onEvent; },
  },
  writeClipboard: async (owner, value) => {
    await owner.navigator.clipboard.writeText(value);
    return 'written';
  },
});
