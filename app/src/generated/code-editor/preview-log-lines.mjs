// Original Claude Desktop 3.6556.2 dev server log line tint (cf580efe9 _o over go) and its classes (vo), read by the
// logs drawer's rows (So's Go: "whitespace-pre-wrap break-all" plus the tint).
const go = "FOUND 0 ERRORS. WATCHING FOR FILE CHANGES.";
function _o(e) {
  let t = e.slice(0, 200).toUpperCase(),
    n = e
      .slice(0, 242)
      .toUpperCase()
      .replaceAll(go, " ".repeat(42))
      .slice(0, t.length);
  return n.includes("ERROR") ||
    n.includes("ERR!") ||
    n.includes("FATAL") ||
    n.includes("FAIL")
    ? "error"
    : n.includes("WARN")
      ? "warn"
      : null;
}
const vo = { error: "text-danger", warn: "text-warning" };
export { _o as devServerLogTone, vo as devServerLogToneClasses };
