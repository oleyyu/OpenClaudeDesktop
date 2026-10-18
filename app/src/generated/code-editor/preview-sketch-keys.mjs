// Original command matching (2.42304.0), including physical-key versus character rules.
const $o = () =>
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform),
  io = () =>
    typeof navigator !== "undefined" && /Linux/.test(navigator.platform);
const V7 = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const H7 = [...V7, "0"].flatMap((e) => {
  let t = e === "0" ? "newPreset" : `selectPreset${e}`,
    n = `Digit${e}`;
  return [
    {
      command: t,
      key: `cmd+alt+${e}`,
      code: n,
      mac: !0,
      gate: "sessionPresets",
    },
    {
      command: t,
      key: `alt+${e}`,
      code: n,
      mac: !1,
      when: "isClaudeApp || !isLinux",
      gate: "sessionPresets",
    },
  ];
});
const U7 = V7.map((e) => ({
  command: `selectBrowserTab${e}`,
  key: `cmd+${e}`,
  code: `Digit${e}`,
  when: "isClaudeApp",
  gate: "browserTabStrip",
}));
const W7 = [
  {
    command: "togglePreview",
    key: "cmd+shift+b",
    code: "KeyB",
    when: "isClaudeApp",
    gate: "externalPreviewAvailable",
  },
  {
    command: "togglePreview",
    key: "cmd+shift+p",
    code: "KeyP",
    when: "isClaudeApp",
  },
  {
    command: "togglePreview",
    key: "cmd+alt+p",
    code: "KeyP",
    when: "!isClaudeApp",
  },
  {
    command: "toggleDiff",
    key: "cmd+shift+d",
    code: "KeyD",
    when: "isClaudeApp",
  },
  {
    command: "toggleDiff",
    key: "ctrl+shift+d",
    code: "KeyD",
    when: "!isClaudeApp",
  },
  {
    command: "toggleTerminal",
    key: "cmd+j",
    code: "KeyJ",
    matchBy: "char",
    when: "isClaudeApp",
    mac: !0,
  },
  { command: "toggleTerminal", key: "ctrl+`", code: "Backquote" },
  { command: "toggleBrowser", key: "cmd+shift+f", code: "KeyF" },
  { command: "closePane", key: "cmd+\\", code: "Backslash" },
  { command: "toggleExpandPane", key: "cmd+shift+\\", code: "Backslash" },
  { command: "cycleTranscriptMode", key: "ctrl+o", code: "KeyO" },
  { command: "backgroundTasks", key: "ctrl+b", code: "KeyB", matchBy: "key" },
  {
    command: "openModeMenu",
    key: "cmd+shift+m",
    code: "KeyM",
    when: "isClaudeApp",
  },
  { command: "openModeMenu", key: "cmd+alt+m", code: "KeyM" },
  { command: "openModelMenu", key: "cmd+shift+i", code: "KeyI" },
  { command: "openEffortMenu", key: "cmd+shift+e", code: "KeyE" },
  { command: "toggleFastMode", key: "cmd+alt+f", code: "KeyF" },
  { command: "toggleSelectionMode", key: "cmd+shift+s", code: "KeyS" },
  {
    command: "toggleSketchMode",
    key: "cmd+shift+x",
    code: "KeyX",
    when: "isClaudeApp",
  },
  {
    command: "jumpPrevPrompt",
    key: "cmd+alt+up",
    code: "ArrowUp",
    mac: !0,
    gate: "promptJump",
  },
  {
    command: "jumpPrevPrompt",
    key: "alt+up",
    code: "ArrowUp",
    mac: !1,
    gate: "promptJump",
  },
  {
    command: "jumpNextPrompt",
    key: "cmd+alt+down",
    code: "ArrowDown",
    mac: !0,
    gate: "promptJump",
  },
  {
    command: "jumpNextPrompt",
    key: "alt+down",
    code: "ArrowDown",
    mac: !1,
    gate: "promptJump",
  },
  { command: "sketchDeleteSelection", key: "backspace", code: "Backspace" },
  { command: "sketchDeleteSelection", key: "delete", code: "Delete" },
  { command: "sketchDeselect", key: "esc", code: "Escape" },
  { command: "nextDiffChange", key: "alt+f5", code: "F5", when: "!isLinux" },
  { command: "nextDiffChange", key: "f7", code: "F7" },
  {
    command: "prevDiffChange",
    key: "shift+alt+f5",
    code: "F5",
    when: "!isLinux",
  },
  { command: "prevDiffChange", key: "shift+f7", code: "F7" },
  ...H7,
  ...U7,
  {
    command: "toggleSideChat",
    key: "cmd+;",
    code: "Semicolon",
    matchBy: "char",
  },
  {
    command: "newPreviewTab",
    key: "cmd+t",
    code: "KeyT",
    matchBy: "char",
    when: "isClaudeApp",
  },
  {
    command: "toggleDiffFileList",
    key: "cmd+shift+y",
    code: "KeyY",
    matchBy: "char",
    when: "isClaudeApp",
  },
  {
    command: "toggleDiffFileList",
    key: "ctrl+shift+y",
    code: "KeyY",
    matchBy: "char",
    when: "!isClaudeApp",
  },
  {
    command: "reopenClosed",
    key: "cmd+shift+t",
    code: "KeyT",
    matchBy: "char",
    when: "isClaudeApp",
  },
  { command: "goToDiffFile", key: "cmd+p", code: "KeyP", matchBy: "char" },
  { command: "saveFile", key: "cmd+s", code: "KeyS", matchBy: "char" },
  { command: "findInFile", key: "cmd+f", code: "KeyF", matchBy: "char" },
  {
    command: "attachTerminalOutput",
    key: "cmd+shift+l",
    code: "KeyL",
    matchBy: "char",
  },
  { command: "sketchUndo", key: "cmd+z", code: "KeyZ", matchBy: "char" },
  { command: "sketchRedo", key: "cmd+shift+z", code: "KeyZ", matchBy: "char" },
  {
    command: "sketchRedo",
    key: "ctrl+y",
    code: "KeyY",
    matchBy: "char",
    mac: !1,
  },
];
function G7(e) {
  let t = e.split("+");
  return {
    cmd: t.includes("cmd"),
    ctrl: t.includes("ctrl"),
    shift: t.includes("shift"),
    alt: t.includes("alt"),
  };
}
function K7(e, t, n) {
  let r = n && t.cmd,
    i = t.ctrl || (!n && t.cmd);
  return (
    e.metaKey === r &&
    e.ctrlKey === i &&
    e.shiftKey === t.shift &&
    e.altKey === t.alt
  );
}
function q7(e, t, n) {
  return e === "isClaudeApp"
    ? t
    : e === "!isClaudeApp"
      ? !t
      : e === "isClaudeApp || !isLinux"
        ? t || !n
        : e !== "!isLinux" || !n;
}
function J7(e, t) {
  return e === "externalPreviewAvailable"
    ? !!t.externalPreviewAvailable
    : e === "promptJump"
      ? !!t.promptJump
      : e === "sessionPresets"
        ? !!t.sessionEnvironments
        : e !== "browserTabStrip" || !!t.browserTabStrip;
}
function Y7(e, t) {
  if (typeof e.key != "string") return null;
  let n = t.mac ?? $o(),
    r = t.linux ?? io();
  for (let i of W7)
    if (!(t.commands !== void 0 && !t.commands.includes(i.command))) {
      if (i.matchBy === "key") {
        if (e.key.toLowerCase() !== i.key.split("+").at(-1)) continue;
      } else if (i.matchBy === "char") {
        if (!Z7(e, i.key.split("+").at(-1), i.code)) continue;
      } else if (!X7(e, i.code)) continue;
      if (
        q7(i.when, t.isClaudeApp, r) &&
        (i.mac === void 0 || i.mac === n) &&
        J7(i.gate, t) &&
        K7(e, G7(i.key), n)
      )
        return i.command;
    }
  return null;
}
function X7(e, t) {
  return [...e.key].length > 1 &&
    e.key !== "Dead" &&
    e.key !== "Unidentified" &&
    /^(Key[A-Z]|Digit\d)$/.test(e.code)
    ? e.key === t
    : e.code === t;
}
function Z7(e, t, n) {
  return /^[ -~]$/.test(e.key) ? e.key.toLowerCase() === t : X7(e, n);
}
function $7(e, t, n) {
  return e9(e, t, n)[0];
}
function e9(e, t, n) {
  let r = n?.mac ?? $o(),
    i = n?.linux ?? io(),
    a = [];
  for (let o of W7)
    o.command === e &&
      q7(o.when, t, i) &&
      (o.mac === void 0 || o.mac === r) &&
      J7(o.gate, n ?? {}) &&
      a.push(o.key);
  return a;
}
export { Y7 as matchSketchCommand, $7 as sketchShortcut };
