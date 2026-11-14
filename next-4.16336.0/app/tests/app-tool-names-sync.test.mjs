// The ACP bridge's APP_TOOL_NAMES (harness/packages/acp-bridge/src/app-tools.js) copies the tool names OpenClaude Desktop's
// agent tools serve: Gemini's Plan Mode policy and Qwen's up-front tools name them one by one, so a tool added here
// and not there would be listed but refused in those modes. The two lists must match.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(import.meta.dirname, '../electron/agent-tools');

test('every agent tool the app serves is in the ACP bridge\'s APP_TOOL_NAMES, and nothing else is', async () => {
  const names = new Set();
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mjs')).sort()) {
    const module = await import(pathToFileURL(path.join(dir, file)).href);
    for (const tool of Array.isArray(module.tools) ? module.tools : []) if (typeof tool?.name === 'string') names.add(tool.name);
  }
  const { APP_TOOL_NAMES } = await import('../../harness/packages/acp-bridge/src/app-tools.js');
  assert.ok(names.size > 10);
  assert.deepEqual([...names].filter((name) => !APP_TOOL_NAMES.includes(name)).sort(), [], 'served but missing from APP_TOOL_NAMES');
  assert.deepEqual(APP_TOOL_NAMES.filter((name) => !names.has(name)).sort(), [], 'in APP_TOOL_NAMES but not served');
});
