import "./source-spark.css";
import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.js";
import { isOnceState, resolveSparkRendering, sparkBox, sparkKeyframes, sparkTiming, validateSparkStrip } from "./spark-sprite-model.mjs";
import "./persona-settings.css";
import { Icon } from "./icons";
import { usePersona } from "./use-persona.js";

// C2 persona: the built-in glyph alternatives to the spark sprite.
export const PERSONA_GLYPHS = Object.freeze({ star: "StarFilled", lightning: "Lightning", chat: "ChatSimpleFilled" });
/** A non-spark persona icon (built-in glyph or custom image) in the spark's box. */
export function PersonaSparkGlyph({ persona, size = 18, state, className = "", color = "var(--cds-clay, #d97757)", style }) {
  const busy = state !== undefined && state !== null && state !== "idle";
  const box = { "--cds-spark-size": sizeRem(size), color, ...style };
  const shared = { className: `source-spark persona-spark ${className}`, "data-cds": "Spark", "data-spark-rendering": "persona",
    "data-persona-icon": persona.sparkIcon, "data-spark-state": busy ? state : undefined, "aria-hidden": "true", style: box };
  if (persona.sparkIcon === "custom" && persona.sparkImage)
    return <span {...shared}><img src={persona.sparkImage} alt="" draggable={false} /></span>;
  return <span {...shared}><Icon name={PERSONA_GLYPHS[persona.sparkIcon] || "StarFilled"} size={size} /></span>;
}

// Claude 2.2553.1 shared-frame bd: original static Spark path, not a font glyph
// or the homepage crab.
export const SPARK_PATH = "m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z";

// Only the classic status row's "thinking" strip is shipped (shared-frame cv:
// lazy `cds_spark_sprites` module, cached once per page, any failure -> static).
// The strip is data extracted by prepare-ui; React renders its path element.
let stripPromise = null;
let stripCache = null; // strip object | "failed" | null
function loadThinkingStrip() {
  if (stripCache) return Promise.resolve(stripCache);
  stripPromise ??= import("./generated/spark-thinking.json")
    .then((module) => {
      const strip = module?.default ?? module;
      stripCache = validateSparkStrip(strip) && strip.name === "thinking" ? strip : "failed";
      return stripCache;
    })
    .catch(() => { stripCache = "failed"; return stripCache; });
  return stripPromise;
}
const stripFor = (state, loaded) => (state === "thinking" && loaded && loaded !== "failed" ? loaded : loaded === "failed" ? "failed" : null);

const sizeRem = (size) => `calc(${size / 16}rem * var(--cds-rem-scale, 1))`;

function StaticSpark({ size, rendering, className, color }) {
  return (
    <svg
      className={`source-spark ${className}`}
      data-cds="Spark"
      data-spark-rendering={rendering}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ "--cds-spark-size": sizeRem(size) }}
      fill={color}
      aria-hidden="true"
      focusable="false"
    >
      <path d={SPARK_PATH} />
    </svg>
  );
}

// state undefined|'idle' -> static svg (dv). Any other state -> sprite once
// its strip is available and motion is not reduced; otherwise static fallback.
export function SourceSpark({ size = 18, state, className = "", color = "var(--cds-clay, #d97757)", onEnd }) {
  const persona = usePersona();
  const personaGlyph = persona.sparkIcon !== "spark";
  const reducedMotion = useReducedMotion();
  const busy = state !== undefined && state !== null && state !== "idle";
  const [loaded, setLoaded] = useState(() => stripCache);
  const stripRef = useRef(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!busy || reducedMotion || loaded || personaGlyph) return undefined;
    let alive = true;
    loadThinkingStrip().then((strip) => { if (alive) setLoaded(strip); });
    return () => { alive = false; };
  }, [busy, reducedMotion, loaded]);
  const strip = busy && !reducedMotion ? stripFor(state, loaded) : null;
  const rendering = resolveSparkRendering({ state, reducedMotion, strip });
  const once = isOnceState(state);
  useEffect(() => {
    const element = stripRef.current;
    if (rendering !== "sprite" || !element || typeof element.animate !== "function") return undefined;
    const animation = element.animate(sparkKeyframes(strip.frameCount), sparkTiming({ frameCount: strip.frameCount, speed: strip.speed, once }));
    const finish = () => endRef.current?.();
    if (once) animation.addEventListener("finish", finish);
    return () => { animation.removeEventListener("finish", finish); animation.cancel(); };
  }, [rendering, strip, state, once]);
  // C2: a persona glyph has no sprite strip; a once-state still ends, so
  // flows waiting on onEnd do not stall.
  useEffect(() => {
    if (!personaGlyph || !once) return undefined;
    const timer = setTimeout(() => endRef.current?.(), 0);
    return () => clearTimeout(timer);
  }, [personaGlyph, once, state]);
  if (personaGlyph) return <PersonaSparkGlyph persona={persona} size={size} state={state} className={className} color={color} />;
  if (rendering !== "sprite") return <StaticSpark size={size} rendering={rendering} className={`source-spark ${className}`} color={color} />;
  return (
    <span
      className={`source-spark ${className}`}
      data-cds="Spark"
      data-spark-rendering="sprite"
      data-spark-state={state}
      aria-hidden="true"
      style={{ ...sparkBox(size, strip), color }}
    >
      <span ref={stripRef} data-cds-spark-strip="">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={strip.viewBox} focusable="false">
          <path d={strip.path} />
        </svg>
      </span>
    </span>
  );
}
