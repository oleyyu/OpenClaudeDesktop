import React, { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.js";
import { t, tn } from "../electron/i18n/index.mjs";

// shared-21-D098Wd--.js:16926-17004 (TV/EV, DV useCountTween, OV GitCounts).
const MINUS = "−";
export const COUNT_TWEEN_MS = 400;

/** OV sr-only part: the S5Ia/3aoNz and FnkQmHtZvP plurals joined as a unit list
 * (gu type "unit", en-US ", "), e.g. "3 additions, 1 deletion". */
export function gitCountsLabel(added, removed) {
  const plural = (count, one, other) => tn(count, one, other, { count: Number(count).toLocaleString() });
  return t("{additions}, {deletions}", { additions: plural(added, "{count} addition", "{count} additions"), deletions: plural(removed, "{count} deletion", "{count} deletions") });
}

/** DV: the shown value starts at the target and, on a change, eases to the new
 * target over `duration` ms with 1-(1-t)^3, rounded each frame. Reduced motion
 * (the OS query or the app's data-reduce-motion switch) jumps at once. */
export function useCountTween(value, duration = COUNT_TWEEN_MS) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  if (reduced && !Object.is(shown, value)) setShown(value);
  const last = useRef(value);
  useLayoutEffect(() => {
    const from = last.current;
    if (reduced || from === value || typeof requestAnimationFrame !== "function") {
      last.current = value;
      if (!Object.is(shown, value)) setShown(value);
      return undefined;
    }
    const start = performance.now(), delta = value - from, ease = (t) => 1 - (1 - t) ** 3;
    let frame;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration), next = Math.round(from + delta * ease(t));
      last.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => { if (frame !== undefined) cancelAnimationFrame(frame); };
    // `shown` is read only to settle a skipped tween; it must not restart one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduced]);
  return shown;
}

/** OV: `tabular-nums` + className around an sr-only unit list and an
 * aria-hidden `contents` pair of +added / −removed (the visible numbers tween). */
// W14-code r7 gen-final-7: the default ink is c60636ac6 Qe's (`l === void 0 ? "text-git-added" : l`, `u === void 0 ?
// "text-git-removed" : u`); the host's .sg-added / .sg-removed rules went with the composer band (css7-git-band-prbarrow).
export function GitCounts({ added, removed, className = "", addedClassName = "text-git-added", removedClassName = "text-git-removed" }) {
  const shownAdded = useCountTween(added), shownRemoved = useCountTween(removed);
  return <span className={`tabular-nums ${className}`.trim()} data-git-counts="">
    <span className="sr-only">{gitCountsLabel(added, removed)}</span>
    <span aria-hidden="true" className="contents">
      <span className={addedClassName}>{`+${shownAdded.toLocaleString()}`}</span>
      <span className={removedClassName}>{`${MINUS}${shownRemoved.toLocaleString()}`}</span>
    </span>
  </span>;
}
