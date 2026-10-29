// MCP App host manifest for a consumer generator pinned to `referenceVersion` (3.6556.2 migration E34, the
// view-tabs-compat.mjs shape).
//
// src/generated/mcp-app-host (extract-mcp-app-host.mjs) and its consumer src/generated/mcp-app-card are both 3.6556.2
// output. The 2.42304.0 view (legacy["2.42304.0"] and its frozen manifest scripts/mcp-app-host-legacy-2.42304.0.json)
// was retired in wave 10 (w10-trans-mcp-v3-pins): no generated module imported the 2.42304.0 names any more. A consumer
// reads the view of its own release through this helper:
//   - manifest.referenceVersion === referenceVersion -> the manifest itself;
//   - anything else                                  -> the card generator's original error text.
import fs from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');

export function mcpAppHostManifestPath({ root = appRoot } = {}) {
  return path.join(root, 'src/generated/mcp-app-host/manifest.json');
}

// The view of an already-parsed manifest (exported for tests).
export function mcpAppHostViewFor(manifest, referenceVersion) {
  if (manifest?.referenceVersion === referenceVersion) return manifest;
  throw Error(`mcp-app-host is ${manifest?.referenceVersion}, expected ${referenceVersion}`);
}

export async function mcpAppHostManifestFor(referenceVersion, { root = appRoot } = {}) {
  const manifest = JSON.parse(await fs.readFile(mcpAppHostManifestPath({ root }), 'utf8'));
  return mcpAppHostViewFor(manifest, referenceVersion);
}
