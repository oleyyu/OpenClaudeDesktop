// R4f-error E36 (transcript-auto-resume-after-limit, WI-7): the session pane's auto-resume status, 2.42304.0 cc43287c9:
//   v("span", {ref: A_, role: "status", className: "sr-only select-none"})            (just before the composer, Nte)
//   D(() => { let e = A_.current; if (!e || (e.textContent = "", !j_)) return;
//             let t = ge(e), n = t.setTimeout(() => { e.textContent = j_.text }, 50); return () => t.clearTimeout(n) }, [j_])
// j_ is N_'s announcement {text: "Limits reset — resuming session", seq} (retry-failed-turn-model.mjs
// nextResumeAnnouncement); emptying the region first and filling it 50 ms later makes a screen reader announce a repeat.
// It is a screen reader status, never visible text: `sr-only` and `select-none` are the official stylesheet's utilities
// (c6a992d55, loaded by index.html).
import React, { useEffect, useRef } from 'react';

export function SourceAutoResumeStatus({ announcement = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || ((node.textContent = ''), !announcement)) return undefined;
    // ge(e): the node's own window (a session pop-out is its own window).
    const view = node.ownerDocument?.defaultView ?? globalThis;
    const timer = view.setTimeout(() => { node.textContent = announcement.text; }, 50);
    return () => view.clearTimeout(timer);
  }, [announcement]);
  return <span ref={ref} role="status" className="sr-only select-none" />;
}
