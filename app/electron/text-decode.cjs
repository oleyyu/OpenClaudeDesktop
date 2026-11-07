"use strict";
// Text files an administrator or a Windows tool may have written: decoded by their byte-order mark.
// PowerShell 5.1's Set-Content -Encoding UTF8 writes EF BB BF; Out-File and `>` write UTF-16LE (FF FE).
const fs = require("node:fs");

/** A Buffer's text: UTF-8 (BOM dropped), UTF-16LE (FF FE) or UTF-16BE (FE FF); no BOM reads as UTF-8. */
function decodeText(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? "");
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return bytes.subarray(3).toString("utf8");
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString("utf16le");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const body = Buffer.from(bytes.subarray(2, 2 + ((bytes.length - 2) & ~1)));
    return body.swap16().toString("utf16le");
  }
  return bytes.toString("utf8");
}

// What a managed-settings file that exists but cannot be read or parsed means: the most restrictive values for the
// keys the app reads (prefs/workflow-settings.mjs: disableWorkflows), never "no managed settings".
const MANAGED_FAIL_CLOSED = Object.freeze({ disableWorkflows: true });

/**
 * An administrator's managed-settings.json. Missing (ENOENT/ENOTDIR): {} with no error. Present but unreadable,
 * unparsable or not a JSON object: MANAGED_FAIL_CLOSED and the reason.
 * @returns {{ value: object, error: string | null }}
 */
function readManagedSettings(file, { readFile = (name) => fs.readFileSync(name) } = {}) {
  let raw;
  try { raw = readFile(file); } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { value: {}, error: null };
    return { value: { ...MANAGED_FAIL_CLOSED }, error: `can't read: ${error?.message || error}` };
  }
  try {
    const read = JSON.parse(decodeText(raw));
    if (read && typeof read === "object" && !Array.isArray(read)) return { value: read, error: null };
    return { value: { ...MANAGED_FAIL_CLOSED }, error: "not a JSON object" };
  } catch (error) {
    return { value: { ...MANAGED_FAIL_CLOSED }, error: `can't parse: ${error?.message || error}` };
  }
}

module.exports = { decodeText, readManagedSettings, MANAGED_FAIL_CLOSED };
