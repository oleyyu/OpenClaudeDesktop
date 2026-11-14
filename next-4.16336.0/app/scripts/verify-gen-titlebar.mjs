// Checks the titlebar 4.16336.0 graph (scripts/extract-titlebar-v4.mjs): the pins (snapshot chunks, root and boundary
// declarations, the finalized cds-core manifest + adapter), src/titlebar-adapter.mjs and every byte of src/generated/titlebar.
// prepare:ui discovers and runs it (verify-gen-*.mjs).
import { extractTitlebar } from './extract-titlebar-v4.mjs';
await extractTitlebar({ check: true });
