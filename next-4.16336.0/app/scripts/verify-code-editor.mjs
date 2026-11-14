// Regenerates src/generated/code-editor in memory and compares it byte for byte (adapters, electron/generated copies,
// areas/*.json, manifest.json; stale files fail). Imported by prepare-ui.mjs.
import { extractCodeEditor } from './extract-code-editor.mjs';
await extractCodeEditor({ check: true });
