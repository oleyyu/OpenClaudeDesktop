// Regenerates src/generated/code-editor-v4 in memory and compares it byte for byte (adapters, areas/*.json,
// manifest.json; stale files fail). Discovered and run by prepare-ui.mjs.
import { extractCodeEditorV4 } from './extract-code-editor-v4.mjs';
await extractCodeEditorV4({ check: true });
