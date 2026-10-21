// Which sites the app lets this call act on. Every execute_tool from OpenClaude Desktop carries allowedHosts: the
// hosts the user allowed for that session (["*"] in Bypass permissions). A tool that would read or act on a page
// whose host isn't listed — or navigate to one — fails with site_not_allowed and the host, and the app asks the user
// before calling again. A call without allowedHosts (the acceptance checks) isn't limited.
import { ToolError } from "./errors.js";

/** The host a URL's page belongs to, or null for pages that have none (about:blank). */
export function hostOf(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.host : null;
  } catch { return null; }
}

export function assertSite(url, ctx) {
  const allowed = ctx?.allowedHosts;
  if (!Array.isArray(allowed) || allowed.includes("*")) return;
  const host = hostOf(url);
  if (host === null || allowed.includes(host)) return;
  const error = new ToolError("site_not_allowed", `The user hasn't allowed ${host} in Chrome for this session.`);
  error.data = { host, url };
  throw error;
}
