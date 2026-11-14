// ANSI escape handling for the Run-a-command output block.
//
// Source chain: reference/current-2.2553.1/ion-dist/assets/v1/c966e2bd9-DuJ2TLm_.js
// (prettified at analysis/batch2-audit-20260920/readable/c966e2bd9-DuJ2TLm_.js):
//   :1-2     the escape-sequence pattern (CSI, OSC/DCS/PM/APC/SOS, Fe/Fs/nF)
//   :9-27    the 8 normal and 8 bright colours of the shipped palette
//   :28-41   256-colour cube and grayscale ramp
//   :42-118  SGR state machine (0/1/2/3/4/7/9/22/23/24/27/29/39/49,
//            30-37, 40-47, 90-97, 100-107, 38/48 with ;5; and ;2;)
//   :119-146 segmentation: only a CSI ... m whose body is [0-9;]* changes state
//   :147-171 the CSS a segment style produces, including inverse
// Reimplemented here; the palette and the SGR numbers are the contract.

const ESCAPE =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-9:;<=>?]*[ -/]*[@-~]|[\]P^_Xk][^\x07\x1b]*(?:\x07|\x1b\\)?|[ -/]*[0-OQ-WYZ\\`a-jl-~])/g;
const SGR_BODY = /^[0-9;]*$/;

export const ANSI_NORMAL = [
  "#4d4d4c",
  "#c82829",
  "#718c00",
  "#eab700",
  "#4271ae",
  "#8959a8",
  "#3e999f",
  "#d6d6d6",
];
export const ANSI_BRIGHT = [
  "#8e908c",
  "#f5871f",
  "#a2bd40",
  "#f0c674",
  "#6ca4e0",
  "#b777db",
  "#6bc8cd",
  "#ffffff",
];

const hex = (value) => value.toString(16).padStart(2, "0");

/** The 256-colour table: 16 palette entries, a 6x6x6 cube, then 24 grays. */
export function ansi256(index) {
  if (!Number.isInteger(index) || index < 0 || index > 255) return undefined;
  if (index < 8) return ANSI_NORMAL[index];
  if (index < 16) return ANSI_BRIGHT[index - 8];
  if (index < 232) {
    const offset = index - 16;
    const level = (step) => hex(step === 0 ? 0 : 55 + step * 40);
    return `#${level(Math.floor(offset / 36))}${level(Math.floor((offset % 36) / 6))}${level(offset % 6)}`;
  }
  const gray = hex(8 + (index - 232) * 10);
  return `#${gray}${gray}${gray}`;
}

export function hasAnsi(text) {
  ESCAPE.lastIndex = 0;
  return ESCAPE.test(text);
}

export function stripAnsi(text) {
  return text.replace(ESCAPE, "");
}

function applySgr(codes, previous) {
  let style = { ...previous };
  for (let at = 0; at < codes.length; at++) {
    const code = codes[at];
    if (code === 0) style = {};
    else if (code === 1) style.bold = true;
    else if (code === 2) style.dim = true;
    else if (code === 3) style.italic = true;
    else if (code === 4) style.underline = true;
    else if (code === 7) style.inverse = true;
    else if (code === 9) style.strikethrough = true;
    else if (code === 22) {
      style.bold = false;
      style.dim = false;
    } else if (code === 23) style.italic = false;
    else if (code === 24) style.underline = false;
    else if (code === 27) style.inverse = false;
    else if (code === 29) style.strikethrough = false;
    else if (code === 39) delete style.fg;
    else if (code === 49) delete style.bg;
    else if (code >= 30 && code <= 37) style.fg = ANSI_NORMAL[code - 30];
    else if (code >= 40 && code <= 47) style.bg = ANSI_NORMAL[code - 40];
    else if (code >= 90 && code <= 97) style.fg = ANSI_BRIGHT[code - 90];
    else if (code >= 100 && code <= 107) style.bg = ANSI_BRIGHT[code - 100];
    else if (code === 38 || code === 48) {
      const channel = code === 38 ? "fg" : "bg";
      if (codes[at + 1] === 5 && at + 2 < codes.length) {
        style[channel] = ansi256(codes[at + 2] ?? 0);
        at += 2;
      } else if (codes[at + 1] === 2 && at + 4 < codes.length) {
        style[channel] = `#${hex(codes[at + 2] ?? 0)}${hex(codes[at + 3] ?? 0)}${hex(codes[at + 4] ?? 0)}`;
        at += 4;
      }
    }
  }
  return style;
}

/** Splits text into {text, style} runs; every escape sequence is consumed. */
export function parseAnsi(text) {
  const segments = [];
  let style = {};
  let cursor = 0;
  let match;
  ESCAPE.lastIndex = 0;
  while ((match = ESCAPE.exec(text)) !== null) {
    if (match.index > cursor) {
      const run = text.slice(cursor, match.index);
      if (run) segments.push({ text: run, style });
    }
    cursor = match.index + match[0].length;
    const sequence = match[0];
    const body = sequence.slice(2, -1);
    if (sequence.startsWith("\x1b[") && sequence.endsWith("m") && SGR_BODY.test(body))
      style = applySgr(
        body === "" ? [0] : body.split(";").map((part) => parseInt(part, 10) || 0),
        style,
      );
  }
  if (cursor < text.length) {
    const run = text.slice(cursor);
    if (run) segments.push({ text: run, style });
  }
  return segments;
}

/** The inline style a run needs, or undefined when it needs none. */
export function ansiStyle(style = {}) {
  const css = {};
  let used = false;
  if (style.bold) {
    css.fontWeight = "bold";
    css.fontVariationSettings = "normal";
    used = true;
  }
  if (style.dim) {
    css.opacity = 0.7;
    used = true;
  }
  if (style.italic) {
    css.fontStyle = "italic";
    used = true;
  }
  if (style.underline) {
    css.textDecoration = "underline";
    used = true;
  }
  if (style.strikethrough) {
    css.textDecoration = style.underline ? "underline line-through" : "line-through";
    used = true;
  }
  const color = style.inverse ? (style.bg ?? "Canvas") : style.fg;
  const background = style.inverse ? (style.fg ?? "CanvasText") : style.bg;
  if (color) {
    css.color = color;
    used = true;
  }
  if (background) {
    css.backgroundColor = background;
    used = true;
  }
  return used ? css : undefined;
}
