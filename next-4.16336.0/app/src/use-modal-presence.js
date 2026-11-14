import { useLayoutEffect, useRef, useState } from 'react';
import { waitForModalExit } from './modal-presence.mjs';

export function useModalPresence(open) {
  const [present, setPresent] = useState(open), [entered, setEntered] = useState(false);
  const popup = useRef(null);
  useLayoutEffect(() => {
    if (open && !present) { setPresent(true); return; }
    if (!present) return;
    const view = popup.current?.ownerDocument.defaultView;
    if (open) {
      const frame = view.requestAnimationFrame(() => setEntered(true));
      return () => view.cancelAnimationFrame(frame);
    }
    setEntered(false);
  }, [open, present]);
  // A separate layout effect sees the committed ending-style attribute, so
  // reduced-motion and CSS overrides determine the actual exit residency.
  useLayoutEffect(() => {
    if (open || !present || entered || !popup.current) return;
    return waitForModalExit(popup.current, () => setPresent(false));
  }, [open, present, entered]);
  return { present, visible: open && entered, popup };
}
