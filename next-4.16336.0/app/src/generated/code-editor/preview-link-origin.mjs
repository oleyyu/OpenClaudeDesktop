// Original 3.6556.2 Preview link origin and external-only site test (index.chunk-jPKPzV-P).
function MM(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
const hWn = "https://chromewebstore.google.com";
function gWn(e) {
  let t = MM(e);
  if (t === null || (t.protocol !== "http:" && t.protocol !== "https:"))
    return null;
  let n = t.hostname.replace(/\.+$/, "");
  return n === "chromewebstore.google.com"
    ? t.origin === hWn
      ? "origin"
      : "other"
    : n === "chrome.google.com" &&
        (t.pathname === "/webstore" || t.pathname.startsWith("/webstore/"))
      ? "other"
      : null;
}
function YM(e) {
  return gWn(e) !== null;
}
function TF(e) {
  return (
    e === "localhost" ||
    e.endsWith(".localhost") ||
    e === "127.0.0.1" ||
    e === "0.0.0.0" ||
    e === "::1" ||
    e === "[::1]"
  );
}
function nZn(e) {
  let t = e.replace(/\.+$/, "");
  return (e !== t && TF(t)) ||
    (/^127\.\d+\.\d+\.\d+$/.test(e) && e !== "127.0.0.1")
    ? !0
    : e.startsWith("[::ffff:");
}
function DF(e) {
  return kF(e) || nZn(e) || e === "[::]";
}
function kF(e) {
  return TF(e) || /^127(\.\d{1,3}){1,3}$/.test(e);
}
function EI(e) {
  try {
    let t = new URL(e);
    if (t.protocol !== "http:" && t.protocol !== "https:") return null;
    let n = t.hostname.replace(/\.+$/, ""),
      r;
    try {
      r = new URL(`${t.protocol}//${n}`).hostname;
    } catch {
      r = n;
    }
    let i = o$n(r);
    if (i.length === 0) return null;
    let a =
      i.startsWith("www.") &&
      i.split(".").length >= 3 &&
      !i.endsWith(".local") &&
      !DF(i)
        ? i.slice(4)
        : i;
    if (a.length === 0 || a.startsWith(".")) return null;
    let o = t.port ? `:${t.port}` : "";
    return `${t.protocol}//${a}${o}`;
  } catch {
    return null;
  }
}
function o$n(e) {
  let t = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/.exec(e);
  if (!t) return e;
  let n = parseInt(t[1], 16),
    r = parseInt(t[2], 16);
  return `${n >> 8}.${n & 255}.${r >> 8}.${r & 255}`;
}
export { EI as previewLinkOrigin, YM as externalOnlyLink };
