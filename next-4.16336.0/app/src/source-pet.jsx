import React, { useEffect, useRef, useState } from "react";
import animationData from "../public/reference/clawd-laptop.json";
import { clawdClassName } from "./generated/code-start-v4/start.mjs";
import { clawdReplayButtonClassName } from "./generated/code-start-v4/clawd-replay.mjs";
import "./source-composer.css";

let playerPromise;
const loadPlayer = () => playerPromise ??= import("../public/reference/lottie-player.js").then((module) => module.default);

// The host's ClawdLaptopInner (4.16336.0 cc13f8cc7-COuBECEu.js u, exported ClawdLaptopInner): the start card's g_e (cc43287c9)
// renders it through NW as `{animationUrl: h_e.get(flag), replayToken, listeningLoop, className: m_e, replayOnClick: true}`
// (src/source-code-start-v4-adapters.jsx StartClawdLaptop). Same contract and markup as the original:
//   - replayOnClick: a button (type button, tabIndex -1, aria-hidden, mouse-down kept from moving focus) with
//     `${className ?? ""}` + the original replay classes (generated/code-start-v4/clawd-replay.mjs), around the animation
//     drawn `w-full h-full`; a click replays it while motion is allowed.
//   - otherwise the animation itself takes className.
// The animation is the official default (c838f53ee-DqwARLA7.json, byte-identical public/reference/clawd-laptop.json, what
// `h === void 0 ? c : h` picks while h_e holds no entry); an explicit animationUrl loads that URL through the player instead.
// The lottie player, reduced motion (prefers-reduced-motion or the local motion setting) and the replay token stay the host's.
//
// Without className / replayOnClick (the composer's legacy slot, source-composer.jsx showPet) it renders the 3.6556.2 draft
// page placement: a relative, zero-height, pointer-less slot (.sc-pet-slot, z-index 2) around the same replay button with the
// ClawdLaptop className m_e (identical to 3.6556.2 jfe).
export function SourcePet({ replayToken, listeningLoop = false, className, replayOnClick, animationUrl }) {
  if (className === undefined && replayOnClick === undefined) {
    return (
      <div className="sc-pet-slot" aria-hidden="true" style={{ zIndex: 2 }}>
        <ClawdLaptop replayToken={replayToken} listeningLoop={listeningLoop} className={clawdClassName} replayOnClick animationUrl={animationUrl} />
      </div>
    );
  }
  return <ClawdLaptop replayToken={replayToken} listeningLoop={listeningLoop} className={className} replayOnClick={replayOnClick} animationUrl={animationUrl} />;
}

function ClawdLaptop({ replayToken, listeningLoop = false, className, replayOnClick = false, animationUrl }) {
  const container = useRef(null);
  const animation = useRef(null);
  const previousToken = useRef(replayToken);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.localMotion === "reduce");

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduceMotion(media.matches || document.documentElement.dataset.localMotion === "reduce");
    change();
    window.addEventListener("local-motion-change", change);
    media.addEventListener("change", change);
    return () => { media.removeEventListener("change", change); window.removeEventListener("local-motion-change", change); };
  }, []);

  useEffect(() => {
    let canceled = false;
    let instance;
    setReady(false);
    loadPlayer().then((player) => {
      if (canceled || !container.current) return;
      instance = player.loadAnimation({
        container: container.current,
        renderer: "svg",
        loop: listeningLoop && !reduceMotion,
        autoplay: !reduceMotion,
        ...(animationUrl === undefined ? { animationData: structuredClone(animationData) } : { path: animationUrl }),
      });
      animation.current = instance;
      const onReady = () => {
        if (canceled) return;
        if (reduceMotion) instance.goToAndStop(Math.max(instance.totalFrames - 1, 0), true);
        setReady(true);
      };
      instance.addEventListener("DOMLoaded", onReady);
      if (instance.isLoaded) onReady();
    }).catch(() => { /* Keep the decorative slot empty if the asset cannot load. */ });
    return () => {
      canceled = true;
      instance?.destroy();
      if (animation.current === instance) animation.current = null;
    };
  }, [reduceMotion, animationUrl]);

  useEffect(() => {
    const instance = animation.current;
    if (!instance) return;
    instance.loop = listeningLoop && !reduceMotion;
    if (instance.loop && instance.isPaused) instance.goToAndPlay(0, true);
  }, [listeningLoop, reduceMotion, ready]);

  useEffect(() => {
    if (previousToken.current === replayToken) return;
    previousToken.current = replayToken;
    if (!reduceMotion) animation.current?.goToAndPlay(0, true);
  }, [replayToken, reduceMotion]);

  const replay = () => { if (!reduceMotion) animation.current?.goToAndPlay(0, true); };
  const drawn = <span className={`sc-pet-animation ${replayOnClick ? "w-full h-full" : className ?? ""}`} ref={container} data-ready={ready || undefined} />;
  if (!replayOnClick) return drawn;
  return (
    <button type="button" tabIndex={-1} aria-hidden="true" data-clawd="" className={`${className ?? ""} ${clawdReplayButtonClassName}`}
      onMouseDown={(event) => event.preventDefault()} onClick={replay}>
      {drawn}
    </button>
  );
}
