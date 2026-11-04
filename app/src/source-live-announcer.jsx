// W14-code fr2-04: the app-wide polite announcer, 3.6556.2 shared-5-Bg6ZMqvt.js Rw / zw / Bw (shared-21 imports zw as
// `aee` for JD's "Side navigation shown" / "Side navigation hidden"). Host transcription (E84.2: the module is not sliced
// by any generator; the closure is a one-field store and a portal):
//   function zw(e){e!==""&&Rw.setState(t=>({text:e,count:t.count+1}))}
//   function Bw(){…r=Rw.subscribe(r=>{clearTimeout(e),clearTimeout(n),e=setTimeout(()=>t(r),Lw),n=setTimeout(()=>t(null),5300)})…
//     e&&h("span",{children:e.text},e.count) … U(h("span",{role:"status","aria-live":"polite",className:"sr-only",children:i}),document.body)}
//   Lw=300
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SHOW_DELAY_MS = 300; // Lw
const CLEAR_DELAY_MS = 5300;
let state = { text: "", count: 0 };
const listeners = new Set();

/** zw: queue a polite announcement (an empty string is ignored). */
export function announcePolite(text) {
  if (text === "") return;
  state = { text, count: state.count + 1 };
  for (const listener of listeners) listener(state);
}

/** Bw: the sr-only live region, portalled into document.body. Mount once per window. */
export function SourceLiveAnnouncer() {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    let show, clear;
    const listener = (next) => {
      clearTimeout(show); clearTimeout(clear);
      show = setTimeout(() => setMessage(next), SHOW_DELAY_MS);
      clear = setTimeout(() => setMessage(null), CLEAR_DELAY_MS);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); clearTimeout(show); clearTimeout(clear); };
  }, []);
  const children = message && <span key={message.count}>{message.text}</span>;
  return typeof document === "undefined" ? null : createPortal(<span role="status" aria-live="polite" className="sr-only">{children}</span>, document.body);
}
