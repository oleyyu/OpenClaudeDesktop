// Theme rules transcribed as data from current Code fence theme provider.
// See analysis/batch-20260920/syntax-highlight-current-source.md for provenance.
const rule = (scope, foreground, fontStyle) => ({ scope, settings: {
  ...(foreground ? { foreground } : {}), ...(fontStyle ? { fontStyle } : {}),
} });
export const lightTheme = {
  name: "code-claude-light", type: "light",
  colors: { "editor.foreground": "#1a1a1a", "editor.background": "#ffffff", "editor.selectionBackground": "#0073e640" },
  tokenColors: [
    rule(["comment", "punctuation.definition.comment"], "#999999", "italic"),
    rule(["string", "punctuation.definition.string"], "#1e9e3c"),
    rule(["constant.numeric", "constant.language", "constant.character", "keyword.other.unit"], "#cd2054"),
    rule(["keyword", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.operator.expression"], "#c5621b"),
    rule(["entity.name.function", "support.function", "meta.function-call.generic"], "#0073e6"),
    rule(["entity.name.type", "entity.name.class", "entity.other.inherited-class", "support.type", "support.class"], "#8e6bd9"),
    rule(["variable", "meta.definition.variable.name", "support.variable", "variable.parameter", "variable.other.property", "meta.object-literal.key", "support.type.property-name"], "#1a1a1a"),
    rule(["punctuation", "meta.brace", "keyword.operator"], "#737373"),
    rule(["entity.name.tag", "punctuation.definition.tag"], "#c5621b"),
    rule(["entity.other.attribute-name"], "#0073e6"),
    rule(["string.regexp", "constant.character.escape"], "#98801f"),
    rule(["markup.heading", "entity.name.section"], "#0073e6", "bold"),
    rule(["markup.bold"], null, "bold"), rule(["markup.italic"], null, "italic"),
    rule(["markup.inserted", "punctuation.definition.inserted"], "#1e9e3c"),
    rule(["markup.deleted", "punctuation.definition.deleted"], "#ff3a30"),
    rule(["invalid", "invalid.illegal"], "#ff3a30"),
  ],
};

// The official theme converts these HSL values to rounded RGB before registration.
export function hslHex(hue, saturation, lightness) {
  const s = saturation / 100, l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
export const darkPalette = Object.freeze({
  fg: hslHex(220, 15, 93), comment: hslHex(220, 10, 55), punctuation: hslHex(220, 15, 85),
  keyword: hslHex(280, 85, 72), string: hslHex(95, 75, 65), regex: hslHex(95, 70, 63),
  number: hslHex(180, 80, 65), property: hslHex(355, 85, 72), attrName: hslHex(355, 80, 70),
  function: hslHex(210, 100, 72), variable: hslHex(30, 95, 68), parameter: hslHex(30, 90, 67),
});
const d = darkPalette;
export const darkTheme = {
  name: "code-claude-dark", type: "dark",
  colors: { "editor.foreground": d.fg, "editor.background": "#1a1a19", "editor.selectionBackground": "#0099ff4d" },
  tokenColors: [
    { settings: { foreground: d.fg } },
    rule(["comment", "punctuation.definition.comment"], d.comment),
    rule(["punctuation", "meta.brace", "entity.name.namespace"], d.punctuation),
    rule(["keyword", "storage", "variable.language"], d.keyword),
    rule(["keyword.operator"], d.fg),
    rule(["keyword.operator.expression", "keyword.operator.new", "keyword.operator.word", "keyword.operator.logical.python"], d.keyword),
    rule(["string", "punctuation.definition.string"], d.string), rule(["string.regexp"], d.regex),
    rule(["constant.numeric", "constant.language", "constant.character", "constant.other.symbol"], d.number),
    rule(["entity.name.tag", "support.type.property-name", "meta.object-literal.key"], d.property),
    rule(["entity.other.attribute-name"], d.attrName),
    rule(["entity.name.function", "support.function"], d.function), rule(["variable.parameter"], d.parameter),
    rule(["variable.other.normal", "punctuation.definition.variable"], d.variable),
    rule(["entity.name.type", "entity.name.class", "entity.other.inherited-class", "support.class", "support.type"], d.variable),
    rule(["markup.deleted"], d.property), rule(["markup.inserted"], d.string), rule(["markup.underline.link"], d.number),
    rule(["keyword.other.important"], d.property, "bold"),
    rule(["markup.heading", "entity.name.section"], null, "bold"),
    rule(["markup.bold"], null, "bold"), rule(["markup.italic"], null, "italic"),
    rule(["variable.other.property", "variable.other.object.property", "support.type.property-name"], d.fg),
  ],
};

// Stream (incremental) palettes transcribed from the official shiki-highlight
// worker's built-in claude-light/claude-dark themes; they are distinct from the
// settled Code themes above and are used only while a fence grows and for the
// retained stream DOM afterwards (addendum-027). Nineteen rules in source order.
export const streamLightPalette = Object.freeze({
  fg: hslHex(220, 20, 10), comment: hslHex(220, 10, 48), punctuation: hslHex(220, 15, 20),
  keyword: hslHex(280, 100, 38), string: hslHex(120, 100, 25), regex: hslHex(120, 90, 27),
  number: hslHex(180, 100, 25), property: hslHex(355, 90, 38), attrName: hslHex(355, 85, 40),
  function: hslHex(215, 100, 38), variable: hslHex(25, 100, 35), parameter: hslHex(25, 95, 37),
});
export const streamDarkPalette = darkPalette;
export function streamRules(p) {
  return [
    { settings: { foreground: p.fg } },
    rule(["comment", "punctuation.definition.comment"], p.comment),
    rule(["punctuation", "meta.brace", "entity.name.namespace"], p.punctuation),
    rule(["keyword", "storage", "variable.language"], p.keyword),
    rule(["keyword.operator"], p.fg),
    rule(["keyword.operator.expression", "keyword.operator.new", "keyword.operator.word", "keyword.operator.logical.python"], p.keyword),
    rule(["string", "punctuation.definition.string"], p.string),
    rule(["string.regexp"], p.regex),
    rule(["constant.numeric", "constant.language", "constant.character", "constant.other.symbol"], p.number),
    rule(["entity.name.tag", "support.type.property-name", "meta.object-literal.key"], p.property),
    rule(["entity.other.attribute-name"], p.attrName),
    rule(["entity.name.function", "support.function"], p.function),
    rule(["variable.parameter"], p.parameter),
    rule(["variable.other.normal", "punctuation.definition.variable"], p.variable),
    rule(["entity.name.type", "entity.name.class", "entity.other.inherited-class", "support.class", "support.type"], p.variable),
    rule(["markup.deleted"], p.property),
    rule(["markup.inserted"], p.string),
    rule(["markup.underline.link"], p.number),
    rule(["keyword.other.important"], p.property, "bold"),
  ];
}
export const streamLightTheme = {
  name: "stream-claude-light", type: "light",
  colors: { "editor.foreground": streamLightPalette.fg, "editor.background": "#ffffff" },
  tokenColors: streamRules(streamLightPalette),
};
export const streamDarkTheme = {
  name: "stream-claude-dark", type: "dark",
  colors: { "editor.foreground": streamDarkPalette.fg, "editor.background": "#1a1a19" },
  tokenColors: streamRules(streamDarkPalette),
};
