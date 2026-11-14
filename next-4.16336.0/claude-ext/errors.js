// A tool failure the app sees as {error: {code, message}}: stale_ref, ref_wrong_tab, unknown_ref, no_such_tab,
// no_tab, bad_url, restricted_page, page_error, bad_request, timeout, site_not_allowed (with data {host, url}),
// write_not_approved (javascript_tool write: true on a site the app hasn't approved, with data {host, url, tabId}),
// not_found, debugger_busy, debugger_error.
export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
