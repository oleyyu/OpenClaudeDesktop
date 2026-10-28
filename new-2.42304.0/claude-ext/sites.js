// Which sites the app lets this call act on. Every execute_tool from OpenClaude Desktop carries allowedHosts: the
// hosts the user allowed for that session (["*"] in Bypass permissions). A tool that would read or act on a page
// whose host isn't listed — or navigate to one — fails with site_not_allowed and the host, and the app asks the user
// before calling again. A call without allowedHosts (the acceptance checks) isn't limited.
import { ToolError } from "./errors.js";

/** The host a URL's page belongs to (blob:https://site/… belongs to site), or null for pages that have none
 * (about:blank). */
export function hostOf(url) {
  try {
    let parsed = new URL(url);
    if (parsed.protocol === "blob:") parsed = new URL(parsed.pathname);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.host : null;
  } catch { return null; }
}

/** blankOk: about:blank passes (a navigation to it, a blank tab the bridge opened). Any other page without a host —
 * about:blank a site opened and wrote into, data:, … — may hold any site's data and can't be asked about, so it is
 * refused. */
export function assertSite(url, ctx, { blankOk = true } = {}) {
  const allowed = ctx?.allowedHosts;
  if (!Array.isArray(allowed) || allowed.includes("*")) return;
  const host = hostOf(url);
  if (host === null) {
    if (blankOk && url === "about:blank") return;
    throw new ToolError("site_unknown", `${url || "This tab's page"} has no web address of its own, so it can't be allowed for this session. Use a tab that shows an http(s) page.`);
  }
  if (allowed.includes(host)) return;
  const error = new ToolError("site_not_allowed", `The user hasn't allowed ${host} in Chrome for this session.`);
  error.data = { host, url };
  throw error;
}
