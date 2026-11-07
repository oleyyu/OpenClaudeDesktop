// PATH for spawned programs on this host. macOS/Linux join with ":"; Windows joins with ";" and has no
// /opt/homebrew or /usr/local, so the Unix-only folders the Mac code adds (absolute POSIX paths) are dropped there.
// Each entry may itself be a whole PATH (process.env.PATH, the login shell's PATH).
function hostPath(entries, { platform = process.platform } = {}) {
  const list = (Array.isArray(entries) ? entries : []).filter((entry) => typeof entry === "string" && entry);
  if (platform !== "win32") return list.join(":");
  const seen = new Set(), out = [];
  for (const entry of list) for (const part of entry.split(";")) {
    const dir = part.trim();
    if (!dir || dir.startsWith("/") || seen.has(dir.toLowerCase())) continue;
    seen.add(dir.toLowerCase());
    out.push(dir);
  }
  return out.join(";");
}
/** Split a PATH value of this host. */
function splitHostPath(value, { platform = process.platform } = {}) {
  return String(value || "").split(platform === "win32" ? ";" : ":").filter(Boolean);
}
module.exports = { hostPath, splitHostPath };
