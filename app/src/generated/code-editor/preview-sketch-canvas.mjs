// Complete original drawing canvas and geometry/history/rendering helpers (3.6556.2).
import {
  memoStoreValueFirst1 as I1,
  memoIsEmpty as J0,
  memoChanged1 as J1,
  memoChanged2 as J2,
  memoChanged3 as J3,
  memoChanged4 as J4,
  memoChanged5 as J5,
  memoSentinel as J8,
  reactMemoCache as J9,
  memoStore0 as K0,
  memoStore1 as K1,
  memoStore2 as K2,
  memoStore3 as K3,
  memoStore4 as K4,
  memoStore5 as K5,
  memoStoreDeps1 as Z1,
  memoStoreDeps5 as Z5,
} from "../view-tabs/shared-frame-6jtSkIit.js";
import { jsxs as a, jsx as i } from "react/jsx-runtime";
import { ownerWindow as b } from "../view-tabs/shared-25-DOWZRSlq.js";
import {
  useEffect as c,
  useState as d,
  useRef as r,
  useLayoutEffect as s,
  useImperativeHandle as u,
} from "react";

const D = (() => {
  function e(e) {
    let t = 1 / 0;
    for (let n of e) {
      if (n !== n) return NaN;
      (n < t || (Object.is(n, -0) && t === 0)) && (t = n);
    }
    return t;
  }
  return e;
})();
const le = (() => {
  function Df(e) {
    let t = -1 / 0;
    for (let n of e) {
      if (n !== n) return NaN;
      (n > t || (n === 0 && Object.is(t, -0))) && (t = n);
    }
    return t;
  }
  return Df;
})();
const T = (() => {
  var e = {
      radius: {
        cssVar: "var(--cds-radius)",
        value: "0.375rem",
        densities: { comfortable: "0.5rem" },
        __name: "radius",
        type: "dimension",
      },
      radiusComposer: {
        cssVar: "var(--cds-radius-composer)",
        value: "0.75rem",
        densities: { comfortable: "0.875rem" },
        __name: "radius-composer",
        type: "dimension",
      },
      h: {
        control: {
          cssVar: "var(--cds-h-control)",
          value: "1.5rem",
          densities: { comfortable: "2rem" },
          __name: "h-control",
          type: "dimension",
          nested: {
            cssVar: "var(--cds-h-control-nested)",
            value: "1.125rem",
            densities: { comfortable: "1.375rem" },
            __name: "h-control-nested",
            type: "dimension",
          },
        },
      },
      icon: {
        cssVar: "var(--cds-icon)",
        value: "1rem",
        densities: { comfortable: "1.25rem" },
        __name: "icon",
        type: "dimension",
      },
      pad: {
        xs: {
          cssVar: "var(--cds-pad-xs)",
          value: "0.25rem",
          densities: { comfortable: "0.375rem" },
          __name: "pad-xs",
          type: "dimension",
        },
        sm: {
          cssVar: "var(--cds-pad-sm)",
          value: "0.375rem",
          densities: { comfortable: "0.5rem" },
          __name: "pad-sm",
          type: "dimension",
        },
        md: {
          cssVar: "var(--cds-pad-md)",
          value: "0.5rem",
          densities: { comfortable: "0.75rem" },
          __name: "pad-md",
          type: "dimension",
        },
        lg: {
          cssVar: "var(--cds-pad-lg)",
          value: "0.75rem",
          densities: { comfortable: "1rem" },
          __name: "pad-lg",
          type: "dimension",
        },
        xl: {
          cssVar: "var(--cds-pad-xl)",
          value: "1.25rem",
          densities: { comfortable: "1.5rem" },
          __name: "pad-xl",
          type: "dimension",
        },
      },
      gap: {
        xs: {
          cssVar: "var(--cds-gap-xs)",
          value: "0.375rem",
          densities: { comfortable: "0.5rem" },
          __name: "gap-xs",
          type: "dimension",
        },
        sm: {
          cssVar: "var(--cds-gap-sm)",
          value: "0.5rem",
          densities: { comfortable: "0.75rem" },
          __name: "gap-sm",
          type: "dimension",
        },
        md: {
          cssVar: "var(--cds-gap-md)",
          value: "0.75rem",
          densities: { comfortable: "1rem" },
          __name: "gap-md",
          type: "dimension",
        },
        lg: {
          cssVar: "var(--cds-gap-lg)",
          value: "1.25rem",
          densities: { comfortable: "1.75rem" },
          __name: "gap-lg",
          type: "dimension",
        },
        xl: {
          cssVar: "var(--cds-gap-xl)",
          value: "2rem",
          densities: { comfortable: "2.5rem" },
          __name: "gap-xl",
          type: "dimension",
        },
      },
      outset: {
        x: {
          cssVar: "var(--cds-outset-x)",
          value: "0px",
          __name: "outset-x",
          type: "dimension",
        },
        y: {
          cssVar: "var(--cds-outset-y)",
          value: "0px",
          __name: "outset-y",
          type: "dimension",
        },
      },
      border: {
        cssVar: "var(--cds-border)",
        value: "rgba(11, 11, 11, 0.1)",
        modes: { dark: "rgba(255, 255, 255, 0.1)" },
        __name: "border",
        type: "color",
        accent: {
          cssVar: "var(--cds-border-accent)",
          value: "#86b6ef",
          modes: { dark: "#0d366b" },
          __name: "border-accent",
          type: "color",
        },
        danger: {
          cssVar: "var(--cds-border-danger)",
          value: "#f09595",
          modes: { dark: "#641919" },
          __name: "border-danger",
          type: "color",
        },
        success: {
          cssVar: "var(--cds-border-success)",
          value: "#73cb6d",
          modes: { dark: "#074506" },
          __name: "border-success",
          type: "color",
        },
        warning: {
          cssVar: "var(--cds-border-warning)",
          value: "#eda100",
          modes: { dark: "#512e00" },
          __name: "border-warning",
          type: "color",
        },
        pro: {
          cssVar: "var(--cds-border-pro)",
          value: "#b0a7f2",
          modes: { dark: "#322777" },
          __name: "border-pro",
          type: "color",
        },
        editor: {
          comment: {
            cssVar: "var(--cds-border-editor-comment)",
            value: "#b77700",
            modes: { dark: "#db9300" },
            __name: "border-editor-comment",
            type: "color",
            open: {
              cssVar: "var(--cds-border-editor-comment-open)",
              value: "#a66a00",
              modes: { dark: "#fab219" },
              __name: "border-editor-comment-open",
              type: "color",
            },
            target: {
              cssVar: "var(--cds-border-editor-comment-target)",
              value: "#a66a00",
              __name: "border-editor-comment-target",
              type: "color",
            },
          },
        },
        git: {
          added: {
            cssVar: "var(--cds-border-git-added)",
            value: "color-mix(in srgb, #1e9e3c 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #32d74b 40%, transparent)" },
            __name: "border-git-added",
            type: "color",
          },
          removed: {
            cssVar: "var(--cds-border-git-removed)",
            value: "color-mix(in srgb, #cd2054 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #ff2c56 40%, transparent)" },
            __name: "border-git-removed",
            type: "color",
          },
          modified: {
            cssVar: "var(--cds-border-git-modified)",
            value: "color-mix(in srgb, #98801f 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #ffd014 40%, transparent)" },
            __name: "border-git-modified",
            type: "color",
          },
          merged: {
            cssVar: "var(--cds-border-git-merged)",
            value: "color-mix(in srgb, #8e6bd9 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #b796ff 40%, transparent)" },
            __name: "border-git-merged",
            type: "color",
          },
          closed: {
            cssVar: "var(--cds-border-git-closed)",
            value: "color-mix(in srgb, #ff3a30 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #ff6159 40%, transparent)" },
            __name: "border-git-closed",
            type: "color",
          },
          conflicting: {
            cssVar: "var(--cds-border-git-conflicting)",
            value: "color-mix(in srgb, #c5621b 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #fa832e 40%, transparent)" },
            __name: "border-git-conflicting",
            type: "color",
          },
          draft: {
            cssVar: "var(--cds-border-git-draft)",
            value: "color-mix(in srgb, #737373 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #a6a6a6 40%, transparent)" },
            __name: "border-git-draft",
            type: "color",
          },
          opened: {
            cssVar: "var(--cds-border-git-opened)",
            value: "color-mix(in srgb, #1e9e3c 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #32d74b 40%, transparent)" },
            __name: "border-git-opened",
            type: "color",
          },
          queued: {
            cssVar: "var(--cds-border-git-queued)",
            value: "color-mix(in srgb, #98801f 40%, transparent)",
            modes: { dark: "color-mix(in srgb, #ffd014 40%, transparent)" },
            __name: "border-git-queued",
            type: "color",
          },
        },
        strong: {
          cssVar: "var(--cds-border-strong)",
          value: "rgba(11, 11, 11, 0.2)",
          modes: { dark: "rgba(255, 255, 255, 0.2)" },
          __name: "border-strong",
          type: "color",
        },
        stronger: {
          cssVar: "var(--cds-border-stronger)",
          value: "rgba(11, 11, 11, 0.4)",
          modes: { dark: "rgba(255, 255, 255, 0.4)" },
          __name: "border-stronger",
          type: "color",
        },
      },
      shadow: {
        sm: {
          cssVar: "var(--cds-shadow-sm)",
          value:
            "0 1px 2px 0 rgba(11, 11, 11, 0.06), 0 2px 8px 0 var(--cds-shadow-color)",
          __name: "shadow-sm",
          type: "shadow",
        },
        md: {
          cssVar: "var(--cds-shadow-md)",
          value:
            "0 2px 4px 0 rgba(11, 11, 11, 0.07), 0 6px 16px 0 var(--cds-shadow-color)",
          __name: "shadow-md",
          type: "shadow",
        },
        lg: {
          cssVar: "var(--cds-shadow-lg)",
          value:
            "0 4px 8px 0 rgba(11, 11, 11, 0.08), 0 12px 28px -2px var(--cds-shadow-color)",
          __name: "shadow-lg",
          type: "shadow",
        },
        color: {
          cssVar: "var(--cds-shadow-color)",
          value: "rgba(11, 11, 11, 0.08)",
          modes: { dark: "rgba(0, 0, 0, 0.24)" },
          __name: "shadow-color",
          type: "color",
        },
        popover: {
          cssVar: "var(--cds-shadow-popover)",
          value: "0 8px 24px rgb(0 0 0 / 0.12), 0 2px 6px rgb(0 0 0 / 0.08)",
          modes: {
            dark: "0 8px 24px rgb(0 0 0 / 0.32), 0 2px 6px rgb(0 0 0 / 0.2)",
          },
          __name: "shadow-popover",
          type: "shadow",
        },
        drop: {
          ring: {
            cssVar: "var(--cds-shadow-drop-ring)",
            value: "inset 0 0 0 2px #2a78d6",
            __name: "shadow-drop-ring",
            type: "shadow",
            danger: {
              cssVar: "var(--cds-shadow-drop-ring-danger)",
              value: "inset 0 0 0 2px #d03b3b",
              __name: "shadow-drop-ring-danger",
              type: "shadow",
            },
          },
          glow: {
            cssVar: "var(--cds-shadow-drop-glow)",
            value: "inset 0 0 24px -2px rgba(42, 120, 214, 0.2)",
            __name: "shadow-drop-glow",
            type: "shadow",
            danger: {
              cssVar: "var(--cds-shadow-drop-glow-danger)",
              value: "inset 0 0 24px -2px rgba(208, 59, 59, 0.2)",
              __name: "shadow-drop-glow-danger",
              type: "shadow",
            },
          },
        },
      },
      ring: {
        outer: {
          cssVar: "var(--cds-ring-outer)",
          value: "1px",
          modes: { dark: "0px" },
          __name: "ring-outer",
          type: "dimension",
        },
        inner: {
          cssVar: "var(--cds-ring-inner)",
          value: "0px",
          modes: { dark: "1px" },
          __name: "ring-inner",
          type: "dimension",
        },
        color: {
          cssVar: "var(--cds-ring-color)",
          value: "rgba(11, 11, 11, 0.1)",
          modes: { dark: "rgba(255, 255, 255, 0.1)" },
          __name: "ring-color",
          type: "color",
        },
        hairline: {
          cssVar: "var(--cds-ring-hairline)",
          value: "1px",
          __name: "ring-hairline",
          type: "dimension",
        },
      },
      focus: {
        shadow: {
          cssVar: "var(--cds-focus-shadow)",
          value:
            "inset 0 0 0 1px #f9f9f7, 0 0 0 1px #2a78d6, 0 0 6px 1px #cde2fb",
          modes: {
            dark: "inset 0 0 0 1px #0b0b0b, 0 0 0 1px #2a78d6, 0 0 6px 1px rgba(24, 79, 149, 0.6)",
          },
          __name: "focus-shadow",
          type: "shadow",
          danger: {
            cssVar: "var(--cds-focus-shadow-danger)",
            value:
              "inset 0 0 0 1px #f9f9f7, 0 0 0 1px #d03b3b, 0 0 6px 1px #fad6d6",
            modes: {
              dark: "inset 0 0 0 1px #0b0b0b, 0 0 0 1px #d03b3b, 0 0 6px 1px rgba(142, 38, 38, 0.6)",
            },
            __name: "focus-shadow-danger",
            type: "shadow",
          },
        },
      },
      font: {
        mono: {
          cssVar: "var(--cds-font-mono)",
          value:
            'var(--cds-font-mono-override,) var(--font-anthropic-mono, "SF Mono"), "SF Mono", ui-monospace, Menlo, Consolas, monospace',
          __name: "font-mono",
          type: "fontFamily",
          ui: {
            cssVar: "var(--cds-font-mono-ui)",
            value:
              'var(--font-anthropic-mono, "SF Mono"), "SF Mono", ui-monospace, Menlo, Consolas, monospace',
            __name: "font-mono-ui",
            type: "fontFamily",
          },
        },
        system: {
          cssVar: "var(--cds-font-system)",
          value:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "PingFang TC", "Hiragino Sans", "Apple SD Gothic Neo", sans-serif',
          __name: "font-system",
          type: "fontFamily",
        },
        sans: {
          cssVar: "var(--cds-font-sans)",
          value:
            "var(--font-anthropic-sans, var(--cds-font-system)), var(--cds-font-system)",
          __name: "font-sans",
          type: "fontFamily",
          display: {
            cssVar: "var(--cds-font-sans-display)",
            value:
              "var(--font-anthropic-sans-display, var(--cds-font-sans)), var(--cds-font-sans)",
            __name: "font-sans-display",
            type: "fontFamily",
          },
        },
        voice: {
          cssVar: "var(--cds-font-voice)",
          value:
            'var(--font-anthropic-serif, ui-serif), ui-serif, Georgia, "Times New Roman", serif',
          __name: "font-voice",
          type: "fontFamily",
        },
      },
      ease: {
        out: {
          cssVar: "var(--cds-ease-out)",
          value: "cubic-bezier(0.165, 0.84, 0.44, 1)",
          __name: "ease-out",
          type: "easing",
        },
        snap: {
          cssVar: "var(--cds-ease-snap)",
          value: "cubic-bezier(0.32, 0.72, 0, 1)",
          __name: "ease-snap",
          type: "easing",
        },
        overshoot: {
          cssVar: "var(--cds-ease-overshoot)",
          value: "cubic-bezier(0.34, 1.3, 0.64, 1)",
          __name: "ease-overshoot",
          type: "easing",
        },
      },
      dur: {
        fast: {
          cssVar: "var(--cds-dur-fast)",
          value: "60ms",
          __name: "dur-fast",
          type: "duration",
        },
        snap: {
          cssVar: "var(--cds-dur-snap)",
          value: "120ms",
          __name: "dur-snap",
          type: "duration",
        },
        base: {
          cssVar: "var(--cds-dur-base)",
          value: "200ms",
          __name: "dur-base",
          type: "duration",
        },
        sheet: {
          cssVar: "var(--cds-dur-sheet)",
          value: "300ms",
          __name: "dur-sheet",
          type: "duration",
        },
        slow: {
          cssVar: "var(--cds-dur-slow)",
          value: "450ms",
          __name: "dur-slow",
          type: "duration",
        },
      },
      btn: {
        spring: {
          cssVar: "var(--cds-btn-spring)",
          value:
            "linear(0, 0.2459, 0.6526, 0.9468, 1.0764, 1.0915, 1.0585, 1.0219, 0.9993, 0.9914, 0.9921, 0.9957, 0.9988, 1.0004, 1)",
          __name: "btn-spring",
          type: "easing",
        },
      },
      black: {
        cssVar: "var(--cds-black)",
        value: "#000000",
        __name: "black",
        type: "color",
      },
      oncolor: {
        200: {
          cssVar: "var(--cds-oncolor-200)",
          value: "hsl(60 6.7% 97.1% / 0.75)",
          __name: "oncolor-200",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-oncolor-300)",
          value: "hsl(60 6.7% 97.1% / 0.5)",
          __name: "oncolor-300",
          type: "color",
        },
      },
      clay: {
        cssVar: "var(--cds-clay)",
        value: "#d97757",
        __name: "clay",
        type: "color",
        emphasized: {
          cssVar: "var(--cds-clay-emphasized)",
          value: "#c6613f",
          __name: "clay-emphasized",
          type: "color",
        },
      },
      heather: {
        cssVar: "var(--cds-heather)",
        value: "#cbcadb",
        __name: "heather",
        type: "color",
      },
      plum: {
        cssVar: "var(--cds-plum)",
        value: "#827dbd",
        __name: "plum",
        type: "color",
      },
      cactus: {
        cssVar: "var(--cds-cactus)",
        value: "#bcd1ca",
        __name: "cactus",
        type: "color",
      },
      mineral: {
        cssVar: "var(--cds-mineral)",
        value: "#629987",
        __name: "mineral",
        type: "color",
      },
      gray: {
        0: {
          cssVar: "var(--cds-gray-0)",
          value: "#ffffff",
          __name: "gray-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-gray-10)",
          value: "#fcfcfb",
          __name: "gray-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-gray-20)",
          value: "#f9f9f7",
          __name: "gray-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-gray-30)",
          value: "#f6f6f4",
          __name: "gray-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-gray-40)",
          value: "#f3f3f0",
          __name: "gray-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-gray-50)",
          value: "#f0efec",
          __name: "gray-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-gray-60)",
          value: "#edece8",
          __name: "gray-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-gray-70)",
          value: "#eae9e4",
          __name: "gray-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-gray-80)",
          value: "#e7e6e1",
          __name: "gray-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-gray-90)",
          value: "#e4e3dd",
          __name: "gray-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-gray-100)",
          value: "#e1e0d9",
          __name: "gray-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-gray-150)",
          value: "#d2d1c7",
          __name: "gray-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-gray-200)",
          value: "#c3c2b7",
          __name: "gray-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-gray-250)",
          value: "#b4b3a8",
          __name: "gray-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-gray-300)",
          value: "#a5a49a",
          __name: "gray-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-gray-350)",
          value: "#97958d",
          __name: "gray-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-gray-400)",
          value: "#898781",
          __name: "gray-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-gray-450)",
          value: "#7b7974",
          __name: "gray-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-gray-500)",
          value: "#6d6b67",
          __name: "gray-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-gray-550)",
          value: "#5f5e5a",
          __name: "gray-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-gray-600)",
          value: "#52514e",
          __name: "gray-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-gray-650)",
          value: "#454442",
          __name: "gray-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-gray-700)",
          value: "#383835",
          __name: "gray-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-gray-750)",
          value: "#2c2c2a",
          __name: "gray-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-gray-800)",
          value: "#20201f",
          __name: "gray-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-gray-810)",
          value: "#1e1e1d",
          __name: "gray-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-gray-820)",
          value: "#1c1c1b",
          __name: "gray-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-gray-830)",
          value: "#1a1a19",
          __name: "gray-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-gray-840)",
          value: "#181817",
          __name: "gray-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-gray-850)",
          value: "#151515",
          __name: "gray-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-gray-860)",
          value: "#131313",
          __name: "gray-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-gray-870)",
          value: "#111111",
          __name: "gray-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-gray-880)",
          value: "#0f0f0f",
          __name: "gray-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-gray-890)",
          value: "#0d0d0d",
          __name: "gray-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-gray-900)",
          value: "#0b0b0b",
          __name: "gray-900",
          type: "color",
        },
      },
      red: {
        0: {
          cssVar: "var(--cds-red-0)",
          value: "#ffffff",
          __name: "red-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-red-10)",
          value: "#fffbfb",
          __name: "red-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-red-20)",
          value: "#fef7f7",
          __name: "red-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-red-30)",
          value: "#fef3f3",
          __name: "red-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-red-40)",
          value: "#fdefef",
          __name: "red-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-red-50)",
          value: "#fbebeb",
          __name: "red-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-red-60)",
          value: "#fae7e7",
          __name: "red-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-red-70)",
          value: "#fae3e3",
          __name: "red-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-red-80)",
          value: "#fadfdf",
          __name: "red-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-red-90)",
          value: "#fadada",
          __name: "red-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-red-100)",
          value: "#fad6d6",
          __name: "red-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-red-150)",
          value: "#f7c1c1",
          __name: "red-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-red-200)",
          value: "#f4abab",
          __name: "red-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-red-250)",
          value: "#f09595",
          __name: "red-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-red-300)",
          value: "#ec7e7e",
          __name: "red-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-red-350)",
          value: "#e66767",
          __name: "red-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-red-400)",
          value: "#e34948",
          __name: "red-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-red-450)",
          value: "#d03b3b",
          __name: "red-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-red-500)",
          value: "#b93535",
          __name: "red-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-red-550)",
          value: "#a32c2c",
          __name: "red-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-red-600)",
          value: "#8e2626",
          __name: "red-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-red-650)",
          value: "#791e1e",
          __name: "red-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-red-700)",
          value: "#641919",
          __name: "red-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-red-750)",
          value: "#511212",
          __name: "red-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-red-800)",
          value: "#3c0e0e",
          __name: "red-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-red-810)",
          value: "#380d0d",
          __name: "red-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-red-820)",
          value: "#340c0c",
          __name: "red-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-red-830)",
          value: "#310b0b",
          __name: "red-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-red-840)",
          value: "#2d0a0a",
          __name: "red-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-red-850)",
          value: "#280a0a",
          __name: "red-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-red-860)",
          value: "#230b0a",
          __name: "red-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-red-870)",
          value: "#1d0b0a",
          __name: "red-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-red-880)",
          value: "#170c0b",
          __name: "red-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-red-890)",
          value: "#110c0b",
          __name: "red-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-red-900)",
          value: "#0b0b0b",
          __name: "red-900",
          type: "color",
        },
      },
      orange: {
        0: {
          cssVar: "var(--cds-orange-0)",
          value: "#ffffff",
          __name: "orange-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-orange-10)",
          value: "#fefbfa",
          __name: "orange-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-orange-20)",
          value: "#fdf7f5",
          __name: "orange-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-orange-30)",
          value: "#fcf4f0",
          __name: "orange-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-orange-40)",
          value: "#faf0ec",
          __name: "orange-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-orange-50)",
          value: "#f9ece7",
          __name: "orange-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-orange-60)",
          value: "#f8e9e2",
          __name: "orange-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-orange-70)",
          value: "#f7e5dd",
          __name: "orange-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-orange-80)",
          value: "#f7e1d7",
          __name: "orange-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-orange-90)",
          value: "#f7dcd1",
          __name: "orange-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-orange-100)",
          value: "#f7d8cb",
          __name: "orange-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-orange-150)",
          value: "#f3c5b2",
          __name: "orange-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-orange-200)",
          value: "#f4ae94",
          __name: "orange-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-orange-250)",
          value: "#f09978",
          __name: "orange-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-orange-300)",
          value: "#ec835a",
          __name: "orange-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-orange-350)",
          value: "#eb6834",
          __name: "orange-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-orange-400)",
          value: "#d95926",
          __name: "orange-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-orange-450)",
          value: "#c25124",
          __name: "orange-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-orange-500)",
          value: "#ae461c",
          __name: "orange-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-orange-550)",
          value: "#993d19",
          __name: "orange-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-orange-600)",
          value: "#863311",
          __name: "orange-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-orange-650)",
          value: "#712b0f",
          __name: "orange-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-orange-700)",
          value: "#5d230b",
          __name: "orange-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-orange-750)",
          value: "#4b1b08",
          __name: "orange-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-orange-800)",
          value: "#371407",
          __name: "orange-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-orange-810)",
          value: "#341307",
          __name: "orange-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-orange-820)",
          value: "#301106",
          __name: "orange-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-orange-830)",
          value: "#2d1006",
          __name: "orange-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-orange-840)",
          value: "#290f06",
          __name: "orange-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-orange-850)",
          value: "#240e07",
          __name: "orange-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-orange-860)",
          value: "#1f0e08",
          __name: "orange-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-orange-870)",
          value: "#1a0e09",
          __name: "orange-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-orange-880)",
          value: "#150d0a",
          __name: "orange-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-orange-890)",
          value: "#100c0b",
          __name: "orange-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-orange-900)",
          value: "#0b0b0b",
          __name: "orange-900",
          type: "color",
        },
      },
      yellow: {
        0: {
          cssVar: "var(--cds-yellow-0)",
          value: "#ffffff",
          __name: "yellow-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-yellow-10)",
          value: "#fefcf8",
          __name: "yellow-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-yellow-20)",
          value: "#fcf8f1",
          __name: "yellow-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-yellow-30)",
          value: "#fbf5ea",
          __name: "yellow-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-yellow-40)",
          value: "#f9f2e4",
          __name: "yellow-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-yellow-50)",
          value: "#f9eeda",
          __name: "yellow-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-yellow-60)",
          value: "#faebce",
          __name: "yellow-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-yellow-70)",
          value: "#fae7c2",
          __name: "yellow-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-yellow-80)",
          value: "#fae3b8",
          __name: "yellow-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-yellow-90)",
          value: "#f9e0b0",
          __name: "yellow-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-yellow-100)",
          value: "#f9dca4",
          __name: "yellow-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-yellow-150)",
          value: "#f9c868",
          __name: "yellow-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-yellow-200)",
          value: "#fab219",
          __name: "yellow-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-yellow-250)",
          value: "#eda100",
          __name: "yellow-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-yellow-300)",
          value: "#db9300",
          __name: "yellow-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-yellow-350)",
          value: "#c98500",
          __name: "yellow-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-yellow-400)",
          value: "#b77700",
          __name: "yellow-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-yellow-450)",
          value: "#a66a00",
          __name: "yellow-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-yellow-500)",
          value: "#945d00",
          __name: "yellow-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-yellow-550)",
          value: "#835100",
          __name: "yellow-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-yellow-600)",
          value: "#734500",
          __name: "yellow-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-yellow-650)",
          value: "#623900",
          __name: "yellow-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-yellow-700)",
          value: "#512e00",
          __name: "yellow-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-yellow-750)",
          value: "#412400",
          __name: "yellow-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-yellow-800)",
          value: "#311a00",
          __name: "yellow-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-yellow-810)",
          value: "#2e1800",
          __name: "yellow-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-yellow-820)",
          value: "#2b1700",
          __name: "yellow-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-yellow-830)",
          value: "#271500",
          __name: "yellow-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-yellow-840)",
          value: "#231402",
          __name: "yellow-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-yellow-850)",
          value: "#1f1204",
          __name: "yellow-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-yellow-860)",
          value: "#1b1106",
          __name: "yellow-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-yellow-870)",
          value: "#171007",
          __name: "yellow-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-yellow-880)",
          value: "#130e09",
          __name: "yellow-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-yellow-890)",
          value: "#0f0d0a",
          __name: "yellow-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-yellow-900)",
          value: "#0b0b0b",
          __name: "yellow-900",
          type: "color",
        },
      },
      green: {
        0: {
          cssVar: "var(--cds-green-0)",
          value: "#ffffff",
          __name: "green-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-green-10)",
          value: "#fafdfa",
          __name: "green-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-green-20)",
          value: "#f5fbf4",
          __name: "green-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-green-30)",
          value: "#f0f9ef",
          __name: "green-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-green-40)",
          value: "#ebf7e9",
          __name: "green-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-green-50)",
          value: "#e5f4e4",
          __name: "green-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-green-60)",
          value: "#e0f2de",
          __name: "green-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-green-70)",
          value: "#dbf0d8",
          __name: "green-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-green-80)",
          value: "#d5eed3",
          __name: "green-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-green-90)",
          value: "#d0eccd",
          __name: "green-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-green-100)",
          value: "#caeac7",
          __name: "green-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-green-150)",
          value: "#aee0a9",
          __name: "green-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-green-200)",
          value: "#91d68b",
          __name: "green-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-green-250)",
          value: "#73cb6d",
          __name: "green-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-green-300)",
          value: "#55bf50",
          __name: "green-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-green-350)",
          value: "#35b231",
          __name: "green-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-green-400)",
          value: "#0ca30c",
          __name: "green-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-green-450)",
          value: "#009300",
          __name: "green-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-green-500)",
          value: "#008300",
          __name: "green-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-green-550)",
          value: "#007300",
          __name: "green-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-green-600)",
          value: "#006300",
          __name: "green-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-green-650)",
          value: "#005400",
          __name: "green-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-green-700)",
          value: "#074506",
          __name: "green-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-green-750)",
          value: "#0f350d",
          __name: "green-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-green-800)",
          value: "#11260f",
          __name: "green-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-green-810)",
          value: "#10230f",
          __name: "green-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-green-820)",
          value: "#10210f",
          __name: "green-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-green-830)",
          value: "#101e0f",
          __name: "green-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-green-840)",
          value: "#101b0f",
          __name: "green-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-green-850)",
          value: "#0f180e",
          __name: "green-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-green-860)",
          value: "#0e160e",
          __name: "green-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-green-870)",
          value: "#0e130d",
          __name: "green-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-green-880)",
          value: "#0d100d",
          __name: "green-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-green-890)",
          value: "#0c0e0c",
          __name: "green-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-green-900)",
          value: "#0b0b0b",
          __name: "green-900",
          type: "color",
        },
      },
      aqua: {
        0: {
          cssVar: "var(--cds-aqua-0)",
          value: "#ffffff",
          __name: "aqua-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-aqua-10)",
          value: "#f9fdfb",
          __name: "aqua-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-aqua-20)",
          value: "#f3fbf8",
          __name: "aqua-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-aqua-30)",
          value: "#edf9f4",
          __name: "aqua-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-aqua-40)",
          value: "#e8f7f1",
          __name: "aqua-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-aqua-50)",
          value: "#e2f4ed",
          __name: "aqua-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-aqua-60)",
          value: "#dcf2ea",
          __name: "aqua-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-aqua-70)",
          value: "#d5f0e6",
          __name: "aqua-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-aqua-80)",
          value: "#ceefe2",
          __name: "aqua-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-aqua-90)",
          value: "#c7eddf",
          __name: "aqua-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-aqua-100)",
          value: "#bfebdb",
          __name: "aqua-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-aqua-150)",
          value: "#a0e1c9",
          __name: "aqua-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-aqua-200)",
          value: "#7ad7b4",
          __name: "aqua-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-aqua-250)",
          value: "#5acba0",
          __name: "aqua-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-aqua-300)",
          value: "#3bbd8c",
          __name: "aqua-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-aqua-350)",
          value: "#1baf7a",
          __name: "aqua-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-aqua-400)",
          value: "#199e70",
          __name: "aqua-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-aqua-450)",
          value: "#138e65",
          __name: "aqua-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-aqua-500)",
          value: "#0f7e5c",
          __name: "aqua-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-aqua-550)",
          value: "#0e6e53",
          __name: "aqua-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-aqua-600)",
          value: "#065f49",
          __name: "aqua-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-aqua-650)",
          value: "#095040",
          __name: "aqua-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-aqua-700)",
          value: "#034235",
          __name: "aqua-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-aqua-750)",
          value: "#02342b",
          __name: "aqua-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-aqua-800)",
          value: "#022720",
          __name: "aqua-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-aqua-810)",
          value: "#02241e",
          __name: "aqua-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-aqua-820)",
          value: "#02221c",
          __name: "aqua-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-aqua-830)",
          value: "#021f1a",
          __name: "aqua-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-aqua-840)",
          value: "#031c18",
          __name: "aqua-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-aqua-850)",
          value: "#051a16",
          __name: "aqua-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-aqua-860)",
          value: "#071713",
          __name: "aqua-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-aqua-870)",
          value: "#081411",
          __name: "aqua-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-aqua-880)",
          value: "#0a110f",
          __name: "aqua-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-aqua-890)",
          value: "#0b0e0d",
          __name: "aqua-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-aqua-900)",
          value: "#0b0b0b",
          __name: "aqua-900",
          type: "color",
        },
      },
      blue: {
        0: {
          cssVar: "var(--cds-blue-0)",
          value: "#ffffff",
          __name: "blue-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-blue-10)",
          value: "#fafcff",
          __name: "blue-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-blue-20)",
          value: "#f5f9fe",
          __name: "blue-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-blue-30)",
          value: "#f0f7fe",
          __name: "blue-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-blue-40)",
          value: "#ebf4fc",
          __name: "blue-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-blue-50)",
          value: "#e7f1fb",
          __name: "blue-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-blue-60)",
          value: "#e2eefa",
          __name: "blue-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-blue-70)",
          value: "#ddebfa",
          __name: "blue-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-blue-80)",
          value: "#d7e8fa",
          __name: "blue-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-blue-90)",
          value: "#d2e5fa",
          __name: "blue-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-blue-100)",
          value: "#cde2fb",
          __name: "blue-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-blue-150)",
          value: "#b7d3f6",
          __name: "blue-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-blue-200)",
          value: "#9ec5f4",
          __name: "blue-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-blue-250)",
          value: "#86b6ef",
          __name: "blue-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-blue-300)",
          value: "#6da7ec",
          __name: "blue-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-blue-350)",
          value: "#5598e7",
          __name: "blue-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-blue-400)",
          value: "#3987e5",
          __name: "blue-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-blue-450)",
          value: "#2a78d6",
          __name: "blue-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-blue-500)",
          value: "#256abf",
          __name: "blue-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-blue-550)",
          value: "#1c5cab",
          __name: "blue-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-blue-600)",
          value: "#184f95",
          __name: "blue-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-blue-650)",
          value: "#104281",
          __name: "blue-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-blue-700)",
          value: "#0d366b",
          __name: "blue-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-blue-750)",
          value: "#062b57",
          __name: "blue-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-blue-800)",
          value: "#032042",
          __name: "blue-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-blue-810)",
          value: "#031e3d",
          __name: "blue-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-blue-820)",
          value: "#021c39",
          __name: "blue-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-blue-830)",
          value: "#021a36",
          __name: "blue-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-blue-840)",
          value: "#021831",
          __name: "blue-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-blue-850)",
          value: "#03162c",
          __name: "blue-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-blue-860)",
          value: "#051426",
          __name: "blue-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-blue-870)",
          value: "#07121f",
          __name: "blue-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-blue-880)",
          value: "#091018",
          __name: "blue-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-blue-890)",
          value: "#0a0d11",
          __name: "blue-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-blue-900)",
          value: "#0b0b0b",
          __name: "blue-900",
          type: "color",
        },
      },
      violet: {
        0: {
          cssVar: "var(--cds-violet-0)",
          value: "#ffffff",
          __name: "violet-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-violet-10)",
          value: "#fcfbff",
          __name: "violet-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-violet-20)",
          value: "#f8f8ff",
          __name: "violet-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-violet-30)",
          value: "#f5f4ff",
          __name: "violet-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-violet-40)",
          value: "#f2f1ff",
          __name: "violet-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-violet-50)",
          value: "#efedff",
          __name: "violet-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-violet-60)",
          value: "#ebeafe",
          __name: "violet-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-violet-70)",
          value: "#e8e6fe",
          __name: "violet-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-violet-80)",
          value: "#e5e2fd",
          __name: "violet-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-violet-90)",
          value: "#e2dffd",
          __name: "violet-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-violet-100)",
          value: "#dfdbfd",
          __name: "violet-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-violet-150)",
          value: "#cfcafb",
          __name: "violet-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-violet-200)",
          value: "#bfb9f5",
          __name: "violet-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-violet-250)",
          value: "#b0a7f2",
          __name: "violet-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-violet-300)",
          value: "#a096eb",
          __name: "violet-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-violet-350)",
          value: "#9085e9",
          __name: "violet-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-violet-400)",
          value: "#8173e3",
          __name: "violet-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-violet-450)",
          value: "#7161e0",
          __name: "violet-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-violet-500)",
          value: "#6250d6",
          __name: "violet-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-violet-550)",
          value: "#5645be",
          __name: "violet-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-violet-600)",
          value: "#4a3aa7",
          __name: "violet-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-violet-650)",
          value: "#3e318e",
          __name: "violet-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-violet-700)",
          value: "#322777",
          __name: "violet-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-violet-750)",
          value: "#271e60",
          __name: "violet-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-violet-800)",
          value: "#1d1649",
          __name: "violet-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-violet-810)",
          value: "#1b1544",
          __name: "violet-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-violet-820)",
          value: "#19133f",
          __name: "violet-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-violet-830)",
          value: "#17123b",
          __name: "violet-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-violet-840)",
          value: "#151036",
          __name: "violet-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-violet-850)",
          value: "#130f32",
          __name: "violet-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-violet-860)",
          value: "#110e2b",
          __name: "violet-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-violet-870)",
          value: "#0f0e23",
          __name: "violet-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-violet-880)",
          value: "#0e0d1b",
          __name: "violet-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-violet-890)",
          value: "#0c0c13",
          __name: "violet-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-violet-900)",
          value: "#0b0b0b",
          __name: "violet-900",
          type: "color",
        },
      },
      magenta: {
        0: {
          cssVar: "var(--cds-magenta-0)",
          value: "#ffffff",
          __name: "magenta-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-magenta-10)",
          value: "#fefbfc",
          __name: "magenta-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-magenta-20)",
          value: "#fef6f9",
          __name: "magenta-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-magenta-30)",
          value: "#fdf2f6",
          __name: "magenta-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-magenta-40)",
          value: "#fbeff3",
          __name: "magenta-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-magenta-50)",
          value: "#faebf0",
          __name: "magenta-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-magenta-60)",
          value: "#f9e6ed",
          __name: "magenta-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-magenta-70)",
          value: "#f9e2eb",
          __name: "magenta-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-magenta-80)",
          value: "#f9dee8",
          __name: "magenta-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-magenta-90)",
          value: "#f9d9e5",
          __name: "magenta-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-magenta-100)",
          value: "#f9d4e2",
          __name: "magenta-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-magenta-150)",
          value: "#f3c0d3",
          __name: "magenta-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-magenta-200)",
          value: "#f3a8c3",
          __name: "magenta-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-magenta-250)",
          value: "#ed93b4",
          __name: "magenta-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-magenta-300)",
          value: "#e87ba4",
          __name: "magenta-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-magenta-350)",
          value: "#e46191",
          __name: "magenta-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-magenta-400)",
          value: "#d55181",
          __name: "magenta-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-magenta-450)",
          value: "#c04873",
          __name: "magenta-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-magenta-500)",
          value: "#ad3d66",
          __name: "magenta-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-magenta-550)",
          value: "#993458",
          __name: "magenta-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-magenta-600)",
          value: "#862a4c",
          __name: "magenta-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-magenta-650)",
          value: "#722340",
          __name: "magenta-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-magenta-700)",
          value: "#5e1c34",
          __name: "magenta-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-magenta-750)",
          value: "#4c1429",
          __name: "magenta-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-magenta-800)",
          value: "#390f1f",
          __name: "magenta-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-magenta-810)",
          value: "#360d1c",
          __name: "magenta-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-magenta-820)",
          value: "#320c1a",
          __name: "magenta-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-magenta-830)",
          value: "#2f0b18",
          __name: "magenta-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-magenta-840)",
          value: "#2b0a16",
          __name: "magenta-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-magenta-850)",
          value: "#270a14",
          __name: "magenta-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-magenta-860)",
          value: "#220a12",
          __name: "magenta-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-magenta-870)",
          value: "#1c0b11",
          __name: "magenta-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-magenta-880)",
          value: "#170b0f",
          __name: "magenta-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-magenta-890)",
          value: "#110b0d",
          __name: "magenta-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-magenta-900)",
          value: "#0b0b0b",
          __name: "magenta-900",
          type: "color",
        },
      },
      pictogram: {
        highlight: {
          default: {
            cssVar: "var(--cds-pictogram-highlight-default)",
            value: "#e7e6e1",
            modes: { dark: "#454442" },
            __name: "pictogram-highlight-default",
            type: "color",
          },
          heather: {
            cssVar: "var(--cds-pictogram-highlight-heather)",
            value: "#cbcadb",
            modes: { dark: "#827dbd" },
            __name: "pictogram-highlight-heather",
            type: "color",
          },
          cactus: {
            cssVar: "var(--cds-pictogram-highlight-cactus)",
            value: "#bcd1ca",
            modes: { dark: "#629987" },
            __name: "pictogram-highlight-cactus",
            type: "color",
          },
        },
      },
      cursor: {
        interactive: {
          cssVar: "var(--cds-cursor-interactive)",
          value: "pointer",
          __name: "cursor-interactive",
          type: "cursor",
        },
      },
      neutral: {
        0: {
          cssVar: "var(--cds-neutral-0)",
          value: "#ffffff",
          modes: { dark: "#0b0b0b" },
          __name: "neutral-0",
          type: "color",
        },
        10: {
          cssVar: "var(--cds-neutral-10)",
          value: "#fcfcfb",
          modes: { dark: "#0d0d0d" },
          __name: "neutral-10",
          type: "color",
        },
        20: {
          cssVar: "var(--cds-neutral-20)",
          value: "#f9f9f7",
          modes: { dark: "#0f0f0f" },
          __name: "neutral-20",
          type: "color",
        },
        30: {
          cssVar: "var(--cds-neutral-30)",
          value: "#f6f6f4",
          modes: { dark: "#111111" },
          __name: "neutral-30",
          type: "color",
        },
        40: {
          cssVar: "var(--cds-neutral-40)",
          value: "#f3f3f0",
          modes: { dark: "#131313" },
          __name: "neutral-40",
          type: "color",
        },
        50: {
          cssVar: "var(--cds-neutral-50)",
          value: "#f0efec",
          modes: { dark: "#151515" },
          __name: "neutral-50",
          type: "color",
        },
        60: {
          cssVar: "var(--cds-neutral-60)",
          value: "#edece8",
          modes: { dark: "#181817" },
          __name: "neutral-60",
          type: "color",
        },
        70: {
          cssVar: "var(--cds-neutral-70)",
          value: "#eae9e4",
          modes: { dark: "#1a1a19" },
          __name: "neutral-70",
          type: "color",
        },
        80: {
          cssVar: "var(--cds-neutral-80)",
          value: "#e7e6e1",
          modes: { dark: "#1c1c1b" },
          __name: "neutral-80",
          type: "color",
        },
        90: {
          cssVar: "var(--cds-neutral-90)",
          value: "#e4e3dd",
          modes: { dark: "#1e1e1d" },
          __name: "neutral-90",
          type: "color",
        },
        100: {
          cssVar: "var(--cds-neutral-100)",
          value: "#e1e0d9",
          modes: { dark: "#20201f" },
          __name: "neutral-100",
          type: "color",
        },
        150: {
          cssVar: "var(--cds-neutral-150)",
          value: "#d2d1c7",
          modes: { dark: "#2c2c2a" },
          __name: "neutral-150",
          type: "color",
        },
        200: {
          cssVar: "var(--cds-neutral-200)",
          value: "#c3c2b7",
          modes: { dark: "#383835" },
          __name: "neutral-200",
          type: "color",
        },
        250: {
          cssVar: "var(--cds-neutral-250)",
          value: "#b4b3a8",
          modes: { dark: "#454442" },
          __name: "neutral-250",
          type: "color",
        },
        300: {
          cssVar: "var(--cds-neutral-300)",
          value: "#a5a49a",
          modes: { dark: "#52514e" },
          __name: "neutral-300",
          type: "color",
        },
        350: {
          cssVar: "var(--cds-neutral-350)",
          value: "#97958d",
          modes: { dark: "#5f5e5a" },
          __name: "neutral-350",
          type: "color",
        },
        400: {
          cssVar: "var(--cds-neutral-400)",
          value: "#898781",
          modes: { dark: "#6d6b67" },
          __name: "neutral-400",
          type: "color",
        },
        450: {
          cssVar: "var(--cds-neutral-450)",
          value: "#7b7974",
          __name: "neutral-450",
          type: "color",
        },
        500: {
          cssVar: "var(--cds-neutral-500)",
          value: "#6d6b67",
          modes: { dark: "#898781" },
          __name: "neutral-500",
          type: "color",
        },
        550: {
          cssVar: "var(--cds-neutral-550)",
          value: "#5f5e5a",
          modes: { dark: "#97958d" },
          __name: "neutral-550",
          type: "color",
        },
        600: {
          cssVar: "var(--cds-neutral-600)",
          value: "#52514e",
          modes: { dark: "#a5a49a" },
          __name: "neutral-600",
          type: "color",
        },
        650: {
          cssVar: "var(--cds-neutral-650)",
          value: "#454442",
          modes: { dark: "#b4b3a8" },
          __name: "neutral-650",
          type: "color",
        },
        700: {
          cssVar: "var(--cds-neutral-700)",
          value: "#383835",
          modes: { dark: "#c3c2b7" },
          __name: "neutral-700",
          type: "color",
        },
        750: {
          cssVar: "var(--cds-neutral-750)",
          value: "#2c2c2a",
          modes: { dark: "#d2d1c7" },
          __name: "neutral-750",
          type: "color",
        },
        800: {
          cssVar: "var(--cds-neutral-800)",
          value: "#20201f",
          modes: { dark: "#e1e0d9" },
          __name: "neutral-800",
          type: "color",
        },
        810: {
          cssVar: "var(--cds-neutral-810)",
          value: "#1e1e1d",
          modes: { dark: "#e4e3dd" },
          __name: "neutral-810",
          type: "color",
        },
        820: {
          cssVar: "var(--cds-neutral-820)",
          value: "#1c1c1b",
          modes: { dark: "#e7e6e1" },
          __name: "neutral-820",
          type: "color",
        },
        830: {
          cssVar: "var(--cds-neutral-830)",
          value: "#1a1a19",
          modes: { dark: "#eae9e4" },
          __name: "neutral-830",
          type: "color",
        },
        840: {
          cssVar: "var(--cds-neutral-840)",
          value: "#181817",
          modes: { dark: "#edece8" },
          __name: "neutral-840",
          type: "color",
        },
        850: {
          cssVar: "var(--cds-neutral-850)",
          value: "#151515",
          modes: { dark: "#f0efec" },
          __name: "neutral-850",
          type: "color",
        },
        860: {
          cssVar: "var(--cds-neutral-860)",
          value: "#131313",
          modes: { dark: "#f3f3f0" },
          __name: "neutral-860",
          type: "color",
        },
        870: {
          cssVar: "var(--cds-neutral-870)",
          value: "#111111",
          modes: { dark: "#f6f6f4" },
          __name: "neutral-870",
          type: "color",
        },
        880: {
          cssVar: "var(--cds-neutral-880)",
          value: "#0f0f0f",
          modes: { dark: "#f9f9f7" },
          __name: "neutral-880",
          type: "color",
        },
        890: {
          cssVar: "var(--cds-neutral-890)",
          value: "#0d0d0d",
          modes: { dark: "#fcfcfb" },
          __name: "neutral-890",
          type: "color",
        },
        900: {
          cssVar: "var(--cds-neutral-900)",
          value: "#0b0b0b",
          modes: { dark: "#ffffff" },
          __name: "neutral-900",
          type: "color",
        },
      },
      alpha: {
        0: {
          cssVar: "var(--cds-alpha-0)",
          value: "rgba(11, 11, 11, 0)",
          modes: { dark: "rgba(255, 255, 255, 0)" },
          __name: "alpha-0",
          type: "color",
        },
        1: {
          cssVar: "var(--cds-alpha-1)",
          value: "rgba(11, 11, 11, 0.05)",
          modes: { dark: "rgba(255, 255, 255, 0.05)" },
          __name: "alpha-1",
          type: "color",
        },
        2: {
          cssVar: "var(--cds-alpha-2)",
          value: "rgba(11, 11, 11, 0.1)",
          modes: { dark: "rgba(255, 255, 255, 0.1)" },
          __name: "alpha-2",
          type: "color",
        },
        3: {
          cssVar: "var(--cds-alpha-3)",
          value: "rgba(11, 11, 11, 0.2)",
          modes: { dark: "rgba(255, 255, 255, 0.2)" },
          __name: "alpha-3",
          type: "color",
        },
        4: {
          cssVar: "var(--cds-alpha-4)",
          value: "rgba(11, 11, 11, 0.35)",
          modes: { dark: "rgba(255, 255, 255, 0.35)" },
          __name: "alpha-4",
          type: "color",
        },
        5: {
          cssVar: "var(--cds-alpha-5)",
          value: "rgba(11, 11, 11, 0.5)",
          modes: { dark: "rgba(255, 255, 255, 0.5)" },
          __name: "alpha-5",
          type: "color",
        },
        6: {
          cssVar: "var(--cds-alpha-6)",
          value: "rgba(11, 11, 11, 0.6)",
          modes: { dark: "rgba(255, 255, 255, 0.6)" },
          __name: "alpha-6",
          type: "color",
        },
        7: {
          cssVar: "var(--cds-alpha-7)",
          value: "rgba(11, 11, 11, 0.7)",
          modes: { dark: "rgba(255, 255, 255, 0.7)" },
          __name: "alpha-7",
          type: "color",
        },
        8: {
          cssVar: "var(--cds-alpha-8)",
          value: "rgba(11, 11, 11, 0.85)",
          modes: { dark: "rgba(255, 255, 255, 0.85)" },
          __name: "alpha-8",
          type: "color",
        },
        9: {
          cssVar: "var(--cds-alpha-9)",
          value: "rgba(11, 11, 11, 0.95)",
          modes: { dark: "rgba(255, 255, 255, 0.95)" },
          __name: "alpha-9",
          type: "color",
        },
      },
      surface: {
        0: {
          cssVar: "var(--cds-surface-0)",
          value: "#f9f9f7",
          modes: { dark: "#0b0b0b" },
          __name: "surface-0",
          type: "color",
        },
        1: {
          cssVar: "var(--cds-surface-1)",
          value: "#fcfcfb",
          modes: { dark: "#151515" },
          __name: "surface-1",
          type: "color",
        },
        2: {
          cssVar: "var(--cds-surface-2)",
          value: "#ffffff",
          modes: { dark: "#1a1a19" },
          __name: "surface-2",
          type: "color",
        },
        3: {
          cssVar: "var(--cds-surface-3)",
          value: "#ffffff",
          modes: { dark: "#20201f" },
          __name: "surface-3",
          type: "color",
        },
        popover: {
          cssVar: "var(--cds-surface-popover)",
          value: "var(--cds-surface-3)",
          __name: "surface-popover",
          type: "color",
        },
        panel: {
          cssVar: "var(--cds-surface-panel)",
          value: "var(--cds-surface-2)",
          __name: "surface-panel",
          type: "color",
        },
      },
      page: {
        bg: {
          cssVar: "var(--cds-page-bg)",
          value: "#f9f9f7",
          modes: { dark: "#0b0b0b" },
          __name: "page-bg",
          type: "color",
        },
      },
      fill: {
        accent: {
          cssVar: "var(--cds-fill-accent)",
          value: "#2a78d6",
          __name: "fill-accent",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-accent-hover)",
            value: "#3987e5",
            __name: "fill-accent-hover",
            type: "color",
          },
        },
        danger: {
          cssVar: "var(--cds-fill-danger)",
          value: "#d03b3b",
          __name: "fill-danger",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-danger-hover)",
            value: "#e34948",
            __name: "fill-danger-hover",
            type: "color",
          },
        },
        success: {
          cssVar: "var(--cds-fill-success)",
          value: "#009300",
          __name: "fill-success",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-success-hover)",
            value: "#0ca30c",
            __name: "fill-success-hover",
            type: "color",
          },
        },
        warning: {
          cssVar: "var(--cds-fill-warning)",
          value: "#fab219",
          __name: "fill-warning",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-warning-hover)",
            value: "#eda100",
            __name: "fill-warning-hover",
            type: "color",
          },
        },
        pro: {
          cssVar: "var(--cds-fill-pro)",
          value: "#7161e0",
          __name: "fill-pro",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-pro-hover)",
            value: "#8173e3",
            __name: "fill-pro-hover",
            type: "color",
          },
        },
        git: {
          added: {
            cssVar: "var(--cds-fill-git-added)",
            value: "#1a8633",
            modes: { dark: "#32d74b" },
            __name: "fill-git-added",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-added-hover)",
              value: "#1e9b3b",
              modes: { dark: "#27c840" },
              __name: "fill-git-added-hover",
              type: "color",
            },
          },
          removed: {
            cssVar: "var(--cds-fill-git-removed)",
            value: "#cd2054",
            modes: { dark: "#ff2c56" },
            __name: "fill-git-removed",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-removed-hover)",
              value: "#de295f",
              modes: { dark: "#ff1342" },
              __name: "fill-git-removed-hover",
              type: "color",
            },
          },
          modified: {
            cssVar: "var(--cds-fill-git-modified)",
            value: "#8b751c",
            modes: { dark: "#ffd014" },
            __name: "fill-git-modified",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-modified-hover)",
              value: "#a08720",
              modes: { dark: "#fac800" },
              __name: "fill-git-modified-hover",
              type: "color",
            },
          },
          merged: {
            cssVar: "var(--cds-fill-git-merged)",
            value: "#855fd6",
            modes: { dark: "#b796ff" },
            __name: "fill-git-merged",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-merged-hover)",
              value: "#9473db",
              modes: { dark: "#a67dff" },
              __name: "fill-git-merged-hover",
              type: "color",
            },
          },
          closed: {
            cssVar: "var(--cds-fill-git-closed)",
            value: "#ed0b00",
            modes: { dark: "#ff6159" },
            __name: "fill-git-closed",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-closed-hover)",
              value: "#ff1307",
              modes: { dark: "#ff4940" },
              __name: "fill-git-closed-hover",
              type: "color",
            },
          },
          conflicting: {
            cssVar: "var(--cds-fill-git-conflicting)",
            value: "#b85b19",
            modes: { dark: "#fa832e" },
            __name: "fill-git-conflicting",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-conflicting-hover)",
              value: "#c5621b",
              modes: { dark: "#f97a1f" },
              __name: "fill-git-conflicting-hover",
              type: "color",
            },
          },
          draft: {
            cssVar: "var(--cds-fill-git-draft)",
            value: "#737373",
            modes: { dark: "#a6a6a6" },
            __name: "fill-git-draft",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-draft-hover)",
              value: "#808080",
              modes: { dark: "#999999" },
              __name: "fill-git-draft-hover",
              type: "color",
            },
          },
          opened: {
            cssVar: "var(--cds-fill-git-opened)",
            value: "#1a8633",
            modes: { dark: "#32d74b" },
            __name: "fill-git-opened",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-opened-hover)",
              value: "#1e9b3b",
              modes: { dark: "#27c840" },
              __name: "fill-git-opened-hover",
              type: "color",
            },
          },
          queued: {
            cssVar: "var(--cds-fill-git-queued)",
            value: "#8b751c",
            modes: { dark: "#ffd014" },
            __name: "fill-git-queued",
            type: "color",
            hover: {
              cssVar: "var(--cds-fill-git-queued-hover)",
              value: "#a08720",
              modes: { dark: "#fac800" },
              __name: "fill-git-queued-hover",
              type: "color",
            },
          },
        },
        brand: {
          cssVar: "var(--cds-fill-brand)",
          value: "#c6613f",
          __name: "fill-brand",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-brand-hover)",
            value: "#d97757",
            __name: "fill-brand-hover",
            type: "color",
          },
        },
        primary: {
          cssVar: "var(--cds-fill-primary)",
          value: "#0b0b0b",
          modes: { dark: "#ffffff" },
          __name: "fill-primary",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-primary-hover)",
            value: "#2c2c2a",
            modes: { dark: "#e1e0d9" },
            __name: "fill-primary-hover",
            type: "color",
          },
        },
        secondary: {
          cssVar: "var(--cds-fill-secondary)",
          value: "hsl(0 0% 100% / 0.1)",
          modes: { dark: "rgba(255, 255, 255, 0.1)" },
          __name: "fill-secondary",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-secondary-hover)",
            value: "rgba(11, 11, 11, 0.05)",
            modes: { dark: "rgba(255, 255, 255, 0.14)" },
            __name: "fill-secondary-hover",
            type: "color",
          },
          ring: {
            cssVar: "var(--cds-fill-secondary-ring)",
            value: "rgba(11, 11, 11, 0.1)",
            modes: { dark: "transparent" },
            __name: "fill-secondary-ring",
            type: "color",
          },
          pressed: {
            ring: {
              cssVar: "var(--cds-fill-secondary-pressed-ring)",
              value: "rgba(11, 11, 11, 0.1)",
              modes: { dark: "rgba(255, 255, 255, 0.1)" },
              __name: "fill-secondary-pressed-ring",
              type: "color",
            },
          },
        },
        field: {
          cssVar: "var(--cds-fill-field)",
          value: "hsl(0 0% 100% / 0.5)",
          modes: { dark: "rgba(255, 255, 255, 0.05)" },
          __name: "fill-field",
          type: "color",
          ring: {
            cssVar: "var(--cds-fill-field-ring)",
            value: "rgba(11, 11, 11, 0.1)",
            modes: { dark: "rgba(255, 255, 255, 0.1)" },
            __name: "fill-field-ring",
            type: "color",
          },
        },
        ghost: {
          hover: {
            cssVar: "var(--cds-fill-ghost-hover)",
            value: "rgba(11, 11, 11, 0.05)",
            modes: { dark: "rgba(255, 255, 255, 0.075)" },
            __name: "fill-ghost-hover",
            type: "color",
          },
          selected: {
            cssVar: "var(--cds-fill-ghost-selected)",
            value: "rgba(11, 11, 11, 0.1)",
            modes: { dark: "rgba(255, 255, 255, 0.15)" },
            __name: "fill-ghost-selected",
            type: "color",
          },
        },
        disabled: {
          cssVar: "var(--cds-fill-disabled)",
          value: "rgba(11, 11, 11, 0.05)",
          modes: { dark: "rgba(255, 255, 255, 0.05)" },
          __name: "fill-disabled",
          type: "color",
        },
        control: {
          cssVar: "var(--cds-fill-control)",
          value: "rgba(11, 11, 11, 0.1)",
          modes: { dark: "rgba(255, 255, 255, 0.1)" },
          __name: "fill-control",
          type: "color",
          hover: {
            cssVar: "var(--cds-fill-control-hover)",
            value: "rgba(11, 11, 11, 0.2)",
            modes: { dark: "rgba(255, 255, 255, 0.2)" },
            __name: "fill-control-hover",
            type: "color",
          },
        },
      },
      bg: {
        accent: {
          cssVar: "var(--cds-bg-accent)",
          value: "#cde2fb",
          modes: { dark: "#032042" },
          __name: "bg-accent",
          type: "color",
          chip: {
            cssVar: "var(--cds-bg-accent-chip)",
            value: "#cde2fb",
            modes: { dark: "#032042" },
            __name: "bg-accent-chip",
            type: "color",
          },
          muted: {
            cssVar: "var(--cds-bg-accent-muted)",
            value: "color-mix(in srgb, #2a78d6 10%, transparent)",
            __name: "bg-accent-muted",
            type: "color",
          },
        },
        danger: {
          cssVar: "var(--cds-bg-danger)",
          value: "#fad6d6",
          modes: { dark: "#3c0e0e" },
          __name: "bg-danger",
          type: "color",
          chip: {
            cssVar: "var(--cds-bg-danger-chip)",
            value: "#fad6d6",
            modes: { dark: "#3c0e0e" },
            __name: "bg-danger-chip",
            type: "color",
          },
        },
        success: {
          cssVar: "var(--cds-bg-success)",
          value: "#caeac7",
          modes: { dark: "#11260f" },
          __name: "bg-success",
          type: "color",
          chip: {
            cssVar: "var(--cds-bg-success-chip)",
            value: "#caeac7",
            modes: { dark: "#11260f" },
            __name: "bg-success-chip",
            type: "color",
          },
        },
        warning: {
          cssVar: "var(--cds-bg-warning)",
          value: "#f9dca4",
          modes: { dark: "#311a00" },
          __name: "bg-warning",
          type: "color",
          chip: {
            cssVar: "var(--cds-bg-warning-chip)",
            value: "#f9dca4",
            modes: { dark: "#311a00" },
            __name: "bg-warning-chip",
            type: "color",
          },
        },
        pro: {
          cssVar: "var(--cds-bg-pro)",
          value: "#dfdbfd",
          modes: { dark: "#1d1649" },
          __name: "bg-pro",
          type: "color",
          chip: {
            cssVar: "var(--cds-bg-pro-chip)",
            value: "#dfdbfd",
            modes: { dark: "#1d1649" },
            __name: "bg-pro-chip",
            type: "color",
          },
        },
        tint: {
          red: {
            cssVar: "var(--cds-bg-tint-red)",
            value: "rgba(246, 143, 145, 0.35)",
            modes: { dark: "rgba(73, 12, 12, 0.75)" },
            __name: "bg-tint-red",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-red-opaque)",
              value: "#fad6d6",
              modes: { dark: "#3c0e0e" },
              __name: "bg-tint-red-opaque",
              type: "color",
            },
          },
          orange: {
            cssVar: "var(--cds-bg-tint-orange)",
            value: "rgba(238, 149, 114, 0.35)",
            modes: { dark: "rgba(66, 20, 2, 0.75)" },
            __name: "bg-tint-orange",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-orange-opaque)",
              value: "#f7d8cb",
              modes: { dark: "#371407" },
              __name: "bg-tint-orange-opaque",
              type: "color",
            },
          },
          yellow: {
            cssVar: "var(--cds-bg-tint-yellow)",
            value: "rgba(243, 161, 2, 0.35)",
            modes: { dark: "rgba(58, 28, 0, 0.75)" },
            __name: "bg-tint-yellow",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-yellow-opaque)",
              value: "#f9dca4",
              modes: { dark: "#311a00" },
              __name: "bg-tint-yellow-opaque",
              type: "color",
            },
          },
          green: {
            cssVar: "var(--cds-bg-tint-green)",
            value: "rgba(109, 201, 102, 0.35)",
            modes: { dark: "rgba(16, 44, 13, 0.75)" },
            __name: "bg-tint-green",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-green-opaque)",
              value: "#caeac7",
              modes: { dark: "#11260f" },
              __name: "bg-tint-green-opaque",
              type: "color",
            },
          },
          aqua: {
            cssVar: "var(--cds-bg-tint-aqua)",
            value: "rgba(78, 203, 160, 0.35)",
            modes: { dark: "rgba(0, 45, 36, 0.75)" },
            __name: "bg-tint-aqua",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-aqua-opaque)",
              value: "#bfebdb",
              modes: { dark: "#022720" },
              __name: "bg-tint-aqua-opaque",
              type: "color",
            },
          },
          blue: {
            cssVar: "var(--cds-bg-tint-blue)",
            value: "rgba(118, 178, 251, 0.35)",
            modes: { dark: "rgba(0, 36, 81, 0.75)" },
            __name: "bg-tint-blue",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-blue-opaque)",
              value: "#cde2fb",
              modes: { dark: "#032042" },
              __name: "bg-tint-blue-opaque",
              type: "color",
            },
          },
          violet: {
            cssVar: "var(--cds-bg-tint-violet)",
            value: "rgba(169, 158, 255, 0.35)",
            modes: { dark: "rgba(32, 22, 90, 0.75)" },
            __name: "bg-tint-violet",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-violet-opaque)",
              value: "#dfdbfd",
              modes: { dark: "#1d1649" },
              __name: "bg-tint-violet-opaque",
              type: "color",
            },
          },
          magenta: {
            cssVar: "var(--cds-bg-tint-magenta)",
            value: "rgba(243, 138, 180, 0.35)",
            modes: { dark: "rgba(69, 13, 34, 0.75)" },
            __name: "bg-tint-magenta",
            type: "color",
            opaque: {
              cssVar: "var(--cds-bg-tint-magenta-opaque)",
              value: "#f9d4e2",
              modes: { dark: "#390f1f" },
              __name: "bg-tint-magenta-opaque",
              type: "color",
            },
          },
        },
        git: {
          added: {
            cssVar: "var(--cds-bg-git-added)",
            value: "color-mix(in srgb, #1e9e3c 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #32d74b 20%, transparent)" },
            __name: "bg-git-added",
            type: "color",
          },
          removed: {
            cssVar: "var(--cds-bg-git-removed)",
            value: "color-mix(in srgb, #cd2054 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #ff2c56 20%, transparent)" },
            __name: "bg-git-removed",
            type: "color",
          },
          modified: {
            cssVar: "var(--cds-bg-git-modified)",
            value: "color-mix(in srgb, #98801f 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #ffd014 20%, transparent)" },
            __name: "bg-git-modified",
            type: "color",
          },
          merged: {
            cssVar: "var(--cds-bg-git-merged)",
            value: "color-mix(in srgb, #8e6bd9 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #b796ff 20%, transparent)" },
            __name: "bg-git-merged",
            type: "color",
          },
          closed: {
            cssVar: "var(--cds-bg-git-closed)",
            value: "color-mix(in srgb, #ff3a30 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #ff6159 20%, transparent)" },
            __name: "bg-git-closed",
            type: "color",
          },
          conflicting: {
            cssVar: "var(--cds-bg-git-conflicting)",
            value: "color-mix(in srgb, #c5621b 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #fa832e 20%, transparent)" },
            __name: "bg-git-conflicting",
            type: "color",
          },
          draft: {
            cssVar: "var(--cds-bg-git-draft)",
            value: "color-mix(in srgb, #737373 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #a6a6a6 20%, transparent)" },
            __name: "bg-git-draft",
            type: "color",
          },
          opened: {
            cssVar: "var(--cds-bg-git-opened)",
            value: "color-mix(in srgb, #1e9e3c 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #32d74b 20%, transparent)" },
            __name: "bg-git-opened",
            type: "color",
          },
          queued: {
            cssVar: "var(--cds-bg-git-queued)",
            value: "color-mix(in srgb, #98801f 20%, transparent)",
            modes: { dark: "color-mix(in srgb, #ffd014 20%, transparent)" },
            __name: "bg-git-queued",
            type: "color",
          },
        },
        highlight: {
          cssVar: "var(--cds-bg-highlight)",
          value: "color-mix(in srgb, #fab219 33%, transparent)",
          __name: "bg-highlight",
          type: "color",
        },
        editor: {
          canvas: {
            cssVar: "var(--cds-bg-editor-canvas)",
            value: "#edece8",
            modes: { dark: "#181817" },
            __name: "bg-editor-canvas",
            type: "color",
          },
          claude: {
            pending: {
              cssVar: "var(--cds-bg-editor-claude-pending)",
              value: "color-mix(in srgb, #d97757 22%, transparent)",
              __name: "bg-editor-claude-pending",
              type: "color",
            },
          },
          highlight: {
            yellow: {
              cssVar: "var(--cds-bg-editor-highlight-yellow)",
              value: "color-mix(in srgb, #fab219 33%, transparent)",
              __name: "bg-editor-highlight-yellow",
              type: "color",
            },
            green: {
              cssVar: "var(--cds-bg-editor-highlight-green)",
              value: "color-mix(in srgb, #55bf50 33%, transparent)",
              __name: "bg-editor-highlight-green",
              type: "color",
            },
            blue: {
              cssVar: "var(--cds-bg-editor-highlight-blue)",
              value: "color-mix(in srgb, #6da7ec 33%, transparent)",
              __name: "bg-editor-highlight-blue",
              type: "color",
            },
            magenta: {
              cssVar: "var(--cds-bg-editor-highlight-magenta)",
              value: "color-mix(in srgb, #e87ba4 33%, transparent)",
              __name: "bg-editor-highlight-magenta",
              type: "color",
            },
            violet: {
              cssVar: "var(--cds-bg-editor-highlight-violet)",
              value: "color-mix(in srgb, #a096eb 33%, transparent)",
              __name: "bg-editor-highlight-violet",
              type: "color",
            },
            gray: {
              cssVar: "var(--cds-bg-editor-highlight-gray)",
              value: "color-mix(in srgb, #a5a49a 33%, transparent)",
              __name: "bg-editor-highlight-gray",
              type: "color",
            },
          },
          collaborator: {
            1: {
              cssVar: "var(--cds-bg-editor-collaborator-1)",
              value: "color-mix(in srgb, #7161e0 22%, transparent)",
              __name: "bg-editor-collaborator-1",
              type: "color",
            },
            2: {
              cssVar: "var(--cds-bg-editor-collaborator-2)",
              value: "color-mix(in srgb, #c04873 22%, transparent)",
              __name: "bg-editor-collaborator-2",
              type: "color",
            },
            3: {
              cssVar: "var(--cds-bg-editor-collaborator-3)",
              value: "color-mix(in srgb, #0f7e5c 22%, transparent)",
              __name: "bg-editor-collaborator-3",
              type: "color",
            },
            4: {
              cssVar: "var(--cds-bg-editor-collaborator-4)",
              value: "color-mix(in srgb, #008300 22%, transparent)",
              __name: "bg-editor-collaborator-4",
              type: "color",
            },
            5: {
              cssVar: "var(--cds-bg-editor-collaborator-5)",
              value: "color-mix(in srgb, #945d00 22%, transparent)",
              __name: "bg-editor-collaborator-5",
              type: "color",
            },
            6: {
              cssVar: "var(--cds-bg-editor-collaborator-6)",
              value: "color-mix(in srgb, #6d6b67 22%, transparent)",
              __name: "bg-editor-collaborator-6",
              type: "color",
            },
          },
          comment: {
            cssVar: "var(--cds-bg-editor-comment)",
            value: "color-mix(in srgb, #fab219 20%, transparent)",
            __name: "bg-editor-comment",
            type: "color",
            active: {
              cssVar: "var(--cds-bg-editor-comment-active)",
              value: "color-mix(in srgb, #fab219 45%, transparent)",
              __name: "bg-editor-comment-active",
              type: "color",
            },
          },
        },
        neutral: {
          cssVar: "var(--cds-bg-neutral)",
          value: "rgba(11, 11, 11, 0.05)",
          modes: { dark: "rgba(255, 255, 255, 0.05)" },
          __name: "bg-neutral",
          type: "color",
          hover: {
            cssVar: "var(--cds-bg-neutral-hover)",
            value: "rgba(11, 11, 11, 0.1)",
            modes: { dark: "rgba(255, 255, 255, 0.1)" },
            __name: "bg-neutral-hover",
            type: "color",
          },
          chip: {
            cssVar: "var(--cds-bg-neutral-chip)",
            value: "rgba(11, 11, 11, 0.05)",
            modes: { dark: "rgba(255, 255, 255, 0.05)" },
            __name: "bg-neutral-chip",
            type: "color",
            hover: {
              cssVar: "var(--cds-bg-neutral-chip-hover)",
              value: "rgba(11, 11, 11, 0.1)",
              modes: { dark: "rgba(255, 255, 255, 0.1)" },
              __name: "bg-neutral-chip-hover",
              type: "color",
            },
          },
        },
        user: {
          message: {
            cssVar: "var(--cds-bg-user-message)",
            value: "rgba(11, 11, 11, 0.05)",
            modes: { dark: "rgba(255, 255, 255, 0.05)" },
            __name: "bg-user-message",
            type: "color",
          },
        },
      },
      backdrop: {
        cssVar: "var(--cds-backdrop)",
        value: "rgb(0 0 0 / 0.4)",
        modes: { dark: "rgb(0 0 0 / 0.5)" },
        __name: "backdrop",
        type: "color",
      },
      text: {
        accent: {
          cssVar: "var(--cds-text-accent)",
          value: "#184f95",
          modes: { dark: "#6da7ec" },
          __name: "text-accent",
          type: "color",
        },
        danger: {
          cssVar: "var(--cds-text-danger)",
          value: "#8e2626",
          modes: { dark: "#ec7e7e" },
          __name: "text-danger",
          type: "color",
        },
        success: {
          cssVar: "var(--cds-text-success)",
          value: "#006300",
          modes: { dark: "#0ca30c" },
          __name: "text-success",
          type: "color",
        },
        warning: {
          cssVar: "var(--cds-text-warning)",
          value: "#734500",
          modes: { dark: "#db9300" },
          __name: "text-warning",
          type: "color",
        },
        pro: {
          cssVar: "var(--cds-text-pro)",
          value: "#4a3aa7",
          modes: { dark: "#a096eb" },
          __name: "text-pro",
          type: "color",
        },
        tint: {
          red: {
            cssVar: "var(--cds-text-tint-red)",
            value: "#8e2626",
            modes: { dark: "#ec7e7e" },
            __name: "text-tint-red",
            type: "color",
          },
          orange: {
            cssVar: "var(--cds-text-tint-orange)",
            value: "#863311",
            modes: { dark: "#ec835a" },
            __name: "text-tint-orange",
            type: "color",
          },
          yellow: {
            cssVar: "var(--cds-text-tint-yellow)",
            value: "#734500",
            modes: { dark: "#db9300" },
            __name: "text-tint-yellow",
            type: "color",
          },
          green: {
            cssVar: "var(--cds-text-tint-green)",
            value: "#006300",
            modes: { dark: "#55bf50" },
            __name: "text-tint-green",
            type: "color",
          },
          aqua: {
            cssVar: "var(--cds-text-tint-aqua)",
            value: "#065f49",
            modes: { dark: "#3bbd8c" },
            __name: "text-tint-aqua",
            type: "color",
          },
          blue: {
            cssVar: "var(--cds-text-tint-blue)",
            value: "#184f95",
            modes: { dark: "#6da7ec" },
            __name: "text-tint-blue",
            type: "color",
          },
          violet: {
            cssVar: "var(--cds-text-tint-violet)",
            value: "#4a3aa7",
            modes: { dark: "#a096eb" },
            __name: "text-tint-violet",
            type: "color",
          },
          magenta: {
            cssVar: "var(--cds-text-tint-magenta)",
            value: "#862a4c",
            modes: { dark: "#e87ba4" },
            __name: "text-tint-magenta",
            type: "color",
          },
        },
        git: {
          added: {
            cssVar: "var(--cds-text-git-added)",
            value: "#1e9e3c",
            modes: { dark: "#32d74b" },
            __name: "text-git-added",
            type: "color",
          },
          removed: {
            cssVar: "var(--cds-text-git-removed)",
            value: "#cd2054",
            modes: { dark: "#ff2c56" },
            __name: "text-git-removed",
            type: "color",
          },
          modified: {
            cssVar: "var(--cds-text-git-modified)",
            value: "#98801f",
            modes: { dark: "#ffd014" },
            __name: "text-git-modified",
            type: "color",
          },
          merged: {
            cssVar: "var(--cds-text-git-merged)",
            value: "#8e6bd9",
            modes: { dark: "#b796ff" },
            __name: "text-git-merged",
            type: "color",
          },
          closed: {
            cssVar: "var(--cds-text-git-closed)",
            value: "#ff3a30",
            modes: { dark: "#ff6159" },
            __name: "text-git-closed",
            type: "color",
          },
          conflicting: {
            cssVar: "var(--cds-text-git-conflicting)",
            value: "#c5621b",
            modes: { dark: "#fa832e" },
            __name: "text-git-conflicting",
            type: "color",
          },
          draft: {
            cssVar: "var(--cds-text-git-draft)",
            value: "#737373",
            modes: { dark: "#a6a6a6" },
            __name: "text-git-draft",
            type: "color",
          },
          opened: {
            cssVar: "var(--cds-text-git-opened)",
            value: "#1e9e3c",
            modes: { dark: "#32d74b" },
            __name: "text-git-opened",
            type: "color",
          },
          queued: {
            cssVar: "var(--cds-text-git-queued)",
            value: "#98801f",
            modes: { dark: "#ffd014" },
            __name: "text-git-queued",
            type: "color",
          },
        },
        primary: {
          cssVar: "var(--cds-text-primary)",
          value: "#0b0b0b",
          modes: { dark: "#f0efec" },
          __name: "text-primary",
          type: "color",
        },
        secondary: {
          cssVar: "var(--cds-text-secondary)",
          value: "#52514e",
          modes: { dark: "#c3c2b7" },
          __name: "text-secondary",
          type: "color",
        },
        muted: {
          cssVar: "var(--cds-text-muted)",
          value: "#898781",
          __name: "text-muted",
          type: "color",
        },
        disabled: {
          cssVar: "var(--cds-text-disabled)",
          value: "rgba(11, 11, 11, 0.35)",
          modes: { dark: "rgba(255, 255, 255, 0.35)" },
          __name: "text-disabled",
          type: "color",
        },
      },
      fontSize: {
        caption: {
          cssVar: "var(--cds-font-size-caption)",
          value: "0.6875rem",
          densities: { comfortable: "0.75rem" },
          __name: "font-size-caption",
          type: "dimension",
        },
        footnote: {
          cssVar: "var(--cds-font-size-footnote)",
          value: "0.75rem",
          densities: { comfortable: "0.8125rem" },
          __name: "font-size-footnote",
          type: "dimension",
        },
        code: {
          cssVar: "var(--cds-font-size-code)",
          value: "0.75rem",
          densities: { comfortable: "0.8125rem" },
          __name: "font-size-code",
          type: "dimension",
        },
        body: {
          cssVar: "var(--cds-font-size-body)",
          value: "0.8125rem",
          densities: { comfortable: "0.875rem" },
          __name: "font-size-body",
          type: "dimension",
        },
        prose: {
          cssVar: "var(--cds-font-size-prose)",
          value: "0.875rem",
          densities: { comfortable: "1rem" },
          __name: "font-size-prose",
          type: "dimension",
        },
        heading: {
          cssVar: "var(--cds-font-size-heading)",
          value: "0.875rem",
          densities: { comfortable: "0.9375rem" },
          __name: "font-size-heading",
          type: "dimension",
        },
        title: {
          cssVar: "var(--cds-font-size-title)",
          value: "1.25rem",
          densities: { comfortable: "1.375rem" },
          __name: "font-size-title",
          type: "dimension",
        },
      },
      fontWeight: {
        regular: {
          cssVar: "var(--cds-font-weight-regular)",
          value: "400",
          __name: "font-weight-regular",
          type: "fontWeight",
        },
        medium: {
          cssVar: "var(--cds-font-weight-medium)",
          value: "500",
          __name: "font-weight-medium",
          type: "fontWeight",
        },
        semibold: {
          cssVar: "var(--cds-font-weight-semibold)",
          value: "580",
          __name: "font-weight-semibold",
          type: "fontWeight",
        },
        bold: {
          cssVar: "var(--cds-font-weight-bold)",
          value: "600",
          __name: "font-weight-bold",
          type: "fontWeight",
        },
      },
      leading: {
        caption: {
          cssVar: "var(--cds-leading-caption)",
          value: "1.0625rem",
          __name: "leading-caption",
          type: "dimension",
        },
        footnote: {
          cssVar: "var(--cds-leading-footnote)",
          value: "0.9375rem",
          densities: { comfortable: "1.0625rem" },
          __name: "leading-footnote",
          type: "dimension",
        },
        code: {
          cssVar: "var(--cds-leading-code)",
          value: "1.0625rem",
          densities: { comfortable: "1.1875rem" },
          __name: "leading-code",
          type: "dimension",
        },
        body: {
          cssVar: "var(--cds-leading-body)",
          value: "1.1875rem",
          densities: { comfortable: "1.25rem" },
          __name: "leading-body",
          type: "dimension",
        },
        prose: {
          cssVar: "var(--cds-leading-prose)",
          value: "1.25rem",
          densities: { comfortable: "1.5rem" },
          __name: "leading-prose",
          type: "dimension",
        },
        heading: {
          cssVar: "var(--cds-leading-heading)",
          value: "1.125rem",
          densities: { comfortable: "1.25rem" },
          __name: "leading-heading",
          type: "dimension",
        },
        title: {
          cssVar: "var(--cds-leading-title)",
          value: "1.5625rem",
          densities: { comfortable: "1.75rem" },
          __name: "leading-title",
          type: "dimension",
        },
      },
      on: {
        primary: {
          cssVar: "var(--cds-on-primary)",
          value: "#ffffff",
          modes: { dark: "#0b0b0b" },
          __name: "on-primary",
          type: "color",
        },
        accent: {
          cssVar: "var(--cds-on-accent)",
          value: "#ffffff",
          __name: "on-accent",
          type: "color",
        },
        danger: {
          cssVar: "var(--cds-on-danger)",
          value: "#ffffff",
          __name: "on-danger",
          type: "color",
        },
        success: {
          cssVar: "var(--cds-on-success)",
          value: "#0b0b0b",
          __name: "on-success",
          type: "color",
        },
        warning: {
          cssVar: "var(--cds-on-warning)",
          value: "#0b0b0b",
          __name: "on-warning",
          type: "color",
        },
        pro: {
          cssVar: "var(--cds-on-pro)",
          value: "#ffffff",
          __name: "on-pro",
          type: "color",
        },
        git: {
          added: {
            cssVar: "var(--cds-on-git-added)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-added",
            type: "color",
          },
          removed: {
            cssVar: "var(--cds-on-git-removed)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-removed",
            type: "color",
          },
          modified: {
            cssVar: "var(--cds-on-git-modified)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-modified",
            type: "color",
          },
          merged: {
            cssVar: "var(--cds-on-git-merged)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-merged",
            type: "color",
          },
          closed: {
            cssVar: "var(--cds-on-git-closed)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-closed",
            type: "color",
          },
          conflicting: {
            cssVar: "var(--cds-on-git-conflicting)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-conflicting",
            type: "color",
          },
          draft: {
            cssVar: "var(--cds-on-git-draft)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-draft",
            type: "color",
          },
          opened: {
            cssVar: "var(--cds-on-git-opened)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-opened",
            type: "color",
          },
          queued: {
            cssVar: "var(--cds-on-git-queued)",
            value: "#ffffff",
            modes: { dark: "#0b0b0b" },
            __name: "on-git-queued",
            type: "color",
          },
        },
        brand: {
          cssVar: "var(--cds-on-brand)",
          value: "#ffffff",
          __name: "on-brand",
          type: "color",
        },
      },
      chart: {
        categorical: {
          1: {
            cssVar: "var(--cds-chart-categorical-1)",
            value: "#2a78d6",
            modes: { dark: "#3987e5" },
            __name: "chart-categorical-1",
            type: "color",
          },
          2: {
            cssVar: "var(--cds-chart-categorical-2)",
            value: "#eb6834",
            modes: { dark: "#d95926" },
            __name: "chart-categorical-2",
            type: "color",
          },
          3: {
            cssVar: "var(--cds-chart-categorical-3)",
            value: "#1baf7a",
            modes: { dark: "#199e70" },
            __name: "chart-categorical-3",
            type: "color",
          },
          4: {
            cssVar: "var(--cds-chart-categorical-4)",
            value: "#eda100",
            modes: { dark: "#c98500" },
            __name: "chart-categorical-4",
            type: "color",
          },
          5: {
            cssVar: "var(--cds-chart-categorical-5)",
            value: "#e87ba4",
            modes: { dark: "#d55181" },
            __name: "chart-categorical-5",
            type: "color",
          },
          6: {
            cssVar: "var(--cds-chart-categorical-6)",
            value: "#008300",
            __name: "chart-categorical-6",
            type: "color",
          },
          7: {
            cssVar: "var(--cds-chart-categorical-7)",
            value: "#6250d6",
            modes: { dark: "#9085e9" },
            __name: "chart-categorical-7",
            type: "color",
          },
          8: {
            cssVar: "var(--cds-chart-categorical-8)",
            value: "#e34948",
            modes: { dark: "#e66767" },
            __name: "chart-categorical-8",
            type: "color",
          },
        },
        sequential: {
          1: {
            cssVar: "var(--cds-chart-sequential-1)",
            value: "#cde2fb",
            modes: { dark: "#0d366b" },
            __name: "chart-sequential-1",
            type: "color",
          },
          2: {
            cssVar: "var(--cds-chart-sequential-2)",
            value: "#9ec5f4",
            modes: { dark: "#184f95" },
            __name: "chart-sequential-2",
            type: "color",
          },
          3: {
            cssVar: "var(--cds-chart-sequential-3)",
            value: "#6da7ec",
            modes: { dark: "#256abf" },
            __name: "chart-sequential-3",
            type: "color",
          },
          4: {
            cssVar: "var(--cds-chart-sequential-4)",
            value: "#3987e5",
            __name: "chart-sequential-4",
            type: "color",
          },
          5: {
            cssVar: "var(--cds-chart-sequential-5)",
            value: "#256abf",
            modes: { dark: "#6da7ec" },
            __name: "chart-sequential-5",
            type: "color",
          },
          6: {
            cssVar: "var(--cds-chart-sequential-6)",
            value: "#184f95",
            modes: { dark: "#9ec5f4" },
            __name: "chart-sequential-6",
            type: "color",
          },
          7: {
            cssVar: "var(--cds-chart-sequential-7)",
            value: "#0d366b",
            modes: { dark: "#cde2fb" },
            __name: "chart-sequential-7",
            type: "color",
          },
        },
        diverging: {
          1: {
            cssVar: "var(--cds-chart-diverging-1)",
            value: "#256abf",
            modes: { dark: "#6da7ec" },
            __name: "chart-diverging-1",
            type: "color",
          },
          2: {
            cssVar: "var(--cds-chart-diverging-2)",
            value: "#5598e7",
            modes: { dark: "#2a78d6" },
            __name: "chart-diverging-2",
            type: "color",
          },
          3: {
            cssVar: "var(--cds-chart-diverging-3)",
            value: "#9ec5f4",
            modes: { dark: "#184f95" },
            __name: "chart-diverging-3",
            type: "color",
          },
          4: {
            cssVar: "var(--cds-chart-diverging-4)",
            value: "#f0efec",
            modes: { dark: "#383835" },
            __name: "chart-diverging-4",
            type: "color",
          },
          5: {
            cssVar: "var(--cds-chart-diverging-5)",
            value: "#f4abab",
            modes: { dark: "#8e2626" },
            __name: "chart-diverging-5",
            type: "color",
          },
          6: {
            cssVar: "var(--cds-chart-diverging-6)",
            value: "#e66767",
            modes: { dark: "#d03b3b" },
            __name: "chart-diverging-6",
            type: "color",
          },
          7: {
            cssVar: "var(--cds-chart-diverging-7)",
            value: "#b93535",
            modes: { dark: "#ec7e7e" },
            __name: "chart-diverging-7",
            type: "color",
          },
        },
        status: {
          good: {
            cssVar: "var(--cds-chart-status-good)",
            value: "#0ca30c",
            __name: "chart-status-good",
            type: "color",
          },
          warning: {
            cssVar: "var(--cds-chart-status-warning)",
            value: "#fab219",
            __name: "chart-status-warning",
            type: "color",
          },
          serious: {
            cssVar: "var(--cds-chart-status-serious)",
            value: "#ec835a",
            __name: "chart-status-serious",
            type: "color",
          },
          critical: {
            cssVar: "var(--cds-chart-status-critical)",
            value: "#d03b3b",
            __name: "chart-status-critical",
            type: "color",
          },
        },
        muted: {
          cssVar: "var(--cds-chart-muted)",
          value: "#c3c2b7",
          modes: { dark: "#5f5e5a" },
          __name: "chart-muted",
          type: "color",
        },
        reference: {
          cssVar: "var(--cds-chart-reference)",
          value: "#898781",
          modes: { dark: "#97958d" },
          __name: "chart-reference",
          type: "color",
          tint: {
            cssVar: "var(--cds-chart-reference-tint)",
            value: "rgba(137, 135, 129, 0.15)",
            modes: { dark: "rgba(151, 149, 141, 0.15)" },
            __name: "chart-reference-tint",
            type: "color",
          },
        },
        grid: {
          cssVar: "var(--cds-chart-grid)",
          value: "rgba(11, 11, 11, 0.1)",
          modes: { dark: "rgba(255, 255, 255, 0.1)" },
          __name: "chart-grid",
          type: "color",
        },
        axis: {
          cssVar: "var(--cds-chart-axis)",
          value: "#c3c2b7",
          modes: { dark: "#383835" },
          __name: "chart-axis",
          type: "color",
        },
        baseline: {
          cssVar: "var(--cds-chart-baseline)",
          value: "#c3c2b7",
          modes: { dark: "#383835" },
          __name: "chart-baseline",
          type: "color",
        },
      },
      editor: {
        collaborator: {
          1: {
            cssVar: "var(--cds-editor-collaborator-1)",
            value: "#7161e0",
            __name: "editor-collaborator-1",
            type: "color",
          },
          2: {
            cssVar: "var(--cds-editor-collaborator-2)",
            value: "#c04873",
            __name: "editor-collaborator-2",
            type: "color",
          },
          3: {
            cssVar: "var(--cds-editor-collaborator-3)",
            value: "#0f7e5c",
            __name: "editor-collaborator-3",
            type: "color",
          },
          4: {
            cssVar: "var(--cds-editor-collaborator-4)",
            value: "#008300",
            __name: "editor-collaborator-4",
            type: "color",
          },
          5: {
            cssVar: "var(--cds-editor-collaborator-5)",
            value: "#945d00",
            __name: "editor-collaborator-5",
            type: "color",
          },
          6: {
            cssVar: "var(--cds-editor-collaborator-6)",
            value: "#6d6b67",
            __name: "editor-collaborator-6",
            type: "color",
          },
        },
      },
      opacity: {
        disabled: {
          cssVar: "var(--cds-opacity-disabled)",
          value: "0.4",
          __name: "opacity-disabled",
          type: "number",
        },
        icon: {
          secondary: {
            cssVar: "var(--cds-opacity-icon-secondary)",
            value: "0.4",
            __name: "opacity-icon-secondary",
            type: "number",
          },
        },
      },
      z: {
        modal: {
          cssVar: "var(--cds-z-modal)",
          value: "40",
          __name: "z-modal",
          type: "number",
        },
        coachmark: {
          cssVar: "var(--cds-z-coachmark)",
          value: "35",
          __name: "z-coachmark",
          type: "number",
        },
        popover: {
          cssVar: "var(--cds-z-popover)",
          value: "50",
          __name: "z-popover",
          type: "number",
        },
        tooltip: {
          cssVar: "var(--cds-z-tooltip)",
          value: "50",
          __name: "z-tooltip",
          type: "number",
        },
        toast: {
          cssVar: "var(--cds-z-toast)",
          value: "60",
          __name: "z-toast",
          type: "number",
        },
      },
    },
    t = [
      e.chart.categorical[1],
      e.chart.categorical[2],
      e.chart.categorical[3],
      e.chart.categorical[4],
      e.chart.categorical[5],
      e.chart.categorical[6],
      e.chart.categorical[7],
      e.chart.categorical[8],
    ],
    n = [
      e.chart.sequential[1],
      e.chart.sequential[2],
      e.chart.sequential[3],
      e.chart.sequential[4],
      e.chart.sequential[5],
      e.chart.sequential[6],
      e.chart.sequential[7],
    ];
  (Object.defineProperty(e.chart.categorical, "array", { value: t }),
    Object.defineProperty(e.chart.sequential, "array", { value: n }));
  var r = {
    blue: e.chart.categorical[1],
    orange: e.chart.categorical[2],
    aqua: e.chart.categorical[3],
    yellow: e.chart.categorical[4],
    magenta: e.chart.categorical[5],
    green: e.chart.categorical[6],
    violet: e.chart.categorical[7],
    red: e.chart.categorical[8],
  };
  Object.defineProperty(e.chart.categorical, "byHue", { value: r });
  var i = e;
  return i;
})();
const e = (() => {
  function e(e, t, n) {
    try {
      Object.defineProperty(e, Symbol.for("ant.o11y.errorText"), {
        value: { text: t, kind: n },
        enumerable: !1,
        writable: !1,
        configurable: !0,
      });
    } catch {}
    return e;
  }
  return e;
})();
const m = (() => {
  var Sh = "(prefers-reduced-motion: reduce)";
  var Ch = "data-reduce-motion";
  function wh() {
    return typeof window > "u" || typeof document > "u"
      ? !1
      : (typeof window.matchMedia == "function" &&
          window.matchMedia(Sh).matches) ||
          document.documentElement.getAttribute(Ch) === "true";
  }
  return wh;
})();
const re = ((pf) => {
  function mf(e) {
    return pf(e) ?? globalThis.window;
  }
  return mf;
})(b);
export function createPreviewSketchCanvas({ useToken: ue, useIntl: se }) {
  var V = {
      name: "EditFilled",
      master16: [
        {
          d: "M11.499 8.206L7 12.711C6.838 12.868 6.641 12.979 6.426 13.033L2.915 13.911C2.416 14.035 1.963 13.583 2.088 13.084L2.966 9.573C3.02 9.358 3.131 9.161 3.288 9L7.792 4.499L11.499 8.206ZM9.882 2.41C10.361 1.931 11.138 1.932 11.617 2.41L13.589 4.382C14.068 4.861 14.068 5.638 13.589 6.117L12.206 7.499L8.499 3.792L9.882 2.41Z",
          filled: "only",
        },
      ],
      master20: [
        {
          d: "M15 9.848L8.637 16.211C8.414 16.434 8.129 16.587 7.82 16.649L3.485 17.516C2.891 17.634 2.367 17.11 2.485 16.516L3.352 12.18C3.414 11.871 3.567 11.586 3.79 11.363L10.151 5L15 9.848ZM12.368 2.784C13 2.159 14 2.159 14.63 2.784L17.216 5.37C17.841 6 17.841 7 17.216 7.632L15.847 9L11 4.152L12.368 2.784Z",
          filled: "only",
        },
      ],
    },
    Be = {
      name: "EyeSlash",
      master16: [
        { x1: 2.5, y1: 2.5, x2: 13.5, y2: 13.5 },
        {
          d: "M3 6.132C2.631 6.571 2.343 7 2.136 7.319C1.873 7.739 1.873 8.261 2.136 8.681C2.924 9.939 4.908 12.5 8 12.5C8.533 12.5 9.033 12.424 9.5 12.292M6.5 3.709C6.967 3.576 7.467 3.5 8 3.5C11.092 3.5 13.076 6.062 13.864 7.32C14.127 7.74 14.127 8.261 13.864 8.682C13.657 9.011 13.369 9.43 13 9.868",
        },
      ],
      master20: [
        {
          d: "M10.5 7.55C11.48 7.749 12.251 8.52 12.45 9.5M9.5 12.45C8.52 12.251 7.749 11.479 7.55 10.5",
        },
        { x1: 2.5, y1: 2.5, x2: 17.5, y2: 17.5 },
        {
          d: "M4.018 7.5C3.475 8.101 3.054 8.687 2.759 9.14C2.415 9.667 2.415 10.333 2.759 10.861C3.767 12.408 6.251 15.5 10 15.5C10.713 15.5 11.38 15.388 12 15.197M8 4.804C8.62 4.612 9.287 4.5 10 4.5C13.749 4.5 16.233 7.592 17.241 9.14C17.585 9.667 17.585 10.333 17.241 10.861C16.946 11.313 16.525 11.899 15.982 12.5",
        },
      ],
    },
    H = Math.PI / 4;
  function Ve(e, t, n, r) {
    if (!r) return n;
    let i = n.x - t.x,
      a = n.y - t.y;
    if (e === "line" || e === "arrow") {
      let e = Math.hypot(i, a),
        n = Math.round(Math.atan2(a, i) / H) * H;
      return { x: t.x + e * Math.cos(n), y: t.y + e * Math.sin(n) };
    }
    if (e === "rect" || e === "ellipse") {
      let e = Math.max(Math.abs(i), Math.abs(a));
      return {
        x: t.x + e * (Math.sign(i) || 1),
        y: t.y + e * (Math.sign(a) || 1),
      };
    }
    return n;
  }
  function U(e) {
    return [
      { x: e.x1, y: e.y1 },
      { x: e.x2, y: e.y2 },
    ];
  }
  function W(e, t, n) {
    let r = t.x - e.x,
      i = t.y - e.y,
      a = r * r + i * i;
    if (a === 0) return;
    let o = n.x - e.x,
      s = n.y - e.y;
    return { u: (o * r + s * i) / a, v: (s * r - o * i) / a };
  }
  function He(e) {
    let t = e.x2 - e.x1,
      n = e.y2 - e.y1,
      { u: r, v: i } = e.bend ?? { u: 0.5, v: 0 };
    return { x: e.x1 + r * t - i * n, y: e.y1 + r * n + i * t };
  }
  function G(e) {
    let t = He(e);
    return { x: 2 * t.x - (e.x1 + e.x2) / 2, y: 2 * t.y - (e.y1 + e.y2) / 2 };
  }
  function Ue(e) {
    let t = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
    if (!e.bend) return t;
    let n = G(e),
      r =
        Math.hypot(n.x - e.x1, n.y - e.y1) + Math.hypot(e.x2 - n.x, e.y2 - n.y);
    return (2 * t + r) / 3;
  }
  function We(e, t) {
    let [n, r] = U(e);
    if (!e.bend) {
      let e = Math.hypot(r.x - n.x, r.y - n.y),
        i = e === 0 ? 0 : Math.max(0, 1 - t / e);
      return { t: i, x: n.x + (r.x - n.x) * i, y: n.y + (r.y - n.y) * i };
    }
    let i = G(e),
      a = (e) => {
        let a = Ke(n, i, r, e);
        return Math.hypot(r.x - a.x, r.y - a.y) >= t;
      },
      o = -1,
      s = 1;
    for (let e = q - 1; e >= 0; e--)
      if (a(e / q)) {
        ((o = e / q), (s = (e + 1) / q));
        break;
      }
    if (o < 0) return { t: 0, ...n };
    for (let e = 0; e < 12; e++) {
      let e = (o + s) / 2;
      a(e) ? (o = e) : (s = e);
    }
    return { t: o, ...Ke(n, i, r, o) };
  }
  function K(e, t) {
    let n = G(e);
    return { x: e.x1 + (n.x - e.x1) * t, y: e.y1 + (n.y - e.y1) * t };
  }
  function Ge(e, t) {
    let n = We(e, t),
      r = e.x2 - n.x,
      i = e.y2 - n.y;
    r === 0 && i === 0 && ((r = e.x2 - e.x1), (i = e.y2 - e.y1));
    let a = Math.hypot(r, i);
    return {
      shaftEnd: n,
      direction: a === 0 ? { x: 1, y: 0 } : { x: r / a, y: i / a },
    };
  }
  function Ke(e, t, n, r) {
    let i = (1 - r) * (1 - r),
      a = 2 * (1 - r) * r,
      o = r * r;
    return { x: i * e.x + a * t.x + o * n.x, y: i * e.y + a * t.y + o * n.y };
  }
  var q = 32;
  function qe(e, t) {
    let [n, r] = U(e);
    if (!e.bend) return Ze(t, n, r);
    let i = G(e),
      a = 1 / 0,
      o = n;
    for (let e = 1; e <= q; e++) {
      let s = Ke(n, i, r, e / q);
      ((a = Math.min(a, Ze(t, o, s))), (o = s));
    }
    return a;
  }
  function Je(e) {
    return e.kind !== "freehand";
  }
  var Ye = 64;
  function Xe(e, t = !1) {
    return Math.max(t ? 14 : 6, e / 2 + 3);
  }
  function Ze(e, t, n) {
    let r = n.x - t.x,
      i = n.y - t.y,
      a = r * r + i * i;
    if (a === 0) return Math.hypot(e.x - t.x, e.y - t.y);
    let o = Math.max(0, Math.min(1, ((e.x - t.x) * r + (e.y - t.y) * i) / a));
    return Math.hypot(e.x - (t.x + o * r), e.y - (t.y + o * i));
  }
  function Qe(e) {
    return {
      x: Math.min(e.x1, e.x2),
      y: Math.min(e.y1, e.y2),
      width: Math.abs(e.x2 - e.x1),
      height: Math.abs(e.y2 - e.y1),
    };
  }
  function $e(e, t, n, r = !1) {
    if (e.kind === "freehand") return !1;
    if (e.kind === "text") {
      let r = n(e);
      return (
        t.x >= r.x &&
        t.x <= r.x + r.width &&
        t.y >= r.y &&
        t.y <= r.y + r.height
      );
    }
    if (e.kind === "step")
      return Math.hypot(t.x - e.x, t.y - e.y) <= e.size / 2 + Xe(0, r);
    let i = Math.max(Xe(e.width, r), e.kind === "arrow" ? e.width * 2 : 0);
    if (e.kind === "line" || e.kind === "arrow") return qe(e, t) <= i;
    let { x: a, y: o, width: s, height: c } = Qe(e);
    if (e.kind === "redact")
      return (
        t.x >= a - i && t.x <= a + s + i && t.y >= o - i && t.y <= o + c + i
      );
    if (e.kind === "rect") {
      let e = [
        { x: a, y: o },
        { x: a + s, y: o },
        { x: a + s, y: o + c },
        { x: a, y: o + c },
      ];
      return e.some((n, r) => Ze(t, n, e[(r + 1) % 4]) <= i);
    }
    let l = s / 2,
      u = c / 2,
      d = a + l,
      f = o + u,
      p = 1 / 0,
      m = { x: d + l, y: f };
    for (let e = 1; e <= Ye; e++) {
      let n = (e / Ye) * Math.PI * 2,
        r = { x: d + l * Math.cos(n), y: f + u * Math.sin(n) };
      ((p = Math.min(p, Ze(t, m, r))), (m = r));
    }
    return p <= i;
  }
  function J(e, t, n) {
    return e.kind === "freehand"
      ? { ...e, points: e.points.map((e) => ({ x: e.x + t, y: e.y + n })) }
      : e.kind === "text" || e.kind === "step"
        ? { ...e, x: e.x + t, y: e.y + n }
        : { ...e, x1: e.x1 + t, y1: e.y1 + n, x2: e.x2 + t, y2: e.y2 + n };
  }
  function et(e, t, n, r, i) {
    let a = it(e, i);
    return { dx: tt(t, -a.x, r.width - a.x), dy: tt(n, -a.y, r.height - a.y) };
  }
  function tt(e, t, n) {
    return Math.min(Math.max(e, Math.min(t, 0)), Math.max(n, 0));
  }
  function nt(e, t, n) {
    return { x: rt(e.x, t.width, n.width), y: rt(e.y, t.height, n.height) };
  }
  function rt(e, t, n) {
    return e + t <= n ? e : Math.min(e, Math.max(n - t, 0));
  }
  function it(e, t) {
    if (e.kind === "text") {
      let n = t(e);
      return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
    }
    if (e.kind === "step") return { x: e.x, y: e.y };
    let n =
        e.kind === "freehand"
          ? e.points
          : e.kind === "line" || e.kind === "arrow"
            ? [...U(e), He(e)]
            : U(e),
      r = n.map((e) => e.x),
      i = n.map((e) => e.y);
    return { x: (D(r) + le(r)) / 2, y: (D(i) + le(i)) / 2 };
  }
  function at(e, t, n) {
    if (e.kind === "freehand")
      return {
        ...e,
        points: e.points.map((e) => ({ ...e, x: e.x * t, y: e.y * n })),
      };
    if (e.kind === "text" || e.kind === "step")
      return { ...e, x: e.x * t, y: e.y * n, size: e.size * n };
    let r = { ...e, x1: e.x1 * t, y1: e.y1 * n, x2: e.x2 * t, y2: e.y2 * n };
    if (e.bend) {
      let i = He(e);
      return ot(r, W(...U(r), { x: i.x * t, y: i.y * n }));
    }
    return r;
  }
  function ot(e, t) {
    let { bend: n, ...r } = e;
    return t ? { ...r, bend: t } : r;
  }
  var st = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
  };
  function ct(e, t = 0, n) {
    if (e.kind === "text") {
      if (!n) return [];
      let { x: e, y: t, width: r, height: i } = n;
      return [
        { id: "nw", x: e, y: t, cursor: st.nw },
        { id: "ne", x: e + r, y: t, cursor: st.ne },
        { id: "se", x: e + r, y: t + i, cursor: st.se },
        { id: "sw", x: e, y: t + i, cursor: st.sw },
      ];
    }
    if (e.kind === "line" || e.kind === "arrow") {
      let n = He(e),
        r = e.bend !== void 0 || Math.hypot(e.x2 - e.x1, e.y2 - e.y1) >= t;
      return [
        { id: "start", x: e.x1, y: e.y1, cursor: "crosshair" },
        { id: "end", x: e.x2, y: e.y2, cursor: "crosshair" },
        ...(r ? [{ id: "bend", x: n.x, y: n.y, cursor: "crosshair" }] : []),
      ];
    }
    if (e.kind === "freehand" || e.kind === "step") return [];
    let { x: r, y: i, width: a, height: o } = Qe(e),
      s = r + a / 2,
      c = i + o / 2,
      l = r + a,
      u = i + o,
      d = (e, t, n) => ({ id: e, x: t, y: n, cursor: st[e] }),
      f = a >= t,
      p = o >= t;
    return [
      d("nw", r, i),
      ...(f ? [d("n", s, i)] : []),
      d("ne", l, i),
      ...(p ? [d("e", l, c)] : []),
      d("se", l, u),
      ...(f ? [d("s", s, u)] : []),
      d("sw", r, u),
      ...(p ? [d("w", r, c)] : []),
    ];
  }
  function lt(e, t, n, r = 0, i) {
    let a = null,
      o = n;
    for (let s of ct(e, r, i)) {
      let e = Math.hypot(t.x - s.x, t.y - s.y);
      if (s.id === "bend" && e <= n) return s;
      (e < o || (a === null && e <= o)) && ((a = s), (o = e));
    }
    return a;
  }
  var ut = 4;
  function dt(e, t, n, r) {
    if (e.kind === "line" || e.kind === "arrow") {
      if (t === "bend") {
        let t = { x: (e.x1 + e.x2) / 2, y: (e.y1 + e.y2) / 2 };
        return Math.hypot(n.x - t.x, n.y - t.y) <= ut
          ? e.bend
            ? ot(e, void 0)
            : e
          : ot(e, W(...U(e), n));
      }
      if (t === "start") {
        let t = Ve(e.kind, { x: e.x2, y: e.y2 }, n, r);
        return { ...e, x1: t.x, y1: t.y };
      }
      if (t === "end") {
        let t = Ve(e.kind, { x: e.x1, y: e.y1 }, n, r);
        return { ...e, x2: t.x, y2: t.y };
      }
      return e;
    }
    let { x: i, y: a, width: o, height: s } = Qe(e),
      c = i,
      l = a,
      u = i + o,
      d = a + s;
    switch (t) {
      case "n":
        return { ...e, x1: c, x2: u, y1: d, y2: n.y };
      case "s":
        return { ...e, x1: c, x2: u, y1: l, y2: n.y };
      case "w":
        return { ...e, y1: l, y2: d, x1: u, x2: n.x };
      case "e":
        return { ...e, y1: l, y2: d, x1: c, x2: n.x };
      case "nw":
      case "ne":
      case "se":
      case "sw": {
        let i = {
            x: t === "nw" || t === "sw" ? u : c,
            y: t === "nw" || t === "ne" ? d : l,
          },
          a = Ve(e.kind, i, n, r);
        return { ...e, x1: i.x, y1: i.y, x2: a.x, y2: a.y };
      }
      default:
        return e;
    }
  }
  function ft(e, t, n, r, i, a) {
    if (r !== "nw" && r !== "ne" && r !== "se" && r !== "sw") return e;
    let o = t(e);
    if (o.height <= 0 || e.size <= 0) return e;
    let s = o.width + 2 * n,
      c = o.height + 2 * n,
      l = r === "ne" || r === "se",
      u = r === "se" || r === "sw",
      d = o.x - n + (l ? 0 : s),
      f = o.y - n + (u ? 0 : c),
      p = (i.x - d) * (l ? 1 : -1) - 2 * n,
      m = (i.y - f) * (u ? 1 : -1) - 2 * n,
      ee = Math.max(o.width > 0 ? p / o.width : -1 / 0, m / o.height),
      h = Math.max(Math.min(a, e.size), e.size * ee);
    if (Math.abs(h - e.size) < 1e-6) return e;
    let g = { ...e, size: h },
      { width: te, height: _ } = t(g);
    return { ...g, x: l ? d + n : d - n - te, y: u ? f + n : f - n - _ };
  }
  var pt = { past: [], present: [], future: [] };
  function mt(e, t) {
    let n = [...e.past, e.present];
    return { past: n.length > 100 ? n.slice(-100) : n, present: t, future: [] };
  }
  function ht(e) {
    let t = e.past.at(-1);
    return t === void 0
      ? e.present.length === 0
        ? e
        : {
            past: [],
            present: e.present.slice(0, -1),
            future: [e.present, ...e.future],
          }
      : {
          past: e.past.slice(0, -1),
          present: t,
          future: [e.present, ...e.future],
        };
  }
  function gt(e) {
    let [t, ...n] = e.future;
    return t === void 0
      ? e
      : { past: [...e.past, e.present], present: t, future: n };
  }
  function _t(e, t) {
    let n = new Map(),
      r = (e) => {
        let r = n.get(e);
        return (r === void 0 && ((r = t(e)), n.set(e, r)), r);
      };
    return {
      past: e.past.map((e) => e.map(r)),
      present: e.present.map(r),
      future: e.future.map((e) => e.map(r)),
    };
  }
  function vt(e) {
    return {
      count: e.present.length,
      canUndo: e.past.length > 0 || e.present.length > 0,
      canRedo: e.future.length > 0,
    };
  }
  var yt = "#000000",
    bt = 4,
    Y = 96,
    xt = { mosaic: 12, noise: 2 };
  function St(e, t) {
    let [n, r] = e === "mosaic" ? [56, 200] : [16, 240],
      i = Math.round(n + t * (r - n))
        .toString(16)
        .padStart(2, "0");
    return `#${i}${i}${i}`;
  }
  var Ct = new Map(),
    wt = new WeakMap();
  function Tt(e) {
    let t = Ct.get(e);
    if (t) return t;
    let n = document.createElement("canvas");
    ((n.width = Y), (n.height = Y));
    let r = n.getContext("2d");
    if (!r) return null;
    let i = xt[e];
    for (let t = 0; t < Y; t += i)
      for (let n = 0; n < Y; n += i)
        ((r.fillStyle = St(e, Math.random())), r.fillRect(n, t, i, i));
    return (Ct.set(e, n), n);
  }
  function Et(e, t) {
    let n = wt.get(e),
      r = n?.[t];
    if (r) return r;
    let i = Tt(t),
      a = i ? e.createPattern(i, "repeat") : null;
    return (a && (n || ((n = {}), wt.set(e, n)), (n[t] = a)), a);
  }
  function Dt(e, t) {
    let { a: n, b: r, c: i, d: a, e: o, f: s } = e.getTransform();
    if (!(n > 0 && a > 0) || r !== 0 || i !== 0) return t;
    let c = Math.floor(t.x * n + o),
      l = Math.floor(t.y * a + s),
      u = Math.ceil((t.x + t.width) * n + o),
      d = Math.ceil((t.y + t.height) * a + s);
    return {
      x: (c - o) / n,
      y: (l - s) / a,
      width: (u - c) / n,
      height: (d - l) / a,
    };
  }
  function Ot(e, t, n = 1) {
    let r = Qe(t),
      { a: i } = e.getTransform(),
      a = bt * (1 - Math.SQRT1_2) + 2 / (i > 0 ? i : 1),
      {
        x: o,
        y: s,
        width: c,
        height: l,
      } = Dt(e, {
        x: r.x - a,
        y: r.y - a,
        width: r.width + 2 * a,
        height: r.height + 2 * a,
      }),
      u = n < 1;
    (u &&
      (e.save(), e.beginPath(), e.rect(o, s, c * Math.max(0, n), l), e.clip()),
      e.beginPath(),
      e.roundRect(o, s, c, l, bt),
      (e.fillStyle = yt),
      e.fill());
    let d = t.redactStyle ?? "solid",
      f = d === "solid" ? null : Et(e, d);
    if (f) {
      let t = e.imageSmoothingEnabled;
      ((e.imageSmoothingEnabled = !1),
        (e.fillStyle = f),
        e.fill(),
        (e.imageSmoothingEnabled = t));
    }
    u && e.restore();
  }
  var kt = 1.5;
  function At(e, t) {
    return Math.round(e + 2 * t);
  }
  function jt(e, t, n) {
    let r = t / 2 + kt;
    return { x: X(e.x, r, n.width), y: X(e.y, r, n.height) };
  }
  function X(e, t, n) {
    return n < 2 * t ? e : Math.min(Math.max(e, t), n - t);
  }
  function Mt(e) {
    let t = 0;
    for (let n of e) n.kind === "step" && t++;
    return t + 1;
  }
  function Nt(e) {
    let t = 0;
    return e.map((e) =>
      e.kind === "step" ? (t++, e.value === t ? e : { ...e, value: t }) : e,
    );
  }
  var Pt = "#FFFFFF",
    Ft = "#1F1E1D";
  function It(e) {
    let t = Lt(e),
      n = t !== null && zt(t, Rt) > zt(t, 1) ? Ft : Pt;
    return { fill: e, rim: n, numeral: n };
  }
  function Lt(e) {
    let t = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(e.trim());
    if (!t) return null;
    let n = t[1].length === 3 ? t[1].replace(/./g, "$&$&") : t[1],
      [r, i, a] = [0, 2, 4].map((e) => {
        let t = Number.parseInt(n.slice(e, e + 2), 16) / 255;
        return t <= 0.04045 ? t / 12.92 : ((t + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * i + 0.0722 * a;
  }
  var Rt = Lt(Ft) ?? 0;
  function zt(e, t) {
    let [n, r] = e > t ? [e, t] : [t, e];
    return (n + 0.05) / (r + 0.05);
  }
  var Bt = 0.55,
    Z = 0.72;
  function Q(e, t, n) {
    let r = It(t.color),
      i = t.size / 2;
    (e.save(),
      e.beginPath(),
      e.arc(t.x, t.y, i, 0, Math.PI * 2),
      (e.fillStyle = r.fill),
      e.fill(),
      (e.lineWidth = kt),
      (e.strokeStyle = r.rim),
      e.stroke());
    let a = String(t.value),
      o = t.size * Bt;
    ((e.font = `600 ${o}px ${n}`),
      (e.textAlign = "center"),
      (e.textBaseline = "alphabetic"));
    let s = e.measureText(a),
      c = Math.min(1, (t.size * Z) / s.width);
    c < 1 && (e.font = `600 ${o * c}px ${n}`);
    let l = (s.actualBoundingBoxAscent - s.actualBoundingBoxDescent) / 2;
    ((e.fillStyle = r.numeral), e.fillText(a, t.x, t.y + l * c), e.restore());
  }
  var Vt = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  function Ht(e) {
    return e.stopPropagation();
  }
  function Ut(e) {
    return e.trimEnd();
  }
  function Wt(e) {
    if (!e) return !1;
    let t = Ut(e.value);
    return e.editing ? t !== Ut(e.editing.text) : !!t;
  }
  var Gt = 4,
    Kt = Number.parseInt(T.dur.base.value, 10);
  function qt(e) {
    return Kt > 0 ? 1 - (1 - Math.min(1, Math.max(0, e / Kt))) ** 3 : 1;
  }
  function Jt(e) {
    let t = e.x1 === e.x2,
      n = e.y1 === e.y2;
    if (e.kind !== "redact") return t && n;
    let r = Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < Gt;
    return t || n || r;
  }
  function Yt(e) {
    return (
      e.moved &&
      (e.dx !== 0 || e.dy !== 0) &&
      e.current !== e.item &&
      !(
        e.handle !== null &&
        e.current.kind !== "text" &&
        e.current.kind !== "freehand" &&
        e.current.kind !== "step" &&
        Jt(e.current)
      )
    );
  }
  function Xt(e) {
    return e.kind === "freehand" || !Jt(e);
  }
  function Zt(e, t, n = 1) {
    if (
      ((e.lineCap = "round"),
      (e.lineJoin = "round"),
      (e.strokeStyle = t.color),
      (e.fillStyle = t.color),
      t.kind === "freehand")
    ) {
      let n = t.points;
      if (n.length === 0) return;
      if (((e.lineWidth = t.width), n.length === 1)) {
        (e.beginPath(),
          e.arc(n[0].x, n[0].y, t.width / 2, 0, Math.PI * 2),
          e.fill());
        return;
      }
      (e.beginPath(), e.moveTo(n[0].x, n[0].y));
      for (let t = 1; t < n.length; t++) e.lineTo(n[t].x, n[t].y);
      e.stroke();
      return;
    }
    if (t.kind === "line") {
      if (
        ((e.lineWidth = t.width), e.beginPath(), e.moveTo(t.x1, t.y1), t.bend)
      ) {
        let n = G(t);
        e.quadraticCurveTo(n.x, n.y, t.x2, t.y2);
      } else e.lineTo(t.x2, t.y2);
      e.stroke();
      return;
    }
    if (t.kind === "rect") {
      e.lineWidth = t.width;
      let n = Math.min(t.x1, t.x2),
        r = Math.min(t.y1, t.y2),
        i = Math.abs(t.x2 - t.x1),
        a = Math.abs(t.y2 - t.y1);
      e.strokeRect(n, r, i, a);
      return;
    }
    if (t.kind === "redact") {
      Ot(e, t, n);
      return;
    }
    if (t.kind === "arrow") {
      let n = Ue(t),
        r = Math.min(t.width * 4, n),
        {
          shaftEnd: i,
          direction: { x: a, y: o },
        } = Ge(t, Math.min(r * 0.7, n));
      if (
        ((e.lineWidth = t.width), e.beginPath(), e.moveTo(t.x1, t.y1), t.bend)
      ) {
        let n = K(t, i.t);
        e.quadraticCurveTo(n.x, n.y, i.x, i.y);
      } else e.lineTo(i.x, i.y);
      (e.stroke(),
        e.beginPath(),
        e.moveTo(t.x2, t.y2),
        e.lineTo(t.x2 - r * a + (r / 2) * o, t.y2 - r * o - (r / 2) * a),
        e.lineTo(t.x2 - r * a - (r / 2) * o, t.y2 - r * o + (r / 2) * a),
        e.closePath(),
        e.fill());
      return;
    }
    if (t.kind === "ellipse") {
      e.lineWidth = t.width;
      let n = (t.x1 + t.x2) / 2,
        r = (t.y1 + t.y2) / 2,
        i = Math.abs(t.x2 - t.x1) / 2,
        a = Math.abs(t.y2 - t.y1) / 2;
      (e.beginPath(), e.ellipse(n, r, i, a, 0, 0, Math.PI * 2), e.stroke());
      return;
    }
    if (t.kind === "text") {
      ((e.font = `${t.size}px ${Vt}`), (e.textBaseline = "top"));
      let n = t.text.split(`
`);
      for (let r = 0; r < n.length; r++)
        e.fillText(n[r], t.x, t.y + r * t.size * 1.2);
      return;
    }
    t.kind === "step" && Q(e, t, Vt);
  }
  var Qt = 4,
    $t = 8;
  function en(e) {
    return {
      x: e.x - Qt,
      y: e.y - Qt,
      width: e.width + 8,
      height: e.height + 8,
    };
  }
  var tn = 3,
    nn = 10,
    rn = 500,
    an = 4;
  function on(e) {
    return e.pointerType === "touch" ? nn : an;
  }
  var sn = `url("data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 20 20'><path transform='translate(-1.5 1.5)' d='${V.master20.flatMap((e) => ("d" in e ? [e.d] : [])).join("")}' fill='%231f1e1d' stroke='%23fff' stroke-width='1.67' stroke-linejoin='round' paint-order='stroke'/></svg>`}") 1 23, crosshair`,
    cn = Be.master20
      .map((e) =>
        "d" in e
          ? `<path d='${e.d}'/>`
          : "x1" in e
            ? `<line x1='${e.x1}' y1='${e.y1}' x2='${e.x2}' y2='${e.y2}'/>`
            : "",
      )
      .join(""),
    ln = `url("data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='-2 -2 24 24' fill='none' stroke-linecap='round' stroke-linejoin='round'><g stroke='%23fff' stroke-width='3.5'>${cn}</g><g stroke='%231f1e1d' stroke-width='1.5'>${cn}</g></svg>`}") 12 12, crosshair`,
    un = 2,
    dn = 3.5,
    fn = 3,
    pn = 1,
    mn = 8,
    hn = 16,
    gn = 4.5,
    _n = 48;
  function vn(e, t, n, { accent: r, onAccent: i, bend: a }) {
    e.save();
    let o = t.kind === "text" ? en(n(t)) : void 0;
    if (((e.strokeStyle = r), (e.lineWidth = 1.5), e.setLineDash([5, 4]), o))
      e.strokeRect(o.x, o.y, o.width, o.height);
    else if (t.kind === "step") {
      let n = t.size / 2 + Qt;
      (e.beginPath(), e.arc(t.x, t.y, n, 0, Math.PI * 2), e.stroke());
    }
    (e.setLineDash([]), (e.strokeStyle = i), (e.lineWidth = pn));
    for (let n of ct(t, _n, o)) {
      let t = n.id === "bend";
      ((e.fillStyle = t ? a : r),
        e.beginPath(),
        e.arc(n.x, n.y, t ? fn : dn, 0, Math.PI * 2),
        e.fill(),
        e.stroke());
    }
    e.restore();
  }
  function yn(t) {
    let $ = J9(165),
      {
        className: n,
        style: o,
        tool: l,
        color: f,
        strokeWidth: p,
        redactStyle: ee,
        backdropCover: h,
        textSize: g,
        author: te,
        readOnly: _,
        rescaleOnResize: v,
        onStrokeEnd: ne,
        onToolDone: y,
        onSelectionChange: ie,
        onHistoryChange: ae,
        onGestureActiveChange: x,
        textTargets: S,
        onTextTargetRedacted: oe,
        ref: C,
      } = t,
      w = l === void 0 ? "pen" : l,
      ce = ee === void 0 ? "solid" : ee,
      T = h !== void 0 && h,
      E = g === void 0 ? 16 : g,
      D = te === void 0 ? "user" : te,
      de = v !== void 0 && v,
      fe = se(),
      O = r(null),
      k = r(null),
      A = r(pt),
      pe = r(ae),
      me,
      he;
    (J1($, 0, ae)
      ? ((me = () => {
          pe.current = ae;
        }),
        (he = [ae]),
        K2($, 0, ae, me, he))
      : ((me = $[1]), (he = $[2])),
      c(me, he));
    let ge = r(ie),
      _e,
      ve;
    (J1($, 3, ie)
      ? ((ve = () => {
          ge.current = ie;
        }),
        (_e = [ie]),
        K2($, 3, ie, _e, ve))
      : ((_e = $[4]), (ve = $[5])),
      c(ve, _e));
    let ye = r(T),
      be,
      xe;
    (J1($, 6, T)
      ? ((be = () => {
          ye.current = T;
        }),
        (xe = [T]),
        K2($, 6, T, be, xe))
      : ((be = $[7]), (xe = $[8])),
      c(be, xe));
    let Se = r(y),
      Ce,
      j;
    (J1($, 9, y)
      ? ((Ce = () => {
          Se.current = y;
        }),
        (j = [y]),
        K2($, 9, y, Ce, j))
      : ((Ce = $[10]), (j = $[11])),
      c(Ce, j));
    let we = r(x),
      Te,
      Ee;
    (J1($, 12, x)
      ? ((Te = () => {
          we.current = x;
        }),
        (Ee = [x]),
        K2($, 12, x, Te, Ee))
      : ((Te = $[13]), (Ee = $[14])),
      c(Te, Ee));
    let De = r(!1),
      M = J0($, 15)
        ? K0($, 15, (e) => {
            De.current !== e && ((De.current = e), we.current?.(e));
          })
        : $[15],
      N = r(null),
      Oe = r(null),
      ke = r(null),
      P = r(null),
      Ae = r(null),
      je,
      Me;
    ($[16] === J8
      ? ((je = () => () => {
          Ae.current && ((Ae.current = null), ge.current?.(null));
        }),
        (Me = []),
        ($[16] = je),
        ($[17] = Me))
      : ((je = $[16]), (Me = $[17])),
      c(je, Me));
    let F = r(null),
      Ne = r(!1),
      I,
      L;
    ($[18] === J8
      ? ((I = () => {
          let e = b(O.current),
            t = () => {
              ((F.current || N.current) && (Ne.current = !0), M(!1));
            };
          return (
            e?.addEventListener("blur", t),
            () => {
              (e?.removeEventListener("blur", t), M(!1));
            }
          );
        }),
        (L = [M]),
        ($[18] = I),
        ($[19] = L))
      : ((I = $[18]), (L = $[19])),
      c(I, L));
    let Pe = ue("fill-accent"),
      Fe = ue("on-accent"),
      R = ue("fill-success"),
      Ie = J3($, 20, Pe, R, Fe)
        ? K3($, 20, Pe, R, Fe, { accent: Pe, onAccent: Fe, bend: R })
        : $[23],
      Le = r(Ie),
      [Re, z] = d("default"),
      ze = J0($, 24) ? K0($, 24, { w: 0, h: 0 }) : $[24],
      B = r(ze),
      V = r(null),
      Be = r(Cn),
      [H, U] = d(null),
      W = r(null),
      He,
      G;
    (J1($, 25, H)
      ? ((He = () => {
          W.current = H;
        }),
        (G = [H]),
        K2($, 25, H, He, G))
      : ((He = $[26]), (G = $[27])),
      c(He, G));
    let Ue = J0($, 28)
        ? K0($, 28, () => {
            let e = vt(A.current);
            pe.current?.(
              Wt(W.current) ? { ...e, canUndo: !0, canRedo: !1 } : e,
            );
          })
        : $[28],
      We = J0($, 29)
        ? K0($, 29, (e) => {
            e !== A.current && ((A.current = e), Ue());
          })
        : $[29],
      K = J0($, 30)
        ? K0($, 30, (e) => {
            We(mt(A.current, Nt(e)));
          })
        : $[30],
      Ge = J1($, 31, H) ? K1($, 31, H, Wt(H)) : $[32],
      Ke = J0($, 33)
        ? K0($, 33, () => {
            Ue();
          })
        : $[33],
      q = J1($, 34, Ge) ? K1($, 34, Ge, [Ge, Ue]) : $[35];
    c(Ke, q);
    let qe = r(null),
      Ye = r(!1),
      Xe = H?.editing ?? null,
      Ze,
      tt;
    (J1($, 36, Xe)
      ? ((Ze = () => {
          Xe && Ye.current && ((Ye.current = !1), qe.current?.select());
        }),
        (tt = [Xe]),
        K2($, 36, Xe, Ze, tt))
      : ((Ze = $[37]), (tt = $[38])),
      c(Ze, tt));
    let rt = r(null),
      it = J1($, 39, o)
        ? K1($, 39, o, {
            position: "relative",
            overflow: "clip",
            touchAction: "none",
            outline: "none",
            ...o,
          })
        : $[40],
      [ot, st] = d(null),
      ut = w === "redact" && !!S && ot === S,
      yt;
    bb0: {
      if (w === "select") {
        yt = J1($, 41, Re) ? K1($, 41, Re, { cursor: Re }) : $[42];
        break bb0;
      }
      if (w === "pen") {
        yt = J0($, 43) ? K0($, 43, { cursor: sn }) : $[43];
        break bb0;
      }
      if (ut) {
        yt = J0($, 44) ? K0($, 44, { cursor: ln }) : $[44];
        break bb0;
      }
      let e = w === "text" ? "text" : "crosshair";
      yt = J1($, 45, e) ? K1($, 45, e, { cursor: e }) : $[46];
    }
    let bt = yt,
      Y = J0($, 47) ? K0($, 47, new WeakMap()) : $[47],
      xt = r(Y),
      St = J0($, 48)
        ? K0($, 48, (e) => {
            let t = xt.current.get(e);
            if (t) return t;
            let n = e.text.split(`
`),
              r = k.current,
              i = 0;
            if (r) {
              (r.save(), (r.font = `${e.size}px ${Vt}`));
              for (let e of n) i = Math.max(i, r.measureText(e).width);
              r.restore();
            } else i = le(n.map(Sn)) * e.size * 0.6;
            let a = {
              x: e.x,
              y: e.y,
              width: i,
              height: n.length * e.size * 1.2,
            };
            return (xt.current.set(e, a), a);
          })
        : $[48],
      Ct;
    bb1: {
      if (!H) {
        Ct = void 0;
        break bb1;
      }
      let e = H.editing?.size ?? E,
        t = `min(40px, calc(100% - ${H.x}px))`,
        n = `calc(100% - ${H.x}px)`,
        r = `max(1.2em, calc(100% - ${H.y}px))`,
        i = H.editing?.color ?? f,
        a = `${e}px/1.2 ${Vt}`;
      Ct =
        J5($, 49, t, n, r, i, a) || J1($, 54, H.x) || J1($, 55, H.y)
          ? I1(
              $,
              55,
              Z1(
                $,
                54,
                Z5(
                  $,
                  49,
                  {
                    left: H.x,
                    top: H.y,
                    minWidth: t,
                    maxWidth: n,
                    maxHeight: r,
                    whiteSpace: "pre",
                    color: i,
                    font: a,
                  },
                  t,
                  n,
                  r,
                  i,
                  a,
                ),
                H.x,
              ),
              H.y,
            )
          : $[56];
    }
    let wt = Ct,
      Tt = J2($, 57, D, f)
        ? K2($, 57, D, f, (e, t) => {
            let { width: n, height: r } = St({
                kind: "text",
                x: 0,
                y: 0,
                text: e.value,
                size: t,
                color: f,
                author: D,
              }),
              i = { width: Math.ceil(n + t), height: r },
              { w: a, h: o } = B.current,
              s = a > 0 && o > 0 ? nt(e, i, { width: a, height: o }) : e;
            return { x: s.x, y: s.y, ...i };
          })
        : $[59],
      Et,
      Dt;
    (J3($, 60, H, Tt, E)
      ? ((Et = () => {
          let e = qe.current;
          if (!e || !H) return;
          let t = Tt(H, H.editing?.size ?? E);
          Object.assign(e.style, {
            left: `${t.x}px`,
            top: `${t.y}px`,
            width: `${t.width}px`,
            minWidth: `min(40px, calc(100% - ${t.x}px))`,
            maxWidth: `calc(100% - ${t.x}px)`,
            maxHeight: `max(1.2em, calc(100% - ${t.y}px))`,
          });
        }),
        (Dt = [H, E, Tt]),
        K4($, 60, H, Tt, E, Et, Dt))
      : ((Et = $[63]), (Dt = $[64])),
      s(Et, Dt));
    let Ot = J0($, 65)
        ? K0($, 65, (e, t, n) => {
            let r = n !== void 0 && n,
              i = A.current.present,
              a = W.current?.editing;
            for (let n = i.length - 1; n >= 0; n--) {
              let o = i[n];
              if (!(o === a || (r && o.kind !== "text")) && $e(o, e, St, t))
                return o;
            }
            return null;
          })
        : $[65],
      kt = J0($, 66)
        ? K0($, 66, (e, t) => {
            let n = P.current;
            if (!n || n.kind === "freehand" || n.kind === "step") return null;
            let r, i;
            n.kind === "text" ? ((r = en(St(n))), (i = r)) : (i = Qe(n));
            let { width: a, height: o } = i,
              s;
            if (n.kind === "line" || n.kind === "arrow") {
              let e = ct(n, _n).find(xn);
              s = e
                ? Math.max(
                    Math.hypot(e.x - n.x1, e.y - n.y1),
                    Math.hypot(e.x - n.x2, e.y - n.y2),
                  ) / 3
                : Math.hypot(a, o) / 4;
            } else
              s = Math.min(
                Math.min(a, o) / 4,
                a >= _n ? a / 6 : 1 / 0,
                o >= _n ? o / 6 : 1 / 0,
              );
            return lt(
              n,
              t,
              Math.max(gn, Math.min(e.pointerType === "touch" ? hn : mn, s)),
              _n,
              r,
            );
          })
        : $[66],
      X = J0($, 67)
        ? K0($, 67, () => {
            let e = k.current;
            if (!e) return;
            let { w: t, h: n } = B.current;
            e.clearRect(0, 0, t, n);
            let r = F.current,
              i = W.current?.editing,
              a = V.current;
            for (let t of A.current.present)
              t !== i &&
                Zt(
                  e,
                  r?.item === t ? r.current : t,
                  a?.item === t ? a.progress : 1,
                );
            let o = N.current;
            o && Xt(o) && Zt(e, o);
            let s = P.current;
            (s && vn(e, r?.item === s ? r.current : s, St, Le.current),
              s !== Ae.current && ((Ae.current = s), ge.current?.(s)));
          })
        : $[67],
      Pt = J0($, 68)
        ? K0($, 68, (e) => {
            let t = re(O.current);
            if (m()) return;
            Be.current();
            let n = { item: e, progress: 0 };
            ((V.current = n), X());
            let r = t.performance.now(),
              i = () => {
                let e = t.requestAnimationFrame(a);
                Be.current = () => t.cancelAnimationFrame(e);
              },
              a = (e) => {
                V.current === n &&
                  ((n.progress = qt(e - r)),
                  n.progress >= 1 ? (V.current = null) : i(),
                  X());
              };
            i();
          })
        : $[68],
      Ft,
      It;
    ($[69] === J8
      ? ((Ft = () => () => {
          Be.current();
        }),
        (It = []),
        ($[69] = Ft),
        ($[70] = It))
      : ((Ft = $[69]), (It = $[70])),
      c(Ft, It));
    let Lt, Rt;
    (J3($, 71, Pe, R, Fe)
      ? ((Lt = () => {
          ((Le.current = { accent: Pe, onAccent: Fe, bend: R }),
            P.current && X());
        }),
        (Rt = [Pe, Fe, R, X]),
        K4($, 71, Pe, R, Fe, Lt, Rt))
      : ((Lt = $[74]), (Rt = $[75])),
      c(Lt, Rt));
    let zt, Bt;
    (J1($, 76, de)
      ? ((zt = () => {
          let e = O.current;
          if (!e) return;
          let t = () => {
            let t = { width: e.offsetWidth, height: e.offsetHeight };
            if (t.width === 0 || t.height === 0) return;
            let n = B.current;
            if (de && n && n.w > 0 && n.h > 0) {
              let e = t.width / n.w,
                r = t.height / n.h;
              if (e !== 1 || r !== 1) {
                let t = P.current ? A.current.present.indexOf(P.current) : -1,
                  n = W.current?.editing,
                  i = n ? A.current.present.indexOf(n) : -1,
                  a = V.current,
                  o = a ? A.current.present.indexOf(a.item) : -1,
                  s = Oe.current,
                  c = s ? A.current.present.indexOf(s.item) : -1;
                ((A.current = _t(A.current, (t) => at(t, e, r))),
                  (P.current = t >= 0 ? A.current.present[t] : null));
                let l = i >= 0 ? A.current.present[i] : null;
                if (
                  (F.current && ((F.current = null), M(!1)),
                  z("default"),
                  (N.current &&= at(N.current, e, r)),
                  a && o >= 0 && (a.item = A.current.present[o]),
                  s)
                ) {
                  let t = A.current.present[c];
                  Oe.current =
                    t?.kind === "step"
                      ? {
                          ...s,
                          item: t,
                          press: { x: s.press.x * e, y: s.press.y * r },
                        }
                      : null;
                }
                U(
                  (t) =>
                    t && {
                      ...t,
                      x: t.x * e,
                      y: t.y * r,
                      editing: t.editing && l,
                    },
                );
                let u = W.current;
                u &&
                  (W.current = {
                    ...u,
                    x: u.x * e,
                    y: u.y * r,
                    editing: u.editing && l,
                  });
              }
            }
            let r = window.devicePixelRatio || 1;
            ((e.width = Math.round(t.width * r)),
              (e.height = Math.round(t.height * r)),
              (B.current = { w: t.width, h: t.height }));
            let i = e.getContext("2d");
            i &&
              (i.setTransform(r, 0, 0, r, 0, 0),
              (k.current = i),
              X(),
              W.current && (n.w !== t.width || n.h !== t.height) && U(bn));
          };
          t();
          let n = new ResizeObserver(t);
          return (n.observe(e), () => n.disconnect());
        }),
        (Bt = [X, de, M]),
        K2($, 76, de, zt, Bt))
      : ((zt = $[77]), (Bt = $[78])),
      c(zt, Bt));
    let Z = J1($, 79, ne)
        ? K1($, 79, ne, (e) => {
            (K([...A.current.present, e]), ne?.(e, A.current.present));
          })
        : $[80],
      Q = J5($, 81, D, f, Z, Tt, E)
        ? K5($, 81, D, f, Z, Tt, E, () => {
            let e = W.current;
            ((W.current = null), U(null));
            let t = e ? Ut(e.value) : "";
            if (e?.editing) {
              let n = e.editing,
                r = n;
              if (!A.current.present.includes(n)) r = null;
              else if (!t)
                ((r = null), K(A.current.present.filter((e) => e !== n)));
              else if (t !== Ut(n.text)) {
                let { x: i, y: a } = Tt(e, n.size),
                  o = { ...n, x: i, y: a, text: t };
                ((r = o), K(A.current.present.map((e) => (e === n ? o : e))));
              }
              return (X(), r);
            }
            if (!e || !t) return null;
            let { x: n, y: r } = Tt(e, E),
              i = {
                kind: "text",
                x: n,
                y: r,
                text: t,
                size: E,
                color: f,
                author: D,
              };
            Z(i);
            let a = k.current;
            return (a && Zt(a, i), i);
          })
        : $[86],
      Gt = J0($, 87)
        ? K0($, 87, (e) => {
            let t = Se.current;
            t && (e && Je(e) && ((P.current = e), X()), t());
          })
        : $[87],
      Kt = J0($, 88)
        ? K0($, 88, (e) => {
            let t = O.current.getBoundingClientRect();
            return { x: e.clientX - t.left, y: e.clientY - t.top };
          })
        : $[88],
      cn = J1($, 89, S)
        ? K1($, 89, S, (e) => {
            let { w: t, h: n } = B.current;
            if (!S || S.boxes.length === 0 || t <= 0 || n <= 0) return null;
            let r = Math.min(S.imageWidth / t, S.imageHeight / n);
            if (!(r > 0)) return null;
            let i = null,
              a = 1 / 0;
            for (let t of S.boxes) {
              let n = t.x / r,
                o = t.y / r,
                s = t.w / r,
                c = t.h / r;
              e.x >= n &&
                e.x <= n + s &&
                e.y >= o &&
                e.y <= o + c &&
                s * c < a &&
                ((i = { x: n, y: o, width: s, height: c }), (a = s * c));
            }
            return i;
          })
        : $[90],
      dn = J0($, 91)
        ? K0($, 91, (e) => {
            ((F.current = null), (P.current = null), z("default"));
            let t = { x: e.x, y: e.y, value: e.text, editing: e };
            ((W.current = t), (Ye.current = !0), U(t), X());
          })
        : $[91],
      fn = J2($, 92, _, w)
        ? K2($, 92, _, w, (e) => {
            if (_ || w !== "select" || W.current) return;
            let t = O.current.getBoundingClientRect(),
              n = Ot({ x: e.clientX - t.left, y: e.clientY - t.top }, !1);
            !n || n.kind !== "text" || (e.preventDefault(), dn(n));
          })
        : $[94],
      pn = J0($, 95)
        ? K0($, 95, (e) => {
            (Yt(e) &&
              ((P.current = e.current),
              K(A.current.present.map((t) => (t === e.item ? e.current : t)))),
              X());
          })
        : $[95],
      yn = J1($, 96, Z)
        ? K1($, 96, Z, () => {
            Ne.current = !1;
            let e = F.current;
            e && ((F.current = null), z("default"), pn(e));
            let t = N.current;
            ((N.current = null),
              (ke.current = null),
              M(!1),
              t && Xt(t) ? Z(t) : X());
          })
        : $[97],
      wn = J1($, 98, yn)
        ? K1($, 98, yn, (e, t) => {
            if (!Ne.current) return;
            let n = F.current?.pointerId ?? ke.current,
              r = n !== null && e.pointerId === n;
            (t === "move" ? r && e.buttons & 1 : t === "up" && r)
              ? (Ne.current = !1)
              : yn();
          })
        : $[99],
      Tn = J2($, 100, _, w)
        ? K2($, 100, _, w, (e) => {
            _ ||
              e.button !== 0 ||
              (e.preventDefault(),
              w !== "text" && rt.current?.focus({ preventScroll: !0 }));
          })
        : $[102],
      En = J5($, 103, D, f, Z, Q, _, ce, wn, p, E, w)
        ? K5($, 103, D, f, Z, Q, _, ce, wn, p, E, w, (e) => {
            if (_ || (wn(e, "down"), e.button !== 0)) return;
            let t = Kt(e);
            if (w === "select") {
              W.current && Q();
              let n = F.current;
              if (n) {
                if (e.pointerId !== n.pointerId) return;
                F.current = null;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              let r = kt(e, t),
                i = r ? P.current : Ot(t, e.pointerType === "touch");
              ((P.current = i),
                i &&
                  ((F.current = {
                    pointerId: e.pointerId,
                    coarse: e.pointerType === "touch",
                    handle: r?.id ?? null,
                    grip: r ? { x: r.x, y: r.y } : t,
                    item: i,
                    start: t,
                    current: i,
                    moved: !1,
                    dx: 0,
                    dy: 0,
                  }),
                  z(r ? r.cursor : "grabbing")),
                X());
              return;
            }
            if (w === "text") {
              e.preventDefault();
              let n = Ot(t, e.pointerType === "touch", !0);
              if (n?.kind === "text") {
                (Q(), dn(n));
                return;
              }
              if (W.current && Se.current) {
                let e = Q();
                (rt.current?.focus({ preventScroll: !0 }), Gt(e));
                return;
              }
              (Q(), U({ x: t.x, y: t.y, value: "", editing: null }));
              return;
            }
            if (w === "step") {
              if (e.isPrimary === !1) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              let n = A.current.present,
                r = Oe.current;
              if (
                r &&
                n.at(-1) === r.item &&
                Date.now() - r.at < rn &&
                Math.hypot(t.x - r.press.x, t.y - r.press.y) <= r.item.size / 2
              )
                return;
              let i = At(E, p),
                { w: a, h: o } = B.current,
                s = {
                  kind: "step",
                  ...jt(t, i, { width: a, height: o }),
                  value: Mt(n),
                  size: i,
                  color: f,
                  author: D,
                };
              (Z(s), (Oe.current = { item: s, press: t, at: Date.now() }));
              let c = k.current;
              c && Zt(c, s);
              return;
            }
            if (!(N.current && e.pointerId !== ke.current)) {
              if (
                (e.currentTarget.setPointerCapture(e.pointerId),
                (ke.current = e.pointerId),
                w === "pen")
              ) {
                N.current = {
                  kind: "freehand",
                  points: [t],
                  color: f,
                  width: p,
                  author: D,
                };
                let e = k.current;
                e && Zt(e, N.current);
              } else
                N.current = {
                  kind: w,
                  x1: t.x,
                  y1: t.y,
                  x2: t.x,
                  y2: t.y,
                  color: f,
                  width: p,
                  author: D,
                  ...(w === "redact" && { redactStyle: ce }),
                };
            }
          })
        : $[113],
      Dn = J0($, 114)
        ? K0($, 114, (e, t) => {
            let n = Ve(e.kind, { x: e.x1, y: e.y1 }, Kt(t), t.shiftKey);
            ((e.x2 = n.x), (e.y2 = n.y));
          })
        : $[114],
      On = J4($, 115, wn, cn, S, w)
        ? K4($, 115, wn, cn, S, w, (e) => {
            wn(e, "move");
            let t = F.current;
            if (t) {
              if (e.pointerId !== t.pointerId) return;
              let n = Kt(e),
                r = n.x - t.start.x,
                i = n.y - t.start.y,
                a = t.coarse ? nn : tn;
              if (!t.moved && Math.hypot(r, i) < a) return;
              ((t.moved = !0), M(!0), (t.dx = r), (t.dy = i));
              let o = { x: t.grip.x + r, y: t.grip.y + i };
              if (
                t.handle === null ||
                t.item.kind === "freehand" ||
                t.item.kind === "step"
              ) {
                let { w: e, h: n } = B.current,
                  a = et(t.item, r, i, { width: e, height: n }, St);
                ((t.dx = a.dx),
                  (t.dy = a.dy),
                  (t.current = J(t.item, a.dx, a.dy)));
              } else
                t.current =
                  t.item.kind === "text"
                    ? ft(t.item, St, Qt, t.handle, o, $t)
                    : dt(t.item, t.handle, o, e.shiftKey);
              X();
              return;
            }
            if (w === "select") {
              let t = Kt(e),
                n = kt(e, t);
              z(
                n
                  ? n.cursor
                  : Ot(t, e.pointerType === "touch")
                    ? "grab"
                    : "default",
              );
              return;
            }
            let n = N.current;
            w === "redact" && !n && st(S && cn(Kt(e)) ? S : null);
            let r = k.current;
            if (!(!n || !r || e.pointerId !== ke.current)) {
              if (n.kind === "freehand") {
                let t = Kt(e),
                  i = n.points[n.points.length - 1];
                (n.points.push(t),
                  !De.current &&
                    Math.hypot(t.x - n.points[0].x, t.y - n.points[0].y) >=
                      on(e) &&
                    M(!0),
                  (r.lineCap = "round"),
                  (r.strokeStyle = n.color),
                  (r.lineWidth = n.width),
                  r.beginPath(),
                  r.moveTo(i.x, i.y),
                  r.lineTo(t.x, t.y),
                  r.stroke());
              } else
                (Dn(n, e),
                  !De.current &&
                    Math.hypot(n.x2 - n.x1, n.y2 - n.y1) >= on(e) &&
                    M(!0),
                  X());
            }
          })
        : $[119],
      kn,
      An;
    J4($, 120, Z, oe, wn, cn)
      ? ((kn = (e) => {
          wn(e, "up");
          let t = F.current;
          if (t) {
            e.pointerId === t.pointerId &&
              ((F.current = null), M(!1), z("default"), X());
            return;
          }
          An(e);
        }),
        (An = (e) => {
          wn(e, "up");
          let t = F.current;
          if (t) {
            if (e.pointerId !== t.pointerId) return;
            ((F.current = null), M(!1), t.handle === null && z("grab"), pn(t));
            return;
          }
          let n = N.current;
          if (n && e.pointerId !== ke.current) return;
          let r =
            De.current ||
            (!!n &&
              n.kind !== "freehand" &&
              Math.hypot(n.x2 - n.x1, n.y2 - n.y1) >= on(e));
          if ((M(!1), !n)) return;
          ((N.current = null), (ke.current = null));
          let i =
            n.kind === "redact" && !r && e.type === "pointerup"
              ? cn({ x: n.x1, y: n.y1 })
              : null;
          if (i && n.kind === "redact") {
            st(null);
            let e = {
              ...n,
              x1: i.x - un,
              y1: i.y - un,
              x2: i.x + i.width + un,
              y2: i.y + i.height + un,
            };
            (Z(e), X(), Pt(e), Gt(e), oe?.());
            return;
          }
          if (
            (n.kind !== "freehand" &&
              n.kind !== "redact" &&
              Math.hypot(n.x2 - n.x1, n.y2 - n.y1) < an) ||
            (n.kind !== "freehand" && Jt(n))
          ) {
            X();
            return;
          }
          (Z(n), n.kind !== "freehand" && Gt(n));
        }),
        K5($, 120, Z, oe, wn, cn, kn, An))
      : ((kn = $[124]), (An = $[125]));
    let jn = r(Q),
      Mn,
      Nn;
    (J1($, 126, Q)
      ? ((Mn = () => {
          jn.current = Q;
        }),
        (Nn = [Q]),
        K2($, 126, Q, Mn, Nn))
      : ((Mn = $[127]), (Nn = $[128])),
      c(Mn, Nn));
    let Pn = r(Gt),
      Fn,
      In;
    ($[129] === J8
      ? ((Fn = () => {
          Pn.current = Gt;
        }),
        (In = [Gt]),
        ($[129] = Fn),
        ($[130] = In))
      : ((Fn = $[129]), (In = $[130])),
      c(Fn, In));
    let Ln = r(X),
      Rn,
      zn;
    ($[131] === J8
      ? ((Rn = () => {
          Ln.current = X;
        }),
        (zn = [X]),
        ($[131] = Rn),
        ($[132] = zn))
      : ((Rn = $[131]), (zn = $[132])),
      c(Rn, zn));
    let Bn = r(yn),
      Vn,
      Hn;
    (J1($, 133, yn)
      ? ((Vn = () => {
          Bn.current = yn;
        }),
        (Hn = [yn]),
        K2($, 133, yn, Vn, Hn))
      : ((Vn = $[134]), (Hn = $[135])),
      c(Vn, Hn));
    let Un, Wn;
    (J1($, 136, w)
      ? ((Un = () => {
          (w !== "text" && jn.current(),
            w !== "select" &&
              (P.current || F.current) &&
              ((P.current = null),
              (F.current = null),
              M(!1),
              z("default"),
              X()));
        }),
        (Wn = [w, X, M]),
        K2($, 136, w, Un, Wn))
      : ((Un = $[137]), (Wn = $[138])),
      c(Un, Wn));
    let Gn = J0($, 139)
        ? K0($, 139, (e) => {
            let t = e.target.value;
            U((e) => e && { ...e, value: t });
          })
        : $[139],
      Kn = J0($, 140)
        ? K0($, 140, (e) => {
            if (
              (e.stopPropagation(),
              e.nativeEvent.stopImmediatePropagation(),
              e.nativeEvent.isComposing || e.keyCode === 229)
            )
              return;
            let t;
            if (e.key === "Escape")
              (e.preventDefault(),
                (t = W.current?.editing ?? null),
                (W.current = null),
                U(null),
                t && Ln.current());
            else if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              (e.preventDefault(), (t = jn.current()));
            else return;
            (rt.current?.focus({ preventScroll: !0 }), Pn.current(t));
          })
        : $[140],
      qn,
      Jn;
    (J1($, 141, E)
      ? ((qn = () => {
          let t = () => {
              if (!W.current) return;
              let e = document.activeElement === qe.current;
              (jn.current(), e && rt.current?.focus({ preventScroll: !0 }));
            },
            n = (e, t) => {
              ((P.current = t),
                K(A.current.present.map((n) => (n === e ? t : n))),
                X());
            },
            r = () => {
              let e = F.current,
                t = N.current,
                n =
                  e && Yt(e)
                    ? A.current.present.map((t) =>
                        t === e.item ? e.current : t,
                      )
                    : A.current.present;
              return t && Xt(t) ? [...n, t] : n;
            },
            i = () => {
              Ne.current && Bn.current();
            };
          return {
            getStrokes: r,
            getSize: () => ({
              width: Math.round(B.current.w),
              height: Math.round(B.current.h),
            }),
            applyStrokes: (e) => {
              for (let t of e) K([...A.current.present, t]);
              X();
            },
            undo: () => (
              i(),
              !N.current &&
                !F.current &&
                (t(), (P.current = null), We(ht(A.current)), X()),
              A.current.present.length
            ),
            redo: () => (
              i(),
              !N.current &&
                !F.current &&
                (t(), (P.current = null), We(gt(A.current)), X()),
              A.current.present.length
            ),
            clear: () => {
              (t(),
                A.current.present.length > 0 && K([]),
                (N.current = null),
                (P.current = null),
                (F.current = null),
                M(!1),
                z("default"),
                (V.current = null),
                Be.current(),
                X());
            },
            deleteSelection: () => {
              i();
              let e = P.current;
              return !e || F.current
                ? !1
                : ((P.current = null),
                  z("default"),
                  K(A.current.present.filter((t) => t !== e)),
                  X(),
                  !0);
            },
            recolorSelection: (e) => {
              i();
              let t = P.current;
              return !t || F.current || t.color === e
                ? !1
                : (n(t, { ...t, color: e }), !0);
            },
            restyleSelection: (e) => {
              i();
              let t = P.current;
              return t?.kind !== "redact" ||
                F.current ||
                (t.redactStyle ?? "solid") === e
                ? !1
                : (n(t, { ...t, redactStyle: e }), !0);
            },
            resizeSelection: (e) => {
              i();
              let t = P.current;
              if (!t || F.current) return !1;
              if (t.kind === "step") {
                let r = At(E, e);
                if (t.size === r) return !1;
                let { w: i, h: a } = B.current;
                return (
                  n(t, { ...t, ...jt(t, r, { width: i, height: a }), size: r }),
                  !0
                );
              }
              return t.kind === "text" || t.kind === "redact" || t.width === e
                ? !1
                : (n(t, { ...t, width: e }), !0);
            },
            clearSelection: () =>
              F.current
                ? ((F.current = null), M(!1), z("grab"), X(), !0)
                : P.current
                  ? ((P.current = null), z("default"), X(), !0)
                  : !1,
            toPNG: (e) => {
              t();
              let n = O.current,
                i = k.current;
              if (!n || !i) return "";
              let { w: a, h: o } = B.current;
              (i.clearRect(0, 0, a, o),
                e && ((i.fillStyle = e), i.fillRect(0, 0, a, o)));
              for (let e of r()) Zt(i, e);
              let s = n.toDataURL("image/png");
              return (X(), s);
            },
            toComposite: async (n) => {
              t();
              let i = new Image();
              ((i.src = n), await i.decode());
              let a = document.createElement("canvas");
              ((a.width = i.naturalWidth), (a.height = i.naturalHeight));
              let o = a.getContext("2d"),
                { w: s, h: c } = B.current;
              if (!o || s <= 0 || c <= 0)
                throw e(
                  Error("SketchCanvas: cannot composite the marks"),
                  "SketchCanvas: cannot composite the marks",
                  "literal",
                );
              o.drawImage(i, 0, 0);
              let l = Math.min(i.naturalWidth / s, i.naturalHeight / c);
              o.scale(l, l);
              for (let e of r()) Zt(o, e);
              if (!ye.current) return a.toDataURL("image/png");
              let u = Math.min(a.width, Math.round(s * l)),
                d = Math.min(a.height, Math.round(c * l));
              if (u === a.width && d === a.height)
                return a.toDataURL("image/png");
              let f = document.createElement("canvas");
              ((f.width = u), (f.height = d));
              let p = f.getContext("2d");
              if (!p)
                throw e(
                  Error("SketchCanvas: cannot crop the composite"),
                  "SketchCanvas: cannot crop the composite",
                  "literal",
                );
              return (p.drawImage(a, 0, 0), f.toDataURL("image/png"));
            },
          };
        }),
        (Jn = [X, We, K, M, E]),
        K2($, 141, E, qn, Jn))
      : ((qn = $[142]), (Jn = $[143])),
      u(C, qn, Jn));
    let Yn = J1($, 144, fe)
        ? K1(
            $,
            144,
            fe,
            fe.formatMessage({
              defaultMessage: "Sketch canvas",
              id: "jvMtXRguc4",
            }),
          )
        : $[145],
      Xn = J5($, 146, bt, kn, fn, En, Tn, On, An, Yn)
        ? K5(
            $,
            146,
            bt,
            kn,
            fn,
            En,
            Tn,
            On,
            An,
            Yn,
            i("canvas", {
              ref: O,
              role: "application",
              "aria-label": Yn,
              className: "absolute inset-0 h-full w-full",
              style: bt,
              onPointerDown: En,
              onMouseDown: Tn,
              onPointerMove: On,
              onPointerUp: An,
              onDoubleClick: fn,
              onPointerCancel: kn,
              onLostPointerCapture: kn,
            }),
          )
        : $[154],
      Zn = J4($, 155, Q, fe, H, wt)
        ? K4(
            $,
            155,
            Q,
            fe,
            H,
            wt,
            H &&
              i("textarea", {
                ref: qe,
                autoFocus: !0,
                value: H.value,
                onChange: Gn,
                onBlur: Q,
                onPointerDown: Ht,
                onKeyDown: Kn,
                "aria-label": fe.formatMessage({
                  defaultMessage: "Text label",
                  id: "c29+YCh/oq",
                }),
                rows: H.value.split(`
`).length,
                className:
                  "absolute resize-none overflow-hidden bg-transparent outline-none p-0 border-0",
                style: wt,
              }),
          )
        : $[159];
    return J4($, 160, n, Xn, Zn, it)
      ? K4(
          $,
          160,
          n,
          Xn,
          Zn,
          it,
          a("div", {
            ref: rt,
            tabIndex: -1,
            className: n,
            style: it,
            children: [Xn, Zn],
          }),
        )
      : $[164];
  }
  function bn(e) {
    return e && { ...e };
  }
  function xn(e) {
    return e.id === "bend";
  }
  function Sn(e) {
    return e.length;
  }
  function Cn() {}
  return {
    Canvas: yn,
    drawStroke: Zt,
    constrainPoint: Ve,
    resizeStroke: at,
    hitTest: $e,
    moveStroke: J,
    resizeHandle: dt,
    resizeText: ft,
    emptyHistory: pt,
    commitHistory: mt,
    undoHistory: ht,
    redoHistory: gt,
    mapHistory: _t,
    historyState: vt,
  };
}
