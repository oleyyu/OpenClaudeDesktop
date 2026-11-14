// Settings › Code › Browser › Allowed sites and the Preview pane's "Manage allowed sites…" (B39): the sites the
// agent's preview tools may use without a permission prompt, kept across restarts (config.previewAllowedOrigins).
//
// Port of the 2.31226.0 main process (asar index.chunk "PreviewOriginPolicy"): mP normalises an address to its
// origin (http(s) only, trailing dots dropped, an IPv4-mapped IPv6 address unwrapped, a leading "www." dropped
// for a name of three or more labels that isn't .local or an IP, the port kept); RP/BP is the persisted list
// (launchPreviewAllowedOrigins); wNn lists it as {origin, builtin:false}; SNn's results are the renderer's
// shared-0 yg enum (ok / invalid / loopback / exists / blocked / org-blocked / unavailable / declined).
//
// Not ported: *.name.local families and the private-network trust pins (the reference's LAN resolution and
// its native confirmation sheet) and org policy blocks: a wildcard is "invalid" here and nothing is org-blocked.

export const ALLOWED_ORIGIN_RESULTS = Object.freeze({
  Ok: "ok", Invalid: "invalid", Loopback: "loopback", Exists: "exists", Blocked: "blocked", OrgBlocked: "org-blocked", Unavailable: "unavailable", Declined: "declined",
});
export const MAX_ALLOWED_ORIGINS = 500;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
const isLoopbackHost = (hostname) => {
  const host = String(hostname || "").toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost") || /^127(\.\d{1,3}){3}$/.test(host);
};
// _N (index.chunk ys = uEe + dEe + dEe as ::ffff: + fEe, plus the any-address): cloud metadata endpoints and 0.0.0.0 / [::]
// are never allowable — SNn answers "invalid" and ZP never persists them.
const METADATA_V4 = ["169.254.169.254", "169.254.170.2", "169.254.170.23", "169.254.0.23", "169.254.42.42", "100.100.100.200", "100.96.0.96", "100.80.80.80", "168.63.129.16", "192.0.0.192"];
const NEVER_ALLOWABLE = new Set(["0.0.0.0", "[::]", "metadata.google.internal", "metadata.goog", "metadata", "instance-data", "instance-data.ec2.internal",
  ...METADATA_V4, ...METADATA_V4.map((ip) => { const [a, b, c, d] = ip.split(".").map(Number); return `[::ffff:${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}]`; }),
  "[fd00:ec2::254]", "[fd00:ec2::23]", "[fd00:a9fe:a9fe::1]", "[fe80::a9fe:a9fe]"]);
export const neverAllowableHost = (hostname) => NEVER_ALLOWABLE.has(String(hostname || "").toLowerCase());
const isIpHost = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
// LMn: [::ffff:7f00:1] → 127.0.0.1.
function unwrapMappedV4(host) {
  const match = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/.exec(host);
  if (!match) return host;
  const high = parseInt(match[1], 16), low = parseInt(match[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

/** mP: the origin an address is allowed under, or null (not http(s), no host). ws(s) reads as http(s). */
export function normalizeAllowedOrigin(value) {
  if (typeof value !== "string" || !value || value.length > 2048) return null;
  let url;
  try { url = new URL(value.replace(/^ws(s?):/i, "http$1:")); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const trimmed = url.hostname.replace(/\.+$/, "");
  let host;
  try { host = new URL(`${url.protocol}//${trimmed}`).hostname; } catch { host = trimmed; }
  host = unwrapMappedV4(host);
  if (!host) return null;
  const bare = host.startsWith("www.") && host.split(".").length >= 3 && !host.endsWith(".local") && !isIpHost(host) ? host.slice(4) : host;
  if (!bare || bare.startsWith(".")) return null;
  return `${url.protocol}//${bare}${url.port ? `:${url.port}` : ""}`;
}

/** The saved list, cleaned: normalised, unique, no wildcards or loopback, at most MAX_ALLOWED_ORIGINS. */
export function allowedOriginList(saved) {
  const out = [];
  for (const value of Array.isArray(saved) ? saved : []) {
    const origin = normalizeAllowedOrigin(value);
    if (!origin || origin !== value || /\*|%2a/i.test(origin) || isLoopbackHost(new URL(origin).hostname) || neverAllowableHost(new URL(origin).hostname) || out.includes(origin)) continue;
    out.push(origin);
    if (out.length >= MAX_ALLOWED_ORIGINS) break;
  }
  return out;
}

/** wNn: the dialog's rows. */
export const allowedOriginEntries = (saved) => allowedOriginList(saved).map((origin) => ({ origin, builtin: false }));

/** Whether a page address is on the saved list (an outside site the agent may use without asking). */
export function originAllowed(saved, url) {
  const origin = normalizeAllowedOrigin(url);
  return !!origin && allowedOriginList(saved).includes(origin);
}

/**
 * SNn (attended add from the dialog): {result, list} — list is the new saved list when result is "ok".
 * schemeless: the user typed no scheme (the renderer then asks for https://…, as the reference does).
 */
export function addAllowedOrigin(saved, value, { schemeless = false } = {}) {
  const list = allowedOriginList(saved);
  const R = ALLOWED_ORIGIN_RESULTS;
  if (typeof value !== "string" || !value.trim()) return { result: R.Invalid, list };
  let input = value.trim();
  if (schemeless && !input.includes("://")) input = `https://${input}`;
  const origin = normalizeAllowedOrigin(input);
  if (!origin || !/^https?:\/\//i.test(input) || /\*|%2a/i.test(origin)) return { result: R.Invalid, list };
  let hostname;
  try { hostname = new URL(origin).hostname; } catch { return { result: R.Invalid, list }; }
  // A bare word ("example") isn't a site anyone means; the reference's resolver rejects it the same way.
  if (!hostname.includes(".") && !hostname.startsWith("[") && !isLoopbackHost(hostname)) return { result: R.Invalid, list };
  if (isLoopbackHost(hostname)) return { result: R.Loopback, list };
  if (neverAllowableHost(hostname)) return { result: R.Invalid, list };
  if (list.includes(origin)) return { result: R.Exists, list };
  if (list.length >= MAX_ALLOWED_ORIGINS) return { result: R.Unavailable, list };
  return { result: R.Ok, list: [...list, origin], origin };
}

/** TNn: {removed, list}; only a saved (non-built-in) origin is removed. */
export function removeAllowedOrigin(saved, value) {
  const list = allowedOriginList(saved);
  const origin = normalizeAllowedOrigin(value) ?? value;
  if (!list.includes(origin)) return { removed: false, list, origin };
  return { removed: true, list: list.filter((entry) => entry !== origin), origin };
}

/** Whether a session approval (a host[:port] the user allowed for one session) is for this origin. */
export function hostMatchesOrigin(host, origin) {
  return ["http:", "https:"].some((protocol) => normalizeAllowedOrigin(`${protocol}//${host}`) === origin);
}
