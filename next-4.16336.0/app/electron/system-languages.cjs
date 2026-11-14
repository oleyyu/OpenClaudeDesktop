// index.chunk-CiiI592G.js JDr(app.getPreferredSystemLanguages()): the
// preferred system languages the renderer reads as desktopPreferredLanguages
// (feeds html[data-cjk-order], src/cjk-order.mjs). Each entry loses any
// ".charset" / "@modifier" suffix and uses "-" separators; empty, "C" and
// "POSIX" entries and duplicates are dropped.
function preferredSystemLanguages(list) {
  const out = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (typeof entry !== "string") continue;
    const tag = entry.split(/[.@]/, 1)[0].replace(/_/g, "-");
    if (tag === "" || tag === "C" || tag === "POSIX" || out.includes(tag)) continue;
    out.push(tag);
  }
  return out;
}
module.exports = { preferredSystemLanguages };
